// Simplified flight physics for threats and interceptors.
//
// DESIGN NOTE: this is deliberately a *game* model, not a fire-control or
// aeroballistic simulation. It reproduces the visual character of ballistic
// flight - curved arcs, thinning air, thrust phases, smoothly limited
// steering - using compressed, fictional numbers chosen for readability and
// spectacle. No real system performance envelope is represented.
import * as THREE from 'three';

export const GRAVITY = 9.81;
export const SEA_LEVEL_DENSITY = 1.225;
export const SCALE_HEIGHT = 8200; // metres, fictionalised exponential atmosphere

/** Exponential atmosphere used for drag and for trail persistence. */
export function airDensity(altitude) {
  return SEA_LEVEL_DENSITY * Math.exp(-Math.max(0, altitude) / SCALE_HEIGHT);
}

/** 0 at sea level, 1 in effectively vacuum - drives trail fade + width. */
export function densityRatio(altitude) {
  return airDensity(altitude) / SEA_LEVEL_DENSITY;
}

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _tmp3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, 1);

/**
 * Semi-implicit Euler step with gravity and quadratic drag.
 * @param {THREE.Vector3} pos
 * @param {THREE.Vector3} vel
 * @param {THREE.Vector3} accel extra acceleration (thrust + steering)
 * @param {number} dt
 * @param {number} ballisticCoeff mass/(Cd*A); larger = less drag
 */
export function integrate(pos, vel, accel, dt, ballisticCoeff = 3200) {
  const rho = airDensity(pos.y);
  const speed = vel.length();
  // quadratic drag: a = -(rho * v^2) / (2 * BC) along velocity
  const dragMag = speed > 0.001 ? (rho * speed * speed) / (2 * ballisticCoeff) : 0;
  _tmp.copy(vel).multiplyScalar(speed > 0.001 ? -dragMag / speed : 0);
  _tmp.add(accel);
  _tmp.y -= GRAVITY;
  vel.addScaledVector(_tmp, dt);
  pos.addScaledVector(vel, dt);
  return { rho, speed, dragMag };
}

/**
 * Time-to-go against a constant-velocity target, solved in closed form.
 *
 * The meeting condition |tgtPos + tgtVel*t - selfPos| = selfSpeed*t is a
 * quadratic in t. Solving it directly matters: the obvious fixed-point
 * iteration only converges while the interceptor is the faster body, and a
 * round that has bled its energy (or has not built any up yet) drives it to
 * absurd values, which drags the aim point tens of kilometres off into space.
 *
 * When no meeting exists - the target is simply faster and opening - there is
 * no lead to compute, so we fall back to the time of closest approach. That
 * keeps a doomed round pointed sensibly at its target instead of chasing a
 * runaway solution.
 */
export function timeToGo(selfPos, selfSpeed, tgtPos, tgtVel) {
  const s = Math.max(selfSpeed, 50);
  _tmp.copy(tgtPos).sub(selfPos);
  const rr = _tmp.lengthSq();
  const rv = _tmp.dot(tgtVel);
  const vv = tgtVel.lengthSq();
  const a = vv - s * s;
  let t = Infinity;
  if (Math.abs(a) < 1e-6) {
    if (rv < -1e-6) t = rr / (-2 * rv);
  } else {
    const disc = rv * rv - a * rr;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      const t1 = (-rv + root) / a;
      const t2 = (-rv - root) / a;
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      t = lo > 1e-4 ? lo : (hi > 1e-4 ? hi : Infinity);
    }
  }
  if (!Number.isFinite(t)) t = vv > 1e-6 ? Math.max(0, -rv / vv) : 0;
  return t;
}

/**
 * Predicted intercept point using the simplified lead model: constant target
 * velocity, plus an optional upward bias that compensates for the interceptor's
 * own gravity drop over the time of flight. `gravityComp` of 0 gives the plain
 * meeting point (what the HUD cue should show); a positive value raises the aim
 * so a gravity-affected round actually arrives there. `maxLead` bounds how far
 * ahead we are willing to extrapolate - beyond a round's own remaining burn
 * time the constant-velocity assumption is worthless and the bias term, which
 * grows with t^2, starts to dominate. Written into `out`.
 */
