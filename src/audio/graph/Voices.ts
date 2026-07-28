/**
 * Voices: the fixed pool of node graphs every sound is played through.
 *
 * Browsers degrade badly past a few dozen concurrently processing nodes, and a
 * firefight will happily ask for hundreds, so the number of graphs is fixed at
 * init and never grows. Two things make that affordable:
 *
 *  - An idle voice is *disconnected* from its bus rather than left connected at
 *    zero gain. A subgraph with no path to the destination is not pulled by the
 *    audio thread, so an idle pool costs nothing.
 *  - When the pool is exhausted the quietest, least important voice is stolen,
 *    with a two-millisecond fade so the theft cannot click. A distant enemy's
 *    footstep loses to the player's own gunshot every time.
 *
 * `AudioBufferSourceNode`s are created per event because they are single-use by
 * design; everything else here is built once. Finished sources are disconnected
 * by a reaper that sweeps fixed-size arrays, so releasing them allocates
 * nothing either — no per-event `onended` closure.
 */

import type { BusName } from './Mixer';

/** How the distance curve should behave for a given kind of sound. */
export interface DistanceModel {
  refDistance: number;
  rolloffFactor: number;
  maxDistance: number;
}

/**
 * Pressure from a point source falls as 1/r, which is the inverse-square law
 * in intensity, so a rolloff of 1 is the honest number and that is what the
 * world uses. Weapons get slightly less than 1 and a long maximum because a
 * firefight two streets away is information the player needs; explosions carry
 * much further still.
 */
export const DISTANCE: Record<string, DistanceModel> = {
  weapon: { refDistance: 1.6, rolloffFactor: 0.88, maxDistance: 700 },
  world: { refDistance: 1.2, rolloffFactor: 1, maxDistance: 220 },
  footstep: { refDistance: 1, rolloffFactor: 1.35, maxDistance: 60 },
  explosion: { refDistance: 4, rolloffFactor: 0.8, maxDistance: 900 },
  aircraft: { refDistance: 30, rolloffFactor: 0.7, maxDistance: 2000 },
  /**
   * The far-field report of a weapon. Low frequencies lose almost nothing to
   * air absorption, so the thump of a rifle across the bay carries long after
   * the crack has gone — a shallow rolloff off a long reference distance is
   * what that looks like as a curve, and it is what keeps a firefight two
   * streets away audible as information rather than inaudible as detail.
   */
  report: { refDistance: 40, rolloffFactor: 0.55, maxDistance: 900 },
};

export interface PlayParams {
  bus: BusName;
  /** 0..1. Higher survives voice starvation. */
  priority: number;
  volume: number;
  rate: number;
  loop: boolean;
  /** Seconds from now. */
  delay: number;
  /** Offset into the buffer, in seconds. */
  offset: number;
  /** Reverb send, 0..1. */
  wet: number;
  /** Combined air-absorption and occlusion corner, in Hz. */
  lowpass: number;
  /** Treble tilt in dB, negative for occluded or distant sources. */
  tilt: number;
  positional: boolean;
  x: number;
  y: number;
  z: number;
  distance: DistanceModel;
  /** Attack ramp in seconds; 0 means start at full level. */
  attack: number;
  /** Stereo placement for non-positional voices, -1..1. */
  pan: number;
}

export const DEFAULT_PARAMS: PlayParams = {
  bus: 'world',
  priority: 0.5,
  volume: 1,
  rate: 1,
  loop: false,
  delay: 0,
  offset: 0,
  wet: 0.3,
  lowpass: 20000,
  tilt: 0,
  positional: false,
  x: 0,
  y: 0,
  z: 0,
  distance: DISTANCE.world,
  attack: 0,
  pan: 0,
};

export function resetParams(p: PlayParams): PlayParams {
  p.bus = 'world';
  p.priority = 0.5;
  p.volume = 1;
  p.rate = 1;
  p.loop = false;
  p.delay = 0;
  p.offset = 0;
  p.wet = 0.3;
  p.lowpass = 20000;
  p.tilt = 0;
  p.positional = false;
  p.x = 0;
  p.y = 0;
  p.z = 0;
  p.distance = DISTANCE.world;
  p.attack = 0;
  p.pan = 0;
  return p;
}

/**
 * One reusable voice graph.
 *
 *   input → lowpass → tilt shelf → panner → dry → bus
 *                                        └→ wet → reverb send
 */
export class Voice {
  readonly input: GainNode;
  private lp: BiquadFilterNode;
  private hs: BiquadFilterNode;
  private panner: PannerNode | null = null;
  private stereo: StereoPannerNode | null = null;
  private dry: GainNode;
  private wetGain: GainNode;
  private tail: AudioNode;

