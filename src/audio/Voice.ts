/**
 * Voices and the voice pool.
 *
 * A voice is a fixed chain of Web Audio nodes that is created once and reused
 * forever. Only the `AudioBufferSourceNode` has to be new each time, because the
 * API does not allow restarting one — everything else is configured in place.
 * That matters: during sustained automatic fire with impacts, ricochets, shell
 * casings and enemy fire, the game asks for something like 40 sounds a second,
 * and building five nodes per sound would leave thousands of orphaned nodes for
 * the garbage collector to find while the audio thread is already busy.
 *
 * The chain is:
 *
 *   source ─> tone ─> air ─> gain ─┬─> panner ─> bus     (positional, mono)
 *                                  ├─────────────> bus   (2D, or stereo)
 *                                  └─> send ─> reverbIn
 *
 *  tone   a shelf used for per-playback timbre changes: a loud footstep is
 *         brighter than a quiet one, a suppressed shot heard through a wall is
 *         darker still.
 *  air    the distance low-pass. Air absorbs high frequencies, so a rifle at
 *         100 m is a dull crack rather than a quiet close-up gunshot. Occlusion
 *         pushes the same filter further down.
 */
import type * as THREE from 'three';
import { clamp } from '../core/MathUtils';
import type { MixerGraph } from './Graph';
import type { SoundSpec } from './sounds';

/** Metres per second. Used for propagation delay and Doppler. */
export const SPEED_OF_SOUND = 343;

export interface LiveVoiceInfo {
  id: string;
  /** Owner tag passed at `play` time. */
  tag: string;
  active: boolean;
  loop: boolean;
  /** Seconds until the voice is expected to finish; negative means overdue. */
  remaining: number;
  rate: number;
}

/** Distance beyond which a voice is not worth an HRTF panner. */
const HRTF_DISTANCE = 26;
const HRTF_PRIORITY = 0.45;

export interface VoiceParams {
  spec: SoundSpec;
  buffer: AudioBuffer;
  /** Final linear gain, before distance attenuation by the panner. */
  gain: number;
  playbackRate: number;
  /** World position, or null for a 2D voice. */
  position: THREE.Vector3 | null;
  loop: boolean;
  /** Context time to start at; used for propagation delay. */
  when: number;
  /** Distance from the listener at trigger time, metres. */
  distance: number;
  /** Air-absorption cutoff in Hz. */
  airHz: number;
  /** Per-voice tone tilt, dB on a high shelf. */
  toneDb: number;
  /** Reverb send, absolute. */
  send: number;
  /** 0..1 stealing weight. */
  priority: number;
  /** Owner tag so a system can stop its own loops. */
  tag: string;
  /** Bypass the deafen chain (tinnitus). */
  direct: boolean;
}

export class Voice {
  readonly tone: BiquadFilterNode;
  readonly air: BiquadFilterNode;
  readonly gain: GainNode;
  readonly panner: PannerNode;
  readonly send: GainNode;

  private source: AudioBufferSourceNode | null = null;
  private readonly graph: MixerGraph;
  private outputNode: AudioNode | null = null;
  private sendConnected = false;
  private pannerConnected = false;

  /** True between `start` and release. */
  active = false;
  /** Monotonic id so a handle cannot address a recycled voice. */
  generation = 0;
  startedAt = 0;
  /** Context time the voice is expected to be finished by. */
  endsAt = 0;
  priority = 0;
  baseGain = 0;
  spec: SoundSpec | null = null;
  tag = '';
  loop = false;
  /** Smoothed occlusion, 0..1. Kept on the voice so it does not chatter. */
  occlusion = 0;
  private occlusionGain = 1;
  /** Cached world position for per-frame occlusion and Doppler updates. */
  readonly worldPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  positional = false;
  airHz = 20000;
  playbackRate = 1;
  onRelease: ((voice: Voice) => void) | null = null;

  constructor(graph: MixerGraph) {
    this.graph = graph;
    const ctx = graph.context;

    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'highshelf';
    this.tone.frequency.value = 2200;
    this.tone.gain.value = 0;

    this.air = ctx.createBiquadFilter();
    this.air.type = 'lowpass';
    this.air.frequency.value = 20000;
    this.air.Q.value = 0.35;

    this.gain = ctx.createGain();
    this.gain.gain.value = 0;

    this.panner = ctx.createPanner();
    this.panner.panningModel = 'equalpower';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 4;
    this.panner.maxDistance = 120;
    this.panner.rolloffFactor = 1;
    this.panner.coneInnerAngle = 360;
    this.panner.coneOuterAngle = 360;
    this.panner.coneOuterGain = 1;

    this.send = ctx.createGain();
    this.send.gain.value = 0;

    this.tone.connect(this.air);
    this.air.connect(this.gain);
    this.gain.connect(this.send);
  }

