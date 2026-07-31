/**
 * Dynamic rigid bodies.
 *
 * Simulation runs at a fixed 120 Hz but the game renders at whatever the
 * display does, so every body keeps the transform from the previous step
 * alongside the current one and `interpolate()` blends between them with the
 * engine's `time.alpha`. Without that, a barrel simulated at 120 Hz and drawn
 * at 144 Hz shows a subtle, permanent stutter.
 *
 * Total body count is capped; when the cap is reached the oldest recyclable
 * body is destroyed to make room, so a long firefight cannot grow the island
 * count without bound.
 */
import * as THREE from 'three';
import type { Collider, ColliderDesc, RigidBody, World } from '@dimforge/rapier3d-compat';
import { RAPIER } from './Rapier';
import type { PhysicsUserData, RigidBodyHandle } from '../core/Contracts';
import type { ColliderRegistry } from './Registry';
import { groupsForBody } from './Groups';
import { gate } from './Reentrancy';
import { PHYS } from './Tuning';

export type BodyShape =
  | { kind: 'box'; halfExtents: THREE.Vector3 }
  | { kind: 'sphere'; radius: number }
  | { kind: 'capsule'; halfHeight: number; radius: number }
  | { kind: 'convex'; points: Float32Array };

export interface BodyOptions {
  mass?: number;
  restitution?: number;
  friction?: number;
  ccd?: boolean;
  group?: number;
  userData?: PhysicsUserData;
}

const IDENTITY_MATRIX = /* @__PURE__ */ new THREE.Matrix4();
const UNIT_SCALE = /* @__PURE__ */ new THREE.Vector3(1, 1, 1);

export class DynamicBody implements RigidBodyHandle {
  readonly object3D: THREE.Object3D;
  readonly body: RigidBody;
  readonly collider: Collider;
  readonly recyclable: boolean;
  /** True when the object3D hangs under a transformed parent and needs conversion. */
  readonly localSpace: boolean;

  /** Transform at the start of the last fixed step. */
  px = 0;
  py = 0;
  pz = 0;
  pqx = 0;
  pqy = 0;
  pqz = 0;
  pqw = 1;
  /** Transform after the last fixed step. */
  cx = 0;
  cy = 0;
  cz = 0;
  cqx = 0;
  cqy = 0;
  cqz = 0;
  cqw = 1;

  asleep = false;
  destroyed = false;

  private readonly manager: DynamicBodyManager;
  private readonly vecA = { x: 0, y: 0, z: 0 };
  private readonly vecB = { x: 0, y: 0, z: 0 };
  private readonly rot = { x: 0, y: 0, z: 0, w: 1 };

  constructor(
    manager: DynamicBodyManager,
    object3D: THREE.Object3D,
    body: RigidBody,
    collider: Collider,
    recyclable: boolean,
  ) {
    this.manager = manager;
    this.object3D = object3D;
    this.body = body;
    this.collider = collider;
    this.recyclable = recyclable;
    const parent = object3D.parent;
    this.localSpace = parent !== null && !parent.matrixWorld.equals(IDENTITY_MATRIX);
    this.readTransform();
    this.savePrevious();
  }

  readTransform(): void {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.cx = t.x;
    this.cy = t.y;
    this.cz = t.z;
    this.cqx = r.x;
    this.cqy = r.y;
    this.cqz = r.z;
    this.cqw = r.w;
  }

  savePrevious(): void {
    this.px = this.cx;
    this.py = this.cy;
    this.pz = this.cz;
    this.pqx = this.cqx;
    this.pqy = this.cqy;
    this.pqz = this.cqz;
    this.pqw = this.cqw;
  }

