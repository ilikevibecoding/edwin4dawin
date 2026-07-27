import * as THREE from 'three';
import type { WeaponDefinition } from '../core/Contracts';
import { clamp, DEG2RAD, saturate, TAU, type Rng } from '../core/MathUtils';
import { patternRandomness, recoilPatternFor, samplePattern, type RecoilPattern } from './WeaponDefs';

/**
 * Cone of fire and recoil bookkeeping.
 *
 * Spread and recoil are the two numbers a player learns without ever being told
 * them, so both are modelled explicitly rather than folded into a single "sway"
 * value: spread is where the bullet may go, recoil is where the gun is pointing.
 * A player can compensate for the second and never for the first, which is why
 * they must not be the same number.
 */

/** State of one weapon's cone of fire. Lives with the weapon, not the shooter. */
export class SpreadState {
  /** Bloom accumulated from firing, in degrees. */
  bloom = 0;
  /** Resolved half-angle of the cone this frame, in radians. */
  current = 0;

  reset(): void {
    this.bloom = 0;
    this.current = 0;
  }

  /**
   * `moveFactor` is horizontal speed over walk speed, so walking is 1 and
   * sprinting is about 1.6. Airborne fire is the worst case in every shooter
   * worth copying, hence the separate multiplier.
   */
  update(
    dt: number,
    def: WeaponDefinition,
    ads: number,
    moveFactor: number,
    airborne: boolean,
    crouched: boolean,
  ): number {
    this.bloom = Math.max(0, this.bloom - def.spreadRecovery * dt);
    const base = def.spreadHip + (def.spreadAds - def.spreadHip) * ads;
    const move = def.spreadMoving * clamp(moveFactor, 0, 1.8) * (1 - ads * 0.45);
    const stance = crouched ? 0.82 : 1;
    const air = airborne ? 2.1 : 1;
    const degrees = Math.min(def.spreadMax, (base + move + this.bloom) * stance * air);
    this.current = degrees * DEG2RAD;
    return this.current;
  }

  addShot(def: WeaponDefinition, ads: number): void {
    this.bloom = Math.min(def.spreadMax, this.bloom + def.spreadPerShot * (1 - ads * 0.3));
  }
}

/**
 * Recoil accumulator.
 *
 * The authored pattern is walked by shot index and the random component fades in
 * as the burst goes on, which is what makes the first ten rounds of a spray
 * learnable and the rest a decision to stop shooting. The index decays with the
 * weapon's recovery rate, so a short burst restarts near the top of the pattern.
 */
export class RecoilState {
  private pattern: RecoilPattern;
  /** Fractional position along the pattern. */
  index = 0;

  constructor(weaponId: string) {
    this.pattern = recoilPatternFor(weaponId);
  }

  setWeapon(weaponId: string): void {
    this.pattern = recoilPatternFor(weaponId);
    this.index = 0;
  }

  reset(): void {
    this.index = 0;
  }

  update(dt: number, def: WeaponDefinition, firing: boolean): void {
    if (firing) return;
    // Recovery walks the index back down rather than snapping it, so tapping
    // does not fully reset a pattern the player is riding.
    this.index = Math.max(0, this.index - def.recoilRecovery * 0.42 * dt);
  }

  /**
   * Produces the recoil for one shot, in degrees. `pitch` is upward, `yaw`
   * positive to the right, `roll` is a unitless twist for the viewmodel.
   */
  next(def: WeaponDefinition, ads: number, rng: Rng, out: RecoilImpulse): RecoilImpulse {
    samplePattern(this.pattern, this.index, SAMPLE);
    const rand = patternRandomness(this.pattern, this.index);
    const adsScale = 1 - ads * 0.28;

    const jitterPitch = rng.gaussian(0, 0.42) * def.recoilRandom * rand;
    const jitterYaw = rng.gaussian(0, 0.55) * def.recoilRandom * rand;

    out.pitch = (def.recoilPitch * SAMPLE.y + jitterPitch) * adsScale;
    out.yaw = (def.recoilYaw * SAMPLE.x + jitterYaw) * adsScale;
    out.roll = (SAMPLE.x * 0.5 + rng.range(-0.4, 0.4) * rand) * def.recoilYaw * 0.6;
    this.index += 1;
    return out;
  }
}

export interface RecoilImpulse {
  pitch: number;
  yaw: number;
  roll: number;
}

export const createRecoilImpulse = (): RecoilImpulse => ({ pitch: 0, yaw: 0, roll: 0 });

const SAMPLE = { x: 0, y: 0 };

// ---------------------------------------------------------------------------
// Cone sampling
// ---------------------------------------------------------------------------

const AXIS_A = /* @__PURE__ */ new THREE.Vector3();
const AXIS_B = /* @__PURE__ */ new THREE.Vector3();
const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

/**
 * Perturbs `direction` inside a cone of `halfAngle`. The radius is distributed
 * as sqrt(u) so shots are uniform over the disc rather than clustered dead
 * centre — a linear radius makes a wide-spread weapon feel misleadingly accurate.
 */
export function spreadDirection(
  direction: THREE.Vector3,
  halfAngle: number,
  rng: Rng,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.copy(direction).normalize();
  if (halfAngle <= 1e-6) return out;
  basis(out);
  const a = rng.next() * TAU;
  const r = Math.tan(halfAngle) * Math.sqrt(rng.next());
  return out
    .addScaledVector(AXIS_A, Math.cos(a) * r)
    .addScaledVector(AXIS_B, Math.sin(a) * r)
    .normalize();
}

