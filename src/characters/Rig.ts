/**
 * Humanoid skeleton. Bones are authored as world-space rest positions for a
 * character standing at the origin facing +Z, then converted into a parented
 * THREE.Bone hierarchy. The upper body is anchored to the chin height derived
 * from the head mesh so heads always sit correctly on necks.
 */
import * as THREE from 'three';

export interface Proportions {
  height: number;
  /** 0 = slight, 1 = heavy. Drives limb and torso thickness. */
  build: number;
  /** Half the shoulder-joint span, as a fraction of height. */
  shoulderWidth: number;
  hipWidth: number;
  armScale: number;
  legScale: number;
  headScale: number;
  /** Chest depth bias; higher reads as broader and flatter. */
  chestDepth: number;
  /** Waist narrowing, 0..1. */
  waist: number;
  /** Chin-to-crown height of the head mesh. */
  headHeight: number;
}

export const DEFAULT_PROPORTIONS: Proportions = {
  height: 1.76,
  build: 0.45,
  shoulderWidth: 0.108,
  hipWidth: 0.079,
  armScale: 1,
  legScale: 1,
  headScale: 1,
  chestDepth: 0.62,
  waist: 0.5,
  headHeight: 0.235,
};

export type BoneName =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'armL' | 'forearmL' | 'handL'
  | 'shoulderR' | 'armR' | 'forearmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'toeL'
  | 'thighR' | 'shinR' | 'footR' | 'toeR';

export interface BoneSpec {
  name: BoneName;
  parent: BoneName | null;
  pos: THREE.Vector3;
  radius: number;
  radiusEnd?: number;
}

export interface Rig {
  bones: THREE.Bone[];
  byName: Record<BoneName, THREE.Bone>;
  skeleton: THREE.Skeleton;
  specs: BoneSpec[];
  specByName: Record<BoneName, BoneSpec>;
  segments: { name: BoneName; index: number; a: THREE.Vector3; b: THREE.Vector3; r0: number; r1: number }[];
  proportions: Proportions;
  rootBone: THREE.Bone;
}

