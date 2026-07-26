import type { GameContext, System } from '../core/GameContext';

/** Placeholder. Replaced by the full implementation. */
export default class AudioSystem implements System {
  readonly key = 'audio';
  readonly order = 80;

  init(_ctx: GameContext): void {}
}
