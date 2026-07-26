// Multi-level navigation grid baked from the collision world (Opus 3 domain).
// Cells are 0.5m; each XZ cell can hold multiple nodes at different heights (two floors + stairs).
// A* over node graph; LOS-based path smoothing; nearest-node lookup for spawn/recovery.
const CELL = 0.5;
const CLEAR_H = 1.7;
const MAX_STEP = 0.45;
// Stairwell centers (both floors connect only here) — used by the cross-floor heuristic.
const STAIR_PORTALS = [{ x: 30.6, z: 19.5 }, { x: 17.5, z: 18 }];

export class NavGrid {
  constructor(world, bounds) {
    this.world = world;
    this.bounds = bounds;
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / CELL);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL);
    this.cells = new Array(this.cols * this.rows).fill(null); // -> array of node indices
    this.nodes = []; // {x, y, z, ix, iz, edges:[nodeIdx...]}
  }

  bake() {
    const t0 = performance.now();
    const filter = (c) => c.blockMove && c.tag !== 'door' && c.tag !== 'enemy';
    // 1) sample ground heights per cell
    for (let iz = 0; iz < this.rows; iz++) {
      for (let ix = 0; ix < this.cols; ix++) {
        const x = this.bounds.minX + (ix + 0.5) * CELL;
        const z = this.bounds.minZ + (iz + 0.5) * CELL;
        let fromY = 8.5;
        const heights = [];
        // buildings stack many strata per column (roof, ceilings, floors) — sample generously
        for (let k = 0; k < 9; k++) {
          const hit = this.world.raycast(x, fromY, z, 0, -1, 0, fromY + 1, filter);
          if (!hit) break;
          const gy = hit.point.y;
          if (gy < -0.5) break;
          // walkable only on reasonably flat tops (normal up)
          if (hit.normal.y > 0.5) heights.push(gy);
          fromY = gy - 0.15;
          if (fromY < 0) break;
        }
        const nodeIdxs = [];
        for (const gy of heights) {
          if (!this._clearance(x, gy, z, filter)) continue;
          const idx = this.nodes.length;
          this.nodes.push({ x, y: gy, z, ix, iz, edges: [] });
          nodeIdxs.push(idx);
        }
        if (nodeIdxs.length) this.cells[iz * this.cols + ix] = nodeIdxs;
      }
    }
    // 2) connect neighbors
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      for (const [dx, dz] of dirs) {
        const jx = n.ix + dx, jz = n.iz + dz;
        if (jx < 0 || jz < 0 || jx >= this.cols || jz >= this.rows) continue;
        const cell = this.cells[jz * this.cols + jx];
        if (!cell) continue;
        const diag = dx !== 0 && dz !== 0;
        for (const j of cell) {
          const m = this.nodes[j];
          if (Math.abs(m.y - n.y) > MAX_STEP) continue;
          if (diag) {
            // avoid corner cutting: both orthogonal neighbors must exist at compatible heights
            if (!this._hasNodeAt(n.ix + dx, n.iz, n.y) || !this._hasNodeAt(n.ix, n.iz + dz, n.y)) continue;
          }
          n.edges.push(j);
        }
      }
    }
    this.bakeMs = performance.now() - t0;
    return this;
  }

  _clearance(x, y, z, filter) {
    // Slightly smaller than a half-cell so grid-aligned door openings keep their doorway cells;
    // the character mover's corner-shave + door-centerline path snapping cover the difference
    // to the real capsule radius.
    const r = 0.24;
    const min = { x: x - r, y: y + 0.25, z: z - r };
    const max = { x: x + r, y: y + CLEAR_H, z: z + r };
    const hits = this.world.query(min, max, []);
    for (const c of hits) if (filter(c)) return false;
    return true;
  }

  _hasNodeAt(ix, iz, y) {
    if (ix < 0 || iz < 0 || ix >= this.cols || iz >= this.rows) return false;
    const cell = this.cells[iz * this.cols + ix];
    if (!cell) return false;
    for (const j of cell) if (Math.abs(this.nodes[j].y - y) <= MAX_STEP) return true;
    return false;
  }

  nearestNode(x, y, z, maxR = 2.5) {
    const ix0 = Math.floor((x - this.bounds.minX) / CELL);
    const iz0 = Math.floor((z - this.bounds.minZ) / CELL);
    let best = -1, bestD = maxR * maxR;
    const rad = Math.ceil(maxR / CELL);
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const ix = ix0 + dx, iz = iz0 + dz;
        if (ix < 0 || iz < 0 || ix >= this.cols || iz >= this.rows) continue;
        const cell = this.cells[iz * this.cols + ix];
        if (!cell) continue;
        for (const j of cell) {
          const n = this.nodes[j];
          const dy = Math.abs(n.y - y);
          if (dy > 2.1) continue;
          const d = (n.x - x) ** 2 + (n.z - z) ** 2 + dy * dy * 4;
          if (d < bestD) { bestD = d; best = j; }
        }
      }
    }
    return best;
  }

  // A* between node indices. Returns array of {x,y,z} or null.
  findPath(fromIdx, toIdx, maxExpand = 70000) {
    if (fromIdx < 0 || toIdx < 0) return null;
    if (fromIdx === toIdx) return [this.nodes[toIdx]];
    const open = new MinHeap();
    const gScore = new Map([[fromIdx, 0]]);
    const came = new Map();
    const target = this.nodes[toIdx];
    const from = this.nodes[fromIdx];
    // NS-8: cross-floor searches must aim at the stairwells, not the column above/below the
    // target, or A* floods most of the graph before committing to the detour.
    const crossFloor = Math.abs(from.y - target.y) > 1.5;
    const h = crossFloor
      ? (i) => {
        const n = this.nodes[i];
        if (Math.abs(n.y - target.y) <= 1.5) {
          return Math.hypot(n.x - target.x, n.z - target.z);
        }
        let best = Infinity;
        for (const p of STAIR_PORTALS) {
          const d = Math.hypot(n.x - p.x, n.z - p.z) + Math.hypot(p.x - target.x, p.z - target.z);
          if (d < best) best = d;
        }
        return best + 3.6; // vertical travel through the stair
      }
      : (i) => {
        const n = this.nodes[i];
        return Math.hypot(n.x - target.x, n.z - target.z) + Math.abs(n.y - target.y) * 2;
      };
    open.push(fromIdx, h(fromIdx));
    const closed = new Set();
    let expanded = 0;
    while (open.size && expanded < maxExpand) {
      const cur = open.pop();
      if (cur === toIdx) return this._reconstruct(came, cur);
      if (closed.has(cur)) continue;
      closed.add(cur);
      expanded++;
      const cn = this.nodes[cur];
      for (const nb of cn.edges) {
        if (closed.has(nb)) continue;
        const nn = this.nodes[nb];
        const cost = Math.hypot(nn.x - cn.x, nn.z - cn.z) + Math.abs(nn.y - cn.y) * 1.5;
        const g = gScore.get(cur) + cost;
        if (g < (gScore.get(nb) ?? Infinity)) {
          gScore.set(nb, g);
          came.set(nb, cur);
          open.push(nb, g + h(nb));
        }
      }
    }
    return null;
  }

  _reconstruct(came, cur) {
    const path = [this.nodes[cur]];
    while (came.has(cur)) {
      cur = came.get(cur);
      path.push(this.nodes[cur]);
    }
    path.reverse();
    return this._smooth(path);
  }

  _smooth(path) {
    if (path.length <= 2) return path.map((n) => ({ x: n.x, y: n.y, z: n.z }));
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = Math.min(path.length - 1, i + 12);
      for (; j > i + 1; j--) {
        if (this._walkableStraight(path[i], path[j])) break;
      }
      out.push(path[j]);
      i = j;
    }
    return out.map((n) => ({ x: n.x, y: n.y, z: n.z }));
  }

  _walkableStraight(a, b) {
    // only smooth near-level runs (never across stairs)
    if (Math.abs(a.y - b.y) > 0.3) return false;
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(dist / (CELL * 0.8));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const ix = Math.floor((x - this.bounds.minX) / CELL);
      const iz = Math.floor((z - this.bounds.minZ) / CELL);
      if (!this._hasNodeAt(ix, iz, a.y)) return false;
      // widen: side cells too (agent radius)
      if (!this._hasNodeAt(ix + 1, iz, a.y) && !this._hasNodeAt(ix - 1, iz, a.y)) return false;
      if (!this._hasNodeAt(ix, iz + 1, a.y) && !this._hasNodeAt(ix, iz - 1, a.y)) return false;
    }
    return true;
  }

  pathBetween(from, to) {
    const a = this.nearestNode(from.x, from.y, from.z);
    const b = this.nearestNode(to.x, to.y, to.z);
    if (a < 0 || b < 0) return null;
    return this.findPath(a, b);
  }

  randomNodeNear(x, y, z, radius, rng) {
    const cands = [];
    const rad = Math.ceil(radius / CELL);
    const ix0 = Math.floor((x - this.bounds.minX) / CELL);
    const iz0 = Math.floor((z - this.bounds.minZ) / CELL);
    for (let dz = -rad; dz <= rad; dz += 2) {
      for (let dx = -rad; dx <= rad; dx += 2) {
        const ix = ix0 + dx, iz = iz0 + dz;
        if (ix < 0 || iz < 0 || ix >= this.cols || iz >= this.rows) continue;
        const cell = this.cells[iz * this.cols + ix];
        if (!cell) continue;
        for (const j of cell) if (Math.abs(this.nodes[j].y - y) < 1.5) cands.push(j);
      }
    }
    if (!cands.length) return -1;
    return cands[Math.floor(rng.next() * cands.length)];
  }
}

class MinHeap {
  constructor() { this.keys = []; this.vals = []; }
  get size() { return this.keys.length; }
  push(key, val) {
    this.keys.push(key); this.vals.push(val);
    let i = this.keys.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.vals[p] <= this.vals[i]) break;
      this._swap(i, p); i = p;
    }
  }
  pop() {
    const top = this.keys[0];
    const lastK = this.keys.pop(), lastV = this.vals.pop();
    if (this.keys.length) {
      this.keys[0] = lastK; this.vals[0] = lastV;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.vals.length && this.vals[l] < this.vals[m]) m = l;
        if (r < this.vals.length && this.vals[r] < this.vals[m]) m = r;
        if (m === i) break;
        this._swap(i, m); i = m;
      }
    }
    return top;
  }
  _swap(a, b) {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.vals[a], this.vals[b]] = [this.vals[b], this.vals[a]];
  }
}
