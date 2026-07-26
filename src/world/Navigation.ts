/**
 * Navigation.ts — the cheap runtime query layer behind ILevel.
 *
 * At load it rasterises the map's solids into two grids: a 1 m walkable grid
 * (inflated by the agent radius) for A* pathfinding, and a tall-blocker grid
 * for line-of-sight. AI can therefore path and check sightlines without ever
 * touching mesh raycasts. Cover points are pre-computed once from the grid
 * (every open cell adjacent to a wall) plus the hand-placed cover seeds
 * (sandbags, vehicles, barriers). `isIndoors` is a handful of AABB tests.
 */

import * as THREE from 'three';
import type { CoverPoint } from '../core/Contracts';
import type { CoverSeed, Solid } from './Blockout';

const AGENT_RADIUS = 0.45;
const EYE = 1.5;

export interface NavOptions {
  cell?: number;
  ground: (x: number, z: number) => number | null;
}

interface Node {
  i: number;
  f: number;
}

export class Navigation {
  readonly coverPoints: CoverPoint[] = [];

  private minX: number;
  private minZ: number;
  private cell: number;
  private nx: number;
  private nz: number;
  private blockedNav: Uint8Array;
  private blockedLoS: Uint8Array;
  private ground: (x: number, z: number) => number | null;
  private interiors: THREE.Box3[];

  constructor(bounds: THREE.Box3, solids: Solid[], interiors: THREE.Box3[], opts: NavOptions) {
    this.cell = opts.cell ?? 1;
    this.ground = opts.ground;
    this.interiors = interiors;
    this.minX = Math.floor(bounds.min.x);
    this.minZ = Math.floor(bounds.min.z);
    this.nx = Math.ceil((bounds.max.x - this.minX) / this.cell) + 1;
    this.nz = Math.ceil((bounds.max.z - this.minZ) / this.cell) + 1;
    this.blockedNav = new Uint8Array(this.nx * this.nz);
    this.blockedLoS = new Uint8Array(this.nx * this.nz);
    this.rasterise(solids);
    this.buildCover();
  }

  addSeeds(seeds: CoverSeed[]): void {
    for (const s of seeds) {
      const y = this.ground(s.pos.x, s.pos.z) ?? 0;
      this.coverPoints.push({
        position: new THREE.Vector3(s.pos.x, y + (s.low ? 0.6 : 1.1), s.pos.z),
        normal: s.normal.clone().normalize(),
        low: s.low,
      });
    }
  }

  // -------------------------------------------------------------------------

  private rasterise(solids: Solid[]): void {
    for (const s of solids) {
      const tall = s.maxY - s.minY > 1.6 && s.maxY > EYE;
      // Nav: inflate by agent radius.
      this.mark(this.blockedNav, s.minX - AGENT_RADIUS, s.maxX + AGENT_RADIUS, s.minZ - AGENT_RADIUS, s.maxZ + AGENT_RADIUS);
      if (tall) this.mark(this.blockedLoS, s.minX, s.maxX, s.minZ, s.maxZ);
    }
  }

