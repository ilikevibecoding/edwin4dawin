import * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { ILevel, RaycastHit, SurfaceType } from '../core/Contracts';

/** The Rapier module namespace, resolved lazily via dynamic import. */
export type RapierNS = typeof import('@dimforge/rapier3d-compat');

export type BodyPart = 'head' | 'torso' | 'limb';

/** A single capsule making up an actor hitbox, in the actor's local frame. */
export interface ActorCapsule {
  part: BodyPart;
  /** Local-space centre of the capsule. */
  center: [number, number, number];
  /** Half the length of the capsule's cylindrical section. */
  halfHeight: number;
  radius: number;
}

interface ActorEntry {
  id: number;
  body: RAPIER.RigidBody;
  colliders: RAPIER.Collider[];
  object: THREE.Object3D | null;
}

// Collision-group memberships (high 16 bits) / filters (low 16 bits).
export const GROUP_WORLD = 0x0001;
export const GROUP_PROP = 0x0002;
export const GROUP_DEBRIS = 0x0004;
export const GROUP_ACTOR = 0x0008;
export const GROUP_PLAYER = 0x0010;

const groups = (membership: number, filter: number) =>
  ((membership & 0xffff) << 16) | (filter & 0xffff);

// The world collides with everything; the player collides with solids only.
export const IG_WORLD = groups(GROUP_WORLD, 0xffff);
export const IG_PLAYER = groups(GROUP_PLAYER, GROUP_WORLD | GROUP_PROP | GROUP_DEBRIS);
export const IG_DEBRIS = groups(
  GROUP_DEBRIS,
  GROUP_WORLD | GROUP_PROP | GROUP_DEBRIS | GROUP_PLAYER
);
export const IG_PROP = groups(GROUP_PROP, GROUP_WORLD | GROUP_PROP | GROUP_DEBRIS | GROUP_PLAYER);
export const IG_ACTOR = groups(GROUP_ACTOR, 0); // sensors: no physical interaction

/**
 * Thin, allocation-conscious wrapper around a single Rapier physics world.
 *
 * Owns the world lifecycle (including the mandatory async `RAPIER.init()`),
 * builds static colliders from the level, and maintains the reverse maps from
 * Rapier collider handles back to the `THREE.Object3D`/actor that owns them so
 * raycasts can be resolved into the {@link RaycastHit} contract.
 *
 * If the WASM module fails to load (blocked, headless CI without WASM) every
 * method degrades to a no-op and {@link available} stays `false`; the owning
 * {@link PhysicsSystem} then falls back to a `THREE.Raycaster`.
 */
export class RapierWorld {
  available = false;
  R!: RapierNS;
  world!: RAPIER.World;

  private colliderToObject = new Map<number, THREE.Object3D>();
  private colliderToActor = new Map<number, { id: number; part: BodyPart }>();
  private actors = new Map<number, ActorEntry>();
  private staticColliderCount = 0;

  /** Player capsule collider handle — always skipped by world raycasts. */
  playerColliderHandle = -1;

  // Pre-allocated scratch to keep the hot path free of garbage.
  private ray!: RAPIER.Ray;
  private readonly _v = { x: 0, y: 0, z: 0 };
  private readonly _q = { x: 0, y: 0, z: 0, w: 1 };

  // Raycast filter state, read by the persistent predicate below.
  private fIgnoreActor = -2;
  private fActorsOnly = false;
  private fStaticOnly = false;
  private readonly rayPredicate = (collider: RAPIER.Collider): boolean => {
    const h = collider.handle;
    if (h === this.playerColliderHandle) return false;
    const actor = this.colliderToActor.get(h);
    if (this.fActorsOnly && !actor) return false;
    if (this.fStaticOnly && actor) return false;
    if (actor && actor.id === this.fIgnoreActor) return false;
    return true;
  };

