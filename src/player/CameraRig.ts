import * as THREE from 'three';
import type { Stance } from '../core/Interfaces';
import { Noise, Spring, TAU, clamp, damp, saturate, smoothstep } from '../core/MathUtils';
import { T, stanceStepLength } from './Tuning';

/**
 * The camera rig: everything between the player's position and the matrix the
 * renderer sees.
 *
 * Nine effects are summed here — view bob, breathing sway, look lag, landing
 * impact, step-up smoothing, momentum lean, peek lean, recoil and shake — plus
 * field-of-view blending. All of them are springs or phase-locked oscillators
 * driven by movement state, never sine waves bolted onto wall-clock time, which
 * is the difference between a camera that reads as a body and one that reads as
 * a wobble.
 *
 * Three rules keep it honest:
 *
 *   Roll is recomputed from its components every frame and never integrated, so
 *   it cannot accumulate a permanent tilt no matter what happens.
 *
 *   Pitch is clamped once, at the end, after every contribution has been added.
 *   No effect can walk the view past the pole and flip it.
 *
 *   Every value is finiteness-checked each frame. A single NaN anywhere in a
 *   spring would otherwise poison the transform permanently, and a black screen
 *   with no error is the worst bug this file could ship.
 */

/** Movement state the rig reads. Written in place by the player each step. */
export interface RigDrive {
  /** Horizontal speed in m/s. */
  speed: number;
  grounded: boolean;
  stance: Stance;
  sprinting: boolean;
  tacticalSprint: boolean;
  /** 0 = hip fire, 1 = fully aimed. */
  adsFactor: number;
  /** Signed velocity along the camera's right axis, m/s. */
  lateralSpeed: number;
  /** Signed acceleration along the camera's forward axis, m/s². */
  forwardAccel: number;
  /** 0..1 exertion from sprinting; deepens and quickens the breath. */
  winded: number;
  /** -1..1 peek lean, already limited by the wall check. */
  leanInput: number;
  alive: boolean;
  /** Slide roll envelope: 1 at entry, 0 by the end, 0 when not sliding. */
  slideT: number;
  /** Which shoulder the current slide rolls onto. */
  slideSign: number;
  /** 0..1 mantle progress; 0 when not mantling. */
  mantleT: number;
  /** Sign of the mantle roll, so consecutive mantles alternate shoulders. */
  mantleSign: number;
  /** 0..1 death camera progress. */
  deathT: number;
}

export function makeRigDrive(): RigDrive {
  return {
    speed: 0,
    grounded: true,
    stance: 'stand',
    sprinting: false,
    tacticalSprint: false,
    adsFactor: 0,
    lateralSpeed: 0,
    forwardAccel: 0,
    winded: 0,
    leanInput: 0,
    alive: true,
    slideT: 0,
    slideSign: 1,
    mantleT: 0,
    mantleSign: 1,
    deathT: 0,
  };
}

/**
 * Peak displacement of an underdamped spring given a velocity impulse `v0` is
 * about `v0 * 0.024` for the landing spring's frequency and damping, so an
 * impulse of `dip * stiffness * 2.2` peaks at very nearly `dip` metres. Solved
 * once here rather than tuned by eye so `landDip` stays a real distance.
 */
const IMPULSE_TO_PEAK = 2.2;

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _noise = new Noise(0x5eed17);

export class CameraRig {
  /* ------------------------------ view bob ------------------------------- */

  /** Stride phase in radians; one full cycle is two footfalls. */
  private bobPhase = 0;
  private nextFootfall = Math.PI;
  private bobAmp = 0;

  /* --------------------------- breathing sway --------------------------- */

  private breathPhase = 0;
  private breathHoldBlend = 1;
  private holdingBreath = false;
  /** Seconds of breath hold left before it is forced out. */
  private holdLeft = T.breathHoldMax;
  /** Set by a forced exhale, cleared once the reserve has recovered. */
  private breathSpent = false;

