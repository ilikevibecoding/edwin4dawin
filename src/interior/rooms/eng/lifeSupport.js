// Life Support — Air, Water & Waste. Air side along the north wall: a row of scrubber cabinets under a
// trunk duct that ends in a big plenum fan, plus a back-to-back filter bank in the middle. Water side
// along the west wall: three storage tanks with sight gauges, a suction header feeding three pump sets
// whose discharge main leaves through the east wall. Waste side in the south-east: two hoppers feeding
// a compactor. A grated sump channel runs the length of the room with a cross channel, everything is
// tied together by a dense overhead pipe network, and the whole place is lit mint-green and damp.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, pipeRun, wallScreen, walkable, lockers, rng } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { addEngMaterials } from "./engMaterials.js";
import { cabinet, tank, pump, hopper, valve, flange, stain, floorDecal, deckMark, hazardKerb, hazardBand, relayCabinet, cableTray, cutFloor, trench, screenBank, toolCart, gaugeCluster, valveManifold, pipeTrunk, statusBoard } from "./engKit.js";

export function buildLifeSupport(kit, ctx) {
  addEngMaterials(ctx.mats);
  const { room, floorY: y, id } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const rand = rng(67);
  const T = STD.wallT;

  buildShell(kit, ctx, id, room, {
    wall: { slabHoles: true, pitch: 4, tone: IMP.wallDark, toneAlt: IMP.wallMid, bandMat: "lightBandCool", styles: { plain: 0.3, control: 0.04, vent: 0.3, hatch: 0.1, pipes: 0.26 } },
    ceiling: { lights: false, panelW: 2.5, tone: IMP.wallDark },
    skip: ["floor"],
  });
  const walls = roomWalls(room);

  // ------------------------------------------------------------ sump channels + deck
  const MAIN = [x0 + 1.5, 633.1, x1 - 2.6, 634.9];
  const CROSS = [-25.9, 616.6, -24.1, z1 - 1.6];
  cutFloor(kit, [x0 + T, z0 + T, x1 - T, z1 - T], y, [MAIN, CROSS], { tone: IMP.wallDark });
  walkable(ctx, x0 + T, z0 + T, x1 - T, z1 - T, y, id);
  trench(kit, MAIN, y, { depth: 0.6, strip: "emitGreen", bottom: "darkGloss", bottomColor: 0xffffff });
  trench(kit, [CROSS[0], CROSS[1], CROSS[2], MAIN[1]], y, { depth: 0.6, strip: "emitGreen", bottom: "darkGloss", bottomColor: 0xffffff });
  trench(kit, [CROSS[0], MAIN[3], CROSS[2], CROSS[3]], y, { depth: 0.6, strip: "emitGreen", bottom: "darkGloss", bottomColor: 0xffffff });
  // drain grilles where the cross channel meets the main one
  kit.boxMM("impMetal", [CROSS[0] - 0.3, y + 0.01, MAIN[1] - 0.3], [CROSS[2] + 0.3, y + 0.03, MAIN[3] + 0.3], { color: IMP.gunmetal });

  // ------------------------------------------------------------ air: scrubber row along the north wall
  const CAB = { w: 2.4, h: 4.4, d: 1.6 };
  const rowZ = z0 + T + 0.9 + CAB.d / 2;
  const rowXs = [];
  for (let x = x0 + 3.2; x < -16; x += 3.2) rowXs.push(x);
  for (let i = 0; i < rowXs.length; i++) {
    const cx = rowXs[i];
    cabinet(kit, [cx, y, rowZ], 0, [CAB.w, CAB.h, CAB.d], { seed: 100 + i, tone: i % 3 === 1 ? IMP.wallDark : IMP.wallMid, drawers: 5 });
    // riser duct into the trunk
    kit.box("impMetal", cx, y + CAB.h + 0.75, rowZ, 0.8, 1.5, 0.8, { color: IMP.gunmetal, texel: 1 });
    kit.box("impPaintedMetal", cx, y + CAB.h + 0.1, rowZ, 0.95, 0.2, 0.95, { color: IMP.trim, texel: 1 });
  }
  hazardKerb(kit, [rowXs[0] - CAB.w / 2, rowZ + CAB.d / 2 + 0.3], [rowXs[rowXs.length - 1] + CAB.w / 2, rowZ + CAB.d / 2 + 0.3], y, { w: 0.22, h: 0.05 });
  // trunk duct with flanged joints, running east into the plenum fan housing by the door
  const trunkY = y + h - 0.75;
  const plenumX = x1 - T - 5.6;
  kit.boxMM("impMetal", [x0 + T + 1.0, trunkY - 0.5, rowZ - 0.7], [plenumX, trunkY + 0.5, rowZ + 0.7], { color: IMP.gunmetal, texel: 1 });
  for (let x = x0 + 4; x < plenumX - 1; x += 4) kit.box("impPaintedMetal", x, trunkY, rowZ, 0.2, 1.16, 1.56, { color: IMP.trim, texel: 1 });
  {
    // plenum: big housing with an axial fan grille facing the room and a drive motor on top
    const px = plenumX + 2.8;
    const pz = rowZ + 0.4;
    kit.boxMM("impPaintedMetal", [plenumX, y + 0.2, z0 + T], [x1 - T, y + h - 0.2, pz + 2.6], { color: IMP.wallDark, texel: 1 });
    kit.boxMM("impPaintedMetal", [plenumX - 0.05, y, z0 + T], [x1 - T + 0.05, y + 0.2, pz + 2.65], { color: IMP.trim, texel: 1 });
    const fz = pz + 2.6 + 0.04;
    kit.cyl("impPaintedMetal", px, y + 3.4, fz, 1.5, 0.08, "z", { color: IMP.trim, segments: 28 });
    kit.cyl("impMetal", px, y + 3.4, fz + 0.02, 1.38, 0.1, "z", { color: IMP.black, segments: 28 });
    kit.cyl("impMetal", px, y + 3.4, fz + 0.16, 0.28, 0.2, "z", { color: IMP.steel, segments: 14 });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.45));
      kit.add("impMetal", new THREE.BoxGeometry(1.2, 0.42, 0.03), { pos: [px + Math.cos(a) * 0.75, y + 3.4 + Math.sin(a) * 0.75, fz + 0.14], quat: q, color: IMP.gunmetal });
    }
    for (let k = -1; k <= 1; k++) kit.box("impMetal", px, y + 3.4 + k * 0.95, fz + 0.2, 2.8, 0.05, 0.03, { color: IMP.steel });
    for (let k = -1; k <= 1; k += 2) kit.box("impMetal", px + k * 0.95, y + 3.4, fz + 0.2, 0.05, 2.8, 0.03, { color: IMP.steel });
    kit.box("impPaintedMetal", px, y + 1.0, fz + 0.05, 1.8, 0.7, 0.1, { color: IMP.consoleDark, texel: 1 });
    kit.box("leds", px, y + 1.0, fz + 0.11, 1.4, 0.08, 0.004, { uv: "keep" });
    kit.box("blinkSparse", px, y + 0.75, fz + 0.11, 1.4, 0.2, 0.004, { uv: "keep" });
    hazardBand(kit, [px, y + 0.1, fz + 0.06], 0, 3.4, 0.2);
    kit.add("impDecal", new THREE.PlaneGeometry(1.0, 1.0), { pos: [px - 1.0, y + 5.8, fz + 0.05], uv: "keep", uvRect: impDecalRect(6) });
    kit.collider([plenumX - 0.1, y, z0], [x1, y + h, pz + 2.7], "plenum");
    stain(kit, [px + 0.8, y, fz + 0.9], 1.8, { rot: 0.4 });
  }

  // ------------------------------------------------------------ air: back-to-back filter bank in the middle
  const BANK = { z: 624.0, x0: x0 + 4.2, n: 4, pitch: 3.0 };
  for (let i = 0; i < BANK.n; i++) {
    const cx = BANK.x0 + i * BANK.pitch;
    cabinet(kit, [cx, y, BANK.z - 0.85], Math.PI, [2.6, 4.0, 1.7], { seed: 130 + i, tone: IMP.wallMid, drawers: 6 });
    cabinet(kit, [cx, y, BANK.z + 0.85], 0, [2.6, 4.0, 1.7], { seed: 140 + i, tone: IMP.wallMid, drawers: 6 });
  }
  {
    const bx0 = BANK.x0 - 1.5;
    const bx1 = BANK.x0 + (BANK.n - 1) * BANK.pitch + 1.5;
    kit.boxMM("impMetal", [bx0, y + 4.0, BANK.z - 0.9], [bx1, y + 4.9, BANK.z + 0.9], { color: IMP.gunmetal, texel: 1 });
    kit.boxMM("impPaintedMetal", [bx0 - 0.1, y + 4.9, BANK.z - 1.0], [bx1 + 0.1, y + 5.0, BANK.z + 1.0], { color: IMP.trim, texel: 1 });
    // duct up to the ceiling, then north to the trunk
    kit.boxMM("impMetal", [bx1 - 1.9, y + 5.0, BANK.z - 0.6], [bx1 - 0.7, y + h - 0.3, BANK.z + 0.6], { color: IMP.gunmetal, texel: 1 });
    kit.boxMM("impMetal", [bx1 - 1.9, y + h - 1.5, rowZ + 0.7], [bx1 - 0.7, y + h - 0.3, BANK.z + 0.6], { color: IMP.gunmetal, texel: 1 });
    hazardKerb(kit, [bx0, BANK.z - 2.0], [bx1, BANK.z - 2.0], y, { w: 0.2, h: 0.05 });
    hazardKerb(kit, [bx0, BANK.z + 2.0], [bx1, BANK.z + 2.0], y, { w: 0.2, h: 0.05 });
    floorDecal(kit, bx1 + 1.4, y, BANK.z, 1.1, 2, -Math.PI / 2);
  }

  // ------------------------------------------------------------ water: tanks along the west wall
  const TX = x0 + T + 3.05;
  const TR = 2.3;
  const TH = 5.0;
  const tankZ = [639.6, 645.9, 652.2];
  const HX = TX + TR + 1.1; // suction header x
  tankZ.forEach((tz, i) => tank(kit, [TX, y, tz], TR, TH, { level: [0.72, 0.45, 0.88][i], label: [9, 11, 15][i], seed: 150 + i, color: i === 1 ? IMP.gunmetal : IMP.steel }));
  for (const tz of tankZ) stain(kit, [TX, y, tz - TR - 0.7], 1.5, { rot: 0.9 });
  // header runs the length of the tank row and drops to the pump suction manifold
  pipeRun(kit, [[HX, y + 3.6, tankZ[2] + 0.6], [HX, y + 3.6, 636.4], [HX, y + 0.66, 636.4]], 0.3, { color: IMP.steel, clampPitch: 3 });
  for (const tz of tankZ) {
    pipeRun(kit, [[TX + TR - 0.2, y + 3.6, tz], [HX, y + 3.6, tz]], 0.22, { color: IMP.steel, clamps: false });
    valve(kit, [HX - 0.55, y + 3.6 + 0.36, tz], 0.24, "y", { stem: 0.3 });
    flange(kit, [TX + TR + 0.05, y + 3.6, tz], 0.22, "x");
  }
  flange(kit, [HX, y + 1.4, 636.4], 0.3, "y");

  // ------------------------------------------------------------ water: pump sets + discharge main
  const pumpX = [-37.2, -33.2, -29.2];
  const PZ = 641.0;
  const MZ = 636.4; // suction manifold z
  pipeRun(kit, [[HX, y + 0.66, MZ], [pumpX[2] + 0.2, y + 0.66, MZ]], 0.3, { color: IMP.steel, clampPitch: 3 });
  kit.collider([HX - 0.35, y, MZ - 0.35], [pumpX[2] + 0.3, y + 1.0, MZ + 0.35], "manifold");
  const DY = y + h - 1.0;
  const DZ = PZ - 0.66;
  for (let i = 0; i < pumpX.length; i++) {
    const px = pumpX[i];
    const p = pump(kit, [px, y, PZ], Math.PI / 2, { scale: 1.1, seed: 160 + i, color: i === 1 ? IMP.steel : IMP.gunmetal });
    pipeRun(kit, [p.suction, [px, y + 0.66, MZ]], 0.2, { color: IMP.steel, clamps: false });
    valve(kit, [px, y + 0.66 + 0.32, (p.suction[2] + MZ) / 2], 0.2, "y", { stem: 0.25 });
    kit.collider([px - 0.25, y, MZ], [px + 0.25, y + 0.9, p.suction[2]], "suction");
    pipeRun(kit, [p.discharge, [p.discharge[0], DY, p.discharge[2]]], 0.18, { color: IMP.steel, clampPitch: 2.2 });
    flange(kit, [p.discharge[0], y + 2.4, p.discharge[2]], 0.18, "y");
    deckMark(kit, px, y, PZ, 2.6, 4.2, 2, 0);
    if (i === 1) stain(kit, [px + 0.9, y, PZ + 1.0], 1.2, { rot: 2.0 });
  }
  // discharge main along the ceiling to the east wall, through a wall collar
  const DX = x1 - T - 2.4;
  pipeRun(kit, [[pumpX[0], DY, DZ], [DX, DY, DZ], [DX, DY, 630.6], [x1 - T + 0.2, DY, 630.6]], 0.26, { color: IMP.steel, clampPitch: 3 });
  kit.cyl("impPaintedMetal", x1 - T - 0.1, DY, 630.6, 0.42, 0.2, "x", { color: IMP.trim, segments: 14 });
  valve(kit, [pumpX[2] + 2.2, DY - 0.42, DZ], 0.26, "y", { stem: 0.3 });
  floorDecal(kit, HX + 1.4, y, 637.6, 1.0, 9);
  toolCart(kit, [HX + 1.2, y, 645.5], Math.PI / 2 + 0.2, { seed: 7 });

  // ------------------------------------------------------------ waste: hoppers feeding a compactor
  const hopperPos = [[-20.6, 648.2], [-14.4, 648.2]];
  for (let i = 0; i < hopperPos.length; i++) {
    const [hx, hz] = hopperPos[i];
    hopper(kit, [hx, y, hz], [2.6, 3.9], { yaw: 0, color: i ? IMP.steel : IMP.gunmetal });
    stain(kit, [hx + 0.4, y, hz + 0.3], 2.4, { rot: i * 1.3 });
    // feed duct from the ceiling into the hopper collar
    kit.box("impMetal", hx, y + 3.9 + 0.6 + (h - 3.9 - 0.6) / 2, hz, 0.8, h - 3.9 - 0.6, 0.8, { color: IMP.gunmetal, texel: 1 });
  }
  {
    // compactor: heavy block with a ram housing, hydraulic rams, a loading mouth and status panel
    const cx = -8.2;
    const cz = 649.0;
    kit.boxMM("impPaintedMetal", [cx - 1.6, y, cz - 2.0], [cx + 1.6, y + 0.25, cz + 2.0], { color: IMP.trim, texel: 1 });
    kit.boxMM("impPaintedMetal", [cx - 1.4, y + 0.25, cz - 1.8], [cx + 1.4, y + 2.4, cz + 1.8], { color: IMP.wallDark, texel: 1 });
    kit.boxMM("impMetal", [cx - 1.5, y + 2.4, cz - 1.9], [cx + 1.5, y + 2.55, cz + 1.9], { color: IMP.trim });
    kit.boxMM("impPaintedMetal", [cx - 1.0, y + 2.55, cz - 1.0], [cx + 1.0, y + 3.3, cz + 1.0], { color: IMP.gunmetal, texel: 1 });
    for (const s of [-1, 1]) {
      kit.cyl("impMetal", cx + s * 1.0, y + 3.3 + 0.5, cz, 0.16, 1.0, "y", { color: IMP.steel, segments: 12 });
      kit.cyl("impMetal", cx + s * 1.0, y + 3.3 + 1.05, cz, 0.24, 0.5, "y", { color: IMP.gunmetal, segments: 12 });
    }
    kit.box("impPaintedMetal", cx, y + 1.3, cz - 1.84, 1.6, 1.2, 0.08, { color: IMP.black, texel: 1 });
    hazardBand(kit, [cx, y + 2.0, cz - 1.85], 0, 2.4, 0.16);
    kit.box("impPaintedMetal", cx - 1.45, y + 1.6, cz + 0.6, 0.1, 0.8, 1.0, { color: IMP.consoleDark, texel: 1 });
    kit.box("blink", cx - 1.51, y + 1.7, cz + 0.6, 0.004, 0.4, 0.8, { uv: "keep" });
    kit.box("emitRed", cx - 1.51, y + 1.3, cz + 0.6, 0.004, 0.06, 0.5);
    kit.add("impDecal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [cx - 1.46, y + 1.4, cz - 1.0], rot: [0, -Math.PI / 2, 0], uv: "keep", uvRect: impDecalRect(13) });
    kit.collider([cx - 1.6, y, cz - 2.0], [cx + 1.6, y + 3.4, cz + 2.0], "compactor");
    // waste lines from both hopper discharges into the compactor (the west one dog-legs past its neighbour)
    const [h1x, h1z] = hopperPos[0];
    const [h2x, h2z] = hopperPos[1];
    pipeRun(kit, [[h1x + 1.45, y + 0.5, h1z], [h1x + 1.9, y + 0.5, h1z], [h1x + 1.9, y + 0.5, h1z + 1.7], [cx - 1.7, y + 0.5, h1z + 1.7]], 0.3, { color: IMP.gunmetal, clampPitch: 2.4 });
    pipeRun(kit, [[h2x + 1.45, y + 0.5, h2z], [cx - 1.7, y + 0.5, h2z]], 0.3, { color: IMP.gunmetal, clampPitch: 2.4 });
    kit.collider([h1x + 1.4, y, h1z + 1.35], [cx - 1.4, y + 0.85, h1z + 2.05], "wasteLine");
    kit.collider([h2x + 1.4, y, h2z - 0.35], [cx - 1.4, y + 0.85, h2z + 0.35], "wasteLine");
    hazardKerb(kit, [hopperPos[0][0] - 1.9, 645.4], [cx + 1.8, 645.4], y, { w: 0.25, h: 0.06 });
    deckMark(kit, (hopperPos[0][0] + cx) / 2, y, 643.6, 14, 2.4, 0, 0);
    stain(kit, [cx + 0.6, y, cz + 2.6], 1.6, { rot: 0.7 });
  }

  // ------------------------------------------------------------ overhead pipe network
  {
    const PY1 = y + h - 1.6;
    const PY2 = y + h - 1.1;
    const px0 = x0 + T + 0.6;
    const px1 = x1 - T - 5.0;
    const plenumFace = rowZ + 0.4 + 2.6 + 0.1;
    // three mains the length of the room that turn north and feed the plenum
    pipeRun(kit, [[px0, PY1, 630.0], [px1, PY1, 630.0], [px1, PY1, plenumFace]], 0.3, { color: IMP.steel, clampPitch: 3.5 });
    pipeRun(kit, [[px0, PY2, 630.9], [px1 + 0.8, PY2, 630.9], [px1 + 0.8, PY2, plenumFace]], 0.2, { color: IMP.gunmetal, clampPitch: 3.5 });
    pipeRun(kit, [[px0, PY1, 631.6], [px1 + 1.6, PY1, 631.6], [px1 + 1.6, PY1, plenumFace]], 0.15, { color: IMP.darkMetal, clampPitch: 3.5 });
    for (const vx of [-38, -29, -20, -11]) valve(kit, [vx, PY1 - 0.42, 630.0], 0.26, "y", { stem: 0.3 });
    // drops from the mains into the filter bank
    for (let i = 0; i < BANK.n; i++) {
      const cx = BANK.x0 + i * BANK.pitch + 0.9;
      pipeRun(kit, [[cx, PY1, 630.0], [cx, PY1, BANK.z + 1.2], [cx, y + 5.0, BANK.z + 1.2]], 0.12, { color: IMP.steel, clamps: false });
    }
    // north-south pair beside the cross channel, from the trunk to the waste corner
    const NY1 = y + 4.8;
    const NY2 = y + 6.4;
    pipeRun(kit, [[-27.2, NY1, rowZ + 1.4], [-27.2, NY1, z1 - T - 0.6]], 0.24, { color: IMP.steel, clampPitch: 3.5 });
    pipeRun(kit, [[-27.9, NY2, rowZ + 1.4], [-27.9, NY2, z1 - T - 0.6]], 0.15, { color: IMP.gunmetal, clampPitch: 3.5 });
    valve(kit, [-27.2, NY1 - 0.36, 637], 0.22, "y", { stem: 0.25 });
    valve(kit, [-27.2, NY1 - 0.36, 650], 0.22, "y", { stem: 0.25 });
    // drip stains on the deck under the valves
    for (const vx of [-38, -20]) stain(kit, [vx + 0.3, y, 630.4], 1.3, { rot: vx });
  }

  // ------------------------------------------------------------ east end: monitoring station by the door
  impConsole(kit, ctx, [x1 - T - 4.6, y, 640.2], Math.PI / 2, { kind: "wide", width: 2.4, screens: 3, seed: 171, light: true });
  chair(kit, [x1 - T - 3.7, y, 640.2], Math.PI / 2);
  floorDecal(kit, x1 - T - 3.0, y, 636.9, 1.0, 5, Math.PI / 2);
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenBank(frame, w.u(640.6), 2.9, 3, 2, 1.3, 0.8, 9, { variants: [0, 1, 2, 4], dark: 0.15, wide: [[0, 1]] });
    statusBoard(frame, w.u(640.6), 4.6, 3.6, 1.1, 27, { displays: ["screenGauges", "screenBars"] });
    lockers(frame, w.u(645.0), w.u(650.0), 2.1, { seed: 23 });
    relayCabinet(frame, w.u(652.8), 0, 2.6, 2.4, 101);
    cableTray(frame, w.u(643.5), w.u(z1 - T - 1.0), 4.4, { n: 0.45, cables: 4 });
  }
  {
    // south wall by the tank row: gauge cluster and a valved manifold within reach of the tanks, an
    // authored flow display next to them, a pipe trunk overhead
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(-31), 2.4, 1.6, 0.9, 1);
    relayCabinet(frame, w.u(-26.5), 0, 2.4, 2.0, 102);
    gaugeCluster(frame, w.u(-36.8), 1.75, { n: 3, r: 0.24, seed: 41 });
    valveManifold(frame, w.u(-32.6), w.u(-35.6), 3.2, { n: 3, r: 0.13, drop: 1.2, seed: 42 });
    wallScreen(frame, w.u(-39.6), 1.7, 1.4, 0.8, "Bars");
    pipeTrunk(frame, w.u(-29.2), w.u(-38.6), 4.4, { n: 3, seed: 43, valves: 2 });
    frame.quad("impDecal", w.u(-38.6), 3.3, 0.064, 0.9, 0.9, { uvRect: impDecalRect(11) });
    frame.quad("impDecal", w.u(-4.5), 2.0, 0.064, 0.9, 0.9, { uvRect: impDecalRect(2) });
    stain(kit, [-23, y + 1.4, z1 - T], 2.2, { normal: [0, 0, -1], aspect: 1.6 });
  }
  {
    // west wall behind the tanks: gauge pairs in the gaps between the tanks, a two-line trunk above them
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    wallScreen(frame, w.u(630.5), 2.2, 1.4, 0.8, 2);
    frame.quad("impDecal", w.u(634.5), 2.0, 0.064, 1.0, 1.0, { uvRect: impDecalRect(9) });
    cableTray(frame, w.u(632), w.u(616), 4.6, { n: 0.45, cables: 3 });
    gaugeCluster(frame, w.u(642.75), 1.5, { n: 2, r: 0.2, seed: 45 });
    gaugeCluster(frame, w.u(649.05), 1.5, { n: 2, r: 0.2, seed: 46 });
    pipeTrunk(frame, w.u(654.5), w.u(634.0), 5.5, { n: 2, seed: 44, valves: 1 });
    frame.quad("impDecal", w.u(637.0), 3.4, 0.064, 0.9, 0.9, { uvRect: impDecalRect(15) });
  }
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(-15.4), w.u(-9.6), 2.1, { seed: 25 });
    frame.quad("impDecal", w.u(-12.5), 3.4, 0.064, 1.0, 1.0, { uvRect: impDecalRect(6) });
  }
  // ------------------------------------------------------------ water treatment skid east of the cross channel
  {
    const vx = [-19.5, -16.5, -13.5];
    const vz = 627.4;
    const VR = 0.85;
    const VH = 3.4;
    kit.boxMM("impPaintedMetal", [vx[0] - 1.5, y, vz - 1.5], [vx[2] + 1.5, y + 0.2, vz + 1.5], { color: IMP.trim, texel: 1 });
    hazardBand(kit, [(vx[0] + vx[2]) / 2, y + 0.1, vz + 1.506], 0, vx[2] - vx[0] + 2.8, 0.16);
    for (let i = 0; i < vx.length; i++) {
      const x = vx[i];
      kit.cyl("impMetal", x, y + 0.2 + VH / 2, vz, VR, VH, "y", { color: i === 1 ? IMP.gunmetal : IMP.steel, segments: 22, texel: 0.5 });
      const dome = new THREE.SphereGeometry(VR, 22, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      dome.scale(1, 0.45, 1);
      kit.add("impMetal", dome, { pos: [x, y + 0.2 + VH, vz], color: i === 1 ? IMP.gunmetal : IMP.steel, uv: "scale", uvScale: [3, 1] });
      for (const f of [0.25, 0.75]) kit.cyl("impPaintedMetal", x, y + 0.2 + VH * f, vz, VR + 0.04, 0.14, "y", { color: IMP.trim, segments: 22 });
      for (const s of [-1, 1]) kit.box("impPaintedMetal", x + s * (VR - 0.1), y + 0.6, vz, 0.2, 0.8, 0.2, { color: IMP.trim, texel: 1 });
      // sight glass + drain into the sump channel
      kit.box("impPaintedMetal", x, y + 1.8, vz + VR + 0.08, 0.2, 1.6, 0.1, { color: IMP.trim, texel: 1 });
      kit.box("emitGreen", x, y + 1.5 + [0.3, -0.2, 0.5][i], vz + VR + 0.14, 0.08, 0.7, 0.02);
      pipeRun(kit, [[x, y + 0.5, vz + VR], [x, y + 0.5, vz + 2.2], [x, y - 0.2, vz + 2.2]], 0.1, { color: IMP.gunmetal, clamps: false });
      kit.add("impDecal", new THREE.PlaneGeometry(0.6, 0.6), { pos: [x + 0.2, y + 2.9, vz + VR + 0.004], uv: "keep", uvRect: impDecalRect([4, 8, 10][i]) });
    }
    // top manifold linking the vessels, riser to the mains, cross feed to the discharge line
    pipeRun(kit, [[vx[0] - 0.6, y + 0.2 + VH + 0.7, vz], [vx[2] + 0.6, y + 0.2 + VH + 0.7, vz], [vx[2] + 0.6, y + h - 1.6, vz], [vx[2] + 0.6, y + h - 1.6, 629.7]], 0.16, { color: IMP.steel, clampPitch: 2 });
    for (const x of vx) pipeRun(kit, [[x, y + 0.2 + VH + 0.2, vz], [x, y + 0.2 + VH + 0.7, vz]], 0.12, { color: IMP.steel, clamps: false });
    valve(kit, [vx[1] + 1.5, y + 0.2 + VH + 0.7 + 0.3, vz], 0.2, "y", { stem: 0.25 });
    kit.collider([vx[0] - 1.5, y, vz - 1.5], [vx[2] + 1.5, y + VH + 1, vz + 1.5], "treatment");
    stain(kit, [vx[1], y, vz + 2.4], 1.6, { rot: 1.1 });
    floorDecal(kit, vx[0] - 2.4, y, vz, 1.0, 10, -Math.PI / 2);
  }
  // condensate receiver: horizontal drum on saddles between the pumps and the waste corner
  {
    const rx = -25.0;
    const rz = 651.2;
    const RR = 1.1;
    const cy = y + 0.6 + RR;
    for (const sx of [rx - 1.8, rx + 1.8]) {
      kit.box("impPaintedMetal", sx, y + 0.35, rz, 0.5, 0.7, 2.4, { color: IMP.trim, texel: 1 });
      kit.add("impPaintedMetal", new THREE.CylinderGeometry(RR + 0.1, RR + 0.1, 0.5, 20, 1, true, Math.PI * 1.12, Math.PI * 0.76), { pos: [sx, cy, rz], rot: [0, 0, Math.PI / 2], color: IMP.trim, uv: "scale", uvScale: [4, 1] });
    }
    kit.cyl("impMetal", rx, cy, rz, RR, 5.2, "x", { color: IMP.steel, segments: 22, texel: 0.5 });
    for (const s of [-1, 1]) {
      const dome = new THREE.SphereGeometry(RR, 22, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      dome.scale(1, 0.4, 1);
      dome.rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2);
      kit.add("impMetal", dome, { pos: [rx + s * 2.6, cy, rz], color: IMP.steel, uv: "scale", uvScale: [3, 1] });
    }
    for (const f of [-1.2, 1.2]) kit.cyl("impPaintedMetal", rx + f, cy, rz, RR + 0.05, 0.14, "x", { color: IMP.trim, segments: 22 });
    kit.cyl("impMetal", rx, cy + RR + 0.25, rz, 0.16, 0.5, "y", { color: IMP.gunmetal, segments: 10 });
    pipeRun(kit, [[rx, cy + RR + 0.5, rz], [rx, y + h - 1.6, rz], [rx, y + h - 1.6, 640.34 + 0.9]], 0.14, { color: IMP.gunmetal, clampPitch: 2.5 });
    valve(kit, [rx + 0.36, cy + RR + 0.8, rz], 0.18, "x", { stem: 0.25 });
    kit.box("impPaintedMetal", rx - 1.0, cy - 0.2, rz - RR - 0.1, 0.9, 0.6, 0.1, { color: IMP.consoleDark, texel: 1 });
    kit.box("blinkSparse", rx - 1.0, cy - 0.1, rz - RR - 0.16, 0.7, 0.2, 0.004, { uv: "keep" });
    kit.box("emitGreen", rx - 1.0, cy - 0.38, rz - RR - 0.16, 0.5, 0.05, 0.004);
    kit.collider([rx - 2.7, y, rz - RR - 0.3], [rx + 2.7, cy + RR, rz + RR + 0.2], "receiver");
    stain(kit, [rx + 0.8, y, rz - RR - 0.9], 1.6, { rot: 2.2 });
  }
  // deck stencils along the main channel
  floorDecal(kit, -34, y, 636.2, 1.0, 12, Math.PI / 2);
  floorDecal(kit, -16, y, 631.8, 1.0, 8, -Math.PI / 2);

  // ------------------------------------------------------------ lights: mint-green service light, damp and cool
  // nine recessed bars under a 7 m ceiling; the point sources hang 2.2 m below the fixtures so the deck
  // between the machines reads at ~1.5 lux of mint light (the fixture emissive itself stays soft)
  for (const lx of [-35, -24.5, -14]) for (const lz of [619.5, 633.5, 648]) ceilingLight(kit, ctx, [lx, y + h, lz], 6, "x", { mat: "lightBandCool", color: 0xb8ffe6, intensity: 36, distance: 17, priority: lz === 633.5 ? 2 : 1, drop: 2.2 });
  pointLightDesc(ctx, 0x7fffc0, 5.0, 10, [HX + 0.6, y + 2.6, 646], 0); // tank gauges
  pointLightDesc(ctx, 0xdfe8ff, 7.0, 9, [x1 - T - 2.2, y + 3.0, 634], 1); // door

  // ------------------------------------------------------------ views
  ctx.view("lifeSupport", x1 - T - 1.6, y + STD.eye, 634, 90, -2);
  ctx.view("lifeSupport_tanks", -27.5, y + STD.eye, 649.5, 82, 3);
  ctx.view("lifeSupport_scrubbers", -13.5, y + STD.eye, 619.8, 78, 3); // down the scrubber row under the trunk duct
  void rand;
}
