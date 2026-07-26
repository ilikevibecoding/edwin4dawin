import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class HUDSystem implements System {
  readonly key = 'hud';
  readonly order = 90;

  init(_ctx: GameContext): void {}
}
