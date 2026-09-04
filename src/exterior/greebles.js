// Surface greebles (EXT-B): thousands of instanced hatches, machinery, tanks, masts, pipe runs,
// panel seams, trench fittings, lit window bands and warning lights scattered deterministically
// over the exposed hull surfaces (dorsal / ventral plates, side trenches, terrace roofs, tower
// neck, bridge roof, engine housing face) with three distance-toggled LOD bands.
// Signature: buildGreebles({ group, materials, camera }) -> { update(camera, dt, t), stats }
import * as THREE from "three";
import { rng } from "../kit.js";
import { hullTopY, hullBottomY, hullHalfWidth, trenchBand, TERRACES, terraceHalfWidth, TOWER, ENGINES, VENTRAL, HANGAR } from "../spec.js";
import { SHAPES, TINT, bash, triCount } from "./greebles_shapes.js";
import { weaponExclusions, terraceBaseHalfWidth } from "./weapons_layout.js";

/** Ship AABB used for the camera-distance LOD (metres, world). */
export const SHIP_BOX = new THREE.Box3(new THREE.Vector3(-480, -160, -1000), new THREE.Vector3(480, 345, 660));
/** Visibility ranges (camera distance to the ship AABB) per LOD band. */
export const LOD_RANGES = { large: Infinity, medium: 2500, small: 900 };

// Hull slopes (from spec.js linear functions): dx/dz of the side, dy/dz of the plates.
const SIDE_SLOPE = (0.965 * 480) / 1600; // trench wall x per z
const TOP_SLOPE = (0.4 * 130) / 1600;
const BOTTOM_SLOPE = (0.6 * 130) / 1600;
const FLOOR_SLOPE = (0.3 * 130) / 1600;

// ---------------------------------------------------------------------------
// Extra geometry: a pipe run lying on the surface, and a lit window band (cityLights quad)
// ---------------------------------------------------------------------------
function pipeRun() {
  return bash([{ geo: new THREE.CylinderGeometry(0.35, 0.35, 1, 8, 1, true), pos: [0, 0.38, 0], rot: [Math.PI / 2, 0, 0], color: TINT.mid }]);
}
/** Unit quad in the local xz plane facing +y: x = up the wall, z = along. UVs pick one window row. */
function windowBand() {
  const g = new THREE.BufferGeometry();
  // texture: 40 m per repeat along u, one of six window rows centred at v = 1/12; 1.2 m band = 0.03 v
  const v0 = 1 / 12 - 0.015;
  const v1 = 1 / 12 + 0.015;
  const A = [-0.5, 0, -0.5, 0, v0];
  const B = [0.5, 0, -0.5, 0, v1];
  const C = [0.5, 0, 0.5, 0.5, v1];
  const D = [-0.5, 0, 0.5, 0.5, v0];
  const verts = [A, C, B, A, D, C];
  const pos = new Float32Array(verts.flatMap((p) => [p[0], p[1], p[2]]));
  const uv = new Float32Array(verts.flatMap((p) => [p[3], p[4]]));
  const nor = new Float32Array(verts.flatMap(() => [0, 1, 0]));
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

// One InstancedMesh per entry (25). band = LOD tier; plain = no per-instance colour (emissive / lights).
const SET_DEFS = [
  { key: "bayPlate", geo: SHAPES.bayPlate, mat: "hullPlate1", band: "large" },
  { key: "hatchLarge", geo: SHAPES.hatchLarge, mat: "hullPlate1", band: "large" },
  { key: "tankLarge", geo: SHAPES.tankLarge, mat: "hullGreeble", band: "large" },
  { key: "gantry", geo: SHAPES.gantry, mat: "hullGreeble", band: "large" },
  { key: "domeLarge", geo: SHAPES.domeLarge, mat: "hullPlate1", band: "large" },
  { key: "landingPad", geo: SHAPES.landingPad, mat: "hullPlate1", band: "large" },
  { key: "dockRecess", geo: SHAPES.dockRecess, mat: "hullGreeble", band: "large" },
  { key: "seam", geo: SHAPES.seamStrip, mat: "hullPlate1", band: "large", shadow: false },
  { key: "lightW", geo: SHAPES.lightSmall, mat: "extEmitWhite", band: "large", plain: true, shadow: false },
  { key: "lightR", geo: SHAPES.lightSmall, mat: "extEmitRed", band: "large", plain: true, shadow: false },
  { key: "boxStack", geo: SHAPES.boxStack, mat: "hullGreeble", band: "medium" },
  { key: "tankH", geo: SHAPES.tankH, mat: "hullGreeble", band: "medium" },
  { key: "tankV", geo: SHAPES.tankV, mat: "hullGreeble", band: "medium" },
  { key: "ventLarge", geo: SHAPES.ventLarge, mat: "hullGreeble", band: "medium" },
  { key: "radiator", geo: SHAPES.radiator, mat: "hullGreeble", band: "medium" },
  { key: "mast", geo: SHAPES.mast, mat: "hullGreeble", band: "medium" },
  { key: "sensorCluster", geo: SHAPES.sensorCluster, mat: "hullGreeble", band: "medium" },
  { key: "cityBlock", geo: SHAPES.cityBlock, mat: "hullPlate1", band: "medium" },
  { key: "doorFrame", geo: SHAPES.doorFrame, mat: "hullGreeble", band: "medium" },
  { key: "windows", geo: windowBand, mat: "cityLights", band: "medium", plain: true, shadow: false },
  { key: "hatchSmall", geo: SHAPES.hatchSmall, mat: "hullPlate1", band: "small" },
  { key: "vent", geo: SHAPES.vent, mat: "hullGreeble", band: "small" },
  { key: "pipe", geo: pipeRun, mat: "hullGreeble", band: "small" },
  { key: "cabinet", geo: SHAPES.cabinet, mat: "hullGreeble", band: "small" },
  { key: "dome", geo: SHAPES.dome, mat: "hullPlate1", band: "small" },
];

class SetAcc {
  constructor(def) {
    this.def = def;
    this.geo = def.geo();
    if (!this.geo.boundingBox) this.geo.computeBoundingBox();
    const bb = this.geo.boundingBox;
    this.hx = Math.max(-bb.min.x, bb.max.x);
    this.hz = Math.max(-bb.min.z, bb.max.z);
    this.h = bb.max.y;
    this.mats = [];
    this.cols = [];
    this.count = 0;
  }
  push(m, tint) {
    const e = m.elements;
    for (let i = 0; i < 16; i++) this.mats.push(e[i]);
    if (!this.def.plain) this.cols.push(tint, tint, tint);
    this.count++;
  }
}

// ---------------------------------------------------------------------------
// Occupancy: 2-D rectangle hash in surface coordinates (u across / up, v along) so items never overlap
// ---------------------------------------------------------------------------
class Occupancy {
  constructor(cell = 16) {
    this.cell = cell;
    this.cells = new Map();
  }
  _k(i, j) {
    return (i + 2048) * 8192 + (j + 2048);
  }
  free(a0, b0, a1, b1) {
    const c = this.cell;
    const i0 = Math.floor(a0 / c);
    const i1 = Math.floor(a1 / c);
    const j0 = Math.floor(b0 / c);
    const j1 = Math.floor(b1 / c);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const list = this.cells.get(this._k(i, j));
        if (!list) continue;
        for (const r of list) if (a0 < r[2] && a1 > r[0] && b0 < r[3] && b1 > r[1]) return false;
      }
    }
    return true;
  }
  add(a0, b0, a1, b1) {
    const c = this.cell;
    const r = [a0, b0, a1, b1];
    const i0 = Math.floor(a0 / c);
    const i1 = Math.floor(a1 / c);
    const j0 = Math.floor(b0 / c);
    const j1 = Math.floor(b1 / c);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = this._k(i, j);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(r);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Frames: local +y = surface normal. "up" frames keep local +z along the ship's length; "wall" frames
// point local +x up the wall (world +y projected) so door / recess shapes stand upright.
// ---------------------------------------------------------------------------
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qy = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function basisUp(n, out) {
  _z.copy(Z_AXIS).addScaledVector(n, -Z_AXIS.dot(n)).normalize();
  _x.crossVectors(n, _z);
  out.makeBasis(_x, n, _z);
}
function basisWall(n, out) {
  _x.copy(Y_AXIS).addScaledVector(n, -Y_AXIS.dot(n)).normalize();
  _z.crossVectors(_x, n);
  out.makeBasis(_x, n, _z);
}

const lerp = (a, b, t) => a + (b - a) * t;
const rr = (rand, a, b) => a + (b - a) * rand();
function pickWeighted(rand, table) {
  let sum = 0;
  for (const e of table) sum += e[0];
  let r = rand() * sum;
  for (const e of table) {
    r -= e[0];
    if (r <= 0) return e[1];
  }
  return table[table.length - 1][1];
}
/** Per-instance grey tint: light / mid / dark families with a little jitter (multiplies the baked part tints). */
function tintOf(rand) {
  const r = rand();
  const base = r < 0.36 ? 1.16 : r < 0.8 ? 1.0 : 0.62;
  return base * (0.92 + 0.16 * rand());
}
// smooth value noise for density clustering (deterministic, no rng consumption)
function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = lerp(hash2(i, j), hash2(i + 1, j), sx);
  const b = lerp(hash2(i, j + 1), hash2(i + 1, j + 1), sx);
  return lerp(a, b, sy);
}

