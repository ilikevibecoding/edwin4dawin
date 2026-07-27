import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE, GLSL_SCATTER } from './common.glsl';

/**
 * Screen-space reflections.
 *
 * Traced at half resolution against the min-depth pyramid: the ray accelerates
 * through space the pyramid proves is empty and only drops back to single-texel
 * stepping near a surface, which is what keeps a 40-metre ray affordable. A
 * crossing is then refined by binary search so the hit lands on the surface
 * rather than on whichever step happened to overshoot it, and validated against
 * a thickness estimate so a ray that passes *behind* a thin railing does not
 * report a hit on it.
 *
 * The reflection direction is importance-sampled from the GGX lobe using the
 * G-buffer roughness, with a per-pixel, per-frame random. One sample per pixel
 * is noise; the temporal accumulation that follows turns it into a rough
 * reflection. That is much closer to correct than blurring a mirror reflection
 * by roughness, which is what makes cheap SSR look like a smeared mirror.
 */
export const SSR_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}
${GLSL_SCATTER}

in vec2 vUv;

uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform sampler2D uHiZ;
uniform sampler2D uHiZCoarse;
uniform sampler2D uNormal;
uniform sampler2D uMotion;

uniform mat4 uProj;
uniform mat4 uProjInv;
uniform mat3 uWorldToView;
uniform mat3 uViewToWorld;
uniform vec2 uNearFar;
uniform vec2 uTexel;
uniform float uFrame;
uniform float uMaxDistance;
uniform float uMaxRoughness;
uniform float uThickness;

uniform vec3 uSunDirection;
uniform vec3 uSunGlow;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;
uniform float uEnvStrength;

out vec4 fragColor;

#ifndef STEPS
#define STEPS 24
#endif
#ifndef REFINE
#define REFINE 5
#endif

vec2 projectUv(vec3 viewPos) {
  vec4 clip = uProj * vec4(viewPos, 1.0);
  return (clip.xy / max(abs(clip.w), 1e-6) * sign(clip.w)) * 0.5 + 0.5;
}

float sceneDepthAt(vec2 uv) {
  return linearizeDepth(texture(uDepth, uv).r, uNearFar.x, uNearFar.y);
}

/** GGX visible-normal sample, so the jitter matches the material's lobe. */
vec3 sampleGGX(vec3 N, float roughness, vec2 xi) {
  float a = max(roughness * roughness, 1e-4);
  float phi = TAU * xi.x;
  float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  vec3 h = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);
  vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tx = normalize(cross(up, N));
  vec3 ty = cross(N, tx);
  return normalize(tx * h.x + ty * h.y + N * h.z);
}

