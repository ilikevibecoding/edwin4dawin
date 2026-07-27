/**
 * Inverse kinematics for the limbs and the neck.
 *
 * Two solvers, both analytic and both allocation-free.
 *
 * `solveLimb` is the standard two-bone solve, but the formulation matters: the
 * upper bone is aimed at a direction derived from the law of cosines and the
 * lower bone is then simply pointed at the target. Writing the interior angle
 * onto the lower bone directly is algebraically equivalent and numerically worse,
 * because any error in the upper bone's twist shows up as the hand missing the
 * grip. Pointing at the target closes the loop.
 *
 * Both preserve the twist of the pose they are handed rather than inventing one,
 * so the animator can rough the limb in and the solver only corrects reach. The
 * tip bone is left alone; callers that care about the hand's roll — anything
 * holding a weapon — set it themselves afterwards.
 */
import * as THREE from 'three';
import { clamp } from '../../core/MathUtils';

const EPS = 1e-5;
const IDENTITY = /* @__PURE__ */ new THREE.Quaternion();

const s = {
  rootPos: new THREE.Vector3(),
  midPos: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
  axis: new THREE.Vector3(),
  pole: new THREE.Vector3(),
  bendNormal: new THREE.Vector3(),
  current: new THREE.Vector3(),
  desired: new THREE.Vector3(),
  qRootWorld: new THREE.Quaternion(),
  qMidWorld: new THREE.Quaternion(),
  qParent: new THREE.Quaternion(),
  qDelta: new THREE.Quaternion(),
  qTmp: new THREE.Quaternion(),
  m3: new THREE.Matrix4(),
};

/** World-space rotation of an object, assuming unit scale. */
export function worldQuat(object: THREE.Object3D, out: THREE.Quaternion): THREE.Quaternion {
  return out.setFromRotationMatrix(object.matrixWorld);
}

export interface LimbChain {
  root: THREE.Bone;
  mid: THREE.Bone;
  tip: THREE.Bone;
  /** Unit chain axis of `root` in its own local space, i.e. towards `mid`. */
  rootAxis: THREE.Vector3;
  /** Unit chain axis of `mid` in its own local space, i.e. towards `tip`. */
  midAxis: THREE.Vector3;
  upperLength: number;
  lowerLength: number;
}

/** Builds a chain descriptor from the bind pose. Called once per rig, not per frame. */
export function makeChain(root: THREE.Bone, mid: THREE.Bone, tip: THREE.Bone): LimbChain {
  const upperLength = mid.position.length();
  const lowerLength = tip.position.length();
  return {
    root,
    mid,
    tip,
    rootAxis: mid.position.clone().normalize(),
    midAxis: tip.position.clone().normalize(),
    upperLength,
    lowerLength,
  };
}

/**
 * Solves `chain` so the tip reaches `target`, bending towards `poleHint`.
 *
 * `chain.root.matrixWorld` and its parent's must be current. Writes local
 * quaternions onto the root and mid bones only.
 */
