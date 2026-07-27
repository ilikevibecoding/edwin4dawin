/**
 * Bullet tracing.
 *
 * A shot is not one raycast. It is a march: cast, resolve the impact, work out
 * how much of the round survives crossing whatever it hit, and cast again from
 * the far side. Three things make that march honest rather than a fudge factor:
 *
 *   Thickness. On every hit the exit face is found with a back-face raycast —
 *   step past the entry, cast backwards, and the gap between the two points is the
 *   real thickness of the material. Cost is proportional to that thickness, so the
 *   same plaster wall is nearly free at 8 cm and stops the round at 60 cm without
 *   anything being authored per object.
 *
 *   Energy. One scalar, starting at 1, is spent crossing material and deflecting,
 *   and it multiplies damage. A round that has just fought through a crate does
 *   correspondingly less on the other side, which is what makes shooting through
 *   cover a decision rather than a free upgrade.
 *
 *   Deflection. At a grazing angle on a hard surface the round leaves along the
 *   face instead of digging in, using the authored per-surface ricochet
 *   probability. Rare by design — it should be a story, not a texture.
 *
 * Character registration is resolved twice over: physics hitboxes win when the AI
 * publishes them (and hand us `bodyPart` for free), and an analytic capsule model
 * covers the case where it does not. Everything is allocation-free; an LMG at 750
 * rpm is three to six raycasts twelve times a second and a collection pause
 * mid-firefight is not something a player forgives.
 */
import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type { PhysicsRaycastHit, PhysicsUserData, RaycastOptions } from '../core/Contracts';
import {
  COLLISION_GROUP,
  type BodyPart,
  type Damageable,
  type DamageType,
  type HitResult,
  type SurfaceType,
} from '../core/GameTypes';
import { Rng, clamp, saturate, smoothstep } from '../core/MathUtils';
import type { CombatDeps } from './Deps';
import type { DamageRegistry, EntityRecord } from './DamageSystem';
import {
  CENTRE_OF_MASS,
  createHitboxHit,
  hitboxBound,
  partFromPoint,
  rayHitbox,
  type HitboxHit,
} from './Hitboxes';
import { ImpactResolver } from './Impacts';
import {
  SURFACE_BALLISTICS,
  maxCrossableThickness,
  penetrationCost,
  ricochetChance,
  ricochetEnergyScale,
} from './Surfaces';

/** Furthest a round is tracked. Beyond this the damage floor makes it moot. */
export const MAX_RANGE = 500;

/** Groups a round can strike. Debris is excluded so shards never eat a shot. */
export const BULLET_GROUPS =
  COLLISION_GROUP.STATIC |
  COLLISION_GROUP.DYNAMIC |
  COLLISION_GROUP.PLAYER |
  COLLISION_GROUP.ENEMY |
  COLLISION_GROUP.RAGDOLL;

/** Hard caps. Four slabs and two deflections is more than gameplay needs. */
const MAX_PENETRATIONS = 4;
const MAX_RICOCHETS = 2;
/** Aggregate measured thickness allowed, in metres, per unit of penetrationPower. */
const THICKNESS_BUDGET_BASE = 1.0;
const THICKNESS_BUDGET_PER_POWER = 1.2;
/** Below this the round is spent. */
const MIN_ENERGY = 0.05;
/** Deformation tax charged per slab crossed, on top of the thickness cost. */
const PENETRATION_TAX = 0.92;

/** Ceiling on the back-face probe. Long probes start finding unrelated geometry. */
export const PROBE_CEILING = 1.25;
export const PROBE_SKIN = 0.02;
/** Refinement attempts when the probe lands beyond a different collider. */
const PROBE_REFINEMENTS = 2;
/** Nudge used to re-enter the world on the far side of a slab. */
const EXIT_SKIN = 0.012;
/** Thickness assumed for a body when no better measurement is available. */
const BODY_CHORD_FALLBACK = 0.24;

/** Radius within which a passing round cracks past a character. */
const WHIZZ_RADIUS = 2.0;
const WHIZZ_SUPPRESS_RADIUS = 3.2;
const WHIZZ_SUPPRESS_DURATION = 1.1;

/** Ring depth for returned hit records and damage payloads. */
const HIT_RING = 8;
const INFO_RING = 24;
/** Characters tracked per shot for hit tests and near misses. */
const MAX_CANDIDATES = 32;

