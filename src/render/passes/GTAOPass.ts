import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import { aoCompositeFrag, AO_DENOISE_FRAG, GTAO_FRAG } from '../../shaders/post/gtao.glsl';
import type { SunLighting } from './SunLighting';

/** Slice and step counts per `ssaoQuality`. Cost is roughly slices x steps. */
const QUALITY: Record<QualitySettings['ssaoQuality'], { slices: number; steps: number }> = {
  low: { slices: 2, steps: 4 },
  medium: { slices: 3, steps: 6 },
  high: { slices: 4, steps: 8 },
};

export class GTAOPass {
  /** World-space radius the horizon search covers. */
  radius = 1.4;
  intensity = 1.0;
  /** 0 = solid occluders, 1 = fully transparent to thin geometry. */
  thickness = 0.35;
  /** Temporal feedback for the AO denoiser. */
  feedback = 0.9;

  private composer: Composer;
  private trace: THREE.ShaderMaterial | null = null;
  private denoise: THREE.ShaderMaterial;
  private composite!: THREE.ShaderMaterial;
  private compositeCompare = false;

  private aoTarget: THREE.WebGLRenderTarget | null = null;
  private history: THREE.WebGLRenderTarget[] = [];
  private index = 0;
  private width = 1;
  private height = 1;
  private slices = 3;
  private steps = 6;
  private needsReset = true;

  constructor(composer: Composer) {
    this.composer = composer;

    this.denoise = composer.material(AO_DENOISE_FRAG, {
      uAO: { value: null },
      uHistory: { value: null },
      uVelocity: { value: null },
      uHiZ: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uNearFar: { value: new THREE.Vector2() },
      uFeedback: { value: 0.9 },
      uReset: { value: 1 },
    });

    this.buildComposite(false);
  }

  /**
   * The shadow map has a comparison function attached when the rig uses PCF, and
   * a texture in that state can only be read through `sampler2DShadow`, so the
   * composite has to be compiled for whichever mode the rig turns out to use.
   */
  private buildComposite(compare: boolean): void {
    const previous = this.composite as THREE.ShaderMaterial | undefined;
    this.compositeCompare = compare;
    this.composite = this.composer.material(aoCompositeFrag(compare), {
      uAO: { value: null },
      uDepth: { value: null },
      uHalfDepth: { value: null },
      uNormal: { value: null },
      uShadowMap: { value: null },
      uShadowMatrix: { value: new THREE.Matrix4() },
      uInvViewProj: { value: new THREE.Matrix4() },
      uHalfTexel: { value: new THREE.Vector2() },
      uNearFar: { value: new THREE.Vector2() },
      uSunColor: { value: new THREE.Vector3(1, 1, 1) },
      uSkyColor: { value: new THREE.Vector3(0.1, 0.12, 0.16) },
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uIntensity: { value: 1 },
      uHasShadow: { value: 0 },
    });
    // dst * src: occlusion multiplies the frame already in the target.
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendEquation = THREE.AddEquation;
    this.composite.blendSrc = THREE.DstColorFactor;
    this.composite.blendDst = THREE.ZeroFactor;
    this.composite.transparent = true;
    previous?.dispose();
  }

  get texture(): THREE.Texture | null {
    return this.history.length > 0 ? this.history[this.index].texture : null;
  }

  configure(quality: QualitySettings): void {
    const q = QUALITY[quality.ssaoQuality] ?? QUALITY.medium;
    // GTAO's slice integral is the whole point; when `gtao` is off this drops to
    // the smallest slice count rather than switching to a different estimator.
    const slices = quality.gtao ? q.slices : Math.max(2, q.slices - 1);
    const steps = quality.gtao ? q.steps : Math.max(3, q.steps - 2);
    if (slices === this.slices && steps === this.steps && this.trace) return;
    this.slices = slices;
    this.steps = steps;
    this.trace = this.composer.material(
      GTAO_FRAG,
      {
        uHiZ: { value: null },
        uNormal: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uResolution: { value: new THREE.Vector2() },
        uNearFar: { value: new THREE.Vector2() },
        uProjInv: { value: new THREE.Matrix4() },
        uWorldToView: { value: new THREE.Matrix3() },
        uRadius: { value: this.radius },
        uProjScale: { value: 1 },
        uThickness: { value: this.thickness },
        uFrame: { value: 0 },
      },
      { SLICES: slices, STEPS: steps },
    );
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width >> 1);
    this.height = Math.max(1, height >> 1);
    this.composer.destroyTarget(this.aoTarget);
    for (const h of this.history) this.composer.destroyTarget(h);
    this.history.length = 0;

