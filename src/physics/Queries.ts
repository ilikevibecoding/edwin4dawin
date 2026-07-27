/**
 * Scene queries.
 *
 * Every method here runs dozens to hundreds of times per frame — bullets,
 * grenade sweeps, AI line of sight, viewmodel wall-avoidance, light occlusion.
 * They therefore allocate nothing per call: the ray, the cast shapes, the
 * exclusion set and the returned hit records are all reused. Hit records come
 * from a small ring so a caller can hold a couple of results at once (comparing
 * two casts, for instance) without them aliasing.
 */
import * as THREE from 'three';
import type { Ball, Collider, Ray, Shape, World } from '@dimforge/rapier3d-compat';
import { RAPIER } from './Rapier';
import type { PhysicsRaycastHit, PhysicsUserData, RaycastOptions } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import type { ColliderRegistry } from './Registry';
import { DEFAULT_QUERY_MASK, DEFAULT_SIGHT_MASK, queryGroups } from './Groups';
import { IDENTITY_ROT } from './StaticGeometry';

const HIT_RING = 16;
const DEFAULT_MAX_DISTANCE = 1000;
const DEFAULT_SURFACE: SurfaceType = 'concrete';

interface MutableHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  userData: PhysicsUserData | null;
  surface: SurfaceType;
}

export class QueryEngine {
  /** Number of queries issued since the last reset; surfaced in the stats block. */
  count = 0;

  private readonly ray: Ray;
  private readonly ball: Ball;
  private readonly shapePos = { x: 0, y: 0, z: 0 };
  private readonly shapeVel = { x: 0, y: 0, z: 0 };
  private readonly excluded = new Set<unknown>();
  private readonly hits: MutableHit[] = [];
  private hitCursor = 0;

  private readonly predicate = (collider: Collider): boolean => this.accept(collider);

