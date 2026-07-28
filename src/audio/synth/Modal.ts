/**
 * Modal and physical-model synthesis.
 *
 * A struck object rings at a set of frequencies determined by its geometry,
 * each decaying at its own rate. Getting those partials right is the difference
 * between "brass casing hitting concrete" and "click": the click is the
 * excitation, the identity is entirely in the resonances that follow it.
 *
 * Two engines here:
 *  - `resonate`, a bank of two-pole resonators driven by an excitation signal.
 *    Cheap, and the excitation shapes the attack for free.
 *  - `karplusStrong`, a damped delay line. The right tool for anything long and
 *    string-like or for a thin metal panel's ping.
 */
import { Rng } from '../../core/MathUtils';
import { Signal } from './Signal';

export interface Mode {
  /** Partial frequency in Hz. */
  freq: number;
  /** -60 dB time in seconds. */
  decay: number;
  gain: number;
}

/**
 * Run `excitation` through a bank of ringing resonators, summing the outputs.
 *
 * Each resonator is `y[n] = 2 r cos(w) y[n-1] - r^2 y[n-2] + (1 - r) x[n]`,
 * a two-pole with poles at radius `r` — the standard modal building block.
 */
export function resonate(excitation: Signal, modes: readonly Mode[], gain = 1): Signal {
  const sr = excitation.sampleRate;
  const out = new Signal(excitation.duration, sr);
  const src = excitation.data;
  const dst = out.data;
  const n = dst.length;

  for (const mode of modes) {
    if (mode.freq <= 0 || mode.freq >= sr * 0.49 || mode.gain === 0) continue;
    // r chosen so amplitude falls 60 dB in `decay` seconds.
    const r = Math.exp(-6.9078 / (Math.max(1e-4, mode.decay) * sr));
    const w = (2 * Math.PI * mode.freq) / sr;
    const c1 = 2 * r * Math.cos(w);
    const c2 = -r * r;
    const drive = (1 - r) * mode.gain * gain;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < n; i++) {
      const y = c1 * y1 + c2 * y2 + drive * src[i];
      y2 = y1;
      y1 = y;
      dst[i] += y;
    }
  }
  return out;
}

/**
 * Inharmonic mode set typical of a struck metal body: a fundamental plus
 * partials pushed off the harmonic series by `stretch`. `stretch` of 0 is a
 * pure harmonic series (tonal, bell-like), 0.4 is a clangy plate.
 */
export function metalModes(
  fundamental: number,
  count: number,
  decay: number,
  stretch: number,
  rng: Rng,
): Mode[] {
  const modes: Mode[] = [];
  for (let i = 0; i < count; i++) {
    const h = i + 1;
    const inharmonic = Math.pow(h, 1 + stretch) * (1 + stretch * 0.25 * rng.gaussian(0, 1));
    modes.push({
      freq: fundamental * inharmonic,
      // Higher partials always die first; that is what makes a decay read as real.
      decay: decay / Math.pow(h, 0.7),
      gain: 1 / Math.pow(h, 0.85),
    });
  }
  return modes;
}

/** Modes of a thin brittle plate — glass. Dense, bright, fast-decaying. */
export function glassModes(fundamental: number, count: number, rng: Rng): Mode[] {
  const modes: Mode[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = 1 + i * rng.range(0.55, 1.9);
    modes.push({
      freq: fundamental * ratio,
      decay: rng.range(0.05, 0.34) / (1 + i * 0.14),
      gain: rng.range(0.35, 1) / Math.pow(i + 1, 0.5),
    });
  }
  return modes;
}

/** Modes of a hollow wooden box — a few low partials, heavily damped. */
export function woodModes(fundamental: number, rng: Rng): Mode[] {
  return [
    { freq: fundamental, decay: rng.range(0.035, 0.06), gain: 1 },
    { freq: fundamental * rng.range(1.55, 1.75), decay: 0.03, gain: 0.55 },
    { freq: fundamental * rng.range(2.6, 3.1), decay: 0.02, gain: 0.3 },
    { freq: fundamental * rng.range(4.4, 5.2), decay: 0.012, gain: 0.15 },
  ];
}

