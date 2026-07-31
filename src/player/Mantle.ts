/**
 * Mantling and vaulting.
 *
 * The character controller already climbs anything up to `stepHeight` (0.42 m) at
 * any speed, so this only has to deal with crests above that and below
 * `mantleMaxHeight`. Detection is four to seven rays and answers three questions:
 * is there a face in front of me, where is its crest, and can I actually stand on
 * the other side.
 *
 * The result is classified rather than uniform. A waist-high wall is a *vault*:
 * one continuous arc, up and over, landing on whatever the far side offers, and
 * fast. A chest-high roof edge is a *mantle*: rise first, translate second, and
 * noticeably slower, because the difference between hopping a railing and hauling
 * yourself onto a roof is most of what sells either one.
 *
 * While a mantle plays out the capsule is driven directly with `setPosition`,
 * which means collisions are not being resolved — so the destination is verified
 * before the movement starts and re-verified while it runs, and the whole thing
 * is abandoned the moment it stops being valid.
 */
import * as THREE from 'three';
import type { CharacterControllerHandle, PhysicsSystem } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import {
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  saturate,
  smoothstep,
} from '../core/MathUtils';
import type { PlayerState } from './State';
import { COS_MAX_SLOPE, CROUCH_HEIGHT, SOLID_GROUPS, TUNE } from './Tuning';

const P = GAMEPLAY.player;
const DOWN = /* @__PURE__ */ new THREE.Vector3(0, -1, 0);
const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

export type MantleKind = 'vault' | 'mantle';

export class Mantle {
  active = false;
  kind: MantleKind = 'vault';
  /** Crest height above the feet at the moment of the trigger, metres. */
  ledgeHeight = 0;

  private readonly start = new THREE.Vector3();
  private readonly end = new THREE.Vector3();
  private readonly point = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly exclude: unknown[] = [null];

  private crestY = 0;
  private riseFraction: number = TUNE.mantleRiseFraction;
  private duration: number = P.mantleDuration;
  private time = 0;
  private recheck = 0;
  private side = 1;
  /** A probe that found nothing is not repeated every step; walls do not move. */
  private retryDelay = 0;
  /**
   * A probe that found a ledge too high to vault. Only the automatic trigger
   * backs off on this: a deliberate jump at a roof edge has to answer instantly,
   * so it re-probes even when walking into the same edge just declined to.
   */
  private highDelay = 0;

  reset(): void {
    this.active = false;
    this.time = 0;
    this.retryDelay = 0;
    this.highDelay = 0;
  }

  tick(dt: number): void {
    this.retryDelay = Math.max(0, this.retryDelay - dt);
    this.highDelay = Math.max(0, this.highDelay - dt);
  }

  /**
   * Look for a ledge and start the movement if one is there.
   *
   * `allowHigh` is false for the automatic trigger, so walking into a wall vaults
   * a railing but never spontaneously hauls you onto a roof — that always takes a
   * deliberate jump.
   */
  tryStart(
    s: PlayerState,
    handle: CharacterControllerHandle,
    physics: PhysicsSystem,
    allowHigh: boolean,
  ): boolean {
    if (this.active || this.retryDelay > 0 || !physics.ready) return false;
    if (!allowHigh && this.highDelay > 0) return false;
    if (s.stance === 'prone' || s.proneAmount > 0.05) return false;

    this.exclude[0] = handle;
    if (!this.probe(s, physics)) {
      this.retryDelay = TUNE.mantleRecheck * 2.5;
      return false;
    }
    if (!allowHigh && this.kind !== 'vault') {
      this.highDelay = TUNE.mantleRecheck * 2.5;
      return false;
    }

    this.active = true;
    this.time = 0;
    this.recheck = TUNE.mantleRecheck;
    this.side = s.velocity.x * -this.dir.z + s.velocity.z * this.dir.x >= 0 ? 1 : -1;
    this.riseFraction =
      this.kind === 'vault' ? TUNE.vaultRiseFraction : TUNE.mantleRiseFraction;
    this.duration =
      this.kind === 'vault'
        ? P.mantleDuration * TUNE.vaultDurationScale
        : P.mantleDuration * (1 + TUNE.mantleDurationGain * saturate(this.ledgeHeight / P.mantleMaxHeight));

    s.stance = 'mantle';
    s.mantleAmount = 0;
    s.velocity.set(0, 0, 0);
    s.grounded = false;
    s.blockedTime = 0;
    return true;
  }

