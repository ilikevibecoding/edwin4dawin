/**
 * Vocal synthesis — source/filter model.
 *
 * Grunts, pain, death rattles and radio chatter are all built here rather than
 * sampled, because there are no audio files in this project. The model is the
 * classic one: a glottal source (a jittered pulse train plus aspiration noise)
 * driving a vocal tract approximated by three or four formant resonances, with
 * a 6 dB/octave lip-radiation tilt on the output.
 *
 * It will never be mistaken for a recording of a person, and it does not need to
 * be. What it does reliably produce is a *human-shaped* noise: an urgent shout,
 * a grunt of effort, a wet exhale, band-limited squad chatter. That reads
 * correctly at the level these sit in the mix, which is well under gunfire.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  Biquad,
  adExp,
  bandpass,
  compress,
  formants,
  highpass,
  lowpass,
  lowpass24,
  noiseBurst,
  saturate,
  softClip,
  whiteNoise,
  type Formant,
} from '../synth';

export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u' | 'uh' | 'ah';

/** F1/F2/F3 in Hz for an adult male tract. */
const VOWELS: Record<Vowel, [number, number, number]> = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  i: [270, 2290, 3010],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
  uh: [640, 1190, 2390],
  ah: [850, 1220, 2810],
};

export interface VoicePrint {
  /** Mean fundamental, Hz. 95-115 is a deep male voice, 140+ is lighter. */
  f0: number;
  /** Tract length scale; below 1 is a larger head, above is smaller. */
  tract: number;
  /** Cycle-to-cycle pitch instability, 0..1. Stress raises it. */
  jitter: number;
  /** Breathiness — how much aspiration rides the voiced source. */
  breath: number;
}

export const DEFAULT_VOICE: VoicePrint = { f0: 108, tract: 1, jitter: 0.03, breath: 0.35 };

/**
 * Glottal source. Each period is a smoothed asymmetric pulse — a decent stand-in
 * for the Liljencrants-Fant model at a fraction of the cost — with per-period
 * jitter so it never sounds like a synthesiser sawtooth.
 */
function glottal(
  target: Signal,
  f0At: (t: number) => number,
  print: VoicePrint,
  rng: Rng,
): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const inv = 1 / sr;
  let phase = 0;
  let period = sr / Math.max(40, f0At(0));
  let jitterMul = 1;

  for (let i = 0; i < d.length; i++) {
    if (phase >= period) {
      phase -= period;
      jitterMul = 1 + rng.gaussian(0, print.jitter);
      period = sr / Math.max(40, f0At(i * inv) * Math.max(0.6, jitterMul));
    }
    const x = phase / period;
    // Open phase: a rising then sharply falling pulse. The discontinuity at
    // closure is what supplies the harmonic energy the formants need.
    let v: number;
    if (x < 0.62) {
      const u = x / 0.62;
      v = Math.sin(Math.PI * u) * (0.35 + 0.65 * u);
    } else {
      const u = (x - 0.62) / 0.38;
      v = -Math.pow(1 - u, 1.6) * 1.15;
    }
    d[i] += v;
    phase += 1;
  }
  return target;
}

function tractFormants(vowel: Vowel, print: VoicePrint, rng: Rng): Formant[] {
  const [f1, f2, f3] = VOWELS[vowel];
  const s = print.tract * rng.range(0.96, 1.04);
  return [
    { freq: f1 * s, q: 7, gainDb: 17 },
    { freq: f2 * s, q: 9, gainDb: 13 },
    { freq: f3 * s, q: 11, gainDb: 8 },
    // A weak fourth formant fills the 3-4 kHz gap that otherwise reads as a
    // bandpass filter rather than as a throat.
    { freq: 3400 * s, q: 12, gainDb: 4 },
  ];
}

export interface SyllableOptions {
  vowel: Vowel;
  seconds: number;
  /** Pitch multiplier at the start and end of the syllable. */
  pitchFrom: number;
  pitchTo: number;
  /** 0..1. Raises jitter, adds effort noise and pushes the source into clipping. */
  effort: number;
  /** Noise burst at the onset: a plosive or fricative attack. */
  onset?: 'none' | 'plosive' | 'fricative';
  attack?: number;
  release?: number;
}

