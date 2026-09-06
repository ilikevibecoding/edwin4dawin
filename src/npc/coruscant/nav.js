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
    // the spaceport deck (feet 97): its own level, walkable around the terminal, hangar, fuel farm and tower
    this.port = new Uint8Array(this.w * this.d);
    const pr = portRects();
    for (const r of pr.walk) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 1);
    for (const r of pr.block) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 0);
    for (const r of pr.open) this.markRect(this.port, r.x0, r.z0, r.x1, r.z1, 1);
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

  // Street route between two points on named levels: array of legs
  //   { kind: 'walk', x, y, z, level }  walk (block-level A*) to the point
  //   { kind: 'lift', x, y, z, toY, level, toLevel, lift }  ride the intersection lift from the stand cell to the other level
  // null when no coarse route exists.
  route(from, fromLevel, to, toLevel) {
    const legs = [];
    const walk = (level, a, b) => {
      const pts = this.coarsePath(level, a, b);
      if (!pts) return false;
      const y = this.yOf(level);
      for (const p of pts) legs.push({ kind: 'walk', x: p.x, y, z: p.z, level });
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
      const path = findPath(this.world, q.from.x, q.from.y, q.from.z, q.to.x, q.to.y, q.to.z, q.maxNodes);
      if (path && path.length) this.stats.ok++; else this.stats.fail++;
      q.cb(path && path.length ? path : null);
    }
    this.stats.ms += performance.now() - t0;
  }
  get pending() { return this.queue.length; }
}

export { findStand };
