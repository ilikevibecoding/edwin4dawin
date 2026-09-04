// Orbital platform for the beam disaster: an original slim ring station (torus hull, six spokes, central
// hub with a downward focusing dish and a spire). Everything is merged into ONE geometry with per-vertex
// colour + emissive channel so the whole station is a single draw call. Emissive channel values:
//   0 hull, 1 cyan strip, 2 amber pip, 3 dish (hull outside, cyan glow on the inner/back faces).
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';

export const STATION_RING_RADIUS = 26;
export const STATION_FOCUS_DROP = 11; // focus point sits this far below the station centre

const HULL = [0.11, 0.12, 0.15];
const HULL_LIGHT = [0.17, 0.18, 0.22];
const HULL_PANEL = [0.08, 0.09, 0.12];

const VERT = /* glsl */ `
attribute float aEmissive;
varying vec3 vColor;
varying float vEmissive;
varying float vShade;
void main() {
  vColor = color;
  vEmissive = aEmissive;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 l1 = normalize(vec3(0.35, 1.0, -0.55));
  vec3 l2 = normalize(vec3(-0.4, -0.5, 0.6));
  float d = max(dot(n, l1), 0.0) + 0.45 * max(dot(n, l2), 0.0);
  vShade = clamp(0.3 + 0.7 * d, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform float uPower;   // 0 dark .. 1 fully charged
uniform float uHeat;    // 0..1 warm tint while firing
uniform float uTime;
uniform float uAlpha;
uniform vec3 uGlowA;    // cyan
uniform vec3 uGlowB;    // amber
varying vec3 vColor;
varying float vEmissive;
varying float vShade;
void main() {
  float em = vEmissive;
  if (em > 2.5) em = gl_FrontFacing ? 0.0 : 1.0;
  vec3 lit = vColor * vShade * (0.3 + 0.7 * uSkyLight) * uSkyTint;
  vec3 glow = em > 1.5 ? uGlowB : uGlowA;
  float pulse = 0.8 + 0.2 * sin(uTime * (em > 1.5 ? 9.0 : 5.0) + em * 2.0);
  float e = step(0.5, em) * uPower * pulse;
  vec3 col = mix(lit, glow * (0.5 + 1.1 * uPower), e);
  col = mix(col, vec3(1.0, 0.72, 0.4), uHeat * e * 0.55);
  gl_FragColor = vec4(col, uAlpha);
}`;

// Append a geometry (transformed by `m`) into the accumulator arrays with a flat colour + emissive value.
function append(acc, geo, m, color, emissive) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.applyMatrix4(m);
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    acc.pos.push(p[i], p[i + 1], p[i + 2]);
    acc.nor.push(n[i], n[i + 1], n[i + 2]);
    acc.col.push(color[0], color[1], color[2]);
    acc.emi.push(emissive);
  }
  if (g !== geo) g.dispose();
  geo.dispose();
}

const M = new THREE.Matrix4();
const T = (x, y, z, rx = 0, ry = 0, rz = 0) => M.makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z);

