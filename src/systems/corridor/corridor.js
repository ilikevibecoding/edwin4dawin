// Corridor kit (COORDINATION.md §9.3) — Imperial corridors for every deck. Plain module, no manifest.
//
//   import { corridorSegment, corridorJunction, openingFromDoor } from "../../systems/corridor/corridor.js";
//   import { textMaterials } from "../../systems/corridor/text.js";   // for stencilled section markers
//
// EXAMPLE — a room manifest whose whole volume is one straight corridor (bounds 3.5 wide, 3.2 high):
//
//   const FLOOR = -72;
//   const DOORS = [
//     { id: "d4-lobby-east",  pos: [10, FLOOR, 171.75],  dir: [-1, 0, 0], kind: "standard", to: "d4-lobby" },     // in the start cap
//     { id: "d4-cargo-aft",   pos: [111, FLOOR, 170],    dir: [0, 0, -1], kind: "standard", to: "d4-cargo-bay" }, // in the left wall
//     { id: "d4-corridor-east-end", pos: [140, FLOOR, 171.75], dir: [1, 0, 0], kind: "standard", to: null },     // in the end cap
//   ];
//   export default {
//     ..., materials: textMaterials,                                              // optional: real text on markers
//     build(ctx) {
//       const seg = { from: [10, 171.75], to: [140, 171.75], width: 3.5 };         // centreline [x, z], bounds width
//       corridorSegment(ctx.kit, {
//         ...seg, floorY: FLOOR, height: 3.2,
//         openings: DOORS.map((d) => openingFromDoor(d, seg)),                       // exact contract-size holes
//         accent: "impAmber", label: "4-E",                                         // corridor identity (amber = starboard)
//         seed: ctx.seed, lights: ctx.lights, tag: "d4-corridor-east",
//       });
//     },
//   };
//
// corridorSegment(kit, {
//   from: [x, z], to: [x, z],   // centreline at floor level, AXIS-ALIGNED (x or z). Diagonals throw.
//   floorY,                     // deck floor height (player feet)
//   width = 3.0, height = 3.2,  // OUTER size = the room bounds. Walls are WALL_T (0.16) inside; clear width = width - 0.32
//   style = "imperial",
//   openings = [],              // { side: "L"|"R", u, w, h } or { side: "start"|"end", offset = 0, w, h }
//                               //   L/R: u = distance from `from` to the opening centre; hole at floor level in that wall
//                               //   start/end: hole in the end cap centred `offset` metres along `right` from the centreline
//                               //   Build them with openingFromDoor(doorManifestEntry, { from, to }) so sizes match doorHole().
//   caps = { start: true, end: true }, // false = open end (no wall) — butt a corridorJunction against it
//   accent = "impBlue",         // "impBlue" | "impAmber" | "impRed" | "impGreen": rib indicators, floor edge lines, markers
//   label = null,               // e.g. "4-E": stencilled section markers read "4-E 01", "4-E 02", … (needs textMaterials)
//   seed = 1,                   // deterministic dressing rotation + panel variation
//   reserved = [],              // [{ side: "L"|"R", u0, u1 }] extra wall spans the dressing AND the wall greebles keep clear
//                               //   of (room-placed signs, panels). The 1.8 m beside every side opening is always reserved
//                               //   for door signage.
//   lights = null,              // pass ctx.lights: one point per ~8 m at ceiling - 0.6 (≤ 14 per segment)
//   collide = true,             // AABB colliders for walls (split at openings), ribs, caps and wall furniture
//   tag = "corridor",
// }) → { length, dir: [dx, dz], right: [rx, rz], lightsAdded }
//   dir = unit vector from→to; right = dir × up = [-dz, dx] (the "R" wall side). Facing along dir, L is your left.
//
// corridorJunction(kit, { center: [x, z], floorY, arms: ["N","S","E","W"], width = 3.0, height = 3.2,
//                         style = "imperial", accent = "impBlue", seed = 1, lights = null, collide = true })
//   → { size, arms, lightsAdded }. A width×width room: same floor/ceiling/rib language, OPEN on the listed
//   arms (N = -z, S = +z, E = +x, W = -x), panelled walls on the others. Start each arm's corridorSegment at
//   the junction edge (center ± width/2) with caps.start = false so floors and ribs meet without overlap.
//
// What a segment builds: floor slab 0.12 below floorY (impFloor·impDark) with a 0.6 m lighter inlay (6 mm
// proud) edged by thin accent light lines per bay and 0.2 m black edge trims; walls WALL_T thick — black
// backing 2.5 cm behind 1.2 m light-grey panels (impPanel·impWhite/impGrey), 0.32 m kick plates, emitWhite
// strip 6 cm tall centred at exactly 2.1 m on both walls broken at openings; ceiling slab 0.12 (panels +
// 0.6 m recessed channel with housed 2.4 m fixtures between ribs: dark housing, louvre fins, narrow
// emitCoolSoft strip); ribs every 4 m (0.25 deep, 0.18 proud, accent indicator, every 4th red); a dressing
// rotation every 10 m (2.5 bays) alternating walls — cable tray run at 2.6 m, pipe pair run, junction box +
// conduit drop, vent with depth, wall terminal at 1.4 m, fire point, stencilled section marker.
// Materials used (draw calls): impFloor impPanel paintedMetal metal emitWhite emitCoolSoft emitBlue
// emitRedImp emitAmber + one screenImp (terminals) + hazard (fire-point plate) [+ impText impTextLit when
// registered] = 11–13.
import { doorHole, WALL_T } from "../doors/helper.js";
import { impWall, impCeiling, impFloorSlab, impRib, MAT, col, spansMinus } from "./imperial.js";
import { wallTerminal, ventPanel, junctionDrop, sectionMarker, firePoint } from "./props.js";

