/**
 * Multi-layer A* with a per-frame expansion budget.
 *
 * Three decisions shape this file.
 *
 * **One searcher, a queue of requests.** Twenty agents each holding their own
 * open set would mean twenty copies of a 230,000-node scratch space. Instead
 * there is exactly one searcher, requests are queued by priority, and a search
 * that outruns the frame budget is suspended and resumed next frame with its open
 * set intact. An agent waiting two frames for a path is invisible; a 12 ms hitch
 * when four of them repath on the same frame is not.
 *
 * **Generation stamps instead of clearing.** The visited arrays are never zeroed.
 * Each search bumps a counter and a node is "unvisited" if its stamp is stale,
 * which turns a 900 KB memset per search into nothing.
 *
 * **String pulling before the path is handed over.** A raw grid path is a
 * staircase, and a staircase is the most recognisable possible sign that an agent
 * is following a grid. Greedily skipping waypoints whose connecting segment stays
 * walkable turns it into the two or three long diagonals a person would actually
 * walk, and costs a handful of cell lookups per corner.
 */
import type * as THREE from 'three';
import { PATH } from './Tuning';
import { navStepUp, worldToCellX, worldToCellZ, cellCentreX, cellCentreZ, nearestWalkable, type NavView } from './Nav';

/** Anything that can be handed a finished path. */
export interface PathClient {
  readonly pathOwnerId: number;
  /**
   * Receives the smoothed path. `points` is shared scratch — copy what you need
   * before returning. `partial` is true when the goal was unreachable and this is
   * the best approach found.
   */
  onPathReady(points: Float32Array, count: number, partial: boolean): void;
  /** No path at all: the agent is off-mesh or the queue dropped the request. */
  onPathFailed(): void;
}

interface Request {
  client: PathClient;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  priority: number;
  queuedAt: number;
}

class BinaryHeap {
  private nodes: Int32Array;
  private costs: Float32Array;
  private count = 0;

  constructor(capacity: number) {
    this.nodes = new Int32Array(capacity);
    this.costs = new Float32Array(capacity);
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.count = 0;
  }

