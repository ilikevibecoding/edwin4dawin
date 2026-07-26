import * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { ILevel, IPhysics, RaycastHit, SurfaceType } from '../core/Contracts';
import { RapierWorld, IG_PROP, type ActorCapsule } from './RapierWorld';
import { DebrisPool } from './DebrisPool';
import { Ragdolls, type RagdollTransforms } from './Ragdoll';
import { CharacterController, type QueryFn } from './CharacterController';
import { clamp } from '../core/MathX';

interface PropEntry {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
}

/**
 * Rapier-backed physics for the world: static colliders, fast raycasts, debris,
 * dynamic props, radial explosion impulses and ragdolls.
 *
 * # Public API (beyond {@link IPhysics})
 * Consumed by the AI and level systems — see the module report for details:
 *
 * - `registerActor(id, capsules, object?)` / `updateActor(id, pos, quat?)` /
 *   `unregisterActor(id)` — AI hitbox management. Capsules are **sensors**:
 *   raycastable for bullets, but never block movement.
 * - `addDynamicProp(mesh, mass?)` — knockable barrels/crates.
 * - `createController(radius, halfHeight)` — the player's capsule controller.
 * - `capsuleCast(center, halfHeight, radius, dir, maxDist)` — shape sweep.
 * - `spawnRagdoll(transforms, impulse, hitPoint)` — articulated corpse.
 *
 * If Rapier's WASM fails to load, {@link available} is `false` and raycasts
 * fall back to a `THREE.Raycaster` over the level so the game still boots.
 */
export class PhysicsSystem implements Subsystem, IPhysics {
  readonly name = 'physics';
  readonly order = 15;

  private ctx!: EngineContext;
  private level: ILevel | null = null;
  private rw = new RapierWorld();
  private debris: DebrisPool | null = null;
  private ragdolls: Ragdolls | null = null;
  private props: PropEntry[] = [];

  // Fallback path.
  private raycaster = new THREE.Raycaster();

  private stepMs = 0;
  private readonly boundQuery: QueryFn = (o, d, maxD, opts) =>
    this.raycast(o, d, maxD, { staticOnly: opts?.staticOnly });

  get available() {
    return this.rw.available;
  }

  async init(ctx: EngineContext) {
    this.ctx = ctx;
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;

    await this.rw.init(-21);

    if (this.rw.available) {
      if (this.level) this.rw.buildStaticFromLevel(this.level);
      const q = ctx.settings.quality;
      this.debris = new DebrisPool(this.rw, ctx.scene, q.debrisBudget);
      this.ragdolls = new Ragdolls(this.rw, ctx.scene, q.corpseLimit);
      console.info(
        `[physics] Rapier ready — ${this.rw.staticCount} static colliders, ` +
          `debris≤${q.debrisBudget}, corpses≤${q.corpseLimit}`
      );
    } else {
      console.warn('[physics] running without Rapier (raycaster fallback)');
    }

    ctx.events.on('quality:changed', () => {
      const q = ctx.settings.quality;
      this.debris?.setBudget(q.debrisBudget);
      this.ragdolls?.setLimit(q.corpseLimit);
    });
    ctx.events.on('explosion', (e) => {
      this.applyRadialImpulse(e.position, e.radius, e.force);
    });
  }

  fixedUpdate(dt: number) {
    if (!this.rw.available) return;
    const t0 = performance.now();
    this.rw.step(dt);
    this.syncProps();
    this.debris?.sync(dt);
    this.ragdolls?.sync(dt);
    this.stepMs = this.stepMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  // -------------------------------------------------------------------------
  // IPhysics
  // -------------------------------------------------------------------------

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    opts?: { ignoreActorId?: number; actorsOnly?: boolean; staticOnly?: boolean }
  ): RaycastHit | null {
    if (this.rw.available) return this.rw.raycast(origin, direction, maxDistance, opts);
    return this.raycastFallback(origin, direction, maxDistance);
  }

  private raycastFallback(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): RaycastHit | null {
    const targets = this.level?.collidables ?? [];
    if (!targets.length) return null;
    _dir.copy(direction).normalize();
    this.raycaster.set(origin, _dir);
    this.raycaster.far = maxDistance;
    const hit = this.raycaster.intersectObjects(targets, true)[0];
    if (!hit) return null;
    const normal = hit.normal
      ? hit.normal.clone().transformDirection(hit.object.matrixWorld)
      : new THREE.Vector3(0, 1, 0);
    return {
      point: hit.point.clone(),
      normal,
      distance: hit.distance,
      object: hit.object,
      surface: ((hit.object.userData?.surface as SurfaceType) ?? 'concrete') as SurfaceType,
    };
  }

  addDebris(
    mesh: THREE.Mesh,
    opts?: { mass?: number; restitution?: number; friction?: number; ttl?: number }
  ): number {
    return this.debris?.spawn(mesh, opts) ?? -1;
  }

