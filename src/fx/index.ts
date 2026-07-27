import * as THREE from 'three';
import type { FXSystem, ProcgenSystem } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import { clamp } from '../core/MathUtils';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { QualityConfig } from '../core/Config';
import { ContrailSystem } from './Contrails';
import { DecalSystem } from './Decals';
import { DebrisField } from './Debris';
import { DepthPrepass } from './DepthPrepass';
import { ExplosionEffects, type ExplosionKind } from './Explosions';
import { buildGroups, type FXGroups } from './Groups';
import { ImpactEffects } from './Impacts';
import { MuzzleFlashEffects } from './MuzzleFlash';
import { ParticleSystem, type ParticleFrame } from './ParticleSystem';
import { FXDeps } from './Shared';
import { ShellEjector } from './Shells';
import { FXTextures } from './Textures';
import { TracerSystem } from './Tracers';
import { VolumetricEffects } from './Volumetrics';
import { FXDemo } from './dev/Demo';

/** Sky tint: the upper half of what a particle sees. */
const SKY_TINT = 0x93aecb;
/**
 * Bounce off the ground: the lower half.
 *
 * A sprite floating in the open collects light from the whole sphere around it,
 * and only the top of that sphere is sky. Filling with the sky tint alone gives
 * a fill twice as blue in its blue channel as in its red, and every dust puff in
 * the game then comes out the colour of a swimming pool no matter what
 * `SURFACE_PROPERTIES` says the wall is made of.
 */
const GROUND_TINT = 0xb9a488;
/** How much of the fill comes from the ground rather than the sky. */
const GROUND_FILL_SHARE = 0.45;
/**
 * Luminance of the environment fill on a lit particle at full daylight.
 *
 * A smoke puff is a participating volume, not an opaque surface: it collects
 * light from every direction and scatters it out in every direction, so its
 * shadowed side never goes anywhere near black. Deriving this from the raw tint
 * hexes instead leaves the magnitude at the mercy of how dark they happen to be,
 * and a dark fill is what turns explosion smoke into black ellipses pasted over
 * the level.
 */
const SKY_FILL_LUMINANCE = 0.3;

export interface FXStats {
  particles: number;
  particleCapacity: number;
  decals: number;
  tracers: number;
  shells: number;
  debris: number;
  contrails: number;
  fires: number;
  smoke: number;
  explosions: number;
  depthCaptures: number;
  drawCalls: number;
}

/**
 * The effects layer.
 *
 * Everything visible here is GPU-simulated: a particle is written once into an
 * instanced attribute buffer with its complete spawn state and then evolves
 * entirely in the vertex shader, so a screen full of smoke, fire, sparks and
 * debris costs the CPU nothing beyond the frame it was emitted on. The whole
 * layer is eleven instanced draws for particles plus one for decals, one for
 * tracers and a handful for physically-simulated brass and hero debris.
 *
 * Boot order matters here: FX initialises before render, world and physics, so
 * every dependency is resolved lazily on the first frame and a missing module
 * degrades an effect rather than throwing.
 */
export class FXSystemImpl implements FXSystem, System {
  readonly name = 'fx' as const;
  readonly order = ORDER.FX;
  readonly dependencies = ['procgen'] as const;

  private ctx!: EngineContext;
  private readonly deps = new FXDeps();
  private readonly textures = new FXTextures();
  private particles = new ParticleSystem();
  private groups!: FXGroups;
  private readonly decals = new DecalSystem();
  private readonly tracers = new TracerSystem();
  private readonly prepass = new DepthPrepass();
  private impacts!: ImpactEffects;
  private explosions!: ExplosionEffects;
  private muzzle!: MuzzleFlashEffects;
  private volumetrics!: VolumetricEffects;
  private shells!: ShellEjector;
  private debris!: DebrisField;
  private contrails!: ContrailSystem;
  private demo: FXDemo | null = null;

  private readonly worldRoot = new THREE.Group();
  private readonly viewRoot = new THREE.Group();
  private readonly prepassRoots: THREE.Object3D[] = [];

  private fallbackDepth!: THREE.DataTexture;
  private frame!: ParticleFrame;
  private readonly sunColor = new THREE.Color();
  private readonly ambientColor = new THREE.Color();
  private readonly skyTint = new THREE.Color();
  private readonly groundTint = new THREE.Color();
  private readonly sunView = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private depthValid = false;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.deps.ctx = ctx;
    this.skyTint.setHex(SKY_TINT, THREE.SRGBColorSpace);
    this.groundTint.setHex(GROUND_TINT, THREE.SRGBColorSpace);
    normalizeLuminance(this.skyTint);
    normalizeLuminance(this.groundTint);
    // Sky above, ground bounce below. Both are already at unit luminance, so the
    // blend stays there and the fill's brightness is set by one number.
    this.skyTint.lerp(this.groundTint, GROUND_FILL_SHARE);

