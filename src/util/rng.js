/**
 * Deterministic pseudo random numbers.
 *
 * Every gameplay system draws from a seeded stream so that a scenario can be
 * replayed frame-for-frame in tests, while still feeling varied for a player
 * (the seed is randomised at runtime unless `?seed=` is supplied).
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed = 1) {
    this.reseed(seed);
  }

  reseed(seed) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this._next = mulberry32(this.seed);
    return this;
  }

  /** Uniform in [0,1). */
  float() {
    return this._next();
  }

  range(min, max) {
    return min + (max - min) * this._next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** Symmetric noise in [-amount, amount]. */
  spread(amount) {
    return (this._next() * 2 - 1) * amount;
  }

  bool(chance = 0.5) {
    return this._next() < chance;
  }

  pick(list) {
    return list[Math.floor(this._next() * list.length) % list.length];
  }

  shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /** Approximately gaussian via the sum of four uniforms. */
  gauss(mean = 0, sigma = 1) {
    const u = this._next() + this._next() + this._next() + this._next() - 2;
    return mean + u * sigma * 0.8660254;
  }

  /** A fresh independent stream, useful for per-system determinism. */
  fork(label = '') {
    return new Rng((this.seed ^ hashString(label + this._next())) >>> 0);
  }
}

export const rng = new Rng(1337);
