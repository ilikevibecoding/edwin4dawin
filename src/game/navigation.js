// Grid navigation: one walkability grid per level (0.5m cells) derived from
// the same colliders used for physics, plus explicit stair links that join the
// levels. Paths are A* + greedy line-of-walkability smoothing.

import { STAIRS, LEVELS } from '../world/map.js';

const CELL = 0.5;
const AGENT_R = 0.34;

export class NavMesh {
  constructor(world) {
    this.world = world;
    this.grids = {
      g: makeGrid(world, 'g', -2, -2, 68, 58, 0),
      b: makeGrid(world, 'b', 12, -2, 66, 32, -3.6),
    };
    this.links = STAIRS.map((s) => ({
      id: s.id,
      top: { x: s.waypoints[0][0], y: s.waypoints[0][1], z: s.waypoints[0][2] },
      bottom: { x: s.waypoints.at(-1)[0], y: s.waypoints.at(-1)[1], z: s.waypoints.at(-1)[2] },
      waypoints: s.waypoints.map(([x, y, z]) => ({ x, y, z })),
      length: s.waypoints.length * 2.2,
    }));
  }

  levelOf(y) { return y < -1.6 ? 'b' : 'g'; }

  // Recompute walkability in a small region (e.g. after glass breaks)
  refreshRegion(level, x0, z0, x1, z1) {
    const grid = this.grids[level];
    const i0 = Math.max(0, Math.floor((x0 - grid.x0 - 1) / CELL));
    const i1 = Math.min(grid.w - 1, Math.ceil((x1 - grid.x0 + 1) / CELL));
    const j0 = Math.max(0, Math.floor((z0 - grid.z0 - 1) / CELL));
    const j1 = Math.min(grid.h - 1, Math.ceil((z1 - grid.z0 + 1) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      grid.cells[j * grid.w + i] = computeCell(this.world, grid, i, j);
    }
  }

  findPath(from, to) {
    const lf = this.levelOf(from.y), lt = this.levelOf(to.y);
    if (lf === lt) {
      const pts = this.gridPath(lf, from, to);
      return pts;
    }
    // cross-level: route through the best stair link
    let best = null;
    for (const link of this.links) {
      const [nearEnd, farEnd, wps] = lf === 'g'
        ? [link.top, link.bottom, link.waypoints]
        : [link.bottom, link.top, [...link.waypoints].reverse()];
      const p1 = this.gridPath(lf, from, nearEnd);
      if (!p1) continue;
      const p2 = this.gridPath(lt, farEnd, to);
      if (!p2) continue;
      const cost = pathLen(p1) + link.length + pathLen(p2);
      if (!best || cost < best.cost) best = { cost, pts: [...p1, ...wps, ...p2] };
    }
    return best ? best.pts : null;
  }

  gridPath(level, from, to) {
    const grid = this.grids[level];
    const s = this.toCell(grid, from.x, from.z);
    const e = this.toCell(grid, to.x, to.z);
    const start = nearestOpen(grid, s.i, s.j, 8);
    const end = nearestOpen(grid, e.i, e.j, 8);
    if (!start || !end) return null;
    const cellPath = astar(grid, start, end);
    if (!cellPath) return null;
    const smoothed = smooth(grid, cellPath);
    const y = LEVELS[level].y;
    const pts = smoothed.map(({ i, j }) => ({ x: grid.x0 + (i + 0.5) * CELL, y, z: grid.z0 + (j + 0.5) * CELL }));
    // replace endpoints with exact positions
    if (pts.length) {
      pts[0] = { x: from.x, y, z: from.z };
      pts[pts.length - 1] = { x: to.x, y, z: to.z };
    }
    return pts;
  }

  toCell(grid, x, z) {
    return { i: Math.floor((x - grid.x0) / CELL), j: Math.floor((z - grid.z0) / CELL) };
  }
  isWalkable(level, x, z) {
    const grid = this.grids[level];
    const { i, j } = this.toCell(grid, x, z);
    if (i < 0 || j < 0 || i >= grid.w || j >= grid.h) return false;
    return grid.cells[j * grid.w + i] !== 255;
  }
  randomNearby(level, x, z, radius, rngf) {
    for (let tries = 0; tries < 12; tries++) {
      const a = rngf() * Math.PI * 2, r = 1 + rngf() * radius;
      const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
      if (this.isWalkable(level, nx, nz)) return { x: nx, y: LEVELS[level].y, z: nz };
    }
    return null;
  }
}

function makeGrid(world, level, x0, z0, x1, z1, baseY) {
  const w = Math.ceil((x1 - x0) / CELL), h = Math.ceil((z1 - z0) / CELL);
  const grid = { level, x0, z0, x1, z1, w, h, baseY, cells: new Uint8Array(w * h) };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) grid.cells[j * w + i] = computeCell(world, grid, i, j);
  return grid;
}

