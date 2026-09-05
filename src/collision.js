import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Collision, in the ground plane.
//
// Everything the truck can hit is a circle (x, z, r) or an oriented box
// (cx, cz, halfW, halfL, heading) with a tag and a `hard` flag; the truck is
// three circles along its own axis. A uniform grid hash is the broad phase.
// The static set is derived once at boot from the objects the other builders
// actually put in the scene — instance matrices, merged meshes, the fleet's
// footprints, the camp's placements — so it cannot drift from what is drawn.
// A small dynamic set (the lions) is refreshed every frame.
//
// Contract:
//   createCollisionWorld({ cell }) -> {
//     addCircle(x, z, r, { tag, hard }), addBox(cx, cz, hw, hl, heading, opts),
//     addSegment(x0, z0, x1, z1, halfWidth, opts),
//     addDynamic(ref, r, opts),     // ref has .position; re-read each frame
//     build(),                      // (re)build the grid; call after adding
//     updateDynamic(),
//     query(x, z, r, out),          // colliders whose shape meets the circle
//     truckContacts(x, z, heading, circles, out),
//     colliders(), stats, TAGS
//   }
//
// Heading convention is the driver's: forward is (sin h, cos h). A box's
// `halfL` runs along its heading, `halfW` across it.
// ---------------------------------------------------------------------------

export const TAGS = ['tree', 'rock', 'headwall', 'tent', 'structure', 'prop', 'vehicle', 'sign', 'lion'];

const CIRCLE = 0;
const BOX = 1;

