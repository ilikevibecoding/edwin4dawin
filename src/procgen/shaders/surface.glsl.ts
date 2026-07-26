import { NOISE_GLSL } from './noise.glsl';
import { COMMON_GLSL } from './common.glsl';
import { PATTERNS_GLSL } from './patterns.glsl';

/**
 * Every material implements one function:
 *
 *   void surface(vec2 uv, inout Surface s)
 *
 * The baker wraps it in a multiple-render-target pass that writes albedo to
 * attachment 0 (sRGB) and the packed ORM+height set to attachment 1 (linear).
 * The channel order of attachment 1 matches what MeshStandardMaterial samples,
 * so one texture serves as aoMap (.r), roughnessMap (.g) and metalnessMap (.b)
 * simultaneously; .a carries height for the Sobel normal pass.
 */
export const SURFACE_STRUCT_GLSL = /* glsl */ `
struct Surface {
  /** Base colour, authored in sRGB. */
  vec3 albedo;
  float roughness;
  /** 0 for dielectrics, 1 for bare metal. Rust and paint are dielectric. */
  float metalness;
  float ao;
  /** Relief in 0..1; scaled into a real slope by the material's relief ratio. */
  float height;
  float alpha;
};
`;

export const SURFACE_VERTEX_GLSL = /* glsl */ `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SURFACE_PROLOGUE = /* glsl */ `
precision highp float;

in vec2 vUv;

layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outOrm;

uniform vec2 uTexel;
uniform float uSeed;

${NOISE_GLSL}
${COMMON_GLSL}
${PATTERNS_GLSL}

/**
 * Lattice count for fine detail, authored against a 512-texel reference and
 * snapped to a power of two.
 *
 * Detail finer than about two texels is wasted ALU that only aliases into the
 * mip chain, so micro frequencies have to follow the quality tier. Snapping to
 * a power of two keeps the count integral, which is what keeps the tile seamless.
 */
float detailCells(float countAt512) {
  float scaled = countAt512 / (uTexel.x * 512.0);
  return clamp(exp2(floor(log2(max(scaled, 2.0)) + 0.5)), 2.0, 4096.0);
}

float grainNoise(vec2 uv, float countAt512, int octaves) {
  float c = detailCells(countAt512);
  return fbmValue2(uv * c, vec2(c), octaves);
}

float grainFbm(vec2 uv, float countAt512, int octaves) {
  float c = detailCells(countAt512);
  return fbm2(uv * c, vec2(c), octaves);
}

/** Anisotropic fine grain: brushing, fibre and sanding direction. */
float grainAniso(vec2 uv, vec2 countAt512, int octaves) {
  vec2 c = vec2(detailCells(countAt512.x), detailCells(countAt512.y));
  return fbmValue2(uv * c, c, octaves);
}

vec3 grainWorley(vec2 uv, float countAt512, float jitter) {
  float c = detailCells(countAt512);
  return worley2(uv * c, vec2(c), jitter);
}

${SURFACE_STRUCT_GLSL}
`;

const SURFACE_EPILOGUE = /* glsl */ `
float interleavedGradient(vec2 p) {
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

void main() {
  Surface s;
  s.albedo = vec3(0.5);
  s.roughness = 0.6;
  s.metalness = 0.0;
  s.ao = 1.0;
  s.height = 0.5;
  s.alpha = 1.0;

  surface(vUv, s);

  outAlbedo = vec4(srgbToLinear(sat(s.albedo)), sat(s.alpha));

  // Height is dithered by half a least-significant bit: without it, 8-bit
  // quantisation terraces into flat facets once the Sobel pass differentiates.
  float dither = (interleavedGradient(gl_FragCoord.xy) - 0.5) / 255.0;
  outOrm = vec4(
    sat(s.ao),
    clamp(s.roughness, 0.03, 1.0),
    sat(s.metalness),
    sat(s.height + dither));
}
`;

/** Assembles a complete MRT surface-bake fragment shader from a material body. */
export function buildSurfaceShader(body: string): string {
  return `${SURFACE_PROLOGUE}\n${body}\n${SURFACE_EPILOGUE}`;
}

/**
 * Sobel normal derivation. Two gradient estimates are combined — one at single
 * texel spacing for crisp detail, one at double spacing so large forms still
 * read once the mip chain kicks in.
 *
 * uRelief is the physical relief depth expressed as a fraction of the tile
 * size, which makes the resulting slope resolution independent.
 */
export const NORMAL_FRAGMENT_GLSL = /* glsl */ `
precision highp float;

in vec2 vUv;

layout(location = 0) out vec4 outNormal;

uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uRelief;
uniform float uWideWeight;

float h(vec2 offset) {
  return textureLod(uSource, vUv + offset * uTexel, 0.0).a;
}

vec2 sobel(float spacing) {
  float tl = h(vec2(-spacing, spacing));
  float tc = h(vec2(0.0, spacing));
  float tr = h(vec2(spacing, spacing));
  float ml = h(vec2(-spacing, 0.0));
  float mr = h(vec2(spacing, 0.0));
  float bl = h(vec2(-spacing, -spacing));
  float bc = h(vec2(0.0, -spacing));
  float br = h(vec2(spacing, -spacing));

  float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
  float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
  // /8 normalises the kernel, /spacing converts the wider span back to a
  // per-texel height difference.
  return vec2(gx, gy) / (8.0 * spacing);
}

void main() {
  vec2 fine = sobel(1.0);
  vec2 wide = sobel(2.5);
  vec2 grad = mix(fine, wide, uWideWeight) / uTexel;

  vec3 n = normalize(vec3(-grad * uRelief, 1.0));
  outNormal = vec4(n * 0.5 + 0.5, 1.0);
}
`;
