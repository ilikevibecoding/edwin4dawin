import * as THREE from 'three';
import { EventBus } from './EventBus';
import { InputManager } from './Input';
import { createQuality, detectPreset, type QualityPreset, type QualitySettings } from './Quality';
import { Layers, type FrameClock, type GameContext, type System } from './GameContext';

const MAX_DELTA = 1 / 15;

export class Engine implements GameContext {
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  viewmodelScene = new THREE.Scene();
  viewmodelCamera!: THREE.PerspectiveCamera;
  clock: FrameClock = {
    delta: 0,
    rawDelta: 0,
    elapsed: 0,
    frame: 0,
    timeScale: 1,
    fps: 60,
  };
  input!: InputManager;
  events = new EventBus();
  quality!: QualitySettings;
  uiRoot: HTMLElement;
  canvas: HTMLCanvasElement;

  private systems: System[] = [];
  private registry = new Map<string, unknown>();
  private updatables: System[] = [];
  private lateUpdatables: System[] = [];
  private renderables: System[] = [];
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private resizeObserver?: ResizeObserver;
  private pendingResize = true;

  /** Exposed for the capture harness so screenshots can be taken deterministically. */
  paused = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, preset?: QualityPreset) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.createRenderer(preset);
    this.createCameras();
    this.input = new InputManager(canvas);

    this.scene.name = 'World';
    this.viewmodelScene.name = 'Viewmodel';
    // The viewmodel is lit by its own rig; keep world fog out of it.
    this.viewmodelScene.fog = null;
  }

  private createRenderer(preset?: QualityPreset): void {
    const contextAttributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      // Required so the capture harness can read the buffer after a frame.
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
    };

    const gl =
      (this.canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null) ??
      null;

    this.quality = createQuality(preset ?? detectPreset(gl));

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context: gl ?? undefined,
      ...contextAttributes,
    });

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio) *
        this.quality.renderScale,
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // The post chain performs tone mapping; the renderer stays linear HDR.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    const caps = this.renderer.capabilities;
    this.quality.anisotropy = Math.min(this.quality.anisotropy, caps.getMaxAnisotropy());
  }

  private createCameras(): void {
    this.camera = new THREE.PerspectiveCamera(80, 1, 0.05, this.quality.drawDistance);
    this.camera.name = 'PlayerCamera';
    this.camera.layers.enable(Layers.DEFAULT);
    this.camera.layers.enable(Layers.GLOW);
    this.camera.layers.enable(Layers.TRANSPARENT_LATE);
    // The world camera must never draw the viewmodel; it has its own pass.
    this.camera.layers.disable(Layers.VIEWMODEL);
    this.camera.layers.disable(Layers.MINIMAP);

    // A very near clip plane keeps the weapon from intersecting geometry.
    this.viewmodelCamera = new THREE.PerspectiveCamera(65, 1, 0.008, 12);
    this.viewmodelCamera.name = 'ViewmodelCamera';
    this.viewmodelCamera.layers.set(Layers.VIEWMODEL);
    this.viewmodelCamera.layers.enable(Layers.GLOW);
  }

  register(key: string, system: unknown): void {
    if (this.registry.has(key)) {
      console.warn(`[Engine] system "${key}" registered twice; replacing.`);
    }
    this.registry.set(key, system);
  }

  get<T>(key: string): T {
    const s = this.registry.get(key);
    if (s === undefined) throw new Error(`[Engine] system "${key}" is not registered`);
    return s as T;
  }

  tryGet<T>(key: string): T | undefined {
    return this.registry.get(key) as T | undefined;
  }

  add(...systems: System[]): this {
    for (const s of systems) {
      this.systems.push(s);
      this.register(s.key, s);
    }
    return this;
  }

  async init(onProgress?: (progress: number, label: string) => void): Promise<void> {
    this.systems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

    let done = 0;
    for (const system of this.systems) {
      onProgress?.(done / this.systems.length, system.key);
      this.events.emit('loading:progress', {
        progress: done / this.systems.length,
        label: system.key,
      });
      try {
        await system.init?.(this);
      } catch (err) {
        console.error(`[Engine] system "${system.key}" failed to initialise:`, err);
      }
      done++;
      // Yield so the loading UI can paint between heavy init steps.
      await new Promise((r) => setTimeout(r, 0));
    }

    this.updatables = this.systems.filter((s) => typeof s.update === 'function');
    this.lateUpdatables = this.systems.filter((s) => typeof s.lateUpdate === 'function');
    this.renderables = this.systems.filter((s) => typeof s.render === 'function');

    this.observeResize();
    this.handleResize();

    onProgress?.(1, 'ready');
    this.events.emit('loading:progress', { progress: 1, label: 'ready' });
    this.events.emit('game:ready');
  }

  private observeResize(): void {
    const onResize = () => {
      this.pendingResize = true;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(onResize);
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    }
  }

  private handleResize(): void {
    this.pendingResize = false;
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    const h = Math.max(1, parent?.clientHeight ?? window.innerHeight);

    this.renderer.setSize(w, h, false);
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = w / h;
    this.viewmodelCamera.updateProjectionMatrix();

    for (const s of this.systems) s.resize?.(size.x, size.y, this);
  }

  setQuality(preset: QualityPreset): void {
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.quality = createQuality(preset);
    this.quality.anisotropy = Math.min(this.quality.anisotropy, anisotropy);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio) *
        this.quality.renderScale,
    );
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.camera.far = this.quality.drawDistance;
    this.camera.updateProjectionMatrix();
    for (const s of this.systems) s.onQualityChange?.(this.quality, this);
    this.pendingResize = true;
    this.events.emit('quality:changed', { preset });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      this.tick(now);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick(now: number): void {
    const rawDelta = Math.min((now - this.lastTime) / 1000, 1);
    this.lastTime = now;

    if (this.pendingResize) this.handleResize();

    const c = this.clock;
    c.rawDelta = rawDelta;
    c.delta = Math.min(rawDelta, MAX_DELTA) * c.timeScale;
    c.fps += ((rawDelta > 0 ? 1 / rawDelta : 60) - c.fps) * 0.06;

    if (!this.paused) {
      c.elapsed += c.delta;
      c.frame++;
      this.step(c.delta);
    }

    this.renderer.info.reset();
  }

  /** Runs one simulation + render step. Exposed so captures can drive frames. */
  step(dt: number): void {
    this.renderer.info.reset();
    for (const s of this.updatables) {
      try {
        s.update!(dt, this);
      } catch (err) {
        console.error(`[Engine] update failed in "${s.key}":`, err);
      }
    }
    for (const s of this.lateUpdatables) {
      try {
        s.lateUpdate!(dt, this);
      } catch (err) {
        console.error(`[Engine] lateUpdate failed in "${s.key}":`, err);
      }
    }
    for (const s of this.renderables) {
      try {
        s.render!(dt, this);
      } catch (err) {
        console.error(`[Engine] render failed in "${s.key}":`, err);
      }
    }
    this.input.endFrame();
  }

  dispose(): void {
    this.stop();
    for (const s of this.systems) s.dispose?.();
    this.input.dispose();
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
