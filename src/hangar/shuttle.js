// Original Lambda-class-style Imperial shuttle, generated in code, shown as parked: side wings folded
// up, skids down, boarding ramp lowered under the cockpit, engines idling blue-white. Local space:
// origin on the deck under the fuselage centre, forward = -Z, up = +Y. Same part-list scheme as tie.js
// so it can be baked into a room kit (addShuttle) or built as a standalone Group (buildShuttle).
import * as THREE from "three";
import { setVertexColor, worldUVs, rectUVs, prism, loft } from "../kit.js";
import { IMP } from "../materials/imperial.js";
import { impDecalRect } from "../materials/imperialTextures.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const SHUTTLE = {
  length: 19, // nose to tail
  bodyW: 5.0,
  bellyY: 1.05, // fuselage underside above the deck (skids)
  hingeX: 2.3, // wing hinge (fuselage upper corner)
  hingeY: 4.9,
  hingeZ: 1.0,
  wingSpan: 11.5,
  wingFold: 1.22, // radians above horizontal when parked
  finTop: 14.6,
};

const HULL = IMP.wallLight;
const HULL2 = IMP.wallMid;
const DARK = IMP.trim;
const STEEL = IMP.steel;

class PartList {
  constructor() {
    this.parts = [];
  }
  add(mat, color, geo, { pos = null, rot = null, quat = null, texel = 0.8 } = {}) {
    if (quat) geo.applyQuaternion(quat);
    else if (rot) {
      geo.rotateX(rot[0]);
      geo.rotateY(rot[1]);
      geo.rotateZ(rot[2]);
    }
    if (pos) geo.translate(pos[0], pos[1], pos[2]);
    if (mat === "impPaintedMetal" || mat === "impPanel" || mat === "impPanel1") worldUVs(geo, texel);
    this.parts.push({ mat, color, geo });
    return geo;
  }
  box(mat, color, cx, cy, cz, sx, sy, sz, rot = null) {
    return this.add(mat, color, new THREE.BoxGeometry(sx, sy, sz), { pos: [cx, cy, cz], rot });
  }
}

// Stencil from the Imperial decal sheet on a flank: a quad of size s facing ±x (side), uvs remapped to
// the atlas cell so the room kit can bake it with uv: "keep".
function decal(P, idx, pos, side, s) {
  const g = new THREE.PlaneGeometry(s, s);
  g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
  rectUVs(g, impDecalRect(idx));
  P.add("impDecal", 0xffffff, g, { pos });
}

// octagonal fuselage section: width w, bottom y0, top ridge y1 (CCW seen from +z)
function section(w, y0, y1, ridge = 0.42) {
  const h = y1 - y0;
  return [
    [-0.36 * w, y0],
    [0.36 * w, y0],
    [0.5 * w, y0 + 0.3 * h],
    [0.5 * w, y0 + 0.62 * h],
    [ridge * 0.5 * w, y1],
    [-ridge * 0.5 * w, y1],
    [-0.5 * w, y0 + 0.62 * h],
    [-0.5 * w, y0 + 0.3 * h],
  ];
}