// cell values: 255 blocked, 1 open, 2..40 extra cost (doors)
function computeCell(world, grid, i, j) {
  const x = grid.x0 + (i + 0.5) * CELL, z = grid.z0 + (j + 0.5) * CELL;
  const g = world.groundAt(x, z, grid.baseY + 0.6, 0.5);
  if (g.y < grid.baseY - 0.4 || g.y > grid.baseY + 0.55) return 255; // hole or too high
  const y0 = g.y + 0.25, y1 = g.y + 1.6;
  let cost = 1;
  const r = AGENT_R;
  for (const c of world.colliders) {
    if (!c.blocksMove) continue;
    if (c.kind === 'floor' || c.kind === 'ceiling') continue;
    if (x + r < c.x0 || x - r > c.x1 || z + r < c.z0 || z - r > c.z1) continue;
    if (y1 < c.y0 || y0 > c.y1) continue;
    if (c.door) { cost = Math.max(cost, 4); continue; } // doors are pathable (AI opens them)
    if (c.y1 - g.y <= 0.5 && c.y1 - g.y > 0) { cost = Math.max(cost, 2); continue; } // low step
    return 255;
  }
  return cost;
}

function nearestOpen(grid, i, j, maxR) {
  const at = (ii, jj) => (ii >= 0 && jj >= 0 && ii < grid.w && jj < grid.h) ? grid.cells[jj * grid.w + ii] : 255;
  if (at(i, j) !== 255) return { i, j };
  for (let r = 1; r <= maxR; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (at(i + di, j + dj) !== 255) return { i: i + di, j: j + dj };
    }
  }
  return null;
}

function astar(grid, start, goal) {
  const W = grid.w, H = grid.h, cells = grid.cells;
  const idx = (i, j) => j * W + i;
  const open = new MinHeap();
  const gScore = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  const h = (i, j) => Math.hypot(i - goal.i, j - goal.j);
  gScore[idx(start.i, start.j)] = 0;
  open.push(h(start.i, start.j), idx(start.i, start.j));
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let expansions = 0;
  while (open.size && expansions < 60000) {
    expansions++;
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % W, cj = (cur / W) | 0;
    if (ci === goal.i && cj === goal.j) {
      const path = [];
      let n = cur;
      while (n !== -1) { path.push({ i: n % W, j: (n / W) | 0 }); n = came[n]; }
      return path.reverse();
    }
    for (const [di, dj, dc] of DIRS) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nv = cells[idx(ni, nj)];
      if (nv === 255) continue;
      // no diagonal corner cutting
      if (di && dj && (cells[idx(ci + di, cj)] === 255 || cells[idx(ci, cj + dj)] === 255)) continue;
      const nIdx = idx(ni, nj);
      if (closed[nIdx]) continue;
      const ng = gScore[cur] + dc * nv;
      if (ng < gScore[nIdx]) {
        gScore[nIdx] = ng;
        came[nIdx] = cur;
        open.push(ng + h(ni, nj), nIdx);
      }
    }
  }
  return null;
}

function smooth(grid, path) {
  if (path.length <= 2) return path;
  const out = [path[0]];
  let anchor = 0;
  for (let k = 2; k < path.length; k++) {
    if (!clearLine(grid, path[anchor], path[k])) {
      out.push(path[k - 1]);
      anchor = k - 1;
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

function clearLine(grid, a, b) {
  // supercover line: every touched cell must be open (and not a door cell —
  // door cells must stay as explicit waypoints so AI walks through the frame)
  let x0 = a.i, y0 = a.j, x1 = b.i, y1 = b.j;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 500; guard++) {
    const v = grid.cells[y0 * grid.w + x0];
    if (v === 255 || v >= 4) return x0 === x1 && y0 === y1 && v !== 255;
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return false;
}

function pathLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return L;
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    this.k.push(key); this.v.push(val);
    let i = this.k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= this.k[i]) break;
      [this.k[p], this.k[i]] = [this.k[i], this.k[p]];
      [this.v[p], this.v[i]] = [this.v[i], this.v[p]];
      i = p;
    }
  }
  pop() {
    const top = this.v[0];
    const lk = this.k.pop(), lv = this.v.pop();
    if (this.k.length) {
      this.k[0] = lk; this.v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.k.length && this.k[l] < this.k[m]) m = l;
        if (r < this.k.length && this.k[r] < this.k[m]) m = r;
        if (m === i) break;
        [this.k[m], this.k[i]] = [this.k[i], this.k[m]];
        [this.v[m], this.v[i]] = [this.v[i], this.v[m]];
        i = m;
      }
    }
    return top;
  }
}
