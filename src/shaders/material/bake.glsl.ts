/**
 * The two-pass bake framework.
 *
 * Pass A ("surface") runs a per-material shader once and writes a G-buffer of
 * authored values: albedo, a 16-bit height, roughness, metalness, an occlusion
 * hint and a wear mask.
 *
 * Pass B ("resolve") is shared by every material. It derives the normal from
 * the height field with a Sobel filter at exact texel scale, computes cavity
 * occlusion by sampling the horizon at three radii, and computes curvature so
 * convex detail can be worn (lightened, polished, made metallic) and concave
 * detail can collect grime. That correlation between the height field and the
 * other three channels is what stops the result looking like four unrelated
 * noise fields.
 *
 * The resolve runs twice with different outputs because albedo has to live in
 * an sRGB-encoded attachment (hardware decode on sample, good precision in the
 * darks) while normal/ARM/height must stay linear.
 */

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Wrapper around a material's `surf()` for pass A. */
export const SURFACE_MAIN = /* glsl */ `
layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec4 gHeight;
layout(location = 2) out vec4 gMat;

/** 16-bit fixed point across two bytes; the height drives the normal map. */
vec2 packH(float v) {
  v = clamp(v, 0.0, 1.0);
  float f = v * 255.0;
  float i = floor(f);
  return vec2(i / 255.0, f - i);
}

void main() {
  Surf s = newSurf();
  surf(vUv, s);
  // Albedo is stored sRGB-encoded in this intermediate byte target so dark
  // materials keep their precision; the resolve pass decodes it.
  gAlbedo = vec4(linToSrgb(clamp(s.albedo, 0.0, 1.0)), clamp(s.alpha, 0.0, 1.0));
  gHeight = vec4(packH(s.height), clamp(s.ao, 0.0, 1.0), clamp(s.wear, 0.0, 1.0));
  gMat = vec4(clamp(s.rough, 0.0, 1.0), clamp(s.metal, 0.0, 1.0), 0.0, 1.0);
}
`;

export const RESOLVE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tAlbedo;
uniform sampler2D tHeight;
uniform sampler2D tMat;
uniform float uRes;
/** Height amplitude divided by tile size: converts height slope to real slope. */
uniform float uHeightScale;
uniform float uNormalBoost;
uniform float uAO;
uniform float uCurv;
uniform float uCavityRough;
uniform float uCavityGrime;
uniform vec3 uCavityTint;
uniform float uWear;
uniform vec3 uWearColor;
uniform float uWearRough;
uniform float uWearMetal;
uniform float uRoughFloor;

#ifdef RESOLVE_ALBEDO
layout(location = 0) out vec4 oAlbedo;
#else
layout(location = 0) out vec4 oNormal;
layout(location = 1) out vec4 oArm;
#ifdef RESOLVE_HEIGHT
layout(location = 2) out vec4 oHeight;
#endif
#endif

int wrap1(int v, int n) { return (v % n + n) % n; }

float H(ivec2 c) {
  int n = int(uRes);
  vec2 e = texelFetch(tHeight, ivec2(wrap1(c.x, n), wrap1(c.y, n)), 0).rg;
  return e.x + e.y * (1.0 / 255.0);
}

/**
 * Convexity at two scales, in slope units. Positive on ridges and chipped
 * edges, negative in cracks and joints.
 */