  get isBusy(): boolean {
    return this.active;
  }

  /** Current audibility estimate, used to decide which voice to steal. */
  audibility(now: number): number {
    if (!this.active) return 0;
    const age = now - this.startedAt;
    const life = Math.max(0.05, this.endsAt - this.startedAt);
    // A voice most of the way through its decay is nearly free to take.
    const remaining = this.loop ? 1 : clamp(1 - age / life, 0, 1);
    const distance = this.positional
      ? 1 / (1 + Math.max(0, this.distanceToOrigin()) / Math.max(1, this.panner.refDistance))
      : 1;
    // A voice scheduled ahead of the clock has not been heard yet, so taking it
    // costs nothing in the moment. Discounted rather than free: the music
    // scheduler queues a beat or two ahead and should still survive light load.
    const pending = age < 0 ? 0.5 : 1;
    return this.baseGain * remaining * distance * pending * (0.25 + 0.75 * this.priority);
  }

  private distanceToOrigin(): number {
    const p = this.worldPosition;
    return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  }

  start(params: VoiceParams): void {
    const ctx = this.graph.context;
    const spec = params.spec;
    this.spec = spec;
    this.tag = params.tag;
    this.priority = params.priority;
    this.baseGain = params.gain;
    this.loop = params.loop;
    this.occlusion = 0;
    this.occlusionGain = 1;
    this.airHz = params.airHz;
    this.generation++;

    const source = ctx.createBufferSource();
    source.buffer = params.buffer;
    source.loop = params.loop;
    source.playbackRate.value = params.playbackRate;
    this.playbackRate = params.playbackRate;
    if (params.loop) {
      source.loopStart = 0;
      source.loopEnd = params.buffer.duration;
    }
    source.connect(this.tone);
    this.source = source;

    this.tone.gain.value = params.toneDb;
    this.tone.frequency.value = 2200;
    this.air.frequency.value = params.airHz;
    this.gain.gain.value = params.gain;

    // Stereo buffers bypass the panner: a `PannerNode` downmixes its input, so
    // routing a stereo design through one would throw away the width it was
    // designed with. Those sounds are 2D by construction anyway.
    const usePanner = params.position !== null && params.buffer.numberOfChannels === 1;
    this.positional = usePanner;

    const destination = params.direct ? this.graph.direct : this.graph.bus(spec.bus);
    if (usePanner && params.position) {
      this.panner.panningModel =
        params.distance < HRTF_DISTANCE && params.priority >= HRTF_PRIORITY
          ? 'HRTF'
          : 'equalpower';
      this.panner.refDistance = Math.max(0.1, spec.refDistance);
      this.panner.maxDistance = Math.max(spec.refDistance + 1, spec.maxDistance);
      this.panner.rolloffFactor = spec.rolloff;
      setPannerPosition(this.panner, params.position.x, params.position.y, params.position.z, 0);
      this.worldPosition.x = params.position.x;
      this.worldPosition.y = params.position.y;
      this.worldPosition.z = params.position.z;
      this.gain.connect(this.panner);
      this.panner.connect(destination);
      this.pannerConnected = true;
    } else {
      if (params.position) {
        this.worldPosition.x = params.position.x;
        this.worldPosition.y = params.position.y;
        this.worldPosition.z = params.position.z;
      }
      this.gain.connect(destination);
    }
    this.outputNode = destination;

    if (params.send > 0.001) {
      this.send.gain.value = params.send;
      this.send.connect(this.graph.reverbIn);
      this.sendConnected = true;
    } else {
      this.send.gain.value = 0;
    }

    const when = Math.max(ctx.currentTime, params.when);
    source.start(when);
    this.startedAt = when;
    this.endsAt = params.loop
      ? Number.POSITIVE_INFINITY
      : when + params.buffer.duration / Math.max(0.05, params.playbackRate) + 0.05;
    this.active = true;

    if (!params.loop) {
      const generation = this.generation;
      source.onended = (): void => {
        if (this.generation === generation) this.release();
      };
    }
  }

  /** Move a live positional voice; used for aircraft and projectiles. */
  setPosition(x: number, y: number, z: number, rampSeconds = 0.05): void {
    this.worldPosition.x = x;
    this.worldPosition.y = y;
    this.worldPosition.z = z;
    if (this.positional) setPannerPosition(this.panner, x, y, z, rampSeconds, this.graph.now);
  }

  setGain(value: number, rampSeconds = 0.04): void {
    this.baseGain = value;
    this.pushGain(rampSeconds);
  }

  /** Occlusion attenuation, kept separate so it composes with `setGain`. */
  applyOcclusionGain(scale: number, rampSeconds = 0.12): void {
    this.occlusionGain = clamp(scale, 0, 1);
    this.pushGain(rampSeconds);
  }

