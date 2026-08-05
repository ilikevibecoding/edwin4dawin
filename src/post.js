import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { settings, onSettingsChange } from './settings.js';
import { clamp, damp, saturate } from './util/mathx.js';

/**
 * Post-processing chain.
 *
 * scene -> bloom -> tone map / sRGB -> grade (FXAA, chromatic aberration,
 * vignette, film grain, exposure flash).
 *
 * The grade pass runs last, in display space, because FXAA and grain both want
 * perceptual values.
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.0016 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 0.95, 0.85) },
    uContrast: { value: 1.045 },
    uSaturation: { value: 1.06 },
    uLift: { value: new THREE.Color(0.004, 0.006, 0.012) },
    uFxaa: { value: 1 },
    uScanline: { value: 0.0 },
    uDesat: { value: 0.0 }
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
    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uFlash;
    uniform vec3  uFlashColor;
    uniform float uContrast;
    uniform float uSaturation;
    uniform vec3  uLift;
    uniform float uFxaa;
    uniform float uScanline;
    uniform float uDesat;
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    // Compact FXAA 3.11 (console variant): cheap, and enough to kill the
    // shimmer on thin railings, cables and antenna wires.
    vec3 fxaa(sampler2D tex, vec2 uv, vec2 rcp) {
      vec3 rgbM = texture2D(tex, uv).rgb;
      float lM  = luma(rgbM);
      float lNW = luma(texture2D(tex, uv + vec2(-1.0, -1.0) * rcp).rgb);
      float lNE = luma(texture2D(tex, uv + vec2( 1.0, -1.0) * rcp).rgb);
      float lSW = luma(texture2D(tex, uv + vec2(-1.0,  1.0) * rcp).rgb);
      float lSE = luma(texture2D(tex, uv + vec2( 1.0,  1.0) * rcp).rgb);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.0312, lMax * 0.125)) return rgbM;
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
      float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
      float rcpDir = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * rcpDir, vec2(-8.0), vec2(8.0)) * rcp;
      vec3 rgbA = 0.5 * (texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb +
                         texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, uv - dir * 0.5).rgb +
                                       texture2D(tex, uv + dir * 0.5).rgb);
      float lB = luma(rgbB);
      return (lB < lMin || lB > lMax) ? rgbA : rgbB;
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 rcp = 1.0 / uResolution;
      vec2 center = vUv - 0.5;
      float r2 = dot(center, center);

      vec3 col;
      if (uFxaa > 0.5) col = fxaa(tDiffuse, vUv, rcp);
      else col = texture2D(tDiffuse, vUv).rgb;

      // Lateral chromatic aberration, strongest at the frame edge.
      if (uAberration > 0.0) {
        vec2 off = center * uAberration * (0.35 + r2 * 2.4);
        float cr = texture2D(tDiffuse, vUv + off).r;
        float cb = texture2D(tDiffuse, vUv - off).b;
        col = vec3(cr, col.g, cb);
      }

      // Grade: lift, contrast about mid grey, saturation.
      col += uLift;
      col = (col - 0.5) * uContrast + 0.5;
      float l = luma(col);
      col = mix(vec3(l), col, uSaturation);
      col = mix(vec3(l), col, 1.0 - uDesat);

      // Vignette.
      float vig = 1.0 - uVignette * smoothstep(0.12, 0.78, r2);
      col *= vig;

      // Flash (launch glare, nearby detonation).
      col += uFlashColor * uFlash;

      // Very fine sensor grain, animated.
      float g = hash12(gl_FragCoord.xy + fract(uTime) * 971.0) - 0.5;
      col += g * uGrain * (1.0 - 0.55 * luma(col));

      if (uScanline > 0.0) {
        float s = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.6);
        col *= mix(1.0, 0.86 + s * 0.14, uScanline);
      }

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `
};

export class PostPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.time = 0;
    this._flash = 0;
    this._flashDecay = 4.5;

    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    const q = settings.quality;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.42, 0.72, 0.86);
    this.bloom.enabled = q.bloom;
    if (q.bloomQuality === 'cheap') {
      // Drop the two largest mip levels: most of the cost, least of the look.
      this.bloom.nMips = 3;
    }
    this.composer.addPass(this.bloom);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uResolution.value.set(size.x, size.y);
    this.grade.renderToScreen = true;
    this.composer.addPass(this.grade);

    this._applyQuality();
    this._unsub = onSettingsChange(() => this._applyQuality());
  }

  _applyQuality() {
    const q = settings.quality;
    this.bloom.enabled = q.bloom;
    this.grade.uniforms.uFxaa.value = 1;
    this.grade.uniforms.uGrain.value = settings.reducedMotion ? 0.012 : 0.032;
    this.grade.uniforms.uAberration.value = settings.reducedMotion ? 0 : 0.0016;
  }

  setSize(width, height) {
    const dpr = this.renderer.getPixelRatio();
    const w = Math.floor(width * dpr);
    const h = Math.floor(height * dpr);
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
    this.grade.uniforms.uResolution.value.set(w, h);
  }

  /** Preset-driven look. Called by the weather system each frame. */
  applyLook({ bloomStrength = 0.4, exposure = 1, vignette = 0.42, night = 0 }) {
    this.bloom.strength = bloomStrength;
    this.bloom.radius = 0.7 + night * 0.22;
    this.bloom.threshold = Math.max(0.05, 0.86 - night * 0.42);
    this.renderer.toneMappingExposure = exposure;
    this.grade.uniforms.uVignette.value = vignette + night * 0.12;
    this.grade.uniforms.uSaturation.value = 1.06 - night * 0.08;
  }

  /** Brief white-out, e.g. a launch right next to the player. */
  addFlash(amount, decay = 4.5) {
    this._flash = Math.min(1.6, this._flash + amount);
    this._flashDecay = decay;
  }

  setConsoleTint(on) {
    this.grade.uniforms.uScanline.value = on ? 0.22 : 0.0;
  }

  update(dt) {
    this.time += dt;
    this.grade.uniforms.uTime.value = this.time;
    this._flash = damp(this._flash, 0, this._flashDecay, dt);
    if (this._flash < 0.0005) this._flash = 0;
    this.grade.uniforms.uFlash.value = this._flash;
  }

  render(dt) {
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._unsub?.();
    this.composer.dispose();
  }
}
