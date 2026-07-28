import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { GameContext } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type { IAI, IPhysics, RaycastHit, WeaponStats } from '../core/Interfaces';
import { Rng, clamp, damp, lerp, saturate } from '../core/MathUtils';

/**
 * Where the bullets actually go.
 *
 * Rifle rounds are hitscan — at 880 m/s a 40 m shot lands in 45 ms, and no
 * player can tell the difference between that and instant — but the *visuals*
 * are not: the tracer is handed to the FX system with the muzzle velocity so it
 * streaks at the right speed, and impact effects past 25 m are held back by the
 * flight time so the puff of dust arrives when the tracer does. Damage is still
 * resolved on the frame the trigger broke, which is what registration should
 * feel like.
 *
 * Penetration is an energy budget in metres-of-concrete. Every material the ray
 * crosses costs its thickness times its hardness; the round carries on while
 * there is budget left, dealing damage scaled by what remains, and both the
 * entry and the exit spawn effects. The budget comes from `stats.penetration`,
 * which is why .338 goes through a breeze block and 9 mm does not.
 */

/* Cost per metre of material, relative to concrete. */
const HARDNESS: Record<SurfaceKind, number> = {
  concrete: 1,
  metal: 1.7,
  wood: 0.34,
  sand: 0.72,
  dirt: 0.8,
  glass: 0.06,
  water: 1.1,
  flesh: 0.22,
  foliage: 0.04,
  fabric: 0.14,
  rubber: 0.45,
  plaster: 0.26,
};

/* Assumed thickness when a collider carries no `penetration` metadata. */
const THICKNESS: Record<SurfaceKind, number> = {
  concrete: 0.2,
  metal: 0.01,
  wood: 0.04,
  sand: 0.3,
  dirt: 0.4,
  glass: 0.006,
  water: 0.5,
  flesh: 0.25,
  foliage: 0.05,
  fabric: 0.02,
  rubber: 0.03,
  plaster: 0.09,
};

export function penetrationCost(surface: SurfaceKind, thickness: number): number {
  return thickness * (HARDNESS[surface] ?? 1);
}

export function defaultThickness(surface: SurfaceKind): number {
  return THICKNESS[surface] ?? 0.15;
}

/**
 * One round's energy budget as it crosses material.
 *
 * Split out so the arithmetic has exactly one home: `traceOne` drives an
 * instance over real raycast hits, and the numeric test drives another over a
 * synthetic wall stack. A test that reimplemented this loop would pass while
 * the game did something else.
 */
export class PenetrationRun {
  energy = 0;
  budget = 1;
  layers = 0;

  begin(stats: WeaponStats): void {
    this.budget = Math.max(0.001, stats.penetration);
    this.energy = this.budget;
    this.layers = 0;
  }

  /** What is left of the round, 0..1. Damage scales linearly with it. */
  get fraction(): number {
    return Math.max(0, this.energy) / this.budget;
  }

  /** Damage this layer takes, before any hitbox multiplier. */
  damageAt(stats: WeaponStats, distance: number): number {
    return damageAtRange(stats, distance) * this.fraction;
  }

  /** Charges a layer. Returns true when the round still has energy to go on. */
  spend(surface: SurfaceKind, thickness: number): boolean {
    this.energy -= penetrationCost(surface, thickness);
    if (this.energy > 0) this.layers++;
    return this.energy > 0;
  }
}

/** Damage at a range, given a weapon's falloff curve. */
export function damageAtRange(stats: WeaponStats, distance: number): number {
  if (distance <= stats.falloffStart) return stats.damage;
  if (distance >= stats.falloffEnd) return stats.damage * stats.falloffMin;
  const t = (distance - stats.falloffStart) / Math.max(1e-4, stats.falloffEnd - stats.falloffStart);
  return stats.damage * lerp(1, stats.falloffMin, t);
}

/* ------------------------------- spread --------------------------------- */

