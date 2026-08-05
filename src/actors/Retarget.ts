import * as THREE from 'three';
import { BoneIndex, canonicalName } from './BoneMap';

/**
 * Delta-based animation retargeting.
 *
 * three's SkeletonUtils copies absolute world orientations from source bone to
 * target bone. That only works when both rigs orient their bones the same way,
 * and the rigs used here do not: their rest poses differ by up to 176 degrees on
 * the legs and 121 on the shoulders, so absolute copying folds the character up.
 *
 * Instead this transfers the *change from rest*:
 *
 *   deltaWorld       = sourceWorldNow * inverse(sourceWorldAtRest)
 *   targetWorldWanted = deltaWorld * targetWorldAtRest
 *   targetLocal       = inverse(parentTargetWorldWanted) * targetWorldWanted
 *
 * Because the delta is expressed in world space and applied on top of the
 * target's own rest orientation, the two rigs never need to agree about which
 * axis runs down a bone. Bone lengths are preserved by keeping the target's rest
 * translations; only the hips are allowed to move, scaled by the height ratio.
 */

interface RestPose {
  order: THREE.Bone[];
  worldQuat: Map<THREE.Bone, THREE.Quaternion>;
  worldPos: Map<THREE.Bone, THREE.Vector3>;
  localPos: Map<THREE.Bone, THREE.Vector3>;
  localQuat: Map<THREE.Bone, THREE.Quaternion>;
}

/** Depth-first bone order so parents are always solved before children. */
function boneOrder(skeleton: THREE.Skeleton): THREE.Bone[] {
  const inSkeleton = new Set(skeleton.bones);
  const roots = skeleton.bones.filter((b) => !b.parent || !inSkeleton.has(b.parent as THREE.Bone));
  const out: THREE.Bone[] = [];
  const walk = (bone: THREE.Bone): void => {
    out.push(bone);
    for (const child of bone.children) {
      if ((child as THREE.Bone).isBone && inSkeleton.has(child as THREE.Bone)) walk(child as THREE.Bone);
    }
  };
  for (const r of roots) walk(r);
  // Include any bones not reachable through the hierarchy.
  for (const b of skeleton.bones) if (!out.includes(b)) out.push(b);
  return out;
}

/**
 * Captures the rest pose, which is the reference both sides are measured from.
 *
 * This reads the authored node transforms rather than calling `Skeleton.pose()`:
 * `pose()` reconstructs bones from the inverse bind matrices and ignores the
 * skinned mesh's own bind matrix, which on the avatar rig used here throws the
 * whole skeleton into a different orientation than the one the artist authored.
 */
function captureRest(skeleton: THREE.Skeleton, root: THREE.Object3D): RestPose {
  root.updateMatrixWorld(true);
  const order = boneOrder(skeleton);
  const worldQuat = new Map<THREE.Bone, THREE.Quaternion>();
  const worldPos = new Map<THREE.Bone, THREE.Vector3>();
  const localPos = new Map<THREE.Bone, THREE.Vector3>();
  const localQuat = new Map<THREE.Bone, THREE.Quaternion>();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (const bone of order) {
    bone.matrixWorld.decompose(p, q, s);
    worldQuat.set(bone, q.clone());
    worldPos.set(bone, p.clone());
    localPos.set(bone, bone.position.clone());
    localQuat.set(bone, bone.quaternion.clone());
  }
  return { order, worldQuat, worldPos, localPos, localQuat };
}

export interface RetargetOptions {
  /** Sample rate of the produced clip. */
  fps?: number;
  /** Multiplier for hip translation, normally targetHeight / sourceHeight. */
  positionScale?: number;
  /** Bones to leave alone on the target (e.g. fingers, when the source has none). */
  skip?: (canonicalName: string) => boolean;
}

/**
 * @param clip Source clip, authored for `sourceSkeleton`.
 * @param sourceSkeleton Skeleton the clip was authored for.
 * @param sourceRoot Object whose world transform parents the source skeleton.
 * @param targetSkeleton Skeleton to produce a clip for.
 * @param targetRoot Object parenting the target skeleton (identity transform).
 */
