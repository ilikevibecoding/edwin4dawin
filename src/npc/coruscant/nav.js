// Street navigation for the Coruscant crowd (rubric 07 row 6). Two coarse walkability bitmaps (2x2 blocks) are
// derived from the layout alone: the undercity ground (everything that is not a lot, the spaceport or the rim
// railing) and the boulevard decks (the 12-wide decks, the plazas and the gangways to the towers' mid-level doors).
// A bounded A* on a bitmap gives a route between two street points, string-pulled into a few corner waypoints that
// the NPC then walks with the real block-level A* of npc/pathfinding.js (one leg per pair of waypoints, budgeted per
// tick through `PathQueue`). Level changes happen only at the intersections' lift shafts (`layout.lifts`), modelled
// as a 2 s ride in the shaft (the shafts are solid blocks; turbolift cabs are not implemented yet).
import { findPath, findStand } from '../pathfinding.js';
import { DECK_HALF, MARGIN } from '../../coruscant/layout.js';
import { portRects, inPort, PORT_Y } from './port.js';
import { LotInfo } from './lots.js';

export const RES = 2;
export const GROUND_Y = 61, DECK_Y = 96;
export { PORT_Y };
export const LIFT_RIDE_S = 2;
export const LEG_MAX = 40;     // longest straight walk leg handed to the block-level A*

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

export class CityNav {
  constructor(layout) {
    this.layout = layout;
    const P = layout.plateau;
    this.x0 = P.x0; this.z0 = P.z0;
    this.w = Math.ceil((P.x1 - P.x0) / RES); this.d = Math.ceil((P.z1 - P.z0) / RES);
    this.ground = new Uint8Array(this.w * this.d);
    this.deck = new Uint8Array(this.w * this.d);
    this.g = new Float32Array(this.w * this.d);
    this.stamp = new Uint32Array(this.w * this.d);
    this.came = new Int32Array(this.w * this.d);
    this.gen = 0;
    this.stats = { coarse: 0, coarseFail: 0, expanded: 0 };
    this.build();
  }

  idx(cx, cz) { return cx * this.d + cz; }
  cellOf(x, z) { return [Math.floor((x - this.x0) / RES), Math.floor((z - this.z0) / RES)]; }
  centre(cx, cz) { return { x: this.x0 + cx * RES + 1, z: this.z0 + cz * RES + 1 }; }
  inGrid(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.d; }
  markRect(map, x0, z0, x1, z1, v) { // block coords, x1/z1 exclusive; optimistic (any overlap marks the cell)
    const [a, b] = this.cellOf(x0, z0), [c, e] = this.cellOf(x1 - 1, z1 - 1);
    for (let cx = Math.max(0, a); cx <= Math.min(this.w - 1, c); cx++) for (let cz = Math.max(0, b); cz <= Math.min(this.d - 1, e); cz++) map[this.idx(cx, cz)] = v;
  }

