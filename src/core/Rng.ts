/**
 * Deterministic PRNG. Owner: Opus 1.
 *
 * Simulation code must never call Math.random(); every stochastic system draws from a named
 * stream so a given seed reproduces a run exactly. Cosmetic-only jitter that never feeds back
 * into gameplay may use a separate `cosmetic` stream.
 */

/** mulberry32 - small, fast, good enough distribution for gameplay noise. */
export class Rng {
  private s: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.s = this.seed || 0x9e3779b9;
  }

  reset(): void {
    this.s = this.seed || 0x9e3779b9;
  }

  /** [0,1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.range(minInclusive, maxExclusive));
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  /** Symmetric random in [-a, a]. */
  spread(a: number): number {
    return (this.next() * 2 - 1) * a;
  }

  /** Approximate standard normal via Irwin-Hall; cheap and bounded. */
  gaussian(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.1547;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }
}

/** Named RNG streams so unrelated systems cannot desynchronise each other. */
export class RngStreams {
  private readonly streams = new Map<string, Rng>();
  private baseSeed: number;

  constructor(baseSeed = 0x4e53_5452) {
    this.baseSeed = baseSeed >>> 0;
  }

  get(name: string): Rng {
    let r = this.streams.get(name);
    if (!r) {
      r = new Rng(hashString(name) ^ this.baseSeed);
      this.streams.set(name, r);
    }
    return r;
  }

  /** Re-seed every stream, used on mission restart for a clean deterministic retry. */
  reseed(baseSeed: number): void {
    this.baseSeed = baseSeed >>> 0;
    this.streams.clear();
  }

  resetAll(): void {
    for (const r of this.streams.values()) r.reset();
  }
}

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
