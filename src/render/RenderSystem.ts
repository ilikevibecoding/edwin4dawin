import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  PredicationMode,
  SelectiveBloomEffect,
  BloomEffect,
  DepthOfFieldEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  BlendFunction,
  KernelSize,
  Effect,
  Pass,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import type { EngineContext, Subsystem } from '../core/Engine';
import { AtmosphereEffect } from './effects/AtmosphereEffect';
import { FilmGradeEffect } from './effects/FilmGradeEffect';
import { SharpenPass } from './effects/SharpenPass';
import { ViewModelPass, WorldRenderPass } from './ViewModelPass';
import type { LightingSystem } from './Lighting';
import { clamp, damp } from '../core/MathX';

/**
 * Owns the frame's render graph.
 *
 * ```
 *  world scene ──▶ WorldRenderPass ──▶ N8AO ──▶ ViewModelPass
 *                                                    │
 *        ┌───────────────────────────────────────────┘
 *        ▼
 *   EffectPass[ atmosphere, bloom, DoF, film grade ]  (HDR, merged into 1 shader)
 *        ▼
 *   EffectPass[ SMAA ]  ──▶  SharpenPass  ──▶  screen
 * ```
 *
 * Everything up to the film grade runs in a half-float HDR buffer so bloom and
 * tonemapping behave physically.
 */
export class RenderSystem implements Subsystem {
  readonly name = 'render';
  readonly order = 100;

  composer!: EffectComposer;
  atmosphere!: AtmosphereEffect;
  grade!: FilmGradeEffect;
  bloom!: SelectiveBloomEffect | BloomEffect;
  dof!: DepthOfFieldEffect;
  chromatic!: ChromaticAberrationEffect;
  vignette!: VignetteEffect;
  smaa!: SMAAEffect;
  sharpen!: SharpenPass;
  ao: N8AOPostPass | null = null;

  private ctx!: EngineContext;
  private lighting!: LightingSystem;
  private worldPass!: WorldRenderPass;
  private viewModelPass!: ViewModelPass;
  private hdrPass!: EffectPass;
  private aaPass!: EffectPass;

  /** 0 = hip fire, 1 = fully aimed. Drives DoF and FOV feel. */
  adsAmount = 0;
  private focusTarget = 12;
  private currentFocus = 12;
  private raycaster = new THREE.Raycaster();

  private resolutionScale = 1;
  private width = 1;
  private height = 1;