  async init(gravityY = -21): Promise<boolean> {
    try {
      const R = (await import('@dimforge/rapier3d-compat')) as RapierNS;
      await R.init();
      this.R = R;
      this.world = new R.World({ x: 0, y: gravityY, z: 0 });
      // Slightly cheaper, stable-enough solver for a shooter.
      this.world.numSolverIterations = 4;
      this.ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
      this.available = true;
      return true;
    } catch (err) {
      console.warn('[RapierWorld] Rapier unavailable, falling back to raycaster:', err);
      this.available = false;
      return false;
    }
  }

  /** Advance the dynamic simulation by one fixed step. */
  step(dt: number) {
    if (!this.available) return;
    this.world.timestep = dt;
    this.world.step();
  }

  // -------------------------------------------------------------------------
  // Static world
  // -------------------------------------------------------------------------

  /**
   * Walk the level's collidables and build static colliders. Box-like meshes
   * (`BoxGeometry`, `PlaneGeometry`, or `userData.colliderShape === 'box'`)
   * become fast cuboids; everything else falls back to a baked trimesh.
   */
  buildStaticFromLevel(level: ILevel) {
    if (!this.available) return;
    const seen = new Set<THREE.Object3D>();
    for (const root of level.collidables) {
      root.updateWorldMatrix(true, false);
      root.traverse((obj) => {
        if (seen.has(obj)) return;
        seen.add(obj);
        const mesh = obj as THREE.Mesh;
        if (!(mesh as THREE.Mesh).isMesh || !mesh.geometry) return;
        if (mesh.userData?.collider === false) return;
        this.buildColliderForMesh(mesh);
      });
    }
    // Populate the broad-phase so queries issued before the first sim step work.
    this.world.step();
  }

  private buildColliderForMesh(mesh: THREE.Mesh) {
    const R = this.R;
    mesh.updateWorldMatrix(true, false);
    _pos.setFromMatrixPosition(mesh.matrixWorld);
    mesh.matrixWorld.decompose(_pos, _quat, _scl);

    const geom = mesh.geometry as THREE.BufferGeometry & {
      type?: string;
      parameters?: { width?: number; height?: number; depth?: number };
    };
    const hint = (mesh.userData?.colliderShape as string) ?? '';
    const type = geom.type ?? '';
    let desc: RAPIER.ColliderDesc | null = null;

    if (hint === 'box' || type === 'BoxGeometry') {
      const p = geom.parameters ?? {};
      const hx = ((p.width ?? 1) / 2) * Math.abs(_scl.x);
      const hy = ((p.height ?? 1) / 2) * Math.abs(_scl.y);
      const hz = ((p.depth ?? 1) / 2) * Math.abs(_scl.z);
      desc = R.ColliderDesc.cuboid(Math.max(0.01, hx), Math.max(0.01, hy), Math.max(0.01, hz))
        .setTranslation(_pos.x, _pos.y, _pos.z)
        .setRotation(_quat as unknown as RAPIER.Rotation);
    } else {
      // Planes and arbitrary/merged geometry → an exact baked trimesh so the
      // walkable surface sits precisely on the mesh (no thickness offset).
      desc = this.buildTrimeshDesc(mesh);
    }
    if (!desc) return;

    desc
      .setFriction(0.9)
      .setRestitution(0.0)
      .setCollisionGroups(IG_WORLD);
    const collider = this.world.createCollider(desc);
    this.colliderToObject.set(collider.handle, mesh);
    this.staticColliderCount++;
  }

