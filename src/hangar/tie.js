// Original TIE/ln-style starfighter, generated in code. Local space: cockpit ball centred on the
// origin, forward = -Z, wings on ±X. Two detail levels: lod 0 (~3.2k triangles: cut-away cockpit ball
// with an octagonal viewport frame and dark-red glass, hexagonal solar wings with frame beams and
// radial spokes, pylons, twin ion emitters, chin cannons, hatches) and lod 1 (~600 triangles).
//
// Every part is returned as { mat, color, geo } so the same description can be (a) merged into a room
// kit (zero extra draw calls for parked fighters), (b) merged per material for the traffic's
// InstancedMeshes, or (c) wrapped as a standalone THREE.Group via buildTIE().
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setVertexColor, worldUVs, prism } from "../kit.js";
import { IMP } from "../materials/imperial.js";

export const TIE = {
  radius: 2.1, // cockpit ball
  wingX: 3.35, // wing plane distance from the centreline
  wingTop: 3.75, // half height of the hexagonal wing
  wingHalfEdge: 1.95, // half length of the top / bottom edges
  wingMid: 3.2, // half chord at mid height (the widest point)
  panelT: 0.12,
};
// bounding half-extents (for clearance checks and LOD spheres)
export const TIE_HALF = { x: TIE.wingX + 0.3, y: TIE.wingTop + 0.2, z: TIE.wingMid + 0.1 };
export const TIE_BOUND_R = Math.hypot(TIE_HALF.x, TIE_HALF.y, TIE_HALF.z);

const BODY = IMP.wallMid;
const FRAME = new THREE.Color("#6e737b");
const DARK = IMP.trim;
const GUN = IMP.darkMetal;

// hexagon outline of a wing in (z, y)
export function wingOutline() {
  const { wingTop: t, wingHalfEdge: h, wingMid: m } = TIE;
  return [
    [-h, t],
    [h, t],
    [m, 0],
    [h, -t],
    [-h, -t],
    [-m, 0],
  ];
}

class PartList {
  constructor() {
    this.parts = [];
  }
  add(mat, color, geo, { pos = null, rot = null, quat = null, texel = 0.6 } = {}) {
    if (quat) geo.applyQuaternion(quat);
    else if (rot) {
      geo.rotateX(rot[0]);
      geo.rotateY(rot[1]);
      geo.rotateZ(rot[2]);
    }
    if (pos) geo.translate(pos[0], pos[1], pos[2]);
    // painted parts get planar UVs in fighter space so the worn-metal maps tile at a sane density
    if (mat === "impPaintedMetal") worldUVs(geo, texel);
    this.parts.push({ mat, color, geo });
    return geo;
  }
  box(mat, color, cx, cy, cz, sx, sy, sz, rot = null) {
    return this.add(mat, color, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], rot });
  }
}