/** Disc exclusion test in surface coordinates against a rectangle [u±du, v±dv]. */
function discsHit(discs, u, v, du, dv) {
  for (const d of discs) {
    const dx = Math.max(Math.abs(u - d.u) - du, 0);
    const dz = Math.max(Math.abs(v - d.v) - dv, 0);
    if (dx * dx + dz * dz < d.r * d.r) return true;
  }
  return false;
}
const rectHit = (u, v, du, dv, a0, b0, a1, b1) => u + du > a0 && u - du < a1 && v + dv > b0 && v - dv < b1;

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------
/**
 * Place one instance of set `key` at surface coordinates (u, v).
 * opts: scale (number | [sx, sy, sz]), yaw (about the normal), tint, lift (along the normal),
 * pad (occupancy margin), register (mark occupancy), check (test occupancy)
 */
function put(ctx, surf, key, u, v, opts = {}) {
  const acc = ctx.sets.get(key);
  const sc = opts.scale === undefined ? 1 : opts.scale;
  const sx = Array.isArray(sc) ? sc[0] : sc;
  const sy = Array.isArray(sc) ? sc[1] : sc;
  const sz = Array.isArray(sc) ? sc[2] : sc;
  const yaw = opts.yaw || 0;
  let du = acc.hx * sx;
  let dv = acc.hz * sz;
  const sn = Math.abs(Math.sin(yaw));
  if (sn > 0.7) {
    const t = du;
    du = dv;
    dv = t;
  } else if (sn > 0.01) du = dv = Math.hypot(du, dv);
  const ur = surf.uRange(v);
  if (!ur) return false;
  if (u - du < ur[0] || u + du > ur[1]) return false;
  if (v - dv < surf.v0 || v + dv > surf.v1) return false;
  if (surf.maxHeight && acc.h * sy > surf.maxHeight(u, v)) return false;
  if (surf.exclude && surf.exclude(u, v, du, dv)) return false;
  const pad = opts.pad === undefined ? 0.6 : opts.pad;
  if (opts.check !== false && !surf.occ.free(u - du - pad, v - dv - pad, u + du + pad, v + dv + pad)) return false;
  surf.point(u, v, _p);
  surf.normal(u, v, _n);
  _n.normalize();
  if (opts.lift) _p.addScaledVector(_n, opts.lift);
  if (surf.wall) basisWall(_n, _r);
  else basisUp(_n, _r);
  _q.setFromRotationMatrix(_r);
  if (yaw) _q.multiply(_qy.setFromAxisAngle(Y_AXIS, yaw));
  _m.compose(_p, _q, _s.set(sx, sy, sz));
  acc.push(_m, opts.tint === undefined ? tintOf(ctx.rand) : opts.tint);
  if (opts.register !== false) surf.occ.add(u - du, v - dv, u + du, v + dv);
  return true;
}

