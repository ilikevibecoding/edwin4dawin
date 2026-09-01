// A* grid pathfinding over the live voxel world for walking NPCs (4-neighbour, +-1 block steps, slabs).
import { B, BLOCKS, SHAPE } from '../blocks.js';

const SUPPORT_SHAPES = new Set([SHAPE.CUBE, SHAPE.SLAB_TOP, SHAPE.TABLE, SHAPE.FARMLAND, SHAPE.ANVIL, SHAPE.CACTUS]);
const PARTIAL_SHAPES = new Set([SHAPE.SLAB, SHAPE.TROUGH, SHAPE.BED, SHAPE.CHEST]);

export function isPassable(id) {
  if (id === B.WATER) return false;
  return !BLOCKS[id].solid;
}

// Returns foot height if an entity can stand with its feet in cell (x,y,z), else null.
export function standHeight(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  const def = BLOCKS[id];
  if (def.solid) {
    if (!PARTIAL_SHAPES.has(def.shape)) return null;
    const top = def.boxes.length ? def.boxes[0][4] : 0.5;
    if (!isPassable(world.getBlock(x, y + 1, z)) || !isPassable(world.getBlock(x, y + 2, z))) return null;
    return y + top;
  }
  if (id === B.WATER) return null;
  const below = BLOCKS[world.getBlock(x, y - 1, z)];
  if (!below.solid || !SUPPORT_SHAPES.has(below.shape)) return null;
  if (!isPassable(world.getBlock(x, y + 1, z))) return null;
  return y;
}

// Find a standable cell near (x, y, z) searching a few blocks vertically
export function findStand(world, x, y, z, range = 3) {
  for (let dy = 0; dy <= range; dy++) {
    for (const yy of dy === 0 ? [y] : [y + dy, y - dy]) {
      const h = standHeight(world, x, yy, z);
      if (h !== null) return { x, y: yy, z, h };
    }
  }
  return null;
}

class MinHeap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// numeric cell key (valid for |x|,|z| < 32768)
const key = (x, y, z) => ((x + 32768) * 65536 + (z + 32768)) * 256 + y;
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Returns array of {x,y,z,h} from start (exclusive) to goal (inclusive) or null.
export function findPath(world, sx, sy, sz, gx, gy, gz, maxNodes = 4000, avoid = null) {
  const start = findStand(world, sx, sy, sz, 2);
  const goal = findStand(world, gx, gy, gz, 3);
  if (!start || !goal) return null;
  const open = new MinHeap();
  const gScore = new Map();
  const came = new Map();
  const closed = new Set();
  const h = (x, z) => Math.abs(x - goal.x) + Math.abs(z - goal.z);
  const sk = key(start.x, start.y, start.z);
  gScore.set(sk, 0);
  open.push({ x: start.x, y: start.y, z: start.z, hgt: start.h, g: 0, f: h(start.x, start.z), k: sk });
  let expanded = 0;
  let best = null, bestH = Infinity;
  while (open.size) {
    const cur = open.pop();
    if (closed.has(cur.k)) continue;
    closed.add(cur.k);
    const hh = h(cur.x, cur.z);
    if (hh < bestH) { bestH = hh; best = cur; }
    if (cur.x === goal.x && cur.z === goal.z && Math.abs(cur.y - goal.y) <= 1) { best = cur; break; }
    if (++expanded > maxNodes) break;
    for (const [dx, dz] of DIRS4) {
      const nx = cur.x + dx, nz = cur.z + dz;
      for (const dy of [0, 1, -1]) {
        const ny = cur.y + dy;
        const sh = standHeight(world, nx, ny, nz);
        if (sh === null) continue;
        if (Math.abs(sh - cur.hgt) > 1.05) continue;
        // stepping up requires headroom in the current cell too
        if (sh > cur.hgt + 0.55 && !isPassable(world.getBlock(cur.x, cur.y + 2, cur.z))) continue;
        const nk = key(nx, ny, nz);
        if (closed.has(nk)) break;
        let cost = 1 + (sh !== cur.hgt ? 0.4 : 0);
        if (avoid && avoid(nx, ny, nz)) cost += 6;
        const ng = cur.g + cost;
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, cur);
          open.push({ x: nx, y: ny, z: nz, hgt: sh, g: ng, f: ng + h(nx, nz), k: nk });
        }
        break; // take the first valid vertical option
      }
    }
  }
  if (!best) return null;
  // accept partial paths if we got reasonably close (within 3 blocks)
  if (!(best.x === goal.x && best.z === goal.z) && bestH > 3) return null;
  const path = [];
  let n = best;
  while (n && n.k !== sk) { path.push({ x: n.x, y: n.y, z: n.z, h: n.hgt }); n = came.get(n.k); }
  path.reverse();
  return path;
}
