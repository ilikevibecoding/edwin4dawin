/**
 * The bus architecture and the master chain.
 *
 * Seven buses, each with its own compressor because each has a different job:
 * the weapon bus has to hold a sustained burst together without pumping, the
 * explosion bus has to be allowed to get genuinely loud for a moment, and the
 * ambience bus has to stay where it is put. Everything then meets at a master
 * limiter followed by a soft-clip stage, which is what makes it structurally
 * impossible for a nearby blast to send the output past full scale — the
 * transfer curve's own range is the guarantee, not a gain assumption.
 *
 * Above the limiter sit two global states: `duck`, driven by `audio:duck`, and
 * `muffle`, the temporary hearing loss after something goes off too close.
 */

import type { Clip } from '../dsp/Kernel';
import { tanhCurve } from '../dsp/Kernel';
import { ZONES, type ZoneName } from '../dsp/Zones';

export type BusName =
  | 'weapons'
  | 'world'
  | 'footsteps'
  | 'explosions'
  | 'ui'
  | 'music'
  | 'ambience';

/**
 * Sample ceiling of the master chain. The soft-clip stage's curve cannot reach
 * beyond this, so no sample can, and the margin under full scale is there for
 * the inter-sample peaks a converter's reconstruction filter produces from
 * material that is already sitting on the limit.
 */
const CEILING = 0.97;

export const BUS_NAMES: readonly BusName[] = [
  'weapons',
  'world',
  'footsteps',
  'explosions',
  'ui',
  'music',
  'ambience',
];

interface BusSpec {
  gain: number;
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
  /** How much of a global duck this bus takes, 0..1. */
  duckable: number;
}

/**
 * The level the buses are staged around: what the loudest recurring one-shot in
 * the game is expected to approach at a bus input.
 *
 * Everything the engine emits is aimed at some fraction of this, and the
 * thresholds below are placed relative to it. The reason it is 6 dB under full
 * scale rather than near it is the master clipper: a soft-clip curve normalised
 * to reach its ceiling at full-scale input has a small-signal slope of nearly
 * two, so the chain supplies its own last 6 dB. A gunshot arriving here at half
 * scale leaves the master a couple of decibels below full scale.
 */
export const NOMINAL = 0.5;

/**
 * Each threshold sits where the bus's own loudest single event lands, with a
 * soft knee spanning it.
 *
 * So one shot takes well under a decibel and keeps its crest factor, while a
 * burst, or six enemies firing at once, walks up into the knee and gets glued
 * together. The quieter buses are set proportionally lower — a footstep that
 * arrives 12 dB under a gunshot needs its threshold 12 dB lower to be
 * compressed at all, and footsteps benefit from it, since they are gameplay
 * information and want to be consistently audible rather than dynamic.
 *
 * None of these is the peak guarantee. That is the master clipper's transfer
 * curve, which is instantaneous and stateless and therefore cannot be fooled.
 */
const SPECS: Record<BusName, BusSpec> = {
  // Fast attack and a short release: a burst has to stay punchy shot to shot.
  weapons: { gain: 0.9, threshold: -6, knee: 6, ratio: 2.5, attack: 0.002, release: 0.11, duckable: 0.85 },
  world: { gain: 0.85, threshold: -8, knee: 8, ratio: 2.5, attack: 0.005, release: 0.16, duckable: 1 },
  footsteps: { gain: 0.7, threshold: -12, knee: 10, ratio: 2, attack: 0.01, release: 0.2, duckable: 1 },
  // Allowed to be loud, but with a long release so the mix comes back gently.
  explosions: { gain: 1, threshold: -2, knee: 4, ratio: 4, attack: 0.001, release: 0.32, duckable: 0.3 },
  // The interface never ducks; it is the one thing that must always be heard.
  ui: { gain: 0.75, threshold: -8, knee: 4, ratio: 2, attack: 0.003, release: 0.1, duckable: 0 },
  music: { gain: 0.42, threshold: -14, knee: 10, ratio: 3, attack: 0.02, release: 0.3, duckable: 1 },
  ambience: { gain: 0.55, threshold: -18, knee: 12, ratio: 2, attack: 0.05, release: 0.4, duckable: 1 },
};

