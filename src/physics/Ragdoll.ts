/**
 * Humanoid ragdolls.
 *
 * Eleven capsules — pelvis, chest, head, upper/lower arms, upper/lower legs —
 * wired with spherical joints at the hips, shoulders and neck and hinges with
 * anatomical limits at the knees and elbows, so a corpse folds the way a body
 * does instead of bending its knees backwards.
 *
 * Sizing comes from the supplied `THREE.Skeleton` when there is one: each part
 * spans the segment between its bone and the bone below it, which makes the
 * capsules match whatever proportions the character mesh actually has. When
 * `skeleton` is null the same layout is synthesised from human proportions and
 * driven onto whatever the root hierarchy offers, falling back to the root
 * object itself.
 *
 * `sync()` converts each simulated body back into its bone's *local* space,
 * refreshing the untouched bones in between so intermediate spine and shoulder
 * joints keep their bind pose.
 */
import * as THREE from 'three';
import type {
  ImpulseJoint,
  RevoluteImpulseJoint,
  RigidBody,
  World,
} from '@dimforge/rapier3d-compat';
import { RAPIER } from './Rapier';
import type { PhysicsUserData, RagdollHandle } from '../core/Contracts';
import type { BodyPart } from '../core/GameTypes';
import type { ColliderRegistry } from './Registry';
import { RAGDOLL_GROUPS } from './Groups';
import { PHYS } from './Tuning';
import { rng } from '../core/MathUtils';

export type PartId =
  | 'pelvis'
  | 'chest'
  | 'head'
  | 'upperArmL'
  | 'lowerArmL'
  | 'upperArmR'
  | 'lowerArmR'
  | 'upperLegL'
  | 'lowerLegL'
  | 'upperLegR'
  | 'lowerLegR';

interface PartSpec {
  id: PartId;
  parent: PartId | null;
  /** Capsule radius for a 1.8 m figure, before the skeleton scale is applied. */
  radius: number;
  /** Share of total body mass. */
  massShare: number;
  bodyPart: BodyPart;
  joint: 'spherical' | 'hinge' | null;
  /** Hinge range in radians about the joint axis. Elbows and knees only. */
  hingeMin?: number;
  hingeMax?: number;
  hingeAxis?: readonly [number, number, number];
}

/** Anatomy table. Parents always precede their children. */
const PARTS: readonly PartSpec[] = [
  { id: 'pelvis', parent: null, radius: 0.125, massShare: 0.15, bodyPart: 'stomach', joint: null },
  { id: 'chest', parent: 'pelvis', radius: 0.145, massShare: 0.33, bodyPart: 'chest', joint: 'spherical' },
  { id: 'head', parent: 'chest', radius: 0.105, massShare: 0.08, bodyPart: 'head', joint: 'spherical' },
  { id: 'upperArmL', parent: 'chest', radius: 0.052, massShare: 0.027, bodyPart: 'arm', joint: 'spherical' },
  {
    id: 'lowerArmL',
    parent: 'upperArmL',
    radius: 0.044,
    massShare: 0.022,
    bodyPart: 'arm',
    joint: 'hinge',
    hingeMin: 0,
    hingeMax: 2.5,
    hingeAxis: [1, 0, 0],
  },
  { id: 'upperArmR', parent: 'chest', radius: 0.052, massShare: 0.027, bodyPart: 'arm', joint: 'spherical' },
  {
    id: 'lowerArmR',
    parent: 'upperArmR',
    radius: 0.044,
    massShare: 0.022,
    bodyPart: 'arm',
    joint: 'hinge',
    hingeMin: 0,
    hingeMax: 2.5,
    hingeAxis: [1, 0, 0],
  },
  { id: 'upperLegL', parent: 'pelvis', radius: 0.082, massShare: 0.1, bodyPart: 'leg', joint: 'spherical' },
  {
    id: 'lowerLegL',
    parent: 'upperLegL',
    radius: 0.062,
    massShare: 0.045,
    bodyPart: 'leg',
    joint: 'hinge',
    hingeMin: -2.4,
    hingeMax: 0,
    hingeAxis: [1, 0, 0],
  },
  { id: 'upperLegR', parent: 'pelvis', radius: 0.082, massShare: 0.1, bodyPart: 'leg', joint: 'spherical' },
  {
    id: 'lowerLegR',
    parent: 'upperLegR',
    radius: 0.062,
    massShare: 0.045,
    bodyPart: 'leg',
    joint: 'hinge',
    hingeMin: -2.4,
    hingeMax: 0,
    hingeAxis: [1, 0, 0],
  },
];

