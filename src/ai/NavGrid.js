import * as THREE from 'three';
import { GROUP, groups } from '../core/Physics.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _dir2 = new THREE.Vector3();

/** Tiny binary min-heap on { f } records for A*. */
class Heap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Pathfinding + tactical queries over the world's nav graph ({ nodes: [{ id, position, cover }], edges }).
 * Nodes are validated ground points on a 4 m grid; edges are walkable, unobstructed links.
 */
export class NavGrid {
  constructor(game, graph) {
    this.game = game;
    this.nodes = graph?.nodes || [];
    this.adj = this.nodes.map(() => []);
    for (const [a, b] of graph?.edges || []) {
      const na = this.nodes[a];
      const nb = this.nodes[b];
      if (!na || !nb) continue;
      const d = na.position.distanceTo(nb.position);
      this.adj[a].push({ id: b, d });
      this.adj[b].push({ id: a, d });
    }
    this.coverNodes = this.nodes.filter((n) => n.cover);
    this._worldFilter = groups(GROUP.ALL, GROUP.WORLD);
    // Coarse spatial hash for nearest-node lookups.
    this._cell = 8;
    this._hash = new Map();
    for (const n of this.nodes) {
      const key = this._key(n.position.x, n.position.z);
      let list = this._hash.get(key);
      if (!list) this._hash.set(key, (list = []));
      list.push(n);
    }
    this._search = 0;
    this._g = new Float64Array(this.nodes.length);
    this._closed = new Uint32Array(this.nodes.length);
    this._open = new Uint32Array(this.nodes.length);
    this._parent = new Int32Array(this.nodes.length);
  }

  _key(x, z) {
    return `${Math.floor(x / this._cell)},${Math.floor(z / this._cell)}`;
  }

  get size() {
    return this.nodes.length;
  }

