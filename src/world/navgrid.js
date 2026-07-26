import * as THREE from 'three';
import { rand, randInt } from '../core/rand.js';

/**
 * Grid-based navigation for AI. The map builder marks obstacle rectangles;
 * we run A* + line-of-sight smoothing.
 */
export class NavGrid {
  constructor(halfExtent = 90, cell = 1.0) {
    this.half = halfExtent;
    this.cell = cell;
    this.n = Math.ceil((halfExtent * 2) / cell);
    this.blocked = new Uint8Array(this.n * this.n);
  }

  idx(ix, iz) { return iz * this.n + ix; }
  toCell(x, z) {
    return [
      THREE.MathUtils.clamp(Math.floor((x + this.half) / this.cell), 0, this.n - 1),
      THREE.MathUtils.clamp(Math.floor((z + this.half) / this.cell), 0, this.n - 1),
    ];
  }
  toWorld(ix, iz) {
    return new THREE.Vector3(
      ix * this.cell - this.half + this.cell / 2, 0,
      iz * this.cell - this.half + this.cell / 2
    );
  }

  /** Mark a world-space rectangle as blocked (with margin for agent radius). */
  blockRect(cx, cz, sx, sz, margin = 0.55) {
    const x0 = cx - sx / 2 - margin, x1 = cx + sx / 2 + margin;
    const z0 = cz - sz / 2 - margin, z1 = cz + sz / 2 + margin;
    const [ix0, iz0] = this.toCell(x0, z0);
    const [ix1, iz1] = this.toCell(x1, z1);
    for (let iz = iz0; iz <= iz1; iz++)
      for (let ix = ix0; ix <= ix1; ix++)
        this.blocked[this.idx(ix, iz)] = 1;
  }

  blockCircle(cx, cz, r, margin = 0.55) {
    const rr = r + margin;
    const [ix0, iz0] = this.toCell(cx - rr, cz - rr);
    const [ix1, iz1] = this.toCell(cx + rr, cz + rr);
    for (let iz = iz0; iz <= iz1; iz++)
      for (let ix = ix0; ix <= ix1; ix++) {
        const w = this.toWorld(ix, iz);
        if ((w.x - cx) ** 2 + (w.z - cz) ** 2 <= rr * rr) this.blocked[this.idx(ix, iz)] = 1;
      }
  }

  isWalkable(x, z) {
    const [ix, iz] = this.toCell(x, z);
    return !this.blocked[this.idx(ix, iz)];
  }

  nearestWalkable(x, z, maxR = 12) {
    if (this.isWalkable(x, z)) return new THREE.Vector3(x, 0, z);
    const [ix, iz] = this.toCell(x, z);
    for (let r = 1; r < maxR / this.cell; r++) {
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const jx = ix + dx, jz = iz + dz;
          if (jx < 0 || jz < 0 || jx >= this.n || jz >= this.n) continue;
          if (!this.blocked[this.idx(jx, jz)]) return this.toWorld(jx, jz);
        }
    }
    return new THREE.Vector3(x, 0, z);
  }

  randomPoint(centerX = 0, centerZ = 0, radius = this.half * 0.9) {
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      const x = centerX + Math.cos(a) * r;
      const z = centerZ + Math.sin(a) * r;
      if (Math.abs(x) < this.half - 2 && Math.abs(z) < this.half - 2 && this.isWalkable(x, z)) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    return new THREE.Vector3(centerX, 0, centerZ);
  }

  /** Bresenham LOS between cells. */
  losCells(ax, az, bx, bz) {
    let x0 = ax, z0 = az;
    const dx = Math.abs(bx - ax), dz = Math.abs(bz - az);
    const sx = ax < bx ? 1 : -1, sz = az < bz ? 1 : -1;
    let err = dx - dz;
    while (true) {
      if (this.blocked[this.idx(x0, z0)]) return false;
      if (x0 === bx && z0 === bz) return true;
      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; }
      if (e2 < dx) { err += dx; z0 += sz; }
    }
  }

  /** A* path. Returns array of Vector3 (y=0) or null. */
  findPath(from, to, maxExpand = 9000) {
    const [sx, sz] = this.toCell(from.x, from.z);
    const [txRaw, tzRaw] = this.toCell(to.x, to.z);
    let tx = txRaw, tz = tzRaw;
    if (this.blocked[this.idx(tx, tz)]) {
      const w = this.nearestWalkable(to.x, to.z);
      [tx, tz] = this.toCell(w.x, w.z);
    }
    if (this.blocked[this.idx(sx, sz)]) {
      // stuck inside an obstacle margin — allow escaping
    }
    const n = this.n;
    const open = new MinHeap();
    const came = new Int32Array(n * n).fill(-1);
    const gScore = new Float32Array(n * n).fill(Infinity);
    const startI = this.idx(sx, sz), goalI = this.idx(tx, tz);
    gScore[startI] = 0;
    open.push(startI, 0);
    const h = (i) => {
      const ix = i % n, iz = (i / n) | 0;
      return Math.hypot(ix - tx, iz - tz);
    };
    let expand = 0;
    const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
    while (open.size) {
      const cur = open.pop();
      if (cur === goalI) return this._reconstruct(came, cur, sx, sz);
      if (++expand > maxExpand) break;
      const cx = cur % n, cz = (cur / n) | 0;
      for (const [dx, dz, cost] of DIRS) {
        const jx = cx + dx, jz = cz + dz;
        if (jx < 0 || jz < 0 || jx >= n || jz >= n) continue;
        const j = jz * n + jx;
        if (this.blocked[j] && j !== startI) continue;
        // prevent diagonal corner cutting
        if (dx !== 0 && dz !== 0 && (this.blocked[cz * n + jx] || this.blocked[jz * n + cx])) continue;
        const g = gScore[cur] + cost;
        if (g < gScore[j]) {
          gScore[j] = g;
          came[j] = cur;
          open.push(j, g + h(j));
        }
      }
    }
    return null;
  }

  _reconstruct(came, cur, sx, sz) {
    const n = this.n;
    const cells = [];
    while (cur !== -1) {
      cells.push([cur % n, (cur / n) | 0]);
      cur = came[cur];
    }
    cells.reverse();
    // LOS smoothing
    const pts = [];
    let i = 0;
    pts.push(cells[0]);
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      for (; j > i + 1; j--) {
        if (this.losCells(cells[i][0], cells[i][1], cells[j][0], cells[j][1])) break;
      }
      pts.push(cells[j]);
      i = j;
    }
    return pts.map(([ix, iz]) => this.toWorld(ix, iz));
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    this.k.push(key); this.p.push(pri);
    let i = this.k.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.p[par] <= this.p[i]) break;
      this._swap(i, par); i = par;
    }
  }
  pop() {
    const top = this.k[0];
    const lk = this.k.pop(), lp = this.p.pop();
    if (this.k.length) {
      this.k[0] = lk; this.p[0] = lp;
      let i = 0;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        this._swap(i, m); i = m;
      }
    }
    return top;
  }
  _swap(a, b) {
    [this.k[a], this.k[b]] = [this.k[b], this.k[a]];
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
  }
}