export class Bus {
  readonly input: GainNode;
  private comp: DynamicsCompressorNode | null;
  private duckGain: GainNode;
  private volume: GainNode;
  private userVolume = 1;

  constructor(
    readonly name: BusName,
    ctx: BaseAudioContext,
    destination: AudioNode,
    readonly spec: BusSpec,
  ) {
    this.input = ctx.createGain();
    this.input.gain.value = 1;
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1;
    this.volume = ctx.createGain();
    this.volume.gain.value = spec.gain;

    let head: AudioNode = this.input;
    try {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = spec.threshold;
      comp.knee.value = spec.knee;
      comp.ratio.value = spec.ratio;
      comp.attack.value = spec.attack;
      comp.release.value = spec.release;
      this.comp = comp;
      head.connect(comp);
      head = comp;
    } catch {
      this.comp = null;
    }
    head.connect(this.duckGain);
    this.duckGain.connect(this.volume);
    this.volume.connect(destination);
  }

  setVolume(v: number): void {
    this.userVolume = Math.max(0, Math.min(1, v));
    this.volume.gain.value = this.spec.gain * this.userVolume;
  }

  get busVolume(): number {
    return this.userVolume;
  }

  /** Applies a global duck, scaled by how duckable this bus is. */
  duck(amount: number, duration: number, now: number): void {
    if (this.spec.duckable <= 0) return;
    const target = Math.max(0.05, 1 - amount * this.spec.duckable);
    const g = this.duckGain.gain;
    try {
      g.cancelScheduledValues(now);
      g.setTargetAtTime(target, now, 0.03);
      g.setTargetAtTime(1, now + duration * 0.45, Math.max(0.06, duration * 0.32));
    } catch {
      g.value = target;
    }
  }

  /** Reduction the compressor is currently applying, in dB. For diagnostics. */
  get reduction(): number {
    return this.comp ? this.comp.reduction : 0;
  }

  dispose(): void {
    try {
      this.input.disconnect();
      this.comp?.disconnect();
      this.duckGain.disconnect();
      this.volume.disconnect();
    } catch {
      /* a disposed context throws; nothing to do about it */
    }
  }
}

/**
 * Two convolvers so a zone change can be crossfaded rather than switched. The
 * player walking out of the souk into the street should hear the tail change
 * over about a second, which is roughly how long it takes the ear to accept a
 * new room anyway.
 */
class ReverbUnit {
  readonly input: GainNode;
  private convA: ConvolverNode | null = null;
  private convB: ConvolverNode | null = null;
  private gainA: GainNode;
  private gainB: GainNode;
  private preLp: BiquadFilterNode;
  private ret: GainNode;
  private useB = false;
  private currentZone: ZoneName | null = null;

  constructor(
    private ctx: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.input = ctx.createGain();
    this.input.gain.value = 1;
    // Nothing above a few kHz survives more than one bounce; filtering here
    // rather than after the convolver saves the convolver the work.
    this.preLp = ctx.createBiquadFilter();
    this.preLp.type = 'lowpass';
    this.preLp.frequency.value = 5200;
    this.preLp.Q.value = 0.7;
    this.gainA = ctx.createGain();
    this.gainB = ctx.createGain();
    this.gainA.gain.value = 1;
    this.gainB.gain.value = 0;
    this.ret = ctx.createGain();
    this.ret.gain.value = 1;

    this.input.connect(this.preLp);
    try {
      this.convA = ctx.createConvolver();
      this.convB = ctx.createConvolver();
      this.convA.normalize = false;
      this.convB.normalize = false;
      this.preLp.connect(this.convA);
      this.preLp.connect(this.convB);
      this.convA.connect(this.gainA);
      this.convB.connect(this.gainB);
    } catch {
      // No convolver: fall through dry rather than going silent.
      this.preLp.connect(this.gainA);
    }
    this.gainA.connect(this.ret);
    this.gainB.connect(this.ret);
    this.ret.connect(destination);
  }