  /**
   * The mutators below are called from impact and explosion code, which is one
   * `raycast` away from being inside a Rapier callback, so each of them takes
   * the deferred path when the world is borrowed. The idle path is unchanged
   * and still allocates nothing; only the rare deferral costs a closure.
   */
  applyImpulse(impulse: THREE.Vector3, atPoint?: THREE.Vector3): void {
    if (this.destroyed) return;
    this.asleep = false;
    const x = impulse.x;
    const y = impulse.y;
    const z = impulse.z;
    if (!atPoint) {
      if (gate.busy) gate.defer(() => this.writeImpulse(x, y, z, false, 0, 0, 0));
      else this.writeImpulse(x, y, z, false, 0, 0, 0);
      return;
    }
    const px = atPoint.x;
    const py = atPoint.y;
    const pz = atPoint.z;
    if (gate.busy) gate.defer(() => this.writeImpulse(x, y, z, true, px, py, pz));
    else this.writeImpulse(x, y, z, true, px, py, pz);
  }

  applyTorqueImpulse(t: THREE.Vector3): void {
    if (this.destroyed) return;
    this.asleep = false;
    const x = t.x;
    const y = t.y;
    const z = t.z;
    if (gate.busy) gate.defer(() => this.writeTorque(x, y, z));
    else this.writeTorque(x, y, z);
  }

  setVelocity(v: THREE.Vector3): void {
    if (this.destroyed) return;
    this.asleep = false;
    const x = v.x;
    const y = v.y;
    const z = v.z;
    if (gate.busy) gate.defer(() => this.writeVelocity(x, y, z));
    else this.writeVelocity(x, y, z);
  }

  getVelocity(out: THREE.Vector3): THREE.Vector3 {
    if (this.destroyed) return out.set(0, 0, 0);
    const v = this.body.linvel();
    return out.set(v.x, v.y, v.z);
  }

  setPosition(p: THREE.Vector3, q?: THREE.Quaternion): void {
    if (this.destroyed) return;
    this.asleep = false;
    const x = p.x;
    const y = p.y;
    const z = p.z;
    const qx = q ? q.x : 0;
    const qy = q ? q.y : 0;
    const qz = q ? q.z : 0;
    const qw = q ? q.w : 1;
    const rotate = q !== undefined;
    if (gate.busy) gate.defer(() => this.writePosition(x, y, z, rotate, qx, qy, qz, qw));
    else this.writePosition(x, y, z, rotate, qx, qy, qz, qw);
  }

  sleep(): void {
    if (this.destroyed) return;
    this.asleep = true;
    gate.defer(this.writeSleep);
  }

  wake(): void {
    if (this.destroyed) return;
    this.asleep = false;
    gate.defer(this.writeWake);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.manager.remove(this);
  }

  private writeImpulse(
    x: number,
    y: number,
    z: number,
    atPoint: boolean,
    px: number,
    py: number,
    pz: number,
  ): void {
    if (this.destroyed) return;
    this.vecA.x = x;
    this.vecA.y = y;
    this.vecA.z = z;
    if (!atPoint) {
      this.body.applyImpulse(this.vecA, true);
      return;
    }
    this.vecB.x = px;
    this.vecB.y = py;
    this.vecB.z = pz;
    this.body.applyImpulseAtPoint(this.vecA, this.vecB, true);
  }

  private writeTorque(x: number, y: number, z: number): void {
    if (this.destroyed) return;
    this.vecA.x = x;
    this.vecA.y = y;
    this.vecA.z = z;
    this.body.applyTorqueImpulse(this.vecA, true);
  }

  private writeVelocity(x: number, y: number, z: number): void {
    if (this.destroyed) return;
    this.vecA.x = x;
    this.vecA.y = y;
    this.vecA.z = z;
    this.body.setLinvel(this.vecA, true);
  }

  private writePosition(
    x: number,
    y: number,
    z: number,
    rotate: boolean,
    qx: number,
    qy: number,
    qz: number,
    qw: number,
  ): void {
    if (this.destroyed) return;
    this.vecA.x = x;
    this.vecA.y = y;
    this.vecA.z = z;
    this.body.setTranslation(this.vecA, true);
    if (rotate) {
      this.rot.x = qx;
      this.rot.y = qy;
      this.rot.z = qz;
      this.rot.w = qw;
      this.body.setRotation(this.rot, true);
    }
    this.readTransform();
    this.savePrevious();
  }

  private readonly writeSleep = (): void => {
    if (!this.destroyed) this.body.sleep();
  };