export interface FireBulletOptions {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  falloffStart: number;
  falloffEnd: number;
  minDamageScale: number;
  penetrationPower: number;
  attacker: Damageable | null;
  weaponId: string;
  tracer: boolean;
  tracerColor: number;
  impulse: number;
}

export interface BallisticsStats {
  shots: number;
  rays: number;
  penetrations: number;
  ricochets: number;
  entityHits: number;
  headshots: number;
  whizzBys: number;
  /** Exponential moving average of one `fireBullet` call, in microseconds. */
  avgShotUs: number;
  peakShotUs: number;
  lastShotUs: number;
  lastShotRays: number;
}

export type TraceEventKind = 'surface' | 'entity' | 'penetrate' | 'ricochet';

export interface TraceEvent {
  kind: TraceEventKind;
  surface: SurfaceType;
  /** Distance from the muzzle, in metres. */
  distance: number;
  /** Measured material thickness, for penetration events. */
  thickness: number;
  /** Energy fraction the event consumed. */
  cost: number;
  /** Energy remaining afterwards. */
  energy: number;
  damage: number;
  part: BodyPart | null;
}

/**
 * Fixed-capacity record of what one trace did, for the numeric self-test and the
 * debug overlay. Off by default; when on it still allocates nothing, so a trace
 * being watched behaves exactly like one that is not.
 */
export class TraceLog {
  readonly events: TraceEvent[] = [];
  count = 0;

  constructor(capacity = 24) {
    for (let i = 0; i < capacity; i++) {
      this.events.push({
        kind: 'surface',
        surface: 'concrete',
        distance: 0,
        thickness: 0,
        cost: 0,
        energy: 0,
        damage: 0,
        part: null,
      });
    }
  }

  reset(): void {
    this.count = 0;
  }

  push(
    kind: TraceEventKind,
    surface: SurfaceType,
    distance: number,
    thickness: number,
    cost: number,
    energy: number,
    damage: number,
    part: BodyPart | null,
  ): void {
    if (this.count >= this.events.length) return;
    const event = this.events[this.count++];
    event.kind = kind;
    event.surface = surface;
    event.distance = distance;
    event.thickness = thickness;
    event.cost = cost;
    event.energy = energy;
    event.damage = damage;
    event.part = part;
  }

  find(kind: TraceEventKind): TraceEvent | null {
    for (let i = 0; i < this.count; i++) {
      if (this.events[i].kind === kind) return this.events[i];
    }
    return null;
  }
}

export interface MutableHitResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  surface: SurfaceType;
  target: Damageable | null;
  bodyPart: BodyPart | null;
  object: THREE.Object3D | null;
}

export interface MutableDamageInfo {
  amount: number;
  source: Damageable | null;
  point: THREE.Vector3;
  direction: THREE.Vector3;
  bodyPart: BodyPart;
  type: DamageType;
  impulse: number;
  weaponId: string;
  distance: number;
  isHeadshot: boolean;
  isPenetrating: boolean;
}

export class BulletTracer {
  readonly stats: BallisticsStats = {
    shots: 0,
    rays: 0,
    penetrations: 0,
    ricochets: 0,
    entityHits: 0,
    headshots: 0,
    whizzBys: 0,
    avgShotUs: 0,
    peakShotUs: 0,
    lastShotUs: 0,
    lastShotRays: 0,
  };

  readonly impacts: ImpactResolver;
  /** Set to observe a trace. Null in normal play. */
  log: TraceLog | null = null;
  private readonly rng = new Rng(0xba11157c);

  // --- scratch -------------------------------------------------------------
  private readonly origin = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly probe = new THREE.Vector3();
  private readonly back = new THREE.Vector3();
  private readonly exit = new THREE.Vector3();
  private readonly spallNormal = new THREE.Vector3();
  private readonly segmentStart = new THREE.Vector3();
  private readonly tracerFrom = new THREE.Vector3();
  private readonly tracerEnd = new THREE.Vector3();
  private readonly reflect = new THREE.Vector3();
  private readonly crackPoint = new THREE.Vector3();

  private readonly rayOptions: RaycastOptions = {
    maxDistance: MAX_RANGE,
    groups: BULLET_GROUPS,
    exclude: [null as unknown],
    includeSensors: false,
  };
  private readonly probeOptions: RaycastOptions = {
    maxDistance: PROBE_CEILING,
    groups: BULLET_GROUPS,
    exclude: [null as unknown],
    includeSensors: false,
  };

