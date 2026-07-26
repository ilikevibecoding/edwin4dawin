// Grid navigation: one walkability grid per level (0.5m cells) derived from
// the same colliders used for physics, plus explicit stair links that join the
// levels. Paths are A* + greedy line-of-walkability smoothing, with doorways
// kept as explicit perpendicular crossings so nobody clips a door frame.

import { STAIRS, LEVELS } from '../world/map.js';

const CELL = 0.5;
const AGENT_R = 0.34;
// Global A* guard: with 14 enemies a burst of simultaneous repaths can spike a
// single sim step, so requests past the budget are deferred to the next step.
const PATH_BUDGET = 6;
let pathBudget = PATH_BUDGET;

// Called once per sim step (enemy.js tickBarkCooldown, already ticked by
// game.js before any entity update).
let activeNav = null;
export function beginNavStep() {
  pathBudget = PATH_BUDGET;
  if (activeNav) activeNav.syncDoors();
}
export function pathBudgetLeft() { return pathBudget; }

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
    this.lockState = new Map(world.doors.map((d) => [d.id, !!d.locked]));
    activeNav = this;
  }

  levelOf(y) { return y < -1.6 ? 'b' : 'g'; }

  // Locked doors are hard-blocked in the grid, so a keycard unlock has to
  // reopen those cells. Nothing outside this module owns that hook.
  syncDoors() {
    for (const door of this.world.doors) {
      const locked = !!door.locked;
      if (this.lockState.get(door.id) === locked) continue;
      this.lockState.set(door.id, locked);
      this.refreshDoor(door);
    }
  }

  // Recompute walkability in a small region (e.g. after glass breaks)
  refreshRegion(level, x0, z0, x1, z1) {
    const grid = this.grids[level];
    const i0 = Math.max(0, Math.floor((x0 - grid.x0 - 1) / CELL));
    const i1 = Math.min(grid.w - 1, Math.ceil((x1 - grid.x0 + 1) / CELL));
    const j0 = Math.max(0, Math.floor((z0 - grid.z0 - 1) / CELL));
    const j1 = Math.min(grid.h - 1, Math.ceil((z1 - grid.z0 + 1) / CELL));
    // Rebuilt per call: doors swap leaves and broken glass drops colliders, so
    // a cached index would go stale.
    const index = makeIndex(this.world, grid);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      grid.cells[j * grid.w + i] = computeCell(this.world, grid, i, j, index);
    }
  }

  // A door that changed lock state invalidates its own cells only.
  refreshDoor(door) {
    const level = door.def.level;
    const def = door.def;
    const [a, b] = def.span;
    if (def.dir === 'x') this.refreshRegion(level, a - 0.6, def.line - 0.6, b + 0.6, def.line + 0.6);
    else this.refreshRegion(level, def.line - 0.6, a - 0.6, def.line + 0.6, b + 0.6);
  }

  // Returns: array of waypoints | null (no route) | undefined (deferred by the
  // per-step budget — callers keep their current path and retry next step).
  findPath(from, to, opts = {}) {
    if (!opts.priority) {
      if (pathBudget <= 0) return undefined;
      pathBudget--;
    }
    const lf = this.levelOf(from.y), lt = this.levelOf(to.y);
    if (lf === lt) return this.gridPath(lf, from, to);
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
      if (!best || cost < best.cost) best = { cost, pts: dedupe([...p1, ...wps, ...p2]) };
    }
    return best ? best.pts : null;
  }

  // Total walking length of a route, or Infinity when there is none. Used by
  // the AI to compare a direct approach against a flanking detour.
  pathCost(from, to, opts = {}) {
    const pts = this.findPath(from, to, opts);
    if (!pts) return Infinity;
    return pathLen(pts);
  }

  gridPath(level, from, to) {
    const grid = this.grids[level];
    const s = this.toCell(grid, from.x, from.z);
    const e = this.toCell(grid, to.x, to.z);
    const start = nearestOpen(grid, s.i, s.j, 8) || nearestOpen(grid, s.i, s.j, 26);
    const end = nearestOpen(grid, e.i, e.j, 8) || nearestOpen(grid, e.i, e.j, 26);
    if (!start || !end) return null;
    const cellPath = astar(grid, start, end);
    if (!cellPath) return null;
    const smoothed = smooth(grid, cellPath);
    const y = LEVELS[level].y;
    const pts = smoothed.map(({ i, j }) => ({ x: grid.x0 + (i + 0.5) * CELL, y, z: grid.z0 + (j + 0.5) * CELL }));
    // exact endpoints, but never a goal that sits inside geometry
    if (pts.length) {
      pts[0] = { x: from.x, y, z: from.z };
      if (e.i === end.i && e.j === end.j) pts[pts.length - 1] = { x: to.x, y, z: to.z };
    }
    return this.insertDoorWaypoints(level, pts, y);
  }

  // Doorways get a three-point crossing (approach / centre / exit) on the door
  // centre line so entities pass perpendicular through the frame.
  insertDoorWaypoints(level, pts, y) {
    if (pts.length < 2) return pts;
    const doors = this.world.doors.filter((d) => d.def.level === level);
    if (!doors.length) return pts;
    const out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const b = pts[k];
      let exit = null;
      for (let guard = 0; guard < 3; guard++) {
        const a = out[out.length - 1];
        const cross = doorCrossing(doors, a, b);
        if (!cross) break;
        const { door, alongCenter, side } = cross;
        const def = door.def;
        const mk = (offset) => (def.dir === 'x'
          ? { x: alongCenter, y, z: def.line + offset * side, doorway: true }
          : { x: def.line + offset * side, y, z: alongCenter, doorway: true });
        // An approach point is only useful while we are still short of the
        // frame; inserted blindly it sends the walker backwards.
        const across = def.dir === 'x' ? a.z : a.x;
        const approach = mk(0.75);
        if (Math.abs(across - def.line) > 1
          && this.isWalkable(level, approach.x, approach.z)) out.push(approach);
        // Destination inside the frame: b is itself the crossing point, so stop
        // here rather than stepping past it and being dragged back over the line.
        const bAcross = def.dir === 'x' ? b.z : b.x;
        if (k === pts.length - 1 && Math.abs(bAcross - def.line) < 0.4) { exit = null; break; }
        out.push(mk(0));
        const past = mk(-0.75);
        if (this.isWalkable(level, past.x, past.z)) out.push(past);
        exit = out[out.length - 1];
      }
      // The A* waypoint that routed us through the frame usually sits beside or
      // behind the exit; keeping it would zig-zag back across the threshold.
      if (exit && k < pts.length - 1) {
        if (dist2(b, exit) < 0.6) continue;
        const prev = out[out.length - 2] || exit;
        if ((b.x - exit.x) * (exit.x - prev.x) + (b.z - exit.z) * (exit.z - prev.z) < 0) continue;
      }
      if (dist2(b, out[out.length - 1]) > 0.05 || k === pts.length - 1) out.push(b);
    }
    // The A* cell centre following a crossing often sits a fraction of a cell to
    // the side of the exit point, which reads as a twitch once cleared. Anything
    // inside half a cell of its predecessor cannot be steering around geometry.
    const tidy = [out[0]];
    for (let k = 1; k < out.length - 1; k++) {
      const p = out[k], prev = tidy[tidy.length - 1];
      if (p.doorway) { tidy.push(p); continue; }   // crossings are the whole point
      const near = dist2(p, prev);
      if (near <= 0.4) continue;
      if (prev.doorway && near <= 0.8) continue;   // already clear of the frame
      tidy.push(p);
    }
    if (out.length > 1) tidy.push(out[out.length - 1]);
    return tidy;
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
  // Nearest open cell centre to (x,z), searching outward up to maxR metres.
  nearestWalkable(level, x, z, maxR = 4) {
    const grid = this.grids[level];
    const { i, j } = this.toCell(grid, x, z);
    const cell = nearestOpen(grid, i, j, Math.max(1, Math.ceil(maxR / CELL)));
    if (!cell) return null;
    return { x: grid.x0 + (cell.i + 0.5) * CELL, y: LEVELS[level].y, z: grid.z0 + (cell.j + 0.5) * CELL };
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

// ---------------------------------------------------------------- door helpers
// Doorway geometry helpers shared by enemy + hostage door discipline.

// The door whose leaf plane the segment a->b crosses (nearest to a), if any.
export function doorOnSegment(world, a, b, y = a.y ?? 0) {
  const cross = doorCrossing(world.doors, a, b, y);
  return cross ? cross.door : null;
}

// True when (x,z) stands inside a door's swing span (used to keep entities from
// parking in doorways).
export function doorAtPoint(world, x, z, y = 0, pad = 0.15) {
  for (const door of world.doors) {
    if (Math.abs(door.center.y - (y + 1)) > 2.4) continue;
    const def = door.def;
    const along = def.dir === 'x' ? x : z;
    const across = def.dir === 'x' ? z : x;
    if (along < def.span[0] - pad || along > def.span[1] + pad) continue;
    if (Math.abs(across - def.line) > 0.55 + pad) continue;
    return door;
  }
  return null;
}

// A point `dist` metres out from a door's centre, on the side of `refPoint`.
export function doorSidePoint(door, refPoint, dist = 1.2) {
  const def = door.def;
  const alongCenter = (def.span[0] + def.span[1]) / 2;
  const across = def.dir === 'x' ? refPoint.z : refPoint.x;
  const side = across >= def.line ? 1 : -1;
  return def.dir === 'x'
    ? { x: alongCenter, y: door.center.y - 1, z: def.line + dist * side }
    : { x: def.line + dist * side, y: door.center.y - 1, z: alongCenter };
}

export function doorIsPassable(door) {
  if (door.locked) return false;
  return door.state === 'open' || door.angle > 0.5;
}

function doorCrossing(doors, a, b, y = null) {
  let best = null;
  for (const door of doors) {
    const def = door.def;
    if (y !== null && Math.abs(door.center.y - (y + 1)) > 2.4) continue;
    const a0 = def.dir === 'x' ? a.z : a.x;
    const b0 = def.dir === 'x' ? b.z : b.x;
    const line = def.line;
    const da = a0 - line, db = b0 - line;
    if (da * db > 0) continue;               // both on the same side
    if (Math.abs(da) < 1e-4 && Math.abs(db) < 1e-4) continue;
    const t = Math.abs(b0 - a0) < 1e-6 ? 0 : da / (a0 - b0);
    const tc = Math.max(0, Math.min(1, t));
    const along = def.dir === 'x' ? a.x + (b.x - a.x) * tc : a.z + (b.z - a.z) * tc;
    if (along < def.span[0] - 0.35 || along > def.span[1] + 0.35) continue;
    const d = tc * dist2(a, b);
    if (!best || d < best.dist) {
      best = {
        door, dist: d,
        alongCenter: (def.span[0] + def.span[1]) / 2,
        side: da >= 0 ? 1 : -1,
      };
    }
  }
  return best;
}

// ---------------------------------------------------------------------- grid
function makeGrid(world, level, x0, z0, x1, z1, baseY) {
  const w = Math.ceil((x1 - x0) / CELL), h = Math.ceil((z1 - z0) / CELL);
  const grid = { level, x0, z0, x1, z1, w, h, baseY, cells: new Uint8Array(w * h), doorRects: doorRects(world, level) };
  const index = makeIndex(world, grid);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) grid.cells[j * w + i] = computeCell(world, grid, i, j, index);
  return grid;
}