  /* ------------------------------ look lag ------------------------------ */

  private lagYaw = new Spring(T.lookLagStiffness, T.lookLagDamping);
  private lagPitch = new Spring(T.lookLagStiffness, T.lookLagDamping);

  /* --------------------------- landing impact --------------------------- */

  private landDip = new Spring(T.landStiffness, T.landDamping);
  private landPitch = new Spring(T.landStiffness, T.landDamping);
  private landRoll = new Spring(T.landStiffness, T.landDamping);
  private landFlip = 1;
  private stepSmooth = 0;

  /* --------------------------- momentum lean --------------------------- */

  private momRoll = new Spring(T.momentumStiffness, T.momentumDamping);
  private momPitch = new Spring(T.momentumStiffness, T.momentumDamping);
  private lean = new Spring(T.leanStiffness, T.leanDamping);

  /* ------------------------------- recoil ------------------------------- */

  private recoilPitch = new Spring(T.recoilStiffness, T.recoilDamping);
  private recoilYaw = new Spring(T.recoilStiffness, T.recoilDamping);
  private recoilRoll = new Spring(T.recoilStiffness, T.recoilDamping);

  /* -------------------------------- shake ------------------------------- */

  private shakeAmp = new Float32Array(T.shakeSlots);
  private shakeDur = new Float32Array(T.shakeSlots);
  private shakeAge = new Float32Array(T.shakeSlots);
  private shakeFreq = new Float32Array(T.shakeSlots);
  private shakeSeed = new Float32Array(T.shakeSlots);
  private shakeCursor = 0;

  private shakeRoll = 0;
  private shakePitch = 0;
  private shakeYaw = 0;
  private shakeX = 0;
  private shakeY = 0;
  private shakeZ = 0;

  /* --------------------------- field of view ---------------------------- */

  private fovBase = T.fov;
  private fovRequest: number | null = null;
  private fovLambda = T.fovLambda;
  private fovValue = T.fov;
  private fovSprint = 0;
  private fovPunch = new Spring(T.fovPunchStiffness, T.fovPunchDamping);
  private lastAppliedFov = -1;

  /** Set true for one frame when a NaN was caught and scrubbed. */
  sanitised = false;

  /** Every spring in the rig, gathered once so the per-step sweep allocates nothing. */
  private readonly springs: Spring[];

  constructor(private readonly onFootfall: () => void) {
    this.springs = [
      this.lagYaw,
      this.lagPitch,
      this.landDip,
      this.landPitch,
      this.landRoll,
      this.momRoll,
      this.momPitch,
      this.lean,
      this.recoilPitch,
      this.recoilYaw,
      this.recoilRoll,
      this.fovPunch,
    ];
  }

  /* ============================== inputs ================================ */

  /** Mouse delta for this frame, in radians. Drives the springy view lag. */
  addLook(dYaw: number, dPitch: number): void {
    if (!Number.isFinite(dYaw) || !Number.isFinite(dPitch)) return;
    this.lagYaw.value = clamp(
      this.lagYaw.value - dYaw * T.lookLagGain,
      -T.lookLagMax,
      T.lookLagMax,
    );
    this.lagPitch.value = clamp(
      this.lagPitch.value - dPitch * T.lookLagGain,
      -T.lookLagMax,
      T.lookLagMax,
    );
  }

  /**
   * Landing impact. `impact` is the downward speed at touchdown in m/s; the dip,
   * pitch, roll and field-of-view punch all scale from it.
   */
  land(impact: number): void {
    if (!Number.isFinite(impact)) return;
    const t = clamp(
      (impact - T.landSoftSpeed) / (T.landHardSpeed - T.landSoftSpeed),
      0,
      1.5,
    );
    if (t <= 0) return;
    this.landDip.impulse(-T.landDip * t * T.landStiffness * IMPULSE_TO_PEAK);
    this.landPitch.impulse(T.landPitch * t * T.landStiffness * IMPULSE_TO_PEAK);
    // Alternate the shoulder the impact throws you onto; a landing that always
    // rolls the same way reads as a scripted animation.
    this.landFlip = -this.landFlip;
    this.landRoll.impulse(
      T.landRoll * t * this.landFlip * T.landStiffness * IMPULSE_TO_PEAK,
    );
    if (impact > T.landHardSpeed) {
      this.punchFov((impact - T.landHardSpeed) * T.fovPunchPerImpact);
      this.shake(0.055 * t, 0.28, 16);
    }
  }

