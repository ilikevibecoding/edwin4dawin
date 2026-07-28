import * as THREE from 'three';
import type { WeaponStats } from '../core/Interfaces';
import type { QualitySettings } from '../core/Quality';
import type { AssemblyMaterials } from './parts/Assembly';
import type { OpticKind, OpticRig } from './Optics';

/**
 * What a weapon model hands the rest of the system.
 *
 * The one invariant every model must honour: **the active sight's line of sight
 * is the -Z axis through the model origin**. Aiming is then a translation of
 * `adsEyeRelief` back along Z with no rotation, the sight picture lands exactly
 * on the viewmodel camera's optical axis, and the alignment is independent of
 * field of view — which matters because the viewmodel camera does not share the
 * world camera's.
 *
 * Every optic obeys it too: a red dot is mounted at absolute co-witness, so
 * swapping irons for a reflex changes what you look through and nothing else.
 */

/** A weapon-root pose, in metres and radians relative to the eye. */
export interface Pose {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
}

export function pose(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0): Pose {
  return { px, py, pz, rx, ry, rz };
}

export const RIG = {
  /** Everything that does not move relative to the receiver. */
  body: 'body',
  /** Reciprocating bolt / slide / bolt carrier. */
  bolt: 'bolt',
  /** Charging handle, when it does not reciprocate with the bolt. */
  charge: 'charge',
  magazine: 'magazine',
  trigger: 'trigger',
  hammer: 'hammer',
  /** Pump fore-end (shotgun) or side-folding stock hinge. */
  pump: 'pump',
  stock: 'stock',
  bipod: 'bipod',
  optic: 'optic',
  /** Loose round shown in the shooter's hand during a shell-by-shell reload. */
  loose: 'loose',
  /** Ejection-port dust cover. */
  dust: 'dust',
} as const;

export type RigNode = (typeof RIG)[keyof typeof RIG];

/** How a weapon's reload sequence is choreographed. */
export type ReloadStyle = 'magazine' | 'shellByShell' | 'boltAction';

export interface WeaponModel {
  id: string;
  root: THREE.Group;
  nodes: Map<string, THREE.Group>;
  triangles: number;
  geometries: THREE.BufferGeometry[];
  optic: OpticRig | null;
  opticKind: OpticKind;

  /** Distance from the eye to the model origin at full ADS. */
  adsEyeRelief: number;
  /**
   * Viewmodel camera field of view, hip and full ADS.
   *
   * The world camera has its own (`stats.fov` / `stats.adsFov`) and the two are
   * deliberately unrelated. This one is a pure crop: perspective is set by where
   * the weapon sits relative to the eye, and *that* is pinned by the viewmodel
   * pass's depth of field — 0.62 m unaimed, 0.34 m aimed, with only a few
   * centimetres of sharp either side. So the distance buys the focus and the
   * field of view buys the size, independently, and aiming can grow the sight
   * picture by the seven times it takes to read as bringing the gun to the eye.
   */
  vmFovHip: number;
  vmFovAds: number;

  /**
   * The two points the player lines up, in weapon space: the rear notch or the
   * centre of the optic's glass, and the front post or the far end of the
   * optical axis. They exist so the alignment can be *measured* rather than
   * asserted — projecting the model origin proves only that the origin is where
   * the pose put it, which is true by construction and says nothing about
   * whether there is a sight there.
   */
  sightRear: THREE.Vector3;
  sightFront: THREE.Vector3;

  /** Muzzle in weapon space: flash, tracer origin and the bore axis. */
  muzzle: THREE.Vector3;
  /** Ejection port in weapon space, and the direction brass leaves it. */
  ejectPort: THREE.Vector3;
  ejectDir: THREE.Vector3;
  /** Where a dropped magazine appears. */
  magSocket: THREE.Vector3;

  hipPose: Pose;
  adsPose: Pose;
  sprintPose: Pose;
  loweredPose: Pose;
  inspectPose: Pose;

  /** Metres the bolt travels rearward on a shot. */
  boltTravel: number;
  /** Metres the charging handle travels when cycled by hand. */
  chargeTravel: number;
  /** Metres the pump fore-end travels, for the shotgun. */
  pumpTravel: number;
  /** Trigger blade rotation at full pull, radians about X. */
  triggerPull: number;
  /** Bolt handle lift and pull, for a turn-bolt action. */
  boltLift: number;

  reloadStyle: ReloadStyle;

  /** Magazine half-extents, so the dropped body matches what fell out. */
  magSize: THREE.Vector3;
  caseRadius: number;
  caseLength: number;

  /** Set false while the magazine is out of the well. */
  setMagVisible(visible: boolean): void;
  /** Bolt held to the rear on an empty magazine. */
  setBoltLocked(locked: boolean): void;
  dispose(): void;
}

export interface ModelVariant {
  optic: OpticKind;
  suppressor: boolean;
}

export interface ModelDeps {
  quality: QualitySettings;
  materials: AssemblyMaterials;
  /** `baseY` is the y of the surface the optic clamps to, in weapon space. */
  makeOptic(kind: OpticKind, baseY: number): OpticRig | null;
}

export type ModelBuilder = (deps: ModelDeps, variant: ModelVariant) => WeaponModel;

export interface WeaponDef {
  stats: WeaponStats;
  build: ModelBuilder;
  /** Optics this weapon can carry, first entry being the default. */
  optics: OpticKind[];
  /**
   * Deterministic recoil pattern, in units of `recoilVertical` /
   * `recoilHorizontal`, walked one entry per shot and held at the last entry.
   * This is what makes a spray learnable instead of a dice roll.
   */
  pattern: Array<[number, number]>;
  /** Cartridge for the ejected brass. */
  caliber: number;
}
