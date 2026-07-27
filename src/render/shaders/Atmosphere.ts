import { GLSL_COMMON } from '../FullScreen';

/**
 * Raymarched volumetric lighting + aerial perspective.
 *
 * Marches the view ray from the near plane to the reconstructed world
 * position, sampling the sun's shadow cascades at each step. This produces
 * genuine light shafts through doorways, window slats, and smoke — not the
 * screen-space radial blur that only works when the sun is on screen.
 *
 * Two media are integrated together:
 *  - a uniform + height-exponential haze that provides aerial perspective and
 *    separates distant buildings from the sky, and
 *  - localised smoke/dust volumes injected by gameplay (grenades, airstrike
 *    plumes) via a 3D-ish analytic ellipsoid list.
 */
export const VOLUMETRIC_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tDepth;
uniform sampler2D tBlueNoise;

uniform mat4  uInverseViewProjection;
uniform vec3  uCameraPos;
uniform float uNear;
uniform float uFar;
uniform float uTime;
uniform vec2  uResolution;

uniform vec3  uSunDirection;    // toward the sun
uniform vec3  uSunColor;
uniform float uSunIntensity;

uniform float uFogDensity;
uniform float uFogHeightFalloff;
uniform float uFogBaseHeight;
uniform vec3  uFogAlbedo;
uniform float uAnisotropy;      // Henyey-Greenstein g
uniform float uBeamGain;        // single-scatter forward-lobe deficit, see below
uniform float uMaxDistance;
/** Distance over which the haze fades in from the lens. */
uniform float uFogNearRamp;
uniform float uNoiseStrength;
uniform vec3  uWind;

/** Sky radiance near the horizon and overhead, for correctly hued haze. */
uniform vec3  uHazeLow;
uniform vec3  uHazeHigh;

uniform int   uCascadeCount;
uniform highp sampler2DShadow tShadow0;
uniform highp sampler2DShadow tShadow1;
uniform mat4  uShadowMatrix0;
uniform mat4  uShadowMatrix1;
uniform float uCascadeSplit0;
uniform float uCascadeSplit1;

/** Up to 6 gameplay smoke volumes: xyz = centre, w = radius. */
uniform vec4  uSmoke[6];
uniform vec4  uSmokeParams[6]; // x = density, y = seed, z = age01, w = unused
uniform int   uSmokeCount;

${GLSL_COMMON}

#ifndef VOL_STEPS
#define VOL_STEPS 24
#endif

// Henyey-Greenstein phase. The forward lobe is what makes looking toward the
// sun through haze glow, and looking away read as flat grey.
float phaseHG(float cosTheta, float g) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * max(pow(denom, 1.5), 1e-4));
}

/**
 * Two-lobe aerosol phase.
 *
 * A single HG lobe at g = 0.6 puts a phase value of 0.89 straight down the sun
 * axis. Against a sun irradiance of ~15 and a sunlit wall that only radiates
 * ~1, that makes the in-scattered term eight times brighter than the geometry
 * it sits in front of, per unit of optical depth — so looking anywhere near the
 * sun buries the whole frame under a white veil and distant walls come out
 * brighter than the sky they are silhouetted against.
 *
 * Real aerosol scattering is a narrow, intense forward spike sitting on a
 * broad, nearly flat pedestal, and it is the pedestal that carries most of the
 * energy at the tens-of-degrees angles that fill a frame. Two lobes reproduce
 * that shape and cut the on-axis value roughly in half while leaving the
 * off-axis haze — the part that actually does aerial perspective — alone.
 */
float phaseAerosol(float cosTheta, float g) {
  return mix(phaseHG(cosTheta, g * 0.24), phaseHG(cosTheta, g), 0.42);
}

/**
 * Shadow visibility for a point in the medium.
 *
 * Every early-out here has to return a *fade toward lit* rather than a hard
 * 1.0. A cascade's footprint is a box in light space, so a binary bail at its
 * edge draws a razor-straight bright wedge across whatever geometry happens to
 * straddle the boundary — the single most obvious artefact the volumetric pass
 * can produce. Fading over the outer margin of each cascade, and fading the
 * whole term out past the last split, keeps the transition invisible.
 */
