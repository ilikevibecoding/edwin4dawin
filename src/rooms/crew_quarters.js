// Crew Quarters (Deck C): an enlisted barracks. Triple bunk stacks line the far (W) wall and both side
// walls up to the door zone and stand back-to-back in three centre rows (the nearest 10 m from the spawn),
// so the berths are the first thing seen from the door; each stack has reading lamps, shelves, part-drawn
// curtains and a footlocker under a lit black soffit. The door zone keeps the common life: two mess tables
// at the frame edges, grey locker banks on the door wall behind the spawn, a refresher alcove with sinks and
// mirrors, a duty roster board (animated scan line) and a holo game table tucked into the recreation corner.
// Grey-blue accent: warm white soffit keys over the bunks, cool key at the door, blue night strips.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL, impDecalRect } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, longTable, lockerBank, hoodLamp, cameraHousing, cableRun, helmet, boots, floorGrate, floorStripe, wallSign, statusUnit, keyLight } from "./deck_c_kit.js";

const BUNK_L = 2.05;
const BUNK_W = 0.9;
const SHELF_Y = [0.33, 0.99, 1.65];
const STACK_H = 2.35;

function bunkFrameGeo() {
  const blk = PALETTE.impBlack;
  const chr = PALETTE.impCharcoal;
  const grey = PALETTE.impGreyDark;
  const parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(B(0.06, STACK_H, 0.06, [sx * 1.0, STACK_H / 2, sz * 0.42], blk));
  for (const y of SHELF_Y) {
    parts.push(B(BUNK_L, 0.05, BUNK_W, [0, y, 0], grey));
    parts.push(B(BUNK_L, 0.08, 0.03, [0, y + 0.05, 0.44], chr));
    parts.push(C(0.012, 2.0, [0, y + 0.66, 0.47], grey, "x", 6));
    parts.push(B(0.03, 0.08, 0.06, [-0.98, y + 0.62, 0.44], grey));
    parts.push(B(0.03, 0.08, 0.06, [0.98, y + 0.62, 0.44], grey));
  }
  // top rails, back board (privacy / lamp mounting), ladder at the +x (foot) end
  parts.push(B(BUNK_L, 0.06, 0.06, [0, STACK_H - 0.03, 0.42], blk));
  parts.push(B(BUNK_L, 0.06, 0.06, [0, STACK_H - 0.03, -0.42], blk));
  parts.push(B(BUNK_L - 0.1, STACK_H - 0.4, 0.03, [0, STACK_H / 2, -0.43], chr));
  for (const z of [-0.2, 0.2]) parts.push(B(0.03, 2.2, 0.03, [1.07, 1.1, z], grey));
  for (let i = 0; i < 7; i++) parts.push(B(0.03, 0.03, 0.43, [1.07, 0.3 + i * 0.3, 0], grey));
  return compound(parts, 1);
}
function bunkSoftGeo() {
  const parts = [];
  for (const y of SHELF_Y) {
    const top = y + 0.025;
    parts.push(B(1.95, 0.1, 0.82, [0, top + 0.05, 0], 0x5c6068));
    parts.push(B(0.42, 0.09, 0.3, [-0.7, top + 0.145, -0.05], 0xc8ccd4));
    parts.push(B(1.1, 0.03, 0.84, [0.35, top + 0.115, 0], DECK_C.fabricBlue));
  }
  return compound(parts, 2);
}

/**
 * One triple bunk stack at (x, z) with yaw (local +z = open front, pillow end at local -x, ladder at +x):
 * instanced frame + bedding, reading lamps and shelves on the back board, part-drawn curtains, a
 * stencilled footlocker under the bottom berth. Returns the Placer.
 */