  private readonly writeWake = (): void => {
    if (!this.destroyed) this.body.wakeUp();
  };
}

export class DynamicBodyManager {
  private readonly bodies = new Map<number, DynamicBody>();
  private readonly quatA = new THREE.Quaternion();
  private readonly quatB = new THREE.Quaternion();
  private readonly vec = new THREE.Vector3();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly mat = new THREE.Matrix4();
  private readonly parentInverse = new THREE.Matrix4();
  private readonly clampVec = { x: 0, y: 0, z: 0 };
  private readonly doomed: DynamicBody[] = [];
  private cap: number;

  constructor(
    private readonly world: World,
    private readonly registry: ColliderRegistry,
    cap: number,
  ) {
    this.cap = Math.max(16, cap);
  }

  get count(): number {
    return this.bodies.size;
  }

  setCap(cap: number): void {
    this.cap = Math.max(16, cap);
    this.enforceCap(0);
  }

  create(object3D: THREE.Object3D, shape: BodyShape, opts?: BodyOptions): RigidBodyHandle {
    this.enforceCap(1);

    object3D.updateWorldMatrix(true, false);
    object3D.matrixWorld.decompose(this.vec, this.quatA, this.scale);

    const ccd = opts?.ccd ?? false;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(this.vec.x, this.vec.y, this.vec.z)
        .setRotation(this.quatA)
        .setLinearDamping(PHYS.defaultLinearDamping)
        .setAngularDamping(PHYS.defaultAngularDamping)
        .setCcdEnabled(ccd)
        // Speculative contacts for everything that is not full CCD: stops small
        // debris dropping through thin floors without paying for substepping.
        .setSoftCcdPrediction(ccd ? 0 : PHYS.softCcdPrediction)
        .setCanSleep(true),
    );

