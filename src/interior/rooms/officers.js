// Officers' quarters. The door opens onto a wardroom (dining table, lounge, seating booths against the
// cabin wall, a galley counter, an honours wall) and the four cabins face the entrance: two open straight
// off the wardroom with their sliding doors parked, two more at the end of a short passage between them,
// so bunks, desks and lit lamps are in view from the doorway. Every cabin: bunk with drawers, headboard
// shelf and a hooded reading lamp, desk with monitor and lamp, sitting corner (bench, low table, chairs,
// rug), locker, wardrobe, refresher cubicle and personal effects. Warm, quiet palette: cream / creamDark
// panels, teal and orange soft furnishings, amber-tinted practicals.
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight, wallFrame, WALL_T } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { partition, cabinet, chair, desk, bench, table, wallScreen, stencil, effects, commPanel, downlight, nameplate, flatCeiling } from "./commandKit.js";

const WARD_X = -9; // wardroom / front-cabin wall (centre plane)
const MID_X = -15.6; // front / back cabin wall (centre plane); the passage ends here
const PASS_Z0 = 533.4; // passage walls (centre planes)
const PASS_Z1 = 536.6;
const BACK_Z = 535; // divider between the two back cabins
const T = WALL_T;

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", ceiling: false, lights: false, seed: 53 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  // lighter slate ceiling than the shell's gunmetal so the quarters read as a lit space; beams sit on the
  // shell's rib pitch (every 3.67 m) so the pendants and downlights below stay clear of them
  const yTop = flatCeiling(kit, room, y0, { beams: [1, 2, 3, 4, 5].map((i) => x0 + ((x1 - x0) * i) / 6), along: "x", plate: P.creamDark });
  const quiet = { panel: 0.9, strip: 0.04, greeble: 0.04, screen: 0.02 };
  const hallPaints = [[P.cream, 0.72], [P.creamDark, 0.28]];
  const cabinPaints = [[P.creamDark, 0.6], [P.cream, 0.3], [P.tealPaint, 0.1]];
  const door = (u0, u1, pocket = 1) => ({ u0, u1, v0: 0, v1: 2.1, type: "door", pocket });

  // ------------------------------------------------------------ partitions
  // wardroom west wall either side of the passage mouth (side A faces the wardroom: u = 533.24 - z / 544 - z)
  const westN = partition(kit, [WARD_X, PASS_Z0 - T], [WARD_X, z0], y0, h, { openings: [door(0.24, 1.74)], seed: 901, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints });
  const westS = partition(kit, [WARD_X, z1], [WARD_X, PASS_Z1 + T], y0, h, { openings: [door(5.5, 7.0, -1)], seed: 903, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints });
  // passage walls (side B faces the passage)
  const passN = partition(kit, [WARD_X, PASS_Z0], [MID_X, PASS_Z0], y0, h, { seed: 905, styles: quiet, paintsA: cabinPaints, paintsB: hallPaints });
  const passS = partition(kit, [MID_X, PASS_Z1], [WARD_X, PASS_Z1], y0, h, { seed: 907, styles: quiet, paintsA: cabinPaints, paintsB: hallPaints });
  // front / back wall; the two back-cabin doors sit side by side at the passage end (side A faces +x, u = 544 - z)
  const mid = partition(kit, [MID_X, z1], [MID_X, z0], y0, h, { openings: [door(9.3, 10.4), door(7.6, 8.7, -1)], seed: 909, styles: quiet, paintsA: cabinPaints, paintsB: cabinPaints });
  partition(kit, [MID_X, BACK_Z], [x0, BACK_Z], y0, h, { seed: 911, styles: quiet, paintsA: cabinPaints, paintsB: cabinPaints });
  for (const [px, pz, s] of [[WARD_X, PASS_Z0, 0.4], [WARD_X, PASS_Z1, 0.4], [MID_X, PASS_Z0, 0.4], [MID_X, PASS_Z1, 0.4], [MID_X, BACK_Z, 0.36]]) {
    kit.box("satinBlack", px, y0 + h / 2, pz, s, h, s);
    kit.collider([px - s / 2, y0, pz - s / 2], [px + s / 2, y0 + h, pz + s / 2], "post");
  }

  // ------------------------------------------------------------ wardroom west wall: nameplates, booths, lockers
  const AN = westN.A.frame; // u = 533.24 - z
  const AS = westS.A.frame; // u = 544 - z
  nameplate(AN, 2.22, 1.55, { label: 9, label2: 14 });
  nameplate(AS, 5.02, 1.55, { label: 14, label2: 9 });
  wallLightBar(AN, 2.5, 6.9, 2.52, "emitWarmSoft");
  wallLightBar(AS, 0.4, 4.8, 2.52, "emitWarmSoft");
  booth(kit, WARD_X + T, 528.9, y0, P.fabricTeal, "screen3");
  booth(kit, WARD_X + T, 541.1, y0, P.fabricOrange, "screen1");
  cabinet(AN, 6.6, 1.0, 2.1, 0.55, { color: P.creamDark, doors: 1, band: P.tealPaint, label: 11, lamp: "emitAmber" });
  cabinet(AS, 0.65, 1.0, 2.1, 0.55, { color: P.creamDark, doors: 1, band: P.tealPaint, label: 11, lamp: "emitAmber" });

  // ------------------------------------------------------------ passage
  const PN = passN.B.frame; // faces +z, u = x + 15.6 (0 at the end wall)
  const PS = passS.B.frame; // faces -z, u = -9 - x (0 at the wardroom)
  wallLightBar(PN, 0.5, 6.1, 2.52, "emitWarmSoft");
  wallLightBar(PS, 0.5, 6.1, 2.52, "emitWarmSoft");
  nameplate(PN, 0.8, 1.55, { label: 9, label2: 0 });
  nameplate(PS, 5.8, 1.55, { label: 0, label2: 9 });
  stencil(PN, 3.3, 1.85, 0.36, 3);
  stencil(PS, 3.3, 1.85, 0.36, 14);
  commPanel(PN, 5.75, 1.45, { screen: "screen3", accent: "emitAmber" });
  wallScreen(PS, 1.3, 1.9, 0.9, 0.5, "screen4", { bezel: 0.04, housing: 0.06 });
  wallLightBar(mid.A.frame, 7.7, 10.3, 2.6, "emitWarmSoft");
  // runner from the passage end to the entrance, passage ceiling channel and downlight
  kit.boxMM("deck", [MID_X + T, y0, 534.2], [x1 - 0.3, y0 + 0.012, 535.8], { color: P.impGrey, uv: "world", texel: 1 });
  kit.box("satinBlack", -12.3, yTop - 0.03, BACK_Z, 5.8, 0.06, 0.34);
  kit.box("emitWarmSoft", -12.3, yTop - 0.06, BACK_Z, 5.6, 0.02, 0.22, { uv: "keep" });
  downlight(kit, -14.6, yTop, BACK_Z, 1.2, 0.3, "emitWarmSoft");

  // ------------------------------------------------------------ wardroom: door wall (+x)
  const E = shell.frames["+x"].frame; // u = z - z0, door at u 8.2..9.8
  cabinet(E, 1.3, 1.3, 2.1, 0.55, { color: P.creamDark, doors: 2, band: P.tealPaint, label: 11, lamp: "emitAmber" });
  wallScreen(E, 2.75, 1.95, 1.5, 0.85, "screen1", { bezel: 0.05, leds: true });
  // galley counter: black base with cream door fronts, steel top, hot-drinks urn, mugs, lit upper cabinets
  E.box("metal", 4.8, 0.05, 0.3, 2.3, 0.1, 0.56, { color: P.darkMetal });
  E.box("satinBlack", 4.8, 0.5, 0.3, 2.4, 0.8, 0.6);
  E.box("metal", 4.8, 0.915, 0.31, 2.44, 0.03, 0.64, { color: P.steel });
  for (const du of [-0.8, 0, 0.8]) {
    E.box("painted", 4.8 + du, 0.5, 0.606, 0.72, 0.7, 0.012, { color: P.creamDark, uv: "keep" });
    E.box("metal", 4.8 + du + 0.28, 0.5, 0.62, 0.03, 0.2, 0.02, { color: P.steel });
  }
  E.box("leds", 4.8, 0.12, 0.606, 1.6, 0.03, 0.006, { uv: "keep" });
  E.collider(3.6, 6.0, 0, 0.95, 0, 0.66, "counter");
  E.cylV("metal", 5.5, 1.2, 0.3, 0.14, 0.5, { color: P.steel, segments: 16 });
  E.cylV("metal", 5.5, 1.47, 0.3, 0.06, 0.06, { color: P.darkMetal, segments: 10 });
  E.box("emitOrange", 5.5, 1.05, 0.445, 0.05, 0.02, 0.006);
  effects(kit, x1 - 0.32, y0 + 0.93, z0 + 4.2, "mug");
  effects(kit, x1 - 0.46, y0 + 0.93, z0 + 4.45, "mug");
  effects(kit, x1 - 0.3, y0 + 0.93, z0 + 3.9, "stack", 0.3);
  E.box("painted", 4.8, 1.9, 0.21, 2.4, 0.7, 0.42, { color: P.cream, uv: "keep" });
  for (const du of [-0.8, 0, 0.8]) E.box("metal", 4.8 + du + 0.38, 1.9, 0.425, 0.012, 0.6, 0.02, { color: P.darkMetal });
  E.box("satinBlack", 4.8, 1.55, 0.21, 2.4, 0.02, 0.42);
  E.box("emitWarmSoft", 4.8, 1.535, 0.2, 2.2, 0.006, 0.3, { uv: "keep" });
  wallScreen(E, 6.7, 1.6, 0.6, 0.34, "screen10", { bezel: 0.03, housing: 0.05 });
  // south of the door: comm panel, honours wall of framed plates, lockers
  commPanel(E, 10.4, 1.45, { screen: "screen3", accent: "emitAmber" });
  E.box("satinBlack", 12.3, 1.8, 0.02, 2.3, 1.1, 0.04);
  E.box("painted", 12.3, 1.8, 0.042, 2.2, 1.0, 0.006, { color: P.creamDark, uv: "keep" });
  for (const [du, dv, idx] of [[-0.75, 0.25, 14], [0, 0.25, 9], [0.75, 0.25, 0], [-0.75, -0.25, 2], [0, -0.25, 12], [0.75, -0.25, 6]]) {
    E.box("satinBlack", 12.3 + du, 1.8 + dv, 0.05, 0.42, 0.42, 0.014);
    E.box("painted", 12.3 + du, 1.8 + dv, 0.058, 0.36, 0.36, 0.004, { color: P.cream, uv: "keep" });
    stencil(E, 12.3 + du, 1.8 + dv, 0.3, idx, { n: 0.062 });
  }
  E.box("satinBlack", 12.3, 2.45, 0.04, 2.0, 0.08, 0.08);
  E.box("emitWarmSoft", 12.3, 2.405, 0.06, 1.9, 0.008, 0.04, { uv: "keep" });
  cabinet(E, 14.6, 1.4, 2.1, 0.55, { color: P.creamDark, doors: 2, band: P.tealPaint, label: 11, lamp: "emitAmber" });
  cabinet(E, 16.4, 1.4, 2.1, 0.55, { color: P.cream, doors: 2, band: P.orange, label: 13, lamp: "emitRed" });
  stencil(E, 17.5, 1.85, 0.4, 14);
  wallLightBar(E, 0.3, 7.7, 2.52, "emitWarmSoft");
  wallLightBar(E, 10.2, 17.7, 2.52, "emitWarmSoft");

  // ------------------------------------------------------------ wardroom: dining end (forward, -z)
  const N = shell.frames["-z"].frame; // u = x - x0; wardroom portion u 15.16..22
  wallScreen(N, 18.6, 1.95, 2.6, 1.3, "screen7", { leds: true });
  N.box("emitBlue", 17.1, 2.55, 0.04, 0.05, 0.05, 0.02);
  N.box("emitBlue", 20.1, 2.55, 0.04, 0.05, 0.05, 0.02);
  cabinet(N, 16.9, 1.6, 0.9, 0.5, { color: P.creamDark, doors: 3, band: P.tealPaint, vents: false });
  cabinet(N, 21.0, 1.6, 0.9, 0.5, { color: P.creamDark, doors: 3, band: P.tealPaint, vents: false });
  effects(kit, -7.3, y0 + 0.92, z0 + 0.25, "canister");
  effects(kit, -6.7, y0 + 0.92, z0 + 0.28, "stack", 0.2);
  effects(kit, -3.4, y0 + 0.92, z0 + 0.25, "frame", 0);
  effects(kit, -2.7, y0 + 0.92, z0 + 0.3, "mug");
  wallLightBar(N, 15.5, 17.0, 2.52, "emitWarmSoft");
  wallLightBar(N, 20.2, 21.7, 2.52, "emitWarmSoft");
  stencil(N, 15.7, 1.75, 0.36, 9);
  table(kit, -5.2, y0, 528.7, 2.8, 1.1, { h: 0.75, color: P.creamDark });
  for (const tx of [-6.1, -5.2, -4.3]) {
    chair(kit, tx, y0, 527.6, "+z", { seatColor: P.fabricTeal });
    chair(kit, tx, y0, 529.8, "-z", { seatColor: P.fabricTeal });
  }
  effects(kit, -6.0, y0 + 0.75, 528.45, "mug");
  effects(kit, -5.3, y0 + 0.75, 528.95, "datapad", 0.3);
  effects(kit, -4.4, y0 + 0.75, 528.5, "stack", -0.2);
  effects(kit, -4.6, y0 + 0.75, 529.0, "mug");
  // downlights either side of the shell's ceiling rib at x -5.67
  downlight(kit, -6.3, yTop, 528.7, 0.5, 0.5, "emitWarmSoft");
  downlight(kit, -4.2, yTop, 528.7, 0.5, 0.5, "emitWarmSoft");

  // ------------------------------------------------------------ wardroom: lounge end (aft, +z)
  const S = shell.frames["+z"].frame; // u = x1 - x; wardroom portion u 0..6.84
  wallScreen(S, 3.3, 1.95, 2.0, 1.0, "screen9", { leds: false });
  S.box("emitBlue", 2.1, 2.55, 0.04, 0.05, 0.05, 0.02);
  S.box("emitBlue", 4.5, 2.55, 0.04, 0.05, 0.05, 0.02);
  cabinet(S, 5.6, 1.2, 2.1, 0.55, { color: P.creamDark, doors: 1, band: P.orange, label: 11, lamp: "emitAmber" });
  cabinet(S, 0.9, 1.3, 2.1, 0.55, { color: P.cream, doors: 2, band: P.tealPaint, label: 9, lamp: "emitBlue" });
  wallLightBar(S, 0.3, 2.2, 2.52, "emitWarmSoft");
  wallLightBar(S, 4.4, 6.6, 2.52, "emitWarmSoft");
  stencil(S, 6.5, 1.85, 0.34, 3);
  const lz = 541.7;
  kit.boxMM("fabric", [-7.1, y0, lz - 1.5], [-3.5, y0 + 0.012, lz + 1.5], { color: P.fabricTeal, uv: "world", texel: 1.5 });
  kit.boxMM("satinBlack", [-5.9, y0 + 0.42, lz - 0.4], [-4.7, y0 + 0.46, lz + 0.4]);
  for (const [lx, lzz] of [[-5.85, lz - 0.35], [-4.75, lz - 0.35], [-5.85, lz + 0.35], [-4.75, lz + 0.35]]) kit.box("metal", lx, y0 + 0.21, lzz, 0.04, 0.42, 0.04, { color: P.steel });
  kit.collider([-5.9, y0, lz - 0.4], [-4.7, y0 + 0.46, lz + 0.4], "lowtable");
  effects(kit, -5.5, y0 + 0.46, lz + 0.1, "datapad", 0.4);
  effects(kit, -4.95, y0 + 0.46, lz - 0.2, "mug");
  bench(kit, -5.3, y0, lz - 1.05, "+z", { len: 2.2, color: P.fabricOrange });
  bench(kit, -5.3, y0, lz + 1.05, "-z", { len: 2.2, color: P.fabricOrange });
  chair(kit, -6.85, y0, lz, "+x", { arms: false, seatColor: P.fabricCream });
  chair(kit, -3.75, y0, lz, "-x", { arms: false, seatColor: P.fabricCream });
  downlight(kit, -6.3, yTop, lz, 0.5, 0.5, "emitWarmSoft");
  downlight(kit, -4.3, yTop, lz, 0.5, 0.5, "emitWarmSoft");

  // ------------------------------------------------------------ wardroom ceiling: two light channels, entry downlight
  for (const cx of [-4.0, -7.2]) {
    kit.box("satinBlack", cx, yTop - 0.03, 535, 0.46, 0.06, 16.8);
    kit.box("emitWarmSoft", cx, yTop - 0.06, 535, 0.34, 0.02, 16.6, { uv: "keep" });
  }
  downlight(kit, -3.0, yTop, 535, 0.8, 0.3, "emitWarmSoft");
  downlight(kit, -3.0, yTop, 531.2, 0.6, 0.6, "emitWhiteSoft");
  downlight(kit, -3.0, yTop, 538.8, 0.6, 0.6, "emitWhiteSoft");

  // ------------------------------------------------------------ the four cabins (doors on their east walls)
  const V = [
    { blanket: P.fabricTeal, desk: P.creamDark, sofa: P.fabricTeal, label: 9, deskScreen: "screen0", wallScreen: "screen7", farScreen: "screen9", lampLight: true },
    { blanket: P.fabricOrange, desk: P.tealPaint, sofa: P.fabricCream, label: 14, deskScreen: "screen3", wallScreen: "screen9", farScreen: "screen1", lampLight: true },
    { blanket: P.fabricTeal, desk: P.creamDark, sofa: P.fabricOrange, label: 0, deskScreen: "screen1", wallScreen: "screen2", farScreen: "screen4", lampLight: false },
    { blanket: P.fabricCream, desk: P.creamDark, sofa: P.fabricTeal, label: 12, deskScreen: "screen9", wallScreen: "screen4", farScreen: "screen0", lampLight: false },
  ];
  cabin(kit, ctx, { x0: MID_X + T, x1: WARD_X - T, z0, z1: PASS_Z0 - T }, y0, h, "+z", [0.24, 1.74], V[0]);
  cabin(kit, ctx, { x0: MID_X + T, x1: WARD_X - T, z0: PASS_Z1 + T, z1 }, y0, h, "-z", [0.24, 1.74], V[1]);
  cabin(kit, ctx, { x0, x1: MID_X - T, z0, z1: BACK_Z - T }, y0, h, "+z", [0.14, 1.24], V[2]);
  cabin(kit, ctx, { x0, x1: MID_X - T, z0: BACK_Z + T, z1 }, y0, h, "-z", [0.14, 1.24], V[3]);

  // ------------------------------------------------------------ lights (cabins add one pendant each, front cabins a desk lamp)
  // four wardroom practicals, two more just inside the door so the entrance wall and the booths read,
  // one in the passage: with the cabins' six this stays inside the 14-slot pool
  const L = ctx.lights;
  for (const lz2 of [528.7, 533.2, 536.8, 541.7]) L.cool.push(pointLight(0xf6ecdc, 22, 13, [-5.6, yTop - 0.7, lz2]));
  for (const lz2 of [531.2, 538.8]) L.cool.push(pointLight(0xf6ecdc, 17, 11, [-3.3, yTop - 0.6, lz2]));
  L.cool.push(pointLight(0xf6ecdc, 11, 9, [-12.3, yTop - 0.5, BACK_Z]));
  return shell;
}