  /** Nearest node to a world position (optionally requiring a straight, unobstructed walk to it). */
  nearest(pos, { maxDist = 12, requireClear = false } = {}) {
    let best = null;
    let bestD = Infinity;
    const r = Math.ceil(maxDist / this._cell);
    const cx = Math.floor(pos.x / this._cell);
    const cz = Math.floor(pos.z / this._cell);
    const candidates = [];
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) {
        const list = this._hash.get(`${cx + i},${cz + j}`);
        if (list) for (const n of list) candidates.push(n);
      }
    }
    if (!candidates.length) {
      for (const n of this.nodes) candidates.push(n);
    }
    candidates.sort((a, b) => a.position.distanceToSquared(pos) - b.position.distanceToSquared(pos));
    for (const n of candidates) {
      const d = n.position.distanceTo(pos);
      if (d >= bestD) break;
      if (requireClear && d > 0.3 && !this.isWalkClear(pos, n.position)) continue;
      best = n;
      bestD = d;
      if (!requireClear) break;
    }
    return best;
  }

  /** True when a capsule-ish walk from a to b is unobstructed (rays at ankle + chest height). */
  isWalkClear(a, b, { margin = 0.25 } = {}) {
    _dir.subVectors(b, a);
    _dir.y = 0;
    const dist = _dir.length();
    if (dist < 0.05) return true;
    _dir.multiplyScalar(1 / dist);
    const physics = this.game.physics;
    for (const h of [0.35, 1.0]) {
      _a.set(a.x, a.y + h, a.z);
      const hit = physics.raycast(_a, _dir, Math.max(0.01, dist - margin), { filter: this._worldFilter });
      if (hit) return false;
    }
    return true;
  }

  /** A* between node ids. Returns an array of node ids (start..goal) or null. */
  astar(startId, goalId) {
    if (startId === goalId) return [startId];
    const nodes = this.nodes;
    const goal = nodes[goalId].position;
    const search = ++this._search;
    const g = this._g;
    const closed = this._closed;
    const open = this._open;
    const parent = this._parent;
    const heap = new Heap();
    g[startId] = 0;
    parent[startId] = -1;
    open[startId] = search;
    heap.push({ id: startId, f: nodes[startId].position.distanceTo(goal) });
    let expanded = 0;
    while (heap.size) {
      const cur = heap.pop();
      const id = cur.id;
      if (closed[id] === search) continue;
      closed[id] = search;
      if (id === goalId) {
        const path = [];
        for (let n = id; n !== -1; n = parent[n]) path.push(n);
        path.reverse();
        return path;
      }
      if (++expanded > 4000) break;
      for (const { id: nb, d } of this.adj[id]) {
        if (closed[nb] === search) continue;
        const ng = g[id] + d;
        if (open[nb] === search && ng >= g[nb]) continue;
        g[nb] = ng;
        parent[nb] = id;
        open[nb] = search;
        heap.push({ id: nb, f: ng + nodes[nb].position.distanceTo(goal) });
      }
    }
    return null;
  }

  /**
   * World-space path from `from` to `to`: [Vector3...] ending at `to` when the last leg is clear.
   * Returns null when no path exists (caller should fall back to direct steering).
   */
  findPath(from, to) {
    if (!this.nodes.length) return null;
    if (this.isWalkClear(from, to) && from.distanceTo(to) < 14) return [to.clone()];
    const start = this.nearest(from, { maxDist: 10, requireClear: true }) || this.nearest(from, { maxDist: 30 });
    const goal = this.nearest(to, { maxDist: 10, requireClear: true }) || this.nearest(to, { maxDist: 30 });
    if (!start || !goal) return null;
    const ids = this.astar(start.id, goal.id);
    if (!ids) return null;
    const pts = ids.map((id) => this.nodes[id].position.clone());
    // Drop the first node when we can already walk straight to the second one.
    while (pts.length > 1 && this.isWalkClear(from, pts[1])) pts.shift();
    if (this.isWalkClear(pts[pts.length - 1], to)) pts.push(to.clone());
    return pts;
  }

  /** Straight-line shortcutting: index of the furthest waypoint (≤ lookahead ahead) reachable directly. */
  shortcut(from, path, startIndex, lookahead = 3) {
    let best = startIndex;
    const end = Math.min(path.length - 1, startIndex + lookahead);
    for (let i = end; i > startIndex; i--) {
      if (this.isWalkClear(from, path[i])) {
        best = i;
        break;
      }
    }
    return best;
  }

  /**
   * Cover quality of a node against a threat at `threat` (eye position):
   *   blocked  – something solid between the node's chest height and the threat within 3 m (protects when crouched)
   *   peek     – the threat is visible from standing eye height (can shoot over/around it)
   * Returns null when the node gives no protection.
   */
  evaluateCover(node, threat) {
    const physics = this.game.physics;
    const filter = this._worldFilter;
    const p = node.position;
    _dir.set(threat.x - p.x, 0, threat.z - p.z);
    const dist = _dir.length();
    if (dist < 1.5) return null;
    _dir.multiplyScalar(1 / dist);
    // Blocked at chest height toward the threat (straight on or up to ±30° off — the grid is coarse and
    // planters/benches are small), anything solid within 3.5 m counts.
    let block = null;
    for (const off of [0, 0.5, -0.5]) {
      _b.copy(_dir);
      if (off) _b.set(_dir.x * Math.cos(off) - _dir.z * Math.sin(off), 0, _dir.x * Math.sin(off) + _dir.z * Math.cos(off));
      _a.set(p.x, p.y + 0.85, p.z);
      const hit = physics.raycast(_a, _b, 3.5, { filter });
      if (hit && !hit.data?.boundary) {
        block = hit;
        break;
      }
    }
    if (!block) return null;
    // Peek: can the threat be seen from standing eye height, either straight up or leaning sideways?
    const right = _b.set(-_dir.z, 0, _dir.x);
    let peek = false;
    for (const side of [0, 0.6, -0.6]) {
      _a.set(p.x + right.x * side, p.y + 1.55, p.z + right.z * side);
      const to = _dir2.copy(threat).sub(_a);
      const d = to.length();
      to.multiplyScalar(1 / d);
      if (!physics.raycast(_a, to, d - 0.5, { filter })) {
        peek = true;
        break;
      }
    }
    return { node, blockDistance: block.distance, peek, distance: dist };
  }

  /**
   * Best firing/cover position for an enemy at `from` against a threat at `threat`: a node minRange..maxRange
   * from the threat with something solid between its chest and the threat, preferably one it can peek from.
   * Cover-flagged nodes are tried first, then any node (a 4 m grid puts most cover between nodes).
   */
  findCover(from, threat, { minRange = 6, maxRange = 28, avoid = null, awayFrom = null, limit = 28 } = {}) {
    const collect = (list) => {
      const cands = [];
      for (const n of list) {
        const d = n.position.distanceTo(threat);
        if (d < minRange || d > maxRange) continue;
        if (awayFrom) {
          _dir.subVectors(n.position, awayFrom);
          _a.subVectors(threat, awayFrom);
          if (_dir.dot(_a) > 0) continue; // must be on the far side from the threat
        }
        const travel = n.position.distanceTo(from);
        if (travel > 45) continue;
        let busy = false;
        if (avoid) for (const p of avoid) if (p && p.distanceToSquared(n.position) < 4) busy = true;
        if (busy) continue;
        cands.push({ n, score: travel + Math.abs(d - 14) * 0.6 });
      }
      cands.sort((a, b) => a.score - b.score);
      return cands;
    };
    let fallback = null;
    for (const list of [this.coverNodes, this.nodes]) {
      const cands = collect(list);
      for (let i = 0; i < Math.min(limit, cands.length); i++) {
        const n = cands[i].n;
        if (list !== this.coverNodes && n.cover) continue; // already evaluated in the first pass
        const ev = this.evaluateCover(n, threat);
        if (!ev) continue;
        if (ev.peek) return ev.node;
        if (!fallback) fallback = ev.node;
      }
    }
    return fallback;
  }

  /** A random walkable node within [minR, maxR] of `pos` (falls back to the nearest node). */
  randomNear(pos, minR = 4, maxR = 14, rng = Math.random) {
    const cands = [];
    for (const n of this.nodes) {
      const d = n.position.distanceTo(pos);
      if (d >= minR && d <= maxR) cands.push(n);
    }
    if (!cands.length) return this.nearest(pos, { maxDist: 40 });
    return cands[Math.floor(rng() * cands.length)];
  }
}
