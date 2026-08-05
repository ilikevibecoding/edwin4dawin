// Deterministic pseudo-random utilities. Every stochastic decision in the game
// routes through an RNG instance so a seed fully reproduces a run for tests.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) {
    this.reseed(seed);
  }

  reseed(seed) {
    const s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    // splitmix32 state expansion keeps low-entropy seeds well distributed.
    this.s = (s === 0 ? 0x9e3779b9 : s) >>> 0;
    this._spare = null;
    for (let i = 0; i < 4; i++) this.next();
    return this;
  }

  next() {
    this.s = (this.s + 0x9e3779b9) | 0;
    let z = this.s;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aaad);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return (z >>> 0) / 4294967296;
  }

  range(a, b) {
    return a + (b - a) * this.next();
  }

  int(a, b) {
    return Math.floor(this.range(a, b + 1 - 1e-9));
  }

  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }

  chance(p) {
    return this.next() < p;
  }

  pick(arr) {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  gauss(mean = 0, sd = 1) {
    if (this._spare !== null) {
      const v = this._spare;
      this._spare = null;
      return mean + sd * v;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = this.next() * 2 - 1;
      v = this.next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    this._spare = v * m;
    return mean + sd * u * m;
  }

  /** Independent child stream so one subsystem cannot desync another. */
  fork(label) {
    return new RNG((hashString(label) ^ Math.imul(this.s, 0x85ebca6b)) >>> 0);
  }
}

export const rng = new RNG(1);