export function createCollisionWorld({ cell = 8 } = {}) {
  const items = [];
  const dynamic = [];
  const grid = new Map();
  let stamp = 1;
  const stats = {
    count: 0,
    byTag: {},
    cells: 0,
    buildMs: 0,
    // per-frame cost of the driver's resolve, a rolling window for the report
    resolve: { samples: new Float32Array(600), n: 0, i: 0, mean: 0, p99: 0 },
    tests: 0,
    contacts: 0,
  };

  const key = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);

  function make(type, tag, hard, name) {
    return { type, tag: tag || 'prop', hard: hard !== false, name: name || null, x: 0, z: 0, r: 0, hw: 0, hl: 0, h: 0, sh: 0, ch: 1, minX: 0, maxX: 0, minZ: 0, maxZ: 0, stamp: 0 };
  }

  function addCircle(x, z, r, { tag, hard, name } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !(r > 0)) return null;
    const c = make(CIRCLE, tag, hard, name);
    c.x = x;
    c.z = z;
    c.r = r;
    c.minX = x - r;
    c.maxX = x + r;
    c.minZ = z - r;
    c.maxZ = z + r;
    items.push(c);
    return c;
  }

  function addBox(cx, cz, hw, hl, heading, { tag, hard, name } = {}) {
    if (![cx, cz, hw, hl, heading].every(Number.isFinite) || !(hw > 0) || !(hl > 0)) return null;
    const b = make(BOX, tag, hard, name);
    b.x = cx;
    b.z = cz;
    b.hw = hw;
    b.hl = hl;
    b.h = heading;
    b.sh = Math.sin(heading);
    b.ch = Math.cos(heading);
    // world AABB: |L·x| extents along each world axis
    const ex = Math.abs(b.ch) * hw + Math.abs(b.sh) * hl;
    const ez = Math.abs(b.sh) * hw + Math.abs(b.ch) * hl;
    b.minX = cx - ex;
    b.maxX = cx + ex;
    b.minZ = cz - ez;
    b.maxZ = cz + ez;
    b.r = Math.hypot(hw, hl);
    items.push(b);
    return b;
  }

  /** A wall or a line of something between two points, `halfWidth` thick. */
  function addSegment(x0, z0, x1, z1, halfWidth, opts) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz);
    if (L < 1e-3) return addCircle(x0, z0, halfWidth, opts);
    return addBox((x0 + x1) * 0.5, (z0 + z1) * 0.5, halfWidth, L * 0.5 + halfWidth * 0.5, Math.atan2(dx, dz), opts);
  }

  /** A circle that follows an object's world position, re-read every frame. */
  function addDynamic(ref, r, { tag = 'lion', hard = false, name } = {}) {
    const c = make(CIRCLE, tag, hard, name);
    c.r = r;
    c.ref = ref;
    dynamic.push(c);
    return c;
  }

  function updateDynamic() {
    for (const c of dynamic) {
      const p = c.ref.position || c.ref;
      c.x = p.x;
      c.z = p.z;
    }
  }

  function build() {
    const t0 = performance.now();
    grid.clear();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ix0 = Math.floor(it.minX / cell);
      const ix1 = Math.floor(it.maxX / cell);
      const iz0 = Math.floor(it.minZ / cell);
      const iz1 = Math.floor(it.maxZ / cell);
      for (let ix = ix0; ix <= ix1; ix++) {
        for (let iz = iz0; iz <= iz1; iz++) {
          const k = key(ix, iz);
          let list = grid.get(k);
          if (!list) grid.set(k, (list = []));
          list.push(i);
        }
      }
    }
    stats.count = items.length;
    stats.cells = grid.size;
    stats.byTag = {};
    for (const it of items) stats.byTag[it.tag] = (stats.byTag[it.tag] || 0) + 1;
    if (dynamic.length) stats.byTag[dynamic[0].tag] = (stats.byTag[dynamic[0].tag] || 0) + dynamic.length;
    stats.buildMs += performance.now() - t0;
    return stats;
  }

  /**
   * Circle (x, z, r) against one collider. Writes the contact into `out` and
   * returns true when they overlap: `n` points from the collider toward the
   * circle's centre, `pen` is how far to move the circle along `n` to separate
   * them, `p` is the point of contact on the collider.
   */
  function test(it, x, z, r, out) {
    stats.tests++;
    if (it.type === CIRCLE) {
      const dx = x - it.x;
      const dz = z - it.z;
      const d2 = dx * dx + dz * dz;
      const rr = r + it.r;
      if (d2 >= rr * rr) return false;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        out.nx = 0;
        out.nz = 1;
      } else {
        out.nx = dx / d;
        out.nz = dz / d;
      }
      out.pen = rr - d;
      out.px = it.x + out.nx * it.r;
      out.pz = it.z + out.nz * it.r;
      return true;
    }
    // box: into its frame. L = (sh, ch) along the heading, W = (ch, -sh) across.
    const dx = x - it.x;
    const dz = z - it.z;
    const lw = dx * it.ch - dz * it.sh;
    const ll = dx * it.sh + dz * it.ch;
    const aw = Math.abs(lw);
    const al = Math.abs(ll);
    if (aw < it.hw && al < it.hl) {
      // centre inside: leave by the nearest face
      const dw = it.hw - aw;
      const dl = it.hl - al;
      let nw = 0;
      let nl = 0;
      if (dw < dl) {
        nw = lw >= 0 ? 1 : -1;
        out.pen = dw + r;
      } else {
        nl = ll >= 0 ? 1 : -1;
        out.pen = dl + r;
      }
      out.nx = nw * it.ch + nl * it.sh;
      out.nz = -nw * it.sh + nl * it.ch;
      const cw = nw ? nw * it.hw : lw;
      const cl = nl ? nl * it.hl : ll;
      out.px = it.x + cw * it.ch + cl * it.sh;
      out.pz = it.z - cw * it.sh + cl * it.ch;
      return true;
    }
    const cw = Math.max(-it.hw, Math.min(it.hw, lw));
    const cl = Math.max(-it.hl, Math.min(it.hl, ll));
    const ew = lw - cw;
    const el = ll - cl;
    const d2 = ew * ew + el * el;
    if (d2 >= r * r) return false;
    const d = Math.sqrt(d2);
    const nw = ew / d;
    const nl = el / d;
    out.nx = nw * it.ch + nl * it.sh;
    out.nz = -nw * it.sh + nl * it.ch;
    out.pen = r - d;
    out.px = it.x + cw * it.ch + cl * it.sh;
    out.pz = it.z - cw * it.sh + cl * it.ch;
    return true;
  }

  const _c = { nx: 0, nz: 0, pen: 0, px: 0, pz: 0 };

  /** Every collider (static and dynamic) whose shape meets the circle. */
  function query(x, z, r, out = []) {
    out.length = 0;
    stamp++;
    const ix0 = Math.floor((x - r) / cell);
    const ix1 = Math.floor((x + r) / cell);
    const iz0 = Math.floor((z - r) / cell);
    const iz1 = Math.floor((z + r) / cell);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const list = grid.get(key(ix, iz));
        if (!list) continue;
        for (let k = 0; k < list.length; k++) {
          const it = items[list[k]];
          if (it.stamp === stamp) continue;
          it.stamp = stamp;
          if (test(it, x, z, r, _c)) out.push(it);
        }
      }
    }
    for (const it of dynamic) if (test(it, x, z, r, _c)) out.push(it);
    return out;
  }

  /**
   * Contacts for the truck: `circles` are [{ dz, r }] along its axis. Each
   * contact carries the collider, the normal, the penetration, the contact
   * point and the circle's offset along the truck (for the yaw lever arm).
   * Pooled: the returned objects are reused on the next call.
   */
  const pool = [];
  function truckContacts(x, z, heading, circles, out = []) {
    out.length = 0;
    const sh = Math.sin(heading);
    const ch = Math.cos(heading);
    for (let ci = 0; ci < circles.length; ci++) {
      const c = circles[ci];
      const cx = x + sh * c.dz;
      const cz = z + ch * c.dz;
      const r = c.r;
      const ix0 = Math.floor((cx - r) / cell);
      const ix1 = Math.floor((cx + r) / cell);
      const iz0 = Math.floor((cz - r) / cell);
      const iz1 = Math.floor((cz + r) / cell);
      // a fresh stamp per circle: the same collider may touch two circles and
      // both contacts are wanted, but only one test per collider per circle
      const local = ++stamp;
      for (let ix = ix0; ix <= ix1; ix++) {
        for (let iz = iz0; iz <= iz1; iz++) {
          const list = grid.get(key(ix, iz));
          if (!list) continue;
          for (let k = 0; k < list.length; k++) {
            const it = items[list[k]];
            if (it.stamp === local) continue;
            it.stamp = local;
            if (test(it, cx, cz, r, _c)) push(out, it, ci, c.dz);
          }
        }
      }
      for (const it of dynamic) if (test(it, cx, cz, r, _c)) push(out, it, ci, c.dz);
    }
    stats.contacts += out.length;
    return out;
  }

  /** The driver reports what its whole resolve cost this frame, in ms. */
  function sample(ms) {
    const s = stats.resolve;
    s.samples[s.i] = ms;
    s.i = (s.i + 1) % s.samples.length;
    if (s.n < s.samples.length) s.n++;
  }

  function push(out, it, ci, dz) {
    let c = pool[out.length];
    if (!c) pool[out.length] = c = {};
    c.collider = it;
    c.tag = it.tag;
    c.hard = it.hard;
    c.nx = _c.nx;
    c.nz = _c.nz;
    c.pen = _c.pen;
    c.px = _c.px;
    c.pz = _c.pz;
    c.circle = ci;
    c.dz = dz;
    out.push(c);
  }

  /** Signed clearance from a circle to the nearest collider (negative when inside), for the checks. */
  function clearance(x, z, r, { hardOnly = true, skipTags = null } = {}) {
    let best = Infinity;
    let nearest = null;
    const R = r + 12;
    const ix0 = Math.floor((x - R) / cell);
    const ix1 = Math.floor((x + R) / cell);
    const iz0 = Math.floor((z - R) / cell);
    const iz1 = Math.floor((z + R) / cell);
    stamp++;
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const list = grid.get(key(ix, iz));
        if (!list) continue;
        for (let k = 0; k < list.length; k++) {
          const it = items[list[k]];
          if (it.stamp === stamp) continue;
          it.stamp = stamp;
          if (hardOnly && !it.hard) continue;
          if (skipTags && skipTags.includes(it.tag)) continue;
          const d = distance(it, x, z) - r;
          if (d < best) {
            best = d;
            nearest = it;
          }
        }
      }
    }
    return { d: best, collider: nearest };
  }

  /** Distance from a point to a collider's edge (negative inside). */
  function distance(it, x, z) {
    const dx = x - it.x;
    const dz = z - it.z;
    if (it.type === CIRCLE) return Math.hypot(dx, dz) - it.r;
    const lw = Math.abs(dx * it.ch - dz * it.sh) - it.hw;
    const ll = Math.abs(dx * it.sh + dz * it.ch) - it.hl;
    if (lw <= 0 && ll <= 0) return Math.max(lw, ll);
    return Math.hypot(Math.max(lw, 0), Math.max(ll, 0));
  }

  function summary() {
    const s = stats.resolve;
    const arr = Array.from(s.samples.subarray(0, s.n)).sort((a, b) => a - b);
    const n = arr.length;
    s.mean = n ? arr.reduce((a, b) => a + b, 0) / n : 0;
    s.p99 = n ? arr[Math.min(n - 1, Math.floor(0.99 * n))] : 0;
    return {
      count: stats.count,
      dynamic: dynamic.length,
      byTag: { ...stats.byTag },
      cells: stats.cells,
      buildMs: +stats.buildMs.toFixed(2),
      resolveMs: { mean: +s.mean.toFixed(4), p99: +s.p99.toFixed(4), samples: n },
      tests: stats.tests,
      contacts: stats.contacts,
    };
  }

  const plain = (it) =>
    it.type === CIRCLE
      ? { type: 'circle', tag: it.tag, hard: it.hard, name: it.name, x: +it.x.toFixed(3), z: +it.z.toFixed(3), r: +it.r.toFixed(3) }
      : { type: 'box', tag: it.tag, hard: it.hard, name: it.name, x: +it.x.toFixed(3), z: +it.z.toFixed(3), hw: +it.hw.toFixed(3), hl: +it.hl.toFixed(3), heading: +it.h.toFixed(4) };

  return {
    TAGS,
    cell,
    addCircle,
    addBox,
    addSegment,
    addDynamic,
    updateDynamic,
    build,
    query,
    truckContacts,
    sample,
    clearance,
    distance,
    colliders: () => items.map(plain).concat(dynamic.map(plain)),
    get stats() {
      return summary();
    },
    /** For the tools: raw items, not copies. */
    items,
    dynamic,
  };
}

