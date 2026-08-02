import * as THREE from 'three';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const saturate = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Normalised progress of `v` inside [a, b], clamped. */
export const invLerp = (a: number, b: number, v: number): number =>
  b === a ? 0 : saturate((v - a) / (b - a));

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

export const smootherstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Ease helpers used by the camera director and character motion. */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number): number => t * t * t;
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo = (t: number): number => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Frame-rate independent exponential approach (used only for non-deterministic polish). */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** A single hump: 0 -> 1 -> 0 across [0,1]. */
export const pulse = (t: number): number => {
  const x = saturate(t);
  return Math.sin(x * Math.PI);
};

/** Fast attack, slow decay - the shape of nearly every impact flash. */
export const flash = (t: number, attack = 0.08): number => {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  const d = (t - attack) / (1 - attack);
  return d >= 1 ? 0 : Math.pow(1 - d, 2.2);
};

/** Triangle wave in [-1, 1] with period 1. */
export const triangle = (t: number): number => {
  const f = t - Math.floor(t);
  return 4 * Math.abs(f - 0.5) - 1;
};

const _tmpV = new THREE.Vector3();

/**
 * Catmull-Rom evaluation for a raw point list without allocating a curve.
 * Used by ship flight paths and camera dollies.
 */
export function catmullRom(points: THREE.Vector3[], t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const n = points.length;
  if (n === 0) return out.set(0, 0, 0);
  if (n === 1) return out.copy(points[0]);
  const scaled = saturate(t) * (n - 1);
  const i = Math.min(n - 2, Math.floor(scaled));
  const f = scaled - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  const f2 = f * f;
  const f3 = f2 * f;
  out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * f + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * f2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * f3),
  );
  return out;
}

/** Finite-difference tangent of a Catmull-Rom path, normalised. */
export function catmullRomTangent(points: THREE.Vector3[], t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const h = 1e-3;
  const a = catmullRom(points, clamp(t - h, 0, 1), _tmpV.clone());
  const b = catmullRom(points, clamp(t + h, 0, 1), out);
  b.sub(a);
  if (b.lengthSq() < 1e-12) b.set(0, 0, 1);
  return b.normalize();
}

/** True when every component of an object's world transform is finite. */
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

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}