/** One voiced syllable. */
export function syllable(
  sr: number,
  rng: Rng,
  print: VoicePrint,
  opts: SyllableOptions,
): Signal {
  const out = new Signal(opts.seconds, sr);
  const jitterPrint: VoicePrint = {
    ...print,
    jitter: print.jitter * (1 + opts.effort * 2.5),
  };
  const logFrom = Math.log(print.f0 * opts.pitchFrom);
  const logTo = Math.log(print.f0 * opts.pitchTo);
  glottal(
    out,
    (t) => {
      const x = Math.min(1, t / opts.seconds);
      return Math.exp(logFrom + (logTo - logFrom) * Math.pow(x, 0.8));
    },
    jitterPrint,
    rng,
  );

  // Aspiration and effort noise, mixed into the source before the tract so it
  // is coloured by the same formants.
  const aspiration = new Signal(opts.seconds, sr);
  whiteNoise(aspiration, rng);
  lowpass(aspiration, 4200);
  out.add(aspiration, (print.breath + opts.effort * 0.5) * 0.28);

  if (opts.effort > 0.4) saturate(out, 1 + opts.effort * 2.5);
  formants(out, tractFormants(opts.vowel, print, rng));
  // Source spectral tilt. The pulse closes with a discontinuity, so on its own
  // it falls at only 6 dB/octave and the formant peaks — which can only boost —
  // leave everything above F4 at full level. A real voice is far darker than
  // that; without this the babble reads as filtered hiss with a pitch in it.
  lowpass24(out, 3600 * print.tract, 0.6);
  // Lip radiation: differentiating tilt.
  highpass(out, 110, 0.6);

  const attack = opts.attack ?? 0.012 + 0.02 * (1 - opts.effort);
  const release = opts.release ?? opts.seconds * 0.45;
  out.envelope((t) => {
    const a = Math.min(1, t / attack);
    const r = Math.min(1, Math.max(0, opts.seconds - t) / release);
    return Math.pow(a, 1.4) * Math.pow(r, 0.9);
  });

  if (opts.onset === 'plosive') {
    const burst = noiseBurst(0.02, sr, rng);
    bandpass(burst, rng.range(1400, 3200), 0.8);
    burst.envelope(adExp(0.0004, 0.004));
    out.add(burst, 0.35 + 0.3 * opts.effort);
  } else if (opts.onset === 'fricative') {
    const fric = noiseBurst(0.06, sr, rng);
    bandpass(fric, rng.range(2600, 4600), 1.1);
    fric.envelope(adExp(0.008, 0.02));
    out.add(fric, 0.2 + 0.15 * opts.effort);
  }

  out.normalize(0.95);
  return out;
}

export type Contour = 'flat' | 'rising' | 'falling' | 'shout' | 'fade';

const CONTOURS: Record<Contour, (i: number, n: number) => [number, number]> = {
  flat: () => [1, 1],
  rising: (i, n) => [1 + i * 0.07, 1.06 + i * 0.08 + (i === n - 1 ? 0.18 : 0)],
  falling: (i, n) => [1.18 - i * 0.08, 1.1 - i * 0.1 - (i === n - 1 ? 0.14 : 0)],
  shout: (i, n) => [1.28 - i * 0.04, 1.3 - i * 0.06 - (i === n - 1 ? 0.22 : 0)],
  fade: (i, n) => [1 - i * 0.06, 0.94 - i * 0.09 - (i === n - 1 ? 0.2 : 0)],
};

const SPEECH_VOWELS: readonly Vowel[] = ['a', 'e', 'i', 'o', 'u', 'uh', 'ah'];

export interface UtteranceOptions {
  syllables: number;
  contour: Contour;
  effort: number;
  /** Seconds per syllable, before random variation. */
  pace?: number;
  print?: VoicePrint;
}

/**
 * A short phrase of formant babble with a plausible speech rhythm and
 * intonation. Used for every AI bark and radio callout: the listener reads
 * urgency, direction and who is speaking without any words being involved.
 */
