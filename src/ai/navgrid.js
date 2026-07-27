import * as THREE from 'three';
import {
  ROOMS, OPENINGS, STAIRS, FLOOR_Y, roomAt, floorForY,
} from '../map/layout.js';
import { Rng, hashString } from '../core/rng.js';
// ---------------------------------------------------------------------------
// Navigation.  (owner: opus3)
//
// A two-level uniform grid at 0.35 m, one plane per storey, baked once from
// the collision world. A cell is walkable when
//
//   1. a `floor:` slab supports it within 0.12 m of the storey height, and
//   2. a 0.32 m radius / 1.75 m tall capsule standing on it is clear of every
//      nav-blocking collider.
//
// Doors are deliberately excluded from (2) and recorded on the cell instead,
// so a closed door is *conditionally* passable: paths route through it at a
// higher cost and the agent opens it when it arrives. Openings (arches,
// doorways) also carry a cost premium so agents prefer open floor and do not
// grind along frames.
//
// The two staircases are explicit vertical links rather than sloped cells:
// each flight's footprint is punched out of both planes and replaced by a set
// of edges carrying the tread centreline as a polyline. That removes the
// zigzag a grid would otherwise produce on the treads, and it means the funnel
// pass can string-pull each storey independently without cutting the corner
// off a flight.
//
// Recovery, in order of escalation:
//   * `nearestWalkable` snaps an off-mesh point onto the nearest cell (spiral
//     search, own storey first, then the other one).
//   * a failed or budget-exhausted A* falls back to a coarse room-graph route
//     derived from ROOMS + OPENINGS, then re-snaps each portal.
//   * `findPath` never throws and never returns an empty array — callers get
//     either a usable list of points or null.
//
// DETERMINISM: no wall-clock time, no Math.random. `randomPointNear` takes the
// caller's seeded Rng so each agent owns its own stream; the internal stream is
// only a fallback and is reseeded by `reseed()`.
// ---------------------------------------------------------------------------

export const CELL_SIZE = 0.35;
export const AGENT_RADIUS = 0.32;
export const AGENT_HEIGHT = 1.75;

/** Cell flags. */
const F_WALK = 1;
const F_DOOR = 2;
const F_OPENING = 4;
const F_STAIR = 8;

const LEVELS = [
  { key: 'ground', y: FLOOR_Y.ground },
  { key: 'upper', y: FLOOR_Y.upper },
];

const SUPPORT_TAG = /^floor:/;
/**
 * Colliders the clearance test ignores (handled explicitly elsewhere).
 *
 * Treads are deliberately *not* ignored. The flight's own cells are punched out
 * by `_bakeStairs` regardless, so all that ignoring them ever did was mark the
 * 0.32 m band of stairwell aisle where the agent capsule clips the tread stack.
 * An agent walking that band is deeply inside a tread box, and the collision
 * resolver answers deep penetration by ejecting it out the far side of the
 * whole staircase — a 3 m sideways jump, sometimes into the open stairwell.
 */
const IGNORE_TAG = /^(character|door:|floor:|deck:|glassdecal)/;

const DIAG = Math.SQRT2;
const OPENING_TYPES = new Set(['door', 'doubledoor', 'arch', 'shutter', 'passthrough']);

// ------------------------------------------------------------------- heap ---

/** Tiny binary min-heap over integer node ids keyed by a Float64Array. */
class NodeHeap {
  constructor(capacity, key) {
    this.items = new Int32Array(Math.max(64, capacity));
    this.size = 0;
    this.key = key;
  }

  clear() { this.size = 0; }

  push(n) {
    if (this.size >= this.items.length) {
      const bigger = new Int32Array(this.items.length * 2);
      bigger.set(this.items);
      this.items = bigger;
    }
    const it = this.items;
    let i = this.size++;
    it[i] = n;
    const k = this.key;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[it[p]] <= k[it[i]]) break;
      const t = it[p]; it[p] = it[i]; it[i] = t;
      i = p;
    }
  }

  pop() {
    const it = this.items;
    const k = this.key;
    const top = it[0];
    this.size--;
    if (this.size > 0) {
      it[0] = it[this.size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.size && k[it[l]] < k[it[m]]) m = l;
        if (r < this.size && k[it[r]] < k[it[m]]) m = r;
        if (m === i) break;
        const t = it[m]; it[m] = it[i]; it[i] = t;
        i = m;
      }
    }
    return top;
  }
}

// ------------------------------------------------------------------ grid ---

export class NavGrid {
  constructor(collision) {
    this.collision = collision;
    this.cell = CELL_SIZE;
    this.radius = AGENT_RADIUS;
    this.height = AGENT_HEIGHT;
    this.built = false;

    this.minX = 0; this.minZ = 0; this.w = 0; this.h = 0;
    /** @type {Array<{key:string,y:number,flags:Uint8Array,cost:Float32Array,doorIdx:Int16Array,support:Float32Array}>} */
    this.levels = [];
    this.levelIndex = { ground: 0, upper: 1 };
    /** Door ids referenced by cells, indexed by `doorIdx`. */
    this.doorIds = [];
    /** @type {Map<number, Array<{to:number, cost:number, poly:THREE.Vector3[], stair:string}>>} */
    this.links = new Map();
    /** @type {Array<object>} */
    this.stairLinks = [];

    this.rooms = { nodes: new Map(), edges: [] };

    this.rng = new Rng(hashString('northstar:nav'));
    this.maxSearchNodes = 24000;
    this.stats = {
      cells: 0, walkable: 0, doorCells: 0, stairLinks: 0, islands: 0, pruned: 0,
      buildMs: 0, searches: 0, cacheHits: 0, fallbacks: 0, failures: 0,
    };

    this._cache = new Map();
    this._cacheLimit = 384;
    this._debug = null;
    this._queryOut = [];
  }

  // ----------------------------------------------------------------- build --

