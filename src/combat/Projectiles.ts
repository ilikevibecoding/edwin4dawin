/**
 * Shared projectile tracing.
 *
 * The weapon module owns grenade and rocket *spawning* — the fuse, the bounce
 * damping and the models are all game feel that belongs next to the weapons — and
 * it already sub-steps its own flight with `physics.spherecast`. This file is not
 * a second copy of that. It is the trace and the impact resolution that anything
 * else with a `muzzleVelocity` can borrow: AI-launched rockets, killstreak
 * bomblets, thrown ordnance spawned by scripting, barrel debris.
 *
 * Two guarantees it makes that a naive per-frame position update does not:
 *
 *  - Nothing tunnels. The step between two positions is swept, and the sweep is
 *    subdivided so no single sub-step is longer than the projectile is wide, which
 *    is what stops a 90 m/s rocket from teleporting through a 10 cm wall at 30 fps.
 *  - Impacts land in the same place bullets do, so a rocket chipping concrete and
 *    a rifle round chipping concrete produce the same decal, the same destruction
 *    and the same sound.
 */
import * as THREE from 'three';
import type { PhysicsRaycastHit, RaycastOptions } from '../core/Contracts';
import { COLLISION_GROUP, type Damageable, type SurfaceType } from '../core/GameTypes';
import { clamp } from '../core/MathUtils';
import { BULLET_GROUPS, type BulletTracer } from './Ballistics';
import type { CombatDeps } from './Deps';
import type { DamageRegistry } from './DamageSystem';
import { partFromPoint } from './Hitboxes';

/** Metres per second squared. Matches the projectile feel in the weapon module. */
export const PROJECTILE_GRAVITY = -19.6;

const PROJECTILE_GROUPS = BULLET_GROUPS | COLLISION_GROUP.DEBRIS;
/** Sub-steps are capped so a long frame cannot turn into a hundred sweeps. */
const MAX_SUBSTEPS = 8;

export interface ProjectileTraceOptions {
  /** Position at the start of the step; advanced in place on return. */
  position: THREE.Vector3;
  /** Velocity in m/s; gravity is integrated into it. */
  velocity: THREE.Vector3;
  dt: number;
  /** Collision radius; 0 for a point trace. */
  radius: number;
  /** 1 for a thrown object, ~0.18 for a rocket motor that beats gravity. */
  gravityScale: number;
  /** Ignored by the sweep, normally the launcher. */
  owner: Damageable | null;
}

export interface ProjectileHit {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  surface: SurfaceType;
  /** Damageable struck, when the sweep landed on a character. */
  target: Damageable | null;
  /** Distance travelled before the hit. */
  travelled: number;
  /** Impact speed, for choosing between a bounce and a detonation. */
  speed: number;
}

export interface ProjectileImpactOptions {
  /** Direct-hit damage, applied to `hit.target` when there is one. */
  directDamage: number;
  impulse: number;
  destruction: number;
  source: Damageable | null;
  weaponId: string;
}

export class ProjectileTracer {
  private readonly dir = new THREE.Vector3();
  private readonly travel = new THREE.Vector3();
  private readonly step = new THREE.Vector3();
  private readonly probe = new THREE.Vector3();
  private readonly rayOptions: RaycastOptions = {
    maxDistance: 1,
    groups: PROJECTILE_GROUPS,
    exclude: [null as unknown],
    includeSensors: false,
  };
  private readonly result: ProjectileHit = {
    hit: false,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    surface: 'concrete',
    target: null,
    travelled: 0,
    speed: 0,
  };

  constructor(
    private readonly deps: CombatDeps,
    private readonly registry: DamageRegistry,
    private readonly tracer: BulletTracer,
  ) {}

  /**
   * Integrates one frame of a gravity-affected arc, sweeping as it goes.
   *
   * `position` and `velocity` are advanced in place: on a miss they end the frame
   * where the arc took them, on a hit they stop at the contact point with the
   * incoming velocity intact so the caller can bounce, stick or detonate.
   */
  trace(options: ProjectileTraceOptions): ProjectileHit {
    const result = this.result;
    result.hit = false;
    result.target = null;
    result.travelled = 0;
    result.speed = 0;

    const physics = this.deps.physics;
    const dt = Math.max(0, options.dt);
    if (dt <= 0) return result;

    options.velocity.y += PROJECTILE_GRAVITY * options.gravityScale * dt;
    const speed = options.velocity.length();
    result.speed = speed;
    if (speed < 1e-5) return result;

    const distance = speed * dt;
    this.dir.copy(options.velocity).divideScalar(speed);

    if (!physics || !physics.ready) {
      options.position.addScaledVector(this.dir, distance);
      result.travelled = distance;
      return result;
    }

    // One sub-step must never be longer than the projectile is wide, or a thin
    // wall can sit entirely inside a single sweep.
    const stride = Math.max(0.08, options.radius * 1.6);
    const substeps = clamp(Math.ceil(distance / stride), 1, MAX_SUBSTEPS);
    const perStep = distance / substeps;
    const rayOptions = this.rayOptions;
    (rayOptions.exclude as unknown[])[0] = options.owner;

    let travelled = 0;
    for (let i = 0; i < substeps; i++) {
      rayOptions.maxDistance = perStep;
      this.tracer.countRay();
      const hit: PhysicsRaycastHit | null =
        options.radius > 0.001
          ? physics.spherecast(options.position, this.dir, options.radius, rayOptions)
          : physics.raycast(options.position, this.dir, rayOptions);

      if (hit) {
        const advance = Math.max(0, hit.distance - 0.002);
        options.position.addScaledVector(this.dir, advance);
        result.hit = true;
        result.point.copy(hit.point);
        result.normal.copy(hit.normal);
        result.surface = hit.surface;
        result.target = hit.userData?.entity ?? null;
        result.travelled = travelled + advance;
        return result;
      }

      options.position.addScaledVector(this.dir, perStep);
      travelled += perStep;
    }
    result.travelled = travelled;
    return result;
  }

