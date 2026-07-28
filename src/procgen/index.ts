import * as THREE from 'three';
import type { MaterialId, ProcgenSystem } from '../core/Contracts';
import type { QualityConfig, QualityTier } from '../core/Config';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import { createBlueNoiseTexture, fillBlueNoiseTexture } from './BlueNoise';
import { Environment } from './Environment';
import { MaterialLibraryImpl } from './MaterialLibrary';

export { TextureBaker } from './TextureBaker';
export type { BakeOptions, ChannelSet } from './TextureBaker';
export { MaterialLibraryImpl } from './MaterialLibrary';
export type { MaterialLibraryStats } from './MaterialLibrary';
export { Environment } from './Environment';
export { generateBlueNoiseChannel } from './BlueNoise';
export { MATERIAL_ORDER, MATERIAL_SPECS } from './generators';
export type { MaterialSpec, ResolutionClass } from './generators';
export {
  addUV2,
  applyWorldUv,
  bevelBox,
  computeTangents,
  mergeGeometries,
  roundedBoxGeometry,
} from './GeometryUtils';

const BLUE_NOISE_SIZE = 64;

/** Wall clock a single eager-bake batch may consume before yielding. */
const BATCH_BUDGET_MS = 20;

/** Frames longer than this are already in trouble; do not add a bake to them. */
const DRIP_MAX_DT = 0.05;

const MB = 1024 * 1024;

/**
 * Cube face resolution the sky is baked at, on every tier.
 *
 * PMREM allocates a 3x4 atlas from this, so 256 costs 3 MB for the cube plus
 * 6 MB for the filtered atlas. It does not scale with tier: the atlas cannot be
 * resized without replacing the output texture, and `environmentMap` has to keep
 * its identity so that a `scene.environment` assignment survives a settings
 * change. Tiers vary the march step count instead, which is where the bake cost
 * actually is.
 */
const SKY_SIZE = 256;

const SKY_STEPS: Record<QualityTier, { viewSteps: number; lightSteps: number }> = {
  ultra: { viewSteps: 28, lightSteps: 8 },
  high: { viewSteps: 22, lightSteps: 6 },
  medium: { viewSteps: 16, lightSteps: 5 },
  low: { viewSteps: 12, lightSteps: 4 },
};

/**
 * Lazy materials the player is most likely to meet in the first seconds, so the
 * background drip pays for them before anything can ask.
 */
const LAZY_PRIORITY: readonly MaterialId[] = [
  'muzzle_flash',
  'tracer',
  'blood_decal',
  'skin',
  'uniform_desert',
  'uniform_woodland',
  'kevlar',
  'gear_nylon',
  'gun_wood',
  'glass_clear',
  'glass_dirty',
  'wood_crate',
  'crate_military',
  'barrel_rusty',
  'metal_grate',
  'steel_brushed',
];

function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Procedural material, environment and noise provider.
 *
 * Every surface in the game is synthesised here: material textures are rendered
 * by fragment shaders into render targets, the environment is a ray-marched
 * atmosphere run through PMREM, and the blue noise is a void-and-cluster field
 * built on the CPU. Nothing is loaded from disk.
 */
export class ProcgenSystemImpl implements ProcgenSystem, System {
  readonly name = 'procgen' as const;
  readonly order = ORDER.INPUT;

  /**
   * Constructed before `init()` so the property is never null. Materials fetched
   * this early exist untextured and are filled in when the renderer arrives.
   */
  readonly materials = new MaterialLibraryImpl();
  readonly blueNoise: THREE.DataTexture = createBlueNoiseTexture(BLUE_NOISE_SIZE);

  /** Overwritten from the world module's sun if one is published. */
  readonly sunDirection = new THREE.Vector3(0.5, 0.7, 0.35).normalize();

  private env: Environment | null = null;
  private pending: MaterialId[] = [];
  private ready = false;

  get environmentMap(): THREE.Texture | null {
    return this.env?.environmentMap ?? null;
  }

  /** Unfiltered sky cube, suitable for `scene.background`. */
  get skyTexture(): THREE.CubeTexture | null {
    return this.env?.skyTexture ?? null;
  }

