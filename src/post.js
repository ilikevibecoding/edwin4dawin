/**
 * post.js — the composite chain.
 *
 *   RenderPass(space)              clears colour + depth, draws the exterior
 *   RenderPass(interior)           depth-only clear, draws the ship over it
 *   N8AOPostPass(interior)         ground-truth-ish AO from the interior depth
 *   EffectPass                     bloom -> ACES -> grade -> vignette -> grain -> SMAA
 */
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, Effect,
  BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
  NoiseEffect, SMAAEffect, HueSaturationEffect, BrightnessContrastEffect,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/**
 * Matte-black lift. `mix(lift, 1, c)` raises pure black to `lift` while leaving
 * white at 1 and moving mid-grey by only (1-c)*lift, so shadows stop clipping to
 * zero without the whole image going milky. Runs *after* the vignette so the
 * darkened corners are lifted too — that is where most of the clipping was.
 */
const shadowLiftFrag = /* glsl */`
  uniform float lift;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = vec4(mix(vec3(lift), vec3(1.0), inputColor.rgb), inputColor.a);
  }`;

class ShadowLiftEffect extends Effect {
  constructor(lift = 0.022) {
    super('ShadowLiftEffect', shadowLiftFrag, {
      uniforms: new Map([['lift', new THREE.Uniform(lift)]]),
    });
  }
  get lift() { return this.uniforms.get('lift').value; }
  set lift(v) { this.uniforms.get('lift').value = v; }
}

/**
 * Quality ladder, best first. The demo shipped pinned to the top rung with no way
 * down, which is fine on the machine it was authored on and miserable anywhere
 * else — a full-resolution GTAO pass at 1.5x device pixel ratio is most of the
 * frame. `createPost` returns `setLevel`, and main.js drives it from measured
 * frame time.
 *
 * `maxPixelRatio` is a cap, not a target: it is always min'd with the display's
 * own devicePixelRatio.
 */
export const QUALITY_LEVELS = [
  { name: 'ultra', maxPixelRatio: 1.5, ao: true, halfRes: false, aoSamples: 16, denoiseSamples: 8, grain: 0.16, bloom: KernelSize.LARGE },
  { name: 'high', maxPixelRatio: 1.25, ao: true, halfRes: false, aoSamples: 12, denoiseSamples: 6, grain: 0.15, bloom: KernelSize.LARGE },
  { name: 'medium', maxPixelRatio: 1.0, ao: true, halfRes: true, aoSamples: 8, denoiseSamples: 4, grain: 0.13, bloom: KernelSize.MEDIUM },
  { name: 'low', maxPixelRatio: 0.8, ao: false, halfRes: true, aoSamples: 4, denoiseSamples: 2, grain: 0.10, bloom: KernelSize.MEDIUM },
];

/** Map the `?quality=` values (and the old debug API strings) onto the ladder. */
const NAMED_LEVEL = { ultra: 0, high: 1, medium: 2, low: 3 };

export function createPost({ renderer, scene, camera, spaceScene, spaceCamera, width, height, quality = 'high' }) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: 0,
  });

  const spacePass = new RenderPass(spaceScene, spaceCamera);
  composer.addPass(spacePass);

  const interiorPass = new RenderPass(scene, camera);
  interiorPass.clearPass.setClearFlags(false, true, false);
  interiorPass.ignoreBackground = true;
  composer.addPass(interiorPass);

  const n8ao = new N8AOPostPass(scene, camera, width, height);
  n8ao.configuration.aoRadius = 0.85;
  n8ao.configuration.distanceFalloff = 0.9;
  n8ao.configuration.intensity = 2.6;
  n8ao.configuration.denoiseRadius = 12;
  n8ao.configuration.color = new THREE.Color(0x05070a);
  n8ao.configuration.gammaCorrection = false;
  composer.addPass(n8ao);

  const bloom = new BloomEffect({
    intensity: 1.15,
    luminanceThreshold: 0.70,
    luminanceSmoothing: 0.35,
    mipmapBlur: true,
    radius: 0.72,
    kernelSize: KernelSize.LARGE,
  });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const grade = new HueSaturationEffect({ saturation: 0.03, hue: 0 });
  const contrast = new BrightnessContrastEffect({ brightness: 0.018, contrast: 0.075 });
  const vignette = new VignetteEffect({ darkness: 0.40, offset: 0.32 });
  const lift = new ShadowLiftEffect(0.024);
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
  grain.blendMode.opacity.value = 0.16;
  const smaa = new SMAAEffect();

  const effectPass = new EffectPass(camera, bloom, toneMapping, grade, contrast, vignette, lift, grain, smaa);
  composer.addPass(effectPass);

  let levelIndex = -1;

  /**
   * Apply a rung of the ladder. Changing the pixel ratio resizes the drawing
   * buffer (three's `setPixelRatio` re-runs `setSize` with `updateStyle: false`),
   * and `composer.setSize` then re-reads the drawing buffer size and resizes every
   * pass buffer with it. The canvas is CSS-sized at 100%/100%, so none of this
   * touches layout.
   */
  function setLevel(i, w = window.innerWidth, h = window.innerHeight) {
    const next = Math.max(0, Math.min(QUALITY_LEVELS.length - 1, i | 0));
    if (next === levelIndex) return levelIndex;
    levelIndex = next;
    const L = QUALITY_LEVELS[levelIndex];

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, L.maxPixelRatio));
    n8ao.enabled = L.ao;
    n8ao.configuration.halfRes = L.halfRes;
    n8ao.configuration.aoSamples = L.aoSamples;
    n8ao.configuration.denoiseSamples = L.denoiseSamples;
    grain.blendMode.opacity.value = L.grain;
    bloom.kernelSize = L.bloom;
    composer.setSize(w, h);
    return levelIndex;
  }

  setLevel(NAMED_LEVEL[quality] ?? 1, width, height);

  return {
    composer,
    passes: { spacePass, interiorPass, n8ao, effectPass },
    effects: { bloom, toneMapping, grade, contrast, vignette, lift, grain, smaa },
    levels: QUALITY_LEVELS,
    get level() { return levelIndex; },
    get levelName() { return QUALITY_LEVELS[levelIndex]?.name ?? '?'; },
    setLevel,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    setQuality(q) {
      const i = NAMED_LEVEL[q];
      return setLevel(i === undefined ? 1 : i);
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
