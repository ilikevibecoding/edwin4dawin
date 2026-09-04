// Lift lobby, deck B (crew level): darker, harder-worn shell with amber light and hazard markings. A
// crew notice board over a bench, an amber deck plate and directory by the portal, chevrons at the lift
// threshold, ceiling conduits, a fire extinguisher on a bracket and a recessed emergency cabinet in a
// niche cut into the starboard wall.
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { nicheWall, cabinet, bench, wallScreen, stencil, commPanel, pipe, downlight } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "dark", skipWalls: ["+x"], lightRows: 1, lightMat: "emitWarmSoft", lights: false, seed: 67 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2;
  const darkPaints = [[P.gunmetal, 0.5], [P.slate, 0.3], [P.creamDark, 0.2]];

  // ------------------------------------------------------------ starboard wall with the emergency niche
  const niche = nicheWall(kit, room, y0, z0 + 3.0, z0 + 4.6, { seed: 69, paints: darkPaints, styles: { panel: 0.7, vent: 0.1, greeble: 0.1, strip: 0.1 } });
  const B = niche.back; // u = z - (z0 + 3), 0..1.6
  cabinet(B, 0.8, 1.3, 2.0, 0.42, { color: P.orange, doors: 2, band: P.creamDark, label: 13, lamp: "emitAmber", vents: true });
  B.box("hazard", 0.8, 2.3, 0.02, 1.4, 0.12, 0.012, { texel: 3 });
  B.box("satinBlack", 0.8, 2.62, 0.04, 0.5, 0.14, 0.08);
  B.box("emitAmber", 0.8, 2.62, 0.082, 0.4, 0.06, 0.01);
  kit.box("hazard", x1 + 0.09, y0 + 0.006, z0 + 3.8, 0.18, 0.006, 1.5, { texel: 3 });
  const [S1, S2] = niche.segs; // S1 u = z - z0 (0..3), S2 u = z - (z0 + 4.6) (0..1.4)
  commPanel(S1, 1.0, 1.45, { screen: "screen6", accent: "emitAmber" });
  stencil(S1, 2.1, 1.75, 0.42, 6);
  wallLightBar(S1, 0.4, 2.6, 2.45, "emitWarmSoft");
  // fire extinguisher on a bracket by the niche
  S2.box("metal", 0.7, 1.0, 0.06, 0.16, 0.05, 0.12, { color: P.darkMetal });
  S2.box("metal", 0.7, 0.55, 0.06, 0.16, 0.05, 0.12, { color: P.darkMetal });
  S2.cylV("painted", 0.7, 0.78, 0.11, 0.075, 0.6, { color: P.orange, uv: "keep", segments: 14 });
  S2.cylV("metal", 0.7, 1.12, 0.11, 0.03, 0.1, { color: P.steel, segments: 10 });
  S2.box("satinBlack", 0.62, 1.16, 0.11, 0.08, 0.04, 0.16);
  stencil(S2, 0.7, 1.6, 0.36, 13);
  S2.collider(0.5, 0.9, 0, 1.3, 0, 0.22, "extinguisher");
  wallLightBar(S2, 0.3, 1.1, 2.45, "emitWarmSoft");

  // ------------------------------------------------------------ aft wall: portal (auto), call panel (lift), deck plate + directory
  const A = shell.frames["+z"].frame; // u = x1 - x; portal u 3..5, lift call panel at u 2.65
  const du = 6.1;
  A.box("satinBlack", du, 1.6, 0.04, 1.4, 1.6, 0.08);
  A.box("painted", du, 1.6, 0.082, 1.3, 1.5, 0.006, { color: P.gunmetal, uv: "keep" });
  A.box("emitAmber", du, 2.3, 0.086, 1.2, 0.04, 0.008);
  wallScreen(A, du, 1.95, 1.0, 0.42, "screen6", { bezel: 0.03, housing: 0.03, n: 0.06 });
  [14, 0, 6].forEach((idx, i) => {
    const v = 1.42 - i * 0.3;
    stencil(A, du - 0.4, v, 0.26, idx, { n: 0.09 });
    A.box("emitAmber", du - 0.08, v, 0.086, 0.04, 0.04, 0.008);
    A.box("leds", du + 0.32, v, 0.086, 0.5, 0.03, 0.006, { uv: "keep" });
  });
  A.collider(du - 0.7, du + 0.7, 0, 2.4, 0, 0.1, "directory");
  stencil(A, 1.3, 2.45, 0.66, 14);
  A.box("hazard", 4, 2.72, 0.03, 2.7, 0.14, 0.03, { texel: 3 });
  A.box("satinBlack", 4, 2.9, 0.03, 2.6, 0.12, 0.06);
  A.box("emitAmber", 4, 2.9, 0.062, 2.5, 0.06, 0.01);
  wallLightBar(A, 0.3, 2.3, 2.9, "emitWarmSoft");
  wallLightBar(A, 5.3, 7.7, 2.9, "emitWarmSoft");
  // chevrons on the deck at the lift threshold
  kit.box("hazard", cx, y0 + 0.006, z1 - 0.32, 2.6, 0.006, 0.36, { texel: 3 });

  // ------------------------------------------------------------ port wall: crew notice board over a bench
  const Wl = shell.frames["-x"].frame; // u = z1 - z
  const bu = 3.0;
  Wl.box("satinBlack", bu, 1.85, 0.03, 2.0, 1.34, 0.06);
  Wl.box("painted", bu, 1.85, 0.065, 1.86, 1.2, 0.01, { color: P.cream, uv: "keep" });
  const notices = [[-0.6, 0.3, 1, 0.06], [0.0, 0.32, 13, -0.04], [0.6, 0.28, 6, 0.09], [-0.55, -0.27, 9, -0.07], [0.08, -0.3, 11, 0.05], [0.62, -0.28, 15, -0.1]];
  for (const [ddu, dv, idx, spin] of notices) stencil(Wl, bu + ddu, 1.85 + dv, 0.44, idx, { n: 0.075, spin });
  Wl.box("satinBlack", bu, 2.66, 0.04, 1.8, 0.1, 0.08);
  Wl.box("emitAmber", bu, 2.66, 0.082, 1.7, 0.04, 0.01);
  bench(kit, x0 + 0.32, y0, z0 + 3.0, "+x", { len: 2.2, color: P.fabricOrange });
  stencil(Wl, 5.3, 1.8, 0.42, 12);
  wallScreen(Wl, 0.9, 1.9, 0.8, 0.45, "screen6", { bezel: 0.04, housing: 0.06, leds: true });
  // overhead conduits along the port wall
  pipe(kit, [x0 + 0.22, yTop - 0.24, z0 + 0.3], [x0 + 0.22, yTop - 0.24, z1 - 0.3], 0.05, { color: P.steel });
  pipe(kit, [x0 + 0.38, yTop - 0.32, z0 + 0.3], [x0 + 0.38, yTop - 0.32, z1 - 0.3], 0.03, { color: P.orange, mat: "painted" });

  // ------------------------------------------------------------ door wall flanks
  const D = shell.frames["-z"].frame; // u = x - x0, door u 2.5..5.5
  wallLightBar(D, 0.4, 2.1, 2.45, "emitWarmSoft");
  wallLightBar(D, 5.9, 7.6, 2.45, "emitWarmSoft");
  stencil(D, 1.25, 1.75, 0.44, 1);
  stencil(D, 6.75, 1.75, 0.44, 5);
  D.box("emitAmber", 2.2, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("emitAmber", 5.8, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("hazard", 4, 2.52, 0.02, 3.4, 0.1, 0.02, { texel: 3 });

  // ------------------------------------------------------------ ceiling accent and light
  downlight(kit, cx, yTop, z1 - 0.9, 1.6, 0.3, "emitWarmSoft");
  ctx.lights.cool.push(pointLight(0xe0dcd0, 9, 10, [cx, yTop - 0.4, z0 + 2.4]));
  ctx.lights.warm.push(pointLight(0xffb454, 8, 7, [cx - 2.2, yTop - 0.5, z1 - 0.8]));
  ctx.lights.warm.push(pointLight(0xffb454, 6, 6, [cx + 1.6, yTop - 0.5, z0 + 3.5]));
  return shell;
}
