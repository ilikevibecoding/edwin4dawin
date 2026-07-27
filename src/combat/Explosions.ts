/**
 * Explosions.
 *
 * The single most important correctness property here is that cover works. A
 * grenade that kills through a wall makes every wall in the map meaningless, so
 * damage is never a function of distance alone: each target is sampled at six
 * points spread over its body and staggered across the line to the blast, and the
 * damage it takes scales with the fraction of those points the blast can actually
 * see. Full cover means no damage at all outside the overpressure bubble right on
 * top of the charge; a head over a wall means a partial reading, which is exactly
 * the risk a peeking player should be taking.
 *
 * Shrapnel is the second half of the model. A spray of short high-damage rays
 * makes an explosion lethal in the open, adds the pockmarks that sell it, and —
 * because fragments are stopped by the same geometry as bullets — reinforces cover
 * rather than working around it. Fragment damage is accumulated per target and
 * folded into a single `applyDamage` call, so one blast is one killfeed entry.
 */
import * as THREE from 'three';
import type { RaycastOptions } from '../core/Contracts';
import { COLLISION_GROUP, type Damageable, type SurfaceType } from '../core/GameTypes';
import { Rng, clamp, saturate } from '../core/MathUtils';
import { BULLET_GROUPS, partMultiplier, type BulletTracer } from './Ballistics';
import type { CombatDeps } from './Deps';
import type { DamageRegistry, EntityRecord } from './DamageSystem';
import {
  SAMPLE_COUNT,
  createHitboxHit,
  distanceToBody,
  fillOcclusionSamples,
  rayHitbox,
  type HitboxHit,
} from './Hitboxes';

export type ExplosionKind = 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';

export interface ExplodeOptions {
  position: THREE.Vector3;
  radius: number;
  damage: number;
  falloff: 'linear' | 'quadratic';
  source: Damageable | null;
  kind: ExplosionKind;
  impulse: number;
  screenShake?: number;
}

/** Cover: what blocks a blast. Bodies do not shield each other. */
const SIGHT_GROUPS = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;

/** Lift the sample origin off the deck so a charge lying on the floor can see out. */
const ORIGIN_LIFT = 0.12;
const ORIGIN_NUDGE = 0.1;

/**
 * Damage retained with no line of sight at all. Non-zero only inside the
 * overpressure bubble: a wall stops fragments, it does not stop a charge going
 * off against the other side of it.
 */
const OVERPRESSURE_FRACTION = 0.28;
const OVERPRESSURE_RANGE = 0.3;
/** Floor and slope applied once any part of the target is exposed. */
const VISIBLE_FLOOR = 0.22;

/**
 * Scatter fragments per kind. These carry no damage — they exist to pit the
 * surroundings and to break nearby destructibles, and are fixed per kind rather
 * than scaled by quality so a low-end machine sees the same fight.
 */
const SCATTER_COUNT: Record<ExplosionKind, number> = {
  grenade: 14,
  rocket: 12,
  airstrike: 22,
  vehicle: 14,
  barrel: 10,
};
/** Fragments fly flatter than a uniform sphere; the ones going straight up are wasted. */
const SCATTER_VERTICAL_BIAS = 0.55;

/**
 * Damaging fragments cast per exposed target.
 *
 * A real casing throws thousands of fragments and a man-sized target three metres
 * out subtends about one percent of the sphere, so a tractable uniform spray
 * connects roughly never. These are the same rays, importance-sampled towards the
 * bodies that could be hit: aimed at jittered points across the silhouette, each
 * one independently blocked by the same geometry that stops a bullet. A target
 * behind a low wall therefore catches only the fragments aimed at what is showing.
 */
const AIMED_PER_TARGET = 6;
/** Targets that get aimed fragments, nearest first, to bound the cost of a crowd. */
const MAX_AIMED_TARGETS = 8;
/** Fraction of the authored damage one fragment carries. */
const SHRAPNEL_FRACTION = 0.075;
/** Cap on the total fragment damage one target can take from one blast. */
const SHRAPNEL_CAP = 0.4;
/** Spread of the aim jitter, in metres, across and up the silhouette. */
const AIM_JITTER_LATERAL = 0.4;
const AIM_JITTER_VERTICAL = 0.5;

export interface ExplosionStats {
  explosions: number;
  sightTests: number;
  shrapnelRays: number;
  lastCostUs: number;
  avgCostUs: number;
}

export class ExplosionSolver {
  readonly stats: ExplosionStats = {
    explosions: 0,
    sightTests: 0,
    shrapnelRays: 0,
    lastCostUs: 0,
    avgCostUs: 0,
  };

  private readonly rng = new Rng(0x5eedb0a5);