  build() {
    if (this.built) return this;
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;

    // The map builder is authoritative for vertical circulation and for every
    // aperture: stair shafts, landings, decks, storey wall heights and the
    // along-wall position of each opening all come out of src/map/** correct.
    // A runtime repair used to run here; it is gone, and the bake now reads the
    // world as built.
    let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
    for (const r of ROOMS) {
      minX = Math.min(minX, r.x0); maxX = Math.max(maxX, r.x1);
      minZ = Math.min(minZ, r.z0); maxZ = Math.max(maxZ, r.z1);
    }
    const pad = 1.2;
    this.minX = minX - pad;
    this.minZ = minZ - pad;
    this.w = Math.ceil((maxX + pad - this.minX) / this.cell) + 1;
    this.h = Math.ceil((maxZ + pad - this.minZ) / this.cell) + 1;
    const n = this.w * this.h;

    this.levels = LEVELS.map((l) => ({
      key: l.key,
      y: l.y,
      flags: new Uint8Array(n),
      cost: new Float32Array(n),
      doorIdx: new Int16Array(n).fill(-1),
      support: new Float32Array(n).fill(NaN),
    }));
    this.levelIndex = { ground: 0, upper: 1 };

    const total = n * this.levels.length;
    this._gScore = new Float32Array(total);
    this._fScore = new Float64Array(total);
    this._from = new Int32Array(total);
    // Both of these hold the search generation, not a boolean: they have to be
    // wide enough for the counter or a stale stamp reads as "open" and A*
    // re-expands the same cells until it exhausts its budget.
    this._stamp = new Int32Array(total);
    this._closed = new Int32Array(total);
    this._gen = 0;
    this._heap = new NodeHeap(Math.min(total, 1 << 17), this._fScore);

    this._bakeCells();
    this._bakeOpenings();
    this._bakeStairs();
    this._pruneIslands();
    this._bakeRoomGraph();

    this.stats.cells = total;
    this.stats.walkable = 0;
    this.stats.doorCells = 0;
    for (const lv of this.levels) {
      for (let i = 0; i < n; i++) {
        if (lv.flags[i] & F_WALK) this.stats.walkable++;
        if (lv.doorIdx[i] >= 0) this.stats.doorCells++;
      }
    }
    this.stats.stairLinks = this.stairLinks.length;
    this.stats.buildMs = +(((typeof performance !== 'undefined' && performance.now) ? performance.now() : 0) - t0).toFixed(1);
    this.built = true;
    return this;
  }

