// Simplified flight and collision maths. This is a deliberately fictional,
// gameplay-tuned model: believable curves and inertia, not an accurate
// aerodynamic or fire-control simulation.

import * as THREE from 'three';
import { WORLD } from './config.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

/** Exponential atmosphere, normalised to 1 at the pad. */
export function airDensity(y) {
  return WORLD.rho0 * Math.exp(-Math.max(0, y) / WORLD.scaleHeight);
}

/** 0..1 factor describing how well a trail can persist at this altitude. */
export function trailPersistence(y) {
  const rho = airDensity(y) / WORLD.rho0;
  // Contrails read strongest in the mid atmosphere and thin out very high up.
  return THREE.MathUtils.clamp(Math.pow(rho, 0.42), 0.06, 1);
}

export function machNumber(speed, y) {
  const t = 1 - Math.min(0.75, y / 44330) * 0.28;
  return speed / (WORLD.speedOfSound * Math.max(0.62, t));
}

/**
 * Integrate a body with gravity plus quadratic drag using a midpoint step.
 * `body` needs { pos, vel, cdA, mass }.
 */
export function integrateBody(body, dt, extraAccel = null) {
  const rho = airDensity(body.pos.y);
  _a.set(0, -WORLD.gravity, 0);
  if (extraAccel) _a.add(extraAccel);
  const speed = body.vel.length();
  if (speed > 1e-4 && body.cdA > 0) {
    const dragMag = (0.5 * rho * speed * speed * body.cdA) / Math.max(0.01, body.mass);
    _b.copy(body.vel).multiplyScalar(-dragMag / speed);
    _a.add(_b);
  }
  // Midpoint: advance velocity by a half step for positional accuracy.
  _c.copy(body.vel).addScaledVector(_a, dt * 0.5);
  body.pos.addScaledVector(_c, dt);
  body.vel.addScaledVector(_a, dt);
  return _a;
}

/**
 * Iterative lead-pursuit solution. Deliberately simplified: constant-velocity
 * target with a gravity sag term, three refinement passes. Returns time-to-go.
 */
export function leadSolution(shooterPos, shooterSpeed, targetPos, targetVel, out, gravitySag = 0.35, iterations = 4, maxTime = 45) {
  const speed = Math.max(120, shooterSpeed);
  let t = THREE.MathUtils.clamp(shooterPos.distanceTo(targetPos) / speed, 0, maxTime);
  for (let i = 0; i < iterations; i++) {
    out.copy(targetVel).multiplyScalar(t).add(targetPos);
    out.y -= 0.5 * WORLD.gravity * gravitySag * t * t;
    t = THREE.MathUtils.clamp(out.distanceTo(shooterPos) / speed, 0, maxTime);
  }
  out.copy(targetVel).multiplyScalar(t).add(targetPos);
  out.y -= 0.5 * WORLD.gravity * gravitySag * t * t;
  return t;
}

/**
 * Proportional navigation steering command, clamped to a lateral g limit and
 * low-pass filtered so fins never look jittery.
 */
export function proNav(missile, targetPos, targetVel, gain, maxLateralAccel, dt, out) {
  _a.subVectors(targetPos, missile.pos); // LOS
  const range = _a.length();
  if (range < 1e-3) return out.set(0, 0, 0);
  _b.copy(_a).multiplyScalar(1 / range); // unit LOS
  _c.subVectors(targetVel, missile.vel); // closing velocity
  const closing = -_c.dot(_b);
  // Omega = (R x Vr) / |R|^2  -> lateral acceleration = N * Vc * omega x los
  _d.crossVectors(_a, _c).multiplyScalar(1 / (range * range));
  out.crossVectors(_d, _b).multiplyScalar(gain * Math.max(50, closing));
  // strip any component along the velocity vector: PN only turns
  const vlen = missile.vel.length();
  if (vlen > 1e-3) {
    _a.copy(missile.vel).multiplyScalar(1 / vlen);
    out.addScaledVector(_a, -out.dot(_a));
  }
  const mag = out.length();
  if (mag > maxLateralAccel) out.multiplyScalar(maxLateralAccel / mag);
  // command smoothing: first-order lag keeps corrections visible but calm
  if (!missile.lastCmd) missile.lastCmd = new THREE.Vector3();
  const k = 1 - Math.exp(-dt * 7.5);
  missile.lastCmd.lerp(out, k);
  out.copy(missile.lastCmd);
  return out;
}

/** Smoothly rotate a mesh so +Y points along velocity, with a roll bias. */
export function alignToVelocity(object, vel, dt, rate = 9, rollFromAccel = null, rollScale = 0.012) {
  const speed = vel.length();
  if (speed < 1e-3) return;
  _a.copy(vel).multiplyScalar(1 / speed);
  _q.setFromUnitVectors(UP, _a);
  if (rollFromAccel) {
    const roll = THREE.MathUtils.clamp(rollFromAccel.length() * rollScale, 0, 0.45);
    const sign = Math.sign(rollFromAccel.dot(_b.crossVectors(_a, UP)) || 1);
    _m.makeRotationY(0);
    const rq = new THREE.Quaternion().setFromAxisAngle(UP, roll * sign);
    _q.multiply(rq);
  }
  const k = 1 - Math.exp(-dt * rate);
  object.quaternion.slerp(_q, k);
}

/**
 * Solve for the launch velocity that puts a ballistic body on a chosen impact
 * point. Fictional: ignores drag, which the integrator then perturbs slightly.
 */
