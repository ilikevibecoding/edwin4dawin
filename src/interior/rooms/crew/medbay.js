// Medical bay (Deck 7): reception by the spine door (desk with a console, waiting bench, status
// board), a ward of examination beds under swing-arm scanners with privacy screens and supply carts,
// the bacta tank at the east end — glass cylinder, blue fluid, rising bubbles, its own blue light —
// with a monitoring console, a medical droid in a charging alcove, a pharmacy counter with glass
// cabinets, and a glass-walled surgery in the south-east corner (table under a lamp ring, surgeon's
// console, wash basin). Clean white light bands, pale hygienic gloss deck, red cross stencils.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { wallScreen, screenArray, ceilingLight, pointLightDesc, spotLightDesc, bench, chair, glassWall, railing } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { ensureCrewMaterials, partition, counter, shelfUnit, wallCabinet, washStation, floorDecal, floorLine, medCross, namePlate, ceilingStrip, cameraPod, bed, sideTable, medConsole, yawQ, rng } from "./crewKit.js";

const WHITE = 0xe8f0ff;
const BACTA = 0x40a0ff;
const MED_PALETTE = [IMP.white, 0xb8231c, IMP.steel, 0x6fa0ff, IMP.wallMid];

export function buildMedbay(kit, ctx) {
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
    wall: { pitch: 3.5, tone: IMP.wallLight, toneAlt: IMP.wallLight, bandMat: "lightBand", styles: { plain: 0.7, vent: 0.14, hatch: 0.1, pipes: 0.06 } },
    floor: { mat: "crewGlossLight", tone: 0xb9bfc7, texel: 0.35, strip: false },
    ceiling: { lights: true, lightPitch: 4.5, bandMat: "lightBand", panelW: 1.9, tone: IMP.wallMid },
  });

  // ---- plan ------------------------------------------------------------------------------------
  // west strip: reception (door) + waiting; north wall: exam row; z 312–318: double exam row on a
  // spine partition; main aisle z 318–323 from the door to the bacta tank; z 323–328: three recovery
  // cubicles; south strip: supply store (SW), bio-scanner, pharmacy counter; east: bacta tank, droid
  // alcove (NE), glass-walled surgery (SE).
  const spineZ = 315.0;
  const rowB = [12.2, 15.0, 17.8, 20.6];
  const cubX0 = 11.4;
  const cubW = 3.0;
  const cubZ0 = 322.8;
  const cubZ1 = 328.2;

  // ---- reception ---------------------------------------------------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    medCross(frame, w.u(316.2), 2.95, 0.6);
    medCross(frame, w.u(323.8), 2.95, 0.6);
    wallScreen(frame, w.u(311.0), 2.1, 2.4, 1.2, 1);
    frame.quad("impDecal", w.u(308.4), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    frame.quad("impDecal", w.u(313.6), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(13) });
    // hand sanitiser + glove box by the door, bin
    frame.box("impPaintedMetal", w.u(317.0), 1.3, 0.09, 0.22, 0.34, 0.12, { color: IMP.white, texel: 1 });
    frame.box("crewEmit", w.u(317.0), 1.42, 0.152, 0.1, 0.02, 0.006, { color: 0x40ff70 });
    frame.box("impPaintedMetal", w.u(317.0), 1.75, 0.08, 0.26, 0.14, 0.1, { color: 0x6fa0ff, texel: 1 });
    // notice board and a placard on the south side of the door
    frame.box("impPaintedMetal", w.u(326.6), 1.7, 0.075, 1.4, 0.9, 0.03, { color: IMP.consoleDark, texel: 1 });
    for (let i = 0; i < 4; i++) frame.quad("impDecal", w.u(326.6) - 0.45 + (i % 2) * 0.62, 1.92 - Math.floor(i / 2) * 0.46, 0.092, 0.36, 0.36, { uvRect: impDecalRect([3, 9, 15, 6][i]) });
    frame.quad("impDecal", w.u(330.4), 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    frame.box("impPaintedMetal", w.u(332.4), 1.05, 0.16, 0.6, 0.5, 0.2, { color: IMP.trim, texel: 1 });
    frame.box("crewEmit", w.u(332.4), 1.2, 0.262, 0.4, 0.05, 0.01, { color: 0xff2a2a });
    frame.quad("impDecal", w.u(332.4), 0.95, 0.262, 0.26, 0.26, { uvRect: impDecalRect(13) });
  }
  bench(kit, [xW + 0.75, y, 312.4], 3.2, -Math.PI / 2, { color: IMP.fabricGrey });
  bench(kit, [xW + 0.75, y, 308.6], 3.2, -Math.PI / 2, { color: IMP.fabricGrey });
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.2, 0.18, 0.6, 12), { pos: [xW + 0.5, y + 0.3, 315.2], color: IMP.white, uv: "scale", uvScale: [1, 0.6] });
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.21, 0.21, 0.03, 12), { pos: [xW + 0.5, y + 0.615, 315.2], color: 0xb8231c, uv: "scale", uvScale: [1, 0.1] });
  kit.collider([xW + 0.28, y, 314.98], [xW + 0.72, y + 0.65, 315.42], "bin");
  // reception desk facing the door: counter with a raised screen, chair behind, a datapad on top
  {
    const dx = 7.0;
    const dz = 324.6;
    counter(kit, [dx, y, dz], 4.2, -Math.PI / 2, { d: 0.8, h: 1.02, doors: true, tone: IMP.wallMid, kickLight: "emitBlue", top: "impPaintedMetal", topTone: IMP.white, tag: "reception" });
    kit.box("impMetal", dx + 0.1, y + 1.2, dz - 0.6, 0.04, 0.36, 0.04, { color: IMP.gunmetal });
    kit.box("darkGloss", dx + 0.12, y + 1.5, dz - 0.6, 0.03, 0.44, 0.7);
    kit.box("screen1", dx + 0.103, y + 1.5, dz - 0.6, 0.004, 0.38, 0.62, { uv: "keep" });
    kit.box("blink", dx + 0.2, y + 1.035, dz - 0.6, 0.3, 0.008, 0.6, { uv: "keep" });
    kit.box("darkGloss", dx - 0.05, y + 1.035, dz + 0.9, 0.24, 0.01, 0.18);
    kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), { pos: [dx + 0.2, y + 1.07, dz + 0.5], color: IMP.steel, uv: "scale", uvScale: [0.3, 0.2] });
    chair(kit, [dx + 1.05, y, dz - 0.6], Math.PI / 2);
    floorDecal(kit, dx - 1.4, y, dz, 0.8, 15, 90);
    pointLightDesc(ctx, WHITE, 6, 10, [dx - 1.0, y + h - 0.5, 321.0], 1);
  }
  floorLine(kit, [xW + 0.4, 317.6], [xW + 5.0, 317.6], y, 0.1);
  floorLine(kit, [xW + 0.4, 322.4], [xW + 5.0, 322.4], y, 0.1);
  floorDecal(kit, xW + 1.6, y, 320.0, 1.1, 7, -90);

  // ---- exam ward: north wall row + a double row on a spine partition, screens, carts --------------------
  const bedsN = [10.6, 13.4, 16.2, 19.0, 21.8];
  const rand = rng(23);
  const screen = (x, za, zb) => partition(kit, [x, za], [x, zb], y, 1.7, { t: 0.06, tone: IMP.wallLight, band: null, features: false, kick: 0.1, cap: 0.05, tag: "screen", pitch: 3 });
  for (const [i, bx] of bedsN.entries()) medBed(kit, [bx, y, zN + 1.5], 0, { arm: [0, 0.9, -0.2, 0.7, 0][i], seed: 30 + i });
  for (const bx of [12.0, 14.8, 17.6, 20.4]) screen(bx, zN, zN + 2.7);
  for (const [bx, bz] of [[11.85, zN + 3.3], [17.45, zN + 3.3]]) supplyCart(kit, [bx, y, bz], (rand() - 0.5) * 0.6);
  for (const [i, bx] of bedsN.entries()) floorDecal(kit, bx, y, zN + 3.2, 0.45, [0, 3, 6, 9, 15][i], 0);
  // spine: a 2.4 m partition with bed-head service panels on both faces (outlets, reading light, vitals)
  partition(kit, [rowB[0] - 1.2, spineZ], [rowB[3] + 1.0, spineZ], y, 2.4, { t: 0.16, tone: IMP.wallLight, band: null, features: false, seed: 44, tag: "spine", pitch: 2.65 });
  {
    const north = wallFrame(kit, [rowB[3] + 1.0, spineZ], [rowB[0] - 1.2, spineZ], y).frame;
    const south = wallFrame(kit, [rowB[0] - 1.2, spineZ], [rowB[3] + 1.0, spineZ], y).frame;
    for (const [i, bx] of rowB.entries()) {
      medBed(kit, [bx, y, spineZ - 1.4], Math.PI, { arm: [0.6, 0, -0.35, 0.9][i], seed: 50 + i });
      medBed(kit, [bx, y, spineZ + 1.4], 0, { arm: [0, 0.8, 0.3, -0.25][i], seed: 60 + i });
      bedHeadPanel(north, rowB[3] + 1.0 - bx, 1.5, 0.104, [3, 6, 9, 15][i]);
      bedHeadPanel(south, bx - (rowB[0] - 1.2), 1.5, 0.104, [0, 5, 11, 2][i]);
      floorDecal(kit, bx, y, spineZ - 3.1, 0.45, [2, 5, 11, 0][i], 180);
      floorDecal(kit, bx, y, spineZ + 3.1, 0.45, [6, 9, 15, 3][i], 0);
    }
    for (const bx of [13.6, 16.4, 19.2]) {
      screen(bx, spineZ - 2.7, spineZ - 0.08);
      screen(bx, spineZ + 0.08, spineZ + 2.7);
    }
    // spine ends: black pilasters carrying a red cross and a section plate, facing the aisles
    for (const [x, sgn] of [[rowB[0] - 1.2, -1], [rowB[3] + 1.0, 1]]) {
      kit.box("impPaintedMetal", x + sgn * 0.15, y + 1.25, spineZ, 0.3, 2.5, 0.5, { color: IMP.trim, texel: 1 });
      kit.box("crewEmit", x + sgn * 0.15, y + 2.44, spineZ, 0.2, 0.02, 0.4, { color: 0x60c0ff });
      kit.collider([x + Math.min(0, sgn * 0.3), y, spineZ - 0.25], [x + Math.max(0, sgn * 0.3), y + 2.5, spineZ + 0.25], "pilaster");
      const fx = x + sgn * 0.3;
      const ef = wallFrame(kit, [fx, spineZ + sgn * 0.25], [fx, spineZ - sgn * 0.25], y).frame;
      medCross(ef, 0.25, 1.9, 0.36, 0.006);
      ef.quad("impDecal", 0.25, 1.35, 0.004, 0.24, 0.24, { uvRect: impDecalRect(sgn < 0 ? 5 : 11) });
      ef.box("crewEmit", 0.25, 1.1, 0.004, 0.2, 0.02, 0.006, { color: 0x60c0ff });
    }
  }
  supplyCart(kit, [9.4, y, 322.0], 0.2);
  supplyCart(kit, [21.9, y, 323.6], -0.3);
  // aisle edges: white painted lines along the main aisle
  floorLine(kit, [10.0, spineZ + 2.75], [22.4, spineZ + 2.75], y, 0.08, "crewPaintWhite");
  floorLine(kit, [10.0, cubZ0 - 0.4], [22.4, cubZ0 - 0.4], y, 0.08, "crewPaintWhite");

  // ---- recovery cubicles: three bays open to the main aisle, platform beds, vitals posts, visitor chairs
  {
    const cubX1 = cubX0 + 3 * cubW;
    partition(kit, [cubX0, cubZ1], [cubX1, cubZ1], y, 2.2, { t: 0.12, tone: IMP.wallLight, band: null, features: false, seed: 45, tag: "cubicleBack", pitch: 3 });
    for (let i = 0; i <= 3; i++) partition(kit, [cubX0 + i * cubW, cubZ0], [cubX0 + i * cubW, cubZ1 - 0.06], y, 2.0, { t: 0.08, tone: IMP.wallLight, band: null, features: false, kick: 0.1, cap: 0.06, tag: "cubicle", pitch: 3 });
    const back = wallFrame(kit, [cubX1, cubZ1], [cubX0, cubZ1], y).frame; // n toward -z (into the cubicles)
    for (let i = 0; i < 3; i++) {
      const cx = cubX0 + cubW * (i + 0.5);
      const bx = cx - 0.55;
      bed(kit, [bx, y, cubZ1 - 0.16 - 1.05], Math.PI, { color: 0xc4c9d1, blanket: [0x4a5d7a, 0x5b6f8e, 0x3e4f6a][i], tone: IMP.wallMid, lamp: "crewEmit" });
      vitalsPost(kit, [cx + 0.8, y, cubZ1 - 0.75], -Math.PI / 2 - 0.5);
      sideTable(kit, [cx + 0.85, y, cubZ1 - 1.9], 0.3, 0.55, { tone: IMP.wallMid });
      chair(kit, [cx + 0.8, y, cubZ1 - 3.0], Math.PI / 2 + (i - 1) * 0.25);
      const u = cubX1 - bx;
      wallCabinet(back, u - 0.45, u + 0.45, 1.8, 2.12, { glass: false, seed: 80 + i, shelves: 1 });
      wallScreen(back, cubX1 - (cx + 0.8), 1.95, 0.7, 0.42, [1, 2, 1][i], { leds: false });
      back.quad("impDecal", cubX1 - (cx + 0.8), 1.15, 0.084, 0.3, 0.3, { uvRect: impDecalRect([3, 9, 15][i]) });
      // bay number on the divider's aisle end + on the deck at the opening
      const df = wallFrame(kit, [cubX0 + i * cubW + 0.06, cubZ0], [cubX0 + i * cubW - 0.06, cubZ0], y).frame;
      df.quad("impDecal", 0.06, 1.35, 0.004, 0.12, 0.12, { uvRect: impDecalRect([0, 3, 6][i]) });
      df.box("crewEmit", 0.06, 1.5, 0.004, 0.06, 0.02, 0.006, { color: 0x60ff80 });
      floorDecal(kit, cx, y, cubZ0 - 0.9, 0.5, [0, 3, 6][i], 180);
    }
    // wash basin + sanitiser on the bank's east end (aisle side, backing onto the last divider)
    const fx = cubX1 + 0.064;
    counter(kit, [fx + 0.275, y, cubZ1 - 0.75], 1.3, -Math.PI / 2, { d: 0.55, h: 0.88, doors: true, tone: IMP.wallMid, top: "impMetal", tag: "basin" });
    const ef = wallFrame(kit, [fx, cubZ1 - 0.1], [fx, cubZ0 + 0.1], y).frame;
    washStation(ef, 0.75, { counterH: 0.88, counterD: 0.55, mirror: false });
    ef.box("impPaintedMetal", 1.8, 1.3, 0.06, 0.22, 0.34, 0.12, { color: IMP.white, texel: 1 });
    ef.box("crewEmit", 1.8, 1.42, 0.123, 0.1, 0.02, 0.006, { color: 0x40ff70 });
    ef.quad("impDecal", 2.6, 1.6, 0.004, 0.4, 0.4, { uvRect: impDecalRect(13) });
    medCross(ef, 3.8, 1.6, 0.4, 0.006);
  }

  // ---- ceiling: white light bars over the aisles ---------------------------------------------------------
  for (const z of [311.0, 324.6]) for (const x of [11.9, 17.5]) ceilingLight(kit, ctx, [x, y + h, z], 4.6, "x", { mat: "lightBand", color: WHITE, intensity: 8, distance: 13, priority: 1, drop: 0.5 });
  ceilingLight(kit, ctx, [16.4, y + h, 320.2], 5.0, "x", { mat: "lightBand", color: WHITE, intensity: 9, distance: 14, priority: 2, drop: 0.5 });
  ceilingLight(kit, ctx, [11.0, y + h, 330.4], 4.6, "x", { mat: "lightBand", color: WHITE, intensity: 7, distance: 11, priority: 1, drop: 0.5 });
  pointLightDesc(ctx, WHITE, 7, 12, [25.0, y + h - 0.5, 312.5], 0);

  // ---- north wall: pharmacy shelving east of the beds, screens -----------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    shelfUnit(frame, w.u(23.6), w.u(27.4), 2.2, { d: 0.45, shelves: 4, seed: 51, items: "mixed", palette: MED_PALETTE, tone: IMP.wallMid, fill: 0.8 });
    wallCabinet(frame, w.u(28.0), w.u(29.4), 1.2, 2.0, { glass: true, seed: 52, shelves: 2 });
    frame.quad("impDecal", w.u(25.5), 2.65, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    medCross(frame, w.u(23.0), 2.75, 0.5);
    wallScreen(frame, w.u(6.4), 2.2, 2.0, 1.1, 2);
    frame.quad("impDecal", w.u(4.2), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(6) });
    frame.quad("impDecal", w.u(8.6), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(3) });
    cameraPod(kit, [xW + 0.3, y + h - 0.35, zN + 0.3], 135, -30, { led: "crewEmit" });
  }
  // pharmacy counter on the south wall between the beds and the surgery, glass cabinets above
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    counter(kit, [18.4, y, zS - 0.4], 3.0, 0, { d: 0.8, h: 0.95, doors: true, tone: IMP.wallMid, top: "impPaintedMetal", topTone: IMP.white, tag: "pharmacy" });
    wallCabinet(frame, w.u(19.9), w.u(16.9), 1.25, 2.15, { glass: true, seed: 53, shelves: 2 });
    for (let k = 0; k < 4; k++) kit.box("impPaintedMetal", 17.3 + k * 0.6, y + 1.03, zS - 0.45, 0.28, 0.16, 0.36, { color: MED_PALETTE[k % 5], texel: 2 });
    kit.add("impMetal", new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), { pos: [19.6, y + 1.07, zS - 0.5], color: IMP.steel, uv: "scale", uvScale: [0.4, 0.3] });
    medCross(frame, w.u(18.4), 2.75, 0.5);
    // supply store in the south-west corner: shelving on both walls, a cart
    shelfUnit(frame, w.u(8.6), w.u(3.4), 2.3, { d: 0.5, shelves: 5, seed: 54, items: "mixed", palette: MED_PALETTE, tone: IMP.wallMid, fill: 0.85 });
    frame.quad("impDecal", w.u(6.0), 2.85, 0.062, 0.5, 0.5, { uvRect: impDecalRect(9) });
    frame.quad("impDecal", w.u(9.6), 2.2, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
    const ww = walls.west;
    const wf = wallFrame(kit, ww.from, ww.to, y).frame;
    shelfUnit(wf, ww.u(331.4), ww.u(327.8), 2.3, { d: 0.5, shelves: 5, seed: 55, items: "boxes", palette: MED_PALETTE, tone: IMP.wallMid, fill: 0.8 });
    supplyCart(kit, [4.6, y, 330.6], 0.9);
    // bio-scanner: ring scanner with its slab, operator console east of it, scan display wall above
    bioScanner(kit, [12.0, y, 330.9], 0);
    medConsole(kit, ctx, [15.6, y, 331.3], Math.PI / 2);
    screenArray(frame, w.u(12.6), 2.45, 3, 1, 0.9, 0.7, { seed: 9, variants: [1, 2], leds: true });
    floorLine(kit, [9.6, 329.6], [14.6, 329.6], y, 0.1);
    floorLine(kit, [9.6, 329.6], [9.6, zS - 0.6], y, 0.1);
    floorLine(kit, [14.6, 329.6], [14.6, zS - 0.6], y, 0.1);
    floorDecal(kit, 12.0, y, 329.0, 0.6, 15, 180);
    // biohazard bin + gurney parked by the wall
    kit.box("impPaintedMetal", 20.9, y + 0.4, zS - 0.5, 0.5, 0.8, 0.5, { color: 0xb8231c, texel: 1 });
    kit.box("impPaintedMetal", 20.9, y + 0.82, zS - 0.5, 0.52, 0.04, 0.52, { color: IMP.trim, texel: 1 });
    frame.quad("impDecal", w.u(20.9), 0.5, 0.062 + 0.75, 0.3, 0.3, { uvRect: impDecalRect(13) });
    kit.collider([20.65, y, zS - 0.75], [21.15, y + 0.85, zS - 0.25], "bin");
  }

  // ---- bacta tank ---------------------------------------------------------------------------------
  const tX = 25.6;
  const tZ = 319.0;
  bactaTank(kit, ctx, [tX, y, tZ]);
  // monitoring console beside the tank, handrails, deck markings, big cross behind it
  medConsole(kit, ctx, [tX - 2.8, y, tZ + 1.9], -0.98);
  railing(kit, [tX - 1.9, tZ - 2.4], [tX + 1.9, tZ - 2.4], y, { h: 1.0, lit: true, tag: "tankRail" });
  floorLine(kit, [tX - 2.2, tZ - 2.6], [tX - 2.2, tZ + 2.6], y, 0.12);
  floorLine(kit, [tX + 2.2, tZ - 2.6], [tX + 2.2, tZ + 2.6], y, 0.12);
  floorLine(kit, [tX - 2.2, tZ + 2.6], [tX + 2.2, tZ + 2.6], y, 0.12);
  floorDecal(kit, tX - 3.6, y, tZ - 1.0, 0.7, 15, -90);
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    medCross(frame, w.u(tZ + 3.4), 2.3, 1.4);
    frame.quad("impDecal", w.u(tZ + 3.4), 1.3, 0.062, 0.6, 0.6, { uvRect: impDecalRect(15) });
    wallScreen(frame, w.u(tZ - 3.6), 2.0, 1.6, 0.9, 2);
    frame.box("impPaintedMetal", w.u(tZ), 3.1, 0.12, 2.0, 0.5, 0.2, { color: IMP.consoleDark, texel: 1 });
    frame.box("blinkSparse", w.u(tZ), 3.1, 0.225, 1.7, 0.3, 0.006, { uv: "keep" });
    cameraPod(kit, [xE - 0.3, y + h - 0.35, zN + 0.3], -135, -30, { led: "crewEmit" });
  }

  // ---- medical droid alcove on the east wall (north of the tank) ---------------------------------------------
  {
    const az0 = 309.2;
    const az1 = 312.4;
    const ax = xE - 1.5;
    partition(kit, [ax, az0], [xE, az0], y, 2.7, { t: 0.12, tone: IMP.wallLight, band: null, features: false, seed: 61, tag: "alcove", kick: 0.1, cap: 0.08 });
    partition(kit, [ax, az1], [xE, az1], y, 2.7, { t: 0.12, tone: IMP.wallLight, band: null, features: false, seed: 62, tag: "alcove", kick: 0.1, cap: 0.08 });
    kit.boxMM("impPaintedMetal", [ax - 0.06, y + 2.7, az0 - 0.06], [xE, y + 2.82, az1 + 0.06], { color: IMP.trim, texel: 1 });
    kit.boxMM("crewEmit", [ax + 0.05, y + 2.66, az0 + 0.3], [ax + 0.08, y + 2.69, az1 - 0.3], { color: 0x60a0ff });
    kit.boxMM("impGloss", [ax + 0.1, y + 0.001, az0 + 0.1], [xE, y + 0.008, az1 - 0.1], { color: IMP.wallDark, texel: 0.3 });
    medDroid(kit, [xE - 0.75, y, (az0 + az1) / 2], -Math.PI / 2);
    // charging post + cable, status plate
    kit.box("impPaintedMetal", xE - 0.2, y + 0.6, az1 - 0.5, 0.3, 1.2, 0.3, { color: IMP.consoleDark, texel: 1 });
    kit.box("blinkSparse", xE - 0.36, y + 0.9, az1 - 0.5, 0.006, 0.3, 0.2, { uv: "keep" });
    kit.add("impMetal", new THREE.TorusGeometry(0.28, 0.025, 6, 20, Math.PI), { pos: [xE - 0.62, y + 0.45, az1 - 0.5], rot: [0, Math.PI / 2, 0], color: IMP.gunmetal, uv: "scale", uvScale: [1, 1] });
    namePlate(wallFrame(kit, [ax, az1], [ax, az0], y).frame, 0, 2.3, { n: 0.5, decal: 5, led: "crewEmit", ledColor: 0x60a0ff });
    pointLightDesc(ctx, 0x60a0ff, 2.5, 5, [ax + 0.3, y + 2.2, (az0 + az1) / 2], 0);
    floorDecal(kit, ax - 0.9, y, (az0 + az1) / 2, 0.6, 5, 90);
  }

  // ---- surgery (south-east), glass-walled ----------------------------------------------------------------
  const sx0 = 21.4;
  const sz0 = 326.2;
  glassWall(kit, [sx0, sz0], [sx0, zS], y, h - 0.05, { mat: "glass", mullions: 2, tag: "surgeryGlass" });
  glassWall(kit, [sx0, sz0], [24.2, sz0], y, h - 0.05, { mat: "glass", mullions: 1, tag: "surgeryGlass" });
  glassWall(kit, [26.0, sz0], [xE, sz0], y, h - 0.05, { mat: "glass", mullions: 1, tag: "surgeryGlass" });
  // door header + status lamp over the opening (x 24.2 .. 26.0)
  kit.boxMM("impPaintedMetal", [24.1, y + 2.5, sz0 - 0.09], [26.1, y + h - 0.05, sz0 + 0.09], { color: IMP.trim, texel: 1 });
  kit.box("crewEmit", 25.1, y + 2.56, sz0 - 0.1, 0.5, 0.04, 0.01, { color: 0xff2a2a });
  kit.box("crewEmit", 25.1, y + 2.56, sz0 + 0.1, 0.5, 0.04, 0.01, { color: 0xff2a2a });
  floorLine(kit, [24.2, sz0], [26.0, sz0], y, 0.14);
  kit.boxMM("crewGlossLight", [sx0 + 0.1, y + 0.001, sz0 + 0.1], [xE - 0.1, y + 0.008, zS - 0.1], { color: 0xd6dae0, texel: 0.3 });
  {
    const cx = 25.9;
    const cz = 330.4;
    // surgical table: darker slab on a heavy pedestal, tool tray arm, lamp ring overhead on a ceiling arm
    medBed(kit, [cx, y, cz], Math.PI / 2, { arm: null, slab: IMP.wallMid, pad: 0x9aa0a8, monitor: false, seed: 70 });
    kit.box("impMetal", cx + 1.3, y + 0.5, cz - 0.8, 0.05, 1.0, 0.05, { color: IMP.gunmetal });
    kit.box("impMetal", cx + 1.0, y + 1.0, cz - 0.8, 0.6, 0.03, 0.03, { color: IMP.steel });
    kit.box("impMetal", cx + 0.75, y + 1.03, cz - 0.8, 0.5, 0.04, 0.36, { color: IMP.steel, texel: 2 });
    for (let k = 0; k < 6; k++) kit.box("impMetal", cx + 0.55 + k * 0.07, y + 1.06, cz - 0.8 + (k % 2) * 0.06, 0.02, 0.012, 0.18 + (k % 3) * 0.04, { color: [IMP.steel, IMP.gunmetal][k % 2] });
    kit.collider([cx + 1.2, y, cz - 0.9], [cx + 1.4, y + 1.1, cz - 0.7], "trayArm");
    kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), { pos: [cx, y + h - 0.4, cz], color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 0.8] });
    kit.add("impPaintedMetal", new THREE.TorusGeometry(0.55, 0.09, 8, 28), { pos: [cx, y + h - 0.85, cz], rot: [Math.PI / 2, 0, 0], color: IMP.white, uv: "scale", uvScale: [4, 1] });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      kit.add("crewEmit", new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), { pos: [cx + 0.55 * Math.cos(a), y + h - 0.95, cz + 0.55 * Math.sin(a)], color: 0xffffff, uv: "scale", uvScale: [1, 0.1] });
    }
    kit.add("darkGloss", new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), { pos: [cx, y + h - 0.86, cz] });
    spotLightDesc(ctx, 0xffffff, 7, 7, [cx, y + h - 0.9, cz], [cx, y + 0.8, cz], { angle: 0.55, penumbra: 0.5, shadow: true, priority: 2 });
    // surgeon's console against the south wall, screen wall above, wash basin on the east wall, cabinets
    medConsole(kit, ctx, [23.2, y, zS - 1.15], Math.PI, { wide: true });
    const ws = walls.south;
    const sf = wallFrame(kit, ws.from, ws.to, y).frame;
    wallScreen(sf, ws.u(23.2), 2.35, 2.2, 1.0, 2);
    wallScreen(sf, ws.u(27.6), 2.3, 1.6, 0.9, 1);
    sf.quad("impDecal", ws.u(25.4), 2.4, 0.062, 0.5, 0.5, { uvRect: impDecalRect(15) });
    medCross(sf, ws.u(28.9), 2.4, 0.5);
    const we = walls.east;
    const ef = wallFrame(kit, we.from, we.to, y).frame;
    counter(kit, [xE - 0.35, y, 328.4], 2.2, -Math.PI / 2, { d: 0.62, h: 0.9, doors: true, tone: IMP.wallMid, top: "impMetal", tag: "scrubSink" });
    for (const z of [327.8, 329.0]) washStation(ef, we.u(z), { counterH: 0.9, counterD: 0.7, mirror: false });
    ef.box("impPaintedMetal", we.u(330.2), 1.3, 0.1, 0.16, 0.34, 0.14, { color: IMP.white, texel: 1 });
    ef.box("crewEmit", we.u(330.2), 1.42, 0.172, 0.08, 0.02, 0.006, { color: 0x3a86ff });
    wallCabinet(ef, we.u(331.0), we.u(333.2), 1.2, 2.1, { glass: true, seed: 72, shelves: 2 });
    ef.quad("impDecal", we.u(332.1), 2.6, 0.062, 0.45, 0.45, { uvRect: impDecalRect(11) });
    ceilingLight(kit, ctx, [23.4, y + h, 329.0], 3.6, "z", { mat: "lightBand", color: WHITE, intensity: 4.5, distance: 10, priority: 1, drop: 0.5 });
    ceilingStrip(kit, [28.6, y + h, 330.0], 4.0, "z", { mat: "lightBand", w: 0.2 });
    floorDecal(kit, 25.1, y, sz0 + 1.2, 0.7, 13, 0);
  }

  // ---- views --------------------------------------------------------------------------------------
  ctx.view("medbay", xW + 1.2, y + STD.eye, 320.6, -84, -3);
  ctx.view("medbay_ward", 9.4, y + STD.eye, 310.9, -62, -5);
  ctx.view("medbay_recovery", 16.2, y + STD.eye, 321.0, 150, -6);
  ctx.view("medbay_bacta", 21.6, y + STD.eye, 316.0, -122, -3);
  ctx.view("medbay_scanner", 16.2, y + STD.eye, 328.9, 118, -6);
  ctx.view("medbay_surgery", 22.6, y + STD.eye, 327.4, -140, -6);
}

