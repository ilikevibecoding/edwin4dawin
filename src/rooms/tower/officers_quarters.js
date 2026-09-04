// Officers' Quarters — a short central corridor (gloss deck, amber edge lights, warm ceiling channel) with
// two cabins each side behind Imperial door frames, and a lounge across the aft end. Each cabin: bunk with
// a shelf (helmet) and a warm reading light, desk with a terminal and chair, wardrobe lockers, a refresher
// alcove (sink, dark-gloss mirror, privacy screen), a cape stand, a footlocker. The first cabin's bunk is the
// 'Rest' interactable. Lounge: two chairs and a low table, a sofa under the emblem, a dining counter,
// service unit and holonet screen. Accent warm amber; seven warm lights.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { Placer } from "../../core/props.js";
import { wallFrame, panelGrid } from "../../core/frame.js";
import { screenRect, ledRect, DECAL } from "../../textures.js";
import { Instancer, chairProto, lightBand, screenArray } from "./tactical.js";

export const meta = { id: "officers_quarters", stream: "tower-rooms" };

const AXIS_X = 49.5; // corridor door centre
const HALF = 1.5; // corridor half width
const T = 0.25; // partition thickness
const SEP_Z = 217.5; // cabin separator line
const LOUNGE_Z = 222.7; // lounge wall line
const DOOR_W = 1.2;
const DOOR_H = 2.2;

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const H = ctx.h;
  const ax = AXIS_X;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    ceiling: false,
    seed: 29,
    walls: {
      zmin: { styles: { plate: 0.85, panel: 0.1, hatch: 0.05 } },
      zmax: { styles: { plate: 0.85, panel: 0.1, vent: 0.05 } },
      xmin: { styles: { plate: 0.9, vent: 0.1 } },
      xmax: { styles: { plate: 0.9, vent: 0.1 } },
    },
  });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) lightBand(ctx.wall(side), { mat: "emitWarmSoft" });
  // plain ceiling panels; light channels are placed per zone below
  const { frame: cf, w: cw, d: cd } = ctx.ceilingFrame();
  panelGrid(cf, cw, cd, { rows: null, panelW: 1.8, kick: false, cornice: false, seed: 31, collide: false, styles: { plate: 0.85, vent: 0.1, pipes: 0.05 }, bands: [], tints: [[IMP.plateDark, 0.7], [IMP.trim, 0.3]], detail: 0 });

  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "oq_chair", { color: IMP.fabricBlack });
  const wallX = [ax - HALF, ax + HALF]; // corridor partition lines
  const doorZ = [z0 + 2.9, SEP_Z + T / 2 + 2.9];

  // ---- partitions ----
  const top = fy + H;
  for (const wx of wallX) {
    // corridor wall with two door openings
    let zc = z0;
    for (const dz of doorZ) {
      partition(kit, [wx - T / 2, zc], [wx + T / 2, dz - DOOR_W / 2], fy, top);
      partition(kit, [wx - T / 2, dz - DOOR_W / 2], [wx + T / 2, dz + DOOR_W / 2], fy + DOOR_H, top, { trims: false });
      zc = dz + DOOR_W / 2;
    }
    partition(kit, [wx - T / 2, zc], [wx + T / 2, LOUNGE_Z + T / 2], fy, top);
  }
  for (const [xa, xb] of [[x0, ax - HALF - T / 2], [ax + HALF + T / 2, x1]]) {
    partition(kit, [xa, SEP_Z - T / 2], [xb, SEP_Z + T / 2], fy, top);
    partition(kit, [xa, LOUNGE_Z - T / 2], [xb, LOUNGE_Z + T / 2], fy, top);
  }
  // door frames + cabin numbers on the corridor faces
  let num = 0;
  for (const wx of wallX) {
    const side = wx < ax ? -1 : 1; // -1 west wall, +1 east wall
    for (const dz of doorZ) {
      props.doorFrame(kit, { pos: [wx, fy, dz], yaw: Math.PI / 2, w: DOOR_W, h: DOOR_H, d: T, accent: "emitAmber" });
      const P = new Placer(kit, [wx - side * (T / 2 + 0.006), fy, dz + 0.95], side < 0 ? Math.PI / 2 : -Math.PI / 2);
      P.decal(0, 1.75, 0, 0.32, 0.32, DECAL.NUMBER0 + num);
      num++;
    }
  }
  // lounge threshold: wide Imperial frame where the corridor opens out
  props.doorFrame(kit, { pos: [ax, fy, LOUNGE_Z], yaw: 0, w: 2 * HALF, h: 2.7, d: T, accent: "emitAmber", wide: true, sill: false });

  // ---- corridor ----
  {
    kit.boxMM("darkGloss", [ax - 1.0, fy + 0.002, z0 + 1.3], [ax + 1.0, fy + 0.012, LOUNGE_Z - 0.4]);
    for (const s of [-1, 1]) kit.boxMM("emitAmber", [ax + s * 1.02 - 0.01, fy + 0.003, z0 + 1.3], [ax + s * 1.02 + 0.01, fy + 0.013, LOUNGE_Z - 0.4], { uv: "keep" });
    kit.boxMM("hazard", [ax - 1.4, fy + 0.003, z0 + 0.05], [ax + 1.4, fy + 0.009, z0 + 1.25], { texel: 1.5 });
    props.ceilingStrip(kit, { pos: [ax, ctx.ceil, (z0 + LOUNGE_Z) / 2], len: LOUNGE_Z - z0 - 1.2, w: 0.3, axis: "z", mat: "emitWarmSoft" });
    // warm wall bands on the corridor partitions (skip the door openings)
    for (const wx of wallX) {
      const side = wx < ax ? -1 : 1; // -1: west wall (corridor face on its +X side)
      const faceX = wx - side * (T / 2);
      const spans = [[z0 + 0.2, doorZ[0] - DOOR_W / 2 - 0.35], [doorZ[0] + DOOR_W / 2 + 0.35, doorZ[1] - DOOR_W / 2 - 0.35], [doorZ[1] + DOOR_W / 2 + 0.35, LOUNGE_Z - 0.4]];
      for (const [a, b] of spans) {
        kit.box("paintedMetal", faceX, fy + 1.73, (a + b) / 2, 0.06, 0.22, b - a, { color: IMP.black, texel: 1 });
        kit.box("emitWarmSoft", faceX - side * 0.038, fy + 1.73, (a + b) / 2, 0.016, 0.14, b - a - 0.1, { uv: "keep" });
      }
      // a deck-code stencil at the corridor entry
      const P = new Placer(kit, [faceX - side * 0.012, fy, z0 + 1.2], side < 0 ? Math.PI / 2 : -Math.PI / 2);
      P.decal(0, 2.5, 0, 0.6, 0.6, side < 0 ? DECAL.DECK_A : DECAL.TEXT_B);
    }
  }

  // ---- cabins ----
  const cabins = [
    { cornerX: ax - HALF - T / 2, out: -1, z0: z0, z1: SEP_Z - T / 2, rest: true, seed: 1 },
    { cornerX: ax - HALF - T / 2, out: -1, z0: SEP_Z + T / 2, z1: LOUNGE_Z - T / 2, rest: false, seed: 2 },
    { cornerX: ax + HALF + T / 2, out: 1, z0: z0, z1: SEP_Z - T / 2, rest: false, seed: 3 },
    { cornerX: ax + HALF + T / 2, out: 1, z0: SEP_Z + T / 2, z1: LOUNGE_Z - T / 2, rest: false, seed: 4 },
  ];
  for (const c of cabins) cabin(ctx, chair, { ...c, width: c.out < 0 ? c.cornerX - x0 : x1 - c.cornerX });

  // ---- lounge ----
  {
    const lz0 = LOUNGE_Z + T / 2;
    const W = ctx.wall("zmax");
    const u = (x) => x1 - x;
    // emblem alcove on the aft wall with an amber picture light
    W.frame.box("paintedMetal", u(ax), 2.45, 0.05, 3.4, 2.4, 0.1, { color: IMP.black, texel: 1 });
    W.frame.box("plate", u(ax), 2.45, 0.1, 3.2, 2.2, 0.02, { color: IMP.plateDark, uv: "keep" });
    W.frame.box("paintedMetal", u(ax), 3.75, 0.2, 3.5, 0.08, 0.3, { color: IMP.black, texel: 1 });
    W.frame.box("emitWarmSoft", u(ax), 3.7, 0.2, 3.2, 0.012, 0.16, { uv: "keep" });
    W.frame.decal(u(ax), 2.5, 0.12, 1.8, 1.8, DECAL.EMBLEM);
    // sofa under the emblem, low table and two chairs in front
    sofa(kit, [ax, fy, z1 - 0.55], 3.2);
    lowTable(kit, [ax, fy, 225.3]);
    chair(ax - 1.35, fy, 225.3, -Math.PI / 2);
    chair(ax + 1.35, fy, 225.3, Math.PI / 2);
    kit.boxMM("fabric", [ax - 2.2, fy + 0.004, 224.0], [ax + 2.2, fy + 0.014, z1 - 1.15], { color: IMP.fabricBlack, uv: "world", texel: 2 });
    // dining counter along the port wall with three chairs
    const tz = 225.3;
    kit.box("paintedMetal", x0 + 0.85, fy + 0.7, tz, 0.8, 0.08, 3.0, { color: IMP.black, texel: 1 });
    kit.box("darkGloss", x0 + 0.85, fy + 0.745, tz, 0.76, 0.01, 2.96);
    for (const dz of [-1.3, 1.3]) kit.box("plate", x0 + 0.85, fy + 0.33, tz + dz, 0.6, 0.66, 0.3, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("emitWarmSoft", x0 + 1.24, fy + 0.62, tz, 0.006, 0.02, 2.6, { uv: "keep" });
    kit.collider([x0 + 0.4, fy, tz - 1.5], [x0 + 1.25, fy + 0.8, tz + 1.5], "counter");
    for (const dz of [-1.0, 0, 1.0]) chair(x0 + 1.95, fy, tz + dz, Math.PI / 2);
    // service unit + holonet screen on the starboard side, lockers on the lounge's forward wall
    props.computerBank(kit, { pos: [x1 - 0.6, fy, 226.2], yaw: -Math.PI / 2, w: 2.0, h: 2.2, d: 0.6, seed: 181, accent: "emitAmber" });
    const E = ctx.wall("xmax");
    screenArray(E.frame, 224.0 - z0, 2.2, 1, 1, 1.8, 1.0, [10]);
    const LF = wallFrame(kit, [ax + HALF + 1.4, lz0], [ax + HALF + 4.4, lz0], fy).frame; // faces +Z into the lounge
    props.lockerRow(kit, LF, 0.2, 4, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    const LW = wallFrame(kit, [x0 + 0.4, lz0], [ax - HALF - 1.4, lz0], fy).frame;
    LW.decal(1.6, 2.4, 0.01, 0.9, 0.9, DECAL.TEXT_A);
    LW.decal(4.2, 2.4, 0.01, 0.6, 0.6, DECAL.NUMBER3);
    // lounge ceiling channels + floor line at the threshold
    for (const cz of [224.2, 226.6]) props.ceilingStrip(kit, { pos: [(x0 + x1) / 2, ctx.ceil, cz], len: x1 - x0 - 2.0, w: 0.3, axis: "x", mat: "emitWarmSoft" });
    kit.boxMM("hazard", [ax - 1.4, fy + 0.003, lz0 + 0.05], [ax + 1.4, fy + 0.009, lz0 + 0.5], { texel: 1.5 });
  }

  // ---- lights: one per cabin, one for the corridor, two for the lounge ----
  for (const c of cabins) ctx.light(0xffc78a, 34, 12, [c.cornerX + c.out * (c.width / 2 + 0.9), fy + 3.2, (c.z0 + c.z1) / 2 + 0.3], { decay: 1.3 });
  ctx.light(0xffd9b0, 22, 12, [ax, fy + 3.4, (z0 + LOUNGE_Z) / 2], { decay: 1.5 });
  ctx.light(0xffc78a, 28, 14, [ax - 4.0, fy + 3.4, 225.3], { decay: 1.4 });
  ctx.light(0xffc78a, 28, 14, [ax + 4.0, fy + 3.4, 225.3], { decay: 1.4 });
  inst.build();
}

// ---------------------------------------------------------------------------------------------------
/** Axis-aligned partition segment between floor points a=[x,z] and b=[x,z] (min/max), from y0 up to y1. */
function partition(kit, a, b, y0, y1, { trims = true } = {}) {
  kit.boxMM("plate", [a[0], y0, a[1]], [b[0], y1, b[1]], { color: IMP.plateDark, uv: "world", texel: 1 });
  if (trims) {
    kit.boxMM("paintedMetal", [a[0] - 0.02, y0, a[1] - 0.02], [b[0] + 0.02, y0 + 0.3, b[1] + 0.02], { color: IMP.black, texel: 1 });
    kit.boxMM("paintedMetal", [a[0] - 0.02, y1 - 0.25, a[1] - 0.02], [b[0] + 0.02, y1, b[1] + 0.02], { color: IMP.black, texel: 1 });
  }
  kit.collider([a[0], y0, a[1]], [b[0], y1, b[1]], "partition");
}

/**
 * One cabin. Local frame: lx runs from the corridor wall outward (toward the hull wall), lz runs aft from
 * the cabin's forward wall. cornerX = corridor-side wall face, out = ±1 (direction of lx in world x).
 */
function cabin(ctx, chair, { cornerX, out, z0, z1, width, rest, seed }) {
  const { kit, props } = ctx;
  const fy = ctx.floor;
  const depth = z1 - z0;
  const X = (lx) => cornerX + out * lx;
  const Z = (lz) => z0 + lz;
  const box = (mat, lx0, lx1, y0, y1, lz0, lz1, opts) => kit.boxMM(mat, [Math.min(X(lx0), X(lx1)), y0, Z(lz0)], [Math.max(X(lx0), X(lx1)), y1, Z(lz1)], opts);
  const rand = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();

  // refresher alcove in the corridor-side forward corner: privacy screen, sink, mirror, light
  {
    box("darkGloss", 0.02, 1.7, fy + 0.002, fy + 0.012, 0.02, 1.6);
    box("plate", 0.1, 1.72, fy, fy + 2.2, 1.6, 1.68, { color: IMP.plateDark, uv: "world", texel: 1 });
    box("paintedMetal", 0.08, 1.74, fy, fy + 0.3, 1.58, 1.7, { color: IMP.black, texel: 1 });
    box("paintedMetal", 0.08, 1.74, fy + 2.1, fy + 2.2, 1.58, 1.7, { color: IMP.black, texel: 1 });
    box("emitWarmSoft", 1.71, 1.73, fy + 0.5, fy + 1.9, 1.62, 1.66, { uv: "keep" });
    kit.collider([Math.min(X(0.1), X(1.72)), fy, Z(1.6)], [Math.max(X(0.1), X(1.72)), fy + 2.2, Z(1.68)], "privacy");
    // sink on a pedestal against the forward wall, mirror above, strip light over the mirror
    box("paintedMetal", 0.55, 1.15, fy, fy + 0.8, 0.05, 0.5, { color: IMP.black, texel: 1 });
    box("plate", 0.5, 1.2, fy + 0.8, fy + 0.9, 0.02, 0.56, { color: IMP.plateLight, uv: "world", texel: 1 });
    box("darkGloss", 0.6, 1.1, fy + 0.86, fy + 0.905, 0.12, 0.46);
    kit.cyl("metal", X(0.85), fy + 1.0, Z(0.1), 0.02, 0.24, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("metal", X(0.85), fy + 1.12, Z(0.2), 0.02, 0.22, "z", { color: IMP.steel, segments: 8 });
    box("paintedMetal", 0.45, 1.25, fy + 1.2, fy + 2.05, 0.02, 0.06, { color: IMP.black, texel: 1 });
    box("darkGloss", 0.5, 1.2, fy + 1.25, fy + 2.0, 0.06, 0.075);
    box("emitWarmSoft", 0.5, 1.2, fy + 2.06, fy + 2.1, 0.02, 0.1, { uv: "keep" });
    kit.collider([Math.min(X(0.5), X(1.2)), fy, Z(0)], [Math.max(X(0.5), X(1.2)), fy + 0.95, Z(0.56)], "sink");
    // towel rail + refresher stencil
    kit.cyl("metal", X(1.45), fy + 1.1, Z(0.9), 0.012, 0.6, "z", { color: IMP.steel, segments: 8 });
    box("fabric", 1.4, 1.5, fy + 0.5, fy + 1.1, 0.75, 1.05, { color: IMP.plateLight, uv: "world", texel: 2 });
  }

  // bunk along the hull wall, aft half; footlocker at its foot; shelf with helmet above the pillow
  const bx = X(width - 0.55);
  const bz = Z(depth - 1.4);
  props.bunk(kit, { pos: [bx, fy, bz], yaw: 0, level: 0.5, len: 2.0, w: 0.9, fabric: IMP.fabricGrey });
  kit.box("paintedMetal", bx, fy + 0.22, Z(depth - 2.85), 0.8, 0.44, 0.5, { color: IMP.black, texel: 1 });
  kit.box("plate", bx, fy + 0.22, Z(depth - 2.85), 0.74, 0.34, 0.44, { color: IMP.plateDark, uv: "world", texel: 1 });
  kit.box("hazard", bx, fy + 0.22, Z(depth - 2.85), 0.81, 0.05, 0.51, { texel: 3 });
  kit.collider([bx - 0.4, fy, Z(depth - 3.1)], [bx + 0.4, fy + 0.45, Z(depth - 2.6)], "footlocker");
  {
    const sx = X(width - 0.28);
    const sz = Z(depth - 0.75);
    kit.box("paintedMetal", sx, fy + 1.55, sz, 0.5, 0.04, 0.7, { color: IMP.black, texel: 1 });
    kit.box("paintedMetal", sx, fy + 1.9, sz, 0.5, 0.04, 0.7, { color: IMP.black, texel: 1 });
    box("plate", width - 0.06, width - 0.02, fy + 1.55, fy + 1.9, depth - 1.1, depth - 0.4, { color: IMP.plateDark, uv: "world", texel: 1 });
    helmet(kit, [X(width - 0.3), fy + 1.57, sz + 0.15]);
    kit.box("darkGloss", X(width - 0.3), fy + 1.585, sz - 0.2, 0.22, 0.02, 0.16);
    kit.box("screen", X(width - 0.3), fy + 1.597, sz - 0.2, 0.18, 0.004, 0.12, { uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
  }
  // reading light: warm strip on the hull wall over the bunk
  box("paintedMetal", width - 0.14, width, fy + 1.1, fy + 1.22, depth - 2.2, depth - 0.6, { color: IMP.black, texel: 1 });
  box("emitWarmSoft", width - 0.15, width - 0.14, fy + 1.13, fy + 1.19, depth - 2.1, depth - 0.7, { uv: "keep" });
  // desk with a terminal against the forward wall, chair facing it
  {
    const dx = X(width - 1.7);
    const dz = Z(0.42);
    kit.box("paintedMetal", dx, fy + 0.73, dz, 1.6, 0.05, 0.7, { color: IMP.black, texel: 1 });
    kit.box("darkGloss", dx, fy + 0.76, dz, 1.56, 0.01, 0.66);
    for (const s of [-1, 1]) kit.box("plate", dx + s * 0.72, fy + 0.36, dz, 0.1, 0.72, 0.62, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("paintedMetal", dx, fy + 0.32, dz - 0.28, 1.4, 0.5, 0.06, { color: IMP.plateDark, texel: 1 });
    // terminal: angled screen on a stand + keypad + a data pad
    kit.box("paintedMetal", dx, fy + 0.86, Z(0.22), 0.16, 0.2, 0.1, { color: IMP.black, texel: 1 });
    kit.box("darkGloss", dx, fy + 1.12, Z(0.2), 0.7, 0.44, 0.03, { rot: [-0.18, 0, 0] });
    kit.box("screen", dx, fy + 1.12, Z(0.2) + 0.018, 0.64, 0.38, 0.004, { rot: [-0.18, 0, 0], uv: "keep", uvRect: screenRect(Math.floor(rand() * 16)) });
    kit.box("leds", dx, fy + 0.768, Z(0.5), 0.5, 0.006, 0.12, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
    kit.box("darkGloss", dx + 0.55, fy + 0.766, Z(0.5), 0.22, 0.006, 0.16);
    kit.collider([dx - 0.8, fy, Z(0.05)], [dx + 0.8, fy + 0.78, Z(0.77)], "desk");
    chair(dx, fy, Z(1.15), 0);
  }
  // wardrobe lockers on the aft wall beside the corridor, cape stand next to them
  {
    const [ua, ub] = out < 0 ? [X(0.45), X(1.65)] : [X(1.65), X(0.45)];
    const F = wallFrame(kit, [ua, Z(depth) - 0.005], [ub, Z(depth) - 0.005], fy).frame;
    props.lockerRow(kit, F, 0, 2, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    capeStand(kit, [X(2.15), fy, Z(depth - 0.55)]);
  }
  // rug, ceiling fixture, wall stencils
  box("fabric", 1.9, width - 1.2, fy + 0.004, fy + 0.014, 1.9, depth - 0.7, { color: IMP.fabricBlack, uv: "world", texel: 2 });
  {
    const lx = X(width / 2 + 0.3);
    const lz = Z(depth / 2);
    kit.box("paintedMetal", lx, ctx.ceil - 0.06, lz, 0.9, 0.12, 0.9, { color: IMP.black, texel: 1 });
    kit.box("emitWarmSoft", lx, ctx.ceil - 0.125, lz, 0.7, 0.01, 0.7, { uv: "keep" });
  }
  {
    const A = new Placer(kit, [X(width - 3.2), fy, Z(depth) - 0.012], Math.PI); // faces −Z into the cabin
    A.decal(0, 2.5, 0, 0.9, 0.9, DECAL.EMBLEM);
    A.decal(-1.0, 2.5, 0, 0.5, 0.5, DECAL.TEXT_C);
    const B = new Placer(kit, [X(width - 1.7), fy, Z(0) + 0.012], 0); // forward wall over the desk
    B.decal(0, 2.1, 0, 0.6, 0.6, DECAL.TEXT_A);
  }
  // 'Rest' interactable: the blanket on this cabin's bunk
  if (rest) {
    const mat = ctx.materials.fabric.clone();
    mat.vertexColors = false;
    mat.color.set(IMP.fabricGrey);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 1.5), mat);
    blanket.position.set(bx, fy + 0.5 + 0.165, bz - 0.2);
    blanket.castShadow = false;
    ctx.interactable({ object: blanket, material: mat, id: "officers_bunk", kind: "bunk", label: "Rest", key: "E" });
  }
}

/** Imperial helmet on a shelf: dome, brow ridge, black visor band, chin plate. */
function helmet(kit, pos) {
  const [x, y, z] = pos;
  kit.add("paintedMetal", new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [x, y + 0.1, z], color: IMP.plateLight, uv: "scale", uvScale: [1, 1] });
  kit.cyl("paintedMetal", x, y + 0.06, z, 0.15, 0.1, "y", { color: IMP.plateLight, segments: 14 });
  kit.box("paintedMetal", x, y + 0.12, z + 0.11, 0.26, 0.05, 0.1, { color: IMP.plateLight, texel: 1 });
  kit.box("darkGloss", x, y + 0.08, z + 0.14, 0.24, 0.05, 0.03);
  kit.box("paintedMetal", x, y + 0.03, z + 0.12, 0.18, 0.05, 0.07, { color: IMP.black, texel: 1 });
}

/** Cape stand: weighted base, post, cross hook, and a draped officer's cape. */
function capeStand(kit, pos) {
  const [x, y, z] = pos;
  kit.cyl("paintedMetal", x, y + 0.02, z, 0.22, 0.04, "y", { color: IMP.black, segments: 14 });
  kit.cyl("metal", x, y + 0.9, z, 0.025, 1.76, "y", { color: IMP.gunmetal, segments: 8 });
  kit.box("metal", x, y + 1.76, z, 0.44, 0.03, 0.03, { color: IMP.gunmetal });
  kit.add("fabric", new THREE.CylinderGeometry(0.07, 0.26, 1.5, 10), { pos: [x + 0.12, y + 0.98, z], color: IMP.fabricBlack, uv: "scale", uvScale: [2, 3] });
  kit.box("paintedMetal", x + 0.12, y + 1.68, z, 0.09, 0.05, 0.05, { color: IMP.black, texel: 1 });
  kit.collider([x - 0.28, y, z - 0.28], [x + 0.32, y + 1.8, z + 0.28], "cape");
}

/** Low lounge table: black plinth, gloss top with an amber edge line. */
function lowTable(kit, pos) {
  const [x, y, z] = pos;
  kit.box("paintedMetal", x, y + 0.2, z, 0.9, 0.4, 0.5, { color: IMP.black, texel: 1 });
  kit.box("metal", x, y + 0.43, z, 1.4, 0.06, 0.8, { color: IMP.steelDark });
  kit.box("darkGloss", x, y + 0.465, z, 1.36, 0.01, 0.76);
  kit.box("emitAmber", x, y + 0.44, z, 1.3, 0.008, 0.7, { uv: "keep" });
  kit.box("darkGloss", x, y + 0.47, z, 1.34, 0.004, 0.74);
  kit.collider([x - 0.7, y, z - 0.4], [x + 0.7, y + 0.48, z + 0.4], "table");
}

/** Sofa along a wall (+Z is the wall side): black plinth, grey cushions, low back. */
function sofa(kit, pos, len) {
  const [x, y, z] = pos;
  kit.box("paintedMetal", x, y + 0.2, z, len, 0.4, 0.8, { color: IMP.black, texel: 1 });
  kit.box("fabric", x, y + 0.47, z - 0.05, len - 0.08, 0.14, 0.7, { color: IMP.fabricGrey, uv: "world", texel: 2 });
  kit.box("fabric", x, y + 0.75, z + 0.3, len - 0.08, 0.55, 0.16, { color: IMP.fabricGrey, uv: "world", texel: 2 });
  for (const s of [-1, 1]) kit.box("paintedMetal", x + s * (len / 2 + 0.03), y + 0.45, z, 0.06, 0.9, 0.8, { color: IMP.black, texel: 1 });
  kit.box("emitWarmSoft", x, y + 0.38, z - 0.401, len - 0.6, 0.012, 0.005, { uv: "keep" });
  kit.collider([x - len / 2 - 0.06, y, z - 0.4], [x + len / 2 + 0.06, y + 1.0, z + 0.4], "sofa");
}
