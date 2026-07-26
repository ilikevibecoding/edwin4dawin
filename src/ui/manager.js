// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — UIManager  (owner: fable1)
//
// Owns the DOM overlay in #ui-root and every screen transition. The game
// calls exactly: mount(), update(dt), onStateChange(next, previous, payload),
// hudState(), setLoadProgress(p, task), onLevelReady(), resetHud(),
// flashPrompt(text).
//
// Keyboard rules (non-negotiable):
//   * every screen is reachable and escapable by keyboard alone
//   * Escape never traps: it always resumes, backs out, or pauses
// ---------------------------------------------------------------------------

import { bus, EVT } from '../core/events.js';
import { settings } from '../core/settings.js';
import { el, confirmDialog } from './screens/base.js';
import { TitleScreen } from './screens/title.js';
import { MenuScreen } from './screens/menu.js';
import { SettingsScreen } from './screens/settings.js';
import { ControlsScreen } from './screens/controls.js';
import { DifficultyScreen } from './screens/difficulty.js';
import { BriefingScreen } from './screens/briefing.js';
import { LoadoutScreen } from './screens/loadout.js';
import { LoadingScreen } from './screens/loading.js';
import { PauseScreen } from './screens/pause.js';
import { EndScreen } from './screens/end.js';
import { Hud } from './hud.js';

// Local mirror of src/game.js STATE strings (a static import would be
// circular: game.js imports this module).
const S = {
  BOOT: 'boot', TITLE: 'title', MENU: 'menu', SETTINGS: 'settings',
  CONTROLS: 'controls', DIFFICULTY: 'difficulty', BRIEFING: 'briefing',
  LOADOUT: 'loadout', LOADING: 'loading', PLAYING: 'playing',
  PAUSED: 'paused', VICTORY: 'victory', DEFEAT: 'defeat', GALLERY: 'gallery',
};

export class UIManager {
  /** @param {import('../game.js').Game} game */
  constructor(game) {
    this.game = game;
    this.root = null;
    this.levelReady = false;
    this.missionEndPayload = null;
    this.pendingDifficulty = null;
    this._mounted = false;
    this._activeScreen = null;
    this._returnState = S.MENU;   // where settings/controls go back to
    this._pausedAt = 0;           // guards Escape double-handling around pause

    this.hud = new Hud(this);
    this.screens = {
      [S.TITLE]: new TitleScreen(this),
      [S.MENU]: new MenuScreen(this),
      [S.SETTINGS]: new SettingsScreen(this),
      [S.CONTROLS]: new ControlsScreen(this),
      [S.DIFFICULTY]: new DifficultyScreen(this),
      [S.BRIEFING]: new BriefingScreen(this),
      [S.LOADOUT]: new LoadoutScreen(this),
      [S.LOADING]: new LoadingScreen(this),
      [S.PAUSED]: new PauseScreen(this),
      [S.VICTORY]: new EndScreen(this, 'victory'),
      [S.DEFEAT]: new EndScreen(this, 'defeat'),
    };
  }

  // ------------------------------------------------------------ lifecycle --

