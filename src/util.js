// util.js — seeded RNG, events, pooling, math helpers shared by all modules.

/** Mulberry32 seeded PRNG. Deterministic across runs for gameplay + tests. */
export class Rand {
  constructor(seed = 1) { this.reseed(seed); }
  reseed(seed) { this.s = (seed >>> 0) || 1; return this; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  gauss() { // approx normal, cheap
    return (this.next() + this.next() + this.next() + this.next() - 2) * 0.5;
  }
}

/** Tiny synchronous pub/sub. */
export class Events {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) { this.map.get(name)?.delete(fn); }
  emit(name, payload) {
    const set = this.map.get(name);
    if (set) for (const fn of [...set]) fn(payload);
  }
}

/** Fixed-size object pool. factory() creates, reset(obj) prepares reuse. */
export class Pool {
  constructor(factory, size) {
    this.factory = factory;
    this.free = [];
    this.used = new Set();
    for (let i = 0; i < size; i++) this.free.push(factory(i));
  }
  acquire() {
    const obj = this.free.pop() || null; // hard cap: never allocate past size
    if (obj) this.used.add(obj);
    return obj;
  }
  release(obj) {
    if (this.used.delete(obj)) this.free.push(obj);
  }
  releaseAll() {
    for (const o of this.used) this.free.push(o);
    this.used.clear();
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** Wrap angle to [-PI, PI]. */
export const wrapAngle = (a) => {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
};

/** Move angle a toward b by at most maxDelta. */
export const stepAngle = (a, b, maxDelta) => {
  const d = wrapAngle(b - a);
  return a + clamp(d, -maxDelta, maxDelta);
};

/** 2D value noise (deterministic, no allocation). */
const nHash = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export function valueNoise2D(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = nHash(xi, yi), b = nHash(xi + 1, yi), c = nHash(xi, yi + 1), d = nHash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2D(x, y, octaves = 4, lac = 2.02, gain = 0.5) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * f, y * f);
    norm += amp;
    amp *= gain; f *= lac;
  }
  return sum / norm;
}

/** Format helpers for HUD readouts. */
export const fmtKm = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
export const fmtAlt = (m) => Math.round(m / 10) * 10 + ' m';
export const pad2 = (n) => String(n).padStart(2, '0');
