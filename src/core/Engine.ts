import * as THREE from 'three';
import { EventBus } from './Events';
import { Input } from './Input';
import { Settings } from './Settings';
import { clamp, movingAverage } from './MathX';

/**
 * Shared context handed to every subsystem. Subsystems reach each other via
 * `get()` rather than direct imports so the module graph stays acyclic and any
 * one system can be stubbed out.
 */
export interface EngineContext {
  engine: Engine;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Separate scene rendered on top with its own near plane — weapon viewmodel. */
  viewScene: THREE.Scene;
  viewCamera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  events: EventBus;
  input: Input;
  settings: Settings;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  get<T>(name: string): T;
  has(name: string): boolean;
  provide(name: string, service: unknown): void;
  /** Seconds since the world started, excluding paused time. */
  elapsed: number;
  frame: number;
  /** Global slow-motion factor applied to world updates. */
  timeScale: number;
  paused: boolean;
  capture: boolean;
}

export interface Subsystem {
  readonly name: string;
  /** Lower runs first. Physics ~10, gameplay ~50, camera ~80, render ~100. */
  readonly order?: number;
  init?(ctx: EngineContext): Promise<void> | void;
  /** Fixed-rate step for physics and deterministic simulation. */
  fixedUpdate?(dt: number, ctx: EngineContext): void;
  /** Variable-rate step. `dt` is already scaled by `timeScale`. */
  update?(dt: number, ctx: EngineContext): void;
  /** Runs after all updates — camera assembly, post-fx params. */
  lateUpdate?(dt: number, ctx: EngineContext): void;
  /** Called instead of `update` while paused (UI, menus). */
  pausedUpdate?(dtReal: number, ctx: EngineContext): void;
  resize?(w: number, h: number, ctx: EngineContext): void;
  dispose?(): void;
}

export interface EngineOptions {
  container: HTMLElement;
  settings?: Settings;
  capture?: boolean;
}

const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.25;

export class Engine {
  readonly scene = new THREE.Scene();
  readonly viewScene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly viewCamera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly events = new EventBus();
  readonly input = new Input();
  readonly settings: Settings;
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly ctx: EngineContext;

  private systems: Subsystem[] = [];
  private services = new Map<string, unknown>();
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private fpsAvg = movingAverage(60);
  private frameMsAvg = movingAverage(60);

  elapsed = 0;
  frame = 0;
  timeScale = 1;
  paused = false;
  capture: boolean;
  fps = 0;
  frameMs = 0;

  /** Set by the render subsystem; the engine calls it once per frame. */
  renderFn: ((dt: number) => void) | null = null;

  constructor(opts: EngineOptions) {
    this.container = opts.container;
    this.capture = opts.capture ?? false;
    this.settings = opts.settings ?? new Settings();

    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // AA is handled in post so we keep an HDR float buffer.
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.capture,
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.debug.checkShaderErrors = import.meta.env?.DEV ?? false;

    const aspect = Math.max(0.1, this.container.clientWidth / Math.max(1, this.container.clientHeight));
    this.camera = new THREE.PerspectiveCamera(this.settings.user.fov, aspect, 0.05, 1700);
    this.camera.rotation.order = 'YXZ';

    // Viewmodel camera shares FOV control but a much tighter depth range so the
    // weapon never clips into walls.
    this.viewCamera = new THREE.PerspectiveCamera(60, aspect, 0.008, 12);
    this.viewCamera.rotation.order = 'YXZ';

    this.scene.name = 'World';
    this.viewScene.name = 'ViewModel';

    this.input.attach(canvas);
    this.input.sensitivity = this.settings.user.sensitivity;
    this.input.invertY = this.settings.user.invertY;

    const self = this;
    this.ctx = {
      engine: this,
      scene: this.scene,
      camera: this.camera,
      viewScene: this.viewScene,
      viewCamera: this.viewCamera,
      renderer: this.renderer,
      events: this.events,
      input: this.input,
      settings: this.settings,
      canvas: this.canvas,
      container: this.container,
      get: <T>(name: string): T => {
        const s = self.services.get(name);
        if (!s) throw new Error(`[Engine] service "${name}" not registered`);
        return s as T;
      },
      has: (name: string) => self.services.has(name),
      provide: (name: string, service: unknown) => self.services.set(name, service),
      get elapsed() {
        return self.elapsed;
      },
      get frame() {
        return self.frame;
      },
      get timeScale() {
        return self.timeScale;
      },
      set timeScale(v: number) {
        self.timeScale = v;
      },
      get paused() {
        return self.paused;
      },
      set paused(v: boolean) {
        self.setPaused(v);
      },
      get capture() {
        return self.capture;
      },
    };

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  add(system: Subsystem): this {
    this.systems.push(system);
    this.systems.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    this.services.set(system.name, system);
    return this;
  }

  provide(name: string, service: unknown) {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    return this.ctx.get<T>(name);
  }

  async init() {
    this.handleResize();
    for (const s of this.systems) {
      if (!s.init) continue;
      const t0 = performance.now();
      await s.init(this.ctx);
      const ms = performance.now() - t0;
      if (ms > 50) console.info(`[Engine] ${s.name} init ${ms.toFixed(0)}ms`);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setPaused(p: boolean) {
    if (this.paused === p) return;
    this.paused = p;
    this.events.emit('game:pause', p);
  }

  /**
   * Advance one frame manually. Used by the offline capture harness so it can
   * step deterministically without relying on rAF timing.
   */
  step(dtReal: number) {
    this.runFrame(clamp(dtReal, 0, MAX_FRAME_DT));
  }

  private tick = (now: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
    const dtReal = clamp((now - this.lastTime) / 1000, 0, MAX_FRAME_DT);
    this.lastTime = now;
    this.runFrame(dtReal);
  };

  private runFrame(dtReal: number) {
    const t0 = performance.now();
    this.frame++;

    this.input.pollGamepad(dtReal);

    if (this.paused) {
      for (const s of this.systems) s.pausedUpdate?.(dtReal, this.ctx);
      this.events.flush();
    } else {
      const dt = dtReal * this.timeScale;
      this.elapsed += dt;

      // Fixed-step simulation with an accumulator; spiral-of-death guarded by
      // capping catch-up steps.
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < 5) {
        for (const s of this.systems) s.fixedUpdate?.(FIXED_DT, this.ctx);
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (steps === 5) this.accumulator = 0;

      for (const s of this.systems) s.update?.(dt, this.ctx);
      for (const s of this.systems) s.lateUpdate?.(dt, this.ctx);
      this.events.flush();
    }

    this.renderFn?.(dtReal);
    this.input.endFrame();

    this.frameMs = this.frameMsAvg.push(performance.now() - t0);
    this.fps = this.fpsAvg.push(1 / Math.max(1e-4, dtReal));
  }

  private handleResize = () => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h;
    this.viewCamera.updateProjectionMatrix();
    for (const s of this.systems) s.resize?.(w, h, this.ctx);
  };

  private handleVisibility = () => {
    // Reset the clock so a backgrounded tab doesn't dump a huge dt on return.
    if (!document.hidden) this.lastTime = performance.now();
  };

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    for (const s of this.systems) s.dispose?.();
    this.input.dispose();
    this.renderer.dispose();
    this.events.clear();
    this.canvas.remove();
  }
}
