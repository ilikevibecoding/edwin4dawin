import * as THREE from 'three';
import { PostProcess } from './PostProcess';
import { QUALITY_TIERS, type QualityName, type QualitySettings } from './Quality';
import { clamp } from './MathX';

/**
 * Owns the WebGL context and the two-layer render (deep background scene for
 * the planet and stars, near scene for everything the camera can reach).
 *
 * Splitting the passes keeps depth precision sane: a planet 30 km away and a
 * corridor panel 40 cm away never share a depth range.
 */
export class RenderSystem {
  readonly renderer: THREE.WebGLRenderer;
  readonly post: PostProcess;
  /** Distant matte: planet, starfield, sun. Rendered first, depth cleared after. */
  readonly bgScene = new THREE.Scene();
  /** Everything interactive: ships, corridor, characters, effects. */
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly bgCamera: THREE.PerspectiveCamera;

  quality: QualitySettings;
  private cssWidth = 1280;
  private cssHeight = 720;
  private renderPixelRatio = 1;

  /** Parallax damping for the background scene; 0 = infinitely far away. */
  bgParallax = 0.0;

  constructor(canvas: HTMLCanvasElement, qualityName: QualityName) {
    this.quality = QUALITY_TIERS[qualityName];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // handled in the composite pass
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;

    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.35, 24000);
    this.bgCamera = new THREE.PerspectiveCamera(42, 16 / 9, 100, 4_000_000);

    this.post = new PostProcess(this.renderer, this.quality);
    this.resize(canvas.clientWidth || 1280, canvas.clientHeight || 720);
  }

  get maxAnisotropy(): number {
    return Math.min(this.quality.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  setQuality(name: QualityName): void {
    this.quality = QUALITY_TIERS[name];
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.post.setQuality(this.quality);
    this.applyPixelRatio();
  }

  private applyPixelRatio(): void {
    const dpr = clamp(
      (window.devicePixelRatio || 1) * this.quality.pixelRatioScale,
      0.5,
      this.quality.maxPixelRatio,
    );
    this.renderPixelRatio = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.cssWidth, this.cssHeight, false);
    this.post.setSize(Math.round(this.cssWidth * dpr), Math.round(this.cssHeight * dpr));
  }

  resize(cssWidth: number, cssHeight: number): void {
    this.cssWidth = Math.max(2, Math.floor(cssWidth));
    this.cssHeight = Math.max(2, Math.floor(cssHeight));
    const aspect = this.cssWidth / this.cssHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.bgCamera.aspect = aspect;
    this.bgCamera.updateProjectionMatrix();
    this.applyPixelRatio();
  }

  get drawingBufferSize(): { width: number; height: number } {
    return {
      width: Math.round(this.cssWidth * this.renderPixelRatio),
      height: Math.round(this.cssHeight * this.renderPixelRatio),
    };
  }

  get pixelRatio(): number {
    return this.renderPixelRatio;
  }

  render(time: number): void {
    const r = this.renderer;

    // Background camera mirrors orientation and field of view but only a
    // fraction of the translation, so distant objects parallax gently.
    this.bgCamera.fov = this.camera.fov;
    this.bgCamera.aspect = this.camera.aspect;
    this.bgCamera.quaternion.copy(this.camera.quaternion);
    this.bgCamera.position.copy(this.camera.position).multiplyScalar(this.bgParallax);
    this.bgCamera.updateProjectionMatrix();
    this.bgCamera.updateMatrixWorld();

    this.post.beginScene();
    r.autoClear = false;
    r.clear(true, true, false);
    r.render(this.bgScene, this.bgCamera);
    r.clearDepth();
    r.render(this.scene, this.camera);
    this.post.present(time, this.camera);
  }

  dispose(): void {
    this.post.dispose();
    this.renderer.dispose();
  }
}