  /** Live state. Read by the culler; written on acquire. */
  active = false;
  priority = 0;
  audibility = 0;
  endTime = 0;
  generation = 0;
  bus: BusName = 'world';
  /** Emitter position, kept as scalars so tracking never allocates. */
  x = 0;
  y = 0;
  z = 0;
  positional = false;
  /** Set for loops that something else owns and will stop by hand. */
  held = false;
  /** Identifier of whatever owns this voice, for `stop(id)`. */
  owner = '';
  /** Occlusion applied last update, so it can be smoothed rather than jumped. */
  occlusion = 0;
  /** Base lowpass corner before occlusion, in Hz. */
  baseLowpass = 20000;
  baseTilt = 0;
  /** Set while a stolen voice is fading out. */
  private dying = false;

  private source: AudioBufferSourceNode | null = null;

  constructor(
    private ctx: BaseAudioContext,
    spatial: boolean,
    hrtf: boolean,
  ) {
    this.input = ctx.createGain();
    this.input.gain.value = 0;

    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 20000;
    this.lp.Q.value = 0.4;

    this.hs = ctx.createBiquadFilter();
    this.hs.type = 'highshelf';
    this.hs.frequency.value = 2200;
    this.hs.gain.value = 0;

    this.dry = ctx.createGain();
    this.dry.gain.value = 1;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;

    this.input.connect(this.lp);
    this.lp.connect(this.hs);

    if (spatial) {
      const p = ctx.createPanner();
      p.panningModel = hrtf ? 'HRTF' : 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = 1.2;
      p.rolloffFactor = 1;
      p.maxDistance = 300;
      p.coneInnerAngle = 360;
      p.coneOuterAngle = 360;
      p.coneOuterGain = 1;
      this.panner = p;
      this.hs.connect(p);
      this.tail = p;
      this.positional = true;
    } else {
      const s = ctx.createStereoPanner();
      this.stereo = s;
      this.hs.connect(s);
      this.tail = s;
    }
    this.tail.connect(this.dry);
    this.tail.connect(this.wetGain);
  }

  get isSpatial(): boolean {
    return this.panner !== null;
  }

  /** Score used to decide what to cull. Louder and more important survives. */
  get score(): number {
    return this.priority * 0.65 + this.audibility * 0.35;
  }

  /** Repositions a live emitter. Called for tracked sources; no allocation. */
  setPosition(x: number, y: number, z: number, now: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    const p = this.panner;
    if (!p) return;
    if (p.positionX) {
      p.positionX.setValueAtTime(x, now);
      p.positionY.setValueAtTime(y, now);
      p.positionZ.setValueAtTime(z, now);
    } else {
      (p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z);
    }
  }

  /** Applies occlusion filtering. Smoothed by the caller. */
  setOcclusion(occ: number, now: number): void {
    this.occlusion = occ;
    // Occluded sound arrives through mass, which is a lowpass, and around
    // corners, which costs level. Both, not one or the other.
    const hz = this.baseLowpass * Math.pow(0.045, occ);
    const tilt = this.baseTilt - 17 * occ;
    try {
      this.lp.frequency.setTargetAtTime(Math.max(180, hz), now, 0.05);
      this.hs.gain.setTargetAtTime(tilt, now, 0.05);
    } catch {
      this.lp.frequency.value = Math.max(180, hz);
      this.hs.gain.value = tilt;
    }
  }

  /** Scales a live voice's level, for tracked loops. */
  setLevel(volume: number, now: number, smoothing = 0.05): void {
    try {
      this.input.gain.setTargetAtTime(Math.max(0, volume), now, smoothing);
    } catch {
      this.input.gain.value = Math.max(0, volume);
    }
  }

  /** Sets the playback rate of a live loop, for doppler. */
  setRate(rate: number, now: number, smoothing = 0.04): void {
    if (!this.source) return;
    try {
      this.source.playbackRate.setTargetAtTime(Math.max(0.06, rate), now, smoothing);
    } catch {
      this.source.playbackRate.value = Math.max(0.06, rate);
    }
  }

