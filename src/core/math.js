import * as THREE from 'three';

/** Deterministic seeded RNG (mulberry32). */
export function makeRNG(seed = 1337) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.spread = (n) => (rng() - 0.5) * 2 * n;
  return rng;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const DEG = Math.PI / 180;

/** Expanding AABB list used for player/enemy collision & hitscan occlusion. */
export class ColliderSet {
  constructor() {
    this.boxes = [];   // { min:Vector3, max:Vector3, tag }
  }
  addBox(cx, cy, cz, sx, sy, sz, tag = 'world') {
    this.boxes.push({
      min: new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      max: new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
      tag,
    });
  }
  addFromObject(obj, tag = 'world') {
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) this.boxes.push({ min: box.min.clone(), max: box.max.clone(), tag });
  }

  /** Resolve a capsule (position at feet, radius r, height h) against all boxes. Returns grounded flag. */
  resolveCapsule(pos, r, h, vel) {
    let grounded = false;
    for (const b of this.boxes) {
      // Broad phase
      if (pos.x + r < b.min.x || pos.x - r > b.max.x) continue;
      if (pos.z + r < b.min.z || pos.z - r > b.max.z) continue;
      if (pos.y > b.max.y || pos.y + h < b.min.y) continue;

      // Determine minimal push axis (horizontal push or land on top)
      const cx = clamp(pos.x, b.min.x, b.max.x);
      const cz = clamp(pos.z, b.min.z, b.max.z);
      const dx = pos.x - cx, dz = pos.z - cz;
      const distSq = dx * dx + dz * dz;

      const topPen = b.max.y - pos.y;
      const canStep = topPen >= 0 && topPen <= 0.55 && vel.y <= 0.01;

      if (distSq < r * r) {
        if (canStep && topPen < 0.55) {
          // Land / step onto the box top
          pos.y = b.max.y;
          if (vel.y < 0) vel.y = 0;
          grounded = true;
          continue;
        }
        if (distSq > 1e-8) {
          const d = Math.sqrt(distSq);
          const push = (r - d);
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // Deep inside: push out along smallest horizontal penetration
          const pxMin = (pos.x - b.min.x) + r, pxMax = (b.max.x - pos.x) + r;
          const pzMin = (pos.z - b.min.z) + r, pzMax = (b.max.z - pos.z) + r;
          const m = Math.min(pxMin, pxMax, pzMin, pzMax);
          if (m === pxMin) pos.x = b.min.x - r;
          else if (m === pxMax) pos.x = b.max.x + r;
          else if (m === pzMin) pos.z = b.min.z - r;
          else pos.z = b.max.z + r;
        }
      }
    }
    return grounded;
  }

  /** Ray vs boxes; returns nearest hit { t, point, normal } or null. Ray dir must be normalized. */
  raycast(origin, dir, maxDist = 1000) {
    let best = null;
    const inv = new THREE.Vector3(1 / dir.x, 1 / dir.y, 1 / dir.z);
    for (const b of this.boxes) {
      let tmin = (b.min.x - origin.x) * inv.x, tmax = (b.max.x - origin.x) * inv.x;
      if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
      let tymin = (b.min.y - origin.y) * inv.y, tymax = (b.max.y - origin.y) * inv.y;
      if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
      if (tmin > tymax || tymin > tmax) continue;
      tmin = Math.max(tmin, tymin); tmax = Math.min(tmax, tymax);
      let tzmin = (b.min.z - origin.z) * inv.z, tzmax = (b.max.z - origin.z) * inv.z;
      if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
      if (tmin > tzmax || tzmin > tmax) continue;
      tmin = Math.max(tmin, tzmin);
      if (tmin < 0 || tmin > maxDist) continue;
      if (!best || tmin < best.t) {
        const point = origin.clone().addScaledVector(dir, tmin);
        // Compute normal from nearest face
        const eps = 1e-3;
        const n = new THREE.Vector3();
        if (Math.abs(point.x - b.min.x) < eps) n.set(-1, 0, 0);
        else if (Math.abs(point.x - b.max.x) < eps) n.set(1, 0, 0);
        else if (Math.abs(point.y - b.min.y) < eps) n.set(0, -1, 0);
        else if (Math.abs(point.y - b.max.y) < eps) n.set(0, 1, 0);
        else if (Math.abs(point.z - b.min.z) < eps) n.set(0, 0, -1);
        else n.set(0, 0, 1);
        best = { t: tmin, point, normal: n, tag: b.tag };
      }
    }
    return best;
  }

  /** Line-of-sight check between two points (with small vertical offsets applied by caller). */
  hasLOS(a, b) {
    const dir = b.clone().sub(a);
    const dist = dir.length();
    if (dist < 1e-4) return true;
    dir.normalize();
    const hit = this.raycast(a, dir, dist - 0.05);
    return !hit;
  }
}

