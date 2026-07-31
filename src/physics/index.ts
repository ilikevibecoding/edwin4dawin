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
 *
 * Everything that touches Rapier goes through the re-entrancy gate, and every
 * public entry point contains its own faults: a trap inside the WASM leaves the
 * whole world unusable, and the answer to that is a new world, not a physics
 * system the engine quietly switches off. See `Reentrancy.ts` and `rebuild()`.
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
import { gate } from './Reentrancy';
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
  /** Broad-phase refreshes taken so newly added colliders become queryable. */
  queryRefreshes: number;
  /** Mutations that had to wait for an outstanding query to return. */
  deferredMutations: number;
  /** Times the world was rebuilt after a Rapier fault. */
  worldRebuilds: number;
}

/** A world that faulted this many times is left out of service for good. */
const MAX_REBUILDS = 3;

/** Gravity for the query-structure refresh; see `refreshIfDirty`. */
const FROZEN_GRAVITY = { x: 0, y: 0, z: 0 };

/** Deferred registration, in case the map somehow gets in before the WASM does. */
interface PendingBox {
  center: THREE.Vector3;
  half: THREE.Vector3;
  quaternion: THREE.Quaternion | null;
  userData: PhysicsUserData | undefined;
}

interface PendingMesh {
  mesh: THREE.Mesh;
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
    queryRefreshes: 0,
    deferredMutations: 0,
    worldRebuilds: 0,
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
  private readonly pendingMeshes: PendingMesh[] = [];
  /**
   * Everything needed to lay the map's collision back down in a replacement
   * world. Boxes are ~4.5k small records; meshes are references to Three.js
   * geometry that stays alive in the scene regardless, so this costs about a
   * megabyte and is the difference between recovering from a fault and having
   * the player fall through the floor.
   */
  private readonly replayBoxes: PendingBox[] = [];
  private readonly replayMeshes: PendingMesh[] = [];

  private stepIndex = 0;
  private queryWindow = 0;
  private structureDirty = false;
  private lastRefreshFrame = -1;
  /** True between a Rapier fault and a successful rebuild; nothing may touch the world. */
  private faulted = false;
  /** Set once the rebuild budget is spent, so recovery is not retried forever. */
  private retired = false;
  private pendingStepDt = 0;

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

    this.install(this.makeWorld(ctx.time.fixedStep), dynamicCap(ctx.config));

