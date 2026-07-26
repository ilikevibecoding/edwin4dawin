/**
 * Reverb — procedurally generated impulse responses for `ConvolverNode`s.
 *
 * Each IR is synthesized as a bed of exponentially-decaying, band-limited noise
 * (the diffuse late field) with a set of discrete early-reflection taps modelled
 * on top. No files are loaded. The AudioEngine blends between an "open" and an
 * "enclosed" preset with its `setIndoor(0..1)` control.
 */
import { mulberry32, fillNoise, type Rng } from './SynthLab';

export type ReverbPreset =
  | 'outdoor_open'
  | 'street_canyon'
  | 'small_room'
  | 'large_hall'
  | 'tunnel';

interface Tap {
  /** Delay in seconds. */
  t: number;
  /** Linear gain. */
  g: number;
}

interface ReverbSpec {
  /** Total IR length in seconds. */
  duration: number;
  /** Diffuse decay time constant (bigger = longer tail). */
  decay: number;
  /** Pre-delay before the diffuse field builds, seconds. */
  preDelay: number;
  /** One-pole lowpass coefficient applied to the tail (0..1, higher = darker). */
  damp: number;
  /** Highpass amount to thin out rumble (0..1). */
  thin: number;
  /** Discrete early reflections. */
  taps: Tap[];
  /** Overall wet level baked into the IR. */
  level: number;
  /** Stereo decorrelation strength (0..1). */
  width: number;
}

const SPECS: Record<ReverbPreset, ReverbSpec> = {
  outdoor_open: {
    duration: 1.1,
    decay: 0.28,
    preDelay: 0.008,
    damp: 0.32,
    thin: 0.5,
    level: 0.5,
    width: 0.9,
    // Sparse, distant slap-backs off far buildings/terrain.
    taps: [
      { t: 0.03, g: 0.35 },
      { t: 0.075, g: 0.24 },
      { t: 0.14, g: 0.16 },
      { t: 0.23, g: 0.1 },
      { t: 0.38, g: 0.06 },
    ],
  },
  street_canyon: {
    duration: 1.6,
    decay: 0.42,
    preDelay: 0.006,
    damp: 0.28,
    thin: 0.35,
    level: 0.7,
    width: 0.8,
    // Dense parallel-wall flutter echoes.
    taps: [
      { t: 0.011, g: 0.5 },
      { t: 0.023, g: 0.42 },
      { t: 0.037, g: 0.34 },
      { t: 0.058, g: 0.28 },
      { t: 0.09, g: 0.22 },
      { t: 0.13, g: 0.16 },
      { t: 0.19, g: 0.11 },
      { t: 0.27, g: 0.07 },
    ],
  },
  small_room: {
    duration: 0.55,
    decay: 0.12,
    preDelay: 0.003,
    damp: 0.45,
    thin: 0.25,
    level: 0.85,
    width: 0.6,
    taps: [
      { t: 0.006, g: 0.6 },
      { t: 0.013, g: 0.48 },
      { t: 0.021, g: 0.38 },
      { t: 0.032, g: 0.28 },
      { t: 0.047, g: 0.18 },
    ],
  },
  large_hall: {
    duration: 2.8,
    decay: 0.8,
    preDelay: 0.02,
    damp: 0.5,
    thin: 0.3,
    level: 0.8,
    width: 0.95,
    taps: [
      { t: 0.02, g: 0.4 },
      { t: 0.045, g: 0.34 },
      { t: 0.08, g: 0.27 },
      { t: 0.12, g: 0.22 },
      { t: 0.18, g: 0.16 },
      { t: 0.26, g: 0.11 },
      { t: 0.36, g: 0.07 },
    ],
  },
  tunnel: {
    duration: 2.2,
    decay: 0.62,
    preDelay: 0.004,
    damp: 0.6,
    thin: 0.15,
    level: 0.9,
    width: 0.5,
    // Strong, regular flutter — the "pipe" ring.
    taps: [
      { t: 0.009, g: 0.6 },
      { t: 0.018, g: 0.54 },
      { t: 0.027, g: 0.47 },
      { t: 0.036, g: 0.4 },
      { t: 0.048, g: 0.33 },
      { t: 0.064, g: 0.26 },
      { t: 0.086, g: 0.2 },
      { t: 0.12, g: 0.14 },
      { t: 0.17, g: 0.09 },
    ],
  },
};

export const REVERB_PRESETS = Object.keys(SPECS) as ReverbPreset[];

function renderChannel(spec: ReverbSpec, sr: number, len: number, rng: Rng, phase: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(len);
  const noise = new Float32Array(len);
  fillNoise(noise, 'white', rng);

  const preDelaySamp = Math.floor(spec.preDelay * sr);
  const tau = spec.decay * sr;

  // Diffuse exponentially-decaying noise field.
  for (let i = preDelaySamp; i < len; i++) {
    const env = Math.exp(-(i - preDelaySamp) / tau);
    out[i] = noise[i] * env;
  }

  // Early reflections as discrete taps (slightly decorrelated per channel).
  for (const tap of spec.taps) {
    const jitter = 1 + phase * 0.06;
    const idx = Math.floor(tap.t * jitter * sr) + preDelaySamp;
    if (idx < len) out[idx] += tap.g * (phase >= 0 ? 1 : -1) * 0.9 + out[idx] * 0.1;
  }

  // One-pole lowpass (damping) + gentle highpass (thinning) in one pass.
  let lp = 0;
  let hpPrev = 0;
  let hpOut = 0;
  const d = spec.damp;
  const hpCoeff = 1 - spec.thin * 0.02;
  for (let i = 0; i < len; i++) {
    lp = lp * d + out[i] * (1 - d);
    hpOut = hpCoeff * (hpOut + lp - hpPrev);
    hpPrev = lp;
    out[i] = hpOut * spec.level;
  }

  return out;
}

export class Reverb {
  static readonly presets = REVERB_PRESETS;

  /**
   * Render a stereo impulse response for `preset` into a buffer owned by `ctx`.
   * Deterministic given `seed` so results are stable across runs.
   */
  static render(ctx: BaseAudioContext, preset: ReverbPreset, seed = 1): AudioBuffer {
    const spec = SPECS[preset];
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(spec.duration * sr));
    const buffer = ctx.createBuffer(2, len, sr);
    // Decorrelated left/right for width; a mono-ish tunnel keeps them closer.
    const rngL = mulberry32(seed * 2654435761);
    const rngR = mulberry32(seed * 40503 + 12345);
    const left = renderChannel(spec, sr, len, rngL, spec.width);
    const right = renderChannel(spec, sr, len, rngR, -spec.width);
    buffer.copyToChannel(left, 0);
    buffer.copyToChannel(right, 1);
    return buffer;
  }
}
