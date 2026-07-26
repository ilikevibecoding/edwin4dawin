import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_COMMON, GLSL_DEPTH } from '../ShaderLib';

/**
 * Camera-reprojection motion vectors.
 *
 * A true MRT velocity target would need every material in the game to write a
 * second attachment, which is impossible when eleven modules author materials
 * independently. Reprojecting the depth buffer through the previous
 * view-projection gives exact vectors for camera motion — which is the entire
 * budget in a first-person shooter — and zero for object motion, which motion
 * blur compensates for by dilating tiles and TAA compensates for with its
 * neighbourhood clamp.
 */

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uReprojection;   // prevViewProj * inverse( currViewProj )

${GLSL_COMMON}
${GLSL_DEPTH}

void main() {
  float depth = texture2D( uDepth, vUv ).x;

  // The sky is reprojected too, not special-cased to zero: at depth 1.0 the
  // far-plane point is finite, so the same maths yields the rotation-only motion
  // that keeps god rays and cloud edges from shimmering under TAA.
  vec4 clip = vec4( vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0 );
  vec4 prev = uReprojection * clip;
  vec2 prevUv = ( prev.xy / prev.w ) * 0.5 + 0.5;

  vec2 velocity = vUv - prevUv;
  gl_FragColor = vec4( velocity, 0.0, obLinear01( depth ) );
}
`;

export class VelocityPass {
  target: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;

  private readonly currViewProj = new THREE.Matrix4();
  private readonly prevViewProj = new THREE.Matrix4();
  private readonly invCurr = new THREE.Matrix4();
  // Snapshotted before TAA jitters the projection, so the motion vectors carry
  // camera motion only and not the sub-pixel offset TAA deliberately adds.
  private readonly projection = new THREE.Matrix4();
  private readonly invProjection = new THREE.Matrix4();
  private near = 0.05;
  private far = 1600;
  private hasHistory = false;

  constructor(width: number, height: number) {
    this.target = createRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      filter: THREE.LinearFilter,
      name: 'velocity',
    });
    this.uniforms = {
      uDepth: { value: null },
      uReprojection: { value: new THREE.Matrix4() },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms);
  }

  /**
   * Snapshot the un-jittered view-projection. Must run once per frame *before*
   * TAA offsets the projection matrix.
   */
  captureCamera(camera: THREE.PerspectiveCamera): void {
    camera.updateMatrixWorld();
    this.currViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.projection.copy(camera.projectionMatrix);
    this.invProjection.copy(camera.projectionMatrixInverse);
    this.near = camera.near;
    this.far = camera.far;
    if (!this.hasHistory) {
      this.prevViewProj.copy(this.currViewProj);
      this.hasHistory = true;
    }
  }

  render(renderer: THREE.WebGLRenderer, blitter: Blitter, depth: THREE.Texture): void {
    this.uniforms.uDepth.value = depth;
    (this.uniforms.uProjParams.value as THREE.Vector4).set(this.near, this.far, 0, 0);
    (this.uniforms.uInvProjection.value as THREE.Matrix4).copy(this.invProjection);
    (this.uniforms.uProjection.value as THREE.Matrix4).copy(this.projection);

    this.invCurr.copy(this.currViewProj).invert();
    (this.uniforms.uReprojection.value as THREE.Matrix4).multiplyMatrices(
      this.prevViewProj,
      this.invCurr,
    );

    blitter.blit(renderer, this.material, this.target);
  }

  /** Roll the history forward; call at the very end of the frame. */
  endFrame(): void {
    this.prevViewProj.copy(this.currViewProj);
  }

  /** Drop the history so the next frame reports zero motion everywhere. */
  reset(): void {
    this.hasHistory = false;
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  setSize(width: number, height: number): void {
    this.target.setSize(Math.max(1, width), Math.max(1, height));
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
  }
}