  /**
   * Wires this voice up and starts a buffer through it. Returns the time the
   * voice is expected to finish, or 0 when nothing could be started.
   */
  start(buffer: AudioBuffer, p: PlayParams, busNode: AudioNode, reverb: AudioNode, now: number): number {
    const at = now + Math.max(0, p.delay);
    this.bus = p.bus;
    this.priority = p.priority;
    this.audibility = p.volume;
    this.baseLowpass = p.lowpass;
    this.baseTilt = p.tilt;
    this.occlusion = 0;
    this.dying = false;
    this.held = p.loop;

    try {
      this.lp.frequency.cancelScheduledValues(now);
      this.lp.frequency.setValueAtTime(Math.max(180, p.lowpass), now);
      this.hs.gain.cancelScheduledValues(now);
      this.hs.gain.setValueAtTime(p.tilt, now);

      const g = this.input.gain;
      g.cancelScheduledValues(now);
      if (p.attack > 0.0002) {
        g.setValueAtTime(0.0001, at);
        g.linearRampToValueAtTime(Math.max(0.0002, p.volume), at + p.attack);
      } else {
        g.setValueAtTime(Math.max(0, p.volume), at);
      }

      this.dry.gain.cancelScheduledValues(now);
      this.dry.gain.setValueAtTime(1, now);
      this.wetGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.setValueAtTime(Math.max(0, p.wet), now);

      if (this.panner) {
        const d = p.distance;
        this.panner.refDistance = d.refDistance;
        this.panner.rolloffFactor = d.rolloffFactor;
        this.panner.maxDistance = d.maxDistance;
        this.setPosition(p.x, p.y, p.z, now);
      } else if (this.stereo) {
        this.stereo.pan.setValueAtTime(Math.max(-1, Math.min(1, p.pan)), now);
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = p.loop;
      src.playbackRate.value = Math.max(0.06, p.rate);
      src.connect(this.input);
      const offset = Math.max(0, Math.min(buffer.duration - 0.001, p.offset));
      src.start(at, offset);
      this.source = src;

      this.dry.connect(busNode);
      this.wetGain.connect(reverb);
      this.active = true;
      this.generation++;
      const dur = p.loop ? 3600 : (buffer.duration - offset) / Math.max(0.06, p.rate);
      this.endTime = at + dur + 0.02;
      return this.endTime;
    } catch {
      this.releaseNow();
      return 0;
    }
  }

  /** Wires this voice up for an externally-driven source (a live layer stack). */
  open(p: PlayParams, busNode: AudioNode, reverb: AudioNode, now: number, duration: number): number {
    this.bus = p.bus;
    this.priority = p.priority;
    this.audibility = p.volume;
    this.baseLowpass = p.lowpass;
    this.baseTilt = p.tilt;
    this.occlusion = 0;
    this.dying = false;
    this.held = false;
    this.source = null;
    try {
      this.lp.frequency.cancelScheduledValues(now);
      this.lp.frequency.setValueAtTime(Math.max(180, p.lowpass), now);
      this.hs.gain.cancelScheduledValues(now);
      this.hs.gain.setValueAtTime(p.tilt, now);
      const g = this.input.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(0, p.volume), now);
      this.dry.gain.cancelScheduledValues(now);
      this.dry.gain.setValueAtTime(1, now);
      this.wetGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.setValueAtTime(Math.max(0, p.wet), now);
      if (this.panner) {
        const d = p.distance;
        this.panner.refDistance = d.refDistance;
        this.panner.rolloffFactor = d.rolloffFactor;
        this.panner.maxDistance = d.maxDistance;
        this.setPosition(p.x, p.y, p.z, now);
      } else if (this.stereo) {
        this.stereo.pan.setValueAtTime(Math.max(-1, Math.min(1, p.pan)), now);
      }
      this.dry.connect(busNode);
      this.wetGain.connect(reverb);
      this.active = true;
      this.generation++;
      this.endTime = now + duration + 0.03;
      return this.endTime;
    } catch {
      this.releaseNow();
      return 0;
    }
  }

