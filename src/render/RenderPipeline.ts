import * as THREE from 'three';
import { Layers, type GameContext, type System } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import type { IRenderPipeline, ISky, IWeapons } from '../core/Interfaces';
import { Composer } from './passes/Composer';
import { GBufferPass } from './passes/GBufferPass';
import { BloomPass } from './passes/BloomPass';
import { AutoExposure } from './passes/AutoExposure';
import { GTAOPass } from './passes/GTAOPass';
import { SSRPass } from './passes/SSRPass';
import { VolumetricPass } from './passes/VolumetricPass';
import { TAAPass } from './passes/TAAPass';
import { MotionBlurPass } from './passes/MotionBlurPass';
import { DepthOfFieldPass } from './passes/DepthOfFieldPass';
import { ViewmodelPass } from './passes/ViewmodelPass';
import { SunLighting } from './passes/SunLighting';
import { LutLibrary, whiteBalanceGains, type LutName } from './passes/LutLibrary';
import { createLensDirt } from './passes/LensTextures';
import { GRADE_FRAG } from '../shaders/post/grade.glsl';
import { BLIT_FRAG, DLAA_FRAG, FINAL_FRAG, FXAA_FRAG } from '../shaders/post/final.glsl';
import { DEBUG_FRAG, DEBUG_MODES, type DebugMode } from '../shaders/post/debug.glsl';

/** Grade knobs, all in the AgX log domain unless stated otherwise. */
interface GradeSettings {
  /** -1 cool .. +1 warm. */
  temperature: number;
  /** -1 green .. +1 magenta. */
  tint: number;
  exposureCompensation: number;
  contrast: number;
  saturation: number;
  lift: THREE.Vector3;
  gain: THREE.Vector3;
  gamma: THREE.Vector3;
  shadowTint: THREE.Vector3;
  midTint: THREE.Vector3;
  highTint: THREE.Vector3;
  lut: LutName;
  lutAmount: number;
}

interface Shake {
  amplitude: number;
  duration: number;
  frequency: number;
  elapsed: number;
  distanceScale: number;
}

const ZERO = new THREE.Vector3(0, 0, 0);
const ONE = new THREE.Vector3(1, 1, 1);

const scratchVec3 = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const scratchEuler = new THREE.Euler();
const scratchProjection = new THREE.Matrix4();

/**
 * HDR post-processing pipeline.
 *
 * The renderer stays linear (`NoToneMapping`, no per-material tone mapping) and
 * this owns the entire display transform. Frame order:
 *
 *  1. depth / world-normal / motion-vector prepass (full res, MRT) + min-max
 *     depth hierarchy (1/2, 1/4, 1/8)
 *  2. shaded opaque pass into a half-float HDR target
 *  3. screen-space lighting at half res, each composited back with a blend so
 *     the scene target is never round-tripped: GTAO (multiply), SSR (add),
 *     volumetrics (add + extinction)
 *  4. late transparents and particles, after the fog so smoke composites into it
 *  5. temporal resolve
 *  6. motion blur, then depth of field
 *  7. viewmodel pass with its own DOF, composited in
 *  8. bloom pyramid, metering, tone map + grade + lens artefacts
 *  9. optional non-temporal AA, then sharpen + grain + dither + sRGB encode
 *
 * Tone mapping happens exactly once, in step 8, on scene-referred radiance.
 */
export default class RenderPipeline implements System, IRenderPipeline {
  readonly key = 'render';
  readonly order = 1000;

  /* ------------------------- public grade state ------------------------- */

  readonly grade: GradeSettings = {
    temperature: 0.16,
    tint: -0.02,
    exposureCompensation: 0.15,
    contrast: 1.04,
    saturation: 1.02,
    lift: new THREE.Vector3(0.004, 0.004, 0.009),
    gain: new THREE.Vector3(1.0, 0.996, 0.98),
    gamma: new THREE.Vector3(1, 1, 1),
    shadowTint: new THREE.Vector3(-0.01, 0.0, 0.015),
    midTint: new THREE.Vector3(0.003, 0.0, -0.003),
    highTint: new THREE.Vector3(0.012, 0.004, -0.014),
    lut: 'desert',
    lutAmount: 0.8,
  };

  bloomStrength = 0.05;
  streakStrength = 0.012;
  flareStrength = 0.012;
  halationStrength = 0.045;
  dirtStrength = 0.3;
  vignetteStrength = 0.55;
  chromaticStrength = 0.35;
  /** Peak grain excursion in sRGB-encoded units; 0.03 is about +/-4 of 255. */
  grainStrength = 0.03;
  sharpenStrength = 0.45;

  /* ----------------------------- internals ------------------------------ */

  private composer!: Composer;
  private gbuffer!: GBufferPass;
  private bloom!: BloomPass;
  private exposure!: AutoExposure;
  private gtao!: GTAOPass;
  private ssr!: SSRPass;
  private volumetric!: VolumetricPass;
  private taa!: TAAPass;
  private motionBlur!: MotionBlurPass;
  private dof!: DepthOfFieldPass;
  private viewmodel!: ViewmodelPass;
  private sun = new SunLighting();
  private luts = new LutLibrary();
  private dirtTexture: THREE.Texture | null = null;