/**
 * Segment endpoints for a 1.8 m figure standing at the origin with feet at
 * y = 0. Consecutive parts share an endpoint so the joints start unstressed.
 */
const DEFAULT_SEGMENTS: Record<
  PartId,
  { from: readonly [number, number, number]; to: readonly [number, number, number] }
> = {
  pelvis: { from: [0, 0.94, 0], to: [0, 1.13, 0] },
  chest: { from: [0, 1.13, 0], to: [0, 1.5, 0] },
  head: { from: [0, 1.5, 0], to: [0, 1.73, 0] },
  upperArmL: { from: [0.19, 1.45, 0], to: [0.19, 1.18, 0] },
  lowerArmL: { from: [0.19, 1.18, 0], to: [0.19, 0.92, 0] },
  upperArmR: { from: [-0.19, 1.45, 0], to: [-0.19, 1.18, 0] },
  lowerArmR: { from: [-0.19, 1.18, 0], to: [-0.19, 0.92, 0] },
  upperLegL: { from: [0.1, 0.92, 0], to: [0.1, 0.5, 0] },
  lowerLegL: { from: [0.1, 0.5, 0], to: [0.1, 0.09, 0] },
  upperLegR: { from: [-0.1, 0.92, 0], to: [-0.1, 0.5, 0] },
  lowerLegR: { from: [-0.1, 0.5, 0], to: [-0.1, 0.09, 0] },
};

/** Bone names callers may pass to `applyImpulse`, matched longest-first. */
const BONE_ALIASES: ReadonlyArray<readonly [string, PartId]> = [
  ['upperchest', 'chest'],
  ['leftforearm', 'lowerArmL'],
  ['rightforearm', 'lowerArmR'],
  ['leftupleg', 'upperLegL'],
  ['rightupleg', 'upperLegR'],
  ['lefthand', 'lowerArmL'],
  ['righthand', 'lowerArmR'],
  ['leftfoot', 'lowerLegL'],
  ['rightfoot', 'lowerLegR'],
  ['leftarm', 'upperArmL'],
  ['rightarm', 'upperArmR'],
  ['leftleg', 'lowerLegL'],
  ['rightleg', 'lowerLegR'],
  ['forearm', 'lowerArmR'],
  ['pelvis', 'pelvis'],
  ['stomach', 'pelvis'],
  ['spine', 'chest'],
  ['chest', 'chest'],
  ['torso', 'chest'],
  ['skull', 'head'],
  ['neck', 'head'],
  ['head', 'head'],
  ['hips', 'pelvis'],
  ['hand', 'lowerArmR'],
  ['foot', 'lowerLegR'],
  ['calf', 'lowerLegR'],
  ['shin', 'lowerLegR'],
  ['thigh', 'upperLegR'],
  ['arm', 'upperArmR'],
  ['leg', 'upperLegR'],
  ['root', 'pelvis'],
];

interface Part {
  spec: PartSpec;
  body: RigidBody;
  /** Bone (or proxy object) this body drives; null when nothing matched. */
  target: THREE.Object3D | null;
  /** bodyWorld⁻¹ · targetWorld, captured at bind time. */
  offset: THREE.Matrix4;
  /** Untouched objects between the parent's target and this one, top-down. */
  chain: THREE.Object3D[];
  /** World-space joint anchor shared with the parent part. */
  anchor: THREE.Vector3;
}

const UNIT = /* @__PURE__ */ new THREE.Vector3(1, 1, 1);
const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

const scratch = {
  v0: /* @__PURE__ */ new THREE.Vector3(),
  v1: /* @__PURE__ */ new THREE.Vector3(),
  v2: /* @__PURE__ */ new THREE.Vector3(),
  v3: /* @__PURE__ */ new THREE.Vector3(),
  q0: /* @__PURE__ */ new THREE.Quaternion(),
  q1: /* @__PURE__ */ new THREE.Quaternion(),
  m0: /* @__PURE__ */ new THREE.Matrix4(),
  m1: /* @__PURE__ */ new THREE.Matrix4(),
  m2: /* @__PURE__ */ new THREE.Matrix4(),
  scale: /* @__PURE__ */ new THREE.Vector3(1, 1, 1),
};

