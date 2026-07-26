import * as THREE from 'three';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { QUALITY } from '../core/Config';
import type { Engine } from '../core/Engine';
import { FullScreenPass, makePass, FS_VERTEX } from './FullScreen';
import { COMPOSITE_FRAG } from './shaders/Composite';
import { GTAO_FRAG, AO_BLUR_FRAG, AO_APPLY_FRAG } from './shaders/GTAO';
import { MOTION_BLUR_FRAG } from './shaders/MotionBlur';
import { COC_FRAG, DOF_FRAG } from './shaders/DepthOfField';
import {
  BLOOM_PREFILTER_FRAG,
  BLOOM_DOWNSAMPLE_FRAG,
  BLOOM_UPSAMPLE_FRAG,
} from './shaders/Bloom';
import { TAA_FRAG } from './shaders/TAA';
import { VOLUMETRIC_FRAG, VOLUMETRIC_COMPOSITE_FRAG } from './shaders/Atmosphere';
import { generateBlueNoise, generateLensDirt } from './BlueNoise';

/** Halton(2,3) low-discrepancy sequence for sub-pixel TAA jitter. */
function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

const JITTER: Array<[number, number]> = Array.from({ length: 16 }, (_, i) => [
  halton(i + 1, 2) - 0.5,
  halton(i + 1, 3) - 0.5,
]);

export interface GradePreset {
  exposure: number;
  contrast: number;
  saturation: number;
  lift: THREE.Vector3;
  gamma: THREE.Vector3;
  gain: THREE.Vector3;
  shadowTint: THREE.Vector3;
  highlightTint: THREE.Vector3;
  splitBalance: number;
  lookSlope: THREE.Vector3;
  lookPower: THREE.Vector3;
  lookSat: number;
}

/**
 * Deferred-style post-processing stack.
 *
 * The full chain, in order:
 *   normal prepass → world colour → GTAO → volumetrics → TAA →
 *   motion blur → DOF → view-model overlay → bloom → composite → SMAA
 *
 * Depth-dependent effects all run before the first-person weapon is drawn, so
 * the weapon never gets occluded by world AO, smeared by world motion blur, or
 * defocused by world DOF — matching how shipped shooters separate view-model
 * and world passes.
 */
export class RenderPipeline {
  private readonly engine: Engine;
  private readonly renderer: THREE.WebGLRenderer;

  private width = 1;
  private height = 1;
  private dpr = 1;
  private rtW = 1;
  private rtH = 1;

  // ---- render targets ----
  /**
   * `rtSceneA` owns the depth attachment and is therefore only ever written
   * by the world pass and the view-model overlay. Post passes that sample
   * depth ping-pong between B and C instead — sampling a target's own depth
   * attachment while writing its colour is a framebuffer feedback loop, which
   * WebGL rejects outright.
   */
  private rtSceneA!: THREE.WebGLRenderTarget;
  private rtSceneB!: THREE.WebGLRenderTarget;
  private rtSceneC!: THREE.WebGLRenderTarget;
  private rtNormal!: THREE.WebGLRenderTarget;
  private rtAO!: THREE.WebGLRenderTarget;
  private rtAOBlur!: THREE.WebGLRenderTarget;
  private rtVolumetric!: THREE.WebGLRenderTarget;
  private rtCoC!: THREE.WebGLRenderTarget;
  private rtHistory!: THREE.WebGLRenderTarget;
  private rtHistoryPrev!: THREE.WebGLRenderTarget;
  private rtLdr!: THREE.WebGLRenderTarget;
  private bloomMips: THREE.WebGLRenderTarget[] = [];
  private bloomScratch: THREE.WebGLRenderTarget[] = [];
  private depthTexture!: THREE.DepthTexture;

  // ---- passes ----
  private gtaoPass!: FullScreenPass;
  private aoBlurPass!: FullScreenPass;
  private aoApplyPass!: FullScreenPass;
  private volumetricPass!: FullScreenPass;
  private volCompositePass!: FullScreenPass;
  private taaPass!: FullScreenPass;
  private motionBlurPass!: FullScreenPass;
  private cocPass!: FullScreenPass;
  private dofPass!: FullScreenPass;
  private bloomPrefilterPass!: FullScreenPass;
  private bloomDownPass!: FullScreenPass;
  private bloomUpPass!: FullScreenPass;
  private compositePass!: FullScreenPass;
  private copyPass!: FullScreenPass;
  private smaaPass: SMAAPass | null = null;

  private readonly normalMaterial = new THREE.MeshNormalMaterial();
  private readonly blueNoise: THREE.DataTexture;
  private readonly lensDirt: THREE.DataTexture;

