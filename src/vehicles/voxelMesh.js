// Mesh builder for small voxel grids that move (trains, ships, turbolift cabs): culled faces, atlas UVs from the block
// registry, per-face shade, and a material that follows the world's sky light / fog like the debris shader.
// The light is sampled once per vehicle (uniform), not per vertex, so a whole car brightens/darkens together.
// Full cubes get culled faces; partial shapes (slabs, beds, tables, chests, fences, ...) are emitted from their
// collision boxes with cropped UVs like the chunk mesher does, rails as a flat quad and plants as crossed quads.
//
// Optional (all off by default, so existing callers render exactly as before):
//   - a per-vertex emissive channel `aEmit` = (intensity, pulse, group): faces of cells the caller's `glow(id)`
//     table marks as lit are self-lit in HDR (so bloom picks them up); `pulse` faces breathe with `uTime` scaled
//     by `uPulse` (a normalised speed: steady when 0); `group` 1 / 2 faces are switched by `uHeadWest` /
//     `uHeadEast` (head- and tail lights of a vehicle that runs both ways);
//   - `extras`: visual-only sub boxes in grid units (light strips, seats, skirts, door leaves) textured from a block
//     id or a raw atlas tile, split per cell for correct UVs unless `stretch` maps one tile over the whole box;
//   - `material`: reuse one material for several meshes of the same vehicle (one set of uniforms to update).
import * as THREE from 'three';
import { SHADING_PARS, bindShading } from '../render/shading.js';
import { BLOCKS, SHAPE } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';

// face order matches BLOCKS[id].tex: [+x, -x, +y, -y, +z, -z]; c = unit-cube corner flags (CCW seen from outside)
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], shade: 0.5 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.65 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.65 },
];
const INSET = 0.0006; // uv inset so bilinear/mip sampling never bleeds into the neighbouring atlas tile
const UV_SCALE = 1 - 2 * INSET;

// uv fraction of a point on face `dir` (same convention as the chunk mesher)
function faceUV(dir, x, y, z, out) {
  switch (dir) {
    case 0: out[0] = 1 - z; out[1] = 1 - y; break;
    case 1: out[0] = z; out[1] = 1 - y; break;
    case 2: out[0] = x; out[1] = z; break;
    case 3: out[0] = 1 - x; out[1] = z; break;
    case 4: out[0] = x; out[1] = 1 - y; break;
    default: out[0] = 1 - x; out[1] = 1 - y; break;
  }
  return out;
}

const VERT = /* glsl */ `
attribute float aShade; attribute vec3 aEmit;
varying vec2 vUv; varying float vShade; varying float vDist; varying vec3 vEmit; varying float vAlong;
#if FANCY
varying vec3 vWorldPos;
#endif
void main() {
  vUv = uv; vShade = aShade; vEmit = aEmit; vAlong = position.x;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
#if FANCY
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
#endif
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uLight; uniform float uEmissive;
uniform float uTime; uniform float uPulse; uniform float uGlow; uniform float uHeadWest; uniform float uHeadEast;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying float vShade; varying float vDist; varying vec3 vEmit; varying float vAlong;
#if FANCY
varying vec3 vWorldPos;
#endif
${SHADING_PARS}
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(uLight.x) * uSkyLight;
  float blk = blockCurve(max(uLight.y, uEmissive));
#if FANCY
  // flat cube faces: the normal comes from the position derivatives (no normal attribute in the vehicle geometry)
  vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72), vWorldPos, N, lightCurve(uLight.x), vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
#if FANCY
  col += sunSpecular(vWorldPos, N, N, V, 0.35, 0.8, tex.rgb, lightCurve(uLight.x), vDist) * vShade;   // hull metal
#endif
  // emissive faces (light strips, displays, head / tail lights): self-lit in HDR so bloom picks them up. Strips
  // flagged as pulsing breathe and carry a slow wave along the vehicle while it moves (uPulse = normalised speed)
  // and hold steady when it is docked; group 1 / 2 faces follow the direction of travel.
  float on = vEmit.z < 0.5 ? 1.0 : (vEmit.z < 1.5 ? uHeadWest : uHeadEast);
  float wave = 0.5 + 0.5 * sin(uTime * 4.0 - vAlong * 0.45);
  float glow = clamp(vEmit.x * on * (1.0 - vEmit.y * uPulse * 0.5 * wave), 0.0, 1.0);
  vec3 hot = tex.rgb * (uGlow + vEmit.y * uPulse * 0.5);
  col = mix(col, hot, glow);
  col = mix(col, fogC, smoothstep(uFogNear, uFogFar, vDist) * (1.0 - 0.6 * glow));
  gl_FragColor = vec4(col, 1.0);
}`;

