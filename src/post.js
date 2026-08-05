// post.js — post-processing chain: render, bloom, FXAA, and a final grade pass
// (vignette, subtle grain, slight chromatic aberration).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.028 },
    uAberration: { value: 0.0016 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 fromCenter = uv - 0.5;
      float r2 = dot(fromCenter, fromCenter);

      // chromatic aberration towards edges
      vec2 off = fromCenter * r2 * uAberration * 60.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv - off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + off).b;

      // vignette
      col *= 1.0 - uVignette * smoothstep(0.18, 0.85, r2 * 2.0);

      // grain
      float g = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 91.7) - 0.5;
      col += g * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.enabled = true;
    const size = renderer.getSize(new THREE.Vector2());

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.5, 1.0);
    this.composer.addPass(this.bloom);

    // OutputPass applies tone mapping (ACES) + sRGB conversion; grade/FXAA operate on sRGB
    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.fxaa = new ShaderPass(FXAAShader);
    this.fxaa.material.uniforms.resolution.value.set(1 / size.x, 1 / size.y);
    this.composer.addPass(this.fxaa);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.fxaa.material.uniforms.resolution.value.set(1 / w, 1 / h);
  }

  setCamera(camera) {
    this.renderPass.camera = camera;
  }

  setQuality(q) {
    // q: 'high' | 'low'
    this.bloom.enabled = q === 'high';
    this.fxaa.enabled = true;
  }

  render(dt, time) {
    this.grade.material.uniforms.uTime.value = time;
    this.composer.render(dt);
  }
}