  /** Metres the physics controller lifted the character to clear a step. */
  applyStepUp(metres: number): void {
    if (!(metres > 0)) return;
    this.stepSmooth = clamp(
      this.stepSmooth - metres,
      -T.stepSmoothMax,
      T.stepSmoothMax,
    );
  }

  /**
   * Recoil. The transient part springs back to zero; the caller is responsible
   * for the permanent share, because that changes the aim itself rather than
   * the view offset.
   */
  addKick(pitch: number, yaw: number, roll = 0): void {
    if (!Number.isFinite(pitch) || !Number.isFinite(yaw) || !Number.isFinite(roll)) return;
    const k = T.recoilMaxKick;
    const p = clamp(pitch, -k, k);
    const y = clamp(yaw, -k, k);
    const r = clamp(roll, -k, k);
    // Each target is capped as well as each kick, so neither one huge request
    // nor a stream of merely large ones can walk the view away.
    const m = T.recoilMaxOffset;
    this.recoilPitch.target = clamp(this.recoilPitch.target + p, -m, m);
    this.recoilYaw.target = clamp(this.recoilYaw.target + y, -m, m);
    this.recoilRoll.target = clamp(
      this.recoilRoll.target + r + y * T.recoilRollRatio,
      -m,
      m,
    );
  }

  /** Queues a shake. `amplitude` is in metres, already distance-attenuated. */
  shake(amplitude: number, duration: number, frequency = T.shakeFrequency): void {
    if (!(amplitude > 0) || !(duration > 0)) return;
    // Replace the weakest live slot so a burst of small hits cannot mask a
    // genuinely violent one.
    let slot = -1;
    let weakest = amplitude;
    for (let i = 0; i < T.shakeSlots; i++) {
      const live = this.shakeAge[i] < this.shakeDur[i];
      if (!live) {
        slot = i;
        break;
      }
      const remaining = this.shakeAmp[i] * (1 - this.shakeAge[i] / this.shakeDur[i]);
      if (remaining < weakest) {
        weakest = remaining;
        slot = i;
      }
    }
    if (slot < 0) return;
    this.shakeAmp[slot] = amplitude;
    this.shakeDur[slot] = duration;
    this.shakeAge[slot] = 0;
    this.shakeFreq[slot] = frequency > 0 ? frequency : T.shakeFrequency;
    this.shakeSeed[slot] = (this.shakeCursor++ % 64) * 7.31;
  }

  /**
   * Degrees of instant field-of-view punch, recovering on a spring. Positive
   * widens: on a hard landing the world lurches outward for a moment, which
   * reads as impact. Narrowing instead reads as an unrequested zoom.
   */
  punchFov(degrees: number): void {
    if (!Number.isFinite(degrees)) return;
    this.fovPunch.impulse(degrees * T.fovPunchStiffness * IMPULSE_TO_PEAK);
  }

  /**
   * Field-of-view request from another system, typically the weapon asking for
   * its ADS value. `duration` 0 snaps. Passing the base FOV releases the hold.
   */
  requestFov(fov: number, duration = 0.15): void {
    if (!Number.isFinite(fov)) return;
    const target = clamp(fov, 20, 130);
    this.fovRequest = Math.abs(target - this.fovBase) < 0.01 ? null : target;
    this.fovLambda = duration > 1e-3 ? 3 / duration : 1e3;
    if (duration <= 0) this.fovValue = this.fovRequest ?? this.fovBase;
  }