  private buildTrimeshDesc(mesh: THREE.Mesh): RAPIER.ColliderDesc | null {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) return null;
    const n = posAttr.count;
    if (n < 3) return null;
    // Bake the full world transform into the vertices; collider sits at origin.
    const verts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      _v3.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
      verts[i * 3] = _v3.x;
      verts[i * 3 + 1] = _v3.y;
      verts[i * 3 + 2] = _v3.z;
    }
    let indices: Uint32Array;
    const idx = geom.getIndex();
    if (idx) {
      indices = new Uint32Array(idx.count);
      for (let i = 0; i < idx.count; i++) indices[i] = idx.getX(i);
    } else {
      indices = new Uint32Array(n);
      for (let i = 0; i < n; i++) indices[i] = i;
    }
    return this.R.ColliderDesc.trimesh(verts, indices);
  }

  /** Register a pre-built static collider desc (used by props etc.). */
  createStatic(desc: RAPIER.ColliderDesc, object: THREE.Object3D) {
    if (!this.available) return;
    desc.setCollisionGroups(IG_WORLD);
    const c = this.world.createCollider(desc);
    this.colliderToObject.set(c.handle, object);
  }

  // -------------------------------------------------------------------------
  // Actors (AI hitboxes) — public API consumed by the AI subsystem
  // -------------------------------------------------------------------------

  /**
   * Register an actor's hitbox as a set of capsule **sensor** colliders on a
   * kinematic body. Sensors are raycastable but never physically block the
   * player, debris or each other. Call {@link updateActor} every frame.
   */
  registerActor(id: number, capsules: ActorCapsule[], object: THREE.Object3D | null = null) {
    if (!this.available) return;
    this.unregisterActor(id);
    const body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased());
    const colliders: RAPIER.Collider[] = [];
    for (const cap of capsules) {
      const desc = this.R.ColliderDesc.capsule(Math.max(0.02, cap.halfHeight), Math.max(0.02, cap.radius))
        .setTranslation(cap.center[0], cap.center[1], cap.center[2])
        .setSensor(true)
        .setCollisionGroups(IG_ACTOR);
      const c = this.world.createCollider(desc, body);
      colliders.push(c);
      this.colliderToActor.set(c.handle, { id, part: cap.part });
      if (object) this.colliderToObject.set(c.handle, object);
    }
    this.actors.set(id, { id, body, colliders, object });
  }

  /** Move an actor's whole hitbox. Positions the kinematic body. */
  updateActor(
    id: number,
    position: THREE.Vector3 | { x: number; y: number; z: number },
    quaternion?: { x: number; y: number; z: number; w: number }
  ) {
    if (!this.available) return;
    const entry = this.actors.get(id);
    if (!entry) return;
    this._v.x = position.x;
    this._v.y = position.y;
    this._v.z = position.z;
    entry.body.setNextKinematicTranslation(this._v);
    if (quaternion) {
      entry.body.setNextKinematicRotation(quaternion);
    }
  }

  unregisterActor(id: number) {
    if (!this.available) return;
    const entry = this.actors.get(id);
    if (!entry) return;
    for (const c of entry.colliders) {
      this.colliderToActor.delete(c.handle);
      this.colliderToObject.delete(c.handle);
    }
    this.world.removeRigidBody(entry.body);
    this.actors.delete(id);
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    opts?: { ignoreActorId?: number; actorsOnly?: boolean; staticOnly?: boolean }
  ): RaycastHit | null {
    if (!this.available) return null;
    const R = this.R;
    // Normalise the direction so time-of-impact equals metric distance.
    let dx = direction.x,
      dy = direction.y,
      dz = direction.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    this.ray.origin.x = origin.x;
    this.ray.origin.y = origin.y;
    this.ray.origin.z = origin.z;
    this.ray.dir.x = dx;
    this.ray.dir.y = dy;
    this.ray.dir.z = dz;

    this.fIgnoreActor = opts?.ignoreActorId ?? -2;
    this.fActorsOnly = opts?.actorsOnly ?? false;
    this.fStaticOnly = opts?.staticOnly ?? false;

    let flags = this.R.QueryFilterFlags.EXCLUDE_SENSORS;
    if (this.fStaticOnly) {
      flags = this.R.QueryFilterFlags.EXCLUDE_DYNAMIC | this.R.QueryFilterFlags.EXCLUDE_KINEMATIC;
    } else if (this.fActorsOnly) {
      // Sensors are the actor hitboxes; include them.
      flags = 0 as RAPIER.QueryFilterFlags;
    }

    const hit = this.world.castRayAndGetNormal(
      this.ray,
      maxDistance,
      true,
      flags,
      undefined,
      undefined,
      undefined,
      this.rayPredicate
    );
    if (!hit) return null;

    const toi = hit.timeOfImpact;
    const object = this.colliderToObject.get(hit.collider.handle) ?? null;
    const actor = this.colliderToActor.get(hit.collider.handle);
    const point = new THREE.Vector3(origin.x + dx * toi, origin.y + dy * toi, origin.z + dz * toi);
    const normal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
    const surface = ((object?.userData?.surface as SurfaceType) ??
      (actor ? 'flesh' : 'concrete')) as SurfaceType;
    const out: RaycastHit = { point, normal, distance: toi, object, surface };
    if (actor) {
      out.actorId = actor.id;
      out.bodyPart = actor.part;
    }
    return out;
  }

  /** Cheap segment test against static geometry only. */
  isClear(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (!this.available) return true;
    let dx = to.x - from.x,
      dy = to.y - from.y,
      dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-4) return true;
    dx /= dist;
    dy /= dist;
    dz /= dist;
    this.ray.origin.x = from.x;
    this.ray.origin.y = from.y;
    this.ray.origin.z = from.z;
    this.ray.dir.x = dx;
    this.ray.dir.y = dy;
    this.ray.dir.z = dz;
    const flags =
      this.R.QueryFilterFlags.EXCLUDE_DYNAMIC |
      this.R.QueryFilterFlags.EXCLUDE_KINEMATIC |
      this.R.QueryFilterFlags.EXCLUDE_SENSORS;
    const t = this.world.castRay(this.ray, dist - 0.02, true, flags);
    return t === null;
  }

  /**
   * Sweep a vertical capsule and return the distance to the first solid hit,
   * or `maxDistance` if clear. Used by the character controller for mantle and
   * ceiling checks.
   */
  capsuleCast(
    center: THREE.Vector3,
    halfHeight: number,
    radius: number,
    dir: THREE.Vector3,
    maxDistance: number
  ): number {
    if (!this.available) return maxDistance;
    const shape = new this.R.Capsule(halfHeight, radius);
    this._v.x = center.x;
    this._v.y = center.y;
    this._v.z = center.z;
    const vel = _velScratch;
    const l = Math.hypot(dir.x, dir.y, dir.z) || 1;
    vel.x = dir.x / l;
    vel.y = dir.y / l;
    vel.z = dir.z / l;
    this._q.x = 0;
    this._q.y = 0;
    this._q.z = 0;
    this._q.w = 1;
    const flags =
      this.R.QueryFilterFlags.EXCLUDE_DYNAMIC | this.R.QueryFilterFlags.EXCLUDE_SENSORS;
    const hit = this.world.castShape(
      this._v,
      this._q,
      vel,
      shape,
      0,
      maxDistance,
      true,
      flags,
      undefined,
      undefined,
      undefined,
      this.rayPredicateStaticOnly
    );
    return hit ? hit.time_of_impact : maxDistance;
  }

  private readonly rayPredicateStaticOnly = (collider: RAPIER.Collider): boolean => {
    if (collider.handle === this.playerColliderHandle) return false;
    return !this.colliderToActor.has(collider.handle);
  };

  objectForCollider(handle: number): THREE.Object3D | null {
    return this.colliderToObject.get(handle) ?? null;
  }

  registerColliderObject(handle: number, object: THREE.Object3D) {
    this.colliderToObject.set(handle, object);
  }
  unregisterCollider(handle: number) {
    this.colliderToObject.delete(handle);
  }

  get staticCount() {
    return this.staticColliderCount;
  }

  dispose() {
    if (this.available && this.world) this.world.free();
    this.colliderToObject.clear();
    this.colliderToActor.clear();
    this.actors.clear();
  }
}

// Module-level scratch (single-threaded, reused across calls).
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _velScratch = { x: 0, y: 0, z: 0 };
