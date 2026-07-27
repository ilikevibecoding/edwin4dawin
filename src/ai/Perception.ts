/**
 * Sight, hearing, memory and radio.
 *
 * The centre of this file is the awareness ramp. Nothing here ever snaps from
 * "unaware" to "shooting", because the moment an enemy does that the player stops
 * believing the enemy has eyes and starts believing the game has a trigger. A
 * target sprinting across an open street at fifteen metres is identified in about
 * a fifth of a second; the same target crouched in a doorway at sixty takes the
 * better part of four. The rate is the product of six independent terms — range,
 * where in the cone they are, how much of their body is actually visible, their
 * stance, whether they are firing, and how well lit they are — so all of those
 * become things a player can use.
 *
 * Sight costs three line-of-sight rays at 0.57 µs each and only runs on the
 * agent's perception tick, which is 20 Hz up close and 4 Hz for someone nobody can
 * see. Hearing is event-driven and free.
 *
 * Memory is deliberately predictive for a short while. An agent that has lost
 * sight of you searches where your velocity was taking you, not the last place it
 * saw you, for about a second — long enough that breaking line of sight and
 * standing still works, and running in a straight line does not.
 */
import * as THREE from 'three';
import { clamp, damp, saturate } from '../core/MathUtils';
import type { Blackboard } from './Blackboard';
import { HEARING, RADIO, SIGHT } from './Tuning';

const COS_HALF_FOV = Math.cos((SIGHT.fovDeg * 0.5 * Math.PI) / 180);
const COS_HALF_FOCUS = Math.cos((SIGHT.focusFovDeg * 0.5 * Math.PI) / 180);

/** What an agent must expose for its senses to work. */
export interface Sensing {
  readonly id: number;
  /** World eye position. */
  eyePosition(out: THREE.Vector3): THREE.Vector3;
  /** Yaw the agent is looking along, radians, 0 facing -Z. */
  readonly lookYaw: number;
}

export type SoundKind = 'footstep' | 'gunshot' | 'explosion' | 'mantle' | 'impact' | 'voice';

/**
 * Stand-in for "no sighting yet", further than any comparison in the module
 * cares about. Finite on purpose: `Infinity` reads the same in every `>` test but
 * turns any arithmetic downstream into `NaN`, and a `NaN` that reaches a bone
 * transform silently deletes the agent from the screen.
 */
export const UNKNOWN_DISTANCE = 10000;

export class Perception {
  /** 0..maxAwareness. Above `engageThreshold` the target is positively identified. */
  awareness = 0;
  /** True while at least one body sample is visible. */
  visible = false;
  /** 0..1 fraction of body sample points with a clear line. */
  visibility = 0;
  /** Metres to the target, refreshed on the perception tick. */
  distance = UNKNOWN_DISTANCE;
  /** Engine time the target was last actually seen, or -1. */
  lastSeenAt = -1;
  everSeen = false;
  /** Time the agent first became aware in the current engagement. */
  acquiredAt = -1;

  /** Last position the target was seen at, feet. */
  readonly lastKnown = new THREE.Vector3();
  /** Velocity it had at that moment. */
  readonly lastVelocity = new THREE.Vector3();
  /** Extrapolated guess at where it is now. */
  readonly predicted = new THREE.Vector3();

  /** Point worth investigating from a sound or a radio call, or null. */
  investigate: THREE.Vector3 | null = null;
  private readonly investigatePoint = new THREE.Vector3();
  investigateAt = -1;
  investigateKind: SoundKind = 'footstep';

  /** Set when the agent wants to broadcast a contact; cleared by the squad. */
  radioPending = false;
  radioAt = -1;
  /** Last time this agent shouted, so callouts do not machine-gun. */
  lastCallAt = -100;

  /** Direction the last incoming fire came from, for suppression reactions. */
  readonly threatDirection = new THREE.Vector3(0, 0, -1);

  private readonly eye = new THREE.Vector3();
  private readonly sample = new THREE.Vector3();
  private readonly toTarget = new THREE.Vector3();
  private tick = 0;

  reset(): void {
    this.awareness = 0;
    this.visible = false;
    this.visibility = 0;
    this.distance = UNKNOWN_DISTANCE;
    this.lastSeenAt = -1;
    this.acquiredAt = -1;
    this.everSeen = false;
    this.investigate = null;
    this.investigateAt = -1;
    this.radioPending = false;
    this.lastCallAt = -100;
    this.tick = 0;
  }

  get alerted(): boolean {
    return this.awareness >= SIGHT.alertThreshold;
  }

