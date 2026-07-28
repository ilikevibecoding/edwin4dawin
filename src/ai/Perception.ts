import * as THREE from 'three';
import type { IPhysics } from '../core/Interfaces';
import { clamp, saturate } from '../core/MathUtils';
import { AI, type DifficultyProfile } from './Tuning';

/**
 * What one soldier knows, and how long he keeps knowing it.
 *
 * Detection is deliberately not a boolean. Awareness accumulates at a rate set
 * by how big the target is in the eye — distance, angle off the centre of the
 * cone, whether he is moving, whether he is crouched — and drains when the
 * target is out of sight. That gives the two behaviours a shooter needs for
 * free: a sprinting player at ten metres is seen almost immediately, and a
 * player who moves between cover at sixty metres is glimpsed and half-noticed,
 * which is what makes stealth legible.
 *
 * The other half is that the AI never knows where the player *is*, only where
 * he was. `lastKnown` is a position with an age; combat runs off it, and when
 * it goes stale the agent goes and looks rather than turning to face a wall he
 * has no business seeing through. Sound writes into the same field with a
 * deliberate positional error, so a gunshot heard through a building sends a
 * squad to the right street rather than to the player's feet.
 */

export const CONTACT_NONE = 0;
export const CONTACT_HEARD = 1;
export const CONTACT_SUSPECTED = 2;
export const CONTACT_CONFIRMED = 3;

const _eye = new THREE.Vector3();
const _to = new THREE.Vector3();
const _facing = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _centre = new THREE.Vector3();

export class Perception {
  /** 0..1 build-up. Crosses `alertThreshold`, then `detectThreshold`. */
  awareness = 0;
  /** True on the frames the agent actually has eyes on the target. */
  visible = false;
  /** Seconds since the target was last seen; large when never. */
  sinceSeen = 1e6;
  /** Seconds since anything at all was noticed, heard included. */
  sinceContact = 1e6;

  /** CONTACT_* — how solid the current knowledge is. */
  contact = CONTACT_NONE;

  /**
   * Where the target was last believed to be, **at his feet**.
   *
   * Ground level, always, whichever writer put it there — eyes, ears or the
   * radio. Everything downstream needs one of two heights from it and each
   * knows which: the tree paths to it as it stands, and `Agent.believed` lifts
   * it to the chest to aim at. A field that is sometimes feet and sometimes
   * chest is a field that gets a metre added to it twice, and a soldier who
   * shoots reliably over your head.
   */
  readonly lastKnown = new THREE.Vector3();
  readonly lastKnownVel = new THREE.Vector3();
  /** Seconds since `lastKnown` was written. */
  lastKnownAge = 1e6;
  /** True while nobody has gone to look at `lastKnown` yet. */
  investigated = false;

  /** Loudest thing heard recently, and where it came from. */
  readonly heard = new THREE.Vector3();
  heardLoudness = 0;
  sinceHeard = 1e6;

  /** Set when a contact arrives from a squadmate rather than the agent's eyes. */
  shared = false;

  reset(): void {
    this.awareness = 0;
    this.visible = false;
    this.sinceSeen = 1e6;
    this.sinceContact = 1e6;
    this.contact = CONTACT_NONE;
    this.lastKnown.set(0, 0, 0);
    this.lastKnownVel.set(0, 0, 0);
    this.lastKnownAge = 1e6;
    this.investigated = false;
    this.heardLoudness = 0;
    this.sinceHeard = 1e6;
    this.shared = false;
  }

  /** Cheap per-frame bookkeeping: ageing and decay. Runs for every agent. */
  age(dt: number): void {
    this.sinceSeen += dt;
    this.sinceContact += dt;
    this.lastKnownAge += dt;
    this.sinceHeard += dt;
    if (!this.visible) {
      this.awareness = Math.max(0, this.awareness - AI.awarenessDecay * dt);
      if (this.awareness < AI.alertThreshold && this.contact === CONTACT_CONFIRMED) {
        this.contact = CONTACT_SUSPECTED;
      }
    }
    const memory = AI.memoryTime + (this.shared ? AI.sharedMemoryTime : 0);
    if (this.lastKnownAge > memory) {
      if (this.contact !== CONTACT_NONE && !this.visible) this.contact = CONTACT_NONE;
      this.awareness = Math.min(this.awareness, AI.alertThreshold * 0.8);
    }
  }

