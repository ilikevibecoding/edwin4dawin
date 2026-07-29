/**
 * The mixer graph.
 *
 *   voice ──> tone ──> air ──> gain ──┬──> panner ──┐
 *                                     │             ├──> bus gain ──┐
 *                                     └─────────────┘               │
 *                                     │                             │
 *                                     └──> send ──> reverbIn ────────┼──> convolver A/B
 *                                                                    │        │
 *   buses: sfx / weapons / ambience / music ─────────────────────────┴────────┤
 *                                                                             v
 *                                              music ──> musicDuck ──> worldSum
 *                                                                             │
 *                                            worldSum ──> deafenLp ──> deafenGain
 *                                                                             │
 *              ui ──> uiDuck ────────────────>├──> limiter ──> ceiling ──> master ──> out
 *                                                                             │
 *                            tinnitus / direct ───────────────────────────────┘
 *
 * Three decisions worth calling out:
 *
 *  - Everything meets at a `DynamicsCompressorNode` acting as a limiter, then a
 *    `WaveShaperNode` acting as a hard ceiling, before the master gain. A dozen
 *    simultaneous explosions in a small map is normal, and without a limiter
 *    that is not "loud", it is digital clipping. The compressor has no
 *    lookahead so it cannot catch the first cycle of a blast on its own; the
 *    ceiling is what guarantees the bus never passes full scale.
 *  - The `ui` bus joins after the deafen chain and is ducked far less, so the
 *    interface stays legible through a flashbang. A player who cannot hear their
 *    own hitmarkers has lost information, not gained atmosphere.
 *  - The music bus passes through its own duck gain, driven as a sidechain from
 *    weapon activity, so the score never fights a gunfight it cannot win.
 */
import { clamp, saturate } from '../core/MathUtils';
import { generateImpulseResponse, sanitizeRendered, type SpaceId } from './synth';
import type { BusId } from './sounds';

const BUS_IDS: readonly BusId[] = ['sfx', 'weapons', 'ui', 'music', 'ambience'];

/** Default trim per bus, before any user volume is applied. */
const BUS_TRIM: Record<BusId, number> = {
  sfx: 1.0,
  weapons: 1.0,
  ui: 0.85,
  music: 0.7,
  ambience: 0.8,
};

export interface DeafenState {
  amount: number;
  startedAt: number;
  endsAt: number;
}

export class MixerGraph {
  readonly context: BaseAudioContext;
  private readonly buses = new Map<BusId, GainNode>();
  private readonly busVolume = new Map<BusId, number>();

  readonly reverbIn: GainNode;
  private readonly reverbA: ConvolverNode;
  private readonly reverbB: ConvolverNode;
  private readonly reverbGainA: GainNode;
  private readonly reverbGainB: GainNode;
  private readonly reverbOut: GainNode;
  private reverbUsingA = true;
  private currentSpace: SpaceId | null = null;
  private readonly irCache = new Map<SpaceId, AudioBuffer>();

  private readonly worldSum: GainNode;
  private readonly deafenLp: BiquadFilterNode;
  private readonly deafenGain: GainNode;
  private readonly uiDuck: GainNode;
  private readonly musicDuck: GainNode;
  readonly direct: GainNode;
  private readonly preMaster: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly ceiling: WaveShaperNode;
  private readonly master: GainNode;
  private readonly weaponsTap: AnalyserNode;
  private readonly masterTap: AnalyserNode;
  private readonly weaponsSamples: Float32Array<ArrayBuffer>;
  private readonly masterSamples: Float32Array<ArrayBuffer>;

  private masterVolume = 1;
  private deafen: DeafenState = { amount: 0, startedAt: 0, endsAt: 0 };
  private musicDuckTarget = 1;
  private musicDuckValue = 1;

