// Deck 2 recreation lounge: a dispenser bar with back-bar shelving along the forward wall, four round
// holo-game tables with stools in the centre, two lounge clusters flanking the entry, a 2x2 media
// wall with tiered bench rows, an exercise corner with a rack, mats and lockers, a hydration station,
// vending cabinets and warm drop lights. Neutral grey with warm white accents (§11 crew areas).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { rail } from "../_shared/shell.js";
import { console as consoleProp, wallScreen, lockerBank, tank, cabinet, dropLight, floorLine } from "../_shared/props.js";
import { stool, gameTable, benchSeat, lowTable, bottleRow, dispenser, exerciseRack, mat, mediaWall, scoreBoard, doorPanel, gearCrate, zoneRect, infoColumn, standTable, lightObelisk } from "./props.js";

const Y = 40;
const CEIL = 45;
const IX0 = 36.3;
const IX1 = 59.7;
const IZ0 = 344.3;
const IZ1 = 372.2;
const BLACK = IMP.impBlack;
const DARK = IMP.impDark;
const MID = IMP.impMid;
const GREY = IMP.impGrey;

export default defineRoom({
  id: "d2-rec",
  name: "Recreation Lounge",
  deck: 2,
  x: [36, 60],
  z: [344, 372.5],
  ceil: CEIL,
  spawn: { pos: [48, Y, 370], yaw: 0 },
  views: {
    "d2-rec-door": { pos: [48, Y, 370.6], yaw: 0, pitch: -2 },
    "d2-rec-bar": { pos: [52.8, Y, 350.6], yaw: 28, pitch: -1 },
    "d2-rec-tables": { pos: [41.6, Y, 362.6], yaw: -38, pitch: -2 },
    "d2-rec-lounge": { pos: [50.6, Y, 369.4], yaw: 66, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    ceiling: { channels: 5, axis: "x", stripMat: "emitWarm" },
    lights: false,
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;

    // ---- dispenser bar along the forward wall (x 42.6..53.4) -------------------------------------------
    const BX0 = 42.6;
    const BX1 = 53.4;
    const bz = IZ0 + 0.02;
    // back-bar: lower cabinet with doors, worktop, lit shelving bays, header canopy
    kit.boxMM("paintedMetal", [BX0, Y, bz], [BX1, Y + 0.95, bz + 0.55], { color: DARK, texel: 1 });
    kit.boxMM("paintedMetal", [BX0, Y, bz], [BX1, Y + 0.1, bz + 0.5], { color: BLACK });
    kit.boxMM("paintedMetal", [BX0, Y + 0.95, bz], [BX1, Y + 1.0, bz + 0.6], { color: BLACK, texel: 1 });
    kit.boxMM("paintedMetal", [BX0, Y + 1.0, bz], [BX1, Y + 2.4, bz + 0.05], { color: BLACK, texel: 1 }); // shelving back
    kit.boxMM("paintedMetal", [BX0, Y + 2.4, bz], [BX1, Y + 2.7, bz + 0.7], { color: DARK, texel: 1 }); // canopy
    kit.boxMM("emitWarm", [BX0 + 0.2, Y + 2.385, bz + 0.2], [BX1 - 0.2, Y + 2.405, bz + 0.6]);
    kit.boxMM("paintedMetal", [BX0, Y + 2.7, bz], [BX1, Y + 2.76, bz + 0.74], { color: MID });
    const nBays = 6;
    const bayW = (BX1 - BX0) / nBays;
    for (let i = 0; i <= nBays; i++) {
      const x = BX0 + i * bayW;
      kit.boxMM("paintedMetal", [x - 0.03, Y + 1.0, bz + 0.05], [x + 0.03, Y + 2.4, bz + 0.45], { color: DARK });
      if (i < nBays) {
        // lower doors with handles
        kit.boxMM("paintedMetal", [x + 0.05, Y + 0.12, bz + 0.55], [x + bayW - 0.05, Y + 0.92, bz + 0.565], { color: MID, texel: 1 });
        kit.box("metal", x + bayW - 0.15, Y + 0.55, bz + 0.58, 0.02, 0.18, 0.02, { color: IMP.steel });
        // shelves with warm under-shelf strips
        for (const sy of [1.45, 1.95]) {
          kit.boxMM("paintedMetal", [x + 0.03, Y + sy, bz + 0.05], [x + bayW - 0.03, Y + sy + 0.03, bz + 0.42], { color: DARK });
          kit.boxMM("emitWarm", [x + 0.1, Y + sy - 0.012, bz + 0.3], [x + bayW - 0.1, Y + sy, bz + 0.34]);
          bottleRow(kit, x + bayW / 2, Y + sy + 0.03, bz + 0.24, bayW - 0.3, 700 + i * 10 + sy * 7, 7);
        }
        // back-lit panel behind each bay
        kit.boxMM("emitWarm", [x + 0.1, Y + 1.05, bz + 0.05], [x + bayW - 0.1, Y + 1.09, bz + 0.056]);
        if (i % 2 === 0) bottleRow(kit, x + bayW / 2, Y + 1.0, bz + 0.3, bayW - 0.4, 800 + i, 8);
        else dispenser(kit, x + bayW / 2, Y + 1.0, bz + 0.32, 900 + i);
      }
    }
    // bar sign band above the canopy
    kit.boxMM("darkGloss", [BX0 + 1.4, Y + 3.15, bz], [BX1 - 1.4, Y + 3.45, bz + 0.04]);
    kit.boxMM("emitAmber", [BX0 + 1.6, Y + 3.27, bz + 0.04], [BX1 - 1.6, Y + 3.33, bz + 0.052]);
    for (let i = 0; i < 8; i++) kit.boxMM(i % 2 ? "emitWarm" : "emitBlue", [BX0 + 1.7 + i * 0.95, Y + 3.19, bz + 0.04], [BX0 + 2.3 + i * 0.95, Y + 3.22, bz + 0.05]);
    kit.collider([BX0, Y, IZ0], [BX1, Y + 2.76, bz + 0.74], "back-bar");
    // front counter: black body, toe-kick, grey top with overhang, ribbed customer face, warm strips
    const CZ0 = 345.75;
    const CZ1 = 346.45;
    kit.boxMM("paintedMetal", [BX0, Y + 0.1, CZ0], [BX1, Y + 0.84, CZ1], { color: BLACK, texel: 1 });
    kit.boxMM("paintedMetal", [BX0 + 0.05, Y, CZ0 + 0.05], [BX1 - 0.05, Y + 0.1, CZ1 - 0.06], { color: BLACK });
    kit.boxMM("paintedMetal", [BX0 - 0.05, Y + 0.84, CZ0 - 0.05], [BX1 + 0.05, Y + 0.9, CZ1 + 0.12], { color: GREY, texel: 1 });
    kit.boxMM("darkGloss", [BX0 + 0.3, Y + 0.9, CZ0 + 0.05], [BX1 - 0.3, Y + 0.906, CZ1 - 0.15]);
    kit.boxMM("paintedMetal", [BX0, Y + 0.16, CZ1], [BX1, Y + 0.8, CZ1 + 0.02], { color: MID, texel: 1 });
    for (let x = BX0 + 0.45; x < BX1; x += 0.9) kit.boxMM("paintedMetal", [x - 0.03, Y + 0.12, CZ1], [x + 0.03, Y + 0.84, CZ1 + 0.035], { color: DARK });
    kit.boxMM("emitWarm", [BX0 + 0.2, Y + 0.13, CZ1 - 0.02], [BX1 - 0.2, Y + 0.15, CZ1 + 0.01]);
    kit.boxMM("emitWarm", [BX0 + 0.2, Y + 0.835, CZ1 + 0.05], [BX1 - 0.2, Y + 0.845, CZ1 + 0.1]);
    for (const x of [BX0, BX1 - 0.06]) kit.boxMM("paintedMetal", [x, Y, bz + 0.55], [x + 0.06, Y + 0.9, CZ0], { color: DARK, texel: 1 }); // end panels
    kit.collider([BX0 - 0.05, Y, bz + 0.55], [BX1 + 0.05, Y + 0.9, CZ1 + 0.12], "bar");
    for (let i = 0; i < 6; i++) stool(kit, 44.0 + i * 1.6, Y, 347.3, { h: 0.72, r: 0.2 });
    // bar zone floor line
    floorLine(kit, [BX0 - 0.3, Y, 348.3], [BX1 + 0.3, Y, 348.3], 0.08, "paintedMetal", IMP.impWhite);

    // ---- forward-port corner: hydration station + vending cabinets + screen ------------------------------
    tank(kit, PALETTE, [39.6, Y, 345.6], 0, { r: 0.4, h: 1.6, color: IMP.impWhite, bands: 2, emit: "emitBlue" });
    cabinet(kit, PALETTE, [37.5, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 21 });
    cabinet(kit, PALETTE, [41.4, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitBlue", seed: 22 });
    wallScreen(kit, [39.6, 43.3, IZ0 + 0.1], 0, 1.6, 0.9, "screenImp0");
    scoreBoard(kit, [37.6, 43.2, IZ0], 0, 1.6, 1.1, 601, { rows: 4 });
    scoreBoard(kit, [41.5, 43.2, IZ0], 0, 1.6, 1.1, 602, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });

    // ---- forward-starboard corner: exercise corner ---------------------------------------------------------
    lockerBank(kit, PALETTE, [55.4, Y, IZ0 + 0.27], 0, { count: 4, unit: 0.6, h: 2.0, d: 0.5, color: MID });
    exerciseRack(kit, IX1 - 0.44, Y, 347.1, -Math.PI / 2, { w: 1.6, h: 2.2, d: 0.8 });
    mat(kit, 55.4, Y, 347.6, 1.0, 2.0, MID);
    mat(kit, 57.0, Y, 347.9, 1.0, 2.0, GREY);
    gearCrate(kit, [58.6, Y, 344.94], 0, { color: DARK, tab: "emitAmber" });
    gearCrate(kit, [58.6, Y + 1.2, 344.94], 0.1, { w: 0.8, h: 0.5, d: 0.8, color: GREY });
    zoneRect(kit, 53.9, IZ0 + 0.6, IX1 - 0.3, 350.4, Y, "emitAmber");
    wallScreen(kit, [IX1 - 0.1, 43.3, 348.3], -Math.PI / 2, 1.6, 0.9, "screenImp1");
    scoreBoard(kit, [55.4, 43.2, IZ0], 0, 2.4, 1.1, 603, { rows: 4 });

    // ---- media wall (port wall) with two bench rows, the rear one on a 0.2 m platform -----------------------
    mediaWall(kit, [IX0 + 0.02, Y + 0.4, 357.0], Math.PI / 2, (pos, yaw, w, h, m) => wallScreen(kit, pos, yaw, w, h, m));
    kit.collider([IX0, Y, 354.1], [IX0 + 0.55, Y + 4.2, 359.9], "media-wall");
    benchSeat(kit, [38.7, Y, 357.0], -Math.PI / 2, 4.4, { color: MID, cushion: DARK });
    kit.boxMM("paintedMetal", [39.9, Y, 354.3], [41.5, Y + 0.18, 359.7], { color: DARK, texel: 1 });
    kit.boxMM("impFloor", [39.9, Y + 0.18, 354.3], [41.5, Y + 0.2, 359.7], { color: MID, texel: 0.5 });
    kit.boxMM("emitWhite", [39.885, Y + 0.16, 354.4], [39.9, Y + 0.18, 359.6]);
    kit.collider([39.9, Y, 354.3], [41.5, Y + 0.2, 359.7], "platform");
    benchSeat(kit, [40.7, Y + 0.2, 357.0], -Math.PI / 2, 4.4, { color: MID, cushion: DARK });
    lowTable(kit, 38.7, Y, 354.0, 0.7, 0.7);
    lowTable(kit, 38.7, Y, 360.0, 0.7, 0.7);
    rail(kit, PALETTE, [41.9, Y, 354.4], [41.9, Y, 359.6], Y, { h: 1.02, post: 1.7 });
    floorLine(kit, [IX0 + 0.3, Y, 353.6], [42.2, Y, 353.6], 0.08, "paintedMetal", IMP.impWhite);
    floorLine(kit, [IX0 + 0.3, Y, 360.4], [42.2, Y, 360.4], 0.08, "paintedMetal", IMP.impWhite);

    // ---- holo-game tables (centre) around a four-sided info column ---------------------------------------------
    const tables = [[44.2, 354.0], [51.8, 354.0], [44.2, 360.2], [51.8, 360.2]];
    tables.forEach(([x, z], i) => gameTable(kit, x, Y, z, 300 + i));
    infoColumn(kit, 48.0, Y, 357.1, (pos, yaw, w, h, m) => wallScreen(kit, pos, yaw, w, h, m));
    standTable(kit, 45.0, Y, 350.6);
    standTable(kit, 51.0, Y, 350.6);
    // central walkway lines (painted), split around the column
    for (const x of [46.6, 49.4]) {
      floorLine(kit, [x, Y, 349.4], [x, Y, 356.0], 0.08, "paintedMetal", IMP.impWhite);
      floorLine(kit, [x, Y, 358.2], [x, Y, 366.1], 0.08, "paintedMetal", IMP.impWhite);
    }
    // lit obelisks flanking the entry (outside the 1 m door approach)
    lightObelisk(kit, 44.4, Y, 369.6);
    lightObelisk(kit, 51.6, Y, 369.6);
    // entry zone: darker painted floor panel with a light border (ends 1 m short of the door hole)
    kit.boxMM("paintedMetal", [42.4, Y, 366.2], [53.6, Y + 0.006, IZ1 - 1.0], { color: DARK, texel: 1 });
    zoneRect(kit, 42.4, 366.2, 53.6, IZ1 - 1.0, Y + 0.002, "paintedMetal", IMP.impWhite, 0.06);
    // double-sided hanging sign over the walkway
    for (const dx of [-0.6, 0.6]) kit.box("paintedMetal", 48 + dx, CEIL - 0.06 - 0.45, 366.5, 0.04, 0.9, 0.04, { color: BLACK });
    kit.box("paintedMetal", 48, CEIL - 1.16, 366.5, 1.8, 0.5, 0.08, { color: BLACK, texel: 1 });
    for (const s of [-1, 1]) {
      kit.box("darkGloss", 48, CEIL - 1.16, 366.5 + s * 0.045, 1.7, 0.42, 0.01);
      kit.box("emitAmber", 48, CEIL - 1.0, 366.5 + s * 0.052, 1.5, 0.03, 0.006);
      kit.box("emitBlue", 48 - 0.45, CEIL - 1.18, 366.5 + s * 0.052, 0.6, 0.12, 0.006);
      kit.box("emitBlue", 48 + 0.35, CEIL - 1.18, 366.5 + s * 0.052, 0.3, 0.12, 0.006);
      kit.box("emitAmber", 48 + 0.65, CEIL - 1.18, 366.5 + s * 0.052, 0.12, 0.12, 0.006);
    }

    // ---- lounge clusters flanking the entry --------------------------------------------------------------------
    for (const [cx, screenX, yawOpen] of [[39.8, IX0, 1], [56.2, IX1, -1]]) {
      lowTable(kit, cx, Y, 365.6, 1.6, 0.9);
      benchSeat(kit, [cx, Y, 364.15], 0, 2.4, { color: GREY, cushion: DARK });
      benchSeat(kit, [cx, Y, 367.05], Math.PI, 2.4, { color: GREY, cushion: DARK });
      // side bench on the room side, facing the wall screen
      benchSeat(kit, [cx + yawOpen * 1.65, Y, 365.6], yawOpen > 0 ? -Math.PI / 2 : Math.PI / 2, 1.6, { color: GREY, cushion: DARK });
      const yaw = yawOpen > 0 ? Math.PI / 2 : -Math.PI / 2;
      wallScreen(kit, [screenX + yawOpen * 0.1, 43.3, 365.6], yaw, 2.4, 1.35, yawOpen > 0 ? "screenImp1" : "screenImp0");
      scoreBoard(kit, [screenX, 41.3, 365.6], yaw, 2.4, 0.9, 610 + cx, { rows: 3, accent: yawOpen > 0 ? "emitBlue" : "emitAmber", secondary: yawOpen > 0 ? "emitAmber" : "emitBlue" });
    }

    // ---- starboard wall between gym and lounge: vending cabinets, leaderboard, screens ---------------------------
    cabinet(kit, PALETTE, [IX1 - 0.32, Y, 352.6], -Math.PI / 2, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 23 });
    cabinet(kit, PALETTE, [IX1 - 0.32, Y, 354.0], -Math.PI / 2, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitBlue", seed: 24 });
    wallScreen(kit, [IX1 - 0.1, 43.3, 353.3], -Math.PI / 2, 2.4, 1.0, "screenImp0");
    scoreBoard(kit, [IX1, 42.9, 357.8], -Math.PI / 2, 3.0, 1.4, 620, { rows: 6 });
    wallScreen(kit, [IX1 - 0.1, 43.3, 361.0], -Math.PI / 2, 1.6, 0.9, "screenImp1");
    consoleProp(kit, PALETTE, [IX1 - 0.47, Y, 361.0], -Math.PI / 2, { w: 1.6, d: 0.9, h: 1.15, screens: 1, seed: 71, screenMat: "screenImp0" });

    // ---- aft wall either side of the door (hole x 46.8..49.2; 1 m approach kept clear) -----------------------------
    cabinet(kit, PALETTE, [38.2, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 25 });
    cabinet(kit, PALETTE, [39.6, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitBlue", seed: 26 });
    wallScreen(kit, [38.9, 43.3, IZ1 - 0.1], Math.PI, 2.4, 1.0, "screenImp1");
    consoleProp(kit, PALETTE, [43.2, Y, IZ1 - 0.47], Math.PI, { w: 1.6, d: 0.9, h: 1.15, screens: 1, seed: 72, screenMat: "screenImp1" });
    scoreBoard(kit, [43.2, 43.2, IZ1], Math.PI, 2.0, 1.1, 630, { rows: 4 });
    doorPanel(kit, [45.6, 41.3, IZ1], Math.PI);
    doorPanel(kit, [50.4, 41.3, IZ1], Math.PI, { lit: "emitAmber" });
    cabinet(kit, PALETTE, [52.2, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitRedImp", seed: 27 });
    cabinet(kit, PALETTE, [53.6, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 28 });
    wallScreen(kit, [52.9, 43.3, IZ1 - 0.1], Math.PI, 2.4, 1.0, "screenImp0");
    gearCrate(kit, [58.4, Y, 371.3], 0.15, { color: MID });
    gearCrate(kit, [58.4, Y + 1.2, 371.3], -0.1, { w: 0.9, h: 0.6, d: 0.9, color: DARK, tab: "emitAmber" });
    scoreBoard(kit, [57.4, 43.2, IZ1], Math.PI, 2.4, 1.1, 631, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });

    // ---- drop lights -----------------------------------------------------------------------------------------------
    for (const x of [45.4, 50.6]) dropLight(kit, PALETTE, [x, CEIL - 0.06, 346.05], { w: 3.2, d: 0.4, stem: 0.7, mat: "emitWarmSoft" });
    for (const [x, z] of tables) dropLight(kit, PALETTE, [x, CEIL - 0.06, z], { w: 1.0, d: 1.0, stem: 0.5, mat: "emitWarmSoft" });
    for (const x of [39.8, 56.2]) dropLight(kit, PALETTE, [x, CEIL - 0.06, 365.6], { w: 1.4, d: 0.6, stem: 0.6, mat: "emitWarmSoft" });

    // ---- lights ------------------------------------------------------------------------------------------------------
    const L = (pos, color, intensity, distance, priority = 0.5) => ctx.lights.push({ type: "point", pos, color, intensity, distance, priority });
    L([45.4, 44.0, 346.6], 0xffd2a0, 22, 9, 0.7);
    L([50.6, 44.0, 346.6], 0xffd2a0, 22, 9, 0.7);
    for (const [x, z] of tables) L([x, 44.2, z], 0xffe0c0, 14, 6.5);
    L([39.8, 44.2, 365.6], 0xffe0c0, 16, 7);
    L([56.2, 44.2, 365.6], 0xffe0c0, 16, 7);
    L([38.6, 43.6, 357.0], 0x9ab8ff, 14, 7, 0.4);
    L([57.0, 44.3, 347.4], 0xe8f0ff, 16, 7, 0.4);
    L([48.0, 44.3, 369.4], 0xffe0bd, 18, 8, 0.6);
    return {};
  },
});
