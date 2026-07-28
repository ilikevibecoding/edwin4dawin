import * as THREE from 'three';
import type { GameContext } from '../../core/GameContext';
import type { AerialPerspective, ILighting, ISky } from '../../core/Interfaces';

/**
 * Adapter that gives the screen-space passes the sun, sky and shadow data they
 * need without coupling them to whatever the lighting rig turns out to be.
 *
 * The volumetric march and the AO composite both need to know where the sun is,
 * how bright it and the sky are, and whether a given world position is in
 * shadow. `ISky` covers the first two directly and in absolute units: the rig
 * drives its key light from `ISky.sunColor` verbatim, so the radiance a
 * screen-space pass scatters and the radiance a surface reflects are the same
 * number and no reconciliation is needed. The third is not in the shared
 * contract — the shape of a cascade rig is an implementation detail of the
 * lighting system — so this reads the `cascades` array the rig publishes, and
 * falls back to the standard `DirectionalLight.shadow` that every three.js
 * directional light already has.
 *
 * When no lighting system is registered at all it falls back to scanning the
 * scene for lights, so the pipeline still produces shafts and aerial perspective
 * standalone.
 */

export interface ShadowCascade {
  matrix: THREE.Matrix4;
  texture: THREE.Texture;
  /** View distance at which this cascade stops being valid. */
  far: number;
  /** True when the texture has a comparison function and needs sampler2DShadow. */
  compare: boolean;
}

/** Structural shapes we probe for on the lighting system. */
interface CascadeLike {
  shadow?: THREE.DirectionalLightShadow;
  light?: { shadow?: THREE.DirectionalLightShadow };
  matrix?: THREE.Matrix4;
  far?: number;
  split?: number;
}

interface LightingLike extends ILighting {
  cascades?: CascadeLike[];
}

const SCAN_INTERVAL = 30;

const FLOOR = new THREE.Vector3(1e-4, 1e-4, 1e-4);

export class SunLighting {
  readonly direction = new THREE.Vector3(0.4, 0.75, 0.5).normalize();
  /**
   * Irradiance on a surface facing the sun, in engine units (kilolux), straight
   * off `ISky.sunColor`. This is what a scattering integral wants: in-scattered
   * radiance is `sigmaS * phase * irradiance`, so the 1/4pi in the phase
   * function is what turns it back into a radiance.
   */
  readonly sunIrradiance = new THREE.Vector3(60, 56, 50);
  /** Cosine-weighted hemisphere average sky radiance, in kilonits. */
  readonly skyRadiance = new THREE.Vector3(4, 5, 7);
  /** Horizon-ring radiance: warmer and brighter than the hemisphere average. */
  readonly horizonRadiance = new THREE.Vector3(5, 5, 5.6);
  /**
   * Radiance of the aureole immediately around the sun, for passes that need a
   * highlight in a sky they are approximating. Deliberately derived from the
   * sky's radiance rather than the sun's irradiance: a reflection of the solar
   * disk at its true magnitude is four orders of magnitude out of the range
   * anything on screen needs, and reads as a blown white hole.
   */
  readonly sunGlow = new THREE.Vector3(12, 12, 13);
  readonly cascades: ShadowCascade[] = [];

  /** Changes whenever a material-visible part of the rig changes shape. */
  signature = '0:0:0';

  private sky: ISky | undefined;
  private lighting: LightingLike | undefined;
  private scannedSun: THREE.DirectionalLight | null = null;
  private scannedAmbient = new THREE.Color(0, 0, 0);
  private lastScan = -1000;

  update(ctx: GameContext, frame: number): void {
    this.sky ??= ctx.tryGet<ISky>('sky');
    this.lighting ??= ctx.tryGet<LightingLike>('lighting');

    if (frame - this.lastScan > SCAN_INTERVAL) {
      this.lastScan = frame;
      this.scan(ctx.scene);
    }

    this.updateRadiance();
    this.updateShadows(ctx);
  }

  /**
   * The sky's precomputed aerial-perspective volume, or null when the sky does
   * not publish one (or has not baked it yet). Passes that use it must handle
   * both cases: it appears a frame or two after the sky initialises.
   */
  get aerial(): AerialPerspective | null {
    const ap = this.sky?.aerialPerspective;
    if (!ap || !ap.inscatter || !ap.transmittance) return null;
    return ap;
  }

  /** The volume's irradiance scale. */
  aerialIrradiance(out: THREE.Vector3): THREE.Vector3 {
    const e = this.sky?.aerialPerspective?.irradiance;
    if (!e) return out.set(1, 1, 1);
    return out.set(e.r, e.g, e.b);
  }