    // Touching procgen guarantees its material library — and the renderer state
    // its baker leaves behind — is finished before this one bakes.
    ctx.get<ProcgenSystem>('procgen');
    this.textures.bake(ctx.renderer, ctx.config.textureResolution, ctx.config.anisotropy);

    this.worldRoot.name = 'fx:particles';
    this.worldRoot.matrixAutoUpdate = false;
    this.viewRoot.name = 'fx:viewParticles';
    this.viewRoot.matrixAutoUpdate = false;
    ctx.scene.add(this.worldRoot);
    ctx.viewScene.add(this.viewRoot);

    this.buildParticles();

    this.decals.init(ctx, this.textures.decal, this.deps);
    this.tracers.init(ctx);
    this.prepass.init(ctx);

    this.deps.decals = this.decals;
    this.impacts = new ImpactEffects(this.deps);
    this.explosions = new ExplosionEffects(this.deps);
    this.muzzle = new MuzzleFlashEffects(this.deps);
    this.volumetrics = new VolumetricEffects(this.deps);
    this.shells = new ShellEjector(this.deps);
    this.debris = new DebrisField(this.deps);
    this.contrails = new ContrailSystem(this.deps);
    this.shells.init(ctx);
    this.debris.init(ctx);
    this.contrails.init(ctx);

    // A detonation leaves a fire behind, and weapons and combat both report the
    // same blast, so smoke and dust share the explosion dedupe window.
    this.explosions.onFire = (position, radius, duration) =>
      this.volumetrics.fire(position, radius, duration);
    this.volumetrics.dedupe = (position, kind) => this.explosions.isDuplicateOf(position, kind);

    this.applyDensity();

    const white = new Uint8Array([255, 255, 255, 255]);
    this.fallbackDepth = new THREE.DataTexture(white, 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.fallbackDepth.name = 'fx:noDepth';
    this.fallbackDepth.needsUpdate = true;

    this.frame = {
      time: 0,
      sunDirection: this.deps.sunDirection,
      sunColor: this.sunColor,
      ambientColor: this.ambientColor,
      camera: ctx.camera,
      viewCamera: ctx.viewCamera,
      depthTexture: this.fallbackDepth,
      depthNear: 0.05,
      depthFar: this.prepass.far,
      resolutionX: ctx.size.width,
      resolutionY: ctx.size.height,
    };

    this.prepassRoots.length = 0;
    this.prepassRoots.push(this.worldRoot, this.decals.root, this.tracers.root);
    for (const root of this.debris.roots) this.prepassRoots.push(root);
    for (const root of this.contrails.roots) this.prepassRoots.push(root);
    for (const root of this.shells.roots) this.prepassRoots.push(root);

    const params = new URLSearchParams(location.search);
    if (params.get('fxdemo') === '1') {
      this.demo = new FXDemo(this, ctx, this.textures);
    }
    if (this.demo || params.get('fxstats') === '1') {
      (window as unknown as { __FX__: unknown }).__FX__ = () => this.stats;
    }
    if (this.demo) {
      // Particles cannot be debugged from a screenshot alone: an effect that is
      // absent because nothing spawned looks identical to one that spawned and
      // was then erased by a depth fade or drawn behind the weapon. This reports
      // which of the two it is.
      (window as unknown as { __FXDIAG__: unknown }).__FXDIAG__ = () => this.diagnostics();
    }
  }

  /** Dev-only: live population per group plus the demo's current staging. */
  private diagnostics(): Record<string, unknown> {
    const groups: Record<string, number> = {};
    for (const group of this.particles.all) {
      if (group.liveCount > 0) groups[group.name] = group.liveCount;
    }
    return {
      groups,
      decals: this.decals.liveCount,
      decalDraws: this.decals.drawCalls,
      shells: this.shells.liveCount,
      depthValid: this.depthValid,
      sun: this.deps.sunDirection.toArray().map((v) => Math.round(v * 100) / 100),
      sunColor: this.sunColor.toArray().map((v) => Math.round(v * 100) / 100),
      ambient: this.ambientColor.toArray().map((v) => Math.round(v * 100) / 100),
      demo: this.demo?.diagnostics ?? null,
    };
  }

  private buildParticles(): void {
    this.groups = buildGroups(this.particles, this.textures, this.ctx.config);
    this.deps.groups = this.groups;
    for (const group of this.particles.all) {
      (group.viewmodel ? this.viewRoot : this.worldRoot).add(group.mesh);
    }
  }

