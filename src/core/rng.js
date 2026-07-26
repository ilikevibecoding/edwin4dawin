// Deterministic RNG. All gameplay randomness must route through `rng` so
// automated tests behave identically run to run. Visual generators (textures)
// use their own seeded instances so world cosmetics never consume sim entropy.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = 1337) { this.reseed(seed); }
  reseed(seed) { this._seed = seed; this._f = mulberry32(seed); }
  random() { return this._f(); }
  range(a, b) { return a + (b - a) * this._f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.min(arr.length - 1, Math.floor(this._f() * arr.length))]; }
  chance(p) { return this._f() < p; }
  gauss() { // approx normal, deterministic
    return (this._f() + this._f() + this._f() + this._f() - 2) / 2;
  }
}

// Global sim RNG (seeded at boot; tests pass ?seed=)
export const rng = new Rng(1337);
// Stable world-cosmetics RNG (fixed seed: identical world every run)
export const worldRng = new Rng(20260101);
