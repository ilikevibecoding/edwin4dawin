/**
 * The audio engine: context lifecycle, the listener, and everything that turns a
 * sound id plus a world position into a playing voice.
 *
 * Responsibilities kept here rather than in the system wrapper:
 *  - One `AudioContext`, created lazily and resumed on a user gesture.
 *  - Suspend on tab blur and resume on return, so a backgrounded game is silent
 *    and costs nothing.
 *  - Distance: attenuation via the panner, air absorption via a per-voice
 *    low-pass, propagation delay for anything far enough away that the delay is
 *    a feature rather than latency, and Doppler from listener and source motion.
 *  - Occlusion, applied per frame to the voices that earn it.
 */
import * as THREE from 'three';
import { clamp, saturate } from '../core/MathUtils';
import type { PhysicsSystem } from '../core/Contracts';
import { BufferBank, type BankStats } from './BufferBank';
import { MixerGraph } from './Graph';
import {
  OcclusionField,
  occludedCutoff,
  occludedGain,
  occludedSend,
} from './Occlusion';
import { SoundLibrary } from './sounds';
import type { SpaceId } from './synth';
import { SPEED_OF_SOUND, Voice, VoicePool } from './Voice';

/** Simultaneous voices. 48 is generous for a shooter and cheap to hold. */
export const VOICE_BUDGET = 48;

/** Distance past which the travel time of sound is worth simulating. */
const PROPAGATION_MIN_DISTANCE = 24;
const PROPAGATION_MAX_DELAY = 1.4;

/** Base air-absorption constant: cutoff = REF / (1 + d * K). */
const AIR_REF_HZ = 18000;
const AIR_K = 0.085;

export interface PlayOptions {
  volume?: number;
  pitch?: number;
  refDistance?: number;
  maxDistance?: number;
  /** Extra scheduling delay in seconds, on top of propagation. */
  delay?: number;
  /** High-shelf tilt in dB, for brightness variation. */
  toneDb?: number;
  /** Absolute reverb send override. */
  send?: number;
  loop?: boolean;
  /** Owner tag, so a caller can stop its own loops. */
  tag?: string;
  /** Suppress the travel-time delay (feedback sounds must be immediate). */
  immediate?: boolean;
  /** Bypass the deafen chain. */
  direct?: boolean;
  /** Source velocity for Doppler. */
  velocity?: THREE.Vector3;
  /** Pick a specific variant instead of round-robin. */
  variant?: number;
  /** Multiplier on the authored priority, for stealing decisions. */
  priorityScale?: number;
  /** Skip occlusion for this voice even if it would otherwise qualify. */
  noOcclusion?: boolean;
}

/** Safe reference to a playing voice; goes inert once the voice is recycled. */
export class SoundHandle {
  constructor(
    private readonly voice: Voice | null,
    private readonly generation: number,
  ) {}

  private get live(): Voice | null {
    const v = this.voice;
    if (!v || !v.active || v.generation !== this.generation) return null;
    return v;
  }

  get alive(): boolean {
    return this.live !== null;
  }

  setPosition(position: THREE.Vector3, ramp = 0.06): void {
    this.live?.setPosition(position.x, position.y, position.z, ramp);
  }

  setVolume(v: number, ramp = 0.06): void {
    this.live?.setGain(Math.max(0, v), ramp);
  }

  setPitch(rate: number, ramp = 0.06): void {
    this.live?.setPlaybackRate(rate, ramp);
  }

  setToneDb(db: number, ramp = 0.08): void {
    this.live?.setToneDb(db, ramp);
  }

  stop(fade = 0.12): void {
    this.live?.stop(fade);
  }
}

export const DEAD_HANDLE = new SoundHandle(null, -1);

export interface EngineStats {
  state: string;
  sampleRate: number;
  voicesLive: number;
  voicesPeak: number;
  voicesIdle: number;
  voicesStarted: number;
  voicesStolen: number;
  voicesRejected: number;
  /** Voices that were acquired but threw before they could start. */
  voicesFailed: number;
  occlusionTests: number;
  occlusionCacheHits: number;
  masterLevel: number;
  weaponsLevel: number;
  limiterReductionDb: number;
  updateMs: number;
  bank: BankStats;
  space: SpaceId | null;
}

export class AudioEngine {
  readonly library = new SoundLibrary();
  private context: AudioContext | null = null;
  private graphImpl: MixerGraph | null = null;
  private bankImpl: BufferBank | null = null;
  private poolImpl: VoicePool | null = null;
  readonly occlusion = new OcclusionField();

  private unlockedFlag = false;
  private suspendedByVisibility = false;
  private available = true;
  private warmComplete = false;