  push(node: number, cost: number): void {
    if (this.count === this.nodes.length) this.grow();
    let i = this.count++;
    this.nodes[i] = node;
    this.costs[i] = cost;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.costs[parent] <= this.costs[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Returns the cheapest node, or -1 when empty. */
  pop(): number {
    if (this.count === 0) return -1;
    const top = this.nodes[0];
    this.count--;
    if (this.count > 0) {
      this.nodes[0] = this.nodes[this.count];
      this.costs[0] = this.costs[this.count];
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        if (left >= this.count) break;
        const right = left + 1;
        let best = left;
        if (right < this.count && this.costs[right] < this.costs[left]) best = right;
        if (this.costs[i] <= this.costs[best]) break;
        this.swap(i, best);
        i = best;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const n = this.nodes[a];
    this.nodes[a] = this.nodes[b];
    this.nodes[b] = n;
    const c = this.costs[a];
    this.costs[a] = this.costs[b];
    this.costs[b] = c;
  }

  private grow(): void {
    const nodes = new Int32Array(this.nodes.length * 2);
    nodes.set(this.nodes);
    this.nodes = nodes;
    const costs = new Float32Array(this.costs.length * 2);
    costs.set(this.costs);
    this.costs = costs;
  }
}

const NEIGHBOUR_DX = [1, -1, 0, 0, 1, 1, -1, -1] as const;
const NEIGHBOUR_DZ = [0, 0, 1, -1, 1, -1, 1, -1] as const;

export class PathPlanner {
  private nav: NavView | null = null;
  private layers = 1;
  private width = 1;
  private depth = 1;
  private cellSize = 0.5;

  private gScore = new Float32Array(0);
  private parent = new Int32Array(0);
  private stamp = new Uint32Array(0);
  private closed = new Uint8Array(0);
  private generation = 0;

  private readonly open = new BinaryHeap(8192);
  private readonly queue: Request[] = [];
  private readonly pool: Request[] = [];

  private active: Request | null = null;
  private goalNode = -1;
  private startNode = -1;
  private bestNode = -1;
  private bestHeuristic = Infinity;
  private expansions = 0;

  /** Raw grid path, then the smoothed one. Both shared, both reused. */
  private readonly raw = new Int32Array(PATH.maxWaypoints * 4);
  private readonly points = new Float32Array(PATH.maxWaypoints * 3);

  readonly stats = {
    searches: 0,
    completed: 0,
    partial: 0,
    failed: 0,
    expansions: 0,
    peakQueue: 0,
    resumed: 0,
  };

  attach(nav: NavView | null): void {
    if (!nav || nav === this.nav) return;
    this.nav = nav;
    this.layers = Math.max(1, nav.layerCount);
    this.width = nav.width;
    this.depth = nav.depth;
    this.cellSize = nav.cellSize;
    const cells = this.width * this.depth * this.layers;
    this.gScore = new Float32Array(cells);
    this.parent = new Int32Array(cells);
    this.stamp = new Uint32Array(cells);
    this.closed = new Uint8Array(cells);
    this.generation = 0;
    this.abandon();
  }

  get ready(): boolean {
    return this.nav !== null;
  }

  get pending(): number {
    return this.queue.length + (this.active ? 1 : 0);
  }

  /**
   * Queues a search. A client may only have one outstanding request; a second
   * replaces the first, which is what an agent whose target moved actually wants.
   */
  request(
    client: PathClient,
    from: THREE.Vector3,
    to: THREE.Vector3,
    priority: number,
    now: number,
  ): boolean {
    if (!this.nav) return false;
    this.cancel(client);

    if (this.queue.length >= PATH.queueLimit) {
      // Drop the least important queued request rather than this one, unless this
      // one is the least important, in which case refuse it outright.
      let worst = 0;
      for (let i = 1; i < this.queue.length; i++) {
        if (this.queue[i].priority < this.queue[worst].priority) worst = i;
      }
      if (this.queue[worst].priority >= priority) {
        client.onPathFailed();
        return false;
      }
      const dropped = this.queue.splice(worst, 1)[0];
      dropped.client.onPathFailed();
      this.recycle(dropped);
    }

    const request = this.pool.pop() ?? {
      client,
      fromX: 0,
      fromY: 0,
      fromZ: 0,
      toX: 0,
      toY: 0,
      toZ: 0,
      priority: 0,
      queuedAt: 0,
    };
    request.client = client;
    request.fromX = from.x;
    request.fromY = from.y;
    request.fromZ = from.z;
    request.toX = to.x;
    request.toY = to.y;
    request.toZ = to.z;
    request.priority = priority;
    request.queuedAt = now;
    this.queue.push(request);
    if (this.queue.length > this.stats.peakQueue) this.stats.peakQueue = this.queue.length;
    return true;
  }

  cancel(client: PathClient): void {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].client.pathOwnerId === client.pathOwnerId) {
        this.recycle(this.queue.splice(i, 1)[0]);
        return;
      }
    }
    if (this.active && this.active.client.pathOwnerId === client.pathOwnerId) this.abandon();
  }

  /** Spends this frame's budget. Called once per frame by the AI system. */
  update(): void {
    if (!this.nav) return;
    let budget = PATH.frameBudget;
    while (budget > 0) {
      if (!this.active && !this.beginNext()) return;
      if (!this.active) return;
      const spent = this.step(budget);
      budget -= spent;
      if (this.active) {
        // Still running: it used the whole slice, so stop here and resume later.
        this.stats.resumed++;
        return;
      }
    }
  }

  private beginNext(): boolean {
    if (this.queue.length === 0) return false;
    let best = 0;
    for (let i = 1; i < this.queue.length; i++) {
      // Priority first, then age, so a low-priority request is not starved.
      const a = this.queue[i];
      const b = this.queue[best];
      if (a.priority > b.priority || (a.priority === b.priority && a.queuedAt < b.queuedAt)) {
        best = i;
      }
    }
    const request = this.queue.splice(best, 1)[0];
    const nav = this.nav;
    if (!nav) return false;

    const start = nearestWalkable(nav, request.fromX, request.fromY, request.fromZ, 4);
    const goal = nearestWalkable(nav, request.toX, request.toY, request.toZ, 8);
    if (start < 0 || goal < 0) {
      request.client.onPathFailed();
      this.recycle(request);
      this.stats.failed++;
      return true;
    }

    this.generation++;
    this.open.clear();
    this.active = request;
    this.startNode = start;
    this.goalNode = goal;
    this.expansions = 0;
    this.bestNode = start;
    this.bestHeuristic = this.heuristic(start, goal);

    this.gScore[start] = 0;
    this.parent[start] = -1;
    this.stamp[start] = this.generation;
    this.closed[start] = 0;
    this.open.push(start, this.bestHeuristic);
    this.stats.searches++;

    if (start === goal) {
      this.finish(false);
      return true;
    }
    return true;
  }