// Seating booth against a wall face at xFace (normal +x): black wings with a lit slot, a canopy with a
// soft light underneath, padded back, bench, low table with effects and a small screen.
function booth(kit, xFace, zc, y, color, screen) {
  const w = 3.0;
  const d = 0.9;
  for (const s of [-1, 1]) {
    const zi = zc + s * (w / 2 - 0.06);
    kit.boxMM("satinBlack", [xFace, y, zc + s * (w / 2) - 0.06], [xFace + d, y + 2.3, zc + s * (w / 2) + 0.06]);
    kit.boxMM("emitWarm", [xFace + d - 0.2, y + 0.65, Math.min(zi, zi - s * 0.01)], [xFace + d - 0.15, y + 1.85, Math.max(zi, zi - s * 0.01)]);
    kit.collider([xFace, y, zc + s * (w / 2) - 0.06], [xFace + d, y + 2.3, zc + s * (w / 2) + 0.06], "wing");
  }
  kit.boxMM("satinBlack", [xFace, y + 2.16, zc - w / 2 - 0.06], [xFace + d, y + 2.3, zc + w / 2 + 0.06]);
  kit.boxMM("emitWarmSoft", [xFace + 0.15, y + 2.152, zc - w / 2 + 0.2], [xFace + d - 0.15, y + 2.16, zc + w / 2 - 0.2], { uv: "keep" });
  kit.boxMM("fabric", [xFace, y + 0.5, zc - w / 2 + 0.1], [xFace + 0.08, y + 1.35, zc + w / 2 - 0.1], { color, uv: "world", texel: 2 });
  kit.boxMM("satinBlack", [xFace, y + 1.35, zc - w / 2 + 0.08], [xFace + 0.1, y + 1.4, zc + w / 2 - 0.08]);
  bench(kit, xFace + 0.3, y, zc, "+x", { len: w - 0.3, back: false, color });
  kit.boxMM("satinBlack", [xFace + 0.02, y + 1.6, zc - 0.3], [xFace + 0.08, y + 1.95, zc + 0.3]);
  kit.boxMM(screen, [xFace + 0.08, y + 1.64, zc - 0.26], [xFace + 0.086, y + 1.91, zc + 0.26], { uv: "keep" });
  const tx0 = xFace + 0.78;
  const tx1 = xFace + 1.38;
  kit.boxMM("satinBlack", [tx0, y + 0.42, zc - 0.55], [tx1, y + 0.46, zc + 0.55]);
  for (const [lx, lz] of [[tx0 + 0.05, zc - 0.5], [tx1 - 0.05, zc - 0.5], [tx0 + 0.05, zc + 0.5], [tx1 - 0.05, zc + 0.5]]) kit.box("metal", lx, y + 0.21, lz, 0.04, 0.42, 0.04, { color: P.steel });
  kit.collider([tx0, y, zc - 0.55], [tx1, y + 0.46, zc + 0.55], "boothtable");
  effects(kit, xFace + 1.05, y + 0.46, zc + 0.2, "mug");
  effects(kit, xFace + 1.1, y + 0.46, zc - 0.25, "datapad", 0.5);
  kit.boxMM("fabric", [xFace + 0.1, y, zc - w / 2 + 0.15], [xFace + 1.7, y + 0.012, zc + w / 2 - 0.15], { color: P.fabricCream, uv: "world", texel: 1.5 });
}

