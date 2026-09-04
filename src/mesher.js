// Builds chunk geometry: culled cube faces with Minecraft-style smooth lighting + AO,
// plus special shapes (slabs, fences, lanterns, doors, rails, signs, beds, ...).
//
// Vertex layout (see the world shader in terrain.js):
//   position  Float32 x3   chunk-local block coordinates
//   uv        Float32 x2   atlas coordinates
//   aLight    Uint8   x2   normalized; stores the light sum k in 0..60 (k/255), shader rescales to k/60
//   aShade    Uint16  x1   shade * SHADE_SCALE (exact for every AO-curve x face-shade product)
//   index     Uint16 (Uint32 only when a chunk exceeds 65536 vertices)
import * as THREE from 'three';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, ATLAS_TILES } from './constants.js';
import { B, BLOCKS, SHAPE } from './blocks.js';
import { tileUV, TILES } from './textures.js';
import { World } from './world.js';

const PW = CS + 2, PH = CH + 2;
const pidx = (px, py, pz) => (px * PW + pz) * PH + py;
// padded-index step per axis
const OX = PW * PH, OY = 1, OZ = PH;
const DOFF = new Int32Array([OX, -OX, OY, -OY, OZ, -OZ]);

export const SHADE_SCALE = 10000;
const MAX_U16_VERTS = 65536;

// Face templates. For each direction: 4 vertices (unit cube coords) in CCW order seen from outside,
// then the tangent axes used for UV: u(x,y,z) and v(x,y,z) coefficient/offset forms.
// uv formulas (fractions inside the cell): see comments.
const FACES = [
  // +X: u = 1 - z, v = 1 - y
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.6 },
  // -X: u = z, v = 1 - y
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.6 },
  // +Y: u = x, v = z
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  // -Y: u = 1 - x, v = z
  { n: [0, -1, 0], v: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], shade: 0.5 },
  // +Z: u = x, v = 1 - y
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.8 },
  // -Z: u = 1 - x, v = 1 - y
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.8 },
];

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

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
const INSET = 0.0006; // uv inset to avoid sampling neighbouring tiles
const UV_SCALE = 1 - 2 * INSET;

// Atlas tile origins (same values tileUV() returns, computed once).
const TILE_COUNT = ATLAS_TILES * ATLAS_TILES;
const TILE_U = new Float64Array(TILE_COUNT), TILE_V = new Float64Array(TILE_COUNT);
for (let i = 0; i < TILE_COUNT; i++) { const t = tileUV(i); TILE_U[i] = t[0]; TILE_V[i] = t[1]; }
const TS = tileUV(0)[2];

// Per direction / per vertex constants for the cube hot path:
//   FV{X,Y,Z}[d][k] vertex unit coords, FCU/FCV[d][k] uv fraction with inset applied,
//   FS1/FS2[d][k] padded-index offsets of the two tangent neighbours used for smooth light + AO,
//   FSQ[d][ao] quantized shade (AO curve x face shade), FSHQ[d] quantized plain face shade.
const FVX = [], FVY = [], FVZ = [], FCU = [], FCV = [], FS1 = [], FS2 = [], FSQ = [], FSHQ = new Uint16Array(6);
{
  const uv = [0, 0];
  for (let d = 0; d < 6; d++) {
    const f = FACES[d], n = f.n;
    const vx = new Uint8Array(4), vy = new Uint8Array(4), vz = new Uint8Array(4);
    const cu = new Float64Array(4), cv = new Float64Array(4), s1 = new Int32Array(4), s2 = new Int32Array(4);
    for (let k = 0; k < 4; k++) {
      const vv = f.v[k];
      vx[k] = vv[0]; vy[k] = vv[1]; vz[k] = vv[2];
      faceUV(d, vv[0], vv[1], vv[2], uv);
      cu[k] = uv[0] * UV_SCALE + INSET;
      cv[k] = uv[1] * UV_SCALE + INSET;
      if (n[0] !== 0) { s1[k] = vv[1] ? OY : -OY; s2[k] = vv[2] ? OZ : -OZ; }
      else if (n[1] !== 0) { s1[k] = vv[0] ? OX : -OX; s2[k] = vv[2] ? OZ : -OZ; }
      else { s1[k] = vv[0] ? OX : -OX; s2[k] = vv[1] ? OY : -OY; }
    }
    FVX.push(vx); FVY.push(vy); FVZ.push(vz); FCU.push(cu); FCV.push(cv); FS1.push(s1); FS2.push(s2);
    const sq = new Uint16Array(4);
    for (let ao = 0; ao < 4; ao++) sq[ao] = Math.round(AO_CURVE[ao] * f.shade * SHADE_SCALE);
    FSQ.push(sq);
    FSHQ[d] = Math.round(f.shade * SHADE_SCALE);
  }
}
const SHADE_CROSS_Q = Math.round(0.9 * SHADE_SCALE);
const SHADE_ONE_Q = SHADE_SCALE;

