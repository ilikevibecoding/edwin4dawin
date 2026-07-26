// Game orchestrator: owns the state machine for the complete required flow:
// boot -> title -> (settings) -> difficulty -> briefing -> loadout -> loading -> playing
//      -> paused / victory / defeat -> restart or menu.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Renderer } from '../core/renderer.js';
import { Input } from '../core/input.js';
import { settings } from '../core/settings.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { UI } from '../ui/ui.js';
import { Mission } from './mission.js';
import { DIFFICULTIES } from './difficulty.js';
import { DEFAULT_LOADOUT } from '../weapons/defs.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.state = 'boot';
    this.prevMenuState = 'title';
    this.mission = null;
    this.testMode = new URLSearchParams(location.search).has('test');
    this.qaMode = new URLSearchParams(location.search).has('qa');
    this.chosen = { difficulty: 'operator', loadout: { ...DEFAULT_LOADOUT } };
    this.ui = new UI(this, uiRoot);
    this.engine = new Engine({ step: (dt) => this.step(dt), render: () => this.render() });
    this.cameraOverride = null; // QA free-cam / gallery
    this.titleCam = { t: 0 };
    this._clickToCapture = false;

    this.input.onPointerLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.testMode) {
        this.setState('paused');
      }
      this.ui.setCaptureHint(!locked && this.state === 'playing' && !this.testMode);
    };

    // Global keys: F fullscreen, Esc handled by pointerlock/pause logic, P pause toggle.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !e.repeat) this.toggleFullscreen();
      if (e.code === 'Escape') this.onEscape();
      if (e.code === 'KeyP' && !e.repeat) {
        if (this.state === 'playing') this.setState('paused');
        else if (this.state === 'paused') this.resumeGame();
      }
    });
    // First user gesture unlocks audio.
    const unlock = () => { audio.ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    bus.on('mission-ended', ({ result }) => {
      if (this.state !== 'playing') return;
      this.setState(result === 'victory' ? 'victory' : 'defeat');
    });
  }

  async boot() {
    this.ui.show('boot');
    await new Promise((r) => setTimeout(r, 30));
    // Mission is constructed once; restarts reset it in place (clean-state guarantee is enforced
    // by Mission.reset building all entities fresh from layout data).
    this.mission = new Mission(this, (pct, label) => this.ui.bootProgress(pct, label));
    await this.mission.build();
    this.setState('title');
    this.engine.start();
  }

  setState(next) {
    const prev = this.state;
    this.state = next;
    if (prev === 'playing' && next !== 'playing') this.input.exitPointerLock();
    if (['title', 'settings', 'difficulty', 'briefing', 'loadout'].includes(next)) {
      if (!audio.musicHandle) audio.startMusic('title');
    } else if (next === 'playing' || next === 'loading') {
      audio.stopMusic();
    }
    if (next === 'playing') {
      this.ui.show('hud');
      if (!this.testMode) {
        this.input.requestPointerLock();
        setTimeout(() => this.ui.setCaptureHint(!this.input.pointerLocked && this.state === 'playing'), 350);
      }
    } else {
      this.ui.show(next);
    }
    if (next === 'victory') audio.ui('victory');
    if (next === 'defeat') audio.ui('defeat');
    bus.emit('game-state', { prev, next });
  }

  onEscape() {
    // Esc always exits fullscreen (native). In gameplay it also pauses via pointerlockchange;
    // in menus it navigates back sensibly.
    if (this.state === 'settings') this.setState(this.prevMenuState === 'paused' ? 'paused' : 'title');
    else if (this.state === 'difficulty') this.setState('title');
    else if (this.state === 'briefing') this.setState('difficulty');
    else if (this.state === 'loadout') this.setState('briefing');
    else if (this.state === 'paused') this.resumeGame();
    else if (this.state === 'playing' && this.testMode) this.setState('paused');
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch { /* headless */ }
  }

  openSettings(from) { this.prevMenuState = from; this.setState('settings'); }

  startMissionFlow() { this.setState('difficulty'); }

  async deploy() {
    this.setState('loading');
    const t0 = performance.now();
    this.mission.reset({
      difficulty: this.chosen.difficulty,
      loadout: this.chosen.loadout,
      seed: this.testMode ? 1337 : (Math.random() * 1e9) | 0,
    });
    const minMs = this.testMode ? 50 : 1400;
    const wait = Math.max(0, minMs - (performance.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    if (this.state === 'loading') this.setState('playing');
  }

  resumeGame() {
    if (!this.mission || !this.mission.active) return;
    this.setState('playing');
  }

  restartMission() { this.deploy(); }

  returnToTitle() {
    this.mission.deactivate();
    this.setState('title');
  }

  step(dt) {
    if (this.state === 'playing') {
      const snap = this.input.snapshot();
      this.mission.update(dt, snap);
      this.ui.updateHud(this.mission, dt);
    } else if (['title', 'settings', 'difficulty', 'briefing', 'loadout', 'victory', 'defeat', 'loading'].includes(this.state)) {
      this.titleCam.t += dt;
      this.mission.updateIdle(dt);
    }
    // paused: simulation frozen by design
  }

  render() {
    const r = this.renderer;
    if (!this.mission || !this.mission.scene) return;
    if (this.cameraOverride) {
      this.cameraOverride(r.camera);
    } else if (this.state === 'playing' || this.state === 'paused') {
      this.mission.applyPlayerCamera(r.camera);
    } else {
      this.mission.applyCinematicCamera(r.camera, this.titleCam.t);
    }
    this.mission.preRender(r.camera);
    r.render(this.mission.scene);
  }
}
