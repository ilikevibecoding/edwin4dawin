// Post-processing: bloom + film grade (vignette, grain, tint) + FXAA,
// with a lightweight dynamic-resolution scaler to hold 60 fps.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.05 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uSaturation: { value: 1.02 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uSaturation;
    uniform vec3 uTint;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // tint & saturation
      col.rgb *= uTint;
      float l = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(l), col.rgb, uSaturation);
      // vignette
      vec2 d = vUv - 0.5;
      col.rgb *= 1.0 - dot(d, d) * uVignette * 1.7;
      // grain
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5;
      col.rgb += g * uGrain * (0.4 + 0.6 * (1.0 - l));
      gl_FragColor = col;
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.62, 0.86);
    this.grade = new ShaderPass(GradeShader);
    this.output = new OutputPass();
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.grade);
    this.composer.addPass(this.output);
    this.composer.addPass(this.fxaa);

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.targetRatio = this.pixelRatio;
    this.fpsEMA = 60;
    this.adjustTimer = 0;
    this.dynamicRes = true;
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.pixelRatio);
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * this.pixelRatio), 1 / (h * this.pixelRatio));
  }

  setQuality(q) {
    if (q === 'high') { this.maxRatio = Math.min(window.devicePixelRatio || 1, 1.5); this.bloom.enabled = true; }
    else if (q === 'medium') { this.maxRatio = 1.15; this.bloom.enabled = true; }
    else { this.maxRatio = 1.0; this.bloom.enabled = false; }
    this.pixelRatio = this.maxRatio;
    this.setSize(this.w || window.innerWidth, this.h || window.innerHeight);
  }

  // called each frame with real dt (not fixed sim dt)
  update(dt, weather, nightFactor) {
    this.grade.uniforms.uTime.value += dt;
    if (weather) {
      this.bloom.strength = weather.bloom;
      this.renderer.toneMappingExposure = weather.exposure;
      // subtle grade per time of day
      const tint = this.grade.uniforms.uTint.value;
      if (nightFactor > 0.5) tint.setRGB(0.92, 0.97, 1.08);
      else tint.setRGB(1.0, 1.0, 1.0).lerp(new THREE.Color(1.06, 0.98, 0.94), weather.presetName === 'sunset' ? 0.8 : 0);
      this.grade.uniforms.uGrain.value = 0.024 + nightFactor * 0.018;
    }

    // dynamic resolution
    if (!this.dynamicRes) return;
    const fps = 1 / Math.max(dt, 1e-4);
    this.fpsEMA = this.fpsEMA * 0.95 + fps * 0.05;
    this.adjustTimer += dt;
    if (this.adjustTimer > 2.0) {
      this.adjustTimer = 0;
      const maxR = this.maxRatio ?? Math.min(window.devicePixelRatio || 1, 1.5);
      if (this.fpsEMA < 52 && this.pixelRatio > 0.75) {
        this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.15);
        this.setSize(this.w, this.h);
      } else if (this.fpsEMA > 58.5 && this.pixelRatio < maxR) {
        this.pixelRatio = Math.min(maxR, this.pixelRatio + 0.1);
        this.setSize(this.w, this.h);
      }
    }
  }

  render() {
    this.composer.render();
  }
}