export function ballisticLaunchVelocity(from, to, speed, high = false) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const flat = Math.hypot(dx, dz);
  const dy = to.y - from.y;
  const g = WORLD.gravity;
  const s2 = speed * speed;
  const disc = s2 * s2 - g * (g * flat * flat + 2 * dy * s2);
  const vel = new THREE.Vector3();
  if (disc < 0) {
    // Not reachable at this speed: aim straight at the point instead.
    vel.set(dx, dy, dz).normalize().multiplyScalar(speed);
    return vel;
  }
  const root = Math.sqrt(disc);
  const tan = (s2 + (high ? root : -root)) / (g * flat);
  const ang = Math.atan(tan);
  const horiz = Math.cos(ang) * speed;
  vel.set((dx / flat) * horiz, Math.sin(ang) * speed, (dz / flat) * horiz);
  return vel;
}

/** Closest approach between two moving points over the next dt. */
export function closestApproach(pa, va, pb, vb, dt) {
  _a.subVectors(pa, pb);
  _b.subVectors(va, vb);
  const vv = _b.lengthSq();
  let t = vv < 1e-9 ? 0 : -_a.dot(_b) / vv;
  t = THREE.MathUtils.clamp(t, 0, dt);
  _c.copy(_a).addScaledVector(_b, t);
  return { t, dist: _c.length() };
}

/* -------------------------------------------------------- collision world */

/**
 * Axis-aligned-in-local-space collider set. Shapes are boxes (with a yaw) and
 * vertical cylinders; the player is a vertical capsule. Enough fidelity to stop
 * the player walking through launchers, trucks and barriers.
 */
export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.cylinders = [];
    this.terrain = null;
  }

  addBox(center, halfExtents, yaw = 0, opts = {}) {
    this.boxes.push({
      c: new THREE.Vector3().fromArray(Array.isArray(center) ? center : center.toArray()),
      h: new THREE.Vector3().fromArray(Array.isArray(halfExtents) ? halfExtents : halfExtents.toArray()),
      yaw,
      cos: Math.cos(-yaw),
      sin: Math.sin(-yaw),
      walkable: opts.walkable !== false,
    });
    return this;
  }

  addCylinder(center, radius, halfHeight, opts = {}) {
    this.cylinders.push({
      c: new THREE.Vector3().fromArray(Array.isArray(center) ? center : center.toArray()),
      r: radius,
      hh: halfHeight,
      walkable: opts.walkable !== false,
    });
    return this;
  }

  /** Register all collidable volumes declared on an object graph. */
  addFromObject(root) {
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const cols = o.userData && o.userData.colliders;
      if (!cols) return;
      for (const col of cols) {
        const p = new THREE.Vector3().fromArray(col.pos || [0, 0, 0]);
        o.localToWorld(p);
        const yaw = new THREE.Euler().setFromQuaternion(o.getWorldQuaternion(_q), 'YXZ').y + (col.yaw || 0);
        if (col.type === 'cyl') this.addCylinder(p, col.r, col.hh, col);
        else this.addBox(p, col.half, yaw, col);
      }
    });
    return this;
  }

  clear() {
    this.boxes.length = 0;
    this.cylinders.length = 0;
  }

  /** Highest walkable surface at (x, z) below `maxY`. */
  surfaceHeight(x, z, maxY = 1e9) {
    let best = this.terrain ? this.terrain(x, z) : 0;
    for (const b of this.boxes) {
      if (!b.walkable) continue;
      const dx = x - b.c.x;
      const dz = z - b.c.z;
      const lx = dx * b.cos - dz * b.sin;
      const lz = dx * b.sin + dz * b.cos;
      if (Math.abs(lx) <= b.h.x && Math.abs(lz) <= b.h.z) {
        const top = b.c.y + b.h.y;
        if (top <= maxY && top > best) best = top;
      }
    }
    for (const c of this.cylinders) {
      if (!c.walkable) continue;
      if (Math.hypot(x - c.c.x, z - c.c.z) <= c.r) {
        const top = c.c.y + c.hh;
        if (top <= maxY && top > best) best = top;
      }
    }
    return best;
  }

  /**
   * Push a vertical capsule out of every overlapping shape. `pos` is the capsule
   * base (feet). Returns true when a horizontal correction was applied.
   */
  resolveCapsule(pos, radius, height, stepHeight = 0.4) {
    let hit = false;
    const feet = pos.y;
    const head = pos.y + height;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        const bTop = b.c.y + b.h.y;
        const bBot = b.c.y - b.h.y;
        if (bTop <= feet + stepHeight || bBot >= head) continue;
        const dx = pos.x - b.c.x;
        const dz = pos.z - b.c.z;
        let lx = dx * b.cos - dz * b.sin;
        let lz = dx * b.sin + dz * b.cos;
        const ex = b.h.x + radius;
        const ez = b.h.z + radius;
        if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue;
        const px = ex - Math.abs(lx);
        const pz = ez - Math.abs(lz);
        if (px < pz) lx += Math.sign(lx || 1) * px;
        else lz += Math.sign(lz || 1) * pz;
        const cos = Math.cos(b.yaw);
        const sin = Math.sin(b.yaw);
        pos.x = b.c.x + (lx * cos - lz * sin);
        pos.z = b.c.z + (lx * sin + lz * cos);
        moved = true;
        hit = true;
      }
      for (const c of this.cylinders) {
        const top = c.c.y + c.hh;
        const bot = c.c.y - c.hh;
        if (top <= feet + stepHeight || bot >= head) continue;
        const dx = pos.x - c.c.x;
        const dz = pos.z - c.c.z;
        const d = Math.hypot(dx, dz);
        const rr = c.r + radius;
        if (d >= rr || d < 1e-6) continue;
        pos.x = c.c.x + (dx / d) * rr;
        pos.z = c.c.z + (dz / d) * rr;
        moved = true;
        hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }
}

export const tmpVec = () => new THREE.Vector3();
