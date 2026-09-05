// Deck 2 recreation lounge: a dispenser bar with back-bar shelving along the forward wall, a tight
// cluster of four round holo-game tables in the centre, two lounge clusters flanking the entry, a 2x2
// media wall with tiered bench rows, an exercise corner with a rack, mats and lockers, a hydration
// station, vending cabinets, an info kiosk, and housed drop-light fixtures over every zone. Neutral
// grey with warm white/amber accents (§11 crew areas).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { console as consoleProp, wallScreen, lockerBank, tank, cabinet, dropLight, floorLine } from "../_shared/props.js";
import { stool, gameTable, benchSeat, lowTable, bottleRow, dispenser, exerciseRack, mat, mediaWall, scoreBoard, gearCrate, zoneRect, infoColumn, standTable, lightObelisk, tapCluster, cup, tray, barTerminal, lightChannel, uplight, ventGrille, junctionBox, sconce } from "./props.js";
import { screenOverlay, stepHash, refreshCurve } from "../briefing/props.js";

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
    "d2-rec-door": { pos: [48, Y, 365.0], yaw: 0, pitch: -5 },
    "d2-rec-bar": { pos: [52.2, Y, 350.0], yaw: 30, pitch: -2 },
    "d2-rec-tables": { pos: [43.0, Y, 363.9], yaw: -40, pitch: -4 },
    "d2-rec-lounge": { pos: [43.4, Y, 369.0], yaw: 48, pitch: -4 },
  },
  shell: {
    panelW: 1.6,
    wallColor: IMP.impGrey,
    wallAlt: IMP.impWhite,
    floor: { color: IMP.impMid },
    // the wall strip band in the room's amber (the white emitter was a 17th material key once the
    // animated overlay mesh took a draw call; amber matches the bar, sofa and obelisk strips)
    stripMat: "emitAmber",
    // own ceiling below: the pendant fills light the ceiling from 1.8 m, and the shell's painted panel
    // map shows its smudges as dirt patches around every fixture
    ceiling: false,
    lights: false,
    doorDressing: { accent: "emitBlue" },
    // tray + pipe runs at 3.5 m on the walls that have nothing tall (the bar canopy and media wall own n/w)
    serviceBand: { y: 3.5, faces: ["e", "s"] },
  },
  detail(ctx, shell, room) {
    const { kit, PALETTE } = ctx;
    // quads for the brightness overlay (one multiply-blended mesh over every animated emitter), composed
    // at the end in this order: 0-3 media wall screens, 4 menu screen, 5-12 menu chase segments,
    // 13 lounge sconce diffuser, 14.. game-table grid cells
    const mediaQuads = [];
    const menuQuads = [];
    const gridCells = [];

    // ---- dispenser bar along the forward wall (x 42.6..53.4) -------------------------------------------
    const BX0 = 42.6;
    const BX1 = 53.4;
    const bz = IZ0 + 0.02;
    // back-bar: lower cabinet with doors, worktop, lit shelving bays, header canopy
    kit.boxMM("paintedMetal", [BX0, Y, bz], [BX1, Y + 0.95, bz + 0.55], { color: DARK, texel: 2.5 });
    kit.boxMM("paintedMetal", [BX0, Y, bz], [BX1, Y + 0.1, bz + 0.5], { color: BLACK });
    kit.boxMM("paintedMetal", [BX0, Y + 0.95, bz], [BX1, Y + 1.0, bz + 0.6], { color: BLACK, texel: 2.5 });
    kit.boxMM("paintedMetal", [BX0, Y + 1.0, bz], [BX1, Y + 2.4, bz + 0.05], { color: BLACK, texel: 2.5 }); // shelving back
    kit.boxMM("paintedMetal", [BX0, Y + 2.4, bz], [BX1, Y + 2.7, bz + 0.7], { color: DARK, texel: 2.5 }); // canopy
    kit.boxMM("emitWarmSoft", [BX0 + 0.2, Y + 2.385, bz + 0.2], [BX1 - 0.2, Y + 2.405, bz + 0.6], { uv: "keep" });
    kit.boxMM("paintedMetal", [BX0, Y + 2.7, bz], [BX1, Y + 2.76, bz + 0.74], { color: MID });
    const nBays = 6;
    const bayW = (BX1 - BX0) / nBays;
    // per-bay stock: [upper, lower] bottle counts; bay 2 is nearly empty (one bottle knocked over),
    // bay 4 carries the lit menu board instead of shelving
    const stock = [[7, 6], [5, 8], [0, 2], [8, 3], null, [4, 7]];
    for (let i = 0; i <= nBays; i++) {
      const x = BX0 + i * bayW;
      kit.boxMM("paintedMetal", [x - 0.03, Y + 1.0, bz + 0.05], [x + 0.03, Y + 2.4, bz + 0.45], { color: DARK });
      if (i < nBays) {
        // lower doors with handles
        kit.boxMM("paintedMetal", [x + 0.05, Y + 0.12, bz + 0.55], [x + bayW - 0.05, Y + 0.92, bz + 0.565], { color: MID, texel: 2.5 });
        kit.box("metal", x + bayW - 0.15, Y + 0.55, bz + 0.58, 0.02, 0.18, 0.02, { color: IMP.steel });
        // shelves with amber under-shelf strips
        [1.45, 1.95].forEach((sy, k) => {
          kit.boxMM("paintedMetal", [x + 0.03, Y + sy, bz + 0.05], [x + bayW - 0.03, Y + sy + 0.03, bz + 0.42], { color: DARK });
          kit.boxMM("emitAmber", [x + 0.1, Y + sy - 0.012, bz + 0.3], [x + bayW - 0.1, Y + sy, bz + 0.34]);
          if (stock[i]) bottleRow(kit, x + bayW / 2, Y + sy + 0.03, bz + 0.24, bayW - 0.3, 700 + i * 10 + sy * 7, stock[i][1 - k], { slots: 7, fallen: i === 2 && k === 1 });
        });
        // back-lit panel behind each bay
        kit.boxMM("emitAmber", [x + 0.1, Y + 1.05, bz + 0.05], [x + bayW - 0.1, Y + 1.09, bz + 0.056]);
        if (!stock[i]) {
          // menu board: framed text screen with an amber header, a label plate underneath carrying an
          // eight-segment amber "order ready" chase (animated through the overlay), a serving tray on
          // the worktop
          const mx = x + bayW / 2;
          kit.boxMM("paintedMetal", [x + 0.06, Y + 1.32, bz + 0.44], [x + bayW - 0.06, Y + 2.34, bz + 0.48], { color: MID, texel: 2.5 });
          kit.boxMM("darkGloss", [x + 0.1, Y + 1.36, bz + 0.48], [x + bayW - 0.1, Y + 2.3, bz + 0.488]);
          kit.boxMM("screenImp2", [x + 0.14, Y + 1.4, bz + 0.488], [x + bayW - 0.14, Y + 2.18, bz + 0.494], { uv: "keep" });
          menuQuads.push({ pos: [mx, Y + 1.79, bz + 0.5], yaw: 0, w: bayW - 0.32, h: 0.74 });
          kit.boxMM("emitAmber", [x + 0.14, Y + 2.2, bz + 0.488], [x + bayW - 0.14, Y + 2.25, bz + 0.494]);
          kit.boxMM("paintedMetal", [x + 0.2, Y + 1.1, bz + 0.44], [x + bayW - 0.2, Y + 1.28, bz + 0.47], { color: BLACK });
          const segW = (bayW - 0.52) / 8;
          for (let k = 0; k < 8; k++) {
            const sx = x + 0.26 + k * segW;
            kit.boxMM("emitAmber", [sx + 0.02, Y + 1.165, bz + 0.47], [sx + segW - 0.02, Y + 1.215, bz + 0.476]);
            menuQuads.push({ pos: [sx + segW / 2, Y + 1.19, bz + 0.48], yaw: 0, w: segW - 0.03, h: 0.06 });
          }
          tray(kit, mx, Y + 1.0, bz + 0.25, 0.2, 14);
        } else if (i % 2 === 0) bottleRow(kit, x + bayW / 2, Y + 1.0, bz + 0.3, bayW - 0.4, 800 + i, i === 2 ? 3 : 8, { slots: 8 });
        else dispenser(kit, x + bayW / 2, Y + 1.0, bz + 0.32, 900 + i);
      }
    }
    // uplights on the canopy top throw the bar-back fill onto the ceiling and the sign band
    for (const x of [46.0, 50.0]) uplight(kit, x, Y + 2.76, bz + 0.37, 0.7);
    // bar sign band above the canopy
    kit.boxMM("darkGloss", [BX0 + 1.4, Y + 3.15, bz], [BX1 - 1.4, Y + 3.45, bz + 0.04]);
    kit.boxMM("emitAmber", [BX0 + 1.6, Y + 3.27, bz + 0.04], [BX1 - 1.6, Y + 3.33, bz + 0.052]);
    for (let i = 0; i < 8; i++) kit.boxMM(i % 2 ? "emitAmber" : "emitBlue", [BX0 + 1.7 + i * 0.95, Y + 3.19, bz + 0.04], [BX0 + 2.3 + i * 0.95, Y + 3.22, bz + 0.05]);
    kit.collider([BX0, Y, IZ0], [BX1, Y + 2.76, bz + 0.74], "back-bar");
    // front counter: black body, toe-kick, grey top with overhang, ribbed customer face, amber strips
    const CZ0 = 345.75;
    const CZ1 = 346.45;
    kit.boxMM("paintedMetal", [BX0, Y + 0.1, CZ0], [BX1, Y + 0.84, CZ1], { color: BLACK, texel: 2.5 });
    kit.boxMM("paintedMetal", [BX0 + 0.05, Y, CZ0 + 0.05], [BX1 - 0.05, Y + 0.1, CZ1 - 0.06], { color: BLACK });
    kit.boxMM("paintedMetal", [BX0 - 0.05, Y + 0.84, CZ0 - 0.05], [BX1 + 0.05, Y + 0.9, CZ1 + 0.12], { color: GREY, texel: 2.5 });
    kit.boxMM("darkGloss", [BX0 + 0.3, Y + 0.9, CZ0 + 0.05], [BX1 - 0.3, Y + 0.906, CZ1 - 0.15]);
    kit.boxMM("paintedMetal", [BX0, Y + 0.16, CZ1], [BX1, Y + 0.8, CZ1 + 0.02], { color: MID, texel: 2.5 });
    for (let x = BX0 + 0.45; x < BX1; x += 0.9) kit.boxMM("paintedMetal", [x - 0.03, Y + 0.12, CZ1], [x + 0.03, Y + 0.84, CZ1 + 0.035], { color: DARK });
    kit.boxMM("emitAmber", [BX0 + 0.2, Y + 0.13, CZ1 - 0.02], [BX1 - 0.2, Y + 0.15, CZ1 + 0.01]);
    kit.boxMM("emitAmber", [BX0 + 0.2, Y + 0.835, CZ1 + 0.05], [BX1 - 0.2, Y + 0.845, CZ1 + 0.1]);
    for (const x of [BX0, BX1 - 0.06]) kit.boxMM("paintedMetal", [x, Y, bz + 0.55], [x + 0.06, Y + 0.9, CZ0], { color: DARK, texel: 2.5 }); // end panels
    kit.collider([BX0 - 0.05, Y, bz + 0.55], [BX1 + 0.05, Y + 0.9, CZ1 + 0.12], "bar");
    // bar top: two tap clusters, trays with cups, loose cups, an order terminal
    const TOP = Y + 0.906;
    tapCluster(kit, 45.2, TOP, 346.05);
    tapCluster(kit, 50.8, TOP, 346.05);
    tray(kit, 43.6, TOP, 346.05, 0.2, 11);
    tray(kit, 48.1, TOP, 346.0, -0.15, 12);
    tray(kit, 52.3, TOP, 346.08, 0.35, 13);
    cup(kit, 46.55, TOP, 346.2);
    cup(kit, 46.8, TOP, 346.02, 0.03, 0.08);
    cup(kit, 49.35, TOP, 346.22);
    cup(kit, 51.75, TOP, 346.15, 0.032, 0.1);
    barTerminal(kit, 47.3, TOP, 345.95, 0, "screenImp2");
    // six bar stools: foot rings on all, two with back hoops, one pulled out, cushions vary
    const barStools = [[44.0, 347.3, 1, DARK], [45.6, 347.3, 2, MID], [47.2, 347.3, 1, 0x4a3038], [48.8, 347.62, 1, DARK], [50.4, 347.3, 2, MID], [52.0, 347.3, 1, DARK]];
    barStools.forEach(([x, z, variant, cushion], i) => stool(kit, x, Y, z, { h: 0.72, r: 0.2, variant, cushion, yaw: i === 3 ? 0.5 : 0 }));
    // bar zone floor line
    floorLine(kit, [BX0 - 0.3, Y, 348.3], [BX1 + 0.3, Y, 348.3], 0.08, "paintedMetal", IMP.impWhite);

    // ---- forward-port corner: hydration station + vending cabinets + screen ------------------------------
    tank(kit, PALETTE, [39.6, Y, 345.6], 0, { r: 0.4, h: 1.6, color: IMP.impWhite, bands: 2, emit: "emitBlue" });
    cabinet(kit, PALETTE, [37.5, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 21 });
    cabinet(kit, PALETTE, [41.4, Y, IZ0 + 0.32], 0, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitBlue", seed: 22 });
    wallScreen(kit, [39.6, 42.65, IZ0 + 0.1], 0, 1.6, 0.9, "screenImp3");
    scoreBoard(kit, [37.6, 42.75, IZ0], 0, 1.6, 1.1, 601, { rows: 4 });
    scoreBoard(kit, [41.5, 42.75, IZ0], 0, 1.6, 1.1, 602, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });

    // ---- forward-starboard corner: exercise corner ---------------------------------------------------------
    lockerBank(kit, PALETTE, [55.4, Y, IZ0 + 0.27], 0, { count: 4, unit: 0.6, h: 2.0, d: 0.5, color: MID });
    exerciseRack(kit, IX1 - 0.44, Y, 347.1, -Math.PI / 2, { w: 1.6, h: 2.2, d: 0.8 });
    mat(kit, 55.4, Y, 347.6, 1.0, 2.0, MID);
    mat(kit, 57.0, Y, 347.9, 1.0, 2.0, GREY);
    gearCrate(kit, [58.6, Y, 344.94], 0, { color: DARK, tab: "emitAmber" });
    gearCrate(kit, [58.6, Y + 1.2, 344.94], 0.1, { w: 0.8, h: 0.5, d: 0.8, color: GREY });
    zoneRect(kit, 53.9, IZ0 + 0.6, IX1 - 0.3, 350.4, Y, "emitAmber");
    wallScreen(kit, [IX1 - 0.1, 42.0, 349.4], -Math.PI / 2, 1.6, 0.9, "screenImp1");
    scoreBoard(kit, [55.4, 42.75, IZ0], 0, 2.4, 1.1, 603, { rows: 4 });

    // ---- media wall (port wall) with two bench rows, the rear one on a 0.2 m platform -----------------------
    mediaWall(kit, [IX0 + 0.02, Y + 0.35, 357.0], Math.PI / 2, (pos, yaw, w, h, m) => {
      wallScreen(kit, pos, yaw, w, h, m);
      // overlay quad 6 mm in front of the screen face (wallScreen puts the face 17 mm ahead of pos)
      mediaQuads.push({ pos: [pos[0] + Math.sin(yaw) * 0.023, pos[1], pos[2] + Math.cos(yaw) * 0.023], yaw, w: w - 0.04, h: h - 0.04 });
    });
    kit.collider([IX0, Y, 354.1], [IX0 + 0.55, Y + 4.2, 359.9], "media-wall");
    benchSeat(kit, [38.7, Y, 357.0], -Math.PI / 2, 4.4, { color: MID });
    kit.boxMM("paintedMetal", [39.9, Y, 354.3], [41.5, Y + 0.18, 359.7], { color: DARK, texel: 2.5 });
    kit.boxMM("paintedMetal", [39.9, Y + 0.18, 354.3], [41.5, Y + 0.2, 359.7], { color: MID, texel: 2.5 });
    kit.boxMM("emitAmber", [39.885, Y + 0.16, 354.4], [39.9, Y + 0.18, 359.6]);
    kit.collider([39.9, Y, 354.3], [41.5, Y + 0.2, 359.7], "platform");
    benchSeat(kit, [40.7, Y + 0.2, 357.0], -Math.PI / 2, 4.4, { color: MID });
    lowTable(kit, 38.7, Y, 354.0, 0.7, 0.7);
    lowTable(kit, 38.7, Y, 360.0, 0.7, 0.7);
    floorLine(kit, [IX0 + 0.3, Y, 353.6], [42.2, Y, 353.6], 0.08, "paintedMetal", IMP.impWhite);
    floorLine(kit, [IX0 + 0.3, Y, 360.4], [42.2, Y, 360.4], 0.08, "paintedMetal", IMP.impWhite);

    // ---- holo-game tables: a tight 2x2 cluster (3.4 m pitch) inside a painted zone, brought aft so the
    //      near pair and their stools stand 3-4 m in front of the door view ---------------------------------
    const tables = [[46.3, 357.8], [49.7, 357.8], [46.3, 361.2], [49.7, 361.2]];
    // tables 0+1 (forward row) and 2+3 (aft row) form the two pairs whose grids charge together
    tables.forEach(([x, z], i) => {
      for (const c of gameTable(kit, x, Y, z, 300 + i).cells) gridCells.push({ ...c, pair: i >> 1 });
    });
    zoneRect(kit, 44.3, 355.8, 51.7, 363.2, Y, "paintedMetal", IMP.impWhite, 0.06);
    standTable(kit, 45.0, Y, 350.6);
    standTable(kit, 51.0, Y, 350.6);
    // info kiosk between the games zone and the starboard lounge, off the door axis
    infoColumn(kit, 52.8, Y, 363.8, (pos, yaw, w, h, m) => wallScreen(kit, pos, yaw, w, h, m));
    // walkway lines from the entry to the games zone
    for (const x of [46.6, 49.4]) floorLine(kit, [x, Y, 363.6], [x, Y, 367.6], 0.08, "paintedMetal", IMP.impWhite);
    // lit obelisks flanking the entry (outside the 1 m door approach)
    lightObelisk(kit, 44.4, Y, 369.6);
    lightObelisk(kit, 51.6, Y, 369.6);

    // ---- lounge clusters flanking the entry --------------------------------------------------------------------
    for (const [cx, screenX, yawOpen] of [[39.8, IX0, 1], [56.2, IX1, -1]]) {
      lowTable(kit, cx, Y, 365.6, 1.6, 0.9);
      benchSeat(kit, [cx, Y, 364.15], 0, 2.4, { color: MID });
      benchSeat(kit, [cx, Y, 367.05], Math.PI, 2.4, { color: MID });
      // side sofa on the room side, facing the wall screen
      benchSeat(kit, [cx + yawOpen * 1.7, Y, 365.6], yawOpen > 0 ? -Math.PI / 2 : Math.PI / 2, 1.6, { color: MID });
      const yaw = yawOpen > 0 ? Math.PI / 2 : -Math.PI / 2;
      wallScreen(kit, [screenX + yawOpen * 0.1, 42.0, 365.6], yaw, 2.4, 1.35, yawOpen > 0 ? "screenImp1" : "screenImp0");
      scoreBoard(kit, [screenX, 42.0, 362.9], yaw, 1.4, 0.9, 610 + cx, { rows: 3, accent: yawOpen > 0 ? "emitBlue" : "emitAmber", secondary: yawOpen > 0 ? "emitAmber" : "emitBlue" });
      // lounge zone marked on the deck
      const zx0 = yawOpen > 0 ? IX0 + 0.3 : cx - 2.15;
      const zx1 = yawOpen > 0 ? cx + 2.15 : IX1 - 0.3;
      zoneRect(kit, zx0, 363.3, zx1, 367.9, Y, "paintedMetal", IMP.impWhite, 0.06);
      // equipment cabinet between the lounge screen and the aft corner
      cabinet(kit, PALETTE, [screenX + yawOpen * 0.32, Y, 369.9], yaw, { w: 1.2, h: 1.8, d: 0.6, color: DARK, emit: yawOpen > 0 ? "emitAmber" : "emitBlue", seed: 29 + cx });
    }
    // wall sconces between the lounge screens and the aft cabinets; the port one houses the slowly
    // dimming lounge light (see update), the starboard one is a steady twin
    const sconceQuad = sconce(kit, [IX0, 42.4, 368.0], Math.PI / 2);
    sconce(kit, [IX1, 42.4, 368.0], -Math.PI / 2);
    // port wall 2.9-3.4 m over the lounge (the shell's service band stops at the media wall): vents +
    // junction boxes, like the starboard wall
    for (const z of [364.4, 367.0]) ventGrille(kit, [IX0, 43.15, z], Math.PI / 2, 0.9, 0.45);
    for (const z of [362.6, 369.9]) junctionBox(kit, [IX0, 43.1, z], Math.PI / 2, { w: 0.34, h: 0.4, conduitUp: 0.3 });

    // ---- starboard wall between gym and lounge: vending cabinets, leaderboard, screens ---------------------------
    cabinet(kit, PALETTE, [IX1 - 0.32, Y, 352.6], -Math.PI / 2, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 23 });
    cabinet(kit, PALETTE, [IX1 - 0.32, Y, 354.0], -Math.PI / 2, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitBlue", seed: 24 });
    wallScreen(kit, [IX1 - 0.1, 42.75, 353.3], -Math.PI / 2, 2.4, 1.0, "screenImp2");
    scoreBoard(kit, [IX1, 42.15, 357.6], -Math.PI / 2, 3.0, 1.4, 620, { rows: 6 });
    wallScreen(kit, [IX1 - 0.1, 42.0, 361.0], -Math.PI / 2, 1.6, 0.9, "screenImp3");
    consoleProp(kit, PALETTE, [IX1 - 0.47, Y, 361.0], -Math.PI / 2, { w: 1.6, d: 0.9, h: 1.15, screens: 1, seed: 71, screenMat: "screenImp0" });
    // starboard wall 2.9-3.4 m, between the screens and the shell's service tray: vents + junction boxes
    for (const z of [357.6, 361.0, 365.6, 369.9]) ventGrille(kit, [IX1, 43.15, z], -Math.PI / 2, 0.9, 0.45);
    for (const z of [359.3, 363.4, 367.8]) junctionBox(kit, [IX1, 43.1, z], -Math.PI / 2, { w: 0.34, h: 0.4, conduitUp: 0.19 });

    // ---- aft wall either side of the door (hole x 46.8..49.2; the shell dresses the door itself) ---------------
    cabinet(kit, PALETTE, [38.2, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 25 });
    cabinet(kit, PALETTE, [39.6, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitBlue", seed: 26 });
    wallScreen(kit, [38.9, 42.75, IZ1 - 0.1], Math.PI, 2.4, 1.0, "screenImp1");
    consoleProp(kit, PALETTE, [43.2, Y, IZ1 - 0.47], Math.PI, { w: 1.6, d: 0.9, h: 1.15, screens: 1, seed: 72, screenMat: "screenImp1" });
    scoreBoard(kit, [43.2, 42.15, IZ1], Math.PI, 2.0, 1.1, 630, { rows: 4 });
    cabinet(kit, PALETTE, [52.2, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: DARK, emit: "emitRedImp", seed: 27 });
    cabinet(kit, PALETTE, [53.6, Y, IZ1 - 0.32], Math.PI, { w: 1.2, h: 2.0, d: 0.6, color: MID, emit: "emitAmber", seed: 28 });
    wallScreen(kit, [52.9, 42.75, IZ1 - 0.1], Math.PI, 2.4, 1.0, "screenImp0");
    gearCrate(kit, [58.4, Y, 371.3], 0.15, { color: MID });
    gearCrate(kit, [58.4, Y + 1.2, 371.3], -0.1, { w: 0.9, h: 0.6, d: 0.9, color: DARK, tab: "emitAmber" });
    scoreBoard(kit, [56.6, 42.15, IZ1], Math.PI, 2.4, 1.1, 631, { rows: 4, accent: "emitBlue", secondary: "emitAmber" });

    // ---- ceiling: dark plated slab (texel 4 keeps the worn-metal map sub-pixel, so no speckle under the
    //      fixtures) with a 2 m seam grid and six recessed warm light channels ---------------------------------
    kit.boxMM("paintedMetal", [room.bounds.min[0], CEIL, room.bounds.min[2]], [room.bounds.max[0], CEIL + 0.5, room.bounds.max[2]], { color: DARK, texel: 4 });
    const CHANNELS = [346.6, 351.3, 355.9, 360.6, 365.2, 369.9];
    for (let x = IX0 + 2.0; x < IX1 - 0.5; x += 2.0) kit.boxMM("paintedMetal", [x - 0.015, CEIL - 0.012, IZ0], [x + 0.015, CEIL, IZ1], { color: MID });
    for (let z = IZ0 + 2.0; z < IZ1 - 0.5; z += 2.0) {
      if (CHANNELS.some((c) => Math.abs(c - z) < 0.5)) continue;
      kit.boxMM("paintedMetal", [IX0, CEIL - 0.012, z - 0.015], [IX1, CEIL, z + 0.015], { color: MID });
    }
    for (const z of CHANNELS) lightChannel(kit, IX0 + 0.4, IX1 - 0.4, z, CEIL);

    // ---- housed fixtures: one suspended drop light per fill, diffusers 1.1 m below the ceiling -------------------
    const FIX = CEIL - 0.06;
    // KEY (shadow): one 7.4 m bar fixture over the counter's front edge on three stems; the warm spot
    // hangs 0.4 m under its diffuser and points straight down, so the stools throw their shadows aft
    // and outward across the floor toward the room, the tap towers and trays onto the counter top, and
    // the customer face of the counter is lit rather than just the top. Everything else is a fill at
    // <= 40 % of it, a coloured practical, or the bar-back uplight wash. The fixture mirrors dropLight's
    // section (housing 1.2 m down on stems, diffusers 5 mm under it) with three diffuser segments so the
    // centre-bright diffuser map reads as three lamps rather than one 7 m blob.
    for (const x of [45.4, 48.0, 50.6]) kit.box("paintedMetal", x, FIX - 0.6, 347.0, 0.06, 1.2, 0.06, { color: BLACK });
    kit.box("paintedMetal", 48.0, FIX - 1.26, 347.0, 7.4, 0.12, 0.45, { color: DARK, texel: 2.5 });
    for (const x of [45.6, 48.0, 50.4]) kit.box("emitWarmSoft", x, FIX - 1.325, 347.0, 2.28, 0.02, 0.33, { uv: "keep" });
    const key = { type: "spot", pos: [48.0, 43.2, 347.0], target: [48.0, Y, 347.0], color: 0xffd2a0, intensity: 110, distance: 28, angle: 1.1, penumbra: 0.45, priority: 1.0, shadow: true };
    ctx.lights.push(key);
    // priorities: the rig pools the nearest 12 points of the active rooms by distance / (0.5 + priority)
    // and the corridor's fills 2.5 m behind the aft wall carry priority 1; at less than 1 the far
    // fixtures of this room (media wall, gym) lost their slots to lights the player cannot see
    const fixtures = [
      ...tables.map(([x, z]) => [x, z, 1.2, 1.2, 0xffe0c0, 36, 9, 1.0]),
      [39.8, 365.6, 1.4, 0.6, 0xffe0c0, 40, 10, 1.0],
      [56.2, 365.6, 1.4, 0.6, 0xffe0c0, 40, 10, 1.0],
      [39.6, 357.0, 2.6, 0.5, 0xe6e4f0, 38, 10, 1.0],
      [56.6, 347.8, 1.6, 0.5, 0xf0eee8, 40, 10, 0.8],
      [48.0, 368.6, 2.4, 0.5, 0xffe0bd, 42, 11, 1.0],
    ];
    for (const [x, z, w, d, color, intensity, distance, priority] of fixtures) {
      dropLight(kit, PALETTE, [x, FIX, z], { w, d, stem: 1.2, mat: "emitWarmSoft" });
      // the fill sits 0.4 m under the diffuser, 1.8 m below the ceiling: a warm pool on the floor
      ctx.lights.push({ type: "point", pos: [x, 43.2, z], color, intensity, distance, priority });
    }
    // bar-back uplights (housings on the canopy): one warm wash on the ceiling and sign band over the bar
    ctx.lights.push({ type: "point", pos: [48.0, 43.9, bz + 0.5], color: 0xffd2a0, intensity: 24, distance: 7, priority: 0.6 });
    // blue practicals: one per table pair, 0.7 m over the table tops between the two tables, rising
    // and falling with the pair's grid charge (see update)
    const blueL = [357.8, 361.2].map((z) => {
      const d = { type: "point", pos: [48.0, 41.5, z], color: 0x4fb0ff, intensity: 4, distance: 5.5, priority: 0.8 };
      ctx.lights.push(d);
      return d;
    });
    // the dimming lounge sconce's light, 0.45 m in front of its diffuser (closer or stronger and the
    // wall behind it blows out to a white patch)
    const sconceL = { type: "point", pos: [IX0 + 0.45, 42.4, 368.0], color: 0xffc890, intensity: 5, distance: 5.5, priority: 0.8 };
    ctx.lights.push(sconceL);

    // ---- brightness overlay: media wall flicker, menu refresh + chase, sconce dim, grid charge --------------
    const overlay = screenOverlay([...mediaQuads, ...menuQuads, sconceQuad, ...gridCells]);
    ctx.group.add(overlay.mesh);
    const GRID0 = 4 + menuQuads.length + 1; // first grid cell quad
    const TAU = Math.PI * 2;
    const SC_W = TAU / 14; // 14 s sconce cycle
    const SC_PH = 0.64 - 40 * SC_W; // ~80 % bright at the harness's frozen t = 40
    const fract = (x) => x - Math.floor(x);
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const CHARGE_T = 7; // s per grid charge cycle; the aft pair runs half a cycle behind
    const pairFill = new Float32Array(2);
    const pairFade = new Float32Array(2);

    return {
      update(dt, t) {
        // media wall: staggered 11 s content refresh (dip + ramp) with a faint 12 Hz content jitter
        for (let i = 0; i < 4; i++) overlay.set(i, refreshCurve(fract((t + 2.75 * i + 1.3) / 11)) * (1 + 0.04 * (stepHash(Math.floor(t * 12) + i * 53) - 0.5)));
        // menu screen: a rarer refresh
        overlay.set(4, refreshCurve(fract((t + 4.1) / 13)));
        // menu chase: a bright head with a three-segment tail runs along the eight segments every 2 s
        const head = fract(t / 2) * 8;
        for (let k = 0; k < 8; k++) {
          let d = head - k;
          if (d < 0) d += 8;
          overlay.set(5 + k, d < 1 ? 1.1 : d < 2 ? 0.7 : d < 3 ? 0.4 : 0.15);
        }
        // lounge sconce: dims to 40 % and back over 14 s; its diffuser follows the light
        const dim = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * SC_W + SC_PH));
        sconceL.intensity = 5 * dim;
        overlay.set(GRID0 - 1, 0.3 + 0.7 * dim);
        // game grids: a charge sequence per table pair — rows light in order along +Z (7.5 rows/cycle,
        // so the board is full at 80 %), hold with a shimmer, drop over the last 7 %, repeat; the pair's
        // blue point rises with the number of lit rows and falls with the reset
        for (let p = 0; p < 2; p++) {
          const ph = fract((t + 3.5 * p) / CHARGE_T);
          pairFill[p] = ph < 0.8 ? ph * 7.5 : 6;
          pairFade[p] = ph > 0.93 ? 1 - (ph - 0.93) / 0.07 : 1;
          blueL[p].intensity = 1.5 + 8.5 * (pairFill[p] / 6) * pairFade[p];
        }
        // uncharged cells sit at 12 % (a dark blue, well under the bloom threshold) so the lit rows pop
        const shimmer = 1 + 0.04 * Math.sin(t * 18);
        for (let i = 0; i < gridCells.length; i++) {
          const c = gridCells[i];
          const b = clamp01(pairFill[c.pair] - c.row) * pairFade[c.pair];
          overlay.set(GRID0 + i, (0.12 + 1.0 * b) * (pairFill[c.pair] >= 6 ? shimmer : 1));
        }
      },
    };
  },
});