// Block property lookup tables (rebuilt per build; BLOCKS is filled at startup by initBlocks()).
const OPQ = new Uint8Array(256);
function refreshTables() {
  for (let i = 0; i < 256; i++) { const b = BLOCKS[i]; OPQ[i] = b && b.opaque ? 1 : 0; }
}

// cross (plant) quads: two diagonal panels, constant geometry
const CROSS_O = 0.1;
const CROSS_QUADS = [
  [[CROSS_O, 0, CROSS_O], [1 - CROSS_O, 0, 1 - CROSS_O], [1 - CROSS_O, 1, 1 - CROSS_O], [CROSS_O, 1, CROSS_O]],
  [[1 - CROSS_O, 0, CROSS_O], [CROSS_O, 0, 1 - CROSS_O], [CROSS_O, 1, 1 - CROSS_O], [1 - CROSS_O, 1, CROSS_O]],
];

class GeoBuffer {
  constructor(cap = 1 << 14) {
    this.cap = 0;
    this.pos = null; this.uv = null; this.light = null; this.shade = null; this.idx = null;
    this.grow(cap);
    this.vcount = 0;
    this.icount = 0;
  }
  grow(cap) {
    const re = (arr, C, n) => { const a = new C(n); if (arr) a.set(arr); return a; };
    this.pos = re(this.pos, Float32Array, cap * 3);
    this.uv = re(this.uv, Float32Array, cap * 2);
    this.light = re(this.light, Uint8Array, cap * 2);
    this.shade = re(this.shade, Uint16Array, cap);
    // 16-bit indices while every vertex index fits; upgraded to 32-bit only for huge chunks
    this.idx = re(this.idx, cap > MAX_U16_VERTS ? Uint32Array : Uint16Array, Math.ceil(cap * 1.5));
    this.cap = cap;
  }
  ensure(nv) {
    if (this.vcount + nv <= this.cap) return;
    this.grow(Math.max(this.cap * 2, this.vcount + nv));
  }
  reset() { this.vcount = 0; this.icount = 0; }
  // Indices for a quad whose 4 vertices start at v0; flip: alternate diagonal
  quadIndices(v0, flip) {
    const idx = this.idx, i = this.icount;
    if (!flip) {
      idx[i] = v0; idx[i + 1] = v0 + 1; idx[i + 2] = v0 + 2;
      idx[i + 3] = v0; idx[i + 4] = v0 + 2; idx[i + 5] = v0 + 3;
    } else {
      idx[i] = v0 + 1; idx[i + 1] = v0 + 2; idx[i + 2] = v0 + 3;
      idx[i + 3] = v0 + 1; idx[i + 4] = v0 + 3; idx[i + 5] = v0;
    }
    this.icount = i + 6;
  }
  // Adds a quad. verts: 4 x [x,y,z,u,v,skyK,blkK,shadeQ] (light in 0..60 units, shade quantized)
  quad(verts, flip = false) {
    this.ensure(4);
    const v0 = this.vcount;
    const pos = this.pos, uv = this.uv, light = this.light, shade = this.shade;
    for (let k = 0; k < 4; k++) {
      const v = verts[k];
      const p = v0 + k;
      pos[p * 3] = v[0]; pos[p * 3 + 1] = v[1]; pos[p * 3 + 2] = v[2];
      uv[p * 2] = v[3]; uv[p * 2 + 1] = v[4];
      light[p * 2] = v[5]; light[p * 2 + 1] = v[6];
      shade[p] = v[7];
    }
    this.quadIndices(v0, flip);
    this.vcount = v0 + 4;
  }
  toGeometry() {
    const n = this.vcount;
    if (n === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, n * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.slice(0, n * 2), 2));
    g.setAttribute('aLight', new THREE.BufferAttribute(this.light.slice(0, n * 2), 2, true));
    g.setAttribute('aShade', new THREE.BufferAttribute(this.shade.slice(0, n), 1, false));
    let index;
    if (n <= MAX_U16_VERTS && this.idx.BYTES_PER_ELEMENT !== 2) { index = new Uint16Array(this.icount); index.set(this.idx.subarray(0, this.icount)); }
    else index = this.idx.slice(0, this.icount);
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

export class Mesher {
  constructor() {
    this.pb = new Uint8Array(PW * PW * PH);
    this.ps = new Uint8Array(PW * PW * PH);
    this.pl = new Uint8Array(PW * PW * PH);
    // constant padding rows below (bedrock, dark) and above (air, full sky) every column
    for (let px = 0; px < PW; px++) for (let pz = 0; pz < PW; pz++) {
      const o = pidx(px, 1, pz);
      this.pb[o - 1] = B.BEDROCK; this.ps[o - 1] = 0; this.pl[o - 1] = 0;
      this.pb[o + CH] = B.AIR; this.ps[o + CH] = 15; this.pl[o + CH] = 0;
    }
    this.solid = new GeoBuffer();
    this.water = new GeoBuffer(1 << 12);
    this.world = null;
    this.chunk = null;
    this.tmpVerts = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
    this.tmpBack = [this.tmpVerts[3], this.tmpVerts[2], this.tmpVerts[1], this.tmpVerts[0]];
    this.uvTmp = [0, 0];
  }

