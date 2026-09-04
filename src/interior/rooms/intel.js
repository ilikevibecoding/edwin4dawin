// Restricted intelligence room: a sealed, red-lit briefing space that still reads. Dark panel shell, a
// secure conference table for eight under a red pendant with cool desk lamps and classified cases on
// it, two analyst desks with blue data monitors facing a sector-map wall aft, a wall of red and blue
// screens over an analysis counter, a heavy data vault flanked by two document safes and lockers
// forward, the lock panel with its amber lamp by the door, restricted-area stencils on every wall.
// Red is the identity; cool secondary keys (screen glow, desk lamps, a neutral fill) keep the
// materials legible.
import * as THREE from "three";
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, table, chair, cabinet, stencil, effects, desk, podium, downlight, floorStrip } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "dark", skipWalls: ["+x"], lightRows: 2, lightMat: "emitRedSoft", lights: false, seed: 37 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2; // 9
  const cz = (z0 + z1) / 2; // 533

  // ------------------------------------------------------------ conference table for eight, cases and lamps
  table(kit, cx, y0, cz, 4.2, 1.4, { h: 0.75, inlay: "screen5" });
  kit.cyl("satinBlack", cx, y0 + 0.775, cz, 0.14, 0.03, "y", { segments: 20 });
  kit.add("emitRed", new THREE.TorusGeometry(0.11, 0.008, 6, 32), { pos: [cx, y0 + 0.792, cz], rot: [Math.PI / 2, 0, 0] });
  for (const dx of [-1.55, -0.5, 0.5, 1.55]) {
    chair(kit, cx + dx, y0, cz - 1.25, "+z", { seatColor: P.fabricOrange });
    chair(kit, cx + dx, y0, cz + 1.25, "-z", { seatColor: P.fabricOrange });
  }
  effects(kit, cx - 1.5, y0 + 0.75, cz - 0.4, "datapad", 0.2);
  effects(kit, cx + 1.6, y0 + 0.75, cz + 0.4, "datapad", -0.4);
  effects(kit, cx + 0.6, y0 + 0.75, cz + 0.45, "mug");
  effects(kit, cx - 0.7, y0 + 0.75, cz - 0.45, "folder", 0.15);
  effects(kit, cx + 1.0, y0 + 0.75, cz - 0.42, "case", 0.1);
  effects(kit, cx - 1.6, y0 + 0.75, cz + 0.42, "case", -0.2);
  effects(kit, cx + 0.1, y0 + 0.75, cz + 0.5, "folder", -0.6);
  effects(kit, cx - 1.95, y0 + 0.75, cz, "coolLamp", Math.PI / 2);
  effects(kit, cx + 1.95, y0 + 0.75, cz, "coolLamp", -Math.PI / 2);
  // pendant over the table
  kit.box("satinBlack", cx, yTop - 0.1, cz, 3.4, 0.2, 0.7);
  kit.box("emitRedSoft", cx, yTop - 0.205, cz, 3.1, 0.01, 0.45, { uv: "keep" });
  for (const s of [-1, 1]) kit.cyl("metal", cx + s * 1.4, yTop - 0.24, cz, 0.02, 0.5, "y", { color: P.darkMetal, segments: 8 });

  // ------------------------------------------------------------ analyst desks facing the map wall (aft)
  for (const [ax, sc] of [[5.6, "screen9"], [12.4, "screen9"]]) {
    desk(kit, ax, y0, z1 - 2.4, "-z", { w: 1.7, d: 0.75, color: P.gunmetal, screen: sc });
    chair(kit, ax, y0, z1 - 3.35, "+z", { seatColor: P.fabricOrange });
    effects(kit, ax + 0.55, y0 + 0.76, z1 - 2.2, "coolLamp", ax < cx ? 0.4 : Math.PI - 0.4);
    effects(kit, ax + 0.25, y0 + 0.76, z1 - 2.55, "folder", 0.3);
    effects(kit, ax - 0.55, y0 + 0.76, z1 - 2.6, "mug");
    // kept clear of the shell's ceiling ribs at x 5.5 / 12.5
    downlight(kit, ax + 0.8, yTop, z1 - 2.6, 0.6, 0.3, "emitCoolSoft");
  }

  // ------------------------------------------------------------ standing consoles before the vault wall (forward)
  podium(kit, 5.6, y0, z0 + 3.2, "+z", { screen: "screen5", rear: "screen9", accent: "emitRed" });
  podium(kit, 12.4, y0, z0 + 3.2, "+z", { screen: "screen9", rear: "screen5", accent: "emitRed" });

  // ------------------------------------------------------------ screen wall (starboard, +x): red and blue displays over the analysis counter
  const disp = customWall(kit, room, "+x", y0, { styles: { panel: 1 }, paints: [[P.darkMetal, 0.7], [P.gunmetal, 0.3]], seed: 71 });
  const D = disp.frame; // u = z - z0, 0..14
  const wallMats = ["screen5", "screen9", "screen8", "screen5"];
  [2.5, 5.5, 8.5, 11.5].forEach((u, i) => {
    wallScreen(D, u, 1.95, 2.4, 1.3, wallMats[i], { leds: false });
    D.box("emitRed", u - 1.28, 2.6, 0.05, 0.04, 0.12, 0.02);
    D.box("emitRed", u + 1.28, 2.6, 0.05, 0.04, 0.12, 0.02);
  });
  D.box("metal", 7, 0.05, 0.25, 12.2, 0.1, 0.44, { color: P.darkMetal });
  D.box("satinBlack", 7, 0.5, 0.23, 12.6, 0.8, 0.46);
  D.box("metal", 7, 0.915, 0.25, 12.7, 0.03, 0.52, { color: P.steel });
  for (let i = 0; i < 6; i++) {
    const u = 1.7 + i * 2.15;
    D.box("darkGloss", u, 0.935, 0.3, 1.2, 0.01, 0.3);
    D.box(i % 2 ? "screen9" : "screen10", u, 0.94, 0.3, 1.1, 0.004, 0.24, { uv: "keep" });
    D.box("leds", u, 0.94, 0.47, 1.0, 0.004, 0.03, { uv: "keep" });
    D.box("paintedMetal", u, 0.55, 0.47, 1.4, 0.55, 0.02, { color: i % 2 ? P.gunmetal : P.slate, texel: 2 });
    D.box("emitRed", u + 0.5, 0.72, 0.485, 0.05, 0.03, 0.008);
    D.box("leds", u - 0.2, 0.42, 0.485, 0.7, 0.03, 0.006, { uv: "keep" });
  }
  effects(kit, x1 - 0.3, y0 + 0.93, z0 + 4.0, "case", 0.5);
  effects(kit, x1 - 0.32, y0 + 0.93, z0 + 9.9, "folder", -0.3);
  effects(kit, x1 - 0.3, y0 + 0.93, z0 + 10.4, "mug");
  stencil(D, 0.7, 0.62, 0.36, 8, { n: 0.49 });
  stencil(D, 13.3, 0.62, 0.36, 8, { n: 0.49 });
  D.collider(0.5, 13.5, 0, 0.95, 0, 0.55, "counter");
  D.box("satinBlack", 7, 2.82, 0.02, 13.4, 0.05, 0.04);
  wallLightBar(D, 0.4, 2.2, 2.7, "emitRedSoft");
  wallLightBar(D, 11.8, 13.6, 2.7, "emitRedSoft");

  // ------------------------------------------------------------ data vault wall (forward, -z): vault, two document safes, lockers
  const N = shell.frames["-z"].frame; // u = x - x0, 0..14
  const vu = 7;
  N.box("paintedMetal", vu, 1.15, 0.375, 1.6, 2.3, 0.75, { color: P.darkMetal, texel: 1 });
  N.box("metal", vu, 1.2, 0.765, 1.34, 1.9, 0.03, { color: P.gunmetal, texel: 1.5 });
  N.box("metal", vu, 2.25, 0.4, 1.7, 0.1, 0.8, { color: P.steel, texel: 1.5 });
  N.box("hazard", vu, 2.16, 0.79, 1.34, 0.08, 0.01, { texel: 3 });
  N.cylN("metal", vu, 1.3, 0.8, 0.44, 0.04, { color: P.steel, segments: 40 });
  N.add("metalRough", new THREE.TorusGeometry(0.45, 0.045, 8, 40), vu, 1.3, 0.81, { color: P.darkMetal, uv: "scale", uvScale: [4, 1] });
  for (let k = 0; k < 3; k++) N.box("metal", vu, 1.3, 0.835, 0.82, 0.05, 0.03, { color: P.gunmetal, spin: (k * Math.PI) / 3 });
  N.cylN("metal", vu, 1.3, 0.86, 0.1, 0.03, { color: P.darkMetal, segments: 20 });
  N.box("satinBlack", vu + 0.62, 0.95, 0.795, 0.2, 0.3, 0.03);
  N.box("leds", vu + 0.62, 1.04, 0.812, 0.15, 0.02, 0.005, { uv: "keep" });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) N.box("rubber", vu + 0.57 + c * 0.05, 0.86 + r * 0.05, 0.815, 0.03, 0.03, 0.01, { color: P.rubber });
  N.box("emitAmber", vu + 0.62, 1.16, 0.8, 0.1, 0.05, 0.01);
  stencil(N, vu - 0.5, 0.62, 0.34, 5, { n: 0.785 });
  stencil(N, vu + 0.5, 0.62, 0.34, 10, { n: 0.785 });
  N.collider(vu - 0.85, vu + 0.85, 0, 2.35, 0, 0.85, "vault");
  for (const su of [4.7, 9.3]) safe(N, su);
  cabinet(N, 3.2, 1.0, 2.1, 0.5, { color: P.gunmetal, doors: 1, band: P.orange, label: 9, lamp: "emitRed" });
  cabinet(N, 10.8, 1.0, 2.1, 0.5, { color: P.gunmetal, doors: 1, band: P.orange, label: 6, lamp: "emitRed" });
  wallConsole(N, 1.6, 1.3, "screen9");
  wallConsole(N, 12.4, 1.3, "screen5");
  wallScreen(N, 1.6, 1.95, 1.2, 0.6, "screen10", { bezel: 0.05 });
  wallScreen(N, 12.4, 1.95, 1.2, 0.6, "screen9", { bezel: 0.05 });
  wallLightBar(N, 0.4, 2.6, 2.7, "emitRedSoft");
  wallLightBar(N, 11.4, 13.6, 2.7, "emitRedSoft");
  stencil(N, 5.6, 2.55, 0.4, 0);
  stencil(N, 8.4, 2.55, 0.4, 1);

  // ------------------------------------------------------------ door wall with the lock panel (port, -x)
  const Wf = shell.frames["-x"].frame; // u = z1 - z, 0..14, door at u 6.2..7.8
  const lu = 5.35;
  Wf.box("satinBlack", lu, 1.38, 0.04, 0.5, 0.78, 0.08);
  Wf.box("darkGloss", lu, 1.6, 0.082, 0.38, 0.2, 0.006);
  Wf.box("screen5", lu, 1.6, 0.087, 0.34, 0.16, 0.004, { uv: "keep" });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) Wf.box("rubber", lu - 0.08 + c * 0.08, 1.12 + r * 0.08, 0.09, 0.05, 0.05, 0.02, { color: P.rubber });
  Wf.box("emitAmber", lu, 1.72, 0.084, 0.3, 0.05, 0.008);
  Wf.box("leds", lu, 1.04, 0.084, 0.3, 0.025, 0.006, { uv: "keep" });
  Wf.cylN("metal", lu + 0.18, 1.12, 0.086, 0.03, 0.012, { color: P.steel, segments: 12 });
  stencil(Wf, lu, 2.1, 0.44, 1);
  stencil(Wf, 8.7, 2.1, 0.44, 8);
  stencil(Wf, 8.7, 1.5, 0.44, 10);
  Wf.box("satinBlack", 8.7, 1.05, 0.03, 0.5, 0.1, 0.06);
  Wf.box("emitRed", 8.7, 1.05, 0.062, 0.44, 0.04, 0.01);
  cabinet(Wf, 2.2, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 13, lamp: "emitRed" });
  cabinet(Wf, 11.8, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 9, lamp: "emitAmber" });
  wallLightBar(Wf, 0.4, 5.0, 2.7, "emitRedSoft");
  wallLightBar(Wf, 9.0, 13.6, 2.7, "emitRedSoft");
  wallScreen(Wf, 4.2, 1.95, 1.2, 0.6, "screen7", { bezel: 0.05 });
  wallScreen(Wf, 9.8, 1.95, 1.2, 0.6, "screen5", { bezel: 0.05 });

  // ------------------------------------------------------------ aft wall (+z): sector-map wall between two safes
  const A = shell.frames["+z"].frame; // u = x1 - x, 0..14
  cabinet(A, 1.6, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 9, lamp: "emitRed" });
  cabinet(A, 12.4, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 6, lamp: "emitRed" });
  A.box("satinBlack", 7, 1.75, 0.03, 8.2, 2.1, 0.06);
  A.box("painted", 7, 1.75, 0.062, 8.0, 1.96, 0.006, { color: P.darkMetal, uv: "keep" });
  wallScreen(A, 7, 1.85, 3.0, 1.5, "screen8", { bezel: 0.05, housing: 0.08, leds: true });
  for (const s of [-1, 1]) {
    wallScreen(A, 7 + s * 2.55, 2.25, 1.6, 0.75, s < 0 ? "screen9" : "screen7", { bezel: 0.04, housing: 0.07 });
    wallScreen(A, 7 + s * 2.55, 1.35, 1.6, 0.75, s < 0 ? "screen5" : "screen9", { bezel: 0.04, housing: 0.07 });
    A.box("emitRed", 7 + s * 3.6, 1.8, 0.07, 0.05, 1.5, 0.02);
  }
  A.box("emitRed", 7, 2.75, 0.07, 7.6, 0.03, 0.01);
  stencil(A, 7, 0.55, 0.5, 0, { n: 0.07 });
  stencil(A, 3.5, 0.6, 0.4, 10, { n: 0.07 });
  stencil(A, 10.5, 0.6, 0.4, 10, { n: 0.07 });
  A.collider(2.9, 11.1, 0, 2.85, 0, 0.1, "mapwall");
  wallLightBar(A, 0.4, 2.6, 2.7, "emitRedSoft");
  wallLightBar(A, 11.4, 13.6, 2.7, "emitRedSoft");
  stencil(A, 0.6, 1.9, 0.4, 5);
  stencil(A, 13.4, 1.9, 0.4, 5);
  for (const lx of [7.2, 10.8]) downlight(kit, lx, yTop, z1 - 0.7, 1.2, 0.3, "emitCoolSoft");

  // red-tinted floor guide from the door to the table
  kit.box("satinBlack", x0 + 1.6, y0 + 0.004, cz, 3.2, 0.008, 2.4);
  kit.box("hazard", x0 + 0.5, y0 + 0.006, cz, 0.6, 0.006, 1.6, { texel: 3 });
  floorStrip(kit, [x0 + 3.3, cz - 1.15], [cx - 2.4, cz - 1.15], y0, "emitRedSoft", { w: 0.04 });
  floorStrip(kit, [x0 + 3.3, cz + 1.15], [cx - 2.4, cz + 1.15], y0, "emitRedSoft", { w: 0.04 });

  // ------------------------------------------------------------ lighting: red key, cool secondaries, neutral fill
  const L = ctx.lights;
  for (const [lx, lz] of [[cx - 3.5, cz - 3.5], [cx + 3.5, cz - 3.5], [cx - 3.5, cz + 3.5], [cx + 3.5, cz + 3.5]]) L.warm.push(pointLight(0xff6a50, 11, 12, [lx, yTop - 0.5, lz]));
  L.warm.push(pointLight(0xff7a60, 8, 9, [cx, yTop - 0.6, cz]));
  L.warm.push(pointLight(0xffb347, 2.5, 4, [x0 + 0.6, y0 + 1.6, z1 - lu]));
  // cool: desk lamps, table lamps, the blue counter screens, the map wall
  for (const ax of [5.6, 12.4]) L.cool.push(pointLight(0xbfd4ff, 7, 6, [ax + 0.5, y0 + 1.25, z1 - 2.2]));
  L.cool.push(pointLight(0xa8c8ff, 9, 7, [cx, y0 + 1.5, cz]));
  L.cool.push(pointLight(0x8fb4ff, 10, 8, [x1 - 1.2, y0 + 1.7, cz]));
  L.cool.push(pointLight(0xa8c8ff, 10, 8, [cx, y0 + 2.2, z1 - 1.2]));
  // neutral fill (door end and far end) so the dark panels and chairs keep their material read
  L.cool.push(pointLight(0xd8dcf0, 13, 12, [x0 + 3.0, yTop - 0.6, cz]));
  L.cool.push(pointLight(0xd8dcf0, 9, 10, [x1 - 3.0, yTop - 0.6, cz]));
  return shell;
}