/** Jittered-grid scatter with a low-frequency density modulation. pick(rand, u, v) -> item | null */
function scatterGrid(ctx, surf, { cell, prob, pick, jitter = 0.85, noiseScale = 90 }) {
  const rand = ctx.rand;
  let placed = 0;
  for (let v = surf.v0 + cell / 2; v < surf.v1; v += cell) {
    const ur = surf.uRange(v);
    if (!ur) continue;
    for (let u = ur[0] + cell / 2; u < ur[1]; u += cell) {
      const density = prob * (0.5 + 1.0 * vnoise(u / noiseScale + 7.3, v / noiseScale + 2.1));
      if (rand() > density) continue;
      const uu = u + (rand() - 0.5) * cell * jitter;
      const vv = v + (rand() - 0.5) * cell * jitter;
      const item = pick(rand, uu, vv);
      if (!item) continue;
      if (put(ctx, surf, item.key, uu, vv, item)) placed++;
    }
  }
  return placed;
}

/** Rows of identical items along v (or u), Imperial-style regular arrays. */
function rowsProgram(ctx, surf, { count, key, n, spacing, scale = 1, yaw = 0, along = "v", lift = 0 }) {
  const rand = ctx.rand;
  for (let k = 0; k < count; k++) {
    const v = lerp(surf.v0, surf.v1, rand());
    const ur = surf.uRange(v);
    if (!ur) continue;
    const u = lerp(ur[0], ur[1], rand());
    const num = Math.round(rr(rand, n[0], n[1]));
    const sp = rr(rand, spacing[0], spacing[1]);
    const sc = Array.isArray(scale) ? rr(rand, scale[0], scale[1]) : scale;
    const tint = tintOf(rand);
    for (let i = 0; i < num; i++) {
      const uu = along === "v" ? u : u + i * sp;
      const vv = along === "v" ? v + i * sp : v;
      put(ctx, surf, key, uu, vv, { scale: sc, yaw, tint, lift });
    }
  }
}

/**
 * Raised panel seams: lanes along v (yaw 0) at fixed u offsets, or cross lanes along u (yaw 90°) at
 * fixed v stations. Each lane is walked in segments; a segment is placed only where every sample point
 * is inside the surface, outside exclusions and not occupied.
 */
function seamLanes(ctx, surf, { along, spacing, len, gap, prob, tint = [0.42, 0.62], width = 1, uCenter = 0 }) {
  const rand = ctx.rand;
  const acc = ctx.sets.get("seam");
  const tryPlace = (uFn, v0, v1, cross) => {
    // sample the segment
    const L = v1 - v0;
    const steps = Math.max(2, Math.ceil(L / 6));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pv = v0 + L * t;
      const pu = uFn(pv);
      const su = cross ? pv : pu;
      const sv = cross ? pu : pv;
      const ur = surf.uRange(sv);
      if (!ur || su < ur[0] + 1 || su > ur[1] - 1) return false;
      if (sv < surf.v0 || sv > surf.v1) return false;
      if (surf.exclude && surf.exclude(su, sv, 0.4, 0.4)) return false;
      if (!surf.occ.free(su - 0.5, sv - 0.5, su + 0.5, sv + 0.5)) return false;
    }
    const mid = (v0 + v1) / 2;
    const cu = uFn(mid);
    const su = cross ? mid : cu;
    const sv = cross ? cu : mid;
    surf.point(su, sv, _p);
    surf.normal(su, sv, _n);
    _n.normalize();
    if (surf.wall) basisWall(_n, _r);
    else basisUp(_n, _r);
    _q.setFromRotationMatrix(_r);
    if (cross) _q.multiply(_qy.setFromAxisAngle(Y_AXIS, Math.PI / 2));
    _m.compose(_p, _q, _s.set(width, 1, L));
    acc.push(_m, rr(rand, tint[0], tint[1]));
    if (cross) surf.occ.add(v0, cu - 0.4, v1, cu + 0.4);
    else surf.occ.add(cu - 0.4, v0, cu + 0.4, v1);
    return true;
  };
  if (along === "v") {
    // lanes at u = uCenter + (k + 0.5) * spacing (both signs), walked along v
    const uMax = Math.max(...[surf.v0, surf.v1, (surf.v0 + surf.v1) / 2].map((v) => (surf.uRange(v) ? Math.max(Math.abs(surf.uRange(v)[0]), Math.abs(surf.uRange(v)[1])) : 0)));
    const lanes = [];
    for (let k = 0; (k + 0.5) * spacing < uMax; k++) lanes.push(uCenter + (k + 0.5) * spacing, uCenter - (k + 0.5) * spacing);
    for (const lane of lanes) {
      const uJ = lane + rr(ctx.rand, -1.5, 1.5);
      let v = surf.v0 + rr(rand, 0, gap[1]);
      while (v < surf.v1) {
        const L = rr(rand, len[0], len[1]);
        if (rand() < prob) tryPlace(() => uJ, v, Math.min(v + L, surf.v1 - 1), false);
        v += L + rr(rand, gap[0], gap[1]);
      }
    }
  } else {
    // cross lanes at v stations, walked along u
    for (let v = surf.v0 + rr(rand, 4, spacing); v < surf.v1; v += spacing) {
      const ur = surf.uRange(v);
      if (!ur) continue;
      let u = ur[0] + rr(rand, 0, gap[1]);
      while (u < ur[1]) {
        const L = rr(rand, len[0], len[1]);
        if (rand() < prob) tryPlace(() => v, u, Math.min(u + L, ur[1] - 1), true);
        u += L + rr(rand, gap[0], gap[1]);
      }
    }
  }
}

