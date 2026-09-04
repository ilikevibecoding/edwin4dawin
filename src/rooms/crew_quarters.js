// Crew Quarters (Deck C): six bunk bays with triple-stacked bunks along the long walls, footlockers,
// curtain rails and reading lights; a common area with two long tables and benches; a refresher alcove
// with sinks and mirrors; locker banks; a duty roster board (animated scan line); a holo game table.
// Grey-blue accent, muted white keys, blue night strips along the floor.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../materials.js";
import { impRoomShell, impWallGear, impPillar } from "./imperial_kit.js";
import { rng } from "../kit.js";
import { IMP_DECAL } from "../textures_imperial.js";
import { Placer, compound, B, C, DECK_C, longTable, lockerBank, hoodLamp, cameraHousing, cableRun, helmet, boots, floorGrate, floorStripe, wallSign, statusUnit, keyLight } from "./deck_c_kit.js";

const BUNK_L = 2.05;
const BUNK_W = 0.9;
const SHELF_Y = [0.33, 0.99, 1.65];

function bunkFrameGeo() {
  const blk = PALETTE.impBlack;
  const chr = PALETTE.impCharcoal;
  const grey = PALETTE.impGreyDark;
  const parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(B(0.06, 2.35, 0.06, [sx * 1.0, 1.175, sz * 0.42], blk));
  for (const y of SHELF_Y) {
    parts.push(B(BUNK_L, 0.05, BUNK_W, [0, y, 0], grey));
    parts.push(B(BUNK_L, 0.08, 0.03, [0, y + 0.05, 0.44], chr));
    parts.push(C(0.012, 2.0, [0, y + 0.66, 0.47], grey, "x", 6));
    // rail brackets
    parts.push(B(0.03, 0.08, 0.06, [-0.98, y + 0.62, 0.44], grey));
    parts.push(B(0.03, 0.08, 0.06, [0.98, y + 0.62, 0.44], grey));
  }
  // top rail + ladder at the +x end
  parts.push(B(BUNK_L, 0.06, 0.06, [0, 2.32, 0.42], blk));
  parts.push(B(BUNK_L, 0.06, 0.06, [0, 2.32, -0.42], blk));
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

export function buildCrewQuarters(kit, ctx, room) {
  const [w, h, d] = room.size;
  const hx = w / 2;
  const hz = d / 2;
  const accentKey = ctx.accentKey ? ctx.accentKey(room) : "emitBlue";
  const rand = rng(4101);
  const walls = impRoomShell(kit, room, ctx.doors, {
    seed: 4101,
    accentKey,
    wall: { panelW: 1.6, features: { vent: 0.08, equipment: 0.05, conduit: 0.05, light: 0.1, screen: 0.03 }, altChance: 0.22 },
    walls: {
      N: { features: { vent: 0.05, light: 0.14 }, altChance: 0.3 },
      S: { features: { vent: 0.05, light: 0.14 }, altChance: 0.3 },
    },
    floor: { laneW: 2.4 },
    ceiling: { troughs: 2, troughW: 0.5, beamStep: 4.0 },
  });

  // ---------------------------------------------------------------- bunk bays (3 per long wall)
  const bayW = 4.8;
  const bayDepth = 2.7;
  const bayX0 = -hx + 0.4;
  let bayIndex = 0;
  for (const side of [-1, 1]) {
    const zWall = side * hz;
    const zFront = zWall - side * bayDepth;
    const yaw = side < 0 ? 0 : Math.PI; // bunk fronts (+z local) face the room
    for (let b = 0; b < 3; b++, bayIndex++) {
      const bx = bayX0 + (b + 0.5) * bayW;
      // partitions at both bay edges (the first one doubles as the W-wall return)
      for (const e of [0, 1]) {
        if (b > 0 && e === 0) continue;
        const px = bayX0 + (b + e) * bayW;
        const zc = (zWall + zFront) / 2;
        kit.box("impPanel1", px, 1.3, zc, 0.12, 2.6, bayDepth - 0.2, { color: PALETTE.impGrey, uv: "world", texel: 1 });
        kit.box("impTrim", px, 2.66, zc, 0.18, 0.12, bayDepth, { color: PALETTE.impBlack, texel: 1 });
        kit.box("impTrim", px, 0.06, zc, 0.18, 0.12, bayDepth, { color: PALETTE.impBlack, texel: 1 });
        kit.box("impTrim", px, 1.35, zFront + side * 0.09, 0.18, 2.7, 0.18, { color: PALETTE.impBlack, texel: 1 });
        kit.box(accentKey, px, 1.35, zFront - side * 0.005, 0.03, 1.6, 0.012);
        kit.collider([px - 0.09, 0, Math.min(zWall, zFront)], [px + 0.09, 2.72, Math.max(zWall, zFront)], "partition");
      }
      // header beam with bay number + occupied indicator; a light bar on its underside washes the bay
      kit.box("impTrim", bx, 2.6, zFront + side * 0.1, bayW - 0.18, 0.24, 0.2, { color: PALETTE.impBlack, texel: 1 });
      kit.box("impMetal", bx, 2.6, zFront - side * 0.005, bayW - 0.5, 0.16, 0.01, { color: PALETTE.impCharcoal });
      kit.box("emitWhiteSoft", bx, 2.47, zFront + side * 0.12, bayW - 1.0, 0.02, 0.08, { uv: "keep" });
      const hp = new Placer(kit, bx, 0, zFront, yaw);
      hp.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][b], -1.6, 2.6, 0.012, 0.2);
      hp.decal(IMP_DECAL.glyphs2, 1.6, 2.6, 0.012, 0.2);
      hp.box(bayIndex % 4 === 3 ? "emitRedImp" : accentKey, 0, 2.6, 0.012, 0.6, 0.03, 0.01);
      // recessed ceiling light over the bay (emissive panel between the stacks and the wall)
      kit.box("impTrim", bx, h - 0.06, zWall - side * 1.4, 3.6, 0.12, 0.5, { color: PALETTE.impBlack, texel: 1 });
      kit.box("emitWhiteSoft", bx, h - 0.125, zWall - side * 1.4, 3.3, 0.02, 0.3, { uv: "keep" });
      // two triple stacks per bay
      for (const sx of [-1, 1]) {
        const p = new Placer(kit, bx + sx * 1.15, 0, zWall - side * (0.2 + BUNK_W / 2), yaw);
        // ladder (local +x) at the outer end next to the partition; the pillow end faces the bay centre
        kit.instance("cq_bunk_frame", "impTrim", bunkFrameGeo, p.matrix(0, 0, 0, sx < 0 ? Math.PI : 0), 0xffffff);
        kit.instance("cq_bunk_soft", "fabric", bunkSoftGeo, p.matrix(0, 0, 0, sx < 0 ? Math.PI : 0), 0xffffff);
        const headX = sx < 0 ? 0.7 : -0.7;
        for (const y of SHELF_Y) {
          // reading lamp on the wall above the pillow
          p.box("impTrim", headX, y + 0.5, -0.5, 0.14, 0.06, 0.08, { color: PALETTE.impBlack });
          p.box("emitWhite", headX, y + 0.48, -0.455, 0.08, 0.02, 0.02);
          // personal shelf + a datapad or a mug
          p.box("impMetal", headX - sx * 0.35, y + 0.42, -0.42, 0.3, 0.02, 0.12, { color: PALETTE.impGreyDark });
          if (rand() < 0.5) p.box("impGloss", headX - sx * 0.35, y + 0.44, -0.42, 0.14, 0.012, 0.09);
          else p.cyl("impMetal", headX - sx * 0.35, y + 0.47, -0.42, 0.03, 0.08, "y", { color: PALETTE.impGrey, segments: 8 });
          // curtain: partly drawn on some bunks
          const r = rand();
          if (r < 0.55) {
            const cw = 0.35 + rand() * 0.7;
            const cx = (rand() < 0.5 ? -1 : 1) * (1.0 - cw / 2);
            p.box("fabric", cx, y + 0.36, 0.49, cw, 0.56, 0.02, { color: rand() < 0.3 ? DECK_C.fabricBlue : DECK_C.fabricDark, uv: "world", texel: 2 });
          }
        }
        // footlocker under the bottom bunk at the foot end, stencilled number
        const fx = -headX;
        p.box("impPanel1", fx, 0.14, 0.15, 0.62, 0.27, 0.5, { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
        p.box("impTrim", fx, 0.14, 0.15, 0.64, 0.05, 0.52, { color: PALETTE.impBlack });
        p.box("impTrim", fx, 0.02, 0.15, 0.64, 0.04, 0.52, { color: PALETTE.impBlack });
        p.box("impTrim", fx, 0.26, 0.15, 0.64, 0.04, 0.52, { color: PALETTE.impBlack });
        p.box("impMetal", fx, 0.16, 0.41, 0.1, 0.03, 0.02, { color: DECK_C.steel });
        p.decal([IMP_DECAL.bay01, IMP_DECAL.bay02, IMP_DECAL.bay03][(bayIndex * 2 + (sx > 0 ? 1 : 0)) % 3], fx + 0.18, 0.15, 0.412, 0.12);
        p.collider(-1.08, 0, -0.5, 1.12, 2.4, 0.52, "bunk");
      }
      // boots left in the aisle in front of some bays
      if (b !== 1) boots(kit, bx + (side < 0 ? -1.4 : 1.4), zFront - side * 0.35, yaw + (rand() - 0.5));
    }
    // blue night strip along the bay fronts (floor level)
    kit.boxMM("impTrim", [bayX0, 0.004, zFront - side * 0.08 - 0.06], [bayX0 + 3 * bayW, 0.03, zFront - side * 0.08 + 0.06], { color: PALETTE.impBlack });
    kit.boxMM(accentKey, [bayX0 + 0.1, 0.02, zFront - side * 0.08 - 0.02], [bayX0 + 3 * bayW - 0.1, 0.034, zFront - side * 0.08 + 0.02]);
  }
  // ---------------------------------------------------------------- common area: two long tables
  for (const z of [-4.4, 4.4]) longTable(kit, -9.6, z, 8.0, 0, { accentKey, items: 7, seed: 11 + z });
  // floor lane arrows from the door toward the bays
  for (let x = 13; x > -14; x -= 6) floorStripe(kit, x, 0.3, x - 1.4, 0.3, 0.16, "chevronY");
  // structural pillars flanking the lane in the open half of the room
  impPillar(kit, 4.5, -5.2, h, { w: 0.55, accentKey });
  impPillar(kit, 4.5, 5.2, h, { w: 0.55, accentKey });

  // ---------------------------------------------------------------- lockers (N and S walls east of the bays)
  lockerBank(kit, 1.9, -hz + 0.12 + 0.275, 0, 11, { accentKey, seed: 21 });
  lockerBank(kit, 1.9, hz - 0.12 - 0.275, Math.PI, 11, { accentKey, seed: 22 });
  for (const side of [-1, 1]) {
    // benches in front of the lockers
    const zb = side * (hz - 1.15);
    kit.box("impTrim", 1.9, 0.22, zb, 4.0, 0.06, 0.4, { color: PALETTE.impBlack, texel: 1 });
    kit.box("rubber", 1.9, 0.27, zb, 3.9, 0.05, 0.36, { color: PALETTE.impGreyDark });
    for (const e of [-1, 1]) kit.box("impTrim", 1.9 + e * 1.8, 0.1, zb, 0.08, 0.2, 0.34, { color: PALETTE.impBlack });
    kit.collider([-0.1, 0, zb - 0.22], [3.9, 0.32, zb + 0.22], "bench");
    helmet(kit, side < 0 ? 3.1 : 0.9, 0.295, zb, side < 0 ? 0.4 : Math.PI - 0.3);
    // status unit on the stretch of wall between the lockers and the corner alcoves
    statusUnit(side < 0 ? walls.N.frame : walls.S.frame, side < 0 ? hx + 6.4 : hx - 6.4, 1.6, { screen: side < 0 ? "scrBlue0" : "scrWhite1", accentKey });
  }

  // ---------------------------------------------------------------- refresher alcove (N wall, east end)
  {
    const x0 = 7.6;
    const x1 = hx - 0.6;
    const zw = -hz;
    // privacy partition with a glowing edge and a "refresher" sign
    kit.box("impPanel1", x0, 1.2, zw + 1.75, 0.12, 2.4, 3.3, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    kit.box("impTrim", x0, 2.46, zw + 1.75, 0.18, 0.12, 3.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", x0, 0.06, zw + 1.75, 0.18, 0.12, 3.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impTrim", x0, 1.25, zw + 3.45, 0.18, 2.5, 0.18, { color: PALETTE.impBlack, texel: 1 });
    kit.box(accentKey, x0, 1.25, zw + 3.545, 0.03, 1.8, 0.012);
    kit.collider([x0 - 0.09, 0, zw], [x0 + 0.09, 2.5, zw + 3.55], "partition");
    const sp = new Placer(kit, x0, 0, zw + 1.75, 0);
    sp.decal(IMP_DECAL.glyphs3, 0.07, 1.9, 0.9, 0.34, "+x");
    // counter with four basins, pedestal cabinet, taps, mirrors and light bars
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
      // mirror in a black frame, proud of the wall panels
      kit.box("impTrim", x, 1.7, zw + 0.13, 0.62, 0.86, 0.06, { color: PALETTE.impBlack });
      kit.box("impGloss", x, 1.7, zw + 0.165, 0.52, 0.76, 0.01);
      kit.box("impTrim", x, 2.24, zw + 0.14, 0.62, 0.12, 0.12, { color: PALETTE.impBlack });
      kit.box("emitWhiteSoft", x, 2.2, zw + 0.16, 0.5, 0.04, 0.04, { uv: "keep" });
      // soap dispenser between mirrors
      if (i < nS - 1) kit.box("impPanel1", x + cl / nS / 2, 1.35, zw + 0.16, 0.1, 0.18, 0.1, { color: PALETTE.impWhite, uv: "world", texel: 2 });
      // cabinet door seams and pulls
      kit.box("impTrim", x + 0.3, 0.45, zw + 0.69, 0.02, 0.6, 0.012, { color: PALETTE.impBlack });
      kit.box("impMetal", x - 0.1, 0.62, zw + 0.7, 0.14, 0.02, 0.02, { color: DECK_C.steel });
    }
    // towel rail on the partition, drain grate, waste bin, pipe run under the counter edge
    kit.cyl("impMetal", x0 + 0.1, 1.1, zw + 1.2, 0.012, 1.2, "z", { color: DECK_C.steel, segments: 8 });
    for (const dz of [0.7, 1.2, 1.6]) kit.box("fabric", x0 + 0.1, 0.85, zw + dz, 0.03, 0.5, 0.22, { color: dz > 1 ? DECK_C.fabricGrey : PALETTE.impWhite, uv: "world", texel: 2 });
    floorGrate(kit, cx - 0.5, zw + 0.8, cx + 0.5, zw + 1.6);
    kit.cyl("impMetal", x1 - 0.6, 0.3, zw + 1.4, 0.16, 0.6, "y", { color: PALETTE.impGreyDark, segments: 14 });
    kit.cyl("impTrim", x1 - 0.6, 0.61, zw + 1.4, 0.17, 0.03, "y", { color: PALETTE.impBlack, segments: 14 });
    kit.collider([x1 - 0.78, 0, zw + 1.22], [x1 - 0.42, 0.65, zw + 1.58], "bin");
    cableRun(walls.N.frame, x0 + hx + 0.3, x1 + hx, 2.75, { n: 2, seed: 8, accentKey });
    // cool white key for the alcove
    keyLight(kit, cx, 2.3, zw + 1.6, { color: 0xe8f0ff, k: 1.3, distance: 8, priority: 0.42 });
  }

  // ---------------------------------------------------------------- S wall east: roster board, podium, bench, kit shelf
  {
    const zw = hz;
    const S = walls.S.frame; // U runs E->W (u = hx - x)
    const bx = 8.6;
    const bu = hx - bx;
    S.box("impTrim", bu, 1.8, 0.1, 2.5, 1.5, 0.2, { color: PALETTE.impBlack, texel: 1 });
    S.box("impGloss", bu, 1.8, 0.21, 2.3, 1.3, 0.02);
    S.screen("scrWhite0", bu, 1.8, 0.225, 2.2, 1.2);
    S.box(accentKey, bu, 2.6, 0.21, 2.2, 0.04, 0.02);
    S.decal(IMP_DECAL.glyphs2, bu - 1.0, 1.02, 0.21, 0.3);
    S.decal(IMP_DECAL.cog, bu + 1.0, 1.02, 0.21, 0.24);
    S.collider(bu - 1.3, bu + 1.3, 0, 2.7, 0, 0.23, "roster");
    // animated scan line over the roster (attached mesh, moves along y)
    const scan = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.025, 0.01), ctx.materials.emitWhite);
    scan.position.set(bx, 1.8, zw - 0.235);
    kit.attach(scan);
    let scanT = 0;
    kit.onUpdate((dt) => {
      scanT = (scanT + dt * 0.18) % 1;
      scan.position.y = 1.22 + scanT * 1.16;
    });
    // datapad podium in front of the board
    kit.box("impTrim", bx, 0.5, zw - 1.0, 0.16, 1.0, 0.16, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", bx, 0.04, zw - 1.0, 0.5, 0.08, 0.5, { color: PALETTE.impCharcoal });
    // top slab tilted toward the reader (who stands north of the podium, facing the board)
    kit.add("impGloss", new THREE.BoxGeometry(0.5, 0.04, 0.36), { pos: [bx, 1.03, zw - 1.05], rot: [-0.5, 0, 0] });
    kit.add("scrBlue0", new THREE.PlaneGeometry(0.42, 0.28).rotateX(-Math.PI / 2 - 0.5), { pos: [bx, 1.054, zw - 1.062], uv: "keep" });
    kit.collider([bx - 0.25, 0, zw - 1.25], [bx + 0.25, 1.1, zw - 0.75], "podium");
    // bench beside the board
    kit.box("impTrim", 11.8, 0.22, zw - 0.6, 2.4, 0.06, 0.4, { color: PALETTE.impBlack, texel: 1 });
    kit.box("rubber", 11.8, 0.27, zw - 0.6, 2.3, 0.05, 0.36, { color: PALETTE.impGreyDark });
    for (const e of [-1, 1]) kit.box("impTrim", 11.8 + e * 1.05, 0.1, zw - 0.6, 0.08, 0.2, 0.34, { color: PALETTE.impBlack });
    kit.collider([10.6, 0, zw - 0.82], [13.0, 0.32, zw - 0.38], "bench");
    // equipment shelf: helmets, datapad, hanging jackets, boots below
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
    hoodLamp(S, hx - sx, 2.5, "emitWhiteSoft", 1.2);
  }

  // ---------------------------------------------------------------- holo game table (recreation corner)
  {
    const gx = 9.5;
    const gz = 4.6;
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
    // holo pieces (one additive mesh, slowly turning)
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

  // ---------------------------------------------------------------- W wall: dispenser, gear, signage
  {
    const W = walls.W.frame; // U runs S->N (u = hz - z)
    impWallGear(W, hz + 4.5, 1.5, { seed: 31, accentKey });
    statusUnit(W, hz - 4.5, 1.6, { screen: "scrBlue1", accentKey });
    wallSign(W, hz, 2.6, IMP_DECAL.cog, 0.6, accentKey);
    // water dispenser: tank, tap, drip tray
    const dx = -hx + 0.45;
    kit.box("impTrim", dx, 0.6, 0, 0.5, 1.2, 0.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impPanel1", dx + 0.26, 0.62, 0, 0.02, 1.0, 0.42, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    kit.cyl("impMetal", dx, 1.5, 0, 0.2, 0.6, "y", { color: PALETTE.impGrey, segments: 16 });
    kit.cyl("impTrim", dx, 1.82, 0, 0.21, 0.04, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.box("impMetal", dx + 0.3, 1.0, 0, 0.12, 0.04, 0.04, { color: DECK_C.steel });
    kit.box("impMetal", dx + 0.3, 0.72, 0, 0.14, 0.03, 0.3, { color: PALETTE.impGreyDark });
    kit.box(accentKey, dx + 0.272, 1.1, 0.12, 0.01, 0.03, 0.03);
    kit.collider([-hx, 0, -0.3], [dx + 0.32, 1.9, 0.3], "dispenser");
    cableRun(W, 2, hz - 1.8, 2.75, { n: 3, seed: 9, accentKey });
  }
  // ---------------------------------------------------------------- E wall: intercom, emergency cabinet, cameras
  {
    const E = walls.E.frame; // U runs N->S (u = z + hz)
    statusUnit(E, hz + 2.6, 1.6, { screen: "scrWhite1", accentKey });
    E.box("impTrim", hz - 2.6, 1.4, 0.08, 0.5, 0.7, 0.16, { color: PALETTE.impBlack, texel: 1 });
    E.box("impPanel1", hz - 2.6, 1.4, 0.165, 0.42, 0.6, 0.01, { color: PALETTE.impWhite, uv: "world", texel: 1 });
    E.decal(IMP_DECAL.medical, hz - 2.6, 1.45, 0.172, 0.28);
    E.box("emitRedImp", hz - 2.6, 1.08, 0.172, 0.2, 0.02, 0.008);
    E.collider(hz - 2.9, hz - 2.3, 0, 1.8, 0, 0.18, "cabinet");
    wallSign(E, hz - 1.9, 2.4, IMP_DECAL.arrowRight, 0.36, accentKey);
    wallSign(E, hz + 1.9, 2.4, IMP_DECAL.glyphs1, 0.36, accentKey);
  }
  cameraHousing(kit, hx - 0.3, h - 0.55, -hz + 0.3, Math.PI * 0.75);
  cameraHousing(kit, -hx + 0.3, h - 0.55, hz - 0.3, -Math.PI * 0.25);

  // ---------------------------------------------------------------- ceiling: air scrubber grille with a turning fan
  {
    const fx = 4.5;
    const fz = 0;
    kit.box("impTrim", fx, h - 0.09, fz, 1.5, 0.18, 1.5, { color: PALETTE.impBlack, texel: 1 });
    kit.box("impMetal", fx, h - 0.19, fz, 1.3, 0.02, 1.3, { color: PALETTE.impCharcoal });
    for (let s = -0.55; s <= 0.55; s += 0.11) kit.box("impMetal", fx, h - 0.21, fz + s, 1.3, 0.02, 0.03, { color: PALETTE.impGreyDark });
    // four pitched blades + hub baked into one geometry: one animated mesh, one draw call
    const blades = [C(0.06, 0.06, [0, 0, 0], PALETTE.impGreyDark, "y", 10)];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      // pitch about the blade's own long axis first, then swing it radially (YXZ: X applied before Y)
      blades.push(B(0.5, 0.02, 0.12, [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], PALETTE.impGrey, [0.5, -a, 0, "YXZ"]));
    }
    const fan = new THREE.Mesh(compound(blades, 2), ctx.materials.impMetalRough);
    fan.position.set(fx, h - 0.17, fz);
    kit.attach(fan);
    kit.onUpdate((dt) => {
      fan.rotation.y += dt * 2.4;
    });
  }

  // ---------------------------------------------------------------- lights (8 total: 4 bay keys + 2 common-area keys + refresher (above) + east key)
  // Outer bays get a light just inside the bay front under the header beam (bunks lit head-on, not at a grazing
  // angle); the middle bays are carried by the two keys over the long tables, which also light the common area.
  const keyCol = 0xdfe6f5;
  let li = 0;
  for (const side of [-1, 1]) {
    for (const b of [0, 2]) {
      keyLight(kit, bayX0 + (b + 0.5) * bayW, 2.3, side * (hz - bayDepth + 0.3), { color: keyCol, k: 5.0, distance: 12, priority: 0.5 - li++ * 0.01 });
    }
    keyLight(kit, bayX0 + 1.5 * bayW, h - 1.0, side * 4.4, { color: keyCol, k: 4.5, distance: 14, priority: 0.5 - li++ * 0.01 });
  }
  keyLight(kit, 7, h - 0.6, 0, { color: keyCol, k: 4.0, distance: 20, priority: 0.46 });
}