  private readonly hitRing: MutableHitResult[] = [];
  private hitCursor = 0;
  private readonly infoRing: MutableDamageInfo[] = [];
  private infoCursor = 0;
  private readonly hitboxHit: HitboxHit = createHitboxHit();

  private readonly hitPayload: {
    result: HitResult | null;
    damage: number;
    isHeadshot: boolean;
    attacker: Damageable | null;
  } = { result: null, damage: 0, isHeadshot: false, attacker: null };

  private readonly nearMissPayload = {
    point: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    distance: 0,
    attacker: null as Damageable | null,
    victim: null as Damageable | null,
    isLocalPlayer: false,
  };

  /** Candidate characters for the current flight path, from one linear pass. */
  private readonly candidates: EntityRecord[] = [];
  private readonly candidateAlong = new Float32Array(MAX_CANDIDATES);
  private readonly candidateApproach = new Float32Array(MAX_CANDIDATES);
  private candidateCount = 0;
  private projectedAlong = 0;

  /** Entities already damaged during the current trace, to stop double hits. */
  private readonly struck: Damageable[] = [];

  /** Nearest analytic hit for the segment being resolved. */
  private sweepRecord: EntityRecord | null = null;
  private sweepDistance = 0;
  private sweepPart: BodyPart = 'chest';
  private readonly sweepNormal = new THREE.Vector3();

