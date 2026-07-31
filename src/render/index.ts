import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { QualityConfig } from '../core/Config';
import type { ProcgenSystem, RenderSystem, UISystem, WorldSystem } from '../core/Contracts';
import { clamp, saturate } from '../core/MathUtils';
import { CameraFX } from './CameraFX';
import { DebugOverlay, type DebugStats } from './DebugOverlay';
import { EnvironmentCalibration } from './EnvironmentCalibration';
import { EnvironmentProbe } from './EnvironmentProbe';
import { Lighting } from './Lighting';
import { PostFX, type FrameInputs } from './PostFX';
import { verifyCompile } from './ShaderProbe';
import { Sky } from './Sky';
import type { DebugPassName } from './passes/DebugViewPass';

/**
 * Procgen's sky re-bake, which sits outside the `ProcgenSystem` contract but is
 * documented there as being for this module to drive.
 */
interface EnvironmentSunControls {
  setSunDirection?(direction: THREE.Vector3): void;
}

/**
 * Lighting, sky and the post-processing stack.
 *
 * Owns final presentation through `engine.renderHook`: the world goes into an
 * HDR target, the first-person viewmodel into a second one with its own depth so
 * it can never be clipped by level geometry, and the post stack folds them
 * together and takes the result all the way to the back buffer.
 *
 * Split across:
 * - `Sky.ts`              Rayleigh/Mie atmosphere, sun disc, layered clouds
 * - `Lighting.ts`         cascaded shadows, sun/IBL coupling, dynamic light pool
 * - `CascadeShaderPatch.ts` the ShaderChunk injection that makes cascades work
 * - `PostFX.ts`           pipeline orchestration and render-target lifetime
 * - `passes/*`            one file per screen-space pass
 * - `CameraFX.ts`         shake, flash, concussion, weapon kick
 */
export class RenderSystemImpl implements RenderSystem, System {
  readonly name = 'render' as const;
  readonly order = ORDER.RENDER;
  readonly dependencies = ['procgen'] as const;

  readonly stats = { drawCalls: 0, triangles: 0, programs: 0 };

  private ctx!: EngineContext;
  private readonly sky = new Sky();
  private readonly lighting = new Lighting();
  private readonly postfx = new PostFX();
  private readonly cameraFX = new CameraFX();
  private readonly overlay = new DebugOverlay();
  private readonly calibration = new EnvironmentCalibration();
  private probe: EnvironmentProbe | null = null;

  private blueNoise: THREE.Texture | null = null;
  private noiseSize = 64;
  private procgen: ProcgenSystem | null = null;
  private ui: UISystem | null = null;
  private world: WorldSystem | null = null;

  private readonly frameInputs: FrameInputs = {
    dt: 1 / 60,
    elapsed: 0,
    blueNoise: null,
    noiseSize: 64,
    cascades: [],
    sunDirection: new THREE.Vector3(0, 1, 0),
    sunColor: new THREE.Color(1, 1, 1),
    sunIntensity: 3,
    sunVisibility: 1,
    fogDensity: 0.014,
    wind: new THREE.Vector2(),
    flash: new THREE.Vector4(),
    concussion: new THREE.Vector4(),
    cameraStationary: false,
  };

  private readonly prevCameraPosition = new THREE.Vector3();
  private readonly prevCameraQuaternion = new THREE.Quaternion();
  private readonly worldSunDirection = new THREE.Vector3();
  private readonly bakedSunDirection = new THREE.Vector3();
  private frame = 0;
  private cpuMs = 0;
  private frameMs = 0;
  private lastFrameStart = 0;
  private warmedUp = false;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.enableShaderDiagnostics();

    this.sky.onQualityChanged(ctx.config);
    // Background stays null: the sky is a far-plane pass inside the scene, so
    // early-Z rejects it wherever geometry already covered the pixel.
    ctx.scene.background = null;
    ctx.scene.add(this.sky.mesh);

    this.lighting.init(ctx, this.sky);
    this.postfx.init(ctx);
    this.probe = new EnvironmentProbe(ctx.renderer, ctx.config);

    this.resolveDependencies();
    this.adoptWorldSun();
    this.probe.bake(this.sky, this.postfx.fullscreen);
    this.refreshEnvironment();

