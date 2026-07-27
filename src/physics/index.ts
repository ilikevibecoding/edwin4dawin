/**
 * Rapier-backed physics.
 *
 * Responsibilities, in the order the frame touches them:
 *   fixedUpdate  — one `world.step()` at exactly `time.fixedStep` (120 Hz),
 *                  transform snapshotting, velocity clamping, ragdoll settling
 *   update       — interpolated transform write-back, ragdoll sync, debug view
 *
 * The system runs at `ORDER.PHYSICS` (100), so the world has already advanced
 * by the time the player and AI ask their character controllers to move within
 * the same fixed tick.
 */
import * as THREE from 'three';
import type { Collider, World } from '@dimforge/rapier3d-compat';
import { RAPIER, initRapier, rapierVersion } from './Rapier';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type {
  CharacterControllerHandle,
  PhysicsRaycastHit,
  PhysicsSystem,
  PhysicsUserData,
  RagdollHandle,
  RaycastOptions,
  RigidBodyHandle,
} from '../core/Contracts';
import { COLLISION_GROUP } from '../core/GameTypes';
import { GAMEPLAY, type QualityConfig } from '../core/Config';
import { rng } from '../core/MathUtils';
import { ColliderRegistry } from './Registry';
import { QueryEngine } from './Queries';
import { StaticGeometry, IDENTITY_ROT } from './StaticGeometry';
import { CharacterHandle } from './Character';
import { DynamicBodyManager, type BodyOptions, type BodyShape } from './Dynamics';
import { Ragdoll } from './Ragdoll';
import { DebugRenderer } from './DebugRender';
import { PHYS } from './Tuning';
import { queryGroups } from './Groups';

export interface PhysicsStats {
  /** Exponential moving average of `world.step()`, in milliseconds. */
  stepMs: number;
  /** Worst single step since the last reset, in milliseconds. */
  stepPeakMs: number;
  /** Total time spent registering static geometry, in milliseconds. */
  staticBuildMs: number;
  staticColliders: number;
  staticBodies: number;
  trimeshTriangles: number;
  dynamicBodies: number;
  characters: number;
  ragdolls: number;
  colliders: number;
  bodies: number;
  /** Scene queries issued in the last second. */
  queriesPerSecond: number;
  debugSegments: number;
}

/** Deferred registration, in case the map somehow gets in before the WASM does. */
interface PendingBox {
  center: THREE.Vector3;
  half: THREE.Vector3;
  quaternion: THREE.Quaternion | null;
  userData: PhysicsUserData | undefined;
}

export class PhysicsSystemImpl implements PhysicsSystem, System {
  readonly name = 'physics' as const;
  readonly order = ORDER.PHYSICS;

  ready = false;
  debugRenderEnabled = false;

  readonly stats: PhysicsStats = {
    stepMs: 0,
    stepPeakMs: 0,
    staticBuildMs: 0,
    staticColliders: 0,
    staticBodies: 0,
    trimeshTriangles: 0,
    dynamicBodies: 0,
    characters: 0,
    ragdolls: 0,
    colliders: 0,
    bodies: 0,
    queriesPerSecond: 0,
    debugSegments: 0,
  };

  private ctx: EngineContext | null = null;
  private world: World | null = null;
  private registry = new ColliderRegistry();
  private queries: QueryEngine | null = null;
  private statics: StaticGeometry | null = null;
  private dynamics: DynamicBodyManager | null = null;
  private readonly debug = new DebugRenderer();

  private readonly characters = new Set<CharacterHandle>();
  private readonly ragdolls: Ragdoll[] = [];
  private readonly pendingBoxes: PendingBox[] = [];
  private readonly pendingMeshes: Array<{ mesh: THREE.Mesh; userData?: PhysicsUserData }> = [];

  private stepIndex = 0;
  private queryWindow = 0;
  private structureDirty = false;
  private lastRefreshFrame = -1;

