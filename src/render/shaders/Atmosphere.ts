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
uniform float uMaxDistance;
uniform float uNoiseStrength;
uniform vec3  uWind;

uniform int   uCascadeCount;
uniform sampler2D tShadow0;
uniform sampler2D tShadow1;
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

float sampleShadow(vec3 worldPos, float viewDepth) {
  if (uCascadeCount == 0) return 1.0;

  vec4 sc;
  float shadow = 1.0;

  if (viewDepth < uCascadeSplit0) {
    sc = uShadowMatrix0 * vec4(worldPos, 1.0);
    sc /= sc.w;
    if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0) return 1.0;
    float d = texture2D(tShadow0, sc.xy).x;
    shadow = sc.z - 0.0015 > d ? 0.0 : 1.0;
  } else if (uCascadeCount > 1 && viewDepth < uCascadeSplit1) {
    sc = uShadowMatrix1 * vec4(worldPos, 1.0);
    sc /= sc.w;
    if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0) return 1.0;
    float d = texture2D(tShadow1, sc.xy).x;
    shadow = sc.z - 0.003 > d ? 0.0 : 1.0;
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

float mediumDensity(vec3 p) {
  float h = exp(-max(p.y - uFogBaseHeight, 0.0) * uFogHeightFalloff);
  float d = uFogDensity * h;

  if (uNoiseStrength > 0.001) {
    float n = fbm(p * 0.045 + uWind * uTime * 0.02);
    d *= mix(1.0, n * 1.9, uNoiseStrength);
  }

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
  float phase = phaseHG(cosTheta, uAnisotropy);
  // Blend in an isotropic floor so shadowed haze does not go black.
  phase = mix(phase, 1.0 / (4.0 * PI), 0.35);

  vec3 scattered = vec3(0.0);
  float transmittance = 1.0;

  for (int i = 0; i < VOL_STEPS; i++) {
    float t = (float(i) + offset) * stepSize;
    if (t > marchLen) break;
    vec3 p = uCameraPos + rayDir * t;

    // sigma_t: extinction per metre. sigma_s = albedo * sigma_t.
    float sigmaT = mediumDensity(p);
    if (sigmaT <= 1e-6) continue;

    float shadow = sampleShadow(p, t);

    // Radiance arriving at this sample from the sun, plus a sky ambient term
    // so shadowed volumes stay blue rather than going black.
    vec3 L = uSunColor * uSunIntensity * shadow * phase
           + vec3(0.26, 0.34, 0.48) * 0.5;

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
void main() {
  float centerDepth = texture2D(tDepth, vUv).x;

  vec4 sum = vec4(0.0);
  float wsum = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)) * uTexel;
      vec4 v = texture2D(tVolumetric, vUv + o);
      float d = texture2D(tDepth, vUv + o).x;
      float w = exp(-abs(d - centerDepth) * 900.0);
      sum += v * w;
      wsum += w;
    }
  }

  vec4 vol = wsum > 1e-4 ? sum / wsum : texture2D(tVolumetric, vUv);
  vec3 scene = texture2D(tScene, vUv).rgb;
  gl_FragColor = vec4(scene * vol.a + vol.rgb * uStrength, 1.0);
}
`;
