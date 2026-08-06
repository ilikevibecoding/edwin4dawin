// Simplified, gameplay-oriented flight physics. Deliberately NOT a real
// fire-control or ballistics model — constant gravity, exponential air
// density for visuals, and an iterative "good enough" intercept predictor.
import * as THREE from 'three';
import { WORLD } from './constants.js';

const G = new THREE.Vector3(0, -WORLD.gravity, 0);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

/** relative air density at altitude (1 at sea level, → 0 high up). Visual only. */
export function airDensity(alt) {
  return Math.exp(-Math.max(0, alt) / WORLD.airScaleHeight);
}

/** integrate a ballistic state {pos, vel} with optional extra accel */
export function integrate(state, dt, extraAccel = null) {
  // semi-implicit Euler — stable for our accel magnitudes at 120 Hz
  state.vel.addScaledVector(G, dt);
  if (extraAccel) state.vel.addScaledVector(extraAccel, dt);
  state.pos.addScaledVector(state.vel, dt);
}

/**
 * Solve initial velocity so a ballistic object leaves `from`, obeys gravity,
 * and arrives at `to` after exactly `T` seconds.
 */
export function solveBallisticVelocity(from, to, T, out = new THREE.Vector3()) {
  out.subVectors(to, from).divideScalar(T);
  out.y += 0.5 * WORLD.gravity * T;
  return out;
}

/** predict ballistic position after t seconds (no drag) */
export function predictBallistic(pos, vel, t, out = new THREE.Vector3()) {
  out.copy(pos).addScaledVector(vel, t);
  out.y -= 0.5 * WORLD.gravity * t * t;
  return out;
}

/** time until a ballistic object reaches ground level (y = 0), or -1 */
export function timeToGround(pos, vel) {
  // 0 = y + vy t - g/2 t^2
  const a = -WORLD.gravity / 2, b = vel.y, c = pos.y;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : -1;
}

/** predicted ground impact point of a ballistic object (or null) */
export function predictImpact(pos, vel, out = new THREE.Vector3()) {
  const t = timeToGround(pos, vel);
  if (t < 0) return null;
  predictBallistic(pos, vel, t, out);
  out.y = 0;
  return out;
}

/**
 * Iteratively find an intercept point for a pursuer with speed profile
 * `avgSpeed` starting at `from`, against a ballistic target.
 * Fictional simplification: assumes constant average pursuer speed.
 * Returns { point, time } or null when no solution inside maxTime.
 * NOTE: returns a shared module-scope result (guidance runs at 120 Hz —
 * no per-step allocations). Copy `point` before calling again.
 */
const _solPoint = new THREE.Vector3();
const _sol = { point: _solPoint, time: 0 };
export function predictInterceptPoint(from, targetPos, targetVel, avgSpeed, maxTime = 90) {
  let t = from.distanceTo(targetPos) / Math.max(avgSpeed, 1);
  for (let i = 0; i < 16; i++) {
    predictBallistic(targetPos, targetVel, t, _solPoint);
    const tNew = from.distanceTo(_solPoint) / Math.max(avgSpeed, 1);
    if (Math.abs(tNew - t) < 0.005) { t = tNew; break; }
    t = 0.5 * (t + tNew); // damped fixed-point iteration — stable solution
  }
  if (!(t > 0) || t > maxTime) return null;
  predictBallistic(targetPos, targetVel, t, _solPoint);
  if (_solPoint.y < 0) return null; // target hits ground first
  _sol.time = t;
  return _sol;
}

/**
 * Smoothly steer velocity toward desired direction with a lateral-accel limit.
 * Keeps |vel| unchanged; returns applied turn accel magnitude (for FX).
 */
export function steerTowards(vel, desiredDir, maxLatAccel, dt) {
  const speed = vel.length();
  if (speed < 1e-3) return 0;
  tmpV.copy(vel).normalize();
  tmpV2.copy(desiredDir).normalize();
  const angle = tmpV.angleTo(tmpV2);
  if (angle < 1e-5) return 0;
  const maxTurn = (maxLatAccel / speed) * dt; // rad this step
  const f = Math.min(1, maxTurn / angle);
  // slerp direction by f
  tmpV.lerp(tmpV2, f).normalize();
  vel.copy(tmpV).multiplyScalar(speed);
  return Math.min(angle / dt * speed, maxLatAccel);
}

/** capsule-ish (circle in XZ) vs collider list resolution. Mutates pos. */
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    if (c.type === 'aabb') {
      // closest point on AABB in XZ, only if vertically overlapping walk band
      if (pos.y > c.max.y + 0.1 || pos.y + 1.7 < c.min.y) continue;
      const cx = Math.max(c.min.x, Math.min(pos.x, c.max.x));
      const cz = Math.max(c.min.z, Math.min(pos.z, c.max.z));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // center inside box — push out along smallest penetration axis
          const px1 = pos.x - c.min.x + radius, px2 = c.max.x - pos.x + radius;
          const pz1 = pos.z - c.min.z + radius, pz2 = c.max.z - pos.z + radius;
          const m = Math.min(px1, px2, pz1, pz2);
          if (m === px1) pos.x = c.min.x - radius;
          else if (m === px2) pos.x = c.max.x + radius;
          else if (m === pz1) pos.z = c.min.z - radius;
          else pos.z = c.max.z + radius;
        }
      }
    } else if (c.type === 'cylinder') {
      if (pos.y > c.y + c.h + 0.1) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const rr = c.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pos.x = c.x + (dx / d) * rr;
        pos.z = c.z + (dz / d) * rr;
      }
    }
  }
}