  /**
   * Feeds a projectile contact into the same impact path bullets use, and applies
   * direct-hit damage when the thing struck can take it. Explosive ordnance should
   * call `combat.explode` on top of this, not instead of it.
   */
  resolveImpact(hit: ProjectileHit, options: ProjectileImpactOptions): void {
    if (!hit.hit) return;
    this.dir.copy(hit.normal).negate();
    const organic = hit.surface === 'flesh' || hit.target !== null;

    this.tracer.impacts.resolve(hit.point, hit.normal, this.dir, hit.surface, {
      energy: clamp(hit.speed / 60, 0.2, 1),
      impulse: options.impulse,
      destruction: options.destruction,
      organic,
      userData: null,
      silent: false,
    });

    const target = hit.target;
    if (!target || options.directDamage <= 0) return;
    const record = this.registry.ensure(target);
    // `this.dir` currently points back out along the surface normal; the round was
    // travelling the other way.
    const part = partFromPoint(
      record.profile,
      record.position,
      hit.point,
      this.travel.copy(this.dir).negate(),
    );
    const info = this.tracer.nextInfo();
    info.amount = options.directDamage;
    info.source = options.source;
    info.point.copy(hit.point);
    info.direction.copy(this.dir).negate();
    info.bodyPart = part;
    info.type = 'collision';
    info.impulse = options.impulse;
    info.weaponId = options.weaponId;
    info.distance = hit.travelled;
    info.isHeadshot = false;
    info.isPenetrating = false;
    this.registry.applyDamage(target, info);
  }

  /**
   * Where an arc launched from `origin` at `velocity` will be after `time`, with no
   * collision. Used by the AI to lead a launcher shot and by the HUD to draw a
   * throw arc; cheap enough to call in a loop.
   */
  predict(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    gravityScale: number,
    time: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    const drop = 0.5 * PROJECTILE_GRAVITY * gravityScale * time * time;
    return out.set(
      origin.x + velocity.x * time,
      origin.y + velocity.y * time + drop,
      origin.z + velocity.z * time,
    );
  }

  /**
   * First contact of a ballistic arc, walked forward in fixed slices. Returns the
   * time of impact in seconds, or -1 when the arc is clear for `maxTime`. Does not
   * touch the caller's vectors.
   */
  sweepArc(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    gravityScale: number,
    radius: number,
    maxTime: number,
    slice: number,
    owner: Damageable | null,
    out: ProjectileHit,
  ): number {
    const physics = this.deps.physics;
    out.hit = false;
    out.target = null;
    out.travelled = 0;
    if (!physics || !physics.ready) return -1;

    const rayOptions = this.rayOptions;
    (rayOptions.exclude as unknown[])[0] = owner;
    this.probe.copy(origin);
    const dt = Math.max(0.01, slice);
    let travelled = 0;

    for (let time = 0; time < maxTime; time += dt) {
      this.predict(origin, velocity, gravityScale, time + dt, this.step);
      this.dir.copy(this.step).sub(this.probe);
      const length = this.dir.length();
      if (length < 1e-6) continue;
      this.dir.divideScalar(length);
      rayOptions.maxDistance = length;
      this.tracer.countRay();
      const hit =
        radius > 0.001
          ? physics.spherecast(this.probe, this.dir, radius, rayOptions)
          : physics.raycast(this.probe, this.dir, rayOptions);
      if (hit) {
        out.hit = true;
        out.point.copy(hit.point);
        out.normal.copy(hit.normal);
        out.surface = hit.surface;
        out.target = hit.userData?.entity ?? null;
        out.travelled = travelled + hit.distance;
        out.speed = length / dt;
        return time + dt * (hit.distance / length);
      }
      travelled += length;
      this.probe.copy(this.step);
    }
    return -1;
  }

  /** A fresh result record, for callers that need to keep one around. */
  static createHit(): ProjectileHit {
    return {
      hit: false,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
      surface: 'concrete',
      target: null,
      travelled: 0,
      speed: 0,
    };
  }
}
