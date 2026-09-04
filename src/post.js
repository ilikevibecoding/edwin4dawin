// Post-processing stack: N8AO (renders the beauty pass) -> bloom -> ACES/sRGB output -> SMAA -> vignette + grain.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { N8AOPass } from "n8ao";

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    vignette: { value: 0.34 },
    grain: { value: 0.045 },
    seed: { value: 0.37 },
    // filmic toe: the darkest pixels settle on a cool near-black instead of 0,0,0
    lift: { value: new THREE.Vector3(0.024, 0.03, 0.042) },
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
    uniform float time;
    uniform vec2 resolution;
    uniform float vignette;
    uniform float grain;
    uniform float seed;
    uniform vec3 lift;
    varying vec2 vUv;
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // soft vignette, slightly wider than tall; starts further out so wall edges keep their value
      vec2 d = (vUv - 0.5) * vec2(1.0, 0.9);
      float v = smoothstep(0.38, 1.0, length(d) * 1.35);
      c.rgb *= 1.0 - vignette * v;
      // shadow lift (display space, after the vignette so the toe is uniform): raises the darkest
      // values onto a cool near-black and leaves highlights untouched
      c.rgb += lift * (1.0 - c.rgb);
      // film grain (stronger in the shadows, finer in highlights)
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float n = hash(vUv * resolution + vec2(seed * 1000.0, fract(time) * 700.0)) - 0.5;
      c.rgb += n * grain * (1.0 - lum * 0.6);
      gl_FragColor = c;
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const w = Math.floor(size.x * pr);
  const h = Math.floor(size.y * pr);

  const composer = new EffectComposer(renderer);

  const ao = new N8AOPass(scene, camera, w, h);
  ao.configuration.aoRadius = 0.9;
  ao.configuration.distanceFalloff = 0.9;
  ao.configuration.intensity = 2.6;
  // occluded corners tint toward a dark blue-grey rather than dropping to black
  ao.configuration.color = new THREE.Color(0x0a0e16);
  ao.configuration.halfRes = true;
  ao.configuration.depthAwareUpsampling = true;
  ao.configuration.screenSpaceRadius = false;
  ao.configuration.transparencyAware = false;
  // We stay linear until OutputPass; N8AO would otherwise sRGB-encode its output (double gamma).
  ao.configuration.gammaCorrection = false;
  ao.setQualityMode("Medium");
  composer.addPass(ao);

  // threshold sits above white so only genuine emitters bloom; modest radius keeps fixtures as shapes
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.38, 1.15);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const smaa = new SMAAPass();
  composer.addPass(smaa);

  const finalPass = new ShaderPass(FinalShader);
  finalPass.uniforms.resolution.value.set(w, h);
  composer.addPass(finalPass);

  const api = {
    composer,
    ao,
    bloom,
    finalPass,
    /** Per-mode tuning: AO radius in world units scales with the subject (a room vs a 1.6 km hull). */
    setMode(mode) {
      if (mode === "exterior") {
        ao.configuration.aoRadius = 12;
        ao.configuration.distanceFalloff = 6;
        ao.configuration.intensity = 2.0;
        bloom.strength = 0.42;
        finalPass.uniforms.vignette.value = 0.28;
      } else {
        ao.configuration.aoRadius = 0.9;
        ao.configuration.distanceFalloff = 0.9;
        ao.configuration.intensity = 2.6;
        bloom.strength = 0.3;
        finalPass.uniforms.vignette.value = 0.34;
      }
    },
    setSize(width, height) {
      composer.setSize(width, height);
      const p = renderer.getPixelRatio();
      finalPass.uniforms.resolution.value.set(width * p, height * p);
    },
    render(time) {
      finalPass.uniforms.time.value = time;
      composer.render();
    },
  };
  return api;
}