  // Reused query/impulse scratch so the hot paths never allocate.
  private readonly blastBall = new RAPIER.Ball(1);
  private readonly blastCenter = { x: 0, y: 0, z: 0 };
  private readonly blastImpulse = { x: 0, y: 0, z: 0 };
  private readonly blastTorque = { x: 0, y: 0, z: 0 };
  private readonly blastSeen = new Set<number>();
  private readonly blastTargets: number[] = [];
  private readonly blastCallback = (collider: Collider): boolean => this.collectBlastTarget(collider);
  private blastRadius = 1;
  private blastStrength = 0;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async init(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    await initRapier();

    // Gravity is the game-feel value from GAMEPLAY, not 9.81: the jump arc and
    // the fall of every physics prop have to agree.
    const world = new RAPIER.World({ x: 0, y: GAMEPLAY.player.gravity, z: 0 });
    world.timestep = ctx.time.fixedStep;
    world.integrationParameters.dt = ctx.time.fixedStep;
    world.numSolverIterations = PHYS.solverIterations;
    world.numInternalPgsIterations = PHYS.internalPgsIterations;
    world.maxCcdSubsteps = PHYS.maxCcdSubsteps;
    world.lengthUnit = 1;
    this.world = world;

    this.queries = new QueryEngine(world, this.registry);
    this.statics = new StaticGeometry(world, this.registry);
    this.dynamics = new DynamicBodyManager(world, this.registry, dynamicCap(ctx.config));

    this.ready = true;
    this.flushPending();
    console.info(
      `[physics] rapier ${rapierVersion()} ready — gravity ${GAMEPLAY.player.gravity} m/s², step ${(
        ctx.time.fixedStep * 1000
      ).toFixed(2)} ms`,
    );
  }

  fixedUpdate(dt: number, _ctx: EngineContext): void {
    const world = this.world;
    if (!world) return;

    if (world.timestep !== dt) {
      world.timestep = dt;
      world.integrationParameters.dt = dt;
    }

    this.dynamics?.savePrevious();

    const started = performance.now();
    world.step();
    const elapsed = performance.now() - started;
    this.stats.stepMs = this.stats.stepMs === 0 ? elapsed : this.stats.stepMs * 0.94 + elapsed * 0.06;
    if (elapsed > this.stats.stepPeakMs) this.stats.stepPeakMs = elapsed;

    this.dynamics?.readBack();
    this.structureDirty = false;
    this.stepIndex++;

    if (this.ragdolls.length > 0) this.updateRagdolls(dt);
  }

  update(dt: number, ctx: EngineContext): void {
    const world = this.world;
    if (!world) return;

    if (ctx.input.keyPressed('F4')) this.setDebugRender(!this.debugRenderEnabled);

    this.dynamics?.interpolate(ctx.time.alpha);
    for (let i = 0; i < this.ragdolls.length; i++) this.ragdolls[i].sync();

    this.debug.update(world);
    this.updateStats(dt);
  }

  onQualityChanged(config: QualityConfig): void {
    this.dynamics?.setCap(dynamicCap(config));
    const limit = Math.max(0, config.maxRagdolls);
    while (this.ragdolls.length > limit) this.ragdolls[0].destroy();
  }

