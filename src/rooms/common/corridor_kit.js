// Shared kit for the ship's corridors and turbolift lobbies (owner: corridors workstream).
// Death Star / Star Destroyer circulation language: dark plating with a continuous waist light band, chamfered
// ceiling coves carrying recessed white strips, octagonal bulkhead rings every bay, recessed computer-bank
// alcoves, drainage grates along the walls, a black traffic lane with directional stencils, emergency lamps,
// utility cabinets and one open maintenance hatch per corridor. Repeated assemblies are instanced (kit.proto).
import * as THREE from "three";
import { Frame, panelGrid, pilaster } from "../../core/frame.js";
import { prism, rng, rectUVs } from "../../core/kit.js";
import { IMP } from "../../core/palette.js";
import * as props from "../../core/props.js";
import { DECAL, decalRect, ledRect, screenRect } from "../../textures.js";

export const WALL_H = 3.9; // panelled wall height under the ceiling cove (corridors, 4.5 m rooms)
const COVE = 0.6; // chamfer size of the ceiling cove
const PILASTER = 4.8;
const K = Math.SQRT1_2;

// ---------------------------------------------------------------------------------------------------
// Palette variants
// ---------------------------------------------------------------------------------------------------
const TINTS = {
  cool: [
    [[IMP.plate, 0.55], [IMP.plateDark, 0.25], [IMP.plateBlue, 0.12], [IMP.plateLight, 0.08]],
    [[IMP.plateDark, 0.5], [IMP.plateBlue, 0.3], [IMP.plate, 0.2]],
    [[IMP.plate, 0.4], [IMP.plateDark, 0.4], [IMP.gunmetal, 0.2]],
    [[IMP.plateLight, 0.3], [IMP.plate, 0.5], [IMP.plateDark, 0.2]],
  ],
  warm: [
    [[IMP.plate, 0.45], [IMP.plateWarm, 0.3], [IMP.plateDark, 0.2], [IMP.plateLight, 0.05]],
    [[IMP.plateWarm, 0.45], [IMP.plateDark, 0.35], [IMP.plate, 0.2]],
    [[IMP.plate, 0.4], [IMP.plateDark, 0.35], [IMP.plateWarm, 0.25]],
    [[IMP.plateLight, 0.25], [IMP.plateWarm, 0.35], [IMP.plate, 0.4]],
  ],
};
const ROWS = [
  [0, 0.35, 1.6, 1.85, 2.9, WALL_H],
  [0, 0.35, 1.6, 1.85, WALL_H],
  [0, 0.35, 0.95, 1.6, 1.85, 3.1, WALL_H],
  [0, 0.35, 1.6, 1.85, 2.5, WALL_H],
];
const STYLES = [
  { plate: 0.7, panel: 0.1, vent: 0.06, hatch: 0.06, pipes: 0.04, screen: 0.04 },
  { plate: 0.5, panel: 0.22, screen: 0.12, vent: 0.06, hatch: 0.05, pipes: 0.05 },
  { plate: 0.55, vent: 0.15, pipes: 0.12, hatch: 0.1, panel: 0.05, screen: 0.03 },
  { plate: 0.85, panel: 0.05, vent: 0.04, hatch: 0.04, pipes: 0.02 },
];
const PANEL_W = [1.6, 1.2, 2.0, 1.4];

export function accentMat(color) {
  if (color === IMP.red) return "emitRed";
  if (color === IMP.amber) return "emitAmber";
  if (color === IMP.cyan) return "emitCyan";
  if (color === IMP.violet) return "emitViolet";
  if (color === IMP.green) return "emitGreen";
  if (color === IMP.white) return "emitWhite";
  return "emitBlue";
}

/** Bay wall options (panelGrid) for bay index i; tint family 'cool' | 'warm'. */
export function bayWallOpts(i, family = "cool", seed = 1) {
  const v = i % 4;
  return { rows: ROWS[v], styles: STYLES[v], tints: TINTS[family][v], panelW: PANEL_W[v], seed: seed * 17 + i * 101 };
}

// ---------------------------------------------------------------------------------------------------
// Instancing helper: Kit.proto strips vertex colours, but the tinted materials use vertexColors — give the
// prototype geometry a white colour attribute so the per-instance colour is what shows.
// ---------------------------------------------------------------------------------------------------
export function protoSafe(kit, name, mat, geo, opts = {}) {
  kit.proto(name, mat, geo, opts);
  const g = kit.protos.get(name).geo;
  if (!g.attributes.color) {
    const n = g.attributes.position.count;
    g.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(n * 3).fill(255), 3, true));
  }
}

// ---------------------------------------------------------------------------------------------------
// Corridor description: along axis `a`, across axis `s`
// ---------------------------------------------------------------------------------------------------
export function describe(ctx, axis) {
  const { x0, x1, z0, z1 } = ctx.inner;
  const B = ctx.box;
  if (axis === "x") {
    return {
      axis,
      a0: x0,
      a1: x1,
      s0: z0,
      s1: z1,
      ba0: B.x0,
      ba1: B.x1,
      bs0: B.z0,
      bs1: B.z1,
      mid: (z0 + z1) / 2,
      sideLo: "zmin",
      sideHi: "zmax",
      endLo: "xmin",
      endHi: "xmax",
      P: (a, s, y) => [a, y, s],
      uOf: (side, a) => (side === "zmin" ? a - x0 : x1 - a),
      aOf: (side, u) => (side === "zmin" ? x0 + u : x1 - u),
      uSign: (side) => (side === "zmin" ? 1 : -1),
      alongQuat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
    };
  }
  return {
    axis,
    a0: z0,
    a1: z1,
    s0: x0,
    s1: x1,
    ba0: B.z0,
    ba1: B.z1,
    bs0: B.x0,
    bs1: B.x1,
    mid: (x0 + x1) / 2,
    sideLo: "xmin",
    sideHi: "xmax",
    endLo: "zmin",
    endHi: "zmax",
    P: (a, s, y) => [s, y, a],
    uOf: (side, a) => (side === "xmin" ? z1 - a : a - z0),
    aOf: (side, u) => (side === "xmin" ? z1 - u : z0 + u),
    uSign: (side) => (side === "xmin" ? -1 : 1),
    alongQuat: new THREE.Quaternion(),
  };
}

/** min/max corner arrays from along/across ranges. */
function mm(C, a0, a1, s0, s1, y0, y1) {
  const p0 = C.P(Math.min(a0, a1), Math.min(s0, s1), y0);
  const p1 = C.P(Math.max(a0, a1), Math.max(s0, s1), y1);
  return [p0, p1];
}

// ---------------------------------------------------------------------------------------------------
// Ceiling cove (chamfer with a recessed strip) along one long wall
// ---------------------------------------------------------------------------------------------------
export function cove(ctx, side, { color = IMP.plateDark, stripMat = "emitWhiteSoft", wallH = WALL_H, gaps = [] } = {}) {
  const { frame, length } = ctx.wall(side);
  const H = ctx.h;
  const c = COVE;
  const L = length;
  // dark backing above the panels so the cavity behind the chamfer never shows
  frame.box("paintedMetal", L / 2, (wallH + H) / 2, -0.06, L, H - wallH + 0.08, 0.12, { color: IMP.black, texel: 1 });
  const cv = wallH + c / 2;
  const cn = c / 2;
  const off = (d) => [cv - d * K, cn + d * K];
  const tilt = Math.PI / 4;
  const segs = splitSpans([[0, L]], gaps);
  for (const [u0, u1] of segs) {
    const len = u1 - u0;
    const cu = (u0 + u1) / 2;
    let [v, n] = off(0);
    frame.box("paintedMetal", cu, v, n, len, c * Math.SQRT2 + 0.02, 0.06, { color, texel: 1, tilt });
    // recessed strip: two rails (offset along the plate) and a diffuser sitting between them
    [v, n] = off(0.05);
    for (const s of [-1, 1]) frame.box("paintedMetal", cu, v + s * 0.14 * K, n + s * 0.14 * K, len, 0.06, 0.06, { color: IMP.black, texel: 1, tilt });
    [v, n] = off(0.035);
    frame.box(stripMat, cu, v, n, len - 0.24, 0.22, 0.01, { uv: "keep", tilt });
  }
  // edge rails hide the joints with the wall top and the ceiling
  frame.box("metal", L / 2, wallH + 0.01, 0.06, L, 0.05, 0.06, { color: IMP.steelDark });
  frame.box("metal", L / 2, H - 0.03, c + 0.02, L, 0.06, 0.05, { color: IMP.steelDark });
}

