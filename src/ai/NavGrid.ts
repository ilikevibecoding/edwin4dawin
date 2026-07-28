import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { IPhysics, IWorld, RaycastHit } from '../core/Interfaces';

/**
 * Navigation for a level with rooftops.
 *
 * A plain 2D grid cannot represent Al-Rashid Crossing: the market street runs
 * underneath a plank bridge, the souk has a mezzanine, and half the interesting
 * cover is on a roof deck seven metres above a road that is also walkable. So
 * the grid is **layered** — each column of the map holds up to three standing
 * surfaces, discovered by dropping rays through it at build time, and the graph
 * links between layers wherever the height difference is inside a step.
 *
 * Everything after that is conventional and deliberately boring: A* over the
 * link table with an octile heuristic, a string-pulling pass that turns the
 * staircase a grid search produces back into the straight lines a person would
 * walk, and a fixed pool of paths so a firefight never allocates.
 *
 * The search is resumable. `pump` expands a bounded number of nodes and returns;
 * a query across the whole map takes a few frames and nobody notices, which is
 * the entire point — sixteen agents all repathing on the frame a grenade lands
 * must not cost more than one of them repathing on a quiet frame.
 */

/** Metres per cell. Matches the world's own walkability grid pitch. */
export const NAV_CELL = 1.25;

/** Standing surfaces stored per column. */
const MAX_LAYERS = 3;

/**
 * Height difference two linked nodes may have, in metres.
 *
 * This has to stay under the character controller's step height, and the
 * consequence of getting it wrong is not a path that looks slightly wrong — it
 * is a soldier walking into the 0.6 m plinth at the foot of a wall, being
 * ratcheted up it by depenetration, and spending the rest of the match wedged
 * on a ledge while his path insists the route is fine.
 */
const STEP_UP = 0.4;
/** Tighter limit on diagonal links, which cut corners over stairs otherwise. */
const DIAGONAL_STEP = 0.24;
/** Headroom a node needs to be stood in. */
const HEADROOM = 1.75;
/** A surface steeper than this is a wall or a roof pitch, not a floor. */
const MIN_FLOOR_NORMAL = 0.6;
/**
 * Half-width of the corridor a straightened path must have, in metres. A shade
 * over the agent capsule's radius, so the string puller only straightens
 * through gaps a body fits down.
 */
const SHOULDER = 0.42;

const PROBE_MASK = Groups.WORLD | Groups.PROP;

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Cost multiplier for a diagonal move. */
const DIAG = Math.SQRT2;

/**
 * Heights above the higher of two node floors at which a link is ray-tested.
 * The first clears the character controller's step height; the second catches
 * anything with a gap under it.
 */
const CLEARANCE_HEIGHTS = [0.58, 1.36];
/** How far from a node centre the space-around-it star reaches, in metres. */
const CLEARANCE_RADIUS = 0.62;
/** Rays one smoothing pass may spend before it falls back to the grid alone. */
const SMOOTH_PROBE_BUDGET = 150;

const _origin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _up = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _seg = new THREE.Vector3();
const _probe = new THREE.Vector3();

function blankHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
  };
}

/* ------------------------------- paths ---------------------------------- */

/** A pooled path. `count` points are live in `xyz`; the rest is stale. */
export class NavPath {
  readonly xyz = new Float32Array(192 * 3);
  count = 0;
  /** Incremented every time the path is refilled, so agents can spot a swap. */
  revision = 0;
  /** True when the search reached the goal rather than the nearest reachable node. */
  complete = false;
  /** Straight-line length of the smoothed path in metres. */
  length = 0;

  get capacity(): number {
    return this.xyz.length / 3;
  }

  point(i: number, out: THREE.Vector3): THREE.Vector3 {
    const k = i * 3;
    return out.set(this.xyz[k], this.xyz[k + 1], this.xyz[k + 2]);
  }

  clear(): void {
    this.count = 0;
    this.length = 0;
    this.complete = false;
    this.revision++;
  }
}

export type PathStatus = 'idle' | 'queued' | 'searching' | 'ready' | 'failed';

interface Request {
  id: number;
  owner: number;
  startNode: number;
  goalNode: number;
  goalX: number;
  goalY: number;
  goalZ: number;
  path: NavPath;
  status: PathStatus;
}

/* ------------------------------- grid ----------------------------------- */

export interface NavStats {
  cells: number;
  nodes: number;
  links: number;
  rays: number;
  buildMs: number;
  searches: number;
  nodesExpanded: number;
  failures: number;
}

export class NavGrid {
  readonly stats: NavStats = {
    cells: 0,
    nodes: 0,
    links: 0,
    rays: 0,
    buildMs: 0,
    searches: 0,
    nodesExpanded: 0,
    failures: 0,
  };