export interface RagdollOptions {
  impulse?: THREE.Vector3;
  impulsePoint?: THREE.Vector3;
}

export class Ragdoll implements RagdollHandle {
  readonly root: THREE.Object3D;
  settled = false;

  private readonly world: World;
  private readonly registry: ColliderRegistry;
  private readonly onDestroy: (r: Ragdoll) => void;
  private readonly parts = new Map<PartId, Part>();
  private readonly ordered: Part[] = [];
  private readonly joints: ImpulseJoint[] = [];
  private readonly vec = { x: 0, y: 0, z: 0 };
  private readonly point = { x: 0, y: 0, z: 0 };
  private age = 0;
  private settleTimer = 0;
  private destroyed = false;

  constructor(
    world: World,
    registry: ColliderRegistry,
    skeleton: THREE.Skeleton | null,
    root: THREE.Object3D,
    opts: RagdollOptions | undefined,
    onDestroy: (r: Ragdoll) => void,
  ) {
    this.world = world;
    this.registry = registry;
    this.root = root;
    this.onDestroy = onDestroy;

    root.updateWorldMatrix(true, true);
    this.build(buildLayout(skeleton, root));
    this.applyDeathImpulse(opts);
    disableCullingUnder(root);
  }

  get partCount(): number {
    return this.ordered.length;
  }

  applyImpulse(bone: string, impulse: THREE.Vector3, at?: THREE.Vector3): void {
    if (this.destroyed) return;
    const part = this.parts.get(resolvePart(bone)) ?? this.parts.get('chest') ?? this.ordered[0];
    if (!part) return;
    // A force-slept corpse has every part asleep; the hit limb alone waking up
    // would drag against ten sleeping neighbours.
    for (let i = 0; i < this.ordered.length; i++) this.ordered[i].body.wakeUp();
    this.vec.x = impulse.x;
    this.vec.y = impulse.y;
    this.vec.z = impulse.z;
    if (at) {
      this.point.x = at.x;
      this.point.y = at.y;
      this.point.z = at.z;
      part.body.applyImpulseAtPoint(this.vec, this.point, true);
    } else {
      part.body.applyImpulse(this.vec, true);
    }
    // The active-time budget is measured from the last disturbance, not from
    // death: shooting a corpse that has already been force-slept has to move it.
    this.settled = false;
    this.settleTimer = 0;
    this.age = 0;
  }

  /**
   * Copy simulated transforms back onto the bones.
   *
   * Bodies are world-space and centred on the capsule; bones are parent-space
   * and anchored at the joint. Every part therefore goes through
   * `world = body · bindOffset` then `local = parentWorld⁻¹ · world`.
   */
  sync(): void {
    if (this.destroyed) return;
    if (this.root.parent) this.root.updateWorldMatrix(true, false);

    for (let i = 0; i < this.ordered.length; i++) {
      const part = this.ordered[i];
      const target = part.target;
      if (!target) continue;

      // Refresh the bones between this one and its simulated parent so their
      // world matrices reflect the parent's new pose before we read it.
      const chain = part.chain;
      for (let c = 0; c < chain.length; c++) {
        const node = chain[c];
        if (node.matrixAutoUpdate) node.updateMatrix();
        if (node.parent) node.matrixWorld.multiplyMatrices(node.parent.matrixWorld, node.matrix);
        else node.matrixWorld.copy(node.matrix);
      }

      const t = part.body.translation();
      const r = part.body.rotation();
      scratch.q0.set(r.x, r.y, r.z, r.w);
      scratch.m0.compose(scratch.v0.set(t.x, t.y, t.z), scratch.q0, UNIT);
      scratch.m1.multiplyMatrices(scratch.m0, part.offset);

      const parent = target.parent;
      if (parent) {
        scratch.m2.copy(parent.matrixWorld).invert();
        scratch.m0.multiplyMatrices(scratch.m2, scratch.m1);
      } else {
        scratch.m0.copy(scratch.m1);
      }
      scratch.m0.decompose(target.position, target.quaternion, scratch.scale);
      target.scale.copy(scratch.scale);
      target.matrix.copy(scratch.m0);
      target.matrixWorld.copy(scratch.m1);
    }
  }