// ---------------------------------------------------------------------------
// Static registration from what the other modules built.
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _bb = new THREE.Box3();

/** Radius of a trunk prototype just above its root flare, in geometry units. */
function trunkBaseRadius(geo) {
  const pos = geo.attributes.position;
  if (!pos) return 0.25;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const y0 = geo.boundingBox.min.y;
  let r = 0;
  let any = false;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < y0 + 0.3 || y > y0 + 1.4) continue;
    const d = Math.hypot(pos.getX(i), pos.getZ(i));
    if (d > r) r = d;
    any = true;
  }
  if (!any) {
    // a stump or a very short trunk: the whole thing
    for (let i = 0; i < pos.count; i++) r = Math.max(r, Math.hypot(pos.getX(i), pos.getZ(i)));
  }
  return Math.max(0.12, Math.min(r, 1.5));
}

/**
 * Trees, kopje boulders, loose rock and termite mounds from the forest's
 * instanced meshes. Grass, scrub, forbs, litter, logs, billboards and the skirt
 * are skipped by name.
 */
export function registerForest(world, forest, { minRock = 0.6 } = {}) {
  const group = forest?.group;
  if (!group) return { trees: 0, rocks: 0 };
  group.updateMatrixWorld(true);
  const out = { trees: 0, rocks: 0 };
  const baseR = new Map();
  group.traverse((o) => {
    if (!o.isInstancedMesh || !o.count) return;
    const name = o.name || '';
    let kind = null;
    if (/^tree_.*_trunk$/.test(name)) kind = 'tree';
    else if (/^kopje_\d/.test(name)) kind = 'kopje';
    else if (/^rock_\d/.test(name)) kind = 'rock';
    else if (/^termite_\d/.test(name)) kind = 'termite';
    if (!kind) return;
    let rb = 0;
    if (kind === 'tree') {
      rb = baseR.get(o.geometry);
      if (rb === undefined) baseR.set(o.geometry, (rb = trunkBaseRadius(o.geometry)));
    }
    const e = _m.elements;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, _m);
      _m.premultiply(o.matrixWorld);
      const sx = Math.hypot(e[0], e[1], e[2]);
      const sz = Math.hypot(e[8], e[9], e[10]);
      const x = e[12];
      const z = e[14];
      if (kind === 'tree') {
        world.addCircle(x, z, rb * sx, { tag: 'tree', name });
        out.trees++;
      } else {
        // rockGeo / termiteGeo are unit-diameter: the instance scale is the
        // diameter. Skip what a tyre rolls over.
        const dia = Math.max(sx, sz);
        if (dia < minRock) continue;
        world.addCircle(x, z, dia * 0.5 * (kind === 'kopje' ? 0.9 : 0.85), { tag: 'rock', name });
        out.rocks++;
      }
    }
  });
  return out;
}

