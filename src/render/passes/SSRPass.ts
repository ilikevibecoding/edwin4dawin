import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import { SSR_COMPOSITE_FRAG, SSR_FRAG } from '../../shaders/post/ssr.glsl';
import { TEMPORAL_ACCUM_FRAG } from '../../shaders/post/temporal.glsl';
import type { SunLighting } from './SunLighting';

export class SSRPass {
  /** Longest ray, in metres. */
  maxDistance = 42;
  /** Above this roughness a single traced direction stops being representative. */
  maxRoughness = 0.62;
  /** Depth tolerance for accepting a crossing as a real hit, in metres. */
  thickness = 0.4;
  strength = 0.85;
  /** Weight of the analytic sky where a ray leaves the screen. */
  envStrength = 0.55;
  feedback = 0.88;

  private composer: Composer;
  private trace: THREE.ShaderMaterial | null = null;
  private accumulate: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;

  private raw: THREE.WebGLRenderTarget | null = null;
  private history: THREE.WebGLRenderTarget[] = [];
  private index = 0;
  private width = 1;
  private height = 1;
  private steps = 24;
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
      uFeedback: { value: 0.88 },
      uReset: { value: 1 },
    });

    this.composite = composer.material(SSR_COMPOSITE_FRAG, {
      uSSR: { value: null },
      uDepth: { value: null },
      uHalfDepth: { value: null },
      uNormal: { value: null },
      uMotion: { value: null },
      uProjInv: { value: new THREE.Matrix4() },
      uWorldToView: { value: new THREE.Matrix3() },
      uHalfTexel: { value: new THREE.Vector2() },
      uNearFar: { value: new THREE.Vector2() },
      uStrength: { value: 1 },
      uMaxRoughness: { value: this.maxRoughness },
    });
    // Reflections add light on top of what the material already produced.
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendEquation = THREE.AddEquation;
    this.composite.blendSrc = THREE.OneFactor;
    this.composite.blendDst = THREE.OneFactor;
    this.composite.transparent = true;
  }

  get texture(): THREE.Texture | null {
    return this.history.length > 0 ? this.history[this.index].texture : null;
  }

  configure(quality: QualitySettings): void {
    const steps = Math.max(8, Math.min(64, Math.round(quality.ssrSteps)));
    if (steps === this.steps && this.trace) return;
    this.steps = steps;
    const previous = this.trace;
    this.trace = this.composer.material(
      SSR_FRAG,
      {
        uColor: { value: null },
        uDepth: { value: null },
        uHiZ: { value: null },
        uHiZCoarse: { value: null },
        uNormal: { value: null },
        uMotion: { value: null },
        uProj: { value: new THREE.Matrix4() },
        uProjInv: { value: new THREE.Matrix4() },
        uWorldToView: { value: new THREE.Matrix3() },
        uViewToWorld: { value: new THREE.Matrix3() },
        uNearFar: { value: new THREE.Vector2() },
        uTexel: { value: new THREE.Vector2() },
        uFrame: { value: 0 },
        uMaxDistance: { value: this.maxDistance },
        uMaxRoughness: { value: this.maxRoughness },
        uThickness: { value: this.thickness },
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunGlow: { value: new THREE.Vector3(1, 1, 1) },
        uSkyColor: { value: new THREE.Vector3(0.3, 0.4, 0.6) },
        uHorizonColor: { value: new THREE.Vector3(0.4, 0.4, 0.4) },
        uEnvStrength: { value: this.envStrength },
      },
      { STEPS: steps, REFINE: 5 },
    );
    previous?.dispose();
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width >> 1);
    this.height = Math.max(1, height >> 1);
    this.composer.destroyTarget(this.raw);
    for (const h of this.history) this.composer.destroyTarget(h);
    this.history.length = 0;
    this.raw = this.composer.createTarget(this.width, this.height);
    for (let i = 0; i < 2; i++) {
      this.history.push(this.composer.createTarget(this.width, this.height));
    }
    this.needsReset = true;
  }

  resetHistory(): void {
    this.needsReset = true;
  }

  render(
    camera: THREE.PerspectiveCamera,
    color: THREE.Texture,
    depth: THREE.Texture,
    hiz: THREE.Texture,
    hizCoarse: THREE.Texture,
    normal: THREE.Texture,
    motion: THREE.Texture,
    sun: SunLighting,
    frame: number,
  ): void {
    if (!this.raw || !this.trace) return;
    const c = this.composer;
    const u = this.trace.uniforms;

    u.uColor.value = color;
    u.uDepth.value = depth;
    u.uHiZ.value = hiz;
    u.uHiZCoarse.value = hizCoarse;
    u.uNormal.value = normal;
    u.uMotion.value = motion;
    (u.uProj.value as THREE.Matrix4).copy(camera.projectionMatrix);
    (u.uProjInv.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uWorldToView.value as THREE.Matrix3).setFromMatrix4(camera.matrixWorldInverse);
    (u.uViewToWorld.value as THREE.Matrix3).setFromMatrix4(camera.matrixWorld);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    (u.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    u.uFrame.value = frame;
    u.uMaxDistance.value = this.maxDistance;
    u.uMaxRoughness.value = this.maxRoughness;
    u.uThickness.value = this.thickness;
    u.uEnvStrength.value = this.envStrength;
    (u.uSunDirection.value as THREE.Vector3).copy(sun.direction);
    (u.uSunGlow.value as THREE.Vector3).copy(sun.sunGlow);
    (u.uSkyColor.value as THREE.Vector3).copy(sun.skyRadiance);
    (u.uHorizonColor.value as THREE.Vector3).copy(sun.horizonRadiance);
    c.draw(this.trace, this.raw);

    const a = this.accumulate.uniforms;
    const prev = this.history[this.index];
    const next = this.history[1 - this.index];
    a.uCurrent.value = this.raw.texture;
    a.uHistory.value = prev.texture;
    a.uVelocity.value = motion;
    a.uDepth.value = depth;
    (a.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (a.uResolution.value as THREE.Vector2).set(this.width, this.height);
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
    normal: THREE.Texture,
    motion: THREE.Texture,
  ): void {
    const ssr = this.texture;
    if (!ssr) return;
    const u = this.composite.uniforms;
    u.uSSR.value = ssr;
    u.uDepth.value = depth;
    u.uHalfDepth.value = hiz;
    u.uNormal.value = normal;
    u.uMotion.value = motion;
    (u.uProjInv.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uWorldToView.value as THREE.Matrix3).setFromMatrix4(camera.matrixWorldInverse);
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    u.uStrength.value = this.strength;
    u.uMaxRoughness.value = this.maxRoughness;
    this.composer.draw(this.composite, target);
  }
}
