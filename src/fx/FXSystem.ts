import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class FXSystem implements System {
  readonly key = 'fx';
  readonly order = 70;

  init(_ctx: GameContext): void {}
}
