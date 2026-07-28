/**
 * Impulse-response synthesis for `ConvolverNode`.
 *
 * Reverb is the single strongest cue for where the player is standing, so these
 * are built properly rather than as "noise with a fade":
 *
 *  1. A predelay, from the distance to the nearest surface.
 *  2. Early reflections from the image-source method on a shoebox room. Discrete
 *     taps at physically-correct delays, attenuated by 1/distance and by wall
 *     absorption, with progressive high-frequency loss per bounce. These taps
 *     are what the ear uses to judge room size, and they are why a corridor and
 *     a hall with the same RT60 still sound completely different.
 *  3. A diffuse late field: noise with an independent RT60 per frequency band,
 *     because air and soft furnishings absorb treble far faster than bass.
 *
 * Left and right are generated from separate listener positions and separate
 * noise seeds so the result is decorrelated and reads as a space rather than as
 * a wide mono effect.
 */
import { Rng } from '../../core/MathUtils';
import { Biquad } from './Filters';
import { whiteNoise } from './Noise';
import { Signal, type RenderedSound } from './Signal';

const SPEED_OF_SOUND = 343;

export type SpaceId = 'small_room' | 'corridor' | 'large_hall' | 'outdoor' | 'tunnel';

export interface SpaceSpec {
  /** Room dimensions in metres: width, height, depth. */
  dims: [number, number, number];
  /** RT60 in seconds for low / mid / high bands. */
  rt60: [low: number, mid: number, high: number];
  /** Mean wall reflection coefficient, 0..1. */
  reflectivity: number;
  /** Predelay in seconds before the first reflection. */
  predelay: number;
  /** Level of the diffuse tail relative to the early reflections. */
  diffuse: number;
  /** Image-source reflection order to enumerate. */
  order: number;
  /** Extra sparse long slaps, for exteriors bouncing off distant facades. */
  slaps?: readonly [delaySeconds: number, gain: number][];
  /** Overall send level; a tunnel is far wetter than a street. */
  wetness: number;
}

export const SPACES: Record<SpaceId, SpaceSpec> = {
  // A 4 x 2.6 x 3.4 m room: apartment, shop back room, stairwell landing.
  small_room: {
    dims: [4.0, 2.6, 3.4],
    rt60: [0.42, 0.34, 0.2],
    reflectivity: 0.62,
    predelay: 0.004,
    diffuse: 0.55,
    order: 3,
    wetness: 0.4,
  },
  // Long and narrow: strong flutter between the side walls, little else.
  corridor: {
    dims: [2.2, 2.7, 18.0],
    rt60: [0.72, 0.6, 0.32],
    reflectivity: 0.72,
    predelay: 0.003,
    diffuse: 0.5,
    order: 3,
    wetness: 0.52,
  },
  // Market hall / warehouse: a real tail, and early reflections far enough out
  // to be heard as distinct slaps.
  large_hall: {
    dims: [19.0, 9.5, 15.0],
    rt60: [2.05, 1.62, 0.85],
    reflectivity: 0.78,
    predelay: 0.014,
    diffuse: 0.95,
    order: 2,
    wetness: 0.6,
  },
  // Outdoors: no enclosure, just slapback off facades across the street plus a
  // whisper of ground/air diffusion. Short, sparse, and mostly quiet.
  outdoor: {
    dims: [46.0, 60.0, 60.0],
    rt60: [0.55, 0.35, 0.16],
    reflectivity: 0.34,
    predelay: 0.03,
    diffuse: 0.3,
    order: 1,
    slaps: [
      [0.052, 0.4],
      [0.089, 0.29],
      [0.147, 0.2],
      [0.213, 0.13],
      [0.318, 0.07],
    ],
    wetness: 0.26,
  },
  // Underpass / culvert: hard, long, and dominated by low frequencies.
  tunnel: {
    dims: [5.0, 3.6, 40.0],
    rt60: [2.6, 2.0, 0.9],
    reflectivity: 0.88,
    predelay: 0.006,
    diffuse: 1.0,
    order: 2,
    wetness: 0.72,
  },
};

