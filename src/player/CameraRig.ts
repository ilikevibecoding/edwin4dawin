/**
 * The camera rig.
 *
 * Every effect here is a *layer* added to one base transform — the eye, sitting
 * `eyeHeight` above the capsule's feet, pointed along the aim. Layers never read
 * each other and never write the aim, so adding one cannot change how any other
 * one behaves and none of them can fight the player's mouse.
 *
 * Three conventions make that work:
 *
 * - **Translation layers are resolved in a yaw-only frame**, not the camera's.
 *   Head bob is a body motion: the head swings across the shoulders and drops on
 *   each footfall whether you are looking at the floor or the sky. Resolving it
 *   in the camera's own frame would swap its lateral and vertical axes as you
 *   look up, which is exactly the wobble that makes bob feel like nausea.
 *
 * - **Roll is accumulated as "head tilt to the right"** and negated once at the
 *   end. Six different layers contribute roll and every one of them is easier to
 *   reason about as a physical head tilt than as a Euler sign.
 *
 * - **Recoil is part of the aim; everything else is cosmetic.** A recoil kick
 *   moves where the bullets go, permanently, minus the share that springs back —
 *   that is the mechanic. Bob, breathing, punch and roll do not, so they are
 *   composed after the aim and only affect what is seen. `getLookDirection`
 *   nonetheless reports the *composited* view axis, because the crosshair is
 *   drawn at the centre of the screen and a crosshair that lies is worse than any
 *   of this.
 *
 * The rig integrates once per rendered frame rather than per fixed step: it is
 * presentation, its inputs are already smooth, and the springs are substepped so
 * a long frame cannot detonate them.
 */
import * as THREE from 'three';
import type { Stance } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import {
  DEG2RAD,
  TAU,
  clamp,
  damp,
  lerp,
  moveTowards,
  saturate,
  springStep,
} from '../core/MathUtils';
import type { PlayerInput, PlayerState } from './State';
import { TUNE } from './Tuning';

const P = GAMEPLAY.player;
const CAM = GAMEPLAY.camera;
const LEAN_ANGLE = P.leanAngleDeg * DEG2RAD;

/** Longest step any spring is integrated over. */
const MAX_SPRING_STEP = 1 / 120;

interface Spring {
  value: number;
  velocity: number;
}

const spring = (): Spring => ({ value: 0, velocity: 0 });

