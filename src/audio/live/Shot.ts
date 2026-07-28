/**
 * The live gunshot.
 *
 * Everything else in the engine can be baked, because everything else is heard
 * a handful of times. A gunshot is heard thousands of times, often fifteen times
 * a second, and the single thing that separates a weapon from a looping sample
 * is that no two rounds are identical. So the layers are assembled at the moment
 * the trigger breaks, out of a reusable filter graph, with the transient, the
 * resonance and the tail rolled fresh each time.
 *
 * Per shot the following change: which of eight shock fronts fires and at what
 * corner frequency; where the body's noise is read from and how fast; the detune
 * of the two loudest chamber modes; the level and rate of the sub; which
 * mechanical variant cycles and when; and which tail variant answers and how
 * loud. Sixty milliseconds of a burst are never the same twice.
 *
 * Distance is not a volume control. As a shot moves away the shock front loses
 * its top to air absorption and then disappears entirely, the body collapses
 * into a band a couple of hundred hertz wide, the sub survives almost intact,
 * and the tail takes over and dominates. At a hundred metres what is left is a
 * thump followed by a roll, which is what a rifle a hundred metres away actually
 * sounds like.
 */

import type { AudioCore } from '../Core';
import { DISTANCE } from '../graph/Voices';
import type { Voice } from '../graph/Voices';
import { tanhCurve } from '../dsp/Kernel';
import type { GunVoice } from '../bake/Weapons';
import type { ZoneProfile } from '../dsp/Zones';

/**
 * The reusable layer graph. One of these is held per concurrent shot; the only
 * things created per round are the buffer sources feeding it.
 */
/**
 * Per-gun transient drive curves, built once and shared.
 *
 * The crack bank is generic — eight impulses voice every weapon in the game —
 * so what distinguishes a carbine's shock front from a shotgun's is the corner
 * it is highpassed at and how hard it is folded. Folding is what makes a short
 * transient read as loud: it fills the gaps between the peaks so the ear hears
 * density rather than a click. There are only a handful of distinct drives, so
 * one curve each is enough and no shot allocates one.
 */
const driveCurves = new Map<number, Float32Array<ArrayBuffer>>();

function driveCurve(drive: number): Float32Array<ArrayBuffer> {
  const key = Math.round(drive * 10) / 10;
  let c = driveCurves.get(key);
  if (!c) {
    c = tanhCurve(1024, key);
    driveCurves.set(key, c);
  }
  return c;
}

class ShotVoice {
  readonly crackHp: BiquadFilterNode;
  readonly crackDrive: WaveShaperNode | null;
  readonly crackGain: GainNode;
  readonly bodyBp: BiquadFilterNode;
  readonly bodyLp: BiquadFilterNode;
  readonly bodyGain: GainNode;
  readonly res1: BiquadFilterNode;
  readonly res2: BiquadFilterNode;
  readonly resGain: GainNode;
  readonly subGain: GainNode;
  readonly mechGain: GainNode;
  readonly farGain: GainNode;
  readonly sum: GainNode;
  private drive: WaveShaperNode | null = null;
  /** Context time this graph is free again. */
  free = 0;
  private connectedTo: AudioNode | null = null;