float convexity(ivec2 px, float h0) {
  float a = (H(px + ivec2(1, 0)) + H(px + ivec2(-1, 0)) +
             H(px + ivec2(0, 1)) + H(px + ivec2(0, -1))) * 0.25;
  float b = (H(px + ivec2(5, 0)) + H(px + ivec2(-5, 0)) +
             H(px + ivec2(0, 5)) + H(px + ivec2(0, -5))) * 0.25;
  float s = uHeightScale * uRes;
  return (h0 - a) * s * 0.7 + (h0 - b) * s * 0.14;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  float h0 = H(px);
  float convex = convexity(px, h0);
  float edgeRaw = clamp(convex * uCurv, 0.0, 1.0);
  float cavityRaw = clamp(-convex * uCurv * 0.9, 0.0, 1.0);

  vec4 hpk = texelFetch(tHeight, px, 0);
  float aoHint = hpk.b;
  float wear = hpk.a;
  float edge = edgeRaw * wear;

#ifdef RESOLVE_ALBEDO
  vec4 alb = texelFetch(tAlbedo, px, 0);
  vec3 albedo = srgbToLin(alb.rgb);
  vec2 mat = texelFetch(tMat, px, 0).rg;

  // Crevices collect dirt: a small albedo shift, not a baked shadow. The
  // occlusion itself lives in the ARM map.
  albedo *= mix(vec3(1.0), uCavityTint, cavityRaw * uCavityGrime);
  albedo = mix(albedo, uWearColor, edge * uWear);

  // Keep reflectance physically plausible: nothing is a perfect absorber and
  // only metals get near-white diffuse. Scaling by luminance rather than
  // clamping per channel matters — a per-channel floor turns a dark saturated
  // colour (a leaf, deep rust) grey, which is exactly the wrong failure.
  float lum = luma(albedo);
  float hi = mix(0.86, 0.97, mat.g);
  float target = clamp(lum, 0.028, hi);
  albedo *= target / max(lum, 1e-5);
  oAlbedo = vec4(clamp(albedo, vec3(0.0), vec3(1.0)), alb.a);
#else
  // Sobel: /8 gives the height change per texel exactly.
  float h00 = H(px + ivec2(-1, -1));
  float h10 = H(px + ivec2(0, -1));
  float h20 = H(px + ivec2(1, -1));
  float h01 = H(px + ivec2(-1, 0));
  float h21 = H(px + ivec2(1, 0));
  float h02 = H(px + ivec2(-1, 1));
  float h12 = H(px + ivec2(0, 1));
  float h22 = H(px + ivec2(1, 1));
  float dx = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) * 0.125;
  float dy = ((h02 + 2.0 * h12 + h22) - (h00 + 2.0 * h10 + h20)) * 0.125;
  float slope = uHeightScale * uRes * uNormalBoost;
  vec3 n = normalize(vec3(-dx * slope, -dy * slope, 1.0));

  // Horizon-style cavity occlusion at three radii, so both the pitting and the
  // large joints occlude by the right amount.
  float occ = 0.0;
  float wsum = 0.0;
  for (int r = 0; r < 3; r++) {
    float rad = (r == 0 ? 2.0 : (r == 1 ? 6.0 : 18.0));
    float w = (r == 0 ? 1.0 : (r == 1 ? 0.7 : 0.45));
    float acc = 0.0;
    for (int d = 0; d < 8; d++) {
      float a = float(d) * (TAU / 8.0);
      vec2 dir = vec2(cos(a), sin(a)) * rad;
      float dh = H(px + ivec2(dir)) - h0;
      float t = max(0.0, dh) * uHeightScale * uRes / rad;
      acc += t * inversesqrt(1.0 + t * t);
    }
    occ += w * acc * 0.125;
    wsum += w;
  }
  occ /= max(wsum, 1e-4);

  vec2 mat = texelFetch(tMat, px, 0).rg;
  float rough = mat.r;
  float metal = mat.g;
  rough = clamp(rough + cavityRaw * uCavityRough + edge * uWearRough, uRoughFloor, 1.0);
  metal = clamp(metal + edge * uWearMetal, 0.0, 1.0);
  float ao = clamp(aoHint * (1.0 - uAO * occ), 0.0, 1.0);

  oNormal = vec4(n * 0.5 + 0.5, 1.0);
  oArm = vec4(ao, rough, metal, 1.0);
  #ifdef RESOLVE_HEIGHT
  oHeight = vec4(h0, h0, h0, 1.0);
  #endif
#endif
}
`;

/**
 * Shared high-frequency detail normal, applied at a much higher tiling rate so
 * surfaces keep breaking up under a 30 cm inspection. Deliberately generic:
 * mixed-scale grain with a few sparse nicks.
 */
export const DETAIL_SURF = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  float fine = pgrain(uv, 512.0, 1.7) * 0.5 + pgrain(uv, 256.0, 4.3) * 0.5;
  float mid = pfbm01(uv, vec2(64.0), 4, 0.55, 9.1);
  float lump = pbillow(uv, vec2(18.0), 3, 0.5, 3.3);
  float nick = pdots(uv, vec2(24.0), 0.12, 0.22, 7.7);
  s.height = clamp(mid * 0.5 + lump * 0.28 + fine * 0.22 - nick * 0.35, 0.0, 1.0);
  s.albedo = vec3(0.5);
  s.rough = 0.5;
  s.wear = 1.0;
}
`;