float cascadeVisibility(highp sampler2DShadow shadowMap, mat4 shadowMatrix, vec3 worldPos, float slopeBias) {
  vec4 sc = shadowMatrix * vec4(worldPos, 1.0);
  sc /= sc.w;
  if (sc.z > 1.0) return 1.0;

  // Distance from the cascade edge, in normalised light-space units.
  vec2 edge = min(sc.xy, 1.0 - sc.xy);
  float inside = smoothstep(0.0, 0.06, min(edge.x, edge.y));
  if (inside <= 0.0) return 1.0;

  // Comparison sampler: three configures a PCF shadow map's depth attachment
  // with a LESS_EQUAL compare function, so the fetch returns the filtered result
  // of the test rather than a depth to compare by hand.
  return mix(1.0, texture2D(shadowMap, vec3(sc.xy, sc.z - slopeBias)), inside);
}

float sampleShadow(vec3 worldPos, float viewDepth) {
  if (uCascadeCount == 0) return 1.0;

  float shadow = 1.0;
  if (viewDepth < uCascadeSplit0) {
    shadow = cascadeVisibility(tShadow0, uShadowMatrix0, worldPos, 0.0015);
    if (uCascadeCount > 1) {
      // Cross-fade the last fifth of the cascade into the next one.
      float blend = smoothstep(uCascadeSplit0 * 0.8, uCascadeSplit0, viewDepth);
      if (blend > 0.0) {
        shadow = mix(shadow, cascadeVisibility(tShadow1, uShadowMatrix1, worldPos, 0.003), blend);
      }
    }
  } else if (uCascadeCount > 1 && viewDepth < uCascadeSplit1) {
    shadow = cascadeVisibility(tShadow1, uShadowMatrix1, worldPos, 0.003);
    // Past the last cascade there is no occlusion information at all, so ease
    // back to fully lit instead of snapping.
    shadow = mix(shadow, 1.0, smoothstep(uCascadeSplit1 * 0.75, uCascadeSplit1, viewDepth));
  }
  return shadow;
}

// Value noise; three octaves is enough to break up the fog into drifting
// sheets without the marching cost exploding.
float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = (i.xy + vec2(37.0, 17.0) * i.z) + f.xy;
  float a = hash12(uv);
  float b = hash12(uv + vec2(1.0, 0.0));
  float c = hash12(uv + vec2(0.0, 1.0));
  float d = hash12(uv + vec2(1.0, 1.0));
  float n0 = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);

  vec2 uv2 = (i.xy + vec2(37.0, 17.0) * (i.z + 1.0)) + f.xy;
  a = hash12(uv2);
  b = hash12(uv2 + vec2(1.0, 0.0));
  c = hash12(uv2 + vec2(0.0, 1.0));
  d = hash12(uv2 + vec2(1.0, 1.0));
  float n1 = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);

  return mix(n0, n1, f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

/**
 * Extinction per metre at a point, ramped in over the near field.
 *
 * A uniform medium integrates to an in-scattered term proportional to distance,
 * so it is never zero — and because the radiance being scattered is the sun at
 * an intensity of ~15, even a hundredth of optical depth is a significant amount
 * of light. Measured against this street the first dozen metres alone added 0.01
 * of scene-linear grey to every pixel, which lifted shadowed facades by 73%.
 * On the brightest surfaces that is invisible; on the darkest it is the entire
 * value, and a floor under the darkest pixels in the frame is exactly the milky,
 * hazed-over look that the whole grade is fighting.
 *
 * Aerial perspective is not observable at conversational distances in clear
 * desert air — nobody sees haze between themselves and a wall across the street
 * — so the medium is faded in over the near field instead of starting at the
 * lens. Beyond the ramp the model is unchanged, which leaves the distance cue
 * intact while the blacks stay black.
 */
float hazeDensity(vec3 p, float dist) {
  float h = exp(-max(p.y - uFogBaseHeight, 0.0) * uFogHeightFalloff);
  float d = uFogDensity * h * smoothstep(0.0, uFogNearRamp, dist);

  if (uNoiseStrength > 0.001) {
    float n = fbm(p * 0.045 + uWind * uTime * 0.02);
    d *= mix(1.0, n * 1.9, uNoiseStrength);
  }
  return d;
}

float smokeDensity(vec3 p) {
  float d = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= uSmokeCount) break;
    vec3 c = uSmoke[i].xyz;
    float r = uSmoke[i].w;
    if (r <= 0.0) continue;
    vec3 rel = p - c;
    float dist = length(rel);
    if (dist < r) {
      float falloff = 1.0 - dist / r;
      falloff *= falloff;
      // Billowing: displace the boundary with noise keyed on the puff's seed.
      float turb = fbm(p * 0.18 + uSmokeParams[i].y + uTime * 0.12);
      d += uSmokeParams[i].x * falloff * mix(0.5, 1.6, turb);
    }
  }
  return d;
}

