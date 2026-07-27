import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import type { ILighting, IPhysics, ISky, IWorld } from '../core/Interfaces';
import { EnvironmentProbe } from './lighting/EnvironmentProbe';
import { IrradianceVolume } from './lighting/IrradianceVolume';
import { LocalLights, clusterConfigFor } from './lighting/LocalLights';
import { MaterialBinding, createLightingUniforms } from './lighting/MaterialBinding';
import { ProbeGrid } from './lighting/ProbeGrid';
import { ShadowCascades, type PublishedCascade } from './lighting/ShadowCascades';
import { buildShowcase, type LightingShowcase } from './lighting/LightingShowcase';

/**
 * ============================ RADIOMETRIC UNITS ============================
 *
 * **One engine unit is one kilonit of radiance, or one kilolux of irradiance.**
 * (A kilonit is 1000 cd/m²; a kilolux is 1000 lm/m².) Nothing in the renderer
 * is expressed in any other scale, and everything below follows from that:
 *
 *  - **Sun / moon.** `ISky.sunColor` is already the irradiance on a surface
 *    facing the sun, in kilolux. Measured against this sky it runs 102 at noon,
 *    20 at a 5-degree sun, and zero once the sun is down and `keyColor` hands
 *    over to the moon at 0.04. It is used *verbatim*: `sun.color = keyColor` with
 *    `sun.intensity = 1`. The magnitude carries the brightness and the ratios
 *    carry the hue, so there is no separate intensity to get out of step. This
 *    is what makes the post chain's `SunLighting` calibration factor — the
 *    ratio between what the rig shades with and what the sky reports —
 *    converge to exactly 1 whenever the sun is up.
 *  - **Sky ambient.** `ISky.skyColor` is a radiance, so the irradiance an
 *    unoccluded upward-facing surface receives from the whole dome is
 *    `PI * skyColor`. Every ambient term here is built from that identity: the
 *    hemisphere fill, the ground bounce, and the irradiance the probe bake
 *    assumes is landing on each bounce surface.
 *  - **Local lights.** Intensity is **kilocandela**, so the illuminance a light
 *    delivers is `intensity / d²` kilolux. A 60 W bulb is about 0.07; a muzzle
 *    flash is tens. That is why a torch does nothing at noon and everything at
 *    night, which is correct and is the whole point of picking a real scale.
 *  - **Emissive.** `emissive * emissiveIntensity` is radiance in kilonits, so a
 *    lit sign at 3 reads as a bright sign at dusk and disappears at midday.
 *
 * A white Lambertian surface in full noon sun therefore leaves about
 * `0.8 * 95 / PI ≈ 24` units — a hair under EV 5, comfortably inside the post
 * chain's auto-exposure range, with four stops of headroom for speculars.
 *
 * ===========================================================================
 *
 * The rig itself:
 *
 *  - **Cascaded shadow maps** into a single atlas, stabilised by bounding
 *    sphere and texel snapping, with PCSS contact hardening and cloud shadows
 *    from the sky's transmittance map. See `ShadowCascades`.
 *  - **Image-based lighting** from the sky's cubemap composited with a ground
 *    bounce and prefiltered, modulated per fragment by a baked sky-visibility
 *    volume so interiors are interiors. See `EnvironmentProbe`.
 *  - **Irradiance probes** — L2 spherical harmonics on a grid, carrying the
 *    bounce that geometry adds back. See `IrradianceVolume`.
 *  - **Clustered local lights** with a pooled flash allocator. See
 *    `LocalLights`.
 *
 * None of this goes through three's light loop. The key light is never a scene
 * light, so `NUM_DIR_LIGHTS` stays zero and a change of sun costs a uniform
 * rather than a shader rebuild; local lights are texture data for the same
 * reason. Everything is spliced into the surface shaders by `MaterialBinding`,
 * which chains behind the material library's own patch rather than replacing
 * it.
 */

/* Sun angular radius is 0.265°, so the tangent that scales PCSS penumbrae. */
const SUN_TAN_ANGLE = 0.00463;

/**
 * Side of the probe window, and the grid it snaps to. 96 m is a little over the
 * distance at which a change in indirect light is still legible, and the snap is
 * a whole number of cells at every quality preset.
 */
