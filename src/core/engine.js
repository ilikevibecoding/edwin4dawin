import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, VignetteEffect, ChromaticAberrationEffect, NoiseEffect,
  SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode,
  BlendFunction, KernelSize, HueSaturationEffect, BrightnessContrastEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { SHOT_MODE, getParamFloat } from './utils.js';

export class Engine {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,          // post-chain SMAA instead
      stencil: false,
      depth: false,              // composer owns depth
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping note: the composer renders the world into float targets
    // (tone mapping skipped), and the post chain applies ACES itself. This
    // renderer-level setting only affects the viewmodel overlay pass, which
    // renders straight to canvas — keeping the gun consistent with the world.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SHOT_MODE ? 1 : 1.5));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.05, 900);
    this.camera.rotation.order = 'YXZ';

    // Separate scene rendered on top for the first-person viewmodel so the
    // weapon never clips into world geometry.
    this.viewmodelScene = new THREE.Scene();
    this.viewmodelCamera = new THREE.PerspectiveCamera(56, 1, 0.01, 10);

    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
    });
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // --- Ambient occlusion (ground-truth-ish, huge for grounding objects) ---
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.n8ao = new N8AOPostPass(this.scene, this.camera, w, h);
    this.n8ao.configuration.aoRadius = 1.5;
    this.n8ao.configuration.distanceFalloff = 3.0;
    this.n8ao.configuration.intensity = 2.6;
    this.n8ao.configuration.halfRes = true;
    this.n8ao.configuration.gammaCorrection = false;
    this.composer.addPass(this.n8ao);

    // --- Effects ---
    // Tight bloom: high threshold + small radius so bright speculars glow
    // without smearing streaks across facades.
    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      luminanceThreshold: 1.18,
      luminanceSmoothing: 0.2,
      intensity: 0.55,
      radius: 0.55,
      levels: 5,
    });

    this.chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00016, 0.00016),
      radialModulation: true,
      modulationOffset: 0.4,
    });

    this.vignette = new VignetteEffect({ darkness: 0.55, offset: 0.28 });

    this.grain = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE });
    this.grain.blendMode.opacity.value = 0.028;

    // Dusty war-zone grade: pull saturation down, push contrast slightly
    this.hueSat = new HueSaturationEffect({ saturation: -0.05, hue: 0.0 });
    this.brightContrast = new BrightnessContrastEffect({ brightness: 0.005, contrast: 0.07 });

    this.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });

    this.smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });

    // Convolution effects (chroma, SMAA) need their own passes.
    this.effectPass = new EffectPass(
      this.camera,
      this.bloom,
      this.hueSat,
      this.brightContrast,
      this.toneMapping,
      this.vignette,
      this.grain,
    );
    this.composer.addPass(this.effectPass);
    this.composer.addPass(new EffectPass(this.camera, this.chroma));
    this.composer.addPass(new EffectPass(this.camera, this.smaa));

    // Exposure control (pre-tonemap) via renderer
    this.exposure = getParamFloat('exposure', 1.0);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = w / h;
    this.viewmodelCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  setFov(fov) {
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  render() {
    this.renderer.toneMappingExposure = this.exposure;
    this.composer.render();
    // Viewmodel overlay: rendered after post so the gun stays crisp.
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.viewmodelScene, this.viewmodelCamera);
    this.renderer.autoClear = true;
  }
}
