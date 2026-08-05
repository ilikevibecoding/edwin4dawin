import * as THREE from 'three';

/**
 * All four source rigs (Mixamo exports and the ReadyPlayerMe avatar) share the
 * same bone hierarchy; they differ only in whether names carry the `mixamorig:`
 * prefix. Normalising to canonical names lets one pose library and one animation
 * set drive every character in the cast.
 */

/**
 * Mixamo prefixes bone names with `mixamorig:`, but three's glTF loader strips
 * characters that are illegal in animation property paths, so the same bone can
 * arrive as `mixamorig:Hips`, `mixamorigHips` or `Hips` depending on the file and
 * the loader path. Matching has to tolerate all three.
 */
const PREFIX_PATTERN = /^mixamorig[:_]?/i;

export type CanonicalBone =
  | 'Hips'
  | 'Spine'
  | 'Spine1'
  | 'Spine2'
  | 'Neck'
  | 'Head'
  | 'HeadTop_End'
  | 'LeftShoulder'
  | 'LeftArm'
  | 'LeftForeArm'
  | 'LeftHand'
  | 'RightShoulder'
  | 'RightArm'
  | 'RightForeArm'
  | 'RightHand'
  | 'LeftUpLeg'
  | 'LeftLeg'
  | 'LeftFoot'
  | 'LeftToeBase'
  | 'RightUpLeg'
  | 'RightLeg'
  | 'RightFoot'
  | 'RightToeBase'
  | 'LeftEye'
  | 'RightEye'
  | 'LeftHandThumb1'
  | 'LeftHandIndex1'
  | 'LeftHandIndex2'
  | 'LeftHandMiddle1'
  | 'LeftHandRing1'
  | 'LeftHandPinky1'
  | 'RightHandThumb1'
  | 'RightHandThumb2'
  | 'RightHandIndex1'
  | 'RightHandIndex2'
  | 'RightHandIndex3'
  | 'RightHandMiddle1'
  | 'RightHandMiddle2'
  | 'RightHandRing1'
  | 'RightHandRing2'
  | 'RightHandPinky1'
  | 'RightHandPinky2';

export function canonicalName(boneName: string): string {
  return boneName.replace(PREFIX_PATTERN, '');
}

export class BoneIndex {
  private byCanonical = new Map<string, THREE.Bone>();
  /** Whatever prefix this rig actually uses, so native names can be rebuilt. */
  readonly prefix: string;

  constructor(readonly skeleton: THREE.Skeleton) {
    let prefix = '';
    for (const bone of skeleton.bones) {
      const match = PREFIX_PATTERN.exec(bone.name);
      if (match && !prefix) prefix = match[0];
      this.byCanonical.set(canonicalName(bone.name), bone);
    }
    this.prefix = prefix;
  }

  get prefixed(): boolean {
    return this.prefix.length > 0;
  }

  get(name: string): THREE.Bone | undefined {
    return this.byCanonical.get(name);
  }

  require(name: string): THREE.Bone {
    const b = this.byCanonical.get(name);
    if (!b) throw new Error(`bone '${name}' missing from rig`);
    return b;
  }

  has(name: string): boolean {
    return this.byCanonical.has(name);
  }

  /** Rig-native name for a canonical bone. */
  nativeName(name: string): string {
    return this.prefix + name;
  }

  get names(): string[] {
    return [...this.byCanonical.keys()];
  }
}

/** Maps target bone names to source bone names for SkeletonUtils.retarget. */
export function buildRetargetNames(target: BoneIndex, source: BoneIndex): Record<string, string> {
  const names: Record<string, string> = {};
  for (const canonical of target.names) {
    if (source.has(canonical)) {
      names[target.nativeName(canonical)] = source.nativeName(canonical);
    }
  }
  return names;
}
