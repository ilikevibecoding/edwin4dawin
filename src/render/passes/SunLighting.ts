import * as THREE from 'three';
import type { GameContext } from '../../core/GameContext';
import type { AerialPerspective, ILighting, ISky } from '../../core/Interfaces';

/**
 * Adapter that gives the screen-space passes the sun, sky and shadow data they
 * need without coupling them to whatever the lighting rig turns out to be.
 *
 * The volumetric march and the AO composite both need to know where the sun is,
 * how bright it and the sky are, and whether a given world position is in
 * shadow. `ISky` and `ILighting` cover the first two. The third is not in the
 * shared contract — the shape of a cascade rig is an implementation detail of the
 * lighting system — so this discovers it structurally: a `cascades` array if the
 * rig publishes one, otherwise the standard `DirectionalLight.shadow` that every
 * three.js directional light already has. That way volumetrics work against the
 * placeholder single-shadow rig today and pick up cascades for free when the
 * real one lands, with no cross-agent edit.
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
  cascadeLights?: THREE.DirectionalLight[];
}

const SCAN_INTERVAL = 30;

const FLOOR = new THREE.Vector3(1e-4, 1e-4, 1e-4);

function luma(r: number, g: number, b: number): number {
  return r * 0.2126729 + g * 0.7151522 + b * 0.072175;
}

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

  /**
   * Ratio between the key light the renderer is actually shading with and the
   * irradiance the sky reports. Every radiance handed to a screen-space pass is
   * scaled by it, and the aerial-perspective volume with it.
   *
   * In-scattered light has to agree with the surfaces it sits between or the
   * frame goes milky: fog at the sky's 40 klx next to walls lit at 3 arbitrary
   * units is a haze ten times brighter than a sunlit wall, which is the classic
   * "why is my volumetric fog eating the scene" failure. Deriving the ratio from
   * the rig rather than assuming it means the fog stays consistent whatever units
   * the lighting settles on, and the factor becomes exactly 1 once the rig is
   * radiometric.
   */
  calibration = 1;

  /** Changes whenever a material-visible part of the rig changes shape. */
  signature = '0:0:0';

  private sky: ISky | undefined;
  private lighting: LightingLike | undefined;
  private scannedSun: THREE.DirectionalLight | null = null;
  private scannedAmbient = new THREE.Color(0, 0, 0);
  private lastScan = -1000;
  private targetCalibration = 1;

  update(ctx: GameContext, dt: number, frame: number): void {
    this.sky ??= ctx.tryGet<ISky>('sky');
    this.lighting ??= ctx.tryGet<LightingLike>('lighting');

    if (frame - this.lastScan > SCAN_INTERVAL) {
      this.lastScan = frame;
      this.scan(ctx.scene);
    }

    this.updateCalibration(dt);
    this.updateRadiance();
    this.updateShadows(ctx);
  }

  private updateCalibration(dt: number): void {
    const sky = this.sky;
    const key = this.lighting?.sun ?? this.scannedSun;
    if (!sky || !key) {
      this.targetCalibration = 1;
    } else {
      const rig = luma(key.color.r, key.color.g, key.color.b) * key.intensity;
      const physical = luma(sky.sunColor.r, sky.sunColor.g, sky.sunColor.b);
      // Below the horizon the sun's irradiance collapses and the ratio stops
      // meaning anything; hold the last value instead of dividing by nothing.
      if (physical > 0.05 && rig > 1e-4) {
        this.targetCalibration = Math.min(40, Math.max(0.01, rig / physical));
      }
    }
    // Smoothed: the rig's intensity can step when the sun crosses a preset
    // boundary, and fog that pops is worse than fog that lags a few frames.
    const k = 1 - Math.exp(-Math.max(dt, 0) * 4);
    this.calibration += (this.targetCalibration - this.calibration) * k;
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

  /** The volume's irradiance scale, brought into the renderer's own units. */
  aerialIrradiance(out: THREE.Vector3): THREE.Vector3 {
    const e = this.sky?.aerialPerspective?.irradiance;
    if (!e) return out.set(1, 1, 1);
    return out.set(e.r, e.g, e.b).multiplyScalar(this.calibration);
  }

  private updateRadiance(): void {
    const sky = this.sky;
    if (sky) {
      const s = this.calibration;
      this.direction.copy(sky.sunDirection).normalize();
      this.sunIrradiance.set(sky.sunColor.r * s, sky.sunColor.g * s, sky.sunColor.b * s);
      this.skyRadiance.set(sky.skyColor.r * s, sky.skyColor.g * s, sky.skyColor.b * s);
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
    } else if (Array.isArray(lighting?.cascadeLights)) {
      for (const light of lighting.cascadeLights) {
        const cascade = light.shadow ? this.fromShadow(light.shadow) : null;
        if (cascade) this.cascades.push(cascade);
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
