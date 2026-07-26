/**
 * noise.ts — deterministic, allocation-free procedural noise primitives.
 *
 * Everything here is a pure free function seeded by an integer. No permutation
 * tables are built per-seed (an inline 32-bit integer hash is used instead), so
 * calls are cheap and fully reproducible: same (coords, seed) ⇒ same value.
 *
 * TILING: every basis has a *seamlessly tileable* variant suffixed `Tile`. These
 * take coordinates in tile-space [0,1) and an integer `freq` (feature cells per
 * tile). Tiling is achieved by wrapping the integer lattice by the period
 * (toroidal sampling) — NOT by mirroring or cross-fading, so there is no
 * ghosting. Because octaves multiply the frequency by an integer `lacunarity`,
 * every octave stays period-aligned and the sum tiles exactly.
 */

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

export const TAU = Math.PI * 2;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Quintic fade curve (C2 continuous) used by gradient noise. */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ---------------------------------------------------------------------------
// Integer hashing
// ---------------------------------------------------------------------------

/** 32-bit integer hash of a 2D lattice coordinate. Returns an unsigned int. */
export function ihash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x1f1f1f1f) ^ Math.imul(y | 0, 0x7f4a7c15) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash of a 2D lattice coordinate → float in [0,1). */
export function hash2(x: number, y: number, seed: number): number {
  return ihash2(x, y, seed) / 4294967296;
}

/** Hash of a single integer → float in [0,1). */
export function hash1(x: number, seed: number): number {
  return ihash2(x, 0, seed) / 4294967296;
}

// ---------------------------------------------------------------------------
// Gradient noise (Perlin), periodic and non-periodic
// ---------------------------------------------------------------------------

// 16 unit gradient directions — a small pure lookup table avoids per-sample trig.
const GRAD2: Float32Array = (() => {
  const g = new Float32Array(32);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g[i * 2] = Math.cos(a);
    g[i * 2 + 1] = Math.sin(a);
  }
  return g;
})();

function gdot(hash: number, x: number, y: number): number {
  const gi = (hash & 15) << 1;
  return GRAD2[gi] * x + GRAD2[gi + 1] * y;
}

function wrap(i: number, period: number): number {
  const m = i % period;
  return m < 0 ? m + period : m;
}

/** Periodic Perlin gradient noise. Output ≈ [-1, 1]. Tiles with `period` cells. */
export function perlin2p(x: number, y: number, period: number, seed: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const xf = x - X;
  const yf = y - Y;
  const x0 = wrap(X, period);
  const x1 = wrap(X + 1, period);
  const y0 = wrap(Y, period);
  const y1 = wrap(Y + 1, period);
  const u = fade(xf);
  const v = fade(yf);
  const n00 = gdot(ihash2(x0, y0, seed), xf, yf);
  const n10 = gdot(ihash2(x1, y0, seed), xf - 1, yf);
  const n01 = gdot(ihash2(x0, y1, seed), xf, yf - 1);
  const n11 = gdot(ihash2(x1, y1, seed), xf - 1, yf - 1);
  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);
  return lerp(nx0, nx1, v) * 1.4;
}

const BIG_PERIOD = 8192;

/** Non-periodic Perlin gradient noise. Output ≈ [-1, 1]. */
export function perlin2(x: number, y: number, seed: number): number {
  return perlin2p(x, y, BIG_PERIOD, seed);
}

/**
 * Periodic Perlin with independent X/Y periods — enables anisotropic (stretched)
 * features (brushed metal, wood grain, corrugation) that still tile exactly.
 */
export function perlin2pxy(
  x: number,
  y: number,
  perX: number,
  perY: number,
  seed: number
): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const xf = x - X;
  const yf = y - Y;
  const x0 = wrap(X, perX);
  const x1 = wrap(X + 1, perX);
  const y0 = wrap(Y, perY);
  const y1 = wrap(Y + 1, perY);
  const u = fade(xf);
  const v = fade(yf);
  const n00 = gdot(ihash2(x0, y0, seed), xf, yf);
  const n10 = gdot(ihash2(x1, y0, seed), xf - 1, yf);
  const n01 = gdot(ihash2(x0, y1, seed), xf, yf - 1);
  const n11 = gdot(ihash2(x1, y1, seed), xf - 1, yf - 1);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.4;
}

