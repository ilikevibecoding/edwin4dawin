/** Shared easing, interpolation and path helpers used across the timeline. */

import * as THREE from 'three';

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));

/** Normalised, clamped progress of `v` through [a,b]. */
export const progress = (v: number, a: number, b: number) => clamp(invLerp(a, b, v));

/** Smoothstep between edges. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(invLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
}

/** Smoother (Ken Perlin quintic) step — no second-derivative discontinuity. */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(invLerp(edge0, edge1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Rises 0→1 over [a,b] then falls 1→0 over [c,d]. Ideal for timed pulses. */
export function pulse(x: number, a: number, b: number, c: number, d: number): number {
  return smoothstep(a, b, x) * (1 - smoothstep(c, d, x));
}

/** Frame-rate independent exponential approach. `rate` = fraction remaining after 1s. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.pow(rate, dt);
}

export function dampVec(out: THREE.Vector3, target: THREE.Vector3, rate: number, dt: number): THREE.Vector3 {
  const f = Math.pow(rate, dt);
  out.x = target.x + (out.x - target.x) * f;
  out.y = target.y + (out.y - target.y) * f;
  out.z = target.z + (out.z - target.z) * f;
  return out;
}

/* ------------------------------------------------------------------ easing */

export const Ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t: number) => t * t * t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  outElastic: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  /** Gentle S-curve that starts and ends with zero velocity. Camera default. */
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t)),
} as const;

export type EaseName = keyof typeof Ease;

/* ------------------------------------------------------------------- paths */

/**
 * A named waypoint path evaluated with a Catmull-Rom curve.
 * Ships and cameras travel along these so motion always has a tangent — which
 * is what stops craft from "sliding sideways".
 */
export class NamedPath {
  readonly curve: THREE.CatmullRomCurve3;
  private lengths: number[] | null = null;

  constructor(
    readonly name: string,
    points: THREE.Vector3[] | number[][],
    curveType: 'centripetal' | 'chordal' | 'catmullrom' = 'centripetal',
    tension = 0.5,
  ) {
    const pts = points.map((p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone()));
    this.curve = new THREE.CatmullRomCurve3(pts, false, curveType, tension);
  }

  /** Position at normalised parameter t∈[0,1] (uniform in arc length). */
  at(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    if (!this.lengths) this.lengths = this.curve.getLengths(200) as unknown as number[];
    return this.curve.getPointAt(clamp(t), out);
  }

  /** Unit tangent at t. */
  tangent(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.curve.getTangentAt(clamp(t), out).normalize();
  }

  get length(): number {
    return this.curve.getLength();
  }
}

/**
 * Orient `obj` so that its −Z axis (Three's forward) points along `velocity`,
 * adding a banked roll proportional to lateral acceleration. This is the single
 * most important trick for making spacecraft read as *flying* rather than
 * translating.
 */
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

export function orientAlong(
  obj: THREE.Object3D,
  velocity: THREE.Vector3,
  bankRadians = 0,
  worldUp = new THREE.Vector3(0, 1, 0),
  slerp = 1,
): void {
  if (velocity.lengthSq() < 1e-10) return;
  _fwd.copy(velocity).normalize();
  _right.crossVectors(worldUp, _fwd);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  _right.normalize();
  _up.crossVectors(_fwd, _right).normalize();
  if (bankRadians !== 0) {
    _up.applyAxisAngle(_fwd, bankRadians);
    _right.crossVectors(_up, _fwd).normalize();
  }
  // Object forward is −Z, so the matrix third column is −forward.
  _m.makeBasis(_right, _up, _fwd.clone().negate());
  _q.setFromRotationMatrix(_m);
  if (slerp >= 1) obj.quaternion.copy(_q);
  else obj.quaternion.slerp(_q, slerp);
}

/** Signed angular difference wrapped to [-π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Deterministic multi-octave shake offset — no RNG state, pure function of time. */
export function shakeNoise(t: number, seed: number): number {
  return (
    Math.sin(t * 27.3 + seed * 12.9898) * 0.55 +
    Math.sin(t * 61.7 + seed * 78.233) * 0.3 +
    Math.sin(t * 113.1 + seed * 43.758) * 0.15
  );
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