export interface SpreadInput {
  ads: number;
  /** 0..1 of run speed. */
  speed: number;
  crouch: number;
  grounded: boolean;
  reloading: boolean;
}

/**
 * The cone.
 *
 * Two terms: a base from `hipSpread`/`adsSpread` modified by stance and
 * movement, and a bloom that each shot adds and that decays back. First shot
 * from a stationary ADS is exactly zero bloom on top of a very small base, so
 * it is genuinely pin-accurate; hosing from the hip while sprinting is not.
 */
export class Spread {
  value = 0;
  bloom = 0;
  private base = 0;

  reset(stats: WeaponStats): void {
    this.bloom = 0;
    this.base = stats.hipSpread;
    this.value = stats.hipSpread;
  }

  /** Adds one shot's worth of bloom. */
  onShot(stats: WeaponStats, ads: number): void {
    const per = lerp(stats.hipSpread * 0.16, stats.adsSpread * 3.4 + stats.hipSpread * 0.012, ads);
    this.bloom = Math.min(this.bloom + per, lerp(stats.hipSpread * 1.5, stats.hipSpread * 0.4, ads));
  }

  update(dt: number, stats: WeaponStats, input: SpreadInput): number {
    const aimed = lerp(stats.hipSpread, stats.adsSpread, input.ads);
    const move = 1 + input.speed * (1.9 - input.ads * 1.1);
    const stance = 1 - input.crouch * 0.28;
    const air = input.grounded ? 1 : 2.4 - input.ads * 0.9;
    const reload = input.reloading ? 1.35 : 1;
    this.base = aimed * move * stance * air * reload;
    // Recovery is faster while still and crouched: the whole point of the
    // dynamic crosshair is that standing still is rewarded.
    const recovery = (7.5 + input.crouch * 4) * (1 - input.speed * 0.55) * (1 + input.ads * 0.5);
    this.bloom = damp(this.bloom, 0, recovery, dt);
    this.value = this.base + this.bloom;
    return this.value;
  }
}

/* ------------------------------ resolution ------------------------------- */

export interface ShotContext {
  stats: WeaponStats;
  /** Eye position; where the ray starts. */
  origin: THREE.Vector3;
  /** Normalised aim direction. */
  direction: THREE.Vector3;
  /** Where the tracer is drawn from. */
  muzzle: THREE.Vector3;
  spread: number;
  ignore: THREE.Object3D[];
  weaponName: string;
}

interface DeferredImpact {
  time: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  direction: THREE.Vector3;
  surface: SurfaceKind;
  energy: number;
  decal: boolean;
  target: THREE.Object3D | null;
}

const MAX_RANGE = 400;
const MASK = Groups.WORLD | Groups.PROP | Groups.ENEMY | Groups.GLASS | Groups.DEBRIS;

export class Ballistics {
  readonly rng = new Rng(0x5eed17);
  /** Rounds resolved since boot, so tests can count without watching events. */
  shotsFired = 0;
  hitsRegistered = 0;
  lastDamage = 0;
  lastPenetrations = 0;

