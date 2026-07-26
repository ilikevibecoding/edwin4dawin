import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class PhysicsSystem implements System {
  readonly key = 'physics';
  readonly order = 25;

  init(_ctx: GameContext): void {}
}
