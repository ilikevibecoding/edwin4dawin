import * as THREE from 'three';
import {
  MeshBVH,
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
  type MeshBVHOptions,
} from 'three-mesh-bvh';
import type { EngineContext, System } from '../core/System';
import type { SurfaceKind } from '../core/Signals';
import { TUNING } from '../core/Config';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export interface TraceHit {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  surface: SurfaceKind;
  object: THREE.Object3D | null;
  /** Set when the trace hit a registered actor hitbox rather than the world. */
  actorId?: number;
  region?: 'head' | 'chest' | 'stomach' | 'arm' | 'leg';
}

export interface Hitbox {
  actorId: number;
  region: 'head' | 'chest' | 'stomach' | 'arm' | 'leg';
  /** Local-space capsule; transformed by `matrix` each query. */
  radius: number;
  height: number;
  object: THREE.Object3D;
  damageScale: number;
  /** Set false while the actor is dead/ragdolled. */
  active: boolean;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _tri = new THREE.Triangle();
const _sphere = new THREE.Sphere();

/**
 * Collision and queries.
 *
 * Static world geometry is merged into a small number of BVH-accelerated
 * meshes, which is what makes 120 Hz character sweeps and hitscan traces
 * affordable. Actors are represented by capsule hitboxes rather than by their
 * render meshes: skinned-mesh raycasts are far too slow to run per bullet, and
 * capsules give the forgiving, predictable hit registration that a shooter
 * needs.
 */
export class PhysicsSystem implements System {
  readonly name = 'physics';
  readonly order = -100;

  /** BVH colliders for the static world. */
  private colliders: Array<{ mesh: THREE.Mesh; bvh: MeshBVH; surface: SurfaceKind }> = [];
  private readonly hitboxes = new Map<number, Hitbox[]>();
  private ctx!: EngineContext;

  /** Simple gravity-affected bodies: shells, debris, grenades. */
  private readonly bodies: RigidBody[] = [];