export function retargetClip(
  clip: THREE.AnimationClip,
  sourceSkeleton: THREE.Skeleton,
  sourceRoot: THREE.Object3D,
  targetSkeleton: THREE.Skeleton,
  targetRoot: THREE.Object3D,
  opts: RetargetOptions = {}
): THREE.AnimationClip {
  const fps = opts.fps ?? 30;
  const positionScale = opts.positionScale ?? 1;

  const sourceIndex = new BoneIndex(sourceSkeleton);
  const targetIndex = new BoneIndex(targetSkeleton);

  const sourceRest = captureRest(sourceSkeleton, sourceRoot);
  const targetRest = captureRest(targetSkeleton, targetRoot);

  // Pair up bones by canonical name.
  const pairs: { target: THREE.Bone; source: THREE.Bone; canonical: string }[] = [];
  for (const bone of targetRest.order) {
    const canonical = canonicalName(bone.name);
    if (opts.skip?.(canonical)) continue;
    const source = sourceIndex.get(canonical);
    if (source) pairs.push({ target: bone, source, canonical });
  }
  if (!pairs.length) throw new Error('retarget: no matching bones between rigs');

  /**
   * Rotation that carries source-world orientations into target-world ones.
   *
   * The rigs do not face the same way: the mannequin and the trooper rest facing
   * -Z while the avatar rests facing +Z. Comparing their bones in raw world space
   * therefore mirrors every transferred rotation, which reads as arms swinging up
   * instead of down. Both sides are converted through their own body frame first.
   */
  const basisOf = (rest: RestPose, index: BoneIndex): THREE.Quaternion => {
    const hips = index.get('Hips');
    const head = index.get('Head') ?? index.get('Neck');
    const leftArm = index.get('LeftArm') ?? index.get('LeftShoulder');
    const rightArm = index.get('RightArm') ?? index.get('RightShoulder');
    const q = new THREE.Quaternion();
    if (!hips || !head || !leftArm || !rightArm) return q;
    const pr = rest.worldPos.get(rightArm);
    const pl = rest.worldPos.get(leftArm);
    const ph = rest.worldPos.get(head);
    const pp = rest.worldPos.get(hips);
    if (!pr || !pl || !ph || !pp) return q;
    const right = pr.clone().sub(pl);
    const up = ph.clone().sub(pp);
    if (right.lengthSq() < 1e-10 || up.lengthSq() < 1e-10) return q;
    right.normalize();
    up.normalize();
    const forward = new THREE.Vector3().crossVectors(up, right).normalize();
    // First column is up x forward so the basis stays a proper rotation.
    const xAxis = new THREE.Vector3().crossVectors(up, forward).normalize();
    return q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, up, forward));
  };
  const sourceBasis = basisOf(sourceRest, sourceIndex);
  const targetBasis = basisOf(targetRest, targetIndex);
  const srcToTgt = targetBasis.clone().multiply(sourceBasis.clone().invert());
  const tgtToSrc = srcToTgt.clone().invert();

  /**
   * Per-bone rest alignment.
   *
   * Transferring the source's change-from-rest is only correct when both rigs
   * rest in the same shape. These do not: the clip rigs rest in a T-pose while
   * the avatar rests in an A-pose, so a shoulder that swings 70 degrees down on
   * the source would swing 70 degrees past the body on the target.
   *
   * The fix is to first rotate each target bone so that it *points* where the
   * source bone points at rest, then apply the source's motion on top. The
   * alignment is measured from the direction of each bone's child joint, so it
   * needs no hand-authored reference pose and adapts to any rig pairing.
   */
  const alignment = new Map<THREE.Bone, THREE.Quaternion>();
  const boneDirection = (bone: THREE.Bone, rest: RestPose): THREE.Vector3 | null => {
    const child = bone.children.find((c) => (c as THREE.Bone).isBone && rest.worldPos.has(c as THREE.Bone)) as
      | THREE.Bone
      | undefined;
    if (!child) return null;
    const from = rest.worldPos.get(bone);
    const to = rest.worldPos.get(child);
    if (!from || !to) return null;
    const dir = to.clone().sub(from);
    return dir.lengthSq() > 1e-10 ? dir.normalize() : null;
  };
  for (const pair of pairs) {
    const srcDir = boneDirection(pair.source, sourceRest);
    const tgtDir = boneDirection(pair.target, targetRest);
    if (srcDir && tgtDir) {
      // Compare the source direction as it would appear on the target's body.
      const srcDirOnTarget = srcDir.clone().applyQuaternion(srcToTgt);
      alignment.set(pair.target, new THREE.Quaternion().setFromUnitVectors(tgtDir, srcDirOnTarget));
    }
  }

  const hipsTarget = targetIndex.get('Hips');
  const hipsSource = sourceIndex.get('Hips');

  // Hip translation is scaled by the ratio of hip heights measured in each rig's
  // own local units, which is immune to differences in authoring scale.
  let hipScale = positionScale;
  if (hipsTarget && hipsSource) {
    const srcHip = sourceRest.localPos.get(hipsSource);
    const tgtHip = targetRest.localPos.get(hipsTarget);
    const srcLen = srcHip?.length() ?? 0;
    const tgtLen = tgtHip?.length() ?? 0;
    if (srcLen > 1e-6 && tgtLen > 1e-6) hipScale = tgtLen / srcLen;
  }

  const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
  const dt = clip.duration / (frames - 1);
  const times = new Float32Array(frames);
  const quatValues = new Map<THREE.Bone, Float32Array>();
  for (const pair of pairs) quatValues.set(pair.target, new Float32Array(frames * 4));
  const hipPos = hipsTarget ? new Float32Array(frames * 3) : null;

  // Drive the source skeleton with the clip. Binding against the root bone works
  // because every other bone is one of its descendants.
  const sourceRootBone = sourceRest.order[0];
  const mixer = new THREE.AnimationMixer(sourceRootBone);
  const action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(0);

  const srcQ = new THREE.Quaternion();
  const srcP = new THREE.Vector3();
  const srcS = new THREE.Vector3();
  const delta = new THREE.Quaternion();
  const wanted = new THREE.Quaternion();
  const parentInverse = new THREE.Quaternion();
  const local = new THREE.Quaternion();
  const newWorld = new Map<THREE.Bone, THREE.Quaternion>();

  for (let f = 0; f < frames; f++) {
    const t = f * dt;
    times[f] = t;
    mixer.setTime(t);
    sourceRootBone.updateMatrixWorld(true);
    newWorld.clear();

    for (const pair of pairs) {
      pair.source.matrixWorld.decompose(srcP, srcQ, srcS);
      const srcRest = sourceRest.worldQuat.get(pair.source);
      const tgtRest = targetRest.worldQuat.get(pair.target);
      if (!srcRest || !tgtRest) continue;

      // Source's change since its own rest, re-expressed on the target's body,
      // then applied on top of the target's rest-aligned orientation.
      delta.copy(srcQ).multiply(srcRest.clone().invert());
      delta.premultiply(srcToTgt).multiply(tgtToSrc);
      const align = alignment.get(pair.target);
      wanted.copy(delta);
      if (align) wanted.multiply(align);
      wanted.multiply(tgtRest);
      newWorld.set(pair.target, wanted.clone());

      const parent = pair.target.parent as THREE.Bone | null;
      const parentWorld =
        parent && newWorld.has(parent)
          ? newWorld.get(parent)!
          : (parent ? targetRest.worldQuat.get(parent) : undefined) ?? new THREE.Quaternion();
      parentInverse.copy(parentWorld).invert();
      local.copy(parentInverse).multiply(wanted);

      const arr = quatValues.get(pair.target)!;
      arr[f * 4] = local.x;
      arr[f * 4 + 1] = local.y;
      arr[f * 4 + 2] = local.z;
      arr[f * 4 + 3] = local.w;
    }

    if (hipPos && hipsTarget && hipsSource) {
      // Hip motion is transferred in local units and rescaled by the ratio of the
      // two rigs' hip heights. Using world positions here would be wrong: these
      // models are authored at scales that differ by a factor of a hundred, and
      // mixing a world-space delta into a local rest position throws the
      // character out of the frame entirely.
      const restSrcLocal = sourceRest.localPos.get(hipsSource)!;
      const restTgtLocal = targetRest.localPos.get(hipsTarget)!;
      hipPos[f * 3] = restTgtLocal.x + (hipsSource.position.x - restSrcLocal.x) * hipScale;
      hipPos[f * 3 + 1] = restTgtLocal.y + (hipsSource.position.y - restSrcLocal.y) * hipScale;
      hipPos[f * 3 + 2] = restTgtLocal.z + (hipsSource.position.z - restSrcLocal.z) * hipScale;
    }
  }

  mixer.uncacheAction(clip);
  // Put the source rig back exactly as it was found, from the stored local
  // transforms, so that retargeting the next clip measures against a clean rest
  // pose. Rebuilding locals from world rotations is not equivalent once a rig
  // nests scale, and the drift shows up as flung limbs in later clips.
  for (const bone of sourceRest.order) {
    const q = sourceRest.localQuat.get(bone);
    if (q) bone.quaternion.copy(q);
    const p = sourceRest.localPos.get(bone);
    if (p) bone.position.copy(p);
  }
  sourceRoot.updateMatrixWorld(true);

  const tracks: THREE.KeyframeTrack[] = [];
  for (const pair of pairs) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${pair.target.name}.quaternion`, times, quatValues.get(pair.target)!));
  }
  if (hipPos && hipsTarget) {
    tracks.push(new THREE.VectorKeyframeTrack(`${hipsTarget.name}.position`, times, hipPos));
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
