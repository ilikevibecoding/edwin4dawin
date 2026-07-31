/**
 * Colour, blending and weathering helpers used by every generator.
 *
 * Albedo is authored in sRGB here — the numbers read like values picked in an
 * image editor — and converted to linear once, where the baker writes into the
 * sRGB render target.
 */
export const COMMON_GLSL = /* glsl */ `
#ifndef PROCGEN_COMMON
#define PROCGEN_COMMON

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec2 sat(vec2 x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }

float remap(float v, float a1, float b1, float a2, float b2) {
  return mix(a2, b2, sat((v - a1) / max(b1 - a1, 1e-6)));
}

/** Bell curve peaking at \`centre\`; the workhorse for isolating a value band. */
float band(float v, float centre, float width) {
  return sat(1.0 - abs(v - centre) / max(width, 1e-6));
}

float smoothBand(float v, float lo, float hi, float feather) {
  return smoothstep(lo - feather, lo + feather, v) *
    (1.0 - smoothstep(hi - feather, hi + feather, v));
}

/** Derivative-width step: crisp pattern edges that never alias in the mips. */
float aastep(float threshold, float value) {
  float w = max(fwidth(value), 1e-5);
  return smoothstep(threshold - w, threshold + w, value);
}

float contrast(float c, float amount, float pivot) {
  return sat((c - pivot) * amount + pivot);
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

vec3 srgbToLinear(vec3 c) {
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}

vec3 linearToSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

// Not named 'luminance': three injects its own into every fragment prefix.
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 rgbToHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}

vec3 hsvToRgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, sat(p - K.xxx), c.y);
}

/**
 * Rotate hue and rescale saturation/value independently. Real surfaces drift in
 * hue across a wall; value-only variation looks like a greyscale print.
 */
vec3 tintShift(vec3 c, float hueDelta, float satScale, float valScale) {
  vec3 hsv = rgbToHsv(c);
  hsv.x = fract(hsv.x + hueDelta);
  hsv.y = sat(hsv.y * satScale);
  hsv.z = sat(hsv.z * valScale);
  return hsvToRgb(hsv);
}

vec3 contrast(vec3 c, float amount, float pivot) {
  return sat((c - pivot) * amount + pivot);
}

vec3 blendOverlay(vec3 base, vec3 blend, float amount) {
  vec3 o = mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(vec3(0.5), base));
  return mix(base, o, amount);
}

vec3 blendSoftLight(vec3 base, vec3 blend, float amount) {
  vec3 o = mix(
    2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
    sqrt(max(base, vec3(1e-5))) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
    step(vec3(0.5), blend));
  return mix(base, o, amount);
}

vec3 blendMultiply(vec3 base, vec3 blend, float amount) {
  return mix(base, base * blend, amount);
}

// ---------------------------------------------------------------------------
// UV helpers
// ---------------------------------------------------------------------------

vec2 rot2(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 rotAround(vec2 p, vec2 centre, float a) { return rot2(p - centre, a) + centre; }

/**
 * Slants a lattice coordinate by whole tiles, so directional features — trowel
 * sweeps, brush marks, wood grain — can run diagonally while staying exactly
 * periodic. Rotating uv would not: the lattice would no longer align with the
 * tile border and the seam would show.
 */
vec2 slant(vec2 uv, vec2 cells, float tiles) {
  return vec2(uv.x * cells.x + uv.y * cells.x * tiles, uv.y * cells.y);
}

// ---------------------------------------------------------------------------
// Weathering primitives
// ---------------------------------------------------------------------------

/**
 * Vertical grime runs. Rust and dirt always travel downwards, so a streak begins
 * at some height, wanders a little and fades out as it descends. uv.y points up,
 * matching the baked texture orientation.
 *
 * The descent is taken around the tile rather than down it. A streak that simply
 * ran from its head towards uv.y 0 was still alive when it got there while the
 * top edge was clean, so the field stepped at the wrap and every repeat
 * drew a hard horizontal line across the wall where the streaks restarted.
 * fract() makes the run periodic, and since the streak has faded to nothing
 * before it has travelled a whole tile the two ends meet at zero.
 *
 * The head of each streak stays a hard edge, which is what a drip off a sill
 * looks like, but its height is now uniform over the tile instead of confined to
 * a band near the top: a band is itself a feature at the tile period.
 */
float dripStreaks(vec2 uv, float count, float lengthScale, float seed) {
  float x = uv.x * count;
  float ci = mod(floor(x), count);
  vec2 h = hash22(vec2(ci, seed));
  float present = step(0.45, h.x);
  float len = min(lengthScale * mix(0.3, 1.0, hash12(vec2(ci, seed + 3.1))), 0.9);
  float t = fract(h.y - uv.y) / max(len, 1e-4);
  float alive = step(t, 1.0) * (1.0 - t) * (1.0 - t * 0.4);
  float wander = fbm2(vec2(ci * 3.7 + seed, uv.y * 9.0), vec2(count, 9.0), 3) * 0.2;
  float width = mix(0.14, 0.38, hash12(vec2(ci, seed + 11.0)));
  float profile = sat(1.0 - abs(fract(x) - 0.5 + wander) / width);
  float grain = fbmValue2(vec2(uv.x * count * 3.0, uv.y * 20.0), vec2(count * 3.0, 20.0), 3);
  return present * alive * profile * profile * (0.5 + 0.5 * grain);
}

/** Dust and dirt settling into cavities, driven by inverse height. */
float cavityDirt(float height, float noise, float strength) {
  return sat((1.0 - height) * 1.4 - 0.2 + noise * 0.4) * strength;
}

/** Wear concentrated on raised edges — the classic rubbed-back highlight. */
float edgeWear(float height, float mask, float amount) {
  return sat((height - 0.55) * 3.0) * mask * amount;
}

/**
 * Anisotropic fine lines: brushed metal, sanding marks, fibre direction.
 * \`cells\` must be integral in both axes for the result to stay seamless.
 */
float brushed(vec2 uv, vec2 cells, int octaves) {
  return fbmValue2(uv * cells, cells, octaves);
}

/** Sparse scratch network: thin bright ridges from stretched cellular noise. */
float scratches(vec2 uv, vec2 cells, float thinness, float density) {
  vec3 w = worley2(uv * cells, cells, 0.9);
  float line = 1.0 - sat(w.x * thinness);
  float gate = step(1.0 - density, hash11(w.z + 0.31));
  return line * line * gate;
}

/**
 * Large-scale tonal patchiness: sun bleaching, damp patches, old repairs.
 *
 * The cell count is the frequency and the wrap period at once, and is rounded to
 * whole cells, because perlin2 wraps its lattice index with mod(i, period): a
 * fractional period, or a frequency that does not agree with the period declared
 * alongside it, leaves the field discontinuous at uv 0/1. Under RepeatWrapping
 * that is a hard line across the surface once per repeat — the strongest
 * periodic signal a tile can carry. Callers pass tile-space uv, not a scaled
 * copy, so there is no second place for the two to disagree.
 */
float patchiness(vec2 uv, vec2 cells, int octaves) {
  vec2 c = max(round(cells), vec2(1.0));
  return contrast(fbm2(uv * c, c, octaves) * 0.5 + 0.5, 1.5, 0.5);
}

float patchiness(vec2 uv, float cells, int octaves) {
  return patchiness(uv, vec2(cells), octaves);
}

#endif
`;
