import * as THREE from 'three';
import { clamp, damp, perlin3, saturate } from '../core/MathUtils';

/**
 * Camera shake, screen flash, concussion and weapon kick.
 *
 * The shake is applied as a *delta* on top of whatever the player system has
 * already written to the camera, in the camera's own local space, and is undone
 * again once the frame has been presented. Nothing accumulates and nothing the
 * player controller reads back is ever polluted, so look input and shake never
 * fight each other.
 *
 * Displacement comes from Perlin noise rather than a sine or a random walk:
 * sine shake looks mechanical and random shake strobes, whereas band-limited
 * noise reads as a physical impulse travelling through the operator's body.
 */

interface ShakeEvent {
  active: boolean;
  intensity: number;
  duration: number;
  elapsed: number;
  frequency: number;
  seed: number;
}

const MAX_SHAKES = 12;
const MAX_ROTATION = 0.028;
const MAX_TRANSLATION = 0.055;

export class CameraFX {
  /** rgb + intensity, consumed by the composite pass. */
  readonly flash = new THREE.Vector4(1, 1, 1, 0);
  /** x: amount, y: wobble phase, z: barrel, w: desaturation. */
  readonly concussion = new THREE.Vector4(0, 0, 0, 0);

  private readonly shakes: ShakeEvent[] = [];
  private nextSlot = 0;
  private seedCounter = 0;

  private flashColor = new THREE.Color(1, 1, 1);
  private flashPeak = 0;
  private flashDuration = 0;
  private flashElapsed = 0;

  private concussionAmount = 0;
  private concussionTarget = 0;
  private concussionDuration = 0;
  private concussionElapsed = 0;
  private wobblePhase = 0;

  // Weapon kick: spring-damped so it composes additively with the player's own
  // recoil curve instead of clobbering it.
  private kickPitch = 0;
  private kickYaw = 0;
  private kickRoll = 0;
  private kickPitchVel = 0;
  private kickYawVel = 0;
  private kickRollVel = 0;
  private kickPush = 0;
  private kickPushVel = 0;

  private readonly basePosition = new THREE.Vector3();
  private readonly baseQuaternion = new THREE.Quaternion();
  private readonly offset = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly deltaQuat = new THREE.Quaternion();
  private applied = false;
  private time = 0;

  /** Sampled once per frame so the render hook and the post stack agree. */
  private readonly shakeRotation = new THREE.Vector3();
  private readonly shakeTranslation = new THREE.Vector3();

  constructor() {
    for (let i = 0; i < MAX_SHAKES; i++) {
      this.shakes.push({
        active: false,
        intensity: 0,
        duration: 0,
        elapsed: 0,
        frequency: 18,
        seed: 0,
      });
    }
  }

  addScreenShake(intensity: number, duration: number, frequency = 18): void {
    if (intensity <= 0 || duration <= 0) return;

    // Reuse the weakest slot when the pool is full: a fresh explosion matters
    // more than the tail of an old one.
    let slot: ShakeEvent | null = null;
    for (let i = 0; i < MAX_SHAKES; i++) {
      const s = this.shakes[(this.nextSlot + i) % MAX_SHAKES];
      if (!s.active) {
        slot = s;
        this.nextSlot = (this.nextSlot + i + 1) % MAX_SHAKES;
        break;
      }
    }
    if (!slot) {
      let weakest = this.shakes[0];
      for (let i = 1; i < MAX_SHAKES; i++) {
        const s = this.shakes[i];
        if (s.intensity * (1 - s.elapsed / s.duration) < weakest.intensity * (1 - weakest.elapsed / weakest.duration)) {
          weakest = s;
        }
      }
      if (weakest.intensity * (1 - weakest.elapsed / weakest.duration) > intensity) return;
      slot = weakest;
    }

    slot.active = true;
    slot.intensity = clamp(intensity, 0, 4);
    slot.duration = Math.max(0.02, duration);
    slot.elapsed = 0;
    slot.frequency = clamp(frequency, 2, 60);
    slot.seed = (this.seedCounter = (this.seedCounter + 37) % 977) * 0.731;
  }