  // Copies the chunk and a one-block border of its 8 neighbours into the padded arrays.
  fillPadded(world, chunk) {
    const pb = this.pb, ps = this.ps, pl = this.pl;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const c = (dx === 0 && dz === 0) ? chunk : world.getChunk(chunk.cx + dx, chunk.cz + dz);
      const gen = !!(c && c.generated), lit = gen && c.lit;
      const px0 = dx < 0 ? 0 : dx > 0 ? PW - 1 : 1, px1 = dx < 0 ? 0 : dx > 0 ? PW - 1 : CS;
      const pz0 = dz < 0 ? 0 : dz > 0 ? PW - 1 : 1, pz1 = dz < 0 ? 0 : dz > 0 ? PW - 1 : CS;
      for (let px = px0; px <= px1; px++) for (let pz = pz0; pz <= pz1; pz++) {
        const o = (px * PW + pz) * PH + 1;
        if (gen) {
          const ci = (((px - 1) & 15) * CS + ((pz - 1) & 15)) * CH;
          pb.set(c.blocks.subarray(ci, ci + CH), o);
          if (lit) { ps.set(c.sky.subarray(ci, ci + CH), o); pl.set(c.light.subarray(ci, ci + CH), o); }
          else { ps.fill(15, o, o + CH); pl.fill(0, o, o + CH); }
        } else {
          pb.fill(0, o, o + CH); ps.fill(15, o, o + CH); pl.fill(0, o, o + CH);
        }
      }
    }
  }

