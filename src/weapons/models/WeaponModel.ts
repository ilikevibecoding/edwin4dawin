import * as THREE from 'three';
import { clamp } from '../../core/MathUtils';
import type { PartState } from '../anim/State';
import type { SupportStyle } from './Hands';
import { Assembler, triangleCount } from './Parts';

/**
 * Named parts every weapon may expose. The animation system addresses parts by
 * name and silently skips what a given weapon does not have, so a revolver and
 * an LMG run through exactly the same code path.
 */
export type PartName =
  | 'receiver'
  | 'upperRail'
  | 'barrel'
  | 'muzzleDevice'
  | 'handguard'
  | 'gasBlock'
  | 'frontSight'
  | 'rearSight'
  | 'optic'
  | 'magazine'
  | 'magWell'
  | 'pistolGrip'
  | 'stock'
  | 'chargingHandle'
  | 'boltCarrier'
  | 'boltHandle'
  | 'ejectionPort'
  | 'dustCover'
  | 'triggerGuard'
  | 'trigger'
  | 'hammer'
  | 'safetySelector'
  | 'magRelease'
  | 'slingMount'
  | 'bipod'
  | 'pumpHandle'
  | 'cylinder'
  | 'slide'
  | 'chamberedCase'
  | 'ordnance'
  | 'blade'
  | 'markings';

export interface WeaponAnchorSet {
  /** At the bore exit, -Z along the bore. */
  muzzle: THREE.Object3D;
  /** The aiming reference: reticle centre or rear-sight notch, -Z along the sight line. */
  sight: THREE.Object3D;
  /** Where cases leave the gun, -Z along the ejection direction. */
  eject: THREE.Object3D;
  /** Bottom of the magazine well, where a dropped mag is spawned. */
  magWell: THREE.Object3D;
  /** Firing-hand wrap point, +Y up the grip. */
  grip: THREE.Object3D;
  /** Support-hand wrap point, +Y along the forend. */
  support: THREE.Object3D;
}

export interface ReticleSpec {
  object: THREE.Object3D;
  material: THREE.MeshBasicMaterial;
  /**
   * Collimated reticles are re-projected every frame so their apparent
   * direction is the sight axis regardless of where the eye sits, which is what
   * makes a red dot parallax-free. Magnified optics keep theirs in the tube.
   */
  parallaxFree: boolean;
  /**
   * The plane's rest position in its parent, captured at build time. A tube
   * reticle is nudged across the axis every frame, so the correction needs an
   * unmoved origin to be measured from or it integrates frame over frame.
   */
  authoredPosition: THREE.Vector3;
  /** Where along the sight axis the reticle plane sits, metres from the eye. */
  glassDistance: number;
  /** Half-angle in radians past which the dot leaves the eyebox and fades. */
  eyebox: number;
  baseScale: number;
  /** Annulus at the ocular lens, grown inwards as the eye leaves the axis. */
  shadow?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /**
   * Ocular disc of a magnified optic. The viewmodel gives this mesh the scope
   * render (see ScopeView), which is the only way to get real magnification out
   * of a tube you cannot see through, and sizes the reticle to `radius`.
   */
  aperture?: { mesh: THREE.Mesh; radius: number };
}

export interface PartTravel {
  bolt: number;
  charging: number;
  pump: number;
  slide: number;
  mag: number;
  boltHandleAngle: number;
  cylinderStep: number;
}

export interface WeaponBuild {
  assembler: Assembler;
  anchors: WeaponAnchorSet;
  reticle?: ReticleSpec;
  /** Eye-to-sight distance when aiming; short for irons, long for a scope. */
  eyeRelief: number;
  /**
   * Per-weapon trim on the hip pose, which the viewmodel derives from the aimed
   * pose. Both default to zero; they exist for the handful of weapons whose
   * layout wants a nudge, not as the primary way to place a weapon.
   */
  hipTrim?: readonly [number, number, number];
  hipTrimRotation?: readonly [number, number, number];
  travel?: Partial<PartTravel>;
  /** Support hand rides the pump/forend instead of the handguard. */
  supportOnPump?: boolean;
  /** Weapon is held one-handed (pistols keep the support hand off). */
  oneHanded?: boolean;
  /** Shoulder-fired tube: support hand under the front grip. */
  shoulderTube?: boolean;
  /** Radius the firing hand closes around; sizes the fist mesh. */
  gripRadius?: number;
  /** Radius the support hand closes around. */
  supportRadius?: number;
  /** How the support hand is shaped; defaults to a handguard C-clamp. */
  supportStyle?: SupportStyle;
}