/**
 * Anisotropic tileable fBm. `fx`,`fy` are integer base frequencies per axis;
 * both scale by integer `lacunarity` each octave, preserving tiling.
 * Output ≈ [-1, 1].
 */
export function fbm2TileAniso(
  x: number,
  y: number,
  fx: number,
  fy: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  let amp = 1;
  let ax = Math.max(1, Math.round(fx));
  let ay = Math.max(1, Math.round(fy));
  const lac = Math.max(2, Math.round(lacunarity));
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * perlin2pxy(x * ax, y * ay, ax, ay, seed + o * 1619);
    norm += amp;
    amp *= gain;
    ax *= lac;
    ay *= lac;
  }
  return norm > 0 ? sum / norm : 0;
}

// ---------------------------------------------------------------------------
// Value noise (softer, used for colour mottling)
// ---------------------------------------------------------------------------

/** Periodic value noise. Output in [0,1]. */
export function value2p(x: number, y: number, period: number, seed: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const xf = x - X;
  const yf = y - Y;
  const x0 = wrap(X, period);
  const x1 = wrap(X + 1, period);
  const y0 = wrap(Y, period);
  const y1 = wrap(Y + 1, period);
  const u = fade(xf);
  const v = fade(yf);
  const c00 = hash2(x0, y0, seed);
  const c10 = hash2(x1, y0, seed);
  const c01 = hash2(x0, y1, seed);
  const c11 = hash2(x1, y1, seed);
  return lerp(lerp(c00, c10, u), lerp(c01, c11, u), v);
}

// ---------------------------------------------------------------------------
// fBm (fractal Brownian motion)
// ---------------------------------------------------------------------------

/**
 * Standard (non-tileable) fBm. Output roughly in [-1, 1].
 * Matches the required public signature.
 */
