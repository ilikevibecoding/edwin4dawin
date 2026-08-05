// Simplified, fictionalized flight physics + player collision.
// Deliberately NOT an operational model: gravity, drag, speeds and guidance
// are tuned for cinematic, readable gameplay.
import * as THREE from 'three';
import { fbm2 } from './rng.js';

// Fictional gravity for threats — real ballistics would cross the map in
// seconds; this keeps arcs majestic and scenarios 45–90 s long.
export const THREAT_GRAVITY = 3.4;   // m/s^2 (fictional)
export const DEBRIS_GRAVITY = 9.81;  // small stuff falls like you expect
export const BASE_FLAT_RADIUS = 210; // terrain kept flat inside this radius

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

// ---------------------------------------------------------------- terrain
export function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  if (r < BASE_FLAT_RADIUS) return 0;
  const t = Math.min(1, (r - BASE_FLAT_RADIUS) / 260);
  const n = fbm2(x * 0.0016 + 7.3, z * 0.0016 + 2.9, 4);
  const dunes = fbm2(x * 0.008 + 3.1, z * 0.008 + 8.7, 3);
  return t * t * (n * 26 - 8 + dunes * 4);
}

// ---------------------------------------------------------------- ballistics
export function predictBallistic(p0, v0, g, t, out) {
  out.set(
    p0.x + v0.x * t,
    p0.y + v0.y * t - 0.5 * g * t * t,
    p0.z + v0.z * t,
  );
  return out;
}

// Solve initial velocity for a ballistic arc from `from` to `to` taking
// `flightTime` seconds under gravity g.
export function solveBallisticVelocity(from, to, flightTime, g, out) {
  out.set(
    (to.x - from.x) / flightTime,
    (to.y - from.y) / flightTime + 0.5 * g * flightTime,
    (to.z - from.z) / flightTime,
  );
  return out;
}

// Iteratively find an intercept point: where can an interceptor with average
// speed `avgSpeed` starting at `launchPos` meet a ballistic target?
// Returns { point, time } or null if unreachable within maxT.
export function solveIntercept(launchPos, targetPos, targetVel, g, avgSpeed, delay = 0, maxT = 120) {
  let t = launchPos.distanceTo(targetPos) / avgSpeed;
  const pt = new THREE.Vector3();
  for (let i = 0; i < 24; i++) {
    predictBallistic(targetPos, targetVel, g, t, pt);
    const d = launchPos.distanceTo(pt);
    const tNew = d / avgSpeed + delay;
    if (Math.abs(tNew - t) < 0.01) { t = tNew; break; }
    t = t * 0.45 + tNew * 0.55;
    if (t > maxT) return null;
  }
  predictBallistic(targetPos, targetVel, g, t, pt);
  if (pt.y < 25) return null; // target hits ground before we arrive
  return { point: pt, time: t };
}

// Time until a ballistic object reaches ground height (approx flat 0).
export function timeToImpact(p, v, g) {
  // y + vy t - 0.5 g t^2 = 0
  const a = -0.5 * g, b = v.y, c = p.y;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : Infinity;
}

export function impactPoint(p, v, g, out) {
  const t = timeToImpact(p, v, g);
  if (!isFinite(t)) return null;
  out.set(p.x + v.x * t, 0, p.z + v.z * t);
  return out;
}

// Air density factor for trail visuals: 1 near ground, tapering with altitude.
export function airDensity(y) {
  return Math.exp(-Math.max(0, y) / 3800);
}

// Contrail band: condensation trails are strongest in a mid band.
export function contrailFactor(y) {
  const lo = 1300, hi = 5200;
  if (y < lo) return THREE.MathUtils.smoothstep(y, 500, lo) * 0.55;
  if (y > hi) return Math.max(0.15, 1 - (y - hi) / 2600);
  return 1.0;
}

// ---------------------------------------------------------------- colliders
// Yaw-rotated box colliders on flat ground (the base pad is flat).
export class BoxCollider {
  constructor(cx, cz, hx, hz, yaw = 0, height = 3, name = '') {
    this.cx = cx; this.cz = cz;
    this.hx = hx; this.hz = hz;
    this.cos = Math.cos(yaw); this.sin = Math.sin(yaw);
    this.height = height;
    this.name = name;
  }
}

// Push a capsule (2D circle on ground plane, since base is flat) out of the
// collider set. Two iterations handles corners well enough for walking speed.
export function resolveCapsule(pos, radius, colliders, playerY = 0, playerH = 1.85) {
  for (let iter = 0; iter < 2; iter++) {
    for (const c of colliders) {
      if (c.height < 0.32) continue;                 // walk over kerbs
      if (playerY > c.height - 0.1) continue;        // above the obstacle
      // world -> local
      const dx = pos.x - c.cx, dz = pos.z - c.cz;
      const lx = dx * c.cos + dz * c.sin;
      const lz = -dx * c.sin + dz * c.cos;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      let px = lx - qx, pz = lz - qz;
      let d2 = px * px + pz * pz;
      if (d2 > radius * radius) continue;
      let nx, nz, push;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = px / d; nz = pz / d;
        push = radius - d;
      } else {
        // inside the box: push out along smallest penetration axis
        const ox = c.hx - Math.abs(lx), oz = c.hz - Math.abs(lz);
        if (ox < oz) { nx = lx >= 0 ? 1 : -1; nz = 0; push = ox + radius; }
        else { nx = 0; nz = lz >= 0 ? 1 : -1; push = oz + radius; }
      }
      // local normal -> world
      const wx = nx * c.cos - nz * c.sin;
      const wz = nx * c.sin + nz * c.cos;
      pos.x += wx * push;
      pos.z += wz * push;
    }
  }
  return pos;
}

// Steer a velocity vector toward a desired direction with a max lateral
// acceleration — produces smooth, believable missile corrections.
export function steerVelocity(vel, desiredDir, maxAccel, dt) {
  const speed = vel.length();
  if (speed < 1e-4) return vel;
  _v1.copy(vel).normalize();
  _v2.copy(desiredDir).normalize();
  // desired change in direction
  const dot = THREE.MathUtils.clamp(_v1.dot(_v2), -1, 1);
  const angle = Math.acos(dot);
  if (angle < 1e-5) return vel;
  const maxTurn = (maxAccel / speed) * dt; // rad this frame
  const t = Math.min(1, maxTurn / angle);
  _v1.lerp(_v2, t).normalize();
  vel.copy(_v1).multiplyScalar(speed);
  return vel;
}