/** Warning / marker lights along a line u = uFn(v) every `step` metres; every `redEvery`-th is red. */
function edgeLights(ctx, surf, { uFn, step, redEvery = 3, scale = 1.8, lift = 0, v0 = surf.v0, v1 = surf.v1 }) {
  let k = 0;
  for (let v = v0 + step / 2; v < v1; v += step, k++) {
    const u = uFn(v);
    if (u === null) continue;
    put(ctx, surf, k % redEvery === redEvery - 1 ? "lightR" : "lightW", u, v, { scale, lift, pad: 0.2, tint: 1 });
  }
}

// ---------------------------------------------------------------------------
// Pick tables per surface class
// ---------------------------------------------------------------------------
function pickLargePlate(rand) {
  const k = pickWeighted(rand, [
    [26, "bayPlate"],
    [30, "hatchLarge"],
    [18, "tankLarge"],
    [9, "domeLarge"],
    [10, "landingPad"],
    [7, "gantry"],
  ]);
  const yaw = rand() < 0.3 ? Math.PI / 2 : 0;
  switch (k) {
    case "bayPlate":
      return { key: k, scale: rr(rand, 0.8, 1.2), yaw };
    case "hatchLarge":
      return { key: k, scale: rr(rand, 1.0, 1.45), yaw };
    case "tankLarge": {
      const s = rr(rand, 0.75, 1.15);
      return { key: k, scale: [s, s, s * rr(rand, 0.8, 1.3)], yaw };
    }
    case "domeLarge":
      return { key: k, scale: rr(rand, 0.55, 1.1) };
    case "landingPad":
      return { key: k, scale: rr(rand, 0.8, 1.3) };
    default:
      return { key: k, scale: rr(rand, 0.8, 1.2), yaw };
  }
}
function pickMediumPlate(rand) {
  const k = pickWeighted(rand, [
    [26, "boxStack"],
    [15, "tankH"],
    [12, "tankV"],
    [12, "ventLarge"],
    [12, "radiator"],
    [10, "mast"],
    [8, "sensorCluster"],
    [5, "cityBlock"],
  ]);
  const yaw = rand() < 0.3 ? Math.PI / 2 : 0;
  switch (k) {
    case "boxStack":
      return { key: k, scale: [rr(rand, 0.8, 2.0), rr(rand, 0.8, 1.8), rr(rand, 0.8, 2.0)], yaw };
    case "tankH": {
      const s = rr(rand, 1.0, 2.2);
      return { key: k, scale: [s, s, s * rr(rand, 0.9, 1.5)], yaw };
    }
    case "tankV":
      return { key: k, scale: rr(rand, 1.0, 1.9) };
    case "cityBlock":
      return { key: k, scale: [rr(rand, 1.2, 2.6), rr(rand, 1.0, 2.4), rr(rand, 1.2, 2.6)], yaw };
    case "mast":
      return { key: k, scale: rr(rand, 0.8, 1.6) };
    default:
      return { key: k, scale: rr(rand, 0.9, 1.6), yaw };
  }
}
function pickSmallPlate(rand) {
  const k = pickWeighted(rand, [
    [45, "hatchSmall"],
    [25, "vent"],
    [10, "dome"],
    [20, "pipe"],
  ]);
  const yaw = rand() < 0.3 ? Math.PI / 2 : 0;
  if (k === "pipe") {
    const b = rr(rand, 0.7, 1.5);
    return { key: k, scale: [b, b, rr(rand, 8, 26)], yaw };
  }
  if (k === "dome") return { key: k, scale: rr(rand, 0.7, 1.5) };
  return { key: k, scale: rr(rand, 0.9, 1.6), yaw };
}
/** Light wall fittings (tower neck, engine housing face): hatches, cabinets, vents, radiators. */
function pickWallSmall(rand) {
  const k = pickWeighted(rand, [
    [30, "hatchSmall"],
    [30, "cabinet"],
    [18, "vent"],
    [12, "ventLarge"],
    [10, "radiator"],
  ]);
  if (k === "cabinet") return { key: k, scale: rr(rand, 0.9, 1.5) };
  if (k === "ventLarge" || k === "radiator") return { key: k, scale: rr(rand, 0.7, 1.1), yaw: Math.PI / 2 };
  return { key: k, scale: rr(rand, 0.8, 1.3), yaw: rand() < 0.5 ? Math.PI / 2 : 0 };
}

