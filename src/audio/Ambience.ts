/**
 * Ambience: the bed, the one-shots, and the convolution space.
 *
 * Three states, driven from `setAmbience` and refined by the world module's
 * reverb weight:
 *
 *  exterior  wind plus a distant city rumble, reverberated as outdoor slapback.
 *  interior  room tone, an air handler, and the exterior heard through walls.
 *  tunnel    a low drone in a hard, long space.
 *
 * A crossfade rather than a cut, because a bed that switches instantly is the
 * loudest possible announcement that the game has state. Beds are looping voices
 * held for as long as the state lasts; the outgoing set is faded and released.
 *
 * What actually makes an exterior feel inhabited is not the bed, it is the
 * sparse one-shots layered over it — a dog three streets away, a burst of
 * gunfire from a different part of the city, loose metal moving in the wind. They
 * are scheduled on a Poisson-ish timer from random directions at random
 * distances, which is why they never fall into an audible rhythm.
 */
import * as THREE from 'three';
import { Rng, clamp, damp, saturate } from '../core/MathUtils';
import type { AudioEngine, SoundHandle } from './AudioEngine';
import type { SpaceId } from './synth';

export type AmbienceId = 'exterior' | 'interior' | 'tunnel';

interface BedLayer {
  id: string;
  gain: number;
}

interface OneShotSpec {
  id: string;
  /** Mean seconds between occurrences. */
  interval: number;
  gain: number;
  /** Distance range to place it at, metres. */
  near: number;
  far: number;
  /** Bias toward the horizon rather than overhead. */
  elevation: number;
}

interface AmbienceProfile {
  beds: readonly BedLayer[];
  space: SpaceId;
  /** Reverb send level for the space, before the world's reverb weight. */
  wetness: number;
  oneShots: readonly OneShotSpec[];
  /** Extra low-pass applied to every voice, as a tone tilt in dB. */
  toneDb: number;
}

const PROFILES: Record<AmbienceId, AmbienceProfile> = {
  exterior: {
    beds: [
      { id: 'amb_wind', gain: 0.5 },
      { id: 'amb_city_rumble', gain: 0.42 },
    ],
    space: 'outdoor',
    wetness: 0.26,
    toneDb: 0,
    oneShots: [
      { id: 'amb_distant_gunfire', interval: 13, gain: 0.5, near: 90, far: 260, elevation: 0.1 },
      { id: 'amb_dog_bark', interval: 26, gain: 0.4, near: 40, far: 130, elevation: 0.05 },
      { id: 'amb_crow', interval: 34, gain: 0.35, near: 25, far: 90, elevation: 0.6 },
      { id: 'amb_metal_creak', interval: 22, gain: 0.32, near: 12, far: 45, elevation: 0.3 },
      { id: 'amb_vehicle_pass', interval: 30, gain: 0.4, near: 60, far: 170, elevation: 0.05 },
      { id: 'amb_distant_impact', interval: 44, gain: 0.45, near: 140, far: 320, elevation: 0.15 },
    ],
  },
  interior: {
    beds: [
      { id: 'amb_room_tone', gain: 0.44 },
      { id: 'amb_air_handler', gain: 0.3 },
      // The street, heard through the wall. This is what stops an interior from
      // sounding like an anechoic chamber with a hum in it.
      { id: 'amb_muffled_exterior', gain: 0.34 },
    ],
    space: 'small_room',
    wetness: 0.4,
    toneDb: -2,
    oneShots: [
      { id: 'amb_drip', interval: 11, gain: 0.3, near: 3, far: 12, elevation: 0.2 },
      { id: 'amb_creak', interval: 19, gain: 0.28, near: 4, far: 14, elevation: 0.4 },
      { id: 'amb_debris_settle', interval: 27, gain: 0.26, near: 3, far: 11, elevation: 0.1 },
      { id: 'amb_distant_gunfire', interval: 17, gain: 0.3, near: 70, far: 200, elevation: 0.1 },
      { id: 'amb_metal_creak', interval: 31, gain: 0.24, near: 6, far: 18, elevation: 0.5 },
    ],
  },
  tunnel: {
    beds: [
      { id: 'amb_tunnel_drone', gain: 0.5 },
      { id: 'amb_muffled_exterior', gain: 0.2 },
    ],
    space: 'tunnel',
    wetness: 0.72,
    toneDb: -4,
    oneShots: [
      { id: 'amb_drip', interval: 6, gain: 0.42, near: 4, far: 22, elevation: 0.35 },
      { id: 'amb_debris_settle', interval: 24, gain: 0.3, near: 5, far: 26, elevation: 0.1 },
      { id: 'amb_distant_impact', interval: 40, gain: 0.35, near: 60, far: 180, elevation: 0.1 },
      { id: 'amb_metal_creak', interval: 29, gain: 0.3, near: 8, far: 30, elevation: 0.5 },
    ],
  },
};

const BED_TAG = 'ambience:bed';
const CROSSFADE = 2.2;

interface LiveBed {
  id: string;
  handle: SoundHandle;
  gain: number;
}

interface Scheduled {
  spec: OneShotSpec;
  at: number;
}

export class Ambience {
  private current: AmbienceId | null = null;
  private profile: AmbienceProfile | null = null;
  private beds: LiveBed[] = [];
  private schedule: Scheduled[] = [];
  private readonly rng = new Rng(0x4d81b3);
  private readonly scratch = new THREE.Vector3();
  private clock = 0;
  /** 0..1 from the world module, scaling the send on top of the profile. */
  private reverbWeight = 0.5;
  private appliedWetness = -1;
  /** Ducked while the player is deafened or in a heavy firefight. */
  private duck = 1;
  private duckTarget = 1;
  private repairTimer = 2;

