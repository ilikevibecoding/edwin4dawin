/**
 * Delayed, Doppler-shifted emission for fast movers.
 *
 * A jet at 180 m/s outruns its own noise by half. Play the roar at the airframe's
 * current position and it arrives with the aircraft, which is the single most
 * common tell that an air strike was assembled rather than observed. Play it from
 * where the aircraft *was*, delayed by that distance over the speed of sound, and
 * the player hears the jet arrive after it has already gone past — and then the
 * pitch falls through the pass, because the emission that reaches them next was
 * made while the aircraft was already receding.
 *
 * Implemented as grains rather than as a continuous source because the audio
 * contract is fire-and-forget: every 0.26 s each aircraft records where it is,
 * how fast it is closing on the listener and when that instant will be audible.
 * The grain is played, positionally, at the recorded point when its time comes.
 *
 * Doppler is the textbook stationary-observer form, `f' = f c / (c - v_r)`, with
 * `v_r` the source's closing speed. At M0.53 head-on that is a factor of two, so
 * it is clamped: the physics is right but a 2x pitch shift on a synthesised roar
 * sounds like a mistake rather than like a jet.
 */
import * as THREE from 'three';
import { SPEED_OF_SOUND } from './Tuning';
import type { AudioOptions, KillstreakDeps } from './Deps';

interface Grain {
  active: boolean;
  arrival: number;
  pitch: number;
  volume: number;
  id: string;
  refDistance: number;
  maxDistance: number;
  position: THREE.Vector3;
}

const CAPACITY = 64;

export class Acoustics {
  private readonly grains: Grain[] = [];
  private readonly toListener = new THREE.Vector3();
  private readonly listener = new THREE.Vector3();
  private readonly options: AudioOptions = {};
  private cursor = 0;

  constructor(private readonly deps: KillstreakDeps) {
    for (let i = 0; i < CAPACITY; i++) {
      this.grains.push({
        active: false,
        arrival: 0,
        pitch: 1,
        volume: 1,
        id: '',
        refDistance: 120,
        maxDistance: 1200,
        position: new THREE.Vector3(),
      });
    }
  }

  /**
   * Records one instant of a moving source. `now` is the emission time; the grain
   * becomes audible `distance / c` seconds later.
   */
  emit(
    id: string,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    now: number,
    volume = 1,
    refDistance = 140,
    maxDistance = 1400,
  ): void {
    this.deps.playerEye(this.listener);
    this.toListener.copy(this.listener).sub(position);
    const distance = this.toListener.length();
    if (distance < 1e-3) return;
    this.toListener.divideScalar(distance);

    const closing = velocity.dot(this.toListener);
    const denominator = Math.max(SPEED_OF_SOUND - closing, SPEED_OF_SOUND * 0.35);
    const pitch = Math.min(1.85, Math.max(0.55, SPEED_OF_SOUND / denominator));

    // Round-robin: a saturated pool drops the oldest pending grain, which is the
    // correct failure mode because the oldest is the most distant and quietest.
    const grain = this.grains[this.cursor];
    this.cursor = (this.cursor + 1) % CAPACITY;
    grain.active = true;
    grain.arrival = now + distance / SPEED_OF_SOUND;
    grain.pitch = pitch;
    grain.volume = volume;
    grain.id = id;
    grain.refDistance = refDistance;
    grain.maxDistance = maxDistance;
    grain.position.copy(position);
  }

  /** Plays every grain whose wavefront has reached the listener. */
  update(now: number): void {
    for (const grain of this.grains) {
      if (!grain.active || now < grain.arrival) continue;
      grain.active = false;
      this.options.volume = grain.volume;
      this.options.pitch = grain.pitch;
      this.options.refDistance = grain.refDistance;
      this.options.maxDistance = grain.maxDistance;
      this.deps.play(grain.id, grain.position, this.options);
    }
  }

  clear(): void {
    for (const grain of this.grains) grain.active = false;
  }
}