function integrate(s: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  const steps = Math.min(8, Math.max(1, Math.ceil(dt / MAX_SPRING_STEP)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    [s.value, s.velocity] = springStep(s.value, s.velocity, target, stiffness, damping, h);
  }
}

/**
 * Kick a spring so that it peaks near `peak`. For an impulse response the peak
 * displacement is `v / sqrt(stiffness)`, so that is the velocity to inject —
 * which means the callers get to talk in metres and radians instead of in
 * spring velocities.
 */
function impulse(s: Spring, peak: number, stiffness: number): void {
  s.velocity += peak * Math.sqrt(stiffness);
}

export class CameraRig {
  /** Final composited eye position, world space. */
  readonly eyePosition = new THREE.Vector3();
  /** Final composited view axis. */
  readonly forward = new THREE.Vector3(0, 0, -1);
  fov: number = CAM.baseFov;

  /** Aim, cosmetics included, as fed to the camera's Euler angles. */
  private viewPitch = 0;
  private viewYaw = 0;
  private viewRoll = 0;

  /** Eye height above the feet, lagging the stance a little. */
  private eye = P.height + P.eyeOffset;

  /** Recoil still queued for automatic recovery, in radians of aim. */
  private readonly recoverPitch = spring();
  private readonly recoverYaw = spring();

  private readonly punchPitch = spring();
  private readonly punchYaw = spring();
  private readonly punchRoll = spring();

  private readonly landDip = spring();
  private readonly landRoll = spring();
  private readonly stanceDip = spring();

  private stepOffset = 0;
  /** Constant recovery speed for `stepOffset`, latched when the offset is set. */
  private stepRecover: number = TUNE.stepSmoothMinSpeed;
  private bobAmount = 0;
  private strafeSide = 0;
  private turnRollAmount = 0;
  private breathPhase = 0;
  private breathHold = 1;
  private holdAmount = 0;
  private gasp = 0;
  private deathAmount = 0;
  private yawRate = 0;
  private lastStance: Stance = 'stand';

  private readonly right = new THREE.Vector3(1, 0, 0);
  private readonly ahead = new THREE.Vector3(0, 0, -1);

  /** Snap every layer to rest. Used on spawn and after a teleport. */
  reset(s: PlayerState): void {
    this.viewPitch = s.pitch;
    this.viewYaw = s.yaw;
    this.viewRoll = 0;
    this.eye = s.eyeHeight;
    this.recoverPitch.value = this.recoverPitch.velocity = 0;
    this.recoverYaw.value = this.recoverYaw.velocity = 0;
    this.punchPitch.value = this.punchPitch.velocity = 0;
    this.punchYaw.value = this.punchYaw.velocity = 0;
    this.punchRoll.value = this.punchRoll.velocity = 0;
    this.landDip.value = this.landDip.velocity = 0;
    this.landRoll.value = this.landRoll.velocity = 0;
    this.stanceDip.value = this.stanceDip.velocity = 0;
    this.stepOffset = 0;
    this.stepRecover = TUNE.stepSmoothMinSpeed;
    this.bobAmount = 0;
    this.strafeSide = 0;
    this.turnRollAmount = 0;
    this.breathHold = 1;
    this.holdAmount = 0;
    this.gasp = 0;
    this.deathAmount = 0;
    this.yawRate = 0;
    this.lastStance = s.stance;
    this.fov = CAM.baseFov;
    this.frame(s);
    this.compose(s);
  }

  // -------------------------------------------------------------------------
  // Input into the aim
  // -------------------------------------------------------------------------

  /**
   * Apply one frame's mouse motion. `look` is already scaled by sensitivity and
   * by the ADS factor, so all that is left is pixels to radians and the clamp.
   */
  applyLook(look: { x: number; y: number }, dt: number, s: PlayerState): void {
    const dYaw = -look.x * TUNE.lookRadiansPerPixel;
    s.yaw += dYaw;
    s.pitch = clamp(s.pitch - look.y * TUNE.lookRadiansPerPixel, -TUNE.maxPitch, TUNE.maxPitch);
    // Kept as a rate rather than a delta so the lean-into-turn does not depend on
    // the frame length.
    const rate = dt > 1e-5 ? dYaw / dt : 0;
    this.yawRate = damp(this.yawRate, rate, TUNE.turnRollRate * 2, dt);
  }

  /**
   * Weapon recoil. The whole kick lands on the aim immediately — that is what
   * makes a shot feel like it happened — and most of it is queued for automatic
   * recovery. The share that is not queued stays in the aim for good, which is
   * why a long burst walks up the wall even though each individual shot settles.
   */
  addRecoil(pitch: number, yaw: number, s: PlayerState): void {
    s.pitch = clamp(s.pitch + pitch, -TUNE.maxPitch, TUNE.maxPitch);
    s.yaw += yaw;
    this.recoverPitch.value += pitch * TUNE.recoilAutoRecover;
    this.recoverYaw.value += yaw * TUNE.recoilAutoRecover;
  }

  /** Sharp, fast-decaying view impulse. Cosmetic: it never moves the aim. */
  addPunch(pitch: number, yaw: number, roll: number): void {
    impulse(this.punchPitch, pitch, TUNE.punchStiffness);
    impulse(this.punchYaw, yaw, TUNE.punchStiffness);
    impulse(this.punchRoll, roll, TUNE.punchStiffness);
  }

  // -------------------------------------------------------------------------
  // Notifications from the fixed step
  // -------------------------------------------------------------------------

  /**
   * The controller invented `delta` metres of vertical motion this step, climbing
   * a kerb or snapping down off one. The capsule has to teleport; the camera must
   * not, so the offset is cancelled here and allowed to decay.
   */
  notifyStepUp(delta: number): void {
    this.stepOffset = clamp(this.stepOffset - delta, -TUNE.stepSmoothMax, TUNE.stepSmoothMax);
    // Latched here rather than derived per frame, because a speed derived from the
    // remaining offset is an exponential by another name.
    this.stepRecover = Math.max(
      TUNE.stepSmoothMinSpeed,
      Math.abs(this.stepOffset) / TUNE.stepSmoothTime,
    );
  }

  /** Touchdown. `lateral` is -1..1 across the direction of travel. */
  notifyLanding(impactSpeed: number, lateral: number): void {
    const t = saturate(
      (impactSpeed - TUNE.landMinSpeed) / (TUNE.landRefSpeed - TUNE.landMinSpeed),
    );
    if (t <= 0) return;
    // Slightly superlinear, so stepping off a kerb barely registers while a
    // two-storey drop hits hard.
    const weight = t * t * 0.6 + t * 0.4;
    impulse(this.landDip, -TUNE.landDipMax * weight, TUNE.landStiffness);
    impulse(this.landRoll, TUNE.landRollMax * weight * clamp(lateral, -1, 1), TUNE.landStiffness);
  }

  // -------------------------------------------------------------------------
  // Frame update
  // -------------------------------------------------------------------------

  update(dt: number, s: PlayerState, input: PlayerInput): void {
    this.recoverRecoil(dt, s);
    this.frame(s);
    this.updateEye(dt, s);
    this.updateStanceDip(dt, s);
    this.updateBob(dt, s);
    this.updateBreath(dt, s, input);
    this.updateRolls(dt, s);
    this.updateFov(dt, s);

    integrate(this.landDip, 0, TUNE.landStiffness, TUNE.landDamping, dt);
    integrate(this.landRoll, 0, TUNE.landStiffness, TUNE.landDamping, dt);
    integrate(this.punchPitch, 0, TUNE.punchStiffness, TUNE.punchDamping, dt);
    integrate(this.punchYaw, 0, TUNE.punchStiffness, TUNE.punchDamping, dt);
    integrate(this.punchRoll, 0, TUNE.punchStiffness, TUNE.punchDamping, dt);
    this.stepOffset = moveTowards(this.stepOffset, 0, this.stepRecover * dt);
    this.deathAmount = damp(this.deathAmount, s.alive ? 0 : 1, TUNE.deathRate, dt);

    this.compose(s);
  }

  /**
   * Give back the queued share of the recoil. The subtraction is applied to the
   * aim rather than held as a separate offset, so a player who manually pulls
   * down mid-burst and a player who lets the spring do it end up with the same
   * bookkeeping and the pool can never grow without bound.
   */
  private recoverRecoil(dt: number, s: PlayerState): void {
    const beforePitch = this.recoverPitch.value;
    const beforeYaw = this.recoverYaw.value;
    integrate(this.recoverPitch, 0, TUNE.recoilStiffness, TUNE.recoilDamping, dt);
    integrate(this.recoverYaw, 0, TUNE.recoilStiffness, TUNE.recoilDamping, dt);
    s.pitch = clamp(
      s.pitch - (beforePitch - this.recoverPitch.value),
      -TUNE.maxPitch,
      TUNE.maxPitch,
    );
    s.yaw -= beforeYaw - this.recoverYaw.value;
  }

  private updateEye(dt: number, s: PlayerState): void {
    // Prone is slow in both directions; crouch is quick. Lagging the eye behind
    // the capsule is what stops a crouch reading as a teleport downwards.
    const rate = lerp(TUNE.eyeRateCrouch, TUNE.eyeRateProne, s.proneAmount);
    this.eye = damp(this.eye, s.eyeHeight, rate, dt);
  }

  private updateStanceDip(dt: number, s: PlayerState): void {
    if (s.stance !== this.lastStance) {
      const involvesProne = s.stance === 'prone' || this.lastStance === 'prone';
      const depth = involvesProne ? TUNE.stanceDipProne : TUNE.stanceDipCrouch;
      // A slide has its own, much larger dip; doubling up reads as a stumble.
      if (s.stance !== 'slide' && s.stance !== 'mantle') {
        impulse(this.stanceDip, -depth, TUNE.stanceDipStiffness);
      }
      this.lastStance = s.stance;
    }
    integrate(this.stanceDip, 0, TUNE.stanceDipStiffness, TUNE.stanceDipDamping, dt);
  }

  /**
   * Head bob amplitude. The *phase* is owned by `Footsteps`, driven by distance
   * covered, so the bottom of the bob and the footstep are the same event by
   * construction rather than by two clocks happening to agree.
   */
  private updateBob(dt: number, s: PlayerState): void {
    const stance = lerp(
      lerp(1, TUNE.bobCrouchScale, s.crouchAmount),
      TUNE.bobProneScale,
      s.proneAmount,
    );
    const target =
      s.grounded && s.stance !== 'slide'
        ? clamp(s.speed / P.walkSpeed, 0, 2.1) * stance * (1 - s.adsAmount * TUNE.bobAdsSuppress)
        : 0;
    this.bobAmount = damp(this.bobAmount, target, TUNE.bobBlendRate, dt);
  }

  private updateBreath(dt: number, s: PlayerState, input: PlayerInput): void {
    this.breathPhase = (this.breathPhase + dt * TAU * CAM.breathFrequency) % TAU;

    // Sprint holds the breath the way every shooter since Ghost Recon has done
    // it: shift, while scoped, standing still. Sprint is unreachable while aiming
    // anyway, so the key is free and the muscle memory is already there.
    const wants =
      s.alive &&
      input.enabled &&
      s.scoped &&
      s.adsAmount > 0.6 &&
      s.speed < 0.6 &&
      input.sprintHeld &&
      this.breathHold > 0;
    if (wants) {
      this.breathHold = Math.max(0, this.breathHold - dt / TUNE.holdBreathDuration);
      if (this.breathHold <= 0) this.gasp = 1;
    } else {
      this.breathHold = Math.min(
        1,
        this.breathHold + dt / (TUNE.holdBreathDuration * TUNE.holdBreathRecoveryScale),
      );
    }
    this.holdAmount = damp(this.holdAmount, wants ? 1 : 0, TUNE.holdBreathRate, dt);
    this.gasp = damp(this.gasp, 0, TUNE.gaspDecay, dt);
    s.holdingBreath = wants;
  }

  /** Total breathing gain: optic, movement, held breath and the gasp after it. */
  private breathGain(s: PlayerState): number {
    const optic = s.scoped
      ? 1 + (TUNE.breathScopedGain - 1) * s.adsAmount
      : 1 + TUNE.breathAdsGain * s.adsAmount;
    const moving = 1 - saturate(s.speed / P.walkSpeed) * TUNE.breathMoveSuppress;
    const held = lerp(1, 0.08, this.holdAmount);
    return optic * moving * held * (1 + TUNE.gaspGain * this.gasp);
  }

  private updateRolls(dt: number, s: PlayerState): void {
    // Strafe roll from the resolved velocity rather than the input axis, so it
    // vanishes when you are pressed against a wall instead of insisting you are
    // still sliding sideways.
    const reference = Math.max(P.walkSpeed, s.speedCap);
    const side = clamp(
      (s.velocity.x * this.right.x + s.velocity.z * this.right.z) / reference,
      -1,
      1,
    );
    this.strafeSide = damp(this.strafeSide, side, TUNE.strafeRollRate, dt);
    this.turnRollAmount = damp(
      this.turnRollAmount,
      clamp(-this.yawRate * TUNE.turnRoll, -TUNE.turnRollMax, TUNE.turnRollMax),
      TUNE.turnRollRate,
      dt,
    );
  }

  private updateFov(dt: number, s: PlayerState): void {
    const hip =
      CAM.baseFov +
      CAM.sprintFovBoost * s.sprintAmount +
      (CAM.tacSprintFovBoost - CAM.sprintFovBoost) * s.tacticalAmount;
    const divisor = s.scoped ? TUNE.scopedFovDivisor : Math.max(1, s.adsZoom);
    const target = lerp(hip, hip / divisor, saturate(s.adsAmount));
    this.fov = damp(this.fov, target, TUNE.fovBlendRate, dt);
  }

  // -------------------------------------------------------------------------
  // Composition
  // -------------------------------------------------------------------------

  /**
   * The yaw-only basis every translation layer is resolved in. Refreshed before
   * the layers run so the strafe roll and the bob agree on which way is right.
   */
  private frame(s: PlayerState): void {
    const sinYaw = Math.sin(s.yaw);
    const cosYaw = Math.cos(s.yaw);
    this.right.set(cosYaw, 0, -sinYaw);
    this.ahead.set(-sinYaw, 0, -cosYaw);
  }

  private compose(s: PlayerState): void {
    const phase = s.bobPhase;
    const bob = CAM.bobAmount * this.bobAmount;
    // Figure of eight: the lateral sway runs at the stride rate and the vertical
    // at twice it, so the head is lowest exactly on each footfall — every
    // multiple of PI, which is where `Footsteps` fires.
    const bobX = bob * TUNE.bobLateralScale * Math.sin(phase);
    const bobY = -bob * TUNE.bobVerticalScale * Math.cos(phase * 2);
    const bobZ = bob * TUNE.bobForwardScale * Math.sin(phase * 2 + 0.6);

    const breath = this.breathGain(s);
    const breathY = CAM.breathAmount * breath * Math.sin(this.breathPhase);
    const breathX = CAM.breathAmount * 0.45 * breath * Math.sin(this.breathPhase * 0.5 + 1.1);

    const adsCosmetic = 1 - saturate(s.adsAmount) * TUNE.strafeRollAdsSuppress;

    // --- rotation ---------------------------------------------------------
    let tilt = 0;
    tilt += this.strafeSide * TUNE.strafeRoll * adsCosmetic;
    tilt += this.turnRollAmount * (1 - saturate(s.adsAmount) * TUNE.turnRollAdsSuppress);
    tilt += s.leanAmount * LEAN_ANGLE;
    tilt += this.landRoll.value;
    tilt += this.punchRoll.value;
    tilt += Math.sin(phase) * TUNE.bobRoll * this.bobAmount;
    tilt += s.slideAmount * TUNE.slideRoll * s.slideSide;
    tilt += s.mantleRoll;
    tilt += this.deathAmount * TUNE.deathRoll;

    this.viewPitch = clamp(
      s.pitch +
        this.punchPitch.value +
        TUNE.breathPitch * breath * Math.sin(this.breathPhase * 0.97 + 0.6) +
        s.slideAmount * TUNE.slidePitch +
        s.mantlePitch +
        this.deathAmount * TUNE.deathPitch,
      -TUNE.maxPitch - 0.35,
      TUNE.maxPitch + 0.35,
    );
    this.viewYaw = s.yaw + this.punchYaw.value;
    this.viewRoll = tilt;

    // --- translation ------------------------------------------------------
    const vertical =
      this.eye +
      this.stepOffset +
      this.landDip.value +
      this.stanceDip.value +
      bobY +
      breathY +
      s.mantleDip -
      s.slideAmount * TUNE.slideDip;
    const lateral = bobX + breathX + s.leanAmount * P.leanOffset;

    this.eyePosition.set(
      s.feet.x + this.right.x * lateral + this.ahead.x * bobZ,
      s.feet.y + vertical,
      s.feet.z + this.right.z * lateral + this.ahead.z * bobZ,
    );

    const cosPitch = Math.cos(this.viewPitch);
    this.forward.set(
      -Math.sin(this.viewYaw) * cosPitch,
      Math.sin(this.viewPitch),
      -Math.cos(this.viewYaw) * cosPitch,
    );
  }

  /**
   * Write the frame's transform. Absolute, never accumulated, so the render
   * module's screen shake — which saves this transform, adds its own delta and
   * restores it after the frame is presented — cannot drift and cannot be
   * clobbered by writing twice.
   */
  writeTo(camera: THREE.PerspectiveCamera): void {
    camera.rotation.order = 'YXZ';
    // Negated because the layers above accumulate roll as a head tilt to the
    // right, whereas a positive Euler Z tips the camera's up vector to the left.
    camera.rotation.set(this.viewPitch, this.viewYaw, -this.viewRoll);
    camera.position.copy(this.eyePosition);
    if (Math.abs(camera.fov - this.fov) > 1e-3) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld(true);
  }
}