  private mark(grid: Uint8Array, minX: number, maxX: number, minZ: number, maxZ: number): void {
    const i0 = Math.max(0, Math.floor((minX - this.minX) / this.cell));
    const i1 = Math.min(this.nx - 1, Math.ceil((maxX - this.minX) / this.cell));
    const j0 = Math.max(0, Math.floor((minZ - this.minZ) / this.cell));
    const j1 = Math.min(this.nz - 1, Math.ceil((maxZ - this.minZ) / this.cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[j * this.nx + i] = 1;
  }

  private idx(i: number, j: number): number {
    return j * this.nx + i;
  }

  private cx(x: number): number {
    return Math.round((x - this.minX) / this.cell);
  }

  private cz(z: number): number {
    return Math.round((z - this.minZ) / this.cell);
  }

  private wx(i: number): number {
    return this.minX + i * this.cell;
  }

  private wz(j: number): number {
    return this.minZ + j * this.cell;
  }

  private free(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.nx && j < this.nz && this.blockedNav[this.idx(i, j)] === 0;
  }

  // -------------------------------------------------------------------------
  // Line of sight (2D DDA over the tall-blocker grid)
  // -------------------------------------------------------------------------

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    // If both endpoints are above the tallest occluder, treat as open sky.
    if (from.y > 22 && to.y > 22) return true;
    return this.segmentClear(this.blockedLoS, from.x, from.z, to.x, to.z);
  }

  private segmentClear(grid: Uint8Array, x0: number, z0: number, x1: number, z1: number): boolean {
    let i = this.cx(x0);
    let j = this.cz(z0);
    const iEnd = this.cx(x1);
    const jEnd = this.cz(z1);
    const dx = x1 - x0;
    const dz = z1 - z0;
    const stepI = dx > 0 ? 1 : -1;
    const stepJ = dz > 0 ? 1 : -1;
    const invDx = dx !== 0 ? this.cell / Math.abs(dx) : Infinity;
    const invDz = dz !== 0 ? this.cell / Math.abs(dz) : Infinity;
    // Distance to first boundary.
    let tMaxX = invDx === Infinity ? Infinity : invDx * frac(stepI, (x0 - this.minX) / this.cell);
    let tMaxZ = invDz === Infinity ? Infinity : invDz * frac(stepJ, (z0 - this.minZ) / this.cell);
    let guard = 0;
    const guardMax = this.nx + this.nz + 4;
    while (guard++ < guardMax) {
      if (i >= 0 && j >= 0 && i < this.nx && j < this.nz && grid[this.idx(i, j)] === 1) return false;
      if (i === iEnd && j === jEnd) break;
      if (tMaxX < tMaxZ) {
        tMaxX += invDx;
        i += stepI;
      } else {
        tMaxZ += invDz;
        j += stepJ;
      }
    }
    return true;
  }

  private navSegmentClear(x0: number, z0: number, x1: number, z1: number): boolean {
    // Sampled walkable check used for path string-pulling.
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      if (!this.free(this.cx(x), this.cz(z))) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // A* pathfinding
  // -------------------------------------------------------------------------

  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    const start = this.nearestFree(this.cx(from.x), this.cz(from.z));
    const goal = this.nearestFree(this.cx(to.x), this.cz(to.z));
    if (!start || !goal) return null;
    const [si, sj] = start;
    const [gi, gj] = goal;
    const startIdx = this.idx(si, sj);
    const goalIdx = this.idx(gi, gj);
    if (startIdx === goalIdx) return [to.clone()];

    const n = this.nx * this.nz;
    const came = new Int32Array(n).fill(-1);
    const g = new Float32Array(n).fill(Infinity);
    const closed = new Uint8Array(n);
    g[startIdx] = 0;
    const open: Node[] = [{ i: startIdx, f: this.heur(si, sj, gi, gj) }];

    let iterations = 0;
    const maxIter = 20000;
    while (open.length && iterations++ < maxIter) {
      // Pop lowest f (linear scan — grids here are small enough).
      let best = 0;
      for (let k = 1; k < open.length; k++) if (open[k].f < open[best].f) best = k;
      const cur = open.splice(best, 1)[0];
      if (cur.i === goalIdx) return this.reconstruct(came, cur.i, to);
      if (closed[cur.i]) continue;
      closed[cur.i] = 1;
      const ci = cur.i % this.nx;
      const cj = (cur.i / this.nx) | 0;
      for (let d = 0; d < 8; d++) {
        const ni = ci + DIRS[d][0];
        const nj = cj + DIRS[d][1];
        if (!this.free(ni, nj)) continue;
        // Prevent cutting diagonal corners.
        if (DIRS[d][0] !== 0 && DIRS[d][1] !== 0) {
          if (!this.free(ci + DIRS[d][0], cj) || !this.free(ci, cj + DIRS[d][1])) continue;
        }
        const nIdx = this.idx(ni, nj);
        if (closed[nIdx]) continue;
        const step = DIRS[d][0] !== 0 && DIRS[d][1] !== 0 ? 1.41421 : 1;
        const ng = g[cur.i] + step;
        if (ng < g[nIdx]) {
          g[nIdx] = ng;
          came[nIdx] = cur.i;
          open.push({ i: nIdx, f: ng + this.heur(ni, nj, gi, gj) });
        }
      }
    }
    return null;
  }

  private reconstruct(came: Int32Array, goalIdx: number, to: THREE.Vector3): THREE.Vector3[] {
    const cells: [number, number][] = [];
    let cur = goalIdx;
    while (cur !== -1) {
      cells.push([cur % this.nx, (cur / this.nx) | 0]);
      cur = came[cur];
    }
    cells.reverse();
    // String-pull: keep only waypoints where LoS breaks.
    const pulled: [number, number][] = [];
    let anchor = 0;
    pulled.push(cells[0]);
    for (let i = 2; i < cells.length; i++) {
      const a = cells[anchor];
      const c = cells[i];
      if (!this.navSegmentClear(this.wx(a[0]), this.wz(a[1]), this.wx(c[0]), this.wz(c[1]))) {
        pulled.push(cells[i - 1]);
        anchor = i - 1;
      }
    }
    const out: THREE.Vector3[] = [];
    for (let i = 1; i < pulled.length; i++) {
      const [wi, wj] = pulled[i];
      const x = this.wx(wi);
      const z = this.wz(wj);
      out.push(new THREE.Vector3(x, this.ground(x, z) ?? 0, z));
    }
    out.push(new THREE.Vector3(to.x, this.ground(to.x, to.z) ?? to.y, to.z));
    return out;
  }

  private nearestFree(i: number, j: number): [number, number] | null {
    if (this.free(i, j)) return [i, j];
    for (let r = 1; r < 8; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
          if (this.free(i + di, j + dj)) return [i + di, j + dj];
        }
      }
    }
    return null;
  }

  private heur(i: number, j: number, gi: number, gj: number): number {
    const dx = Math.abs(i - gi);
    const dz = Math.abs(j - gj);
    return (dx + dz) + (1.41421 - 2) * Math.min(dx, dz);
  }

  // -------------------------------------------------------------------------
  // Cover
  // -------------------------------------------------------------------------

  private buildCover(): void {
    const step = 2;
    for (let j = 1; j < this.nz - 1; j += step) {
      for (let i = 1; i < this.nx - 1; i += step) {
        if (!this.free(i, j)) continue;
        // Find an adjacent blocked cell → this open cell is cover against it.
        let bx = 0;
        let bz = 0;
        let found = false;
        for (const [di, dj] of DIRS4) {
          if (!this.free(i + di, j + dj)) {
            bx += di;
            bz += dj;
            found = true;
          }
        }
        if (!found) continue;
        const len = Math.hypot(bx, bz) || 1;
        const nx = -bx / len;
        const nz = -bz / len;
        const x = this.wx(i);
        const z = this.wz(j);
        const y = this.ground(x, z) ?? 0;
        this.coverPoints.push({
          position: new THREE.Vector3(x, y + 1.0, z),
          normal: new THREE.Vector3(nx, 0, nz),
          low: false,
        });
      }
    }
  }

  findCover(from: THREE.Vector3, threat: THREE.Vector3, maxDist = 30): CoverPoint | null {
    let best: CoverPoint | null = null;
    let bestScore = -Infinity;
    const maxDistSq = maxDist * maxDist;
    for (const c of this.coverPoints) {
      const dxf = c.position.x - from.x;
      const dzf = c.position.z - from.z;
      const dist2 = dxf * dxf + dzf * dzf;
      if (dist2 > maxDistSq) continue;
      // The cover's solid must sit between the point and the threat.
      const tx = threat.x - c.position.x;
      const tz = threat.z - c.position.z;
      const tl = Math.hypot(tx, tz) || 1;
      const facing = (tx / tl) * -c.normal.x + (tz / tl) * -c.normal.z;
      // facing>0 means the blocker (behind normal) faces the threat → protected.
      if (facing < 0.25) continue;
      const score = facing * 2 - Math.sqrt(dist2) * 0.06 + (c.low ? 0.3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  // -------------------------------------------------------------------------

  isIndoors(p: THREE.Vector3): boolean {
    for (const b of this.interiors) if (b.containsPoint(p)) return true;
    return false;
  }
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const DIRS4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function frac(step: number, v: number): number {
  return step > 0 ? Math.ceil(v) - v : v - Math.floor(v);
}
