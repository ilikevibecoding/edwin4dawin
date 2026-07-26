// Cover point extraction (Opus 3 domain). Baked once, alongside the navigation graph.
//
// A cover point is a nav node that sits just outside a shot-blocking obstacle, close enough to
// one END of that obstacle's face that the occupant can lean past the edge and shoot. That makes
// every point usable in both directions: tucked ON the point the obstacle is between the occupant
// and anything behind it; stepped out along `lateral` by `peekDist` the firing line is clear.
//
// Everything expensive happens here, at bake time, driven by the collider list rather than by the
// 22k nav nodes: for each obstacle we walk its four faces one nav cell at a time and look the grid
// up by cell. Runtime queries are a coarse-grid lookup plus arithmetic — no raycasts, no
// allocation beyond the result array.
const CELL = 0.5;
const COARSE = 3.0;          // runtime lookup grid
const STANDOFF = 0.55;       // how far outside the obstacle face the occupant stands
const EDGE_REACH = 1.45;     // a point further than this from the face's end cannot lean out
const LEAN_CLEAR = 0.6;      // how far past the edge the lean-out position sits
const MIN_COVER_H = 1.0;     // shorter than this is not worth hiding behind
const FULL_COVER_H = 1.7;    // taller than this hides a standing man
const SECTORS = 8;           // bearing quantisation for the "protected from" mask
const SECTOR_ARC = (Math.PI * 2) / SECTORS;

export function bearingSector(dx, dz) {
  let a = Math.atan2(dz, dx);
  if (a < 0) a += Math.PI * 2;
  return Math.floor(a / SECTOR_ARC) % SECTORS;
}

/** Bitmask of the sector `s` plus its two neighbours — i.e. ±67.5° around a bearing. */
function sectorSpread(s) {
  return (1 << s) | (1 << ((s + 1) % SECTORS)) | (1 << ((s + SECTORS - 1) % SECTORS));
}

export class CoverMap {
  constructor() {
    this.count = 0;
    this.x = []; this.y = []; this.z = [];      // where the occupant stands (tucked)
    this.dirX = []; this.dirZ = [];             // unit bearing from the point INTO the obstacle
    this.latX = []; this.latZ = [];             // unit bearing along the face, towards the near end
    this.peek = [];                             // metres along `lat` to clear the obstacle's edge
    this.mask = [];                             // sectors a threat may occupy and still be covered
    this.full = [];                             // true when the obstacle hides a standing man
    this.node = [];
    this.grid = new Map();
    this.buildMs = 0;
    this.obstacles = 0;
  }

  _key(x, z) {
    return Math.floor(x / COARSE) + ',' + Math.floor(z / COARSE);
  }

  _push(entry) {
    const i = this.count++;
    this.x.push(entry.x); this.y.push(entry.y); this.z.push(entry.z);
    this.dirX.push(entry.dirX); this.dirZ.push(entry.dirZ);
    this.latX.push(entry.latX); this.latZ.push(entry.latZ);
    this.peek.push(entry.peek);
    this.mask.push(entry.mask);
    this.full.push(entry.full);
    this.node.push(entry.node);
    const k = this._key(entry.x, entry.z);
    let arr = this.grid.get(k);
    if (!arr) { arr = []; this.grid.set(k, arr); }
    arr.push(i);
    return i;
  }

  /**
   * Indices of cover points within `radius` of (x,z) on the level of `y`.
   * Bounded by the coarse grid: the 8.5 m combat query touches at most 7x7 cells.
   */
  near(x, y, z, radius, out = []) {
    out.length = 0;
    const r2 = radius * radius;
    const c0 = Math.floor((x - radius) / COARSE), c1 = Math.floor((x + radius) / COARSE);
    const d0 = Math.floor((z - radius) / COARSE), d1 = Math.floor((z + radius) / COARSE);
    for (let cx = c0; cx <= c1; cx++) {
      for (let cz = d0; cz <= d1; cz++) {
        const arr = this.grid.get(cx + ',' + cz);
        if (!arr) continue;
        for (const i of arr) {
          // Same level, within one step. The nav bake calls desk and cabinet tops walkable, so a
          // loose band offers cover points a hostile can see but cannot climb onto.
          if (Math.abs(this.y[i] - y) > 0.45) continue;
          const dx = this.x[i] - x, dz = this.z[i] - z;
          if (dx * dx + dz * dz > r2) continue;
          out.push(i);
        }
      }
    }
    return out;
  }

  /** True when an obstacle stands between cover point `i` and a threat at (tx,tz). */
  protects(i, tx, tz) {
    return (this.mask[i] & (1 << bearingSector(tx - this.x[i], tz - this.z[i]))) !== 0;
  }

  /** Lean-out position for cover point `i`, written into `out` (feet height). */
  peekPos(i, out) {
    out.set(this.x[i] + this.latX[i] * this.peek[i], this.y[i], this.z[i] + this.latZ[i] * this.peek[i]);
    return out;
  }

