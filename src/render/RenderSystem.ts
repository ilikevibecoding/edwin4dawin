import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualityTier } from '../core/Settings';
import { FinalGradeShader } from './shaders';
import { DofPass } from './DofPass';
import { clamp01, damp } from '../core/math';

/**
 * Owns the WebGL renderer and the post-processing chain.
 *
 * Chain: [scene render (+ optional defocus)] -> bloom -> ACES output -> grade.
 * Bloom is thresholded above 1.0 so only genuinely emissive surfaces (engines,
 * bolts, holograms, lit controls) glow — hull highlights stay crisp.
 */
export class RenderSystem {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  composer!: EffectComposer;

  private renderPass!: RenderPass;
  private dofPass: DofPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass!: ShaderPass;
  private outputPass!: OutputPass;

  private tier!: QualityTier;
  private scene: THREE.Scene;
  private width = 1280;
  private height = 720;

  /** 0 = fully visible, 1 = fully faded to `fadeColor`. */
  fade = 0;
  readonly fadeColor = new THREE.Color(0x000000);
  /** Extra bloom applied briefly by dramatic beats. */
  bloomBoost = 0;
  private bloomBoostCurrent = 0;

  dofEnabled = false;
  dofFocus = 40;
  dofRange = 60;
  dofStrength = 1;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, tier: QualityTier) {
    this.scene = scene;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true, // required for QA screenshot capture
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 1, 400000);
    this.camera.name = 'MainCamera';

    this.applyTier(tier);
  }

  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    this.renderPass.scene = scene;
    this.dofPass?.setScene(scene);
  }

  /** Rebuild the post chain for a new quality tier. */
  applyTier(tier: QualityTier): void {
    this.tier = tier;
    this.renderer.shadowMap.enabled = tier.shadows;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.maxPixelRatio));
    this.buildComposer();
    this.setSize(this.width, this.height);
  }

  private buildComposer(): void {
    this.composer?.dispose();
    this.dofPass?.dispose();
    this.dofPass = null;

    const rt = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.renderPass.clearAlpha = 1;

    if (this.tier.depthOfField) {
      this.dofPass = new DofPass(this.scene, this.camera, this.width, this.height);
      this.composer.addPass(this.dofPass);
    } else {
      this.composer.addPass(this.renderPass);
    }

    if (this.tier.bloom) {
      // Threshold above 1.0: the interior is a white room lit to near full
      // diffuse, so anything lower makes the walls themselves glow.
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        this.tier.bloomStrength,
        0.58,
        1.05,
      );
      this.composer.addPass(this.bloomPass);
    } else {
      this.bloomPass = null;
    }

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.gradePass = new ShaderPass(FinalGradeShader as ConstructorParameters<typeof ShaderPass>[0]);
    this.gradePass.material.depthTest = false;
    this.gradePass.material.depthWrite = false;
    this.gradePass.renderToScreen = true;
    this.composer.addPass(this.gradePass);
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(2, Math.floor(width));
    this.height = Math.max(2, Math.floor(height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.maxPixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    // Widen the vertical FOV on tall/narrow viewports so framing survives.
    const baseFov = 46;
    const aspect = this.camera.aspect;
    this.camera.fov = aspect < 1.4 ? baseFov * (1.4 / Math.max(0.6, aspect)) * 0.82 : baseFov;
    this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.gradePass.material.uniforms.uResolution.value = [this.width * pr, this.height * pr];
  }

  update(dt: number, elapsed: number): void {
    const u = this.gradePass.material.uniforms;
    u.uTime.value = elapsed;
    u.uFade.value = clamp01(this.fade);
    u.uFadeColor.value = [this.fadeColor.r, this.fadeColor.g, this.fadeColor.b];

    if (this.bloomPass) {
      this.bloomBoostCurrent = damp(this.bloomBoostCurrent, this.bloomBoost, 0.18, dt);
      this.bloomPass.strength = this.tier.bloomStrength + this.bloomBoostCurrent;
      this.bloomBoost = damp(this.bloomBoost, 0, 0.35, dt);
    }
    if (this.dofPass) {
      this.dofPass.focus = this.dofFocus;
      this.dofPass.range = this.dofRange;
      this.dofPass.strength = this.dofEnabled ? this.dofStrength : 0;
    }
  }

  render(): void {
    this.renderer.info.reset();
    this.composer.render();
  }

  /** Draw a single frame ignoring the animation loop — used by QA capture. */
  renderOnce(): void {
    this.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.dofPass?.dispose();
    this.renderer.dispose();
  }
}
