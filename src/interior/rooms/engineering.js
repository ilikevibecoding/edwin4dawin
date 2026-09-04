// Deck 4 — Engineering Control (d4_engctrl). The ship's systems nerve centre: an amphitheatre of
// consoles facing one continuous 8 m master systems display (ship schematic, subsystem gauges,
// power-flow diagram), a raised supervisor platform with a master console, side stations and a
// damage-control hologram, a power-distribution board with live bar gauges, breaker cabinets, a
// coolant manifold, a repair bench, cable trays and amber work lighting.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, wallScreen, equipmentRack, stairs, platform, railing, pipeRun, hologram, wallSegment } from "../imperial.js";
import { wallFrame, pointLight } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect, GRATE_TILE } from "../../textures.js";
import { ENG_PAINTS, ENG_CEIL_PAINTS, ENG_STYLES, ENG_THEME, AMBER, AMBER_DEEP, COOL, BLUE, HAZARD_TEXEL, cableTray, wallVent, wallStencil, floorStencil, floorLine, floorBorder, dimCeilingStrips, cabinet, barGauges, spotLight, statusBoardMat, pipeManifold, workbench, toolChest, hose, railScreen } from "./engProps.js";

export function buildEngineering(kit, ctx) {
  const [min, max] = ctx.bounds; // [-32, 0, -30] .. [-2.9, 4, -8]
  const H = max[1];
  const rand = rng(ctx.seed + 5);

  // two ceiling strips at the quarter lines (nothing runs down the camera axis from the door) and
  // both dimmed: the 4 m ceiling puts them close enough to saturate at the standard emitter
  const STRIP_SPACING = 11;
  roomShell(kit, ctx, {
    ceiling: { lights: false, paints: ENG_CEIL_PAINTS, panelW: 1.6, rowH: 1.6, along: "x", spacing: STRIP_SPACING, styles: { panel: 0.7, greeble: 0.12, vent: 0.18 } },
    walls: { paints: ENG_PAINTS, styles: ENG_STYLES, theme: ENG_THEME, rows: [0, 0.5, 1.7, 2.9, H] },
  });
  dimCeilingStrips(kit, ctx.bounds, { along: "x", spacing: STRIP_SPACING, mat: "emitWhiteDim" });

  // ---------------------------------------------------------------- master systems display (xmin): one continuous board
  const segX = wallSegment(ctx.bounds, "xmin");
  const { frame: fx } = wallFrame(kit, segX.from, segX.to, 0);
  const du = max[2] - -19; // u along the xmin wall runs from z = max to z = min
  const dw = 8.4;
  const dv0 = 1.12; // as high as the 4 m ceiling allows: the platform console must not hide the board from the door
  const dh = 2.55;
  statusBoardMat(ctx, "eng_board", { accent: "#ffb347", cool: "#4a9dff", warn: "#ff4136", seed: ctx.seed + 3 });
  fx.box("paintedMetal", du, dv0 + dh / 2, 0.12, dw + 0.6, dh + 0.5, 0.24, { color: PALETTE.impBlack, texel: 2 });
  fx.box("paintedMetal", du, dv0 + dh / 2, 0.25, dw + 0.24, dh + 0.2, 0.03, { color: PALETTE.impDark, texel: 2 });
  fx.box("darkGloss", du, dv0 + dh / 2, 0.268, dw + 0.06, dh + 0.06, 0.012);
  fx.add("eng_board", new THREE.PlaneGeometry(dw, dh), du, dv0 + dh / 2, 0.276, { uv: "keep" });
  // thin mullions over the glass so the board reads as one installed panel, not a poster
  for (const k of [-1, 1]) fx.box("paintedMetal", du + k * dw * 0.26, dv0 + dh / 2, 0.28, 0.02, dh, 0.01, { color: PALETTE.impBlack, texel: 2 });
  // equipment plinth under the display with a light-grey nosing and a row of status LEDs on its face
  fx.box("paintedMetal", du, (dv0 - 0.1) / 2, 0.3, dw + 0.6, dv0 - 0.1, 0.6, { color: PALETTE.impDark, texel: 1.5 });
  fx.box("paintedMetal", du, dv0 - 0.1 - 0.025, 0.56, dw + 0.6, 0.05, 0.1, { color: PALETTE.impLight, texel: 2 });
  fx.box("impPanel", du, (dv0 - 0.1) / 2, 0.61, dw + 0.4, dv0 - 0.3, 0.012, { color: PALETTE.impMid, uv: "keep" });
  for (let i = 0; i < 6; i++) fx.box(i === 4 ? "emitRed" : "emitAmberDim", du - dw / 2 + 0.5 + i * 0.16, dv0 - 0.28, 0.62, 0.08, 0.04, 0.01);
  for (let i = 0; i < 9; i++) {
    const uu = du - dw / 2 + 0.3 + i * 1.0;
    fx.box("metal", uu, 0.45, 0.63, 0.7, 0.16, 0.03, { color: PALETTE.impBlack });
    fx.box(rand() < 0.8 ? "emitBlueDim" : "emitAmberDim", uu - 0.2, 0.45, 0.65, 0.03, 0.03, 0.01);
    fx.box("leds", uu + 0.12, 0.45, 0.65, 0.3, 0.02, 0.01, { uv: "keep" });
  }
  fx.collider(du - dw / 2 - 0.3, du + dw / 2 + 0.3, 0, dv0 + dh + 0.4, 0, 0.62, "display");
  // flanks differ: two racks in a row on the left (z > -19), a coolant manifold on the right
  equipmentRack(kit, ctx, { side: "xmin", u: du - dw / 2 - 1.5, w: 1.4, h: 3.0, seed: ctx.seed + 1, lit: "emitAmber" });
  equipmentRack(kit, ctx, { side: "xmin", u: du - dw / 2 - 3.1, w: 1.4, h: 2.4, seed: ctx.seed + 4, lit: "emitBlue" });
  pipeManifold(kit, ctx, "xmin", du + dw / 2 + 1.7, { w: 2.6, v0: 0.4, v1: 3.1, n: 5, seed: ctx.seed + 6 });
  wallVent(kit, ctx, "xmin", du - dw / 2 - 2.3, 3.55, 1.6, 0.5);
  wallStencil(kit, ctx, "xmin", 2.5, 2.2, 0.7, 5);
  wallStencil(kit, ctx, "xmin", 20.4, 3.35, 0.9, 13);

  // ---------------------------------------------------------------- console amphitheatre
  const ax = -31.5;
  const az = -19;
  const arc = (r, angles, opts) => {
    for (let i = 0; i < angles.length; i++) {
      const a = (angles[i] * Math.PI) / 180;
      const x = ax + r * Math.cos(a);
      const z = az + r * Math.sin(a);
      const yaw = Math.atan2(Math.cos(a), Math.sin(a));
      impConsole(kit, ctx, { x, z, yaw, w: opts.w, d: 0.85, screens: opts.screens[i % opts.screens.length], chair: true, seed: ctx.seed + i * 7 + r, lampMat: i % 3 === 1 ? "emitBlue" : "emitAmber" });
    }
  };
  arc(7.4, [-63, -42, -21, 0, 21, 42, 63], { w: 2.0, screens: [[1, 1], [1, 4], [4, 1], [1, 1, 1], [1, 4], [1, 1], [4, 4]] });
  arc(10.6, [-45, -22.5, 0, 22.5, 45], { w: 2.4, screens: [[1, 4, 1], [1, 1], [4, 1, 1], [1, 1], [1, 4, 1]] });
  // the operators' floor: an amber ring line on the deck around the arc
  for (let i = 0; i < 40; i++) {
    const a0 = ((-70 + (140 * i) / 40) * Math.PI) / 180;
    const a1 = ((-70 + (140 * (i + 1)) / 40) * Math.PI) / 180;
    floorLine(kit, ax + 9.0 * Math.cos(a0), az + 9.0 * Math.sin(a0), ax + 9.0 * Math.cos(a1), az + 9.0 * Math.sin(a1), { w: 0.08, color: PALETTE.impAmber });
  }

  // ---------------------------------------------------------------- supervisor platform
  const px0 = -17.2;
  const px1 = -11.2;
  const pz0 = -22;
  const pz1 = -16;
  const py = 0.8;
  platform(kit, ctx, { x0: px0, z0: pz0, x1: px1, z1: pz1, y: py });
  stairs(kit, ctx, { x: px1 + 1.2, z: az, y0: 0, y1: py, axis: "x", dir: -1, w: 2.0 });
  railing(kit, px0, pz0, px1, pz0, py);
  railing(kit, px0, pz1, px1, pz1, py);
  railing(kit, px0, pz0, px0, pz1, py);
  railing(kit, px1, pz0, px1, az - 1.05, py);
  railing(kit, px1, az + 1.05, px1, pz1, py);
  floorBorder(kit, px0 - 0.3, pz0 - 0.3, px1 + 0.3, pz1 + 0.3, { w: 0.12 });
  // deck dressing: inset amber guide line, grated service hatch, master console with a rear riser
  floorBorder(kit, px0 + 0.35, pz0 + 0.35, px1 - 0.35, pz1 - 0.35, { w: 0.05, mat: "emitAmberDim", y: py + 0.005 });
  kit.boxMM("paintedMetal", [px0 + 0.5, py + 0.001, pz1 - 1.4], [px0 + 1.7, py + 0.008, pz1 - 0.3], { color: PALETTE.impBlack, texel: 2 });
  {
    const g = new THREE.PlaneGeometry(1.1, 1.0);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [px0 + 1.1, py + 0.01, pz1 - 0.85], uv: "scale", uvScale: [1.1 / GRATE_TILE[0], 1.0 / GRATE_TILE[1]] });
  }
  // (standard height: a rear riser here would hide the status board from the door)
  impConsole(kit, ctx, { x: px0 + 1.35, z: az, y: py, yaw: Math.PI / 2, w: 3.0, d: 0.95, screens: [1, 4, 1], chair: true, seed: ctx.seed + 99, lampMat: "emitAmber" });
  // side station on the north edge (operator faces the wall screens on zmax)
  impConsole(kit, ctx, { x: px1 - 2.0, z: pz1 - 0.55, y: py, yaw: Math.PI, w: 1.8, d: 0.75, screens: [4, 1], chair: true, seed: ctx.seed + 98, lampMat: "emitBlue" });
  // damage-control hologram of the ship on a pedestal (south-east corner, clear of the stair landing)
  const hx = px1 - 1.8;
  const hz = pz0 + 1.1;
  kit.cyl("paintedMetal", hx, py + 0.45, hz, 0.42, 0.9, "y", { color: PALETTE.impBlack, segments: 20 });
  kit.cyl("metal", hx, py + 0.93, hz, 0.5, 0.06, "y", { color: PALETTE.impMid, segments: 20 });
  kit.cyl("emitBlue", hx, py + 0.965, hz, 0.36, 0.01, "y", { segments: 20 });
  kit.collider([hx - 0.5, py, hz - 0.5], [hx + 0.5, py + 1.0, hz + 0.5], "holo");
  hologram(kit, ctx, { x: hx, y: py + 1.55, z: hz, kind: "ship", scale: 0.55 });
  // railing screens on the posts (tilted down toward the deck) and a comms pillar
  railScreen(kit, px0 + 1.5, py + 1.1, pz0, 0, { screen: 1 });
  railScreen(kit, px0 + 3.0, py + 1.1, pz0, 0, { screen: 4 });
  railScreen(kit, px0 + 1.5, py + 1.1, pz1, Math.PI, { screen: 4 });
  kit.cyl("paintedMetal", px0 + 0.4, py + 0.65, pz0 + 0.4, 0.12, 1.3, "y", { color: PALETTE.impDark, segments: 12 });
  kit.box("paintedMetal", px0 + 0.4, py + 1.4, pz0 + 0.4, 0.3, 0.2, 0.3, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitAmberDim", px0 + 0.4, py + 1.4, pz0 + 0.56, 0.2, 0.06, 0.01);
  kit.box("emitRedDim", px0 + 0.4, py + 1.52, pz0 + 0.4, 0.06, 0.04, 0.06);
  kit.collider([px0 + 0.2, py, pz0 + 0.2], [px0 + 0.6, py + 1.6, pz0 + 0.6], "comms");
  // under-platform light channel
  kit.boxMM("emitAmber", [px0 + 0.1, 0.12, pz0 - 0.02], [px1 - 0.1, 0.16, pz0 + 0.01], { uv: "keep" });
  kit.boxMM("emitAmber", [px0 + 0.1, 0.12, pz1 - 0.01], [px1 - 0.1, 0.16, pz1 + 0.02], { uv: "keep" });

  // ---------------------------------------------------------------- power distribution board (zmin)
  const segZ = wallSegment(ctx.bounds, "zmin");
  const { frame: fz } = wallFrame(kit, segZ.from, segZ.to, 0);
  const bu = -21 - min[0];
  const bw = 7.4;
  fz.box("paintedMetal", bu, 1.85, 0.15, bw, 3.3, 0.3, { color: PALETTE.impBlack, texel: 2 });
  fz.box("impPanel1", bu, 1.85, 0.31, bw - 0.4, 3.0, 0.02, { color: PALETTE.impMid, uv: "keep" });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 8; c++) {
      const mu = bu - bw / 2 + 0.6 + c * 0.86;
      const mv = 2.5 + r * 0.56;
      fz.box("paintedMetal", mu, mv, 0.36, 0.78, 0.48, 0.08, { color: PALETTE.impDark, texel: 2 });
      fz.box(rand() < 0.82 ? "emitAmber" : "emitRed", mu - 0.25, mv + 0.12, 0.405, 0.07, 0.04, 0.01);
      fz.box(rand() < 0.6 ? "emitGreen" : "emitAmber", mu - 0.12, mv + 0.12, 0.405, 0.05, 0.04, 0.01);
      fz.box("rubber", mu + 0.2, mv + 0.02, 0.43, 0.1, 0.18, 0.07, { color: PALETTE.rubber });
      fz.box("leds", mu - 0.1, mv - 0.15, 0.405, 0.42, 0.03, 0.01, { uv: "keep" });
    }
  }
  barGauges(ctx, fz, bu, 0.85, 0.33, { count: 14, w: 0.18, gap: 0.12, maxH: 1.2 });
  fz.box("paintedMetal", bu, 2.15, 0.33, bw - 0.6, 0.06, 0.03, { color: PALETTE.impBlack, texel: 2 });
  fz.box("hazard", bu, 0.5, 0.32, bw - 0.4, 0.1, 0.02, { texel: HAZARD_TEXEL });
  fz.add("decal", new THREE.PlaneGeometry(0.5, 0.5), bu - bw / 2 + 0.4, 1.5, 0.325, { uv: "keep", uvRect: decalRect(5) });
  fz.add("decal", new THREE.PlaneGeometry(0.5, 0.5), bu + bw / 2 - 0.4, 1.5, 0.325, { uv: "keep", uvRect: decalRect(13) });
  fz.collider(bu - bw / 2, bu + bw / 2, 0, 3.5, 0, 0.46, "board");
  // cable trunks dropping from the ceiling into the board
  for (let k = 0; k < 4; k++) {
    const x = -23.6 + k * 1.7;
    pipeRun(kit, [[x, H - 0.02, min[2] + 0.75], [x, 3.7, min[2] + 0.75], [x, 3.55, min[2] + 0.45]], 0.07, k % 2 ? PALETTE.impBlack : PALETTE.impMid, "rubber");
  }
  // breaker cabinets flanking the board, a second manifold by the door end of the wall
  for (const [x, h, s] of [[-27.6, 2.4, 1], [-26.3, 2.0, 2], [-15.5, 2.2, 3], [-14.2, 2.6, 4], [-12.9, 2.2, 5]]) cabinet(kit, x, min[2] + 0.36, { w: 1.2, h, d: 0.66, seed: ctx.seed + s, screen: s % 2 ? 1 : 4 });
  wallVent(kit, ctx, "zmin", 3.0, 3.4, 1.8, 0.6);
  pipeManifold(kit, ctx, "zmin", 23.4, { w: 2.4, v0: 0.5, v1: 2.9, n: 4, seed: ctx.seed + 9 });
  wallVent(kit, ctx, "zmin", 26.5, 3.4, 1.4, 0.5);

  // ---------------------------------------------------------------- systems monitoring bench (zmax)
  const bench = [-22.5, -19.6, -16.7];
  for (let i = 0; i < bench.length; i++) {
    impConsole(kit, ctx, { x: bench[i], z: max[2] - 0.55, yaw: Math.PI, w: 2.6, d: 0.85, screens: i === 1 ? [4, 1] : [1, 1], chair: true, seed: ctx.seed + 40 + i, lampMat: "emitAmber" });
    wallScreen(kit, ctx, { side: "zmax", u: max[0] - bench[i], v: 2.0, w: 1.6, h: 0.9, screen: i === 1 ? 1 : 4 });
  }
  // air handler + coolant manifold on the zmax wall, east of the bench
  const ahx = -10.5;
  kit.boxMM("paintedMetal", [ahx - 2.2, 0, max[2] - 1.1], [ahx + 2.2, 2.6, max[2]], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel", [ahx - 2.0, 0.3, max[2] - 1.115], [ahx + 2.0, 2.4, max[2] - 1.1], { color: PALETTE.impGrey, uv: "keep" });
  for (let i = 0; i < 3; i++) {
    const x = ahx - 1.3 + i * 1.3;
    kit.box("metal", x, 1.6, max[2] - 1.14, 0.9, 0.9, 0.06, { color: PALETTE.impBlack });
    for (let s = 0; s < 6; s++) kit.add("metal", new THREE.BoxGeometry(0.8, 0.03, 0.08), { pos: [x, 1.25 + s * 0.14, max[2] - 1.16], rot: [0.6, 0, 0], color: PALETTE.slate });
  }
  kit.box("hazard", ahx, 0.06, max[2] - 1.12, 4.4, 0.1, 0.02, { texel: HAZARD_TEXEL });
  kit.box("emitAmber", ahx - 1.7, 0.6, max[2] - 1.12, 0.3, 0.04, 0.01);
  kit.box("emitRed", ahx - 1.2, 0.6, max[2] - 1.12, 0.1, 0.04, 0.01);
  kit.collider([ahx - 2.25, 0, max[2] - 1.15], [ahx + 2.25, 2.6, max[2]], "airhandler");
  // manifold pipes running from the air handler across the wall top
  pipeRun(kit, [[ahx - 1.5, 2.6, max[2] - 0.6], [ahx - 1.5, 3.45, max[2] - 0.6], [-31.5, 3.45, max[2] - 0.6]], 0.14, PALETTE.impMid);
  pipeRun(kit, [[ahx + 1.5, 2.6, max[2] - 0.35], [ahx + 1.5, 3.25, max[2] - 0.35], [-31.5, 3.25, max[2] - 0.35]], 0.09, PALETTE.impAmber);
  for (let i = 0; i < 5; i++) {
    const x = -29 + i * 3.9;
    kit.box("metal", x, 3.45, max[2] - 0.6, 0.12, 0.4, 0.4, { color: PALETTE.impBlack });
    kit.add("metal", new THREE.TorusGeometry(0.16, 0.025, 8, 18), { pos: [x, 3.25, max[2] - 0.6], rot: [0, Math.PI / 2, 0], color: PALETTE.impRed });
  }
  wallVent(kit, ctx, "zmax", 3.5, 3.0, 2.0, 0.7);
  wallStencil(kit, ctx, "zmax", 6.2, 1.6, 0.6, 12);
  equipmentRack(kit, ctx, { side: "zmax", u: max[0] - -5.8, w: 1.4, h: 2.4, seed: ctx.seed + 8, lit: "emitAmber" });

  // ---------------------------------------------------------------- door wall (xmax) and floor
  const dz = 11; // door u along the xmax wall (z = -19)
  // north of the door (z > -19): repair corner — rack, workbench against the wall, tool chest
  equipmentRack(kit, ctx, { side: "xmax", u: dz + 6.5, w: 1.6, h: 2.8, seed: ctx.seed + 12, lit: "emitAmber" });
  workbench(kit, max[0] - 0.75, -9.9, { yaw: -Math.PI / 2, w: 2.2, seed: ctx.seed + 31 });
  toolChest(kit, max[0] - 1.1, -11.7, { yaw: -Math.PI / 2 + 0.2, seed: ctx.seed + 32 });
  wallScreen(kit, ctx, { side: "xmax", u: dz + 3.6, v: 1.7, w: 1.3, h: 0.75, screen: 4 });
  wallStencil(kit, ctx, "xmax", dz + 2.1, 2.5, 0.5, 6);
  wallVent(kit, ctx, "xmax", 19.8, 3.35, 1.6, 0.6);
  // south of the door: coolant manifold on the wall, a hose run to a floor coupling, status screen
  pipeManifold(kit, ctx, "xmax", dz - 6.6, { w: 2.6, v0: 0.5, v1: 3.0, n: 5, seed: ctx.seed + 33, lamp: "emitBlueDim" });
  hose(kit, [[max[0] - 0.5, -24.6], [max[0] - 1.6, -24.9], [max[0] - 2.6, -25.9], [max[0] - 3.9, -26.3]], { r: 0.035 });
  kit.box("paintedMetal", max[0] - 4.1, 0.12, -26.4, 0.4, 0.24, 0.4, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitBlueDim", max[0] - 4.1, 0.245, -26.4, 0.16, 0.01, 0.16, { uv: "keep" });
  wallScreen(kit, ctx, { side: "xmax", u: dz - 3.6, v: 2.2, w: 1.6, h: 0.9, screen: 1 });
  wallStencil(kit, ctx, "xmax", dz - 2.1, 2.5, 0.5, 6);
  wallVent(kit, ctx, "xmax", 2.2, 3.35, 1.6, 0.6);
  // approach lane from the door to the platform stairs (lit guide strips), a status kiosk on the north side
  floorLine(kit, max[0] - 0.4, az - 1.15, px1 + 1.4, az - 1.15, { w: 0.06, mat: "emitAmber", y: 0.006 });
  floorLine(kit, max[0] - 0.4, az + 1.15, px1 + 1.4, az + 1.15, { w: 0.06, mat: "emitAmber", y: 0.006 });
  // amber cove line along the top of every wall (the room's signature colour)
  const cv = H - 0.16;
  kit.boxMM("paintedMetal", [min[0], cv - 0.06, min[2]], [max[0], cv + 0.06, min[2] + 0.1], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [min[0], cv - 0.06, max[2] - 0.1], [max[0], cv + 0.06, max[2]], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [min[0], cv - 0.06, min[2]], [min[0] + 0.1, cv + 0.06, max[2]], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [max[0] - 0.1, cv - 0.06, min[2]], [max[0], cv + 0.06, max[2]], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitAmber", [min[0] + 0.2, cv - 0.02, min[2] + 0.1], [max[0] - 0.2, cv + 0.02, min[2] + 0.13]);
  kit.boxMM("emitAmber", [min[0] + 0.2, cv - 0.02, max[2] - 0.13], [max[0] - 0.2, cv + 0.02, max[2] - 0.1]);
  kit.boxMM("emitAmber", [min[0] + 0.1, cv - 0.02, min[2] + 0.2], [min[0] + 0.13, cv + 0.02, max[2] - 0.2]);
  kit.boxMM("emitAmber", [max[0] - 0.13, cv - 0.02, min[2] + 0.2], [max[0] - 0.1, cv + 0.02, max[2] - 0.2]);
  floorStencil(kit, max[0] - 2.2, az - 2.2, 0.8, 5);
  impConsole(kit, ctx, { x: max[0] - 4.2, z: az + 4.2, yaw: Math.PI, w: 1.4, d: 0.7, h: 1.05, screens: [4], seed: ctx.seed + 61, lampMat: "emitAmber" });
  // south side: a spares cabinet and a second tool chest parked by the manifold
  cabinet(kit, max[0] - 1.1, az - 9.0, { yaw: -Math.PI / 2, w: 1.3, h: 2.0, d: 0.6, seed: ctx.seed + 69, screen: null });
  toolChest(kit, max[0] - 4.6, az - 4.6, { yaw: 0.35, seed: ctx.seed + 34 });
  floorStencil(kit, -26, -27.6, 0.9, 7, Math.PI / 2);
  floorStencil(kit, -8, -11, 0.9, 6, 0.3);

  // ---------------------------------------------------------------- overhead: trays, pipes, lights
  cableTray(kit, [min[0] + 0.8, -11.0], [max[0] - 0.8, -11.0], H - 0.45, { w: 0.55, ceil: H, cables: 5, seed: 3 });
  cableTray(kit, [min[0] + 0.8, -24.8], [max[0] - 0.8, -24.8], H - 0.45, { w: 0.55, ceil: H, cables: 4, seed: 4 });
  cableTray(kit, [-9.2, min[2] + 0.8], [-9.2, max[2] - 0.8], H - 0.62, { w: 0.4, ceil: H, cables: 3, seed: 5 });
  cableTray(kit, [-20.5, -24.8], [-20.5, -11.0], H - 0.62, { w: 0.4, ceil: H, cables: 3, seed: 6 });
  pipeRun(kit, [[min[0] + 0.5, H - 0.3, min[2] + 0.6], [max[0] - 0.5, H - 0.3, min[2] + 0.6]], 0.12, PALETTE.impMid);
  pipeRun(kit, [[min[0] + 0.5, H - 0.3, min[2] + 0.95], [max[0] - 0.5, H - 0.3, min[2] + 0.95]], 0.07, PALETTE.impAmber);
  // amber down-lights over the arc (fixtures) and the real lights
  for (const [x, z] of [[-26.5, -23.5], [-26.5, -14.5], [-22, -19]]) {
    kit.box("paintedMetal", x, H - 0.12, z, 1.2, 0.24, 1.2, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitAmberDim", x, H - 0.245, z, 1.0, 0.02, 1.0, { uv: "keep" });
  }
  ctx.light(spotLight(AMBER, 44, 18, [-24, H - 0.2, az], [-25.5, 0, az], { angle: 1.05, penumbra: 0.55, shadow: true }));
  ctx.light(pointLight(BLUE, 7, 11, [min[0] + 2.2, 2.7, az]));
  ctx.light(pointLight(COOL, 7, 10, [-14, H - 0.5, az]));
  ctx.light(pointLight(AMBER_DEEP, 8, 10, [-21, 2.9, min[2] + 2.2]));
  ctx.light(pointLight(COOL, 6, 10, [-18, H - 0.6, max[2] - 2.5]));
  ctx.light(pointLight(COOL, 6, 10, [-6, H - 0.6, az]));
}
