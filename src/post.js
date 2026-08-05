/**
 * Post-processing chain.
 *
 * Scene renders to an HDR buffer, bloom picks up the launch plumes and
 * intercept flashes, then a single grade pass applies tone-mapped colour
 * shaping, subtle radial chromatic aberration, vignette and film grain.
 *
 * Every stage can be disabled by the quality preset without changing the look
 * of the geometry underneath.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { QUALITY } from './config.js';
import { clamp01, lerp } from './util/mathx.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0016 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.035 },
    uLift: { value: new THREE.Vector3(0.0, 0.0, 0.006) },
    uGain: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.04 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Color(0xffe8c0) },
    uScanline: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;
    uniform vec3  uLift;
    uniform vec3  uGain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uFlash;
    uniform vec3  uFlashColor;
    uniform float uScanline;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // Radial chromatic aberration, strongest at the frame edge.
      float ab = uAberration * r2 * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;

      // Lift / gain / contrast / saturation
      col = col * uGain + uLift;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);

      // Bright-event screen flash
      col += uFlashColor * uFlash;

      // Vignette
      float vig = 1.0 - uVignette * pow(r2 * 2.0, 1.35);
      col *= clamp(vig, 0.0, 1.0);

      // Subtle scanline for the console view
      if (uScanline > 0.001) {
        float s = 0.5 + 0.5 * sin(uv.y * 1400.0);
        col *= mix(1.0, 0.88 + s * 0.12, uScanline);
      }

      // Film grain, slightly stronger in the shadows
      float g = hash(uv * 1024.0 + uTime * 60.0) - 0.5;
      col += g * uGrain * (1.25 - clamp(l, 0.0, 1.0));

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera, qualityId = 'high') {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.q = QUALITY[qualityId] ?? QUALITY.high;

    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(size.x * pr)), Math.max(1, Math.floor(size.y * pr)),
      { type: THREE.HalfFloatType, samples: 0 },
    );
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    if (this.q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.62, 0.82);
      this.composer.addPass(this.bloom);
    }

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    if (this.q.ssaa) {
      this.smaa = new SMAAPass(size.x * pr, size.y * pr);
      this.composer.addPass(this.smaa);
    }
    // The final pass in the chain must write to the screen.
    this._markLast();

    this.flash = 0;
    this.enabled = true;
  }

  _markLast() {
    const passes = this.composer.passes;
    passes.forEach((p, i) => { p.renderToScreen = i === passes.length - 1; });
  }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    if (this.bloom) this.bloom.setSize(w, h);
    if (this.smaa) this.smaa.setSize(w * pr, h * pr);
  }

  /** Push the current lighting condition into the grade. */
  applyCondition(preset, bloomScale = 1) {
    const u = this.grade.uniforms;
    if (this.bloom) {
      this.bloom.strength = preset.bloom * bloomScale;
      this.bloom.radius = preset.id === 'night' ? 0.78 : 0.6;
      this.bloom.threshold = preset.id === 'night' ? 0.55 : 0.82;
    }
    if (preset.id === 'day') {
      u.uLift.value.set(0.0, 0.002, 0.008);
      u.uGain.value.set(1.02, 1.0, 0.985);
      u.uSaturation.value = 1.05;
      u.uContrast.value = 1.05;
      u.uVignette.value = 0.3;
      u.uGrain.value = 0.028;
    } else if (preset.id === 'sunset') {
      u.uLift.value.set(0.012, 0.004, 0.012);
      u.uGain.value.set(1.07, 0.99, 0.94);
      u.uSaturation.value = 1.12;
      u.uContrast.value = 1.06;
      u.uVignette.value = 0.38;
      u.uGrain.value = 0.034;
    } else {
      u.uLift.value.set(0.004, 0.008, 0.022);
      u.uGain.value.set(0.95, 0.99, 1.09);
      u.uSaturation.value = 0.96;
      u.uContrast.value = 1.1;
      u.uVignette.value = 0.46;
      u.uGrain.value = 0.055;
    }
  }

  /** Trigger a brief full-screen flash (big nearby detonation). */
  punch(amount = 0.4, colour = 0xffe8c0) {
    this.flash = Math.min(0.85, this.flash + amount);
    this.grade.uniforms.uFlashColor.value.set(colour);
  }

  setConsoleMode(on) {
    this.grade.uniforms.uScanline.value = on ? 0.35 : 0;
    this.grade.uniforms.uVignette.value = on ? 0.5 : this.grade.uniforms.uVignette.value;
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.grade.uniforms.uFlash.value = this.flash;
    this.grade.uniforms.uTime.value += dt;
  }

  render(dt) {
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.composer.dispose?.();
  }
}
