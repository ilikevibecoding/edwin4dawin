/**
 * The combat system.
 *
 * Connective tissue: every shot fired and every point of damage dealt passes
 * through here on its way from the thing that caused it to the thing that felt it.
 * The work is split so each half can be reasoned about on its own —
 *
 *   `Ballistics`    marches a round through the world, spending energy on the
 *                   material it crosses and deflecting off what it grazes
 *   `Explosions`    prices a blast against line of sight rather than distance
 *   `DamageSystem`  the one funnel: team checks, death, attribution, feedback
 *   `Hitboxes`      where a body is and which part of it was hit
 *   `Impacts`       what an arrival looks, sounds and breaks like
 *   `Projectiles`   the shared arc trace for anything with a muzzle velocity
 *   `Surfaces`      the authored material table turned into ballistic numbers
 *
 * Order is `ORDER.COMBAT` (400): after the weapons have decided to fire and before
 * the AI reacts to having been shot at.
 */
import * as THREE from 'three';
import type { CombatSystem } from '../core/Contracts';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { BodyPart, Damageable, DamageInfo, HitResult, Team } from '../core/GameTypes';
import { BULLET_GROUPS, BulletTracer, type BallisticsStats, type FireBulletOptions } from './Ballistics';
import { CombatDeps } from './Deps';
import { DamageRegistry, type ScoreState } from './DamageSystem';
import { ExplosionSolver, type ExplodeOptions, type ExplosionStats } from './Explosions';
import { createHitboxHit, partFromPoint, rayHitbox, type HitboxHit } from './Hitboxes';
import {
  ProjectileTracer,
  type ProjectileHit,
  type ProjectileImpactOptions,
  type ProjectileTraceOptions,
} from './Projectiles';
import { installCombatSelfTest, type CombatSelfTest } from './SelfTest';

export interface CombatStats {
  entities: number;
  ballistics: BallisticsStats;
  explosions: ExplosionStats;
  score: ScoreState;
}

/** Seconds after boot before the numeric self-test runs, when it is enabled. */
const SELF_TEST_DELAY = 2.5;

export class CombatSystemImpl implements CombatSystem, System {
  readonly name = 'combat' as const;
  readonly order = ORDER.COMBAT;
  readonly dependencies = ['physics'] as const;

  private readonly deps = new CombatDeps();
  private readonly registry = new DamageRegistry(this.deps);
  private readonly bullets = new BulletTracer(this.deps, this.registry);
  private readonly blasts = new ExplosionSolver(this.deps, this.registry, this.bullets);
  private readonly projectiles = new ProjectileTracer(this.deps, this.registry, this.bullets);

  private readonly dir = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly hitboxHit: HitboxHit = createHitboxHit();