  init(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  // ------------------------------------------------------------ colliders --

  /**
   * Registers a mesh as static world collision. The mesh does not have to be
   * in the scene graph — invisible simplified proxies are preferred for
   * anything with heavy render geometry.
   */
  addCollider(mesh: THREE.Mesh, surface: SurfaceKind = 'concrete', opts?: MeshBVHOptions): void {
    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry;
    if (!geo.boundsTree) {
      geo.computeBoundsTree({ maxLeafTris: 8, ...opts });
    }
    this.colliders.push({ mesh, bvh: geo.boundsTree as MeshBVH, surface });
  }

  clearColliders(): void {
    for (const c of this.colliders) c.mesh.geometry.disposeBoundsTree?.();
    this.colliders.length = 0;
  }

  registerHitboxes(actorId: number, boxes: Hitbox[]): void {
    this.hitboxes.set(actorId, boxes);
  }

  unregisterHitboxes(actorId: number): void {
    this.hitboxes.delete(actorId);
  }

  setActorActive(actorId: number, active: boolean): void {
    const boxes = this.hitboxes.get(actorId);
    if (boxes) for (const b of boxes) b.active = active;
  }

  // ---------------------------------------------------------------- trace --

  /**
   * Hitscan against the world and all actor hitboxes.
   * `ignoreActor` skips the shooter's own capsules.
   */
  trace(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    ignoreActor = -1,
  ): TraceHit {
    const result: TraceHit = {
      hit: false,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      distance: maxDistance,
      surface: 'concrete',
      object: null,
    };

    _ray.origin.copy(origin);
    _ray.direction.copy(direction).normalize();

    let best = maxDistance;

    for (const c of this.colliders) {
      _mat.copy(c.mesh.matrixWorld).invert();
      const localRay = _ray.clone().applyMatrix4(_mat);
      const hit = c.bvh.raycastFirst(localRay, THREE.FrontSide);
      if (hit && hit.distance < best) {
        best = hit.distance;
        result.hit = true;
        result.distance = hit.distance;
        result.point.copy(hit.point).applyMatrix4(c.mesh.matrixWorld);
        if (hit.face) {
          result.normal
            .copy(hit.face.normal)
            .transformDirection(c.mesh.matrixWorld)
            .normalize();
        }
        result.object = c.mesh;
        result.surface = c.surface;
        result.actorId = undefined;
        result.region = undefined;
      }
    }

    // Actor capsules. Tested after the world so a body behind a wall cannot
    // be hit, but before returning so a body in front of a wall wins.
    for (const [actorId, boxes] of this.hitboxes) {
      if (actorId === ignoreActor) continue;
      for (const box of boxes) {
        if (!box.active) continue;
        const d = this.rayCapsule(_ray, box, best);
        if (d !== null && d < best) {
          best = d;
          result.hit = true;
          result.distance = d;
          result.point.copy(_ray.origin).addScaledVector(_ray.direction, d);
          box.object.getWorldPosition(_v1);
          result.normal.copy(result.point).sub(_v1).normalize();
          result.object = box.object;
          result.surface = 'flesh';
          result.actorId = actorId;
          result.region = box.region;
        }
      }
    }

    return result;
  }

  /** Ray vs vertical capsule in world space. Returns entry distance or null. */
  private rayCapsule(ray: THREE.Ray, box: Hitbox, maxDist: number): number | null {
    box.object.getWorldPosition(_v1);
    const bottom = _v2.copy(_v1);
    const top = _v3.copy(_v1);
    top.y += box.height;

    // Broad phase: bounding sphere.
    _sphere.center.copy(_v1);
    _sphere.center.y += box.height * 0.5;
    _sphere.radius = box.height * 0.5 + box.radius;
    if (!ray.intersectsSphere(_sphere)) return null;

    // Segment/segment closest approach, then compare against the radius.
    const ba = _v4.copy(top).sub(bottom);
    const oa = _v1.copy(ray.origin).sub(bottom);
    const baba = ba.dot(ba);
    const bard = ba.dot(ray.direction);
    const baoa = ba.dot(oa);
    const rdoa = ray.direction.dot(oa);
    const oaoa = oa.dot(oa);

    const a = baba - bard * bard;
    const b = baba * rdoa - baoa * bard;
    const c = baba * oaoa - baoa * baoa - box.radius * box.radius * baba;

    let h = b * b - a * c;
    if (h >= 0 && Math.abs(a) > 1e-8) {
      const t = (-b - Math.sqrt(h)) / a;
      const y = baoa + t * bard;
      if (y > 0 && y < baba && t > 0 && t < maxDist) return t;
    }

    // Cap spheres.
    const capTest = (center: THREE.Vector3): number | null => {
      const oc = _v1.copy(ray.origin).sub(center);
      const bb = oc.dot(ray.direction);
      const cc = oc.dot(oc) - box.radius * box.radius;
      const hh = bb * bb - cc;
      if (hh < 0) return null;
      const t = -bb - Math.sqrt(hh);
      return t > 0 && t < maxDist ? t : null;
    };
    const t1 = capTest(bottom);
    const t2 = capTest(top);
    if (t1 !== null && t2 !== null) return Math.min(t1, t2);
    return t1 ?? t2;
  }

  /** True when nothing blocks the straight line between two points. */
  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    _v1.copy(to).sub(from);
    const dist = _v1.length();
    if (dist < 1e-4) return true;
    _v1.divideScalar(dist);
    _ray.origin.copy(from);
    _ray.direction.copy(_v1);

    for (const c of this.colliders) {
      _mat.copy(c.mesh.matrixWorld).invert();
      const localRay = _ray.clone().applyMatrix4(_mat);
      const hit = c.bvh.raycastFirst(localRay, THREE.FrontSide);
      if (hit && hit.distance < dist - 0.05) return false;
    }
    return true;
  }

