import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import {
  volumetricFrag,
  VOLUMETRIC_COMPOSITE_FRAG,
} from '../../shaders/post/volumetric.glsl';
import { TEMPORAL_ACCUM_FRAG } from '../../shaders/post/temporal.glsl';
import type { SunLighting } from './SunLighting';

/** Dimensions of a 3D texture or 3D render-target texture, for LUT insets. */
function textureSize(texture: THREE.Texture | null): THREE.Vector3 {
  const image = texture?.image as { width?: number; height?: number; depth?: number } | undefined;
  return new THREE.Vector3(image?.width ?? 32, image?.height ?? 32, image?.depth ?? 8);
}

/**
 * Half-resolution volumetric lighting, height fog and aerial perspective.
 *
 * Everything expensive happens in the march, so it runs at quarter the pixels
 * and is bilaterally upsampled, and it accumulates temporally so the step count
 * can stay low without the dithered sampling showing as noise.
 */
/**
 * Extinction of the uniform dust term, per metre.
 *
 * With the sky's aerial-perspective volume available this only has to carry what
 * that volume cannot — shadowed scattering above the ground fog layer — so it is
 * barely more than nothing. Without it, this term is also standing in for the
 * whole atmosphere, so it rises to roughly a 5 km meteorological range, which is
 * a realistic dusty-city day.
 */
const DUST_WITH_AERIAL = 0.00012;
const DUST_STANDALONE = 0.00072;

export class VolumetricPass {
  /**
   * Scattering coefficient of the ground fog layer at its reference height, per
   * metre. 0.0009 is a ~4 km meteorological range at ground level, which reads as
   * a clearly-there morning haze without swallowing the far end of the street.
   * An earlier pass at this used 0.014, which is a sandstorm.
   */
  density = 0.0009;
  /** World height the density is quoted at. */
  height = 0.0;
  /** Metres over which density falls by 1/e above the reference height. */
  falloff = 22;
  /** Forward scattering asymmetry; higher is a tighter glow around the sun. */
  scatterG = 0.72;
  backScatter = -0.24;
  sunIntensity = 1.0;
  /** Fraction of the sky the medium can see; a street is not an open field. */
  ambientScatter = 0.6;
  strength = 1.0;
  feedback = 0.9;
  shadowBias = 0.0016;

  private dust = DUST_STANDALONE;

  private composer: Composer;
  private march: THREE.ShaderMaterial | null = null;
  private accumulate: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;

  private raw: THREE.WebGLRenderTarget | null = null;
  private history: THREE.WebGLRenderTarget[] = [];
  private index = 0;
  private width = 1;
  private height2 = 1;
  private steps = 32;
  private signature = '';
  private needsReset = true;

  constructor(composer: Composer) {
    this.composer = composer;

    this.accumulate = composer.material(TEMPORAL_ACCUM_FRAG, {
      uCurrent: { value: null },
      uHistory: { value: null },
      uVelocity: { value: null },
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uResolution: { value: new THREE.Vector2() },
      uFeedback: { value: 0.9 },
      uReset: { value: 1 },
    });

    this.composite = composer.material(VOLUMETRIC_COMPOSITE_FRAG, {
      uVolume: { value: null },
      uDepth: { value: null },
      uHalfDepth: { value: null },
      uHalfTexel: { value: new THREE.Vector2() },
      uNearFar: { value: new THREE.Vector2() },
      uStrength: { value: 1 },
    });
    // src.rgb + dst.rgb * src.a: in-scatter added, extinction applied.
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendEquation = THREE.AddEquation;
    this.composite.blendSrc = THREE.OneFactor;
    this.composite.blendDst = THREE.SrcAlphaFactor;
    this.composite.transparent = true;
  }

  get texture(): THREE.Texture | null {
    return this.history.length > 0 ? this.history[this.index].texture : null;
  }

  configure(quality: QualitySettings): void {
    this.steps = Math.max(8, Math.min(128, Math.round(quality.volumetricSteps)));
    // Fog without light shafts is still worth having, but it does not need as
    // many steps: the shadow lookup is what the step count is paying for.
    if (!quality.volumetricLighting) this.steps = Math.min(this.steps, 24);
    this.signature = '';
  }