  /** Sweep every room footprint (plus a wall-thickness margin) once. */
  _bakeCells() {
    const visited = new Set();
    const margin = 0.55;
    for (const room of ROOMS) {
      const li = this.levelIndex[room.floor];
      if (li === undefined) continue;
      const lv = this.levels[li];
      const ix0 = Math.max(0, this._ix(room.x0 - margin));
      const ix1 = Math.min(this.w - 1, this._ix(room.x1 + margin));
      const iz0 = Math.max(0, this._iz(room.z0 - margin));
      const iz1 = Math.min(this.h - 1, this._iz(room.z1 + margin));
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const idx = iz * this.w + ix;
          const key = li * 1e7 + idx;
          if (visited.has(key)) continue;
          visited.add(key);
          this._bakeCell(lv, ix, iz, idx);
        }
      }
    }
  }

  _bakeCell(lv, ix, iz, idx) {
    const x = this._x(ix);
    const z = this._z(iz);
    const support = this._supportAt(x, z, lv.y);
    if (support === null) return;
    if (!this._clearAt(x, z, lv.y)) return;
    lv.flags[idx] |= F_WALK;
    lv.cost[idx] = 1;
    lv.support[idx] = support;
  }

  /** Top of the floor under (x,z) on a storey, or null when unsupported. */
  _supportAt(x, z, floorY) {
    const min = new THREE.Vector3(x - 0.12, floorY - 0.6, z - 0.12);
    const max = new THREE.Vector3(x + 0.12, floorY + 0.4, z + 0.12);
    const hits = this.collision.query(min, max, this._queryOut);
    let best = null;
    for (const c of hits) {
      if (!SUPPORT_TAG.test(c.tag || '')) continue;
      if (x < c.min.x - 0.001 || x > c.max.x + 0.001) continue;
      if (z < c.min.z - 0.001 || z > c.max.z + 0.001) continue;
      if (Math.abs(c.max.y - floorY) > 0.14) continue;
      if (best === null || c.max.y > best) best = c.max.y;
    }
    return best;
  }

  /** Is the agent capsule clear here? Doors and treads are excluded. */
  _clearAt(x, z, floorY) {
    const r = this.radius;
    const min = new THREE.Vector3(x - r, floorY + 0.14, z - r);
    const max = new THREE.Vector3(x + r, floorY + this.height, z + r);
    const hits = this.collision.query(min, max, this._queryOut);
    for (const c of hits) {
      if (c.blocksNav === false) continue;
      if (IGNORE_TAG.test(c.tag || '')) continue;
      if (c.min.y >= floorY + this.height - 0.02) continue;
      if (c.max.y <= floorY + 0.14) continue;
      return false;
    }
    return true;
  }

  /** Doorway / arch cells: passable, dearer, and tagged with their door. */
  _bakeOpenings() {
    for (const o of OPENINGS) {
      if (!OPENING_TYPES.has(o.type)) continue;
      const li = this.levelIndex[o.floor];
      if (li === undefined) continue;
      const lv = this.levels[li];
      const isZ = o.axis === 'z';
      const cx = isZ ? o.coord : o.at;
      const cz = isZ ? o.at : o.coord;
      const hx = isZ ? 0.34 : o.width / 2;
      const hz = isZ ? o.width / 2 : 0.34;

      let doorIdx = -1;
      if (o.door) {
        doorIdx = this.doorIds.indexOf(o.door);
        if (doorIdx < 0) { this.doorIds.push(o.door); doorIdx = this.doorIds.length - 1; }
      }

      const ix0 = Math.max(0, this._ix(cx - hx));
      const ix1 = Math.min(this.w - 1, this._ix(cx + hx));
      const iz0 = Math.max(0, this._iz(cz - hz));
      const iz1 = Math.min(this.h - 1, this._iz(cz + hz));
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const idx = iz * this.w + ix;
          // Re-test clearance here: the closed leaf is excluded from the
          // sweep, so a doorway cell that failed only because of its door
          // becomes walkable, conditionally, right now.
          if (!(lv.flags[idx] & F_WALK)) {
            const x = this._x(ix);
            const z = this._z(iz);
            if (this._supportAt(x, z, lv.y) === null) continue;
            if (!this._clearAt(x, z, lv.y)) continue;
            lv.flags[idx] |= F_WALK;
            lv.cost[idx] = 1;
          }
          lv.flags[idx] |= F_OPENING;
          lv.cost[idx] = Math.max(lv.cost[idx], o.door ? 2.4 : 1.4);
          if (doorIdx >= 0) {
            lv.flags[idx] |= F_DOOR;
            lv.doorIdx[idx] = doorIdx;
          }
        }
      }
    }
  }

  /**
   * Punch the flights out of both planes and replace them with explicit
   * links carrying the tread centreline.
   */
  _bakeStairs() {
    for (const s of STAIRS) {
      const fromY = FLOOR_Y[s.fromFloor] ?? 0;
      const toY = FLOOR_Y[s.toFloor] ?? 4;
      const topZ = s.zBottom - s.run * s.steps;
      const dirZ = Math.sign(topZ - s.zBottom) || -1;
      const pad = 0.05;
      const fx0 = s.x - s.width / 2 - pad;
      const fx1 = s.x + s.width / 2 + pad;
      const fz0 = Math.min(s.zBottom, topZ) - pad;
      const fz1 = Math.max(s.zBottom, topZ) + pad;

      for (const lv of this.levels) {
        const ix0 = Math.max(0, this._ix(fx0));
        const ix1 = Math.min(this.w - 1, this._ix(fx1));
        const iz0 = Math.max(0, this._iz(fz0));
        const iz1 = Math.min(this.h - 1, this._iz(fz1));
        for (let iz = iz0; iz <= iz1; iz++) {
          for (let ix = ix0; ix <= ix1; ix++) {
            const idx = iz * this.w + ix;
            lv.flags[idx] &= ~F_WALK;
            lv.flags[idx] |= F_STAIR;
          }
        }
      }

      // Tread centreline, bottom -> top.
      const treads = [];
      for (let i = 0; i < s.steps; i++) {
        treads.push(new THREE.Vector3(
          s.x,
          fromY + s.rise * (i + 1),
          s.zBottom + dirZ * (s.run * i + s.run / 2)
        ));
      }

      const bottoms = this._approachNodes(s, s.zBottom, fromY, -dirZ, treads[0]);
      const tops = this._approachNodes(s, topZ, toY, dirZ, treads[treads.length - 1]);
      if (!bottoms.length || !tops.length) {
        console.warn(`[nav] stair "${s.id}" has no usable approach (${bottoms.length}/${tops.length})`);
      }

      for (const b of bottoms) {
        for (const t of tops) {
          const poly = [b.point.clone(), ...treads.map((v) => v.clone()), t.point.clone()];
          let cost = 0;
          for (let i = 1; i < poly.length; i++) {
            cost += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].z - poly[i - 1].z)
              + Math.abs(poly[i].y - poly[i - 1].y) * 0.6;
          }
          cost *= 1.12; // stairs are slower than open floor
          const link = { id: s.id, from: b.node, to: t.node, cost, poly };
          this.stairLinks.push(link);
          this._addLink(b.node, t.node, cost, poly, s.id);
          this._addLink(t.node, b.node, cost, poly.slice().reverse(), s.id);
        }
      }
    }
  }

  /**
   * Landing spots for one end of a flight: straight off the end first, then
   * sideways beside the last few treads. Every walkable candidate becomes a
   * link, so a flight that only opens sideways (the central one, whose head
   * runs into the mezzanine's outer wall) is still usable.
   *
   * The sideways probes step back along the flight in cell-sized increments,
   * because the head of a flight is usually the one place the wall behind it
   * pushes the first legal standing spot a cell or two down the run.
   */
  _approachNodes(stair, anchorZ, y, outward, tread = null) {
    const x = stair.x;
    const side = stair.width / 2 + this.radius + 0.3;
    // One lane per exit direction, each probed from the head backwards; the
    // first clear spot in a lane wins, so a flight ends up with at most three
    // links per end instead of a fan of near-identical edges.
    const lanes = [
      [new THREE.Vector3(x, y, anchorZ + outward * 0.62),
        new THREE.Vector3(x, y, anchorZ + outward * 0.95)],
      [], [],
    ];
    for (const back of [0.15, 0.5, 0.85, 1.2]) {
      lanes[1].push(new THREE.Vector3(x - side, y, anchorZ - outward * back));
      lanes[2].push(new THREE.Vector3(x + side, y, anchorZ - outward * back));
    }

    const out = [];
    const seen = new Set();
    const probe = (lane) => {
      for (const c of lane) {
        if (!this.isWalkable(c)) continue;
        // Being walkable is not enough: the cell has to be on the same side of
        // the geometry as the treads. Straight off the central flight's foot is
        // open floor in `eastlink`, but `wall:stairwell` stands between; beside
        // its head is open landing, but the balustrade stands between. Both make
        // a link an agent grinds against instead of a route it can walk.
        if (tread && !this._reachesTread(c, tread)) continue;
        const node = this._nodeAt(c);
        if (node < 0 || seen.has(node)) continue;
        seen.add(node);
        out.push({ node, point: this._nodeCenter(node) });
        return true;
      }
      return false;
    };
    for (const lane of lanes) probe(lane);
    if (!out.length) {
      const snap = this.nearestWalkable(new THREE.Vector3(x, y, anchorZ + outward * 0.62), 4.5);
      if (snap) {
        const node = this._nodeAt(snap);
        if (node >= 0) out.push({ node, point: this._nodeCenter(node) });
      }
    }
    return out;
  }

  /**
   * Can a body actually get from an approach cell onto the flight? Sweeps the
   * widest agent capsule in the game — the player's, which also has the lowest
   * step-up — straight at the tread and asks whether it arrives.
   *
   * @param {THREE.Vector3} from approach candidate
   * @param {THREE.Vector3} tread centre of the tread at that end of the flight
   * @returns {boolean}
   */
  _reachesTread(from, tread) {
    const collision = this.collision;
    if (!collision?.moveCapsule) return true;
    const opts = { radius: 0.33, height: 1.82, stepHeight: 0.34 };
    const dt = 1 / 120;
    let pos = from.clone();
    const vel = new THREE.Vector3();
    let stalled = 0;
    for (let k = 0; k < 90; k++) {
      const dx = tread.x - pos.x;
      const dz = tread.z - pos.z;
      const left = Math.hypot(dx, dz);
      if (left < 0.3) return true;
      const speed = Math.min(2.4, left / dt);
      vel.set((dx / left) * speed, -4, (dz / left) * speed);
      const res = collision.moveCapsule(pos, vel, dt, opts);
      // A frame or two of no lateral progress is a step-up resolving; more than
      // that and the sweep is wedged against something.
      stalled = Math.hypot(res.position.x - pos.x, res.position.z - pos.z) < 1e-4 ? stalled + 1 : 0;
      pos = res.position;
      if (stalled > 3) return false;
    }
    return Math.hypot(tread.x - pos.x, tread.z - pos.z) < 0.3;
  }

  _addLink(from, to, cost, poly, stair) {
    if (!this.links.has(from)) this.links.set(from, []);
    this.links.get(from).push({ to, cost, poly, stair });
  }

  /**
   * Keep only the largest connected component; clear F_WALK everywhere else.
   *
   * The level ships with sealed pockets — the ground-floor west stair loses its
   * only door to a wall segment `build.js` places over the authored opening, so
   * its 63 cells form an island. Left in the grid they are poison: agents get
   * dropped there by `nearestWalkable`, `randomPointNear` picks investigation
   * spots inside them, and every A* out of them fails for ever. Pruning makes
   * "walkable" mean "reachable", which is the only definition callers can use.
   *
   * Runs after the stair links exist so the two storeys count as one component.
   */
  _pruneIslands() {
    const per = this.w * this.h;
    const total = per * this.levels.length;
    const comp = new Int32Array(total).fill(-1);
    const stack = new Int32Array(total);
    const sizes = [];

    for (let seed = 0; seed < total; seed++) {
      if (comp[seed] !== -1 || !this._nodeWalkable(seed)) continue;
      const id = sizes.length;
      let size = 0;
      let sp = 0;
      stack[sp++] = seed;
      comp[seed] = id;
      while (sp > 0) {
        const cur = stack[--sp];
        size++;
        const li = Math.floor(cur / per);
        const rest = cur - li * per;
        const iz = Math.floor(rest / this.w);
        const ix = rest - iz * this.w;
        const lv = this.levels[li];
        for (let d = 0; d < 8; d++) {
          const nx = ix + NEIGH[d * 2];
          const nz = iz + NEIGH[d * 2 + 1];
          if (nx < 0 || nz < 0 || nx >= this.w || nz >= this.h) continue;
          const nIdx = nz * this.w + nx;
          if (!(lv.flags[nIdx] & F_WALK)) continue;
          if (NEIGH[d * 2] !== 0 && NEIGH[d * 2 + 1] !== 0) {
            if (!(lv.flags[iz * this.w + nx] & F_WALK)) continue;
            if (!(lv.flags[nz * this.w + ix] & F_WALK)) continue;
          }
          const nNode = li * per + nIdx;
          if (comp[nNode] !== -1) continue;
          comp[nNode] = id;
          stack[sp++] = nNode;
        }
        // Stair links are bidirectional, so following them here is enough.
        for (const link of this.links.get(cur) || []) {
          if (comp[link.to] !== -1 || !this._nodeWalkable(link.to)) continue;
          comp[link.to] = id;
          stack[sp++] = link.to;
        }
      }
      sizes.push(size);
    }

    let keep = -1;
    for (let i = 0; i < sizes.length; i++) if (keep < 0 || sizes[i] > sizes[keep]) keep = i;
    let pruned = 0;
    if (keep >= 0) {
      for (let node = 0; node < total; node++) {
        if (comp[node] === -1 || comp[node] === keep) continue;
        const li = Math.floor(node / per);
        this.levels[li].flags[node - li * per] &= ~F_WALK;
        pruned++;
      }
    }
    this.stats.islands = Math.max(0, sizes.length - 1);
    this.stats.pruned = pruned;
  }

  /** Coarse room graph used when the grid search fails. */
  _bakeRoomGraph() {
    const nodes = new Map();
    for (const r of ROOMS) {
      nodes.set(`${r.floor}:${r.id}`, {
        key: `${r.floor}:${r.id}`,
        room: r,
        center: new THREE.Vector3((r.x0 + r.x1) / 2, FLOOR_Y[r.floor] ?? 0, (r.z0 + r.z1) / 2),
        edges: [],
      });
    }
    const addEdge = (a, b, portal, cost) => {
      const na = nodes.get(a);
      const nb = nodes.get(b);
      if (!na || !nb || na === nb) return;
      na.edges.push({ to: b, portal: portal.clone(), cost });
      nb.edges.push({ to: a, portal: portal.clone(), cost });
    };

    for (const o of OPENINGS) {
      if (!OPENING_TYPES.has(o.type)) continue;
      const isZ = o.axis === 'z';
      const px = isZ ? o.coord : o.at;
      const pz = isZ ? o.at : o.coord;
      const probe = 0.85;
      const a = isZ ? roomAt(px - probe, pz, o.floor) : roomAt(px, pz - probe, o.floor);
      const b = isZ ? roomAt(px + probe, pz, o.floor) : roomAt(px, pz + probe, o.floor);
      if (!a || !b) continue;
      const portal = new THREE.Vector3(px, FLOOR_Y[o.floor] ?? 0, pz);
      const cost = portal.distanceTo(nodes.get(`${o.floor}:${a.id}`).center)
        + portal.distanceTo(nodes.get(`${o.floor}:${b.id}`).center)
        + (o.door ? 2 : 0.5);
      addEdge(`${o.floor}:${a.id}`, `${o.floor}:${b.id}`, portal, cost);
    }

    // Stair edges tie the two storeys together.
    for (const s of STAIRS) {
      const bottom = roomAt(s.x, s.zBottom - Math.sign(s.zBottom) * 0.1, s.fromFloor)
        || ROOMS.find((r) => r.id === s.room && r.floor === s.fromFloor);
      const topZ = s.zBottom - s.run * s.steps;
      const top = roomAt(s.x, topZ + Math.sign(topZ - s.zBottom) * 0.2, s.toFloor);
      if (!bottom || !top) continue;
      const portal = new THREE.Vector3(s.x, FLOOR_Y[s.toFloor] ?? 4, topZ);
      addEdge(`${s.fromFloor}:${bottom.id}`, `${s.toFloor}:${top.id}`, portal, s.run * s.steps + 6);
    }

    this.rooms = { nodes, edges: [] };
  }

  // ------------------------------------------------------------- indexing --

  _ix(x) { return Math.round((x - this.minX) / this.cell); }
  _iz(z) { return Math.round((z - this.minZ) / this.cell); }
  _x(ix) { return this.minX + ix * this.cell; }
  _z(iz) { return this.minZ + iz * this.cell; }

  _levelFor(y) {
    return floorForY(y) === 'upper' ? 1 : 0;
  }

  /** Node id for a world point on its own storey, or -1 when out of bounds. */
  _nodeAt(v, levelHint = -1) {
    if (!v) return -1;
    const li = levelHint >= 0 ? levelHint : this._levelFor(v.y ?? 0);
    const ix = this._ix(v.x);
    const iz = this._iz(v.z);
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return -1;
    return li * (this.w * this.h) + iz * this.w + ix;
  }

  _nodeCenter(node, out = new THREE.Vector3()) {
    const per = this.w * this.h;
    const li = Math.floor(node / per);
    const rest = node - li * per;
    const iz = Math.floor(rest / this.w);
    const ix = rest - iz * this.w;
    const lv = this.levels[li];
    const support = lv ? lv.support[rest] : NaN;
    return out.set(this._x(ix), Number.isNaN(support) ? (lv?.y ?? 0) : support, this._z(iz));
  }

  _nodeWalkable(node) {
    if (node < 0) return false;
    const per = this.w * this.h;
    const li = Math.floor(node / per);
    const lv = this.levels[li];
    if (!lv) return false;
    return (lv.flags[node - li * per] & F_WALK) !== 0;
  }

  _nodeCost(node) {
    const per = this.w * this.h;
    const li = Math.floor(node / per);
    const lv = this.levels[li];
    if (!lv) return 1;
    return lv.cost[node - li * per] || 1;
  }

  // ---------------------------------------------------------------- public --

  /** Is a world point on walkable floor? */
  isWalkable(v) {
    if (!this.levels.length || !v) return false;
    return this._nodeWalkable(this._nodeAt(v));
  }

  /**
   * The flight a point is standing on, or null.
   *
   * A flight is deliberately not in the grid — it is a link carrying a tread
   * polyline — so any point on one is off-mesh and `nearestWalkable` will snap
   * it to whichever end is closer. Agents use this to know they are mid-stair
   * and must finish the flight before re-planning, or a re-plan halfway down
   * turns them round and walks them back up.
   */
  stairAt(v, pad = 0.2) {
    if (!v) return null;
    for (const s of STAIRS) {
      if (v.x < s.x - s.width / 2 - pad || v.x > s.x + s.width / 2 + pad) continue;
      const topZ = s.zBottom - s.run * s.steps;
      if (v.z < Math.min(s.zBottom, topZ) - pad || v.z > Math.max(s.zBottom, topZ) + pad) continue;
      const y0 = FLOOR_Y[s.fromFloor] ?? 0;
      const y1 = FLOOR_Y[s.toFloor] ?? 4;
      if (v.y < Math.min(y0, y1) - 0.4 || v.y > Math.max(y0, y1) + 0.4) continue;
      return s;
    }
    return null;
  }

  /** Door id governing a world point, or null. */
  doorIdAt(v) {
    if (!this.levels.length || !v) return null;
    const li = this._levelFor(v.y ?? 0);
    const ix = this._ix(v.x);
    const iz = this._iz(v.z);
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return null;
    const lv = this.levels[li];
    const idx = iz * this.w + ix;
    const d = lv.doorIdx[idx];
    return d >= 0 ? this.doorIds[d] : null;
  }

  /**
   * Nearest walkable point to `v`. Searches the point's own storey in
   * expanding rings, then the other storey, then gives up and returns null.
   */
  nearestWalkable(v, maxRadius = 8) {
    if (!this.levels.length || !v) return null;
    const primary = this._levelFor(v.y ?? 0);
    const order = primary === 0 ? [0, 1] : [1, 0];
    const rings = Math.ceil(maxRadius / this.cell);
    for (const li of order) {
      const cx = this._ix(v.x);
      const cz = this._iz(v.z);
      const per = this.w * this.h;
      const lv = this.levels[li];
      if (!lv) continue;
      for (let r = 0; r <= rings; r++) {
        let best = -1;
        let bestD = Infinity;
        for (let dz = -r; dz <= r; dz++) {
          for (let dx = -r; dx <= r; dx++) {
            if (r > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const ix = cx + dx;
            const iz = cz + dz;
            if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) continue;
            const idx = iz * this.w + ix;
            if (!(lv.flags[idx] & F_WALK)) continue;
            const px = this._x(ix);
            const pz = this._z(iz);
            const d = (px - v.x) * (px - v.x) + (pz - v.z) * (pz - v.z);
            if (d < bestD) { bestD = d; best = li * per + idx; }
          }
        }
        if (best >= 0) return this._nodeCenter(best);
      }
    }
    return null;
  }

  /**
   * A random walkable point within `radius` of `v`, using the caller's seeded
   * stream so each agent stays deterministic and independent.
   */
  randomPointNear(v, radius = 3, rng = this.rng) {
    if (!v) return null;
    const base = new THREE.Vector3(v.x, v.y ?? 0, v.z);
    for (let i = 0; i < 28; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = radius * Math.sqrt(rng.float());
      const p = new THREE.Vector3(base.x + Math.cos(a) * r, base.y, base.z + Math.sin(a) * r);
      if (this.isWalkable(p)) {
        const node = this._nodeAt(p);
        return this._nodeCenter(node);
      }
    }
    return this.nearestWalkable(base, Math.max(2, radius));
  }

  /**
   * String-pulled path from `from` to `to`.
   * @returns {THREE.Vector3[]|null} waypoints, excluding the start
   */
  findPath(from, to) {
    if (!this.built || !from || !to) return null;
    let a = this._nodeAt(from);
    let b = this._nodeAt(to);
    if (!this._nodeWalkable(a)) {
      const snap = this.nearestWalkable(from, 3.2);
      a = snap ? this._nodeAt(snap) : -1;
    }
    if (!this._nodeWalkable(b)) {
      const snap = this.nearestWalkable(to, 4.5);
      b = snap ? this._nodeAt(snap) : -1;
    }
    if (a < 0 || b < 0) {
      this.stats.failures++;
      return null;
    }
    if (a === b) {
      const end = this._nodeCenter(b);
      end.x = to.x; end.z = to.z;
      return [end];
    }

    const key = `${a}>${b}`;
    const cached = this._cache.get(key);
    if (cached) {
      this.stats.cacheHits++;
      return cached.map((p) => p.clone());
    }

    const raw = this._astar(a, b);
    let path;
    if (raw) {
      path = this._smooth(raw);
    } else {
      this.stats.fallbacks++;
      path = this._roomRoute(from, to);
      if (!path) {
        this.stats.failures++;
        return null;
      }
    }
    if (!path.length) return null;

    // Land exactly on the requested spot when it is itself walkable.
    const last = path[path.length - 1];
    if (this.isWalkable(to)) {
      last.x = to.x;
      last.z = to.z;
    }

    if (this._cache.size >= this._cacheLimit) {
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }
    this._cache.set(key, path.map((p) => p.clone()));
    return path;
  }

  /** Cheap "can I walk straight there" test used by agents before planning. */
  canWalkStraight(from, to) {
    return this._clearLine(from, to);
  }

  /** Drop cached paths (doors changed, restart, etc.). */
  invalidate() {
    this._cache.clear();
    return this;
  }

  /**
   * Rewind for a new run: drop the cached paths and put the fallback stream back
   * to the top.
   *
   * `invalidate()` alone is not enough, and cannot be, because it is also what a
   * door calls when it opens. `this.rng` is the default stream behind
   * `randomPointNear`, so every investigation point and cover slot an agent asks
   * for without passing its own Rng comes out of it. Left running across a
   * restart it starts the second run wherever the first one stopped, and two
   * runs from the same seed diverge within a few seconds.
   */
  resetRun() {
    this.invalidate();
    this.reseed();
    return this;
  }

  reseed(seed = 'northstar:nav') {
    this.rng.reseed(typeof seed === 'string' ? hashString(seed) : seed);
    return this;
  }

  // -------------------------------------------------------------- search ---

  _astar(start, goal) {
    this.stats.searches++;
    const g = this._gScore;
    const f = this._fScore;
    const from = this._from;
    const stamp = this._stamp;
    const closed = this._closed;
    if (this._gen >= 0x7ffffffe) {
      this._gen = 0;
      this._stamp.fill(0);
      this._closed.fill(0);
    }
    const gen = ++this._gen;
    const heap = this._heap;
    heap.clear();

    const per = this.w * this.h;
    const goalC = this._nodeCenter(goal, _v1).clone();

    const h = (node) => {
      const c = this._nodeCenter(node, _v2);
      const dx = Math.abs(c.x - goalC.x);
      const dz = Math.abs(c.z - goalC.z);
      const octile = (dx + dz) + (DIAG - 2) * Math.min(dx, dz);
      const dy = Math.abs(Math.floor(node / per) - Math.floor(goal / per)) * 4.0;
      return octile + dy;
    };

    stamp[start] = gen;
    closed[start] = 0;
    g[start] = 0;
    f[start] = h(start);
    from[start] = -1;
    heap.push(start);

    let expanded = 0;
    while (heap.size > 0) {
      const cur = heap.pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen;
      if (cur === goal) return this._reconstruct(from, start, goal);
      if (++expanded > this.maxSearchNodes) break;

      const li = Math.floor(cur / per);
      const rest = cur - li * per;
      const iz = Math.floor(rest / this.w);
      const ix = rest - iz * this.w;
      const lv = this.levels[li];

      for (let d = 0; d < 8; d++) {
        const dx = NEIGH[d * 2];
        const dz = NEIGH[d * 2 + 1];
        const nx = ix + dx;
        const nz = iz + dz;
        if (nx < 0 || nz < 0 || nx >= this.w || nz >= this.h) continue;
        const nIdx = nz * this.w + nx;
        if (!(lv.flags[nIdx] & F_WALK)) continue;
        if (dx !== 0 && dz !== 0) {
          // No corner cutting: both orthogonal cells must be open.
          if (!(lv.flags[iz * this.w + nx] & F_WALK)) continue;
          if (!(lv.flags[nz * this.w + ix] & F_WALK)) continue;
        }
        const nNode = li * per + nIdx;
        const step = (dx !== 0 && dz !== 0 ? DIAG : 1) * this.cell * lv.cost[nIdx];
        const tentative = g[cur] + step;
        if (stamp[nNode] !== gen) {
          stamp[nNode] = gen;
          closed[nNode] = 0;
          g[nNode] = Infinity;
        }
        if (tentative < g[nNode]) {
          g[nNode] = tentative;
          from[nNode] = cur;
          f[nNode] = tentative + h(nNode);
          heap.push(nNode);
        }
      }

      const links = this.links.get(cur);
      if (links) {
        for (const link of links) {
          if (!this._nodeWalkable(link.to)) continue;
          const tentative = g[cur] + link.cost;
          const nNode = link.to;
          if (stamp[nNode] !== gen) {
            stamp[nNode] = gen;
            closed[nNode] = 0;
            g[nNode] = Infinity;
          }
          if (tentative < g[nNode]) {
            g[nNode] = tentative;
            from[nNode] = cur;
            f[nNode] = tentative + h(nNode);
            heap.push(nNode);
          }
        }
      }
    }
    return null;
  }

  _reconstruct(from, start, goal) {
    const nodes = [];
    let cur = goal;
    let guard = 0;
    while (cur !== -1 && guard++ < 1 << 16) {
      nodes.push(cur);
      if (cur === start) break;
      cur = from[cur];
    }
    nodes.reverse();

    // Expand stair edges into their tread polylines and mark the runs so the
    // funnel pass never string-pulls across a flight.
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const point = this._nodeCenter(node);
      out.push({ point, node, stair: false });
      const next = nodes[i + 1];
      if (next === undefined) continue;
      const link = (this.links.get(node) || []).find((l) => l.to === next);
      if (!link) continue;
      for (let k = 1; k < link.poly.length - 1; k++) {
        out.push({ point: link.poly[k].clone(), node: -1, stair: true });
      }
    }
    return out;
  }

  /**
   * Funnel / string-pull. Treads pass through verbatim so a flight is walked
   * as authored; each run of same-storey cells between flights is pulled taut
   * so agents cut corners instead of stepping along the grid diagonals.
   */
  _smooth(raw) {
    const pts = [];
    let i = 0;
    while (i < raw.length) {
      if (raw[i].stair) {
        pts.push(raw[i].point.clone());
        i++;
        continue;
      }
      let end = i;
      while (end + 1 < raw.length && !raw[end + 1].stair) end++;
      if (end === i) {
        pts.push(raw[i].point.clone());
      } else {
        // The anchor is only dropped for the first run, where it is the agent's
        // own cell. After a flight it is the landing spot at the foot of the
        // stairs, and dropping it aims the agent diagonally across the stairwell
        // from the last tread instead of stepping off the flight first.
        if (i > 0) pts.push(raw[i].point.clone());
        // Greedy: from the anchor, keep the furthest node still in the clear.
        let a = i;
        while (a < end) {
          let b = end;
          while (b > a + 1 && !this._clearLine(raw[a].point, raw[b].point)) b--;
          pts.push(raw[b].point.clone());
          a = b;
        }
      }
      i = end + 1;
    }
    if (!pts.length) pts.push(raw[raw.length - 1].point.clone());

    // Drop duplicates and the start point.
    const out = [];
    for (const p of pts) {
      const prev = out[out.length - 1];
      if (prev && prev.distanceToSquared(p) < 0.0025) continue;
      out.push(p);
    }
    if (out.length > 1 && out[0].distanceToSquared(raw[0].point) < 0.0025) out.shift();
    return out;
  }

  /**
   * Corridor test: every sample along a-b, and the same sample pushed to both
   * sides by the agent radius, must be walkable on the same storey.
   */
  _clearLine(a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-4) return true;
    if (Math.abs((b.y ?? 0) - (a.y ?? 0)) > 1.2) return false;
    const nx = -dz / dist;
    const nz = dx / dist;
    const steps = Math.max(2, Math.ceil(dist / (this.cell * 0.7)));
    const off = this.radius * 0.72;
    const probe = _v3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const py = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t;
      probe.set(px, py, pz);
      if (!this.isWalkable(probe)) return false;
      probe.set(px + nx * off, py, pz + nz * off);
      if (!this.isWalkable(probe)) return false;
      probe.set(px - nx * off, py, pz - nz * off);
      if (!this.isWalkable(probe)) return false;
    }
    return true;
  }

  // -------------------------------------------------------- room fallback --

  /** Coarse route through the room graph, snapped back onto the grid. */
  _roomRoute(from, to) {
    const startRoom = this._roomKeyAt(from);
    const goalRoom = this._roomKeyAt(to);
    if (!startRoom || !goalRoom) return null;
    if (startRoom === goalRoom) {
      const snap = this.nearestWalkable(to, 5);
      return snap ? [snap] : null;
    }

    const dist = new Map([[startRoom, 0]]);
    const prev = new Map();
    const open = [startRoom];
    const done = new Set();
    while (open.length) {
      open.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
      const cur = open.shift();
      if (done.has(cur)) continue;
      done.add(cur);
      if (cur === goalRoom) break;
      const node = this.rooms.nodes.get(cur);
      if (!node) continue;
      for (const e of node.edges) {
        const nd = (dist.get(cur) ?? Infinity) + e.cost;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, { from: cur, portal: e.portal });
          open.push(e.to);
        }
      }
    }
    if (!prev.has(goalRoom) && startRoom !== goalRoom) return null;

    const chain = [];
    let cur = goalRoom;
    let guard = 0;
    while (cur !== startRoom && guard++ < 64) {
      const step = prev.get(cur);
      if (!step) return null;
      chain.push(step.portal);
      cur = step.from;
    }
    chain.reverse();

    const out = [];
    for (const portal of chain) {
      const snap = this.nearestWalkable(portal, 2.6);
      if (!snap) continue;
      const prevPoint = out[out.length - 1];
      if (prevPoint && prevPoint.distanceToSquared(snap) < 0.09) continue;
      out.push(snap);
    }
    const end = this.nearestWalkable(to, 5);
    if (end) out.push(end);
    if (!out.length) return null;

    // The coarse graph knows which rooms touch, not how to walk between
    // storeys: a route it builds across a stair edge snaps both portals onto
    // their own floor and asks the agent to step 4 m into the air. Only A*
    // understands the flights, so reject anything that changes level.
    let at = from;
    for (const p of out) {
      if (Math.abs((p.y ?? 0) - (at.y ?? 0)) > 1.2) return null;
      at = p;
    }
    return out;
  }

  _roomKeyAt(v) {
    const floor = floorForY(v.y ?? 0);
    let room = roomAt(v.x, v.z, floor);
    if (!room) room = roomAt(v.x, v.z, floor === 'upper' ? 'ground' : 'upper');
    return room ? `${room.floor}:${room.id}` : null;
  }

  // ----------------------------------------------------------------- debug --

  /**
   * Debug geometry for the QA overlay: one point per walkable cell (blue on
   * the ground floor, amber upstairs, red on door cells) plus a line per
   * stair link. Built lazily and reused.
   */
  debugMesh() {
    if (this._debug) return this._debug;
    const group = new THREE.Group();
    group.name = 'nav:debug';
    if (!this.built) return group;

    const per = this.w * this.h;
    for (let li = 0; li < this.levels.length; li++) {
      const lv = this.levels[li];
      const pos = [];
      const col = [];
      const base = li === 0 ? [0.25, 0.62, 1.0] : [1.0, 0.72, 0.24];
      for (let idx = 0; idx < per; idx++) {
        if (!(lv.flags[idx] & F_WALK)) continue;
        const iz = Math.floor(idx / this.w);
        const ix = idx - iz * this.w;
        const y = Number.isNaN(lv.support[idx]) ? lv.y : lv.support[idx];
        pos.push(this._x(ix), y + 0.04, this._z(iz));
        if (lv.flags[idx] & F_DOOR) col.push(1.0, 0.28, 0.24);
        else if (lv.flags[idx] & F_OPENING) col.push(0.45, 1.0, 0.5);
        else col.push(base[0], base[1], base[2]);
      }
      if (!pos.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({
        size: this.cell * 0.6, vertexColors: true, sizeAttenuation: true,
        transparent: true, opacity: 0.75, depthWrite: false,
      }));
      points.name = `nav:cells:${lv.key}`;
      group.add(points);
    }

    const linkPos = [];
    for (const link of this.stairLinks) {
      for (let i = 1; i < link.poly.length; i++) {
        const a = link.poly[i - 1];
        const b = link.poly[i];
        linkPos.push(a.x, a.y + 0.1, a.z, b.x, b.y + 0.1, b.z);
      }
    }
    if (linkPos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3));
      const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x7cffb2, transparent: true, opacity: 0.9, depthWrite: false,
      }));
      lines.name = 'nav:stairlinks';
      group.add(lines);
    }

    group.visible = false;
    this._debug = group;
    return group;
  }

  /** Debug helper: turn a path into a line the overlay can add to the scene. */
  pathMesh(path, color = 0xffe066) {
    const geo = new THREE.BufferGeometry();
    const pts = [];
    for (const p of path || []) pts.push(p.x, p.y + 0.12, p.z);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, depthWrite: false }));
  }

  toJSON() {
    return {
      cell: this.cell,
      bounds: [+this.minX.toFixed(2), +this.minZ.toFixed(2), this.w, this.h],
      levels: this.levels.map((l) => l.key),
      ...this.stats,
    };
  }
}