  get zone(): ZoneName | null {
    return this.currentZone;
  }

  /** Crossfades to a new impulse response over `seconds`. */
  setZone(zone: ZoneName, ir: Clip | null, seconds: number, now: number): void {
    if (zone === this.currentZone) return;
    const buffer = ir?.toBuffer(this.ctx) ?? null;
    const incoming = this.useB ? this.convA : this.convB;
    const inGain = this.useB ? this.gainA : this.gainB;
    const outGain = this.useB ? this.gainB : this.gainA;
    if (incoming && buffer) {
      try {
        incoming.buffer = buffer;
      } catch {
        return;
      }
    } else if (!this.convA) {
      this.currentZone = zone;
      this.ret.gain.value = ZONES[zone].wet;
      return;
    }
    const t = Math.max(0.05, seconds);
    try {
      inGain.gain.cancelScheduledValues(now);
      outGain.gain.cancelScheduledValues(now);
      inGain.gain.setValueAtTime(inGain.gain.value, now);
      outGain.gain.setValueAtTime(outGain.gain.value, now);
      inGain.gain.linearRampToValueAtTime(1, now + t);
      outGain.gain.linearRampToValueAtTime(0, now + t);
      this.ret.gain.cancelScheduledValues(now);
      this.ret.gain.setValueAtTime(this.ret.gain.value, now);
      this.ret.gain.linearRampToValueAtTime(ZONES[zone].wet, now + t);
    } catch {
      inGain.gain.value = 1;
      outGain.gain.value = 0;
      this.ret.gain.value = ZONES[zone].wet;
    }
    this.useB = !this.useB;
    this.currentZone = zone;
  }

  /** Forces an impulse response into both slots, for the first zone. */
  prime(zone: ZoneName, ir: Clip | null): void {
    const buffer = ir?.toBuffer(this.ctx) ?? null;
    if (!buffer) return;
    try {
      if (this.convA) this.convA.buffer = buffer;
      if (this.convB) this.convB.buffer = buffer;
      this.gainA.gain.value = 1;
      this.gainB.gain.value = 0;
      this.ret.gain.value = ZONES[zone].wet;
      this.useB = false;
      this.currentZone = zone;
    } catch {
      /* leave it dry */
    }
  }

  dispose(): void {
    try {
      this.input.disconnect();
      this.preLp.disconnect();
      this.convA?.disconnect();
      this.convB?.disconnect();
      this.gainA.disconnect();
      this.gainB.disconnect();
      this.ret.disconnect();
    } catch {
      /* ignore */
    }
  }
}

export class Mixer {
  readonly buses = new Map<BusName, Bus>();
  readonly reverb: ReverbUnit;
  /** Where a voice's wet send goes. */
  readonly reverbInput: GainNode;
  private masterIn: GainNode;
  private muffle: BiquadFilterNode;
  private muffleTilt: BiquadFilterNode;
  private masterVol: GainNode;
  private limiter: DynamicsCompressorNode | null = null;
  private clipper: WaveShaperNode | null = null;
  private out: GainNode;
  private ringGain: GainNode;
  private ringSource: AudioBufferSourceNode | null = null;
  private masterVolume = 0.8;
  /** 0..1 hearing damage; 1 is right after a blast at your feet. */
  private ring = 0;
  private ringTarget = 0;

