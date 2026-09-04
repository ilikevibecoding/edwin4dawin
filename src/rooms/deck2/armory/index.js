// Deck 2 armory: issue counter under a full-height security cage just inside the door, rifle racks and
// armour lockers behind it, ammo crates aft, a blast-shield test alcove in the aft-west corner. Dark
// grey, red strips, dark ceiling (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP, col } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { console as consoleProp, crate, lockerBank, cabinet, wallScreen, floorLine, hazardStrip, dropLight, pipe } from "../_shared/props.js";
import * as A from "./props.js";

const Y = 40;
const CEIL = 44.6;
const X0 = -27;
const X1 = -11;
const Z0 = 377.5;
const Z1 = 400;
const IX0 = X0 + 0.3;
const IX1 = X1 - 0.3;
const IZ0 = Z0 + 0.3;
const IZ1 = Z1 - 0.3;
const HALF = Math.PI / 2;

const CAGE_Z = 382.15; // centre plane of the cage bars
const COUNTER = { x0: -21.5, x1: -16.5, z0: 381.8, z1: 382.5 };
const GATE = { x0: -25.7, x1: -24.5 }; // open cage door on the west flank

function detail(ctx) {
  const { kit, PALETTE, lights } = ctx;
  const P = (k) => col(PALETTE, k);
  const black = P("impBlack");
  const dark = P("impDark");
  const steel = P("steel");

  // ---- vestibule ----------------------------------------------------------------------------------
  floorLine(kit, [IX0 + 0.1, Y, 381.15], [IX1 - 0.1, Y, 381.15], 0.12, "emitRedImp");
  A.noticeBoard(kit, PALETTE, [-22.6, Y + 1.7, IZ0 + 0.01], 0, { w: 1.2, h: 0.9, seed: 61 });
  wallScreen(kit, [-24.6, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, "screenImp1");
  cabinet(kit, PALETTE, [-26.0, Y, IZ0 + 0.21], 0, { w: 1.1, h: 1.8, d: 0.4, seed: 62, emit: "emitRedImp" });
  A.waitBench(kit, PALETTE, [-14.6, Y, IZ0 + 0.16], 0, { len: 2.6 });
  wallScreen(kit, [-14.6, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, "screenImp1");
  A.noticeBoard(kit, PALETTE, [-12.3, Y + 1.7, IZ0 + 0.01], 0, { w: 0.9, h: 0.9, seed: 63 });
  pipe(kit, PALETTE, [IX1 - 0.4, Y + 0.2, 380.6], [IX1 - 0.4, Y + 4.4, 380.6], 0.08, { color: steel, bracket: 1.5 });
  pipe(kit, PALETTE, [IX1 - 0.4, Y + 0.2, 380.95], [IX1 - 0.4, Y + 4.4, 380.95], 0.05, { color: dark, bracket: 1.5 });

  // ---- cage line: counter with hatch, bars floor→ceiling on the flanks, bars above the counter ------
  A.issueCounter(kit, PALETTE, { ...COUNTER, y: Y, h: 0.9 });
  const cz = CAGE_Z;
  const top = Y + 4.3;
  // west flank in two runs around the open gate; east flank in one run
  A.barWall(kit, PALETTE, [IX0, Y, cz], [GATE.x0, Y, cz], Y + 0.05, top, { tag: "cage-w1" });
  A.barWall(kit, PALETTE, [GATE.x1, Y, cz], [COUNTER.x0, Y, cz], Y + 0.05, top, { tag: "cage-w2" });
  A.barWall(kit, PALETTE, [COUNTER.x1, Y, cz], [IX1, Y, cz], Y + 0.05, top, { tag: "cage-e" });
  // above the counter: left / right of the hatch full height, hatch header above the opening
  const hx0 = -19.62;
  const hx1 = -18.38;
  A.barWall(kit, PALETTE, [COUNTER.x0, Y, cz], [hx0, Y, cz], Y + 0.94, top, { collide: false });
  A.barWall(kit, PALETTE, [hx1, Y, cz], [COUNTER.x1, Y, cz], Y + 0.94, top, { collide: false });
  A.barWall(kit, PALETTE, [hx0, Y, cz], [hx1, Y, cz], Y + 1.76, top, { collide: false });
  kit.collider([COUNTER.x0, Y + 0.9, cz - 0.06], [COUNTER.x1, top, cz + 0.06], "cage-counter");
  // open gate leaf swung into the room along +Z at the gate's east post
  A.barWall(kit, PALETTE, [GATE.x1 + 0.06, Y, cz + 0.1], [GATE.x1 + 0.06, Y, cz + 1.3], Y + 0.05, Y + 2.3, { tag: "cage-leaf" });
  // frame posts + header to the ceiling with a red light strip
  for (const x of [IX0 + 0.08, GATE.x0, GATE.x1, COUNTER.x0, COUNTER.x1, IX1 - 0.08]) kit.box("paintedMetal", x, Y + (CEIL - Y) / 2, cz, 0.14, CEIL - Y, 0.14, { color: black, texel: 1 });
  kit.boxMM("paintedMetal", [IX0, top, cz - 0.12], [IX1, CEIL, cz + 0.12], { color: black, texel: 1 });
  kit.boxMM("emitRedImp", [IX0 + 0.3, top + 0.1, cz - 0.125], [IX1 - 0.3, top + 0.14, cz - 0.12]);
  kit.boxMM("emitRedImp", [IX0 + 0.3, top + 0.1, cz + 0.12], [IX1 - 0.3, top + 0.14, cz + 0.125]);
  kit.boxMM("paintedMetal", [GATE.x0 - 0.07, Y + 2.3, cz - 0.1], [GATE.x1 + 0.07, Y + 2.4, cz + 0.1], { color: black });
  kit.box("emitGreen", (GATE.x0 + GATE.x1) / 2, Y + 2.35, cz - 0.105, 0.3, 0.04, 0.01);
  // issue console behind the counter (operator faces the door over the screens)
  consoleProp(kit, PALETTE, [-15.4, Y, 383.5], 0, { w: 1.8, d: 0.8, h: 1.15, screens: 2, seed: 64, screenMat: "screenImp1" });

  // ---- west wall: rifle racks, pistol lockers -------------------------------------------------------
  A.rifleRack(kit, PALETTE, [IX0 + 0.1, Y, 385.6], HALF, { seed: 71 });
  A.rifleRack(kit, PALETTE, [IX0 + 0.1, Y, 389.4], HALF, { seed: 72 });
  A.pistolLockers(kit, PALETTE, [IX0 + 0.21, Y, 392.7], HALF, { cols: 4, rows: 3, seed: 73 });
  wallScreen(kit, [IX0 + 0.09, Y + 3.2, 392.7], HALF, 1.6, 0.8, "screenImp1");
  cabinet(kit, PALETTE, [IX0 + 0.21, Y, 394.4], HALF, { w: 1.0, h: 1.8, d: 0.4, seed: 74 });

  // ---- east wall: armour lockers (two open), rifle rack, maintenance bench ------------------------
  lockerBank(kit, PALETTE, [IX1 - 0.26, Y, 385.6], -HALF, { count: 6, unit: 0.6, h: 2.0, d: 0.5, color: P("impDark") });
  A.openArmourLocker(kit, PALETTE, [IX1 - 0.29, Y, 388.0], -HALF);
  A.openArmourLocker(kit, PALETTE, [IX1 - 0.29, Y, 388.75], -HALF);
  A.rifleRack(kit, PALETTE, [IX1 - 0.1, Y, 391.5], -HALF, { seed: 75, locked: false });
  A.maintenanceBench(kit, PALETTE, [IX1 - 0.44, Y, 395.2], -HALF, { len: 2.6, seed: 76 });
  wallScreen(kit, [IX1 - 0.09, Y + 3.2, 386.6], -HALF, 1.6, 0.8, "screenImp1");
  wallScreen(kit, [IX1 - 0.09, Y + 3.2, 391.5], -HALF, 1.6, 0.8, "screenImp1");
  dropLight(kit, PALETTE, [IX1 - 0.9, CEIL, 395.2], { w: 1.8, d: 0.3, stem: 1.2, mat: "emitWhite" });

  // ---- centre island: double-sided rifle rack + inspection table under a drop light ---------------
  A.rifleRack(kit, PALETTE, [-19, Y, 388.6], 0, { seed: 77 });
  A.rifleRack(kit, PALETTE, [-19, Y, 388.4], Math.PI, { seed: 78 });
  kit.box("paintedMetal", -19, Y + 2.14, 388.5, 3.6, 0.1, 0.9, { color: black, texel: 1 });
  kit.box("emitRedImp", -19, Y + 2.2, 388.5, 3.2, 0.02, 0.06);
  A.maintenanceBench(kit, PALETTE, [-19, Y, 393.3], 0, { len: 2.4, seed: 79, pegboard: false });
  dropLight(kit, PALETTE, [-19, CEIL, 393.3], { w: 2.0, d: 0.3, stem: 1.3, mat: "emitWhite" });

  // ---- aft wall: charge rack + stacked ammo crates --------------------------------------------------
  A.chargeRack(kit, PALETTE, [-17.6, Y, IZ1 - 0.26], Math.PI, { w: 3.0, h: 2.0, d: 0.5, seed: 81 });
  for (const [x, n, seed] of [[-21.9, 3, 82], [-21.0, 2, 83], [-20.1, 2, 84]]) {
    for (let i = 0; i < n; i++) crate(kit, PALETTE, [x, Y + i * 0.8, IZ1 - 0.42], Math.PI, { w: 0.8, h: 0.8, d: 0.8, seed: seed + i, color: i === n - 1 ? P("impDark") : undefined });
  }
  for (const [x, n, seed] of [[-13.3, 2, 85], [-12.4, 3, 86]]) {
    for (let i = 0; i < n; i++) crate(kit, PALETTE, [x, Y + i * 0.8, IZ1 - 0.42], Math.PI, { w: 0.8, h: 0.8, d: 0.8, seed: seed + i });
  }
  crate(kit, PALETTE, [-14.6, Y, IZ1 - 0.42], Math.PI, { w: 0.8, h: 0.8, d: 0.8, seed: 87 });
  wallScreen(kit, [-17.6, Y + 3.0, IZ1 - 0.09], Math.PI, 2.4, 0.9, "screenImp1");
  hazardStrip(kit, [-22.4, IZ1 - 1.1], [-19.6, IZ1 - 0.95], Y);
  hazardStrip(kit, [-13.8, IZ1 - 1.1], [-11.9, IZ1 - 0.95], Y);

  // ---- blast-shield test alcove (aft-west corner) --------------------------------------------------
  const AL = { x0: IX0, x1: -23.0, z0: 395.6, z1: IZ1 };
  // partition on the north side, dark lining on the west/aft walls with ribs
  kit.boxMM("paintedMetal", [AL.x0, Y, AL.z0], [AL.x1, Y + 2.9, AL.z0 + 0.25], { color: black, texel: 0.5 });
  kit.boxMM("paintedMetal", [AL.x0, Y + 2.9, AL.z0 - 0.05], [AL.x1 + 0.05, Y + 3.05, AL.z0 + 0.3], { color: dark });
  kit.boxMM("emitRedImp", [AL.x0 + 0.2, Y + 2.2, AL.z0 - 0.005], [AL.x1 - 0.2, Y + 2.26, AL.z0]);
  kit.collider([AL.x0, Y, AL.z0], [AL.x1, Y + 3.05, AL.z0 + 0.25], "alcove-wall");
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y, AL.z0 + 0.25], [AL.x0 + 0.1, Y + 2.9, AL.z1 - 0.02], { color: black, texel: 0.5 });
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y, AL.z1 - 0.1], [AL.x1, Y + 2.9, AL.z1 - 0.02], { color: black, texel: 0.5 });
  for (let z = AL.z0 + 0.8; z < AL.z1 - 0.3; z += 0.9) kit.box("paintedMetal", AL.x0 + 0.14, Y + 1.45, z, 0.16, 2.9, 0.12, { color: dark });
  for (let x = AL.x0 + 0.7; x < AL.x1 - 0.3; x += 0.9) kit.box("paintedMetal", x, Y + 1.45, AL.z1 - 0.14, 0.12, 2.9, 0.16, { color: dark });
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y + 2.9, AL.z0 + 0.25], [AL.x1, Y + 3.05, AL.z1 - 0.02], { color: dark });
  // hazard border + dark grate centre on the floor
  const fz0 = AL.z0 + 0.3;
  hazardStrip(kit, [AL.x0 + 0.1, fz0], [AL.x1 - 0.1, fz0 + 0.4], Y);
  hazardStrip(kit, [AL.x0 + 0.1, AL.z1 - 0.5], [AL.x1 - 0.1, AL.z1 - 0.1], Y);
  hazardStrip(kit, [AL.x0 + 0.1, fz0 + 0.4], [AL.x0 + 0.5, AL.z1 - 0.5], Y);
  hazardStrip(kit, [AL.x1 - 0.5, fz0 + 0.4], [AL.x1 - 0.1, AL.z1 - 0.5], Y);
  kit.boxMM("grate", [AL.x0 + 0.5, Y + 0.001, fz0 + 0.4], [AL.x1 - 0.5, Y + 0.009, AL.z1 - 0.5]);
  // rig fires toward the aft target plate; control post at the opening; rail across half the opening
  A.shieldRig(kit, PALETTE, [-24.9, Y, 396.6], 0);
  A.targetPlate(kit, PALETTE, [-24.9, Y + 1.5, AL.z1 - 0.1], Math.PI, { w: 1.8, h: 1.8 });
  kit.box("paintedMetal", AL.x1 - 0.45, Y + 0.55, 399.0, 0.5, 1.1, 0.4, { color: black, texel: 1 });
  kit.box("darkGloss", AL.x1 - 0.45, Y + 1.12, 399.0, 0.44, 0.04, 0.34);
  kit.box("emitRedImp", AL.x1 - 0.45, Y + 1.145, 399.0, 0.3, 0.01, 0.2);
  kit.collider([AL.x1 - 0.7, Y, 398.8], [AL.x1 - 0.2, Y + 1.15, 399.2], "alcove-post");
  rail(kit, PALETTE, [AL.x1, Y, AL.z0 + 0.3], [AL.x1, Y, 397.6], Y, { h: 1.02 });
  kit.box("emitRedImp", AL.x1 - 0.3, Y + 2.7, AL.z0 + 0.12, 0.3, 0.12, 0.3);
  hazardStrip(kit, [AL.x1 - 0.05, AL.z0 + 0.3], [AL.x1 + 0.35, AL.z1 - 0.1], Y);
  // 1.2 m supply crates mid-floor (scale reference), one stacked
  crate(kit, PALETTE, [-15.6, Y, 391.0], 0, { seed: 91 });
  crate(kit, PALETTE, [-15.6, Y + 1.2, 391.0], 0.35, { seed: 92, color: P("impDark") });
  crate(kit, PALETTE, [-15.6, Y, 392.35], 0, { seed: 93 });

  // ---- ceiling fixtures (dark ceiling, own recessed panels) ----------------------------------------
  for (const x of [-22.8, -15.2]) {
    for (const z of [380.0, 386.0, 391.0, 397.0]) {
      kit.box("paintedMetal", x, CEIL - 0.04, z, 0.8, 0.12, 0.8, { color: black });
      kit.box("emitWhite", x, CEIL - 0.105, z, 0.62, 0.01, 0.62);
    }
  }

  // ---- lights (8 descriptors) -----------------------------------------------------------------------
  lights.push({ type: "point", pos: [-19, Y + 4.1, 380.0], color: 0xffd9d0, intensity: 26, distance: 12, priority: 0.7 });
  lights.push({ type: "point", pos: [-16.5, Y + 3.6, 383.8], color: 0xffd9d0, intensity: 18, distance: 9, priority: 0.5 });
  lights.push({ type: "point", pos: [-23.5, Y + 3.9, 387.5], color: 0xffe0d8, intensity: 24, distance: 11, priority: 0.5 });
  lights.push({ type: "point", pos: [-14.0, Y + 3.9, 388.5], color: 0xffe0d8, intensity: 24, distance: 11, priority: 0.5 });
  lights.push({ type: "point", pos: [-19.0, Y + 3.9, 393.0], color: 0xffe0d8, intensity: 24, distance: 11, priority: 0.5 });
  lights.push({ type: "point", pos: [-24.8, Y + 2.7, 397.8], color: 0xff5a48, intensity: 9, distance: 7, priority: 0.4 });
  lights.push({ type: "point", pos: [-13.5, Y + 3.2, 395.2], color: 0xffffff, intensity: 14, distance: 7, priority: 0.4 });
  lights.push({ type: "point", pos: [-17.5, Y + 3.8, 398.2], color: 0xd8e2ff, intensity: 16, distance: 9, priority: 0.4 });
  return {};
}

export default defineRoom({
  id: "d2-armory",
  name: "Armory",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [-19, Y, 380], yaw: 180 },
  views: {
    "d2-armory-door": { pos: [-19, Y, 379.3], yaw: 180, pitch: -2 },
    "d2-armory-racks": { pos: [-14.6, Y, 386.6], yaw: 120, pitch: -3 },
    "d2-armory-lockers": { pos: [-24.2, Y, 391.2], yaw: -80, pitch: -3 },
    "d2-armory-alcove": { pos: [-20.4, Y, 397.4], yaw: 94, pitch: -3 },
    "d2-armory-issue": { pos: [-17.2, Y, 385.6], yaw: 18, pitch: -2 },
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