  constructor(private readonly engine: AudioEngine) {}

  get id(): AmbienceId | null {
    return this.current;
  }

  get space(): SpaceId | null {
    return this.profile?.space ?? null;
  }

  /** Switch state. Idempotent, so it is safe to call from a per-frame check. */
  set(id: AmbienceId): void {
    if (id === this.current) return;
    const profile = PROFILES[id];
    if (!profile) return;
    this.current = id;
    this.profile = profile;

    for (const bed of this.beds) bed.handle.stop(CROSSFADE);
    this.beds = [];

    for (const layer of profile.beds) {
      const handle = this.engine.play(layer.id, null, {
        volume: 0.0001,
        loop: true,
        tag: BED_TAG,
        toneDb: profile.toneDb,
        immediate: true,
        noOcclusion: true,
        // Beds must never be stolen: losing one leaves a silent world, and
        // silence is far more noticeable than a missing footstep.
        priorityScale: 2,
      });
      if (!handle.alive) continue;
      handle.setVolume(layer.gain * this.duck, CROSSFADE);
      this.beds.push({ id: layer.id, handle, gain: layer.gain });
    }

    this.appliedWetness = -1;
    this.reschedule();
  }

  /** Reverb weight from the enclosing volume, 0..1. */
  setReverbWeight(weight: number): void {
    this.reverbWeight = saturate(weight);
  }

  /**
   * Pull the ambience level down. Used while deafened, so the tinnitus tone is
   * not competing with a wind bed, and under sustained heavy fire.
   */
  setDuck(target: number): void {
    this.duckTarget = clamp(target, 0, 1);
  }

  update(dt: number): void {
    const profile = this.profile;
    if (!profile) return;
    this.clock += dt;

    const previous = this.duck;
    this.duck = damp(this.duck, this.duckTarget, 3.5, dt);
    if (Math.abs(this.duck - previous) > 0.004) {
      for (const bed of this.beds) bed.handle.setVolume(bed.gain * this.duck, 0.2);
    }

    // Re-establish any bed that died — a stolen or errored voice would
    // otherwise leave the world permanently quieter than it should be. Checked
    // on a timer so a bed that can never start does not retry every frame.
    this.repairTimer -= dt;
    if (this.repairTimer <= 0) {
      this.repairTimer = 2;
      this.repairBeds(profile);
    }

    const wetness = profile.wetness * (0.55 + 0.45 * this.reverbWeight);
    if (Math.abs(wetness - this.appliedWetness) > 0.02) {
      this.engine.graph?.setSpace(profile.space, wetness, CROSSFADE);
      this.appliedWetness = wetness;
    }

    for (const item of this.schedule) {
      if (this.clock < item.at) continue;
      this.fire(item.spec);
      item.at = this.clock + this.nextInterval(item.spec.interval);
    }
  }

  private repairBeds(profile: AmbienceProfile): void {
    const alive = this.beds.filter((b) => b.handle.alive);
    const present = new Set(alive.map((b) => b.id));
    this.beds = alive;
    for (const layer of profile.beds) {
      if (present.has(layer.id)) continue;
      const handle = this.engine.play(layer.id, null, {
        volume: 0.0001,
        loop: true,
        tag: BED_TAG,
        toneDb: profile.toneDb,
        immediate: true,
        noOcclusion: true,
        priorityScale: 2,
      });
      if (!handle.alive) continue;
      handle.setVolume(layer.gain * this.duck, 1.5);
      this.beds.push({ id: layer.id, handle, gain: layer.gain });
    }
  }

  /** Place a one-shot somewhere plausible around the listener and play it. */
  private fire(spec: OneShotSpec): void {
    const listener = this.engine.listenerAt;
    const azimuth = this.rng.range(0, Math.PI * 2);
    const distance = this.rng.range(spec.near, spec.far);
    const elevation = this.rng.range(-0.1, 1) * spec.elevation;
    const horizontal = Math.cos(elevation) * distance;
    this.scratch.set(
      listener.x + Math.cos(azimuth) * horizontal,
      listener.y + Math.sin(elevation) * distance,
      listener.z + Math.sin(azimuth) * horizontal,
    );
    this.engine.play(spec.id, this.scratch, {
      volume: spec.gain * this.rng.range(0.75, 1.1) * this.duck,
      pitch: this.rng.range(0.94, 1.07),
      // These are scenery. They must lose to anything a player can shoot at.
      priorityScale: 0.35,
      immediate: true,
      noOcclusion: true,
    });
  }

  private reschedule(): void {
    const profile = this.profile;
    this.schedule = [];
    if (!profile) return;
    for (const spec of profile.oneShots) {
      // Stagger the first occurrence across the whole interval so entering a
      // building does not trigger five one-shots at once.
      this.schedule.push({ spec, at: this.clock + this.rng.range(1.5, spec.interval) });
    }
  }

  /**
   * Exponentially distributed gap around the mean. A fixed interval with jitter
   * still reads as a metronome; a Poisson process does not.
   */
  private nextInterval(mean: number): number {
    const u = Math.max(1e-4, this.rng.next());
    return clamp(-Math.log(u) * mean, mean * 0.25, mean * 3.5);
  }

  stop(fade = 0.8): void {
    for (const bed of this.beds) bed.handle.stop(fade);
    this.beds = [];
    this.schedule = [];
    this.current = null;
    this.profile = null;
  }
}