  constructor(ctx: BaseAudioContext, curveSize: number) {
    this.crackHp = ctx.createBiquadFilter();
    this.crackHp.type = 'highpass';
    this.crackHp.Q.value = 0.55;
    this.crackGain = ctx.createGain();
    this.crackGain.gain.value = 0;
    let crackDrive: WaveShaperNode | null = null;
    try {
      crackDrive = ctx.createWaveShaper();
      crackDrive.curve = driveCurve(3);
      /*
       * Never oversampled, whatever the quality setting says.
       *
       * An oversampled `WaveShaperNode` resamples in and out around the curve,
       * and in Chrome that costs a full render quantum of latency — 128 samples,
       * 2.7 ms at 48 kHz. This shaper is upstream of `crackGain`, whose envelope
       * falls from its peak to silence in three milliseconds, so the delay
       * hands the shock front to an envelope that has already decayed twenty-six
       * decibels: the transient measures thirty times too quiet and the gun
       * sounds like a cap firing into a pillow. There is nothing for
       * oversampling to protect here in any case — the input is a two-sample
       * impulse whose spectrum already reaches Nyquist, so the folding cannot
       * generate a harmonic that was not there to begin with.
       */
      crackDrive.oversample = 'none';
    } catch {
      crackDrive = null;
    }
    this.crackDrive = crackDrive;

    this.bodyBp = ctx.createBiquadFilter();
    this.bodyBp.type = 'bandpass';
    this.bodyLp = ctx.createBiquadFilter();
    this.bodyLp.type = 'lowpass';
    this.bodyLp.Q.value = 0.9;
    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = 0;

    this.res1 = ctx.createBiquadFilter();
    this.res1.type = 'bandpass';
    this.res2 = ctx.createBiquadFilter();
    this.res2.type = 'bandpass';
    this.resGain = ctx.createGain();
    this.resGain.gain.value = 0;

    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.mechGain = ctx.createGain();
    this.mechGain.gain.value = 0;
    this.farGain = ctx.createGain();
    this.farGain.gain.value = 0;

    // Doubles as the headroom trim into the saturator; see `stackPeak`.
    this.sum = ctx.createGain();
    this.sum.gain.value = 1;

    if (this.crackDrive) {
      this.crackHp.connect(this.crackDrive);
      this.crackDrive.connect(this.crackGain);
    } else {
      this.crackHp.connect(this.crackGain);
    }
    this.crackGain.connect(this.sum);
    this.bodyBp.connect(this.bodyLp);
    this.bodyLp.connect(this.bodyGain);
    this.bodyGain.connect(this.sum);
    this.res1.connect(this.resGain);
    this.res2.connect(this.resGain);
    this.resGain.connect(this.sum);
    this.subGain.connect(this.sum);
    this.mechGain.connect(this.sum);
    this.farGain.connect(this.sum);

    try {
      // Saturation is what makes a loud layer read as loud rather than merely
      // measure as loud; a muzzle blast pins any microphone that records it.
      const shaper = ctx.createWaveShaper();
      shaper.curve = tanhCurve(curveSize, 1.35);
      /*
       * Not oversampled, for the reason above and one more. Every layer passes
       * through here, so the render quantum it would cost delays the whole
       * direct path by 2.7 ms — while the separately voiced tail and distant
       * report, which are scheduled by explicit delays, are not delayed with it.
       * The distant report's 4 ms head start over the muzzle would come back as
       * 1.3 ms, quietly undoing the timing that makes the two read as separate
       * arrivals.
       */
      shaper.oversample = 'none';
      this.drive = shaper;
    } catch {
      this.drive = null;
    }
  }

  /** The node the whole stack leaves through. */
  get output(): AudioNode {
    return this.drive ?? this.sum;
  }

  attach(dest: AudioNode): void {
    if (this.connectedTo === dest) return;
    this.detach();
    if (this.drive) {
      this.sum.connect(this.drive);
      this.drive.connect(dest);
    } else {
      this.sum.connect(dest);
    }
    this.connectedTo = dest;
  }

  detach(): void {
    if (!this.connectedTo) return;
    try {
      this.sum.disconnect();
      this.drive?.disconnect();
    } catch {
      /* ignore */
    }
    this.connectedTo = null;
  }

