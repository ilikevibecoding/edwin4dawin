import * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';
import { RapierWorld, IG_DEBRIS } from './RapierWorld';

export type BoneName =
  | 'pelvis'
  | 'torso'
  | 'head'
  | 'upperArmL'
  | 'lowerArmL'
  | 'upperArmR'
  | 'lowerArmR'
  | 'upperLegL'
  | 'lowerLegL'
  | 'upperLegR'
  | 'lowerLegR';

interface BoneDef {
  name: BoneName;
  /** Local offset from the pelvis (metres, actor-local frame, y up). */
  pos: [number, number, number];
  shape: 'capsule' | 'box' | 'ball';
  /** capsule: [halfHeight, radius]; box: [hx,hy,hz]; ball: [radius]. */
  size: number[];
  mass: number;
  ccd?: boolean;
}

interface JointDef {
  a: BoneName;
  b: BoneName;
  /** Anchor in bone A's local frame. */
  anchorA: [number, number, number];
  /** Anchor in bone B's local frame. */
  anchorB: [number, number, number];
}

// A compact humanoid rig. Positions are relative to the pelvis.
const BONES: BoneDef[] = [
  { name: 'pelvis', pos: [0, 0, 0], shape: 'box', size: [0.16, 0.11, 0.11], mass: 11, ccd: true },
  { name: 'torso', pos: [0, 0.3, 0], shape: 'box', size: [0.17, 0.17, 0.11], mass: 17 },
  { name: 'head', pos: [0, 0.64, 0], shape: 'ball', size: [0.12], mass: 4.5, ccd: true },
  { name: 'upperArmL', pos: [-0.23, 0.42, 0], shape: 'capsule', size: [0.1, 0.05], mass: 2.2 },
  { name: 'lowerArmL', pos: [-0.23, 0.18, 0], shape: 'capsule', size: [0.1, 0.045], mass: 1.6 },
  { name: 'upperArmR', pos: [0.23, 0.42, 0], shape: 'capsule', size: [0.1, 0.05], mass: 2.2 },
  { name: 'lowerArmR', pos: [0.23, 0.18, 0], shape: 'capsule', size: [0.1, 0.045], mass: 1.6 },
  { name: 'upperLegL', pos: [-0.1, -0.34, 0], shape: 'capsule', size: [0.16, 0.085], mass: 7 },
  { name: 'lowerLegL', pos: [-0.1, -0.72, 0], shape: 'capsule', size: [0.18, 0.065], mass: 4.5 },
  { name: 'upperLegR', pos: [0.1, -0.34, 0], shape: 'capsule', size: [0.16, 0.085], mass: 7 },
  { name: 'lowerLegR', pos: [0.1, -0.72, 0], shape: 'capsule', size: [0.18, 0.065], mass: 4.5 },
];

const JOINTS: JointDef[] = [
  { a: 'pelvis', b: 'torso', anchorA: [0, 0.13, 0], anchorB: [0, -0.17, 0] },
  { a: 'torso', b: 'head', anchorA: [0, 0.2, 0], anchorB: [0, -0.14, 0] },
  { a: 'torso', b: 'upperArmL', anchorA: [-0.19, 0.14, 0], anchorB: [0, 0.13, 0] },
  { a: 'upperArmL', b: 'lowerArmL', anchorA: [0, -0.14, 0], anchorB: [0, 0.13, 0] },
  { a: 'torso', b: 'upperArmR', anchorA: [0.19, 0.14, 0], anchorB: [0, 0.13, 0] },
  { a: 'upperArmR', b: 'lowerArmR', anchorA: [0, -0.14, 0], anchorB: [0, 0.13, 0] },
  { a: 'pelvis', b: 'upperLegL', anchorA: [-0.1, -0.11, 0], anchorB: [0, 0.22, 0] },
  { a: 'upperLegL', b: 'lowerLegL', anchorA: [0, -0.22, 0], anchorB: [0, 0.22, 0] },
  { a: 'pelvis', b: 'upperLegR', anchorA: [0.1, -0.11, 0], anchorB: [0, 0.22, 0] },
  { a: 'upperLegR', b: 'lowerLegR', anchorA: [0, -0.22, 0], anchorB: [0, 0.22, 0] },
];

export interface RagdollTransforms {
  /** World-space pelvis position. */
  position: THREE.Vector3;
  /** World-space orientation of the actor (facing). */
  quaternion?: THREE.Quaternion;
}

interface RagdollPart {
  name: BoneName;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  /** Proxy whose transform tracks the body — read by the renderer/AI. */
  object: THREE.Object3D;
}

interface RagdollInstance {
  id: number;
  parts: RagdollPart[];
  byName: Map<BoneName, RagdollPart>;
  age: number;
  ttl: number;
}

/**
 * Articulated ragdoll manager backed by Rapier joints.
 *
 * Each corpse is a chain of dynamic bodies (pelvis → torso → head, arms, legs)
 * connected by spherical joints, with mass concentrated in the torso/pelvis so
 * limbs drape naturally. An initial clamped impulse near the hit point makes
 * the body react to the killing shot. Cleanup is TTL-based and honours
 * `quality.corpseLimit`.
 */
export class Ragdolls {
  private instances: RagdollInstance[] = [];
  private nextId = 1;
  private container = new THREE.Group();

  constructor(
    private rw: RapierWorld,
    scene: THREE.Scene,
    private limit: number
  ) {
    this.container.name = 'Ragdolls';
    scene.add(this.container);
  }

  setLimit(n: number) {
    this.limit = Math.max(0, n | 0);
    while (this.instances.length > this.limit) this.destroy(0);
  }

