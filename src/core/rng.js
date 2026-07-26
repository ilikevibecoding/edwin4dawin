// Deterministic seeded RNG (mulberry32). All gameplay randomness must come
// from an Rng instance so `advanceTime` produces reproducible runs.
export class Rng {
  constructor(seed = 1337) { this.reseed(seed); }
  reseed(seed) { this.s = seed >>> 0; if (this.s === 0) this.s = 0x9e3779b9; }
  next() {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  pick(arr) { return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))]; }
  chance(p) { return this.next() < p; }
  // Approximate gaussian in [-1,1] (sum of 3 uniforms), good for spread cones.
  gauss() { return ((this.next() + this.next() + this.next()) / 1.5) - 1; }
  angle() { return this.next() * Math.PI * 2; }
}
