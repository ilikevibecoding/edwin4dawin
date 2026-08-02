import * as THREE from 'three';
import { radialTexture, smokeTexture } from '../assets/Textures';
import { Rng } from '../core/Rng';

/**
 * Pooled particle systems.
 *
 * Everything is preallocated: seeking the timeline calls `reset()` and no
 * allocation happens during playback. Budgets scale with the quality tier.
 */

const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  attribute float aRotation;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vRotation;
  uniform float uPixelScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vRotation = aRotation;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelScale / max(0.001, -mv.z);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vRotation;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRotation), s = sin(vRotation);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
    vec4 tex = texture2D(uMap, uv);
    float a = tex.a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * tex.rgb * a, a);
  }
`;

export interface ParticleOptions {
  capacity: number;
  map: THREE.Texture;
  blending: THREE.Blending;
  gravity: THREE.Vector3;
  drag: number;
  depthWrite?: boolean;
}

export class ParticleSystem {
  readonly points: THREE.Points;
  private capacity: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private rotations: Float32Array;
  private spins: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private growth: Float32Array;
  private baseSize: Float32Array;
  private cursor = 0;
  private material: THREE.ShaderMaterial;
  private opts: ParticleOptions;
  private liveCount = 0;

  constructor(opts: ParticleOptions) {
    this.opts = opts;
    this.capacity = Math.max(8, opts.capacity);
    const n = this.capacity;
    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    this.sizes = new Float32Array(n);
    this.alphas = new Float32Array(n);
    this.rotations = new Float32Array(n);
    this.spins = new Float32Array(n);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.growth = new Float32Array(n);
    this.baseSize = new Float32Array(n);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setAttribute('aRotation', new THREE.BufferAttribute(this.rotations, 1));
    geo.setDrawRange(0, n);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: opts.map },
        uPixelScale: { value: 600 },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      blending: opts.blending,
      depthWrite: opts.depthWrite ?? false,
      depthTest: true,
      toneMapped: false,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.reset();
  }

  setPixelScale(v: number): void {
    this.material.uniforms.uPixelScale.value = v;
  }

  get active(): number {
    return this.liveCount;
  }

  spawn(p: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    size: number;
    life: number;
    growth?: number;
    rotation?: number;
    spin?: number;
  }): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.positions[i * 3] = p.position.x;
    this.positions[i * 3 + 1] = p.position.y;
    this.positions[i * 3 + 2] = p.position.z;
    this.velocities[i * 3] = p.velocity.x;
    this.velocities[i * 3 + 1] = p.velocity.y;
    this.velocities[i * 3 + 2] = p.velocity.z;
    this.colors[i * 3] = p.color.r;
    this.colors[i * 3 + 1] = p.color.g;
    this.colors[i * 3 + 2] = p.color.b;
    this.baseSize[i] = p.size;
    this.sizes[i] = p.size;
    this.alphas[i] = 1;
    this.rotations[i] = p.rotation ?? 0;
    this.spins[i] = p.spin ?? 0;
    this.life[i] = p.life;
    this.maxLife[i] = p.life;
    this.growth[i] = p.growth ?? 0;
  }

  update(dt: number): void {
    const g = this.opts.gravity;
    const drag = Math.exp(-this.opts.drag * dt);
    let live = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      live++;
      const vi = i * 3;
      this.velocities[vi] = (this.velocities[vi] + g.x * dt) * drag;
      this.velocities[vi + 1] = (this.velocities[vi + 1] + g.y * dt) * drag;
      this.velocities[vi + 2] = (this.velocities[vi + 2] + g.z * dt) * drag;
      this.positions[vi] += this.velocities[vi] * dt;
      this.positions[vi + 1] += this.velocities[vi + 1] * dt;
      this.positions[vi + 2] += this.velocities[vi + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      this.alphas[i] = k * k * (3 - 2 * k);
      this.sizes[i] = this.baseSize[i] * (1 + this.growth[i] * (1 - k));
      this.rotations[i] += this.spins[i] * dt;
    }
    this.liveCount = live;
    const geo = this.points.geometry;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aRotation') as THREE.BufferAttribute).needsUpdate = true;
  }

  reset(): void {
    this.life.fill(0);
    this.alphas.fill(0);
    this.sizes.fill(0);
    this.cursor = 0;
    this.liveCount = 0;
    const geo = this.points.geometry;
    (geo.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
  }
}

export function sparkSystem(capacity: number, gravity: number): ParticleSystem {
  return new ParticleSystem({
    capacity,
    map: radialTexture('spark', 'rgba(255,255,255,1)', 'rgba(255,190,120,0)', 1.6),
    blending: THREE.AdditiveBlending,
    gravity: new THREE.Vector3(0, gravity, 0),
    drag: 1.4,
  });
}

export function smokeSystem(capacity: number, rise: number): ParticleSystem {
  return new ParticleSystem({
    capacity,
    map: smokeTexture(),
    blending: THREE.NormalBlending,
    gravity: new THREE.Vector3(0, rise, 0),
    drag: 1.9,
  });
}

export function flashSystem(capacity: number): ParticleSystem {
  return new ParticleSystem({
    capacity,
    map: radialTexture('flash', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)', 2.4),
    blending: THREE.AdditiveBlending,
    gravity: new THREE.Vector3(0, 0, 0),
    drag: 3.2,
  });
}

/* ------------------------------------------------------------- debris */

export class DebrisSystem {
  readonly mesh: THREE.InstancedMesh;
  private capacity: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private angles: Float32Array;
  private angVel: Float32Array;
  private scales: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private cursor = 0;
  private gravity: number;
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private euler = new THREE.Euler();
  private vec = new THREE.Vector3();
  private scaleVec = new THREE.Vector3();

  constructor(capacity: number, material: THREE.Material, gravity: number) {
    this.capacity = capacity;
    this.gravity = gravity;
    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.angles = new Float32Array(capacity * 3);
    this.angVel = new Float32Array(capacity * 3);
    this.scales = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.reset();
  }

  spawn(position: THREE.Vector3, velocity: THREE.Vector3, size: THREE.Vector3, life: number, rng: Rng): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.positions.set([position.x, position.y, position.z], i * 3);
    this.velocities.set([velocity.x, velocity.y, velocity.z], i * 3);
    this.angles.set([rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)], i * 3);
    this.angVel.set([rng.spread(6), rng.spread(6), rng.spread(6)], i * 3);
    this.scales.set([size.x, size.y, size.z], i * 3);
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const vi = i * 3;
      if (this.life[i] <= 0) {
        this.matrix.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.matrix);
        continue;
      }
      this.life[i] -= dt;
      this.velocities[vi + 1] += this.gravity * dt;
      this.positions[vi] += this.velocities[vi] * dt;
      this.positions[vi + 1] += this.velocities[vi + 1] * dt;
      this.positions[vi + 2] += this.velocities[vi + 2] * dt;
      this.angles[vi] += this.angVel[vi] * dt;
      this.angles[vi + 1] += this.angVel[vi + 1] * dt;
      this.angles[vi + 2] += this.angVel[vi + 2] * dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vec.set(this.positions[vi], this.positions[vi + 1], this.positions[vi + 2]);
      this.euler.set(this.angles[vi], this.angles[vi + 1], this.angles[vi + 2]);
      this.quat.setFromEuler(this.euler);
      const shrink = Math.min(1, k * 3);
      this.scaleVec.set(
        this.scales[vi] * shrink,
        this.scales[vi + 1] * shrink,
        this.scales[vi + 2] * shrink,
      );
      this.matrix.compose(this.vec, this.quat, this.scaleVec);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset(): void {
    this.life.fill(0);
    this.cursor = 0;
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.capacity; i++) this.mesh.setMatrixAt(i, m);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