  private readonly targets: EntityRecord[] = [];
  /** Visible fraction per target, in step with `targets`, reused between blasts. */
  private readonly visibility = new Float32Array(64);
  private readonly samples = new Float32Array(SAMPLE_COUNT * 3);
  private readonly aimPoint = new THREE.Vector3();
  private readonly samplePoint = new THREE.Vector3();
  private readonly sightOrigin = new THREE.Vector3();
  private readonly toTarget = new THREE.Vector3();
  private readonly fragDir = new THREE.Vector3();
  private readonly fragOrigin = new THREE.Vector3();
  private readonly fragPoint = new THREE.Vector3();
  private readonly fragNormal = new THREE.Vector3();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly hitboxHit: HitboxHit = createHitboxHit();
  private readonly rayOptions: RaycastOptions = {
    maxDistance: 1,
    groups: BULLET_GROUPS,
    exclude: [null as unknown],
    includeSensors: false,
  };
  private readonly payload = {
    position: new THREE.Vector3(),
    radius: 0,
    damage: 0,
    source: null as Damageable | null,
    kind: 'grenade' as ExplosionKind,
  };

  constructor(
    private readonly deps: CombatDeps,
    private readonly registry: DamageRegistry,
    private readonly tracer: BulletTracer,
  ) {}

  explode(options: ExplodeOptions): void {
    const started = performance.now();
    const radius = Math.max(0.2, options.radius);
    const frame = this.deps.context?.time.frame ?? 0;

    this.sightOrigin.copy(options.position);
    this.sightOrigin.y += ORIGIN_LIFT;

    // 1. Gather targets and price the blast against each of them.
    const tag = this.registry.nextTag();
    const targets = this.registry.queryRadius(options.position, radius, frame, this.targets);
    const counted = Math.min(targets.length, this.visibility.length);
    for (let i = 0; i < counted; i++) {
      const record = targets[i];
      record.pendingTag = tag;
      record.pendingShrapnel = 0;
      const visible = this.visibleFraction(record, options.position);
      this.visibility[i] = visible;
      record.pendingDamage = this.radialDamage(record, options, radius, visible);
    }

    // 2. Fragments, which are stopped by exactly the same geometry a bullet is.
    this.fireAimedFragments(options, radius, targets, counted, tag);
    this.fireScatter(options, radius);

    // 3. One application per target, so one blast is one killfeed entry.
    for (let i = 0; i < counted; i++) {
      const record = targets[i];
      if (record.pendingTag !== tag) continue;
      const total = record.pendingDamage + record.pendingShrapnel;
      record.pendingDamage = 0;
      record.pendingShrapnel = 0;
      if (total > 0) this.applyBlastDamage(record, options, total);
    }

    // 4. World reaction.
    this.deps.physics?.applyRadialImpulse(options.position, radius, options.impulse);
    this.deps.world?.damageAt(options.position, radius * 0.9, options.damage * 1.35);
    this.presentation(options, radius);
    this.deps.ai?.suppress(options.position, radius * 1.9, 2.2 + radius * 0.12);

    const payload = this.payload;
    payload.position.copy(options.position);
    payload.radius = radius;
    payload.damage = options.damage;
    payload.source = options.source;
    payload.kind = options.kind;
    this.deps.emit('combat:explosion', payload);

    const elapsed = (performance.now() - started) * 1000;
    this.stats.explosions++;
    this.stats.lastCostUs = elapsed;
    this.stats.avgCostUs =
      this.stats.avgCostUs === 0 ? elapsed : this.stats.avgCostUs * 0.9 + elapsed * 0.1;
  }

  // -------------------------------------------------------------------------
  // Damage
  // -------------------------------------------------------------------------

  private radialDamage(
    record: EntityRecord,
    options: ExplodeOptions,
    radius: number,
    visible: number,
  ): number {
    const distance = distanceToBody(record.profile, record.position, options.position);
    if (distance >= radius) return 0;
    const t = saturate(distance / radius);
    const falloff = options.falloff === 'quadratic' ? (1 - t) * (1 - t) : 1 - t;
    if (falloff <= 0) return 0;

    let occlusion: number;
    if (visible <= 0) {
      // Nothing exposed. Only the overpressure of a charge going off against the
      // other side of the cover carries through.
      const closeness = 1 - t / OVERPRESSURE_RANGE;
      occlusion = closeness > 0 ? OVERPRESSURE_FRACTION * closeness : 0;
    } else {
      occlusion = VISIBLE_FLOOR + (1 - VISIBLE_FLOOR) * visible;
    }
    return options.damage * falloff * occlusion;
  }

