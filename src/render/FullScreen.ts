import * as THREE from 'three';

/**
 * Fullscreen triangle blitter.
 *
 * A single oversized triangle beats a quad: no diagonal seam, one fewer
 * vertex, and better quad-utilisation in the rasteriser. All post passes
 * share one geometry and one camera.
 */
const geometry = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  return g;
})();

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

export const FS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export class FullScreenPass {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.RawShaderMaterial | THREE.ShaderMaterial;
  private readonly scene = new THREE.Scene();

  constructor(material: THREE.ShaderMaterial | THREE.RawShaderMaterial) {
    this.material = material;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.scene.add(this.mesh);
  }

  get uniforms(): Record<string, THREE.IUniform> {
    return (this.material as THREE.ShaderMaterial).uniforms;
  }

  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null): void {
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(this.scene, camera);
    renderer.setRenderTarget(prevTarget);
  }

  dispose(): void {
    this.material.dispose();
  }
}

export function makePass(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  defines: Record<string, string | number> = {},
): FullScreenPass {
  return new FullScreenPass(
    new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader,
      uniforms,
      defines,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    }),
  );
}

/** Shared GLSL helpers injected into post shaders. */
export const GLSL_COMMON = /* glsl */ `
const float PI = 3.14159265359;

float obLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Hash without sine — stable across drivers, unlike fract(sin(x)*43758.5).
float hash12(vec2 p) {
  uvec2 q = uvec2(ivec2(p)) * uvec2(1597334673u, 3812015801u);
  uint n = (q.x ^ q.y) * 1597334673u;
  return float(n) * (1.0 / 4294967296.0);
}

vec3 hash32(vec2 p) {
  uvec2 q = uvec2(ivec2(p));
  uvec3 n = uvec3(q.x, q.y, q.x ^ q.y) * uvec3(1597334673u, 3812015801u, 2798796415u);
  n = (n.x ^ n.y ^ n.z) * uvec3(1597334673u, 3812015801u, 2798796415u);
  return vec3(n) * (1.0 / 4294967296.0);
}

// Reconstruct view-space depth from a non-linear depth buffer sample.
float linearizeDepth(float d, float near, float far) {
  float z = d * 2.0 - 1.0;
  return (2.0 * near * far) / (far + near - z * (far - near));
}
`;
