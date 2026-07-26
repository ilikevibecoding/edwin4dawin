import * as THREE from 'three';
import { Time } from './Time';
import { Input } from './Input';
import { EventBus } from './EventBus';
import { GAMEPLAY, type QualityConfig } from './Config';
import type { EngineContext, System } from './System';
import { clamp } from './MathUtils';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  config: QualityConfig;
}

/**
 * Owns the render loop, the subsystem graph and the adaptive resolution
 * controller. Systems are updated in explicit `order`, with physics on a fixed
 * step and everything else on a variable step.
 */
export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly viewScene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly viewCamera: THREE.PerspectiveCamera;
  readonly time = new Time();
  readonly input: Input;
  readonly events = new EventBus();
  config: QualityConfig;

  readonly size = { width: 1920, height: 1080, dpr: 1 };

  private readonly systems: System[] = [];
  private readonly byName = new Map<string, System>();
  private readonly ctx: EngineContext;
  private rafId = 0;
  private running = false;
  private started = false;
  private paused = false;

  /** Set by the render system; when present the engine defers presentation to it. */
  renderHook: ((ctx: EngineContext) => void) | null = null;

  // Adaptive resolution state
  private adaptiveEnabled = true;
  private currentScale: number;
  private scaleAccum = 0;
  private readonly targetFrameMs = 1000 / 60;

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    this.config = opts.config;
    this.currentScale = this.config.renderScale;

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false, // handled by the post stack
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.config.shadowsEnabled;
    this.renderer.shadowMap.type = this.config.softShadows
      ? THREE.PCFSoftShadowMap
      : THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.info.autoReset = false;
    this.renderer.debug.checkShaderErrors = import.meta.env?.DEV ?? false;

    this.scene = new THREE.Scene();
    this.scene.name = 'World';
    this.viewScene = new THREE.Scene();
    this.viewScene.name = 'Viewmodel';

    this.camera = new THREE.PerspectiveCamera(
      GAMEPLAY.camera.baseFov,
      1,
      GAMEPLAY.camera.near,
      GAMEPLAY.camera.far,
    );
    this.camera.name = 'MainCamera';
    this.camera.rotation.order = 'YXZ';

    // The viewmodel gets its own narrow FOV so the weapon does not warp at the
    // wide FOVs competitive players prefer — standard practice in modern FPS.
    this.viewCamera = new THREE.PerspectiveCamera(GAMEPLAY.camera.viewmodelFov, 1, 0.005, 12);
    this.viewCamera.name = 'ViewmodelCamera';

    this.input = new Input(opts.canvas);

    this.ctx = {
      engine: this,
      scene: this.scene,
      viewScene: this.viewScene,
      camera: this.camera,
      viewCamera: this.viewCamera,
      renderer: this.renderer,
      time: this.time,
      input: this.input,
      events: this.events,
      config: this.config,
      size: this.size,
      get: <T extends System>(name: string): T => {
        const s = this.byName.get(name);
        if (!s) throw new Error(`[Engine] required system "${name}" is not registered`);
        return s as T;
      },
      tryGet: <T extends System>(name: string): T | undefined =>
        this.byName.get(name) as T | undefined,
    };

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.handleResize();
  }

  get context(): EngineContext {
    return this.ctx;
  }

  add<T extends System>(system: T): T {
    if (this.byName.has(system.name)) {
      throw new Error(`[Engine] duplicate system name "${system.name}"`);
    }
    this.byName.set(system.name, system);
    this.systems.push(system);
    this.systems.sort((a, b) => (a.order ?? 500) - (b.order ?? 500));
    return system;
  }

  get<T extends System>(name: string): T {
    return this.ctx.get<T>(name);
  }

  tryGet<T extends System>(name: string): T | undefined {
    return this.ctx.tryGet<T>(name);
  }

  /** Initialise systems in dependency order, reporting progress 0..1. */
  async init(onProgress?: (fraction: number, label: string) => void): Promise<void> {
    const ordered = this.topoSort();
    for (let i = 0; i < ordered.length; i++) {
      const s = ordered[i];
      onProgress?.(i / ordered.length, s.name);
      // Yield so the loading screen can actually paint between heavy steps.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await s.init?.(this.ctx);
    }
    onProgress?.(1, 'ready');
    this.started = true;
  }

  private topoSort(): System[] {
    const result: System[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (s: System): void => {
      if (visited.has(s.name)) return;
      if (visiting.has(s.name)) {
        throw new Error(`[Engine] circular system dependency at "${s.name}"`);
      }
      visiting.add(s.name);
      for (const dep of s.dependencies ?? []) {
        const d = this.byName.get(dep);
        if (!d) throw new Error(`[Engine] "${s.name}" depends on missing system "${dep}"`);
        visit(d);
      }
      visiting.delete(s.name);
      visited.add(s.name);
      result.push(s);
    };

    for (const s of this.systems) visit(s);
    return result;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.time.start(performance.now());
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.events.emit('engine:paused', paused);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  applyQuality(config: QualityConfig): void {
    this.config = config;
    Object.assign(this.ctx.config as QualityConfig, config);
    this.currentScale = config.renderScale;
    this.renderer.shadowMap.enabled = config.shadowsEnabled;
    this.renderer.shadowMap.type = config.softShadows
      ? THREE.PCFSoftShadowMap
      : THREE.PCFShadowMap;
    this.renderer.shadowMap.needsUpdate = true;
    this.handleResize();
    for (const s of this.systems) s.onQualityChanged?.(config, this.ctx);
    this.events.emit('engine:quality', config);
  }

  setAdaptiveResolution(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
    if (!enabled) {
      this.currentScale = this.config.renderScale;
      this.handleResize();
    }
  }

  private readonly loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const frameStart = now;
    const steps = this.time.tick(now);
    this.renderer.info.reset();

    if (!this.started) return;

    if (!this.paused) {
      const fixed = this.time.fixedStep;
      for (let i = 0; i < steps; i++) {
        for (const s of this.systems) s.fixedUpdate?.(fixed, this.ctx);
      }
      const dt = this.time.delta;
      for (const s of this.systems) s.update?.(dt, this.ctx);
      for (const s of this.systems) s.lateUpdate?.(dt, this.ctx);
    } else {
      // Menus and UI still need to animate while paused.
      const dt = this.time.deltaUnscaled;
      for (const s of this.systems) {
        if (s.name === 'ui' || s.name === 'audio') s.update?.(dt, this.ctx);
      }
    }

    if (this.renderHook) {
      this.renderHook(this.ctx);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.input.endFrame();

    if (this.adaptiveEnabled) this.updateAdaptiveScale(performance.now() - frameStart);
  };

  /**
   * Nudge internal resolution to hold ~60fps. Moves in small steps with a long
   * settle time so the change is imperceptible rather than a visible pop.
   */
  private updateAdaptiveScale(frameMs: number): void {
    const target = this.targetFrameMs;
    this.scaleAccum += this.time.deltaUnscaled;
    if (this.scaleAccum < 0.5) return;
    this.scaleAccum = 0;

    const maxScale = this.config.renderScale;
    const minScale = Math.max(0.5, maxScale * 0.55);
    let next = this.currentScale;

    if (frameMs > target * 1.25) next -= 0.05;
    else if (frameMs < target * 0.75) next += 0.025;

    next = clamp(next, minScale, maxScale);
    if (Math.abs(next - this.currentScale) > 0.001) {
      this.currentScale = next;
      this.handleResize();
    }
  }

  private readonly handleResize = (): void => {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.maxPixelRatio);
    const scale = this.currentScale;

    this.size.width = Math.max(1, Math.floor(w * dpr * scale));
    this.size.height = Math.max(1, Math.floor(h * dpr * scale));
    this.size.dpr = dpr * scale;

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.size.width, this.size.height, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = aspect;
    this.viewCamera.updateProjectionMatrix();

    for (const s of this.systems) s.resize?.(this.size.width, this.size.height, this.ctx);
    this.events.emit('engine:resize', this.size);
  };

  private readonly handleVisibility = (): void => {
    if (document.hidden) this.setPaused(true);
  };

  /** Force a resize recompute (used after UI layout changes). */
  invalidateSize(): void {
    this.handleResize();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    for (const s of [...this.systems].reverse()) s.dispose?.();
    this.systems.length = 0;
    this.byName.clear();
    this.input.dispose();
    this.events.clear();
    this.renderer.dispose();
  }
}
