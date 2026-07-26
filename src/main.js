// Bootstrap: error capture first, then game construction.
window.__consoleErrors = [];
window.__consoleWarnings = [];
{
  const origError = console.error.bind(console);
  console.error = (...args) => {
    window.__consoleErrors.push(args.map((a) => (a && a.stack) ? a.stack : String(a)).join(' '));
    origError(...args);
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args) => {
    window.__consoleWarnings.push(args.map(String).join(' '));
    origWarn(...args);
  };
  window.addEventListener('error', (e) => {
    window.__consoleErrors.push(`${e.message} @ ${e.filename}:${e.lineno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__consoleErrors.push('unhandledrejection: ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason)));
  });
}

import { Game } from './game/game.js';
import { installTestHooks } from './core/testhooks.js';
import { installQa } from './core/qa.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const game = new Game(canvas, uiRoot);
window.__game = game;
installTestHooks(game);
if (game.qaMode || game.testMode) installQa(game);

game.boot().catch((err) => {
  console.error('Boot failed:', err);
});