/**
 * Visible diffuser for the waist light band. panelGrid's own strip diffuser (n -0.075, 0.02 deep) sits inside
 * its housing box (n -0.16..-0.04) and never shows, so we lay a continuous diffuser between the housing's
 * two steel rails, broken at every opening that crosses the band (doors, alcoves, hatches, windows).
 */
export function waistStrip(frame, length, openings, { v0 = 1.6, v1 = 1.85, stripMat = "emitWhiteSoft", gaps = [] } = {}) {
  const cut = openings.filter((o) => o.v0 < v1 - 0.01 && o.v1 > v0 + 0.01).map((o) => [o.u0 - 0.02, o.u1 + 0.02]);
  for (const [u0, u1] of splitSpans([[0.02, length - 0.02]], [...cut, ...gaps])) {
    if (u1 - u0 < 0.25) continue;
    frame.box(stripMat, (u0 + u1) / 2, (v0 + v1) / 2, -0.02, u1 - u0, v1 - v0 - 0.06, 0.02, { uv: "keep" });
  }
}

function splitSpans(spans, gaps) {
  let out = spans;
  for (const [g0, g1] of gaps) {
    const next = [];
    for (const [a, b] of out) {
      if (g1 <= a || g0 >= b) next.push([a, b]);
      else {
        if (g0 > a + 0.05) next.push([a, g0]);
        if (g1 < b - 0.05) next.push([g1, b]);
      }
    }
    out = next;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Bulkhead ring: octagonal frame following the corridor section (walls, coves, ceiling), open at the floor
// ---------------------------------------------------------------------------------------------------
function ringPoints(W, H, c, t, ext) {
  const tc = t * 0.414;
  return [
    [-W - ext, -0.05],
    [-W - ext, H - c],
    [-(W - c), H + ext],
    [W - c, H + ext],
    [W + ext, H - c],
    [W + ext, -0.05],
    [W - t, -0.05],
    [W - t, H - c - tc],
    [W - c - tc, H - t],
    [-(W - c - tc), H - t],
    [-(W - t), H - c - tc],
    [-(W - t), -0.05],
  ];
}

export function registerRing(ctx, C, { inset = 0.42, thick = 0.4 } = {}) {
  const W = (C.s1 - C.s0) / 2;
  const H = ctx.h;
  const q = C.alongQuat;
  const mk = (t, d) => {
    const g = prism(ringPoints(W, H, COVE, t, 0.1), d);
    g.applyQuaternion(q);
    return g;
  };
  protoSafe(ctx.kit, "ringA", "paintedMetal", mk(inset, thick), { texel: 1 });
  protoSafe(ctx.kit, "ringB", "paintedMetal", mk(inset * 0.66, thick + 0.24), { texel: 1 });
  return { W, inset };
}

export function placeRing(ctx, C, a, { inset = 0.42, colorA = IMP.plateDark, colorB = IMP.trim, number = 0, thick = 0.4 } = {}) {
  const kit = ctx.kit;
  const y = ctx.floor;
  const W = (C.s1 - C.s0) / 2;
  const H = ctx.h;
  const pos = C.P(a, C.mid, y);
  kit.place("ringA", { pos, color: colorA });
  kit.place("ringB", { pos, color: colorB });
  // status lamps under the crown
  const top = y + H - inset;
  kit.boxMM("darkGloss", ...mm(C, a - 0.28, a + 0.28, C.mid - 0.1, C.mid + 0.1, top - 0.04, top + 0.02));
  kit.boxMM("emitRed", ...mm(C, a - 0.16, a - 0.06, C.mid - 0.04, C.mid + 0.04, top - 0.05, top - 0.03));
  kit.boxMM("emitWhite", ...mm(C, a + 0.06, a + 0.16, C.mid - 0.04, C.mid + 0.04, top - 0.05, top - 0.03));
  // bay numerals on both jamb faces + kick plates
  for (const sgn of [-1, 1]) {
    const s = C.mid + sgn * (W - inset);
    const face = C.P(a, s + sgn * -0.006, y + 1.7);
    const plane = new THREE.PlaneGeometry(0.34, 0.34);
    // plane faces +z; turn it to face into the corridor (−sgn along the across axis)
    const yaw = C.axis === "x" ? (sgn > 0 ? Math.PI : 0) : sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
    kit.add("decal", plane, { pos: face, rot: [0, yaw, 0], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + (number % 4)) });
    kit.boxMM("paintedMetal", ...mm(C, a - thick / 2 - 0.14, a + thick / 2 + 0.14, s, s - sgn * 0.03, y, y + 0.3), { color: IMP.black, texel: 1 });
    kit.collider(...mm(C, a - thick / 2 - 0.12, a + thick / 2 + 0.12, s, C.mid + sgn * (W + 0.2), y, y + H), "bulkhead");
  }
}

// ---------------------------------------------------------------------------------------------------
// Floor: recessed drainage channels with grates and conduits, centre traffic lane, edge lines
// ---------------------------------------------------------------------------------------------------
export function corridorFloor(ctx, C, { laneW = 2.2, laneMat = "deckBlack", laneColor = 0xffffff, deckColor = IMP.plateDark, channel = 0.6 } = {}) {
  const kit = ctx.kit;
  const y = ctx.floor;
  kit.collider(...mm(C, C.ba0, C.ba1, C.bs0, C.bs1, y - 0.6, y), "floor");
  kit.boxMM("deckGrey", ...mm(C, C.ba0, C.ba1, C.s0 + channel, C.s1 - channel, y - 0.4, y), { color: deckColor, texel: 0.5 });
  for (const [sa, sb, sw] of [
    [C.bs0, C.s0 + channel, C.s0],
    [C.s1 - channel, C.bs1, C.s1],
  ]) {
    kit.boxMM("paintedMetal", ...mm(C, C.ba0, C.ba1, sa, sb, y - 0.4, y - 0.16), { color: IMP.darkMetal, texel: 1 });
    const inward = sw === C.s0 ? 1 : -1;
    // kerb under the wall so the channel never opens into the wall cavity
    kit.boxMM("paintedMetal", ...mm(C, C.ba0, C.ba1, sw - inward * 0.3, sw + inward * 0.04, y - 0.4, y), { color: IMP.black, texel: 1 });
    // conduits lying in the channel
    props.pipeRun(kit, { points: [C.P(C.a0 + 0.1, sw + inward * 0.22, y - 0.09), C.P(C.a1 - 0.1, sw + inward * 0.22, y - 0.09)], r: 0.05, color: IMP.steelDark, clamps: 6 });
    props.pipeRun(kit, { points: [C.P(C.a0 + 0.1, sw + inward * 0.42, y - 0.12), C.P(C.a1 - 0.1, sw + inward * 0.42, y - 0.12)], r: 0.028, color: IMP.black, mat: "rubber" });
    const g0 = C.P(C.a0, sw + inward * 0.04, 0);
    const g1 = C.P(C.a1, sw + inward * channel, 0);
    props.floorGrate(kit, [Math.min(g0[0], g1[0]), Math.min(g0[2], g1[2])], [Math.max(g0[0], g1[0]), Math.max(g0[2], g1[2])], y - 0.004);
    // channel lip
    kit.boxMM("metal", ...mm(C, C.a0, C.a1, sw + inward * channel - 0.02, sw + inward * channel + 0.03, y - 0.02, y + 0.012), { color: IMP.steelDark });
  }
  // traffic lane
  kit.boxMM(laneMat, ...mm(C, C.a0 + 0.3, C.a1 - 0.3, C.mid - laneW / 2, C.mid + laneW / 2, y - 0.002, y + 0.01), { color: laneColor, texel: 0.5 });
  for (const sgn of [-1, 1]) {
    const s = C.mid + sgn * (laneW / 2 + 0.03);
    kit.boxMM("paintedMetal", ...mm(C, C.a0 + 0.3, C.a1 - 0.3, s - 0.03, s + 0.03, y, y + 0.012), { color: IMP.plateLight, texel: 1 });
  }
}

/** Floor stencil (decal) at along/across position pointing along ±a (dirA) or ±s (dirS). */
export function floorDecal(ctx, C, a, s, size, index, { dirA = 0, dirS = 0, mirror = false } = {}) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  // arrow points +x after rotateX; choose yaw so it points along the requested world direction
  let dir;
  if (C.axis === "x") dir = dirA ? [dirA, 0] : [0, dirS];
  else dir = dirA ? [0, dirA] : [dirS, 0];
  const yaw = Math.atan2(-dir[1], dir[0]);
  const r = decalRect(index);
  ctx.kit.add("decal", g, { pos: C.P(a, s, ctx.floor + 0.016), rot: [0, yaw, 0], uv: "keep", uvRect: mirror ? [r[2], r[1], r[0], r[3]] : r });
}

