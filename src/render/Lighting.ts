import * as THREE from 'three';
import { CSMFrustum } from 'three/examples/jsm/csm/CSMFrustum.js';
import type { EngineContext } from '../core/System';
import type { QualityConfig } from '../core/Config';
import type { PhysicsSystem } from '../core/Contracts';
import { clamp, damp, lerp, saturate } from '../core/MathUtils';
import type { Sky } from './Sky';
import {
  installCascadePatch,
  isCascadePatchActive,
  shadowParamsUniform,
  uninstallCascadePatch,
  validateCascadePatch,
} from './CascadeShaderPatch';

/**
 * Sun, sky fill, cascaded shadows and the transient point-light pool.
 *
 * Cascades are hand-fitted rather than delegated to the `CSM` addon: only the
 * frustum splitting is reused from `three/examples/jsm/csm/CSMFrustum.js`. See
 * CascadeShaderPatch.ts for why the addon's per-material setup is unusable here.
 */

interface LightSlot {
  readonly light: THREE.PointLight;
  active: boolean;
  age: number;
  duration: number;
  fadeIn: number;
  peak: number;
  importance: number;
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

/**
 * Fraction of the sky's irradiance the fallback hemisphere light stands in for.
 * Below one because a hemisphere light hands every up-facing normal the full sky
 * colour, where a real sky is dimmer away from the sun and partly occluded.
 */
const HEMI_FALLBACK_EFFICIENCY = 0.82;
/** Flat floor under the fallback fill, only enough to keep shadows from clipping. */
const AMBIENT_FALLBACK_FRACTION = 0.04;
/** Extra fill the viewmodel keeps even when a probe is lighting the world. */
const VIEWMODEL_FILL_FRACTION = 0.16;

/** Scale a colour to unit luminance so an intensity can carry the magnitude. */
function normaliseLuminance(color: THREE.Color): THREE.Color {
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  return color.multiplyScalar(1 / Math.max(luma, 1e-4));
}

export class Lighting {
  /** Exposed through `RenderSystem.sunLight`; carries direction, colour and intensity. */
  readonly sunLight = new THREE.DirectionalLight(0xfff3e2, 3.0);

  private ctx!: EngineContext;
  private sky!: Sky;

  private cascades: THREE.DirectionalLight[] = [];
  private cascadeCount = 1;
  private shadowMapSize = 2048;
  private shadowDistance = 140;
  private useCascadeShader = false;

  private readonly mainFrustum = new CSMFrustum({ webGL: true });
  private readonly cascadeFrustums: CSMFrustum[] = [];
  private readonly lightSpaceFrustum = new CSMFrustum({ webGL: true });
  private readonly breaks: number[] = [];
  private readonly cascadeExtents: number[] = [];
  private readonly cascadeMargins: number[] = [];

  private readonly lightOrientation = new THREE.Matrix4();
  private readonly lightOrientationInverse = new THREE.Matrix4();
  private readonly cameraToLight = new THREE.Matrix4();
  private readonly bbox = new THREE.Box3();
  private readonly center = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly lightDirection = new THREE.Vector3(-0.42, -0.62, -0.66).normalize();

  /** Ambient fill; kept resident at zero intensity so IBL changes never recompile. */
  private hemi = new THREE.HemisphereLight(0x9fb8d0, 0x2c2620, 0);
  private ambient = new THREE.AmbientLight(0xffffff, 0);

  private pool: LightSlot[] = [];
  private poolRoot = new THREE.Group();

  private viewSun = new THREE.DirectionalLight(0xfff3e2, 3.0);
  private viewFill = new THREE.HemisphereLight(0x9fb8d0, 0x2c2620, 0.6);
  private viewSunVisibility = 1;
  private sunVisibilityTarget = 1;
  private raycastCountdown = 0;

  private fog: THREE.FogExp2 | null = null;
  private lastProjectionHash = 0;
  private frameIndex = 0;
  private environmentScale = 1;
  private environmentCalibrated = false;

