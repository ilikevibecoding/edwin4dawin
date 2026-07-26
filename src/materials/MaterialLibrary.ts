import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class MaterialLibrary implements System {
  readonly key = 'materials';
  readonly order = 5;

  init(_ctx: GameContext): void {}
}
