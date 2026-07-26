import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { settings } from './core/settings.js';
import { bus, EVT } from './core/events.js';
import { assets } from './core/assets.js';
import { CollisionWorld } from './physics/world.js';
import { LevelBuild } from './map/build.js';
import { DoorSystem } from './map/doors.js';
import { LightingRig } from './map/lighting.js';
import { PlayerController } from './player/controller.js';
import { registerMaterialAssets } from './art/materials.js';
import { registerArchitectureAssets } from './map/manifest.js';
import { PLAYER_SPAWN, CHECKPOINTS, ROOMS, roomAt, floorForY } from './map/layout.js';
import { PropPopulator } from './props/populate.js';
import { registerPropAssets } from './props/manifest.js';
import { NavGrid } from './ai/navgrid.js';
import { WeaponSystem } from './weapons/system.js';
import { ViewModel } from './characters/viewmodel.js';
import { CombatSystem } from './player/combat.js';
import { EnemyManager } from './ai/enemies.js';
import { HostageManager } from './ai/hostages.js';
import { MissionDirector } from './mission/director.js';
import { EffectsSystem } from './fx/effects.js';
import { DecalSystem } from './fx/decals.js';
import { AudioEngine } from './audio/engine.js';
import { UIManager } from './ui/manager.js';
import { QAMode } from './qa/qamode.js';
import { AssetGallery } from './qa/gallery.js';
import { Weather } from './fx/weather.js';
import { PostFX } from './fx/postfx.js';

