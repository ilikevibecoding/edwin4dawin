// Communications and sensor control: the busiest room on the command deck. Two rows of seated
// operator stations face a wall of sensor displays; the supervisor's dais sits behind them on the door
// side with a rail and two rear-lit podiums; two free-standing signal boards face the entrance; headset
// racks hang by the door; the walls carry racks of blinking comms arrays and an antenna schematic wall
// with two dish models; overhead, cable trays and antenna feed conduits run to the display wall.
// Green-blue accent, brighter than tactical, every station a different UI layout.
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, station, rack, BlinkSet, cableTray, pipe, cabinet, stencil, podium, chair, downlight, effects, handrail, floorStrip, facingFrame, leaningBox } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["+x"], lightRows: 3, lights: false, seed: 23 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cz = (z0 + z1) / 2; // 511
  const blink = new BlinkSet(ctx, [0x62d9c9, 0x6fb4ff, 0xffb347]);

  // ------------------------------------------------------------ sensor-display wall (starboard, +x)
  const disp = customWall(kit, room, "+x", y0, { styles: { panel: 0.94, strip: 0.06 }, paints: [[P.gunmetal, 0.75], [P.slate, 0.25]], seed: 61 });
  const D = disp.frame; // u = z - z0, 0..18, normal -x into the room
  const mats = ["screen9", "screen4", "screen8", "screen7", "screen0"];
  for (let i = 0; i < 5; i++) {
    const u = 2.4 + 3.3 * i;
    const big = i === 2;
    wallScreen(D, u, big ? 2.1 : 2.05, big ? 3.1 : 3.0, big ? 1.7 : 1.5, mats[i], { leds: false });
    D.box("emitTeal", u - 1.58, 2.95, 0.05, 0.05, 0.05, 0.02);
    D.box("emitTeal", u + 1.58, 2.95, 0.05, 0.05, 0.05, 0.02);
  }
  // waveform LED readouts and an equipment counter under the screens
  D.box("satinBlack", 9, 1.16, 0.03, 17.2, 0.16, 0.06);
  for (let i = 0; i < 12; i++) D.box("leds", 0.95 + i * 1.44, 1.16, 0.063, 1.2, 0.05, 0.01, { uv: "keep" });
  D.box("metal", 9, 0.05, 0.28, 17.0, 0.1, 0.5, { color: P.darkMetal });
  D.box("satinBlack", 9, 0.52, 0.26, 17.4, 0.84, 0.52);
  D.box("metal", 9, 0.955, 0.28, 17.5, 0.03, 0.58, { color: P.steel });
  for (let i = 0; i < 10; i++) {
    const u = 1.2 + i * 1.72;
    D.box("paintedMetal", u, 0.55, 0.53, 1.3, 0.62, 0.02, { color: i % 2 ? P.gunmetal : P.slate, texel: 2 });
    D.box("leds", u - 0.2, 0.75, 0.545, 0.7, 0.03, 0.006, { uv: "keep" });
    for (let c = 0; c < 6; c++) blink.dot(D, u - 0.45 + c * 0.12, 0.42, 0.55, 0.028);
    D.box("metal", u + 0.5, 0.45, 0.55, 0.08, 0.08, 0.02, { color: P.steel });
  }
  D.collider(0.3, 17.7, 0, 1.0, 0, 0.62, "counter");
  D.box("satinBlack", 9, 3.02, 0.02, 17.4, 0.05, 0.04);

  // ------------------------------------------------------------ operator rows facing the display wall
  const rowZ = [504.3, 506.1, 507.9, 513.3, 515.1, 516.9];
  const screenSets = [["screen0", "screen9"], ["screen8", "screen1"], ["screen4", "screen10"], ["screen9", "screen2"], ["screen7", "screen4"], ["screen1", "screen8"]];
  for (const [ri, rx] of [[0, 11.4], [1, 16.6]]) {
    for (let i = 0; i < rowZ.length; i++) {
      station(kit, rx, y0, rowZ[i], "-x", { w: 1.7, screens: screenSets[(i + ri * 3) % screenSets.length], lamp: i % 3 === 0 ? "emitOrange" : "emitTeal", seatColor: P.fabricTeal });
    }
    // shared cable tray above each row
    cableTray(kit, [rx - 0.2, z0 + 1.6], [rx - 0.2, z1 - 1.6], yTop - 0.5);
  }

  // ------------------------------------------------------------ supervisor's dais behind the rows, facing the display wall
  const dx = 8.6;
  const daisY = y0 + 0.25;
  kit.boxMM("deck", [dx - 1.7, y0, cz - 1.6], [dx + 1.7, daisY, cz + 1.6], { color: P.impGrey, uv: "world", texel: 1 });
  kit.floor(dx - 1.7, cz - 1.6, dx + 1.7, cz + 1.6, daisY);
  kit.boxMM("satinBlack", [dx - 1.72, y0, cz - 1.62], [dx + 1.72, daisY - 0.06, cz + 1.62]);
  kit.box("emitTeal", dx - 1.725, y0 + 0.12, cz, 0.01, 0.02, 3.0);
  for (const s of [-1, 1]) kit.box("emitTeal", dx, y0 + 0.12, cz + s * 1.625, 3.2, 0.02, 0.01);
  podium(kit, dx + 1.0, daisY, cz - 0.9, "+x", { screen: "screen8", rear: "screen9", w: 1.3, d: 0.5, accent: "emitTeal" });
  podium(kit, dx + 1.0, daisY, cz + 0.9, "+x", { screen: "screen7", rear: "screen10", w: 1.3, d: 0.5, accent: "emitTeal" });
  chair(kit, dx - 0.45, daisY, cz, "+x", { seatColor: P.fabricOrange });
  handrail(kit, [dx - 1.6, cz - 1.5], [dx - 1.6, cz + 1.5], daisY, { h: 0.9, postEvery: 1.5 });
  handrail(kit, [dx - 1.6, cz - 1.5], [dx + 0.2, cz - 1.5], daisY, { h: 0.9, postEvery: 1.8 });
  handrail(kit, [dx - 1.6, cz + 1.5], [dx + 0.2, cz + 1.5], daisY, { h: 0.9, postEvery: 1.8 });
  effects(kit, dx + 0.7, daisY + 0.96, cz - 1.45, "mug");
  // (the shell's middle light channel runs over the dais centre line)
  downlight(kit, dx, yTop, cz - 1.4, 1.0, 0.5, "emitCoolSoft");
  downlight(kit, dx, yTop, cz + 1.4, 1.0, 0.5, "emitCoolSoft");

  // ------------------------------------------------------------ signal boards facing the entrance, either side of the door path
  signalBoard(kit, 6.0, y0, 507.4, "-x", { screen: "screen9", side: "screen8" });
  signalBoard(kit, 6.0, y0, 514.6, "-x", { screen: "screen8", side: "screen10" });
  // guide strips from the door to the dais
  floorStrip(kit, [x0 + 1.4, cz - 1.9], [dx - 1.9, cz - 1.9], y0, "emitCoolSoft", { w: 0.04 });
  floorStrip(kit, [x0 + 1.4, cz + 1.9], [dx - 1.9, cz + 1.9], y0, "emitCoolSoft", { w: 0.04 });

  // cross trays and antenna feed conduits from the forward array wall to the display wall
  for (const tz of [z0 + 1.8, z1 - 1.8]) cableTray(kit, [x0 + 2.2, tz], [x1 - 0.9, tz], yTop - 0.35, { w: 0.5 });
  for (const [pz, r, col] of [[cz - 0.9, 0.11, P.steel], [cz - 0.5, 0.08, P.gunmetal], [cz + 0.6, 0.11, P.steel], [cz + 1.0, 0.06, P.orange]]) {
    pipe(kit, [x0 + 3.2, yTop - 0.36, pz], [x1 - 0.5, yTop - 0.36, pz], r, { color: col });
  }
  // conduit drops behind the display counter
  for (const dz of [504.5, 511, 517.5]) pipe(kit, [x1 - 0.45, y0 + 1.0, dz], [x1 - 0.45, yTop - 0.36, dz], 0.09, { color: P.steel, clamps: false });

  // ------------------------------------------------------------ comms array racks + headset racks (port wall, flanking the door)
  const Wf = shell.frames["-x"].frame; // u = z1 - z, 0..18, door at u 8..10
  for (const u of [1.2, 2.2, 3.2, 4.2]) rack(Wf, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  for (const u of [13.8, 14.8, 15.8, 16.8]) rack(Wf, u, 0.9, 2.45, 0.7, { blink, units: 5 });
  cabinet(Wf, 5.9, 1.4, 2.1, 0.55, { color: P.creamDark, label: 12, lamp: "emitTeal", band: P.tealPaint });
  cabinet(Wf, 12.1, 1.4, 2.1, 0.55, { color: P.creamDark, label: 6, lamp: "emitTeal", band: P.tealPaint });
  headsetRack(Wf, 7.25, 1.55);
  headsetRack(Wf, 10.75, 1.55);
  wallLightBar(Wf, 0.5, 5.0, 2.75);
  wallLightBar(Wf, 13.0, 17.5, 2.75);
  wallScreen(Wf, 5.4, 2.55, 0.9, 0.42, "screen8", { bezel: 0.04, housing: 0.06 });
  wallScreen(Wf, 12.6, 2.55, 0.9, 0.42, "screen9", { bezel: 0.04, housing: 0.06 });
  stencil(Wf, 7.2, 2.3, 0.4, 12);
  stencil(Wf, 10.8, 2.3, 0.4, 4);
  Wf.box("emitTeal", 7.2, 2.7, 0.02, 0.05, 0.05, 0.02);
  Wf.box("emitTeal", 10.8, 2.7, 0.02, 0.05, 0.05, 0.02);

  // ------------------------------------------------------------ forward wall: signal distribution
  const N = shell.frames["-z"].frame; // u = x - x0, 0..22
  for (const u of [2.5, 3.5, 4.5]) rack(N, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  for (const u of [17.5, 18.5, 19.5]) rack(N, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  // antenna feed head: a big junction cabinet with the conduits rising out of it
  cabinet(N, 11, 2.4, 2.3, 0.7, { color: P.gunmetal, doors: 2, band: P.orange, vents: true, label: 5, lamp: "emitOrange" });
  for (const du of [-0.9, -0.5, 0.6, 1.0]) N.cylV("metal", 11 + du, 2.3 + (h - 2.3) / 2, 0.35, 0.09, h - 2.3, { color: du < 0 ? P.steel : P.gunmetal, segments: 12 });
  N.box("hazard", 11, 2.36, 0.72, 2.0, 0.06, 0.01, { texel: 3 });
  wallConsole(N, 7.5, 1.4, "screen8");
  wallConsole(N, 14.5, 1.4, "screen10");
  wallLightBar(N, 5.4, 9.6, 2.75);
  wallLightBar(N, 12.4, 16.6, 2.75);
  wallScreen(N, 7.5, 2.15, 1.5, 0.8, "screen9", { bezel: 0.05 });
  wallScreen(N, 14.5, 2.15, 1.5, 0.8, "screen7", { bezel: 0.05 });
  stencil(N, 0.7, 1.8, 0.4, 5);
  stencil(N, 21.3, 1.8, 0.4, 1);

  // ------------------------------------------------------------ aft wall: antenna schematic wall with dish models over a counter
  const A = shell.frames["+z"].frame; // u = x1 - x, 0..22
  for (const u of [2.5, 3.5, 4.5, 17.5, 18.5, 19.5]) rack(A, u, 0.9, 2.45, 0.7, { blink, units: 5 });
  cabinet(A, 6.2, 1.4, 2.1, 0.55, { color: P.creamDark, label: 9, lamp: "emitTeal", band: P.tealPaint });
  cabinet(A, 15.8, 1.4, 2.1, 0.55, { color: P.creamDark, label: 14, lamp: "emitTeal", band: P.tealPaint });
  // counter
  A.box("metal", 11, 0.05, 0.26, 7.6, 0.1, 0.46, { color: P.darkMetal });
  A.box("satinBlack", 11, 0.5, 0.24, 7.8, 0.8, 0.48);
  A.box("metal", 11, 0.915, 0.26, 7.9, 0.03, 0.54, { color: P.steel });
  for (let i = 0; i < 5; i++) {
    const u = 8.0 + i * 1.5;
    A.box("paintedMetal", u, 0.55, 0.49, 1.2, 0.55, 0.02, { color: i % 2 ? P.gunmetal : P.slate, texel: 2 });
    A.box("leds", u - 0.15, 0.7, 0.505, 0.7, 0.03, 0.006, { uv: "keep" });
    for (let c = 0; c < 5; c++) blink.dot(A, u - 0.35 + c * 0.14, 0.4, 0.51, 0.028);
  }
  A.collider(7.1, 14.9, 0, 0.95, 0, 0.56, "counter");
  // schematic board: ship schematic centre, data columns and radar either side, LED readout row
  A.box("satinBlack", 11, 2.0, 0.03, 7.4, 1.7, 0.06);
  wallScreen(A, 11, 2.05, 3.2, 1.15, "screen7", { bezel: 0.04, housing: 0.07, leds: true });
  wallScreen(A, 8.35, 2.25, 1.35, 0.75, "screen9", { bezel: 0.04, housing: 0.07 });
  wallScreen(A, 13.65, 2.25, 1.35, 0.75, "screen8", { bezel: 0.04, housing: 0.07 });
  wallScreen(A, 8.35, 1.45, 1.35, 0.5, "screen10", { bezel: 0.04, housing: 0.07 });
  wallScreen(A, 13.65, 1.45, 1.35, 0.5, "screen4", { bezel: 0.04, housing: 0.07 });
  A.box("emitTeal", 11, 2.9, 0.062, 7.0, 0.02, 0.01);
  // dish models on brackets either side of the board
  for (const u of [6.0, 16.0]) {
    A.box("metal", u, 2.2, 0.12, 0.08, 0.7, 0.24, { color: P.gunmetal });
    A.box("metal", u, 2.55, 0.28, 0.06, 0.06, 0.34, { color: P.steel });
    A.cylN("metal", u, 2.55, 0.5, 0.34, 0.2, { r2: 0.06, open: true, color: P.steel, segments: 24 });
    A.cylN("metal", u, 2.55, 0.62, 0.02, 0.28, { color: P.darkMetal, segments: 8 });
    A.box("emitTeal", u, 2.55, 0.77, 0.05, 0.05, 0.03);
    A.box("leds", u, 1.72, 0.05, 0.4, 0.03, 0.01, { uv: "keep" });
  }
  wallLightBar(A, 0.8, 5.2, 2.75);
  wallLightBar(A, 16.8, 21.2, 2.75);
  stencil(A, 0.8, 1.8, 0.4, 12);
  stencil(A, 21.2, 1.8, 0.4, 6);
  effects(kit, 12.4, y0 + 0.93, z1 - 0.3, "datapad", 0.4);
  effects(kit, 10.6, y0 + 0.93, z1 - 0.28, "mug");
  effects(kit, 14.0, y0 + 0.93, z1 - 0.3, "stack", 0.2);
  effects(kit, x1 - 0.36, y0 + 0.97, 507.3, "datapad", 0.4);
  effects(kit, x1 - 0.36, y0 + 0.97, 514.2, "mug");
  effects(kit, x1 - 0.36, y0 + 0.97, 509.6, "stack", 0.2);

  // ------------------------------------------------------------ ceiling fixtures + lights
  for (const fx of [6.5, 12.5, 18.5]) for (const fz of [505.5, 516.5]) downlight(kit, fx, yTop, fz, 0.5, 0.5, "emitCoolSoft");
  for (const fz of [509.3, 512.7]) downlight(kit, x0 + 2.0, yTop, fz, 0.5, 0.5, "emitCoolSoft");
  // a 3x3 grid of strong cool practicals on the downlight lines plus a fill just inside the door (the
  // foreground boards and dais), two teal accents washing the rack walls and one over the dais: 13
  // fixtures so the 14-slot pool holds the whole room
  const L = ctx.lights;
  for (const gx of [6.5, 12.5, 18.5]) for (const gz of [505.5, 511, 516.5]) L.cool.push(pointLight(0xd8f0ff, 15, 14, [gx, yTop - 0.7, gz]));
  L.cool.push(pointLight(0xd8f0ff, 11, 9, [x0 + 2.0, yTop - 0.6, cz]));
  L.teal.push(pointLight(0x62d9c9, 5, 8, [x0 + 1.4, y0 + 2.2, z1 - 3.3]));
  L.teal.push(pointLight(0x62d9c9, 5, 8, [x0 + 1.4, y0 + 2.2, z0 + 3.3]));
  L.teal.push(pointLight(0x62d9c9, 4, 5, [dx + 0.6, daisY + 1.5, cz]));
  blink.finish("commsIndicators");
  return shell;
}

// Free-standing signal board: a black post on a steel foot carrying a large reclined display toward
// `facing`, a small side readout on its flank, a ledge with an LED row and a status lamp on top.
function signalBoard(kit, cx, y, cz, facing, opts = {}) {
  const { screen = "screen9", side = "screen8", w = 1.6, h = 1.0 } = opts;
  const f = facingFrame(kit, cx, y, cz, facing);
  f.box("metal", 0, 0.04, 0, 1.0, 0.08, 0.6, { color: P.darkMetal });
  f.box("emitTeal", 0, 0.05, 0.28, 0.6, 0.02, 0.01);
  f.box("satinBlack", 0, 0.55, -0.1, 0.16, 1.0, 0.16);
  f.box("satinBlack", 0, 0.96, 0.08, w - 0.3, 0.08, 0.36);
  const lean = leaningBox(f, "satinBlack", 0, 0.98, -0.05, w, h, 0.08, -0.18);
  const [fv, fn] = lean.face(0.004);
  f.box("darkGloss", 0, fv, fn, w - 0.08, h - 0.1, 0.008, { tilt: -0.18 });
  f.box(screen, 0, fv, fn + 0.006, w - 0.14, h - 0.18, 0.004, { tilt: -0.18, uv: "keep" });
  const [lv, ln] = lean.at(0.06, 0.004);
  f.box("leds", -0.1, lv, ln, w * 0.5, 0.03, 0.006, { tilt: -0.18, uv: "keep" });
  f.box("emitTeal", w / 2 - 0.1, lv, ln, 0.06, 0.03, 0.006, { tilt: -0.18 });
  // ledge, and a second readout on the front of the post
  f.box("satinBlack", 0, 0.92, 0.22, w - 0.4, 0.05, 0.3);
  f.box("darkGloss", 0, 0.946, 0.24, w - 0.6, 0.008, 0.2);
  f.box("leds", 0, 0.951, 0.3, w - 0.8, 0.004, 0.03, { uv: "keep" });
  f.box("satinBlack", 0, 0.55, -0.03, 0.56, 0.36, 0.03);
  f.box("darkGloss", 0, 0.55, -0.01, 0.5, 0.3, 0.012);
  f.box(side, 0, 0.55, -0.002, 0.44, 0.24, 0.004, { uv: "keep" });
  const [tv, tn] = lean.at(h - 0.02, 0.0);
  f.box("emitTeal", 0, tv + 0.03, tn - 0.04, 0.3, 0.03, 0.04);
  f.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, 2.0, -0.35, 0.4, "signalboard");
}

// Wall-mounted headset rack: steel rail on two brackets with four headsets (band, earcups, boom mic).
function headsetRack(frame, u, v) {
  frame.box("metal", u, v, 0.05, 1.0, 0.03, 0.03, { color: P.steel });
  for (const s of [-1, 1]) frame.box("metal", u + s * 0.45, v, 0.03, 0.04, 0.06, 0.06, { color: P.darkMetal });
  for (let i = 0; i < 4; i++) {
    const hu = u - 0.36 + i * 0.24;
    frame.cylN("metal", hu, v - 0.04, 0.06, 0.012, 0.09, { color: P.steel, segments: 6 });
    frame.box("satinBlack", hu, v - 0.13, 0.08, 0.16, 0.03, 0.03);
    frame.box("satinBlack", hu - 0.07, v - 0.2, 0.08, 0.025, 0.12, 0.03);
    frame.box("satinBlack", hu + 0.07, v - 0.2, 0.08, 0.025, 0.12, 0.03);
    frame.box("rubber", hu - 0.075, v - 0.28, 0.085, 0.06, 0.07, 0.05, { color: P.rubber });
    frame.box("rubber", hu + 0.075, v - 0.28, 0.085, 0.06, 0.07, 0.05, { color: P.rubber });
    frame.box("metal", hu + 0.09, v - 0.34, 0.1, 0.012, 0.1, 0.012, { color: P.darkMetal, tilt: 0.5 });
    frame.box(i % 2 ? "emitTeal" : "emitAmber", hu - 0.075, v - 0.3, 0.111, 0.012, 0.012, 0.004);
  }
  frame.collider(u - 0.55, u + 0.55, v - 0.45, v + 0.05, 0, 0.14, "headsets");
}