export { WALL_T };
export const CORRIDOR_DEFAULTS = Object.freeze({ width: 3.0, height: 3.2, ribEvery: 4, lightEvery: 8, trayY: 2.6, dressEvery: 10 });
const ROTATION = ["tray", "pipes", "junction", "vent", "terminal", "fire", "marker"];

const styleWarned = new Set();
function checkStyle(style) {
  if (style === "imperial" || style === undefined) return;
  if (!styleWarned.has(style)) {
    styleWarned.add(style);
    console.warn(`[corridor] style "${style}" is not implemented; building "imperial"`);
  }
}

const accentMat = (accent) => (accent === "impAmber" ? MAT.amber : accent === "impRed" ? MAT.red : accent === "impGreen" ? "emitGreen" : MAT.blue);
const accentScreen = (accent) => (accent === "impAmber" ? "screenImp2" : accent === "impRed" ? "screenImp1" : "screenImp0");

/**
 * Turn a manifest door entry into a corridorSegment opening for the segment from→to.
 * Doors in the end walls become start/end openings (offset from the centreline along `right`);
 * doors in the long walls become L/R openings with `u` measured from `from`.
 */
export function openingFromDoor(door, { from, to }) {
  const { w, h } = doorHole(door);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const L = Math.hypot(dx, dz);
  const dir = [dx / L, dz / L];
  const right = [-dir[1], dir[0]];
  const px = door.pos[0] - from[0];
  const pz = door.pos[2] - from[1];
  const u = px * dir[0] + pz * dir[1];
  const s = px * right[0] + pz * right[1];
  const nd = door.dir[0] * dir[0] + door.dir[2] * dir[1];
  if (Math.abs(nd) > 0.5) return { side: nd < 0 ? "start" : "end", offset: s, w, h, id: door.id };
  return { side: s < 0 ? "L" : "R", u, w, h, id: door.id };
}

// Axis bookkeeping shared by segment + junction: world index of the along/across axes.
function frameFor(from, to) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (!(length > 0.3)) throw new Error(`corridorSegment: from→to is too short (${length.toFixed(2)} m)`);
  if (Math.abs(dx) > 1e-6 && Math.abs(dz) > 1e-6) {
    throw new Error(`corridorSegment: from [${from}] → to [${to}] must be axis-aligned (along x or z); diagonal corridors are not supported because the player's colliders are AABBs`);
  }
  const dir = [dx / length, dz / length];
  const right = [-dir[1], dir[0]];
  const ax = Math.abs(dir[0]) > 0.5 ? 0 : 1; // index into [x, z]
  const cx = 1 - ax;
  const ai = ax === 0 ? 0 : 2; // world array index
  const ci = cx === 0 ? 0 : 2;
  const sgn = dir[ax] > 0 ? 1 : -1;
  const rs = right[cx] > 0 ? 1 : -1;
  const c = from[cx];
  return { dx, dz, length, dir, right, ax, cx, ai, ci, sgn, rs, c, alongAt: (u) => from[ax] + sgn * u, acrossAt: (s) => c + rs * s };
}

