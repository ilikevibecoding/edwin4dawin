/**
 * Post-processing stack.
 *
 *   scene ──▶ HDR ──▶ GTAO ──▶ bokeh DOF ──▶ bloom ──▶ anamorphic streaks
 *         ──▶ grade / tonemap / CA / grain / wet-lens ──▶ SMAA ──▶ screen
 *
 * The grade pass is where the film look lives: ACES tonemapping with a
 * teal-shadow / warm-highlight split tone, radial chromatic aberration and
 * animated grain.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { QualitySettings } from './quality';
import { clamp, damp } from './math';

/* --------------------------------------------------------------- shaders */

const COMMON = /* glsl */ `
  vec3 acesFitted(vec3 c) {
    const mat3 IN = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
    const mat3 OUT = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
    c = IN * c;
    vec3 a = c * (c + 0.0245786) - 0.000090537;
    vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
    c = a / b;
    return clamp(OUT * c, 0.0, 1.0);
  }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: 1.05 },
    uContrast: { value: 1.08 },
    uSaturation: { value: 1.04 },
    uLift: { value: new THREE.Vector3(0.004, 0.008, 0.016) },
    uGain: { value: new THREE.Vector3(1.0, 1.0, 1.03) },
    uShadowTint: { value: new THREE.Vector3(0.28, 0.62, 0.9) },
    uHighlightTint: { value: new THREE.Vector3(1.0, 0.88, 0.72) },
    uSplit: { value: 0.16 },
    uVignette: { value: 0.42 },
    uCA: { value: 0.0016 },
    uGrain: { value: 0.014 },
    uWetLens: { value: 0.0 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Vector3(1, 1, 1) },
    uDesat: { value: 0.0 },
    uGlitch: { value: 0.0 },
    uHalation: { value: 0.14 },
    uBarrel: { value: 0.012 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime, uExposure, uContrast, uSaturation, uSplit, uVignette, uCA, uGrain;
    uniform float uWetLens, uFlash, uDesat, uGlitch, uHalation, uBarrel;
    uniform vec3 uLift, uGain, uShadowTint, uHighlightTint, uFlashColor;
    varying vec2 vUv;
    ${COMMON}

    // Lens droplets: a couple of layers of jittered cells with a refracting bulge.
    vec2 dropletOffset(vec2 uv, float aspect) {
      vec2 off = vec2(0.0);
      for (int L = 0; L < 2; L++) {
        float s = 9.0 + float(L) * 15.0;
        vec2 p = uv * vec2(aspect, 1.0) * s;
        vec2 id = floor(p);
        vec2 f = fract(p) - 0.5;
        float h = hash12(id + float(L) * 37.0);
        if (h > 0.72) {
          vec2 jitter = (vec2(hash12(id + 3.1), hash12(id + 7.7)) - 0.5) * 0.55;
          float r = 0.16 + h * 0.2;
          float d = length(f - jitter);
          if (d < r) {
            float k = 1.0 - d / r;
            off += normalize(f - jitter + 1e-5) * k * k * 0.045 * (1.0 - float(L) * 0.4);
          }
        }
      }
      return off;
    }

    void main() {
      vec2 uv = vUv;
      // Mild barrel distortion for anamorphic character.
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      uv = 0.5 + cc * (1.0 + uBarrel * r2);

      float aspect = uResolution.x / max(uResolution.y, 1.0);
      if (uWetLens > 0.001) uv += dropletOffset(uv, aspect) * uWetLens;

      if (uGlitch > 0.001) {
        float band = floor(uv.y * 90.0);
        float j = (hash12(vec2(band, floor(uTime * 24.0))) - 0.5);
        uv.x += j * 0.05 * uGlitch * step(0.72, hash12(vec2(band * 1.7, floor(uTime * 12.0))));
      }

      // Radial chromatic aberration.
      vec2 dir = uv - 0.5;
      float ca = uCA * (0.35 + r2 * 2.4);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      // Cheap halation: wide low-res tap of the bright areas bleeding red-orange.
      if (uHalation > 0.001) {
        vec3 h = vec3(0.0);
        vec2 px = 3.5 / uResolution;
        h += texture2D(tDiffuse, uv + px * vec2( 2.0,  0.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-2.0,  0.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 0.0,  2.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 0.0, -2.0)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 1.4,  1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-1.4,  1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2( 1.4, -1.4)).rgb;
        h += texture2D(tDiffuse, uv + px * vec2(-1.4, -1.4)).rgb;
        h /= 8.0;
        float hl = smoothstep(0.75, 2.2, luma(h));
        col += h * hl * uHalation * vec3(1.0, 0.62, 0.4);
      }

      col *= uExposure;
      col += uFlash * uFlashColor * 2.4;

      // Tonemap, then grade in display space.
      col = acesFitted(col);
      col = col * uGain + uLift;
      float l = luma(col);
      col = mix(vec3(l), col, uSaturation);
      col = mix(col, vec3(l), uDesat);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      // Split toning.
      float sh = pow(1.0 - clamp(l, 0.0, 1.0), 2.0);
      float hi = pow(clamp(l, 0.0, 1.0), 1.6);
      col = mix(col, col * uShadowTint, sh * uSplit);
      col = mix(col, col * uHighlightTint, hi * uSplit * 0.7);

      // Vignette + subtle corner smear.
      float vig = 1.0 - uVignette * pow(clamp(r2 * 1.9, 0.0, 1.0), 1.35);
      col *= vig;

      // Animated grain, stronger in the shadows like real film.
      float g = hash12(vUv * uResolution + fract(uTime) * 1371.0) - 0.5;
      col += g * uGrain * (1.15 - 0.75 * l);

      // Dither to kill 8-bit banding in the gradients.
      col += (hash12(vUv * uResolution.yx + 17.3) - 0.5) / 255.0;

      gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
    }
  `,
};