  build(world, chunk) {
    refreshTables();
    this.world = world;
    this.chunk = chunk;
    this.fillPadded(world, chunk);
    this.solid.reset();
    this.water.reset();
    const pb = this.pb, opq = OPQ;
    for (let x = 0; x < CS; x++) for (let z = 0; z < CS; z++) {
      const base = ((x + 1) * PW + (z + 1)) * PH + 1;
      for (let y = 0; y < CH; y++) {
        const i = base + y;
        const id = pb[i];
        if (id === 0) continue;
        const def = BLOCKS[id];
        const shape = def.shape;
        if (shape === SHAPE.CUBE) {
          // fully enclosed by opaque blocks: every face is culled
          if (opq[pb[i + OX]] & opq[pb[i - OX]] & opq[pb[i + 1]] & opq[pb[i - 1]] & opq[pb[i + OZ]] & opq[pb[i - OZ]]) continue;
          this.cube(i, x, y, z, def);
        } else if (shape === SHAPE.LIQUID) this.liquid(x, y, z, def);
        else if (shape === SHAPE.CROSS) this.cross(x, y, z, def);
        else this.special(x, y, z, def);
      }
    }
    return { solid: this.solid.toGeometry(), water: this.water.toGeometry() };
  }

  // padded accessors (x,y,z in chunk-local coords, may be -1..16)
  blk(x, y, z) { return this.pb[pidx(x + 1, y + 1, z + 1)]; }
  opaqueAt(x, y, z) { return OPQ[this.pb[pidx(x + 1, y + 1, z + 1)]] === 1; }
  skyAt(x, y, z) { return this.ps[pidx(x + 1, y + 1, z + 1)]; }
  lightAt(x, y, z) { return this.pl[pidx(x + 1, y + 1, z + 1)]; }

  cullFace(def, nid) {
    if (OPQ[nid]) return true;
    if (def.cutout && nid === def.id) return true; // glass-glass, leaves-leaves
    return false;
  }

  // Cube faces with smooth light + AO. i is the block's padded index.
  cube(i, x, y, z, def) {
    const pb = this.pb, ps = this.ps, pl = this.pl, opq = OPQ;
    const tex = def.tex, cutout = def.cutout, id = def.id;
    const gb = this.solid;
    for (let d = 0; d < 6; d++) {
      const ni = i + DOFF[d];
      const nid = pb[ni];
      if (opq[nid] || (cutout && nid === id)) continue;
      gb.ensure(4);
      const pos = gb.pos, uv = gb.uv, light = gb.light, shade = gb.shade;
      const v0 = gb.vcount;
      const tu = TILE_U[tex[d]], tv = TILE_V[tex[d]];
      // base cell = neighbour in face direction
      const s0 = ps[ni], l0 = pl[ni];
      const S1 = FS1[d], S2 = FS2[d], VX = FVX[d], VY = FVY[d], VZ = FVZ[d], CU = FCU[d], CV = FCV[d], SQ = FSQ[d];
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      for (let k = 0; k < 4; k++) {
        const oa = ni + S1[k], ob = ni + S2[k], oc = oa + S2[k];
        const o1 = opq[pb[oa]], o2 = opq[pb[ob]], occ = opq[pb[oc]];
        const ao = (o1 & o2) ? 0 : 3 - (o1 + o2 + occ);
        let s = s0 + (o1 ? s0 : ps[oa]) + (o2 ? s0 : ps[ob]);
        let l = l0 + (o1 ? l0 : pl[oa]) + (o2 ? l0 : pl[ob]);
        if (occ | (o1 & o2)) { s += s0; l += l0; } else { s += ps[oc]; l += pl[oc]; }
        const p = v0 + k;
        pos[p * 3] = x + VX[k]; pos[p * 3 + 1] = y + VY[k]; pos[p * 3 + 2] = z + VZ[k];
        uv[p * 2] = tu + CU[k] * TS; uv[p * 2 + 1] = tv + CV[k] * TS;
        light[p * 2] = s; light[p * 2 + 1] = l;
        shade[p] = SQ[ao];
        const ac = AO_CURVE[ao];
        if (k === 0) a0 = ac; else if (k === 1) a1 = ac; else if (k === 2) a2 = ac; else a3 = ac;
      }
      gb.quadIndices(v0, a0 + a2 > a1 + a3);
      gb.vcount = v0 + 4;
    }
  }

