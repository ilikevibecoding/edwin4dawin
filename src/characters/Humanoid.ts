import * as THREE from 'three';
import { boxAt, mergeParts } from '../assets/Greeble';

/**
 * Stylised humanoid rig.
 *
 * Everything is built from primitives on a fixed joint hierarchy so a single
 * animation system can pose every character. Proportions are slightly
 * exaggerated (big helmets, strong shoulders) to keep silhouettes readable at
 * cinematic distances.
 *
 * The rig stands with its feet on y = 0 and faces -Z, matching the ships.
 */

export interface HumanoidProportions {
  height: number;
  shoulderWidth: number;
  hipWidth: number;
  limbThickness: number;
  headRadius: number;
  bulk: number;
}

export const DEFAULT_PROPORTIONS: HumanoidProportions = {
  height: 1.78,
  shoulderWidth: 0.42,
  hipWidth: 0.3,
  limbThickness: 0.1,
  headRadius: 0.115,
  bulk: 1,
};

export interface HumanoidRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  handL: THREE.Group;
  handR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  footL: THREE.Group;
  footR: THREE.Group;
  proportions: HumanoidProportions;
  /** Vertical distance from root to the shoulder pivot. */
  shoulderHeight: number;
  hipHeight: number;
}

function group(name: string, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

export function buildHumanoidRig(p: Partial<HumanoidProportions> = {}): HumanoidRig {
  const prop = { ...DEFAULT_PROPORTIONS, ...p };
  const h = prop.height;
  const hipHeight = h * 0.52;
  const shoulderHeight = h * 0.82;

  const root = group('character');
  const hips = group('hips', 0, hipHeight, 0);
  root.add(hips);

  const torso = group('torso', 0, 0, 0);
  hips.add(torso);
  const chest = group('chest', 0, (shoulderHeight - hipHeight) * 0.62, 0);
  torso.add(chest);
  const neck = group('neck', 0, (shoulderHeight - hipHeight) * 0.38 + 0.03, 0);
  chest.add(neck);
  const head = group('head', 0, prop.headRadius + 0.04, 0);
  neck.add(head);

  const shoulderL = group('shoulderL', -prop.shoulderWidth / 2, (shoulderHeight - hipHeight) * 0.36, 0);
  const shoulderR = group('shoulderR', prop.shoulderWidth / 2, (shoulderHeight - hipHeight) * 0.36, 0);
  chest.add(shoulderL, shoulderR);

  const upperArmLen = h * 0.17;
  const foreArmLen = h * 0.16;
  const elbowL = group('elbowL', 0, -upperArmLen, 0);
  const elbowR = group('elbowR', 0, -upperArmLen, 0);
  shoulderL.add(elbowL);
  shoulderR.add(elbowR);
  const handL = group('handL', 0, -foreArmLen, 0);
  const handR = group('handR', 0, -foreArmLen, 0);
  elbowL.add(handL);
  elbowR.add(handR);

  const hipL = group('hipL', -prop.hipWidth / 2, 0, 0);
  const hipR = group('hipR', prop.hipWidth / 2, 0, 0);
  hips.add(hipL, hipR);
  const thighLen = hipHeight * 0.52;
  const shinLen = hipHeight * 0.44;
  const kneeL = group('kneeL', 0, -thighLen, 0);
  const kneeR = group('kneeR', 0, -thighLen, 0);
  hipL.add(kneeL);
  hipR.add(kneeR);
  const footL = group('footL', 0, -shinLen, 0);
  const footR = group('footR', 0, -shinLen, 0);
  kneeL.add(footL);
  kneeR.add(footR);

  return {
    root,
    hips,
    torso,
    chest,
    neck,
    head,
    shoulderL,
    shoulderR,
    elbowL,
    elbowR,
    handL,
    handR,
    hipL,
    hipR,
    kneeL,
    kneeR,
    footL,
    footR,
    proportions: prop,
    shoulderHeight,
    hipHeight,
  };
}

export interface SkinOptions {
  bodyMat: THREE.Material;
  limbMat: THREE.Material;
  bootMat: THREE.Material;
  headMat: THREE.Material;
  beltMat?: THREE.Material;
  /** Thicker plates for armoured characters. */
  armor?: boolean;
  shoulderPads?: boolean;
}

/** Attach the standard body meshes to a rig. */
export function skinHumanoid(rig: HumanoidRig, opts: SkinOptions): void {
  const p = rig.proportions;
  const h = p.height;
  const torsoLen = rig.shoulderHeight - rig.hipHeight;
  const th = p.limbThickness * p.bulk;

  const chestGeo = mergeParts([
    boxAt(p.shoulderWidth * 1.02, torsoLen * 0.62, p.shoulderWidth * 0.58, 0, torsoLen * 0.3, 0),
    boxAt(p.hipWidth * 1.25, torsoLen * 0.42, p.shoulderWidth * 0.52, 0, torsoLen * 0.02, 0),
  ]);
  const chestMesh = new THREE.Mesh(chestGeo, opts.bodyMat);
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  rig.torso.add(chestMesh);

  if (opts.beltMat) {
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(p.hipWidth * 1.32, 0.075, p.shoulderWidth * 0.6),
      opts.beltMat,
    );
    belt.position.y = -0.02;
    rig.torso.add(belt);
  }

  // Neck.
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(p.headRadius * 0.48, p.headRadius * 0.55, 0.08, 8),
    opts.limbMat,
  );
  rig.neck.add(neckMesh);

  // Head (a capsule-ish box; sub-classes usually add a helmet on top).
  const headGeo = new THREE.SphereGeometry(p.headRadius, 12, 10);
  headGeo.scale(0.92, 1.08, 0.96);
  const headMesh = new THREE.Mesh(headGeo, opts.headMat);
  headMesh.castShadow = true;
  rig.head.add(headMesh);

  // Arms.
  const upperLen = h * 0.17;
  const foreLen = h * 0.16;
  for (const [shoulder, elbow, hand, side] of [
    [rig.shoulderL, rig.elbowL, rig.handL, -1],
    [rig.shoulderR, rig.elbowR, rig.handR, 1],
  ] as Array<[THREE.Group, THREE.Group, THREE.Group, number]>) {
    if (opts.shoulderPads) {
      // Angular pauldrons: spheres here turn an armoured trooper into a
      // snowman as soon as the camera gets close.
      const pad = new THREE.Mesh(new THREE.BoxGeometry(th * 2.5, th * 1.5, th * 2.2), opts.bodyMat);
      pad.position.set(side * th * 0.35, -th * 0.5, 0);
      pad.rotation.z = -side * 0.22;
      pad.castShadow = true;
      shoulder.add(pad);
    }
    if (opts.armor) {
      // Armoured limbs are plated boxes with a dark bodyglove at the joints.
      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(th * 1.9, upperLen * 0.78, th * 1.8),
        opts.limbMat,
      );
      upper.position.y = -upperLen * 0.46;
      upper.castShadow = true;
      shoulder.add(upper);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(th * 0.86, 8, 6), opts.bootMat);
      joint.position.y = -upperLen * 0.94;
      shoulder.add(joint);
      const fore = new THREE.Mesh(
        new THREE.BoxGeometry(th * 1.7, foreLen * 0.76, th * 1.6),
        opts.limbMat,
      );
      fore.position.y = -foreLen * 0.46;
      fore.castShadow = true;
      elbow.add(fore);
    } else {
      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(th * 0.95, upperLen * 0.72, 3, 8),
        opts.limbMat,
      );
      upper.position.y = -upperLen / 2;
      upper.castShadow = true;
      shoulder.add(upper);
      const fore = new THREE.Mesh(
        new THREE.CapsuleGeometry(th * 0.86, foreLen * 0.7, 3, 8),
        opts.limbMat,
      );
      fore.position.y = -foreLen / 2;
      fore.castShadow = true;
      elbow.add(fore);
    }

    const handMesh = new THREE.Mesh(new THREE.BoxGeometry(th * 1.5, th * 1.7, th * 1.2), opts.bootMat);
    handMesh.position.set(side * 0.005, -th * 0.7, 0);
    hand.add(handMesh);
  }

  // Legs.
  const thighLen = rig.hipHeight * 0.52;
  const shinLen = rig.hipHeight * 0.44;
  for (const [hip, knee, foot] of [
    [rig.hipL, rig.kneeL, rig.footL],
    [rig.hipR, rig.kneeR, rig.footR],
  ] as Array<[THREE.Group, THREE.Group, THREE.Group]>) {
    const thigh = opts.armor
      ? new THREE.Mesh(new THREE.BoxGeometry(th * 2.3, thighLen * 0.74, th * 2.2), opts.limbMat)
      : new THREE.Mesh(new THREE.CapsuleGeometry(th * 1.25, thighLen * 0.66, 3, 8), opts.limbMat);
    thigh.position.y = -thighLen * (opts.armor ? 0.44 : 0.5);
    thigh.castShadow = true;
    hip.add(thigh);
    if (opts.armor) {
      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(th * 1.0, 8, 6), opts.bootMat);
      kneeJoint.position.y = -thighLen * 0.92;
      hip.add(kneeJoint);
    }

    const shin = opts.armor
      ? new THREE.Mesh(new THREE.BoxGeometry(th * 2.0, shinLen * 0.78, th * 1.9), opts.limbMat)
      : new THREE.Mesh(new THREE.CapsuleGeometry(th * 1.05, shinLen * 0.68, 3, 8), opts.limbMat);
    shin.position.y = -shinLen * (opts.armor ? 0.46 : 0.5);
    shin.castShadow = true;
    knee.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(th * 2.2, th * 1.3, th * 3.4), opts.bootMat);
    boot.position.set(0, th * 0.5, -th * 0.7);
    boot.castShadow = true;
    foot.add(boot);
  }
}

/** A compact blaster prop with a muzzle anchor for bolt spawning. */
export function buildBlaster(
  bodyMat: THREE.Material,
  accentMat: THREE.Material,
  scale = 1,
): { root: THREE.Group; muzzle: THREE.Object3D } {
  const root = new THREE.Group();
  root.name = 'blaster';
  const body = new THREE.Mesh(
    mergeParts([
      boxAt(0.045, 0.055, 0.26, 0, 0, -0.06),
      boxAt(0.04, 0.12, 0.05, 0, -0.08, 0.03),
      boxAt(0.03, 0.03, 0.1, 0, 0.045, -0.02),
    ]),
    bodyMat,
  );
  root.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.12, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.23;
  root.add(barrel);
  const muzzle = new THREE.Object3D();
  muzzle.name = 'muzzle';
  muzzle.position.set(0, 0, -0.3);
  root.add(muzzle);
  root.scale.setScalar(scale);
  return { root, muzzle };
}
