// Lift lobby, deck A (command level): clean light shell with blue instrument accents. The turbolift
// portal (doors and car are the lift's) is framed by a black surround with lit slots, a header carrying
// the deck indicator strip and a pressure-door stencil, handrails either side, a threshold plate and a
// WATCH YOUR STEP stencil on the deck; a deck directory board sits beside it, a padded bench under a
// light bar faces it, comm panel by the door, blue floor guides from the door to the lift, a recessed
// emergency cabinet in a niche in the starboard wall. Own ceiling: cross beams and channels only, so no
// rib runs down the centre line into the lift header.
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { nicheWall, cabinet, theatreBench, wallScreen, stencil, commPanel, callPanel, floorStrip, downlight, flatCeiling, floorStencil, handrail } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["+x"], ceiling: false, lights: false, seed: 61 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1 } = room;
  const cx = (x0 + x1) / 2;
  const yTop = flatCeiling(kit, room, y0, { beams: [z0 + 2.0, z0 + 4.0], channels: [z0 + 1.0, z0 + 3.0, z0 + 4.5], channelMat: "emitWhiteSoft", plate: P.slate });

  // ------------------------------------------------------------ starboard wall with the emergency niche
  const niche = nicheWall(kit, room, y0, z0 + 3.0, z0 + 4.6, { seed: 63 });
  const B = niche.back; // u = z - (z0 + 3), 0..1.6
  cabinet(B, 0.8, 1.3, 2.0, 0.42, { color: P.cream, doors: 2, band: P.orange, label: 13, lamp: "emitRed" });
  B.box("hazard", 0.8, 2.3, 0.02, 1.4, 0.1, 0.012, { texel: 3 });
  B.box("satinBlack", 0.8, 2.62, 0.04, 0.5, 0.14, 0.08);
  B.box("emitRed", 0.8, 2.62, 0.082, 0.4, 0.06, 0.01);
  kit.box("hazard", x1 + 0.09, y0 + 0.006, z0 + 3.8, 0.18, 0.006, 1.5, { texel: 3 });
  const [S1, S2] = niche.segs; // S1 u = z - z0 (0..3), S2 u = z - (z0 + 4.6) (0..1.4)
  commPanel(S1, 1.0, 1.45, { screen: "screen3", accent: "emitBlue" });
  stencil(S1, 2.1, 1.75, 0.4, 8);
  wallLightBar(S1, 0.4, 2.6, 2.45, "emitWhiteSoft");
  wallLightBar(S2, 0.3, 1.1, 2.45, "emitWhiteSoft");
  S2.box("satinBlack", 0.7, 1.5, 0.03, 0.12, 0.8, 0.06);
  S2.box("emitBlue", 0.7, 1.5, 0.062, 0.05, 0.7, 0.01);

  // ------------------------------------------------------------ aft wall: portal surround, indicator strip, directory, rails
  const A = shell.frames["+z"].frame; // u = x1 - x; portal u 3..5 (x 1..-1), lift call panel at u 2.65
  // surround: two black bands with lit slots just outside the shaft's own wall slab (|x| <= 1.66, which
  // stands 0.16 m proud of the room wall), the call panel on the right-hand band, and a lintel over the
  // whole unit deep enough to clear that slab
  for (const u of [2.1, 5.9]) A.box("satinBlack", u, 1.2, 0.05, 0.3, 2.4, 0.1);
  A.box("emitBlue", 5.9, 1.25, 0.102, 0.05, 1.9, 0.008);
  A.box("emitBlue", 2.1, 1.95, 0.102, 0.05, 0.5, 0.008);
  A.box("emitBlue", 2.1, 0.65, 0.102, 0.05, 0.7, 0.008);
  callPanel(A, 2.1, 1.35, "emitBlue");
  A.box("satinBlack", 4, 2.58, 0.14, 4.1, 0.36, 0.28);
  A.box("emitBlueSoft", 4, 2.42, 0.282, 3.8, 0.03, 0.008, { uv: "keep" });
  stencil(A, 4, 2.6, 0.3, 7, { n: 0.282 });
  A.box("emitBlueSoft", 4, 2.41, 0.14, 3.6, 0.008, 0.24, { uv: "keep" });
  // deck indicator: a row of deck lamps, the current deck lit white, LED readout, deck stencil
  A.box("satinBlack", 4, 2.9, 0.13, 2.6, 0.22, 0.26);
  A.box("darkGloss", 4, 2.9, 0.262, 2.5, 0.16, 0.006);
  for (let i = 0; i < 6; i++) A.box(i === 1 ? "emitWhite" : "emitBlue", 3.35 + i * 0.26, 2.9, 0.266, 0.14, 0.06, 0.006);
  A.box("leds", 5.35, 2.9, 0.266, 0.6, 0.04, 0.006, { uv: "keep" });
  stencil(A, 2.95, 2.9, 0.18, 0, { n: 0.266 });
  // surround colliders on the two jamb pillars only; the 2 m portal (u 3..5) must stay open
  A.collider(1.7, 2.7, 0, 2.75, 0, 0.12, "surround");
  A.collider(5.3, 6.3, 0, 2.75, 0, 0.12, "surround");
  // directory board (raised so the rail passes under it)
  const du = 6.85;
  A.box("satinBlack", du, 1.95, 0.04, 1.4, 1.5, 0.08);
  A.box("darkGloss", du, 1.95, 0.082, 1.3, 1.4, 0.006);
  A.box("emitBlue", du, 2.62, 0.086, 1.2, 0.04, 0.008);
  wallScreen(A, du, 2.3, 1.1, 0.42, "screen7", { bezel: 0.03, housing: 0.03, n: 0.06 });
  [0, 14, 9].forEach((idx, i) => {
    const v = 1.86 - i * 0.28;
    stencil(A, du - 0.42, v, 0.24, idx, { n: 0.09 });
    A.box("emitBlue", du - 0.12, v, 0.086, 0.04, 0.04, 0.008);
    A.box("leds", du + 0.3, v, 0.086, 0.55, 0.03, 0.006, { uv: "keep" });
  });
  A.box("emitBlueSoft", du, 1.28, 0.086, 1.2, 0.03, 0.008, { uv: "keep" });
  A.collider(du - 0.7, du + 0.7, 1.15, 2.7, 0, 0.1, "directory");
  // deck stencil on the other flank, light bars, handrails either side of the portal
  stencil(A, 1.2, 2.2, 0.62, 0);
  stencil(A, 1.2, 1.5, 0.4, 3);
  wallLightBar(A, 0.3, 1.9, 2.9, "emitWhiteSoft");
  wallLightBar(A, 6.1, 7.7, 2.9, "emitWhiteSoft");
  handrail(kit, [1.95, z1 - 0.12], [3.6, z1 - 0.12], y0, { h: 0.95, postEvery: 1.7, mid: false });
  handrail(kit, [-3.6, z1 - 0.12], [-1.95, z1 - 0.12], y0, { h: 0.95, postEvery: 1.7, mid: false });
  // threshold: steel plate with a blue edge line, WATCH YOUR STEP on the deck
  kit.box("metal", cx, y0 + 0.006, z1 - 0.25, 2.4, 0.012, 0.5, { color: P.steel });
  kit.box("emitBlue", cx, y0 + 0.013, z1 - 0.51, 2.4, 0.004, 0.03);
  floorStencil(kit, cx, y0 + 0.012, z1 - 1.0, 0.7, 14, "+z");

  // ------------------------------------------------------------ port wall: bench, status screen
  const Wl = shell.frames["-x"].frame; // u = z1 - z
  theatreBench(kit, x0 + 0.46, y0, z0 + 3.0, "+x", { len: 2.4, color: P.fabricTeal, rear: P.cream });
  wallLightBar(Wl, 1.3, 4.7, 2.45, "emitWhiteSoft");
  wallScreen(Wl, 1.0, 1.9, 0.9, 0.5, "screen9", { bezel: 0.04, housing: 0.06, leds: true });
  wallScreen(Wl, 5.2, 1.9, 0.9, 0.5, "screen0", { bezel: 0.04, housing: 0.06 });
  stencil(Wl, 3.0, 2.0, 0.42, 9);
  Wl.box("emitBlue", 5.75, 1.75, 0.03, 0.04, 0.5, 0.02);

  // ------------------------------------------------------------ door wall flanks
  const D = shell.frames["-z"].frame; // u = x - x0, door u 2.5..5.5
  wallLightBar(D, 0.4, 2.1, 2.45, "emitWhiteSoft");
  wallLightBar(D, 5.9, 7.6, 2.45, "emitWhiteSoft");
  stencil(D, 1.25, 1.75, 0.42, 9);
  stencil(D, 6.75, 1.75, 0.42, 0);
  D.box("emitBlue", 2.2, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("emitBlue", 5.8, 1.6, 0.03, 0.04, 0.5, 0.02);

  // ------------------------------------------------------------ floor guides, portal downlight, light
  for (const gx of [cx - 1.15, cx + 1.15]) floorStrip(kit, [gx, z0 + 0.7], [gx, z1 - 1.5], y0, "emitBlueSoft", { w: 0.05 });
  downlight(kit, cx, yTop, z1 - 0.9, 1.6, 0.3, "emitBlueSoft");
  ctx.lights.cool.push(pointLight(0xe8f0ff, 16, 11, [cx, yTop - 0.7, z0 + 1.6]));
  ctx.lights.cool.push(pointLight(0xe8f0ff, 13, 9, [cx, yTop - 0.7, z0 + 3.8]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 8, 7, [cx - 2.0, yTop - 0.6, z1 - 0.6]));
  return shell;
}
