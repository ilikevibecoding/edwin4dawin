// Officers' quarters: a private hall along the door wall, a cross-hall, and four cabins behind
// panelled partitions with sliding-door openings. Each cabin: bunk with headboard shelf and a hooded
// reading lamp, desk with monitor and chair, locker, refresher cubicle, a small sitting corner, rug and
// personal effects. Warmer, quieter palette than the operations rooms: fabricTeal bedding, creamDark
// panels, amber practicals.
import { roomShell, wallLightBar } from "../shell.js";
import { pointLight, wallFrame } from "../lib.js";
import { PALETTE as P } from "../../materials.js";
import { partition, cabinet, chair, desk, bench, wallScreen, stencil, effects, commPanel, downlight, OPPOSITE } from "./commandKit.js";

const HALL_X = -5.4; // centre plane of the east hall wall
const CROSS_Z0 = 533.6; // cross-hall walls (centre planes)
const CROSS_Z1 = 536.4;
const DIV_X = -14.7; // divider between west and east cabins
const T = 0.1; // partition half thickness incl. face

export function build(kit, ctx, room) {
  const shell = roomShell(kit, ctx, room, { style: "light", lightRows: 1, lights: false, seed: 53 });
  const y0 = shell.y0;
  const { x0, x1, z0, z1, height: h } = room;
  const yTop = y0 + h;
  const quiet = { panel: 0.9, strip: 0.04, greeble: 0.04, screen: 0.02 };
  const hallPaints = [[P.cream, 0.7], [P.creamDark, 0.3]];
  const cabinPaints = [[P.creamDark, 0.6], [P.cream, 0.3], [P.tealPaint, 0.1]];
  const doorW = 1.2;
  const doorH = 2.1;
  const dxW = -19.35; // west cabin doors
  const dxE = -10.05; // east cabin doors

  // ------------------------------------------------------------ partitions
  // north cabins' hall wall (side A faces the cross-hall)
  const p1 = partition(kit, [x0, CROSS_Z0], [HALL_X, CROSS_Z0], y0, h, {
    openings: [dxW, dxE].map((dx) => ({ u0: dx - x0 - doorW / 2, u1: dx - x0 + doorW / 2, v0: 0, v1: doorH, type: "door" })),
    seed: 901, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints,
  });
  // south cabins' hall wall
  const p2 = partition(kit, [HALL_X, CROSS_Z1], [x0, CROSS_Z1], y0, h, {
    openings: [dxW, dxE].map((dx) => ({ u0: HALL_X - dx - doorW / 2, u1: HALL_X - dx + doorW / 2, v0: 0, v1: doorH, type: "door" })),
    seed: 903, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints,
  });
  // dividers between west and east cabins
  partition(kit, [DIV_X, z0], [DIV_X, CROSS_Z0], y0, h, { seed: 905, styles: quiet, paintsA: cabinPaints, paintsB: cabinPaints });
  partition(kit, [DIV_X, CROSS_Z1], [DIV_X, z1], y0, h, { seed: 907, styles: quiet, paintsA: cabinPaints, paintsB: cabinPaints });
  // east hall wall (side A faces the hall)
  partition(kit, [HALL_X, CROSS_Z0], [HALL_X, z0], y0, h, { seed: 909, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints });
  partition(kit, [HALL_X, z1], [HALL_X, CROSS_Z1], y0, h, { seed: 911, styles: quiet, paintsA: hallPaints, paintsB: cabinPaints });
  // corner posts where the cross-hall meets the east hall
  for (const pz of [CROSS_Z0, CROSS_Z1]) {
    kit.box("satinBlack", HALL_X, y0 + h / 2, pz, 0.24, h, 0.24);
    kit.collider([HALL_X - 0.12, y0, pz - 0.12], [HALL_X + 0.12, y0 + h, pz + 0.12], "post");
  }
  // cabin number stencils by the doors (hall side) and light bars between them
  const A1 = p1.A.frame; // u = x - x0
  const A2 = p2.A.frame; // u = HALL_X - x
  stencil(A1, dxW - x0 - 1.0, 1.9, 0.34, 2);
  stencil(A1, dxE - x0 - 1.0, 1.9, 0.34, 0);
  stencil(A2, HALL_X - dxW + 1.0, 1.9, 0.34, 14);
  stencil(A2, HALL_X - dxE + 1.0, 1.9, 0.34, 2);
  for (const F of [A1, A2]) {
    wallLightBar(F, 0.5, 3.6, 2.45, "emitWarmSoft");
    wallLightBar(F, 6.4, 8.2, 2.45, "emitWarmSoft");
    wallLightBar(F, 10.6, 13.0, 2.45, "emitWarmSoft");
    wallLightBar(F, 15.6, 18.0, 2.45, "emitWarmSoft");
    F.box("emitWarm", 9.3, 2.0, 0.03, 0.05, 0.6, 0.02);
  }
  // cross-hall runner and end feature on the port wall
  kit.boxMM("deck", [x0 + 0.3, y0, 534.4], [HALL_X - 0.2, y0 + 0.012, 535.6], { color: P.impGrey, uv: "world", texel: 1 });
  kit.boxMM("deck", [HALL_X + 0.3, y0, z0 + 0.4], [x1 - 0.4, y0 + 0.012, z1 - 0.4], { color: P.impGrey, uv: "world", texel: 1 });
  const W = shell.frames["-x"].frame; // u = z1 - z
  const wu = z1 - 535;
  wallScreen(W, wu, 1.95, 2.0, 1.1, "screen4", { leds: false });
  cabinet(W, wu, 1.8, 0.9, 0.45, { color: P.creamDark, doors: 3, band: P.tealPaint, vents: false });
  effects(kit, x0 + 0.25, y0 + 0.92, 534.5, "canister");
  effects(kit, x0 + 0.25, y0 + 0.92, 535.4, "frame", Math.PI / 2);
  for (const s of [-1, 1]) {
    W.box("satinBlack", wu + s * 1.3, 1.9, 0.04, 0.12, 0.9, 0.08);
    W.box("emitWarmSoft", wu + s * 1.3, 1.9, 0.083, 0.06, 0.8, 0.006, { uv: "keep" });
  }

  // ------------------------------------------------------------ east hall
  const E = shell.frames["+x"].frame; // u = z - z0, door at u 8.2..9.8
  wallScreen(E, 4.6, 1.9, 1.4, 0.8, "screen0", { leds: true });
  commPanel(E, 12.2, 1.45, { screen: "screen3", accent: "emitAmber" });
  stencil(E, 6.6, 1.9, 0.4, 0);
  stencil(E, 11.0, 1.9, 0.4, 9);
  wallLightBar(E, 0.5, 7.4, 2.45, "emitWarmSoft");
  wallLightBar(E, 10.6, 17.5, 2.45, "emitWarmSoft");
  cabinet(E, 15.0, 1.4, 2.1, 0.5, { color: P.creamDark, doors: 2, band: P.tealPaint, label: 13, lamp: "emitAmber" });
  bench(kit, -3.7, y0, z0 + 0.42, "+z", { len: 2.0, color: P.fabricTeal });
  bench(kit, -3.7, y0, z1 - 0.42, "-z", { len: 2.0, color: P.fabricTeal });
  const N = shell.frames["-z"].frame; // u = x - x0, hall portion at u 18.6..22
  const S = shell.frames["+z"].frame; // u = x1 - x, hall portion at u 0..3.4
  wallScreen(N, x1 - 1.7 - x0, 1.75, 1.2, 0.6, "screen1", { bezel: 0.05 });
  stencil(S, 1.7, 1.75, 0.5, 15);
  S.box("emitWarm", 1.7, 2.3, 0.03, 0.6, 0.05, 0.02);
  downlight(kit, -3.7, yTop, 529.5, 0.6, 0.3, "emitWarmSoft");
  downlight(kit, -3.7, yTop, 540.5, 0.6, 0.3, "emitWarmSoft");

  // ------------------------------------------------------------ the four cabins
  const variants = [
    { blanket: P.fabricTeal, desk: P.creamDark, sofa: P.fabricTeal, label: 2 },
    { blanket: P.fabricTeal, desk: P.tealPaint, sofa: P.fabricCream, label: 0 },
    { blanket: P.fabricOrange, desk: P.creamDark, sofa: P.fabricTeal, label: 14 },
    { blanket: P.fabricTeal, desk: P.creamDark, sofa: P.fabricOrange, label: 2 },
  ];
  cabin(kit, ctx, { x0, x1: DIV_X - T, z0, z1: CROSS_Z0 - T }, y0, h, "+z", false, variants[0]);
  cabin(kit, ctx, { x0: DIV_X + T, x1: HALL_X - T, z0, z1: CROSS_Z0 - T }, y0, h, "+z", true, variants[1]);
  cabin(kit, ctx, { x0, x1: DIV_X - T, z0: CROSS_Z1 + T, z1 }, y0, h, "-z", false, variants[2]);
  cabin(kit, ctx, { x0: DIV_X + T, x1: HALL_X - T, z0: CROSS_Z1 + T, z1 }, y0, h, "-z", true, variants[3]);

  // ------------------------------------------------------------ hall lights (cabins add their own)
  for (const lx of [-8.5, -13.5, -18.5, -22.6]) ctx.lights.cool.push(pointLight(0xf0e6d8, 4.5, 7, [lx, yTop - 0.3, 535]));
  for (const lz of [528, 535, 542]) ctx.lights.cool.push(pointLight(0xf0e6d8, 4.5, 7, [-3.7, yTop - 0.3, lz]));
  ctx.lights.warm.push(pointLight(0xffc48c, 3.0, 6, [x0 + 1.0, y0 + 2.0, 535]));
  return shell;
}

