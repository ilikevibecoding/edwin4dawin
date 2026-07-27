/**
 * The skeleton.
 *
 * Twenty-two bones in a standard humanoid hierarchy. Bind pose is a relaxed
 * A-pose with the feet at y = 0 and the crown at 1.8 m, which is the same height
 * reported to combat as the hitbox height, so what the player shoots at and what
 * they see are the same object.
 *
 * Names follow the Mixamo convention (`Hips`, `Spine2`, `LeftForeArm`, ...) for
 * one concrete reason: the physics module's ragdoll matches bones by name against
 * a table of the usual conventions, and this is the one it recognises best. A rig
 * with idiosyncratic names still ragdolls, but from synthesised proportions rather
 * than from these, and the corpse stops matching the body it came from.
 *
 * The character faces -Z, which is yaw = 0 in the player's convention, so its left
 * side is -X and its right side is +X.
 */
import * as THREE from 'three';
import type { BoneSegment } from './GeoUtil';

export const BONE_NAMES = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase',
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

/** Stable indices, used by the geometry builders to declare bone sets. */
export const B = {
  hips: 0,
  spine: 1,
  spine1: 2,
  spine2: 3,
  neck: 4,
  head: 5,
  shoulderL: 6,
  armL: 7,
  foreArmL: 8,
  handL: 9,
  shoulderR: 10,
  armR: 11,
  foreArmR: 12,
  handR: 13,
  upLegL: 14,
  legL: 15,
  footL: 16,
  toeL: 17,
  upLegR: 18,
  legR: 19,
  footR: 20,
  toeR: 21,
} as const;

export const BONE_COUNT = BONE_NAMES.length;

/** Parent index per bone; -1 for the root. */
export const BONE_PARENT: readonly number[] = [
  -1, // Hips
  B.hips, // Spine
  B.spine, // Spine1
  B.spine1, // Spine2
  B.spine2, // Neck
  B.neck, // Head
  B.spine2, // LeftShoulder
  B.shoulderL, // LeftArm
  B.armL, // LeftForeArm
  B.foreArmL, // LeftHand
  B.spine2, // RightShoulder
  B.shoulderR, // RightArm
  B.armR, // RightForeArm
  B.foreArmR, // RightHand
  B.hips, // LeftUpLeg
  B.upLegL, // LeftLeg
  B.legL, // LeftFoot
  B.footL, // LeftToeBase
  B.hips, // RightUpLeg
  B.upLegR, // RightLeg
  B.legR, // RightFoot
  B.footR, // RightToeBase
];

/** Bind-space world position of every bone, feet at y = 0. */
export const BIND: readonly (readonly [number, number, number])[] = [
  [0, 0.99, 0], // Hips
  [0, 1.1, -0.008], // Spine
  [0, 1.23, -0.014], // Spine1
  [0, 1.37, -0.006], // Spine2
  [0, 1.51, 0.006], // Neck
  [0, 1.585, -0.002], // Head
  [-0.052, 1.452, -0.004], // LeftShoulder
  // The shoulder joints sit outboard of the ribcage rather than on its surface, so
  // the deltoid and the sleeve are outside the torso silhouette instead of buried
  // in it. An arm that disappears into the chest is the difference between a
  // soldier and a snowman.
  [-0.199, 1.437, -0.006], // LeftArm
  [-0.207, 1.176, -0.012], // LeftForeArm
  [-0.211, 0.944, -0.006], // LeftHand
  [0.052, 1.452, -0.004], // RightShoulder
  [0.199, 1.437, -0.006], // RightArm
  [0.207, 1.176, -0.012], // RightForeArm
  [0.211, 0.944, -0.006], // RightHand
  [-0.096, 0.952, -0.004], // LeftUpLeg
  [-0.102, 0.528, 0.008], // LeftLeg
  [-0.104, 0.104, -0.014], // LeftFoot
  [-0.104, 0.036, -0.118], // LeftToeBase
  [0.096, 0.952, -0.004], // RightUpLeg
  [0.102, 0.528, 0.008], // RightLeg
  [0.104, 0.104, -0.014], // RightFoot
  [0.104, 0.036, -0.118], // RightToeBase
];