function bunkStack(kit, rand, x, z, yaw, opts = {}) {
  const { accentKey = "emitBlue", number = 0 } = opts;
  const p = new Placer(kit, x, 0, z, yaw);
  kit.instance("cq_bunk_frame", "impTrim", bunkFrameGeo, p.matrix(), 0xffffff);
  kit.instance("cq_bunk_soft", "fabric", bunkSoftGeo, p.matrix(), 0xffffff);
  const headX = -0.7;
  for (const [k, y] of SHELF_Y.entries()) {
    // reading lamp over the pillow (dim white, a few switched off), personal shelf with a datapad / mug
    p.box("impTrim", headX, y + 0.5, -0.38, 0.14, 0.06, 0.07, { color: PALETTE.impBlack });
    p.box(rand() < 0.7 ? "emitWhiteDim" : "impGloss", headX, y + 0.48, -0.34, 0.08, 0.02, 0.012, { uv: "keep" });
    p.box("impMetal", headX + 0.42, y + 0.42, -0.36, 0.3, 0.02, 0.1, { color: PALETTE.impGreyDark });
    if (rand() < 0.5) p.box("impGloss", headX + 0.42, y + 0.44, -0.36, 0.14, 0.012, 0.08);
    else p.cyl("impMetal", headX + 0.42, y + 0.47, -0.36, 0.03, 0.08, "y", { color: PALETTE.impGrey, segments: 8 });
    if (rand() < 0.55) {
      const cw = 0.35 + rand() * 0.7;
      const cx = (rand() < 0.5 ? -1 : 1) * (1.0 - cw / 2);
      p.box("fabric", cx, y + 0.36, 0.49, cw, 0.56, 0.02, { color: rand() < 0.3 ? DECK_C.fabricBlue : DECK_C.fabricDark, uv: "world", texel: 2 });
    }
    // berth number tag on the front rail (bottom berth only carries the stack number)
    if (k === 0) p.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][number % 3], 0.9, y + 0.09, 0.46, 0.09);
  }
  const fx = 0.7;
  p.box("impPanel1", fx, 0.14, 0.15, 0.62, 0.27, 0.5, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  p.box("impTrim", fx, 0.14, 0.15, 0.64, 0.05, 0.52, { color: PALETTE.impBlack });
  p.box("impTrim", fx, 0.02, 0.15, 0.64, 0.04, 0.52, { color: PALETTE.impBlack });
  p.box("impTrim", fx, 0.26, 0.15, 0.64, 0.04, 0.52, { color: PALETTE.impBlack });
  p.box("impMetal", fx, 0.16, 0.41, 0.1, 0.03, 0.02, { color: DECK_C.steel });
  p.decal([IMP_DECAL.glyphs1, IMP_DECAL.glyphs2, IMP_DECAL.glyphs3][number % 3], fx - 0.18, 0.15, 0.412, 0.12);
  p.collider(-1.08, 0, -0.5, 1.12, STACK_H + 0.05, 0.52, "bunk");
  return p;
}

/** Lit soffit over a row of stacks: black channel with a dim louvred slot, blue night strip on the deck below the fronts. */
function rowSoffit(kit, p, len, opts = {}) {
  const { accentKey = "emitBlue", depth = 1.3, y = STACK_H + 0.25 } = opts;
  // p: Placer at the row's centre on the wall line, local +z toward the open side, local x along the row
  p.box("impTrim", 0, y, depth / 2, len, 0.22, depth, { color: PALETTE.impBlack, texel: 1 });
  p.box("impMetal", 0, y - 0.12, depth - 0.25, len - 0.3, 0.02, 0.24, { color: PALETTE.impCharcoal });
  p.box("emitWhiteDim", 0, y - 0.125, depth - 0.25, len - 0.5, 0.012, 0.12, { uv: "keep" });
  for (let u = -len / 2 + 0.4; u < len / 2 - 0.3; u += 0.3) p.box("impTrim", u, y - 0.14, depth - 0.25, 0.02, 0.02, 0.2, { color: PALETTE.impBlack });
  p.box(accentKey, 0, y - 0.1, depth + 0.006, len - 0.4, 0.03, 0.012);
  p.box("impTrim", 0, 0.012, depth + 0.1, len, 0.024, 0.12, { color: PALETTE.impBlack });
  p.box(accentKey, 0, 0.026, depth + 0.1, len - 0.2, 0.012, 0.04);
}

/** Ventilation column (crew-deck variant of the structural pillar): charcoal duct, black bands, grille, status lamp. */
function ductColumn(kit, x, z, h, accentKey) {
  kit.cyl("impMetal", x, h / 2, z, 0.34, h, "y", { color: PALETTE.impCharcoal, segments: 18, texel: 1 });
  kit.cyl("impTrim", x, 0.25, z, 0.42, 0.5, "y", { color: PALETTE.impBlack, segments: 18 });
  kit.cyl("impTrim", x, h - 0.25, z, 0.42, 0.5, "y", { color: PALETTE.impBlack, segments: 18 });
  for (const y of [1.2, 2.2]) kit.cyl("impTrim", x, y, z, 0.36, 0.08, "y", { color: PALETTE.impBlack, segments: 18 });
  // grille band with fins
  kit.cyl("impTrim", x, 1.7, z, 0.35, 0.8, "y", { color: PALETTE.impBlack, segments: 18 });
  for (let k = 0; k < 8; k++) kit.cyl("impMetal", x, 1.38 + k * 0.09, z, 0.365, 0.02, "y", { color: PALETTE.impGreyDark, segments: 18 });
  kit.box("impTrim", x, 2.6, z + 0.33, 0.24, 0.3, 0.08, { color: PALETTE.impBlack });
  kit.box(accentKey, x, 2.66, z + 0.372, 0.12, 0.03, 0.01);
  kit.box("emitRedImp", x, 2.55, z + 0.372, 0.04, 0.03, 0.01);
  kit.add("decalImp", new THREE.PlaneGeometry(0.26, 0.26), { pos: [x, 0.9, z + 0.352], uv: "keep", uvRect: impDecalRect(IMP_DECAL.glyphs1) });
  kit.collider([x - 0.42, 0, z - 0.42], [x + 0.42, h, z + 0.42], "column");
}

