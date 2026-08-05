// Seeded deterministic RNG (mulberry32) so Playwright runs are repeatable.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }
  reseed(seed) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }
  /** float in [0,1) */
  next() { return this._next(); }
  /** float in [min,max) */
  range(min, max) { return min + (max - min) * this._next(); }
  /** int in [min,max] inclusive */
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
  sign() { return this._next() < 0.5 ? -1 : 1; }
  gauss(mean = 0, std = 1) {
    // Box-Muller
    const u = Math.max(this._next(), 1e-9);
    const v = this._next();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** derive an independent stream (e.g. per-subsystem) */
  fork(tag = 0) { return new RNG((this.seed ^ (tag * 2654435761)) >>> 0); }
}
