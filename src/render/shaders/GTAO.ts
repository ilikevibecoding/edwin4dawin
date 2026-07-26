import { GLSL_COMMON } from '../FullScreen';

/**
 * Ground-Truth Ambient Occlusion (horizon-search, Jimenez et al. style).
 *
 * Compared with classic hemisphere-sampling SSAO this converges to a much
 * more physically plausible cosine-weighted visibility integral, so contact
 * shadows tighten under crates and in door reveals instead of producing the
 * grey halo that instantly dates a renderer.
 */
export const GTAO_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2  uResolution;
uniform vec2  uTexel;
uniform mat4  uProjection;
uniform mat4  uInverseProjection;
uniform float uNear;
uniform float uFar;
uniform float uRadius;      // world-space sampling radius, metres
uniform float uIntensity;
uniform float uBias;        // normal bias to kill self-occlusion acne
uniform float uThickness;   // heuristic for un-occluding thin geometry
uniform float uFrame;

${GLSL_COMMON}

#ifndef SLICES
#define SLICES 3
#endif
#ifndef STEPS
#define STEPS 6
#endif

float readDepth(vec2 uv) {
  return texture2D(tDepth, uv).x;
}

vec3 viewPosFromDepth(vec2 uv, float rawDepth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 view = uInverseProjection * clip;
  return view.xyz / view.w;
}

void main() {
  float rawDepth = readDepth(vUv);
  if (rawDepth >= 0.9999) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 P = viewPosFromDepth(vUv, rawDepth);
  vec3 N = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);
  vec3 V = normalize(-P);

  // Screen-space radius shrinks with distance so the effect stays world-scale.
  float pixelRadius = uRadius * (uProjection[1][1] * 0.5) / max(-P.z, 0.05);
  pixelRadius = clamp(pixelRadius, 2.0 * uTexel.y, 0.12);

  // Per-pixel rotation + offset, animated across frames. TAA then resolves the
  // remaining noise into a clean gradient for free.
  vec3 rand = hash32(gl_FragCoord.xy + uFrame * 17.0);
  float rotJitter = rand.x;
  float stepJitter = rand.y;

  float visibility = 0.0;

  for (int s = 0; s < SLICES; s++) {
    float phi = (float(s) + rotJitter) * (PI / float(SLICES));
    vec2 dir = vec2(cos(phi), sin(phi));
    vec2 sliceStep = dir * pixelRadius / float(STEPS);
    // Correct for aspect so the world-space radius is isotropic on screen.
    sliceStep.x *= uResolution.y / uResolution.x;

    // Project the surface normal into the slice plane; the horizon angles are
    // measured relative to this, which is what makes GTAO cosine-correct.
    vec3 sliceDir = vec3(dir, 0.0);
    vec3 orthoDir = sliceDir - dot(sliceDir, V) * V;
    vec3 axis = cross(sliceDir, V);
    vec3 projN = N - axis * dot(N, axis);
    float projNLen = length(projN);
    if (projNLen < 1e-4) continue;
    projN /= projNLen;

    float sgn = sign(dot(orthoDir, projN));
    float cosN = clamp(dot(projN, V), -1.0, 1.0);
    float n = sgn * acos(cosN);

    float h0 = -1.0; // cos of max horizon angle, side 0
    float h1 = -1.0; // side 1

    for (int t = 1; t <= STEPS; t++) {
      float f = (float(t) - stepJitter) / float(STEPS);
      // Quadratic spacing concentrates samples near the shading point, where
      // occlusion contributes most.
      vec2 off = sliceStep * f * f * float(STEPS);

      vec2 uvA = vUv + off;
      vec2 uvB = vUv - off;

      if (uvA.x > 0.0 && uvA.x < 1.0 && uvA.y > 0.0 && uvA.y < 1.0) {
        vec3 sA = viewPosFromDepth(uvA, readDepth(uvA)) - P;
        float dA = length(sA);
        float cA = dot(sA / max(dA, 1e-5), V);
        float fallA = clamp(1.0 - (dA - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        h0 = max(h0, mix(-1.0, cA, fallA));
      }
      if (uvB.x > 0.0 && uvB.x < 1.0 && uvB.y > 0.0 && uvB.y < 1.0) {
        vec3 sB = viewPosFromDepth(uvB, readDepth(uvB)) - P;
        float dB = length(sB);
        float cB = dot(sB / max(dB, 1e-5), V);
        float fallB = clamp(1.0 - (dB - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        h1 = max(h1, mix(-1.0, cB, fallB));
      }
    }

    float t0 = n + max(-acos(clamp(h0, -1.0, 1.0)) - n, -PI * 0.5);
    float t1 = n + min( acos(clamp(h1, -1.0, 1.0)) - n,  PI * 0.5);

    float inner0 = -cos(2.0 * t0 - n) + cos(n) + 2.0 * t0 * sin(n);
    float inner1 = -cos(2.0 * t1 - n) + cos(n) + 2.0 * t1 * sin(n);
    visibility += projNLen * 0.25 * (inner0 + inner1);
  }

  visibility /= float(SLICES);
  visibility = clamp(visibility, 0.0, 1.0);

  float ao = pow(visibility, uIntensity);
  // Store linear view depth alongside AO so the bilateral blur can be
  // edge-aware without a second depth fetch.
  gl_FragColor = vec4(ao, -P.z / uFar, 0.0, 1.0);
}
`;

/** Edge-aware separable blur used to denoise the GTAO result. */
export const AO_BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tAO;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform float uDepthSigma;

void main() {
  vec2 center = texture2D(tAO, vUv).xy;
  float centerDepth = center.y;

  float sum = center.x;
  float wsum = 1.0;

  // 9-tap Gaussian, depth-weighted.
  const float weights[4] = float[4](0.2270, 0.1945, 0.1216, 0.0540);

  for (int i = 1; i <= 3; i++) {
    vec2 off = uDirection * uTexel * float(i) * 1.6;
    vec2 a = texture2D(tAO, vUv + off).xy;
    vec2 b = texture2D(tAO, vUv - off).xy;
    float wa = weights[i] * exp(-abs(a.y - centerDepth) * uDepthSigma);
    float wb = weights[i] * exp(-abs(b.y - centerDepth) * uDepthSigma);
    sum += a.x * wa + b.x * wb;
    wsum += wa + wb;
  }

  gl_FragColor = vec4(sum / wsum, centerDepth, 0.0, 1.0);
}
`;

/**
 * Multiplies AO into the lit HDR buffer.
 *
 * AO is applied with a coloured floor rather than to zero: real occluded
 * cavities still receive bounced light, and tinting the falloff slightly warm
 * (from the sky/ground bounce) avoids the dead grey look of naive SSAO.
 */
export const AO_APPLY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tAO;
uniform vec3  uBounceTint;
uniform float uStrength;
uniform float uSpecularOcclusion;

void main() {
  vec3 color = texture2D(tScene, vUv).rgb;
  float ao = texture2D(tAO, vUv).x;
  ao = mix(1.0, ao, uStrength);

  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // Bright pixels are dominated by direct light / specular, which AO should
  // barely touch. This keeps sunlit ground from getting muddy.
  float shield = smoothstep(0.6, 3.0, lum) * (1.0 - uSpecularOcclusion);
  float applied = mix(ao, 1.0, shield);

  vec3 occluded = color * applied;
  gl_FragColor = vec4(mix(occluded, occluded * uBounceTint, (1.0 - applied) * 0.5), 1.0);
}
`;
