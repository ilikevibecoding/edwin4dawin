// Post-processing chain: bloom, filmic grade and anti-aliasing.
//
// Order is RenderPass -> OutputPass (ACES + sRGB) -> UnrealBloomPass -> grade
// -> SMAA. Bloom deliberately runs on the tone-mapped image; see the note at
// the composer setup below.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
// main.js routes the reduced-motion setting to the post chain only, so this
// pass forwards it to the sky as well (star scintillation lives there).
import { MOTION } from './weather.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAspect: { value: 16 / 9 },
    // 1 normally, 0 when the player has asked for reduced motion; gates every
    // animated or displacement-based effect in this pass
    uMotion: { value: 1 },

    uVignette: { value: 0.32 },
    uGrain: { value: 0.03 },
    uAberration: { value: 0.00055 },

    uContrast: { value: 1.06 },
    uSaturation: { value: 1.05 },
    uHiDesat: { value: 0.30 },
    uShoulder: { value: 0.72 },
    uShadowTint: { value: new THREE.Vector3(-0.006, 0.0, 0.014) },
    uHighlightTint: { value: new THREE.Vector3(0.014, 0.006, -0.008) },

    // screen-space position of the sun (or the moon at night) plus how much
    // veil to hang on it; the pass never sees the scene so main/weather feed
    // it through the condition object and the shared camera
    uKeyScreen: { value: new THREE.Vector2(0.5, 0.5) },
    uVeilAmount: { value: 0 },
    uVeilColor: { value: new THREE.Vector3(1.0, 0.86, 0.62) },
    uKeyTint: { value: 0 },

    // desert heat shimmer, anchored to the horizon line in screen space
    uShimmer: { value: 0 },
    uHorizon: { value: 0.5 },

    uShake: { value: 0 },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAspect;
    uniform float uMotion;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uHiDesat;
    uniform float uShoulder;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform vec2 uKeyScreen;
    uniform float uVeilAmount;
    uniform vec3 uVeilColor;
    uniform float uKeyTint;
    uniform float uShimmer;
    uniform float uHorizon;
    uniform float uShake;
    uniform float uFlash;
    varying vec2 vUv;

    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    const float PIVOT = 0.18;

    float hash21(vec2 p) {
      p = fract(p * vec2(443.8975, 397.2973));
      p += dot(p, p + 19.19);
      return fract(p.x * p.y);
    }

    vec3 toLinear(vec3 c) {
      return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
    }

    vec3 toSrgb(vec3 c) {
      c = max(c, 0.0);
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      // aspect-corrected radius so the vignette stays circular on wide frames
      vec2 q = vec2(c.x * uAspect, c.y);
      float rn = length(q) / length(vec2(uAspect, 1.0) * 0.5);

      // --- heat shimmer -----------------------------------------------------
      // A shear band hanging just under the horizon: that is where a sight
      // line grazes hot ground for kilometres. Zero at the horizon itself so
      // sky never bleeds into terrain, and gone by the bottom of the frame.
      float shim = uShimmer * uMotion;
      if (shim > 0.0) {
        float below = clamp((uHorizon - uv.y) / 0.34, 0.0, 1.0);
        float band = smoothstep(0.0, 0.10, below) * (1.0 - below);
        float t = uTime * 1.7;
        float w = sin(uv.y * 260.0 + t * 3.3) * 0.6 + sin(uv.y * 97.0 - t * 2.1 + uv.x * 21.0) * 0.4;
        float wy = sin(uv.x * 150.0 + t * 2.6) * 0.5 + sin(uv.y * 190.0 - t * 1.7) * 0.5;
        uv += vec2(w * 0.55, wy) * band * shim * 0.0016;
      }

      // --- lateral chromatic aberration -------------------------------------
      // Held at zero across the middle of the frame; the old constant term
      // fringed the apron markings the player is usually looking straight at.
      float ab = uAberration * smoothstep(0.30, 1.0, rn) * (1.0 + uShake * 2.2 * uMotion);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;

      col = toLinear(max(col, 0.0));

      // --- filmic grade (linear) --------------------------------------------
      // contrast about a scene-linear pivot rather than about 0.5, which is
      // what stops mid grey sliding as contrast changes between conditions
      col = exp2((log2(max(col, 1e-5)) - log2(PIVOT)) * uContrast + log2(PIVOT));

      float lum = max(dot(col, LUMA), 0.0);

      // highlights desaturate as they climb, then roll off instead of clipping
      float hi = smoothstep(0.42, 1.0, lum);
      col = mix(col, vec3(lum), hi * uHiDesat);
      col = col / (1.0 + max(col - uShoulder, 0.0) * 0.85);

      // split tone: cool the shadows, warm the highlights
      col += uShadowTint * (1.0 - smoothstep(0.0, 0.42, lum));
      col += uHighlightTint * smoothstep(0.30, 1.0, lum);

      lum = dot(col, LUMA);
      col = mix(vec3(lum), col, uSaturation);

      // --- sun / moon veil ---------------------------------------------------
      if (uVeilAmount > 0.0) {
        vec2 kq = uKeyScreen - uv;
        kq.x *= uAspect;
        float kd2 = dot(kq, kq);
        float veil = exp(-kd2 * 34.0) * 0.55 + exp(-kd2 * 3.2) * 0.30 + exp(-kd2 * 0.55) * 0.13;
        col += uVeilColor * veil * uVeilAmount;
        // a whole-frame wash so looking into the key warms the shadows too
        col += uVeilColor * uKeyTint * 0.05;
      }

      // --- vignette ----------------------------------------------------------
      col *= 1.0 - uVignette * pow(smoothstep(0.32, 1.06, rn), 1.5);

      col += uFlash;

      col = toSrgb(col);

      // --- grain -------------------------------------------------------------
      // Quantised to 24 fps so it reads as film rather than as digital
      // sparkle, and biased toward the mid tones where real grain lives.
      float gt = floor(uTime * 24.0) * uMotion;
      vec2 gp = uv * vec2(1280.0, 720.0);
      float g = hash21(gp + gt * 17.31) + hash21(gp * 1.37 - gt * 9.71) - 1.0;
      float gl = dot(col, LUMA);
      col += g * 0.5 * uGrain * (1.0 - pow(abs(gl * 2.0 - 1.0), 1.5) * 0.8);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, { quality = 'high' } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Tone map first, then bloom. The analytic sky renders several units of
    // linear radiance, so an HDR bloom threshold would treat the whole sky as
    // a highlight and veil the frame. Blooming the tone-mapped image keeps
    // highlights localised to genuinely bright things: the sun disc, the moon,
    // plumes, explosions and status lights.
    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.62, 0.9);
    this.composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);

    this.enabled = true;
    this.flash = 0;
    this.reducedMotion = false;

    this._bloomBase = { strength: 0.3, threshold: 0.9, radius: 0.62 };
    this._bloomScale = 1;
    this._condition = null;
    this._keyDir = new THREE.Vector3(0, 1, 0);
    this._fwd = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._veilBase = 0;
    this._shimmerBase = 0;
    this._aberrationBase = 0.00055;

    this.grade.uniforms.uAspect.value = size.x / Math.max(1, size.y);
    this.setQuality(quality);
  }

  setQuality(q) {
    this.quality = q;
    this.bloom.enabled = true;
    this.smaa.enabled = q === 'high';
    this._bloomScale = q === 'low' ? 0.6 : 1;
    // shimmer is a per-pixel displacement; it is the first thing to go
    this._shimmerAllowed = q !== 'low';
    this._pushBloom();
    this._pushMotion();
  }

  _pushBloom() {
    this.bloom.strength = this._bloomBase.strength * this._bloomScale;
    this.bloom.threshold = this._bloomBase.threshold;
    this.bloom.radius = this._bloomBase.radius;
  }

  _pushMotion() {
    const u = this.grade.uniforms;
    const on = !this.reducedMotion;
    u.uMotion.value = on ? 1 : 0;
    u.uShimmer.value = on && this._shimmerAllowed ? this._shimmerBase : 0;
    // still a hint of edge fringing when reduced motion is on, but a quarter
    // of it, and never any shake-driven growth
    u.uAberration.value = this._aberrationBase * (on ? 1 : 0.25);
  }

  applyCondition(c) {
    this._condition = c;
    this._bloomBase.strength = c.bloomStrength;
    this._bloomBase.threshold = c.bloomThreshold;
    this._bloomBase.radius = c.bloomRadius ?? (c.id === 'night' ? 0.85 : 0.7);
    this._pushBloom();

    const u = this.grade.uniforms;
    u.uGrain.value = c.grain;
    u.uVignette.value = c.vignette;
    u.uContrast.value = c.contrast ?? 1.05;
    u.uSaturation.value = c.saturation ?? 1.05;
    u.uHiDesat.value = c.id === 'night' ? 0.18 : 0.32;
    u.uShoulder.value = c.id === 'night' ? 0.80 : 0.70;
    if (c.shadowTint) u.uShadowTint.value.fromArray(c.shadowTint);
    if (c.highlightTint) u.uHighlightTint.value.fromArray(c.highlightTint);
    if (c.veilColor) u.uVeilColor.value.fromArray(c.veilColor);

    this._veilBase = c.veilStrength ?? 0;
    this._shimmerBase = c.shimmer ?? 0;
    this._aberrationBase = c.aberration ?? 0.00055;

    // the veil tracks whichever body is acting as the key light
    const phi = THREE.MathUtils.degToRad(90 - (c.keyElevation ?? c.sunElevation ?? 45));
    const theta = THREE.MathUtils.degToRad(c.keyAzimuth ?? c.sunAzimuth ?? 0);
    this._keyDir.setFromSphericalCoords(1, phi, theta);

    this._pushMotion();
  }

  setReducedMotion(on) {
    this.reducedMotion = !!on;
    MOTION.enabled = !this.reducedMotion;
    this._pushMotion();
  }

  addFlash(v) {
    // flashes are the most motion-sickness-prone thing in the chain
    const scale = this.reducedMotion ? 0.3 : 1;
    this.flash = Math.min(0.7, this.flash + v * scale);
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    if (this.smaa.setSize) this.smaa.setSize(w, h);
    this.grade.uniforms.uAspect.value = w / Math.max(1, h);
  }

  /** Project the key light into screen space and find the horizon line. */
  _trackKey() {
    const u = this.grade.uniforms;
    const cam = this.camera;
    cam.getWorldDirection(this._fwd);

    // horizon in UV space; exact for a camera without roll, which the FPS
    // controller guarantees
    const fy = THREE.MathUtils.clamp(this._fwd.y, -0.999, 0.999);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5));
    const ndc = -fy / (Math.sqrt(1 - fy * fy) * tanHalf);
    u.uHorizon.value = ndc * 0.5 + 0.5;

    if (this._veilBase <= 0) {
      u.uVeilAmount.value = 0;
      return;
    }
    const facing = this._fwd.dot(this._keyDir);
    if (facing <= 0.02) {
      u.uVeilAmount.value = 0;
      return;
    }
    this._tmp.copy(this._keyDir).multiplyScalar(20000).add(cam.position).project(cam);
    u.uKeyScreen.value.set(this._tmp.x * 0.5 + 0.5, this._tmp.y * 0.5 + 0.5);
    // fade in as the key enters the frame so it cannot pop at the edge
    const amount = this._veilBase * THREE.MathUtils.smoothstep(facing, 0.02, 0.45);
    u.uVeilAmount.value = amount;
    u.uKeyTint.value = amount * THREE.MathUtils.smoothstep(facing, 0.3, 0.95);
  }

  render(dt, elapsed, shake = 0) {
    const u = this.grade.uniforms;
    u.uTime.value = elapsed;
    u.uShake.value = this.reducedMotion ? 0 : shake;
    this.flash *= Math.exp(-6 * dt);
    u.uFlash.value = this.flash;
    this._trackKey();
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