  /**
   * Effect *density* scales with the particle budget while effect *shape* does
   * not: a low-tier grenade throws fewer sparks, never smaller ones.
   */
  private applyDensity(): void {
    // Never below about two thirds: a headline explosion has to read as an
    // explosion on a laptop too, and group capacity plus priority-based
    // recycling is what actually holds the budget.
    const density = clamp(0.5 + this.ctx.config.particleBudget / 24000, 0.62, 1.3);
    this.explosions.density = density;
    this.muzzle.density = density;
    this.volumetrics.density = density;
  }

  // -------------------------------------------------------------------------
  // FXSystem
  // -------------------------------------------------------------------------

  impact(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, energy: number): void {
    this.impacts.impact(point, normal, surface, energy);
  }

  bloodSpray(point: THREE.Vector3, direction: THREE.Vector3, amount: number): void {
    this.impacts.bloodSpray(point, direction, amount);
  }

  muzzleFlash(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    scale: number,
    suppressed: boolean,
    inViewmodelScene: boolean,
  ): void {
    this.muzzle.flash(position, direction, scale, suppressed, inViewmodelScene);
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number, speed: number, width?: number): void {
    this.tracers.spawn(from, to, color, speed, width ?? 0.035);
  }

  explosion(position: THREE.Vector3, radius: number, kind: ExplosionKind): void {
    if (!this.explosions.explode(position, radius, kind)) return;
    // Hero chunks with real rigid bodies, on top of the GPU ejecta cloud.
    const count = kind === 'airstrike' ? 80 : kind === 'grenade' ? 20 : 34;
    this.debris.burst(position, UP, count, 'concrete', 1, true);
  }

  smoke(position: THREE.Vector3, radius: number, duration: number, color?: number): void {
    this.volumetrics.smoke(position, radius, duration, color);
  }

  dust(position: THREE.Vector3, radius: number, strength: number): void {
    this.volumetrics.dust(position, radius, strength);
  }

  shellEject(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    caliber: string,
    inViewmodelScene: boolean,
  ): void {
    this.shells.eject(position, velocity, caliber, inViewmodelScene);
  }

  decal(point: THREE.Vector3, normal: THREE.Vector3, surface: SurfaceType, size: number): void {
    // Combat passes the size of the *hole*. The atlas cell holds the whole mark
    // — pit, spalled lip, radial cracks and the film of dust thrown onto the wall
    // around it — and the pit is only about a third of the cell, so stamping the
    // cell at the hole's diameter leaves a 3 cm smudge that is invisible past
    // arm's length. This is also where the honest exaggeration lives: real 5.56
    // damage to concrete is small, and a shooter that renders it at true size
    // reads as though the walls are not being hit at all.
    const mark = surface === 'flesh' ? size * 1.6 : size * 3.4;
    this.decals.place({
      point,
      normal,
      size: mark,
      kind: surface === 'flesh' ? 'blood' : 'hole',
      surface,
      conform: mark > 0.35,
    });
  }

  fire(position: THREE.Vector3, radius: number, duration: number): void {
    this.volumetrics.fire(position, radius, duration);
  }

  contrail(object: THREE.Object3D, duration: number): void {
    this.contrails.attach(object, duration);
  }

  debrisBurst(position: THREE.Vector3, normal: THREE.Vector3, count: number, surface: SurfaceType): void {
    this.impacts.debrisBurst(position, normal, count, surface);
    if (count >= 12) this.debris.burst(position, normal, count, surface, 0.8, false);
  }

  clearAll(): void {
    this.particles.clear();
    this.decals.clear();
    this.tracers.clear();
    this.explosions.clear();
    this.volumetrics.clear();
    this.shells.clear();
    this.debris.clear();
    this.contrails.clear();
    this.depthValid = false;
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext): void {
    this.deps.resolve(ctx);
    this.deps.now = ctx.time.elapsed;
    this.deps.tickLightBudget(dt);
    ctx.camera.getWorldPosition(this.deps.cameraPosition);
    this.readLighting();

    this.demo?.update(dt);
    this.explosions.update(dt);
    this.volumetrics.update(dt);
    this.shells.update(dt);
    this.debris.update(dt);
    this.contrails.update(dt);
  }