    const colliderDesc = describeShape(shape);
    if (!colliderDesc) {
      this.world.removeRigidBody(body);
      throw new Error(`[physics] unsupported rigid body shape "${shape.kind}"`);
    }
    colliderDesc
      .setFriction(opts?.friction ?? 0.7)
      .setRestitution(opts?.restitution ?? 0.15)
      .setCollisionGroups(groupsForBody(opts?.group))
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Average);
    if (opts?.mass !== undefined && opts.mass > 0) colliderDesc.setMass(opts.mass);
    else colliderDesc.setDensity(650);

    const collider = this.world.createCollider(colliderDesc, body);

    const userData = opts?.userData;
    const kind = userData?.kind;
    const recyclable = kind !== 'destructible' && kind !== 'trigger';
    const handle = new DynamicBody(this, object3D, body, collider, recyclable);
    this.registry.register(collider, userData, handle);
    this.bodies.set(body.handle, handle);
    return handle;
  }

  remove(handle: DynamicBody): void {
    if (!this.bodies.delete(handle.body.handle)) return;
    this.registry.unregister(handle.collider);
    this.registry.unregisterBody(handle.body);
    gate.defer(() => this.world.removeRigidBody(handle.body));
  }

  /** Called immediately before `world.step()`. */
  savePrevious(): void {
    for (const entry of this.bodies.values()) {
      if (entry.asleep) continue;
      entry.savePrevious();
    }
  }

  /** Called immediately after `world.step()`. */
  readBack(): void {
    const doomed = this.doomed;
    for (const entry of this.bodies.values()) {
      const sleeping = entry.body.isSleeping();
      // A settled body is read one final time on the step it falls asleep, then
      // skipped entirely until something wakes it.
      if (sleeping && entry.asleep) continue;
      entry.asleep = sleeping;
      entry.readTransform();
      if (sleeping) continue;

      this.clampVelocity(entry.body);
      if (
        entry.cy < PHYS.killPlaneY ||
        Math.abs(entry.cx) > PHYS.killRadius ||
        Math.abs(entry.cz) > PHYS.killRadius ||
        !Number.isFinite(entry.cx + entry.cy + entry.cz)
      ) {
        doomed.push(entry);
      }
    }
    if (doomed.length > 0) {
      for (const entry of doomed) entry.destroy();
      doomed.length = 0;
    }
  }

  /** Blend the last two simulated transforms onto the Three.js objects. */
  interpolate(alpha: number): void {
    const a = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    const inv = 1 - a;
    for (const entry of this.bodies.values()) {
      const object = entry.object3D;
      const x = entry.px * inv + entry.cx * a;
      const y = entry.py * inv + entry.cy * a;
      const z = entry.pz * inv + entry.cz * a;
      this.quatA.set(entry.pqx, entry.pqy, entry.pqz, entry.pqw);
      this.quatB.set(entry.cqx, entry.cqy, entry.cqz, entry.cqw);
      this.quatA.slerp(this.quatB, a);

      const parent = object.parent;
      if (entry.localSpace && parent) {
        this.parentInverse.copy(parent.matrixWorld).invert();
        this.mat.compose(this.vec.set(x, y, z), this.quatA, UNIT_SCALE);
        this.mat.premultiply(this.parentInverse);
        this.mat.decompose(object.position, object.quaternion, this.scale);
      } else {
        object.position.set(x, y, z);
        object.quaternion.copy(this.quatA);
      }
    }
  }

  get(bodyHandle: number): DynamicBody | undefined {
    return this.bodies.get(bodyHandle);
  }

  dispose(): void {
    for (const entry of [...this.bodies.values()]) entry.destroy();
    this.bodies.clear();
  }

  /**
   * Abandon every body without calling into Rapier. Used when the world has
   * faulted and is being replaced: the handles the game still holds have to
   * start refusing work, but removing them would go through the very bindings
   * that failed.
   */
  forget(): void {
    for (const entry of this.bodies.values()) entry.destroyed = true;
    this.bodies.clear();
  }

  private clampVelocity(body: RigidBody): void {
    const v = body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (!Number.isFinite(speed) || speed > PHYS.maxLinearVelocity) {
      const s = Number.isFinite(speed) ? PHYS.maxLinearVelocity / speed : 0;
      this.clampVec.x = v.x * s || 0;
      this.clampVec.y = v.y * s || 0;
      this.clampVec.z = v.z * s || 0;
      body.setLinvel(this.clampVec, false);
    }

    const w = body.angvel();
    const spin = Math.hypot(w.x, w.y, w.z);
    if (!Number.isFinite(spin) || spin > PHYS.maxAngularVelocity) {
      const s = Number.isFinite(spin) ? PHYS.maxAngularVelocity / spin : 0;
      this.clampVec.x = w.x * s || 0;
      this.clampVec.y = w.y * s || 0;
      this.clampVec.z = w.z * s || 0;
      body.setAngvel(this.clampVec, false);
    }
  }

  /** Oldest recyclable body goes first; a Map preserves insertion order for us. */
  private enforceCap(incoming: number): void {
    const limit = Math.min(this.cap, PHYS.maxDynamicBodies);
    let guard = 0;
    while (this.bodies.size + incoming > limit && guard++ < limit + 8) {
      let victim: DynamicBody | undefined;
      for (const entry of this.bodies.values()) {
        if (entry.recyclable) {
          victim = entry;
          break;
        }
      }
      // Everything alive is pinned; take the oldest regardless rather than let
      // the world grow past its budget.
      victim ??= this.bodies.values().next().value;
      if (!victim) return;
      victim.destroy();
    }
  }
}

function describeShape(shape: BodyShape): ColliderDesc | null {
  switch (shape.kind) {
    case 'box':
      return RAPIER.ColliderDesc.cuboid(
        Math.max(1e-3, shape.halfExtents.x),
        Math.max(1e-3, shape.halfExtents.y),
        Math.max(1e-3, shape.halfExtents.z),
      );
    case 'sphere':
      return RAPIER.ColliderDesc.ball(Math.max(1e-3, shape.radius));
    case 'capsule':
      return RAPIER.ColliderDesc.capsule(
        Math.max(1e-3, shape.halfHeight),
        Math.max(1e-3, shape.radius),
      );
    case 'convex':
      return shape.points.length >= 12 ? RAPIER.ColliderDesc.convexHull(shape.points) : null;
    default:
      return null;
  }
}
