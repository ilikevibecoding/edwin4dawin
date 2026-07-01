import * as THREE from 'three';

// Hand-rolled rigid-prop physics: gravity + world-space AABBs derived from each
// prop's oriented box, resolved against the floor, static colliders, and each
// other. Props tumble freely in the air and get snapped toward the nearest
// axis-aligned orientation while settling on a surface.

const GRAVITY = -11.0;
const FIXED_DT = 1 / 120;
const MAX_SUBSTEPS = 6;

const _m4 = new THREE.Matrix4();
const _m3 = new THREE.Matrix3();
const _q = new THREE.Quaternion();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export class PropBody {
  constructor(obj, halfExtents, name, room) {
    this.obj = obj;
    this.e = halfExtents.clone();
    this.name = name;
    this.room = room;
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.held = false;
    this.sleeping = false;
    this.restTimer = 0;
    this.binned = false;
    this.noPushTimer = 0; // grace period after release: palm can't shove it
    this.radius = Math.hypot(this.e.x, this.e.z);
    this.we = new THREE.Vector3(); // world-space half extents
    this.min = new THREE.Vector3();
    this.max = new THREE.Vector3();
    this.updateBounds();
  }

  updateBounds() {
    _m3.setFromMatrix4(_m4.makeRotationFromQuaternion(this.obj.quaternion));
    const el = _m3.elements; // column-major
    const e = this.e;
    this.we.set(
      Math.abs(el[0]) * e.x + Math.abs(el[3]) * e.y + Math.abs(el[6]) * e.z,
      Math.abs(el[1]) * e.x + Math.abs(el[4]) * e.y + Math.abs(el[7]) * e.z,
      Math.abs(el[2]) * e.x + Math.abs(el[5]) * e.y + Math.abs(el[8]) * e.z,
    );
    this.min.copy(this.obj.position).sub(this.we);
    this.max.copy(this.obj.position).add(this.we);
  }

  wake() {
    this.sleeping = false;
    this.restTimer = 0;
  }

  // Half-size of this prop projected onto a world-space unit axis.
  extentAlong(axis) {
    _m3.setFromMatrix4(_m4.makeRotationFromQuaternion(this.obj.quaternion));
    const el = _m3.elements;
    return (
      Math.abs(axis.x * el[0] + axis.y * el[1] + axis.z * el[2]) * this.e.x +
      Math.abs(axis.x * el[3] + axis.y * el[4] + axis.z * el[5]) * this.e.y +
      Math.abs(axis.x * el[6] + axis.y * el[7] + axis.z * el[8]) * this.e.z
    );
  }
}

export class PhysicsWorld {
  constructor(staticColliders) {
    this.props = [];
    this.statics = staticColliders;
    this.onImpact = null; // (prop, speed) => void
    this.accum = 0;
  }

  add(prop) {
    this.props.push(prop);
  }

  step(dt) {
    this.accum = Math.min(this.accum + dt, FIXED_DT * MAX_SUBSTEPS);
    while (this.accum >= FIXED_DT) {
      this.substep(FIXED_DT);
      this.accum -= FIXED_DT;
    }
  }

  substep(h) {
    const props = this.props;
    for (const p of props) {
      if (p.held || p.sleeping) continue;
      this.integrate(p, h);
    }
    // prop-vs-prop, cheap O(n^2) — prop counts stay ~32
    for (let i = 0; i < props.length; i++) {
      const a = props[i];
      if (a.held) continue;
      for (let j = i + 1; j < props.length; j++) {
        const b = props[j];
        if (b.held || (a.sleeping && b.sleeping)) continue;
        this.resolvePair(a, b);
      }
    }
  }

  integrate(p, h) {
    if (p.noPushTimer > 0) p.noPushTimer -= h;
    p.vel.y += GRAVITY * h;
    const drag = Math.exp(-0.1 * h);
    p.vel.multiplyScalar(drag);
    if (p.vel.lengthSq() > 64) p.vel.setLength(8);
    p.obj.position.addScaledVector(p.vel, h);

    const w = p.angVel.length();
    if (w > 1e-4) {
      _q.setFromAxisAngle(_v1.copy(p.angVel).divideScalar(w), w * h);
      p.obj.quaternion.premultiply(_q).normalize();
    }
    p.updateBounds();

    let grounded = false;

    // floor plane y=0
    if (p.min.y < 0) {
      p.obj.position.y -= p.min.y;
      if (p.vel.y < 0) {
        const impact = -p.vel.y;
        p.vel.y = impact > 1.4 ? impact * 0.26 : 0;
        p.angVel.multiplyScalar(impact > 1.4 ? 0.55 : 0.8);
        if (impact > 0.9 && this.onImpact) this.onImpact(p, impact);
      }
      grounded = true;
      p.updateBounds();
    }

    // static AABBs
    for (const c of this.statics) {
      grounded = this.resolveStatic(p, c) || grounded;
    }

    if (grounded) {
      const fr = Math.exp(-7.0 * h);
      p.vel.x *= fr;
      p.vel.z *= fr;
      p.angVel.multiplyScalar(Math.exp(-6.0 * h));
      this.settleOrientation(p, h);

      if (p.vel.lengthSq() < 0.0016 && p.angVel.lengthSq() < 0.01) {
        p.restTimer += h;
        if (p.restTimer > 0.35) {
          p.sleeping = true;
          p.vel.set(0, 0, 0);
          p.angVel.set(0, 0, 0);
        }
      } else {
        p.restTimer = 0;
      }
    } else {
      p.restTimer = 0;
    }
  }

