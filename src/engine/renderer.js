/**
 * Renderer + post chain.
 *
 * One WebGL context is shared by every scene; each scene owns its own
 * THREE.Scene and lighting rig, and the director swaps which one is rendered.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Film grain + vignette + fade-to-black, as one cheap final pass. */
const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFade: { value: 0 },
    uGrain: { value: 0.018 },
    uVignette: { value: 0.78 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uChroma: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uFade, uGrain, uVignette, uFlash, uChroma;
    uniform vec3 uFlashColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      vec3 c;
      if (uChroma > 0.0001) {
        float k = uChroma * 0.006;
        c.r = texture2D(tDiffuse, vUv + d * k).r;
        c.g = texture2D(tDiffuse, vUv).g;
        c.b = texture2D(tDiffuse, vUv - d * k).b;
      } else {
        c = texture2D(tDiffuse, vUv).rgb;
      }
      c = mix(c, uFlashColor, clamp(uFlash, 0.0, 1.0));
      float v = 1.0 - uVignette * dot(d, d) * 0.9;
      c *= clamp(v, 0.0, 1.0);
      float g = hash(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      c += g * uGrain;
      c *= (1.0 - clamp(uFade, 0.0, 1.0));
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createRenderer(container, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: opts.antialias !== false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(opts.pixelRatio || 1);
  renderer.setSize(opts.width || innerWidth, opts.height || innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.autoClear = true;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(42, (opts.width || innerWidth) / (opts.height || innerHeight), 0.1, 20000);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(opts.width || innerWidth, opts.height || innerHeight),
    0.58, 0.42, 0.90
  );
  composer.addPass(bloom);

  const film = new ShaderPass(FilmShader);
  composer.addPass(film);
  composer.addPass(new OutputPass());

  function setSize(w, h) {
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return {
    renderer, camera, composer, bloom, film, renderPass,
    setSize,
    render(scene, t) {
      renderPass.scene = scene;
      renderPass.camera = camera;
      film.uniforms.uTime.value = t;
      composer.render();
    },
  };
}
