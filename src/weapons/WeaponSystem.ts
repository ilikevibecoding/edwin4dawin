import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class WeaponSystem implements System {
  readonly key = 'weapons';
  readonly order = 50;

  init(_ctx: GameContext): void {}
}
