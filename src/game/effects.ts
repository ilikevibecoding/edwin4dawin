import * as THREE from 'three';
import { Rng } from '../core/math';

export type EffectKind = 'splash' | 'smoke' | 'debris' | 'spark' | 'bone' | 'sand' | 'blood';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  drag: number;
  gravity: number;
  color: THREE.Color;
}

const STYLES: Record<EffectKind, { color: number; size: [number, number]; life: [number, number]; gravity: number; drag: number; speed: number }> = {
  splash: { color: 0xdff2f6, size: [0.18, 0.5], life: [0.5, 1.1], gravity: 14, drag: 0.6, speed: 5.5 },
  smoke: { color: 0xbdb6ab, size: [0.5, 1.5], life: [1.0, 2.4], gravity: -0.7, drag: 1.9, speed: 2.2 },
  debris: { color: 0x6b4a2c, size: [0.1, 0.28], life: [0.7, 1.5], gravity: 17, drag: 0.3, speed: 6.5 },
  spark: { color: 0xffc46a, size: [0.06, 0.16], life: [0.2, 0.5], gravity: 6, drag: 2.4, speed: 8 },
  bone: { color: 0xd8d2c0, size: [0.1, 0.26], life: [0.6, 1.3], gravity: 16, drag: 0.4, speed: 5 },
  sand: { color: 0xd9c391, size: [0.14, 0.4], life: [0.5, 1.2], gravity: 13, drag: 0.9, speed: 3.6 },
  blood: { color: 0x8e2018, size: [0.08, 0.2], life: [0.3, 0.7], gravity: 15, drag: 0.8, speed: 4 },
};

/**
 * One pooled point cloud for every impact effect in the game: cannon smoke,
 * water splashes, wood splinters, sparks and bone shards. A single draw call
 * keeps it cheap even during a broadside.
 */
export class Effects {
  private capacity: number;
  private particles: Particle[] = [];
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private geometry = new THREE.BufferGeometry();
  private rng = new Rng(5150);
  private next = 0;

  constructor(scene: THREE.Scene, capacity = 700) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 0.2,
        drag: 1,
        gravity: 9.8,
        color: new THREE.Color(),
      });
      this.positions[i * 3 + 1] = -9999;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {},
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPos;
          gl_PointSize = aSize * 320.0 / max(1.0, -viewPos.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5 || vAlpha <= 0.001) discard;
          float soft = smoothstep(0.5, 0.12, d);
          gl_FragColor = vec4(vColor, vAlpha * soft);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  /** Emits `count` particles of a given style at a position. */
  burst(kind: EffectKind, position: THREE.Vector3, count = 12, options?: { speed?: number; spread?: number; direction?: THREE.Vector3; scale?: number }): void {
    const style = STYLES[kind];
    const speed = options?.speed ?? style.speed;
    const spread = options?.spread ?? 1;
    const scale = options?.scale ?? 1;

    for (let i = 0; i < count; i++) {
      const p = this.particles[this.next];
      this.next = (this.next + 1) % this.capacity;

      p.position.copy(position);
      const dir = options?.direction
        ? options.direction.clone().normalize()
        : new THREE.Vector3(this.rng.float(-1, 1), this.rng.float(0.2, 1), this.rng.float(-1, 1)).normalize();
      dir.x += this.rng.float(-spread, spread) * 0.5;
      dir.y += this.rng.float(-spread, spread) * 0.35;
      dir.z += this.rng.float(-spread, spread) * 0.5;
      p.velocity.copy(dir.normalize()).multiplyScalar(speed * this.rng.float(0.55, 1.25));
      p.maxLife = this.rng.float(style.life[0], style.life[1]);
      p.life = p.maxLife;
      p.size = this.rng.float(style.size[0], style.size[1]) * scale;
      p.drag = style.drag;
      p.gravity = style.gravity;
      p.color.setHex(style.color).offsetHSL(0, 0, this.rng.float(-0.06, 0.06));
    }
  }

  update(dt: number): void {
    let anyAlive = false;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      anyAlive = true;
      p.life -= dt;
      p.velocity.y -= p.gravity * dt;
      p.velocity.multiplyScalar(1 - Math.min(0.95, p.drag * dt));
      p.position.addScaledVector(p.velocity, dt);

      const t = Math.max(0, p.life / p.maxLife);
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = p.size * (0.6 + (1 - t) * 0.8);
      this.alphas[i] = Math.min(1, t * 1.6) * 0.85;
    }

    if (anyAlive) {
      (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