export function voxelMaterial(atlas) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uLight: { value: new THREE.Vector2(1, 0) }, uEmissive: { value: 0 },
      uTime: { value: 0 }, uPulse: { value: 0 }, uGlow: { value: 1.8 }, uHeadWest: { value: 1 }, uHeadEast: { value: 1 },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
    defines: { FANCY: 0 },   // flipped to 1 by the render pipeline (sun, cascaded shadows, hull specular)
  });
  bindShading(m);
  m.userData.shadowCaster = true;   // trains and ships cast shadows on the world
  return m;
}

const NO_EMIT = [0, 0, 0];

class GeoBuffer {
  constructor() { this.pos = []; this.uv = []; this.shade = []; this.emit = []; this.idx = []; this.faces = 0; this.uvTmp = [0, 0]; this.curEmit = NO_EMIT; }
  // emissive channel for the faces emitted next: [intensity 0..1, pulse 0..1, group 0 | 1 | 2]
  setEmit(e) { this.curEmit = e || NO_EMIT; }
  pushVertex(x, y, z, u, v, shade) {
    this.pos.push(x, y, z); this.uv.push(u, v); this.shade.push(shade);
    const e = this.curEmit; this.emit.push(e[0], e[1] || 0, e[2] || 0);
  }
  // one face of the sub box [x0..x1, y0..y1, z0..z1] inside cell (bx, by, bz)
  face(d, bx, by, bz, x0, y0, z0, x1, y1, z1, tile, shade = FACES[d].shade) {
    const F = FACES[d];
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      const px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
      faceUV(d, px, py, pz, this.uvTmp);
      this.pushVertex(bx + px, by + py, bz + pz, tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
  // one face of an arbitrary box with the whole tile stretched over it (light bars, door leaves)
  boxFaceStretched(d, x0, y0, z0, x1, y1, z1, tile, shade = FACES[d].shade) {
    const F = FACES[d];
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      faceUV(d, c[0], c[1], c[2], this.uvTmp);
      this.pushVertex(c[0] ? x1 : x0, c[1] ? y1 : y0, c[2] ? z1 : z0, tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
  // arbitrary quad (4 corners, CCW), uv corners given as [u, v] fractions of `tile`
  quad(pts, uvs, tile, shade, doubleSided = false) {
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pushVertex(pts[k][0], pts[k][1], pts[k][2], tu + (uvs[k][0] * UV_SCALE + INSET) * ts, tv + (uvs[k][1] * UV_SCALE + INSET) * ts, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    if (doubleSided) this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    this.faces += doubleSided ? 2 : 1;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(this.shade, 1));
    g.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.emit, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Visual-only sub box in grid units: { x0, y0, z0, x1, y1, z1, id?, tile?, glow?, stretch?, shade? }.
// Textures come from block `id` (per face) or one raw atlas `tile`; boxes spanning several cells are split per cell
// so every piece samples one whole tile (like the partial shapes), unless `stretch` maps the tile over the whole box.
function emitExtra(buf, e) {
  const tex = (f) => (e.tile !== undefined ? e.tile : BLOCKS[e.id || 0].tex[f]);
  buf.setEmit(e.glow);
  const shadeOf = (f) => (e.shade !== undefined ? e.shade : FACES[f].shade);
  if (e.stretch) {
    for (let f = 0; f < 6; f++) buf.boxFaceStretched(f, e.x0, e.y0, e.z0, e.x1, e.y1, e.z1, tex(f), shadeOf(f));
    buf.setEmit(null);
    return;
  }
  const EPS = 1e-6;
  const cx0 = Math.floor(e.x0 + EPS), cx1 = Math.ceil(e.x1 - EPS) - 1;
  const cy0 = Math.floor(e.y0 + EPS), cy1 = Math.ceil(e.y1 - EPS) - 1;
  const cz0 = Math.floor(e.z0 + EPS), cz1 = Math.ceil(e.z1 - EPS) - 1;
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) for (let cz = cz0; cz <= cz1; cz++) {
    const x0 = Math.max(e.x0, cx) - cx, x1 = Math.min(e.x1, cx + 1) - cx;
    const y0 = Math.max(e.y0, cy) - cy, y1 = Math.min(e.y1, cy + 1) - cy;
    const z0 = Math.max(e.z0, cz) - cz, z1 = Math.min(e.z1, cz + 1) - cz;
    // only the faces on the box's own boundary (not the cuts between pieces)
    if (cx === cx1) buf.face(0, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(0), shadeOf(0));
    if (cx === cx0) buf.face(1, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(1), shadeOf(1));
    if (cy === cy1) buf.face(2, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(2), shadeOf(2));
    if (cy === cy0) buf.face(3, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(3), shadeOf(3));
    if (cz === cz1) buf.face(4, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(4), shadeOf(4));
    if (cz === cz0) buf.face(5, cx, cy, cz, x0, y0, z0, x1, y1, z1, tex(5), shadeOf(5));
  }
  buf.setEmit(null);
}

// grid: { w, h, d, get(x, y, z) -> block id (0 = air) }. Origin of the mesh = grid cell (0,0,0) corner.
// Returns { geometry, faces }. Interior faces between two opaque cells are culled; faces of transparent blocks
// (glass) against air are kept.
// opts.glow: (id, x, y, z) => [intensity, pulse, group] | null - emissive channel of a cell's faces (default none);
// opts.extras: visual-only sub boxes (see emitExtra); opts.cells: (x, y, z, id) => false to skip a cell (its
// geometry lives in another mesh, e.g. door leaves that move on their own).
export function buildVoxelGeometry(grid, opts = {}) {
  const buf = new GeoBuffer();
  const { w, h, d } = grid;
  const glow = opts.glow || null;
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : grid.get(x, y, z);
  const opaqueAt = (x, y, z) => { const id = at(x, y, z); return id !== 0 && BLOCKS[id].opaque; };
  // a face flush with the cell boundary is hidden when the neighbour is opaque or the same block (glass runs)
  const hidden = (x, y, z, f, id) => { const F = FACES[f]; const nid = at(x + F.n[0], y + F.n[1], z + F.n[2]); return nid !== 0 && (opaqueAt(x + F.n[0], y + F.n[1], z + F.n[2]) || nid === id); };
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = at(x, y, z);
    if (id === 0) continue;
    if (opts.cells && opts.cells(x, y, z, id) === false) continue;
    const def = BLOCKS[id];
    buf.setEmit(glow ? glow(id, x, y, z) : null);
    if (def.shape === SHAPE.CUBE || def.shape === SHAPE.LIQUID) {
      for (let f = 0; f < 6; f++) {
        if (hidden(x, y, z, f, id)) continue;
        buf.face(f, x, y, z, 0, 0, 0, 1, 1, 1, def.tex[f]);
      }
      continue;
    }
    if (def.shape === SHAPE.RAIL) {
      const alongX = BLOCKS[at(x + 1, y, z)].shape === SHAPE.RAIL || BLOCKS[at(x - 1, y, z)].shape === SHAPE.RAIL;
      const alongZ = BLOCKS[at(x, y, z + 1)].shape === SHAPE.RAIL || BLOCKS[at(x, y, z - 1)].shape === SHAPE.RAIL;
      const rot = alongX && !alongZ;
      const c = FACES[2].c, pts = [], uvs = [];
      for (let k = 0; k < 4; k++) {
        pts.push([x + c[k][0], y + 0.0625, z + c[k][2]]);
        let u = c[k][0], v = c[k][2];
        if (rot) { const t = u; u = v; v = 1 - t; }
        uvs.push([u, v]);
      }
      buf.quad(pts, uvs, def.tex[2], 1.0);
      continue;
    }
    if (def.shape === SHAPE.CROSS) {
      const o = 0.1, tile = def.tex[0];
      buf.quad([[x + o, y, z + o], [x + 1 - o, y, z + 1 - o], [x + 1 - o, y + 1, z + 1 - o], [x + o, y + 1, z + o]], [[0, 1], [1, 1], [1, 0], [0, 0]], tile, 0.9, true);
      buf.quad([[x + 1 - o, y, z + o], [x + o, y, z + 1 - o], [x + o, y + 1, z + 1 - o], [x + 1 - o, y + 1, z + o]], [[0, 1], [1, 1], [1, 0], [0, 0]], tile, 0.9, true);
      continue;
    }
    // partial shapes: one sub box per collision box (torches / lanterns get a small post, other box-less
    // decorations are skipped: they only exist for the world mesher)
    let boxes = def.boxes;
    if (!boxes.length) {
      if (def.shape === SHAPE.TORCH) boxes = [[0.4375, 0, 0.4375, 0.5625, 0.625, 0.5625]];
      else if (def.shape === SHAPE.LANTERN) boxes = [[0.3125, 0, 0.3125, 0.6875, 0.4375, 0.6875]];
      else if (def.shape === SHAPE.PANE) boxes = [[0.4375, 0, 0, 0.5625, 1, 1]];
      else continue;
    }
    for (const b of boxes) {
      for (let f = 0; f < 6; f++) {
        const flush = (f === 0 && b[3] >= 1) || (f === 1 && b[0] <= 0) || (f === 2 && b[4] >= 1) || (f === 3 && b[1] <= 0) || (f === 4 && b[5] >= 1) || (f === 5 && b[2] <= 0);
        if (flush && hidden(x, y, z, f, id)) continue;
        buf.face(f, x, y, z, b[0], b[1], b[2], b[3], b[4], b[5], def.tex[f]);
      }
    }
  }
  buf.setEmit(null);
  if (opts.extras) for (const e of opts.extras) emitExtra(buf, e);
  return { geometry: buf.build(), faces: buf.faces };
}

// Geometry of extras alone (no grid cells): parts that move relative to the hull, e.g. sliding door leaves.
export function buildExtrasGeometry(extras) {
  const buf = new GeoBuffer();
  for (const e of extras) emitExtra(buf, e);
  return { geometry: buf.build(), faces: buf.faces };
}

// Convenience: a dense Uint8Array grid.
export class VoxelGrid {
  constructor(w, h, d) { this.w = w; this.h = h; this.d = d; this.data = new Uint8Array(w * h * d); }
  idx(x, y, z) { return (x * this.d + z) * this.h + y; }
  get(x, y, z) { return (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) ? 0 : this.data[this.idx(x, y, z)]; }
  set(x, y, z, id) { if (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) this.data[this.idx(x, y, z)] = id; }
  fill(x0, y0, z0, x1, y1, z1, id) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, id); }
  // number of non-air cells
  count() { let n = 0; for (let i = 0; i < this.data.length; i++) if (this.data[i]) n++; return n; }
}

// opts.emissive: floor for the block-light channel (0..1) so lit interiors stay visible at night.
// opts.material: an existing voxelMaterial to share; opts.glow / opts.extras / opts.cells: see buildVoxelGeometry.
export function buildVoxelMesh(grid, atlas, opts = {}) {
  const { geometry, faces } = buildVoxelGeometry(grid, opts);
  const mesh = new THREE.Mesh(geometry, opts.material || voxelMaterial(atlas));
  if (!opts.material) mesh.material.uniforms.uEmissive.value = opts.emissive || 0;
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}

// A mesh of extras only (see buildExtrasGeometry) sharing the vehicle's material.
export function buildExtrasMesh(extras, material) {
  const { geometry, faces } = buildExtrasGeometry(extras);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}
