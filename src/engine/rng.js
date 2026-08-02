/**
 * Deterministic randomness.
 *
 * The whole film must be a pure function of time so that any frame can be
 * rendered in isolation (the offline renderer shards the timeline across
 * parallel browser workers). Nothing may call Math.random().
 */

/** Small fast seedable PRNG. Returns a function producing floats in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience wrapper with range helpers. */
export class Rng {
  constructor(seed = 1) {
    this.next = mulberry32(seed);
  }
  float(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
  /** Gaussian-ish via sum of uniforms. */
  gauss(mean = 0, sd = 1) {
    const u = this.next() + this.next() + this.next() - 1.5;
    return mean + u * 1.1547 * sd;
  }
}

/**
 * Stateless hash noise: pure function of an integer index (and optional salt).
 * Use inside update() where per-frame determinism matters.
 */
export function hash11(n, salt = 0) {
  let h = (n | 0) * 374761393 + (salt | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 1-D value noise, continuous in x. Pure. */
export function noise1(x, salt = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash11(i, salt);
  const b = hash11(i + 1, salt);
  return a + (b - a) * s;
}

/** Sum of octaves of noise1, roughly in [0,1]. */
export function fbm1(x, octaves = 3, salt = 0) {
  let v = 0;
  let amp = 0.5;
  let sum = 0;
  for (let o = 0; o < octaves; o++) {
    v += noise1(x, salt + o * 97) * amp;
    sum += amp;
    x *= 2.03;
    amp *= 0.5;
  }
  return v / sum;
}