export function buildCrewQuarters(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const rand = rng(4101);
  // wall variant: narrow 1.25 m grey panels split by a dado band, no bare wall light slots
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 4101,
    accentKey,
    wall: { panelW: 1.25, bands: [1.3], features: { vent: 0.07, equipment: 0.03, conduit: 0.05, light: 0, screen: 0.03 }, altChance: 0.3, panelColor: PALETTE.impGrey, panelColorAlt: PALETTE.impWhite },
    walls: { E: { panelW: 1.7, bands: null, features: { vent: 0.1, equipment: 0.08, conduit: 0.06, light: 0, screen: 0.06 } } },
    floor: { laneW: 2.4 },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 4.0 },
  });
  const N = walls.N.frame; // u = x + hx
  const S = walls.S.frame; // u = hx - x
  const E = walls.E.frame; // u = z + hz
  const W = walls.W.frame; // u = hz - z

  // ---------------------------------------------------------------- barracks: wall rows (far wall + both side walls up to the door zone)
  let stackNo = 0;
  // far wall: eight stacks facing the door
  const wRowZ = [];
  for (let k = 0; k < 8; k++) wRowZ.push(-8.575 + k * 2.45);
  for (const z of wRowZ) bunkStack(kit, rand, -hx + 0.2 + BUNK_W / 2, z, Math.PI / 2, { accentKey, number: stackNo++ });
  rowSoffit(kit, new Placer(kit, -hx + 0.02, 0, 0, Math.PI / 2), 20.4, { accentKey });
  // side walls: nine stacks each from the far corner to x ≈ 6 (inside the door's 54° half-view), fronts toward the centre
  const sideX = [];
  for (let k = 0; k < 9; k++) sideX.push(-13.8 + k * 2.45);
  const sideMid = (sideX[0] + sideX[sideX.length - 1]) / 2;
  for (const s of [-1, 1]) {
    for (const x of sideX) bunkStack(kit, rand, x, s * (hz - 0.2 - BUNK_W / 2), s < 0 ? 0 : Math.PI, { accentKey, number: stackNo++ });
    rowSoffit(kit, new Placer(kit, sideMid, 0, s * (hz - 0.02), s < 0 ? 0 : Math.PI), sideX.length * 2.45, { accentKey });
    // boots left in the side aisles
    boots(kit, sideX[1] + 0.9, s * (hz - 1.6), (s < 0 ? 0 : Math.PI) + (rand() - 0.5));
    boots(kit, sideX[6] + 1.0, s * (hz - 1.55), (s < 0 ? 0 : Math.PI) + (rand() - 0.5));
  }
  // ---------------------------------------------------------------- barracks: three back-to-back centre rows per side of the aisle
  // (the east-facing fronts of the x0 + 0.5 stacks are seen face-on from the door; row 1 is 10 m from the spawn)
  const rowX = [-10.5, -3.5, 3.5];
  for (const [ri, x0] of rowX.entries()) {
    for (const s of [-1, 1]) {
      const zc = [s * 4.65, s * 7.1];
      for (const z of zc) {
        bunkStack(kit, rand, x0 + 0.5, z, Math.PI / 2, { accentKey, number: stackNo++ });
        bunkStack(kit, rand, x0 - 0.5, z, -Math.PI / 2, { accentKey, number: stackNo++ });
      }
      const zm = s * 5.875;
      const len = 5.3;
      // shared spine between the two stacks, canopy beam with two lit soffits, bay number header
      kit.box("impTrim", x0, STACK_H / 2, zm, 0.1, STACK_H, len, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impTrim", x0, STACK_H + 0.25, zm, 2.4, 0.22, len + 0.3, { color: PALETTE.impBlack, texel: 1 });
      for (const e of [-1, 1]) {
        kit.box("impMetal", x0 + e * 1.0, STACK_H + 0.13, zm, 0.24, 0.02, len - 0.3, { color: PALETTE.impCharcoal });
        kit.box("emitWhiteDim", x0 + e * 1.0, STACK_H + 0.125, zm, 0.12, 0.012, len - 0.5, { uv: "keep" });
        for (let f = -len / 2 + 0.4; f < len / 2 - 0.3; f += 0.3) kit.box("impTrim", x0 + e * 1.0, STACK_H + 0.11, zm + f, 0.2, 0.02, 0.02, { color: PALETTE.impBlack });
        kit.box(accentKey, x0 + e * 1.206, STACK_H + 0.15, zm, 0.012, 0.03, len - 0.4);
        // night strip on the deck in front of each front
        kit.box("impTrim", x0 + e * 1.3, 0.012, zm, 0.12, 0.024, len, { color: PALETTE.impBlack });
        kit.box(accentKey, x0 + e * 1.3, 0.026, zm, 0.04, 0.012, len - 0.2);
      }
      // header plate on the aisle end of the spine: bay number + occupied indicator
      const hp = new Placer(kit, x0, 0, zm - s * (len / 2 + 0.16), s < 0 ? 0 : Math.PI);
      hp.box("impTrim", 0, STACK_H - 0.3, 0, 1.2, 0.5, 0.1, { color: PALETTE.impBlack, texel: 1 });
      hp.box("impMetal", 0, STACK_H - 0.3, 0.052, 1.0, 0.36, 0.01, { color: PALETTE.impCharcoal });
      hp.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03, IMP_DECAL.glyphs2][(ri * 2 + (s < 0 ? 0 : 1)) % 4], -0.3, STACK_H - 0.3, 0.06, 0.3);
      hp.box(rand() < 0.7 ? "emitGreen" : "emitRedImp", 0.3, STACK_H - 0.22, 0.06, 0.08, 0.05, 0.01);
      hp.box(accentKey, 0.3, STACK_H - 0.38, 0.06, 0.3, 0.02, 0.01);
      kit.collider([x0 - 0.06, 0, zm - len / 2 - 0.2], [x0 + 0.06, STACK_H, zm + len / 2 + 0.2], "spine");
    }
  }
  // far-wall signage above the bunks: cog roundel over the aisle, glyph strips, cable run
  wallSign(W, hz, 2.95, IMP_DECAL.cog, 0.5, accentKey);
  W.decal(IMP_DECAL.glyphs2, hz - 1.4, 2.95, 0.03, 0.34);
  W.decal(IMP_DECAL.glyphs1, hz + 1.4, 2.95, 0.03, 0.34);
  cableRun(W, 1.0, hz - 3.0, 3.05, { n: 3, seed: 9, accentKey });
  cableRun(N, 0.6, hx - 3.0, 3.05, { n: 2, seed: 10, accentKey });
  // floor lane arrows from the door toward the barracks
  for (let x = 13; x > -14; x -= 6) floorStripe(kit, x, 0.3, x - 1.4, 0.3, 0.16, "chevronY");

  // ---------------------------------------------------------------- door zone (east 5 m): mess tables at the frame edges, lockers on the door wall
  // Tables run along z beside the door so only their near ends show in the lower corners of the spawn view.
  for (const s of [-1, 1]) longTable(kit, 11.5, s * 5.9, 5.0, Math.PI / 2, { accentKey, items: 5, seed: 11 + s, topColor: PALETTE.impGrey });
  // ventilation columns flank the cross aisle between rows 2 and 3
  ductColumn(kit, 0.0, -2.7, h, accentKey);
  ductColumn(kit, 0.0, 2.7, h, accentKey);
  // locker banks flank the door on the E wall (behind the spawn), grey doors, a bench + helmet in front of each
  for (const s of [-1, 1]) {
    const zb = s * 4.8;
    lockerBank(kit, hx - 0.12 - 0.275, zb, -Math.PI / 2, 6, { accentKey, seed: s < 0 ? 21 : 22, color: PALETTE.impGreyDark });
    const bx = hx - 1.3;
    kit.box("impTrim", bx, 0.22, zb, 0.4, 0.06, 3.0, { color: PALETTE.impBlack, texel: 1 });
    kit.box("rubber", bx, 0.27, zb, 0.36, 0.05, 2.9, { color: PALETTE.impGreyDark });
    for (const e of [-1, 1]) kit.box("impTrim", bx, 0.1, zb + e * 1.3, 0.34, 0.2, 0.08, { color: PALETTE.impBlack });
    kit.collider([bx - 0.22, 0, zb - 1.5], [bx + 0.22, 0.32, zb + 1.5], "bench");
    helmet(kit, bx, 0.295, zb + s * 0.9, -Math.PI / 2 + (s < 0 ? 0.4 : -0.3));
  }

  // ---------------------------------------------------------------- refresher alcove (N wall, east end)
  {
    const x0 = 7.6;
    const x1 = hx - 0.6;
    const zw = -hz;
    kit.box("impPanel1", x0, 1.2, zw + 1.75, 0.12, 2.4, 3.3, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    kit.box("impTrim", x0, 2.46, zw + 1.75, 0.18, 0.12, 3.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", x0, 0.06, zw + 1.75, 0.18, 0.12, 3.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", x0, 1.25, zw + 3.45, 0.18, 2.5, 0.18, { color: PALETTE.impBlack, texel: 1 });
    kit.box(accentKey, x0, 1.25, zw + 3.545, 0.03, 1.8, 0.012);
    kit.collider([x0 - 0.09, 0, zw], [x0 + 0.09, 2.5, zw + 3.55], "partition");
    const sp = new Placer(kit, x0, 0, zw + 1.75, 0);
    sp.decal(IMP_DECAL.glyphs3, 0.07, 1.9, 0.9, 0.34, "+x");
    const cx = (x0 + x1) / 2 + 0.3;
    const cl = x1 - x0 - 0.9;
    kit.box("impTrim", cx, 0.4, zw + 0.42, cl, 0.8, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impPanel1", cx, 0.45, zw + 0.68, cl - 0.1, 0.62, 0.02, { color: PALETTE.impGrey, uv: "world", texel: 1 });
    kit.box("impMetal", cx, 0.84, zw + 0.45, cl + 0.04, 0.08, 0.6, { color: PALETTE.impGrey, texel: 1 });
    kit.box("impMetal", cx, 0.885, zw + 0.45, cl, 0.01, 0.56, { color: DECK_C.steel, texel: 1 });
    kit.box(accentKey, cx, 0.1, zw + 0.68, cl - 0.4, 0.02, 0.01);
    kit.collider([cx - cl / 2, 0, zw], [cx + cl / 2, 0.9, zw + 0.75], "counter");
    const nS = 4;
    for (let i = 0; i < nS; i++) {
      const x = cx - cl / 2 + ((i + 0.5) / nS) * cl;
      kit.box("impGloss", x, 0.891, zw + 0.5, 0.42, 0.012, 0.3);
      kit.box("impMetal", x, 0.9, zw + 0.5, 0.36, 0.006, 0.24, { color: PALETTE.impCharcoal });
      kit.cyl("impMetal", x, 1.02, zw + 0.3, 0.014, 0.26, "y", { color: DECK_C.steel, segments: 8 });
      kit.cyl("impMetal", x, 1.14, zw + 0.4, 0.012, 0.22, "z", { color: DECK_C.steel, segments: 8 });
      kit.box("impMetal", x, 0.93, zw + 0.3, 0.1, 0.05, 0.08, { color: PALETTE.impGreyDark });
      kit.box("impTrim", x, 1.7, zw + 0.13, 0.62, 0.86, 0.06, { color: PALETTE.impBlack });
      kit.box("impGloss", x, 1.7, zw + 0.165, 0.52, 0.76, 0.01);
      // mirror lamp: black hood with a dim louvred slot (no bare emitter)
      kit.box("impTrim", x, 2.24, zw + 0.14, 0.62, 0.12, 0.14, { color: PALETTE.impBlack });
      kit.box("emitWhiteDim", x, 2.19, zw + 0.16, 0.5, 0.03, 0.06, { uv: "keep" });
      if (i < nS - 1) kit.box("impPanel1", x + cl / nS / 2, 1.35, zw + 0.16, 0.1, 0.18, 0.1, { color: PALETTE.impWhite, uv: "world", texel: 2 });
      kit.box("impTrim", x + 0.3, 0.45, zw + 0.69, 0.02, 0.6, 0.012, { color: PALETTE.impBlack });
      kit.box("impMetal", x - 0.1, 0.62, zw + 0.7, 0.14, 0.02, 0.02, { color: DECK_C.steel });
    }
    kit.cyl("impMetal", x0 + 0.1, 1.1, zw + 1.2, 0.012, 1.2, "z", { color: DECK_C.steel, segments: 8 });
    for (const dz of [0.7, 1.2, 1.6]) kit.box("fabric", x0 + 0.1, 0.85, zw + dz, 0.03, 0.5, 0.22, { color: dz > 1 ? DECK_C.fabricGrey : PALETTE.impWhite, uv: "world", texel: 2 });
    floorGrate(kit, cx - 0.5, zw + 0.8, cx + 0.5, zw + 1.6);
    kit.cyl("impMetal", x1 - 0.6, 0.3, zw + 1.4, 0.16, 0.6, "y", { color: PALETTE.impGreyDark, segments: 14 });
    kit.cyl("impTrim", x1 - 0.6, 0.61, zw + 1.4, 0.17, 0.03, "y", { color: PALETTE.impBlack, segments: 14 });
    kit.collider([x1 - 0.78, 0, zw + 1.22], [x1 - 0.42, 0.65, zw + 1.58], "bin");
    cableRun(N, x0 + hx + 0.3, x1 + hx, 2.75, { n: 2, seed: 8, accentKey });
  }

  // ---------------------------------------------------------------- S wall east: roster board, podium, bench, kit shelf
  {
    const zw = hz;
    const bx = 8.6;
    const bu = hx - bx;
    S.box("impTrim", bu, 1.8, 0.1, 2.5, 1.5, 0.2, { color: PALETTE.impBlack, texel: 1 });
    S.box("impGloss", bu, 1.8, 0.21, 2.3, 1.3, 0.02);
    S.screen("scrWhite2", bu, 1.8, 0.225, 2.2, 1.2);
    S.box(accentKey, bu, 2.6, 0.21, 2.2, 0.04, 0.02);
    S.decal(IMP_DECAL.glyphs2, bu - 1.0, 1.02, 0.21, 0.3);
    S.decal(IMP_DECAL.glyphs1, bu + 1.0, 1.02, 0.21, 0.24);
    S.collider(bu - 1.3, bu + 1.3, 0, 2.7, 0, 0.23, "roster");
    const scan = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.025, 0.01), ctx.materials.emitWhite);
    scan.position.set(bx, 1.8, zw - 0.235);
    kit.attach(scan);
    let scanT = 0;
    kit.onUpdate((dt) => {
      scanT = (scanT + dt * 0.18) % 1;
      scan.position.y = 1.22 + scanT * 1.16;
    });
    kit.box("impTrim", bx, 0.5, zw - 1.0, 0.16, 1.0, 0.16, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", bx, 0.04, zw - 1.0, 0.5, 0.08, 0.5, { color: PALETTE.impCharcoal });
    kit.add("impGloss", new THREE.BoxGeometry(0.5, 0.04, 0.36), { pos: [bx, 1.03, zw - 1.05], rot: [-0.5, 0, 0] });
    kit.add("scrBlue3", new THREE.PlaneGeometry(0.42, 0.28).rotateX(-Math.PI / 2 - 0.5), { pos: [bx, 1.054, zw - 1.062], uv: "keep" });
    kit.collider([bx - 0.25, 0, zw - 1.25], [bx + 0.25, 1.1, zw - 0.75], "podium");
    kit.box("impTrim", 11.8, 0.22, zw - 0.6, 2.4, 0.06, 0.4, { color: PALETTE.impBlack, texel: 1 });
    kit.box("rubber", 11.8, 0.27, zw - 0.6, 2.3, 0.05, 0.36, { color: PALETTE.impGreyDark });
    for (const e of [-1, 1]) kit.box("impTrim", 11.8 + e * 1.05, 0.1, zw - 0.6, 0.08, 0.2, 0.34, { color: PALETTE.impBlack });
    kit.collider([10.6, 0, zw - 0.82], [13.0, 0.32, zw - 0.38], "bench");
    const sx = 14.9;
    kit.box("impMetal", sx, 1.25, zw - 0.3, 2.4, 0.04, 0.4, { color: PALETTE.impGreyDark, texel: 1 });
    kit.box("impTrim", sx, 1.23, zw - 0.11, 2.4, 0.08, 0.04, { color: PALETTE.impBlack });
    for (const e of [-1, 1]) kit.box("impTrim", sx + e * 1.1, 1.05, zw - 0.3, 0.06, 0.4, 0.36, { color: PALETTE.impBlack });
    helmet(kit, sx - 0.7, 1.27, zw - 0.3, Math.PI + 0.3);
    helmet(kit, sx + 0.1, 1.27, zw - 0.3, Math.PI - 0.2);
    kit.box("impGloss", sx + 0.8, 1.28, zw - 0.3, 0.22, 0.015, 0.16);
    kit.cyl("impMetal", sx, 1.75, zw - 0.16, 0.012, 2.2, "x", { color: DECK_C.steel, segments: 8 });
    for (const dx of [-0.9, -0.45, 0.2, 0.75]) {
      kit.box("impMetal", sx + dx, 1.75, zw - 0.1, 0.04, 0.04, 0.12, { color: PALETTE.impGreyDark });
      if (dx > -0.9) kit.box("fabric", sx + dx, 1.35, zw - 0.2, 0.36, 0.76, 0.1, { color: dx < 0.5 ? PALETTE.impBlack : DECK_C.fabricDark, uv: "world", texel: 2 });
    }
    boots(kit, sx - 0.5, zw - 0.45, Math.PI + 0.2);
    boots(kit, sx + 0.6, zw - 0.5, Math.PI - 0.4);
    kit.collider([sx - 1.25, 0, zw - 0.55], [sx + 1.25, 1.3, zw], "shelf");
    hoodLamp(S, hx - sx, 2.5, "emitWhiteDim", 1.2);
  }

  // ---------------------------------------------------------------- holo game table in the recreation corner (SE, out of the door sightline)
  {
    const gx = 12.6;
    const gz = 8.3;
    kit.cyl("impTrim", gx, 0.36, gz, 0.22, 0.72, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.cyl("impMetal", gx, 0.04, gz, 0.55, 0.08, "y", { color: PALETTE.impCharcoal, segments: 18 });
    kit.cyl("impTrim", gx, 0.76, gz, 0.62, 0.08, "y", { color: PALETTE.impBlack, segments: 18 });
    kit.cyl("impGloss", gx, 0.805, gz, 0.5, 0.01, "y", { segments: 18 });
    kit.add("impMetal", new THREE.TorusGeometry(0.58, 0.02, 8, 24).rotateX(Math.PI / 2), { pos: [gx, 0.81, gz], color: PALETTE.impGrey, uv: "scale", uvScale: [4, 0.5] });
    kit.add(accentKey, new THREE.TorusGeometry(0.53, 0.008, 6, 24).rotateX(Math.PI / 2), { pos: [gx, 0.812, gz] });
    kit.collider([gx - 0.62, 0, gz - 0.62], [gx + 0.62, 0.85, gz + 0.62], "gametable");
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      const sx = gx + Math.cos(a) * 1.1;
      const sz = gz + Math.sin(a) * 1.1;
      kit.cyl("impMetal", sx, 0.22, sz, 0.05, 0.44, "y", { color: PALETTE.impCharcoal });
      kit.cyl("impTrim", sx, 0.02, sz, 0.2, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
      kit.cyl("rubber", sx, 0.47, sz, 0.2, 0.07, "y", { color: PALETTE.impGreyDark, segments: 14 });
      kit.collider([sx - 0.2, 0, sz - 0.2], [sx + 0.2, 0.55, sz + 0.2], "stool");
    }
    const pieces = [];
    const prand = rng(77);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const r = 0.12 + prand() * 0.3;
      const hgt = 0.12 + prand() * 0.16;
      const g = k % 2 ? new THREE.ConeGeometry(0.035, hgt, 6) : new THREE.CylinderGeometry(0.03, 0.045, hgt, 6);
      g.translate(Math.cos(a) * r, hgt / 2 + 0.005, Math.sin(a) * r);
      pieces.push(g);
    }
    const holoMat = ctx.materials.holo.clone();
    holoMat.color.set(0x6fb0ff);
    holoMat.opacity = 0.4;
    const board = new THREE.Mesh(mergeGeometries(pieces, false), holoMat);
    board.position.set(gx, 0.81, gz);
    kit.attach(board);
    kit.onUpdate((dt) => {
      board.rotation.y += dt * 0.35;
    });
  }

  // ---------------------------------------------------------------- E wall (door wall): intercom, emergency cabinet, water dispenser, gear
  {
    statusUnit(E, hz - 7.6, 1.6, { screen: "scrWhite2", accentKey });
    E.box("impTrim", hz - 2.6, 1.4, 0.08, 0.5, 0.7, 0.16, { color: PALETTE.impBlack, texel: 1 });
    E.box("impPanel1", hz - 2.6, 1.4, 0.165, 0.42, 0.6, 0.01, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    E.decal(IMP_DECAL.medical, hz - 2.6, 1.45, 0.172, 0.28);
    E.box("emitRedImp", hz - 2.6, 1.08, 0.172, 0.2, 0.02, 0.008);
    E.collider(hz - 2.9, hz - 2.3, 0, 1.8, 0, 0.18, "cabinet");
    wallSign(E, hz - 1.9, 2.4, IMP_DECAL.arrowRight, 0.36, accentKey);
    wallSign(E, hz + 1.9, 2.4, IMP_DECAL.glyphs1, 0.36, accentKey);
    impWallGear(E, hz + 10.0, 1.5, { seed: 31, accentKey });
    // water dispenser: tank, tap, drip tray (faces -x into the room)
    const dx = hx - 0.45;
    const dz = 7.8;
    kit.box("impTrim", dx, 0.6, dz, 0.5, 1.2, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impPanel1", dx - 0.26, 0.62, dz, 0.02, 1.0, 0.42, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    kit.cyl("impMetal", dx, 1.5, dz, 0.2, 0.6, "y", { color: PALETTE.impGrey, segments: 16 });
    kit.cyl("impTrim", dx, 1.82, dz, 0.21, 0.04, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.box("impMetal", dx - 0.3, 1.0, dz, 0.12, 0.04, 0.04, { color: DECK_C.steel });
    kit.box("impMetal", dx - 0.3, 0.72, dz, 0.14, 0.03, 0.3, { color: PALETTE.impGreyDark });
    kit.box(accentKey, dx - 0.272, 1.1, dz + 0.12, 0.01, 0.03, 0.03);
    kit.collider([dx - 0.32, 0, dz - 0.3], [hx, 1.9, dz + 0.3], "dispenser");
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, -hz + 0.3, Math.PI * 0.75);
  cameraHousing(kit, -hx + 0.3, h - 0.55, hz - 0.3, -Math.PI * 0.25);

  // ---------------------------------------------------------------- ceiling: air scrubber grille with a turning fan over the common area
  {
    const fx = 6.0;
    const fz = 0;
    kit.box("impTrim", fx, h - 0.09, fz, 1.5, 0.18, 1.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", fx, h - 0.19, fz, 1.3, 0.02, 1.3, { color: PALETTE.impCharcoal });
    for (let s = -0.55; s <= 0.55; s += 0.11) kit.box("impMetal", fx, h - 0.21, fz + s, 1.3, 0.02, 0.03, { color: PALETTE.impGreyDark });
    const blades = [C(0.06, 0.06, [0, 0, 0], PALETTE.impGreyDark, "y", 10)];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      blades.push(B(0.5, 0.02, 0.12, [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], PALETTE.impGrey, [0.5, -a, 0, "YXZ"]));
    }
    const fan = new THREE.Mesh(compound(blades, 2), ctx.materials.impMetalRough);
    fan.position.set(fx, h - 0.17, fz);
    kit.attach(fan);
    kit.onUpdate((dt) => {
      fan.rotation.y += dt * 2.4;
    });
  }

  // ---------------------------------------------------------------- lights (8): six warm barracks keys, one warm far-wall key, one cool door key
  // Keys hang 0.7 m under the ceiling, 2 m east of the fronts they light, so the berths facing the door are lit
  // face-on rather than grazed; the door key sits behind the spawn so its ceiling highlight stays out of frame.
  const warm = 0xf6ead6;
  const ky = h - 0.7;
  keyLight(kit, 5.6, ky, -5.9, { color: warm, k: 4.6, distance: 14, priority: 0.5 });
  keyLight(kit, 5.6, ky, 5.9, { color: warm, k: 4.6, distance: 14, priority: 0.49 });
  keyLight(kit, -1.4, ky, -5.9, { color: warm, k: 4.2, distance: 14, priority: 0.48 });
  keyLight(kit, -1.4, ky, 5.9, { color: warm, k: 4.2, distance: 14, priority: 0.47 });
  keyLight(kit, -8.4, ky, -5.9, { color: warm, k: 3.8, distance: 13, priority: 0.46 });
  keyLight(kit, -8.4, ky, 5.9, { color: warm, k: 3.8, distance: 13, priority: 0.45 });
  keyLight(kit, -14.6, ky, 0, { color: warm, k: 4.4, distance: 15, priority: 0.44 });
  keyLight(kit, 13.0, ky, 0, { color: 0xdfe8ff, k: 3.6, distance: 14, priority: 0.43 });
}