const PROBE_WINDOW = 96;
const PROBE_SNAP = 8;

const _keyDirection = new THREE.Vector3(0, 1, 0);
const _bounds = new THREE.Box3();
const _min = new THREE.Vector3();
const _max = new THREE.Vector3();
const _extent = new THREE.Vector3();
const _color = new THREE.Color();
const _radiance = new THREE.Vector3();

/** Rec. 709 luminance, for comparing two lighting states by brightness alone. */
function lumaOf(c: THREE.Color): number {
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

function isSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(
      debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    ).toLowerCase();
    return /swiftshader|llvmpipe|softwarerasterizer|mesa offscreen/.test(name);
  } catch {
    return false;
  }
}

export default class LightingSystem implements System, ILighting {
  readonly key = 'lighting';
  readonly order = 20;

  /**
   * The key light, in engine units, for anything that wants to know where the
   * sun is and how bright it is.
   *
   * Deliberately **not** added to the scene. three would shade with it a second
   * time on top of the cascade path, and it would bake `NUM_DIR_LIGHTS 1` into
   * every program for no benefit. It is a reporting surface, and the contract
   * (`ILighting.sun`) asks for a `DirectionalLight`, so that is what it is.
   */
  readonly sun = new THREE.DirectionalLight(0xffffff, 1);

  private readonly uniforms = createLightingUniforms();
  private readonly binding = new MaterialBinding(this.uniforms);
  private readonly shadows = new ShadowCascades();
  private readonly probe = new EnvironmentProbe();
  private readonly volume = new IrradianceVolume();
  private locals!: LocalLights;

  private ctx: GameContext | null = null;
  private sky: ISky | undefined;
  private physics: IPhysics | undefined;
  private world: IWorld | undefined;

  private grid: ProbeGrid | null = null;
  private environmentTexture: THREE.Texture | null = null;
  private software = false;
  private capture = false;
  private showcase: LightingShowcase | null = null;

  private castBounds = new THREE.Box3();
  private boundsValid = false;

  /** Non-zero only when a temporal resolve is downstream to average the noise. */
  private jitterStep = 0;
  private envRevision = -1;
  private envCooldown = 0;
  private envResolution = 256;
  /** Key + sky luminance the bound environment was baked under. See below. */
  private envLuma = -1;
  private scanCooldown = 0;
  private probeRevision = -1;
  private probeCooldown = 0;
  /** Extent the volume was last baked for; empty until the first real bake. */
  private bakedBounds = new THREE.Box3();
  private probeWindow = new THREE.Box3();
  private windowValid = false;
  private ambientFill = 1;
  private cascadeCount = 0;

  /* ------------------------------ lifecycle ------------------------------ */

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.software = isSoftwareRenderer(ctx.renderer);
    const params = new URLSearchParams(location.search);
    this.capture = params.has('capture');

    this.sun.name = 'KeyLight';
    this.sun.castShadow = false;
    this.sun.position.set(0, 1000, 0);

    this.locals = new LocalLights(ctx.quality, 16);
    this.applyQuality(ctx.quality, ctx);

    /* A neutral 3x3x3 grid so `USE_LIGHT_PROBES_GRID` is on from the first
       compile. Adding the volume later would rebuild every program in the
       scene at the exact moment the level finishes streaming in. Untraced on
       purpose: it does not know where the level is yet, and a grid that
       reported occlusion it had not measured would darken the opening frames. */
    this.volume.configure(
      _bounds.set(_min.set(-8, -2, -8), _max.set(8, 6, 8)),
      { spacing: 8, rays: 8, maxProbes: 27 },
      false,
    );
    this.attachGrid(ctx);

    if (params.get('showcase') === 'lighting') {
      this.showcase = buildShowcase(ctx);
      this.castBounds.copy(this.showcase.bounds);
      this.boundsValid = true;
    }

