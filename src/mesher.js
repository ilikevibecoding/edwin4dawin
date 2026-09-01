// Builds chunk geometry: culled cube faces with Minecraft-style smooth lighting + AO,
// plus special shapes (slabs, fences, lanterns, doors, rails, signs, beds, ...).
import * as THREE from 'three';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from './constants.js';
import { B, BLOCKS, SHAPE } from './blocks.js';
import { tileUV, TILES } from './textures.js';
import { World } from './world.js';

const PW = CS + 2, PH = CH + 2;
const pidx = (px, py, pz) => (px * PW + pz) * PH + py;

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

function faceUV(dir, x, y, z) {
  switch (dir) {
    case 0: return [1 - z, 1 - y];
    case 1: return [z, 1 - y];
    case 2: return [x, z];
    case 3: return [1 - x, z];
    case 4: return [x, 1 - y];
    default: return [1 - x, 1 - y];
  }
}

const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
const INSET = 0.0006; // uv inset to avoid sampling neighbouring tiles

class GeoBuffer {
  constructor(cap = 1 << 16) {
    this.pos = new Float32Array(cap * 3);
    this.uv = new Float32Array(cap * 2);
    this.light = new Float32Array(cap * 2);
    this.shade = new Float32Array(cap);
    this.idx = new Uint32Array(cap * 1.5);
    this.vcount = 0;
    this.icount = 0;
  }
  ensure(nv) {
    if (this.vcount + nv <= this.shade.length) return;
    const cap = Math.max(this.shade.length * 2, this.vcount + nv);
    const grow = (arr, n, C) => { const a = new C(n); a.set(arr); return a; };
    this.pos = grow(this.pos, cap * 3, Float32Array);
    this.uv = grow(this.uv, cap * 2, Float32Array);
    this.light = grow(this.light, cap * 2, Float32Array);
    this.shade = grow(this.shade, cap, Float32Array);
    this.idx = grow(this.idx, Math.ceil(cap * 1.5), Uint32Array);
  }
  reset() { this.vcount = 0; this.icount = 0; }
  // Adds a quad. verts: 4 x [x,y,z,u,v,sky,blk,shade]; flip: alternate diagonal
  quad(verts, flip = false) {
    this.ensure(4);
    const v0 = this.vcount;
    for (let k = 0; k < 4; k++) {
      const v = verts[k];
      const p = (v0 + k);
      this.pos[p * 3] = v[0]; this.pos[p * 3 + 1] = v[1]; this.pos[p * 3 + 2] = v[2];
      this.uv[p * 2] = v[3]; this.uv[p * 2 + 1] = v[4];
      this.light[p * 2] = v[5]; this.light[p * 2 + 1] = v[6];
      this.shade[p] = v[7];
    }
    const i = this.icount;
    if (!flip) {
      this.idx[i] = v0; this.idx[i + 1] = v0 + 1; this.idx[i + 2] = v0 + 2;
      this.idx[i + 3] = v0; this.idx[i + 4] = v0 + 2; this.idx[i + 5] = v0 + 3;
    } else {
      this.idx[i] = v0 + 1; this.idx[i + 1] = v0 + 2; this.idx[i + 2] = v0 + 3;
      this.idx[i + 3] = v0 + 1; this.idx[i + 4] = v0 + 3; this.idx[i + 5] = v0;
    }
    this.vcount += 4;
    this.icount += 6;
  }
  toGeometry() {
    if (this.vcount === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.vcount * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.slice(0, this.vcount * 2), 2));
    g.setAttribute('aLight', new THREE.BufferAttribute(this.light.slice(0, this.vcount * 2), 2));
    g.setAttribute('aShade', new THREE.BufferAttribute(this.shade.slice(0, this.vcount), 1));
    g.setIndex(new THREE.BufferAttribute(this.idx.slice(0, this.icount), 1));
    g.computeBoundingSphere();
    return g;
  }
}

export class Mesher {
  constructor() {
    this.pb = new Uint8Array(PW * PW * PH);
    this.ps = new Uint8Array(PW * PW * PH);
    this.pl = new Uint8Array(PW * PW * PH);
    this.solid = new GeoBuffer();
    this.water = new GeoBuffer();
    this.world = null;
    this.chunk = null;
    this.tmpVerts = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
  }

