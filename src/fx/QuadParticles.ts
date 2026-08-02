import * as THREE from 'three';

/**
 * Camera-facing quad particle pool.
 *
 * One `InstancedBufferGeometry` draw call for the whole pool; billboarding and
 * rotation happen in the vertex shader so the CPU only writes six floats per
 * live particle. Used for smoke, dust, energy blooms and muzzle flare.
 */

export interface QuadParticleOptions {
  capacity: number;
  texture: THREE.Texture;
  blending?: THREE.Blending;
  depthWrite?: boolean;
  softness?: number;
}

interface Particle {
  alive: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  drag: number;
  gravity: number;
  size0: number;
  size1: number;
  rot: number;
  spin: number;
  color0: THREE.Color;
  color1: THREE.Color;
  alpha: number;
  fadeIn: number;
}

export class QuadParticles {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private particles: Particle[] = [];
  private free: number[] = [];
  private geo: THREE.InstancedBufferGeometry;
  private aOffset: THREE.InstancedBufferAttribute;
  private aScale: THREE.InstancedBufferAttribute;
  private aRot: THREE.InstancedBufferAttribute;
  private aColor: THREE.InstancedBufferAttribute;
  private aAlpha: THREE.InstancedBufferAttribute;
  private liveCount = 0;

  constructor(opts: QuadParticleOptions) {
    const n = (this.capacity = opts.capacity);
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('uv', base.getAttribute('uv'));
    this.geo.instanceCount = 0;

    this.aOffset = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aScale = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    for (const a of [this.aOffset, this.aScale, this.aRot, this.aColor, this.aAlpha]) {
      a.setUsage(THREE.DynamicDrawUsage);
    }
    this.geo.setAttribute('iOffset', this.aOffset);
    this.geo.setAttribute('iScale', this.aScale);
    this.geo.setAttribute('iRot', this.aRot);
    this.geo.setAttribute('iColor', this.aColor);
    this.geo.setAttribute('iAlpha', this.aAlpha);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: opts.texture },
        uSoftness: { value: opts.softness ?? 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 iOffset;
        attribute float iScale;
        attribute float iRot;
        attribute vec3 iColor;
        attribute float iAlpha;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vColor = iColor;
          vAlpha = iAlpha;
          vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float c = cos(iRot);
          float s = sin(iRot);
          vec2 rotated = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
          vec3 world = iOffset + (camRight * rotated.x + camUp * rotated.y) * iScale;
          gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uSoftness;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          float a = tex.a * vAlpha;
          if (a < 0.002) discard;
          gl_FragColor = vec4(vColor * tex.rgb, a);
        }
      `,
      transparent: true,
      depthWrite: opts.depthWrite ?? false,
      depthTest: true,
      blending: opts.blending ?? THREE.NormalBlending,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.name = 'QuadParticles';

    for (let i = 0; i < n; i++) {
      this.particles.push({
        alive: false,
        age: 0,
        life: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        drag: 0,
        gravity: 0,
        size0: 1,
        size1: 1,
        rot: 0,
        spin: 0,
        color0: new THREE.Color(),
        color1: new THREE.Color(),
        alpha: 1,
        fadeIn: 0.12,
      });
      this.free.push(i);
    }
    base.dispose();
  }

  get live(): number {
    return this.liveCount;
  }

  spawn(cfg: {
    position: THREE.Vector3;
    velocity?: THREE.Vector3;
    life: number;
    size0: number;
    size1: number;
    color0: THREE.ColorRepresentation;
    color1?: THREE.ColorRepresentation;
    alpha?: number;
    rot?: number;
    spin?: number;
    drag?: number;
    gravity?: number;
    fadeIn?: number;
  }): void {
    const idx = this.free.pop();
    if (idx === undefined) return;
    const p = this.particles[idx];
    p.alive = true;
    p.age = 0;
    p.life = cfg.life;
    p.pos.copy(cfg.position);
    p.vel.copy(cfg.velocity ?? ZERO);
    p.drag = cfg.drag ?? 0.6;
    p.gravity = cfg.gravity ?? 0;
    p.size0 = cfg.size0;
    p.size1 = cfg.size1;
    p.rot = cfg.rot ?? 0;
    p.spin = cfg.spin ?? 0;
    p.color0.set(cfg.color0);
    p.color1.set(cfg.color1 ?? cfg.color0);
    p.alpha = cfg.alpha ?? 1;
    p.fadeIn = cfg.fadeIn ?? 0.12;
    this.liveCount++;
  }

  clear(): void {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].alive) {
        this.particles[i].alive = false;
        this.free.push(i);
      }
    }
    this.liveCount = 0;
    this.geo.instanceCount = 0;
  }

  update(dt: number): void {
    let write = 0;
    const off = this.aOffset.array as Float32Array;
    const scl = this.aScale.array as Float32Array;
    const rot = this.aRot.array as Float32Array;
    const col = this.aColor.array as Float32Array;
    const alp = this.aAlpha.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.free.push(i);
        this.liveCount--;
        continue;
      }
      const t = p.age / p.life;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.spin * dt;

      off[write * 3] = p.pos.x;
      off[write * 3 + 1] = p.pos.y;
      off[write * 3 + 2] = p.pos.z;
      scl[write] = p.size0 + (p.size1 - p.size0) * t;
      rot[write] = p.rot;
      const fade =
        t < p.fadeIn ? t / Math.max(1e-4, p.fadeIn) : 1 - (t - p.fadeIn) / Math.max(1e-4, 1 - p.fadeIn);
      alp[write] = p.alpha * Math.max(0, fade);
      col[write * 3] = p.color0.r + (p.color1.r - p.color0.r) * t;
      col[write * 3 + 1] = p.color0.g + (p.color1.g - p.color0.g) * t;
      col[write * 3 + 2] = p.color0.b + (p.color1.b - p.color0.b) * t;
      write++;
    }

    this.geo.instanceCount = write;
    if (write > 0) {
      this.aOffset.addUpdateRange(0, write * 3);
      this.aScale.addUpdateRange(0, write);
      this.aRot.addUpdateRange(0, write);
      this.aColor.addUpdateRange(0, write * 3);
      this.aAlpha.addUpdateRange(0, write);
      this.aOffset.needsUpdate = true;
      this.aScale.needsUpdate = true;
      this.aRot.needsUpdate = true;
      this.aColor.needsUpdate = true;
      this.aAlpha.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const ZERO = new THREE.Vector3();
