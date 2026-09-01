// Block overlay store for structures + a facing-aware builder used by all town buildings.
import { B } from '../blocks.js';
import { measureSmallText } from '../font.js';

export const FORCE_AIR = 255;

export class TownStore {
  constructor(x0, z0, w, d, y0, h) {
    this.x0 = x0; this.z0 = z0; this.w = w; this.d = d; this.y0 = y0; this.h = h;
    this.blocks = new Uint8Array(w * d * h);
    this.signs = [];        // {x,y,z,text,order:[[x,z]...]}
    this.smoke = [];        // chimney tops {x,y,z}
    this.pois = [];         // points of interest for NPCs
    this.buildings = [];    // {name,type,door:{x,y,z},inside:{x,y,z},spots:[...],bounds}
    this.lamps = [];
    this.animalSpawns = []; // {type,x,z,tie?}
    this.npcHomes = [];
  }
  inBounds(x, y, z) { return x >= this.x0 && x < this.x0 + this.w && z >= this.z0 && z < this.z0 + this.d && y >= this.y0 && y < this.y0 + this.h; }
  idx(x, y, z) { return ((x - this.x0) * this.d + (z - this.z0)) * this.h + (y - this.y0); }
  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    this.blocks[this.idx(x, y, z)] = id === B.AIR ? FORCE_AIR : id;
  }
  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0;
    const v = this.blocks[this.idx(x, y, z)];
    return v === FORCE_AIR ? B.AIR : v;
  }
  isSet(x, y, z) { return this.inBounds(x, y, z) && this.blocks[this.idx(x, y, z)] !== 0; }
  fill(x0, y0, z0, x1, y1, z1, id) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) this.set(x, y, z, id);
  }
  // Overlay object consumed by worldgen
  overlay() { return { x0: this.x0, z0: this.z0, w: this.w, d: this.d, y0: this.y0, h: this.h, blocks: this.blocks }; }
}