  /** Driven from the fixed step. `checkSleep` throttles the polling. */
  update(dt: number, checkSleep: boolean): void {
    if (this.destroyed) return;
    this.age += dt;
    if (this.settled) return;

    if (this.age > PHYS.ragdollMaxActiveTime) {
      for (const part of this.ordered) part.body.sleep();
      this.settled = true;
      return;
    }
    if (!checkSleep) return;

    for (let i = 0; i < this.ordered.length; i++) {
      if (!this.ordered[i].body.isSleeping()) {
        this.settleTimer = 0;
        return;
      }
    }
    this.settleTimer += dt;
    if (this.settleTimer > 0.2) this.settled = true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const joint of this.joints) this.world.removeImpulseJoint(joint, false);
    this.joints.length = 0;
    for (const part of this.ordered) {
      if (part.body.numColliders() > 0) this.registry.unregister(part.body.collider(0));
      this.registry.unregisterBody(part.body);
      this.world.removeRigidBody(part.body);
    }
    this.ordered.length = 0;
    this.parts.clear();
    this.onDestroy(this);
  }

  private build(layout: Layout): void {
    const s = layout.scale;
    const totalMass = 78 * s * s * s;

    for (const spec of PARTS) {
      const segment = layout.segments[spec.id];
      if (!segment) continue;

      scratch.v0.subVectors(segment.to, segment.from);
      let length = scratch.v0.length();
      if (length < 1e-4) {
        scratch.v0.set(0, -1, 0);
        length = 0.1;
      } else {
        scratch.v0.divideScalar(length);
      }

      const radius = Math.max(0.03, Math.min(spec.radius * s, length * 0.48));
      const halfHeight = Math.max(0.01, length * 0.5 - radius);
      scratch.v1.copy(segment.from).addScaledVector(scratch.v0, length * 0.5);
      // Rapier capsules run along local Y, so rotate Y onto the bone direction.
      scratch.q0.setFromUnitVectors(UP, scratch.v0);

      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(scratch.v1.x, scratch.v1.y, scratch.v1.z)
          .setRotation(scratch.q0)
          .setLinearDamping(PHYS.ragdollLinearDamping)
          .setAngularDamping(PHYS.ragdollAngularDamping)
          .setCcdEnabled(false)
          .setSoftCcdPrediction(PHYS.softCcdPrediction)
          .setCanSleep(true),
      );

      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.capsule(halfHeight, radius)
          .setMass(Math.max(0.5, totalMass * spec.massShare))
          .setFriction(0.85)
          .setRestitution(0.02)
          .setCollisionGroups(RAGDOLL_GROUPS),
        body,
      );

      const target = layout.targets[spec.id] ?? null;
      const offset = new THREE.Matrix4();
      if (target) {
        scratch.m0.compose(scratch.v1, scratch.q0, UNIT).invert();
        offset.multiplyMatrices(scratch.m0, target.matrixWorld);
      }

      const part: Part = {
        spec,
        body,
        target,
        offset,
        chain: layout.chains[spec.id] ?? [],
        anchor: segment.from.clone(),
      };
      this.parts.set(spec.id, part);
      this.ordered.push(part);

      const userData: PhysicsUserData = {
        kind: 'ragdoll',
        surface: 'flesh',
        bodyPart: spec.bodyPart,
        object3D: this.root,
        ragdoll: this,
      };
      this.registry.register(collider, userData, this, 'flesh');
    }

    for (const part of this.ordered) {
      if (!part.spec.parent || !part.spec.joint) continue;
      const parent = this.parts.get(part.spec.parent);
      if (parent) this.link(parent, part);
    }
  }

  private link(parent: Part, child: Part): void {
    const anchor = child.anchor;
    const a1 = localAnchor(parent.body, anchor, scratch.v2);
    const a2 = localAnchor(child.body, anchor, scratch.v3);
    const spec = child.spec;

    if (spec.joint === 'hinge') {
      const axis = spec.hingeAxis ?? [1, 0, 0];
      const min = spec.hingeMin ?? -2;
      const max = spec.hingeMax ?? 2;
      const data = RAPIER.JointData.revolute(
        { x: a1.x, y: a1.y, z: a1.z },
        { x: a2.x, y: a2.y, z: a2.z },
        { x: axis[0], y: axis[1], z: axis[2] },
      );
      data.limitsEnabled = true;
      data.limits = [min, max];
      const joint = this.world.createImpulseJoint(
        data,
        parent.body,
        child.body,
        true,
      ) as RevoluteImpulseJoint;
      joint.setContactsEnabled(false);
      joint.setLimits(min, max);
      // A zero-velocity motor is joint friction: the limb resists free swing so
      // the corpse settles rather than pendulum-ing forever.
      joint.configureMotorModel(RAPIER.MotorModel.AccelerationBased);
      joint.configureMotorVelocity(0, PHYS.ragdollJointFriction);
      this.joints.push(joint);
      return;
    }

    const joint = this.world.createImpulseJoint(
      RAPIER.JointData.spherical({ x: a1.x, y: a1.y, z: a1.z }, { x: a2.x, y: a2.y, z: a2.z }),
      parent.body,
      child.body,
      true,
    );
    // Neighbouring capsules overlap at the joint by construction; contacts
    // between them would fight the constraint and jitter.
    joint.setContactsEnabled(false);
    this.joints.push(joint);
  }

  private applyDeathImpulse(opts: RagdollOptions | undefined): void {
    const impulse = opts?.impulse;
    if (!impulse) return;
    const magnitude = Math.hypot(impulse.x, impulse.y, impulse.z);
    if (magnitude < 1e-4) return;

    let target = this.parts.get('chest') ?? this.ordered[0];
    const at = opts?.impulsePoint;
    if (at) {
      // Land the hit on the limb that was actually struck, so a headshot snaps
      // the head back and a body shot rotates the torso.
      let best = Infinity;
      for (const part of this.ordered) {
        const t = part.body.translation();
        const dx = t.x - at.x;
        const dy = t.y - at.y;
        const dz = t.z - at.z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) {
          best = d;
          target = part;
        }
      }
    }
    if (!target) return;

    const mass = Math.max(0.5, target.body.mass());
    const scale = Math.min(1, (PHYS.explosionMaxDeltaV * mass) / magnitude);
    this.vec.x = impulse.x * scale;
    this.vec.y = impulse.y * scale;
    this.vec.z = impulse.z * scale;
    if (at) {
      this.point.x = at.x;
      this.point.y = at.y;
      this.point.z = at.z;
      target.body.applyImpulseAtPoint(this.vec, this.point, true);
    } else {
      target.body.applyImpulse(this.vec, true);
    }

    // A little spin so two identical deaths never read as identical.
    const spin = magnitude * scale * 0.02;
    this.vec.x = rng.range(-spin, spin);
    this.vec.y = rng.range(-spin, spin);
    this.vec.z = rng.range(-spin, spin);
    target.body.applyTorqueImpulse(this.vec, true);
  }
}

