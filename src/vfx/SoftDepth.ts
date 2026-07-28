import * as THREE from 'three';
import { makePass, type FullScreenPass } from '../render/FullScreen';

/**
 * A readable copy of scene depth for soft particles.
 *
 * The pipeline's depth texture is the depth *attachment* of the colour target
 * the world pass draws into, and particles are drawn inside that same pass. A
 * shader cannot sample a texture that is attached to the framebuffer it is
 * writing to: the read is a feedback loop, and what comes back is whatever the
 * driver feels like — under ANGLE/SwiftShader it is zero, which linearises to
 * the near plane and therefore faded every particle in the game to nothing.
 *
 * So the depth is copied out of the loop instead. The copy runs in
 * `lateUpdate`, before the pipeline binds its targets, which means it captures
 * the *previous* frame's depth. That is one frame of reprojection error on a
 * term whose whole job is to be a soft gradient, and it is invisible; a
 * feedback-looped read is not.
 *
 * Stored as linear view depth in a half-float red target at half resolution:
 * the fade spans half a metre, so a quarter of the pixels carry it perfectly
 * well and the pass costs nothing.
 */
export class SoftDepth {
  private target: THREE.WebGLRenderTarget | null = null;
  private pass: FullScreenPass | null = null;
  private w = 0;
  private h = 0;

  /** Linear view-space depth in metres; `1e6` where nothing was drawn. */
  get texture(): THREE.Texture | null {
    return this.target?.texture ?? null;
  }

  update(
    renderer: THREE.WebGLRenderer,
    depth: THREE.Texture | null,
    width: number,
    height: number,
    near: number,
    far: number,
  ): void {
    if (!depth) return;

    const w = Math.max(1, Math.floor(width * 0.5));
    const h = Math.max(1, Math.floor(height * 0.5));
    if (!this.target || w !== this.w || h !== this.h) {
      this.target?.dispose();
      this.target = new THREE.WebGLRenderTarget(w, h, {
        format: THREE.RedFormat,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      this.target.texture.generateMipmaps = false;
      this.w = w;
      this.h = h;
    }

    if (!this.pass) {
      this.pass = makePass(
        /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform float uNear;
        uniform float uFar;
        uniform vec2 uTexel;

        float linear(float d) {
          if (d <= 0.0 || d >= 1.0) return 1.0e6;
          float z = d * 2.0 - 1.0;
          return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
        }

        void main() {
          // Take the nearest of the four full-res texels this half-res texel
          // covers. Averaging depth across a silhouette invents a surface that
          // is not there and haloes the particle behind it.
          float d = min(
            min(linear(texture2D(tDepth, vUv + vec2(-0.5, -0.5) * uTexel).x),
                linear(texture2D(tDepth, vUv + vec2( 0.5, -0.5) * uTexel).x)),
            min(linear(texture2D(tDepth, vUv + vec2(-0.5,  0.5) * uTexel).x),
                linear(texture2D(tDepth, vUv + vec2( 0.5,  0.5) * uTexel).x)));
          gl_FragColor = vec4(d, 0.0, 0.0, 1.0);
        }
        `,
        {
          tDepth: { value: null },
          uNear: { value: 0.05 },
          uFar: { value: 3000 },
          uTexel: { value: new THREE.Vector2() },
        },
      );
    }

    const u = this.pass.uniforms;
    u.tDepth.value = depth;
    u.uNear.value = near;
    u.uFar.value = far;
    (u.uTexel.value as THREE.Vector2).set(1 / Math.max(1, width), 1 / Math.max(1, height));
    this.pass.render(renderer, this.target);
    renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.target?.dispose();
    this.pass?.dispose();
    this.target = null;
    this.pass = null;
  }
}