// Coarse XZ buckets over the move-blocking colliders. Testing every cell
// against every collider is O(cells x colliders), which the prop passes have
// made the most expensive part of a level load.
const BUCKET = 4;
const NO_COLLIDERS = [];
function makeIndex(world, grid) {
  const w = Math.ceil((grid.x1 - grid.x0) / BUCKET), h = Math.ceil((grid.z1 - grid.z0) / BUCKET);
  const buckets = new Array(w * h);
  for (const c of world.colliders) {
    if (!c.blocksMove) continue;
    if (c.kind === 'floor' || c.kind === 'ceiling') continue;
    // padded by the agent radius: computeCell tests points within r of the box
    const i0 = Math.floor((c.x0 - AGENT_R - grid.x0) / BUCKET);
    const i1 = Math.floor((c.x1 + AGENT_R - grid.x0) / BUCKET);
    const j0 = Math.floor((c.z0 - AGENT_R - grid.z0) / BUCKET);
    const j1 = Math.floor((c.z1 + AGENT_R - grid.z0) / BUCKET);
    for (let j = Math.max(0, j0); j <= Math.min(h - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(w - 1, i1); i++) {
        const k = j * w + i;
        (buckets[k] || (buckets[k] = [])).push(c);
      }
    }
  }
  return { x0: grid.x0, z0: grid.z0, w, h, buckets };
}
function collidersAt(index, x, z) {
  const i = Math.floor((x - index.x0) / BUCKET), j = Math.floor((z - index.z0) / BUCKET);
  if (i < 0 || j < 0 || i >= index.w || j >= index.h) return NO_COLLIDERS;
  return index.buckets[j * index.w + i] || NO_COLLIDERS;
}

