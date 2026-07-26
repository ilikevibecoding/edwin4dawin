/**
 * Deterministic browser testing interface. Owner: Opus 4.
 *
 * Exposes `window.render_game_to_text()` and `window.advanceTime(ms)` plus the `window.__ns`
 * automation surface (synthetic input, QA commands). None of this changes simulation behaviour;
 * `advanceTime` pushes milliseconds through exactly the same accumulator the RAF loop uses.
 */
import type { Game } from '../core/Game';

export function installTestHooks(game: Game): void {
  const w = window as unknown as Record<string, unknown>;
  w.advanceTime = (ms: number) => game.advanceTime(ms);
  w.render_game_to_text = () => game.renderGameToText();
  w.__ns = game.automation();
  w.__northstarGame = game;
  w.__northstarReady = true;
}
