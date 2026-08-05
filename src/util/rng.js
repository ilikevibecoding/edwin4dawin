/**
 * Deterministic random number generation.
 *
 * Every random decision in the sim routes through one of these generators so a
 * given seed always replays the same scenario. Tests pin the seed; normal play
 * uses a fresh one per run to get the "slightly different every time" variety.
 */

/** mulberry32 - small, fast, good enough distribution for gameplay + visuals. */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.seed = seed;
  return rng;
}

/** Hash a string into a 32-bit seed (used for named sub-streams). */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Wrap a base rng with convenience samplers. */
export class Random {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this.next = makeRng(this.seed);
  }
  reseed(seed) {
    this.seed = seed >>> 0;
    this.next = makeRng(this.seed);
    return this;
  }
  /** Named deterministic sub-stream, independent of call ordering elsewhere. */
  stream(name) {
    return new Random((this.seed ^ hashSeed(name)) >>> 0);
  }
  float(min = 0, max = 1) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  bool(p = 0.5) { return this.next() < p; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  /** Approximate normal distribution via averaged uniforms (cheap, bounded). */
  gauss(mean = 0, sd = 1) {
    const u = this.next() + this.next() + this.next() + this.next() - 2;
    return mean + u * sd * 0.8660254;
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export const globalRng = new Random(1337);
