/**
 * Sample-level synthesis kernel.
 *
 * Everything the audio system bakes at load time is computed here, in plain
 * `Float32Array`s, with no WebAudio dependency at all. That separation is
 * deliberate: a `BaseAudioContext` may be unavailable or suspended, and the
 * screenshot harness must never wait on one, so the design work has to be
 * possible without it. It also means a baked clip is reproducible from a seed,
 * which is what makes the numeric tests meaningful.
 *
 * Live per-event layers — the parts of a gunshot that must differ every time
 * the trigger is pulled — are built as WebAudio node graphs instead. See
 * `live/Shot.ts`.
 */

/**
 * A block of samples. WebAudio's `copyToChannel` and `WaveShaperNode.curve`
 * only accept `Float32Array`s backed by a plain `ArrayBuffer` rather than a
 * possibly-shared one, so everything that will eventually reach a node is
 * declared with that narrower type.
 */
export type Samples = Float32Array<ArrayBuffer>;

/* ------------------------------ randomness ------------------------------ */

/**
 * xorshift32. Deterministic, seedable and fast enough to run inside a bake
 * loop. Two clips built from the same seed are sample-identical, which the
 * test harness relies on to compare variants against one another rather than
 * against a fixed table of numbers.
 */
export class Rng {
  private s: number;

  constructor(seed = 0x9e3779b9) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }

  reseed(seed: number): void {
    this.s = seed >>> 0 || 0x9e3779b9;
  }

  /** Uniform in [0, 1). */
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }

  /** Uniform in [-1, 1). */
  bi(): number {
    return this.next() * 2 - 1;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(n: number): number {
    return Math.min(n - 1, (this.next() * n) | 0);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  /** Approximately normal, mean 0, sd 1. Four-tap sum is close enough here. */
  gauss(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.732;
  }
}

/* -------------------------------- clips --------------------------------- */

/**
 * A rendered sound, ready to become an `AudioBuffer`. The conversion is
 * memoised because a clip is played thousands of times but only ever needs one
 * `AudioBuffer`; `AudioBuffer` itself is context-independent in every engine
 * we target, so one instance serves the live context and any offline context
 * the test harness spins up at the same rate.
 */
export class Clip {
  readonly channels: Samples[] = [];
  private buffer: AudioBuffer | null = null;

  constructor(
    readonly sampleRate: number,
    readonly length: number,
    channelCount = 1,
  ) {
    for (let c = 0; c < channelCount; c++) this.channels.push(new Float32Array(length));
  }

  static fromChannels(sampleRate: number, channels: Samples[]): Clip {
    const clip = new Clip(sampleRate, channels[0].length, 0);
    for (const ch of channels) clip.channels.push(ch);
    return clip;
  }

  get channelCount(): number {
    return this.channels.length;
  }

  get duration(): number {
    return this.length / this.sampleRate;
  }

  ch(i: number): Samples {
    return this.channels[Math.min(i, this.channels.length - 1)];
  }

  /**
   * Lazily materialises the `AudioBuffer`. Returns null rather than throwing
   * when the platform has no `AudioBuffer` at all, so a headless run without
   * WebAudio still boots.
   */
  toBuffer(ctx?: BaseAudioContext): AudioBuffer | null {
    if (this.buffer && this.buffer.sampleRate === this.sampleRate) return this.buffer;
    try {
      let buf: AudioBuffer;
      if (typeof AudioBuffer === 'function') {
        buf = new AudioBuffer({
          length: this.length,
          numberOfChannels: this.channels.length,
          sampleRate: this.sampleRate,
        });
      } else if (ctx) {
        buf = ctx.createBuffer(this.channels.length, this.length, this.sampleRate);
      } else {
        return null;
      }
      for (let c = 0; c < this.channels.length; c++) buf.copyToChannel(this.channels[c], c);
      this.buffer = buf;
      return buf;
    } catch {
      return null;
    }
  }
}

/** Allocates a clip sized in seconds rather than samples. */
export function clip(sampleRate: number, seconds: number, channels = 1): Clip {
  return new Clip(sampleRate, Math.max(1, Math.ceil(seconds * sampleRate)), channels);
}

/* --------------------------------- noise -------------------------------- */

export function white(out: Float32Array, rng: Rng, gain = 1, start = 0, len = -1): void {
  const end = len < 0 ? out.length : Math.min(out.length, start + len);
  for (let i = start; i < end; i++) out[i] += rng.bi() * gain;
}

/**
 * Pink noise by Paul Kellet's economy filter: -3 dB/octave to within a few
 * tenths across the audible band, which is all a gun body or a wind bed needs.
 */
export function pink(out: Float32Array, rng: Rng, gain = 1, start = 0, len = -1): void {
  const end = len < 0 ? out.length : Math.min(out.length, start + len);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = start; i < end; i++) {
    const w = rng.bi();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    out[i] += v * 0.11 * gain;
  }
}

