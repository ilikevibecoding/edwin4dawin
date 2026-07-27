import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, Effect,
  BloomEffect, VignetteEffect, ChromaticAberrationEffect,
  SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode,
  BlendFunction, KernelSize, HueSaturationEffect, BrightnessContrastEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { SHOT_MODE, getParamFloat } from './utils.js';

// Luminance-weighted film grain. The stock NoiseEffect + COLOR_DODGE read as
// one-sided white speckle (worst against the bright sky). This applies gentle
// SIGNED noise in sRGB space, weighted to the midtones: it ramps in above the
// deepest blacks and fades to zero on bright pixels, so the sky stays clean.
// Lives inside the existing EffectPass — not a new pass. `rand()` comes from
// three's <common> chunk, same hash NoiseEffect uses (SwiftShader-safe).
class FilmGrainEffect extends Effect {
  constructor(strength = 0.016) {
    super('FilmGrainEffect', /* glsl */`
      uniform float strength;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float n = rand(uv * (1.0 + time)) - 0.5;
        float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
        float w = smoothstep(0.03, 0.12, lum) * (1.0 - smoothstep(0.30, 0.52, lum));
        outputColor = vec4(inputColor.rgb + n * strength * w, inputColor.a);
      }
    `, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['strength', new THREE.Uniform(strength)]]),
    });
    this.inputColorSpace = THREE.SRGBColorSpace;
  }
}

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
    // (tone mapping skipped), and the post chain applies AgX itself. This
    // renderer-level setting only affects the viewmodel overlay pass, which
    // renders straight to canvas — keeping the gun consistent with the world.
    this.renderer.toneMapping = THREE.AgXToneMapping;
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
    this.n8ao.configuration.aoRadius = 2.7;
    this.n8ao.configuration.distanceFalloff = 4.0;
    this.n8ao.configuration.intensity = 3.9;
    // Full-res AO for screenshots (half-res washes it out at 720p); half-res
    // stays for realtime play where perf matters.
    this.n8ao.configuration.halfRes = !SHOT_MODE;
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

    this.grain = new FilmGrainEffect(0.016);

    // Dusty war-zone grade. AgX flattens/desaturates on its own, so the grade
    // adds back contrast and a touch of warmth instead of removing them.
    // Contrast pivots at sRGB 0.5, so the old 0.12 clipped everything below
    // sRGB 0.06 to pure black; 0.05 + a small positive brightness keeps the
    // shadowed storefronts above the floor while mids/highs barely move.
    this.hueSat = new HueSaturationEffect({ saturation: 0.06, hue: 0.0 });
    this.brightContrast = new BrightnessContrastEffect({ brightness: 0.010, contrast: 0.05 });

    // AgX rolls highlights off far more gracefully than ACES (no screaming
    // bloom edges); it runs a touch darker/flatter, compensated below.
    this.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });

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

    // Exposure control (pre-tonemap) via renderer. AgX sits darker than ACES
    // at the same exposure, so the default gets a lift.
    this.exposure = getParamFloat('exposure', 1.18);

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
