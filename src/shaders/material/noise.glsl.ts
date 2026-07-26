/**
 * Procedural noise library, shared by every material bake shader.
 *
 * Design constraint: the `p*` generators are **periodic**. Each takes a
 * frequency in cells-per-tile and wraps its lattice with `mod(cell, freq)`, so
 * as long as the frequency is integral the result tiles exactly across the unit
 * square. Building tileability into the primitives is far cheaper than
 * evaluating 4D noise on a torus and it makes every derived pattern (fBm,
 * warping, Worley, cracks, grids) seamless for free.
 *
 * Non-periodic simplex noise is also provided for the handful of places where
 * seams cannot appear (animated water blending, screen-space detail).
 *
 * Conventions:
 *   - `uv` is the unit tile, 0..1.
 *   - `freq` is a vec2 so patterns can be stretched (wood grain, brushed metal,
 *     water staining) without duplicating the sampling code.
 *   - value/Worley noise returns 0..1, gradient noise -1..1.
 */
export const NOISE_GLSL = /* glsl */ `
#ifndef MAT_NOISE_INCLUDED
#define MAT_NOISE_INCLUDED

#define TAU 6.28318530718
#define PI  3.14159265359

/* ------------------------------- hashing ------------------------------ */

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash23(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

/** Seeded cell hash. Cell coordinates are wrapped before hashing. */
float cellHash(vec2 cell, float seed) {
  return hash21(cell + vec2(seed * 17.13, seed * 5.71));
}

vec2 cellHash2(vec2 cell, float seed) {
  return hash22(cell + vec2(seed * 11.37, seed * 23.19));
}

vec3 cellHash3(vec2 cell, float seed) {
  return hash23(cell + vec2(seed * 7.77, seed * 31.41));
}

/* ------------------------------ helpers ------------------------------- */

/**
 * Periodicity depends on the lattice wrapping an exact whole number of cells
 * across the tile, so every generator snaps its own frequency. Callers derive
 * frequencies from each other constantly ('freq * 0.5', 'freq * 0.7') and a
 * single fractional frequency puts a visible discontinuity down one edge, so
 * this is enforced here rather than trusted to the call sites.
 */
vec2 ifreq(vec2 f) { return max(vec2(1.0), floor(f + 0.5)); }
float ifreq1(float f) { return max(1.0, floor(f + 0.5)); }

float quintic(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
vec2 quintic2(vec2 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 saturateColor(vec3 c, float s) { return mix(vec3(luma(c)), c, s); }

/** Three-stop colour ramp. */
vec3 ramp3(vec3 a, vec3 b, vec3 c, float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0);
}

/** Four-stop colour ramp. */
vec3 ramp4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(a, b, t);
  if (t < 2.0) return mix(b, c, t - 1.0);
  return mix(c, d, t - 2.0);
}

float sharpstep(float edge, float softness, float x) {
  return smoothstep(edge - softness, edge + softness, x);
}

/** Triangle wave, 0..1..0, period 1. */
float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }

vec2 rot2(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

/* ---------------------------- value noise ----------------------------- */

/** Periodic value noise, 0..1. */
float pvalue(vec2 uv, vec2 f_, float seed) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = quintic2(p - i);
  float n00 = cellHash(mod(i, freq), seed);
  float n10 = cellHash(mod(i + vec2(1.0, 0.0), freq), seed);
  float n01 = cellHash(mod(i + vec2(0.0, 1.0), freq), seed);
  float n11 = cellHash(mod(i + vec2(1.0), freq), seed);
  return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
}

/** Non-periodic value noise, for contexts with no seam. */
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = quintic2(p - i);
  float n00 = hash21(i);
  float n10 = hash21(i + vec2(1.0, 0.0));
  float n01 = hash21(i + vec2(0.0, 1.0));
  float n11 = hash21(i + vec2(1.0));
  return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
}

/* -------------------------- gradient noise ---------------------------- */

/** Unit-length gradient from a wrapped cell; isotropic, no lattice bias. */
vec2 cellGrad(vec2 cell, float seed) {
  float a = cellHash(cell, seed) * TAU;
  return vec2(cos(a), sin(a));
}

/**
 * Periodic gradient (Perlin) noise with quintic interpolation and unit-circle
 * gradients, roughly -1..1. This is the workhorse; true periodic simplex noise
 * cannot tile the unit square (its lattice is sheared), and unit-gradient
 * Perlin is visually equivalent at these frequencies.
 */
float pgrad(vec2 uv, vec2 f_, float seed) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = quintic2(f);
  float a = dot(cellGrad(mod(i, freq), seed), f);
  float b = dot(cellGrad(mod(i + vec2(1.0, 0.0), freq), seed), f - vec2(1.0, 0.0));
  float c = dot(cellGrad(mod(i + vec2(0.0, 1.0), freq), seed), f - vec2(0.0, 1.0));
  float d = dot(cellGrad(mod(i + vec2(1.0), freq), seed), f - vec2(1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.41;
}

/** Periodic gradient noise remapped to 0..1. */
float pgrad01(vec2 uv, vec2 freq, float seed) {
  return pgrad(uv, freq, seed) * 0.5 + 0.5;
}

/* --------------------------- simplex noise ---------------------------- */

/**
 * Classic 2D simplex noise (Gustavson/McEwan), -1..1. Not periodic: use only
 * where a seam cannot be seen, e.g. time-varying water detail.
 */
vec3 permute289(vec3 x) { return mod((x * 34.0 + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute289(permute289(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float sfbm(vec2 p, int octaves) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * snoise(p);
    norm += amp;
    amp *= 0.5;
    p *= 2.0;
  }
  return sum / max(norm, 1e-4);
}

/* ------------------------------- fractals ----------------------------- */

float pfbm(vec2 uv, vec2 freq, int octaves, float gain, float seed) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * pgrad(uv, f, seed + float(i) * 13.7);
    norm += amp;
    amp *= gain;
    f *= 2.0;
  }
  return sum / max(norm, 1e-4);
}

/** fBm remapped to 0..1: mottling, staining, blotching. */
float pfbm01(vec2 uv, vec2 freq, int octaves, float gain, float seed) {
  return pfbm(uv, freq, octaves, gain, seed) * 0.5 + 0.5;
}

/** Cheap value-noise fBm, where a soft blotch field is all that is needed. */
float pvfbm(vec2 uv, vec2 freq, int octaves, float gain, float seed) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * pvalue(uv, f, seed + float(i) * 9.31);
    norm += amp;
    amp *= gain;
    f *= 2.0;
  }
  return sum / max(norm, 1e-4);
}

/**
 * Ridged fBm. Peaks form thin creases along the zero set of the underlying
 * noise, which is what cracks, fissures and crazing are made of. 0..1.
 */
float pridged(vec2 uv, vec2 freq, int octaves, float gain, float seed) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float n = 1.0 - abs(pgrad(uv, f, seed + float(i) * 19.3));
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    f *= 2.0;
  }
  return sum / max(norm, 1e-4);
}

/** Billowed fBm (|noise|): lumpy clumping for dirt and cloud-like grime. 0..1 */
float pbillow(vec2 uv, vec2 freq, int octaves, float gain, float seed) {
  float sum = 0.0, amp = 1.0, norm = 0.0;
  vec2 f = freq;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * abs(pgrad(uv, f, seed + float(i) * 7.13));
    norm += amp;
    amp *= gain;
    f *= 2.0;
  }
  return sum / max(norm, 1e-4);
}

/* ---------------------------- domain warping -------------------------- */

/**
 * Offsets uv by a periodic vector field. Because the field is itself periodic,
 * the warped lookup stays seamless.
 */
vec2 pwarp(vec2 uv, vec2 freq, float amount, float seed) {
  float qx = pfbm(uv, freq, 3, 0.5, seed);
  float qy = pfbm(uv, freq, 3, 0.5, seed + 41.7);
  return uv + amount * vec2(qx, qy);
}

/** Two-level warp: the long smeared shapes of trowel marks and rust fronts. */
vec2 pwarp2(vec2 uv, vec2 freq, float amount, float seed) {
  vec2 w = pwarp(uv, freq, amount, seed);
  return pwarp(w, freq * 2.0, amount * 0.45, seed + 77.3);
}

/** Warped fBm, 0..1. */
float pwfbm(vec2 uv, vec2 freq, int octaves, float warp, float seed) {
  return pfbm01(pwarp(uv, freq * 0.5, warp, seed + 5.5), freq, octaves, 0.5, seed);
}

/* ------------------------------- Worley ------------------------------- */

/**
 * Periodic Worley/cellular noise. Returns f1 (nearest feature distance),
 * f2 (second nearest), a per-cell id in 0..1, the vector to the nearest
 * feature point and its wrapped cell coordinate.
 */
void pworley(
  vec2 uv, vec2 f_, float jitter, float seed,
  out float f1, out float f2, out float id, out vec2 rel, out vec2 cellId
) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = p - i;
  f1 = 8.0;
  f2 = 8.0;
  id = 0.0;
  rel = vec2(0.0);
  cellId = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, freq);
      vec2 o = cellHash2(cell, seed);
      vec2 d = g + mix(vec2(0.5), o, jitter) - f;
      float dist = dot(d, d);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        id = cellHash(cell, seed + 3.3);
        rel = d;
        cellId = cell;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);
}

/** Distance to the nearest feature point. */
float pworleyF1(vec2 uv, vec2 freq, float jitter, float seed) {
  float f1, f2, id;
  vec2 rel, cell;
  pworley(uv, freq, jitter, seed, f1, f2, id, rel, cell);
  return f1;
}

/** F2 - F1: dark ridges exactly on the cell boundaries. Crack networks. */
float pworleyEdge(vec2 uv, vec2 freq, float jitter, float seed) {
  float f1, f2, id;
  vec2 rel, cell;
  pworley(uv, freq, jitter, seed, f1, f2, id, rel, cell);
  return f2 - f1;
}

/** Per-cell random value, flat inside each cell. */
float pworleyId(vec2 uv, vec2 freq, float jitter, float seed) {
  float f1, f2, id;
  vec2 rel, cell;
  pworley(uv, freq, jitter, seed, f1, f2, id, rel, cell);
  return id;
}

/**
 * Packed stones: overlapping domes whose radius varies per cell. Returns the
 * dome height 0..1 plus the winning cell's id and centre offset, so callers
 * can tint and shade individual stones.
 */
void pstones(
  vec2 uv, vec2 f_, float radius, float seed,
  out float h, out float id, out vec2 rel
) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = p - i;
  h = 0.0;
  id = 0.0;
  rel = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, freq);
      vec3 hs = cellHash3(cell, seed);
      vec2 d = g + hs.xy - f;
      float r = radius * (0.55 + 0.9 * hs.z);
      float t = 1.0 - clamp(dot(d, d) / max(r * r, 1e-5), 0.0, 1.0);
      float dome = sqrt(t) * (0.7 + 0.5 * hs.z);
      if (dome > h) {
        h = dome;
        id = hs.z;
        rel = d / max(r, 1e-3);
      }
    }
  }
  h = clamp(h, 0.0, 1.0);
}

/**
 * Faceted Worley using a per-cell rotated Chebyshev metric: angular,
 * straight-edged fragments rather than round blobs. Smashed concrete, shards.
 */
void pworleyAngular(
  vec2 uv, vec2 f_, float jitter, float seed,
  out float f1, out float f2, out float id, out vec2 rel
) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = p - i;
  f1 = 8.0;
  f2 = 8.0;
  id = 0.0;
  rel = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, freq);
      vec3 hs = cellHash3(cell, seed);
      vec2 d = g + mix(vec2(0.5), hs.xy, jitter) - f;
      vec2 dr = rot2(d, hs.z * TAU);
      float dist = max(abs(dr.x), abs(dr.y)) * 0.8 + length(d) * 0.2;
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        id = hs.z;
        rel = dr;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }
}

/* ------------------------------ patterns ------------------------------ */

/** Sparse round dots: dome height of the nearest dot, 0..1. */
float pdots(vec2 uv, vec2 f_, float density, float radius, float seed) {
  vec2 freq = ifreq(f_);
  vec2 p = uv * freq;
  vec2 i = floor(p);
  vec2 f = p - i;
  float best = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, freq);
      vec3 hs = cellHash3(cell, seed);
      if (hs.z > density) continue;
      vec2 d = g + hs.xy - f;
      float r = radius * (0.6 + 0.8 * fract(hs.z * 31.7));
      float t = 1.0 - clamp(length(d) / max(r, 1e-3), 0.0, 1.0);
      best = max(best, t * t * (3.0 - 2.0 * t));
    }
  }
  return best;
}

/** White-noise grain at texel scale: the finest tier of surface detail. */
float pgrain(vec2 uv, float freq, float seed) {
  return hash21(floor(uv * ifreq1(freq)) + vec2(seed * 3.7, seed * 8.1));
}

/**
 * Thin meandering crack lines, 1 on the centreline. 'width' is in ridge units;
 * smaller is finer. Warping makes the cracks wander instead of following the
 * noise lattice.
 */
float pcracks(vec2 uv, vec2 freq, float width, float warp, int octaves, float seed) {
  vec2 w = pwarp(uv, freq * 0.5, warp, seed + 2.7);
  float r = pridged(w, freq, octaves, 0.55, seed);
  return smoothstep(1.0 - width, 1.0 - width * 0.2, r);
}

/** Anisotropic streaks: long smears along v. Water staining, brushed metal. */
float pstreaks(vec2 uv, float acrossFreq, float alongFreq, int octaves, float seed) {
  return pfbm01(uv, vec2(acrossFreq, alongFreq), octaves, 0.55, seed);
}

/**
 * Regular grid with per-cell ids and border distance: the building block for
 * bricks, planks and tiles.
 *   counts:    cell counts across the tile (must be integral to stay seamless)
 *   rowOffset: fraction each odd row is shifted by (0.5 = running bond)
 * Cell ids are wrapped so a cell straddling the tile edge reads as one cell,
 * which is what makes offset bond patterns tile.
 */
void pgrid(
  vec2 uv, vec2 counts_, float rowOffset,
  out vec2 local, out vec2 cell, out float border
) {
  vec2 counts = ifreq(counts_);
  float row = floor(uv.y * counts.y);
  float shift = mod(row, 2.0) * rowOffset;
  float cx = uv.x * counts.x + shift;
  cell = vec2(mod(floor(cx), counts.x), mod(row, counts.y));
  local = vec2(fract(cx), fract(uv.y * counts.y));
  vec2 e = min(local, 1.0 - local);
  border = min(e.x, e.y);
}

/** Rounded box SDF: tread plate, stencils, bag silhouettes. */
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float sdEllipse(vec2 p, vec2 r) {
  return length(p / r) - 1.0;
}

#endif
`;
