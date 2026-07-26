import * as THREE from 'three';
import type { CollisionWorld } from '../world/collision';
import { MAP_BOUNDS } from '../world/layout';

/**
 * Navigation grid (Opus 3): layered 0.5 m cells sampled from collision,
 * supporting both floors and stairs, with A* and line-of-sight smoothing.
 */

const CELL = 0.5;
const AGENT_R = 0.32;
const AGENT_H = 1.72;
const MAX_STEP = 0.42;

interface NavNode {
  idx: number;
  ix: number;
  iz: number;
  y: number;
  neighbors: number[];
  costs: number[];
}

export class NavGrid {
  nodes: NavNode[] = [];
  private byCell = new Map<string, number[]>(); // `${ix},${iz}` → node idxs (layers)
  private col: CollisionWorld;
  private w: number;
  private h: number;

  constructor(col: CollisionWorld) {
    this.col = col;
    this.w = Math.ceil((MAP_BOUNDS.maxX - MAP_BOUNDS.minX) / CELL);
    this.h = Math.ceil((MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ) / CELL);
    this.build();
  }

  private build(): void {
    const probe = new THREE.Vector3();
    // sample candidate floor heights per cell from two "drop" heights (upper & ground)
    for (let iz = 0; iz < this.h; iz++) {
      for (let ix = 0; ix < this.w; ix++) {
        const x = MAP_BOUNDS.minX + (ix + 0.5) * CELL;
        const z = MAP_BOUNDS.minZ + (iz + 0.5) * CELL;
        const heights: number[] = [];
        for (const fromY of [7.4, 3.15]) {
          const fy = this.col.floorHeight(x, z, fromY, -0.5);
          if (fy === null) continue;
          if (heights.every((hh) => Math.abs(hh - fy) > 0.8)) heights.push(fy);
        }
        for (const y of heights) {
          probe.set(x, y + 0.03, z);
          if (!this.col.capsuleFits(probe, AGENT_R, AGENT_H, ['door:', 'shutter:'])) continue;
          const idx = this.nodes.length;
          this.nodes.push({ idx, ix, iz, y, neighbors: [], costs: [] });
          const key = `${ix},${iz}`;
          const arr = this.byCell.get(key);
          if (arr) arr.push(idx);
          else this.byCell.set(key, [idx]);
        }
      }
    }
    // connect neighbors
    const DIRS = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    ];
    for (const node of this.nodes) {
      for (const [dx, dz, cost] of DIRS) {
        const targets = this.byCell.get(`${node.ix + dx},${node.iz + dz}`);
        if (!targets) continue;
        for (const ti of targets) {
          const t = this.nodes[ti];
          if (Math.abs(t.y - node.y) > MAX_STEP) continue;
          if (dx !== 0 && dz !== 0) {
            // diagonal needs both cardinals passable at compatible heights
            const a = this.nodeAt(node.ix + dx, node.iz, node.y);
            const b = this.nodeAt(node.ix, node.iz + dz, node.y);
            if (!a || !b) continue;
          }
          node.neighbors.push(ti);
          node.costs.push(cost + Math.abs(t.y - node.y) * 1.5);
        }
      }
    }
  }

  private nodeAt(ix: number, iz: number, nearY: number): NavNode | null {
    const arr = this.byCell.get(`${ix},${iz}`);
    if (!arr) return null;
    let best: NavNode | null = null;
    for (const i of arr) {
      const n = this.nodes[i];
      if (Math.abs(n.y - nearY) <= MAX_STEP && (!best || Math.abs(n.y - nearY) < Math.abs(best.y - nearY))) best = n;
    }
    return best;
  }

  worldOf(n: NavNode, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(MAP_BOUNDS.minX + (n.ix + 0.5) * CELL, n.y, MAP_BOUNDS.minZ + (n.iz + 0.5) * CELL);
  }

  nearest(pos: THREE.Vector3, maxRadius = 3): NavNode | null {
    const cx = Math.floor((pos.x - MAP_BOUNDS.minX) / CELL);
    const cz = Math.floor((pos.z - MAP_BOUNDS.minZ) / CELL);
    let best: NavNode | null = null;
    let bestD = Infinity;
    const r = Math.ceil(maxRadius / CELL);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const arr = this.byCell.get(`${cx + dx},${cz + dz}`);
        if (!arr) continue;
        for (const i of arr) {
          const n = this.nodes[i];
          const dy = Math.abs(n.y - pos.y);
          if (dy > 1.4) continue;
          const d = dx * dx + dz * dz + dy * dy * 8;
          if (d < bestD) {
            bestD = d;
            best = n;
          }
        }
      }
    }
    return best;
  }

  /** A* path; returns world waypoints (excluding start), or null. */
  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    const start = this.nearest(from);
    const goal = this.nearest(to);
    if (!start || !goal) return null;
    if (start.idx === goal.idx) return [this.worldOf(goal)];

    const n = this.nodes.length;
    const gScore = new Float32Array(n).fill(Infinity);
    const fScore = new Float32Array(n).fill(Infinity);
    const cameFrom = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const gx = goal.ix, gz = goal.iz;
    const hOf = (node: NavNode): number => {
      const dx = node.ix - gx, dz = node.iz - gz;
      return Math.sqrt(dx * dx + dz * dz) + Math.abs(node.y - goal.y) * 2;
    };
    // binary heap
    const heap: number[] = [start.idx];
    const heapF: number[] = [hOf(start)];
    gScore[start.idx] = 0;
    fScore[start.idx] = heapF[0];
    const push = (idx: number, f: number): void => {
      heap.push(idx);
      heapF.push(f);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heapF[p] <= heapF[i]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        [heapF[p], heapF[i]] = [heapF[i], heapF[p]];
        i = p;
      }
    };
    const pop = (): number => {
      const top = heap[0];
      const lastIdx = heap.pop()!;
      const lastF = heapF.pop()!;
      if (heap.length > 0) {
        heap[0] = lastIdx;
        heapF[0] = lastF;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heapF[l] < heapF[m]) m = l;
          if (r < heap.length && heapF[r] < heapF[m]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          [heapF[m], heapF[i]] = [heapF[i], heapF[m]];
          i = m;
        }
      }
      return top;
    };

    let found = false;
    let guard = 0;
    while (heap.length > 0 && guard++ < 60000) {
      const cur = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal.idx) {
        found = true;
        break;
      }
      const node = this.nodes[cur];
      for (let k = 0; k < node.neighbors.length; k++) {
        const nb = node.neighbors[k];
        if (closed[nb]) continue;
        const tentative = gScore[cur] + node.costs[k];
        if (tentative < gScore[nb]) {
          gScore[nb] = tentative;
          cameFrom[nb] = cur;
          const f = tentative + hOf(this.nodes[nb]);
          fScore[nb] = f;
          push(nb, f);
        }
      }
    }
    if (!found) return null;

    const idxPath: number[] = [];
    let cur = goal.idx;
    while (cur !== -1) {
      idxPath.push(cur);
      cur = cameFrom[cur];
    }
    idxPath.reverse();

    // smoothing: greedy LOS shortcuts on same-ish level
    const pts = idxPath.map((i) => this.worldOf(this.nodes[i]));
    const smoothed: THREE.Vector3[] = [];
    let anchor = 0;
    smoothed.push(pts[0]);
    while (anchor < pts.length - 1) {
      let far = anchor + 1;
      for (let j = pts.length - 1; j > anchor + 1; j--) {
        if (Math.abs(pts[j].y - pts[anchor].y) < 0.3 && this.segmentWalkable(pts[anchor], pts[j])) {
          far = j;
          break;
        }
      }
      smoothed.push(pts[far]);
      anchor = far;
    }
    smoothed.push(to.clone().setY(pts[pts.length - 1].y));
    return smoothed.slice(1);
  }

  private segmentWalkable(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dist = a.distanceTo(b);
    if (dist > 12) return false;
    const steps = Math.ceil(dist / 0.4);
    const p = new THREE.Vector3();
    for (let i = 1; i < steps; i++) {
      p.lerpVectors(a, b, i / steps);
      const fh = this.col.floorHeight(p.x, p.z, a.y + 0.6, a.y - 0.6);
      if (fh === null || Math.abs(fh - a.y) > 0.35) return false;
      p.y = fh + 0.03;
      if (!this.col.capsuleFits(p, AGENT_R, AGENT_H, ['door:', 'shutter:'])) return false;
    }
    return true;
  }

  /** random reachable node near a position (search behavior) */
  randomNear(pos: THREE.Vector3, radius: number, rand: () => number): THREE.Vector3 | null {
    for (let tries = 0; tries < 10; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 1 + rand() * radius;
      const p = new THREE.Vector3(pos.x + Math.cos(a) * r, pos.y, pos.z + Math.sin(a) * r);
      const n = this.nearest(p, 1.5);
      if (n) return this.worldOf(n);
    }
    return null;
  }

  get size(): number {
    return this.nodes.length;
  }
}
