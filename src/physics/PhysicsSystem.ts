import * as THREE from 'three';
import { Groups, hitMeta, type GameContext, type System } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type {
  BodyDesc,
  BodyHandle,
  CharacterMoveResult,
  IPhysics,
  IWorld,
  RaycastHit,
} from '../core/Interfaces';
import type { QualitySettings } from '../core/Quality';
import { NO_IGNORE, StaticWorld, TriBuffer, TriHit } from './StaticWorld';
import { DynamicSet, type DynamicHit } from './DynamicSet';
import { CHARACTER_MASK, CharacterController, CharacterMoveOut } from './CharacterController';
import { RigidBodySet, type BodyInfo } from './RigidBodies';
import { PhysicsDebug } from './PhysicsDebug';
import { aabbOverlap, capsuleTriangleTOI, closestPointsSegmentTriangle } from './Geometry';

/**
 * Physics and collision.
 *
 * Three subsystems sit behind one interface:
 *
 * - a static BVH over the whole level baked into world space, which every
 *   bullet, line-of-sight test and footstep query traverses;
 * - a kinematic capsule controller with collide-and-slide, step-up, slope
 *   limits and ground snapping;
 * - a small impulse solver for debris, casings and ragdoll parts, run on a
 *   fixed timestep so behaviour does not change with frame rate.
 *
 * Everything hot is written against flat typed arrays with module-scope
 * scratch, because raycast is the single most called function in the game.
 */

const ALL_GROUPS = 0xffffffff;
const FIXED_DT = 1 / 60;
const MAX_FIXED_STEPS = 4;
const MAX_PENETRATION_HITS = 24;
const SIGHT_MASK = Groups.WORLD | Groups.PROP;
const GROUND_MASK = Groups.WORLD | Groups.PROP;
const HEIGHT_CACHE_BITS = 12;
const HEIGHT_CACHE_SIZE = 1 << HEIGHT_CACHE_BITS;

const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _capNormal = new THREE.Vector3();
const _sphereP = new THREE.Vector3();

export default class PhysicsSystem implements System, IPhysics {
  readonly key = 'physics';
  readonly order = 25;

  private ctx: GameContext | null = null;
  private world = new StaticWorld();
  private dynamic = new DynamicSet();
  private character = new CharacterController(this.world);
  private bodies = new RigidBodySet(this.world);
  private debug = new PhysicsDebug();
  private moveOut = new CharacterMoveOut();
  private sweepTris = new TriBuffer(2048);

  private accumulator = 0;
  private staticHit = new TriHit();
  private penetrationHits: TriHit[] = [];
  private dynamicHit: DynamicHit = {
    distance: 0,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    slot: -1,
  };
  private dynamicScratch: DynamicHit = {
    distance: 0,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    slot: -1,
  };
  private queryHit: RaycastHit = makeHit();

  /** Direct-mapped cache for `groundHeight`, invalidated when the level bakes. */
  private hcKeyX = new Float32Array(HEIGHT_CACHE_SIZE);
  private hcKeyZ = new Float32Array(HEIGHT_CACHE_SIZE);
  private hcKeyY = new Float32Array(HEIGHT_CACHE_SIZE);
  private hcValue = new Float32Array(HEIGHT_CACHE_SIZE);
  private hcUsed = new Uint8Array(HEIGHT_CACHE_SIZE);
  private hcVersion = -1;
  private hcHits = 0;
  private hcMisses = 0;

  private bodyCapOverride: number | null = null;
  private discoverTimer = 0;
  private worldRootTried = false;
  private lastCharacterPos = new THREE.Vector3();
  private lastCharacterRadius = 0;
  private lastCharacterHeight = 0;
  private hadCharacter = false;
  private unsubscribe: Array<() => void> = [];
  private playground: { update?(dt: number): void; dispose?(): void } | null = null;

  /** Rolling cost of the last simulation step, for the debug overlay. */
  lastStepMs = 0;

  constructor() {
    for (let i = 0; i < MAX_PENETRATION_HITS; i++) this.penetrationHits.push(new TriHit());
  }

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.applyQuality(ctx.quality);
    ctx.scene.add(this.debug.group);