  private selfTest: CombatSelfTest | null = null;
  private selfTestTimer = 0;
  private selfTestDone = false;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.deps.attach(ctx);
    this.selfTest = installCombatSelfTest(this, this.deps, this.registry);
  }

  update(_dt: number, ctx: EngineContext): void {
    this.deps.resolve();
    this.registry.refresh(ctx.time.elapsed);

    // The local player is registered defensively: radius damage and near-miss
    // suppression are worthless if the one entity that must always be findable is
    // missing because another module forgot to announce it.
    const local = this.deps.player?.entity;
    if (local) this.registry.ensure(local);

    if (this.selfTest && !this.selfTestDone) {
      this.selfTestTimer += ctx.time.deltaUnscaled;
      if (this.selfTestTimer >= SELF_TEST_DELAY && this.deps.physicsReady) {
        this.selfTestDone = true;
        this.selfTest.run();
      }
    }
  }

  dispose(): void {
    this.selfTest?.dispose();
    this.selfTest = null;
    this.registry.clear();
    this.deps.detach();
  }

  // -------------------------------------------------------------------------
  // Registry
  // -------------------------------------------------------------------------

  register(entity: Damageable): void {
    this.registry.register(entity);
  }

  unregister(entity: Damageable): void {
    this.registry.unregister(entity);
  }

  entitiesOf(team: Team): readonly Damageable[] {
    return this.registry.entitiesOf(team);
  }

  /** Killfeed label for an entity. Defaults to `PLAYER` / `HOSTILE <id>`. */
  setDisplayName(entity: Damageable, name: string): void {
    this.registry.setDisplayName(entity, name);
  }

  /**
   * Standing height of an entity's hitbox, in metres. The AI should call this when
   * a character crouches or goes prone; the whole hitbox layout scales with it.
   */
  setHitboxHeight(entity: Damageable, height: number): void {
    this.registry.setHitboxHeight(entity, height);
  }

  entityById(id: number): Damageable | null {
    return this.registry.byEntityId(id) ?? null;
  }

  // -------------------------------------------------------------------------
  // Ballistics
  // -------------------------------------------------------------------------

  fireBullet(options: FireBulletOptions): HitResult | null {
    return this.bullets.fireBullet(options);
  }

  explode(options: ExplodeOptions): void {
    this.blasts.explode(options);
  }

  applyDamage(target: Damageable, info: DamageInfo): void {
    this.registry.applyDamage(target, info);
  }

  /**
   * Nearest character along a ray, blocked by geometry.
   *
   * Both hitbox models are consulted and the nearer wins: the physics hit carries
   * a `bodyPart` when the AI publishes bone colliders, the analytic capsule covers
   * it when it does not. A ray that only finds geometry still returns that hit with
   * a null target, which is what a melee swing needs in order to spark off a wall.
   */
  raycastEntities(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    ignore?: Damageable | null,
  ): HitResult | null {
    const length = this.dir.copy(direction).length();
    if (length < 1e-6 || maxDistance <= 0) return null;
    this.dir.divideScalar(length);

    const physics = this.deps.physics;
    let worldHit = null;
    if (physics) {
      this.bullets.countRay();
      worldHit = physics.raycast(origin, this.dir, {
        maxDistance,
        groups: BULLET_GROUPS,
        exclude: ignore ? [ignore] : undefined,
      });
    }

    let limit = worldHit ? worldHit.distance : maxDistance;
    const records = this.registry.records;
    let bestRecord = null;
    let bestPart: BodyPart = 'chest';
    let bestT = limit;
    let bestNx = 0;
    let bestNy = 1;
    let bestNz = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (record.entity === ignore || !record.entity.isAlive) continue;
      if (!rayHitbox(record.profile, record.position, origin, this.dir, bestT, this.hitboxHit)) {
        continue;
      }
      bestRecord = record;
      bestT = this.hitboxHit.t;
      bestPart = this.hitboxHit.part;
      bestNx = this.hitboxHit.normalX;
      bestNy = this.hitboxHit.normalY;
      bestNz = this.hitboxHit.normalZ;
    }

    const out = this.bullets.nextHit();
    if (bestRecord) {
      this.point.copy(origin).addScaledVector(this.dir, bestT);
      out.hit = true;
      out.point.copy(this.point);
      out.normal.set(bestNx, bestNy, bestNz);
      out.distance = bestT;
      out.surface = 'flesh';
      out.target = bestRecord.entity;
      out.bodyPart = bestPart;
      out.object = null;
      return out;
    }

    if (!worldHit) return null;
    limit = worldHit.distance;
    const entity = worldHit.userData?.entity ?? null;
    out.hit = true;
    out.point.copy(worldHit.point);
    out.normal.copy(worldHit.normal);
    out.distance = limit;
    out.surface = worldHit.surface;
    out.target = entity;
    out.object = worldHit.userData?.object3D ?? null;
    if (entity) {
      const record = this.registry.ensure(entity);
      out.bodyPart =
        worldHit.userData?.bodyPart ??
        partFromPoint(record.profile, record.position, out.point, this.dir);
    } else {
      out.bodyPart = null;
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Projectiles — shared with anything that has a muzzle velocity
  // -------------------------------------------------------------------------

  /**
   * Integrates one frame of a gravity-affected arc with a swept, sub-stepped
   * collision test. `position` and `velocity` are advanced in place.
   */
  traceProjectile(options: ProjectileTraceOptions): ProjectileHit {
    return this.projectiles.trace(options);
  }

  /** Runs a projectile contact through the same impact path bullets use. */
  resolveProjectileImpact(hit: ProjectileHit, options: ProjectileImpactOptions): void {
    this.projectiles.resolveImpact(hit, options);
  }

  /** First contact of a ballistic arc, for AI aiming and HUD throw arcs. */
  sweepProjectileArc(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    gravityScale: number,
    radius: number,
    maxTime: number,
    owner: Damageable | null,
    out: ProjectileHit,
  ): number {
    return this.projectiles.sweepArc(
      origin,
      velocity,
      gravityScale,
      radius,
      maxTime,
      0.05,
      owner,
      out,
    );
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  getStats(): CombatStats {
    return {
      entities: this.registry.records.length,
      ballistics: this.bullets.stats,
      explosions: this.blasts.stats,
      score: this.registry.score,
    };
  }

  get score(): ScoreState {
    return this.registry.score;
  }

  resetStats(): void {
    this.bullets.resetStats();
  }
}

export { ProjectileTracer, PROJECTILE_GRAVITY } from './Projectiles';
export { SURFACE_BALLISTICS, penetrationCost, maxCrossableThickness } from './Surfaces';
export { partMultiplier } from './Ballistics';
export type { ProjectileHit, ProjectileTraceOptions, ProjectileImpactOptions } from './Projectiles';
export type { FireBulletOptions, BallisticsStats } from './Ballistics';
export type { ExplodeOptions, ExplosionKind, ExplosionStats } from './Explosions';
export type { ScoreState, EntityRecord } from './DamageSystem';
export type { HitboxProfile } from './Hitboxes';
