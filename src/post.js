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
    vignette: { value: 0.38 },
    grain: { value: 0.028 },
    time: { value: 0 },
    lift: { value: new THREE.Vector3(0.012, 0.014, 0.02) },
    gain: { value: new THREE.Vector3(1.02, 0.99, 0.94) },
    sat: { value: 0.92 },
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
    uniform float vignette;
    uniform float grain;
    uniform float time;
    uniform vec3 lift;
    uniform vec3 gain;
    uniform float sat;
    varying vec2 vUv;
    float hash(vec2 p){
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec3 c = col.rgb * gain + lift;
      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, sat);
      float d = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.85, 0.25, d);
      c *= mix(1.0, vig, vignette);
      float g = (hash(vUv * vec2(1600.0, 900.0) + time) - 0.5) * grain;
      c += g;
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
  if (gtao.blendIntensity != null) gtao.blendIntensity = 0.65;
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.42, 0.82);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    gtao,
    grade,
    setSize(w, h) {
      composer.setSize(w, h);
      gtao.setSize(w, h);
    },
    render(dt) {
      grade.uniforms.time.value += dt;
      composer.render();
    },
  };
}

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x05070a, 1);
  renderer.physicallyCorrectLights = true;
}
