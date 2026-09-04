// Mess hall & galley (Deck 7): from the spine door a wide cross aisle runs east through eleven rows
// of long tables with benches (three per row, split by a north–south aisle that serves the cross-
// corridor door) to the serving line — a twenty-metre counter with food wells under heat lamps, a
// sneeze guard, ration dispensers (interactable) and a caf bank, and pass windows into the galley.
// The galley behind the partition: heater row with an extraction hood, prep islands with pot racks,
// wash-up sinks, dry-store shelving, a walk-in cooler. Warmer light than the corridors; the galley
// is cooler and harsher. Tray racks, wash basins and news screens by the door.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame, ceilingFrame } from "../../../core/frame.js";
import { impCeiling, table, bench, wallScreen, ceilingLight, pointLightDesc, crate, pipeRun } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, instancedProp, partition, fauxDoor, counter, shelfUnit, dispenser, washStation, floorDecal, ceilingStrip, namePlate, trayRack, oven, interactPlates, rng } from "./crewKit.js";

const WARM = 0xffe6c8; // dining light
const COOL = 0xe8f0ff; // galley light
const AMBER = 0xffb060;

export function buildMess(kit, ctx) {
  ensureCrewMaterials(ctx.mats);
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const walls = roomWalls(room);
  const xW = x0 + STD.wallT;
  const xE = x1 - STD.wallT;
  const zN = z0 + STD.wallT;
  const zS = z1 - STD.wallT;

  buildShell(kit, ctx, ctx.id, room, {
    skip: ["ceiling"],
    wall: { pitch: 3.75, tone: IMP.wallLight, toneAlt: IMP.wallMid, bandMat: "lightBandWarm", styles: { plain: 0.6, vent: 0.16, hatch: 0.14, pipes: 0.1 } },
    floor: { tone: IMP.wallDark, strip: false },
  });
  impCeiling(ceilingFrame(kit, x0, z0, y + h), x1 - x0, z1 - z0, { lights: false, panelW: 2.1, seed: 51 });

  // ---- plan ------------------------------------------------------------------------------------
  const partX = 31.7; // dining | galley partition plane
  const aisleZ0 = 352.4; // cross aisle from the west door
  const aisleZ1 = 358.6;
  const aisleC = (aisleZ0 + aisleZ1) / 2;
  const midX0 = 18.6; // north–south aisle (to the cross-corridor door at x = 20)
  const midX1 = 21.4;
  const cols = [10.45, 16.15, 23.85]; // table centres (4.9 m tables)
  const rowsN = [339.4, 342.4, 345.4, 348.4, 351.4];
  const rowsS = [359.6, 362.6, 365.6, 368.6, 371.6, 374.6];
  const rows = [...rowsN, ...rowsS];

  // ---- deck: worn aisle strips + stencils --------------------------------------------------------
  const worn = (ax0, az0, ax1, az1) => {
    kit.boxMM("impDeck", [ax0, y + 0.002, az0], [ax1, y + 0.008, az1], { color: IMP.wallMid, texel: 0.5 });
  };
  worn(xW + 0.3, aisleC - 1.9, partX - 3.4, aisleC + 1.9);
  worn(midX0 + 0.3, zN + 0.4, midX1 - 0.3, zS - 0.3);
  for (const z of [aisleC - 1.9, aisleC + 1.9 - 0.1]) kit.boxMM("impMetal", [xW + 0.3, y + 0.004, z], [partX - 3.4, y + 0.01, z + 0.1], { color: IMP.steel });
  for (const x of [midX0 + 0.3, midX1 - 0.4]) kit.boxMM("impMetal", [x, y + 0.004, zN + 0.4], [x + 0.1, y + 0.01, zS - 0.3], { color: IMP.steel });
  floorDecal(kit, xW + 1.6, y, aisleC, 1.1, 7, -90);
  floorDecal(kit, xW + 3.4, y, aisleC + 1.3, 0.7, 9, 0);
  floorDecal(kit, 20, y, zS - 1.6, 1.0, 2, 0);
  floorDecal(kit, 20, y, zN + 1.4, 0.8, 2, 180);
  floorDecal(kit, 27.4, y, aisleC, 0.9, 13, -90);

  // ---- dining hall: instanced table sets ---------------------------------------------------------
  const sets = [];
  for (const z of rows) for (const x of cols) sets.push({ pos: [x, y, z], rot: [0, 0, 0] });
  instancedProp(
    kit,
    (k) => {
      table(k, [0, 0, 0], 4.9, 0.85, { h: 0.76, tone: IMP.wallMid, collide: false });
      for (const px of [-1.7, 1.7]) k.box("impPaintedMetal", px, 0.35, 0, 0.5, 0.7, 0.5, { color: IMP.trim, texel: 1 });
      k.box("impPaintedMetal", 0, 0.025, 0, 4.2, 0.05, 0.6, { color: IMP.trim, texel: 1 });
      bench(k, [0, 0, -0.72], 4.6, Math.PI, { collide: false, color: IMP.fabricGrey });
      bench(k, [0, 0, 0.72], 4.6, 0, { collide: false, color: IMP.fabricGrey });
      // condiment caddy + a table-number plate in the middle of every table
      k.box("impMetal", 0, 0.78 + 0.02, 0, 0.36, 0.04, 0.2, { color: IMP.steel, texel: 2 });
      for (let c = 0; c < 3; c++) k.add("impMetal", new THREE.CylinderGeometry(0.03, 0.035, 0.12, 8), { pos: [-0.1 + c * 0.1, 0.86, 0], color: [IMP.white, IMP.gunmetal, 0xb8231c][c], uv: "scale", uvScale: [0.2, 0.2] });
      k.box("impPaintedMetal", 0, 0.98, 0.09, 0.14, 0.12, 0.02, { color: IMP.consoleDark, texel: 1 });
      const dg = new THREE.PlaneGeometry(0.1, 0.1);
      k.add("impDecal", dg, { pos: [0, 0.98, 0.101], uv: "keep", uvRect: impDecalRect(6) });
    },
    sets,
  );
  for (const s of sets) kit.collider([s.pos[0] - 2.45, y, s.pos[2] - 1.0], [s.pos[0] + 2.45, y + 1.2, s.pos[2] + 1.0], "tableSet");
  // trays with food left on some tables (merged, so they vary), ceiling strip over every table
  const rand = rng(17);
  for (const s of sets) {
    const [cx, , cz] = s.pos;
    ceilingStrip(kit, [cx, y + h, cz], 4.4, "x", { mat: "lightBandWarm", w: 0.22 });
    const n = Math.floor(rand() * 3);
    for (let t = 0; t < n; t++) {
      const tx = cx + (rand() - 0.5) * 4.0;
      const tz = cz + (rand() < 0.5 ? -0.2 : 0.2);
      kit.box("impPaintedMetal", tx, y + 0.775, tz, 0.44, 0.03, 0.3, { color: IMP.wallMid, texel: 2 });
      kit.add("impMetal", new THREE.CylinderGeometry(0.07, 0.06, 0.05, 10), { pos: [tx - 0.1, y + 0.815, tz], color: IMP.steel, uv: "scale", uvScale: [0.3, 0.1] });
      kit.box("impPaintedMetal", tx + 0.1, y + 0.805, tz, 0.14, 0.03, 0.14, { color: [0x8a5a2a, 0x556b2f, 0xc8a050][Math.floor(rand() * 3)], texel: 2 });
    }
  }

  // ---- lighting: cross-aisle fixtures + fills (dining), serving + galley -------------------------
  for (const [i, x] of cols.entries()) ceilingLight(kit, ctx, [x, y + h, aisleC], 5.0, "x", { mat: "lightBandWarm", color: WARM, intensity: 12, distance: 18, priority: i === 1 ? 2 : 1 });
  for (const z of [345.4, 367.1]) for (const x of [11.5, 22.5]) pointLightDesc(ctx, WARM, 22, 26, [x, y + h - 0.7, z], 1);
  pointLightDesc(ctx, AMBER, 6, 12, [29.0, y + 2.6, aisleC], 1);
  for (const z of [351, 361]) ceilingLight(kit, ctx, [35.6, y + h, z], 4.2, "z", { mat: "lightBand", color: COOL, intensity: 9, distance: 12, priority: 1 });
  pointLightDesc(ctx, 0xff9a40, 3.5, 7, [38.8, y + 1.3, 356], 0);
  pointLightDesc(ctx, COOL, 8, 12, [34.5, y + h - 0.6, 370], 0);

  // ---- west wall: entry — screens, tray racks, basins, notice board -----------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(349.6), 2.15, 2.6, 1.3, 1);
    wallScreen(frame, w.u(343.6), 2.15, 2.6, 1.3, 2);
    frame.quad("impDecal", w.u(346.6), 2.3, 0.062, 0.55, 0.55, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(346.6), 1.6, 0.062, 0.55, 0.55, { uvRect: impDecalRect(3) });
    // emergency point
    frame.box("impPaintedMetal", w.u(340.4), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(340.4), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
    frame.quad("impDecal", w.u(340.4), 0.95, 0.262, 0.26, 0.26, { uvRect: impDecalRect(13) });
    // notice board south of the door + schedule screen
    frame.box("impPaintedMetal", w.u(365.4), 1.6, 0.075, 1.6, 1.0, 0.03, { color: IMP.consoleDark, texel: 1 });
    for (let i = 0; i < 6; i++) frame.quad("impDecal", w.u(365.4) - 0.55 + (i % 3) * 0.55, 1.85 - Math.floor(i / 3) * 0.5, 0.092, 0.38, 0.38, { uvRect: impDecalRect([3, 9, 15, 6, 0, 11][i]) });
    wallScreen(frame, w.u(369.8), 2.15, 2.6, 1.3, 1);
    frame.quad("impDecal", w.u(373.6), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    namePlate(frame, w.u(359.2), 2.9, { decal: 15, led: "crewEmit", ledColor: 0x40ff70 });
    // hand-wash basins right of the door (no mirrors: a hygiene stencil instead)
    counter(kit, [xW + 0.34, y, 361.6], 2.4, Math.PI / 2, { d: 0.6, h: 0.88, doors: false, tone: IMP.wallDark, tag: "basins" });
    for (const z of [361.0, 362.2]) washStation(frame, w.u(z), { counterH: 0.88, counterD: 0.68, mirror: false });
    frame.quad("impDecal", w.u(361.6), 1.5, 0.062, 0.4, 0.4, { uvRect: impDecalRect(13) });
    frame.box("impPaintedMetal", w.u(363.2), 1.3, 0.1, 0.16, 0.34, 0.14, { color: IMP.consoleDark, texel: 1 });
    frame.box("crewEmit", w.u(363.2), 1.42, 0.172, 0.08, 0.03, 0.006, { color: 0x3a86ff });
  }
  trayRack(kit, [xW + 0.75, y, 352.6], Math.PI / 2, { seed: 3 });
  trayRack(kit, [xW + 0.75, y, 351.3], Math.PI / 2, { seed: 4, trays: 3 });
  trayRack(kit, [xW + 0.75, y, 359.7], Math.PI / 2, { seed: 5, trays: 6 });

  // ---- north wall: menu screens, utensil counter, chrono --------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(10.45), 2.4, 2.6, 1.2, 1);
    wallScreen(frame, w.u(23.85), 2.4, 2.6, 1.2, 2);
    for (const [x, i] of [[6.2, 0], [14.2, 15], [28.2, 3]]) frame.quad("impDecal", w.u(x), 2.5, 0.062, 0.55, 0.55, { uvRect: impDecalRect(i) });
    // deck chrono over the north–south aisle
    frame.box("impPaintedMetal", w.u(20), 2.9, 0.07, 1.5, 0.42, 0.06, { color: IMP.consoleDark, texel: 1 });
    frame.box("darkGloss", w.u(20), 2.9, 0.105, 1.3, 0.28, 0.01);
    frame.box("crewEmit", w.u(20), 2.9, 0.112, 1.0, 0.1, 0.004, { color: 0xff5030 });
    frame.box("crewEmit", w.u(20) + 0.45, 2.9, 0.112, 0.06, 0.1, 0.004, { color: 0x3a86ff });
    // utensil counter with bins + napkin stacks
    counter(kit, [16.4, y, zN + 0.36], 3.6, 0, { d: 0.7, h: 0.9, doors: false, tone: IMP.wallDark, tag: "utensils" });
    for (let b = 0; b < 4; b++) {
      kit.box("impPaintedMetal", 15.0 + b * 0.5, y + 0.98, zN + 0.36, 0.4, 0.16, 0.5, { color: b % 2 ? IMP.gunmetal : IMP.consoleDark, texel: 2 });
      kit.box("impMetal", 15.0 + b * 0.5, y + 1.02, zN + 0.36, 0.3, 0.1, 0.4, { color: IMP.steel, texel: 2 });
    }
    kit.box("impPaintedMetal", 17.6, y + 0.98, zN + 0.36, 0.4, 0.16, 0.4, { color: IMP.white, texel: 2 });
    frame.quad("impDecal", w.u(16.4), 1.5, 0.062, 0.45, 0.45, { uvRect: impDecalRect(6) });
    frame.box("impPaintedMetal", w.u(2.75 + 0.9), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(2.75 + 0.9), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
  }

  // ---- south wall: tray return, recycling, screens ----------------------------------------------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    // tray return: counter under a conveyor slot in the wall
    counter(kit, [24.8, y, zS - 0.4], 4.6, 0, { d: 0.8, h: 0.9, doors: true, tone: IMP.wallDark, tag: "trayReturn" });
    frame.box("impPaintedMetal", w.u(24.8), 1.35, 0.06, 4.0, 0.7, 0.08, { color: IMP.trim, texel: 1 });
    frame.box("impPaintedMetal", w.u(24.8), 1.35, 0.11, 3.6, 0.5, 0.02, { color: IMP.black, texel: 1 });
    frame.box("impMetal", w.u(24.8), 1.08, 0.2, 3.6, 0.04, 0.3, { color: IMP.steel, texel: 1 });
    frame.box("crewEmit", w.u(24.8), 1.62, 0.105, 3.4, 0.03, 0.01, { color: 0xffb020 });
    frame.quad("impDecal", w.u(24.8) - 2.3, 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    frame.quad("impDecal", w.u(24.8) + 2.3, 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    for (let t = 0; t < 5; t++) kit.box("impPaintedMetal", 23.0 + (t % 3) * 0.55, y + 0.915 + Math.floor(t / 3) * 0.035, zS - 0.45, 0.44, 0.03, 0.3, { color: t % 2 ? IMP.wallMid : IMP.wallDark, texel: 2 });
    // recycling bins west of the door
    for (let b = 0; b < 3; b++) {
      const bx = 15.4 + b * 0.8;
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.3, 0.27, 0.92, 14), { pos: [bx, y + 0.46, zS - 0.5], color: [IMP.gunmetal, 0x2a5a8a, 0x7a5a2a][b], uv: "scale", uvScale: [2, 1] });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.31, 0.31, 0.06, 14), { pos: [bx, y + 0.95, zS - 0.5], color: IMP.trim, uv: "scale", uvScale: [2, 0.1] });
      kit.add("impMetal", new THREE.CylinderGeometry(0.14, 0.14, 0.01, 12), { pos: [bx, y + 0.985, zS - 0.5], color: IMP.black, uv: "scale", uvScale: [1, 0.1] });
      frame.quad("impDecal", w.u(bx), 1.5, 0.062, 0.36, 0.36, { uvRect: impDecalRect([9, 3, 6][b]) });
    }
    kit.collider([15.0, y, zS - 0.85], [17.4, y + 1.0, zS], "bins");
    wallScreen(frame, w.u(9.5), 2.3, 2.4, 1.1, 2);
    wallScreen(frame, w.u(30.0), 2.3, 1.6, 0.9, 1);
    frame.quad("impDecal", w.u(11.6), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    frame.quad("impDecal", w.u(7.4), 2.3, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
  }

  // ---- serving line -------------------------------------------------------------------------------
  const cX = 29.2;
  counter(kit, [cX, y, aisleC], 20.0, -Math.PI / 2, { d: 0.9, h: 0.92, doors: true, tone: IMP.consoleDark, kickLight: "emitAmber", tag: "servingCounter" });
  // food wells + inserts, tray stacks and cutlery bins on the top
  const wells = [348.2, 349.6, 351.0, 352.4, 354.6, 356.0, 357.4, 359.6, 361.0, 362.4, 363.8];
  for (const [i, z] of wells.entries()) {
    kit.box("impMetal", cX + 0.08, y + 0.925, z, 0.62, 0.02, 1.1, { color: IMP.gunmetal, texel: 2 });
    kit.box("impPaintedMetal", cX + 0.08, y + 0.93, z, 0.5, 0.02, 1.0, { color: [0x8a5a2a, 0x556b2f, 0xc8a050, 0x6a4a3a, 0x9aa0a8][i % 5], texel: 2 });
    if (i % 3 === 1) for (let k = 0; k < 3; k++) kit.add("impMetal", new THREE.CylinderGeometry(0.06, 0.05, 0.05, 8), { pos: [cX + 0.08 + (k - 1) * 0.16, y + 0.965, z + 0.3], color: IMP.steel, uv: "scale", uvScale: [0.3, 0.1] });
  }
  for (let t = 0; t < 8; t++) kit.box("impPaintedMetal", cX + 0.05, y + 0.935 + t * 0.03, 346.7, 0.46, 0.03, 0.32, { color: t % 2 ? IMP.wallMid : IMP.wallDark, texel: 2 });
  for (let t = 0; t < 5; t++) kit.box("impPaintedMetal", cX + 0.05, y + 0.935 + t * 0.03, 365.3, 0.46, 0.03, 0.32, { color: t % 2 ? IMP.wallMid : IMP.wallDark, texel: 2 });
  for (const z of [347.3, 364.7]) kit.box("impMetal", cX + 0.1, y + 0.99, z, 0.5, 0.12, 0.34, { color: IMP.steel, texel: 2 });
  // sneeze guard on the public edge + heat-lamp bar above the wells
  kit.boxMM("glass", [cX - 0.44, y + 1.22, 346.4], [cX - 0.43, y + 1.72, 365.6]);
  for (const z of [346.4, 351.2, 356.0, 360.8, 365.6]) {
    kit.box("impMetal", cX - 0.435, y + 1.42, z, 0.04, 0.6, 0.04, { color: IMP.steel });
    kit.box("impMetal", cX - 0.2, y + 2.0, z, 0.04, 0.04, 0.03, { color: IMP.steel });
  }
  kit.boxMM("impMetal", [cX - 0.45, y + 1.72, 346.3], [cX - 0.41, y + 1.76, 365.7], { color: IMP.steel, texel: 1 });
  kit.boxMM("impPaintedMetal", [cX - 0.3, y + 1.98, 346.2], [cX + 0.3, y + 2.1, 365.8], { color: IMP.trim, texel: 1 });
  for (const z of wells) {
    kit.add("impMetal", new THREE.CylinderGeometry(0.11, 0.07, 0.1, 12), { pos: [cX, y + 1.93, z], color: IMP.gunmetal, uv: "scale", uvScale: [0.6, 0.2] });
    kit.add("emitAmber", new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), { pos: [cX, y + 1.875, z], uv: "scale", uvScale: [0.3, 0.1] });
  }
  for (const z of [347.5, 356.0, 364.5]) {
    kit.box("impMetal", cX, y + 2.15, z, 0.05, 0.1, 0.05, { color: IMP.steel });
    kit.box("impMetal", cX, y + (2.2 + h) / 2, z, 0.04, h - 2.2, 0.04, { color: IMP.gunmetal });
  }
  // queue rail in front of the north end of the counter (guides diners from the aisle)
  for (const z of [346.2, 349.4, 352.6]) kit.box("impPaintedMetal", 27.0, y + 0.5, z, 0.06, 1.0, 0.06, { color: IMP.trim, texel: 1 });
  kit.boxMM("impMetal", [26.97, y + 0.97, 346.2], [27.03, y + 1.02, 352.6], { color: IMP.steel });
  kit.boxMM("impPaintedMetal", [26.98, y + 0.55, 346.2], [27.02, y + 0.59, 352.6], { color: IMP.trim });
  kit.collider([26.9, y, 346.1], [27.1, y + 1.05, 352.7], "queueRail");

  // ---- partition: pass windows, staff doors, menu screens; dispenser banks -----------------------
  const pWin = [[348.4, 351.4], [354.5, 357.5], [360.6, 363.6]];
  const pDoor = [[338.2, 339.5], [374.5, 375.8]];
  const pu = (z) => z - zN;
  const { frame: pf } = partition(kit, [partX, zN], [partX, zS], y, h - 0.05, {
    openings: [...pWin.map(([a, b]) => ({ u0: pu(a), u1: pu(b), h: 2.5, sign: false })), ...pDoor.map(([a, b]) => ({ u0: pu(a), u1: pu(b), h: 2.3 }))],
    tone: IMP.wallLight,
    toneAlt: IMP.wallMid,
    band: "lightBandWarm",
    seed: 57,
    tag: "galleyWall",
    pitch: 3.0,
  });
  for (const [a, b] of pWin) {
    // pass counter closes the lower part of the window
    kit.boxMM("impPaintedMetal", [partX - 0.24, y, a - 0.02], [partX + 0.24, y + 1.0, b + 0.02], { color: IMP.consoleDark, texel: 1 });
    kit.boxMM("impMetal", [partX - 0.3, y + 1.0, a - 0.06], [partX + 0.3, y + 1.05, b + 0.06], { color: IMP.steel, texel: 1 });
    kit.collider([partX - 0.3, y, a - 0.06], [partX + 0.3, y + 1.05, b + 0.06], "passCounter");
    // plated meals waiting on the pass, a menu screen above the window on the dining side
    for (let k = 0; k < 4; k++) {
      const z = a + 0.45 + k * 0.7;
      kit.box("impPaintedMetal", partX - 0.1, y + 1.065, z, 0.3, 0.03, 0.3, { color: IMP.wallMid, texel: 2 });
      kit.add("impMetal", new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), { pos: [partX - 0.1, y + 1.105, z], color: IMP.steel, uv: "scale", uvScale: [0.5, 0.1] });
    }
    wallScreen(pf, pu((a + b) / 2), 3.15, 2.4, 0.9, 1, { leds: false });
    pf.box("crewEmit", pu((a + b) / 2), 2.62, 0.13, 2.8, 0.03, 0.01, { color: 0xffb020 });
  }
  const pN = 0.08 + 0.024; // partition face offset
  pf.quad("impDecal", pu(346.0), 2.9, pN + 0.002, 0.55, 0.55, { uvRect: impDecalRect(15) });
  pf.quad("impDecal", pu(366.4), 2.9, pN + 0.002, 0.55, 0.55, { uvRect: impDecalRect(0) });
  namePlate(pf, pu(337.2), 2.55, { n: pN, decal: 3, led: "crewEmit", ledColor: 0xffb020 });
  namePlate(pf, pu(376.8), 2.55, { n: pN, decal: 3, led: "crewEmit", ledColor: 0xffb020 });
  // ration dispensers (interactable) north of the counter, caf bank south of it
  const dX = partX - 0.08 - 0.024 - 0.31;
  const rationPlates = [];
  for (const z of [341.2, 342.4, 343.6, 344.8]) {
    const { keypad, quat } = dispenser(kit, [dX, y, z], -Math.PI / 2, { accent: "emitAmber", screen: 1, decal: 15, tone: IMP.console });
    rationPlates.push({ pos: [keypad.x, keypad.y, keypad.z], quat, size: [0.14, 0.09, 0.02] });
  }
  interactPlates(ctx, rationPlates, {
    id: "mess:rations",
    label: "Dispense ration",
    onActivate: (api) => {
      api.hud.setStatus("Ration dispensed.");
      return true;
    },
  });
  const cafPlates = [];
  for (const z of [367.4, 368.6, 369.8]) {
    const { keypad, quat } = dispenser(kit, [dX, y, z], -Math.PI / 2, { accent: "emitBlue", screen: 2, decal: 9, tone: IMP.consoleDark });
    cafPlates.push({ pos: [keypad.x, keypad.y, keypad.z], quat, size: [0.14, 0.09, 0.02] });
  }
  interactPlates(ctx, cafPlates, {
    id: "mess:caf",
    label: "Draw caf",
    onActivate: (api) => {
      api.hud.setStatus("Caf dispensed. Mind the heat.");
      return true;
    },
  });
  pf.quad("impDecal", pu(343.0), 2.4, pN + 0.002, 0.5, 0.5, { uvRect: impDecalRect(15) });
  pf.quad("impDecal", pu(368.6), 2.4, pN + 0.002, 0.5, 0.5, { uvRect: impDecalRect(9) });
  floorDecal(kit, dX - 1.4, y, 343.0, 0.8, 15, -90);
  floorDecal(kit, dX - 1.4, y, 368.6, 0.8, 9, -90);

  // ---- galley -------------------------------------------------------------------------------------
  const gx0 = partX + 0.16;
  // soft gloss: the plain gloss deck mirrored the aisle light bands into a blown-out pool down the galley
  kit.boxMM("impGlossSoft", [gx0, y + 0.001, zN + 0.12], [xE - 0.12, y + 0.006, zS - 0.12], { color: IMP.wallDark, texel: 0.3 });
  // heater row on the east wall under an extraction hood
  const ovZ = [348.2, 351.0, 353.8, 356.6, 359.4, 362.2];
  for (const [i, z] of ovZ.entries()) oven(kit, [xE - 0.47, y, z], -Math.PI / 2, { rings: i % 2 ? 1 : 2 });
  kit.boxMM("impMetal", [xE - 1.5, y + 2.3, ovZ[0] - 0.9], [xE, y + 2.9, ovZ[ovZ.length - 1] + 0.9], { color: IMP.steel, texel: 0.5 });
  kit.boxMM("impPaintedMetal", [xE - 1.45, y + 2.28, ovZ[0] - 0.8], [xE - 0.1, y + 2.3, ovZ[ovZ.length - 1] + 0.8], { color: IMP.trim, texel: 1 });
  kit.boxMM("lightBand", [xE - 1.3, y + 2.27, ovZ[0] - 0.6], [xE - 0.3, y + 2.285, ovZ[ovZ.length - 1] + 0.6], { uv: "keep" });
  for (const z of [350.0, 355.2, 360.4]) kit.add("impMetal", new THREE.CylinderGeometry(0.32, 0.32, h - 2.9, 14), { pos: [xE - 0.75, y + 2.9 + (h - 2.9) / 2, z], color: IMP.gunmetal, uv: "scale", uvScale: [2, 1] });
  kit.collider([xE - 1.0, y, ovZ[0] - 0.7], [xE, y + 1.3, ovZ[ovZ.length - 1] + 0.7], "heaters");
  // pans on the cooktops, a utensil rail
  for (const [z, s] of [[348.2, 1], [353.8, -1], [359.4, 1]]) {
    kit.add("impMetal", new THREE.CylinderGeometry(0.19, 0.17, 0.09, 14), { pos: [xE - 0.47, y + 1.325, z + s * 0.325], color: IMP.steel, uv: "scale", uvScale: [1, 0.2] });
    kit.box("impMetal", xE - 0.47 - 0.28, y + 1.35, z + s * 0.325, 0.2, 0.02, 0.03, { color: IMP.gunmetal });
  }
  kit.boxMM("impMetal", [xE - 0.08, y + 1.75, ovZ[0]], [xE - 0.04, y + 1.78, ovZ[ovZ.length - 1]], { color: IMP.steel });
  for (let k = 0; k < 12; k++) kit.box("impMetal", xE - 0.07, y + 1.6, ovZ[0] + 0.6 + k * 1.2, 0.03, 0.3, 0.05, { color: [IMP.steel, IMP.gunmetal][k % 2] });
  // prep islands with pot racks overhead
  for (const zc of [351.0, 361.0]) {
    counter(kit, [35.6, y, zc], 5.0, Math.PI / 2, { d: 1.1, h: 0.9, doors: false, tone: IMP.wallMid, tag: "prepIsland" });
    for (let k = 0; k < 6; k++) {
      const z = zc - 2.0 + k * 0.8;
      const r = 0.12 + (k % 3) * 0.05;
      if (k % 2) kit.add("impMetal", new THREE.CylinderGeometry(r, r * 0.9, 0.22, 12), { pos: [35.6 - 0.25, y + 1.03, z], color: IMP.steel, uv: "scale", uvScale: [1, 0.3] });
      else kit.box("impPaintedMetal", 35.6 + 0.25, y + 0.99, z, 0.34, 0.14, 0.28, { color: [IMP.white, IMP.gunmetal, IMP.consoleDark][k % 3], texel: 2 });
    }
    kit.box("darkGloss", 35.6, y + 0.935, zc + 0.3, 0.6, 0.02, 0.4);
    kit.boxMM("impMetal", [35.58, y + 2.15, zc - 2.2], [35.62, y + 2.19, zc + 2.2], { color: IMP.steel });
    for (const dz of [-2.1, 2.1]) kit.box("impMetal", 35.6, y + 2.19 + (h - 2.19) / 2, zc + dz, 0.03, h - 2.19, 0.03, { color: IMP.gunmetal });
    for (let k = 0; k < 7; k++) {
      const z = zc - 1.8 + k * 0.6;
      kit.box("impMetal", 35.6, y + 2.08, z, 0.02, 0.14, 0.02, { color: IMP.steel });
      if (k % 2) kit.add("impMetal", new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), { pos: [35.6, y + 1.98, z], rot: [0, 0, Math.PI / 2], color: IMP.steel, uv: "scale", uvScale: [1, 0.1] });
      else kit.box("impMetal", 35.6, y + 1.92, z, 0.03, 0.26, 0.22, { color: IMP.gunmetal, texel: 2 });
    }
  }
  // wash-up: sinks along the partition's galley face, soap + dryer, cleaning shelf above
  {
    const { frame: gf } = wallFrame(kit, [partX + 0.08, zS], [partX + 0.08, zN], y); // faces east into the galley; u = zS - z
    counter(kit, [partX + 0.08 + 0.024 + 0.4, y, 369.6], 5.4, -Math.PI / 2, { d: 0.78, h: 0.9, doors: true, tone: IMP.wallDark, tag: "sinks" });
    for (const z of [367.6, 369.6, 371.6]) washStation(gf, zS - z, { counterH: 0.9, counterD: 0.9, mirror: false });
    gf.box("impMetal", zS - 369.6, 1.8, 0.024 + 0.2, 5.0, 0.03, 0.36, { color: IMP.steel, texel: 1 });
    for (let k = 0; k < 9; k++) gf.cylV("impMetal", zS - 367.4 - k * 0.55, 1.8 + 0.015 + 0.12, 0.024 + 0.2, 0.06, 0.24, { color: [IMP.white, 0x6fa0ff, IMP.steel, 0xb8231c][k % 4], segments: 10 });
    gf.quad("impDecal", zS - 372.8, 1.5, 0.024 + 0.04, 0.4, 0.4, { uvRect: impDecalRect(13) });
    gf.box("impPaintedMetal", zS - 366.0, 1.3, 0.024 + 0.1, 0.3, 0.42, 0.22, { color: IMP.consoleDark, texel: 1 });
    gf.box("crewEmit", zS - 366.0, 1.15, 0.024 + 0.215, 0.14, 0.02, 0.01, { color: 0x3a86ff });
    // wall-hung tool board between the pass windows
    gf.box("impPaintedMetal", zS - 358.9, 1.7, 0.024 + 0.02, 1.2, 0.9, 0.03, { color: IMP.consoleDark, texel: 1 });
    for (let k = 0; k < 5; k++) gf.box("impMetal", zS - 358.4 - k * 0.22, 1.7, 0.024 + 0.045, 0.03, 0.5 + (k % 2) * 0.2, 0.02, { color: [IMP.steel, IMP.gunmetal][k % 2] });
    gf.box("impPaintedMetal", zS - 352.9, 1.7, 0.024 + 0.02, 1.2, 0.9, 0.03, { color: IMP.consoleDark, texel: 1 });
    gf.quad("impDecal", zS - 352.9, 1.7, 0.024 + 0.04, 0.7, 0.7, { uvRect: impDecalRect(11) });
  }
  // dry store: shelving on the north and south walls, crates in the south-east corner
  {
    const wn = walls.north;
    const { frame } = wallFrame(kit, wn.from, wn.to, y);
    shelfUnit(frame, wn.u(32.3), wn.u(35.2), 2.3, { d: 0.5, shelves: 4, seed: 61, items: "mixed", tone: IMP.wallDark });
    const ws = walls.south;
    const sf = wallFrame(kit, ws.from, ws.to, y).frame;
    shelfUnit(sf, ws.u(38.6), ws.u(33.2), 2.4, { d: 0.55, shelves: 4, seed: 62, items: "boxes", tone: IMP.wallDark, fill: 0.85 });
    sf.quad("impDecal", ws.u(39.2), 1.7, 0.062, 0.45, 0.45, { uvRect: impDecalRect(9) });
  }
  crate(kit, [xE - 0.75, y, 372.6], [1.2, 0.8, 1.0], { seed: 8, tone: IMP.wallMid });
  crate(kit, [xE - 0.75, y + 0.8, 372.6], [0.9, 0.6, 0.8], { seed: 9, tone: IMP.gunmetal, collide: false });
  crate(kit, [xE - 0.75, y, 370.9], [1.0, 0.6, 1.0], { seed: 10, tone: IMP.consoleDark });
  crate(kit, [xE - 2.1, y, 372.8], [0.9, 0.5, 0.9], { seed: 11, tone: IMP.wallDark, yaw: 0.2 });
  // walk-in cooler in the north-east corner
  const cx0 = 35.7;
  const cz1 = 341.8;
  const ch = 2.9;
  partition(kit, [cx0, zN], [cx0, cz1], y, ch, { t: 0.2, tone: IMP.wallMid, band: null, features: false, seed: 63, tag: "cooler", pitch: 2.0, cap: 0.16 });
  partition(kit, [cx0, cz1], [xE, cz1], y, ch, { t: 0.2, tone: IMP.wallMid, band: null, features: false, seed: 64, tag: "cooler", pitch: 2.1, cap: 0.16 });
  kit.boxMM("impPaintedMetal", [cx0 - 0.1, y + ch, zN], [xE, y + ch + 0.12, cz1 + 0.1], { color: IMP.trim, texel: 1 });
  kit.box("impPaintedMetal", 37.7, y + ch + 0.42, 339.0, 1.6, 0.6, 1.4, { color: IMP.gunmetal, texel: 1 });
  for (let k = 0; k < 6; k++) kit.box("impMetal", 37.7, y + ch + 0.2 + k * 0.08, 339.0 + 0.72, 1.3, 0.02, 0.03, { color: IMP.steel });
  kit.add("impMetal", new THREE.CylinderGeometry(0.16, 0.16, h - ch - 0.72, 12), { pos: [38.6, y + ch + 0.72 + (h - ch - 0.72) / 2, 339.0], color: IMP.gunmetal, uv: "scale", uvScale: [1, 1] });
  {
    const { frame: cf } = wallFrame(kit, [cx0, cz1], [xE, cz1], y); // cooler south face (u = x - cx0), looks into the galley
    const cn = 0.1 + 0.024;
    fauxDoor(cf, 37.3 - cx0, 1.0, 2.1, { n: cn, tone: IMP.wallMid, decal: 5, plate: true });
    cf.box("crewEmit", 37.3 - cx0, 0.03, cn + 0.02, 0.9, 0.02, 0.04, { color: 0x60a0ff });
    cf.box("impPaintedMetal", 38.6 - cx0, 1.6, cn + 0.03, 0.34, 0.26, 0.06, { color: IMP.consoleDark, texel: 1 });
    cf.box("crewEmit", 38.6 - cx0, 1.6, cn + 0.062, 0.22, 0.1, 0.006, { color: 0x60a0ff });
    cf.quad("impDecal", 36.3 - cx0, 1.6, cn + 0.002, 0.4, 0.4, { uvRect: impDecalRect(13) });
  }
  // galley services: pipes and a cable tray along the ceiling, floor drain line
  pipeRun(kit, [[33.0, y + h - 0.35, zN + 0.3], [33.0, y + h - 0.35, zS - 0.3]], 0.09, { color: IMP.gunmetal });
  pipeRun(kit, [[33.3, y + h - 0.35, zN + 0.3], [33.3, y + h - 0.35, zS - 0.3]], 0.06, { color: IMP.steel });
  kit.boxMM("impMetal", [33.2, y + 0.002, 344.0], [33.5, y + 0.008, 372.0], { color: IMP.black, texel: 1 });
  floorDecal(kit, 33.9, y, 340.2, 0.7, 6, 90);
  floorDecal(kit, 33.9, y, 374.2, 0.7, 6, 90);

  // ---- views --------------------------------------------------------------------------------------
  ctx.view("mess", xW + 1.4, y + STD.eye, aisleC, -90, -3);
  ctx.view("mess_hall", 13.2, y + STD.eye, 352.6, -138, -6);
  ctx.view("mess_serving", 27.2, y + STD.eye, 349.8, -52, -4);
  ctx.view("mess_galley", 33.4, y + STD.eye, 345.2, 165, -5);
  ctx.view("mess_south", 20, y + STD.eye, zS - 1.0, 0, -3);
}