  mount() {
    if (this._mounted) return this;
    this._mounted = true;
    this.root = document.getElementById('ui-root') || document.body.appendChild(el('div', { id: 'ui-root' }));
    this.root.replaceChildren();

    this._installNoise();
    this._applyUiScale(settings.get('uiScale'));

    this.root.append(this.hud.root);
    for (const screen of Object.values(this.screens)) this.root.append(screen.el);

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    // One delegated listener gives every button an activation sound
    // (EVT.UI_CONFIRM). Controls that emit their own sound opt out with
    // data-uisound="none"; dev chrome (QA panel, gallery) stays silent.
    this.root.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('button') : null;
      if (!btn || btn.disabled) return;
      if (btn.closest('#qa-panel, #asset-gallery, #perf-overlay')) return;
      if (btn.dataset.uisound === 'none') return;
      bus.emit(EVT.UI_CONFIRM, { kind: 'select' });
    });
    bus.on('input:pointerlock', (locked) => {
      if (!locked && this.game?.state === S.PLAYING) {
        this._pausedAt = performance.now();
        this.game.pause?.();
      }
    });
    bus.on(EVT.MISSION_END, (payload) => this._onMissionEnd(payload));
    bus.on(EVT.SETTINGS_CHANGED, (p) => {
      if (!p || p.key === null || p.key === 'uiScale') this._applyUiScale(settings.get('uiScale'));
    });
    return this;
  }

  update(dt) {
    if (!this._mounted) return;
    const state = this.game?.state;
    if (state === S.PLAYING || state === S.PAUSED) this.hud.update(dt);
    this._activeScreen?.update?.(dt);
  }

  // ------------------------------------------------------- state routing --

  onStateChange(next, previous, payload = {}) {
    if (!this._mounted) this.mount();

    // Remember where nested reference screens should return to.
    if ((next === S.SETTINGS || next === S.CONTROLS)
      && previous && previous !== S.SETTINGS && previous !== S.CONTROLS) {
      this._returnState = previous === S.PAUSED ? S.PAUSED : S.MENU;
    }
    if (next === S.PAUSED) this._pausedAt = performance.now();

    const target = this.screens[next] || null;
    if (this._activeScreen && this._activeScreen !== target) this._activeScreen.hide();
    this._activeScreen = target;
    if (target && !target.visible) {
      target.show(next === S.BRIEFING ? { mode: this._briefingMode || 'browse', ...payload } : payload);
    }

    this.hud.setVisible(next === S.PLAYING);
    document.body.classList.toggle('pointer-free', next === S.PLAYING && !this.game?.input?.pointerLocked);
  }

  /** MISSION_END is authoritative for the end screens. */
  _onMissionEnd(payload) {
    this.missionEndPayload = payload || {};
    if (this.game?.state !== S.PLAYING) return;
    const o = payload || {};
    const won = o.outcome === 'victory' || o.result === 'victory' || o.victory === true || o.won === true;
    this.game.setState?.(won ? S.VICTORY : S.DEFEAT, { ...o });
  }

  // ------------------------------------------------------ game contracts --

  setLoadProgress(p, task) {
    this.screens[S.TITLE]?.setProgress?.(p, task);
    this.screens[S.LOADING]?.setProgress?.(p, task);
  }

  onLevelReady() {
    this.levelReady = true;
    this.screens[S.TITLE]?.setReady?.();
    this.screens[S.MENU]?.refreshReady?.();
  }

  resetHud() {
    this.hud.reset();
  }

  flashPrompt(text) {
    this.hud.flashPrompt(text);
  }

  /** Plain-JSON snapshot of the HUD for renderToText(). */
  hudState() {
    return { screen: this.game?.state ?? null, ...this.hud.state() };
  }

  // --------------------------------------------------- screen navigation --
  // (called by the screen modules; every path is keyboard reachable)

  toTitle() {
    this.game?.setState?.(S.TITLE);
  }

  toMenu() {
    this.game?.setState?.(S.MENU);
  }

  startDeployFlow() {
    if (!this.levelReady) return;
    this.game?.setState?.(S.DIFFICULTY);
  }

  chooseDifficulty(id) {
    this.pendingDifficulty = id;
    this.openBriefing('deploy');
  }

  openBriefing(mode = 'browse') {
    this._briefingMode = mode;
    this.game?.setState?.(S.BRIEFING, { mode });
  }

  briefingContinue() {
    this.game?.setState?.(S.LOADOUT);
  }

  deploy(loadout) {
    const difficulty = this.pendingDifficulty || this.game?.difficulty || settings.get('difficulty');
    this.game?.startMission?.({ difficulty, loadout });
  }

  openSettings() {
    this.game?.setState?.(S.SETTINGS);
  }

  openControls() {
    this.game?.setState?.(S.CONTROLS);
  }

  openGallery() {
    this.game?.setState?.(S.GALLERY);
  }

  /** Escape / Back from any screen. Never traps. */
  goBack() {
    const state = this.game?.state;
    if (this.screens[state]) bus.emit(EVT.UI_NAV, { kind: 'back', direction: 'back' });
    switch (state) {
      case S.SETTINGS:
      case S.CONTROLS:
        this.game?.setState?.(this._returnState || S.MENU);
        if (this._returnState !== S.PAUSED) this._returnState = S.MENU;
        break;
      case S.DIFFICULTY:
        this.toMenu();
        break;
      case S.BRIEFING:
        this.game?.setState?.(this._briefingMode === 'deploy' ? S.DIFFICULTY : S.MENU);
        break;
      case S.LOADOUT:
        this.openBriefing('deploy');
        break;
      case S.VICTORY:
      case S.DEFEAT:
      case S.GALLERY:
        this.toMenu();
        break;
      case S.MENU:
        this.toTitle();
        break;
      default:
        break;
    }
  }

  /** Shared modal confirmation (see screens/base.js). */
  confirm(opts) {
    const host = this._activeScreen?.el || this.root;
    return confirmDialog(host, opts);
  }

  // -------------------------------------------------------------- keyboard --

  _onKeyDown(e) {
    if (!this._mounted) return;
    const state = this.game?.state;

    // Rebind capture and confirm dialogs listen in the capture phase and stop
    // propagation, so anything arriving here is ours to route.
    if (this.screens[S.CONTROLS]?.capturing) return;

    if (state === S.PLAYING) {
      // Pointer-lock Escape never reaches the page; this is the fallback for
      // windowed / automation play.
      if (e.code === 'Escape') {
        e.preventDefault();
        this._pausedAt = performance.now();
        this.game?.pause?.();
      }
      return;
    }

    if (state === S.PAUSED && e.code === 'Escape') {
      // Ignore the Escape that caused the pause itself (pointer-lock exit).
      if (performance.now() - this._pausedAt < 300) return;
      e.preventDefault();
      bus.emit(EVT.UI_NAV, { kind: 'back', direction: 'back' });
      this.game?.resume?.();
      return;
    }

    // Give the active screen first refusal.
    const screen = this._activeScreen;
    if (screen?.visible && screen.handleKey?.(e)) {
      e.preventDefault();
      return;
    }

    if (e.code === 'Escape') {
      if (state === S.TITLE || state === S.LOADING || state === S.BOOT) return;
      e.preventDefault();
      if (state === S.PAUSED) this.game?.resume?.();
      else this.goBack();
    }
  }

  // --------------------------------------------------------------- helpers --

  _applyUiScale(v) {
    const scale = Math.min(1.6, Math.max(0.7, Number(v) || 1));
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  }

  /** Procedural film-grain tile for `.screen-noise` (no binary assets). */
  _installNoise() {
    try {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 100 + Math.floor(Math.random() * 110);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      document.documentElement.style.setProperty('--noise-url', `url(${c.toDataURL('image/png')})`);
    } catch {
      /* canvas unavailable — the noise layer simply stays empty */
    }
  }
}