  setBaseFov(fov: number): void {
    if (!Number.isFinite(fov)) return;
    this.fovBase = clamp(fov, 20, 130);
  }

  get baseFov(): number {
    return this.fovBase;
  }

  /**
   * Sniper breath hold. Returns false when there is no breath to hold: either
   * the reserve is empty, or it was emptied and has not recovered far enough
   * to be worth holding again.
   */
  holdBreath(hold: boolean): boolean {
    if (hold && (this.holdLeft <= 0 || this.breathSpent)) return false;
    this.holdingBreath = hold;
    return true;
  }

  get breathHeld(): boolean {
    return this.holdingBreath;
  }

  /** True between a forced exhale and the reserve recovering enough to re-hold. */
  get breathExhausted(): boolean {
    return this.breathSpent;
  }

  /** 0..1 breath remaining for the HUD. */
  get breathReserve(): number {
    return saturate(this.holdLeft / T.breathHoldMax);
  }

  /* =============================== update =============================== */

  /**
   * Advances every effect by one fixed step. Called from inside the player's
   * fixed-timestep loop so the camera behaves identically at 30 and 240 fps.
   */
  step(dt: number, d: RigDrive): void {
    this.stepBob(dt, d);
    this.stepBreath(dt, d);

    this.lagYaw.target = 0;
    this.lagPitch.target = 0;
    this.lagYaw.update(dt);
    this.lagPitch.update(dt);

    this.landDip.target = 0;
    this.landPitch.target = 0;
    this.landRoll.target = 0;
    this.landDip.update(dt);
    this.landPitch.update(dt);
    this.landRoll.update(dt);
    this.stepSmooth = damp(this.stepSmooth, 0, T.stepSmoothLambda, dt);

    // Momentum lean: roll into a strafe, pitch under acceleration. Both targets
    // are normalised against the walk speed and the ground acceleration so the
    // amplitudes stay in radians no matter how the speeds are retuned.
    const bodyScale = d.alive ? 1 - 0.55 * d.adsFactor : 0;
    this.momRoll.target =
      -clamp(d.lateralSpeed / T.walkSpeed, -1.4, 1.4) * T.momentumRoll * bodyScale;
    this.momPitch.target =
      -clamp(d.forwardAccel / T.groundAccel, -1, 1) * T.momentumPitch * bodyScale;
    this.momRoll.update(dt);
    this.momPitch.update(dt);

    this.lean.target = d.alive ? clamp(d.leanInput, -1, 1) : 0;
    this.lean.update(dt);

    // Recoil: the offset springs toward a target that itself decays to zero, so
    // the kick snaps and the return is smooth rather than linear.
    const decay = 1 - Math.exp(-T.recoilReturnLambda * dt);
    this.recoilPitch.target -= this.recoilPitch.target * decay;
    this.recoilYaw.target -= this.recoilYaw.target * decay;
    this.recoilRoll.target -= this.recoilRoll.target * decay;
    this.recoilPitch.update(dt);
    this.recoilYaw.update(dt);
    this.recoilRoll.update(dt);

    this.stepShake(dt);
    this.stepFov(dt, d);
    this.sanitise();
  }

  private stepBob(dt: number, d: RigDrive): void {
    const airborne = !d.grounded || d.stance === 'slide' || !d.alive;
    const stepLength = stanceStepLength(d.stance, d.sprinting);
    if (!airborne && d.speed > 0.15) {
      // Phase advances with distance, not time: two footfalls per cycle.
      this.bobPhase += (d.speed / (2 * stepLength)) * TAU * dt;
      while (this.bobPhase >= this.nextFootfall) {
        this.nextFootfall += Math.PI;
        this.onFootfall();
      }
      if (this.bobPhase > TAU) {
        this.bobPhase -= TAU;
        this.nextFootfall -= TAU;
      }
    }

    const stanceScale =
      d.stance === 'crouch' || d.stance === 'prone' ? T.bobCrouchScale : 1;
    const target = airborne
      ? 0
      : clamp(d.speed / T.walkSpeed, 0, 1.9) *
        stanceScale *
        (1 - T.bobAdsCut * d.adsFactor);
    this.bobAmp = damp(
      this.bobAmp,
      target,
      airborne ? T.bobAirLambda : T.bobLambda,
      dt,
    );
  }

