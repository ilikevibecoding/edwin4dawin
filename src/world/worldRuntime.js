// World runtime container: colliders, walkable supports, raycasts.
// Colliders are plain AABBs {x0,y0,z0,x1,y1,z1, kind, surface, blocksMove,
// blocksSight, ...refs}. Ray tests use the slab method — no three.js Raycaster
// in the gameplay path, so results are exact and cheap.

export class World {
  constructor() {
    this.group = null;          // THREE.Group with all static geometry
    this.colliders = [];
    this.surfaces = [];         // {x0,z0,x1,z1,y, surface, room} flat supports
    this.ramps = [];            // {x0,z0,x1,z1, axis:'x'|'z', c0,c1, y0,y1, surface}
    this.doors = [];
    this.glassPanes = [];
    this.pickups = [];
    this.roomOf = null;         // fn(x,z,y)->room
    this.stairways = [];
    this.propAnchors = [];      // decoration slots filled by prop pass
    this.lightsByScenario = {};
  }

  addCollider(c) { this.colliders.push(c); return c; }
  removeCollider(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); }

  // Highest support under (x,z) whose top is at or below feetY + stepUp.
  groundAt(x, z, feetY, stepUp = 0.4) {
    let best = -1e9; let surface = 'concrete';
    const limit = feetY + stepUp;
    for (const s of this.surfaces) {
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      if (s.y <= limit && s.y > best) { best = s.y; surface = s.surface; }
    }
    for (const r of this.ramps) {
      if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
      const c = r.axis === 'z' ? z : x;
      const t = Math.min(1, Math.max(0, (c - r.c0) / (r.c1 - r.c0)));
      const y = r.y0 + (r.y1 - r.y0) * t;
      if (y <= limit + 0.05 && y > best) { best = y; surface = r.surface; }
    }
    for (const c of this.colliders) {
      if (!c.blocksMove || c.noStand) continue;
      if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
      if (c.y1 <= limit && c.y1 > best) { best = c.y1; surface = c.surface || 'concrete'; }
    }
    return { y: best, surface };
  }

  // Slab-method ray vs AABB list. opts: {blocking:'move'|'sight', ignore:Set,
  // throughGlass:bool (glass never stops the ray, but panes hit are recorded)}
  raycast(ox, oy, oz, dx, dy, dz, maxDist, opts = {}) {
    const mode = opts.blocking || 'sight';
    let bestT = maxDist;
    let hit = null;
    const glassHits = [];
    for (const c of this.colliders) {
      if (mode === 'move' ? !c.blocksMove : !c.blocksSight) continue;
      if (opts.ignore && opts.ignore.has(c)) continue;
      const t = rayAabb(ox, oy, oz, dx, dy, dz, c, bestT);
      if (t === null) continue;
      // throughGlass only lets SEE-THROUGH glass pass; frosted glass has
      // blocksSight=true and must genuinely block sight rays.
      if (c.glass && opts.throughGlass && !c.blocksSight) { glassHits.push({ t, collider: c }); continue; }
      if (t < bestT) { bestT = t; hit = c; }
    }
    if (!hit && !glassHits.length) return null;
    const res = {
      t: bestT,
      collider: hit,
      point: hit ? { x: ox + dx * bestT, y: oy + dy * bestT, z: oz + dz * bestT } : null,
      normal: hit ? aabbNormal(ox + dx * bestT, oy + dy * bestT, oz + dz * bestT, hit) : null,
      glassHits: glassHits.filter((g) => g.t < bestT).sort((a, b) => a.t - b.t),
    };
    return res;
  }

  // Convenience: is there a clear line of sight (glass counts per flag)?
  lineOfSight(ax, ay, az, bx, by, bz, { throughGlass = true } = {}) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-6) return true;
    const r = this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05, { blocking: 'sight', throughGlass });
    if (!r || !r.collider) return true;
    return false;
  }
}

export function rayAabb(ox, oy, oz, dx, dy, dz, b, tMax) {
  let tmin = 0, tmaxv = tMax;
  // X
  if (Math.abs(dx) < 1e-9) { if (ox < b.x0 || ox > b.x1) return null; }
  else {
    const inv = 1 / dx;
    let t1 = (b.x0 - ox) * inv, t2 = (b.x1 - ox) * inv;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1); tmaxv = Math.min(tmaxv, t2);
    if (tmin > tmaxv) return null;
  }
  // Y
  if (Math.abs(dy) < 1e-9) { if (oy < b.y0 || oy > b.y1) return null; }
  else {
    const inv = 1 / dy;
    let t1 = (b.y0 - oy) * inv, t2 = (b.y1 - oy) * inv;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1); tmaxv = Math.min(tmaxv, t2);
    if (tmin > tmaxv) return null;
  }
  // Z
  if (Math.abs(dz) < 1e-9) { if (oz < b.z0 || oz > b.z1) return null; }
  else {
    const inv = 1 / dz;
    let t1 = (b.z0 - oz) * inv, t2 = (b.z1 - oz) * inv;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1); tmaxv = Math.min(tmaxv, t2);
    if (tmin > tmaxv) return null;
  }
  return tmin >= 0 && tmin < tMax ? tmin : null;
}

function aabbNormal(px, py, pz, b) {
  const eps = 0.002;
  if (Math.abs(px - b.x0) < eps) return { x: -1, y: 0, z: 0 };
  if (Math.abs(px - b.x1) < eps) return { x: 1, y: 0, z: 0 };
  if (Math.abs(py - b.y0) < eps) return { x: 0, y: -1, z: 0 };
  if (Math.abs(py - b.y1) < eps) return { x: 0, y: 1, z: 0 };
  if (Math.abs(pz - b.z0) < eps) return { x: 0, y: 0, z: -1 };
  return { x: 0, y: 0, z: 1 };
}

export function aabb(x0, y0, z0, x1, y1, z1, props = {}) {
  return {
    x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1),
    x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1),
    blocksMove: true, blocksSight: true, kind: 'static', ...props,
  };
}