/** Trunk radius at the base of every tree in the forest (for the report). */
export function trunkRadii(forest) {
  const r = [];
  forest?.group?.traverse((o) => {
    if (o.isInstancedMesh && /^tree_.*_trunk$/.test(o.name)) r.push(trunkBaseRadius(o.geometry));
  });
  return r;
}

/**
 * Roadside props. The group is a handful of merged meshes, one per material,
 * with every post, plate and wall baked in world space; each piece the merge
 * was made from becomes one collider. If the roadside exports its `kit` (the
 * hand-off: `return { group, kit, update() {} }`), the parts are read before
 * the merge instead — one bounding box each, no clustering — and the boot
 * cost of this stage drops by most of an order of magnitude.
 *
 * Anything wholly above the truck's roof is ignored, so the raised boom of
 * the ranger's gate only counts where it is low enough to hit; anything a
 * tyre rolls over (under 0.32 m) is ignored too.
 *
 * Tags: concrete near a headwall → headwall; whitewashed stones → rock;
 * everything else along the road is signage.
 */
export function registerRoadside(world, roadside, terrain, { roofY = 2.6, minHeight = 0.32 } = {}) {
  const heads = terrain?.riverbed?.headwalls || [];
  const heightAt = terrain?.heightAt;
  let added = 0;
  // the ground under a piece is looked up once, at its centroid: a terrain
  // height is a road lookup, and the pieces are a few hundred, not the vertices
  const yCut = (pc) => {
    if (pc.maxY - pc.minY < minHeight) return -Infinity;
    pc.ground = heightAt ? heightAt(pc.cx, pc.cz) : pc.minY;
    return pc.ground + roofY;
  };
  const emit = (pc, name, text = name) => {
    const fit = pc?.box;
    if (!fit) return;
    if (pc.maxY - pc.minY < minHeight) return;
    if (pc.minY > pc.ground + roofY) return;
    // bolt heads and pegs go; a sign plate is thin but wide and stays
    if (fit.hw < 0.03 && fit.hl < 0.03) return;
    let tag = 'sign';
    const lower = text.toLowerCase();
    if (/concrete|rustpipe|dark/.test(lower) || heads.some((hw) => Math.hypot(hw.x - fit.cx, hw.z - fit.cz) < 6)) tag = 'headwall';
    else if (/lime/.test(lower)) tag = 'rock';
    if (fit.hl / fit.hw < 1.4) world.addCircle(fit.cx, fit.cz, Math.max(fit.hw, fit.hl), { tag, name });
    else world.addBox(fit.cx, fit.cz, fit.hw, fit.hl, fit.heading, { tag, name });
    added++;
  };
  const buckets = roadside?.kit?.buckets;
  if (buckets?.forEach) {
    // parts are cloned into the buckets already posed in world space
    buckets.forEach((list, key) => {
      for (const geo of list) emit(partPiece(geo, yCut), `roadside_${key}`);
    });
    return added;
  }
  const group = roadside?.group;
  if (!group) return 0;
  group.updateMatrixWorld(true);
  group.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    const mat = mesh.material;
    const matName = (mat && (mat.name || mat.map?.name)) || '';
    const meshName = mesh.name || '';
    for (const pc of connectedPieces(mesh.geometry, mesh.matrixWorld, yCut)) emit(pc, meshName, `${meshName} ${matName}`);
  });
  return added;
}