/**
 * Shotgun pattern. Real buckshot is denser in the middle with a ragged fringe,
 * so the pellets are laid on concentric rings — one down the bore, an inner ring
 * at 45% of the cone and the rest on the fringe — with a small jitter per pellet
 * and a per-shot roll so consecutive shots never print the same rosette.
 */
export function pelletPattern(
  direction: THREE.Vector3,
  halfAngle: number,
  count: number,
  rng: Rng,
  out: THREE.Vector3[],
): THREE.Vector3[] {
  const forward = AXIS_C.copy(direction).normalize();
  basis(forward);
  const roll = rng.next() * TAU;
  const inner = Math.max(1, Math.round((count - 1) * 0.36));
  const outer = count - 1 - inner;

  for (let i = 0; i < count; i++) {
    const v = out[i] ?? (out[i] = new THREE.Vector3());
    v.copy(forward);
    if (i === 0) {
      // The centre pellet keeps the bore line so point blank always connects.
      jitter(v, halfAngle * 0.1, rng);
      continue;
    }
    let radius: number;
    let angle: number;
    if (i <= inner) {
      const t = (i - 1) / inner;
      radius = halfAngle * 0.45;
      angle = roll + t * TAU;
    } else {
      const t = (i - inner - 1) / Math.max(1, outer);
      radius = halfAngle * 0.92;
      angle = roll + Math.PI / inner + t * TAU;
    }
    const r = Math.tan(radius) * rng.range(0.82, 1.12);
    v.addScaledVector(AXIS_A, Math.cos(angle) * r).addScaledVector(AXIS_B, Math.sin(angle) * r);
    jitter(v, halfAngle * 0.12, rng);
  }
  out.length = count;
  return out;
}

const AXIS_C = /* @__PURE__ */ new THREE.Vector3();
const JITTER = /* @__PURE__ */ new THREE.Vector3();

function jitter(v: THREE.Vector3, halfAngle: number, rng: Rng): void {
  if (halfAngle <= 1e-6) {
    v.normalize();
    return;
  }
  const a = rng.next() * TAU;
  const r = Math.tan(halfAngle) * Math.sqrt(rng.next());
  JITTER.copy(AXIS_A).multiplyScalar(Math.cos(a) * r).addScaledVector(AXIS_B, Math.sin(a) * r);
  v.add(JITTER).normalize();
}

/** Fills AXIS_A/AXIS_B with an orthonormal basis perpendicular to `forward`. */
function basis(forward: THREE.Vector3): void {
  const up = Math.abs(forward.y) > 0.985 ? FALLBACK_UP : UP;
  AXIS_A.crossVectors(up, forward).normalize();
  AXIS_B.crossVectors(forward, AXIS_A).normalize();
}

const FALLBACK_UP = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);

// ---------------------------------------------------------------------------
// Rate of fire
// ---------------------------------------------------------------------------

/**
 * Exact rate limiting. Time owed is accumulated in seconds rather than counted
 * in frames, so a 1150 rpm weapon fires 19.17 rounds per second at any frame
 * rate and can legitimately produce two shots in one 60 Hz frame.
 */
export class FireClock {
  private credit = 0;
  interval = 0.1;

  setRpm(rpm: number): void {
    this.interval = 60 / Math.max(1, rpm);
  }

  /** Call once per frame; then call `take()` until it returns false. */
  advance(dt: number, maxBurst = 4): void {
    this.credit = Math.min(this.credit + dt, this.interval * maxBurst);
  }

  get ready(): boolean {
    return this.credit >= this.interval;
  }

  take(): boolean {
    if (this.credit < this.interval) return false;
    this.credit -= this.interval;
    return true;
  }

  /** Fills the clock so the next trigger pull fires immediately. */
  prime(): void {
    this.credit = this.interval;
  }

  /** Empties the clock; used after a reload or a weapon switch. */
  clear(): void {
    this.credit = 0;
  }

  /** Blocks firing for `seconds`, for bolt cycling and pump actions. */
  hold(seconds: number): void {
    this.credit = -seconds;
  }
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

/** Damage at range, matching the falloff the combat system applies. */
export function damageAt(def: WeaponDefinition, distance: number): number {
  if (distance <= def.falloffStart) return def.damage;
  if (distance >= def.falloffEnd) return def.damage * def.minDamageScale;
  const t = (distance - def.falloffStart) / (def.falloffEnd - def.falloffStart);
  return def.damage * (1 + (def.minDamageScale - 1) * t);
}

/** Shots to kill 100 HP at range, for the loadout screen and for balance tests. */
export function shotsToKill(def: WeaponDefinition, distance: number, health = 100): number {
  const per = damageAt(def, distance) * Math.max(1, def.pellets ?? 1) * (def.pellets ? 0.72 : 1);
  return per <= 0 ? Infinity : Math.ceil(health / per);
}

/** Ragdoll impulse for one round; heavy calibres shove, 9 mm does not. */
export function impulseFor(def: WeaponDefinition): number {
  const perShot = def.damage * (def.pellets ? 0.4 : 1);
  return clamp(perShot * 0.14 + def.penetrationPower * 1.2, 0.6, 26);
}

/** Muzzle-flash scale, so a .338 flashes noticeably harder than a 9 mm. */
export function flashScale(def: WeaponDefinition): number {
  const size = saturate((def.damage * (def.pellets ?? 1)) / 130);
  return 0.55 + size * 0.9 + (def.class === 'launcher' ? 1.4 : 0);
}
