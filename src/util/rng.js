// Deterministic pseudo-random numbers. Every procedural asset in the film draws
// from a seeded stream so that a given seed always rebuilds the identical ship,
// dune field or debris cloud -- which is what makes offline frame capture
// reproducible across processes.

const UINT = 4294967296;

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) {
    if (typeof seed === 'string') seed = hashString(seed);
    this.s = (seed >>> 0) || 1;
  }

  // mulberry32
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT;
  }

  float(min = 0, max = 1) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }

  bool(p = 0.5) {
    return this.next() < p;
  }

  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Gaussian via Box-Muller, clamped so a stray tail value can never fling a
  // particle across the map.
  gauss(mean = 0, sd = 1, clamp = 3) {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    let g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    g = Math.max(-clamp, Math.min(clamp, g));
    return mean + g * sd;
  }

  // Uniform point on the unit sphere.
  onSphere(out = { x: 0, y: 0, z: 0 }) {
    const z = this.float(-1, 1);
    const a = this.float(0, Math.PI * 2);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    out.x = r * Math.cos(a);
    out.y = r * Math.sin(a);
    out.z = z;
    return out;
  }

  fork(salt = 0) {
    return new RNG((this.s ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0);
  }
}

export function rng(seed) {
  return new RNG(seed);
}

// --- value noise -----------------------------------------------------------

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function makeNoise2D(seed = 1) {
  const r = new RNG(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const base = new Uint8Array(size);
  for (let i = 0; i < size; i++) base[i] = i;
  r.shuffle(base);
  for (let i = 0; i < size * 2; i++) perm[i] = base[i % size];

  const grad = new Float32Array(size * 2);
  for (let i = 0; i < size; i++) {
    const a = r.float(0, Math.PI * 2);
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }

  function dotGrid(ix, iy, x, y) {
    const idx = perm[(ix & 255) + perm[iy & 255]] & 255;
    return grad[idx * 2] * (x - ix) + grad[idx * 2 + 1] * (y - iy);
  }

  const noise = (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = fade(x - x0);
    const sy = fade(y - y0);
    const n00 = dotGrid(x0, y0, x, y);
    const n10 = dotGrid(x0 + 1, y0, x, y);
    const n01 = dotGrid(x0, y0 + 1, x, y);
    const n11 = dotGrid(x0 + 1, y0 + 1, x, y);
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
  };

  noise.fbm = (x, y, octaves = 4, lacunarity = 2, gain = 0.5) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let fx = x;
    let fy = y;
    for (let i = 0; i < octaves; i++) {
      sum += noise(fx, fy) * amp;
      norm += amp;
      amp *= gain;
      fx *= lacunarity;
      fy *= lacunarity;
    }
    return sum / norm;
  };

  noise.ridged = (x, y, octaves = 4) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let fx = x;
    let fy = y;
    for (let i = 0; i < octaves; i++) {
      sum += (1 - Math.abs(noise(fx, fy))) * amp;
      norm += amp;
      amp *= 0.5;
      fx *= 2;
      fy *= 2;
    }
    return sum / norm;
  };

  return noise;
}