  build() {
    const L = this.layout, P = L.plateau;
    this.ground.fill(1);
    // outermost rim cells carry the railing; the spaceport is its own structure; lots are solid
    this.markRect(this.ground, P.x0, P.z0, P.x1, P.z0 + 1, 0); this.markRect(this.ground, P.x0, P.z1 - 1, P.x1, P.z1, 0);
    this.markRect(this.ground, P.x0, P.z0, P.x0 + 1, P.z1, 0); this.markRect(this.ground, P.x1 - 1, P.z0, P.x1, P.z1, 0);
    const S = L.spaceport; this.markRect(this.ground, S.x0, S.z0, S.x1, S.z1, 0);
    for (const lot of L.lots) if (lot.kind !== 'plaza') this.markRect(this.ground, lot.x0, lot.z0, lot.x1, lot.z1, 0);
    // decks: mid-level boulevards, plazas, gangways (same geometry as city.js paints)
    for (const s of L.boulevards) if (s.level === 'mid') this.markRect(this.deck, s.x0, s.z0, s.x1, s.z1, 1);
    for (const lot of L.lots) if (lot.kind === 'plaza') this.markRect(this.deck, lot.x0, lot.z0, lot.x1, lot.z1, 1);
    for (const lot of L.lots) {
      if (!lot.midDoor || lot.kind === 'plaza' || !lot.door) continue;
      const dr = lot.door, side = dr.side;
      const gx0 = side === 'W' ? lot.x0 - MARGIN : side === 'E' ? lot.x1 : dr.x - 1, gx1 = side === 'W' ? lot.x0 : side === 'E' ? lot.x1 + MARGIN : dr.x + 3;
      const gz0 = side === 'N' ? lot.z0 - MARGIN : side === 'S' ? lot.z1 : dr.z - 1, gz1 = side === 'N' ? lot.z0 : side === 'S' ? lot.z1 + MARGIN : dr.z + 3;
      this.markRect(this.deck, gx0, gz0, gx1, gz1, 1);
    }
    // intersection lifts: the shaft stands in the margin diagonally off the deck's crossing corner, so the stand cell is
    // that corner cell (a crossing cell: no kerb railing) - the same column serves both levels (under the deck below)
    this.lifts = [];
    for (const lf of L.lifts) {
      const sx = lf.x + (lf.sx > 0 ? DECK_HALF - 1 : -DECK_HALF), sz = lf.z + (lf.sz > 0 ? DECK_HALF - 1 : -DECK_HALF);
      this.lifts.push({ x: sx, z: sz, shaft: { x0: lf.x0, z0: lf.z0 }, ix: lf.x, iz: lf.z });
      // shafts and helix stairs are obstacles on both levels
      this.markRect(this.ground, lf.x0, lf.z0, lf.x0 + 2, lf.z0 + 2, 0);
      this.markRect(this.deck, lf.x0, lf.z0, lf.x0 + 2, lf.z0 + 2, 0);
    }
    for (const st of L.stairs) { this.markRect(this.ground, st.x0, st.z0, st.x0 + 4, st.z0 + 4, 0); this.markRect(this.deck, st.x0, st.z0, st.x0 + 4, st.z0 + 4, 0); }
    this.markRect(this.ground, S.x0, S.z0, S.x1, S.z1, 0);
    // landmarks with streets of their own (the Uscru undercity strip's main street and alleys, forecourts, roof decks
    // that continue the boulevard): their blueprint says where one can walk in the open at either street level
    this.landmarkCells = 0;
    for (const lot of L.lots) {
      if (lot.kind !== 'landmark') continue;
      let li = null;
      try { li = new LotInfo(lot, L); } catch (e) { continue; }
      this.landmarkCells += this.sampleLot(li, this.ground, GROUND_Y) + this.sampleLot(li, this.deck, DECK_Y);
    }
    // a landmark's plinths, inner courts, hall aisles and terraces sample as walkable too, but only its doors lead
    // there: keep the one connected street network per level, so no one is placed (or sent) where no street route
    // leads (the courts belong to the building - LotInfo places its people there)
    this.islandsPruned = this.keepMainland(this.ground) + this.keepMainland(this.deck);
    // plazas share the deck level but the boulevard kerb railing runs along their whole edge: routes hop it (kerbHop)
    this.plazas = L.lots.filter((l) => l.kind === 'plaza').map((l) => ({ id: l.id, x0: l.x0, z0: l.z0, x1: l.x1, z1: l.z1 }));
    // the spaceport deck (feet 97): its own level, walkable around the terminal, hangar, fuel farm and tower
    this.port = new Uint8Array(this.w * this.d);
    const pr = portRects();
    for (const r of pr.walk) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 1);
    for (const r of pr.block) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 0);
    for (const r of pr.open) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 1);
  }

  // Mark the coarse cells of a landmark lot where one can stand at feet height `y` in the open (six blocks of headroom:
  // streets, courtyards and decks, not rooms) on `map` - but only the cells one can walk to from the lot's edge (a
  // block-level flood fill over the blueprint from the perimeter inward), so a walled yard or a lightwell that is
  // open to the sky but sealed off from the street never becomes a street cell. Returns the number of cells marked.
  sampleLot(li, map, y) {
    const lot = li.lot;
    if (y < li.bp.y0 || y >= li.bp.y0 + li.bp.h) return 0;
    const open = (x, yy, z) => {
      if (!li.standable(x, yy, z)) return false;
      for (let k = 2; k <= 6; k++) { const id = li.blockAt(x, yy + k, z); if (id !== 0 && id !== 255 && id !== -1) return false; }
      return true;
    };
    // seeds: open cells along the lot's perimeter (the street runs past them); the fill steps up or down one block
    const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
    const seen = new Uint8Array(W * D), stack = [];
    const push = (x, z, yy) => { const i = (x - lot.x0) * D + (z - lot.z0); if (seen[i]) return; seen[i] = 1; stack.push([x, z, yy]); };
    for (let x = lot.x0; x < lot.x1; x++) for (const z of [lot.z0, lot.z1 - 1]) for (const dy of [0, 1, -1]) if (open(x, y + dy, z)) { push(x, z, y + dy); break; }
    for (let z = lot.z0; z < lot.z1; z++) for (const x of [lot.x0, lot.x1 - 1]) for (const dy of [0, 1, -1]) if (open(x, y + dy, z)) { push(x, z, y + dy); break; }
    const reach = new Uint8Array(W * D);
    while (stack.length) {
      const [x, z, yy] = stack.pop();
      reach[(x - lot.x0) * D + (z - lot.z0)] = 1;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < lot.x0 || nx >= lot.x1 || nz < lot.z0 || nz >= lot.z1) continue;
        for (const dy of [0, 1, -1]) if (Math.abs(yy + dy - y) <= 1 && open(nx, yy + dy, nz)) { push(nx, nz, yy + dy); break; }
      }
    }
    let n = 0;
    const [a, b] = this.cellOf(lot.x0, lot.z0), [c, e] = this.cellOf(lot.x1 - 1, lot.z1 - 1);
    for (let cx = Math.max(0, a); cx <= Math.min(this.w - 1, c); cx++) for (let cz = Math.max(0, b); cz <= Math.min(this.d - 1, e); cz++) {
      const x = this.x0 + cx * RES, z = this.z0 + cz * RES;
      let k = 0;
      for (let dx = 0; dx < RES; dx++) for (let dz = 0; dz < RES; dz++) { const bx = x + dx, bz = z + dz; if (bx >= lot.x0 && bx < lot.x1 && bz >= lot.z0 && bz < lot.z1 && reach[(bx - lot.x0) * D + (bz - lot.z0)]) k++; }
      if (k >= 2) { map[this.idx(cx, cz)] = 1; n++; }
    }
    return n;
  }

  // Keep only the largest 4-connected patch of `map` (the street network); returns the number of cells cleared.
  keepMainland(map) {
    const n = map.length, comp = new Int32Array(n).fill(-1), sizes = [], stack = [];
    for (let s = 0; s < n; s++) {
      if (!map[s] || comp[s] >= 0) continue;
      const id = sizes.length; let size = 0;
      comp[s] = id; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), cx = Math.floor(i / this.d), cz = i - cx * this.d;
        size++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, nz = cz + dz;
          if (!this.inGrid(nx, nz)) continue;
          const j = nx * this.d + nz;
          if (!map[j] || comp[j] >= 0) continue;
          comp[j] = id; stack.push(j);
        }
      }
      sizes.push(size);
    }
    if (sizes.length < 2) return 0;
    let main = 0;
    for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[main]) main = k;
    let cleared = 0;
    for (let i = 0; i < n; i++) if (map[i] && comp[i] !== main) { map[i] = 0; cleared++; }
    return cleared;
  }

  map(level) { return level === 'deck' ? this.deck : level === 'port' ? this.port : this.ground; }
  walkable(level, x, z) { const [cx, cz] = this.cellOf(x, z); return this.inGrid(cx, cz) && this.map(level)[this.idx(cx, cz)] === 1; }
  yOf(level) { return level === 'deck' ? DECK_Y : level === 'port' ? PORT_Y : GROUND_Y; }
  // street level of a point (the spaceport deck is its own level; elsewhere height decides)
  levelAt(x, y, z) { return inPort(x, z) ? 'port' : y >= DECK_Y - 3 ? 'deck' : 'ground'; }

  // Nearest walkable cell centre to (x, z) on `level` within `r` blocks, or null
  snap(level, x, z, r = 8) {
    const m = this.map(level), [cx, cz] = this.cellOf(x, z);
    if (this.inGrid(cx, cz) && m[this.idx(cx, cz)]) return this.centre(cx, cz);
    const rc = Math.ceil(r / RES);
    let best = null, bd = Infinity;
    for (let dx = -rc; dx <= rc; dx++) for (let dz = -rc; dz <= rc; dz++) {
      const ax = cx + dx, az = cz + dz;
      if (!this.inGrid(ax, az) || !m[this.idx(ax, az)]) continue;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = this.centre(ax, az); }
    }
    return best;
  }

  // Bounded A* on the coarse bitmap: [{x,z}] cell centres from a (exclusive) to b, string-pulled, or null.
  coarsePath(level, a, b, maxNodes = 20000) {
    const m = this.map(level);
    const sa = this.snap(level, a.x, a.z, 10), sb = this.snap(level, b.x, b.z, 10);
    this.stats.coarse++;
    if (!sa || !sb) { this.stats.coarseFail++; return null; }
    const [ax, az] = this.cellOf(sa.x, sa.z), [bx, bz] = this.cellOf(sb.x, sb.z);
    const gen = ++this.gen, g = this.g, stamp = this.stamp, came = this.came, d = this.d;
    // weighted A* (w = 1.6): routes may be a little longer than optimal, searches stay a few hundred cells for typical trips
    const W = 1.6;
    const h = (cx, cz) => { const dx = Math.abs(cx - bx), dz = Math.abs(cz - bz); return ((dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz)) * W; };
    const open = new Heap();
    const si = ax * d + az;
    stamp[si] = gen; g[si] = 0; came[si] = -1;
    open.push({ i: si, cx: ax, cz: az, f: h(ax, az) });
    const closedGen = (gen | 0x80000000) >>> 0;   // unsigned, like the Uint32Array it is compared with
    let found = -1, expanded = 0, best = si, bestH = h(ax, az);
    while (open.size) {
      const cur = open.pop();
      if (stamp[cur.i] === closedGen) continue;
      stamp[cur.i] = closedGen;
      const hh = h(cur.cx, cur.cz);
      if (hh < bestH) { bestH = hh; best = cur.i; }
      if (cur.cx === bx && cur.cz === bz) { found = cur.i; break; }
      if (++expanded > maxNodes) break;
      for (let k = 0; k < 8; k++) {
        const dx = k < 4 ? [1, -1, 0, 0][k] : [1, 1, -1, -1][k - 4], dz = k < 4 ? [0, 0, 1, -1][k] : [1, -1, 1, -1][k - 4];
        const nx = cur.cx + dx, nz = cur.cz + dz;
        if (nx < 0 || nz < 0 || nx >= this.w || nz >= d) continue;
        const ni = nx * d + nz;
        if (!m[ni] || stamp[ni] === closedGen) continue;
        if (k >= 4 && (!m[cur.cx * d + nz] || !m[nx * d + cur.cz])) continue; // no corner cutting
        const ng = g[cur.i] + (k < 4 ? 1 : Math.SQRT2);
        if (stamp[ni] !== gen || ng < g[ni]) { stamp[ni] = gen; g[ni] = ng; came[ni] = cur.i; open.push({ i: ni, cx: nx, cz: nz, f: ng + h(nx, nz) }); }
      }
    }
    this.stats.expanded += expanded;
    if (found < 0) { if (bestH > 6) { this.stats.coarseFail++; return null; } found = best; }
    const cells = [];
    for (let i = found; i >= 0 && i !== si; i = came[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => this.centre(Math.floor(i / d), i % d));
    return this.pull(level, sa, pts);
  }

  // Line of sight on the bitmap (all cells on the segment walkable)
  los(level, a, b) {
    const m = this.map(level);
    let [x0, z0] = this.cellOf(a.x, a.z); const [x1, z1] = this.cellOf(b.x, b.z);
    const dx = Math.abs(x1 - x0), dz = Math.abs(z1 - z0), sx = x0 < x1 ? 1 : -1, sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;
    for (let n = 0; n < 4096; n++) {
      if (!this.inGrid(x0, z0) || !m[this.idx(x0, z0)]) return false;
      if (x0 === x1 && z0 === z1) return true;
      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; if (!this.inGrid(x0, z0) || !m[this.idx(x0, z0)]) return false; }
      if (e2 < dx) { err += dx; z0 += sz; }
    }
    return false;
  }

  // String-pulling: keep the farthest visible point, then split long straights into LEG_MAX pieces.
  pull(level, start, pts) {
    if (!pts.length) return [];
    const out = [];
    let cur = start, i = 0;
    while (i < pts.length) {
      let far = i;
      for (let j = pts.length - 1; j > i; j--) if (this.los(level, cur, pts[j])) { far = j; break; }
      cur = pts[far];
      out.push(cur);
      i = far + 1;
    }
    const split = [];
    let prev = start;
    for (const p of out) {
      const dist = Math.hypot(p.x - prev.x, p.z - prev.z);
      const n = Math.max(1, Math.ceil(dist / LEG_MAX));
      for (let k = 1; k <= n; k++) split.push({ x: Math.round(prev.x + (p.x - prev.x) * k / n), z: Math.round(prev.z + (p.z - prev.z) * k / n) });
      prev = p;
    }
    return split;
  }

  // Intersection lift best placed between a and b (both {x,z}); returns the lift record or null
  liftBetween(a, b, exclude = null) {
    let best = null, bd = Infinity;
    for (const lf of this.lifts) {
      if (lf === exclude) continue;
      const d = Math.hypot(lf.x - a.x, lf.z - a.z) + Math.hypot(lf.x - b.x, lf.z - b.z);
      if (d < bd) { bd = d; best = lf; }
    }
    return best;
  }
  nearestLift(p) { return this.liftBetween(p, p); }

  // Plaza (record) containing block (x, z), or null
  plazaAt(x, z) { for (const p of this.plazas) if (x >= p.x0 && x < p.x1 && z >= p.z0 && z < p.z1) return p; return null; }
  // A deck-level segment a -> b that crosses a plaza edge crosses the boulevard's kerb railing (one block, no gaps):
  // returns { before, after } - the cell beside the kerb on a's side and the one beside it on b's side - or null.
  // The walker is routed to `before` and hops the kerb to `after` (a 'hop' leg), the way the player jumps it.
  kerbHop(a, b) {
    const pa = this.plazaAt(Math.floor(a.x), Math.floor(a.z)), pb = this.plazaAt(Math.floor(b.x), Math.floor(b.z));
    if (pa === pb) return null;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.5) return null;
    const n = Math.ceil(len * 4);
    let prev = { x: Math.floor(a.x), z: Math.floor(a.z) };
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = Math.floor(a.x + (b.x - a.x) * t), z = Math.floor(a.z + (b.z - a.z) * t);
      if (x === prev.x && z === prev.z) continue;
      const here = this.plazaAt(x, z);
      if (here !== pa) {
        // the plaza edge lies between prev and (x, z); the kerb is the deck cell of the pair (outside the plaza)
        const inside = here ? { x, z } : prev, kerb = here ? prev : { x, z };
        const dx = Math.sign(kerb.x - inside.x), dz = Math.sign(kerb.z - inside.z);
        const side = { x: kerb.x + dx, z: kerb.z + dz };          // the sidewalk cell beyond the kerb
        return here ? { before: side, after: inside } : { before: inside, after: side };
      }
      prev = { x, z };
    }
    return null;
  }

  // Street route between two points on named levels: array of legs
  //   { kind: 'walk', x, y, z, level }  walk (block-level A*) to the point
  //   { kind: 'hop', x, y, z, tx, ty, tz, level }  hop the plaza kerb railing from (x, z) to (tx, tz)
  //   { kind: 'lift', x, y, z, toY, level, toLevel, lift }  ride the intersection lift from the stand cell to the other level
  // null when no coarse route exists.
  route(from, fromLevel, to, toLevel) {
    const legs = [];
    const walk = (level, a, b) => {
      const pts = this.coarsePath(level, a, b);
      if (!pts) return false;
      const y = this.yOf(level);
      let prev = a;
      for (const p of pts) {
        if (level === 'deck') {
          const hop = this.kerbHop(prev, p);
          if (hop) {
            legs.push({ kind: 'walk', x: hop.before.x, y, z: hop.before.z, level });
            legs.push({ kind: 'hop', x: hop.before.x, y, z: hop.before.z, tx: hop.after.x, ty: y, tz: hop.after.z, level });
            if (Math.abs(p.x - hop.after.x) < 1.5 && Math.abs(p.z - hop.after.z) < 1.5) { prev = p; continue; }
          }
        }
        legs.push({ kind: 'walk', x: p.x, y, z: p.z, level });
        prev = p;
      }
      return true;
    };
    if (fromLevel === 'port' || toLevel === 'port') {
      if (fromLevel === toLevel && walk('port', from, to)) return legs;
      return null;   // the port is an island for the crowd: its crews live inside it
    }
    if (fromLevel === toLevel) {
      const direct = Math.hypot(to.x - from.x, to.z - from.z);
      if (fromLevel === 'deck' || direct <= 110) { if (walk(fromLevel, from, to)) return legs; legs.length = 0; }
      if (fromLevel === 'ground') {
        // long undercity trips ride up to the decks and back down near the destination
        const up = this.liftBetween(from, from), down = this.liftBetween(to, to, up);
        if (up && down && up !== down && walk('ground', from, up) ) {
          legs.push({ kind: 'lift', x: up.x, y: GROUND_Y, z: up.z, toY: DECK_Y, level: 'ground', toLevel: 'deck', lift: up });
          if (walk('deck', up, down)) {
            legs.push({ kind: 'lift', x: down.x, y: DECK_Y, z: down.z, toY: GROUND_Y, level: 'deck', toLevel: 'ground', lift: down });
            if (walk('ground', down, to)) return legs;
          }
        }
        legs.length = 0;
        if (walk('ground', from, to)) return legs;
      }
      return null;
    }
    const lf = this.liftBetween(from, to);
    if (!lf) return null;
    if (!walk(fromLevel, from, lf)) return null;
    legs.push({ kind: 'lift', x: lf.x, y: this.yOf(fromLevel), z: lf.z, toY: this.yOf(toLevel), level: fromLevel, toLevel, lift: lf });
    if (!walk(toLevel, lf, to)) return null;
    return legs;
  }

  // A random walkable street point on `level` within `r` blocks of (x, z) (for wandering), or null
  randomPoint(level, x, z, r, rng) {
    const m = this.map(level);
    for (let t = 0; t < 12; t++) {
      const px = x + (rng.next() * 2 - 1) * r, pz = z + (rng.next() * 2 - 1) * r;
      const [cx, cz] = this.cellOf(px, pz);
      if (this.inGrid(cx, cz) && m[this.idx(cx, cz)]) return { ...this.centre(cx, cz), y: this.yOf(level), level };
    }
    return null;
  }
}

