/**
 * Deterministic seeded random numbers.
 *
 * Every procedural asset pulls from a named stream so that regenerating one
 * ship cannot shift the noise used by another. Named streams also mean a
 * visual bug can always be reproduced from the same seed.
 */

const MASTER_SEED = 0x5741524d; // arbitrary constant, stable across builds

/** 32-bit string hash (FNV-1a) used to derive per-stream seeds. */
export function hashString(str: string, seed = MASTER_SEED): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  private state: number;
  readonly seed: number;
  readonly name: string;

  constructor(name: string, seed?: number) {
    this.name = name;
    this.seed = seed ?? hashString(name);
    this.state = this.seed >>> 0;
  }

  /** Restart the stream — used when rebuilding assets after a quality change. */
  reset(): void {
    this.state = this.seed >>> 0;
  }

  /** Uniform [0,1). mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.range(minInclusive, maxInclusive + 1 - 1e-9));
  }

  /** Symmetric noise in [-amount, amount]. */
  spread(amount: number): number {
    return (this.next() * 2 - 1) * amount;
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  /** Roughly gaussian via the sum of four uniforms. */
  gaussian(mean = 0, stdev = 1): number {
    const s = this.next() + this.next() + this.next() + this.next() - 2;
    return mean + s * 0.8660254 * stdev;
  }

  /** A derived, independent stream. */
  fork(suffix: string): Rng {
    return new Rng(`${this.name}/${suffix}`, hashString(suffix, this.seed));
  }
}

/** Shared registry so systems can grab a stable stream by name. */
const streams = new Map<string, Rng>();

export function rng(name: string): Rng {
  let s = streams.get(name);
  if (!s) {
    s = new Rng(name);
    streams.set(name, s);
  }
  s.reset();
  return s;
}
