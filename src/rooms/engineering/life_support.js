// Life Support: Air, Water & Waste — a 70 m plant hall. From the entrance: a monitoring station (right) and
// filter racks (left); then four air-scrubber towers under a ceiling pipe maze; then the water tanks (right)
// and the waste processors (left); the far wall is the dehumidifier bank (louvres + fans + condensate drains).
// Drainage channels with gratings run along the central aisle and across the zones.
import { Placer, consoleStation, chair, computerBank, pipeRun, barrel, floorGrate, railing, pillar } from "../../core/props.js";
import { rng } from "../../core/kit.js";
import { hazardBay, floorDecal, screenPanel, frameScreen, ledCluster, tank, scrubberTower, machineBlock, valveStack, louvreVent, fanUnit, workLight, strip, wallU, setLightLevel } from "./machinery.js";
import { DECAL, ledRect } from "../../textures.js";

export const meta = { id: "life_support", stream: "deck-rooms" };

/** Filter rack: open frame with rows of horizontal cartridge cylinders, each with a status LED. Faces −Z. */
function filterRack(kit, IMP, { pos, yaw = 0, w = 4, h = 3.0, d = 0.9, rows = 4, seed = 1 }) {
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box("paintedMetal", sx * (w / 2 - 0.06), h / 2, sz * (d / 2 - 0.06), 0.12, h, 0.12, { color: IMP.gunmetal, texel: 1 });
  P.box("paintedMetal", 0, 0.08, 0, w, 0.16, d, { color: IMP.black, texel: 1 });
  P.box("paintedMetal", 0, h - 0.08, 0, w, 0.16, d, { color: IMP.black, texel: 1 });
  const cols = Math.floor((w - 0.4) / 0.62);
  for (let r = 0; r < rows; r++) {
    const y = 0.5 + (r * (h - 1.0)) / (rows - 1);
    P.box("paintedMetal", 0, y - 0.3, 0, w - 0.2, 0.05, d - 0.1, { color: IMP.plateDark, texel: 1 });
    for (let c = 0; c < cols; c++) {
      const x = -(cols - 1) * 0.31 + c * 0.62;
      if (rand() < 0.12) continue; // empty slot
      const fresh = rand() < 0.75;
      P.cyl("plate", x, y, 0, 0.22, d - 0.25, "z", { color: fresh ? IMP.plateLight : IMP.plateWarm, segments: 10, texel: 2 });
      P.cyl("paintedMetal", x, y, -d / 2 + 0.16, 0.24, 0.08, "z", { color: IMP.black, segments: 10 });
      P.box(fresh ? "emitGreen" : "emitAmber", x, y + 0.27, -d / 2 + 0.1, 0.06, 0.03, 0.01);
    }
  }
  P.box("leds", -w / 2 + 0.6, h - 0.08, -d / 2 - 0.005, 0.8, 0.07, 0.01, { uv: "keep", uvRect: ledRect(seed % 16) });
  P.decal(w / 2 - 0.5, h - 0.08, -d / 2 - 0.006, 0.14, 0.14, DECAL.NUMBER0 + (seed % 4));
  P.collider([-w / 2, 0, -d / 2], [w / 2, h, d / 2], "filters");
}

