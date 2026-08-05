import * as THREE from 'three';
import { clamp, saturate, lerp } from './util/mathx.js';

/**
 * Visual flight physics and world collision.
 *
 * The goal here is believable, readable motion - curved ballistic arcs, thrust
 * phases, drag that thins out with altitude, acceleration-limited steering -
 * not operational accuracy. Every constant is chosen for how the engagement
 * reads on screen.
 */

export const GRAVITY = 9.81;
export const SEA_LEVEL_DENSITY = 1.225;
/** Scale height of the fictional atmosphere, in metres. */
export const SCALE_HEIGHT = 8200;
export const SPEED_OF_SOUND = 340;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD_AXIS = new THREE.Vector3(0, 1, 0);

/** Exponential atmosphere. Drives drag and how fast contrails dissipate. */
export function airDensity(altitude) {
  return SEA_LEVEL_DENSITY * Math.exp(-Math.max(0, altitude) / SCALE_HEIGHT);
}

/** 0 at sea level, 1 in the thin upper air - used for trail persistence. */
export function airThinness(altitude) {
  return saturate(1 - airDensity(altitude) / SEA_LEVEL_DENSITY);
}

/**
 * How persistent a smoke trail should be at a given altitude.
 * Dense low air shreds smoke quickly; thin high air leaves long contrails.
 */
export function trailPersistence(altitude) {
  const t = saturate(altitude / 9000);
  return lerp(1.0, 4.2, t * t);
}

/** Drag acceleration magnitude for a body with ballistic coefficient `bc`. */
export function dragAccel(speed, altitude, bc) {
  const rho = airDensity(altitude);
  return (0.5 * rho * speed * speed) / Math.max(1, bc);
}

/**
 * Integrate a body one step under gravity, drag and an optional commanded
 * acceleration. Returns the acceleration actually applied (useful for shaking
 * fins and drawing control-correction puffs).
 */
export function integrateBody(body, dt, commandedAccel = null, out = new THREE.Vector3()) {
  out.set(0, -GRAVITY, 0);
  const speed = body.vel.length();
  if (speed > 1e-3 && body.bc) {
    const dA = dragAccel(speed, body.pos.y, body.bc);
    out.addScaledVector(_a.copy(body.vel).multiplyScalar(1 / speed), -dA);
  }
  if (commandedAccel) out.add(commandedAccel);
  body.vel.addScaledVector(out, dt);
  body.pos.addScaledVector(body.vel, dt);
  return out;
}

/**
 * Acceleration-limited steering toward a desired direction.
 *
 * Produces the smooth, slightly lagging corrections that make guided flight
 * look purposeful instead of jittery: the command is low-pass filtered and
 * clamped to a lateral-g budget that falls off in thin air.
 */
export function steeringAccel(vel, desiredDir, maxLateralG, altitude, dt, state, out = new THREE.Vector3()) {
  const speed = vel.length();
  if (speed < 1e-3) return out.set(0, 0, 0);
  _a.copy(vel).multiplyScalar(1 / speed);
  _b.copy(desiredDir).normalize();

  // Lateral component of the desired direction (remove anything along the axis).
  _c.copy(_b).addScaledVector(_a, -_b.dot(_a));
  const lat = _c.length();
  if (lat < 1e-5) {
    if (state) state.command.multiplyScalar(Math.exp(-6 * dt));
    return out.copy(state ? state.command : _c.set(0, 0, 0));
  }
  _c.multiplyScalar(1 / lat);

  // Control authority thins out with the air, but never vanishes entirely -
  // a small reaction-control budget keeps high intercepts playable.
  const rhoFrac = airDensity(altitude) / SEA_LEVEL_DENSITY;
  const authority = lerp(0.32, 1.0, saturate(rhoFrac * 2.2));
  const maxA = maxLateralG * GRAVITY * authority;

  // Angle-proportional demand, saturating well before the limit so the missile
  // does not slam between extremes.
  const angle = Math.asin(clamp(lat, -1, 1));
  const demand = clamp(angle / 0.35, 0, 1) * maxA;
  _d.copy(_c).multiplyScalar(demand);

  if (state) {
    // First-order autopilot lag: this is what removes nervous jitter.
    const k = 1 - Math.exp(-state.responseRate * dt);
    state.command.lerp(_d, k);
    out.copy(state.command);
  } else {
    out.copy(_d);
  }
  const mag = out.length();
  if (mag > maxA) out.multiplyScalar(maxA / mag);
  return out;
}