  constructor(
    private ctx: BaseAudioContext,
    destination: AudioNode,
    /** 0..1 quality scalar: sets the resolution of the master clipper's curve. */
    quality: number,
  ) {
    this.masterIn = ctx.createGain();
    this.masterIn.gain.value = 1;

    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;
    this.muffle.Q.value = 0.7;

    // A shelf as well as the lowpass, because losing your hearing tilts the
    // whole spectrum rather than putting a wall at one frequency.
    this.muffleTilt = ctx.createBiquadFilter();
    this.muffleTilt.type = 'highshelf';
    this.muffleTilt.frequency.value = 1600;
    this.muffleTilt.gain.value = 0;

    this.masterVol = ctx.createGain();
    this.masterVol.gain.value = this.masterVolume;

    this.out = ctx.createGain();
    this.out.gain.value = 1;

    this.masterIn.connect(this.muffle);
    this.muffle.connect(this.muffleTilt);
    this.muffleTilt.connect(this.masterVol);

    let head: AudioNode = this.masterVol;
    try {
      /*
       * A programme limiter, not the peak guarantee. Nothing a single event
       * reaches gets near its threshold; what it is for is sustained overs —
       * six enemies firing at once, an airstrike walking across the map — where
       * it catches the programme level before the clipper below it has to start
       * distorting. The clipper is what actually holds the ceiling.
       */
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -4;
      lim.knee.value = 2;
      lim.ratio.value = 20;
      lim.attack.value = 0.0016;
      lim.release.value = 0.22;
      this.limiter = lim;
      head.connect(lim);
      head = lim;
    } catch {
      this.limiter = null;
    }
    try {
      /*
       * The hard guarantee. A `WaveShaperNode` clamps its input to the curve's
       * domain, so whatever arrives, what leaves cannot exceed the curve's own
       * maximum. Twenty simultaneous explosions distort; they do not clip.
       *
       * Deliberately not oversampled, which is the opposite of the usual advice
       * and here the only defensible choice. An oversampled shaper resamples
       * after the curve rather than before it, so its output is no longer bounded
       * by the curve's range: measured on an impulse it returns 3.8 per cent
       * above the value the curve defines, which on a 0.97 ceiling is 1.007 and
       * therefore over. It also costs a render quantum of latency — 128 samples
       * at 2x — which would delay the entire mix. Neither price buys anything
       * here, since the aliasing oversampling exists to prevent is only generated
       * on material this stage is already distorting.
       */
      const shaper = ctx.createWaveShaper();
      shaper.curve = tanhCurve(quality > 0.5 ? 2048 : 512, 1.9, CEILING);
      shaper.oversample = 'none';
      this.clipper = shaper;
      head.connect(shaper);
      head = shaper;
    } catch {
      this.clipper = null;
    }
    head.connect(this.out);
    this.out.connect(destination);

    for (const name of BUS_NAMES) {
      this.buses.set(name, new Bus(name, ctx, this.masterIn, SPECS[name]));
    }

    this.reverb = new ReverbUnit(ctx, this.masterIn);
    this.reverbInput = this.reverb.input;

    this.ringGain = ctx.createGain();
    this.ringGain.gain.value = 0;
    this.ringGain.connect(this.masterVol);
  }

  bus(name: BusName): Bus {
    const b = this.buses.get(name);
    // The map is populated for every member of BUS_NAMES in the constructor.
    return b ?? (this.buses.get('world') as Bus);
  }

  busInput(name: BusName): AudioNode {
    return this.bus(name).input;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.masterVol.gain.value = this.masterVolume * (1 - 0.35 * this.ring);
  }

  get master(): number {
    return this.masterVolume;
  }

  setBusVolume(name: BusName, v: number): void {
    this.bus(name).setVolume(v);
  }

  busVolume(name: BusName): number {
    return this.bus(name).busVolume;
  }

  duck(amount: number, duration: number): void {
    const now = this.ctx.currentTime;
    const a = Math.max(0, Math.min(1, amount));
    for (const b of this.buses.values()) b.duck(a, Math.max(0.1, duration), now);
  }

