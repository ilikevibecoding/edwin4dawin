import * as THREE from 'three';
import { clamp, DEG } from '../core/MathX';

/**
 * Perception.ts — per-soldier senses.
 *
 * Vision is a cone (FOV ~110°) whose effective range grows with alertness, and
 * a **time-to-notice** ramp so a soldier who just caught the player in the
 * corner of their eye takes a beat to actually react — this is the single
 * biggest "fair AI" lever. Line-of-sight tests are *not* run here every frame;
 * the {@link AiSystem} scheduler staggers them across frames and feeds the
 * result in via {@link feedVision}. Hearing bumps awareness and drops a
 * last-known position; awareness decays when the player is lost.
 */

const FOV_COS = Math.cos(110 * DEG * 0.5);

export class Perception {
  /** 0 unaware .. 1 fully aware (will shoot). */
  awareness = 0;
  /** True on the frame awareness first crosses the "spotted" threshold. */
  justSpotted = false;
  /** Currently has a clean line of sight to the player. */
  canSee = false;
  /** Remembered player position (world). Valid when {@link hasTarget}. */
  readonly lastKnown = new THREE.Vector3();
  hasTarget = false;
  /** Seconds since the player was last actually visible. */
  timeSinceSeen = 999;
  /** Distance to the player when last evaluated. */
  distance = 999;

  private wasSpotted = false;

  /** True if `targetWorld` is within this soldier's view cone from `eye`. */
  inViewCone(eye: THREE.Vector3, forward: THREE.Vector3, targetWorld: THREE.Vector3): boolean {
    _d.subVectors(targetWorld, eye);
    const dist = _d.length();
    if (dist < 0.001) return true;
    _d.multiplyScalar(1 / dist);
    // Slightly generous vertical; the cone is mainly horizontal.
    return _d.dot(forward) >= FOV_COS;
  }

  /**
   * Feed a periodic sensing result.
   * @param visible   LoS + view-cone test passed this tick.
   * @param playerPos Player world position (used to update memory).
   * @param dist      Distance to player.
   * @param alarm     Squad alarm 0..1, speeds up noticing.
   * @param dt        Time since this soldier was last sensed (staggered).
   * @param difficulty 0..1, scales reaction speed.
   */
  feedVision(
    visible: boolean,
    playerPos: THREE.Vector3,
    dist: number,
    alarm: number,
    dt: number,
    difficulty: number
  ) {
    this.canSee = visible;
    this.distance = dist;
    this.justSpotted = false;

    if (visible) {
      this.timeSinceSeen = 0;
      this.lastKnown.copy(playerPos);
      this.hasTarget = true;
      // Time-to-notice: faster when close, when already alarmed, and on higher
      // difficulty. Far contacts ramp slowly (they have to "make you out").
      const near = clamp(1 - dist / 60, 0, 1);
      const rate = (0.35 + near * 1.1 + alarm * 0.8) * (0.6 + difficulty * 0.8);
      this.awareness = clamp(this.awareness + rate * dt, 0, 1);
    } else {
      this.timeSinceSeen += dt;
      // Lose awareness gradually once the player breaks contact.
      if (this.timeSinceSeen > 0.5) {
        this.awareness = clamp(this.awareness - dt * 0.25, 0, 1);
      }
      if (this.timeSinceSeen > 12) this.hasTarget = false;
    }

    const spotted = this.awareness >= 0.85;
    this.justSpotted = spotted && !this.wasSpotted;
    this.wasSpotted = spotted;
  }

  /** React to a noise (gunshot/footstep/explosion) at `pos`. */
  hear(pos: THREE.Vector3, intensity: number, difficulty: number) {
    this.lastKnown.copy(pos);
    this.hasTarget = true;
    this.awareness = clamp(this.awareness + intensity * (0.4 + difficulty * 0.4), 0, 1);
    if (this.timeSinceSeen > 3) this.timeSinceSeen = 3; // a noise is coarse info
  }

  get spotted() {
    return this.awareness >= 0.85;
  }
  get suspicious() {
    return this.awareness >= 0.25 && this.awareness < 0.85;
  }

  /** Advance memory when the soldier isn't being actively sensed this frame. */
  idleDecay(dt: number) {
    this.timeSinceSeen += dt;
  }
}

const _d = new THREE.Vector3();