// Document safe against a wall frame: gunmetal body, steel door plate with a wheel, keypad, hazard band,
// status lamps.
function safe(frame, u) {
  const w = 1.2;
  const h = 2.1;
  const d = 0.55;
  frame.box("metal", u, 0.04, d / 2, w - 0.04, 0.08, d - 0.04, { color: P.darkMetal });
  frame.box("paintedMetal", u, 0.08 + (h - 0.08) / 2, d / 2, w, h - 0.08, d, { color: P.gunmetal, texel: 1 });
  frame.box("metal", u, h + 0.01, d / 2, w + 0.02, 0.02, d + 0.02, { color: P.steel });
  frame.box("metal", u, 1.25, d + 0.015, w - 0.16, 1.5, 0.03, { color: P.slate, texel: 1.5 });
  frame.add("metalRough", new THREE.TorusGeometry(0.2, 0.025, 8, 32), u - 0.15, 1.3, d + 0.06, { color: P.darkMetal, uv: "scale", uvScale: [3, 1] });
  for (let k = 0; k < 3; k++) frame.box("metal", u - 0.15, 1.3, d + 0.06, 0.38, 0.03, 0.02, { color: P.gunmetal, spin: (k * Math.PI) / 3 });
  frame.cylN("metal", u - 0.15, 1.3, d + 0.03, 0.06, 0.08, { color: P.steel, segments: 16 });
  frame.box("satinBlack", u + 0.32, 1.35, d + 0.035, 0.22, 0.34, 0.04);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) frame.box("rubber", u + 0.27 + c * 0.05, 1.24 + r * 0.05, d + 0.06, 0.03, 0.03, 0.01, { color: P.rubber });
  frame.box("leds", u + 0.32, 1.45, d + 0.058, 0.16, 0.02, 0.005, { uv: "keep" });
  frame.box("emitAmber", u + 0.32, 1.5, d + 0.058, 0.08, 0.03, 0.005);
  frame.box("hazard", u, 0.35, d + 0.006, w - 0.2, 0.08, 0.01, { texel: 3 });
  frame.box("emitRed", u - w / 2 + 0.12, h - 0.14, d + 0.012, 0.06, 0.03, 0.01);
  stencil(frame, u, 0.75, 0.3, 0, { n: d + 0.02 });
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, d + 0.1, "safe");
}