// a triangle that grows a cluster's footprint past this starts a new one
const SWELL = 1.15;
// m²: the slack a fragment may add to its parent — a bolt beside a post, the
// last ring of a lump — and lets a post's footprint grow from nothing
const SWELL_FLOOR = 0.05;

/**
 * Split a merged geometry into the pieces it was merged from, and fit each an
 * oriented box round its vertices below `yCut(piece)`.
 *
 * The kits concatenate part geometries in placement order, so a part's
 * triangles are contiguous in the buffer. One pass over the triangles in order
 * opens a new cluster wherever a triangle sits more than `gap` from the AABB of
 * the one being built or would swell it, then clusters whose AABBs nest are
 * merged: the faces of one box come back together, a headwall and the wing
 * wall abutting it do not. No weld and no union-find over vertices: this runs
 * once, cold, at boot, where the interpreter sets the cost, and the
 * ~34 k-vertex roadside used to spend it hashing every vertex.
 *
 * Anything under `small` across gets its circle straight from the AABB — a
 * post, a stone, a bolt — and is never fitted. The big pieces take their axis
 * from the covariance of their own vertices, and the extents along it.
 *
 * Returns [{ cx, cz, minY, maxY, box: { cx, cz, hw, hl, heading } | null }].
 */
function connectedPieces(geo, matrixWorld, yCut, { gap = 0.5, small = 0.7 } = {}) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const src = pos.array;
  const idx = geo.index ? geo.index.array : null;
  const triCount = idx ? idx.length / 3 : n / 3;
  // world positions
  let P = src;
  if (matrixWorld && !isIdentity(matrixWorld)) {
    P = new Float32Array(n * 3);
    const e = matrixWorld.elements;
    for (let i = 0; i < n; i++) {
      const x = src[i * 3];
      const y = src[i * 3 + 1];
      const z = src[i * 3 + 2];
      P[i * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
      P[i * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      P[i * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
  }
  // clusters of consecutive triangles: [t0, t1), xz AABB, y range, and the
  // centroid sums for the piece's position
  const cap = 64;
  let T0 = new Int32Array(cap);
  let T1 = new Int32Array(cap);
  let B = new Float64Array(cap * 6); // minX maxX minZ maxZ minY maxY
  let S = new Float64Array(cap * 2); // Σx Σz over triangle centroids
  let k = -1;
  const grow = () => {
    const c = T0.length * 2;
    const t0 = new Int32Array(c);
    t0.set(T0);
    T0 = t0;
    const t1 = new Int32Array(c);
    t1.set(T1);
    T1 = t1;
    const b = new Float64Array(c * 6);
    b.set(B);
    B = b;
    const s = new Float64Array(c * 2);
    s.set(S);
    S = s;
  };
  for (let t = 0; t < triCount; t++) {
    let a = t * 9;
    let b = a + 3;
    let c = a + 6;
    if (idx) {
      a = idx[t * 3] * 3;
      b = idx[t * 3 + 1] * 3;
      c = idx[t * 3 + 2] * 3;
    }
    const ax = P[a];
    const ay = P[a + 1];
    const az = P[a + 2];
    const bx = P[b];
    const by = P[b + 1];
    const bz = P[b + 2];
    const cx = P[c];
    const cy = P[c + 1];
    const cz = P[c + 2];
    // inline: six Math.min/max calls a triangle were most of this loop's cost
    // in the interpreter, which is what runs it
    let x0 = ax;
    let x1 = ax;
    if (bx < x0) x0 = bx;
    else if (bx > x1) x1 = bx;
    if (cx < x0) x0 = cx;
    else if (cx > x1) x1 = cx;
    let z0 = az;
    let z1 = az;
    if (bz < z0) z0 = bz;
    else if (bz > z1) z1 = bz;
    if (cz < z0) z0 = cz;
    else if (cz > z1) z1 = cz;
    let y0 = ay;
    let y1 = ay;
    if (by < y0) y0 = by;
    else if (by > y1) y1 = by;
    if (cy < y0) y0 = cy;
    else if (cy > y1) y1 = cy;
    let o = k * 6;
    // a new cluster where the triangle is off the AABB so far, or would swell
    // it: a wing wall's first triangle abuts the headwall's last, and is not
    // the same piece. A box's own faces fragment on this too and are put back
    // together below, where fragments nest.
    let apart = k < 0;
    if (!apart) {
      const bx0 = B[o];
      const bx1 = B[o + 1];
      const bz0 = B[o + 2];
      const bz1 = B[o + 3];
      if (x0 < bx0 || x1 > bx1 || z0 < bz0 || z1 > bz1) {
        if (x0 > bx1 + gap || x1 < bx0 - gap || z0 > bz1 + gap || z1 < bz0 - gap) apart = true;
        else {
          const ux0 = x0 < bx0 ? x0 : bx0;
          const ux1 = x1 > bx1 ? x1 : bx1;
          const uz0 = z0 < bz0 ? z0 : bz0;
          const uz1 = z1 > bz1 ? z1 : bz1;
          apart = (ux1 - ux0) * (uz1 - uz0) > (bx1 - bx0) * (bz1 - bz0) * SWELL + SWELL_FLOOR;
        }
      }
    }
    if (apart) {
      if (k >= 0) T1[k] = t;
      k++;
      if (k === T0.length) grow();
      o = k * 6;
      T0[k] = t;
      B[o] = x0;
      B[o + 1] = x1;
      B[o + 2] = z0;
      B[o + 3] = z1;
      B[o + 4] = y0;
      B[o + 5] = y1;
    } else {
      if (x0 < B[o]) B[o] = x0;
      if (x1 > B[o + 1]) B[o + 1] = x1;
      if (z0 < B[o + 2]) B[o + 2] = z0;
      if (z1 > B[o + 3]) B[o + 3] = z1;
      if (y0 < B[o + 4]) B[o + 4] = y0;
      if (y1 > B[o + 5]) B[o + 5] = y1;
    }
    const mx = (ax + bx + cx) / 3;
    const mz = (az + bz + cz) / 3;
    S[k * 2] += mx;
    S[k * 2 + 1] += mz;
  }
  if (k >= 0) T1[k] = triCount;
  const kc = k + 1;
  // Merge clusters that nest, or nearly: the faces of one box, the rings of
  // one lump, the bolts on a post, the bollards under a rail. Only neighbours
  // in the stream may merge — a part's fragments are consecutive, and the
  // rubble at a headwall's foot is not, however neatly it sits inside the
  // corner of the wall's AABB. Smallest union first, so the wing wall's root
  // end joins the wing before the face beside it gets the chance. Two parts
  // that merely touch make a union bigger than either by more than a fragment
  // ever does, and stay apart: the slack is absolute, since a ratio of an
  // 11 m² box is room enough for a stone. A few dozen clusters per mesh.
  const members = [];
  const order = [];
  for (let i = 0; i < kc; i++) {
    members.push([i]);
    order.push(i);
  }
  const area = (o) => (B[o + 1] - B[o]) * (B[o + 3] - B[o + 2]);
  for (const [swell, floor] of [
    [1.001, 0.002],
    [1, SWELL_FLOOR],
  ]) {
    for (;;) {
      let best = -1;
      let bestArea = Infinity;
      for (let q = 0; q + 1 < order.length; q++) {
        const oi = order[q] * 6;
        const oj = order[q + 1] * 6;
        if (B[oi] > B[oj + 1] + gap || B[oi + 1] < B[oj] - gap || B[oi + 2] > B[oj + 3] + gap || B[oi + 3] < B[oj + 2] - gap) continue;
        const au = (Math.max(B[oi + 1], B[oj + 1]) - Math.min(B[oi], B[oj])) * (Math.max(B[oi + 3], B[oj + 3]) - Math.min(B[oi + 2], B[oj + 2]));
        if (au > Math.max(area(oi), area(oj)) * swell + floor) continue;
        if (au < bestArea) {
          bestArea = au;
          best = q;
        }
      }
      if (best < 0) break;
      const i = order[best];
      const j = order[best + 1];
      const oi = i * 6;
      const oj = j * 6;
      B[oi] = Math.min(B[oi], B[oj]);
      B[oi + 1] = Math.max(B[oi + 1], B[oj + 1]);
      B[oi + 2] = Math.min(B[oi + 2], B[oj + 2]);
      B[oi + 3] = Math.max(B[oi + 3], B[oj + 3]);
      B[oi + 4] = Math.min(B[oi + 4], B[oj + 4]);
      B[oi + 5] = Math.max(B[oi + 5], B[oj + 5]);
      S[i * 2] += S[j * 2];
      S[i * 2 + 1] += S[j * 2 + 1];
      members[i].push(...members[j]);
      order.splice(best + 1, 1);
    }
  }
  const pieces = [];
  for (const p of order) {
    const pc = { cx: 0, cz: 0, minY: B[p * 6 + 4], maxY: B[p * 6 + 5], box: null };
    pieces.push(pc);
    const o = p * 6;
    let tris = 0;
    for (const i of members[p]) tris += T1[i] - T0[i];
    const mx = S[p * 2] / tris;
    const mz = S[p * 2 + 1] / tris;
    pc.cx = mx;
    pc.cz = mz;
    const hx = (B[o + 1] - B[o]) * 0.5;
    const hz = (B[o + 3] - B[o + 2]) * 0.5;
    const cut = yCut ? yCut(pc) : Infinity;
    if (pc.minY > cut) continue;
    if (Math.max(hx, hz) * 2 < small) {
      const r = Math.max(hx, hz);
      pc.box = { cx: (B[o] + B[o + 1]) * 0.5, cz: (B[o + 2] + B[o + 3]) * 0.5, hw: r, hl: r, heading: 0 };
      continue;
    }
    pc.box = fitBox(P, idx, members[p], T0, T1, cut, mx, mz);
  }
  return pieces;
}

/**
 * The oriented box round the vertices under `cut` of the triangle ranges
 * [T0[i], T1[i]) for i in `members`: principal axis of the vertices as a
 * heading, L = (sin h, cos h), then the extents along it. Vertices, not the
 * triangle centroids the stream gathers: a plate is two triangles, whose
 * centroids sit on its diagonal. Only the big pieces get here.
 */
function fitBox(P, idx, members, T0, T1, cut, mx, mz) {
  let vx = 0;
  let vz = 0;
  let vxx = 0;
  let vzz = 0;
  let vxz = 0;
  let cnt = 0;
  for (const i of members) {
    for (let t = T0[i]; t < T1[i]; t++) {
      const t3 = t * 3;
      for (let j = 0; j < 3; j++) {
        const v = (idx ? idx[t3 + j] : t3 + j) * 3;
        if (P[v + 1] > cut) continue;
        const dx = P[v] - mx;
        const dz = P[v + 2] - mz;
        vx += dx;
        vz += dz;
        vxx += dx * dx;
        vzz += dz * dz;
        vxz += dx * dz;
        cnt++;
      }
    }
  }
  if (cnt < 3) return null;
  vx /= cnt;
  vz /= cnt;
  const phi = 0.5 * Math.atan2(2 * (vxz / cnt - vx * vz), vxx / cnt - vx * vx - (vzz / cnt - vz * vz));
  const sh = Math.cos(phi);
  const ch = Math.sin(phi);
  let lMin = Infinity;
  let lMax = -Infinity;
  let wMin = Infinity;
  let wMax = -Infinity;
  for (const i of members) {
    for (let t = T0[i]; t < T1[i]; t++) {
      const t3 = t * 3;
      for (let j = 0; j < 3; j++) {
        const v = (idx ? idx[t3 + j] : t3 + j) * 3;
        if (P[v + 1] > cut) continue;
        const dx = P[v] - mx;
        const dz = P[v + 2] - mz;
        const l = dx * sh + dz * ch;
        const w = dx * ch - dz * sh;
        if (l < lMin) lMin = l;
        if (l > lMax) lMax = l;
        if (w < wMin) wMin = w;
        if (w > wMax) wMax = w;
      }
    }
  }
  const hl = (lMax - lMin) * 0.5;
  const hw = (wMax - wMin) * 0.5;
  const cl = (lMax + lMin) * 0.5;
  const cw = (wMax + wMin) * 0.5;
  const cx = mx + cw * ch + cl * sh;
  const cz = mz - cw * sh + cl * ch;
  const heading = Math.atan2(sh, ch);
  return hl >= hw ? { cx, cz, hw, hl, heading } : { cx, cz, hw: hl, hl: hw, heading: heading + Math.PI / 2 };
}

/**
 * One part of a kit, before the merge: the geometry is the whole piece, so
 * there is nothing to cluster — its bounding box (native) and, for a big one,
 * the fit over its vertices. This is the path the roadside takes if it ever
 * exports its kit; it costs a fraction of the merged-mesh pass.
 */
function partPiece(geo, yCut, small = 0.7) {
  const pos = geo.attributes.position;
  if (!pos || pos.count < 3) return null;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const pc = { cx: (bb.min.x + bb.max.x) * 0.5, cz: (bb.min.z + bb.max.z) * 0.5, minY: bb.min.y, maxY: bb.max.y, box: null };
  const cut = yCut ? yCut(pc) : Infinity;
  if (pc.minY > cut) return pc;
  const hx = (bb.max.x - bb.min.x) * 0.5;
  const hz = (bb.max.z - bb.min.z) * 0.5;
  if (Math.max(hx, hz) * 2 < small) {
    const r = Math.max(hx, hz);
    pc.box = { cx: pc.cx, cz: pc.cz, hw: r, hl: r, heading: 0 };
    return pc;
  }
  const idx = geo.index ? geo.index.array : null;
  _range0[0] = 0;
  _range1[0] = idx ? idx.length / 3 : pos.count / 3;
  pc.box = fitBox(pos.array, idx, _one, _range0, _range1, cut, pc.cx, pc.cz);
  return pc;
}
const _one = [0];
const _range0 = new Int32Array(1);
const _range1 = new Int32Array(1);

function isIdentity(m) {
  const e = m.elements;
  return e[0] === 1 && e[5] === 1 && e[10] === 1 && e[15] === 1 && e[12] === 0 && e[13] === 0 && e[14] === 0 && e[1] === 0 && e[2] === 0 && e[4] === 0 && e[6] === 0 && e[8] === 0 && e[9] === 0;
}

/** One oriented box per parked vehicle, from the fleet's own footprints. */
export function registerFleet(world, fleet) {
  let n = 0;
  for (const v of fleet?.vehicles || []) {
    const fp = v.bounds || v.footprint;
    if (!fp || !v.root) continue;
    const z0 = fp.z0 ?? -2;
    const z1 = fp.z1 ?? 2;
    const hw = Math.max(0.35, fp.hw ?? 1.0);
    const mid = (z0 + z1) * 0.5;
    const h = v.heading ?? 0;
    const cx = v.root.position.x + Math.sin(h) * mid;
    const cz = v.root.position.z + Math.cos(h) * mid;
    world.addBox(cx, cz, hw, (z1 - z0) * 0.5, h, { tag: 'vehicle', name: v.name || v.kind });
    n++;
  }
  return n;
}

/** The camp's footprints, already in world space (campground/index.js). */
export function registerCamp(world, camp) {
  let n = 0;
  for (const c of camp?.colliders || []) {
    const opts = { tag: c.tag, hard: c.hard !== false, name: c.name };
    if (c.type === 'circle') world.addCircle(c.x, c.z, c.r, opts) && n++;
    else if (c.type === 'box') world.addBox(c.x, c.z, c.hw, c.hl, c.heading, opts) && n++;
    else if (c.type === 'segment') world.addSegment(c.x0, c.z0, c.x1, c.z1, c.r, opts) && n++;
  }
  return n;
}

/** Lions as soft dynamic circles that follow the animals. */
export function registerWildlife(world, wildlife) {
  let n = 0;
  for (const a of wildlife?.animals || []) {
    if (!a.root) continue;
    const r = a.radius ?? (a.kind === 'cub' ? 0.7 : 1.2);
    world.addDynamic(a.root, r, { tag: 'lion', hard: false, name: a.kind });
    n++;
  }
  world.updateDynamic();
  return n;
}