/**
 * Where an agent should pick a freshly planned path up.
 *
 * A path always starts from the agent's *snapped* cell, which can be behind
 * where the agent physically stands — most visibly at a stair head, where the
 * standing spot is a cell the grid calls a shaft. Starting such a path at index
 * 0 walks the agent backwards, and since planning is throttled it then turns
 * round again half a second later and never leaves the spot. Skip any leading
 * waypoint the agent is provably past: it has to be behind them along the leg
 * *and* the agent has to be nearer the next waypoint than that leg is long,
 * which is conservative enough never to skip a flight or a doorway.
 */
export function resumeIndex(pos, path) {
  let i = 0;
  while (i + 1 < path.length) {
    const w = path[i];
    const n = path[i + 1];
    const lx = n.x - w.x;
    const lz = n.z - w.z;
    if (lx * (pos.x - w.x) + lz * (pos.z - w.z) <= 0) break;
    if (Math.hypot(pos.x - n.x, pos.z - n.z) >= Math.hypot(lx, lz)) break;
    i++;
  }
  return i;
}

/**
 * One step of stair traversal, shared by hostiles and hostages.
 *
 * A flight is an off-mesh link whose waypoints are the tread centres, and the
 * capsule sweep cannot use it. The only way into the central flight is sideways
 * out of the stairwell aisle — a full-height wall stands 0.6 m off the bottom
 * step, so there is nowhere to stand in front of it — and a sweep refuses a
 * sideways step-up because the capsule already overlaps the tread box it would
 * have to climb onto. Inside a footprint the link guarantees is clear, moving
 * the agent along the treads directly is both safe and exact.
 *
 * The vertical rate follows the flight's slope and is taken *out of* the
 * horizontal budget, so walking up a staircase is never faster than walking.
 *
 * @param {{position:THREE.Vector3, velocity:THREE.Vector3}} agent
 * @param {number} dt
 * @param {number} climbY tread height to ease toward
 * @returns {number} distance actually covered this step
 */