// Bed-head services panel on a partition face: outlets, a reading-light bar, vitals readout, decal.
function bedHeadPanel(frame, u, v, n, decal = 3) {
  frame.box("impPaintedMetal", u, v, n + 0.02, 1.0, 0.5, 0.04, { color: IMP.consoleDark, texel: 1 });
  frame.box("blinkSparse", u - 0.24, v + 0.08, n + 0.043, 0.36, 0.14, 0.006, { uv: "keep" });
  frame.box("leds", u + 0.26, v + 0.08, n + 0.043, 0.3, 0.05, 0.006, { uv: "keep" });
  frame.box("crewEmit", u, v + 0.21, n + 0.043, 0.84, 0.025, 0.006, { color: 0xffffff });
  for (let k = 0; k < 3; k++) frame.box("impMetal", u - 0.3 + k * 0.18, v - 0.14, n + 0.05, 0.1, 0.1, 0.02, { color: IMP.gunmetal });
  frame.quad("impDecal", u + 0.36, v - 0.13, n + 0.041, 0.16, 0.16, { uvRect: impDecalRect(decal) });
}

// Bedside vitals monitor on a rolling post. pos = floor centre, yaw 0 => the screen faces +Z.
function vitalsPost(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  kit.add("impMetal", new THREE.CylinderGeometry(0.24, 0.26, 0.04, 12), { pos: L(0, 0.02, 0).toArray(), color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.1] });
  kit.add("impMetal", new THREE.CylinderGeometry(0.03, 0.035, 1.3, 8), { pos: L(0, 0.69, 0).toArray(), color: IMP.steel, uv: "scale", uvScale: [0.2, 1] });
  box("impPaintedMetal", 0, 1.5, 0, 0.52, 0.38, 0.08, { color: IMP.consoleDark, texel: 1 });
  box("darkGloss", 0, 1.52, 0.045, 0.46, 0.3, 0.01);
  box("screen1", 0, 1.52, 0.052, 0.42, 0.26, 0.004, { uv: "keep" });
  box("leds", 0, 1.34, 0.045, 0.3, 0.03, 0.01, { uv: "keep" });
  box("impPaintedMetal", 0, 0.95, 0.03, 0.2, 0.14, 0.1, { color: IMP.wallMid, texel: 1 });
  box("crewEmit", 0, 0.95, 0.082, 0.1, 0.02, 0.006, { color: 0x60ff80 });
  kit.collider([pos[0] - 0.26, pos[1], pos[2] - 0.26], [pos[0] + 0.26, pos[1] + 1.7, pos[2] + 0.26], "vitals");
}