/** Brown (-6 dB/octave) noise, leaky so it cannot wander off to DC. */
export function brown(out: Float32Array, rng: Rng, gain = 1, start = 0, len = -1): void {
  const end = len < 0 ? out.length : Math.min(out.length, start + len);
  let last = 0;
  for (let i = start; i < end; i++) {
    last = (last + rng.bi() * 0.02) * 0.998;
    out[i] += last * 16 * gain;
  }
}

export type NoiseColor = 'white' | 'pink' | 'brown';

export function noise(
  out: Float32Array,
  rng: Rng,
  color: NoiseColor,
  gain = 1,
  start = 0,
  len = -1,
): void {
  if (color === 'pink') pink(out, rng, gain, start, len);
  else if (color === 'brown') brown(out, rng, gain, start, len);
  else white(out, rng, gain, start, len);
}

/* ------------------------------- envelopes ------------------------------ */

/** A breakpoint in an arbitrary envelope: seconds from the start, and level. */
export interface EnvPoint {
  t: number;
  v: number;
  /** >1 holds near the previous level then falls fast; <1 the opposite. */
  curve?: number;
}

/**
 * Multiplies an arbitrary piecewise envelope into a signal. Segments are
 * interpolated with a power curve so a "hold then collapse" shape is one
 * breakpoint rather than five.
 */
export function applyEnv(
  data: Float32Array,
  sampleRate: number,
  points: readonly EnvPoint[],
  start = 0,
): void {
  if (points.length === 0) return;
  const n = data.length;
  let seg = 0;
  let segStart = start + points[0].t * sampleRate;
  const first = points[0].v;
  for (let i = start; i < n; i++) {
    while (seg < points.length - 1 && i >= start + points[seg + 1].t * sampleRate) {
      seg++;
      segStart = start + points[seg].t * sampleRate;
    }
    let level: number;
    if (seg >= points.length - 1) {
      level = points[points.length - 1].v;
    } else {
      const a = points[seg];
      const b = points[seg + 1];
      const span = Math.max(1e-9, (b.t - a.t) * sampleRate);
      const u = Math.min(1, Math.max(0, (i - segStart) / span));
      const c = b.curve ?? 1;
      const shaped = c === 1 ? u : Math.pow(u, c);
      level = a.v + (b.v - a.v) * shaped;
    }
    if (i < start) level = first;
    data[i] *= level;
  }
  for (let i = 0; i < Math.min(start, n); i++) data[i] = 0;
}

/**
 * The percussive envelope nearly every one-shot layer wants: a very fast rise
 * then an exponential fall. `attack` under a millisecond is what gives a
 * gunshot its snap, so it is expressed in seconds and never quantised.
 */
export function perc(
  data: Float32Array,
  sampleRate: number,
  attack: number,
  decay: number,
  shape = 2.2,
  start = 0,
  len = -1,
): void {
  const end = len < 0 ? data.length : Math.min(data.length, start + len);
  const aN = Math.max(1, attack * sampleRate);
  const dN = Math.max(1, decay * sampleRate);
  for (let i = 0; i < start && i < data.length; i++) data[i] = 0;
  for (let i = start; i < end; i++) {
    const k = i - start;
    let g: number;
    if (k < aN) {
      g = k / aN;
      // A slightly convex rise reads as harder than a linear one.
      g *= g * (3 - 2 * g);
    } else {
      g = Math.exp((-(k - aN) / dN) * shape);
    }
    data[i] *= g;
  }
  for (let i = end; i < data.length; i++) data[i] = 0;
}