    this.aoTarget = this.composer.createTarget(this.width, this.height);
    for (let i = 0; i < 2; i++) {
      this.history.push(this.composer.createTarget(this.width, this.height));
    }
    this.needsReset = true;
  }

  resetHistory(): void {
    this.needsReset = true;
  }

  /**
   * Traces and denoises the AO buffer. Nothing is written to the scene here; the
   * composite is a separate blended pass so it can run after the caller has
   * finished reading the buffers this pass consumes.
   */
  render(
    camera: THREE.PerspectiveCamera,
    hiz: THREE.Texture,
    normal: THREE.Texture,
    velocity: THREE.Texture,
    frame: number,
  ): void {
    if (!this.aoTarget || !this.trace) return;
    const c = this.composer;

    const u = this.trace.uniforms;
    u.uHiZ.value = hiz;
    u.uNormal.value = normal;
    (u.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (u.uResolution.value as THREE.Vector2).set(this.width, this.height);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    (u.uProjInv.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uWorldToView.value as THREE.Matrix3).setFromMatrix4(camera.matrixWorldInverse);
    u.uRadius.value = this.radius;
    u.uThickness.value = this.thickness;
    u.uFrame.value = frame;
    // Half-res pixels per world unit at one metre: e[5] is 1/tan(fovY/2).
    u.uProjScale.value = camera.projectionMatrix.elements[5] * this.height * 0.5;
    c.draw(this.trace, this.aoTarget);

    const d = this.denoise.uniforms;
    const prev = this.history[this.index];
    const next = this.history[1 - this.index];
    d.uAO.value = this.aoTarget.texture;
    d.uHistory.value = prev.texture;
    d.uVelocity.value = velocity;
    d.uHiZ.value = hiz;
    (d.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (d.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    d.uFeedback.value = this.feedback;
    d.uReset.value = this.needsReset ? 1 : 0;
    c.draw(this.denoise, next);
    this.index = 1 - this.index;
    this.needsReset = false;
  }

  /** Multiplies the target's ambient term by the occlusion. */
  compositeInto(
    target: THREE.WebGLRenderTarget,
    camera: THREE.PerspectiveCamera,
    depth: THREE.Texture,
    hiz: THREE.Texture,
    normal: THREE.Texture,
    sun: SunLighting,
  ): void {
    const ao = this.texture;
    if (!ao) return;
    const cascade = sun.cascades[0];
    if (cascade && cascade.compare !== this.compositeCompare) this.buildComposite(cascade.compare);

    const u = this.composite.uniforms;
    u.uAO.value = ao;
    u.uDepth.value = depth;
    u.uHalfDepth.value = hiz;
    u.uNormal.value = normal;
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    (u.uInvViewProj.value as THREE.Matrix4)
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
    (u.uSunColor.value as THREE.Vector3).copy(sun.sunIrradiance);
    (u.uSkyColor.value as THREE.Vector3).copy(sun.skyRadiance);
    (u.uSunDirection.value as THREE.Vector3).copy(sun.direction);
    u.uIntensity.value = this.intensity;

    if (cascade) {
      u.uShadowMap.value = cascade.texture;
      (u.uShadowMatrix.value as THREE.Matrix4).copy(cascade.matrix);
      u.uHasShadow.value = 1;
    } else {
      u.uHasShadow.value = 0;
    }

    this.composer.draw(this.composite, target);
  }
}