  addScreenFlash(intensity: number, duration: number, color = 0xffffff): void {
    if (intensity <= 0 || duration <= 0) return;
    const strength = clamp(intensity, 0, 6);
    // A stronger flash overrides a weaker one still in progress rather than
    // summing, so two grenades cannot blow the frame to solid white.
    const remaining = this.flashPeak * Math.exp(-4 * (this.flashElapsed / Math.max(this.flashDuration, 1e-3)));
    if (strength < remaining * 0.9) return;
    this.flashPeak = strength;
    this.flashDuration = Math.max(0.05, duration);
    this.flashElapsed = 0;
    this.flashColor.setHex(color);
  }

  setConcussion(amount: number, duration: number): void {
    const a = clamp(amount, 0, 1);
    if (a <= 0) {
      this.concussionTarget = 0;
      this.concussionDuration = 0;
      this.concussionElapsed = 0;
      return;
    }
    this.concussionTarget = Math.max(this.concussionTarget, a);
    this.concussionDuration = Math.max(this.concussionDuration, Math.max(0.1, duration));
    this.concussionElapsed = 0;
  }

  /**
   * Visual weapon kick, in radians plus a metre-scale push along the view axis.
   * Distinct from `PlayerSystem.addCameraRecoil`, which permanently moves the
   * aim point; this returns to zero and only affects what the player sees.
   */
  addWeaponKick(pitch: number, yaw: number, roll = 0, push = 0): void {
    this.kickPitchVel += pitch;
    this.kickYawVel += yaw;
    this.kickRollVel += roll;
    this.kickPushVel += push;
  }

  update(dt: number): void {
    this.time += dt;
    this.wobblePhase += dt * 2.4;

    for (let i = 0; i < MAX_SHAKES; i++) {
      const s = this.shakes[i];
      if (!s.active) continue;
      s.elapsed += dt;
      if (s.elapsed >= s.duration) s.active = false;
    }

    if (this.flashPeak > 0) {
      this.flashElapsed += dt;
      const t = this.flashElapsed / this.flashDuration;
      if (t >= 1) {
        this.flashPeak = 0;
        this.flash.w = 0;
      } else {
        // Exponential decay with a very short linear attack: a flashbang is
        // instant on and slow off.
        const attack = saturate(this.flashElapsed / 0.03);
        this.flash.w = this.flashPeak * attack * Math.exp(-4.2 * t);
      }
    } else {
      this.flash.w = 0;
    }
    this.flash.x = this.flashColor.r;
    this.flash.y = this.flashColor.g;
    this.flash.z = this.flashColor.b;

    if (this.concussionDuration > 0) {
      this.concussionElapsed += dt;
      const t = saturate(this.concussionElapsed / this.concussionDuration);
      const envelope = (1 - t) * (1 - t);
      this.concussionAmount = damp(this.concussionAmount, this.concussionTarget * envelope, 7, dt);
      if (t >= 1 && this.concussionAmount < 0.002) {
        this.concussionAmount = 0;
        this.concussionTarget = 0;
        this.concussionDuration = 0;
      }
    } else {
      this.concussionAmount = damp(this.concussionAmount, 0, 6, dt);
    }
    this.concussion.set(
      this.concussionAmount,
      this.wobblePhase,
      this.concussionAmount * 0.09,
      this.concussionAmount * 0.55,
    );

    this.integrateKick(dt);
    this.sampleShake();
  }

  private integrateKick(dt: number): void {
    const stiffness = 210;
    const damping = 21;
    const step = (value: number, velocity: number): [number, number] => {
      const accel = -value * stiffness - velocity * damping;
      const v = velocity + accel * dt;
      return [value + v * dt, v];
    };
    [this.kickPitch, this.kickPitchVel] = step(this.kickPitch, this.kickPitchVel);
    [this.kickYaw, this.kickYawVel] = step(this.kickYaw, this.kickYawVel);
    [this.kickRoll, this.kickRollVel] = step(this.kickRoll, this.kickRollVel);
    [this.kickPush, this.kickPushVel] = step(this.kickPush, this.kickPushVel);
  }

