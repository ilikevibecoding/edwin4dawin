// post.js — EffectComposer chain: render → bloom → tonemap/output → grade
// (vignette, grain, chromatic aberration) → FXAA. Quality-scalable.
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
    uGrain: { value: 0.035 },
    uCA: { value: 0.0016 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uContrast: { value: 1.03 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uCA;
    uniform vec3 uTint;
    uniform float uContrast;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 uv = vUv;
      vec2 fromCenter = uv - 0.5;
      float r2 = dot(fromCenter, fromCenter);
      // subtle chromatic aberration, only near edges (~1-2px at corners)
      vec2 caOff = fromCenter * uCA * (0.2 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + caOff).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - caOff).b;
      // contrast around mid gray
      col = (col - 0.5) * uContrast + 0.5;
      col *= uTint;
      // vignette
      float vig = 1.0 - smoothstep(0.18, 0.85, r2 * (1.0 + uVignette)) * uVignette;
      col *= vig;
      // animated grain
      float gr = (hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5) * uGrain;
      col += gr;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(ctx) {
  const { renderer, scene, camera } = ctx;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.55, 0.55, 0.85);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  function setSize(w, h, pixelRatio) {
    composer.setSize(w, h);
    composer.setPixelRatio(pixelRatio);
    fxaa.material.uniforms.resolution.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  }

  ctx.events.on('time-of-day', (t) => {
    if (t === 'night') {
      bloom.strength = 0.85;
      grade.uniforms.uTint.value.setRGB(0.94, 0.97, 1.06);
      grade.uniforms.uGrain.value = 0.055;
    } else if (t === 'sunset') {
      bloom.strength = 0.7;
      grade.uniforms.uTint.value.setRGB(1.05, 0.99, 0.94);
      grade.uniforms.uGrain.value = 0.038;
    } else {
      bloom.strength = 0.5;
      grade.uniforms.uTint.value.setRGB(1.0, 1.0, 1.0);
      grade.uniforms.uGrain.value = 0.032;
    }
  });

  return {
    composer, bloom, grade, fxaa,
    setSize,
    setQuality(q) {
      bloom.enabled = q !== 'low';
      fxaa.enabled = true;
    },
    render(dtUnscaled) {
      grade.uniforms.uTime.value += dtUnscaled;
      composer.render();
    },
  };
}
