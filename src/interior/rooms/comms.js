// Communications and sensor control: the busiest room on the command deck. Two rows of seated
// operator stations face a wall of sensor displays; the walls behind them carry racks of blinking
// comms arrays; overhead, cable trays and antenna feed conduits run to the display wall. Green-blue
// accent, brighter than tactical.
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, station, rack, BlinkSet, cableTray, pipe, cabinet, stencil, podium, chair, downlight, effects } from "./commandKit.js";

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
  const mats = ["screen0", "screen4", "screen1", "screen3", "screen2"];
  for (let i = 0; i < 5; i++) {
    const u = 2.4 + 3.3 * i;
    wallScreen(D, u, 2.05, 3.0, 1.5, mats[i], { leds: false });
    D.box("emitTeal", u - 1.58, 2.85, 0.05, 0.05, 0.05, 0.02);
    D.box("emitTeal", u + 1.58, 2.85, 0.05, 0.05, 0.05, 0.02);
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
  const screenSets = [["screen0", "screen1"], ["screen4", "screen0"], ["screen3", "screen1"], ["screen0", "screen2"], ["screen1", "screen4"], ["screen0", "screen0"]];
  for (const [ri, rx] of [[0, 11.0], [1, 16.6]]) {
    for (let i = 0; i < rowZ.length; i++) {
      station(kit, rx, y0, rowZ[i], "-x", { w: 1.7, screens: screenSets[(i + ri) % screenSets.length], lamp: i % 3 === 0 ? "emitOrange" : "emitTeal", seatColor: P.fabricTeal });
    }
    // shared cable tray above each row
    cableTray(kit, [rx - 0.2, z0 + 1.6], [rx - 0.2, z1 - 1.6], yTop - 0.5);
  }
  // analysts' plotting tables in the entry area, either side of the door path
  for (const tz of [507.3, 514.7]) {
    const tx = 6.2;
    kit.box("metal", tx, y0 + 0.04, tz, 1.4, 0.08, 0.8, { color: P.darkMetal });
    kit.box("satinBlack", tx, y0 + 0.49, tz, 1.6, 0.82, 1.0);
    kit.box("darkGloss", tx, y0 + 0.905, tz, 1.5, 0.01, 0.9);
    kit.box("screen4", tx, y0 + 0.912, tz, 1.3, 0.004, 0.7, { uv: "keep" });
    kit.box("leds", tx, y0 + 0.6, tz + 0.505, 1.0, 0.04, 0.01, { uv: "keep" });
    kit.box("leds", tx, y0 + 0.6, tz - 0.505, 1.0, 0.04, 0.01, { uv: "keep" });
    kit.collider([tx - 0.8, y0, tz - 0.5], [tx + 0.8, y0 + 0.95, tz + 0.5], "plot");
    chair(kit, tx, y0, tz + (tz < cz ? -1.0 : 1.0), tz < cz ? "+z" : "-z");
  }
  // cross trays and antenna feed conduits from the aft array wall to the display wall
  for (const tz of [z0 + 1.8, z1 - 1.8]) cableTray(kit, [x0 + 2.2, tz], [x1 - 0.9, tz], yTop - 0.35, { w: 0.5 });
  for (const [pz, r, col] of [[cz - 0.9, 0.11, P.steel], [cz - 0.5, 0.08, P.gunmetal], [cz + 0.6, 0.11, P.steel], [cz + 1.0, 0.06, P.orange]]) {
    pipe(kit, [x0 + 3.2, yTop - 0.36, pz], [x1 - 0.5, yTop - 0.36, pz], r, { color: col });
  }
  // conduit drops behind the display counter
  for (const dz of [504.5, 511, 517.5]) pipe(kit, [x1 - 0.45, y0 + 1.0, dz], [x1 - 0.45, yTop - 0.36, dz], 0.09, { color: P.steel, clamps: false });

  // ------------------------------------------------------------ comms array racks (port wall, flanking the door)
  const Wf = shell.frames["-x"].frame; // u = z1 - z, 0..18, door at u 8..10
  for (const u of [1.2, 2.2, 3.2, 4.2]) rack(Wf, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  for (const u of [13.8, 14.8, 15.8, 16.8]) rack(Wf, u, 0.9, 2.45, 0.7, { blink, units: 5 });
  cabinet(Wf, 6.1, 1.4, 2.1, 0.55, { color: P.creamDark, label: 12, lamp: "emitTeal", band: P.tealPaint });
  cabinet(Wf, 11.9, 1.4, 2.1, 0.55, { color: P.creamDark, label: 6, lamp: "emitTeal", band: P.tealPaint });
  wallLightBar(Wf, 0.5, 5.0, 2.75);
  wallLightBar(Wf, 13.0, 17.5, 2.75);
  wallScreen(Wf, 5.4, 2.55, 0.9, 0.42, "screen4", { bezel: 0.04, housing: 0.06 });
  wallScreen(Wf, 12.6, 2.55, 0.9, 0.42, "screen0", { bezel: 0.04, housing: 0.06 });
  stencil(Wf, 7.2, 1.9, 0.42, 12);
  stencil(Wf, 10.8, 1.9, 0.42, 4);
  Wf.box("emitTeal", 7.2, 2.5, 0.02, 0.05, 0.05, 0.02);
  Wf.box("emitTeal", 10.8, 2.5, 0.02, 0.05, 0.05, 0.02);

  // ------------------------------------------------------------ forward wall: signal distribution
  const N = shell.frames["-z"].frame; // u = x - x0, 0..22
  for (const u of [2.5, 3.5, 4.5]) rack(N, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  for (const u of [17.5, 18.5, 19.5]) rack(N, u, 0.9, 2.45, 0.7, { blink, units: 6 });
  // antenna feed head: a big junction cabinet with the conduits rising out of it
  cabinet(N, 11, 2.4, 2.3, 0.7, { color: P.gunmetal, doors: 2, band: P.orange, vents: true, label: 5, lamp: "emitOrange" });
  for (const du of [-0.9, -0.5, 0.6, 1.0]) N.cylV("metal", 11 + du, 2.3 + (h - 2.3) / 2, 0.35, 0.09, h - 2.3, { color: du < 0 ? P.steel : P.gunmetal, segments: 12 });
  N.box("hazard", 11, 2.36, 0.72, 2.0, 0.06, 0.01, { texel: 3 });
  wallConsole(N, 7.5, 1.4, "screen4");
  wallConsole(N, 14.5, 1.4, "screen3");
  wallLightBar(N, 5.4, 9.6, 2.75);
  wallLightBar(N, 12.4, 16.6, 2.75);
  wallScreen(N, 7.5, 2.15, 1.5, 0.8, "screen4", { bezel: 0.05 });
  wallScreen(N, 14.5, 2.15, 1.5, 0.8, "screen1", { bezel: 0.05 });
  stencil(N, 0.7, 1.8, 0.4, 5);
  stencil(N, 21.3, 1.8, 0.4, 1);

  // ------------------------------------------------------------ aft wall: supervisor's dais
  const A = shell.frames["+z"].frame; // u = x1 - x, 0..22
  const daisY = y0 + 0.2;
  kit.boxMM("deck", [10.2, y0, z1 - 1.85], [16.2, daisY, z1 + 0.1], { color: P.impGrey, uv: "world", texel: 1 });
  kit.floor(10.2, z1 - 1.85, 16.2, z1, daisY);
  kit.boxMM("satinBlack", [10.2, y0, z1 - 1.9], [16.2, daisY, z1 - 1.84]);
  kit.box("emitTeal", 13.2, y0 + 0.1, z1 - 1.91, 5.6, 0.02, 0.012);
  podium(kit, 12.1, daisY, z1 - 1.3, "+z", { screen: "screen4", w: 1.4, d: 0.5, accent: "emitTeal" });
  podium(kit, 14.3, daisY, z1 - 1.3, "+z", { screen: "screen0", w: 1.4, d: 0.5, accent: "emitTeal" });
  chair(kit, 13.2, daisY, z1 - 0.55, "-z", { arms: false });
  for (const u of [2.5, 3.5, 4.5, 17.5, 18.5, 19.5]) rack(A, u, 0.9, 2.45, 0.7, { blink, units: 5 });
  cabinet(A, 6.6, 1.4, 2.1, 0.55, { color: P.creamDark, label: 9, lamp: "emitTeal", band: P.tealPaint });
  cabinet(A, 15.4, 1.4, 2.1, 0.55, { color: P.creamDark, label: 14, lamp: "emitTeal", band: P.tealPaint });
  wallScreen(A, 11, 1.95, 3.2, 1.1, "screen4", { leds: true });
  wallLightBar(A, 5.6, 9.0, 2.75);
  wallLightBar(A, 13.0, 16.4, 2.75);
  stencil(A, 0.8, 1.8, 0.4, 12);
  stencil(A, 21.2, 1.8, 0.4, 6);
  effects(kit, x1 - 0.36, y0 + 0.97, 507.3, "datapad", 0.4);
  effects(kit, x1 - 0.36, y0 + 0.97, 514.2, "mug");
  effects(kit, x1 - 0.36, y0 + 0.97, 509.6, "stack", 0.2);

  // ------------------------------------------------------------ ceiling fixtures + lights
  for (const fx of [6.5, 12.5, 18.5]) for (const fz of [505.5, 516.5]) downlight(kit, fx, yTop, fz, 0.5, 0.5, "emitCoolSoft");
  const L = ctx.lights;
  for (const gx of [5.2, 11.4, 17.6, 22.6]) for (const gz of [505.2, 511, 516.8]) L.cool.push(pointLight(0xd8f0ff, gx > 22 ? 5 : 6.5, 14, [gx, yTop - 0.35, gz]));
  L.teal.push(pointLight(0x62d9c9, 3.5, 7, [x0 + 1.4, y0 + 2.2, z1 - 3.3]));
  L.teal.push(pointLight(0x62d9c9, 3.5, 7, [x0 + 1.4, y0 + 2.2, z0 + 3.3]));
  L.teal.push(pointLight(0x62d9c9, 3.0, 7, [11, y0 + 2.2, z0 + 1.2]));
  blink.finish("commsIndicators");
  return shell;
}
