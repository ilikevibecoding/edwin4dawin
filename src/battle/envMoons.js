// Two distant moons as one merged mesh (one draw call): dark grey discs lit by the battle sun, so
// they show as thin crescents on the sun's side and star-occluding dark discs elsewhere. No glow. Like
// the stars they use a rotation-only view transform (fixed directions, no parallax).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLSL_HASH, GLSL_NOISE3 } from "./envGlsl.js";

// dir (unit-ish), angular radius in radians. Placed 45-70 degrees from the sun so they show as thick
// or thin crescents with the rest of the disc dark (faintly warmed by the city below).
const MOONS = [
  { dir: [0.75, 0.3, 0.59], ang: 0.02 },
  { dir: [-0.9, 0.3, 0.3], ang: 0.011 },
];

const moonVert = /* glsl */ `
varying vec3 vN;
varying vec3 vP;
void main() {
  vN = normal;
  vP = position;
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
}`;

const moonFrag = /* glsl */ `
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vN;
varying vec3 vP;
${GLSL_HASH}
${GLSL_NOISE3}
void main() {
  vec3 n = normalize(vN);
  // cratered regolith: albedo variation from noise on the surface direction (offset per moon)
  float c = fbm3(n * 5.0 + vP * 2e-6, 4);
  float rim = smoothstep(0.35, 0.6, fbm3(n * 11.0 + 4.7, 3));
  vec3 albedo = vec3(0.19, 0.18, 0.17) * (0.65 + 0.7 * c) * (0.85 + 0.3 * rim);
  float lit = max(dot(n, sunDir), 0.0);
  // faint warm earthshine from the city planet keeps the dark side just above black
  vec3 col = albedo * sunColor * lit * 0.3183 + albedo * vec3(0.085, 0.05, 0.028);
  gl_FragColor = vec4(col, 1.0);
}`;

export function buildMoons(group, sun, dist) {
  const parts = [];
  const dir = new THREE.Vector3();
  for (const m of MOONS) {
    dir.set(...m.dir).normalize();
    const r = Math.tan(m.ang) * dist;
    const g = new THREE.SphereGeometry(r, 36, 24);
    g.translate(dir.x * dist, dir.y * dist, dir.z * dist);
    parts.push(g);
  }
  const geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  const mat = new THREE.ShaderMaterial({
    uniforms: { sunDir: sun.dir, sunColor: sun.color },
    vertexShader: moonVert,
    fragmentShader: moonFrag,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "moons";
  mesh.frustumCulled = false;
  group.add(mesh);
  return mesh;
}
