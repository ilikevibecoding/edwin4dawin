// Far skyline impostors for Coruscant: one merged mesh of slightly-inset boxes, one per tower lot of the layout,
// drawn with their own long fog so the city reads to the horizon while real chunks only stream ~10 chunks out.
// Inside the streamed radius each box sits inside its real tower and is hidden by it; beyond it the box is a dark
// silhouette with a lit-window lattice at night, fading into the haze over several hundred blocks. One draw call,
// ~15k triangles; uniforms are refreshed from the material's onBeforeRender hook (no game-loop wiring).
import * as THREE from 'three';
import { SHARED } from '../entityMaterial.js';
import { LEVELS, PLATEAU } from './layout.js';

const INSET = 0.35;

const VERT = /* glsl */ `
attribute float aSeed;
varying vec3 vWorld;
varying float vSeed;
varying float vDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz; vSeed = aSeed;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform vec3 uFogColor; uniform float uSkyLight; uniform float uNear; uniform float uFar; uniform float uChunkFar;
uniform vec3 uCamPos; uniform float uGroundY;
varying vec3 vWorld; varying float vSeed; varying float vDist;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  // face orientation from derivatives: tops are lighter, sides darker; a window lattice every 3 x 5 blocks
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float top = step(0.5, abs(N.y));
  float roof = top * step(uGroundY + 1.0, vWorld.y);
  vec3 base = mix(vec3(0.16, 0.17, 0.20), vec3(0.30, 0.31, 0.34), roof) * (0.7 + 0.6 * uSkyLight);
  float u = abs(N.x) > 0.5 ? vWorld.z : vWorld.x;
  float fu = fract(u / 3.0), fy = fract(vWorld.y / 5.0);
  float win = (1.0 - top) * step(0.34, fu) * step(fu, 0.66) * step(0.25, fy) * step(fy, 0.65);
  float lit = step(0.35, hash(vec3(floor(u / 3.0), floor(vWorld.y / 5.0), vSeed)));
  vec3 night = vec3(1.0, 0.85, 0.55) * (1.2 - uSkyLight) * lit;
  vec3 day = vec3(0.55, 0.62, 0.72) * uSkyLight;
  vec3 col = mix(base, mix(day, night + day * 0.3, clamp(1.0 - uSkyLight * 1.2, 0.0, 1.0)), win);
  // hidden inside the streamed radius (the real tower is there), then fades into the haze far away
  float show = smoothstep(uChunkFar * 0.85, uChunkFar * 1.05, vDist);
  float f = smoothstep(uNear, uFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, show * (1.0 - f * 0.85));
  if (gl_FragColor.a < 0.02) discard;
}`;

export function buildSkyline(layout) {
  const lots = layout.lots.filter((l) => l.kind === 'tower');
  const n = lots.length;
  const pos = new Float32Array(n * 24 * 3), seed = new Float32Array(n * 24), idx = new Uint32Array(n * 36);
  let pi = 0, si = 0, ii = 0, vbase = 0;
  const g0 = LEVELS.ground + 1;
  for (const l of lots) {
    const x0 = l.x0 + INSET, x1 = l.x1 - INSET, z0 = l.z0 + INSET, z1 = l.z1 - INSET, y0 = g0, y1 = g0 + l.height - 0.5;
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    // 6 faces x 4 verts (separate verts so derivatives give flat normals)
    const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]];
    for (const f of faces) {
      for (const k of f) { pos[pi++] = c[k][0]; pos[pi++] = c[k][1]; pos[pi++] = c[k][2]; seed[si++] = (l.id % 97) / 97; }
      idx[ii++] = vbase; idx[ii++] = vbase + 1; idx[ii++] = vbase + 2; idx[ii++] = vbase; idx[ii++] = vbase + 2; idx[ii++] = vbase + 3;
      vbase += 4;
    }
  }
  // ground sheet: one quad over the whole city footprint just under the plateau top, so the streets between the far
  // impostors read as dark ground instead of sky showing through
  const b = PLATEAU;
  const gy = LEVELS.ground + 0.6;
  const gpos = new Float32Array([b.x0, gy, b.z0, b.x1, gy, b.z0, b.x1, gy, b.z1, b.x0, gy, b.z1]);
  const gseed = new Float32Array([0.5, 0.5, 0.5, 0.5]);
  const gidx = new Uint32Array([0, 2, 1, 0, 3, 2]);
  const allPos = new Float32Array(pos.length + gpos.length); allPos.set(pos); allPos.set(gpos, pos.length);
  const allSeed = new Float32Array(seed.length + 4); allSeed.set(seed); allSeed.set(gseed, seed.length);
  const allIdx = new Uint32Array(idx.length + 6); allIdx.set(idx); for (let i = 0; i < 6; i++) allIdx[idx.length + i] = gidx[i] + vbase;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(allPos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(allSeed, 1));
  geo.setIndex(new THREE.BufferAttribute(allIdx, 1));
  geo.computeBoundingSphere();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFogColor: SHARED.uFogColor, uSkyLight: SHARED.uSkyLight, uNear: { value: 400 }, uFar: { value: 1400 }, uChunkFar: { value: 160 }, uCamPos: { value: new THREE.Vector3() }, uGroundY: { value: LEVELS.ground } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;   // behind everything else that is transparent
  mesh.name = 'coruscant-skyline';
  return mesh;
}

// Adds the impostor mesh to the scene; uniforms follow the terrain's render distance and fog each render.
export function installSkyline(game, layout) {
  if (!game || !game.scene) return null;
  const mesh = buildSkyline(layout);
  mesh.onBeforeRender = (renderer, scene, camera) => {
    const u = mesh.material.uniforms;
    const R = (game.terrain ? game.terrain.renderDistance : 8) * 16;
    u.uChunkFar.value = R;
    u.uNear.value = R * 1.6;
    u.uFar.value = Math.max(R * 5, 900);
    u.uCamPos.value.copy(camera.position);
  };
  game.scene.add(mesh);
  return mesh;
}
