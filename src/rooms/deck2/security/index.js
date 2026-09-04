// Deck 2 security office + detention block: angled duty desk and a 4×2 monitor wall up front, a heavy
// barred gate, a low-ceilinged cell corridor with 3 cells a side (one force-field cell), an
// interrogation room behind glass on the aft wall, gear/processing bays in the side wings. Dark grey,
// red strips, black doors (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP, col } from "../_shared/palette.js";
import { console as consoleProp, chair, crate, lockerBank, cabinet, wallScreen, floorLine, hazardStrip, dropLight, duct, pipe } from "../_shared/props.js";
import * as S from "./props.js";

const Y = 40;
const CEIL = 44.6;
const X0 = 11;
const X1 = 35;
const Z0 = 377.5;
const Z1 = 410;
const IX0 = X0 + 0.3;
const IX1 = X1 - 0.3;
const IZ0 = Z0 + 0.3;
const IZ1 = Z1 - 0.3;
const HALF = Math.PI / 2;
const SCREEN = "screenImp2";

const GATE_Z = 389.65; // centre plane of the gate wall
const GAP = { x0: 21.8, x1: 24.2 }; // open gate
const BLOCK = { x0: 17.1, x1: 28.9, z0: 390.2, z1: 401.1, h: 3.4 }; // cell block envelope
const CORR = { x0: 21.0, x1: 25.0 };
const CELL_W = 3.3;
const PART_T = 0.25;
const INTER = { x0: 19.5, x1: 27.5, z0: 404.4, h: 3.4 }; // interrogation room (aft wall closes it)