  /**
   * The expensive half: cone, occlusion and awareness integration. Called on a
   * rotating schedule, so `dt` here is the time since this agent's last check.
   */
  look(
    dt: number,
    physics: IPhysics | null,
    eye: THREE.Vector3,
    heading: number,
    /** The target's feet. The sight probes are raised off it here. */
    target: THREE.Vector3,
    targetHeight: number,
    targetVelocity: THREE.Vector3,
    targetCrouched: boolean,
    profile: DifficultyProfile,
    ignore: THREE.Object3D[],
  ): void {
    this.visible = false;
    _centre.copy(target);
    _centre.y += targetHeight * 0.62;
    _to.copy(_centre).sub(eye);
    const dist = _to.length();
    if (dist > AI.sightRange || dist < 1e-4) return;
    _to.multiplyScalar(1 / dist);

    _facing.set(Math.sin(heading), 0, Math.cos(heading));
    const cos = _facing.x * _to.x + _facing.z * _to.z;
    const angle = Math.acos(clamp(cos, -1, 1));

    const close = dist < AI.proximityRadius;
    if (angle > AI.fovHalf && !close) return;

    if (physics) {
      _eye.copy(eye);
      // Two probes: centre mass and a shoulder. One ray through a doorway is
      // the difference between "seen" and "walked past", and the second sample
      // is what stops an agent losing a target to a lamp post.
      _probe.copy(_centre);
      let seen = physics.lineOfSight(_eye, _probe, ignore);
      if (!seen) {
        _probe.copy(_centre);
        _probe.y += targetCrouched ? 0.28 : 0.48;
        _probe.x += _facing.z * 0.28;
        _probe.z -= _facing.x * 0.28;
        seen = physics.lineOfSight(_eye, _probe, ignore);
      }
      if (!seen) return;
    }

    this.visible = true;
    this.sinceSeen = 0;
    this.sinceContact = 0;

    // How fast recognition happens. Range falls off quadratically because that
    // is roughly how many pixels a man covers; the inner cone is where a human
    // actually resolves detail, and everything outside it trickles.
    const range = 1 - saturate(dist / AI.sightRange);
    const focus = angle <= AI.fovFocusHalf ? 1 : 0.35 + 0.65 * (1 - saturate(angle / AI.fovHalf));
    const speed = Math.hypot(targetVelocity.x, targetVelocity.z);
    const motion = 0.7 + saturate(speed / 5) * 0.75;
    const profileScale = targetCrouched ? 0.62 : 1;
    const urgency = close ? 2.4 : 1;
    const gain =
      AI.awarenessGain * range * range * focus * motion * profileScale * urgency * (0.65 / Math.max(0.12, profile.reactionTime) * 0.5 + 0.6);

    this.awareness = Math.min(1.35, this.awareness + gain * dt);
    if (this.awareness >= AI.detectThreshold) {
      this.contact = CONTACT_CONFIRMED;
      this.shared = false;
      this.lastKnown.copy(target);
      this.lastKnownVel.copy(targetVelocity);
      this.lastKnownAge = 0;
      this.investigated = false;
    } else if (this.awareness >= AI.alertThreshold) {
      if (this.contact < CONTACT_SUSPECTED) this.contact = CONTACT_SUSPECTED;
      this.lastKnown.copy(target);
      this.lastKnownAge = 0;
      this.investigated = false;
    }
  }

  /**
   * A sound reached the agent. `loudness` is at the source; the caller has
   * already applied distance and occlusion. Loud enough and it becomes a
   * position worth walking to, blurred so the AI does not learn the exact spot.
   */
  hear(position: THREE.Vector3, loudness: number, jitterX: number, jitterZ: number): void {
    if (loudness <= 0.02) return;
    this.sinceHeard = 0;
    this.sinceContact = 0;
    this.heard.copy(position);
    this.heardLoudness = Math.max(this.heardLoudness, loudness);
    this.awareness = Math.min(1.15, this.awareness + loudness * 0.85);

    // A confirmed visual is better information than a noise; do not overwrite it.
    if (this.contact === CONTACT_CONFIRMED && this.lastKnownAge < 1.5) return;
    this.lastKnown.set(position.x + jitterX, position.y, position.z + jitterZ);
    this.lastKnownAge = 0;
    this.investigated = false;
    this.shared = false;
    if (this.contact < CONTACT_HEARD) this.contact = CONTACT_HEARD;
    if (this.awareness >= AI.alertThreshold && this.contact < CONTACT_SUSPECTED) {
      this.contact = CONTACT_SUSPECTED;
    }
  }

  /** A squadmate called a contact in. Trusted, but not as good as seeing it. */
  share(position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (this.contact === CONTACT_CONFIRMED && this.lastKnownAge < 0.75) return;
    this.lastKnown.copy(position);
    this.lastKnownVel.copy(velocity);
    this.lastKnownAge = 0;
    this.investigated = false;
    this.shared = true;
    this.sinceContact = 0;
    if (this.contact < CONTACT_SUSPECTED) this.contact = CONTACT_SUSPECTED;
    this.awareness = Math.max(this.awareness, AI.alertThreshold + 0.18);
  }

  /** True when the agent should be fighting rather than looking. */
  get engaged(): boolean {
    return this.contact === CONTACT_CONFIRMED || (this.contact === CONTACT_SUSPECTED && this.lastKnownAge < 4);
  }

  get alerted(): boolean {
    return this.contact !== CONTACT_NONE || this.awareness >= AI.alertThreshold;
  }
}

/**
 * How much of a sound survives the trip. Loudness falls with the square of
 * distance and is cut by whatever is in the way, which is why a suppressed shot
 * two streets over registers as nothing at all.
 */
export function audibility(
  loudness: number,
  distance: number,
  occluded: boolean,
): number {
  const reach = AI.hearingRange * loudness;
  if (distance >= reach) return 0;
  const t = 1 - distance / reach;
  return t * t * loudness * (occluded ? AI.hearingOcclusion : 1);
}
