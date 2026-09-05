// Deck 2 — Crew Briefing Room (sector d2_briefing).
//
// Three tiered rows of bench seats face the forward (xmax) wall, where a segmented mission display
// sits beside a lectern standing under the backlit wing emblem. Downlights over each row, a cove over
// the display wall, mission boards down the port wall and a refreshment counter aft by the door.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, impConsole, impChair, platform, pipeRun, wallSegment, IMP_STYLES_TECH, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";
import { makeCanvas, toTexture, decalRect } from "../../textures.js";
import { labelAtlas, signPlate, signAt, ventGrille, cableTray, datapad, mug, floorScuffs } from "./tactical.js";

export function buildBriefing(kit, ctx) {
  const [min, max] = ctx.bounds; // [2.4, 0, -11] .. [18, 3.6, -4]
  const H = max[1];
  const cz = (min[2] + max[2]) / 2; // -7.5
  const labels = labelAtlas(ctx, "briefing_labels", [
    "CREW BRIEFING ROOM",
    { text: "MISSION BRIEFING  ·  SECTOR OPERATIONS", accent: "#4a9dff" },
    { text: "SESSION IN PROGRESS", accent: "#ff4136", color: "#ffd9d4" },
    { text: "MISSION BOARD  ·  WING ASSIGNMENTS", accent: "#ffb347", color: "#ffe6c4" },
    { text: "SQUADRON  7  ·  VIGILANCE", accent: "#ffb347", color: "#ffe6c4" },
    "ROW  A          ROW  B          ROW  C",
    { text: "QUIET  ·  BRIEFING IN SESSION", accent: "#ff4136", color: "#ffd9d4" },
  ]);

  // walls carrying flush boards / the display get a style without protruding conduits or greebles
  const flat = { panel: 0.8, vent: 0.1, greeble: 0, strip: 0.1, screen: 0, conduit: 0 };
  roomShell(kit, ctx, {
    ceiling: false,
    walls: { styles: IMP_STYLES_TECH, panelW: 1.3 },
    wall: { zmin: { styles: flat }, xmax: { styles: flat } },
  });
  const boards = sheetAtlas(ctx, "briefing_boards", { dark: true });

  // --- tiers: row A on the deck, rows B and C stepping up 0.15 m each toward the aft wall
  const rowsX = [12.1, 10.4, 8.7];
  const tierZ0 = min[2] + 0.55;
  const tierZ1 = max[2] - 0.55;
  const tiers = [
    { x0: 9.55, x1: 11.25, y: 0.15 },
    { x0: 7.85, x1: 9.55, y: 0.3 },
  ];
  for (const t of tiers) platform(kit, ctx, { x0: t.x0, z0: tierZ0, x1: t.x1, z1: tierZ1, y: t.y, thickness: t.y, edge: false });
  // step nosing on the exposed edges (flat black cap) with a recessed white step light on the riser
  const nose = (x, y, z0, z1, dir) => {
    kit.boxMM("paintedMetal", [x - (dir > 0 ? 0.08 : 0.005), y - 0.012, z0], [x + (dir > 0 ? 0.005 : 0.08), y + 0.006, z1], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("emitWhiteDim", [x + (dir > 0 ? 0 : -0.012), y - 0.1, z0 + 0.1], [x + (dir > 0 ? 0.012 : 0), y - 0.07, z1 - 0.1], { uv: "keep" });
  };
  nose(tiers[0].x1, 0.15, tierZ0, tierZ1, 1);
  nose(tiers[1].x1, 0.3, tierZ0, tierZ1, 1);
  nose(tiers[1].x0, 0.3, tierZ0, tierZ1, -1);
  for (const t of tiers) {
    for (const z of [tierZ0, tierZ1]) kit.boxMM("paintedMetal", [t.x0 - (t === tiers[1] ? 0.05 : 0), t.y - 0.07, z - 0.05], [t.x1 + 0.05, t.y + 0.005, z + 0.05], { color: PALETTE.impBlack, texel: 2 });
  }
  // seats face +x; the 0.94 m pitch leaves a 0.9 m aisle along each side wall. Row A: bench seats
  // with one swung toward the aisle; row B: a briefing desk with four seated stations; row C: bench
  // seats with two turned toward each other and a kit case left hanging on the aisle seat's backrest
  const seatZ = [-2, -1, 0, 1, 2].map((i) => cz + i * 0.94);
  // dim printed stencil for the kit case (one short row, ~256 x 32 px)
  const stencil = labelAtlas(ctx, "briefing_stencil", [{ text: "SQN 7  ·  FIELD KIT", accent: "#ffb347", color: "#cfd4dc" }], { rowH: 32, intensity: 0.45, bg: "#15171b" });
  benchRow(kit, rowsX[0], 0, seatZ, 0, { turns: { 3: -0.35 } });
  deskRow(kit, ctx, rowsX[1] - 0.15, tiers[0].y, seatZ);
  benchRow(kit, rowsX[2], tiers[1].y, seatZ, 2, { turns: { 1: 0.45, 2: -0.4 }, kitCase: 4, stencil });

  // --- forward wall (xmax): segmented mission display, lectern under the backlit emblem
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmin (u=0) to zmax
    const uAt = (z) => z - min[2];
    const dispZ = -6.35; // display centre
    const dispW = 3.9;
    const dispH = 1.9;
    const dv = 1.62;
    frame.box("paintedMetal", uAt(dispZ), dv, 0.06, dispW + 0.3, dispH + 0.34, 0.12, { color: PALETTE.impBlack, texel: 1.5 });
    frame.box("paintedMetal", uAt(dispZ), dv, 0.1, dispW + 0.12, dispH + 0.16, 0.04, { color: PALETTE.impDark, texel: 2 });
    const cols = 3;
    const rws = 2;
    const cw = (dispW - 0.04 * (cols - 1)) / cols;
    const rh = (dispH - 0.04 * (rws - 1)) / rws;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rws; r++) {
        const u = uAt(dispZ) - dispW / 2 + cw / 2 + c * (cw + 0.04);
        const v = dv - dispH / 2 + rh / 2 + r * (rh + 0.04);
        frame.box("darkGloss", u, v, 0.125, cw + 0.02, rh + 0.02, 0.012);
        frame.add("impScreen" + [[2, 0], [4, 2], [2, 1]][c][r], new THREE.PlaneGeometry(cw, rh), u, v, 0.133, { uv: "keep" });
      }
    }
    frame.box("leds", uAt(dispZ), dv - dispH / 2 - 0.1, 0.13, dispW * 0.7, 0.04, 0.01, { uv: "keep" });
    frame.box("emitBlue", uAt(dispZ), dv + dispH / 2 + 0.11, 0.13, dispW * 0.9, 0.02, 0.01);
    signPlate(frame, labels, 1, { u: uAt(dispZ), v: dv + dispH / 2 + 0.38, h: 0.22 });
    // emblem on the port half, lectern in front of it
    const emZ = -9.8;
    emblem(kit, ctx, frame, uAt(emZ), 2.1, 0.85);
    lectern(kit, ctx, max[0] - 1.9, emZ, labels);
    // presenter's cable duct from the lectern into the wall
    pipeRun(kit, [[max[0] - 1.9, 0.05, emZ + 0.3], [max[0] - 0.2, 0.05, emZ + 0.3]], 0.03, PALETTE.impBlack, "rubber");
  }

  // --- port wall (zmin): mission boards (screens + printed sheets) at eye level
  {
    const seg = wallSegment(ctx.bounds, "zmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from xmin (u=0) to xmax
    const uAt = (x) => x - min[0];
    signPlate(frame, labels, 3, { u: uAt(10.0), v: 2.75, h: 0.22 });
    // a long dark board rail with alternating screens and lit sheets
    frame.box("paintedMetal", uAt(10.0), 1.75, 0.03, 9.6, 1.7, 0.06, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("emitAmber", uAt(10.0), 0.88, 0.065, 9.4, 0.015, 0.008);
    const items = [
      [5.9, "screen", 2],
      [7.15, "sheet", 0],
      [8.05, "sheet", 1],
      [9.3, "screen", 0],
      [10.55, "sheet", 2],
      [11.45, "sheet", 3],
      [12.7, "screen", 2],
      [13.9, "sheet", 1],
    ];
    for (const [x, kind, idx] of items) {
      if (kind === "screen") {
        frame.box("darkGloss", uAt(x), 1.8, 0.065, 1.14, 0.74, 0.012);
        frame.add("impScreen" + (idx % 5), new THREE.PlaneGeometry(1.1, 0.7), uAt(x), 1.8, 0.072, { uv: "keep" });
        frame.box("leds", uAt(x), 1.36, 0.066, 0.6, 0.03, 0.008, { uv: "keep" });
      } else {
        // lit mission board: dark display panel in a black bezel with an amber header light
        frame.box("paintedMetal", uAt(x), 1.82, 0.065, 0.78, 0.98, 0.03, { color: PALETTE.impBlack, texel: 2 });
        frame.add(boards.key, new THREE.PlaneGeometry(0.68, 0.85), uAt(x), 1.82, 0.082, { uv: "keep", uvRect: boards.rect(idx) });
        frame.box("emitAmber", uAt(x), 2.29, 0.081, 0.5, 0.012, 0.004);
        frame.box(idx % 2 ? "emitBlue" : "emitAmber", uAt(x) + 0.3, 1.36, 0.081, 0.05, 0.02, 0.004);
      }
    }
    // small map lamps over the boards, wired along a conduit at the top
    for (let k = 0; k < 4; k++) {
      const u = uAt(6.8 + k * 2.4);
      frame.box("paintedMetal", u, 2.66, 0.14, 0.4, 0.05, 0.26, { color: PALETTE.impBlack, texel: 2 });
      frame.box("emitWhiteDim", u, 2.63, 0.14, 0.32, 0.01, 0.16, { uv: "keep" });
    }
    frame.cylU("metal", uAt(10.0), 2.95, 0.06, 0.03, 9.4, { color: PALETTE.impMid });
    ventGrille(frame, uAt(16.5), 3.15, 1.1, 0.36);
    ventGrille(frame, uAt(3.7), 3.15, 1.1, 0.36);
    // floor conduit along the wall base carrying the tier lighting
    pipeRun(kit, [[min[0] + 3.0, 0.06, min[2] + 0.2], [tiers[1].x0 - 0.2, 0.06, min[2] + 0.2], [tiers[1].x0 - 0.2, 0.06, tierZ0 - 0.1]], 0.04, PALETTE.impMid);
    void length;
  }

  // --- starboard wall (zmax): refreshment counter by the door, notice frames, a duty screen
  {
    const seg = wallSegment(ctx.bounds, "zmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from xmax (u=0) to xmin
    const uAt = (x) => max[0] - x;
    const cx0 = min[0] + 3.2;
    const cw = 3.0;
    // counter body: dark carcass, black kick plate, a worktop; the front is three inset grey door
    // panels with recessed pulls, a drawer bank with a lit readout and a status lamp row
    const cf = max[2] - 0.6; // front face
    kit.box("paintedMetal", cx0, 0.45, max[2] - 0.3, cw, 0.9, 0.6, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", cx0, 0.06, cf - 0.01, cw - 0.04, 0.12, 0.02, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", cx0, 0.915, max[2] - 0.3, cw + 0.06, 0.03, 0.66);
    kit.box("emitWhiteDim", cx0, 0.135, cf - 0.006, cw - 0.3, 0.012, 0.01, { uv: "keep" });
    const doorW = 0.68;
    for (let k = 0; k < 3; k++) {
      const dx = cx0 - cw / 2 + 0.15 + doorW / 2 + k * (doorW + 0.06);
      kit.box("impPanel1", dx, 0.5, cf - 0.012, doorW, 0.66, 0.024, { color: k === 1 ? PALETTE.impGrey : PALETTE.impMid, uv: "keep" });
      kit.box("paintedMetal", dx, 0.5, cf - 0.02, doorW - 0.1, 0.56, 0.006, { color: PALETTE.impDark, texel: 3 });
      kit.box("metal", dx + doorW / 2 - 0.1, 0.62, cf - 0.032, 0.03, 0.14, 0.016, { color: PALETTE.steel });
      kit.box(k === 1 ? "emitAmberDim" : "emitBlueDim", dx - doorW / 2 + 0.1, 0.78, cf - 0.03, 0.05, 0.018, 0.006);
    }
    // drawer bank at the right end with a readout and a keypad
    const bx = cx0 + cw / 2 - 0.33;
    for (let k = 0; k < 3; k++) {
      kit.box("impPanel1", bx, 0.28 + k * 0.22, cf - 0.012, 0.6, 0.19, 0.024, { color: PALETTE.impGrey, uv: "keep" });
      kit.box("metal", bx, 0.28 + k * 0.22, cf - 0.03, 0.18, 0.02, 0.012, { color: PALETTE.steel });
    }
    kit.box("paintedMetal", bx, 0.84, cf - 0.012, 0.6, 0.1, 0.024, { color: PALETTE.impBlack, texel: 3 });
    kit.box("impScreen4", bx - 0.12, 0.84, cf - 0.026, 0.26, 0.07, 0.004, { uv: "keep" });
    for (let k = 0; k < 3; k++) kit.box(["emitBlueDim", "emitAmberDim", "emitRed"][k], bx + 0.1 + k * 0.08, 0.84, cf - 0.026, 0.04, 0.03, 0.004);
    // dispenser unit on the counter: grey housing with a dark face, nozzle, readout and a drip tray
    kit.box("paintedMetal", cx0 + 0.95, 1.2, max[2] - 0.3, 0.5, 0.56, 0.45, { color: PALETTE.impGrey, texel: 2 });
    kit.box("paintedMetal", cx0 + 0.95, 1.2, max[2] - 0.527, 0.44, 0.5, 0.01, { color: PALETTE.impBlack, texel: 3 });
    kit.box("impScreen4", cx0 + 0.95, 1.36, max[2] - 0.535, 0.24, 0.1, 0.006, { uv: "keep" });
    kit.box("emitBlueDim", cx0 + 0.95, 1.22, max[2] - 0.535, 0.3, 0.012, 0.006);
    for (let k = 0; k < 3; k++) kit.box(k === 1 ? "emitAmberDim" : "rubber", cx0 + 0.87 + k * 0.08, 1.1, max[2] - 0.535, 0.05, 0.03, 0.006, { color: PALETTE.rubber });
    kit.box("metal", cx0 + 0.95, 1.0, max[2] - 0.45, 0.06, 0.1, 0.2, { color: PALETTE.steel });
    kit.box("paintedMetal", cx0 + 0.95, 0.94, max[2] - 0.55, 0.3, 0.02, 0.2, { color: PALETTE.impBlack, texel: 3 });
    for (const [dx, dz, col] of [[-1.05, 0.05, PALETTE.impLight], [-0.9, -0.12, PALETTE.impGrey], [-0.78, 0.08, PALETTE.impLight], [0.2, -0.05, PALETTE.impGrey]]) mug(kit, cx0 + dx, 0.93, max[2] - 0.3 + dz, col);
    datapad(kit, cx0 - 0.3, 0.93, max[2] - 0.35, 0.3, 2);
    datapad(kit, cx0 + 0.35, 0.93, max[2] - 0.28, -0.15, 0);
    kit.collider([cx0 - cw / 2, 0, max[2] - 0.62], [cx0 + cw / 2, 0.93, max[2]], "counter");
    wallScreen(kit, ctx, { side: "zmax", u: uAt(cx0 - 0.6), v: 1.95, w: 1.4, h: 0.8, screen: 4 });
    frame.box("paintedMetal", uAt(cx0 + 1.0), 1.95, 0.03, 0.9, 0.9, 0.05, { color: PALETTE.impDark, texel: 2 });
    frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uAt(cx0 + 1.0), 1.95, 0.06, { uv: "keep", uvRect: decalRect(2) });
    // long notice rail on the rest of the wall + a big duty screen facing the seats' right side
    wallScreen(kit, ctx, { side: "zmax", u: uAt(9.3), v: 1.95, w: 1.6, h: 0.9, screen: 0 });
    wallScreen(kit, ctx, { side: "zmax", u: uAt(12.4), v: 1.95, w: 1.6, h: 0.9, screen: 2 });
    signPlate(frame, labels, 6, { u: uAt(15.0), v: 2.3, h: 0.14 });
    for (let k = 0; k < 3; k++) frame.box(["emitRed", "emitAmber", "emitBlue"][k], uAt(15.0) - 0.3 + k * 0.3, 1.95, 0.03, 0.06, 0.06, 0.02);
    // presenter's comm panel and the session lamp in the forward corner
    frame.box("paintedMetal", uAt(17.25), 1.45, 0.05, 0.32, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen4", uAt(17.25), 1.55, 0.101, 0.24, 0.16, 0.006, { uv: "keep" });
    for (const [k, m] of ["emitBlue", "emitAmber", "emitRed"].entries()) frame.box(m, uAt(17.25) - 0.08 + k * 0.08, 1.28, 0.101, 0.05, 0.03, 0.006);
    signPlate(frame, labels, 2, { u: uAt(17.15), v: 2.45, h: 0.13 });
    ventGrille(frame, uAt(6.0), 3.15, 1.1, 0.36);
    void length;
  }

  // --- aft wall (xmin): door sign, session lamp, scuffs, a bin and a spare chair stack
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmax (u=0) to zmin
    const door = ctx.doors[0];
    const uDoor = door ? max[2] - door.pos[1] : length / 2;
    signPlate(frame, labels, 0, { u: uDoor, v: 3.2, h: 0.26 });
    frame.box("paintedMetal", uDoor, 2.62, 0.04, 0.9, 0.22, 0.08, { color: PALETTE.impBlack, texel: 2 });
    frame.box("emitRedSoft", uDoor, 2.62, 0.085, 0.76, 0.12, 0.01, { uv: "keep" });
    frame.box("paintedMetal", uDoor + 1.55, 1.35, 0.05, 0.34, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen2", uDoor + 1.55, 1.45, 0.101, 0.26, 0.16, 0.006, { uv: "keep" });
    frame.box("emitBlue", uDoor + 1.5, 1.2, 0.101, 0.05, 0.03, 0.006);
    frame.box("emitAmber", uDoor + 1.62, 1.2, 0.101, 0.05, 0.03, 0.006);
    floorScuffs(kit, min[0] + 1.3, door ? door.pos[1] : cz, { n: 7, len: 1.1, yaw: 0, seed: 23 });
    // waste bin in the port corner, a sign-in terminal facing the entrance beside it
    kit.cyl("paintedMetal", min[0] + 0.55, 0.35, min[2] + 0.6, 0.22, 0.7, "y", { color: PALETTE.impMid, segments: 16 });
    kit.cyl("paintedMetal", min[0] + 0.55, 0.71, min[2] + 0.6, 0.23, 0.03, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.collider([min[0] + 0.3, 0, min[2] + 0.35], [min[0] + 0.8, 0.72, min[2] + 0.85], "bin");
    impConsole(kit, ctx, { x: min[0] + 2.35, z: min[2] + 0.75, yaw: -Math.PI / 2, w: 1.0, d: 0.6, h: 1.05, screens: [4], seed: ctx.seed + 19, lampMat: "emitAmber" });
    // entry lane: recessed white guide dots set straight into the polished deck (no inlay plate)
    for (let k = 0; k < 5; k++) {
      const x = min[0] + 1.0 + k * 1.05;
      for (const s of [-1, 1]) kit.cyl("emitWhiteDim", x, 0.009, cz + s * 1.0, 0.04, 0.004, "y", { segments: 10, uv: "keep" });
    }
    wallScreen(kit, ctx, { side: "xmin", u: uDoor + 2.6, v: 1.9, w: 1.2, h: 0.7, screen: 4 });
    wallScreen(kit, ctx, { side: "xmin", u: uDoor - 2.6, v: 1.9, w: 1.2, h: 0.7, screen: 2 });
  }

  // --- ceiling: darker panels, one recessed light trough per seat row, a cove strip over the display wall, cable tray to the lectern
  {
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], { rowH: 1.4, panelW: 1.4, kick: false, topPipes: false, seed: ctx.seed * 17 + 9, collide: false, styles: { panel: 0.84, greeble: 0.08, vent: 0.08 }, paints: [[PALETTE.impGrey, 0.5], [PALETTE.impMid, 0.4], [PALETTE.impDark, 0.1]], ...IMP_THEME, decals: false });
    for (const x of rowsX) {
      const z0 = seatZ[0] - 0.45;
      const z1 = seatZ[seatZ.length - 1] + 0.45;
      // black recess with a faint frosted diffuser deep inside it and a narrow brighter core (the
      // same housing + diffuser + core build as the corridor strips, so nothing reads as a tube)
      kit.boxMM("paintedMetal", [x - 0.12, H - 0.16, z0 - 0.12], [x + 0.32, H, z1 + 0.12], { color: PALETTE.impBlack, texel: 2 });
      kit.boxMM("emitWhiteFaint", [x + 0.02, H - 0.17, z0], [x + 0.18, H - 0.15, z1], { uv: "keep" });
      kit.boxMM("emitWhiteDim", [x + 0.075, H - 0.175, z0 + 0.1], [x + 0.125, H - 0.16, z1 - 0.1], { uv: "keep" });
      for (const z of [z0 - 0.06, z1 + 0.06]) kit.boxMM("paintedMetal", [x - 0.14, H - 0.2, z - 0.03], [x + 0.34, H - 0.16, z + 0.03], { color: PALETTE.impDark, texel: 2 });
    }
    // cove over the forward wall: a dropped soffit with a blue strip washing the display
    kit.boxMM("paintedMetal", [max[0] - 1.3, H - 0.35, min[2] + 0.2], [max[0] - 0.0, H, max[2] - 0.2], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("emitBlue", [max[0] - 1.315, H - 0.33, min[2] + 0.5], [max[0] - 1.295, H - 0.29, max[2] - 0.5]);
    kit.boxMM("emitAmber", [max[0] - 1.2, H - 0.36, -10.4], [max[0] - 0.2, H - 0.345, -8.7]);
    // entry strip by the door and a service tray from the aft wall to the lectern
    kit.boxMM("paintedMetal", [min[0] + 0.6, H - 0.1, cz - 1.4], [min[0] + 1.0, H, cz + 1.4], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("emitWhiteDim", [min[0] + 0.72, H - 0.12, cz - 1.2], [min[0] + 0.88, H - 0.09, cz + 1.2], { uv: "keep" });
    cableTray(kit, [min[0] + 0.4, H - 0.12, min[2] + 0.45], [max[0] - 1.4, H - 0.12, min[2] + 0.45], { w: 0.24, count: 3 });
    for (const [dz, col] of [[-0.06, PALETTE.impBlack], [0.06, PALETTE.steel]]) kit.cyl("metal", max[0] - 1.9, H - 0.35 - 0.15, min[2] + 0.45 + dz, 0.02, 0.3, "y", { color: col, segments: 8 });
  }

  // --- lights (6): dim white over the rows, warm over the lectern, blue on the display, white at the entry
  ctx.light(pointLight(0xe8f0ff, 4.4, 7.5, [10.4, H - 0.5, cz - 1.9]));
  ctx.light(pointLight(0xe8f0ff, 4.4, 7.5, [10.4, H - 0.5, cz + 1.9]));
  ctx.light(pointLight(0xffb347, 4.0, 6.5, [max[0] - 1.6, H - 0.7, -9.5]));
  ctx.light(pointLight(0x4a9dff, 3.4, 6.5, [max[0] - 1.6, 2.4, -6.3]));
  ctx.light(pointLight(0xe8f0ff, 3.0, 6.0, [min[0] + 1.6, H - 0.6, cz]));
  ctx.light(pointLight(0xffd9a0, 2.4, 5.5, [min[0] + 3.2, 2.2, max[2] - 1.2]));
  if (ctx.audioZone) ctx.audioZone({ id: "briefing_room", pos: [10.4, 1.2, cz], radius: 7, loop: "hum_low" });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
/**
 * Row of `zs.length` bench seats on a shared plinth at floor level `y`, facing +x. `turns` = { seatIndex:
 * yaw } swings individual seats on their pedestals; `kitCase` = index of a seat with a hard kit case
 * hanging from its backrest (`stencil` = one-row label atlas for the case's marking).
 */
function benchRow(kit, x, y, zs, row, { turns = {}, kitCase = -1, stencil = null } = {}) {
  const pitch = zs[1] - zs[0];
  const z0 = zs[0] - 0.6;
  const z1 = zs[zs.length - 1] + 0.6;
  const rand = rng(row * 13 + 5);
  // plinth and the continuous seat beam; a white strip on the plinth's back face reads from the door
  kit.boxMM("paintedMetal", [x - 0.42, y, z0 - 0.1], [x + 0.3, y + 0.08, z1 + 0.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [x - 0.32, y + 0.08, z0], [x + 0.22, y + 0.36, z1], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("emitBlue", [x + 0.221, y + 0.14, z0 + 0.15], [x + 0.226, y + 0.16, z1 - 0.15]);
  kit.boxMM("emitWhiteDim", [x - 0.432, y + 0.03, z0 + 0.1], [x - 0.42, y + 0.06, z1 - 0.1], { uv: "keep" });
  zs.forEach((z, i) => {
    const yaw = turns[i] || 0;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const px = x - 0.1; // swivel pivot
    const at = (lx, ly, lz) => new THREE.Vector3(lx, 0, lz).applyQuaternion(q).add(new THREE.Vector3(px, y + ly, z)).toArray();
    const part = (mat, sx, sy, sz, lx, ly, lz, extra = {}, lean = 0) => {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      if (lean) g.rotateZ(lean);
      kit.add(mat, g, { pos: at(lx, ly, lz), quat: q, ...extra });
    };
    // seat shell (grey), cushion and backrest (black fabric), tilted back a little
    part("paintedMetal", 0.58, 0.1, 0.56, 0.08, 0.4, 0, { color: PALETTE.impGrey, texel: 2 });
    part("fabric", 0.5, 0.07, 0.5, 0.12, 0.47, 0, { color: PALETTE.impBlack, uv: "world", texel: 2 });
    part("paintedMetal", 0.08, 0.62, 0.52, -0.23, 0.78, 0, { color: PALETTE.impGrey, texel: 2 }, 0.16);
    part("fabric", 0.06, 0.52, 0.44, -0.17, 0.78, 0, { color: PALETTE.impBlack, uv: "world", texel: 2 }, 0.16);
    part("paintedMetal", 0.1, 0.05, 0.56, -0.28, 1.1, 0, { color: PALETTE.impBlack, texel: 2 });
    if (i === kitCase) {
      // hard kit case hung from the backrest by its strap, resting against the back of the shell
      // (the side the door camera sees): black body, dark-grey lid band, steel latches and handle,
      // a small printed squadron stencil low on the face
      const leanQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.16);
      const cq = q.clone().multiply(leanQ);
      const cc = new THREE.Vector3(-0.335, 0.85, 0.02); // case centre, seat-local
      const cp = (dx, dy, dz) => {
        const v = new THREE.Vector3(dx, dy, dz).applyQuaternion(leanQ).add(cc);
        return at(v.x, v.y, v.z);
      };
      const cbox = (mat, sx, sy, sz, dx, dy, dz, extra = {}) => kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: cp(dx, dy, dz), quat: cq, ...extra });
      cbox("paintedMetal", 0.09, 0.32, 0.38, 0, 0, 0, { color: PALETTE.impBlack, texel: 2 });
      cbox("paintedMetal", 0.1, 0.09, 0.39, 0, 0.12, 0, { color: PALETTE.impDark, texel: 2 });
      for (const s of [-1, 1]) cbox("metal", 0.02, 0.05, 0.04, -0.052, 0.055, s * 0.12, { color: PALETTE.steel });
      cbox("metal", 0.02, 0.02, 0.14, 0, 0.18, 0, { color: PALETTE.steel });
      if (stencil) {
        const sh = 0.034;
        kit.add(stencil.key, new THREE.PlaneGeometry(sh * stencil.aspect(0), sh).rotateY(-Math.PI / 2), { pos: cp(-0.047, -0.075, 0), quat: cq, uv: "keep", uvRect: stencil.rect(0) });
      }
      // strap: a short diagonal run from the handle up over the backrest's top cap
      const sq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.5));
      kit.add("fabric", new THREE.BoxGeometry(0.015, 0.13, 0.05), { pos: at(-0.337, 1.085, 0.02), quat: sq, color: PALETTE.impBlack, uv: "world", texel: 2 });
      part("fabric", 0.14, 0.015, 0.05, -0.26, 1.133, 0.02, { color: PALETTE.impBlack, uv: "world", texel: 2 });
    }
    // a datapad left on a couple of seats
    if (rand() < 0.3) datapad(kit, x + 0.04, y + 0.505, z + (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.8, Math.floor(rand() * 5));
  });
  // armrests midway between the seats (and outside the end seats) with a tiny status LED
  for (let i = 0; i <= zs.length; i++) {
    const z = i < zs.length ? zs[i] - pitch / 2 : zs[zs.length - 1] + pitch / 2;
    kit.box("paintedMetal", x - 0.06, y + 0.66, z, 0.42, 0.05, 0.07, { color: PALETTE.impGrey, texel: 2 });
    kit.box("paintedMetal", x - 0.06, y + 0.5, z, 0.08, 0.3, 0.05, { color: PALETTE.impDark, texel: 2 });
    kit.box(i % 2 ? "emitBlue" : "emitAmber", x + 0.1, y + 0.686, z, 0.05, 0.005, 0.03);
  }
  kit.collider([x - 0.45, y, z0 - 0.1], [x + 0.32, y + 1.15, z1 + 0.1], "bench");
}

/**
 * Briefing desk row: four bucket seats on the shared plinth behind a continuous desk carrying a
 * tilted readout and a lamp per seat, lit along its front edge so it reads as a station row.
 */
function deskRow(kit, ctx, x, y, zs) {
  const pitch = zs[1] - zs[0];
  const z0 = zs[0] - 0.6;
  const z1 = zs[zs.length - 1] + 0.6;
  const seats = [-1.5, -0.5, 0.5, 1.5].map((k) => (zs[0] + zs[zs.length - 1]) / 2 + k * pitch);
  kit.boxMM("paintedMetal", [x - 0.42, y, z0 - 0.1], [x + 0.3, y + 0.08, z1 + 0.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitWhiteDim", [x - 0.432, y + 0.03, z0 + 0.1], [x - 0.42, y + 0.06, z1 - 0.1], { uv: "keep" });
  for (const z of seats) impChair(kit, ctx, { x: x - 0.02, z, y: y + 0.08, yaw: -Math.PI / 2 });
  // desk: dark top on a black spine and three legs, front lip strip facing the display
  const dx0 = x + 0.6;
  const dx1 = x + 0.98;
  kit.boxMM("paintedMetal", [dx0, y + 0.68, z0 + 0.1], [dx1, y + 0.74, z1 - 0.1], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("darkGloss", [dx0 + 0.02, y + 0.74, z0 + 0.12], [dx1 - 0.02, y + 0.755, z1 - 0.12]);
  kit.boxMM("paintedMetal", [dx1 - 0.16, y + 0.1, z0 + 0.15], [dx1 - 0.06, y + 0.68, z1 - 0.15], { color: PALETTE.impBlack, texel: 1.5 });
  for (const z of [z0 + 0.3, (z0 + z1) / 2, z1 - 0.3]) kit.box("paintedMetal", (dx0 + dx1) / 2, y + 0.34, z, 0.34, 0.68, 0.08, { color: PALETTE.impDark, texel: 2 });
  kit.boxMM("emitBlueDim", [dx1 - 0.008, y + 0.6, z0 + 0.3], [dx1 + 0.004, y + 0.62, z1 - 0.3]);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.5);
  seats.forEach((z, i) => {
    // tilted readout leaning toward the seat, a keypad strip and a small hooded lamp
    const sx = dx1 - 0.16;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.26, 0.03, 0.4), { pos: [sx, y + 0.8, z], quat: tilt, color: PALETTE.impBlack, texel: 2 });
    kit.add("impScreen" + ((i * 2 + 1) % 5), new THREE.PlaneGeometry(0.34, 0.2).rotateX(-Math.PI / 2), { pos: new THREE.Vector3(0, 0.017, 0).applyQuaternion(tilt).add(new THREE.Vector3(sx, y + 0.8, z)).toArray(), quat: tilt, uv: "keep" });
    for (let k = 0; k < 4; k++) kit.box(k === 1 ? "emitBlueDim" : "rubber", dx0 + 0.12, y + 0.762, z - 0.15 + k * 0.1, 0.1, 0.012, 0.06, { color: PALETTE.rubber });
    kit.cyl("metal", dx1 - 0.08, y + 0.9, z + 0.32, 0.008, 0.3, "y", { color: PALETTE.steel, segments: 6 });
    kit.box("paintedMetal", dx1 - 0.12, y + 1.05, z + 0.32, 0.14, 0.04, 0.1, { color: PALETTE.impBlack, texel: 3 });
    kit.box("emitAmberDim", dx1 - 0.12, y + 1.028, z + 0.32, 0.1, 0.006, 0.06);
  });
  datapad(kit, dx0 + 0.2, y + 0.758, seats[2] + 0.3, 0.3, 3);
  mug(kit, dx0 + 0.16, y + 0.755, seats[0] - 0.3, PALETTE.impGrey);
  kit.collider([x - 0.45, y, z0 - 0.1], [dx1 + 0.02, y + 1.15, z1 + 0.1], "deskrow");
}

/**
 * Original geometric emblem on a wall Frame: a heavy hexagonal ring with six spokes and a solid centre
 * hex on a black hex backing plate; a warm glow ring runs just outside the rim (a lit-edge insignia,
 * not a backlit wheel), an amber core at the hub.
 */
function emblem(kit, ctx, frame, u, v, R) {
  ctx.materials.briefing_glow ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#ffe6c2"), emissiveIntensity: 1.5, roughness: 0.5, metalness: 0 });
  const hexPlate = (r, depth, n, mat, extra) => {
    // vertices along ±u (flat top and bottom) to match the ring bars
    const g = new THREE.CylinderGeometry(r, r, depth, 6);
    g.rotateY(Math.PI / 6);
    g.rotateX(Math.PI / 2);
    frame.add(mat, g, u, v, n, extra);
  };
  // backing: black hex plate with a thin dark-grey chamfer ring behind it
  hexPlate(R + 0.42, 0.02, 0.0, "paintedMetal", { color: PALETTE.impDark, texel: 2 });
  hexPlate(R + 0.34, 0.04, 0.02, "paintedMetal", { color: PALETTE.impBlack, texel: 2 });
  const apo = Math.cos(Math.PI / 6);
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    // rim glow bar just outside the ring, then the ring bar in front of it
    const rg = R + 0.1;
    frame.box("briefing_glow", u + Math.cos(a) * rg * apo, v + Math.sin(a) * rg * apo, 0.05, rg + 0.04, 0.06, 0.02, { spin: a + Math.PI / 2, uv: "keep" });
    frame.box("paintedMetal", u + Math.cos(a) * R * apo, v + Math.sin(a) * R * apo, 0.085, R + 0.08, 0.16, 0.07, { color: PALETTE.impGrey, texel: 2, spin: a + Math.PI / 2 });
  }
  // six cog spokes: wide light-grey sectors between the hub and the ring with dark gaps between them
  // (a cog, not a wheel of thin spokes), each split by a hairline slot
  const sector = (r0, r1, a0, a1) => {
    const sh = new THREE.Shape();
    sh.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    sh.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
    sh.absarc(0, 0, r1, a0, a1, false);
    sh.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
    sh.absarc(0, 0, r0, a1, a0, true);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false, curveSegments: 10 });
  };
  for (let k = 0; k < 6; k++) {
    const av = (Math.PI / 3) * k;
    const half = (Math.PI / 180) * 17;
    frame.add("paintedMetal", sector(R * 0.4, R * 0.81, av - half, av + half), u, v, 0.05, { color: PALETTE.impLight, texel: 2 });
    frame.box("paintedMetal", u + Math.cos(av) * R * 0.605, v + Math.sin(av) * R * 0.605, 0.112, R * 0.41, 0.025, 0.006, { color: PALETTE.impBlack, texel: 3, spin: av });
    // small cog tooth on the outside of the ring at each vertex
    frame.box("paintedMetal", u + Math.cos(av) * R * 1.17, v + Math.sin(av) * R * 1.17, 0.085, 0.14, 0.14, 0.07, { color: PALETTE.impGrey, texel: 2, spin: av });
  }
  hexPlate(R * 0.42, 0.08, 0.09, "paintedMetal", { color: PALETTE.impGrey, texel: 2 });
  hexPlate(R * 0.32, 0.02, 0.135, "paintedMetal", { color: PALETTE.impBlack, texel: 2 });
  hexPlate(R * 0.2, 0.012, 0.15, "briefing_glow", { uv: "keep" });
  // three thin chevrons under the ring on the backing plate
  for (let k = 0; k < 3; k++) frame.box("paintedMetal", u, v - R * apo - 0.2 - k * 0.06, 0.05, 0.8 - k * 0.2, 0.03, 0.02, { color: PALETTE.impGrey, texel: 3 });
}