/**
 * Half-resolution packed-depth prepass.
 *
 * The composer's ping-pong targets cannot own the depth texture: a pass that
 * samples it while rendering into one of those targets creates a framebuffer
 * feedback loop (which reads back as a black frame). A dedicated target keeps
 * depth completely separate from the colour chain.
 */
class DepthProvider {
  rt: THREE.WebGLRenderTarget;
  private material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

  constructor(w: number, h: number, private scale = 0.5) {
    this.rt = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(w * scale)), Math.max(2, Math.floor(h * scale)), {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
    });
  }
  setSize(w: number, h: number): void {
    this.rt.setSize(Math.max(2, Math.floor(w * this.scale)), Math.max(2, Math.floor(h * this.scale)));
  }
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    const prevTarget = renderer.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevBg = scene.background;

    // Anything that is not opaque geometry must be excluded. Effects like rain
    // are billboarded in their own vertex shader, so under an override material
    // they would collapse to the origin and poison the depth buffer.
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) return;
      const isSprite = (o as THREE.Sprite).isSprite;
      const isPoints = (o as THREE.Points).isPoints;
      let skip = isSprite || isPoints;
      if (!skip) {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        const one = Array.isArray(mat) ? mat[0] : mat;
        if (one) {
          const custom = (one as THREE.ShaderMaterial).isShaderMaterial === true;
          if (one.transparent || one.depthWrite === false || one.blending === THREE.AdditiveBlending || custom) skip = true;
        }
      }
      if (skip) {
        hidden.push(o);
        o.visible = false;
      }
    });

    scene.overrideMaterial = this.material;
    scene.background = null;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = prevOverride;
    scene.background = prevBg;
    for (const o of hidden) o.visible = true;
    renderer.setRenderTarget(prevTarget);
  }
  get texture(): THREE.Texture {
    return this.rt.texture;
  }
  dispose(): void {
    this.rt.dispose();
    this.material.dispose();
  }
}

const DofShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFocus: { value: 6 },
    uAperture: { value: 0.9 },
    uMaxCoC: { value: 16 },
    uNear: { value: 0.1 },
    uFar: { value: 400 },
    uSamples: { value: 24 },
    uHighlight: { value: 1.5 },
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 uResolution;
    uniform float uFocus, uAperture, uMaxCoC, uNear, uFar, uHighlight;
    uniform int uSamples;
    varying vec2 vUv;
    ${COMMON}

    const vec4 UNPACK = vec4( 1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0 );
    float unpackDepth( vec4 v ) { return dot( v, UNPACK ); }

    float viewZ(vec2 uv) {
      float d = unpackDepth( texture2D( tDepth, uv ) );
      return (uNear * uFar) / ((uFar - uNear) * d - uFar);
    }
    float coc(vec2 uv) {
      float z = -viewZ(uv);
      float d = (z - uFocus) / max(z, 0.001);
      return clamp(abs(d) * uAperture * 1.5, 0.0, 1.0) * uMaxCoC;
    }

    void main() {
      vec2 texel = 1.0 / uResolution;
      float cCoc = coc(vUv);
      vec3 center = texture2D(tDiffuse, vUv).rgb;
      if (cCoc < 1.0) { gl_FragColor = vec4(center, 1.0); return; }

      // Golden-angle spiral gather with bright-sample weighting for bokeh punch.
      vec3 sum = center * 0.35;
      float wsum = 0.35;
      float GA = 2.39996323;
      for (int i = 0; i < 48; i++) {
        if (i >= uSamples) break;
        float fi = float(i) + 0.5;
        float a = fi * GA;
        float rr = sqrt(fi / float(uSamples));
        vec2 off = vec2(cos(a), sin(a)) * rr * cCoc * texel;
        vec2 suv = clamp(vUv + off, vec2(0.001), vec2(0.999));
        vec3 s = texture2D(tDiffuse, suv).rgb;
        float sc = coc(suv);
        // Only let samples bleed in if they are at least as blurry as us.
        float w = clamp(sc / max(cCoc, 0.001), 0.15, 1.0);
        w *= 1.0 + smoothstep(1.0, 3.0, luma(s)) * uHighlight;
        sum += s * w;
        wsum += w;
      }
      gl_FragColor = vec4(sum / wsum, 1.0);
    }
  `,
};

/**
 * Clamps the HDR buffer before bloom. Rim lights on clearcoated skin and wet
 * asphalt can spike into the hundreds, which turns any bloom into a white
 * screen; a generous ceiling keeps the glow filmic without killing highlights.
 */
const ClampShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uMax: { value: 12 },
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    ${COMMON}
    void main() {
      vec3 c = texture2D( tDiffuse, vUv ).rgb;
      float l = luma( c );
      // Soft roll-off rather than a hard clip so highlight shape survives.
      float k = l > uMax ? uMax / max( l, 1e-4 ) : 1.0;
      c *= mix( 1.0, k, 0.92 );
      gl_FragColor = vec4( min( c, vec3( uMax * 1.6 ) ), 1.0 );
    }
  `,
};

/** Anamorphic horizontal streaks off the brightest pixels. */
class StreakPass extends Pass {
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private comp: THREE.ShaderMaterial;
  private quad = new FullScreenQuad();
  strength = 0.5;
  threshold = 1.15;
  tint = new THREE.Vector3(0.42, 0.62, 1.0);

  constructor(w: number, h: number) {
    super();
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(Math.max(2, w >> 2), Math.max(2, h >> 2), opts);
    this.rtB = new THREE.WebGLRenderTarget(Math.max(2, w >> 2), Math.max(2, h >> 2), opts);
    const vs = GradeShader.vertexShader;
    this.bright = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.15 } },
      vertexShader: vs,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uThreshold; varying vec2 vUv;
        ${COMMON}
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = luma(c);
          gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 1.1, l), 1.0);
        }`,
    });
    this.blur = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uStep: { value: new THREE.Vector2(1, 0) } },
      vertexShader: vs,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform vec2 uStep; varying vec2 vUv;
        void main() {
          vec3 c = vec3(0.0); float w = 0.0;
          for (int i = -8; i <= 8; i++) {
            float fi = float(i);
            float k = exp(-fi * fi / 26.0);
            c += texture2D(tDiffuse, vUv + uStep * fi).rgb * k;
            w += k;
          }
          gl_FragColor = vec4(c / w, 1.0);
        }`,
    });
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tStreak: { value: null },
        uStrength: { value: 0.5 }, uTint: { value: this.tint },
      },
      vertexShader: vs,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse, tStreak; uniform float uStrength; uniform vec3 uTint; varying vec2 vUv;
        void main() {
          vec3 base = texture2D(tDiffuse, vUv).rgb;
          vec3 s = texture2D(tStreak, vUv).rgb;
          gl_FragColor = vec4(base + s * uTint * uStrength, 1.0);
        }`,
      transparent: false,
    });
    this.needsSwap = true;
  }

  override setSize(w: number, h: number): void {
    this.rtA.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.rtB.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
  }

  private draw(r: THREE.WebGLRenderer, mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = mat;
    r.setRenderTarget(target);
    this.quad.render(r);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.bright.uniforms.tDiffuse.value = readBuffer.texture;
    this.bright.uniforms.uThreshold.value = this.threshold;
    this.draw(renderer, this.bright, this.rtA);

    const w = this.rtA.width;
    this.blur.uniforms.tDiffuse.value = this.rtA.texture;
    this.blur.uniforms.uStep.value.set(2.0 / w, 0);
    this.draw(renderer, this.blur, this.rtB);
    this.blur.uniforms.tDiffuse.value = this.rtB.texture;
    this.blur.uniforms.uStep.value.set(7.0 / w, 0);
    this.draw(renderer, this.blur, this.rtA);
    this.blur.uniforms.tDiffuse.value = this.rtA.texture;
    this.blur.uniforms.uStep.value.set(19.0 / w, 0);
    this.draw(renderer, this.blur, this.rtB);

    this.comp.uniforms.tDiffuse.value = readBuffer.texture;
    this.comp.uniforms.tStreak.value = this.rtB.texture;
    this.comp.uniforms.uStrength.value = this.strength;
    this.draw(renderer, this.comp, this.renderToScreen ? null : writeBuffer);
  }

  override dispose(): void {
    this.rtA.dispose();
    this.rtB.dispose();
    this.quad.dispose();
  }
}

/* ------------------------------------------------------------------ stack */

export type FocusTarget = { distance: number; aperture: number };

/** Simple full-screen copy, used for stage debugging and final blits. */
const CopyShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { gl_FragColor = texture2D( tDiffuse, vUv ); }
  `,
};

