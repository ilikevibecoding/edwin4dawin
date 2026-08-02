import * as THREE from 'three';
import { FS_VERTEX, FullScreenQuad } from './FullScreenQuad';
import type { QualitySettings } from './Quality';
import { clamp } from './MathX';

/**
 * Hand-rolled post chain: threshold bloom -> optional shallow depth of field
 * -> ACES tone map, vignette and grain.
 *
 * Written locally (rather than pulling the examples' EffectComposer) so the
 * bloom stays tightly bounded to emissive sources: engines, bolts, panels.
 */

interface Level {
  a: THREE.WebGLRenderTarget;
  b: THREE.WebGLRenderTarget;
  width: number;
  height: number;
}

const rtOptions = (): THREE.RenderTargetOptions => ({
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
  stencilBuffer: false,
  generateMipmaps: false,
});

export interface PostSettings {
  exposure: number;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  vignette: number;
  grain: number;
  /** 0 disables depth of field entirely. */
  dofStrength: number;
  /** View-space distance kept sharp. */
  dofFocus: number;
  dofRange: number;
  /** Fade-to-black / fade-to-white overlay used for chapter transitions. */
  fadeColor: THREE.Color;
  fadeAmount: number;
  /** Chromatic edge separation, kept extremely small. */
  aberration: number;
  saturation: number;
  contrast: number;
  /** Screen-space shake applied at composite time (keeps geometry stable). */
  lift: number;
}

export function defaultPostSettings(): PostSettings {
  return {
    exposure: 1.0,
    bloomStrength: 0.62,
    bloomThreshold: 0.82,
    bloomRadius: 0.72,
    vignette: 0.36,
    grain: 0.024,
    dofStrength: 0,
    dofFocus: 30,
    dofRange: 40,
    fadeColor: new THREE.Color(0, 0, 0),
    fadeAmount: 0,
    aberration: 0.0009,
    saturation: 1.04,
    contrast: 1.02,
    lift: 0.0,
  };
}

export class PostProcess {
  readonly settings: PostSettings = defaultPostSettings();

  private renderer: THREE.WebGLRenderer;
  private quality: QualitySettings;
  hdr!: THREE.WebGLRenderTarget;
  private levels: Level[] = [];
  private brightQuad: FullScreenQuad;
  private blurQuad: FullScreenQuad;
  private upQuad: FullScreenQuad;
  private compositeQuad: FullScreenQuad;
  private brightMat: THREE.ShaderMaterial;
  private blurMat: THREE.ShaderMaterial;
  private upMat: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;
  private width = 1;
  private height = 1;
  private dofA: THREE.WebGLRenderTarget | null = null;
  private dofB: THREE.WebGLRenderTarget | null = null;