function localAnchor(body: RigidBody, world: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const t = body.translation();
  const r = body.rotation();
  scratch.q1.set(r.x, r.y, r.z, r.w).invert();
  return out.set(world.x - t.x, world.y - t.y, world.z - t.z).applyQuaternion(scratch.q1);
}

function resolvePart(bone: string): PartId {
  const key = normaliseBone(bone);
  for (const [alias, part] of BONE_ALIASES) {
    if (key.includes(alias)) return part;
  }
  return 'chest';
}

function normaliseBone(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^mixamorig/, '');
}

function disableCullingUnder(root: THREE.Object3D): void {
  // A corpse that slides away from its bind pose pops out of view if the skinned
  // mesh keeps its authored bounding sphere.
  root.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) node.frustumCulled = false;
  });
}

// ---------------------------------------------------------------------------
// Layout: turn a skeleton — or nothing at all — into world-space bone segments.
// ---------------------------------------------------------------------------

interface Segment {
  from: THREE.Vector3;
  to: THREE.Vector3;
}

type SlotId = PartId | 'neck' | 'handL' | 'handR' | 'footL' | 'footR';

interface Layout {
  segments: Partial<Record<PartId, Segment>>;
  targets: Partial<Record<PartId, THREE.Object3D>>;
  chains: Partial<Record<PartId, THREE.Object3D[]>>;
  scale: number;
}