  init(ctx: EngineContext, sky: Sky): void {
    this.ctx = ctx;
    this.sky = sky;

    this.sunLight.name = 'Sun';
    this.sunLight.castShadow = false;
    this.sunLight.target.name = 'SunTarget';

    this.hemi.name = 'SkyFill';
    this.ambient.name = 'AmbientFloor';
    ctx.scene.add(this.hemi);
    ctx.scene.add(this.ambient);

    this.poolRoot.name = 'DynamicLights';
    ctx.scene.add(this.poolRoot);

    this.viewSun.name = 'ViewmodelSun';
    this.viewSun.castShadow = false;
    this.viewFill.name = 'ViewmodelFill';
    ctx.viewScene.add(this.viewSun);
    ctx.viewScene.add(this.viewSun.target);
    ctx.viewScene.add(this.viewFill);

    // Atmospheric perspective for world geometry. Installed once so toggling it
    // later never triggers a scene-wide shader recompile.
    if (ctx.config.volumetricFog) {
      this.fog = new THREE.FogExp2(0xa8b4c0, 0.0032);
      ctx.scene.fog = this.fog;
    }

    this.buildShadowRig(ctx.config);
    this.buildLightPool(ctx.config.maxDynamicLights);
    this.syncSunFromSky();
  }

  // -------------------------------------------------------------------------
  // Shadow cascades
  // -------------------------------------------------------------------------

  private buildShadowRig(config: QualityConfig): void {
    this.disposeCascades();

    const renderer = this.ctx.renderer;
    // PCFSoftShadowMap is deprecated in three 0.185 and silently degrades to
    // hard shadows, so the render module pins the type it actually wants.
    renderer.shadowMap.enabled = config.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;

    this.shadowMapSize = Math.max(256, config.shadowMapSize);
    this.shadowDistance = Math.max(20, config.shadowDistance);
    const wanted = config.shadowsEnabled ? clamp(Math.round(config.shadowCascades), 1, 4) : 1;

    this.useCascadeShader = wanted >= 2 && installCascadePatch(wanted);
    this.cascadeCount = this.useCascadeShader ? wanted : 1;
    if (!this.useCascadeShader && isCascadePatchActive()) uninstallCascadePatch();

    for (let i = 0; i < this.cascadeCount; i++) {
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.name = `SunCascade${i}`;
      light.castShadow = config.shadowsEnabled;
      light.shadow.mapSize.setScalar(this.shadowMapSize);
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 600;
      light.shadow.intensity = 1;
      light.shadow.autoUpdate = true;
      light.matrixAutoUpdate = true;
      this.cascades.push(light);
      this.ctx.scene.add(light);
      this.ctx.scene.add(light.target);
    }

    if (this.useCascadeShader) {
      // A rejected patch must also change the light count, otherwise the probe's
      // failed program stays in three's cache under the same key.
      const ok = validateCascadePatch(renderer, this.cascades);
      if (!ok) {
        this.useCascadeShader = false;
        this.buildShadowRig({ ...config, shadowCascades: 1 });
        return;
      }
    }

    this.updateSplits(true);
  }

  private disposeCascades(): void {
    for (const light of this.cascades) {
      light.shadow.map?.dispose();
      light.shadow.dispose();
      this.ctx.scene.remove(light.target);
      this.ctx.scene.remove(light);
      light.dispose();
    }
    this.cascades.length = 0;
  }