export class PostFX {
  composer: EffectComposer;
  private renderPass: RenderPass;
  private gtao?: GTAOPass;
  private dof?: ShaderPass;
  private depthProvider?: DepthProvider;
  private bloom?: UnrealBloomPass;
  private clamp!: ShaderPass;
  private copy!: ShaderPass;
  private streak?: StreakPass;
  grade: ShaderPass;
  private smaa?: SMAAPass;
  private target: THREE.WebGLRenderTarget;
  private q: QualitySettings;
  private renderer: THREE.WebGLRenderer;
  private size = new THREE.Vector2(1, 1);

  /** Focus is smoothed so rack-focus reads like a real lens. */
  focusDistance = 6;
  focusTarget = 6;
  focusSpeed = 3.4;
  aperture = 0.65;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    q: QualitySettings,
    w: number,
    h: number,
  ) {
    this.renderer = renderer;
    this.q = q;
    this.size.set(w, h);

    this.target = new THREE.WebGLRenderTarget(w, h, {
      type: q.hdr === false ? THREE.UnsignedByteType : THREE.HalfFloatType,
      samples: 0,
    });

    // EffectComposer re-applies the renderer pixel ratio to any size handed to
    // setSize(), which produced fractional, mismatched ping-pong buffers here.
    // Driving it in CSS pixels keeps both buffers identical and integral.
    this.composer = new EffectComposer(renderer, this.target);
    // Drive the composer in device pixels directly; its own pixel-ratio
    // scaling would otherwise produce fractional, mismatched buffers.
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    if (q.ao) {
      this.gtao = new GTAOPass(scene, camera, w, h);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.updateGtaoMaterial({
        radius: 0.32,
        distanceExponent: 1.4,
        thickness: 0.35,
        scale: 1.15,
        samples: q.aoQuality === 'High' ? 24 : 14,
        screenSpaceRadius: false,
      });
      this.gtao.blendIntensity = 0.95;
      this.composer.addPass(this.gtao);
    }

    if (q.dof) {
      this.depthProvider = new DepthProvider(w, h, 0.5);
      this.dof = new ShaderPass(DofShader);
      this.dof.uniforms.tDepth.value = this.depthProvider.texture;
      this.dof.uniforms.uNear.value = camera.near;
      this.dof.uniforms.uFar.value = camera.far;
      this.dof.uniforms.uSamples.value = q.dofSamples;
      this.dof.uniforms.uResolution.value.set(w, h);
      this.composer.addPass(this.dof);
    }

    this.clamp = new ShaderPass(ClampShader);
    this.composer.addPass(this.clamp);

    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.78, 1.05);
      this.composer.addPass(this.bloom);
    }
    if (q.anamorphic) {
      this.streak = new StreakPass(w, h);
      this.streak.strength = 0.34;
      this.composer.addPass(this.streak);
    }

    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.uResolution.value.set(w, h);
    this.composer.addPass(this.grade);

    if (q.smaa) {
      this.smaa = new SMAAPass();
      this.composer.addPass(this.smaa);
    }

    this.copy = new ShaderPass(CopyShader);
    this.copy.enabled = false;
    this.composer.addPass(this.copy);
    this.debugStage = -1;
  }

  /**
   * Render only the first `i + 1` passes and blit the result, so a broken stage
   * can be identified directly instead of by inference. `-1` restores the chain.
   */
  set debugStage(i: number) {
    const passes = this.composer.passes;
    const copyIndex = passes.indexOf(this.copy);
    for (let idx = 0; idx < passes.length; idx++) {
      passes[idx].renderToScreen = false;
      if (idx === copyIndex) continue;
      passes[idx].enabled = i < 0 ? true : idx <= i;
    }
    if (i < 0) {
      this.copy.enabled = false;
      for (let idx = copyIndex - 1; idx >= 0; idx--) {
        if (passes[idx].enabled) {
          passes[idx].renderToScreen = true;
          break;
        }
      }
    } else {
      this.copy.enabled = true;
      this.copy.renderToScreen = true;
    }
  }

  get passNames(): string[] {
    return this.composer.passes.map((p, i) => `${i}:${(p as { constructor: { name: string } }).constructor.name}`);
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.renderPass.camera = camera;
    if (this.gtao) this.gtao.camera = camera;
    if (this.dof) {
      this.dof.uniforms.uNear.value = camera.near;
      this.dof.uniforms.uFar.value = camera.far;
    }
  }
  setScene(scene: THREE.Scene): void {
    this.renderPass.scene = scene;
    if (this.gtao) this.gtao.scene = scene;
  }

  setSize(w: number, h: number): void {
    this.size.set(w, h);
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    if (this.dof && this.depthProvider) {
      this.depthProvider.setSize(w, h);
      this.dof.uniforms.tDepth.value = this.depthProvider.texture;
      this.dof.uniforms.uResolution.value.set(w, h);
    }
    this.grade.uniforms.uResolution.value.set(w, h);
    this.gtao?.setSize(w, h);
    this.streak?.setSize(w, h);
  }

  /** Per-frame parameter animation (focus easing, grain time). */
  update(dt: number, time: number): void {
    this.focusDistance = damp(this.focusDistance, this.focusTarget, this.focusSpeed, dt);
    if (this.dof) {
      this.dof.uniforms.uFocus.value = this.focusDistance;
      this.dof.uniforms.uAperture.value = this.aperture;
      this.dof.uniforms.uMaxCoC.value = clamp(this.size.y / 78, 6, 18);
    }
    this.grade.uniforms.uTime.value = time;
  }

  set wetLens(v: number) {
    this.grade.uniforms.uWetLens.value = v;
  }
  set flash(v: number) {
    this.grade.uniforms.uFlash.value = v;
  }
  set desat(v: number) {
    this.grade.uniforms.uDesat.value = v;
  }
  set glitch(v: number) {
    this.grade.uniforms.uGlitch.value = v;
  }
  setBloom(strength: number, radius = 0.78, threshold = 1.05): void {
    if (!this.bloom) return;
    this.bloom.strength = strength;
    this.bloom.radius = radius;
    this.bloom.threshold = threshold;
  }
  set highlightCeiling(v: number) {
    this.clamp.uniforms.uMax.value = v;
  }
  setStreak(strength: number, tint?: THREE.Vector3): void {
    if (!this.streak) return;
    this.streak.strength = strength;
    if (tint) this.streak.tint.copy(tint);
  }
  /** Apply a per-scene look (exposure, split tone, vignette…). */
  applyLook(look: Partial<Record<string, number | THREE.Vector3>>): void {
    for (const [k, v] of Object.entries(look)) {
      const u = this.grade.uniforms[k];
      if (!u) continue;
      if (v instanceof THREE.Vector3 && u.value instanceof THREE.Vector3) u.value.copy(v);
      else if (typeof v === 'number') u.value = v;
    }
  }

  render(): void {
    if (this.depthProvider) {
      const clear = new THREE.Color();
      this.renderer.getClearColor(clear);
      const alpha = this.renderer.getClearAlpha();
      this.depthProvider.render(this.renderer, this.renderPass.scene, this.renderPass.camera);
      this.renderer.setClearColor(clear, alpha);
    }
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.target.dispose();
    this.streak?.dispose();
    this.depthProvider?.dispose();
  }

  get quality(): QualitySettings {
    return this.q;
  }
  get rendererRef(): THREE.WebGLRenderer {
    return this.renderer;
  }
}
