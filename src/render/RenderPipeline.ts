import * as THREE from 'three';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { QUALITY, SHOT_MODE } from '../core/Config';
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
import { LUM_REDUCE_FRAG, LUM_RESOLVE_FRAG } from './shaders/Exposure';
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

/** Metering grid. 144 cells is enough to weight a frame without aliasing it. */
const LUM_W = 16;
const LUM_H = 9;

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
  /**
   * Print-film contrast, as a slope on the tonemap's log encoding. 1.0 is
   * AgX's native 16.5-stop latitude, which is far flatter than any shipped
   * frame; 1.7 lands the effective latitude just under ten stops.
   */
  lookContrast: number;
  /**
   * Shoulder slope as a multiple of `lookContrast`. Above 1 steepens highlights;
   * below 1 buys latitude.
   *
   * Around 0.67 the window holds a little under six stops over grey, which keeps
   * cloud tops and sunlit plaster modelled rather than arriving as one flat
   * plate. Pushing it to 0.56 does protect the small patch of horizon sky that a
   * street scene blows through a doorway, but that patch is many stops over the
   * metered level and cannot be recovered by curve shape alone — all the extra
   * latitude actually buys is a frame whose brightest pixel is 0.88, with no
   * genuine near-white anywhere. Blown sky behind a shadowed street is what a
   * real exposure does; a frame with no highlights is not.
   */
  lookShoulder: number;
  /**
   * Where the deep-shadow roll-off begins, in normalised log units below 18%
   * grey. AgX's window is 16.5 stops wide, so 0.06 is one stop. At 0.15 the knee
   * sits two and a half stops under grey, which is where open shade lands when
   * the sunlit side of the same frame is a stop or so over it — early enough
   * that skylit surfaces keep their modelling, late enough that the midtones
   * still get the full slope.
   */
  toeKnee: number;
  /** Slope past the knee, as a multiple of `lookContrast`. */
  toeSlope: number;
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
  private rtLum!: THREE.WebGLRenderTarget;
  private rtAdapt!: THREE.WebGLRenderTarget;
  private rtAdaptPrev!: THREE.WebGLRenderTarget;
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
  private lumReducePass!: FullScreenPass;
  private lumResolvePass!: FullScreenPass;
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
  private adaptValid = false;
  private readonly jitterOffset = new THREE.Vector2();

  // ---- runtime-tweakable state (driven by gameplay) ----
  readonly grade: GradePreset = {
    exposure: 1.0,
    contrast: 1.06,
    saturation: 1.02,
    lift: new THREE.Vector3(0.0, 0.0, 0.0),
    gamma: new THREE.Vector3(1.0, 1.0, 1.0),
    gain: new THREE.Vector3(1.0, 0.995, 0.975),
    shadowTint: new THREE.Vector3(0.83, 0.945, 1.19),
    highlightTint: new THREE.Vector3(1.07, 1.008, 0.91),
    splitBalance: 0.15,
    lookContrast: 1.72,
    lookShoulder: 0.67,
    toeKnee: 0.15,
    toeSlope: 0.6,
    lookSlope: new THREE.Vector3(1.0, 1.0, 1.0),
    lookPower: new THREE.Vector3(1.0, 1.0, 1.0),
    lookSat: 1.0,
  };

  /** Gameplay-driven exposure offset (pitch bias, flashbangs, airstrikes). */
  private exposureCurrent = 1;
  autoExposure = true;
  exposureTarget = 1;
  exposureSpeedUp = 2.4;
  exposureSpeedDown = 0.9;
  exposureMin = 0.35;
  exposureMax = 2.6;

  /**
   * Bounds on the frame-measured exposure trim, in linear scale factors — half
   * a stop each way.
   *
   * The lighting system's analytic meter decides how bright the world is; this
   * only corrects for where the camera is pointing. Letting it off the leash
   * would normalise every location to the same brightness, which is what makes
   * a night raid look like an overcast afternoon, and it also undoes the
   * deliberate black point by dragging a shadowed frame back up to key.
   */
  autoTrimMin = 0.76;
  autoTrimMax = 2.2;
  /** Upward bound once the sky fills a fifth of the frame or more. */
  autoTrimMaxOpen = 1.04;
  /** Post-exposure scene-referred average the trim aims for; set per preset. */
  autoKey = 0.14;
  /** Eye adaptation time constant, seconds. */
  autoAdaptSpeed = 5.5;

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

  /**
   * Per-octave falloff of the bloom upsample chain.
   *
   * The chain accumulates each mip into the next larger one, so a blend of 1
   * gives every octave equal energy — and because each octave covers four times
   * the area of the one below it, the widest mip ends up painting a near-uniform
   * additive sheet over the whole frame. Measured against a sunlit sky that is
   * several stops over white, that sheet added ~0.09 of post-exposure grey to
   * every shadow in the frame: shadowed facades tripled in brightness and every
   * silhouette picked up a glowing rim. It is the "haze layer over everything"
   * that reads as amateur more than any single other defect.
   *
   * A lens point-spread function falls off steeply — roughly as the inverse
   * square of the angle — so the wide tail carries a small fraction of the
   * energy, not an equal share. A constant blend below 1 gives octave k a weight
   * of decay^k, which is that geometric falloff. At 0.55 the widest of four mips
   * contributes a sixth of what it used to while the tight core glow around
   * genuine highlights is untouched.
   */
  bloomMipDecay = 0.55;

  /** Sun state, set by the sky/lighting system each frame. */
  readonly sunDirection = new THREE.Vector3(0.4, 0.55, 0.3).normalize();
  readonly sunColor = new THREE.Color(1, 0.94, 0.82);
  sunIntensity = 3.4;

  /**
   * Beam-to-ambient response ratio of a surface facing the sun squarely, as
   * solved by the lighting meter. Used to decide how much of a pixel's light
   * ambient occlusion is entitled to remove.
   */
  sunOverAmbient = 4;

  /**
   * Volumetric medium. Density is extinction per metre: 0.006 gives roughly
   * 50% transmittance at 115 m, which reads as clear desert air with visible
   * aerial perspective on the far side of the map rather than as fog.
   */
  fogDensity = 0.0018;
  fogHeightFalloff = 0.035;
  fogBaseHeight = 0;
  /** Distance over which the haze medium fades in from the lens, in metres. */
  fogNearRamp = 34;
  readonly fogAlbedo = new THREE.Color(0.97, 0.97, 0.98);
  fogAnisotropy = 0.74;
  volumetricStrength = 1;

  /**
   * Sky radiance near the horizon and overhead, in scene-referred linear.
   * Aerial perspective converges on these, so distant geometry blends into the
   * sky behind it rather than sitting in front of a grey veil.
   */
  readonly hazeLow = new THREE.Color(0.30, 0.30, 0.30);
  readonly hazeHigh = new THREE.Color(0.20, 0.24, 0.34);

  /** Shadow cascades supplied by the lighting system for volumetric marching. */
  shadowCascades: Array<{ map: THREE.Texture | null; matrix: THREE.Matrix4; split: number }> = [];

  /**
   * Reads back the mean colour of a render target. Diagnostic only — a
   * synchronous readback stalls the pipeline, so this is never called on a
   * normal frame.
   */
  /** Points a pass's cascade uniforms at the first two shadow maps. */
  private bindCascades(u: Record<string, THREE.IUniform>): void {
    const c0 = this.shadowCascades[0];
    const c1 = this.shadowCascades[1];
    u.uCascadeCount.value = Math.min(2, this.shadowCascades.length);
    u.tShadow0.value = c0?.map ?? null;
    u.tShadow1.value = c1?.map ?? null;
    if (c0) (u.uShadowMatrix0.value as THREE.Matrix4).copy(c0.matrix);
    if (c1) (u.uShadowMatrix1.value as THREE.Matrix4).copy(c1.matrix);
    u.uCascadeSplit0.value = c0?.split ?? 30;
    u.uCascadeSplit1.value = c1?.split ?? 90;
  }

  probe(name: string): {
    r: number; g: number; b: number; max: number; pct: number[];
  } | null {
    const targets: Record<string, THREE.WebGLRenderTarget | undefined> = {
      sceneA: this.rtSceneA,
      sceneB: this.rtSceneB,
      normal: this.rtNormal,
      ao: this.rtAO,
      volumetric: this.rtVolumetric,
      history: this.rtHistory,
      ldr: this.rtLdr,
      bloom0: this.bloomMips[0],
      lum: this.rtLum,
      // Holds this frame's adapted log-luminance: the pair is swapped after the
      // resolve, so the *previous* target is the current result.
      adapt: this.rtAdaptPrev,
    };
    const rt = targets[name];
    if (!rt) return null;

    const w = rt.width;
    const h = rt.height;
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
    const lums = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const rr = decode(buf[i * 4]);
      const gg = decode(buf[i * 4 + 1]);
      const bb = decode(buf[i * 4 + 2]);
      r += rr; g += gg; b += bb;
      max = Math.max(max, rr, gg, bb);
      lums[i] = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    }
    lums.sort();
    const at = (q: number): number => lums[Math.min(n - 1, Math.floor(q * n))];
    return {
      r: r / n,
      g: g / n,
      b: b / n,
      max,
      pct: [at(0.05), at(0.25), at(0.5), at(0.75), at(0.95), at(0.99), at(0.999)],
    };
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

  /**
   * Uniforms of the shared exposure resolve, which both the composite and the
   * bloom prefilter include. Kept in one place so the two passes cannot drift
   * apart and start disagreeing about what "bright" means.
   */
  private exposureUniforms(): Record<string, THREE.IUniform> {
    return {
      tExposure: { value: null },
      uAutoKey: { value: this.autoKey },
      uAutoMin: { value: this.autoTrimMin },
      uAutoMax: { value: this.autoTrimMax },
      uAutoMaxOpen: { value: this.autoTrimMaxOpen },
    };
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
        // Deliberately crease-scale rather than room-scale.
        //
        // Widening the search to room scale is the obvious way to make an
        // interior read as enclosed, and it does not work: the occluder a room
        // needs is the sky, which is never in the screen-space neighbourhood of
        // the pixel it occludes. Measured across a courtyard and a street, an
        // eighteen-metre radius changed neither frame except to halo every
        // silhouette. What a wide radius does do is return a lower visibility
        // over broad open surfaces as well as in creases, so it acts as a global
        // dimmer that the auto-exposure immediately undoes — the darkening is
        // spent everywhere instead of where two surfaces meet, which is the only
        // place the eye reads it as contact. Enclosure is handled by shifting
        // ambient into the sky probe instead, where the up/down directionality
        // does the work.
        uRadius: { value: 2.4 },
        uContactRadius: { value: 0.42 },
        uIntensity: { value: 1.25 },
        uBias: { value: 0.04 },
        uThickness: { value: 0.26 },
        uMaxScreenRadius: { value: 0.17 },
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
      tNormal: { value: null },
      uBounceTint: { value: new THREE.Vector3(1.05, 0.985, 0.925) },
      // Tuned against occlusion that is now gated on the sun's actual
      // visibility rather than on N.L. Under the old test, anything facing
      // sunward kept three quarters of its light regardless of whether a beam
      // reached it, so the strength had to be near 1 for occlusion to register
      // anywhere; with the gate correct, that same setting applies full
      // occlusion across every cast shadow in the frame and buries a fifth of a
      // street scene in black. The signal is in the right places now, so it
      // needs far less gain, and the floor is high enough that a cavity reads as
      // dark rather than as a hole.
      uStrength: { value: 0.78 },
      uContactStrength: { value: 0.90 },
      uFloor: { value: 0.24 },
      uSunViewDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunOverAmbient: { value: 4 },
      tDepth: { value: null },
      uInverseViewProjection: { value: new THREE.Matrix4() },
      uViewMatrix: { value: new THREE.Matrix4() },
      uCascadeCount: { value: 0 },
      tShadow0: { value: null },
      tShadow1: { value: null },
      uShadowMatrix0: { value: new THREE.Matrix4() },
      uShadowMatrix1: { value: new THREE.Matrix4() },
      uCascadeSplit0: { value: 30 },
      uCascadeSplit1: { value: 90 },
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
        uFogAlbedo: { value: new THREE.Vector3(0.97, 0.97, 0.98) },
        uHazeLow: { value: new THREE.Vector3(0.30, 0.30, 0.30) },
        uHazeHigh: { value: new THREE.Vector3(0.20, 0.24, 0.34) },
        uAnisotropy: { value: 0.7 },
        uBeamGain: { value: 0.42 },
        uMaxDistance: { value: 320 },
        uFogNearRamp: { value: 34 },
        uNoiseStrength: { value: 0.16 },
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
      // A deep history is only free when the camera is still. Once it drifts,
      // every frame costs a bicubic resample, and a window this deep applies
      // that filter often enough to widen a one-pixel railing into a grey band.
      // Measured on the rooftop, dropping the ceiling from 0.965 to 0.88 and
      // rejecting motion an order of magnitude harder took the frame's acutance
      // from 41 to 45 and brought back the block courses and ladder rails that
      // the deeper window had erased. The stochastic passes still resolve: they
      // are blue-noise ordered and spatially filtered before they get here, so
      // eight frames is enough.
      uFeedbackMin: { value: 0.72 },
      uFeedbackMax: { value: 0.88 },
      uVarianceGamma: { value: 0.85 },
      uMotionReject: { value: 0.22 },
      uReset: { value: 1 },
    });

    this.lumReducePass = makePass(LUM_REDUCE_FRAG, {
      tScene: { value: null },
      tDepth: { value: null },
      uTile: { value: zero2() },
      uSkyWeight: { value: 0.22 },
    });

    this.lumResolvePass = makePass(
      LUM_RESOLVE_FRAG,
      {
        tLum: { value: null },
        tPrev: { value: null },
        uLumSize: { value: new THREE.Vector2(LUM_W, LUM_H) },
        uRate: { value: 0.2 },
        uReset: { value: 1 },
      },
      { LUM_W, LUM_H },
    );

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
      uExposure: { value: 1 },
      ...this.exposureUniforms(),
      // Post-exposure, so this is in the same units as the displayed image: a
      // correctly-exposed sunlit wall lands near 0.8, so only the sun itself,
      // its aureole, specular hits and emissives cross this.
      //
      // Held well above 1 because area matters as much as intensity here. Open
      // sky metered against a shadowed street sits one to three stops over
      // white, and it fills a third of the frame — thresholding low enough to
      // include it turns the sky into an area light aimed at the lens, which is
      // veiling glare rather than bloom no matter how the chain is weighted.
      uThreshold: { value: 2.2 },
      uSoftKnee: { value: 0.7 },
      // The clamp is what bounds veiling glare, and it has to be tight because
      // the sun's disc is four orders of magnitude over the threshold. At 60 the
      // disc alone, spread across the widest mip and multiplied by the bloom and
      // dirt gains, added 0.05 of display-referred grey to every shadow in the
      // frame — which read as a haze layer over the whole left side of a street
      // whenever the sun was near the edge of frame. Emissives still bloom hard;
      // three stops over white is plenty of glow.
      uClamp: { value: 12 },
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
      ...this.exposureUniforms(),
      uBloomStrength: { value: 0.095 },
      uDirtStrength: { value: 0.13 },
      // Offsets are in UV units scaled by r^2, and the red and blue taps move in
      // opposite directions, so the visible separation is twice the offset: at a
      // corner that is 2 * 0.354 * amount of frame width. The previous 0.0065
      // therefore put seven pixels of colour fringing into the corners of a
      // 1600-wide frame rather than the couple of pixels intended, which is what
      // was outlining every high-contrast edge near the frame border in cyan and
      // orange. This lands it back at about a pixel and a half.
      uChromatic: { value: 0.0012 },
      uDistortion: { value: 0.012 },
      uVignette: { value: 0.34 },
      uVignetteRoundness: { value: 0.5 },
      uGrain: { value: 0.022 },
      uGrainSize: { value: 1.25 },
      uSharpen: { value: 1.5 },
      uDither: { value: 1 / 255 },
      uContrast: { value: this.grade.contrast },
      uSaturation: { value: this.grade.saturation },
      uLift: { value: this.grade.lift },
      uGamma: { value: this.grade.gamma },
      uGain: { value: this.grade.gain },
      uShadowTint: { value: this.grade.shadowTint },
      uHighlightTint: { value: this.grade.highlightTint },
      uSplitBalance: { value: this.grade.splitBalance },
      uLookContrast: { value: this.grade.lookContrast },
      uLookShoulder: { value: this.grade.lookShoulder },
      uToeKnee: { value: this.grade.toeKnee },
      uToeSlope: { value: this.grade.toeSlope },
      uLookSlope: { value: this.grade.lookSlope },
      uLookPower: { value: this.grade.lookPower },
      uLookSat: { value: this.grade.lookSat },
      uHighlightDesat: { value: 0.62 },
      uShadowDesat: { value: 0.42 },
      uToe: { value: 0.30 },
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

    // Metering. Nearest on the 1x1 adaptation targets: they are sampled at the
    // exact centre and bilinear on a one-texel texture is a wasted filter.
    this.rtLum = this.makeRT(LUM_W, LUM_H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    const adaptOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.rtAdapt = this.makeRT(1, 1, adaptOpts);
    this.rtAdaptPrev = this.makeRT(1, 1, adaptOpts);
    this.adaptValid = false;

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

    // SMAA only runs when TAA is off. Sixteen jittered samples already resolve
    // every edge SMAA would find, so stacking them buys nothing and costs real
    // resolution: SMAA's blend pass is a subpixel-weighted average, and averaging
    // an already-converged image is just a blur. Keeping both is a large part of
    // why the frame reads soft.
    if (QUALITY.tier !== 'low' && !QUALITY.taa) {
      this.smaaPass?.dispose?.();
      this.smaaPass = new SMAAPass();
      this.smaaPass.setSize(w, h);
    } else if (QUALITY.taa && this.smaaPass) {
      this.smaaPass.dispose?.();
      this.smaaPass = null;
    }

    this.historyValid = false;
  }

  private disposeTargets(): void {
    const targets = [
      this.rtSceneA, this.rtSceneB, this.rtSceneC, this.rtNormal, this.rtAO, this.rtAOBlur,
      this.rtVolumetric, this.rtCoC, this.rtHistory, this.rtHistoryPrev, this.rtLdr,
      this.rtLum, this.rtAdapt, this.rtAdaptPrev,
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
      au.tNormal.value = this.rtNormal.texture;
      // The normal prepass writes view-space normals, so the sun has to be
      // rotated into the same basis rather than compared in world space.
      (au.uSunViewDir.value as THREE.Vector3)
        .copy(this.sunDirection)
        .transformDirection(camera.matrixWorldInverse);
      au.uSunOverAmbient.value = this.sunOverAmbient;
      au.tDepth.value = this.depthTexture;
      (au.uInverseViewProjection.value as THREE.Matrix4).copy(this.inverseViewProjection);
      (au.uViewMatrix.value as THREE.Matrix4).copy(camera.matrixWorldInverse);
      this.bindCascades(au);
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
      u.uFogNearRamp.value = this.fogNearRamp;
      (u.uFogAlbedo.value as THREE.Vector3).set(this.fogAlbedo.r, this.fogAlbedo.g, this.fogAlbedo.b);
      (u.uHazeLow.value as THREE.Vector3).set(this.hazeLow.r, this.hazeLow.g, this.hazeLow.b);
      (u.uHazeHigh.value as THREE.Vector3).set(this.hazeHigh.r, this.hazeHigh.g, this.hazeHigh.b);
      u.uAnisotropy.value = this.fogAnisotropy;
      u.uSmokeCount.value = this.smokeCount;

      this.bindCascades(u);

      this.volumetricPass.render(renderer, this.rtVolumetric);

      const cu = this.volCompositePass.uniforms;
      cu.tScene.value = src.texture;
      cu.tVolumetric.value = this.rtVolumetric.texture;
      cu.tDepth.value = this.depthTexture;
      (cu.uTexel.value as THREE.Vector2).set(
        1 / this.rtVolumetric.width,
        1 / this.rtVolumetric.height,
      );
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

    // ---- 8. metering -----------------------------------------------------
    // Deliberately ahead of the view-model overlay: the weapon occupies a large,
    // brightly-lit, centre-weighted slab of the frame and it never changes, so
    // metering it would just clamp the adaptation range for no benefit.
    {
      const lu = this.lumReducePass.uniforms;
      lu.tScene.value = src.texture;
      lu.tDepth.value = this.depthTexture;
      (lu.uTile.value as THREE.Vector2).set(1 / LUM_W, 1 / LUM_H);
      this.lumReducePass.render(renderer, this.rtLum);

      const ru = this.lumResolvePass.uniforms;
      ru.tLum.value = this.rtLum.texture;
      ru.tPrev.value = this.rtAdaptPrev.texture;
      ru.uRate.value = 1 - Math.exp(-Math.max(dt, 1e-4) * this.autoAdaptSpeed);
      ru.uReset.value = this.adaptValid ? 0 : 1;
      this.lumResolvePass.render(renderer, this.rtAdapt);

      const t = this.rtAdapt;
      this.rtAdapt = this.rtAdaptPrev;
      this.rtAdaptPrev = t;
      this.adaptValid = true;
    }

    // ---- 9. view model overlay ------------------------------------------
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

    // ---- 10. bloom -------------------------------------------------------
    let bloomTexture: THREE.Texture | null = null;
    if (QUALITY.bloom && this.bloomMips.length >= 2) {
      const pf = this.bloomPrefilterPass.uniforms;
      pf.tScene.value = src.texture;
      (pf.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
      pf.uExposure.value = this.exposureBase();
      this.applyExposureUniforms(pf);
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
        uu.uBlend.value = this.bloomMipDecay;
        // The upsample reads `to` and accumulates into it, so it has to bounce
        // through a same-size scratch target.
        this.bloomUpPass.render(renderer, scratch);
        this.copyPass.uniforms.tSource.value = scratch.texture;
        this.copyPass.render(renderer, to);
      }
      bloomTexture = this.bloomMips[0].texture;
    }

    // ---- 11. composite ---------------------------------------------------
    this.updateExposure(dt);

    const cu = this.compositePass.uniforms;
    cu.tScene.value = src.texture;
    cu.tBloom.value = bloomTexture ?? this.blueNoise;
    cu.uBloomStrength.value = bloomTexture ? 0.075 : 0;
    (cu.uResolution.value as THREE.Vector2).set(this.rtW, this.rtH);
    (cu.uTexel.value as THREE.Vector2).set(1 / this.rtW, 1 / this.rtH);
    cu.uTime.value = this.engine.time.elapsed;
    cu.uExposure.value = this.exposureBase();
    this.applyExposureUniforms(cu);
    cu.uContrast.value = this.grade.contrast;
    cu.uSaturation.value = this.grade.saturation;
    (cu.uLift.value as THREE.Vector3).copy(this.grade.lift);
    (cu.uGamma.value as THREE.Vector3).copy(this.grade.gamma);
    (cu.uGain.value as THREE.Vector3).copy(this.grade.gain);
    (cu.uShadowTint.value as THREE.Vector3).copy(this.grade.shadowTint);
    (cu.uHighlightTint.value as THREE.Vector3).copy(this.grade.highlightTint);
    cu.uSplitBalance.value = this.grade.splitBalance;
    cu.uLookContrast.value = this.grade.lookContrast;
    cu.uLookShoulder.value = this.grade.lookShoulder;
    cu.uToeKnee.value = this.grade.toeKnee;
    cu.uToeSlope.value = this.grade.toeSlope;
    (cu.uLookSlope.value as THREE.Vector3).copy(this.grade.lookSlope);
    (cu.uLookPower.value as THREE.Vector3).copy(this.grade.lookPower);
    cu.uLookSat.value = this.grade.lookSat;
    cu.uDamageFlash.value = this.damageFlash;
    (cu.uDamageDir.value as THREE.Vector3).copy(this.damageDir);
    cu.uSuppression.value = this.suppression;
    cu.uConcussion.value = this.concussion;
    cu.uFadeToBlack.value = this.fadeLevel;
    cu.uChromatic.value = QUALITY.chromaticAberration ? 0.0012 : 0;
    cu.uGrain.value = QUALITY.filmGrain ? 0.022 : 0;
    cu.uDirtStrength.value = QUALITY.lensDirt ? 0.06 : 0;

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

  /**
   * Scene-referred exposure before the frame-measured trim.
   *
   * `fadeToBlack` belongs in here rather than at the end of the composite: a
   * fade is the iris closing, and a meter reads the frame that will actually be
   * shown. Keeping it out of the metered value is what let a half-finished fade
   * silently cap the frame's white point.
   */
  private exposureBase(): number {
    return this.exposureCurrent * this.grade.exposure * Math.max(this.fadeLevel, 1e-4);
  }

  /**
   * The fade the frame should actually be shown at.
   *
   * The capture harness asks for a fully open iris, but the menu holds the
   * frame at a third of a stop while it is not in the playing state and rewrites
   * `fadeToBlack` every tick, so an unqualified read would evaluate every
   * reference capture a stop and a half under where gameplay sits.
   */
  private get fadeLevel(): number {
    return SHOT_MODE ? 1 : this.fadeToBlack;
  }

  /** Points a pass at the current adaptation target and the trim bounds. */
  private applyExposureUniforms(u: Record<string, THREE.IUniform>): void {
    // rtAdaptPrev holds this frame's result: the pair was swapped after writing.
    u.tExposure.value = this.rtAdaptPrev.texture;
    u.uAutoKey.value = this.autoKey;
    u.uAutoMin.value = this.autoTrimMin;
    u.uAutoMax.value = this.autoTrimMax;
    u.uAutoMaxOpen.value = this.autoTrimMaxOpen;
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
    this.adaptValid = false;
  }

  dispose(): void {
    this.disposeTargets();
    this.gtaoPass.dispose();
    this.aoBlurPass.dispose();
    this.aoApplyPass.dispose();
    this.volumetricPass.dispose();
    this.volCompositePass.dispose();
    this.taaPass.dispose();
    this.lumReducePass.dispose();
    this.lumResolvePass.dispose();
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