/** Drainage channel: dark wet recess look with steel edge rails and a grating on top (4 cm proud). */
function drainChannel(kit, IMP, [x0, z0], [x1, z1], y) {
  kit.boxMM("darkGloss", [x0, y + 0.001, z0], [x1, y + 0.02, z1]);
  const along = x1 - x0 >= z1 - z0 ? "x" : "z";
  if (along === "x") {
    kit.boxMM("metal", [x0, y, z0 - 0.04], [x1, y + 0.05, z0 + 0.02], { color: IMP.steelDark });
    kit.boxMM("metal", [x0, y, z1 - 0.02], [x1, y + 0.05, z1 + 0.04], { color: IMP.steelDark });
  } else {
    kit.boxMM("metal", [x0 - 0.04, y, z0], [x0 + 0.02, y + 0.05, z1], { color: IMP.steelDark });
    kit.boxMM("metal", [x1 - 0.02, y, z0], [x1 + 0.04, y + 0.05, z1], { color: IMP.steelDark });
  }
  floorGrate(kit, [x0, z0], [x1, z1], y + 0.05);
}

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -10
  const C = ctx.ceil; // 0
  const { x0, x1, z0, z1 } = ctx.inner;
  const AX = 54; // aisle centre (door x 52..56)

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    walls: { zmin: { accent: "emitGreen" }, zmax: { accent: "emitGreen", pilasterEvery: 0 }, xmin: { accent: "emitGreen", pilasterEvery: 9.9 }, xmax: { accent: "emitGreen", pilasterEvery: 9.9 } },
    stripSpacing: 6,
    seed: 83,
  });

  // ---- aisle: drainage channels along both edges + cross channels between the zones
  drainChannel(kit, IMP, [AX - 4.4, z0 + 2.5], [AX - 3.6, z1 - 3.4], F);
  drainChannel(kit, IMP, [AX + 3.6, z0 + 2.5], [AX + 4.4, z1 - 3.4], F);
  for (const cz of [285, 311, 333]) drainChannel(kit, IMP, [x0 + 1.5, cz - 0.4], [x1 - 1.5, cz + 0.4], F);
  strip(kit, [AX - 3.5, F + 0.004, z0 + 2.5], [AX - 3.42, F + 0.012, z1 - 3.4], "emitGreen");
  strip(kit, [AX + 3.42, F + 0.004, z0 + 2.5], [AX + 3.5, F + 0.012, z1 - 3.4], "emitGreen");
  floorDecal(kit, [AX, 276], F, 2.0, DECAL.ARROW, 0);
  floorDecal(kit, [AX, 296], F, 2.2, DECAL.TEXT_C, 0);
  floorDecal(kit, [AX, 320], F, 2.2, DECAL.TEXT_A, 0);

  // ---- entry right: monitoring station facing the system wall display on the xmax wall
  {
    const sx = x1 - 4.6;
    kit.boxMM("paintedMetal", [x1 - 8.6, F, 273.4], [x1 - 0.3, F + 0.12, 281.6], { color: IMP.black, texel: 1 });
    kit.boxMM("deckBlack", [x1 - 8.5, F + 0.1, 273.5], [x1 - 0.4, F + 0.14, 281.5], { color: IMP.plateLight, texel: 0.5 });
    kit.collider([x1 - 8.6, F, 273.4], [x1 - 0.3, F + 0.14, 281.6], "dais");
    for (let i = 0; i < 3; i++) {
      const z = 275.3 + i * 2.2;
      consoleStation(kit, { pos: [sx, F + 0.14, z], yaw: -Math.PI / 2, w: 1.9, d: 0.85, screens: 2, accent: "emitGreen", seed: 90 + i, screenSet: [[11, 4], [11, 7], [3, 11]][i] });
      chair(kit, { pos: [sx - 0.85, F + 0.14, z], yaw: -Math.PI / 2 });
    }
    screenPanel(kit, { pos: [x1 - 0.02, F + 1.3, 277.5], yaw: Math.PI / 2, w: 5.2, h: 2.4, index: 11, accent: "emitGreen" });
    ledCluster(kit, { pos: [x1 - 0.05, F + 4.4, 274.6], yaw: Math.PI / 2, w: 1.2, h: 0.3, index: 2, accent: "emitGreen" });
    ledCluster(kit, { pos: [x1 - 0.05, F + 4.4, 280.4], yaw: Math.PI / 2, w: 1.2, h: 0.3, index: 9, accent: "emitGreen" });
    railing(kit, { from: [x1 - 8.6, 273.4], to: [x1 - 8.6, 281.6], y: F + 0.14, posts: 4 });
    computerBank(kit, { pos: [x1 - 3.6, F, z0 + 0.62], yaw: 0, w: 3.4, h: 2.6, seed: 41, accent: "emitGreen" });
    computerBank(kit, { pos: [x1 - 7.2, F, z0 + 0.62], yaw: 0, w: 3.4, h: 2.6, seed: 42, accent: "emitGreen" });
  }
  // ---- entry left: filter racks along the port wall + a service valve stack
  for (let i = 0; i < 3; i++) filterRack(kit, IMP, { pos: [x0 + 0.5, F, 274.6 + i * 4.6], yaw: -Math.PI / 2, w: 4.2, h: 3.2, d: 1.0, rows: 4, seed: 11 + i });
  valveStack(kit, { pos: [x0 + 0.5, F, 271.8], yaw: -Math.PI / 2, n: 3, r: 0.1, h: 2.4, wheel: IMP.green });
  {
    const { frame } = ctx.wall("zmin");
    frameScreen(frame, wallU(ctx, "zmin", 44), 2.4, 3.2, 1.5, 11, { accent: "emitGreen" });
    frame.decal(wallU(ctx, "zmin", 48.6), 2.4, 0.01, 1.0, 1.0, DECAL.TEXT_B);
    frame.decal(wallU(ctx, "zmin", 59.4), 3.6, 0.01, 1.0, 1.0, DECAL.EMBLEM);
  }
  hazardBay(kit, [x0 + 0.3, 272.2], [x0 + 2.4, 289.4], F, { w: 0.2 });

  // ---- air zone: four scrubber towers, hazard bays, duct headers to the ceiling maze
  const TOWERS = [
    [x0 + 6.2, 291],
    [x0 + 6.2, 303],
    [x1 - 6.2, 291],
    [x1 - 6.2, 303],
  ];
  TOWERS.forEach(([tx, tz], i) => {
    scrubberTower(kit, { pos: [tx, F, tz], r: 1.6, h: 8, accent: "emitGreen", seed: 20 + i });
    hazardBay(kit, [tx - 2.6, tz - 2.6], [tx + 2.6, tz + 2.6], F, { w: 0.25, decal: DECAL.NUMBER0 + i, decalSize: 1.2, decalAt: [tx + (tx < AX ? 2.0 : -2.0), tz - 2.0] });
    // intake duct from the tower shoulder to the wall, exhaust up to the ceiling main
    const wx = tx < AX ? x0 + 0.3 : x1 - 0.3;
    pipeRun(kit, { points: [[tx + (tx < AX ? -1.3 : 1.3), F + 6.4, tz], [wx, F + 6.4, tz]], r: 0.55, color: IMP.steelDark, clamps: 2 });
    kit.box("paintedMetal", wx + (tx < AX ? 0.2 : -0.2), F + 6.4, tz, 0.5, 1.7, 1.7, { color: IMP.black, texel: 1 });
    pipeRun(kit, { points: [[tx, F + 9.1, tz], [tx, C - 1.0, tz], [tx, C - 1.0, tz + (i % 2 ? -3 : 3)]], r: 0.32, color: IMP.plateBlue, clamps: 2 });
    // pump skid beside each tower
    const px = tx < AX ? tx + 3.6 : tx - 3.6;
    machineBlock(kit, { pos: [px, F, tz + 3.4], yaw: tx < AX ? -Math.PI / 2 : Math.PI / 2, size: [1.8, 1.5, 1.4], accent: "emitGreen", seed: 30 + i, hazard: false, vents: true, screen: false });
    pipeRun(kit, { points: [[px, F + 1.5, tz + 3.4], [px, F + 2.4, tz + 3.4], [tx + (tx < AX ? 1.7 : -1.7), F + 2.4, tz + 1.2]], r: 0.14, color: IMP.steel, clamps: 1.5 });
  });
  // fan bank between the left towers (recirculation) and a spare-cartridge stack between the right ones
  for (const fx of [x0 + 3.2, x0 + 6.2, x0 + 9.2]) {
    fanUnit(kit, { pos: [fx, F + 2.2, 297], yaw: 0, r: 1.0 });
    kit.box("paintedMetal", fx, F + 1.0, 297.2, 2.4, 2.0, 0.6, { color: IMP.plateDark, texel: 1 });
  }
  kit.boxMM("paintedMetal", [x0 + 1.9, F, 296.6], [x0 + 10.5, F + 0.3, 297.6], { color: IMP.black, texel: 1 });
  kit.collider([x0 + 1.9, F, 296.6], [x0 + 10.5, F + 3.4, 297.6], "fanbank");
  kit.boxMM("hazard", [x0 + 1.9, F + 0.3, 296.55], [x0 + 10.5, F + 0.45, 296.6], { texel: 2 });
  for (let i = 0; i < 6; i++) barrel(kit, { pos: [x1 - 4.2 + (i % 3) * 0.9, F, 296.4 + Math.floor(i / 3) * 0.9], r: 0.38, h: 1.1, color: IMP.plateLight, band: IMP.green });

  // ---- water zone (starboard): three tanks, gauges toward the aisle, header + valves between them
  const TANKS = [314.5, 322, 329.5];
  TANKS.forEach((tz, i) => {
    tank(kit, { pos: [x1 - 3.9, F, tz], r: 2.2, h: 6.5, color: IMP.plate, accent: "emitGreen", seed: 50 + i });
    pipeRun(kit, { points: [[x1 - 3.9, F + 7.3, tz], [x1 - 3.9, F + 8.4, tz]], r: 0.16, color: IMP.steel });
  });
  pipeRun(kit, { points: [[x1 - 3.9, F + 8.4, 311.5], [x1 - 3.9, F + 8.4, 332.5], [x1 - 3.9, C - 1.0, 332.5]], r: 0.34, color: IMP.plateBlue, clamps: 3 });
  for (const vz of [318.25, 325.75]) {
    valveStack(kit, { pos: [x1 - 6.8, F, vz], yaw: Math.PI / 2, n: 3, r: 0.12, h: 2.6, wheel: IMP.plateBlue });
    pipeRun(kit, { points: [[x1 - 6.8, F + 0.4, vz], [x1 - 6.8, F + 0.4, vz - 1.9]], r: 0.1, color: IMP.steelDark });
  }
  hazardBay(kit, [x1 - 7.2, 311.6], [x1 - 0.3, 332.6], F, { w: 0.3, decal: DECAL.TEXT_A, decalSize: 1.8, decalAt: [x1 - 8.4, 322] });
  screenPanel(kit, { pos: [x1 - 0.02, F + 1.6, 335.4], yaw: Math.PI / 2, w: 2.6, h: 1.4, index: 7, accent: "emitGreen" });

  // ---- waste zone (port): three processors facing the aisle, a compactor at the end, drums
  const PROC = [315, 322, 329];
  PROC.forEach((pz, i) => {
    machineBlock(kit, { pos: [x0 + 3.0, F, pz], yaw: -Math.PI / 2, size: [4.4, 3.2, 3.6], color: IMP.plateWarm, accent: "emitAmber", seed: 70 + i, stencil: DECAL.WARNING });
    // feed hopper + exhaust stack
    kit.box("paintedMetal", x0 + 3.0, F + 3.6, pz - 1.0, 1.6, 0.8, 1.6, { color: IMP.black, texel: 1 });
    kit.cyl("metal", x0 + 3.0, F + 5.6, pz - 1.0, 0.35, 3.4, "y", { color: IMP.gunmetal, segments: 14 });
    pipeRun(kit, { points: [[x0 + 3.0, F + 7.3, pz - 1.0], [x0 + 3.0, C - 1.0, pz - 1.0], [x0 + 6.0, C - 1.0, pz - 1.0]], r: 0.3, color: IMP.steelDark, clamps: 2 });
    hazardBay(kit, [x0 + 0.3, pz - 3.2], [x0 + 5.6, pz + 3.2], F, { w: 0.3, mat: "hazardRed", decal: DECAL.NUMBER0 + i, decalSize: 1.0, decalAt: [x0 + 6.4, pz - 2.4] });
    kit.box("darkGloss", x0 + 5.35, F + 1.6, pz + 1.2, 0.04, 0.5, 0.9);
    kit.box("leds", x0 + 5.375, F + 1.6, pz + 1.2, 0.01, 0.1, 0.8, { uv: "keep", uvRect: ledRect((i * 5 + 2) % 16) });
  });
  machineBlock(kit, { pos: [x0 + 5.6, F, z1 - 2.6], yaw: Math.PI / 2, size: [4.2, 3.6, 2.6], color: IMP.plateDark, accent: "emitAmber", seed: 77, stencil: DECAL.RESTRICTED });
  {
    const rand = rng(9);
    for (let i = 0; i < 9; i++) barrel(kit, { pos: [x0 + 1.2 + (i % 3) * 0.85 + rand() * 0.1, F, 334.2 + Math.floor(i / 3) * 0.85], r: 0.36, h: 0.95, color: i % 4 === 0 ? IMP.plateWarm : IMP.plateDark, band: i % 3 ? IMP.hazardYellow : IMP.red });
  }

  // ---- dehumidifier bank on the aft wall: black housing, louvres below, fans above, condensate drains
  {
    const hx0 = AX - 8.5,
      hx1 = x1 - 0.4;
    const hz = z1 - 0.9;
    kit.boxMM("paintedMetal", [hx0, F, hz], [hx1, F + 6.4, z1 - 0.15], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [hx0 + 0.1, F + 0.2, hz - 0.02], [hx1 - 0.1, F + 6.2, hz], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.collider([hx0, F, hz - 0.1], [hx1, F + 6.4, z1], "dehumidifier");
    const n = 5;
    for (let i = 0; i < n; i++) {
      const vx = hx0 + 1.9 + i * ((hx1 - hx0 - 3.8) / (n - 1));
      louvreVent(kit, { pos: [vx, F + 0.5, hz - 0.28], yaw: 0, w: 2.6, h: 2.2, depth: 0.25 });
      fanUnit(kit, { pos: [vx, F + 4.6, hz - 0.2], yaw: 0, r: 0.95 });
      kit.box("emitGreen", vx + 1.1, F + 3.15, hz - 0.03, 0.06, 0.06, 0.02);
      // condensate drain into the aft cross channel
      pipeRun(kit, { points: [[vx - 0.9, F + 0.4, hz - 0.3], [vx - 0.9, F + 0.1, hz - 0.3], [vx - 0.9, F + 0.1, 333.6]], r: 0.06, color: IMP.steel });
    }
    kit.boxMM("hazard", [hx0, F + 3.0, hz - 0.04], [hx1, F + 3.3, hz - 0.02], { texel: 1 });
    kit.boxMM("emitWhiteSoft", [hx0 + 0.4, F + 6.1, hz - 0.06], [hx1 - 0.4, F + 6.16, hz - 0.02], { uv: "keep" });
    ledCluster(kit, { pos: [hx0 + 1.2, F + 3.9, hz - 0.03], yaw: 0, w: 1.4, h: 0.3, index: 6, accent: "emitGreen" });
    new Placer(kit, [(hx0 + hx1) / 2, F, hz], 0).decal(0, 5.4, -0.03, 0.9, 0.9, DECAL.TEXT_B);
    kit.boxMM("hazard", [hx0 - 0.4, F + 0.003, hz - 1.6], [hx1, F + 0.011, hz - 1.3], { texel: 1 });
  }

  // ---- pipe maze: ceiling mains along the hall, cross headers, wall racks
  const MAINS = [
    [x0 + 7.8, 0.36, IMP.steelDark],
    [x0 + 10.2, 0.24, IMP.plateBlue],
    [AX - 1.4, 0.2, IMP.green],
    [AX + 1.6, 0.16, IMP.hazardYellow],
    [x1 - 10.2, 0.3, IMP.gunmetal],
    [x1 - 7.8, 0.22, IMP.plateBlue],
  ];
  MAINS.forEach(([mx, r, color], i) => {
    pipeRun(kit, { points: [[mx, C - 1.0 - (i % 2) * 0.5, z0 + 1.5], [mx, C - 1.0 - (i % 2) * 0.5, z1 - 1.5]], r, color, clamps: 5, clampColor: IMP.black });
  });
  for (const hz of [288, 306, 318, 330]) {
    pipeRun(kit, { points: [[x0 + 1.0, C - 1.9, hz], [x1 - 1.0, C - 1.9, hz]], r: 0.28, color: IMP.steelDark, clamps: 4 });
    pipeRun(kit, { points: [[x0 + 1.0, C - 2.3, hz + 0.7], [x1 - 1.0, C - 2.3, hz + 0.7]], r: 0.14, color: IMP.red, clamps: 4 });
    for (const mx of [x0 + 7.8, x1 - 10.2]) kit.sphere("metal", mx, C - 1.45, hz, 0.42, { color: IMP.black, segments: 12 });
  }
  // suspended pipe bridge over the aisle at each header
  for (const hz of [288, 306, 318, 330]) for (const bx of [AX - 3.0, AX + 3.0]) kit.box("paintedMetal", bx, C - 1.2, hz, 0.2, 2.4, 0.2, { color: IMP.black, texel: 1 });
  for (const [wx, s] of [[x0 + 0.3, 1], [x1 - 0.3, -1]]) {
    for (const [dy, r, color] of [[4.6, 0.16, IMP.steelDark], [5.1, 0.1, IMP.red], [5.5, 0.12, IMP.plateBlue], [5.9, 0.08, IMP.green]]) {
      pipeRun(kit, { points: [[wx + s * r, F + dy, z0 + 1.0], [wx + s * r, F + dy, z1 - 1.5]], r, color, clamps: 3.3, clampColor: IMP.black });
    }
    for (let z = z0 + 4; z < z1 - 2; z += 6.6) kit.box("paintedMetal", wx + s * 0.25, F + 5.25, z, 0.5, 1.6, 0.14, { color: IMP.black, texel: 1 });
  }

  // ---- structure: corner pilasters + green status strips along the side walls
  pillar(kit, { pos: [x0 + 0.9, F, z0 + 0.9], h: ctx.h, w: 0.8 });
  pillar(kit, { pos: [x1 - 0.9, F, z0 + 0.9], h: ctx.h, w: 0.8 });
  strip(kit, [x0 + 0.05, F + 2.2, z0 + 2], [x0 + 0.09, F + 2.25, z1 - 2], "emitGreen");
  strip(kit, [x1 - 0.09, F + 2.2, z0 + 2], [x1 - 0.05, F + 2.25, z1 - 2], "emitGreen");

  // ---- lights: white work lights down the aisle, green accents in the scrubber hall
  const aisle = [278, 296, 314, 332].map((z) => workLight(ctx, [AX, C, z], { drop: 3.2, size: 1.6, intensity: 300, distance: 36 }));
  const greens = [
    ctx.light(0x8cffc0, 120, 26, [x0 + 6.2, F + 7.0, 297]),
    ctx.light(0x8cffc0, 120, 26, [x1 - 6.2, F + 7.0, 297]),
  ];
  workLight(ctx, [x1 - 4.6, C, 277.5], { drop: 4.0, size: 1.2, intensity: 160, distance: 24, warm: true });
  const gBase = greens.map((l) => l.intensity);
  void aisle;
  ctx.animate((dt, t) => {
    // slow breathing of the scrubber accent lights
    greens.forEach((l, i) => setLightLevel(l, gBase[i], 0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.3)));
  });
}