  private sceneHDR!: THREE.WebGLRenderTarget;
  private sceneDepth: THREE.DepthTexture | null = null;
  private ping!: THREE.WebGLRenderTarget;
  private pong!: THREE.WebGLRenderTarget;
  private gradeOut!: THREE.WebGLRenderTarget;
  private aaOut!: THREE.WebGLRenderTarget;

  private gradeMaterial!: THREE.ShaderMaterial;
  private finalMaterial!: THREE.ShaderMaterial;
  private blitMaterial!: THREE.ShaderMaterial;
  private fxaaMaterial!: THREE.ShaderMaterial;
  private dlaaMaterial!: THREE.ShaderMaterial;
  private debugMaterial!: THREE.ShaderMaterial;

  private width = 1;
  private height = 1;
  private ready = false;
  private quality!: QualitySettings;
  private needsGBuffer = true;

  private debugMode: DebugMode = 'off';
  private debugIndex = 0;
  private probePending = false;

  /**
   * Frames this pipeline has drawn, and seconds it has been drawing for.
   *
   * Deliberately not `ctx.clock.frame`: the capture harness drives frames
   * through `Engine.step` directly, which does not advance the clock, and every
   * temporal effect here — jitter, dithered sampling, history feedback,
   * adaptation — needs a counter that moves whenever a frame is actually
   * rendered or it converges to a single sample and the noise never averages out.
   */
  private frameIndex = 0;
  private elapsed = 0;

  // Runtime effect state driven through IRenderPipeline.
  private exposureOverride: number | null = null;
  private radialBlur = 0;
  private damageVignette = 0;
  private heatHaze = 0;
  private flashColor = new THREE.Color(1, 1, 1);
  private flashIntensity = 0;
  private flashPeak = 0;
  private flashDecay = 0;
  private flashTimer = 0;

  private shakes: Shake[] = [];
  private shakeOffset = new THREE.Vector3();
  private shakeRotation = new THREE.Euler();
  private shakeSeed = Math.random() * 1000;
  private cameraHasOwner = false;
  private savedCameraPos = new THREE.Vector3();
  private savedCameraQuat = new THREE.Quaternion();

  private unsubscribe: Array<() => void> = [];
  private whiteBalance = new THREE.Vector3(1, 1, 1);
  private sky: ISky | undefined;
  private weapons: IWeapons | undefined;
  private ctx: GameContext | null = null;
  private nearFar = new THREE.Vector2(0.05, 1000);
  private offscreen: THREE.WebGLRenderTarget | null = null;

  /* ------------------------------ lifecycle ----------------------------- */

  init(ctx: GameContext): void {
    ctx.renderer.autoClear = false;
    this.ctx = ctx;
    this.quality = ctx.quality;
    this.nearFar.set(ctx.camera.near, ctx.camera.far);

    this.composer = new Composer(ctx.renderer);
    this.gbuffer = new GBufferPass(this.composer, ctx);
    this.exposure = new AutoExposure(this.composer);
    this.bloom = new BloomPass(this.composer, this.exposure.texture);
    this.gtao = new GTAOPass(this.composer);
    this.ssr = new SSRPass(this.composer);
    this.volumetric = new VolumetricPass(this.composer);
    this.taa = new TAAPass(this.composer);
    this.motionBlur = new MotionBlurPass(this.composer);
    this.dof = new DepthOfFieldPass(this.composer);
    this.viewmodel = new ViewmodelPass(this.composer);
    this.dirtTexture = createLensDirt(256);

    this.buildMaterials();
    this.configureQuality(ctx.quality);

    this.unsubscribe.push(
      ctx.events.on('debug:toggle', (which) => {
        if (which !== 'post') return;
        this.cycleDebug();
      }),
    );
    this.unsubscribe.push(
      ctx.events.on('camera:shake', (evt) => {
        let distanceScale = 1;
        if (evt.position) {
          const radius = evt.radius ?? 24;
          const d = evt.position.distanceTo(ctx.camera.position);
          distanceScale = Math.max(0, 1 - d / radius);
          if (distanceScale <= 0) return;
        }
        this.shakes.push({
          amplitude: evt.amplitude,
          duration: Math.max(0.05, evt.duration),
          frequency: evt.frequency ?? 22,
          elapsed: 0,
          distanceScale,
        });
        if (this.shakes.length > 8) this.shakes.shift();
      }),
    );
    this.unsubscribe.push(
      ctx.events.on('fx:flashbang', (evt) => {
        // A flashbang at the far end of the street should not white out the
        // screen; 8 m is roughly where one stops blinding you.
        const distance = evt.position ? evt.position.distanceTo(ctx.camera.position) : 0;
        const falloff = Math.max(0.08, 1 - distance / 14);
        this.flash(0xfff6e8, falloff, 0.6 + 2.4 * falloff);
      }),
    );

    this.sky = ctx.tryGet<ISky>('sky');
    this.weapons = ctx.tryGet<IWeapons>('weapons');
    this.ready = true;
  }