  /** Rebuilds the march when the cascade count or shadow sampling mode changes. */
  private ensureMaterial(sun: SunLighting): void {
    const signature = `${sun.signature}:${this.steps}`;
    if (signature === this.signature && this.march) return;
    this.signature = signature;

    const count = sun.cascades.length;
    const compare = count > 0 && sun.cascades[0].compare;
    const aerial = sun.aerial;
    const uniforms: Record<string, THREE.IUniform> = {
      uHiZ: { value: null },
      uProjInv: { value: new THREE.Matrix4() },
      uViewToWorld: { value: new THREE.Matrix3() },
      uCameraPos: { value: new THREE.Vector3() },
      uNearFar: { value: new THREE.Vector2() },
      uFrame: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uSunIrradiance: { value: new THREE.Vector3(1, 1, 1) },
      uSkyColor: { value: new THREE.Vector3(0.3, 0.4, 0.6) },
      uHorizonColor: { value: new THREE.Vector3(0.4, 0.4, 0.4) },
      uFogDensity: { value: this.density },
      uFogHeight: { value: this.height },
      uFogFalloff: { value: this.falloff },
      uDustDensity: { value: this.dust },
      uScatterG: { value: this.scatterG },
      uBackScatter: { value: this.backScatter },
      uSunIntensity: { value: this.sunIntensity },
      uAmbientScatter: { value: this.ambientScatter },
      uMaxDistance: { value: 400 },
      uShadowBias: { value: this.shadowBias },
    };
    if (count > 0) {
      uniforms.uShadowMatrix = { value: sun.cascades.map(() => new THREE.Matrix4()) };
      uniforms.uCascadeFar = { value: sun.cascades.map((c) => c.far) };
      for (let i = 0; i < count; i++) uniforms[`uShadowMap${i}`] = { value: null };
    }
    if (aerial) {
      uniforms.uAerialInscatter = { value: aerial.inscatter };
      uniforms.uAerialTransmittance = { value: aerial.transmittance };
      uniforms.uAerialSize = { value: textureSize(aerial.inscatter) };
      uniforms.uAerialIrradiance = { value: new THREE.Vector3(1, 1, 1) };
      uniforms.uAerialMaxDistance = { value: aerial.maxDistance };
      uniforms.uSunAzimuth = { value: 0 };
    }

    const previous = this.march;
    this.march = this.composer.material(volumetricFrag(count, compare, aerial !== null), uniforms, {
      STEPS: this.steps,
    });
    previous?.dispose();
    this.needsReset = true;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width >> 1);
    this.height2 = Math.max(1, height >> 1);
    this.composer.destroyTarget(this.raw);
    for (const h of this.history) this.composer.destroyTarget(h);
    this.history.length = 0;
    this.raw = this.composer.createTarget(this.width, this.height2);
    for (let i = 0; i < 2; i++) {
      this.history.push(this.composer.createTarget(this.width, this.height2));
    }
    this.needsReset = true;
  }

  resetHistory(): void {
    this.needsReset = true;
  }

  render(
    camera: THREE.PerspectiveCamera,
    hiz: THREE.Texture,
    depth: THREE.Texture,
    velocity: THREE.Texture,
    sun: SunLighting,
    frame: number,
  ): void {
    this.ensureMaterial(sun);
    if (!this.raw || !this.march) return;
    const c = this.composer;
    const u = this.march.uniforms;

    u.uHiZ.value = hiz;
    (u.uProjInv.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uViewToWorld.value as THREE.Matrix3).setFromMatrix4(camera.matrixWorld);
    camera.getWorldPosition(u.uCameraPos.value as THREE.Vector3);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    u.uFrame.value = frame;
    (u.uSunDirection.value as THREE.Vector3).copy(sun.direction);
    (u.uSunIrradiance.value as THREE.Vector3).copy(sun.sunIrradiance);
    (u.uSkyColor.value as THREE.Vector3).copy(sun.skyRadiance);
    (u.uHorizonColor.value as THREE.Vector3).copy(sun.horizonRadiance);
    u.uFogDensity.value = this.density;
    u.uFogHeight.value = this.height;
    u.uFogFalloff.value = this.falloff;
    u.uScatterG.value = this.scatterG;
    u.uBackScatter.value = this.backScatter;
    u.uSunIntensity.value = this.sunIntensity;
    u.uAmbientScatter.value = this.ambientScatter;
    u.uShadowBias.value = this.shadowBias;
    // Marching past the shadow cascades buys nothing but noise.
    u.uMaxDistance.value = Math.min(camera.far, 420);

    const aerial = sun.aerial;
    this.dust = aerial ? DUST_WITH_AERIAL : DUST_STANDALONE;
    u.uDustDensity.value = this.dust;
    if (aerial && u.uAerialInscatter) {
      u.uAerialInscatter.value = aerial.inscatter;
      u.uAerialTransmittance.value = aerial.transmittance;
      (u.uAerialSize.value as THREE.Vector3).copy(textureSize(aerial.inscatter));
      sun.aerialIrradiance(u.uAerialIrradiance.value as THREE.Vector3);
      u.uAerialMaxDistance.value = aerial.maxDistance;
      u.uSunAzimuth.value = aerial.sunAzimuth;
    }

    if (u.uShadowMatrix) {
      const matrices = u.uShadowMatrix.value as THREE.Matrix4[];
      const fars = u.uCascadeFar.value as number[];
      for (let i = 0; i < matrices.length; i++) {
        const cascade = sun.cascades[i];
        if (!cascade) continue;
        matrices[i].copy(cascade.matrix);
        fars[i] = cascade.far;
        u[`uShadowMap${i}`].value = cascade.texture;
      }
    }

    c.draw(this.march, this.raw);

    const a = this.accumulate.uniforms;
    const prev = this.history[this.index];
    const next = this.history[1 - this.index];
    a.uCurrent.value = this.raw.texture;
    a.uHistory.value = prev.texture;
    a.uVelocity.value = velocity;
    a.uDepth.value = depth;
    (a.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height2);
    (a.uResolution.value as THREE.Vector2).set(this.width, this.height2);
    a.uFeedback.value = this.feedback;
    a.uReset.value = this.needsReset ? 1 : 0;
    c.draw(this.accumulate, next);
    this.index = 1 - this.index;
    this.needsReset = false;
  }

  compositeInto(
    target: THREE.WebGLRenderTarget,
    camera: THREE.PerspectiveCamera,
    depth: THREE.Texture,
    hiz: THREE.Texture,
  ): void {
    const volume = this.texture;
    if (!volume) return;
    const u = this.composite.uniforms;
    u.uVolume.value = volume;
    u.uDepth.value = depth;
    u.uHalfDepth.value = hiz;
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height2);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    u.uStrength.value = this.strength;
    this.composer.draw(this.composite, target);
  }
}
