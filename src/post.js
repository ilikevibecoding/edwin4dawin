// Post-processing chain: HDR render → bloom → tonemap/sRGB → FXAA → film
// grade (vignette + grain + subtle aberration). Quality-scalable.
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
    uVignette: { value: 0.30 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.00026 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 fromCenter = uv - 0.5;
      float r2 = dot(fromCenter, fromCenter);
      // slight chromatic aberration toward the edges
      vec2 caOff = fromCenter * (uAberration * 30.0) * r2;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + caOff).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - caOff).b;
      // vignette
      float vig = 1.0 - uVignette * smoothstep(0.18, 0.72, r2);
      col *= vig;
      // animated film grain
      float g = (hash12(uv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5) * uGrain;
      col += g;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.time = 0;

    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.6, 0.5, 0.8);
    // Clamp the bloom bright-pass: night floodlights push HDR values into the
    // hundreds, which otherwise floods half the frame with white glow.
    this.bloom.materialHighPassFilter.fragmentShader =
      this.bloom.materialHighPassFilter.fragmentShader.replace(
        'gl_FragColor = mix( outputColor, texel, alpha );',
        'vec4 hi = mix( outputColor, texel, alpha );\n' +
        '\t\t\tgl_FragColor = vec4( min( hi.rgb, vec3( 2.5 ) ), hi.a );',
      );
    this.bloom.materialHighPassFilter.needsUpdate = true;
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaa);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.setSize(window.innerWidth, window.innerHeight);
  }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.composer.setSize(w, h);
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
  }

  /** quality: 0 = low, 1 = medium, 2 = high */
  setQuality(q) {
    this.bloom.enabled = q >= 1;
    this.bloom.strength = q >= 2 ? 0.6 : 0.42;
    this.bloom.radius = q >= 2 ? 0.5 : 0.42;
    this.bloom.threshold = q >= 2 ? 0.8 : 0.86;
    this.grade.uniforms.uGrain.value = q >= 1 ? 0.035 : 0;
    this.grade.uniforms.uAberration.value = q >= 2 ? 0.00026 : 0;
    this.fxaa.enabled = q >= 1;
  }

  render(dt) {
    this.time += dt;
    this.grade.uniforms.uTime.value = this.time;
    if (this.enabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