// One cabin. hallSide is the wall the door is in; mirrorX flips the layout so the two cabins on each
// side of a divider are not copies. Distances: t along x from the "outer" side wall, s along z from the
// far (windowless) wall opposite the door.
function cabin(kit, ctx, b, y, h, hallSide, mirrorX, v) {
  const { x0, x1, z0, z1 } = b;
  const yTop = y + h;
  const X = (t) => (mirrorX ? x1 - t : x0 + t);
  const Z = (s) => (hallSide === "+z" ? z0 + s : z1 - s);
  const F = (f) => (f[1] === "x" ? (mirrorX ? OPPOSITE[f] : f) : hallSide === "+z" ? f : OPPOSITE[f]);
  const rect = (t0, t1, s0, s1) => [Math.min(X(t0), X(t1)), Math.max(X(t0), X(t1)), Math.min(Z(s0), Z(s1)), Math.max(Z(s0), Z(s1))];
  const MM = (mat, t0, t1, ya, yb, s0, s1, opts) => {
    const [ax, bx, az, bz] = rect(t0, t1, s0, s1);
    kit.boxMM(mat, [ax, y + ya, az], [bx, y + yb, bz], opts);
  };
  const farDir = hallSide === "+z" ? "-z" : "+z";
  const westDir = mirrorX ? "+x" : "-x";
  const eastDir = mirrorX ? "-x" : "+x";
  const frames = {
    "-z": wallFrame(kit, [x0, z0], [x1, z0], y).frame,
    "+z": wallFrame(kit, [x1, z1], [x0, z1], y).frame,
    "-x": wallFrame(kit, [x0, z1], [x0, z0], y).frame,
    "+x": wallFrame(kit, [x1, z0], [x1, z1], y).frame,
  };
  const wallU = (dir, x, z) => (dir === "-z" ? x - x0 : dir === "+z" ? x1 - x : dir === "-x" ? z1 - z : z - z0);
  const far = frames[farDir];
  const west = frames[westDir];
  const east = frames[eastDir];

  // --- bunk in the far corner along the outer wall
  MM("metal", 0.25, 2.45, 0.08, 0.5, 0.2, 1.25, { color: P.gunmetal, texel: 1 });
  MM("metal", 0.3, 2.4, 0.0, 0.1, 0.3, 1.15, { color: P.darkMetal });
  MM("emitWarmSoft", 0.35, 2.35, 0.1, 0.13, 1.25, 1.262, { uv: "keep" });
  // drawer fronts on the room side
  MM("painted", 0.4, 1.3, 0.16, 0.44, 1.25, 1.27, { color: P.orange, uv: "keep" });
  MM("painted", 1.4, 2.3, 0.16, 0.44, 1.25, 1.27, { color: P.cream, uv: "keep" });
  for (const t of [0.85, 1.85]) MM("metal", t - 0.12, t + 0.12, 0.29, 0.32, 1.27, 1.3, { color: P.steel });
  MM("fabric", 0.3, 2.42, 0.5, 0.64, 0.24, 1.22, { color: P.fabricCream, uv: "world", texel: 2 });
  MM("fabric", 0.95, 2.45, 0.63, 0.72, 0.2, 1.26, { color: v.blanket, uv: "world", texel: 2 });
  MM("fabric", 0.35, 0.9, 0.64, 0.76, 0.5, 0.95, { color: P.fabricCream, uv: "world", texel: 2 });
  kit.collider([rect(0.2, 2.5, 0.15, 1.3)[0], y, rect(0.2, 2.5, 0.15, 1.3)[2]], [rect(0.2, 2.5, 0.15, 1.3)[1], y + 0.75, rect(0.2, 2.5, 0.15, 1.3)[3]], "bunk");
  // headboard shelf + hooded reading lamp on the outer wall over the pillow
  west.box("metal", wallU(westDir, X(0), Z(0.72)), 1.15, 0.2, 1.1, 0.05, 0.4, { color: P.gunmetal, texel: 1 });
  west.box("metal", wallU(westDir, X(0), Z(0.72)), 1.2, 0.02, 1.1, 0.03, 0.04, { color: P.steel });
  effects(kit, X(0.25), y + 1.175, Z(0.45), "stack", mirrorX ? -0.3 : 0.3);
  effects(kit, X(0.25), y + 1.175, Z(0.98), "mug");
  west.box("metal", wallU(westDir, X(0), Z(0.72)), 1.66, 0.17, 0.34, 0.24, 0.34, { color: P.darkMetal, texel: 1 });
  west.box("emitWarm", wallU(westDir, X(0), Z(0.72)), 1.6, 0.24, 0.26, 0.05, 0.16);
  for (const ly of [1.62, 1.66, 1.7]) west.box("metal", wallU(westDir, X(0), Z(0.72)), ly, 0.33, 0.28, 0.012, 0.05, { color: P.gunmetal });
  ctx.lights.warm.push(pointLight(0xffb070, 1.6, 3.5, [X(0.7), y + 1.45, Z(0.72)]));

  // --- bedside block with a desk lamp
  MM("satinBlack", 2.65, 3.2, 0.0, 0.55, 0.25, 0.85);
  MM("metal", 2.66, 3.19, 0.55, 0.57, 0.26, 0.84, { color: P.steel });
  effects(kit, X(2.92), y + 0.57, Z(0.55), "lamp", mirrorX ? Math.PI : 0);
  kit.collider([rect(2.65, 3.2, 0.25, 0.85)[0], y, rect(2.65, 3.2, 0.25, 0.85)[2]], [rect(2.65, 3.2, 0.25, 0.85)[1], y + 0.6, rect(2.65, 3.2, 0.25, 0.85)[3]], "bedside");

  // --- desk + chair against the far wall
  desk(kit, X(4.9), y, Z(0.55), F("+z"), { w: 1.6, color: v.desk, screen: "screen0" });
  chair(kit, X(4.9), y, Z(1.35), F("-z"), { seatColor: P.fabricTeal });
  effects(kit, X(5.35), y + 0.76, Z(0.35), "frame", F("+z") === "+z" ? 0 : Math.PI);
  effects(kit, X(4.55), y + 0.76, Z(0.72), "datapad", 0.25);
  effects(kit, X(5.5), y + 0.76, Z(0.7), "mug");

  // --- locker on the far wall, refresher cubicle in the inner far corner
  cabinet(far, wallU(farDir, X(6.6), Z(0)), 1.0, 2.1, 0.55, { color: P.cream, doors: 1, band: P.tealPaint, label: v.label, lamp: "emitAmber" });
  const cw = x1 - x0;
  MM("painted", cw - 1.75, cw, 0.0, 2.35, 0, 1.6, { color: P.creamDark, uv: "world", texel: 1 });
  MM("satinBlack", cw - 1.75, cw, 2.35, 2.5, 0, 1.6);
  MM("metal", cw - 1.4, cw - 0.4, 2.5, 2.8, 0.3, 1.2, { color: P.gunmetal, texel: 1 });
  MM("satinBlack", cw - 0.9, cw - 0.2, 0.05, 2.1, 1.6, 1.63);
  MM("darkGloss", cw - 0.86, cw - 0.24, 1.5, 1.7, 1.63, 1.64);
  MM("metal", cw - 0.86, cw - 0.24, 1.05, 1.1, 1.63, 1.66, { color: P.steel });
  MM("emitTeal", cw - 0.3, cw - 0.24, 1.2, 1.5, 1.63, 1.65);
  MM("satinBlack", cw - 1.75, cw - 0.95, 2.05, 2.25, 1.6, 1.66);
  MM("emitWhiteSoft", cw - 1.7, cw - 1.0, 2.1, 2.2, 1.66, 1.67, { uv: "keep" });
  for (let k = 0; k < 6; k++) MM("metal", cw - 1.6, cw - 1.1, 0.35 + k * 0.06, 0.365 + k * 0.06, 1.6, 1.615, { color: P.darkMetal });
  stencil(frames[farDir], wallU(farDir, X(cw - 1.3), Z(0)), 1.7, 0.3, 12, { n: 1.605 * 0 + 0.0 });
  {
    // the cubicle's door face carries the stencil, built on a temporary frame so it faces the room
    const fx = X(cw - 1.3);
    const fz = Z(1.605);
    const f = hallSide === "+z" ? wallFrame(kit, [fx - 1, fz], [fx + 1, fz], y).frame : wallFrame(kit, [fx + 1, fz], [fx - 1, fz], y).frame;
    stencil(f, 1.0, 1.7, 0.3, 12, { n: 0.01 });
  }
  const cr = rect(cw - 1.75, cw, 0, 1.66);
  kit.collider([cr[0], y, cr[2]], [cr[1], y + 2.8, cr[3]], "refresher");

  // --- sitting corner along the outer wall: sofa, low table, chair, rug, shelf
  bench(kit, X(0.55), y, Z(4.3), F("+x"), { len: 2.0, color: v.sofa });
  const [tx0, tx1, tz0, tz1] = rect(1.35, 2.15, 3.95, 4.65);
  kit.boxMM("satinBlack", [tx0, y + 0.42, tz0], [tx1, y + 0.46, tz1]);
  for (const [lx, lz] of [[tx0 + 0.05, tz0 + 0.05], [tx1 - 0.05, tz0 + 0.05], [tx0 + 0.05, tz1 - 0.05], [tx1 - 0.05, tz1 - 0.05]]) kit.box("metal", lx, y + 0.21, lz, 0.04, 0.42, 0.04, { color: P.steel });
  kit.collider([tx0, y, tz0], [tx1, y + 0.46, tz1], "lowtable");
  effects(kit, X(1.75), y + 0.46, Z(4.2), "datapad", 0.6);
  chair(kit, X(2.9), y, Z(4.3), F("-x"), { seatColor: v.sofa, arms: false });
  MM("fabric", 0.9, 4.1, 0.0, 0.012, 2.8, 5.8, { color: P.fabricTeal, uv: "world", texel: 1.5 });
  west.box("metal", wallU(westDir, X(0), Z(4.3)), 1.45, 0.14, 1.6, 0.04, 0.28, { color: P.gunmetal, texel: 1 });
  west.box("metal", wallU(westDir, X(0), Z(4.3)), 1.49, 0.27, 1.6, 0.04, 0.02, { color: P.steel });
  effects(kit, X(0.15), y + 1.47, Z(3.8), "canister");
  effects(kit, X(0.15), y + 1.47, Z(4.4), "frame", mirrorX ? -Math.PI / 2 : Math.PI / 2);
  effects(kit, X(0.15), y + 1.47, Z(4.85), "stack", mirrorX ? -1.2 : 1.2);
  wallLightBar(west, wallU(westDir, X(0), Z(4.9)) - 1.2, wallU(westDir, X(0), Z(4.9)) + 1.2, 2.35, "emitWarmSoft");

  // --- inner wall: viewscreen, a comm panel and a wardrobe by the door
  wallScreen(east, wallU(eastDir, X(cw), Z(4.0)), 1.8, 1.3, 0.75, "screen0", { bezel: 0.05 });
  commPanel(east, wallU(eastDir, X(cw), Z(5.6)), 1.4, { screen: "screen3", accent: "emitAmber" });
  cabinet(east, wallU(eastDir, X(cw), Z(6.8)), 1.1, 2.1, 0.55, { color: P.creamDark, doors: 2, band: P.tealPaint, vents: false, label: 9 });
  // far-wall dressing over the bunk and desk
  wallLightBar(far, wallU(farDir, X(0.4), Z(0)) < wallU(farDir, X(5.9), Z(0)) ? wallU(farDir, X(0.4), Z(0)) : wallU(farDir, X(5.9), Z(0)), Math.max(wallU(farDir, X(0.4), Z(0)), wallU(farDir, X(5.9), Z(0))), 2.45, "emitWarmSoft");
  wallScreen(far, wallU(farDir, X(3.6), Z(0)), 1.75, 0.9, 0.5, "screen1", { bezel: 0.04, housing: 0.06 });
  stencil(far, wallU(farDir, X(4.9), Z(0)), 1.75, 0.3, 9);

  // --- ceiling: warm pendant + practical
  const px = X(cw / 2);
  const pz = Z(3.6);
  kit.box("paintedMetal", px, yTop - 0.06, pz, 1.4, 0.12, 0.5, { color: P.gunmetal });
  kit.box("emitWarmSoft", px, yTop - 0.125, pz, 1.2, 0.01, 0.3, { uv: "keep" });
  ctx.lights.warm.push(pointLight(0xffc48c, 6.5, 9, [px, yTop - 0.45, pz]));
  downlight(kit, X(3.2), yTop, Z(1.5), 0.9, 0.3, "emitWarmSoft");
  ctx.lights.warm.push(pointLight(0xffd2a0, 4.0, 7, [X(3.2), yTop - 0.4, Z(1.5)]));
}