export const STATE = {
  BOOT: 'boot',
  TITLE: 'title',
  MENU: 'menu',
  SETTINGS: 'settings',
  CONTROLS: 'controls',
  DIFFICULTY: 'difficulty',
  BRIEFING: 'briefing',
  LOADOUT: 'loadout',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  GALLERY: 'gallery',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.scene = this.engine.scene;
    this.camera = this.engine.camera;
    this.state = STATE.BOOT;
    this.previousState = null;
    this.levelReady = false;
    this.loadProgress = 0;
    this.loadTask = '';
    this.consoleErrors = [];
    this.difficulty = settings.get('difficulty');
    this.loadout = { primary: 'carbine', secondary: 'pistol', gadget: 'flash' };
    this.sessionStats = null;

    this.collision = new CollisionWorld();
    this.audio = new AudioEngine();
    this.ui = new UIManager(this);
    this.qa = new QAMode(this);
    this.gallery = new AssetGallery(this);

    this._bindGlobalErrors();
    this._installSystems();
  }

  _bindGlobalErrors() {
    globalThis.addEventListener?.('error', (e) => {
      this.consoleErrors.push({ message: e.message, source: e.filename, line: e.lineno, time: Date.now() });
    });
    globalThis.addEventListener?.('unhandledrejection', (e) => {
      this.consoleErrors.push({ message: String(e.reason), source: 'promise', time: Date.now() });
    });
  }

  _installSystems() {
    const e = this.engine;
    e.addFixedSystem('input-look', () => this.stepLook(), 5);
    e.addFixedSystem('player', (dt) => this.stepPlayer(dt), 10);
    e.addFixedSystem('weapons', (dt) => this.stepWeapons(dt), 20);
    e.addFixedSystem('doors', (dt) => this.doors?.update(dt), 30);
    e.addFixedSystem('ai', (dt) => this.stepAI(dt), 40);
    e.addFixedSystem('mission', (dt) => this.director?.update(dt), 50);
    e.addFixedSystem('input-end', () => this.input.endStep(), 99);
    e.addFrameSystem('lighting', (dt) => this.lighting?.update(dt, this.camera.position), 10);
    e.addFrameSystem('viewmodel', (dt) => this.viewmodel?.update(dt), 20);
    e.addFrameSystem('effects', (dt) => this.effects?.update(dt), 30);
    e.addFrameSystem('weather', (dt) => this.weather?.update(dt, this.camera.position), 35);
    e.addFrameSystem('characters', (dt) => {
      this.enemies?.updateVisual(dt);
      this.hostages?.updateVisual(dt);
    }, 40);
    e.addFrameSystem('ui', (dt) => this.ui.update(dt), 80);
    e.addFrameSystem('qa', (dt) => this.qa.update(dt), 90);
    e.addFrameSystem('postfx', (dt) => this.postfx?.update(dt), 95);
  }

  // ------------------------------------------------------------------ boot
  async boot() {
    this.ui.mount();
    this.setState(STATE.TITLE);
    this.engine.start();
    // The title screen renders the real level behind a blurred scrim, so the
    // level has to exist before the menu is interactive.
    await this.loadLevel((p, task) => this.ui.setLoadProgress(p, task));
    this.ui.onLevelReady();
    return this;
  }

  async loadLevel(onProgress = () => {}) {
    const steps = [
      ['Registering asset manifest', () => {
        registerMaterialAssets();
        registerArchitectureAssets();
        registerPropAssets();
      }],
      ['Compiling surface materials', () => { /* materials build lazily on first use */ }],
      ['Assembling structure', () => {
        this.level = new LevelBuild(this.collision).build();
        this.scene.add(this.level.group);
      }],
      ['Hanging doors and glazing', () => {
        this.doors = new DoorSystem(this.collision, this.scene).createFromSpecs(this.level.doorSpecs);
      }],
      ['Placing furniture and fittings', () => {
        this.props = new PropPopulator(this.scene, this.collision, this.level).populate();
      }],
      ['Setting the lighting plan', () => {
        this.lighting = new LightingRig(this.scene, this.engine);
      }],
      ['Baking navigation', () => {
        this.nav = new NavGrid(this.collision).build();
      }],
      ['Loading operator kit', () => {
        this.player = new PlayerController({
          collision: this.collision, camera: this.camera, input: this.input, doors: this.doors,
        });
        this.weapons = new WeaponSystem(this);
        this.viewmodel = new ViewModel(this);
        this.combat = new CombatSystem(this);
      }],
      ['Inserting hostile force', () => {
        this.enemies = new EnemyManager(this);
        this.hostages = new HostageManager(this);
      }],
      ['Arming mission systems', () => {
        this.director = new MissionDirector(this);
        this.decals = new DecalSystem(this);
        this.effects = new EffectsSystem(this);
        this.weather = new Weather(this);
        this.postfx = new PostFX(this);
      }],
      ['Final checks', () => {
        this.player.spawn(PLAYER_SPAWN.pos, PLAYER_SPAWN.yaw);
        this.levelReady = true;
      }],
    ];
    for (let i = 0; i < steps.length; i++) {
      const [task, fn] = steps[i];
      this.loadTask = task;
      onProgress(i / steps.length, task);
      // Yield so the loading screen can paint between heavy steps.
      await new Promise((r) => setTimeout(r, 0));
      fn();
    }
    onProgress(1, 'Ready');
    this.loadProgress = 1;
    return this;
  }

  // ----------------------------------------------------------------- state
  setState(next, payload = {}) {
    if (this.state === next) return;
    this.previousState = this.state;
    this.state = next;
    const playing = next === STATE.PLAYING;
    document.body.classList.toggle('menu-open', !playing);
    if (!playing) {
      this.input.releaseAll();
      if (next !== STATE.PAUSED) this.input.exitPointerLock();
    }
    bus.emit(EVT.GAME_STATE, { state: next, previous: this.previousState, ...payload });
    this.ui.onStateChange(next, this.previousState, payload);
    this.engine.paused = !playing;
    return next;
  }

  startMission({ difficulty = this.difficulty, loadout = this.loadout } = {}) {
    this.difficulty = difficulty;
    settings.set('difficulty', difficulty);
    this.loadout = loadout;
    this.setState(STATE.LOADING);
    // One frame of loading screen, then a clean reset into play.
    this._pendingStart = true;
    this._loadingTimer = 0;
  }

  beginPlay() {
    this.resetMission();
    this.setState(STATE.PLAYING);
    this.audio.resume();
    if (!this.input.pointerLocked) this.input.requestPointerLock();
  }

  /** Full deterministic reset: no state may survive from the previous run. */
  resetMission() {
    this.collision.colliders.forEach((c) => { if (c.tag?.startsWith('character')) this.collision.remove(c); });
    this.player.spawn(PLAYER_SPAWN.pos, PLAYER_SPAWN.yaw);
    this.doors.reset();
    this.props.reset();
    this.weapons.reset(this.loadout);
    this.viewmodel.reset();
    this.combat.reset();
    this.enemies.reset(this.difficulty);
    this.hostages.reset();
    this.director.reset(this.difficulty);
    this.effects.reset();
    this.decals.reset();
    this.ui.resetHud();
    this.engine.simTime = 0;
    this.sessionStats = null;
    bus.emit(EVT.MISSION_RESET, { difficulty: this.difficulty });
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.setState(STATE.PAUSED);
    this.input.exitPointerLock();
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.setState(STATE.PLAYING);
    this.input.requestPointerLock();
  }

  returnToMenu() {
    this.setState(STATE.MENU);
  }

  restart() {
    this.startMission({ difficulty: this.difficulty, loadout: this.loadout });
  }

  // ------------------------------------------------------------- simulation
  stepLook() {
    if (this.state !== STATE.PLAYING || !this.player) return;
    const { yaw, pitch } = this.input.consumeLook();
    const adsScale = this.weapons?.adsFactor > 0.2 ? settings.get('adsSensitivityScale') : 1;
    this.player.applyLook(yaw * adsScale, pitch * adsScale);
  }

  stepPlayer(dt) {
    if (!this.levelReady || !this.player) return;
    if (this._pendingStart) {
      this._loadingTimer += dt;
      if (this._loadingTimer > 0.65) {
        this._pendingStart = false;
        this.beginPlay();
      }
    }
    const playing = this.state === STATE.PLAYING;
    this.player.update(dt, {
      adsFactor: this.weapons?.adsFactor || 0,
      allowInput: playing && !this.qa.aiFrozen ? true : playing,
    });
    if (playing) this.handleInteraction(dt);
  }

  stepWeapons(dt) {
    if (!this.weapons) return;
    const playing = this.state === STATE.PLAYING;
    this.weapons.update(dt, playing);
    this.combat?.update(dt, playing);
  }

  stepAI(dt) {
    if (this.state !== STATE.PLAYING) return;
    if (!this.qa.aiFrozen) {
      this.enemies?.update(dt);
      this.hostages?.update(dt);
    }
  }

  handleInteraction(dt) {
    const target = this.findInteractable();
    this.currentInteractable = target;
    if (target && this.input.wasPressed('use')) {
      target.activate(this);
    }
  }

  /** Nearest usable thing under the crosshair or within arm's reach. */
  findInteractable() {
    if (!this.player) return null;
    const eye = this.player.eyePosition;
    const dir = this.player.forward;
    const candidates = [];

    // Doors: look-at within 2.4 m.
    const door = this.doors.nearest(this.player.position, 2.6);
    if (door) {
      const dx = door.spec.x - eye.x;
      const dz = door.spec.z - eye.z;
      const dist = Math.hypot(dx, dz);
      const dot = (dx * dir.x + dz * dir.z) / (dist || 1);
      if (dot > 0.45 && Math.abs(door.spec.y - this.player.position.y) < 2) {
        candidates.push({
          kind: 'door',
          id: door.id,
          distance: dist,
          score: dist - dot * 2,
          label: door.locked ? 'Locked' : door.isOpen ? 'Close door' : 'Open door',
          locked: door.locked,
          key: 'E',
          activate: (game) => {
            const res = door.use(true, game.engine.simTime, game.combat.hasKeycard);
            game.audio.playDoor(res, door);
            if (res === 'locked') game.ui.flashPrompt('Locked — find another way');
          },
        });
      }
    }

    // Hostages and props expose their own interactables.
    const hostageTarget = this.hostages?.findInteractable(eye, dir);
    if (hostageTarget) candidates.push(hostageTarget);
    const propTarget = this.props?.findInteractable(eye, dir, this.player.position);
    if (propTarget) candidates.push(propTarget);
    const missionTarget = this.director?.findInteractable(eye, dir, this.player.position);
    if (missionTarget) candidates.push(missionTarget);

    if (!candidates.length) return null;
    candidates.sort((a, b) => (a.score ?? a.distance) - (b.score ?? b.distance));
    return candidates[0];
  }

  currentRoom() {
    if (!this.player) return null;
    const floor = floorForY(this.player.position.y);
    return roomAt(this.player.position.x, this.player.position.z, floor)
      || roomAt(this.player.position.x, this.player.position.z, floor === 'upper' ? 'ground' : 'upper');
  }

  teleport(checkpointName) {
    const cp = CHECKPOINTS[checkpointName];
    if (!cp) return false;
    this.player.position.set(cp.pos[0], cp.pos[1] + 0.05, cp.pos[2]);
    this.player.velocity.set(0, 0, 0);
    this.player.yaw = cp.yaw;
    this.player.pitch = 0;
    this.collision.resolveOverlap(this.player.position, this.player.radius, this.player.height);
    this.player.updateCamera(0);
    return true;
  }

  // ------------------------------------------------------------- text state
  /** The deterministic state contract consumed by Playwright. */
  renderToText() {
    const p = this.player;
    const out = {
      schema: 'northstar.state/1',
      coordinateSystem: {
        units: 'metres',
        handedness: 'right-handed',
        axes: '+X east, +Y up, +Z south (-Z is the building front / north)',
        yaw: 'radians; 0 faces -Z (north), increases counter-clockwise viewed from above',
        pitch: 'radians; positive looks up',
        origin: 'centre of the reception lobby footprint at ground-floor level',
      },
      gameMode: this.state,
      levelReady: this.levelReady,
      difficulty: this.difficulty,
      simTime: +this.engine.simTime.toFixed(3),
      frame: this.engine.frame,
    };
    if (!this.levelReady || !p) return out;

    const room = this.currentRoom();
    out.player = {
      ...p.toJSON(),
      room: room ? room.id : null,
      roomName: room ? room.name : null,
      floor: floorForY(p.position.y),
      hasKeycard: !!this.combat?.hasKeycard,
    };
    out.weapon = this.weapons.toJSON();
    out.mission = this.director.toJSON();
    out.hostages = this.hostages.toJSON(p.position);
    out.enemies = this.enemies.toJSON(p.eyePosition, p.forward);
    out.doors = this.doors.toJSON(p.position, 7);
    out.interactables = this.props.interactablesNear(p.position, 4)
      .concat(this.director.interactablesNear(p.position, 6));
    out.interactionPrompt = this.currentInteractable
      ? { kind: this.currentInteractable.kind, id: this.currentInteractable.id, label: this.currentInteractable.label, key: this.currentInteractable.key }
      : null;
    out.outcome = this.director.outcome;
    out.hud = this.ui.hudState();
    out.performance = {
      fps: +this.engine.perf.fps.toFixed(1),
      drawCalls: this.engine.perf.drawCalls,
      triangles: this.engine.perf.triangles,
      resolution: [this.engine.viewportWidth, this.engine.viewportHeight],
      pixelRatio: +this.engine.renderer.getPixelRatio().toFixed(2),
      quality: settings.get('quality'),
    };
    out.consoleErrors = this.consoleErrors.length;
    return out;
  }
}
