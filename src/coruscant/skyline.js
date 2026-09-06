// Far skyline impostors for Coruscant: one merged mesh of slightly-inset boxes, one per tower lot of the layout,
// drawn with their own long fog so the city reads to the horizon while real chunks only stream ~10 chunks out.
// Inside the streamed radius each box sits inside its real tower and is hidden by it; beyond it the box is a dark
// silhouette with a lit-window lattice at night, fading into the haze over several hundred blocks. One draw call,
// ~15k triangles; uniforms are refreshed from the material's onBeforeRender hook (no game-loop wiring).
import * as THREE from 'three';
import { SHARED } from '../entityMaterial.js';
import { LEVELS, PLATEAU } from './layout.js';
import { blueprintFor } from './buildings.js';
import { lotCrown } from './towers/index.js';

const INSET = 0.35;

const VERT = /* glsl */ `
attribute float aSeed;
attribute vec2 aCenter;
attribute vec3 aTint;
uniform vec3 uCamPos; uniform float uChunkFar;
varying vec3 vWorld;
varying float vSeed;
varying float vDist;
varying vec3 vTint;
void main() {
  // boxes inside the streamed radius are hidden by their real building: push them out of clip space so they cost no
  // fill (the fragment fade alone would still shade every covered pixel)
  if (distance(aCenter, uCamPos.xz) < uChunkFar * 0.8) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWorld = vec3(0.0); vSeed = 0.0; vDist = 0.0; vTint = vec3(0.0); return; }
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz; vSeed = aSeed; vTint = aTint;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform vec3 uFogColor; uniform float uSkyLight; uniform float uNear; uniform float uFar; uniform float uChunkFar;
uniform vec3 uCamPos; uniform float uGroundY;
varying vec3 vWorld; varying float vSeed; varying float vDist; varying vec3 vTint;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  // face orientation from derivatives: tops are lighter, sides darker; a window lattice every 3 x 5 blocks
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float top = step(0.5, abs(N.y));
  float roof = top * step(uGroundY + 1.0, vWorld.y);
  // landmark silhouettes (seed >= 2) are lighter stone without the office-window lattice, so a dome or a spire reads
  // as a distinct building from across the city
  float lm = step(1.5, vSeed);
  vec3 base = mix(vec3(0.16, 0.17, 0.20), vec3(0.30, 0.31, 0.34), roof) * (0.7 + 0.6 * uSkyLight);
  base = mix(base, vTint * (roof > 0.5 ? 1.1 : 0.8) * (0.2 + 0.7 * uSkyLight), lm);
  float u = abs(N.x) > 0.5 ? vWorld.z : vWorld.x;
  float fu = fract(u / 3.0), fy = fract(vWorld.y / 5.0);
  float win = (1.0 - top) * (1.0 - lm) * step(0.34, fu) * step(fu, 0.66) * step(0.25, fy) * step(fy, 0.65);
  // landmarks: a wider 4 x 6 window pitch so their night faces read as lit buildings, not black masses
  float fu2 = fract(u / 4.0), fy2 = fract(vWorld.y / 6.0);
  win += (1.0 - top) * lm * step(0.3, fu2) * step(fu2, 0.6) * step(0.3, fy2) * step(fy2, 0.6);
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

// Landmark silhouettes: the signature buildings are not plain boxes, so their impostors are built from the real
// blueprint - column tops sampled on a 3-block grid and merged into row runs - so a dome, a stepped tower or a spire
// keeps its outline from across the city.
const LM_CELL = 3;
// approximate exterior colour per landmark, so the impostor matches the real building when its chunks stream in
const LM_TINT = {
  senate: [0.50, 0.52, 0.53], temple: [0.72, 0.66, 0.55], republica: [0.78, 0.75, 0.68], chancellery: [0.62, 0.59, 0.52],
  medcenter: [0.85, 0.86, 0.86], holonet: [0.36, 0.38, 0.44], detention: [0.13, 0.13, 0.14], opera: [0.55, 0.57, 0.60],
  works: [0.30, 0.30, 0.32], market: [0.50, 0.50, 0.50], plaza_monument: [0.45, 0.45, 0.44], underworld: [0.25, 0.25, 0.27],
};
const LM_MIN_HEIGHT = 40;   // low landmarks (plaza, market halls, the undercity deck) read as rubble stubs from afar; skip them
export function landmarkBoxes(layout) {
  const out = [];
  for (const lot of layout.lots) {
    if (lot.kind !== 'landmark' || (lot.height || 0) < LM_MIN_HEIGHT) continue;
    const tint = LM_TINT[lot.family] || [0.55, 0.53, 0.48];
    let bp = null;
    try { bp = blueprintFor(lot, layout); } catch (e) { console.warn('skyline: landmark blueprint failed', lot.family, e); }
    if (!bp || !bp.blocks) continue;
    const { w, h, d, blocks } = bp;
    const cols = Math.ceil(w / LM_CELL), rows = Math.ceil(d / LM_CELL);
    const top = new Int16Array(cols * rows).fill(-1);
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      const base = (x * d + z) * h;
      let t = -1;
      for (let y = h - 1; y >= 1; y--) { const v = blocks[base + y]; if (v !== 0 && v !== 255) { t = y; break; } }
      const i = Math.floor(x / LM_CELL) * rows + Math.floor(z / LM_CELL);
      if (t > top[i]) top[i] = t;
    }
    for (let cx = 0; cx < cols; cx++) {
      let cz = 0;
      while (cz < rows) {
        const t = top[cx * rows + cz];
        if (t < 2) { cz++; continue; }
        let cz1 = cz;
        while (cz1 + 1 < rows && Math.abs(top[cx * rows + cz1 + 1] - t) <= 1) cz1++;
        out.push({ x0: lot.x0 + cx * LM_CELL, x1: lot.x0 + Math.min(w, (cx + 1) * LM_CELL), z0: lot.z0 + cz * LM_CELL, z1: lot.z0 + Math.min(d, (cz1 + 1) * LM_CELL), y1: bp.y0 + t + 1, id: lot.id, landmark: true, tint });
        cz = cz1 + 1;
      }
    }
  }
  return out;
}

export function buildSkyline(layout) {
  const lots = layout.lots.filter((l) => l.kind === 'tower');
  const g0 = LEVELS.ground + 1;
  const boxes = lots.map((l) => ({ x0: l.x0 + INSET, x1: l.x1 - INSET, z0: l.z0 + INSET, z1: l.z1 - INSET, y1: g0 + l.height - 0.5, id: l.id }));
  // rubric 11 crowns (towers/index.js lotCrown = the registry's crown profile, no blueprint needed): a frustum on
  // top of the box, its base inset by half the taper and its top by the full taper, so spires and needles read as
  // tapering silhouettes from afar while halos and decks stay boxy
  for (const l of lots) {
    const c = lotCrown(l, LEVELS.ground);
    if (c.height > 0) boxes.push({ x0: l.x0 + INSET, x1: l.x1 - INSET, z0: l.z0 + INSET, z1: l.z1 - INSET, y0: g0 + l.height - 0.5, y1: g0 + l.height + c.height - 0.5, id: l.id, taper: c.taper });
  }
  for (const b of landmarkBoxes(layout)) boxes.push(b);
  const n = boxes.length;
  const pos = new Float32Array(n * 24 * 3), seed = new Float32Array(n * 24), ctr = new Float32Array(n * 24 * 2), tnt = new Float32Array(n * 24 * 3), idx = new Uint32Array(n * 36);
  let pi = 0, si = 0, ci = 0, ti = 0, ii = 0, vbase = 0;
  for (const l of boxes) {
    const x0 = l.x0, x1 = l.x1, z0 = l.z0, z1 = l.z1, y0 = l.y0 ?? g0, y1 = l.y1;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // crown frusta: base corners inset by taper / 2, top corners by taper (fractions of the half extents)
    const tp = l.taper || 0, bx = (x1 - x0) / 2 * tp * 0.5, bz = (z1 - z0) / 2 * tp * 0.5, ux = (x1 - x0) / 2 * tp, uz = (z1 - z0) / 2 * tp;
    const c = [[x0 + bx, y0, z0 + bz], [x1 - bx, y0, z0 + bz], [x1 - ux, y1, z0 + uz], [x0 + ux, y1, z0 + uz], [x0 + bx, y0, z1 - bz], [x1 - bx, y0, z1 - bz], [x1 - ux, y1, z1 - uz], [x0 + ux, y1, z1 - uz]];
    // 6 faces x 4 verts (separate verts so derivatives give flat normals)
    const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]];
    for (const f of faces) {
      for (const k of f) { pos[pi++] = c[k][0]; pos[pi++] = c[k][1]; pos[pi++] = c[k][2]; seed[si++] = (l.id % 97) / 97 + (l.landmark ? 2 : 0); ctr[ci++] = cx; ctr[ci++] = cz; const t = l.tint || [0, 0, 0]; tnt[ti++] = t[0]; tnt[ti++] = t[1]; tnt[ti++] = t[2]; }
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
  // the ground sheet is never culled: its centre is parked far away from any camera
  const allCtr = new Float32Array(ctr.length + 8); allCtr.set(ctr); for (let i = 0; i < 4; i++) { allCtr[ctr.length + i * 2] = 1e6; allCtr[ctr.length + i * 2 + 1] = 1e6; }
  const allTnt = new Float32Array(tnt.length + 12); allTnt.set(tnt);
  const allIdx = new Uint32Array(idx.length + 6); allIdx.set(idx); for (let i = 0; i < 6; i++) allIdx[idx.length + i] = gidx[i] + vbase;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(allPos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(allSeed, 1));
  geo.setAttribute('aCenter', new THREE.BufferAttribute(allCtr, 2));
  geo.setAttribute('aTint', new THREE.BufferAttribute(allTnt, 3));
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