  /**
   * Practical split scheme (a blend of uniform and logarithmic) with a lambda
   * tuned for first-person framing: tight cascade zero for the player's feet and
   * cover edges, then progressively coarser slices out to `shadowDistance`.
   */
  private updateSplits(force: boolean): void {
    const camera = this.ctx.camera;
    const far = Math.min(camera.far, this.shadowDistance);
    const near = camera.near;
    const hash = far * 1000 + near * 7919 + camera.fov * 31 + camera.aspect * 13;
    if (!force && Math.abs(hash - this.lastProjectionHash) < 1e-4) return;
    this.lastProjectionHash = hash;

    const count = this.cascadeCount;
    const lambda = 0.62;
    this.breaks.length = 0;
    for (let i = 1; i < count; i++) {
      const uniform = (near + ((far - near) * i) / count) / far;
      const logarithmic = (near * Math.pow(far / near, i / count)) / far;
      this.breaks.push(lerp(uniform, logarithmic, lambda));
    }
    this.breaks.push(1);

    this.mainFrustum.setFromProjectionMatrix(camera.projectionMatrix, far);
    this.mainFrustum.split(this.breaks, this.cascadeFrustums);

    this.cascadeExtents.length = 0;
    this.cascadeMargins.length = 0;
    for (let i = 0; i < count; i++) {
      const frustum = this.cascadeFrustums[i];
      if (!frustum) {
        this.cascadeExtents.push(this.shadowDistance);
        this.cascadeMargins.push(60);
        continue;
      }
      const nearVerts = frustum.vertices.near;
      const farVerts = frustum.vertices.far;
      const p1 = farVerts[0];
      const p2 =
        p1.distanceTo(farVerts[2]) > p1.distanceTo(nearVerts[2]) ? farVerts[2] : nearVerts[2];
      const extent = p1.distanceTo(p2);
      // Enough head-room above the slice that a two-storey building outside it
      // still casts into it, without wasting depth precision.
      const margin = Math.max(34, extent * 0.55);
      this.cascadeExtents.push(extent);
      this.cascadeMargins.push(margin);

      const light = this.cascades[i];
      if (!light) continue;
      const cam = light.shadow.camera;
      cam.left = -extent / 2;
      cam.right = extent / 2;
      cam.top = extent / 2;
      cam.bottom = -extent / 2;
      cam.near = 0.5;
      cam.far = margin * 2 + extent;
      cam.updateProjectionMatrix();

      const texelWorld = extent / this.shadowMapSize;
      // Depth bias in normalised shadow-camera space; normal bias in world units.
      light.shadow.bias = -(0.0012 + texelWorld * 0.55) / (cam.far - cam.near);
      light.shadow.normalBias = texelWorld * 1.45 + 0.004;
      // Keep the penumbra roughly constant in world space across cascades.
      light.shadow.radius = clamp(0.075 / Math.max(texelWorld, 1e-5), 0.6, 3.6);
    }
  }

  /**
   * Fit each cascade to its frustum slice, snapping the light-space centre to
   * the shadow texel grid. Without the snap the cascade slides continuously as
   * the player walks and every shadow edge crawls.
   */
  private updateCascades(): void {
    if (this.cascadeCount === 0) return;
    const camera = this.ctx.camera;

    this.lightOrientation.lookAt(this.origin, this.lightDirection, UP);
    this.lightOrientationInverse.copy(this.lightOrientation).invert();

    for (let i = 0; i < this.cascadeCount; i++) {
      const light = this.cascades[i];
      const frustum = this.cascadeFrustums[i];
      if (!light || !frustum) continue;

      const extent = this.cascadeExtents[i] ?? this.shadowDistance;
      const margin = this.cascadeMargins[i] ?? 60;
      const texel = extent / this.shadowMapSize;

      this.cameraToLight.multiplyMatrices(this.lightOrientationInverse, camera.matrixWorld);
      frustum.toSpace(this.cameraToLight, this.lightSpaceFrustum);

      this.bbox.makeEmpty();
      const nearVerts = this.lightSpaceFrustum.vertices.near;
      const farVerts = this.lightSpaceFrustum.vertices.far;
      for (let j = 0; j < 4; j++) {
        this.bbox.expandByPoint(nearVerts[j]);
        this.bbox.expandByPoint(farVerts[j]);
      }

      this.bbox.getCenter(this.center);
      this.center.z = this.bbox.max.z + margin;
      this.center.x = Math.floor(this.center.x / texel) * texel;
      this.center.y = Math.floor(this.center.y / texel) * texel;
      this.center.applyMatrix4(this.lightOrientation);

      light.position.copy(this.center);
      light.target.position.copy(this.center).add(this.lightDirection);
      light.updateMatrixWorld(true);
      light.target.updateMatrixWorld(true);
    }
  }

  // -------------------------------------------------------------------------
  // Sun / sky coupling
  // -------------------------------------------------------------------------

