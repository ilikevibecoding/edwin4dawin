/**
 * Deflector shield flashes.
 *
 * When a bolt strikes a shielded hull, a hexagonal energy cell pattern blooms
 * outward from the impact point across a spherical shell, then fades. A small
 * pool of shells is reused so several hits can overlap.
 */

import * as THREE from 'three';
import { hexShieldTexture } from '../assets/textures';

const vert = /* glsl */ `
  varying vec3 vNormalL;
  varying vec3 vViewDir;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormalL = normalize(normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uHex;
  uniform vec3  uColor;
  uniform vec3  uImpact;    // impact direction in local space
  uniform float uSpread;    // 0..1 ripple radius
  uniform float uStrength;
  varying vec3 vNormalL;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    // Angular distance from the impact point, normalised to a hemisphere.
    float d = acos(clamp(dot(normalize(vNormalL), normalize(uImpact)), -1.0, 1.0)) / 3.14159;
    // A ring that expands outward and thins as it goes.
    float ring = exp(-pow((d - uSpread) * 7.0, 2.0));
    float core = exp(-pow(d * 5.5, 2.0)) * (1.0 - uSpread);
    float hex = texture2D(uHex, vUv * vec2(5.0, 3.0)).r;
    float fres = pow(1.0 - abs(dot(normalize(vNormalL), normalize(vViewDir))), 1.4);

    float a = (ring * (0.35 + hex * 0.9) + core * 0.8) * uStrength * (0.45 + fres * 0.9);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

interface Flash {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  age: number;
  duration: number;
  active: boolean;
}

export class ShieldFlashSystem {
  readonly group = new THREE.Group();
  private flashes: Flash[] = [];
  private cursor = 0;

  constructor(capacity = 6, color = '#6fd6ff') {
    this.group.name = 'ShieldFlashes';
    const geo = new THREE.SphereGeometry(1, 28, 18);
    const tex = hexShieldTexture();
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uHex: { value: tex },
          uColor: { value: new THREE.Color(color) },
          uImpact: { value: new THREE.Vector3(0, 0, 1) },
          uSpread: { value: 0 },
          uStrength: { value: 0 },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.flashes.push({ mesh, mat, age: 0, duration: 0.7, active: false });
    }
  }

  /**
   * @param center  shell centre, in the parent's space
   * @param radius  shell radius (usually the ship's bounding radius)
   * @param impact  world-space impact point
   */
  flash(center: THREE.Vector3, radius: number, impact: THREE.Vector3, strength = 1, color?: string): void {
    const f = this.flashes[this.cursor];
    this.cursor = (this.cursor + 1) % this.flashes.length;
    f.mesh.position.copy(center);
    f.mesh.scale.setScalar(radius);
    f.mesh.visible = true;
    f.active = true;
    f.age = 0;
    f.duration = 0.55 + strength * 0.35;
    const dir = impact.clone().sub(center).normalize();
    (f.mat.uniforms.uImpact.value as THREE.Vector3).copy(dir);
    f.mat.uniforms.uStrength.value = strength;
    f.mat.uniforms.uSpread.value = 0;
    if (color) (f.mat.uniforms.uColor.value as THREE.Color).set(color);
  }

  update(dt: number, camera?: THREE.Camera): void {
    for (const f of this.flashes) {
      if (!f.active) continue;
      f.age += dt;
      const t = f.age / f.duration;
      if (t >= 1) {
        f.active = false;
        f.mesh.visible = false;
        continue;
      }
      f.mat.uniforms.uSpread.value = t * 0.85;
      f.mat.uniforms.uStrength.value = (1 - t) * (1 - t) * 1.6;
      // A capital ship's shell is nearly a kilometre across, and the battle
      // shots sit inside it. Seen from within, the expanding ring wraps the
      // whole frame in hexagons, so the shell is simply not drawn from there.
      if (camera) {
        const inside = camera.position.distanceTo(f.mesh.position) < f.mesh.scale.x * 1.04;
        f.mesh.visible = !inside;
      }
    }
  }

  clear(): void {
    for (const f of this.flashes) {
      f.active = false;
      f.mesh.visible = false;
    }
  }
}
