/**
 * The play engine.
 *
 * Everything that makes a noise goes through `emit`: it resolves a baked clip,
 * works out how far away and how occluded the emitter is, takes a voice from the
 * pool (or decides the sound is not worth stealing one for), and starts it.
 * Layered sounds — a gunshot, a jet — use `open` instead, which hands back a
 * wired-up voice for a caller that is building its own source stack.
 *
 * The scratch parameter block is module-scoped and reused, and there are no
 * closures anywhere in this path, so playing a sound allocates exactly one
 * object: the `AudioBufferSourceNode`, which is single-use by design.
 */

import type { Clip } from './dsp/Kernel';
import { Rng } from './dsp/Kernel';
import type { Bakery } from './bake/Bakery';
import type { BusName } from './graph/Mixer';
import { Mixer } from './graph/Mixer';
import {
  DEFAULT_PARAMS,
  DISTANCE,
  type DistanceModel,
  type PlayParams,
  SourceReaper,
  Voice,
  VoicePool,
  resetParams,
} from './graph/Voices';
import { ZONES, type ZoneName, type ZoneProfile } from './dsp/Zones';

/** Returns 0..1 occlusion between the listener and a point. */
export type OcclusionProbe = (x: number, y: number, z: number) => number;

const scratch: PlayParams = { ...DEFAULT_PARAMS };

export interface EmitOptions {
  bus?: BusName;
  volume?: number;
  rate?: number;
  priority?: number;
  /** World position. Omit for a head-relative sound. */
  x?: number;
  y?: number;
  z?: number;
  positional?: boolean;
  loop?: boolean;
  delay?: number;
  offset?: number;
  /** Distance curve family; see `DISTANCE`. */
  model?: DistanceModel;
  /** Multiplies the zone's wet level. */
  wet?: number;
  /** Extra lowpass on top of air absorption, in Hz. */
  lowpass?: number;
  tilt?: number;
  attack?: number;
  pan?: number;
  /** Skip the occlusion raycast, for sounds that are already inside the head. */
  noOcclusion?: boolean;
  /** Identifier so a loop can be stopped later. */
  owner?: string;
  /** Explicit variant index; omit to pick at random. */
  index?: number;
}

export class AudioCore {
  readonly mixer: Mixer;
  readonly pool: VoicePool;
  readonly reaper: SourceReaper;
  readonly rng = new Rng(0x1a2b3c4d);

  /** Listener state, kept as scalars so nothing allocates per frame. */
  listenerX = 0;
  listenerY = 1.6;
  listenerZ = 0;

  zone: ZoneProfile = ZONES.street;

  /** Set by the system once physics is available. */
  occlusionProbe: OcclusionProbe | null = null;

  /** Voices dropped because the pool was busy, for the debug overlay. */
  dropped = 0;
  started = 0;

