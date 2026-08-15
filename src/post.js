import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.32 },
    grain: { value: 0.045 },
    time: { value: 0 },
    lift: { value: new THREE.Vector3(0.02, 0.02, 0.018) },
    gamma: { value: new THREE.Vector3(1.02, 1.0, 0.98) },
    gain: { value: new THREE.Vector3(1.02, 1.0, 0.96) },
    saturation: { value: 0.92 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    uniform vec3 lift;
    uniform vec3 gamma;
    uniform vec3 gain;
    uniform float saturation;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7)) + time) * 43758.5453);
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec3 c = col.rgb;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, saturation);
      c = gain * (pow(max(c + lift, vec3(0.0)), 1.0 / gamma));
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - smoothstep(0.35, 0.98, d) * vignette;
      float n = hash(vUv * vec2(1600.0, 900.0)) - 0.5;
      c += n * grain;
      gl_FragColor = vec4(c, col.a);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.output = GTAOPass.OUTPUT.Default;
  if (gtao.updateGtaoMaterial) {
    gtao.updateGtaoMaterial({
      radius: 0.35,
      distanceExponent: 1.4,
      thickness: 0.08,
      scale: 0.85,
      samples: 8,
      screenSpaceRadius: false,
    });
  }
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.55, 0.82);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  function setSize(w, h) {
    composer.setSize(w, h);
    gtao.setSize?.(w, h);
    bloom.setSize(w, h);
  }

  function render(dt) {
    grade.uniforms.time.value += dt;
    composer.render();
  }

  return { composer, bloom, gtao, grade, setSize, render };
}
