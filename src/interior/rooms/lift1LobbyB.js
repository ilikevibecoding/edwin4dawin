// Lift lobby, deck B (crew level): darker, harder-worn shell with amber light and hazard markings. The
// turbolift portal (doors and car are the lift's) sits in a hazard-striped surround with amber slots, a
// header with the deck indicator strip, chevrons and a WATCH YOUR STEP stencil at the threshold and a
// steel handrail either side; a crew notice board over a bench, a deck plate and directory by the
// portal, supply crates and a hose reel in the corners, ceiling conduits, a fire extinguisher on a
// bracket and a recessed emergency cabinet in a niche cut into the starboard wall. Own ceiling: cross
// beams and channels only (no centre-line rib).
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { nicheWall, cabinet, bench, wallScreen, stencil, commPanel, callPanel, pipe, downlight, flatCeiling, floorStencil, handrail } from "./commandKit.js";

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "dark", skipWalls: ["+x"], ceiling: false, lights: false, seed: 67 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1 } = room;
  const cx = (x0 + x1) / 2;
  const darkPaints = [[P.gunmetal, 0.5], [P.slate, 0.3], [P.creamDark, 0.2]];
  const yTop = flatCeiling(kit, room, y0, { beams: [z0 + 1.5, z0 + 3.5, z0 + 5.45], channels: [z0 + 2.5, z0 + 4.4], channelMat: "emitWarmSoft", channelW: 0.26 });

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

  // ------------------------------------------------------------ aft wall: portal surround, indicator strip, deck plate + directory, rails
  const A = shell.frames["+z"].frame; // u = x1 - x; portal u 3..5 (x 1..-1), lift call panel at u 2.65
  // bands sit just outside the shaft's own wall slab (|x| <= 1.66, 0.16 m proud of the room wall); the
  // lintel and the indicator strip stand further out than that slab so they are not buried in it
  for (const u of [2.1, 5.9]) {
    A.box("satinBlack", u, 1.2, 0.05, 0.3, 2.4, 0.1);
    A.box("hazard", u, 0.5, 0.101, 0.26, 0.9, 0.01, { texel: 3 });
  }
  A.box("emitAmber", 5.9, 1.6, 0.102, 0.05, 1.3, 0.008);
  A.box("emitAmber", 2.1, 2.0, 0.102, 0.05, 0.5, 0.008);
  callPanel(A, 2.1, 1.35, "emitAmber");
  A.box("satinBlack", 4, 2.58, 0.14, 4.1, 0.36, 0.28);
  A.box("hazard", 4, 2.42, 0.281, 3.8, 0.08, 0.01, { texel: 3 });
  stencil(A, 4, 2.62, 0.3, 7, { n: 0.282 });
  A.box("emitWarmSoft", 4, 2.41, 0.14, 3.6, 0.008, 0.24, { uv: "keep" });
  // deck indicator strip: amber deck lamps, deck B lit white, LED readout, deck stencil
  A.box("satinBlack", 4, 2.9, 0.13, 2.6, 0.22, 0.26);
  A.box("painted", 4, 2.9, 0.262, 2.5, 0.16, 0.006, { color: P.gunmetal, uv: "keep" });
  for (let i = 0; i < 6; i++) A.box(i === 2 ? "emitWhite" : "emitAmber", 3.35 + i * 0.26, 2.9, 0.266, 0.14, 0.06, 0.006);
  A.box("leds", 5.35, 2.9, 0.266, 0.6, 0.04, 0.006, { uv: "keep" });
  stencil(A, 2.95, 2.9, 0.18, 14, { n: 0.266 });
  // surround colliders on the two jamb pillars only; the 2 m portal (u 3..5) must stay open
  A.collider(1.7, 2.7, 0, 2.75, 0, 0.12, "surround");
  A.collider(5.3, 6.3, 0, 2.75, 0, 0.12, "surround");
  // deck plate + directory (raised so the rail passes under it)
  const du = 6.85;
  A.box("satinBlack", du, 1.95, 0.04, 1.4, 1.5, 0.08);
  A.box("painted", du, 1.95, 0.082, 1.3, 1.4, 0.006, { color: P.gunmetal, uv: "keep" });
  A.box("emitAmber", du, 2.62, 0.086, 1.2, 0.04, 0.008);
  wallScreen(A, du, 2.3, 1.0, 0.42, "screen6", { bezel: 0.03, housing: 0.03, n: 0.06 });
  [14, 0, 6].forEach((idx, i) => {
    const v = 1.86 - i * 0.28;
    stencil(A, du - 0.4, v, 0.24, idx, { n: 0.09 });
    A.box("emitAmber", du - 0.1, v, 0.086, 0.04, 0.04, 0.008);
    A.box("leds", du + 0.32, v, 0.086, 0.5, 0.03, 0.006, { uv: "keep" });
  });
  A.collider(du - 0.7, du + 0.7, 1.15, 2.7, 0, 0.1, "directory");
  stencil(A, 1.2, 2.2, 0.66, 14);
  stencil(A, 1.2, 1.5, 0.4, 10);
  wallLightBar(A, 0.3, 1.9, 2.9, "emitWarmSoft");
  wallLightBar(A, 6.1, 7.7, 2.9, "emitWarmSoft");
  handrail(kit, [1.95, z1 - 0.12], [3.6, z1 - 0.12], y0, { h: 0.95, postEvery: 1.7, mid: false, color: P.gunmetal });
  handrail(kit, [-3.6, z1 - 0.12], [-1.95, z1 - 0.12], y0, { h: 0.95, postEvery: 1.7, mid: false, color: P.gunmetal });
  // chevrons on the deck at the lift threshold and the step warning
  kit.box("hazard", cx, y0 + 0.006, z1 - 0.32, 2.6, 0.006, 0.36, { texel: 3 });
  floorStencil(kit, cx, y0 + 0.012, z1 - 1.05, 0.7, 14, "+z");

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
  wallScreen(Wl, 0.9, 1.9, 0.8, 0.45, "screen10", { bezel: 0.04, housing: 0.06, leds: true });
  // overhead conduits along the port wall
  pipe(kit, [x0 + 0.22, yTop - 0.24, z0 + 0.3], [x0 + 0.22, yTop - 0.24, z1 - 0.3], 0.05, { color: P.steel });
  pipe(kit, [x0 + 0.38, yTop - 0.32, z0 + 0.3], [x0 + 0.38, yTop - 0.32, z1 - 0.3], 0.03, { color: P.orange, mat: "painted" });

  // ------------------------------------------------------------ corners: supply crates by the portal, hose reel by the door
  crate(kit, x1 - 0.75, y0, z1 - 0.75, 0.7, 0.5, 0.0);
  crate(kit, x1 - 0.7, y0 + 0.5, z1 - 0.8, 0.6, 0.45, 0.25);
  crate(kit, x1 - 1.55, y0, z1 - 0.55, 0.5, 0.4, -0.15);
  kit.collider([x1 - 1.9, y0, z1 - 1.2], [x1, y0 + 1.0, z1], "crates");
  const D = shell.frames["-z"].frame; // u = x - x0, door u 2.5..5.5
  D.box("metal", 7.0, 1.3, 0.08, 0.14, 0.14, 0.16, { color: P.darkMetal });
  D.cylN("painted", 7.0, 1.3, 0.24, 0.32, 0.16, { color: P.orange, uv: "keep", segments: 20 });
  D.cylN("metal", 7.0, 1.3, 0.24, 0.1, 0.2, { color: P.steel, segments: 12 });
  D.cylN("rubber", 7.0, 1.3, 0.24, 0.27, 0.2, { color: P.rubber, segments: 20 });
  D.box("hazard", 7.0, 0.9, 0.02, 0.6, 0.06, 0.01, { texel: 3 });
  D.collider(6.6, 7.4, 0.9, 1.7, 0, 0.36, "hosereel");

  // ------------------------------------------------------------ door wall flanks
  wallLightBar(D, 0.4, 2.1, 2.45, "emitWarmSoft");
  wallLightBar(D, 5.9, 7.6, 2.45, "emitWarmSoft");
  stencil(D, 1.25, 1.75, 0.44, 1);
  stencil(D, 6.2, 2.0, 0.44, 5);
  D.box("emitAmber", 2.2, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("emitAmber", 5.8, 1.6, 0.03, 0.04, 0.5, 0.02);
  D.box("hazard", 4, 2.52, 0.02, 3.4, 0.1, 0.02, { texel: 3 });

  // ------------------------------------------------------------ ceiling accent and light
  downlight(kit, cx, yTop, z1 - 1.0, 1.6, 0.3, "emitWarmSoft");
  ctx.lights.cool.push(pointLight(0xe0dcd0, 15, 11, [cx, yTop - 0.7, z0 + 1.9]));
  ctx.lights.warm.push(pointLight(0xffb454, 14, 9, [cx - 2.2, yTop - 0.7, z1 - 0.8]));
  ctx.lights.warm.push(pointLight(0xffb454, 10, 7, [cx + 1.6, yTop - 0.7, z0 + 3.9]));
  ctx.lights.warm.push(pointLight(0xffc070, 5, 5, [x0 + 1.2, y0 + 1.4, z0 + 2.6]));
  return shell;
}

// Supply crate: gunmetal box with a cream lid band, a hazard strip and stencil, corner feet.
function crate(kit, x, y, z, w, h, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const rot = [0, yaw, 0];
  kit.box("paintedMetal", x, y + h / 2, z, w, h, w, { color: P.gunmetal, rot, texel: 1 });
  kit.box("painted", x, y + h - 0.05, z, w + 0.02, 0.06, w + 0.02, { color: P.creamDark, rot, uv: "keep" });
  kit.box("hazard", x - s * (w / 2 + 0.004), y + h * 0.45, z - c * (w / 2 + 0.004), w * 0.8, 0.06, 0.006, { rot, texel: 3 });
  kit.box("metal", x - s * (w / 2 + 0.006), y + h * 0.7, z - c * (w / 2 + 0.006), w * 0.5, 0.03, 0.01, { color: P.steel, rot });
  for (const [fx, fz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const lx = fx * (w / 2 - 0.08);
    const lz = fz * (w / 2 - 0.08);
    kit.box("metal", x + lx * c + lz * s, y + 0.02, z - lx * s + lz * c, 0.1, 0.04, 0.1, { color: P.darkMetal, rot });
  }
}