/** Standard detail passes for a horizontal plate-like surface. */
function plateDetail(ctx, surf, d) {
  seamLanes(ctx, surf, { along: "v", spacing: d.seamLane, len: [30, 90], gap: [8, 26], prob: d.seamProb });
  seamLanes(ctx, surf, { along: "u", spacing: d.seamCross, len: [14, 60], gap: [6, 20], prob: d.seamProb * 0.8 });
  scatterGrid(ctx, surf, { cell: 30, prob: d.large, pick: pickLargePlate });
  rowsProgram(ctx, surf, { count: d.rows, key: "hatchSmall", n: [3, 6], spacing: [3.6, 4.6], scale: [1.0, 1.4], yaw: 0 });
  rowsProgram(ctx, surf, { count: Math.round(d.rows * 0.3), key: "hatchLarge", n: [2, 3], spacing: [8.5, 10], scale: [1.0, 1.2] });
  rowsProgram(ctx, surf, { count: Math.round(d.rows * 0.25), key: "tankV", n: [3, 5], spacing: [3.4, 4.2], scale: [1.0, 1.5] });
  scatterGrid(ctx, surf, { cell: 13, prob: d.medium, pick: pickMediumPlate });
  scatterGrid(ctx, surf, { cell: 7, prob: d.small, pick: pickSmallPlate });
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------
function weaponDiscs(ctx, filter) {
  return ctx.weapons.filter(filter || (() => true)).map((w) => ({ u: w.x, v: w.z, r: w.r }));
}

function topPlate(ctx) {
  const discs = weaponDiscs(ctx, (w) => w.kind === "heavy" || w.kind === "ion" || Math.abs(w.y - hullTopY(w.z)) < 1);
  const surf = {
    v0: -930,
    v1: 597,
    occ: new Occupancy(16),
    uRange(v) {
      const e = 0.72 * hullHalfWidth(v) - 2.5;
      return e > 3 ? [-e, e] : null;
    },
    point(u, v, out) {
      out.set(u, hullTopY(v), v);
    },
    normal(u, v, out) {
      out.set(0, 1, -TOP_SLOPE);
    },
    exclude(u, v, du, dv) {
      for (const t of TERRACES) {
        if (v + dv > t.zFront - 3 && v - dv < t.zBack) {
          const hw = terraceBaseHalfWidth(t, Math.min(v + dv, t.zBack)) + 4;
          if (Math.abs(u) - du < hw) return true;
        }
      }
      return discsHit(discs, u, v, du, dv);
    },
  };
  plateDetail(ctx, surf, { seamLane: 32, seamCross: 46, seamProb: 0.75, large: 0.22, medium: 0.34, small: 0.32, rows: 70 });
  // marker lights along the plate edges (white, every third red)
  edgeLights(ctx, surf, { uFn: (v) => 0.72 * hullHalfWidth(v) - 5, step: 42, v0: -880 });
  edgeLights(ctx, surf, { uFn: (v) => -(0.72 * hullHalfWidth(v) - 5), step: 42, v0: -880 });
  return surf;
}

function bottomPlate(ctx) {
  const discs = weaponDiscs(ctx, (w) => w.kind === "tractor" || Math.abs(w.y - hullBottomY(w.z)) < 1);
  const o = HANGAR.opening;
  const rb = VENTRAL.reactorBulb;
  const dr = VENTRAL.dockingRecess;
  const surf = {
    v0: -930,
    v1: 597,
    occ: new Occupancy(16),
    uRange(v) {
      const e = 0.62 * hullHalfWidth(v) - 2.5;
      return e > 3 ? [-e, e] : null;
    },
    point(u, v, out) {
      out.set(u, hullBottomY(v), v);
    },
    normal(u, v, out) {
      out.set(0, -1, -BOTTOM_SLOPE);
    },
    exclude(u, v, du, dv) {
      if (rectHit(u, v, du, dv, o.x0 - 6, o.z0 - 6, o.x1 + 6, o.z1 + 6)) return true;
      if (rectHit(u, v, du, dv, dr.x - dr.hw - 4, dr.z - dr.hl - 4, dr.x + dr.hw + 4, dr.z + dr.hl + 4)) return true;
      const dx = Math.max(Math.abs(u - rb.x) - du, 0);
      const dz = Math.max(Math.abs(v - rb.z) - dv, 0);
      if (dx * dx + dz * dz < (rb.r + 8) * (rb.r + 8)) return true;
      return discsHit(discs, u, v, du, dv);
    },
  };
  plateDetail(ctx, surf, { seamLane: 40, seamCross: 56, seamProb: 0.7, large: 0.16, medium: 0.24, small: 0.22, rows: 40 });
  edgeLights(ctx, surf, { uFn: (v) => 0.62 * hullHalfWidth(v) - 5, step: 60, v0: -860 });
  edgeLights(ctx, surf, { uFn: (v) => -(0.62 * hullHalfWidth(v) - 5), step: 60, v0: -860 });
  return surf;
}

/** Side trench: dense machinery city on the wall (x = ±0.965 w) and the floor strip (0.965 w .. w). */
function trench(ctx, s) {
  const rand = ctx.rand;
  const pd = weaponDiscs(ctx, (w) => w.kind === "pd" && Math.sign(w.x) === s);
  const wall = {
    wall: true,
    v0: -700,
    v1: 596,
    occ: new Occupancy(16),
    uRange(v) {
      const b = trenchBand(v);
      return [b.yBottom + 0.4, b.yTop - 0.4];
    },
    point(u, v, out) {
      out.set(s * 0.965 * hullHalfWidth(v), u, v);
    },
    normal(u, v, out) {
      out.set(s, 0, -SIDE_SLOPE);
    },
    maxHeight(u, v) {
      return Math.max(1.6, trenchBand(v).depth * 0.45);
    },
  };
  const floor = {
    v0: -650,
    v1: 596,
    occ: new Occupancy(16),
    uRange(v) {
      const w = hullHalfWidth(v);
      const a = 0.965 * w + 0.9;
      const b = w - 0.9;
      return s > 0 ? [a, b] : [-b, -a];
    },
    point(u, v, out) {
      out.set(u, trenchBand(v).yBottom, v);
    },
    normal(u, v, out) {
      out.set(0, 1, FLOOR_SLOPE);
    },
    maxHeight(u, v) {
      const b = trenchBand(v);
      return b.yTop - b.yBottom - 1.0;
    },
    exclude(u, v, du, dv) {
      return discsHit(pd, u, v, du, dv);
    },
  };
  const H = (v) => {
    const b = trenchBand(v);
    return b.yTop - b.yBottom;
  };

  // --- wall: docking recesses (sill just above the floor) with a light strip over the hood
  const recessUp = ctx.sets.get("dockRecess").hx;
  for (let z = -180 + rr(rand, 0, 60); z < 560; z += rr(rand, 85, 140)) {
    if (H(z) < 2 * recessUp + 1.2) continue;
    const yc = trenchBand(z).yBottom + 0.4 + recessUp + 0.15;
    if (put(ctx, wall, "dockRecess", yc, z, { scale: 1, pad: 1.5 })) {
      put(ctx, wall, "lightW", yc + recessUp + 0.5, z, { scale: [0.67, 0.5, 20], pad: 0, tint: 1, check: false, register: false });
    }
  }
  // --- wall: service doorways with lit door slabs
  const doorUp = ctx.sets.get("doorFrame").hx;
  for (let z = -560 + rr(rand, 0, 20); z < 590; z += rr(rand, 16, 38)) {
    if (H(z) < 2 * doorUp + 1.2 || rand() > 0.72) continue;
    const yc = trenchBand(z).yBottom + 0.4 + doorUp + 0.1;
    if (put(ctx, wall, "doorFrame", yc, z, { scale: 1, pad: 0.8 })) {
      put(ctx, wall, "lightW", yc - 0.2, z, { scale: [5.3, 0.3, 4], pad: 0, tint: 1, check: false, register: false, lift: 0.02 });
    }
  }
  // --- wall: lit window bands (cityLights quads), rows at up to four heights
  for (const f of [0.3, 0.46, 0.62, 0.78]) {
    let z = wall.v0 + rr(rand, 0, 30);
    while (z < wall.v1) {
      const h = H(z);
      const k = rr(rand, 0.6, 1.4);
      const L = 20 * k;
      if (h > 7.5 && (f > 0.4 || h > 12) && (f < 0.7 || h > 10) && rand() < 0.75) {
        const yc = trenchBand(z).yBottom + h * f;
        put(ctx, wall, "windows", yc, z + L / 2, { scale: [1.2, 1, L], lift: 0.08, pad: 0.4, tint: 1 });
      }
      z += L + rr(rand, 2, 16);
    }
  }
  // --- wall: horizontal pipe runs under the lip and above the floor, vertical risers
  for (const [f, pr] of [
    [0.92, 0.85],
    [0.1, 0.6],
  ]) {
    let z = wall.v0 + rr(rand, 0, 20);
    while (z < wall.v1) {
      const L = rr(rand, 16, 50);
      const b = rr(rand, 0.7, 1.6);
      if (H(z) > 5 && rand() < pr) put(ctx, wall, "pipe", trenchBand(z).yBottom + H(z) * f, z + L / 2, { scale: [b, b, L], pad: 0.2 });
      z += L + rr(rand, 3, 24);
    }
  }
  for (let z = wall.v0 + rr(rand, 0, 30); z < wall.v1; z += rr(rand, 22, 48)) {
    const h = H(z);
    if (h < 6) continue;
    const b = rr(rand, 0.8, 1.5);
    const bnd = trenchBand(z);
    put(ctx, wall, "pipe", (bnd.yBottom + bnd.yTop) / 2, z, { scale: [b, b, h - 1.2], yaw: Math.PI / 2, pad: 0.2 });
  }
  // --- wall: cabinets, hatches, vents
  scatterGrid(ctx, wall, { cell: 5, prob: 0.5, noiseScale: 60, pick: (r) => pickWeighted(r, [[50, { key: "cabinet", scale: rr(r, 0.9, 1.5) }], [30, { key: "hatchSmall", scale: rr(r, 0.8, 1.2), yaw: Math.PI / 2 }], [20, { key: "vent", scale: rr(r, 0.8, 1.3), yaw: Math.PI / 2 }]]) });

  // --- floor: gantries along the trench, then blocks / tanks
  for (let z = -480 + rr(rand, 0, 60); z < 570; z += rr(rand, 70, 150)) {
    if (H(z) < 8.5 || trenchBand(z).depth < 4.6 || rand() > 0.6) continue;
    const ur = floor.uRange(z);
    put(ctx, floor, "gantry", (ur[0] + ur[1]) / 2, z, { scale: [1, Math.min(1, (H(z) - 1.5) / 7), 1], yaw: Math.PI / 2, pad: 1.0 });
  }
  scatterGrid(ctx, floor, {
    cell: 4.2,
    prob: 0.62,
    noiseScale: 70,
    pick: (r, u, v) => {
      const h = H(v);
      const k = pickWeighted(r, [
        [34, "cityBlock"],
        [20, "boxStack"],
        [16, "tankV"],
        [16, "tankH"],
        [14, "vent"],
      ]);
      const cap = Math.max(1, (h - 1.5) / 4);
      switch (k) {
        case "cityBlock":
          return { key: k, scale: [rr(r, 0.6, 1.3), Math.min(cap, rr(r, 0.7, 2.6)), rr(r, 0.6, 1.6)], yaw: r() < 0.25 ? Math.PI / 2 : 0 };
        case "boxStack":
          return { key: k, scale: [rr(r, 0.5, 0.9), Math.min(cap, rr(r, 0.7, 1.4)), rr(r, 0.5, 1.0)], yaw: r() < 0.3 ? Math.PI / 2 : 0 };
        case "tankV":
          return { key: k, scale: Math.min(cap * 1.2, rr(r, 0.7, 1.3)) };
        case "tankH":
          return { key: k, scale: [rr(r, 0.6, 1.0), rr(r, 0.6, 1.0), rr(r, 0.6, 1.3)], yaw: 0 };
        default:
          return { key: k, scale: rr(r, 0.7, 1.1), yaw: 0 };
      }
    },
  });
  // --- floor lip: alternating red / white runway beacons along the outer edge
  edgeLights(ctx, floor, { uFn: (v) => s * (hullHalfWidth(v) - 0.9), step: 36, redEvery: 2, scale: 1.6, v0: -620 });
  return { wall, floor };
}

function terraceRoofs(ctx) {
  const discs = weaponDiscs(ctx, (w) => w.kind === "dish" || w.kind === "array" || TERRACES.some((t) => Math.abs(w.y - t.yTop) < 1));
  const out = [];
  TERRACES.forEach((t, i) => {
    const next = TERRACES[i + 1];
    const surf = {
      v0: t.zFront + 4,
      v1: t.zBack - 3,
      occ: new Occupancy(16),
      uRange(v) {
        const e = terraceHalfWidth(t, v) - 3;
        return e > 3 ? [-e, e] : null;
      },
      point(u, v, out) {
        out.set(u, t.yTop, v);
      },
      normal(u, v, out) {
        out.set(0, 1, 0);
      },
      exclude(u, v, du, dv) {
        if (next && v + dv > next.zFront - 3 && v - dv < next.zBack) {
          const hw = terraceHalfWidth(next, Math.min(v + dv, next.zBack)) + next.draft * (next.yTop - t.yTop) + 4;
          if (Math.abs(u) - du < hw) return true;
        }
        if (t.id === "t2" && rectHit(u, v, du, dv, -50, 243, 50, 377)) return true;
        return discsHit(discs, u, v, du, dv);
      },
    };
    plateDetail(ctx, surf, { seamLane: 24, seamCross: 40, seamProb: 0.7, large: 0.2, medium: 0.36, small: 0.34, rows: 26 });
    edgeLights(ctx, surf, { uFn: (v) => terraceHalfWidth(t, v) - 1.6, step: 44, redEvery: 2, scale: 1.6 });
    edgeLights(ctx, surf, { uFn: (v) => -(terraceHalfWidth(t, v) - 1.6), step: 44, redEvery: 2, scale: 1.6 });
    out.push(surf);
  });
  return out;
}

/** Tower neck: four lightly detailed frustum faces (window bands from hull.js are kept clear). */
function towerNeck(ctx) {
  const n = TOWER.neck;
  const zc = (n.z0 + n.z1) / 2;
  const hw = (y) => n.hw + n.draft * (n.yTop - y);
  const hl = (y) => (n.z1 - n.z0) / 2 + n.draft * (n.yTop - y) * 0.5;
  const bands = [n.yBase + 22, n.yBase + 46, n.yBase + 70];
  const excludeBands = (u, v, du) => bands.some((b) => Math.abs(u - b) < 3.2 + du);
  const faces = [];
  for (const s of [-1, 1]) {
    faces.push({
      wall: true,
      v0: n.z0 + 3,
      v1: n.z1 - 3,
      occ: new Occupancy(16),
      uRange: () => [n.yBase + 3, n.yTop - 3],
      point(u, v, out) {
        out.set(s * hw(u), u, v);
      },
      normal(u, v, out) {
        out.set(s, n.draft, 0);
      },
      exclude: excludeBands,
    });
    faces.push({
      wall: true,
      v0: -(n.hw - 3),
      v1: n.hw - 3,
      occ: new Occupancy(16),
      uRange: () => [n.yBase + 3, n.yTop - 3],
      point(u, v, out) {
        out.set(v, u, zc + s * hl(u));
      },
      normal(u, v, out) {
        out.set(0, n.draft * 0.5, s);
      },
      exclude: excludeBands,
    });
  }
  for (const f of faces) {
    // vertical pipe risers between the window bands, then small fittings
    for (let v = f.v0 + rr(ctx.rand, 4, 14); v < f.v1; v += rr(ctx.rand, 14, 30)) {
      for (const [a, b] of [
        [n.yBase + 3, bands[0] - 3.5],
        [bands[0] + 3.5, bands[1] - 3.5],
        [bands[1] + 3.5, bands[2] - 3.5],
        [bands[2] + 3.5, n.yTop - 3],
      ]) {
        if (ctx.rand() > 0.55) continue;
        const bore = rr(ctx.rand, 0.8, 1.4);
        put(ctx, f, "pipe", (a + b) / 2, v, { scale: [bore, bore, b - a - 0.6], yaw: Math.PI / 2, pad: 0.2 });
      }
    }
    scatterGrid(ctx, f, { cell: 5.5, prob: 0.42, noiseScale: 40, pick: pickWallSmall });
    edgeLights(ctx, f, { uFn: () => n.yTop - 4.5, step: 30, redEvery: 2, scale: 1.5 });
  }
  return faces;
}

/** Bridge module roof: hatches, vents, small machinery and a few masts around the domes / comms mast. */
function bridgeRoof(ctx) {
  const b = TOWER.bridge;
  const discs = TOWER.domes.map((d) => ({ u: d.x, v: d.z, r: d.r * 0.78 + 4 }));
  discs.push({ u: TOWER.mast.x, v: TOWER.mast.z, r: TOWER.mast.r * 2.4 + 4 });
  const surf = {
    v0: b.z0 + 9,
    v1: b.z1 - 3,
    occ: new Occupancy(16),
    uRange: () => [-(b.hw - 3), b.hw - 3],
    point(u, v, out) {
      out.set(u, b.y1, v);
    },
    normal(u, v, out) {
      out.set(0, 1, 0);
    },
    exclude(u, v, du, dv) {
      return discsHit(discs, u, v, du, dv);
    },
  };
  seamLanes(ctx, surf, { along: "v", spacing: 22, len: [20, 60], gap: [6, 18], prob: 0.7 });
  seamLanes(ctx, surf, { along: "u", spacing: 34, len: [14, 50], gap: [6, 16], prob: 0.6 });
  rowsProgram(ctx, surf, { count: 10, key: "hatchSmall", n: [3, 5], spacing: [3.6, 4.4], scale: [1.0, 1.3] });
  scatterGrid(ctx, surf, { cell: 12, prob: 0.4, noiseScale: 50, pick: (r) => pickWeighted(r, [[30, { key: "boxStack", scale: [rr(r, 0.8, 1.5), rr(r, 0.8, 1.3), rr(r, 0.8, 1.5)] }], [20, { key: "ventLarge", scale: rr(r, 0.9, 1.3), yaw: r() < 0.5 ? Math.PI / 2 : 0 }], [20, { key: "radiator", scale: rr(r, 1.0, 1.5) }], [15, { key: "mast", scale: rr(r, 0.9, 1.4) }], [15, { key: "sensorCluster", scale: rr(r, 0.9, 1.3) }]]) });
  scatterGrid(ctx, surf, { cell: 6.5, prob: 0.4, noiseScale: 50, pick: pickSmallPlate });
  edgeLights(ctx, surf, { uFn: () => b.hw - 4.5, step: 40, redEvery: 2, scale: 1.6 });
  edgeLights(ctx, surf, { uFn: () => -(b.hw - 4.5), step: 40, redEvery: 2, scale: 1.6 });
  return surf;
}

/** Engine housing block aft face (z = 604) between the bells, plus the stern strip above it. */
function sternFace(ctx) {
  const e = ENGINES;
  const discs = [...e.main.map((b) => ({ u: b.y, v: b.x, r: b.r * 1.36 + 3 })), ...e.secondary.map((b) => ({ u: b.y, v: b.x, r: b.r + 7 }))];
  const face = {
    wall: true,
    v0: -326,
    v1: 326,
    occ: new Occupancy(16),
    uRange: () => [-38, 32],
    point(u, v, out) {
      out.set(v, u, e.z + 4);
    },
    normal(u, v, out) {
      out.set(0, 0, 1);
    },
    exclude(u, v, du, dv) {
      return discsHit(discs, u, v, du, dv);
    },
  };
  const strip = {
    wall: true,
    v0: -336,
    v1: 336,
    occ: new Occupancy(16),
    uRange: () => [36.5, 50],
    point(u, v, out) {
      out.set(v, u, e.z + 1);
    },
    normal(u, v, out) {
      out.set(0, 0, 1);
    },
  };
  for (const f of [face, strip]) {
    // horizontal pipe runs across the face
    for (let k = 0; k < (f === face ? 6 : 3); k++) {
      const ur = f.uRange();
      const u = rr(ctx.rand, ur[0] + 2, ur[1] - 2);
      let v = f.v0 + rr(ctx.rand, 0, 30);
      while (v < f.v1) {
        const L = rr(ctx.rand, 10, 40);
        const b = rr(ctx.rand, 0.8, 1.6);
        if (ctx.rand() < 0.7) put(ctx, f, "pipe", u, v + L / 2, { scale: [b, b, L], pad: 0.2 });
        v += L + rr(ctx.rand, 4, 20);
      }
    }
    scatterGrid(ctx, f, { cell: 5.5, prob: 0.5, noiseScale: 45, pick: pickWallSmall });
  }
  edgeLights(ctx, strip, { uFn: () => 48, step: 48, redEvery: 2, scale: 1.6 });
  return [face, strip];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function buildGreebles({ group, materials }) {
  const ctx = { rand: rng(90210), sets: new Map(SET_DEFS.map((d) => [d.key, new SetAcc(d)])), weapons: weaponExclusions() };
  topPlate(ctx);
  bottomPlate(ctx);
  for (const s of [-1, 1]) trench(ctx, s);
  terraceRoofs(ctx);
  towerNeck(ctx);
  bridgeRoof(ctx);
  sternFace(ctx);

  const meshes = [];
  const byBand = { large: [], medium: [], small: [] };
  const perSet = {};
  let instances = 0;
  let triangles = 0;
  for (const acc of ctx.sets.values()) {
    if (!acc.count) continue;
    const material = materials[acc.def.mat];
    if (!material) throw new Error("greebles: unknown material " + acc.def.mat);
    const im = new THREE.InstancedMesh(acc.geo, material, acc.count);
    im.name = "greeble_" + acc.def.key;
    im.instanceMatrix.array.set(acc.mats);
    im.instanceMatrix.needsUpdate = true;
    if (acc.cols.length) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(acc.cols), 3);
    im.castShadow = acc.def.shadow !== false && acc.def.band !== "small";
    im.receiveShadow = acc.def.shadow !== false;
    im.computeBoundingSphere();
    im.frustumCulled = true;
    group.add(im);
    meshes.push(im);
    byBand[acc.def.band].push(im);
    perSet[acc.def.key] = acc.count;
    instances += acc.count;
    triangles += triCount(acc.geo) * acc.count;
  }
  const stats = { instances, triangles: Math.round(triangles), instancedMeshes: meshes.length, perSet };
  console.log(`[greebles] ${instances} instances in ${meshes.length} InstancedMeshes, ${(triangles / 1000).toFixed(0)}k triangles`);

  const camPos = new THREE.Vector3();
  const nearest = new THREE.Vector3();
  let lastBand = -1;
  return {
    meshes,
    stats,
    update(camera) {
      if (!camera) return;
      camera.getWorldPosition(camPos);
      const d = SHIP_BOX.clampPoint(camPos, nearest).distanceTo(camPos);
      const band = d < LOD_RANGES.small ? 2 : d < LOD_RANGES.medium ? 1 : 0;
      if (band === lastBand) return;
      lastBand = band;
      for (const m of byBand.medium) m.visible = band >= 1;
      for (const m of byBand.small) m.visible = band >= 2;
    },
  };
}