function detail(ctx) {
  const { kit, PALETTE, lights } = ctx;
  const P = (k) => col(PALETTE, k);
  const black = P("impBlack");
  const dark = P("impDark");
  const mid = P("impMid");
  const steel = P("steel");

  // ---- duty office -----------------------------------------------------------------------------------
  // angled duty desk (convex toward the door), operators face the door
  for (const [cx, yaw, seed] of [[21.85, 0.3, 11], [24.15, -0.3, 12]]) {
    const Q = consoleProp(kit, PALETTE, [cx, Y, 384.35], yaw, { w: 2.4, d: 0.9, h: 1.15, screens: 2, sit: true, seed, screenMat: SCREEN });
    // visitor-facing side: badge plate with a red status bar
    Q.box("darkGloss", 0, 0.45, -0.456, 1.6, 0.36, 0.012);
    Q.box("emitRedImp", 0, 0.58, -0.464, 1.4, 0.03, 0.006);
    Q.box("emitWhite", -0.5, 0.34, -0.464, 0.5, 0.02, 0.006);
  }
  floorLine(kit, [12.5, Y, 382.3], [33.5, Y, 382.3], 0.12, "emitRedImp");
  // checkpoint between the door and the desk: two scanner pylons flanking a marked lane
  S.scanPylon(kit, PALETTE, [21.0, Y, 381.0], HALF);
  S.scanPylon(kit, PALETTE, [25.0, Y, 381.0], -HALF, { clear: false });
  for (const x of [21.7, 24.3]) floorLine(kit, [x, Y, 379.2], [x, Y, 382.1], 0.08, "emitWhite");
  // gate control console at the block entrance (operator faces the gate)
  consoleProp(kit, PALETTE, [23, Y, 388.0], Math.PI, { w: 1.6, d: 0.8, h: 1.15, screens: 1, seed: 13, screenMat: SCREEN });
  // monitor wall (4×2) over an equipment rack on the west wall
  for (let i = 0; i < 4; i++) for (const y of [1.95, 3.0]) wallScreen(kit, [IX0 + 0.09, Y + y, 380.9 + i * 1.75], HALF, 1.6, 0.9, SCREEN);
  S.equipmentRack(kit, PALETTE, [IX0 + 0.26, Y, 383.5], HALF, { w: 7.0, h: 0.9, d: 0.5, units: 7, seed: 14 });
  S.wallPanel(kit, PALETTE, [IX0 + 0.01, Y + 1.5, 388.3], HALF, 15);
  // east wall: evidence lockers, two-piece weapon rack, cabinet, screens
  lockerBank(kit, PALETTE, [IX1 - 0.26, Y, 381.8], -HALF, { count: 6, unit: 0.6, h: 2.0, d: 0.5, color: dark });
  S.weaponRack2(kit, PALETTE, [IX1 - 0.1, Y, 384.6], -HALF);
  cabinet(kit, PALETTE, [IX1 - 0.21, Y, 386.2], -HALF, { w: 1.2, h: 1.8, d: 0.4, seed: 16, emit: "emitRedImp" });
  wallScreen(kit, [IX1 - 0.09, Y + 2.95, 381.8], -HALF, 2.4, 0.9, SCREEN);
  wallScreen(kit, [IX1 - 0.09, Y + 2.95, 385.4], -HALF, 1.6, 0.9, SCREEN);
  S.wallPanel(kit, PALETTE, [IX1 - 0.01, Y + 1.5, 388.0], -HALF, 17);
  // north wall: holding bench west of the door, cabinet + crates east of it, screens, notice panels
  S.holdingBench(kit, PALETTE, [16.5, Y, IZ0 + 0.08], 0, { len: 4.0 });
  wallScreen(kit, [15.2, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, SCREEN);
  wallScreen(kit, [18.4, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, SCREEN);
  S.wallPanel(kit, PALETTE, [20.2, Y + 1.5, IZ0 + 0.01], 0, 18);
  S.wallPanel(kit, PALETTE, [12.4, Y + 1.5, IZ0 + 0.01], 0, 19);
  cabinet(kit, PALETTE, [26.4, Y, IZ0 + 0.21], 0, { w: 1.2, h: 1.8, d: 0.4, seed: 20 });
  wallScreen(kit, [29.0, Y + 2.95, IZ0 + 0.09], 0, 2.4, 0.9, SCREEN);
  S.wallPanel(kit, PALETTE, [28.0, Y + 1.5, IZ0 + 0.01], 0, 21);
  crate(kit, PALETTE, [33.6, Y, IZ0 + 0.7], 0, { seed: 22 });
  crate(kit, PALETTE, [33.6, Y + 1.2, IZ0 + 0.7], 0.2, { h: 0.8, seed: 23, color: dark });
  crate(kit, PALETTE, [32.2, Y, IZ0 + 0.55], 0, { w: 0.9, h: 0.9, d: 0.9, seed: 24 });
  wallScreen(kit, [32.9, Y + 3.2, IZ0 + 0.09], 0, 1.6, 0.8, SCREEN);
  // office ceiling: recessed panels (dark ceiling)
  for (const x of [15.5, 23, 30.5]) for (const z of [380.2, 386.0]) S.ceilingPanel(kit, PALETTE, x, CEIL, z);

  // ---- gate wall --------------------------------------------------------------------------------------
  const gz0 = GATE_Z - 0.2;
  const gz1 = GATE_Z + 0.2;
  for (const [a, b] of [[IX0, 17.5], [28.5, IX1]]) {
    kit.boxMM("paintedMetal", [a, Y, gz0], [b, CEIL, gz1], { color: black, texel: 0.5 });
    const n = Math.max(1, Math.round((b - a) / 1.6));
    for (let i = 0; i < n; i++) {
      const u0 = a + (i * (b - a)) / n + 0.03;
      const u1 = a + ((i + 1) * (b - a)) / n - 0.03;
      for (const [v0, v1] of [[0.42, 2.0], [2.32, 4.1]]) {
        kit.boxMM("impPanel", [u0, Y + v0, gz0 - 0.03], [u1, Y + v1, gz0], { color: dark, uv: "keep" });
        kit.boxMM("impPanel", [u0, Y + v0, gz1], [u1, Y + v1, gz1 + 0.03], { color: dark, uv: "keep" });
      }
    }
    for (const z of [gz0 - 0.035, gz1 + 0.035]) kit.boxMM("emitRedImp", [a + 0.15, Y + 2.12, z - 0.005], [b - 0.15, Y + 2.2, z + 0.005]);
    kit.boxMM("paintedMetal", [a, Y, gz0 - 0.04], [b, Y + 0.4, gz1 + 0.04], { color: dark, texel: 1 });
    kit.collider([a, Y, gz0 - 0.05], [b, CEIL, gz1 + 0.05], "gate-wall");
    wallScreen(kit, [(a + b) / 2, Y + 3.1, gz0 - 0.09], Math.PI, 1.6, 0.9, SCREEN);
  }
  // barred section with the open gap, header above, frame posts
  const gTop = Y + 3.4;
  S.barWall(kit, PALETTE, [17.5, Y, GATE_Z], [GAP.x0, Y, GATE_Z], Y + 0.05, gTop, { r: 0.03, pitch: 0.16, tag: "gate-w" });
  S.barWall(kit, PALETTE, [GAP.x1, Y, GATE_Z], [28.5, Y, GATE_Z], Y + 0.05, gTop, { r: 0.03, pitch: 0.16, tag: "gate-e" });
  kit.boxMM("paintedMetal", [17.5, gTop, gz0], [28.5, CEIL, gz1], { color: black, texel: 0.5 });
  for (const z of [gz0 - 0.005, gz1 + 0.005]) kit.boxMM("emitRedImp", [17.8, gTop + 0.15, z - 0.005], [28.2, gTop + 0.21, z + 0.005]);
  for (const x of [17.5, GAP.x0, GAP.x1, 28.5]) kit.box("paintedMetal", x, Y + (CEIL - Y) / 2, GATE_Z, 0.36, CEIL - Y, 0.46, { color: black, texel: 1 });
  kit.boxMM("paintedMetal", [GAP.x0, Y + 3.0, gz0 - 0.02], [GAP.x1, gTop, gz1 + 0.02], { color: black, texel: 1 });
  kit.box("emitGreen", (GAP.x0 + GAP.x1) / 2, Y + 3.2, gz0 - 0.03, 1.2, 0.05, 0.01);
  kit.box("emitRedImp", (GAP.x0 + GAP.x1) / 2, Y + 3.2, gz1 + 0.03, 1.2, 0.05, 0.01);
  hazardStrip(kit, [GAP.x0 + 0.05, gz0 - 0.5], [GAP.x1 - 0.05, gz0 - 0.15], Y);
  hazardStrip(kit, [GAP.x0 + 0.05, gz1 + 0.15], [GAP.x1 - 0.05, gz1 + 0.5], Y);
  // office side of the gate wall: detainee bench (east), storage (west); booking station mid-floor east
  S.holdingBench(kit, PALETTE, [31.6, Y, gz0 - 0.08], Math.PI, { len: 4.0 });
  cabinet(kit, PALETTE, [13.0, Y, gz0 - 0.21], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 70 });
  crate(kit, PALETTE, [14.6, Y, gz0 - 0.55], 0, { w: 0.8, h: 0.8, d: 0.8, seed: 71 });
  crate(kit, PALETTE, [14.6, Y + 0.8, gz0 - 0.55], 0.2, { w: 0.8, h: 0.8, d: 0.8, seed: 72, color: dark });
  crate(kit, PALETTE, [16.2, Y, gz0 - 0.7], 0, { seed: 73 });
  consoleProp(kit, PALETTE, [30.2, Y, 386.4], HALF, { w: 2.0, d: 0.8, h: 1.15, screens: 2, sit: true, seed: 74, screenMat: SCREEN });

  // ---- detention block ----------------------------------------------------------------------------------
  const cells = [];
  for (let i = 0; i < 3; i++) {
    const c0 = BLOCK.z0 + PART_T + i * (CELL_W + PART_T);
    cells.push([c0, c0 + CELL_W]);
  }
  // back walls, partitions, block ceiling slab
  kit.boxMM("paintedMetal", [BLOCK.x0, Y, BLOCK.z0], [BLOCK.x0 + 0.3, Y + BLOCK.h, BLOCK.z1], { color: black, texel: 0.5 });
  // close the slot between the gate wall and the first partitions
  kit.boxMM("paintedMetal", [BLOCK.x0, Y, gz1], [CORR.x0, Y + BLOCK.h, BLOCK.z0 + 0.01], { color: black, texel: 0.5 });
  kit.boxMM("paintedMetal", [CORR.x1, Y, gz1], [BLOCK.x1, Y + BLOCK.h, BLOCK.z0 + 0.01], { color: black, texel: 0.5 });
  kit.boxMM("paintedMetal", [BLOCK.x1 - 0.3, Y, BLOCK.z0], [BLOCK.x1, Y + BLOCK.h, BLOCK.z1], { color: black, texel: 0.5 });
  kit.collider([BLOCK.x0, Y, BLOCK.z0], [BLOCK.x0 + 0.3, Y + BLOCK.h, BLOCK.z1], "cell-back-w");
  kit.collider([BLOCK.x1 - 0.3, Y, BLOCK.z0], [BLOCK.x1, Y + BLOCK.h, BLOCK.z1], "cell-back-e");
  // outer faces of the block toward the wings: recessed panels, red strip, screens, wall gear
  for (const side of [-1, 1]) {
    const fx = side < 0 ? BLOCK.x0 : BLOCK.x1; // face plane
    const out = (d) => fx + side * d; // distance out from the face into the wing
    const yaw = side < 0 ? -HALF : HALF; // props face away from the block
    const nPan = 7;
    const span = BLOCK.z1 - BLOCK.z0 - 0.4;
    for (let i = 0; i < nPan; i++) {
      const z0 = BLOCK.z0 + 0.2 + (i * span) / nPan + 0.03;
      const z1 = BLOCK.z0 + 0.2 + ((i + 1) * span) / nPan - 0.03;
      for (const [v0, v1] of [[0.4, 2.0], [2.3, BLOCK.h - 0.2]]) {
        kit.boxMM("impPanel", [Math.min(fx, out(0.03)), Y + v0, z0], [Math.max(fx, out(0.03)), Y + v1, z1], { color: dark, uv: "keep" });
      }
    }
    kit.boxMM("emitRedImp", [Math.min(fx, out(0.045)), Y + 2.12, BLOCK.z0 + 0.4], [Math.max(fx, out(0.045)), Y + 2.2, BLOCK.z1 - 0.4]);
    kit.boxMM("paintedMetal", [Math.min(fx, out(0.04)), Y, BLOCK.z0], [Math.max(fx, out(0.04)), Y + 0.4, BLOCK.z1], { color: dark, texel: 1 });
    wallScreen(kit, [out(0.09), Y + 2.75, 392.6], yaw, 1.6, 0.9, SCREEN);
    wallScreen(kit, [out(0.09), Y + 2.75, 398.6], yaw, 1.6, 0.9, SCREEN);
    S.wallPanel(kit, PALETTE, [out(0.01), Y + 1.5, 391.0], yaw, 60 + side);
    if (side < 0) {
      S.holdingBench(kit, PALETTE, [out(0.08), Y, 395.6], yaw, { len: 3.2 });
    } else {
      S.equipmentRack(kit, PALETTE, [out(0.26), Y, 395.0], yaw, { w: 3.0, h: 0.9, d: 0.5, units: 3, seed: 62 });
      crate(kit, PALETTE, [out(0.45), Y, 399.4], 0, { w: 0.8, h: 0.8, d: 0.8, seed: 63 });
      crate(kit, PALETTE, [out(0.45), Y + 0.8, 399.4], 0.15, { w: 0.8, h: 0.8, d: 0.8, seed: 64, color: dark });
    }
  }
  for (const [sx0, sx1] of [[BLOCK.x0 + 0.3, CORR.x0], [CORR.x1, BLOCK.x1 - 0.3]]) {
    for (let i = 0; i <= 3; i++) {
      const pz = BLOCK.z0 + i * (CELL_W + PART_T);
      kit.boxMM("paintedMetal", [sx0, Y, pz], [sx1, Y + BLOCK.h, pz + PART_T], { color: dark, texel: 0.5 });
      kit.boxMM("impPanel", [sx0 + 0.05, Y + 0.4, pz - 0.02], [sx1 - 0.05, Y + BLOCK.h - 0.2, pz], { color: mid, uv: "keep" });
      if (i < 3) kit.boxMM("impPanel", [sx0 + 0.05, Y + 0.4, pz + PART_T], [sx1 - 0.05, Y + BLOCK.h - 0.2, pz + PART_T + 0.02], { color: mid, uv: "keep" });
      kit.collider([sx0, Y, pz - 0.02], [sx1, Y + BLOCK.h, pz + PART_T + 0.02], "cell-partition");
    }
    // aft face of the block (toward the interrogation zone): 2×2 panels, red strip, screen, gear
    const az = BLOCK.z1;
    const mx = (sx0 + sx1) / 2;
    for (const [u0, u1] of [[sx0 + 0.05, mx - 0.03], [mx + 0.03, sx1 - 0.05]]) {
      for (const [v0, v1] of [[0.4, 2.0], [2.3, BLOCK.h - 0.2]]) kit.boxMM("impPanel", [u0, Y + v0, az], [u1, Y + v1, az + 0.03], { color: dark, uv: "keep" });
    }
    kit.boxMM("emitRedImp", [sx0 + 0.2, Y + 2.12, az - 0.01], [sx1 - 0.2, Y + 2.2, az + 0.045]);
    kit.boxMM("paintedMetal", [sx0, Y, az], [sx1, Y + 0.4, az + 0.04], { color: dark, texel: 1 });
    wallScreen(kit, [mx, Y + 2.75, az + 0.09], 0, 1.6, 0.9, SCREEN);
    if (sx0 < 20) {
      S.wallPanel(kit, PALETTE, [sx1 - 0.5, Y + 1.5, az + 0.01], 0, 65);
      crate(kit, PALETTE, [sx0 + 0.6, Y, az + 0.45], 0, { w: 0.8, h: 0.8, d: 0.8, seed: 66 });
      crate(kit, PALETTE, [sx0 + 0.6, Y + 0.8, az + 0.45], -0.2, { w: 0.8, h: 0.8, d: 0.8, seed: 67, color: dark });
    } else {
      S.wallPanel(kit, PALETTE, [sx0 + 0.5, Y + 1.5, az + 0.01], 0, 68);
      cabinet(kit, PALETTE, [sx1 - 0.9, Y, az + 0.21], 0, { w: 1.2, h: 1.8, d: 0.4, seed: 69, emit: "emitRedImp" });
    }
  }
  kit.boxMM("paintedMetal", [BLOCK.x0, Y + BLOCK.h, BLOCK.z0], [BLOCK.x1, Y + BLOCK.h + 0.15, BLOCK.z1], { color: black, texel: 0.5 });
  // corridor ceiling: red strips + white panels under the slab
  for (const x of [CORR.x0 + 0.25, CORR.x1 - 0.25]) kit.boxMM("emitRedImp", [x - 0.04, Y + BLOCK.h - 0.012, BLOCK.z0 + 0.3], [x + 0.04, Y + BLOCK.h - 0.002, BLOCK.z1 - 0.3]);
  for (const z of [392.0, 395.6, 399.2]) {
    kit.box("paintedMetal", 23, Y + BLOCK.h - 0.03, z, 0.7, 0.06, 0.7, { color: dark });
    kit.box("emitWhite", 23, Y + BLOCK.h - 0.065, z, 0.55, 0.01, 0.55);
  }
  // cell fronts on the corridor edges + fittings
  const barTop = Y + 3.0;
  for (const side of [-1, 1]) {
    const fx = side < 0 ? CORR.x0 : CORR.x1; // corridor edge
    const backX = side < 0 ? BLOCK.x0 + 0.3 : BLOCK.x1 - 0.3;
    const yaw = side < 0 ? HALF : -HALF; // fittings face the corridor
    cells.forEach(([c0, c1], i) => {
      const isField = side < 0 && i === 1;
      const num = side < 0 ? i + 1 : i + 4;
      // header above the bars (solid) with a number strip
      kit.boxMM("paintedMetal", [fx - 0.08, barTop, c0], [fx + 0.08, Y + BLOCK.h, c1], { color: black, texel: 1 });
      kit.box("emitRedImp", fx + side * -1 * 0.085, barTop + 0.2, (c0 + c1) / 2, 0.006, 0.05, 0.5);
      if (isField) {
        // force-field cell: glass pane with a faint red frame, no door gap
        kit.boxMM("glass", [fx - 0.01, Y + 0.05, c0 + 0.03], [fx + 0.01, barTop, c1 - 0.03], { uv: "keep" });
        for (const [y0, y1] of [[0.1, 0.125], [2.955, 2.98]]) kit.boxMM("emitRedImp", [fx - 0.02, Y + y0, c0], [fx + 0.02, Y + y1, c1]);
        for (const z of [c0 + 0.012, c1 - 0.012]) kit.boxMM("emitRedImp", [fx - 0.02, Y + 0.1, z - 0.012], [fx + 0.02, barTop, z + 0.012]);
        kit.boxMM("paintedMetal", [fx - 0.08, Y, c0 - 0.02], [fx + 0.08, Y + 0.1, c1 + 0.02], { color: black });
        kit.collider([fx - 0.08, Y, c0], [fx + 0.08, barTop, c1], "field");
        kit.box("emitRedImp", fx + side * -1 * 0.09, Y + 1.4, c1 - 0.35, 0.006, 0.4, 0.05); // field emitter post light
      } else {
        // bars with a 0.9 m door gap toward the aft end of the cell
        const g0 = c1 - 1.15;
        const g1 = c1 - 0.25;
        S.barWall(kit, PALETTE, [fx, Y, c0], [fx, Y, g0], Y + 0.05, barTop, { tag: "cell-bars" });
        S.barWall(kit, PALETTE, [fx, Y, g1], [fx, Y, c1], Y + 0.05, barTop, { tag: "cell-bars" });
        S.cellDoorFrame(kit, PALETTE, [fx, Y, (g0 + g1) / 2], yaw, { gap: g1 - g0, h: 3.0, locked: num % 3 !== 0 });
      }
      S.cellFittings(kit, PALETTE, [backX, Y, (c0 + c1) / 2], yaw, { w: CELL_W, seed: 30 + num });
    });
  }
  // cell block entrance: security console faces the corridor on the office side handled above; a red
  // floor line marks the corridor threshold
  floorLine(kit, [CORR.x0 + 0.1, Y, BLOCK.z0 + 0.5], [CORR.x1 - 0.1, Y, BLOCK.z0 + 0.5], 0.12, "emitRedImp");
  // ventilation main on top of the block with branch stubs into each cell
  duct(kit, PALETTE, [23, Y + BLOCK.h + 0.55, BLOCK.z0 + 0.4], [23, Y + BLOCK.h + 0.55, BLOCK.z1 - 0.4], 0.8, 0.5, { color: mid });
  for (const [c0, c1] of cells) duct(kit, PALETTE, [BLOCK.x0 + 1.4, Y + BLOCK.h + 0.5, (c0 + c1) / 2], [BLOCK.x1 - 1.4, Y + BLOCK.h + 0.5, (c0 + c1) / 2], 0.4, 0.3, { color: dark });

  // ---- side wings (west/east of the block, running into the aft zone) -----------------------------------
  for (const side of [-1, 1]) {
    const wx = side < 0 ? IX0 : IX1;
    const yaw = side < 0 ? HALF : -HALF;
    const off = (d) => wx + side * -1 * d;
    lockerBank(kit, PALETTE, [off(0.26), Y, 393.8], yaw, { count: 8, unit: 0.6, h: 2.0, d: 0.5, color: dark });
    wallScreen(kit, [off(0.09), Y + 2.95, 393.8], yaw, 2.4, 0.9, SCREEN);
    cabinet(kit, PALETTE, [off(0.21), Y, 398.6], yaw, { w: 1.2, h: 1.8, d: 0.4, seed: 40 + side, emit: side < 0 ? "emitAmber" : "emitRedImp" });
    S.wallPanel(kit, PALETTE, [off(0.01), Y + 1.5, 400.3], yaw, 44 + side);
    duct(kit, PALETTE, [off(0.28), Y + 3.9, 390.6], [off(0.28), Y + 3.9, 409.2], 0.5, 0.3, { color: dark });
    for (const z of [394, 401.5, 407]) kit.box("paintedMetal", off(0.12), Y + 3.9, z, 0.24, 0.5, 0.6, { color: black });
    pipe(kit, PALETTE, [off(0.75), Y + 3.55, 390.6], [off(0.75), Y + 3.55, 409.2], 0.07, { color: steel, bracket: 3 });
    S.ceilingPanel(kit, PALETTE, off(2.9), CEIL, 395.5);
    S.ceilingPanel(kit, PALETTE, off(2.9), CEIL, 405.5);
  }
  // west wing aft: processing station (console + evidence bench + crates)
  consoleProp(kit, PALETTE, [14.2, Y, 404.6], HALF, { w: 2.0, d: 0.8, h: 1.15, screens: 2, seed: 50, screenMat: SCREEN });
  S.equipmentRack(kit, PALETTE, [IX0 + 0.26, Y, 405.5], HALF, { w: 3.0, h: 0.9, d: 0.5, units: 3, seed: 51 });
  for (const z of [403.5, 405.5, 407.5]) wallScreen(kit, [IX0 + 0.09, Y + 2.2, z], HALF, 1.6, 0.9, SCREEN);
  S.interrogationTable(kit, PALETTE, [15.2, Y, 408.2], 0, { len: 2.4, w: 0.9, h: 0.9 });
  crate(kit, PALETTE, [12.0, Y, IZ1 - 0.7], 0, { seed: 52 });
  crate(kit, PALETTE, [12.0, Y + 1.2, IZ1 - 0.7], 0.15, { h: 0.8, seed: 53, color: dark });
  wallScreen(kit, [18.3, Y + 2.95, IZ1 - 0.09], Math.PI, 1.6, 0.9, SCREEN);
  // east wing aft: observation console facing the interrogation room, gear crates
  consoleProp(kit, PALETTE, [31.8, Y, 406.6], HALF, { w: 2.4, d: 0.9, h: 1.15, screens: 3, sit: true, seed: 54, screenMat: SCREEN });
  for (const z of [404.6, 406.4, 408.2]) wallScreen(kit, [IX1 - 0.09, Y + 2.6, z], -HALF, 1.6, 0.9, SCREEN);
  crate(kit, PALETTE, [33.9, Y, IZ1 - 0.7], 0, { seed: 55 });
  crate(kit, PALETTE, [32.5, Y, IZ1 - 0.6], 0, { w: 0.9, h: 0.9, d: 0.9, seed: 56 });
  crate(kit, PALETTE, [33.9, Y + 1.2, IZ1 - 0.7], -0.2, { h: 0.9, seed: 57, color: dark });
  wallScreen(kit, [30.0, Y + 2.95, IZ1 - 0.09], Math.PI, 1.6, 0.9, SCREEN);
  cabinet(kit, PALETTE, [29.0, Y, IZ1 - 0.21], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 58 });
  // aft-wall service run (pipes at 3.9 m across the room, over the interrogation module)
  pipe(kit, PALETTE, [IX0 + 0.2, Y + 4.05, IZ1 - 0.35], [IX1 - 0.2, Y + 4.05, IZ1 - 0.35], 0.09, { color: steel, bracket: 3 });
  pipe(kit, PALETTE, [IX0 + 0.2, Y + 3.8, IZ1 - 0.3], [IX1 - 0.2, Y + 3.8, IZ1 - 0.3], 0.05, { color: P("impRed"), bracket: 3 });

  // ---- interrogation room (glass front, solid sides, own ceiling; aft wall is the shell's) --------------
  const I = INTER;
  const iz1 = IZ1;
  for (const x of [I.x0, I.x1 - 0.2]) {
    kit.boxMM("paintedMetal", [x, Y, I.z0], [x + 0.2, Y + I.h, iz1], { color: black, texel: 0.5 });
    kit.boxMM("impPanel", [x - 0.02, Y + 0.4, I.z0 + 0.05], [x, Y + I.h - 0.2, iz1 - 0.05], { color: dark, uv: "keep" });
    kit.boxMM("impPanel", [x + 0.2, Y + 0.4, I.z0 + 0.05], [x + 0.22, Y + I.h - 0.2, iz1 - 0.05], { color: dark, uv: "keep" });
    kit.collider([x - 0.02, Y, I.z0], [x + 0.22, Y + I.h, iz1], "interrogation-wall");
  }
  // glass front: solid base, glass 1.0..3.0, header; door gap at the east end
  const door = { x0: I.x1 - 1.6, x1: I.x1 - 0.4 };
  kit.boxMM("paintedMetal", [I.x0, Y, I.z0], [door.x0, Y + 1.0, I.z0 + 0.2], { color: black, texel: 1 });
  kit.boxMM("paintedMetal", [I.x0, Y + 3.0, I.z0], [I.x1, Y + I.h, I.z0 + 0.2], { color: black, texel: 1 });
  kit.boxMM("glass", [I.x0 + 0.2, Y + 1.0, I.z0 + 0.09], [door.x0, Y + 3.0, I.z0 + 0.11], { uv: "keep" });
  for (const x of [I.x0 + 0.2, (I.x0 + door.x0) / 2, door.x0]) kit.boxMM("paintedMetal", [x - 0.04, Y + 1.0, I.z0 + 0.06], [x + 0.04, Y + 3.0, I.z0 + 0.14], { color: black });
  kit.boxMM("paintedMetal", [I.x0, Y + 1.0, I.z0 + 0.06], [door.x0, Y + 1.06, I.z0 + 0.14], { color: black });
  kit.boxMM("paintedMetal", [door.x1, Y, I.z0], [I.x1, Y + 3.0, I.z0 + 0.2], { color: black, texel: 1 });
  for (const x of [door.x0, door.x1]) kit.box("paintedMetal", x, Y + 1.5, I.z0 + 0.1, 0.12, 3.0, 0.26, { color: black });
  kit.box("emitGreen", (door.x0 + door.x1) / 2, Y + 2.95, I.z0 - 0.005, 0.8, 0.04, 0.01);
  kit.collider([I.x0, Y, I.z0], [door.x0, Y + I.h, I.z0 + 0.2], "interrogation-glass");
  kit.collider([door.x1, Y, I.z0], [I.x1, Y + I.h, I.z0 + 0.2], "interrogation-glass");
  kit.boxMM("paintedMetal", [I.x0 - 0.02, Y + I.h, I.z0], [I.x1 + 0.02, Y + I.h + 0.15, iz1], { color: black, texel: 0.5 });
  kit.boxMM("emitRedImp", [I.x0 + 0.4, Y + 3.1, I.z0 - 0.01], [I.x1 - 0.4, Y + 3.16, I.z0]);
  // inside: table, two chairs, drop light, recorder screen, red strip on the aft wall
  const icx = (I.x0 + I.x1) / 2;
  S.interrogationTable(kit, PALETTE, [icx, Y, 407.2], 0, { len: 2.0, w: 0.9 });
  chair(kit, PALETTE, [icx, Y, 406.25], 0);
  chair(kit, PALETTE, [icx, Y, 408.15], Math.PI);
  dropLight(kit, PALETTE, [icx, Y + I.h + 0.05, 407.2], { w: 1.2, d: 0.4, stem: 0.95, mat: "emitWhite" });
  wallScreen(kit, [I.x1 - 0.29, Y + 2.75, 406.6], -HALF, 1.2, 0.7, SCREEN);
  wallScreen(kit, [I.x0 + 0.29, Y + 2.8, 407.4], HALF, 1.6, 0.9, SCREEN);
  kit.boxMM("emitRedImp", [I.x0 + 0.6, Y + 2.2, iz1 - 0.015], [I.x1 - 0.6, Y + 2.25, iz1 - 0.005]);
  // side-wall strips continue the aft one (embedded in the panel insets, 1.5 cm proud)
  kit.boxMM("emitRedImp", [I.x0 + 0.2, Y + 2.2, I.z0 + 0.5], [I.x0 + 0.235, Y + 2.25, iz1 - 0.5]);
  kit.boxMM("emitRedImp", [I.x1 - 0.235, Y + 2.2, I.z0 + 0.5], [I.x1 - 0.2, Y + 2.25, iz1 - 0.5]);
  S.wallPanel(kit, PALETTE, [I.x0 + 0.23, Y + 1.5, 408.6], HALF, 59);
  S.ceilingPanel(kit, PALETTE, 23.5, CEIL, 403.0);

  // ---- lights (12 descriptors) ----------------------------------------------------------------------------
  lights.push({ type: "point", pos: [23, Y + 4.1, 380.2], color: 0xffd6cc, intensity: 26, distance: 12, priority: 0.7 });
  lights.push({ type: "point", pos: [23, Y + 3.9, 385.2], color: 0xffd6cc, intensity: 24, distance: 11, priority: 0.6 });
  lights.push({ type: "point", pos: [14.5, Y + 3.6, 383.5], color: 0xc8d8ff, intensity: 18, distance: 9, priority: 0.4 });
  lights.push({ type: "point", pos: [31.5, Y + 3.8, 383.5], color: 0xffd6cc, intensity: 18, distance: 9, priority: 0.4 });
  lights.push({ type: "point", pos: [23, Y + 3.2, 389.65], color: 0xff5040, intensity: 10, distance: 7, priority: 0.5 });
  lights.push({ type: "point", pos: [23, Y + 3.1, 393.5], color: 0xffb0a0, intensity: 14, distance: 8, priority: 0.5 });
  lights.push({ type: "point", pos: [23, Y + 3.1, 399.0], color: 0xffb0a0, intensity: 14, distance: 8, priority: 0.5 });
  lights.push({ type: "point", pos: [14.2, Y + 4.0, 396.0], color: 0xffe0d8, intensity: 18, distance: 10, priority: 0.4 });
  lights.push({ type: "point", pos: [31.8, Y + 4.0, 396.0], color: 0xffe0d8, intensity: 18, distance: 10, priority: 0.4 });
  lights.push({ type: "point", pos: [14.5, Y + 4.0, 405.5], color: 0xffe0d8, intensity: 18, distance: 10, priority: 0.4 });
  lights.push({ type: "point", pos: [31.5, Y + 4.0, 405.5], color: 0xffe0d8, intensity: 18, distance: 10, priority: 0.4 });
  lights.push({ type: "point", pos: [icx, Y + 2.9, 407.2], color: 0xffffff, intensity: 12, distance: 7, priority: 0.5 });
  return {};
}

export default defineRoom({
  id: "d2-security",
  name: "Security & Detention",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [23, Y, 380], yaw: 180 },
  views: {
    "d2-security-door": { pos: [23, Y, 379.4], yaw: 180, pitch: -2 },
    "d2-security-desk": { pos: [32.6, Y, 380.6], yaw: 128, pitch: -3 },
    "d2-security-cells": { pos: [23, Y, 390.4], yaw: 180, pitch: -2 },
    "d2-security-interrogation": { pos: [26.4, Y, 405.1], yaw: 128, pitch: -8 },
    "d2-security-wing": { pos: [16.6, Y, 407.0], yaw: 12, pitch: -3 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    corniceColor: IMP.impDark,
    stripMat: "emitRedImp",
    floor: { color: IMP.impDark },
    ceiling: { channels: 0, color: IMP.impBlack },
    lights: false,
  },
  detail,
});