/** Simple grid A* for enemy navigation. Walkable grid baked from colliders. */
export class NavGrid {
  constructor(halfSize, cell) {
    this.half = halfSize; this.cell = cell;
    this.n = Math.floor((halfSize * 2) / cell);
    this.walk = new Uint8Array(this.n * this.n).fill(1);
  }
  idx(ix, iz) { return iz * this.n + ix; }
  toGrid(x, z) {
    return [
      clamp(Math.floor((x + this.half) / this.cell), 0, this.n - 1),
      clamp(Math.floor((z + this.half) / this.cell), 0, this.n - 1),
    ];
  }
  toWorld(ix, iz) {
    return [ (ix + 0.5) * this.cell - this.half, (iz + 0.5) * this.cell - this.half ];
  }
  bake(colliders, agentRadius = 0.5) {
    for (const b of colliders.boxes) {
      if (b.min.y > 1.4) continue;         // overhead geometry doesn't block
      if (b.max.y < 0.4) continue;          // low curbs / debris are walkable
      const [ix0, iz0] = this.toGrid(b.min.x - agentRadius, b.min.z - agentRadius);
      const [ix1, iz1] = this.toGrid(b.max.x + agentRadius, b.max.z + agentRadius);
      for (let iz = iz0; iz <= iz1; iz++)
        for (let ix = ix0; ix <= ix1; ix++)
          this.walk[this.idx(ix, iz)] = 0;
    }
  }
  isWalkable(x, z) {
    const [ix, iz] = this.toGrid(x, z);
    return this.walk[this.idx(ix, iz)] === 1;
  }
  /** A* path from world (ax,az) to (bx,bz). Returns array of [x,z] or null. */
  findPath(ax, az, bx, bz, maxIter = 4000) {
    const [sx, sz] = this.toGrid(ax, az);
    const [gx, gz] = this.toGrid(bx, bz);
    if (sx === gx && sz === gz) return [[bx, bz]];
    const n = this.n;
    const open = new Map(); const closed = new Set();
    const startK = this.idx(sx, sz);
    open.set(startK, { ix: sx, iz: sz, g: 0, f: 0, parent: null });
    const h = (ix, iz) => Math.abs(ix - gx) + Math.abs(iz - gz);
    let iter = 0;
    let goal = null;
    while (open.size && iter++ < maxIter) {
      let bestK = null, bestF = Infinity;
      for (const [k, node] of open) if (node.f < bestF) { bestF = node.f; bestK = k; }
      const cur = open.get(bestK); open.delete(bestK); closed.add(bestK);
      if (cur.ix === gx && cur.iz === gz) { goal = cur; break; }
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cur.ix + dx, nz = cur.iz + dz;
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        if (!this.walk[this.idx(nx, nz)]) continue;
        if (dx && dz) { // diagonal: forbid corner cutting
          if (!this.walk[this.idx(cur.ix + dx, cur.iz)] || !this.walk[this.idx(cur.ix, cur.iz + dz)]) continue;
        }
        const k = this.idx(nx, nz);
        if (closed.has(k)) continue;
        const g = cur.g + ((dx && dz) ? 1.414 : 1);
        const prev = open.get(k);
        if (!prev || g < prev.g) open.set(k, { ix: nx, iz: nz, g, f: g + h(nx, nz), parent: cur });
      }
    }
    if (!goal) return null;
    const path = [];
    let node = goal;
    while (node) { path.push(this.toWorld(node.ix, node.iz)); node = node.parent; }
    path.reverse();
    path[path.length - 1] = [bx, bz];
    // Smooth: drop intermediate nodes on straight lines
    const out = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const a = out[out.length - 1], b2 = path[i], c = path[i + 1];
      const d1x = b2[0] - a[0], d1z = b2[1] - a[1];
      const d2x = c[0] - b2[0], d2z = c[1] - b2[1];
      if (Math.abs(d1x * d2z - d1z * d2x) > 1e-4) out.push(b2);
    }
    out.push(path[path.length - 1]);
    return out;
  }
}
