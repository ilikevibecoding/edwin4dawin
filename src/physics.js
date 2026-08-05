// physics.js — simplified, fictionalized flight math + player capsule collision.
// Deliberately NOT an accurate fire-control or ballistics model: tuned for gameplay.
import * as THREE from 'three';
import { clamp } from './util.js';

export const GRAVITY = 9.81; // m/s^2, applied to ballistic threats & debris

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/**
 * Initial velocity so a projectile starting at `start` under gravity reaches
 * `target` after `T` seconds. v0 = (target - start)/T + 0.5*g*T (upward).
 */
export function ballisticVelocityFor(start, target, T, out = new THREE.Vector3()) {
  out.subVectors(target, start).divideScalar(T);
  out.y += 0.5 * GRAVITY * T;
  return out;
}

/** Analytic ballistic propagation: where will (pos, vel) be after t seconds. */
export function propagateBallistic(pos, vel, t, out = new THREE.Vector3()) {
  out.set(
    pos.x + vel.x * t,
    pos.y + vel.y * t - 0.5 * GRAVITY * t * t,
    pos.z + vel.z * t
  );
  return out;
}

/** Time until a ballistic object crosses y=groundY (positive root), or -1. */
export function timeToGround(pos, vel, groundY = 0) {
  const a = -0.5 * GRAVITY;
  const b = vel.y;
  const c = pos.y - groundY;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  const t1 = (-b + sq) / (2 * a);
  const t2 = (-b - sq) / (2 * a);
  const t = Math.max(t1, t2);
  return t > 0 ? t : -1;
}

/**
 * Simplified fictional intercept predictor. Iterates time-of-flight guesses so
 * an interceptor with average speed `avgSpeed` starting at `from` meets a
 * ballistic target. Returns { point, t } or null when unreachable in time.
 */
export function predictIntercept(from, targetPos, targetVel, avgSpeed, maxT = 90) {
  let t = from.distanceTo(targetPos) / avgSpeed;
  for (let i = 0; i < 4; i++) {
    propagateBallistic(targetPos, targetVel, t, _v1);
    if (_v1.y < 30) { // clamp prediction above terrain
      const tg = timeToGround(targetPos, targetVel, 30);
      if (tg > 0 && tg < t) t = tg;
      propagateBallistic(targetPos, targetVel, t, _v1);
    }
    const d = from.distanceTo(_v1);
    t = 0.55 * t + 0.45 * (d / avgSpeed);
    t = clamp(t, 0.5, maxT);
  }
  propagateBallistic(targetPos, targetVel, t, _v1);
  const tg = timeToGround(targetPos, targetVel, 5);
  if (tg > 0 && t >= tg - 0.4) return null; // target lands before we arrive
  return { point: _v1.clone(), t };
}

/**
 * Steer a velocity vector toward a desired direction, limited by turn rate
 * (rad/s) and keeping speed. Adds believable, smooth corrections.
 */
export function steerVelocity(vel, desiredDir, turnRate, dt) {
  const speed = vel.length();
  if (speed < 1e-4) return vel;
  _v1.copy(vel).normalize();
  const angle = _v1.angleTo(desiredDir);
  if (angle < 1e-5) return vel;
  const maxStep = turnRate * dt;
  const t = Math.min(1, maxStep / angle);
  _v2.copy(_v1).lerp(desiredDir, t).normalize().multiplyScalar(speed);
  vel.copy(_v2);
  return vel;
}

// ------------------------- player world collision -------------------------

/**
 * Colliders are simple XZ footprints with a height range:
 *  { type:'box', x, z, hx, hz, rot, y0, y1 }  (rot = yaw radians)
 *  { type:'cyl', x, z, r, y0, y1 }
 */
export function makeColliderBox(x, z, hx, hz, rot = 0, y0 = 0, y1 = 3) {
  return { type: 'box', x, z, hx, hz, rot, y0, y1, cos: Math.cos(rot), sin: Math.sin(rot) };
}
export function makeColliderCyl(x, z, r, y0 = 0, y1 = 3) {
  return { type: 'cyl', x, z, r, y0, y1 };
}

/**
 * Push a capsule (feetPos, radius, height) out of all colliders in XZ.
 * Mutates feetPos. Cheap and stable for a flat-ish base area.
 */
export function resolveCapsule(feetPos, radius, height, colliders) {
  const top = feetPos.y + height;
  for (const c of colliders) {
    if (top < c.y0 + 0.05 || feetPos.y > c.y1 - 0.05) continue;
    if (c.type === 'cyl') {
      const dx = feetPos.x - c.x;
      const dz = feetPos.z - c.z;
      const d2 = dx * dx + dz * dz;
      const minD = c.r + radius;
      if (d2 < minD * minD && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (minD - d) / d;
        feetPos.x += dx * push;
        feetPos.z += dz * push;
      }
    } else {
      // to local space
      let dx = feetPos.x - c.x;
      let dz = feetPos.z - c.z;
      const lx = dx * c.cos + dz * c.sin;
      const lz = -dx * c.sin + dz * c.cos;
      const cx = clamp(lx, -c.hx, c.hx);
      const cz = clamp(lz, -c.hz, c.hz);
      let px = lx - cx;
      let pz = lz - cz;
      const d2 = px * px + pz * pz;
      if (d2 < radius * radius) {
        let pushX, pushZ;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = (radius - d) / d;
          pushX = px * push;
          pushZ = pz * push;
        } else {
          // center inside box: push along smallest penetration axis
          const ox = c.hx - Math.abs(lx);
          const oz = c.hz - Math.abs(lz);
          if (ox < oz) { pushX = (lx > 0 ? 1 : -1) * (ox + radius); pushZ = 0; }
          else { pushX = 0; pushZ = (lz > 0 ? 1 : -1) * (oz + radius); }
        }
        // back to world space
        feetPos.x += pushX * c.cos - pushZ * c.sin;
        feetPos.z += pushX * c.sin + pushZ * c.cos;
      }
    }
  }
  return feetPos;
}

/** Ray vs sphere; returns distance along ray or -1. Used for aiming at threats. */
export function raySphere(origin, dir, center, radius) {
  _v1.subVectors(center, origin);
  const tca = _v1.dot(dir);
  if (tca < 0) return -1;
  const d2 = _v1.lengthSq() - tca * tca;
  const r2 = radius * radius;
  if (d2 > r2) return -1;
  return tca - Math.sqrt(r2 - d2);
}