// One wing (panel + frame + spokes + hub) in the plane x = 0, facing ±x. side = -1 | 1 selects which
// face carries the hub boss (the pylon side).
function wingParts(P, lod, side) {
  const outline = wingOutline();
  const t = TIE.panelT;
  // solar panel: hexagonal plate, extruded along z then rotated so its thickness runs along x
  const panel = prism(outline, t);
  panel.rotateY(Math.PI / 2);
  worldUVs(panel, 0.42);
  P.add("tiePanel", 0xffffff, panel);
  // frame beams along the six edges
  const beamT = lod ? 0.26 : 0.3;
  for (let i = 0; i < 6; i++) {
    const [z0, y0] = outline[i];
    const [z1, y1] = outline[(i + 1) % 6];
    const dz = z1 - z0;
    const dy = y1 - y0;
    const L = Math.hypot(dz, dy);
    const g = new THREE.BoxGeometry(beamT, 0.24, L + 0.12);
    g.rotateX(Math.atan2(dy, dz));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    P.add("impPaintedMetal", FRAME, g);
  }
  if (!lod) {
    // radial spokes to the vertices, proud of both faces
    for (const [z, y] of outline) {
      const L = Math.hypot(z, y);
      const g = new THREE.BoxGeometry(0.24, 0.16, L);
      g.rotateX(Math.atan2(y, z));
      g.translate(0, y / 2, z / 2);
      P.add("impPaintedMetal", FRAME, g);
    }
    // a second, finer lattice: two horizontal stringers across the upper and lower panel halves
    for (const yy of [-1.9, 1.9]) {
      const zz = TIE.wingHalfEdge + (TIE.wingMid - TIE.wingHalfEdge) * (1 - Math.abs(yy) / TIE.wingTop);
      P.box("impPaintedMetal", FRAME, 0, yy, 0, 0.18, 0.08, zz * 2 - 0.2);
    }
  }
  // hub boss (pylon socket) on the inner face, and a smaller boss on the outer face
  P.box("impPaintedMetal", IMP.gunmetal, side * -0.22, 0, 0, 0.5, 1.7, 1.7);
  if (!lod) P.box("impPaintedMetal", IMP.gunmetal, side * 0.16, 0, 0, 0.2, 1.2, 1.2);
  if (!lod) {
    // corner clips on the hub
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) P.box("impPaintedMetal", DARK, side * -0.47, sy * 0.62, sz * 0.62, 0.06, 0.28, 0.28);
    // hazard tab on the top edge (ground crew reference) and a small stencil block
    P.box("impPaintedMetal", IMP.hazardYellow, 0, TIE.wingTop + 0.02, -TIE.wingHalfEdge * 0.5, beamT + 0.02, 0.06, 0.5);
  }
}

