import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class GameDirector implements System {
  readonly key = 'director';
  readonly order = 95;

  init(_ctx: GameContext): void {}
}