  /**
   * Added to every time this engine schedules against. Zero in the game, and
   * only ever set by the offline measurement harness.
   *
   * A `DynamicsCompressorNode` does not start life transparent. Chrome's opens
   * from fully closed over roughly two release constants, so a sound scheduled
   * at the top of a freshly built graph is measured through a bus compressor
   * that has not warmed up: a shock front at half scale, well below any
   * threshold in the chain, comes back 15.6 dB down at t=0, 11.3 dB down at
   * 10 ms, 2.1 dB down at 50 ms and dead flat from 200 ms onwards. The figure
   * is identical at 0.65 and at 0.3, which is what gives it away — a
   * compressor obeying its own curve cannot attenuate independently of level.
   *
   * In the running game every bus has been live for minutes and none of this
   * exists. Offline it is ruinous, and worse than merely quiet: it is
   * time-dependent, so it scales a shot's layers by where they fall. The crack
   * is at sample zero and the room's answer arrives seventy milliseconds later
   * through a compressor that has since half-opened, so the tail measures
   * *above* the muzzle blast that caused it and every trim derived from that
   * reading is wrong. Letting the graph run first is what makes an offline
   * measurement mean the same thing as the signal a player hears.
   */
  timeOffset = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly bakery: Bakery,
    destination: AudioNode,
    spatialVoices: number,
    flatVoices: number,
    hrtf: boolean,
    quality: number,
  ) {
    this.mixer = new Mixer(ctx, destination, quality);
    this.pool = new VoicePool(ctx, spatialVoices, flatVoices, hrtf);
    this.reaper = new SourceReaper(Math.max(256, (spatialVoices + flatVoices) * 6));
  }

  get now(): number {
    return this.ctx.currentTime + this.timeOffset;
  }

  clip(name: string, index?: number): Clip | null {
    return index === undefined ? this.bakery.variant(name, this.rng) : this.bakery.at(name, index);
  }

  buffer(name: string, index?: number): AudioBuffer | null {
    const c = this.clip(name, index);
    return c ? c.toBuffer(this.ctx) : null;
  }

  distanceTo(x: number, y: number, z: number): number {
    const dx = x - this.listenerX;
    const dy = y - this.listenerY;
    const dz = z - this.listenerZ;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Air absorption.
   *
   * High frequencies are lost to the atmosphere at a rate that rises steeply
   * with frequency, which is why a rifle a hundred metres away is a thump and
   * not a quiet crack. One corner frequency captures the audible effect: it
   * starts above the top of hearing and falls through the whole spectrum by a
   * few hundred metres.
   */
  airCorner(distance: number): number {
    const air = 1 / (1 + distance / 22);
    return 620 + 16000 * air;
  }

  /** Treble tilt from distance, in dB. Reinforces the corner without a wall. */
  airTilt(distance: number): number {
    return -13 * Math.min(1, distance / 130);
  }

  /**
   * Plays a baked clip. Returns the voice when one was granted, or null when
   * the sound was culled — which is a normal, expected outcome under load and
   * never an error.
   */
  emit(name: string, opts?: EmitOptions): Voice | null {
    const buffer = this.buffer(name, opts?.index);
    if (!buffer) return null;

    const p = resetParams(scratch);
    const positional = opts?.positional ?? opts?.x !== undefined;
    p.bus = opts?.bus ?? 'world';
    p.volume = opts?.volume ?? 1;
    p.rate = opts?.rate ?? 1;
    p.priority = opts?.priority ?? 0.5;
    p.loop = opts?.loop ?? false;
    p.delay = opts?.delay ?? 0;
    p.offset = opts?.offset ?? 0;
    p.attack = opts?.attack ?? 0;
    p.pan = opts?.pan ?? 0;
    p.positional = positional;
    p.distance = opts?.model ?? (positional ? DISTANCE.world : DISTANCE.world);

    let dist = 0;
    if (positional) {
      p.x = opts?.x ?? 0;
      p.y = opts?.y ?? 0;
      p.z = opts?.z ?? 0;
      dist = this.distanceTo(p.x, p.y, p.z);
      // Beyond the model's reach there is nothing to hear, so do not spend a
      // voice finding that out.
      if (dist > p.distance.maxDistance * 1.05) return null;
    }

    const air = positional ? this.airCorner(dist) : 20000;
    p.lowpass = Math.min(air, opts?.lowpass ?? 20000, this.zone.directLp);
    p.tilt = (opts?.tilt ?? 0) + (positional ? this.airTilt(dist) : 0);
    // How much of this source goes to the room. How loudly the room answers is
    // the reverb return's business, and applying the zone's wetness in both
    // places would square it.
    p.wet = (opts?.wet ?? 1) * (positional ? 0.35 + 0.65 * Math.min(1, dist / 24) : 0.12);

    const occ =
      positional && !opts?.noOcclusion && this.occlusionProbe
        ? this.occlusionProbe(p.x, p.y, p.z)
        : 0;
    if (occ > 0.01) {
      p.lowpass = Math.max(180, p.lowpass * Math.pow(0.045, occ));
      p.tilt -= 17 * occ;
      p.volume *= 1 - 0.66 * occ;
      // Sound that cannot reach the ear directly arrives via the room instead.
      p.wet *= 1 + 0.6 * occ;
    }

    const audibility = p.volume / (1 + dist / Math.max(0.5, p.distance.refDistance));
    if (audibility < 0.0025) return null;
    const score = p.priority * 0.65 + audibility * 0.35;

    const voice = this.pool.acquire(positional, score, this.now);
    if (!voice) {
      this.dropped++;
      return null;
    }
    voice.audibility = audibility;
    voice.owner = opts?.owner ?? '';
    const end = voice.start(
      buffer,
      p,
      this.mixer.busInput(p.bus),
      this.mixer.reverbInput,
      this.now,
    );
    if (end === 0) return null;
    voice.occlusion = occ;
    this.started++;
    return voice;
  }

  /**
   * Grants a wired-up voice for a caller that will attach its own sources.
   * Used by the layered gunshot builder.
   */
  open(opts: EmitOptions & { duration: number }): Voice | null {
    const p = resetParams(scratch);
    const positional = opts.positional ?? opts.x !== undefined;
    p.bus = opts.bus ?? 'weapons';
    p.volume = opts.volume ?? 1;
    p.priority = opts.priority ?? 0.8;
    p.positional = positional;
    p.pan = opts.pan ?? 0;
    p.distance = opts.model ?? DISTANCE.weapon;

    let dist = 0;
    if (positional) {
      p.x = opts.x ?? 0;
      p.y = opts.y ?? 0;
      p.z = opts.z ?? 0;
      dist = this.distanceTo(p.x, p.y, p.z);
      if (dist > p.distance.maxDistance * 1.05) return null;
    }
    p.lowpass = Math.min(opts.lowpass ?? 20000, this.zone.directLp);
    p.tilt = opts.tilt ?? 0;
    // Same send law as `emit`: how much of a source reaches the room is a
    // property of where it is, not of which call opened its voice. A weapon in
    // the player's hands is the extreme near-field case and belongs at the
    // bottom of that range — the roll it should be heard with is its own baked
    // tail layer, and letting the convolver answer the muzzle at full send on
    // top of that counts the room twice and buries the crack in its own echo.
    p.wet = (opts.wet ?? 1) * (positional ? 0.35 + 0.65 * Math.min(1, dist / 24) : 0.12);

    const occ =
      positional && !opts.noOcclusion && this.occlusionProbe
        ? this.occlusionProbe(p.x, p.y, p.z)
        : 0;
    if (occ > 0.01) {
      p.lowpass = Math.max(180, p.lowpass * Math.pow(0.045, occ));
      p.tilt -= 17 * occ;
      p.volume *= 1 - 0.66 * occ;
      p.wet *= 1 + 0.6 * occ;
    }

    const audibility = p.volume / (1 + dist / Math.max(0.5, p.distance.refDistance));
    if (audibility < 0.002) return null;
    const score = p.priority * 0.65 + audibility * 0.35;
    const voice = this.pool.acquire(positional, score, this.now);
    if (!voice) {
      this.dropped++;
      return null;
    }
    voice.audibility = audibility;
    voice.owner = opts.owner ?? '';
    const end = voice.open(
      p,
      this.mixer.busInput(p.bus),
      this.mixer.reverbInput,
      this.now,
      opts.duration,
    );
    if (end === 0) return null;
    voice.occlusion = occ;
    this.started++;
    return voice;
  }

  /**
   * Starts a buffer into an arbitrary node with no voice management. Used for
   * the individual layers of a sound that already owns a voice.
   */
  source(
    buffer: AudioBuffer,
    dest: AudioNode,
    at: number,
    rate = 1,
    offset = 0,
    loop = false,
  ): AudioBufferSourceNode | null {
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.playbackRate.value = Math.max(0.06, rate);
      src.connect(dest);
      const off = Math.max(0, Math.min(buffer.duration - 0.0005, offset));
      src.start(at, off);
      const dur = loop ? 60 : (buffer.duration - off) / Math.max(0.06, rate);
      this.reaper.track(src, at + dur + 0.05);
      return src;
    } catch {
      return null;
    }
  }

  setZone(zone: ZoneName, ir: Clip | null, crossfade: number): void {
    this.zone = ZONES[zone];
    this.mixer.setZone(zone, ir, crossfade);
  }

  sweep(): void {
    const now = this.now;
    this.pool.sweep(now);
    this.reaper.sweep(now);
  }

  dispose(): void {
    this.reaper.clear();
    this.pool.dispose();
    this.mixer.dispose();
  }
}
