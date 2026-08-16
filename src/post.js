// Post chain: N8AO -> bloom -> ACES/sRGB output -> grade/vignette/grain.
// Owner: post-processing agent.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { N8AOPass } from 'n8ao';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.46 },
    uGrain: { value: 0.028 },
    uLift: { value: new THREE.Vector3(0.008, 0.010, 0.016) },
    uGain: { value: new THREE.Vector3(1.0, 0.99, 0.965) },
    uSat: { value: 1.04 },
    uContrast: { value: 1.09 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uSat, uContrast;
    uniform vec3 uLift, uGain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + fract(uTime) * 43.7) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // gentle lift/gain grade (cool shadows, slightly warm-neutral highlights)
      col = col * uGain + uLift * (1.0 - col);
      // filmic-ish contrast around mid gray (post-tonemap, sRGB domain)
      col = clamp((col - 0.42) * uContrast + 0.42, 0.0, 1.0);
      // saturation
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      // vignette
      vec2 d = vUv - 0.5;
      float vig = 1.0 - uVignette * smoothstep(0.32, 0.86, length(d) * 1.28);
      col *= vig;
      // fine grain
      float g = (hash(gl_FragCoord.xy) - 0.5) * uGrain * (1.0 - l * 0.6);
      col += g;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera, { width, height, quality = 'high' }) {
  const composer = new EffectComposer(renderer);
  composer.setSize(width, height);
  const low = quality === 'low';

  let n8ao = null;
  if (!low) {
    try {
      n8ao = new N8AOPass(scene, camera, width, height);
      n8ao.configuration.aoRadius = 1.05;
      n8ao.configuration.distanceFalloff = 1.1;
      n8ao.configuration.intensity = 3.6;
      n8ao.configuration.color = new THREE.Color(0x01020a);
      n8ao.setQualityMode('Medium');
      composer.addPass(n8ao);
    } catch (e) {
      console.warn('N8AO unavailable, falling back to plain render:', e.message);
      composer.addPass(new RenderPass(scene, camera));
    }
  } else {
    composer.addPass(new RenderPass(scene, camera));
  }

  const bloom = new UnrealBloomPass(new THREE.Vector2(width / (low ? 4 : 2), height / (low ? 4 : 2)), 0.22, 0.42, 0.9);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  let smaa = null;
  if (!low) {
    smaa = new SMAAPass();
    composer.addPass(smaa);
  }

  return {
    composer,
    bloom,
    n8ao,
    grade,
    render(simTime) {
      grade.uniforms.uTime.value = simTime;
      composer.render();
    },
    setSize(w, h) {
      composer.setSize(w, h);
      if (n8ao) n8ao.setSize(w, h);
      bloom.setSize(w / (low ? 4 : 2), h / (low ? 4 : 2));
      if (smaa) smaa.setSize(w, h);
    },
  };
}
