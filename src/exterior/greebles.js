// Surface detail for the Star Destroyer exterior: a library of kit-bash shapes scattered by the
// tens of thousands over the terraces, tower, trenches, plateau, keel and stern; turbolaser
// batteries; sensor arrays; service hatches, docking ports and landing pads; windows and running
// lights; weathering decals; with distance LOD and spatial chunking.
//
// Rendering: every chunk (region x z-band) is one THREE.BatchedMesh per material, so an arbitrary
// mix of shapes costs one draw call (WEBGL_multi_draw). Per-instance colour tints plates, per-
// instance visibility toggles the medium tier; the small tier lives in its own (no-shadow) meshes so
// it can be switched off wholesale beyond LOD.small. Everything is seeded and deterministic.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng, taperedBox, prism, worldUVs, rectUVs } from "../kit.js";
import { HULL, halfWidth, dorsalY, keelY, TERRACES, TOWER_BASE, TOWER, ENGINES, REACTOR_BULB, HANGAR_WELL, SHUTTLE_WELL, ROOMS, towerBaseTopY } from "../config/layout.js";
import { IMP, addExteriorDetailMaterials, weatherRect } from "../materials/imperial.js";

// LOD ranges: distance from the camera to a chunk's bounding box (m)
export const LOD = { small: 900, medium: 3500 };
// z-band size per region (m); a region's chunks are its bands
const BANDS = { city: 170, tower: 4000, dorsal: 400, keel: 400, trenchP: 400, trenchS: 400, stern: 4000 };

const E = HULL.edgeHalf;
const T1 = TERRACES[0];
const T2 = TERRACES[1];
const wt = (z) => halfWidth(z) * HULL.dorsalPlateauFrac;
const wk = (z) => halfWidth(z) * HULL.keelFlatFrac;
const td = (z) => Math.min(HULL.edgeTrenchDepth, halfWidth(z) * 0.45);
const tTop = (t, z) => halfWidth(z) * t.halfTopFrac;
const tBase = (t, z) => tTop(t, z) + t.slopeRun;
const tRise = (t, z) => (z < t.z0 + 45 ? t.rise * Math.max(0.02, (z - t.z0) / 45) : t.rise);
const t1BaseY = (z) => dorsalY(z) - 0.3;
const t2BaseY = (z) => dorsalY(z) + T1.rise - 0.3;
const t1TopY = (z) => t1BaseY(z) + tRise(T1, z);
const t2TopY = (z) => t2BaseY(z) + tRise(T2, z);
// tower base block (mirrors hull.js): flat base yb, top yb + rise + 0.3, front face recedes 12 m, back 4 m
const TB = (() => {
  const yb = dorsalY((TOWER_BASE.z0 + TOWER_BASE.z1) / 2) + T1.rise + T2.rise - 0.3;
  return { yb, yTop: yb + TOWER_BASE.rise + 0.3, halfBot: TOWER_BASE.halfTop + TOWER_BASE.slopeRun, halfTop: TOWER_BASE.halfTop, z0: TOWER_BASE.z0, z1: TOWER_BASE.z1, plinthHalf: TOWER_BASE.halfTop + TOWER_BASE.slopeRun - 1.5 };
})();
// neck (mirrors hull.js): tapered box, base 34 -> top 28 half-width, front recedes 8 m, back 4 m
const NK = (() => {
  const nk = TOWER.neck;
  const y0 = towerBaseTopY() - 0.5;
  const h = nk.yTop - y0;
  return { y0, h, yTop: nk.yTop, z0: nk.z0, z1: nk.z1, halfX: (y) => nk.halfBase - (nk.halfBase - nk.halfTop) * ((y - y0) / h), zFront: (y) => nk.z0 + 8 * ((y - y0) / h), zBack: (y) => nk.z1 - 4 * ((y - y0) / h) };
})();
const BM = TOWER.bridgeModule;
const STERN_PLATE_Z = HULL.sternZ + 0.6;

// ---------------------------------------------------------------------------
// Shape library. Unit footprint (x, z in [-0.5, 0.5]) standing on y = 0 with height 1 unless noted, so
// the instance scale is [width, height, depth]. Vertex colour bakes two-tone detail (recesses dark)
// and is multiplied by the per-instance tint.
// ---------------------------------------------------------------------------
function paint(geo, t = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) worldUVs(g, 1);
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const [r, gg, b] = Array.isArray(t) ? t : [t, t, t];
  for (let i = 0; i < n; i++) {
    arr[i * 3] = r;
    arr[i * 3 + 1] = gg;
    arr[i * 3 + 2] = b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}
