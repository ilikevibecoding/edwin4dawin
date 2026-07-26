import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { QUALITY } from '../core/Config';
import type { EngineContext, System } from '../core/System';
import { Sky, SKY_PRESETS, type SkyPreset } from './Sky';

/**
 * Sun, sky, image-based ambient, and the dynamic light budget.
 *
 * Cascaded shadow maps give crisp contact shadows within a few metres of the
 * player while still covering the whole playable area — a single shadow map
 * large enough to cover a 200 m map would be a blurry mess at the player's
 * feet, and that softness at close range is one of the loudest "this is a
 * hobby renderer" signals.
 *
 * Dynamic lights (muzzle flashes, explosions, flares) are pooled: shaders
 * recompile whenever the light count changes, so a fixed pool that is
 * enabled/disabled by intensity avoids frame-long hitches mid-firefight.
 */

interface PooledLight {
  light: THREE.PointLight;
  busy: boolean;
  ttl: number;
  life: number;
  baseIntensity: number;
  decayCurve: 'flash' | 'linear' | 'flicker';
}

export class LightingSystem implements System {
  readonly name = 'lighting';
  readonly order = -80;

  sky!: Sky;
  csm: CSM | null = null;
  sun!: THREE.DirectionalLight;
  hemi!: THREE.HemisphereLight;
  viewKey!: THREE.DirectionalLight;
  viewFill!: THREE.DirectionalLight;
  viewAmbient!: THREE.AmbientLight;
  environment: THREE.Texture | null = null;

  private ctx!: EngineContext;
  private readonly pool: PooledLight[] = [];
  private lastSunDir = new THREE.Vector3();
  private preset: SkyPreset = SKY_PRESETS.desertMorning;
  private envDirty = true;

  /** Written each frame for the volumetric pass. */
  readonly cascadeInfo: Array<{ map: THREE.Texture | null; matrix: THREE.Matrix4; split: number }> = [];

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const { scene, camera, renderer } = ctx;

    this.sky = new Sky(this.preset);
    scene.add(this.sky.mesh);

    // Hemisphere fill approximates sky/ground bounce for anything the IBL
    // misses (particles, unlit debris) and keeps shadow interiors readable.
    this.hemi = new THREE.HemisphereLight(0x9fc4ff, 0x5a4a36, 0.35);
    scene.add(this.hemi);

    // The view model lives in its own scene, so it needs its own key and fill.
    // Rather than matching the world sun exactly, the key is offset up and to
    // the left of the camera: a weapon lit from the viewer's own side reads as
    // flat, and every shipped shooter cheats this the same way.
    this.viewKey = new THREE.DirectionalLight(0xffffff, 2.6);
    this.viewKey.position.set(-0.6, 1.0, 0.5);
    this.viewFill = new THREE.DirectionalLight(0x9fc4ff, 0.9);
    this.viewFill.position.set(0.8, -0.2, -0.6);
    this.viewAmbient = new THREE.AmbientLight(0xffffff, 0.22);
    ctx.viewScene.add(this.viewKey, this.viewFill, this.viewAmbient);

    if (QUALITY.shadowCascades > 1) {
      this.csm = new CSM({
        maxFar: QUALITY.shadowDistance,
        cascades: QUALITY.shadowCascades,
        mode: 'practical',
        parent: scene,
        shadowMapSize: QUALITY.shadowMapSize,
        lightDirection: this.sky.sunDirection.clone().negate(),
        camera,
        lightIntensity: 1,
      });
      this.csm.fade = true;
      for (const light of this.csm.lights) {
        light.shadow.bias = -0.00035;
        light.shadow.normalBias = 0.028;
        light.shadow.blurSamples = QUALITY.softShadows ? 12 : 4;
        if (QUALITY.softShadows) light.shadow.radius = 2.2;
      }
      // CSM owns the directional lights; keep a handle to the first for code
      // that just wants "the sun".
      this.sun = this.csm.lights[0];
    } else {
      this.sun = new THREE.DirectionalLight(0xffffff, 3);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.setScalar(QUALITY.shadowMapSize);
      this.sun.shadow.camera.near = 0.5;
      this.sun.shadow.camera.far = QUALITY.shadowDistance;
      const s = QUALITY.shadowDistance * 0.5;
      this.sun.shadow.camera.left = -s;
      this.sun.shadow.camera.right = s;
      this.sun.shadow.camera.top = s;
      this.sun.shadow.camera.bottom = -s;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
      scene.add(this.sun);
      scene.add(this.sun.target);
    }

