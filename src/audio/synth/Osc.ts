/**
 * Oscillators, pitch sweeps and a single FM operator.
 *
 * All phase-accumulating so frequency can change per sample; that is the point
 * of having them here rather than using `OscillatorNode`. An explosion's sub is
 * a sine falling from 80 Hz to 25 Hz, and a ricochet is a tone falling two
 * octaves in 200 ms — both need per-sample frequency control.
 */
import type { Env } from './Envelope';
import { Signal } from './Signal';

export type Waveform = 'sine' | 'triangle' | 'saw' | 'square';

const TAU = Math.PI * 2;

function shape(kind: Waveform, phase: number): number {
  switch (kind) {
    case 'sine':
      return Math.sin(phase);
    case 'triangle': {
      const p = phase / TAU - Math.floor(phase / TAU);
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    }
    case 'saw': {
      const p = phase / TAU - Math.floor(phase / TAU);
      return 2 * p - 1;
    }
    case 'square': {
      const p = phase / TAU - Math.floor(phase / TAU);
      return p < 0.5 ? 1 : -1;
    }
  }
}

/** Add a fixed-frequency tone. */
export function tone(
  target: Signal,
  freq: number,
  gain: number,
  kind: Waveform = 'sine',
  phase0 = 0,
  env?: Env,
): Signal {
  const d = target.data;
  const inc = (TAU * freq) / target.sampleRate;
  const inv = 1 / target.sampleRate;
  let phase = phase0;
  for (let i = 0; i < d.length; i++) {
    const a = env ? env(i * inv) : 1;
    d[i] += shape(kind, phase) * gain * a;
    phase += inc;
  }
  return target;
}

export interface SweepShape {
  /** 'exp' is right for anything that reads as pitch; 'lin' for beat effects. */
  mode?: 'exp' | 'lin';
  curve?: (t: number) => number;
}

/**
 * Add a tone whose frequency glides from `startHz` to `endHz` over the whole
 * buffer (or over `seconds` if given, holding `endHz` afterwards).
 */
export function sweepTone(
  target: Signal,
  startHz: number,
  endHz: number,
  gain: number,
  opts: SweepShape & { kind?: Waveform; seconds?: number; env?: Env; phase0?: number } = {},
): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const kind = opts.kind ?? 'sine';
  const mode = opts.mode ?? 'exp';
  const curve = opts.curve ?? ((t) => t);
  const env = opts.env;
  const span = Math.max(1, Math.round((opts.seconds ?? target.duration) * sr));
  const logStart = Math.log(Math.max(1e-3, startHz));
  const logEnd = Math.log(Math.max(1e-3, endHz));
  const inv = 1 / sr;
  let phase = opts.phase0 ?? 0;

  for (let i = 0; i < d.length; i++) {
    const t = curve(Math.min(1, i / span));
    const f =
      mode === 'exp'
        ? Math.exp(logStart + (logEnd - logStart) * t)
        : startHz + (endHz - startHz) * t;
    const a = env ? env(i * inv) : 1;
    d[i] += shape(kind, phase) * gain * a;
    phase += (TAU * f) * inv;
  }
  return target;
}

/** Tone with frequency supplied by an arbitrary function of time in seconds. */
export function contourTone(
  target: Signal,
  freqAt: (t: number) => number,
  gain: number,
  kind: Waveform = 'sine',
  env?: Env,
): Signal {
  const d = target.data;
  const inv = 1 / target.sampleRate;
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i * inv;
    const a = env ? env(t) : 1;
    d[i] += shape(kind, phase) * gain * a;
    phase += TAU * Math.max(0, freqAt(t)) * inv;
  }
  return target;
}

/**
 * Two-operator FM. A modulation index above ~3 goes metallic and inharmonic,
 * which is exactly what a bolt carrier or a distant klaxon wants; below 1 it
 * just adds bite to the carrier.
 */
export function fmTone(
  target: Signal,
  carrierHz: number,
  ratio: number,
  index: number,
  gain: number,
  env?: Env,
  indexEnv?: Env,
): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const inv = 1 / sr;
  const cInc = (TAU * carrierHz) * inv;
  const mInc = (TAU * carrierHz * ratio) * inv;
  let cPhase = 0;
  let mPhase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i * inv;
    const idx = index * (indexEnv ? indexEnv(t) : 1);
    const a = env ? env(t) : 1;
    d[i] += Math.sin(cPhase + idx * Math.sin(mPhase)) * gain * a;
    cPhase += cInc;
    mPhase += mInc;
  }
  return target;
}

/** Detuned stack of saws, for the music drone. Slight spread reads as "big". */
export function superSaw(
  target: Signal,
  freq: number,
  voices: number,
  detuneCents: number,
  gain: number,
  env?: Env,
): Signal {
  const d = target.data;
  const inv = 1 / target.sampleRate;
  const phases = new Float64Array(voices);
  const incs = new Float64Array(voices);
  for (let v = 0; v < voices; v++) {
    const spread = voices === 1 ? 0 : (v / (voices - 1)) * 2 - 1;
    incs[v] = TAU * freq * Math.pow(2, (spread * detuneCents) / 1200) * inv;
    phases[v] = (v * 0.618) % 1 * TAU;
  }
  const norm = gain / Math.sqrt(voices);
  for (let i = 0; i < d.length; i++) {
    const a = env ? env(i * inv) : 1;
    let sum = 0;
    for (let v = 0; v < voices; v++) {
      const p = phases[v] / TAU;
      sum += 2 * (p - Math.floor(p)) - 1;
      phases[v] += incs[v];
    }
    d[i] += sum * norm * a;
  }
  return target;
}

/** Read a source buffer back at a varying rate: pitch bends and Doppler. */
export function resample(
  target: Signal,
  source: Signal,
  rateAt: (t: number) => number,
  gain = 1,
): Signal {
  const d = target.data;
  const inv = 1 / target.sampleRate;
  let pos = 0;
  for (let i = 0; i < d.length; i++) {
    d[i] += source.sampleAt(pos) * gain;
    pos += Math.max(0.01, rateAt(i * inv));
    if (pos >= source.length - 1) pos -= source.length - 1;
  }
  return target;
}

/** Harmonic stack with per-partial gain, for mains hum and tonal drones. */
export function harmonics(
  target: Signal,
  fundamental: number,
  partials: readonly number[],
  gain: number,
  env?: Env,
): Signal {
  for (let h = 0; h < partials.length; h++) {
    const amp = partials[h];
    if (amp === 0) continue;
    tone(target, fundamental * (h + 1), gain * amp, 'sine', (h * 1.7) % TAU, env);
  }
  return target;
}
