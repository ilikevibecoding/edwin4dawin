// Shared props for the Deck A command rooms (ROOMS-A: intel, ready room, comms, tactical,
// navigation): data banks, sealed cabinets, framed wall screens, cable trays, holo tables and
// emitters, wireframe hologram geometry, alert lamps, step blocks and desk clutter.
// Static geometry goes through the kit (merged per material); animated pieces are returned as
// THREE objects / geometries for the room to kit.attach and drive from kit.onUpdate.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../materials.js";
import { rng } from "../kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { Frame, UP } from "./imperial_kit.js";
import { ensureDeckAMaterials } from "../textures_deck_a.js";

const X_AXIS = new THREE.Vector3(1, 0, 0);
const ONE = new THREE.Vector3(1, 1, 1);

/** Register the deckA_* materials and keep hologram keys out of the shadow pass. */
export function deckASetup(kit) {
  ensureDeckAMaterials(kit.materials);
  for (const k of ["deckA_holoDim", "deckA_holoAmber", "deckA_holoAmberBright", "deckA_holoCyan", "deckA_holoCyanBright", "deckA_holoCyanDim", "deckA_holoRed", "deckA_holoRedBright", "deckA_dataScroll", "deckA_dataScroll2", "holo", "holoBright", "viewGlass"]) kit.noShadowKeys.add(k);
}

/** Yaw for an object whose local -Z (its "front") should point from (x, z) toward (tx, tz). */
export function yawToward(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}
/** Point `dist` behind an object (along its local +Z) that stands at (x, z) with `yaw`. */
export function behind(x, z, yaw, dist) {
  return [x + Math.sin(yaw) * dist, z + Math.cos(yaw) * dist];
}
/** A local building frame at (cx, cy, cz) rotated by yaw: u = local x, v = up, n = local +z. */
export function yawFrame(kit, cx, cy, cz, yaw) {
  return new Frame(kit, new THREE.Vector3(cx, cy, cz), new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), UP);
}
/** Geometry placed in a frame but NOT added to the kit (for attached / animated merged meshes). */
export function frameGeo(frame, geo, cu, cv, cn) {
  const p = frame.pos(cu, cv, cn);
  geo.applyMatrix4(new THREE.Matrix4().compose(p, frame.q, ONE));
  return geo;
}
/** Merge geometries into one Mesh (animated group that moves as one; one draw call). */
export function mergedMesh(geos, material) {
  const g = mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)), false);
  const m = new THREE.Mesh(g, material);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}
export function lineSegments(geo, material) {
  const l = new THREE.LineSegments(geo, material);
  l.castShadow = false;
  l.receiveShadow = false;
  return l;
}
/** Several position-only line geometries as one LineSegments (one draw call). */
export function mergedLines(geos, material) {
  return lineSegments(mergeGeometries(geos, false), material);
}

/** Cylinder between two world points (cables, struts, slanted conduits). */
export function tube(kit, a, b, r, mat = "impMetal", opts = {}) {
  const A = new THREE.Vector3(a[0], a[1], a[2]);
  const B = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = B.clone().sub(A);
  const L = dir.length();
  if (L < 1e-4) return;
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  kit.add(mat, new THREE.CylinderGeometry(r, r, L, opts.segments || 8), { pos: [mid.x, mid.y, mid.z], quat: q, color: opts.color || PALETTE.impCharcoal, uv: "scale", uvScale: [0.2, L] });
}

// ---------------------------------------------------------------------------
// Operator station (the deck A console) + stool
// ---------------------------------------------------------------------------
/**
 * Operator station: inset plinth (kick recess with a dim hairline), black shell with charcoal cheeks,
 * a mid-grey sloped control surface (screens under a hood, key field, dials) so light actually lands
 * on the controls, the hood's underside carrying an emissive practical strip, a detailed back face
 * with two flexible conduits down into a deck box, optional display column (tall) and stool.
 * Faces local -Z (the operator stands on +Z) like impConsole; w along x, d along z.
 */