/**
 * Diagnostic bio-scanner: a patient slab that slides into a standing ring on a heavy base (white
 * housing, lit blue inner ring, scan head on top), a head-end processor block with a readout, blue
 * plinth strips. pos = floor centre of the slab, yaw 0 => the ring is toward +X.
 */
function bioScanner(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  const aabb = (x0, z0, x1, z1, hh, tag) => {
    const a = L(x0, 0, z0);
    const b = L(x1, 0, z1);
    const c = L(x0, 0, z1);
    const d = L(x1, 0, z0);
    kit.collider([Math.min(a.x, b.x, c.x, d.x), pos[1], Math.min(a.z, b.z, c.z, d.z)], [Math.max(a.x, b.x, c.x, d.x), pos[1] + hh, Math.max(a.z, b.z, c.z, d.z)], tag);
  };
  // plinth with blue edge strips
  box("impPaintedMetal", -0.05, 0.05, 0, 4.3, 0.1, 1.9, { color: IMP.trim, texel: 1 });
  for (const s of [-1, 1]) box("crewEmit", -0.05, 0.09, s * 0.93, 4.1, 0.02, 0.012, { color: 0x60c0ff });
  // ring base block + panels
  box("impPaintedMetal", 1.1, 0.42, 0, 0.9, 0.74, 1.9, { color: IMP.wallMid, texel: 1 });
  for (const s of [-1, 1]) {
    box("impPanel", 1.1, 0.42, s * 0.956, 0.7, 0.5, 0.012, { color: IMP.wallDark, uv: "keep" });
    box("blinkSparse", 1.1, 0.6, s * 0.965, 0.4, 0.08, 0.006, { uv: "keep" });
  }
  // ring: white housing, dark inner lining, lit blue inner ring, scan head on top
  const rq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
  const rc = L(1.1, 1.3, 0);
  kit.add("impPaintedMetal", new THREE.TorusGeometry(1.0, 0.24, 12, 40), { pos: rc.toArray(), quat: rq, color: IMP.white, uv: "scale", uvScale: [10, 1] });
  kit.add("impPaintedMetal", new THREE.TorusGeometry(0.76, 0.06, 8, 40), { pos: rc.toArray(), quat: rq, color: IMP.consoleDark, uv: "scale", uvScale: [8, 0.5] });
  for (const s of [-1, 1]) kit.add("crewEmit", new THREE.TorusGeometry(0.7, 0.02, 6, 40), { pos: L(1.1 + s * 0.04, 1.3, 0).toArray(), quat: rq, color: 0x60c0ff });
  box("impPaintedMetal", 1.1, 2.6, 0, 0.6, 0.24, 0.5, { color: IMP.consoleDark, texel: 1 });
  box("leds", 1.1, 2.6, 0.256, 0.4, 0.05, 0.006, { uv: "keep" });
  // slab through the ring on a pedestal, pad, head cushion
  box("impPaintedMetal", -0.7, 0.45, 0, 0.6, 0.8, 0.5, { color: IMP.trim, texel: 1 });
  box("impPanel", -0.7, 0.45, 0.256, 0.5, 0.5, 0.012, { color: IMP.wallDark, uv: "keep" });
  box("impPaintedMetal", 0.1, 0.9, 0, 3.0, 0.08, 0.7, { color: IMP.wallMid, texel: 1 });
  box("impMetal", 0.1, 0.865, 0, 3.04, 0.02, 0.74, { color: IMP.steel, texel: 1 });
  box("impFabric", -0.1, 0.97, 0, 2.5, 0.06, 0.6, { color: 0xb0b6c0, uv: "world", texel: 2 });
  box("impFabric", -1.15, 1.02, 0, 0.36, 0.06, 0.4, { color: IMP.white, uv: "world", texel: 2 });
  box("crewEmit", 0.1, 0.87, 0.36, 2.8, 0.012, 0.006, { color: 0x60c0ff });
  // head-end processor block with a flat readout
  box("impPaintedMetal", -1.95, 0.6, 0, 0.5, 1.2, 0.9, { color: IMP.consoleDark, texel: 1 });
  box("impMetal", -1.95, 1.22, 0, 0.54, 0.04, 0.94, { color: IMP.steel, texel: 1 });
  box("darkGloss", -1.95, 1.25, 0, 0.4, 0.02, 0.6);
  box("screen2", -1.95, 1.262, 0, 0.36, 0.004, 0.54, { uv: "keep" });
  box("blink", -1.95, 0.9, 0.456, 0.36, 0.1, 0.006, { uv: "keep" });
  box("impMetal", -1.95, 0.4, 0.456, 0.3, 0.3, 0.02, { color: IMP.gunmetal, texel: 1 });
  aabb(-2.2, -0.45, -1.7, 0.45, 1.3, "scannerBlock");
  aabb(-1.4, -0.4, 0.65, 0.4, 1.0, "scannerSlab");
  aabb(0.65, -0.95, 1.55, 0.95, 2.7, "scannerRing");
}

