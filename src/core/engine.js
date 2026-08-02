// Renderer + post-processing stack + the per-frame clock.
//
// The clock is deliberately abstract: in the browser it advances with
// requestAnimationFrame, while the offline capture harness steps it by a fixed
// dt so that a frame rendered on a laptop and a frame rendered by the headless
// capture pipeline are bit-for-bit the same shot.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { makeFinishPass, StreakShader } from './passes.js';

export class Engine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.quality = opts.quality || 'high';
    this.fixedSize = opts.fixedSize || null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: opts.antialias ?? this.quality === 'high',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
      stencil: false,
    });
    this.renderer.setPixelRatio(opts.pixelRatio || 1);
    // ACES looks great on highlights but crushes shadows, and this film is
    // largely dark grey machinery lit by one hard key. The neutral curve keeps
    // those mid-shadows readable while still rolling off the bloom.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = opts.exposure ?? 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.shadowMap.enabled = false;
    this.renderer.info.autoReset = true;

    const { width, height } = this._targetSize();
    this.renderer.setSize(width, height, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200000);

    const rtType = THREE.HalfFloatType;
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(width, height, {
      type: rtType,
      colorSpace: THREE.LinearSRGBColorSpace,
      samples: this.quality === 'high' ? 2 : 0,
    }));
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Bloom runs at half resolution: on a software rasteriser the mip chain is
    // the single most expensive thing in the frame, and at half res it is
    // visually indistinguishable once it has been blurred anyway.
    const bloomRes = new THREE.Vector2(width * 0.5, height * 0.5);
    this.bloom = new UnrealBloomPass(bloomRes, 0.85, 0.62, 0.62);
    this.composer.addPass(this.bloom);

    this.streak = new ShaderPass(StreakShader);
    this.streak.enabled = false;
    this.composer.addPass(this.streak);

    this.finish = makeFinishPass(width, height);
    this.composer.addPass(this.finish);

    this._onResize = () => this.resize();
    if (!this.fixedSize) window.addEventListener('resize', this._onResize);

    this.time = 0;
    this._glFlushPixels = new Uint8Array(4);
  }

  _targetSize() {
    if (this.fixedSize) return { width: this.fixedSize[0], height: this.fixedSize[1] };
    return { width: window.innerWidth, height: window.innerHeight };
  }

  resize() {
    const { width, height } = this._targetSize();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloom.setSize(width * 0.5, height * 0.5);
    this.finish.uniforms.uResolution.value.set(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(width, height);
  }

  setActive(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    const { width, height } = this._targetSize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  set fade(v) { this.finish.uniforms.uFade.value = v; }
  get fade() { return this.finish.uniforms.uFade.value; }
  set flash(v) { this.finish.uniforms.uFlash.value = v; }
  get flash() { return this.finish.uniforms.uFlash.value; }
  set bloomStrength(v) { this.bloom.strength = v; }
  set letterbox(v) { this.finish.uniforms.uAspectBars.value = v; }
  set grain(v) { this.finish.uniforms.uGrain.value = v; }
  set vignette(v) { this.finish.uniforms.uVignette.value = v; }

  setStreak(strength, cx = 0.5, cy = 0.5) {
    this.streak.enabled = strength > 0.001;
    this.streak.uniforms.uStrength.value = strength;
    this.streak.uniforms.uCenter.value.set(cx, cy);
  }

  render(time) {
    this.time = time;
    this.finish.uniforms.uTime.value = time;
    this.composer.render();
  }

  /** Forces the GL command queue to drain -- required before a frame grab. */
  flush() {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._glFlushPixels);
  }

  dispose() {
    if (!this.fixedSize) window.removeEventListener('resize', this._onResize);
    this.composer.dispose();
    this.renderer.dispose();
  }
}
