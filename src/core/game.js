import * as THREE from 'three';
import { Engine } from './engine.js';
import { InputManager, fullscreen } from './input.js';
import { settings } from './settings.js';
import { bus, EV } from './events.js';
import { assets, reg, OWNERS } from './assets.js';
import { Level } from '../map/level.js';
import { collision } from '../map/collision.js';
import { PlayerController } from '../player/controller.js';
import { PlayerCombat } from '../player/combat.js';
import { Mission, MISSION_STATE, OBJECTIVES } from '../mission/mission.js';
import { difficultyById, DIFFICULTY_LIST } from '../mission/difficulty.js';
import { LOADOUT_PRESETS, WEAPONS } from '../weapons/defs.js';
import { CHECKPOINTS, roomAt, ROOM_BY_ID, EXTRACTION_ZONE } from '../map/layout.js';
import { ViewModel } from '../weapons/viewmodel.js';
import { buildOperatorArms } from '../characters/models.js';
import { VfxSystem } from '../vfx/index.js';
import { AudioSystem } from '../audio/index.js';
import { Hud } from '../ui/hud.js';
import { MenuSystem } from '../ui/menus.js';
import { QaTools } from './qa.js';
import { setTextureBudget } from '../art/textures.js';
import { registerCoreManifest } from './manifest.js';

/**
 * GAME SHELL
 * Owner: Opus 1.
 *
 * Owns the state machine, the fixed-timestep simulation, and the wiring between
 * every subsystem. Simulation runs at a fixed 120 Hz step with an accumulator,
 * which is what makes `window.advanceTime(ms)` reproduce exactly what a real
 * play session would have produced.
 */

export const GAME_STATE = {
  BOOT: 'boot',
  MENU: 'menu',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  GALLERY: 'gallery',
};