function fuselage(P) {
  const b = SHUTTLE.bellyY;
  // main body: nose at z = -9.5, engine plate at z = +9.5
  const stations = [
    { z: -9.5, points: section(1.6, b + 1.9, b + 3.3, 0.6) },
    { z: -7.6, points: section(3.2, b + 0.9, b + 4.0, 0.5) },
    { z: -5.2, points: section(4.6, b + 0.1, b + 4.5) },
    { z: -1.0, points: section(SHUTTLE.bodyW, b, b + 4.7) },
    { z: 4.0, points: section(SHUTTLE.bodyW, b, b + 4.7) },
    { z: 7.8, points: section(4.4, b + 0.3, b + 4.4) },
    { z: 9.5, points: section(3.8, b + 0.6, b + 4.1) },
  ];
  P.add("impPaintedMetal", HULL, loft(stations, { capStart: true, capEnd: true }), { texel: 1.2 });
  // ventral keel plate and dorsal spine (darker), panel seams
  P.box("impPaintedMetal", HULL2, 0, b + 0.06, -0.2, 2.6, 0.16, 12.0);
  P.box("impPaintedMetal", HULL2, 0, b + 4.72, 2.0, 1.4, 0.12, 9.0);
  for (const z of [-3.0, 0.5, 4.0]) P.box("impPaintedMetal", DARK, 0, b + 2.4, z, SHUTTLE.bodyW + 0.04, 4.5, 0.06);
  // cockpit head: window band wrapped round the front, frame, brow
  const win = new THREE.CylinderGeometry(1.72, 1.72, 0.7, 12, 1, true, -Math.PI * 0.72, Math.PI * 1.44);
  win.rotateY(Math.PI);
  P.add("glassDark", 0xffffff, win, { pos: [0, b + 3.05, -6.9] });
  P.box("impPaintedMetal", DARK, 0, b + 3.45, -7.5, 3.3, 0.1, 1.9);
  P.box("impPaintedMetal", DARK, 0, b + 2.65, -7.5, 3.3, 0.1, 1.9);
  for (const sx of [-1, 1]) P.box("impPaintedMetal", DARK, sx * 1.62, b + 3.05, -7.2, 0.08, 0.72, 1.5);
  P.box("impPaintedMetal", DARK, 0, b + 3.05, -8.62, 0.14, 0.72, 0.3);
  // sensor chin + landing lights under the nose
  P.box("impPaintedMetal", HULL2, 0, b + 1.55, -7.9, 1.4, 0.5, 1.6);
  for (const sx of [-1, 1]) P.box("emitWhite", 0xffffff, sx * 0.45, b + 1.28, -8.4, 0.22, 0.06, 0.22);
  // flank details: intake blisters with a slatted grille (crisp geometry, not a textured inset), a
  // framed access hatch with a lit latch, the Imperial roundel stencilled on the flank, a red squadron band
  for (const sx of [-1, 1]) {
    P.box("impPaintedMetal", HULL2, sx * 2.45, b + 2.2, 1.0, 0.3, 1.2, 4.0);
    P.box("impPaintedMetal", IMP.trench, sx * 2.61, b + 2.2, 1.0, 0.04, 0.9, 3.4);
    for (let s = 0; s < 5; s++) P.box("impMetal", STEEL, sx * 2.64, b + 1.86 + s * 0.17, 1.0, 0.04, 0.05, 3.2);
    for (const z of [-0.6, 2.6]) P.box("impPaintedMetal", DARK, sx * 2.63, b + 2.2, z, 0.04, 0.96, 0.1);
    P.box("impPaintedMetal", DARK, sx * 2.36, b + 3.4, -3.2, 0.14, 0.9, 1.4);
    P.box("impPaintedMetal", HULL2, sx * 2.42, b + 3.4, -3.2, 0.04, 0.74, 1.24);
    P.box("emitGreen", 0xffffff, sx * 2.45, b + 3.7, -2.7, 0.02, 0.06, 0.16);
    decal(P, 4, [sx * 2.515, b + 2.16, 4.0], sx, 1.0);
    P.box("impPaintedMetal", IMP.red, sx * 2.5, b + 1.6, 6.2, 0.05, 0.4, 2.4);
    P.box("impPaintedMetal", DARK, sx * 1.6, b + 0.02, 3.0, 0.9, 0.08, 1.6);
  }
  // engine plate and three thrusters with blue-white glow
  P.box("impPaintedMetal", DARK, 0, b + 2.4, 9.55, 3.2, 2.8, 0.14);
  for (const x of [-1.15, 0, 1.15]) {
    const noz = new THREE.CylinderGeometry(0.42, 0.52, 0.8, 16, 1, true);
    noz.rotateX(Math.PI / 2);
    P.add("impPaintedMetal", IMP.gunmetal, noz, { pos: [x, b + 2.35, 10.0] });
    const ring = new THREE.TorusGeometry(0.5, 0.06, 6, 16);
    P.add("impPaintedMetal", STEEL, ring, { pos: [x, b + 2.35, 10.4] });
    P.add("emitBlue", 0xffffff, new THREE.CircleGeometry(0.4, 16), { pos: [x, b + 2.35, 9.66] });
    P.add("emitWhite", 0xffffff, new THREE.CircleGeometry(0.24, 12), { pos: [x, b + 2.35, 9.68] });
  }
  // landing skids: two aft, one forward
  const skid = (x, z, h) => {
    P.box("impPaintedMetal", IMP.gunmetal, x, h / 2 + 0.16, z, 0.26, h, 0.26);
    P.box("impPaintedMetal", DARK, x, 0.1, z, 0.7, 0.2, 1.8);
    P.box("impPaintedMetal", STEEL, x, 0.22, z, 0.36, 0.06, 1.9);
  };
  skid(-1.5, 5.0, b - 0.16);
  skid(1.5, 5.0, b - 0.16);
  skid(0, -0.9, b - 0.16);
}

