import * as THREE from 'three';
import { RNG } from './rng.js';

/** Deterministic starfield: cheap points, slight colour variety, optional streaks. */
export function starfield({ count = 2600, radius = 3000, seed = 42, size = 3.2, streak = 0 } = {}) {
  const rng = new RNG(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const tints = [
    [1.0, 1.0, 1.0], [0.82, 0.88, 1.0], [1.0, 0.94, 0.82],
    [1.0, 0.86, 0.74], [0.9, 0.95, 1.0],
  ];
  for (let i = 0; i < count; i++) {
    const u = rng.range(-1, 1);
    const th = rng.range(0, Math.PI * 2);
    const r = radius * rng.range(0.65, 1.0);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(th);
    const t = tints[rng.int(0, tints.length - 1)];
    const b = Math.pow(rng.next(), 2.1) * 0.85 + 0.15;
    col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
    sizes[i] = size * (0.45 + Math.pow(rng.next(), 3) * 1.9);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 }, uStreak: { value: streak } },
    vertexShader: /* glsl */`
      attribute float aSize; varying vec3 vC; uniform float uScale;
      void main() {
        vC = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.02, length(d));
        gl_FragColor = vec4(vC, a);
      }`,
    vertexColors: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'starfield';
  points.userData.material = mat;
  return points;
}