/**
 * Examination bed. pos = floor centre, yaw 0 => head toward -Z. Padded slab on a pedestal with a
 * drawer front, head monitor on a post, a swing-arm scanner (arm = its swing angle in radians from
 * over-the-bed; null for none), IV stand.
 */
function medBed(kit, pos, yaw = 0, opts = {}) {
  const { arm = 0, slab = IMP.white, pad = 0xb0b6c0, monitor = true, seed = 1, collide = true } = opts;
  const rand = rng(seed);
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  const w = 0.9;
  const l = 2.1;
  box("impPaintedMetal", 0, 0.05, 0, 0.7, 0.1, 1.4, { color: IMP.trim, texel: 1 });
  box("impPaintedMetal", 0, 0.38, 0, 0.62, 0.56, 1.5, { color: IMP.wallMid, texel: 1 });
  box("impPanel", 0.318, 0.36, 0.2, 0.012, 0.4, 0.9, { color: IMP.wallDark, uv: "keep" });
  box("impMetal", 0.332, 0.36, 0.2, 0.012, 0.03, 0.14, { color: IMP.steel });
  box("crewEmit", 0.32, 0.12, 0, 0.006, 0.02, 1.2, { color: 0x60c0ff });
  box("impPaintedMetal", 0, 0.7, 0, w, 0.08, l, { color: slab, texel: 1 });
  box("impMetal", 0, 0.665, 0, w + 0.04, 0.02, l + 0.04, { color: IMP.steel, texel: 1 });
  box("impFabric", 0, 0.78, 0.05, w - 0.1, 0.08, l - 0.2, { color: pad, uv: "world", texel: 2 });
  box("impFabric", 0, 0.83, -l / 2 + 0.3, w - 0.3, 0.06, 0.36, { color: IMP.white, uv: "world", texel: 2 });
  // raised back-rest section at the head end
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.35));
  const bp = L(0, 0.9, -l / 2 + 0.05);
  kit.add("impPaintedMetal", new THREE.BoxGeometry(w - 0.02, 0.06, 0.6), { pos: [bp.x, bp.y, bp.z], quat: bq, color: slab, texel: 1 });
  // side rail on the open side
  box("impMetal", -w / 2 - 0.03, 0.95, 0.2, 0.03, 0.03, 1.1, { color: IMP.steel });
  for (const dz of [-0.3, 0.7]) box("impMetal", -w / 2 - 0.03, 0.85, dz, 0.03, 0.2, 0.03, { color: IMP.steel });
  if (monitor) {
    box("impMetal", w / 2 + 0.2, 0.7, -l / 2 - 0.1, 0.05, 1.4, 0.05, { color: IMP.gunmetal });
    box("impPaintedMetal", w / 2 + 0.2, 1.55, -l / 2 - 0.1, 0.5, 0.36, 0.06, { color: IMP.consoleDark, texel: 1 });
    box("darkGloss", w / 2 + 0.2, 1.55, -l / 2 - 0.065, 0.44, 0.3, 0.01);
    box("screen1", w / 2 + 0.2, 1.55, -l / 2 - 0.058, 0.4, 0.26, 0.004, { uv: "keep" });
    box("leds", w / 2 + 0.2, 1.33, -l / 2 - 0.065, 0.3, 0.03, 0.01, { uv: "keep" });
  }
  if (arm !== null) {
    // scanner arm: column at the head-side corner, a horizontal boom swung by `arm` over the bed, scan head with a blue emitter
    const cx = -w / 2 - 0.3;
    const cz = -l / 2 - 0.1;
    box("impPaintedMetal", cx, 0.06, cz, 0.44, 0.12, 0.44, { color: IMP.trim, texel: 1 });
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(0.09, 0.11, 2.05, 12), { pos: L(cx, 1.1, cz).toArray(), quat: q, color: IMP.wallMid, uv: "scale", uvScale: [1, 2] });
    kit.add("impMetal", new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), { pos: L(cx, 2.15, cz).toArray(), quat: q, color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.2] });
    // boom direction in bed-local xz: swing 0 points from the column over the bed centre (+x, +z)
    const base = Math.atan2(0.6 + l / 2 - 0.4, -cx);
    const ang = base + arm;
    const len = 1.55;
    const bx = cx + Math.cos(ang) * (len / 2);
    const bz = cz + Math.sin(ang) * (len / 2);
    const bq2 = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang));
    const bp2 = L(bx, 2.12, bz);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(len, 0.1, 0.16), { pos: [bp2.x, bp2.y, bp2.z], quat: bq2, color: IMP.wallMid, texel: 1 });
    const hx = cx + Math.cos(ang) * len;
    const hz = cz + Math.sin(ang) * len;
    const hp = L(hx, 1.92, hz);
    kit.add("impPaintedMetal", new THREE.BoxGeometry(0.5, 0.22, 0.32), { pos: [hp.x, hp.y, hp.z], quat: bq2, color: IMP.consoleDark, texel: 1 });
    const gp = L(hx, 1.8, hz);
    kit.add("crewEmit", new THREE.BoxGeometry(0.4, 0.012, 0.06), { pos: [gp.x, gp.y, gp.z], quat: bq2, color: 0x60c0ff });
    const lp = L(hx, 2.0, hz);
    kit.add("leds", new THREE.BoxGeometry(0.3, 0.03, 0.01), { pos: [lp.x, lp.y, lp.z], quat: bq2.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)), uv: "keep" });
    kit.collider([Math.min(L(cx - 0.22, 0, cz - 0.22).x, L(cx + 0.22, 0, cz + 0.22).x), pos[1], Math.min(L(cx - 0.22, 0, cz - 0.22).z, L(cx + 0.22, 0, cz + 0.22).z)], [Math.max(L(cx - 0.22, 0, cz - 0.22).x, L(cx + 0.22, 0, cz + 0.22).x), pos[1] + 2.2, Math.max(L(cx - 0.22, 0, cz - 0.22).z, L(cx + 0.22, 0, cz + 0.22).z)], "scannerColumn");
  }
  // IV / fluids stand at the foot, open side
  if (rand() < 0.7) {
    const sx = -w / 2 - 0.35;
    const sz = l / 2 - 0.3;
    kit.add("impMetal", new THREE.CylinderGeometry(0.18, 0.2, 0.03, 12), { pos: L(sx, 0.015, sz).toArray(), color: IMP.gunmetal, uv: "scale", uvScale: [1, 0.1] });
    kit.add("impMetal", new THREE.CylinderGeometry(0.015, 0.015, 1.7, 8), { pos: L(sx, 0.86, sz).toArray(), color: IMP.steel, uv: "scale", uvScale: [0.1, 1] });
    box("impMetal", sx, 1.7, sz, 0.3, 0.02, 0.02, { color: IMP.steel });
    box("bactaFluid", sx - 0.12, 1.5, sz, 0.08, 0.2, 0.05);
    kit.collider([L(sx - 0.2, 0, sz - 0.2).x, pos[1], L(sx - 0.2, 0, sz - 0.2).z].map((v, i) => (i === 1 ? v : v)), [L(sx + 0.2, 0, sz + 0.2).x, pos[1] + 1.7, L(sx + 0.2, 0, sz + 0.2).z], "ivStand");
  }
  if (collide) {
    const a = L(-w / 2 - 0.08, 0, -l / 2 - 0.25);
    const b = L(w / 2 + 0.35, 0, l / 2 + 0.05);
    kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.0, Math.max(a.z, b.z)], "medBed");
  }
}

