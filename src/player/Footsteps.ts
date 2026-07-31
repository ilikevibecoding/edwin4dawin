/**
 * The stride cycle.
 *
 * Steps are triggered by distance covered, not by a timer, which matters in every
 * case where the two disagree: pressed against a wall the legs stop, wading up a
 * steep slope the cadence slows on its own, and a slide makes no steps at all
 * because nothing is stepping.
 *
 * The cycle owns `PlayerState.bobPhase` and hands it to the camera rig, so the
 * bottom of the head bob and the footstep are the same event rather than two
 * clocks that happen to agree. A foot lands on every multiple of PI.
 *
 * The stride *length* is derived to match the viewmodel's own bob rate at walk
 * speed — the weapon module advances its animation cycle at
 * `bobFrequency * (0.55 + 0.45 * speedNorm)` — so the gun, the view and the audio
 * all move together. Because that rate grows sublinearly with speed, the implied
 * stride lengthens as the operator opens up, which is also what legs do.
 */
import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import { GAMEPLAY } from '../core/Config';
import { SURFACE_PROPERTIES, type SurfaceType } from '../core/GameTypes';
import { clamp, lerp, saturate } from '../core/MathUtils';
import type { PlayerState } from './State';
import { TUNE } from './Tuning';

const P = GAMEPLAY.player;
const CAM = GAMEPLAY.camera;

export class Footsteps {
  private scuffCooldown = 0;
  /** Unit heading of travel, used to notice a sharp change of direction. */
  private headingX = 0;
  private headingZ = 0;
  private hasHeading = false;

  reset(s: PlayerState): void {
    // A quarter turn in, so the first step lands after half a stride rather than
    // on the frame the player spawns.
    s.bobPhase = Math.PI * 0.5;
    this.scuffCooldown = 0;
    this.hasHeading = false;
  }

  /**
   * Advance the cycle by this fixed step's travel and emit whatever it crossed.
   * Returns the number of steps taken, which is almost always 0 or 1.
   */
  step(dt: number, s: PlayerState, events: EventBus): number {
    this.scuffCooldown = Math.max(0, this.scuffCooldown - dt);

    if (!s.alive || !s.grounded || s.stance === 'slide' || s.stance === 'mantle') {
      this.hasHeading = false;
      return 0;
    }

    this.detectScuff(s, events);

    if (s.speed < TUNE.stepIdleSpeed) return 0;

    const before = s.bobPhase;
    s.bobPhase += (s.stepDistance / this.stride(s)) * Math.PI;

    // Emit one event per half-cycle boundary crossed. A single fixed step never
    // covers more than one at any survivable speed, but the loop costs nothing
    // and keeps a hitched frame from silently swallowing a footfall.
    const crossings = Math.floor(s.bobPhase / Math.PI) - Math.floor(before / Math.PI);
    const loud = this.loudness(s);
    for (let i = 0; i < crossings; i++) this.emit(s, events, loud);

    // Wrapped so the phase cannot lose precision over a long session; a full
    // figure of eight is 2 PI, so wrapping there keeps every layer continuous.
    if (s.bobPhase > Math.PI * 4) s.bobPhase -= Math.PI * 4;
    return crossings;
  }

  /**
   * The thud of touching down. Loud enough to matter to the AI when the drop was
   * real, and it resets the stride so the first step after landing is a full one.
   */
  landing(s: PlayerState, impactSpeed: number, events: EventBus): void {
    if (impactSpeed < 0.4) return;
    const loud =
      impactSpeed > TUNE.landLoudSpeed &&
      this.surfaceLoudness(s.groundSurface, TUNE.loudLand) > TUNE.loudThreshold;
    this.emit(s, events, loud);
    // Land at the bottom of the bob, so the recovery reads as pushing back up.
    s.bobPhase = Math.PI * Math.ceil(s.bobPhase / Math.PI);
    this.hasHeading = false;
  }

  // -------------------------------------------------------------------------

  /**
   * Stride length in metres. Derived from the cadence the viewmodel uses so the
   * two cannot drift, then scaled per stance: a low stance takes fewer, more
   * deliberate steps, which the speed term alone would not produce.
   */
  private stride(s: PlayerState): number {
    const norm = clamp(s.speed / P.walkSpeed, 0, 2);
    const rate = CAM.bobFrequency * (0.55 + 0.45 * norm);
    const stance = lerp(
      lerp(1, TUNE.strideCrouchScale, s.crouchAmount),
      TUNE.strideProneScale,
      s.proneAmount,
    );
    return clamp((s.speed * Math.PI) / rate, TUNE.strideMin, TUNE.strideMax) * stance;
  }

  /**
   * Boots scuffing as the operator plants a foot to change direction. Cheap, and
   * it is most of what stops strafing around a corner from sounding like walking
   * in a straight line.
   */
  private detectScuff(s: PlayerState, events: EventBus): void {
    if (s.speed < TUNE.scuffMinSpeed) {
      this.hasHeading = false;
      return;
    }
    const inv = 1 / s.speed;
    const hx = s.velocity.x * inv;
    const hz = s.velocity.z * inv;
    if (this.hasHeading && this.scuffCooldown <= 0) {
      const dot = clamp(hx * this.headingX + hz * this.headingZ, -1, 1);
      if (Math.acos(dot) > TUNE.scuffAngle) {
        this.scuffCooldown = TUNE.scuffCooldown;
        this.emit(s, events, this.loudness(s));
      }
    }
    this.headingX = hx;
    this.headingZ = hz;
    this.hasHeading = true;
  }

  /** Loudness of an ordinary step in the current stance, against the surface. */
  private loudness(s: PlayerState): boolean {
    let base: number;
    if (s.stance === 'slide') base = TUNE.loudSlide;
    else if (s.isTacticalSprinting) base = TUNE.loudTactical;
    else if (s.isSprinting) base = TUNE.loudSprint;
    else base = lerp(lerp(TUNE.loudWalk, TUNE.loudCrouch, s.crouchAmount), TUNE.loudProne, s.proneAmount);
    // Creeping is quieter than striding even in the same stance.
    base *= 0.55 + 0.45 * saturate(s.speed / P.walkSpeed);
    return this.surfaceLoudness(s.groundSurface, base) > TUNE.loudThreshold;
  }

  /**
   * Stance loudness weighted by the ground, with the surface term pulled toward 1.
   *
   * Only part of the noise a sprinting operator makes comes off the floor; the rest
   * is gear and breathing and travels whatever they are running on. Applying
   * `stepVolume` at full strength lets soft ground silence a sprint outright — sand
   * alone would mute it across most of this map — which is the wrong answer for a
   * flag the AI uses to decide whether it heard someone.
   */
  private surfaceLoudness(surface: SurfaceType, base: number): number {
    const ground = SURFACE_PROPERTIES[surface].stepVolume;
    return base * lerp(1, ground, TUNE.loudSurfaceInfluence);
  }

  /**
   * Fresh payload objects: audio and AI hearing both retain what they are handed
   * for at least the frame, and a shared, mutated vector would have every queued
   * step happening wherever the player ended up.
   */
  private emit(s: PlayerState, events: EventBus, loud: boolean): void {
    events.emit('player:footstep', {
      position: new THREE.Vector3(s.feet.x, s.feet.y, s.feet.z),
      surface: s.groundSurface,
      loud,
    });
  }
}
