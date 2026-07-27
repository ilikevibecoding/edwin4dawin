import { perlin2, TAU } from '../../core/MathUtils';

/**
 * Layered low-frequency noise for idle sway.
 *
 * Pure sine sway reads as mechanical because the period is obvious after two
 * seconds. Three Perlin octaves at irrational frequency ratios never visibly
 * repeat, and because Perlin is C1 continuous the derivative — which is what the
 * eye actually reads as "drift" — stays smooth.
 */
export class SwayNoise {
  private readonly seed: number;

  constructor(seed = 0) {
    this.seed = seed * 13.731 + 4.129;
  }

  /** Roughly [-1, 1]. `channel` decorrelates axes without extra state. */
  sample(t: number, channel: number, frequency = 1): number {
    const y = this.seed + channel * 37.17;
    return (
      perlin2(t * frequency, y) * 0.62 +
      perlin2(t * frequency * 2.31 + 11.3, y * 1.7) * 0.26 +
      perlin2(t * frequency * 4.77 + 23.9, y * 2.9) * 0.12
    );
  }

  /** Breathing: a slow cycle with a held pause at the top of the inhale. */
  breath(t: number, frequency: number): number {
    const phase = (t * frequency) % 1;
    const s = Math.sin(phase * TAU);
    return s * (0.72 + 0.28 * Math.abs(s));
  }
}