export function station(kit, cx, cy, cz, w, d, opts = {}) {
  const { yaw = 0, seed = 3, screens = ["scrBlue0", "scrBlue1"], accentKey = "emitBlue", hoodKey = "emitAmberDim", height = 0.9, tall = false, stool: withStool = false, stoolH = 0.6, conduits = 2, tag = "console" } = opts;
  const rand = rng(seed);
  const f = yawFrame(kit, cx, cy, cz, yaw);
  const H = height;
  // plinth: recessed kick under the shell, dim hairline in the recess on the operator side
  f.box("impTrim", 0, 0.07, -0.04, w - 0.36, 0.14, d - 0.28, { color: PALETTE.impBlack, texel: 1 });
  f.box(hoodKey, 0, 0.1, d / 2 - 0.16, w - 0.6, 0.012, 0.012);
  // shell, charcoal base lip and side cheeks
  f.box("impTrim", 0, 0.14 + (H - 0.14) / 2, 0, w, H - 0.14, d, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impMetal", 0, 0.17, 0, w + 0.03, 0.06, d + 0.03, { color: PALETTE.impGreyDark, texel: 1 });
  for (const s of [-1, 1]) {
    f.box("impMetal", s * (w / 2 - 0.04), H * 0.56, 0, 0.1, H * 0.6, d - 0.16, { color: PALETTE.impGreyDark, texel: 1 });
    // side vent: three dark slots and a small lamp so the cheeks are not flat slabs
    for (let k = 0; k < 3; k++) f.box("impTrim", s * (w / 2 + 0.012), H * 0.62 - k * 0.06, -d * 0.12, 0.01, 0.02, d * 0.3, { color: PALETTE.impBlack });
    f.box(accentKey, s * (w / 2 + 0.012), H * 0.4, d * 0.22, 0.008, 0.03, 0.03);
  }
  // operator face: recessed grey panel with a knee cutout and an accent strip
  f.box("impMetal", 0, H * 0.55, d / 2 - 0.005, w - 0.32, H * 0.5, 0.03, { color: PALETTE.impGreyDark, texel: 1 });
  f.box("impTrim", 0, H * 0.4, d / 2 + 0.012, w * 0.42, H * 0.3, 0.02, { color: PALETTE.impBlack });
  f.box(accentKey, 0, H * 0.8, d / 2 + 0.012, w - 0.5, 0.02, 0.01);
  // back face: charcoal panel with vent slots (this side faces the walls / the camera in arc layouts)
  f.box("impMetal", 0, H * 0.55, -d / 2 - 0.005, w - 0.3, H * 0.6, 0.012, { color: PALETTE.impCharcoal, texel: 2 });
  for (let s = 0; s < 4; s++) f.box("impTrim", -w * 0.18, H * 0.34 + s * 0.05, -d / 2 - 0.014, w * 0.36, 0.018, 0.01, { color: PALETTE.impBlack });
  f.box("impGloss", w * 0.26, H * 0.62, -d / 2 - 0.014, 0.2, 0.1, 0.01);
  f.box(rand() < 0.5 ? accentKey : "emitWhite", w * 0.26 - 0.05, H * 0.62, -d / 2 - 0.02, 0.04, 0.04, 0.008);
  f.add("decalImp", new THREE.PlaneGeometry(0.16, 0.16).rotateY(Math.PI), -w * 0.18, H * 0.66, -d / 2 - 0.016, { uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs2) });
  // sloped control surface: a tilted frame (u across, v = surface normal, n down the slope toward the operator)
  const tilt = 0.26;
  const topD = d * 0.82;
  const sc = f.pos(0, H + 0.07, -d * 0.04);
  const t = new Frame(kit, sc, f.U, new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)).applyQuaternion(f.q));
  t.box("impTrim", 0, -0.035, 0, w - 0.04, 0.07, topD + 0.08, { color: PALETTE.impBlack, texel: 1 });
  t.box("impMetal", 0, 0.004, 0.02, w - 0.2, 0.012, topD - 0.06, { color: PALETTE.impGreyDark, texel: 2 });
  // screens on the far half under the hood
  const nS = Math.max(1, Math.min(screens.length, Math.floor((w - 0.3) / 0.62)));
  const sh = Math.min(0.3, topD * 0.36);
  const sn = -topD * 0.24;
  for (let i = 0; i < nS; i++) {
    const su = -w / 2 + 0.16 + ((w - 0.32) * (i + 0.5)) / nS;
    const sw = Math.min(0.62, (w - 0.32) / nS - 0.08);
    t.box("impGloss", su, 0.013, sn, sw + 0.05, 0.01, sh + 0.05);
    t.add(screens[i % screens.length], new THREE.PlaneGeometry(sw, sh).rotateX(-Math.PI / 2), su, 0.02, sn, { uv: "keep" });
  }
  // key field along the operator edge (two rows), dials between the rows
  const nb = Math.floor((w - 0.36) / 0.095);
  for (let row = 0; row < 2; row++) {
    const kn = topD * (row === 0 ? 0.3 : 0.17);
    for (let i = 0; i < nb; i++) {
      const bu = -w / 2 + 0.2 + i * 0.095;
      const r = rand();
      const mat = r < 0.16 ? accentKey : r < 0.24 ? "emitRedImp" : r < 0.3 ? "emitWhiteSoft" : r < 0.5 ? "impGloss" : "impTrim";
      t.box(mat, bu, 0.018, kn, 0.065, 0.024, row === 0 ? 0.065 : 0.05, mat === "impTrim" ? { color: PALETTE.impBlack } : {});
    }
  }
  for (let i = 0; i < Math.max(1, Math.floor(w / 0.8)); i++) {
    const du = -w / 2 + 0.36 + i * 0.8 + (rand() - 0.5) * 0.1;
    t.add("impMetal", new THREE.CylinderGeometry(0.03, 0.036, 0.04, 10), du, 0.03, topD * 0.04, { color: PALETTE.impGrey, uv: "scale", uvScale: [0.2, 0.1] });
    t.box(accentKey, du, 0.052, topD * 0.04 - 0.02, 0.006, 0.006, 0.02);
  }
  // hood over the screens: black canopy on side cheeks, charcoal underside channel with the practical strip
  const hn = sn - 0.02;
  t.box("impTrim", 0, 0.34, hn, w - 0.08, 0.05, 0.46, { color: PALETTE.impBlack, texel: 1 });
  for (const s of [-1, 1]) t.box("impTrim", s * (w / 2 - 0.07), 0.17, hn - 0.1, 0.06, 0.34, 0.26, { color: PALETTE.impBlack });
  t.box("impMetal", 0, 0.312, hn + 0.06, w - 0.3, 0.012, 0.22, { color: PALETTE.impCharcoal });
  t.box(hoodKey, 0, 0.303, hn + 0.08, w - 0.4, 0.008, 0.06, { uv: "keep" });
  for (let k = 0; k < 3; k++) t.box(k === 1 ? accentKey : "impGloss", -w / 2 + 0.2 + k * 0.12, 0.312, hn + 0.2, 0.06, 0.012, 0.03);
  // flexible conduits from the back face into a deck box behind
  if (conduits > 0) {
    const bz = -d / 2 - 0.3;
    f.box("impTrim", 0, 0.06, bz, w * 0.55, 0.12, 0.24, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", 0, 0.125, bz, w * 0.55 - 0.06, 0.012, 0.18, { color: PALETTE.impCharcoal });
    f.box(accentKey, w * 0.2, 0.08, bz - 0.125, 0.06, 0.02, 0.01);
    for (let c = 0; c < conduits; c++) {
      const u = (c - (conduits - 1) / 2) * (w * 0.22);
      const a = f.pos(u, H * 0.5, -d / 2 - 0.02);
      const b = f.pos(u, 0.13, bz);
      f.add("impMetal", new THREE.SphereGeometry(0.045, 8, 6), u, H * 0.5, -d / 2 - 0.02, { color: PALETTE.impBlack });
      tube(kit, [a.x, a.y, a.z], [b.x, b.y, b.z], 0.032, "impMetal", { color: c % 2 ? PALETTE.impGreyDark : PALETTE.impCharcoal });
    }
  }
  if (tall) {
    // upright display column: black panel, gloss bezel, main screen facing the operator, lamp row
    f.box("impTrim", 0, H + 0.62, -d / 2 - 0.02, w - 0.2, 1.24, 0.18, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", 0, H + 1.26, -d / 2 - 0.02, w - 0.14, 0.05, 0.22, { color: PALETTE.impCharcoal });
    f.box("impGloss", 0, H + 0.76, -d / 2 + 0.075, w - 0.5, 0.74, 0.012);
    f.screen(screens[0], 0, H + 0.78, -d / 2 + 0.083, w - 0.6, 0.6);
    f.box(accentKey, 0, H + 0.4, -d / 2 + 0.083, w - 0.6, 0.02, 0.01);
    for (let k = 0; k < 5; k++) f.box(k % 2 ? "impGloss" : k === 2 ? "emitWhite" : accentKey, -0.24 + k * 0.12, H + 0.3, -d / 2 + 0.083, 0.06, 0.04, 0.01);
  }
  if (withStool) {
    const p = f.pos(0, 0, d / 2 + 0.62);
    stool(kit, p.x, cy, p.z, { h: stoolH });
  }
  // collider (AABB of the rotated footprint incl. the deck box)
  f.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, H + (tall ? 1.3 : 0.5), conduits > 0 ? -d / 2 - 0.44 : -d / 2 - 0.03, d / 2 + 0.03, tag);
}

/** Operator stool: black base disc, charcoal column with a foot ring, padded seat. */
export function stool(kit, x, y, z, opts = {}) {
  const { h = 0.6, color = PALETTE.impGreyDark } = opts;
  kit.add("impTrim", new THREE.CylinderGeometry(0.2, 0.25, 0.04, 14), { pos: [x, y + 0.02, z], color: PALETTE.impBlack, uv: "scale", uvScale: [1, 0.1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.04, 0.055, h - 0.1, 10), { pos: [x, y + 0.04 + (h - 0.1) / 2, z], color: PALETTE.impCharcoal, uv: "scale", uvScale: [0.3, h] });
  kit.add("impMetal", new THREE.TorusGeometry(0.16, 0.012, 6, 20).rotateX(Math.PI / 2), { pos: [x, y + 0.24, z], color: PALETTE.impGrey });
  kit.add("impTrim", new THREE.CylinderGeometry(0.19, 0.16, 0.06, 16), { pos: [x, y + h - 0.03, z], color: PALETTE.impBlack, uv: "scale", uvScale: [1, 0.1] });
  kit.add("rubber", new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), { pos: [x, y + h + 0.015, z], color, uv: "scale", uvScale: [1, 0.1] });
  if (opts.collide !== false) kit.collider([x - 0.22, y, z - 0.22], [x + 0.22, y + h + 0.05, z + 0.22], "stool");
}

