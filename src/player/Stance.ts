/**
 * Stance, sprint and lean.
 *
 * One state machine over `stand | crouch | prone | slide | mantle` plus the two
 * modifiers that ride on top of it. The mantle state is entered and owned by
 * `Mantle`; everything else is resolved here.
 *
 * Two things make this behave rather than fight the player:
 *
 * - **Height is continuous, the stance is discrete.** The capsule interpolates
 *   towards the height its stance wants, and the speed budget is derived from the
 *   height that was actually achieved rather than from the label. A stand-up that
 *   geometry refuses therefore stays slow and low automatically, with no special
 *   case anywhere: `setHeight` returns false, the height does not grow, and every
 *   consequence follows.
 *
 * - **Leaving prone costs time.** The get-up delay is dead time before the stance
 *   changes at all, which is what makes going prone a commitment rather than a
 *   free crouch.
 */
import * as THREE from 'three';
import type {
  CharacterControllerHandle,
  PhysicsSystem,
  Stance as StanceId,
} from '../core/Contracts';
import type { EventBus } from '../core/EventBus';
import { GAMEPLAY } from '../core/Config';
import { clamp, damp, lerp, moveTowards, saturate } from '../core/MathUtils';
import type { PlayerInput, PlayerState } from './State';
import {
  CROUCH_HEIGHT,
  PRONE_HEIGHT,
  SOLID_GROUPS,
  STAND_HEIGHT,
  TUNE,
} from './Tuning';

const P = GAMEPLAY.player;

export class StanceMachine {
  private slideTime = 0;
  private slideCooldown = 0;
  /** Counts down the dead time between asking to leave prone and doing it. */
  private getUp = 0;
  private tacticalActive = false;
  private weaponWeight: number = TUNE.weaponWeightReference;

  private readonly probeDir = new THREE.Vector3();
  private readonly probeOrigin = new THREE.Vector3();
  private readonly exclude: unknown[] = [null];

  setWeaponWeight(weight: number): void {
    this.weaponWeight = weight;
  }

  reset(s: PlayerState, handle: CharacterControllerHandle | null): void {
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.getUp = 0;
    this.tacticalActive = false;
    s.stance = 'stand';
    s.stanceBlocked = false;

    // Shrink before growing. Going down never fails, so this establishes a height
    // the handle and the state agree on; the stand-up may then be refused, in
    // which case the state has to keep the crouched height rather than assume the
    // capsule is tall. Getting this wrong puts the eye at head height inside a
    // crawlspace, with nothing downstream able to notice.
    handle?.setHeight(PRONE_HEIGHT);
    let height: number = PRONE_HEIGHT;
    if (handle === null || handle.setHeight(STAND_HEIGHT)) height = STAND_HEIGHT;
    else if (handle.setHeight(CROUCH_HEIGHT)) height = CROUCH_HEIGHT;
    s.height = height;
    s.crouchAmount = saturate((STAND_HEIGHT - height) / (STAND_HEIGHT - CROUCH_HEIGHT));
    s.proneAmount = saturate((CROUCH_HEIGHT - height) / (CROUCH_HEIGHT - PRONE_HEIGHT));
    s.eyeHeight = height + P.eyeOffset - TUNE.proneEyeDrop * s.proneAmount;

    s.isSprinting = false;
    s.isTacticalSprinting = false;
    s.sprintAmount = 0;
    s.tacticalAmount = 0;
    s.tacticalCharge = 1;
    s.sprintOut = 0;
    s.slideAmount = 0;
    s.leanAmount = 0;
  }

  update(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
    physics: PhysicsSystem,
    events: EventBus,
  ): void {
    this.exclude[0] = handle;
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    s.sprintOut = Math.max(0, s.sprintOut - dt);

    this.updateSprint(dt, s, input, events);

    if (!s.alive) {
      // The body goes down and stays down; the camera rig turns that into a slump.
      s.stance = 'prone';
      this.getUp = 0;
    } else if (s.stance === 'slide') {
      this.updateSlide(dt, s, input, handle);
    } else if (s.stance !== 'mantle') {
      this.updateGrounded(dt, s, input, handle, events);
    }

    this.applyHeight(dt, s, handle);
    this.resolveBudget(s, input);
    this.updateLean(dt, s, input, physics);
    this.updateBlends(dt, s);
  }