  dispose(): void {
    this.detach();
    for (const n of [
      this.crackHp,
      ...(this.crackDrive ? [this.crackDrive] : []),
      this.crackGain,
      this.bodyBp,
      this.bodyLp,
      this.bodyGain,
      this.res1,
      this.res2,
      this.resGain,
      this.subGain,
      this.mechGain,
      this.farGain,
      this.sum,
    ]) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}

/** The layers a shot is built from, in the order they reach the ear. */
export type ShotLayer = 'crack' | 'body' | 'res' | 'sub' | 'mech' | 'ring' | 'far' | 'tail';

export interface ShotRequest {
  gun: GunVoice;
  /** Metres from the listener. Zero for the player's own weapon. */
  distance: number;
  suppressed: boolean;
  /** True when this is the weapon in the player's hands. */
  firstPerson: boolean;
  zone: ZoneProfile;
  x: number;
  y: number;
  z: number;
  volume: number;
  /** -1..1 stereo placement for a first-person shot. */
  pan: number;
  /**
   * Renders one layer alone. The gain staging is calibrated against what each
   * layer actually contributes rather than what its envelope target implies —
   * a bandpassed noise burst reaches a fraction of its target and a low tone
   * reaches all of it — so those figures have to be measurable.
   */
  only?: ShotLayer;
}

/**
 * Gain applied to each layer's level to reach its envelope target.
 *
 * These are the design knobs, and between them and the per-weapon levels in the
 * `GunVoice` table they set how a shot is put together. Multiplied through by
 * `UNIT` below they give the peak budget a first-person carbine is built from:
 * the shock front owns about forty per cent of it, the sub punch twenty, the
 * body seventeen, and the resonance, action and upper ring share what is left.
 * The crack has to be the largest single contributor — that is what a gunshot
 * is — but it cannot be the only one, or the weapon loses its calibre and every
 * gun in the game reduces to the same bright click.
 */
export const GAIN = {
  crack: 1.3,
  body: 3.1,
  res: 3.3,
  sub: 1.06,
  mech: 1.06,
  ring: 0.5,
  /** The suppressed body, which replaces the crack entirely. */
  gas: 1.15,
} as const;

/**
 * Peak each layer actually contributes to the summed stack, per unit of its
 * envelope target.
 *
 * Measurements, not estimates: `tools/audio-layers.mjs` renders each layer alone
 * and reads the peak off the stack's own summing node. They span five to one,
 * which is the point — a normalised clip driven into a plain gain arrives at its
 * target almost exactly, whereas a bandpassed noise burst leaves five sixths of
 * itself in the filter and two detuned resonators only partly correlate. Guess
 * these and the pistol comes out a quarter of the carbine's loudness.
 */
const UNIT = {
  crack: 0.974,
  body: 0.166,
  res: 0.180,
  sub: 0.835,
  mech: 0.352,
  ring: 0.836,
  gas: 0.85,
} as const;

/**
 * How much of the layer peaks' arithmetic total survives into the peak of their
 * sum.
 *
 * Not much, and that is the nature of the thing: the shock front is at sample
 * zero, the body peaks a millisecond behind it, the resonators later still and
 * the action ten milliseconds after that, so six layers that add to two and a
 * half never present more than half of it at any one instant. Measured at 0.47
 * and stable to within a few per cent across all five weapons, which is what
 * makes it worth carrying as a constant rather than a fudge inside
 * `SHOT_HEADROOM` — with it in place that figure means what it says.
 */
const COHERENCE = 0.47;

/**
 * Peak the layer stack is aimed at, into the saturator.
 *
 * Slightly above full scale on purpose: the very tip of a shock front should
 * saturate, because that is what a muzzle blast does to any microphone that
 * records it. Much above this and the whole shot flat-tops instead, which
 * destroys the crest factor that makes a gunshot read as a crack.
 */
const SHOT_HEADROOM = 1.12;

/**
 * The same aim for a suppressed round, and deliberately far lower.
 *
 * A can holds the muzzle blast, so there is no shock front left and nothing
 * that should be saturating: aiming the suppressed stack well down the transfer
 * curve keeps it linear. Normalising it to the same headroom as an open shot
 * would hand the saturator the same peak and undo most of `supGain` — which is
 * exactly how a suppressed 9 mm ends up measuring a decibel off an open one.
 */
const SUP_HEADROOM = 0.5;

/**
 * Level a full-power first-person shot leaves the layer graph at.
 *
 * It is the loudest recurring sound in the game, so it sets the reference the
 * rest of the mix is built against, and it is set against the master chain's
 * measured transfer curve rather than an arithmetic model of a saturator, two
 * compressors and a soft-clipper in series — `tools/audio-gain.mjs` renders the
 * sweep.
 *
 * This puts a first-person carbine 2.5 dB under `NOMINAL` at the weapons bus and
 * about -2.9 dBFS at the output. Sitting just below the bus threshold rather
 * than on it is deliberate: one shot is then entirely linear and keeps its full
 * crest factor, which is the thing that makes it read as a crack — pushed up to
 * where the chain starts working, the carbine's crest falls from 11.3 to 10.1
 * and the pistol's from 16.3 to 14.4. Two or three rounds overlapping do cross
 * the threshold and glue, which is what the bus is for, and an explosion still
 * has 2.5 dB of room above a gunshot to be louder than one.
 */
const SHOT_TRIM = 0.39;

/**
 * The tail's share of the shot's trim.
 *
 * Under the direct path's, because the tail is a long sound and the direct path
 * a brief one: matched by peak they would not be matched by loudness, and the
 * roll would swamp the crack it is supposed to follow. This puts the room's peak
 * about 10 dB beneath the muzzle's while leaving it more energy than the shock
 * front over the whole event, which is the balance a rifle fired in a street
 * actually has — and it still arrives afterwards, which is what makes it read as
 * a separate thing rather than as part of the bang.
 */
const TAIL_TRIM = 0.66;

/** How the layers were mixed for the last shot, for the debug bridge. */
export interface ShotBreakdown {
  distance: number;
  crack: number;
  body: number;
  res: number;
  sub: number;
  mech: number;
  ring: number;
  far: number;
  tail: number;
  tailDelay: number;
  airHz: number;
  bodyHz: number;
  /** Estimated peak of the layer sum, and the trim derived from it. */
  stack: number;
  sumGain: number;
  suppressed: boolean;
}

export class ShotEngine {
  private voices: ShotVoice[] = [];
  private cursor = 0;
  /**
   * Summing node of the graph the last round was built on, before the
   * saturator and before the voice.
   *
   * Only the measurement bridge reads it, and only so that the per-layer gain
   * staging can be calibrated against the peak a layer *actually* contributes
   * rather than against an inversion of every nonlinearity between here and the
   * destination. One field assignment per shot.
   */
  lastSum: GainNode | null = null;
  /** Output of the same graph, after the saturator. Same purpose. */
  lastOut: AudioNode | null = null;
  readonly last: ShotBreakdown = {
    distance: 0,
    crack: 0,
    body: 0,
    res: 0,
    sub: 0,
    mech: 0,
    ring: 0,
    far: 0,
    tail: 0,
    tailDelay: 0,
    airHz: 0,
    bodyHz: 0,
    stack: 0,
    sumGain: 0,
    suppressed: false,
  };