    this.binding.scan(ctx.scene);
    this.binding.scan(ctx.viewmodelScene);
    ctx.register('lighting', this);
  }

  /** Swaps the probe-grid object so three notices the texture changed. */
  private attachGrid(ctx: GameContext): void {
    const texture = this.volume.shTexture;
    if (!texture) return;
    if (this.grid) ctx.scene.remove(this.grid);
    this.grid = new ProbeGrid(texture, this.volume.bounds, this.volume.resolution);
    ctx.scene.add(this.grid);
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    this.applyQuality(quality, ctx);
  }

  private applyQuality(quality: QualitySettings, ctx: GameContext): void {
    const cascades = quality.shadows
      ? THREE.MathUtils.clamp(Math.round(quality.shadowCascades), 1, 4)
      : 0;
    this.cascadeCount = cascades;

    if (cascades > 0) {
      /* `shadowMapSize` is read as the size of one cascade, not of the whole
         atlas, so a preset's number means the same thing it would on a single
         shadow map. The software rasteriser cannot afford 2k tiles. */
      const tile = Math.min(quality.shadowMapSize, this.software ? 1024 : 2048);
      const columns = cascades > 1 ? 2 : 1;
      this.shadows.rebuild({
        count: cascades,
        atlasSize: tile * columns,
        distance: quality.shadowDistance,
        /* Practical split. Pushed toward logarithmic because the near field is
           where shadow texels are read at arm's length and the far field is
           where they are read across a street. */
        lambda: 0.78,
        blend: 0.12,
      });
    } else {
      this.shadows.dispose();
    }

    this.locals.applyConfig(clusterConfigFor(quality));

    const taps = this.software
      ? 8
      : quality.preset === 'cinematic'
        ? 24
        : quality.softShadows
          ? 16
          : 8;
    /* The blocker search runs before the early-out, so it is paid on every lit
       fragment in the frame while the filter is only paid in penumbrae. Half
       the filter count is the usual ratio.
    
       It is also what caps the penumbra width — the shader sizes the search disc
       to sqrt(taps) so the estimate stays a measurement rather than a coin toss —
       so cutting it does not just cost quality, it costs softness. Six is the
       floor at which a 20 cm penumbra is still reachable in the near cascade;
       the software rasteriser gets it too, having tried four and found the extra
       tap cheaper than the artefact. */
    const blockerTaps = this.software ? 6 : Math.max(8, taps >> 1);

    const rebuilt = this.binding.configure({
      cascades,
      pcss: quality.softShadows,
      shadowTaps: taps,
      blockerTaps,
      cloudShadows: cascades > 0 && ctx.tryGet<ISky>('sky') !== undefined,
      skyVisibility: true,
      clustered: true,
      lightsPerCluster: this.locals.config.perCluster,
      spotShadows: this.locals.spotShadowCount,
    });
    if (rebuilt) {
      this.binding.scan(ctx.scene);
      this.binding.scan(ctx.viewmodelScene);
    }

    this.envResolution = Math.max(64, Math.min(quality.envMapResolution, this.software ? 128 : 512));
    this.envRevision = -1;

    /* Golden ratio, so successive frames land as far apart on the rotation as
       possible and a short temporal history is already well distributed. */
    this.jitterStep = quality.antialias === 'taa' ? 0.6180339887 : 0;

    const u = this.uniforms;
    u.uCsmBlend.value = 0.12;
    /* Both biases scale with a cascade's own texel size inside the shader, so
       these are unitless multipliers in texels rather than the usual per-map
       fudge in metres — which is what lets one pair of numbers hold from a 3 cm
       texel at arm's length to a 67 cm texel at the far split.
    
       They are also only the residual. The receiver-plane gradient in the filter
       takes out the part of the error that grows with the tap offset, so what is
       left for a constant to cover is the half-texel between the fragment and
       the centre of the texel it reads. Half a texel is why this is 0.5 and not
       the several-texel bias a filter without a gradient would need — and why a
       7 cm pole still has a shadow. */
    u.uCsmNormalBias.value = 1.1;
    u.uCsmDepthBias.value = 0.5;
    u.uCsmLightAngle.value = SUN_TAN_ANGLE;
    u.uCsmAtlasTexel.value.set(
      1 / Math.max(this.shadows.atlas?.width ?? 1, 1),
      1 / Math.max(this.shadows.atlas?.height ?? 1, 1),
    );
    u.uCsmAtlas.value = this.shadows.texture;
    u.uLightData.value = this.locals.lightData;
    u.uClusterData.value = this.locals.clusterData;
    u.uSpotShadowAtlas.value = this.locals.spotAtlas?.depthTexture ?? null;
    u.uSpotShadowTexel.value.copy(this.locals.spotTexel);
  }

  /* -------------------------------- ILighting ---------------------------- */

  get environment(): THREE.Texture | null {
    return this.environmentTexture;
  }

  refreshEnvironment(): void {
    this.envRevision = -1;
    this.envCooldown = 0;
  }

  addLocalLight(light: THREE.Light, radius: number): void {
    this.locals.add(light, radius);
  }

  removeLocalLight(light: THREE.Light): void {
    this.locals.remove(light);
  }

  flashLight(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    intensity: number,
    radius: number,
    duration: number,
  ): void {
    this.locals.flash(position, color, intensity, radius, duration);
  }

  get activeLightCount(): number {
    return this.locals.visibleCount;
  }

  /** Structural handle the post pipeline's volumetric pass marches. */
  get cascades(): PublishedCascade[] {
    return this.shadows.published;
  }

  /* --------------------------------- frame ------------------------------- */

  update(dt: number, ctx: GameContext): void {
    this.sky ??= ctx.tryGet<ISky>('sky');
    this.physics ??= ctx.tryGet<IPhysics>('physics');
    this.world ??= ctx.tryGet<IWorld>('world');

    this.driveKeyLight();
    this.driveAmbient();
    this.locals.tick(dt);

    this.envCooldown -= dt;
    this.probeCooldown -= dt;
    this.scanCooldown -= dt;

    this.updateEnvironment(ctx);
    this.updateProbes(ctx);

    if (this.scanCooldown <= 0) {
      /* Streamed props and spawned debris arrive after init, so the bind pass
         has to keep running. It is a traverse and a WeakMap hit per material,
         which is cheap enough at half a hertz to not be worth incrementalising. */
      this.scanCooldown = 2;
      this.binding.scan(ctx.scene);
      this.binding.scan(ctx.viewmodelScene);
    }
  }

  lateUpdate(_dt: number, ctx: GameContext): void {
    this.updateBounds();

    const jitter = this.uniforms.uCsmJitter;
    jitter.value = this.jitterStep > 0 ? (ctx.clock.frame * this.jitterStep) % 1 : 0;

    if (this.cascadeCount > 0 && this.shadows.atlas) {
      this.shadows.update(ctx.camera, _keyDirection, this.castBounds);
      this.shadows.render(ctx.renderer, ctx.scene);
      this.syncCascadeUniforms();
    }

    this.locals.assign(ctx.camera);
    this.locals.renderShadows(ctx.renderer, ctx.scene, this.locals.visibleCount);
    this.syncLocalUniforms();
  }

  /* -------------------------------- sun ---------------------------------- */

  /**
   * Copies the sky's key light straight into the rig.
   *
   * There is no conversion here on purpose. The sky publishes irradiance in the
   * renderer's units, the shader consumes irradiance in the renderer's units,
   * and the moment anything multiplies by a taste factor the post chain's fog
   * stops agreeing with the surfaces it sits between.
   *
   * Night is already handled upstream: `keyColor` and `keyDirection` cross-fade
   * from sun to moon through the terminator, and the moon's colour carries the
   * scotopic blue shift, so there is no special case to write.
   */
  private driveKeyLight(): void {
    const sky = this.sky;
    const u = this.uniforms;

    if (sky) {
      const direction = sky.keyDirection ?? sky.sunDirection;
      const color = sky.keyColor ?? sky.sunColor;
      _keyDirection.copy(direction).normalize();
      _color.copy(color);
    } else {
      _keyDirection.set(0.42, 0.68, 0.6).normalize();
      _color.setRGB(72, 66, 56);
    }

    this.sun.color.copy(_color);
    this.sun.intensity = 1;
    this.sun.position.copy(_keyDirection).multiplyScalar(1000);

    u.uSunDirection.value.copy(_keyDirection);
    u.uSunRadiance.value.set(_color.r, _color.g, _color.b);

    /* Cloud shadows are applied per fragment from the sky's transmittance map,
       not by dimming the light: the map is spatial and `sunOcclusion` is a
       single number for the camera's position, so using both would darken the
       shadowed ground twice over. The scalar is the fallback for when the deck
       has not baked a map yet. */
    const map = sky?.cloudShadowMap ?? null;
    u.uCloudShadowMap.value = map;
    if (map && sky?.cloudShadowMatrix) {
      u.uCloudShadowMatrix.value.copy(sky.cloudShadowMatrix);
      u.uCloudShadowStrength.value = 0.9;
    } else {
      u.uCloudShadowStrength.value = 0;
      const occlusion = THREE.MathUtils.clamp(sky?.sunOcclusion ?? 0, 0, 1);
      u.uSunRadiance.value.multiplyScalar(1 - occlusion * 0.85);
    }

    /* An overcast sky is one enormous area light, so its shadows are metres
       wide at the same blocker distance a clear sun would render sharp. Driving
       the penumbra scale off cloud cover gets that for free.
    
       The clear-sky end is a deliberate but small exaggeration of the sun's real
       half-degree: the finest cascade texel is already 4 cm, so a physically
       exact 2 cm penumbra cannot be resolved anyway. It used to be five times,
       and at that width a 7 cm pole's shadow was entirely penumbra and vanished
       — the caster the range exists to test was the one being erased. */
    const cover = THREE.MathUtils.clamp(sky?.weather.cloudCover ?? 0, 0, 1);
    u.uCsmSoftness.value = THREE.MathUtils.lerp(4, 24, cover * cover);
  }

  /**
   * The two halves of the ambient term: sky above and terrain bounce below.
   *
   * Never a constant. `uAmbientFill` fades the analytic hemisphere out as the
   * prefiltered probe fades in, so the two never both contribute and there is
   * no frame where the scene is lit by nothing.
   */
  private driveAmbient(): void {
    const sky = this.sky;
    const u = this.uniforms;

    if (sky) u.uAmbientSky.value.copy(sky.skyColor);
    else u.uAmbientSky.value.setRGB(3.4, 4.4, 6.6);

    /* Radiance leaving the ground: everything arriving on it, times its albedo,
       over pi. Exactly the term the environment probe composites into its lower
       hemisphere, so the fill and the probe agree where they cross over. */
    const albedo = this.probe.groundAlbedo;
    const sunUp = Math.max(_keyDirection.y, 0);
    const invPi = 1 / Math.PI;
    u.uAmbientGround.value.setRGB(
      (this.sun.color.r * sunUp + Math.PI * u.uAmbientSky.value.r) * albedo.r * invPi,
      (this.sun.color.g * sunUp + Math.PI * u.uAmbientSky.value.g) * albedo.g * invPi,
      (this.sun.color.b * sunUp + Math.PI * u.uAmbientSky.value.b) * albedo.b * invPi,
    );

    const target = this.environmentTexture ? 0 : 1;
    this.ambientFill += (target - this.ambientFill) * 0.25;
    if (Math.abs(this.ambientFill - target) < 0.002) this.ambientFill = target;
    u.uAmbientFill.value = this.ambientFill;
  }

  /* ------------------------------ environment ---------------------------- */

  private updateEnvironment(ctx: GameContext): void {
    const sky = this.sky;
    if (!sky) return;
    if (sky.revision === this.envRevision) return;

    /*
     * A drift and a jump need opposite handling, and the difference is one
     * comparison.
     *
     * Drifting is the normal case: the sun moves a fraction of a degree, the sky
     * has already refreshed a face or two of its own cubemap, and re-prefiltering
     * four times a second from whatever it has is both cheap and imperceptible.
     *
     * A jump is a cut — a level that starts at night, a scripted time skip, a
     * showcase pose. Trickling through it is visibly wrong rather than merely
     * late: for the second or so it takes the sky's cubemap to turn over face by
     * face, every surface in the frame is still taking its indirect light from
     * the sky of the *previous* hour, so a moonlit street comes up lit by a warm
     * golden-hour probe. It read as an overexposed afternoon with a black sky.
     *
     * So a jump is detected by the size of the change in key and sky luminance,
     * not by the revision counter — the counter says something moved, not how
     * far — and answered by re-rendering all six faces at once and ignoring the
     * throttle. Two thirds of a stop is well above what a sweep produces
     * between rebakes and well below the several stops a cut does.
     */
    const luma = lumaOf(this.sun.color) + lumaOf(this.uniforms.uAmbientSky.value);
    const ratio = this.envLuma > 0 ? luma / this.envLuma : Infinity;
    const jump = this.envLuma <= 0 || ratio > 1.6 || ratio < 0.625;
    if (!jump && this.envCooldown > 0) return;

    /* The sky refreshes its own cubemap a face at a time as the sun moves, so
       the cheap read is the right one nearly always. */
    let source = jump ? null : (sky.environmentTexture ?? null);
    if (!source) source = sky.renderEnvironment(this.envResolution);
    if (!source) return;

    const baked = this.probe.bake(
      ctx.renderer,
      source,
      this.envResolution,
      this.sun.color,
      _keyDirection,
      this.uniforms.uAmbientSky.value,
      sky.sunOcclusion ?? 0,
    );
    if (!baked) return;

    this.envRevision = sky.revision;
    this.envLuma = luma;
    /* Four times a second is far below the rate at which a prefiltered sky
       visibly changes, and well above the rate a time-of-day sweep needs. */
    this.envCooldown = this.software ? 0.5 : 0.25;

    if (this.environmentTexture !== baked) {
      this.environmentTexture = baked;
      ctx.scene.environment = baked;
      ctx.viewmodelScene.environment = baked;
    }
  }

  /* -------------------------------- probes ------------------------------- */

  private updateProbes(ctx: GameContext): void {
    /* Re-baked whenever the extent worth probing changes, which is how the
       volume follows the level in: the world's bounds are empty at init and
       final a second later. Comparing the box rather than latching a flag —
       a flag was enough to make the grid stay on the bootstrap cell forever. */
    const bounds = this.probeBounds(ctx);
    if (bounds && !this.volume.baking && this.boundsMoved(bounds)) {
      this.bakedBounds.copy(bounds);
      this.probeRevision = this.sky?.revision ?? 0;
      this.volume.requestRelight(
        this.sun.color,
        _keyDirection,
        this.uniforms.uAmbientSky.value,
      );
      this.volume.configure(bounds, this.probeConfig());
      this.attachGrid(ctx);
      this.syncVisibilityUniforms();
    }

    /* A capture steps a couple of dozen frames and then screenshots, so the
       bake has to finish inside them and there is no frame budget to protect;
       interactively it must not be felt at all. */
    const budget = this.capture ? 250 : this.software ? 4 : 3;
    const wasReady = this.volume.ready;
    this.volume.step(this.physics, budget);
    if (this.volume.ready && !wasReady) this.syncVisibilityUniforms();

    if (this.probeCooldown <= 0 && this.volume.ready && !this.volume.baking) {
      const sky = this.sky;
      if (sky && sky.revision !== this.probeRevision) {
        this.probeRevision = sky.revision;
        this.probeCooldown = this.capture ? 0 : 0.75;
        this.volume.requestRelight(
          this.sun.color,
          _keyDirection,
          this.uniforms.uAmbientSky.value,
        );
      }
    }
  }

  /**
   * Whether the probe extent has moved enough to be worth a rebake. Slack of a
   * couple of metres, because a world that recomputes its own bounds as props
   * settle would otherwise re-trace the level every frame it twitched.
   */
  private boundsMoved(bounds: THREE.Box3): boolean {
    if (this.bakedBounds.isEmpty()) return true;
    const a = this.bakedBounds;
    return (
      Math.abs(a.min.x - bounds.min.x) > 2 ||
      Math.abs(a.min.y - bounds.min.y) > 2 ||
      Math.abs(a.min.z - bounds.min.z) > 2 ||
      Math.abs(a.max.x - bounds.max.x) > 2 ||
      Math.abs(a.max.y - bounds.max.y) > 2 ||
      Math.abs(a.max.z - bounds.max.z) > 2
    );
  }

  /**
   * Extent worth probing, or null while nothing has been built yet.
   *
   * Clipped in Y to the band the player can actually be in: a level's bounds
   * include its skyline and its boundary shell, and spending vertical slices on
   * empty air above the rooftops spends them where nothing is shaded, while a
   * room four metres tall goes unresolved below.
   *
   * Horizontally it is a window that follows the camera rather than the whole
   * level. Spacing is extent over a fixed probe budget, so covering 160 by 190
   * metres buys 7 m cells — and a 7 m cell cannot tell the inside of a room from
   * the street outside it, which is the entire point of the volume. A bounded
   * window keeps the cell size fixed and the bake cost fixed no matter how large
   * the map grows. It only recentres once the camera leaves the middle half, and
   * it snaps to whole cells, so walking does not retrigger a bake every step.
   */
  private probeBounds(ctx: GameContext): THREE.Box3 | null {
    if (this.showcase) return this.showcase.probeBounds;
    const world = this.world;
    if (!world || world.bounds.isEmpty()) return null;

    _bounds.copy(world.bounds);
    _bounds.max.y = Math.min(_bounds.max.y, _bounds.min.y + 26);
    _bounds.getSize(_extent);
    if (_extent.x <= PROBE_WINDOW && _extent.z <= PROBE_WINDOW) return _bounds;

    const half = PROBE_WINDOW / 2;
    const eye = ctx.camera.position;
    if (this.windowValid) {
      this.probeWindow.getCenter(_min);
      if (Math.abs(eye.x - _min.x) < half * 0.5 && Math.abs(eye.z - _min.z) < half * 0.5) {
        return this.probeWindow;
      }
    }

    /* Snapped so the box steps in whole cells; an unsnapped window would shift
       every probe by a fraction of a cell on each recentre and the interpolated
       result would visibly crawl. */
    const snap = PROBE_SNAP;
    const cx = Math.round(THREE.MathUtils.clamp(eye.x, _bounds.min.x, _bounds.max.x) / snap) * snap;
    const cz = Math.round(THREE.MathUtils.clamp(eye.z, _bounds.min.z, _bounds.max.z) / snap) * snap;
    this.probeWindow.min.set(cx - half, _bounds.min.y, cz - half);
    this.probeWindow.max.set(cx + half, _bounds.max.y, cz + half);
    this.windowValid = true;
    return this.probeWindow;
  }

  private probeConfig(): { spacing: number; rays: number; maxProbes: number; reach: number } {
    /* Spacing is the axis that matters: a 2.5 m grid resolves a doorway and a
       5 m one does not, whatever the ray count. Rays only set how smooth the
       result is, and 20 over a sphere is already smoother than a trilinear
       lookup can show, so resolution wins the trade every time. */
    if (this.software || this.capture) {
      return { spacing: 2.6, rays: 20, maxProbes: 4600, reach: 30 };
    }
    return { spacing: 2.4, rays: 24, maxProbes: 7000, reach: 34 };
  }

  private syncVisibilityUniforms(): void {
    const u = this.uniforms;
    const volume = this.volume;
    u.uSkyVisibility.value = volume.visibilityTexture;
    volume.bounds.getSize(_extent);
    u.uSkyVisMin.value.copy(volume.bounds.min);
    u.uSkyVisInvExtent.value.set(
      1 / Math.max(_extent.x, 1e-4),
      1 / Math.max(_extent.y, 1e-4),
      1 / Math.max(_extent.z, 1e-4),
    );
    /* Values sit *at* grid corners, so the sampler has to be told to land on
       texel centres or the outer half-texel smears against the clamp. */
    const r = volume.resolution;
    u.uSkyVisTexelScale.value.set((r.x - 1) / r.x, (r.y - 1) / r.y, (r.z - 1) / r.z);
    u.uSkyVisTexelBias.value.set(0.5 / r.x, 0.5 / r.y, 0.5 / r.z);

    if (this.grid) {
      this.grid.boundingBox.copy(volume.bounds);
      this.grid.resolution.copy(volume.resolution);
    }
  }

  /* -------------------------------- shadows ------------------------------ */

  private updateBounds(): void {
    if (this.showcase) return;
    const world = this.world;
    if (!world || world.bounds.isEmpty()) {
      if (!this.boundsValid) {
        this.castBounds.set(_min.set(-120, -6, -120), _max.set(120, 40, 120));
      }
      return;
    }
    if (this.boundsValid) return;
    this.castBounds.copy(world.bounds);
    this.boundsValid = true;
  }

  private syncCascadeUniforms(): void {
    const u = this.uniforms;
    const list = this.shadows.cascades;
    for (let i = 0; i < list.length && i < 4; i++) {
      u.uCsmMatrix.value[i].copy(list[i].matrix);
      u.uCsmParams.value[i].copy(list[i].params);
      u.uCsmRect.value[i].copy(list[i].rect);
    }
    u.uCsmAtlas.value = this.shadows.texture;
    u.uCsmFade.value.set(this.shadows.fadeStart, this.shadows.fadeEnd);
  }

  private syncLocalUniforms(): void {
    const u = this.uniforms;
    u.uClusterGrid.value.copy(this.locals.gridParams);
    u.uClusterDepth.value.copy(this.locals.depthParams);
    u.uClusterProj.value.copy(this.locals.projParams);
    u.uSpotShadowAtlas.value = this.locals.spotAtlas?.depthTexture ?? null;
    u.uSpotShadowTexel.value.copy(this.locals.spotTexel);
    for (let i = 0; i < this.locals.spotMatrices.length && i < 4; i++) {
      u.uSpotShadowMatrix.value[i].copy(this.locals.spotMatrices[i]);
      u.uSpotShadowRect.value[i].copy(this.locals.spotRects[i]);
    }
  }

  /* -------------------------------- teardown ----------------------------- */

  dispose(): void {
    const ctx = this.ctx;
    if (ctx) {
      if (this.grid) ctx.scene.remove(this.grid);
      if (ctx.scene.environment === this.environmentTexture) ctx.scene.environment = null;
      if (ctx.viewmodelScene.environment === this.environmentTexture) {
        ctx.viewmodelScene.environment = null;
      }
    }
    this.showcase?.dispose();
    this.binding.dispose();
    this.shadows.dispose();
    this.probe.dispose();
    this.volume.dispose();
    this.locals.dispose();
    this.environmentTexture = null;
    this.grid = null;
  }

  /** Snapshot for the debug overlay and the critique loop. */
  debugReport(): Record<string, unknown> {
    const sky = this.sky;
    const fmt = (c: THREE.Color): string =>
      `${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)}`;
    _radiance.copy(this.uniforms.uSunRadiance.value);
    return {
      units: '1 unit = 1 kilonit / 1 kilolux',
      keyColor: fmt(this.sun.color),
      keyIntensity: this.sun.intensity,
      skySunColor: sky ? fmt(sky.sunColor) : 'no sky',
      shaderSunRadiance: `${_radiance.x.toFixed(2)}, ${_radiance.y.toFixed(2)}, ${_radiance.z.toFixed(2)}`,
      ambientSky: fmt(this.uniforms.uAmbientSky.value),
      ambientGround: fmt(this.uniforms.uAmbientGround.value),
      ambientFill: Number(this.ambientFill.toFixed(3)),
      cascades: this.cascadeCount,
      atlas: this.shadows.atlas ? `${this.shadows.atlas.width}x${this.shadows.atlas.height}` : 'off',
      splits: this.shadows.cascades.map((c) => Number(c.params.x.toFixed(1))),
      texelMetres: this.shadows.cascades.map((c) => Number(c.params.y.toFixed(3))),
      softness: Number(this.uniforms.uCsmSoftness.value.toFixed(1)),
      probeGrid: `${this.volume.resolution.x}x${this.volume.resolution.y}x${this.volume.resolution.z}`,
      probeReady: this.volume.ready,
      probeProgress: Number(this.volume.progress.toFixed(2)),
      localLights: this.locals.visibleCount,
      spotShadows: this.locals.spotShadowCount,
      environment: this.environmentTexture ? 'bound' : 'pending',
      shaderKey: this.binding.key,
    };
  }
}
