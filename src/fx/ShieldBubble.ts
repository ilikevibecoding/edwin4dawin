import * as THREE from 'three';
import { clamp01 } from '../core/math';

const vert = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vPosL = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uHits[4];
  uniform float uHitAge[4];
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);

    // Hex-ish interference pattern so the shell is not a plain gradient.
    float cells = sin(vPosL.x * 9.0) * sin(vPosL.y * 9.0) * sin(vPosL.z * 9.0);
    float grid = smoothstep(0.55, 0.95, abs(cells));

    // Expanding ripple rings from recent impacts.
    float ripple = 0.0;
    for (int i = 0; i < 4; i++) {
      float age = uHitAge[i];
      if (age <= 0.0) continue;
      float d = distance(normalize(vPosL), normalize(uHits[i]));
      float r = (1.0 - age) * 1.9;
      ripple += smoothstep(0.28, 0.0, abs(d - r)) * age * 2.4;
      ripple += smoothstep(0.5, 0.0, d) * age * 0.9;
    }

    float a = (fres * 0.5 + grid * 0.16 + ripple) * uOpacity;
    if (a < 0.004) discard;
    vec3 col = uColor * (0.6 + ripple * 1.6);
    gl_FragColor = vec4(col * a, a);
  }
`;

/**
 * Deflector shell wrapped around a hull.
 *
 * Idles almost invisible and blooms where energy lands: up to four concurrent
 * impact ripples travel outward from their strike points.
 */
export class ShieldBubble {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private hits: Array<{ dir: THREE.Vector3; age: number }> = [];
  private baseOpacity = 0;
  private target = 0;

  constructor(radius: number, scaleXYZ: [number, number, number] = [1, 1, 1], color = 0x7fc4ff) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uHits: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uHitAge: { value: [0, 0, 0, 0] },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 3), this.material);
    this.mesh.scale.set(scaleXYZ[0], scaleXYZ[1], scaleXYZ[2]);
    this.mesh.name = 'ShieldBubble';
    this.mesh.renderOrder = 5;
    for (let i = 0; i < 4; i++) this.hits.push({ dir: new THREE.Vector3(0, 1, 0), age: 0 });
  }

  /** Ambient shimmer level (0 = invisible). */
  setStrength(v: number): void {
    this.target = clamp01(v);
  }

  /** Register a strike; `localDir` is a direction in the bubble's local space. */
  strike(localDir: THREE.Vector3): void {
    let slot = this.hits[0];
    for (const h of this.hits) if (h.age < slot.age) slot = h;
    slot.dir.copy(localDir).normalize();
    slot.age = 1;
  }

  update(dt: number, elapsed: number): void {
    this.baseOpacity += (this.target - this.baseOpacity) * (1 - Math.exp(-dt / 0.25));
    const u = this.material.uniforms;
    u.uTime.value = elapsed;
    let maxAge = 0;
    for (let i = 0; i < 4; i++) {
      const h = this.hits[i];
      h.age = Math.max(0, h.age - dt / 0.75);
      (u.uHits.value as THREE.Vector3[])[i].copy(h.dir);
      (u.uHitAge.value as number[])[i] = h.age;
      maxAge = Math.max(maxAge, h.age);
    }
    u.uOpacity.value = Math.max(this.baseOpacity, maxAge * 0.9);
    this.mesh.visible = u.uOpacity.value > 0.004;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