// Wheeled supply cart with drawers and a tray of instruments on top
function supplyCart(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => {
    const p = L(x, y, z);
    return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  box("impPaintedMetal", 0, 0.5, 0, 0.6, 0.76, 0.5, { color: IMP.wallMid, texel: 1 });
  for (let k = 0; k < 3; k++) {
    box("impPanel", 0, 0.28 + k * 0.2, 0.256, 0.52, 0.16, 0.012, { color: IMP.wallLight, uv: "keep" });
    box("impMetal", 0, 0.28 + k * 0.2, 0.27, 0.2, 0.025, 0.02, { color: IMP.steel });
  }
  box("impMetal", 0, 0.9, 0, 0.64, 0.04, 0.54, { color: IMP.steel, texel: 2 });
  box("impPaintedMetal", 0.1, 0.94, 0.05, 0.3, 0.04, 0.22, { color: IMP.white, texel: 2 });
  box("impPaintedMetal", -0.18, 0.96, -0.1, 0.12, 0.08, 0.12, { color: 0xb8231c, texel: 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.add("impMetal", new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), { pos: L(sx * 0.24, 0.06, sz * 0.18).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), color: IMP.rubber, uv: "scale", uvScale: [0.3, 0.1] });
  box("impMetal", 0, 1.0, -0.28, 0.5, 0.03, 0.03, { color: IMP.steel });
  for (const sx of [-0.22, 0.22]) box("impMetal", sx, 0.95, -0.28, 0.03, 0.1, 0.03, { color: IMP.steel });
  const a = L(-0.32, 0, -0.32);
  const b = L(0.32, 0, 0.32);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.0, Math.max(a.z, b.z)], "cart");
}

