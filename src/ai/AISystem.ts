import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class AISystem implements System {
  readonly key = 'ai';
  readonly order = 60;

  init(_ctx: GameContext): void {}
}
