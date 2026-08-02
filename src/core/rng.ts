/**
 * Deterministic pseudo-random number generation.
 *
 * Every procedural asset in this project draws from a named, seeded stream so
 * that a given build always produces byte-identical geometry. That property is
 * what makes the visual QA tour meaningful: a screenshot regression is a real
 * regression, not noise.
 */

/** 32-bit integer hash (Thomas Wang / MurmurHash3 finalizer variant). */
export function hashInt(x: number): number {
  let h = x | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash an arbitrary string into a 32-bit seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return hashInt(h);
}

/** Small, fast, well-distributed 32-bit PRNG (mulberry32). */
export class Rng {
  private state: number;
  readonly seed: number;

  constructor(seed: number | string) {
    this.seed = typeof seed === 'string' ? hashString(seed) : hashInt(seed);
    this.state = this.seed || 1;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Random element of an array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  /** Approximately normal deviate (sum of three uniforms), mean 0, sd ~1. */
  normal(): number {
    return (this.next() + this.next() + this.next() - 1.5) * 1.4142;
  }

  /** A derived, independently-seeded stream. Keeps subsystems decoupled. */
  fork(label: string): Rng {
    return new Rng(hashInt(this.seed ^ hashString(label)));
  }

  reset(): void {
    this.state = this.seed || 1;
  }
}

/** The project-wide root seed. Change it to reroll every procedural detail. */
export const ROOT_SEED = 'a-stolen-secret/1977';

/** Create a named stream off the project root seed. */
export function stream(label: string): Rng {
  return new Rng(`${ROOT_SEED}#${label}`);
}

/* --------------------------------------------------------------------------
   Value noise — used for hull weathering, planet surface and dust layers.
   -------------------------------------------------------------------------- */

function valueHash2(x: number, y: number, seed: number): number {
  return hashInt(Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** 2D value noise in [0,1). */
export function noise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = valueHash2(xi, yi, seed);
  const b = valueHash2(xi + 1, yi, seed);
  const c = valueHash2(xi, yi + 1, seed);
  const d = valueHash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
}

/** Fractal Brownian motion over `noise2`. Returns roughly [0,1). */
export function fbm2(x: number, y: number, octaves = 4, seed = 0, lacunarity = 2, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 1013);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
