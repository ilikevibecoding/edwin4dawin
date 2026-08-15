import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SUN } from './palette.js';

const SanitizeShader = {
  name: 'Sanitize',
  uniforms: {
    tDiffuse: { value: null },
    uClamp: { value: 12.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uClamp;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 c = t.rgb;
      if (!(c.r == c.r)) c.r = 0.0;
      if (!(c.g == c.g)) c.g = 0.0;
      if (!(c.b == c.b)) c.b = 0.0;
      c = clamp(c, vec3(0.0), vec3(uClamp));
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

const GradeShader = {
  name: 'Grade',
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.38 },
    uGrain: { value: 0.045 },
    uTime: { value: 0 },
    uLift: { value: 0.03 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    uniform float uLift;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime) * 43758.5453);
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv * 2.0 - 1.0;
      float vig = 1.0 - uVignette * dot(d, d);
      float g = (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;
      c = c * vig + g + uLift * (1.0 - c);
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = SUN.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function createPost(renderer, scene, camera, { fast = false } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.blendIntensity = fast ? 0.55 : 0.72;
  composer.addPass(ao);

  composer.addPass(new ShaderPass(SanitizeShader));

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), fast ? 0.22 : 0.32, 0.55, 0.72);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  if (!fast) composer.addPass(new SMAAPass());

  function setSize(w, h) {
    composer.setSize(w, h);
    ao.setSize(w, h);
  }

  function render(dt) {
    grade.uniforms.uTime.value += dt;
    composer.render();
  }

  return { composer, render, setSize, bloom, ao, grade };
}
