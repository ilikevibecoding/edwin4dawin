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

  return {
    composer,
    passes: { spacePass, interiorPass, n8ao, effectPass },
    effects: { bloom, toneMapping, grade, contrast, vignette, lift, grain, smaa },
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