/**
 * Bacta tank: machinery base ring, glass cylinder with translucent blue fluid and slowly rising
 * bubbles (an instanced mesh animated by ctx), cap with feed pipes into the ceiling, a blue light.
 */
function bactaTank(kit, ctx, pos) {
  const [x, y, z] = pos;
  const R = 1.0;
  const H = 2.6;
  const baseH = 0.5;
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.35, R + 0.45, baseH, 32), { pos: [x, y + baseH / 2, z], color: IMP.consoleDark, uv: "scale", uvScale: [8, 1] });
  kit.add("impMetal", new THREE.CylinderGeometry(R + 0.38, R + 0.38, 0.06, 32), { pos: [x, y + baseH, z], color: IMP.steel, uv: "scale", uvScale: [8, 0.2] });
  kit.add("blink", new THREE.CylinderGeometry(R + 0.36, R + 0.36, 0.12, 32, 1, true), { pos: [x, y + baseH - 0.2, z], uv: "scale", uvScale: [6, 1] });
  kit.add("crewEmit", new THREE.TorusGeometry(R + 0.12, 0.02, 8, 48), { pos: [x, y + baseH + 0.04, z], rot: [Math.PI / 2, 0, 0], color: BACTA });
  // fluid, glass, internal frame ribs, cap
  kit.add("bactaFluid", new THREE.CylinderGeometry(R - 0.04, R - 0.04, H - 0.3, 32), { pos: [x, y + baseH + (H - 0.3) / 2 + 0.02, z], uv: "scale", uvScale: [4, 2] });
  kit.add("glass", new THREE.CylinderGeometry(R, R, H, 32, 1, true), { pos: [x, y + baseH + H / 2, z], uv: "scale", uvScale: [4, 2] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    kit.box("impMetal", x + Math.cos(a) * (R + 0.03), y + baseH + H / 2, z + Math.sin(a) * (R + 0.03), 0.08, H, 0.08, { color: IMP.gunmetal, rot: [0, -a, 0] });
  }
  kit.add("impPaintedMetal", new THREE.CylinderGeometry(R + 0.15, R + 0.2, 0.35, 32), { pos: [x, y + baseH + H + 0.175, z], color: IMP.consoleDark, uv: "scale", uvScale: [8, 0.5] });
  kit.add("impMetal", new THREE.CylinderGeometry(R + 0.22, R + 0.22, 0.05, 32), { pos: [x, y + baseH + H + 0.02, z], color: IMP.steel, uv: "scale", uvScale: [8, 0.1] });
  kit.add("crewEmit", new THREE.TorusGeometry(R + 0.1, 0.015, 8, 48), { pos: [x, y + baseH + H + 0.33, z], rot: [Math.PI / 2, 0, 0], color: BACTA });
  const room = ctx.room;
  const ceil = y + room.h;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const px = x + Math.cos(a) * 0.55;
    const pz = z + Math.sin(a) * 0.55;
    const top = y + baseH + H + 0.35;
    kit.add("impMetal", new THREE.CylinderGeometry(0.07, 0.07, ceil - top, 10), { pos: [px, (top + ceil) / 2, pz], color: k ? IMP.gunmetal : IMP.steel, uv: "scale", uvScale: [0.4, 1] });
  }
  // status panel and a breathing-mask hose reel on the base
  kit.box("impPaintedMetal", x, y + 0.32, z - R - 0.42, 0.7, 0.24, 0.06, { color: IMP.consoleDark, texel: 1 });
  kit.box("blinkSparse", x, y + 0.32, z - R - 0.455, 0.6, 0.16, 0.006, { uv: "keep" });
  kit.add("impMetal", new THREE.TorusGeometry(0.16, 0.04, 8, 20), { pos: [x + R + 0.2, y + baseH + 0.5, z + 0.7], rot: [0, Math.PI / 2, 0], color: IMP.gunmetal, uv: "scale", uvScale: [2, 1] });
  // bubbles: one instanced mesh, matrices refreshed by the room animator
  const N = 26;
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55, depthWrite: false });
  const bubbles = new THREE.InstancedMesh(geo, mat, N);
  bubbles.name = "bactaBubbles";
  bubbles.frustumCulled = false;
  const seeds = [];
  const rand = rng(77);
  for (let i = 0; i < N; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (R - 0.25);
    seeds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.02 + rand() * 0.035, v: 0.18 + rand() * 0.3, t: rand(), w: 0.5 + rand() * 1.5, ph: rand() * 6.28 });
  }
  const m = new THREE.Matrix4();
  const y0 = y + baseH + 0.1;
  const span = H - 0.5;
  const update = (t) => {
    for (let i = 0; i < N; i++) {
      const b = seeds[i];
      const f = (b.t + (t * b.v) / span) % 1;
      const wob = Math.sin(t * b.w + b.ph) * 0.05;
      m.makeScale(b.s, b.s * 1.2, b.s);
      m.setPosition(x + b.x + wob, y0 + f * span, z + b.z + Math.cos(t * b.w * 0.7 + b.ph) * 0.05);
      bubbles.setMatrixAt(i, m);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };
  update(0);
  ctx.add(bubbles);
  const fluid = ctx.mats.bactaFluid;
  ctx.animate((dt, t) => {
    update(t);
    fluid.emissiveIntensity = 0.85 + 0.15 * Math.sin(t * 0.9);
  });
  pointLightDesc(ctx, BACTA, 4.5, 8, [x, y + baseH + 1.3, z], 2);
  kit.collider([x - R - 0.45, y, z - R - 0.45], [x + R + 0.45, y + baseH + H, z + R + 0.45], "bactaTank");
}

