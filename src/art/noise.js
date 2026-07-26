// Tileable value/gradient noise used by every procedural texture. Everything is
// seeded so the generated art is byte-identical between runs, which is what
// lets the Playwright screenshot comparisons mean anything.

import { mulberry32 } from '../core/rng.js';

function makePermutation(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = base[i];
    base[i] = base[j];
    base[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

/** Periodic 2D gradient noise in [-1,1] that tiles every `period` units. */
export function makeNoise2D(seed = 1) {
  const perm = makePermutation(seed);
  const grad = (hash, x, y) => {
    switch (hash & 7) {
      case 0: return x + y;
      case 1: return x - y;
      case 2: return -x + y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  return function noise(x, y, period = 256) {
    const wrap = (v) => ((v % period) + period) % period;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = wrap(xi) & 255, y0 = wrap(yi) & 255;
    const x1 = wrap(xi + 1) & 255, y1 = wrap(yi + 1) & 255;
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[x0] + y0];
    const ab = perm[perm[x0] + y1];
    const ba = perm[perm[x1] + y0];
    const bb = perm[perm[x1] + y1];
    const n0 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const n1 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(n0, n1, v);
  };
}

/** Fractal brownian motion built on the tileable noise above. */
export function makeFbm(seed = 1, { octaves = 4, lacunarity = 2, gain = 0.5 } = {}) {
  const n = makeNoise2D(seed);
  return function fbm(x, y, period = 64) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * n(x * freq, y * freq, period * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  };
}

/** Tileable Worley/cellular noise. Returns distance to nearest feature point. */
export function makeWorley(seed = 1, cells = 8) {
  const rnd = mulberry32(seed);
  const pts = [];
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      pts.push([cx + rnd(), cy + rnd()]);
    }
  }
  return function worley(u, v) {
    const x = u * cells;
    const y = v * cells;
    let best = Infinity;
    let second = Infinity;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = ((cx + ox) % cells + cells) % cells;
        const gy = ((cy + oy) % cells + cells) % cells;
        const p = pts[gy * cells + gx];
        const px = p[0] + (cx + ox - gx);
        const py = p[1] + (cy + oy - gy);
        const d = Math.hypot(px - x, py - y);
        if (d < best) {
          second = best;
          best = d;
        } else if (d < second) second = d;
      }
    }
    return { f1: best / cells, f2: second / cells, edge: (second - best) / cells };
  };
}

/** Directional streak noise, used for brushed metal and dirt runs. */
export function makeStreak(seed = 1, stretch = 24) {
  const fbm = makeFbm(seed, { octaves: 3 });
  return (x, y, period = 64) => fbm(x * stretch, y, period);
}