/** Ceiling downlight: black can with a charcoal baffle and a lens (pair it with a spot / point light). */
export function downlight(kit, x, y, z, opts = {}) {
  const { r = 0.22, key = "emitWhiteSoft" } = opts;
  kit.cyl("impTrim", x, y - 0.12, z, r + 0.06, 0.24, "y", { color: PALETTE.impBlack, segments: 20, texel: 1 });
  kit.cyl("impMetal", x, y - 0.245, z, r, 0.02, "y", { color: PALETTE.impCharcoal, segments: 20 });
  kit.cyl(key, x, y - 0.262, z, r - 0.05, 0.014, "y", { segments: 20, uv: "keep" });
}

// ---------------------------------------------------------------------------
// Wall-mounted equipment (all on a wall Frame: u along the wall, v up, n into the room)
// ---------------------------------------------------------------------------
/**
 * Data bank / blade rack: black cabinet with a charcoal inner frame and seam lines, rows of metal
 * blades (handle bar, status lamp, occasional tag; one pulled out), a readout with keys at the top,
 * a vent grille and a deck junction box at the foot, a three-cable bundle rising from the top and
 * bending into the wall (cables: "wall") or dropping into a box behind (cables: "floor", for
 * free-standing racks on a yawFrame), and an optional hood with a downward practical strip.
 */
export function dataBank(frame, u, opts = {}) {
  const { w = 1.2, h = 2.3, depth = 0.6, seed = 1, accentKey = "emitRedImp", screen = "scrRed0", n0 = 0.08, decal = IMP_DECAL.glyphs1, cables = "wall", practical = null } = opts;
  const rand = rng(seed);
  const nc = n0 + depth / 2;
  const front = n0 + depth;
  const cableCols = [PALETTE.impGreyDark, PALETTE.impCharcoal, PALETTE.impGrey];
  frame.box("impTrim", u, h / 2, nc, w, h, depth, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, h / 2 + 0.04, front + 0.005, w - 0.14, h - 0.3, 0.01, { color: PALETTE.impCharcoal, texel: 2 });
  frame.box("impMetal", u, h + 0.03, nc, w + 0.04, 0.06, depth + 0.04, { color: PALETTE.impGreyDark, texel: 1 });
  frame.box("impMetal", u, 0.06, nc, w + 0.04, 0.12, depth + 0.04, { color: PALETTE.impCharcoal, texel: 1 });
  for (const s of [-1, 1]) frame.box("impTrim", u + s * (w / 2 - 0.1), h / 2 + 0.04, front + 0.012, 0.014, h - 0.4, 0.006, { color: PALETTE.impBlack });
  // readout at the top: gloss bezel, screen, keys, a status lamp
  const sv = h - 0.5;
  frame.box("impGloss", u, sv, front + 0.012, w - 0.34, 0.36, 0.012);
  frame.screen(screen, u, sv + 0.03, front + 0.02, w - 0.46, 0.22);
  for (let k = 0; k < 3; k++) frame.box(k === 0 ? accentKey : k === 2 ? "emitWhite" : "impGloss", u - w / 2 + 0.3 + k * 0.14, sv - 0.12, front + 0.022, 0.09, 0.04, 0.02);
  frame.box(rand() < 0.5 ? accentKey : "emitAmber", u + w / 2 - 0.3, sv - 0.12, front + 0.022, 0.04, 0.04, 0.012);
  // blade rows between dark seams
  const bH = 0.13;
  const pitch = 0.17;
  const v0 = 0.5;
  const nBl = Math.max(3, Math.floor((sv - 0.24 - v0) / pitch));
  const pulledRow = Math.floor(rand() * nBl);
  for (let r = 0; r < nBl; r++) {
    const v = v0 + r * pitch + bH / 2;
    const dn = r === pulledRow && rand() < 0.6 ? 0.05 : 0;
    frame.box("impMetal", u, v, front + 0.012 + dn / 2, w - 0.34, bH, 0.012 + dn, { color: r % 2 ? PALETTE.impGreyDark : PALETTE.impGrey, texel: 2 });
    frame.box("impTrim", u - 0.1, v, front + 0.026 + dn, w * 0.42, 0.024, 0.014, { color: PALETTE.impBlack });
    const lr = rand();
    if (lr < 0.8) frame.box(lr < 0.55 ? accentKey : "emitWhite", u + w / 2 - 0.28, v, front + 0.024 + dn, 0.035, 0.035, 0.012);
    else frame.box("impTrim", u + w / 2 - 0.28, v, front + 0.022 + dn, 0.035, 0.035, 0.008, { color: PALETTE.impBlack });
    if (rand() < 0.3) frame.decal(rand() < 0.5 ? IMP_DECAL.glyphs1 : IMP_DECAL.glyphs2, u + w / 2 - 0.44, v, front + 0.022 + dn, 0.1);
  }
  // vent grille at the foot, deck junction box with a stub cable up into the grille
  frame.box("impTrim", u, 0.3, front + 0.008, w - 0.34, 0.26, 0.008, { color: PALETTE.impBlack });
  for (let s = 0; s < 5; s++) frame.box("impMetal", u, 0.2 + s * 0.05, front + 0.014, w - 0.44, 0.016, 0.01, { color: PALETTE.impGreyDark });
  frame.box("impTrim", u - w / 2 + 0.26, 0.06, front + 0.1, 0.3, 0.12, 0.16, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u - w / 2 + 0.26, 0.125, front + 0.1, 0.24, 0.01, 0.1, { color: PALETTE.impCharcoal });
  frame.box(accentKey, u - w / 2 + 0.16, 0.08, front + 0.182, 0.04, 0.02, 0.006);
  frame.cylV("impMetal", u - w / 2 + 0.3, 0.26, front + 0.06, 0.02, 0.28, { color: PALETTE.impGreyDark, segments: 8 });
  frame.decal(decal, u, h - 0.16, front + 0.014, Math.min(0.24, w * 0.2));
  // cable bundle from the cabinet top
  const top = h + 0.06;
  for (let c = 0; c < 3; c++) {
    const cu = u + (c - 1) * 0.22 * (w / 1.2);
    const cn = nc + (c - 1) * 0.1;
    const rise = 0.28 + c * 0.07;
    const col = cableCols[c];
    frame.cylV("impMetal", cu, top + rise / 2, cn, 0.03, rise, { color: col, segments: 8 });
    frame.add("impMetal", new THREE.SphereGeometry(0.034, 8, 6), cu, top + rise, cn, { color: col });
    if (cables === "wall") frame.cylN("impMetal", cu, top + rise, cn / 2, 0.03, cn, { color: col, segments: 8 });
    else if (cables === "floor") {
      const back = n0 - 0.14;
      frame.cylN("impMetal", cu, top + rise, (cn + back) / 2, 0.03, cn - back, { color: col, segments: 8 });
      frame.add("impMetal", new THREE.SphereGeometry(0.034, 8, 6), cu, top + rise, back, { color: col });
      frame.cylV("impMetal", cu, (top + rise + 0.16) / 2, back, 0.03, top + rise - 0.16, { color: col, segments: 8 });
    }
  }
  if (cables === "wall") frame.box("impTrim", u, top + 0.4, 0.02, w * 0.62, 0.34, 0.05, { color: PALETTE.impBlack, texel: 1 });
  else if (cables === "floor") frame.box("impTrim", u, 0.08, n0 - 0.14, w * 0.7, 0.16, 0.2, { color: PALETTE.impBlack, texel: 1 });
  // hood with a downward practical strip
  if (practical) {
    frame.box("impTrim", u, h + 0.03, front + 0.1, w - 0.2, 0.06, 0.2, { color: PALETTE.impBlack, texel: 1 });
    frame.box(practical, u, h - 0.006, front + 0.12, w - 0.5, 0.01, 0.08, { uv: "keep" });
  }
  frame.collider(u - w / 2 - 0.02, u + w / 2 + 0.02, 0, h + 0.06, cables === "floor" ? n0 - 0.26 : n0, front + (practical ? 0.21 : 0.2), "databank");
}

