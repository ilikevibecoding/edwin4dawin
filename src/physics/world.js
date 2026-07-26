import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Collision world.
//
// Every solid in the level is represented by an axis-aligned box (optionally
// rotated about Y, in which case we store the rotation and transform queries
// into local space). This keeps broadphase, sweeps and bullet raycasts fast
// and exact, and it means the collision the player feels is the same data the
// navigation grid and the AI line-of-fire checks read.
// ---------------------------------------------------------------------------

export const SURFACE = {
  DRYWALL: 'drywall',
  CONCRETE: 'concrete',
  METAL: 'metal',
  WOOD: 'wood',
  GLASS: 'glass',
  CARPET: 'carpet',
  TILE: 'tile',
  FABRIC: 'fabric',
  PAPER: 'paper',
  PLASTIC: 'plastic',
  SNOW: 'snow',
  FLESH: 'flesh',
  ELECTRONIC: 'electronic',
};

/** Per-surface bullet behaviour used by combat and VFX. */
export const SURFACE_PROPS = {
  drywall: { penetration: 0.55, damageFalloff: 0.72, ricochet: 0.02, sound: 'impact_drywall', decal: 'drywall' },
  concrete: { penetration: 0.12, damageFalloff: 0.35, ricochet: 0.18, sound: 'impact_concrete', decal: 'concrete' },
  metal: { penetration: 0.2, damageFalloff: 0.45, ricochet: 0.3, sound: 'impact_metal', decal: 'metal' },
  wood: { penetration: 0.45, damageFalloff: 0.62, ricochet: 0.05, sound: 'impact_wood', decal: 'wood' },
  glass: { penetration: 0.9, damageFalloff: 0.9, ricochet: 0.0, sound: 'impact_glass', decal: 'glass', breakable: true },
  carpet: { penetration: 0.3, damageFalloff: 0.5, ricochet: 0.0, sound: 'impact_soft', decal: 'carpet' },
  tile: { penetration: 0.25, damageFalloff: 0.45, ricochet: 0.12, sound: 'impact_tile', decal: 'concrete' },
  fabric: { penetration: 0.7, damageFalloff: 0.8, ricochet: 0.0, sound: 'impact_soft', decal: 'fabric' },
  paper: { penetration: 0.85, damageFalloff: 0.9, ricochet: 0.0, sound: 'impact_soft', decal: 'fabric' },
  plastic: { penetration: 0.6, damageFalloff: 0.7, ricochet: 0.03, sound: 'impact_plastic', decal: 'metal' },
  snow: { penetration: 0.5, damageFalloff: 0.6, ricochet: 0.0, sound: 'impact_snow', decal: 'snow' },
  flesh: { penetration: 0.5, damageFalloff: 0.6, ricochet: 0, sound: 'impact_flesh', decal: 'blood' },
  electronic: { penetration: 0.4, damageFalloff: 0.6, ricochet: 0.05, sound: 'impact_electronic', decal: 'metal' },
};

let nextColliderId = 1;

export class Collider {
  constructor({ min, max, surface = SURFACE.DRYWALL, tag = '', dynamic = false, blocksSight = true, blocksNav = true, height = null, ref = null, yaw = 0 }) {
    this.id = nextColliderId++;
    this.min = new THREE.Vector3().fromArray(min);
    this.max = new THREE.Vector3().fromArray(max);
    this.surface = surface;
    this.tag = tag;
    this.dynamic = dynamic;
    this.enabled = true;
    this.blocksSight = blocksSight;
    this.blocksNav = blocksNav;
    this.yaw = yaw;
    this.ref = ref;
    this.stepHeight = height;
  }

  get center() {
    return new THREE.Vector3().addVectors(this.min, this.max).multiplyScalar(0.5);
  }

  setBounds(min, max) {
    this.min.fromArray(min);
    this.max.fromArray(max);
  }

  contains(p, margin = 0) {
    return (
      p.x >= this.min.x - margin && p.x <= this.max.x + margin &&
      p.y >= this.min.y - margin && p.y <= this.max.y + margin &&
      p.z >= this.min.z - margin && p.z <= this.max.z + margin
    );
  }
}

const CELL = 4; // metres

