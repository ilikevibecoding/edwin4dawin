/**
 * Engine: renderer + post stack + a deterministic clock.
 *
 * The frame step is explicit so the same code path drives realtime play and
 * offline frame-by-frame film capture (`window.__filmStep`), which is how the
 * demo video is rendered smoothly regardless of machine speed.
 */
import * as THREE from 'three';
import { PostFX } from '../engine/postfx';
import { detectQuality, getQuality, type QualityName, type QualitySettings } from '../engine/quality';
import { patchSubsurfaceLighting } from '../engine/materials';

export type Updatable = { update: (dt: number, time: number) => void };

export type SceneSet = {
  name: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(dt: number, time: number): void;
  /** Called before the main render (reflections etc.). */
  prerender?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  dispose(): void;
  applyLook?(fx: PostFX): void;
};

export class Engine {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  fx!: PostFX;
  quality: QualitySettings;
  qualityName: QualityName;
  set: SceneSet | null = null;
  clock = { time: 0, dt: 0, frame: 0 };
  /** Fixed-timestep mode for capture. */
  deterministic = false;
  fixedDt = 1 / 30;
  private raf = 0;
  private last = 0;
  private running = false;
  private resizeQueued = true;
  onFrame?: (dt: number, time: number) => void;
  /** Debug: draw the scene straight to the screen, skipping the post stack. */
  bypassPost = false;
  fps = 0;
  private fpsAcc = 0;
  private fpsCount = 0;

  constructor(canvas: HTMLCanvasElement, quality?: QualityName) {
    this.canvas = canvas;
    this.qualityName = quality ?? detectQuality();
    this.quality = getQuality(this.qualityName);
    patchSubsurfaceLighting();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio) * this.quality.scale);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // handled in the grade pass
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = true;

    window.addEventListener('resize', () => {
      this.resizeQueued = true;
    });
  }

  get width(): number {
    return this.canvas.clientWidth || window.innerWidth;
  }
  get height(): number {
    return this.canvas.clientHeight || window.innerHeight;
  }

  initPost(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const dpr = this.renderer.getPixelRatio();
    this.fx = new PostFX(this.renderer, scene, camera, this.quality, Math.floor(this.width * dpr), Math.floor(this.height * dpr));
  }

  setSet(set: SceneSet): void {
    this.set = set;
    if (!this.fx) this.initPost(set.scene, set.camera);
    else {
      this.fx.setScene(set.scene);
      this.fx.setCamera(set.camera);
    }
    set.applyLook?.(this.fx);
    this.resizeQueued = true;
  }

  private doResize(): void {
    const w = this.width, h = this.height;
    this.renderer.setSize(w, h, false);
    const dpr = this.renderer.getPixelRatio();
    const pw = Math.max(2, Math.floor(w * dpr));
    const ph = Math.max(2, Math.floor(h * dpr));
    this.fx?.setSize(pw, ph);
    if (this.set) {
      this.set.camera.aspect = w / h;
      this.set.camera.updateProjectionMatrix();
    }
    this.resizeQueued = false;
  }

  setQuality(name: QualityName, rebuild: () => void): void {
    this.qualityName = name;
    this.quality = getQuality(name);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio) * this.quality.scale);
    this.fx?.dispose();
    const set = this.set;
    if (set) {
      this.fx = new PostFX(
        this.renderer,
        set.scene,
        set.camera,
        this.quality,
        Math.floor(this.width * this.renderer.getPixelRatio()),
        Math.floor(this.height * this.renderer.getPixelRatio()),
      );
      set.applyLook?.(this.fx);
    }
    rebuild();
  }

  /**
   * Advance simulation without rendering. Used to settle damped values
   * (focus pull, pose blends, idle motion) before capturing a still.
   */
  warm(seconds: number, dt = 0.1): void {
    const steps = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < steps; i++) {
      this.clock.time += dt;
      this.onFrame?.(dt, this.clock.time);
      this.set?.update(dt, this.clock.time);
      this.fx?.update(dt, this.clock.time);
    }
  }

  /** Advance and render exactly one frame. */
  step(dt: number): void {
    if (this.resizeQueued) this.doResize();
    const clamped = Math.min(dt, 0.1);
    this.clock.dt = clamped;
    this.clock.time += clamped;
    this.clock.frame++;
    this.onFrame?.(clamped, this.clock.time);
    const set = this.set;
    if (!set) return;
    set.update(clamped, this.clock.time);
    this.fx.update(clamped, this.clock.time);
    set.prerender?.(this.renderer, set.camera);
    if (this.bypassPost) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(set.scene, set.camera);
    } else {
      this.fx.render();
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (this.deterministic) dt = this.fixedDt;
      dt = Math.min(dt, 0.1);
      this.fpsAcc += dt;
      this.fpsCount++;
      if (this.fpsAcc > 0.5) {
        this.fps = this.fpsCount / this.fpsAcc;
        this.fpsAcc = 0;
        this.fpsCount = 0;
      }
      this.step(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  get isRunning(): boolean {
    return this.running;
  }
}