  /**
   * Whether a buffered jump may proceed, performing whatever stance change the
   * jump implies. Prone swallows the jump and turns it into a request to get up;
   * a slide converts into a slide-jump, which is the whole point of sliding into
   * a doorway.
   */
  allowJump(s: PlayerState, handle: CharacterControllerHandle, input: PlayerInput): boolean {
    if (!s.alive) return false;
    switch (s.stance) {
      case 'mantle':
        return false;
      case 'prone':
        if (this.getUp <= 0) this.getUp = TUNE.proneGetUpDelay;
        return false;
      case 'slide':
        this.endSlide(s, input, handle);
        return true;
      default:
        // Crouch-jumping is left alone deliberately: the capsule stays short, so
        // the crown clears more than a standing jump does.
        return true;
    }
  }

  get sliding(): boolean {
    return this.slideTime > 0;
  }

  // -------------------------------------------------------------------------
  // Stance
  // -------------------------------------------------------------------------

  private updateGrounded(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
    events: EventBus,
  ): void {
    if (s.stance === 'prone') {
      this.updateProne(dt, s, input, handle);
      return;
    }

    if (
      input.crouchPressed &&
      s.grounded &&
      this.slideCooldown <= 0 &&
      s.speed >= P.slideMinSpeed &&
      (s.isSprinting || s.sprintAmount > TUNE.slideSprintBlend)
    ) {
      this.beginSlide(s, input, events);
      return;
    }

    if (input.pronePressed) {
      s.stance = 'prone';
      this.getUp = 0;
      return;
    }

    // Sprint outranks a held crouch: asking to run means asking to stand up.
    const sprintOverride = input.sprintHeld && input.moveZ > TUNE.sprintForwardThreshold;
    s.stance = input.crouchHeld && !sprintOverride ? 'crouch' : 'stand';
  }

  private updateProne(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
  ): void {
    if (this.getUp > 0) {
      this.getUp -= dt;
      if (this.getUp > 0) return;
      const wantCrouch = input.crouchHeld;
      if (!wantCrouch && !handle.isBlockedAbove(STAND_HEIGHT)) s.stance = 'stand';
      else if (!handle.isBlockedAbove(CROUCH_HEIGHT)) s.stance = 'crouch';
      // Boxed in on both counts: stay down and keep asking.
      else this.getUp = 0.12;
      return;
    }
    if (input.pronePressed || input.crouchPressed || input.jumpBuffer > 0) {
      this.getUp = TUNE.proneGetUpDelay;
    }
  }

  // -------------------------------------------------------------------------
  // Slide
  // -------------------------------------------------------------------------

  private beginSlide(s: PlayerState, input: PlayerInput, events: EventBus): void {
    s.stance = 'slide';
    this.slideTime = 0;
    s.slideSide = input.moveX !== 0 ? Math.sign(input.moveX) : 1;

    const v = s.velocity;
    const speed = Math.hypot(v.x, v.z);
    if (speed > 1e-3) {
      const boosted = Math.min(TUNE.slideMaxSpeed, speed + P.slideSpeedBoost);
      const scale = boosted / speed;
      v.x *= scale;
      v.z *= scale;
    }
    events.emit('player:slideStart');
  }

  private updateSlide(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
  ): void {
    this.slideTime += dt;
    const expired = this.slideTime >= P.slideDuration;
    const stalled = s.speed < TUNE.slideExitSpeed;
    // A short grace on the release check, or the key press that started the slide
    // would end it again on the same step.
    const released = !input.crouchHeld && this.slideTime > 0.1;
    if (expired || stalled || released || s.jumped) this.endSlide(s, input, handle);
  }

  private endSlide(
    s: PlayerState,
    input: PlayerInput,
    handle: CharacterControllerHandle,
  ): void {
    if (s.stance !== 'slide') return;
    this.slideTime = 0;
    this.slideCooldown = P.slideCooldown;
    s.stance =
      input.crouchHeld || handle.isBlockedAbove(STAND_HEIGHT) ? 'crouch' : 'stand';
  }