// One cabin. `b` is the clear floor rectangle; the door is in the east wall next to the `doorEnd` side wall
// ("+z": the door sits at the south end of the east wall and the far wall is -z; "-z": mirrored). Local
// coordinates: t runs west from the east wall, s runs from the door-end wall toward the far wall; doorS is
// the door's [s0, s1]. Furniture is arranged so the bunk, desk and lamp face whoever looks in through the door.
function cabin(kit, ctx, b, y, h, doorEnd, doorS, v) {
  const { x0, x1, z0, z1 } = b;
  const yTop = y + h;
  const north = doorEnd === "+z";
  const D = x1 - x0;
  const Wd = z1 - z0;
  const X = (t) => x1 - t;
  const Z = (s) => (north ? z1 - s : z0 + s);
  const DIR = { E: "+x", W: "-x", N: north ? "-z" : "+z", S: north ? "+z" : "-z" };
  const rect = (t0, t1, s0, s1) => [Math.min(X(t0), X(t1)), Math.max(X(t0), X(t1)), Math.min(Z(s0), Z(s1)), Math.max(Z(s0), Z(s1))];
  const MM = (mat, t0, t1, ya, yb, s0, s1, opts) => {
    const [ax, bx, az, bz] = rect(t0, t1, s0, s1);
    kit.boxMM(mat, [ax, y + ya, az], [bx, y + yb, bz], opts);
  };
  const COL = (t0, t1, ya, yb, s0, s1, tag) => {
    const [ax, bx, az, bz] = rect(t0, t1, s0, s1);
    kit.collider([ax, y + ya, az], [bx, y + yb, bz], tag);
  };
  // wall frames with their normals into the cabin, and u along each as a function of t / s
  const fE = wallFrame(kit, [x1, z0], [x1, z1], y).frame;
  const fW = wallFrame(kit, [x0, z1], [x0, z0], y).frame;
  const fFar = north ? wallFrame(kit, [x0, z0], [x1, z0], y).frame : wallFrame(kit, [x1, z1], [x0, z1], y).frame;
  const fNear = north ? wallFrame(kit, [x1, z1], [x0, z1], y).frame : wallFrame(kit, [x0, z0], [x1, z0], y).frame;
  const uE = (s) => Z(s) - z0;
  const uW = (s) => z1 - Z(s);
  const uFar = (t) => (north ? X(t) - x0 : x1 - X(t));
  const uNear = (t) => (north ? x1 - X(t) : X(t) - x0);
  const span = (f, a, b2) => [Math.min(f(a), f(b2)), Math.max(f(a), f(b2))];
  // a frame on the plane s = const whose normal faces the door end (cubicle door dressing)
  const faceS = (s, ta, tb) => (north ? wallFrame(kit, [X(tb), Z(s)], [X(ta), Z(s)], y).frame : wallFrame(kit, [X(ta), Z(s)], [X(tb), Z(s)], y).frame);

  // --- bunk along the west wall, head toward the far wall; drawers and a light strip on the room side
  const bt0 = D - 1.12;
  const bt1 = D - 0.05;
  const bs0 = 2.85;
  const bs1 = 5.05;
  MM("metal", bt0 + 0.04, bt1, 0.1, 0.5, bs0 + 0.04, bs1 - 0.04, { color: P.gunmetal, texel: 1 });
  MM("metal", bt0 + 0.12, bt1 - 0.04, 0, 0.1, bs0 + 0.14, bs1 - 0.14, { color: P.darkMetal });
  MM("emitWarmSoft", bt0 + 0.028, bt0 + 0.04, 0.1, 0.13, bs0 + 0.12, bs1 - 0.12, { uv: "keep" });
  MM("painted", bt0 + 0.02, bt0 + 0.04, 0.16, 0.44, bs0 + 0.1, bs0 + 1.0, { color: P.orange, uv: "keep" });
  MM("painted", bt0 + 0.02, bt0 + 0.04, 0.16, 0.44, bs0 + 1.1, bs1 - 0.1, { color: P.cream, uv: "keep" });
  for (const s of [bs0 + 0.55, bs0 + 1.6]) MM("metal", bt0 - 0.01, bt0 + 0.02, 0.29, 0.32, s - 0.12, s + 0.12, { color: P.steel });
  MM("fabric", bt0 + 0.06, bt1 - 0.02, 0.5, 0.64, bs0 + 0.03, bs1 - 0.02, { color: P.fabricCream, uv: "world", texel: 2 });
  MM("fabric", bt0 + 0.02, bt1 + 0.02, 0.63, 0.72, bs0 - 0.02, bs1 - 1.45, { color: v.blanket, uv: "world", texel: 2 });
  MM("fabric", bt0 + 0.18, bt1 - 0.08, 0.64, 0.76, bs1 - 0.62, bs1 - 0.1, { color: P.fabricCream, uv: "world", texel: 2 });
  COL(bt0 - 0.02, D, 0, 0.75, bs0 - 0.03, bs1 + 0.03, "bunk");
  // headboard shelf with effects and a hooded reading lamp (open below, so the emitter shows)
  const hs = bs1 - 0.45;
  fW.box("metal", uW(hs), 1.15, 0.2, 1.1, 0.05, 0.4, { color: P.gunmetal, texel: 1 });
  fW.box("metal", uW(hs), 1.2, 0.02, 1.1, 0.03, 0.04, { color: P.steel });
  effects(kit, X(D - 0.2), y + 1.175, Z(hs + 0.3), "stack", north ? 0.3 : -0.3);
  effects(kit, X(D - 0.22), y + 1.175, Z(hs - 0.25), "mug");
  fW.box("metal", uW(hs), 1.78, 0.17, 0.34, 0.03, 0.34, { color: P.darkMetal });
  for (const s of [-1, 1]) fW.box("metal", uW(hs) + s * 0.16, 1.66, 0.17, 0.02, 0.24, 0.34, { color: P.darkMetal });
  fW.box("metal", uW(hs), 1.73, 0.33, 0.34, 0.1, 0.02, { color: P.darkMetal });
  fW.box("emitWarm", uW(hs), 1.56, 0.17, 0.28, 0.02, 0.26);

  // --- desk with monitor and a lit lamp against the west wall by the door-end side, chair, effects
  desk(kit, X(D - 0.36), y, Z(1.8), "+x", { w: 1.6, d: 0.7, color: v.desk, screen: v.deskScreen });
  chair(kit, X(D - 1.2), y, Z(1.8), "-x", { seatColor: P.fabricTeal });
  effects(kit, X(D - 0.52), y + 0.76, Z(1.12), "lamp", north ? Math.PI : 0);
  effects(kit, X(D - 0.3), y + 0.76, Z(2.35), "datapad", 0.4);
  effects(kit, X(D - 0.55), y + 0.76, Z(2.52), "mug");
  if (v.lampLight) ctx.lights.warm.push(pointLight(0xffb070, 2.6, 4.5, [X(D - 0.7), y + 1.3, Z(1.2)]));

  // --- sitting corner along the far wall: bench, low table, two chairs, rug, shelf with effects
  bench(kit, X(D - 2.3), y, Z(Wd - 0.33), DIR.S, { len: 2.0, color: v.sofa });
  const [tx0, tx1, tz0, tz1] = rect(D - 2.7, D - 1.9, Wd - 1.5, Wd - 0.9);
  kit.boxMM("satinBlack", [tx0, y + 0.42, tz0], [tx1, y + 0.46, tz1]);
  for (const [lx, lz] of [[tx0 + 0.05, tz0 + 0.05], [tx1 - 0.05, tz0 + 0.05], [tx0 + 0.05, tz1 - 0.05], [tx1 - 0.05, tz1 - 0.05]]) kit.box("metal", lx, y + 0.21, lz, 0.04, 0.42, 0.04, { color: P.steel });
  kit.collider([tx0, y, tz0], [tx1, y + 0.46, tz1], "lowtable");
  effects(kit, X(D - 2.3), y + 0.46, Z(Wd - 1.2), "datapad", 0.6);
  chair(kit, X(D - 1.0), y, Z(Wd - 1.2), DIR.E, { seatColor: v.sofa, arms: false });
  chair(kit, X(D - 3.6), y, Z(Wd - 1.2), DIR.W, { seatColor: v.sofa, arms: false });
  MM("fabric", D - 4.1, D - 0.5, 0, 0.012, Wd - 2.1, Wd - 0.6, { color: P.fabricTeal, uv: "world", texel: 1.5 });
  fFar.box("metal", uFar(D - 2.3), 1.45, 0.14, 1.6, 0.04, 0.28, { color: P.gunmetal, texel: 1 });
  fFar.box("metal", uFar(D - 2.3), 1.49, 0.27, 1.6, 0.04, 0.02, { color: P.steel });
  effects(kit, X(D - 1.7), y + 1.47, Z(Wd - 0.15), "canister");
  effects(kit, X(D - 2.3), y + 1.47, Z(Wd - 0.15), "frame", north ? 0 : Math.PI);
  effects(kit, X(D - 2.9), y + 1.47, Z(Wd - 0.15), "stack", 0.9);
  wallLightBar(fFar, ...span(uFar, D - 3.5, D - 1.1), 2.35, "emitWarmSoft");
  // far wall between the cubicle and the sitting corner: viewscreen (+ shelf unit in the deeper back cabins)
  const gap0 = 1.75;
  const gap1 = D - 3.3;
  if (gap1 - gap0 > 2.6) {
    wallScreen(fFar, uFar(2.6), 1.75, 1.5, 0.75, v.farScreen, { bezel: 0.04, housing: 0.06 });
    cabinet(fFar, uFar(gap1 - 0.75), 1.2, 2.1, 0.5, { color: P.creamDark, doors: 2, band: P.tealPaint, vents: false, label: 9 });
  } else wallScreen(fFar, uFar((gap0 + gap1) / 2), 1.75, gap1 - gap0 - 0.25, 0.65, v.farScreen, { bezel: 0.04, housing: 0.06 });

  // --- refresher cubicle in the far east corner, door toward the room
  const rs = Wd - 1.66;
  MM("painted", 0, 1.75, 0, 2.35, rs, Wd, { color: P.creamDark, uv: "world", texel: 1 });
  MM("satinBlack", 0, 1.75, 2.35, 2.5, rs, Wd);
  MM("metal", 0.35, 1.35, 2.5, 2.8, rs + 0.3, Wd - 0.4, { color: P.gunmetal, texel: 1 });
  MM("satinBlack", 0.45, 1.25, 0.05, 2.1, rs - 0.03, rs);
  MM("darkGloss", 0.5, 1.2, 1.5, 1.7, rs - 0.04, rs - 0.03);
  MM("metal", 0.5, 1.2, 1.05, 1.1, rs - 0.06, rs - 0.03, { color: P.steel });
  MM("emitTeal", 1.19, 1.25, 1.2, 1.5, rs - 0.05, rs - 0.03);
  for (let k = 0; k < 6; k++) MM("metal", 0.6, 1.1, 0.35 + k * 0.06, 0.365 + k * 0.06, rs - 0.045, rs - 0.03, { color: P.darkMetal });
  MM("satinBlack", 1.3, 1.75, 2.05, 2.25, rs - 0.06, rs);
  MM("emitWhiteSoft", 1.35, 1.7, 2.1, 2.2, rs - 0.07, rs - 0.06, { uv: "keep" });
  stencil(faceS(rs - 0.03, 0.45, 1.25), 0.4, 1.75, 0.28, 12, { n: 0.01 });
  COL(0, 1.75, 0, 2.8, rs - 0.07, Wd, "refresher");

  // --- east (door) wall between the door and the cubicle: comm panel, locker, viewscreen
  const s1 = doorS[1];
  commPanel(fE, uE(s1 + 0.42), 1.4, { screen: "screen3", accent: "emitAmber" });
  cabinet(fE, uE(s1 + 1.35), 1.0, 2.1, 0.55, { color: P.cream, doors: 1, band: P.tealPaint, label: v.label, lamp: "emitAmber" });
  wallScreen(fE, uE(s1 + 2.65), 1.75, 1.3, 0.75, v.wallScreen, { bezel: 0.05 });
  if (rs - (s1 + 3.3) > 1.3) cabinet(fE, uE(s1 + 4.0), 1.1, 2.1, 0.55, { color: P.creamDark, doors: 2, band: P.tealPaint, vents: false, label: 9 });

  // --- door-end wall: wardrobe, duty-roster screen, light bar
  cabinet(fNear, uNear(1.9), 1.2, 2.1, 0.55, { color: P.creamDark, doors: 2, band: P.tealPaint, vents: false, label: 9 });
  stencil(fNear, uNear(3.3), 1.85, 0.34, 9);
  wallScreen(fNear, uNear(D - 1.9), 1.7, 1.0, 0.55, "screen9", { bezel: 0.04, housing: 0.06 });
  wallLightBar(fNear, ...span(uNear, 2.8, D - 0.4), 2.45, "emitWarmSoft");

  // --- ceiling: warm pendant (kept clear of the shell's ribs), downlight over the desk, one practical per cabin
  const px = X(D / 2 - 0.9);
  const pz = Z(Wd / 2 + 0.6);
  kit.box("paintedMetal", px, yTop - 0.06, pz, 1.4, 0.12, 0.5, { color: P.gunmetal });
  kit.box("emitWarmSoft", px, yTop - 0.125, pz, 1.2, 0.01, 0.3, { uv: "keep" });
  ctx.lights.cool.push(pointLight(0xffd9b0, 18, 11, [px, yTop - 0.5, pz]));
  downlight(kit, X(D - 0.9), yTop, Z(1.8), 0.9, 0.3, "emitWarmSoft");
}
