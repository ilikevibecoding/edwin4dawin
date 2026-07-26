import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class KillstreakSystem implements System {
  readonly key = 'killstreaks';
  readonly order = 75;

  init(_ctx: GameContext): void {}
}