  constructor(
    private readonly deps: CombatDeps,
    private readonly registry: DamageRegistry,
  ) {
    this.impacts = new ImpactResolver(deps);
    for (let i = 0; i < HIT_RING; i++) {
      this.hitRing.push({
        hit: false,
        point: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 1, 0),
        distance: 0,
        surface: 'concrete',
        target: null,
        bodyPart: null,
        object: null,
      });
    }
    for (let i = 0; i < INFO_RING; i++) {
      this.infoRing.push({
        amount: 0,
        source: null,
        point: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        bodyPart: 'chest',
        type: 'bullet',
        impulse: 0,
        weaponId: '',
        distance: 0,
        isHeadshot: false,
        isPenetrating: false,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Entry point
  // -------------------------------------------------------------------------

  fireBullet(options: FireBulletOptions): HitResult | null {
    const started = performance.now();
    const raysBefore = this.stats.rays;
    const result = this.trace(options);
    const elapsed = (performance.now() - started) * 1000;
    const stats = this.stats;
    stats.shots++;
    stats.lastShotUs = elapsed;
    stats.lastShotRays = stats.rays - raysBefore;
    stats.avgShotUs = stats.avgShotUs === 0 ? elapsed : stats.avgShotUs * 0.97 + elapsed * 0.03;
    if (elapsed > stats.peakShotUs) stats.peakShotUs = elapsed;
    return result;
  }

  private trace(options: FireBulletOptions): HitResult | null {
    this.struck.length = 0;
    this.log?.reset();
    this.origin.copy(options.origin);
    const length = this.dir.copy(options.direction).length();
    if (length < 1e-6) return null;
    this.dir.divideScalar(length);

    const power = Math.max(0, options.penetrationPower);
    const thicknessBudget = THICKNESS_BUDGET_BASE + THICKNESS_BUDGET_PER_POWER * power;
    const attacker = options.attacker;

    let energy = 1;
    let travelled = 0;
    let thicknessUsed = 0;
    let penetrations = 0;
    let ricochets = 0;
    let primary: MutableHitResult | null = null;
    let primaryIsEntity = false;
    let tracerPending = options.tracer;

    this.segmentStart.copy(this.origin);
    this.tracerFrom.copy(this.origin);
    this.gatherCandidates(this.origin, this.dir, attacker);

    for (let iteration = 0; iteration < MAX_PENETRATIONS + MAX_RICOCHETS + 2; iteration++) {
      const remaining = MAX_RANGE - travelled;
      if (remaining <= 0.01) break;

      const worldHit = this.castForward(this.segmentStart, this.dir, remaining, attacker);
      const segmentLength = worldHit ? worldHit.distance : remaining;
      const analytic = this.sweepSegment(travelled, segmentLength, attacker);

      // Nothing left to hit: draw the tracer out to the end of the flight.
      if (!worldHit && !analytic) {
        this.tracerEnd.copy(this.segmentStart).addScaledVector(this.dir, segmentLength);
        travelled += segmentLength;
        if (tracerPending) {
          this.deps.fx?.tracer(
            this.tracerFrom,
            this.tracerEnd,
            options.tracerColor,
            GAMEPLAY.combat.tracerSpeed,
          );
          tracerPending = false;
        }
        break;
      }

      const analyticWins =
        analytic && (!worldHit || this.sweepDistance <= worldHit.distance + 1e-4);
      const physicsEntity = worldHit?.userData?.entity ?? null;

      // --- character, whichever model found it first ------------------------
      if (analyticWins || physicsEntity) {
        let record: EntityRecord;
        let part: BodyPart;
        let hitDistance: number;
        let surface: SurfaceType = 'flesh';
        let userData: PhysicsUserData | null = null;

        if (analyticWins && this.sweepRecord) {
          record = this.sweepRecord;
          part = this.sweepPart;
          hitDistance = this.sweepDistance;
          this.point.copy(this.segmentStart).addScaledVector(this.dir, hitDistance);
          this.normal.copy(this.sweepNormal);
        } else if (worldHit && physicsEntity) {
          record = this.registry.ensure(physicsEntity);
          hitDistance = worldHit.distance;
          this.point.copy(worldHit.point);
          this.normal.copy(worldHit.normal);
          userData = worldHit.userData;
          surface = worldHit.surface;
          part =
            userData?.bodyPart ??
            partFromPoint(record.profile, record.position, this.point, this.dir);
        } else {
          break;
        }

        if (this.struck.indexOf(record.entity) !== -1) {
          // Already resolved this body earlier in the trace (the two hitbox models
          // found the same target). Step past it without spending energy twice.
          const advance = hitDistance + BODY_CHORD_FALLBACK + EXIT_SKIN;
          this.segmentStart.addScaledVector(this.dir, advance);
          travelled += advance;
          continue;
        }

        const distanceFromMuzzle = travelled + hitDistance;
        const damage = this.damageFor(options, distanceFromMuzzle, energy, part);

        const out = this.nextHit();
        out.hit = true;
        out.point.copy(this.point);
        out.normal.copy(this.normal);
        out.distance = distanceFromMuzzle;
        out.surface = surface;
        out.target = record.entity;
        out.bodyPart = part;
        out.object = userData?.object3D ?? null;

        this.impacts.resolve(this.point, this.normal, this.dir, surface, {
          energy,
          impulse: 0,
          destruction: 0,
          organic: surface === 'flesh',
          userData: null,
          silent: false,
        });
        this.applyBulletDamage(record, out, damage, options, distanceFromMuzzle, penetrations > 0);

        if (!primaryIsEntity) {
          primary = out;
          primaryIsEntity = true;
        }
        if (tracerPending) {
          this.deps.fx?.tracer(
            this.tracerFrom,
            this.point,
            options.tracerColor,
            GAMEPLAY.combat.tracerSpeed,
          );
          tracerPending = false;
        }

        // Bodies over-penetrate: soft tissue is cheap to cross, which is how one
        // rifle round lined up on two targets kills both.
        const chord = this.bodyChord(record, surface, power, energy, userData, hitDistance);
        const cost = penetrationCost(surface, chord, power);
        this.log?.push('entity', surface, distanceFromMuzzle, chord, cost, energy, damage, part);
        travelled = distanceFromMuzzle;
        thicknessUsed += chord;
        penetrations++;
        this.stats.penetrations++;
        energy = (energy - cost) * PENETRATION_TAX;
        if (
          energy < MIN_ENERGY ||
          penetrations >= MAX_PENETRATIONS ||
          thicknessUsed >= thicknessBudget
        ) {
          break;
        }
        this.segmentStart.copy(this.point).addScaledVector(this.dir, chord + EXIT_SKIN);
        travelled += chord + EXIT_SKIN;
        if (options.tracer) {
          this.tracerFrom.copy(this.segmentStart);
          tracerPending = true;
        }
        continue;
      }

      if (!worldHit) break;

      // --- world surface ---------------------------------------------------
      const surface = worldHit.surface;
      const userData = worldHit.userData;
      const distanceFromMuzzle = travelled + worldHit.distance;
      this.point.copy(worldHit.point);
      this.normal.copy(worldHit.normal);
      travelled = distanceFromMuzzle;

      const out = this.nextHit();
      out.hit = true;
      out.point.copy(this.point);
      out.normal.copy(this.normal);
      out.distance = distanceFromMuzzle;
      out.surface = surface;
      out.target = null;
      out.bodyPart = null;
      out.object = userData?.object3D ?? null;
      if (!primary) primary = out;
      this.log?.push('surface', surface, distanceFromMuzzle, 0, 0, energy, 0, null);

      this.impacts.resolve(this.point, this.normal, this.dir, surface, {
        energy,
        impulse: options.impulse * energy,
        destruction: 1,
        organic: false,
        userData,
        silent: false,
      });

      if (tracerPending) {
        this.deps.fx?.tracer(
          this.tracerFrom,
          this.point,
          options.tracerColor,
          GAMEPLAY.combat.tracerSpeed,
        );
        tracerPending = false;
      }

      const cosIncidence = Math.abs(this.dir.dot(this.normal));

      // Deflection is considered before penetration: a round arriving almost
      // parallel to a hard face leaves along it, it does not bore in.
      if (ricochets < MAX_RICOCHETS && this.rng.next() < ricochetChance(surface, cosIncidence, energy)) {
        ricochets++;
        this.stats.ricochets++;
        const retained = ricochetEnergyScale(cosIncidence);
        energy *= retained;
        this.log?.push('ricochet', surface, travelled, 0, 1 - retained, energy, 0, null);
        this.flushNearMisses(travelled, attacker);
        this.deflect(cosIncidence);
        if (energy < MIN_ENERGY) break;
        this.segmentStart.copy(this.point).addScaledVector(this.dir, EXIT_SKIN);
        this.gatherCandidates(this.segmentStart, this.dir, attacker);
        this.deps.audio?.play('bullet_ricochet', this.point, {
          volume: clamp(0.35 + energy * 0.5, 0.2, 0.95),
          pitch: this.rng.range(0.86, 1.22),
          refDistance: 6,
          maxDistance: 90,
        });
        // Worth showing even on a round that carried no tracer of its own.
        this.tracerEnd
          .copy(this.segmentStart)
          .addScaledVector(this.dir, Math.min(70, MAX_RANGE - travelled));
        this.deps.fx?.tracer(
          this.point,
          this.tracerEnd,
          options.tracerColor,
          GAMEPLAY.combat.tracerSpeed * 0.8,
          0.6,
        );
        this.tracerFrom.copy(this.segmentStart);
        tracerPending = false;
        continue;
      }

      if (power <= 0 || penetrations >= MAX_PENETRATIONS) break;

      const thickness = this.measureThickness(surface, userData, power, energy);
      if (thickness <= 0) break;
      const cost = penetrationCost(surface, thickness, power);
      if (cost >= energy || thicknessUsed + thickness > thicknessBudget) {
        this.log?.push('penetrate', surface, travelled, thickness, cost, 0, 0, null);
        break;
      }

      energy = (energy - cost) * PENETRATION_TAX;
      if (energy < MIN_ENERGY) {
        this.log?.push('penetrate', surface, travelled, thickness, cost, 0, 0, null);
        break;
      }
      this.log?.push('penetrate', surface, travelled, thickness, cost, energy, 0, null);
      thicknessUsed += thickness;
      penetrations++;
      this.stats.penetrations++;

      // Exit spall, so a penetrated wall is visibly holed on both faces.
      this.exit.copy(this.point).addScaledVector(this.dir, thickness);
      this.spallNormal.copy(this.dir).negate();
      const fx = this.deps.fx;
      if (fx) {
        fx.impact(this.exit, this.spallNormal, surface, energy * 0.7);
        fx.decal(this.exit, this.spallNormal, surface, SURFACE_BALLISTICS[surface].decalSize * 0.8);
      }

      this.segmentStart.copy(this.exit).addScaledVector(this.dir, EXIT_SKIN);
      travelled += thickness + EXIT_SKIN;
      if (options.tracer) {
        // Restart the visible trace on the far side of the slab.
        this.tracerFrom.copy(this.segmentStart);
        tracerPending = true;
      }
    }

    this.flushNearMisses(travelled, attacker);
    return primary;
  }

  // -------------------------------------------------------------------------
  // Casting
  // -------------------------------------------------------------------------

  private castForward(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    attacker: Damageable | null,
  ): PhysicsRaycastHit | null {
    const physics = this.deps.physics;
    if (!physics) return null;
    const options = this.rayOptions;
    options.maxDistance = maxDistance;
    (options.exclude as unknown[])[0] = attacker;
    this.stats.rays++;
    let hit = physics.raycast(origin, direction, options);

    // Defence in depth: if the shooter's own collider carries no entity tag the
    // exclusion list cannot filter it and every shot would die at range zero.
    let guard = 0;
    while (hit !== null && attacker !== null && hit.userData?.entity === attacker && guard++ < 2) {
      const advance = hit.distance + 0.1;
      if (advance >= maxDistance) return null;
      this.probe.copy(origin).addScaledVector(direction, advance);
      options.maxDistance = maxDistance - advance;
      this.stats.rays++;
      hit = physics.raycast(this.probe, direction, options);
      if (hit) hit.distance += advance;
    }
    return hit;
  }

  /**
   * Thickness of the slab just entered, via a back-face raycast.
   *
   * The probe is placed at the furthest point the round could possibly reach
   * inside this material and cast back towards the entry: the first surface it
   * meets on the way home is the exit face. When the probe lands beyond a
   * *different* collider the reading would span an air gap, so it is pulled in and
   * retried. A probe that ends up still inside the material reports a hit at zero
   * distance, which correctly reads as "at least this thick".
   */
  private measureThickness(
    surface: SurfaceType,
    entryUserData: PhysicsUserData | null,
    power: number,
    energy: number,
  ): number {
    const physics = this.deps.physics;
    if (!physics) return 0;
    const crossable = maxCrossableThickness(surface, power, energy);
    if (crossable <= 0) return 0;

    let probeDistance = Math.min(crossable + PROBE_SKIN, PROBE_CEILING);
    const options = this.probeOptions;
    (options.exclude as unknown[])[0] = null;
    this.back.copy(this.dir).negate();

    for (let attempt = 0; attempt <= PROBE_REFINEMENTS; attempt++) {
      this.probe.copy(this.point).addScaledVector(this.dir, probeDistance);
      options.maxDistance = probeDistance;
      this.stats.rays++;
      const hit = physics.raycast(this.probe, this.back, options);
      if (!hit) {
        // Nothing behind the face at all: a one-sided or degenerate collider.
        // Treat it as thin rather than impassable — grates and mesh live here.
        return Math.min(0.05, probeDistance);
      }
      if (sameCollider(hit.userData, entryUserData, hit.surface, surface)) {
        return clamp(probeDistance - hit.distance, 0.002, probeDistance);
      }
      // Landed past something else; the exit face is nearer than that.
      const shrunk = (probeDistance - hit.distance) * 0.96;
      if (shrunk <= 0.004) return 0.004;
      probeDistance = shrunk;
    }
    return clamp(probeDistance, 0.004, PROBE_CEILING);
  }

  /**
   * Distance through a body. Physics hitboxes are measured for real; the analytic
   * model uses the chord of its own capsule, which is the same idea one level up.
   */
  private bodyChord(
    record: EntityRecord,
    surface: SurfaceType,
    power: number,
    energy: number,
    userData: PhysicsUserData | null,
    hitDistance: number,
  ): number {
    if (userData !== null) {
      const measured = this.measureThickness(surface, userData, power, energy);
      if (measured > 0.01) return Math.min(measured, 0.6);
    }
    this.probe.copy(this.segmentStart).addScaledVector(this.dir, hitDistance + 0.9);
    this.back.copy(this.dir).negate();
    if (rayHitbox(record.profile, record.position, this.probe, this.back, 0.9, this.hitboxHit)) {
      return clamp(0.9 - this.hitboxHit.t, 0.06, 0.6);
    }
    return BODY_CHORD_FALLBACK;
  }

  /** Reflects the travel direction about the surface normal, with a little scatter. */
  private deflect(cosIncidence: number): void {
    this.reflect.copy(this.normal).multiplyScalar(2 * this.dir.dot(this.normal));
    this.dir.sub(this.reflect).normalize();
    const scatter = 0.06 + 0.14 * cosIncidence;
    this.dir.x += this.rng.range(-scatter, scatter);
    this.dir.y += this.rng.range(-scatter, scatter);
    this.dir.z += this.rng.range(-scatter, scatter);
    this.dir.normalize();
    // Never let the scatter push the round back into the face it just left.
    const into = this.dir.dot(this.normal);
    if (into < 0.02) this.dir.addScaledVector(this.normal, 0.05 - into).normalize();
  }

  // -------------------------------------------------------------------------
  // Characters
  // -------------------------------------------------------------------------

  /**
   * One linear pass over live entities per flight direction, recording how close
   * the round passes each of them and how far along that happens. Everything the
   * rest of the trace needs about characters — hit tests, suppression, the near
   * miss crack — is driven off this list, so the per-segment work is proportional
   * to the handful of bodies actually near the line rather than to the roster.
   */
  private gatherCandidates(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    attacker: Damageable | null,
  ): void {
    this.candidateCount = 0;
    this.candidates.length = 0;
    const records = this.registry.records;
    for (let i = 0; i < records.length && this.candidateCount < MAX_CANDIDATES; i++) {
      const record = records[i];
      const entity = record.entity;
      if (entity === attacker || !entity.isAlive) continue;
      const approach = this.project(record, origin, direction);
      // Wide enough for both jobs: the crack radius, and any part of a body the
      // round could still intersect on a target taller than the crack radius.
      if (approach > Math.max(WHIZZ_RADIUS, hitboxBound(record.profile))) continue;
      const slot = this.candidateCount++;
      this.candidates.push(record);
      this.candidateAlong[slot] = this.projectedAlong;
      this.candidateApproach[slot] = approach;
    }
  }

  /**
   * Perpendicular distance from the entity's centre of mass to the ray, with the
   * distance along the ray left in `projectedAlong`. Analytic, no sampling.
   */
  private project(
    record: EntityRecord,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
  ): number {
    const profile = record.profile;
    const position = record.position;
    const cy = position.y - profile.feetOffset + profile.height * CENTRE_OF_MASS;
    const mx = position.x - origin.x;
    const my = cy - origin.y;
    const mz = position.z - origin.z;
    const along = clamp(mx * direction.x + my * direction.y + mz * direction.z, 0, MAX_RANGE);
    this.projectedAlong = along;
    const ex = mx - direction.x * along;
    const ey = my - direction.y * along;
    const ez = mz - direction.z * along;
    return Math.sqrt(ex * ex + ey * ey + ez * ez);
  }

  /**
   * Nearest analytic hitbox intersection within one segment. Only candidates whose
   * closest approach falls inside the segment are tested.
   */
  private sweepSegment(
    travelled: number,
    segmentLength: number,
    attacker: Damageable | null,
  ): boolean {
    this.sweepRecord = null;
    if (this.candidateCount === 0) return false;
    const from = travelled - 1.2;
    const to = travelled + segmentLength + 1.2;

    for (let i = 0; i < this.candidateCount; i++) {
      const along = this.candidateAlong[i];
      if (along < from || along > to) continue;
      const record = this.candidates[i];
      const entity = record.entity;
      if (entity === attacker || !entity.isAlive) continue;
      if (this.candidateApproach[i] > hitboxBound(record.profile)) continue;
      if (this.struck.indexOf(entity) !== -1) continue;
      if (
        !rayHitbox(
          record.profile,
          record.position,
          this.segmentStart,
          this.dir,
          segmentLength,
          this.hitboxHit,
        )
      ) {
        continue;
      }
      if (this.sweepRecord === null || this.hitboxHit.t < this.sweepDistance) {
        this.sweepRecord = record;
        this.sweepDistance = this.hitboxHit.t;
        this.sweepPart = this.hitboxHit.part;
        this.sweepNormal.set(
          this.hitboxHit.normalX,
          this.hitboxHit.normalY,
          this.hitboxHit.normalZ,
        );
      }
    }
    return this.sweepRecord !== null;
  }

  /**
   * Supersonic crack past everything the round actually flew past. AI gets
   * suppressed, the local player gets an event and a snap so audio and the HUD can
   * react. Suppression is rate-limited per entity so a burst is one reaction, not
   * thirty.
   */
  private flushNearMisses(travelled: number, attacker: Damageable | null): void {
    if (this.candidateCount === 0) return;
    const local = this.registry.localEntity;
    const now = this.deps.now();

    for (let i = 0; i < this.candidateCount; i++) {
      const along = this.candidateAlong[i];
      if (along > travelled + 0.5) continue;
      const record = this.candidates[i];
      const entity = record.entity;
      if (this.struck.indexOf(entity) !== -1) continue;
      const approach = this.candidateApproach[i];
      if (approach > WHIZZ_RADIUS) continue;
      // Consumed, so a second pass after a deflection does not repeat it.
      this.candidateAlong[i] = MAX_RANGE + 1;
      this.stats.whizzBys++;

      // Report the crack at the body rather than at the point of closest approach:
      // suppression and the HUD flinch both care about who was shot at, and this
      // stays correct after a deflection moved the origin of the flight.
      const profile = record.profile;
      this.crackPoint.set(
        record.position.x,
        record.position.y - profile.feetOffset + profile.height * CENTRE_OF_MASS,
        record.position.z,
      );

      if (entity === local) {
        const payload = this.nearMissPayload;
        payload.point.copy(this.crackPoint);
        payload.direction.copy(this.dir);
        payload.distance = approach;
        payload.attacker = attacker;
        payload.victim = entity;
        payload.isLocalPlayer = true;
        this.deps.emit('combat:nearmiss', payload);
        this.deps.audio?.play('bullet_whizz', this.crackPoint, {
          volume: clamp(1 - approach / WHIZZ_RADIUS, 0.25, 1),
          pitch: this.rng.range(0.9, 1.15),
          refDistance: 2,
          maxDistance: 14,
        });
        continue;
      }

      if (this.registry.claimSuppression(record, now)) {
        this.deps.ai?.suppress(
          this.crackPoint,
          WHIZZ_SUPPRESS_RADIUS,
          WHIZZ_SUPPRESS_DURATION * (1 - approach / (WHIZZ_RADIUS * 2)),
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Damage
  // -------------------------------------------------------------------------

  /**
   * Range falloff on a smooth curve rather than a straight line, so the drop is
   * gentle where the player expects the weapon to be reliable and steep once it is
   * out of its band. Energy already carries the penetration losses.
   */
  damageFor(
    options: FireBulletOptions,
    distance: number,
    energy: number,
    part: BodyPart,
  ): number {
    const floor = Math.max(options.minDamageScale, GAMEPLAY.combat.minDamageScale);
    const start = Math.min(options.falloffStart, options.falloffEnd);
    const end = Math.max(options.falloffStart + 0.01, options.falloffEnd);
    const t = smoothstep(start, end, distance);
    const range = 1 + (floor - 1) * t;
    return options.damage * range * saturate(energy) * partMultiplier(part);
  }

  private applyBulletDamage(
    record: EntityRecord,
    result: MutableHitResult,
    damage: number,
    options: FireBulletOptions,
    distance: number,
    penetrated: boolean,
  ): void {
    const headshot = result.bodyPart === 'head';
    this.struck.push(record.entity);
    this.stats.entityHits++;
    if (headshot) this.stats.headshots++;

    const info = this.nextInfo();
    info.amount = damage;
    info.source = options.attacker;
    info.point.copy(result.point);
    info.direction.copy(this.dir);
    info.bodyPart = result.bodyPart ?? 'chest';
    info.type = 'bullet';
    info.impulse = options.impulse;
    info.weaponId = options.weaponId;
    info.distance = distance;
    info.isHeadshot = headshot;
    info.isPenetrating = penetrated;

    const payload = this.hitPayload;
    payload.result = result;
    payload.damage = damage;
    payload.isHeadshot = headshot;
    payload.attacker = options.attacker;
    this.deps.emit('combat:hit', payload);

    this.registry.applyDamage(record.entity, info);
  }

  // -------------------------------------------------------------------------

  nextHit(): MutableHitResult {
    const hit = this.hitRing[this.hitCursor];
    this.hitCursor = (this.hitCursor + 1) % HIT_RING;
    return hit;
  }

  nextInfo(): MutableDamageInfo {
    const info = this.infoRing[this.infoCursor];
    this.infoCursor = (this.infoCursor + 1) % INFO_RING;
    return info;
  }

  countRay(): void {
    this.stats.rays++;
  }

  resetStats(): void {
    const stats = this.stats;
    stats.shots = 0;
    stats.rays = 0;
    stats.penetrations = 0;
    stats.ricochets = 0;
    stats.entityHits = 0;
    stats.headshots = 0;
    stats.whizzBys = 0;
    stats.avgShotUs = 0;
    stats.peakShotUs = 0;
  }
}

export function partMultiplier(part: BodyPart): number {
  switch (part) {
    case 'head':
      return GAMEPLAY.combat.headshotMultiplier;
    case 'neck':
      return GAMEPLAY.combat.headshotMultiplier * 0.72;
    case 'arm':
    case 'leg':
    case 'foot':
      return GAMEPLAY.combat.limbMultiplier;
    case 'stomach':
      return 0.95;
    default:
      return 1;
  }
}

/**
 * Whether two hits came off the same piece of geometry. The world hands every
 * collider its own user-data record, so identity is exact where it exists and the
 * surface classification is a reasonable stand-in where it is not.
 */
function sameCollider(
  a: PhysicsUserData | null,
  b: PhysicsUserData | null,
  surfaceA: SurfaceType,
  surfaceB: SurfaceType,
): boolean {
  if (a !== null && b !== null) return a === b;
  return surfaceA === surfaceB;
}