/** Bone matchers, ordered so `LeftForeArm` is consumed before `LeftArm`. */
const MATCHERS: ReadonlyArray<{ id: SlotId; side: 'l' | 'r' | null; patterns: RegExp[] }> = [
  { id: 'pelvis', side: null, patterns: [/^hips?$/, /pelvis$/, /pelvis/, /^hips/, /^root$/] },
  {
    id: 'chest',
    side: null,
    patterns: [/upperchest$/, /^chest$/, /chest$/, /spine[23]$/, /spine1$/, /spine$/],
  },
  { id: 'neck', side: null, patterns: [/^neck$/, /neck$/] },
  { id: 'head', side: null, patterns: [/^head$/, /head$/] },
  { id: 'lowerArmL', side: 'l', patterns: [/forearm$/, /lowerarm$/, /forearm/, /elbow/] },
  { id: 'lowerArmR', side: 'r', patterns: [/forearm$/, /lowerarm$/, /forearm/, /elbow/] },
  { id: 'upperArmL', side: 'l', patterns: [/upperarm$/, /upperarm/, /arm$/] },
  { id: 'upperArmR', side: 'r', patterns: [/upperarm$/, /upperarm/, /arm$/] },
  { id: 'handL', side: 'l', patterns: [/hand$/, /wrist$/] },
  { id: 'handR', side: 'r', patterns: [/hand$/, /wrist$/] },
  { id: 'upperLegL', side: 'l', patterns: [/upleg$/, /upperleg$/, /thigh$/, /thigh/] },
  { id: 'upperLegR', side: 'r', patterns: [/upleg$/, /upperleg$/, /thigh$/, /thigh/] },
  { id: 'lowerLegL', side: 'l', patterns: [/lowerleg$/, /calf$/, /shin$/, /knee/, /leg$/] },
  { id: 'lowerLegR', side: 'r', patterns: [/lowerleg$/, /calf$/, /shin$/, /knee/, /leg$/] },
  { id: 'footL', side: 'l', patterns: [/foot$/, /ankle$/] },
  { id: 'footR', side: 'r', patterns: [/foot$/, /ankle$/] },
];

/**
 * Side detection runs on the raw name: the separators that carry the meaning in
 * `thigh.L`, `Bip01 R Thigh` and `thighL` are all stripped by normalisation.
 */
function sideOf(raw: string): 'l' | 'r' | null {
  if (/[a-z]L$/.test(raw)) return 'l';
  if (/[a-z]R$/.test(raw)) return 'r';
  const n = raw.toLowerCase();
  if (/left/.test(n) || /(^|[^a-z])l($|[^a-z])/.test(n) || /lft/.test(n)) return 'l';
  if (/right/.test(n) || /(^|[^a-z])r($|[^a-z])/.test(n) || /rgt/.test(n)) return 'r';
  return null;
}