    this.unsubscribe.push(
      ctx.events.on('debug:toggle', (what) => {
        if (what === 'physics') this.debug.setEnabled(!this.debug.enabled);
      }),
    );
    // Blasts throw loose geometry around without the FX system needing to know
    // the physics API exists.
    this.unsubscribe.push(
      ctx.events.on('fx:explosion', (e) => {
        const radius = Math.max(0.5, e.radius);
        this.bodies.wakeInRadius(e.position, radius * 1.3);
        this.bodies.applyExplosionForce(e.position, radius * 1.25, 12 + radius * 26);
      }),
    );

    if (typeof location !== 'undefined' && location.search.includes('showcase=physics')) {
      try {
        const mod = await import('./PhysicsPlayground');
        this.playground = new mod.PhysicsPlayground(ctx, this);
      } catch (err) {
        console.error('[physics] playground failed to load:', err);
      }
    }
  }

  onQualityChange(quality: QualitySettings): void {
    this.applyQuality(quality);
  }

  private applyQuality(quality: QualitySettings): void {
    this.bodies.substeps = Math.max(1, quality.physicsSubsteps);
    this.bodies.maxBodies =
      this.bodyCapOverride ??
      Math.round(Math.min(512, Math.max(96, 320 * Math.max(0.25, quality.debrisDensity))));
  }

  /**
   * Pins the live body cap, ignoring quality settings. Used by the playground
   * to stress the solver with a fixed count; pass null to follow quality again.
   */
  setBodyCap(cap: number | null): void {
    this.bodyCapOverride = cap === null ? null : Math.max(8, Math.round(cap));
    if (this.ctx) this.applyQuality(this.ctx.quality);
  }

  update(dt: number, ctx: GameContext): void {
    const t0 = now();
    this.world.ensureBuilt();
    if (this.world.version !== this.hcVersion) {
      this.hcUsed.fill(0);
      this.hcVersion = this.world.version;
    }
    this.dynamic.markStale();

    this.discoverTimer -= dt;
    if (this.discoverTimer <= 0) {
      this.discoverTimer = 0.5;
      this.discover(ctx);
    }

    // Fixed timestep so debris behaves identically at 30 and 240 fps.
    this.accumulator += Math.min(dt, 0.25);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_FIXED_STEPS) {
      this.bodies.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_FIXED_STEPS) this.accumulator = 0;
    this.bodies.writeTransforms(this.accumulator / FIXED_DT);

    this.playground?.update?.(dt);
    if (this.debug.enabled) this.drawDebug();
    this.lastStepMs = now() - t0;
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.playground?.dispose?.();
    this.bodies.clear();
    this.world.clear();
    this.dynamic.clear();
    this.debug.dispose();
  }

  /* --------------------------- registration ---------------------------- */

  addStatic(object: THREE.Object3D): void {
    // Anything auto-registered under this subtree is now redundant.
    object.traverse((child) => {
      if (this.dynamic.has(child)) this.dynamic.remove(child);
      if (child !== object) this.world.remove(child);
      child.userData.__physOwned = true;
    });
    this.world.add(object);
  }

  removeStatic(object: THREE.Object3D): void {
    this.world.remove(object);
    object.traverse((child) => {
      delete child.userData.__physOwned;
    });
  }

  addDynamic(object: THREE.Object3D): void {
    object.userData.__physOwned = true;
    this.dynamic.add(object);
  }

  removeDynamic(object: THREE.Object3D): void {
    this.dynamic.remove(object);
  }

  /**
   * Safety net for systems that never registered anything. The level root is
   * picked up automatically, and colliders tagged with an entity id are treated
   * as moving hitboxes so bullets can find them.
   */
  private discover(ctx: GameContext): void {
    if (!this.worldRootTried && this.world.colliderCount === 0) {
      const world = ctx.tryGet<IWorld>('world');
      const root = world?.root;
      if (root) {
        this.worldRootTried = true;
        this.addStatic(root);
      }
    }

    ctx.scene.traverse((obj) => {
      if (obj.userData.__physOwned === true) return;
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const meta = hitMeta(obj);
      const isCharacter =
        meta.entityId !== undefined ||
        (meta.group !== undefined && (meta.group & (Groups.ENEMY | Groups.PLAYER)) !== 0);
      if (!isCharacter) return;
      obj.userData.__physOwned = true;
      this.dynamic.add(obj);
    });
  }

  /* ----------------------------- raycasts ------------------------------ */

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    mask = ALL_GROUPS,
    ignore?: THREE.Object3D[],
  ): RaycastHit | null {
    const out = this.queryHit;
    if (!this.raycastInto(origin, direction, maxDistance, out, mask, ignore)) return null;
    // Hand back a copy: consumers routinely keep hits across frames.
    return {
      point: out.point.clone(),
      normal: out.normal.clone(),
      distance: out.distance,
      object: out.object,
      surface: out.surface,
      entityId: out.entityId,
      damageScale: out.damageScale,
      penetration: out.penetration,
    };
  }

  raycastInto(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    out: RaycastHit,
    mask = ALL_GROUPS,
    ignore?: THREE.Object3D[],
  ): boolean {
    this.world.ensureBuilt();
    const len = direction.length();
    if (len < 1e-9 || maxDistance <= 0) return false;
    const inv = 1 / len;
    const dx = direction.x * inv;
    const dy = direction.y * inv;
    const dz = direction.z * inv;

    const staticStamp = this.world.beginQuery(ignore);
    const hitStatic = this.world.raycast(
      origin.x, origin.y, origin.z,
      dx, dy, dz,
      maxDistance,
      mask,
      staticStamp,
      this.staticHit,
    );

    let best = hitStatic ? this.staticHit.distance : maxDistance;
    let slot = -1;
    if (this.dynamic.count > 0) {
      const dynStamp = this.dynamic.beginQuery(ignore);
      slot = this.dynamic.raycast(
        origin.x, origin.y, origin.z,
        dx, dy, dz,
        best,
        mask,
        dynStamp,
        this.dynamicHit,
        this.dynamicScratch,
      );
    }

    if (slot >= 0) {
      const collider = this.dynamic.colliderAt(slot);
      out.point.copy(this.dynamicHit.point);
      out.normal.copy(this.dynamicHit.normal);
      out.distance = this.dynamicHit.distance;
      if (collider) {
        out.object = collider.object;
        out.surface = collider.surface;
        out.entityId = collider.entityId >= 0 ? collider.entityId : undefined;
        out.damageScale = collider.damageScale;
        out.penetration = collider.penetration;
      }
      return true;
    }
    if (!hitStatic) return false;
    this.fillStaticHit(this.staticHit, out);
    return true;
  }

  private fillStaticHit(hit: TriHit, out: RaycastHit): void {
    const chunk = this.world.chunkAt(hit.chunk);
    out.point.set(hit.px, hit.py, hit.pz);
    out.normal.set(hit.nx, hit.ny, hit.nz);
    out.distance = hit.distance;
    out.object = chunk?.object ?? out.object;
    out.surface = chunk?.surface ?? 'concrete';
    out.entityId = chunk && chunk.entityId >= 0 ? chunk.entityId : undefined;
    out.damageScale = chunk?.damageScale ?? 1;
    out.penetration = chunk?.penetration ?? 0.25;
  }

  raycastAll(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    mask = ALL_GROUPS,
    ignore?: THREE.Object3D[],
  ): RaycastHit[] {
    this.world.ensureBuilt();
    const results: RaycastHit[] = [];
    const len = direction.length();
    if (len < 1e-9 || maxDistance <= 0) return results;
    const inv = 1 / len;
    const dx = direction.x * inv;
    const dy = direction.y * inv;
    const dz = direction.z * inv;

    const staticStamp = this.world.beginQuery(ignore);
    const count = this.world.raycastAll(
      origin.x, origin.y, origin.z,
      dx, dy, dz,
      maxDistance,
      mask,
      staticStamp,
      this.penetrationHits,
    );
    for (let i = 0; i < count; i++) {
      const hit = makeHit();
      this.fillStaticHit(this.penetrationHits[i], hit);
      results.push(hit);
    }

    if (this.dynamic.count > 0) {
      const dynStamp = this.dynamic.beginQuery(ignore);
      this.dynamic.raycastAll(
        origin.x, origin.y, origin.z,
        dx, dy, dz,
        maxDistance,
        mask,
        dynStamp,
        this.dynamicScratch,
        (slot, dyn) => {
          const collider = this.dynamic.colliderAt(slot);
          const hit = makeHit();
          hit.point.copy(dyn.point);
          hit.normal.copy(dyn.normal);
          hit.distance = dyn.distance;
          if (collider) {
            hit.object = collider.object;
            hit.surface = collider.surface;
            hit.entityId = collider.entityId >= 0 ? collider.entityId : undefined;
            hit.damageScale = collider.damageScale;
            hit.penetration = collider.penetration;
          }
          results.push(hit);
        },
      );
    }

    results.sort(byDistance);
    return dedupeCoincident(results);
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, ignore?: THREE.Object3D[]): boolean {
    this.world.ensureBuilt();
    _dir.copy(to).sub(from);
    const dist = _dir.length();
    if (dist < 1e-6) return true;
    _dir.multiplyScalar(1 / dist);

    const staticStamp = this.world.beginQuery(ignore);
    if (
      this.world.occluded(
        from.x, from.y, from.z,
        _dir.x, _dir.y, _dir.z,
        dist,
        SIGHT_MASK,
        staticStamp,
      )
    ) {
      return false;
    }
    if (this.dynamic.count > 0) {
      const dynStamp = this.dynamic.beginQuery(ignore);
      if (
        this.dynamic.occluded(
          from.x, from.y, from.z,
          _dir.x, _dir.y, _dir.z,
          dist,
          SIGHT_MASK,
          dynStamp,
          this.dynamicScratch,
        )
      ) {
        return false;
      }
    }
    return true;
  }

  /** Swept sphere against level geometry: grenades, and third-person pull-in. */
  sphereCast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    maxDistance: number,
    mask = ALL_GROUPS,
  ): RaycastHit | null {
    this.world.ensureBuilt();
    const len = direction.length();
    if (len < 1e-9 || maxDistance <= 0) return null;
    const inv = 1 / len;
    const dx = direction.x * inv;
    const dy = direction.y * inv;
    const dz = direction.z * inv;
    const r = Math.max(0.005, radius);

    // Gathering the whole sweep at once would overflow the scratch buffer on a
    // long throw, so the sweep is walked in short segments; each gather then
    // covers a couple of metres and returns a handful of triangles.
    const segment = Math.max(1.5, r * 8);
    let travelled = 0;
    let best = 0;
    let bestTri = -1;
    while (travelled < maxDistance - 1e-6 && bestTri < 0) {
      const span = Math.min(segment, maxDistance - travelled);
      _sphereP.set(
        origin.x + dx * travelled,
        origin.y + dy * travelled,
        origin.z + dz * travelled,
      );
      const ex = dx * span;
      const ey = dy * span;
      const ez = dz * span;
      const minx = _sphereP.x - r + Math.min(0, ex);
      const miny = _sphereP.y - r + Math.min(0, ey);
      const minz = _sphereP.z - r + Math.min(0, ez);
      const maxx = _sphereP.x + r + Math.max(0, ex);
      const maxy = _sphereP.y + r + Math.max(0, ey);
      const maxz = _sphereP.z + r + Math.max(0, ez);
      this.world.gather(minx, miny, minz, maxx, maxy, maxz, mask, NO_IGNORE, this.sweepTris);

      let local = span;
      const bounds = this.sweepTris.bounds;
      for (let i = 0; i < this.sweepTris.count; i++) {
        const bo = i * 6;
        if (
          !aabbOverlap(
            minx, miny, minz, maxx, maxy, maxz,
            bounds[bo], bounds[bo + 1], bounds[bo + 2],
            bounds[bo + 3], bounds[bo + 4], bounds[bo + 5],
          )
        ) {
          continue;
        }
        const t = capsuleTriangleTOI(
          _sphereP, _sphereP, r, dx, dy, dz, local, this.sweepTris.verts, i * 9,
        );
        if (t >= 0 && t <= local) {
          local = t;
          bestTri = i;
        }
      }
      if (bestTri >= 0) best = travelled + local;
      travelled += span;
    }
    if (bestTri < 0) return null;

    const hit = makeHit();
    hit.distance = best;
    _from.set(origin.x + dx * best, origin.y + dy * best, origin.z + dz * best);
    const d = Math.sqrt(
      closestPointsSegmentTriangle(_from, _from, this.sweepTris.verts, bestTri * 9, _origin, hit.point),
    );
    if (d > 1e-6) {
      hit.normal.set(
        (_from.x - hit.point.x) / d,
        (_from.y - hit.point.y) / d,
        (_from.z - hit.point.z) / d,
      );
    } else {
      const no = bestTri * 3;
      hit.normal.set(
        this.sweepTris.normals[no],
        this.sweepTris.normals[no + 1],
        this.sweepTris.normals[no + 2],
      );
    }
    const chunk = this.world.chunkAt(this.sweepTris.chunk[bestTri]);
    hit.object = chunk?.object ?? hit.object;
    hit.surface = chunk?.surface ?? 'concrete';
    hit.penetration = chunk?.penetration;
    hit.damageScale = chunk?.damageScale;
    return hit;
  }

  capsuleCast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    height: number,
    maxDistance: number,
    mask = CHARACTER_MASK,
    ignore?: THREE.Object3D[],
  ): RaycastHit | null {
    this.world.ensureBuilt();
    const len = direction.length();
    if (len < 1e-9 || maxDistance <= 0) return null;
    const inv = 1 / len;
    const stamp = this.world.beginQuery(ignore);
    const t = this.character.cast(
      origin,
      direction.x * inv,
      direction.y * inv,
      direction.z * inv,
      radius,
      height,
      maxDistance,
      mask,
      stamp,
      _capNormal,
    );
    if (t < 0) return null;
    const hit = makeHit();
    hit.distance = t;
    hit.normal.copy(_capNormal);
    hit.point
      .copy(origin)
      .addScaledVector(direction, t * inv)
      .addScaledVector(_capNormal, -radius);
    const chunk = this.world.chunkAt(this.character.lastChunk);
    hit.object = chunk?.object ?? hit.object;
    hit.surface = chunk?.surface ?? 'concrete';
    hit.penetration = chunk?.penetration;
    return hit;
  }

  /* ---------------------------- character ------------------------------ */

  moveCharacter(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    stepHeight = 0.4,
    ignore?: THREE.Object3D[],
  ): CharacterMoveResult {
    const out: CharacterMoveResult = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      grounded: false,
      groundNormal: new THREE.Vector3(0, 1, 0),
      groundSurface: 'concrete',
      hitWall: false,
      slope: 0,
      hitCeiling: false,
      stepUp: 0,
    };
    this.moveCharacterInto(position, velocity, radius, height, dt, out, stepHeight, ignore);
    return out;
  }

  moveCharacterInto(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    out: CharacterMoveResult,
    stepHeight = 0.4,
    ignore?: THREE.Object3D[],
  ): void {
    this.world.ensureBuilt();
    const stamp = this.world.beginQuery(ignore);
    this.character.move(
      position,
      velocity,
      radius,
      height,
      dt,
      stepHeight,
      CHARACTER_MASK,
      stamp,
      this.moveOut,
    );

    const mo = this.moveOut;
    this.lastCharacterPos.copy(mo.position);
    this.lastCharacterRadius = radius;
    this.lastCharacterHeight = height;
    this.hadCharacter = true;

    const chunk = mo.groundChunk >= 0 ? this.world.chunkAt(mo.groundChunk) : undefined;
    out.position.copy(mo.position);
    out.velocity.copy(mo.velocity);
    out.grounded = mo.grounded;
    out.groundNormal.copy(mo.groundNormal);
    out.groundSurface = chunk?.surface ?? 'concrete';
    out.hitWall = mo.hitWall;
    out.slope = mo.slope;
    out.hitCeiling = mo.hitCeiling;
    out.stepUp = mo.stepUp;
  }

  /* ------------------------------ bodies ------------------------------- */

  addBody(desc: BodyDesc): BodyHandle {
    this.world.ensureBuilt();
    return this.bodies.add(desc);
  }

  removeBody(handle: BodyHandle): void {
    this.bodies.remove(handle);
  }

  applyImpulse(handle: BodyHandle, impulse: THREE.Vector3, at?: THREE.Vector3): void {
    this.bodies.applyImpulse(handle, impulse, at);
  }

  applyExplosionForce(center: THREE.Vector3, radius: number, force: number): void {
    this.bodies.wakeInRadius(center, radius);
    this.bodies.applyExplosionForce(center, radius, force);
  }

  get bodyCount(): number {
    return this.bodies.count;
  }

  /** Removes every live body. Used when restarting a match or a test. */
  clearBodies(): void {
    this.bodies.clear();
  }

  /**
   * Visits every live body. The record handed to `fn` is reused, so copy
   * anything that needs to outlive the callback.
   */
  forEachBody(fn: (body: BodyInfo) => void): void {
    this.bodies.forEach(fn);
  }

  get staticTriangles(): number {
    return this.world.triangleCount;
  }

  /* ------------------------------ queries ------------------------------ */

  groundHeight(x: number, z: number, fromY = 400): number | null {
    this.world.ensureBuilt();
    const slot = heightCacheSlot(x, z);
    if (
      this.hcUsed[slot] === 1 &&
      this.hcKeyX[slot] === x &&
      this.hcKeyZ[slot] === z &&
      // The start height is part of the question: a query from the top of a
      // stair and one from a metre below it want different answers.
      this.hcKeyY[slot] === fromY
    ) {
      this.hcHits++;
      const v = this.hcValue[slot];
      return v === NO_GROUND ? null : v;
    }
    this.hcMisses++;

    const hit = this.world.raycast(
      x, fromY, z,
      0, -1, 0,
      fromY + 2000,
      GROUND_MASK,
      NO_IGNORE,
      this.staticHit,
    );
    const y = hit ? this.staticHit.py : NO_GROUND;
    this.hcUsed[slot] = 1;
    this.hcKeyX[slot] = x;
    this.hcKeyZ[slot] = z;
    this.hcKeyY[slot] = fromY;
    this.hcValue[slot] = y;
    return hit ? y : null;
  }

  overlapSphere(center: THREE.Vector3, radius: number, mask = ALL_GROUPS): THREE.Object3D[] {
    this.world.ensureBuilt();
    const out: THREE.Object3D[] = [];
    this.dynamic.overlapSphere(center.x, center.y, center.z, radius, mask, out);

    this.bodies.forEach((body) => {
      if ((body.group & mask) === 0) return;
      if (!body.object) return;
      const reach = radius + Math.max(body.radius, body.half.length());
      if (body.position.distanceToSquared(center) <= reach * reach) out.push(body.object);
    });

    // Breakable statics (windows, props) so a blast can shatter them.
    this.world.gather(
      center.x - radius,
      center.y - radius,
      center.z - radius,
      center.x + radius,
      center.y + radius,
      center.z + radius,
      mask & (Groups.PROP | Groups.GLASS | Groups.WATER),
      NO_IGNORE,
      this.sweepTris,
    );
    if (this.sweepTris.count > 0) {
      const seen = new Set<THREE.Object3D>();
      for (let i = 0; i < this.sweepTris.count; i++) {
        const chunk = this.world.chunkAt(this.sweepTris.chunk[i]);
        if (!chunk || seen.has(chunk.object)) continue;
        seen.add(chunk.object);
        out.push(chunk.object);
      }
    }
    return out;
  }

  /* ------------------------------- debug ------------------------------- */

  /** Snapshot for the performance overlay and the test harness. */
  stats(): Record<string, number> {
    return {
      triangles: this.world.triangleCount,
      colliders: this.world.colliderCount,
      dynamicColliders: this.dynamic.count,
      bodies: this.bodies.count,
      bodiesAwake: this.bodies.awakeCount,
      bodiesAsleep: this.bodies.sleepingCount,
      buildMs: this.world.lastBuildMs,
      stepMs: this.lastStepMs,
      heightCacheHits: this.hcHits,
      heightCacheMisses: this.hcMisses,
    };
  }

  private drawDebug(): void {
    this.debug.begin();
    this.world.forEachChunkBounds((box) => this.debug.addAabb(box), 256);
    this.bodies.forEach((body) => {
      if (body.shape === 1) this.debug.addSphere(body.position, body.radius, body.sleeping);
      else if (body.shape === 2) {
        this.debug.addCapsuleBody(
          body.position, body.radius, body.halfHeight, body.quaternion, body.sleeping,
        );
      } else {
        this.debug.addBox(body.position, body.half, body.quaternion, body.sleeping);
      }
    });
    if (this.hadCharacter) {
      this.debug.addCharacterCapsule(
        this.lastCharacterPos,
        this.lastCharacterRadius,
        this.lastCharacterHeight,
      );
      for (let i = 0; i < this.character.debugContactCount; i++) {
        this.debug.addContact(this.character.debugContacts[i]);
      }
    }
    this.debug.end();
  }

  /**
   * Linear scan over every static triangle, bypassing the BVH. Only the test
   * harness uses this, to prove the tree returns what brute force returns.
   */
  raycastBruteInto(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    out: RaycastHit,
    mask = ALL_GROUPS,
  ): boolean {
    this.world.ensureBuilt();
    const len = direction.length();
    if (len < 1e-9 || maxDistance <= 0) return false;
    const inv = 1 / len;
    if (
      !this.world.bruteRaycast(
        origin.x, origin.y, origin.z,
        direction.x * inv, direction.y * inv, direction.z * inv,
        maxDistance,
        mask,
        this.staticHit,
      )
    ) {
      return false;
    }
    this.fillStaticHit(this.staticHit, out);
    return true;
  }

  /** Exposed so the playground and tests can drive the solver directly. */
  stepBodies(dt: number): void {
    this.world.ensureBuilt();
    this.bodies.step(dt);
    this.bodies.writeTransforms(1);
  }

  get debugEnabled(): boolean {
    return this.debug.enabled;
  }

  setDebugEnabled(on: boolean): void {
    this.debug.setEnabled(on);
    if (!on) return;
    this.drawDebug();
  }
}

