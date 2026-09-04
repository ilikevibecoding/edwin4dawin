// Post-processing stack: N8AO (renders the beauty pass) -> bloom -> ACES/sRGB output -> SMAA -> final grade
// (vignette, Imperial split-tone, shadow lift, alert vignette, grain). No extra full-screen passes: the per-mode
// look (exposure, bloom, AO, vignette, grain) and the quality levels are uniform / configuration changes only.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { N8AOPass } from "n8ao";
import { alertLevel } from "./systems/atmosphere.js";

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
    // "Imperial" grade: cooler shadows, highlights eased toward white instead of saturating
    shadowTint: { value: new THREE.Vector3(0.9, 0.96, 1.1) },
    shadowAmount: { value: 0.55 },
    highlightDesat: { value: 0.3 },
    saturation: { value: 1.0 },
    // red alert: slow pulsing red rim (0..1), mirrored from the lighting controller via atmosphere.js
    alert: { value: 0 },
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
    uniform vec3 shadowTint;
    uniform float shadowAmount;
    uniform float highlightDesat;
    uniform float saturation;
    uniform float alert;
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
      // split-tone: shadows lean cold, highlights drift toward clean white (no hue shift on the strips)
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float sh = (1.0 - smoothstep(0.0, 0.42, lum)) * shadowAmount;
      c.rgb = mix(c.rgb, c.rgb * shadowTint, sh);
      float hi = smoothstep(0.72, 1.0, lum) * highlightDesat;
      c.rgb = mix(c.rgb, vec3(lum), hi);
      c.rgb = mix(vec3(dot(c.rgb, vec3(0.299, 0.587, 0.114))), c.rgb, saturation);
      // shadow lift (display space, after the vignette so the toe is uniform): raises the darkest
      // values onto a cool near-black and leaves highlights untouched
      c.rgb += lift * (1.0 - c.rgb);
      // red alert: a slow pulse of red creeping in from the frame edges
      if (alert > 0.001) {
        float pulse = 0.35 + 0.65 * (0.5 + 0.5 * sin(time * 2.4));
        float rim = pow(smoothstep(0.42, 1.05, length(d) * 1.35), 1.5);
        c.rgb += vec3(0.4, 0.03, 0.02) * (alert * pulse * rim);
      }
      // film grain (stronger in the shadows, finer in highlights)
      lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float n = hash(vUv * resolution + vec2(seed * 1000.0, fract(time) * 700.0)) - 0.5;
      c.rgb += n * grain * (1.0 - lum * 0.6);
      gl_FragColor = c;
    }
  `,
};

// Per-mode look. AO radius is in world units and scales with the subject (a room vs a 1.6 km hull).
const MODES = {
  interior: {
    exposure: 1.0,
    ao: { aoRadius: 0.8, distanceFalloff: 1.0, intensity: 2.0 },
    bloom: { strength: 0.24, radius: 0.3, threshold: 1.3 },
    vignette: 0.34,
    grain: 0.04,
    lift: [0.024, 0.03, 0.042],
    shadowAmount: 0.55,
  },
  exterior: {
    exposure: 1.04,
    ao: { aoRadius: 12, distanceFalloff: 6, intensity: 1.8 },
    bloom: { strength: 0.4, radius: 0.45, threshold: 1.0 },
    vignette: 0.28,
    grain: 0.03,
    lift: [0.012, 0.016, 0.026],
    shadowAmount: 0.35,
  },
};

// Quality levels for the adaptive scaler (0 = cheapest … 3 = full). SMAA stays on at every level.
const QUALITY = [
  { ao: "Performance", bloomScale: 0.5 },
  { ao: "Low", bloomScale: 0.5 },
  { ao: "Medium", bloomScale: 0.75 },
  { ao: "Medium", bloomScale: 1.0 },
];

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const w = Math.floor(size.x * pr);
  const h = Math.floor(size.y * pr);

  const composer = new EffectComposer(renderer);

  const ao = new N8AOPass(scene, camera, w, h);
  ao.configuration.aoRadius = MODES.interior.ao.aoRadius;
  ao.configuration.distanceFalloff = MODES.interior.ao.distanceFalloff;
  ao.configuration.intensity = MODES.interior.ao.intensity;
  // occluded corners tint toward a dark blue-grey rather than dropping to black (or mud on black decks)
  ao.configuration.color = new THREE.Color(0x0b1019);
  ao.configuration.halfRes = true;
  ao.configuration.depthAwareUpsampling = true;
  ao.configuration.screenSpaceRadius = false;
  ao.configuration.transparencyAware = false;
  // We stay linear until OutputPass; N8AO would otherwise sRGB-encode its output (double gamma).
  ao.configuration.gammaCorrection = false;
  ao.setQualityMode("Medium");
  composer.addPass(ao);

  // threshold sits well above white so only genuine emitters bloom; a tight radius keeps the light strips as
  // crisp shapes instead of blobs
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), MODES.interior.bloom.strength, MODES.interior.bloom.radius, MODES.interior.bloom.threshold);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const smaa = new SMAAPass();
  composer.addPass(smaa);

  const finalPass = new ShaderPass(FinalShader);
  finalPass.uniforms.resolution.value.set(w, h);
  composer.addPass(finalPass);

  const state = { mode: "interior", quality: QUALITY.length - 1, width: size.x, height: size.y, alertOverride: null };

  function applyBloomScale() {
    const p = renderer.getPixelRatio();
    const s = QUALITY[state.quality].bloomScale;
    bloom.setSize(Math.max(8, Math.floor(state.width * p * s)), Math.max(8, Math.floor(state.height * p * s)));
  }

  const api = {
    composer,
    ao,
    bloom,
    finalPass,
    smaa,
    /** Per-mode tuning: exposure, AO, bloom, vignette, grain, shadow lift. mode: "interior" | "exterior". */
    setMode(mode) {
      const m = MODES[mode] || MODES.interior;
      state.mode = mode;
      renderer.toneMappingExposure = m.exposure;
      Object.assign(ao.configuration, m.ao);
      bloom.strength = m.bloom.strength;
      bloom.radius = m.bloom.radius;
      bloom.threshold = m.bloom.threshold;
      finalPass.uniforms.vignette.value = m.vignette;
      finalPass.uniforms.grain.value = m.grain;
      finalPass.uniforms.lift.value.fromArray(m.lift);
      finalPass.uniforms.shadowAmount.value = m.shadowAmount;
    },
    /**
     * Quality hook for the adaptive scaler: 0 (cheapest) … 3 (full). Changes only the AO sample mode and the
     * bloom chain resolution; SMAA and every pass stay in place, no content is removed.
     */
    setQuality(level) {
      state.quality = THREE.MathUtils.clamp(Math.round(level), 0, QUALITY.length - 1);
      ao.setQualityMode(QUALITY[state.quality].ao);
      applyBloomScale();
      return state.quality;
    },
    getQuality() {
      return state.quality;
    },
    /** Force the alert vignette (0..1); pass null to follow the lighting controller again. */
    setAlert(a) {
      state.alertOverride = a === null || a === undefined ? null : THREE.MathUtils.clamp(a, 0, 1);
    },
    get mode() {
      return state.mode;
    },
    setSize(width, height) {
      state.width = width;
      state.height = height;
      composer.setSize(width, height);
      const p = renderer.getPixelRatio();
      finalPass.uniforms.resolution.value.set(width * p, height * p);
      applyBloomScale();
    },
    render(time) {
      finalPass.uniforms.time.value = time;
      finalPass.uniforms.alert.value = state.alertOverride !== null ? state.alertOverride : alertLevel.value;
      composer.render();
    },
  };
  return api;
}