  private pushGain(rampSeconds: number): void {
    const value = this.baseGain * this.occlusionGain;
    if (rampSeconds <= 0) this.gain.gain.value = value;
    else this.gain.gain.setTargetAtTime(value, this.graph.now, rampSeconds * 0.4);
  }

  /**
   * Change the reverb send of a live voice, connecting it on demand. A voice
   * that started dry can still be pushed wet by occlusion.
   */
  setSendLevel(value: number, rampSeconds = 0.08): void {
    const v = clamp(value, 0, 2);
    if (!this.sendConnected) {
      if (v <= 0.001) return;
      this.send.gain.value = 0;
      this.send.connect(this.graph.reverbIn);
      this.sendConnected = true;
    }
    if (rampSeconds <= 0) this.send.gain.value = v;
    else this.send.gain.setTargetAtTime(v, this.graph.now, rampSeconds * 0.4);
  }

  setPlaybackRate(rate: number, rampSeconds = 0.05): void {
    if (!this.source) return;
    const r = clamp(rate, 0.06, 8);
    if (rampSeconds <= 0) this.source.playbackRate.value = r;
    else this.source.playbackRate.setTargetAtTime(r, this.graph.now, rampSeconds * 0.4);
  }

  /** Set the air-absorption cutoff, combining distance and occlusion. */
  setAirCutoff(hz: number, rampSeconds = 0.08): void {
    const f = clamp(hz, 120, 20000);
    if (rampSeconds <= 0) this.air.frequency.value = f;
    else this.air.frequency.setTargetAtTime(f, this.graph.now, rampSeconds * 0.4);
  }

  setToneDb(db: number, rampSeconds = 0.08): void {
    const v = clamp(db, -36, 12);
    if (rampSeconds <= 0) this.tone.gain.value = v;
    else this.tone.gain.setTargetAtTime(v, this.graph.now, rampSeconds * 0.4);
  }

  /** Fade out and stop. A hard stop on a loud voice is an audible click. */
  stop(fadeSeconds = 0.02): void {
    if (!this.active || !this.source) return;
    const now = this.graph.now;
    const fade = Math.max(0.004, fadeSeconds);
    try {
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(Math.max(1e-4, this.gain.gain.value), now);
      this.gain.gain.exponentialRampToValueAtTime(1e-4, now + fade);
      this.source.stop(now + fade + 0.005);
    } catch {
      // Already stopped, or the context is closing; release directly.
      this.release();
      return;
    }
    // `onended` fires for a stopped source too, but looping voices have no
    // handler, so arm one here.
    if (this.loop) {
      const generation = this.generation;
      this.source.onended = (): void => {
        if (this.generation === generation) this.release();
      };
    }
    this.endsAt = now + fade + 0.01;
  }

  /**
   * Tear the voice down and hand it back to the pool. Every node the voice
   * connected during `start` is disconnected here — the pool's whole reason for
   * existing is that this is guaranteed to happen exactly once per playback.
   */
  release(): void {
    // Deliberately not guarded on `active`. A voice can be handed out by the
    // pool and then fail to start — a buffer the decoder rejected, a context
    // that closed mid-call — and if releasing an inactive voice were a no-op
    // that slot would never come back. The pool must always be able to reclaim.
    this.active = false;
    const source = this.source;
    this.source = null;
    if (source) {
      source.onended = null;
      try {
        source.disconnect();
      } catch {
        /* already detached */
      }
    }
    try {
      if (this.pannerConnected) {
        this.gain.disconnect(this.panner);
        this.panner.disconnect();
        this.pannerConnected = false;
      } else if (this.outputNode) {
        this.gain.disconnect(this.outputNode);
      }
      if (this.sendConnected) {
        this.send.disconnect();
        this.sendConnected = false;
      }
    } catch {
      /* disconnect on an already-detached node is harmless */
    }
    this.outputNode = null;
    this.gain.gain.cancelScheduledValues(this.graph.now);
    this.gain.gain.value = 0;
    this.spec = null;
    this.tag = '';
    this.positional = false;
    this.occlusion = 0;
    this.occlusionGain = 1;
    const cb = this.onRelease;
    this.onRelease = null;
    cb?.(this);
  }

  dispose(): void {
    this.release();
    try {
      this.tone.disconnect();
      this.air.disconnect();
      this.gain.disconnect();
      this.panner.disconnect();
      this.send.disconnect();
    } catch {
      /* context closing */
    }
  }
}

/**
 * `PannerNode` exposes `positionX/Y/Z` as AudioParams in every current browser,
 * which allows a smooth ramp instead of a teleport. The deprecated
 * `setPosition` is kept as a fallback for anything that does not.
 */
