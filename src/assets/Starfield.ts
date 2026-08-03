import * as THREE from 'three';
import { rng } from '../core/Rng';
import { starTexture } from './Textures';
import type { QualitySettings } from '../core/Quality';

/**
 * Instanced starfield plus a faint galactic band.
 *
 * Stars live on a huge shell in the background scene, so they never intersect
 * anything and never need depth sorting against the ships.
 */
export class Starfield {
  readonly root = new THREE.Group();
  private material: THREE.PointsMaterial;
  private bandMat: THREE.ShaderMaterial;
  private points: THREE.Points;

  constructor(quality: QualitySettings, radius = 900000) {
    this.root.name = 'Starfield';
    const r = rng('starfield');
    const count = quality.starCount;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xdce7ff),
      new THREE.Color(0xfff0d8),
      new THREE.Color(0xffd8b8),
      new THREE.Color(0xc8d8ff),
      new THREE.Color(0xffeccc),
    ];

    for (let i = 0; i < count; i++) {
      // Uniform direction on the sphere, then biased toward a galactic plane.
      const u = r.next() * 2 - 1;
      const theta = r.next() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      let x = s * Math.cos(theta);
      let y = u;
      let z = s * Math.sin(theta);
      if (r.bool(0.42)) {
        // Cluster along a tilted band to suggest a galactic disc.
        y *= 0.16;
        const len = Math.hypot(x, y, z) || 1;
        x /= len;
        y /= len;
        z /= len;
        const tilt = 0.42;
        const ny = y * Math.cos(tilt) - z * Math.sin(tilt);
        const nz = y * Math.sin(tilt) + z * Math.cos(tilt);
        y = ny;
        z = nz;
      }
      positions[i * 3] = x * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = z * radius;

      const c = palette[Math.floor(r.next() * palette.length)];
      // A few bright anchors, a long tail of faint ones.
      const brightness = Math.pow(r.next(), 1.45) * 1.5 + 0.3;
      colors[i * 3] = c.r * brightness;
      colors[i * 3 + 1] = c.g * brightness;
      colors[i * 3 + 2] = c.b * brightness;
      sizes[i] = brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // three scales point size by (drawingBufferHeight / 2) / viewZ, so at this
    // shell radius the constant below works out to roughly three pixels at
    // 900p and scales up with resolution.
    this.material = new THREE.PointsMaterial({
      size: radius * 0.0085,
      map: starTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // Depth testing stays on: the planet shares this scene and stars must
      // disappear behind its disc rather than sparkling through it.
      depthTest: true,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'stars';
    this.points.frustumCulled = false;
    this.points.renderOrder = -10;
    this.root.add(this.points);

    // Faint nebular band so the sky is not pure black.
    this.bandMat = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 1 },
        colorA: { value: new THREE.Color(0x2a3358) },
        colorB: { value: new THREE.Color(0x120e1e) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float opacity; uniform vec3 colorA; uniform vec3 colorB;
        varying vec3 vDir;
        float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float n(vec3 x) {
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          vec3 d = vDir;
          float band = exp(-pow((d.y * cos(0.42) - d.z * sin(0.42)) * 2.6, 2.0));
          // Several octaves keep the dust from reading as coloured blotches.
          float clouds = n(d * 3.0) * 0.44 + n(d * 7.0) * 0.3 + n(d * 17.0) * 0.16 + n(d * 37.0) * 0.1;
          clouds = smoothstep(0.28, 0.85, clouds);
          float a = band * (0.05 + clouds * 0.16) * opacity;
          vec3 c = mix(colorB, colorA, clouds);
          gl_FragColor = vec4(c * a, a);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    const band = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.1, 32, 24), this.bandMat);
    band.name = 'galacticBand';
    band.renderOrder = -20;
    band.frustumCulled = false;
    this.root.add(band);
  }

  /** Global fade used by the prologue as space becomes visible. */
  setOpacity(v: number): void {
    this.material.opacity = v;
    this.bandMat.uniforms.opacity.value = v;
    this.points.visible = v > 0.005;
  }
}