  private updateRadiance(): void {
    const sky = this.sky;
    if (sky) {
      this.direction.copy(sky.sunDirection).normalize();
      this.sunIrradiance.set(sky.sunColor.r, sky.sunColor.g, sky.sunColor.b);
      this.skyRadiance.set(sky.skyColor.r, sky.skyColor.g, sky.skyColor.b);
    } else {
      const sun = this.lighting?.sun ?? this.scannedSun;
      if (sun) {
        // A directional light's direction is from its position toward its target.
        this.direction.copy(sun.position);
        if (sun.target) this.direction.sub(sun.target.position);
        if (this.direction.lengthSq() < 1e-8) this.direction.set(0, 1, 0);
        this.direction.normalize();
        const i = sun.intensity;
        this.sunIrradiance.set(sun.color.r * i, sun.color.g * i, sun.color.b * i);
      }
      this.skyRadiance.set(this.scannedAmbient.r, this.scannedAmbient.g, this.scannedAmbient.b);
    }

    // The horizon is warmer and brighter than the zenith at every time of day.
    // Both of these only feed the analytic sky the screen-space passes fall back
    // to, so an approximation that agrees with the palette is enough; the ratios
    // matter and the absolute level comes from the sky.
    const sunTint = Math.max(this.sunIrradiance.x, 1e-4);
    this.horizonRadiance
      .set(
        this.skyRadiance.x * 1.35,
        this.skyRadiance.y * 1.22 * (0.94 + 0.06 * (this.sunIrradiance.y / sunTint)),
        this.skyRadiance.z * 1.05 * (0.9 + 0.1 * (this.sunIrradiance.z / sunTint)),
      )
      .max(FLOOR);
    this.sunGlow.copy(this.horizonRadiance).multiplyScalar(2.4).max(FLOOR);
  }

  private scan(scene: THREE.Scene): void {
    if (this.lighting?.sun && this.sky) return;
    let sun: THREE.DirectionalLight | null = null;
    let strongest = -1;
    this.scannedAmbient.setRGB(0, 0, 0);

    scene.traverse((object) => {
      const light = object as THREE.Light;
      if (!light.isLight) return;
      const dir = light as THREE.DirectionalLight;
      if (dir.isDirectionalLight && dir.intensity > strongest) {
        strongest = dir.intensity;
        sun = dir;
        return;
      }
      const hemi = light as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) {
        this.scannedAmbient.r += hemi.color.r * hemi.intensity * 0.5;
        this.scannedAmbient.g += hemi.color.g * hemi.intensity * 0.5;
        this.scannedAmbient.b += hemi.color.b * hemi.intensity * 0.5;
        return;
      }
      const amb = light as THREE.AmbientLight;
      if (amb.isAmbientLight) {
        this.scannedAmbient.r += amb.color.r * amb.intensity;
        this.scannedAmbient.g += amb.color.g * amb.intensity;
        this.scannedAmbient.b += amb.color.b * amb.intensity;
      }
    });

    this.scannedSun = sun;
    if (this.scannedAmbient.r + this.scannedAmbient.g + this.scannedAmbient.b < 1e-4) {
      this.scannedAmbient.setRGB(0.16, 0.2, 0.3);
    }
  }

  private updateShadows(ctx: GameContext): void {
    this.cascades.length = 0;
    if (!ctx.quality.shadows) {
      this.setSignature();
      return;
    }

    const lighting = this.lighting;
    const list = lighting?.cascades;
    if (Array.isArray(list) && list.length > 0) {
      for (const entry of list) {
        const shadow = entry.shadow ?? entry.light?.shadow;
        const cascade = shadow ? this.fromShadow(shadow, entry.far ?? entry.split) : null;
        if (cascade) {
          if (entry.matrix) cascade.matrix.copy(entry.matrix);
          this.cascades.push(cascade);
        }
        if (this.cascades.length === 4) break;
      }
    }

    if (this.cascades.length === 0) {
      const sun = lighting?.sun ?? this.scannedSun;
      const cascade = sun?.castShadow && sun.shadow ? this.fromShadow(sun.shadow) : null;
      if (cascade) this.cascades.push(cascade);
    }

    this.setSignature();
  }

  private fromShadow(
    shadow: THREE.DirectionalLightShadow,
    far?: number,
  ): ShadowCascade | null {
    const map = shadow.map;
    if (!map) return null;
    const depth = map.depthTexture as THREE.DepthTexture | null;
    const texture = depth ?? map.texture;
    if (!texture) return null;
    const compare =
      depth !== null && depth !== undefined && (depth.compareFunction ?? null) !== null;
    return {
      matrix: new THREE.Matrix4().copy(shadow.matrix),
      texture,
      far: far ?? shadow.camera.far,
      compare,
    };
  }

  private setSignature(): void {
    const compare = this.cascades.length > 0 && this.cascades[0].compare ? 1 : 0;
    this.signature = `${this.cascades.length}:${compare}:${this.aerial ? 1 : 0}`;
  }
}