    if (ctx.config.showStats) this.overlay.setVisible(true);

    ctx.engine.renderHook = (c) => this.renderFrame(c);
    this.warmUp();
  }

  /**
   * Leave three's link check on for the whole session while the capture harness
   * is driving, not just for our own warm-up.
   *
   * Every other system that owns materials initialises after this one, and a
   * production build leaves `checkShaderErrors` off — so a shader any of them
   * fails to compile reaches the console as nothing but a bare `useProgram:
   * program not valid`, with no material, no file and no line, and the draw that
   * follows silently written by whatever program was still bound. A capture run
   * is a diagnostic run and can afford the query, which is what puts the
   * compiler's own error text in the log beside the frame it spoiled.
   *
   * Programs already past their first use cannot be reported retroactively,
   * which is why this cannot cover procgen's bakes: they run during its own
   * init, before this system exists.
   */
  private enableShaderDiagnostics(): void {
    if (new URLSearchParams(location.search).get('capture') !== '1') return;
    this.ctx.renderer.debug.checkShaderErrors = true;
  }

  private resolveDependencies(): void {
    const ctx = this.ctx;
    this.procgen = ctx.tryGet<ProcgenSystem>('procgen') ?? null;
    const noise = this.procgen?.blueNoise ?? null;
    if (noise) {
      this.blueNoise = noise;
      noise.wrapS = THREE.RepeatWrapping;
      noise.wrapT = THREE.RepeatWrapping;
      noise.minFilter = THREE.NearestFilter;
      noise.magFilter = THREE.NearestFilter;
      noise.generateMipmaps = false;
      noise.colorSpace = THREE.NoColorSpace;
      noise.needsUpdate = true;
      const image = noise.image as { width?: number } | null;
      this.noiseSize = Math.max(1, image?.width ?? 64);
    }
  }

  /**
   * Compile every shader permutation the pipeline needs before the loading
   * screen goes away. Doing it lazily would spend the first second of gameplay
   * hitching once per pass as each material links.
   */
  private warmUp(): void {
    const ctx = this.ctx;
    const renderer = ctx.renderer;
    // three only reads a program's link status on its first use, so the warm-up
    // is the one window where asking for it covers every program this module
    // owns and still costs nothing per frame. Left off, a pass whose shader the
    // driver rejected draws with whatever program was bound before it and the
    // only trace is a bare `useProgram: program not valid`.
    const previousCheck = renderer.debug.checkShaderErrors;
    renderer.debug.checkShaderErrors = true;
    try {
      const broken = verifyCompile(renderer, ctx.scene, ctx.camera);
      this.updateFrameInputs(1 / 60);
      this.lighting.beforeRender();
      this.postfx.render(this.frameInputs);
      this.postfx.resetTemporal();
      if (broken > 0) {
        console.warn(`[render] ${broken} shader program(s) failed to link during warm-up`);
      }
      this.warmedUp = true;
    } catch (err) {
      // A warm-up failure must never stop the game booting; the passes will
      // compile on demand instead.
      console.warn('[render] shader warm-up failed', err);
    } finally {
      renderer.debug.checkShaderErrors = previousCheck;
      renderer.setRenderTarget(null);
      renderer.autoClear = true;
    }
  }

  resize(width: number, height: number): void {
    this.postfx.resize(width, height);
  }

  onQualityChanged(config: QualityConfig, ctx: EngineContext): void {
    this.sky.onQualityChanged(config);
    this.lighting.onQualityChanged(config);
    this.postfx.onQualityChanged(config);
    this.probe?.onQualityChanged(config, this.sky, this.postfx.fullscreen);
    this.refreshEnvironment();
    // The renderer's tone mapping is re-pinned because the engine resets shadow
    // state around a quality change and a future engine tweak might do the same
    // to tone mapping.
    ctx.renderer.toneMapping = THREE.NoToneMapping;
    if (config.showStats) this.overlay.setVisible(true);
  }

  update(dt: number, ctx: EngineContext): void {
    this.lighting.update(dt);
    this.cameraFX.update(dt);

    if (ctx.input.keyPressed('F3')) this.overlay.toggle();
    // Procgen may publish its blue noise and probe after this system booted.
    if (!this.blueNoise) this.resolveDependencies();
    if (!this.ui) this.ui = ctx.tryGet<UISystem>('ui') ?? null;
    this.adoptWorldSun();
  }

  /** Shake is applied last so it rides on top of the player's final transform. */
  lateUpdate(_dt: number, ctx: EngineContext): void {
    this.cameraFX.apply(ctx.camera);
  }

  dispose(): void {
    if (this.ctx?.engine) this.ctx.engine.renderHook = null;
    this.ctx?.scene.remove(this.sky.mesh);
    this.overlay.dispose();
    this.calibration.dispose();
    this.probe?.dispose();
    this.probe = null;
    this.postfx.dispose();
    this.lighting.dispose();
    this.sky.dispose();
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  private renderFrame(ctx: EngineContext): void {
    const start = performance.now();
    this.frameMs = this.lastFrameStart > 0 ? start - this.lastFrameStart : 0;
    this.lastFrameStart = start;

    const dt = ctx.time.deltaUnscaled;
    this.updateFrameInputs(dt);

    this.frame = (this.frame + 1) & 0xffff;
    this.sky.update(dt, ctx.time.elapsedUnscaled, ctx.camera, ctx.size.height, this.frame);
    if (!this.usingProcgenEnvironment() && this.procgen?.environmentMap) {
      // Procgen finished baking its probe part-way through the session.
      this.refreshEnvironment();
    } else if (
      // Re-baking our stand-in while procgen's probe is the one bound would burn a
      // sky render and a PMREM pass twice a second on a texture nothing samples.
      !this.usingProcgenEnvironment() &&
      this.probe?.update(dt, this.sky, this.postfx.fullscreen)
    ) {
      this.refreshEnvironment();
    } else {
      this.applyEnvironmentScale();
    }

    this.lighting.beforeRender();
    this.postfx.render(this.frameInputs);
    this.cameraFX.restore(ctx.camera);

    const info = ctx.renderer.info;
    this.stats.drawCalls = info.render.calls;
    this.stats.triangles = info.render.triangles;
    this.stats.programs = info.programs?.length ?? 0;

    this.cpuMs = performance.now() - start;
    if (this.overlay.isVisible) this.overlay.update(dt, this.collectDebugStats(ctx));
  }

  private updateFrameInputs(dt: number): void {
    const ctx = this.ctx;
    const inputs = this.frameInputs;
    const state = this.sky.state;

    inputs.dt = dt;
    inputs.elapsed = ctx.time.elapsedUnscaled;
    inputs.blueNoise = this.blueNoise;
    inputs.noiseSize = this.noiseSize;
    inputs.cascades = this.lighting.cascadeLights;
    inputs.sunDirection.copy(state.sunDirection);
    inputs.sunColor.copy(state.sunColor);
    inputs.sunIntensity = state.sunIntensity;
    inputs.sunVisibility = this.lighting.sunVisibility;
    inputs.fogDensity = this.lighting.volumetricDensity;
    inputs.wind.copy(this.sky.windOffset);
    inputs.flash.copy(this.cameraFX.flash);
    inputs.concussion.copy(this.cameraFX.concussion);
    inputs.cameraStationary = this.detectStationary();
  }

  /**
   * TAA jitter is only suppressed when the game itself is idle: a paused or
   * menu-open frame with a camera that has not moved would otherwise shimmer at
   * sub-pixel scale while the player reads the screen.
   */
  private detectStationary(): boolean {
    const camera = this.ctx.camera;
    const moved =
      camera.position.distanceToSquared(this.prevCameraPosition) > 1e-9 ||
      Math.abs(camera.quaternion.dot(this.prevCameraQuaternion)) < 0.9999995;
    this.prevCameraPosition.copy(camera.position);
    this.prevCameraQuaternion.copy(camera.quaternion);

    if (moved || this.cameraFX.activity > 0.001) return false;
    return this.ctx.engine.isPaused || (this.ui?.isMenuOpen ?? false);
  }

  private usingProcgenEnvironment(): boolean {
    const map = this.procgen?.environmentMap ?? null;
    return map !== null && this.ctx.scene.environment === map;
  }

  private refreshEnvironment(): void {
    // Procgen owns the canonical probe; ours is the stand-in for the frames (or
    // the whole session) in which it has nothing to hand over.
    const map = this.procgen?.environmentMap ?? this.probe?.texture ?? null;
    this.calibration.calibrate(this.ctx.renderer, this.postfx.fullscreen, this.sky, map);
    this.lighting.refreshEnvironment(map);
    this.applyEnvironmentScale();
  }

  /**
   * Push the measured probe scale into the scene. Called every frame because the
   * scale rides the sky's reference radiance, but it never re-measures: that only
   * happens when the probe changes identity.
   */
  private applyEnvironmentScale(): void {
    const reference = this.sky.state.referenceRadiance;
    this.lighting.setEnvironmentScale(
      this.calibration.scaleFor(reference),
      this.calibration.skyFillFor(reference),
      this.calibration.calibrated,
    );
  }

  /**
   * Adopt the world module's sun so shadows, sky and airstrike headings agree.
   * Only *changes* are adopted: comparing against the sky's current direction
   * instead would re-assert the world's sun every frame and silently undo any
   * later `setTimeOfDay` or `setSunDirection` call.
   */
  private adoptWorldSun(): void {
    if (!this.world) {
      this.world = this.ctx.tryGet<WorldSystem>('world') ?? null;
      if (!this.world) return;
    }
    const wanted = this.world.sunDirection;
    if (!wanted || wanted.lengthSq() < 1e-6) return;
    if (this.worldSunDirection.dot(wanted) > 0.99995 * wanted.length()) return;
    this.worldSunDirection.copy(wanted).normalize();
    this.lighting.setSunDirection(this.worldSunDirection);
    this.rebakeEnvironmentSun();
    this.refreshEnvironment();
  }

  /**
   * Re-bake procgen's probe for the sun we are actually casting shadows from.
   *
   * Procgen bakes its environment once, against its own default sun, and has no
   * way of hearing about a time-of-day change — so the IBL's bright side sat
   * roughly a hundred degrees away from the key light and its colour stayed at
   * midday whatever the sky was doing. That is most of why a low sun read as
   * "daylight with a blue tint": the ambient never became a dusk ambient.
   *
   * The probe keeps its texture identity across a re-bake, so the calibration
   * has to be told its contents changed or it would keep measuring the old one.
   */
  private rebakeEnvironmentSun(): void {
    const controls = this.procgen as unknown as EnvironmentSunControls | null;
    if (!controls?.setSunDirection) return;
    const wanted = this.sky.state.sunDirection;
    if (this.bakedSunDirection.dot(wanted) > 0.9999) return;
    this.bakedSunDirection.copy(wanted);
    controls.setSunDirection(wanted);
    this.calibration.invalidate();
  }

  private collectDebugStats(ctx: EngineContext): DebugStats {
    const info = ctx.renderer.info;
    DEBUG_STATS.fps = ctx.time.fps;
    DEBUG_STATS.frameMs = this.frameMs;
    DEBUG_STATS.cpuMs = this.cpuMs;
    DEBUG_STATS.width = ctx.size.width;
    DEBUG_STATS.height = ctx.size.height;
    DEBUG_STATS.dpr = ctx.size.dpr;
    DEBUG_STATS.drawCalls = info.render.calls;
    DEBUG_STATS.triangles = info.render.triangles;
    DEBUG_STATS.programs = info.programs?.length ?? 0;
    DEBUG_STATS.geometries = info.memory.geometries;
    DEBUG_STATS.textures = info.memory.textures;
    DEBUG_STATS.blits = this.postfx.blitCount;
    DEBUG_STATS.megaPixels = this.postfx.megaPixels;
    DEBUG_STATS.targetBytes = this.postfx.targetMemoryBytes() + (this.probe?.memoryBytes() ?? 0);
    DEBUG_STATS.shadowBytes = this.lighting.shadowMemoryBytes();
    DEBUG_STATS.cascades = this.lighting.activeCascadeCount;
    DEBUG_STATS.cascadeShader = this.lighting.cascadeShaderActive;
    DEBUG_STATS.dynamicLights = this.lighting.activeDynamicLights;
    DEBUG_STATS.maxDynamicLights = ctx.config.maxDynamicLights;
    DEBUG_STATS.exposureMode = this.postfx.exposureMode;
    DEBUG_STATS.timeOfDay = this.sky.currentTimeOfDay;
    DEBUG_STATS.passes = this.postfx.activePasses;
    DEBUG_STATS.tier = ctx.config.tier;
    return DEBUG_STATS;
  }

  // -------------------------------------------------------------------------
  // RenderSystem contract
  // -------------------------------------------------------------------------

  get sunLight(): THREE.DirectionalLight {
    return this.lighting.sunLight;
  }

  addScreenShake(intensity: number, duration: number, frequency = 18): void {
    this.cameraFX.addScreenShake(intensity, duration, frequency);
  }

  addScreenFlash(intensity: number, duration: number, color = 0xffffff): void {
    this.cameraFX.addScreenFlash(intensity, duration, color);
  }

  setConcussion(amount: number, duration: number): void {
    this.cameraFX.setConcussion(amount, duration);
  }

  requestDynamicLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number,
    duration: number,
  ): void {
    this.lighting.requestDynamicLight(position, color, intensity, distance, duration);
  }

  setExposure(v: number): void {
    this.postfx.setExposure(v);
  }

  setFocusDistance(meters: number | null): void {
    this.postfx.setFocusDistance(meters);
  }

  // -------------------------------------------------------------------------
  // Extras other modules may use (not part of the contract)
  // -------------------------------------------------------------------------

  /** 0..1 across a full day: 0 midnight, 0.5 noon, sun up from 0.12 to 0.88. */
  setTimeOfDay(t: number): void {
    this.sky.setTimeOfDay(t);
    this.lighting.setSunDirection(this.sky.state.sunDirection);
    this.rebakeEnvironmentSun();
    this.probe?.bake(this.sky, this.postfx.fullscreen);
    this.refreshEnvironment();
  }

  setSunDirection(v: THREE.Vector3): void {
    this.lighting.setSunDirection(v);
    this.rebakeEnvironmentSun();
    this.refreshEnvironment();
  }

  setClouds(coverage: number, density = 1): void {
    this.sky.setClouds(coverage, density);
  }

  /** Turbidity / Rayleigh / Mie, for weather transitions. */
  setWeather(turbidity: number, rayleigh: number, mie: number): void {
    this.sky.setWeather(turbidity, rayleigh, mie);
  }

  /**
   * Visual weapon kick. Distinct from `PlayerSystem.addCameraRecoil`, which
   * moves the aim point; this decays back to zero and composes additively.
   */
  addWeaponKick(pitch: number, yaw: number, roll = 0, push = 0): void {
    this.cameraFX.addWeaponKick(pitch, yaw, roll, push);
  }

  /** 0 = hip fire, 1 = fully scoped; opens the depth-of-field aperture. */
  setScopeAmount(amount: number): void {
    this.postfx.scopeAmount = saturate(amount);
  }

  /** Dial the colour grade back, e.g. for a photo mode. */
  setGradeAmount(amount: number): void {
    this.postfx.setGradeAmount(amount);
  }

  setVignette(amount: number): void {
    this.postfx.setVignette(clamp(amount, 0, 1.2));
  }

  setDebugPass(name: DebugPassName): void {
    this.postfx.setDebugPass(name);
  }

  setDebugOverlayVisible(visible: boolean): void {
    this.overlay.setVisible(visible);
  }

  get isWarmedUp(): boolean {
    return this.warmedUp;
  }
}

const DEBUG_STATS: DebugStats = {
  fps: 0,
  frameMs: 0,
  cpuMs: 0,
  width: 0,
  height: 0,
  dpr: 1,
  drawCalls: 0,
  triangles: 0,
  programs: 0,
  geometries: 0,
  textures: 0,
  blits: 0,
  megaPixels: 0,
  targetBytes: 0,
  shadowBytes: 0,
  cascades: 0,
  cascadeShader: false,
  dynamicLights: 0,
  maxDynamicLights: 0,
  exposureMode: 'auto',
  timeOfDay: 0,
  passes: [],
  tier: 'high',
};