  // -------------------------------------------------------------------------
  // Height
  // -------------------------------------------------------------------------

  private applyHeight(dt: number, s: PlayerState, handle: CharacterControllerHandle): void {
    const target = targetHeight(s.stance);
    const rate = heightRate(s.height, target);
    let next = moveTowards(s.height, target, rate * dt);

    if (next > s.height + 1e-6) {
      if (handle.setHeight(next)) {
        s.stanceBlocked = false;
      } else {
        s.stanceBlocked = true;
        next = s.height;
      }
    } else if (next < s.height - 1e-6) {
      handle.setHeight(next);
      s.stanceBlocked = false;
    }

    s.height = next;
    s.crouchAmount = saturate((STAND_HEIGHT - next) / (STAND_HEIGHT - CROUCH_HEIGHT));
    s.proneAmount = saturate((CROUCH_HEIGHT - next) / (CROUCH_HEIGHT - PRONE_HEIGHT));
    // Prone drops the head a little further than the capsule crown implies: the
    // cheek is on the deck, not floating at the top of the body.
    s.eyeHeight = next + P.eyeOffset - TUNE.proneEyeDrop * s.proneAmount;
  }

  // -------------------------------------------------------------------------
  // Speed budget
  // -------------------------------------------------------------------------

  private resolveBudget(s: PlayerState, input: PlayerInput): void {
    if (s.stance === 'mantle') {
      s.speedCap = 0;
      s.acceleration = 0;
      s.friction = P.friction;
      return;
    }

    if (s.stance === 'slide') {
      // Whatever the slide has is its budget, so a slide-jump keeps its speed
      // instead of being clipped by the bunny-hop cap.
      s.speedCap = Math.max(P.sprintSpeed, s.speed);
      s.acceleration = 0;
      s.friction = P.slideFriction;
      return;
    }

    let base: number = P.walkSpeed;
    if (s.isSprinting) {
      base = s.isTacticalSprinting ? P.tacticalSprintSpeed : P.sprintSpeed;
      base *= this.weightScale();
    }

    let speed = lerp(base, P.crouchSpeed, s.crouchAmount);
    speed = lerp(speed, P.proneSpeed, s.proneAmount);
    speed *= directionScale(input);
    speed *= lerp(1, P.adsSpeedScale, s.adsAmount);

    s.speedCap = speed;
    s.acceleration =
      P.acceleration *
      lerp(1, TUNE.crouchAccelScale, s.crouchAmount) *
      lerp(1, TUNE.proneAccelScale, s.proneAmount);
    s.friction = P.friction * lerp(1, TUNE.crouchFrictionScale, s.crouchAmount);
  }

  /** Heavier weapons cost sprint speed, as the weapon definitions' `weight` implies. */
  private weightScale(): number {
    const over = this.weaponWeight - TUNE.weaponWeightReference;
    return clamp(
      1 - over * TUNE.weaponWeightPenalty,
      1 - TUNE.weaponWeightRange,
      1 + TUNE.weaponWeightRange * 0.4,
    );
  }

  // -------------------------------------------------------------------------
  // Sprint
  // -------------------------------------------------------------------------

  private updateSprint(dt: number, s: PlayerState, input: PlayerInput, events: EventBus): void {
    const wasSprinting = s.isSprinting;
    const wasTactical = s.isTacticalSprinting;

    // Touching the trigger or the sights ends a sprint outright — that is the
    // trade the whole mechanic is built on.
    const interrupted = input.fireHeld || input.firePressed || input.aimHeld || s.adsAmount > 0.08;
    const eligible =
      input.enabled &&
      s.alive &&
      s.stance !== 'prone' &&
      s.stance !== 'slide' &&
      s.stance !== 'mantle' &&
      s.proneAmount < 0.02 &&
      s.crouchAmount < 0.4 &&
      input.moveZ > TUNE.sprintForwardThreshold &&
      !interrupted;

    s.isSprinting = eligible && input.sprintHeld;

    if (s.isSprinting && input.tacticalRequested && s.tacticalCharge > TUNE.tacticalMinCharge) {
      this.tacticalActive = true;
    }
    if (!s.isSprinting || s.tacticalCharge <= 0) this.tacticalActive = false;

    if (this.tacticalActive) {
      s.tacticalCharge = Math.max(0, s.tacticalCharge - dt / P.tacticalSprintDuration);
    } else {
      s.tacticalCharge = Math.min(
        1,
        s.tacticalCharge + dt / (P.tacticalSprintDuration * TUNE.tacticalRecharge),
      );
    }
    s.isTacticalSprinting = this.tacticalActive;

    if (s.isSprinting && !wasSprinting) {
      // Getting back into a sprint clears any lockout still running from the last
      // one; the weapon is coming down anyway.
      s.sprintOut = 0;
      events.emit('player:sprintStart');
    } else if (!s.isSprinting && wasSprinting) {
      events.emit('player:sprintEnd');
      s.sprintOut = wasTactical ? TUNE.sprintOutTactical : TUNE.sprintOut;
    }
  }