  private frameIndex = 0;
  private prevViewProjection = new THREE.Matrix4();
  private currViewProjection = new THREE.Matrix4();
  private inverseViewProjection = new THREE.Matrix4();
  private historyValid = false;
  private readonly jitterOffset = new THREE.Vector2();

  // ---- runtime-tweakable state (driven by gameplay) ----
  readonly grade: GradePreset = {
    exposure: 1.0,
    contrast: 1.06,
    saturation: 1.02,
    lift: new THREE.Vector3(0.004, 0.006, 0.014),
    gamma: new THREE.Vector3(1.0, 1.0, 1.0),
    gain: new THREE.Vector3(1.0, 0.995, 0.975),
    shadowTint: new THREE.Vector3(0.90, 0.96, 1.10),
    highlightTint: new THREE.Vector3(1.05, 1.005, 0.94),
    splitBalance: 0.15,
    lookSlope: new THREE.Vector3(1.0, 1.0, 1.0),
    lookPower: new THREE.Vector3(1.0, 1.0, 1.0),
    lookSat: 1.0,
  };

  /** Auto-exposure state. */
  private exposureCurrent = 1;
  autoExposure = true;
  exposureTarget = 1;
  exposureSpeedUp = 2.4;
  exposureSpeedDown = 0.9;
  exposureMin = 0.35;
  exposureMax = 2.6;

  /** Gameplay-driven screen effects. */
  damageFlash = 0;
  readonly damageDir = new THREE.Vector3(0, 1, 0);
  suppression = 0;
  concussion = 0;
  fadeToBlack = 1;

  /** DOF control. */
  focusDistance = 12;
  focalLength = 0.05;
  aperture = 4.0;
  dofEnabled = false;

  /** Motion blur amount, 0..1. */
  motionBlurAmount = 0.55;

  /** Sun state, set by the sky/lighting system each frame. */
  readonly sunDirection = new THREE.Vector3(0.4, 0.55, 0.3).normalize();
  readonly sunColor = new THREE.Color(1, 0.94, 0.82);
  sunIntensity = 3.4;

  /**
   * Volumetric medium. Density is extinction per metre: 0.006 gives roughly
   * 50% transmittance at 115 m, which reads as clear desert air with visible
   * aerial perspective on the far side of the map rather than as fog.
   */
  fogDensity = 0.0062;
  fogHeightFalloff = 0.055;
  fogBaseHeight = 0;
  readonly fogAlbedo = new THREE.Color(0.78, 0.80, 0.84);
  fogAnisotropy = 0.7;
  volumetricStrength = 1;

  /** Shadow cascades supplied by the lighting system for volumetric marching. */
  shadowCascades: Array<{ map: THREE.Texture | null; matrix: THREE.Matrix4; split: number }> = [];

  /**
   * Reads back the mean colour of a render target. Diagnostic only — a
   * synchronous readback stalls the pipeline, so this is never called on a
   * normal frame.
   */
  probe(name: string): { r: number; g: number; b: number; max: number } | null {
    const targets: Record<string, THREE.WebGLRenderTarget | undefined> = {
      sceneA: this.rtSceneA,
      sceneB: this.rtSceneB,
      normal: this.rtNormal,
      ao: this.rtAO,
      volumetric: this.rtVolumetric,
      history: this.rtHistory,
      ldr: this.rtLdr,
      bloom0: this.bloomMips[0],
    };
    const rt = targets[name];
    if (!rt) return null;

    const w = Math.min(rt.width, 64);
    const h = Math.min(rt.height, 64);
    const isHalf = rt.texture.type === THREE.HalfFloatType;
    const isFloat = rt.texture.type === THREE.FloatType;
    const buf = isHalf
      ? new Uint16Array(w * h * 4)
      : isFloat
        ? new Float32Array(w * h * 4)
        : new Uint8Array(w * h * 4);
    try {
      this.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    } catch {
      return null;
    }
    const decode = (v: number): number =>
      isHalf ? THREE.DataUtils.fromHalfFloat(v) : isFloat ? v : v / 255;

    let r = 0, g = 0, b = 0, max = 0;
    const n = w * h;
    for (let i = 0; i < n; i++) {
      const rr = decode(buf[i * 4]);
      const gg = decode(buf[i * 4 + 1]);
      const bb = decode(buf[i * 4 + 2]);
      r += rr; g += gg; b += bb;
      max = Math.max(max, rr, gg, bb);
    }
    return { r: r / n, g: g / n, b: b / n, max };
  }

  /** Scene depth, exposed so soft-particle shaders can read it. */
  get depthTextureRef(): THREE.DepthTexture | null {
    return this.depthTexture ?? null;
  }