function buildLayout(skeleton: THREE.Skeleton | null, root: THREE.Object3D): Layout {
  const found = matchBones(skeleton, root);
  const worldOf = (o: THREE.Object3D | undefined): THREE.Vector3 | null =>
    o ? new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) : null;

  const pelvisBone = found.get('pelvis');
  const chestBone = found.get('chest');
  const headBone = found.get('head');
  const scale = estimateScale(worldOf(pelvisBone), worldOf(headBone), root);

  const segments: Partial<Record<PartId, Segment>> = {};
  const targets: Partial<Record<PartId, THREE.Object3D>> = {};
  const chains: Partial<Record<PartId, THREE.Object3D[]>> = {};

  const fallback = (id: PartId): Segment => {
    const d = DEFAULT_SEGMENTS[id];
    return {
      from: new THREE.Vector3(d.from[0], d.from[1], d.from[2]).applyMatrix4(root.matrixWorld),
      to: new THREE.Vector3(d.to[0], d.to[1], d.to[2]).applyMatrix4(root.matrixWorld),
    };
  };

  const build = (
    id: PartId,
    start: THREE.Object3D | undefined,
    end: THREE.Object3D | undefined,
  ): void => {
    const a = worldOf(start);
    if (!a || !start) {
      segments[id] = fallback(id);
      return;
    }
    let b = worldOf(end);
    if (!b || a.distanceToSquared(b) < 1e-6) {
      // Terminal bone (head, hand, foot): extend along the default direction so
      // the capsule still has a length to work with.
      const d = DEFAULT_SEGMENTS[id];
      const dir = new THREE.Vector3(
        d.to[0] - d.from[0],
        d.to[1] - d.from[1],
        d.to[2] - d.from[2],
      );
      const len = Math.max(0.08, dir.length() * scale);
      dir.normalize().transformDirection(root.matrixWorld);
      b = a.clone().addScaledVector(dir, len);
    }
    segments[id] = { from: a, to: b };
    targets[id] = start;
  };

  build('pelvis', pelvisBone, chestBone ?? found.get('neck'));
  build('chest', chestBone, found.get('neck') ?? headBone);
  build('head', headBone, undefined);
  build('upperArmL', found.get('upperArmL'), found.get('lowerArmL'));
  build('lowerArmL', found.get('lowerArmL'), found.get('handL'));
  build('upperArmR', found.get('upperArmR'), found.get('lowerArmR'));
  build('lowerArmR', found.get('lowerArmR'), found.get('handR'));
  build('upperLegL', found.get('upperLegL'), found.get('lowerLegL'));
  build('lowerLegL', found.get('lowerLegL'), found.get('footL'));
  build('upperLegR', found.get('upperLegR'), found.get('lowerLegR'));
  build('lowerLegR', found.get('lowerLegR'), found.get('footR'));

  // Nothing recognisable in the hierarchy: drive the root object from the pelvis
  // so an unrigged corpse mesh still topples convincingly.
  if (!targets.pelvis && !targets.chest) targets.pelvis = root;

  for (const spec of PARTS) {
    const target = targets[spec.id];
    if (!target) continue;
    const parentTarget = spec.parent ? targets[spec.parent] : undefined;
    chains[spec.id] = parentTarget ? ancestorChain(target, parentTarget) : [];
  }

  return { segments, targets, chains, scale };
}

function matchBones(skeleton: THREE.Skeleton | null, root: THREE.Object3D): Map<SlotId, THREE.Object3D> {
  const candidates: THREE.Object3D[] = [];
  if (skeleton && skeleton.bones.length > 0) candidates.push(...skeleton.bones);
  else root.traverse((o) => candidates.push(o));

  const names = candidates.map((o) => normaliseBone(o.name));
  const sides = candidates.map((o) => sideOf(o.name));
  const found = new Map<SlotId, THREE.Object3D>();
  const used = new Set<THREE.Object3D>();

  for (const matcher of MATCHERS) {
    let best: THREE.Object3D | null = null;
    let bestRank = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const bone = candidates[i];
      if (used.has(bone)) continue;
      const name = names[i];
      if (!name) continue;
      if (sides[i] !== matcher.side) continue;
      for (let r = 0; r < matcher.patterns.length && r < bestRank; r++) {
        if (matcher.patterns[r].test(name)) {
          bestRank = r;
          best = bone;
          break;
        }
      }
    }
    if (best) {
      found.set(matcher.id, best);
      used.add(best);
    }
  }
  return found;
}

function estimateScale(
  pelvis: THREE.Vector3 | null,
  head: THREE.Vector3 | null,
  root: THREE.Object3D,
): number {
  if (pelvis && head) {
    const span = Math.abs(head.y - pelvis.y);
    // Default figure: pelvis at 0.94, head at 1.50 — a 0.56 m span.
    if (span > 0.05) return Math.min(3, Math.max(0.3, span / 0.56));
  }
  const s = new THREE.Vector3().setFromMatrixScale(root.matrixWorld);
  const uniform = (s.x + s.y + s.z) / 3;
  return Number.isFinite(uniform) && uniform > 1e-3 ? Math.min(3, uniform) : 1;
}

/** Objects strictly between `stop` (exclusive) and `node` (exclusive), top-down. */
function ancestorChain(node: THREE.Object3D, stop: THREE.Object3D): THREE.Object3D[] {
  const chain: THREE.Object3D[] = [];
  let current = node.parent;
  let guard = 0;
  while (current && current !== stop && guard++ < 64) {
    chain.push(current);
    current = current.parent;
  }
  // Ran off the top without meeting the simulated parent: nothing safe to walk.
  if (current !== stop) return [];
  chain.reverse();
  return chain;
}
