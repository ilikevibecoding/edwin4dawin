import * as THREE from 'three';
import { JOINTS, KINDS, LEGS, PAD_OFFSET, scaledJoints } from './spec.js';

// ---------------------------------------------------------------------------
// The skeleton, and the maths for posing it.
//
// Bones point along their local +Y at their child (or a stated direction), with
// local +X kept toward the animal's right. Every pose the solver produces is a
// set of world-space (lion root space) orientations built with the same basis
// rule, so a bone's local rotation is always parentWorld⁻¹ · world and the rig
// never has to reason about Euler order.
// ---------------------------------------------------------------------------

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const RIGHT = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Quaternion whose +Y is `dir` and whose +X is as close to `right` as the
 * direction allows. Falls back to world up as the hint when the two are nearly
 * parallel, so a bone pointing straight sideways still gets a stable frame.
 */
export function basisQuat(dir, right = RIGHT, out = new THREE.Quaternion()) {
  _y.copy(dir);
  const l = _y.length();
  if (l < 1e-8) return out.identity();
  _y.multiplyScalar(1 / l);
  _x.copy(right).addScaledVector(_y, -_y.dot(right));
  if (_x.lengthSq() < 1e-6) _x.copy(UP).addScaledVector(_y, -_y.dot(UP));
  if (_x.lengthSq() < 1e-6) _x.set(0, 0, 1).addScaledVector(_y, -_y.dot(_z.set(0, 0, 1)));
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/**
 * Build the rest skeleton for a kind. Returns the bone list (in JOINTS order,
 * end joints excluded), lookup maps and the rest frames the solver and the
 * geometry both read from.
 */
export function buildSkeleton(kind) {
  const joints = scaledJoints(kind);
  const byName = new Map(joints.map((j) => [j.name, j]));
  const rest = new Map();

  // world (root-space) rest frames
  for (const j of joints) {
    const pos = new THREE.Vector3(...j.pos);
    let dir;
    if (j.to) dir = new THREE.Vector3(...byName.get(j.to).pos).sub(pos);
    else if (j.dir) dir = new THREE.Vector3(...j.dir);
    else dir = new THREE.Vector3(0, 0, 1);
    const quat = basisQuat(dir, RIGHT, new THREE.Quaternion());
    rest.set(j.name, { pos, dir: dir.clone().normalize(), len: dir.length(), quat, joint: j });
  }

  const bones = [];
  const boneByName = new Map();
  const index = new Map();
  for (const j of joints) {
    if (j.end) continue;
    const b = new THREE.Bone();
    b.name = j.name;
    const r = rest.get(j.name);
    if (j.parent) {
      const pr = rest.get(j.parent);
      _q.copy(pr.quat).invert();
      b.position.copy(r.pos).sub(pr.pos).applyQuaternion(_q);
      b.quaternion.copy(_q).multiply(r.quat);
    } else {
      b.position.copy(r.pos);
      b.quaternion.copy(r.quat);
    }
    r.localPos = b.position.clone();
    r.localQuat = b.quaternion.clone();
    index.set(j.name, bones.length);
    bones.push(b);
    boneByName.set(j.name, b);
  }
  for (const j of joints) {
    if (j.end || !j.parent) continue;
    boneByName.get(j.parent).add(boneByName.get(j.name));
  }
  // the skeleton captures its bind inverses from the bones' world matrices, so
  // the rest pose has to be pushed through the hierarchy first
  bones[0].updateMatrixWorld(true);

  const s = KINDS[kind].scale;
  const legs = LEGS.map((l) => {
    const pr = rest.get(l.paw);
    const pad = PAD_OFFSET[l.front ? 'front' : 'hind'];
    // where the pad meets the ground in the rest pose
    const contact = new THREE.Vector3(pad[0] * s, pad[1] * s, pad[2] * s).applyQuaternion(pr.quat).add(pr.pos);
    return {
      ...l,
      L1: rest.get(l.root).len,
      L2: rest.get(l.mid).len,
      L3: rest.get(l.low).len,
      L4: pr.len,
      footRest: contact.setY(0),
    };
  });

  return { bones, root: bones[0], boneByName, index, rest, joints, byName, legs, skeleton: new THREE.Skeleton(bones) };
}

/**
 * Two-bone analytic IK. Given the root position, a target for the end of the
 * second bone and a pole hint, returns the mid-joint position. The reach is
 * clamped a hair short of straight, so the elbow never snaps through.
 */
export function solveTwoBone(root, target, L1, L2, pole, outMid) {
  _v.copy(target).sub(root);
  let d = _v.length();
  if (d < 1e-6) {
    _v.set(0, -1, 0);
    d = 1e-6;
  }
  const dir = _v.multiplyScalar(1 / d);
  const maxReach = (L1 + L2) * 0.995;
  const minReach = Math.abs(L1 - L2) * 1.02 + 1e-4;
  const dd = THREE.MathUtils.clamp(d, minReach, maxReach);
  // law of cosines: angle at the root between dir and the first bone
  const cosA = THREE.MathUtils.clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1);
  const a = Math.acos(cosA);
  // bend plane: pole projected perpendicular to dir
  _x.copy(pole).addScaledVector(dir, -dir.dot(pole));
  if (_x.lengthSq() < 1e-6) _x.set(0, 0, 1).addScaledVector(dir, -dir.z);
  _x.normalize();
  outMid.copy(root).addScaledVector(dir, Math.cos(a) * L1).addScaledVector(_x, Math.sin(a) * L1);
  return dd < d; // true when the target was out of reach
}

/**
 * Smooth partition of unity along a chain of joint arc positions. Returns the
 * weight of each segment (bone) for arc parameter t, blended over ±blend at
 * every joint so skinning does not crease.
 */
export function chainWeights(arcs, t, blend) {
  const n = arcs.length - 1;
  const w = new Array(n).fill(0);
  const ss = (e0, e1, x) => {
    const u = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
    return u * u * (3 - 2 * u);
  };
  for (let k = 0; k < n; k++) {
    const a = k === 0 ? 1 : ss(arcs[k] - blend, arcs[k] + blend, t);
    const b = k === n - 1 ? 0 : ss(arcs[k + 1] - blend, arcs[k + 1] + blend, t);
    w[k] = a - b;
  }
  return w;
}

export { JOINTS };