  constructor(context: BaseAudioContext, destination?: AudioNode) {
    this.context = context;
    const out = destination ?? context.destination;

    this.master = context.createGain();
    this.master.gain.value = 1;
    this.master.connect(out);

    // Safety clipper. `DynamicsCompressorNode` has no lookahead, so a 3 ms
    // attack cannot catch the first cycle of an explosion and the bus overshoots
    // full scale even while the compressor is working — measured at 1.042 on a
    // heavy scene before this existed. The curve is exactly linear up to 0.75
    // and bends to a 0.972 asymptote above it, so it does nothing at all to
    // normal material and cannot pass a sample that would clip.
    this.ceiling = context.createWaveShaper();
    this.ceiling.curve = softCeilingCurve(0.75, 0.4, 2048);
    this.ceiling.oversample = '2x';
    this.ceiling.connect(this.master);

    // Limiter. A high ratio with a soft knee and a fast attack: transparent on
    // a single gunshot, decisive when six explosions land together.
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -7;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 14;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;
    this.limiter.connect(this.ceiling);

    this.preMaster = context.createGain();
    this.preMaster.gain.value = 1;
    this.preMaster.connect(this.limiter);

    this.deafenGain = context.createGain();
    this.deafenGain.gain.value = 1;
    this.deafenGain.connect(this.preMaster);

    this.deafenLp = context.createBiquadFilter();
    this.deafenLp.type = 'lowpass';
    this.deafenLp.frequency.value = 20000;
    this.deafenLp.Q.value = 0.4;
    this.deafenLp.connect(this.deafenGain);

    this.worldSum = context.createGain();
    this.worldSum.gain.value = 1;
    this.worldSum.connect(this.deafenLp);

    this.uiDuck = context.createGain();
    this.uiDuck.gain.value = 1;
    this.uiDuck.connect(this.preMaster);

    this.musicDuck = context.createGain();
    this.musicDuck.gain.value = 1;
    this.musicDuck.connect(this.worldSum);

    // Bypasses the deafen filter entirely: the tinnitus tone is the one thing
    // that must get *louder* when everything else is muffled.
    this.direct = context.createGain();
    this.direct.gain.value = 1;
    this.direct.connect(this.preMaster);

    for (const id of BUS_IDS) {
      const gain = context.createGain();
      gain.gain.value = BUS_TRIM[id];
      this.busVolume.set(id, 1);
      if (id === 'ui') gain.connect(this.uiDuck);
      else if (id === 'music') gain.connect(this.musicDuck);
      else gain.connect(this.worldSum);
      this.buses.set(id, gain);
    }

    // Reverb: two convolvers so an ambience change crossfades instead of
    // dropping a tail on the floor.
    this.reverbOut = context.createGain();
    this.reverbOut.gain.value = 1;
    this.reverbOut.connect(this.worldSum);

    this.reverbGainA = context.createGain();
    this.reverbGainA.gain.value = 0;
    this.reverbGainA.connect(this.reverbOut);
    this.reverbGainB = context.createGain();
    this.reverbGainB.gain.value = 0;
    this.reverbGainB.connect(this.reverbOut);

    this.reverbA = context.createConvolver();
    this.reverbA.normalize = false;
    this.reverbA.connect(this.reverbGainA);
    this.reverbB = context.createConvolver();
    this.reverbB.normalize = false;
    this.reverbB.connect(this.reverbGainB);

    this.reverbIn = context.createGain();
    this.reverbIn.gain.value = 1;
    this.reverbIn.connect(this.reverbA);
    this.reverbIn.connect(this.reverbB);

    this.weaponsTap = context.createAnalyser();
    this.weaponsTap.fftSize = 256;
    this.weaponsTap.smoothingTimeConstant = 0.2;
    this.buses.get('weapons')?.connect(this.weaponsTap);

    this.masterTap = context.createAnalyser();
    this.masterTap.fftSize = 512;
    this.master.connect(this.masterTap);

    this.weaponsSamples = new Float32Array(this.weaponsTap.fftSize);
    this.masterSamples = new Float32Array(this.masterTap.fftSize);
  }

  bus(id: BusId): GainNode {
    return this.buses.get(id) ?? this.buses.get('sfx')!;
  }

  get now(): number {
    return this.context.currentTime;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = saturate(v);
    this.master.gain.setTargetAtTime(this.masterVolume, this.now, 0.02);
  }

  get volume(): number {
    return this.masterVolume;
  }

  setBusVolume(id: BusId, v: number): void {
    const gain = this.buses.get(id);
    if (!gain) return;
    const level = saturate(v);
    this.busVolume.set(id, level);
    const target = BUS_TRIM[id] * level;
    // A suspended context never advances currentTime, so setTargetAtTime would
    // never converge and a volume set from the menu before first unlock would be
    // silently dropped. Write it outright until the clock is actually running.
    if ((this.context as AudioContext).state === 'running') {
      gain.gain.setTargetAtTime(target, this.now, 0.03);
    } else {
      gain.gain.cancelScheduledValues(this.now);
      gain.gain.value = target;
    }
  }

  busVolumeOf(id: BusId): number {
    return this.busVolume.get(id) ?? 1;
  }

  // -------------------------------------------------------------------------
  // Reverb
  // -------------------------------------------------------------------------