  constructor(
    private readonly world: World,
    private readonly registry: ColliderRegistry,
  ) {
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    this.ball = new RAPIER.Ball(0.25);
    for (let i = 0; i < HIT_RING; i++) {
      this.hits.push({
        point: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 1, 0),
        distance: 0,
        userData: null,
        surface: DEFAULT_SURFACE,
      });
    }
  }

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null {
    const len = Math.hypot(direction.x, direction.y, direction.z);
    if (len < 1e-9) return null;
    const inv = 1 / len;
    const dx = direction.x * inv;
    const dy = direction.y * inv;
    const dz = direction.z * inv;

    const ray = this.ray;
    ray.origin.x = origin.x;
    ray.origin.y = origin.y;
    ray.origin.z = origin.z;
    ray.dir.x = dx;
    ray.dir.y = dy;
    ray.dir.z = dz;

    const maxDistance = options?.maxDistance ?? DEFAULT_MAX_DISTANCE;
    const filter = this.beginFilter(options);
    this.count++;

    const hit = this.world.castRayAndGetNormal(
      ray,
      maxDistance,
      true,
      this.flags(options),
      queryGroups(options?.groups ?? DEFAULT_QUERY_MASK),
      undefined,
      undefined,
      filter,
    );
    this.endFilter();
    if (!hit) return null;

    const out = this.nextHit();
    const t = hit.timeOfImpact;
    out.distance = t;
    out.point.set(origin.x + dx * t, origin.y + dy * t, origin.z + dz * t);
    // A ray that starts inside a solid reports a zero normal; facing it back at
    // the shooter is the only sane answer and keeps impact FX from exploding.
    const n = hit.normal;
    if (n.x * n.x + n.y * n.y + n.z * n.z < 1e-8) out.normal.set(-dx, -dy, -dz);
    else out.normal.set(n.x, n.y, n.z);
    this.fill(out, hit.collider);
    return out;
  }

  spherecast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    options?: RaycastOptions,
  ): PhysicsRaycastHit | null {
    const len = Math.hypot(direction.x, direction.y, direction.z);
    if (len < 1e-9) return null;
    const inv = 1 / len;
    const dx = direction.x * inv;
    const dy = direction.y * inv;
    const dz = direction.z * inv;

    this.shapePos.x = origin.x;
    this.shapePos.y = origin.y;
    this.shapePos.z = origin.z;
    this.shapeVel.x = dx;
    this.shapeVel.y = dy;
    this.shapeVel.z = dz;
    this.ball.radius = Math.max(1e-3, radius);

    const maxDistance = options?.maxDistance ?? DEFAULT_MAX_DISTANCE;
    const filter = this.beginFilter(options);
    this.count++;

    // stopAtPenetration = false: a grenade that already clips a wall should be
    // allowed to keep travelling out of it rather than freezing at distance 0.
    const hit = this.world.castShape(
      this.shapePos,
      IDENTITY_ROT,
      this.shapeVel,
      this.ball,
      0,
      maxDistance,
      false,
      this.flags(options),
      queryGroups(options?.groups ?? DEFAULT_QUERY_MASK),
      undefined,
      undefined,
      filter,
    );
    this.endFilter();
    if (!hit) return null;

    const out = this.nextHit();
    out.distance = hit.time_of_impact;
    const w = hit.witness1;
    out.point.set(w.x, w.y, w.z);
    const n = hit.normal1;
    if (n.x * n.x + n.y * n.y + n.z * n.z < 1e-8) out.normal.set(-dx, -dy, -dz);
    else out.normal.set(n.x, n.y, n.z);
    this.fill(out, hit.collider);
    return out;
  }

  /** Boolean visibility test. Cheapest path: no normal, no hit record. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3, groups?: number): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return true;
    const inv = 1 / len;

    const ray = this.ray;
    ray.origin.x = from.x;
    ray.origin.y = from.y;
    ray.origin.z = from.z;
    ray.dir.x = dx * inv;
    ray.dir.y = dy * inv;
    ray.dir.z = dz * inv;
    this.count++;

    return (
      this.world.castRay(
        ray,
        len,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        queryGroups(groups ?? DEFAULT_SIGHT_MASK),
      ) === null
    );
  }

  /** Shape cast used by the character controller's stand-up check. */
  castShapeUp(
    x: number,
    y: number,
    z: number,
    shape: Shape,
    distance: number,
    groups: number,
    excludeCollider: Collider | undefined,
  ): boolean {
    if (distance <= 1e-4) return false;
    this.shapePos.x = x;
    this.shapePos.y = y;
    this.shapePos.z = z;
    this.shapeVel.x = 0;
    this.shapeVel.y = 1;
    this.shapeVel.z = 0;
    this.count++;
    return (
      this.world.castShape(
        this.shapePos,
        IDENTITY_ROT,
        this.shapeVel,
        shape,
        0,
        distance,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        groups,
        excludeCollider,
      ) !== null
    );
  }

  /**
   * Height of the first surface below the given point, or NaN when there is
   * nothing within `distance`. Drives the character's step-up probe.
   */
  surfaceBelow(
    x: number,
    y: number,
    z: number,
    distance: number,
    groups: number,
    excludeCollider: Collider | undefined,
    outNormal: THREE.Vector3,
  ): number {
    const ray = this.ray;
    ray.origin.x = x;
    ray.origin.y = y;
    ray.origin.z = z;
    ray.dir.x = 0;
    ray.dir.y = -1;
    ray.dir.z = 0;
    this.count++;
    const hit = this.world.castRayAndGetNormal(
      ray,
      distance,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      groups,
      excludeCollider,
    );
    if (!hit) return NaN;
    const n = hit.normal;
    if (n.x * n.x + n.y * n.y + n.z * n.z > 1e-8) outNormal.set(n.x, n.y, n.z);
    else outNormal.set(0, 1, 0);
    return y - hit.timeOfImpact;
  }

  /** True when `shape` can be placed at the given point without touching anything. */
  shapeFits(
    x: number,
    y: number,
    z: number,
    shape: Shape,
    groups: number,
    excludeCollider: Collider | undefined,
  ): boolean {
    this.shapePos.x = x;
    this.shapePos.y = y;
    this.shapePos.z = z;
    this.count++;
    return (
      this.world.intersectionWithShape(
        this.shapePos,
        IDENTITY_ROT,
        shape,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        groups,
        excludeCollider,
      ) === null
    );
  }

  /** Downward probe used to resolve the ground surface under a character. */
  groundProbe(
    x: number,
    y: number,
    z: number,
    distance: number,
    groups: number,
    excludeCollider: Collider | undefined,
    outNormal: THREE.Vector3,
  ): SurfaceType | null {
    const ray = this.ray;
    ray.origin.x = x;
    ray.origin.y = y;
    ray.origin.z = z;
    ray.dir.x = 0;
    ray.dir.y = -1;
    ray.dir.z = 0;
    this.count++;
    const hit = this.world.castRayAndGetNormal(
      ray,
      distance,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      groups,
      excludeCollider,
    );
    if (!hit) return null;
    const n = hit.normal;
    if (n.y > 0.1) outNormal.set(n.x, n.y, n.z);
    return this.registry.surfaceOf(hit.collider.handle);
  }

  private flags(options: RaycastOptions | undefined): number {
    return options?.includeSensors ? 0 : RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
  }

  private beginFilter(
    options: RaycastOptions | undefined,
  ): ((collider: Collider) => boolean) | undefined {
    const exclude = options?.exclude;
    if (!exclude || exclude.length === 0) return undefined;
    const set = this.excluded;
    set.clear();
    for (let i = 0; i < exclude.length; i++) {
      const e = exclude[i];
      if (e !== null && e !== undefined) set.add(e);
    }
    return set.size > 0 ? this.predicate : undefined;
  }

  private endFilter(): void {
    if (this.excluded.size > 0) this.excluded.clear();
  }

  /**
   * `exclude` is typed as `unknown[]`, so accept anything a caller plausibly has
   * to hand: the Object3D, the Damageable, the handle we returned, or the exact
   * user-data record.
   */
  private accept(collider: Collider): boolean {
    const set = this.excluded;
    if (set.has(collider)) return false;
    const record = this.registry.get(collider.handle);
    if (!record) return true;
    if (record.userData !== null && set.has(record.userData)) return false;
    if (record.owner !== null && set.has(record.owner)) return false;
    const ud = record.userData;
    if (ud) {
      if (ud.object3D && set.has(ud.object3D)) return false;
      if (ud.entity && set.has(ud.entity)) return false;
    }
    return true;
  }

  private fill(out: MutableHit, collider: Collider): void {
    const record = this.registry.get(collider.handle);
    out.userData = record?.userData ?? null;
    out.surface = record?.surface ?? DEFAULT_SURFACE;
  }

  private nextHit(): MutableHit {
    const hit = this.hits[this.hitCursor];
    this.hitCursor = (this.hitCursor + 1) % HIT_RING;
    return hit;
  }
}