export function setPannerPosition(
  panner: PannerNode,
  x: number,
  y: number,
  z: number,
  ramp: number,
  now = 0,
): void {
  if (panner.positionX) {
    if (ramp <= 0) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.positionX.setTargetAtTime(x, now, ramp * 0.4);
      panner.positionY.setTargetAtTime(y, now, ramp * 0.4);
      panner.positionZ.setTargetAtTime(z, now, ramp * 0.4);
    }
    return;
  }
  const legacy = panner as unknown as { setPosition?: (x: number, y: number, z: number) => void };
  legacy.setPosition?.(x, y, z);
}

/**
 * A fixed-size pool with stealing.
 *
 * When the pool is exhausted the quietest, least important, most nearly finished
 * voice is taken — but only if the incoming sound would actually be louder than
 * it. Dropping a distant shell casing to make room for a nearby gunshot is
 * correct; dropping a gunshot to make room for a distant shell casing is not.
 */
export class VoicePool {
  private readonly voices: Voice[] = [];
  private readonly idle: Voice[] = [];
  private readonly live = new Set<Voice>();
  readonly capacity: number;
  /** Highest simultaneous voice count seen, for the performance report. */
  peakLive = 0;
  stolen = 0;
  rejected = 0;
  started = 0;

  constructor(
    private readonly graph: MixerGraph,
    capacity: number,
  ) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      const voice = new Voice(graph);
      this.voices.push(voice);
      this.idle.push(voice);
    }
  }

  get liveCount(): number {
    return this.live.size;
  }

  get idleCount(): number {
    return this.idle.length;
  }

  /** Live voices that are looping, and so are meant to be held indefinitely. */
  get loopCount(): number {
    let n = 0;
    for (const voice of this.live) if (voice.loop) n++;
    return n;
  }

  /** Acquire a voice for a sound of the given importance, or null. */
  acquire(incomingScore: number): Voice | null {
    let voice: Voice | null = this.idle.pop() ?? null;
    if (!voice) {
      voice = this.steal(incomingScore);
      if (!voice) {
        this.rejected++;
        return null;
      }
      this.stolen++;
    }
    this.live.add(voice);
    if (this.live.size > this.peakLive) this.peakLive = this.live.size;
    this.started++;
    voice.onRelease = this.handleRelease;
    return voice;
  }

  private steal(incomingScore: number): Voice | null {
    const now = this.graph.now;
    let worst: Voice | null = null;
    let worstScore = Number.POSITIVE_INFINITY;
    for (const voice of this.live) {
      const score = voice.audibility(now);
      if (score < worstScore) {
        worstScore = score;
        worst = voice;
      }
    }
    if (!worst || worstScore >= incomingScore) return null;
    // Release synchronously so the node graph is clean before reuse. A short
    // fade would be nicer but the voice is by definition nearly inaudible.
    worst.onRelease = null;
    worst.release();
    this.live.delete(worst);
    const index = this.idle.indexOf(worst);
    if (index !== -1) this.idle.splice(index, 1);
    return worst;
  }

  private readonly handleRelease = (voice: Voice): void => {
    if (!this.live.delete(voice)) return;
    if (this.idle.indexOf(voice) === -1) this.idle.push(voice);
  };

  /**
   * Safety sweep. `onended` is reliable in practice, but a suspended context, a
   * dropped device or a source that never actually started would otherwise leave
   * a voice marked live forever and slowly starve the pool.
   */
  sweep(now: number): void {
    let stale: Voice[] | null = null;
    for (const voice of this.live) {
      // An inactive voice in the live set never started, so nothing will ever
      // end it; it is reclaimed immediately rather than on a timeout.
      if (!voice.active || (!voice.loop && now > voice.endsAt + 0.5)) {
        (stale ??= []).push(voice);
      }
    }
    if (stale) for (const voice of stale) voice.release();
  }

  /** Every live voice, for diagnosing a pool that has not drained. */
  describeLive(now: number): LiveVoiceInfo[] {
    const out: LiveVoiceInfo[] = [];
    for (const voice of this.live) {
      out.push({
        id: voice.spec?.id ?? '<none>',
        tag: voice.tag,
        active: voice.active,
        loop: voice.loop,
        remaining: Number.isFinite(voice.endsAt) ? voice.endsAt - now : Number.POSITIVE_INFINITY,
        rate: voice.playbackRate,
      });
    }
    return out;
  }

  forEachLive(fn: (voice: Voice) => void): void {
    for (const voice of this.live) fn(voice);
  }

  stopTagged(tag: string, fade = 0.15): void {
    for (const voice of this.live) if (voice.tag === tag) voice.stop(fade);
  }

  stopAll(fade = 0.05): void {
    for (const voice of [...this.live]) voice.stop(fade);
  }

  releaseAll(): void {
    for (const voice of [...this.live]) voice.release();
  }

  dispose(): void {
    for (const voice of this.voices) voice.dispose();
    this.voices.length = 0;
    this.idle.length = 0;
    this.live.clear();
  }
}
