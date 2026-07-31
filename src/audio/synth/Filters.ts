/**
 * Offline filter primitives: RBJ biquads, one-poles, and the time-varying
 * sweeps that do most of the work in gunfire and explosion design.
 *
 * Coefficients follow Robert Bristow-Johnson's audio EQ cookbook. Everything
 * is direct-form I, which is stable enough for the short bursts here and cheap
 * to retune sample by sample during a sweep.
 */
import type { Signal } from './Signal';

export type BiquadKind =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'peaking'
  | 'lowshelf'
  | 'highshelf'
  | 'allpass';

const NYQUIST_MARGIN = 0.49;

export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    kind: BiquadKind,
    freq: number,
    q: number,
    private readonly sampleRate: number,
    gainDb = 0,
  ) {
    this.set(kind, freq, q, gainDb);
  }

  set(kind: BiquadKind, freq: number, q: number, gainDb = 0): void {
    const sr = this.sampleRate;
    const f = Math.min(Math.max(freq, 5), sr * NYQUIST_MARGIN);
    const qq = Math.max(1e-3, q);
    const w0 = (2 * Math.PI * f) / sr;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const alpha = sw / (2 * qq);
    let b0 = 1;
    let b1 = 0;
    let b2 = 0;
    let a0 = 1;
    let a1 = 0;
    let a2 = 0;

    switch (kind) {
      case 'lowpass':
        b0 = (1 - cw) * 0.5;
        b1 = 1 - cw;
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cw) * 0.5;
        b1 = -(1 + cw);
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'bandpass':
        // Constant 0 dB peak gain.
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
      case 'allpass':
        b0 = 1 - alpha;
        b1 = -2 * cw;
        b2 = 1 + alpha;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'peaking': {
        const a = Math.pow(10, gainDb / 40);
        b0 = 1 + alpha * a;
        b1 = -2 * cw;
        b2 = 1 - alpha * a;
        a0 = 1 + alpha / a;
        a1 = -2 * cw;
        a2 = 1 - alpha / a;
        break;
      }
      case 'lowshelf': {
        const a = Math.pow(10, gainDb / 40);
        const s = 2 * Math.sqrt(a) * alpha;
        b0 = a * (a + 1 - (a - 1) * cw + s);
        b1 = 2 * a * (a - 1 - (a + 1) * cw);
        b2 = a * (a + 1 - (a - 1) * cw - s);
        a0 = a + 1 + (a - 1) * cw + s;
        a1 = -2 * (a - 1 + (a + 1) * cw);
        a2 = a + 1 + (a - 1) * cw - s;
        break;
      }
      case 'highshelf': {
        const a = Math.pow(10, gainDb / 40);
        const s = 2 * Math.sqrt(a) * alpha;
        b0 = a * (a + 1 + (a - 1) * cw + s);
        b1 = -2 * a * (a - 1 + (a + 1) * cw);
        b2 = a * (a + 1 + (a - 1) * cw - s);
        a0 = a + 1 - (a - 1) * cw + s;
        a1 = 2 * (a - 1 - (a + 1) * cw);
        a2 = a + 1 - (a - 1) * cw - s;
        break;
      }
    }

    const inv = 1 / a0;
    this.b0 = b0 * inv;
    this.b1 = b1 * inv;
    this.b2 = b2 * inv;
    this.a1 = a1 * inv;
    this.a2 = a2 * inv;
  }

  reset(): void {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }

  process(x: number): number {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  run(target: Signal): Signal {
    const d = target.data;
    for (let i = 0; i < d.length; i++) d[i] = this.process(d[i]);
    return target;
  }
}

/** Single-pole lowpass, for smoothing control signals and gentle dulling. */
export class OnePole {
  private y = 0;
  private a: number;

  constructor(cutoff: number, sampleRate: number) {
    this.a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  }

  setCutoff(cutoff: number, sampleRate: number): void {
    this.a = 1 - Math.exp((-2 * Math.PI * Math.max(1, cutoff)) / sampleRate);
  }

  process(x: number): number {
    this.y += (x - this.y) * this.a;
    return this.y;
  }

  reset(value = 0): void {
    this.y = value;
  }
}

