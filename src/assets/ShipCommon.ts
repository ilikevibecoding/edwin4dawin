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

const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
varying float vFacing;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 toEye = normalize(cameraPosition - world.xyz);
  vFacing = max(dot(n, toEye), 0.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const GLOW_FRAG = /* glsl */ `
uniform vec3 core;
uniform vec3 halo;
uniform float intensity;
varying vec2 vUv;
varying float vFacing;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  if (r > 1.0) discard;
  // Flat body, soft rim, small hot centre. The body is deliberately kept
  // below the bloom threshold so it stays blue; only the centre is allowed
  // to blow out, which is the difference between a drive and a white golf ball.
  float disc = 1.0 - smoothstep(0.74, 1.0, r);
  // The hot spot has to stay small. Spread it across the disc and the bell
  // stops being a hole with fire in it and becomes a pale blue balloon.
  float hot = pow(1.0 - smoothstep(0.0, 0.34, r), 2.4);
  // Nearly invisible edge-on, so the drive does not hang off the flank.
  float face = pow(vFacing, 1.2);
  float a = disc * intensity * face;
  vec3 c = mix(halo, core, hot);
  gl_FragColor = vec4(c * a, a);
}
`;

/**
 * Hot engine bell.
 *
 * A flat additive disc rigidly facing aft, whose brightness falls away with
 * the viewing angle. Seen from behind it is a saturated disc with a blown
 * centre; seen from the flank it all but disappears, which is what keeps the
 * stern from reading as a glowing sphere stuck to the hull.
 */
export function glowDisc(color: THREE.ColorRepresentation, size: number, opacity = 1): THREE.Mesh {
  const tint = new THREE.Color(color);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      core: { value: tint.clone().lerp(new THREE.Color(1, 1, 1), 0.72) },
      halo: { value: tint.clone() },
      intensity: { value: opacity },
    },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(size);
  mesh.name = 'glowDisc';
  mesh.renderOrder = 2;
  return mesh;
}

/** Set the brightness of a disc built by {@link glowDisc}. */
export function setGlowIntensity(disc: THREE.Mesh, value: number): void {
  (disc.material as THREE.ShaderMaterial).uniforms.intensity.value = value;
}

const PLUME_VERT = /* glsl */ `
varying float vFade;
varying vec2 vUv;
varying float vFacing;
void main() {
  vUv = uv;
  // uv.y is 1 at the nozzle mouth and 0 at the far end of the cone.
  vFade = uv.y;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vFacing = abs(dot(n, normalize(cameraPosition - world.xyz)));
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const PLUME_FRAG = /* glsl */ `
uniform vec3 coreColor;
uniform vec3 edgeColor;
uniform float intensity;
uniform float time;
varying float vFade;
varying vec2 vUv;
varying float vFacing;
void main() {
  // The cone is an open tube, so "how far from the axis am I" cannot come
  // from the UVs — uv.x runs around the circumference. Facing does the job:
  // the wall facing the camera is the middle of the plume, the silhouette
  // edges are grazing, and the whole thing softens correctly from any angle.
  float body = pow(vFacing, 2.6);
  float lengthwise = pow(vFade, 2.2) * smoothstep(0.0, 0.06, vFade);
  float flicker = 0.9 + 0.1 * sin(time * 31.0 + vUv.y * 12.0);
  vec3 c = mix(edgeColor, coreColor, body);
  float a = body * lengthwise * intensity * flicker * 0.5;
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
  // Widest at the nozzle, tapering away aft. The cylinder is built along +Y
  // with its wide end on top, shifted so that end sits at the origin, then
  // turned so the cone runs down +Z — the direction every ship here calls aft.
  const geo = new THREE.CylinderGeometry(radius, radius * 0.3, length, 16, 1, true);
  geo.translate(0, -length / 2, 0);
  geo.rotateX(-Math.PI / 2);
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
