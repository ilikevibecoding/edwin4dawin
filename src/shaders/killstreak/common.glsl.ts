/**
 * Shared GLSL for the killstreak effects.
 *
 * Everything the airstrike draws that is not lit geometry — contrails, the
 * afterburner, the exhaust distortion, the napalm sheet, the dust haze and the
 * tactical overlay — is a small custom shader, and they all want the same three
 * things: a cheap value noise, a soft-particle depth fade so a sheet does not
 * cut a hard line where it meets the ground, and the standard log-depth-free
 * linearisation that goes with it.
 */

/** Hash-based value noise. Two octaves is enough for anything moving fast. */
export const KS_NOISE = /* glsl */ `
float ksHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float ksHash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float ksValue(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = ksHash(i);
  float b = ksHash(i + vec2(1.0, 0.0));
  float c = ksHash(i + vec2(0.0, 1.0));
  float d = ksHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float ksValue3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = ksHash3(i);
  float n100 = ksHash3(i + vec3(1.0, 0.0, 0.0));
  float n010 = ksHash3(i + vec3(0.0, 1.0, 0.0));
  float n110 = ksHash3(i + vec3(1.0, 1.0, 0.0));
  float n001 = ksHash3(i + vec3(0.0, 0.0, 1.0));
  float n101 = ksHash3(i + vec3(1.0, 0.0, 1.0));
  float n011 = ksHash3(i + vec3(0.0, 1.0, 1.0));
  float n111 = ksHash3(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

float ksFbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * ksValue(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

float ksFbm3(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * ksValue3(p);
    p *= 2.07;
    a *= 0.5;
  }
  return s;
}
`;

/**
 * Soft-particle depth fade.
 *
 * `uDepthParams` is (near, far, 1/width, 1/height) and `uHasDepth` gates the
 * whole thing, because the pipeline only runs a depth prepass when something
 * downstream consumes one — sampling the attachment that is currently bound for
 * writing is a feedback loop, so an effect that cannot get a clean depth buffer
 * has to settle for hard edges rather than read it anyway.
 */
export const KS_DEPTH = /* glsl */ `
uniform sampler2D uDepthTexture;
uniform vec4 uDepthParams;
uniform float uHasDepth;

float ksLinearDepth(float d) {
  float n = uDepthParams.x;
  float f = uDepthParams.y;
  float z = d * 2.0 - 1.0;
  return (2.0 * n * f) / (f + n - z * (f - n));
}

/** 1 in open air, falling to 0 as the fragment approaches the surface behind it. */
float ksSoften(float viewDepth, float range) {
  if (uHasDepth < 0.5) return 1.0;
  vec2 uv = gl_FragCoord.xy * uDepthParams.zw;
  float scene = ksLinearDepth(texture2D(uDepthTexture, uv).x);
  return clamp((scene - viewDepth) / max(range, 1e-3), 0.0, 1.0);
}
`;