export interface SweepOptions {
  kind?: BiquadKind;
  q?: number;
  gainDb?: number;
  /** Shapes the interpolation between the two frequencies. */
  curve?: (t: number) => number;
  /** Coefficients are recomputed every N samples; 16 is inaudible and 8x cheaper. */
  chunk?: number;
}

/**
 * Run `target` through a filter whose cutoff moves from `startHz` to `endHz`
 * across the whole buffer. This is the single most useful tool in the kit: an
 * explosion is a noise burst through a filter that opens then slams shut, and a
 * ricochet is a bandpass whine falling in pitch.
 */
export function sweepFilter(
  target: Signal,
  startHz: number,
  endHz: number,
  opts: SweepOptions = {},
): Signal {
  const kind = opts.kind ?? 'lowpass';
  const q = opts.q ?? 0.7071;
  const gainDb = opts.gainDb ?? 0;
  const curve = opts.curve ?? ((t) => t);
  const chunk = Math.max(1, opts.chunk ?? 16);
  const filter = new Biquad(kind, startHz, q, target.sampleRate, gainDb);
  const d = target.data;
  const n = d.length;
  const logStart = Math.log(Math.max(5, startHz));
  const logEnd = Math.log(Math.max(5, endHz));

  for (let base = 0; base < n; base += chunk) {
    const t = curve(Math.min(1, base / Math.max(1, n - 1)));
    filter.set(kind, Math.exp(logStart + (logEnd - logStart) * t), q, gainDb);
    const end = Math.min(n, base + chunk);
    for (let i = base; i < end; i++) d[i] = filter.process(d[i]);
  }
  return target;
}

/**
 * Filter with an arbitrary cutoff-versus-time function, in Hz. Used where the
 * contour is not monotonic — an explosion's filter opens in 15 ms and then
 * closes over a second.
 */
export function contourFilter(
  target: Signal,
  cutoffAt: (t: number) => number,
  opts: SweepOptions = {},
): Signal {
  const kind = opts.kind ?? 'lowpass';
  const q = opts.q ?? 0.7071;
  const gainDb = opts.gainDb ?? 0;
  const chunk = Math.max(1, opts.chunk ?? 16);
  const filter = new Biquad(kind, cutoffAt(0), q, target.sampleRate, gainDb);
  const d = target.data;
  const n = d.length;
  const inv = 1 / target.sampleRate;

  for (let base = 0; base < n; base += chunk) {
    filter.set(kind, cutoffAt(base * inv), q, gainDb);
    const end = Math.min(n, base + chunk);
    for (let i = base; i < end; i++) d[i] = filter.process(d[i]);
  }
  return target;
}

export const lowpass = (target: Signal, hz: number, q = 0.7071): Signal =>
  new Biquad('lowpass', hz, q, target.sampleRate).run(target);

export const highpass = (target: Signal, hz: number, q = 0.7071): Signal =>
  new Biquad('highpass', hz, q, target.sampleRate).run(target);

export const bandpass = (target: Signal, hz: number, q = 2): Signal =>
  new Biquad('bandpass', hz, q, target.sampleRate).run(target);

export const peaking = (target: Signal, hz: number, q: number, gainDb: number): Signal =>
  new Biquad('peaking', hz, q, target.sampleRate, gainDb).run(target);

export const lowshelf = (target: Signal, hz: number, gainDb: number): Signal =>
  new Biquad('lowshelf', hz, 0.7071, target.sampleRate, gainDb).run(target);

export const highshelf = (target: Signal, hz: number, gainDb: number): Signal =>
  new Biquad('highshelf', hz, 0.7071, target.sampleRate, gainDb).run(target);

/** Two cascaded lowpass stages: 24 dB/octave, for "heard through a wall". */
export function lowpass24(target: Signal, hz: number, q = 0.7071): Signal {
  new Biquad('lowpass', hz, q, target.sampleRate).run(target);
  return new Biquad('lowpass', hz, q, target.sampleRate).run(target);
}

/**
 * A stack of resonant peaks. Formants are what make a noise burst read as a
 * specific *thing* — a rifle's bore, a human throat, a steel drum — rather than
 * as generic filtered hiss.
 */
export interface Formant {
  freq: number;
  q: number;
  gainDb: number;
}

export function formants(target: Signal, list: readonly Formant[]): Signal {
  for (const f of list) {
    new Biquad('peaking', f.freq, f.q, target.sampleRate, f.gainDb).run(target);
  }
  return target;
}