    this.ready = true;
    this.flushPending();
    console.info(
      `[physics] rapier ${rapierVersion()} ready — gravity ${GAMEPLAY.player.gravity} m/s², step ${(
        ctx.time.fixedStep * 1000
      ).toFixed(2)} ms`,
    );
  }

  private makeWorld(dt: number): World {
    const world = new RAPIER.World({ x: 0, y: GAMEPLAY.player.gravity, z: 0 });
    world.timestep = dt;
    world.integrationParameters.dt = dt;
    world.numSolverIterations = PHYS.solverIterations;
    world.numInternalPgsIterations = PHYS.internalPgsIterations;
    world.maxCcdSubsteps = PHYS.maxCcdSubsteps;
    world.lengthUnit = 1;
    return world;
  }

  private install(world: World, cap: number): void {
    this.world = world;
    this.queries = new QueryEngine(world, this.registry);
    this.statics = new StaticGeometry(world, this.registry);
    this.dynamics = new DynamicBodyManager(world, this.registry, cap);
  }

  fixedUpdate(dt: number, _ctx: EngineContext): void {
    // Recovery happens here rather than in the fault handler so the rebuild
    // runs on a clean stack, not while unwinding out of a trap.
    if (this.faulted) {
      this.rebuild();
      return;
    }
    if (!this.world) return;
    // The engine only ever calls this at gate depth zero, but a step taken with
    // a query outstanding is the one mistake there is no coming back from.
    this.pendingStepDt = dt;
    if (gate.busy) {
      gate.defer(this.deferredStep);
      return;
    }
    this.step(dt);
  }

  private readonly deferredStep = (): void => {
    if (this.world && !this.faulted) this.step(this.pendingStepDt);
  };

  /**
   * The gate is held across the whole step, not just `world.step()`: read-back
   * recycles bodies that fell out of the map and ragdoll settling puts corpses
   * to sleep, and both of those are mutations that belong after the step rather
   * than interleaved with it.
   */
  private step(dt: number): void {
    const world = this.world;
    if (!world) return;

    gate.enter();
    try {
      if (world.timestep !== dt) {
        world.timestep = dt;
        world.integrationParameters.dt = dt;
      }

      this.dynamics?.savePrevious();

      const started = performance.now();
      world.step();
      const elapsed = performance.now() - started;
      this.stats.stepMs =
        this.stats.stepMs === 0 ? elapsed : this.stats.stepMs * 0.94 + elapsed * 0.06;
      if (elapsed > this.stats.stepPeakMs) this.stats.stepPeakMs = elapsed;

      this.dynamics?.readBack();
      this.structureDirty = false;
      this.stepIndex++;

      if (this.ragdolls.length > 0) this.updateRagdolls(dt);
    } catch (err) {
      this.fault('step', err);
    } finally {
      gate.leave();
    }
  }

  update(dt: number, ctx: EngineContext): void {
    const world = this.world;
    if (!world || this.faulted) return;

    if (ctx.input.keyPressed('F4')) this.setDebugRender(!this.debugRenderEnabled);

    gate.enter();
    try {
      this.dynamics?.interpolate(ctx.time.alpha);
      for (let i = 0; i < this.ragdolls.length; i++) this.ragdolls[i].sync();
      this.debug.update(world);
      this.updateStats(dt);
    } catch (err) {
      this.fault('update', err);
    } finally {
      gate.leave();
    }
  }

  onQualityChanged(config: QualityConfig): void {
    this.dynamics?.setCap(dynamicCap(config));
    const limit = Math.max(0, config.maxRagdolls);
    while (this.ragdolls.length > limit) this.ragdolls[0].destroy();
  }

  dispose(): void {
    this.debug.dispose();
    // Teardown runs on a world that may already have faulted, and every call
    // below would throw on one. Nothing here needs to succeed for the page to
    // go away cleanly.
    try {
      for (const character of [...this.characters]) character.destroy();
      for (const ragdoll of [...this.ragdolls]) ragdoll.destroy();
      this.dynamics?.dispose();
      this.statics?.dispose();
      this.world?.free();
    } catch {
      /* the world is being dropped either way */
    }
    this.characters.clear();
    this.ragdolls.length = 0;
    this.registry.clear();
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
    const queries = this.queries;
    if (!queries || this.faulted) return null;
    this.refreshIfDirty();
    try {
      return queries.raycast(origin, direction, options);
    } catch (err) {
      this.fault('raycast', err);
      return null;
    }
  }

  spherecast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null {
    const queries = this.queries;
    if (!queries || this.faulted) return null;
    this.refreshIfDirty();
    try {
      return queries.spherecast(origin, direction, radius, options);
    } catch (err) {
      this.fault('spherecast', err);
      return null;
    }
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, groups?: number): boolean {
    const queries = this.queries;
    if (!queries || this.faulted) return true;
    this.refreshIfDirty();
    try {
      return queries.lineOfSight(from, to, groups);
    } catch (err) {
      this.fault('lineOfSight', err);
      return true;
    }
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
    const record: PendingBox = {
      center: center.clone(),
      half: halfExtents.clone(),
      quaternion: quaternion ? quaternion.clone() : null,
      userData,
    };
    this.replayBoxes.push(record);
    if (!this.statics) {
      this.pendingBoxes.push(record);
      return;
    }
    this.statics.addBox(center, halfExtents, quaternion, userData);
    this.structureDirty = true;
  }

  addStaticMesh(mesh: THREE.Mesh, userData?: PhysicsUserData): void {
    const record: PendingMesh = { mesh, userData };
    this.replayMeshes.push(record);
    if (!this.statics) {
      this.pendingMeshes.push(record);
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
   * and pushed afterwards. The gate now enforces that for every other mutator
   * in the module; this one keeps doing it by hand because collecting handles
   * is cheaper than queuing one closure per body in a blast.
   *
   * Collecting first is only half the rule, though. It protects the blast from
   * its own query but not from somebody else's: a detonation raised while an
   * outer cast is still open — impact FX firing from inside a bullet's
   * raycast, which is exactly how the game reaches this — was still pushing
   * impulses into a borrowed body set. So the whole push goes through the gate
   * as well, and the parameters are snapshotted because the scratch fields will
   * have been reused by then.
   */
  applyRadialImpulse(center: THREE.Vector3, radius: number, strength: number): void {
    const world = this.world;
    if (!world || this.faulted || radius <= 0 || strength === 0) return;
    this.refreshIfDirty();

    this.blastBall.radius = radius;
    this.blastCenter.x = center.x;
    this.blastCenter.y = center.y;
    this.blastCenter.z = center.z;
    this.blastRadius = radius;
    this.blastStrength = strength;
    this.blastSeen.clear();
    this.blastTargets.length = 0;

    gate.enter();
    try {
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
    } catch (err) {
      this.fault('applyRadialImpulse', err);
    } finally {
      gate.leave();
    }

    if (gate.busy) {
      const targets = this.blastTargets.slice();
      gate.defer(() => this.pushBlast(targets, center.x, center.y, center.z, radius, strength));
    } else {
      this.pushBlast(this.blastTargets, center.x, center.y, center.z, radius, strength);
    }
    this.blastSeen.clear();
    this.blastTargets.length = 0;
  }

  private pushBlast(
    targets: readonly number[],
    x: number,
    y: number,
    z: number,
    radius: number,
    strength: number,
  ): void {
    if (!this.world || this.faulted) return;
    this.blastCenter.x = x;
    this.blastCenter.y = y;
    this.blastCenter.z = z;
    this.blastRadius = radius;
    this.blastStrength = strength;
    try {
      for (let i = 0; i < targets.length; i++) this.pushBlastTarget(targets[i]);
    } catch (err) {
      this.fault('applyRadialImpulse', err);
    }
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

  // -------------------------------------------------------------------------
  // Fault recovery
  // -------------------------------------------------------------------------

  /**
   * A Rapier fault is not recoverable in place. Once the WASM has trapped, the
   * borrow flags on that world's body and collider sets stay set and every
   * later call through it fails, which is why one bad step took five engine
   * phases down with it. A replacement `World` is unaffected, so the answer is
   * to build one rather than let the engine switch physics off: a session with
   * no simulation looks like the game is broken, whereas a rebuild costs the
   * loose debris and any corpses on the ground and keeps everything else.
   */
  private fault(where: string, err: unknown): void {
    if (this.faulted) return;
    this.faulted = true;
    console.error(`[physics] rapier fault in ${where}; rebuilding the world`, err);
  }

  private rebuild(): void {
    const ctx = this.ctx;
    if (this.retired || !ctx) return;
    if (this.stats.worldRebuilds >= MAX_REBUILDS) {
      this.retired = true;
      console.error(`[physics] ${MAX_REBUILDS} rebuilds already; leaving the world offline`);
      return;
    }

    // Nothing that referenced the dead world may be touched again, deferred
    // work included: those closures capture bodies that no longer exist. So
    // every handle is abandoned rather than destroyed — a destroy would call
    // straight back into the bindings that just failed.
    gate.reset();
    const characters = [...this.characters];
    for (const ragdoll of [...this.ragdolls]) ragdoll.forget();
    this.ragdolls.length = 0;
    this.dynamics?.forget();
    this.registry.clear();
    // The old world is left to the GC on purpose: `free()` goes through the
    // same poisoned bindings and would throw.
    this.world = null;

    const started = performance.now();
    const world = this.makeWorld(ctx.time.fixedStep);
    this.install(world, dynamicCap(ctx.config));
    const queries = this.queries;
    if (!queries) return;

    for (const box of this.replayBoxes) {
      this.statics?.addBox(box.center, box.half, box.quaternion ?? undefined, box.userData);
    }
    for (const entry of this.replayMeshes) this.statics?.addMesh(entry.mesh, entry.userData);
    for (const character of characters) character.rebuild(world, queries);

    this.structureDirty = true;
    this.lastRefreshFrame = -1;
    this.faulted = false;
    this.stats.worldRebuilds++;
    console.warn(
      `[physics] world rebuilt in ${(performance.now() - started).toFixed(1)} ms — ` +
        `${this.replayBoxes.length} boxes, ${this.replayMeshes.length} meshes, ` +
        `${characters.length} characters restored`,
    );
  }

  /**
   * Rapier 0.19 folded the query pipeline into the broad phase, which is only
   * rebuilt inside `step()`. Colliders added since the last step are therefore
   * invisible to queries until one runs, so take a step on demand — at most
   * once per frame, since anything added later will be picked up by the next
   * fixed update anyway.
   *
   * That step has to advance nothing. It used to run at `dt = 1e-6`, which is
   * not "nearly zero" to a constraint solver: the joint and contact terms are
   * built from `1 / dt`, so at a microsecond an acceleration-based ragdoll
   * motor produces corrective velocities around 1e22 m/s and the bodies go
   * non-finite within about ten frames. The *next* ordinary `world.step()`
   * then trips an assertion inside the broad phase and the WASM traps with
   * `RuntimeError: unreachable`, which is where the crash in `shots/v3`
   * begins. Freezing gravity, both solver loops and CCD makes `dt = 0` safe:
   * the broad phase is still rebuilt, so new colliders become queryable, and a
   * settled pile measures zero drift across hundreds of refreshes.
   *
   * The other half of the rule is that this must never run inside a query.
   * `world.step()` re-entered from a query callback does not merely fail — it
   * leaves borrows outstanding for the life of the world, which is the
   * "recursive use of an object" cascade in the same log.
   */
  private refreshIfDirty(): void {
    if (!this.structureDirty || gate.busy) return;
    const world = this.world;
    const frame = this.ctx?.time.frame ?? 0;
    if (!world || frame === this.lastRefreshFrame) return;
    this.lastRefreshFrame = frame;
    this.structureDirty = false;
    this.stats.queryRefreshes++;

    const gravity = world.gravity;
    const timestep = world.timestep;
    const solver = world.numSolverIterations;
    const pgs = world.numInternalPgsIterations;
    const ccd = world.maxCcdSubsteps;
    gate.enter();
    try {
      world.gravity = FROZEN_GRAVITY;
      world.timestep = 0;
      world.numSolverIterations = 0;
      world.numInternalPgsIterations = 0;
      world.maxCcdSubsteps = 0;
      world.step();
      // Deliberately inside the `try`: if the step threw, this world is being
      // replaced and restoring its parameters would only throw again.
      world.gravity = gravity;
      world.timestep = timestep;
      world.numSolverIterations = solver;
      world.numInternalPgsIterations = pgs;
      world.maxCcdSubsteps = ccd;
    } catch (err) {
      this.fault('refresh', err);
    } finally {
      gate.leave();
    }
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

    stats.deferredMutations = gate.deferrals;

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
