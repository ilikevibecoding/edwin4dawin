import * as THREE from 'three';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : clamp01((v - a) / (b - a));

export const remap = (v: number, a: number, b: number, c: number, d: number): number =>
  lerp(c, d, invLerp(a, b, v));

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Frame-rate independent exponential approach. `rate` = 1/e time in seconds. */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  target + (current - target) * Math.exp(-dt / Math.max(1e-5, rate));

export const dampVec = (
  current: THREE.Vector3,
  target: THREE.Vector3,
  rate: number,
  dt: number,
): THREE.Vector3 => {
  const k = Math.exp(-dt / Math.max(1e-5, rate));
  current.x = target.x + (current.x - target.x) * k;
  current.y = target.y + (current.y - target.y) * k;
  current.z = target.z + (current.z - target.z) * k;
  return current;
};

export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number): number => Math.pow(clamp01(t), 3);
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - clamp01(t), 5);
export const easeInQuad = (t: number): number => clamp01(t) * clamp01(t);
export const easeOutQuad = (t: number): number => 1 - (1 - clamp01(t)) * (1 - clamp01(t));

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(t);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Rises 0 -> 1 -> 0 across [0,1] with smooth shoulders. */
export const pulse = (t: number, attack = 0.15, release = 0.35): number => {
  const x = clamp01(t);
  if (x < attack) return smoothstep(x / attack);
  if (x > 1 - release) return smoothstep((1 - x) / release);
  return 1;
};

/** Window helper: 0 before `from`, eased 0..1 across the span, 1 after `to`. */
export const ramp = (t: number, from: number, to: number, ease = smoothstep): number =>
  ease(invLerp(from, to, t));

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** Cheap deterministic value noise in 1D — smooth, repeatable, no allocations. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1;
}

function hash1(i: number, seed: number): number {
  let h = Math.imul(i ^ seed, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Layered value noise, useful for camera drift and turbulence. */
export function fbm1(x: number, octaves = 3, seed = 0): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise1(x * freq, seed + o * 977) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / Math.max(1e-5, norm);
}

/** True if every component of the object's transform is finite. */
export function isFiniteObject(obj: THREE.Object3D): boolean {
  const p = obj.position;
  const q = obj.quaternion;
  const s = obj.scale;
  return (
    Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
    Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z) && Number.isFinite(q.w) &&
    Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z)
  );
}
