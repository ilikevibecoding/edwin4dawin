import * as THREE from 'three';
import { Settings } from './Settings.js';
import { EventBus } from './Events.js';
import { Input } from './Input.js';
import { Assets } from './Assets.js';
import { Physics } from './Physics.js';
import { Debug } from './Debug.js';
import { RenderSystem } from '../rendering/RenderSystem.js';
import { World } from '../world/World.js';
import { Player } from '../player/Player.js';
import { WeaponSystem } from '../weapons/WeaponSystem.js';
import { Combat } from '../combat/Combat.js';
import { Enemies } from '../ai/Enemies.js';
import { Effects } from '../fx/Effects.js';
import { Killstreaks } from '../killstreaks/Killstreaks.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { GameMode } from '../game/GameMode.js';

/**
 * Central game context. Every system receives `game` and reaches siblings through it.
 * Update order (per frame):
 *   input → player → weapons → enemies → killstreaks → combat → physics.step → fx → gameMode → hud → audio → render
 *
 * Game states: 'loading' | 'menu' | 'playing' | 'paused' | 'dead' | 'ended'
 */
export class Game {
  constructor({ canvas, hudRoot, menuRoot }) {
    this.canvas = canvas;
    this.hudRoot = hudRoot;
    this.menuRoot = menuRoot;
    this.settings = new Settings();
    this.events = new EventBus();
    this.clock = new THREE.Clock(false);
    this.time = 0; // total simulated seconds
    this.frame = 0;
    this.state = 'loading';
    this._running = false;
    this._raf = 0;
    this.timeScale = 1;
    this.stats = { fps: 0, frameMs: 0, _acc: 0, _n: 0 };
    this._loadSteps = [];
  }

  setLoadingLabel(label, fraction) {
    const fill = document.getElementById('loading-fill');
    const lbl = document.getElementById('loading-label');
    if (fill && fraction != null) fill.style.width = `${Math.round(fraction * 100)}%`;
    if (lbl && label) lbl.textContent = label;
  }

  async init() {
    const step = async (label, frac, fn) => {
      this.setLoadingLabel(label, frac);
      await fn();
    };

    await step('INPUT', 0.02, async () => {
      this.input = new Input(this.canvas);
    });
    await step('RENDERER', 0.05, async () => {
      this.render = new RenderSystem(this);
      this.scene = this.render.scene;
      this.camera = this.render.camera;
      this.assets = new Assets(this.render.renderer);
      await this.assets.init();
      await this.render.init();
    });
    await step('PHYSICS', 0.12, async () => {
      this.physics = await Physics.create();
    });
    await step('WORLD', 0.2, async () => {
      this.world = new World(this);
      await this.world.load();
    });
    await step('PLAYER', 0.55, async () => {
      this.player = new Player(this);
      this.player.spawn(this.world.getPlayerSpawn());
    });
    await step('WEAPONS', 0.6, async () => {
      this.weapons = new WeaponSystem(this);
      await this.weapons.load();
    });
    await step('COMBAT', 0.7, async () => {
      this.combat = new Combat(this);
      this.enemies = new Enemies(this);
      await this.enemies.load();
    });
    await step('EFFECTS', 0.8, async () => {
      this.fx = new Effects(this);
      await this.fx.load();
      this.killstreaks = new Killstreaks(this);
      await this.killstreaks.load();
    });
    await step('AUDIO', 0.9, async () => {
      this.audio = new AudioSystem(this);
      await this.audio.load();
    });
    await step('INTERFACE', 0.95, async () => {
      this.gameMode = new GameMode(this);
      this.hud = new HUD(this);
      this.menu = new Menu(this);
      this.debug = new Debug(this);
    });
    // Lighting/shadow setup pass over everything that was added to the scene during load.
    this.render.onSceneReady();
    this.setLoadingLabel('READY', 1);
    this.setState(this.settings.shotMode ? 'playing' : 'menu');
    this.events.emit('game:ready');
  }

  setState(state) {
    if (this.state === state) return;
    const prev = this.state;
    this.state = state;
    if (state === 'playing' && !this.settings.shotMode) this.input.requestPointerLock();
    if ((state === 'menu' || state === 'paused') && !this.settings.shotMode) this.input.exitPointerLock();
    this.events.emit('game:state', { state, prev });
  }

  get isPlaying() {
    return this.state === 'playing';
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this.tick();
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
  }

  tick() {
    const t0 = performance.now();
    let dt = this.settings.fixedDt > 0 ? this.settings.fixedDt : Math.min(this.clock.getDelta(), 1 / 20);
    dt *= this.timeScale;
    if (this.settings.fixedDt > 0) this.clock.getDelta();
    this.update(dt);
    const ms = performance.now() - t0;
    this.stats.frameMs = ms;
    this.stats._acc += ms;
    this.stats._n++;
    if (this.stats._n >= 30) {
      this.stats.fps = 1000 / (this.stats._acc / this.stats._n);
      this.stats._acc = 0;
      this.stats._n = 0;
    }
  }

  update(dt) {
    this.frame++;
    this.input.update();

    const simulating = this.state === 'playing' || this.state === 'dead' || this.state === 'ended';
    const simDt = simulating ? dt : 0;
    if (simulating) this.time += dt;

    if (this.input.justPressed('pause') && !this.settings.shotMode) {
      if (this.state === 'playing') this.setState('paused');
    }
    if (this.input.justPressed('toggleHud')) this.hud.toggle();

    this.player.update(simDt);
    this.weapons.update(simDt);
    this.enemies.update(simDt);
    this.killstreaks.update(simDt);
    this.combat.update(simDt);
    if (simulating) this.physics.step(dt);
    this.fx.update(simDt);
    this.gameMode.update(simDt);
    this.hud.update(dt);
    this.menu.update(dt);
    this.audio.update(dt);
    this.debug.update(dt);
    this.render.render(dt);
    this.events.emit('frame:end', { dt });
  }
}
