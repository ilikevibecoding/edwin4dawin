// Axis-aligned box collision world: broadphase grid, AABB movement with
// step-up (stairs), and raycasts used by weapons, AI vision and interaction.
//
// Box flags: solid (blocks movement), bullet (blocks bullets), vision
// (blocks AI/line-of-sight checks), and tags like 'glass', 'door', 'prop'.

const CELL = 2.0;

let NEXT_ID = 1;

export class CBox {
  constructor(min, max, opts = {}) {
    this.id = NEXT_ID++;
    this.min = { x: min.x, y: min.y, z: min.z };
    this.max = { x: max.x, y: max.y, z: max.z };
    this.solid = opts.solid !== false;
    this.bullet = opts.bullet !== false;
    this.vision = opts.vision !== false;
    this.tag = opts.tag || 'world';
    this.material = opts.material || 'concrete'; // impact FX/audio key
    this.ref = opts.ref || null;                  // owning object (door, prop, glass pane)
    this.penetrable = opts.penetrable || false;   // thin material bullets can pass through
  }
  center() { return { x: (this.min.x + this.max.x) / 2, y: (this.min.y + this.max.y) / 2, z: (this.min.z + this.max.z) / 2 }; }
}

export class CollisionWorld {
  constructor() {
    this.boxes = new Map();
    this.grid = new Map(); // "cx,cz" -> Set<box>
  }

  clear() { this.boxes.clear(); this.grid.clear(); }

  _cellsFor(min, max) {
    const cells = [];
    const x0 = Math.floor(min.x / CELL), x1 = Math.floor(max.x / CELL);
    const z0 = Math.floor(min.z / CELL), z1 = Math.floor(max.z / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) cells.push(cx + ',' + cz);
    return cells;
  }

  addBox(min, max, opts) {
    const box = new CBox(min, max, opts);
    this.boxes.set(box.id, box);
    for (const key of this._cellsFor(box.min, box.max)) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(box);
    }
    return box;
  }

  removeBox(box) {
    if (!box || !this.boxes.has(box.id)) return;
    this.boxes.delete(box.id);
    for (const key of this._cellsFor(box.min, box.max)) this.grid.get(key)?.delete(box);
  }

  updateBox(box, min, max) {
    for (const key of this._cellsFor(box.min, box.max)) this.grid.get(key)?.delete(box);
    box.min = { ...min }; box.max = { ...max };
    for (const key of this._cellsFor(box.min, box.max)) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(box);
    }
  }

  query(min, max, filter) {
    const out = [];
    const seen = new Set();
    for (const key of this._cellsFor(min, max)) {
      const set = this.grid.get(key);
      if (!set) continue;
      for (const b of set) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        if (b.max.x <= min.x || b.min.x >= max.x) continue;
        if (b.max.y <= min.y || b.min.y >= max.y) continue;
        if (b.max.z <= min.z || b.min.z >= max.z) continue;
        if (filter && !filter(b)) continue;
        out.push(b);
      }
    }
    return out;
  }

  // Move an AABB entity (half extents hx, hy, hz around pos at its center)
  // by delta with axis-separated resolution and automatic step-up.
  // Returns { pos, onGround, hitWall, hitHead, steppedUp }.
  moveAABB(pos, half, delta, opts = {}) {
    const stepHeight = opts.stepHeight ?? 0.38;
    const res = { pos: { ...pos }, onGround: false, hitWall: false, hitHead: false, steppedUp: false };
    const filter = (b) => b.solid && (!opts.ignore || !opts.ignore.has(b.id));

    // Y axis first (gravity / jumping)
    res.pos.y += delta.y;
    let boxes = this._overlaps(res.pos, half, filter);
    for (const b of boxes) {
      if (delta.y <= 0 && res.pos.y - half.y < b.max.y && pos.y - half.y >= b.max.y - 1e-4) {
        res.pos.y = b.max.y + half.y;
        res.onGround = true;
      } else if (delta.y > 0 && res.pos.y + half.y > b.min.y && pos.y + half.y <= b.min.y + 1e-4) {
        res.pos.y = b.min.y - half.y;
        res.hitHead = true;
      }
    }

    // Horizontal axes with step-up attempts
    for (const axis of ['x', 'z']) {
      if (delta[axis] === 0) continue;
      const prev = res.pos[axis];
      res.pos[axis] += delta[axis];
      let collided = null;
      boxes = this._overlaps(res.pos, half, filter);
      for (const b of boxes) {
        const overlapsY = res.pos.y - half.y < b.max.y - 1e-6 && res.pos.y + half.y > b.min.y + 1e-6;
        if (!overlapsY) continue;
        collided = b;
        break;
      }
      if (collided) {
        // Try stepping up (stairs, thresholds, low props)
        const stepTop = collided.max.y;
        const rise = stepTop - (res.pos.y - half.y);
        let stepped = false;
        if (rise > 0 && rise <= stepHeight && delta.y <= 0.01) {
          const testPos = { x: res.pos.x, y: stepTop + half.y + 0.001, z: res.pos.z };
          if (this._overlaps(testPos, half, filter).length === 0) {
            res.pos.y = testPos.y;
            res.onGround = true;
            res.steppedUp = true;
            stepped = true;
          }
        }
        if (!stepped) {
          // Push back out along this axis
          if (delta[axis] > 0) res.pos[axis] = collided.min[axis] - half[axis === 'x' ? 'x' : 'z'] - 1e-4;
          else res.pos[axis] = collided.max[axis] + half[axis === 'x' ? 'x' : 'z'] + 1e-4;
          // If still overlapping something (corner), revert.
          if (this._overlapsAxisBlocked(res.pos, half, filter)) res.pos[axis] = prev;
          res.hitWall = true;
        }
      }
    }
    return res;
  }

  _overlaps(pos, half, filter) {
    return this.query(
      { x: pos.x - half.x, y: pos.y - half.y, z: pos.z - half.z },
      { x: pos.x + half.x, y: pos.y + half.y, z: pos.z + half.z },
      filter
    );
  }

  _overlapsAxisBlocked(pos, half, filter) {
    return this._overlaps(pos, half, filter).length > 0;
  }

  groundHeight(x, z, fromY, filter) {
    // Cast a short ray down to find standing height.
    const hit = this.raycast({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }, 8, { mode: 'solid', filter });
    return hit ? hit.point.y : -Infinity;
  }

  // Slab-method raycast against boxes. mode: 'solid'|'bullet'|'vision'.
  raycast(origin, dir, maxDist, opts = {}) {
    const mode = opts.mode || 'bullet';
    const filter = opts.filter;
    let best = null;
    // Walk the grid cells along the ray (2D DDA over xz).
    const stepCount = Math.ceil(maxDist / CELL) + 2;
    const seen = new Set();
    for (let i = 0; i <= stepCount; i++) {
      const d = Math.min(maxDist, i * CELL);
      const px = origin.x + dir.x * d, pz = origin.z + dir.z * d;
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const key = (Math.floor(px / CELL) + ox) + ',' + (Math.floor(pz / CELL) + oz);
        const set = this.grid.get(key);
        if (!set) continue;
        for (const b of set) {
          if (seen.has(b.id)) continue;
          seen.add(b.id);
          if (mode === 'solid' && !b.solid) continue;
          if (mode === 'bullet' && !b.bullet) continue;
          if (mode === 'vision' && !b.vision) continue;
          if (filter && !filter(b)) continue;
          const hit = rayBox(origin, dir, b, maxDist);
          if (hit && (!best || hit.dist < best.dist)) best = { ...hit, box: b };
        }
      }
      if (best && best.dist < d - CELL) break; // early out once past best
    }
    return best;
  }
}

