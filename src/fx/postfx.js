import * as THREE from 'three';
import { settings } from '../core/settings.js';

// ---------------------------------------------------------------------------
// PostFX.  (owner: fable4)
//
// A lightweight hand-rolled composite pipeline (no examples/jsm dependency):
//
//   scene (linear, HDR-ish) ──► bright-pass ─► separable blur (¼ res) ─┐
//        │                                                             ▼
//        └────────────────────────► COMPOSITE (ACES tone map ► filmic grade
//                                   ► sRGB ► vignette ► grain ► pulse) ─►
//                                   [motion-blur history blend] ─► [FXAA] ─► canvas
//
// RENDER INTEGRATION + ORDERING (documented decision)
// ---------------------------------------------------
// PostFX must not edit engine.js/game.js, so the constructor wraps
// `game.engine.render` ONCE (idempotent via a marker on the wrapper).
// The Game constructs ViewModel FIRST and PostFX SECOND, so this wrapper is
// the OUTERMOST: it binds the scene render target, calls the inner chain
// (main scene render + the ViewModel overlay — both land in our target),
// then runs the composite to the canvas. If construction order ever changed,
// both wrappers stay correct: whichever wraps last simply becomes outermost,
// and the ViewModel draws into "the current render target" by design.
//
// Three.js r169 renders into WebGLRenderTargets WITHOUT tone mapping or
// output-colour-space conversion, so the composite shader applies the exact
// ACES filmic fit + sRGB encode the engine would have used, keeping the
// graded frame consistent with the raw pipeline.
//
// Respects settings: bloom, vignette, filmGrain, motionBlur (off by
// default), quality (bloom gate + FXAA via quality.ssaa), resolutionScale
// (inherited from the engine's drawing-buffer size).
// ---------------------------------------------------------------------------