export function corridorSegment(kit, opts) {
  const {
    from,
    to,
    floorY,
    width = CORRIDOR_DEFAULTS.width,
    height = CORRIDOR_DEFAULTS.height,
    style = "imperial",
    openings = [],
    caps = {},
    accent = "impBlue",
    label = null,
    seed = 1,
    reserved = [],
    lights = null,
    collide = true,
    tag = "corridor",
  } = opts;
  if (!from || !to || from.length !== 2 || to.length !== 2) throw new Error("corridorSegment: from/to must be [x, z]");
  if (typeof floorY !== "number") throw new Error("corridorSegment: floorY is required");
  checkStyle(style);
  const capStart = caps.start !== false;
  const capEnd = caps.end !== false;
  const F = frameFor(from, to);
  const { length, dir, right, ai, ci, sgn, rs, alongAt, acrossAt } = F;
  const inner = width / 2 - WALL_T; // half clear width
  const ceilY = floorY + height - 0.12; // visible ceiling face
  const axisName = ai === 0 ? "x" : "z";
  const planeName = ci === 0 ? "x" : "z"; // side walls' normal axis
  const along0 = Math.min(from[F.ax], to[F.ax]);
  const along1 = Math.max(from[F.ax], to[F.ax]);
  const across0 = acrossAt(-width / 2);
  const across1 = acrossAt(width / 2);
  const rect = ai === 0 ? { x0: along0, x1: along1, z0: Math.min(across0, across1), z1: Math.max(across0, across1) } : { x0: Math.min(across0, across1), x1: Math.max(across0, across1), z0: along0, z1: along1 };
  const acc = accentMat(accent);
  const P = (u, v, s) => {
    const p = [0, floorY + v, 0];
    p[ai] = alongAt(u);
    p[ci] = acrossAt(s);
    return p;
  };
  const mm = (u0, u1, v0, v1, s0, s1) => {
    const a = P(u0, v0, s0);
    const b = P(u1, v1, s1);
    return [a.map((v, i) => Math.min(v, b[i])), a.map((v, i) => Math.max(v, b[i]))];
  };
  const box = (mat, u0, u1, v0, v1, s0, s1, o) => {
    const [mn, mx] = mm(u0, u1, v0, v1, s0, s1);
    return kit.boxMM(mat, mn, mx, o);
  };
  // world normal into the corridor from the wall on side ±1 (L = -1)
  const normalFrom = (side) => [-side * right[0], 0, -side * right[1]];

  // ---- openings → world hole AABBs (+ bookkeeping for ribs, dressing and strips)
  const sideOps = [];
  const holes = [];
  for (const op of openings) {
    if (!op || !(op.w > 0) || !(op.h > 0)) throw new Error(`corridorSegment: opening needs w and h (${JSON.stringify(op)})`);
    if (op.side === "L" || op.side === "R") {
      if (typeof op.u !== "number") throw new Error(`corridorSegment: L/R opening needs u (${JSON.stringify(op)})`);
      const s = op.side === "L" ? -width / 2 : width / 2;
      const [mn, mx] = mm(op.u - op.w / 2, op.u + op.w / 2, 0, op.h, s - WALL_T, s + WALL_T);
      holes.push({ min: mn, max: mx });
      sideOps.push({ ...op, sideSgn: op.side === "L" ? -1 : 1, u0: op.u - op.w / 2, u1: op.u + op.w / 2 });
    } else if (op.side === "start" || op.side === "end") {
      const u = op.side === "start" ? 0 : length;
      const off = op.offset || 0;
      const [mn, mx] = mm(u - WALL_T, u + WALL_T, 0, op.h, off - op.w / 2, off + op.w / 2);
      holes.push({ min: mn, max: mx });
    } else throw new Error(`corridorSegment: opening side must be L|R|start|end (${JSON.stringify(op)})`);
  }
  const u0 = capStart ? WALL_T : 0;
  const u1 = capEnd ? length - WALL_T : length;
  // door frames need ±0.35 m of clear wall; the next 1.8 m beside a jamb is the door-sign zone (deckPlacard
  // and friends sit there), and rooms may reserve further spans — point dressing stays out of all of them
  const keepOut = [
    ...sideOps.map((op) => ({ sideSgn: op.sideSgn, u0: op.u0 - 0.35 - 1.8, u1: op.u1 + 0.35 + 1.8 })),
    ...reserved.map((r) => {
      if (!r || (r.side !== "L" && r.side !== "R") || typeof r.u0 !== "number" || typeof r.u1 !== "number") throw new Error(`corridorSegment: reserved span needs side L|R, u0, u1 (${JSON.stringify(r)})`);
      return { sideSgn: r.side === "L" ? -1 : 1, u0: Math.min(r.u0, r.u1), u1: Math.max(r.u0, r.u1) };
    }),
  ];
  const clearOf = (side, u, halfW) => !keepOut.some((k) => k.sideSgn === side && u + halfW > k.u0 && u - halfW < k.u1);

  // ---- ribs every 4 m, skipped where a side opening (plus door frame) sits
  const ribEvery = CORRIDOR_DEFAULTS.ribEvery;
  const ribs = [];
  for (let u = ribEvery; u < length - 1.0; u += ribEvery) {
    if (sideOps.some((op) => u + 0.125 > op.u0 - 0.35 && u - 0.125 < op.u1 + 0.35)) continue;
    ribs.push(u);
  }

  // ---- floor: slab, 0.6 m lighter inlay with accent edge lines per bay, black edge trims
  impFloorSlab(kit, { ...rect, y: floorY, tint: "impDark" });
  const inlayTint = col("impMid").clone().lerp(col("impGrey"), 0.35);
  box(MAT.floor, u0, u1, 0, 0.006, -0.3, 0.3, { color: inlayTint, texel: 0.5 });
  box(MAT.dark, u0, u1, 0, 0.008, -inner, -inner + 0.2, { color: col("impBlack"), texel: 1 });
  box(MAT.dark, u0, u1, 0, 0.008, inner - 0.2, inner, { color: col("impBlack"), texel: 1 });
  {
    const bayEdges = [u0 + 0.2, ...ribs, u1 - 0.2];
    for (let i = 0; i < bayEdges.length - 1; i++) {
      const a = bayEdges[i] + (i === 0 ? 0 : 0.45);
      const b = bayEdges[i + 1] - (i === bayEdges.length - 2 ? 0 : 0.45);
      if (b - a < 0.8) continue;
      for (const s of [-0.315, 0.315]) {
        box(MAT.dark, a - 0.02, b + 0.02, 0, 0.009, s - 0.02, s + 0.02, { color: col("impBlack") });
        box(acc, a, b, 0, 0.011, s - 0.008, s + 0.008);
      }
    }
  }

  // ---- side walls (full length; caps overlap their ends). The wall greebles stay out of the door-sign
  // zones and reserved spans too, so a random junction box never lands on a placard.
  const wallSeed = (k) => (seed * 7919 + k * 104729) >>> 0;
  const clearFor = (sideSgn) => keepOut.filter((k) => k.sideSgn === sideSgn).map((k) => [Math.min(alongAt(k.u0), alongAt(k.u1)), Math.max(alongAt(k.u0), alongAt(k.u1))]);
  impWall(kit, { plane: planeName, at: acrossAt(-width / 2), inward: rs, a0: along0, a1: along1, y0: floorY, h: height - 0.12, holes, seed: wallSeed(1), greebles: 0.03, clear: clearFor(-1), collide, tag: tag + "-wallL" });
  impWall(kit, { plane: planeName, at: acrossAt(width / 2), inward: -rs, a0: along0, a1: along1, y0: floorY, h: height - 0.12, holes, seed: wallSeed(2), greebles: 0.03, clear: clearFor(1), collide, tag: tag + "-wallR" });

  // ---- end caps
  const capA0 = ai === 0 ? rect.z0 : rect.x0;
  const capA1 = ai === 0 ? rect.z1 : rect.x1;
  if (capStart) impWall(kit, { plane: axisName, at: from[F.ax], inward: sgn, a0: capA0, a1: capA1, y0: floorY, h: height - 0.12, holes, seed: wallSeed(3), collide, tag: tag + "-capStart", greebles: 0 });
  if (capEnd) impWall(kit, { plane: axisName, at: to[F.ax], inward: -sgn, a0: capA0, a1: capA1, y0: floorY, h: height - 0.12, holes, seed: wallSeed(4), collide, tag: tag + "-capEnd", greebles: 0 });

  const ribC0 = Math.min(acrossAt(-inner), acrossAt(inner));
  const ribC1 = Math.max(acrossAt(-inner), acrossAt(inner));
  ribs.forEach((u, i) => impRib(kit, { axis: axisName, at: alongAt(u), c0: ribC0, c1: ribC1, y0: floorY, h: height - 0.12, collide, tag: tag + "-rib", index: i, accent: acc }));

  // ---- ceiling with the recessed channel; housed fixtures centred between ribs
  const fixtureAt = [];
  for (let u = ribEvery / 2; u < length - 0.8; u += ribEvery) fixtureAt.push(alongAt(u));
  const chanEnds = [alongAt(u0 + 0.3), alongAt(u1 - 0.3)];
  impCeiling(kit, {
    ...rect,
    y: ceilY,
    seed: wallSeed(5),
    channels: [{ axis: axisName, at: acrossAt(0), width: 0.6, c0: Math.min(...chanEnds), c1: Math.max(...chanEnds), fixtureAt, fixtureLen: Math.min(2.4, ribEvery - 1.6) }],
  });

  // ---- dressing rotation: one item per 10 m slot, alternating walls, kind cycling from the seed
  const dressEvery = CORRIDOR_DEFAULTS.dressEvery;
  const trayRun = (side, a, b) => {
    const sWall = side * inner;
    const sIn = sWall - side * 0.06;
    const sOut = sWall - side * 0.31;
    const [sA, sB] = [Math.min(sIn, sOut), Math.max(sIn, sOut)];
    const y = CORRIDOR_DEFAULTS.trayY;
    box(MAT.dark, a, b, y - 0.05, y - 0.03, sA, sB, { color: col("impDark"), texel: 1 });
    box(MAT.dark, a, b, y - 0.05, y + 0.03, sA, sA + 0.015, { color: col("impDark"), texel: 1 });
    box(MAT.dark, a, b, y - 0.05, y + 0.03, sB - 0.015, sB, { color: col("impDark"), texel: 1 });
    for (const [off, r, cname] of [
      [0.08, 0.02, "impBlack"],
      [0.15, 0.015, "impMid"],
      [0.21, 0.018, "impBlack"],
    ]) {
      const p = P((a + b) / 2, y - 0.03 + r, sIn - side * off);
      kit.cyl(MAT.dark, p[0], p[1], p[2], r, b - a, axisName, { color: col(cname), segments: 8 });
    }
    for (let u = a + 0.5; u < b - 0.3; u += 2.0) box(MAT.dark, u - 0.03, u + 0.03, y - 0.09, y - 0.05, Math.min(sWall, sB), Math.max(sWall, sB), { color: col("impBlack") });
    // end caps of the run
    for (const e of [a, b]) box(MAT.dark, e - 0.015, e + 0.015, y - 0.05, y + 0.03, sA, sB, { color: col("impBlack") });
  };
  const pipeRun = (side, a, b) => {
    const sWall = side * inner;
    for (const [y, r, off] of [
      [2.42, 0.045, 0.1],
      [2.6, 0.03, 0.1],
    ]) {
      const p = P((a + b) / 2, y, sWall - side * off);
      kit.cyl(MAT.steel, p[0], p[1], p[2], r, b - a, axisName, { color: col("impGrey"), segments: 10, texel: 1 });
      for (let u = a + 0.6; u < b - 0.4; u += 2.0) {
        box(MAT.dark, u - 0.03, u + 0.03, y - r - 0.02, y + r + 0.02, Math.min(sWall, sWall - side * (off + r + 0.02)), Math.max(sWall, sWall - side * (off + r + 0.02)), { color: col("impBlack") });
      }
      // flanges / a valve body midway
      for (const u of [a + 0.25, b - 0.25]) {
        const q = P(u, y, sWall - side * off);
        kit.cyl(MAT.dark, q[0], q[1], q[2], r + 0.02, 0.06, axisName, { color: col("impDark"), segments: 10 });
      }
    }
    const vm = P((a + b) / 2, 2.42, sWall - side * 0.1);
    kit.cyl(MAT.dark, vm[0], vm[1], vm[2], 0.075, 0.16, axisName, { color: col("impBlack"), segments: 12 });
    box(MAT.dark, (a + b) / 2 - 0.02, (a + b) / 2 + 0.02, 2.42, 2.62, sWall - side * 0.1 - 0.02, sWall - side * 0.1 + 0.02, { color: col("impDark") });
    box(acc, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, 2.6, 2.64, sWall - side * 0.1 - 0.03, sWall - side * 0.1 + 0.03);
  };
  let markerNo = 0;
  const rotStart = seed % ROTATION.length;
  const sideStart = seed & 1 ? 1 : -1;
  let slot = 0;
  for (let uc = dressEvery / 2; uc < length - 1.5; uc += dressEvery, slot++) {
    const kind = ROTATION[(rotStart + slot) % ROTATION.length];
    const side = slot % 2 === 0 ? sideStart : -sideStart;
    const sFace = side * inner; // panel face across coordinate
    const normal = normalFrom(side);
    const at = (u, y, off = 0) => P(u, y, sFace - side * off);
    if (kind === "tray" || kind === "pipes") {
      const cut = sideOps.filter((op) => op.sideSgn === side).map((op) => [op.u0 - 0.5, op.u1 + 0.5]);
      const runA = Math.max(u0 + 0.3, uc - dressEvery / 2 + 0.5);
      const runB = Math.min(u1 - 0.3, uc + dressEvery / 2 - 0.5);
      for (const [t0, t1] of spansMinus(length, cut)) {
        const a = Math.max(t0, runA);
        const b = Math.min(t1, runB);
        if (b - a < 1.5) continue;
        if (kind === "tray") trayRun(side, a, b);
        else pipeRun(side, a, b);
      }
      continue;
    }
    // point dressings need clear wall (also from the ribs: sit mid-bay)
    let u = uc;
    const nearRib = ribs.find((r) => Math.abs(r - u) < 0.9);
    if (nearRib !== undefined) u = nearRib + (u >= nearRib ? 1.4 : -1.4);
    if (!clearOf(side, u, 0.6) || u < u0 + 1.2 || u > u1 - 1.2) continue;
    if (kind === "junction") junctionDrop(kit, { pos: at(u, 0), normal, ceilY, accent, code: label ? `J${String(slot + 1).padStart(2, "0")}` : null, seed: seed + slot });
    else if (kind === "vent") ventPanel(kit, { pos: at(u, 2.55), normal, w: 0.9, h: 0.4 });
    else if (kind === "terminal") wallTerminal(kit, { pos: at(u, 1.4), normal, screen: accentScreen(accent), accent, gloss: MAT.floor, seed: seed + slot, collide });
    else if (kind === "fire") firePoint(kit, { pos: at(u, 0), yaw: Math.atan2(normal[0], normal[2]), collide });
    else if (kind === "marker") {
      markerNo++;
      sectionMarker(kit, { pos: at(u, 1.7), normal, text: `${label ?? "SEC"} ${String(markerNo).padStart(2, "0")}`, accent });
    }
  }

  // ---- light descriptors: one per ~8 m, never more than 14 for the room budget
  let lightsAdded = 0;
  if (Array.isArray(lights)) {
    const spacing = Math.max(CORRIDOR_DEFAULTS.lightEvery, length / 14);
    const n = Math.max(1, Math.round(length / spacing));
    for (let i = 0; i < n; i++) {
      const u = (length * (i + 0.5)) / n;
      lights.push({ type: "point", pos: P(u, height - 0.6, 0), color: 0xdfe8ff, intensity: 14, distance: 12, priority: 0.4 });
      lightsAdded++;
    }
  }
  return { length, dir, right, lightsAdded };
}