  private buildMaterials(): void {
    const c = this.composer;
    const nearFar = this.nearFar;

    this.gradeMaterial = c.material(GRADE_FRAG, {
      uColor: { value: null },
      uBloom: { value: null },
      uStreak: { value: null },
      uFlare: { value: null },
      uDirt: { value: this.dirtTexture },
      uExposure: { value: this.exposure.texture },
      uDepth: { value: null },
      uResolution: { value: new THREE.Vector2() },
      uTexel: { value: new THREE.Vector2() },
      uNearFar: { value: nearFar },
      uTime: { value: 0 },
      uFrame: { value: 0 },
      uExposureOverride: { value: -1 },
      uExposureComp: { value: 0 },
      uChromatic: { value: 0 },
      uVignette: { value: 0 },
      uRadialBlur: { value: 0 },
      uHeatHaze: { value: 0 },
      uBloomStrength: { value: 0 },
      uStreakStrength: { value: 0 },
      uDirtStrength: { value: 0 },
      uFlareStrength: { value: 0 },
      uHalation: { value: 0 },
      uFlashColor: { value: new THREE.Vector3(1, 1, 1) },
      uFlashAmount: { value: 0 },
      uDamage: { value: 0 },
      uDamageColor: { value: new THREE.Vector3(0.62, 0.05, 0.03) },
      uWhiteBalance: { value: this.whiteBalance },
      uLift: { value: new THREE.Vector3() },
      uGain: { value: new THREE.Vector3(1, 1, 1) },
      uGammaInv: { value: new THREE.Vector3(1, 1, 1) },
      uShadowTint: { value: new THREE.Vector3() },
      uMidTint: { value: new THREE.Vector3() },
      uHighTint: { value: new THREE.Vector3() },
      uContrast: { value: 1 },
      uSaturation: { value: 1 },
      uLutAmount: { value: 0 },
      uLutSize: { value: this.luts.size },
      uLut: { value: this.luts.identity },
    });

    this.finalMaterial = c.material(FINAL_FRAG, {
      uColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uResolution: { value: new THREE.Vector2() },
      uSharpness: { value: 0 },
      uGrain: { value: 0 },
      uGrainSize: { value: 1.4 },
      uFrame: { value: 0 },
      uDither: { value: 1 },
    });

    this.blitMaterial = c.material(BLIT_FRAG, {
      uColor: { value: null },
      uScale: { value: 1 },
    });

    this.fxaaMaterial = c.material(FXAA_FRAG, {
      uColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });
    this.dlaaMaterial = c.material(DLAA_FRAG, {
      uColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    this.debugMaterial = c.material(DEBUG_FRAG, {
      uDepth: { value: null },
      uNormal: { value: null },
      uVelocity: { value: null },
      uAO: { value: null },
      uSSR: { value: null },
      uVolumetrics: { value: null },
      uBloom: { value: null },
      uStreak: { value: null },
      uFlare: { value: null },
      uHDR: { value: null },
      uCoC: { value: null },
      uExposureTex: { value: null },
      uLuminance: { value: null },
      uNearFar: { value: nearFar },
      uResolution: { value: new THREE.Vector2() },
      uMode: { value: 0 },
      uExposure: { value: 1 },
    });
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    this.quality = quality;
    this.configureQuality(quality);
    if (this.ready) this.resize(this.width, this.height, ctx);
  }

  private configureQuality(q: QualitySettings): void {
    this.bloom.configure(q);
    this.gtao.configure(q);
    this.ssr.configure(q);
    this.volumetric.configure(q);
    this.taa.configure(q);
    this.motionBlur.configure(q);
    this.dof.configure(q);

    // The prepass only earns its keep if something consumes it.
    this.needsGBuffer =
      q.antialias === 'taa' ||
      q.ssao ||
      q.ssr ||
      q.motionBlur ||
      q.depthOfField ||
      q.volumetricLighting ||
      q.volumetricFog;

    this.gbuffer.setSampleCount(q.preset === 'cinematic' ? 16 : 8);
    this.gbuffer.setJitterScale(q.antialias === 'taa' ? 1 : 0);
  }

  resize(width: number, height: number, ctx: GameContext): void {
    if (!this.ready) return;
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    const w = this.width;
    const h = this.height;
    const c = this.composer;

    c.destroyTarget(this.sceneHDR);
    c.destroyTarget(this.ping);
    c.destroyTarget(this.pong);
    c.destroyTarget(this.gradeOut);
    c.destroyTarget(this.aaOut);

    const q = this.quality;
    const samples = q.antialias === 'msaa' ? Math.min(q.msaaSamples, c.caps.maxSamples) : 0;

    // Depth is sampled from the prepass, so the shaded pass only needs a plain
    // depth attachment. Sharing the prepass depth texture with a target that is
    // also being sampled would be a framebuffer feedback loop; keeping them
    // separate costs one depth buffer and removes the whole class of problem.
    this.sceneDepth = this.needsGBuffer ? null : c.createDepthTexture(w, h);
    this.sceneHDR = c.createTarget(w, h, {
      depthBuffer: true,
      depthTexture: this.sceneDepth,
      samples,
    });
    this.ping = c.createTarget(w, h);
    this.pong = c.createTarget(w, h);
    // Display-referred from here on, but still half float: CAS and grain want
    // headroom, and an 8-bit intermediate would band in the shadows.
    this.gradeOut = c.createTarget(w, h);
    this.aaOut = c.createTarget(w, h);

    this.gbuffer.resize(w, h, ctx);
    this.bloom.resize(w, h);
    this.gtao.resize(w, h);
    this.ssr.resize(w, h);
    this.volumetric.resize(w, h);
    this.taa.resize(w, h);
    this.motionBlur.resize(w, h);
    this.dof.resize(w, h);
    this.viewmodel.resize(w, h, c.caps.maxSamples);
    this.nearFar.set(ctx.camera.near, ctx.camera.far);

    (this.gradeMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);
    (this.gradeMaterial.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    (this.finalMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);
    (this.finalMaterial.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    (this.fxaaMaterial.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    (this.dlaaMaterial.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
    (this.debugMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);

    this.resetHistory();
  }

  private resetHistory(): void {
    this.gbuffer.resetHistory();
    this.exposure.reset();
    this.bloom.clear();
    this.gtao.resetHistory();
    this.ssr.resetHistory();
    this.volumetric.resetHistory();
    this.taa.resetHistory();
  }

  /* -------------------------------- frame ------------------------------- */

  update(dt: number, ctx: GameContext): void {
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      // Superlinear falloff: a flashbang recovers slowly at first, then fast.
      this.flashIntensity =
        this.flashDecay > 0 ? this.flashPeak * Math.pow(this.flashTimer / this.flashDecay, 1.6) : 0;
    } else {
      this.flashIntensity = 0;
    }
    this.cameraHasOwner = ctx.tryGet('player') !== undefined;
    this.updateShake(dt);
  }

  private updateShake(dt: number): void {
    this.shakeOffset.set(0, 0, 0);
    this.shakeRotation.set(0, 0, 0);
    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const s = this.shakes[i];
      s.elapsed += dt;
      if (s.elapsed >= s.duration) {
        this.shakes.splice(i, 1);
        continue;
      }
      const t = s.elapsed / s.duration;
      // Cubic decay reads as an impact rather than a fade.
      const decay = (1 - t) * (1 - t) * (1 - t);
      const amp = s.amplitude * s.distanceScale * decay;
      const phase = s.elapsed * s.frequency;
      this.shakeOffset.x += Math.sin(phase * 1.13 + this.shakeSeed) * amp;
      this.shakeOffset.y += Math.sin(phase * 1.71 + this.shakeSeed * 1.7) * amp;
      this.shakeOffset.z += Math.sin(phase * 0.93 + this.shakeSeed * 2.3) * amp * 0.4;
      this.shakeRotation.z += Math.sin(phase * 1.31 + this.shakeSeed * 3.1) * amp * 0.35;
      this.shakeRotation.x += Math.sin(phase * 1.53 + this.shakeSeed * 0.7) * amp * 0.2;
    }
  }

  render(dt: number, ctx: GameContext): void {
    if (!this.ready) return;
    const r = ctx.renderer;
    const camera = ctx.camera;
    const c = this.composer;
    const q = this.quality;
    const frame = this.frameIndex++;
    this.elapsed += dt;

    this.sun.update(ctx, dt, frame);
    this.applyShake(camera);
    scratchProjection.copy(camera.projectionMatrix);

    /* ------------------------------ prepass ----------------------------- */

    if (this.needsGBuffer) {
      this.gbuffer.applyJitter(camera);
      c.beginTimer('prepass');
      this.gbuffer.render(ctx, scratchProjection, frame);
      c.endTimer();
    }

    c.beginTimer('opaque');
    this.renderWorld(ctx);
    c.endTimer();

    const depthTexture = this.needsGBuffer ? this.gbuffer.depth : this.sceneDepth;
    const normalTexture = this.gbuffer.normalTexture;
    const velocityTexture = this.gbuffer.velocityTexture;

    /* ------------------------ screen-space lighting --------------------- */

    if (this.needsGBuffer && depthTexture) {
      const hiz = this.gbuffer.hizHalf;

      if (q.ssao) {
        c.beginTimer('gtao');
        this.gtao.render(camera, hiz, normalTexture, velocityTexture, frame);
        this.gtao.compositeInto(this.sceneHDR, camera, depthTexture, hiz, normalTexture, this.sun);
        c.endTimer();
      }

      if (q.ssr) {
        c.beginTimer('ssr');
        this.ssr.render(
          camera,
          this.sceneHDR.texture,
          depthTexture,
          hiz,
          this.gbuffer.hizCoarse,
          normalTexture,
          velocityTexture,
          this.sun,
          frame,
        );
        this.ssr.compositeInto(
          this.sceneHDR,
          camera,
          depthTexture,
          hiz,
          normalTexture,
          velocityTexture,
        );
        c.endTimer();
      }

      if (q.volumetricLighting || q.volumetricFog) {
        c.beginTimer('fog');
        this.volumetric.render(camera, hiz, depthTexture, velocityTexture, this.sun, frame);
        this.volumetric.compositeInto(this.sceneHDR, camera, depthTexture, hiz);
        c.endTimer();
      }
    }

    /* -------------------- transparents, after the fog ------------------- */

    c.beginTimer('transparent');
    this.renderLateTransparents(ctx);
    c.endTimer();

    if (this.needsGBuffer) this.gbuffer.removeJitter(camera);

    /* --------------------------- temporal resolve ----------------------- */

    let hdr: THREE.WebGLRenderTarget = this.sceneHDR;
    if (q.antialias === 'taa' && this.needsGBuffer && depthTexture) {
      c.beginTimer('taa');
      const resolved = this.taa.render(hdr.texture, velocityTexture, depthTexture);
      c.endTimer();
      if (resolved) hdr = resolved;
    }

    // Metered before the viewmodel: the weapon is dark and covers a third of the
    // lower frame, and letting it into the meter opens the whole scene up.
    const meterSource = hdr.texture;

    /* ---------------------------- camera optics ------------------------- */

    if (q.motionBlur && this.needsGBuffer && depthTexture) {
      const target = this.nextTarget(hdr);
      c.beginTimer('motionblur');
      this.motionBlur.render(target, hdr.texture, velocityTexture, depthTexture, camera, frame);
      c.endTimer();
      hdr = target;
    }

    if (q.depthOfField && depthTexture) {
      const target = this.nextTarget(hdr);
      c.beginTimer('dof');
      this.dof.render(target, hdr.texture, depthTexture, camera, this.height, frame);
      c.endTimer();
      hdr = target;
    }

    /* ----------------------------- viewmodel ---------------------------- */

    c.beginTimer('viewmodel');
    if (this.viewmodel.render(ctx)) {
      const target = this.nextTarget(hdr);
      this.viewmodel.compositeInto(
        target,
        hdr.texture,
        ctx.viewmodelCamera,
        this.weapons?.adsFactor ?? 0,
        frame,
      );
      hdr = target;
    }
    c.endTimer();

    /* ------------------------------- bloom ------------------------------ */

    if (q.bloom) {
      c.beginTimer('bloom');
      this.bloom.setExposure(this.grade.exposureCompensation, this.exposureOverride);
      this.bloom.render(hdr.texture);
      c.endTimer();
    } else {
      this.bloom.clear();
    }

    c.beginTimer('exposure');
    this.exposure.update(meterSource, dt);
    c.endTimer();

    /* -------------------------- tone map + grade ------------------------ */

    c.beginTimer('grade');
    this.updateGradeUniforms(hdr.texture, depthTexture);
    c.draw(this.gradeMaterial, this.gradeOut);
    c.endTimer();

    /* ------------------------- anti-aliasing tail ----------------------- */

    let display = this.gradeOut;
    if (q.antialias === 'fxaa' || q.antialias === 'smaa') {
      const mat = q.antialias === 'fxaa' ? this.fxaaMaterial : this.dlaaMaterial;
      mat.uniforms.uColor.value = display.texture;
      c.beginTimer('aa');
      c.draw(mat, this.aaOut);
      c.endTimer();
      display = this.aaOut;
    }

    /* --------------------------- final to canvas ------------------------ */

    if (this.debugMode !== 'off') {
      this.drawDebug(this.sceneHDR.texture, depthTexture, normalTexture, velocityTexture);
    } else {
      const u = this.finalMaterial.uniforms;
      u.uColor.value = display.texture;
      u.uSharpness.value = q.sharpen ? this.sharpenStrength : 0;
      u.uGrain.value = q.filmGrain ? this.grainStrength : 0;
      u.uFrame.value = frame;
      c.beginTimer('final');
      c.draw(this.finalMaterial, null);
      c.endTimer();
    }

    if (this.probePending) {
      this.probePending = false;
      this.runColorProbe();
    }

    r.setRenderTarget(null);
    this.gbuffer.endFrame();
    c.collectTimings();
    this.restoreShake(camera);
  }

  /** Whichever of the two working targets is not currently being read. */
  private nextTarget(current: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    return current === this.ping ? this.pong : this.ping;
  }

  /** Opaque + background into the HDR target. */
  private renderWorld(ctx: GameContext): void {
    const r = ctx.renderer;
    const camera = ctx.camera;
    const scene = ctx.scene;

    this.composer.clear(this.sceneHDR, 0x000000, 1, true);

    const mask = camera.layers.mask;
    camera.layers.disable(Layers.TRANSPARENT_LATE);
    camera.layers.disable(Layers.VIEWMODEL);
    r.setRenderTarget(this.sceneHDR);
    r.render(scene, camera);
    camera.layers.mask = mask;
  }

  /** Late transparents, drawn after the volumetric composite. */
  private renderLateTransparents(ctx: GameContext): void {
    const r = ctx.renderer;
    const camera = ctx.camera;
    const scene = ctx.scene;
    const mask = camera.layers.mask;
    const background = scene.background;

    // A Color background forces a clear even with autoClear off, which would
    // wipe everything composited so far.
    scene.background = null;
    camera.layers.set(Layers.TRANSPARENT_LATE);
    r.setRenderTarget(this.sceneHDR);
    r.render(scene, camera);

    scene.background = background;
    camera.layers.mask = mask;
  }

  private updateGradeUniforms(source: THREE.Texture, depth: THREE.Texture | null): void {
    const u = this.gradeMaterial.uniforms;
    const q = this.quality;
    const g = this.grade;

    u.uColor.value = source;
    u.uBloom.value = this.bloom.texture;
    u.uStreak.value = this.bloom.streakTexture;
    u.uFlare.value = this.bloom.flareTexture;
    u.uExposure.value = this.exposure.texture;
    u.uDepth.value = depth;
    u.uTime.value = this.elapsed;
    u.uFrame.value = this.frameIndex;

    u.uExposureOverride.value = this.exposureOverride ?? -1;
    u.uExposureComp.value = g.exposureCompensation;

    u.uChromatic.value = q.chromaticAberration ? this.chromaticStrength : 0;
    u.uVignette.value = q.vignette ? this.vignetteStrength : 0;
    u.uRadialBlur.value = this.radialBlur;
    u.uHeatHaze.value = depth ? this.heatHaze : 0;

    u.uBloomStrength.value = q.bloom ? this.bloomStrength : 0;
    u.uStreakStrength.value = q.bloom && q.lensFlare ? this.streakStrength : 0;
    u.uDirtStrength.value = q.lensDirt ? this.dirtStrength : 0;
    u.uFlareStrength.value = q.lensFlare ? this.flareStrength : 0;
    u.uHalation.value = q.bloom ? this.halationStrength : 0;

    (u.uFlashColor.value as THREE.Vector3).set(
      this.flashColor.r,
      this.flashColor.g,
      this.flashColor.b,
    );
    u.uFlashAmount.value = this.flashIntensity;
    u.uDamage.value = this.damageVignette;

    whiteBalanceGains(g.temperature, g.tint, this.whiteBalance);
    (u.uWhiteBalance.value as THREE.Vector3).copy(this.whiteBalance);

    const gradingOn = q.colorGrading;
    (u.uLift.value as THREE.Vector3).copy(gradingOn ? g.lift : ZERO);
    (u.uGain.value as THREE.Vector3).copy(gradingOn ? g.gain : ONE);
    (u.uGammaInv.value as THREE.Vector3).set(
      gradingOn ? 1 / g.gamma.x : 1,
      gradingOn ? 1 / g.gamma.y : 1,
      gradingOn ? 1 / g.gamma.z : 1,
    );
    (u.uShadowTint.value as THREE.Vector3).copy(gradingOn ? g.shadowTint : ZERO);
    (u.uMidTint.value as THREE.Vector3).copy(gradingOn ? g.midTint : ZERO);
    (u.uHighTint.value as THREE.Vector3).copy(gradingOn ? g.highTint : ZERO);
    u.uContrast.value = gradingOn ? g.contrast : 1;
    u.uSaturation.value = gradingOn ? g.saturation : 1;
    u.uLutAmount.value = gradingOn ? g.lutAmount : 0;
    u.uLut.value = gradingOn && g.lut !== 'neutral' ? this.luts.get(g.lut) : this.luts.identity;
  }

  /* ------------------------------ shake -------------------------------- */

  private applyShake(camera: THREE.PerspectiveCamera): void {
    if (this.cameraHasOwner) return;
    if (this.shakeOffset.lengthSq() < 1e-10 && Math.abs(this.shakeRotation.z) < 1e-6) return;
    this.savedCameraPos.copy(camera.position);
    this.savedCameraQuat.copy(camera.quaternion);
    scratchVec3.copy(this.shakeOffset).applyQuaternion(camera.quaternion);
    camera.position.add(scratchVec3);
    scratchEuler.copy(this.shakeRotation);
    camera.quaternion.multiply(scratchQuat.setFromEuler(scratchEuler));
    camera.updateMatrixWorld(true);
  }

  private restoreShake(camera: THREE.PerspectiveCamera): void {
    if (this.cameraHasOwner) return;
    if (this.shakeOffset.lengthSq() < 1e-10 && Math.abs(this.shakeRotation.z) < 1e-6) return;
    camera.position.copy(this.savedCameraPos);
    camera.quaternion.copy(this.savedCameraQuat);
    camera.updateMatrixWorld(true);
  }

  /* ------------------------------ debug -------------------------------- */

  private cycleDebug(): void {
    this.debugIndex = (this.debugIndex + 1) % DEBUG_MODES.length;
    this.debugMode = DEBUG_MODES[this.debugIndex];
    if (this.debugMode === 'probe') this.probePending = true;
    console.log(`[post] debug view: ${this.debugMode}`);
  }

  setDebugMode(mode: DebugMode): void {
    this.debugIndex = Math.max(0, DEBUG_MODES.indexOf(mode));
    this.debugMode = DEBUG_MODES[this.debugIndex];
    if (this.debugMode === 'probe') this.probePending = true;
  }

  private drawDebug(
    hdr: THREE.Texture,
    depth: THREE.Texture | null,
    normal: THREE.Texture,
    velocity: THREE.Texture,
  ): void {
    const u = this.debugMaterial.uniforms;
    u.uDepth.value = depth;
    u.uNormal.value = normal;
    u.uVelocity.value = velocity;
    u.uAO.value = this.gtao.texture;
    u.uSSR.value = this.ssr.texture;
    u.uVolumetrics.value = this.volumetric.texture;
    u.uBloom.value = this.bloom.texture;
    u.uStreak.value = this.bloom.streakTexture;
    u.uFlare.value = this.bloom.flareTexture;
    u.uHDR.value = hdr;
    u.uCoC.value = this.dof.cocTexture;
    u.uExposureTex.value = this.exposure.texture;
    u.uLuminance.value = this.exposure.luminanceTexture;
    u.uMode.value = Math.max(0, DEBUG_MODES.indexOf(this.debugMode));
    u.uExposure.value = this.currentExposure();
    this.composer.draw(this.debugMaterial, null);
  }

  private currentExposure(): number {
    if (this.exposureOverride !== null) return this.exposureOverride;
    return Math.pow(2, this.grade.exposureCompensation);
  }

  /**
   * Pushes a known linear ramp through the real grade material and logs what
   * comes out. This is the only way to be sure the chain round-trips: a
   * screenshot cannot distinguish a stray sRGB decode from an artistic choice.
   */
  private runColorProbe(): void {
    const values = [0.0, 0.005, 0.018, 0.05, 0.18, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 64.0];
    const data = new Float32Array(values.length * 4);
    for (let i = 0; i < values.length; i++) {
      data[i * 4] = values[i];
      data[i * 4 + 1] = values[i];
      data[i * 4 + 2] = values[i];
      data[i * 4 + 3] = 1;
    }
    const tex = new THREE.DataTexture(data, values.length, 1, THREE.RGBAFormat, THREE.FloatType);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;

    const probeTarget = this.composer.createTarget(values.length, 1, {
      filter: THREE.NearestFilter,
      // Full float so the readback can land in a Float32Array.
      type: THREE.FloatType,
    });

    const u = this.gradeMaterial.uniforms;
    const saved = this.snapshotGradeUniforms();
    this.neutraliseGradeUniforms();
    u.uColor.value = tex;
    u.uExposureOverride.value = 1;
    u.uLutAmount.value = 0;
    u.uContrast.value = 1;
    u.uSaturation.value = 1;
    (u.uWhiteBalance.value as THREE.Vector3).set(1, 1, 1);
    (u.uLift.value as THREE.Vector3).set(0, 0, 0);
    (u.uGain.value as THREE.Vector3).set(1, 1, 1);

    this.composer.draw(this.gradeMaterial, probeTarget);

    const out = new Float32Array(values.length * 4);
    try {
      this.composer.renderer.readRenderTargetPixels(probeTarget, 0, 0, values.length, 1, out);
      const rows = values.map((v, i) => {
        const display = out[i * 4];
        const srgb =
          display <= 0.0031308 ? display * 12.92 : Math.pow(display, 1 / 2.4) * 1.055 - 0.055;
        return `${v.toFixed(3)} -> ${display.toFixed(4)} (sRGB ${(srgb * 255).toFixed(1)}/255)`;
      });
      console.log('[post] colour probe (scene linear -> display linear):\n  ' + rows.join('\n  '));
    } catch (err) {
      console.warn('[post] colour probe readback failed:', err);
    }

    this.restoreGradeUniforms(saved);
    this.composer.destroyTarget(probeTarget);
    tex.dispose();
  }

  /* --------------------- grade uniform save/restore ---------------------- */

  private snapshotGradeUniforms(): Record<string, unknown> {
    const u = this.gradeMaterial.uniforms;
    const keys = [
      'uColor',
      'uBloomStrength',
      'uStreakStrength',
      'uDirtStrength',
      'uFlareStrength',
      'uHalation',
      'uVignette',
      'uChromatic',
      'uRadialBlur',
      'uHeatHaze',
      'uExposureOverride',
      'uLutAmount',
      'uContrast',
      'uSaturation',
      'uDamage',
      'uFlashAmount',
      'uDepth',
    ];
    const saved: Record<string, unknown> = {};
    for (const k of keys) saved[k] = u[k].value;
    saved.uWhiteBalance = (u.uWhiteBalance.value as THREE.Vector3).clone();
    saved.uLift = (u.uLift.value as THREE.Vector3).clone();
    saved.uGain = (u.uGain.value as THREE.Vector3).clone();
    return saved;
  }

  /** Turns off everything that is not the tone curve itself. */
  private neutraliseGradeUniforms(): void {
    const u = this.gradeMaterial.uniforms;
    for (const k of [
      'uBloomStrength',
      'uStreakStrength',
      'uDirtStrength',
      'uFlareStrength',
      'uHalation',
      'uVignette',
      'uChromatic',
      'uRadialBlur',
      'uHeatHaze',
      'uDamage',
      'uFlashAmount',
    ]) {
      u[k].value = 0;
    }
  }

  private restoreGradeUniforms(saved: Record<string, unknown>): void {
    const u = this.gradeMaterial.uniforms;
    for (const [k, v] of Object.entries(saved)) {
      if (v instanceof THREE.Vector3) (u[k].value as THREE.Vector3).copy(v);
      else u[k].value = v;
    }
  }

  /* -------------------------- IRenderPipeline --------------------------- */

  setFocus(distance: number, aperture: number): void {
    this.dof.focus = Math.max(0.05, distance);
    this.dof.aperture = Math.max(0.7, aperture);
  }

  flash(color: THREE.ColorRepresentation, intensity: number, duration: number): void {
    this.flashColor.set(color);
    this.flashDecay = Math.max(0.05, duration);
    this.flashTimer = this.flashDecay;
    this.flashPeak = Math.max(this.flashIntensity, intensity);
    this.flashIntensity = this.flashPeak;
  }

  setRadialBlur(amount: number): void {
    this.radialBlur = Math.min(1, Math.max(0, amount));
  }

  setDamageVignette(amount: number): void {
    this.damageVignette = Math.min(1, Math.max(0, amount));
  }

  setHeatHaze(amount: number): void {
    this.heatHaze = Math.min(1, Math.max(0, amount));
  }

  setExposure(exposure: number | null): void {
    this.exposureOverride = exposure;
  }

  get velocityTexture(): THREE.Texture | null {
    return this.needsGBuffer && this.gbuffer.target ? this.gbuffer.velocityTexture : null;
  }

  get depthTexture(): THREE.Texture | null {
    if (this.needsGBuffer && this.gbuffer.depth) return this.gbuffer.depth;
    return this.sceneDepth;
  }

  /** Per-pass GPU milliseconds, when timer queries are available. */
  get timings(): Readonly<Record<string, number>> {
    return this.composer ? this.composer.timings : {};
  }

  /** Total post-processing cost per frame: everything except scene submission. */
  get postCostMs(): number {
    const t = this.timings;
    let sum = 0;
    for (const [name, ms] of Object.entries(t)) {
      if (name === 'opaque' || name === 'transparent' || name === 'prepass') continue;
      sum += ms;
    }
    return sum;
  }

  /**
   * Renders the world into an arbitrary target through a reduced version of the
   * display transform: tone map, grade and sRGB encode, but no temporal or lens
   * work (the minimap has no history and no lens). The result is sRGB-encoded, so
   * the target's texture is annotated accordingly.
   */
  renderToTarget(target: THREE.WebGLRenderTarget, camera: THREE.Camera): void {
    if (!this.ready || !this.ctx) return;
    const ctx = this.ctx;
    const r = this.composer.renderer;
    const previous = r.getRenderTarget();

    if (
      !this.offscreen ||
      this.offscreen.width !== target.width ||
      this.offscreen.height !== target.height
    ) {
      this.composer.destroyTarget(this.offscreen);
      this.offscreen = this.composer.createTarget(target.width, target.height, {
        depthBuffer: true,
        depthTexture: this.composer.createDepthTexture(target.width, target.height),
      });
    }

    this.composer.clear(this.offscreen, 0x000000, 1, true);
    r.setRenderTarget(this.offscreen);
    r.render(ctx.scene, camera);

    const u = this.gradeMaterial.uniforms;
    const saved = this.snapshotGradeUniforms();
    this.neutraliseGradeUniforms();
    u.uColor.value = this.offscreen.texture;
    u.uDepth.value = this.offscreen.depthTexture;
    this.composer.draw(this.gradeMaterial, this.gradeOut);

    const f = this.finalMaterial.uniforms;
    const savedSharpen = f.uSharpness.value;
    const savedGrain = f.uGrain.value;
    const savedColor = f.uColor.value;
    f.uColor.value = this.gradeOut.texture;
    f.uSharpness.value = 0;
    f.uGrain.value = 0;
    this.composer.draw(this.finalMaterial, target);
    f.uSharpness.value = savedSharpen;
    f.uGrain.value = savedGrain;
    f.uColor.value = savedColor;

    this.restoreGradeUniforms(saved);
    for (const t of target.textures) t.colorSpace = THREE.SRGBColorSpace;
    r.setRenderTarget(previous);
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.composer?.dispose();
    this.luts.dispose();
    this.dirtTexture?.dispose();
    this.ready = false;
  }
}