  init(ctx: EngineContext) {
    this.ctx = ctx;
    const { renderer, scene, camera, viewScene, viewCamera, settings } = ctx;
    const q = settings.quality;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping happens in the film grade effect, in HDR, so the renderer
    // itself must not clamp anything.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    // VSM light-bleeds badly across the depth range a whole street needs;
    // PCF soft is the reliable choice here.
    renderer.shadowMap.type = q.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.info.autoReset = false;
    renderer.setClearColor(0x000000, 1);

    this.lighting = ctx.get<LightingSystem>('lighting');

    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
    });
    this.composer.autoRenderToScreen = false;

    this.worldPass = new WorldRenderPass(scene, camera);
    this.composer.addPass(this.worldPass);

    if (q.ssao) {
      try {
        this.ao = new N8AOPostPass(scene, camera, this.width, this.height);
        this.configureAO(q.ssaoQuality);
        this.composer.addPass(this.ao as unknown as Pass);
      } catch (err) {
        console.warn('[RenderSystem] SSAO unavailable, continuing without:', err);
        this.ao = null;
      }
    }

    this.viewModelPass = new ViewModelPass(viewScene, viewCamera);
    this.composer.addPass(this.viewModelPass);

    // --- HDR effect stack ---------------------------------------------------
    const preset = this.lighting.sky.preset;
    this.atmosphere = new AtmosphereEffect(camera, {
      density: preset.fogDensity,
      color: preset.fogColor,
      groundColor: preset.fogGroundColor,
      sunColor: preset.sunColor,
      inscatter: 1.4,
      heightFalloff: 0.05,
      fogBase: -2,
    });
    this.atmosphere.setSun(this.lighting.sunDirection, preset.sunColor);

    this.bloom = new SelectiveBloomEffect(scene, camera, {
      blendFunction: BlendFunction.ADD,
      // High threshold: only genuinely bright things (sun, muzzle flash,
      // explosions, hot specular) glow. Low thresholds are the classic tell of
      // amateur bloom.
      luminanceThreshold: 0.72,
      luminanceSmoothing: 0.28,
      intensity: 1.15,
      radius: 0.72,
      mipmapBlur: true,
      levels: 7,
    });
    (this.bloom as SelectiveBloomEffect).inverted = true;
    (this.bloom as SelectiveBloomEffect).ignoreBackground = false;

    this.dof = new DepthOfFieldEffect(camera, {
      focusDistance: 0.0,
      focalLength: 0.06,
      bokehScale: 2.4,
      resolutionScale: 0.5,
    });
    this.dof.blendMode.opacity.value = 0;

    this.grade = new FilmGradeEffect({
      exposure: settings.user.exposure * preset.exposure,
      grain: q.filmGrain ? 0.03 * settings.user.filmGrainAmount : 0,
      tone: 'agx',
    });

    const hdrEffects: Effect[] = [this.atmosphere];
    if (q.bloom) hdrEffects.push(this.bloom);
    if (q.depthOfField) hdrEffects.push(this.dof);
    hdrEffects.push(this.grade);

    this.hdrPass = new EffectPass(camera, ...hdrEffects);
    this.composer.addPass(this.hdrPass);

    // --- LDR: lens artefacts then AA ---------------------------------------
    this.chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00055, 0.00055),
      radialModulation: true,
      modulationOffset: 0.42,
    });
    this.vignette = new VignetteEffect({
      offset: 0.28,
      darkness: 0.42,
      blendFunction: BlendFunction.NORMAL,
    });
    this.smaa = new SMAAEffect({
      preset: SMAAPreset.ULTRA,
      edgeDetectionMode: EdgeDetectionMode.COLOR,
      predicationMode: PredicationMode.DEPTH,
    });

    // Chromatic aberration and SMAA are both convolution effects, so each has
    // to own its pass — they cannot be merged into a shared shader.
    if (q.chromaticAberration) {
      this.composer.addPass(new EffectPass(camera, this.chromatic));
    }
    this.aaPass = new EffectPass(camera, q.antialias === 'smaa' ? this.smaa : this.vignette);
    this.composer.addPass(this.aaPass);

    this.sharpen = new SharpenPass(0.42);
    this.sharpen.renderToScreen = true;
    this.composer.addPass(this.sharpen);

    this.applyResolutionScale();

    // Drive the composer from the engine's frame loop.
    ctx.engine.renderFn = (dt: number) => this.render(dt);

    settings.onChange(() => this.applySettings());
  }

  private configureAO(quality: 'low' | 'medium' | 'high') {
    if (!this.ao) return;
    const c = this.ao.configuration;
    c.aoRadius = 1.6;
    c.distanceFalloff = 1.1;
    c.intensity = 2.6;
    c.screenSpaceRadius = false;
    c.color = new THREE.Color(0.02, 0.028, 0.045);
    // The AO pass runs on an HDR linear buffer; gamma correction here would
    // double-apply once the film grade converts to display space.
    c.gammaCorrection = false;
    c.denoiseRadius = 8;
    c.depthAwareUpsampling = true;
    switch (quality) {
      case 'low':
        c.aoSamples = 8;
        c.denoiseSamples = 4;
        c.halfRes = true;
        break;
      case 'medium':
        c.aoSamples = 16;
        c.denoiseSamples = 6;
        c.halfRes = true;
        break;
      case 'high':
        c.aoSamples = 32;
        c.denoiseSamples = 8;
        c.halfRes = false;
        break;
    }
  }

  /** Applies the sky preset's grading + fog to the post stack. */
  syncToSky() {
    const preset = this.lighting.sky.preset;
    this.atmosphere.setSun(this.lighting.sunDirection, preset.sunColor);
    this.atmosphere.setFogColors(preset.fogColor, preset.fogGroundColor);
    this.atmosphere.density = preset.fogDensity;
    this.grade.exposure = this.ctx.settings.user.exposure * preset.exposure;
  }

  private applySettings() {
    const q = this.ctx.settings.quality;
    const u = this.ctx.settings.user;
    this.grade.exposure = u.exposure * this.lighting.sky.preset.exposure;
    this.grade.grain = q.filmGrain ? 0.03 * u.filmGrainAmount : 0;
    this.hdrPass.enabled = true;
    if (this.ao) this.configureAO(q.ssaoQuality);
    this.lighting.applyQuality(this.ctx);
    this.applyResolutionScale();
  }

  private applyResolutionScale() {
    const q = this.ctx.settings.quality;
    const dpr = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio);
    this.resolutionScale = q.renderScale;
    this.ctx.renderer.setPixelRatio(dpr * this.resolutionScale);
    this.resize(this.ctx.container.clientWidth, this.ctx.container.clientHeight, this.ctx);
  }

  /**
   * Autofocus: trace down the camera's forward axis and focus on whatever the
   * player is looking at, damped so focus pulls feel mechanical rather than
   * instant.
   */
  private updateFocus(dt: number, ctx: EngineContext) {
    if (!ctx.settings.quality.depthOfField) return;

    this.raycaster.setFromCamera(ORIGIN2, ctx.camera);
    this.raycaster.far = 220;
    // Only trace against the collision proxy layer to keep this cheap; if the
    // level hasn't provided one, fall back to a fixed distance.
    const targets = ctx.has('focusTargets') ? ctx.get<THREE.Object3D[]>('focusTargets') : null;
    if (targets && targets.length) {
      const hits = this.raycaster.intersectObjects(targets, true);
      this.focusTarget = hits.length ? hits[0].distance : 90;
    } else {
      this.focusTarget = 40;
    }

    this.currentFocus = damp(this.currentFocus, this.focusTarget, 0.02, dt);

    const cam = ctx.camera;
    // postprocessing wants focus distance in normalized [0,1] view depth.
    const normalized = clamp((this.currentFocus - cam.near) / (cam.far - cam.near), 0, 1);
    this.dof.cocMaterial.uniforms.focusDistance.value = normalized;

    // Depth of field only meaningfully engages when aiming; hip fire stays
    // fully sharp so the player never loses situational awareness.
    const strength = this.adsAmount * this.adsAmount;
    this.dof.blendMode.opacity.value = strength * 0.85;
    this.dof.bokehScale = 1.4 + strength * 2.2;
  }

  lateUpdate(dt: number, ctx: EngineContext) {
    this.updateFocus(dt, ctx);
    this.atmosphere.setSun(this.lighting.sunDirection, this.lighting.sky.preset.sunColor);

    // Widen chromatic aberration slightly when sprinting/aiming for a subtle
    // sense of lens strain.
    if (this.chromatic) {
      const base = 0.00042;
      const o = this.chromatic.offset as THREE.Vector2;
      o.set(base + this.adsAmount * 0.0004, base + this.adsAmount * 0.0004);
    }
  }

  render(dt: number) {
    this.ctx.renderer.info.reset();
    this.composer.render(dt);
  }

  resize(width: number, height: number, ctx: EngineContext) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.composer?.setSize(this.width, this.height);
    const dpr = ctx.renderer.getPixelRatio();
    this.sharpen?.setSize(this.width * dpr, this.height * dpr);
    this.ao?.setSize(this.width * dpr, this.height * dpr);
  }

  dispose() {
    this.composer?.dispose();
  }
}

const ORIGIN2 = new THREE.Vector2(0, 0);