function fin(P) {
  const b = SHUTTLE.bellyY;
  const y0 = b + 4.6;
  const top = SHUTTLE.finTop;
  // swept trapezoid in (z, y) extruded 0.28 along x
  const outline = [
    [-2.2, y0],
    [6.8, y0],
    [7.6, top],
    [3.4, top],
  ];
  const g = prism(outline, 0.28);
  g.rotateY(-Math.PI / 2);
  P.add("impPaintedMetal", HULL, g, { texel: 1.2 });
  // leading edge spar, root fairing, panel lines, tip beacon
  const lead = new THREE.BoxGeometry(0.4, Math.hypot(5.6, top - y0) + 0.2, 0.34);
  lead.rotateX(Math.atan2(5.6, top - y0));
  P.add("impPaintedMetal", DARK, lead, { pos: [0, (y0 + top) / 2, (-2.2 + 3.4) / 2] });
  P.box("impPaintedMetal", HULL2, 0, y0 + 0.5, 2.6, 0.7, 1.0, 8.6);
  for (const yy of [y0 + 3, y0 + 6]) P.box("impPaintedMetal", DARK, 0, yy, 3.6 + (yy - y0) * 0.35, 0.32, 0.08, 5.6 - (yy - y0) * 0.22);
  P.box("impPaintedMetal", DARK, 0, top - 0.3, 5.5, 0.34, 0.6, 4.2);
  P.box("emitRed", 0xffffff, 0, top + 0.08, 5.6, 0.36, 0.16, 0.4);
  P.box("impPaintedMetal", STEEL, 0, top + 0.4, 7.2, 0.06, 0.8, 0.06);
}

// one wing, hinged at (±hingeX, hingeY, hingeZ); folded up by SHUTTLE.wingFold
function wing(P, side) {
  const S = SHUTTLE;
  const span = S.wingSpan;
  // outline in (u = span, v = chord)
  // plate frame before placing: x = span (signed by side), y = chord (+ = aft), z = thickness (+ = down)
  const outline = [
    [0, -3.6],
    [0, 3.6],
    [side * span, 3.4],
    [side * span, 0.2],
  ];
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * S.wingFold);
  const place = (geo) => {
    geo.rotateX(Math.PI / 2); // plate horizontal: span ±x, chord +z, top +y
    geo.applyQuaternion(q); // fold the tip up and outboard
    geo.translate(side * S.hingeX, S.hingeY, S.hingeZ);
    return geo;
  };
  P.add("impPaintedMetal", HULL, place(prism(outline, 0.26)), { texel: 1.2 });
  // leading-edge spar, mid panel line, tip pod + navigation light
  const spar = new THREE.BoxGeometry(Math.hypot(span, 3.8) + 0.2, 0.4, 0.34);
  spar.rotateZ(Math.atan2(3.8, side * span));
  spar.translate((side * span) / 2, -1.7, 0);
  P.add("impPaintedMetal", DARK, place(spar));
  const mid = new THREE.BoxGeometry(span - 1.0, 0.1, 0.34);
  mid.translate((side * span) / 2, 1.4, 0);
  P.add("impPaintedMetal", DARK, place(mid));
  const tip = new THREE.CylinderGeometry(0.28, 0.28, 3.6, 10);
  tip.translate(side * (span - 0.1), 1.8, 0);
  P.add("impPaintedMetal", HULL2, place(tip));
  const light = new THREE.BoxGeometry(0.3, 0.3, 0.14);
  light.translate(side * (span - 0.1), 3.0, 0.28);
  P.add(side > 0 ? "emitGreen" : "emitRed", 0xffffff, place(light));
  const hinge = new THREE.CylinderGeometry(0.5, 0.5, 6.4, 14);
  hinge.rotateX(Math.PI / 2);
  P.add("impPaintedMetal", IMP.gunmetal, hinge, { pos: [side * S.hingeX, S.hingeY, S.hingeZ] });
  P.box("impPaintedMetal", DARK, side * (S.hingeX - 0.3), S.hingeY - 0.5, S.hingeZ, 0.8, 1.2, 4.6);
  // underside stripe (the undersides face outboard once the wings are folded)
  const stripe = new THREE.BoxGeometry(span * 0.6, 0.5, 0.02);
  stripe.translate(side * span * 0.55, -2.4, 0.14);
  P.add("impPaintedMetal", IMP.red, place(stripe));
}

