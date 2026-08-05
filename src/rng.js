// Seeded deterministic RNG (mulberry32) — gameplay uses a seeded stream so
// Playwright runs are reproducible; visuals use a free-running stream.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1337) { this.fn = mulberry32(seed); }
  reseed(seed) { this.fn = mulberry32(seed); }
  next() { return this.fn(); }
  range(a, b) { return a + (b - a) * this.fn(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.fn() * arr.length) % arr.length]; }
  sign() { return this.fn() < 0.5 ? -1 : 1; }
  chance(p) { return this.fn() < p; }
  gauss(mean = 0, dev = 1) {
    // Box-Muller
    const u = Math.max(this.fn(), 1e-9), v = this.fn();
    return mean + dev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

// 2D value noise for terrain / textures (deterministic, seed-free hash).
export function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

export function valueNoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2(x, y, octaves = 4, lac = 2.0, gain = 0.5) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq);
    norm += amp;
    amp *= gain; freq *= lac;
  }
  return sum / norm;
}