export function corridorJunction(kit, opts) {
  const { center, floorY, arms = ["N", "S", "E", "W"], width = CORRIDOR_DEFAULTS.width, height = CORRIDOR_DEFAULTS.height, style = "imperial", accent = "impBlue", seed = 1, lights = null, collide = true, tag = "junction" } = opts;
  if (!center || center.length !== 2) throw new Error("corridorJunction: center must be [x, z]");
  if (typeof floorY !== "number") throw new Error("corridorJunction: floorY is required");
  checkStyle(style);
  for (const a of arms) if (!["N", "S", "E", "W"].includes(a)) throw new Error(`corridorJunction: unknown arm ${a}`);
  const [cx, cz] = center;
  const hw = width / 2;
  const x0 = cx - hw;
  const x1 = cx + hw;
  const z0 = cz - hw;
  const z1 = cz + hw;
  const ceilY = floorY + height - 0.12;
  const dark = col("impDark");
  const black = col("impBlack");
  const acc = accentMat(accent);
  const has = (a) => arms.includes(a);

  impFloorSlab(kit, { x0, x1, z0, z1, y: floorY, tint: "impDark" });
  // lighter inlay cross toward each open arm (same 0.6 m as the segments)
  const strip = 0.3;
  const inlayTint = col("impMid").clone().lerp(col("impGrey"), 0.35);
  if (has("N")) kit.boxMM(MAT.floor, [cx - strip, floorY, z0], [cx + strip, floorY + 0.006, cz + strip], { color: inlayTint, texel: 0.5 });
  if (has("S")) kit.boxMM(MAT.floor, [cx - strip, floorY, cz - strip], [cx + strip, floorY + 0.006, z1], { color: inlayTint, texel: 0.5 });
  if (has("E")) kit.boxMM(MAT.floor, [cx - strip, floorY, cz - strip], [x1, floorY + 0.006, cz + strip], { color: inlayTint, texel: 0.5 });
  if (has("W")) kit.boxMM(MAT.floor, [x0, floorY, cz - strip], [cx + strip, floorY + 0.006, cz + strip], { color: inlayTint, texel: 0.5 });
  if (!has("N") && !has("S") && !has("E") && !has("W")) kit.boxMM(MAT.floor, [cx - strip, floorY, cz - strip], [cx + strip, floorY + 0.006, cz + strip], { color: inlayTint, texel: 0.5 });
  // accent ring around the crossing on the floor
  for (const [a, b] of [
    [[cx - strip - 0.03, cz - strip - 0.03], [cx + strip + 0.03, cz - strip - 0.01]],
    [[cx - strip - 0.03, cz + strip + 0.01], [cx + strip + 0.03, cz + strip + 0.03]],
    [[cx - strip - 0.03, cz - strip - 0.03], [cx - strip - 0.01, cz + strip + 0.03]],
    [[cx + strip + 0.01, cz - strip - 0.03], [cx + strip + 0.03, cz + strip + 0.03]],
  ]) kit.boxMM(acc, [a[0], floorY, a[1]], [b[0], floorY + 0.011, b[1]]);

  // walls on closed sides
  const wallSeed = (k) => (seed * 7919 + k * 104729) >>> 0;
  const wallH = height - 0.12;
  if (!has("N")) impWall(kit, { plane: "z", at: z0, inward: 1, a0: x0, a1: x1, y0: floorY, h: wallH, seed: wallSeed(1), collide, tag: tag + "-N" });
  if (!has("S")) impWall(kit, { plane: "z", at: z1, inward: -1, a0: x0, a1: x1, y0: floorY, h: wallH, seed: wallSeed(2), collide, tag: tag + "-S" });
  if (!has("E")) impWall(kit, { plane: "x", at: x1, inward: -1, a0: z0, a1: z1, y0: floorY, h: wallH, seed: wallSeed(3), collide, tag: tag + "-E" });
  if (!has("W")) impWall(kit, { plane: "x", at: x0, inward: 1, a0: z0, a1: z1, y0: floorY, h: wallH, seed: wallSeed(4), collide, tag: tag + "-W" });

  // ceiling: one channel along the longer open axis (or x), single housed fixture in the middle
  const alongZ = (has("N") || has("S")) && !(has("E") || has("W"));
  impCeiling(kit, {
    x0,
    x1,
    z0,
    z1,
    y: ceilY,
    seed: wallSeed(5),
    channels: [alongZ ? { axis: "z", at: cx, width: 0.6, c0: z0 + 0.4, c1: z1 - 0.4, fixtureAt: [cz], fixtureLen: width - 1.6 } : { axis: "x", at: cz, width: 0.6, c0: x0 + 0.4, c1: x1 - 0.4, fixtureAt: [cx], fixtureLen: width - 1.6 }],
  });

  // corner posts (rib language) + portal beams over the open arms
  const post = 0.34;
  const corners = [
    [x0, z0],
    [x1 - post, z0],
    [x0, z1 - post],
    [x1 - post, z1 - post],
  ];
  for (const [px, pz] of corners) {
    const mn = [px, floorY, pz];
    const mx = [px + post, floorY + wallH, pz + post];
    kit.boxMM(MAT.dark, mn, mx, { color: dark, texel: 1 });
    // black groove + indicator on the two room-facing faces
    const ix = px < cx ? px + post : px;
    const iz = pz < cz ? pz + post : pz;
    const sx = px < cx ? 1 : -1;
    const sz = pz < cz ? 1 : -1;
    kit.boxMM(MAT.steel, [Math.min(ix, ix + sx * 0.015), floorY + 0.5, Math.min(pz + post / 2 - 0.03, pz + post / 2 + 0.03)], [Math.max(ix, ix + sx * 0.015), floorY + wallH - 0.5, Math.max(pz + post / 2 - 0.03, pz + post / 2 + 0.03)], { color: col("impGrey"), texel: 2 });
    kit.boxMM(acc, [Math.min(ix, ix + sx * 0.02), floorY + 1.5, pz + post / 2 - 0.04], [Math.max(ix, ix + sx * 0.02), floorY + 1.58, pz + post / 2 + 0.04]);
    kit.boxMM(MAT.steel, [px + post / 2 - 0.03, floorY + 0.5, Math.min(iz, iz + sz * 0.015)], [px + post / 2 + 0.03, floorY + wallH - 0.5, Math.max(iz, iz + sz * 0.015)], { color: col("impGrey"), texel: 2 });
    if (collide) kit.collider(mn, mx, tag + "-post");
  }
  const beam = (mn, mx) => kit.boxMM(MAT.dark, mn, mx, { color: dark, texel: 1 });
  if (has("N")) beam([x0 + post, floorY + wallH - 0.18, z0], [x1 - post, floorY + wallH, z0 + 0.25]);
  if (has("S")) beam([x0 + post, floorY + wallH - 0.18, z1 - 0.25], [x1 - post, floorY + wallH, z1]);
  if (has("E")) beam([x1 - 0.25, floorY + wallH - 0.18, z0 + post], [x1, floorY + wallH, z1 - post]);
  if (has("W")) beam([x0, floorY + wallH - 0.18, z0 + post], [x0 + 0.25, floorY + wallH, z1 - post]);
  // floor plates under the portals (rib sill language)
  if (has("N")) kit.boxMM(MAT.dark, [x0 + post, floorY, z0], [x1 - post, floorY + 0.012, z0 + 0.25], { color: black });
  if (has("S")) kit.boxMM(MAT.dark, [x0 + post, floorY, z1 - 0.25], [x1 - post, floorY + 0.012, z1], { color: black });
  if (has("E")) kit.boxMM(MAT.dark, [x1 - 0.25, floorY, z0 + post], [x1, floorY + 0.012, z1 - post], { color: black });
  if (has("W")) kit.boxMM(MAT.dark, [x0, floorY, z0 + post], [x0 + 0.25, floorY + 0.012, z1 - post], { color: black });

  let lightsAdded = 0;
  if (Array.isArray(lights)) {
    lights.push({ type: "point", pos: [cx, floorY + height - 0.6, cz], color: 0xdfe8ff, intensity: 14, distance: 12, priority: 0.45 });
    lightsAdded = 1;
  }
  return { size: width, arms: [...arms], lightsAdded };
}