  /**
   * Particles are swept and uploaded in `lateUpdate` so every emitter — weapons,
   * combat, AI, killstreaks — has already had its turn this frame, and a
   * particle spawned this frame is visible on this frame rather than the next.
   */
  lateUpdate(dt: number, ctx: EngineContext): void {
    // Before anything reads the camera: the demo parks it on whatever effect is
    // being reviewed, and the player has already written its own pose by now.
    this.demo?.lateUpdate();

    const frame = this.frame;
    frame.time = ctx.time.elapsed;
    frame.resolutionX = ctx.size.width;
    frame.resolutionY = ctx.size.height;

    // Scene depth is only captured when something is actually going to fade
    // against it, which for most of a firefight is no frames at all.
    this.depthValid = false;
    if (this.particles.needsSceneDepth) {
      this.depthValid = this.prepass.capture(this.prepassRoots, dt);
    }
    const depth = this.depthValid ? this.prepass.texture : null;
    frame.depthTexture = depth ?? this.fallbackDepth;
    frame.depthNear = this.prepass.near;
    frame.depthFar = this.prepass.far;

    this.particles.update(frame);
    this.tracers.update(frame.time);

    // Decals are lit in view space, matching the particle groups.
    ctx.camera.getWorldQuaternion(this.tmpQuat).invert();
    this.sunView.copy(this.deps.sunDirection).applyQuaternion(this.tmpQuat);
    this.decals.update(frame.time, this.sunView, this.sunColor, this.ambientColor);
  }

  /**
   * Match the world's exposure so smoke sits in the same light as the geometry
   * around it: three.js divides a directional light's irradiance by pi for a
   * Lambertian surface, and the sky term stands in for the environment probe.
   */
  private readLighting(): void {
    const render = this.deps.render;
    const world = this.deps.world;
    if (world) this.deps.sunDirection.copy(world.sunDirection).normalize();
    else if (render) this.deps.sunDirection.copy(render.sunLight.position).normalize();

    if (render) {
      const light = render.sunLight;
      const intensity = clamp(light.intensity, 0, 6) / Math.PI;
      this.sunColor.copy(light.color).multiplyScalar(intensity);
      // Tied to the sun so smoke goes properly dark at night rather than
      // glowing on with a fixed fill.
      this.ambientColor
        .copy(this.skyTint)
        .multiplyScalar(SKY_FILL_LUMINANCE * (0.25 + intensity * 0.78));
    } else {
      this.sunColor.setRGB(0.95, 0.92, 0.86);
      this.ambientColor.copy(this.skyTint).multiplyScalar(SKY_FILL_LUMINANCE);
    }
  }

  onQualityChanged(_config: QualityConfig, ctx: EngineContext): void {
    // Group capacities are a fraction of the particle budget, so a tier change
    // rebuilds them outright rather than leaving the wrong number of slots.
    for (const group of this.particles.all) group.mesh.removeFromParent();
    this.particles.dispose();
    this.particles = new ParticleSystem();
    this.buildParticles();
    this.applyDensity();

    this.decals.onQualityChanged();
    this.prepass.applyQuality();
    this.prepassRoots[1] = this.decals.root;
    this.applyDensity();
    void ctx;
  }

  get stats(): FXStats {
    let drawCalls = 0;
    for (const group of this.particles.all) if (group.mesh.visible) drawCalls++;
    drawCalls += this.decals.drawCalls;
    drawCalls += this.tracers.drawCalls;
    drawCalls += this.shells.drawCalls;
    drawCalls += this.debris.drawCalls;
    drawCalls += this.contrails.drawCalls;
    return {
      particles: this.particles.liveCount,
      particleCapacity: this.particles.capacity,
      decals: this.decals.liveCount,
      tracers: this.tracers.liveCount,
      shells: this.shells.liveCount,
      debris: this.debris.liveCount,
      contrails: this.contrails.liveCount,
      fires: this.volumetrics.activeFires,
      smoke: this.volumetrics.activeSmoke,
      explosions: this.explosions.activeCount,
      depthCaptures: this.prepass.captureCount,
      drawCalls,
    };
  }

  resetStats(): void {
    this.particles.resetStats();
    this.decals.resetStats();
    this.tracers.resetStats();
    this.prepass.resetStats();
  }

  dispose(): void {
    this.demo?.dispose();
    this.demo = null;
    this.particles.dispose();
    this.decals.dispose();
    this.tracers.dispose();
    this.prepass.dispose();
    this.shells.dispose();
    this.debris.dispose();
    this.contrails.dispose();
    this.textures.dispose();
    this.fallbackDepth.dispose();
    this.worldRoot.removeFromParent();
    this.viewRoot.removeFromParent();
  }
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

/** Rescales a colour to luminance 1 so a hex only decides hue. */
function normalizeLuminance(color: THREE.Color): void {
  const luma = Math.max(1e-4, 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b);
  color.multiplyScalar(1 / luma);
}