export function rayBox(origin, dir, box, maxDist) {
  let tmin = 0, tmax = maxDist;
  let nAxis = 'x', nSign = -1;
  for (const axis of ['x', 'y', 'z']) {
    const o = origin[axis], d = dir[axis];
    const lo = box.min[axis], hi = box.max[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      let t1 = (lo - o) / d, t2 = (hi - o) / d;
      let sign = -1;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; sign = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = axis; nSign = sign; }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (tmin < 0 || tmin > maxDist) return null;
  const point = { x: origin.x + dir.x * tmin, y: origin.y + dir.y * tmin, z: origin.z + dir.z * tmin };
  const normal = { x: 0, y: 0, z: 0 };
  normal[nAxis] = nSign;
  return { dist: tmin, point, normal };
}

// Ray vs vertical capsule (approx as cylinder + sphere caps) for hit tests.
export function rayCapsule(origin, dir, base, height, radius, maxDist) {
  // Treat as segment from base+r to base+height-r
  const a = { x: base.x, y: base.y + radius, z: base.z };
  const b = { x: base.x, y: base.y + height - radius, z: base.z };
  // Coarse: sample sphere tests along the ray for robustness.
  let lo = 0, hi = maxDist, best = null;
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxDist;
    const p = { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
    const q = closestOnSegment(p, a, b);
    const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
    if (dx * dx + dy * dy + dz * dz <= radius * radius) { best = t; break; }
  }
  if (best == null) return null;
  // refine backwards
  let t0 = Math.max(0, best - maxDist / steps);
  for (let i = 0; i < 16; i++) {
    const mid = (t0 + best) / 2;
    const p = { x: origin.x + dir.x * mid, y: origin.y + dir.y * mid, z: origin.z + dir.z * mid };
    const q = closestOnSegment(p, a, b);
    const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
    if (dx * dx + dy * dy + dz * dz <= radius * radius) best = mid; else t0 = mid;
  }
  const point = { x: origin.x + dir.x * best, y: origin.y + dir.y * best, z: origin.z + dir.z * best };
  return { dist: best, point };
}

function closestOnSegment(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? (apx * abx + apy * aby + apz * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t, z: a.z + abz * t };
}