  private readonly run = new PenetrationRun();
  private readonly deferred: DeferredImpact[] = [];
  private readonly free: DeferredImpact[] = [];
  private readonly dir = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly exit = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly impactEvt = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    surface: 'concrete' as SurfaceKind,
    direction: new THREE.Vector3(),
    energy: 1,
    target: undefined as THREE.Object3D | undefined,
  };
  private readonly decalEvt = {
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    surface: 'concrete' as SurfaceKind,
    size: 0.08,
    kind: 'bullet' as const,
    target: undefined as THREE.Object3D | undefined,
  };
  private readonly tracerEvt = {
    origin: new THREE.Vector3(),
    end: new THREE.Vector3(),
    speed: 900,
    caliber: 5.56,
    fromPlayer: true,
  };
  private readonly damageEvt = {
    amount: 0,
    kind: 'bullet' as const,
    from: new THREE.Vector3(),
    headshot: false,
    attacker: 'player' as const,
    targetId: 0,
  };
  private readonly bloodEvt = {
    position: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    amount: 1,
  };

  constructor(private readonly ctx: GameContext) {
    for (let i = 0; i < 48; i++) {
      this.free.push({
        time: 0,
        point: new THREE.Vector3(),
        normal: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        surface: 'concrete',
        energy: 1,
        decal: true,
        target: null,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.deferred.length - 1; i >= 0; i--) {
      const d = this.deferred[i];
      d.time -= dt;
      if (d.time > 0) continue;
      this.emitImpact(d.point, d.normal, d.direction, d.surface, d.energy, d.decal, d.target);
      this.deferred.splice(i, 1);
      this.free.push(d);
    }
  }

  /** Fires one trigger pull, which may be several pellets. */
  fire(shot: ShotContext): void {
    const stats = shot.stats;
    const pellets = Math.max(1, stats.pellets ?? 1);
    const cone = pellets > 1 ? (stats.pelletSpread ?? 0.05) : 0;
    for (let i = 0; i < pellets; i++) {
      this.dir.copy(shot.direction);
      if (shot.spread > 0 || cone > 0) {
        // A pellet gets both the aim cone and the choke pattern; a bullet only
        // the aim cone, and at zero spread it is exactly on the crosshair.
        this.scatter(this.dir, shot.spread, cone, pellets > 1 ? i / pellets : 0);
      }
      this.traceOne(shot, this.dir, pellets);
    }
    this.shotsFired++;
  }

  /** Rotates `dir` inside a cone, allocation free. */
  private scatter(dir: THREE.Vector3, spread: number, cone: number, ring: number): void {
    // Build a basis around the direction without a quaternion.
    if (Math.abs(dir.y) < 0.99) this.right.set(0, 1, 0).cross(dir).normalize();
    else this.right.set(1, 0, 0).cross(dir).normalize();
    this.up.copy(dir).cross(this.right).normalize();
    let angle: number;
    let phi: number;
    if (cone > 0) {
      // Buckshot: a jittered ring pattern rather than a uniform disc, which is
      // what a real choke throws and what makes the spread read as a pattern.
      angle = cone * (0.25 + 0.75 * Math.sqrt(this.rng.next())) + spread * this.rng.next();
      phi = ring * Math.PI * 2 + this.rng.range(-0.5, 0.5);
    } else {
      angle = spread * Math.sqrt(this.rng.next());
      phi = this.rng.next() * Math.PI * 2;
    }
    const s = Math.sin(angle);
    dir
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(this.right, Math.cos(phi) * s)
      .addScaledVector(this.up, Math.sin(phi) * s)
      .normalize();
  }

  private traceOne(shot: ShotContext, dir: THREE.Vector3, pellets: number): void {
    const physics = this.ctx.tryGet<IPhysics>('physics');
    const stats = shot.stats;
    const run = this.run;
    run.begin(stats);
    let end = MAX_RANGE;
    let penetrated = 0;

    if (physics) {
      const hits = physics.raycastAll(shot.origin, dir, MAX_RANGE, MASK, shot.ignore);
      for (let i = 0; i < hits.length; i++) {
        const hit = hits[i];
        const damage = run.damageAt(stats, hit.distance);
        this.resolveHit(hit, dir, damage, stats, shot, i === 0 || penetrated > 0);
        if (i === 0) end = hit.distance;

        const surface = hit.surface;
        if (surface === 'flesh') {
          // Bodies cost energy but never stop a round outright.
          run.spend(surface, hit.penetration ?? THICKNESS.flesh);
        } else {
          const thickness = hit.penetration ?? defaultThickness(surface);
          if (run.spend(surface, thickness)) {
            // Exit wound on the far face.
            this.exit.copy(hit.point).addScaledVector(dir, thickness);
            this.normal.copy(dir).multiplyScalar(-1);
            this.queueImpact(
              this.exit,
              this.normal,
              dir,
              surface,
              run.fraction * 0.7,
              true,
              hit.distance + thickness,
              stats,
              hit.object,
            );
            penetrated++;
          }
        }
        if (run.energy <= 0) break;
      }
    }

    this.lastPenetrations = penetrated;

    // Tracer, drawn from the muzzle to wherever the round stopped.
    if (pellets === 1 || this.rng.next() < 0.35) {
      const t = this.tracerEvt;
      t.origin.copy(shot.muzzle);
      t.end.copy(shot.origin).addScaledVector(dir, Math.min(end, MAX_RANGE));
      t.speed = stats.muzzleVelocity;
      t.caliber = stats.caliber;
      t.fromPlayer = true;
      this.ctx.events.emit('fx:tracer', t);
    }
  }

  private resolveHit(
    hit: RaycastHit,
    dir: THREE.Vector3,
    damage: number,
    stats: WeaponStats,
    shot: ShotContext,
    spawnFx: boolean,
  ): void {
    const scale = hit.damageScale ?? 1;
    const headshot = scale >= 1.8;
    const dealt = damage * scale * (headshot ? stats.headshotMultiplier / 2 : 1);
    this.lastDamage = dealt;

    if (hit.entityId !== undefined) {
      const ai = this.ctx.tryGet<IAI>('ai');
      const evt = this.damageEvt;
      evt.amount = dealt;
      evt.from.copy(shot.origin);
      evt.headshot = headshot;
      evt.targetId = hit.entityId;
      let lethal = false;
      if (ai) lethal = ai.damage(hit.entityId, evt);
      this.hitsRegistered++;
      this.ctx.events.emit('ui:hitmarker', { lethal, headshot, damage: dealt });
      const b = this.bloodEvt;
      b.position.copy(hit.point);
      b.direction.copy(dir);
      b.amount = saturate(dealt / 60);
      this.ctx.events.emit('fx:blood', b);
    }

    if (spawnFx) {
      this.queueImpact(
        hit.point,
        hit.normal,
        dir,
        hit.surface,
        saturate(0.4 + damage / Math.max(1, stats.damage)),
        hit.entityId === undefined,
        hit.distance,
        stats,
        hit.object,
      );
    }
  }

  /**
   * Impacts inside 25 m fire now; further out they wait for the round to
   * arrive, because a dust puff that beats its own tracer looks wrong.
   */
  private queueImpact(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    dir: THREE.Vector3,
    surface: SurfaceKind,
    energy: number,
    decal: boolean,
    distance: number,
    stats: WeaponStats,
    target: THREE.Object3D | null,
  ): void {
    const flight = distance / Math.max(50, stats.muzzleVelocity);
    if (distance < 25 || this.free.length === 0) {
      this.emitImpact(point, normal, dir, surface, energy, decal, target);
      return;
    }
    const d = this.free.pop()!;
    d.time = flight;
    d.point.copy(point);
    d.normal.copy(normal);
    d.direction.copy(dir);
    d.surface = surface;
    d.energy = energy;
    d.decal = decal;
    d.target = target;
    this.deferred.push(d);
  }

  private emitImpact(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    dir: THREE.Vector3,
    surface: SurfaceKind,
    energy: number,
    decal: boolean,
    target: THREE.Object3D | null,
  ): void {
    const e = this.impactEvt;
    e.point.copy(point);
    e.normal.copy(normal);
    e.direction.copy(dir);
    e.surface = surface;
    e.energy = energy;
    e.target = target ?? undefined;
    this.ctx.events.emit('fx:impact', e);
    if (!decal) return;
    const d = this.decalEvt;
    d.position.copy(point);
    d.normal.copy(normal);
    d.surface = surface;
    d.size = clamp(0.055 + energy * 0.05, 0.03, 0.16);
    d.target = target ?? undefined;
    this.ctx.events.emit('fx:decal', d);
  }
}