  get engaged(): boolean {
    return this.awareness >= SIGHT.engageThreshold;
  }

  /** Seconds since the target was last seen, or a large number. */
  timeSinceSeen(now: number): number {
    return this.lastSeenAt < 0 ? 999 : now - this.lastSeenAt;
  }

  /**
   * Runs the sight model. `dt` is the accumulated time since the last call, so a
   * distant agent ticking at 4 Hz builds awareness at the same rate per second as
   * one ticking at 20 Hz.
   */
  update(dt: number, bb: Blackboard, host: Sensing): void {
    this.tick++;
    const target = bb.target;
    const now = bb.now;

    if (!target.alive || !target.entity) {
      this.awareness = Math.max(0, this.awareness - SIGHT.decayRate * dt * 2);
      this.visible = false;
      this.visibility = 0;
      return;
    }

    host.eyePosition(this.eye);
    this.toTarget.subVectors(target.eye, this.eye);
    const distance = this.toTarget.length();
    this.distance = distance;

    let cone = 0;
    if (distance <= SIGHT.maxRange && distance > 1e-3) {
      this.toTarget.multiplyScalar(1 / distance);
      // Facing vector for yaw where 0 looks down -Z.
      const fx = -Math.sin(host.lookYaw);
      const fz = -Math.cos(host.lookYaw);
      const dot = this.toTarget.x * fx + this.toTarget.z * fz;
      if (dot > COS_HALF_FOV) {
        cone =
          dot >= COS_HALF_FOCUS
            ? 1
            : SIGHT.peripheralScale +
              (1 - SIGHT.peripheralScale) *
                ((dot - COS_HALF_FOV) / Math.max(1e-4, COS_HALF_FOCUS - COS_HALF_FOV));
      } else if (distance < 3.5) {
        // Peripheral awareness at contact range: nobody misses someone standing
        // beside them, whatever their head is doing.
        cone = SIGHT.peripheralScale * 0.8;
      }
    }

    if (cone <= 0) {
      this.decay(dt);
      return;
    }

    this.visibility = this.sampleBody(bb, target.height);
    this.visible = this.visibility > 0;
    if (!this.visible) {
      this.decay(dt);
      return;
    }

    const range = clamp(SIGHT.idealRange / Math.max(1, distance), 0.1, 1);
    let stance = 1;
    if (target.stance === 'crouch' || target.stance === 'slide') stance = SIGHT.crouchedTargetScale;
    else if (target.stance === 'prone') stance = SIGHT.proneTargetScale;

    let motion = 1;
    if (target.speed > 5.5) motion = SIGHT.runningTargetScale;
    else if (target.speed < 0.4) motion = 0.72;

    const firing = target.firing ? SIGHT.firingTargetScale : 1;
    const light = SIGHT.darknessScale + (1 - SIGHT.darknessScale) * target.exposure;

    const gain =
      SIGHT.gainRate *
      range *
      cone *
      this.visibility *
      stance *
      motion *
      firing *
      light *
      bb.difficulty.awarenessScale;

    const before = this.awareness;
    this.awareness = Math.min(SIGHT.maxAwareness, this.awareness + gain * dt);
    if (before < SIGHT.alertThreshold && this.awareness >= SIGHT.alertThreshold) {
      this.acquiredAt = now;
    }

    this.lastSeenAt = now;
    this.everSeen = true;
    this.lastKnown.copy(target.feet);
    this.lastVelocity.copy(target.velocity);
    this.predicted.copy(target.feet);
    this.investigate = null;

    if (this.awareness >= SIGHT.engageThreshold && !this.radioPending && this.radioAt < 0) {
      this.radioPending = true;
      this.radioAt = now + RADIO.delay;
    }
  }

  /** Extrapolation and forgetting. Runs every frame; costs a few multiplies. */
  advanceMemory(dt: number, bb: Blackboard): void {
    if (!this.everSeen) return;
    const since = this.timeSinceSeen(bb.now);
    if (since <= 0.02) return;

    const window = Math.min(since, SIGHT.predictionTime);
    // Confidence in the extrapolation falls off; past the window the guess stops
    // moving rather than sailing through a wall at eight metres a second.
    const confidence = 1 - window / (SIGHT.predictionTime * 1.35);
    this.predicted.set(
      this.lastKnown.x + this.lastVelocity.x * window * confidence,
      this.lastKnown.y,
      this.lastKnown.z + this.lastVelocity.z * window * confidence,
    );
    const nav = bb.nav;
    if (nav) {
      const height = nav.heightAt(this.predicted.x, this.predicted.z, this.lastKnown.y);
      if (height === null) this.predicted.copy(this.lastKnown);
      else this.predicted.y = height;
    }
    if (since > SIGHT.memoryDuration) {
      this.everSeen = false;
      this.awareness = Math.min(this.awareness, SIGHT.alertThreshold * 0.9);
    }
    void dt;
  }

