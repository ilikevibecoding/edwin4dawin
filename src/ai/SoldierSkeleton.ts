import * as THREE from 'three';

/**
 * The rig.
 *
 * Joint positions are authored in **bind-space world metres for a 1.80 m man
 * facing +Z**, and every bone's rest rotation is identity. That second part is
 * the decision everything downstream leans on: with no rest rotation to undo,
 * a bone's local axes are the world axes of the bind pose, so "bend the elbow"
 * is a rotation whose axis you can read off the page, and the inverse bind
 * matrices are pure translations.
 *
 * The pose itself is a low-ready carry rather than a T-pose. Skinning quality
 * falls off with the angle between bind and animated pose, and a soldier spends
 * the entire game with his elbows bent around a rifle, so binding him that way
 * keeps the shoulders and elbows from pinching in the pose that actually gets
 * seen. Elbow positions are not eyeballed — they are the exact two-bone IK
 * solution for the shoulder, hand and pole vector, so the bind pose already
 * satisfies the constraint the animation solves every frame.
 *
 * Right-handed, Y up, facing +Z, therefore the soldier's own right is **-X**.
 */

export interface BoneDef {
  name: string;
  parent: number;
  /** Bind position in world metres. */
  x: number;
  y: number;
  z: number;
}

export const BONES: readonly BoneDef[] = [
  { name: 'root', parent: -1, x: 0, y: 0, z: 0 },
  { name: 'pelvis', parent: 0, x: 0, y: 0.955, z: 0 },
  { name: 'spine1', parent: 1, x: 0, y: 1.075, z: 0.006 },
  { name: 'spine2', parent: 2, x: 0, y: 1.205, z: 0.012 },
  { name: 'chest', parent: 3, x: 0, y: 1.335, z: 0.006 },
  { name: 'neck', parent: 4, x: 0, y: 1.452, z: -0.004 },
  { name: 'head', parent: 5, x: 0, y: 1.545, z: 0.008 },

  { name: 'clavL', parent: 4, x: 0.048, y: 1.428, z: 0.016 },
  { name: 'armL', parent: 7, x: 0.175, y: 1.42, z: 0.005 },
  { name: 'foreL', parent: 8, x: 0.102, y: 1.157, z: 0.13 },
  { name: 'handL', parent: 9, x: -0.105, y: 1.19, z: 0.3 },

  { name: 'clavR', parent: 4, x: -0.048, y: 1.428, z: 0.016 },
  { name: 'armR', parent: 11, x: -0.175, y: 1.42, z: 0.005 },
  { name: 'foreR', parent: 12, x: -0.309, y: 1.2, z: -0.157 },
  { name: 'handR', parent: 13, x: -0.105, y: 1.13, z: 0.005 },

  { name: 'thighL', parent: 1, x: 0.095, y: 0.925, z: 0 },
  { name: 'calfL', parent: 15, x: 0.105, y: 0.495, z: 0.03 },
  { name: 'footL', parent: 16, x: 0.1, y: 0.085, z: -0.01 },
  { name: 'toeL', parent: 17, x: 0.1, y: 0.028, z: 0.135 },

  { name: 'thighR', parent: 1, x: -0.095, y: 0.925, z: 0 },
  { name: 'calfR', parent: 19, x: -0.105, y: 0.495, z: 0.03 },
  { name: 'footR', parent: 20, x: -0.1, y: 0.085, z: -0.01 },
  { name: 'toeR', parent: 21, x: -0.1, y: 0.028, z: 0.135 },

  // Driven directly by the aim solver; the rifle is skinned entirely to it.
  { name: 'weapon', parent: 4, x: -0.105, y: 1.205, z: 0.02 },
];

/** Name to index, so geometry can bind by name and stay readable. */
export const B: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  BONES.forEach((b, i) => {
    map[b.name] = i;
  });
  return map;
})();

export const BONE_COUNT = BONES.length;

/** Bind-space position of a joint. */
export function bindPos(index: number, out: THREE.Vector3): THREE.Vector3 {
  const b = BONES[index];
  return out.set(b.x, b.y, b.z);
}

/** Metres between two joints in the bind pose. */
export function boneLength(a: number, b: number): number {
  const p = BONES[a];
  const q = BONES[b];
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

/** Unit vector from one joint to another in the bind pose. */
export function bindDir(a: number, b: number, out: THREE.Vector3): THREE.Vector3 {
  const p = BONES[a];
  const q = BONES[b];
  return out.set(q.x - p.x, q.y - p.y, q.z - p.z).normalize();
}

/**
 * Builds a fresh bone hierarchy. Every agent needs its own — a `THREE.Skeleton`
 * is a list of live `Bone` objects, so two soldiers cannot share one and stand
 * in different poses.
 */
export function createBones(): THREE.Bone[] {
  const bones: THREE.Bone[] = [];
  for (let i = 0; i < BONES.length; i++) {
    const def = BONES[i];
    const bone = new THREE.Bone();
    bone.name = def.name;
    if (def.parent < 0) {
      bone.position.set(def.x, def.y, def.z);
    } else {
      const p = BONES[def.parent];
      bone.position.set(def.x - p.x, def.y - p.y, def.z - p.z);
      bones[def.parent].add(bone);
    }
    bones.push(bone);
  }
  return bones;
}

/**
 * Inverse bind matrices. With identity rest rotations these are pure inverse
 * translations, so they are written directly rather than by inverting a matrix
 * that was composed a moment earlier.
 */
export function inverseBinds(): THREE.Matrix4[] {
  return BONES.map((b) => new THREE.Matrix4().makeTranslation(-b.x, -b.y, -b.z));
}
