import * as THREE from 'three';
import { PostFX } from '../render/PostFX';
import { GRADE } from '../render/LookConfig';
import { detectTier, getTier, type QualitySettings, type TierName } from './Quality';
import { GameClock } from './Time';
import { Input } from './Input';
import { Assets } from './Assets';

export interface Stage {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  update(dt: number, time: number): void;
  /** Optional pass that must run before the frame is composed (mirror pass). */
  preRender?(renderer: THREE.WebGLRenderer, time: number): void;
  dispose(): void;
}

export type RunMode = 'realtime' | 'fixed';

export interface EngineOptions {
  tier?: TierName;
  mode?: RunMode;
  /** Fixed timestep in seconds, used when mode is 'fixed'. */
  fixedStep?: number;
  width?: number;
  height?: number;
}

/**
 * Owns the renderer, the frame loop and the shared services. Two loop modes:
 * 'realtime' for play, and 'fixed' for deterministic offline capture where the
 * caller drives one exact timestep per saved frame.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly clock = new GameClock();
  readonly input: Input;
  readonly assets = new Assets();
  readonly quality: QualitySettings;
  readonly mode: RunMode;
  readonly fixedStep: number;

  postFX: PostFX | null = null;
  stage: Stage | null = null;

  private displayWidth: number;
  private displayHeight: number;
  private running = false;
  private lastTime = 0;
  private rafHandle = 0;
  private frameCallbacks: ((dt: number) => void)[] = [];

  frameCount = 0;
  lastFrameMs = 0;
  smoothedFps = 0;

  constructor(container: HTMLElement, opts: EngineOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      // Offline capture reads the frame back for exposure metering, which only
      // works if the drawing buffer survives past the end of the frame.
      preserveDrawingBuffer: (opts.mode ?? 'realtime') === 'fixed',
    });
    const gl = this.renderer.getContext();
    const tier = opts.tier ?? detectTier(gl);
    this.quality = getTier(tier);
    this.mode = opts.mode ?? 'realtime';
    this.fixedStep = opts.fixedStep ?? 1 / 24;

    this.displayWidth = opts.width ?? container.clientWidth ?? window.innerWidth;
    this.displayHeight = opts.height ?? container.clientHeight ?? window.innerHeight;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.maxPixelRatio));
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = this.quality.softShadows
      ? THREE.PCFSoftShadowMap
      : THREE.PCFShadowMap;
    // Tone mapping happens in the composer, not here.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = false;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.input = new Input(canvas);
    this.applySize();

    if (this.mode === 'realtime') {
      window.addEventListener('resize', () => {
        this.displayWidth = container.clientWidth || window.innerWidth;
        this.displayHeight = container.clientHeight || window.innerHeight;
        this.applySize();
      });
    }
  }

  get width(): number {
    return this.displayWidth;
  }

  get height(): number {
    return this.displayHeight;
  }

  private applySize(): void {
    const scale = this.quality.renderScale;
    const w = Math.max(320, Math.round(this.displayWidth * scale));
    const h = Math.max(180, Math.round(this.displayHeight * scale));
    this.renderer.setSize(w, h, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.postFX?.setSize(w, h);
    if (this.stage) {
      this.stage.camera.aspect = this.displayWidth / this.displayHeight;
      this.stage.camera.updateProjectionMatrix();
    }
  }

  setStage(stage: Stage, grade: keyof typeof GRADE = 'noirRain'): void {
    this.stage = stage;
    stage.camera.aspect = this.displayWidth / this.displayHeight;
    stage.camera.updateProjectionMatrix();
    if (!this.postFX) {
      this.postFX = new PostFX(this.renderer, stage.scene, stage.camera, this.quality, grade);
      this.applySize();
    } else {
      this.postFX.setScene(stage.scene);
      this.postFX.setCamera(stage.camera);
      this.postFX.applyGrade(grade);
    }
  }

  onFrame(cb: (dt: number) => void): void {
    this.frameCallbacks.push(cb);
  }

  /**
   * Advances the simulation and renders exactly one frame.
   *
   * With `draw` false the frame is simulated but not drawn. Nothing in the game's
   * state depends on the image — the camera, the performances and the story
   * timers are all functions of the clock — so this is how an interrupted offline
   * capture fast-forwards back to where it stopped instead of starting over.
   */
  step(dt: number, opts: { draw?: boolean } = {}): void {
    const draw = opts.draw ?? true;
    const t0 = performance.now();
    this.clock.advance(dt);
    for (const cb of this.frameCallbacks) cb(this.clock.dt);
    this.stage?.update(this.clock.dt, this.clock.time);
    this.postFX?.update(this.clock.realDt, this.clock.realTime);
    if (draw) {
      this.renderer.info.reset();
      this.stage?.preRender?.(this.renderer, this.clock.time);
      if (this.postFX) this.postFX.render(this.clock.dt);
      else if (this.stage) this.renderer.render(this.stage.scene, this.stage.camera);
    }
    this.input.endFrame(this.clock.time);
    this.frameCount++;
    this.lastFrameMs = performance.now() - t0;
    this.smoothedFps = this.smoothedFps
      ? this.smoothedFps * 0.9 + (1000 / Math.max(1, this.lastFrameMs)) * 0.1
      : 1000 / Math.max(1, this.lastFrameMs);
  }

  start(): void {
    if (this.mode === 'fixed') return; // capture harness drives the loop
    this.running = true;
    this.lastTime = performance.now();
    const loop = (): void => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.step(dt);
      this.rafHandle = requestAnimationFrame(loop);
    };
    this.rafHandle = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
  }

  get triangleCount(): number {
    return this.renderer.info.render.triangles;
  }
}
