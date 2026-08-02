/**
 * Starfield: a single instanced point cloud with per-star colour temperature,
 * magnitude and twinkle phase, plus a handful of very soft nebula cards that
 * give the void some depth without ever reading as "wallpaper".
 */

import * as THREE from 'three';
import { Rng } from '../core/rng';
import { starSprite } from '../assets/textures';

const STAR_RADIUS = 24000;

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3  aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBrightness;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    // Slow, low-amplitude scintillation. Real stars twinkle from atmosphere,
    // but a hint of it keeps the field from looking like dead pixels.
    float tw = 0.82 + 0.18 * sin(uTime * 0.7 + aPhase * 6.2831);
    vAlpha = tw * uBrightness;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * tw;
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uSprite;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec4 s = texture2D(uSprite, gl_PointCoord);
    if (s.a < 0.01) discard;
    gl_FragColor = vec4(vColor * s.a * vAlpha, s.a * vAlpha);
  }
`;

export class Starfield {
  readonly group = new THREE.Group();
  private material: THREE.ShaderMaterial;
  private nebulaMaterials: THREE.MeshBasicMaterial[] = [];

  constructor(count: number, pixelRatio: number, seed = 'starfield') {
    this.group.name = 'Starfield';
    const rng = new Rng(seed);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    // Colour ramp from cool O/B blue-white through solar white to red giants.
    const ramp: Array<[number, number, number]> = [
      [0.66, 0.78, 1.0],
      [0.8, 0.87, 1.0],
      [1.0, 1.0, 1.0],
      [1.0, 0.96, 0.87],
      [1.0, 0.86, 0.68],
      [1.0, 0.72, 0.55],
    ];

    for (let i = 0; i < count; i++) {
      // Uniform on the sphere.
      const u = rng.next() * 2 - 1;
      const theta = rng.next() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      // Thicken a galactic band so the field has structure.
      const band = Math.exp(-Math.pow(u * 2.6, 2)) * 0.55;
      const r = STAR_RADIUS * rng.range(0.86, 1);
      positions[i * 3] = Math.cos(theta) * s * r;
      positions[i * 3 + 1] = u * r * (1 - band * 0.15);
      positions[i * 3 + 2] = Math.sin(theta) * s * r;

      const t = Math.pow(rng.next(), 1.7) * (ramp.length - 1);
      const lo = ramp[Math.floor(t)];
      const hi = ramp[Math.min(ramp.length - 1, Math.floor(t) + 1)];
      const f = t - Math.floor(t);
      // Magnitude distribution: many faint, a few bright.
      const mag = Math.pow(rng.next(), 3.1);
      const lum = 0.28 + mag * 0.95 + band * 0.1;
      colors[i * 3] = (lo[0] + (hi[0] - lo[0]) * f) * lum;
      colors[i * 3 + 1] = (lo[1] + (hi[1] - lo[1]) * f) * lum;
      colors[i * 3 + 2] = (lo[2] + (hi[2] - lo[2]) * f) * lum;

      sizes[i] = 90 + mag * 300;
      phases[i] = rng.next();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), STAR_RADIUS * 1.1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSprite: { value: starSprite() },
        uPixelRatio: { value: pixelRatio },
        uBrightness: { value: 1 },
      },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, this.material);
    points.name = 'Stars';
    points.frustumCulled = false;
    this.group.add(points);

    this.buildNebulae(rng);
  }

  /** Very dim, very large additive cards. Deliberately near-invisible. */
  private buildNebulae(rng: Rng): void {
    const tex = starSprite(128);
    const tints = ['#2a3d6b', '#3a2a56', '#1f4a52', '#4a2f36'];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: tints[i % tints.length],
        map: tex,
        transparent: true,
        opacity: rng.range(0.055, 0.12),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      this.nebulaMaterials.push(mat);
      const size = rng.range(9000, 20000);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(size, size * rng.range(0.5, 1)), mat);
      const u = rng.range(-0.7, 0.7);
      const theta = rng.range(0, Math.PI * 2);
      const s = Math.sqrt(1 - u * u);
      card.position.set(Math.cos(theta) * s, u, Math.sin(theta) * s).multiplyScalar(STAR_RADIUS * 0.8);
      card.lookAt(0, 0, 0);
      card.rotation.z = rng.range(0, Math.PI);
      card.name = `Nebula${i}`;
      this.group.add(card);
    }
  }

  setPixelRatio(r: number): void {
    this.material.uniforms.uPixelRatio.value = r;
  }

  /** Dimmed during the prologue and while looking at the sunlit planet limb. */
  setBrightness(b: number): void {
    this.material.uniforms.uBrightness.value = b;
  }

  update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
  }
}
