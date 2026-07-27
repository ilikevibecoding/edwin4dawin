import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import { MOTION_BLUR_FRAG } from '../../shaders/post/camera.glsl';

export class MotionBlurPass {
  /** Fraction of the frame interval the shutter is open. 180 degrees = 0.5. */
  shutterAngle = 0.5;
  /** Longest trail, as a fraction of screen height. */
  maxRadius = 0.045;

  private composer: Composer;
  private material: THREE.ShaderMaterial | null = null;
  private taps = 8;

  constructor(composer: Composer) {
    this.composer = composer;
  }

  configure(quality: QualitySettings): void {
    const taps = Math.max(4, Math.min(24, Math.round(quality.motionBlurSamples)));
    if (taps === this.taps && this.material) return;
    this.taps = taps;
    const previous = this.material;
    this.material = this.composer.material(
      MOTION_BLUR_FRAG,
      {
        uColor: { value: null },
        uVelocity: { value: null },
        uDepth: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uResolution: { value: new THREE.Vector2() },
        uNearFar: { value: new THREE.Vector2() },
        uShutter: { value: 0.5 },
        uMaxRadius: { value: 0.045 },
        uFrame: { value: 0 },
      },
      { TAPS: taps },
    );
    previous?.dispose();
  }

  resize(width: number, height: number): void {
    if (!this.material) return;
    (this.material.uniforms.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  render(
    target: THREE.WebGLRenderTarget,
    color: THREE.Texture,
    velocity: THREE.Texture,
    depth: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    frame: number,
  ): void {
    if (!this.material) return;
    const u = this.material.uniforms;
    u.uColor.value = color;
    u.uVelocity.value = velocity;
    u.uDepth.value = depth;
    (u.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    u.uShutter.value = this.shutterAngle;
    u.uMaxRadius.value = this.maxRadius;
    u.uFrame.value = frame;
    this.composer.draw(this.material, target);
  }
}
