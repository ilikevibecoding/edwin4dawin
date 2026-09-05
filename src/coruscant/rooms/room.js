// Orientation-independent room frame used by every room template: u runs along the door wall (0..w-1), v is
// the depth from the door wall (0 = the row just inside the door, d-1 = the back wall row), ly is the height
// above the floor walk level (0 = standing level, h = ceiling slab). Templates never touch the walls
// themselves; they furnish the interior and record NPC spots. Cells in the door zone (two rows in front of the
// door opening) refuse furniture so every room stays enterable.
import { B } from '../../blocks.js';

export const SEAT = B.STONE_BRICK_SLAB;       // generic chair / bench / stool
export const COUNTER_TOP = B.STONE_BRICK_SLAB;

export class Room {
  // rect: { x0, z0, x1, z1 (interior, inclusive), y (walk level), h (clear height), side ('N'|'S'|'E'|'W' = wall
  // holding the door), doorU (first door cell in u), doorW }
  constructor(bp, rect, kind, ctx = {}) {
    this.bp = bp; this.rect = rect; this.kind = kind; this.ctx = ctx;
    this.y = rect.y; this.h = rect.h;
    this.side = rect.side;
    const alongX = this.side === 'N' || this.side === 'S';
    this.w = alongX ? rect.x1 - rect.x0 + 1 : rect.z1 - rect.z0 + 1;
    this.d = alongX ? rect.z1 - rect.z0 + 1 : rect.x1 - rect.x0 + 1;
    this.doorU = rect.doorU ?? -100; this.doorW = rect.doorW ?? 2;
    this.backDoorU = rect.backDoorU ?? -100;   // optional second door in the back wall (deep strips)
    this.mask = rect.mask || null;             // optional footprint mask (x, z) -> bool for non-rectangular tiers
    this.cu = Math.floor((this.w - 1) / 2);   // centre column (left-centre for even widths)
    this.back = this.d - 1;                    // row against the back wall
    this.spots = 0;
  }
  X(u, v) {
    switch (this.side) {
      case 'S': case 'N': return this.rect.x0 + u;
      case 'E': return this.rect.x1 - v;
      default: return this.rect.x0 + v;
    }
  }
  Z(u, v) {
    switch (this.side) {
      case 'S': return this.rect.z1 - v;
      case 'N': return this.rect.z0 + v;
      default: return this.rect.z0 + u;
    }
  }
  inside(u, v) { return u >= 0 && v >= 0 && u < this.w && v < this.d && (!this.mask || this.mask(this.X(u, v), this.Z(u, v))); }
  inDoorZone(u, v) {
    return (v <= 1 && u >= this.doorU - 1 && u <= this.doorU + this.doorW)
      || (v >= this.d - 2 && u >= this.backDoorU - 1 && u <= this.backDoorU + this.doorW);
  }
  free(u, v) { return this.inside(u, v) && !this.inDoorZone(u, v); }
  // Furniture write (ly = height above the walk level). The door zone is protected up to head height.
  put(u, ly, v, id) {
    if (!this.inside(u, v)) return false;
    if (ly <= 2 && this.inDoorZone(u, v)) return false;
    this.bp.set(this.X(u, v), this.y + ly, this.Z(u, v), id);
    return true;
  }
  // Unprotected write (used for ceilings, wall-mounted lights, and things that must appear near the door)
  putRaw(u, ly, v, id) { if (this.inside(u, v)) this.bp.set(this.X(u, v), this.y + ly, this.Z(u, v), id); }
  get(u, ly, v) { return this.inside(u, v) ? this.bp.get(this.X(u, v), this.y + ly, this.Z(u, v)) : 0; }
  fill(u0, ly0, v0, u1, ly1, v1, id) {
    if (u0 > u1) { const t = u0; u0 = u1; u1 = t; }
    if (v0 > v1) { const t = v0; v0 = v1; v1 = t; }
    if (ly0 > ly1) { const t = ly0; ly0 = ly1; ly1 = t; }
    for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) for (let ly = ly0; ly <= ly1; ly++) this.put(u, ly, v, id);
  }
  // Two-block bed with its head at (u, v); the foot points toward the door (v-1) unless alongU. The sleeper's
  // standing spot is resolved in finalize(), after the template has placed the rest of the furniture.
  bed(u, v, alongU = false, dir = 1) {
    const fu = alongU ? u + dir : u, fv = alongU ? v : v - 1;
    if (!this.free(u, v) || !this.free(fu, fv)) return false;
    this.put(u, 0, v, B.BED_HEAD); this.put(fu, 0, fv, B.BED_FOOT);
    const cands = alongU ? [[u, v + 1], [u, v - 1], [fu + dir, v], [fu, fv + 1], [fu, fv - 1]] : [[u + 1, v], [u - 1, v], [u, fv - 1], [fu + 1, fv], [fu - 1, fv]];
    (this._beds || (this._beds = [])).push({ fu, fv, cands });
    return true;
  }
  // Records NPC bed spots: the first empty cell beside the bed, else the foot of the bed itself.
  finalize() {
    if (!this._beds) return;
    for (const b of this._beds) {
      let done = false;
      for (const [su, sv] of b.cands) if (this.inside(su, sv) && this.empty(su, 0, sv) && this.empty(su, 1, sv)) { this.bp.bed(this.X(su, sv), this.y, this.Z(su, sv)); done = true; break; }
      if (!done) this.bp.bed(this.X(b.fu, b.fv), this.y, this.Z(b.fu, b.fv));
    }
    this._beds = null;
  }
  empty(u, ly, v) { const id = this.get(u, ly, v); return id === 0 || id === 255; }
  spot(u, v, kind = 'stand') { if (this.inside(u, v)) { this.bp.spot(this.X(u, v), this.y, this.Z(u, v), kind); this.spots++; } }
  work(u, v, kind = 'work') { if (this.inside(u, v)) { this.bp.work(this.X(u, v), this.y, this.Z(u, v), kind); this.spots++; } }
  // seat (slab) with a spot on it
  seat(u, v, id = SEAT) { if (this.put(u, 0, v, id)) this.spot(u, v, 'seat'); }
  table(u, v, id = B.TABLE) { return this.put(u, 0, v, id); }
  // Ceiling light grid at the ceiling slab (every `sp` cells, offset so small rooms still get one).
  ceilingLights(sp = 4, id = B.GLOW_PANEL) {
    const ou = Math.floor(((this.w - 1) % sp) / 2), ov = Math.floor(((this.d - 1) % sp) / 2);
    let n = 0;
    for (let u = ou; u < this.w; u += sp) for (let v = ov; v < this.d; v += sp) { this.putRaw(u, this.h, v, id); n++; }
    if (n === 0) this.putRaw(this.cu, this.h, Math.floor(this.d / 2), id);
    return n;
  }
  // hanging lantern just under the ceiling
  lantern(u, v) { this.putRaw(u, this.h - 1, v, B.LANTERN); }
  // Low counter (block + slab top) along u from ua..ub at row v
  counter(ua, ub, v, base = B.PANEL_BLACK, top = COUNTER_TOP) {
    for (let u = ua; u <= ub; u++) { if (this.put(u, 0, v, base)) this.put(u, 1, v, top); }
  }
  // Wall-mounted block on the back wall face (row d-1) at height ly
  backWall(u, ly, id) { this.put(u, ly, this.back, id); }
  // Wall-mounted block along the side walls
  leftWall(v, ly, id) { this.put(0, ly, v, id); }
  rightWall(v, ly, id) { this.put(this.w - 1, ly, v, id); }
  // Planter: dark base with leaves on top
  planter(u, v, leaf = B.OAK_LEAVES) { if (this.put(u, 0, v, B.DURASTEEL_DARK)) this.put(u, 1, v, leaf); }
  // iterate free perimeter cells
  perimeter(cb) {
    for (let u = 0; u < this.w; u++) { cb(u, 0); if (this.d > 1) cb(u, this.d - 1); }
    for (let v = 1; v < this.d - 1; v++) { cb(0, v); if (this.w > 1) cb(this.w - 1, v); }
  }
}
