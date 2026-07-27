import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, Effect,
  SMAAEffect, SMAAPreset, EdgeDetectionMode, PredicationMode,
  BloomEffect, KernelSize, BlendFunction,
  VignetteEffect, NoiseEffect, ChromaticAberrationEffect,
  ToneMappingEffect, ToneMappingMode,
  HueSaturationEffect, BrightnessContrastEffect,
  DepthOfFieldEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/** Simple exposure control effect (multiplies HDR color before tone mapping). */
class ExposureEffect extends Effect {
  constructor(exposure = 1.0) {
    super('ExposureEffect', /* glsl */`
      uniform float exposure;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
      }
    `, { uniforms: new Map([['exposure', new THREE.Uniform(exposure)]]) });
  }
  get exposure() { return this.uniforms.get('exposure').value; }
  set exposure(v) { this.uniforms.get('exposure').value = v; }
}

/**
 * Renderer + HDR post-processing pipeline.
 * Pipeline: Render -> N8AO -> (Bloom, DoF, Exposure, ToneMap ACES) -> (SMAA, CA, Vignette, Grain)
 */
export class Engine {
  constructor(container) {
    this.container = container;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in post
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 600);
    this.camera.rotation.order = 'YXZ';

    // --- Post stack -------------------------------------------------------
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
    });
    this.composer = composer;

    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);

    const w = window.innerWidth, h = window.innerHeight;
    const n8ao = new N8AOPostPass(this.scene, this.camera, w, h);
    n8ao.configuration.aoRadius = 1.7;         // tighter contact occlusion
    n8ao.configuration.distanceFalloff = 2.2;
    n8ao.configuration.intensity = 3.6;
    n8ao.configuration.halfRes = true;
    n8ao.configuration.color = new THREE.Color(0x0a0806);
    n8ao.setQualityMode('High');
    composer.addPass(n8ao);
    this.n8ao = n8ao;

    this.bloom = new BloomEffect({
      intensity: 0.55,
      luminanceThreshold: 1.0,
      luminanceSmoothing: 0.4,
      mipmapBlur: true,
      radius: 0.72,
      levels: 7,
    });
    this.dof = new DepthOfFieldEffect(this.camera, {
      focusDistance: 0.02,
      focalLength: 0.2,
      bokehScale: 3.0,
      height: 480,
    });
    this.dof.blendMode.opacity.value = 0; // enabled during ADS only
    this.exposureFx = new ExposureEffect(1.0);
    this.toneMap = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.hdrPass = new EffectPass(this.camera, this.dof, this.bloom, this.exposureFx, this.toneMap);
    composer.addPass(this.hdrPass);

    this.smaa = new SMAAEffect({
      preset: SMAAPreset.HIGH,
      edgeDetectionMode: EdgeDetectionMode.COLOR,
      predicationMode: PredicationMode.DEPTH,
    });
    this.smaaPass = new EffectPass(this.camera, this.smaa);
    composer.addPass(this.smaaPass);

    this.chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00018, 0.00018), // subtle: avoids rainbow fringe on wires
      radialModulation: true,
      modulationOffset: 0.28,
    });
    this.vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
    this.grain = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE, premultiply: true });
    this.grain.blendMode.opacity.value = 0.04;
    this.colorGrade = new HueSaturationEffect({ saturation: 0.06, hue: 0.0 });
    this.contrast = new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.06 });
    this.ldrPass = new EffectPass(this.camera, this.chromatic, this.colorGrade, this.contrast, this.vignette, this.grain);
    this.ldrPass.dithering = true; // kill sky gradient banding
    composer.addPass(this.ldrPass);

    window.addEventListener('resize', () => this.resize());
  }

  setExposure(v) { this.exposureFx.exposure = v; }

  /** ADS depth-of-field toggle (0..1 blend). */
  setDofAmount(v) { this.dof.blendMode.opacity.value = v; }
  setDofTarget(worldPos) { if (worldPos) this.dof.target = worldPos; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  render(dt) {
    this.composer.render(dt);
  }
}
