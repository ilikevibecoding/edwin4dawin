/**
 * Owns the renderer, camera, post chain and frame loop.
 *
 * The clock runs in two modes: real time (requestAnimationFrame) for play, and a
 * deterministic fixed step driven from outside, which the offline recorder uses
 * so a slow software rasteriser still produces correctly-paced video.
 */
import * as THREE from 'three';
import { buildPostFX, type PostFXHandles, type QualityTier } from './PostFX';
import { buildSky, type SkyConfig, type SkyPreset, type SkyResult } from './Sky';
import { setTextureCapabilities } from './Textures';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  tier?: QualityTier;
  width?: number;
  height?: number;
  maxPixelRatio?: number;
}

export type UpdateFn = (dt: number, elapsed: number) => void;

function detectTier(): QualityTier {
  const params = new URLSearchParams(location.search);
  const forced = params.get('q') as QualityTier | null;
  if (forced && ['low', 'medium', 'high', 'ultra'].includes(forced)) return forced;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores >= 8) return 'ultra';
  if (cores >= 6) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  readonly fx: PostFXHandles;
  readonly tier: QualityTier;
  sky: SkyResult | null = null;

  private updaters: UpdateFn[] = [];
  private running = false;
  private lastTime = 0;
  private rafId = 0;
  elapsed = 0;
  frameCount = 0;
  /** Set > 0 to advance time in fixed increments regardless of wall clock. */
  fixedStep = 0;

  private targetSize = new THREE.Vector2(1920, 1080);
  private autoResize = true;

  constructor(opts: StageOptions) {
    this.tier = opts.tier ?? detectTier();
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping happens in the post chain, not here.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    setTextureCapabilities(this.renderer);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.maxPixelRatio ?? (this.tier === 'ultra' ? 1.5 : 1)));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.08, 400);
    this.camera.position.set(0, 1.65, 4);
    this.fx = buildPostFX(this.renderer, this.scene, this.camera, this.tier);

    if (opts.width && opts.height) {
      this.autoResize = false;
      this.setSize(opts.width, opts.height);
    } else {
      this.setSize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', () => {
        if (this.autoResize) this.setSize(window.innerWidth, window.innerHeight);
      });
    }
  }

  setSize(w: number, h: number) {
    this.targetSize.set(w, h);
    this.renderer.setSize(w, h, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fx.setSize(w, h);
  }

  get size(): THREE.Vector2 {
    return this.targetSize;
  }

  setCamera(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    camera.aspect = this.targetSize.x / this.targetSize.y;
    camera.updateProjectionMatrix();
    this.fx.setCamera(camera);
  }

  setSky(preset: SkyPreset | SkyConfig, opts: { size?: number; showBackground?: boolean } = {}) {
    this.sky?.dispose();
    this.sky = buildSky(this.renderer, preset, { size: opts.size ?? (this.tier === 'low' ? 128 : 256) });
    this.scene.environment = this.sky.environment;
    this.scene.background = opts.showBackground === false ? null : this.sky.background;
    return this.sky;
  }

  onUpdate(fn: UpdateFn) {
    this.updaters.push(fn);
    return () => {
      const i = this.updaters.indexOf(fn);
      if (i >= 0) this.updaters.splice(i, 1);
    };
  }

  clearUpdaters() {
    this.updaters.length = 0;
  }

  /** Advances simulation and renders exactly one frame. */
  step(dt: number) {
    const clamped = Math.min(dt, 0.2);
    this.elapsed += clamped;
    this.frameCount++;
    for (const fn of this.updaters.slice()) fn(clamped, this.elapsed);
    this.fx.render(clamped);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = this.fixedStep > 0 ? this.fixedStep : Math.min((now - this.lastTime) / 1000, 0.1) || 1 / 60;
    this.lastTime = now;
    this.step(dt);
    this.rafId = requestAnimationFrame(this.loop);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  get isRunning() {
    return this.running;
  }
}