/**
 * Printed mission sheets: one canvas with four 4:5 sheets (roster table, route map, orbital chart,
 * classified text block) as a lit-by-lights (non emissive) material. Returns { key, rect(i) }.
 */
export function sheetAtlas(ctx, key, { dark = false, scale = 0.5 } = {}) {
  const N = 4;
  const W = 256;
  const Hh = 320;
  if (!ctx.materials[key]) {
    // sheets are drawn in a 256×320 design space each onto a canvas `scale` times that size (the
    // boards are ~0.5 m wide and read as documents, not text, from anywhere in the room)
    const c = makeCanvas(Math.round(W * N * scale), Math.round(Hh * scale));
    const g = c.getContext("2d");
    g.scale(scale, scale);
    const rand = rng(41);
    // `dark`: the same four layouts as lit display boards (near-black ground, pale ink, emissive)
    const INK = dark ? "#c9d3e2" : "#1c1f24";
    const PAPER = dark ? "#0f1318" : "#c9cdd3";
    const HEADER = dark ? "#26304a" : INK;
    const SHADE = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const GRID = dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.25)";
    const ORANGE = dark ? "#ffb347" : "#e9782f";
    const BLUE = dark ? "#4a9dff" : "#2f6fb5";
    const RED = dark ? "#ff4136" : "#c8322a";
    const font = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", "Liberation Mono", monospace`;
    const titles = ["WING ASSIGNMENT  ·  CYCLE 14", "PATROL ROUTE  ·  SECTOR 7", "ORBITAL APPROACH  ·  DANTOOINE", "OPERATION  ·  RESTRICTED"];
    for (let i = 0; i < N; i++) {
      g.save();
      g.translate(i * W, 0);
      g.beginPath();
      g.rect(0, 0, W, Hh);
      g.clip();
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, Hh);
      // paper grain / panel noise
      for (let k = 0; k < 500; k++) {
        g.fillStyle = dark ? `rgba(255,255,255,${(rand() * 0.05).toFixed(3)})` : `rgba(0,0,0,${(rand() * 0.06).toFixed(3)})`;
        g.fillRect(rand() * W, rand() * Hh, 2, 2);
      }
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(10, 10, W - 20, Hh - 20);
      g.fillStyle = HEADER;
      g.fillRect(10, 10, W - 20, 30);
      g.fillStyle = "#e6e9ee";
      g.font = font(11);
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(titles[i], 18, 26);
      g.fillStyle = ORANGE;
      g.fillRect(W - 40, 14, 22, 22);
      g.fillStyle = INK;
      g.font = font(10);
      g.textAlign = "right";
      g.fillText(`FORM 7-${41 + i * 3}`, W - 16, Hh - 22);
      g.textAlign = "left";
      g.fillText(`ISD VIGILANCE`, 16, Hh - 22);
      if (i === 0) {
        // roster table
        for (let r = 0; r < 12; r++) {
          const y = 58 + r * 20;
          g.fillStyle = r % 2 ? SHADE : "rgba(0,0,0,0)";
          g.fillRect(16, y - 8, W - 32, 18);
          g.fillStyle = INK;
          g.font = font(9, false);
          g.fillText(`${["ALPHA", "BETA", "GAMMA", "DELTA"][r % 4]}-${(r % 6) + 1}`, 20, y + 1);
          g.fillStyle = r === 4 ? RED : BLUE;
          g.fillRect(110, y - 4, 40 + rand() * 80, 8);
          g.fillStyle = INK;
          g.fillText(String(1000 + Math.floor(rand() * 8999)), 200, y + 1);
        }
      } else if (i === 1) {
        // hex-grid route map
        g.strokeStyle = GRID;
        g.lineWidth = 1;
        const cell = 18;
        for (let r = 0; r < 14; r++) {
          for (let q = 0; q < 8; q++) {
            const hx = 30 + q * cell * 1.73 + (r % 2 ? cell * 0.866 : 0);
            const hy = 62 + r * cell * 1.5;
            g.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (Math.PI / 3) * k + Math.PI / 6;
              g.lineTo(hx + Math.cos(a) * cell, hy + Math.sin(a) * cell);
            }
            g.closePath();
            g.stroke();
          }
        }
        g.strokeStyle = ORANGE;
        g.lineWidth = 3;
        g.beginPath();
        const pts = [[40, 270], [80, 220], [130, 200], [150, 140], [200, 110], [215, 70]];
        for (const [px, py] of pts) g.lineTo(px, py);
        g.stroke();
        for (const [px, py] of pts) {
          g.fillStyle = INK;
          g.beginPath();
          g.arc(px, py, 5, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = RED;
        g.beginPath();
        g.moveTo(215, 58);
        g.lineTo(224, 76);
        g.lineTo(206, 76);
        g.closePath();
        g.fill();
      } else if (i === 2) {
        // orbital chart
        const cx = W / 2;
        const cy = 175;
        g.fillStyle = BLUE;
        g.beginPath();
        g.arc(cx, cy, 26, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 1.5;
        for (const [rx, ry, rot] of [[60, 24, 0.3], [88, 36, 0.3], [112, 46, 0.3]]) {
          g.beginPath();
          g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
          g.stroke();
        }
        g.strokeStyle = ORANGE;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(40, 290);
        g.quadraticCurveTo(60, 160, cx + 60, cy - 20);
        g.stroke();
        g.fillStyle = INK;
        g.font = font(9, false);
        for (let k = 0; k < 5; k++) g.fillText(`WP-${k + 1}  ${(0.2 + k * 0.15).toFixed(2)}c  ${String(100 + k * 37)}°`, 18, 250 + k * 12);
      } else {
        // classified text block with a stamp
        g.fillStyle = INK;
        for (let r = 0; r < 16; r++) {
          let x = 18;
          const y = 60 + r * 14;
          while (x < W - 30) {
            const w = 8 + rand() * 30;
            if (x + w > W - 18) break;
            g.fillRect(x, y, w, 5);
            x += w + 6;
          }
        }
        g.save();
        g.translate(W / 2, 200);
        g.rotate(-0.25);
        g.strokeStyle = RED;
        g.lineWidth = 4;
        g.strokeRect(-90, -22, 180, 44);
        g.fillStyle = RED;
        g.font = font(20);
        g.textAlign = "center";
        g.fillText("RESTRICTED", 0, 0);
        g.restore();
      }
      g.restore();
    }
    const tex = toTexture(c, { srgb: true, wrap: false });
    ctx.materials[key] = dark
      ? new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0 })
      : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  }
  return {
    key,
    rect(i) {
      return [i / N, 0, (i + 1) / N, 1];
    },
  };
}

