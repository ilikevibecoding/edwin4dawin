import { Vector2, ShaderMaterial } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.12 },
    grain: { value: 0.003 },
    time: { value: 0 },
    lift: { value: 0.045 },
    gain: { value: 1.06 },
    warm: { value: 0.02 },
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
    uniform float warm;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * vignette * 1.6;
      float n = (hash(vUv * vec2(1600.0, 900.0)) - 0.5) * grain;
      c.rgb = c.rgb * v * gain + lift + n;
      c.r += warm * 0.015;
      c.b -= warm * 0.01;
      gl_FragColor = c;
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new Vector2());
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let aoPass = null;
  const gl = renderer.getContext();
  const dbg = gl.getExtension && gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|software/i.test(rendererName);
  try {
    if (!software) {
      aoPass = new GTAOPass(scene, camera, size.x, size.y);
      aoPass.output = GTAOPass.OUTPUT.Default;
      if (aoPass.blendIntensity !== undefined) aoPass.blendIntensity = 0.55;
      composer.addPass(aoPass);
    }
  } catch (err) {
    console.warn('GTAO unavailable', err);
  }

  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), software ? 0.08 : 0.12, 0.32, 0.88);
  composer.addPass(bloom);

  const grade = new ShaderPass(new ShaderMaterial(GradeShader));
  composer.addPass(grade);

  const output = new OutputPass();
  composer.addPass(output);

  return {
    composer,
    bloom,
    aoPass,
    grade,
    renderPass,
    setSize(w, h) {
      composer.setSize(w, h);
      if (aoPass && aoPass.setSize) aoPass.setSize(w, h);
    },
    render(dt) {
      grade.uniforms.time.value += dt;
      composer.render();
    },
    setCamera(cam) {
      renderPass.camera = cam;
      if (aoPass) aoPass.camera = cam;
    },
  };
}
