import * as THREE from 'three';
import { Groups, setHitMeta } from '../core/GameContext';
import type { IPhysics } from '../core/Interfaces';
import { B } from './SoldierSkeleton';

/**
 * Per-bone colliders.
 *
 * The weapon system resolves a shot by raycasting the physics world and reading
 * `damageScale` and `entityId` off whatever it hit, so hit location is entirely
 * a matter of putting the right boxes in the right places and labelling them.
 * They are parented to bones, which means the animation drives them for free
 * and a soldier leaning out of cover presents exactly the silhouette he is
 * drawn with — no separate "hit capsule" that disagrees with the picture.
 *
 * Ballistics treats any scale at or above 1.8 as a headshot, so the head is
 * 2.0 and nothing else comes close to it. Limbs are cheap, the abdomen slightly
 * less valuable than the chest: the numbers are chosen so a three-round burst
 * to the torso kills, a burst to the legs does not, and one round to the head
 * always does.
 */

export const HEAD_SCALE = 2;

interface BoxDef {
  bone: number;
  name: string;
  scale: number;
  /** Local offset from the bone, in bind metres. */
  px: number;
  py: number;
  pz: number;
  /** Half extents, bind metres. */
  sx: number;
  sy: number;
  sz: number;
  /** Pitch about X so a limb box lies along the limb. */
  pitch: number;
}

const BOXES: readonly BoxDef[] = [
  { bone: B.head, name: 'head', scale: HEAD_SCALE, px: 0, py: 0.085, pz: 0.012, sx: 0.098, sy: 0.115, sz: 0.108, pitch: 0 },
  { bone: B.chest, name: 'chest', scale: 1, px: 0, py: 0.055, pz: 0.005, sx: 0.185, sy: 0.115, sz: 0.13, pitch: 0 },
  { bone: B.spine1, name: 'abdomen', scale: 0.95, px: 0, py: 0.075, pz: 0.005, sx: 0.16, sy: 0.11, sz: 0.115, pitch: 0 },
  { bone: B.pelvis, name: 'pelvis', scale: 0.9, px: 0, py: 0.02, pz: 0, sx: 0.155, sy: 0.1, sz: 0.115, pitch: 0 },

  { bone: B.armL, name: 'armL', scale: 0.66, px: 0.03, py: -0.115, pz: 0.03, sx: 0.062, sy: 0.135, sz: 0.062, pitch: 0.22 },
  { bone: B.armR, name: 'armR', scale: 0.66, px: -0.03, py: -0.115, pz: 0.03, sx: 0.062, sy: 0.135, sz: 0.062, pitch: 0.22 },
  { bone: B.foreL, name: 'foreL', scale: 0.58, px: -0.045, py: 0.005, pz: 0.09, sx: 0.055, sy: 0.055, sz: 0.115, pitch: 0 },
  { bone: B.foreR, name: 'foreR', scale: 0.58, px: 0.06, py: -0.02, pz: 0.05, sx: 0.055, sy: 0.055, sz: 0.105, pitch: 0 },

  { bone: B.thighL, name: 'thighL', scale: 0.76, px: 0.006, py: -0.2, pz: 0.014, sx: 0.083, sy: 0.2, sz: 0.088, pitch: 0 },
  { bone: B.thighR, name: 'thighR', scale: 0.76, px: -0.006, py: -0.2, pz: 0.014, sx: 0.083, sy: 0.2, sz: 0.088, pitch: 0 },
  { bone: B.calfL, name: 'calfL', scale: 0.62, px: -0.003, py: -0.195, pz: -0.018, sx: 0.068, sy: 0.19, sz: 0.075, pitch: 0 },
  { bone: B.calfR, name: 'calfR', scale: 0.62, px: 0.003, py: -0.195, pz: -0.018, sx: 0.068, sy: 0.19, sz: 0.075, pitch: 0 },
];

export const HITBOX_COUNT = BOXES.length;

/** Shared unit cube; every collider is this geometry with a scale. */
const UNIT = new THREE.BoxGeometry(1, 1, 1);
/** Never drawn, but `THREE.Mesh` is what carries a geometry bounding box. */
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });

const _v = new THREE.Vector3();

export class Hitboxes {
  readonly meshes: THREE.Mesh[] = [];
  /** Bone index behind each collider, so a hit can be traced to a limb. */
  readonly bones: number[] = [];
  private registered = false;

  constructor(entityId: number) {
    for (const def of BOXES) {
      const mesh = new THREE.Mesh(UNIT, HIDDEN);
      mesh.name = `hitbox_${def.name}`;
      mesh.position.set(def.px, def.py, def.pz);
      if (def.pitch !== 0) mesh.rotation.x = def.pitch;
      mesh.scale.set(def.sx * 2, def.sy * 2, def.sz * 2);
      mesh.visible = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = true;
      setHitMeta(mesh, {
        surface: 'flesh',
        group: Groups.ENEMY,
        damageScale: def.scale,
        entityId,
        penetration: 0.05,
      });
      this.meshes.push(mesh);
      this.bones.push(def.bone);
    }
  }

  /** Parents each collider to its bone. Called once, when the agent is built. */
  attach(bones: THREE.Bone[]): void {
    for (let i = 0; i < this.meshes.length; i++) bones[this.bones[i]].add(this.meshes[i]);
  }

  setEntityId(entityId: number): void {
    for (const mesh of this.meshes) setHitMeta(mesh, { entityId });
  }

  register(physics: IPhysics | null): void {
    if (!physics || this.registered) return;
    this.registered = true;
    for (const mesh of this.meshes) physics.addDynamic(mesh);
  }

  unregister(physics: IPhysics | null): void {
    if (!physics || !this.registered) return;
    this.registered = false;
    for (const mesh of this.meshes) physics.removeDynamic(mesh);
  }

  get active(): boolean {
    return this.registered;
  }

  /**
   * Which bone a shot most likely struck.
   *
   * `IAI.damage` is handed an amount and a headshot flag but not a collider, so
   * the limb is recovered by finding the box whose centre is nearest the line
   * the round travelled. It only drives the flinch and the ragdoll impulse, so
   * being occasionally one box out costs nothing, and it means the shared
   * damage contract does not have to grow a field for it.
   */
  nearestTo(from: THREE.Vector3, toward: THREE.Vector3, headshot: boolean): number {
    if (headshot) return B.head;
    _v.copy(toward).sub(from);
    const len = _v.length();
    if (len < 1e-4) return B.chest;
    _v.multiplyScalar(1 / len);

    let bestBone = B.chest;
    let best = Infinity;
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const c = _center.setFromMatrixPosition(mesh.matrixWorld);
      const dx = c.x - from.x;
      const dy = c.y - from.y;
      const dz = c.z - from.z;
      const along = dx * _v.x + dy * _v.y + dz * _v.z;
      if (along < 0) continue;
      const ox = dx - _v.x * along;
      const oy = dy - _v.y * along;
      const oz = dz - _v.z * along;
      const d2 = ox * ox + oy * oy + oz * oz;
      if (d2 < best) {
        best = d2;
        bestBone = this.bones[i];
      }
    }
    return bestBone;
  }

  dispose(physics: IPhysics | null): void {
    this.unregister(physics);
    for (const mesh of this.meshes) mesh.removeFromParent();
    this.meshes.length = 0;
  }
}

const _center = new THREE.Vector3();
