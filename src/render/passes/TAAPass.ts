import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import { TAA_FRAG } from '../../shaders/post/temporal.glsl';

/**
 * Temporal resolve. Owns the colour history, so it also owns the ping-pong: the
 * resolved frame *is* next frame's history, and handing the pipeline a target it
 * might overwrite would silently poison the accumulation.
 */
export class TAAPass {
  /** History weight when the pixel is static. */
  feedback = 0.9;
  /** History weight under fast motion. */
  feedbackMoving = 0.62;
  /** Width of the variance box, in standard deviations. */
  varianceGamma = 1.25;

  private composer: Composer;
  private material: THREE.ShaderMaterial;
  private history: THREE.WebGLRenderTarget[] = [];
  private index = 0;
  private needsReset = true;

  constructor(composer: Composer) {
    this.composer = composer;
    this.material = composer.material(TAA_FRAG, {
      uColor: { value: null },
      uHistory: { value: null },
      uVelocity: { value: null },
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uResolution: { value: new THREE.Vector2() },
      uFeedback: { value: 0.9 },
      uFeedbackMoving: { value: 0.62 },
      uVarianceGamma: { value: 1.25 },
      uReset: { value: 1 },
    });
  }

  configure(quality: QualitySettings): void {
    this.feedback = Math.min(0.97, Math.max(0.5, quality.taaFeedback));
    // The moving weight tracks the static one but stays well below it; this is
    // the ramp that decides whether fast motion ghosts or crawls.
    this.feedbackMoving = Math.max(0.4, this.feedback - 0.28);
  }

  resize(width: number, height: number): void {
    for (const h of this.history) this.composer.destroyTarget(h);
    this.history.length = 0;
    for (let i = 0; i < 2; i++) this.history.push(this.composer.createTarget(width, height));
    (this.material.uniforms.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
    this.needsReset = true;
  }

  resetHistory(): void {
    this.needsReset = true;
  }

  /** Resolves `color` and returns the target holding the result. */
  render(
    color: THREE.Texture,
    velocity: THREE.Texture,
    depth: THREE.Texture,
  ): THREE.WebGLRenderTarget | null {
    if (this.history.length < 2) return null;
    const u = this.material.uniforms;
    const prev = this.history[this.index];
    const next = this.history[1 - this.index];

    u.uColor.value = color;
    u.uHistory.value = prev.texture;
    u.uVelocity.value = velocity;
    u.uDepth.value = depth;
    u.uFeedback.value = this.feedback;
    u.uFeedbackMoving.value = this.feedbackMoving;
    u.uVarianceGamma.value = this.varianceGamma;
    u.uReset.value = this.needsReset ? 1 : 0;

    this.composer.draw(this.material, next);
    this.index = 1 - this.index;
    this.needsReset = false;
    return next;
  }
}