  /** Expands up to `budget` nodes. Returns how many it actually spent. */
  private step(budget: number): number {
    const nav = this.nav;
    const request = this.active;
    if (!nav || !request) return 0;

    const layers = this.layers;
    const width = this.width;
    const cell = this.cellSize;
    const diagonal = cell * Math.SQRT2;
    const generation = this.generation;
    let spent = 0;

    while (spent < budget) {
      const current = this.open.pop();
      if (current === -1) {
        // Exhausted: hand back the closest approach we found.
        this.finish(true);
        return spent;
      }
      if (this.closed[current] === 1 && this.stamp[current] === generation) continue;
      this.closed[current] = 1;
      spent++;
      this.expansions++;

      if (current === this.goalNode) {
        this.finish(false);
        return spent;
      }
      if (this.expansions >= PATH.maxExpansions) {
        this.finish(true);
        return spent;
      }

      const layer = current % layers;
      const flat = (current - layer) / layers;
      const cz = (flat / width) | 0;
      const cx = flat - cz * width;
      const height = nav.heightAtCell(cx, cz, layer);
      const g = this.gScore[current];

      for (let n = 0; n < 8; n++) {
        const dx = NEIGHBOUR_DX[n];
        const dz = NEIGHBOUR_DZ[n];
        const nx = cx + dx;
        const nz = cz + dz;
        if (!nav.inside(nx, nz)) continue;
        const isDiagonal = n >= 4;
        if (isDiagonal) {
          // No squeezing between two blocked cells; a shoulder would clip the wall.
          if (!this.columnWalkable(cx + dx, cz, height) || !this.columnWalkable(cx, cz + dz, height)) {
            continue;
          }
        }

        for (let l = 0; l < layers; l++) {
          const cost = nav.costAtCell(nx, nz, l);
          if (cost <= 0) continue;
          const nh = nav.heightAtCell(nx, nz, l);
          const climb = nh - height;
          if (Math.abs(climb) > navStepUp) continue;

          const node = (nz * width + nx) * layers + l;
          if (this.stamp[node] === generation && this.closed[node] === 1) break;

          const step = (isDiagonal ? diagonal : cell) * cost + Math.abs(climb) * PATH.climbCost;
          const tentative = g + step;
          if (this.stamp[node] === generation && tentative >= this.gScore[node]) break;

          this.stamp[node] = generation;
          this.closed[node] = 0;
          this.gScore[node] = tentative;
          this.parent[node] = current;
          const h = this.heuristic(node, this.goalNode);
          if (h < this.bestHeuristic) {
            this.bestHeuristic = h;
            this.bestNode = node;
          }
          this.open.push(node, tentative + h * PATH.heuristicWeight);
          // Only the lowest reachable layer in a column is a real neighbour;
          // anything above it is another storey, reached by its own ramp.
          break;
        }
      }
    }
    return spent;
  }

  /** True when any layer of this column is walkable near `height`. */
  private columnWalkable(cx: number, cz: number, height: number): boolean {
    const nav = this.nav;
    if (!nav) return false;
    for (let l = 0; l < this.layers; l++) {
      if (nav.costAtCell(cx, cz, l) <= 0) continue;
      if (Math.abs(nav.heightAtCell(cx, cz, l) - height) <= navStepUp) return true;
    }
    return false;
  }

  private heuristic(node: number, goal: number): number {
    const layers = this.layers;
    const width = this.width;
    const al = node % layers;
    const aFlat = (node - al) / layers;
    const az = (aFlat / width) | 0;
    const ax = aFlat - az * width;
    const bl = goal % layers;
    const bFlat = (goal - bl) / layers;
    const bz = (bFlat / width) | 0;
    const bx = bFlat - bz * width;

    const dx = Math.abs(ax - bx);
    const dz = Math.abs(az - bz);
    // Octile: exact on an eight-connected grid with unit costs.
    const straight = Math.abs(dx - dz);
    const diag = Math.min(dx, dz);
    return (straight + diag * Math.SQRT2) * this.cellSize;
  }

