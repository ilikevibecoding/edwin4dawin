/**
 * The contract between sound design and the mixer.
 *
 * A `SoundSpec` is a recipe plus the mix decisions that go with it: which bus,
 * how loud relative to everything else, how it falls off with distance, how
 * much reverb it feeds, and how many pre-rendered variants are needed before
 * repetition becomes audible.
 *
 * Buffers are normalised to near full scale so the float samples carry maximum
 * precision; the authored loudness lives in `gain`, applied on the voice.
 */
import type { Rng } from '../../core/MathUtils';
import type { RenderedSound } from '../synth';

export type BusId = 'sfx' | 'weapons' | 'ui' | 'music' | 'ambience';

export interface RenderArgs {
  readonly sampleRate: number;
  readonly rng: Rng;
  /** 0-based index of the variant being rendered. */
  readonly variant: number;
}

export interface SoundSpec {
  readonly id: string;
  readonly bus: BusId;
  /**
   * 0..1. Drives voice stealing, whether the voice is worth an HRTF panner, and
   * whether it earns an occlusion raycast. A gunshot is 1, a shell casing 0.2.
   */
  readonly priority: number;
  /** Linear gain applied at playback, on top of the caller's `volume`. */
  readonly gain: number;
  /** Metres at which attenuation begins. */
  readonly refDistance: number;
  readonly maxDistance: number;
  readonly rolloff: number;
  /** Random detune per playback, in semitones (+/-). */
  readonly pitchJitter: number;
  /** Distinct pre-rendered takes. */
  readonly variants: number;
  /** Reverb send level, 0..1. */
  readonly send: number;
  /** Loops until explicitly stopped (ambience beds, engines). */
  readonly loop: boolean;
  /**
   * Air-absorption strength multiplier. 1 is the physical default; a sub-heavy
   * explosion uses less because low frequencies carry, a tick uses more.
   */
  readonly airScale: number;
  /**
   * Delay playback by `distance / c`. Opt-in rather than automatic because the
   * killstreak module already schedules its own wavefront arrivals for fast
   * movers, and applying it twice would put the jet's roar a second late.
   */
  readonly propagate: boolean;
  readonly render: (args: RenderArgs) => RenderedSound;
}

export type SoundOverrides = Partial<Omit<SoundSpec, 'id' | 'render'>>;

const DEFAULTS = {
  bus: 'sfx' as BusId,
  priority: 0.5,
  gain: 1,
  refDistance: 4,
  maxDistance: 120,
  rolloff: 1.1,
  pitchJitter: 0,
  variants: 2,
  send: 0.35,
  loop: false,
  airScale: 1,
  propagate: false,
};

export function defineSound(
  id: string,
  render: (args: RenderArgs) => RenderedSound,
  overrides: SoundOverrides = {},
): SoundSpec {
  return { ...DEFAULTS, ...overrides, id, render };
}

/** Registration helper used by every design module. */
export type Registrar = (spec: SoundSpec) => void;
