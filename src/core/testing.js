import { assets } from './assets.js';
import { settings } from './settings.js';
import { bus } from './events.js';

/**
 * DETERMINISTIC BROWSER TEST SURFACE
 * Owner: Opus 4, implemented by Opus 1.
 *
 * Exposes exactly three globals plus one namespace:
 *   window.render_game_to_text()  → JSON string describing the player-relevant state
 *   window.advanceTime(ms)        → deterministic fixed-step simulation advance
 *   window.__northstar            → { game, qa, input, assets, version, helpers }
 *
 * Console errors are mirrored into `__northstar.errors` so an automated run can
 * assert on a clean console without scraping the devtools protocol.
 */

export const VERSION = '1.0.0';

export function installTestHooks(game) {
  const errors = [];
  const warnings = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => {
    errors.push(args.map(fmt).join(' '));
    origError.apply(console, args);
  };
  console.warn = (...args) => {
    warnings.push(args.map(fmt).join(' '));
    origWarn.apply(console, args);
  };

  const helpers = {
    /** Press a key for `ms` of simulated time, then release. */
    async tapKey(code, ms = 120) {
      game.input.injectKey(code, true);
      game.advanceTime(ms);
      game.input.injectKey(code, false);
      game.advanceTime(16);
    },
    holdKey(code, down = true) {
      game.input.injectKey(code, down);
    },
    look(dxDeg, dyDeg) {
      const s = settings.get('mouseSensitivity') || 0.14;
      game.input.injectLook(dxDeg / s, dyDeg / s);
    },
    lookAt(x, y, z) {
      const p = game.player;
      const dx = x - p.eyePosition.x;
      const dy = y - p.eyePosition.y;
      const dz = z - p.eyePosition.z;
      p.yaw = Math.atan2(-dx, -dz);
      p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      p.updateCamera(0);
    },
    mouse(button, down) {
      game.input.injectMouseButton(button, down);
    },
    async fire(times = 1, gapMs = 140) {
      for (let i = 0; i < times; i++) {
        game.input.injectMouseButton(0, true);
        game.advanceTime(30);
        game.input.injectMouseButton(0, false);
        game.advanceTime(gapMs);
      }
    },
    holdFire(ms) {
      game.input.injectMouseButton(0, true);
      game.advanceTime(ms);
      game.input.injectMouseButton(0, false);
      game.advanceTime(60);
    },
    move(direction, ms) {
      const codes = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD' };
      const code = codes[direction];
      if (!code) return;
      game.input.injectKey(code, true);
      game.advanceTime(ms);
      game.input.injectKey(code, false);
      game.advanceTime(80);
    },
    releaseAll() {
      for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ControlLeft', 'ShiftLeft', 'ShiftRight']) {
        game.input.injectKey(c, false);
      }
      game.input.injectMouseButton(0, false);
      game.input.injectMouseButton(2, false);
    },
  };

  window.render_game_to_text = () => {
    try {
      return JSON.stringify(game.renderToText());
    } catch (err) {
      return JSON.stringify({ error: String(err), stack: err?.stack });
    }
  };

  window.advanceTime = (ms) => game.advanceTime(Number(ms) || 0);

  window.__northstar = {
    version: VERSION,
    game,
    qa: game.qa,
    input: game.input,
    assets,
    settings,
    bus,
    errors,
    warnings,
    helpers,
    state: () => game.renderToText(),
    manifest: () => assets.all(),
    manifestStats: () => assets.stats(),
    ready: () => game.levelReady,
    clearErrors: () => { errors.length = 0; warnings.length = 0; },
  };

  window.addEventListener('error', (e) => errors.push(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandled rejection: ${String(e.reason)}`));

  return window.__northstar;
}

function fmt(v) {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return `${v.message}\n${v.stack}`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
