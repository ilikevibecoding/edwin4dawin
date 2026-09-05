// Mesh builder for small voxel grids that move (trains, ships, turbolift cabs): culled faces, atlas UVs from the block
// registry, per-face shade, and a material that follows the world's sky light / fog like the debris shader.
// The light is sampled once per vehicle (uniform), not per vertex, so a whole car brightens/darkens together.
// Full cubes get culled faces; partial shapes (slabs, beds, tables, chests, fences, ...) are emitted from their
// collision boxes with cropped UVs like the chunk mesher does, rails as a flat quad and plants as crossed quads.
import * as THREE from 'three';
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
attribute float aShade;
varying vec2 vUv; varying float vShade; varying float vDist;
void main() {
  vUv = uv; vShade = aShade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uLight; uniform float uEmissive;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying float vShade; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(uLight.x) * uSkyLight;
  float blk = blockCurve(max(uLight.y, uEmissive));
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.05)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, 1.0);
}`;

export function voxelMaterial(atlas) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: atlas }, uLight: { value: new THREE.Vector2(1, 0) }, uEmissive: { value: 0 },
      uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash,
    },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.FrontSide,
  });
}

class GeoBuffer {
  constructor() { this.pos = []; this.uv = []; this.shade = []; this.idx = []; this.faces = 0; this.uvTmp = [0, 0]; }
  // one face of the sub box [x0..x1, y0..y1, z0..z1] inside cell (bx, by, bz)
  face(d, bx, by, bz, x0, y0, z0, x1, y1, z1, tile, shade = FACES[d].shade) {
    const F = FACES[d];
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      const px = c[0] ? x1 : x0, py = c[1] ? y1 : y0, pz = c[2] ? z1 : z0;
      faceUV(d, px, py, pz, this.uvTmp);
      this.pos.push(bx + px, by + py, bz + pz);
      this.uv.push(tu + (this.uvTmp[0] * UV_SCALE + INSET) * ts, tv + (this.uvTmp[1] * UV_SCALE + INSET) * ts);
      this.shade.push(shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faces++;
  }
  // arbitrary quad (4 corners, CCW), uv corners given as [u, v] fractions of `tile`
  quad(pts, uvs, tile, shade, doubleSided = false) {
    const [tu, tv, ts] = tileUV(tile);
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pos.push(pts[k][0], pts[k][1], pts[k][2]);
      this.uv.push(tu + (uvs[k][0] * UV_SCALE + INSET) * ts, tv + (uvs[k][1] * UV_SCALE + INSET) * ts);
      this.shade.push(shade);
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
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// grid: { w, h, d, get(x, y, z) -> block id (0 = air) }. Origin of the mesh = grid cell (0,0,0) corner.
// Returns { geometry, faces }. Interior faces between two opaque cells are culled; faces of transparent blocks
// (glass) against air are kept.
export function buildVoxelGeometry(grid) {
  const buf = new GeoBuffer();
  const { w, h, d } = grid;
  const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : grid.get(x, y, z);
  const opaqueAt = (x, y, z) => { const id = at(x, y, z); return id !== 0 && BLOCKS[id].opaque; };
  // a face flush with the cell boundary is hidden when the neighbour is opaque or the same block (glass runs)
  const hidden = (x, y, z, f, id) => { const F = FACES[f]; const nid = at(x + F.n[0], y + F.n[1], z + F.n[2]); return nid !== 0 && (opaqueAt(x + F.n[0], y + F.n[1], z + F.n[2]) || nid === id); };
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) {
    const id = at(x, y, z);
    if (id === 0) continue;
    const def = BLOCKS[id];
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
export function buildVoxelMesh(grid, atlas, opts = {}) {
  const { geometry, faces } = buildVoxelGeometry(grid);
  const mesh = new THREE.Mesh(geometry, voxelMaterial(atlas));
  mesh.material.uniforms.uEmissive.value = opts.emissive || 0;
  mesh.frustumCulled = true;
  mesh.userData.faces = faces;
  return mesh;
}