  liquid(x, y, z, def) {
    const above = this.blk(x, y + 1, z);
    const h = above === B.WATER ? 1 : 0.875;
    const tile = def.tex[0];
    const tu = TILE_U[tile], tv = TILE_V[tile], ts = TS;
    const s = this.skyAt(x, y, z) * 4, l = this.lightAt(x, y, z) * 4;
    const sUp = this.skyAt(x, y + 1, z) * 4, lUp = this.lightAt(x, y + 1, z) * 4;
    const uv = this.uvTmp;
    for (let d = 0; d < 6; d++) {
      const f = FACES[d];
      const nid = this.blk(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (nid === B.WATER) continue;
      if (OPQ[nid]) continue;
      const verts = this.tmpVerts;
      // sample light from the neighbour cell for the top face
      const ss = d === 2 ? sUp : s, ll = d === 2 ? lUp : l;
      const shadeQ = FSHQ[d];
      for (let k = 0; k < 4; k++) {
        const vv = f.v[k];
        const yy = vv[1] ? h : 0;
        faceUV(d, vv[0], yy, vv[2], uv);
        const v = verts[k];
        v[0] = x + vv[0]; v[1] = y + yy; v[2] = z + vv[2];
        v[3] = tu + (uv[0] * UV_SCALE + INSET) * ts;
        v[4] = tv + (uv[1] * UV_SCALE + INSET) * ts;
        v[5] = ss; v[6] = ll; v[7] = shadeQ;
      }
      this.water.quad(verts, false);
    }
  }

  cross(x, y, z, def) {
    const tile = def.tex[0];
    const tu = TILE_U[tile], tv = TILE_V[tile], ts = TS;
    const s = this.skyAt(x, y, z) * 4, l = this.lightAt(x, y, z) * 4;
    const u0 = tu + INSET * ts, u1 = tu + (1 - INSET) * ts, v0 = tv + INSET * ts, v1 = tv + (1 - INSET) * ts;
    const verts = this.tmpVerts;
    for (let qi = 0; qi < 2; qi++) {
      const q = CROSS_QUADS[qi];
      for (let k = 0; k < 4; k++) {
        const p = q[k];
        const v = verts[k];
        v[0] = x + p[0]; v[1] = y + p[1]; v[2] = z + p[2];
        v[3] = k === 0 || k === 3 ? u0 : u1; v[4] = p[1] ? v0 : v1;
        v[5] = s; v[6] = l; v[7] = SHADE_CROSS_Q;
      }
      this.solid.quad(verts, false);
      // back side
      this.solid.quad(this.tmpBack, false);
    }
  }

  // Emits a sub box [x0..x1, y0..y1, z0..z1] in cell (bx,by,bz) using tile per face; faces flush with the
  // cell boundary sample light from the neighbour. faceMask bit d set => skip face d. rotTop rotates +Y uv.
  box(bx, by, bz, x0, y0, z0, x1, y1, z1, tex, faceMask = 0, rotTop = 0, stretch = false, buffer = this.solid) {
    const s = this.skyAt(bx, by, bz), l = this.lightAt(bx, by, bz);
    const uv = this.uvTmp;
    for (let d = 0; d < 6; d++) {
      if (faceMask & (1 << d)) continue;
      const f = FACES[d];
      const flush = (d === 0 && x1 >= 1) || (d === 1 && x0 <= 0) || (d === 2 && y1 >= 1) || (d === 3 && y0 <= 0) || (d === 4 && z1 >= 1) || (d === 5 && z0 <= 0);
      let ss = s, ll = l;
      if (flush) {
        const nx = bx + f.n[0], ny = by + f.n[1], nz = bz + f.n[2];
        const nid = this.blk(nx, ny, nz);
        if (OPQ[nid]) continue; // fully hidden
        ss = this.skyAt(nx, ny, nz); ll = this.lightAt(nx, ny, nz);
      }
      const tile = tex[d];
      const tu = TILE_U[tile], tv = TILE_V[tile], ts = TS;
      const verts = this.tmpVerts;
      const skyK = ss * 4, blkK = ll * 4, shadeQ = FSHQ[d];
      for (let k = 0; k < 4; k++) {
        const vv = f.v[k];
        const px = vv[0] ? x1 : x0, py = vv[1] ? y1 : y0, pz = vv[2] ? z1 : z0;
        if (stretch) faceUV(d, vv[0], vv[1], vv[2], uv); else faceUV(d, px, py, pz, uv);
        let u = uv[0], v2 = uv[1];
        if (d === 2 && rotTop) {
          if (rotTop === 1) { const t = u; u = v2; v2 = 1 - t; }
          else if (rotTop === 2) { u = 1 - u; v2 = 1 - v2; }
          else { const t = u; u = 1 - v2; v2 = t; }
        }
        const v = verts[k];
        v[0] = bx + px; v[1] = by + py; v[2] = bz + pz;
        v[3] = tu + (u * UV_SCALE + INSET) * ts;
        v[4] = tv + (v2 * UV_SCALE + INSET) * ts;
        v[5] = skyK; v[6] = blkK; v[7] = shadeQ;
      }
      buffer.quad(verts, false);
    }
  }

  isSolidAt(x, y, z) { return BLOCKS[this.blk(x, y, z)].solid; }
  isOpaqueOrSame(x, y, z, id) { const n = this.blk(x, y, z); return n === id || OPQ[n] === 1; }

  special(x, y, z, def) {
    const t = def.tex;
    const id = def.id;
    switch (def.shape) {
      case SHAPE.SLAB: {
        const mask = (this.isOpaqueOrSame(x + 1, y, z, id) ? 1 : 0) | (this.isOpaqueOrSame(x - 1, y, z, id) ? 2 : 0) | (this.isOpaqueOrSame(x, y, z + 1, id) ? 16 : 0) | (this.isOpaqueOrSame(x, y, z - 1, id) ? 32 : 0);
        this.box(x, y, z, 0, 0, 0, 1, 0.5, 1, t, mask);
        break;
      }
      case SHAPE.SLAB_TOP: {
        const mask = (this.isOpaqueOrSame(x + 1, y, z, id) ? 1 : 0) | (this.isOpaqueOrSame(x - 1, y, z, id) ? 2 : 0) | (this.isOpaqueOrSame(x, y, z + 1, id) ? 16 : 0) | (this.isOpaqueOrSame(x, y, z - 1, id) ? 32 : 0);
        this.box(x, y, z, 0, 0.5, 0, 1, 1, 1, t, mask);
        break;
      }
      case SHAPE.TROUGH:
        this.box(x, y, z, 0, 0, 0, 1, 0.5, 1, t);
        break;
      case SHAPE.FARMLAND:
        this.box(x, y, z, 0, 0, 0, 1, 0.9375, 1, t);
        break;
      case SHAPE.FENCE: {
        const p0 = 0.375, p1 = 0.625;
        const above = this.blk(x, y + 1, z);
        const belowFence = this.blk(x, y - 1, z) === id;
        let mask = 0;
        if (above === id) mask |= 4;
        if (belowFence) mask |= 8;
        this.box(x, y, z, p0, 0, p0, p1, 1, p1, t, mask);
        const connect = (nx, nz) => { const nd = BLOCKS[this.blk(nx, y, nz)]; return nd.shape === SHAPE.FENCE || nd.opaque; };
        const rail = (ax0, az0, ax1, az1) => {
          this.box(x, y, z, ax0, 0.375, az0, ax1, 0.5625, az1, t, 0);
          this.box(x, y, z, ax0, 0.75, az0, ax1, 0.9375, az1, t, 0);
        };
        if (connect(x + 1, z)) rail(p1, 0.4375, 1, 0.5625);
        if (connect(x - 1, z)) rail(0, 0.4375, p0, 0.5625);
        if (connect(x, z + 1)) rail(0.4375, p1, 0.5625, 1);
        if (connect(x, z - 1)) rail(0.4375, 0, 0.5625, p0);
        break;
      }
      case SHAPE.LANTERN: {
        const sits = this.isSolidAt(x, y - 1, z);
        if (sits) {
          this.box(x, y, z, 0.3125, 0, 0.3125, 0.6875, 0.4375, 0.6875, t);
          this.box(x, y, z, 0.4375, 0.4375, 0.4375, 0.5625, 0.5625, 0.5625, t);
        } else {
          this.box(x, y, z, 0.3125, 0.375, 0.3125, 0.6875, 0.8125, 0.6875, t);
          this.box(x, y, z, 0.4375, 0.8125, 0.4375, 0.5625, 1, 0.5625, t, 4);
        }
        break;
      }
      case SHAPE.TORCH:
        this.box(x, y, z, 0.4375, 0, 0.4375, 0.5625, 0.625, 0.5625, t, 8);
        break;
      case SHAPE.RAIL: {
        const alongZ = BLOCKS[this.blk(x, y, z + 1)].shape === SHAPE.RAIL || BLOCKS[this.blk(x, y, z - 1)].shape === SHAPE.RAIL;
        const alongX = BLOCKS[this.blk(x + 1, y, z)].shape === SHAPE.RAIL || BLOCKS[this.blk(x - 1, y, z)].shape === SHAPE.RAIL;
        const rot = (alongX && !alongZ) ? 1 : 0;
        const tile = t[2];
        const tu = TILE_U[tile], tv = TILE_V[tile], ts = TS;
        const s = this.skyAt(x, y, z) * 4, l = this.lightAt(x, y, z) * 4;
        const f = FACES[2];
        const verts = this.tmpVerts;
        const uv = this.uvTmp;
        for (let k = 0; k < 4; k++) {
          const vv = f.v[k];
          faceUV(2, vv[0], 0, vv[2], uv);
          let u = uv[0], v2 = uv[1];
          if (rot) { const tmp = u; u = v2; v2 = 1 - tmp; }
          const v = verts[k];
          v[0] = x + vv[0]; v[1] = y + 0.0625; v[2] = z + vv[2];
          v[3] = tu + (u * UV_SCALE + INSET) * ts; v[4] = tv + (v2 * UV_SCALE + INSET) * ts;
          v[5] = s; v[6] = l; v[7] = SHADE_ONE_Q;
        }
        this.solid.quad(verts, false);
        break;
      }
      case SHAPE.PANE: {
        const alongX = this.isSolidAt(x + 1, y, z) || this.isSolidAt(x - 1, y, z);
        const alongZ = this.isSolidAt(x, y, z + 1) || this.isSolidAt(x, y, z - 1);
        if (alongX && !alongZ) this.box(x, y, z, 0, 0, 0.4375, 1, 1, 0.5625, t, 0);
        else this.box(x, y, z, 0.4375, 0, 0, 0.5625, 1, 1, t, 0);
        break;
      }
      case SHAPE.DOOR: {
        const isTop = BLOCKS[this.blk(x, y - 1, z)].shape === SHAPE.DOOR;
        const tile = isTop ? TILES.oak_door_top : TILES.oak_door_bottom;
        const use = [tile, tile, tile, tile, tile, tile];
        // wall axis: neighbours along x solid => wall along x => passage along z => open panel along z at x edge
        const wallX = this.isSolidAt(x + 1, y, z) || this.isSolidAt(x - 1, y, z);
        if (wallX) this.box(x, y, z, 0, 0, 0, 0.1875, 1, 1, use, 0, 0, true);
        else this.box(x, y, z, 0, 0, 0, 1, 1, 0.1875, use, 0, 0, true);
        break;
      }
      case SHAPE.SALOON_DOOR: {
        const wallX = this.isSolidAt(x + 1, y, z) || this.isSolidAt(x - 1, y, z);
        if (wallX) {
          this.box(x, y, z, 0.4375, 0.2, 0, 0.5625, 1, 0.4375, t, 0);
          this.box(x, y, z, 0.4375, 0.2, 0.5625, 0.5625, 1, 1, t, 0);
        } else {
          this.box(x, y, z, 0, 0.2, 0.4375, 0.4375, 1, 0.5625, t, 0);
          this.box(x, y, z, 0.5625, 0.2, 0.4375, 1, 1, 0.5625, t, 0);
        }
        break;
      }
      case SHAPE.WALL_SIGN: {
        const wx = this.chunk.cx * CS + x, wz = this.chunk.cz * CS + z;
        const tile = this.world.signTiles.get(World.posKey(wx, y, wz));
        const tex = tile !== undefined ? [tile, tile, tile, tile, tile, tile] : t;
        const th = 0.0625;
        if (this.isSolidAt(x, y, z - 1)) this.box(x, y, z, 0, 0.25, 0, 1, 0.75, th, tex, 32);
        else if (this.isSolidAt(x, y, z + 1)) this.box(x, y, z, 0, 0.25, 1 - th, 1, 0.75, 1, tex, 16);
        else if (this.isSolidAt(x - 1, y, z)) this.box(x, y, z, 0, 0.25, 0, th, 0.75, 1, tex, 2);
        else if (this.isSolidAt(x + 1, y, z)) this.box(x, y, z, 1 - th, 0.25, 0, 1, 0.75, 1, tex, 1);
        else this.box(x, y, z, 0, 0.25, 0.4375, 1, 0.75, 0.5, tex, 0);
        break;
      }
      case SHAPE.BED: {
        const other = id === B.BED_HEAD ? B.BED_FOOT : B.BED_HEAD;
        let rot = 0, mask = 0;
        if (this.blk(x, y, z + 1) === other) { rot = id === B.BED_HEAD ? 0 : 2; mask = 16; }
        else if (this.blk(x, y, z - 1) === other) { rot = id === B.BED_HEAD ? 2 : 0; mask = 32; }
        else if (this.blk(x + 1, y, z) === other) { rot = id === B.BED_HEAD ? 3 : 1; mask = 1; }
        else if (this.blk(x - 1, y, z) === other) { rot = id === B.BED_HEAD ? 1 : 3; mask = 2; }
        this.box(x, y, z, 0, 0, 0, 1, 0.5625, 1, t, mask, rot, true);
        break;
      }
      case SHAPE.ANVIL:
        this.box(x, y, z, 0.125, 0, 0.125, 0.875, 0.25, 0.875, t, 0, 0, true);
        this.box(x, y, z, 0.25, 0.25, 0.3125, 0.75, 0.625, 0.6875, t, 4 | 8, 0, true);
        this.box(x, y, z, 0.1875, 0.625, 0, 0.8125, 1, 1, t, 8, 0, true);
        break;
      case SHAPE.CHEST: {
        // front = first open side
        let tex = t;
        const front = t[4];
        const side = t[0];
        if (!this.isSolidAt(x, y, z + 1)) tex = [side, side, t[2], t[3], front, side];
        else if (!this.isSolidAt(x, y, z - 1)) tex = [side, side, t[2], t[3], side, front];
        else if (!this.isSolidAt(x + 1, y, z)) tex = [front, side, t[2], t[3], side, side];
        else tex = [side, front, t[2], t[3], side, side];
        this.box(x, y, z, 0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375, tex, 0, 0, true);
        break;
      }
      case SHAPE.GRAVESTONE: {
        const alongZ = BLOCKS[this.blk(x, y, z + 1)].shape === SHAPE.GRAVESTONE || BLOCKS[this.blk(x, y, z - 1)].shape === SHAPE.GRAVESTONE;
        if (alongZ) this.box(x, y, z, 0.375, 0, 0.125, 0.625, 0.75, 0.875, t, 4);
        else this.box(x, y, z, 0.125, 0, 0.375, 0.875, 0.75, 0.625, t, 4);
        break;
      }
      case SHAPE.CACTUS: {
        let mask = 0;
        if (this.blk(x, y + 1, z) === id) mask |= 4;
        if (this.blk(x, y - 1, z) === id) mask |= 8;
        this.box(x, y, z, 0.0625, 0, 0.0625, 0.9375, 1, 0.9375, t, mask);
        break;
      }
      case SHAPE.TABLE:
        this.box(x, y, z, 0, 0.75, 0, 1, 1, 1, t, 0);
        this.box(x, y, z, 0.375, 0, 0.375, 0.625, 0.75, 0.625, t, 4);
        break;
      default:
        this.box(x, y, z, 0, 0, 0, 1, 1, 1, t);
    }
  }
}