  /** Advance the scripted movement. Clears `active` when it finishes or is cancelled. */
  step(dt: number, s: PlayerState, handle: CharacterControllerHandle, physics: PhysicsSystem): void {
    if (!this.active) return;

    this.time += dt;
    const t = saturate(this.time / this.duration);

    this.recheck -= dt;
    if (this.recheck <= 0 && t < 0.85) {
      this.recheck = TUNE.mantleRecheck;
      if (!this.clearAt(physics, this.end.x, this.end.y, this.end.z)) {
        this.cancel(s);
        return;
      }
    }

    // Vertical is a rise to the crest then a settle onto the far side; the two
    // halves meet exactly at the crest so there is no seam.
    const y =
      t < this.riseFraction
        ? lerp(this.start.y, this.crestY, easeOutCubic(saturate(t / this.riseFraction)))
        : lerp(
            this.crestY,
            this.end.y,
            easeInCubic(saturate((t - this.riseFraction) / (1 - this.riseFraction))),
          );
    // A vault flows through the obstacle; a mantle holds position until the pull-up
    // has actually lifted the body.
    const across = this.kind === 'vault' ? easeInOutCubic(t) : smoothstep(0.18, 1, t);

    this.point.set(
      lerp(this.start.x, this.end.x, across),
      y,
      lerp(this.start.z, this.end.z, across),
    );
    handle.setPosition(this.point);
    s.feet.copy(this.point);
    s.velocity.set(0, 0, 0);
    s.grounded = false;
    s.airTime = 0;
    s.groundTime = 0;
    s.speed = 0;
    s.stepDistance = 0;
    s.mantleAmount = t;

    // Eyes go to the ledge on the way up and come back level on the way over.
    const gaze = Math.sin(saturate(t / 0.78) * Math.PI);
    const weight = this.kind === 'mantle' ? 1 : 0.55;
    s.mantlePitch = -0.17 * gaze * weight;
    s.mantleRoll = 0.055 * gaze * this.side * weight;
    s.mantleDip = -0.05 * gaze * weight;

    if (t >= 1) this.finish(s, handle);
  }

  cancel(s: PlayerState): void {
    if (!this.active) return;
    this.active = false;
    this.time = 0;
    // Longer than an ordinary miss: whatever moved into the destination is still
    // there, and retrying straight into a cancel would read as a stutter.
    this.retryDelay = TUNE.mantleRecheck * 4;
    this.highDelay = TUNE.mantleRecheck * 4;
    this.clearCamera(s);
    if (s.stance === 'mantle') s.stance = 'stand';
    s.velocity.set(0, 0, 0);
    s.grounded = false;
  }

  private finish(s: PlayerState, handle: CharacterControllerHandle): void {
    this.active = false;
    this.time = 0;
    handle.setPosition(this.end);
    s.feet.copy(this.end);
    // Hand the momentum back so a vault reads as one continuous move rather than
    // stopping dead on top of the obstacle.
    s.velocity.set(this.dir.x * TUNE.mantleExitSpeed, 0, this.dir.z * TUNE.mantleExitSpeed);
    s.grounded = false;
    s.stance = 'stand';
    this.clearCamera(s);
  }

  private clearCamera(s: PlayerState): void {
    s.mantleAmount = 0;
    s.mantlePitch = 0;
    s.mantleRoll = 0;
    s.mantleDip = 0;
  }

  // -------------------------------------------------------------------------
  // Detection
  // -------------------------------------------------------------------------

