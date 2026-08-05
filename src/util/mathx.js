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

/** Longest lead time the prediction model will ever consider, in seconds. */
export const MAX_LEAD_TIME = 90;

/**
 * Closed-form time to a constant-velocity meeting point.
 *
 * Solves |targetPos + targetVel t - shooterPos| = chaserSpeed t, which is the
 * quadratic (v·v - s²) t² + 2 (r·v) t + r·r = 0. Returns the smallest positive
 * root, or -1 when the chaser can never catch up.
 */
const _rel = new THREE.Vector3();
export function leadTime(shooterPos, targetPos, targetVel, chaserSpeed) {
  _rel.copy(targetPos).sub(shooterPos);
  const a = targetVel.lengthSq() - chaserSpeed * chaserSpeed;
  const b = 2 * _rel.dot(targetVel);
  const c = _rel.lengthSq();
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) < 1e-9) return -1;
    const t = -c / b;
    return t > 0 ? t : -1;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  const t2 = (-b + s) / (2 * a);
  const positive = [t1, t2].filter((t) => t > 0);
  if (positive.length === 0) return -1;
  return Math.min(...positive);
}

/**
 * A deliberately simplified fictional lead-prediction helper.
 *
 * Starts from the closed-form constant-velocity solution, then refines a few
 * times with the target's acceleration folded in. The refinement is damped and
 * the lead time is clamped, because the naive fixed-point form diverges
 * explosively whenever the chaser is slower than the target.
 *
 * This is a gameplay abstraction for readable, cinematic intercepts, not a
 * fire-control model.
 */
const _pred = new THREE.Vector3();
export function predictIntercept(
  shooterPos,
  targetPos,
  targetVel,
  chaserSpeed,
  targetAccel = null,
  iterations = 3,
  out = new THREE.Vector3()
) {
  const speed = Math.max(1, chaserSpeed);
  let t = leadTime(shooterPos, targetPos, targetVel, speed);
  if (!(t > 0) || !Number.isFinite(t)) {
    // Unreachable on a constant-velocity solution: fall back to a straight
    // range/speed estimate so the round still flies a sensible pursuit course.
    t = _rel.copy(targetPos).sub(shooterPos).length() / speed;
  }
  t = clamp(t, 0, MAX_LEAD_TIME);

  if (targetAccel) {
    for (let i = 0; i < iterations; i++) {
      _pred.copy(targetVel).multiplyScalar(t);
      out.copy(targetPos).add(_pred).addScaledVector(targetAccel, 0.5 * t * t);
      const tNew = clamp(_rel.copy(out).sub(shooterPos).length() / speed, 0, MAX_LEAD_TIME);
      // Damped update: an undamped one oscillates and can run away.
      t = t + (tNew - t) * 0.5;
    }
  }
  _pred.copy(targetVel).multiplyScalar(t);
  out.copy(targetPos).add(_pred);
  if (targetAccel) out.addScaledVector(targetAccel, 0.5 * t * t);
  if (!Number.isFinite(out.x) || !Number.isFinite(out.y) || !Number.isFinite(out.z)) {
    out.copy(targetPos);
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