interface Tap {
  delay: number;
  gain: number;
  order: number;
}

/**
 * Image-source enumeration for a shoebox. Each image is the source mirrored an
 * integer number of times through the walls; its distance to the listener gives
 * the delay and the 1/r spreading loss, and the number of mirrorings gives the
 * absorption exponent.
 */
function imageSourceTaps(
  spec: SpaceSpec,
  source: [number, number, number],
  listener: [number, number, number],
  maxTaps: number,
): Tap[] {
  const [lx, ly, lz] = spec.dims;
  const taps: Tap[] = [];
  const order = spec.order;

  for (let mx = -order; mx <= order; mx++) {
    for (let my = -order; my <= order; my++) {
      for (let mz = -order; mz <= order; mz++) {
        for (let px = 0; px < 2; px++) {
          for (let py = 0; py < 2; py++) {
            for (let pz = 0; pz < 2; pz++) {
              const reflections =
                Math.abs(mx) + px + Math.abs(my) + py + Math.abs(mz) + pz;
              if (reflections === 0 || reflections > order + 1) continue;
              // Mirrored source coordinate for parity p and image index m.
              const sx = (px === 0 ? source[0] : -source[0]) + 2 * mx * lx;
              const sy = (py === 0 ? source[1] : -source[1]) + 2 * my * ly;
              const sz = (pz === 0 ? source[2] : -source[2]) + 2 * mz * lz;
              const dx = sx - listener[0];
              const dy = sy - listener[1];
              const dz = sz - listener[2];
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < 0.4) continue;
              const gain =
                (Math.pow(spec.reflectivity, reflections) * 1.2) / (1 + dist);
              if (gain < 0.0015) continue;
              taps.push({ delay: dist / SPEED_OF_SOUND, gain, order: reflections });
            }
          }
        }
      }
    }
  }

  taps.sort((a, b) => a.delay - b.delay);
  return taps.length > maxTaps ? taps.slice(0, maxTaps) : taps;
}

/** Per-band decaying noise, summed. Independent RT60 per band. */
function diffuseTail(seconds: number, sampleRate: number, spec: SpaceSpec, rng: Rng): Signal {
  const out = new Signal(seconds, sampleRate);
  const bands: [Biquad, number][] = [
    [new Biquad('lowpass', 260, 0.7071, sampleRate), spec.rt60[0]],
    [new Biquad('bandpass', 1100, 0.6, sampleRate), spec.rt60[1]],
    [new Biquad('highpass', 3200, 0.7071, sampleRate), spec.rt60[2]],
  ];
  const weights = [0.9, 1.0, 0.72];

  for (let b = 0; b < bands.length; b++) {
    const [filter, rt60] = bands[b];
    const band = new Signal(seconds, sampleRate);
    whiteNoise(band, rng);
    filter.run(band);
    const tau = Math.max(0.02, rt60) / 6.9078;
    // A short build-up rather than an instant onset: real diffusion takes time
    // to establish, and a hard-edged tail start reads as a synthetic effect.
    band.envelope((t) => {
      const build = Math.min(1, t / (0.012 + rt60 * 0.05));
      return build * Math.exp(-t / tau);
    });
    out.add(band, weights[b]);
  }
  return out;
}