  /**
   * A sound the agent could plausibly hear. `loudness` is 0..1 after distance
   * attenuation; the caller owns the falloff curve because it knows the radius.
   */
  hear(
    position: THREE.Vector3,
    loudness: number,
    kind: SoundKind,
    now: number,
    difficultyScale: number,
  ): void {
    if (loudness <= 0.01) return;
    const gain = HEARING.gain * loudness * difficultyScale;
    // Hearing alone never fully identifies a target: it gets an agent looking in
    // the right direction, and sight has to finish the job.
    this.awareness = Math.min(SIGHT.engageThreshold * 0.94, this.awareness + gain);

    if (this.visible && this.awareness >= SIGHT.engageThreshold) return;
    const existing = this.investigate;
    if (existing && existing.distanceToSquared(position) < HEARING.mergeDistance * HEARING.mergeDistance) {
      // Same disturbance: refresh the timestamp, do not jitter the point.
      this.investigateAt = now;
      return;
    }
    // Positional uncertainty: a footstep tells you roughly where, never exactly.
    const spread = HEARING.uncertainty * (1 - loudness * 0.6);
    const angle = (position.x * 12.9898 + position.z * 78.233) % 6.2831853;
    this.investigatePoint.set(
      position.x + Math.cos(angle) * spread,
      position.y,
      position.z + Math.sin(angle) * spread,
    );
    this.investigate = this.investigatePoint;
    this.investigateAt = now;
    this.investigateKind = kind;
  }

  /** A squadmate's contact report. Second-hand, so it is worth less than seeing. */
  receiveContact(position: THREE.Vector3, velocity: THREE.Vector3, now: number): void {
    if (this.awareness >= RADIO.sharedAwareness && this.everSeen) return;
    this.awareness = Math.max(this.awareness, RADIO.sharedAwareness);
    this.lastKnown.copy(position);
    this.lastVelocity.copy(velocity);
    this.predicted.copy(position);
    this.everSeen = true;
    if (this.lastSeenAt < 0) this.lastSeenAt = now - 0.5;
    this.investigatePoint.copy(position);
    this.investigate = this.investigatePoint;
    this.investigateAt = now;
    this.investigateKind = 'voice';
  }

  /** Incoming fire from a known direction. Used by suppression and cover choice. */
  noteThreatFrom(position: THREE.Vector3, self: THREE.Vector3): void {
    this.threatDirection.subVectors(position, self);
    this.threatDirection.y = 0;
    if (this.threatDirection.lengthSq() < 1e-6) this.threatDirection.set(0, 0, -1);
    else this.threatDirection.normalize();
  }

  /** Best guess at where the target is right now, for aiming and searching. */
  bestGuess(bb: Blackboard, out: THREE.Vector3): THREE.Vector3 {
    if (this.visible && bb.target.alive) return out.copy(bb.target.feet);
    if (this.everSeen) return out.copy(this.predicted);
    if (this.investigate) return out.copy(this.investigate);
    return out.copy(this.lastKnown);
  }

  private decay(dt: number): void {
    this.visible = false;
    this.visibility = damp(this.visibility, 0, 6, dt);
    // Losing sight bleeds certainty away slowly, and faster once it is stale.
    this.awareness = Math.max(0, this.awareness - SIGHT.decayRate * dt);
  }

  /**
   * Line of sight to three points on the target: eyes, sternum and shins.
   *
   * Three rays rather than one is what makes partial cover work. A target behind
   * a low wall exposes only the head sample, so awareness builds at a third of
   * the rate and the shooter's aim spends most of its time on a body it cannot
   * hit — which is exactly the advantage cover is supposed to buy.
   */
  private sampleBody(bb: Blackboard, height: number): number {
    const target = bb.target;
    let hits = 0;
    for (let i = 0; i < SIGHT.samples; i++) {
      this.sample.copy(target.eye);
      if (i === 1) this.sample.y -= height * 0.3;
      else if (i === 2) this.sample.y = target.feet.y + height * 0.22;
      if (bb.lineOfSight(this.eye, this.sample)) hits++;
    }
    return saturate(hits / SIGHT.samples);
  }
}
