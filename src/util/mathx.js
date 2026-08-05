import * as THREE from 'three';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const saturate = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = saturate(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, v) => {
  const t = saturate(invLerp(a, b, v));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const degToRad = THREE.MathUtils.degToRad;
export const radToDeg = THREE.MathUtils.radToDeg;

/** Frame-rate independent exponential approach. `rate` is the per-second decay. */
export const damp = (current, target, rate, dt) =>
  target + (current - target) * Math.exp(-rate * dt);

export function dampVec3(out, target, rate, dt) {
  const k = Math.exp(-rate * dt);
  out.x = target.x + (out.x - target.x) * k;
  out.y = target.y + (out.y - target.y) * k;
  out.z = target.z + (out.z - target.z) * k;
  return out;
}

export function moveTowards(current, target, maxDelta) {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a) {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

export function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatRange(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * A deliberately simplified fictional lead-prediction helper.
 *
 * It iterates a constant-velocity extrapolation of the target a handful of
 * times to converge on a plausible meeting point. This is a gameplay
 * abstraction for readable, cinematic intercepts, not a fire-control model.
 */
const _rel = new THREE.Vector3();
const _pred = new THREE.Vector3();
export function predictIntercept(
  shooterPos,
  targetPos,
  targetVel,
  chaserSpeed,
  targetAccel = null,
  iterations = 5,
  out = new THREE.Vector3()
) {
  out.copy(targetPos);
  let t = 0;
  for (let i = 0; i < iterations; i++) {
    _rel.copy(out).sub(shooterPos);
    t = _rel.length() / Math.max(1e-3, chaserSpeed);
    _pred.copy(targetVel).multiplyScalar(t);
    out.copy(targetPos).add(_pred);
    if (targetAccel) out.addScaledVector(targetAccel, 0.5 * t * t);
  }
  return out;
}

/** Closest approach distance between two moving points over a small step. */
const _dp = new THREE.Vector3();
const _dv = new THREE.Vector3();
export function closestApproach(pA, vA, pB, vB, dt) {
  _dp.copy(pB).sub(pA);
  _dv.copy(vB).sub(vA);
  const vv = _dv.lengthSq();
  if (vv < 1e-8) return { t: 0, dist: _dp.length() };
  let t = -_dp.dot(_dv) / vv;
  t = clamp(t, 0, dt);
  const dist = _dp.addScaledVector(_dv, t).length();
  return { t, dist };
}

/** Signed horizontal bearing in degrees, 0 = north (-Z), clockwise. */
export function bearingDeg(x, z) {
  return (radToDeg(Math.atan2(x, -z)) + 360) % 360;
}
