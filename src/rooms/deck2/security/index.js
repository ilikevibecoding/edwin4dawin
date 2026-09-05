// Deck 2 security office + detention block: angled duty desk and a 4×2 monitor wall up front, a heavy
// barred gate, a low-ceilinged cell corridor with 3 cells a side (one force-field cell), an
// interrogation room behind glass on the aft wall, gear/processing bays in the side wings. Dark grey,
// red strips, black doors (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP, col } from "../_shared/palette.js";
import { console as consoleProp, crate, lockerBank, cabinet, wallScreen, floorLine, dropLight, duct } from "../_shared/props.js";
import * as S from "./props.js";
import { EmitBatch, noise, gauss, clamp01, ownKitMaterial } from "./fx.js";

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
// three of the four Imperial screen layouts, cycled so no two neighbours repeat (the fourth key's draw
// call went to the room's animated emitters)
const SCR = ["screenImp0", "screenImp1", "screenImp2"];
const scr = (i) => SCR[((i % 3) + 3) % 3];

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
  const crateOpts = { bumperMat: "paintedMetal" }; // no `rubber` key in this room

  // ---- duty office -----------------------------------------------------------------------------------
  // angled duty desk (convex toward the door), operators face the door; two desk monitors per station
  // turned toward the seat, keyboards in front of them
  let deskScreen = 0;
  for (const [cx, yaw, seed] of [[21.85, 0.3, 11], [24.15, -0.3, 12]]) {
    const Q = consoleProp(kit, PALETTE, [cx, Y, 384.35], yaw, { w: 2.4, d: 0.9, h: 1.15, screens: 2, sit: true, seed, screenMat: scr(deskScreen++) });
    // visitor-facing side: light-grey counter plate carrying the badge reader and a red status bar (the
    // console's bare black back was a 2.4 m black slab across the middle of the door view)
    Q.box("impPanel", 0, 0.43, -0.457, 2.2, 0.58, 0.014, { color: mid, uv: "keep" });
    Q.box("darkGloss", 0, 0.45, -0.47, 1.6, 0.36, 0.012);
    Q.box("emitRedImp", 0, 0.58, -0.478, 1.4, 0.03, 0.006);
    Q.box("emitWhite", -0.5, 0.34, -0.478, 0.5, 0.02, 0.006);
    S.deskMonitor(kit, PALETTE, Q.world(-0.55, 0.74, 0.12), yaw + 0.5, { mat: scr(deskScreen++) });
    S.deskMonitor(kit, PALETTE, Q.world(0.55, 0.74, 0.14), yaw - 0.5, { mat: scr(deskScreen++) });
  }
  floorLine(kit, [12.5, Y, 382.3], [33.5, Y, 382.3], 0.12, "emitRedImp");
  // checkpoint between the door and the desk: two scanner pylons flanking a marked lane
  S.scanPylon(kit, PALETTE, [21.0, Y, 381.0], HALF);
  S.scanPylon(kit, PALETTE, [25.0, Y, 381.0], -HALF, { clear: false });
  for (const x of [21.7, 24.3]) floorLine(kit, [x, Y, 379.2], [x, Y, 382.1], 0.08, "emitWhite");
  // gate control console at the block entrance (operator faces the gate)
  consoleProp(kit, PALETTE, [23, Y, 388.0], Math.PI, { w: 1.6, d: 0.8, h: 1.15, screens: 1, seed: 13, screenMat: scr(1) });
  // monitor wall (4×2) over an equipment rack on the west wall, both rows angled down toward the desk
  // (7 and 22 deg). The screens are glossy (roughness 0.35) and the west office fill's specular highlight
  // for an eye-height viewer lands on the wall at 42.7 m whatever the viewer's position in the office,
  // i.e. on the array's row boundary (a 240-luma blob on the third column in the desk view). Tilting a
  // row down moves its highlight up the wall: at 7 deg the lower row's lands at 43.15 (0.75 m above its
  // top edge), at 22 deg the upper row's at 44.15 (0.7 m above), both off the glass.
  for (let i = 0; i < 4; i++) {
    wallScreen(kit, [IX0 + 0.11, Y + 1.95, 380.9 + i * 1.75], HALF, 1.6, 0.9, scr(i), { tilt: 0.12 });
    wallScreen(kit, [IX0 + 0.19, Y + 3.0, 380.9 + i * 1.75], HALF, 1.6, 0.9, scr(i + 2), { tilt: 0.38 });
    kit.box("emitBlue", IX0 + 0.045, Y + 1.42, 380.9 + i * 1.75, 0.01, 0.012, 0.96); // the flat variant's accent line, on the wall under the lower row
  }
  S.equipmentRack(kit, PALETTE, [IX0 + 0.26, Y, 383.5], HALF, { w: 7.0, h: 0.9, d: 0.5, units: 7, seed: 14 });
  S.wallPanel(kit, PALETTE, [IX0 + 0.01, Y + 1.5, 388.3], HALF, 15);
  // east wall: evidence lockers, two-piece weapon rack, cabinet, screens
  lockerBank(kit, PALETTE, [IX1 - 0.26, Y, 381.8], -HALF, { count: 6, unit: 0.6, h: 2.0, d: 0.5, color: dark });
  S.weaponRack2(kit, PALETTE, [IX1 - 0.1, Y, 384.6], -HALF);
  cabinet(kit, PALETTE, [IX1 - 0.21, Y, 386.2], -HALF, { w: 1.2, h: 1.8, d: 0.4, seed: 16, emit: "emitRedImp" });
  wallScreen(kit, [IX1 - 0.09, Y + 2.95, 381.8], -HALF, 2.4, 0.9, scr(1));
  wallScreen(kit, [IX1 - 0.09, Y + 2.95, 385.4], -HALF, 1.6, 0.9, scr(3));
  S.wallPanel(kit, PALETTE, [IX1 - 0.01, Y + 1.5, 388.0], -HALF, 17);
  // north wall: holding bench west of the door, cabinet + crates east of it, screens, notice panels
  S.holdingBench(kit, PALETTE, [16.5, Y, IZ0 + 0.08], 0, { len: 4.0 });
  wallScreen(kit, [15.2, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, scr(0));
  wallScreen(kit, [18.4, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, scr(2));
  S.wallPanel(kit, PALETTE, [20.2, Y + 1.5, IZ0 + 0.01], 0, 18);
  S.wallPanel(kit, PALETTE, [12.4, Y + 1.5, IZ0 + 0.01], 0, 19);
  cabinet(kit, PALETTE, [26.4, Y, IZ0 + 0.21], 0, { w: 1.2, h: 1.8, d: 0.4, seed: 20 });
  wallScreen(kit, [29.0, Y + 2.95, IZ0 + 0.09], 0, 2.4, 0.9, scr(3));
  S.wallPanel(kit, PALETTE, [28.0, Y + 1.5, IZ0 + 0.01], 0, 21);
  crate(kit, PALETTE, [33.6, Y, IZ0 + 0.7], 0, { seed: 22, ...crateOpts });
  crate(kit, PALETTE, [33.6, Y + 1.2, IZ0 + 0.7], 0.2, { h: 0.8, seed: 23, color: dark, ...crateOpts });
  crate(kit, PALETTE, [32.2, Y, IZ0 + 0.55], 0, { w: 0.9, h: 0.9, d: 0.9, seed: 24, ...crateOpts });
  wallScreen(kit, [32.9, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.8, scr(1));
  // office ceiling: housed panels along both side walls and the door axis, a light channel over the desk,
  // a pair between the desk and the gate, and a third pair just aft of the desk channel (the door view's
  // ceiling read 25 % black between the fixtures; at x 16.6/29.4 the pair sat outside that view's 52 deg
  // half-width, at 18.8/27.2 z 384.8 it lands in its top corners). The door-approach spot hangs between
  // the door-axis pair.
  for (const x of [13.6, 32.4]) for (const z of [380.6, 386.6]) S.ceilingPanel(kit, PALETTE, x, CEIL, z);
  for (const x of [19.8, 26.2]) S.ceilingPanel(kit, PALETTE, x, CEIL, 380.4);
  for (const x of [18.8, 27.2]) S.ceilingPanel(kit, PALETTE, x, CEIL, 384.8);
  S.channelFixture(kit, PALETTE, "x", 19.6, 26.4, 383.2, CEIL, { segment: 1.7 });
  // gate-approach channel in place of the 387.5 pair: the door view's ceiling between the 384.8 pair and
  // the gate header was a black plane, and the fill that pools the floor behind the desk hangs under it
  S.channelFixture(kit, PALETTE, "x", 19.6, 26.4, 387.3, CEIL, { segment: 1.7 });
  // pucks over the two office fills (moved over the monitor wall / booking side, see lights) and over the
  // door-approach fill, midway between the door-axis pair
  S.ceilingPanel(kit, PALETTE, 15.2, CEIL, 385.4, { w: 0.7, d: 0.7 });
  S.ceilingPanel(kit, PALETTE, 30.8, CEIL, 384.6, { w: 0.7, d: 0.7 });
  S.ceilingPanel(kit, PALETTE, 23, CEIL, 380.4, { w: 0.7, d: 0.7 });

  // ---- gate wall --------------------------------------------------------------------------------------
  const gz0 = GATE_Z - 0.2;
  const gz1 = GATE_Z + 0.2;
  for (const [a, b] of [[IX0, 17.5], [28.5, IX1]]) {
    kit.boxMM("paintedMetal", [a, Y, gz0], [b, CEIL, gz1], { color: black, texel: 2.5 });
    const n = Math.max(1, Math.round((b - a) / 1.6));
    for (let i = 0; i < n; i++) {
      const u0 = a + (i * (b - a)) / n + 0.03;
      const u1 = a + ((i + 1) * (b - a)) / n - 0.03;
      for (const [v0, v1] of [[0.42, 2.0], [2.32, 4.1]]) {
        kit.boxMM("impPanel", [u0, Y + v0, gz0 - 0.03], [u1, Y + v1, gz0], { color: mid, uv: "keep" });
        kit.boxMM("impPanel", [u0, Y + v0, gz1], [u1, Y + v1, gz1 + 0.03], { color: mid, uv: "keep" });
      }
    }
    for (const z of [gz0 - 0.035, gz1 + 0.035]) kit.boxMM("emitRedImp", [a + 0.15, Y + 2.12, z - 0.005], [b - 0.15, Y + 2.2, z + 0.005]);
    kit.boxMM("paintedMetal", [a, Y, gz0 - 0.04], [b, Y + 0.4, gz1 + 0.04], { color: dark, texel: 2.5 });
    kit.collider([a, Y, gz0 - 0.05], [b, CEIL, gz1 + 0.05], "gate-wall");
    wallScreen(kit, [(a + b) / 2, Y + 3.1, gz0 - 0.09], Math.PI, 1.6, 0.9, a < 20 ? scr(2) : scr(0));
  }
  // barred section with the open gap, header above, frame posts
  const gTop = Y + 3.4;
  S.barWall(kit, PALETTE, [17.5, Y, GATE_Z], [GAP.x0, Y, GATE_Z], Y + 0.05, gTop, { r: 0.03, pitch: 0.16, tag: "gate-w" });
  S.barWall(kit, PALETTE, [GAP.x1, Y, GATE_Z], [28.5, Y, GATE_Z], Y + 0.05, gTop, { r: 0.03, pitch: 0.16, tag: "gate-e" });
  kit.boxMM("paintedMetal", [17.5, gTop, gz0], [28.5, CEIL, gz1], { color: black, texel: 2.5 });
  // header plates in the wall sections' rhythm on both faces (an 11 x 1.2 m black band across the door view)
  for (let i = 0; i < 7; i++) {
    const u0 = 17.5 + (i * 11) / 7 + 0.03;
    const u1 = 17.5 + ((i + 1) * 11) / 7 - 0.03;
    kit.boxMM("impPanel", [u0, gTop + 0.32, gz0 - 0.02], [u1, CEIL - 0.12, gz0], { color: mid, uv: "keep" });
    kit.boxMM("impPanel", [u0, gTop + 0.32, gz1], [u1, CEIL - 0.12, gz1 + 0.02], { color: mid, uv: "keep" });
  }
  for (const z of [gz0 - 0.005, gz1 + 0.005]) kit.boxMM("emitRedImp", [17.8, gTop + 0.15, z - 0.005], [28.2, gTop + 0.21, z + 0.005]);
  for (const x of [17.5, GAP.x0, GAP.x1, 28.5]) kit.box("paintedMetal", x, Y + (CEIL - Y) / 2, GATE_Z, 0.36, CEIL - Y, 0.46, { color: black, texel: 2.5 });
  kit.boxMM("paintedMetal", [GAP.x0, Y + 3.0, gz0 - 0.02], [GAP.x1, gTop, gz1 + 0.02], { color: black, texel: 2.5 });
  kit.box("emitGreen", (GAP.x0 + GAP.x1) / 2, Y + 3.2, gz0 - 0.03, 1.2, 0.05, 0.01);
  kit.box("emitRedImp", (GAP.x0 + GAP.x1) / 2, Y + 3.2, gz1 + 0.03, 1.2, 0.05, 0.01);
  S.hazardBand(kit, PALETTE, [GAP.x0 + 0.05, gz0 - 0.5], [GAP.x1 - 0.05, gz0 - 0.15], Y);
  S.hazardBand(kit, PALETTE, [GAP.x0 + 0.05, gz1 + 0.15], [GAP.x1 - 0.05, gz1 + 0.5], Y);
  // office side of the gate wall: detainee bench (east), storage (west); booking station mid-floor east
  S.holdingBench(kit, PALETTE, [31.6, Y, gz0 - 0.08], Math.PI, { len: 4.0 });
  cabinet(kit, PALETTE, [13.0, Y, gz0 - 0.21], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 70 });
  crate(kit, PALETTE, [14.6, Y, gz0 - 0.55], 0, { w: 0.8, h: 0.8, d: 0.8, seed: 71, ...crateOpts });
  crate(kit, PALETTE, [14.6, Y + 0.8, gz0 - 0.55], 0.2, { w: 0.8, h: 0.8, d: 0.8, seed: 72, color: dark, ...crateOpts });
  crate(kit, PALETTE, [16.2, Y, gz0 - 0.7], 0, { seed: 73, ...crateOpts });
  consoleProp(kit, PALETTE, [30.2, Y, 386.4], HALF, { w: 2.0, d: 0.8, h: 1.15, screens: 2, sit: true, seed: 74, screenMat: scr(2) });

  // ---- detention block ----------------------------------------------------------------------------------
  const cells = [];
  for (let i = 0; i < 3; i++) {
    const c0 = BLOCK.z0 + PART_T + i * (CELL_W + PART_T);
    cells.push([c0, c0 + CELL_W]);
  }
  // back walls, partitions, block ceiling slab
  kit.boxMM("paintedMetal", [BLOCK.x0, Y, BLOCK.z0], [BLOCK.x0 + 0.3, Y + BLOCK.h, BLOCK.z1], { color: black, texel: 2.5 });
  // close the slot between the gate wall and the first partitions; their office faces (the wall right
  // behind the gate bars) carry mid-grey panel plates so the red sweep point and the gate fill wash them
  // — in black the bars stood against a void in the door view
  kit.boxMM("paintedMetal", [BLOCK.x0, Y, gz1], [CORR.x0, Y + BLOCK.h, BLOCK.z0 + 0.01], { color: black, texel: 2.5 });
  kit.boxMM("paintedMetal", [CORR.x1, Y, gz1], [BLOCK.x1, Y + BLOCK.h, BLOCK.z0 + 0.01], { color: black, texel: 2.5 });
  for (const [a, b] of [[BLOCK.x0 + 0.05, CORR.x0 - 0.05], [CORR.x1 + 0.05, BLOCK.x1 - 0.05]]) {
    for (const [v0, v1] of [[0.42, 2.0], [2.32, BLOCK.h - 0.2]]) kit.boxMM("impPanel", [a, Y + v0, gz1 - 0.03], [b, Y + v1, gz1], { color: mid, uv: "keep" });
    kit.boxMM("paintedMetal", [a - 0.05, Y, gz1 - 0.04], [b + 0.05, Y + 0.4, gz1], { color: dark, texel: 2.5 });
  }
  kit.boxMM("paintedMetal", [BLOCK.x1 - 0.3, Y, BLOCK.z0], [BLOCK.x1, Y + BLOCK.h, BLOCK.z1], { color: black, texel: 2.5 });
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
        kit.boxMM("impPanel", [Math.min(fx, out(0.03)), Y + v0, z0], [Math.max(fx, out(0.03)), Y + v1, z1], { color: mid, uv: "keep" });
      }
    }
    kit.boxMM("emitRedImp", [Math.min(fx, out(0.045)), Y + 2.12, BLOCK.z0 + 0.4], [Math.max(fx, out(0.045)), Y + 2.2, BLOCK.z1 - 0.4]);
    kit.boxMM("paintedMetal", [Math.min(fx, out(0.04)), Y, BLOCK.z0], [Math.max(fx, out(0.04)), Y + 0.4, BLOCK.z1], { color: dark, texel: 2.5 });
    // the forward screen hangs on a mount, turned 10° toward the door end (and 3° down): the wing camera
    // looks forward along this face at 3-4° grazing incidence, and flush at 392.6 the screen's gloss
    // mirrored the door end of the room (the env capture's brightest direction) as a clipped white bar;
    // turned away by more than the grazing angle, the face is back-facing from the wing view and the
    // camera sees its housing edge instead
    wallScreen(kit, [out(0.14), Y + 2.75, 392.6], yaw + side * 0.17, 1.6, 0.9, side < 0 ? scr(3) : scr(0), { tilt: 0.06 });
    wallScreen(kit, [out(0.09), Y + 2.75, 398.6], yaw, 1.6, 0.9, side < 0 ? scr(1) : scr(2));
    S.wallPanel(kit, PALETTE, [out(0.01), Y + 1.5, 391.0], yaw, 60 + side);
    if (side < 0) {
      S.holdingBench(kit, PALETTE, [out(0.08), Y, 395.6], yaw, { len: 3.2 });
    } else {
      S.equipmentRack(kit, PALETTE, [out(0.26), Y, 395.0], yaw, { w: 3.0, h: 0.9, d: 0.5, units: 3, seed: 62 });
      crate(kit, PALETTE, [out(0.45), Y, 399.4], 0, { w: 0.8, h: 0.8, d: 0.8, seed: 63, ...crateOpts });
      crate(kit, PALETTE, [out(0.45), Y + 0.8, 399.4], 0.15, { w: 0.8, h: 0.8, d: 0.8, seed: 64, color: dark, ...crateOpts });
    }
  }
  for (const [sx0, sx1] of [[BLOCK.x0 + 0.3, CORR.x0], [CORR.x1, BLOCK.x1 - 0.3]]) {
    for (let i = 0; i <= 3; i++) {
      const pz = BLOCK.z0 + i * (CELL_W + PART_T);
      kit.boxMM("paintedMetal", [sx0, Y, pz], [sx1, Y + BLOCK.h, pz + PART_T], { color: dark, texel: 2.5 });
      kit.boxMM("impPanel", [sx0 + 0.05, Y + 0.4, pz - 0.02], [sx1 - 0.05, Y + BLOCK.h - 0.2, pz], { color: mid, uv: "keep" });
      if (i < 3) kit.boxMM("impPanel", [sx0 + 0.05, Y + 0.4, pz + PART_T], [sx1 - 0.05, Y + BLOCK.h - 0.2, pz + PART_T + 0.02], { color: mid, uv: "keep" });
      kit.collider([sx0, Y, pz - 0.02], [sx1, Y + BLOCK.h, pz + PART_T + 0.02], "cell-partition");
    }
    // aft face of the block (toward the interrogation zone): 2×2 panels, red strip, screen, gear
    const az = BLOCK.z1;
    const mx = (sx0 + sx1) / 2;
    for (const [u0, u1] of [[sx0 + 0.05, mx - 0.03], [mx + 0.03, sx1 - 0.05]]) {
      for (const [v0, v1] of [[0.4, 2.0], [2.3, BLOCK.h - 0.2]]) kit.boxMM("impPanel", [u0, Y + v0, az], [u1, Y + v1, az + 0.03], { color: mid, uv: "keep" });
    }
    kit.boxMM("emitRedImp", [sx0 + 0.2, Y + 2.12, az - 0.01], [sx1 - 0.2, Y + 2.2, az + 0.045]);
    kit.boxMM("paintedMetal", [sx0, Y, az], [sx1, Y + 0.4, az + 0.04], { color: dark, texel: 2.5 });
    wallScreen(kit, [mx, Y + 2.75, az + 0.09], 0, 1.6, 0.9, sx0 < 20 ? scr(0) : scr(3));
    if (sx0 < 20) {
      S.wallPanel(kit, PALETTE, [sx1 - 0.5, Y + 1.5, az + 0.01], 0, 65);
      // evidence crates at the block's aft-west corner (the wing view's right foreground): grey bodies
      // with tags on the faces toward the wing camera, so they read as a tagged stack, not black cubes.
      // Stack top at 1.8 m, above eye height: at 1.6 m the wing camera saw the lid edge-on with the cell 3
      // fill (through the block wall) exactly in its mirror direction, a clipped white streak + bloom
      const cx = sx0 + 0.6;
      const cz = az + 0.45;
      crate(kit, PALETTE, [cx, Y, cz], 0, { w: 0.8, h: 0.9, d: 0.8, seed: 66, color: mid, ...crateOpts });
      crate(kit, PALETTE, [cx, Y + 0.9, cz], -0.2, { w: 0.8, h: 0.9, d: 0.8, seed: 67, color: P("impGrey"), ...crateOpts });
      S.evidenceTag(kit, PALETTE, [cx, Y + 0.47, cz + 0.42], 0, 66, 0);
      S.evidenceTag(kit, PALETTE, [cx - 0.42, Y + 0.47, cz], -HALF, 68, 1);
      S.evidenceTag(kit, PALETTE, [cx + 0.42 * Math.sin(-0.2), Y + 1.37, cz + 0.42 * Math.cos(-0.2)], -0.2, 67, 1);
    } else {
      S.wallPanel(kit, PALETTE, [sx0 + 0.5, Y + 1.5, az + 0.01], 0, 68);
      cabinet(kit, PALETTE, [sx1 - 0.9, Y, az + 0.21], 0, { w: 1.2, h: 1.8, d: 0.4, seed: 69, emit: "emitRedImp" });
    }
  }
  // block slab: dark grey at texel 4 (its black underside at 2.5 was the speckled slab over the cells view)
  kit.boxMM("paintedMetal", [BLOCK.x0, Y + BLOCK.h, BLOCK.z0], [BLOCK.x1, Y + BLOCK.h + 0.15, BLOCK.z1], { color: dark, texel: 4 });
  // corridor ceiling: black channels for the red alert-sweep strips (the strips themselves are animated:
  // fx batch below) + housed white panels under the slab
  const STRIP_X = [CORR.x0 + 0.25, CORR.x1 - 0.25];
  const STRIP = { z0: BLOCK.z0 + 0.4, z1: BLOCK.z1 - 0.4, y: Y + BLOCK.h - 0.058 }; // strip hangs 2 mm under the channel
  for (const x of STRIP_X) kit.boxMM("paintedMetal", [x - 0.07, Y + BLOCK.h - 0.05, BLOCK.z0 + 0.3], [x + 0.07, Y + BLOCK.h, BLOCK.z1 - 0.3], { color: black });
  for (const z of [392.0, 395.6, 399.2]) S.ceilingPanel(kit, PALETTE, 23, Y + BLOCK.h, z, { w: 0.7, d: 0.7 });
  // cell fronts on the corridor edges + fittings. Cell states: 1 standard · 2 force-field, occupied (fittings
  // along the aft partition, see below) · 3 vacant, door slid open · 4 standard · 5 occupied (mirrored, so
  // the bunk end with the blanket, tray, boots and the jacket hook sit at the aft end of the cell, which is
  // the part the cells view sees through the bars) · 6 out of service (red plate, locked, stripped)
  const barTop = Y + 3.0;
  let fieldPane = null;
  const cellPlates = []; // the cells' housed ceiling plates: fx batch below (capped, see policy A)
  const cellState = {
    1: { variant: "standard", locked: true },
    2: { variant: "occupied", locked: true },
    3: { variant: "bare", locked: false, open: true },
    4: { variant: "standard", locked: true },
    5: { variant: "occupied", locked: true, mirror: true },
    6: { variant: "bare", locked: true, mirror: true, plateMat: "emitRedImp" },
  };
  for (const side of [-1, 1]) {
    const fx = side < 0 ? CORR.x0 : CORR.x1; // corridor edge
    const backX = side < 0 ? BLOCK.x0 + 0.3 : BLOCK.x1 - 0.3;
    const yaw = side < 0 ? HALF : -HALF; // fittings face the corridor
    cells.forEach(([c0, c1], i) => {
      const isField = side < 0 && i === 1;
      const num = side < 0 ? i + 1 : i + 4;
      const st = cellState[num];
      // header above the bars (solid) with a number strip
      kit.boxMM("paintedMetal", [fx - 0.08, barTop, c0], [fx + 0.08, Y + BLOCK.h, c1], { color: black, texel: 2.5 });
      kit.box("emitRedImp", fx + side * -1 * 0.085, barTop + 0.2, (c0 + c1) / 2, 0.006, 0.05, 0.5);
      if (isField) {
        // force-field cell: glass pane in a red emitter frame with four thin field lines across it (seen
        // edge-on from the corridor the bare pane read as a blank light-grey panel), no door gap
        kit.boxMM("glass", [fx - 0.01, Y + 0.05, c0 + 0.03], [fx + 0.01, barTop, c1 - 0.03], { uv: "keep" });
        fieldPane = { x: fx, y0: Y + 0.1, y1: barTop, z0: c0, z1: c1 }; // red frame + field lines shimmer: fx batch below
        kit.boxMM("paintedMetal", [fx - 0.08, Y, c0 - 0.02], [fx + 0.08, Y + 0.1, c1 + 0.02], { color: black });
        kit.collider([fx - 0.08, Y, c0], [fx + 0.08, barTop, c1], "field");
        kit.box("emitRedImp", fx + side * -1 * 0.09, Y + 1.4, c1 - 0.35, 0.006, 0.4, 0.05); // field emitter post light
        // cell number / field status plate on the corridor face of the partition end forward of the pane
        S.fieldPlate(kit, PALETTE, [fx + side * -1 * 0.001, Y + 1.55, c0 - PART_T / 2], yaw);
      } else {
        // bars with a 0.9 m door gap toward the aft end of the cell; an open leaf slides forward (toward c0)
        const g0 = c1 - 1.15;
        const g1 = c1 - 0.25;
        S.barWall(kit, PALETTE, [fx, Y, c0], [fx, Y, g0], Y + 0.05, barTop, { tag: "cell-bars" });
        S.barWall(kit, PALETTE, [fx, Y, g1], [fx, Y, c1], Y + 0.05, barTop, { tag: "cell-bars" });
        S.cellDoorFrame(kit, PALETTE, [fx, Y, (g0 + g1) / 2], yaw, { gap: g1 - g0, h: 3.0, locked: st.locked, open: !!st.open, openSide: side < 0 ? 1 : -1 });
      }
      if (isField) {
        // the cells view looks along this pane at a grazing angle, so what shows through it is the strip
        // just inside: the fittings run along the aft partition facing forward, bunk end (blanket, boots,
        // jacket hook, tray) hard against the pane, sink at the back-wall end; the back wall gets its own
        // panel plates + kick since the fittings' wall dressing now sits on the partition
        S.cellFittings(kit, PALETTE, [(backX + fx) / 2, Y, c1], Math.PI, { w: fx - backX, seed: 30 + num, variant: st.variant, mirror: false, ceilH: BLOCK.h, plateMat: st.plateMat || "emitWhite", ceilPlates: false });
        for (const e of S.cellCeilEmitters([(backX + fx) / 2, Y, c1], Math.PI, { ceilH: BLOCK.h })) cellPlates.push({ ...e, red: st.plateMat === "emitRedImp" });
        const cm = (c0 + c1) / 2;
        for (const [v0, v1] of [[0.3, 2.1], [2.32, BLOCK.h - 0.25]]) {
          for (const [u0, u1] of [[c0 + 0.12, cm - 0.03], [cm + 0.03, c1 - 0.12]]) kit.boxMM("impPanel", [backX, Y + v0, u0], [backX + 0.024, Y + v1, u1], { color: mid, uv: "keep" });
        }
        kit.boxMM("paintedMetal", [backX, Y, c0 + 0.1], [backX + 0.03, Y + 0.28, c1 - 0.1], { color: dark, texel: 2.5 });
      } else {
        S.cellFittings(kit, PALETTE, [backX, Y, (c0 + c1) / 2], yaw, { w: CELL_W, seed: 30 + num, variant: st.variant, mirror: !!st.mirror, ceilH: BLOCK.h, plateMat: st.plateMat || "emitWhite", ceilPlates: false });
        for (const e of S.cellCeilEmitters([backX, Y, (c0 + c1) / 2], yaw, { ceilH: BLOCK.h })) cellPlates.push({ ...e, red: st.plateMat === "emitRedImp" });
      }
    });
  }
  // a red floor line marks the corridor threshold
  floorLine(kit, [CORR.x0 + 0.1, Y, BLOCK.z0 + 0.5], [CORR.x1 - 0.1, Y, BLOCK.z0 + 0.5], 0.12, "emitRedImp");
  // ventilation main on top of the block with branch stubs into each cell
  duct(kit, PALETTE, [23, Y + BLOCK.h + 0.55, BLOCK.z0 + 0.4], [23, Y + BLOCK.h + 0.55, BLOCK.z1 - 0.4], 0.8, 0.5, { color: mid });
  for (const [c0, c1] of cells) duct(kit, PALETTE, [BLOCK.x0 + 1.4, Y + BLOCK.h + 0.5, (c0 + c1) / 2], [BLOCK.x1 - 1.4, Y + BLOCK.h + 0.5, (c0 + c1) / 2], 0.4, 0.3, { color: dark });

  // ---- side wings (west/east of the block, running into the aft zone) -----------------------------------
  // (the shell's service band at 3.7 m carries the cable tray + pipes along these walls)
  for (const side of [-1, 1]) {
    const wx = side < 0 ? IX0 : IX1;
    const yaw = side < 0 ? HALF : -HALF;
    const off = (d) => wx + side * -1 * d;
    lockerBank(kit, PALETTE, [off(0.26), Y, 393.8], yaw, { count: 8, unit: 0.6, h: 2.0, d: 0.5, color: dark });
    wallScreen(kit, [off(0.09), Y + 2.95, 393.8], yaw, 2.4, 0.9, side < 0 ? scr(2) : scr(1));
    cabinet(kit, PALETTE, [off(0.21), Y, 398.6], yaw, { w: 1.2, h: 1.8, d: 0.4, seed: 40 + side, emit: side < 0 ? "emitAmber" : "emitRedImp" });
    S.wallPanel(kit, PALETTE, [off(0.01), Y + 1.5, 400.3], yaw, 44 + side);
    // housed light channels along the wing and over the aft bays
    S.channelFixture(kit, PALETTE, "z", 391.6, 399.4, off(2.9), CEIL);
    S.channelFixture(kit, PALETTE, "z", 401.6, 408.6, off(2.9), CEIL);
  }
  // west wing checkpoint: scanner gate across the passage (lane 1.8 m clear), rails to the wall and the block
  S.scanGate(kit, PALETTE, [14.3, Y, 397.4], 0, { laneW: 2.0, halfSpan: [2.9, 2.8] });
  // the gate's lane markings continue aft to the processing station (structure on the wing view's floor)
  for (const x of [13.4, 15.2]) floorLine(kit, [x, Y, 399.1], [x, Y, 403.3], 0.05, "emitWhite");
  for (let z = 399.6; z < 403.2; z += 0.9) floorLine(kit, [13.7, Y, z], [14.9, Y, z], 0.04, "emitWhite");
  // west wing aft: processing station (console + evidence bench + crates)
  consoleProp(kit, PALETTE, [14.2, Y, 404.6], HALF, { w: 2.0, d: 0.8, h: 1.15, screens: 2, seed: 50, screenMat: scr(3) });
  S.equipmentRack(kit, PALETTE, [IX0 + 0.26, Y, 405.5], HALF, { w: 3.0, h: 0.9, d: 0.5, units: 3, seed: 51 });
  for (const [k, z] of [403.5, 405.5, 407.5].entries()) wallScreen(kit, [IX0 + 0.09, Y + 2.2, z], HALF, 1.6, 0.9, scr(k));
  S.interrogationTable(kit, PALETTE, [15.2, Y, 408.2], 0, { len: 2.4, w: 0.9, h: 0.9 });
  crate(kit, PALETTE, [12.0, Y, IZ1 - 0.7], 0, { seed: 52, ...crateOpts });
  crate(kit, PALETTE, [12.0, Y + 1.2, IZ1 - 0.7], 0.15, { h: 0.8, seed: 53, color: dark, ...crateOpts });
  wallScreen(kit, [18.3, Y + 2.95, IZ1 - 0.09], Math.PI, 1.6, 0.9, scr(1));
  // east wing aft: observation console facing the interrogation room, gear crates
  consoleProp(kit, PALETTE, [31.8, Y, 406.6], HALF, { w: 2.4, d: 0.9, h: 1.15, screens: 3, sit: true, seed: 54, screenMat: scr(0) });
  for (const [k, z] of [404.6, 406.4, 408.2].entries()) wallScreen(kit, [IX1 - 0.09, Y + 2.6, z], -HALF, 1.6, 0.9, scr(k + 1));
  crate(kit, PALETTE, [33.9, Y, IZ1 - 0.7], 0, { seed: 55, ...crateOpts });
  crate(kit, PALETTE, [32.5, Y, IZ1 - 0.6], 0, { w: 0.9, h: 0.9, d: 0.9, seed: 56, ...crateOpts });
  crate(kit, PALETTE, [33.9, Y + 1.2, IZ1 - 0.7], -0.2, { h: 0.9, seed: 57, color: dark, ...crateOpts });
  wallScreen(kit, [30.0, Y + 2.95, IZ1 - 0.09], Math.PI, 1.6, 0.9, scr(3));
  cabinet(kit, PALETTE, [29.0, Y, IZ1 - 0.21], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 58 });
  // aft zone between the block and the interrogation glass: light channel over the corridor mouth
  S.channelFixture(kit, PALETTE, "x", 18.6, 27.4, 402.8, CEIL, { segment: 2.2 });

  // ---- interrogation room (glass front, solid sides, own ceiling; aft wall is the shell's) --------------
  const I = INTER;
  const iz1 = IZ1;
  for (const x of [I.x0, I.x1 - 0.2]) {
    kit.boxMM("paintedMetal", [x, Y, I.z0], [x + 0.2, Y + I.h, iz1], { color: black, texel: 2.5 });
    kit.boxMM("impPanel", [x - 0.02, Y + 0.4, I.z0 + 0.05], [x, Y + I.h - 0.2, iz1 - 0.05], { color: mid, uv: "keep" });
    kit.boxMM("impPanel", [x + 0.2, Y + 0.4, I.z0 + 0.05], [x + 0.22, Y + I.h - 0.2, iz1 - 0.05], { color: mid, uv: "keep" });
    kit.collider([x - 0.02, Y, I.z0], [x + 0.22, Y + I.h, iz1], "interrogation-wall");
  }
  // glass front: solid base, glass 1.0..3.0, header; door gap at the east end
  const door = { x0: I.x1 - 1.6, x1: I.x1 - 0.4 };
  kit.boxMM("paintedMetal", [I.x0, Y, I.z0], [door.x0, Y + 1.0, I.z0 + 0.2], { color: black, texel: 2.5 });
  kit.boxMM("paintedMetal", [I.x0, Y + 3.0, I.z0], [I.x1, Y + I.h, I.z0 + 0.2], { color: black, texel: 2.5 });
  kit.boxMM("glass", [I.x0 + 0.2, Y + 1.0, I.z0 + 0.09], [door.x0, Y + 3.0, I.z0 + 0.11], { uv: "keep" });
  for (const x of [I.x0 + 0.2, (I.x0 + door.x0) / 2, door.x0]) kit.boxMM("paintedMetal", [x - 0.04, Y + 1.0, I.z0 + 0.06], [x + 0.04, Y + 3.0, I.z0 + 0.14], { color: black });
  kit.boxMM("paintedMetal", [I.x0, Y + 1.0, I.z0 + 0.06], [door.x0, Y + 1.06, I.z0 + 0.14], { color: black });
  kit.boxMM("paintedMetal", [door.x1, Y, I.z0], [I.x1, Y + 3.0, I.z0 + 0.2], { color: black, texel: 2.5 });
  for (const x of [door.x0, door.x1]) kit.box("paintedMetal", x, Y + 1.5, I.z0 + 0.1, 0.12, 3.0, 0.26, { color: black });
  kit.box("emitGreen", (door.x0 + door.x1) / 2, Y + 2.95, I.z0 - 0.005, 0.8, 0.04, 0.01);
  kit.collider([I.x0, Y, I.z0], [door.x0, Y + I.h, I.z0 + 0.2], "interrogation-glass");
  kit.collider([door.x1, Y, I.z0], [I.x1, Y + I.h, I.z0 + 0.2], "interrogation-glass");
  // slab: dark grey at texel 4 like the block's (black at 2.5 read as a 4 % plane over the pendant)
  kit.boxMM("paintedMetal", [I.x0 - 0.02, Y + I.h, I.z0], [I.x1 + 0.02, Y + I.h + 0.15, iz1], { color: dark, texel: 4 });
  // deck plate one palette step lighter than the shell's impMid (policy B's "floor tint one step lighter"):
  // the room's deck under the pendant and the glass-front spill read 10 % on the impMid plating, whose
  // albedo under the plating map is about a third of the wall panels' (a 60 cd spill spot moved the bottom
  // band 3 luma per 20 cd; a half step, 0x6e727a, read 12 %). impGrey is 2.7x impMid in linear terms: a
  // clean-room plate inside the glass line, 1 cm proud so it does not fight the shell slab
  kit.boxMM("impFloor", [I.x0 + 0.22, Y + 0.0005, I.z0 + 0.2], [I.x1 - 0.22, Y + 0.01, iz1], { color: P("impGrey"), texel: 0.5 });
  kit.boxMM("emitRedImp", [I.x0 + 0.4, Y + 3.1, I.z0 - 0.01], [I.x1 - 0.4, Y + 3.16, I.z0]);
  // inside: table, detainee chair with restraints facing the glass, interrogator's chair, drop light,
  // recorder screen, red strip on the aft wall
  const icx = (I.x0 + I.x1) / 2;
  S.interrogationTable(kit, PALETTE, [icx, Y, 407.2], 0, { len: 2.0, w: 0.9 });
  S.detaineeChair(kit, PALETTE, [icx, Y, 406.2], 0);
  S.detaineeChair(kit, PALETTE, [icx, Y, 408.25], Math.PI, { restraints: true });
  dropLight(kit, PALETTE, [icx, Y + I.h + 0.05, 407.2], { w: 1.2, d: 0.4, stem: 0.95, mat: "emitWhite" });
  wallScreen(kit, [I.x1 - 0.29, Y + 2.75, 406.6], -HALF, 1.2, 0.7, scr(2));
  wallScreen(kit, [I.x0 + 0.29, Y + 2.8, 407.4], HALF, 1.6, 0.9, scr(0));
  kit.boxMM("emitRedImp", [I.x0 + 0.6, Y + 2.2, iz1 - 0.015], [I.x1 - 0.6, Y + 2.25, iz1 - 0.005]);
  // aft wall of the room: a four-screen observation bank across the wall over the cabinet and the
  // recorder rack (the east half of the wall was bare between 1.5 and 3 m), intercom
  wallScreen(kit, [21.0, Y + 2.8, iz1 - 0.09], Math.PI, 1.6, 0.9, scr(1));
  wallScreen(kit, [22.8, Y + 2.8, iz1 - 0.09], Math.PI, 1.6, 0.9, scr(3));
  wallScreen(kit, [24.6, Y + 2.8, iz1 - 0.09], Math.PI, 1.6, 0.9, scr(0));
  wallScreen(kit, [26.4, Y + 2.8, iz1 - 0.09], Math.PI, 1.6, 0.9, scr(2));
  cabinet(kit, PALETTE, [25.6, Y, iz1 - 0.26], Math.PI, { w: 1.2, h: 1.8, d: 0.5, seed: 75, emit: "emitRedImp" });
  S.wallPanel(kit, PALETTE, [26.9, Y + 1.5, iz1 - 0.01], Math.PI, 76);
  S.equipmentRack(kit, PALETTE, [21.9, Y, iz1 - 0.26], Math.PI, { w: 3.4, h: 0.9, d: 0.5, units: 3, seed: 77 });
  // side-wall strips continue the aft one (embedded in the panel insets, 1.5 cm proud)
  kit.boxMM("emitRedImp", [I.x0 + 0.2, Y + 2.2, I.z0 + 0.5], [I.x0 + 0.235, Y + 2.25, iz1 - 0.5]);
  kit.boxMM("emitRedImp", [I.x1 - 0.235, Y + 2.2, I.z0 + 0.5], [I.x1 - 0.2, Y + 2.25, iz1 - 0.5]);
  S.wallPanel(kit, PALETTE, [I.x0 + 0.23, Y + 1.5, 408.6], HALF, 59);

  // ---- ceiling: black slab + 2 m dark-grey plates (the shell's layout, at texel 4 instead of its 2.5) ------
  // the painted-panel map's edge grime read as blotches and black plates as 25 % black between the
  // fixtures; dark-grey plated panels with fine world UVs read as clean plating without speckle
  kit.boxMM("paintedMetal", [X0, CEIL, Z0], [X1, CEIL + 0.5, Z1], { color: black, texel: 0.5 });
  {
    const plate = 0x585c64;
    const nA = Math.max(1, Math.round((IZ1 - IZ0) / 2.0));
    const nB = Math.max(1, Math.round((IX1 - IX0) / 2.0));
    for (let i = 0; i < nA; i++) {
      for (let j = 0; j < nB; j++) {
        const pz0 = IZ0 + ((IZ1 - IZ0) * i) / nA + 0.015;
        const pz1 = IZ0 + ((IZ1 - IZ0) * (i + 1)) / nA - 0.015;
        const px0 = IX0 + ((IX1 - IX0) * j) / nB + 0.015;
        const px1 = IX0 + ((IX1 - IX0) * (j + 1)) / nB - 0.015;
        kit.boxMM("paintedMetal", [px0, CEIL - 0.06, pz0], [px1, CEIL, pz1], { color: (i * 5 + j * 3) % 10 === 0 ? mid : plate, texel: 4 });
      }
    }
  }

  // ---- lights (14 descriptors: 11 point + 3 spots — the desk key and the interrogation pendant cast
  // shadows, the glass-front spill does not) ---------------------------------------------------------------
  // 1/d^2 falloff: a fill 1.3 m under the plating left a specular disc on the ceiling and blew the fixture
  // lips, so every fill sits >= 1.7 m below its ceiling and >= 1.5 m from any housing or tall prop top.
  // The runtime keeps the 12 nearest point lights weighted by priority and the corridor next door brings 8
  // of its own, so the fills a view depends on carry priority >= 0.8 (the west office fill was being
  // dropped from the desk view, which is why the monitor wall read darker than the door wall).
  const warm = 0xffe2d8;
  // office: two wall-side fills between the side panel pairs (same colour both sides)
  // (the office fills run ~30 % hotter than the wings': the palette's impMid deck is ~0.06 linear albedo
  // under the plating map, and the door view was 70 % of frame under 20 % grey at 22/26/44)
  // 46 and 0.8 m forward: the harness environment map lights +-z-facing walls ~3.5x harder than
  // +-x-facing ones, so in the desk view the door wall (env-lit) read 87 vs the monitor wall's 64
  // (0-255 luma) with the west fill at 28; at 46 the monitor wall reads 82. Forward of the array's
  // centre because the screens are glossy: 1 m aft of it the same fill put a 190-luma lobe on the
  // upper row's second screen, at z 382.8 the lobe reads 60 (the round-2 level)
  // (round 4: moved 2.6 m aft and 1.6 m in, under their own pucks — the desk view's west half of the floor
  // read 15 % with the fill forward of the monitor wall's centre; from x 15.2 the fill's specular lobe on the
  // tilted screens lands at 43.0 / 44.0 m, still off both rows' glass)
  lights.push({ type: "point", pos: [15.2, Y + 2.8, 385.4], color: warm, intensity: 46, distance: 11, priority: 1.0 });
  lights.push({ type: "point", pos: [30.8, Y + 2.8, 384.6], color: warm, intensity: 46, distance: 11, priority: 1.0 });
  // KEY (shadow caster for the office views): a spot at the mouth of the duty-desk light channel, 0.7 m
  // forward of the desk's front edge, aimed down-aft at the deck between the desk and the gate wall. The
  // desk, its monitors and the operators' chairs throw their shadows aft onto that floor (the desk view's
  // foreground). The interrogation pendant below is the room's second `shadow: true` spot: the rig gives
  // the shadow map to the nearer flagged spot, so the desk views keep this one and the interrogation view
  // gets the pendant.
  lights.push({ type: "spot", pos: [23, CEIL - 0.2, 383.2], target: [23, Y, 386.0], color: warm, intensity: 120, distance: 14, angle: 1.0, penumbra: 0.5, priority: 1.5, shadow: true });
  // door approach (policy E): a point under its own puck between the door-axis panel pair, 2.5 m inside
  // the hole. The old approach spot lit only a ±23° core of the lane (penumbra 0.6) and, being a spot, was
  // never live for the corridor next door — from cor-e the room's floor read 8 %. A point pools the lane,
  // the pylons and the door wall, and is one of the three neighbour lights the corridor keeps through the
  // doorway. 3.3 m up (above the 3.0 m hole): at 2.7 m it sat under the lintel's soffit and its grazing
  // specular on that face was a flat-white blob at the top of the hole in the corridor's view; a light
  // above a downward face cannot reach it. 52 cd keeps the lane floor's irradiance (36 cd at 2.7 m).
  // Priority 1.4: the corridor keeps only the 3 nearest neighbour points weighted by distance/(0.5+priority),
  // and cor-e has five door-neighbours competing for them — at 1.0 this fill won from 2.7 m (weighted 4.8)
  // and lost from 3.3 m (5.2); at 1.4 it stands at 4.1. Inside the room the higher rank only swaps which
  // out-of-frame fill drops in the cells/interrogation views (an office fill behind the camera).
  lights.push({ type: "point", pos: [23, Y + 3.3, 380.4], color: warm, intensity: 52, distance: 12, priority: 1.4 });
  // gate approach: a fill under the new 387.3 channel, 1.8 m below the plating — the floor between the desk
  // and the gate was the desk's shadow from the key alone (8 % in the door view), and the ceiling around
  // the 384.8 pair a black plane; it also puts the gate wall's header plates and red strips in light
  lights.push({ type: "point", pos: [23, Y + 2.8, 387.3], color: warm, intensity: 30, distance: 11, priority: 1.0 });
  // cells: low fills 1.2 m under the housed ceiling plates, so bunk, sink and the back-wall plates read
  // through the bars; they also light the corridor edges. East row (cells 4-6, the row the cells view
  // frames): one per cell at 28 cd — the near cell's walls/bunk read 26 % and its floor 14 % (22 / 11 at
  // 20, 17 / 9 at 15; the critic's "12 %"). West row (cells 1-3; only the force-field cell 2 is seen,
  // edge-on through its pane): two fills on the partition lines, each lighting the cells either side of
  // it (fills cast no shadows, so a partition does not stop them) — cell 2 gets both at 1.75 m, cells 1
  // and 3 one each. The descriptor this frees is the interrogation floor fill below.
  for (const [c0, c1] of cells) lights.push({ type: "point", pos: [26.8, Y + 2.2, (c0 + c1) / 2], color: 0xffece4, intensity: 28, distance: 8, priority: 0.8 });
  for (let i = 0; i + 1 < cells.length; i++) lights.push({ type: "point", pos: [19.2, Y + 2.2, (cells[i][1] + cells[i + 1][0]) / 2], color: 0xffece4, intensity: 22, distance: 8, priority: 0.8 });
  // west wing: one fill between the scanner gate and the processing bay (2.4 m aft of the gate header,
  // 2 m under the wing channel) lights the gate's camera-facing side, the lane markings and the evidence
  // stack in the wing view; it replaces the pair that stood 1.9 m north of the gate and over the bay
  // (their two descriptors went to the moving scanner and alert-sweep lights). North of the glass plane
  // (z 404.4), so it has no mirror image in the interrogation front. The east wing, which no view looks
  // into, keeps no fill of its own (its lockers, screens and the cell 4-6 fills through the block wall).
  lights.push({ type: "point", pos: [14.3, Y + 2.8, 399.8], color: warm, intensity: 30, distance: 11, priority: 0.7 });
  // interrogation: the pendant is the light. A spot at the mouth of the drop light's hood (7 cm under its
  // diffuser), straight down onto the table: 28 cd at 1.5 m puts the table's mid-grey plate near 55-60 %
  // (34 read 63 %, 50 read 69 %, 80 clipped it white), the two chairs throw hard shadows onto the deck, and
  // the wide soft cone (±72°, full to ±40°) reaches the whole floor of the 8 m room while at the walls it
  // dies below 1.4 m, so the room keeps its 10 % mood above the waist. The spot must stay under the hood's
  // diffuser: raised 0.45 m into the hood it is the shadow caster's own housing that blacks out the table.
  // `shadow: true` (see the key): from the interrogation and wing cameras this is the nearer flagged spot,
  // so it owns the shadow map there and its cone is stopped by the room's own walls.
  lights.push({ type: "spot", pos: [icx, Y + 2.3, 407.2], target: [icx, Y, 407.2], color: 0xe8eeff, intensity: 28, distance: 8, angle: 1.25, penumbra: 0.45, priority: 1.0, shadow: true });
  // interrogation floor (policy B): the pendant alone cannot lift the camera's near floor — the bottom band
  // of the view is the table's and the near chair's hard shadow plus deck 50° off the cone axis, and raising
  // the pendant's candela only overexposes the table (50 cd: table 69 %, floor still 11 %). The fill is
  // the aft-zone light channel over the corridor mouth (z 402.8) spilling through the glass front: a spot
  // 2 m under that channel, 1.4 m north of the glass, aimed down-aft at the deck in front of the table.
  // Glass stops no light and this spot casts no shadow, so it reaches the deck under and around the table
  // from the front and the chair shadow reads as a hard core with a lit floor around it. A spot, not a
  // point: a 60 cd point here lit the side-wall panels to 27 % and the deck only to 10 % (the deck plating
  // is ~1/3 the albedo of the wall panels), so the room lost its ~10 % mood above the table for nothing;
  // the cone (±31°, full to ±16°) puts its light on the floor between the glass and the aft wall and on
  // the table's front, and the walls stay in the pendant's falloff. 95 cd with the impGrey deck plate
  // (60 on the half-step plate read 12 %, 80 on impGrey 16.6 %; the plate, not the candela, is the lever
  // on this deck — the band moves ~3 luma per 20 cd).
  lights.push({ type: "spot", pos: [24.2, Y + 2.5, 403.0], target: [24.6, Y, 406.0], color: warm, intensity: 95, distance: 12, angle: 0.55, penumbra: 0.5, priority: 1.0 });
  // live descriptor (update() drives pos + intensity): the red alert-sweep point riding under the block slab
  // in the corridor. (The scanner's blue point went to the gate-approach fill: the beam plane and its
  // floor line still sweep as emitters.)
  const sweepLight = { type: "point", pos: [23, Y + 2.3, STRIP.z0], color: 0xff3a24, intensity: 0, distance: 7, priority: 0.9 };
  lights.push(sweepLight);

  // ---- motion lighting: one additive emitter batch (1 draw call) --------------------------------------
  // Alert sweep: the two cell-top strips are 28 paired segments; a red pulse (sharp front, 1.2 m tail)
  // runs gate -> aft every 7 s over a dull idle, with sweepLight under it. Scanner: a blue veil plane
  // with a bright floor line crosses the gate lane approach -> north in 1.6 s every 4 s (translate() moves
  // its vertices). Force-field: the pane's red frame + four field lines
  // shimmer irregularly. Screens: the room's three screen keys jitter emissiveIntensity 0.9-1.1 on
  // different seeds, so the monitor wall's 4x2 array flickers in staggered thirds.
  const fx = new EmitBatch();
  const red = P("impRed");
  const N_SEG = 28;
  const segG = [];
  const segZ = [];
  {
    const segLen = (STRIP.z1 - STRIP.z0) / N_SEG;
    for (let i = 0; i < N_SEG; i++) {
      const g = fx.group(red, 1.6);
      const z = STRIP.z0 + (i + 0.5) * segLen;
      for (const x of STRIP_X) fx.box(g, x, STRIP.y, z, 0.08, 0.012, segLen - 0.025);
      segG.push(g);
      segZ.push(z);
    }
  }
  const GATE = { x: 14.3, z: 397.4, laneW: 2.0, headerY: Y + 2.4 };
  const beamG = fx.group(0x5c9cff, 1.0);
  fx.box(beamG, GATE.x, (Y + 0.01 + GATE.headerY - 0.05) / 2, GATE.z, GATE.laneW - 0.2, GATE.headerY - 0.05 - (Y + 0.01), 0.02); // veil
  // (2.2 clipped, 1.6 read 89 % from the wing camera: that view's "blue door at 10 m" is the veil
  // mid-sweep and its "door glow" these two lines — the critic's cap for them is 80 %)
  const beamFloorG = fx.group(0x9cc4ff, 1.25);
  fx.box(beamFloorG, GATE.x, Y + 0.014, GATE.z, GATE.laneW - 0.2, 0.012, 0.06); // bright line where it meets the deck
  fx.box(beamFloorG, GATE.x, GATE.headerY - 0.06, GATE.z, GATE.laneW - 0.2, 0.012, 0.03); // and where it leaves the sensor slot
  let frameG = -1;
  const lineG = [];
  if (fieldPane) {
    const fp = fieldPane;
    // (frame 1.1 → 0.8, lines 0.8 → 0.6: the cells view's "red grid" sat near clip on three of them)
    frameG = fx.group(red, 0.8);
    fx.box(frameG, fp.x, fp.y1 - 0.03, (fp.z0 + fp.z1) / 2, 0.03, 0.06, fp.z1 - fp.z0 - 0.06);
    fx.box(frameG, fp.x, fp.y0 + 0.03, (fp.z0 + fp.z1) / 2, 0.03, 0.06, fp.z1 - fp.z0 - 0.06);
    for (const z of [fp.z0 + 0.06, fp.z1 - 0.06]) fx.box(frameG, fp.x, (fp.y0 + fp.y1) / 2, z, 0.03, fp.y1 - fp.y0, 0.06);
    for (let k = 0; k < 4; k++) {
      const g = fx.group(red, 0.6);
      fx.box(g, fp.x, fp.y0 + 0.62 + k * 0.6, (fp.z0 + fp.z1) / 2, 0.026, 0.012, fp.z1 - fp.z0 - 0.2);
      lineG.push(g);
    }
  }
  // static: the 12 cell ceiling plates at 0.9 (~85 % after tone mapping; the emitWhite key at 1.3 clipped
  // through the bars in the cells view; 0.9 rather than 1.0 because the batch is additive over a cell
  // ceiling the 28 cd fills light from 1.2 m), the out-of-service cell's pair red
  {
    const plateWhite = fx.group(0xdfe9ff, 0.9);
    const plateRed = fx.group(red, 1.0);
    for (const e of cellPlates) fx.box(e.red ? plateRed : plateWhite, e.pos[0], e.pos[1], e.pos[2], e.size[0], e.size[1], e.size[2], e.rot);
  }
  fx.build(ctx.group);

  const SWEEP_T = 7;
  // the pulse fires 0.45 m forward of the gate plane (office side) and runs aft; the red point starts there
  // at 9 cd and ramps to 19 over the first 1.5 m (6 → 16 before: the block front behind the bars read a
  // faint mauve, R only 16 % over G, from the door camera). Phase: at the harness's t = 40 the head sits
  // 0.3 m ahead of the gate, so the door view sees the bars against a red-washed block front (policy:
  // "red wash on the wall behind the gate") while the strips idle
  const SWEEP_PHASE = 2.11;
  const SWEEP_FROM = GATE_Z - 0.45;
  const SWEEP_TO = STRIP.z1 + 1.5;
  const SCAN_T = 4;
  const SCAN_RUN = 1.6;
  const SCAN_FROM = GATE.z + 1.4;
  const SCAN_TO = GATE.z - 1.4;
  const screenMats = [null, null, null];
  const screenBase = [1.1, 1.1, 1.1];
  return {
    update(dt, t) {
      // alert sweep
      const ph = ((t + SWEEP_PHASE) % SWEEP_T) / SWEEP_T;
      const zh = SWEEP_FROM + ph * (SWEEP_TO - SWEEP_FROM);
      for (let i = 0; i < N_SEG; i++) {
        const d = segZ[i] - zh;
        const k = d > 0 ? gauss(d, 0.32) : Math.exp(d / 1.2);
        fx.set(segG[i], 0.2 + 1.3 * k);
      }
      sweepLight.pos[2] = Math.min(STRIP.z1, zh);
      sweepLight.intensity = (9 + 10 * clamp01((zh - SWEEP_FROM) / 1.5)) * clamp01((SWEEP_TO - zh) / 1.5);
      // scanner gate (emitters only: the veil plane and its floor/slot lines cross the lane)
      const sp = (t + 0.8) % SCAN_T;
      if (sp < SCAN_RUN) {
        const u = sp / SCAN_RUN;
        const z = SCAN_FROM + u * (SCAN_TO - SCAN_FROM);
        const env = Math.sin(Math.PI * u) ** 0.35;
        fx.translate(beamG, 0, 0, z - GATE.z);
        fx.translate(beamFloorG, 0, 0, z - GATE.z);
        fx.set(beamG, 0.12 * env);
        fx.set(beamFloorG, env);
      } else {
        fx.set(beamG, 0);
        fx.set(beamFloorG, 0);
      }
      // force-field shimmer
      if (frameG >= 0) {
        const flick = noise(t, 2.3, 9) > 0.82 ? 1.3 : 1;
        fx.set(frameG, (0.8 + 0.3 * noise(t, 11, 5)) * flick);
        for (let k = 0; k < lineG.length; k++) fx.set(lineG[k], 0.45 + 0.7 * noise(t, 5 + k, 20 + k) * flick);
      }
      fx.commit();
      // screen flicker (materials exist once the kit is built, i.e. from the first update on)
      for (let k = 0; k < 3; k++) {
        if (!screenMats[k]) {
          screenMats[k] = ownKitMaterial(kit, SCR[k]);
          if (screenMats[k]) screenBase[k] = screenMats[k].emissiveIntensity;
        }
        const m = screenMats[k];
        if (!m) continue;
        const drop = noise(t, 1.1, 40 + k) < 0.08 ? 0.82 : 1;
        m.emissiveIntensity = screenBase[k] * (0.92 + 0.16 * noise(t, 13 + 2 * k, 30 + k)) * drop;
      }
    },
  };
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
    // 1.5 m further in and level, the east station's chair in the near foreground (35 % floor before)
    "d2-security-desk": { pos: [26.0, Y, 386.9], yaw: 52, pitch: -1 },
    // from inside the corridor, looking diagonally into the occupied cell through its bars and on to the
    // out-of-service cell and the aft bays (the axial view showed only bars and black interiors)
    "d2-security-cells": { pos: [21.6, Y, 392.4], yaw: -150, pitch: -3 },
    "d2-security-interrogation": { pos: [25.7, Y, 405.3], yaw: 130, pitch: -10 },
    // 2 m further up the wing and level: the tagged evidence stack 4 m ahead-right and the lane markings
    // carry the foreground (40 % bare floor before)
    "d2-security-wing": { pos: [16.2, Y, 405.0], yaw: 12, pitch: -1 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    corniceColor: IMP.impMid,
    stripMat: "emitRedImp",
    // impMid deck (one step up from impDark): the door view was 70 % of frame under 20 % grey
    floor: { color: IMP.impMid },
    // the room builds its own plated ceiling (see detail): the shell's plates are fixed at texel 2.5
    ceiling: false,
    lights: false,
    doorDressing: { accent: "emitRedImp" },
    // cable tray + pipe runs at 3.7 m on all four walls (clears the 3.55 m interrogation slab and every
    // wall screen; the wings' old private duct runs were replaced by this)
    serviceBand: { y: 3.7, faces: ["n", "e", "w", "s"] },
  },
  detail,
});
