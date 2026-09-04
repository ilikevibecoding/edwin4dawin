// Lift lobby, deck A (command level): clean light shell with blue instrument accents. A deck directory
// board beside the turbolift portal, a padded bench under a light bar, deck stencil, comm panel by the
// door, blue floor guides from the door to the lift, and a recessed emergency cabinet in a niche cut into
// the starboard wall.
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { nicheWall, cabinet, bench, wallScreen, stencil, commPanel, floorStrip, downlight } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", skipWalls: ["+x"], lightRows: 1, lightMat: "emitWhiteSoft", lights: false, seed: 61 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const cx = (x0 + x1) / 2;

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

  // ------------------------------------------------------------ aft wall: portal (auto), call panel (lift), directory
  const A = shell.frames["+z"].frame; // u = x1 - x; portal u 3..5, lift call panel at u 2.65
  const du = 6.1;
  A.box("satinBlack", du, 1.7, 0.04, 1.5, 1.9, 0.08);
  A.box("darkGloss", du, 1.7, 0.082, 1.4, 1.8, 0.006);
  A.box("emitBlue", du, 2.56, 0.086, 1.3, 0.04, 0.008);
  wallScreen(A, du, 2.18, 1.16, 0.5, "screen4", { bezel: 0.03, housing: 0.03, n: 0.06 });
  [0, 14, 9, 6].forEach((idx, i) => {
    const v = 1.62 - i * 0.31;
    stencil(A, du - 0.45, v, 0.27, idx, { n: 0.09 });
    A.box("emitBlue", du - 0.12, v, 0.086, 0.04, 0.04, 0.008);
    A.box("leds", du + 0.32, v, 0.086, 0.6, 0.03, 0.006, { uv: "keep" });
  });
  A.box("emitBlueSoft", du, 0.78, 0.086, 1.3, 0.03, 0.008, { uv: "keep" });
  A.collider(du - 0.75, du + 0.75, 0, 2.65, 0, 0.1, "directory");
  // deck stencil over the call panel side, a lit bar over the portal, light bars either side
  stencil(A, 1.3, 2.45, 0.62, 0);
  A.box("satinBlack", 4, 2.78, 0.03, 2.6, 0.18, 0.06);
  A.box("emitBlueSoft", 4, 2.78, 0.062, 2.5, 0.08, 0.01, { uv: "keep" });
  wallLightBar(A, 0.3, 2.3, 2.9, "emitWhiteSoft");
  wallLightBar(A, 5.3, 7.7, 2.9, "emitWhiteSoft");

  // ------------------------------------------------------------ port wall: bench, status screen
  const Wl = shell.frames["-x"].frame; // u = z1 - z
  bench(kit, x0 + 0.32, y0, z0 + 3.0, "+x", { len: 2.4, color: P.fabricTeal });
  wallLightBar(Wl, 1.3, 4.7, 2.45, "emitWhiteSoft");
  wallScreen(Wl, 1.0, 1.9, 0.9, 0.5, "screen0", { bezel: 0.04, housing: 0.06, leds: true });
  stencil(Wl, 5.2, 1.75, 0.42, 9);
  Wl.box("emitBlue", 5.7, 1.75, 0.03, 0.04, 0.5, 0.02);

  // ------------------------------------------------------------ door wall flanks
  const D = shell.frames["-z"].frame; // u = x - x0, door u 2.5..5.5
  wallLightBar(D, 0.4, 2.1, 2.45, "emitWhiteSoft");
  wallLightBar(D, 5.9, 7.6, 2.45, "emitWhiteSoft");
  stencil(D, 1.25, 1.75, 0.42, 9);
  stencil(D, 6.75, 1.75, 0.42, 0);
  D.box("emitBlue", 2.2, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("emitBlue", 5.8, 1.6, 0.03, 0.04, 0.5, 0.02);

  // ------------------------------------------------------------ floor guides, ceiling accents, light
  for (const gx of [cx - 1.15, cx + 1.15]) floorStrip(kit, [gx, z0 + 0.7], [gx, z1 - 0.9], y0, "emitBlueSoft", { w: 0.05 });
  downlight(kit, cx, yTop, z1 - 0.9, 1.6, 0.3, "emitBlueSoft");
  ctx.lights.cool.push(pointLight(0xe8f0ff, 12, 10, [cx, yTop - 0.4, z0 + 2.4]));
  ctx.lights.teal.push(pointLight(0x6fb4ff, 5, 6, [cx - 2.0, yTop - 0.5, z1 - 0.6]));
  ctx.lights.cool.push(pointLight(0xbcd4ff, 6, 6, [cx, y0 + 2.6, z1 - 0.8]));
  return shell;
}
