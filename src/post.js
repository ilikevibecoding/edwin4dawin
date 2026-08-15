import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.22 },
    grain: { value: 0.012 },
    time: { value: 0 },
    lift: { value: 0.03 },
    gain: { value: 1.02 },
    sat: { value: 0.92 },
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
    uniform float lift;
    uniform float gain;
    uniform float sat;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * gain + lift;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, sat);
      col.r *= 1.02;
      col.b *= 0.98;
      float d = distance(vUv, vec2(0.5));
      col *= 1.0 - smoothstep(0.35, 0.98, d) * vignette;
      float n = hash(vUv * vec2(1600.0, 900.0) + time);
      col += (n - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera, options = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const software = !!options.software;
  let gtao = null;
  if (!software) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    if (gtao.blendIntensity !== undefined) gtao.blendIntensity = 0.62;
    if (GTAOPass.OUTPUT) gtao.output = GTAOPass.OUTPUT.Default;
    composer.addPass(gtao);
  }

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    software ? 0.1 : 0.16,
    0.34,
    0.86
  );
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    composer,
    gtao,
    bloom,
    grade,
    setSize(w, h) {
      composer.setSize(w, h);
      gtao?.setSize?.(w, h);
    },
    render(dt) {
      grade.uniforms.time.value += dt;
      composer.render();
    },
  };
}