/**
 * Align a body's +Y axis with its velocity, with a small amount of angle of
 * attack so a manoeuvring missile visibly leans into its turn.
 */
export function orientToVelocity(quat, vel, lateralAccel = null, dt = 1, rate = 14) {
  const speed = vel.length();
  if (speed < 1e-4) return quat;
  _a.copy(vel).multiplyScalar(1 / speed);
  if (lateralAccel && lateralAccel.lengthSq() > 1e-6) {
    // Nose points slightly into the commanded acceleration (angle of attack).
    _b.copy(lateralAccel).multiplyScalar(-0.0016);
    _a.add(_b).normalize();
  }
  _q.setFromUnitVectors(FORWARD_AXIS, _a);
  const t = 1 - Math.exp(-rate * dt);
  quat.slerp(_q, clamp(t, 0, 1));
  return quat;
}

/**
 * Solve a lofted ballistic launch velocity from `from` to `to` reaching roughly
 * `apogee` metres above the higher endpoint. Used to place incoming threats on
 * cinematic arcs.
 */
export function ballisticArcVelocity(from, to, apogee, out = new THREE.Vector3()) {
  const rise = Math.max(1, apogee - from.y);
  const vy = Math.sqrt(2 * GRAVITY * rise);
  const tUp = vy / GRAVITY;
  const fall = Math.max(1, apogee - to.y);
  const tDown = Math.sqrt((2 * fall) / GRAVITY);
  const total = Math.max(0.5, tUp + tDown);
  out.copy(to).sub(from);
  out.y = 0;
  out.multiplyScalar(1 / total);
  out.y = vy;
  return out;
}

/** Time for a ballistic body to fall from `y` to `targetY` given vertical speed. */
export function timeToAltitude(y, vy, targetY) {
  const a = -0.5 * GRAVITY;
  const b = vy;
  const c = y - targetY;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const s = Math.sqrt(disc);
  const t1 = (-b + s) / (2 * a);
  const t2 = (-b - s) / (2 * a);
  const cands = [t1, t2].filter((t) => t > 0);
  return cands.length ? Math.min(...cands) : Infinity;
}

/* ------------------------------------------------------------------ *
 * World collision (player capsule vs. static base geometry)
 * ------------------------------------------------------------------ */

/**
 * A yaw-rotated box collider. All base structures register one or more of
 * these so the player cannot walk through shelters, launchers or barriers.
 */
export class BoxCollider {
  constructor(cx, cy, cz, hx, hy, hz, yaw = 0, tag = '') {
    this.center = new THREE.Vector3(cx, cy, cz);
    this.half = new THREE.Vector3(hx, hy, hz);
    this.yaw = yaw;
    this.tag = tag;
    this.cos = Math.cos(-yaw);
    this.sin = Math.sin(-yaw);
    this.radius = this.half.length();
  }

  /** World point -> box local space. */
  toLocal(p, out) {
    const dx = p.x - this.center.x;
    const dz = p.z - this.center.z;
    out.set(dx * this.cos - dz * this.sin, p.y - this.center.y, dx * this.sin + dz * this.cos);
    return out;
  }

  /** Box local vector -> world. */
  toWorldDir(v, out) {
    out.set(v.x * this.cos + v.z * this.sin, v.y, -v.x * this.sin + v.z * this.cos);
    return out;
  }
}

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.cellSize = 12;
  }

  add(box) {
    this.boxes.push(box);
    return box;
  }

  addBox(cx, cy, cz, hx, hy, hz, yaw = 0, tag = '') {
    return this.add(new BoxCollider(cx, cy, cz, hx, hy, hz, yaw, tag));
  }

  clear() {
    this.boxes.length = 0;
    this.grid.clear();
  }

  /** Build a coarse uniform grid so the player only tests nearby colliders. */
  build() {
    this.grid.clear();
    const cs = this.cellSize;
    for (const box of this.boxes) {
      const r = Math.hypot(box.half.x, box.half.z);
      const x0 = Math.floor((box.center.x - r) / cs);
      const x1 = Math.floor((box.center.x + r) / cs);
      const z0 = Math.floor((box.center.z - r) / cs);
      const z1 = Math.floor((box.center.z + r) / cs);
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const key = x * 73856093 ^ (z * 19349663);
          let list = this.grid.get(key);
          if (!list) this.grid.set(key, (list = []));
          list.push(box);
        }
      }
    }
    return this;
  }

  query(x, z, out) {
    out.length = 0;
    const cs = this.cellSize;
    const cx = Math.floor(x / cs);
    const cz = Math.floor(z / cs);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = (cx + i) * 73856093 ^ ((cz + j) * 19349663);
        const list = this.grid.get(key);
        if (!list) continue;
        for (const b of list) if (!out.includes(b)) out.push(b);
      }
    }
    return out;
  }
}

