import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE, GLSL_SCATTER } from './common.glsl';

/**
 * Sampler for the sky's aerial-perspective volume.
 *
 * The sky bakes the atmosphere's in-scatter and transmittance into a world-space
 * table indexed by (distance, view zenith, azimuth relative to the sun), so the
 * whole Rayleigh/Mie integral over kilometres costs one 3D texture fetch here.
 * Both axes are sqrt-distributed toward the camera and the horizon, where the
 * geometry actually is, and every axis carries the usual half-texel inset so the
 * edge texels land exactly on the parameter extremes.
 */
const GLSL_AERIAL = /* glsl */ `
uniform highp sampler3D uAerialInscatter;
uniform highp sampler3D uAerialTransmittance;
uniform vec3 uAerialSize;
uniform vec3 uAerialIrradiance;
uniform float uAerialMaxDistance;
uniform float uSunAzimuth;

float aerialAxis(float x, float size) {
  return 0.5 / size + clamp(x, 0.0, 1.0) * (1.0 - 1.0 / size);
}

vec3 aerialUvw(float distance, vec3 dir) {
  float u = sqrt(clamp(distance / max(uAerialMaxDistance, 1.0), 0.0, 1.0));
  float v = 0.5 + 0.5 * sign(dir.y) * sqrt(abs(dir.y));
  // Azimuth measured from -Z toward +X, matching the sky's convention.
  float cosAz = cos(atan(dir.x, -dir.z) - uSunAzimuth);
  float w = sqrt(clamp(0.5 - 0.5 * cosAz, 0.0, 1.0));
  return vec3(aerialAxis(u, uAerialSize.x), aerialAxis(v, uAerialSize.y),
              aerialAxis(w, uAerialSize.z));
}
`;

/**
 * The atmosphere, layered behind the local fog. Skipped on sky pixels: the dome
 * already renders the full scattering integral for those, and applying it twice
 * would double the horizon's brightness.
 *
 * Extinction collapses to a scalar for the blend. Over the few hundred metres a
 * street scene spans, the per-channel difference in atmospheric extinction is
 * under half a percent — the colour of distance comes from the in-scatter, which
 * stays per-channel.
 */
const AERIAL_APPLY = /* glsl */ `
  if (!isSky) {
    vec3 uvw = aerialUvw(sceneDistance, worldDir);
    vec3 airIn = texture(uAerialInscatter, uvw).rgb * uAerialIrradiance;
    vec3 airT = texture(uAerialTransmittance, uvw).rgb;
    inscatter += airIn * transmittance;
    transmittance *= clamp(dot(airT, vec3(0.3333)), 0.0, 1.0);
  }
`;

/**
 * Volumetric lighting, height fog and aerial perspective in one raymarch.
 *
 * The march samples the sun's shadow cascades, so shafts appear wherever
 * geometry actually occludes the sun — through a doorway, between two buildings,
 * under a truck — rather than being faked with a radial blur from the sun's
 * screen position. That distinction is most of the reason a scene reads as
 * "shot" rather than "rendered", and it is why this is worth a raymarch.
 *
 * Two media are in play and the split between them matters. The march handles
 * the *local* one — ground fog and dust, a layer tens of metres deep that the
 * sun can be occluded in — because only a march can shadow it. The atmosphere
 * itself, tens of kilometres deep and effectively unshadowed, comes from the
 * sky's precomputed aerial-perspective volume in a single fetch. Marching the
 * atmosphere would be both slower and less accurate, and doubling it up in both
 * terms is what turns a scene milky.
 *
 * Output is premultiplied: `rgb` is in-scattered radiance, `a` is transmittance,
 * so the composite is a single blend of `src.rgb + dst.rgb * src.a`.
 */
export function volumetricFrag(cascades: number, compare: boolean, aerial: boolean): string {
  const n = Math.max(0, Math.min(4, cascades));
  const samplerType = compare ? 'highp sampler2DShadow' : 'highp sampler2D';

  const declarations = Array.from(
    { length: n },
    (_, i) => `uniform ${samplerType} uShadowMap${i};`,
  ).join('\n');

  const lookup = compare
    ? (i: number) => `texture(uShadowMap${i}, vec3(uvz.xy, uvz.z - bias))`
    : (i: number) => `(uvz.z - bias > texture(uShadowMap${i}, uvz.xy).r ? 0.0 : 1.0)`;

  // Sampler arrays cannot be indexed dynamically in GLSL ES 3.0, so the
  // cascade selection is unrolled.
  const branches = Array.from({ length: n }, (_, i) => {
    const head = i === 0 ? 'if' : 'else if';
    return `  ${head} (index == ${i}) {
    vec4 sc = uShadowMatrix[${i}] * vec4(worldPos, 1.0);
    vec3 uvz = sc.xyz / max(sc.w, 1e-6);
    if (uvz.x < 0.005 || uvz.x > 0.995 || uvz.y < 0.005 || uvz.y > 0.995 || uvz.z > 1.0) return 1.0;
    return ${lookup(i)};
  }`;
  }).join('\n');

  const cascadeSelect =
    n === 0
      ? '  return 1.0;'
      : `  int index = ${n - 1};
  for (int i = 0; i < ${n}; i++) {
    if (viewDistance < uCascadeFar[i]) { index = i; break; }
  }
${branches}
  return 1.0;`;

  return /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}
