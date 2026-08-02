import * as THREE from 'three';
import { radialTexture } from './Textures';

/** Shared pieces used by both ships: glow discs, plumes, running lights. */

export interface Anchors {
  [name: string]: THREE.Object3D;
}

export function anchor(parent: THREE.Object3D, name: string, x: number, y: number, z: number): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = `anchor:${name}`;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

let glowTex: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (!glowTex) glowTex = radialTexture('engine-glow', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)', 1.7);
  return glowTex;
}

/**
 * Hot engine bell.
 *
 * A flat additive disc facing aft rather than a camera-facing sprite: seen
 * from the side or from underneath it falls away naturally instead of
 * hanging off the hull as a big white ball.
 */
export function glowDisc(color: THREE.ColorRepresentation, size: number, opacity = 1): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    transparent: true,
    opacity,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(size);
  mesh.name = 'glowDisc';
  mesh.renderOrder = 2;
  return mesh;
}

const PLUME_VERT = /* glsl */ `
varying float vFade;
varying vec2 vUv;
void main() {
  vUv = uv;
  vFade = 1.0 - uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PLUME_FRAG = /* glsl */ `
uniform vec3 coreColor;
uniform vec3 edgeColor;
uniform float intensity;
uniform float time;
varying float vFade;
varying vec2 vUv;
void main() {
  float radial = abs(vUv.x - 0.5) * 2.0;
  // Steep falloff keeps the cone from reading as a solid white blob when the
  // camera looks at it from the side or from below.
  float body = pow(1.0 - radial, 2.6);
  float lengthwise = pow(vFade, 1.9);
  float flicker = 0.9 + 0.1 * sin(time * 31.0 + vUv.y * 12.0);
  vec3 c = mix(edgeColor, coreColor, body);
  float a = body * lengthwise * intensity * flicker * 0.75;
  gl_FragColor = vec4(c * a, a);
}
`;

export interface Plume {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

/**
 * Tapered exhaust cone. Rendered additively with a soft lengthwise falloff so
 * it blooms without turning into a solid white blob.
 */
export function enginePlume(
  radius: number,
  length: number,
  coreColor: THREE.ColorRepresentation,
  edgeColor: THREE.ColorRepresentation,
): Plume {
  const geo = new THREE.CylinderGeometry(radius * 0.32, radius, length, 14, 1, true);
  geo.translate(0, -length / 2, 0);
  geo.rotateX(Math.PI / 2); // point along +Z (aft)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      coreColor: { value: new THREE.Color(coreColor) },
      edgeColor: { value: new THREE.Color(edgeColor) },
      intensity: { value: 1 },
      time: { value: 0 },
    },
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'plume';
  mesh.frustumCulled = false;
  return { mesh, material };
}

/** Small blinking navigation lights. */
export class RunningLights {
  readonly points: THREE.Points;
  private material: THREE.PointsMaterial;
  private phases: Float32Array;
  private baseColors: Float32Array;

  constructor(positions: THREE.Vector3[], colors: THREE.Color[], size: number) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(positions.length * 3);
    const col = new Float32Array(positions.length * 3);
    this.phases = new Float32Array(positions.length);
    positions.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      const c = colors[i % colors.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      this.phases[i] = (i * 0.618) % 1;
    });
    this.baseColors = col.slice();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      map: radialTexture('nav-light', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)', 1.4),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.name = 'runningLights';
    this.points.frustumCulled = false;
  }

  update(t: number): void {
    const attr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.phases.length; i++) {
      const blink = 0.45 + 0.55 * Math.pow(Math.max(0, Math.sin((t * 1.1 + this.phases[i]) * Math.PI * 2)), 6);
      arr[i * 3] = this.baseColors[i * 3] * blink;
      arr[i * 3 + 1] = this.baseColors[i * 3 + 1] * blink;
      arr[i * 3 + 2] = this.baseColors[i * 3 + 2] * blink;
    }
    attr.needsUpdate = true;
  }
}
