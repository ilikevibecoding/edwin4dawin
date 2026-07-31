/**
 * Noise sources. Almost every sound in a shooter starts life as noise: a
 * gunshot is a shaped noise burst, so is an explosion, a footstep, a shell
 * casing's scrape and the wind. The spectral slope matters — white is too harsh
 * for anything organic, pink reads as "air", brown as "rumble".
 */
import { Rng } from '../../core/MathUtils';
import { Signal, type Samples } from './Signal';

/** Flat spectrum, uniform in [-1, 1]. */
export function whiteNoise(target: Signal, rng: Rng, gain = 1): Signal {
  const d = target.data;
  for (let i = 0; i < d.length; i++) d[i] += (rng.next() * 2 - 1) * gain;
  return target;
}

/**
 * -3 dB/octave, via Paul Kellet's economical filter bank. Normalised so the
 * output sits at roughly the same peak level as `whiteNoise`.
 */
export function pinkNoise(target: Signal, rng: Rng, gain = 1): Signal {
  const d = target.data;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = rng.next() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    d[i] += out * 0.11 * gain;
  }
  return target;
}

/** -6 dB/octave. A leaky integrator, DC-blocked so it cannot drift. */
export function brownNoise(target: Signal, rng: Rng, gain = 1): Signal {
  const d = target.data;
  let state = 0;
  for (let i = 0; i < d.length; i++) {
    const w = rng.next() * 2 - 1;
    state = (state + 0.02 * w) * 0.998;
    d[i] += state * 14 * gain;
  }
  return target;
}

/**
 * Sparse impulses — the raw material for crackle, gravel and debris. `density`
 * is expected impulses per second; amplitudes follow a power law so a few hits
 * stand out from the bed.
 */
export function crackleNoise(
  target: Signal,
  rng: Rng,
  density: number,
  gain = 1,
  decayShape = 2.5,
): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const probability = Math.min(0.9, density / sr);
  for (let i = 0; i < d.length; i++) {
    if (rng.next() < probability) {
      const amp = Math.pow(rng.next(), decayShape) * gain * rng.sign();
      d[i] += amp;
    }
  }
  return target;
}

/** Velvet noise: sparse ±1 impulses at a fixed rate. Good reverb excitation. */
export function velvetNoise(target: Signal, rng: Rng, density: number, gain = 1): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const period = Math.max(1, Math.round(sr / Math.max(1, density)));
  for (let base = 0; base < d.length; base += period) {
    const i = base + rng.int(0, period - 1);
    if (i < d.length) d[i] += rng.sign() * gain;
  }
  return target;
}

const noiseCache = new Map<string, Samples>();

/**
 * Long shared noise beds, generated once and reused. Ambience layers and the
 * jet bed all read from these instead of each allocating megabytes of samples.
 */
export function sharedNoise(
  kind: 'white' | 'pink' | 'brown',
  seconds: number,
  sampleRate: number,
  seed: number,
): Signal {
  const key = `${kind}:${seconds}:${sampleRate}:${seed}`;
  const cached = noiseCache.get(key);
  if (cached) return Signal.wrap(cached, sampleRate);
  const s = new Signal(seconds, sampleRate);
  const rng = new Rng(seed);
  if (kind === 'white') whiteNoise(s, rng);
  else if (kind === 'pink') pinkNoise(s, rng);
  else brownNoise(s, rng);
  s.normalize(0.95);
  noiseCache.set(key, s.data);
  return s;
}

export function clearNoiseCache(): void {
  noiseCache.clear();
}

/** A fresh noise burst of `seconds`, spectrum picked by `kind`. */
export function noiseBurst(
  seconds: number,
  sampleRate: number,
  rng: Rng,
  kind: 'white' | 'pink' | 'brown' = 'white',
): Signal {
  const s = new Signal(seconds, sampleRate);
  if (kind === 'white') whiteNoise(s, rng);
  else if (kind === 'pink') pinkNoise(s, rng);
  else brownNoise(s, rng);
  return s;
}
