import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/** Final grade: letterbox, vignette, grain, chromatic fringe, fade to black. */
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.0016 },
    uLetterbox: { value: 0.0 },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.04 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uFade, uVignette, uGrain, uAberration, uLetterbox, uSaturation, uContrast;
    uniform vec3 uFadeColor;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);

      vec3 col;
      if (uAberration > 0.0) {
        float k = uAberration * (0.35 + r2 * 2.0);
        col.r = texture2D(tDiffuse, uv + d * k).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - d * k).b;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSaturation);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      col *= 1.0 - uVignette * smoothstep(0.15, 0.85, r2 * 1.9);

      float g = hash(uv * uResolution + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain * (1.0 - lum * 0.55);

      col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));

      if (uLetterbox > 0.0) {
        float bar = step(uv.y, uLetterbox) + step(1.0 - uLetterbox, uv.y);
        col = mix(col, vec3(0.0), clamp(bar, 0.0, 1.0));
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, { width, height, quality = 'high' }) {
    this.renderer = renderer;
    this.quality = quality;
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    if (quality !== 'low') {
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        quality === 'high' ? 0.62 : 0.5, // strength
        0.72,                            // radius
        0.72,                            // threshold
      );
      this.composer.addPass(this.bloom);
    }

    this.composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uResolution.value.set(width, height);
    this.composer.addPass(this.grade);

    if (quality === 'high') {
      this.fxaa = new ShaderPass(FXAAShader);
      this.fxaa.material.uniforms.resolution.value.set(1 / width, 1 / height);
      this.composer.addPass(this.fxaa);
    }
    this.setSize(width, height);
  }

  setScene(scene, camera) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.grade.uniforms.uResolution.value.set(w, h);
    if (this.bloom) this.bloom.resolution.set(w, h);
    if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / w, 1 / h);
  }

  render(t) {
    this.grade.uniforms.uTime.value = t;
    this.composer.render();
  }
}