const FS_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tInput;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tInput, vUv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(uThreshold, uThreshold + 0.55, lum);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tInput;
uniform vec2 uDir; // texel-space step
varying vec2 vUv;
void main() {
  vec3 acc = texture2D(tInput, vUv).rgb * 0.227027;
  vec2 o1 = uDir * 1.3846153846;
  vec2 o2 = uDir * 3.2307692308;
  acc += texture2D(tInput, vUv + o1).rgb * 0.3162162162;
  acc += texture2D(tInput, vUv - o1).rgb * 0.3162162162;
  acc += texture2D(tInput, vUv + o2).rgb * 0.0702702703;
  acc += texture2D(tInput, vUv - o2).rgb * 0.0702702703;
  gl_FragColor = vec4(acc, 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloomStrength;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec3 uPulseColor;
uniform float uPulseAmt;
varying vec2 vUv;

// Exact ACES filmic fit used by three.js (Stephen Hill / MJP).
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 acesFilmic(vec3 color) {
  const mat3 inM = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 outM = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = inM * color;
  color = RRTAndODTFit(color);
  color = outM * color;
  return clamp(color, 0.0, 1.0);
}
vec3 sRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 hdr = texture2D(tScene, vUv).rgb;
  hdr += texture2D(tBloom, vUv).rgb * uBloomStrength;

  vec3 c = acesFilmic(hdr);

  // Filmic grade: cold-blue shadows, warm tungsten highlights, gentle
  // contrast + saturation — matches the Northstar colour script.
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowTint = vec3(0.93, 0.985, 1.075);
  vec3 highTint = vec3(1.055, 1.0, 0.945);
  c *= mix(shadowTint, highTint, smoothstep(0.12, 0.72, lum));
  c = mix(vec3(0.5), c, 1.035);                      // contrast
  c = mix(vec3(lum), c, 1.05);                        // saturation
  c = clamp(c, 0.0, 1.0);

  c = sRGB(c);

  // Vignette (in display space, restrained).
  vec2 d = vUv - 0.5;
  float edge = dot(d, d) * 2.0;
  c *= 1.0 - uVignette * smoothstep(0.35, 1.15, edge);

  // Outcome pulse (victory / defeat / damage accents from EffectsSystem).
  c += uPulseColor * (uPulseAmt * (0.22 + 0.78 * smoothstep(0.15, 0.9, edge)));

  // Film grain.
  float g = hash(vUv * vec2(1471.0, 983.0) + fract(uTime) * 43.7) - 0.5;
  c += g * uGrain * (0.35 + 0.65 * (1.0 - lum));

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const BLEND_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tCurrent;
uniform sampler2D tHistory;
uniform float uAmount;
varying vec2 vUv;
void main() {
  vec3 cur = texture2D(tCurrent, vUv).rgb;
  vec3 hist = texture2D(tHistory, vUv).rgb;
  gl_FragColor = vec4(mix(cur, hist, uAmount), 1.0);
}`;

const COPY_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tInput;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tInput, vUv); }`;

const FXAA_FRAG = /* glsl */`
precision highp float;
uniform sampler2D tInput;
uniform vec2 uRcp; // 1/resolution
varying vec2 vUv;

void main() {
  vec3 rgbNW = texture2D(tInput, vUv + vec2(-1.0, -1.0) * uRcp).rgb;
  vec3 rgbNE = texture2D(tInput, vUv + vec2(1.0, -1.0) * uRcp).rgb;
  vec3 rgbSW = texture2D(tInput, vUv + vec2(-1.0, 1.0) * uRcp).rgb;
  vec3 rgbSE = texture2D(tInput, vUv + vec2(1.0, 1.0) * uRcp).rgb;
  vec3 rgbM = texture2D(tInput, vUv).rgb;
  const vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM = dot(rgbM, luma);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.03125, 0.0078125);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = min(vec2(8.0), max(vec2(-8.0), dir * rcpDirMin)) * uRcp;

  vec3 rgbA = 0.5 * (
    texture2D(tInput, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
    texture2D(tInput, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (
    texture2D(tInput, vUv + dir * -0.5).rgb +
    texture2D(tInput, vUv + dir * 0.5).rgb);
  float lumaB = dot(rgbB, luma);
  gl_FragColor = vec4((lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB, 1.0);
}`;

function fsMaterial(fragment, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: FS_VERT,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
    // Critical: when a pass draws straight to the canvas, three.js would
    // otherwise inject its tone-mapping GLSL (defining RRTAndODTFit a second
    // time) into the program prefix and the shader fails to compile.
    toneMapped: false,
  });
}

