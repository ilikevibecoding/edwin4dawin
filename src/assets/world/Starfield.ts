import * as THREE from 'three';
import { Rng } from '../../core/Rng';
import type { MaterialLibrary } from '../materials';

/**
 * Instanced starfield.
 *
 * A single Points draw call carrying per-star colour, magnitude and twinkle
 * phase. The whole field is re-centred on the camera every frame so it behaves
 * like an infinitely distant sphere and can never be clipped or flown through.
 */

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBrightness;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.78 + 0.22 * sin(uTime * 1.7 + aPhase * 12.0);
    gl_PointSize = aSize * uPixelRatio * twinkle;
    vColor = aColor;
    vAlpha = twinkle * uBrightness;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    float core = smoothstep(0.5, 0.0, r);
    float halo = pow(core, 3.0);
    gl_FragColor = vec4(vColor * (0.35 + halo * 1.8), core * vAlpha);
  }
`;

export class Starfield {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  /** Nebula/galactic-band backdrop that keeps deep space from reading as flat black. */
  readonly band: THREE.Mesh;
  private bandMat: THREE.MeshBasicMaterial;

  // The shell sits well beyond the planet but inside the exterior far plane of
  // 2,400 km, so it can depth-test against the world instead of painting over it.
  constructor(lib: MaterialLibrary, count: number, radius = 1_600_000, seed = 'starfield') {
    const rng = new Rng(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    // Star colour ramp from cool blue-white to warm amber, weighted realistically.
    const tints: Array<[number, number, number]> = [
      [0.72, 0.80, 1.0], [0.86, 0.90, 1.0], [1.0, 1.0, 1.0],
      [1.0, 0.95, 0.86], [1.0, 0.86, 0.68], [1.0, 0.74, 0.56],
    ];

    for (let i = 0; i < count; i++) {
      // Uniform distribution on the sphere, with a soft concentration toward a
      // galactic band so the sky has structure rather than white noise.
      let u = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      if (rng.bool(0.42)) u *= 0.28;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const x = s * Math.cos(theta);
      const y = u;
      const z = s * Math.sin(theta);
      // Tilt the band so it crosses frame diagonally.
      const tilt = 0.42;
      positions[i * 3] = (x * Math.cos(tilt) - y * Math.sin(tilt)) * radius;
      positions[i * 3 + 1] = (x * Math.sin(tilt) + y * Math.cos(tilt)) * radius;
      positions[i * 3 + 2] = z * radius;

      const tint = tints[Math.min(tints.length - 1, Math.floor(Math.pow(rng.next(), 1.6) * tints.length))];
      const mag = Math.pow(rng.next(), 3.1);
      colors[i * 3] = tint[0];
      colors[i * 3 + 1] = tint[1];
      colors[i * 3 + 2] = tint[2];
      sizes[i] = 0.9 + mag * 4.4;
      phases[i] = rng.next();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.2);
    lib.registry.track(geo);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uBrightness: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      // Transparent materials are drawn after all opaque geometry no matter what
      // renderOrder says, so a starfield that skips the depth test paints itself
      // straight over every hull in the scene.
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    lib.registry.track(this.material);

    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'starfield';
    this.points.frustumCulled = false;
    this.points.renderOrder = -10;
    this.points.matrixAutoUpdate = true;

    // Faint galactic haze band.
    const bandGeo = new THREE.SphereGeometry(radius * 0.98, 32, 24);
    const bandTex = lib.registry.track(makeBandTexture(rng.fork('band')));
    this.bandMat = new THREE.MeshBasicMaterial({
      map: bandTex, side: THREE.BackSide, transparent: true, opacity: 0.34,
      depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    lib.registry.track(bandGeo);
    lib.registry.track(this.bandMat);
    this.band = new THREE.Mesh(bandGeo, this.bandMat);
    this.band.name = 'starfield-band';
    this.band.frustumCulled = false;
    this.band.renderOrder = -11;
    this.band.rotation.z = 0.42;
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio;
  }

  setBrightness(v: number): void {
    this.material.uniforms.uBrightness.value = v;
    this.bandMat.opacity = 0.34 * v;
  }

  update(t: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uTime.value = t;
    this.points.position.copy(cameraPosition);
    this.band.position.copy(cameraPosition);
  }
}

function makeBandTexture(rng: Rng): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 240; i++) {
    const y = h * 0.5 + (rng.next() - 0.5) * h * (0.1 + rng.next() * 0.28);
    const x = rng.range(0, w);
    const r = rng.range(14, 130);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = rng.pick(['70,95,150', '110,105,160', '150,120,120', '60,80,120']);
    g.addColorStop(0, `rgba(${hue},${rng.range(0.015, 0.055).toFixed(3)})`);
    g.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A couple of larger, cooler clouds off the band for depth.
  for (let i = 0; i < 5; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const r = rng.range(90, 240);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(40,70,120,${rng.range(0.02, 0.05).toFixed(3)})`);
    g.addColorStop(1, 'rgba(40,70,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