  setZone(zone: ZoneName, ir: Clip | null, seconds: number): void {
    this.reverb.setZone(zone, ir, seconds, this.ctx.currentTime);
  }

  primeZone(zone: ZoneName, ir: Clip | null): void {
    this.reverb.prime(zone, ir);
  }

  get zone(): ZoneName | null {
    return this.reverb.zone;
  }

  /**
   * Starts the ringing state. `amount` is how badly: 1 is a grenade at your
   * feet. Everything ducks, the top end goes, and a tone appears that recovers
   * over several seconds.
   */
  startRing(amount: number, tinnitus: Clip | null): void {
    const a = Math.max(0, Math.min(1, amount));
    if (a <= this.ringTarget * 0.9 && this.ring > 0.05) return;
    this.ringTarget = Math.max(this.ringTarget, a);
    this.ring = Math.max(this.ring, a);
    const now = this.ctx.currentTime;
    try {
      this.muffle.frequency.cancelScheduledValues(now);
      this.muffle.frequency.setTargetAtTime(muffleHz(this.ring), now, 0.02);
      this.muffleTilt.gain.cancelScheduledValues(now);
      this.muffleTilt.gain.setTargetAtTime(-22 * this.ring, now, 0.02);
    } catch {
      /* ignore */
    }
    const buffer = tinnitus?.toBuffer(this.ctx) ?? null;
    if (buffer && !this.ringSource) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(this.ringGain);
        src.start();
        this.ringSource = src;
      } catch {
        this.ringSource = null;
      }
    }
    try {
      this.ringGain.gain.cancelScheduledValues(now);
      this.ringGain.gain.setTargetAtTime(0.5 * this.ring, now, 0.03);
    } catch {
      /* ignore */
    }
  }

  /** Recovers hearing. Called every frame. Allocation-free. */
  updateRing(dt: number): void {
    if (this.ring <= 0.0005) {
      if (this.ring !== 0) {
        this.ring = 0;
        this.ringTarget = 0;
        this.setMasterVolume(this.masterVolume);
      }
      return;
    }
    // About six seconds from full deafness back to normal.
    this.ring = Math.max(0, this.ring - dt / 6);
    this.ringTarget = this.ring;
    const now = this.ctx.currentTime;
    try {
      this.muffle.frequency.setTargetAtTime(muffleHz(this.ring), now, 0.25);
      this.muffleTilt.gain.setTargetAtTime(-22 * this.ring, now, 0.25);
      this.ringGain.gain.setTargetAtTime(0.5 * this.ring * this.ring, now, 0.3);
      this.masterVol.gain.setTargetAtTime(
        this.masterVolume * (1 - 0.35 * this.ring),
        now,
        0.2,
      );
    } catch {
      /* ignore */
    }
  }

  get ringAmount(): number {
    return this.ring;
  }

  /** Gain reduction the master limiter is applying, in dB. */
  get limiting(): number {
    return this.limiter ? this.limiter.reduction : 0;
  }

  /** The node a capture rig or an analyser should tap. */
  get output(): GainNode {
    return this.out;
  }

  dispose(): void {
    try {
      this.ringSource?.stop();
      this.ringSource?.disconnect();
    } catch {
      /* ignore */
    }
    this.ringSource = null;
    for (const b of this.buses.values()) b.dispose();
    this.buses.clear();
    this.reverb.dispose();
    try {
      this.masterIn.disconnect();
      this.muffle.disconnect();
      this.muffleTilt.disconnect();
      this.masterVol.disconnect();
      this.limiter?.disconnect();
      this.clipper?.disconnect();
      this.ringGain.disconnect();
      this.out.disconnect();
    } catch {
      /* ignore */
    }
  }
}

function muffleHz(ring: number): number {
  // 20 kHz open, 700 Hz at full ring, geometric in between.
  return 20000 * Math.pow(700 / 20000, Math.max(0, Math.min(1, ring)));
}
