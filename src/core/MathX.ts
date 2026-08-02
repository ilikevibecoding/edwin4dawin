import * as THREE from 'three';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const saturate = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Normalised progress of `v` between `a` and `b`, clamped. */
export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : saturate((v - a) / (b - a));

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

export const smootherstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Frame-rate independent exponential approach. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const dampVec3 = (
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number,
): THREE.Vector3 => {
  const t = 1 - Math.exp(-lambda * dt);
  return current.lerp(target, t);
};

/** Triangle-ish pulse that peaks at `peak` within [0,1]. */
export const pulse = (t: number, peak = 0.25): number => {
  if (t <= 0 || t >= 1) return 0;
  return t < peak ? t / peak : 1 - (t - peak) / (1 - peak);
};

export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Cheap deterministic value noise, useful for shakes and drifts. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
}

function hash1(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/** Sum of octaves of {@link noise1}. */
export function fbm1(x: number, octaves = 3): number {
  let amp = 0.5;
  let sum = 0;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise1(x * freq + i * 13.37) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/**
 * Orient `obj` so its -Z axis points along `dir`, with a bank angle derived
 * from the change in heading. Keeps ships flying forward instead of sliding.
 */
const _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _target = new THREE.Vector3();
const _q = new THREE.Quaternion();

export function faceAlong(
  obj: THREE.Object3D,
  dir: THREE.Vector3,
  bank = 0,
  slerp = 1,
  up: THREE.Vector3 = _up,
): void {
  if (dir.lengthSq() < 1e-9) return;
  _target.copy(obj.position).add(dir);
  _m.lookAt(obj.position, _target, up);
  _q.setFromRotationMatrix(_m);
  if (bank !== 0) {
    const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank);
    _q.multiply(roll);
  }
  if (slerp >= 1) obj.quaternion.copy(_q);
  else obj.quaternion.slerp(_q, slerp);
}

/** Sample a curve position and tangent at once. */
export function sampleCurve(
  curve: THREE.Curve<THREE.Vector3>,
  t: number,
  outPos: THREE.Vector3,
  outTan: THREE.Vector3,
): void {
  const tt = clamp(t, 0, 1);
  curve.getPoint(tt, outPos);
  curve.getTangent(tt, outTan);
  if (outTan.lengthSq() < 1e-9) outTan.set(0, 0, -1);
  else outTan.normalize();
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