/** Classic ADSR, for sustained layers such as a tinnitus tone or a drone. */
export function adsr(
  data: Float32Array,
  sampleRate: number,
  a: number,
  d: number,
  sustain: number,
  hold: number,
  r: number,
  start = 0,
): void {
  const aN = Math.max(1, a * sampleRate);
  const dN = Math.max(1, d * sampleRate);
  const hN = Math.max(0, hold * sampleRate);
  const rN = Math.max(1, r * sampleRate);
  const end = Math.min(data.length, start + aN + dN + hN + rN);
  for (let i = start; i < end; i++) {
    const k = i - start;
    let g: number;
    if (k < aN) g = k / aN;
    else if (k < aN + dN) g = 1 + (sustain - 1) * ((k - aN) / dN);
    else if (k < aN + dN + hN) g = sustain;
    else g = sustain * Math.max(0, 1 - (k - aN - dN - hN) / rN);
    data[i] *= g;
  }
  for (let i = end; i < data.length; i++) data[i] = 0;
}

/** Exponential decay multiplied in place, expressed as an RT60-style time. */
export function decayTo60(
  data: Float32Array,
  sampleRate: number,
  rt60: number,
  start = 0,
  len = -1,
): void {
  const end = len < 0 ? data.length : Math.min(data.length, start + len);
  const k = Math.log(1000) / Math.max(1e-4, rt60 * sampleRate);
  for (let i = start; i < end; i++) data[i] *= Math.exp(-k * (i - start));
}

/* -------------------------------- filters ------------------------------- */

export type FilterKind =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'peaking'
  | 'lowshelf'
  | 'highshelf'
  | 'allpass';

/** Normalised biquad coefficients, a0 divided out. */
export interface Coeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const COEFFS: Coeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };

/**
 * RBJ cookbook designer. Writes into `out` when given one so a swept filter
 * can redesign itself every few samples without allocating.
 */
export function design(
  kind: FilterKind,
  sampleRate: number,
  freq: number,
  q = 0.7071,
  gainDb = 0,
  out: Coeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 },
): Coeffs {
  const f = Math.min(Math.max(freq, 10), sampleRate * 0.4995);
  const w = (2 * Math.PI * f) / sampleRate;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const qq = Math.max(1e-4, q);
  const alpha = sw / (2 * qq);
  const A = Math.pow(10, gainDb / 40);

  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;

  switch (kind) {
    case 'lowpass':
      b0 = (1 - cw) / 2;
      b1 = 1 - cw;
      b2 = (1 - cw) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cw) / 2;
      b1 = -(1 + cw);
      b2 = (1 + cw) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'bandpass':
      // Constant skirt gain, peak gain = Q.
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1;
      b1 = -2 * cw;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A;
      b1 = -2 * cw;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cw;
      a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cw + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cw);
      b2 = A * (A + 1 - (A - 1) * cw - s);
      a0 = A + 1 + (A - 1) * cw + s;
      a1 = -2 * (A - 1 + (A + 1) * cw);
      a2 = A + 1 + (A - 1) * cw - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cw + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cw);
      b2 = A * (A + 1 + (A - 1) * cw - s);
      a0 = A + 1 - (A - 1) * cw + s;
      a1 = 2 * (A - 1 - (A + 1) * cw);
      a2 = A + 1 - (A - 1) * cw - s;
      break;
    }
    case 'allpass':
      b0 = 1 - alpha;
      b1 = -2 * cw;
      b2 = 1 + alpha;
      a0 = 1 + alpha;
      a1 = -2 * cw;
      a2 = 1 - alpha;
      break;
  }

  out.b0 = b0 / a0;
  out.b1 = b1 / a0;
  out.b2 = b2 / a0;
  out.a1 = a1 / a0;
  out.a2 = a2 / a0;
  return out;
}

export interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function newState(): BiquadState {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

export function runBiquad(
  data: Float32Array,
  c: Coeffs,
  s: BiquadState = newState(),
  start = 0,
  len = -1,
): void {
  const end = len < 0 ? data.length : Math.min(data.length, start + len);
  let { x1, x2, y1, y2 } = s;
  const { b0, b1, b2, a1, a2 } = c;
  for (let i = start; i < end; i++) {
    const x = data[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    data[i] = y;
  }
  s.x1 = x1;
  s.x2 = x2;
  s.y1 = y1;
  s.y2 = y2;
}

/** Applies a static filter in place. The workhorse of every bake. */
export function filter(
  data: Float32Array,
  sampleRate: number,
  kind: FilterKind,
  freq: number,
  q = 0.7071,
  gainDb = 0,
  passes = 1,
): void {
  const c = design(kind, sampleRate, freq, q, gainDb, COEFFS);
  for (let p = 0; p < passes; p++) runBiquad(data, c, newState());
}

/**
 * Swept filter. Coefficients are redesigned every `block` samples, which is
 * inaudible at 32 and turns a two-pole biquad into the falling-cutoff
 * "whoomph" that gives a gun body its shape.
 */
export function sweep(
  data: Float32Array,
  sampleRate: number,
  kind: FilterKind,
  fromHz: number,
  toHz: number,
  seconds: number,
  q = 0.9,
  curve = 2,
  start = 0,
  block = 32,
): void {
  const state = newState();
  const c: Coeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
  const total = Math.max(1, seconds * sampleRate);
  const n = data.length;
  for (let i = start; i < n; i += block) {
    const u = Math.min(1, (i - start) / total);
    const shaped = Math.pow(u, curve);
    const f = fromHz * Math.pow(Math.max(1e-3, toHz / fromHz), shaped);
    design(kind, sampleRate, f, q, 0, c);
    runBiquad(data, c, state, i, Math.min(block, n - i));
  }
}

/* ------------------------------ resonators ------------------------------ */

export interface Mode {
  /** Hz. */
  freq: number;
  /** Seconds to fall 60 dB. */
  decay: number;
  gain: number;
}

/**
 * Modal bank: a set of decaying resonators struck by an excitation signal.
 * This is what makes metal sound like metal — a bell, a shell casing, a bolt
 * carrier and a chamber ring are all the same algorithm with different mode
 * tables. Detuning the table per event is what stops repeated hits from
 * sounding like a sample.
 */
/**
 * Decay a mode gain of 1 is calibrated against. Modes are excited by a burst a
 * couple of milliseconds long — far shorter than any of these resonators take
 * to ring up — so the peak of an impulse-excited two-pole resonator, `g/sin w`,
 * is what governs how loud a mode comes out, and it does not depend on the decay
 * time at all. Scaling by each mode's own `1 - r` instead would normalise for
 * *sustained* excitation and suppress a half-second mode a thousandfold against
 * a ten-millisecond one, which leaves every metal ring dominated by its
 * shortest modes: precisely the opposite of what a mode table is written for.
 */
const MODAL_REF_DECAY = 0.1;

export function modal(
  out: Float32Array,
  exciter: Float32Array,
  sampleRate: number,
  modes: readonly Mode[],
  start = 0,
  detune = 0,
  rng?: Rng,
): void {
  const n = out.length;
  const norm = 1 - Math.exp(-Math.log(1000) / Math.max(1, MODAL_REF_DECAY * sampleRate));
  for (const m of modes) {
    const jitter = rng && detune > 0 ? 1 + rng.bi() * detune : 1;
    const f = Math.min(m.freq * jitter, sampleRate * 0.48);
    const r = Math.exp(-Math.log(1000) / Math.max(1, m.decay * sampleRate));
    const w = (2 * Math.PI * f) / sampleRate;
    const c1 = 2 * r * Math.cos(w);
    const c2 = -r * r;
    // Equal gains mean equal peaks, whatever the decay times are.
    const g = m.gain * norm * Math.sin(w);
    let y1 = 0;
    let y2 = 0;
    for (let i = start; i < n; i++) {
      const x = i < exciter.length ? exciter[i] : 0;
      const y = g * x + c1 * y1 + c2 * y2;
      y2 = y1;
      y1 = y;
      out[i] += y;
    }
  }
}

/**
 * Comb filter, positive or negative feedback. Parallel walls, a tunnel's
 * flutter echo and the metallic edge on a chamber ring are all combs.
 */
export function comb(
  data: Float32Array,
  sampleRate: number,
  delaySec: number,
  feedback: number,
  mix = 1,
): void {
  const d = Math.max(1, Math.round(delaySec * sampleRate));
  const n = data.length;
  const fb = Math.max(-0.98, Math.min(0.98, feedback));
  for (let i = d; i < n; i++) data[i] += data[i - d] * fb * mix;
}

/** Schroeder allpass, used to smear a bare noise tail into a room. */
export function allpass(data: Float32Array, sampleRate: number, delaySec: number, g = 0.6): void {
  const d = Math.max(1, Math.round(delaySec * sampleRate));
  const n = data.length;
  const buf = new Float32Array(d);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const bufOut = buf[p];
    const x = data[i];
    const y = -g * x + bufOut;
    buf[p] = x + g * y;
    p = (p + 1) % d;
    data[i] = y;
  }
}

/* ------------------------------ waveshaping ----------------------------- */

/** Soft saturation. Adds the density that makes a loud layer read as loud. */
export function shapeTanh(data: Float32Array, drive = 2, mixIn = 1): void {
  const norm = 1 / Math.tanh(drive);
  for (let i = 0; i < data.length; i++) {
    const wet = Math.tanh(data[i] * drive) * norm;
    data[i] = data[i] * (1 - mixIn) + wet * mixIn;
  }
}

/** Hard clip. Used sparingly; it is the sound of a mic pinned by a muzzle. */
export function shapeClip(data: Float32Array, threshold = 0.8): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(-threshold, Math.min(threshold, data[i]));
  }
}

