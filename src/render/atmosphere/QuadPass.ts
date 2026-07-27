import * as THREE from 'three';
import { QUAD_VERT } from '../../shaders/sky/luts.glsl';
import type { Uniforms } from './SkyUniforms';

const CAMERA = new THREE.Camera();

/** One oversized triangle in clip space; cheaper than a quad and never seams. */
function fullscreenGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return g;
}

let sharedGeometry: THREE.BufferGeometry | null = null;

/**
 * A full-screen shader pass that renders into a render target (or one layer of
 * a 3D/cube target). Used for every bake in the sky system.
 */
export class QuadPass {
  readonly material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private scene = new THREE.Scene();

  constructor(fragmentShader: string, uniforms: Uniforms, mrt = 1) {
    if (!sharedGeometry) sharedGeometry = fullscreenGeometry();
    this.material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      glslVersion: mrt > 1 ? THREE.GLSL3 : null,
    });
    this.material.toneMapped = false;
    this.mesh = new THREE.Mesh(sharedGeometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null, layer = 0): void {
    const prev = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(target, layer);
    renderer.render(this.scene, CAMERA);
    renderer.setRenderTarget(prev);
    renderer.autoClear = prevAutoClear;
  }

  dispose(): void {
    this.material.dispose();
  }
}

export function disposeQuadGeometry(): void {
  sharedGeometry?.dispose();
  sharedGeometry = null;
}
