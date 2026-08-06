// post.js — EffectComposer chain: render → bloom → tonemap/output → grade
// (S-curve, lift, tints, vignette, grain, CA, dither) → FXAA. Quality-scalable.
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
    uVignette: { value: 0.34 },
    uGrain: { value: 0.028 },
    uCA: { value: 0.0009 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTintHi: { value: new THREE.Color(1, 1, 1) },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uContrast: { value: 1.03 },
    uSCurve: { value: 0.1 },
    uSat: { value: 1.0 },
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
    uniform vec3 uTintHi;
    uniform vec3 uLift;
    uniform float uContrast;
    uniform float uSCurve;
    uniform float uSat;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 uv = vUv;
      vec2 fromCenter = uv - 0.5;
      float r2 = dot(fromCenter, fromCenter);
      // subtle chromatic aberration, only near edges (~2px R/B split at corners)
      vec2 caOff = fromCenter * uCA * (0.2 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + caOff).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - caOff).b;
      col = clamp(col, 0.0, 1.0);
      // gentle filmic S-curve, then linear contrast around mid gray
      col = mix(col, col * col * (3.0 - 2.0 * col), uSCurve);
      col = (col - 0.5) * uContrast + 0.5;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // lifted shadows (night: cool blue floor)
      col += uLift * (1.0 - smoothstep(0.0, 0.45, lum));
      // tinted highlights (sunset warmth) + global tint
      col *= mix(vec3(1.0), uTintHi, smoothstep(0.55, 0.95, lum));
      col *= uTint;
      // saturation
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);
      // vignette
      float vig = 1.0 - smoothstep(0.18, 0.85, r2 * (1.0 + uVignette)) * uVignette;
      col *= vig;
      // animated grain
      float gr = (hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 43.7) - 0.5) * uGrain;
      col += gr;
      // ~1.5/255 hash dither breaks 8-bit banding in smooth sky gradients
      col += (hash(uv * vec2(913.1, 719.7) + fract(uTime * 0.37) * 29.0) - 0.5) * 0.0059;
      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `,
};

// per-preset looks; values are damped toward these targets so time-of-day
// changes glide instead of popping
const LOOKS = {
  day: {
    // threshold raised 0.85→0.90 per missiles specialist: keeps the sun-halo
    // sky from blooming over a distant threat dot; explosions sit far above it
    bloomStrength: 0.42, bloomThreshold: 0.90,
    tint: [1.0, 1.0, 1.0], tintHi: [1.0, 1.0, 1.0], lift: [0.0, 0.0, 0.0],
    grain: 0.028, scurve: 0.10, contrast: 1.035, sat: 1.02, vignette: 0.34,
  },
  sunset: {
    bloomStrength: 0.60, bloomThreshold: 0.82,
    tint: [1.03, 0.99, 0.96], tintHi: [1.07, 0.98, 0.90], lift: [0.010, 0.006, 0.014],
    grain: 0.036, scurve: 0.18, contrast: 1.02, sat: 1.06, vignette: 0.38,
  },
  night: {
    bloomStrength: 0.72, bloomThreshold: 0.82,
    tint: [0.96, 0.99, 1.05], tintHi: [1.0, 1.0, 1.0], lift: [0.020, 0.030, 0.058],
    grain: 0.055, scurve: 0.06, contrast: 1.01, sat: 0.95, vignette: 0.40,
  },
};

export function createPost(ctx) {
  const { renderer, scene, camera } = ctx;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.45, 0.55, 0.85);
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

  let look = LOOKS.day;
  const cur = {
    bloomStrength: look.bloomStrength, bloomThreshold: look.bloomThreshold,
    tint: new THREE.Color().fromArray(look.tint),
    tintHi: new THREE.Color().fromArray(look.tintHi),
    lift: new THREE.Vector3().fromArray(look.lift),
    grain: look.grain, scurve: look.scurve, contrast: look.contrast,
    sat: look.sat, vignette: look.vignette,
  };
  const _c = new THREE.Color();
  const _v = new THREE.Vector3();

  ctx.events.on('time-of-day', (t) => {
    look = LOOKS[t] ?? LOOKS.day;
  });

  function applyLook(dt) {
    const k = Math.min(1, 1 - Math.exp(-dt * 2.4));
    cur.bloomStrength += (look.bloomStrength - cur.bloomStrength) * k;
    cur.bloomThreshold += (look.bloomThreshold - cur.bloomThreshold) * k;
    cur.tint.lerp(_c.fromArray(look.tint), k);
    cur.tintHi.lerp(_c.fromArray(look.tintHi), k);
    cur.lift.lerp(_v.fromArray(look.lift), k);
    cur.grain += (look.grain - cur.grain) * k;
    cur.scurve += (look.scurve - cur.scurve) * k;
    cur.contrast += (look.contrast - cur.contrast) * k;
    cur.sat += (look.sat - cur.sat) * k;
    cur.vignette += (look.vignette - cur.vignette) * k;

    bloom.strength = cur.bloomStrength;
    bloom.threshold = cur.bloomThreshold;
    const u = grade.uniforms;
    u.uTint.value.copy(cur.tint);
    u.uTintHi.value.copy(cur.tintHi);
    u.uLift.value.copy(cur.lift);
    u.uGrain.value = cur.grain;
    u.uSCurve.value = cur.scurve;
    u.uContrast.value = cur.contrast;
    u.uSat.value = cur.sat;
    u.uVignette.value = cur.vignette;
  }

  let lastNow = ctx.time?.now ?? 0;

  return {
    composer, bloom, grade, fxaa,
    setSize,
    setQuality(q) {
      bloom.enabled = q !== 'low';
      fxaa.enabled = true;
    },
    render(dtUnscaled) {
      grade.uniforms.uTime.value += dtUnscaled;
      // follow the game clock when it advances faster than render time (fixed
      // stepping while paused), so look transitions stay deterministic
      const now = ctx.time?.now ?? 0;
      const dl = Math.min(1, Math.max(dtUnscaled, now - lastNow));
      lastNow = now;
      if (dl > 0) applyLook(dl);
      composer.render();
    },
  };
}