export function climbStep(agent, dt, climbY) {
  const pos = agent.position;
  const vx = agent.velocity.x;
  const vz = agent.velocity.z;
  const speed = Math.hypot(vx, vz);
  const dy = climbY - pos.y;
  // 0.72 is the rise/run of both flights; the 0.6 floor lets an agent that has
  // stopped mid-flight still settle onto the tread it is standing on.
  const vRate = Math.min(Math.abs(dy) / Math.max(1e-5, dt), Math.max(0.6, speed * 0.72));
  const scale = speed > 1e-4 ? Math.sqrt(Math.max(0, 1 - (vRate / speed) ** 2)) : 0;

  const x0 = pos.x; const y0 = pos.y; const z0 = pos.z;
  pos.x += vx * scale * dt;
  pos.z += vz * scale * dt;
  pos.y += Math.sign(dy) * vRate * dt;
  agent.velocity.y = 0;
  agent.grounded = true;
  agent.hitWall = false;
  return Math.hypot(pos.x - x0, pos.y - y0, pos.z - z0);
}

/**
 * How far outside a flight's footprint an agent's capsule still overlaps the
 * tread boxes, and so how far out the sweep must stay switched off. Anything
 * inside this band is either on the flight or in the act of stepping off the
 * bottom of it; running the sweep there reads the tread overlap as deep
 * penetration and ejects the agent clear of the whole staircase.
 */
export const STAIR_SWEEP_PAD = 0.45;

/**
 * How far from a flight an agent may begin a link. Wider than the sweep band
 * because the central flight is entered sideways from the stairwell aisle.
 */
export const STAIR_ENTRY_PAD = 0.8;

const NEIGH = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1];
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

export default NavGrid;