  /**
   * Resolves a capsule against the world with iterative depenetration.
   * Returns the corrected position and reports whether the capsule is
   * standing on something walkable.
   */
  resolveCapsule(
    position: THREE.Vector3,
    radius: number,
    height: number,
    out: { grounded: boolean; groundNormal: THREE.Vector3; surface: SurfaceKind; hitWall: boolean },
  ): THREE.Vector3 {
    out.grounded = false;
    out.hitWall = false;
    out.groundNormal.set(0, 1, 0);

    const segBottom = new THREE.Vector3(position.x, position.y + radius, position.z);
    const segTop = new THREE.Vector3(position.x, position.y + height - radius, position.z);

    const maxSlopeCos = Math.cos(THREE.MathUtils.degToRad(TUNING.maxSlopeDeg));

    for (let iter = 0; iter < 4; iter++) {
      let anyHit = false;

      for (const c of this.colliders) {
        _mat.copy(c.mesh.matrixWorld).invert();
        const localBottom = segBottom.clone().applyMatrix4(_mat);
        const localTop = segTop.clone().applyMatrix4(_mat);

        _box.makeEmpty();
        _box.expandByPoint(localBottom);
        _box.expandByPoint(localTop);
        _box.min.addScalar(-radius);
        _box.max.addScalar(radius);

        c.bvh.shapecast({
          intersectsBounds: (bounds) => bounds.intersectsBox(_box),
          intersectsTriangle: (tri) => {
            _tri.copy(tri as unknown as THREE.Triangle);
            const closest = closestPointSegmentTriangle(localBottom, localTop, _tri, _v1, _v2);
            const delta = _v3.copy(_v2).sub(_v1);
            const dist = delta.length();
            if (dist >= radius || dist < 1e-7) return false;

            const depth = radius - dist;
            const normal = delta.divideScalar(dist).negate();
            // World-space normal.
            const worldNormal = _v4.copy(normal).transformDirection(c.mesh.matrixWorld).normalize();

            if (worldNormal.y > maxSlopeCos) {
              out.grounded = true;
              out.groundNormal.copy(worldNormal);
              out.surface = c.surface;
            } else if (worldNormal.y < 0.4) {
              out.hitWall = true;
            }

            const push = worldNormal.clone().multiplyScalar(depth);
            segBottom.add(push);
            segTop.add(push);
            anyHit = true;
            return false;
          },
        });
      }

      if (!anyHit) break;
    }

    position.set(segBottom.x, segBottom.y - radius, segBottom.z);
    return position;
  }

  /** Downward probe used for step-down, ground snapping, and footstep audio. */
  groundProbe(position: THREE.Vector3, maxDrop: number): TraceHit {
    return this.trace(
      _v1.copy(position).setY(position.y + 0.2),
      _v2.set(0, -1, 0),
      maxDrop + 0.2,
    );
  }

  // ----------------------------------------------------------- rigidbody ---

  addBody(body: RigidBody): void {
    this.bodies.push(body);
  }

  removeBody(body: RigidBody): void {
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  fixedUpdate(dt: number): void {
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      b.step(dt, this);
      if (b.dead) this.bodies.splice(i, 1);
    }
  }

  get bodyCount(): number {
    return this.bodies.length;
  }

  dispose(): void {
    this.clearColliders();
    this.hitboxes.clear();
    this.bodies.length = 0;
  }
}

/**
 * Minimal sphere-swept rigid body with restitution and friction.
 * Used for shell casings, gibs, grenades, and debris — anything that needs to
 * tumble convincingly for a couple of seconds and then go to sleep.
 */
export class RigidBody {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly angularVelocity = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  radius = 0.03;
  restitution = 0.34;
  friction = 0.62;
  gravity = TUNING.gravity;
  drag = 0.02;
  dead = false;
  ttl = 8;
  sleeping = false;
  onBounce: ((speed: number, normal: THREE.Vector3, surface: SurfaceKind) => void) | null = null;
  onRest: (() => void) | null = null;