  constructor(
    private core: AudioCore,
    count: number,
    /** Resolution of the saturator's transfer curve; a quality setting. */
    curveSize = 1024,
  ) {
    for (let i = 0; i < count; i++) this.voices.push(new ShotVoice(core.ctx, curveSize));
  }

  get budget(): number {
    return this.voices.length;
  }

  private take(now: number): ShotVoice | null {
    // Round-robin, skipping graphs whose previous round is still ringing. The
    // layers are short, so at any plausible rate of fire one is always free.
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[(this.cursor + i) % this.voices.length];
      if (v.free <= now) {
        this.cursor = (this.cursor + i + 1) % this.voices.length;
        return v;
      }
    }
    return null;
  }

  /**
   * Fires one round. Returns false when the shot was culled, which happens
   * under heavy load and is not an error.
   */
  fire(req: ShotRequest): boolean {
    const core = this.core;
    const ctx = core.ctx;
    const rng = core.rng;
    const g = req.gun;
    const z = req.zone;
    const now = core.now;
    const d = Math.max(0, req.distance);

    /* ---- how distance redistributes the layers ---- */

    const airHz = core.airCorner(d);
    // The shock front is the first thing to go: it is all top end, and it is
    // also the most directional part of the report.
    const crackFade = 1 / (1 + Math.pow(d / 42, 1.75));
    const nearMix = 1 - smoothstep(30, 115, d);
    const farMix = smoothstep(26, 95, d);
    // Firing the weapon yourself, you are behind the muzzle: less shock front
    // reaches you and much more of the action does.
    const fp = req.firstPerson;

    /*
     * Point-blank level of each layer, and then the same levels with distance
     * applied. The reference set is what the stack is normalised against; see
     * the note on `stack` for why it has to be distance-independent.
     */
    const crackRef = g.crackGain * (fp ? 0.82 : 1);
    const bodyRef = g.bodyGain * (fp ? 1.12 : 1);
    const resRef = g.resGain * (fp ? 1.25 : 1);
    const subRef = g.subGain;
    const mechRef = g.mechGain * (fp ? 1.6 : 0.55);
    const ringRef = g.ringGain * (fp ? 1.2 : 0.9);

    const crackLevel = crackRef * crackFade * nearMix;
    const bodyLevel = bodyRef * (0.3 + 0.7 * nearMix);
    const resLevel = resRef * nearMix;
    const subLevel = subRef * (0.55 + 0.45 * nearMix);
    const mechLevel = mechRef * nearMix;
    const ringLevel = ringRef * nearMix;
    const farLevel = g.farGain * farMix;

    const suppressed = req.suppressed;
    const trim = g.trim * req.volume * (suppressed ? g.supGain : 1) * SHOT_TRIM;

    const duration = suppressed ? 0.2 : Math.max(0.26, g.bodyDecay * 4 + 0.12);

    const voice = core.open({
      bus: 'weapons',
      volume: trim,
      priority: fp ? 1 : 0.82,
      positional: !fp,
      x: req.x,
      y: req.y,
      z: req.z,
      pan: req.pan,
      model: DISTANCE.weapon,
      lowpass: fp ? 20000 : airHz,
      tilt: fp ? 0 : core.airTilt(d),
      wet: suppressed ? 0.5 : 1,
      duration,
      noOcclusion: fp,
    });
    if (!voice) return false;

    const sv = this.take(now);
    if (!sv) {
      voice.releaseNow();
      return false;
    }
    sv.attach(voice.input);
    sv.free = now + duration;
    this.lastSum = sv.sum;
    this.lastOut = sv.output;

    /*
     * Headroom into the saturator.
     *
     * Six layers land within a few milliseconds of one another, so their sum
     * runs to several times full scale. A `WaveShaperNode` hard-clamps its
     * input to its curve's domain, so handing it that sum would flat-top the
     * shock front and the body alike: the shot would measure loud and sound
     * like a square wave, and its apparent attack would land wherever the body
     * happened to be fattest rather than on the transient. Dividing by the
     * expected stack first keeps the saturator doing the job it is there for,
     * which is adding density to the tip of the crack.
     *
     * Normalised against what this weapon reaches at point-blank range, and
     * never against what its layers add up to at *this* distance. That
     * distinction is the entire distance model. Divide by the attenuated sum
     * and a shot a hundred metres away is handed the eight-fold boost needed to
     * drag its two surviving layers back up to full scale, which turns the
     * careful per-layer rolloff above into an elaborate no-op and leaves
     * exactly the "quiet version of the close crack" the brief rules out.
     * Against a per-weapon constant, the layers fall away as they should.
     */
    const stack = suppressed
      ? GAIN.gas * UNIT.gas + subRef * 0.5 * GAIN.sub * UNIT.sub
      : crackRef * GAIN.crack * UNIT.crack +
        bodyRef * GAIN.body * UNIT.body +
        resRef * GAIN.res * UNIT.res +
        subRef * GAIN.sub * UNIT.sub +
        mechRef * GAIN.mech * UNIT.mech +
        ringRef * GAIN.ring * UNIT.ring;
    sv.sum.gain.value =
      (suppressed ? SUP_HEADROOM : SHOT_HEADROOM) / Math.max(0.2, stack * COHERENCE);

    const only = req.only;

    /* ---- layer 1: the shock front ---- */

    if (suppressed) {
      // The can holds the blast. What is left is gas through baffles.
      const sup = core.buffer(`sup:${g.id}`) ?? core.buffer('sup:rifle');
      if (sup && (!only || only === 'crack')) {
        setEnv(sv.mechGain.gain, now, GAIN.gas, 0, 0.11, ctx);
        core.source(sup, sv.mechGain, now, rng.range(0.94, 1.07));
      }
    } else {
      const crack = core.buffer('crack');
      if (crack && crackLevel > 0.004 && (!only || only === 'crack')) {
        sv.crackHp.frequency.setValueAtTime(g.crackHz * rng.range(0.9, 1.12), now);
        if (sv.crackDrive) sv.crackDrive.curve = driveCurve(g.crackDrive);
        setEnv(
          sv.crackGain.gain,
          now,
          crackLevel * GAIN.crack,
          0,
          g.crackDecay * rng.range(0.85, 1.2),
          ctx,
        );
        core.source(crack, sv.crackHp, now, rng.range(0.92, 1.1));
      }
    }

    /* ---- layer 2: the body, plus its two live modes ---- */

    const noise = core.buffer('noise_white');
    const wantBody = !only || only === 'body';
    const wantRes = (!only || only === 'res') && resLevel > 0.004;
    if (noise && !suppressed && bodyLevel > 0.004 && (wantBody || wantRes)) {
      const bodyJitter = rng.range(0.93, 1.08);
      sv.bodyBp.frequency.setValueAtTime(g.bodyHz * bodyJitter, now);
      sv.bodyBp.Q.setValueAtTime(g.bodyQ * rng.range(0.85, 1.15), now);
      // The falling cutoff is the shape of the expanding gas cloud.
      const lp = sv.bodyLp.frequency;
      lp.cancelScheduledValues(now);
      lp.setValueAtTime(g.sweepFrom * rng.range(0.9, 1.1), now);
      lp.exponentialRampToValueAtTime(
        Math.max(60, g.sweepTo * rng.range(0.88, 1.14)),
        now + g.sweepTime,
      );
      if (wantBody) {
        setEnv(
          sv.bodyGain.gain,
          now,
          bodyLevel * GAIN.body,
          0.0007,
          g.bodyDecay * rng.range(0.88, 1.16),
          ctx,
        );
      }

      if (wantRes) {
        sv.res1.frequency.setValueAtTime(g.res1Hz * rng.range(0.94, 1.06), now);
        sv.res1.Q.setValueAtTime(g.resQ * rng.range(0.8, 1.25), now);
        sv.res2.frequency.setValueAtTime(g.res2Hz * rng.range(0.94, 1.06), now);
        sv.res2.Q.setValueAtTime(g.resQ * rng.range(0.75, 1.3), now);
        setEnv(sv.resGain.gain, now, resLevel * GAIN.res, 0.0009, g.bodyDecay * 1.5, ctx);
      }

      // One source drives the band and both resonators; the offset is what
      // makes the noise different every round.
      const off = rng.range(0, 1);
      const rate = rng.range(0.95, 1.06);
      if (wantBody) core.source(noise, sv.bodyBp, now, rate, off);
      if (wantRes) {
        core.source(noise, sv.res1, now, rate, off);
        core.source(noise, sv.res2, now, rate, rng.range(0, 1));
      }
    }

    /* ---- layer 3: the sub punch ---- */

    if (subLevel > 0.006 && (!only || only === 'sub')) {
      const sub = core.buffer(`sub:${g.id}`) ?? core.buffer('sub:rifle');
      if (sub) {
        setEnv(
          sv.subGain.gain,
          now,
          subLevel * GAIN.sub * (suppressed ? 0.5 : 1),
          0.001,
          g.subDecay * 1.4,
          ctx,
        );
        core.source(sub, sv.subGain, now, rng.range(0.93, 1.08));
      }
    }

    /* ---- layer 4: the mechanical, and the upper ring ---- */

    if (!suppressed && mechLevel > 0.006 && (!only || only === 'mech')) {
      const mech = core.buffer(`mech:${g.id}`) ?? core.buffer('mech:rifle');
      if (mech) {
        const at = now + g.mechDelay * rng.range(0.8, 1.25);
        setEnv(sv.mechGain.gain, at, mechLevel * GAIN.mech, 0, 0.05, ctx);
        core.source(mech, sv.mechGain, at, rng.range(0.92, 1.1));
      }
    }
    if (!suppressed && ringLevel > 0.01 && (!only || only === 'ring')) {
      const ring = core.buffer(`ring:${g.id}`) ?? core.buffer('ring:rifle');
      if (ring) {
        // Borrow the far input for the ring; the two never overlap in level.
        setEnv(sv.farGain.gain, now, ringLevel * GAIN.ring, 0, 0.035, ctx);
        core.source(ring, sv.farGain, now, rng.range(0.94, 1.08));
      }
    }

    /* ---- the distant report, on its own voice so it can be delayed ---- */

    if (farLevel > 0.01 && !fp && (!only || only === 'far')) {
      const far = core.buffer(`far:${g.id}`) ?? core.buffer('far:rifle');
      if (far) {
        core.emit(`far:${g.id}`, {
          bus: 'weapons',
          volume: farLevel * trim * 0.26,
          rate: rng.range(0.95, 1.06),
          priority: 0.6,
          x: req.x,
          y: req.y,
          z: req.z,
          // Not the weapon curve: this layer is all low frequency, and low
          // frequency carries. Sharing the crack's rolloff would delete the
          // one part of a distant shot that is actually still there.
          model: DISTANCE.report,
          lowpass: airHz * 1.4,
          wet: 0.8,
          delay: 0.004,
          // Turbulence along a long path smears the wavefront; the clip carries
          // most of that already, and this is the last of the shock front going.
          attack: 0.003,
        });
      }
    }

    /* ---- layer 5: the room's answer ---- */

    // The reflection has further to travel than the direct sound, and that
    // difference is what makes a shot in a street read as crack-then-roll
    // rather than one homogenous bang.
    const tailDelay = z.predelay + (z.nearWall * 2) / 343 + Math.min(0.09, d / 343) * 0.4;
    /*
     * The room's answer is not a point source, so it gets no panner and no
     * distance curve — and it should not get much of one, because the room
     * receives roughly the same acoustic energy wherever in it the shot was
     * fired. Holding the tail near-constant while the direct path falls as 1/r
     * is what produces the takeover the brief asks for: at a hundred metres the
     * crack is all but gone and this is most of what is left, without the tail
     * ever having to be made louder at range than it is close up.
     *
     * `reach` is the slow decline as the shot leaves the listener's own street
     * altogether.
     */
    const reach = 1 / (1 + d / 130);
    const tailLevel =
      g.tailGain * z.slap * (suppressed ? 0.42 : 1) * reach * (fp ? 0.62 : 0.8);
    if (tailLevel > 0.015 && (!only || only === 'tail')) {
      core.emit(`tail:${z.name}:${g.tailClass}`, {
        bus: 'weapons',
        volume: tailLevel * trim * TAIL_TRIM,
        rate: rng.range(0.96, 1.05),
        priority: 0.45,
        // The tail is the room, not the muzzle, so it is never a point source.
        positional: false,
        pan: rng.range(-0.25, 0.25),
        lowpass: Math.min(airHz * 1.6, 20000),
        delay: tailDelay,
        attack: 0.004,
      });
    }

    const L = this.last;
    L.distance = d;
    L.crack = crackLevel;
    L.body = bodyLevel;
    L.res = resLevel;
    L.sub = subLevel;
    L.mech = mechLevel;
    L.ring = ringLevel;
    L.far = farLevel;
    L.tail = tailLevel;
    L.tailDelay = tailDelay;
    L.airHz = airHz;
    L.bodyHz = g.bodyHz;
    L.stack = stack;
    L.sumGain = sv.sum.gain.value;
    L.suppressed = suppressed;
    return true;
  }