  private stepBreath(dt: number, d: RigDrive): void {
    if (this.holdingBreath) {
      this.holdLeft -= dt;
      if (this.holdLeft <= 0) {
        this.holdLeft = 0;
        this.holdingBreath = false;
        this.breathSpent = true;
      }
    } else {
      this.holdLeft = Math.min(
        T.breathHoldMax,
        this.holdLeft + dt * (T.breathHoldMax / T.breathHoldRecover),
      );
      if (this.breathSpent && this.breathReserve >= T.breathHoldMinReserve) {
        this.breathSpent = false;
      }
    }
    this.breathHoldBlend = damp(
      this.breathHoldBlend,
      this.holdingBreath ? T.breathHoldScale : 1,
      T.breathHoldLambda,
      dt,
    );
    const freq =
      T.breathFreqIdle + (T.breathFreqWinded - T.breathFreqIdle) * saturate(d.winded);
    this.breathPhase += dt * freq;
    if (this.breathPhase > 4096) this.breathPhase -= 4096;
  }

  private stepShake(dt: number): void {
    let roll = 0;
    let pitch = 0;
    let yaw = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < T.shakeSlots; i++) {
      const dur = this.shakeDur[i];
      if (dur <= 0) continue;
      const age = this.shakeAge[i] + dt;
      if (age >= dur) {
        this.shakeDur[i] = 0;
        this.shakeAmp[i] = 0;
        continue;
      }
      this.shakeAge[i] = age;
      // Quadratic decay: violent at the front, gone without a tail.
      const env = 1 - age / dur;
      const amp = this.shakeAmp[i] * env * env;
      const t = age * this.shakeFreq[i];
      const seed = this.shakeSeed[i];
      pitch += amp * octaves(t, seed);
      yaw += amp * octaves(t, seed + 19.7);
      roll += amp * octaves(t, seed + 41.3);
      x += amp * octaves(t * 0.8, seed + 63.1);
      y += amp * octaves(t * 0.8, seed + 87.9);
      z += amp * octaves(t * 0.8, seed + 103.5);
    }
    this.shakePitch = pitch * T.shakeRotPerMeter;
    this.shakeYaw = yaw * T.shakeRotPerMeter;
    this.shakeRoll = roll * T.shakeRotPerMeter;
    this.shakeX = x * T.shakeTransScale;
    this.shakeY = y * T.shakeTransScale;
    this.shakeZ = z * T.shakeTransScale;
  }

  private stepFov(dt: number, d: RigDrive): void {
    this.fovValue = damp(
      this.fovValue,
      this.fovRequest ?? this.fovBase,
      this.fovLambda,
      dt,
    );
    const kick =
      d.sprinting && d.alive
        ? (T.sprintFovKick + (d.tacticalSprint ? T.tacticalFovKick : 0)) *
          (1 - d.adsFactor)
        : 0;
    this.fovSprint = damp(this.fovSprint, kick, T.sprintFovLambda, dt);
    this.fovPunch.target = 0;
    this.fovPunch.update(dt);
  }

  /* ============================== compose =============================== */

  /**
   * Writes the final transform. `eyeX/Y/Z` is the interpolated eye position
   * with no effects applied; `yaw` and `pitch` are the raw aim.
   */
  compose(
    camera: THREE.PerspectiveCamera,
    eyeX: number,
    eyeY: number,
    eyeZ: number,
    yaw: number,
    pitch: number,
    d: RigDrive,
  ): void {
    const phase = this.bobPhase;
    const amp = this.bobAmp;
    // Figure of eight: one lateral cycle per stride pair, two vertical dips, so
    // the low point of the camera lands on the footfall the audio fires on.
    const bobX = amp * T.bobLateral * Math.sin(phase);
    const bobY = -amp * T.bobVertical * (1 + Math.cos(2 * phase)) * 0.5;
    const bobRoll = amp * T.bobRoll * Math.sin(phase);
    const bobPitch = amp * T.bobPitch * Math.sin(2 * phase);

    const breathScale =
      (T.breathAmpIdle +
        (T.breathAmpWinded - T.breathAmpIdle) * saturate(d.winded)) *
      this.breathHoldBlend *
      (1 - (1 - T.breathAdsScale) * d.adsFactor) *
      // Holding still lets the chest do the moving: slower, deeper drift.
      (d.speed < 0.4 ? T.breathStillScale : 1);
    const breathPitch = _noise.noise2(this.breathPhase, 3.7) * breathScale;
    const breathYaw = _noise.noise2(11.3, this.breathPhase + 5.1) * breathScale * 1.25;

    const mantleEase = mantleArc(d.mantleT);

    let pitchTotal =
      pitch +
      this.recoilPitch.value +
      this.landPitch.value +
      this.momPitch.value +
      bobPitch +
      breathPitch +
      this.lagPitch.value +
      this.shakePitch +
      mantleEase * T.mantlePitchDip +
      d.deathT * T.deathPitch;
    // One clamp, after everything: no effect can push the view past the pole.
    pitchTotal = clamp(pitchTotal, -T.pitchLimit, T.pitchLimit);

    const yawTotal =
      yaw + this.recoilYaw.value + breathYaw + this.lagYaw.value + this.shakeYaw;

    // Roll is summed fresh from its components every frame — never integrated —
    // so it always returns to exactly zero when the inputs do. Clamped like the
    // pitch, so no amount of recoil from another system can put the horizon on
    // its side.
    const rollTotal = clamp(
      bobRoll +
        this.momRoll.value +
        this.lean.value * T.leanRoll +
        this.landRoll.value +
        this.recoilRoll.value +
        this.shakeRoll +
        d.slideT * T.slideRoll * d.slideSign +
        mantleEase * T.mantleRoll * d.mantleSign +
        d.deathT * T.deathRoll,
      -T.rollLimit,
      T.rollLimit,
    );

    _euler.set(pitchTotal, yawTotal, rollTotal);
    camera.quaternion.setFromEuler(_euler);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);

    const offX = bobX + this.lean.value * T.leanOffset + this.shakeX;
    const offY =
      bobY + this.landDip.value + this.stepSmooth + this.shakeY -
      mantleEase * T.mantleTuck;
    const offZ = this.shakeZ;

    camera.position.set(eyeX, eyeY, eyeZ);
    camera.position.x += _right.x * offX + _up.x * offY + _fwd.x * offZ;
    camera.position.y += _right.y * offX + _up.y * offY + _fwd.y * offZ;
    camera.position.z += _right.z * offX + _up.z * offY + _fwd.z * offZ;

    const fov = clamp(this.fovValue + this.fovSprint + this.fovPunch.value, 20, 130);
    if (Math.abs(fov - this.lastAppliedFov) > 0.002) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      this.lastAppliedFov = fov;
    }
    camera.updateMatrixWorld();
  }

  /** Current composed field of view in degrees. */
  get fov(): number {
    return clamp(this.fovValue + this.fovSprint + this.fovPunch.value, 20, 130);
  }

  /* =============================== hygiene ============================== */

  /**
   * Resets every accumulator. Used on spawn, respawn and teleport, so a
   * mid-flight recoil or shake cannot follow the player across the map.
   */
  reset(): void {
    this.bobPhase = 0;
    this.nextFootfall = Math.PI;
    this.bobAmp = 0;
    this.breathPhase = 0;
    this.breathHoldBlend = 1;
    this.holdingBreath = false;
    this.holdLeft = T.breathHoldMax;
    this.breathSpent = false;
    for (const s of this.springs) s.reset(0);
    this.stepSmooth = 0;
    this.shakeAmp.fill(0);
    this.shakeDur.fill(0);
    this.shakeAge.fill(0);
    this.shakePitch = this.shakeYaw = this.shakeRoll = 0;
    this.shakeX = this.shakeY = this.shakeZ = 0;
    this.fovRequest = null;
    this.fovValue = this.fovBase;
    this.fovSprint = 0;
    this.sanitised = false;
  }

  /**
   * Every effect is checked for finiteness once per step. A NaN reaching the
   * camera matrix hides the whole scene with no error in the console, so the
   * cheap defence is worth it: scrub the offender and carry on.
   */
  private sanitise(): void {
    this.sanitised = false;
    let bad = !Number.isFinite(this.bobPhase + this.bobAmp + this.breathPhase);
    for (const s of this.springs) {
      if (Number.isFinite(s.value) && Number.isFinite(s.velocity) && Number.isFinite(s.target)) {
        continue;
      }
      s.reset(0);
      bad = true;
    }
    if (
      !Number.isFinite(
        this.stepSmooth + this.shakePitch + this.shakeYaw + this.shakeRoll +
          this.shakeX + this.shakeY + this.shakeZ + this.fovValue + this.fovSprint,
      )
    ) {
      bad = true;
    }
    if (!bad) return;
    this.bobPhase = 0;
    this.nextFootfall = Math.PI;
    this.bobAmp = 0;
    this.breathPhase = 0;
    this.stepSmooth = 0;
    this.shakeAmp.fill(0);
    this.shakeDur.fill(0);
    this.shakePitch = this.shakeYaw = this.shakeRoll = 0;
    this.shakeX = this.shakeY = this.shakeZ = 0;
    if (!Number.isFinite(this.fovValue)) this.fovValue = this.fovBase;
    if (!Number.isFinite(this.fovSprint)) this.fovSprint = 0;
    this.sanitised = true;
  }

  /** Diagnostics for the showcase and the test harness. */
  snapshot(out: Record<string, number>): Record<string, number> {
    out.bobPhase = this.bobPhase;
    out.bobAmp = this.bobAmp;
    out.landDip = this.landDip.value;
    out.landPitch = this.landPitch.value;
    out.landRoll = this.landRoll.value;
    out.stepSmooth = this.stepSmooth;
    out.recoilPitch = this.recoilPitch.value;
    out.recoilYaw = this.recoilYaw.value;
    out.lean = this.lean.value;
    out.momRoll = this.momRoll.value;
    out.momPitch = this.momPitch.value;
    out.shakePitch = this.shakePitch;
    out.shakeRoll = this.shakeRoll;
    out.fov = this.fov;
    out.breath = this.breathHoldBlend;
    out.breathReserve = this.breathReserve;
    out.breathHeld = this.holdingBreath ? 1 : 0;
    out.breathSpent = this.breathSpent ? 1 : 0;
    return out;
  }
}

/** Three octaves of value noise: shake with structure instead of white jitter. */
function octaves(t: number, seed: number): number {
  return (
    _noise.noise2(t, seed) * 0.6 +
    _noise.noise2(t * 2.31, seed + 13.7) * 0.3 +
    _noise.noise2(t * 4.79, seed + 27.1) * 0.1
  );
}

/**
 * Mantle flourish envelope: rises over the first third of the climb, holds, and
 * is gone by the time the feet land, so the pitch dip reads as reaching up
 * rather than as a camera glitch at either end.
 */
function mantleArc(t: number): number {
  if (t <= 0) return 0;
  return smoothstep(0, 0.28, t) * (1 - smoothstep(0.6, 1, t));
}
