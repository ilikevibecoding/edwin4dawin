import * as THREE from 'three';
import { Layers } from '../core/GameContext';

/**
 * The flash on the viewmodel itself.
 *
 * The FX system owns the world-side flash, but the one the player actually
 * stares at has to live in the viewmodel scene: it has to be drawn at the
 * viewmodel's field of view, sit in front of the barrel at the right depth, and
 * survive the depth clear the viewmodel pass does. Three crossed billboards and
 * a stub of hot gas, additively blended and emissive enough to trip the bloom.
 */

const VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform float uIntensity;
uniform float uSeed;
uniform vec3 uColor;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  // Ragged star: eight lobes whose lengths are reshuffled every shot.
  float lobes = 0.0;
  for (int i = 0; i < 4; i++) {
    float f = float(i + 1) * 2.0;
    lobes += (hash(vec2(f, uSeed)) - 0.5) * cos(a * f + hash(vec2(f, uSeed + 3.0)) * 6.28);
  }
  float radius = 0.45 + 0.42 * lobes;
  float core = 1.0 - smoothstep(0.0, max(0.08, radius), r);
  float glow = exp(-r * 3.4);
  float v = core * core * 2.4 + glow * 0.7;
  vec3 col = mix(uColor, vec3(1.0, 0.96, 0.9), core * 0.8);
  fragColor = vec4(col * v * uIntensity, clamp(v * uIntensity * 0.35, 0.0, 1.0));
}
`;

export class MuzzleFlash {
  readonly group = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly smokeGeometry: THREE.CylinderGeometry;
  private readonly quads: THREE.Mesh[] = [];
  private life = 0;
  private duration = 0.045;
  private scale = 1;

  constructor() {
    this.group.name = 'MuzzleFlash';
    this.group.visible = false;
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uIntensity: { value: 0 },
        uSeed: { value: 0 },
        uColor: { value: new THREE.Color(0xffa03c) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.smokeGeometry = new THREE.CylinderGeometry(0.16, 0.6, 1.6, 8, 1, true);
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.rotation.z = (i / 3) * Math.PI;
      if (i === 2) mesh.rotation.y = Math.PI / 2;
      mesh.frustumCulled = false;
      mesh.renderOrder = 20;
      mesh.layers.set(Layers.VIEWMODEL);
      this.group.add(mesh);
      this.quads.push(mesh);
    }
    // A short cone of burning gas along the bore, which is what gives the flash
    // depth instead of leaving it a sticker on the muzzle.
    const cone = new THREE.Mesh(this.smokeGeometry, this.material);
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = -0.055;
    cone.scale.set(0.5, 0.09, 0.5);
    cone.frustumCulled = false;
    cone.renderOrder = 19;
    cone.layers.set(Layers.VIEWMODEL);
    this.group.add(cone);
    this.quads.push(cone);
  }

  /** `size` scales the flash; suppressed weapons want about a fifth. */
  flash(size: number, seed: number, duration = 0.05): void {
    this.scale = size;
    this.life = duration;
    this.duration = duration;
    this.material.uniforms.uSeed.value = seed;
    this.group.visible = true;
  }

  update(dt: number): void {
    if (this.life <= 0) {
      if (this.group.visible) {
        this.group.visible = false;
        this.material.uniforms.uIntensity.value = 0;
      }
      return;
    }
    this.life -= dt;
    const t = Math.max(0, this.life / this.duration);
    // Bright for two frames then gone; a lingering flash reads as a flare.
    const i = t * t * (0.4 + 0.6 * t);
    this.material.uniforms.uIntensity.value = i * 26;
    const s = this.scale * (0.72 + 0.4 * (1 - t));
    for (let q = 0; q < 3; q++) this.quads[q].scale.setScalar(s);
    this.quads[3].scale.set(s * 0.55, s * 0.16, s * 0.55);
    if (this.life <= 0) this.group.visible = false;
  }

  dispose(): void {
    this.geometry.dispose();
    this.smokeGeometry.dispose();
    this.material.dispose();
  }
}
