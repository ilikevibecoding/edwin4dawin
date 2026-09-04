// Deck 2 armory: issue counter under a full-height security cage just inside the door, rifle racks and
// armour lockers behind it, ammo crates aft, a blast-shield test alcove in the aft-west corner. Dark
// grey, red strips, dark ceiling (§11).
import { defineRoom } from "../_shared/room.js";
import { IMP, col } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { console as consoleProp, crate, lockerBank, cabinet, wallScreen, floorLine, pipe, placer } from "../_shared/props.js";
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
  wallScreen(kit, [-24.6, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, "screenImp0");
  cabinet(kit, PALETTE, [-26.0, Y, IZ0 + 0.21], 0, { w: 1.1, h: 1.8, d: 0.4, seed: 62, emit: "emitRedImp" });
  A.waitBench(kit, PALETTE, [-14.6, Y, IZ0 + 0.16], 0, { len: 2.6 });
  wallScreen(kit, [-14.6, Y + 2.95, IZ0 + 0.09], 0, 1.6, 0.9, "screenImp3");
  A.noticeBoard(kit, PALETTE, [-12.3, Y + 1.7, IZ0 + 0.01], 0, { w: 0.9, h: 0.9, seed: 63 });
  // risers feeding the shell's service band at 3.8 m
  pipe(kit, PALETTE, [IX1 - 0.4, Y + 0.2, 380.6], [IX1 - 0.4, Y + 3.7, 380.6], 0.08, { color: steel, bracket: 1.5 });
  pipe(kit, PALETTE, [IX1 - 0.4, Y + 0.2, 380.95], [IX1 - 0.4, Y + 3.7, 380.95], 0.05, { color: dark, bracket: 1.5 });

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
  // open gate leaf swung into the room along +Z at the gate's east post (solid kick panel, lock box)
  A.gateLeaf(kit, PALETTE, [GATE.x1 + 0.06, Y, cz + 0.1], [GATE.x1 + 0.06, Y, cz + 1.3], 2.3);
  // frame posts + header to the ceiling with a red light strip
  for (const x of [IX0 + 0.08, GATE.x0, GATE.x1, COUNTER.x0, COUNTER.x1, IX1 - 0.08]) kit.box("paintedMetal", x, Y + (CEIL - Y) / 2, cz, 0.14, CEIL - Y, 0.14, { color: black, texel: 2.5 });
  // header: dark grey at texel 4 (from the issue side it is the top-left fifth of the frame together
  // with the aft channel's trough; black at texel 2.5 both read as one speckled black band)
  kit.boxMM("paintedMetal", [IX0, top, cz - 0.12], [IX1, CEIL, cz + 0.12], { color: dark, texel: 4 });
  kit.boxMM("emitRedImp", [IX0 + 0.3, top + 0.1, cz - 0.125], [IX1 - 0.3, top + 0.14, cz - 0.12]);
  kit.boxMM("emitRedImp", [IX0 + 0.3, top + 0.1, cz + 0.12], [IX1 - 0.3, top + 0.14, cz + 0.125]);
  kit.boxMM("paintedMetal", [GATE.x0 - 0.07, Y + 2.3, cz - 0.1], [GATE.x1 + 0.07, Y + 2.4, cz + 0.1], { color: black });
  kit.box("emitBlue", (GATE.x0 + GATE.x1) / 2, Y + 2.35, cz - 0.105, 0.3, 0.04, 0.01);
  // issue console behind the counter (operator faces the door over the screens); no screenMat so the
  // two screens take the seeded picks, which for seed 64 are screenImp3 + screenImp1 (two layouts)
  consoleProp(kit, PALETTE, [-15.4, Y, 383.5], 0, { w: 1.8, d: 0.8, h: 1.15, screens: 2, seed: 64 });
  // housed light channels either side of the cage header (the vestibule and issue-side fills hang under them)
  A.channelFixture(kit, PALETTE, -25.6, -12.4, 381.1, CEIL);
  A.channelFixture(kit, PALETTE, -25.6, -12.4, 383.3, CEIL);

  // ---- west wall: rifle racks, pistol lockers -------------------------------------------------------
  A.rifleRack(kit, PALETTE, [IX0 + 0.1, Y, 385.6], HALF, { seed: 71, variantKind: 1 });
  A.rifleRack(kit, PALETTE, [IX0 + 0.1, Y, 389.4], HALF, { seed: 72, variantKind: 2 });
  A.pistolLockers(kit, PALETTE, [IX0 + 0.21, Y, 392.7], HALF, { cols: 4, rows: 3, seed: 73 });
  wallScreen(kit, [IX0 + 0.09, Y + 3.2, 392.7], HALF, 1.6, 0.8, "screenImp3");
  cabinet(kit, PALETTE, [IX0 + 0.21, Y, 394.4], HALF, { w: 1.0, h: 1.8, d: 0.4, seed: 74 });

  // ---- east wall: armour lockers (two open), rifle rack, maintenance bench ------------------------
  lockerBank(kit, PALETTE, [IX1 - 0.26, Y, 385.6], -HALF, { count: 6, unit: 0.6, h: 2.0, d: 0.5, color: P("impDark") });
  A.openArmourLocker(kit, PALETTE, [IX1 - 0.29, Y, 388.0], -HALF);
  A.openArmourLocker(kit, PALETTE, [IX1 - 0.29, Y, 388.75], -HALF);
  A.rifleRack(kit, PALETTE, [IX1 - 0.1, Y, 391.5], -HALF, { seed: 75, locked: false, empties: 1, variantKind: 2 });
  A.maintenanceBench(kit, PALETTE, [IX1 - 0.44, Y, 395.2], -HALF, { len: 2.6, seed: 76 });
  wallScreen(kit, [IX1 - 0.09, Y + 3.2, 386.6], -HALF, 1.6, 0.8, "screenImp0");
  wallScreen(kit, [IX1 - 0.09, Y + 3.2, 391.5], -HALF, 1.6, 0.8, "screenImp1");
  A.benchLight(kit, PALETTE, [IX1 - 0.9, CEIL, 395.2], { w: 1.8, d: 0.34, stem: 1.2 });

  // ---- centre island: double-sided rifle rack + inspection table under a drop light ---------------
  A.rifleRack(kit, PALETTE, [-19, Y, 388.6], 0, { seed: 77, variantKind: 2 });
  A.rifleRack(kit, PALETTE, [-19, Y, 388.4], Math.PI, { seed: 78, empties: 3, variantKind: 1 });
  kit.box("paintedMetal", -19, Y + 2.14, 388.5, 3.6, 0.1, 0.9, { color: black, texel: 2.5 });
  kit.box("emitRedImp", -19, Y + 2.2, 388.5, 3.2, 0.02, 0.06);
  A.maintenanceBench(kit, PALETTE, [-19, Y, 393.3], 0, { len: 2.4, seed: 79, pegboard: false });
  A.benchLight(kit, PALETTE, [-19, CEIL, 393.3], { w: 2.0, d: 0.34, stem: 1.3 });

  // ---- aft wall: charge rack + stacked ammo crates --------------------------------------------------
  const CR = { bumperMat: "paintedMetal" }; // no rubber key in this room (draw-call budget)
  A.chargeRack(kit, PALETTE, [-17.6, Y, IZ1 - 0.26], Math.PI, { w: 3.0, h: 2.0, d: 0.5, seed: 81 });
  for (const [x, n, seed] of [[-21.9, 3, 82], [-21.0, 2, 83], [-20.1, 2, 84]]) {
    for (let i = 0; i < n; i++) crate(kit, PALETTE, [x, Y + i * 0.8, IZ1 - 0.42], Math.PI, { ...CR, w: 0.8, h: 0.8, d: 0.8, seed: seed + i, color: i === n - 1 ? P("impDark") : undefined });
  }
  A.crateTag(kit, PALETTE, [-21.9 + 0.41, Y + 2.0, IZ1 - 0.42], HALF, 101); // exposed east face of the top crate
  for (const [x, n, seed] of [[-13.3, 2, 85], [-12.4, 3, 86]]) {
    for (let i = 0; i < n; i++) crate(kit, PALETTE, [x, Y + i * 0.8, IZ1 - 0.42], Math.PI, { ...CR, w: 0.8, h: 0.8, d: 0.8, seed: seed + i });
  }
  crate(kit, PALETTE, [-14.6, Y, IZ1 - 0.42], Math.PI, { ...CR, w: 0.8, h: 0.8, d: 0.8, seed: 87 });
  wallScreen(kit, [-17.6, Y + 3.0, IZ1 - 0.09], Math.PI, 2.4, 0.9, "screenImp1");
  A.hazardBand(kit, PALETTE, [-22.4, IZ1 - 1.1], [-19.6, IZ1 - 0.95], Y);
  A.hazardBand(kit, PALETTE, [-13.8, IZ1 - 1.1], [-11.9, IZ1 - 0.95], Y);

  // ---- blast-shield test alcove (aft-west corner) --------------------------------------------------
  const AL = { x0: IX0, x1: -23.0, z0: 395.6, z1: IZ1 };
  // partition on the north side, dark lining on the west/aft walls with ribs
  kit.boxMM("paintedMetal", [AL.x0, Y, AL.z0], [AL.x1, Y + 2.9, AL.z0 + 0.25], { color: black, texel: 2.5 });
  kit.boxMM("paintedMetal", [AL.x0, Y + 2.9, AL.z0 - 0.05], [AL.x1 + 0.05, Y + 3.05, AL.z0 + 0.3], { color: dark, texel: 2.5 });
  kit.boxMM("emitRedImp", [AL.x0 + 0.2, Y + 2.5, AL.z0 - 0.005], [AL.x1 - 0.2, Y + 2.56, AL.z0]);
  kit.collider([AL.x0, Y, AL.z0], [AL.x1, Y + 3.05, AL.z0 + 0.25], "alcove-wall");
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y, AL.z0 + 0.25], [AL.x0 + 0.1, Y + 2.9, AL.z1 - 0.02], { color: black, texel: 2.5 });
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y, AL.z1 - 0.1], [AL.x1, Y + 2.9, AL.z1 - 0.02], { color: black, texel: 2.5 });
  // ribs with clean dark panel plates between them (no worn-metal speckle on the lining); the plates are
  // a shade above impDark so the range lamp can pick them out of the black frame
  const lining = 0x464a51;
  const ribsZ = [];
  for (let z = AL.z0 + 0.8; z < AL.z1 - 0.3; z += 0.9) ribsZ.push(z);
  for (const z of ribsZ) kit.box("paintedMetal", AL.x0 + 0.14, Y + 1.45, z, 0.16, 2.9, 0.12, { color: dark, texel: 2.5 });
  for (const [a, b] of [[AL.z0 + 0.28, ribsZ[0] - 0.06], ...ribsZ.map((z, i) => [z + 0.06, i + 1 < ribsZ.length ? ribsZ[i + 1] - 0.06 : AL.z1 - 0.13])]) {
    if (b - a < 0.2) continue;
    kit.boxMM("impPanel", [AL.x0 + 0.1, Y + 0.3, a + 0.03], [AL.x0 + 0.13, Y + 2.7, b - 0.03], { color: lining, uv: "keep" });
  }
  const ribsX = [];
  for (let x = AL.x0 + 0.7; x < AL.x1 - 0.3; x += 0.9) if (Math.abs(x + 24.9) > 1.1) ribsX.push(x); // none across the target plate
  for (const x of ribsX) kit.box("paintedMetal", x, Y + 1.45, AL.z1 - 0.14, 0.12, 2.9, 0.16, { color: dark, texel: 2.5 });
  for (const [a, b] of [[AL.x0 + 0.23, ribsX[0] - 0.06], ...ribsX.map((x, i) => [x + 0.06, i + 1 < ribsX.length ? ribsX[i + 1] - 0.06 : AL.x1 - 0.05])]) {
    if (b - a < 0.2) continue;
    kit.boxMM("impPanel", [a + 0.03, Y + 0.3, AL.z1 - 0.13], [b - 0.03, Y + 2.7, AL.z1 - 0.1], { color: lining, uv: "keep" });
  }
  // partition: panel plates in two rows around the red strip on the room face, one row of lining plates
  // on the alcove face (it was a bare black plane behind the rig)
  for (const [v0, v1] of [[0.4, 2.35], [2.62, 2.82]]) {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const u0 = AL.x0 + 0.05 + (i * (AL.x1 - AL.x0 - 0.1)) / n + 0.03;
      const u1 = AL.x0 + 0.05 + ((i + 1) * (AL.x1 - AL.x0 - 0.1)) / n - 0.03;
      kit.boxMM("impPanel", [u0, Y + v0, AL.z0 - 0.03], [u1, Y + v1, AL.z0], { color: dark, uv: "keep" });
      if (v0 < 1) kit.boxMM("impPanel", [u0, Y + 0.3, AL.z0 + 0.25], [u1, Y + 2.55, AL.z0 + 0.28], { color: lining, uv: "keep" });
    }
  }
  kit.boxMM("paintedMetal", [AL.x0 + 0.02, Y + 2.9, AL.z0 + 0.25], [AL.x1, Y + 3.05, AL.z1 - 0.02], { color: dark, texel: 2.5 });
  // floor: 0.2 m painted amber/black border (half the old striped-texture width, matte paint instead of
  // the glowing `hazard` map) around a dark grate centre
  const fz0 = AL.z0 + 0.3;
  A.hazardBand(kit, PALETTE, [AL.x0 + 0.1, fz0], [AL.x1 - 0.1, fz0 + 0.2], Y);
  A.hazardBand(kit, PALETTE, [AL.x0 + 0.1, AL.z1 - 0.3], [AL.x1 - 0.1, AL.z1 - 0.1], Y);
  A.hazardBand(kit, PALETTE, [AL.x0 + 0.1, fz0 + 0.2], [AL.x0 + 0.3, AL.z1 - 0.3], Y);
  A.hazardBand(kit, PALETTE, [AL.x1 - 0.3, fz0 + 0.2], [AL.x1 - 0.1, AL.z1 - 0.3], Y);
  kit.boxMM("paintedMetal", [AL.x0 + 0.3, Y, fz0 + 0.2], [AL.x1 - 0.3, Y + 0.004, AL.z1 - 0.3], { color: black });
  kit.boxMM("grate", [AL.x0 + 0.34, Y + 0.005, fz0 + 0.24], [AL.x1 - 0.34, Y + 0.013, AL.z1 - 0.34]);
  // rig throws its field between a ceiling emitter housing under the slab and a floor receptor, toward
  // the aft target plate; rail across the north half of the opening
  A.shieldRig(kit, PALETTE, [-24.9, Y, 396.6], 0, { fieldTop: 2.9 });
  A.targetPlate(kit, PALETTE, [-24.9, Y + 1.5, AL.z1 - 0.1], Math.PI, { w: 1.8, h: 1.8 });
  rail(kit, PALETTE, [AL.x1, Y, AL.z0 + 0.3], [AL.x1, Y, 397.6], Y, { h: 1.02 });
  A.hazardBand(kit, PALETTE, [AL.x1 - 0.05, AL.z0 + 0.3], [AL.x1 + 0.15, AL.z1 - 0.1], Y);
  // housed fixtures under the alcove slab either side of the field emitter (the slab read pitch black)
  for (const z of [396.9, 398.9]) A.ceilingFixture(kit, PALETTE, -24.85, Y + 2.9, z, { w: 0.8, d: 0.7 });
  // what the alcove is: range-control console outside the rail (operator faces the rig), a status
  // screen on the partition, the header sign over the walkway, a caged red beacon on the partition top
  consoleProp(kit, PALETTE, [-22.2, Y, 396.75], HALF, { w: 1.2, d: 0.7, h: 1.15, screens: 1, seed: 95, screenMat: "screenImp3" });
  wallScreen(kit, [-24.85, Y + 1.6, AL.z0 - 0.09], Math.PI, 1.6, 0.9, "screenImp3");
  A.rangeSign(kit, PALETTE, [AL.x1 + 0.04, Y + 2.8, 398.65], HALF, { w: 2.0, h: 0.5 });
  A.beacon(kit, PALETTE, [-23.4, Y + 3.05, AL.z0 + 0.12]);
  // range lamp: hooded housing under the partition slab on the alcove side; the alcove spot hangs from it
  kit.box("paintedMetal", -24.9, Y + 2.81, AL.z0 + 0.36, 0.4, 0.16, 0.24, { color: black, texel: 2.5 });
  for (const s of [-1, 1]) kit.box("paintedMetal", -24.9, Y + 2.7, AL.z0 + 0.36 + s * 0.11, 0.44, 0.06, 0.03, { color: dark }); // hood lips
  kit.box("emitWhite", -24.9, Y + 2.725, AL.z0 + 0.36, 0.3, 0.01, 0.14);
  // 1.2 m supply crates mid-floor (scale reference), one stacked; tagged faces toward the racks view
  crate(kit, PALETTE, [-15.6, Y, 391.0], 0, { ...CR, seed: 91, color: P("impMid") });
  crate(kit, PALETTE, [-15.6, Y + 1.2, 391.0], 0.35, { ...CR, seed: 92, color: P("impGrey") });
  crate(kit, PALETTE, [-15.6, Y, 392.35], 0, { ...CR, seed: 93 });
  // tag styles rotate (indicator field / manifest screen / stencil plate) so the two faces the racks
  // view sees are not the same LED plate twice
  A.crateTag(kit, PALETTE, [-15.6 + 0.62, Y + 0.6, 391.0], HALF, 96, 0);
  A.crateTag(kit, PALETTE, [-15.6, Y + 0.6, 391.0 - 0.62], Math.PI, 97, 1);
  {
    const Pc = placer(kit, [-15.6, Y + 1.2, 391.0], 0.35);
    A.crateTag(kit, PALETTE, Pc.world(0.62, 0.6, 0), 0.35 + HALF, 98, 2);
    A.crateTag(kit, PALETTE, Pc.world(0, 0.6, -0.62), 0.35 + Math.PI, 99, 1);
  }
  A.crateTag(kit, PALETTE, [-15.6 + 0.62, Y + 0.6, 392.35], HALF, 100, 2);
  // weapon cart parked in front of the open armour lockers, long side to the room (foreground anchor of
  // the lockers view 2.7 m from its camera, scale reference)
  A.weaponCart(kit, PALETTE, [-14.0, Y, 388.5], HALF, { seed: 102 });
  // painted inspection-zone outline around the island rack (matte red paint, no emitter): the racks
  // view's foreground floor carries a marking instead of reading bare
  A.floorMarking(kit, PALETTE, [-21.1, 387.5], [-16.9, 389.6], Y, { seed: 103 });

  // ---- ceiling: black slab + 2.4 m dark-grey plates with fine world UVs (the shell's plated ceiling at
  // texel 2.5 read as dark speckle; impDark plates read as black speckle seen face-on from the racks and
  // lockers views, so the plates are impMid with a darker plate every so often, over black seams);
  // housed recessed panels 3 x 3 + a pair in the vestibule ---------------------------------------------
  kit.boxMM("paintedMetal", [X0, CEIL, Z0], [X1, CEIL + 0.5, Z1], { color: black, texel: 4 });
  {
    const pw = 2.4;
    const nx = Math.round((IX1 - IX0) / pw);
    const nz = Math.round((IZ1 - IZ0) / pw);
    const plateDark = P("impMid");
    const plateAlt = 0x474b52;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const px0 = IX0 + ((IX1 - IX0) * i) / nx + 0.02;
        const px1 = IX0 + ((IX1 - IX0) * (i + 1)) / nx - 0.02;
        const pz0 = IZ0 + ((IZ1 - IZ0) * j) / nz + 0.02;
        const pz1 = IZ0 + ((IZ1 - IZ0) * (j + 1)) / nz - 0.02;
        kit.boxMM("paintedMetal", [px0, CEIL - 0.03, pz0], [px1, CEIL, pz1], { color: (i * 7 + j * 3) % 11 === 0 ? plateAlt : plateDark, texel: 4 });
      }
    }
  }
  for (const x of [-22.8, -19.0, -15.2]) for (const z of [386.0, 391.0, 397.0]) A.ceilingFixture(kit, PALETTE, x, CEIL, z);
  for (const x of [-23.8, -14.2]) A.ceilingFixture(kit, PALETTE, x, CEIL, 379.6);
  // two small counter downlights in the ceiling strip between the cage header and the aft channel: from
  // the issue camera the aft channel's emitter hides behind its own trough wall (24 deg elevation), so
  // the top-left fifth of that view had no visible fixture; these sit at 40-45 deg left, 26-30 deg up
  for (const x of [-20.6, -23.2]) A.ceilingFixture(kit, PALETTE, x, CEIL, 382.64, { w: 0.6, d: 0.5 });

  // ---- lights (13 descriptors: 12 point + 1 spot) ---------------------------------------------------
  // Point lights fall off with 1/d^2, so anything within ~1 m of a fill blows out: every fill sits
  // >= 1.6 m below the ceiling (no specular disc on the black plating) and >= 1.5 m from any fixture
  // housing, hood or tall prop top. Fixtures are emissive dressing; the fills explain themselves by
  // sitting near them, as in the mess.
  const warm = 0xffe0d8;
  lights.push({ type: "point", pos: [-19, Y + 3.0, 379.6], color: 0xffd9d0, intensity: 22, distance: 11, priority: 0.7 }); // vestibule, forward of the cage channel
  lights.push({ type: "point", pos: [-16.5, Y + 3.0, 384.9], color: 0xffd9d0, intensity: 18, distance: 9, priority: 0.5 }); // issue side, aft of the cage channel
  lights.push({ type: "point", pos: [-22.8, Y + 2.6, 386.0], color: warm, intensity: 20, distance: 10, priority: 0.5 }); // 2 m under the recessed panels
  lights.push({ type: "point", pos: [-15.2, Y + 2.6, 386.0], color: warm, intensity: 20, distance: 10, priority: 0.5 });
  lights.push({ type: "point", pos: [-22.8, Y + 2.6, 391.0], color: warm, intensity: 20, distance: 10, priority: 0.5 });
  lights.push({ type: "point", pos: [-15.2, Y + 3.0, 388.8], color: warm, intensity: 18, distance: 9, priority: 0.5 }); // forward of the 2.4 m crate stack
  lights.push({ type: "point", pos: [-19.0, Y + 2.6, 395.3], color: warm, intensity: 16, distance: 9, priority: 0.5 }); // aft of the island bench hood
  lights.push({ type: "point", pos: [-14.6, Y + 2.8, 396.6], color: 0xffffff, intensity: 16, distance: 9, priority: 0.4 }); // east bench, clear of its hood
  lights.push({ type: "point", pos: [-17.6, Y + 2.8, 397.6], color: warm, intensity: 14, distance: 8, priority: 0.4 }); // aft wall: charge rack + crates
  lights.push({ type: "point", pos: [-21.6, Y + 2.6, 397.0], color: 0xd8e2ff, intensity: 16, distance: 9, priority: 0.4 }); // range console, east of the alcove partition
  lights.push({ type: "point", pos: [-23.4, Y + 3.3, AL.z0 + 0.12], color: 0xff7a60, intensity: 5, distance: 6, priority: 0.4 }); // inside the caged beacon
  // range lamp: a cool spot from the hooded housing under the partition slab down the alcove onto the
  // grate and the target plate (a point fill there would have blown the lining 0.6 m away)
  lights.push({ type: "spot", pos: [-24.9, Y + 2.66, AL.z0 + 0.4], target: [-24.9, Y + 0.2, AL.z1 - 0.8], color: 0xe4ecff, intensity: 34, distance: 8, angle: 0.85, penumbra: 0.5, priority: 0.5 });
  // small fill under the aft alcove panel (1.4 m below the slab) so the target plate and lining read
  lights.push({ type: "point", pos: [-24.85, Y + 1.5, 398.5], color: 0xe4ecff, intensity: 5, distance: 5, priority: 0.4 });
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
    // 3 m off the island rack's north face and 22 deg off its normal (from 1 m north of the face plane
    // the rack was seen nearly edge-on and the eight silhouettes overlapped into one): the long repeater
    // stands clear of the standard rifles, the painted inspection zone carries the foreground
    "d2-armory-racks": { pos: [-17.8, Y, 385.5], yaw: 155, pitch: -1 },
    // from the middle of the room toward the east wall: locker bank left, open armour lockers centre
    // with the weapon cart parked 2.7 m ahead of the camera, rifle rack right (was a 13 m sightline
    // across the room with 45 % floor)
    "d2-armory-lockers": { pos: [-16.6, Y, 387.6], yaw: -85, pitch: -1 },
    // on the alcove's centreline (the previous spot had the 2.4 m crate stack filling the left foreground)
    "d2-armory-alcove": { pos: [-20.6, Y, 397.7], yaw: 86, pitch: -2 },
    "d2-armory-issue": { pos: [-17.2, Y, 385.6], yaw: 18, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impMid,
    wallAlt: IMP.impGrey,
    corniceColor: IMP.impDark,
    stripMat: "emitRedImp",
    floor: { color: IMP.impDark },
    // the room builds its own ceiling (slab + 2.4 m plates at texel 4): the shell's plated panels at
    // texel 2.5 read as dark speckle, its painted panels as grime blotches
    ceiling: false,
    lights: false,
    doorDressing: { accent: "emitRedImp" },
    // cable tray + pipe runs just under the cornice on all four walls (everything the room hangs on
    // the walls tops out at 3.66 m)
    serviceBand: { y: 3.8 },
  },
  detail,
});