// Inside a doorway the agent clearance is relaxed: a 1 m opening only offers
// cell centres 0.25 m from its jambs, which would seal the door for a 0.34 m
// agent even though a body walks through the middle of the frame fine.
function doorRects(world, level) {
  const out = [];
  for (const door of world.doors) {
    const def = door.def;
    if (def.level !== level) continue;
    out.push(def.dir === 'x'
      ? { x0: def.span[0] - 0.05, x1: def.span[1] + 0.05, z0: def.line - 0.5, z1: def.line + 0.5 }
      : { x0: def.line - 0.5, x1: def.line + 0.5, z0: def.span[0] - 0.05, z1: def.span[1] + 0.05 });
  }
  return out;
}
function inDoorway(rects, x, z) {
  for (const r of rects) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
  return false;
}

// cell values: 255 blocked, 1 open, 2..40 extra cost (doors)
function computeCell(world, grid, i, j, index) {
  const x = grid.x0 + (i + 0.5) * CELL, z = grid.z0 + (j + 0.5) * CELL;
  const g = world.groundAt(x, z, grid.baseY + 0.6, 0.5);
  if (g.y < grid.baseY - 0.4 || g.y > grid.baseY + 0.55) return 255; // hole or too high
  const y0 = g.y + 0.25, y1 = g.y + 1.6;
  let cost = 1;
  // Clearance against the jambs is relaxed inside a doorway (see doorRects), but
  // the leaf itself keeps the full radius or a thin closed door slips through the
  // test and locked doors stop blocking.
  const jambR = inDoorway(grid.doorRects, x, z) ? 0.12 : AGENT_R;
  for (const c of collidersAt(index, x, z)) {
    const r = c.door ? AGENT_R : jambR;
    if (x + r < c.x0 || x - r > c.x1 || z + r < c.z0 || z - r > c.z1) continue;
    if (y1 < c.y0 || y0 > c.y1) continue;
    if (c.door) {
      if (c.door.locked) return 255;                 // no route through locked doors
      cost = Math.max(cost, 4); continue;            // doors are pathable (AI opens them)
    }
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

// Joining a grid path to a stair link repeats the shared landing waypoint.
function dedupe(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = out[out.length - 1];
    if (dist2(p, q) < 0.05 && Math.abs(p.y - q.y) < 0.05) continue;
    out.push(p);
  }
  return out;
}

function pathLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return L;
}

function dist2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

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