  private sampleShake(): void {
    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;
    let posX = 0;
    let posY = 0;
    let posZ = 0;
    let total = 0;

    for (let i = 0; i < MAX_SHAKES; i++) {
      const s = this.shakes[i];
      if (!s.active) continue;
      const t = s.elapsed / s.duration;
      // Smooth trailing envelope; the leading edge is instantaneous on purpose.
      const envelope = (1 - t) * (1 - t) * (1 - t * 0.35);
      const amp = s.intensity * envelope;
      if (amp <= 1e-4) continue;
      const p = this.time * s.frequency;
      rotX += perlin3(p, s.seed, 0.13) * amp;
      rotY += perlin3(p, s.seed + 5.7, 1.71) * amp;
      rotZ += perlin3(p * 0.6, s.seed + 11.3, 3.29) * amp * 1.4;
      posX += perlin3(p * 0.85, s.seed + 17.1, 5.11) * amp;
      posY += perlin3(p * 0.85, s.seed + 23.9, 7.53) * amp;
      posZ += perlin3(p * 0.5, s.seed + 31.7, 9.07) * amp * 0.5;
      total += amp;
    }

    // Soft-clip the sum so ten simultaneous impacts do not turn the view inside
    // out; the response stays linear for the single-explosion case.
    const compress = total > 1 ? 1 / (1 + (total - 1) * 0.55) : 1;
    this.shakeRotation.set(rotX, rotY, rotZ).multiplyScalar(MAX_ROTATION * compress);
    this.shakeTranslation.set(posX, posY, posZ).multiplyScalar(MAX_TRANSLATION * compress);
  }

  /** Apply the frame's shake and kick to the camera. Call from `lateUpdate`. */
  apply(camera: THREE.PerspectiveCamera): void {
    if (this.applied) this.restore(camera);

    this.basePosition.copy(camera.position);
    this.baseQuaternion.copy(camera.quaternion);

    const pitch = this.shakeRotation.x + this.kickPitch;
    const yaw = this.shakeRotation.y + this.kickYaw;
    const roll = this.shakeRotation.z + this.kickRoll;
    const pushZ = this.shakeTranslation.z + this.kickPush;

    if (
      pitch === 0 &&
      yaw === 0 &&
      roll === 0 &&
      pushZ === 0 &&
      this.shakeTranslation.x === 0 &&
      this.shakeTranslation.y === 0
    ) {
      return;
    }

    this.euler.set(pitch, yaw, roll);
    this.deltaQuat.setFromEuler(this.euler);
    camera.quaternion.multiply(this.deltaQuat);

    // Translate along the *shaken* axes so the offset stays view-relative.
    this.offset
      .set(this.shakeTranslation.x, this.shakeTranslation.y, pushZ)
      .applyQuaternion(camera.quaternion);
    camera.position.add(this.offset);
    camera.updateMatrixWorld(true);
    this.applied = true;
  }

  /** Undo {@link apply}. Call once the frame has been presented. */
  restore(camera: THREE.PerspectiveCamera): void {
    if (!this.applied) return;
    camera.position.copy(this.basePosition);
    camera.quaternion.copy(this.baseQuaternion);
    camera.updateMatrixWorld(true);
    this.applied = false;
  }

  /** 0..1, used to decide whether TAA jitter is worth enabling. */
  get activity(): number {
    return saturate(
      this.shakeRotation.length() * 40 +
        this.shakeTranslation.length() * 20 +
        this.concussionAmount,
    );
  }

  get concussionStrength(): number {
    return this.concussionAmount;
  }

  get flashStrength(): number {
    return this.flash.w;
  }

  clear(): void {
    for (let i = 0; i < MAX_SHAKES; i++) this.shakes[i].active = false;
    this.shakeRotation.set(0, 0, 0);
    this.shakeTranslation.set(0, 0, 0);
    this.flashPeak = 0;
    this.flash.w = 0;
    this.concussionAmount = 0;
    this.concussionTarget = 0;
    this.concussionDuration = 0;
    this.kickPitch = this.kickYaw = this.kickRoll = this.kickPush = 0;
    this.kickPitchVel = this.kickYawVel = this.kickRollVel = this.kickPushVel = 0;
  }
}