export function hazardThreshold(ctx, C, side, a0, a1, { depth = 0.3, gap = 0.5 } = {}) {
  const y = ctx.floor;
  const sw = side === C.sideLo ? C.s0 : C.s1;
  const inward = side === C.sideLo ? 1 : -1;
  ctx.kit.boxMM("hazard", ...mm(C, a0, a1, sw + inward * gap, sw + inward * (gap + depth), y + 0.002, y + 0.014), { texel: 2 });
}

// ---------------------------------------------------------------------------------------------------
// Ceiling per bay: dark panel field between the coves + conduits / central strip / vent tray
// ---------------------------------------------------------------------------------------------------
export function ceilingBay(ctx, C, ba, bb, variant, seed, { stripMat = "emitWhiteSoft", pipeColor = IMP.steelDark, trayColor = IMP.black } = {}) {
  const kit = ctx.kit;
  const cf = ctx.ceilingFrame().frame;
  const c = COVE;
  const { x0, z0 } = ctx.inner;
  let u0, v0, w, d;
  if (C.axis === "x") {
    u0 = ba - x0;
    v0 = C.s0 + c - z0;
    w = bb - ba;
    d = C.s1 - C.s0 - 2 * c;
  } else {
    u0 = C.s0 + c - x0;
    v0 = ba - z0;
    w = C.s1 - C.s0 - 2 * c;
    d = bb - ba;
  }
  const sub = new Frame(kit, cf.pos(u0, v0, 0), cf.U, cf.V);
  const nRows = Math.max(1, Math.round(d / 1.5));
  const rows = [];
  for (let i = 0; i <= nRows; i++) rows.push((i / nRows) * d);
  const styles = variant === 2 ? { plate: 0.6, vent: 0.3, pipes: 0.1 } : { plate: 0.86, vent: 0.1, pipes: 0.04 };
  panelGrid(sub, w, d, { rows, panelW: Math.max(0.8, w / Math.max(1, Math.round(w / 1.5))), kick: false, cornice: false, seed, collide: false, styles, bands: [], tints: [[IMP.plateDark, 0.7], [IMP.trim, 0.3]], detail: 0 });
  const y = ctx.ceil;
  if (variant === 1) {
    // central longitudinal light strip
    kit.boxMM("paintedMetal", ...mm(C, ba + 0.6, bb - 0.6, C.mid - 0.32, C.mid + 0.32, y - 0.14, y), { color: IMP.black, texel: 1 });
    kit.boxMM(stripMat, ...mm(C, ba + 0.8, bb - 0.8, C.mid - 0.16, C.mid + 0.16, y - 0.15, y - 0.13), { uv: "keep" });
  } else if (variant === 2) {
    // cable tray with three conduits
    kit.boxMM("paintedMetal", ...mm(C, ba + 0.2, bb - 0.2, C.mid - 0.55, C.mid + 0.55, y - 0.16, y - 0.06), { color: trayColor, texel: 1 });
    for (const [o, r, col] of [
      [-0.32, 0.07, pipeColor],
      [0, 0.09, IMP.gunmetal],
      [0.34, 0.06, pipeColor],
    ]) {
      props.pipeRun(kit, { points: [C.P(ba + 0.2, C.mid + o, y - 0.26), C.P(bb - 0.2, C.mid + o, y - 0.26)], r, color: col, clamps: 3.2, clampColor: IMP.black });
    }
  } else {
    // two conduits with clamps
    for (const [o, r, col] of [
      [-0.5, 0.075, pipeColor],
      [0.5, 0.055, IMP.gunmetal],
    ]) {
      props.pipeRun(kit, { points: [C.P(ba + 0.2, C.mid + o, y - 0.17), C.P(bb - 0.2, C.mid + o, y - 0.17)], r, color: col, clamps: 3, clampColor: IMP.black });
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// Wall features
// ---------------------------------------------------------------------------------------------------
/** Register the instanced prototypes (emergency lamp, utility cabinet). Call once per room. */
export function registerWallProtos(kit) {
  protoSafe(kit, "lampHousing", "paintedMetal", new THREE.BoxGeometry(0.3, 0.16, 0.1), { texel: 2 });
  protoSafe(kit, "lampDome", "emitRed", new THREE.SphereGeometry(0.055, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  protoSafe(kit, "lampCage", "metal", new THREE.TorusGeometry(0.075, 0.006, 5, 14), { texel: 1 });
  protoSafe(kit, "cabBody", "paintedMetal", new THREE.BoxGeometry(0.84, 1.3, 0.3), { texel: 1 });
  protoSafe(kit, "cabDoor", "plate", new THREE.BoxGeometry(0.74, 1.18, 0.04), { texel: 1 });
  protoSafe(kit, "cabBand", "hazardRed", new THREE.BoxGeometry(0.74, 0.1, 0.05), { texel: 3 });
  protoSafe(kit, "cabHandle", "metal", new THREE.BoxGeometry(0.05, 0.28, 0.05), { texel: 1 });
  protoSafe(kit, "cabLamp", "emitRed", new THREE.BoxGeometry(0.06, 0.06, 0.02));
  const dec = new THREE.PlaneGeometry(0.4, 0.4);
  rectUVs(dec, decalRect(DECAL.WARNING));
  protoSafe(kit, "cabDecal", "decal", dec, { uv: "keep" });
}

/** Emergency light node on a wall frame at (u, v). */
export function emergencyLamp(kit, frame, u, v) {
  const q = frame.q;
  kit.place("lampHousing", { pos: frame.pos(u, v, 0.1).toArray(), quat: q, color: IMP.black });
  const qd = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  kit.place("lampDome", { pos: frame.pos(u, v, 0.15).toArray(), quat: qd, color: 0xffffff });
  kit.place("lampCage", { pos: frame.pos(u, v, 0.16).toArray(), quat: q, color: IMP.steelDark });
}

/** Fire-suppression / utility cabinet on a wall frame; centre at (u, v). */
export function cabinet(kit, frame, u, v, { color = IMP.plateDark, tag = "cabinet" } = {}) {
  const q = frame.q;
  kit.place("cabBody", { pos: frame.pos(u, v, 0.2).toArray(), quat: q, color });
  kit.place("cabDoor", { pos: frame.pos(u, v, 0.37).toArray(), quat: q, color: IMP.plateDark });
  kit.place("cabBand", { pos: frame.pos(u, v + 0.42, 0.375).toArray(), quat: q, color: 0xffffff });
  kit.place("cabHandle", { pos: frame.pos(u + 0.26, v - 0.05, 0.41).toArray(), quat: q, color: IMP.steel });
  kit.place("cabLamp", { pos: frame.pos(u - 0.28, v + 0.52, 0.4).toArray(), quat: q, color: 0xffffff });
  kit.place("cabDecal", { pos: frame.pos(u, v - 0.12, 0.395).toArray(), quat: q, color: 0xffffff });
  frame.collider(u - 0.42, u + 0.42, v - 0.65, v + 0.65, 0, 0.4, tag);
}

/** Recessed computer-bank alcove: returns the wall opening to carve (call before panelGrid), then `build`. */
export function alcove(ctx, frame, u, { w = 3.2, h = 2.5, seed = 3, accent = "emitBlue", light = true }) {
  const opening = { type: "door", u0: u - w / 2 - 0.08, u1: u + w / 2 + 0.08, v0: 0, v1: h + 0.08 };
  const build = () => {
    const kit = ctx.kit;
    const p = frame.pos(u, 0, 0.3);
    const yaw = Math.atan2(frame.N.x, frame.N.z);
    props.computerBank(kit, { pos: [p.x, p.y, p.z], yaw, w, h, d: 0.6, seed, accent });
    // liner: jambs, header, sill, back
    for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (w / 2 + 0.08 + 0.06), h / 2 + 0.04, -0.13, 0.12, h + 0.16, 0.4, { color: IMP.black, texel: 1 });
    frame.box("paintedMetal", u, h + 0.08 + 0.06, -0.13, w + 0.44, 0.12, 0.4, { color: IMP.black, texel: 1 });
    frame.box("paintedMetal", u, h / 2, -0.33, w + 0.3, h + 0.2, 0.06, { color: IMP.black, texel: 1 });
    frame.box("paintedMetal", u, h + 0.08 + 0.15, 0.04, w + 0.6, 0.06, 0.12, { color: IMP.trim, texel: 1 });
    if (light) frame.box("emitWhiteSoft", u, h + 0.05, 0.02, w - 0.3, 0.03, 0.02, { uv: "keep" });
    frame.decal(u - w / 2 - 0.08 - 0.34, 2.05, 0.06, 0.3, 0.3, DECAL.TEXT_B);
  };
  return { opening, build };
}

/** Open maintenance hatch with cabling, the cover leaning beside it. Returns { opening, build }. */
export function maintenanceHatch(ctx, frame, u, { seed = 7 } = {}) {
  const w = 1.4;
  const v0 = 0.5;
  const v1 = 2.0;
  const opening = { type: "door", u0: u - w / 2, u1: u + w / 2, v0, v1 };
  const build = () => {
    const kit = ctx.kit;
    const rand = rng(seed);
    const cv = (v0 + v1) / 2;
    const hh = v1 - v0;
    // recess liner
    frame.box("paintedMetal", u, cv, -0.34, w + 0.3, hh + 0.3, 0.06, { color: IMP.black, texel: 1 });
    for (const s of [-1, 1]) frame.box("paintedMetal", u + s * (w / 2 + 0.05), cv, -0.15, 0.1, hh + 0.3, 0.42, { color: IMP.darkMetal, texel: 1 });
    frame.box("paintedMetal", u, v1 + 0.05, -0.15, w + 0.2, 0.1, 0.42, { color: IMP.darkMetal, texel: 1 });
    frame.box("paintedMetal", u, v0 - 0.05, -0.15, w + 0.2, 0.1, 0.42, { color: IMP.darkMetal, texel: 1 });
    // inside: conduits, couplings, a junction box with LEDs, sagging cables
    for (let i = 0; i < 3; i++) {
      const pu = u - 0.45 + i * 0.3;
      const r = 0.035 + rand() * 0.02;
      frame.cylV("metal", pu, cv, -0.24, r, hh - 0.1, { color: [IMP.steel, IMP.steelDark, IMP.gunmetal][i], segments: 10 });
      frame.box("paintedMetal", pu, v0 + 0.3 + rand() * 0.5, -0.24, r * 2 + 0.06, 0.08, r * 2 + 0.06, { color: IMP.black });
    }
    frame.box("darkGloss", u + 0.42, cv + 0.25, -0.26, 0.36, 0.5, 0.08);
    frame.box("leds", u + 0.42, cv + 0.32, -0.215, 0.28, 0.08, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
    frame.box("leds", u + 0.42, cv + 0.18, -0.215, 0.28, 0.08, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
    frame.box("emitAmber", u + 0.42, cv - 0.1, -0.215, 0.08, 0.04, 0.01);
    const a = frame.pos(u - 0.6, v1 - 0.15, -0.2);
    const b = frame.pos(u + 0.55, v0 + 0.25, -0.1);
    props.cableBundle(kit, { from: [a.x, a.y, a.z], to: [b.x, b.y, b.z], sag: 0.35, n: 4, r: 0.014 });
    const a2 = frame.pos(u - 0.3, v1 - 0.1, -0.12);
    const b2 = frame.pos(u + 0.62, v1 - 0.4, -0.2);
    props.cableBundle(kit, { from: [a2.x, a2.y, a2.z], to: [b2.x, b2.y, b2.z], sag: 0.25, n: 2, r: 0.012 });
    // the cover leaning against the wall beside the opening
    const cu = u + w / 2 + 0.95;
    frame.box("plate", cu, 0.74, 0.22, w - 0.1, hh - 0.1, 0.05, { color: IMP.plateDark, uv: "keep", tilt: -0.22 });
    frame.box("paintedMetal", cu, 0.74, 0.19, w - 0.02, hh - 0.02, 0.02, { color: IMP.black, tilt: -0.22 });
    frame.decal(cu, 0.9, 0.257, 0.5, 0.5, DECAL.WARNING, { tilt: -0.22 });
    frame.collider(cu - w / 2, cu + w / 2, 0, hh, 0, 0.5, "hatchcover");
    // hazard stencil above the opening + tool case on the floor
    frame.decal(u, v1 + 0.28, 0.06, 0.9, 0.3, DECAL.HAZARD_BAND);
    const tc = frame.pos(u - w / 2 - 0.55, 0, 0.35);
    props.crate(kit, { pos: [tc.x, tc.y, tc.z], yaw: Math.atan2(frame.N.x, frame.N.z) + 0.3, size: [0.6, 0.36, 0.42], color: IMP.black, band: false, decal: DECAL.SPEC_PLATE });
  };
  return { opening, build };
}

/** Small black sign plate with one or two stencils; centre (u, v). */
export function signPlate(frame, u, v, { w = 0.5, h = 0.72, top = DECAL.NUMBER0, bottom = DECAL.TEXT_A, mirror = false, led = false } = {}) {
  frame.box("paintedMetal", u, v, 0.03, w, h, 0.05, { color: IMP.black, texel: 2 });
  frame.box("metal", u, v, 0.056, w - 0.06, h - 0.06, 0.004, { color: IMP.darkMetal });
  const d = Math.min(w, h / (bottom !== null ? 2 : 1)) - 0.1;
  if (bottom !== null) {
    decalOn(frame, u, v + h / 4, 0.062, d, top, mirror);
    decalOn(frame, u, v - h / 4, 0.062, d, bottom, mirror);
  } else decalOn(frame, u, v, 0.062, d, top, mirror);
  if (led) frame.box("leds", u, v - h / 2 + 0.07, 0.062, w - 0.14, 0.06, 0.004, { uv: "keep", uvRect: ledRect(3) });
}

export function decalOn(frame, u, v, n, size, index, mirror = false, opts = {}) {
  const r = decalRect(index);
  return frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, n, { uv: "keep", uvRect: mirror ? [r[2], r[1], r[0], r[3]] : r, ...opts });
}

/** Deck signage: DECK stencil + screen strip + LED row on a black panel (lobby piers, lobby doors). */
export function deckSign(frame, u, v, { w = 1.7, h = 0.8, screen = 4, leds = 6 } = {}) {
  frame.box("paintedMetal", u, v, 0.04, w, h, 0.08, { color: IMP.black, texel: 1 });
  frame.box("darkGloss", u, v, 0.082, w - 0.08, h - 0.08, 0.01);
  decalOn(frame, u - w / 2 + h / 2 + 0.02, v, 0.09, h - 0.18, DECAL.DECK_A);
  const uR = u + h / 2;
  const wR = w - h - 0.24;
  frame.box("screen", uR, v + 0.1, 0.09, wR, Math.min(0.32, h * 0.4), 0.005, { uv: "keep", uvRect: screenRect(screen) });
  frame.box("leds", uR, v - h / 2 + 0.16, 0.09, wR, 0.08, 0.005, { uv: "keep", uvRect: ledRect(leds) });
  frame.box("emitWhite", u + w / 2 - 0.1, v + h / 2 - 0.1, 0.09, 0.06, 0.06, 0.01);
}

/** Vertical call-status indicator bar beside a lift door; centre (u, v). */
export function callIndicator(frame, u, v, mat = "emitWhite", { h = 0.7 } = {}) {
  frame.box("paintedMetal", u, v, 0.03, 0.2, h + 0.16, 0.06, { color: IMP.black, texel: 2 });
  frame.box("darkGloss", u, v, 0.062, 0.14, h + 0.1, 0.01);
  frame.box(mat, u, v, 0.07, 0.06, h, 0.008);
  frame.box("leds", u, v - h / 2 - 0.0, 0.07, 0.12, 0.05, 0.004, { uv: "keep", uvRect: ledRect(9) });
}

/** Wall-mounted bench along a frame: from u0, length len, seat height 0.46. */
export function bench(kit, frame, u0, len, { fabric = IMP.fabricGrey, tag = "bench" } = {}) {
  const cu = u0 + len / 2;
  // light plated shell so the seat reads against the dark kick row; grey pads, a lit toe-kick beneath
  frame.box("plate", cu, 0.42, 0.3, len, 0.08, 0.54, { color: IMP.plate, uv: "keep" });
  frame.box("fabric", cu, 0.51, 0.29, len - 0.08, 0.1, 0.46, { color: fabric, uv: "world", texel: 2 });
  frame.box("plate", cu, 0.9, 0.08, len, 0.5, 0.06, { color: IMP.plate, uv: "keep" });
  frame.box("fabric", cu, 0.9, 0.125, len - 0.12, 0.4, 0.04, { color: fabric, uv: "world", texel: 2 });
  frame.box("metal", cu, 1.17, 0.1, len, 0.04, 0.12, { color: IMP.steel });
  frame.box("metal", cu, 0.47, 0.57, len, 0.03, 0.03, { color: IMP.steel });
  const n = Math.max(2, Math.round(len / 1.5) + 1);
  for (let i = 0; i < n; i++) {
    const u = u0 + 0.12 + (i / (n - 1)) * (len - 0.24);
    frame.box("paintedMetal", u, 0.2, 0.3, 0.08, 0.4, 0.44, { color: IMP.black, texel: 1 });
  }
  frame.box("paintedMetal", cu, 0.3, 0.08, len - 0.3, 0.16, 0.06, { color: IMP.black, texel: 1 });
  frame.box("emitWhiteSoft", cu, 0.3, 0.115, len - 0.4, 0.05, 0.01, { uv: "keep" });
  frame.collider(u0, u0 + len, 0, 1.2, 0, 0.58, tag);
}

// ---------------------------------------------------------------------------------------------------
// Lobby ceiling: perimeter soffit with recessed strips + central recessed light frame
// ---------------------------------------------------------------------------------------------------
export function lobbyCeiling(ctx, { soffitH = 0.6, depth = 0.7, stripMat = "emitWhiteSoft", soffitColor = IMP.plateDark, panelSeed = 5, centre = true } = {}) {
  const kit = ctx.kit;
  const { x0, x1, z0, z1 } = ctx.inner;
  const H = ctx.h;
  const yTop = ctx.ceil;
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    const { frame, length, openings } = ctx.wall(side);
    // gaps where a tall door frame reaches into the soffit
    const gaps = openings.filter((o) => o.type !== "window" && o.v1 + 0.7 > H - soffitH).map((o) => [o.u0 - 0.9, o.u1 + 0.9]);
    frame.box("paintedMetal", length / 2, (H - soffitH + H) / 2, -0.06, length, soffitH + 0.08, 0.12, { color: IMP.black, texel: 1 });
    for (const [u0, u1] of splitSpans([[0, length]], gaps)) {
      const len = u1 - u0;
      const cu = (u0 + u1) / 2;
      frame.box("paintedMetal", cu, H - soffitH / 2, depth / 2, len, soffitH, depth, { color: soffitColor, texel: 1 });
      frame.box("metal", cu, H - soffitH + 0.03, depth + 0.02, len, 0.06, 0.04, { color: IMP.steelDark });
      // recessed strip on the underside: two rails hanging below the soffit, diffuser between them
      const sn = depth * 0.6;
      for (const s of [-1, 1]) frame.box("paintedMetal", cu, H - soffitH - 0.04, sn + s * 0.16, len, 0.08, 0.06, { color: IMP.black, texel: 1 });
      frame.box(stripMat, cu, H - soffitH - 0.02, sn, len - 0.3, 0.01, 0.24, { uv: "keep" });
    }
  }
  // central panel field
  const cf = ctx.ceilingFrame().frame;
  const w = x1 - x0 - 2 * depth;
  const d = z1 - z0 - 2 * depth;
  const sub = new Frame(kit, cf.pos(depth, depth, 0), cf.U, cf.V);
  const nRows = Math.max(1, Math.round(d / 1.6));
  const rows = [];
  for (let i = 0; i <= nRows; i++) rows.push((i / nRows) * d);
  panelGrid(sub, w, d, { rows, panelW: Math.max(0.8, w / Math.max(1, Math.round(w / 1.6))), kick: false, cornice: false, seed: panelSeed, collide: false, styles: { plate: 0.85, vent: 0.15 }, bands: [], tints: [[IMP.plateDark, 0.7], [IMP.trim, 0.3]], detail: 0 });
  if (centre) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const s = Math.min(3.2, w - 1.5, d - 1.5);
    // black housing, a square ring of diffusers just below it, the emblem stencilled in the dark centre
    kit.boxMM("paintedMetal", [cx - s / 2 - 0.16, yTop - 0.22, cz - s / 2 - 0.16], [cx + s / 2 + 0.16, yTop, cz + s / 2 + 0.16], { color: IMP.black, texel: 1 });
    kit.boxMM("metal", [cx - s / 2 - 0.2, yTop - 0.24, cz - s / 2 - 0.2], [cx + s / 2 + 0.2, yTop - 0.22, cz + s / 2 + 0.2], { color: IMP.steelDark });
    const sw = 0.22;
    kit.boxMM(stripMat, [cx - s / 2, yTop - 0.232, cz - s / 2], [cx + s / 2, yTop - 0.22, cz - s / 2 + sw], { uv: "keep" });
    kit.boxMM(stripMat, [cx - s / 2, yTop - 0.232, cz + s / 2 - sw], [cx + s / 2, yTop - 0.22, cz + s / 2], { uv: "keep" });
    kit.boxMM(stripMat, [cx - s / 2, yTop - 0.232, cz - s / 2 + sw], [cx - s / 2 + sw, yTop - 0.22, cz + s / 2 - sw], { uv: "keep" });
    kit.boxMM(stripMat, [cx + s / 2 - sw, yTop - 0.232, cz - s / 2 + sw], [cx + s / 2, yTop - 0.22, cz + s / 2 - sw], { uv: "keep" });
    decalOn(new Frame(kit, new THREE.Vector3(cx, yTop - 0.222, cz), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)), 0, 0, 0.002, Math.min(1.6, s - 1.0), DECAL.EMBLEM);
  }
}

// ---------------------------------------------------------------------------------------------------
// Corridor planner + builder
// ---------------------------------------------------------------------------------------------------
/**
 * Build a full corridor. cfg:
 *   axis 'x'|'z'; rings [along positions]; family 'cool'|'warm'; lights n; pointTo along-coordinate the floor
 *   arrows aim at (the lift lobby door); hatch {bay, side:'lo'|'hi'}; laneW; stripMat; lightColor;
 *   lightIntensity; extraOpenings {side: [openings]}; skipEnds (walls the room builds itself)
 */
export function buildCorridor(ctx, cfg) {
  const kit = ctx.kit;
  const C = describe(ctx, cfg.axis);
  const family = cfg.family || "cool";
  const accent = accentMat(ctx.accent.key);
  const rings = (cfg.rings || []).filter((a) => a > C.a0 + 2 && a < C.a1 - 2).sort((p, q) => p - q);
  const bays = [];
  let prev = C.a0;
  for (const r of rings) {
    bays.push([prev, r]);
    prev = r;
  }
  bays.push([prev, C.a1]);
  const seedBase = cfg.seed || 1;

  // shell: ceiling slab + end walls only
  const endWalls = {};
  endWalls[C.sideLo] = false;
  endWalls[C.sideHi] = false;
  if (cfg.skipEnds) {
    endWalls[C.endLo] = false;
    endWalls[C.endHi] = false;
  }
  ctx.shell({ skipFloor: true, ceiling: false, walls: endWalls, pilasterEvery: 0, seed: seedBase });
  if (!cfg.skipEnds) {
    for (const end of [C.endLo, C.endHi]) {
      const e = ctx.wall(end);
      waistStrip(e.frame, e.length, e.openings, { stripMat: cfg.stripMat || "emitWhiteSoft" });
    }
  }

  corridorFloor(ctx, C, { laneW: cfg.laneW || 2.2, deckColor: cfg.deckColor || IMP.plateDark });
  registerWallProtos(kit);
  registerRing(ctx, C);

  // ---- plan wall features per side
  const walls = {};
  for (const side of [C.sideLo, C.sideHi]) {
    const w = ctx.wall(side);
    const doors = ctx.doors
      .filter((d) => d.side === side)
      .map((o) => {
        const a0 = C.aOf(side, o.u0);
        const a1 = C.aOf(side, o.u1);
        return { ...o, a0: Math.min(a0, a1), a1: Math.max(a0, a1) };
      });
    walls[side] = { ...w, doors, extra: [], builds: [], pilasters: [], lamps: [] };
  }
  const nearDoor = (side, a, half, margin) => walls[side].doors.some((d) => a + half > d.a0 - margin && a - half < d.a1 + margin);
  const nearRing = (a, half) => rings.some((r) => Math.abs(r - a) < half + 0.45);

  // pilasters: aligned across the corridor, every 4.8 m from each bay start, never beside a door
  for (let i = 0; i < bays.length; i++) {
    const [ba, bb] = bays[i];
    for (let a = ba + PILASTER; a < bb - 1.2; a += PILASTER) {
      for (const side of [C.sideLo, C.sideHi]) if (!nearDoor(side, a, 0.2, 0.8)) walls[side].pilasters.push(a);
    }
  }
  // free slots between pilasters (and bay ends) per side
  const slotsFor = (side, i) => {
    const [ba, bb] = bays[i];
    const ps = [ba, ...walls[side].pilasters.filter((a) => a > ba && a < bb), bb];
    const out = [];
    for (let k = 0; k < ps.length - 1; k++) out.push({ a0: ps[k] + 0.3, a1: ps[k + 1] - 0.3, c: (ps[k] + ps[k + 1]) / 2, w: ps[k + 1] - ps[k] - 0.6 });
    return out;
  };
  const takeSlot = (side, i, needW, prefer = "mid") => {
    const free = slotsFor(side, i).filter((s) => s.w >= needW && !nearDoor(side, s.c, needW / 2, 1.2) && !walls[side].extra.some((e) => Math.abs(e.a - s.c) < (e.w + needW) / 2 + 0.6));
    if (!free.length) return null;
    const mid = (bays[i][0] + bays[i][1]) / 2;
    free.sort((p, q) => (prefer === "mid" ? Math.abs(p.c - mid) - Math.abs(q.c - mid) : prefer === "lo" ? p.c - q.c : q.c - p.c));
    return free[0];
  };
  const reserve = (side, a, w, kind) => walls[side].extra.push({ a, w, kind });

  const hatch = cfg.hatch || { bay: Math.min(1, bays.length - 1), side: "hi" };
  for (let i = 0; i < bays.length; i++) {
    const pat = (i + (cfg.patternOffset || 0)) % 4;
    const lo = C.sideLo;
    const hi = C.sideHi;
    const hatchHere = hatch.bay === i;
    if (hatchHere) {
      const side = hatch.side === "lo" ? lo : hi;
      const s = takeSlot(side, i, 4.0, "lo");
      if (s) {
        reserve(side, s.c, 4.0, "hatch");
        const h = maintenanceHatch(ctx, walls[side].frame, C.uOf(side, s.c) - 0.9, { seed: seedBase + i });
        walls[side].extra[walls[side].extra.length - 1].opening = h.opening;
        walls[side].builds.push(h.build);
      }
    }
    const addAlcove = (side, prefer = "mid") => {
      const s = takeSlot(side, i, 3.9, prefer);
      if (!s) return false;
      reserve(side, s.c, 3.4, "alcove");
      const al = alcove(ctx, walls[side].frame, C.uOf(side, s.c), { w: 3.2, h: 2.5, seed: seedBase * 3 + i * 7 + (side === lo ? 1 : 2), accent });
      walls[side].extra[walls[side].extra.length - 1].opening = al.opening;
      walls[side].builds.push(al.build);
      return true;
    };
    const addCabinet = (side, prefer = "hi") => {
      const s = takeSlot(side, i, 1.6, prefer);
      if (!s) return false;
      reserve(side, s.c, 0.9, "cabinet");
      const f = walls[side].frame;
      const u = C.uOf(side, s.c);
      walls[side].builds.push(() => cabinet(kit, f, u, 0.97, { color: i % 2 ? IMP.plateDark : IMP.black }));
      return true;
    };
    const addBoard = (side, prefer = "mid") => {
      const s = takeSlot(side, i, 2.0, prefer);
      if (!s) return false;
      reserve(side, s.c, 1.4, "board");
      const f = walls[side].frame;
      const u = C.uOf(side, s.c);
      walls[side].builds.push(() => {
        props.wallPanel(kit, f, u, 2.45, { w: 1.2, h: 0.8, accent, seed: seedBase + i * 5 });
        signPlate(f, u + 0.95, 2.45, { w: 0.4, h: 0.6, top: DECAL.TEXT_B, bottom: null });
      });
      return true;
    };
    if (pat === 0) {
      addAlcove(lo);
      addCabinet(hi, "hi");
    } else if (pat === 1) {
      addAlcove(hi);
      addBoard(lo, "lo");
      addCabinet(lo, "hi");
    } else if (pat === 2) {
      addCabinet(lo, "lo");
      addCabinet(hi, "hi");
      addBoard(hi, "mid");
    } else {
      addAlcove(lo, "lo");
      addAlcove(hi, "hi");
    }
  }
  // emergency lamps every ~12 m alternating walls
  {
    let k = 0;
    for (let a = C.a0 + 6; a < C.a1 - 2; a += 12, k++) {
      const side = k % 2 ? C.sideHi : C.sideLo;
      let aa = a;
      const blocked = (x) => nearDoor(side, x, 0.2, 0.9) || nearRing(x, 0.3) || walls[side].pilasters.some((p) => Math.abs(p - x) < 0.5) || walls[side].extra.some((e) => Math.abs(e.a - x) < e.w / 2 + 0.4);
      for (const d of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
        if (!blocked(a + d)) {
          aa = a + d;
          break;
        }
      }
      if (!blocked(aa)) walls[side].lamps.push(aa);
    }
  }

  // ---- build the long walls bay by bay (with the alcove / hatch openings carved), then features
  for (const side of [C.sideLo, C.sideHi]) {
    const W = walls[side];
    const extraOps = W.extra.filter((e) => e.opening).map((e) => e.opening);
    for (let i = 0; i < bays.length; i++) {
      const [ba, bb] = bays[i];
      let u0 = C.uOf(side, ba);
      let u1 = C.uOf(side, bb);
      if (u0 > u1) [u0, u1] = [u1, u0];
      u0 = Math.max(0, u0);
      u1 = Math.min(W.length, u1);
      const len = u1 - u0;
      const sub = new Frame(kit, W.frame.pos(u0, 0, 0), W.frame.U, W.frame.V);
      const ops = [...W.openings, ...extraOps].filter((o) => o.u1 > u0 + 0.01 && o.u0 < u1 - 0.01).map((o) => ({ ...o, u0: Math.max(0, o.u0 - u0), u1: Math.min(len, o.u1 - u0) }));
      const bo = bayWallOpts(i, family, seedBase + (side === C.sideLo ? 0 : 50));
      panelGrid(sub, len, WALL_H, { openings: ops, pilasterEvery: 0, tag: ctx.id + ":" + side, accent, ...bo, ...(cfg.wallOpts || {}) });
      for (const a of W.pilasters) if (a > ba && a < bb) pilaster(sub, C.uOf(side, a) - u0, WALL_H, 0.28);
    }
    cove(ctx, side, { color: cfg.coveColor || IMP.plateDark, stripMat: cfg.stripMat || "emitWhiteSoft" });
    waistStrip(W.frame, W.length, [...W.openings, ...extraOps], { stripMat: cfg.stripMat || "emitWhiteSoft" });
    for (const b of W.builds) b();
    for (const a of W.lamps) emergencyLamp(kit, W.frame, C.uOf(side, a), 2.75);
    // door signage: number + sector plate to the right of every door, deck sign flanking blast doors
    let n = 0;
    for (const d of W.doors) {
      if (d.type === "window") continue;
      const right = d.u1 + 0.78;
      const left = d.u0 - 0.78;
      const clash = (u) => W.pilasters.some((p) => Math.abs(C.uOf(side, p) - u) < 0.55) || W.extra.some((e) => Math.abs(C.uOf(side, e.a) - u) < e.w / 2 + 0.4) || u < 0.4 || u > W.length - 0.4;
      const u = !clash(right) ? right : !clash(left) ? left : null;
      if (u !== null) signPlate(W.frame, u, 2.3, { top: DECAL.NUMBER0 + (n % 4), bottom: DECAL.TEXT_A, led: true });
      if (d.door && d.door.kind === "blast") {
        hazardThreshold(ctx, C, side, d.a0, d.a1);
        for (const uu of [d.u0 - 1.5, d.u1 + 1.5]) if (!clash(uu)) signPlate(W.frame, uu, 2.55, { w: 0.62, h: 0.62, top: DECAL.DECK_A, bottom: null });
      }
      n++;
    }
    // wall arrows beside the rings pointing to the lift lobby
    if (cfg.pointTo !== undefined) {
      rings.forEach((r, k) => {
        if ((k % 2 === 0) !== (side === C.sideLo)) return;
        const a = r + (cfg.pointTo > r ? 2.0 : -2.0);
        if (nearDoor(side, a, 0.35, 0.5) || W.pilasters.some((p) => Math.abs(p - a) < 0.6) || W.extra.some((e) => Math.abs(e.a - a) < e.w / 2 + 0.5)) return;
        const dir = Math.sign(cfg.pointTo - a) * C.uSign(side);
        signPlate(W.frame, C.uOf(side, a), 2.35, { w: 0.6, h: 0.6, top: DECAL.ARROW, bottom: null, mirror: dir < 0 });
      });
    }
  }

  // ---- ceiling bays, rings, floor stencils
  for (let i = 0; i < bays.length; i++) {
    const [ba, bb] = bays[i];
    ceilingBay(ctx, C, ba, bb, (i + (cfg.ceilingOffset || 0)) % 3, seedBase * 31 + i, { stripMat: cfg.stripMat || "emitWhiteSoft", pipeColor: cfg.pipeColor || IMP.steelDark });
    if (cfg.pointTo !== undefined) {
      const mid = (ba + bb) / 2;
      if (Math.abs(cfg.pointTo - mid) > (bb - ba) / 2) floorDecal(ctx, C, mid, C.mid, 1.3, DECAL.ARROW, { dirA: Math.sign(cfg.pointTo - mid) });
    }
  }
  rings.forEach((r, k) => placeRing(ctx, C, r, { number: k, colorA: cfg.ringColor || IMP.plateDark, colorB: cfg.ringTrim || IMP.trim }));

  // ---- lights: emissive strips carry the look; a few point lights spaced along the corridor
  const n = cfg.lights || 6;
  for (let k = 0; k < n; k++) {
    const a = C.a0 + ((k + 0.5) / n) * (C.a1 - C.a0);
    // hung well below the ceiling so the slab above is not blown out by the inverse-square hot spot
    ctx.light(cfg.lightColor || 0xdfe8ff, cfg.lightIntensity || 150, cfg.lightDistance || 34, C.P(a, C.mid, ctx.ceil - 1.1));
  }
  return { C, bays, rings, walls };
}

// ---------------------------------------------------------------------------------------------------
// Lobby builder
// ---------------------------------------------------------------------------------------------------
/**
 * cfg: { liftSide, doorSide, benchSide, dirSide, family, seed, lights, extras(ctx, L) }
 * L: { frames: {side: {frame,length,openings}}, wallH }
 */
export function buildLobby(ctx, cfg) {
  const kit = ctx.kit;
  const H = ctx.h;
  const wallH = H - 0.6;
  const seed = cfg.seed || 5;
  const family = cfg.family || "cool";
  const accent = accentMat(ctx.accent.key);
  const { x0, x1, z0, z1 } = ctx.inner;
  // floor + ceiling slab via shell; walls + ceiling ours
  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, walls: { zmin: false, zmax: false, xmin: false, xmax: false }, ceiling: false, seed });
  registerWallProtos(kit);
  const frames = {};
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) frames[side] = ctx.wall(side);
  const L = { frames, wallH, accent, seed };
  const extraOps = { zmin: [], zmax: [], xmin: [], xmax: [] };
  const builds = [];

  // side walls: bench on one, recessed computer bank on the other
  const bs = cfg.benchSide || "xmin";
  const ds = cfg.dirSide || "xmax";
  {
    const f = frames[bs];
    const len = Math.min(3.2, f.length - 3);
    const u0 = f.length / 2 - len / 2 + (cfg.benchShift || 0);
    builds.push(() => {
      bench(kit, f.frame, u0, len);
      props.wallPanel(kit, f.frame, u0 + len / 2, 2.2, { w: 1.4, h: 0.5, accent, seed: seed + 3, screen: false });
      signPlate(f.frame, u0 - 0.55, 2.3, { w: 0.44, h: 0.66, top: DECAL.TEXT_B, bottom: DECAL.NUMBER0 + (cfg.deckIndex || 0) });
      if (f.length > 8.5) {
        cabinet(kit, f.frame, u0 + len + 1.1, 0.97, { color: IMP.black });
        emergencyLamp(kit, f.frame, f.length - 0.9, 2.75);
      } else emergencyLamp(kit, f.frame, u0 + len + 0.9, 2.75);
    });
  }
  {
    const f = frames[ds];
    const aw = Math.min(3.2, f.length - 4);
    const al = alcove(ctx, f.frame, f.length / 2 + (cfg.dirShift || 0), { w: aw, h: 2.4, seed: seed * 7, accent });
    extraOps[ds].push(al.opening);
    builds.push(al.build);
    builds.push(() => {
      props.wallPanel(kit, f.frame, f.length / 2 + aw / 2 + 1.15 + (cfg.dirShift || 0), 2.4, { w: 0.9, h: 0.9, accent, seed: seed + 11 });
      emergencyLamp(kit, f.frame, 0.9, 2.75);
    });
  }
  // lift wall: deck sign between the cabs + call indicators
  {
    const side = cfg.liftSide;
    const f = frames[side];
    const cabs = f.openings.filter((o) => o.type === "door").sort((p, q) => p.u0 - q.u0);
    builds.push(() => {
      const mid = f.length / 2;
      deckSign(f.frame, mid, 3.35, { w: 1.9, h: 0.8, screen: 4 + (cfg.deckIndex || 0), leds: 2 + (cfg.deckIndex || 0) });
      cabs.forEach((c, i) => {
        callIndicator(f.frame, c.u0 - 0.6, 1.2, i === 0 ? "emitWhite" : "emitAmber");
        callIndicator(f.frame, c.u1 + 0.6, 1.2, i === 0 ? "emitWhite" : "emitAmber");
        decalOn(f.frame, (c.u0 + c.u1) / 2, c.v1 + 0.95, 0.06, 0.34, DECAL.NUMBER0 + i);
        hazardStrip(ctx, f.frame, (c.u0 + c.u1) / 2, c.u1 - c.u0 + 0.2);
      });
    });
  }
  // door wall: emblem on one pier, directory display on the other
  {
    const side = cfg.doorSide;
    const f = frames[side];
    const door = ctx.doors.find((d) => d.side === side && (d.type === "door" || d.type === "arch"));
    builds.push(() => {
      if (!door) return;
      const pierL = door.u0 / 2;
      const pierR = (door.u1 + f.length) / 2;
      const size = Math.min(1.4, door.u0 - 1.2);
      emblemPanel(f.frame, pierL, 2.55, size);
      signPlate(f.frame, pierL, 1.1, { w: 0.5, h: 0.5, top: DECAL.TEXT_B, bottom: null });
      props.wallPanel(kit, f.frame, pierR, 2.4, { w: Math.min(1.3, f.length - door.u1 - 1.0), h: 0.9, accent, seed: seed + 21 });
      signPlate(f.frame, pierR, 1.1, { w: 0.5, h: 0.5, top: DECAL.TEXT_A, bottom: null });
      if (door.door && door.door.kind === "blast") {
        const w = door.u1 - door.u0;
        hazardStrip(ctx, f.frame, (door.u0 + door.u1) / 2, w + 0.2, { gap: 0.55 });
      }
    });
  }

  // walls (explicit pilaster positions per side via cfg.pilasters = { side: [u, …] })
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    const f = frames[side];
    const ops = [...f.openings, ...extraOps[side]];
    const bo = bayWallOpts(cfg.variant !== undefined ? cfg.variant : 0, family, seed);
    const rows = bo.rows.map((r) => (r === WALL_H ? wallH : r));
    panelGrid(f.frame, f.length, wallH, { openings: ops, pilasterEvery: 0, tag: ctx.id + ":" + side, accent, ...bo, rows });
    waistStrip(f.frame, f.length, ops, { stripMat: cfg.stripMat || "emitWhiteSoft" });
    for (const u of (cfg.pilasters && cfg.pilasters[side]) || []) pilaster(f.frame, u, wallH, 0.28);
  }
  for (const b of builds) b();
  lobbyCeiling(ctx, { stripMat: cfg.stripMat || "emitWhiteSoft", panelSeed: seed * 3, centre: cfg.centreLight !== false });

  // floor pattern: black centre with a light rim line
  {
    const y = ctx.floor;
    const inset = 1.25;
    kit.boxMM("deckBlack", [x0 + inset, y - 0.002, z0 + inset], [x1 - inset, y + 0.01, z1 - inset], { texel: 0.5 });
    const rim = 0.06;
    kit.boxMM("paintedMetal", [x0 + inset - rim, y, z0 + inset - rim], [x1 - inset + rim, y + 0.012, z0 + inset], { color: IMP.plateLight });
    kit.boxMM("paintedMetal", [x0 + inset - rim, y, z1 - inset], [x1 - inset + rim, y + 0.012, z1 - inset + rim], { color: IMP.plateLight });
    kit.boxMM("paintedMetal", [x0 + inset - rim, y, z0 + inset], [x0 + inset, y + 0.012, z1 - inset], { color: IMP.plateLight });
    kit.boxMM("paintedMetal", [x1 - inset, y, z0 + inset], [x1 - inset + rim, y + 0.012, z1 - inset], { color: IMP.plateLight });
    // emblem stencil in the centre of the floor
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const g = new THREE.PlaneGeometry(1.8, 1.8);
    g.rotateX(-Math.PI / 2);
    kit.add("decal", g, { pos: [cx, y + 0.016, cz], uv: "keep", uvRect: decalRect(DECAL.EMBLEM) });
  }
  // lights
  const n = cfg.lights || 3;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const ly = ctx.ceil - 1.4;
  if (n >= 4) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.light(0xdfe8ff, cfg.lightIntensity || 55, 18, [cx + dx * (x1 - x0) * 0.25, ly, cz + dz * (z1 - z0) * 0.25]);
  } else {
    // flank the centre so the floor emblem is not sitting under a light; third light toward the cabs
    const I = cfg.lightIntensity || 70;
    const dx = (x1 - x0) * 0.36;
    ctx.light(0xdfe8ff, I * 0.6, 16, [cx - dx, ly, cz]);
    ctx.light(0xdfe8ff, I * 0.6, 16, [cx + dx, ly, cz]);
    const toCabs = cfg.liftSide === "zmax" ? 1 : -1;
    ctx.light(0xdfe8ff, I * 0.45, 14, [cx, ly, cz + toCabs * (z1 - z0) * 0.32]);
  }
  if (cfg.extras) cfg.extras(ctx, L);
  return L;
}