  get internalWidth(): number {
    return this.rtW;
  }

  get internalHeight(): number {
    return this.rtH;
  }

  /** Analytic smoke volumes injected by VFX. */
  private readonly smokeVolumes = new Array(6).fill(0).map(() => new THREE.Vector4(0, 0, 0, 0));
  private readonly smokeParams = new Array(6).fill(0).map(() => new THREE.Vector4(0, 0, 0, 0));
  private smokeCount = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    this.renderer = engine.renderer;
    this.blueNoise = generateBlueNoise(64, 16);
    this.lensDirt = generateLensDirt(512);
    this.normalMaterial.side = THREE.FrontSide;
    this.buildPasses();
  }

  // -------------------------------------------------------------- setup ----

  private makeRT(
    w: number,
    h: number,
    opts: Partial<THREE.RenderTargetOptions> = {},
  ): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.NoColorSpace,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      ...opts,
    });
  }

  private buildPasses(): void {
    const zero2 = () => new THREE.Vector2();

    this.gtaoPass = makePass(
      GTAO_FRAG,
      {
        tDepth: { value: null },
        tNormal: { value: null },
        uResolution: { value: zero2() },
        uTexel: { value: zero2() },
        uProjection: { value: new THREE.Matrix4() },
        uInverseProjection: { value: new THREE.Matrix4() },
        uNear: { value: 0.05 },
        uFar: { value: 3000 },
        uRadius: { value: 1.15 },
        uIntensity: { value: 1.5 },
        uBias: { value: 0.02 },
        uThickness: { value: 0.35 },
        uFrame: { value: 0 },
      },
      { SLICES: 3, STEPS: 6 },
    );

    this.aoBlurPass = makePass(AO_BLUR_FRAG, {
      tAO: { value: null },
      uTexel: { value: zero2() },
      uDirection: { value: new THREE.Vector2(1, 0) },
      uDepthSigma: { value: 90 },
    });

    this.aoApplyPass = makePass(AO_APPLY_FRAG, {
      tScene: { value: null },
      tAO: { value: null },
      uBounceTint: { value: new THREE.Vector3(1.02, 0.98, 0.94) },
      uStrength: { value: 0.9 },
      uSpecularOcclusion: { value: 0.35 },
    });

    this.volumetricPass = makePass(
      VOLUMETRIC_FRAG,
      {
        tDepth: { value: null },
        tBlueNoise: { value: this.blueNoise },
        uInverseViewProjection: { value: new THREE.Matrix4() },
        uCameraPos: { value: new THREE.Vector3() },
        uNear: { value: 0.05 },
        uFar: { value: 3000 },
        uTime: { value: 0 },
        uResolution: { value: zero2() },
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Vector3(1, 1, 1) },
        uSunIntensity: { value: 3 },
        uFogDensity: { value: 0.012 },
        uFogHeightFalloff: { value: 0.045 },
        uFogBaseHeight: { value: 0 },
        uFogAlbedo: { value: new THREE.Vector3(0.72, 0.76, 0.82) },
        uAnisotropy: { value: 0.7 },
        uMaxDistance: { value: 260 },
        uNoiseStrength: { value: 0.35 },
        uWind: { value: new THREE.Vector3(1, 0.1, 0.4) },
        uCascadeCount: { value: 0 },
        tShadow0: { value: null },
        tShadow1: { value: null },
        uShadowMatrix0: { value: new THREE.Matrix4() },
        uShadowMatrix1: { value: new THREE.Matrix4() },
        uCascadeSplit0: { value: 30 },
        uCascadeSplit1: { value: 90 },
        uSmoke: { value: this.smokeVolumes },
        uSmokeParams: { value: this.smokeParams },
        uSmokeCount: { value: 0 },
      },
      { VOL_STEPS: QUALITY.volumetricSteps },
    );

    this.volCompositePass = makePass(VOLUMETRIC_COMPOSITE_FRAG, {
      tScene: { value: null },
      tVolumetric: { value: null },
      tDepth: { value: null },
      uTexel: { value: zero2() },
      uStrength: { value: 1 },
    });

    this.taaPass = makePass(TAA_FRAG, {
      tCurrent: { value: null },
      tHistory: { value: null },
      tDepth: { value: null },
      uTexel: { value: zero2() },
      uJitter: { value: zero2() },
      uInverseViewProjection: { value: new THREE.Matrix4() },
      uPrevViewProjection: { value: new THREE.Matrix4() },
      uFeedbackMin: { value: 0.86 },
      uFeedbackMax: { value: 0.965 },
      uVarianceGamma: { value: 1.25 },
      uReset: { value: 1 },
    });

    this.motionBlurPass = makePass(
      MOTION_BLUR_FRAG,
      {
        tScene: { value: null },
        tDepth: { value: null },
        uInverseViewProjection: { value: new THREE.Matrix4() },
        uPrevViewProjection: { value: new THREE.Matrix4() },
        uIntensity: { value: 0.55 },
        uMaxVelocity: { value: 0.08 },
        uFrame: { value: 0 },
        uTexel: { value: zero2() },
        uCenterProtect: { value: 0.65 },
      },
      { MB_SAMPLES: QUALITY.tier === 'ultra' ? 16 : 10 },
    );

    this.cocPass = makePass(COC_FRAG, {
      tDepth: { value: null },
      uNear: { value: 0.05 },
      uFar: { value: 3000 },
      uFocusDistance: { value: 12 },
      uFocalLength: { value: 0.05 },
      uAperture: { value: 4 },
      uSensorHeight: { value: 0.024 },
      uMaxCoC: { value: 0.022 },
      uNearScale: { value: 0.45 },
    });

    this.dofPass = makePass(
      DOF_FRAG,
      {
        tScene: { value: null },
        tCoC: { value: null },
        uTexel: { value: zero2() },
        uResolution: { value: zero2() },
        uMaxCoC: { value: 0.022 },
        uBokehIntensity: { value: 1.4 },
        uFrame: { value: 0 },
        uAnamorphic: { value: 1.0 },
        uBlades: { value: 7 },
      },
      { DOF_SAMPLES: QUALITY.tier === 'ultra' ? 32 : 18 },
    );

    this.bloomPrefilterPass = makePass(BLOOM_PREFILTER_FRAG, {
      tScene: { value: null },
      uTexel: { value: zero2() },
      uThreshold: { value: 1.05 },
      uSoftKnee: { value: 0.6 },
      uClamp: { value: 40 },
    });

    this.bloomDownPass = makePass(BLOOM_DOWNSAMPLE_FRAG, {
      tSource: { value: null },
      uTexel: { value: zero2() },
    });

    this.bloomUpPass = makePass(BLOOM_UPSAMPLE_FRAG, {
      tSource: { value: null },
      tTarget: { value: null },
      uTexel: { value: zero2() },
      uRadius: { value: 1.0 },
      uBlend: { value: 1.0 },
    });

    this.compositePass = makePass(COMPOSITE_FRAG, {
      tScene: { value: null },
      tBloom: { value: null },
      tDirt: { value: this.lensDirt },
      uResolution: { value: zero2() },
      uTexel: { value: zero2() },
      uTime: { value: 0 },
      uExposure: { value: 1 },
      uBloomStrength: { value: 0.052 },
      uDirtStrength: { value: 0.22 },
      // Offsets are in UV units scaled by r^2, so this works out to roughly
      // two pixels of fringing at the corners of a 1080p frame and none at
      // the centre — the amount an uncorrected wide lens actually shows.
      uChromatic: { value: 0.0065 },
      uDistortion: { value: 0.012 },
      uVignette: { value: 0.5 },
      uVignetteRoundness: { value: 0.5 },
      uGrain: { value: 0.026 },
      uGrainSize: { value: 1.25 },
      uSharpen: { value: 0.3 },
      uDither: { value: 1 / 255 },
      uContrast: { value: this.grade.contrast },
      uSaturation: { value: this.grade.saturation },
      uLift: { value: this.grade.lift },
      uGamma: { value: this.grade.gamma },
      uGain: { value: this.grade.gain },
      uShadowTint: { value: this.grade.shadowTint },
      uHighlightTint: { value: this.grade.highlightTint },
      uSplitBalance: { value: this.grade.splitBalance },
      uLookSlope: { value: this.grade.lookSlope },
      uLookPower: { value: this.grade.lookPower },
      uLookSat: { value: this.grade.lookSat },
      uHighlightDesat: { value: 0.5 },
      uDamageFlash: { value: 0 },
      uDamageDir: { value: new THREE.Vector3(0, 1, 0) },
      uSuppression: { value: 0 },
      uConcussion: { value: 0 },
      uFadeToBlack: { value: 1 },
    });

    this.copyPass = new FullScreenPass(
      new THREE.ShaderMaterial({
        vertexShader: FS_VERTEX,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying vec2 vUv;
          uniform sampler2D tSource;
          void main() { gl_FragColor = texture2D(tSource, vUv); }
        `,
        uniforms: { tSource: { value: null } },
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
      }),
    );
  }

  // ------------------------------------------------------------- resize ----

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    const scale = QUALITY.renderScale;
    const w = Math.max(1, Math.floor(width * dpr * scale));
    const h = Math.max(1, Math.floor(height * dpr * scale));
    if (w === this.rtW && h === this.rtH && this.rtSceneA) return;
    this.rtW = w;
    this.rtH = h;

    this.disposeTargets();

    this.depthTexture = new THREE.DepthTexture(w, h);
    this.depthTexture.type = THREE.UnsignedIntType;
    this.depthTexture.format = THREE.DepthFormat;
    this.depthTexture.minFilter = THREE.NearestFilter;
    this.depthTexture.magFilter = THREE.NearestFilter;

    this.rtSceneA = this.makeRT(w, h, { depthBuffer: true });
    this.rtSceneA.depthTexture = this.depthTexture;
    this.rtSceneB = this.makeRT(w, h);
    this.rtSceneC = this.makeRT(w, h);

    const aoScale = QUALITY.tier === 'ultra' ? 1 : 0.5;
    this.rtNormal = this.makeRT(w, h, { type: THREE.UnsignedByteType, depthBuffer: true });
    this.rtAO = this.makeRT(w * aoScale, h * aoScale);
    this.rtAOBlur = this.makeRT(w * aoScale, h * aoScale);

    this.rtVolumetric = this.makeRT(w * 0.5, h * 0.5);
    this.rtCoC = this.makeRT(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

    this.rtHistory = this.makeRT(w, h);
    this.rtHistoryPrev = this.makeRT(w, h);
    this.rtLdr = this.makeRT(w, h, { type: THREE.UnsignedByteType, colorSpace: THREE.NoColorSpace });

    const mips = Math.min(QUALITY.bloomMips, Math.floor(Math.log2(Math.min(w, h))) - 2);
    this.bloomMips = [];
    this.bloomScratch = [];
    for (let i = 0; i < Math.max(2, mips); i++) {
      const d = Math.pow(2, i + 1);
      const mw = Math.max(1, Math.floor(w / d));
      const mh = Math.max(1, Math.floor(h / d));
      this.bloomMips.push(this.makeRT(mw, mh));
      // A same-size scratch per level lets the upsample read a mip and write
      // its sibling without ever binding one target as both source and
      // destination, which WebGL rejects as a feedback loop.
      this.bloomScratch.push(this.makeRT(mw, mh));
    }

    if (QUALITY.tier !== 'low') {
      this.smaaPass?.dispose?.();
      this.smaaPass = new SMAAPass();
      this.smaaPass.setSize(w, h);
    }

    this.historyValid = false;
  }

  private disposeTargets(): void {
    const targets = [
      this.rtSceneA, this.rtSceneB, this.rtSceneC, this.rtNormal, this.rtAO, this.rtAOBlur,
      this.rtVolumetric, this.rtCoC, this.rtHistory, this.rtHistoryPrev, this.rtLdr,
      ...this.bloomMips, ...this.bloomScratch,
    ];
    for (const t of targets) t?.dispose?.();
    this.bloomMips = [];
    this.bloomScratch = [];
  }

  // ------------------------------------------------------------- smoke -----

  setSmokeVolumes(
    list: Array<{ x: number; y: number; z: number; radius: number; density: number; seed: number; age: number }>,
  ): void {
    this.smokeCount = Math.min(list.length, 6);
    for (let i = 0; i < 6; i++) {
      if (i < this.smokeCount) {
        const s = list[i];
        this.smokeVolumes[i].set(s.x, s.y, s.z, s.radius);
        this.smokeParams[i].set(s.density, s.seed, s.age, 0);
      } else {
        this.smokeVolumes[i].set(0, 0, 0, 0);
        this.smokeParams[i].set(0, 0, 0, 0);
      }
    }
  }

  // ------------------------------------------------------------ render -----

  render(dt: number): void {
    const { renderer, scene, viewScene, camera, viewCamera } = this.engine;
    if (!this.rtSceneA) this.resize(this.width || 1, this.height || 1, this.dpr || 1);

    this.frameIndex++;
    const useTAA = QUALITY.taa;

    camera.updateMatrixWorld();
    viewCamera.updateMatrixWorld();

    // ---- TAA sub-pixel jitter -------------------------------------------
    const baseProjection = camera.projectionMatrix.clone();
    if (useTAA) {
      const [jx, jy] = JITTER[this.frameIndex % JITTER.length];
      this.jitterOffset.set((jx * 2) / this.rtW, (jy * 2) / this.rtH);
      camera.projectionMatrix.elements[8] += this.jitterOffset.x;
      camera.projectionMatrix.elements[9] += this.jitterOffset.y;
    } else {
      this.jitterOffset.set(0, 0);
    }

    // Unjittered matrices are used for reprojection so velocity is exact.
    this.currViewProjection
      .multiplyMatrices(baseProjection, camera.matrixWorldInverse);
    this.inverseViewProjection.copy(this.currViewProjection).invert();

    // ---- 1. normal prepass ----------------------------------------------
    const needsNormals = QUALITY.ssao;
    if (needsNormals) {
      scene.overrideMaterial = this.normalMaterial;
      renderer.setRenderTarget(this.rtNormal);
      renderer.setClearColor(0x8080ff, 1);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
    }

    // ---- 2. world colour -------------------------------------------------
    renderer.setRenderTarget(this.rtSceneA);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);

    // `src` starts on the depth-owning target; every post pass writes into
    // the B/C pair so the depth attachment is never bound for read and write
    // at the same time.
    let src: THREE.WebGLRenderTarget = this.rtSceneA;
    let dst: THREE.WebGLRenderTarget = this.rtSceneB;
    const swap = () => {
      src = dst;
      dst = dst === this.rtSceneB ? this.rtSceneC : this.rtSceneB;
    };

    // ---- 3. GTAO ---------------------------------------------------------
    if (QUALITY.ssao) {
      const u = this.gtaoPass.uniforms;
      u.tDepth.value = this.depthTexture;
      u.tNormal.value = this.rtNormal.texture;
      (u.uResolution.value as THREE.Vector2).set(this.rtW, this.rtH);
      (u.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      (u.uProjection.value as THREE.Matrix4).copy(baseProjection);
      (u.uInverseProjection.value as THREE.Matrix4).copy(baseProjection).invert();
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uFrame.value = this.frameIndex % 64;
      this.gtaoPass.render(renderer, this.rtAO);

      const bu = this.aoBlurPass.uniforms;
      (bu.uTexel.value as THREE.Vector2).set(1 / this.rtAO.width, 1 / this.rtAO.height);
      bu.tAO.value = this.rtAO.texture;
      (bu.uDirection.value as THREE.Vector2).set(1, 0);
      this.aoBlurPass.render(renderer, this.rtAOBlur);
      bu.tAO.value = this.rtAOBlur.texture;
      (bu.uDirection.value as THREE.Vector2).set(0, 1);
      this.aoBlurPass.render(renderer, this.rtAO);

      const au = this.aoApplyPass.uniforms;
      au.tScene.value = src.texture;
      au.tAO.value = this.rtAO.texture;
      this.aoApplyPass.render(renderer, dst);
      swap();
    }

    // ---- 4. volumetric lighting -----------------------------------------
    if (QUALITY.volumetricLight) {
      const u = this.volumetricPass.uniforms;
      u.tDepth.value = this.depthTexture;
      (u.uInverseViewProjection.value as THREE.Matrix4).copy(this.inverseViewProjection);
      (u.uCameraPos.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uTime.value = this.engine.time.elapsed;
      (u.uResolution.value as THREE.Vector2).set(this.rtVolumetric.width, this.rtVolumetric.height);
      (u.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
      (u.uSunColor.value as THREE.Vector3).set(this.sunColor.r, this.sunColor.g, this.sunColor.b);
      u.uSunIntensity.value = this.sunIntensity;
      u.uFogDensity.value = this.fogDensity;
      u.uFogHeightFalloff.value = this.fogHeightFalloff;
      u.uFogBaseHeight.value = this.fogBaseHeight;
      (u.uFogAlbedo.value as THREE.Vector3).set(this.fogAlbedo.r, this.fogAlbedo.g, this.fogAlbedo.b);
      u.uAnisotropy.value = this.fogAnisotropy;
      u.uSmokeCount.value = this.smokeCount;

      const c0 = this.shadowCascades[0];
      const c1 = this.shadowCascades[1];
      u.uCascadeCount.value = this.shadowCascades.length > 0 ? Math.min(2, this.shadowCascades.length) : 0;
      u.tShadow0.value = c0?.map ?? null;
      u.tShadow1.value = c1?.map ?? null;
      if (c0) (u.uShadowMatrix0.value as THREE.Matrix4).copy(c0.matrix);
      if (c1) (u.uShadowMatrix1.value as THREE.Matrix4).copy(c1.matrix);
      u.uCascadeSplit0.value = c0?.split ?? 30;
      u.uCascadeSplit1.value = c1?.split ?? 90;

      this.volumetricPass.render(renderer, this.rtVolumetric);

      const cu = this.volCompositePass.uniforms;
      cu.tScene.value = src.texture;
      cu.tVolumetric.value = this.rtVolumetric.texture;
      cu.tDepth.value = this.depthTexture;
      (cu.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      cu.uStrength.value = this.volumetricStrength;
      this.volCompositePass.render(renderer, dst);
      swap();
    }

    // ---- 5. TAA resolve --------------------------------------------------
    if (useTAA) {
      const u = this.taaPass.uniforms;
      u.tCurrent.value = src.texture;
      u.tHistory.value = this.rtHistoryPrev.texture;
      u.tDepth.value = this.depthTexture;
      (u.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      (u.uJitter.value as THREE.Vector2).copy(this.jitterOffset);
      (u.uInverseViewProjection.value as THREE.Matrix4).copy(this.inverseViewProjection);
      (u.uPrevViewProjection.value as THREE.Matrix4).copy(this.prevViewProjection);
      u.uReset.value = this.historyValid ? 0 : 1;
      this.taaPass.render(renderer, this.rtHistory);

      // Result lives in the history buffer; copy it into the ping-pong chain.
      this.copyPass.uniforms.tSource.value = this.rtHistory.texture;
      this.copyPass.render(renderer, dst);
      swap();

      const t = this.rtHistory;
      this.rtHistory = this.rtHistoryPrev;
      this.rtHistoryPrev = t;
      this.historyValid = true;
    }

    // ---- 6. motion blur --------------------------------------------------
    if (QUALITY.motionBlur && this.motionBlurAmount > 0.001 && this.historyValid) {
      const u = this.motionBlurPass.uniforms;
      u.tScene.value = src.texture;
      u.tDepth.value = this.depthTexture;
      (u.uInverseViewProjection.value as THREE.Matrix4).copy(this.inverseViewProjection);
      (u.uPrevViewProjection.value as THREE.Matrix4).copy(this.prevViewProjection);
      // Normalise by frame time so the smear length is shutter-based, not
      // framerate-based: at 30fps and 120fps the blur should look the same.
      const shutter = Math.min(dt / (1 / 60), 3);
      u.uIntensity.value = this.motionBlurAmount * shutter;
      u.uFrame.value = this.frameIndex % 64;
      (u.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      this.motionBlurPass.render(renderer, dst);
      swap();
    }

    // ---- 7. depth of field ----------------------------------------------
    if (QUALITY.depthOfField && this.dofEnabled) {
      const cu = this.cocPass.uniforms;
      cu.tDepth.value = this.depthTexture;
      cu.uNear.value = camera.near;
      cu.uFar.value = camera.far;
      cu.uFocusDistance.value = this.focusDistance;
      cu.uFocalLength.value = this.focalLength;
      cu.uAperture.value = this.aperture;
      this.cocPass.render(renderer, this.rtCoC);

      const du = this.dofPass.uniforms;
      du.tScene.value = src.texture;
      du.tCoC.value = this.rtCoC.texture;
      (du.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      (du.uResolution.value as THREE.Vector2).set(this.rtW, this.rtH);
      du.uFrame.value = this.frameIndex % 64;
      this.dofPass.render(renderer, dst);
      swap();
    }

    // ---- 8. view model overlay ------------------------------------------
    // Draw into rtSceneA — the only target with a depth attachment — after
    // clearing depth, so the weapon composites on top of the finished world
    // without being occluded by it. Nothing samples the depth texture from
    // here on, so writing colour back into rtSceneA is safe.
    if (src !== this.rtSceneA) {
      this.copyPass.uniforms.tSource.value = src.texture;
      this.copyPass.render(renderer, this.rtSceneA);
      src = this.rtSceneA;
      dst = this.rtSceneB;
    }
    renderer.setRenderTarget(this.rtSceneA);
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
    renderer.setRenderTarget(null);

    // ---- 9. bloom --------------------------------------------------------
    let bloomTexture: THREE.Texture | null = null;
    if (QUALITY.bloom && this.bloomMips.length >= 2) {
      const pf = this.bloomPrefilterPass.uniforms;
      pf.tScene.value = src.texture;
      (pf.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      this.bloomPrefilterPass.render(renderer, this.bloomMips[0]);

      for (let i = 1; i < this.bloomMips.length; i++) {
        const from = this.bloomMips[i - 1];
        const du = this.bloomDownPass.uniforms;
        du.tSource.value = from.texture;
        (du.uTexel.value as THREE.Vector2).set(1 / from.width, 1 / from.height);
        this.bloomDownPass.render(renderer, this.bloomMips[i]);
      }

      for (let i = this.bloomMips.length - 1; i > 0; i--) {
        const from = this.bloomMips[i];
        const to = this.bloomMips[i - 1];
        const scratch = this.bloomScratch[i - 1];
        const uu = this.bloomUpPass.uniforms;
        uu.tSource.value = from.texture;
        uu.tTarget.value = to.texture;
        (uu.uTexel.value as THREE.Vector2).set(1 / from.width, 1 / from.height);
        uu.uRadius.value = 1.0;
        uu.uBlend.value = 1.0;
        // The upsample reads `to` and accumulates into it, so it has to bounce
        // through a same-size scratch target.
        this.bloomUpPass.render(renderer, scratch);
        this.copyPass.uniforms.tSource.value = scratch.texture;
        this.copyPass.render(renderer, to);
      }
      bloomTexture = this.bloomMips[0].texture;
    }

    // ---- 10. exposure ----------------------------------------------------
    this.updateExposure(dt);

    // ---- 11. composite ---------------------------------------------------
    const cu = this.compositePass.uniforms;
    cu.tScene.value = src.texture;
    cu.tBloom.value = bloomTexture ?? this.blueNoise;
    cu.uBloomStrength.value = bloomTexture ? 0.055 : 0;
    (cu.uResolution.value as THREE.Vector2).set(this.rtW, this.rtH);
    (cu.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
    cu.uTime.value = this.engine.time.elapsed;
    cu.uExposure.value = this.exposureCurrent * this.grade.exposure;
    cu.uContrast.value = this.grade.contrast;
    cu.uSaturation.value = this.grade.saturation;
    (cu.uLift.value as THREE.Vector3).copy(this.grade.lift);
    (cu.uGamma.value as THREE.Vector3).copy(this.grade.gamma);
    (cu.uGain.value as THREE.Vector3).copy(this.grade.gain);
    (cu.uShadowTint.value as THREE.Vector3).copy(this.grade.shadowTint);
    (cu.uHighlightTint.value as THREE.Vector3).copy(this.grade.highlightTint);
    cu.uSplitBalance.value = this.grade.splitBalance;
    (cu.uLookSlope.value as THREE.Vector3).copy(this.grade.lookSlope);
    (cu.uLookPower.value as THREE.Vector3).copy(this.grade.lookPower);
    cu.uLookSat.value = this.grade.lookSat;
    cu.uDamageFlash.value = this.damageFlash;
    (cu.uDamageDir.value as THREE.Vector3).copy(this.damageDir);
    cu.uSuppression.value = this.suppression;
    cu.uConcussion.value = this.concussion;
    cu.uFadeToBlack.value = this.fadeToBlack;
    cu.uChromatic.value = QUALITY.chromaticAberration ? 0.0065 : 0;
    cu.uGrain.value = QUALITY.filmGrain ? 0.026 : 0;
    cu.uDirtStrength.value = QUALITY.lensDirt ? 0.22 : 0;

    if (this.smaaPass) {
      this.compositePass.render(renderer, this.rtLdr);
      renderer.setRenderTarget(null);
      this.smaaPass.renderToScreen = true;
      this.smaaPass.render(renderer, null as unknown as THREE.WebGLRenderTarget, this.rtLdr, dt, false);
    } else {
      this.compositePass.render(renderer, null);
    }

    // ---- bookkeeping -----------------------------------------------------
    camera.projectionMatrix.copy(baseProjection);
    this.prevViewProjection.copy(this.currViewProjection);
    renderer.setRenderTarget(null);
  }

  private updateExposure(dt: number): void {
    if (!this.autoExposure) {
      this.exposureCurrent = THREE.MathUtils.damp(this.exposureCurrent, this.exposureTarget, 6, dt);
      return;
    }
    const target = THREE.MathUtils.clamp(this.exposureTarget, this.exposureMin, this.exposureMax);
    const speed = target < this.exposureCurrent ? this.exposureSpeedDown : this.exposureSpeedUp;
    this.exposureCurrent = THREE.MathUtils.damp(this.exposureCurrent, target, speed, dt);
  }

  /** Immediately snaps exposure — used on spawn and level load. */
  resetExposure(value: number): void {
    this.exposureCurrent = value;
    this.exposureTarget = value;
    this.historyValid = false;
  }

  dispose(): void {
    this.disposeTargets();
    this.gtaoPass.dispose();
    this.aoBlurPass.dispose();
    this.aoApplyPass.dispose();
    this.volumetricPass.dispose();
    this.volCompositePass.dispose();
    this.taaPass.dispose();
    this.motionBlurPass.dispose();
    this.cocPass.dispose();
    this.dofPass.dispose();
    this.bloomPrefilterPass.dispose();
    this.bloomDownPass.dispose();
    this.bloomUpPass.dispose();
    this.compositePass.dispose();
    this.copyPass.dispose();
    this.smaaPass?.dispose?.();
    this.normalMaterial.dispose();
    this.blueNoise.dispose();
    this.lensDirt.dispose();
  }
}
