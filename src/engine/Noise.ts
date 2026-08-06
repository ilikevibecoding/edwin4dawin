/**
 * Deterministic, seamlessly-tileable noise used to synthesise every texture in
 * the game. The 2D generators are periodic on an integer lattice so results can
 * be tiled across large surfaces without visible seams.
 */

export function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Periodic value noise. Repeats exactly every `period` units. */
export function valueNoise2D(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const x0 = ((xi % period) + period) % period;
  const y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const u = smootherstep(x - xi);
  const v = smootherstep(y - yi);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Periodic gradient (Perlin-style) noise in [-1,1]. */
export function gradNoise2D(x: number, y: number, period: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = ((xi % period) + period) % period;
  const y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const grad = (gx: number, gy: number, dx: number, dy: number) => {
    const a = hash2(gx, gy, seed) * Math.PI * 2;
    return Math.cos(a) * dx + Math.sin(a) * dy;
  };
  const u = smootherstep(xf);
  const v = smootherstep(yf);
  const n00 = grad(x0, y0, xf, yf);
  const n10 = grad(x1, y0, xf - 1, yf);
  const n01 = grad(x0, y1, xf, yf - 1);
  const n11 = grad(x1, y1, xf - 1, yf - 1);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

export interface FbmOptions {
  octaves?: number;
  period?: number;
  lacunarity?: number;
  gain?: number;
  seed?: number;
  ridged?: boolean;
  turbulence?: boolean;
}

/** Fractal sum of periodic noise; stays tileable as each octave doubles period. */
export function fbm2D(x: number, y: number, opts: FbmOptions = {}): number {
  const {
    octaves = 5,
    period = 8,
    lacunarity = 2,
    gain = 0.5,
    seed = 0,
    ridged = false,
    turbulence = false,
  } = opts;
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  let per = period;
  for (let o = 0; o < octaves; o++) {
    let n = gradNoise2D(x * freq, y * freq, Math.max(1, Math.round(per)), seed + o * 37);
    if (ridged) {
      n = 1 - Math.abs(n);
      n = n * n;
    } else if (turbulence) {
      n = Math.abs(n);
    } else {
      n = n * 0.5 + 0.5;
    }
    sum += n * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
    per *= lacunarity;
  }
  return sum / norm;
}

/** Periodic Worley / cellular noise: distance to the nearest feature point. */
export function worley2D(x: number, y: number, period: number, seed = 0, jitter = 1) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox;
      const cy = yi + oy;
      const wx = ((cx % period) + period) % period;
      const wy = ((cy % period) + period) % period;
      const px = cx + 0.5 + (hash2(wx, wy, seed) * jitter - 0.5);
      const py = cy + 0.5 + (hash2(wx, wy, seed + 991) * jitter - 0.5);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return { f1, f2 };
}

/** Seeded PRNG for repeatable procedural placement. */
export class Rng {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return (this.s & 0xffffff) / 0xffffff;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