  private readonly listenerPosition = new THREE.Vector3();
  private readonly listenerForward = new THREE.Vector3(0, 0, -1);
  private readonly listenerUp = new THREE.Vector3(0, 1, 0);
  private readonly listenerVelocity = new THREE.Vector3();
  private listenerSetThisFrame = false;

  private readonly scratchDir = new THREE.Vector3();
  private updateMs = 0;
  private frame = 0;
  private failures = 0;
  /** Logs start failures and unresolved ids. Set by the dev harness. */
  verbose = false;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Create the context and the graph. Legal before any user gesture — the
   * context simply starts suspended and produces nothing until `unlock`.
   */
  init(): boolean {
    if (this.context) return true;
    if (!this.available) return false;
    const Ctor: typeof AudioContext | undefined =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!Ctor) {
      this.available = false;
      console.warn('[audio] Web Audio is unavailable; running silent');
      return false;
    }
    try {
      this.context = new Ctor({ latencyHint: 'interactive' });
    } catch (err) {
      this.available = false;
      console.warn('[audio] could not create an AudioContext; running silent', err);
      return false;
    }
    this.graphImpl = new MixerGraph(this.context);
    this.bankImpl = new BufferBank(this.context, this.library);
    this.poolImpl = new VoicePool(this.graphImpl, VOICE_BUDGET);
    this.unlockedFlag = this.context.state === 'running';
    this.applyListener(0);
    return true;
  }

  get ok(): boolean {
    return this.context !== null && this.graphImpl !== null;
  }

  get graph(): MixerGraph | null {
    return this.graphImpl;
  }

  get bank(): BufferBank | null {
    return this.bankImpl;
  }

  get pool(): VoicePool | null {
    return this.poolImpl;
  }

  get unlocked(): boolean {
    return this.unlockedFlag && this.context?.state === 'running';
  }

  get sampleRate(): number {
    return this.context?.sampleRate ?? 48000;
  }

  get now(): number {
    return this.context?.currentTime ?? 0;
  }

  /** Idempotent, and safe to wire to every plausible gesture. */
  async unlock(): Promise<void> {
    if (!this.init()) return;
    const ctx = this.context;
    if (!ctx) return;
    if (ctx.state === 'running') {
      this.unlockedFlag = true;
      return;
    }
    try {
      await ctx.resume();
      this.unlockedFlag = (ctx.state as AudioContextState) === 'running';
    } catch {
      // Still no gesture, or the device is busy. Harmless: the next call retries.
      this.unlockedFlag = false;
    }
  }

  /** Suspend on blur. Returns immediately if there is nothing to suspend. */
  suspendForVisibility(): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    this.suspendedByVisibility = true;
    void ctx.suspend().catch(() => {
      this.suspendedByVisibility = false;
    });
  }

  resumeFromVisibility(): void {
    const ctx = this.context;
    if (!ctx || !this.suspendedByVisibility) return;
    this.suspendedByVisibility = false;
    if (!this.unlockedFlag) return;
    void ctx.resume().catch(() => {
      /* will retry on the next gesture */
    });
  }

  /** Render the hot set. Called once from `init`, blocking, on the loader. */
  warmHotSet(): void {
    this.bankImpl?.pump(220);
  }

  /** Continue warming in the background. */
  pumpWarmup(budgetMs: number): void {
    if (this.warmComplete || !this.bankImpl) return;
    this.warmComplete = this.bankImpl.pump(budgetMs);
  }

  get warmedUp(): boolean {
    return this.warmComplete;
  }

  setPhysics(physics: PhysicsSystem | null): void {
    this.occlusion.setPhysics(physics);
  }

  // -------------------------------------------------------------------------
  // Listener
  // -------------------------------------------------------------------------

  setListener(
    position: THREE.Vector3,
    forward: THREE.Vector3,
    up: THREE.Vector3,
    velocity: THREE.Vector3,
  ): void {
    this.listenerPosition.copy(position);
    this.listenerForward.copy(forward);
    this.listenerUp.copy(up);
    this.listenerVelocity.copy(velocity);
    this.listenerSetThisFrame = true;
  }

  get listenerAt(): THREE.Vector3 {
    return this.listenerPosition;
  }

  get listenerWasSet(): boolean {
    return this.listenerSetThisFrame;
  }

  private applyListener(ramp: number): void {
    const ctx = this.context;
    if (!ctx) return;
    const l = ctx.listener;
    const f = this.listenerForward;
    const u = this.listenerUp;
    const p = this.listenerPosition;
    if (l.positionX) {
      const now = ctx.currentTime;
      if (ramp <= 0) {
        l.positionX.value = p.x;
        l.positionY.value = p.y;
        l.positionZ.value = p.z;
        l.forwardX.value = f.x;
        l.forwardY.value = f.y;
        l.forwardZ.value = f.z;
        l.upX.value = u.x;
        l.upY.value = u.y;
        l.upZ.value = u.z;
      } else {
        const tc = ramp * 0.4;
        l.positionX.setTargetAtTime(p.x, now, tc);
        l.positionY.setTargetAtTime(p.y, now, tc);
        l.positionZ.setTargetAtTime(p.z, now, tc);
        l.forwardX.setTargetAtTime(f.x, now, tc);
        l.forwardY.setTargetAtTime(f.y, now, tc);
        l.forwardZ.setTargetAtTime(f.z, now, tc);
        l.upX.setTargetAtTime(u.x, now, tc);
        l.upY.setTargetAtTime(u.y, now, tc);
        l.upZ.setTargetAtTime(u.z, now, tc);
      }
      return;
    }
    const legacy = l as unknown as {
      setPosition?: (x: number, y: number, z: number) => void;
      setOrientation?: (
        fx: number,
        fy: number,
        fz: number,
        ux: number,
        uy: number,
        uz: number,
      ) => void;
    };
    legacy.setPosition?.(p.x, p.y, p.z);
    legacy.setOrientation?.(f.x, f.y, f.z, u.x, u.y, u.z);
  }

  // -------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------

  /**
   * Air-absorption cutoff for a distance. This one function does more for the
   * perceived quality of the mix than anything else in the module: it is the
   * difference between a distant rifle being a *distant rifle* and being a quiet
   * close-up gunshot.
   */
  airCutoff(distance: number, airScale: number): number {
    if (airScale <= 0) return 20000;
    return clamp(AIR_REF_HZ / (1 + distance * AIR_K * airScale), 200, 20000);
  }

  /** Doppler playback-rate multiplier for a source at `position`. */
  private dopplerRate(position: THREE.Vector3, sourceVelocity: THREE.Vector3 | undefined): number {
    const dir = this.scratchDir.copy(position).sub(this.listenerPosition);
    const len = dir.length();
    if (len < 1e-3) return 1;
    dir.multiplyScalar(1 / len);
    const observerToward = this.listenerVelocity.dot(dir);
    const sourceToward = sourceVelocity ? -sourceVelocity.dot(dir) : 0;
    const denom = SPEED_OF_SOUND - sourceToward;
    if (denom < 40) return 2.2;
    return clamp((SPEED_OF_SOUND + observerToward) / denom, 0.45, 2.4);
  }

  /**
   * Play `id`. `position` of null makes it a 2D voice at the listener.
   * Returns a handle for loops; one-shots can ignore it.
   */
  play(id: string, position: THREE.Vector3 | null, opts: PlayOptions = {}): SoundHandle {
    if (!this.ok) return DEAD_HANDLE;
    const graph = this.graphImpl!;
    const bank = this.bankImpl!;
    const pool = this.poolImpl!;

    const spec = this.library.resolve(id);
    if (!spec) return DEAD_HANDLE;
    const picked = bank.get(spec.id, opts.variant ?? -1);
    if (!picked) return DEAD_HANDLE;

    const volume = opts.volume ?? 1;
    if (volume <= 0.0005) return DEAD_HANDLE;

    let distance = 0;
    if (position) distance = this.listenerPosition.distanceTo(position);

    // Cull sounds that are inaudible before they ever reach the pool. Without
    // this a firefight across the map spends the entire voice budget on
    // impacts nobody can hear.
    if (position && distance > spec.maxDistance * 1.05 && !spec.loop) return DEAD_HANDLE;

    const gain = volume * spec.gain;
    const priority = saturate(spec.priority * (opts.priorityScale ?? 1));
    // Stealing score: importance discounted by distance, so a close casing can
    // still outrank a far-off explosion that nobody will notice missing.
    const score = gain * (0.25 + 0.75 * priority) * (position ? 1 / (1 + distance / 30) : 1);
    const voice = pool.acquire(score);
    if (!voice) return DEAD_HANDLE;

    const rate = clamp(
      (opts.pitch ?? 1) *
        semitones(spec.pitchJitter === 0 ? 0 : (Math.random() * 2 - 1) * spec.pitchJitter) *
        (position ? this.dopplerRate(position, opts.velocity) : 1),
      0.06,
      8,
    );

    let when = graph.now + Math.max(0, opts.delay ?? 0);
    if (position && spec.propagate && !opts.immediate && distance > PROPAGATION_MIN_DISTANCE) {
      when += Math.min(PROPAGATION_MAX_DELAY, distance / SPEED_OF_SOUND);
    }

    const effectiveSpec =
      opts.refDistance !== undefined || opts.maxDistance !== undefined
        ? {
            ...spec,
            refDistance: opts.refDistance ?? spec.refDistance,
            maxDistance: opts.maxDistance ?? spec.maxDistance,
          }
        : spec;

    try {
      voice.start({
        spec: effectiveSpec,
        buffer: picked.buffer,
        gain,
        playbackRate: rate,
        position,
        loop: opts.loop ?? spec.loop,
        when,
        distance,
        airHz: this.airCutoff(distance, spec.airScale),
        toneDb: opts.toneDb ?? 0,
        send: opts.send ?? spec.send,
        priority,
        tag: opts.tag ?? '',
        direct: opts.direct ?? false,
      });
    } catch (err) {
      // A voice handed out but not started would hold its pool slot forever.
      voice.release();
      this.failures++;
      if (this.verbose) console.warn(`[audio] failed to start '${id}':`, err);
      return DEAD_HANDLE;
    }

    return new SoundHandle(voice, voice.generation);
  }

  play2D(id: string, opts: PlayOptions = {}): SoundHandle {
    return this.play(id, null, opts);
  }

  stopTagged(tag: string, fade = 0.15): void {
    this.poolImpl?.stopTagged(tag, fade);
  }

  stopAll(fade = 0.05): void {
    this.poolImpl?.stopAll(fade);
  }

  // -------------------------------------------------------------------------
  // Per-frame
  // -------------------------------------------------------------------------

  update(dt: number): void {
    if (!this.ok) return;
    const start = perfNow();
    const graph = this.graphImpl!;
    const pool = this.poolImpl!;
    this.frame++;

    this.applyListener(dt > 0 ? Math.min(0.08, dt * 2) : 0);
    pool.sweep(graph.now);

    // Occlusion is only worth running when there is a physics system and a
    // listener that has actually been placed.
    if (this.occlusion.available) {
      this.occlusion.beginFrame(dt, this.listenerPosition);
      pool.forEachLive((voice) => this.updateVoiceOcclusion(voice, dt));
    }

    this.listenerSetThisFrame = false;
    this.updateMs = perfNow() - start;
  }

  private updateVoiceOcclusion(voice: Voice, dt: number): void {
    const spec = voice.spec;
    if (!spec || !voice.positional) return;
    // Short one-shots are over before an occlusion ramp could finish; only
    // voices with some duration left are worth the work.
    const remaining = voice.endsAt - this.now;
    if (!voice.loop && remaining < 0.12) return;
    if (spec.priority < 0.3) return;

    const p = voice.worldPosition;
    const result = this.occlusion.query(p.x, p.y, p.z, spec.priority);
    const smoothed = this.occlusion.smooth(voice.occlusion, result.amount, dt);
    // Nothing to do while both the applied and the target value are clear; this
    // is the common case and it must not schedule ramps every frame.
    if (smoothed < 0.002 && voice.occlusion < 0.002) return;
    voice.occlusion = smoothed;

    voice.setAirCutoff(occludedCutoff(voice.airHz, smoothed), 0.12);
    // The attenuation rides on top of `baseGain` rather than replacing it, so a
    // caller that also changes the volume of a live voice is not fighting this.
    voice.applyOcclusionGain(occludedGain(smoothed));
    voice.setSendLevel(occludedSend(spec.send, smoothed), 0.08);
  }

  // -------------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------------

  stats(): EngineStats {
    const graph = this.graphImpl;
    const pool = this.poolImpl;
    const bank = this.bankImpl;
    return {
      state: this.context?.state ?? 'none',
      sampleRate: this.sampleRate,
      voicesLive: pool?.liveCount ?? 0,
      voicesPeak: pool?.peakLive ?? 0,
      voicesIdle: pool?.idleCount ?? 0,
      voicesStarted: pool?.started ?? 0,
      voicesStolen: pool?.stolen ?? 0,
      voicesRejected: pool?.rejected ?? 0,
      voicesFailed: this.failures,
      occlusionTests: this.occlusion.tests,
      occlusionCacheHits: this.occlusion.cacheHits,
      masterLevel: graph?.masterLevel() ?? 0,
      weaponsLevel: graph?.weaponsLevel() ?? 0,
      limiterReductionDb: graph?.limiterReduction() ?? 0,
      updateMs: Math.round(this.updateMs * 1000) / 1000,
      bank: bank?.stats() ?? {
        ids: 0,
        buffers: 0,
        frames: 0,
        bytes: 0,
        renderMs: 0,
        pendingIds: 0,
        onDemandRenders: 0,
      },
      space: graph?.space ?? null,
    };
  }

  dispose(): void {
    this.poolImpl?.dispose();
    this.graphImpl?.dispose();
    this.bankImpl?.dispose();
    this.occlusion.clear();
    const ctx = this.context;
    this.context = null;
    this.graphImpl = null;
    this.bankImpl = null;
    this.poolImpl = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
  }
}

const semitones = (n: number): number => (n === 0 ? 1 : Math.pow(2, n / 12));

const perfNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();