export class PostFX {
  constructor(game) {
    this.game = game;
    this.renderer = game.engine?.renderer || null;
    this.time = 0;
    this._broken = false;
    this._size = new THREE.Vector2();
    this._pulse = { color: new THREE.Color(0, 0, 0), amt: 0, decay: 1 };

    // Fullscreen triangle rig.
    this._fsScene = new THREE.Scene();
    this._fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -1, -1, 0, 3, -1, 0, -1, 3, 0,
    ]), 3));
    this._fsMesh = new THREE.Mesh(geo, null);
    this._fsMesh.frustumCulled = false;
    this._fsScene.add(this._fsMesh);

    // Materials.
    this.brightMat = fsMaterial(BRIGHT_FRAG, {
      tInput: { value: null }, uThreshold: { value: 1.0 },
    });
    this.blurMat = fsMaterial(BLUR_FRAG, {
      tInput: { value: null }, uDir: { value: new THREE.Vector2() },
    });
    this.compositeMat = fsMaterial(COMPOSITE_FRAG, {
      tScene: { value: null }, tBloom: { value: null },
      uBloomStrength: { value: 0.5 }, uExposure: { value: 1.0 },
      uVignette: { value: 0.30 }, uGrain: { value: 0.03 },
      uTime: { value: 0 },
      uPulseColor: { value: new THREE.Color(0, 0, 0) }, uPulseAmt: { value: 0 },
    });
    this.blendMat = fsMaterial(BLEND_FRAG, {
      tCurrent: { value: null }, tHistory: { value: null }, uAmount: { value: 0.45 },
    });
    this.copyMat = fsMaterial(COPY_FRAG, { tInput: { value: null } });
    this.fxaaMat = fsMaterial(FXAA_FRAG, {
      tInput: { value: null }, uRcp: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    });

    // Render targets are (re)created lazily against the drawing-buffer size.
    this.rtScene = null;
    this.rtBloomA = null;
    this.rtBloomB = null;
    this.rtLdrA = null;
    this.rtLdrB = null;
    this.rtHistory = null;
    this._historyValid = false;

    // ---- wrap engine.render (idempotent, outermost — see header) ------------
    const engine = game.engine;
    if (engine && !engine.render.__nsPostFXWrapped) {
      const inner = engine.render.bind ? engine.render.bind(engine) : engine.render;
      const wrapped = () => this._renderFrame(inner);
      wrapped.__nsPostFXWrapped = true;
      // Preserve the ViewModel marker so its idempotency check keeps working.
      if (engine.render.__nsViewModelWrapped) wrapped.__nsViewModelWrapped = true;
      engine.render = wrapped;
    }
    if (this.renderer) this.renderer.info.autoReset = false;
  }

  /** Colour flash used by mission transitions and heavy feedback. */
  pulse(color, strength = 0.5, duration = 1.2) {
    this._pulse.color.set(color);
    this._pulse.amt = Math.max(this._pulse.amt, strength);
    this._pulse.decay = strength / Math.max(0.1, duration);
  }

  /** Frame system (order 95): only advances animated uniforms. */
  update(dt) {
    this.time += dt;
    if (this._pulse.amt > 0) {
      this._pulse.amt = Math.max(0, this._pulse.amt - this._pulse.decay * dt);
    }
  }

  // ---------------------------------------------------------------- frame --

  _ensureTargets() {
    const renderer = this.renderer;
    renderer.getDrawingBufferSize(this._size);
    const w = Math.max(4, this._size.x | 0);
    const h = Math.max(4, this._size.y | 0);
    if (this.rtScene && this.rtScene.width === w && this.rtScene.height === h) return;

    for (const key of ['rtScene', 'rtBloomA', 'rtBloomB', 'rtLdrA', 'rtLdrB', 'rtHistory']) {
      this[key]?.dispose();
      this[key] = null;
    }
    const caps = renderer.capabilities;
    const hdrType = caps.isWebGL2 || renderer.extensions.get('OES_texture_half_float')
      ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (ww, hh, type, depth) => new THREE.WebGLRenderTarget(ww, hh, {
      type, depthBuffer: depth, stencilBuffer: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.rtScene = mk(w, h, hdrType, true);
    const bw = Math.max(4, w >> 2);
    const bh = Math.max(4, h >> 2);
    this.rtBloomA = mk(bw, bh, hdrType, false);
    this.rtBloomB = mk(bw, bh, hdrType, false);
    this.rtLdrA = mk(w, h, THREE.UnsignedByteType, false);
    this.rtLdrB = mk(w, h, THREE.UnsignedByteType, false);
    this.rtHistory = mk(w, h, THREE.UnsignedByteType, false);
    this._historyValid = false;
    this.fxaaMat.uniforms.uRcp.value.set(1 / w, 1 / h);
    // Bright-pass threshold: with a byte buffer nothing exceeds 1.0, so pull
    // the knee down to still find the hot fixtures.
    this.brightMat.uniforms.uThreshold.value = hdrType === THREE.HalfFloatType ? 1.0 : 0.72;
  }

  _pass(material, target) {
    this._fsMesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this._fsScene, this._fsCamera);
  }

  _renderFrame(inner) {
    const renderer = this.renderer;
    if (this._broken || !renderer) {
      inner();
      return;
    }
    try {
      renderer.info.reset();
      this._ensureTargets();
      const q = settings.quality;
      const bloomOn = !!(settings.get('bloom') && q.bloom);
      const fxaaOn = !!q.ssaa;
      const motionOn = !!settings.get('motionBlur');
      const vignetteOn = !!settings.get('vignette');
      const grainOn = !!settings.get('filmGrain');

      // 1) main scene + viewmodel overlay into the linear target.
      renderer.setRenderTarget(this.rtScene);
      inner();

      // 2) bloom chain at quarter res.
      if (bloomOn) {
        this.brightMat.uniforms.tInput.value = this.rtScene.texture;
        this._pass(this.brightMat, this.rtBloomA);
        this.blurMat.uniforms.tInput.value = this.rtBloomA.texture;
        this.blurMat.uniforms.uDir.value.set(1 / this.rtBloomA.width, 0);
        this._pass(this.blurMat, this.rtBloomB);
        this.blurMat.uniforms.tInput.value = this.rtBloomB.texture;
        this.blurMat.uniforms.uDir.value.set(0, 1 / this.rtBloomA.height);
        this._pass(this.blurMat, this.rtBloomA);
      }

      // 3) composite (tone map + grade + vignette + grain + pulse).
      const cu = this.compositeMat.uniforms;
      cu.tScene.value = this.rtScene.texture;
      cu.tBloom.value = bloomOn ? this.rtBloomA.texture : this.rtScene.texture;
      cu.uBloomStrength.value = bloomOn ? 0.42 : 0.0;
      cu.uExposure.value = this.game.engine?.renderer?.toneMappingExposure ?? 1.0;
      cu.uVignette.value = vignetteOn ? 0.30 : 0.0;
      cu.uGrain.value = grainOn ? 0.028 : 0.0;
      cu.uTime.value = this.time;
      cu.uPulseColor.value.copy(this._pulse.color);
      cu.uPulseAmt.value = this._pulse.amt;

      const needsPost = motionOn || fxaaOn;
      this._pass(this.compositeMat, needsPost ? this.rtLdrA : null);

      let current = this.rtLdrA;

      // 4) optional motion blur: exponential history blend (disabled by default).
      if (motionOn && needsPost) {
        if (!this._historyValid) {
          this.copyMat.uniforms.tInput.value = current.texture;
          this._pass(this.copyMat, this.rtHistory);
          this._historyValid = true;
        }
        this.blendMat.uniforms.tCurrent.value = current.texture;
        this.blendMat.uniforms.tHistory.value = this.rtHistory.texture;
        this.blendMat.uniforms.uAmount.value = 0.42;
        this._pass(this.blendMat, this.rtLdrB);
        // Update history with the blended result.
        this.copyMat.uniforms.tInput.value = this.rtLdrB.texture;
        this._pass(this.copyMat, this.rtHistory);
        current = this.rtLdrB;
      } else {
        this._historyValid = false;
      }

      // 5) FXAA (or plain copy) to the canvas.
      if (needsPost) {
        if (fxaaOn) {
          this.fxaaMat.uniforms.tInput.value = current.texture;
          this._pass(this.fxaaMat, null);
        } else {
          this.copyMat.uniforms.tInput.value = current.texture;
          this._pass(this.copyMat, null);
        }
      }
      renderer.setRenderTarget(null);
    } catch (err) {
      // Fail safe: never take the whole game down over post-processing.
      console.warn('[postfx] disabled after error:', err);
      this._broken = true;
      this.renderer.info.autoReset = true;
      this.renderer.setRenderTarget(null);
      inner();
    }
  }

  dispose() {
    for (const key of ['rtScene', 'rtBloomA', 'rtBloomB', 'rtLdrA', 'rtLdrB', 'rtHistory']) {
      this[key]?.dispose();
      this[key] = null;
    }
  }
}
