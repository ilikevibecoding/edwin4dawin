import { weaponSounds } from './weapons.js';
import { movementSounds } from './movement.js';
import { impactSounds, impactNameFor } from './impacts.js';
import { explosionSounds } from './explosions.js';
import { killstreakSounds } from './killstreak.js';
import { uiSounds } from './ui.js';
import { ambienceSounds } from './ambience.js';

/**
 * Registry of named sound builders.
 *
 * entry = {
 *   bus: 'weapons'|'world'|'ambience'|'ui'|'voice',
 *   gain: base level,
 *   spatial?: PannerNode options used when play() receives a position (false = never spatialize),
 *   minInterval?: seconds — rate limit for spammy sounds,
 *   persistent?: loop that is never stolen or swept (wind, jets),
 *   build(ctx, dest, o) → { end, stop(when), ...extras }
 * }
 */
export const SOUNDS = Object.freeze({
  ...weaponSounds,
  ...movementSounds,
  ...impactSounds,
  ...explosionSounds,
  ...killstreakSounds,
  ...uiSounds,
  ...ambienceSounds,
});

export { impactNameFor };
