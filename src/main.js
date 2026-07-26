import { Game, STATE } from './game.js';

// ---------------------------------------------------------------------------
// Bootstrap.  (owner: opus1)
//
// Creates the single Game instance, installs the deterministic automation
// contract on `window`, and hands control to the title screen.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game-canvas');
if (!canvas) throw new Error('[northstar] #game-canvas is missing from index.html');

function reportFatal(err) {
  console.error('[northstar] fatal boot error', err);
  const root = document.getElementById('ui-root');
  if (!root) return;
  root.innerHTML = `
    <div class="screen visible instant" style="pointer-events:auto">
      <div class="screen-backdrop"></div>
      <div class="screen-content" style="justify-content:center;align-items:center;text-align:center">
        <p class="eyebrow">Northstar Rescue</p>
        <h2 class="screen-title">Unable to start</h2>
        <p class="subtitle" style="max-width:60ch">${String(err?.message || err)}</p>
        <p class="subtitle">This build needs a WebGL2-capable Chromium-based browser.</p>
      </div>
    </div>`;
}

// Fail loudly and early if WebGL2 is unavailable, rather than showing a black
// canvas the player cannot diagnose.
try {
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) {
    throw new Error('WebGL2 is not available in this browser or is disabled.');
  }
} catch (err) {
  reportFatal(err);
  throw err;
}

const game = new Game(canvas);

// --- deterministic automation contract -------------------------------------

/**
 * Concise JSON description of the player-relevant simulation state.
 * Consumed by the Playwright suite; see docs/playwright-scenarios.md.
 */
globalThis.render_game_to_text = function render_game_to_text() {
  try {
    return game.renderToText();
  } catch (err) {
    return { schema: 'northstar.state/1', error: String(err?.stack || err) };
  }
};

/**
 * Advance the simulation deterministically by `ms` milliseconds.
 * Steps the fixed-timestep simulation in bounded chunks so arbitrarily large
 * values are fully simulated (no silent clamping), then renders one frame.
 */
globalThis.advanceTime = function advanceTime(ms = 16.6667, { render = true } = {}) {
  const total = Math.max(0, Number(ms) || 0);
  const chunk = 80; // ms; safely under engine.maxSubSteps * fixedStep
  let remaining = total;
  let guard = 0;
  while (remaining > 0.0001 && guard++ < 200000) {
    const slice = Math.min(chunk, remaining);
    game.engine.advance(slice, false);
    remaining -= slice;
  }
  if (render) game.engine.render();
  return {
    simTime: +game.engine.simTime.toFixed(4),
    frame: game.engine.frame,
    advancedMs: total,
  };
};

globalThis.__NORTHSTAR__ = game;
globalThis.__NORTHSTAR_STATE__ = STATE;

// The QA API is only attached in development builds / when explicitly enabled.
if (game.qa.enabled) {
  globalThis.__NORTHSTAR_QA__ = game.qa.api;
}

game
  .boot()
  .then(() => {
    globalThis.__NORTHSTAR_READY__ = true;
  })
  .catch(reportFatal);
