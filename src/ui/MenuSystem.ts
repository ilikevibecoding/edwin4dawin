import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class MenuSystem implements System {
  readonly key = 'menu';
  readonly order = 92;

  init(_ctx: GameContext): void {}
}
