// Collision world: static + dynamic AABBs with a uniform XZ grid broadphase.
// Every collider: { min:{x,y,z}, max:{x,y,z}, material:'drywall'|..., tag:'wall'|'floor'|'door'|'prop'|...,
//                   blockSight?:bool, blockMove?:bool, blockShot?:bool, thin?:number, ref?:object }
const CELL = 2.0;

export class CollisionWorld {
  constructor() {
    this.colliders = [];
    this.grid = new Map(); // "cx,cz" -> array of colliders
    this.dynamicSet = new Set();
  }

  _cellsFor(min, max) {
    const cells = [];
    const x0 = Math.floor(min.x / CELL), x1 = Math.floor(max.x / CELL);
    const z0 = Math.floor(min.z / CELL), z1 = Math.floor(max.z / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) cells.push(cx + ',' + cz);
    return cells;
  }

  add(c) {
    c.blockMove = c.blockMove !== false;
    c.blockShot = c.blockShot !== false;
    c.blockSight = c.blockSight !== false;
    this.colliders.push(c);
    for (const key of this._cellsFor(c.min, c.max)) {
      let arr = this.grid.get(key);
      if (!arr) { arr = []; this.grid.set(key, arr); }
      arr.push(c);
    }
    if (c.dynamic) this.dynamicSet.add(c);
    return c;
  }

  remove(c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    for (const key of this._cellsFor(c.min, c.max)) {
      const arr = this.grid.get(key);
      if (arr) { const j = arr.indexOf(c); if (j >= 0) arr.splice(j, 1); }
    }
    this.dynamicSet.delete(c);
  }

  updateBounds(c, min, max) {
    // Re-bucket a dynamic collider (doors).
    this.remove(c);
    c.min = min; c.max = max;
    this.add(c);
  }

  query(min, max, out = []) {
    out.length = 0;
    const seen = new Set();
    for (const key of this._cellsFor(min, max)) {
      const arr = this.grid.get(key);
      if (!arr) continue;
      for (const c of arr) {
        if (seen.has(c)) continue;
        seen.add(c);
        if (c.min.x < max.x && c.max.x > min.x && c.min.y < max.y && c.max.y > min.y && c.min.z < max.z && c.max.z > min.z) {
          out.push(c);
        }
      }
    }
    return out;
  }

  // Ray vs world. filter(c) -> bool decides whether a collider participates.
  // Returns { t, point:{x,y,z}, normal:{x,y,z}, collider } or null.
  raycast(ox, oy, oz, dx, dy, dz, maxDist, filter = null) {
    let best = null, bestT = maxDist;
    // Walk XZ cells with DDA; ray tested against each cell's contents.
    const inv = (v) => (v === 0 ? Infinity : 1 / v);
    const idx = inv(dx), idz = inv(dz);
    let cx = Math.floor(ox / CELL), cz = Math.floor(oz / CELL);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    let tMaxX = dx !== 0 ? ((cx + (dx > 0 ? 1 : 0)) * CELL - ox) * idx : Infinity;
    let tMaxZ = dz !== 0 ? ((cz + (dz > 0 ? 1 : 0)) * CELL - oz) * idz : Infinity;
    const tDeltaX = Math.abs(CELL * idx), tDeltaZ = Math.abs(CELL * idz);
    const tested = new Set();
    let t = 0;
    for (let iter = 0; iter < 400 && t <= bestT; iter++) {
      const arr = this.grid.get(cx + ',' + cz);
      if (arr) {
        for (const c of arr) {
          if (tested.has(c)) continue;
          tested.add(c);
          if (filter && !filter(c)) continue;
          const hit = rayAABB(ox, oy, oz, dx, dy, dz, c.min, c.max, bestT);
          if (hit && hit.t < bestT) { bestT = hit.t; best = { ...hit, collider: c }; }
        }
      }
      if (tMaxX < tMaxZ) { t = tMaxX; cx += stepX; tMaxX += tDeltaX; }
      else { t = tMaxZ; cz += stepZ; tMaxZ += tDeltaZ; }
      if (t > maxDist) break;
    }
    return best;
  }
}

