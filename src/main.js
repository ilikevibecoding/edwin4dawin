import { Game } from './core/game.js';
import { installTestHooks } from './core/testing.js';
import { bus, EV } from './core/events.js';

/**
 * Entry point.
 * Owner: Opus 1.
 *
 * Start with a single documented command:  npm start
 * Then open http://127.0.0.1:5173/
 */

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

function fatal(err) {
  console.error('[northstar] fatal startup error', err);
  const el = document.createElement('div');
  el.className = 'ns-fatal';
  el.innerHTML = `<h1>Northstar Rescue failed to start</h1><pre>${String(err?.stack ?? err)}</pre>`;
  uiRoot?.appendChild(el);
}

async function main() {
  if (!canvas) throw new Error('missing #game-canvas');
  const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
  if (!gl) {
    fatal(new Error('WebGL2 is required. Enable hardware acceleration or use a Chromium-based browser.'));
    return;
  }

  const game = new Game(canvas, uiRoot);
  installTestHooks(game);

  // Unlock audio on the first real user gesture (browser autoplay policy).
  const unlock = () => {
    game.audio.unlock?.();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  await game.boot();

  // Automation shortcut: ?autostart=1 skips straight into gameplay.
  const q = new URLSearchParams(location.search);
  if (q.has('autostart')) {
    const difficulty = q.get('difficulty') ?? 'operator';
    const loadout = q.get('loadout') ?? 'assault';
    await game.start({ difficulty, loadout });
  }

  bus.emit(EV.STATE_CHANGE, { state: game.state });
  console.info('[northstar] ready — window.render_game_to_text() and window.advanceTime(ms) are available');
}

main().catch(fatal);