const FIXED_STEP = 1 / 120;
const MAX_STEPS = 12;

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.state = GAME_STATE.BOOT;
    this.assets = assets;
    this.settings = settings;
    this.difficulty = difficultyById('operator');
    this.loadout = LOADOUT_PRESETS.find((l) => l.recommended) ?? LOADOUT_PRESETS[1];
    this.time = 0;
    this.frameCount = 0;
    this.accumulator = 0;
    this.paused = false;
    this.levelReady = false;
    this.consoleErrors = [];
    this.fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._loop = this._loop.bind(this);
    this._lastNow = 0;

    setTextureBudget(settings.get('quality'));
    registerCoreManifest();

    this.engine = new Engine(canvas);
    this.input = new InputManager(canvas);
    this.vfx = new VfxSystem(this.engine.scene, this.engine.camera);
    this.audio = new AudioSystem();
    this.viewModel = new ViewModel(this.engine.viewScene);
    // Integration offset: the authored arm rest pose sits the weapon ~36 deg below
    // the 65 deg overlay camera axis, which pushes it off the bottom of the frame.
    this.viewModel.root.position.set(0.0, 0.155, 0.02);

    this.player = new PlayerController(this.engine.camera);
    this.combat = new PlayerCombat(this.player, {
      vfx: this.vfx, audio: this.audio, viewModel: this.viewModel,
      difficulty: this.difficulty,
      getTargets: () => (this.mission ? this.mission.livingTargets() : []),
    });

    this.hud = new Hud(uiRoot);
    this.menus = new MenuSystem(uiRoot, this);
    this.qa = new QaTools(this);

    this.hud.hide();
    this._bindEvents();
  }

  /* ---------------- Boot ---------------- */

  async boot() {
    this.state = GAME_STATE.MENU;
    this.menus.show('title');
    this.audio.setMusic?.('menu');
    this._lastNow = performance.now();
    requestAnimationFrame(this._loop);
    // Build the level in the background so "Begin Operation" is instant.
    this._levelPromise = this._buildLevel();
  }

  async _buildLevel() {
    if (this.level) return this.level;
    this.level = new Level(this.engine.scene);
    this.level.onShadowMoved = () => this.engine.invalidateShadows();
    this.levelStats = await this.level.build((p, label) => {
      this.menus.setProgress?.(p * 0.85, label);
    });

    // First-person arms and the view model
    try {
      const arms = buildOperatorArms({});
      this.arms = arms;
      this.combat.arms = arms;
      this.engine.viewScene.add(arms.group);
      const key = new THREE.DirectionalLight(0xdfeaf4, 2.2);
      key.position.set(-0.6, 1.1, 0.8);
      this.engine.viewScene.add(key);
      const fill = new THREE.HemisphereLight(0xbcd4e8, 0x33393f, 1.15);
      this.engine.viewScene.add(fill);
    } catch (err) {
      console.error('[game] operator arms failed to build', err);
    }

    this.mission = new Mission({
      scene: this.engine.scene, level: this.level, player: this.player,
      combat: this.combat, vfx: this.vfx, audio: this.audio, difficulty: this.difficulty,
    });
    this.mission.build();
    this.combat.level = this.level;
    this.combat.difficulty = this.difficulty;
    this.levelReady = true;
    this.menus.setProgress?.(1, 'Ready');
    return this.level;
  }

  /* ---------------- Flow ---------------- */

  async start(opts = {}) {
    if (opts.difficulty) this.setDifficulty(opts.difficulty);
    if (opts.loadout) this.setLoadout(opts.loadout);
    this.state = GAME_STATE.LOADING;
    this.menus.show('loading');
    await this._levelPromise;
    await this._buildLevel();
    // Let the loading screen paint at least one frame
    await new Promise((r) => setTimeout(r, 60));

    this.mission.setDifficulty(this.difficulty);
    this.mission.reset();
    this.player.reset(CHECKPOINTS.spawn);
    this.combat.reset(this.loadout);
    this.vfx.reset();
    this.level.reset();
    this.level.lights.setScenario(this.difficulty.lighting ?? 'day');
    this.mission.start();

    this.state = GAME_STATE.PLAYING;
    this.menus.hide();
    this.hud.show();
    this.audio.unlock?.();
    this.audio.setMusic?.('tension');
    this.input.requestLock();
    bus.emit(EV.STATE_CHANGE, { state: this.state });
    return true;
  }

  pause() {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.state = GAME_STATE.PAUSED;
    this.input.releaseLock();
    this.menus.show('pause');
    bus.emit(EV.STATE_CHANGE, { state: this.state });
  }

  resume() {
    if (this.state !== GAME_STATE.PAUSED) return;
    this.state = GAME_STATE.PLAYING;
    this.menus.hide();
    this.hud.show();
    this.input.requestLock();
    bus.emit(EV.STATE_CHANGE, { state: this.state });
  }

  async restart() {
    if (!this.levelReady) return false;
    this.mission.reset();
    this.player.reset(CHECKPOINTS.spawn);
    this.combat.reset(this.loadout);
    this.vfx.reset();
    this.level.reset();
    this.level.lights.setScenario(this.difficulty.lighting ?? 'day');
    this.mission.start();
    this.state = GAME_STATE.PLAYING;
    this.menus.hide();
    this.hud.show();
    this.input.requestLock();
    this.audio.setMusic?.('tension');
    bus.emit(EV.STATE_CHANGE, { state: this.state });
    return true;
  }

  returnToMenu() {
    this.state = GAME_STATE.MENU;
    this.input.releaseLock();
    this.hud.hide();
    this.menus.show('title');
    this.audio.setMusic?.('menu');
    if (this.mission) {
      this.mission.reset();
      this.mission.state = MISSION_STATE.READY;
    }
    bus.emit(EV.STATE_CHANGE, { state: this.state });
  }

  quit() {
    this.returnToMenu();
  }

  setDifficulty(id) {
    this.difficulty = difficultyById(typeof id === 'string' ? id : id?.id);
    if (this.mission) this.mission.setDifficulty(this.difficulty);
    if (this.combat) this.combat.difficulty = this.difficulty;
    return this.difficulty;
  }

  setLoadout(id) {
    const found = LOADOUT_PRESETS.find((l) => l.id === (typeof id === 'string' ? id : id?.id));
    if (found) this.loadout = found;
    return this.loadout;
  }

  get stats() {
    const m = this.mission;
    const c = this.combat;
    return {
      time: m?.elapsed ?? 0,
      shotsFired: c?.stats.shotsFired ?? 0,
      shotsHit: c?.stats.shotsHit ?? 0,
      accuracy: c && c.stats.shotsFired ? c.stats.shotsHit / c.stats.shotsFired : 0,
      headshots: c?.stats.headshots ?? 0,
      enemiesKilled: c?.stats.kills ?? 0,
      enemiesTotal: m?.enemies.length ?? 0,
      damageTaken: Math.round(m?.stats.damageTaken ?? 0),
      hostagesExtracted: m?.stats.hostagesExtracted ?? 0,
      hostagesTotal: m?.hostages.length ?? 0,
      difficulty: this.difficulty.name,
      loadout: this.loadout.name,
    };
  }

  /* ---------------- Events ---------------- */

  _bindEvents() {
    bus.on(EV.MISSION_END, ({ victory }) => {
      this.state = victory ? GAME_STATE.VICTORY : GAME_STATE.DEFEAT;
      this.input.releaseLock();
      setTimeout(() => {
        this.hud.hide();
        this.menus.show(victory ? 'victory' : 'defeat');
      }, 1100);
      bus.emit(EV.STATE_CHANGE, { state: this.state });
    });

    bus.on(EV.ANNOUNCE, ({ text, speaker, kind }) => {
      if (!text) return;
      if (kind === 'enemy' || kind === 'hostage') {
        if (settings.get('subtitles')) this.hud.subtitle(text, speaker, 3200);
      } else {
        this.hud.notify(text, kind ?? 'info');
        if (settings.get('subtitles')) this.hud.subtitle(text, speaker ?? 'Northstar Actual', 3600);
      }
    });

    bus.on(EV.DAMAGE_DEALT, ({ headshot, killed }) => {
      if (!settings.get('showHitmarkers')) return;
      this.hud.hitMarker(killed ? 'kill' : headshot ? 'headshot' : 'hit');
    });

    bus.on(EV.PLAYER_DAMAGED, ({ direction, amount }) => {
      if (direction) {
        const yaw = Math.atan2(-direction.x, -direction.z);
        const rel = THREE.MathUtils.radToDeg(yaw - this.player.yaw);
        this.hud.damageFrom(rel, amount);
      }
      this.audio.play('hit.flesh', { volume: 0.5 });
    });

    bus.on(EV.GLASS_BROKEN, (payload) => {
      if (payload.state === 'broken') this.vfx.glassShatter(payload);
    });

    bus.on(EV.DOOR_STATE, ({ door, state, settled }) => {
      if (!door) return;
      if (state === 'locked') this.audio.play('door.locked', { pos: door.center, volume: 0.7 });
      else if (state === 'opening') {
        this.audio.play(`door.${door.spec.sound === 'shutter' ? 'metal' : door.spec.sound}.open`, { pos: door.center, volume: 0.7 });
        if (door.roller) this.audio.play('shutter.motor', { pos: door.center, volume: 0.8 });
      } else if (state === 'closing') {
        this.audio.play(`door.${door.spec.sound === 'shutter' ? 'metal' : door.spec.sound}.close`, { pos: door.center, volume: 0.6 });
      }
      void settled;
    });

    bus.on(EV.FOOTSTEP, ({ pos, surface, loudness, source, land }) => {
      if (source !== 'player') return;
      const id = land ? 'step.land' : (this.player.isCrouched ? `step.crouch.${surface}` : `step.${surface}`);
      this.audio.play(id, { pos, volume: 0.35 * (loudness ?? 1) });
    });

    bus.on(EV.UI_SOUND, (payload) => {
      const id = typeof payload === 'string' ? payload : payload?.id;
      if (id) this.audio.play(id, { volume: 0.6 });
    });

    bus.on(EV.SETTINGS_CHANGED, ({ key }) => {
      if (key === 'quality' || key === null) {
        this.level?.lights?.qualityChanged?.();
      }
    });

    window.addEventListener('error', (e) => {
      this.consoleErrors.push({ message: e.message, source: e.filename, line: e.lineno });
    });
    window.addEventListener('unhandledrejection', (e) => {
      this.consoleErrors.push({ message: String(e.reason), source: 'promise' });
    });
  }

  /* ---------------- Simulation ---------------- */

  _handleGlobalInput() {
    const input = this.input;
    if (input.wasPressed('fullscreen') && !this._uiCaptured()) {
      fullscreen.toggle(document.getElementById('app') ?? document.documentElement);
    }
    if (input.wasPressed('pause')) {
      // Esc exits fullscreen first (browsers already do this), then pauses.
      if (this.state === GAME_STATE.PLAYING && !this.menus.active) this.pause();
    }
    if (this.state === GAME_STATE.PLAYING && !input.locked && input.mouse.leftPressed) {
      input.requestLock();
    }
  }

  _uiCaptured() {
    return !!this.menus.active;
  }

  step(dt) {
    this.time += dt;
    if (this.state !== GAME_STATE.PLAYING) return;
    const input = this.input;
    const uiCaptured = this._uiCaptured();

    if (!uiCaptured && input.locked) {
      const sens = this.combat.adsFactor > 0.5 ? settings.get('adsSensitivityScale') : 1;
      const look = input.consumeLook(sens);
      this.player.applyLook(look.dx, look.dy);
    } else {
      input.consumeLook(1);
    }

    this.player.update(dt, input, {
      aiming: this.combat.aiming,
      speedMultiplier: this.combat.current?.def?.moveSpeedScale ?? 1,
    });

    this.combat.update(dt, input, { uiCaptured });
    this.combat.postSwitch();

    if (!uiCaptured && input.wasPressed('use')) {
      this.mission.interact();
    }

    this.mission.update(dt);
    this.level.update(dt, this.engine.camera.position);

    // Weapon FOV blending for ADS
    const targetFov = this.combat.adsFov;
    this.engine.camera.fov += (targetFov - this.engine.camera.fov) * Math.min(1, 14 * dt);
    this.engine.camera.updateProjectionMatrix();

    // Screen effects
    const hp = this.player.health / 100;
    this.engine.setDamageEffect(hp < 0.55 ? (1 - hp / 0.55) * 0.85 : 0);
    this.engine.setFlashEffect(Math.min(1, (this.mission.playerFlash ?? 0) / 2.2));
  }

  _renderFrame(dt) {
    const cam = this.engine.camera;
    this.vfx.update(dt, cam.position);
    const room = this.state === GAME_STATE.PLAYING
      ? roomAt(this.player.position.x, this.player.position.z, this.player.floor)
      : null;
    this.audio.update(dt, cam.position, cam.quaternion, room?.id ?? 'exterior');
    this.engine.viewCamera.fov = 65 - this.combat.adsFactor * 6;
    this.engine.viewCamera.updateProjectionMatrix();
    this.engine.render(dt);
  }

  /**
   * The HUD rebuilds DOM for the hostage strip and utility row, so refreshing it
   * on every simulation frame churns native memory for no visible benefit.
   * 30 Hz is indistinguishable and it is forced whenever automation needs a
   * current frame.
   */
  _updateHud(force = false) {
    if (this.state !== GAME_STATE.PLAYING && this.state !== GAME_STATE.PAUSED) return;
    if (!force) {
      const now = this.time;
      if (now - (this._lastHudUpdate ?? -1) < 0.033) return;
      this._lastHudUpdate = now;
    }
    const m = this.mission;
    const c = this.combat;
    const w = c.current?.def;
    const interaction = m ? m.findInteraction() : null;
    const room = roomAt(this.player.position.x, this.player.position.z, this.player.floor);
    this.hud.update({
      mode: this.state,
      health: this.player.health,
      armor: this.player.armor,
      alive: this.player.alive,
      weapon: w ? {
        id: w.id, name: w.name, icon: w.hudIcon,
        magazine: c.current.magazine ?? 0, magazineMax: w.magazine ?? 0,
        reserve: c.current.reserve ?? 0, reloading: c.reloading,
        reloadProgress: c.serialize().reloadProgress,
        family: w.family, scoped: !!w.scoped, adsFactor: c.adsFactor,
      } : null,
      utility: c.utilityList(),
      objective: m.objectiveState(),
      hostages: m.hostages.map((h) => ({
        id: h.id, name: h.name, state: h.state,
        distance: Math.round(h.position.distanceTo(this.player.position)),
      })),
      timer: { remaining: m.timeRemaining, total: m.difficulty.missionSeconds, critical: m.timeRemaining < 60 },
      interact: interaction
        ? { available: true, verb: interaction.verb, target: interaction.kind, key: 'E', progress: 0 }
        : { available: false },
      enemies: {
        alive: m.enemies.filter((e) => e.alive).length,
        visible: m.enemies.filter((e) => e.alive && e.alerted).length,
      },
      extraction: {
        active: m.extractionActive,
        progress: m.extractionTimer / m.extractionRequired,
        eligible: m.hostages.filter((h) => h.alive).every((h) => h.secured),
      },
      compassDeg: (THREE.MathUtils.radToDeg(this.player.yaw) + 360) % 360,
      position: [this.player.position.x, this.player.position.y, this.player.position.z],
      floor: this.player.floor,
      room: room?.id ?? 'exterior',
      roomName: room?.name ?? 'Exterior',
      crosshairSpread: c.spreadDegrees,
      difficulty: this.difficulty.name,
      fps: Math.round(this.fps),
      alarm: m.alarm,
    });
    if (this.hud.minimap && settings.get('showMinimap')) {
      this.hud.minimap.update({
        playerPos: this.player.position, playerYaw: this.player.yaw, floor: this.player.floor,
        enemies: m.enemies.filter((e) => e.alive && e.alerted).map((e) => ({ pos: e.position, state: e.state })),
        hostages: m.hostages.map((h) => ({ pos: h.position, state: h.state })),
        extraction: EXTRACTION_ZONE,
        doors: [],
        objectives: [],
      });
    }
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const rawDt = Math.min(0.25, (now - this._lastNow) / 1000);
    this._lastNow = now;
    if (this.testHold) return;

    this._fpsAccum += rawDt;
    this._fpsFrames++;
    if (this._fpsAccum > 0.4) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    this.accumulator += rawDt;
    // Global keys are handled only on frames that will actually simulate, so an
    // edge event cannot be acted on twice while waiting for the next step.
    if (this.accumulator >= FIXED_STEP) this._handleGlobalInput();
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
      this.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps++;
      // One-shot edges belong to exactly one simulation step.
      this.input.clearEdges();
    }
    if (steps >= MAX_STEPS) this.accumulator = 0;
    this.input.endFrame(steps);
    this.menus.update?.(rawDt);
    this._updateHud();
    this._renderFrame(rawDt);
    this.frameCount++;
  }

  /** Deterministic stepping for automation. */
  advanceTime(ms) {
    // Global keys (fullscreen, pause) are handled outside the fixed step in the
    // live loop; automation must see the same behaviour or those bindings are
    // untestable.
    this._handleGlobalInput();
    const total = Math.max(0, ms) / 1000;
    let remaining = total;
    const guard = Math.ceil(total / FIXED_STEP) + 4;
    let steps = 0;
    while (remaining > 1e-6 && steps < guard) {
      const dt = Math.min(FIXED_STEP, remaining);
      this.step(dt);
      remaining -= dt;
      steps++;
      this.input.clearEdges();
    }
    this.input.endFrame(steps);
    this._updateHud(true);
    this._renderFrame(1 / 60);
    return { steps, seconds: total };
  }

  /* ---------------- Text state ---------------- */

  renderToText() {
    const p = this.player;
    const c = this.combat;
    const m = this.mission;
    const room = this.levelReady ? roomAt(p.position.x, p.position.z, p.floor) : null;
    const out = {
      schema: 'northstar-rescue/state@1',
      coordinateSystem: {
        convention: 'right-handed, +X east, +Y up, +Z south; north is -Z',
        unit: 'metre',
        yaw: 'degrees, 0 = facing north (-Z), increases counter-clockwise seen from above',
        pitch: 'degrees, positive looks up',
        floors: { ground: 0, upper: 4.2 },
      },
      gameMode: this.state,
      paused: this.state === GAME_STATE.PAUSED,
      menuScreen: this.menus.active ?? null,
      levelReady: this.levelReady,
      frame: this.frameCount,
      simTimeSeconds: Math.round(this.time * 100) / 100,
      fps: Math.round(this.fps),
      difficulty: this.difficulty.id,
      loadout: this.loadout.id,
      consoleErrors: this.consoleErrors.length,
    };

    if (!this.levelReady) return out;

    out.player = {
      ...p.serialize(),
      room: room?.id ?? 'exterior',
      roomName: room?.name ?? 'Exterior',
      inExtractionZone: m ? m.playerInExtractionZone() : false,
    };
    out.weapon = c.serialize();
    out.mission = m.serialize(p.position, { enemyLimit: 14 });
    out.nearbyDoors = this.level.doors.nearby(p.position, 7).map((d) => d.serialize(p.position));
    const interaction = m.findInteraction();
    out.interactables = [];
    if (interaction) {
      out.interactables.push({
        kind: interaction.kind,
        verb: interaction.verb,
        distance: Math.round(interaction.distance * 100) / 100,
        id: interaction.target.id ?? null,
        key: 'E',
      });
    }
    for (const h of m.hostages) {
      const d = h.position.distanceTo(p.position);
      if (d < 6 && h.alive && h.interactVerb()) {
        out.interactables.push({ kind: 'hostage', id: h.id, verb: h.interactVerb(), distance: Math.round(d * 100) / 100, key: 'E' });
      }
    }
    out.victory = m.state === MISSION_STATE.VICTORY;
    out.defeat = m.state === MISSION_STATE.DEFEAT;
    out.stats = this.stats;
    out.render = this.engine.stats();
    return out;
  }

  dispose() {
    this.engine.dispose();
  }
}

void reg; void OWNERS; void collision; void ROOM_BY_ID; void OBJECTIVES; void DIFFICULTY_LIST; void WEAPONS;
