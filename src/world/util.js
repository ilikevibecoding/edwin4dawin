import * as THREE from 'three';

/** Deterministic PRNG (mulberry32) so the level is identical on every load / screenshot. */
export function makeRng(seed = 1337) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rnd.range = (lo, hi) => lo + (hi - lo) * rnd();
  rnd.int = (lo, hi) => Math.floor(rnd.range(lo, hi + 1));
  rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  rnd.chance = (p) => rnd() < p;
  rnd.sign = () => (rnd() < 0.5 ? -1 : 1);
  return rnd;
}

export const DEG = Math.PI / 180;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Multiply a THREE.Color-like (hex or Color) by a scalar/other color, returning [r,g,b]. */
export function tint(hex, mul = 1) {
  const c = new THREE.Color(hex);
  return [c.r * mul, c.g * mul, c.b * mul];
}

/** Regular polygon points (x,z) on the ground plane. angle0 rotates the first vertex. */
export function regularPolygon(cx, cz, radius, sides, angle0 = 0) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = angle0 + (i / sides) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * radius, cz + Math.sin(a) * radius]);
  }
  return pts;
}

/** Player-style yaw (0 faces -Z, positive turns left/west) that looks from (x,z) toward (tx,tz). */
export function yawToward(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}