/** Standing height the bind pose was authored at. */
export const RIG_HEIGHT = 1.8;
/** Crown of the head in bind space, for helmet placement and hitbox agreement. */
export const RIG_CROWN = 1.79;

export interface Rig {
  bones: THREE.Bone[];
  root: THREE.Bone;
  skeleton: THREE.Skeleton;
}

const TMP = /* @__PURE__ */ new THREE.Vector3();

/** Bone segment table, shared by every geometry build. */
export const BONE_SEGMENTS: readonly BoneSegment[] = buildSegments();

function buildSegments(): BoneSegment[] {
  const segments: BoneSegment[] = [];
  for (let i = 0; i < BONE_COUNT; i++) {
    const start = new THREE.Vector3(BIND[i][0], BIND[i][1], BIND[i][2]);
    // Mean of the children, so the pelvis segment runs up the spine rather than
    // splitting the difference between two legs and a torso.
    const children: number[] = [];
    for (let c = 0; c < BONE_COUNT; c++) if (BONE_PARENT[c] === i) children.push(c);

    const end = new THREE.Vector3();
    if (i === B.hips) {
      end.set(BIND[B.spine][0], BIND[B.spine][1], BIND[B.spine][2]);
    } else if (i === B.spine2) {
      end.set(BIND[B.neck][0], BIND[B.neck][1], BIND[B.neck][2]);
    } else if (children.length > 0) {
      for (const c of children) end.add(TMP.set(BIND[c][0], BIND[c][1], BIND[c][2]));
      end.divideScalar(children.length);
    } else {
      // Leaves get a stub along the direction they came from, so a head or a hand
      // still has a segment with length instead of a point.
      const parent = BONE_PARENT[i];
      const from =
        parent >= 0
          ? TMP.set(BIND[parent][0], BIND[parent][1], BIND[parent][2])
          : TMP.set(0, 0, 0);
      end.copy(start).sub(from).normalize().multiplyScalar(i === B.head ? 0.2 : 0.09).add(start);
    }
    segments.push({ start, end });
  }
  return segments;
}

/**
 * Bone inverses, computed once from the bind pose and shared by every instance.
 *
 * `THREE.Skeleton` only reads these during `update()`, so sharing them across
 * dozens of skeletons is safe and saves a 22-matrix inversion per spawn.
 */
export const BONE_INVERSES: readonly THREE.Matrix4[] = BIND.map(([x, y, z]) =>
  new THREE.Matrix4().makeTranslation(-x, -y, -z),
);

/** Builds a fresh bone hierarchy and skeleton in the bind pose. */
export function createRig(): Rig {
  const bones: THREE.Bone[] = [];
  for (let i = 0; i < BONE_COUNT; i++) {
    const bone = new THREE.Bone();
    bone.name = BONE_NAMES[i];
    const parent = BONE_PARENT[i];
    if (parent >= 0) {
      bone.position.set(
        BIND[i][0] - BIND[parent][0],
        BIND[i][1] - BIND[parent][1],
        BIND[i][2] - BIND[parent][2],
      );
      bones[parent].add(bone);
    } else {
      bone.position.set(BIND[i][0], BIND[i][1], BIND[i][2]);
    }
    bones.push(bone);
  }
  const skeleton = new THREE.Skeleton(bones, BONE_INVERSES as THREE.Matrix4[]);
  return { bones, root: bones[0], skeleton };
}

/** Local rest offset of a bone from its parent, for animation to add onto. */
export function restOffset(index: number, out: THREE.Vector3): THREE.Vector3 {
  const parent = BONE_PARENT[index];
  if (parent < 0) return out.set(BIND[index][0], BIND[index][1], BIND[index][2]);
  return out.set(
    BIND[index][0] - BIND[parent][0],
    BIND[index][1] - BIND[parent][1],
    BIND[index][2] - BIND[parent][2],
  );
}

/** Bind length of a bone, i.e. the distance to its first child. */
export function boneLength(index: number): number {
  const seg = BONE_SEGMENTS[index];
  return seg.start.distanceTo(seg.end);
}