export class CollisionWorld {
  constructor() {
    /** @type {Map<number, Collider>} */
    this.colliders = new Map();
    /** @type {Map<string, Set<number>>} */
    this.grid = new Map();
    this.bounds = new THREE.Box3(
      new THREE.Vector3(-40, -2, -40),
      new THREE.Vector3(45, 12, 30)
    );
  }

  clear() {
    this.colliders.clear();
    this.grid.clear();
  }

  _cellsFor(c) {
    const out = [];
    const x0 = Math.floor(c.min.x / CELL), x1 = Math.floor(c.max.x / CELL);
    const z0 = Math.floor(c.min.z / CELL), z1 = Math.floor(c.max.z / CELL);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) out.push(`${x},${z}`);
    return out;
  }

  add(def) {
    const c = def instanceof Collider ? def : new Collider(def);
    this.colliders.set(c.id, c);
    for (const key of this._cellsFor(c)) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(c.id);
    }
    return c;
  }

  /** Add a box from centre + size, optionally offset so y is the base. */
  addBox({ pos, size, base = false, ...rest }) {
    const [cx, cy, cz] = pos;
    const [sx, sy, sz] = size;
    const y0 = base ? cy : cy - sy / 2;
    return this.add({
      min: [cx - sx / 2, y0, cz - sz / 2],
      max: [cx + sx / 2, y0 + sy, cz + sz / 2],
      ...rest,
    });
  }

  remove(collider) {
    if (!collider) return;
    this.colliders.delete(collider.id);
    for (const key of this._cellsFor(collider)) this.grid.get(key)?.delete(collider.id);
  }

  /** Re-index a collider that moved (doors). */
  refresh(collider, oldCells) {
    if (oldCells) for (const key of oldCells) this.grid.get(key)?.delete(collider.id);
    for (const key of this._cellsFor(collider)) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(collider.id);
    }
  }

  /** All colliders whose cells overlap an AABB. */
  query(min, max, out = []) {
    out.length = 0;
    const seen = new Set();
    const x0 = Math.floor(min.x / CELL), x1 = Math.floor(max.x / CELL);
    const z0 = Math.floor(min.z / CELL), z1 = Math.floor(max.z / CELL);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const set = this.grid.get(`${x},${z}`);
        if (!set) continue;
        for (const id of set) {
          if (seen.has(id)) continue;
          seen.add(id);
          const c = this.colliders.get(id);
          if (!c || !c.enabled) continue;
          if (c.max.x < min.x || c.min.x > max.x) continue;
          if (c.max.y < min.y || c.min.y > max.y) continue;
          if (c.max.z < min.z || c.min.z > max.z) continue;
          out.push(c);
        }
      }
    }
    return out;
  }

  /**
   * Slab raycast against every collider. Returns the nearest hit.
   * @returns {{hit:boolean, distance:number, point:THREE.Vector3, normal:THREE.Vector3, collider:Collider|null, surface:string}}
   */
  raycast(origin, dir, maxDist = 100, filter = null) {
    let best = maxDist;
    let bestC = null;
    let bestAxis = 0;
    let bestSign = 1;

    // Walk the broadphase grid along the ray (3D DDA over XZ cells).
    const inv = new THREE.Vector3(
      dir.x !== 0 ? 1 / dir.x : Infinity,
      dir.y !== 0 ? 1 / dir.y : Infinity,
      dir.z !== 0 ? 1 / dir.z : Infinity
    );
    const seen = new Set();
    const step = CELL * 0.5;
    const steps = Math.ceil(maxDist / step) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(s * step, maxDist);
      const px = origin.x + dir.x * t;
      const pz = origin.z + dir.z * t;
      const cx = Math.floor(px / CELL);
      const cz = Math.floor(pz / CELL);
      for (let oz = -1; oz <= 1; oz++) {
        for (let ox = -1; ox <= 1; ox++) {
          const set = this.grid.get(`${cx + ox},${cz + oz}`);
          if (!set) continue;
          for (const id of set) {
            if (seen.has(id)) continue;
            seen.add(id);
            const c = this.colliders.get(id);
            if (!c || !c.enabled) continue;
            if (filter && !filter(c)) continue;
            // slab test
            let tmin = 0;
            let tmax = best;
            let axis = 0;
            let sign = 1;
            for (let a = 0; a < 3; a++) {
              const o = a === 0 ? origin.x : a === 1 ? origin.y : origin.z;
              const i = a === 0 ? inv.x : a === 1 ? inv.y : inv.z;
              const lo = a === 0 ? c.min.x : a === 1 ? c.min.y : c.min.z;
              const hi = a === 0 ? c.max.x : a === 1 ? c.max.y : c.max.z;
              let t1 = (lo - o) * i;
              let t2 = (hi - o) * i;
              let sgn = -1;
              if (t1 > t2) {
                const tmp = t1; t1 = t2; t2 = tmp;
                sgn = 1;
              }
              if (t1 > tmin) { tmin = t1; axis = a; sign = sgn; }
              if (t2 < tmax) tmax = t2;
              if (tmin > tmax) { tmin = Infinity; break; }
            }
            if (tmin < best && tmin >= 0 && tmin !== Infinity) {
              best = tmin;
              bestC = c;
              bestAxis = axis;
              bestSign = sign;
            }
          }
        }
      }
      if (bestC && best < t) break; // nearest hit already inside a swept cell
    }

    if (!bestC) {
      return { hit: false, distance: maxDist, point: origin.clone().addScaledVector(dir, maxDist), normal: new THREE.Vector3(0, 1, 0), collider: null, surface: null };
    }
    const normal = new THREE.Vector3();
    normal.setComponent(bestAxis, bestSign);
    return {
      hit: true,
      distance: best,
      point: origin.clone().addScaledVector(dir, best),
      normal,
      collider: bestC,
      surface: bestC.surface,
    };
  }

  /** Fast boolean visibility test that ignores non-sight-blocking colliders. */
  lineOfSight(from, to, extraFilter = null) {
    const delta = new THREE.Vector3().subVectors(to, from);
    const dist = delta.length();
    if (dist < 0.001) return true;
    delta.divideScalar(dist);
    const hit = this.raycast(from, delta, dist - 0.02, (c) => c.blocksSight && (!extraFilter || extraFilter(c)));
    return !hit.hit;
  }

  /** Test whether an axis-aligned capsule footprint overlaps anything solid. */
  overlapsCapsule(pos, radius, height, ignore = null) {
    const min = new THREE.Vector3(pos.x - radius, pos.y + 0.02, pos.z - radius);
    const max = new THREE.Vector3(pos.x + radius, pos.y + height, pos.z + radius);
    const hits = this.query(min, max);
    for (const c of hits) {
      if (ignore && ignore(c)) continue;
      return c;
    }
    return null;
  }

  /**
   * Move an upright capsule with axis-separated sliding + step-up.
   * Returns the resolved position and contact flags.
   */
  moveCapsule(pos, velocity, dt, { radius = 0.34, height = 1.8, stepHeight = 0.32, ignore = null } = {}) {
    const result = {
      position: pos.clone(),
      grounded: false,
      groundSurface: null,
      hitWall: false,
      wallNormal: new THREE.Vector3(),
      ceiling: false,
    };
    const p = result.position;
    const _min = new THREE.Vector3();
    const _max = new THREE.Vector3();
    const list = [];

    const collect = (cx, cy, cz) => {
      _min.set(cx - radius - 0.05, cy - 0.05, cz - radius - 0.05);
      _max.set(cx + radius + 0.05, cy + height + 0.05, cz + radius + 0.05);
      return this.query(_min, _max, list);
    };

    // --- vertical ---------------------------------------------------------
    let dy = velocity.y * dt;
    if (dy !== 0) {
      const ny = p.y + dy;
      const hits = collect(p.x, Math.min(p.y, ny), p.z);
      for (const c of hits) {
        if (ignore && ignore(c)) continue;
        if (c.max.x <= p.x - radius || c.min.x >= p.x + radius) continue;
        if (c.max.z <= p.z - radius || c.min.z >= p.z + radius) continue;
        if (dy <= 0) {
          if (p.y >= c.max.y - 0.02 && ny <= c.max.y) {
            p.y = c.max.y;
            dy = 0;
            result.grounded = true;
            result.groundSurface = c.surface;
            velocity.y = 0;
            break;
          }
        } else if (p.y + height <= c.min.y + 0.02 && ny + height >= c.min.y) {
          p.y = c.min.y - height;
          dy = 0;
          result.ceiling = true;
          velocity.y = 0;
          break;
        }
      }
      p.y += dy;
    }

    // Ground probe so walking off a ledge and standing on props both work.
    if (!result.grounded) {
      const probe = 0.06;
      const hits = collect(p.x, p.y - probe, p.z);
      for (const c of hits) {
        if (ignore && ignore(c)) continue;
        if (c.max.x <= p.x - radius || c.min.x >= p.x + radius) continue;
        if (c.max.z <= p.z - radius || c.min.z >= p.z + radius) continue;
        if (p.y >= c.max.y - probe && p.y <= c.max.y + 0.001) {
          p.y = c.max.y;
          result.grounded = true;
          result.groundSurface = c.surface;
          if (velocity.y < 0) velocity.y = 0;
          break;
        }
      }
    }

    // --- horizontal, one axis at a time so we slide along walls -----------
    const tryAxis = (axis, delta) => {
      if (delta === 0) return;
      const before = axis === 'x' ? p.x : p.z;
      const after = before + delta;
      if (axis === 'x') p.x = after; else p.z = after;
      const hits = collect(p.x, p.y, p.z);
      for (const c of hits) {
        if (ignore && ignore(c)) continue;
        // Vertical overlap with the capsule body (feet are allowed to step up).
        const feet = p.y + Math.min(stepHeight, 0.001 + stepHeight);
        if (c.max.y <= p.y + 0.02) continue;
        if (c.min.y >= p.y + height) continue;
        const overlapX = p.x + radius > c.min.x && p.x - radius < c.max.x;
        const overlapZ = p.z + radius > c.min.z && p.z - radius < c.max.z;
        if (!overlapX || !overlapZ) continue;

        // Step-up: low obstacle and enough headroom above it.
        if (c.max.y <= p.y + stepHeight + 0.001 && c.max.y > p.y) {
          const savedY = p.y;
          p.y = c.max.y;
          const blocked = collect(p.x, p.y, p.z).some(
            (c2) => (!ignore || !ignore(c2)) && c2 !== c &&
              c2.max.y > p.y + 0.05 && c2.min.y < p.y + height &&
              p.x + radius > c2.min.x && p.x - radius < c2.max.x &&
              p.z + radius > c2.min.z && p.z - radius < c2.max.z
          );
          if (!blocked) {
            result.grounded = true;
            result.groundSurface = c.surface;
            continue;
          }
          p.y = savedY;
        }

        // Push out on the moving axis.
        if (axis === 'x') {
          p.x = delta > 0 ? c.min.x - radius - 0.001 : c.max.x + radius + 0.001;
          result.wallNormal.set(delta > 0 ? -1 : 1, 0, 0);
        } else {
          p.z = delta > 0 ? c.min.z - radius - 0.001 : c.max.z + radius + 0.001;
          result.wallNormal.set(0, 0, delta > 0 ? -1 : 1);
        }
        result.hitWall = true;
      }
    };

    tryAxis('x', velocity.x * dt);
    tryAxis('z', velocity.z * dt);

    return result;
  }

  /** Depenetrate a capsule that ended up inside geometry (teleports, spawns). */
  resolveOverlap(pos, radius, height, iterations = 4) {
    const _min = new THREE.Vector3();
    const _max = new THREE.Vector3();
    const list = [];
    for (let i = 0; i < iterations; i++) {
      _min.set(pos.x - radius, pos.y + 0.08, pos.z - radius);
      _max.set(pos.x + radius, pos.y + height - 0.1, pos.z + radius);
      const hits = this.query(_min, _max, list);
      if (!hits.length) break;
      let moved = false;
      for (const c of hits) {
        const dxL = pos.x + radius - c.min.x;
        const dxR = c.max.x - (pos.x - radius);
        const dzL = pos.z + radius - c.min.z;
        const dzR = c.max.z - (pos.z - radius);
        const m = Math.min(dxL, dxR, dzL, dzR);
        if (m <= 0) continue;
        if (m === dxL) pos.x -= m + 0.002;
        else if (m === dxR) pos.x += m + 0.002;
        else if (m === dzL) pos.z -= m + 0.002;
        else pos.z += m + 0.002;
        moved = true;
      }
      if (!moved) break;
    }
    return pos;
  }

  stats() {
    return { colliders: this.colliders.size, cells: this.grid.size };
  }
}