  /**
   * Swap the convolution space. The IR is generated on first use and cached;
   * generating one is a few million multiply-accumulates, which is fine once but
   * not something to do on every doorway.
   */
  setSpace(space: SpaceId, wetness: number, crossfade = 1.2): void {
    const now = this.now;
    const target = clamp(wetness, 0, 1.5);
    if (space === this.currentSpace) {
      const active = this.reverbUsingA ? this.reverbGainA : this.reverbGainB;
      active.gain.cancelScheduledValues(now);
      active.gain.setTargetAtTime(target, now, crossfade * 0.3);
      return;
    }

    let ir = this.irCache.get(space);
    if (!ir) {
      const rendered = generateImpulseResponse(space, this.context.sampleRate);
      // A non-finite tap in an IR makes the convolver emit NaN for the rest of
      // the context's life, which then poisons the master bus and every meter.
      const repaired = sanitizeRendered(rendered);
      if (repaired > 0) {
        console.warn(`[audio] IR "${space}" had ${repaired} non-finite taps; silenced`);
      }
      ir = this.context.createBuffer(
        rendered.channels.length,
        rendered.channels[0].length,
        rendered.sampleRate,
      );
      for (let c = 0; c < rendered.channels.length; c++) {
        ir.copyToChannel(rendered.channels[c], c);
      }
      this.irCache.set(space, ir);
    }

    const incoming = this.reverbUsingA ? this.reverbB : this.reverbA;
    const incomingGain = this.reverbUsingA ? this.reverbGainB : this.reverbGainA;
    const outgoingGain = this.reverbUsingA ? this.reverbGainA : this.reverbGainB;

    incoming.buffer = ir;
    incomingGain.gain.cancelScheduledValues(now);
    incomingGain.gain.setValueAtTime(incomingGain.gain.value, now);
    incomingGain.gain.linearRampToValueAtTime(target, now + crossfade);
    outgoingGain.gain.cancelScheduledValues(now);
    outgoingGain.gain.setValueAtTime(outgoingGain.gain.value, now);
    outgoingGain.gain.linearRampToValueAtTime(0, now + crossfade);

    this.reverbUsingA = !this.reverbUsingA;
    this.currentSpace = space;
  }

  get space(): SpaceId | null {
    return this.currentSpace;
  }

  // -------------------------------------------------------------------------
  // Deafen
  // -------------------------------------------------------------------------

  /**
   * Flashbang / concussion treatment. Everything in the world chain drops in
   * level and loses its top end immediately, then recovers along a curve —
   * recovery from acoustic trauma is not linear, it crawls at first and then
   * comes back in a rush near the end.
   */
  setDeafen(amount: number, duration: number): void {
    const a = saturate(amount);
    const now = this.now;
    const dur = Math.max(0.15, duration);
    // A new, weaker blast must not shorten the recovery from a stronger one.
    if (a <= this.deafen.amount * 0.6 && now < this.deafen.endsAt) return;
    this.deafen = { amount: a, startedAt: now, endsAt: now + dur };

    const steps = 48;
    const gainCurve = new Float32Array(steps);
    const freqCurve = new Float32Array(steps);
    const uiCurve = new Float32Array(steps);
    // Floor level and cutoff at full deafen.
    const minGain = 1 - 0.88 * a;
    const minFreq = 20000 * Math.pow(0.02, a);
    const minUi = 1 - 0.45 * a;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      // Slow at first, then accelerating: 1 - (1-t)^0.4 hangs near zero.
      const recovery = Math.pow(t, 2.6);
      gainCurve[i] = minGain + (1 - minGain) * recovery;
      freqCurve[i] = minFreq * Math.pow(20000 / minFreq, recovery);
      uiCurve[i] = minUi + (1 - minUi) * Math.pow(t, 1.6);
    }