export interface KarplusOptions {
  /** Loop-gain damping per pass; 0.996 rings for seconds, 0.9 for a blip. */
  damping?: number;
  /** 0..1 blend of the two-point average lowpass in the loop; higher = duller. */
  brightness?: number;
  /** Allpass coefficient in the loop; pushes partials off harmonic, i.e. metal. */
  dispersion?: number;
  /** Excitation shape. Noise for struck, impulse for plucked. */
  excitation?: 'noise' | 'impulse' | Signal;
  /** Fraction of the period the excitation occupies. */
  pluckWidth?: number;
}

/**
 * Karplus-Strong: a delay line of one period, fed back through a lowpass and an
 * optional allpass. With dispersion it is the cheapest convincing "brass casing
 * bouncing on concrete" there is.
 */
export function karplusStrong(
  seconds: number,
  sampleRate: number,
  freq: number,
  rng: Rng,
  opts: KarplusOptions = {},
): Signal {
  const out = new Signal(seconds, sampleRate);
  const d = out.data;
  const period = Math.max(2, Math.round(sampleRate / Math.max(20, freq)));
  const buf = new Float32Array(period);
  const damping = opts.damping ?? 0.994;
  const brightness = Math.min(1, Math.max(0, opts.brightness ?? 0.5));
  const dispersion = opts.dispersion ?? 0;

  const excitation = opts.excitation ?? 'noise';
  if (excitation === 'noise') {
    const width = Math.max(1, Math.round(period * (opts.pluckWidth ?? 1)));
    for (let i = 0; i < width; i++) buf[i] = rng.next() * 2 - 1;
  } else if (excitation === 'impulse') {
    buf[0] = 1;
    buf[1] = 0.6;
  } else {
    for (let i = 0; i < period && i < excitation.length; i++) buf[i] = excitation.data[i];
  }

  // Allpass state for dispersion.
  let apX = 0;
  let apY = 0;
  let prev = 0;
  let idx = 0;
  for (let i = 0; i < d.length; i++) {
    const cur = buf[idx];
    d[i] = cur;
    // Two-point average lowpass, weighted by brightness.
    const lp = cur * (1 - brightness * 0.5) + prev * (brightness * 0.5);
    let fed = lp * damping;
    if (dispersion !== 0) {
      const y = -dispersion * fed + apX + dispersion * apY;
      apX = fed;
      apY = y;
      fed = y;
    }
    buf[idx] = fed;
    prev = cur;
    idx = idx + 1 === period ? 0 : idx + 1;
  }
  return out;
}

/**
 * A casing bouncing: several Karplus-Strong hits at decreasing intervals and
 * amplitudes, each slightly detuned because the thing is tumbling. 2-3 bounces
 * is what the ear expects; more sounds like a bag of change.
 */
export function bounceSequence(
  seconds: number,
  sampleRate: number,
  freq: number,
  rng: Rng,
  bounces: number,
  opts: KarplusOptions = {},
): Signal {
  const out = new Signal(seconds, sampleRate);
  let time = 0;
  let amp = 1;
  let gap = rng.range(0.055, 0.085);
  for (let b = 0; b < bounces; b++) {
    const hit = karplusStrong(
      Math.min(0.42, seconds - time),
      sampleRate,
      freq * rng.range(0.94, 1.09),
      rng,
      opts,
    );
    hit.envelope((t) => Math.exp(-t / (0.09 * amp + 0.02)));
    out.add(hit, amp, time);
    time += gap;
    if (time >= seconds - 0.02) break;
    // Coefficient of restitution: each bounce is shorter and quieter.
    gap *= rng.range(0.5, 0.68);
    amp *= rng.range(0.4, 0.58);
  }
  return out;
}