void main() {
  vec4 nr = texture(uNormal, vUv);
  vec4 mm = texture(uMotion, vUv);
  float roughness = nr.w;
  float ssrMask = mm.w;
  float rawDepth = texture(uDepth, vUv).r;

  if (rawDepth >= 1.0 || ssrMask < 0.5 || roughness > uMaxRoughness) {
    fragColor = vec4(0.0);
    return;
  }

  float depth = linearizeDepth(rawDepth, uNearFar.x, uNearFar.y);
  vec3 P = viewRayFromUv(vUv, uProjInv) * depth;
  vec3 V = normalize(-P);
  vec3 N = normalize(uWorldToView * nr.xyz);

  vec2 xi = hash22(gl_FragCoord.xy * 1.37 + uFrame * 7.31);
  vec3 H = sampleGGX(N, roughness, xi);
  vec3 R = reflect(-V, H);
  // A jittered half-vector can push the ray under the surface; the mirror
  // direction is the closest valid substitute.
  if (dot(R, N) <= 0.02) R = reflect(-V, N);

  vec3 worldR = normalize(uViewToWorld * R);
  // Sky fallback, with a soft aureole whose magnitude is derived from the sky's
  // own radiance on the CPU rather than from the sun's irradiance.
  float sunDot = clamp(dot(worldR, uSunDirection), 0.0, 1.0);
  vec3 env = skyGradient(worldR, uSkyColor, uHorizonColor) + uSunGlow * pow(sunDot, 24.0);

  // Grazing rays that come back toward the camera cannot be resolved on screen.
  float facing = clamp(1.0 - dot(R, V), 0.0, 1.0);

  float rayLength = min(uMaxDistance, max(depth * 2.0, 6.0));
  // Offset along the normal by a depth-proportional amount: a fixed bias either
  // self-intersects up close or floats the reflection at distance.
  vec3 origin = P + N * max(0.02, depth * 0.006);
  vec3 endPoint = origin + R * rayLength;
  if (endPoint.z > -uNearFar.x) {
    float t = (-uNearFar.x - origin.z) / max(endPoint.z - origin.z, 1e-5);
    endPoint = origin + (endPoint - origin) * clamp(t, 0.0, 1.0);
  }

  float jitter = ignAnimated(gl_FragCoord.xy, uFrame);
  float t = (0.6 + jitter * 0.4) / float(STEPS);
  float stepSize = 1.0 / float(STEPS);
  float scale = 1.0;
  float prevT = 0.0;
  bool hit = false;
  vec2 hitUv = vUv;

  for (int i = 0; i < STEPS; i++) {
    vec3 S = mix(origin, endPoint, t);
    vec2 uv = projectUv(S);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;

    float rayDepth = -S.z;
    // Coarse level first: if the ray is in front of everything in this 8x8
    // block it can leap forward without risking a missed intersection.
    float coarseMin = texture(uHiZCoarse, uv).r;
    if (rayDepth < coarseMin) {
      prevT = t;
      scale = min(scale * 1.7, 6.0);
      t += stepSize * scale;
      if (t > 1.0) break;
      continue;
    }

    float sceneDepth = texture(uHiZ, uv).r;
    if (rayDepth > sceneDepth) {
      // Binary refine between the last known-empty position and here.
      float lo = prevT;
      float hi = t;
      for (int k = 0; k < REFINE; k++) {
        float mid = (lo + hi) * 0.5;
        vec3 M = mix(origin, endPoint, mid);
        vec2 muv = projectUv(M);
        float md = sceneDepthAt(muv);
        if (-M.z > md) hi = mid; else lo = mid;
      }
      vec3 F = mix(origin, endPoint, hi);
      hitUv = projectUv(F);
      float fd = sceneDepthAt(hitUv);
      float rd = -F.z;
      // Thickness test: a ray that ends up far behind the surface it crossed
      // went past a thin occluder, and reporting a hit there is what produces
      // the smeared duplicate silhouettes cheap SSR is known for.
      float thickness = uThickness * max(1.0, fd * 0.06);
      hit = (rd - fd) < thickness;
      break;
    }

    prevT = t;
    scale = 1.0;
    t += stepSize;
    if (t > 1.0) break;
  }

  vec3 reflection = env * uEnvStrength;
  float confidence = 0.0;

  if (hit) {
    // Fade at the frame edge; a reflection that runs off screen must not stop
    // dead at the border.
    vec2 edge = smoothstep(vec2(0.0), vec2(0.08), hitUv) *
                (1.0 - smoothstep(vec2(0.92), vec2(1.0), hitUv));
    confidence = edge.x * edge.y * facing;
    vec3 hitColor = texture(uColor, hitUv).rgb;
    // Reject reflections of pixels that are themselves mostly sky-facing noise.
    reflection = mix(env * uEnvStrength, hitColor, confidence);
  }

  fragColor = vec4(reflection, confidence);
}
`;

/**
 * Adds the reflection to the frame with `src * 1 + dst * 1` blending.
 *
 * Weighted by a Schlick Fresnel term and by roughness, because this is a
 * forward renderer: the material has already applied its own environment
 * reflection, so a full-strength additive SSR would double-count. Keeping the
 * weight low on rough surfaces is also the difference between wet asphalt and a
 * frame that looks varnished.
 */
export const SSR_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uSSR;
uniform sampler2D uDepth;
uniform sampler2D uHalfDepth;
uniform sampler2D uNormal;
uniform sampler2D uMotion;
uniform mat4 uProjInv;
uniform mat3 uWorldToView;
uniform vec2 uHalfTexel;
uniform vec2 uNearFar;
uniform float uStrength;
uniform float uMaxRoughness;
out vec4 fragColor;

void main() {
  float raw = texture(uDepth, vUv).r;
  vec4 nr = texture(uNormal, vUv);
  vec4 mm = texture(uMotion, vUv);
  float roughness = nr.w;
  if (raw >= 1.0 || mm.w < 0.5 || roughness > uMaxRoughness) {
    fragColor = vec4(0.0);
    return;
  }

  float depth = linearizeDepth(raw, uNearFar.x, uNearFar.y);

  // Depth-aware upsample: reflections must not bleed across a silhouette.
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) - 0.5) * uHalfTexel * 2.0;
      float d = texture(uHalfDepth, uv).r;
      float w = exp(-abs(d - depth) / max(depth * 0.04, 0.02));
      sum += texture(uSSR, uv) * w;
      wsum += w;
    }
  }
  vec4 ssr = wsum > 1e-4 ? sum / wsum : texture(uSSR, vUv);

  vec3 N = normalize(uWorldToView * nr.xyz);
  vec3 P = viewRayFromUv(vUv, uProjInv) * depth;
  vec3 V = normalize(-P);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  float metalness = clamp(mm.z, 0.0, 1.0);
  float f0 = mix(0.04, 0.85, metalness);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
  // Rough surfaces scatter the lobe wide enough that a single traced direction
  // stops being representative; fade rather than smear.
  float roughFade = 1.0 - smoothstep(0.15, uMaxRoughness, roughness);

  fragColor = vec4(ssr.rgb * fresnel * roughFade * uStrength, 1.0);
}
`;
