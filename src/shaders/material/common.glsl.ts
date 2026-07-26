/**
 * The surface contract every material shader writes into, plus the shared
 * weathering vocabulary (rust, grime, drip staining, dust, weave, scratches,
 * aggregate). Materials are art-directed by combining these with the noise
 * library rather than by re-deriving the same patterns thirty times.
 *
 * Colour convention: `Surf.albedo` is **linear** reflectance. Author with
 * `S(r,g,b)`, which takes the sRGB values you would pick in a paint program
 * and converts them, so blending stays physically correct.
 */
export const COMMON_GLSL = /* glsl */ `
#ifndef MAT_COMMON_INCLUDED
#define MAT_COMMON_INCLUDED

struct Surf {
  vec3 albedo;   // linear reflectance
  float height;  // 0..1, 0 = deepest
  float rough;   // perceptual roughness
  float metal;
  float ao;      // authored occlusion hint (cavity AO is added by the resolve pass)
  float wear;    // 0..1 susceptibility to edge wear on convex detail
  float alpha;   // opacity, only used by cut-out and glazed materials
};

Surf newSurf() {
  Surf s;
  s.albedo = vec3(0.5);
  s.height = 0.5;
  s.rough = 0.8;
  s.metal = 0.0;
  s.ao = 1.0;
  s.wear = 1.0;
  s.alpha = 1.0;
  return s;
}

/* ---------------------------- colour space ---------------------------- */

vec3 srgbToLin(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
vec3 linToSrgb(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }

/** Author colours the way a paint program shows them. */
vec3 S(float r, float g, float b) { return srgbToLin(vec3(r, g, b)); }
vec3 S1(float v) { return srgbToLin(vec3(v)); }

/* ------------------------------ geometry ------------------------------ */

/**
 * Seamless shear, for anisotropic detail that runs at an angle (scratches,
 * brushed metal, wind ripple). Detail ends up running along (k, -1), so larger
 * k is a shallower angle. The periodic generators repeat every 1.0 of uv, so k
 * has to be a whole number or the pattern fails to meet itself across the top
 * edge; it is rounded here rather than left to the caller.
 */
vec2 shear(vec2 uv, float k) { return vec2(uv.x + floor(k + 0.5) * uv.y, uv.y); }

/** Smooth bevel profile from a signed distance: 1 inside, 0 outside. */
float bevel(float d, float w) { return smoothstep(0.0, -w, d); }

/* ------------------------------ weathering ---------------------------- */

/**
 * Rust coverage front. Rust starts at edges and low points and eats outward in
 * ragged blotches, so the mask is a large-scale field with a high-frequency
 * nibbled boundary rather than a smooth gradient.
 */
float rustMask(vec2 uv, float bias, float seed) {
  float large = pfbm01(pwarp(uv, vec2(2.0), 0.18, seed), vec2(3.0), 4, 0.55, seed);
  float mid = pfbm01(uv, vec2(9.0), 3, 0.5, seed + 12.1);
  float nibble = pfbm01(uv, vec2(34.0), 3, 0.5, seed + 31.7);
  float f = large * 0.62 + mid * 0.26 + nibble * 0.12;
  // The threshold tracks close to the field's median, because a weighted sum of
  // fBm octaves has almost all its mass within about 0.1 of 0.5. Sweeping the
  // threshold across 0.7..0.1 (which looks like the natural range) actually goes
  // from nothing to everything inside a fifth of that span, and every caller
  // then has to be tuned on a knife edge. Here 'bias' maps roughly linearly to
  // coverage: 0 is a front just starting, 1 is a sheet nearly gone.
  return clamp((f - (0.575 - bias * 0.18)) * 14.0, 0.0, 1.0);
}

/**
 * Three-tone iron oxide gradient: dark scale core, mid brown, orange bloom at
 * the advancing edge, going pale where it has weathered to powder. Iron oxide
 * is a *brown*; pushed to saturated orange it stops reading as metal and starts
 * reading as terracotta, so the chroma is kept deliberately low.
 */
vec3 rustColor(float t, float grain) {
  vec3 c = ramp4(
    S(0.20, 0.15, 0.13),
    S(0.34, 0.22, 0.16),
    S(0.47, 0.30, 0.19),
    S(0.52, 0.41, 0.31),
    t
  );
  return c * (0.88 + 0.24 * grain);
}

/** Soft airborne grime: dust and pollution settling in blotches. */
float grime(vec2 uv, float freq, float seed) {
  float a = pfbm01(pwarp(uv, vec2(freq * 0.5), 0.25, seed), vec2(freq), 4, 0.55, seed);
  float b = pfbm01(uv, vec2(freq * 5.0), 3, 0.5, seed + 8.8);
  return clamp(a * 0.75 + b * 0.25, 0.0, 1.0);
}

/**
 * Water running down a wall: narrow vertical streaks that fade with distance
 * below their source line, modulated so only part of the wall streaks.
 * 'sources' is the number of runs per tile height.
 */
float dripStains(vec2 uv, float sources, float length_, float seed) {
  float band = fract(uv.y * sources);
  float fall = exp(-band / max(length_, 1e-3));
  float across = pfbm01(uv, vec2(26.0, 2.0), 4, 0.6, seed);
  float across2 = pfbm01(uv, vec2(70.0, 4.0), 3, 0.5, seed + 4.1);
  float mask = smoothstep(0.45, 0.85, across * 0.7 + across2 * 0.3);
  float where = smoothstep(0.35, 0.7, pfbm01(uv, vec2(3.0, 2.0), 3, 0.5, seed + 21.0));
  return clamp(fall * mask * where, 0.0, 1.0);
}

/** Dust and fines settling into low areas; returns 0..1 coverage. */
float dustFill(float height, float level, float softness, float variation) {
  return clamp(smoothstep(level + softness, level - softness, height) * variation, 0.0, 1.0);
}

/**
 * Largest base frequency an 'octaves'-deep fBm can use and still resolve. The top
 * octave sits at 2^(octaves-1) times the base, and past about four texels per
 * cycle a directional pattern stops being lines: it becomes a shimmering
 * checkerboard, and two such fields beat against each other into a basket weave.
 * Detail finer than this bound belongs in the shared detail normal, which tiles
 * far denser than the baked one. Broadband grain (pgrain and friends) is
 * deliberately near-texel and is not routed through here.
 *
 * BAKE_RES is a literal rather than the uRes uniform because this header is also
 * pulled into the resolve pass, which declares its uniforms after it.
 */
#ifdef BAKE_RES
float fCap(float f, int octaves) {
  return min(f, float(BAKE_RES) * 0.25 / exp2(float(octaves - 1)));
}
#else
float fCap(float f, int octaves) { return f; }
#endif
float fCap(float f) { return fCap(f, 1); }

/**
 * Long thin scratches running at a shallow angle to everything else on the
 * surface. Returns 0..1 where 1 is the scratch centreline.
 */
float scratches(vec2 uv, float freq, float thin, float seed) {
  vec2 p = shear(uv, 3.0);
  float n = pfbm01(p, vec2(fCap(freq, 3), 3.0), 3, 0.5, seed);
  float lines = smoothstep(thin, thin * 0.2, abs(n - 0.5));
  float gaps = smoothstep(0.4, 0.75, pfbm01(uv, vec2(5.0, 3.0), 3, 0.5, seed + 13.3));
  return lines * gaps;
}

/** Fine machining / brushing striation, 0..1, elongated along v. */
float striation(vec2 uv, float freq, float seed) {
  float a = pfbm01(uv, vec2(fCap(freq, 3), 2.0), 3, 0.5, seed);
  float b = pfbm01(uv, vec2(fCap(freq * 3.0, 2), 4.0), 2, 0.5, seed + 7.1);
  return clamp(a * 0.65 + b * 0.35, 0.0, 1.0);
}

/**
 * Exposed aggregate: small stones sitting in a matrix, with pits where stones
 * have popped out. Returns height contribution and writes the stone mask.
 */
float aggregate(vec2 uv, float freq, float seed, out float stone, out float id) {
  float h;
  vec2 rel;
  pstones(uv, vec2(freq), 0.42, seed, h, id, rel);
  stone = smoothstep(0.25, 0.6, h);
  float pit = pdots(uv, vec2(freq * 0.7), 0.22, 0.3, seed + 19.0);
  return h * 0.6 - pit * 0.5;
}

/**
 * Plain weave: interlaced warp and weft threads. Returns thread height and
 * writes which thread is on top (0 = weft, 1 = warp) plus the along-thread
 * coordinate for fibre detail.
 */
float weave(vec2 uv, float freq, out float onTop, out vec2 along) {
  vec2 p = uv * freq;
  vec2 c = floor(p);
  vec2 f = p - c;
  onTop = mod(c.x + c.y, 2.0);
  // Each thread is a half-cylinder; the one on top gets the full height.
  float warp = 0.5 + 0.5 * cos((f.x - 0.5) * PI);
  float weft = 0.5 + 0.5 * cos((f.y - 0.5) * PI);
  float top = mix(weft, warp, onTop);
  float bottom = mix(warp, weft, onTop) * 0.45;
  along = mix(vec2(f.y, f.x), vec2(f.x, f.y), onTop);
  return mix(bottom, top, 0.72) + 0.12 * pgrain(uv, freq * 6.0, 3.3);
}

/** Stitched seam: a line of thread bumps across the tile. */
float stitchLine(vec2 uv, float y, float pitch, float width, float seed) {
  float d = abs(uv.y - y);
  float band = smoothstep(width, width * 0.3, d);
  // A whole number of stitches per tile, or the seam breaks at the edge.
  float bumps = 0.5 + 0.5 * cos(uv.x * ifreq1(pitch) * TAU);
  return band * (0.55 + 0.45 * bumps);
}

/** Efflorescence / lime bloom: pale mineral salts leaching out of masonry. */
float efflorescence(vec2 uv, float amount, float seed) {
  float f = pfbm01(pwarp(uv, vec2(4.0), 0.3, seed), vec2(7.0), 4, 0.5, seed);
  float g = pfbm01(uv, vec2(28.0), 3, 0.5, seed + 5.5);
  // Same caveat as rustMask: the driving field almost never leaves 0.4..0.6, so
  // the threshold has to sit inside that window to produce anything at all.
  return clamp((f * 0.7 + g * 0.3 - (0.60 - amount * 0.20)) * 12.0, 0.0, 1.0);
}

/** Hard-edged paint chip mask: 1 where paint remains. */
float paintCoverage(vec2 uv, float amount, float edgeBias, float seed) {
  vec2 w = pwarp2(uv, vec2(3.0), 0.22, seed);
  float f = pfbm01(w, vec2(6.0), 5, 0.55, seed);
  float nib = pfbm01(uv, vec2(45.0), 3, 0.5, seed + 17.7);
  float m = f * 0.82 + nib * 0.18 + edgeBias;
  return smoothstep(0.44 - amount * 0.3, 0.52 - amount * 0.3, m);
}

#endif
`;
