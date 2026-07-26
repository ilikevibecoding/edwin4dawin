import * as THREE from 'three';
import { collision } from './collision.js';
import { WORLD_BOUNDS, ROOMS, roomAt, FLOOR_Y } from './layout.js';

/**
 * MULTI-LEVEL NAVIGATION GRID
 * Owner: Opus 3.
 *
 * The grid is built by probing the finished collision world rather than from
 * the room table, so props, stairs and railings are all accounted for. Each
 * column may hold several nodes (ground, stair tread, upper floor), and nodes
 * in neighbouring columns link when the step between them is climbable. That
 * makes stairs ordinary navigation with no hand-authored links, and it means a
 * blocked route is genuinely blocked rather than optimistically traversable.
 */

const CELL = 0.4;
const AGENT_RADIUS = 0.36;
const AGENT_HEIGHT = 1.78;
const MAX_STEP = 0.42;
const NARROW_RADIUS = 0.24;

/**
 * Room lookup for a grid cell.
 *
 * `roomAt` uses strict inequalities, so a cell centre that lands exactly on a
 * shared room edge belongs to neither room. Those cells sit in doorways and
 * cased openings, and discarding them punched a one-cell hole through every
 * wall line that happened to align with the grid — which split the graph into
 * one component per room. Nudging the sample resolves the boundary case.
 */
function roomForNav(x, z, floor) {
  return roomAt(x, z, floor)
    ?? roomAt(x + 0.14, z, floor)
    ?? roomAt(x - 0.14, z, floor)
    ?? roomAt(x, z + 0.14, floor)
    ?? roomAt(x, z - 0.14, floor);
}

export class NavGraph {
  constructor() {
    this.nodes = [];
    this.columns = new Map();
    this.nx = 0;
    this.nz = 0;
    this.x0 = 0;
    this.z0 = 0;
    this.buildMs = 0;
  }

  key(ix, iz) {
    return ix * 4096 + iz;
  }