// Block-level path requests, processed under a millisecond budget per tick (at least one) so a crowd re-planning at
// once cannot stall a frame. Requests from NPCs near the player are served first.
export class PathQueue {
  constructor(world, budgetMs = 1.5) { this.world = world; this.queue = []; this.budgetMs = budgetMs; this.stats = { requests: 0, ok: 0, fail: 0, ms: 0 }; }
  request(npc, from, to, maxNodes, cb, priority = 0) { this.stats.requests++; this.queue.push({ npc, from, to, maxNodes, cb, priority }); }
  cancel(npc) { for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].npc === npc) this.queue.splice(i, 1); }
  process(now = performance.now()) {
    if (!this.queue.length) return;
    if (this.queue.length > 1) this.queue.sort((a, b) => a.priority - b.priority);
    const t0 = now;
    let n = 0;
    while (this.queue.length && (n === 0 || performance.now() - t0 < this.budgetMs)) {
      const q = this.queue.shift(); n++;
      if (q.npc.dead) continue;
      // an empty path is a success too: the start cell already is the goal (the callback treats it as arrived)
      const path = findPath(this.world, q.from.x, q.from.y, q.from.z, q.to.x, q.to.y, q.to.z, q.maxNodes);
      if (path) this.stats.ok++; else this.stats.fail++;
      q.cb(path);
    }
    this.stats.ms += performance.now() - t0;
  }
  get pending() { return this.queue.length; }
}

export { findStand };
