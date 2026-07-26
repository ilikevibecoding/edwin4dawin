/**
 * Root orchestrator. Owner: Opus 1.
 *
 * Owns the render loop, the flow state machine and the wiring between every ownership area.
 * Systems never reach for each other directly; they are constructed here and communicate over
 * the event bus and the interfaces in Types.ts.
 */
import { GameRenderer } from '../render/Renderer';
import { EventBus } from './EventBus';
import { RngStreams } from './Rng';
import { FIXED_STEP, SimClock } from './Time';
import { clampSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from './Settings';
import { detectQualityTier, profileFor } from './Quality';
import { COORDINATE_CONVENTION, type DifficultyId, type GameMode, type QualityProfile, type Settings, type WeaponId } from './Types';
import { buildMap, type BuiltMap } from '../world/MapBuilder';
import { buildLighting, LightingRig } from '../world/LightingPlan';
import { setTextureAnisotropy, setTextureScale } from '../assets/TextureLab';
import { InputSystem, KEY_BINDINGS as KEY_ACTIONS, toggleFullscreen } from '../player/Input';
import { PlayerController } from '../player/PlayerController';
import { UIRoot, type HudState } from '../ui/UIRoot';
import { CHECKPOINTS, PLAYER_SPAWN } from '../world/MapLayout';
import { installTestHooks } from '../dev/TestHooks';
import type * as THREE from 'three';

function round(v: number, d = 3): number {
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

function vec(v: THREE.Vector3): { x: number; y: number; z: number } {
  return { x: round(v.x), y: round(v.y), z: round(v.z) };
}

export class Game {
  readonly bus = new EventBus();
  readonly rng = new RngStreams();
  readonly clock = new SimClock();
  readonly canvas: HTMLCanvasElement;

  settings: Settings;
  profile: QualityProfile;

  renderer!: GameRenderer;
  input!: InputSystem;
  ui!: UIRoot;
  map!: BuiltMap;
  lighting!: LightingRig;
  player!: PlayerController;

  mode: GameMode = 'boot';
  difficulty: DifficultyId = 'operator';
  loadout: WeaponId[] = ['lynx-mk4', 'vk7-sidearm', 'talon-knife', 'flash-device'];

  private rafHandle = 0;
  private uiRootEl: HTMLElement;
  private frameTimes: number[] = [];
  private booted = false;
  /**
   * Automation mode. The requestAnimationFrame loop is not started; the simulation only moves
   * when `advanceTime()` is called. That makes every automated run reproducible and stops a
   * software rasteriser from burning the whole machine drawing frames nobody looks at.
   */
  readonly testMode: boolean;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    this.uiRootEl = uiRoot;
    const params = new URLSearchParams(location.search);
    this.testMode = params.get('test') === '1';
    this.settings = clampSettings(this.testMode ? { ...DEFAULT_SETTINGS } : loadSettings());
    if (this.testMode) {
      const rs = params.get('res');
      this.settings.resolutionScale = rs ? Math.max(0.4, Math.min(1, parseFloat(rs))) : 0.5;
      this.settings.showFps = false;
    }
    this.profile = profileFor(this.settings.quality);
  }

  async boot(): Promise<void> {
    // Probe the GL renderer before creating anything expensive.
    const probe = this.canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    const tier = detectQualityTier(probe);
    if (this.testMode) {
      this.settings.quality = tier;
    } else if (!localStorage.getItem('northstar-rescue.settings.v1')) {
      this.settings.quality = tier;
      if (tier === 'low') this.settings.resolutionScale = 0.75;
    }
    this.profile = profileFor(this.settings.quality);
    setTextureScale(this.profile.textureScale);
    setTextureAnisotropy(this.profile.anisotropy);

    this.renderer = new GameRenderer(this.canvas, this.profile, this.testMode);
    this.renderer.setFov(this.settings.fieldOfView);

    this.input = new InputSystem(this.canvas);
    this.ui = new UIRoot(this.uiRootEl, this.settings, {
      onStart: () => this.setMode('difficulty'),
      onDifficultyChosen: (d) => {
        this.difficulty = d;
        this.setMode('briefing');
      },
      onBriefingContinue: () => this.setMode('loadout'),
      onLoadoutConfirmed: (primary, utility) => {
        this.loadout = [primary, 'vk7-sidearm', 'talon-knife', utility];
        void this.startMission();
      },
      onResume: () => this.resume(),
      onRestart: () => void this.restart(),
      onReturnToMenu: () => this.returnToMenu(),
      onSettingsChanged: (s) => this.applySettings(s),
      onOpenGallery: () => this.setMode('gallery'),
      onQuit: () => this.returnToMenu(),
    });
    this.ui.syncSettings(this.settings);

    this.wireWindowEvents();
    this.handleResize();

    this.setMode('loading');
    this.ui.setLoadingProgress(2, 'Allocating render targets');
    await nextFrame();

    await this.buildWorld();

    this.player = new PlayerController(this.map.world, this.bus, this.settings);
    this.player.spawn(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z, PLAYER_SPAWN.yaw);

    this.booted = true;
    this.setMode('title');
    this.startLoop();
    installTestHooks(this);
  }

  private async buildWorld(): Promise<void> {
    this.ui.setLoadingProgress(8, 'Generating material families');
    await nextFrame();

    this.ui.setLoadingProgress(20, 'Assembling Northstar Administrative Center');
    await nextFrame();
    this.map = buildMap();
    this.renderer.scene.add(this.map.root);

    this.ui.setLoadingProgress(62, 'Placing lighting plan');
    await nextFrame();
    this.lighting = new LightingRig(this.profile);
    this.renderer.scene.add(this.lighting.group);
    buildLighting(this.lighting, this.map.root);

    this.ui.setLoadingProgress(96, 'Ready');
    await nextFrame();
  }

  // -------------------------------------------------------------------------
  // flow
  // -------------------------------------------------------------------------

  setMode(mode: GameMode): void {
    if (this.mode === mode) return;
    const from = this.mode;
    this.mode = mode;
    this.ui?.setMode(mode);
    this.bus.emit('mode:changed', { from, to: mode });
    if (mode === 'playing') {
      this.clock.timeScale = 1;
      if (!this.input.pointerLocked) this.input.requestPointerLock();
    } else {
      this.clock.timeScale = mode === 'paused' ? 0 : 1;
      if (this.input?.pointerLocked) this.input.exitPointerLock();
    }
  }

  async startMission(): Promise<void> {
    this.setMode('loading');
    this.ui.setLoadingProgress(30, 'Deploying to Northstar Administrative Center');
    await nextFrame();
    this.resetMission();
    this.ui.setLoadingProgress(100, 'Deployed');
    await nextFrame();
    this.setMode('playing');
  }

  resetMission(): void {
    this.rng.reseed(0x4e535452);
    this.clock.reset();
    this.map.doors.resetAll();
    this.player.spawn(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z, PLAYER_SPAWN.yaw);
    this.ui.clearTransient();
  }

  async restart(): Promise<void> {
    this.bus.emit('mission:restart', {});
    await this.startMission();
  }

  returnToMenu(): void {
    this.setMode('title');
  }

  pause(): void {
    if (this.mode !== 'playing') return;
    this.setMode('paused');
  }

  resume(): void {
    if (this.mode !== 'paused') return;
    this.setMode('playing');
  }

  applySettings(s: Settings): void {
    this.settings = clampSettings(s);
    saveSettings(this.settings);
    const newProfile = profileFor(this.settings.quality);
    if (newProfile.tier !== this.profile.tier) {
      this.profile = newProfile;
      setTextureAnisotropy(this.profile.anisotropy);
      this.renderer.setProfile(this.profile);
      this.lighting?.setProfile(this.profile);
    }
    this.renderer.setResolutionScale(this.settings.resolutionScale);
    this.renderer.setFov(this.settings.fieldOfView);
    this.player?.setSettings(this.settings);
    this.bus.emit('settings:changed', {});
  }

  // -------------------------------------------------------------------------
  // window plumbing
  // -------------------------------------------------------------------------

  private wireWindowEvents(): void {
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('fullscreenchange', () => this.handleResize());

    this.canvas.addEventListener('mousedown', () => {
      if (this.mode === 'playing' && !this.input.pointerLocked) this.input.requestPointerLock();
    });

    this.input.onEscape = () => {
      if (document.fullscreenElement) {
        // The browser also exits fullscreen on Esc; make the intent explicit.
        void document.exitFullscreen().catch(() => undefined);
        return;
      }
      if (this.ui.dialogOpen) {
        this.ui.hideDialog();
        return;
      }
      if (this.mode === 'playing') this.pause();
      else if (this.mode === 'paused') this.resume();
      else if (this.mode === 'settings' || this.mode === 'controls') this.ui.closeSubScreen();
      else if (this.mode === 'gallery') this.setMode('title');
      else if (this.mode === 'difficulty') this.setMode('title');
      else if (this.mode === 'briefing') this.setMode('difficulty');
      else if (this.mode === 'loadout') this.setMode('briefing');
    };

    this.input.onKeyPress = (code) => {
      if (code === 'KeyF') {
        toggleFullscreen(document.documentElement);
        return;
      }
      if (code === 'Enter') {
        if (this.mode === 'title') this.setMode('difficulty');
        else if (this.mode === 'difficulty') this.ui['cb']?.onDifficultyChosen?.(this.ui.selection.difficulty);
      }
    };

    this.input.onPointerLockChange = (locked) => {
      if (!locked && this.mode === 'playing') this.pause();
    };
  }

  handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer?.resize(w, h, this.settings.resolutionScale);
  }

  // -------------------------------------------------------------------------
  // loop
  // -------------------------------------------------------------------------

  private startLoop(): void {
    if (this.testMode) {
      // Draw one frame so the canvas is never blank, then wait for advanceTime().
      this.render();
      return;
    }
    const frame = (nowMs: number) => {
      this.rafHandle = requestAnimationFrame(frame);
      const ms = this.clock.pushRealTime(nowMs);
      this.frameStats(ms);
      this.advance(ms);
      this.render();
    };
    this.rafHandle = requestAnimationFrame(frame);
  }

  private frameStats(ms: number): void {
    if (ms <= 0) return;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
  }

  get fps(): number {
    if (this.frameTimes.length === 0) return 0;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avg > 0 ? 1000 / avg : 0;
  }

  /** Deterministic advance used by both the RAF loop and window.advanceTime(). */
  advance(ms: number): void {
    if (!this.booted) return;
    const steps = this.clock.push(ms);
    for (let i = 0; i < steps; i++) {
      this.step(FIXED_STEP);
      this.clock.consumeStep();
    }
    this.postStep(ms / 1000);
  }

  private step(dt: number): void {
    const playing = this.mode === 'playing';
    this.map.doors.update(dt);
    if (playing) {
      this.player.update(dt, this.input, true);
    }
    this.input.endStep();
  }

  private postStep(dt: number): void {
    this.lighting.update(dt, this.player.position);
    this.player.applyToCamera(this.renderer.camera);
    this.renderer.viewCamera.position.copy(this.renderer.camera.position);
    this.renderer.viewCamera.rotation.copy(this.renderer.camera.rotation);
    this.renderer.setGrade({
      damage: this.player.damageIntensity,
      time: this.clock.elapsed,
    });
    if (this.mode === 'playing') this.ui.updateHud(this.buildHudState(), dt);
  }

  private buildHudState(): HudState {
    const room = this.map.roomAt(this.player.position.x, this.player.position.y + 1, this.player.position.z);
    return {
      health: this.player.health,
      armor: this.player.armor,
      weaponName: '—',
      weaponIcon: 'carbine',
      magazine: 0,
      reserve: 0,
      fireMode: '—',
      spreadPx: 5,
      hasAmmo: true,
      reloading: false,
      timerText: '--:--',
      timerUrgent: false,
      objectives: [],
      hostages: [],
      prompt: null,
      markers: [{
        x: this.player.position.x, z: this.player.position.z,
        level: this.player.position.y > 2 ? 1 : 0, kind: 'player', yaw: this.player.yaw,
      }],
      playerX: this.player.position.x,
      playerZ: this.player.position.z,
      playerYaw: this.player.yaw,
      level: this.player.position.y > 2 ? 1 : 0,
      roomName: room?.short ?? '—',
      damageDirections: [],
      fps: this.fps,
      drawCalls: this.renderer.drawCalls,
      triangles: this.renderer.triangles,
    };
  }

  private render(): void {
    this.renderer.render();
  }

  // -------------------------------------------------------------------------
  // automation surface (see src/dev/TestHooks.ts)
  // -------------------------------------------------------------------------

  /**
   * Advance the simulation deterministically. Test code calls this instead of waiting on wall
   * time, so a burst of input always produces the same result.
   */
  advanceTime(ms: number): void {
    this.clock.deterministicMode = true;
    this.advance(ms);
    this.render();
    this.clock.deterministicMode = false;
  }

  renderGameToText(): string {
    const p = this.player;
    const room = this.map.roomAt(p.position.x, p.position.y + 1, p.position.z);
    const state = {
      schema: 'northstar-rescue/1',
      coordinateSystem: COORDINATE_CONVENTION,
      mode: this.mode,
      time: {
        elapsed: round(this.clock.elapsed, 3),
        missionRemaining: 0,
        tick: this.clock.tick,
      },
      player: {
        position: vec(p.position),
        orientation: {
          yaw: round(p.yaw, 4),
          pitch: round(p.pitch, 4),
          yawDeg: round((p.yaw * 180) / Math.PI, 1),
          pitchDeg: round((p.pitch * 180) / Math.PI, 1),
        },
        velocity: { ...vec(p.velocity), speed: round(Math.hypot(p.velocity.x, p.velocity.z), 3) },
        health: round(p.health, 1),
        armor: round(p.armor, 1),
        alive: p.alive,
        movementState: p.movementState,
        crouching: p.crouching,
        grounded: p.grounded,
        room: room?.id ?? 'void',
        level: p.position.y > 2 ? 1 : 0,
      },
      weapon: {
        active: 'none', name: '-', family: '-', state: 'idle',
        magazine: 0, reserve: 0, aiming: false, spreadDeg: 0, inventory: [],
      },
      objectives: [],
      hostages: [],
      enemies: [],
      enemySummary: { total: 0, alive: 0, alerted: 0, inCombat: 0 },
      doors: this.map.doors.near(p.position, 8).map((d) => d.describe()),
      interactables: [],
      extraction: { ready: false, playerInside: false, hostagesInside: 0, required: 2 },
      result: { outcome: 'in-progress', reason: '' },
      performance: {
        fps: round(this.fps, 1),
        drawCalls: this.renderer.drawCalls,
        triangles: this.renderer.triangles,
        quality: this.profile.tier,
        resolutionScale: this.settings.resolutionScale,
      },
    };
    return JSON.stringify(state);
  }

  automation(): Record<string, (...args: never[]) => unknown> {
    return {
      key: ((code: string, down: boolean) => {
        const map = KEY_ACTIONS[code];
        if (!map) return;
        if (down) this.input.press(map);
        else this.input.release(map);
      }) as never,
      look: ((dx: number, dy: number) => {
        this.player.applyLook(dx, dy);
      }) as never,
      mouse: ((button: 'fire' | 'aim', down: boolean) => {
        if (down) this.input.press(button);
        else this.input.release(button);
      }) as never,
      teleport: ((name: string) => this.teleportTo(name)) as never,
      setYaw: ((yaw: number) => {
        this.player.yaw = yaw;
      }) as never,
      setPitch: ((pitch: number) => {
        this.player.pitch = pitch;
      }) as never,
      setPose: ((x: number, y: number, z: number, yaw: number, pitch = 0) => {
        this.player.position.set(x, y, z);
        this.player.velocity.set(0, 0, 0);
        this.player.yaw = yaw;
        this.player.pitch = pitch;
      }) as never,
      setMode: ((m: GameMode) => this.setMode(m)) as never,
      restart: (() => void this.restart()) as never,
      lighting: ((scenario: 'production' | 'neutral' | 'blackout' | 'emergency' | 'daylight') =>
        this.lighting.setScenario(scenario)) as never,
      setQuality: ((tier: 'low' | 'medium' | 'high' | 'ultra') => {
        this.settings.quality = tier;
        this.applySettings(this.settings);
      }) as never,
      stats: (() => ({
        drawCalls: this.renderer.drawCalls,
        triangles: this.renderer.triangles,
        brushes: this.map.world.brushes.length,
        fps: this.fps,
      })) as never,
      render: (() => this.render()) as never,
      lightProbe: (() => ({
        pool: this.lighting.debugPool(),
        fixtures: this.lighting.managed.length,
        sun: this.lighting.sun.intensity,
        ambient: this.lighting.ambient.intensity,
        hemi: this.lighting.hemi.intensity,
      })) as never,
      /** Average luminance of the rendered frame; catches unreadably dark areas. */
      luminance: (() => {
        const gl = this.renderer.renderer.getContext();
        const w = this.renderer.renderWidth;
        const h = this.renderer.renderHeight;
        const sw = Math.min(160, w);
        const sh = Math.min(90, h);
        const buf = new Uint8Array(sw * sh * 4);
        this.render();
        gl.readPixels(
          Math.floor((w - sw) / 2), Math.floor((h - sh) / 2),
          sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, buf,
        );
        let sum = 0;
        let min = 255;
        let max = 0;
        for (let i = 0; i < sw * sh; i++) {
          const l = 0.2126 * buf[i * 4] + 0.7152 * buf[i * 4 + 1] + 0.0722 * buf[i * 4 + 2];
          sum += l;
          if (l < min) min = l;
          if (l > max) max = l;
        }
        return { mean: sum / (sw * sh), min, max };
      }) as never,
      setResolutionScale: ((v: number) => {
        this.settings.resolutionScale = v;
        this.renderer.setResolutionScale(v);
      }) as never,
      /** Measure real frame cost, bypassing the deterministic clock. */
      benchmark: ((frames: number) => {
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) this.render();
        const total = performance.now() - t0;
        return { frames, totalMs: total, msPerFrame: total / frames, fps: 1000 / (total / frames) };
      }) as never,
    };
  }

  teleportTo(name: string): boolean {
    const cp = CHECKPOINTS.find((c) => c.id === name);
    if (!cp) return false;
    this.player.position.set(cp.x, cp.y, cp.z);
    this.player.velocity.set(0, 0, 0);
    this.player.yaw = cp.yaw;
    this.player.pitch = 0;
    return true;
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    this.input?.dispose();
    this.renderer?.dispose();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