  fillPadded(world, chunk) {
    const pb = this.pb, ps = this.ps, pl = this.pl;
    for (let px = 0; px < PW; px++) for (let pz = 0; pz < PW; pz++) {
      const wx = chunk.cx * CS + px - 1, wz = chunk.cz * CS + pz - 1;
      const c = (px >= 1 && px <= CS && pz >= 1 && pz <= CS) ? chunk : world.chunkAt(wx, wz);
      const o = pidx(px, 1, pz);
      if (c && c.generated) {
        const ci = ((wx & 15) * CS + (wz & 15)) * CH;
        pb.set(c.blocks.subarray(ci, ci + CH), o);
        if (c.lit) { ps.set(c.sky.subarray(ci, ci + CH), o); pl.set(c.light.subarray(ci, ci + CH), o); }
        else { ps.fill(15, o, o + CH); pl.fill(0, o, o + CH); }
      } else {
        pb.fill(0, o, o + CH); ps.fill(15, o, o + CH); pl.fill(0, o, o + CH);
      }
      // padding above / below
      pb[o - 1] = B.BEDROCK; ps[o - 1] = 0; pl[o - 1] = 0;
      pb[o + CH] = B.AIR; ps[o + CH] = 15; pl[o + CH] = 0;
    }
  }

  build(world, chunk) {
    this.world = world;
    this.chunk = chunk;
    this.fillPadded(world, chunk);
    this.solid.reset();
    this.water.reset();
    const pb = this.pb;
    for (let x = 0; x < CS; x++) for (let z = 0; z < CS; z++) {
      const base = pidx(x + 1, 1, z + 1);
      for (let y = 0; y < CH; y++) {
        const id = pb[base + y];
        if (id === 0) continue;
        const def = BLOCKS[id];
        switch (def.shape) {
          case SHAPE.CUBE: this.cube(x, y, z, def); break;
          case SHAPE.LIQUID: this.liquid(x, y, z, def); break;
          case SHAPE.CROSS: this.cross(x, y, z, def); break;
          default: this.special(x, y, z, def); break;
        }
      }
    }
    return { solid: this.solid.toGeometry(), water: this.water.toGeometry() };
  }

  // padded accessors (x,y,z in chunk-local coords, may be -1..16)
  blk(x, y, z) { return this.pb[pidx(x + 1, y + 1, z + 1)]; }
  opaqueAt(x, y, z) { return BLOCKS[this.pb[pidx(x + 1, y + 1, z + 1)]].opaque; }
  skyAt(x, y, z) { return this.ps[pidx(x + 1, y + 1, z + 1)]; }
  lightAt(x, y, z) { return this.pl[pidx(x + 1, y + 1, z + 1)]; }

  // Smooth light for a vertex of a cube face. Returns [sky, blk, ao]
  vertexLight(bx, by, bz, dir, cx, cy, cz, out) {
    // base cell = neighbour in face direction; cx,cy,cz are the vertex's unit coords (0/1)
    const n = FACES[dir].n;
    const ox = bx + n[0], oy = by + n[1], oz = bz + n[2];
    // the two tangent axes
    let s1x = 0, s1y = 0, s1z = 0, s2x = 0, s2y = 0, s2z = 0;
    if (n[0] !== 0) { s1y = cy ? 1 : -1; s2z = cz ? 1 : -1; }
    else if (n[1] !== 0) { s1x = cx ? 1 : -1; s2z = cz ? 1 : -1; }
    else { s1x = cx ? 1 : -1; s2y = cy ? 1 : -1; }
    const o1 = this.opaqueAt(ox + s1x, oy + s1y, oz + s1z);
    const o2 = this.opaqueAt(ox + s2x, oy + s2y, oz + s2z);
    const oc = this.opaqueAt(ox + s1x + s2x, oy + s1y + s2y, oz + s1z + s2z);
    let ao;
    if (o1 && o2) ao = 0; else ao = 3 - ((o1 ? 1 : 0) + (o2 ? 1 : 0) + (oc ? 1 : 0));
    const s0 = this.skyAt(ox, oy, oz), l0 = this.lightAt(ox, oy, oz);
    let s = s0, l = l0;
    s += o1 ? s0 : this.skyAt(ox + s1x, oy + s1y, oz + s1z);
    l += o1 ? l0 : this.lightAt(ox + s1x, oy + s1y, oz + s1z);
    s += o2 ? s0 : this.skyAt(ox + s2x, oy + s2y, oz + s2z);
    l += o2 ? l0 : this.lightAt(ox + s2x, oy + s2y, oz + s2z);
    s += (oc || (o1 && o2)) ? s0 : this.skyAt(ox + s1x + s2x, oy + s1y + s2y, oz + s1z + s2z);
    l += (oc || (o1 && o2)) ? l0 : this.lightAt(ox + s1x + s2x, oy + s1y + s2y, oz + s1z + s2z);
    out[0] = s / 60; out[1] = l / 60; out[2] = AO_CURVE[ao];
  }

