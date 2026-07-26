import * as THREE from 'three';
import { Time } from './Time';
import { Input } from './Input';
import { Signals } from './Signals';
import { QUALITY, SHOT_MODE } from './Config';
import type { EngineContext, System } from './System';
import { RenderPipeline } from '../render/RenderPipeline';

/**
 * Owns the render loop, the WebGL device, and the ordered system registry.
 *
 * Two scenes are maintained: `scene` for the world and `viewScene` for the
 * first-person view model. They are rendered with different cameras (and
 * therefore different near planes and FOVs) into the same HDR buffer, which
 * keeps the weapon out of the world's depth range — no clipping through
 * geometry — while still letting it receive bloom, grain, and grading.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly viewScene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly viewCamera: THREE.PerspectiveCamera;
  readonly time = new Time();
  readonly input: Input;
  readonly pipeline: RenderPipeline;

  private readonly systems: System[] = [];
  private readonly byName = new Map<string, System>();
  private readonly ctx: EngineContext;
  private running = false;
  private rafId = 0;
  private readonly canvas: HTMLCanvasElement;
  private lastW = 0;
  private lastH = 0;

  /** Set false while paused/menu so systems can skip simulation. */
  simulating = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // handled by SMAA/TAA in the post stack
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: SHOT_MODE,
      logarithmicDepthBuffer: false,
    });

    // Silent shader failures render as a black screen with no other symptom,
    // which is far more expensive to diagnose than the one-off compile cost.
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // The post stack owns tonemapping; the scene renders in linear HDR.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = QUALITY.softShadows
      ? THREE.VSMShadowMap
      : THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(0x000000, 1);
    // The pipeline composites several scenes into one target, so it clears
    // explicitly. Leaving autoClear on would wipe the world immediately
    // before the view model is drawn over it.
    this.renderer.autoClear = false;

    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(80, aspect, 0.05, 3000);
    this.camera.rotation.order = 'YXZ';
    // View model sits in its own depth range with a tighter FOV, which is what
    // makes a weapon read as "held" rather than "pasted on".
    this.viewCamera = new THREE.PerspectiveCamera(60, aspect, 0.005, 12);
    this.viewCamera.rotation.order = 'YXZ';

    this.scene.matrixWorldAutoUpdate = true;
    this.viewScene.matrixWorldAutoUpdate = true;

    this.input = new Input(canvas);
    this.pipeline = new RenderPipeline(this);

    this.ctx = {
      engine: this,
      scene: this.scene,
      viewScene: this.viewScene,
      camera: this.camera,
      viewCamera: this.viewCamera,
      renderer: this.renderer,
      time: this.time,
      input: this.input,
      get: <T extends System>(name: string) => this.byName.get(name) as T | undefined,
    };

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  get context(): EngineContext {
    return this.ctx;
  }

  add(system: System): this {
    this.systems.push(system);
    this.byName.set(system.name, system);
    this.systems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return this;
  }

  get<T extends System>(name: string): T | undefined {
    return this.byName.get(name) as T | undefined;
  }

  async initSystems(onProgress?: (label: string, frac: number) => void): Promise<void> {
    const ordered = [...this.systems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (let i = 0; i < ordered.length; i++) {
      const s = ordered[i];
      onProgress?.(s.name, i / ordered.length);
      // Yield so the loading screen can actually paint between systems.
      await new Promise((r) => requestAnimationFrame(r));
      await s.init?.(this.ctx);
    }
    onProgress?.('ready', 1);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.frame);
    this.tick(now);
  };

  /** Exposed for the deterministic screenshot harness. */
  tick(now: number): void {
    this.time.begin(now);
    this.renderer.info.reset();
    this.input.pollGamepad();

    const dt = this.time.dt;

    if (this.simulating) {
      let steps = 0;
      while (this.time.consumeFixed() && steps < 8) {
        for (const s of this.systems) s.fixedUpdate?.(this.time.fixedStep, this.ctx);
        steps++;
      }
      for (const s of this.systems) s.update?.(dt, this.ctx);
    } else {
      // Menus and HUD still animate while paused.
      for (const s of this.systems) {
        if (s.name === 'hud' || s.name === 'menu' || s.name === 'audio') {
          s.update?.(this.time.rawDt, this.ctx);
        }
      }
    }

    for (const s of this.systems) s.lateUpdate?.(dt, this.ctx);

    this.pipeline.render(dt);
    this.input.endFrame();
  }

  private onResize = (): void => {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;

    const dpr = Math.min(window.devicePixelRatio || 1, QUALITY.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = aspect;
    this.viewCamera.updateProjectionMatrix();

    this.pipeline.resize(w, h, dpr);
    for (const s of this.systems) s.resize?.(w, h);
    Signals.emit('engine:resize', { width: w, height: h, dpr });
  };

  /** Force a resize recompute (used after a quality change). */
  refreshSize(): void {
    this.lastW = 0;
    this.onResize();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    for (const s of this.systems) s.dispose?.();
    this.pipeline.dispose();
    this.input.dispose();
    this.renderer.dispose();
    Signals.clear();
  }
}
