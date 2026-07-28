import * as THREE from 'three';
import { Layers } from '../../core/GameContext';
import type { BuiltModel } from '../parts/Assembly';
import { opticSpec, type OpticKind, type OpticRig } from '../Optics';
import type { ModelDeps, Pose, ReloadStyle, WeaponModel } from '../WeaponModel';

/**
 * The last mile shared by every model: mount the optic so its axis lands on the
 * sight line, work out where the eye has to sit behind it, and wrap the built
 * groups in the `WeaponModel` the animation rig drives.
 */

export interface FinishSpec {
  id: string;
  built: BuiltModel;
  deps: ModelDeps;
  opticKind: OpticKind;
  /** Z of the optic node in weapon space. Its axis is always y = 0. */
  opticZ: number;
  /** Y of the surface an optic clamps to, in weapon space. */
  opticBaseY: number;
  vmFovHip: number;
  /** Aimed viewmodel field of view over irons; an optic overrides it. */
  vmFovAds: number;
  /** The world camera's unaimed field of view, which scope magnification is measured against. */
  baseFov: number;

  /**
   * Rear and front iron sight, in weapon space, used when no optic is fitted.
   * An optic replaces both with its own axis.
   */
  ironRear: [number, number, number];
  ironFront: [number, number, number];

  muzzle: [number, number, number];
  ejectPort: [number, number, number];
  ejectDir: [number, number, number];
  magSocket: [number, number, number];

  hipPose: Pose;
  adsPose?: Pose;
  sprintPose: Pose;
  loweredPose: Pose;
  inspectPose: Pose;

  boltTravel: number;
  chargeTravel?: number;
  pumpTravel?: number;
  triggerPull?: number;
  boltLift?: number;
  reloadStyle: ReloadStyle;
  magSize: [number, number, number];
  caseRadius: number;
  caseLength: number;

  /** Extra offset the bolt takes when locked back on an empty magazine. */
  boltLockTravel?: number;
}

/**
 * Distance from the eye to whatever is being looked through, at full ADS.
 *
 * It is `ViewmodelPass.adsFocus`, and it is not negotiable: the aimed depth of
 * field is sharp over about 60 mm and blurs hard outside that, so a sight
 * placed anywhere else is a soft sight no matter how well it is modelled. The
 * apparent size of the sight picture is bought back with `vmFovAds`, which is
 * free — the viewmodel camera shares nothing with the world's but its position.
 */
const ADS_FOCUS = 0.34;

export function finishModel(spec: FinishSpec): WeaponModel {
  const { built, deps } = spec;
  const nodes = built.nodes;

  let optic: OpticRig | null = null;
  let eyeRelief = ADS_FOCUS + spec.ironRear[2];
  let vmFovAds = spec.vmFovAds;
  if (spec.opticKind !== 'none' && spec.opticKind !== 'irons') {
    optic = deps.makeOptic(spec.opticKind, spec.opticBaseY);
    const s = opticSpec(spec.opticKind);
    if (optic && s) {
      const host = nodes.get('optic') ?? built.root;
      optic.group.position.set(0, 0, spec.opticZ - host.position.z);
      host.add(optic.group);
      /* The optic, not the weapon, decides both of these: the eye goes where
         the glass lands on the viewmodel pass's focus plane, and the aimed
         field of view is whatever makes this particular sight fill the share of
         the screen it should. A reflex and an 8x scope want very different
         answers and neither is the host rifle's business. */
      eyeRelief = spec.opticZ + s.glassZ + s.eyeDistance;
      vmFovAds = s.vmFovAds;
      optic.frame(vmFovAds, spec.baseFov);
      built.triangles += optic.triangles;
    }
  }

  built.root.layers.set(Layers.VIEWMODEL);
  built.root.traverse((o) => o.layers.set(Layers.VIEWMODEL));

  const boltNode = nodes.get('bolt') ?? null;
  const magNode = nodes.get('magazine') ?? null;
  const boltLock = spec.boltLockTravel ?? spec.boltTravel;

  /* An optic replaces the irons as the thing being looked through, and its axis
     is y = 0 by construction, so the two reference points collapse onto the
     bore of the sight. The far one is a point on the axis rather than a real
     feature: a collimated reticle has no front sight, and what has to land on
     the screen centre is the direction, not a part. */
  const rear: [number, number, number] = optic
    ? [0, 0, spec.opticZ + (opticSpec(spec.opticKind)?.glassZ ?? 0)]
    : spec.ironRear;
  const front: [number, number, number] = optic
    ? [0, 0, rear[2] - 0.25]
    : spec.ironFront;

  const model: WeaponModel = {
    id: spec.id,
    root: built.root,
    nodes,
    triangles: built.triangles,
    geometries: built.geometries,
    optic,
    opticKind: spec.opticKind,
    adsEyeRelief: eyeRelief,
    vmFovHip: spec.vmFovHip,
    vmFovAds,
    sightRear: new THREE.Vector3(...rear),
    sightFront: new THREE.Vector3(...front),
    muzzle: new THREE.Vector3(...spec.muzzle),
    ejectPort: new THREE.Vector3(...spec.ejectPort),
    ejectDir: new THREE.Vector3(...spec.ejectDir).normalize(),
    magSocket: new THREE.Vector3(...spec.magSocket),
    hipPose: spec.hipPose,
    // Pure translation along the optical axis: the model origin lands exactly
    // on the camera's -Z, so the sight picture is centred at any field of view.
    adsPose: spec.adsPose ?? { px: 0, py: 0, pz: -eyeRelief, rx: 0, ry: 0, rz: 0 },
    sprintPose: spec.sprintPose,
    loweredPose: spec.loweredPose,
    inspectPose: spec.inspectPose,
    boltTravel: spec.boltTravel,
    chargeTravel: spec.chargeTravel ?? spec.boltTravel,
    pumpTravel: spec.pumpTravel ?? 0,
    triggerPull: spec.triggerPull ?? 0.28,
    boltLift: spec.boltLift ?? 0,
    reloadStyle: spec.reloadStyle,
    magSize: new THREE.Vector3(...spec.magSize),
    caseRadius: spec.caseRadius,
    caseLength: spec.caseLength,
    setMagVisible(visible: boolean): void {
      if (magNode) magNode.visible = visible;
    },
    setBoltLocked(locked: boolean): void {
      if (boltNode) boltNode.userData.locked = locked ? boltLock : 0;
    },
    dispose(): void {
      for (const g of built.geometries) g.dispose();
      optic?.dispose();
    },
  };
  if (boltNode) boltNode.userData.locked = 0;
  // The spare round only exists during a shell-by-shell reload; left on, it
  // floats under the receiver in every other frame the weapon appears in.
  const looseNode = nodes.get('loose');
  if (looseNode) looseNode.visible = false;
  return model;
}