export function rayAABB(ox, oy, oz, dx, dy, dz, min, max, maxDist = Infinity) {
  let tmin = 0, tmax = maxDist;
  let nAxis = -1, nSign = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  const mn = [min.x, min.y, min.z], mx = [max.x, max.y, max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (mn[i] - o[i]) * inv, t2 = (mx[i] - o[i]) * inv;
      let sign = -1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; sign = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = i; nSign = sign; }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (tmin <= 0 || tmin > maxDist) return null;
  const normal = { x: 0, y: 0, z: 0 };
  if (nAxis === 0) normal.x = nSign; else if (nAxis === 1) normal.y = nSign; else if (nAxis === 2) normal.z = nSign;
  return { t: tmin, point: { x: ox + dx * tmin, y: oy + dy * tmin, z: oz + dz * tmin }, normal };
}

// Capsule-as-box character mover with per-axis clamping and step-up.
// pos = feet position (y at floor). Returns { pos, onGround, hitWall, hitHead }.
const _q = [];
export function moveCharacter(world, pos, radius, height, delta, { stepHeight = 0.35, filter = null } = {}) {
  const p = { x: pos.x, y: pos.y, z: pos.z };
  const flags = { onGround: false, hitWall: false, hitHead: false };
  const eps = 0.001;

  const collide = (axis, dist) => {
    if (dist === 0) return 0;
    p[axis] += dist;
    const min = { x: p.x - radius, y: p.y + eps, z: p.z - radius };
    const max = { x: p.x + radius, y: p.y + height - eps, z: p.z + radius };
    world.query(min, max, _q);
    let clamped = dist;
    for (const c of _q) {
      if (!c.blockMove) continue;
      if (filter && !filter(c)) continue;
      if (axis === 'y') {
        if (dist < 0) { p.y = c.max.y; flags.onGround = true; }
        else { p.y = c.min.y - height; flags.hitHead = true; }
      } else {
        const half = radius;
        if (dist > 0) p[axis] = c.min[axis] - half - eps;
        else p[axis] = c.max[axis] + half + eps;
        flags.hitWall = true;
      }
      clamped = 0;
      // recompute overlap box after clamp for the remaining colliders
      min.x = p.x - radius; min.y = p.y + eps; min.z = p.z - radius;
      max.x = p.x + radius; max.y = p.y + height - eps; max.z = p.z + radius;
    }
    return clamped;
  };

  // Horizontal with step-up assist
  for (const axis of ['x', 'z']) {
    const want = delta[axis];
    if (want === 0) continue;
    const before = p[axis];
    collide(axis, want);
    const moved = Math.abs(p[axis] - before);
    if (flags.hitWall && moved < Math.abs(want) - eps) {
      // try step-up: lift, retry remaining distance, settle down
      const remaining = want - (p[axis] - before);
      const py0 = p.y;
      const up = tryVertical(world, p, radius, height, stepHeight, filter);
      if (up > 0.01) {
        p.y = py0 + up;
        collide(axis, remaining);
        // settle back down
        const down = tryVertical(world, p, radius, height, -(up + 0.02), filter);
        p.y += down;
        if (Math.abs(down + up) < 0.005) flags.onGround = true;
      }
    }
  }
  // Vertical
  const preY = delta.y;
  collide('y', preY);
  return { pos: p, ...flags };
}

function tryVertical(world, p, radius, height, dist, filter) {
  // How far can we move vertically without penetration? Returns achievable signed distance.
  const eps = 0.001;
  let lo = 0, hi = dist;
  const fits = (dy) => {
    const min = { x: p.x - radius, y: p.y + dy + eps, z: p.z - radius };
    const max = { x: p.x + radius, y: p.y + dy + height - eps, z: p.z + radius };
    world.query(min, max, _q);
    for (const c of _q) { if (c.blockMove && (!filter || filter(c))) return false; }
    return true;
  };
  if (fits(dist)) return dist;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

export function groundHeight(world, x, z, fromY, maxDrop = 5, filter = null) {
  const hit = world.raycast(x, fromY, z, 0, -1, 0, maxDrop, (c) => c.blockMove && (!filter || filter(c)));
  return hit ? hit.point.y : null;
}
