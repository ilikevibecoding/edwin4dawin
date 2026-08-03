import { clamp01, ramp } from '../core/math';
import { PROLOGUE_DURATION } from './chapters/prologue';
import { TATOOINE_START } from './chapters/tatooine';

/**
 * Continuous world state that outlives any single chapter.
 *
 * The star dome is behind every exterior shot, so it cannot be owned by the
 * chapter that happens to be active: a seek only evaluates the chapter it lands
 * in, and the field would keep whatever brightness the previous chapter wrote.
 * Expressing it as a pure function of absolute timeline seconds makes every
 * seek land on the sky the linear playthrough would have shown.
 */
export function starOpacityAt(t: number): number {
  // Curtain up: nothing at all for the first beat of the prologue.
  const rise = clamp01((t - 2.5) / 7) * 0.95;
  if (t < PROLOGUE_DURATION) return rise;
  // Once the planet is lit it washes out the faintest stars a little.
  const planetWash = 0.25 * ramp(t, TATOOINE_START + 18, TATOOINE_START + 30);
  return clamp01(0.95 - planetWash);
}