  resolveStatic(p, c) {
    const ox = Math.min(p.max.x, c.max.x) - Math.max(p.min.x, c.min.x);
    if (ox <= 0) return false;
    const oy = Math.min(p.max.y, c.max.y) - Math.max(p.min.y, c.min.y);
    if (oy <= 0) return false;
    const oz = Math.min(p.max.z, c.max.z) - Math.max(p.min.z, c.min.z);
    if (oz <= 0) return false;

    const cx = (c.min.x + c.max.x) / 2;
    const cy = (c.min.y + c.max.y) / 2;
    const cz = (c.min.z + c.max.z) / 2;
    let grounded = false;

    if (ox <= oy && ox <= oz) {
      const s = p.obj.position.x < cx ? -1 : 1;
      p.obj.position.x += s * ox;
      if (p.vel.x * s < 0) p.vel.x = -p.vel.x * 0.2;
      p.angVel.multiplyScalar(0.9);
    } else if (oy <= ox && oy <= oz) {
      const s = p.obj.position.y < cy ? -1 : 1;
      p.obj.position.y += s * oy;
      if (p.vel.y * s < 0) {
        const impact = Math.abs(p.vel.y);
        p.vel.y = impact > 1.4 ? -p.vel.y * 0.24 : 0;
        if (s > 0 && impact > 0.9 && this.onImpact) this.onImpact(p, impact);
      }
      if (s > 0) grounded = true; // resting on top of furniture
    } else {
      const s = p.obj.position.z < cz ? -1 : 1;
      p.obj.position.z += s * oz;
      if (p.vel.z * s < 0) p.vel.z = -p.vel.z * 0.2;
      p.angVel.multiplyScalar(0.9);
    }
    p.updateBounds();
    return grounded;
  }

  resolvePair(a, b) {
    const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    if (ox <= 0) return;
    const oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
    if (oy <= 0) return;
    const oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    if (oz <= 0) return;

    a.wake();
    b.wake();

    let axis, overlap;
    if (ox <= oy && ox <= oz) { axis = 'x'; overlap = ox; }
    else if (oy <= ox && oy <= oz) { axis = 'y'; overlap = oy; }
    else { axis = 'z'; overlap = oz; }

    const s = a.obj.position[axis] < b.obj.position[axis] ? -1 : 1;
    a.obj.position[axis] += s * overlap * 0.5;
    b.obj.position[axis] -= s * overlap * 0.5;

    const va = a.vel[axis];
    const vb = b.vel[axis];
    if ((vb - va) * s > 0) {
      const mean = (va + vb) / 2;
      const rest = 0.25;
      a.vel[axis] = mean + rest * (vb - va) * 0.5;
      b.vel[axis] = mean + rest * (va - vb) * 0.5;
    }
    a.updateBounds();
    b.updateBounds();
  }

  // Slerp toward the nearest axis-aligned orientation while a prop comes to
  // rest so boxes/cylinders end up lying flat instead of frozen mid-tumble.
  settleOrientation(p, h) {
    if (p.angVel.lengthSq() > 1.2) return;
    _m3.setFromMatrix4(_m4.makeRotationFromQuaternion(p.obj.quaternion));
    const el = _m3.elements;
    const cols = [
      new THREE.Vector3(el[0], el[1], el[2]),
      new THREE.Vector3(el[3], el[4], el[5]),
      new THREE.Vector3(el[6], el[7], el[8]),
    ];
    const snapped = [];
    const used = new Set();
    for (const c of cols) {
      const ax = Math.abs(c.x); const ay = Math.abs(c.y); const az = Math.abs(c.z);
      let idx = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
      if (used.has(idx)) return; // degenerate this frame, skip
      used.add(idx);
      const v = new THREE.Vector3();
      v.setComponent(idx, Math.sign(c.getComponent(idx)) || 1);
      snapped.push(v);
    }
    _m4.makeBasis(snapped[0], snapped[1], snapped[2]);
    _q.setFromRotationMatrix(_m4);
    p.obj.quaternion.slerp(_q, 1 - Math.exp(-7.5 * h));
  }

  // Kinematic sphere push (robot base ring, moving gripper). exclude lets the
  // caller skip props sitting between open pincers so lowering onto a target
  // doesn't shove it away.
  pushSphere(center, radius, velocity, opts = {}) {
    for (const p of this.props) {
      if (p.held || p.noPushTimer > 0) continue;
      if (opts.exclude && opts.exclude(p)) continue;
      _v1.set(
        Math.max(p.min.x, Math.min(center.x, p.max.x)),
        Math.max(p.min.y, Math.min(center.y, p.max.y)),
        Math.max(p.min.z, Math.min(center.z, p.max.z)),
      );
      _v2.copy(_v1).sub(center);
      if (opts.horizontal) _v2.y = 0;
      const d = _v2.length();
      if (d >= radius) continue;
      p.wake();
      const dir = d > 1e-4 ? _v2.divideScalar(d) : _v2.set(1, 0, 0);
      const push = radius - d;
      p.obj.position.addScaledVector(dir, push * 0.65);
      p.vel.addScaledVector(dir, push * 10);
      if (velocity) p.vel.addScaledVector(velocity, 0.55);
      if (!opts.horizontal) p.angVel.set(
        (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      p.updateBounds();
    }
  }

  warmUp(steps = 150) {
    for (let i = 0; i < steps; i++) this.substep(1 / 60);
  }
}