export function emblemPanel(frame, u, v, size) {
  frame.box("paintedMetal", u, v, 0.03, size + 0.3, size + 0.3, 0.06, { color: IMP.black, texel: 1 });
  frame.box("plate", u, v, 0.065, size + 0.16, size + 0.16, 0.02, { color: IMP.plateDark, uv: "keep" });
  decalOn(frame, u, v, 0.08, size, DECAL.EMBLEM);
  frame.box("emitWhiteSoft", u, v - size / 2 - 0.1, 0.07, size - 0.2, 0.02, 0.01, { uv: "keep" });
}

/** Hazard threshold on the floor in front of a wall opening centred at u (wall frame), width w. */
export function hazardStrip(ctx, frame, u, w, { gap = 0.5, depth = 0.3 } = {}) {
  const a = frame.pos(u - w / 2, 0, gap);
  const b = frame.pos(u + w / 2, 0, gap + depth);
  const y = ctx.floor;
  ctx.kit.boxMM("hazard", [Math.min(a.x, b.x), y + 0.002, Math.min(a.z, b.z)], [Math.max(a.x, b.x), y + 0.014, Math.max(a.z, b.z)], { texel: 2 });
}

export { DECAL, decalRect, ledRect, screenRect, props, IMP, Frame, panelGrid, pilaster };
