import * as THREE from 'three';

/**
 * View-aligned beam pool.
 *
 * Every instance is a quad stretched between two world points and twisted to
 * face the camera, which is how blaster bolts, spark streaks and tracer trails
 * are drawn. One draw call for the entire pool.
 */
export class BeamRenderer {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private geo: THREE.InstancedBufferGeometry;
  private aStart: THREE.InstancedBufferAttribute;
  private aEnd: THREE.InstancedBufferAttribute;
  private aWidth: THREE.InstancedBufferAttribute;
  private aColor: THREE.InstancedBufferAttribute;
  private aAlpha: THREE.InstancedBufferAttribute;
  private count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    // Unit quad: x in [0,1] runs along the beam, y in [-0.5,0.5] across it.
    const positions = new Float32Array([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const index = [0, 1, 2, 0, 2, 3];

    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geo.setIndex(index);
    this.geo.instanceCount = 0;

    this.aStart = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aEnd = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aWidth = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    for (const a of [this.aStart, this.aEnd, this.aWidth, this.aColor, this.aAlpha]) {
      a.setUsage(THREE.DynamicDrawUsage);
    }
    this.geo.setAttribute('iStart', this.aStart);
    this.geo.setAttribute('iEnd', this.aEnd);
    this.geo.setAttribute('iWidth', this.aWidth);
    this.geo.setAttribute('iColor', this.aColor);
    this.geo.setAttribute('iAlpha', this.aAlpha);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: /* glsl */ `
        attribute vec3 iStart;
        attribute vec3 iEnd;
        attribute float iWidth;
        attribute vec3 iColor;
        attribute float iAlpha;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vColor = iColor;
          vAlpha = iAlpha;
          vec3 mid = mix(iStart, iEnd, position.x);
          vec3 axis = iEnd - iStart;
          vec3 toCam = cameraPosition - mid;
          vec3 side = cross(axis, toCam);
          float len = length(side);
          // Degenerate when looking straight down the beam: fall back to any
          // perpendicular so the bolt stays visible as a dot.
          side = len > 1e-6 ? side / len : normalize(cross(axis, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
          vec3 world = mid + side * (position.y * iWidth);
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          // Bright white core with a coloured halo, tapered at both ends.
          float across = abs(vUv.y - 0.5) * 2.0;
          float along = min(vUv.x, 1.0 - vUv.x) * 2.0;
          float radial = 1.0 - across;
          float core = pow(clamp(radial, 0.0, 1.0), 6.0);
          float halo = pow(clamp(radial, 0.0, 1.0), 1.7);
          float cap = smoothstep(0.0, 0.35, along);
          vec3 col = vColor * halo + vec3(1.0) * core * 0.85;
          float a = (halo * 0.85 + core) * cap * vAlpha;
          if (a < 0.003) discard;
          gl_FragColor = vec4(col * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.name = 'BeamRenderer';
  }

  begin(): void {
    this.count = 0;
  }

  push(
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    color: THREE.Color,
    alpha: number,
  ): void {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    const s = this.aStart.array as Float32Array;
    const e = this.aEnd.array as Float32Array;
    s[i * 3] = start.x;
    s[i * 3 + 1] = start.y;
    s[i * 3 + 2] = start.z;
    e[i * 3] = end.x;
    e[i * 3 + 1] = end.y;
    e[i * 3 + 2] = end.z;
    (this.aWidth.array as Float32Array)[i] = width;
    const c = this.aColor.array as Float32Array;
    c[i * 3] = color.r;
    c[i * 3 + 1] = color.g;
    c[i * 3 + 2] = color.b;
    (this.aAlpha.array as Float32Array)[i] = alpha;
  }

  end(): void {
    this.geo.instanceCount = this.count;
    if (this.count === 0) return;
    this.aStart.needsUpdate = true;
    this.aEnd.needsUpdate = true;
    this.aWidth.needsUpdate = true;
    this.aColor.needsUpdate = true;
    this.aAlpha.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
