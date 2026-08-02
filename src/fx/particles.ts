/**
 * Particle systems: sparks, smoke and debris.
 *
 * All three are fixed-capacity pools sized from the quality tier. They are
 * simulated on the CPU (the counts are small) and drawn with one instanced or
 * point draw call each.
 */

import * as THREE from 'three';
import { Rng } from '../core/rng';
import { glowSprite, smokeSprite } from '../assets/textures';
import { roundedBox } from '../assets/geometry';
import { clamp } from '../core/math';

/* -------------------------------------------------------------- sparks */

const sparkVert = /* glsl */ `
  attribute float aSize;
  attribute float aLife;
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vColor = aColor;
    vAlpha = clamp(aLife, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (300.0 / max(1.0, -mv.z)) * (0.35 + vAlpha * 0.75);
  }
`;

const sparkFrag = /* glsl */ `
  uniform sampler2D uSprite;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    float a = s.a * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

export class SparkSystem {
  readonly points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lives: Float32Array;
  private decays: Float32Array;
  private sizes: Float32Array;
  private colors: Float32Array;
  private cursor = 0;
  private readonly capacity: number;
  private material: THREE.ShaderMaterial;
  private rng = new Rng('sparks');
  /** Local gravity applied to sparks; zero in space, mild inside the ship. */
  gravity = 0;
  private live = 0;

  constructor(capacity: number, pixelRatio: number) {
    this.capacity = Math.max(16, capacity);
    this.positions = new Float32Array(this.capacity * 3);
    this.velocities = new Float32Array(this.capacity * 3);
    this.lives = new Float32Array(this.capacity);
    this.decays = new Float32Array(this.capacity);
    this.sizes = new Float32Array(this.capacity);
    this.colors = new Float32Array(this.capacity * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSprite: { value: glowSprite(0.25, 64) },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: sparkVert,
      fragmentShader: sparkFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'Sparks';
    this.points.frustumCulled = false;
  }

  setPixelRatio(r: number): void {
    this.material.uniforms.uPixelRatio.value = r;
  }

  /** Emit a burst. `spread` is the cone half-angle around `normal`. */
  burst(
    origin: THREE.Vector3,
    count: number,
    opts: {
      speed?: number;
      spread?: number;
      normal?: THREE.Vector3;
      color?: THREE.Color | string;
      size?: number;
      life?: number;
      colorJitter?: number;
    } = {},
  ): void {
    const speed = opts.speed ?? 6;
    const spread = opts.spread ?? Math.PI;
    const normal = (opts.normal ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    const base = new THREE.Color(opts.color ?? '#ffb35c');
    const size = opts.size ?? 3;
    const life = opts.life ?? 0.7;

    // Build an orthonormal frame around the emission normal.
    const tangent = Math.abs(normal.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;

      const theta = this.rng.range(0, Math.PI * 2);
      const phi = this.rng.range(0, spread);
      const dir = normal
        .clone()
        .multiplyScalar(Math.cos(phi))
        .addScaledVector(u, Math.sin(phi) * Math.cos(theta))
        .addScaledVector(v, Math.sin(phi) * Math.sin(theta));

      const s = speed * this.rng.range(0.35, 1.4);
      this.positions[idx * 3] = origin.x;
      this.positions[idx * 3 + 1] = origin.y;
      this.positions[idx * 3 + 2] = origin.z;
      this.velocities[idx * 3] = dir.x * s;
      this.velocities[idx * 3 + 1] = dir.y * s;
      this.velocities[idx * 3 + 2] = dir.z * s;
      this.lives[idx] = 1;
      this.decays[idx] = 1 / (life * this.rng.range(0.6, 1.5));
      this.sizes[idx] = size * this.rng.range(0.5, 1.5);

      const jitter = opts.colorJitter ?? 0.18;
      const c = base.clone();
      c.offsetHSL(this.rng.range(-jitter, jitter) * 0.2, 0, this.rng.range(-jitter, jitter));
      this.colors[idx * 3] = c.r;
      this.colors[idx * 3 + 1] = c.g;
      this.colors[idx * 3 + 2] = c.b;
    }
    this.live = Math.min(this.capacity, this.live + count);
  }

  update(dt: number): void {
    if (this.live <= 0) return;
    let any = false;
    const drag = Math.pow(0.28, dt);
    for (let i = 0; i < this.capacity; i++) {
      if (this.lives[i] <= 0) continue;
      any = true;
      this.lives[i] -= this.decays[i] * dt;
      if (this.lives[i] <= 0) {
        this.lives[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      this.velocities[i * 3 + 1] -= this.gravity * dt;
      this.velocities[i * 3] *= drag;
      this.velocities[i * 3 + 1] *= drag;
      this.velocities[i * 3 + 2] *= drag;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
    }
    if (!any) this.live = 0;
    const geo = this.points.geometry;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
  }

  clear(): void {
    this.lives.fill(0);
    this.sizes.fill(0);
    this.live = 0;
    (this.points.geometry.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
}

/* --------------------------------------------------------------- smoke */

interface Puff {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  decay: number;
  size: number;
  growth: number;
  spin: number;
  angle: number;
  opacity: number;
}

/**
 * Camera-facing smoke puffs. Drawn with an instanced quad and a per-instance
 * opacity fed through the colour attribute.
 */
export class SmokeSystem {
  readonly mesh: THREE.InstancedMesh;
  private puffs: Puff[] = [];
  private cursor = 0;
  private rng = new Rng('smoke');
  private matrix = new THREE.Matrix4();
  private hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  private alphaAttr: THREE.InstancedBufferAttribute;
  private material: THREE.ShaderMaterial;
  private tint = new THREE.Color('#9aa0a6');
  /** Drift applied to every puff — vents blow smoke down a corridor. */
  readonly wind = new THREE.Vector3(0, 0.25, 0);

  constructor(capacity: number) {
    const cap = Math.max(8, capacity);
    // A per-instance alpha, not a per-instance colour: modulating colour on a
    // normally-blended sprite turns fading smoke into fading *black* smoke.
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: smokeSprite() },
        uTint: { value: this.tint },
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uTint;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          float a = texture2D(uMap, vUv).a * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uTint, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.material = mat;
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Smoke';
    this.alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    this.mesh.geometry.setAttribute('aAlpha', this.alphaAttr);
    for (let i = 0; i < cap; i++) {
      this.puffs.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        decay: 1,
        size: 1,
        growth: 0.4,
        spin: 0,
        angle: 0,
        opacity: 0.5,
      });
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setTint(hex: string): void {
    this.tint.set(hex);
    (this.material.uniforms.uTint.value as THREE.Color).copy(this.tint);
  }

  emit(
    origin: THREE.Vector3,
    count: number,
    opts: {
      speed?: number;
      size?: number;
      growth?: number;
      life?: number;
      opacity?: number;
      direction?: THREE.Vector3;
      spread?: number;
    } = {},
  ): void {
    const speed = opts.speed ?? 0.6;
    const dir = (opts.direction ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    const spread = opts.spread ?? 0.8;
    for (let i = 0; i < count; i++) {
      const p = this.puffs[this.cursor];
      this.cursor = (this.cursor + 1) % this.puffs.length;
      p.pos.copy(origin).add(
        new THREE.Vector3(this.rng.normal(), this.rng.normal(), this.rng.normal()).multiplyScalar(
          (opts.size ?? 1) * 0.18,
        ),
      );
      p.vel
        .copy(dir)
        .addScaledVector(
          new THREE.Vector3(this.rng.normal(), this.rng.normal(), this.rng.normal()),
          spread,
        )
        .multiplyScalar(speed * this.rng.range(0.5, 1.4));
      p.life = 1;
      p.decay = 1 / ((opts.life ?? 3) * this.rng.range(0.7, 1.3));
      p.size = (opts.size ?? 1) * this.rng.range(0.7, 1.4);
      p.growth = opts.growth ?? 0.5;
      p.spin = this.rng.range(-0.5, 0.5);
      p.angle = this.rng.range(0, Math.PI * 2);
      p.opacity = opts.opacity ?? 0.42;
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    const q = camera.quaternion;
    const rot = new THREE.Quaternion();
    const spinQ = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 0, 1);
    const scale = new THREE.Vector3();
    let dirty = false;
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      if (p.life <= 0) continue;
      dirty = true;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.mesh.setMatrixAt(i, this.hidden);
        this.alphaAttr.setX(i, 0);
        continue;
      }
      p.vel.addScaledVector(this.wind, dt);
      p.vel.multiplyScalar(Math.pow(0.5, dt));
      p.pos.addScaledVector(p.vel, dt);
      p.angle += p.spin * dt;
      const s = p.size * (1 + (1 - p.life) * p.growth * 2.4);
      scale.set(s, s, 1);
      spinQ.setFromAxisAngle(axis, p.angle);
      rot.copy(q).multiply(spinQ);
      this.matrix.compose(p.pos, rot, scale);
      this.mesh.setMatrixAt(i, this.matrix);
      // Fade in fast, out slowly.
      const a = clamp(Math.min(1, (1 - p.life) * 5) * Math.pow(p.life, 0.75) * p.opacity, 0, 1);
      this.alphaAttr.setX(i, a);
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.alphaAttr.needsUpdate = true;
    }
  }

  clear(): void {
    for (let i = 0; i < this.puffs.length; i++) {
      this.puffs[i].life = 0;
      this.mesh.setMatrixAt(i, this.hidden);
      this.alphaAttr.setX(i, 0);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }
}

/* -------------------------------------------------------------- debris */

interface Chunk {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  life: number;
  decay: number;
  size: number;
}

/** Tumbling hull fragments. Used for the door breach and hull impacts. */
export class DebrisSystem {
  readonly mesh: THREE.InstancedMesh;
  private chunks: Chunk[] = [];
  private cursor = 0;
  private rng = new Rng('debris');
  private matrix = new THREE.Matrix4();
  private quat = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  gravity = 0;

  constructor(capacity: number, material: THREE.Material) {
    const cap = Math.max(8, capacity);
    this.mesh = new THREE.InstancedMesh(roundedBox(1, 1, 1, 0.12, 1), material, cap);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Debris';
    for (let i = 0; i < cap; i++) {
      this.chunks.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        rot: new THREE.Euler(),
        life: 0,
        decay: 1,
        size: 0.1,
      });
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  burst(
    origin: THREE.Vector3,
    count: number,
    opts: { speed?: number; size?: number; life?: number; direction?: THREE.Vector3; spread?: number } = {},
  ): void {
    const speed = opts.speed ?? 4;
    const dir = (opts.direction ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    const spread = opts.spread ?? 0.7;
    for (let i = 0; i < count; i++) {
      const c = this.chunks[this.cursor];
      this.cursor = (this.cursor + 1) % this.chunks.length;
      c.pos.copy(origin);
      c.vel
        .copy(dir)
        .addScaledVector(new THREE.Vector3(this.rng.normal(), this.rng.normal(), this.rng.normal()), spread)
        .multiplyScalar(speed * this.rng.range(0.4, 1.3));
      c.spin.set(this.rng.range(-9, 9), this.rng.range(-9, 9), this.rng.range(-9, 9));
      c.rot.set(this.rng.range(0, 6.28), this.rng.range(0, 6.28), this.rng.range(0, 6.28));
      c.life = 1;
      c.decay = 1 / ((opts.life ?? 2.6) * this.rng.range(0.7, 1.3));
      c.size = (opts.size ?? 0.12) * this.rng.range(0.45, 1.7);
    }
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      if (c.life <= 0) continue;
      dirty = true;
      c.life -= c.decay * dt;
      if (c.life <= 0) {
        this.mesh.setMatrixAt(i, this.hidden);
        continue;
      }
      c.vel.y -= this.gravity * dt;
      c.vel.multiplyScalar(Math.pow(0.55, dt));
      c.pos.addScaledVector(c.vel, dt);
      c.rot.x += c.spin.x * dt;
      c.rot.y += c.spin.y * dt;
      c.rot.z += c.spin.z * dt;
      this.quat.setFromEuler(c.rot);
      const s = c.size * Math.min(1, c.life * 3);
      this.scale.set(s, s * 0.6, s * 1.3);
      this.matrix.compose(c.pos, this.quat, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].life = 0;
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
