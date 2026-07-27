import * as THREE from 'three';
import { Composer } from './Composer';
import { EXPOSURE_FRAG, LUM_DOWNSAMPLE_FRAG } from '../../shaders/post/grade.glsl';

/** Metering grid. 24x24 centre-weighted samples is enough to bin reliably. */
const LUM_SIZE = 24;

/**
 * Histogram auto exposure.
 *
 * The metered value never leaves the GPU: the adapted EV lives in a 1x1
 * half-float ping-pong that the grade pass samples directly. Reading it back to
 * JavaScript would stall the pipeline for a value nothing on the CPU needs.
 */
export class AutoExposure {
  /** Target middle grey the meter aims for. */
  key = 0.14;
  /**
   * Clamp on the exposure the meter may apply, in stops.
   *
   * The scene is in absolute engine units where one unit is a kilonit, so a
   * sunlit street meters around 5 units and needs about -5 stops to land on
   * middle grey, while a night interior can need +4. The window has to cover
   * that whole span or the meter saturates and the frame goes white or black —
   * which is what a range centred on 0 does the moment the scene is physical
   * rather than normalised.
   */
  minEV = -14;
  maxEV = 6;
  /** Adaptation rate in 1/seconds; the eye brightens faster than it darkens. */
  speedUp = 3.2;
  speedDown = 1.4;
  lowPercent = 0.35;
  highPercent = 0.92;

  private composer: Composer;
  private lum: THREE.WebGLRenderTarget;
  private history: THREE.WebGLRenderTarget[] = [];
  private index = 0;
  private downsample: THREE.ShaderMaterial;
  private adapt: THREE.ShaderMaterial;
  private needsReset = true;

  constructor(composer: Composer) {
    this.composer = composer;
    this.lum = composer.createTarget(LUM_SIZE, LUM_SIZE, {
      format: THREE.RGFormat,
      filter: THREE.NearestFilter,
    });
    for (let i = 0; i < 2; i++) {
      this.history.push(
        composer.createTarget(1, 1, { format: THREE.RGBAFormat, filter: THREE.NearestFilter }),
      );
    }

    this.downsample = composer.material(LUM_DOWNSAMPLE_FRAG, {
      uColor: { value: null },
      uFootprint: { value: new THREE.Vector2(1 / LUM_SIZE, 1 / LUM_SIZE) },
    });
    this.adapt = composer.material(EXPOSURE_FRAG, {
      uLum: { value: this.lum.texture },
      uPrev: { value: null },
      uLumSize: { value: new THREE.Vector2(LUM_SIZE, LUM_SIZE) },
      uDt: { value: 1 / 60 },
      uMinLogLum: { value: -12 },
      uMaxLogLum: { value: 16 },
      uKey: { value: this.key },
      uMinEV: { value: this.minEV },
      uMaxEV: { value: this.maxEV },
      uSpeedUp: { value: this.speedUp },
      uSpeedDown: { value: this.speedDown },
      uLowPercent: { value: this.lowPercent },
      uHighPercent: { value: this.highPercent },
      uReset: { value: 1 },
    });
  }

  get texture(): THREE.Texture {
    return this.history[this.index].texture;
  }

  get luminanceTexture(): THREE.Texture {
    return this.lum.texture;
  }

  reset(): void {
    this.needsReset = true;
  }

  update(source: THREE.Texture, dt: number): void {
    this.downsample.uniforms.uColor.value = source;
    this.composer.draw(this.downsample, this.lum);

    const prev = this.history[this.index];
    const next = this.history[1 - this.index];
    const u = this.adapt.uniforms;
    u.uPrev.value = prev.texture;
    u.uDt.value = Math.min(dt, 0.25);
    u.uKey.value = this.key;
    u.uMinEV.value = this.minEV;
    u.uMaxEV.value = this.maxEV;
    u.uSpeedUp.value = this.speedUp;
    u.uSpeedDown.value = this.speedDown;
    u.uLowPercent.value = this.lowPercent;
    u.uHighPercent.value = this.highPercent;
    u.uReset.value = this.needsReset ? 1 : 0;
    this.composer.draw(this.adapt, next);
    this.index = 1 - this.index;
    this.needsReset = false;
  }
}