const ZERO3: readonly [number, number, number] = [0, 0, 0];

const DEFAULT_TRAVEL: PartTravel = {
  bolt: 0.052,
  charging: 0.052,
  pump: 0.062,
  slide: 0.032,
  mag: 0.16,
  boltHandleAngle: 1.05,
  cylinderStep: Math.PI / 3,
};

interface BasePose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/**
 * A built weapon: the mesh hierarchy plus everything the animation and aiming
 * code needs to drive it. Base transforms of the animated parts are captured at
 * construction so every animation is expressed as an offset and can never
 * accumulate drift.
 */
export class WeaponModel {
  readonly id: string;
  readonly root: THREE.Group;
  readonly parts: ReadonlyMap<string, THREE.Group>;
  readonly anchors: WeaponAnchorSet;
  readonly reticle: ReticleSpec | null;
  readonly eyeRelief: number;
  /** Additive nudge applied on top of the derived hip pose (see ViewModel.solvePoses). */
  readonly hipTrim = new THREE.Vector3();
  readonly hipTrimRotation = new THREE.Vector3();
  readonly travel: PartTravel;
  readonly triangles: number;
  readonly supportOnPump: boolean;
  readonly oneHanded: boolean;
  readonly shoulderTube: boolean;
  readonly gripRadius: number;
  readonly supportRadius: number;
  readonly supportStyle: SupportStyle;

  /** Sight transform in weapon space, the basis of the ADS solve. */
  readonly sightLocalPosition = new THREE.Vector3();
  readonly sightLocalQuaternion = new THREE.Quaternion();
  readonly muzzleLocalPosition = new THREE.Vector3();

  private readonly basePoses = new Map<string, BasePose>();
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchScale = new THREE.Vector3();

  constructor(id: string, build: WeaponBuild) {
    this.id = id;
    this.root = build.assembler.root;
    this.parts = build.assembler.parts;
    this.anchors = build.anchors;
    this.reticle = build.reticle ?? null;
    if (this.reticle) this.reticle.authoredPosition.copy(this.reticle.object.position);
    this.eyeRelief = build.eyeRelief;
    const trim = build.hipTrim ?? ZERO3;
    const trimRot = build.hipTrimRotation ?? ZERO3;
    this.hipTrim.set(trim[0], trim[1], trim[2]);
    this.hipTrimRotation.set(trimRot[0], trimRot[1], trimRot[2]);
    this.travel = { ...DEFAULT_TRAVEL, ...(build.travel ?? {}) };
    this.supportOnPump = build.supportOnPump ?? false;
    this.oneHanded = build.oneHanded ?? false;
    this.shoulderTube = build.shoulderTube ?? false;
    this.gripRadius = build.gripRadius ?? 0.019;
    this.supportRadius = build.supportRadius ?? 0.026;
    this.supportStyle =
      build.supportStyle ?? (this.oneHanded ? 'none' : this.supportOnPump ? 'pump' : 'forend');

    for (const [name, group] of this.parts) {
      this.basePoses.set(name, {
        position: group.position.clone(),
        quaternion: group.quaternion.clone(),
      });
    }

    this.localTransform(this.anchors.sight, this.sightLocalPosition, this.sightLocalQuaternion);
    this.localTransform(this.anchors.muzzle, this.muzzleLocalPosition, new THREE.Quaternion());
    this.triangles = triangleCount(this.root);
  }

  part(name: PartName): THREE.Group | null {
    return this.parts.get(name) ?? null;
  }

