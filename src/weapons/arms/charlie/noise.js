/**
 * Small deterministic noise toolkit for the procedural glove / sleeve textures and the sleeve wrinkle field.
 * All functions are pure and allocation-free so they can be called millions of times during texture bakes.
 */

const PERM = new Uint8Array(512);
(function seedPermutation() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 0x2545f491;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const GX = [1, -1, 1, -1, 1, -1, 0, 0];
const GY = [1, 1, -1, -1, 0, 0, 1, -1];

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

function grad(ix, iy, dx, dy) {
  const h = PERM[(PERM[ix & 255] + iy) & 255] & 7;
  return GX[h] * dx + GY[h] * dy;
}

/**
 * Periodic 2D gradient noise in roughly [-1, 1]. `px` / `py` are integer periods (the lattice wraps), so
 * sampling x in [0, px) and y in [0, py) yields a seamlessly tileable field.
 */
export function pnoise(x, y, px, py) {
  let xi = Math.floor(x);
  let yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  xi = ((xi % px) + px) % px;
  yi = ((yi % py) + py) % py;
  const xi1 = (xi + 1) % px;
  const yi1 = (yi + 1) % py;
  const u = fade(xf);
  const v = fade(yf);
  const n00 = grad(xi, yi, xf, yf);
  const n10 = grad(xi1, yi, xf - 1, yf);
  const n01 = grad(xi, yi1, xf, yf - 1);
  const n11 = grad(xi1, yi1, xf - 1, yf - 1);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.4142;
}

/** Fractal sum of `pnoise` with power-of-two lacunarity so every octave stays periodic. */
export function fbm(x, y, px, py, octaves = 4, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * pnoise(x * freq, y * freq, px * freq, py * freq);
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

/** Ridged variant: creases where the noise crosses zero (1 at the ridge, 0 far away). */
export function ridged(x, y, px, py, octaves = 3) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(pnoise(x * freq, y * freq, px * freq, py * freq));
    sum += amp * n * n;
    norm += amp;
    amp *= 0.55;
    freq *= 2;
  }
  return sum / norm;
}

/** Integer hash → [0, 1). */
export function hash2(ix, iy) {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const mix = lerp;
