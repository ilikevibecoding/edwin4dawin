/**
 * Deterministic seeded randomness.
 *
 * Every procedural asset, particle burst and greeble field draws from a named
 * stream so that a given build always produces byte-identical geometry and the
 * same visual bug can be reproduced from a screenshot.
 */

/** mulberry32 - small, fast, good enough distribution for art direction. */
export class Rng {
  private state: number;
  readonly seed: number;

  constructor(seed: number | string) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this.state = this.seed || 0x9e3779b9;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1 - 1e-9));
  }

  /** Symmetric around zero. */
  signed(magnitude = 1): number {
    return (this.next() * 2 - 1) * magnitude;
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  /** Independent child stream - keeps sub-systems from disturbing each other. */
  fork(label: string): Rng {
    return new Rng(hashString(`${this.seed}:${label}`));
  }
}

export function hashString(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stateless hash noise - lets deterministic per-time effects (sparks, shake,
 * flicker) be evaluated as a pure function of an index without carrying state,
 * which is what makes timeline scrubbing reproducible.
 */
export function hash11(n: number): number {
  let x = Math.sin(n * 127.1) * 43758.5453123;
  x -= Math.floor(x);
  return x;
}

export function hash21(x: number, y: number): number {
  let v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  v -= Math.floor(v);
  return v;
}

/** Smooth 1D value noise built on hash11 - used for drift, sway and shake. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash11(i);
  const b = hash11(i + 1);
  return (a + (b - a) * u) * 2 - 1;
}

/** Two octaves of value noise, still cheap and still deterministic. */
export function fbm1(x: number): number {
  return noise1(x) * 0.65 + noise1(x * 2.13 + 17.3) * 0.35;
}

/** The single global seed for the whole production. */
export const MASTER_SEED = 'starfall-1977';
export const rootRng = new Rng(MASTER_SEED);