const B = (sx, sy, sz, x, y, z, t = 1) => paint(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), t);
function C(r, h, seg, x, y, z, t = 1, { axis = "y", open = false, rTop = r } = {}) {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, open);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return paint(g, t);
}
function M(...parts) {
  const g = mergeGeometries(parts, false);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
function wedgeGeo() {
  // right-angle wedge: vertical back at z = -0.5, slope rising toward -z
  const A = [-0.5, 0, -0.5];
  const Bv = [0.5, 0, -0.5];
  const Cv = [0.5, 0, 0.5];
  const D = [-0.5, 0, 0.5];
  const Ev = [-0.5, 1, -0.5];
  const F = [0.5, 1, -0.5];
  const tri = (a, b, c) => [...a, ...b, ...c];
  const pos = [...tri(A, Bv, Cv), ...tri(A, Cv, D), ...tri(A, Ev, F), ...tri(A, F, Bv), ...tri(D, Cv, F), ...tri(D, F, Ev), ...tri(A, D, Ev), ...tri(Bv, F, Cv)];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function portGeo() {
  // round docking port: base drum, hazard-striped top ring, dark centre plate
  const n = 12;
  const r0 = 0.32;
  const r1 = 0.5;
  const y = 0.165;
  const pos = [];
  const col = [];
  const p = (r, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
  const tri = (a, b, c, t) => {
    pos.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) col.push(...t);
  };
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const t = i % 2 ? [0.95, 0.75, 0.2] : [0.1, 0.1, 0.11];
    tri(p(r0, a0), p(r1, a1), p(r1, a0), t);
    tri(p(r0, a0), p(r0, a1), p(r1, a1), t);
    tri([0, y - 0.005, 0], p(r0, a1), p(r0, a0), [0.3, 0.3, 0.32]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  worldUVs(g, 1);
  return M(C(0.5, 0.16, n, 0, 0.08, 0, 1), g);
}
function buildShapes() {
  const S = {};
  S.box = B(1, 1, 1, 0, 0.5, 0);
  S.cube = paint(new THREE.BoxGeometry(1, 1, 1)); // centred (lights)
  S.step2 = M(B(1, 0.6, 1, 0, 0.3, 0), B(0.7, 0.4, 0.7, 0.08, 0.8, -0.05, 0.95));
  S.step3 = M(B(1, 0.45, 1, 0, 0.225, 0), B(0.75, 0.3, 0.75, 0, 0.6, 0, 0.95), B(0.5, 0.25, 0.5, 0, 0.875, 0, 0.9));
  S.taper = paint(taperedBox(1, 1, 0.8, 0.8, 1));
  S.tower = M(paint(taperedBox(0.7, 0.7, 1, 1, 1)), B(1.1, 0.08, 1.1, 0, 1.03, 0, 0.8));
  S.tank = M(C(0.5, 1, 10, 0, 0.5, 0), C(0.34, 0.1, 8, 0, 1.05, 0, 0.8), C(0.55, 0.08, 10, 0, 0.04, 0, 0.7));
  S.tankH = M(C(0.5, 1, 10, 0, 0.5, 0, 0.95, { axis: "z" }), B(0.9, 0.3, 0.14, 0, 0.15, 0.32, 0.75), B(0.9, 0.3, 0.14, 0, 0.15, -0.32, 0.75), B(0.16, 0.2, 0.16, 0, 1.0, 0, 0.6));
  {
    const dome = new THREE.SphereGeometry(0.5, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.14, 0);
    S.dome = M(paint(dome, 1), C(0.5, 0.14, 10, 0, 0.07, 0, 0.85));
  }
  S.wedge = paint(wedgeGeo());
  S.ridge = paint(prism([[-0.5, 0], [0.5, 0], [0.25, 1], [-0.25, 1]], 1));
  S.hatch = M(paint(taperedBox(1, 1, 0.86, 0.86, 0.14)), B(0.72, 0.06, 0.72, 0, 0.12, 0, 0.78), B(0.5, 0.05, 0.5, 0, 0.16, 0, 0.62));
  S.port = portGeo();
  S.vent = M(B(1, 0.22, 1, 0, 0.11, 0), B(0.8, 0.28, 0.8, 0, 0.14, 0, 0.26), B(0.8, 0.06, 0.1, 0, 0.3, -0.27, 0.9), B(0.8, 0.06, 0.1, 0, 0.3, 0, 0.9), B(0.8, 0.06, 0.1, 0, 0.3, 0.27, 0.9));
  {
    const parts = [B(1, 0.12, 1, 0, 0.06, 0), B(0.88, 0.16, 0.88, 0, 0.08, 0, 0.2)];
    for (let k = 0; k < 5; k++) parts.push(B(0.88, 0.2, 0.05, 0, 0.1, (k - 2) * 0.2, 0.85));
    S.grille = M(...parts);
  }
  S.sensor = M(B(1, 1, 1, 0, 0.5, 0), B(0.8, 0.7, 0.05, 0, 0.55, 0.51, 0.22));
  // wall-mounted variant: the dark sensor window sits on the face pointing away from the wall
  S.sensorUp = M(B(1, 1, 1, 0, 0.5, 0), B(0.8, 0.05, 0.7, 0, 1.01, 0, 0.22));
  S.pipe = M(C(0.5, 1, 7, 0, 0.5, 0, 0.9, { axis: "x" }), B(0.08, 0.62, 1.16, -0.4, 0.31, 0, 0.7), B(0.08, 0.62, 1.16, 0, 0.31, 0, 0.7), B(0.08, 0.62, 1.16, 0.4, 0.31, 0, 0.7));
  S.mast = M(C(0.06, 1, 5, 0, 0.5, 0, 0.85), B(0.3, 0.06, 0.3, 0, 0.72, 0, 0.7), B(0.1, 0.1, 0.1, 0, 1.0, 0, 0.6), B(0.28, 0.1, 0.28, 0, 0.05, 0, 0.8));
  {
    const bowl = new THREE.CylinderGeometry(0.5, 0.06, 0.2, 12, 1, false).rotateX(-0.9).translate(0, 0.66, 0.05);
    S.dish = M(paint(bowl, 0.95), B(0.12, 0.6, 0.12, 0, 0.3, 0, 0.7), B(0.3, 0.2, 0.28, 0, 0.55, 0, 0.7));
  }
  S.pad = M(B(1, 0.06, 1, 0, 0.03, 0), B(1, 0.015, 0.05, 0, 0.068, 0.475, 0.3), B(1, 0.015, 0.05, 0, 0.068, -0.475, 0.3), B(0.05, 0.015, 1, 0.475, 0.068, 0, 0.3), B(0.05, 0.015, 1, -0.475, 0.068, 0, 0.3), B(0.36, 0.015, 0.36, 0, 0.068, 0, 0.35), B(0.26, 0.016, 0.26, 0, 0.069, 0, 0.95));
  S.clamp = M(B(0.5, 1, 0.4, -0.25, 0.5, 0, 0.85), B(1, 0.3, 0.4, 0, 0.15, 0, 0.85), B(0.3, 0.12, 0.5, 0.35, 0.36, 0, 0.6));
  S.frame = M(B(1, 0.3, 0.06, 0, 0.15, -0.47), B(1, 0.3, 0.06, 0, 0.15, 0.47), B(0.06, 0.3, 1, -0.47, 0.15, 0), B(0.06, 0.3, 1, 0.47, 0.15, 0));
  S.ring = M(C(0.5, 1, 16, 0, 0.5, 0), C(0.42, 1.3, 16, 0, 0.65, 0, 0.75));
  S.win = paint(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  for (const g of Object.values(S)) {
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
  return S;
}

// ---------------------------------------------------------------------------
// Orientation helpers: local +y = surface normal; local +z = world +z (or world +y on walls)
// projected into the surface, optionally spun about the normal.
// ---------------------------------------------------------------------------
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, 1);
function orient(n, spin = 0, out = _q) {
  _y.set(n[0], n[1], n[2]).normalize();
  const ref = Math.abs(_y.y) < 0.7 ? UP : FWD;
  _z.copy(ref).addScaledVector(_y, -ref.dot(_y)).normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  out.setFromRotationMatrix(_m);
  if (spin) out.multiply(_qs.setFromAxisAngle(UP, spin));
  return out;
}
// after orient(): is the local x axis the more vertical one? (windows keep their long side horizontal)
function localXIsVertical(q) {
  _x.set(1, 0, 0).applyQuaternion(q);
  _z.set(0, 0, 1).applyQuaternion(q);
  return Math.abs(_x.y) > Math.abs(_z.y);
}
const _ta = new THREE.Vector3();
const _tb = new THREE.Vector3();
const _n = new THREE.Vector3();
// Surfaces are { P(a, b) -> [x, y, z], a0, a1, b0, b1, hint }: `a` is metric (z or y in metres), `b` a
// unit parameter across the surface. Normals come from finite differences, flipped toward `hint`.
function frameAt(surf, a, b) {
  const p = surf.P(a, b);
  const da = Math.max(0.05, (surf.a1 - surf.a0) * 0.002);
  const db = (surf.b1 - surf.b0) * 0.002;
  const pa = surf.P(a + da, b);
  const pb = surf.P(a, b + db);
  _ta.set(pa[0] - p[0], pa[1] - p[1], pa[2] - p[2]);
  _tb.set(pb[0] - p[0], pb[1] - p[1], pb[2] - p[2]);
  _n.crossVectors(_ta, _tb).normalize();
  const h = surf.hint;
  if (_n.x * h[0] + _n.y * h[1] + _n.z * h[2] < 0) _n.negate();
  return { p, n: [_n.x, _n.y, _n.z] };
}
const lenB = (surf, a) => {
  const p0 = surf.P(a, surf.b0);
  const p1 = surf.P(a, surf.b1);
  return Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
};

// ---------------------------------------------------------------------------
// Palette: instance tints. The hull plating is hull-texture (~0.64 linear) x IMP.hull; greebles are
// worn-metal (~0.39 linear) x tint, so x1.65 puts `mid` at the hull's own brightness and light / dark
// bracket it, which is what makes plates read as manufactured-differently rather than as a
// different material.
// ---------------------------------------------------------------------------
const tint = (c, k) => c.clone().multiplyScalar(k);
const TINT = {
  light: tint(IMP.hullLight, 1.65),
  mid: tint(IMP.hull, 1.65),
  dark: tint(IMP.hullDark, 1.55),
  gun: tint(IMP.gunmetal, 1.4),
  trench: tint(IMP.trench, 1.6),
  steel: tint(IMP.steel, 1.4),
  white: tint(IMP.white, 1.1),
};
const PAL = {
  plate: [[TINT.light, 0.35], [TINT.mid, 0.4], [TINT.dark, 0.17], [TINT.gun, 0.08]],
  small: [[TINT.light, 0.25], [TINT.mid, 0.4], [TINT.dark, 0.25], [TINT.gun, 0.1]],
  trench: [[TINT.trench, 0.35], [TINT.dark, 0.35], [TINT.gun, 0.2], [TINT.mid, 0.1]],
  machinery: [[TINT.dark, 0.4], [TINT.gun, 0.3], [TINT.mid, 0.2], [TINT.steel, 0.1]],
  // the keel plates are IMP.hullDark and lit only by the environment: mostly dark machinery, with
  // enough mid / light plates that the underside still reads as kit-bashed detail and not one tone
  keel: [[TINT.dark, 0.38], [TINT.mid, 0.3], [TINT.gun, 0.17], [TINT.light, 0.15]],
  // big armour plates on the open slopes stay close to the hull tone (dark ones read as holes from afar)
  slope: [[TINT.light, 0.4], [TINT.mid, 0.48], [TINT.dark, 0.1], [TINT.gun, 0.02]],
};
const LIGHT = {
  cool: new THREE.Color(0.86, 0.91, 1.0),
  warm: new THREE.Color(1.0, 0.86, 0.68),
  amber: new THREE.Color(1.0, 0.62, 0.12),
  red: new THREE.Color(1.0, 0.12, 0.08),
  green: new THREE.Color(0.2, 1.0, 0.45),
  blue: new THREE.Color(0.35, 0.55, 1.0),
};
function pick(r, weighted) {
  let t = r();
  for (const [v, w] of weighted) {
    t -= w;
    if (t <= 0) return v;
  }
  return weighted[weighted.length - 1][0];
}
function jitterTint(r, base, spread = 0.08) {
  const k = 1 + (r() - 0.5) * 2 * spread;
  return _c.copy(base).multiplyScalar(k);
}
const lerp = (a, b, t) => a + (b - a) * t;
const rr = (r, a, b) => lerp(a, b, r());

// ---------------------------------------------------------------------------
// Collector: instances bucketed per chunk, later turned into BatchedMeshes
// ---------------------------------------------------------------------------
class Collector {
  constructor(shapes) {
    this.shapes = shapes;
    this.chunks = new Map();
    this.count = 0;
    this.counts = {};
  }
  key(region, z) {
    const band = BANDS[region] || 400;
    return `${region}:${Math.floor((z - HULL.bowZ) / band)}`;
  }
  // tier: "S" small, "M" medium, "L" large, "E" emissive
  add(region, tier, shape, p, q, scale, color) {
    if (!this.shapes[shape]) throw new Error("unknown shape " + shape);
    const key = this.key(region, p[2]);
    let ch = this.chunks.get(key);
    if (!ch) {
      ch = { key, region, items: [] };
      this.chunks.set(key, ch);
    }
    const m = new Float32Array(16);
    _m.compose(_p.set(p[0], p[1], p[2]), q, _s.set(scale[0], scale[1], scale[2])).toArray(m);
    ch.items.push({ shape, m, c: [color.r, color.g, color.b], tier });
    this.count++;
    this.counts[region] = (this.counts[region] || 0) + 1;
  }
}
// Draw-call bookkeeping: onBeforeRender runs once per main-pass render of a mesh that survived frustum
// culling (the shadow pass arrives via onBeforeShadow), so counting there gives the visible draws and
// the triangles actually submitted per frame. `userData.tris` is kept current by the LOD toggles.
const COUNTER = { calls: 0, tris: 0 };
class CountedBatchedMesh extends THREE.BatchedMesh {
  onBeforeRender(renderer, scene, camera, geometry, material, group) {
    if (scene !== null) {
      COUNTER.calls++;
      COUNTER.tris += this.userData.tris || 0;
    }
    super.onBeforeRender(renderer, scene, camera, geometry, material, group);
  }
}
function countDraw() {
  COUNTER.calls++;
  COUNTER.tris += this.userData.tris || 0;
}

function makeBatch(items, material, shapes, { castShadow = true } = {}, onInstance = null) {
  if (!items.length) return null;
  const used = new Map();
  let verts = 0;
  for (const it of items) {
    if (!used.has(it.shape)) {
      used.set(it.shape, -1);
      verts += shapes[it.shape].attributes.position.count;
    }
  }
  const bm = new CountedBatchedMesh(items.length, verts, verts, material);
  for (const name of used.keys()) used.set(name, bm.addGeometry(shapes[name]));
  let tris = 0;
  for (const it of items) {
    const id = bm.addInstance(used.get(it.shape));
    bm.setMatrixAt(id, _m.fromArray(it.m));
    bm.setColorAt(id, _c.setRGB(it.c[0], it.c[1], it.c[2]));
    tris += shapes[it.shape].attributes.position.count / 3;
    if (onInstance) onInstance(id, it);
  }
  bm.perObjectFrustumCulled = false;
  bm.sortObjects = false;
  bm.castShadow = castShadow;
  bm.receiveShadow = true;
  bm.frustumCulled = true;
  bm.computeBoundingBox();
  bm.computeBoundingSphere();
  bm.userData.tris = tris;
  return bm;
}

// ---------------------------------------------------------------------------
// Dressing: jittered grids of shapes over a surface. Rows run along `a` (streets), cells across `b`
// in metres. Each pass is one size tier with its own cell, fill and shape weights.
// ---------------------------------------------------------------------------
function chooseSize(r, shape, tier, cell) {
  // returns [w, h, d] in metres and whether to allow a 90 degree spin
  const H = { L: [3, 9], M: [1.2, 4.2], S: [0.3, 1.4] }[tier];
  const low = { L: [0.4, 0.9], M: [0.3, 0.6], S: [0.12, 0.3] }[tier];
  const w = cell * rr(r, 0.45, 0.92);
  const d = cell * rr(r, 0.45, 0.95);
  switch (shape) {
    case "box":
      return [w, rr(r, H[0], H[1]) * (r() < 0.1 ? 1.5 : 1), d, true];
    case "step2":
    case "step3":
      return [w, rr(r, H[0] * 1.2, H[1] * 1.2), d, true];
    case "taper":
      return [w, rr(r, H[0], H[1] * 0.9), d, true];
    case "tower": {
      const s = cell * rr(r, 0.32, 0.55);
      return [s, rr(r, H[1] * 0.8, H[1] * 1.5), s, false];
    }
    case "tank": {
      const s = cell * rr(r, 0.4, 0.8);
      return [s, rr(r, H[0], H[1]), s, false];
    }
    case "tankH": {
      const dia = cell * rr(r, 0.35, 0.6);
      return [dia, dia, cell * rr(r, 0.8, 0.98), false];
    }
    case "dome": {
      const s = cell * rr(r, 0.45, 0.85);
      return [s, s * 0.55, s, false];
    }
    case "wedge":
      return [w, rr(r, H[0] * 0.8, H[1] * 0.7), d, true];
    case "ridge":
      return [cell * rr(r, 0.4, 0.8), rr(r, H[0] * 0.8, H[1] * 0.7), cell * rr(r, 0.6, 0.98), false];
    case "hatch":
      return [cell * rr(r, 0.55, 0.92), rr(r, low[0], low[1]), cell * rr(r, 0.55, 0.92), true];
    case "port": {
      const s = cell * rr(r, 0.5, 0.85);
      return [s, rr(r, low[0], low[1]) * 1.3, s, false];
    }
    case "vent":
    case "grille":
      return [cell * rr(r, 0.5, 0.92), rr(r, low[0] * 1.8, low[1] * 1.8), cell * rr(r, 0.5, 0.92), true];
    case "sensor":
    case "sensorUp": {
      const s = cell * rr(r, 0.35, 0.65);
      return [s, rr(r, H[0] * 0.8, H[1] * 0.7), s, true];
    }
    case "pipe": {
      const dia = cell * rr(r, 0.12, 0.28);
      return [cell * rr(r, 1.6, 3.4), dia, dia, true];
    }
    case "mast": {
      const h = rr(r, H[1] * 1.1, H[1] * 2.2);
      return [h * 0.4, h, h * 0.4, false];
    }
    case "dish": {
      const s = cell * rr(r, 0.5, 0.9);
      return [s, s * 0.9, s, false];
    }
    default:
      return [w, rr(r, H[0], H[1]), d, true];
  }
}

export function buildGreebles(mats, opts = {}) {
  addExteriorDetailMaterials(mats);
  const group = new THREE.Group();
  group.name = "greebles";
  const shapes = buildShapes();
  const col = new Collector(shapes);
  const stats = { instances: 0, drawCalls: 0, batches: 0, trianglesVisible: 0, trianglesLOD: 0, regions: {} };

  const blockers = []; // { x, z, r } footprints (turrets, pads) kept clear of scattered detail
  const isBlocked = (x, z, size = 0) => {
    for (const b of blockers) if ((x - b.x) * (x - b.x) + (z - b.z) * (z - b.z) < (b.r + size * 0.5) * (b.r + size * 0.5)) return true;
    return false;
  };

  // add one shape at a surface frame
  const put = (region, tier, shape, f, size, spin, color, lift = 0) => {
    const q = orient(f.n, spin);
    const p = lift ? [f.p[0] + f.n[0] * lift, f.p[1] + f.n[1] * lift, f.p[2] + f.n[2] * lift] : f.p;
    col.add(region, tier, shape, p, q, size, color);
    return q;
  };
  // emissive window strip (w x h metres) on a surface frame, long side horizontal
  const winStrip = (region, f, w, h, color, lift = 0.15) => {
    const q = orient(f.n, 0);
    const sc = localXIsVertical(q) ? [h, 1, w] : [w, 1, h];
    col.add(region, "E", "win", [f.p[0] + f.n[0] * lift, f.p[1] + f.n[1] * lift, f.p[2] + f.n[2] * lift], q, sc, color);
  };
  // small emissive cube (running light / marker)
  const lamp = (region, p, s, color) => col.add(region, "E", "cube", p, _q.identity(), [s, s, s], color);

  // windows on the +-x faces of a placed block (world position p, orientation q, size [w,h,d])
  const faceWindows = (region, p, q, size, r) => {
    const [w, h, d] = size;
    if (h < 3.2) return;
    const rows = h > 7 ? 2 : 1;
    for (const sx of [-1, 1]) {
      if (r() < 0.35) continue;
      const n = Math.max(1, Math.floor(d / 3.2));
      for (let row = 0; row < rows; row++) {
        const yy = h * (rows === 1 ? 0.62 : 0.4 + row * 0.35);
        for (let k = 0; k < n; k++) {
          if (r() < 0.25) continue;
          const zz = -d / 2 + (k + 0.5) * (d / n);
          _p.set(sx * (w / 2 + 0.15), yy, zz).applyQuaternion(q).add(_s.set(p[0], p[1], p[2]));
          _n.set(sx, 0, 0).applyQuaternion(q);
          const f = { p: [_p.x, _p.y, _p.z], n: [_n.x, _n.y, _n.z] };
          winStrip(region, f, Math.min(2.6, d / n - 0.6), 0.9, r() < 0.15 ? LIGHT.warm : LIGHT.cool, 0);
        }
      }
    }
  };

  function dress(region, surf, cfg) {
    for (const pass of cfg.passes) {
      const r = rng((cfg.seed * 7919 + pass.tier.charCodeAt(0) * 131 + (pass.seed || 0)) >>> 0);
      const cell = pass.cell;
      const margin = pass.margin ?? cfg.margin ?? 1.5;
      const na = Math.max(1, Math.floor((surf.a1 - surf.a0) / cell));
      const ca = (surf.a1 - surf.a0) / na;
      const palette = pass.palette || cfg.palette || PAL.plate;
      for (let j = 0; j < na; j++) {
        const a = surf.a0 + (j + 0.5) * ca;
        const len = lenB(surf, a);
        const usable = len - 2 * margin;
        if (usable < cell * 0.6) continue;
        const nb = Math.max(1, Math.floor(usable / cell));
        const cb = usable / nb;
        const off = pass.stagger && j % 2 ? cb * 0.5 : 0;
        for (let i = 0; i < nb; i++) {
          let d = margin + (i + 0.5) * cb + off;
          if (d > len - margin - cb * 0.3) continue;
          if (r() > pass.fill) continue;
          d += (r() - 0.5) * cb * (pass.jitter ?? 0.3);
          const aa = a + (r() - 0.5) * ca * (pass.jitter ?? 0.3);
          const b = surf.b0 + (surf.b1 - surf.b0) * (d / len);
          const f = frameAt(surf, aa, b);
          const size = Math.min(ca, cb);
          if (cfg.blocked && cfg.blocked(f.p[0], f.p[1], f.p[2], size)) continue;
          if (isBlocked(f.p[0], f.p[2], size)) continue;
          const shape = pick(r, pass.shapes);
          const [w, h, dd, spinOK] = chooseSize(r, shape, pass.tier, size);
          const hh = h * (pass.heightScale || 1);
          let spin = 0;
          if (spinOK && r() < (pass.spin90 ?? 0.3)) spin = Math.PI / 2;
          if (pass.spinRandom) spin = r() * Math.PI * 2;
          if (pass.spinFixed !== undefined) spin = pass.spinFixed;
          const base = pick(r, palette);
          const color = jitterTint(r, base, 0.08);
          const q = put(region, pass.tier, shape, f, [w, hh, dd], spin, color);
          // put() returns the shared quaternion; face windows re-orient it, so hand them a copy
          if (pass.windows && (shape === "box" || shape === "step2" || shape === "taper" || shape === "tower" || shape === "step3")) faceWindows(region, f.p, q.clone(), [w, hh, dd], r);
        }
      }
    }
  }
  // windows along a list of surface parameters
  function windowRow(region, surf, pts, r, { w = 3.0, h = 1.1, skip = 0.15, warm = 0.12 } = {}) {
    for (const [a, b] of pts) {
      if (r() < skip) continue;
      const f = frameAt(surf, a, b);
      winStrip(region, f, w * rr(r, 0.85, 1.1), h * rr(r, 0.85, 1.1), r() < warm ? LIGHT.warm : LIGHT.cool);
    }
  }
  const seq = (from, to, step) => {
    const out = [];
    for (let v = from; v <= to + 1e-6; v += step) out.push(v);
    return out;
  };

  // ---- surfaces -----------------------------------------------------------------------------
  const SURF = {
    plateau: { P: (z, u) => [u * wt(z), dorsalY(z), z], a0: -740, a1: 116, b0: -1, b1: 1, hint: [0, 1, 0] },
    plateauStrip: (side) => ({ P: (z, u) => [side * (tBase(T1, z) + 2 + u * (wt(z) - tBase(T1, z) - 4)), dorsalY(z), z], a0: 124, a1: 798, b0: 0, b1: 1, hint: [0, 1, 0] }),
    dslope: (side) => ({
      P: (z, s) => {
        const w = halfWidth(z);
        const a = wt(z);
        const yd = dorsalY(z);
        return [side * (a + s * (w - a)), yd + s * (E - yd), z];
      },
      a0: -720,
      a1: 798,
      b0: 0.04,
      b1: 0.9,
      hint: [side * 0.4, 1, 0],
    }),
    keel: { P: (z, u) => [u * wk(z), keelY(z), z], a0: -700, a1: 798, b0: -1, b1: 1, hint: [0, -1, 0] },
    kslope: (side) => ({
      P: (z, s) => {
        const w = halfWidth(z);
        const a = wk(z);
        const yk = keelY(z);
        return [side * (a + s * (w - a)), yk + s * (-E - yk), z];
      },
      a0: -700,
      a1: 798,
      b0: 0.04,
      b1: 0.9,
      hint: [side * 0.4, -1, 0],
    }),
    trench: (side) => ({ P: (z, v) => [side * (halfWidth(z) - td(z)), v * E * 0.45, z], a0: -700, a1: 798, b0: -1, b1: 1, hint: [side, 0, 0] }),
    // a 6 m wide strip 3..9 m inboard of the knife-edge lip on the dorsal (+1) or keel (-1) slope
    lipStreet: (side, which) => ({
      P: (z, u) => {
        const w = halfWidth(z);
        const a = which > 0 ? wt(z) : wk(z);
        const yIn = which > 0 ? dorsalY(z) : keelY(z);
        const s = 1 - (3 + u * 6) / (w - a);
        return [side * (a + s * (w - a)), yIn + s * (which * E - yIn), z];
      },
      a0: -700,
      a1: 792,
      b0: 0,
      b1: 1,
      hint: [side * 0.4, which, 0],
    }),
    t1Top: { P: (z, u) => [u * tTop(T1, z), t1TopY(z), z], a0: 124, a1: 798, b0: -1, b1: 1, hint: [0, 1, 0] },
    t2Top: { P: (z, u) => [u * tTop(T2, z), t2TopY(z), z], a0: 304, a1: 798, b0: -1, b1: 1, hint: [0, 1, 0] },
    t1Flank: (side) => ({ P: (z, s) => [side * (tTop(T1, z) + s * T1.slopeRun), t1TopY(z) - s * tRise(T1, z), z], a0: 168, a1: 798, b0: 0.05, b1: 0.95, hint: [side, 0.8, 0] }),
    t2Flank: (side) => ({ P: (z, s) => [side * (tTop(T2, z) + s * T2.slopeRun), t2TopY(z) - s * tRise(T2, z), z], a0: 348, a1: 798, b0: 0.05, b1: 0.95, hint: [side, 0.8, 0] }),
    // terrace stern faces (z = sternZ + 0.05): a = y, b across
    t1Stern: { P: (y, u) => [u * lerp(tBase(T1, 800), tTop(T1, 800), (y - (dorsalY(800) - 0.3)) / T1.rise), y, HULL.sternZ + 0.05], a0: dorsalY(800) + 0.6, a1: dorsalY(800) + T1.rise - 0.9, b0: -1, b1: 1, hint: [0, 0, 1] },
    t2Stern: { P: (y, u) => [u * lerp(tBase(T2, 800), tTop(T2, 800), (y - (dorsalY(800) + T1.rise - 0.3)) / T2.rise), y, HULL.sternZ + 0.05], a0: dorsalY(800) + T1.rise + 0.6, a1: dorsalY(800) + T1.rise + T2.rise - 0.9, b0: -1, b1: 1, hint: [0, 0, 1] },
    tbTop: { P: (z, u) => [u * TB.halfTop, TB.yTop, z], a0: 512, a1: 696, b0: -1, b1: 1, hint: [0, 1, 0] },
    tbFlank: (side) => ({
      P: (a, s) => {
        const zt = 512 + (a - 500) * (184 / 200);
        return [side * (TB.halfBot - (TB.halfBot - TB.halfTop) * s), TB.yb + (TB.yTop - TB.yb) * s, a * (1 - s) + zt * s];
      },
      a0: 501,
      a1: 699,
      b0: 0.04,
      b1: 0.96,
      hint: [side, 0.5, 0],
    }),
    tbFront: { P: (y, u) => [u * (TB.halfBot - (TB.halfBot - TB.halfTop) * ((y - TB.yb) / (TB.yTop - TB.yb))), y, TB.z0 + 12 * ((y - TB.yb) / (TB.yTop - TB.yb))], a0: TB.yb + 0.8, a1: TB.yTop - 0.8, b0: -1, b1: 1, hint: [0, 0.5, -1] },
    tbBack: { P: (y, u) => [u * (TB.halfBot - (TB.halfBot - TB.halfTop) * ((y - TB.yb) / (TB.yTop - TB.yb))), y, TB.z1 - 4 * ((y - TB.yb) / (TB.yTop - TB.yb))], a0: TB.yb + 0.8, a1: TB.yTop - 0.8, b0: -1, b1: 1, hint: [0, 0.5, 1] },
    plinthFront: { P: (y, u) => [u * TB.plinthHalf, y, TB.z0 + 0.4], a0: t2TopY(500) - 16, a1: TB.yb - 0.3, b0: -1, b1: 1, hint: [0, 0, -1] },
    neckSide: (side) => ({ P: (y, zf) => [side * NK.halfX(y), y, NK.zFront(y) + zf * (NK.zBack(y) - NK.zFront(y))], a0: NK.y0 + 2, a1: NK.yTop - 1.5, b0: 0, b1: 1, hint: [side, 0, 0] }),
    neckFront: { P: (y, u) => [u * NK.halfX(y), y, NK.zFront(y)], a0: NK.y0 + 2, a1: NK.yTop - 1.5, b0: -1, b1: 1, hint: [0, 0, -1] },
    neckBack: { P: (y, u) => [u * NK.halfX(y), y, NK.zBack(y)], a0: NK.y0 + 2, a1: NK.yTop - 1.5, b0: -1, b1: 1, hint: [0, 0, 1] },
    roof: { P: (z, u) => [u * BM.halfX, BM.y1, z], a0: BM.z0 + 2, a1: BM.z1 - 2, b0: -1, b1: 1, hint: [0, 1, 0] },
    bmSide: (side) => ({ P: (y, zf) => [side * BM.halfX, y, BM.z0 + 1 + zf * (BM.z1 - BM.z0 - 1)], a0: BM.y0 + 1, a1: BM.y1 - 1, b0: 0, b1: 1, hint: [side, 0, 0] }),
    bmBack: { P: (y, u) => [u * BM.halfX, y, BM.z1], a0: BM.y0 + 1, a1: BM.y1 - 1, b0: -1, b1: 1, hint: [0, 0, 1] },
    bmFront: { P: (y, u) => [u * BM.halfX, y, BM.z0], a0: BM.y0 + 1, a1: BM.y1 - 1, b0: -1, b1: 1, hint: [0, 0, -1] },
    bmUnder: { P: (z, u) => [u * (BM.halfX + 2), BM.y0 - 3, z], a0: BM.z0 - 1, a1: BM.z1 + 1, b0: -1, b1: 1, hint: [0, -1, 0] },
    stern: (() => {
      // engine block plate outline (hull.js): section scaled x 0.86, y about -8 by 0.8
      const yK = -8 + (keelY(800) + 8) * 0.8;
      const yE = -8 + (-E + 8) * 0.8;
      const yD = -8 + (dorsalY(800) + 8) * 0.8;
      const xK = wk(800) * 0.86;
      const xE = halfWidth(800) * 0.86;
      const xD = wt(800) * 0.86;
      const half = (y) => (y < yE ? lerp(xK, xE, (y - yK) / (yE - yK)) : lerp(xE, xD, (y - yE) / (yD - yE)));
      return { P: (y, u) => [u * (half(y) - 4), y, STERN_PLATE_Z], a0: yK + 3, a1: yD - 3, b0: -1, b1: 1, hint: [0, 0, 1], half };
    })(),
  };
  const wells = [HANGAR_WELL, SHUTTLE_WELL];
  const nearWell = (x, z, m) => wells.some((w) => x > w.x0 - m && x < w.x1 + m && z > w.z0 - m && z < w.z1 + m);
  const nearBulb = (x, z, m) => Math.hypot(x - REACTOR_BULB.x, z - REACTOR_BULB.z) < REACTOR_BULB.r + m;
  const bells = [...ENGINES.main, ...ENGINES.secondary];
  const nearBell = (x, y, m) => bells.some((b) => Math.hypot(x - b.x, y - b.y) < b.r * 1.3 + m);

  // ---- turbolaser batteries: positions first so scatter keeps clear ---------------------------
  const heavy = [];
  for (const z of [350, 450, 550]) {
    for (const side of [-1, 1]) {
      const x = side * (halfWidth(z) * 0.2 + 30);
      const y = dorsalY(z);
      heavy.push({ x, y, z, side, yaw0: -side * Math.PI * 0.25, baseY: y + 2.4 });
      blockers.push({ x, z, r: 15 });
      // static base ring (the rotating housing is an InstancedMesh, see below)
      col.add("dorsal", "L", "ring", [x, y, z], _q.identity(), [19, 2.4, 19], TINT.mid);
    }
  }
  const pd = [];
  {
    // along both knife edges just inboard of the trench lip, and on terrace / tower-base corners
    for (const side of [-1, 1]) for (const z of [-560, -400, -240, -80, 80, 240, 400, 560]) pd.push({ surf: SURF.dslope(side), a: z, b: 0.9, side });
    for (const side of [-1, 1]) {
      pd.push({ surf: SURF.t1Top, a: 178, b: side * (1 - 6 / tTop(T1, 178)), side });
      pd.push({ surf: SURF.t2Top, a: 358, b: side * (1 - 6 / tTop(T2, 358)), side });
      pd.push({ surf: SURF.t1Top, a: 790, b: side * (1 - 7 / tTop(T1, 790)), side });
      pd.push({ surf: SURF.tbTop, a: 522, b: side * (1 - 6 / TB.halfTop), side });
    }
    for (const t of pd) {
      const f = frameAt(t.surf, t.a, t.b);
      t.f = f;
      blockers.push({ x: f.p[0], z: f.p[2], r: 5 });
    }
  }
  // landing / docking pads on the plateau (reserved for future expansion)
  const pads = [
    [-22, -300],
    [22, -300],
    [-34, -120],
    [34, -120],
    [-(tBase(T1, 720) + (wt(720) - tBase(T1, 720)) / 2), 720],
    [tBase(T1, 720) + (wt(720) - tBase(T1, 720)) / 2, 720],
  ];
  for (const [x, z] of pads) blockers.push({ x, z, r: 12 });
  // sensor clusters (dish, whip antennas, cabinets) at a few hull positions, kept clear of scatter
  const clusters = [
    { p: [0, dorsalY(-560), -560], r: 7 },
    { p: [-(tTop(T1, 205) - 10), t1TopY(205), 205], r: 8 },
    { p: [tTop(T1, 205) - 10, t1TopY(205), 205], r: 8 },
    { p: [-(wt(776) - 16), dorsalY(776), 776], r: 9 },
    { p: [wt(776) - 16, dorsalY(776), 776], r: 9 },
    { p: [0, keelY(-420), -420], r: 8, down: true },
  ];
  for (const c of clusters) blockers.push({ x: c.p[0], z: c.p[2], r: c.r + 3 });

  // ---- city: terrace tops -----------------------------------------------------------------------
  const CITY_L = [["box", 0.34], ["step2", 0.14], ["step3", 0.08], ["taper", 0.1], ["tank", 0.08], ["tankH", 0.06], ["dome", 0.04], ["tower", 0.06], ["ridge", 0.05], ["vent", 0.05]];
  const CITY_M = [["box", 0.28], ["step2", 0.12], ["taper", 0.08], ["tank", 0.1], ["tankH", 0.05], ["dome", 0.05], ["wedge", 0.06], ["ridge", 0.06], ["hatch", 0.08], ["vent", 0.06], ["sensor", 0.06]];
  const CITY_S = [["box", 0.3], ["wedge", 0.1], ["hatch", 0.2], ["pipe", 0.12], ["mast", 0.05], ["tank", 0.08], ["dome", 0.04], ["step2", 0.05], ["sensor", 0.06]];
  const t2Footprint = (x, z) => z > 298 && Math.abs(x) < tBase(T2, z) + 1.5;
  dress("city", SURF.t1Top, {
    seed: 11,
    blocked: t2Footprint,
    passes: [
      { tier: "L", cell: 13, fill: 0.5, shapes: CITY_L, windows: true, stagger: true },
      { tier: "M", cell: 6, fill: 0.5, shapes: CITY_M, stagger: true },
      { tier: "S", cell: 2.6, fill: 0.42, shapes: CITY_S, palette: PAL.small },
    ],
  });
  const towerFootprint = (x, z) => z > 497 && z < 703 && Math.abs(x) < TB.halfBot + 1;
  dress("city", SURF.t2Top, {
    seed: 12,
    blocked: towerFootprint,
    passes: [
      { tier: "L", cell: 14, fill: 0.55, shapes: CITY_L, windows: true, stagger: true },
      { tier: "M", cell: 6, fill: 0.5, shapes: CITY_M, stagger: true },
      { tier: "S", cell: 2.6, fill: 0.4, shapes: CITY_S, palette: PAL.small },
    ],
  });
  // terrace flanks: rows of hatches, vents, wedges and conduits, plus window rows
  const FLANK_M = [["hatch", 0.3], ["box", 0.2], ["vent", 0.15], ["wedge", 0.15], ["pipe", 0.1], ["sensorUp", 0.1]];
  const FLANK_S = [["hatch", 0.35], ["box", 0.3], ["pipe", 0.2], ["wedge", 0.15]];
  for (const side of [-1, 1]) {
    for (const [surf, seed] of [
      [SURF.t1Flank(side), 21 + side],
      [SURF.t2Flank(side), 31 + side],
    ]) {
      dress("city", surf, {
        seed,
        margin: 2.2,
        passes: [
          { tier: "M", cell: 6.5, fill: 0.55, shapes: FLANK_M, heightScale: 0.6, stagger: true },
          { tier: "S", cell: 2.4, fill: 0.3, shapes: FLANK_S, palette: PAL.small, heightScale: 0.7 },
        ],
      });
      const r = rng(41 + seed);
      const pts = [];
      for (const s of [0.3, 0.66]) for (const z of seq(surf.a0 + 4, surf.a1 - 4, 7.5)) pts.push([z + (r() - 0.5) * 2, s]);
      windowRow("city", surf, pts, r, { w: 2.8, h: 1.0, skip: 0.3 });
    }
  }
  // terrace stern faces
  for (const [surf, seed] of [
    [SURF.t1Stern, 51],
    [SURF.t2Stern, 52],
  ]) {
    dress("stern", surf, {
      seed,
      margin: 2,
      palette: PAL.machinery,
      passes: [
        { tier: "M", cell: 5.5, fill: 0.5, shapes: [["box", 0.3], ["vent", 0.25], ["hatch", 0.2], ["sensorUp", 0.15], ["pipe", 0.1]], heightScale: 0.7 },
        { tier: "S", cell: 2.4, fill: 0.3, shapes: FLANK_S, palette: PAL.small, heightScale: 0.7 },
      ],
    });
    const r = rng(61 + seed);
    const pts = [];
    for (const y of [surf.a0 + 3.5, surf.a0 + 10]) {
      const len = lenB(surf, y);
      for (const d of seq(6, len - 6, 6.5)) pts.push([y, -1 + (2 * d) / len]);
    }
    windowRow("stern", surf, pts, r, { w: 2.6, h: 1.0, skip: 0.3 });
  }

  // ---- tower base block ----------------------------------------------------------------------
  const neckFootprint = (x, z) => Math.abs(x) < TOWER.neck.halfBase + 1.5 && z > TOWER.neck.z0 - 1.5 && z < TOWER.neck.z1 + 1.5;
  dress("tower", SURF.tbTop, {
    seed: 71,
    blocked: neckFootprint,
    passes: [
      { tier: "L", cell: 11, fill: 0.5, shapes: [["box", 0.25], ["tank", 0.15], ["step2", 0.12], ["sensor", 0.12], ["dome", 0.08], ["tower", 0.08], ["dish", 0.08], ["tankH", 0.06], ["mast", 0.06]], windows: true },
      { tier: "M", cell: 5, fill: 0.5, shapes: CITY_M, stagger: true },
      { tier: "S", cell: 2.3, fill: 0.4, shapes: CITY_S, palette: PAL.small },
    ],
  });
  for (const side of [-1, 1]) {
    const surf = SURF.tbFlank(side);
    dress("tower", surf, { seed: 81 + side, margin: 2, passes: [{ tier: "M", cell: 5.5, fill: 0.5, shapes: FLANK_M, heightScale: 0.6, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: FLANK_S, palette: PAL.small, heightScale: 0.7 }] });
    const r = rng(91 + side);
    const pts = [];
    for (const s of [0.3, 0.68]) for (const a of seq(506, 694, 7)) pts.push([a + (r() - 0.5) * 2, s]);
    windowRow("tower", surf, pts, r, { w: 2.6, h: 1.0, skip: 0.25 });
  }
  for (const [surf, seed] of [
    [SURF.tbFront, 101],
    [SURF.tbBack, 102],
  ]) {
    dress("tower", surf, { seed, margin: 2, passes: [{ tier: "M", cell: 5.5, fill: 0.5, shapes: FLANK_M, heightScale: 0.6, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: FLANK_S, palette: PAL.small, heightScale: 0.7 }] });
    const r = rng(seed + 7);
    const pts = [];
    for (const y of [TB.yb + 6, TB.yb + 13]) {
      const len = lenB(surf, y);
      for (const d of seq(5, len - 5, 6.5)) pts.push([y, -1 + (2 * d) / len]);
    }
    windowRow("tower", surf, pts, r, { w: 2.6, h: 1.0, skip: 0.25 });
  }
  // plinth front (the part standing proud of T2's top and flanks)
  {
    const t2SurfaceY = (x) => (Math.abs(x) <= tTop(T2, 500) ? t2TopY(500) : t2TopY(500) - ((Math.abs(x) - tTop(T2, 500)) / T2.slopeRun) * T2.rise);
    const surf = SURF.plinthFront;
    dress("tower", surf, { seed: 111, margin: 2, blocked: (x, y) => y < t2SurfaceY(x) + 1.2, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.5, shapes: [["box", 0.3], ["vent", 0.25], ["hatch", 0.2], ["sensorUp", 0.15], ["pipe", 0.1]], heightScale: 0.7 }, { tier: "S", cell: 2.2, fill: 0.3, shapes: FLANK_S, palette: PAL.small, heightScale: 0.7 }] });
    const r = rng(113);
    const pts = [];
    for (const y of [TB.yb - 4, TB.yb - 9, TB.yb - 14]) for (const d of seq(4, 2 * TB.plinthHalf - 4, 6.5)) {
      const x = -TB.plinthHalf + d;
      if (y > t2SurfaceY(x) + 1.5) pts.push([y, x / TB.plinthHalf]);
    }
    windowRow("tower", surf, pts, r, { w: 2.6, h: 1.0, skip: 0.2 });
  }

  // ---- neck ---------------------------------------------------------------------------------
  const WALL_M = [["sensorUp", 0.25], ["box", 0.25], ["vent", 0.2], ["hatch", 0.15], ["pipe", 0.15]];
  const WALL_S = [["hatch", 0.3], ["box", 0.3], ["pipe", 0.25], ["sensorUp", 0.15]];
  for (const side of [-1, 1]) {
    const surf = SURF.neckSide(side);
    // hull.js window rows sit at y0 + 12 + 11k; keep the strip around them clear
    const winBand = (x, y) => Math.abs(((y - NK.y0 - 12) % 11 + 11) % 11 - 0) < 1.6 || Math.abs(((y - NK.y0 - 12) % 11 + 11) % 11 - 11) < 1.6;
    dress("tower", surf, { seed: 121 + side, margin: 3, blocked: winBand, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.4, shapes: WALL_M, heightScale: 0.55, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
    // vertical conduits between the window columns
    const r = rng(131 + side);
    for (const zf of [0.08, 0.5, 0.92]) {
      const f = frameAt(surf, NK.y0 + NK.h * 0.5, zf);
      put("tower", "M", "pipe", f, [NK.h * 0.86, 1.1, 1.1], Math.PI / 2, jitterTint(r, TINT.gun));
    }
  }
  {
    const ribBlocked = (x) => [7, 14, 21, 28].some((rx) => Math.abs(Math.abs(x) - rx) < 2);
    dress("tower", SURF.neckFront, { seed: 141, margin: 2.5, blocked: ribBlocked, palette: PAL.machinery, passes: [{ tier: "M", cell: 4.5, fill: 0.4, shapes: WALL_M, heightScale: 0.55 }, { tier: "S", cell: 2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
    dress("tower", SURF.neckBack, { seed: 142, margin: 2.5, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.45, shapes: WALL_M, heightScale: 0.55, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
    const r = rng(143);
    const pts = [];
    for (const y of seq(NK.y0 + 8, NK.yTop - 8, 11)) {
      const len = lenB(SURF.neckBack, y);
      for (const d of seq(6, len - 6, 8)) pts.push([y, -1 + (2 * d) / len]);
    }
    windowRow("tower", SURF.neckBack, pts, r, { w: 2.8, h: 1.2, skip: 0.2 });
  }

  // ---- bridge module -------------------------------------------------------------------------
  {
    const domes = TOWER.domes;
    const mast = TOWER.mast;
    const roofBlocked = (x, y, z, size) => domes.some((d) => Math.hypot(x - d.x, z - d.z) < d.r * 0.85 + 2 + size * 0.5) || Math.hypot(x - mast.x, z - mast.z) < 9 + size * 0.5 || Math.abs(z - (BM.z0 + 6)) < 2.5;
    dress("tower", SURF.roof, {
      seed: 151,
      blocked: roofBlocked,
      passes: [
        { tier: "L", cell: 8.5, fill: 0.5, shapes: [["box", 0.22], ["sensor", 0.16], ["tank", 0.12], ["dish", 0.1], ["dome", 0.08], ["step2", 0.1], ["mast", 0.1], ["tankH", 0.06], ["vent", 0.06]], heightScale: 0.7 },
        { tier: "M", cell: 4.2, fill: 0.5, shapes: CITY_M, stagger: true },
        { tier: "S", cell: 2.0, fill: 0.4, shapes: CITY_S, palette: PAL.small },
      ],
    });
    // sensor cluster around the mast: dishes on pedestals and whip antennas
    const r = rng(161);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const f = { p: [mast.x + Math.cos(a) * 11, BM.y1, mast.z + Math.sin(a) * 11], n: [0, 1, 0] };
      put("tower", "L", "dish", f, [6.5, 6.5, 6.5], a + Math.PI / 2, jitterTint(r, TINT.light));
    }
    for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2;
      const d = 6 + r() * 9;
      const h = 9 + r() * 9;
      const f = { p: [mast.x + Math.cos(a) * d, BM.y1, mast.z + Math.sin(a) * d], n: [0, 1, 0] };
      put("tower", "M", "mast", f, [h * 0.35, h, h * 0.35], 0, jitterTint(r, TINT.steel));
    }
    // corner whip antennas and white markers
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const f = { p: [sx * (BM.halfX - 5), BM.y1, (BM.z0 + BM.z1) / 2 + sz * ((BM.z1 - BM.z0) / 2 - 6)], n: [0, 1, 0] };
      put("tower", "L", "mast", f, [5, 14, 5], 0, jitterTint(r, TINT.steel));
      lamp("tower", [f.p[0], BM.y1 + 14.4, f.p[2]], 0.9, LIGHT.cool);
    }
    // shield generator pedestals: radial ribs and cable runs down onto the roof
    for (const d of domes) {
      const rb = d.r * 0.8;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const px = d.x + Math.cos(a) * (rb + 1.6);
        const pz = d.z + Math.sin(a) * (rb + 1.6);
        // wedge: back face toward the pedestal, slope running outward
        put("tower", "M", "wedge", { p: [px, BM.y1, pz], n: [0, 1, 0] }, [2.2, 3.2, 4.0], -a + Math.PI / 2, jitterTint(r, TINT.mid));
        if (k % 2 === 0) put("tower", "M", "pipe", { p: [d.x + Math.cos(a) * (rb + 6), BM.y1, d.z + Math.sin(a) * (rb + 6)], n: [0, 1, 0] }, [7, 0.7, 0.7], -a, jitterTint(r, TINT.gun));
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + 0.2;
        put("tower", "S", "box", { p: [d.x + Math.cos(a) * (rb + 3.4), BM.y1, d.z + Math.sin(a) * (rb + 3.4)], n: [0, 1, 0] }, [1.2, 0.8 + r() * 0.8, 1.6], -a, jitterTint(r, TINT.dark));
      }
    }
    // sides: window rows, sensor blocks, vents
    for (const side of [-1, 1]) {
      const surf = SURF.bmSide(side);
      dress("tower", surf, { seed: 171 + side, margin: 2, blocked: (x, y) => Math.abs(y - (BM.y0 + 14)) < 1.6, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.45, shapes: WALL_M, heightScale: 0.55, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
      const pts = [];
      for (const y of [BM.y0 + 6.5, BM.y0 + 22]) for (const d of seq(6, BM.z1 - BM.z0 - 6, 7)) pts.push([y, d / (BM.z1 - BM.z0 - 1)]);
      windowRow("tower", surf, pts, r, { w: 2.8, h: 1.2, skip: 0.2 });
    }
    // back face
    // keep the observation deck's aft viewport band (ROOMS.observation south wall, y 190.9..194.5) clear
    const obsPorts = (x, y) => Math.abs(x) < 21 && y > 188.8 && y < 197.2;
    dress("tower", SURF.bmBack, { seed: 181, margin: 2, blocked: obsPorts, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.45, shapes: WALL_M, heightScale: 0.55, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
    {
      const pts = [];
      for (const y of [BM.y0 + 7, BM.y0 + 15, BM.y0 + 23]) for (const d of seq(6, 2 * BM.halfX - 6, 7)) if (!obsPorts(d - BM.halfX, y)) pts.push([y, -1 + d / BM.halfX]);
      windowRow("tower", SURF.bmBack, pts, r, { w: 2.8, h: 1.2, skip: 0.2 });
    }
    // front face: keep the bridge window casement clear; brow of sensor blocks along the top edge,
    // heavier sensor / comms gear at the corners, a row of small ports below the brow
    {
      const wb = ROOMS.bridge.windowBand;
      const casement = (x, y) => Math.abs(x) < wb.x1 - wb.x0 + 7 && y > wb.y0 - 3.5 && y < wb.y1 + 3.5;
      dress("tower", SURF.bmFront, { seed: 191, margin: 2, blocked: casement, palette: PAL.machinery, passes: [{ tier: "M", cell: 5, fill: 0.4, shapes: [["sensorUp", 0.35], ["hatch", 0.25], ["box", 0.2], ["vent", 0.2]], heightScale: 0.5, stagger: true }, { tier: "S", cell: 2.2, fill: 0.3, shapes: WALL_S, palette: PAL.small, heightScale: 0.55 }] });
      for (let k = 0; k < 15; k++) {
        const x = -BM.halfX + 8 + k * 12.8;
        put("tower", "M", "sensorUp", { p: [x, BM.y1 - 3.2, BM.z0], n: [0, 0, -1] }, [4.2, 1.4, 2.6], 0, jitterTint(r, TINT.gun));
      }
      const pts = [];
      for (const d of seq(6, 2 * BM.halfX - 6, 5.5)) {
        const x = -BM.halfX + d;
        if (Math.abs(x) > wb.x1 - wb.x0 + 8) pts.push([BM.y0 + 5, x / BM.halfX]);
      }
      windowRow("tower", SURF.bmFront, pts, r, { w: 2.2, h: 1.0, skip: 0.15 });
    }
    // underside: hanging equipment, pipe runs across, buttress wedges against the neck
    dress("tower", SURF.bmUnder, { seed: 201, margin: 3, blocked: (x, y, z) => Math.abs(x) < TOWER.neck.halfTop + 3 && z > 570 && z < 640, palette: PAL.machinery, passes: [{ tier: "M", cell: 6, fill: 0.45, shapes: [["box", 0.35], ["tank", 0.2], ["pipe", 0.2], ["hatch", 0.15], ["vent", 0.1]], heightScale: 0.6, stagger: true }, { tier: "S", cell: 2.4, fill: 0.25, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 }] });
  }

  // ---- edge trenches ------------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const region = side < 0 ? "trenchP" : "trenchS";
    const surf = SURF.trench(side);
    dress(region, surf, {
      seed: 211 + side,
      palette: PAL.trench,
      passes: [
        { tier: "S", cell: 2.4, fill: 0.55, margin: 0.2, shapes: [["box", 0.4], ["tank", 0.2], ["pipe", 0.2], ["hatch", 0.1], ["vent", 0.1]], heightScale: 1.3, spin90: 0.2 },
        { tier: "S", cell: 1.1, fill: 0.5, margin: 0.25, seed: 5, shapes: [["box", 0.5], ["tank", 0.25], ["hatch", 0.25]], heightScale: 1.0, jitter: 0.6 },
      ],
    });
    // dim amber service lights every ~14 m along the trench wall
    const r = rng(221 + side);
    for (const z of seq(-660, 790, 14)) {
      const f = frameAt(surf, z + (r() - 0.5) * 4, 0.55);
      lamp(region, [f.p[0] + f.n[0] * 0.3, f.p[1], f.p[2]], 0.5, r() < 0.7 ? LIGHT.amber : LIGHT.cool);
    }
    // two rows of small lit ports along the whole trench wall: from a few hundred metres the trench
    // reads as the film's line of tiny lights along the knife edge
    for (const v of [0.42, -0.4]) {
      for (const z of seq(-700, 792, 4.6)) {
        if (r() < 0.22) continue;
        const f = frameAt(surf, z + (r() - 0.5) * 1.2, v);
        // hull.js lays a dark strip 5 cm proud of the trench wall; stay clear of it
        winStrip(region, f, 1.0 + r() * 0.5, 0.42, r() < 0.1 ? LIGHT.warm : LIGHT.cool, 0.22);
      }
    }
    // exposed hull frames bridging the notch every ~28 m (plates from the inner wall out to the lip)
    for (const z of seq(-690, 790, 28)) {
      const zz = z + (r() - 0.5) * 10;
      const f = frameAt(surf, zz, 0);
      put(region, "L", "box", f, [1.0 + r() * 0.4, td(zz) - 0.5, 3.4], 0, jitterTint(r, r() < 0.6 ? TINT.dark : TINT.gun));
    }
    // "streets" of service detail along both lips on the slopes just inboard of the edge
    const PLAT_S_LIP = [["hatch", 0.4], ["box", 0.3], ["pipe", 0.15], ["wedge", 0.15]];
    for (const [surfLip, seedLip] of [
      [SURF.lipStreet(side, 1), 231 + side],
      [SURF.lipStreet(side, -1), 241 + side],
    ]) {
      dress(region, surfLip, {
        seed: seedLip,
        margin: 0.5,
        palette: PAL.plate,
        passes: [
          { tier: "M", cell: 7, fill: 0.55, shapes: [["hatch", 0.35], ["box", 0.25], ["vent", 0.2], ["sensorUp", 0.1], ["port", 0.1]], heightScale: 0.5, spin90: 0.5 },
          { tier: "S", cell: 3, fill: 0.35, shapes: PLAT_S_LIP, palette: PAL.small, heightScale: 0.7 },
        ],
      });
    }
  }

  // ---- dorsal plateau and slopes ------------------------------------------------------------
  const PLAT_L = [["box", 0.3], ["hatch", 0.2], ["tankH", 0.12], ["step2", 0.1], ["dome", 0.08], ["taper", 0.08], ["port", 0.06], ["vent", 0.06]];
  const PLAT_M = [["hatch", 0.3], ["box", 0.25], ["vent", 0.12], ["tank", 0.1], ["pipe", 0.08], ["wedge", 0.08], ["port", 0.07]];
  const PLAT_S = [["hatch", 0.4], ["box", 0.3], ["pipe", 0.15], ["wedge", 0.15]];
  dress("dorsal", SURF.plateau, {
    seed: 231,
    margin: 4,
    passes: [
      { tier: "L", cell: 24, fill: 0.3, shapes: PLAT_L, heightScale: 0.45, stagger: true },
      { tier: "M", cell: 9, fill: 0.25, shapes: PLAT_M, heightScale: 0.6 },
      { tier: "S", cell: 3.6, fill: 0.12, shapes: PLAT_S, palette: PAL.small },
    ],
  });
  for (const side of [-1, 1]) {
    dress("dorsal", SURF.plateauStrip(side), {
      seed: 241 + side,
      margin: 1.5,
      passes: [
        { tier: "L", cell: 12, fill: 0.25, shapes: [["tank", 0.3], ["box", 0.3], ["tankH", 0.2], ["dome", 0.2]], heightScale: 0.6 },
        { tier: "M", cell: 7, fill: 0.45, shapes: PLAT_M, heightScale: 0.7, stagger: true },
        { tier: "S", cell: 2.8, fill: 0.3, shapes: PLAT_S, palette: PAL.small },
      ],
    });
    const ds = SURF.dslope(side);
    dress("dorsal", ds, {
      seed: 251 + side,
      margin: 6,
      palette: PAL.slope,
      passes: [
        { tier: "L", cell: 20, fill: 0.24, shapes: [["hatch", 0.5], ["box", 0.25], ["port", 0.1], ["vent", 0.1], ["grille", 0.05]], heightScale: 0.3, spin90: 0.15 },
        { tier: "M", cell: 11, fill: 0.24, shapes: [["hatch", 0.45], ["box", 0.25], ["vent", 0.15], ["wedge", 0.15]], heightScale: 0.45 },
        { tier: "S", cell: 5, fill: 0.06, shapes: PLAT_S, palette: PAL.small },
      ],
    });
    // panel lines: three long raised seams per slope running the length of the hull in segments,
    // plus a few free ribs, so the slopes carry structure at 2 km where individual hatches vanish
    const r = rng(261 + side);
    for (const s of [0.24, 0.5, 0.76]) {
      let z = -640 + r() * 40;
      while (z < 760) {
        const L = 40 + r() * 110;
        if (z + L > 790) break;
        const f = frameAt(ds, z + L / 2, s + (r() - 0.5) * 0.02);
        put("dorsal", "L", "box", f, [1.4 + r() * 0.8, 0.35 + r() * 0.25, L], 0, jitterTint(r, r() < 0.6 ? TINT.light : TINT.mid));
        z += L + 8 + r() * 30;
      }
    }
    for (let k = 0; k < 7; k++) {
      const s = 0.12 + r() * 0.76;
      const z0 = -600 + r() * 1150;
      const L = 50 + r() * 140;
      const f = frameAt(ds, z0 + L / 2, s);
      put("dorsal", "L", "box", f, [2.2 + r() * 1.5, 0.45 + r() * 0.35, L], 0, jitterTint(r, r() < 0.5 ? TINT.light : TINT.mid));
    }
    // running lights along the knife edge lip: red port, green starboard
    for (const z of seq(-600, 780, 172)) {
      const f = frameAt(ds, z, 0.965);
      lamp("dorsal", [f.p[0] + f.n[0] * 0.7, f.p[1] + f.n[1] * 0.7, f.p[2]], 1.3, side < 0 ? LIGHT.red : LIGHT.green);
      const fk = frameAt(SURF.kslope(side), z, 0.965);
      lamp("keel", [fk.p[0] + fk.n[0] * 0.7, fk.p[1] + fk.n[1] * 0.7, fk.p[2]], 1.3, side < 0 ? LIGHT.red : LIGHT.green);
    }
  }
  lamp("dorsal", [0, 2.5, HULL.bowZ + 6], 1.2, LIGHT.cool);
  lamp("dorsal", [0, -2.5, HULL.bowZ + 6], 1.2, LIGHT.cool);
  // landing pads with corner lights and a little ground equipment
  {
    const r = rng(271);
    for (const [x, z] of pads) {
      const f = { p: [x, dorsalY(z), z], n: [0, 1, 0] };
      put("dorsal", "L", "pad", f, [17, 1, 17], 0, TINT.mid);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) lamp("dorsal", [x + sx * 8, dorsalY(z) + 0.5, z + sz * 8], 0.7, LIGHT.amber);
      put("dorsal", "M", "box", { p: [x + 10.5, dorsalY(z), z - 6], n: [0, 1, 0] }, [2.2, 1.6, 3], 0, jitterTint(r, TINT.dark));
      put("dorsal", "M", "tank", { p: [x + 10.8, dorsalY(z), z + 2], n: [0, 1, 0] }, [1.8, 2.4, 1.8], 0, jitterTint(r, TINT.gun));
      put("dorsal", "M", "mast", { p: [x - 10.5, dorsalY(z), z + 7], n: [0, 1, 0] }, [2.4, 7, 2.4], 0, TINT.steel);
      lamp("dorsal", [x - 10.5, dorsalY(z) + 7.3, z + 7], 0.6, LIGHT.red);
    }
  }
  // dorsal plateau: white markers on the terrace front corners
  for (const side of [-1, 1]) {
    lamp("city", [side * (tTop(T1, 170) - 2), t1TopY(170) + 0.6, 170], 1.0, LIGHT.cool);
    lamp("city", [side * (tTop(T2, 350) - 2), t2TopY(350) + 0.6, 350], 1.0, LIGHT.cool);
  }

  // ---- keel ---------------------------------------------------------------------------------
  dress("keel", SURF.keel, {
    seed: 281,
    margin: 4,
    palette: PAL.keel,
    blocked: (x, y, z, size) => nearWell(x, z, 7 + size * 0.5) || nearBulb(x, z, 8 + size * 0.5),
    passes: [
      { tier: "L", cell: 22, fill: 0.24, shapes: PLAT_L, heightScale: 0.5, stagger: true },
      { tier: "M", cell: 9, fill: 0.22, shapes: PLAT_M, heightScale: 0.6 },
      { tier: "S", cell: 3.6, fill: 0.08, shapes: PLAT_S, palette: PAL.small },
    ],
  });
  for (const side of [-1, 1]) {
    const ks = SURF.kslope(side);
    dress("keel", ks, {
      seed: 291 + side,
      margin: 6,
      palette: PAL.slope,
      passes: [
        { tier: "L", cell: 22, fill: 0.17, shapes: [["hatch", 0.5], ["box", 0.3], ["port", 0.1], ["vent", 0.1]], heightScale: 0.3, spin90: 0.15 },
        { tier: "M", cell: 12, fill: 0.16, shapes: [["hatch", 0.45], ["box", 0.25], ["vent", 0.15], ["wedge", 0.15]], heightScale: 0.45 },
        { tier: "S", cell: 5.5, fill: 0.04, shapes: PLAT_S, palette: PAL.small },
      ],
    });
    // panel seams along the keel slopes too
    const r = rng(296 + side);
    for (const s of [0.3, 0.62]) {
      let z = -600 + r() * 40;
      while (z < 760) {
        const L = 40 + r() * 110;
        if (z + L > 790) break;
        const f = frameAt(ks, z + L / 2, s + (r() - 0.5) * 0.02);
        put("keel", "L", "box", f, [1.4 + r() * 0.8, 0.35 + r() * 0.25, L], 0, jitterTint(r, r() < 0.6 ? TINT.light : TINT.mid));
        z += L + 10 + r() * 30;
      }
    }
  }
  // hangar / shuttle wells: bay-door frames, docking clamps, floodlights
  {
    const r = rng(301);
    for (const w of wells) {
      const cx = (w.x0 + w.x1) / 2;
      const cz = (w.z0 + w.z1) / 2;
      const y = keelY(cz);
      const W = w.x1 - w.x0 + 9;
      const D = w.z1 - w.z0 + 9;
      put("keel", "L", "frame", { p: [cx, y, cz], n: [0, -1, 0] }, [W, 2.2, D], 0, TINT.dark);
      put("keel", "L", "frame", { p: [cx, y, cz], n: [0, -1, 0] }, [W + 5, 1.2, D + 5], 0, TINT.gun);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const px = cx + sx * (W / 2 + 4);
        const pz = cz + sz * (D / 2 + 4);
        put("keel", "L", "clamp", { p: [px, keelY(pz), pz], n: [0, -1, 0] }, [7, 5, 4], sx > 0 ? Math.PI : 0, jitterTint(r, TINT.gun));
        put("keel", "M", "box", { p: [px + sx * 5, keelY(pz), pz - sz * 3], n: [0, -1, 0] }, [3, 2, 4], 0, jitterTint(r, TINT.dark));
      }
      // floodlights along the long sides of the frame, pointing down
      for (const sx of [-1, 1]) for (const d of seq(6, D - 6, (D - 12) / 4)) {
        const pz = w.z0 - 4.5 + d;
        lamp("keel", [cx + sx * (W / 2 + 0.3), keelY(pz) - 2.6, pz], 0.9, LIGHT.warm);
        put("keel", "M", "box", { p: [cx + sx * (W / 2 + 0.3), keelY(pz), pz], n: [0, -1, 0] }, [1.4, 2.2, 1.4], 0, TINT.gun);
      }
      // bay perimeter marker lights on the outer frame (cool white, every ~8 m) so the approach reads
      // in the keel's shadow
      for (const sx of [-1, 1]) for (const d of seq(3, D + 5, 8)) lamp("keel", [cx + sx * (W / 2 + 3.2), keelY(cz) - 1.5, w.z0 - 4.5 - 2.5 + d], 0.45, LIGHT.cool);
      for (const sz of [-1, 1]) for (const d of seq(3, W + 5, 8)) lamp("keel", [w.x0 - 4.5 - 2.5 + d, keelY(cz) - 1.5, cz + sz * (D / 2 + 3.2)], 0.45, LIGHT.cool);
      // docking equipment cabinets and fuel tanks along the frame
      for (const sz of [-1, 1]) for (let k = 0; k < 3; k++) {
        const px = cx - 12 + k * 12;
        const pz = cz + sz * (D / 2 + 9);
        put("keel", "M", k === 1 ? "tankH" : "box", { p: [px, keelY(pz), pz], n: [0, -1, 0] }, k === 1 ? [3.5, 3.5, 8] : [4, 2.5, 3], 0, jitterTint(r, k === 1 ? TINT.gun : TINT.mid));
      }
    }
    // reactor bulb: clamp ring at the keel, radial pipe runs, meridian ribs and hatch bands on the sphere
    const b = REACTOR_BULB;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const px = b.x + Math.cos(a) * (b.r + 6);
      const pz = b.z + Math.sin(a) * (b.r + 6);
      put("keel", "L", "clamp", { p: [px, keelY(pz), pz], n: [0, -1, 0] }, [7, 5.5, 4.5], -a + Math.PI, jitterTint(r, TINT.gun));
      if (k % 3 === 1) put("keel", "L", "pipe", { p: [b.x + Math.cos(a) * (b.r + 26), keelY(pz), b.z + Math.sin(a) * (b.r + 26)], n: [0, -1, 0] }, [34, 1.8, 1.8], -a, jitterTint(r, TINT.dark));
      else if (k % 3 === 2) put("keel", "M", "box", { p: [b.x + Math.cos(a) * (b.r + 14), keelY(pz), b.z + Math.sin(a) * (b.r + 14)], n: [0, -1, 0] }, [4, 2.2, 5], -a, jitterTint(r, TINT.mid));
    }
    const yKeelAtBulb = keelY(b.z);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      for (let seg = 0; seg < 5; seg++) {
        const th = 0.22 + seg * 0.19; // polar angle from the bottom point
        const px = b.x + Math.cos(a) * Math.sin(th) * b.r;
        const py = b.y - Math.cos(th) * b.r;
        const pz = b.z + Math.sin(a) * Math.sin(th) * b.r;
        if (py > yKeelAtBulb - 2) continue;
        const n = [(px - b.x) / b.r, (py - b.y) / b.r, (pz - b.z) / b.r];
        put("keel", "M", "box", { p: [px, py, pz], n }, [1.6, 0.7, 10.2], -a + Math.PI / 2, jitterTint(r, TINT.dark));
      }
    }
    for (const th of [0.5, 0.85, 1.2]) {
      const n = Math.round(10 + th * 12);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + th;
        const px = b.x + Math.cos(a) * Math.sin(th) * b.r;
        const py = b.y - Math.cos(th) * b.r;
        const pz = b.z + Math.sin(a) * Math.sin(th) * b.r;
        if (py > yKeelAtBulb - 2) continue;
        const nn = [(px - b.x) / b.r, (py - b.y) / b.r, (pz - b.z) / b.r];
        const shape = r() < 0.6 ? "hatch" : r() < 0.5 ? "box" : "vent";
        put("keel", "S", shape, { p: [px, py, pz], n: nn }, [2.4, 0.4 + r() * 0.5, 2.4], -a, jitterTint(r, pick(r, PAL.keel)));
      }
    }
    lamp("keel", [b.x, b.y - b.r - 0.7, b.z], 1.2, LIGHT.red);
  }

  // ---- sensor clusters and the comms mast ------------------------------------------------------
  {
    const r = rng(351);
    for (const c of clusters) {
      const n = c.down ? [0, -1, 0] : [0, 1, 0];
      const region = c.down ? "keel" : "dorsal";
      const at = (dx, dz) => ({ p: [c.p[0] + dx, c.p[1], c.p[2] + dz], n });
      const a0 = r() * Math.PI * 2;
      // dish on one side of the cluster, the main sensor block opposite, whips and cabinets around
      put(region, "L", "dish", at(Math.cos(a0) * c.r * 0.45, Math.sin(a0) * c.r * 0.45), [6, 6.5, 6], r() * Math.PI * 2, jitterTint(r, TINT.light));
      put(region, "M", "sensor", at(-Math.cos(a0) * c.r * 0.45, -Math.sin(a0) * c.r * 0.45), [3, 4.5, 3], a0, jitterTint(r, TINT.gun));
      for (let k = 0; k < 3; k++) {
        const a = a0 + ((k + 1) / 4) * Math.PI * 2 + (r() - 0.5) * 0.5;
        const h = 7 + r() * 8;
        put(region, "M", "mast", at(Math.cos(a) * c.r * 0.85, Math.sin(a) * c.r * 0.85), [h * 0.35, h, h * 0.35], 0, jitterTint(r, TINT.steel));
      }
      for (let k = 0; k < 3; k++) {
        const a = a0 + (k / 3) * Math.PI * 2 + 1.1;
        put(region, "M", k === 1 ? "tank" : "box", at(Math.cos(a) * c.r * 0.7, Math.sin(a) * c.r * 0.7), k === 1 ? [2.2, 3, 2.2] : [3 + r() * 1.5, 1.8 + r() * 1.2, 2.4], r() * Math.PI * 2, jitterTint(r, TINT.dark));
      }
      lamp(region, [c.p[0] - Math.cos(a0) * c.r * 0.45, c.p[1] + (c.down ? -4.8 : 4.8), c.p[2] - Math.sin(a0) * c.r * 0.45], 0.5, LIGHT.red);
    }
    // comms mast: rings of sensor boxes around the tapering column and two shoulder dishes
    const m = TOWER.mast;
    const rad = (y) => m.r * 1.6 - m.r * 0.6 * ((y - m.y0) / (m.y1 - m.y0));
    for (const [y, k0] of [
      [m.y0 + 14, 0],
      [m.y0 + 28, 0.4],
      [m.y0 + 42, 0.8],
    ]) {
      for (let k = 0; k < 4; k++) {
        const a = k0 + (k / 4) * Math.PI * 2;
        put("tower", "M", "sensorUp", { p: [m.x + Math.cos(a) * (rad(y) - 0.2), y, m.z + Math.sin(a) * (rad(y) - 0.2)], n: [Math.cos(a), 0, Math.sin(a)] }, [1.8, 1.3, 2.6], 0, jitterTint(r, TINT.gun));
      }
    }
    for (const s of [-1, 1]) put("tower", "M", "dish", { p: [m.x + s * (rad(m.y0 + 36) - 0.2), m.y0 + 36, m.z], n: [s, 0, 0] }, [3.6, 3.6, 3.6], 0, jitterTint(r, TINT.light));
  }

  // ---- stern engine block -------------------------------------------------------------------
  {
    const st = SURF.stern;
    dress("stern", st, {
      seed: 311,
      margin: 3,
      palette: PAL.machinery,
      blocked: (x, y, z, size) => nearBell(x, y, 3 + size * 0.5),
      passes: [
        { tier: "L", cell: 13, fill: 0.55, shapes: [["grille", 0.38], ["tank", 0.14], ["box", 0.18], ["tankH", 0.1], ["hatch", 0.1], ["step2", 0.1]], heightScale: 0.55, stagger: true },
        { tier: "M", cell: 6, fill: 0.4, shapes: [["pipe", 0.3], ["box", 0.2], ["vent", 0.2], ["hatch", 0.15], ["sensorUp", 0.15]], heightScale: 0.6 },
        { tier: "S", cell: 2.5, fill: 0.25, shapes: WALL_S, palette: PAL.small, heightScale: 0.6 },
      ],
    });
    // fuel lines: long horizontal runs below the main bells and between the secondaries
    const r = rng(321);
    for (const [y, L, x] of [
      [-52, 330, 0],
      [-58.5, 300, 0],
      [-46, 120, -300],
      [-46, 120, 300],
      [28, 70, -80],
      [28, 70, 80],
    ]) {
      put("stern", "L", "pipe", { p: [x, y, STERN_PLATE_Z], n: [0, 0, 1] }, [L, 2.4, 2.4], 0, jitterTint(r, TINT.dark));
    }
    // vertical feeds from the fuel lines up to each main bell collar
    for (const e of ENGINES.main) {
      for (const dx of [-14, 14]) put("stern", "L", "pipe", { p: [e.x + dx, (e.y - e.r * 1.16 - 52) / 2, STERN_PLATE_Z], n: [0, 0, 1] }, [Math.abs(e.y - e.r * 1.16 + 52) - 2, 1.9, 1.9], Math.PI / 2, jitterTint(r, TINT.gun));
    }
    // white marker lights on the stern rim corners and amber ones flanking the bells
    for (const sx of [-1, 1]) {
      lamp("stern", [sx * (halfWidth(800) * 0.9 - 3), 0, HULL.sternZ + 3.2], 1.2, LIGHT.cool);
      lamp("stern", [sx * (wt(800) - 8), dorsalY(800) - 2, HULL.sternZ + 1], 1.0, LIGHT.cool);
    }
    for (const e of ENGINES.main) for (const sx of [-1, 1]) lamp("stern", [e.x + sx * (e.r * 1.16 + 3), e.y - e.r * 1.16 - 3, STERN_PLATE_Z + 0.6], 0.8, LIGHT.amber);
  }

  // ---- build the batches --------------------------------------------------------------------
  const chunks = [];
  const emisByRegion = new Map();
  for (const ch of col.chunks.values()) {
    const items = ch.items;
    const out = { key: ch.key, box: new THREE.Box3(), ml: null, small: null, mediumIds: [], showM: true, trisL: 0, trisM: 0, trisS: 0 };
    out.ml = makeBatch(
      items.filter((it) => it.tier === "M" || it.tier === "L"),
      mats.hullGreeble,
      shapes,
      { castShadow: true },
      (id, it) => {
        const t = shapes[it.shape].attributes.position.count / 3;
        if (it.tier === "M") {
          out.mediumIds.push(id);
          out.trisM += t;
        } else out.trisL += t;
      },
    );
    out.small = makeBatch(
      items.filter((it) => it.tier === "S"),
      mats.hullGreeble,
      shapes,
      { castShadow: false },
      (id, it) => (out.trisS += shapes[it.shape].attributes.position.count / 3),
    );
    for (const m of [out.ml, out.small]) {
      if (!m) continue;
      m.name = "greebles_" + ch.key;
      group.add(m);
      out.box.union(m.boundingBox);
      stats.batches++;
    }
    const e = items.filter((it) => it.tier === "E");
    if (e.length) emisByRegion.set(ch.region, (emisByRegion.get(ch.region) || []).concat(e));
    chunks.push(out);
  }
  // lights and windows: one batch per region (two triangles each, no LOD), so they cost a handful of
  // draws instead of one per chunk
  let trisE = 0;
  for (const [region, items] of emisByRegion) {
    const bm = makeBatch(items, mats.emitTint, shapes, { castShadow: false });
    bm.name = "greebles_lights_" + region;
    group.add(bm);
    trisE += bm.userData.tris;
    stats.batches++;
  }

  // ---- turbolaser batteries (InstancedMesh, slewed in update) --------------------------------
  const heavyGeo = (() => {
    const parts = [
      C(7.4, 1.2, 16, 0, 0.6, 0, 0.85),
      paint(taperedBox(13, 9, 10.5, 7.5, 5.5).translate(0, 1.2, 0)),
      B(9, 4, 3.2, 0, 4.4, -5.4, 0.9),
      B(2, 3, 3.2, -5.6, 4.2, -3.2, 0.8),
      B(2, 3, 3.2, 5.6, 4.2, -3.2, 0.8),
      B(2.2, 1.3, 2.6, 0.5, 6.7, 1.2, 0.9),
      C(0.16, 4, 6, -2.2, 8.5, 2.2, 0.7),
    ];
    // twin barrels, pitched up 6 degrees, with breech sleeve, mid and muzzle collars
    for (const bx of [-1.9, 1.9]) {
      const g = M(C(0.85, 22, 14, 0, 0, -17, 0.6, { axis: "z" }), C(1.25, 6, 14, 0, 0, -10, 0.75, { axis: "z" }), C(1.1, 1.6, 14, 0, 0, -19, 0.75, { axis: "z" }), C(1.15, 2.4, 14, 0, 0, -27, 0.78, { axis: "z" }));
      g.rotateX(THREE.MathUtils.degToRad(6));
      g.translate(bx, 4.6, 0);
      parts.push(g);
    }
    return M(...parts);
  })();
  const pdGeo = M(C(2.0, 0.7, 10, 0, 0.35, 0, 0.85), B(3, 1.8, 2.6, 0, 1.6, 0), B(0.8, 0.6, 0.8, 0.6, 2.8, 0.4, 0.7), C(0.2, 5, 6, -0.6, 1.9, -3.2, 0.6, { axis: "z" }), C(0.2, 5, 6, 0.6, 1.9, -3.2, 0.6, { axis: "z" }), C(0.42, 1.2, 6, -0.6, 1.9, -1.6, 0.75, { axis: "z" }), C(0.42, 1.2, 6, 0.6, 1.9, -1.6, 0.75, { axis: "z" }));
  const heavyMesh = new THREE.InstancedMesh(heavyGeo, mats.hullGreeble, heavy.length);
  const pdMesh = new THREE.InstancedMesh(pdGeo, mats.hullGreeble, pd.length);
  {
    const r = rng(331);
    heavy.forEach((t, i) => {
      t.slew = i % 2 === 0;
      t.phase = r() * Math.PI * 2;
      t.rate = 0.05 + r() * 0.04;
      t.amp = 0.3 + r() * 0.2;
      _m.compose(_p.set(t.x, t.baseY, t.z), _q.setFromAxisAngle(UP, t.yaw0), _s.set(1, 1, 1));
      heavyMesh.setMatrixAt(i, _m);
      heavyMesh.setColorAt(i, jitterTint(r, TINT.gun, 0.06));
    });
    pd.forEach((t, i) => {
      const f = t.f;
      t.q = orient(f.n, 0, new THREE.Quaternion());
      t.yaw0 = t.side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      t.slew = i % 3 === 0;
      t.phase = r() * Math.PI * 2;
      t.rate = 0.08 + r() * 0.08;
      t.amp = 0.5 + r() * 0.4;
      _qs.setFromAxisAngle(UP, t.yaw0);
      _m.compose(_p.set(f.p[0], f.p[1], f.p[2]), _q.copy(t.q).multiply(_qs), _s.set(1.15, 1.15, 1.15));
      pdMesh.setMatrixAt(i, _m);
      pdMesh.setColorAt(i, jitterTint(r, TINT.dark, 0.06));
    });
    for (const m of [heavyMesh, pdMesh]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.castShadow = true;
      m.receiveShadow = true;
      m.computeBoundingSphere();
      m.userData.tris = (m.geometry.attributes.position.count / 3) * m.count;
      m.onBeforeRender = countDraw;
      m.name = "turrets";
      group.add(m);
    }
  }
  // ---- anti-collision strobes (one instanced mesh, material intensity toggled) ----------------
  const strobePos = [
    [0, TOWER.mast.y1 + 15.5, TOWER.mast.z],
    [-BM.halfX + 2, BM.y1 + 0.8, BM.z0 + 2],
    [BM.halfX - 2, BM.y1 + 0.8, BM.z0 + 2],
    [-BM.halfX + 2, BM.y1 + 0.8, BM.z1 - 2],
    [BM.halfX - 2, BM.y1 + 0.8, BM.z1 - 2],
    [0, 3.2, HULL.bowZ + 3],
    [-wt(800) - 4, dorsalY(800) - 1.2, HULL.sternZ - 2],
    [wt(800) + 4, dorsalY(800) - 1.2, HULL.sternZ - 2],
    [0, REACTOR_BULB.y - REACTOR_BULB.r - 2.2, REACTOR_BULB.z],
    [-halfWidth(200) * 0.9, 4.5, 200],
    [halfWidth(200) * 0.9, 4.5, 200],
    [-halfWidth(200) * 0.9, -4.5, 200],
    [halfWidth(200) * 0.9, -4.5, 200],
  ];
  const strobeMesh = new THREE.InstancedMesh(shapes.cube, mats.emitStrobe, strobePos.length);
  strobePos.forEach((p, i) => strobeMesh.setMatrixAt(i, _m.compose(_p.set(p[0], p[1], p[2]), _q.identity(), _s.set(1.4, 1.4, 1.4))));
  strobeMesh.instanceMatrix.needsUpdate = true;
  strobeMesh.castShadow = false;
  strobeMesh.computeBoundingSphere();
  strobeMesh.userData.tris = 12 * strobePos.length;
  strobeMesh.onBeforeRender = countDraw;
  strobeMesh.name = "strobes";
  group.add(strobeMesh);

  // ---- weathering decals --------------------------------------------------------------------
  let weatherMesh = null;
  {
    const r = rng(341);
    const decals = [];
    // quad of w x h at p facing n, with its v axis (texture bottom -> top) along `dir`. `tone` is the
    // linear grey the decal is lit with (the plating itself is ~0.185 linear), `alpha` its coverage;
    // both ride in an RGBA vertex colour so one mesh carries every decal
    const decal = (p, n, w, h, cell, tone, dir, lift = 0.12, alpha = 1) => {
      const g = new THREE.PlaneGeometry(w, h);
      rectUVs(g, weatherRect(cell));
      _z.set(n[0], n[1], n[2]).normalize();
      _ta.set(dir[0], dir[1], dir[2]);
      _y.copy(_ta).addScaledVector(_z, -_z.dot(_ta)).normalize();
      _x.crossVectors(_y, _z);
      _m.makeBasis(_x, _y, _z);
      _m.setPosition(p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift);
      g.applyMatrix4(_m);
      const cnt = g.attributes.position.count;
      const col = new Float32Array(cnt * 4);
      for (let i = 0; i < cnt; i++) {
        col[i * 4] = tone;
        col[i * 4 + 1] = tone;
        col[i * 4 + 2] = tone * 1.02;
        col[i * 4 + 3] = alpha;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 4));
      decals.push(g.index ? g.toNonIndexed() : g);
    };
    const HULL_LIN = 0.185; // mean linear albedo of the lit hull plating
    // soot blots around every engine bell on the recessed block face
    for (const e of bells) decal([e.x, e.y, STERN_PLATE_Z], [0, 0, 1], e.r * 3.7, e.r * 3.7, 1, 0.9, [Math.cos(r() * 6.3), Math.sin(r() * 6.3), 0], 0.05);
    // heat streaks trailing forward from the stern edge on the dorsal and keel surfaces
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const ds = SURF.dslope(side);
        const f = frameAt(ds, 800 - 42, 0.12 + r() * 0.75);
        decal(f.p, f.n, 9 + r() * 8, 84, 0, 0.8, [0, 0, -1]);
        const ks = SURF.kslope(side);
        const fk = frameAt(ks, 800 - 40, 0.12 + r() * 0.7);
        decal(fk.p, fk.n, 9 + r() * 8, 80, 0, 0.8, [0, 0, -1]);
      }
    }
    for (let k = 0; k < 5; k++) {
      const f = frameAt(SURF.plateau, 116, -0.9 + k * 0.45);
      decal([f.p[0], dorsalY(760), 760], [0, 1, 0], 10 + r() * 6, 80, 0, 0.8, [0, 0, -1]);
    }
    // soot rising on the terrace stern faces above the main bells
    for (const surf of [SURF.t1Stern, SURF.t2Stern]) {
      for (const e of ENGINES.main) {
        const y = (surf.a0 + surf.a1) / 2;
        decal([e.x * 0.9, y, HULL.sternZ + 0.05], [0, 0, 1], 26, 18, 0, 0.75, [0, 1, 0], 0.1);
      }
    }
    // scorch patches and dust / paint variation on the big surfaces
    const bigSurfaces = [SURF.dslope(-1), SURF.dslope(1), SURF.kslope(-1), SURF.kslope(1), SURF.plateau];
    for (let k = 0; k < 14; k++) {
      const surf = bigSurfaces[k % bigSurfaces.length];
      const z = -500 + r() * 1250;
      const f = frameAt(surf, z, surf.b0 + (surf.b1 - surf.b0) * (0.1 + r() * 0.8));
      const s = 8 + r() * 14;
      decal(f.p, f.n, s, s, 1, 0.6 + r() * 0.3, [Math.cos(r() * 6.3), 0, Math.sin(r() * 6.3)]);
    }
    // repainted plates: axis-aligned rectangles a shade lighter or darker than the surrounding
    // armour (the plating's own per-plate variation is about +-10%, these sit just outside it)
    for (let k = 0; k < 90; k++) {
      const surf = bigSurfaces[k % bigSurfaces.length];
      const z = -620 + r() * 1400;
      const f = frameAt(surf, z, surf.b0 + (surf.b1 - surf.b0) * (0.05 + r() * 0.9));
      const w = 5 + r() * 16;
      const h = r() < 0.5 ? w * (0.5 + r() * 0.7) : 10 + r() * 34;
      const lighter = r() < 0.5;
      const tone = HULL_LIN * (lighter ? 1.16 + r() * 0.18 : 0.7 + r() * 0.16);
      decal(f.p, f.n, w, h, 2, tone, [0, 0, 1], 0.12, 0.55 + r() * 0.35);
    }
    // a few very large, very faint repaint fields so the slopes are not one flat tone from 2 km
    for (let k = 0; k < 14; k++) {
      const surf = bigSurfaces[k % 4];
      const z = -520 + r() * 1250;
      const f = frameAt(surf, z, surf.b0 + (surf.b1 - surf.b0) * (0.12 + r() * 0.76));
      const w = 30 + r() * 50;
      decal(f.p, f.n, w, w * (0.9 + r() * 1.4), 2, HULL_LIN * (r() < 0.5 ? 1.1 : 0.86), [0, 0, 1], 0.1, 0.35);
    }
    // fine grime running downhill on the slopes
    for (let k = 0; k < 44; k++) {
      const surf = bigSurfaces[k % 4];
      const z = -550 + r() * 1330;
      const f = frameAt(surf, z, surf.b0 + (surf.b1 - surf.b0) * (0.1 + r() * 0.7));
      const p1 = surf.P(z, surf.b1);
      const p0 = surf.P(z, surf.b0);
      decal(f.p, f.n, 6 + r() * 10, 18 + r() * 26, 3, 0.75, [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
    }
    const merged = mergeGeometries(decals, false);
    const mesh = new THREE.Mesh(merged, mats.weathering);
    mesh.name = "weathering";
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.tris = merged.attributes.position.count / 3;
    mesh.onBeforeRender = countDraw;
    mesh.geometry.computeBoundingSphere();
    group.add(mesh);
    stats.decals = decals.length;
    weatherMesh = mesh;
  }

  // ---- stats ---------------------------------------------------------------------------------
  stats.instances = col.count + heavy.length + pd.length + strobePos.length;
  stats.regions = col.counts;
  stats.turrets = { heavy: heavy.length, pointDefence: pd.length };
  stats.chunks = chunks.length;
  stats.batches += 4; // turrets x2, strobes, weathering
  const fixedTris = trisE + heavyMesh.userData.tris + pdMesh.userData.tris + strobeMesh.userData.tris + weatherMesh.userData.tris;
  // triangles inside LOD range (before frustum culling); trianglesVisible below is what was drawn
  const recomputeTris = () => {
    let t = fixedTris;
    for (const ch of chunks) t += ch.trisL + (ch.showM ? ch.trisM : 0) + (ch.small && ch.small.visible ? ch.trisS : 0);
    stats.trianglesLOD = Math.round(t);
  };
  recomputeTris();
  stats.trianglesAll = Math.round(fixedTris + chunks.reduce((s, ch) => s + ch.trisL + ch.trisM + ch.trisS, 0));
  stats.trianglesVisible = 0;
  console.log(`[greebles] ${stats.instances} instances in ${stats.batches} batches (${stats.chunks} chunks); ${(stats.trianglesAll / 1000).toFixed(0)}k tris total, tiers small<${LOD.small}m medium<${LOD.medium}m`, stats.regions);

  // ---- per-frame update: LOD, turret slew, strobes, draw-call bookkeeping --------------------
  const strobeMat = mats.emitStrobe;
  let lastTierChange = false;
  function update(cameraPos) {
    stats.drawCalls = COUNTER.calls;
    stats.trianglesVisible = COUNTER.tris;
    COUNTER.calls = 0;
    COUNTER.tris = 0;
    let changed = false;
    for (const ch of chunks) {
      const d = ch.box.distanceToPoint(cameraPos);
      const showS = d < LOD.small;
      const showM = d < LOD.medium;
      if (ch.small && ch.small.visible !== showS) {
        ch.small.visible = showS;
        changed = true;
      }
      if (ch.ml && ch.showM !== showM) {
        ch.showM = showM;
        for (const id of ch.mediumIds) ch.ml.setVisibleAt(id, showM);
        ch.ml.userData.tris = ch.trisL + (showM ? ch.trisM : 0);
        changed = true;
      }
    }
    if (changed || lastTierChange) recomputeTris();
    lastTierChange = changed;
    const t = performance.now() * 0.001;
    // strobes: double flash every 1.6 s
    const ph = t % 1.6;
    const on = ph < 0.07 || (ph > 0.18 && ph < 0.25);
    const want = on ? strobeMat.userData.onIntensity : 0.0;
    if (strobeMat.emissiveIntensity !== want) strobeMat.emissiveIntensity = want;
    // slow slewing of some turrets (skipped when the camera is too far to see it)
    if (cameraPos.distanceTo(_p.set(0, 60, 450)) < 3200) {
      let hv = false;
      heavy.forEach((tu, i) => {
        if (!tu.slew) return;
        const yaw = tu.yaw0 + Math.sin(t * tu.rate + tu.phase) * tu.amp;
        _m.compose(_p.set(tu.x, tu.baseY, tu.z), _q.setFromAxisAngle(UP, yaw), _s.set(1, 1, 1));
        heavyMesh.setMatrixAt(i, _m);
        hv = true;
      });
      if (hv) heavyMesh.instanceMatrix.needsUpdate = true;
      let pv = false;
      pd.forEach((tu, i) => {
        if (!tu.slew) return;
        const yaw = tu.yaw0 + Math.sin(t * tu.rate + tu.phase) * tu.amp;
        _qs.setFromAxisAngle(UP, yaw);
        _m.compose(_p.set(tu.f.p[0], tu.f.p[1], tu.f.p[2]), _q.copy(tu.q).multiply(_qs), _s.set(1.15, 1.15, 1.15));
        pdMesh.setMatrixAt(i, _m);
        pv = true;
      });
      if (pv) pdMesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { group, update, stats, chunks, LOD };
}