/**
 * Wavefolding: reflects at the rails instead of truncating, so it generates a
 * dense odd-harmonic series without the clip's dead flat top.
 */
export function shapeFold(data: Float32Array, amount = 1.6): void {
  for (let i = 0; i < data.length; i++) {
    let v = data[i] * amount;
    let guard = 0;
    while ((v > 1 || v < -1) && guard++ < 16) v = v > 1 ? 2 - v : -2 - v;
    data[i] = Math.max(-1, Math.min(1, v));
  }
}

/**
 * A transfer curve for `WaveShaperNode`, for the live side of the engine.
 *
 * `ceiling` scales the whole curve, and on the master chain it is what makes
 * overflow structurally impossible: a `WaveShaperNode` clamps its input to the
 * curve's domain, so the output cannot exceed the curve's own maximum. That
 * guarantee holds only while the shaper is not oversampled, since oversampling
 * resamples after the curve and rings above it; and the ceiling is left a little
 * under full scale for the inter-sample peaks a converter reconstructs from
 * material sitting on the limit.
 */
export function tanhCurve(size = 1024, drive = 3, ceiling = 1): Samples {
  const curve = new Float32Array(size);
  const norm = ceiling / Math.tanh(drive);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) * norm;
  }
  return curve;
}

/** An asymmetric curve; the second harmonic it adds reads as "chest". */
export function asymCurve(size = 1024, drive = 2.4, bias = 0.12): Samples {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    const v = Math.tanh((x + bias) * drive) - Math.tanh(bias * drive);
    curve[i] = Math.max(-1, Math.min(1, v * 0.86));
  }
  return curve;
}

/* -------------------------------- grains -------------------------------- */

export interface GrainOptions {
  /** Seconds over which grains are scattered. */
  spread: number;
  count: number;
  /** Grain length in seconds, randomised +/- `lengthJitter`. */
  length: number;
  lengthJitter?: number;
  /** Playback rate range applied by resampling the source. */
  rateMin?: number;
  rateMax?: number;
  gain?: number;
  /** >1 clusters grains toward the start, which is how debris actually falls. */
  clumping?: number;
  /** Randomly invert polarity so grains do not sum into a periodic buzz. */
  flip?: boolean;
}

/**
 * Scatters short windowed slices of `src` across `out`. Baking granular
 * material rather than scheduling live grains keeps debris rain and gravel
 * underfoot to a single voice instead of forty.
 */
export function scatterGrains(
  out: Float32Array,
  src: Float32Array,
  sampleRate: number,
  rng: Rng,
  opts: GrainOptions,
  start = 0,
): void {
  const spread = Math.max(1, opts.spread * sampleRate);
  const gain = opts.gain ?? 1;
  const lj = opts.lengthJitter ?? 0.5;
  const rMin = opts.rateMin ?? 0.8;
  const rMax = opts.rateMax ?? 1.4;
  const clump = opts.clumping ?? 1;
  for (let g = 0; g < opts.count; g++) {
    const u = Math.pow(rng.next(), clump);
    const at = start + Math.floor(u * spread);
    const len = Math.max(4, Math.floor(opts.length * sampleRate * (1 + rng.bi() * lj)));
    const rate = rng.range(rMin, rMax);
    const srcOff = rng.int(Math.max(1, src.length - Math.ceil(len * rate) - 1));
    const amp = gain * rng.range(0.35, 1) * (opts.flip && rng.next() < 0.5 ? -1 : 1);
    for (let i = 0; i < len; i++) {
      const o = at + i;
      if (o < 0 || o >= out.length) continue;
      // Hann window keeps grain edges from clicking.
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / len);
      const sp = srcOff + i * rate;
      const si = sp | 0;
      if (si + 1 >= src.length) break;
      const frac = sp - si;
      const s = src[si] * (1 - frac) + src[si + 1] * frac;
      out[o] += s * w * amp;
    }
  }
}

