// A building blueprint: a dense local voxel grid (Uint8Array, index (x*d + z)*h + y like VoxelGrid) plus the
// metadata NPCs need (doors, lobby, spots, beds, work places, lift shafts, rooms). Local coordinates inside the
// grid; metadata is recorded in world coordinates (lot origin + y0).
import { B } from '../blocks.js';
import { RNG } from '../rng.js';

export const FH = 5;                 // floor-to-floor height (4 clear + 1 slab)
export const FORCE_AIR = 255;        // explicit air in a blueprint (0 = leave the terrain alone)

export class Blueprint {
  constructor(lot, w, h, d, y0) {
    this.lot = lot;
    this.w = w; this.h = h; this.d = d; this.y0 = y0;
    this.blocks = new Uint8Array(w * h * d);
    this.meta = { doors: [], spots: [], lifts: [], lobby: null, beds: [], work: [], rooms: [], floors: 0, family: null, name: '' };
    this.rng = new RNG(lot.seed ?? 1);
  }

  idx(x, y, z) { return (x * this.d + z) * this.h + y; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  set(x, y, z, id) { if (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) this.blocks[(x * this.d + z) * this.h + y] = id; }
  get(x, y, z) { return (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) ? this.blocks[(x * this.d + z) * this.h + y] : 0; }
  air(x, y, z) { this.set(x, y, z, FORCE_AIR); }
  isAir(x, y, z) { const v = this.get(x, y, z); return v === 0 || v === FORCE_AIR; }

  // Inclusive box fill, clamped to the grid. The y run of a column is contiguous in memory.
  fill(x0, y0, z0, x1, y1, z1, id) {
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
    if (y0 > y1) { const t = y0; y0 = y1; y1 = t; }
    if (z0 > z1) { const t = z0; z0 = z1; z1 = t; }
    if (x0 < 0) x0 = 0; if (z0 < 0) z0 = 0; if (y0 < 0) y0 = 0;
    if (x1 >= this.w) x1 = this.w - 1; if (z1 >= this.d) z1 = this.d - 1; if (y1 >= this.h) y1 = this.h - 1;
    if (x0 > x1 || y0 > y1 || z0 > z1) return;
    const blocks = this.blocks, h = this.h, d = this.d;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const base = (x * d + z) * h;
        blocks.fill(id, base + y0, base + y1 + 1);
      }
    }
  }
  // Hollow ring (the four vertical sides of a box)
  walls(x0, y0, z0, x1, y1, z1, id) {
    this.fill(x0, y0, z0, x1, y1, z0, id);
    this.fill(x0, y0, z1, x1, y1, z1, id);
    this.fill(x0, y0, z0, x0, y1, z1, id);
    this.fill(x1, y0, z0, x1, y1, z1, id);
  }
  column(x, y0, z, y1, id) { this.fill(x, y0, z, x, y1, z, id); }
  // Fill only cells that are still empty (0)
  fillIfEmpty(x0, y0, z0, x1, y1, z1, id) {
    for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(this.d - 1, z1); z++) {
      const base = (x * this.d + z) * this.h;
      for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) if (this.blocks[base + y] === 0) this.blocks[base + y] = id;
    }
  }
  // Filled disc / octagon footprint helpers (for round towers and domes): fills cells with (dx² + dz²) <= r²
  disc(cx, cz, r, y0, y1, id, hollow = false) {
    const r2 = r * r, ri2 = hollow ? (r - 1) * (r - 1) : -1;
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz, q = dx * dx + dz * dz;
      if (q <= r2 && q > ri2) this.fill(x, y0, z, x, y1, z, id);
    }
  }

  // ---------------------------------------------------------------- world-space metadata
  wx(x) { return this.lot.x0 + x; }
  wy(y) { return this.y0 + y; }
  wz(z) { return this.lot.z0 + z; }
  spot(x, y, z, kind = 'stand') { this.meta.spots.push({ x: this.wx(x), y: this.wy(y), z: this.wz(z), kind }); }
  work(x, y, z, kind = 'work') { const p = { x: this.wx(x), y: this.wy(y), z: this.wz(z), kind }; this.meta.work.push(p); }
  bed(x, y, z) { this.meta.beds.push({ x: this.wx(x), y: this.wy(y), z: this.wz(z) }); }
  door(x, y, z, side = null) { const p = { x: this.wx(x), y: this.wy(y), z: this.wz(z) }; if (side) p.side = side; this.meta.doors.push(p); }
  lift(x, z, y0, y1) { this.meta.lifts.push({ x: this.wx(x), z: this.wz(z), y0: this.wy(y0), y1: this.wy(y1) }); }
  room(kind, x0, y, z0, x1, z1) {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
    this.meta.rooms.push({ kind, x: this.wx(xa), y: this.wy(y), z: this.wz(za), w: xb - xa + 1, d: zb - za + 1 });
  }

  // Export shape used by the layout builder (blocks are shared, not copied).
  export() {
    return { w: this.w, h: this.h, d: this.d, y0: this.y0, blocks: this.blocks, meta: this.meta };
  }
}

// Copies the slice of a blueprint that intersects a 16x16 chunk column into the chunk's block array.
// 0 leaves the terrain untouched, FORCE_AIR carves air. Shared by the layout builder and the test harness.
export function stampBlueprint(chunk, bp, lotX0, lotZ0, CS = 16, CH = 256) {
  const cx = chunk.cx * CS, cz = chunk.cz * CS;
  const lx0 = Math.max(0, lotX0 - cx), lx1 = Math.min(CS, lotX0 + bp.w - cx);
  const lz0 = Math.max(0, lotZ0 - cz), lz1 = Math.min(CS, lotZ0 + bp.d - cz);
  if (lx0 >= lx1 || lz0 >= lz1) return;
  const src = bp.blocks, dst = chunk.blocks, h = bp.h, d = bp.d, y0 = bp.y0;
  const oy0 = Math.max(0, -y0), oy1 = Math.min(h, CH - y0);
  for (let lx = lx0; lx < lx1; lx++) {
    const ox = cx + lx - lotX0;
    for (let lz = lz0; lz < lz1; lz++) {
      const oz = cz + lz - lotZ0;
      const obase = (ox * d + oz) * h;
      const cbase = (lx * CS + lz) * CH + y0;
      for (let oy = oy0; oy < oy1; oy++) {
        const v = src[obase + oy];
        if (v === 0) continue;
        dst[cbase + oy] = v === FORCE_AIR ? B.AIR : v;
      }
    }
  }
}