  async init(ctx: EngineContext): Promise<void> {
    const started = performance.now();
    const config = ctx.config;
    const anisotropy = Math.min(config.anisotropy, ctx.renderer.capabilities.getMaxAnisotropy());

    this.materials.attach({
      renderer: ctx.renderer,
      baseResolution: config.textureResolution,
      anisotropy,
      tier: config.tier,
    });

    this.buildEnvironment(ctx.renderer, config.tier);
    const skyMs = performance.now() - started;
    await nextFrame();

    const materialsStarted = performance.now();
    await this.bakeBatched(this.materials.eagerIds());
    const materialsMs = performance.now() - materialsStarted;

    const noiseStarted = performance.now();
    await fillBlueNoiseTexture(this.blueNoise, nextFrame);
    const noiseMs = performance.now() - noiseStarted;

    this.pending = orderLazily(this.materials.lazyIds());
    this.ready = true;

    const stats = this.materials.stats;
    const resident = stats.bytes + (this.env?.textureBytes ?? 0);
    const projected = this.materials.projectedBytes() + (this.env?.textureBytes ?? 0);
    console.info(
      `[procgen] ${stats.baked}/${stats.total} materials, ${stats.textures} textures, ` +
        `${stats.programs} bake programs, ${stats.passes} passes | ` +
        `${(resident / MB).toFixed(1)} MB resident, ${(projected / MB).toFixed(1)} MB for the full set | ` +
        `sky ${skyMs.toFixed(0)} ms + materials ${materialsMs.toFixed(0)} ms + ` +
        `blue noise ${noiseMs.toFixed(0)} ms = ${(performance.now() - started).toFixed(0)} ms`,
    );
  }

  /**
   * Bakes the remaining materials one per frame. `get()` would bake on demand
   * anyway; spending a frame each here means the cost lands during the opening
   * seconds rather than the first time a surface enters view.
   */
  update(dt: number): void {
    if (!this.ready || this.pending.length === 0 || dt > DRIP_MAX_DT) return;

    const id = this.pending.shift();
    if (id) this.materials.get(id);
    if (this.pending.length === 0) {
      const stats = this.materials.stats;
      const bytes = stats.bytes + (this.env?.textureBytes ?? 0);
      console.info(
        `[procgen] all ${stats.baked} materials resident, ` +
          `${stats.textures} textures, ${(bytes / MB).toFixed(1)} MB`,
      );
    }
  }

  onQualityChanged(config: QualityConfig, ctx: EngineContext): void {
    const anisotropy = Math.min(config.anisotropy, ctx.renderer.capabilities.getMaxAnisotropy());
    this.materials.setDetailTier(config.tier);
    this.materials.setResolution(config.textureResolution, anisotropy);

    const steps = SKY_STEPS[config.tier] ?? SKY_STEPS.high;
    this.env?.setQuality(steps.viewSteps, steps.lightSteps);
  }

  dispose(): void {
    this.materials.dispose();
    this.blueNoise.dispose();
    this.env?.dispose();
    this.env = null;
    this.pending.length = 0;
    this.ready = false;
  }

  // -------------------------------------------------------------------------
  // Extras beyond the contract, for the render and world modules
  // -------------------------------------------------------------------------

  /** Re-bakes the sky and its IBL for a new sun. The texture keeps its identity. */
  setSunDirection(direction: THREE.Vector3): void {
    if (direction.lengthSq() < 1e-8) return;
    this.sunDirection.copy(direction).normalize();
    this.env?.setSunDirection(this.sunDirection);
  }

  /** Sun colour after atmospheric extinction, for matching the directional light. */
  sunTint(target = new THREE.Color()): THREE.Color {
    return this.env ? this.env.sunTint(target) : target.setRGB(1, 0.96, 0.92);
  }

  /** Tuning hooks for time-of-day changes; re-runs the sky bake. */
  setSkyParameters(params: {
    sunIntensity?: number;
    mieStrength?: number;
    gain?: number;
    groundAlbedo?: THREE.ColorRepresentation;
    sunDiscRadiance?: number;
  }): void {
    this.env?.setSkyParameters(params);
  }

  /** Forces a set of materials resident now, ahead of the background drip. */
  warm(ids: Iterable<MaterialId>): void {
    for (const id of ids) this.materials.get(id);
  }

  private buildEnvironment(renderer: THREE.WebGLRenderer, tier: QualityTier): void {
    const steps = SKY_STEPS[tier] ?? SKY_STEPS.high;
    this.env = new Environment(renderer, {
      size: SKY_SIZE,
      viewSteps: steps.viewSteps,
      lightSteps: steps.lightSteps,
      sunDirection: this.sunDirection,
    });
    this.env.render();
    this.materials.setEnvironment(this.env.environmentMap);
  }

  private async bakeBatched(ids: readonly MaterialId[]): Promise<void> {
    let batchStarted = performance.now();
    for (const id of ids) {
      this.materials.get(id);
      if (performance.now() - batchStarted < BATCH_BUDGET_MS) continue;
      await nextFrame();
      batchStarted = performance.now();
    }
  }
}

function orderLazily(ids: readonly MaterialId[]): MaterialId[] {
  const remaining = new Set(ids);
  const ordered: MaterialId[] = [];
  for (const id of LAZY_PRIORITY) {
    if (remaining.delete(id)) ordered.push(id);
  }
  for (const id of ids) {
    if (remaining.delete(id)) ordered.push(id);
  }
  return ordered;
}