  private probe(s: PlayerState, physics: PhysicsSystem): boolean {
    const feet = s.feet;
    const fx = -Math.sin(s.yaw);
    const fz = -Math.cos(s.yaw);
    this.dir.set(fx, 0, fz);

    const radius = P.radius;
    const reach = radius + TUNE.mantleReach;

    // Waist and chest together: a face the waist can see is climbable whether or
    // not the chest sees it, and taking the nearer of the two keeps a railing from
    // being measured against the building behind it.
    this.origin.set(feet.x, feet.y + TUNE.mantleWaistHeight, feet.z);
    const waist = physics.raycast(this.origin, this.dir, {
      maxDistance: reach,
      groups: SOLID_GROUPS,
      exclude: this.exclude,
    });
    const waistDistance = waist ? waist.distance : Infinity;
    const waistNormalY = waist ? waist.normal.y : 0;
    const waistFacing = waist ? waist.normal.x * fx + waist.normal.z * fz : 0;

    this.origin.set(feet.x, feet.y + TUNE.mantleChestHeight, feet.z);
    const chest = physics.raycast(this.origin, this.dir, {
      maxDistance: reach,
      groups: SOLID_GROUPS,
      exclude: this.exclude,
    });

    let faceDistance: number;
    let normalY: number;
    let facing: number;
    if (waist && (!chest || waistDistance <= chest.distance)) {
      faceDistance = waistDistance;
      normalY = waistNormalY;
      facing = waistFacing;
    } else if (chest) {
      faceDistance = chest.distance;
      normalY = chest.normal.y;
      facing = chest.normal.x * fx + chest.normal.z * fz;
    } else {
      return false;
    }

    // A near-horizontal normal is a face; anything else is a slope the controller
    // should be walking up instead.
    if (Math.abs(normalY) > 0.5) return false;
    if (facing > -0.3) return false;

    const px = feet.x + fx * (faceDistance + TUNE.mantleProbeInset);
    const pz = feet.z + fz * (faceDistance + TUNE.mantleProbeInset);
    const probeTop = feet.y + P.mantleMaxHeight + TUNE.mantleProbeLift;
    this.origin.set(px, probeTop, pz);
    const crest = physics.raycast(this.origin, DOWN, {
      maxDistance: probeTop - feet.y,
      groups: SOLID_GROUPS,
      exclude: this.exclude,
    });
    // No crest inside the probe means the wall is taller than the probe is long —
    // a ray that starts inside the solid reports distance zero and so measures the
    // full probe height, which fails the limit below for the same reason.
    if (!crest) return false;
    if (crest.normal.y < COS_MAX_SLOPE) return false;

    const crestY = crest.point.y;
    const height = crestY - feet.y;
    if (height <= P.stepHeight + 0.02 || height > P.mantleMaxHeight) return false;

    const kind: MantleKind = height <= TUNE.vaultMaxHeight ? 'vault' : 'mantle';
    const inset = radius + TUNE.mantleDestInset;
    const dx = px + fx * inset;
    const dz = pz + fz * inset;

    // Where the feet end up. A vault is allowed to drop onto the far side of the
    // obstacle; a pull-up has to land level with the crest it just climbed.
    const drop = kind === 'vault' ? TUNE.vaultDropMax : 0.35;
    this.origin.set(dx, crestY + 0.3, dz);
    const floor = physics.raycast(this.origin, DOWN, {
      maxDistance: 0.3 + drop,
      groups: SOLID_GROUPS,
      exclude: this.exclude,
    });
    if (!floor) return false;
    if (floor.normal.y < COS_MAX_SLOPE) return false;
    const destY = floor.point.y;
    if (destY > crestY + 0.06) return false;

    if (!this.clearAt(physics, dx, destY, dz)) return false;

    this.kind = kind;
    this.ledgeHeight = height;
    this.start.copy(feet);
    this.end.set(dx, destY, dz);
    this.crestY = crestY + (kind === 'vault' ? TUNE.vaultCrestLift : TUNE.mantleCrestLift);
    return true;
  }

  /**
   * Standing room at the destination, tested with three upward rays across the
   * capsule footprint plus the tangent pair, which is enough to catch a low
   * ceiling, a soffit or a second wall right behind the first. Rays rather than a
   * shape cast because the shape cast ignores an overlap it starts inside, which
   * is exactly the case that matters here.
   */
  private clearAt(physics: PhysicsSystem, x: number, y: number, z: number): boolean {
    const need = CROUCH_HEIGHT + TUNE.mantleClearance;
    const tx = -this.dir.z * P.radius * 0.62;
    const tz = this.dir.x * P.radius * 0.62;
    for (let i = -1; i <= 1; i++) {
      this.origin.set(x + tx * i, y + 0.06, z + tz * i);
      const hit = physics.raycast(this.origin, UP, {
        maxDistance: need - 0.06,
        groups: SOLID_GROUPS,
        exclude: this.exclude,
      });
      if (hit) return false;
    }
    return true;
  }
}