const _local = new THREE.Vector3();
const _push = new THREE.Vector3();
const _worldPush = new THREE.Vector3();
const _scratch = [];

/**
 * Push a vertical capsule out of the world.
 *
 * `pos` is the capsule's foot position. The capsule spans [radius, height -
 * radius] above it. Returns the number of contacts resolved plus the highest
 * support surface found under the capsule (so the player can step onto pads).
 */
export function resolveCapsule(world, pos, radius, height, maxIterations = 3) {
  let contacts = 0;
  let groundY = -Infinity;
  const segLo = radius;
  const segHi = Math.max(radius, height - radius);
  const stepHeight = 0.55;

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;
    world.query(pos.x, pos.z, _scratch);
    for (const box of _scratch) {
      box.toLocal(pos, _local);
      // Closest point on the capsule segment (in box space) to the box.
      const clampedY = clamp(_local.y + (segLo + segHi) / 2, -box.half.y, box.half.y);
      // Evaluate the sphere centre nearest that height.
      const sphereY = clamp(clampedY - _local.y, segLo, segHi);
      const px = _local.x;
      const py = _local.y + sphereY;
      const pz = _local.z;
      const cx = clamp(px, -box.half.x, box.half.x);
      const cy = clamp(py, -box.half.y, box.half.y);
      const cz = clamp(pz, -box.half.z, box.half.z);
      const dx = px - cx;
      const dy = py - cy;
      const dz = pz - cz;
      const distSq = dx * dx + dy * dy + dz * dz;

      const top = box.center.y + box.half.y;
      const insideXZ =
        Math.abs(px) <= box.half.x + radius * 0.6 && Math.abs(pz) <= box.half.z + radius * 0.6;
      if (insideXZ && top <= pos.y + stepHeight && top > groundY) groundY = top;

      if (distSq >= radius * radius) continue;
      if (distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        _push.set(dx / dist, dy / dist, dz / dist).multiplyScalar(radius - dist);
      } else {
        // Deeply embedded: escape along the axis of least penetration.
        const ox = box.half.x + radius - Math.abs(px);
        const oy = box.half.y + radius - Math.abs(py);
        const oz = box.half.z + radius - Math.abs(pz);
        if (ox < oy && ox < oz) _push.set(Math.sign(px || 1) * ox, 0, 0);
        else if (oz < oy) _push.set(0, 0, Math.sign(pz || 1) * oz);
        else _push.set(0, Math.sign(py || 1) * oy, 0);
      }
      // Never resolve straight up onto tall geometry, and never through the floor.
      if (_push.y > 0 && top > pos.y + stepHeight) _push.y = 0;
      if (_push.y < 0) _push.y = 0;
      box.toWorldDir(_push, _worldPush);
      pos.add(_worldPush);
      contacts++;
      moved = true;
    }
    if (!moved) break;
  }
  return { contacts, groundY };
}

/** Sphere-vs-world test used for interceptor / debris ground clutter checks. */
export function sphereHitsWorld(world, p, radius) {
  world.query(p.x, p.z, _scratch);
  for (const box of _scratch) {
    box.toLocal(p, _local);
    const cx = clamp(_local.x, -box.half.x, box.half.x);
    const cy = clamp(_local.y, -box.half.y, box.half.y);
    const cz = clamp(_local.z, -box.half.z, box.half.z);
    const dx = _local.x - cx;
    const dy = _local.y - cy;
    const dz = _local.z - cz;
    if (dx * dx + dy * dy + dz * dz < radius * radius) return box;
  }
  return null;
}

export { _m as _physicsScratchMatrix, UP as WORLD_UP };
