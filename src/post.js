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
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect,
  NoiseEffect, SMAAEffect, HueSaturationEffect, BrightnessContrastEffect,
  BlendFunction, KernelSize,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

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
  n8ao.configuration.aoSamples = 16;
  n8ao.configuration.denoiseSamples = 8;
  n8ao.configuration.denoiseRadius = 12;
  n8ao.configuration.color = new THREE.Color(0x05070a);
  n8ao.configuration.gammaCorrection = false;
  n8ao.configuration.halfRes = quality !== 'high';
  composer.addPass(n8ao);

  const bloom = new BloomEffect({
    intensity: 1.15,
    luminanceThreshold: 0.62,
    luminanceSmoothing: 0.35,
    mipmapBlur: true,
    radius: 0.72,
    kernelSize: KernelSize.LARGE,
  });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const grade = new HueSaturationEffect({ saturation: 0.03, hue: 0 });
  const contrast = new BrightnessContrastEffect({ brightness: 0.018, contrast: 0.075 });
  const vignette = new VignetteEffect({ darkness: 0.44, offset: 0.31 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
  grain.blendMode.opacity.value = 0.16;
  const smaa = new SMAAEffect();

  const effectPass = new EffectPass(camera, bloom, toneMapping, grade, contrast, vignette, grain, smaa);
  composer.addPass(effectPass);

  return {
    composer,
    passes: { spacePass, interiorPass, n8ao, effectPass },
    effects: { bloom, toneMapping, grade, contrast, vignette, grain, smaa },
    setSize(w, h) {
      composer.setSize(w, h);
    },
    setQuality(q) {
      n8ao.configuration.halfRes = q !== 'high';
      grain.blendMode.opacity.value = q === 'high' ? 0.16 : 0.1;
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