// boarding ramp lowered from the belly under the cockpit head toward the nose
function ramp(P) {
  const b = SHUTTLE.bellyY;
  const zHinge = -3.2;
  const len = 4.6;
  const ang = Math.atan2(b - 0.02, len);
  const g = new THREE.BoxGeometry(1.7, 0.12, Math.hypot(b, len));
  g.rotateX(-ang);
  g.translate(0, b / 2 + 0.02, zHinge - len / 2);
  P.add("impPaintedMetal", HULL2, g);
  for (const sx of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(b, len));
    rail.rotateX(-ang);
    rail.translate(sx * 0.9, b / 2 + 0.95, zHinge - len / 2);
    P.add("impPaintedMetal", STEEL, rail);
    for (let k = 0; k <= 3; k++) {
      const t = k / 3;
      P.box("impPaintedMetal", STEEL, sx * 0.9, b * (1 - t) + 0.5, zHinge - len * t, 0.04, 0.95, 0.04);
    }
    const strip = new THREE.BoxGeometry(0.06, 0.02, Math.hypot(b, len) - 0.4);
    strip.rotateX(-ang);
    strip.translate(sx * 0.78, b / 2 + 0.09, zHinge - len / 2);
    P.add("lightBand", 0xffffff, strip);
  }
  // treads on the ramp
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    P.box("impPaintedMetal", DARK, 0, b * (1 - t) + 0.1, zHinge - len * t, 1.5, 0.02, 0.08);
  }
  // hatch recess in the belly with an interior light (lightSoft: a key every bay already batches)
  P.box("impPaintedMetal", IMP.wallDark, 0, b + 0.5, zHinge + 0.6, 1.8, 1.0, 1.4);
  P.box("lightSoft", 0xffffff, 0, b + 0.98, zHinge + 0.6, 1.4, 0.02, 1.0);
}

export function shuttleParts() {
  const P = new PartList();
  fuselage(P);
  fin(P);
  wing(P, -1);
  wing(P, 1);
  ramp(P);
  return P.parts;
}

function finish(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(key)) g.deleteAttribute(key);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

let mergedCache = null;
export function shuttleMerged() {
  if (mergedCache) return mergedCache;
  const groups = new Map();
  for (const p of shuttleParts()) {
    const g = finish(p.geo);
    setVertexColor(g, p.color);
    if (!groups.has(p.mat)) groups.set(p.mat, []);
    groups.get(p.mat).push(g);
  }
  mergedCache = new Map();
  for (const [mat, list] of groups) {
    const merged = mergeGeometries(list, false);
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    mergedCache.set(mat, merged);
  }
  return mergedCache;
}

// Standalone shuttle: one Mesh per material inside a Group.
export function buildShuttle(mats) {
  const group = new THREE.Group();
  group.name = "shuttle";
  for (const [mat, geo] of shuttleMerged()) {
    const material = mats[mat];
    if (!material) throw new Error("shuttle: unknown material " + mat);
    const m = new THREE.Mesh(geo, material);
    m.name = "shuttle_" + mat;
    m.castShadow = !(mat === "glassDark" || mat.startsWith("emit") || mat.startsWith("light"));
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

// Bake a parked shuttle into a room kit at pos (deck point under the fuselage centre), yaw radians
// (0 = nose toward -Z). Registers colliders for the fuselage, skids and the ramp.
export function addShuttle(kit, pos, yaw = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  for (const p of shuttleParts()) kit.add(p.mat, p.geo, { pos, quat: q, color: p.color, uv: "keep" });
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const boxCollider = (cx, cz, hw, hd, h, tag) => {
    const cs = [L(cx - hw, 0, cz - hd), L(cx + hw, 0, cz - hd), L(cx - hw, 0, cz + hd), L(cx + hw, 0, cz + hd)];
    const xs = cs.map((c) => c.x);
    const zs = cs.map((c) => c.z);
    kit.collider([Math.min(...xs), pos[1], Math.min(...zs)], [Math.max(...xs), pos[1] + h, Math.max(...zs)], tag);
  };
  boxCollider(0, 0.6, SHUTTLE.bodyW / 2 + 0.2, 8.6, 6, "shuttle");
  boxCollider(0, -8.4, 1.2, 1.4, 6, "shuttleNose");
  boxCollider(0, -5.5, 1.0, 2.5, 3, "shuttleRamp");
  for (const [x, z] of [[-1.5, 5.0], [1.5, 5.0], [0, -0.9]]) boxCollider(x, z, 0.5, 1.1, 1.2, "skid");
}