/* ------------------------------ oscillators ----------------------------- */

export type Wave = 'sine' | 'triangle' | 'saw' | 'square';

function waveAt(wave: Wave, phase: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(phase);
    case 'triangle': {
      const p = (phase / (2 * Math.PI)) % 1;
      return 4 * Math.abs(p - 0.5) - 1;
    }
    case 'saw': {
      const p = (phase / (2 * Math.PI)) % 1;
      return 2 * p - 1;
    }
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
  }
}

export interface ToneOptions {
  wave?: Wave;
  /** Ending frequency; equals `freq` when omitted. */
  toFreq?: number;
  /** Seconds the pitch glide takes. Defaults to the whole length. */
  glide?: number;
  /** >1 falls fast then flattens, which is what a blast's pitch drop does. */
  glideCurve?: number;
  gain?: number;
  /** Frequency-modulation index, in units of the modulator's own frequency. */
  fmRatio?: number;
  fmIndex?: number;
  fmWave?: Wave;
  /**
   * Starting phase, in radians. Defaults to zero, so a sine begins at a zero
   * crossing and reaches its first maximum a quarter of a cycle later.
   *
   * `Math.PI / 2` instead begins at the crest, which is what a blast wants: an
   * overpressure wave jumps to its peak and then decays, so at 88 Hz a
   * zero-phase punch puts the loudest part of an explosion nearly three
   * milliseconds behind its own shock front rather than underneath it.
   */
  phase?: number;
}

/**
 * Additive tone with an optional pitch glide and one FM operator. The sub
 * layer of an explosion, the tinnitus pair and the bomb whistle are all this
 * function with different arguments.
 */
export function tone(
  out: Float32Array,
  sampleRate: number,
  freq: number,
  seconds: number,
  opts: ToneOptions = {},
  start = 0,
): void {
  const wave = opts.wave ?? 'sine';
  const to = opts.toFreq ?? freq;
  const glide = Math.max(1e-4, opts.glide ?? seconds);
  const curve = opts.glideCurve ?? 1;
  const gain = opts.gain ?? 1;
  const fmRatio = opts.fmRatio ?? 0;
  const fmIndex = opts.fmIndex ?? 0;
  const fmWave = opts.fmWave ?? 'sine';
  const n = Math.min(out.length, start + Math.ceil(seconds * sampleRate));
  let phase = opts.phase ?? 0;
  let fmPhase = 0;
  const dt = 1 / sampleRate;
  for (let i = start; i < n; i++) {
    const u = Math.min(1, (i - start) / (glide * sampleRate));
    const f = freq * Math.pow(Math.max(1e-4, to / freq), Math.pow(u, curve));
    let inst = f;
    if (fmIndex > 0 && fmRatio > 0) {
      const fm = waveAt(fmWave, fmPhase);
      fmPhase += 2 * Math.PI * f * fmRatio * dt;
      inst = f + fm * fmIndex * f * fmRatio;
    }
    out[i] += waveAt(wave, phase) * gain;
    phase += 2 * Math.PI * Math.max(0.1, inst) * dt;
    if (phase > 1e6) phase -= 1e6;
  }
}

/* -------------------------------- utility ------------------------------- */

export function mixInto(dst: Float32Array, src: Float32Array, gain = 1, offset = 0): void {
  const n = Math.min(dst.length - offset, src.length);
  for (let i = 0; i < n; i++) dst[i + offset] += src[i] * gain;
}

export function scale(data: Float32Array, gain: number): void {
  for (let i = 0; i < data.length; i++) data[i] *= gain;
}

export function peakOf(data: Float32Array): number {
  let p = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > p) p = a;
  }
  return p;
}

/** Scales to a target peak. Returns the gain that was applied. */
export function normalise(data: Float32Array, target = 0.9): number {
  const p = peakOf(data);
  if (p < 1e-9) return 0;
  const g = target / p;
  scale(data, g);
  return g;
}