  dispose(): void {
    for (const v of this.voices) v.dispose();
    this.voices.length = 0;
  }
}

/**
 * Percussive envelope on an `AudioParam`. Explicit ramps rather than
 * `setTargetAtTime` because a sub-millisecond attack has to be exact: the
 * difference between 0.25 ms and 2 ms is the difference between a rifle and a
 * cap gun, and an exponential approach never actually arrives.
 */
/**
 * Level envelope for one layer.
 *
 * `attack` of zero means the source clip already carries its own attack, and
 * the envelope must not impose a second one. That distinction matters more than
 * it looks: the crack clip's peak *is* its first sample — a two-sample shock
 * front, which is what makes it broadband to Nyquist — so ramping a gain up
 * underneath it over even a quarter of a millisecond multiplies the front by
 * nothing and leaves only the turbulence behind it. The layer then measures
 * twenty-odd decibels down on the body and the shot loses its snap entirely.
 * Only the layers fed from the bare noise loops need a window of their own,
 * because those have no shape until something gives them one.
 */
function setEnv(
  param: AudioParam,
  at: number,
  peak: number,
  attack: number,
  decay: number,
  _ctx: BaseAudioContext,
): void {
  const p = Math.max(0.0002, peak);
  const end = at + Math.max(attack * 2, decay) * 3.2;
  try {
    param.cancelScheduledValues(at);
    if (attack <= 0) {
      param.setValueAtTime(p, at);
    } else {
      param.setValueAtTime(0.0001, at);
      param.linearRampToValueAtTime(p, at + attack);
    }
    param.exponentialRampToValueAtTime(0.0001, end);
    param.setValueAtTime(0, end + 0.001);
  } catch {
    param.value = p;
  }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
}