export function utterance(sr: number, rng: Rng, opts: UtteranceOptions): Signal {
  const print = opts.print ?? DEFAULT_VOICE;
  const pace = opts.pace ?? 0.16;
  const contour = CONTOURS[opts.contour];
  const total = opts.syllables * pace * 1.35 + 0.12;
  const out = new Signal(total, sr);

  let at = 0.01;
  for (let i = 0; i < opts.syllables; i++) {
    const [pitchFrom, pitchTo] = contour(i, opts.syllables);
    const seconds = pace * rng.range(0.7, 1.25);
    const s = syllable(sr, rng, print, {
      vowel: rng.pick(SPEECH_VOWELS),
      seconds,
      pitchFrom: pitchFrom * rng.range(0.97, 1.03),
      pitchTo: pitchTo * rng.range(0.97, 1.03),
      effort: opts.effort,
      onset: i === 0 || rng.bool(0.55) ? 'plosive' : rng.bool(0.4) ? 'fricative' : 'none',
    });
    // Syllables overlap slightly, which is what stops babble sounding like a
    // list of separate grunts.
    out.add(s, 1 / Math.sqrt(1 + i * 0.15), at);
    at += seconds * rng.range(0.72, 0.95);
  }

  compress(out, -22, 3.5, 3, 90, 5);
  softClip(out, 0.86);
  out.removeDc().normalize(0.94);
  return out;
}

/** A wordless pain or effort grunt. */
export function grunt(
  sr: number,
  rng: Rng,
  severity: number,
  print: VoicePrint = DEFAULT_VOICE,
): Signal {
  const seconds = 0.18 + severity * 0.28;
  const out = syllable(sr, rng, print, {
    vowel: severity > 0.6 ? 'ah' : rng.pick(['uh', 'a', 'o'] as const),
    seconds,
    pitchFrom: 1.05 + severity * 0.35,
    pitchTo: 0.78 - severity * 0.1,
    effort: 0.45 + severity * 0.5,
    onset: 'plosive',
    attack: 0.006,
    release: seconds * 0.55,
  });
  // Air being forced out around the voice.
  const air = new Signal(seconds, sr);
  whiteNoise(air, rng);
  bandpass(air, 1400, 1.1);
  lowpass(air, 3800, 0.7);
  air.envelope(adExp(0.008, seconds * 0.3));
  out.add(air, 0.16 + severity * 0.2);
  out.normalize(0.95);
  return out;
}

/**
 * Breathing. `intensity` 0..1 moves it from a resting nasal breath to a ragged
 * open-mouthed gasp, which is the cue for "you are about to die".
 */
export function breath(
  sr: number,
  rng: Rng,
  inhale: boolean,
  intensity: number,
  print: VoicePrint = DEFAULT_VOICE,
): Signal {
  const seconds = inhale ? 0.34 - intensity * 0.12 : 0.42 - intensity * 0.14;
  const out = new Signal(seconds, sr);
  whiteNoise(out, rng);
  // The tract still colours a breath; that is why it is recognisably a person.
  formants(out, [
    { freq: 520 * print.tract, q: 3.5, gainDb: 9 + intensity * 4 },
    { freq: 1250 * print.tract, q: 4, gainDb: 6 },
    { freq: 2600 * print.tract, q: 5, gainDb: 3 - intensity * 3 },
  ]);
  new Biquad('highpass', inhale ? 380 : 260, 0.7, sr).run(out);
  new Biquad('lowpass', 4200 + intensity * 2600, 0.7, sr).run(out);
  out.envelope((t) => {
    const x = Math.min(1, t / seconds);
    // Inhale swells to the end, exhale peaks early and trails.
    const shape = inhale ? Math.pow(x, 1.5) * (1 - Math.pow(x, 6)) : Math.pow(1 - x, 1.2) * Math.min(1, x / 0.12);
    return shape;
  });
  if (intensity > 0.45) {
    // Vocal fry creeping in: at high exertion the cords engage on the exhale.
    const voiced = syllable(sr, rng, { ...print, breath: 0.8 }, {
      vowel: 'uh',
      seconds: seconds * 0.7,
      pitchFrom: 0.9,
      pitchTo: 0.8,
      effort: intensity * 0.5,
      onset: 'none',
    });
    out.add(voiced, (intensity - 0.45) * 0.5);
  }
  out.normalize(0.9);
  return out;
}
