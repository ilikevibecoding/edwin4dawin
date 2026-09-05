// HDR post-processing: the scene (and the hand) render into a half-float target; bloom is a threshold + 5-level
// down/up-sample chain capped at +0.35 per pixel; the composite applies ACES filmic tone mapping with a time-of-day
// exposure, a subtle vignette, and optionally FXAA on the tone-mapped image.
//
// Colour handling: the game's shaders were tuned with outputColorSpace = LinearSRGB, i.e. they output display
// values directly. The tone mapper therefore treats them as display-referred: it decodes with a 2.2 gamma, applies
// exposure + ACES in linear light and re-encodes, so exposure 1.0 leaves mid-tones close to the old look and only
// the filmic toe/shoulder differ. Exposure is calibrated against the mean luminance of the old daytime frame.
import * as THREE from 'three';

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// bright pass + first downsample (full -> half resolution), soft knee around the threshold
const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tex; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee;
varying vec2 vUv;
vec3 bright(vec3 c) {
  float l = max(max(c.r, c.g), c.b);
  float s = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  s = s * s / (4.0 * uKnee + 1e-5);
  float w = max(s, l - uThreshold) / max(l, 1e-4);
  return c * w;
}
void main() {
  vec3 c = texture2D(tex, vUv + vec2(-1.0, -1.0) * uTexel).rgb + texture2D(tex, vUv + vec2(1.0, -1.0) * uTexel).rgb
         + texture2D(tex, vUv + vec2(-1.0, 1.0) * uTexel).rgb + texture2D(tex, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  gl_FragColor = vec4(bright(c * 0.25), 1.0);
}`;

const DOWN_FRAG = /* glsl */ `
uniform sampler2D tex; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tex, vUv + vec2(-1.0, -1.0) * uTexel).rgb + texture2D(tex, vUv + vec2(1.0, -1.0) * uTexel).rgb
         + texture2D(tex, vUv + vec2(-1.0, 1.0) * uTexel).rgb + texture2D(tex, vUv + vec2(1.0, 1.0) * uTexel).rgb;
  gl_FragColor = vec4(c * 0.25, 1.0);
}`;

// tent-filtered upsample of the lower mip added to the same-resolution mip
const UP_FRAG = /* glsl */ `
uniform sampler2D uLow; uniform sampler2D uSame; uniform vec2 uTexel; uniform float uSameWeight;
varying vec2 vUv;
void main() {
  vec3 s = vec3(0.0);
  s += texture2D(uLow, vUv + vec2(-1.0, -1.0) * uTexel).rgb * 1.0;
  s += texture2D(uLow, vUv + vec2( 0.0, -1.0) * uTexel).rgb * 2.0;
  s += texture2D(uLow, vUv + vec2( 1.0, -1.0) * uTexel).rgb * 1.0;
  s += texture2D(uLow, vUv + vec2(-1.0,  0.0) * uTexel).rgb * 2.0;
  s += texture2D(uLow, vUv).rgb * 4.0;
  s += texture2D(uLow, vUv + vec2( 1.0,  0.0) * uTexel).rgb * 2.0;
  s += texture2D(uLow, vUv + vec2(-1.0,  1.0) * uTexel).rgb * 1.0;
  s += texture2D(uLow, vUv + vec2( 0.0,  1.0) * uTexel).rgb * 2.0;
  s += texture2D(uLow, vUv + vec2( 1.0,  1.0) * uTexel).rgb * 1.0;
  gl_FragColor = vec4(s / 16.0 + texture2D(uSame, vUv).rgb * uSameWeight, 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tex; uniform sampler2D bloom;
uniform float uExposure; uniform float uBloomStrength; uniform float uBloomCap; uniform float uVignette; uniform float uDebug;
uniform float uThreshold;
varying vec2 vUv;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture2D(tex, vUv).rgb;
  vec3 b = min(texture2D(bloom, vUv).rgb * uBloomStrength, vec3(uBloomCap));
  // debug views for the measurement scripts: 1 = capped bloom contribution, 2 = bloom source mask (HDR > threshold)
  if (uDebug > 1.5) { gl_FragColor = vec4(vec3(step(uThreshold, max(c.r, max(c.g, c.b)))), 1.0); return; }
  if (uDebug > 0.5) { gl_FragColor = vec4(b, 1.0); return; }
  c = max(c, 0.0) + b;
  vec3 lin = pow(c, vec3(2.2)) * uExposure;
  vec3 outc = pow(aces(lin), vec3(1.0 / 2.2));
  // subtle vignette: untouched inside ~70% of the frame height, -uVignette in the far corners
  vec2 q = vUv - 0.5;
  float v = 1.0 - uVignette * smoothstep(0.45, 1.0, length(q) * 1.3);
  gl_FragColor = vec4(outc * v, 1.0);
}`;

// FXAA (3.11-style, quality preset) restricted to geometric edges: hardware depth is an affine function of the
// screen position across a flat face, so its second difference is ~0 inside a face and only jumps at silhouettes and
// creases. Texel edges inside a face never reach the filter, which keeps the NearestFilter textures crisp; the
// edge-contrast early out then skips low-contrast geometry too.
const FXAA_FRAG = /* glsl */ `
uniform sampler2D tex; uniform sampler2D depthTex; uniform vec2 uTexel;
varying vec2 vUv;
#define FXAA_REDUCE_MIN (1.0 / 128.0)
#define FXAA_REDUCE_MUL (1.0 / 8.0)
#define FXAA_SPAN_MAX 8.0
void main() {
  vec2 uv = vUv;
  vec3 rgbM = texture2D(tex, uv).rgb;
  float dC = texture2D(depthTex, uv).r;
  float dL = texture2D(depthTex, uv - vec2(uTexel.x, 0.0)).r, dR = texture2D(depthTex, uv + vec2(uTexel.x, 0.0)).r;
  float dD = texture2D(depthTex, uv - vec2(0.0, uTexel.y)).r, dU = texture2D(depthTex, uv + vec2(0.0, uTexel.y)).r;
  float d2 = max(abs(dL + dR - 2.0 * dC), abs(dD + dU - 2.0 * dC));
  float d1 = max(max(abs(dL - dC), abs(dR - dC)), max(abs(dD - dC), abs(dU - dC)));
  // 1e-6 sits ~8x above the 24-bit quantisation noise of the second difference on a flat face
  if (d2 < 0.25 * d1 + 1e-6) { gl_FragColor = vec4(rgbM, 1.0); return; }
  vec3 rgbNW = texture2D(tex, uv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbNE = texture2D(tex, uv + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 rgbSW = texture2D(tex, uv + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture2D(tex, uv + vec2(1.0, 1.0) * uTexel).rgb;
  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma), lumaNE = dot(rgbNE, luma), lumaSW = dot(rgbSW, luma), lumaSE = dot(rgbSE, luma), lumaM = dot(rgbM, luma);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
  if (lumaMax - lumaMin < max(0.0625, lumaMax * 0.166)) { gl_FragColor = vec4(rgbM, 1.0); return; }
  vec2 dir = vec2(-((lumaNW + lumaNE) - (lumaSW + lumaSE)), ((lumaNW + lumaSW) - (lumaNE + lumaSE)));
  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * uTexel;
  vec3 rgbA = 0.5 * (texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, uv + dir * -0.5).rgb + texture2D(tex, uv + dir * 0.5).rgb);
  float lumaB = dot(rgbB, luma);
  gl_FragColor = vec4((lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB, 1.0);
}`;

const BLOOM_LEVELS = 5;

function makeTarget(w, h, opts, hdrType) {
  w = Math.max(1, w); h = Math.max(1, h);
  return new THREE.WebGLRenderTarget(w, h, {
    type: opts.type || hdrType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
    depthBuffer: !!opts.depth, stencilBuffer: false, colorSpace: THREE.NoColorSpace,
    // the scene target keeps its depth in a sampleable texture (DEPTH_COMPONENT24) for the FXAA geometry mask
    depthTexture: opts.depth ? new THREE.DepthTexture(w, h, THREE.UnsignedIntType) : null,
  });
}

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    // half-float colour buffers need EXT_color_buffer_(half_)float; without it the chain degrades to 8-bit (no HDR)
    const ext = renderer.extensions;
    this.hdrType = (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')) ? THREE.HalfFloatType : THREE.UnsignedByteType;
    if (this.hdrType !== THREE.HalfFloatType) console.warn('[post] no float colour buffers: HDR pipeline falls back to 8-bit targets');
    this.width = 1; this.height = 1;
    this.bloomEnabled = true;
    this.fxaaEnabled = false;
    this.exposure = 1.0;
    this.vignette = 0.14;
    this.bloomStrength = 0.7;
    this.bloomThreshold = 1.0;
    this.bloomKnee = 0.15;
    this.bloomCap = 0.35;
    this.debugView = null;   // 'bloom' shows the (capped) bloom contribution alone

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
    this.brightMat = mat(BRIGHT_FRAG, { tex: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 }, uKnee: { value: 0.15 } });
    this.downMat = mat(DOWN_FRAG, { tex: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.upMat = mat(UP_FRAG, { uLow: { value: null }, uSame: { value: null }, uTexel: { value: new THREE.Vector2() }, uSameWeight: { value: 1 } });
    this.compositeMat = mat(COMPOSITE_FRAG, { tex: { value: null }, bloom: { value: null }, uExposure: { value: 1 }, uBloomStrength: { value: 0.7 }, uBloomCap: { value: 0.35 }, uVignette: { value: 0.14 }, uDebug: { value: 0 }, uThreshold: { value: 1 } });
    this.fxaaMat = mat(FXAA_FRAG, { tex: { value: null }, depthTex: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(geo, this.compositeMat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.hdr = null; this.ldr = null; this.down = []; this.up = [];
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); this.black.needsUpdate = true;
    this.setSize(2, 2);
  }

  setSize(w, h) {
    w = Math.max(2, w | 0); h = Math.max(2, h | 0);
    if (w === this.width && h === this.height && this.hdr) return;
    this.width = w; this.height = h;
    this.disposeTargets();
    const T = this.hdrType;
    this.hdr = makeTarget(w, h, { depth: true }, T);
    this.ldr = makeTarget(w, h, { type: THREE.UnsignedByteType }, T);
    let mw = w >> 1, mh = h >> 1;
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.down.push(makeTarget(mw, mh, {}, T));
      if (i < BLOOM_LEVELS - 1) this.up.push(makeTarget(mw, mh, {}, T));
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
    }
  }

  disposeTargets() {
    for (const t of [this.hdr, this.ldr, ...this.down, ...this.up]) if (t) t.dispose();
    this.hdr = null; this.ldr = null; this.down = []; this.up = [];
  }

  memoryBytes() {
    const bpp = this.hdrType === THREE.HalfFloatType ? 8 : 4;
    let b = 0;
    if (this.hdr) b += this.hdr.width * this.hdr.height * (bpp + 4);
    if (this.ldr) b += this.ldr.width * this.ldr.height * 4;
    for (const t of [...this.down, ...this.up]) b += t.width * t.height * bpp;
    return b;
  }

  // Binds the HDR target and clears it with the renderer's clear colour (the fog colour).
  begin() {
    const r = this.renderer;
    r.setRenderTarget(this.hdr);
    r.clear(true, true, false);
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  // Bloom + tone mapping (+ FXAA) from the HDR target to the screen.
  end() {
    const r = this.renderer;
    let bloomTex = this.black;
    if (this.bloomEnabled) {
      const d = this.down, u = this.up;
      this.brightMat.uniforms.tex.value = this.hdr.texture;
      this.brightMat.uniforms.uTexel.value.set(1 / this.hdr.width, 1 / this.hdr.height);
      this.brightMat.uniforms.uThreshold.value = this.bloomThreshold;
      this.brightMat.uniforms.uKnee.value = this.bloomKnee;
      this._pass(this.brightMat, d[0]);
      for (let i = 1; i < d.length; i++) {
        this.downMat.uniforms.tex.value = d[i - 1].texture;
        this.downMat.uniforms.uTexel.value.set(1 / d[i - 1].width, 1 / d[i - 1].height);
        this._pass(this.downMat, d[i]);
      }
      let low = d[d.length - 1];
      for (let i = u.length - 1; i >= 0; i--) {
        this.upMat.uniforms.uLow.value = low.texture;
        this.upMat.uniforms.uSame.value = d[i].texture;
        this.upMat.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
        this._pass(this.upMat, u[i]);
        low = u[i];
      }
      bloomTex = low.texture;
    }
    const cu = this.compositeMat.uniforms;
    cu.tex.value = this.hdr.texture;
    cu.bloom.value = bloomTex;
    cu.uExposure.value = this.exposure;
    cu.uBloomStrength.value = this.bloomEnabled ? this.bloomStrength / (BLOOM_LEVELS - 1) : 0;
    cu.uBloomCap.value = this.bloomCap;
    cu.uVignette.value = this.vignette;
    cu.uThreshold.value = this.bloomThreshold;
    cu.uDebug.value = this.debugView === 'bloom' ? 1 : (this.debugView === 'sources' ? 2 : 0);
    if (this.fxaaEnabled) {
      this._pass(this.compositeMat, this.ldr);
      this.fxaaMat.uniforms.tex.value = this.ldr.texture;
      this.fxaaMat.uniforms.depthTex.value = this.hdr.depthTexture;
      this.fxaaMat.uniforms.uTexel.value.set(1 / this.ldr.width, 1 / this.ldr.height);
      this._pass(this.fxaaMat, null);
    } else {
      this._pass(this.compositeMat, null);
    }
  }

  dispose() { this.disposeTargets(); }
}
