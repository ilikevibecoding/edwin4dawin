import * as THREE from 'three';
import { freshRng } from '../../core/Random';
import { nebulaMap, starPointMap } from '../textures';

/** Peak nebula brightness. Anything higher starts to look like lens flare. */
const NEBULA_OPACITY = 0.3;

/**
 * Star dome.
 *
 * One `Points` draw call for the whole sky (cheaper than instancing, since each
 * star is a single billboard), plus a handful of large additive sprites for
 * distant nebulae. Colours follow a rough stellar-temperature distribution so
 * the field is not uniformly white.
 */
export class Starfield {
  readonly root = new THREE.Group();
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private nebulae: THREE.Sprite[] = [];
  private baseOpacity = 1;

  constructor(count = 7000, radius = 120000) {
    this.root.name = 'Starfield';
    const rng = freshRng('starfield');

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Concentrate ~45% of stars into a galactic band for structure.
      let x: number;
      let y: number;
      let z: number;
      if (i % 20 < 9) {
        const a = rng.range(0, Math.PI * 2);
        const bandLat = rng.gaussian() * 0.11 + 0.18;
        const cl = Math.cos(bandLat);
        x = Math.cos(a) * cl;
        y = Math.sin(bandLat);
        z = Math.sin(a) * cl;
      } else {
        const u = rng.range(-1, 1);
        const a = rng.range(0, Math.PI * 2);
        const s = Math.sqrt(Math.max(0, 1 - u * u));
        x = s * Math.cos(a);
        y = u;
        z = s * Math.sin(a);
      }
      const r = radius * rng.range(0.94, 1.0);
      positions[i * 3] = x * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = z * r;

      const temp = rng.next();
      if (temp < 0.06) tint.setRGB(0.68, 0.78, 1.0);
      else if (temp < 0.2) tint.setRGB(0.82, 0.88, 1.0);
      else if (temp < 0.62) tint.setRGB(1.0, 0.98, 0.94);
      else if (temp < 0.87) tint.setRGB(1.0, 0.9, 0.74);
      else tint.setRGB(1.0, 0.76, 0.62);

      const mag = Math.pow(rng.next(), 2.6);
      const bright = 0.22 + mag * 0.95;
      colors[i * 3] = tint.r * bright;
      colors[i * 3 + 1] = tint.g * bright;
      colors[i * 3 + 2] = tint.b * bright;

      sizes[i] = 1.6 + mag * 4.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.1);

    // Per-star pixel size needs a tiny custom shader; PointsMaterial only
    // supports one global size.
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: starPointMap() },
        uOpacity: { value: 1 },
        uPixelRatio: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * uPixelRatio;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * tex * uOpacity;
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'Stars';
    this.points.frustumCulled = false;
    this.root.add(this.points);

    // Faint nebula washes for depth. Kept very dim and structured: a bright
    // soft disc out here reads as a smudge on the lens, not as a distant cloud.
    for (let i = 0; i < 4; i++) {
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nebulaMap(),
          color: new THREE.Color().setHSL(rng.range(0.55, 0.72), 0.45, 0.42),
          transparent: true,
          opacity: NEBULA_OPACITY,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          rotation: rng.range(0, Math.PI * 2),
          toneMapped: false,
        }),
      );
      const a = rng.range(0, Math.PI * 2);
      const lat = rng.gaussian() * 0.32;
      const cl = Math.cos(lat);
      spr.position.set(Math.cos(a) * cl, Math.sin(lat), Math.sin(a) * cl).multiplyScalar(radius * 0.9);
      const s = radius * rng.range(0.3, 0.52);
      spr.scale.set(s, s * rng.range(0.55, 0.95), 1);
      this.root.add(spr);
      this.nebulae.push(spr);
    }
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  /** Slight brightness modulation so the field is never dead still. */
  update(_dt: number, elapsed: number): void {
    this.material.uniforms.uOpacity.value = this.baseOpacity * (0.93 + 0.07 * Math.sin(elapsed * 0.4));
  }

  setOpacity(v: number): void {
    this.baseOpacity = v;
    this.material.uniforms.uOpacity.value = v;
    for (const n of this.nebulae) (n.material as THREE.SpriteMaterial).opacity = NEBULA_OPACITY * v;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
    for (const n of this.nebulae) (n.material as THREE.SpriteMaterial).dispose();
  }
}
