// Seeded random numbers and the small geometry helpers the choreography shares: an oriented-box overlap
// test for keeping hulls apart and quaternion utilities for slow turns. Everything here is allocation
// free once constructed so it can run inside the per-frame loops.
import * as THREE from "three";

// mulberry32: tiny, fast, good enough for layout and battle randomness; returns [0, 1)
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.sign = () => (r() < 0.5 ? -1 : 1);
  r.pick = (arr) => arr[Math.min(arr.length - 1, Math.floor(r() * arr.length))];
  r.int = (n) => Math.min(n - 1, Math.floor(r() * n));
  return r;
}

// ---------------------------------------------------------------------------
// Oriented bounding boxes (hull footprints)
// ---------------------------------------------------------------------------

// Half extents and centre offset of a model from its LOD-0 geometry (the bounding sphere the models
// declare is far too conservative for a flat wedge, so close passes need the real box).
export function modelBox(model) {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  let any = false;
  for (const p of model.parts) {
    if (p.lod !== 0) continue;
    const g = p.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox) continue;
    tmp.copy(g.boundingBox);
    if (any) box.union(tmp);
    else {
      box.copy(tmp);
      any = true;
    }
  }
  if (!any) {
    const r = model.bounds ? model.bounds.radius : model.length * 0.5;
    return {
      cx: 0,
      cy: 0,
      cz: 0,
      hx: r * 0.45,
      hy: r * 0.25,
      hz: model.length * 0.5,
    };
  }
  return {
    cx: (box.min.x + box.max.x) * 0.5,
    cy: (box.min.y + box.max.y) * 0.5,
    cz: (box.min.z + box.max.z) * 0.5,
    hx: Math.max(20, (box.max.x - box.min.x) * 0.5),
    hy: Math.max(20, (box.max.y - box.min.y) * 0.5),
    hz: Math.max(20, (box.max.z - box.min.z) * 0.5),
  };
}

// scratch for the separating-axis test
const _R = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const _AR = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const _t = [0, 0, 0];
const _ca = new THREE.Vector3();
const _cb = new THREE.Vector3();
const _d = new THREE.Vector3();
const _ea = [0, 0, 0];
const _eb = [0, 0, 0];

// Do the oriented boxes of two ships (given their world matrices and model boxes) come within `margin`
// metres of each other? Gottschalk's 15-axis separating-axis test; `margin` inflates both boxes.
export function boxesOverlap(mA, boxA, mB, boxB, margin = 0) {
  const a = mA.elements;
  const b = mB.elements;
  // world centres of the boxes (matrix * local centre offset)
  _ca.set(boxA.cx, boxA.cy, boxA.cz).applyMatrix4(mA);
  _cb.set(boxB.cx, boxB.cy, boxB.cz).applyMatrix4(mB);
  _d.subVectors(_cb, _ca);
  _ea[0] = boxA.hx + margin;
  _ea[1] = boxA.hy + margin;
  _ea[2] = boxA.hz + margin;
  _eb[0] = boxB.hx + margin;
  _eb[1] = boxB.hy + margin;
  _eb[2] = boxB.hz + margin;
  // axes are the matrix columns (unit scale); R[i][j] = Ai . Bj, t = d expressed in A's frame
  for (let i = 0; i < 3; i++) {
    const ax = a[i * 4];
    const ay = a[i * 4 + 1];
    const az = a[i * 4 + 2];
    _t[i] = _d.x * ax + _d.y * ay + _d.z * az;
    for (let j = 0; j < 3; j++) {
      const r = ax * b[j * 4] + ay * b[j * 4 + 1] + az * b[j * 4 + 2];
      _R[i * 3 + j] = r;
      _AR[i * 3 + j] = Math.abs(r) + 1e-6;
    }
  }
  // A's axes
  for (let i = 0; i < 3; i++) {
    const ra = _ea[i];
    const rb =
      _eb[0] * _AR[i * 3] + _eb[1] * _AR[i * 3 + 1] + _eb[2] * _AR[i * 3 + 2];
    if (Math.abs(_t[i]) > ra + rb) return false;
  }
  // B's axes
  for (let j = 0; j < 3; j++) {
    const ra = _ea[0] * _AR[j] + _ea[1] * _AR[3 + j] + _ea[2] * _AR[6 + j];
    const rb = _eb[j];
    const t = _t[0] * _R[j] + _t[1] * _R[3 + j] + _t[2] * _R[6 + j];
    if (Math.abs(t) > ra + rb) return false;
  }
  // cross products Ai x Bj
  for (let i = 0; i < 3; i++) {
    const i1 = (i + 1) % 3;
    const i2 = (i + 2) % 3;
    for (let j = 0; j < 3; j++) {
      const j1 = (j + 1) % 3;
      const j2 = (j + 2) % 3;
      const ra = _ea[i1] * _AR[i2 * 3 + j] + _ea[i2] * _AR[i1 * 3 + j];
      const rb = _eb[j1] * _AR[i * 3 + j2] + _eb[j2] * _AR[i * 3 + j1];
      const t = _t[i2] * _R[i1 * 3 + j] - _t[i1] * _R[i2 * 3 + j];
      if (Math.abs(t) > ra + rb) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Orientation helpers
// ---------------------------------------------------------------------------
const _fwd = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _qi = new THREE.Quaternion();

// Angular velocity (in the ship's local frame, as fleet.update applies it) that turns the ship's nose
// (-Z) toward `dirWorld` at most `maxRate` rad/s, proportional below `gain` radians of error.
export function steerToward(ship, dirWorld, maxRate, gain, out) {
  _fwd.set(0, 0, -1).applyQuaternion(ship.quaternion);
  _axis.crossVectors(_fwd, dirWorld);
  const s = _axis.length();
  const c = _fwd.dot(dirWorld);
  const ang = Math.atan2(s, c);
  if (s < 1e-6 || ang < 1e-4) return out.set(0, 0, 0);
  const rate = Math.min(maxRate, ang * gain);
  _axis.multiplyScalar(rate / s);
  // world -> local
  _qi.copy(ship.quaternion).invert();
  return out.copy(_axis).applyQuaternion(_qi);
}

export function dirFromYawPitch(yaw, pitch, out) {
  // nose direction for a ship with yaw about +Y (yaw 0 = -Z) and pitch (positive = nose up)
  const cp = Math.cos(pitch);
  return out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
}

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => {
  t = Math.min(1, Math.max(0, t));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