void main() {
  float rawDepth = texture2D(tDepth, vUv).x;

  vec4 clip = vec4(vUv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 world = uInverseViewProjection * clip;
  world /= world.w;

  vec3 rayDir = world.xyz - uCameraPos;
  float rayLen = length(rayDir);
  rayDir /= max(rayLen, 1e-5);

  // Sky pixels still march, but only out to the volumetric range — beyond
  // that the sky shader already contains its own scattering.
  float marchLen = min(rayLen, uMaxDistance);
  if (rawDepth >= 0.9999) marchLen = uMaxDistance;

  float stepSize = marchLen / float(VOL_STEPS);

  // Blue-noise offset per pixel + per frame: banding becomes noise, and TAA
  // then integrates the noise away.
  float offset = texture2D(tBlueNoise, gl_FragCoord.xy / 64.0 + vec2(uTime * 3.7, uTime * 2.3)).x;

  float cosTheta = dot(rayDir, normalize(uSunDirection));
  float phase = phaseAerosol(cosTheta, uAnisotropy);
  // Blend in an isotropic floor so shadowed haze does not go black.
  phase = mix(phase, 1.0 / (4.0 * PI), 0.30);
  // Single scattering conserves all of the energy the forward lobe removes from
  // the beam, but a real medium has already redistributed most of it by the time
  // the light arrives; integrating one bounce at full strength therefore
  // overstates the aureole badly. The deficit is what this gain stands in for.
  phase *= uBeamGain;

  // Ambient arriving at the medium, matched to the part of the sky the ray is
  // pointing at. Aerial perspective has to converge on the sky colour behind
  // the object, otherwise distant geometry dissolves into a grey-white veil
  // that sits in front of the sky instead of blending into it.
  float elevation = clamp(rayDir.y * 2.2 + 0.28, 0.0, 1.0);
  vec3 ambientIn = mix(uHazeLow, uHazeHigh, elevation);

  vec3 scattered = vec3(0.0);
  float transmittance = 1.0;

  for (int i = 0; i < VOL_STEPS; i++) {
    float t = (float(i) + offset) * stepSize;
    if (t > marchLen) break;
    vec3 p = uCameraPos + rayDir * t;

    // sigma_t: extinction per metre. sigma_s = albedo * sigma_t.
    float smokeT = smokeDensity(p);
    float sigmaT = hazeDensity(p, t) + smokeT;
    if (sigmaT <= 1e-6) continue;

    float shadow = sampleShadow(p, t);

    // Smoke is optically thick and self-shadows heavily, so its interior sits
    // much closer to ambient than thin haze does.
    float smokeFrac = smokeT / max(sigmaT, 1e-6);
    float beam = phase * mix(1.0, 0.28, smokeFrac);

    vec3 L = uSunColor * uSunIntensity * shadow * beam
           + ambientIn * mix(1.0, 0.55, smokeFrac);

    // Analytic integration of in-scattering across the segment. Writing it as
    // albedo * L * (1 - T_step) keeps the result bounded by the incident
    // radiance no matter how many steps are taken — the naive form divides by
    // density and diverges as the medium thins.
    float stepTransmittance = exp(-sigmaT * stepSize);
    vec3 integrated = uFogAlbedo * L * (1.0 - stepTransmittance);

    scattered += transmittance * integrated;
    transmittance *= stepTransmittance;

    if (transmittance < 0.004) break;
  }

  gl_FragColor = vec4(scattered, transmittance);
}
`;

/** Composites the volumetric buffer over the lit scene. */
export const VOLUMETRIC_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tVolumetric;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uStrength;

// Bilateral upsample from the half-resolution volumetric buffer. Weighting by
// depth similarity stops the fog from bleeding across object silhouettes,
// which is the classic giveaway of cheap half-res volumetrics.
//
// uTexel is the *volumetric* buffer's texel size, not the frame's. Stepping by
// full-resolution texels lands all nine taps inside the same low-resolution
// texel, which makes the bilateral weighting a no-op and reintroduces exactly
// the silhouette bleed it exists to prevent.
void main() {
  float centerDepth = texture2D(tDepth, vUv).x;

  vec4 sum = vec4(0.0);
  float wsum = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)) * uTexel;
      vec4 v = texture2D(tVolumetric, vUv + o);
      float d = texture2D(tDepth, vUv + o).x;
      float w = exp(-abs(d - centerDepth) * 1600.0);
      sum += v * w;
      wsum += w;
    }
  }

  vec4 vol = wsum > 1e-4 ? sum / wsum : texture2D(tVolumetric, vUv);
  vec3 scene = texture2D(tScene, vUv).rgb;
  gl_FragColor = vec4(scene * vol.a + vol.rgb * uStrength, 1.0);
}
`;