// Body + everything except the wings, at the origin.
function bodyParts(P, lod) {
  const R = TIE.radius;
  const ws = lod ? 10 : 28;
  const hs = lod ? 7 : 18;
  const cap = 0.56; // angular radius of the removed front / rear caps
  const sph = new THREE.SphereGeometry(R, ws, hs, 0, Math.PI * 2, cap, Math.PI - 2 * cap);
  sph.rotateX(-Math.PI / 2); // +Y pole -> -Z (viewport end)
  P.add("impPaintedMetal", BODY, sph);
  const capR = R * Math.sin(cap); // 1.115
  const capZ = R * Math.cos(cap); // 1.78

  // --- viewport (front) --------------------------------------------------------------------
  const zf = -capZ;
  // collar where the frame meets the hull
  P.add("impPaintedMetal", DARK, new THREE.TorusGeometry(capR + 0.02, 0.09, lod ? 4 : 6, lod ? 8 : 24), { pos: [0, 0, zf + 0.02] });
  if (!lod) {
    const rO = capR + 0.02;
    const apo = rO * Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const phi = (i * Math.PI) / 4;
      const edge = 2 * rO * Math.sin(Math.PI / 8) + 0.08;
      const g = new THREE.BoxGeometry(edge, 0.15, 0.2);
      g.rotateZ(phi + Math.PI / 2);
      g.translate(apo * Math.cos(phi), apo * Math.sin(phi), zf - 0.02);
      P.add("impPaintedMetal", DARK, g);
      // spokes to the octagon vertices
      const pv = phi + Math.PI / 8;
      const L = rO - 0.34;
      const s = new THREE.BoxGeometry(L, 0.085, 0.1);
      s.rotateZ(pv);
      const rm = 0.34 + L / 2;
      s.translate(rm * Math.cos(pv), rm * Math.sin(pv), zf - 0.03);
      P.add("impPaintedMetal", DARK, s);
    }
    const ring = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16, 1, true);
    ring.rotateX(Math.PI / 2);
    P.add("impPaintedMetal", DARK, ring, { pos: [0, 0, zf - 0.03] });
    const glass = new THREE.CircleGeometry(capR, 8);
    glass.rotateZ(Math.PI / 8);
    glass.rotateY(Math.PI);
    P.add("tieGlass", 0xffffff, glass, { pos: [0, 0, zf + 0.01] });
  } else {
    const disc = new THREE.CircleGeometry(capR, 8);
    disc.rotateY(Math.PI);
    P.add("impPaintedMetal", new THREE.Color("#2a0d0d"), disc, { pos: [0, 0, zf + 0.01] });
  }

  // --- rear (access hatch + engines) --------------------------------------------------------
  const zr = capZ;
  const rear = new THREE.CircleGeometry(capR + 0.01, lod ? 8 : 16);
  P.add("impPaintedMetal", IMP.gunmetal, rear, { pos: [0, 0, zr - 0.01] });
  P.add("impPaintedMetal", DARK, new THREE.TorusGeometry(capR + 0.02, 0.08, lod ? 4 : 6, lod ? 8 : 24), { pos: [0, 0, zr - 0.02] });
  if (!lod) {
    const hatch = new THREE.CylinderGeometry(0.5, 0.56, 0.16, 16);
    hatch.rotateX(Math.PI / 2);
    P.add("impPaintedMetal", BODY, hatch, { pos: [0, 0.35, zr + 0.06] });
    P.box("impPaintedMetal", DARK, 0, 0.35, zr + 0.15, 0.3, 0.06, 0.04);
  }
  for (const sx of [-1, 1]) {
    const noz = new THREE.CylinderGeometry(0.26, 0.34, 0.55, lod ? 8 : 14, 1, false);
    noz.rotateX(Math.PI / 2);
    P.add("impPaintedMetal", GUN, noz, { pos: [sx * 0.64, -0.42, zr + 0.2] });
    const glow = new THREE.CircleGeometry(0.22, lod ? 8 : 14);
    P.add("emitRed", 0xffffff, glow, { pos: [sx * 0.64, -0.42, zr + 0.49] });
  }

  // --- pylons (hexagonal section) ---------------------------------------------------------
  for (const sx of [-1, 1]) {
    const py = new THREE.CylinderGeometry(0.5, 0.5, 1.3, 6);
    py.rotateZ(Math.PI / 2);
    P.add("impPaintedMetal", BODY, py, { pos: [sx * 2.6, 0, 0] });
    // flange at the hull and the wing root
    P.box("impPaintedMetal", IMP.gunmetal, sx * 2.02, 0, 0, 0.3, 1.3, 1.3);
    if (!lod) P.box("impPaintedMetal", IMP.gunmetal, sx * 3.08, 0, 0, 0.16, 1.5, 1.5);
    if (!lod) {
      P.box("impPaintedMetal", DARK, sx * 2.6, 0.56, 0, 0.9, 0.08, 0.3);
      P.box("impPaintedMetal", DARK, sx * 2.6, -0.56, 0, 0.9, 0.08, 0.3);
    }
  }

  if (!lod) {
    // top hatch
    const th = new THREE.CylinderGeometry(0.6, 0.66, 0.14, 20);
    P.add("impPaintedMetal", BODY, th, { pos: [0, R - 0.04, 0.1] });
    P.add("impPaintedMetal", DARK, new THREE.TorusGeometry(0.62, 0.05, 5, 16), { pos: [0, R + 0.02, 0.1], rot: [Math.PI / 2, 0, 0] });
    P.box("impPaintedMetal", DARK, 0, R + 0.06, 0.1, 0.36, 0.05, 0.08);
    // chin laser cannons
    for (const sx of [-1, 1]) {
      const barrel = new THREE.CylinderGeometry(0.085, 0.1, 1.4, 10);
      barrel.rotateX(Math.PI / 2);
      P.add("impPaintedMetal", GUN, barrel, { pos: [sx * 0.55, -1.42, -1.55] });
      const tip = new THREE.CylinderGeometry(0.05, 0.075, 0.5, 8);
      tip.rotateX(Math.PI / 2);
      P.add("impPaintedMetal", IMP.steel, tip, { pos: [sx * 0.55, -1.42, -2.45] });
      P.box("impPaintedMetal", GUN, sx * 0.55, -1.3, -0.95, 0.3, 0.34, 0.7);
    }
    // sensor blisters / hull greebles on the flanks
    for (const sx of [-1, 1]) {
      P.box("impPaintedMetal", DARK, sx * 1.55, 1.15, -0.5, 0.4, 0.22, 0.5);
      P.box("impPaintedMetal", DARK, sx * 1.75, -0.9, 0.5, 0.36, 0.18, 0.4);
    }
  }
}