/** Normalises a whole clip by a single gain so its stereo image survives. */
export function normaliseClip(c: Clip, target = 0.9): number {
  let p = 0;
  for (const ch of c.channels) p = Math.max(p, peakOf(ch));
  if (p < 1e-9) return 0;
  const g = target / p;
  for (const ch of c.channels) scale(ch, g);
  return g;
}

/**
 * Scales a clip so that convolving with it is roughly gain-neutral.
 *
 * A `ConvolverNode` with `normalize = false` applies exactly the impulse
 * response it is handed, and an impulse response scaled to peak 1 has enormous
 * total energy: a second of decaying noise sums tens of thousands of samples,
 * so the wet return comes back many times louder than the send. Normalising by
 * root-sum-square rather than by peak makes the reverb unit behave like a send
 * with a predictable level, and — more importantly — makes that level
 * independent of how long the room rings, so moving from a small room to a
 * tunnel changes the character rather than jumping the volume. How reverberant
 * a room is stays where it belongs, in `ZoneProfile.wet`.
 */
export function normaliseEnergy(c: Clip, target = 1): number {
  let sum = 0;
  for (const ch of c.channels) {
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
  }
  const energy = Math.sqrt(sum / Math.max(1, c.channelCount));
  if (energy < 1e-9) return 0;
  const g = target / energy;
  for (const ch of c.channels) scale(ch, g);
  return g;
}

/** Removes DC so a heavily shaped layer does not eat headroom. */
export function removeDc(data: Float32Array): void {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const dc = sum / Math.max(1, data.length);
  for (let i = 0; i < data.length; i++) data[i] -= dc;
}

/**
 * Short raised-cosine fades, so a clip cannot click at either end.
 *
 * A fade length of zero skips that end, and for anything whose first sample is
 * its peak that is the only correct choice. A window always sends its first
 * sample to zero, so a one- or two-sample fade-in over a designed impulse does
 * not remove a click — it removes the front, which is the loudest and most
 * broadband part of the sound and the reason the clip exists. There is nothing
 * to smooth there in any case: a buffer beginning at full scale is a step, and
 * a step is exactly what a shock front is.
 */
export function fadeEdges(data: Float32Array, sampleRate: number, inSec = 0.0004, outSec = 0.004): void {
  const half = data.length >> 1;
  if (inSec > 0) {
    const a = Math.min(half, Math.max(1, Math.round(inSec * sampleRate)));
    for (let i = 0; i < a; i++) data[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  }
  if (outSec > 0) {
    const b = Math.min(half, Math.max(1, Math.round(outSec * sampleRate)));
    for (let i = 0; i < b; i++) {
      const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
      data[data.length - 1 - i] *= g;
    }
  }
}

/**
 * Turns a clip into something that loops without an audible seam by
 * crossfading its tail over its head. The overlap is discarded, so the result
 * is shorter than the input.
 */
export function makeLoopable(c: Clip, overlapSec: number): Clip {
  const ov = Math.min(c.length >> 1, Math.max(1, Math.round(overlapSec * c.sampleRate)));
  const outLen = c.length - ov;
  const out = new Clip(c.sampleRate, outLen, c.channelCount);
  for (let ch = 0; ch < c.channelCount; ch++) {
    const src = c.channels[ch];
    const dst = out.channels[ch];
    for (let i = 0; i < outLen; i++) dst[i] = src[i];
    for (let i = 0; i < ov; i++) {
      const w = i / ov;
      dst[i] = dst[i] * w + src[outLen + i] * (1 - w);
    }
  }
  return out;
}

/** Copies mono content into a stereo clip with a little decorrelation. */
export function widen(mono: Float32Array, sampleRate: number, rng: Rng, spreadMs = 6): Clip {
  const c = new Clip(sampleRate, mono.length, 2);
  const d = Math.max(1, Math.round((spreadMs / 1000) * sampleRate));
  const L = c.channels[0];
  const R = c.channels[1];
  for (let i = 0; i < mono.length; i++) {
    L[i] = mono[i];
    R[i] = i >= d ? mono[i - d] * 0.86 : 0;
  }
  // A touch of independent noise-free allpass on one side avoids a hard comb.
  allpass(R, sampleRate, 0.0031 + rng.next() * 0.002, 0.5);
  return c;
}