const NO_GROUND = -99999;
const _dummy = new THREE.Object3D();

function makeHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: _dummy,
    surface: 'concrete' as SurfaceKind,
    entityId: undefined,
    damageScale: 1,
    penetration: 0.25,
  };
}

function byDistance(a: RaycastHit, b: RaycastHit): number {
  return a.distance - b.distance;
}

/**
 * Collapses hits that are the same surface at the same distance. A ray that
 * crosses the shared edge of a triangle pair genuinely intersects both, but
 * penetration maths would then charge the caller twice for one wall.
 */
function dedupeCoincident(hits: RaycastHit[]): RaycastHit[] {
  if (hits.length < 2) return hits;
  let write = 1;
  for (let i = 1; i < hits.length; i++) {
    const hit = hits[i];
    const prev = hits[write - 1];
    if (hit.distance - prev.distance < 1e-4 && hit.normal.dot(prev.normal) > 0.999) continue;
    hits[write++] = hit;
  }
  hits.length = write;
  return hits;
}

/** Hash of the exact query coordinates; collisions simply miss the cache. */
function heightCacheSlot(x: number, z: number): number {
  let h = Math.imul(Math.round(x * 4096) | 0, 0x27d4eb2d);
  h ^= Math.imul(Math.round(z * 4096) | 0, 0x165667b1);
  h ^= h >>> 15;
  return (h >>> 0) & (HEIGHT_CACHE_SIZE - 1);
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