  // -------------------------------------------------------------------------
  // Lean
  // -------------------------------------------------------------------------

  private updateLean(
    dt: number,
    s: PlayerState,
    input: PlayerInput,
    physics: PhysicsSystem,
  ): void {
    let target = 0;
    const allowed = s.stance === 'stand' || s.stance === 'crouch';
    if (allowed && !s.isSprinting && s.alive && input.enabled) {
      target = clamp(input.leanAxis, -1, 1);
    }

    if (target !== 0 && physics.ready) {
      // Sideways probe from the eye. Without this the camera happily leans its way
      // through a wall and out the far side of it.
      const sign = Math.sign(target);
      this.probeDir.set(Math.cos(s.yaw) * sign, 0, -Math.sin(s.yaw) * sign);
      this.probeOrigin.set(s.feet.x, s.feet.y + s.eyeHeight, s.feet.z);
      const hit = physics.raycast(this.probeOrigin, this.probeDir, {
        maxDistance: P.leanOffset + TUNE.leanProbeMargin,
        groups: SOLID_GROUPS,
        exclude: this.exclude,
      });
      if (hit) {
        const room = Math.max(0, hit.distance - TUNE.leanProbeMargin);
        target = sign * saturate(room / P.leanOffset);
      }
    }

    s.leanAmount = damp(s.leanAmount, target, TUNE.leanRate, dt);
  }

  // -------------------------------------------------------------------------
  // Blends
  // -------------------------------------------------------------------------

  private updateBlends(dt: number, s: PlayerState): void {
    s.sprintAmount = damp(s.sprintAmount, s.isSprinting ? 1 : 0, TUNE.sprintBlendRate, dt);
    s.tacticalAmount = damp(
      s.tacticalAmount,
      s.isTacticalSprinting ? 1 : 0,
      TUNE.sprintBlendRate,
      dt,
    );
    s.slideAmount = damp(s.slideAmount, s.stance === 'slide' ? 1 : 0, 11, dt);
  }
}

function targetHeight(stance: StanceId): number {
  switch (stance) {
    case 'crouch':
      return CROUCH_HEIGHT;
    case 'prone':
      return PRONE_HEIGHT;
    case 'slide':
    case 'mantle':
      return CROUCH_HEIGHT;
    default:
      return STAND_HEIGHT;
  }
}

/** Prone is a slow, committed move in both directions; crouch is quick. */
function heightRate(current: number, target: number): number {
  const nearDeck = Math.min(current, target) < PRONE_HEIGHT + 0.02;
  if (nearDeck) return target < current ? TUNE.proneDownRate : TUNE.proneUpRate;
  return target < current ? TUNE.crouchDownRate : TUNE.crouchUpRate;
}

/**
 * Backpedalling and strafing are slower than running forward. Weighted by the
 * absolute axis values rather than the vector length, so a diagonal lands between
 * its two components instead of over both of them.
 */
function directionScale(input: PlayerInput): number {
  const f = input.moveZ;
  const x = input.moveX;
  const sum = Math.abs(f) + Math.abs(x);
  if (sum < 1e-4) return 1;
  const weighted =
    Math.max(0, f) +
    Math.max(0, -f) * TUNE.backSpeedScale +
    Math.abs(x) * TUNE.strafeSpeedScale;
  return weighted / sum;
}
