// NORTHSTAR RESCUE — boot & top-level flow.
// URL params: ?test=1 deterministic sim (advanceTime drives it), ?seed=N rng
// seed, ?qa=1 enables window.__qa dev API and gallery access.

import { Engine } from './core/engine.js';
import { loadSettings, getSetting } from './core/settings.js';
import { initInput, setWantPointerLock, onPointerLockChange, requestPointerLock } from './core/input.js';
import { initAudio, sfx, startMenuMusic, stopMenuMusic } from './core/audio.js';
import { on } from './core/events.js';
import { registerGameSounds } from './core/sounds.js';
import { rng } from './core/rng.js';
import { MODES, setMode, currentMode, onEnter, onExit } from './core/state.js';
import { buildMenus, setFlowHandlers, setLoadingProgress, getMissionConfig } from './ui/menus.js';
import { buildHud, renderHud, updateHudTick } from './ui/hud.js';
import { GameSession } from './game/game.js';
import { installTestHooks } from './core/testhooks.js';

const params = new URLSearchParams(location.search);
const TEST_MODE = params.has('test');
const QA_MODE = params.has('qa') || TEST_MODE;
window.__deterministic = TEST_MODE;

let session = null;
let lastConfig = null;

function boot() {
  loadSettings();
  if (params.has('seed')) rng.reseed(parseInt(params.get('seed'), 10) || 1337);
  else if (TEST_MODE) rng.reseed(42);

  const canvas = document.getElementById('game-canvas');
  Engine.init(canvas, { deterministic: TEST_MODE });
  initInput(canvas);
  initAudio({ silent: TEST_MODE && !params.has('sound') });
  registerGameSounds();
  buildMenus();
  buildHud();

  // ---------- flow handlers ----------
  setFlowHandlers({ startMission, restartMission, abortToTitle, resumeGame, openGallery: null });

  // body classes + pointer lock policy per mode
  onEnter(MODES.PLAYING, () => {
    document.body.classList.add('playing');
    document.body.classList.remove('paused');
    setWantPointerLock(true);
    if (!TEST_MODE) requestPointerLock();
  });
  onExit(MODES.PLAYING, () => {
    document.body.classList.remove('playing');
  });
  onEnter(MODES.PAUSED, () => {
    document.body.classList.add('paused');
    setWantPointerLock(false);
  });
  onExit(MODES.PAUSED, () => document.body.classList.remove('paused'));

  // Losing pointer lock (Esc) while playing pauses the game
  onPointerLockChange((locked) => {
    if (!locked && currentMode() === MODES.PLAYING && !TEST_MODE) pauseGame();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (currentMode() === MODES.PAUSED) resumeGame();
      else if (currentMode() === MODES.PLAYING && TEST_MODE) pauseGame();
    }
  });
  // reduced motion class
  const applyMotion = () => document.body.classList.toggle('reduced-motion', getSetting('reducedMotion'));
  applyMotion();

  // menu music: plays across menu screens, stops when deploying
  onEnter(MODES.TITLE, () => { try { startMenuMusic(); } catch { /* muted */ } });
  onEnter(MODES.LOADING, () => { try { stopMenuMusic(); } catch { /* muted */ } });
  // combat feedback ticks + radio squelch for Overwatch lines
  on('hit-marker', ({ kind }) => sfx(kind === 'kill' || kind === 'headshot' ? 'hit_kill' : 'hit_tick', { vol: 0.45 }));
  on('subtitle', ({ speaker }) => { if (speaker === 'Overwatch') sfx('radio_in', { vol: 0.4 }); });

  // ---------- engine wiring ----------
  Engine.addUpdater((dt) => {
    updateHudTick(dt);
    if (session && currentMode() === MODES.PLAYING) session.update(dt);
  });
  Engine.addRenderHook(() => {
    if (session && session.built) renderHud(session);
    // ADS fov
    if (session?.built) {
      const base = getSetting('fov');
      const zoom = session.weapons.weapon.adsZoom || 1;
      const target = base / (1 + (zoom - 1) * session.player.adsFrac);
      if (Math.abs(Engine.camera.fov - target) > 0.1) {
        Engine.camera.fov = target;
        Engine.camera.updateProjectionMatrix();
      }
    }
  });

  installTestHooks({
    getSession: () => session,
    startMission, restartMission, abortToTitle, resumeGame,
  }, { qaEnabled: QA_MODE });

  Engine.start();
  document.getElementById('boot-splash').classList.add('hidden');
  setMode(MODES.TITLE);
}

async function startMission(config) {
  lastConfig = config || getMissionConfig();
  setMode(MODES.LOADING);
  await disposeSession();
  session = new GameSession(lastConfig);
  session.onResultReady = (result) => {
    setMode(result.outcome === 'victory' ? MODES.VICTORY : MODES.DEFEAT, {
      reason: result.reason,
      stats: session.getStats(),
    });
    setWantPointerLock(false);
  };
  try {
    await session.build((frac, label) => setLoadingProgress(frac, label));
  } catch (err) {
    console.error('[northstar] session build failed', err);
    throw err;
  }
  setMode(MODES.PLAYING);
}

async function restartMission() {
  if (!lastConfig) lastConfig = getMissionConfig();
  await startMission(lastConfig);
}

async function abortToTitle() {
  await disposeSession();
  setWantPointerLock(false);
  setMode(MODES.TITLE);
}

function pauseGame() {
  if (currentMode() === MODES.PLAYING) setMode(MODES.PAUSED);
}
function resumeGame() {
  if (currentMode() === MODES.PAUSED) {
    setMode(MODES.PLAYING);
    if (!TEST_MODE) requestPointerLock();
  }
}

async function disposeSession() {
  if (session) {
    session.dispose();
    session = null;
  }
}

boot();