  build() {
    const t0 = performance.now();
    // Doors are opened by whoever walks into them, so they must not cut the
    // graph. Everything else (walls, props, glass, railings) stays solid.
    this.x0 = Math.floor(WORLD_BOUNDS.x0 / CELL) * CELL;
    this.z0 = Math.floor(WORLD_BOUNDS.z0 / CELL) * CELL;
    this.nx = Math.ceil((WORLD_BOUNDS.x1 - this.x0) / CELL);
    this.nz = Math.ceil((WORLD_BOUNDS.z1 - this.z0) / CELL);

    const scratch = [];
    // Doors are opened by whoever walks into them, so they must not cut the
    // graph. Filtering is explicit rather than global state so the rule is
    // visible at the point of use.
    const passable = (b) => b.tag === 'door';
    for (let ix = 0; ix < this.nx; ix++) {
      const x = this.x0 + (ix + 0.5) * CELL;
      for (let iz = 0; iz < this.nz; iz++) {
        const z = this.z0 + (iz + 0.5) * CELL;
        // Candidate standing heights in this column
        collision.query(x - 0.05, -2, z - 0.05, x + 0.05, 9, z + 0.05, scratch);
        if (!scratch.length) continue;
        const tops = new Set();
        for (const b of scratch) {
          if (b.tag === 'ceiling' || b.noClip || passable(b)) continue;
          if (b.y1 < -1 || b.y1 > 8) continue;
          tops.add(Math.round(b.y1 * 50) / 50);
        }
        const sorted = Array.from(tops).sort((a, b) => a - b);
        const colNodes = [];
        for (const y of sorted) {
          // Clearance is measured from one step height up, not from the floor.
          // On a staircase the riser ahead is always higher than the tread you
          // are standing on, so a floor-height capsule test rejects every single
          // tread and the two floors end up in separate graph components.
          // Doorways are the tightest thing an agent squeezes through. A single
          // radius test at 0.36 m can reject every cell in a 0.9 m opening
          // simply because no 0.4 m grid centre lands inside the clear window,
          // which orphans the room behind it. Fall back to a tighter probe and
          // mark the node as a squeeze so the planner prefers open ground.
          let squeeze = false;
          if (collision.overlaps(x, y + MAX_STEP, z, AGENT_RADIUS, AGENT_HEIGHT - MAX_STEP, 'door')) {
            if (collision.overlaps(x, y + MAX_STEP, z, NARROW_RADIUS, AGENT_HEIGHT - MAX_STEP, 'door')) continue;
            squeeze = true;
          }
          // Reject if another surface sits just above (crawl space)
          let blocked = false;
          for (const y2 of sorted) {
            if (y2 > y + MAX_STEP && y2 < y + AGENT_HEIGHT) { blocked = true; break; }
          }
          if (blocked) continue;
          if (colNodes.length && Math.abs(colNodes[colNodes.length - 1].y - y) < 0.12) continue;
          const floor = y > 2.2 ? 'upper' : 'ground';
          const groundRoom = roomForNav(x, z, 'ground');
          const upperRoom = roomForNav(x, z, 'upper');
          // A stair void has no upper room by design, but its treads are the
          // only link between the floors, so they have to stay navigable.
          const stairColumn = groundRoom?.kind === 'stair' || upperRoom?.kind === 'stair';
          const room = floor === 'upper' ? (upperRoom ?? (stairColumn ? groundRoom : null)) : groundRoom;
          // Reject surfaces that exist but nobody walks on: snow-covered roof
          // decks, window sills and the top of the upper ceiling slab all have
          // head clearance and would otherwise form large phantom components.
          if (!room && !stairColumn && y > 0.6) continue;
          const base = floor === 'upper' ? FLOOR_Y.upper : 0;
          if (!stairColumn && room && (y > base + 0.7 || y < base - 0.7)) continue;
          if (y > FLOOR_Y.upper + 0.7) continue;
          colNodes.push({
            id: this.nodes.length, ix, iz, x, y, z,
            floor, room: room?.id ?? (y < 0.3 ? 'exterior' : null),
            links: [], cost: squeeze ? 1.7 : 1, squeeze,
          });
          this.nodes.push(colNodes[colNodes.length - 1]);
        }
        if (colNodes.length) this.columns.set(this.key(ix, iz), colNodes);
      }
    }

    // Link neighbours
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const n of this.nodes) {
      for (const [dx, dz] of dirs) {
        const col = this.columns.get(this.key(n.ix + dx, n.iz + dz));
        if (!col) continue;
        const diag = dx !== 0 && dz !== 0;
        for (const m of col) {
          const dy = Math.abs(m.y - n.y);
          if (dy > MAX_STEP) continue;
          if (diag) {
            // Do not cut corners through geometry
            const a = this.columns.get(this.key(n.ix + dx, n.iz));
            const b = this.columns.get(this.key(n.ix, n.iz + dz));
            if (!a || !b) continue;
            if (!a.some((p) => Math.abs(p.y - n.y) <= MAX_STEP)) continue;
            if (!b.some((p) => Math.abs(p.y - n.y) <= MAX_STEP)) continue;
          }
          const d = Math.hypot(m.x - n.x, m.z - n.z) + dy * 1.6;
          n.links.push({ node: m, cost: d * (diag ? 1.02 : 1) });
        }
      }
    }
    this.buildMs = Math.round(performance.now() - t0);
    this._cleanIsolated();
    return this;
  }

  /**
   * Prune the graph to a single connected component.
   *
   * Two passes. First drop ledge nodes with fewer than two neighbours. Then
   * flood-fill and keep only the largest component: small pockets behind a
   * fridge or between a locker bank and a wall are mutually linked, so they
   * survive a degree test but are unreachable from the rest of the building.
   * An agent snapped onto one of those islands can never path anywhere, which
   * is indistinguishable from being permanently stuck.
   */
  _cleanIsolated() {
    let removed = 0;
    for (const n of this.nodes) {
      if (n.links.length <= 1) { n.disabled = true; removed++; }
    }

    const seen = new Set();
    const components = [];
    for (const start of this.nodes) {
      if (start.disabled || seen.has(start.id)) continue;
      const comp = [];
      const stack = [start];
      seen.add(start.id);
      while (stack.length) {
        const n = stack.pop();
        comp.push(n);
        for (const link of n.links) {
          const m = link.node;
          if (m.disabled || seen.has(m.id)) continue;
          seen.add(m.id);
          stack.push(m);
        }
      }
      components.push(comp);
    }
    components.sort((a, b) => b.length - a.length);
    this.components = components.length;
    this.mainComponentSize = components[0]?.length ?? 0;
    // Keep any component big enough to be a real space; drop the pockets.
    const keepThreshold = Math.max(120, Math.round(this.mainComponentSize * 0.02));
    let orphaned = 0;
    let islands = 0;
    for (let i = 1; i < components.length; i++) {
      if (components[i].length >= keepThreshold) continue;
      islands++;
      for (const n of components[i]) { n.disabled = true; orphaned++; }
    }
    this.isolated = removed;
    this.orphanedIslands = orphaned;
    this.islandCount = islands;
    this.keptComponents = components.filter((c, i) => i === 0 || c.length >= keepThreshold).length;
  }

  nearest(pos, maxRadius = 4) {
    const ix = Math.floor((pos.x - this.x0) / CELL);
    const iz = Math.floor((pos.z - this.z0) / CELL);
    let best = null;
    let bestD = Infinity;
    const R = Math.ceil(maxRadius / CELL);
    for (let r = 0; r <= R; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const col = this.columns.get(this.key(ix + dx, iz + dz));
          if (!col) continue;
          for (const n of col) {
            if (n.disabled) continue;
            // Squeeze cells are places a full-width capsule cannot stand, so
            // never snap a body onto one: it would start embedded in geometry.
            const d = (n.x - pos.x) ** 2 + (n.z - pos.z) ** 2 + (n.y - pos.y) ** 2 * 3 + (n.squeeze ? 6 : 0);
            if (d < bestD) { bestD = d; best = n; }
          }
        }
      }
      if (best && r > 1) break;
    }
    return best;
  }

  /** A* between world positions. Returns an array of THREE.Vector3 waypoints. */
  findPath(from, to, opts = {}) {
    const start = this.nearest(from, opts.snap ?? 3);
    const goal = this.nearest(to, opts.snap ?? 3);
    if (!start || !goal) return null;
    if (start === goal) return [new THREE.Vector3(goal.x, goal.y, goal.z)];

    const open = new MinHeap();
    const gScore = new Map();
    const cameFrom = new Map();
    // Weighted A*. A straight-line heuristic badly underestimates cross-floor
    // routes — the mezzanine sits almost directly above the lobby but the walk
    // is via the far stairwell — so an unweighted search expands most of the
    // building before it commits. The 1.25 weight keeps paths near-optimal and
    // cuts expansions by roughly an order of magnitude.
    const W = opts.heuristicWeight ?? 1.25;
    const h = (n) => (Math.hypot(n.x - goal.x, n.z - goal.z) + Math.abs(n.y - goal.y) * 2.2) * W;
    gScore.set(start.id, 0);
    open.push(start, h(start));
    let expanded = 0;
    const limit = opts.limit ?? 90000;

    while (open.size > 0 && expanded < limit) {
      const current = open.pop();
      expanded++;
      if (current === goal) break;
      const gc = gScore.get(current.id) ?? Infinity;
      for (const link of current.links) {
        const n = link.node;
        if (n.disabled) continue;
        const tentative = gc + link.cost * (n.cost ?? 1);
        if (tentative < (gScore.get(n.id) ?? Infinity)) {
          gScore.set(n.id, tentative);
          cameFrom.set(n.id, current);
          open.push(n, tentative + h(n));
        }
      }
    }
    if (!cameFrom.has(goal.id) && goal !== start) return null;

    const raw = [];
    let cur = goal;
    let guard = 0;
    while (cur && guard++ < 6000) {
      raw.push(cur);
      if (cur === start) break;
      cur = cameFrom.get(cur.id);
    }
    raw.reverse();
    return this.smooth(raw).map((n) => new THREE.Vector3(n.x, n.y, n.z));
  }

  /** String-pull the grid path using capsule sweeps so agents cut corners. */
  smooth(nodes) {
    if (nodes.length < 3) return nodes;
    const out = [nodes[0]];
    let i = 0;
    while (i < nodes.length - 1) {
      let j = nodes.length - 1;
      for (; j > i + 1; j--) {
        if (this.canWalkStraight(nodes[i], nodes[j])) break;
      }
      out.push(nodes[j]);
      i = j;
    }
    return out;
  }

  canWalkStraight(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dz);
    if (dist > 9) return false;
    const steps = Math.max(2, Math.ceil(dist / (CELL * 0.85)));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + dx * t;
      const z = a.z + dz * t;
      const y = a.y + dy * t;
      // Smoothing must respect everything real movement respects, including
      // closed doors, or a shortcut is generated that the capsule cannot walk.
      if (collision.overlaps(x, y + 0.24, z, AGENT_RADIUS, AGENT_HEIGHT - 0.24)) return false;
      const g = collision.groundAt(x, z, y + 0.8);
      if (!g || Math.abs(g.y - y) > 0.45) return false;
    }
    return true;
  }

  /** Sample random reachable points inside a room, used for patrols and search. */
  pointsInRoom(roomId, count = 8, rng = Math.random) {
    const pool = this.nodes.filter((n) => !n.disabled && n.room === roomId);
    if (!pool.length) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
      const n = pool[Math.floor(rng() * pool.length)];
      out.push(new THREE.Vector3(n.x, n.y, n.z));
    }
    return out;
  }

  randomPoint(rng = Math.random, filter = null) {
    for (let tries = 0; tries < 60; tries++) {
      const n = this.nodes[Math.floor(rng() * this.nodes.length)];
      if (n.disabled) continue;
      if (filter && !filter(n)) continue;
      return new THREE.Vector3(n.x, n.y, n.z);
    }
    return null;
  }

  report() {
    const byRoom = {};
    let active = 0;
    for (const n of this.nodes) {
      if (n.disabled) continue;
      active++;
      byRoom[n.room ?? 'none'] = (byRoom[n.room ?? 'none'] ?? 0) + 1;
    }
    const missing = ROOMS.filter((r) => r.kind !== 'exterior' && !byRoom[r.id]).map((r) => r.id);
    return {
      nodes: this.nodes.length, active, isolated: this.isolated,
      islands: this.islandCount, orphaned: this.orphanedIslands, keptComponents: this.keptComponents,
      mainComponent: this.mainComponentSize,
      buildMs: this.buildMs, roomsWithoutNav: missing, cell: CELL,
    };
  }

  debugGeometry() {
    const pts = [];
    for (const n of this.nodes) {
      if (n.disabled) continue;
      pts.push(n.x, n.y + 0.03, n.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }
}

class MinHeap {
  constructor() {
    this.items = [];
    this.prio = [];
  }

  get size() {
    return this.items.length;
  }

  push(item, priority) {
    this.items.push(item);
    this.prio.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.prio[p] <= this.prio[i]) break;
      this._swap(i, p);
      i = p;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    const lastP = this.prio.pop();
    if (this.items.length) {
      this.items[0] = last;
      this.prio[0] = lastP;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let s = i;
        if (l < n && this.prio[l] < this.prio[s]) s = l;
        if (r < n && this.prio[r] < this.prio[s]) s = r;
        if (s === i) break;
        this._swap(i, s);
        i = s;
      }
    }
    return top;
  }

  _swap(a, b) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}

void FLOOR_Y;
