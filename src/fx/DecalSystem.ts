import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class DecalSystem implements System {
  readonly key = 'decals';
  readonly order = 72;

  init(_ctx: GameContext): void {}
}
