// Planets: a textured sphere plus a rim-lit atmosphere shell. The shell is a
// back-face sphere with a fresnel shader, which is the cheapest convincing
// "air" you can put on a ball.

import * as THREE from 'three';
import { planetDesert } from '../gfx/textures.js';

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewW)));
    float glow = pow(clamp(rim, 0.0, 1.0), uPower);
    // Only the lit limb glows.
    float lit = clamp(dot(normalize(-vNormalW), normalize(uSunDir)) * 0.5 + 0.55, 0.0, 1.0);
    gl_FragColor = vec4(uColor * glow * uIntensity * lit, glow * lit);
  }
`;

export function planet({
  radius = 3000,
  seed = 21,
  segments = 64,
  atmosphere = 0x66a8ff,
  atmoScale = 1.045,
  atmoIntensity = 1.5,
  sunDir = [1, 0.4, 0.6],
  texture = null,
} = {}) {
  const g = new THREE.Group();
  const map = texture || planetDesert({ seed });
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, Math.round(segments / 2)),
    new THREE.MeshLambertMaterial({ map }),
  );
  g.add(surface);

  const uniforms = {
    uColor: { value: new THREE.Color(atmosphere) },
    uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
    uPower: { value: 2.6 },
    uIntensity: { value: atmoIntensity },
  };
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius * atmoScale, segments, Math.round(segments / 2)),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  shell.renderOrder = 2;
  g.add(shell);

  g.userData.surface = surface;
  g.userData.atmosphere = shell;
  g.userData.uniforms = uniforms;
  g.userData.radius = radius;
  return g;
}

/**
 * Curved horizon slab for shots that sit low over a planet -- much cheaper than
 * a full sphere when only the limb is on screen.
 */
export function planetLimb({ radius = 9000, seed = 21, sunDir = [1, 0.3, 0.4], atmosphere = 0x8fc0ff } = {}) {
  return planet({ radius, seed, segments: 48, sunDir, atmosphere, atmoScale: 1.03, atmoIntensity: 2.0 });
}