export function predictInterceptPoint(out, selfPos, selfSpeed, tgtPos, tgtVel, gravityComp = 0, maxLead = Infinity) {
  const t = Math.min(timeToGo(selfPos, selfSpeed, tgtPos, tgtVel), maxLead);
  out.copy(tgtVel).multiplyScalar(t).add(tgtPos);
  if (gravityComp) out.y += 0.5 * GRAVITY * gravityComp * t * t;
  return t;
}

/**
 * Lead-pursuit steering command. Produces an acceleration perpendicular to the
 * current velocity so the missile banks smoothly onto the aim point instead of
 * snapping. `state.aCmd` low-pass filters the command which removes the nervous
 * jitter that naive pursuit produces near the intercept.
 *
 * @returns {number} estimated time to go
 */
export function steerToward(state, aimPoint, dt, {
  maxLateral = 90,
  gain = 3.4,
  tau = 0.16,
  damping = 0.55,
} = {}) {
  const speed = state.vel.length();
  if (speed < 1) return 0;
  _tmp.copy(state.vel).divideScalar(speed); // velocity unit
  _tmp2.copy(aimPoint).sub(state.pos);
  const dist = _tmp2.length();
  if (dist < 0.001) return 0;
  _tmp2.divideScalar(dist); // desired unit

  // perpendicular error component
  const along = _tmp2.dot(_tmp);
  _tmp3.copy(_tmp2).addScaledVector(_tmp, -along);
  const errMag = _tmp3.length();

  // proportional term on angular error, scaled by closing speed like a
  // simplified proportional-navigation law
  let cmdMag = gain * errMag * speed;
  // brake the command when the error is already shrinking fast
  cmdMag *= 1 - damping * Math.min(1, state.prevErr !== undefined ? Math.max(0, state.prevErr - errMag) * 8 : 0);
  cmdMag = Math.min(cmdMag, maxLateral);
  if (errMag > 1e-5) _tmp3.multiplyScalar(cmdMag / errMag);

  // low-pass filter towards the new command (smooth fin deflection)
  const k = 1 - Math.exp(-dt / Math.max(tau, 1e-3));
  state.aCmd.lerp(_tmp3, k);
  state.prevErr = errMag;
  state.errMag = errMag;
  return dist / Math.max(speed, 1);
}

/** Align a mesh's +Z axis with a velocity vector, with optional roll drift. */
export function orientToVelocity(obj, vel, roll = 0, slerp = 1) {
  if (vel.lengthSq() < 1e-6) return;
  _tmp.copy(vel).normalize();
  _q.setFromUnitVectors(FWD, _tmp);
  if (roll) {
    _tmp2.copy(_tmp);
    const rq = new THREE.Quaternion().setFromAxisAngle(_tmp2, roll);
    _q.premultiply(rq);
  }
  if (slerp >= 1) obj.quaternion.copy(_q);
  else obj.quaternion.slerp(_q, slerp);
}

/**
 * Solve the launch elevation/azimuth for a ballistic threat so it lands on a
 * target point after roughly `flightTime` seconds. Drag is ignored in the
 * solve; the integrator's drag then makes the real arc fall slightly short,
 * which we compensate with a small overshoot factor.
 */
export function ballisticLaunchVelocity(out, from, to, flightTime, overshoot = 1.06) {
  out.copy(to).sub(from).divideScalar(flightTime);
  out.y += 0.5 * GRAVITY * flightTime;
  out.multiplyScalar(overshoot);
  return out;
}

// ---------------------------------------------------------------------------
// World collision (player capsule vs. static boxes and cylinders)
// ---------------------------------------------------------------------------

export class CollisionWorld {
  constructor() {
    /** @type {{min:THREE.Vector3,max:THREE.Vector3,tag:string}[]} */
    this.boxes = [];
    /** @type {{c:THREE.Vector3,r:number,h:number,tag:string}[]} */
    this.cylinders = [];
    this.grid = new Map();
    this.cell = 16;
  }

  addBox(center, size, tag = '') {
    const half = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
    const box = {
      min: new THREE.Vector3().copy(center).sub(half),
      max: new THREE.Vector3().copy(center).add(half),
      tag,
    };
    this.boxes.push(box);
    this._index(box);
    return box;
  }