  /** Transform of `object` expressed in weapon space, parents included. */
  localTransform(
    object: THREE.Object3D,
    outPosition: THREE.Vector3,
    outQuaternion: THREE.Quaternion,
  ): void {
    const chain: THREE.Object3D[] = [];
    let cur: THREE.Object3D | null = object;
    while (cur && cur !== this.root) {
      chain.push(cur);
      cur = cur.parent;
    }
    this.scratchMatrix.identity();
    for (let i = chain.length - 1; i >= 0; i--) {
      chain[i].updateMatrix();
      this.scratchMatrix.multiply(chain[i].matrix);
    }
    this.scratchMatrix.decompose(outPosition, outQuaternion, this.scratchScale);
  }

  /**
   * Maps the animation channels onto whatever parts exist. Rotations are about
   * the part's own pivot, which is why every builder places grips, covers and
   * handles at their hinge rather than at their centre of mass.
   */
  applyParts(s: PartState): void {
    const t = this.travel;

    this.offsetZ('boltCarrier', s.bolt * t.bolt);
    this.offsetZ('chargingHandle', s.charging * t.charging);
    this.offsetZ('pumpHandle', s.pump * t.pump);
    this.offsetZ('slide', s.slide * t.slide);

    const boltHandle = this.parts.get('boltHandle');
    if (boltHandle) {
      const base = this.basePoses.get('boltHandle');
      if (base) {
        boltHandle.position.copy(base.position);
        boltHandle.position.z += s.bolt * t.bolt;
        boltHandle.quaternion.copy(base.quaternion);
        boltHandle.rotateZ(-s.boltHandle * t.boltHandleAngle);
      }
    }

    this.rotateAxis('trigger', 'x', -s.trigger * 0.34);
    // The hammer falls forward; the dust cover hinges about the bore axis.
    this.rotateAxis('hammer', 'x', -(1 - s.hammer) * 0.9);
    this.rotateAxis('dustCover', 'z', s.dustCover * 1.35);
    this.rotateAxis('safetySelector', 'z', (1 - s.safety) * 1.0);

    const cylinder = this.parts.get('cylinder');
    if (cylinder) {
      const base = this.basePoses.get('cylinder');
      if (base) {
        cylinder.quaternion.copy(base.quaternion);
        cylinder.rotateZ(s.cylinder);
      }
    }

    const magazine = this.parts.get('magazine');
    if (magazine) {
      const base = this.basePoses.get('magazine');
      if (base) {
        const drop = clamp(s.magDrop, 0, 1.6);
        magazine.position.copy(base.position);
        magazine.position.y -= drop * t.mag;
        magazine.position.z += drop * t.mag * 0.16;
        magazine.quaternion.copy(base.quaternion);
        magazine.rotateX(drop * 0.32);
        magazine.visible = s.magVisible;
      }
    }

    const bipod = this.parts.get('bipod');
    if (bipod) {
      const base = this.basePoses.get('bipod');
      if (base) {
        bipod.quaternion.copy(base.quaternion);
        bipod.rotateX(-s.bipod * 1.35);
      }
    }

    const chambered = this.parts.get('chamberedCase');
    if (chambered) chambered.visible = s.caseVisible;
    const ordnance = this.parts.get('ordnance');
    if (ordnance) ordnance.visible = s.ordnanceVisible;
  }

  private offsetZ(name: PartName, dz: number): void {
    const part = this.parts.get(name);
    const base = this.basePoses.get(name);
    if (!part || !base) return;
    part.position.copy(base.position);
    part.position.z += dz;
  }

  private rotateAxis(name: PartName, axis: 'x' | 'y' | 'z', angle: number): void {
    const part = this.parts.get(name);
    const base = this.basePoses.get(name);
    if (!part || !base) return;
    part.quaternion.copy(base.quaternion);
    if (angle === 0) return;
    if (axis === 'x') part.rotateX(angle);
    else if (axis === 'y') part.rotateY(angle);
    else part.rotateZ(angle);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
    // A collimated reticle is re-projected into view space rather than parented
    // to the optic, so hiding the weapon has to hide it explicitly.
    if (this.reticle) this.reticle.object.visible = visible;
  }

  dispose(): void {
    const seen = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      if (geometry && !seen.has(geometry)) {
        seen.add(geometry);
        geometry.dispose();
      }
    });
    this.root.removeFromParent();
    if (this.reticle) {
      this.reticle.object.removeFromParent();
      this.reticle.material.dispose();
    }
  }
}