${GLSL_SCATTER}
${aerial ? GLSL_AERIAL : ''}

in vec2 vUv;

uniform sampler2D uHiZ;
${declarations}
${n > 0 ? `uniform mat4 uShadowMatrix[${n}];\nuniform float uCascadeFar[${n}];` : ''}

uniform mat4 uProjInv;
uniform mat3 uViewToWorld;
uniform vec3 uCameraPos;
uniform vec2 uNearFar;
uniform float uFrame;

uniform vec3 uSunDirection;
uniform vec3 uSunIrradiance;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;

uniform float uFogDensity;
uniform float uFogHeight;
uniform float uFogFalloff;
uniform float uDustDensity;
uniform float uScatterG;
uniform float uBackScatter;
uniform float uSunIntensity;
uniform float uAmbientScatter;
uniform float uMaxDistance;
uniform float uShadowBias;

out vec4 fragColor;

#ifndef STEPS
#define STEPS 32
#endif

float sunVisibility(vec3 worldPos, float viewDistance) {
  float bias = uShadowBias;
${cascadeSelect}
}

void main() {
  float rawDepth = texture(uHiZ, vUv).r;

  vec3 viewRay = viewRayFromUv(vUv, uProjInv);
  float rayScale = length(viewRay);
  vec3 worldDir = normalize(uViewToWorld * viewRay);

  // Depth is measured along -Z; the march needs distance along the ray.
  float sceneDistance = rawDepth * rayScale;
  bool isSky = rawDepth >= uNearFar.y * 0.999;
  float marchDistance = min(sceneDistance, uMaxDistance);

  float cosTheta = dot(worldDir, uSunDirection);
  // Dual lobe: a tight forward lobe carries the shaft when looking near the sun,
  // a weak backward lobe keeps the fog reading as a volume when looking away.
  float phase = phaseDual(cosTheta, uScatterG, uBackScatter, 0.28);

  // Radiance the local medium scatters in from the sky. Evaluated once for the
  // whole ray: the sky does not change appreciably over a few hundred metres,
  // and the phase function integrates to one over the sphere, so an isotropic
  // average of the sky radiance is the correct weight.
  vec3 skyIn = skyGradient(worldDir, uSkyColor, uHorizonColor) * uAmbientScatter;

  float jitter = ignAnimated(gl_FragCoord.xy, uFrame);
  float dt = marchDistance / float(STEPS);

  vec3 inscatter = vec3(0.0);
  float transmittance = 1.0;
  vec3 sunIn = uSunIrradiance * uSunIntensity * phase;

  for (int i = 0; i < STEPS; i++) {
    float t = (float(i) + jitter) * dt;
    vec3 pos = uCameraPos + worldDir * t;

    // Exponential height fog plus a thin uniform term. The uniform term is what
    // keeps upper floors and rooftops from reading as cut-outs when the fog
    // layer itself is below them.
    float height = exp(-max(pos.y - uFogHeight, 0.0) / max(uFogFalloff, 0.5));
    float sigma = uFogDensity * height + uDustDensity;
    float opticalDepth = sigma * dt;
    if (opticalDepth < 1e-7) continue;

    float shadow = sunVisibility(pos, t);
    vec3 radiance = sunIn * shadow + skyIn;

    // Analytic integration across the segment; a midpoint estimate biases
    // bright at high density and shows up as banding in thick fog.
    float scattered = 1.0 - exp(-opticalDepth);
    inscatter += transmittance * radiance * scattered;
    transmittance *= 1.0 - scattered;
    if (transmittance < 0.004) break;
  }

${aerial ? AERIAL_APPLY : ''}
  fragColor = vec4(inscatter, transmittance);
}
`;
}

/**
 * Bilateral upsample and composite, blended as `src.rgb + dst.rgb * src.a`.
 *
 * The upsample is depth-weighted against the same half-resolution depth the
 * march used, so a shaft crossing a silhouette does not leak a bright fringe
 * onto the object in front of it.
 */
export const VOLUMETRIC_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uVolume;
uniform sampler2D uDepth;
uniform sampler2D uHalfDepth;
uniform vec2 uHalfTexel;
uniform vec2 uNearFar;
uniform float uStrength;
out vec4 fragColor;

void main() {
  float depth = linearizeDepth(texture(uDepth, vUv).r, uNearFar.x, uNearFar.y);

  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) - 0.5) * uHalfTexel * 2.0;
      float d = texture(uHalfDepth, uv).r;
      float w = exp(-abs(d - depth) / max(depth * 0.06, 0.05));
      sum += texture(uVolume, uv) * w;
      wsum += w;
    }
  }
  vec4 v = wsum > 1e-4 ? sum / wsum : texture(uVolume, vUv);

  // Strength scales the in-scatter and pulls transmittance back toward one
  // together, so turning fog down does not leave the extinction behind.
  fragColor = vec4(v.rgb * uStrength, mix(1.0, clamp(v.a, 0.0, 1.0), uStrength));
}
`;