  private syncSunFromSky(): void {
    const state = this.sky.state;
    this.lightDirection.copy(state.sunDirection).negate().normalize();

    this.sunLight.color.copy(state.sunColor);
    this.sunLight.intensity = state.sunIntensity;
    this.sunLight.position.copy(state.sunDirection).multiplyScalar(400);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.updateMatrixWorld(true);
    this.sunLight.target.updateMatrixWorld(true);

    for (const light of this.cascades) {
      light.color.copy(state.sunColor);
      light.intensity = state.sunIntensity;
    }

    // Irradiance a horizontal surface collects from a hemisphere of mean radiance
    // L is pi*L. Deriving the fill from the sky's own reference radiance instead
    // of a hand-picked intensity is what stops the two drifting apart as the sun
    // moves, and it is the same number the probe scale is measured against.
    const skyIrradiance = Math.PI * state.referenceRadiance;
    const probeCovers = this.ctx.scene.environment !== null && this.environmentCalibrated;
    normaliseLuminance(this.hemi.color.copy(state.skyColor));
    normaliseLuminance(this.hemi.groundColor.copy(state.groundColor));
    // A calibrated probe already carries the whole sky irradiance, including the
    // ground bounce. Adding a hemisphere light on top of it double-counts the sky
    // and is exactly what flattens a scene into that evenly-lit look.
    this.hemi.intensity = probeCovers ? 0 : skyIrradiance * HEMI_FALLBACK_EFFICIENCY;
    this.ambient.color.copy(state.horizonColor);
    this.ambient.intensity = probeCovers ? 0 : skyIrradiance * AMBIENT_FALLBACK_FRACTION;
    this.ctx.scene.environmentIntensity = this.environmentScale;
    this.ctx.viewScene.environmentIntensity = this.environmentScale;

    this.viewSun.color.copy(state.sunColor);
    normaliseLuminance(this.viewFill.color.copy(state.skyColor));
    normaliseLuminance(this.viewFill.groundColor.copy(state.groundColor));
    // The viewmodel keeps a little fill even under a probe: it is held in the
    // player's own shadow, and a gun that reads as a black cutout is worse than a
    // gun lit slightly more generously than the world around it.
    this.viewFill.intensity =
      skyIrradiance * (probeCovers ? VIEWMODEL_FILL_FRACTION : HEMI_FALLBACK_EFFICIENCY);

    if (this.fog) {
      this.fog.color.copy(state.horizonColor).multiplyScalar(1.05);
      this.fog.density = lerp(0.0026, 0.0042, state.duskAmount) * (1 - state.night * 0.35);
    }
  }

  /** Point the sun at `dir` (pointing *towards* the sun) and refresh everything. */
  setSunDirection(dir: THREE.Vector3): void {
    this.sky.setSunDirection(dir);
    this.syncSunFromSky();
    this.updateSplits(true);
  }

  get sunDirection(): THREE.Vector3 {
    return this.sky.state.sunDirection;
  }

  // -------------------------------------------------------------------------
  // Dynamic light pool
  // -------------------------------------------------------------------------

  private buildLightPool(size: number): void {
    for (const slot of this.pool) {
      this.poolRoot.remove(slot.light);
      slot.light.dispose();
    }
    this.pool = [];
    const count = clamp(Math.round(size), 0, 32);
    for (let i = 0; i < count; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 6, 2);
      light.name = `DynamicLight${i}`;
      light.castShadow = false;
      // Pool lights stay resident and visible with zero intensity: removing them
      // would change NUM_POINT_LIGHTS and recompile every material in the scene
      // the first time a weapon fires.
      light.visible = true;
      this.poolRoot.add(light);
      this.pool.push({
        light,
        active: false,
        age: 0,
        duration: 0,
        fadeIn: 0.01,
        peak: 0,
        importance: 0,
      });
    }
  }

  requestDynamicLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number,
    duration: number,
  ): void {
    if (this.pool.length === 0 || intensity <= 0 || duration <= 0) return;

    const camPos = this.ctx.camera.position;
    const dx = position.x - camPos.x;
    const dy = position.y - camPos.y;
    const dz = position.z - camPos.z;
    const importance = intensity / Math.max(0.5, dx * dx + dy * dy + dz * dz);

    let slot: LightSlot | null = null;
    let weakest: LightSlot | null = null;
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (!s.active) {
        slot = s;
        break;
      }
      if (!weakest || s.importance < weakest.importance) weakest = s;
    }
    if (!slot) {
      if (!weakest || weakest.importance >= importance) return;
      slot = weakest;
    }

    slot.active = true;
    slot.age = 0;
    slot.duration = duration;
    slot.fadeIn = Math.min(0.03, duration * 0.2);
    slot.peak = intensity;
    slot.importance = importance;
    slot.light.position.copy(position);
    slot.light.color.setHex(color);
    slot.light.distance = Math.max(0.5, distance);
    slot.light.decay = 2;
    slot.light.intensity = 0;
  }

  private updateLightPool(dt: number): void {
    const camPos = this.ctx.camera.position;
    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;
      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        slot.importance = 0;
        slot.light.intensity = 0;
        continue;
      }
      const t = slot.age / slot.duration;
      const rise = slot.fadeIn > 0 ? saturate(slot.age / slot.fadeIn) : 1;
      // Quadratic tail: reads as a flash rather than a fading bulb.
      const decay = (1 - t) * (1 - t);
      slot.light.intensity = slot.peak * rise * decay;

      const p = slot.light.position;
      const dx = p.x - camPos.x;
      const dy = p.y - camPos.y;
      const dz = p.z - camPos.z;
      slot.importance = slot.light.intensity / Math.max(0.5, dx * dx + dy * dy + dz * dz);
    }
  }

  /** 0..1 from the throttled sun-occlusion raycast; drives the lens-flare gate. */
  get sunVisibility(): number {
    return this.viewSunVisibility;
  }

  /**
   * Extinction coefficient for the raymarched medium. Thicker at dusk when the
   * light is grazing, thinner at night when there is nothing to scatter.
   */
  get volumetricDensity(): number {
    const state = this.sky.state;
    const base = lerp(0.0095, 0.02, state.duskAmount);
    return base * (1 - state.night * 0.55);
  }

  get activeDynamicLights(): number {
    let n = 0;
    for (let i = 0; i < this.pool.length; i++) if (this.pool[i].active) n++;
    return n;
  }

  // -------------------------------------------------------------------------
  // Frame hooks
  // -------------------------------------------------------------------------

  update(dt: number): void {
    this.updateLightPool(dt);

    this.raycastCountdown -= dt;
    if (this.raycastCountdown <= 0) {
      this.raycastCountdown = 0.1;
      this.sunVisibilityTarget = this.sampleSunVisibility();
    }
    this.viewSunVisibility = damp(this.viewSunVisibility, this.sunVisibilityTarget, 9, dt);
    this.viewSun.intensity =
      this.sky.state.sunIntensity * (0.35 + 0.65 * this.viewSunVisibility);
  }

  /** Called from the render hook, before the world is drawn. */
  beforeRender(): void {
    this.frameIndex = (this.frameIndex + 1) & 0xffff;
    // Advance the shadow kernel rotation so TAA can integrate the penumbra.
    const params = shadowParamsUniform.value;
    params[0] = (this.frameIndex * 0.618033988749895) % 1;
    params[1] = this.ctx.config.softShadows ? 1.35 : 0.55;

    this.updateSplits(false);
    this.updateCascades();
    this.updateViewmodelSunDirection();
  }

  /**
   * The viewmodel lives in its own scene with its own camera, and the weapon
   * module is free to keep it either in view space (camera at the origin) or in
   * world space (camera mirroring the main one). Rotating the sun into the main
   * camera's view space and back out through the view camera produces the right
   * world direction either way, with no assumption about which convention wins.
   */
  private updateViewmodelSunDirection(): void {
    const camera = this.ctx.camera;
    const viewCamera = this.ctx.viewCamera;
    camera.updateMatrixWorld();
    viewCamera.updateMatrixWorld();

    const toView = SCRATCH_Q.setFromRotationMatrix(camera.matrixWorld).invert();
    const dir = SCRATCH_A.copy(this.sky.state.sunDirection).applyQuaternion(toView);
    dir.applyQuaternion(SCRATCH_Q2.setFromRotationMatrix(viewCamera.matrixWorld));

    const base = SCRATCH_B.setFromMatrixPosition(viewCamera.matrixWorld);
    this.viewSun.position.copy(base).addScaledVector(dir, 12);
    this.viewSun.target.position.copy(base);
    this.viewSun.updateMatrixWorld(true);
    this.viewSun.target.updateMatrixWorld(true);
  }

  private sampleSunVisibility(): number {
    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    if (!physics || !physics.ready) return 1;
    try {
      const origin = SCRATCH_A.copy(this.ctx.camera.position);
      const dir = SCRATCH_B.copy(this.sky.state.sunDirection);
      if (dir.y <= 0.02) return 0.15;
      const hit = physics.raycast(origin, dir, { maxDistance: 60 });
      return hit ? 0.12 : 1;
    } catch {
      return 1;
    }
  }

  onQualityChanged(config: QualityConfig): void {
    this.buildShadowRig(config);
    if (this.pool.length !== clamp(Math.round(config.maxDynamicLights), 0, 32)) {
      this.buildLightPool(config.maxDynamicLights);
    }
    if (config.volumetricFog && !this.fog) {
      this.fog = new THREE.FogExp2(0xa8b4c0, 0.0032);
      this.ctx.scene.fog = this.fog;
    } else if (!config.volumetricFog && this.fog) {
      this.ctx.scene.fog = null;
      this.fog = null;
    }
    this.syncSunFromSky();
  }

  /** Re-read the environment map from procgen; safe to call every frame. */
  refreshEnvironment(map: THREE.Texture | null): void {
    if (this.ctx.scene.environment === map) return;
    this.ctx.scene.environment = map;
    this.ctx.viewScene.environment = map;
    this.syncSunFromSky();
  }

  /**
   * Intensity the probe has to be multiplied by to sit on the sky's radiance
   * scale, as measured by {@link EnvironmentCalibration}. `calibrated` is false
   * until a probe has actually been measured, in which case the hemisphere
   * fallback keeps carrying the sky irradiance instead.
   */
  setEnvironmentScale(scale: number, calibrated: boolean): void {
    if (scale === this.environmentScale && calibrated === this.environmentCalibrated) return;
    this.environmentScale = scale;
    this.environmentCalibrated = calibrated;
    this.syncSunFromSky();
  }

  /** Shadow map bytes, for the debug overlay. */
  shadowMemoryBytes(): number {
    let bytes = 0;
    for (const light of this.cascades) {
      if (!light.castShadow) continue;
      bytes += this.shadowMapSize * this.shadowMapSize * 4;
    }
    return bytes;
  }

  get cascadeLights(): readonly THREE.DirectionalLight[] {
    return this.cascades;
  }

  get activeCascadeCount(): number {
    return this.cascadeCount;
  }

  get cascadeShaderActive(): boolean {
    return this.useCascadeShader;
  }

  dispose(): void {
    this.disposeCascades();
    uninstallCascadePatch();
    for (const slot of this.pool) {
      this.poolRoot.remove(slot.light);
      slot.light.dispose();
    }
    this.pool.length = 0;
    this.ctx.scene.remove(this.poolRoot);
    this.ctx.scene.remove(this.hemi);
    this.ctx.scene.remove(this.ambient);
    this.ctx.viewScene.remove(this.viewSun);
    this.ctx.viewScene.remove(this.viewSun.target);
    this.ctx.viewScene.remove(this.viewFill);
    this.hemi.dispose();
    this.ambient.dispose();
    this.viewSun.dispose();
    this.viewFill.dispose();
    this.sunLight.dispose();
    if (this.fog) this.ctx.scene.fog = null;
  }
}

const SCRATCH_A = /* @__PURE__ */ new THREE.Vector3();
const SCRATCH_B = /* @__PURE__ */ new THREE.Vector3();
const SCRATCH_Q = /* @__PURE__ */ new THREE.Quaternion();
const SCRATCH_Q2 = /* @__PURE__ */ new THREE.Quaternion();