  applyRadialImpulse(center: THREE.Vector3, radius: number, force: number): void {
    if (this.rw.available) {
      const r2 = radius * radius;
      this.rw.world.forEachRigidBody((body) => {
        if (!body.isDynamic()) return;
        const t = body.translation();
        const dx = t.x - center.x;
        const dy = t.y - center.y;
        const dz = t.z - center.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2) return;
        const d = Math.sqrt(d2) || 0.0001;
        const falloff = 1 - d / radius; // linear falloff
        const mag = force * falloff * falloff;
        _imp.set(dx / d, dy / d + 0.4, dz / d).normalize().multiplyScalar(mag);
        body.applyImpulse(_imp, true);
      });
    }
    // Push the player too, if within range.
    const player = this.ctx.has('player') ? this.ctx.get<unknown>('player') : null;
    const p = player as {
      eye?: THREE.Vector3;
      position?: THREE.Vector3;
      addExternalImpulse?: (v: THREE.Vector3) => void;
    } | null;
    if (p?.addExternalImpulse && p.position) {
      const dx = p.position.x - center.x;
      const dy = p.position.y + 1 - center.y;
      const dz = p.position.z - center.z;
      const d = Math.hypot(dx, dy, dz) || 0.0001;
      if (d < radius) {
        const falloff = 1 - d / radius;
        // Treat force as an impulse over an 85kg player → velocity change.
        const v = (force * falloff) / 85;
        _imp.set(dx / d, dy / d * 0.6 + 0.5, dz / d).normalize().multiplyScalar(clamp(v, 0, 12));
        p.addExternalImpulse(_imp);
      }
    }
  }

  isClear(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (this.rw.available) return this.rw.isClear(from, to);
    return this.level?.lineOfSight(from, to) ?? true;
  }

  // -------------------------------------------------------------------------
  // Extended public API (AI + player + level)
  // -------------------------------------------------------------------------

  registerActor(id: number, capsules: ActorCapsule[], object?: THREE.Object3D) {
    this.rw.registerActor(id, capsules, object ?? null);
  }
  updateActor(
    id: number,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    quaternion?: { x: number; y: number; z: number; w: number }
  ) {
    this.rw.updateActor(id, position, quaternion);
  }
  unregisterActor(id: number) {
    this.rw.unregisterActor(id);
  }

  /** Register a level prop (barrel/crate) as a knockable dynamic body. */
  addDynamicProp(mesh: THREE.Mesh, mass = 12): number {
    if (!this.rw.available) return -1;
    const R = this.rw.R;
    mesh.updateWorldMatrix(true, false);
    mesh.getWorldPosition(_pos);
    mesh.getWorldQuaternion(_quat);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    _size.subVectors(bb.max, bb.min).multiply(mesh.scale).multiplyScalar(0.5);
    const hx = Math.max(0.05, _size.x);
    const hy = Math.max(0.05, _size.y);
    const hz = Math.max(0.05, _size.z);
    const body = this.rw.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(_pos.x, _pos.y, _pos.z)
        .setRotation(_quat as unknown as RAPIER.Rotation)
        .setLinearDamping(0.2)
        .setAngularDamping(0.4)
    );
    const collider = this.rw.world.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz)
        .setDensity(0)
        .setMass(mass)
        .setFriction(0.8)
        .setRestitution(0.1)
        .setCollisionGroups(IG_PROP),
      body
    );
    this.rw.registerColliderObject(collider.handle, mesh);
    this.props.push({ body, collider, mesh });
    return body.handle;
  }

  private syncProps() {
    for (const p of this.props) {
      const t = p.body.translation();
      const r = p.body.rotation();
      p.mesh.position.set(t.x, t.y, t.z);
      p.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  createController(radius: number, halfHeight: number): CharacterController {
    return new CharacterController(this.rw, radius, halfHeight, this.boundQuery);
  }

  capsuleCast(
    center: THREE.Vector3,
    halfHeight: number,
    radius: number,
    dir: THREE.Vector3,
    maxDistance: number
  ): number {
    if (this.rw.available) return this.rw.capsuleCast(center, halfHeight, radius, dir, maxDistance);
    const hit = this.raycast(center, dir, maxDistance + radius, { staticOnly: true });
    return hit ? clamp(hit.distance - radius, 0, maxDistance) : maxDistance;
  }

  spawnRagdoll(transforms: RagdollTransforms, impulse: THREE.Vector3, hitPoint: THREE.Vector3): number {
    return this.ragdolls?.create(transforms, impulse, hitPoint) ?? -1;
  }

  /** Rolling average of the last simulation step time (ms), for the profiler. */
  get simMs() {
    return this.stepMs;
  }

  dispose() {
    this.debris?.clear();
    this.ragdolls?.clear();
    this.rw.dispose();
  }
}

const _dir = new THREE.Vector3();
const _imp = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _size = new THREE.Vector3();