// Parts of a complete fighter. opts.wings: array of sides to include (default both).
export function tieParts(lod = 0, opts = {}) {
  const { wings = [-1, 1] } = opts;
  const P = new PartList();
  bodyParts(P, lod);
  for (const side of wings) {
    const W = new PartList();
    wingParts(W, lod, side);
    for (const p of W.parts) {
      p.geo.translate(side * TIE.wingX, 0, 0);
      P.parts.push(p);
    }
  }
  return P.parts;
}

// Parts of one detached wing panel lying in the plane x = 0 (for maintenance scenes).
export function tieWingParts(lod = 0, side = 1) {
  const P = new PartList();
  wingParts(P, lod, side);
  return P.parts;
}

function finish(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(key)) g.deleteAttribute(key);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// Merge a part list per material (vertex colours baked) → Map(mat → BufferGeometry). Consumes the parts.
export function mergeParts(parts) {
  const groups = new Map();
  for (const p of parts) {
    const g = finish(p.geo);
    setVertexColor(g, p.color);
    if (!groups.has(p.mat)) groups.set(p.mat, []);
    groups.get(p.mat).push(g);
  }
  const out = new Map();
  for (const [mat, list] of groups) {
    const merged = mergeGeometries(list, false);
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    out.set(mat, merged);
  }
  return out;
}

const mergedCache = new Map();
// Per-material merged geometry for a whole fighter at a LOD (cached, shared between callers).
export function tieMerged(lod = 0) {
  if (!mergedCache.has(lod)) mergedCache.set(lod, mergeParts(tieParts(lod)));
  return mergedCache.get(lod);
}

// Standalone fighter: one Mesh per material inside a Group (4 draw calls at lod 0, 2 at lod 1).
export function buildTIE(mats, { lod = 0 } = {}) {
  const group = new THREE.Group();
  group.name = "tie_lod" + lod;
  for (const [mat, geo] of tieMerged(lod)) {
    const material = mats[mat];
    if (!material) throw new Error("TIE: unknown material " + mat);
    const m = new THREE.Mesh(geo, material);
    m.name = "tie_" + mat;
    m.castShadow = !(mat === "tieGlass" || mat.startsWith("emit"));
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

// Bake a fighter into a room kit at pos (cockpit centre), yaw radians (0 = nose toward -Z), extra
// rotation via opts.pitch / opts.roll. Zero additional draw calls.
export function addTIE(kit, pos, yaw = 0, opts = {}) {
  const { lod = 0, wings = [-1, 1], pitch = 0, roll = 0 } = opts;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, "YXZ"));
  for (const p of tieParts(lod, { wings })) kit.add(p.mat, p.geo, { pos, quat: q, color: p.color, uv: "keep" });
}

// Bake a detached wing into a room kit: pos = wing centre, the panel plane's normal yawed / tilted.
export function addTIEWing(kit, pos, opts = {}) {
  const { lod = 0, yaw = 0, tilt = 0, side = 1 } = opts;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, tilt, "YXZ"));
  for (const p of tieWingParts(lod, side)) kit.add(p.mat, p.geo, { pos, quat: q, color: p.color, uv: "keep" });
}

export { THREE };