  private finish(partial: boolean): void {
    const request = this.active;
    const nav = this.nav;
    this.active = null;
    if (!request || !nav) return;

    const end = partial ? this.bestNode : this.goalNode;
    if (end < 0 || this.stamp[end] !== this.generation) {
      request.client.onPathFailed();
      this.recycle(request);
      this.stats.failed++;
      return;
    }

    // Walk the parent chain back, writing cells front-to-back.
    let count = 0;
    let node = end;
    const raw = this.raw;
    const limit = PATH.maxWaypoints;
    while (node !== -1 && count < limit) {
      raw[count++] = node;
      node = this.parent[node];
    }
    // Reverse in place.
    for (let i = 0, j = count - 1; i < j; i++, j--) {
      const t = raw[i];
      raw[i] = raw[j];
      raw[j] = t;
    }

    const smoothed = this.smooth(raw, count, request);
    this.stats.expansions += this.expansions;
    if (partial) this.stats.partial++;
    else this.stats.completed++;
    request.client.onPathReady(this.points, smoothed, partial);
    this.recycle(request);
  }

  /**
   * String pulling. Keeps a waypoint only when the segment from the last kept one
   * to the next candidate is not walkable, which collapses long open stretches to
   * a single line and leaves corners intact.
   */
  private smooth(raw: Int32Array, count: number, request: Request): number {
    const nav = this.nav;
    if (!nav || count === 0) return 0;
    const layers = this.layers;
    const width = this.width;
    const points = this.points;

    const px = (node: number): number => {
      const l = node % layers;
      const flat = (node - l) / layers;
      const cz = (flat / width) | 0;
      return cellCentreX(nav, flat - cz * width);
    };
    const pz = (node: number): number => {
      const l = node % layers;
      const flat = (node - l) / layers;
      return cellCentreZ(nav, (flat / width) | 0);
    };
    const py = (node: number): number => {
      const l = node % layers;
      const flat = (node - l) / layers;
      const cz = (flat / width) | 0;
      return nav.heightAtCell(flat - cz * width, cz, l);
    };

    let out = 0;
    // Start from the agent's actual position rather than the centre of the cell
    // it happens to occupy, or every path begins with a small sideways jink.
    points[0] = request.fromX;
    points[1] = py(raw[0]);
    points[2] = request.fromZ;
    out = 1;

    let anchorX = request.fromX;
    let anchorZ = request.fromZ;
    let anchorY = points[1];
    let i = 1;
    while (i < count) {
      // Extend as far as the straight line survives.
      let furthest = i;
      for (let j = i; j < count; j++) {
        if (this.segmentClear(anchorX, anchorY, anchorZ, px(raw[j]), py(raw[j]), pz(raw[j]))) {
          furthest = j;
        } else break;
      }
      const node = raw[furthest];
      if (out * 3 + 3 > points.length) break;
      points[out * 3] = px(node);
      points[out * 3 + 1] = py(node);
      points[out * 3 + 2] = pz(node);
      anchorX = points[out * 3];
      anchorY = points[out * 3 + 1];
      anchorZ = points[out * 3 + 2];
      out++;
      i = furthest + 1;
    }

    // Snap the last waypoint onto the requested destination when it is close, so
    // an agent asked to stand on a specific cover slot stands on it.
    if (out > 1) {
      const lastX = points[(out - 1) * 3];
      const lastZ = points[(out - 1) * 3 + 2];
      if (Math.hypot(lastX - request.toX, lastZ - request.toZ) < this.cellSize * 1.6) {
        points[(out - 1) * 3] = request.toX;
        points[(out - 1) * 3 + 2] = request.toZ;
      }
    }
    return out;
  }

  /** Walkability of a straight segment, sampled at half-cell intervals. */
  private segmentClear(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
  ): boolean {
    const nav = this.nav;
    if (!nav) return false;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const length = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(length / (this.cellSize * 0.5)));
    let previous = y0;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      const expected = y0 + (y1 - y0) * t;
      const cx = worldToCellX(nav, x);
      const cz = worldToCellZ(nav, z);
      if (!nav.inside(cx, cz)) return false;
      let found = false;
      for (let l = 0; l < this.layers; l++) {
        if (nav.costAtCell(cx, cz, l) <= 0) continue;
        const h = nav.heightAtCell(cx, cz, l);
        if (Math.abs(h - expected) > navStepUp || Math.abs(h - previous) > navStepUp) continue;
        previous = h;
        found = true;
        break;
      }
      if (!found) return false;
    }
    return true;
  }

  private abandon(): void {
    if (this.active) {
      this.active.client.onPathFailed();
      this.recycle(this.active);
      this.active = null;
    }
    this.open.clear();
  }

  private recycle(request: Request): void {
    if (this.pool.length < 32) this.pool.push(request);
  }
}