  private nx = 0;
  private nz = 0;
  private x0 = 0;
  private z0 = 0;
  private topY = 40;
  private bottomY = -8;

  /** First node index in each column, or -1. Nodes in a column go top down. */
  private column!: Int32Array;
  /** Next node in the same column, or -1. */
  private nextInColumn!: Int32Array;

  private nodeY!: Float32Array;
  private nodeCell!: Int32Array;
  /** 8 neighbour node indices per node, -1 where there is no link. */
  private links!: Int32Array;
  /** Extra per-node cost: open ground is 1, hugging a wall is more. */
  private nodeCost!: Float32Array;
  /** Connected component each node belongs to; -1 for a node with no links. */
  private region!: Int32Array;
  /** Node count per component, so the biggest island can be named. */
  private regionSize: number[] = [];
  private nodeCount = 0;
  private capacity = 0;

  /* --------------------------- search state --------------------------- */

  private gScore!: Float32Array;
  private fScore!: Float32Array;
  private cameFrom!: Int32Array;
  private visited!: Int32Array;
  private closed!: Uint8Array;
  private searchStamp = 0;

  /** Binary heap of node indices, ordered by fScore. */
  private heap!: Int32Array;
  private heapSize = 0;

  private hit = blankHit();
  /** Kept from `build` so the string puller can ask the world directly. */
  private physics: IPhysics | null = null;
  /** Rays the current smoothing pass has left to spend. */
  private probeBudget = 0;

  private requests: Request[] = [];
  private queue: Request[] = [];
  private freeRequests: Request[] = [];
  private active: Request | null = null;
  private nextRequestId = 1;
  /** Best node seen this search, so a blocked goal still returns progress. */
  private bestNode = -1;
  private bestHeuristic = Infinity;

  /* ------------------------------ build ------------------------------- */