// Medical droid on a charging pedestal: cylindrical body on a column, chest panel, domed head with
// a lit optic band, two articulated arms, one holding a hypo. pos = floor centre, yaw 0 faces +Z.
function medDroid(kit, pos, yaw = 0) {
  const q = yawQ(yaw);
  const o = new THREE.Vector3(...pos);
  const L = (x, y, z) => o.clone().add(new THREE.Vector3(x, y, z).applyQuaternion(q));
  const cyl = (mat, x, y, z, r0, r1, hh, extra = {}) => kit.add(mat, new THREE.CylinderGeometry(r0, r1, hh, 14), { pos: L(x, y, z).toArray(), quat: q, uv: "scale", uvScale: [1, 0.5], ...extra });
  const box = (mat, x, y, z, sx, sy, sz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: L(x, y, z).toArray(), quat: q, ...extra });
  cyl("impPaintedMetal", 0, 0.06, 0, 0.5, 0.55, 0.12, { color: IMP.trim });
  kit.add("crewEmit", new THREE.TorusGeometry(0.46, 0.012, 6, 32), { pos: L(0, 0.125, 0).toArray(), rot: [Math.PI / 2, 0, 0], color: 0x60a0ff });
  cyl("impMetal", 0, 0.32, 0, 0.14, 0.18, 0.4, { color: IMP.gunmetal });
  cyl("impPaintedMetal", 0, 0.95, 0, 0.3, 0.26, 0.86, { color: IMP.wallLight });
  box("impPaintedMetal", 0, 1.05, 0.28, 0.3, 0.34, 0.06, { color: IMP.consoleDark, texel: 1 });
  box("blinkSparse", 0, 1.08, 0.312, 0.24, 0.16, 0.006, { uv: "keep" });
  box("crewEmit", 0, 0.92, 0.312, 0.18, 0.02, 0.006, { color: 0xff4040 });
  for (const s of [-1, 1]) box("impMetal", s * 0.31, 1.0, 0, 0.02, 0.5, 0.16, { color: IMP.steel });
  cyl("impMetal", 0, 1.45, 0, 0.09, 0.1, 0.16, { color: IMP.gunmetal });
  kit.add("impPaintedMetal", new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: L(0, 1.53, 0).toArray(), quat: q, color: IMP.wallLight, uv: "scale", uvScale: [2, 1] });
  cyl("impPaintedMetal", 0, 1.535, 0, 0.24, 0.24, 0.02, { color: IMP.wallLight });
  box("crewEmit", 0, 1.6, 0.2, 0.22, 0.03, 0.06, { color: 0xff3020 });
  box("impMetal", 0, 1.66, 0.14, 0.08, 0.02, 0.1, { color: IMP.gunmetal });
  // arms: upper segments from the shoulders down and forward, forearms, tool
  for (const s of [-1, 1]) {
    const aq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, s * 0.35)));
    kit.add("impMetal", new THREE.CylinderGeometry(0.035, 0.03, 0.5, 10), { pos: L(s * 0.36, 1.15, 0.14).toArray(), quat: aq, color: IMP.steel, uv: "scale", uvScale: [0.3, 0.5] });
    kit.add("impMetal", new THREE.SphereGeometry(0.05, 10, 8), { pos: L(s * 0.44, 0.94, 0.28).toArray(), color: IMP.gunmetal, uv: "scale", uvScale: [0.3, 0.3] });
    const fq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(1.4, 0, s * -0.2)));
    kit.add("impMetal", new THREE.CylinderGeometry(0.028, 0.025, 0.42, 10), { pos: L(s * 0.4, 0.9, 0.48).toArray(), quat: fq, color: IMP.steel, uv: "scale", uvScale: [0.3, 0.5] });
    box("impPaintedMetal", s * 0.38, 0.87, 0.7, 0.08, 0.06, 0.1, { color: IMP.consoleDark, texel: 1 });
  }
  kit.add("impMetal", new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), { pos: L(0.38, 0.85, 0.82).toArray(), quat: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), color: IMP.steel, uv: "scale", uvScale: [0.1, 0.2] });
  box("bactaFluid", 0.38, 0.85, 0.78, 0.03, 0.03, 0.08);
  const a = L(-0.55, 0, -0.55);
  const b = L(0.55, 0, 0.9);
  kit.collider([Math.min(a.x, b.x), pos[1], Math.min(a.z, b.z)], [Math.max(a.x, b.x), pos[1] + 1.7, Math.max(a.z, b.z)], "droid");
}