  get count() {
    return this.instances.length;
  }

  /**
   * Build a ragdoll. Returns an id handle (or -1 if physics is unavailable).
   * @param transforms World pelvis position + optional facing.
   * @param impulse    World-space impulse to inject (clamped internally).
   * @param hitPoint   Where the impulse is applied — nearest bone takes it.
   */
  create(transforms: RagdollTransforms, impulse: THREE.Vector3, hitPoint: THREE.Vector3): number {
    if (!this.rw.available || this.limit <= 0) return -1;
    const R = this.rw.R;
    const world = this.rw.world;
    const root = transforms.position;
    const q = transforms.quaternion ?? _identQ;

    const id = this.nextId++;
    const parts: RagdollPart[] = [];
    const byName = new Map<BoneName, RagdollPart>();

    for (const def of BONES) {
      // World position of this bone: root + rotated local offset.
      _off.set(def.pos[0], def.pos[1], def.pos[2]).applyQuaternion(q);
      _wp.copy(root).add(_off);

      const bodyDesc = R.RigidBodyDesc.dynamic()
        .setTranslation(_wp.x, _wp.y, _wp.z)
        .setRotation(q as unknown as RAPIER.Rotation)
        .setLinearDamping(0.25)
        .setAngularDamping(0.9)
        .setCanSleep(true)
        .setCcdEnabled(def.ccd ?? false)
        .setAdditionalSolverIterations(4);
      const body = world.createRigidBody(bodyDesc);

      let colDesc: RAPIER.ColliderDesc;
      if (def.shape === 'ball') colDesc = R.ColliderDesc.ball(def.size[0]);
      else if (def.shape === 'box')
        colDesc = R.ColliderDesc.cuboid(def.size[0], def.size[1], def.size[2]);
      else colDesc = R.ColliderDesc.capsule(def.size[0], def.size[1]);
      colDesc
        .setDensity(0)
        .setMass(def.mass)
        .setFriction(0.8)
        .setRestitution(0.02)
        .setCollisionGroups(IG_DEBRIS);
      const collider = world.createCollider(colDesc, body);

      const object = new THREE.Object3D();
      object.name = `ragdoll_${id}_${def.name}`;
      object.position.copy(_wp);
      object.quaternion.copy(q);
      this.container.add(object);

      const part: RagdollPart = { name: def.name, body, collider, object };
      parts.push(part);
      byName.set(def.name, part);
    }

    // Wire the joints.
    for (const j of JOINTS) {
      const a = byName.get(j.a);
      const b = byName.get(j.b);
      if (!a || !b) continue;
      _a1.set(j.anchorA[0], j.anchorA[1], j.anchorA[2]);
      _a2.set(j.anchorB[0], j.anchorB[1], j.anchorB[2]);
      const data = R.JointData.spherical(_a1, _a2);
      world.createImpulseJoint(data, a.body, b.body, true);
    }

    // Apply the impulse to whichever bone is nearest the hit point.
    let nearest: RagdollPart | null = null;
    let best = Infinity;
    for (const p of parts) {
      const t = p.body.translation();
      const d = (t.x - hitPoint.x) ** 2 + (t.y - hitPoint.y) ** 2 + (t.z - hitPoint.z) ** 2;
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    if (nearest) {
      const mag = Math.min(impulse.length(), RAGDOLL_MAX_IMPULSE);
      _imp.copy(impulse);
      if (_imp.lengthSq() > 1e-6) _imp.normalize().multiplyScalar(mag);
      // A gentle upward bias reads better than a flat shove.
      _imp.y += mag * 0.25;
      _hp.x = hitPoint.x;
      _hp.y = hitPoint.y;
      _hp.z = hitPoint.z;
      nearest.body.applyImpulseAtPoint(_imp, _hp, true);
    }

    const inst: RagdollInstance = { id, parts, byName, age: 0, ttl: RAGDOLL_TTL };
    this.instances.push(inst);
    if (this.instances.length > this.limit) this.destroy(0);
    return id;
  }

  /** Write body transforms back onto the proxy objects; age out corpses. */
  sync(dt: number) {
    if (!this.rw.available) return;
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const inst = this.instances[i];
      inst.age += dt;
      if (inst.age >= inst.ttl) {
        this.destroy(i);
        continue;
      }
      for (const p of inst.parts) {
        const t = p.body.translation();
        const r = p.body.rotation();
        p.object.position.set(t.x, t.y, t.z);
        p.object.quaternion.set(r.x, r.y, r.z, r.w);
      }
    }
  }

  /** Read a bone's current world transform (for driving a skinned mesh). */
  getBone(id: number, name: BoneName): THREE.Object3D | null {
    const inst = this.instances.find((x) => x.id === id);
    return inst?.byName.get(name)?.object ?? null;
  }

  private destroy(index: number) {
    const inst = this.instances[index];
    if (!inst) return;
    for (const p of inst.parts) {
      this.rw.world.removeRigidBody(p.body); // also drops attached joints
      this.container.remove(p.object);
    }
    this.instances.splice(index, 1);
  }

  clear() {
    for (let i = this.instances.length - 1; i >= 0; i--) this.destroy(i);
  }
}

const RAGDOLL_TTL = 14;
const RAGDOLL_MAX_IMPULSE = 42;

const _identQ = new THREE.Quaternion();
const _off = new THREE.Vector3();
const _wp = new THREE.Vector3();
const _a1 = new THREE.Vector3();
const _a2 = new THREE.Vector3();
const _imp = new THREE.Vector3();
const _hp = { x: 0, y: 0, z: 0 };