export function solveLimb(
  chain: LimbChain,
  target: THREE.Vector3,
  poleHint: THREE.Vector3,
  weight = 1,
): void {
  const { root, mid, upperLength: l1, lowerLength: l2 } = chain;

  s.rootPos.setFromMatrixPosition(root.matrixWorld);
  s.toTarget.subVectors(target, s.rootPos);
  const distance = s.toTarget.length();
  if (distance < EPS) return;
  s.toTarget.multiplyScalar(1 / distance);

  // Clamp into the annulus the chain can actually reach, leaving a hair of bend
  // at full extension so the joint never becomes singular.
  const reach = clamp(distance, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.998);

  // Angle at the root between the upper bone and the line to the target.
  const cosAlpha = clamp((l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach), -1, 1);
  const alpha = Math.acos(cosAlpha);

  // Bend plane: the component of the pole hint perpendicular to the reach line.
  s.pole.copy(poleHint).addScaledVector(s.toTarget, -poleHint.dot(s.toTarget));
  if (s.pole.lengthSq() < 1e-8) {
    // Degenerate hint. Any perpendicular will do; pick the most stable one.
    s.pole.set(0, 1, 0).addScaledVector(s.toTarget, -s.toTarget.y);
    if (s.pole.lengthSq() < 1e-8) s.pole.set(1, 0, 0).addScaledVector(s.toTarget, -s.toTarget.x);
  }
  s.pole.normalize();
  s.bendNormal.crossVectors(s.toTarget, s.pole).normalize();

  // Upper bone direction: the reach line rotated towards the pole by alpha.
  s.axis.copy(s.toTarget).applyAxisAngle(s.bendNormal, alpha);

  worldQuat(root, s.qRootWorld);
  s.current.copy(chain.rootAxis).applyQuaternion(s.qRootWorld);
  s.qDelta.setFromUnitVectors(s.current, s.axis);
  if (weight < 1) s.qDelta.slerp(IDENTITY, 1 - weight);
  s.qRootWorld.premultiply(s.qDelta);

  // Lower bone: aim it straight at the target from where the elbow now is.
  s.midPos.copy(s.rootPos).addScaledVector(s.axis, l1);
  s.desired.subVectors(target, s.midPos);
  if (s.desired.lengthSq() < EPS) return;
  s.desired.normalize();

  worldQuat(mid, s.qMidWorld);
  s.current.copy(chain.midAxis).applyQuaternion(s.qMidWorld);
  s.qDelta.setFromUnitVectors(s.current, s.desired);
  if (weight < 1) s.qDelta.slerp(IDENTITY, 1 - weight);
  s.qMidWorld.premultiply(s.qDelta);

  // Back to local space. The root's parent is untouched; the mid's parent is the
  // root, whose new world rotation we just computed.
  if (root.parent) {
    worldQuat(root.parent, s.qParent);
    root.quaternion.copy(s.qParent.invert()).multiply(s.qRootWorld);
  } else {
    root.quaternion.copy(s.qRootWorld);
  }
  mid.quaternion.copy(s.qTmp.copy(s.qRootWorld).invert()).multiply(s.qMidWorld);
}

/**
 * Rotates a bone so its local `axis` points at `target`, clamped to `maxAngle`
 * from the direction it already faces.
 *
 * This is the head. The clamp is what stops an enemy behind a soldier from
 * spinning their skull round to look at the player, which is a thing that
 * happens in shipped games and is instantly, comically wrong.
 */
export function lookAtLimited(
  bone: THREE.Bone,
  axis: THREE.Vector3,
  target: THREE.Vector3,
  maxAngle: number,
  weight = 1,
): void {
  s.rootPos.setFromMatrixPosition(bone.matrixWorld);
  s.toTarget.subVectors(target, s.rootPos);
  if (s.toTarget.lengthSq() < EPS) return;
  s.toTarget.normalize();

  worldQuat(bone, s.qRootWorld);
  s.current.copy(axis).applyQuaternion(s.qRootWorld);

  const dot = clamp(s.current.dot(s.toTarget), -1, 1);
  const angle = Math.acos(dot);
  let t = weight;
  if (angle > maxAngle) t = weight * (maxAngle / angle);
  if (t <= 0) return;

  s.qDelta.setFromUnitVectors(s.current, s.toTarget);
  if (t < 1) s.qDelta.slerp(IDENTITY, 1 - t);
  s.qRootWorld.premultiply(s.qDelta);

  if (bone.parent) {
    worldQuat(bone.parent, s.qParent);
    bone.quaternion.copy(s.qParent.invert()).multiply(s.qRootWorld);
  } else {
    bone.quaternion.copy(s.qRootWorld);
  }
}

/**
 * Writes a bone's local quaternion so its world rotation equals `worldRotation`.
 * Used to plant a foot flat on a slope and to lock a hand onto a grip.
 */
export function setWorldRotation(bone: THREE.Bone, worldRotation: THREE.Quaternion): void {
  if (bone.parent) {
    worldQuat(bone.parent, s.qParent);
    bone.quaternion.copy(s.qParent.invert()).multiply(worldRotation);
  } else {
    bone.quaternion.copy(worldRotation);
  }
}