  /** Fades out and marks for release. Used when stealing and when stopping. */
  fadeOut(now: number, seconds = 0.02): void {
    if (!this.active || this.dying) return;
    this.dying = true;
    this.held = false;
    try {
      const g = this.input.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(0.0001, g.value), now);
      g.exponentialRampToValueAtTime(0.0001, now + seconds);
    } catch {
      this.input.gain.value = 0;
    }
    this.endTime = now + seconds + 0.005;
  }

  /** Tears the voice out of the graph. Cheap and idempotent. */
  releaseNow(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    try {
      this.dry.disconnect();
      this.wetGain.disconnect();
    } catch {
      /* ignore */
    }
    this.active = false;
    this.held = false;
    this.dying = false;
    this.owner = '';
    this.priority = 0;
    this.audibility = 0;
    this.input.gain.value = 0;
  }

  dispose(): void {
    this.releaseNow();
    try {
      this.input.disconnect();
      this.lp.disconnect();
      this.hs.disconnect();
      this.panner?.disconnect();
      this.stereo?.disconnect();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Sweeps up finished `AudioBufferSourceNode`s.
 *
 * Attaching `onended` to each source would allocate a closure per shot, which
 * at nine hundred rounds a minute is exactly the sort of per-frame garbage the
 * engine is not allowed to make. Instead every source is filed in a ring with
 * the time it will finish, and a fixed-cost sweep disconnects the expired ones.
 */
export class SourceReaper {
  private nodes: Array<AudioBufferSourceNode | null>;
  private deadline: Float64Array;
  private head = 0;
  private live = 0;

  constructor(capacity = 512) {
    this.nodes = new Array(capacity).fill(null);
    this.deadline = new Float64Array(capacity);
  }

  get liveCount(): number {
    return this.live;
  }

  track(node: AudioBufferSourceNode, endTime: number): void {
    const cap = this.nodes.length;
    const slot = this.head;
    const existing = this.nodes[slot];
    if (existing) {
      // The ring wrapped, which means the capacity is exhausted. Retiring the
      // oldest entry early is preferable to growing the array at runtime.
      try {
        existing.disconnect();
      } catch {
        /* ignore */
      }
      this.live--;
    }
    this.nodes[slot] = node;
    this.deadline[slot] = endTime;
    this.head = (slot + 1) % cap;
    this.live++;
  }

  sweep(now: number): void {
    if (this.live === 0) return;
    const cap = this.nodes.length;
    for (let i = 0; i < cap; i++) {
      const n = this.nodes[i];
      if (!n) continue;
      if (this.deadline[i] > now) continue;
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
      this.nodes[i] = null;
      this.live--;
    }
  }

  clear(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (!n) continue;
      try {
        n.stop();
      } catch {
        /* ignore */
      }
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
      this.nodes[i] = null;
    }
    this.live = 0;
    this.head = 0;
  }
}

/** A pool of interchangeable voices with priority-based stealing. */
export class VoicePool {
  private voices: Voice[] = [];
  private spatialCount = 0;

  constructor(
    ctx: BaseAudioContext,
    /** Positional voices, which carry a `PannerNode`. */
    spatial: number,
    /** Head-relative voices: interface, music, the player's own body. */
    flat: number,
    hrtf: boolean,
  ) {
    for (let i = 0; i < spatial; i++) this.voices.push(new Voice(ctx, true, hrtf));
    this.spatialCount = spatial;
    for (let i = 0; i < flat; i++) this.voices.push(new Voice(ctx, false, false));
  }

  get budget(): number {
    return this.voices.length;
  }

  get spatialBudget(): number {
    return this.spatialCount;
  }

  get activeCount(): number {
    let n = 0;
    for (const v of this.voices) if (v.active) n++;
    return n;
  }

  all(): readonly Voice[] {
    return this.voices;
  }

  /**
   * Finds a voice of the right kind. Prefers an idle one; failing that, steals
   * the weakest active voice, but only if the new sound is actually more
   * important than it — otherwise the new sound is simply dropped, which is
   * the correct behaviour for the twentieth simultaneous distant footstep.
   */
  acquire(spatial: boolean, score: number, now: number): Voice | null {
    const lo = spatial ? 0 : this.spatialCount;
    const hi = spatial ? this.spatialCount : this.voices.length;
    let worst: Voice | null = null;
    let worstScore = Number.POSITIVE_INFINITY;
    for (let i = lo; i < hi; i++) {
      const v = this.voices[i];
      if (!v.active) return v;
      if (v.held) continue;
      const s = v.score;
      if (s < worstScore) {
        worstScore = s;
        worst = v;
      }
    }
    if (worst && worstScore < score * 0.92) {
      worst.releaseNow();
      return worst;
    }
    return null;
  }

  /** Releases anything whose scheduled life is over. */
  sweep(now: number): void {
    for (const v of this.voices) {
      if (v.active && !v.held && v.endTime <= now) v.releaseNow();
    }
  }

  stopOwner(owner: string, now: number): void {
    for (const v of this.voices) {
      if (v.active && v.owner === owner) v.fadeOut(now, 0.08);
    }
  }

  stopAll(now: number): void {
    for (const v of this.voices) if (v.active) v.fadeOut(now, 0.03);
  }

  releaseAll(): void {
    for (const v of this.voices) v.releaseNow();
  }

  dispose(): void {
    for (const v of this.voices) v.dispose();
    this.voices.length = 0;
  }
}