  /** Adds a rotated box by taking its world AABB - fine for movement blocking. */
  addObjectAABB(object3D, tag = '', pad = 0) {
    object3D.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(object3D);
    if (b.isEmpty()) return null;
    if (pad) b.expandByScalar(pad);
    const box = { min: b.min.clone(), max: b.max.clone(), tag };
    this.boxes.push(box);
    this._index(box);
    return box;
  }

  addCylinder(center, radius, height, tag = '') {
    const cyl = { c: center.clone(), r: radius, h: height, tag };
    this.cylinders.push(cyl);
    return cyl;
  }

  _index(box) {
    const c = this.cell;
    const x0 = Math.floor(box.min.x / c);
    const x1 = Math.floor(box.max.x / c);
    const z0 = Math.floor(box.min.z / c);
    const z1 = Math.floor(box.max.z / c);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const key = x + ',' + z;
        let arr = this.grid.get(key);
        if (!arr) this.grid.set(key, (arr = []));
        arr.push(box);
      }
    }
  }

  nearby(pos, radius) {
    const c = this.cell;
    const out = [];
    const x0 = Math.floor((pos.x - radius) / c);
    const x1 = Math.floor((pos.x + radius) / c);
    const z0 = Math.floor((pos.z - radius) / c);
    const z1 = Math.floor((pos.z + radius) / c);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const arr = this.grid.get(x + ',' + z);
        if (arr) for (const b of arr) if (!out.includes(b)) out.push(b);
      }
    }
    return out;
  }

  /**
   * Resolve a vertical capsule (feet at pos.y, height h, radius r) against the
   * static world. Mutates `pos`. Returns true when something was hit.
   */
  resolveCapsule(pos, radius, height) {
    let hit = false;
    const candidates = this.nearby(pos, radius + 2);
    const feet = pos.y;
    const head = pos.y + height;
    for (const b of candidates) {
      if (head < b.min.y || feet > b.max.y) continue;
      // closest point on box in XZ
      const cx = Math.max(b.min.x, Math.min(pos.x, b.max.x));
      const cz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      let d2 = dx * dx + dz * dz;
      if (d2 > radius * radius) continue;
      hit = true;
      if (d2 < 1e-8) {
        // centre inside the box footprint: eject along the shallowest axis
        const dxMin = pos.x - b.min.x;
        const dxMax = b.max.x - pos.x;
        const dzMin = pos.z - b.min.z;
        const dzMax = b.max.z - pos.z;
        const m = Math.min(dxMin, dxMax, dzMin, dzMax);
        if (m === dxMin) pos.x = b.min.x - radius;
        else if (m === dxMax) pos.x = b.max.x + radius;
        else if (m === dzMin) pos.z = b.min.z - radius;
        else pos.z = b.max.z + radius;
      } else {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
    for (const cyl of this.cylinders) {
      if (head < cyl.c.y - cyl.h / 2 || feet > cyl.c.y + cyl.h / 2) continue;
      const dx = pos.x - cyl.c.x;
      const dz = pos.z - cyl.c.z;
      const d = Math.hypot(dx, dz);
      const rr = cyl.r + radius;
      if (d < rr && d > 1e-6) {
        hit = true;
        pos.x = cyl.c.x + (dx / d) * rr;
        pos.z = cyl.c.z + (dz / d) * rr;
      }
    }
    return hit;
  }

  /** Highest surface under a point that the player can stand on. */
  supportHeight(pos, maxStep = 0.9, from = 3.0) {
    let best = -Infinity;
    for (const b of this.nearby(pos, 0.6)) {
      if (pos.x < b.min.x - 0.35 || pos.x > b.max.x + 0.35) continue;
      if (pos.z < b.min.z - 0.35 || pos.z > b.max.z + 0.35) continue;
      if (b.max.y <= pos.y + maxStep && b.max.y > best && b.max.y > pos.y - from) best = b.max.y;
    }
    return best === -Infinity ? null : best;
  }

  clear() {
    this.boxes.length = 0;
    this.cylinders.length = 0;
    this.grid.clear();
  }
}