/** Lectern facing -x: sloped top with a screen and a mic stem, a lit foot recess, spare datapads. */
function lectern(kit, ctx, x, z, labels) {
  kit.box("paintedMetal", x, 0.06, z, 0.7, 0.12, 0.9, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, 0.66, z, 0.5, 1.08, 0.7, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("impPanel", x - 0.255, 0.7, z, 0.01, 0.8, 0.6, { color: PALETTE.impGrey, uv: "keep" });
  kit.box("emitAmber", x - 0.26, 0.2, z, 0.01, 0.02, 0.5);
  // sloped top: low edge toward the speaker (-x); surface height at offset dx from its centre
  const tilt = 0.32;
  const surf = (dx) => 1.24 + dx * Math.tan(tilt) + 0.03 / Math.cos(tilt);
  const top = new THREE.BoxGeometry(0.9, 0.06, 0.7);
  top.rotateZ(tilt);
  kit.add("paintedMetal", top, { pos: [x - 0.05, 1.24, z], color: PALETTE.impBlack, texel: 2 });
  const dg = new THREE.BoxGeometry(0.5, 0.012, 0.36);
  dg.rotateZ(tilt);
  kit.add("darkGloss", dg, { pos: [x - 0.2, surf(-0.15) + 0.004, z] });
  const scr = new THREE.PlaneGeometry(0.44, 0.3).rotateX(-Math.PI / 2).rotateZ(tilt);
  kit.add("impScreen0", scr, { pos: [x - 0.2, surf(-0.15) + 0.011, z], uv: "keep" });
  for (let k = 0; k < 4; k++) kit.add(k % 2 ? "emitBlue" : "rubber", new THREE.BoxGeometry(0.06, 0.02, 0.05).rotateZ(tilt), { pos: [x + 0.15, surf(0.2) + 0.008, z - 0.2 + k * 0.13], color: PALETTE.rubber });
  // mic stem on the high side, side shelf with the speaker's datapad and cup
  kit.cyl("metal", x + 0.28, surf(0.33) + 0.2, z + 0.25, 0.008, 0.4, "y", { color: PALETTE.steel, segments: 8 });
  kit.add("rubber", new THREE.SphereGeometry(0.025, 10, 8), { pos: [x + 0.28, surf(0.33) + 0.4, z + 0.25], color: PALETTE.impBlack });
  kit.box("emitRed", x + 0.28, surf(0.33) + 0.36, z + 0.25, 0.01, 0.01, 0.01);
  kit.box("paintedMetal", x, 0.98, z + 0.55, 0.44, 0.04, 0.34, { color: PALETTE.impDark, texel: 2 });
  kit.box("paintedMetal", x, 0.6, z + 0.55, 0.08, 0.76, 0.08, { color: PALETTE.impBlack, texel: 2 });
  datapad(kit, x - 0.05, 1.0, z + 0.55, 0.25, 2);
  mug(kit, x + 0.13, 1.0, z + 0.62, PALETTE.impGrey);
  signAt(kit, labels, 4, { x: x - 0.262, y: 0.95, z, yaw: -Math.PI / 2, h: 0.07, bezel: false });
  kit.collider([x - 0.4, 0, z - 0.45], [x + 0.4, 1.4, z + 0.75], "lectern");
  void ctx;
}
