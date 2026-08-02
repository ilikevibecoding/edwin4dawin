/**
 * Deterministic, seedable pseudo-random numbers.
 *
 * Every procedural asset and effect in the project pulls from a named stream so
 * that a given build always produces byte-identical geometry and particle
 * layouts. That makes visual regressions reproducible between QA runs.
 */

/** 32-bit mixer used to turn a human readable stream name into a seed. */
export function hashSeed(name: string, salt = 0x9e3779b9): number {
  let h = salt >>> 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  private state: number;
  readonly seed: number;

  constructor(seed: number | string) {
    this.seed = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
    this.state = this.seed || 0x2f6e2b1;
  }

  /** Uniform in [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1 - 1e-9));
  }

  /** Symmetric uniform in [-a, a]. */
  spread(a: number): number {
    return (this.next() * 2 - 1) * a;
  }

  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  /** Approximately normal distribution (sum of 3 uniforms), mean 0, sd ~1. */
  gaussian(): number {
    return (this.next() + this.next() + this.next() - 1.5) * 1.1547;
  }

  /** A fresh, independent stream derived from this one. */
  fork(name: string): Rng {
    return new Rng(hashSeed(name, this.state));
  }

  reset(): void {
    this.state = this.seed || 0x2f6e2b1;
  }
}

/** Global project seed. Change it to reshuffle every procedural detail at once. */
export const PROJECT_SEED = 0x5741524d; // "SWARM"

const streams = new Map<string, Rng>();

/** Fetch (and memoise) a named deterministic stream. */
export function rng(name: string): Rng {
  let r = streams.get(name);
  if (!r) {
    r = new Rng(hashSeed(name, PROJECT_SEED));
    streams.set(name, r);
  }
  return r;
}

/** A fresh stream that is never memoised — for per-instance generation. */
export function freshRng(name: string): Rng {
  return new Rng(hashSeed(name, PROJECT_SEED));
}
