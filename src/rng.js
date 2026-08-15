/** Deterministic procedural RNG. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(ix, iy) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise2(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm2(x, y, octaves = 5, lacunarity = 2, gain = 0.5) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq);
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum / norm;
}

export function ridged2(x, y, octaves = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise2(x * freq, y * freq) * 2 - 1);
    sum += amp * n;
    norm += amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum / norm;
}

export class Seeded {
  constructor(seed = 0x4e7e41d) {
    this.rand = mulberry32(seed);
  }

  next() {
    return this.rand();
  }

  range(a, b) {
    return a + (b - a) * this.rand();
  }

  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }

  pick(arr) {
    return arr[Math.floor(this.rand() * arr.length)];
  }

  signed() {
    return this.rand() * 2 - 1;
  }
}

export const GLOBAL_SEED = 0x4e7e41d;