  dispose(): void {
    this.debug.dispose();
    for (const character of [...this.characters]) character.destroy();
    for (const ragdoll of [...this.ragdolls]) ragdoll.destroy();
    this.dynamics?.dispose();
    this.statics?.dispose();
    this.registry.clear();
    this.world?.free();
    this.world = null;
    this.queries = null;
    this.statics = null;
    this.dynamics = null;
    this.ready = false;
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null {
    if (!this.queries) return null;
    this.refreshIfDirty();
    return this.queries.raycast(origin, direction, options);
  }

  spherecast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null {
    if (!this.queries) return null;
    this.refreshIfDirty();
    return this.queries.spherecast(origin, direction, radius, options);
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, groups?: number): boolean {
    if (!this.queries) return true;
    this.refreshIfDirty();
    return this.queries.lineOfSight(from, to, groups);
  }

  // -------------------------------------------------------------------------
  // World geometry
  // -------------------------------------------------------------------------

  addStaticBox(
    center: THREE.Vector3,
    halfExtents: THREE.Vector3,
    quaternion?: THREE.Quaternion,
    userData?: PhysicsUserData,
  ): void {
    if (!this.statics) {
      this.pendingBoxes.push({
        center: center.clone(),
        half: halfExtents.clone(),
        quaternion: quaternion ? quaternion.clone() : null,
        userData,
      });
      return;
    }
    this.statics.addBox(center, halfExtents, quaternion, userData);
    this.structureDirty = true;
  }

  addStaticMesh(mesh: THREE.Mesh, userData?: PhysicsUserData): void {
    if (!this.statics) {
      this.pendingMeshes.push({ mesh, userData });
      return;
    }
    this.statics.addMesh(mesh, userData);
    this.structureDirty = true;
  }

  // -------------------------------------------------------------------------
  // Characters
  // -------------------------------------------------------------------------

  /**
   * `position` is the FEET of the capsule — the point standing on the floor.
   * The head is at `position.y + height`.
   */
  createCharacter(
    position: THREE.Vector3,
    height: number,
    radius: number,
    userData?: PhysicsUserData,
  ): CharacterControllerHandle {
    const world = this.world;
    const queries = this.queries;
    if (!world || !queries) throw new Error('[physics] createCharacter before init');

    const handle = new CharacterHandle(
      {
        world,
        registry: this.registry,
        queries,
        onDestroy: (h) => this.characters.delete(h),
      },
      position,
      height,
      radius,
      userData,
    );
    this.characters.add(handle);
    this.structureDirty = true;
    return handle;
  }

  // -------------------------------------------------------------------------
  // Dynamic bodies
  // -------------------------------------------------------------------------

  createRigidBody(
    object3D: THREE.Object3D,
    shape: BodyShape,
    opts?: BodyOptions,
  ): RigidBodyHandle {
    if (!this.dynamics) throw new Error('[physics] createRigidBody before init');
    const handle = this.dynamics.create(object3D, shape, opts);
    this.structureDirty = true;
    return handle;
  }

  // -------------------------------------------------------------------------
  // Ragdolls
  // -------------------------------------------------------------------------

  createRagdoll(
    skeleton: THREE.Skeleton | null,
    root: THREE.Object3D,
    opts?: { impulse?: THREE.Vector3; impulsePoint?: THREE.Vector3 },
  ): RagdollHandle | null {
    const world = this.world;
    const config = this.ctx?.config;
    if (!world || !root) return null;
    if (config && (!config.ragdollsEnabled || config.maxRagdolls <= 0)) return null;

    const limit = Math.max(1, config?.maxRagdolls ?? 8);
    // Recycle rather than refuse: the newest death is always the one the player
    // is looking at.
    while (this.ragdolls.length >= limit) this.ragdolls[0].destroy();

    const ragdoll = new Ragdoll(world, this.registry, skeleton, root, opts, (r) => {
      const i = this.ragdolls.indexOf(r);
      if (i !== -1) this.ragdolls.splice(i, 1);
    });
    this.ragdolls.push(ragdoll);
    this.structureDirty = true;
    return ragdoll;
  }

  // -------------------------------------------------------------------------
  // Explosions
  // -------------------------------------------------------------------------

  /**
   * Blast impulse over every dynamic body in range. The candidate set comes
   * from the broad phase rather than a scan over our own body list, so the cost
   * scales with what is actually near the detonation.
   *
   * Rapier holds a borrow on the body set for the duration of a query callback
   * and panics on any mutation from inside it, so the bodies are collected first
   * and pushed afterwards.
   */
  applyRadialImpulse(center: THREE.Vector3, radius: number, strength: number): void {
    const world = this.world;
    if (!world || radius <= 0 || strength === 0) return;
    this.refreshIfDirty();

    this.blastBall.radius = radius;
    this.blastCenter.x = center.x;
    this.blastCenter.y = center.y;
    this.blastCenter.z = center.z;
    this.blastRadius = radius;
    this.blastStrength = strength;
    this.blastSeen.clear();
    this.blastTargets.length = 0;

    world.intersectionsWithShape(
      this.blastCenter,
      IDENTITY_ROT,
      this.blastBall,
      this.blastCallback,
      RAPIER.QueryFilterFlags.EXCLUDE_FIXED |
        RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC |
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      queryGroups(COLLISION_GROUP.DYNAMIC | COLLISION_GROUP.DEBRIS | COLLISION_GROUP.RAGDOLL),
    );

    for (let i = 0; i < this.blastTargets.length; i++) this.pushBlastTarget(this.blastTargets[i]);
    this.blastSeen.clear();
    this.blastTargets.length = 0;
  }

  private collectBlastTarget(collider: Collider): boolean {
    const body = collider.parent();
    if (!body || !body.isDynamic()) return true;
    if (this.blastSeen.has(body.handle)) return true;
    this.blastSeen.add(body.handle);
    this.blastTargets.push(body.handle);
    return true;
  }

  private pushBlastTarget(handle: number): void {
    const world = this.world;
    if (!world) return;
    const entry = this.dynamics?.get(handle);
    const body = entry?.body ?? world.getRigidBody(handle);
    if (!body) return;

    const t = body.translation();
    let dx = t.x - this.blastCenter.x;
    let dy = t.y - this.blastCenter.y;
    let dz = t.z - this.blastCenter.z;
    const distance = Math.hypot(dx, dy, dz);
    const falloff = 1 - Math.min(1, distance / this.blastRadius);
    if (falloff <= 0) return;

    if (distance < 1e-3) {
      dx = rng.range(-1, 1);
      dy = 1;
      dz = rng.range(-1, 1);
    } else {
      const inv = 1 / distance;
      dx *= inv;
      dy *= inv;
      dz *= inv;
    }
    // Lift the blast vector so debris lofts and tumbles rather than skidding
    // along the floor, which is what a purely radial impulse produces.
    dy += PHYS.explosionUpBias;
    const norm = 1 / Math.max(1e-4, Math.hypot(dx, dy, dz));
    dx *= norm;
    dy *= norm;
    dz *= norm;

    const mass = Math.max(0.1, body.mass());
    const deltaV = Math.min(PHYS.explosionMaxDeltaV, this.blastStrength * falloff * falloff);
    const magnitude = deltaV * mass;
    this.blastImpulse.x = dx * magnitude;
    this.blastImpulse.y = dy * magnitude;
    this.blastImpulse.z = dz * magnitude;
    body.applyImpulse(this.blastImpulse, true);

    // Torque is sized from the body's own inertia so a crate and a girder both
    // end up tumbling at a readable rate instead of one barely turning and the
    // other becoming a blur.
    const inertia = body.principalInertia();
    const spin = PHYS.explosionSpin * falloff;
    this.blastTorque.x = inertia.x * rng.range(-spin, spin);
    this.blastTorque.y = inertia.y * rng.range(-spin, spin);
    this.blastTorque.z = inertia.z * rng.range(-spin, spin);
    body.applyTorqueImpulse(this.blastTorque, true);

    if (entry) entry.asleep = false;
  }

  // -------------------------------------------------------------------------
  // Debug view
  // -------------------------------------------------------------------------

  setDebugRender(on: boolean): void {
    const scene = this.ctx?.scene;
    if (!scene) return;
    this.debugRenderEnabled = on;
    this.debug.setEnabled(on, scene);
    if (!on) this.stats.debugSegments = 0;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private flushPending(): void {
    if (this.pendingBoxes.length > 0) {
      for (const box of this.pendingBoxes) {
        this.statics?.addBox(box.center, box.half, box.quaternion ?? undefined, box.userData);
      }
      this.pendingBoxes.length = 0;
      this.structureDirty = true;
    }
    if (this.pendingMeshes.length > 0) {
      for (const entry of this.pendingMeshes) this.statics?.addMesh(entry.mesh, entry.userData);
      this.pendingMeshes.length = 0;
      this.structureDirty = true;
    }
  }

  /**
   * Rapier 0.19 folded the query pipeline into the broad phase, which is only
   * rebuilt inside `step()`. Colliders added since the last step are therefore
   * invisible to queries until one runs, so take a near-zero step on demand —
   * at most once per frame, since anything added later will be picked up by the
   * next fixed update anyway.
   */
  private refreshIfDirty(): void {
    if (!this.structureDirty) return;
    const world = this.world;
    const frame = this.ctx?.time.frame ?? 0;
    if (!world || frame === this.lastRefreshFrame) return;
    this.lastRefreshFrame = frame;
    this.structureDirty = false;

    const timestep = world.timestep;
    world.timestep = 1e-6;
    world.step();
    world.timestep = timestep;
  }

  private updateRagdolls(dt: number): void {
    const check = this.stepIndex % PHYS.ragdollSettleCheckSteps === 0;
    for (let i = this.ragdolls.length - 1; i >= 0; i--) this.ragdolls[i].update(dt, check);
  }

  private updateStats(dt: number): void {
    const stats = this.stats;
    const statics = this.statics;
    const world = this.world;
    if (statics) {
      stats.staticColliders = statics.boxCount + statics.meshCount;
      stats.staticBodies = statics.bodyCount;
      stats.trimeshTriangles = statics.triangleCount;
      stats.staticBuildMs = statics.buildMs;
    }
    stats.dynamicBodies = this.dynamics?.count ?? 0;
    stats.characters = this.characters.size;
    stats.ragdolls = this.ragdolls.length;
    stats.debugSegments = this.debug.segments;
    if (world) {
      stats.colliders = world.colliders.len();
      stats.bodies = world.bodies.len();
    }

    this.queryWindow += dt;
    if (this.queryWindow >= 1 && this.queries) {
      stats.queriesPerSecond = Math.round(this.queries.count / this.queryWindow);
      this.queries.count = 0;
      this.queryWindow = 0;
    }
  }
}

function dynamicCap(config: QualityConfig | undefined): number {
  const budget = config?.debrisBudget ?? 160;
  return Math.max(48, Math.min(PHYS.maxDynamicBodies, Math.round(budget * 0.75) + 64));
}

export type { PhysicsUserData };
export type { BodyShape, BodyOptions } from './Dynamics';
export { PHYS, SURFACE_PHYSICS } from './Tuning';
export {
  ALL_GROUPS,
  interactionGroups,
  queryGroups,
  STATIC_GROUPS,
  DYNAMIC_GROUPS,
  DEBRIS_GROUPS,
  PLAYER_GROUPS,
  ENEMY_GROUPS,
  PROJECTILE_GROUPS,
  RAGDOLL_GROUPS,
  TRIGGER_GROUPS,
} from './Groups';