/** Sealed cabinet: double doors, stencil across the seam, keypad, status lamp, handles. */
export function sealedCabinet(frame, u, opts = {}) {
  const { w = 1.4, h = 2.3, depth = 0.55, n0 = 0.08, accentKey = "emitRedImp", decal = IMP_DECAL.restricted, doorColor = PALETTE.impGreyDark } = opts;
  const front = n0 + depth;
  frame.box("impTrim", u, h / 2, n0 + depth / 2, w, h, depth, { color: PALETTE.impBlack, texel: 1 });
  for (const s of [-1, 1]) frame.box("impPanel2", u + s * (w / 4 + 0.01), h / 2 + 0.01, front + 0.01, w / 2 - 0.1, h - 0.62, 0.02, { color: doorColor, uv: "world", texel: 1 });
  frame.box("impTrim", u, h / 2 + 0.01, front + 0.018, 0.04, h - 0.62, 0.012, { color: PALETTE.impBlack });
  for (const s of [-1, 1]) frame.box("impMetal", u + s * 0.12, h * 0.5, front + 0.04, 0.035, 0.3, 0.035, { color: PALETTE.impGrey });
  frame.box("impMetal", u, h - 0.15, front + 0.01, w - 0.2, 0.2, 0.02, { color: PALETTE.impCharcoal, texel: 2 });
  frame.box(accentKey, u - w / 2 + 0.25, h - 0.15, front + 0.026, 0.1, 0.06, 0.012);
  frame.box("impGloss", u + w / 2 - 0.35, h - 0.15, front + 0.026, 0.3, 0.12, 0.012);
  for (let k = 0; k < 3; k++) frame.box(k === 0 ? "emitWhite" : accentKey, u + w / 2 - 0.45 + k * 0.1, h - 0.15, front + 0.036, 0.05, 0.05, 0.008);
  frame.decal(decal, u, h * 0.66, front + 0.032, Math.min(0.72, w * 0.5));
  frame.decal(IMP_DECAL.glyphs2, u, h * 0.36, front + 0.032, Math.min(0.4, w * 0.3));
  frame.box("impMetal", u, 0.08, n0 + depth / 2, w + 0.04, 0.16, depth + 0.04, { color: PALETTE.impCharcoal, texel: 1 });
  frame.box("impMetal", u, h + 0.03, n0 + depth / 2, w + 0.04, 0.06, depth + 0.04, { color: PALETTE.impGreyDark, texel: 1 });
  frame.collider(u - w / 2 - 0.02, u + w / 2 + 0.02, 0, h + 0.06, n0, front + 0.06, "cabinet");
}

