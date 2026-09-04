// Restricted intelligence room: a sealed, red-lit briefing space. Dark panel shell, a secure
// conference table with six chairs under a red pendant, a wall of red-tinted screens over an
// analysis counter, a heavy data vault flanked by lockers, the lock panel with its amber lamp by the
// door, and restricted-area stencils on every wall.
import * as THREE from "three";
import { roomShell, wallConsole, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { customWall, wallScreen, table, chair, cabinet, stencil, effects } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "dark", skipWalls: ["+x"], lightRows: 2, lightMat: "emitRedSoft", lights: false, seed: 37 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2; // 9
  const cz = (z0 + z1) / 2; // 533

  // ------------------------------------------------------------ conference table + chairs
  table(kit, cx, y0, cz, 3.2, 1.2, { h: 0.75, inlay: "screen5" });
  kit.cyl("satinBlack", cx, y0 + 0.775, cz, 0.14, 0.03, "y", { segments: 20 });
  kit.add("emitRed", new THREE.TorusGeometry(0.11, 0.008, 6, 32), { pos: [cx, y0 + 0.792, cz], rot: [Math.PI / 2, 0, 0] });
  for (const dx of [-1.1, 0, 1.1]) {
    chair(kit, cx + dx, y0, cz - 1.15, "+z", { seatColor: P.fabricOrange });
    chair(kit, cx + dx, y0, cz + 1.15, "-z", { seatColor: P.fabricOrange });
  }
  effects(kit, cx - 1.1, y0 + 0.75, cz - 0.35, "datapad", 0.2);
  effects(kit, cx + 1.2, y0 + 0.75, cz + 0.35, "datapad", -0.4);
  effects(kit, cx + 0.2, y0 + 0.75, cz + 0.42, "mug");
  effects(kit, cx - 0.6, y0 + 0.75, cz - 0.42, "stack", 0.15);
  // pendant over the table
  kit.box("satinBlack", cx, yTop - 0.1, cz, 2.6, 0.2, 0.7);
  kit.box("emitRedSoft", cx, yTop - 0.205, cz, 2.3, 0.01, 0.45, { uv: "keep" });
  for (const s of [-1, 1]) kit.cyl("metal", cx + s * 1.0, yTop - 0.24, cz, 0.02, 0.5, "y", { color: P.darkMetal, segments: 8 });

  // ------------------------------------------------------------ red screen wall (starboard, +x)
  const disp = customWall(kit, room, "+x", y0, { styles: { panel: 1 }, paints: [[P.darkMetal, 0.7], [P.gunmetal, 0.3]], seed: 71 });
  const D = disp.frame; // u = z - z0, 0..14
  for (const u of [2.5, 5.5, 8.5, 11.5]) {
    wallScreen(D, u, 1.95, 2.4, 1.3, "screen5", { leds: false });
    D.box("emitRed", u - 1.28, 2.6, 0.05, 0.04, 0.12, 0.02);
    D.box("emitRed", u + 1.28, 2.6, 0.05, 0.04, 0.12, 0.02);
  }
  D.box("metal", 7, 0.05, 0.25, 12.2, 0.1, 0.44, { color: P.darkMetal });
  D.box("satinBlack", 7, 0.5, 0.23, 12.6, 0.8, 0.46);
  D.box("metal", 7, 0.915, 0.25, 12.7, 0.03, 0.52, { color: P.steel });
  for (let i = 0; i < 6; i++) {
    const u = 1.7 + i * 2.15;
    D.box("darkGloss", u, 0.935, 0.3, 1.2, 0.01, 0.3);
    D.box("leds", u, 0.94, 0.42, 1.0, 0.004, 0.04, { uv: "keep" });
    D.box("paintedMetal", u, 0.55, 0.47, 1.4, 0.55, 0.02, { color: i % 2 ? P.gunmetal : P.slate, texel: 2 });
    D.box("emitRed", u + 0.5, 0.72, 0.485, 0.05, 0.03, 0.008);
    D.box("leds", u - 0.2, 0.42, 0.485, 0.7, 0.03, 0.006, { uv: "keep" });
  }
  stencil(D, 0.7, 0.62, 0.36, 8, { n: 0.49 });
  stencil(D, 13.3, 0.62, 0.36, 8, { n: 0.49 });
  D.collider(0.5, 13.5, 0, 0.95, 0, 0.55, "counter");
  D.box("satinBlack", 7, 2.82, 0.02, 13.4, 0.05, 0.04);
  wallLightBar(D, 0.4, 2.2, 2.7, "emitRedSoft");
  wallLightBar(D, 11.8, 13.6, 2.7, "emitRedSoft");

  // ------------------------------------------------------------ data vault wall (forward, -z)
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
  cabinet(N, 5.1, 1.0, 2.1, 0.5, { color: P.gunmetal, doors: 1, band: P.orange, label: 9, lamp: "emitRed" });
  cabinet(N, 8.9, 1.0, 2.1, 0.5, { color: P.gunmetal, doors: 1, band: P.orange, label: 6, lamp: "emitRed" });
  wallConsole(N, 2.4, 1.4, "screen5");
  wallConsole(N, 11.6, 1.4, "screen5");
  wallScreen(N, 2.4, 1.95, 1.2, 0.6, "screen5", { bezel: 0.05 });
  wallScreen(N, 11.6, 1.95, 1.2, 0.6, "screen5", { bezel: 0.05 });
  wallLightBar(N, 0.4, 4.2, 2.7, "emitRedSoft");
  wallLightBar(N, 9.8, 13.6, 2.7, "emitRedSoft");
  stencil(N, 0.7, 1.9, 0.4, 1);
  stencil(N, 13.3, 1.9, 0.4, 1);

  // ------------------------------------------------------------ door wall with the lock panel (port, -x)
  const W = shell.frames["-x"].frame; // u = z1 - z, 0..14, door at u 6.2..7.8
  const lu = 5.35;
  W.box("satinBlack", lu, 1.38, 0.04, 0.5, 0.78, 0.08);
  W.box("darkGloss", lu, 1.6, 0.082, 0.38, 0.2, 0.006);
  W.box("screen5", lu, 1.6, 0.087, 0.34, 0.16, 0.004, { uv: "keep" });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) W.box("rubber", lu - 0.08 + c * 0.08, 1.12 + r * 0.08, 0.09, 0.05, 0.05, 0.02, { color: P.rubber });
  W.box("emitAmber", lu, 1.72, 0.084, 0.3, 0.05, 0.008);
  W.box("leds", lu, 1.04, 0.084, 0.3, 0.025, 0.006, { uv: "keep" });
  W.cylN("metal", lu + 0.18, 1.12, 0.086, 0.03, 0.012, { color: P.steel, segments: 12 });
  stencil(W, lu, 2.1, 0.44, 1);
  stencil(W, 8.7, 2.1, 0.44, 8);
  stencil(W, 8.7, 1.5, 0.44, 10);
  W.box("satinBlack", 8.7, 1.05, 0.03, 0.5, 0.1, 0.06);
  W.box("emitRed", 8.7, 1.05, 0.062, 0.44, 0.04, 0.01);
  cabinet(W, 2.2, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 13, lamp: "emitRed" });
  cabinet(W, 11.8, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 9, lamp: "emitAmber" });
  wallLightBar(W, 0.4, 5.0, 2.7, "emitRedSoft");
  wallLightBar(W, 9.0, 13.6, 2.7, "emitRedSoft");
  wallScreen(W, 4.2, 1.95, 1.2, 0.6, "screen5", { bezel: 0.05 });
  wallScreen(W, 9.8, 1.95, 1.2, 0.6, "screen5", { bezel: 0.05 });

  // ------------------------------------------------------------ aft wall (+z): safes and a signals console
  const A = shell.frames["+z"].frame; // u = x1 - x, 0..14
  cabinet(A, 2.4, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 9, lamp: "emitRed" });
  cabinet(A, 11.6, 1.4, 2.1, 0.5, { color: P.gunmetal, doors: 2, band: P.orange, label: 6, lamp: "emitRed" });
  wallConsole(A, 7, 1.6, "screen5");
  wallScreen(A, 5.5, 1.95, 1.5, 0.8, "screen5", { bezel: 0.05 });
  wallScreen(A, 8.5, 1.95, 1.5, 0.8, "screen5", { bezel: 0.05 });
  A.box("emitRed", 7, 2.2, 0.03, 0.05, 0.5, 0.02);
  wallLightBar(A, 0.4, 4.4, 2.7, "emitRedSoft");
  wallLightBar(A, 9.6, 13.6, 2.7, "emitRedSoft");
  stencil(A, 4.0, 2.5, 0.36, 10);
  stencil(A, 10.0, 2.5, 0.36, 10);
  stencil(A, 0.7, 1.9, 0.4, 5);
  stencil(A, 13.3, 1.9, 0.4, 5);

  // red-tinted floor guide from the door to the table
  kit.box("satinBlack", x0 + 1.6, y0 + 0.004, cz, 3.2, 0.008, 2.4);
  kit.box("hazard", x0 + 0.5, y0 + 0.006, cz, 0.6, 0.006, 1.6, { texel: 3 });

  // ------------------------------------------------------------ red lighting
  const L = ctx.lights;
  for (const [lx, lz] of [[cx - 3.5, cz - 3.5], [cx + 3.5, cz - 3.5], [cx - 3.5, cz + 3.5], [cx + 3.5, cz + 3.5]]) L.warm.push(pointLight(0xff5040, 14, 12, [lx, yTop - 0.5, lz]));
  L.warm.push(pointLight(0xff6a55, 10, 9, [cx, yTop - 0.6, cz]));
  L.warm.push(pointLight(0xffb347, 2.5, 4, [x0 + 0.6, y0 + 1.6, z1 - lu]));
  return shell;
}