export function buildRig(p: Partial<Proportions> = {}): Rig {
  const prop: Proportions = { ...DEFAULT_PROPORTIONS, ...p };
  const H = prop.height;
  const b = prop.build;
  const headH = prop.headHeight;
  const yChin = H - headH;

  const yAnkle = H * 0.045;
  const yKnee = H * 0.272;
  const yHip = H * 0.53;
  const ySpine = H * 0.605;
  const yChest = H * 0.72;
  const yShoulder = yChin - headH * 0.28;
  const yNeck = yChin - headH * 0.08;
  // The skull pivots just below and behind the ears
  const yHead = yChin + headH * 0.42;

  const sw = H * prop.shoulderWidth;
  const hw = H * prop.hipWidth;

  // A 30-degree bind pose skins the shoulder well; idle poses bring arms down.
  const armAngle = THREE.MathUtils.degToRad(30);
  const upperLen = H * 0.163 * prop.armScale;
  const foreLen = H * 0.146 * prop.armScale;
  const handLen = H * 0.058 * prop.armScale;
  const armDir = new THREE.Vector3(Math.sin(armAngle), -Math.cos(armAngle), 0).normalize();
  const foreDir = new THREE.Vector3(Math.sin(armAngle * 0.62), -Math.cos(armAngle * 0.62), 0.05).normalize();

  const thick = (base: number) => base * (0.86 + b * 0.32);

  const shoulderL = new THREE.Vector3(sw, yShoulder, 0);
  const elbowL = shoulderL.clone().addScaledVector(armDir, upperLen);
  const wristL = elbowL.clone().addScaledVector(foreDir, foreLen);
  const hipL = new THREE.Vector3(hw, yHip, 0);
  const kneeL = new THREE.Vector3(hw * 0.94, yKnee, 0.012);
  const ankleL = new THREE.Vector3(hw * 0.88, yAnkle, -0.005);
  const toeL = new THREE.Vector3(hw * 0.88, H * 0.018, 0.1 * prop.legScale);
  const mirror = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, v.z);

  const specs: BoneSpec[] = [
    { name: 'root', parent: null, pos: new THREE.Vector3(0, 0, 0), radius: 0 },
    { name: 'hips', parent: 'root', pos: new THREE.Vector3(0, yHip, 0), radius: thick(H * 0.082) },
    { name: 'spine', parent: 'hips', pos: new THREE.Vector3(0, ySpine, 0.004), radius: thick(H * 0.075) },
    { name: 'chest', parent: 'spine', pos: new THREE.Vector3(0, yChest, 0.002), radius: thick(H * 0.087) },
    { name: 'neck', parent: 'chest', pos: new THREE.Vector3(0, yNeck, -0.008), radius: thick(H * 0.031) },
    { name: 'head', parent: 'neck', pos: new THREE.Vector3(0, yHead, 0.002), radius: H * 0.052 * prop.headScale },

    { name: 'shoulderL', parent: 'chest', pos: new THREE.Vector3(sw * 0.4, yShoulder - 0.008, 0), radius: thick(H * 0.029) },
    { name: 'armL', parent: 'shoulderL', pos: shoulderL, radius: thick(H * 0.028), radiusEnd: thick(H * 0.023) },
    { name: 'forearmL', parent: 'armL', pos: elbowL, radius: thick(H * 0.023), radiusEnd: thick(H * 0.0175) },
    { name: 'handL', parent: 'forearmL', pos: wristL, radius: thick(H * 0.021) },

    { name: 'shoulderR', parent: 'chest', pos: new THREE.Vector3(-sw * 0.4, yShoulder - 0.008, 0), radius: thick(H * 0.029) },
    { name: 'armR', parent: 'shoulderR', pos: mirror(shoulderL), radius: thick(H * 0.028), radiusEnd: thick(H * 0.023) },
    { name: 'forearmR', parent: 'armR', pos: mirror(elbowL), radius: thick(H * 0.023), radiusEnd: thick(H * 0.0175) },
    { name: 'handR', parent: 'forearmR', pos: mirror(wristL), radius: thick(H * 0.021) },

    { name: 'thighL', parent: 'hips', pos: hipL, radius: thick(H * 0.052), radiusEnd: thick(H * 0.037) },
    { name: 'shinL', parent: 'thighL', pos: kneeL, radius: thick(H * 0.037), radiusEnd: thick(H * 0.024) },
    { name: 'footL', parent: 'shinL', pos: ankleL, radius: thick(H * 0.026) },
    { name: 'toeL', parent: 'footL', pos: toeL, radius: thick(H * 0.02) },

    { name: 'thighR', parent: 'hips', pos: mirror(hipL), radius: thick(H * 0.052), radiusEnd: thick(H * 0.037) },
    { name: 'shinR', parent: 'thighR', pos: mirror(kneeL), radius: thick(H * 0.037), radiusEnd: thick(H * 0.024) },
    { name: 'footR', parent: 'shinR', pos: mirror(ankleL), radius: thick(H * 0.026) },
    { name: 'toeR', parent: 'footR', pos: mirror(toeL), radius: thick(H * 0.02) },
  ];

  const specByName = {} as Record<BoneName, BoneSpec>;
  for (const s of specs) specByName[s.name] = s;

  const bones: THREE.Bone[] = [];
  const byName = {} as Record<BoneName, THREE.Bone>;
  for (const s of specs) {
    const bone = new THREE.Bone();
    bone.name = s.name;
    const parentPos = s.parent ? specByName[s.parent].pos : new THREE.Vector3();
    bone.position.copy(s.pos).sub(parentPos);
    byName[s.name] = bone;
    bones.push(bone);
  }
  for (const s of specs) if (s.parent) byName[s.parent].add(byName[s.name]);

  const rootBone = byName.root;
  rootBone.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);

  const primaryChild: Partial<Record<BoneName, BoneName>> = {
    hips: 'spine', spine: 'chest', chest: 'neck', neck: 'head',
    shoulderL: 'armL', armL: 'forearmL', forearmL: 'handL',
    shoulderR: 'armR', armR: 'forearmR', forearmR: 'handR',
    thighL: 'shinL', shinL: 'footL', footL: 'toeL',
    thighR: 'shinR', shinR: 'footR', footR: 'toeR',
  };

  const segments = specs.map((s, i) => {
    const a = s.pos.clone();
    const childName = primaryChild[s.name];
    let bEnd: THREE.Vector3;
    if (childName) {
      bEnd = specByName[childName].pos.clone();
    } else if (s.name === 'head') {
      bEnd = s.pos.clone().add(new THREE.Vector3(0, headH * 0.4, 0));
    } else if (s.name === 'handL' || s.name === 'handR') {
      const elbow = specByName[s.name === 'handL' ? 'forearmL' : 'forearmR'].pos;
      bEnd = s.pos.clone().add(s.pos.clone().sub(elbow).setLength(handLen));
    } else if (s.name === 'toeL' || s.name === 'toeR') {
      bEnd = s.pos.clone().add(new THREE.Vector3(0, 0, 0.03));
    } else {
      bEnd = s.pos.clone().add(new THREE.Vector3(0, 0.02, 0));
    }
    return { name: s.name, index: i, a, b: bEnd, r0: s.radius, r1: s.radiusEnd ?? s.radius };
  });

  return { bones, byName, skeleton, specs, specByName, segments, proportions: prop, rootBone };
}

/** Distance from a point to a segment, plus the parametric position along it. */
export function distanceToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;
  const denom = abx * abx + aby * aby + abz * abz;
  let t = denom < 1e-12 ? 0 : (apx * abx + apy * aby + apz * abz) / denom;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { dist: Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t), t };
}
