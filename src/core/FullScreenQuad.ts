import * as THREE from 'three';

/**
 * Minimal fullscreen triangle used by every post pass. Kept local so the
 * project has no dependency on the three.js examples build.
 */
export class FullScreenQuad {
  private static geometry: THREE.BufferGeometry | null = null;
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mesh: THREE.Mesh;

  constructor(material: THREE.Material) {
    if (!FullScreenQuad.geometry) {
      const g = new THREE.BufferGeometry();
      // Oversized triangle avoids the diagonal seam of a two-triangle quad.
      g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
      FullScreenQuad.geometry = g;
    }
    this.mesh = new THREE.Mesh(FullScreenQuad.geometry, material);
    this.mesh.frustumCulled = false;
  }

  set material(m: THREE.Material) {
    this.mesh.material = m;
  }

  get material(): THREE.Material {
    return this.mesh.material as THREE.Material;
  }

  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.mesh, this.camera);
  }

  dispose(): void {
    (this.mesh.material as THREE.Material).dispose();
  }
}

export const FS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