  constructor(renderer: THREE.WebGLRenderer, quality: QualitySettings) {
    this.renderer = renderer;
    this.quality = quality;

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: 0.8 },
        knee: { value: 0.45 },
        clampMax: { value: 12.0 },
      },
      vertexShader: FS_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float threshold; uniform float knee; uniform float clampMax;
        varying vec2 vUv;
        void main() {
          vec3 c = min(texture2D(tDiffuse, vUv).rgb, vec3(clampMax));
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float soft = clamp(l - threshold + knee, 0.0, 2.0 * knee);
          soft = soft * soft / (4.0 * knee + 1e-5);
          float contrib = max(soft, l - threshold) / max(l, 1e-5);
          gl_FragColor = vec4(c * contrib, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        texel: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: FS_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform vec2 direction; uniform vec2 texel;
        varying vec2 vUv;
        void main() {
          vec2 o = direction * texel;
          vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
          sum += texture2D(tDiffuse, vUv + o * 1.3846153846).rgb * 0.3162162162;
          sum += texture2D(tDiffuse, vUv - o * 1.3846153846).rgb * 0.3162162162;
          sum += texture2D(tDiffuse, vUv + o * 3.2307692308).rgb * 0.0702702703;
          sum += texture2D(tDiffuse, vUv - o * 3.2307692308).rgb * 0.0702702703;
          gl_FragColor = vec4(sum, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.upMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, weight: { value: 1 } },
      vertexShader: FS_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float weight; varying vec2 vUv;
        void main() { gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * weight, 1.0); }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        tBlurred: { value: null },
        tDepth: { value: null },
        exposure: { value: 1 },
        bloomStrength: { value: 0.6 },
        vignette: { value: 0.35 },
        grain: { value: 0.03 },
        time: { value: 0 },
        fadeColor: { value: new THREE.Color(0, 0, 0) },
        fadeAmount: { value: 0 },
        aberration: { value: 0.001 },
        saturation: { value: 1.05 },
        contrast: { value: 1.02 },
        dofStrength: { value: 0 },
        dofFocus: { value: 30 },
        dofRange: { value: 40 },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000 },
        lift: { value: 0 },
        useDepth: { value: 0 },
      },
      vertexShader: FS_VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D tScene, tBloom, tBlurred, tDepth;
        uniform float exposure, bloomStrength, vignette, grain, time;
        uniform float aberration, saturation, contrast, fadeAmount, lift;
        uniform float dofStrength, dofFocus, dofRange, cameraNear, cameraFar, useDepth;
        uniform vec3 fadeColor;
        varying vec2 vUv;

        // ACES filmic approximation (Narkowicz).
        vec3 aces(vec3 x) {
          const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1.0 / 2.4)) - 0.055,
                     step(vec3(0.0031308), c));
        }
        float perspectiveDepthToViewZ(float d) {
          float z = d * 2.0 - 1.0;
          return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
        }
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

        void main() {
          vec2 uv = vUv;
          vec2 fromCenter = uv - 0.5;
          float r2 = dot(fromCenter, fromCenter);

          vec2 ab = fromCenter * aberration * (0.35 + r2 * 4.0);
          vec3 col;
          col.r = texture2D(tScene, uv + ab).r;
          col.g = texture2D(tScene, uv).g;
          col.b = texture2D(tScene, uv - ab).b;

          if (useDepth > 0.5 && dofStrength > 0.001) {
            float d = texture2D(tDepth, uv).x;
            float viewZ = perspectiveDepthToViewZ(d);
            float coc = clamp(abs(viewZ - dofFocus) / max(dofRange, 0.001), 0.0, 1.0);
            coc = smoothstep(0.15, 1.0, coc) * dofStrength;
            vec3 blurred = texture2D(tBlurred, uv).rgb;
            col = mix(col, blurred, coc);
          }

          vec3 bloom = texture2D(tBloom, uv).rgb;
          col += bloom * bloomStrength;
          col *= exposure;
          col += lift;

          col = aces(col);
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lum), col, saturation);
          col = clamp((col - 0.5) * contrast + 0.5, 0.0, 1.0);

          float v = smoothstep(0.92, 0.16, r2 * 2.0);
          col *= mix(1.0, v, vignette);

          if (grain > 0.0005) {
            float n = hash(uv * vec2(1920.0, 1080.0) + fract(time) * 137.0) - 0.5;
            // Keep deep blacks clean; grain belongs in the midtones.
            col += n * grain * (0.28 + smoothstep(0.0, 0.32, lum) * 0.9);
          }

          col = mix(col, fadeColor, clamp(fadeAmount, 0.0, 1.0));
          gl_FragColor = vec4(toSRGB(max(col, vec3(0.0))), 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.brightQuad = new FullScreenQuad(this.brightMat);
    this.blurQuad = new FullScreenQuad(this.blurMat);
    this.upQuad = new FullScreenQuad(this.upMat);
    this.compositeQuad = new FullScreenQuad(this.compositeMat);

    this.allocate(2, 2);
  }

  setQuality(q: QualitySettings): void {
    this.quality = q;
    this.allocate(this.width, this.height);
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.allocate(width, height);
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private allocate(width: number, height: number): void {
    this.width = Math.max(2, Math.floor(width));
    this.height = Math.max(2, Math.floor(height));
    this.disposeTargets();

    const depthTexture = new THREE.DepthTexture(this.width, this.height);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.format = THREE.DepthFormat;
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    this.hdr = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: this.quality.msaa,
      depthTexture,
    });

    let w = Math.max(2, Math.floor(this.width / 2));
    let h = Math.max(2, Math.floor(this.height / 2));
    for (let i = 0; i < this.quality.bloomIterations; i++) {
      this.levels.push({
        a: new THREE.WebGLRenderTarget(w, h, rtOptions()),
        b: new THREE.WebGLRenderTarget(w, h, rtOptions()),
        width: w,
        height: h,
      });
      w = Math.max(2, Math.floor(w / 2));
      h = Math.max(2, Math.floor(h / 2));
    }

    if (this.quality.depthOfField) {
      const dw = Math.max(2, Math.floor(this.width / 2));
      const dh = Math.max(2, Math.floor(this.height / 2));
      this.dofA = new THREE.WebGLRenderTarget(dw, dh, rtOptions());
      this.dofB = new THREE.WebGLRenderTarget(dw, dh, rtOptions());
    }
  }

  private disposeTargets(): void {
    this.hdr?.dispose();
    this.hdr?.depthTexture?.dispose();
    this.levels.forEach((l) => {
      l.a.dispose();
      l.b.dispose();
    });
    this.levels = [];
    this.dofA?.dispose();
    this.dofB?.dispose();
    this.dofA = null;
    this.dofB = null;
  }

  /** Bind the HDR target for scene rendering. */
  beginScene(): void {
    this.renderer.setRenderTarget(this.hdr);
  }

  /** Run bloom + composite and present to the canvas. */
  present(time: number, camera: THREE.PerspectiveCamera): void {
    const r = this.renderer;
    const s = this.settings;
    const prevAutoClear = r.autoClear;
    r.autoClear = true;

    if (this.quality.bloom && this.levels.length > 0) {
      this.brightMat.uniforms.tDiffuse.value = this.hdr.texture;
      this.brightMat.uniforms.threshold.value = s.bloomThreshold;
      r.setRenderTarget(this.levels[0].a);
      this.brightQuad.render(r);

      for (let i = 0; i < this.levels.length; i++) {
        const lvl = this.levels[i];
        if (i > 0) {
          // Downsample from the previous level's blurred result.
          this.upMat.uniforms.tDiffuse.value = this.levels[i - 1].a.texture;
          this.upMat.uniforms.weight.value = 1;
          this.upMat.blending = THREE.NoBlending;
          r.setRenderTarget(lvl.a);
          r.clear();
          this.upQuad.render(r);
        }
        this.blurPass(lvl);
      }

      // Accumulate coarse levels back into level 0 for a wide, soft halo.
      this.upMat.blending = THREE.AdditiveBlending;
      for (let i = this.levels.length - 1; i >= 1; i--) {
        this.upMat.uniforms.tDiffuse.value = this.levels[i].a.texture;
        this.upMat.uniforms.weight.value = s.bloomRadius * (0.8 - i * 0.06);
        r.setRenderTarget(this.levels[0].a);
        this.upQuad.render(r);
      }
      this.upMat.blending = THREE.NoBlending;
    }

    const u = this.compositeMat.uniforms;
    u.tScene.value = this.hdr.texture;
    u.tBloom.value = this.quality.bloom && this.levels.length ? this.levels[0].a.texture : null;
    u.tBlurred.value = this.dofA ? this.dofA.texture : this.hdr.texture;
    u.tDepth.value = this.hdr.depthTexture;
    u.exposure.value = s.exposure;
    u.bloomStrength.value = this.quality.bloom ? s.bloomStrength : 0;
    u.vignette.value = s.vignette;
    u.grain.value = this.quality.grain ? s.grain : 0;
    u.time.value = time;
    u.fadeColor.value = s.fadeColor;
    u.fadeAmount.value = clamp(s.fadeAmount, 0, 1);
    u.aberration.value = s.aberration;
    u.saturation.value = s.saturation;
    u.contrast.value = s.contrast;
    u.lift.value = s.lift;
    const dofOn = this.quality.depthOfField && s.dofStrength > 0.001 && !!this.dofA && !!this.dofB;
    u.dofStrength.value = dofOn ? s.dofStrength : 0;
    u.useDepth.value = dofOn ? 1 : 0;
    u.dofFocus.value = s.dofFocus;
    u.dofRange.value = s.dofRange;
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;

    if (dofOn && this.dofA && this.dofB) {
      // Half-resolution blur of the whole frame; the composite mixes it in
      // using circle-of-confusion derived from the depth buffer.
      const dw = this.dofA.width;
      const dh = this.dofA.height;
      this.upMat.uniforms.tDiffuse.value = this.hdr.texture;
      this.upMat.uniforms.weight.value = 1;
      r.setRenderTarget(this.dofA);
      r.clear();
      this.upQuad.render(r);
      for (let pass = 0; pass < 2; pass++) {
        this.blurMat.uniforms.texel.value.set(1.6 / dw, 1.6 / dh);
        this.blurMat.uniforms.tDiffuse.value = this.dofA.texture;
        this.blurMat.uniforms.direction.value.set(1, 0);
        r.setRenderTarget(this.dofB);
        this.blurQuad.render(r);
        this.blurMat.uniforms.tDiffuse.value = this.dofB.texture;
        this.blurMat.uniforms.direction.value.set(0, 1);
        r.setRenderTarget(this.dofA);
        this.blurQuad.render(r);
      }
    }

    r.setRenderTarget(null);
    this.compositeQuad.render(r);
    r.autoClear = prevAutoClear;
  }

  private blurPass(level: Level): void {
    const r = this.renderer;
    this.blurMat.uniforms.texel.value.set(1 / level.width, 1 / level.height);
    this.blurMat.uniforms.tDiffuse.value = level.a.texture;
    this.blurMat.uniforms.direction.value.set(1, 0);
    r.setRenderTarget(level.b);
    this.blurQuad.render(r);
    this.blurMat.uniforms.tDiffuse.value = level.b.texture;
    this.blurMat.uniforms.direction.value.set(0, 1);
    r.setRenderTarget(level.a);
    this.blurQuad.render(r);
  }

  dispose(): void {
    this.disposeTargets();
    this.brightQuad.dispose();
    this.blurQuad.dispose();
    this.upQuad.dispose();
    this.compositeQuad.dispose();
  }
}
