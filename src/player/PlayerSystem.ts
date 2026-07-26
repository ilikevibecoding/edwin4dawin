import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class PlayerSystem implements System {
  readonly key = 'player';
  readonly order = 40;

  init(_ctx: GameContext): void {}
}