/** Framed wall display: black surround, gloss bezel, screen, accent underline, corner bolts, tag. */
export function wallScreen(frame, u, v, w, h, matKey, opts = {}) {
  const { n0 = 0.08, accentKey = "emitBlue", frameW = 0.12, label = true, bolts = true, collide = true } = opts;
  frame.box("impTrim", u, v, n0 + 0.04, w + frameW * 2, h + frameW * 2, 0.08, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impGloss", u, v, n0 + 0.085, w + 0.06, h + 0.06, 0.01);
  frame.screen(matKey, u, v, n0 + 0.096, w, h);
  frame.box(accentKey, u, v - h / 2 - frameW * 0.55, n0 + 0.085, w * 0.8, 0.025, 0.012);
  if (bolts) for (const [bu, bv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) frame.cylN("impMetal", u + bu * (w / 2 + frameW * 0.5), v + bv * (h / 2 + frameW * 0.5), n0 + 0.085, 0.018, 0.02, { color: PALETTE.impGreyDark, segments: 8 });
  if (label) frame.decal(IMP_DECAL.glyphs2, u - w / 2 + 0.2, v + h / 2 + frameW * 0.5, n0 + 0.086, 0.11);
  if (collide) frame.collider(u - w / 2 - frameW, u + w / 2 + frameW, v - h / 2 - frameW, v + h / 2 + frameW, n0, n0 + 0.1, "screen");
}

/** Row of small indicator lamps on a frame (deterministic mix of accent / white / red / off). */
export function indicatorRow(frame, u, v, n, count, opts = {}) {
  const { accentKey = "emitBlue", step = 0.08, size = 0.04, seed = 5, off = 0.25 } = opts;
  const rand = rng(seed);
  frame.box("impGloss", u, v, n - 0.006, count * step + 0.06, size + 0.05, 0.012);
  for (let k = 0; k < count; k++) {
    const lu = u - ((count - 1) * step) / 2 + k * step;
    const r = rand();
    const key = r < off ? null : r < 0.6 ? accentKey : r < 0.85 ? "emitWhite" : "emitRedImp";
    if (key) frame.box(key, lu, v, n + 0.004, size, size, 0.01);
    else frame.box("impTrim", lu, v, n + 0.002, size, size, 0.006, { color: PALETTE.impGreyDark });
  }
}

// ---------------------------------------------------------------------------
// Overhead: cable trays with conduit bundles, hangers to the ceiling
// ---------------------------------------------------------------------------
export function cableTray(kit, from, to, y, opts = {}) {
  const { w = 0.5, ceilingY = null, conduits = 4, seed = 1, hangerStep = 2.4 } = opts;
  const rand = rng(seed);
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const yaw = Math.atan2(dir.x, dir.z);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const place = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(mid);
  const box = (mat, lx, ly, lz, sx, sy, sz, extra = {}) => {
    const p = place(lx, ly, lz);
    kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impMetal", 0, 0, 0, w, 0.03, L, { color: PALETTE.impGreyDark, texel: 1 });
  for (const s of [-1, 1]) box("impMetal", s * (w / 2 - 0.015), 0.06, 0, 0.03, 0.12, L, { color: PALETTE.impGreyDark, texel: 1 });
  for (let i = 0; i < conduits; i++) {
    const r = 0.028 + rand() * 0.03;
    const lx = -w / 2 + 0.08 + ((i + 0.5) / conduits) * (w - 0.16);
    const p = place(lx, 0.015 + r, 0);
    const g = new THREE.CylinderGeometry(r, r, L - 0.06, 8).rotateX(Math.PI / 2);
    kit.add("impMetal", g, { pos: [p.x, p.y, p.z], quat: q, color: [PALETTE.impCharcoal, PALETTE.impGrey, PALETTE.impGreyDark, PALETTE.impBlack][i % 4], uv: "scale", uvScale: [0.3, L] });
  }
  const n = Math.max(2, Math.round(L / hangerStep) + 1);
  for (let i = 0; i < n; i++) {
    const lz = -L / 2 + (i / (n - 1)) * L;
    box("impTrim", 0, 0.085, lz, w + 0.04, 0.03, 0.06, { color: PALETTE.impBlack });
    if (ceilingY !== null) {
      const drop = ceilingY - y - 0.02;
      for (const s of [-1, 1]) box("impTrim", s * (w / 2 + 0.03), drop / 2 + 0.02, lz, 0.04, drop, 0.04, { color: PALETTE.impBlack });
    }
  }
}

/** Horizontal pipe bundle along a wall frame at height v, standing off the wall by `n`. */
export function conduitRun(frame, u0, u1, v, opts = {}) {
  const { n = 0.14, pipes = 3, seed = 3, clampStep = 1.8 } = opts;
  const rand = rng(seed);
  const L = u1 - u0;
  const cu = (u0 + u1) / 2;
  for (let p = 0; p < pipes; p++) {
    const r = 0.03 + rand() * 0.03;
    const pv = v + (p - (pipes - 1) / 2) * 0.16;
    frame.cylU("impMetal", cu, pv, n, r, L, { color: [PALETTE.impGreyDark, PALETTE.impGrey, PALETTE.impCharcoal][p % 3], segments: 10 });
    for (let c = u0 + 0.4; c < u1 - 0.2; c += clampStep) frame.box("impTrim", c, pv, n - 0.02, 0.08, r * 2 + 0.05, n + 0.02, { color: PALETTE.impBlack });
  }
}

// ---------------------------------------------------------------------------
// Holo furniture
// ---------------------------------------------------------------------------
/** Low holo table: black shell, recessed side band, gloss top with an emitter well and a control strip. */
export function holoTable(kit, cx, cz, w, d, h, opts = {}) {
  const { accentKey = "emitBlue", yaw = 0, controls = true } = opts;
  const f = yawFrame(kit, cx, 0, cz, yaw);
  f.box("impTrim", 0, h / 2, 0, w, h, d, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, 0.06, 0, w + 0.06, 0.12, d + 0.06, { color: PALETTE.impCharcoal, texel: 1 });
  f.box("impMetal", 0, h * 0.5, 0, w + 0.02, h * 0.3, d + 0.02, { color: PALETTE.impGreyDark, texel: 1 });
  f.box(accentKey, 0, h * 0.5, 0, w + 0.03, 0.02, d + 0.03);
  f.box("impGloss", 0, h + 0.02, 0, w + 0.04, 0.04, d + 0.04);
  f.box("impTrim", 0, h + 0.045, 0, w - 0.5, 0.012, d - 0.5, { color: PALETTE.impCharcoal });
  f.add(accentKey, new THREE.TorusGeometry(Math.min(w, d) * 0.3, 0.012, 6, 40).rotateX(Math.PI / 2), 0, h + 0.056, 0);
  f.add(accentKey, new THREE.TorusGeometry(Math.min(w, d) * 0.12, 0.01, 6, 24).rotateX(Math.PI / 2), 0, h + 0.056, 0);
  f.add("impGloss", new THREE.CylinderGeometry(0.06, 0.09, 0.03, 16), 0, h + 0.065, 0);
  if (controls) {
    const nb = Math.floor((w - 0.8) / 0.14);
    for (let k = 0; k < nb; k++) f.box(k % 4 === 0 ? accentKey : k % 4 === 2 ? "emitWhite" : "impGloss", -w / 2 + 0.45 + k * 0.14, h + 0.05, d / 2 - 0.14, 0.08, 0.02, 0.06);
    f.add("scrBlue0", new THREE.PlaneGeometry(0.5, 0.25).rotateX(-Math.PI / 2), -w / 2 + 0.55, h + 0.046, -d / 2 + 0.3, { uv: "keep" });
  }
  f.collider(-w / 2 - 0.03, w / 2 + 0.03, 0, h + 0.07, -d / 2 - 0.03, d / 2 + 0.03, "holotable");
  return f;
}

/** Projector column: black cylinder with lit rings and an emitter dish on top. */
export function projectorColumn(kit, cx, cz, r, h, opts = {}) {
  const { accentKey = "emitBlue", y = 0, rings = 3 } = opts;
  kit.cyl("impTrim", cx, y + h / 2, cz, r, h, "y", { color: PALETTE.impBlack, segments: 24, texel: 1 });
  kit.cyl("impMetal", cx, y + 0.08, cz, r + 0.08, 0.16, "y", { color: PALETTE.impCharcoal, segments: 24 });
  for (let i = 0; i < rings; i++) {
    const ry = y + h * (0.25 + (0.5 * i) / Math.max(1, rings - 1));
    kit.cyl("impMetal", cx, ry, cz, r + 0.03, 0.05, "y", { color: PALETTE.impGreyDark, segments: 24 });
    kit.add(accentKey, new THREE.TorusGeometry(r + 0.035, 0.008, 6, 40).rotateX(Math.PI / 2), { pos: [cx, ry, cz] });
  }
  kit.cyl("impGloss", cx, y + h + 0.02, cz, r + 0.04, 0.04, "y", { segments: 24 });
  kit.add(accentKey, new THREE.TorusGeometry(r * 0.7, 0.012, 6, 40).rotateX(Math.PI / 2), { pos: [cx, y + h + 0.045, cz] });
  kit.cyl("impGloss", cx, y + h + 0.06, cz, 0.08, 0.04, "y", { segments: 16, r2: 0.05 });
  kit.collider([cx - r - 0.08, y, cz - r - 0.08], [cx + r + 0.08, y + h + 0.06, cz + r + 0.08], "projector");
}

/** Translucent projector cone (static) rising from an emitter to a hologram. */
export function projectorCone(kit, cx, y0, cz, y1, r0, r1, key = "holo") {
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 32, 1, true);
  kit.add(key, g, { pos: [cx, (y0 + y1) / 2, cz], uv: "keep" });
}

// ---------------------------------------------------------------------------
// Hologram geometry (LineSegments; the room wraps them with the deckA_holoLine* materials)
// ---------------------------------------------------------------------------
/** Lat/long wire sphere. */
export function wireSphereGeometry(r, lat = 6, lon = 12, segs = 48) {
  const pts = [];
  for (let i = 1; i < lat; i++) {
    const phi = (i / lat) * Math.PI;
    const rr = r * Math.sin(phi);
    const y = r * Math.cos(phi);
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI * 2;
      const a1 = ((k + 1) / segs) * Math.PI * 2;
      pts.push(rr * Math.cos(a0), y, rr * Math.sin(a0), rr * Math.cos(a1), y, rr * Math.sin(a1));
    }
  }
  const half = segs / 2;
  for (let j = 0; j < lon; j++) {
    const a = (j / lon) * Math.PI * 2;
    for (let k = 0; k < half; k++) {
      const p0 = (k / half) * Math.PI;
      const p1 = ((k + 1) / half) * Math.PI;
      pts.push(r * Math.sin(p0) * Math.cos(a), r * Math.cos(p0), r * Math.sin(p0) * Math.sin(a), r * Math.sin(p1) * Math.cos(a), r * Math.cos(p1), r * Math.sin(p1) * Math.sin(a));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
/** Flat circle in the XZ plane at height y. */
export function wireRingGeometry(r, segs = 64, y = 0) {
  const pts = [];
  for (let k = 0; k < segs; k++) {
    const a0 = (k / segs) * Math.PI * 2;
    const a1 = ((k + 1) / segs) * Math.PI * 2;
    pts.push(r * Math.cos(a0), y, r * Math.sin(a0), r * Math.cos(a1), y, r * Math.sin(a1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
/** Square grid in the XZ plane (n cells per side, size s). */
export function wireGridGeometry(s, n = 8, y = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = -s / 2 + (i / n) * s;
    pts.push(-s / 2, y, t, s / 2, y, t, t, y, -s / 2, t, y, s / 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
/** Graph: nodes (array of [x,y,z]) joined by the given index pairs. */
export function wireGraphGeometry(nodes, edges) {
  const pts = [];
  for (const [a, b] of edges) pts.push(...nodes[a], ...nodes[b]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
/**
 * Simplified Imperial Star Destroyer as edge lines, length L along z (bow at -L/2), proportions from
 * spec.js (hull 1600 m, terraces, neck, bridge head, shield domes, three main engines).
 */
export function wireDestroyerGeometry(L = 1.2) {
  const pts = [];
  const seg = (a, b) => pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const nz = (z) => ((z + 200) / 1600) * L;
  const ny = (y) => (y / 1600) * L;
  const nx = (x) => (x / 1600) * L;
  const bow = [0, ny(-10), nz(-1000)];
  const W = nx(480);
  const yT = ny(52);
  const yB = ny(-78);
  const zS = nz(600);
  const sTL = [-W, yT, zS];
  const sTR = [W, yT, zS];
  const sBL = [-W, yB, zS];
  const sBR = [W, yB, zS];
  seg(bow, sTL);
  seg(bow, sTR);
  seg(bow, sBL);
  seg(bow, sBR);
  seg(sTL, sTR);
  seg(sTR, sBR);
  seg(sBR, sBL);
  seg(sBL, sTL);
  // side trench (upper and lower lip)
  for (const s of [-1, 1]) {
    for (const f of [0.5, 0.3]) {
      const y = yB + f * (yT - yB);
      seg([s * W * 0.25, y, nz(-600)], [s * W, y, zS]);
    }
  }
  // stern face detail: three engine rings
  for (const [ex, ey, er] of [[-190, -8, 42], [0, -8, 46], [190, -8, 42]]) {
    const n = 16;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      seg([nx(ex) + nx(er) * Math.cos(a0), ny(ey) + nx(er) * Math.sin(a0), zS], [nx(ex) + nx(er) * Math.cos(a1), ny(ey) + nx(er) * Math.sin(a1), zS]);
    }
  }
  // tapered blocks: terraces, neck, bridge head
  const block = (zF, zB, hwF, hwB, y0, y1, draft = 0.85) => {
    const c = [[-nx(hwF), ny(y0), nz(zF)], [nx(hwF), ny(y0), nz(zF)], [nx(hwB), ny(y0), nz(zB)], [-nx(hwB), ny(y0), nz(zB)]];
    const t = [[-nx(hwF) * draft, ny(y1), nz(zF)], [nx(hwF) * draft, ny(y1), nz(zF)], [nx(hwB) * draft, ny(y1), nz(zB)], [-nx(hwB) * draft, ny(y1), nz(zB)]];
    for (let i = 0; i < 4; i++) {
      seg(c[i], c[(i + 1) % 4]);
      seg(t[i], t[(i + 1) % 4]);
      seg(c[i], t[i]);
    }
  };
  block(-420, 600, 42, 265, 52, 84);
  block(-180, 600, 34, 205, 84, 112);
  block(60, 600, 28, 150, 112, 138);
  block(250, 370, 40, 40, 138, 230, 0.95);
  block(215, 395, 105, 105, 230, 268, 1.0);
  // shield domes (two rings each) + comms mast
  for (const dx of [-62, 62]) {
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      seg([nx(dx) + nx(30) * Math.cos(a0), ny(282), nz(330) + nx(30) * Math.sin(a0)], [nx(dx) + nx(30) * Math.cos(a1), ny(282), nz(330) + nx(30) * Math.sin(a1)]);
      if (k < n / 2) seg([nx(dx) + nx(30) * Math.cos(a0), ny(282) + nx(30) * Math.sin(a0), nz(330)], [nx(dx) + nx(30) * Math.cos(a1), ny(282) + nx(30) * Math.sin(a1), nz(330)]);
    }
  }
  seg([0, ny(268), nz(345)], [0, ny(336), nz(345)]);
  // hangar mouth on the belly
  const hb = ny(-78) - 0.001;
  const m = [[-nx(30), hb, nz(-40)], [nx(30), hb, nz(-40)], [nx(30), hb, nz(60)], [-nx(30), hb, nz(60)]];
  for (let i = 0; i < 4; i++) seg(m[i], m[(i + 1) % 4]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

// ---------------------------------------------------------------------------
// Steps, lamps, ceiling ring
// ---------------------------------------------------------------------------
/**
 * Visual + walkable steps: n treads rising from y0 to y1 along `axis` from `from` to `to`, spanning
 * [a0, a1] on the other axis. Solid blocks so the risers read; black nosings; accent line per riser.
 */
export function stepBlock(kit, axis, from, to, a0, a1, y0, y1, n, opts = {}) {
  const { accentKey = null, color = PALETTE.impCharcoal } = opts;
  const dir = Math.sign(to - from);
  for (let i = 0; i < n; i++) {
    const p0 = from + ((to - from) * i) / n;
    const p1 = from + ((to - from) * (i + 1)) / n;
    const yt = y0 + ((y1 - y0) * (i + 1)) / n;
    const lo = Math.min(p0, p1);
    const hi = Math.max(p0, p1);
    if (axis === "x") {
      kit.boxMM("impMetal", [lo, y0 - 0.02, a0], [hi, yt, a1], { color, texel: 1 });
      kit.boxMM("impTrim", [p0 + dir * 0.03 - 0.03, yt, a0 - 0.01], [p0 + dir * 0.03 + 0.03, yt + 0.012, a1 + 0.01], { color: PALETTE.impBlack });
      if (accentKey) kit.boxMM(accentKey, [p0 - dir * 0.008 - 0.006, yt - 0.06, a0 + 0.15], [p0 - dir * 0.008 + 0.006, yt - 0.04, a1 - 0.15]);
    } else {
      kit.boxMM("impMetal", [a0, y0 - 0.02, lo], [a1, yt, hi], { color, texel: 1 });
      kit.boxMM("impTrim", [a0 - 0.01, yt, p0 + dir * 0.03 - 0.03], [a1 + 0.01, yt + 0.012, p0 + dir * 0.03 + 0.03], { color: PALETTE.impBlack });
      if (accentKey) kit.boxMM(accentKey, [a0 + 0.15, yt - 0.06, p0 - dir * 0.008 - 0.006], [a1 - 0.15, yt - 0.04, p0 - dir * 0.008 + 0.006]);
    }
  }
  if (axis === "x") kit.stairs(Math.min(from, to), a0, Math.max(from, to), a1, "x", from, to, y0, y1, n);
  else kit.stairs(a0, Math.min(from, to), a1, Math.max(from, to), "z", from, to, y0, y1, n);
}

/**
 * Railing with the impRailing look (two rails, posts, optional light strip) but a collider chain of
 * short boxes instead of one AABB, so diagonal runs (octagon flats) do not fence off the whole
 * bounding square around them.
 */
export function segRailing(kit, from, to, y = 0, opts = {}) {
  const { h = 1.05, postStep = 1.6, color = PALETTE.impGreyDark, light = null, segLen = 0.45 } = opts;
  const a = new THREE.Vector3(from[0], y, from[1]);
  const b = new THREE.Vector3(to[0], y, to[1]);
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(dir.x, dir.z));
  for (const [yy, r] of [[y + h, 0.03], [y + h * 0.55, 0.02]]) kit.add("impMetal", new THREE.CylinderGeometry(r, r, L, 10).rotateX(Math.PI / 2), { pos: [mid.x, yy, mid.z], quat: q, color, uv: "scale", uvScale: [0.3, L] });
  const n = Math.max(2, Math.round(L / postStep) + 1);
  for (let i = 0; i < n; i++) {
    const p = a.clone().addScaledVector(dir, (L * i) / (n - 1));
    kit.box("impTrim", p.x, y + h / 2, p.z, 0.06, h, 0.06, { color: PALETTE.impBlack });
    kit.box("impTrim", p.x, y + 0.03, p.z, 0.16, 0.06, 0.16, { color: PALETTE.impBlack });
  }
  if (light) kit.add(light, new THREE.BoxGeometry(0.03, 0.03, L - 0.2), { pos: [mid.x, y + h - 0.06, mid.z], quat: q });
  const m = Math.max(1, Math.ceil(L / segLen));
  for (let i = 0; i < m; i++) {
    const p0 = a.clone().addScaledVector(dir, (L * i) / m);
    const p1 = a.clone().addScaledVector(dir, (L * (i + 1)) / m);
    kit.collider([Math.min(p0.x, p1.x) - 0.06, y, Math.min(p0.z, p1.z) - 0.06], [Math.max(p0.x, p1.x) + 0.06, y + h, Math.max(p0.z, p1.z) + 0.06], "rail");
  }
}

/**
 * Alert lamp: static black housing with a grille on a yawed frame at (x, y, z); returns the lens
 * geometry (already placed) so the room can merge lenses into one pulsing mesh.
 */
export function alertLamp(kit, x, y, z, yaw) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.box("impTrim", 0, 0, 0.07, 0.34, 0.2, 0.14, { color: PALETTE.impBlack, texel: 1 });
  f.box("impMetal", 0, 0, 0.145, 0.28, 0.14, 0.01, { color: PALETTE.impCharcoal });
  for (let k = 0; k < 3; k++) f.box("impTrim", 0, -0.05 + k * 0.05, 0.17, 0.3, 0.012, 0.012, { color: PALETTE.impBlack });
  return frameGeo(f, new THREE.BoxGeometry(0.26, 0.12, 0.02), 0, 0, 0.16);
}

/**
 * Ring light trough at the ceiling: n housings around (cx, cz) at radius r. `w` is the housing width,
 * `emitW` the emitter width (default the housing minus its rim) — pass a narrow emitW with a dim key
 * for a recessed cove line instead of a glowing slab; `drop` is how far the housing hangs down.
 */
export function ceilingRingLight(kit, cx, cz, r, y, n = 16, opts = {}) {
  const { key = "emitWhiteSoft", w = 0.5, accentKey = null, emitW = null, drop = 0.24 } = opts;
  const ew = emitW !== null ? emitW : w - 0.16;
  const step = (Math.PI * 2) / n;
  const chord = 2 * r * Math.sin(step / 2);
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) * step;
    const o = new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
    const f = new Frame(kit, o, new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), UP);
    f.box("impTrim", 0, -drop / 2, 0, chord + 0.06, drop, w + 0.2, { color: PALETTE.impBlack, texel: 1 });
    f.box("impMetal", 0, -drop + 0.04, 0, chord - 0.12, 0.09, w, { color: PALETTE.impCharcoal });
    // louvre fins either side of a narrow emitter keep it reading as a recessed fixture
    f.box(key, 0, -drop - 0.006, 0, chord - 0.24, 0.012, ew, { uv: "keep" });
    if (ew < w - 0.3) for (const s of [-1, 1]) f.box("impTrim", 0, -drop - 0.012, s * (ew / 2 + 0.04), chord - 0.2, 0.024, 0.05, { color: PALETTE.impBlack });
    if (accentKey) f.box(accentKey, 0, -drop + 0.04, w / 2 + 0.06, chord - 0.3, 0.02, 0.02);
  }
}

// ---------------------------------------------------------------------------
// Sensor / data holograms (returned as THREE groups for the room to attach and animate)
// ---------------------------------------------------------------------------
/**
 * Spinning tri-plane radar cone: three translucent vertical blades at 120 degrees (the swept volume
 * reads as a cone), fine rings at three heights, a rim ring and a handful of contact blips.
 * Returns { blades, blips } — spin blades fast, blips slowly the other way.
 */
export function triPlaneRadar(M, r = 1.0, h = 1.6, keys = {}) {
  const { fill = "deckA_holoCyan", bright = "deckA_holoCyanBright", line = "deckA_holoLineCyan", lineDim = "deckA_holoLineDim" } = keys;
  const blades = new THREE.Group();
  const geos = [];
  const edges = [];
  // each blade: apex at the emitter, widening to the rim at the top with a slightly concave outer
  // edge — the three together sweep an upright cone, not a globe
  const edge = (t) => [(1 - t) * (1 - t) * r * 0.08 + 2 * (1 - t) * t * r * 0.42 + t * t * r, (1 - t) * (1 - t) * 0.04 + 2 * (1 - t) * t * h * 0.42 + t * t * h];
  for (let i = 0; i < 3; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.04);
    shape.lineTo(0, h);
    shape.lineTo(r, h);
    shape.quadraticCurveTo(r * 0.42, h * 0.42, r * 0.08, 0.04);
    shape.lineTo(0, 0.04);
    const g = new THREE.ShapeGeometry(shape, 10).rotateY((i / 3) * Math.PI * 2);
    geos.push(g);
    // bright outer edge of each blade (apex to rim) and the rim itself
    const pts = [];
    const n = 10;
    for (let k = 0; k < n; k++) {
      const [x0, y0] = edge(k / n);
      const [x1, y1] = edge((k + 1) / n);
      pts.push(x0, y0, 0, x1, y1, 0);
    }
    pts.push(r, h, 0, 0, h, 0);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    eg.rotateY((i / 3) * Math.PI * 2);
    edges.push(eg);
  }
  blades.add(mergedMesh(geos, M[fill]));
  blades.add(mergedLines(edges, M[line]));
  // static-ish reference: the cone's rim ring, two range rings inside the cone, a spindle
  const blips = new THREE.Group();
  blips.add(mergedLines([wireRingGeometry(r * 0.99, 64, h * 0.99), wireRingGeometry(r * 0.55, 48, h * 0.6), wireRingGeometry(r * 0.2, 32, h * 0.28)], M[lineDim]));
  const bg = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.9;
    const rr = r * (0.45 + 0.5 * ((i * 0.37) % 1));
    bg.push(new THREE.OctahedronGeometry(0.045).translate(Math.cos(a) * rr, h * (0.3 + 0.55 * ((i * 0.61) % 1)), Math.sin(a) * rr));
  }
  blips.add(mergedMesh(bg, M[bright]));
  const spindle = new THREE.BufferGeometry();
  spindle.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, h, 0], 3));
  blips.add(lineSegments(spindle, M[line]));
  return { blades, blips };
}

/**
 * Navicomp data core: a stack of concentric transparent cylinders wrapped in scrolling glyph
 * textures (materials deckA_dataScroll / deckA_dataScroll2, whose userData.scroll is advanced by the
 * room), a solid inner column with lit rings, cap discs. Returns { group, scrolls } where scrolls are
 * the textures to offset per frame.
 */
export function dataCore(M, r = 0.42, h = 1.5) {
  const group = new THREE.Group();
  const scrolls = [];
  for (const [rr, key, rep] of [[r, "deckA_dataScroll", 3], [r * 0.7, "deckA_dataScroll2", 2]]) {
    const g = new THREE.CylinderGeometry(rr, rr, h, 48, 1, true);
    // wrap `rep` copies of the texture around; one copy tall
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
    const m = new THREE.Mesh(g, M[key]);
    m.castShadow = m.receiveShadow = false;
    group.add(m);
    if (M[key].userData.scroll) scrolls.push(M[key].userData.scroll);
  }
  // inner column: dark glass with red lit rings, cap discs top and bottom
  const inner = [];
  inner.push(new THREE.CylinderGeometry(r * 0.32, r * 0.32, h * 0.96, 24, 1, true));
  group.add(mergedMesh(inner, M.deckA_holoRed));
  const rings = [];
  for (let i = 0; i < 5; i++) rings.push(new THREE.TorusGeometry(r * 0.34, 0.008, 6, 40).rotateX(Math.PI / 2).translate(0, -h / 2 + (h * (i + 0.5)) / 5, 0));
  rings.push(new THREE.RingGeometry(r * 0.3, r * 1.02, 48).rotateX(-Math.PI / 2).translate(0, h / 2, 0));
  rings.push(new THREE.RingGeometry(r * 0.3, r * 1.02, 48).rotateX(Math.PI / 2).translate(0, -h / 2, 0));
  group.add(mergedMesh(rings, M.deckA_holoRedBright));
  return { group, scrolls };
}

// ---------------------------------------------------------------------------
// Desk clutter
// ---------------------------------------------------------------------------
export function datapad(kit, x, y, z, yaw = 0, opts = {}) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.box("impTrim", 0, 0.008, 0, 0.19, 0.016, 0.27, { color: PALETTE.impBlack });
  f.add(opts.screen || "scrBlue0", new THREE.PlaneGeometry(0.15, 0.19).rotateX(-Math.PI / 2), 0, 0.021, -0.02, { uv: "keep" });
  f.box("impGloss", 0, 0.019, 0.11, 0.06, 0.006, 0.02);
  f.box(opts.accentKey || "emitBlue", 0.06, 0.02, 0.11, 0.015, 0.008, 0.015);
}
export function cup(kit, x, y, z, opts = {}) {
  kit.cyl("impPanel", x, y + 0.045, z, 0.03, 0.09, "y", { color: opts.color || PALETTE.impWhite, segments: 12, r2: 0.038 });
  kit.cyl("impGloss", x, y + 0.092, z, 0.031, 0.004, "y", { segments: 12, r2: 0.031 });
  kit.box("impPanel", x, y + 0.05, z, 0.006, 0.05, 0.02, { color: opts.color || PALETTE.impWhite });
}
/** Imperial crew helmet resting on a surface (gloss black dome, visor, chin band). */
export function helmet(kit, x, y, z, yaw = 0) {
  const f = yawFrame(kit, x, y, z, yaw);
  f.add("impGloss", new THREE.SphereGeometry(0.15, 16, 12), 0, 0.15, 0);
  f.box("impTrim", 0, 0.08, 0, 0.3, 0.1, 0.3, { color: PALETTE.impBlack });
  f.box("impGloss", 0, 0.14, -0.14, 0.2, 0.07, 0.03);
  f.box("impMetal", 0, 0.2, -0.155, 0.05, 0.05, 0.01, { color: PALETTE.impGreyDark });
  for (const s of [-1, 1]) f.box("impMetal", s * 0.16, 0.1, 0, 0.02, 0.06, 0.12, { color: PALETTE.impGreyDark });
}
/** Wall rack of datapads (slots with pads standing in them). */
export function datapadRack(frame, u, v, opts = {}) {
  const { n = 5, n0 = 0.08, accentKey = "emitBlue" } = opts;
  const w = n * 0.24 + 0.1;
  frame.box("impTrim", u, v, n0 + 0.08, w, 0.5, 0.16, { color: PALETTE.impBlack, texel: 1 });
  frame.box("impMetal", u, v - 0.2, n0 + 0.13, w - 0.06, 0.06, 0.24, { color: PALETTE.impCharcoal });
  for (let k = 0; k < n; k++) {
    const pu = u - w / 2 + 0.17 + k * 0.24;
    frame.box("impTrim", pu, v + 0.02, n0 + 0.2, 0.19, 0.27, 0.016, { color: PALETTE.impBlack });
    frame.screen("scrBlue0", pu, v + 0.04, n0 + 0.209, 0.15, 0.19);
    frame.box(k % 2 ? accentKey : "emitWhite", pu + 0.06, v - 0.09, n0 + 0.209, 0.015, 0.015, 0.004);
  }
  frame.decal(IMP_DECAL.glyphs1, u, v + 0.34, n0 + 0.002, 0.2);
  frame.collider(u - w / 2, u + w / 2, v - 0.3, v + 0.3, n0, n0 + 0.3, "rack");
}