    for (let i = 0; i < QUALITY.maxDynamicLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.castShadow = false;
      l.visible = false;
      scene.add(l);
      this.pool.push({ light: l, busy: false, ttl: 0, life: 0, baseIntensity: 0, decayCurve: 'flash' });
    }

    this.applyPreset(this.preset);
    this.refreshEnvironment(renderer);
  }

  applyPreset(preset: SkyPreset): void {
    this.preset = preset;
    this.sky.applyPreset(preset);

    const dir = this.sky.sunDirection;
    const sunColor = this.computeSunColor(dir.y, preset);
    const intensity = this.computeSunIntensity(dir.y, preset);

    if (this.csm) {
      this.csm.lightDirection.copy(dir).negate().normalize();
      this.csm.lightIntensity = intensity;
      for (const l of this.csm.lights) {
        l.color.copy(sunColor);
        l.intensity = intensity;
      }
    } else if (this.sun) {
      this.sun.color.copy(sunColor);
      this.sun.intensity = intensity;
      this.sun.position.copy(dir).multiplyScalar(120);
      this.sun.target.position.set(0, 0, 0);
    }

    // Sky/ground bounce colours follow the atmosphere so ambient never
    // disagrees with the visible sky.
    const skyTint = new THREE.Color().setRGB(
      0.35 + preset.rayleigh.x * 12,
      0.5 + preset.rayleigh.y * 10,
      0.85 + preset.rayleigh.z * 4,
    );
    this.hemi.color.copy(skyTint);
    this.hemi.groundColor.copy(preset.groundAlbedo);
    // Open sky is a very large, very bright source. Under-weighting it is what
    // makes shadowed facades read as black holes instead of as blue-filled
    // shade, which is the most common giveaway of a hobby renderer.
    this.hemi.intensity = THREE.MathUtils.lerp(0.15, 1.5, THREE.MathUtils.clamp(dir.y, 0, 1)) *
      (preset.cloudCoverage > 0.7 ? 1.7 : 1);

    if (this.viewKey) {
      this.viewKey.color.copy(sunColor);
      this.viewKey.intensity = Math.max(0.35, intensity * 0.85);
      this.viewFill.color.copy(skyTint);
      this.viewFill.intensity = this.hemi.intensity * 0.7;
      this.viewAmbient.intensity = 0.1 + this.hemi.intensity * 0.12;
    }

    this.envDirty = true;

    const pipeline = this.ctx?.engine.pipeline;
    if (pipeline) {
      pipeline.sunDirection.copy(dir);
      pipeline.sunColor.copy(sunColor);
      pipeline.sunIntensity = intensity;
      pipeline.fogAlbedo.setRGB(
        0.62 + preset.hazeColor.r * 0.3,
        0.66 + preset.hazeColor.g * 0.3,
        0.72 + preset.hazeColor.b * 0.3,
      );
    }
  }

  /** Blackbody-ish reddening as the sun approaches the horizon. */
  private computeSunColor(elevationSin: number, preset: SkyPreset): THREE.Color {
    const t = THREE.MathUtils.clamp(elevationSin, 0, 1);
    const horizon = new THREE.Color(1.0, 0.42, 0.16);
    const low = new THREE.Color(1.0, 0.76, 0.52);
    const high = new THREE.Color(1.0, 0.97, 0.92);
    const c = new THREE.Color();
    if (t < 0.16) c.copy(horizon).lerp(low, t / 0.16);
    else c.copy(low).lerp(high, THREE.MathUtils.clamp((t - 0.16) / 0.6, 0, 1));
    if (preset.cloudCoverage > 0.75) c.lerp(new THREE.Color(0.92, 0.94, 1.0), 0.5);
    if (preset.name === 'night') c.setRGB(0.62, 0.72, 1.0);
    return c;
  }

  private computeSunIntensity(elevationSin: number, preset: SkyPreset): number {
    const t = THREE.MathUtils.clamp(elevationSin, 0, 1);
    // Atmospheric extinction: a 5-degree sun delivers a fraction of the
    // irradiance of a noon sun even though both "look" bright.
    const extinction = Math.pow(t, 0.42);
    const cloudy = 1 - preset.cloudCoverage * 0.72;
    return preset.sunIntensity * 0.24 * extinction * cloudy + 0.05;
  }

  refreshEnvironment(renderer: THREE.WebGLRenderer): void {
    const old = this.environment;
    this.environment = this.sky.generateEnvironment(renderer, QUALITY.reflectionProbeSize);
    this.ctx.scene.environment = this.environment;
    // The IBL supplies both diffuse ambient and specular reflections. Pushing
    // it above unity compensates for the single-bounce approximation: real
    // streets get several bounces off the ground and the facing wall.
    this.ctx.scene.environmentIntensity = 1.6;
    this.ctx.viewScene.environment = this.environment;
    this.ctx.viewScene.environmentIntensity = 1.3;
    old?.dispose();
    this.envDirty = false;
    this.lastSunDir.copy(this.sky.sunDirection);
  }

  /**
   * Requests a transient dynamic light. Returns false when the pool is
   * exhausted, which callers should treat as "the frame is already busy
   * enough" rather than an error.
   */
  spawnLight(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    intensity: number,
    distance: number,
    duration: number,
    decayCurve: PooledLight['decayCurve'] = 'flash',
  ): boolean {
    let slot = this.pool.find((p) => !p.busy);
    if (!slot) {
      // Steal the dimmest light rather than dropping the request — a muzzle
      // flash that silently fails to light the room is worse than one that
      // interrupts a fading explosion glow.
      slot = this.pool.reduce((a, b) => (a.light.intensity < b.light.intensity ? a : b));
      if (slot.light.intensity > intensity) return false;
    }
    slot.busy = true;
    slot.ttl = duration;
    slot.life = duration;
    slot.baseIntensity = intensity;
    slot.decayCurve = decayCurve;
    slot.light.position.copy(position);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.light.visible = true;
    return true;
  }

  update(dt: number, ctx: EngineContext): void {
    const camPos = ctx.camera.position;
    this.sky.update(ctx.time.elapsed, camPos);

    for (const p of this.pool) {
      if (!p.busy) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.busy = false;
        p.light.visible = false;
        p.light.intensity = 0;
        continue;
      }
      const t = p.ttl / p.life;
      switch (p.decayCurve) {
        case 'flash':
          // Very fast falloff — a muzzle flash is essentially an impulse.
          p.light.intensity = p.baseIntensity * t * t * t;
          break;
        case 'linear':
          p.light.intensity = p.baseIntensity * t;
          break;
        case 'flicker':
          p.light.intensity =
            p.baseIntensity * t * (0.72 + 0.28 * Math.sin(ctx.time.elapsed * 47 + p.light.id));
          break;
      }
    }

    if (!this.csm) {
      // Keep the single shadow camera centred on the player.
      this.sun.position.copy(camPos).addScaledVector(this.sky.sunDirection, 90);
      this.sun.target.position.copy(camPos);
      this.sun.target.updateMatrixWorld();
    }
  }

  lateUpdate(_dt: number, ctx: EngineContext): void {
    if (this.csm) {
      this.csm.update();
      this.publishCascades();
    }
    if (this.envDirty) this.refreshEnvironment(ctx.renderer);
  }

  /** Hands the sun's shadow maps to the volumetric pass. */
  private publishCascades(): void {
    if (!this.csm) return;
    this.cascadeInfo.length = 0;
    const breaks = this.csm.breaks ?? [];
    for (let i = 0; i < Math.min(2, this.csm.lights.length); i++) {
      const l = this.csm.lights[i];
      const map = l.shadow.map?.texture ?? null;
      const split = (breaks[i] ?? 0.25) * QUALITY.shadowDistance;
      this.cascadeInfo.push({ map, matrix: l.shadow.matrix, split });
    }
    this.ctx.engine.pipeline.shadowCascades = this.cascadeInfo;
  }

  resize(): void {
    this.csm?.updateFrustums?.();
  }

  dispose(): void {
    this.csm?.dispose();
    this.sky.dispose();
    this.environment?.dispose();
  }
}