export function buildStationGeometry() {
  const acc = { pos: [], nor: [], col: [], emi: [] };
  const R = STATION_RING_RADIUS;
  // main hull ring (axis vertical) + cyan running strip on its underside + amber strip on top
  append(acc, new THREE.TorusGeometry(R, 2.2, 10, 64), T(0, 0, 0, Math.PI / 2), HULL, 0);
  append(acc, new THREE.TorusGeometry(R, 0.55, 6, 64), T(0, -2.0, 0, Math.PI / 2), HULL, 1);
  append(acc, new THREE.TorusGeometry(R + 1.4, 0.35, 5, 64), T(0, 0.9, 0, Math.PI / 2), HULL, 2);
  // inner structural ring
  append(acc, new THREE.TorusGeometry(11, 0.9, 8, 40), T(0, 0.3, 0, Math.PI / 2), HULL_LIGHT, 0);
  // six spokes with a lit channel underneath, plus amber pips
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mid = (R + 5) / 2, len = R - 5;
    const cx = Math.cos(a) * mid, cz = Math.sin(a) * mid;
    append(acc, new THREE.BoxGeometry(len, 1.1, 1.7), T(cx, 0, cz, 0, -a, 0), HULL, 0);
    append(acc, new THREE.BoxGeometry(len - 2, 0.25, 0.5), T(cx, -0.65, cz, 0, -a, 0), HULL, 1);
    for (let k = 0; k < 3; k++) {
      const rr = 9 + k * 6;
      append(acc, new THREE.BoxGeometry(0.7, 0.5, 0.7), T(Math.cos(a) * rr, 0.75, Math.sin(a) * rr), HULL, 2);
    }
  }
  // three habitat pods riding the ring
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const cx = Math.cos(a) * R, cz = Math.sin(a) * R;
    append(acc, new THREE.BoxGeometry(5.5, 3.6, 4.4), T(cx, 0.6, cz, 0, -a, 0), HULL_LIGHT, 0);
    append(acc, new THREE.BoxGeometry(5.7, 0.4, 1.2), T(cx, 0.6, cz, 0, -a, 0), HULL, 2);
    append(acc, new THREE.BoxGeometry(1.5, 1.5, 4.8), T(cx, 2.6, cz, 0, -a, 0), HULL_PANEL, 0);
  }
  // central hub + top cap + spire
  append(acc, new THREE.CylinderGeometry(6, 6.6, 3.4, 28), T(0, 0.2, 0), HULL_LIGHT, 0);
  append(acc, new THREE.CylinderGeometry(3.2, 4.8, 1.4, 20), T(0, 2.5, 0), HULL, 0);
  append(acc, new THREE.CylinderGeometry(0.25, 0.7, 11, 8), T(0, 8.5, 0), HULL, 0);
  append(acc, new THREE.BoxGeometry(0.9, 0.9, 0.9), T(0, 14.3, 0), HULL, 2);
  // focusing dish: cone opening downward, glowing inside (back faces), with an amber lens ring at the mouth
  append(acc, new THREE.CylinderGeometry(3.2, 9.5, 7, 32, 1, true), T(0, -5.2, 0), HULL_PANEL, 3);
  append(acc, new THREE.TorusGeometry(9.5, 0.55, 6, 40), T(0, -8.7, 0, Math.PI / 2), HULL, 2);
  append(acc, new THREE.CylinderGeometry(1.4, 2.4, 3.4, 12), T(0, -3.4, 0), HULL, 1);
  // three struts holding the dish to the hub
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    append(acc, new THREE.BoxGeometry(0.6, 8, 0.6), T(Math.cos(a) * 6.5, -4, Math.sin(a) * 6.5, 0, -a, 0), HULL_LIGHT, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3));
  g.setAttribute('aEmissive', new THREE.Float32BufferAttribute(acc.emi, 1));
  return g;
}

export class StationMesh {
  constructor(scene) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint,
        uPower: { value: 0 }, uHeat: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 1 },
        uGlowA: { value: new THREE.Vector3(0.35, 0.9, 1.0) }, uGlowB: { value: new THREE.Vector3(1.0, 0.62, 0.2) },
      },
      vertexShader: VERT, fragmentShader: FRAG, vertexColors: true, side: THREE.DoubleSide, transparent: true,
    });
    this.geometry = buildStationGeometry();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = true;
    this.mesh.renderOrder = 8;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.scene = scene;
  }

  // Per-frame state: position, power (emissive), heat tint, slow rotation and fade-out alpha.
  set(x, y, z, power, heat, time, alpha, spin) {
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = spin;
    const u = this.material.uniforms;
    u.uPower.value = power; u.uHeat.value = heat; u.uTime.value = time; u.uAlpha.value = alpha;
    this.mesh.visible = alpha > 0.01;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
