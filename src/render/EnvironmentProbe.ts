import * as THREE from 'three';
import type { QualityConfig } from '../core/Config';
import { Blitter, createRenderTarget } from './Blitter';
import type { Sky } from './Sky';

/**
 * Fallback IBL baked from our own sky.
 *
 * Procgen owns the real environment probe, but it is developed in parallel and
 * may hand back `null` for an arbitrary number of frames — and even when it does
 * publish one, it was baked against procgen's own sun direction. Baking the sky
 * shader into an equirect and running it through `PMREMGenerator` gives a probe
 * that always agrees with the sun the shadows are being cast from.
 *
 * The PMREM target is created once and reused, so `scene.environment` keeps
 * pointing at the same texture object across rebuilds and nothing downstream has
 * to be told the lighting changed.
 */
export class EnvironmentProbe {
  private readonly renderer: THREE.WebGLRenderer;
  private equirect: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator | null = null;
  private pmremTarget: THREE.WebGLRenderTarget | null = null;
  private cooldown = 0;
  private resolution: number;

  constructor(renderer: THREE.WebGLRenderer, config: QualityConfig) {
    this.renderer = renderer;
    this.resolution = EnvironmentProbe.resolutionFor(config);
    this.equirect = createRenderTarget(this.resolution, this.resolution >> 1, {
      type: THREE.HalfFloatType,
      filter: THREE.LinearFilter,
      wrap: THREE.RepeatWrapping,
      name: 'skyEquirect',
    });
    this.equirect.texture.mapping = THREE.EquirectangularReflectionMapping;
  }

  private static resolutionFor(config: QualityConfig): number {
    return Math.max(128, Math.min(512, config.iblResolution));
  }

  get texture(): THREE.Texture | null {
    return this.pmremTarget?.texture ?? null;
  }

  /**
   * Re-bake if the sky reports a change and the cooldown has expired. Returns
   * true when the probe texture identity is new, which only happens on the very
   * first bake.
   */
  update(dt: number, sky: Sky, blitter: Blitter): boolean {
    this.cooldown -= dt;
    if (!sky.needsEnvironmentRebuild || this.cooldown > 0) return false;
    // A bake costs a few hundred microseconds of GPU time; twice a second is far
    // more than enough for a sun that moves on a day/night cycle.
    this.cooldown = 0.45;
    return this.bake(sky, blitter);
  }

  /** Force an immediate bake, used at init and after a quality change. */
  bake(sky: Sky, blitter: Blitter): boolean {
    const previous = this.pmremTarget;
    blitter.blit(this.renderer, sky.captureMaterial, this.equirect);

    if (!this.pmrem) {
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
      this.pmrem.compileEquirectangularShader();
    }
    this.pmremTarget = this.pmrem.fromEquirectangular(this.equirect.texture, this.pmremTarget);
    sky.markEnvironmentClean();
    return previous !== this.pmremTarget;
  }

  onQualityChanged(config: QualityConfig, sky: Sky, blitter: Blitter): boolean {
    const wanted = EnvironmentProbe.resolutionFor(config);
    if (wanted !== this.resolution) {
      this.resolution = wanted;
      this.equirect.setSize(wanted, wanted >> 1);
      // A different cube size means a different PMREM layout; drop the old one.
      this.pmremTarget?.dispose();
      this.pmremTarget = null;
    }
    return this.bake(sky, blitter);
  }

  memoryBytes(): number {
    let bytes = this.equirect.width * this.equirect.height * 8;
    const t = this.pmremTarget;
    if (t) bytes += t.width * t.height * 8;
    return bytes;
  }

  dispose(): void {
    this.equirect.dispose();
    this.pmremTarget?.dispose();
    this.pmremTarget = null;
    this.pmrem?.dispose();
    this.pmrem = null;
  }
}