  cullFace(def, nid) {
    const nb = BLOCKS[nid];
    if (nb.opaque) return true;
    if (def.cutout && nid === def.id) return true; // glass-glass, leaves-leaves
    return false;
  }

  cube(x, y, z, def) {
    const tmp = [0, 0, 0];
    for (let d = 0; d < 6; d++) {
      const f = FACES[d];
      const nid = this.blk(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (this.cullFace(def, nid)) continue;
      const [tu, tv, ts] = tileUV(def.tex[d]);
      const verts = this.tmpVerts;
      let ao0 = 0, ao1 = 0, ao2 = 0, ao3 = 0;
      for (let k = 0; k < 4; k++) {
        const vv = f.v[k];
        this.vertexLight(x, y, z, d, vv[0], vv[1], vv[2], tmp);
        const uv = faceUV(d, vv[0], vv[1], vv[2]);
        const v = verts[k];
        v[0] = x + vv[0]; v[1] = y + vv[1]; v[2] = z + vv[2];
        v[3] = tu + (uv[0] * (1 - 2 * INSET) + INSET) * ts;
        v[4] = tv + (uv[1] * (1 - 2 * INSET) + INSET) * ts;
        v[5] = tmp[0]; v[6] = tmp[1]; v[7] = tmp[2] * f.shade;
        if (k === 0) ao0 = tmp[2]; else if (k === 1) ao1 = tmp[2]; else if (k === 2) ao2 = tmp[2]; else ao3 = tmp[2];
      }
      this.solid.quad(verts, ao0 + ao2 > ao1 + ao3);
    }
  }

  liquid(x, y, z, def) {
    const above = this.blk(x, y + 1, z);
    const h = above === B.WATER ? 1 : 0.875;
    const [tu, tv, ts] = tileUV(def.tex[0]);
    const s = this.skyAt(x, y, z) / 15, l = this.lightAt(x, y, z) / 15;
    for (let d = 0; d < 6; d++) {
      const f = FACES[d];
      const nid = this.blk(x + f.n[0], y + f.n[1], z + f.n[2]);
      if (nid === B.WATER) continue;
      if (BLOCKS[nid].opaque) continue;
      const verts = this.tmpVerts;
      for (let k = 0; k < 4; k++) {
        const vv = f.v[k];
        const yy = vv[1] ? h : 0;
        const uv = faceUV(d, vv[0], yy, vv[2]);
        const v = verts[k];
        v[0] = x + vv[0]; v[1] = y + yy; v[2] = z + vv[2];
        v[3] = tu + (uv[0] * (1 - 2 * INSET) + INSET) * ts;
        v[4] = tv + (uv[1] * (1 - 2 * INSET) + INSET) * ts;
        // sample light from the neighbour cell for side/top faces
        let ss = s, ll = l;
        if (d === 2) { ss = this.skyAt(x, y + 1, z) / 15; ll = this.lightAt(x, y + 1, z) / 15; }
        v[5] = ss; v[6] = ll; v[7] = f.shade;
      }
      this.water.quad(verts, false);
    }
  }

  cross(x, y, z, def) {
    const [tu, tv, ts] = tileUV(def.tex[0]);
    const s = this.skyAt(x, y, z) / 15, l = this.lightAt(x, y, z) / 15;
    const shade = 0.9;
    const u0 = tu + INSET * ts, u1 = tu + (1 - INSET) * ts, v0 = tv + INSET * ts, v1 = tv + (1 - INSET) * ts;
    const o = 0.1;
    const quads = [
      [[o, 0, o], [1 - o, 0, 1 - o], [1 - o, 1, 1 - o], [o, 1, o]],
      [[1 - o, 0, o], [o, 0, 1 - o], [o, 1, 1 - o], [1 - o, 1, o]],
    ];
    for (const q of quads) {
      const verts = this.tmpVerts;
      for (let k = 0; k < 4; k++) {
        const p = q[k];
        const v = verts[k];
        v[0] = x + p[0]; v[1] = y + p[1]; v[2] = z + p[2];
        v[3] = k === 0 || k === 3 ? u0 : u1; v[4] = p[1] ? v0 : v1;
        v[5] = s; v[6] = l; v[7] = shade;
      }
      this.solid.quad(verts, false);
      // back side
      const back = [verts[3], verts[2], verts[1], verts[0]];
      this.solid.quad(back, false);
    }
  }

  // Emits a sub box [x0..x1, y0..y1, z0..z1] in cell (bx,by,bz) using tile per face; faces flush with the
  // cell boundary sample light from the neighbour. faceMask bit d set => skip face d. rotTop rotates +Y uv.
  box(bx, by, bz, x0, y0, z0, x1, y1, z1, tex, faceMask = 0, rotTop = 0, stretch = false, buffer = this.solid) {
    const s = this.skyAt(bx, by, bz), l = this.lightAt(bx, by, bz);
    for (let d = 0; d < 6; d++) {
      if (faceMask & (1 << d)) continue;
      const f = FACES[d];
      const flush = (d === 0 && x1 >= 1) || (d === 1 && x0 <= 0) || (d === 2 && y1 >= 1) || (d === 3 && y0 <= 0) || (d === 4 && z1 >= 1) || (d === 5 && z0 <= 0);
      let ss = s, ll = l;
      if (flush) {
        const nx = bx + f.n[0], ny = by + f.n[1], nz = bz + f.n[2];
        const nid = this.blk(nx, ny, nz);
        if (BLOCKS[nid].opaque) continue; // fully hidden
        ss = this.skyAt(nx, ny, nz); ll = this.lightAt(nx, ny, nz);
      }
      const [tu, tv, ts] = tileUV(tex[d]);
      const verts = this.tmpVerts;
      for (let k = 0; k < 4; k++) {
        const vv = f.v[k];
        const px = vv[0] ? x1 : x0, py = vv[1] ? y1 : y0, pz = vv[2] ? z1 : z0;
        let uv = stretch ? faceUV(d, vv[0], vv[1], vv[2]) : faceUV(d, px, py, pz);
        if (d === 2 && rotTop) {
          const [u, v] = uv;
          if (rotTop === 1) uv = [v, 1 - u]; else if (rotTop === 2) uv = [1 - u, 1 - v]; else uv = [1 - v, u];
        }
        const v = verts[k];
        v[0] = bx + px; v[1] = by + py; v[2] = bz + pz;
        v[3] = tu + (uv[0] * (1 - 2 * INSET) + INSET) * ts;
        v[4] = tv + (uv[1] * (1 - 2 * INSET) + INSET) * ts;
        v[5] = ss / 15; v[6] = ll / 15; v[7] = f.shade;
      }
      buffer.quad(verts, false);
    }
  }

  isSolidAt(x, y, z) { return BLOCKS[this.blk(x, y, z)].solid; }
  isOpaqueOrSame(x, y, z, id) { const n = this.blk(x, y, z); return n === id || BLOCKS[n].opaque; }

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
        const [tu, tv, ts] = tileUV(t[2]);
        const s = this.skyAt(x, y, z) / 15, l = this.lightAt(x, y, z) / 15;
        const f = FACES[2];
        const verts = this.tmpVerts;
        for (let k = 0; k < 4; k++) {
          const vv = f.v[k];
          let uv = faceUV(2, vv[0], 0, vv[2]);
          if (rot) uv = [uv[1], 1 - uv[0]];
          const v = verts[k];
          v[0] = x + vv[0]; v[1] = y + 0.0625; v[2] = z + vv[2];
          v[3] = tu + (uv[0] * (1 - 2 * INSET) + INSET) * ts; v[4] = tv + (uv[1] * (1 - 2 * INSET) + INSET) * ts;
          v[5] = s; v[6] = l; v[7] = 1.0;
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