  /**
   * Fraction of the target's sampled volume the blast can see. Samples run up the
   * body and stagger sideways across the line to the blast, so a wall edge, a
   * window sill or a low barrier all produce a partial reading.
   */
  private visibleFraction(record: EntityRecord, blast: THREE.Vector3): number {
    const physics = this.deps.physics;
    if (!physics || !physics.ready) return 1;

    this.toTarget.set(
      record.position.x - blast.x,
      0,
      record.position.z - blast.z,
    );
    const horizontal = this.toTarget.length();
    let perpX = 1;
    let perpZ = 0;
    if (horizontal > 1e-4) {
      this.toTarget.divideScalar(horizontal);
      // Perpendicular in the ground plane: rotate the flat direction 90 degrees.
      perpX = -this.toTarget.z;
      perpZ = this.toTarget.x;
      this.sightOrigin.x = blast.x + this.toTarget.x * ORIGIN_NUDGE;
      this.sightOrigin.z = blast.z + this.toTarget.z * ORIGIN_NUDGE;
    } else {
      this.sightOrigin.x = blast.x;
      this.sightOrigin.z = blast.z;
    }
    this.sightOrigin.y = blast.y + ORIGIN_LIFT;

    const count = fillOcclusionSamples(record.profile, record.position, perpX, perpZ, this.samples);
    let visible = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      this.samplePoint.set(this.samples[o], this.samples[o + 1], this.samples[o + 2]);
      this.stats.sightTests++;
      if (physics.lineOfSight(this.sightOrigin, this.samplePoint, SIGHT_GROUPS)) visible++;
    }
    return visible / count;
  }

  private applyBlastDamage(
    record: EntityRecord,
    options: ExplodeOptions,
    amount: number,
  ): void {
    const info = this.tracer.nextInfo();
    const position = record.position;
    info.amount = amount;
    info.source = options.source;
    info.point.copy(position);
    info.point.y = position.y - record.profile.feetOffset + record.profile.height * 0.5;
    info.direction
      .set(info.point.x - options.position.x, info.point.y - options.position.y, info.point.z - options.position.z)
      .normalize();
    if (info.direction.lengthSq() < 1e-8) info.direction.set(0, 1, 0);
    info.bodyPart = 'chest';
    info.type = 'explosive';
    info.impulse = options.impulse * 0.6;
    info.weaponId = options.kind;
    info.distance = distanceToBody(record.profile, position, options.position);
    info.isHeadshot = false;
    info.isPenetrating = false;
    this.registry.applyDamage(record.entity, info);
  }

  // -------------------------------------------------------------------------
  // Shrapnel
  // -------------------------------------------------------------------------

  /**
   * Damaging fragments, aimed across the silhouette of each exposed target.
   *
   * Fully covered targets are skipped outright: if the blast cannot see a single
   * one of the six body samples then no fragment reaches them either, and the six
   * line-of-sight tests already paid for say so far more cheaply than six raycasts
   * would. Jitter deliberately overshoots the body so some fragments miss, which
   * is where the variance between two identical grenades comes from.
   */
  private fireAimedFragments(
    options: ExplodeOptions,
    radius: number,
    targets: EntityRecord[],
    counted: number,
    tag: number,
  ): void {
    const physics = this.deps.physics;
    if (!physics || !physics.ready) return;
    const range = radius * 0.95;
    const perFragment = options.damage * SHRAPNEL_FRACTION;
    const cap = options.damage * SHRAPNEL_CAP;

    this.fragOrigin.copy(options.position);
    this.fragOrigin.y += ORIGIN_LIFT;
    const rayOptions = this.rayOptions;
    (rayOptions.exclude as unknown[])[0] = null;

    let aimed = 0;
    for (let i = 0; i < counted && aimed < MAX_AIMED_TARGETS; i++) {
      const record = targets[i];
      if (record.pendingTag !== tag || this.visibility[i] <= 0) continue;
      if (record.entity === options.source || !record.entity.isAlive) continue;
      aimed++;

      const profile = record.profile;
      const base = record.position.y - profile.feetOffset;
      this.toTarget.set(
        record.position.x - this.fragOrigin.x,
        0,
        record.position.z - this.fragOrigin.z,
      );
      const horizontal = this.toTarget.length();
      let perpX = 1;
      let perpZ = 0;
      if (horizontal > 1e-4) {
        perpX = -this.toTarget.z / horizontal;
        perpZ = this.toTarget.x / horizontal;
      }

      for (let f = 0; f < AIMED_PER_TARGET; f++) {
        const lateral = this.rng.range(-AIM_JITTER_LATERAL, AIM_JITTER_LATERAL);
        this.aimPoint.set(
          record.position.x + perpX * lateral,
          base + profile.height * this.rng.range(0.1, 0.98) + this.rng.range(0, AIM_JITTER_VERTICAL),
          record.position.z + perpZ * lateral,
        );
        this.fragDir.copy(this.aimPoint).sub(this.fragOrigin);
        const distance = this.fragDir.length();
        if (distance < 1e-4 || distance > range) continue;
        this.fragDir.divideScalar(distance);

        if (
          !rayHitbox(
            profile,
            record.position,
            this.fragOrigin,
            this.fragDir,
            range,
            this.hitboxHit,
          )
        ) {
          continue;
        }

        // Cover: the fragment has to get there through the same world a bullet does.
        rayOptions.maxDistance = this.hitboxHit.t;
        this.stats.shrapnelRays++;
        this.tracer.countRay();
        if (physics.raycast(this.fragOrigin, this.fragDir, rayOptions) !== null) continue;

        const falloff = 1 - saturate(this.hitboxHit.t / range) * 0.65;
        const damage = perFragment * falloff * partMultiplier(this.hitboxHit.part);
        record.pendingShrapnel = Math.min(record.pendingShrapnel + damage, cap);
      }
    }
  }

  /**
   * The omnidirectional spray. Carries no damage — the aimed pass owns that — and
   * exists to pit the surroundings and break the destructibles a blast should take
   * with it.
   */
  private fireScatter(options: ExplodeOptions, radius: number): void {
    const physics = this.deps.physics;
    if (!physics || !physics.ready) return;
    const count = SCATTER_COUNT[options.kind];
    const range = radius * 0.95;

    this.fragOrigin.copy(options.position);
    this.fragOrigin.y += ORIGIN_LIFT;
    const rayOptions = this.rayOptions;
    rayOptions.maxDistance = range;
    (rayOptions.exclude as unknown[])[0] = null;

    for (let i = 0; i < count; i++) {
      this.rng.onUnitSphere(this.fragDir);
      this.fragDir.y *= SCATTER_VERTICAL_BIAS;
      if (this.fragDir.lengthSq() < 1e-8) this.fragDir.set(1, 0, 0);
      this.fragDir.normalize();

      this.stats.shrapnelRays++;
      this.tracer.countRay();
      const hit = physics.raycast(this.fragOrigin, this.fragDir, rayOptions);
      if (!hit) continue;

      // Every other fragment scars, so a grenade leaves a pattern rather than two
      // dozen overlapping decals.
      if ((i & 1) !== 0) continue;
      const blocked = hit.distance;
      this.fragPoint.copy(hit.point);
      this.fragNormal.copy(hit.normal);
      const surface: SurfaceType = hit.surface;
      this.tracer.impacts.resolve(this.fragPoint, this.fragNormal, this.fragDir, surface, {
        energy: 0.5 * (1 - saturate(blocked / range)) + 0.25,
        impulse: options.impulse * 0.08,
        destruction: 1.6,
        organic: false,
        userData: hit.userData,
        silent: true,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

  private presentation(options: ExplodeOptions, radius: number): void {
    const fx = this.deps.fx;
    const kind = options.kind;
    if (fx) {
      fx.explosion(options.position, radius, kind);
      fx.smoke(options.position, radius * 0.75, 4.5 + radius * 0.35, SMOKE_COLOR);
      fx.debrisBurst(options.position, UP, Math.round(10 + radius * 2.2), 'concrete');
      fx.dust(options.position, radius * 0.9, 0.8);
    }

    const camera = this.deps.context?.camera;
    if (camera) camera.getWorldPosition(this.cameraPosition);
    else this.cameraPosition.copy(options.position);
    const distance = this.cameraPosition.distanceTo(options.position);
    const closeness = 1 - saturate(distance / (radius * 2.6));

    this.deps.audio?.play(soundFor(kind), options.position, {
      volume: 1,
      pitch: 0.94 + this.rng.next() * 0.12,
      refDistance: radius * 1.5,
      maxDistance: 240,
    });

    const render = this.deps.render;
    if (render && closeness > 0.01) {
      const shake = (options.screenShake ?? 1) * closeness;
      render.addScreenShake(shake * 1.5, 0.35 + closeness * 0.5, 24);
      if (closeness > 0.25) {
        render.addScreenFlash(closeness * 0.55, 0.18 + closeness * 0.16, 0xffc890);
      }
      render.requestDynamicLight(options.position, 0xffb060, 140 + radius * 22, radius * 3.4, 0.35);
    }

    if (closeness > 0.4) {
      this.deps.audio?.setDeafen(clamp((closeness - 0.4) * 1.5, 0, 0.9), 1.4 + closeness * 2.6);
    }
  }
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
/** Oily grey-brown, which reads against both the sand and the shadows. */
const SMOKE_COLOR = 0x3a342e;

function soundFor(kind: ExplosionKind): string {
  switch (kind) {
    case 'rocket':
      return 'explosion_rocket';
    case 'airstrike':
      return 'explosion_airstrike';
    case 'vehicle':
      return 'explosion_vehicle';
    case 'barrel':
      return 'explosion_barrel';
    default:
      return 'explosion_grenade';
  }
}