/** One channel of an IR. `ear` offsets the virtual listener for decorrelation. */
function renderChannel(
  spec: SpaceSpec,
  sampleRate: number,
  seconds: number,
  seed: number,
  ear: number,
): Signal {
  const rng = new Rng(seed);
  const [lx, ly, lz] = spec.dims;
  const source: [number, number, number] = [lx * 0.34, ly * 0.45, lz * 0.28];
  const listener: [number, number, number] = [
    lx * 0.58 + ear * 0.09,
    ly * 0.46,
    lz * 0.62,
  ];

  const out = new Signal(seconds, sampleRate);
  const taps = imageSourceTaps(spec, source, listener, 220);

  // Bucket by reflection order so each bounce's high-frequency loss can be
  // applied with one filter pass instead of one per tap.
  const maxOrder = Math.max(1, spec.order + 1);
  const byOrder: Signal[] = [];
  for (let o = 0; o <= maxOrder; o++) byOrder.push(new Signal(seconds, sampleRate));

  for (const tap of taps) {
    const i = Math.round((tap.delay + spec.predelay) * sampleRate);
    if (i >= out.length - 2) continue;
    const bucket = byOrder[Math.min(maxOrder, tap.order)];
    // Alternate polarity and jitter the position by a sample: real surfaces are
    // not perfect mirrors and perfectly aligned taps comb-filter audibly.
    const sign = rng.bool(0.72) ? 1 : -1;
    bucket.data[i] += tap.gain * sign;
    bucket.data[i + 1] += tap.gain * sign * rng.range(0.15, 0.4);
  }

  for (let o = 1; o <= maxOrder; o++) {
    const cutoff = 16000 * Math.pow(0.62, o - 1);
    new Biquad('lowpass', cutoff, 0.7071, sampleRate).run(byOrder[o]);
    out.add(byOrder[o], 1);
  }

  for (const [delay, gain] of spec.slaps ?? []) {
    const i = Math.round(delay * sampleRate);
    if (i >= out.length - 64) continue;
    // A slap off a distant facade is a smeared, dull copy, not a click.
    const smear = new Signal(0.02, sampleRate);
    whiteNoise(smear, rng);
    smear.envelope((t) => Math.exp(-t / 0.0035));
    new Biquad('lowpass', 2600, 0.7071, sampleRate).run(smear);
    smear.normalize(1);
    out.add(smear, gain, delay);
  }

  const tail = diffuseTail(seconds, sampleRate, spec, rng);
  out.add(tail, spec.diffuse * 0.5, spec.predelay + 0.008);

  // Nothing below 40 Hz belongs in a reverb send; it only muddies the sub bus.
  new Biquad('highpass', 42, 0.7071, sampleRate).run(out);
  out.removeDc();
  return out;
}

/**
 * Build a stereo impulse response for `space`. Normalised to unit energy so
 * swapping spaces does not change the perceived send level, only the character.
 */
export function generateImpulseResponse(
  space: SpaceId,
  sampleRate: number,
  seed = 0x5eed,
): RenderedSound {
  const spec = SPACES[space];
  const seconds = Math.min(2.4, Math.max(0.25, spec.rt60[0] * 1.05 + spec.predelay + 0.06));
  const left = renderChannel(spec, sampleRate, seconds, seed, -1);
  const right = renderChannel(spec, sampleRate, seconds, seed ^ 0x9e37, 1);

  // Equal-energy normalisation: a convolution's loudness tracks the RMS of the
  // IR, not its peak, so normalising by peak would make the hall much louder
  // than the small room.
  let energy = 0;
  for (const ch of [left, right]) {
    for (let i = 0; i < ch.length; i++) energy += ch.data[i] * ch.data[i];
  }
  const rms = Math.sqrt(energy / (left.length * 2));
  const scale = rms > 1e-9 ? 0.055 / rms : 1;
  left.gain(scale);
  right.gain(scale);
  // A convolver can still overshoot on a transient; keep the IR itself sane.
  const peak = Math.max(left.peak(), right.peak());
  if (peak > 0.98) {
    left.gain(0.98 / peak);
    right.gain(0.98 / peak);
  }

  return { channels: [left.data, right.data], sampleRate };
}

/** Send level appropriate to a space, used when crossfading ambiences. */
export const spaceWetness = (space: SpaceId): number => SPACES[space].wetness;