// A local frame: u along the facade (left->right from the building's own perspective), v into the
// building (depth), y up. facing = direction the front faces: 'S' (+z), 'N' (-z), 'E' (+x), 'W' (-x).
export class Frame {
  constructor(store, ox, oz, facing) {
    this.s = store; this.ox = ox; this.oz = oz; this.facing = facing;
    switch (facing) {
      case 'S': this.ux = 1; this.uz = 0; this.vx = 0; this.vz = -1; break;
      case 'N': this.ux = 1; this.uz = 0; this.vx = 0; this.vz = 1; break;
      case 'E': this.ux = 0; this.uz = 1; this.vx = -1; this.vz = 0; break;
      default: this.ux = 0; this.uz = 1; this.vx = 1; this.vz = 0; break;
    }
  }
  wx(u, v) { return this.ox + u * this.ux + v * this.vx; }
  wz(u, v) { return this.oz + u * this.uz + v * this.vz; }
  world(u, v) { return [this.wx(u, v), this.wz(u, v)]; }
  set(u, y, v, id) { this.s.set(this.wx(u, v), y, this.wz(u, v), id); }
  get(u, y, v) { return this.s.get(this.wx(u, v), y, this.wz(u, v)); }
  fill(u0, y0, v0, u1, y1, v1, id) {
    if (u0 > u1) [u0, u1] = [u1, u0];
    if (v0 > v1) [v0, v1] = [v1, v0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) for (let y = y0; y <= y1; y++) this.set(u, y, v, id);
  }
  // hollow walls of a box (sides only)
  walls(u0, y0, v0, u1, y1, v1, id) {
    this.fill(u0, y0, v0, u1, y1, v0, id);
    this.fill(u0, y0, v1, u1, y1, v1, id);
    this.fill(u0, y0, v0, u0, y1, v1, id);
    this.fill(u1, y0, v0, u1, y1, v1, id);
  }
  // 2-high doorway at (u, v) with optional door block
  door(u, y, v, doorId = B.OAK_DOOR) {
    this.set(u, y, v, doorId || B.AIR);
    this.set(u, y + 1, v, doorId === B.SALOON_DOOR || !doorId ? B.AIR : doorId);
    if (doorId === B.SALOON_DOOR) this.set(u, y + 1, v, B.AIR);
  }
  window(u, y, v, h = 2) { for (let k = 0; k < h; k++) this.set(u, y + k, v, B.GLASS); }
  // Wall sign centred at u, mounted on the wall at v. Normally the sign hangs in front of the wall
  // (v-1); with back=true it hangs behind it (v+1) and reads correctly from the back side.
  sign(uCenter, y, vWall, text, back = false) {
    const n = Math.max(1, Math.ceil((measureSmallText(text) + 2) / 16));
    const u0 = uCenter - Math.floor((n - 1) / 2);
    const order = [];
    for (let k = 0; k < n; k++) {
      const u = u0 + k;
      const [x, z] = this.world(u, back ? vWall + 1 : vWall - 1);
      this.s.set(x, y, z, B.WALL_SIGN);
      order.push([x, z]);
    }
    // viewer's left-to-right: S/W facings = increasing u, N/E = decreasing u (flipped when viewed from behind)
    let reverse = this.facing === 'N' || this.facing === 'E';
    if (back) reverse = !reverse;
    if (reverse) order.reverse();
    this.s.signs.push({ y, text, order });
  }
  lantern(u, y, v) { this.set(u, y, v, B.LANTERN); }
  // Awning of slabs over the boardwalk in front: covers v = -1..-depth at height y
  awning(u0, u1, y, depth = 2, slab = B.SPRUCE_SLAB, postId = B.SPRUCE_FENCE, groundY = null) {
    for (let u = u0; u <= u1; u++) for (let v = -1; v >= -depth; v--) this.set(u, y, v, slab);
    if (groundY !== null) {
      for (let u = u0; u <= u1; u += Math.max(2, Math.min(4, u1 - u0))) {
        for (let yy = groundY; yy < y; yy++) this.set(u, yy, -depth, postId);
      }
      if ((u1 - u0) % 4 !== 0) for (let yy = groundY; yy < y; yy++) this.set(u1, yy, -depth, postId);
    }
  }
  // Western false front: raises the facade wall above the roof with a slab cornice
  falseFront(u0, u1, yTop, extra, v, id, slab) {
    this.fill(u0, yTop + 1, v, u1, yTop + extra, v, id);
    for (let u = u0; u <= u1; u++) this.set(u, yTop + extra + 1, v, slab);
    // stepped corners
    this.set(u0, yTop + extra + 1, v, B.AIR); this.set(u1, yTop + extra + 1, v, B.AIR);
    this.set(u0, yTop + extra, v, slab); this.set(u1, yTop + extra, v, slab);
  }
  // Low-pitched gable roof (rises half a block per row) with the ridge parallel to the facade.
  // Rows step: full block, then a slab on top of the next row, repeating toward the ridge.
  gableRoof(u0, u1, v0, v1, yBase, id, slabId) {
    const rows = v1 - v0 + 1;
    const half = Math.ceil(rows / 2);
    for (let k = 0; k < half; k++) {
      const va = v0 + k, vb = v1 - k;
      const y = yBase + Math.floor(k / 2);
      const over = k === 0 ? 1 : 0;
      for (let u = u0 - over; u <= u1 + over; u++) {
        if (k % 2 === 0) { this.set(u, y, va, id); this.set(u, y, vb, id); }
        else { this.set(u, y, va, id); this.set(u, y, vb, id); this.set(u, y + 1, va, slabId); this.set(u, y + 1, vb, slabId); }
      }
      // close the gable ends between the two slopes
      for (let v = va + 1; v < vb; v++) { this.set(u0, y, v, id); this.set(u1, y, v, id); if (k % 2 === 1) { this.set(u0, y + 1, v, id); this.set(u1, y + 1, v, id); } }
    }
    // ridge cap
    const yTop = yBase + Math.floor((half - 1) / 2) + ((half - 1) % 2 === 1 ? 1 : 0);
    const vm0 = v0 + half - 1, vm1 = v1 - half + 1;
    for (let u = u0; u <= u1; u++) for (let v = vm0; v <= vm1; v++) this.set(u, yTop + ((half - 1) % 2 === 0 ? 1 : 0), v, slabId);
  }
  // Flat roof with parapet
  flatRoof(u0, u1, v0, v1, y, id, parapet = B.SPRUCE_SLAB) {
    this.fill(u0, y, v0, u1, y, v1, id);
    for (let u = u0; u <= u1; u++) { this.set(u, y + 1, v0, parapet); this.set(u, y + 1, v1, parapet); }
    for (let v = v0; v <= v1; v++) { this.set(u0, y + 1, v, parapet); this.set(u1, y + 1, v, parapet); }
  }
  chimney(u, v, yFrom, yTo, id = B.BRICKS) {
    for (let y = yFrom; y <= yTo; y++) this.set(u, y, v, id);
    const [x, z] = this.world(u, v);
    this.s.smoke.push({ x, y: yTo, z });
  }
  // register a building/POI
  poi(kind, u, y, v, extra = {}) {
    const [x, z] = this.world(u, v);
    const p = { kind, x, y, z, ...extra };
    this.s.pois.push(p);
    return p;
  }
  spot(u, y, v) { const [x, z] = this.world(u, v); return { x, y, z }; }
}