export function fbm2(
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * perlin2(x * freq, y * freq, seed + o * 1619);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

/**
 * Seamlessly tileable fBm. `x,y` in tile-space [0,1); `freq` = integer base cells
 * per tile; `lacunarity` MUST be an integer (2 or 3) to preserve tiling.
 * Output roughly in [-1, 1].
 */
export function fbm2Tile(
  x: number,
  y: number,
  freq: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  let amp = 1;
  let f = Math.max(1, Math.round(freq));
  const lac = Math.max(2, Math.round(lacunarity));
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * perlin2p(x * f, y * f, f, seed + o * 1619);
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Tileable fBm remapped to [0,1]. */
export function fbm2Tile01(
  x: number,
  y: number,
  freq: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  return clamp01(fbm2Tile(x, y, freq, octaves, lacunarity, gain, seed) * 0.5 + 0.5);
}

// ---------------------------------------------------------------------------
// Ridged multifractal (sharp crests — cracks, rock, mountains)
// ---------------------------------------------------------------------------

/** Non-tileable ridged fBm. Output in [0,1]; crests near 1. */
export function ridged2(
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  let prev = 1;
  for (let o = 0; o < octaves; o++) {
    let n = perlin2(x * freq, y * freq, seed + o * 2113);
    n = 1 - Math.abs(n);
    n *= n;
    n *= prev;
    prev = n;
    sum += n * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return norm > 0 ? clamp01(sum / norm) : 0;
}

/** Seamlessly tileable ridged fBm. `x,y` in [0,1), `freq` integer. Output [0,1]. */
export function ridged2Tile(
  x: number,
  y: number,
  freq: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  seed: number
): number {
  let amp = 0.5;
  let f = Math.max(1, Math.round(freq));
  const lac = Math.max(2, Math.round(lacunarity));
  let sum = 0;
  let norm = 0;
  let prev = 1;
  for (let o = 0; o < octaves; o++) {
    let n = perlin2p(x * f, y * f, f, seed + o * 2113);
    n = 1 - Math.abs(n);
    n *= n;
    n *= prev;
    prev = n;
    sum += n * amp;
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return norm > 0 ? clamp01(sum / norm) : 0;
}

// ---------------------------------------------------------------------------
// Worley / cellular (Voronoi) noise
// ---------------------------------------------------------------------------

export interface WorleyResult {
  /** Distance to nearest feature point (cell units). */
  f1: number;
  /** Distance to 2nd-nearest feature point (cell units). */
  f2: number;
  /** Stable id of the nearest cell (integer, well-distributed). */
  id: number;
}

const _worley: WorleyResult = { f1: 0, f2: 0, id: 0 };

/**
 * Non-tileable Worley noise. `cells` = grid density (feature points per unit).
 * Returns a shared mutable result object (do not retain).
 */
export function worley2(x: number, y: number, cells: number, seed: number): WorleyResult {
  return worley2p(x, y, cells, BIG_PERIOD, seed);
}

/**
 * Seamlessly tileable Worley noise. `x,y` in tile-space [0,1); `cells` = integer
 * cells per tile (this is also the wrap period). Feature points are jittered
 * within their cell; cell coordinates wrap by `cells` so it tiles exactly.
 */
export function worley2Tile(x: number, y: number, cells: number, seed: number): WorleyResult {
  const c = Math.max(1, Math.round(cells));
  return worley2p(x * c, y * c, 1, c, seed);
}

/**
 * Core cellular evaluator. Coordinates are in cell units; `scale` multiplies the
 * point coordinate (kept 1 for the tile variant), `period` wraps cell indices.
 */
function worley2p(
  px: number,
  py: number,
  scale: number,
  period: number,
  seed: number
): WorleyResult {
  const x = px * scale;
  const y = py * scale;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i;
      const gy = cy + j;
      const wx = wrap(gx, period);
      const wy = wrap(gy, period);
      const h = ihash2(wx, wy, seed);
      const jx = (h & 0xffff) / 65536;
      const jy = ((h >>> 16) & 0xffff) / 65536;
      const fx = gx + jx;
      const fy = gy + jy;
      const dx = fx - x;
      const dy = fy - y;
      const d = dx * dx + dy * dy;
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = h;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  _worley.f1 = Math.sqrt(f1);
  _worley.f2 = Math.sqrt(f2);
  _worley.id = id;
  return _worley;
}

// ---------------------------------------------------------------------------
// Domain warping (organic distortion)
// ---------------------------------------------------------------------------

const _warp: [number, number] = [0, 0];

/** Non-tileable domain warp: returns coordinates displaced by an fBm vector field. */
export function domainWarp2(
  x: number,
  y: number,
  amp: number,
  seed: number
): [number, number] {
  const wx = fbm2(x, y, 4, 2, 0.5, seed);
  const wy = fbm2(x + 5.2, y + 1.3, 4, 2, 0.5, seed + 7919);
  _warp[0] = x + wx * amp;
  _warp[1] = y + wy * amp;
  return _warp;
}

/**
 * Seamlessly tileable domain warp. `x,y` in [0,1). The warp field is periodic, so
 * feeding the result back into any `*Tile` sampler at matching integer frequency
 * preserves tiling. Returns a shared mutable pair (do not retain).
 */
export function domainWarp2Tile(
  x: number,
  y: number,
  freq: number,
  amp: number,
  seed: number
): [number, number] {
  const wx = fbm2Tile(x, y, freq, 3, 2, 0.5, seed);
  const wy = fbm2Tile(x, y, freq, 3, 2, 0.5, seed + 7919);
  _warp[0] = x + wx * amp;
  _warp[1] = y + wy * amp;
  return _warp;
}

// ---------------------------------------------------------------------------
// Curl noise (divergence-free flow — streaks, drips, fibres)
// ---------------------------------------------------------------------------

const _curl: [number, number] = [0, 0];

/**
 * Seamlessly tileable curl of a scalar fBm potential. Returns a divergence-free
 * 2D vector, handy for flow-aligned streaking. Shared mutable pair.
 */
export function curl2Tile(
  x: number,
  y: number,
  freq: number,
  seed: number
): [number, number] {
  const e = 1 / 512;
  const n1 = fbm2Tile(x, y + e, freq, 4, 2, 0.5, seed);
  const n2 = fbm2Tile(x, y - e, freq, 4, 2, 0.5, seed);
  const n3 = fbm2Tile(x + e, y, freq, 4, 2, 0.5, seed);
  const n4 = fbm2Tile(x - e, y, freq, 4, 2, 0.5, seed);
  _curl[0] = (n1 - n2) / (2 * e);
  _curl[1] = -(n3 - n4) / (2 * e);
  return _curl;
}