  entry(i) {
    return {
      index: i,
      pos: [+this.x[i].toFixed(2), +this.y[i].toFixed(2), +this.z[i].toFixed(2)],
      dir: [+this.dirX[i].toFixed(2), +this.dirZ[i].toFixed(2)],
      lateral: [+this.latX[i].toFixed(2), +this.latZ[i].toFixed(2)],
      peek: +this.peek[i].toFixed(2), full: !!this.full[i], mask: this.mask[i],
    };
  }
}

// The four faces of an AABB in plan: outward normal, the axis it is offset along, and the axis
// the face runs along.
const FACES = [
  { nx: 1, nz: 0, along: 'z' },
  { nx: -1, nz: 0, along: 'z' },
  { nx: 0, nz: 1, along: 'x' },
  { nx: 0, nz: -1, along: 'x' },
];

/**
 * Builds the cover map for a baked NavGrid.
 * @param nav   NavGrid with nodes + cells populated
 * @param world CollisionWorld the nav grid was baked from
 */
export function buildCoverMap(nav, world) {
  const t0 = performance.now();
  const cm = new CoverMap();
  const seen = new Set();       // node index * 4 + face, so one entry per node per bearing
  const bounds = nav.bounds;
  const cols = nav.cols, rows = nav.rows;

  const nodesAt = (x, z) => {
    const ix = Math.floor((x - bounds.minX) / CELL);
    const iz = Math.floor((z - bounds.minZ) / CELL);
    if (ix < 0 || iz < 0 || ix >= cols || iz >= rows) return null;
    return nav.cells[iz * cols + ix];
  };
  const hasNodeAt = (x, z, y) => {
    const cell = nodesAt(x, z);
    if (!cell) return false;
    for (const j of cell) if (Math.abs(nav.nodes[j].y - y) < 0.5) return true;
    return false;
  };

  for (const c of world.colliders) {
    // Cover has to stop bullets and stand still: dynamic doors and characters do neither.
    if (!c.blockShot || !c.blockMove || c.dynamic) continue;
    if (c.tag === 'ground' || c.tag === 'slab' || c.tag === 'roof' || c.tag === 'stair') continue;
    const h = c.max.y - c.min.y;
    if (h < MIN_COVER_H) continue;
    const w = c.max.x - c.min.x, d = c.max.z - c.min.z;
    if (w < 0.06 && d < 0.06) continue;
    cm.obstacles++;

    for (let fi = 0; fi < FACES.length; fi++) {
      const f = FACES[fi];
      const perp = f.nx !== 0 ? 'x' : 'z';
      const sign = f.nx !== 0 ? f.nx : f.nz;
      const faceAt = sign > 0 ? c.max[perp] : c.min[perp];
      const standAt = faceAt + sign * STANDOFF;
      const lo = c.min[f.along], hi = c.max[f.along];
      const span = hi - lo;
      // Walk the face, but only the stretches within reach of an end: the middle of a long wall
      // is a place to hide, not a place to fight from.
      const steps = Math.max(1, Math.round(span / CELL));
      for (let s = 0; s <= steps; s++) {
        const t = lo + (span * s) / steps;
        const fromLo = t - lo, fromHi = hi - t;
        const edgeDist = Math.min(fromLo, fromHi);
        if (edgeDist > EDGE_REACH) continue;
        const edgeSign = fromLo <= fromHi ? -1 : 1;
        const sx = perp === 'x' ? standAt : t;
        const sz = perp === 'x' ? t : standAt;
        const cell = nodesAt(sx, sz);
        if (!cell) continue;
        const peekReach = edgeDist + LEAN_CLEAR;
        const px = perp === 'x' ? standAt : t + edgeSign * peekReach;
        const pz = perp === 'x' ? t + edgeSign * peekReach : sz;
        for (const j of cell) {
          const n = nav.nodes[j];
          const top = c.max.y - n.y;
          const bottom = c.min.y - n.y;
          if (top < MIN_COVER_H) continue;      // obstacle too low for this level
          if (bottom > 0.55) continue;          // soffit/duct hanging above head height
          if (!hasNodeAt(px, pz, n.y)) continue; // nowhere to lean out to
          const key = j * 4 + fi;
          if (seen.has(key)) continue;
          seen.add(key);
          cm._push({
            x: n.x, y: n.y, z: n.z,
            dirX: -f.nx, dirZ: -f.nz,
            latX: perp === 'x' ? 0 : edgeSign, latZ: perp === 'x' ? edgeSign : 0,
            peek: peekReach,
            mask: sectorSpread(bearingSector(-f.nx, -f.nz)),
            full: top >= FULL_COVER_H,
            node: j,
          });
        }
      }
    }
  }

  // Merge bearings recorded for the same node so a corner protects from two directions.
  const byNode = new Map();
  for (let i = 0; i < cm.count; i++) {
    const prev = byNode.get(cm.node[i]);
    if (prev === undefined) { byNode.set(cm.node[i], i); continue; }
    cm.mask[prev] |= cm.mask[i];
    cm.mask[i] |= cm.mask[prev];
  }

  cm.buildMs = performance.now() - t0;
  return cm;
}
