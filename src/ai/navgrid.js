// Navigation grid baked from collision geometry: BFS flood-fill from seed
// points, multi-level cells (ground/stairs/floor 1), A* with smoothing.
// Doors count as passable with extra cost; locked doors block until unlocked.

const CELL = 0.45;
const AGENT_R = 0.34;
const AGENT_H = 1.72;
const STEP = 0.42;

export class NavGrid {
  constructor(game) {
    this.game = game;
    this.cells = new Map(); // "ix,iz" -> [{x,z,y,doors:Set|null,id}]
    this.count = 0;
  }

  key(ix, iz) { return ix + ',' + iz; }

  build(seeds) {
    this.cells.clear();
    this.count = 0;
    const coll = this.game.world.collision;
    const queue = [];
    for (const s of seeds) {
      const c = this._probe(coll, s.x, s.z, (s.y ?? 0) + 1.0);
      if (c) {
        const added = this._addCell(c);
        if (added) queue.push(added);
      }
    }
    let guard = 0;
    while (queue.length && guard++ < 90000) {
      const cur = queue.pop();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.ix + dx, nz = cur.iz + dz;
        const x = nx * CELL, z = nz * CELL;
        const existing = this._cellAt(nx, nz, cur.y);
        if (existing) continue;
        const c = this._probe(coll, x, z, cur.y + 1.0, cur.y);
        if (!c) continue;
        const added = this._addCell(c);
        if (added) queue.push(added);
      }
    }
  }

  _addCell(c) {
    const ix = Math.round(c.x / CELL), iz = Math.round(c.z / CELL);
    const k = this.key(ix, iz);
    if (!this.cells.has(k)) this.cells.set(k, []);
    const list = this.cells.get(k);
    for (const e of list) if (Math.abs(e.y - c.y) < 0.5) return null;
    const cell = { ix, iz, x: ix * CELL, z: iz * CELL, y: c.y, doors: c.doors };
    list.push(cell);
    this.count++;
    return cell;
  }

  _cellAt(ix, iz, yNear) {
    const list = this.cells.get(this.key(ix, iz));
    if (!list) return null;
    for (const c of list) if (Math.abs(c.y - yNear) < 0.55) return c;
    return null;
  }

  cellNear(x, z, y = 0) {
    // nearest existing cell to a world position
    const ix = Math.round(x / CELL), iz = Math.round(z / CELL);
    for (let r = 0; r <= 4; r++) {
      let best = null, bestD = Infinity;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = this._cellAt(ix + dx, iz + dz, y);
          if (c) {
            const d = (c.x - x) ** 2 + (c.z - z) ** 2;
            if (d < bestD) { bestD = d; best = c; }
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  // probe walkability at x,z searching for floor below fromY
  _probe(coll, x, z, fromY, refY = null) {
    const hit = coll.raycast({ x, y: fromY + 0.55, z }, { x: 0, y: -1, z: 0 }, 3.4, {
      mode: 'solid', filter: (b) => b.tag !== 'door' && b.tag !== 'railing',
    });
    if (!hit) return null;
    const y = hit.point.y;
    if (refY != null && Math.abs(y - refY) > STEP) return null;
    if (y < -0.5) return null;
    // clearance box (ignore doors -> they open; railings block)
    const min = { x: x - AGENT_R, y: y + 0.25, z: z - AGENT_R };
    const max = { x: x + AGENT_R, y: y + AGENT_H, z: z + AGENT_R };
    const blockers = coll.query(min, max, (b) => b.solid);
    let doors = null;
    for (const b of blockers) {
      if (b.tag === 'door' && b.ref) {
        (doors ||= new Set()).add(b.ref);
        continue;
      }
      return null;
    }
    return { x, z, y, doors };
  }

  neighbors(cell) {
    const out = [];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const n = this._cellAt(cell.ix + dx, cell.iz + dz, cell.y);
      if (!n) continue;
      if (dx !== 0 && dz !== 0) {
        // block diagonal corner cutting
        if (!this._cellAt(cell.ix + dx, cell.iz, cell.y) || !this._cellAt(cell.ix, cell.iz + dz, cell.y)) continue;
      }
      out.push(n);
    }
    return out;
  }

  // A* path between world points. Returns array of {x,y,z} or null.
  findPath(from, to, opts = {}) {
    const start = this.cellNear(from.x, from.z, from.y);
    const goal = this.cellNear(to.x, to.z, to.y ?? 0);
    if (!start || !goal) return null;
    if (start === goal) return [{ x: to.x, y: goal.y, z: to.z }];

    const open = new MinHeap();
    const gScore = new Map();
    const came = new Map();
    const id = (c) => c.ix + ',' + c.iz + ',' + Math.round(c.y / 0.5);
    gScore.set(id(start), 0);
    open.push(0, start);
    const h = (c) => Math.hypot(c.x - goal.x, c.z - goal.z) + Math.abs(c.y - goal.y);
    let found = null;
    let iter = 0;
    while (open.size && iter++ < 20000) {
      const cur = open.pop();
      if (cur === goal) { found = cur; break; }
      const cid = id(cur);
      const g = gScore.get(cid);
      for (const n of this.neighbors(cur)) {
        let cost = Math.hypot(n.x - cur.x, n.z - cur.z);
        if (n.doors) {
          let blocked = false;
          for (const d of n.doors) {
            if (d.locked && !opts.canOpenLocked) { blocked = true; break; }
            if (!d.isOpen) cost += 2.2;
          }
          if (blocked) continue;
        }
        const nid = id(n);
        const ng = g + cost;
        if (ng < (gScore.get(nid) ?? Infinity)) {
          gScore.set(nid, ng);
          came.set(nid, cur);
          open.push(ng + h(n), n);
        }
      }
    }
    if (!found) return null;
    const cells = [found];
    let cur = found;
    while (came.has(id(cur))) { cur = came.get(id(cur)); cells.push(cur); }
    cells.reverse();
    const pts = this._smooth(cells);
    pts.push({ x: to.x, y: goal.y, z: to.z });
    return pts;
  }

  _smooth(cells) {
    if (cells.length <= 2) return cells.map((c) => ({ x: c.x, y: c.y, z: c.z }));
    const out = [{ x: cells[0].x, y: cells[0].y, z: cells[0].z }];
    let anchor = 0;
    for (let i = 2; i < cells.length; i++) {
      if (!this._walkLine(cells[anchor], cells[i])) {
        anchor = i - 1;
        out.push({ x: cells[anchor].x, y: cells[anchor].y, z: cells[anchor].z });
      }
    }
    const last = cells[cells.length - 1];
    out.push({ x: last.x, y: last.y, z: last.z });
    return out;
  }

  _walkLine(a, b) {
    if (Math.abs(a.y - b.y) > 0.3) return false; // don't smooth across stairs
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(d / (CELL * 0.8));
    let y = a.y;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const c = this.cellNear(x, z, y);
      if (!c || Math.hypot(c.x - x, c.z - z) > CELL * 0.9 || Math.abs(c.y - y) > STEP) return false;
      if (c.doors) return false; // keep door cells as explicit waypoints
      y = c.y;
    }
    return true;
  }

  randomNearby(pos, radius, rng) {
    for (let i = 0; i < 12; i++) {
      const a = rng.angle();
      const r = radius * (0.4 + rng.next() * 0.6);
      const c = this.cellNear(pos.x + Math.cos(a) * r, pos.z + Math.sin(a) * r, pos.y ?? 0);
      if (c && Math.abs(c.y - (pos.y ?? c.y)) < 1.2) return { x: c.x, y: c.y, z: c.z };
    }
    return null;
  }
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) {
    const a = this.a;
    a.push({ k, v });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].k <= a[i].k) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top?.v;
  }
}