  /**
   * Drops rays through the level to find every surface a soldier can stand on.
   *
   * The early-out matters more than it looks: over open ground the first hit is
   * the terrain, and there is nothing underneath it worth another full-length
   * ray, so the common column costs exactly one probe and one headroom test.
   * Only building footprints pay for the layer walk.
   */
  build(world: IWorld, physics: IPhysics): void {
    const t0 = now();
    this.physics = physics;
    const b = world.bounds;
    this.x0 = b.min.x;
    this.z0 = b.min.z;
    this.nx = Math.max(1, Math.ceil((b.max.x - b.min.x) / NAV_CELL));
    this.nz = Math.max(1, Math.ceil((b.max.z - b.min.z) / NAV_CELL));
    this.topY = b.max.y + 2;
    this.bottomY = b.min.y - 2;

    const cells = this.nx * this.nz;
    this.stats.cells = cells;
    this.column = new Int32Array(cells).fill(-1);

    this.capacity = cells + (cells >> 1);
    this.nodeY = new Float32Array(this.capacity);
    this.nodeCell = new Int32Array(this.capacity);
    this.nextInColumn = new Int32Array(this.capacity).fill(-1);
    this.nodeCost = new Float32Array(this.capacity);
    this.nodeCount = 0;

    const span = this.topY - this.bottomY;
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const x = this.x0 + (i + 0.5) * NAV_CELL;
        const z = this.z0 + (j + 0.5) * NAV_CELL;
        const cell = j * this.nx + i;
        const ground = world.terrainHeight(x, z);
        let from = this.topY;
        let last = -1;
        for (let layer = 0; layer < MAX_LAYERS; layer++) {
          _origin.set(x, from, z);
          this.stats.rays++;
          if (!physics.raycastInto(_origin, _down, from - this.bottomY, this.hit, PROBE_MASK)) {
            break;
          }
          const y = this.hit.point.y;
          const flat = this.hit.normal.y >= MIN_FLOOR_NORMAL;
          const onGround = Math.abs(y - ground) < 0.35;
          if (flat && this.headroom(physics, x, y, z)) {
            // The ground layer defers to the world's own walkability contract;
            // an upper layer answers for itself, because that query is 2D and
            // would report the street underneath a roof.
            const usable = onGround
              ? world.isWalkable(x, z)
              : y - ground > 1.2 && world.inBounds(_origin.set(x, y + 0.1, z));
            if (usable && this.nodeCount < this.capacity) {
              const n = this.nodeCount++;
              this.nodeY[n] = y;
              this.nodeCell[n] = cell;
              this.nodeCost[n] = 1;
              if (last < 0) this.column[cell] = n;
              else this.nextInColumn[last] = n;
              last = n;
            }
          }
          if (onGround || y <= ground + 0.05) break;
          from = y - 0.3;
          if (from <= this.bottomY + 0.1) break;
        }
        void span;
      }
    }

    this.buildLinks(physics);
    this.buildRegions();
    this.allocSearch();
    this.stats.nodes = this.nodeCount;
    this.stats.buildMs = now() - t0;
  }

  /**
   * Flood fills the link graph into connected components.
   *
   * The clearance pass leaves islands behind — the inside of a locked shop, the
   * top of a container nobody can climb, a strip of pavement fenced off from
   * everything — and the cover system happily hands an agent a wall on one of
   * them. Without this, asking for that path costs a search of the entire rest
   * of the map before A* can conclude there is no route, and the agent is then
   * sent on the hundred-metre walk to the nearest node the search did reach.
   * One integer per node turns both of those into a comparison.
   */
  private buildRegions(): void {
    this.region = new Int32Array(this.nodeCount).fill(-1);
    this.regionSize.length = 0;
    const stack = new Int32Array(this.nodeCount);
    for (let seed = 0; seed < this.nodeCount; seed++) {
      if (this.region[seed] >= 0) continue;
      const id = this.regionSize.length;
      let size = 0;
      let top = 0;
      stack[top++] = seed;
      this.region[seed] = id;
      while (top > 0) {
        const n = stack[--top];
        size++;
        const base = n * 8;
        for (let d = 0; d < 8; d++) {
          const next = this.links[base + d];
          if (next < 0 || this.region[next] >= 0) continue;
          this.region[next] = id;
          stack[top++] = next;
        }
      }
      this.regionSize.push(size);
    }
  }

  /** Component id of the node nearest a world position, or -1. */
  regionAt(x: number, y: number, z: number): number {
    const n = this.nearestNode(x, y, z, 4);
    return n >= 0 ? this.region[n] : -1;
  }

  /** True when a walk from one position to the other exists at all. */
  connected(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const a = this.regionAt(from.x, from.y, from.z);
    if (a < 0) return false;
    return a === this.regionAt(to.x, to.y, to.z);
  }

  private headroom(physics: IPhysics, x: number, y: number, z: number): boolean {
    _origin.set(x, y + 0.25, z);
    this.stats.rays++;
    return !physics.raycastInto(_origin, _up, HEADROOM, this.hit, PROBE_MASK);
  }

  /**
   * Links every node to its eight neighbours, then charges the ones with a
   * blocked side a little more. That surcharge is why agents walk down the
   * middle of a lane instead of scraping along the shopfronts: the shortest
   * path and the sensible path are the same path once the wall costs something.
   *
   * Each orthogonal link is confirmed with two short rays before it is kept.
   * That is the expensive part of the build and it is not optional: the world's
   * walkability grid is a downward probe, so it reports the floor underneath a
   * concrete column as standable ground, and without the horizontal test the
   * graph contains edges that walk through pillars, awning posts and market
   * stall legs. An agent following one of those edges wedges against a column
   * and stays there, which is the single worst thing enemy AI can do.
   */
  private buildLinks(physics: IPhysics): void {
    this.links = new Int32Array(this.nodeCount * 8).fill(-1);
    let count = 0;
    for (let n = 0; n < this.nodeCount; n++) {
      const cell = this.nodeCell[n];
      const i = cell % this.nx;
      const j = (cell - i) / this.nx;
      const y = this.nodeY[n];
      let open = 0;
      for (let d = 0; d < 8; d++) {
        const ni = i + NEIGHBOURS[d][0];
        const nj = j + NEIGHBOURS[d][1];
        if (ni < 0 || nj < 0 || ni >= this.nx || nj >= this.nz) continue;
        const limit = d < 4 ? STEP_UP : DIAGONAL_STEP;
        const target = this.nearestInColumn(nj * this.nx + ni, y, limit);
        if (target < 0) continue;
        // Only the four orthogonals are ray-tested; a diagonal is legal only
        // when both of its orthogonals are, so it inherits their verdict.
        if (d < 4 && !this.linkClear(physics, n, target)) continue;
        this.links[n * 8 + d] = target;
        count++;
        if (d < 4) open++;
      }
      // Corner cutting: a diagonal is only legal when both of its orthogonals
      // are, or agents clip the outside of every doorway.
      for (let d = 4; d < 8; d++) {
        if (this.links[n * 8 + d] < 0) continue;
        const dx = NEIGHBOURS[d][0];
        const dz = NEIGHBOURS[d][1];
        const a = this.links[n * 8 + (dx > 0 ? 0 : 1)];
        const b = this.links[n * 8 + (dz > 0 ? 2 : 3)];
        if (a < 0 || b < 0) {
          this.links[n * 8 + d] = -1;
          count--;
        }
      }
      this.nodeCost[n] = 1 + (4 - open) * 0.55 + this.tightness(physics, n) * 1.9;
    }
    this.stats.links = count;
  }

  /**
   * How boxed in a node is, as a count of blocked directions out of four.
   *
   * Links are tested between cell centres 1.25 m apart, which says nothing
   * about a half-metre pier sitting inside one cell: centre to centre is clear,
   * but a capsule walking that line clips the pier, gets stepped up onto its
   * 0.4 m plinth by the mover, and jams against the taller part behind it. This
   * star of short rays measures the space actually around each node so A* can
   * pay to stay out of it. It is a cost rather than a veto because sometimes
   * the tight cell is the only way through the door.
   */
  private tightness(physics: IPhysics, n: number): number {
    this.positionOf(n, _a);
    _origin.set(_a.x, _a.y + 0.9, _a.z);
    let blocked = 0;
    for (let d = 0; d < 4; d++) {
      _seg.set(NEIGHBOURS[d][0], 0, NEIGHBOURS[d][1]);
      this.stats.rays++;
      if (physics.raycastInto(_origin, _seg, CLEARANCE_RADIUS, this.hit, PROBE_MASK)) blocked++;
    }
    return blocked;
  }

  /**
   * Two rays between neighbouring node centres — one at shin height, above
   * anything the character controller can step over, one at chest height for
   * railings and counters that leave a gap underneath.
   */
  private linkClear(physics: IPhysics, from: number, to: number): boolean {
    this.positionOf(from, _a);
    this.positionOf(to, _b);
    _seg.subVectors(_b, _a);
    const flat = Math.hypot(_seg.x, _seg.z);
    if (flat < 1e-4) return true;
    _seg.set(_seg.x / flat, 0, _seg.z / flat);
    const base = Math.max(_a.y, _b.y);
    for (let k = 0; k < CLEARANCE_HEIGHTS.length; k++) {
      _origin.set(_a.x, base + CLEARANCE_HEIGHTS[k], _a.z);
      this.stats.rays++;
      if (physics.raycastInto(_origin, _seg, flat, this.hit, PROBE_MASK)) return false;
    }
    return true;
  }

  /** True when two nodes are the same or share an edge. */
  private linked(a: number, b: number): boolean {
    if (a === b) return true;
    if (a < 0 || b < 0) return false;
    const base = a * 8;
    for (let d = 0; d < 8; d++) if (this.links[base + d] === b) return true;
    return false;
  }

  private nearestInColumn(cell: number, y: number, limit: number): number {
    let best = -1;
    let bestDy = limit;
    for (let n = this.column[cell]; n >= 0; n = this.nextInColumn[n]) {
      const dy = Math.abs(this.nodeY[n] - y);
      if (dy <= bestDy) {
        bestDy = dy;
        best = n;
      }
    }
    return best;
  }

  private allocSearch(): void {
    const n = Math.max(1, this.nodeCount);
    this.gScore = new Float32Array(n);
    this.fScore = new Float32Array(n);
    this.cameFrom = new Int32Array(n);
    this.visited = new Int32Array(n);
    this.closed = new Uint8Array(n);
    this.heap = new Int32Array(n + 1);
  }

  /* ----------------------------- queries ------------------------------ */

  get ready(): boolean {
    return this.nodeCount > 0;
  }

  get nodes(): number {
    return this.nodeCount;
  }

  cellOf(x: number, z: number): number {
    const i = Math.floor((x - this.x0) / NAV_CELL);
    const j = Math.floor((z - this.z0) / NAV_CELL);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }

  /** Node in this column closest in height to `y`, or -1 when the column is empty. */
  nodeAt(x: number, y: number, z: number): number {
    const cell = this.cellOf(x, z);
    if (cell < 0) return -1;
    let best = -1;
    let bestDy = Infinity;
    for (let n = this.column[cell]; n >= 0; n = this.nextInColumn[n]) {
      const dy = Math.abs(this.nodeY[n] - y);
      if (dy < bestDy) {
        bestDy = dy;
        best = n;
      }
    }
    return best;
  }

  /** True when anything at all connects to this node. */
  private hasLinks(n: number): boolean {
    if (n < 0) return false;
    const base = n * 8;
    for (let d = 0; d < 8; d++) if (this.links[base + d] >= 0) return true;
    return false;
  }

  /**
   * Nearest usable node, searched in growing rings when the column is empty.
   *
   * Isolated nodes are skipped. The clearance pass strands the cells inside
   * columns and under stall counters, and starting a search from one of those
   * means the search fails on its first expansion — the agent is standing next
   * to open ground and the grid tells him there is nowhere to go.
   */
  nearestNode(x: number, y: number, z: number, maxRings = 14, region = -1): number {
    const direct = this.nodeAt(x, y, z);
    if (direct >= 0 && this.hasLinks(direct) && (region < 0 || this.region[direct] === region)) {
      return direct;
    }
    const i0 = Math.floor((x - this.x0) / NAV_CELL);
    const j0 = Math.floor((z - this.z0) / NAV_CELL);
    for (let r = 1; r <= maxRings; r++) {
      let best = -1;
      let bestD = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = i0 + di;
          const j = j0 + dj;
          if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
          const cell = j * this.nx + i;
          for (let n = this.column[cell]; n >= 0; n = this.nextInColumn[n]) {
            if (!this.hasLinks(n)) continue;
            if (region >= 0 && this.region[n] !== region) continue;
            const cx = this.x0 + (i + 0.5) * NAV_CELL;
            const cz = this.z0 + (j + 0.5) * NAV_CELL;
            const dy = this.nodeY[n] - y;
            const d = (cx - x) ** 2 + (cz - z) ** 2 + dy * dy * 4;
            if (d < bestD) {
              bestD = d;
              best = n;
            }
          }
        }
      }
      if (best >= 0) return best;
    }
    return region >= 0 ? -1 : direct;
  }

  /**
   * Somewhere near `from` that a wedged agent can be put down and walk away
   * from: the best-connected neighbour of the node under him, biased toward
   * wherever he was trying to go. Returns false when the grid has nothing.
   */
  escapeSpot(from: THREE.Vector3, toward: THREE.Vector3, out: THREE.Vector3): boolean {
    const node = this.nearestNode(from.x, from.y, from.z, 6);
    if (node < 0) return false;
    let best = -1;
    let bestScore = -Infinity;
    for (let d = 0; d < 8; d++) {
      const next = this.links[node * 8 + d];
      if (next < 0) continue;
      this.positionOf(next, _a);
      // Open ground, away from here, in roughly the right direction.
      const score =
        -this.nodeCost[next] * 2 +
        Math.min(_a.distanceTo(from), 3) -
        _a.distanceTo(toward) * 0.08;
      if (score > bestScore) {
        bestScore = score;
        best = next;
      }
    }
    this.positionOf(best >= 0 ? best : node, out);
    return true;
  }

  positionOf(node: number, out: THREE.Vector3): THREE.Vector3 {
    if (node < 0 || node >= this.nodeCount) return out.set(0, 0, 0);
    const cell = this.nodeCell[node];
    const i = cell % this.nx;
    const j = (cell - i) / this.nx;
    return out.set(
      this.x0 + (i + 0.5) * NAV_CELL,
      this.nodeY[node],
      this.z0 + (j + 0.5) * NAV_CELL,
    );
  }

  heightOf(node: number): number {
    return node >= 0 && node < this.nodeCount ? this.nodeY[node] : 0;
  }

  /** True when a soldier can stand at this exact point. */
  standable(x: number, y: number, z: number, tolerance = 0.55): boolean {
    return this.nodeNear(x, y, z, tolerance) >= 0;
  }

  /** Node in this column within `tolerance` of `y`, closest first, or -1. */
  private nodeNear(x: number, y: number, z: number, tolerance: number): number {
    const cell = this.cellOf(x, z);
    if (cell < 0) return -1;
    let best = -1;
    let bestDy = tolerance;
    for (let n = this.column[cell]; n >= 0; n = this.nextInColumn[n]) {
      const dy = Math.abs(this.nodeY[n] - y);
      if (dy <= bestDy) {
        bestDy = dy;
        best = n;
      }
    }
    return best;
  }

  /**
   * Walks a straight line between two points and reports whether an agent
   * could follow it. Used by the string puller and by the flank scorer.
   *
   * Two things make this stricter than "is every sample on walkable ground".
   * Consecutive samples must land on nodes that are actually linked, so the
   * line cannot pass through a wall the graph knows about; and the corridor
   * must be `SHOULDER` clear either side, so it cannot shave a corner that a
   * point could take and a body cannot. Without both, the string puller
   * straightens a path into a doorframe and the soldier following it grinds
   * there for the rest of the match, insisting he is going the right way.
   */
  segmentClear(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    shoulder = SHOULDER,
  ): boolean {
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-4) return this.standable(ax, ay, az, 0.45);
    const steps = Math.max(1, Math.ceil(dist / (NAV_CELL * 0.4)));
    // Left normal of the segment, for the shoulder offsets.
    const lx = -dz / dist;
    const lz = dx / dist;
    let previous = -1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = ax + dx * t;
      const z = az + dz * t;
      const y = ay + (by - ay) * t;
      const node = this.nodeNear(x, y, z, 0.45);
      if (node < 0) return false;
      if (previous >= 0 && !this.linked(previous, node)) return false;
      previous = node;
      if (shoulder <= 0) continue;
      // The vertical tolerance is looser off to the side: a path along the top
      // of a ramp has shoulders half a step below it and they are still floor.
      const left = this.nodeNear(x + lx * shoulder, y, z + lz * shoulder, 0.75);
      if (left < 0 || !this.linked(node, left)) return false;
      const right = this.nodeNear(x - lx * shoulder, y, z - lz * shoulder, 0.75);
      if (right < 0 || !this.linked(node, right)) return false;
    }
    return true;
  }

  /* ----------------------------- searching ---------------------------- */

  /**
   * Queues a path. The returned handle is the request id; poll `statusOf` and
   * read the `NavPath` the caller supplied once it reports ready.
   */
  request(
    owner: number,
    from: THREE.Vector3,
    to: THREE.Vector3,
    path: NavPath,
  ): number {
    this.cancel(owner);
    const startNode = this.nearestNode(from.x, from.y, from.z);
    if (startNode < 0) {
      path.clear();
      return -1;
    }
    // A goal on another island is not a long walk, it is no walk. Snapping it
    // to the nearest node the agent could actually reach turns "search the
    // entire map, then set off in the wrong direction" into "go as close as
    // the geometry allows"; when there is nothing close, the request fails
    // outright and the caller picks a different destination.
    const island = this.region[startNode];
    let goalNode = this.nearestNode(to.x, to.y, to.z);
    if (goalNode < 0 || this.region[goalNode] !== island) {
      goalNode = this.nearestNode(to.x, to.y, to.z, 5, island);
    }
    if (goalNode < 0) {
      path.clear();
      return -1;
    }
    // Requests are pooled: an agent asks for a path every couple of seconds and
    // sixteen of them would otherwise be a steady drip of garbage.
    const req =
      this.freeRequests.pop() ??
      ({
        id: 0,
        owner: -1,
        startNode: -1,
        goalNode: -1,
        goalX: 0,
        goalY: 0,
        goalZ: 0,
        path,
        status: 'idle',
      } as Request);
    req.id = this.nextRequestId++;
    req.owner = owner;
    req.startNode = startNode;
    req.goalNode = goalNode;
    req.goalX = to.x;
    req.goalY = to.y;
    req.goalZ = to.z;
    req.path = path;
    req.status = 'queued';
    this.requests.push(req);
    this.queue.push(req);
    return req.id;
  }

  private recycle(req: Request): void {
    req.owner = -1;
    req.status = 'idle';
    if (this.freeRequests.length < 64) this.freeRequests.push(req);
  }

  cancel(owner: number): void {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].owner === owner) this.queue.splice(i, 1);
    }
    for (let i = this.requests.length - 1; i >= 0; i--) {
      if (this.requests[i].owner === owner) this.recycle(this.requests.splice(i, 1)[0]);
    }
    if (this.active && this.active.owner === owner) this.active = null;
  }

  statusOf(id: number): PathStatus {
    for (const r of this.requests) if (r.id === id) return r.status;
    return 'idle';
  }

  get pending(): number {
    return this.queue.length + (this.active ? 1 : 0);
  }

  /**
   * Runs searches until the node budget for this frame is spent. Completed
   * requests write their smoothed path and are dropped from the table.
   */
  pump(nodeBudget: number, maxCompletions: number): void {
    let budget = nodeBudget;
    let completed = 0;
    while (budget > 0 && completed < maxCompletions) {
      if (!this.active) {
        const next = this.queue.shift();
        if (!next) break;
        this.active = next;
        next.status = 'searching';
        this.beginSearch(next);
        this.stats.searches++;
      }
      const spent = this.step(this.active, budget);
      budget -= spent;
      if (this.active.status !== 'searching') {
        const done = this.active;
        this.active = null;
        completed++;
        const at = this.requests.indexOf(done);
        if (at >= 0) this.requests.splice(at, 1);
        this.recycle(done);
      }
    }
  }

  private beginSearch(req: Request): void {
    this.searchStamp++;
    this.heapSize = 0;
    this.bestNode = req.startNode;
    this.bestHeuristic = this.heuristic(req.startNode, req.goalNode);
    this.visited[req.startNode] = this.searchStamp;
    this.closed[req.startNode] = 0;
    this.gScore[req.startNode] = 0;
    this.fScore[req.startNode] = this.bestHeuristic;
    this.cameFrom[req.startNode] = -1;
    this.push(req.startNode);
  }

  /** Expands at most `budget` nodes. Returns how many it actually spent. */
  private step(req: Request, budget: number): number {
    let spent = 0;
    while (spent < budget) {
      if (this.heapSize === 0) {
        // Exhausted: hand back the best partial route we found.
        this.finish(req, this.bestNode, false);
        return spent;
      }
      const current = this.pop();
      spent++;
      this.stats.nodesExpanded++;
      if (current === req.goalNode) {
        this.finish(req, current, true);
        return spent;
      }
      if (this.closed[current] === 1) continue;
      this.closed[current] = 1;

      const g = this.gScore[current];
      const base = current * 8;
      for (let d = 0; d < 8; d++) {
        const next = this.links[base + d];
        if (next < 0) continue;
        if (this.visited[next] === this.searchStamp && this.closed[next] === 1) continue;
        const stepCost =
          (d < 4 ? NAV_CELL : NAV_CELL * DIAG) * this.nodeCost[next] +
          Math.abs(this.nodeY[next] - this.nodeY[current]) * 1.4;
        const tentative = g + stepCost;
        if (this.visited[next] !== this.searchStamp) {
          this.visited[next] = this.searchStamp;
          this.closed[next] = 0;
          this.gScore[next] = Infinity;
        }
        if (tentative >= this.gScore[next]) continue;
        this.gScore[next] = tentative;
        this.cameFrom[next] = current;
        const h = this.heuristic(next, req.goalNode);
        this.fScore[next] = tentative + h;
        if (h < this.bestHeuristic) {
          this.bestHeuristic = h;
          this.bestNode = next;
        }
        this.push(next);
      }
    }
    return spent;
  }

  private heuristic(a: number, b: number): number {
    const ca = this.nodeCell[a];
    const cb = this.nodeCell[b];
    const ia = ca % this.nx;
    const ja = (ca - ia) / this.nx;
    const ib = cb % this.nx;
    const jb = (cb - ib) / this.nx;
    const dx = Math.abs(ia - ib);
    const dz = Math.abs(ja - jb);
    const lo = dx < dz ? dx : dz;
    const hi = dx < dz ? dz : dx;
    // Octile distance, plus the climb, so stairs are not free.
    return (
      NAV_CELL * (hi - lo + lo * DIAG) + Math.abs(this.nodeY[a] - this.nodeY[b]) * 1.4
    );
  }

  private finish(req: Request, endNode: number, complete: boolean): void {
    const path = req.path;
    path.clear();
    path.complete = complete;
    if (endNode < 0) {
      req.status = 'failed';
      this.stats.failures++;
      return;
    }

    // Walk the parent chain into the scratch buffer, back to front.
    let n = endNode;
    let count = 0;
    while (n >= 0 && count < RAW_LIMIT) {
      RAW[count * 3] = 0;
      RAW_NODE[count] = n;
      count++;
      const parent = this.cameFrom[n];
      if (parent === n) break;
      n = parent;
    }
    // Reverse into world positions.
    let write = 0;
    for (let i = count - 1; i >= 0; i--) {
      const node = RAW_NODE[i];
      const cell = this.nodeCell[node];
      const ci = cell % this.nx;
      const cj = (cell - ci) / this.nx;
      RAW[write * 3] = this.x0 + (ci + 0.5) * NAV_CELL;
      RAW[write * 3 + 1] = this.nodeY[node];
      RAW[write * 3 + 2] = this.z0 + (cj + 0.5) * NAV_CELL;
      write++;
    }
    // The goal itself, when the search actually got there, so an agent walks to
    // the cover point rather than to the cell centre next to it.
    if (complete && write < RAW_LIMIT) {
      RAW[write * 3] = req.goalX;
      RAW[write * 3 + 1] = req.goalY;
      RAW[write * 3 + 2] = req.goalZ;
      write++;
    }

    this.smooth(RAW, write, path);
    req.status = path.count > 0 ? 'ready' : 'failed';
    if (path.count === 0) this.stats.failures++;
  }

  /**
   * A straightened leg, checked against the world rather than against the grid.
   *
   * The grid is 1.25 m per cell and it cannot see a market stall counter or an
   * awning post that lives inside one cell without blocking its centre. Those
   * are exactly the things a capsule catches on, so the final say belongs to
   * the geometry: three rays down the leg — the centre line and both shoulders
   * — at shin and chest height. Only legs the grid already likes get here, and
   * the budget caps what one path can spend, so a smoothing pass is a couple of
   * dozen rays rather than a search of its own.
   */
  private legClear(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const physics = this.physics;
    if (!physics || this.probeBudget <= 0) return true;
    const dx = bx - ax;
    const dz = bz - az;
    const flat = Math.hypot(dx, dz);
    if (flat < 1e-3) return true;
    _seg.set(dx / flat, 0, dz / flat);
    const lx = -_seg.z * SHOULDER;
    const lz = _seg.x * SHOULDER;
    const base = Math.max(ay, by);
    for (let lane = -1; lane <= 1; lane++) {
      for (let k = 0; k < CLEARANCE_HEIGHTS.length; k++) {
        _probe.set(ax + lx * lane, base + CLEARANCE_HEIGHTS[k], az + lz * lane);
        this.probeBudget--;
        this.stats.rays++;
        if (physics.raycastInto(_probe, _seg, flat, this.hit, PROBE_MASK)) return false;
      }
    }
    return true;
  }

  /**
   * String pulling. Repeatedly extends a straight run as far as it can still be
   * walked, which turns the grid's staircase back into the two or three
   * straight legs a person would actually take.
   */
  private smooth(src: Float32Array, count: number, path: NavPath): void {
    if (count === 0) {
      path.count = 0;
      return;
    }
    this.probeBudget = SMOOTH_PROBE_BUDGET;
    const cap = path.capacity;
    let write = 0;
    const put = (x: number, y: number, z: number): void => {
      if (write >= cap) return;
      path.xyz[write * 3] = x;
      path.xyz[write * 3 + 1] = y;
      path.xyz[write * 3 + 2] = z;
      write++;
    };

    put(src[0], src[1], src[2]);
    let anchor = 0;
    while (anchor < count - 1) {
      let furthest = anchor + 1;
      for (let probe = count - 1; probe > anchor + 1; probe--) {
        const ax = src[anchor * 3];
        const ay = src[anchor * 3 + 1];
        const az = src[anchor * 3 + 2];
        const bx = src[probe * 3];
        const by = src[probe * 3 + 1];
        const bz = src[probe * 3 + 2];
        if (this.segmentClear(ax, ay, az, bx, by, bz) && this.legClear(ax, ay, az, bx, by, bz)) {
          furthest = probe;
          break;
        }
      }
      put(src[furthest * 3], src[furthest * 3 + 1], src[furthest * 3 + 2]);
      anchor = furthest;
    }

    path.count = write;
    let len = 0;
    for (let i = 1; i < write; i++) {
      len += Math.hypot(
        path.xyz[i * 3] - path.xyz[(i - 1) * 3],
        path.xyz[i * 3 + 1] - path.xyz[(i - 1) * 3 + 1],
        path.xyz[i * 3 + 2] - path.xyz[(i - 1) * 3 + 2],
      );
    }
    path.length = len;
    path.revision++;
  }

  /* -------------------------------- heap ------------------------------- */

  private push(node: number): void {
    let i = ++this.heapSize;
    if (i >= this.heap.length) {
      this.heapSize--;
      return;
    }
    this.heap[i] = node;
    const f = this.fScore[node];
    while (i > 1) {
      const parent = i >> 1;
      if (this.fScore[this.heap[parent]] <= f) break;
      this.heap[i] = this.heap[parent];
      i = parent;
    }
    this.heap[i] = node;
  }

  private pop(): number {
    const top = this.heap[1];
    const last = this.heap[this.heapSize--];
    if (this.heapSize > 0) {
      let i = 1;
      const f = this.fScore[last];
      for (;;) {
        let child = i << 1;
        if (child > this.heapSize) break;
        if (child < this.heapSize && this.fScore[this.heap[child + 1]] < this.fScore[this.heap[child]]) {
          child++;
        }
        if (this.fScore[this.heap[child]] >= f) break;
        this.heap[i] = this.heap[child];
        i = child;
      }
      this.heap[i] = last;
    }
    return top;
  }

  /* ------------------------------- debug -------------------------------- */

  /** Every surface in one column, with how connected each one is. */
  inspect(x: number, z: number): Array<{ y: number; links: number; cost: number }> {
    const out: Array<{ y: number; links: number; cost: number }> = [];
    const cell = this.cellOf(x, z);
    if (cell < 0) return out;
    for (let n = this.column[cell]; n >= 0; n = this.nextInColumn[n]) {
      let links = 0;
      for (let d = 0; d < 8; d++) if (this.links[n * 8 + d] >= 0) links++;
      out.push({ y: this.nodeY[n], links, cost: this.nodeCost[n] });
    }
    return out;
  }

  /** Per-column layer counts, for the showcase overlay and the test harness. */
  describe(): Record<string, number> {
    let multi = 0;
    for (let c = 0; c < this.column.length; c++) {
      let n = 0;
      for (let k = this.column[c]; k >= 0; k = this.nextInColumn[k]) n++;
      if (n > 1) multi++;
    }
    return {
      cells: this.stats.cells,
      nodes: this.nodeCount,
      links: this.stats.links,
      multiLayerColumns: multi,
      rays: this.stats.rays,
      buildMs: this.stats.buildMs,
      searches: this.stats.searches,
      nodesExpanded: this.stats.nodesExpanded,
      failures: this.stats.failures,
      cell: NAV_CELL,
    };
  }
}

/** Scratch for the raw (unsmoothed) chain, sized for the worst plausible path. */
const RAW_LIMIT = 4096;
const RAW = new Float32Array(RAW_LIMIT * 3);
const RAW_NODE = new Int32Array(RAW_LIMIT);

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