    this.deafenGain.gain.cancelScheduledValues(now);
    this.deafenGain.gain.setValueCurveAtTime(gainCurve, now, dur);
    this.deafenLp.frequency.cancelScheduledValues(now);
    this.deafenLp.frequency.setValueCurveAtTime(freqCurve, now, dur);
    this.uiDuck.gain.cancelScheduledValues(now);
    this.uiDuck.gain.setValueCurveAtTime(uiCurve, now, dur);
  }

  /**
   * How much deafen is still in effect, 0..1, following the same recovery curve
   * as the filter. Used to keep the tinnitus voice in step with the muffling.
   */
  deafenAmount(): number {
    const { amount, startedAt, endsAt } = this.deafen;
    const now = this.now;
    if (amount <= 0 || now >= endsAt) return 0;
    const t = saturate((now - startedAt) / Math.max(1e-3, endsAt - startedAt));
    return amount * (1 - Math.pow(t, 2.6));
  }

  get deafenEndsAt(): number {
    return this.deafen.endsAt;
  }

  get deafenPeak(): number {
    return this.now < this.deafen.endsAt ? this.deafen.amount : 0;
  }

  clearDeafen(): void {
    const now = this.now;
    this.deafen = { amount: 0, startedAt: 0, endsAt: 0 };
    for (const param of [this.deafenGain.gain, this.uiDuck.gain]) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(1, now);
    }
    this.deafenLp.frequency.cancelScheduledValues(now);
    this.deafenLp.frequency.setValueAtTime(20000, now);
  }

  // -------------------------------------------------------------------------
  // Music sidechain
  // -------------------------------------------------------------------------

  /** Duck the music bus to `target` (0..1). Fast down, slow back up. */
  duckMusic(target: number, dt: number): void {
    // An AudioParam rejects a non-finite value by throwing, and this is an
    // accumulator, so one bad frame would otherwise throw on every frame after
    // it. Recover to unity rather than propagating.
    if (!Number.isFinite(target) || !Number.isFinite(dt)) {
      this.musicDuckTarget = 1;
      this.musicDuckValue = 1;
      this.musicDuck.gain.setTargetAtTime(1, this.now, 0.05);
      return;
    }
    this.musicDuckTarget = saturate(target);
    // Asymmetric: a compressor's attack and release, done on the control side.
    const rate = this.musicDuckTarget < this.musicDuckValue ? 26 : 1.6;
    this.musicDuckValue += (this.musicDuckTarget - this.musicDuckValue) * Math.min(1, rate * dt);
    this.musicDuck.gain.setTargetAtTime(this.musicDuckValue, this.now, 0.02);
  }

  get musicDuckLevel(): number {
    return this.musicDuckValue;
  }

  // -------------------------------------------------------------------------
  // Metering
  // -------------------------------------------------------------------------

  /** RMS of the weapons bus, 0..1. Drives the music sidechain and the stats. */
  weaponsLevel(): number {
    return analyserRms(this.weaponsTap, this.weaponsSamples);
  }

  masterLevel(): number {
    return analyserRms(this.masterTap, this.masterSamples);
  }

  /** Gain reduction the limiter is currently applying, in dB (negative). */
  limiterReduction(): number {
    return this.limiter.reduction;
  }

  dispose(): void {
    try {
      this.reverbIn.disconnect();
      this.reverbA.disconnect();
      this.reverbB.disconnect();
      this.reverbGainA.disconnect();
      this.reverbGainB.disconnect();
      this.reverbOut.disconnect();
      for (const bus of this.buses.values()) bus.disconnect();
      this.worldSum.disconnect();
      this.deafenLp.disconnect();
      this.deafenGain.disconnect();
      this.uiDuck.disconnect();
      this.musicDuck.disconnect();
      this.direct.disconnect();
      this.preMaster.disconnect();
      this.limiter.disconnect();
      this.ceiling.disconnect();
      this.master.disconnect();
      this.weaponsTap.disconnect();
      this.masterTap.disconnect();
    } catch {
      /* a context being torn down can refuse disconnects; nothing to do */
    }
    this.irCache.clear();
    this.buses.clear();
  }
}

/**
 * Transfer curve for the master ceiling: unity below `knee`, then a tanh bend
 * towards `knee + span`. A `WaveShaperNode` clamps its input to -1..1 before
 * reading the curve, so the last entry is a hard ceiling no signal can pass.
 */
function softCeilingCurve(knee: number, span: number, points: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + span * Math.tanh((a - knee) / span);
    curve[i] = x < 0 ? -y : y;
  }
  return curve;
}

/**
 * A meter must never hand a non-finite value to control logic. If anything
 * upstream has gone unstable the analyser will read NaN, and a level that feeds
 * an accumulator would latch it there forever — the music duck did exactly
 * that, throwing on every subsequent frame. Reading 0 degrades to "no signal",
 * which is both recoverable and the safe interpretation.
 */
function analyserRms(analyser: AnalyserNode, scratch: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(scratch);
  const n = scratch.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = scratch[i];
    if (Number.isFinite(s)) sum += s * s;
  }
  const rms = Math.sqrt(sum / n);
  return Number.isFinite(rms) ? rms : 0;
}