  private sleepTimer = 0;
  private readonly _q = new THREE.Quaternion();

  step(dt: number, physics: PhysicsSystem): void {
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      return;
    }
    if (this.sleeping) return;

    this.velocity.y -= this.gravity * dt;
    this.velocity.multiplyScalar(Math.max(0, 1 - this.drag * dt));

    const step = _v1.copy(this.velocity).multiplyScalar(dt);
    const dist = step.length();

    if (dist > 1e-6) {
      const dir = _v2.copy(step).divideScalar(dist);
      const hit = physics.trace(this.position, dir, dist + this.radius);
      if (hit.hit && hit.distance <= dist + this.radius) {
        const travel = Math.max(0, hit.distance - this.radius);
        this.position.addScaledVector(dir, travel);

        const vn = this.velocity.dot(hit.normal);
        const normalComponent = _v3.copy(hit.normal).multiplyScalar(vn);
        const tangent = _v4.copy(this.velocity).sub(normalComponent);

        const impactSpeed = Math.abs(vn);
        this.velocity.copy(tangent).multiplyScalar(1 - this.friction);
        this.velocity.addScaledVector(hit.normal, -vn * this.restitution);

        // Tumble proportional to the tangential slide.
        this.angularVelocity.addScaledVector(
          _v3.copy(hit.normal).cross(tangent),
          6,
        );

        if (impactSpeed > 0.4) this.onBounce?.(impactSpeed, hit.normal, hit.surface);

        if (this.velocity.lengthSq() < 0.12) {
          this.sleepTimer += dt;
          if (this.sleepTimer > 0.25) {
            this.sleeping = true;
            this.velocity.setScalar(0);
            this.angularVelocity.setScalar(0);
            this.onRest?.();
          }
        } else {
          this.sleepTimer = 0;
        }
      } else {
        this.position.add(step);
      }
    }

    const av = this.angularVelocity;
    const avLen = av.length();
    if (avLen > 1e-4) {
      this._q.setFromAxisAngle(_v1.copy(av).divideScalar(avLen), avLen * dt);
      this.quaternion.premultiply(this._q);
      this.angularVelocity.multiplyScalar(Math.max(0, 1 - 1.4 * dt));
    }
  }
}

/** Closest points between a segment and a triangle. */
function closestPointSegmentTriangle(
  a: THREE.Vector3,
  b: THREE.Vector3,
  tri: THREE.Triangle,
  outSeg: THREE.Vector3,
  outTri: THREE.Vector3,
): void {
  // Sample the segment; 5 samples is plenty for capsule-vs-triangle at the
  // scales involved and avoids a full analytic solve per triangle.
  let bestDist = Infinity;
  const tmpTri = new THREE.Vector3();
  const tmpSeg = new THREE.Vector3();
  const SAMPLES = 5;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    tmpSeg.lerpVectors(a, b, t);
    tri.closestPointToPoint(tmpSeg, tmpTri);
    const d = tmpSeg.distanceToSquared(tmpTri);
    if (d < bestDist) {
      bestDist = d;
      outSeg.copy(tmpSeg);
      outTri.copy(tmpTri);
    }
  }

  // One Newton-style refinement around the best sample.
  const refine = 1 / (SAMPLES * 2);
  const center = a.distanceTo(b) > 1e-5 ? outSeg.clone() : a.clone();
  for (const s of [-refine, refine]) {
    tmpSeg.copy(center).lerp(b, s).lerp(a, 0);
    tmpSeg.copy(center).addScaledVector(_v1.copy(b).sub(a), s);
    tri.closestPointToPoint(tmpSeg, tmpTri);
    const d = tmpSeg.distanceToSquared(tmpTri);
    if (d < bestDist) {
      bestDist = d;
      outSeg.copy(tmpSeg);
      outTri.copy(tmpTri);
    }
  }
}
