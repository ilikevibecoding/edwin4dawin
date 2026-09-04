// Imperial building blocks shared by the corridor kit (corridor.js) and the Deck 4 aft-complex rooms:
// panelled walls with black recessed seams, deck floors, ceilings with recessed light channels and
// structural ribs. Everything is axis-aligned, so every collider is an exact AABB.
//
//   import { impWall, impCeiling, impFloorSlab, impRib, MAT, col } from "../../systems/corridor/imperial.js";
//
// Conventions (COORDINATION.md §6/§11): metres, +Y up. A wall is described by its OUTER face (the room's
// bounds face) and the direction into the room; the slab is WALL_T (0.16) thick and its panel faces sit
// exactly WALL_T inside the bounds face, which is where the doors system expects a room's inner face.
// Holes are world AABBs (`doorOpening(door)` from the doors helper returns one), so a room can hand every
// wall the same list and each wall picks the holes that lie on it.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { PALETTE } from "../../materials.js";
import { WALL_T } from "../doors/helper.js";
import { stencilText, TEXT_MAT } from "./text.js";

// Shared material keys (§10). One key = one draw call for the module.
export const MAT = Object.freeze({
  panel: "impPanel", // light-grey wall/ceiling panels (tint impWhite / impGrey)
  floor: "impFloor", // dark deck plating (tint impDark)
  dark: "paintedMetal", // dark painted structural steel: ribs, backing, trims (tint impBlack / impDark)
  steel: "metal", // bare steel details (bolts, conduits, slats)
  strip: "emitWhite", // wall light strips
  diffuser: "emitCoolSoft", // ceiling channel diffusers (uv "keep")
  blue: "emitBlue",
  red: "emitRedImp",
  amber: "emitAmber",
});

export const SEAM = 0.025; // black seam between panels
export const PANEL_T = 0.03; // panel thickness in front of the black backing
export const STRIP_Y = 2.1; // wall light strip centre height (§11)
export const STRIP_H = 0.06;

// §10 Imperial colours, with fallbacks so the kit still builds if the shared palette lags behind.
const FALLBACK = {
  impWhite: "#c9ccd1",
  impGrey: "#8d9198",
  impMid: "#5a5e66",
  impDark: "#33363c",
  impBlack: "#111214",
  impRed: "#ff2a1a",
  impBlue: "#3a7bff",
  impAmber: "#ffa028",
  impGreen: "#38d67a",
  impHullLight: "#a7abb1",
  impHullDark: "#6f747c",
};
const cache = new Map();
/** Palette colour by name (PALETTE.impX when present, §10 fallback otherwise). */
export function col(name) {
  const c = PALETTE[name];
  if (c) return c;
  if (!cache.has(name)) cache.set(name, new THREE.Color(FALLBACK[name] || "#ff00ff"));
  return cache.get(name);
}

const uniqSorted = (arr, eps = 1e-4) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.filter((v, i) => i === 0 || v - s[i - 1] > eps);
};

// Split [0, L] into spans not covered by the given [u0,u1] ranges.
export function spansMinus(L, ranges, pad = 0) {
  let spans = [[0, L]];
  for (const [r0, r1] of ranges) {
    const a = r0 - pad;
    const b = r1 + pad;
    const next = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
    }
    spans = next;
  }
  return spans.filter(([a, b]) => b - a > 0.02);
}

/**
 * Panelled Imperial wall (axis-aligned).
 * @param {import("../../kit.js").Kit} kit
 * @param {object} o
 * @param {"x"|"z"} o.plane       wall normal axis ("x": wall lies in a y-z plane at x = at)
 * @param {number} o.at           OUTER face coordinate on that axis (the room's bounds face)
 * @param {1|-1} o.inward         direction from the outer face into the room
 * @param {number} o.a0 o.a1      extent along the wall's horizontal axis (world coords, a1 > a0)
 * @param {number} o.y0 o.h       floor height and wall height
 * @param {{min:number[],max:number[]}[]} [o.holes] world AABBs to cut (doors, lift, windows)
 * @param {number} [o.seed]       deterministic greeble variation
 * @param {number} [o.panelW]     nominal panel width (1.2)
 * @param {boolean} [o.kick]      dark kick-plate row at the bottom
 * @param {number[]} [o.stripYs]  centre heights of emitWhite light strips ([2.1])
 * @param {string} [o.tint]       palette name for panels ("impWhite"); tint2 for the darker variant
 * @param {number} [o.greebles]   fraction of eligible cells that get a vent / junction box / placard
 * @param {number[][]} [o.clear]  [[a, b], …] world spans along the wall kept free of greebles (plain panels
 *                                only) — put your signs, boards and terminals in them
 * @param {boolean} [o.collide]   push AABB colliders for the wall body below head height
 * @returns {{length:number, holes:object[], slabs:object[]}}
 */
export function impWall(kit, o) {
  const {
    plane,
    at,
    inward,
    a0,
    a1,
    y0,
    h,
    holes = [],
    seed = 1,
    panelW = 1.2,
    kick = true,
    stripYs = [STRIP_Y],
    tint = "impWhite",
    tint2 = "impGrey",
    greebles = 0.08,
    stripGaps = [],
    clear = [],
    collide = true,
    tag = "wall",
    texel = 0.5,
  } = o;
  if (plane !== "x" && plane !== "z") throw new Error("impWall: plane must be 'x' or 'z'");
  for (const c of clear) if (!Array.isArray(c) || c.length !== 2 || typeof c[0] !== "number" || typeof c[1] !== "number") throw new Error(`impWall: clear spans must be [a, b] pairs (${JSON.stringify(c)})`);
  // greeble-free cells: any cell overlapping a clear span (in the wall's local u)
  const inClear = (u0, u1) => clear.some(([a, b]) => Math.min(a, b) - a0 < u1 && Math.max(a, b) - a0 > u0);
  if (inward !== 1 && inward !== -1) throw new Error("impWall: inward must be 1 or -1");
  const along = plane === "z" ? 0 : 2;
  const norm = plane === "z" ? 2 : 0;
  const L = a1 - a0;
  if (!(L > 0.05) || !(h > 0.1)) throw new Error(`impWall: degenerate wall (length ${L}, height ${h})`);
  const inner = at + inward * WALL_T;
  const rand = rng(seed);
  // local (u along, v up, n into the wall from the inner face) -> world AABB
  const world = (u0, u1, v0, v1, n0, n1) => {
    const min = [0, 0, 0];
    const max = [0, 0, 0];
    min[along] = a0 + Math.min(u0, u1);
    max[along] = a0 + Math.max(u0, u1);
    min[1] = y0 + Math.min(v0, v1);
    max[1] = y0 + Math.max(v0, v1);
    const p = inner - inward * n0;
    const q = inner - inward * n1;
    min[norm] = Math.min(p, q);
    max[norm] = Math.max(p, q);
    return [min, max];
  };
  const box = (mat, u0, u1, v0, v1, n0, n1, opts = {}) => {
    const [min, max] = world(u0, u1, v0, v1, n0, n1);
    return kit.boxMM(mat, min, max, opts);
  };
  const point = (u, v, n) => {
    const p = [0, y0 + v, 0];
    p[along] = a0 + u;
    p[norm] = inner - inward * n;
    return p;
  };

  // ---- holes projected onto this wall
  const ops = [];
  for (const hh of holes) {
    if (!hh || !hh.min || !hh.max) continue;
    if (hh.min[norm] > at + 0.03 || hh.max[norm] < at - 0.03) continue;
    const u0 = hh.min[along] - a0;
    const u1 = hh.max[along] - a0;
    if (u1 <= 0.001 || u0 >= L - 0.001) continue;
    const v0 = hh.min[1] - y0;
    const v1 = hh.max[1] - y0;
    if (v1 <= 0.001 || v0 >= h - 0.001) continue;
    ops.push({ u0: Math.max(0, u0), u1: Math.min(L, u1), v0: Math.max(0, v0), v1: Math.min(h, v1) });
  }

  // ---- wall body: black backing slabs = rectangle minus holes (exact, any hole layout)
  const ucAll = uniqSorted([0, L, ...ops.flatMap((op) => [op.u0, op.u1])]);
  let slabs = [];
  for (let i = 0; i < ucAll.length - 1; i++) {
    const u0 = ucAll[i];
    const u1 = ucAll[i + 1];
    const um = (u0 + u1) / 2;
    const cover = ops
      .filter((op) => op.u0 < um && op.u1 > um)
      .map((op) => [op.v0, op.v1])
      .sort((p, q) => p[0] - q[0]);
    let v = 0;
    for (const [c0, c1] of cover) {
      if (c0 > v + 1e-4) slabs.push({ u0, u1, v0: v, v1: c0 });
      v = Math.max(v, c1);
    }
    if (v < h - 1e-4) slabs.push({ u0, u1, v0: v, v1: h });
  }
  // merge horizontally adjacent slabs with the same vertical extent
  slabs.sort((p, q) => p.v0 - q.v0 || p.v1 - q.v1 || p.u0 - q.u0);
  const merged = [];
  for (const s of slabs) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.v0 - s.v0) < 1e-6 && Math.abs(last.v1 - s.v1) < 1e-6 && Math.abs(last.u1 - s.u0) < 1e-6) last.u1 = s.u1;
    else merged.push({ ...s });
  }
  slabs = merged;
  for (const s of slabs) {
    box(MAT.dark, s.u0, s.u1, s.v0, s.v1, PANEL_T - 0.005, WALL_T, { color: col("impBlack"), texel });
    if (collide && s.v0 < 1.9) {
      const [min, max] = world(s.u0, s.u1, s.v0, s.v1, -0.02, WALL_T);
      kit.collider(min, max, tag);
    }
  }

  // ---- panel grid: u cuts from the nominal panel width + hole edges
  const nCols = Math.max(1, Math.round(L / panelW));
  let uCuts = [];
  for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * L);
  const edgesU = ops.flatMap((op) => [op.u0, op.u1]).filter((e) => e > 0.001 && e < L - 0.001);
  // door-sized holes get one lintel/sill cell (no seam over a door); wider holes (window bands, bay
  // doors) keep the column grid running above and below them
  const LINTEL_MAX = 4.5;
  uCuts = uCuts.filter((c) => !edgesU.some((e) => Math.abs(e - c) < 0.25) && !ops.some((op) => op.u1 - op.u0 <= LINTEL_MAX && c > op.u0 + 0.01 && c < op.u1 - 0.01));
  uCuts = uniqSorted([...uCuts, ...edgesU], 0.05);

  // rows: kick, then ~1 m rows broken by the strip bands
  const bands = stripYs.filter((y) => y - STRIP_H / 2 - 0.05 > (kick ? 0.32 : 0) + 0.3 && y + 0.08 < h - 0.15).sort((p, q) => p - q);
  const baseRows = [0];
  const fill = (v0, v1) => {
    const n = Math.max(1, Math.round((v1 - v0) / 1.0));
    for (let i = 1; i < n; i++) baseRows.push(v0 + ((v1 - v0) * i) / n);
  };
  let cur = 0;
  if (kick && h > 0.9) {
    baseRows.push(0.32);
    cur = 0.32;
  }
  for (const sy of bands) {
    fill(cur, sy - 0.08);
    baseRows.push(sy - 0.08, sy + 0.08);
    cur = sy + 0.08;
  }
  fill(cur, h);
  baseRows.push(h);
  const rowsSorted = uniqSorted(baseRows, 0.02);
  const isBandRow = (v0, v1) => bands.some((sy) => Math.abs(v0 - (sy - 0.08)) < 1e-3 && Math.abs(v1 - (sy + 0.08)) < 1e-3);

  const columnVCuts = (u0, u1) => {
    const colOps = ops.filter((op) => op.u1 > u0 + 1e-3 && op.u0 < u1 - 1e-3);
    const edgesV = [];
    for (const op of colOps) {
      if (op.v0 > 0.001) edgesV.push(op.v0);
      if (op.v1 < h - 0.001) edgesV.push(op.v1);
    }
    let vCuts = rowsSorted.filter((c) => !edgesV.some((e) => Math.abs(e - c) < 0.2) && !colOps.some((op) => c > op.v0 + 0.01 && c < op.v1 - 0.01));
    // never lose a band edge to the 0.2 m filter unless a hole really runs through the band
    for (const sy of bands) {
      for (const e of [sy - 0.08, sy + 0.08]) if (!vCuts.includes(e) && !colOps.some((op) => e > op.v0 + 0.01 && e < op.v1 - 0.01)) vCuts.push(e);
    }
    return uniqSorted([...vCuts, ...edgesV], 0.03);
  };

  const gap = SEAM / 2;
  const panelTint = col(tint);
  const panelTint2 = col(tint2);
  const panel = (u0, u1, v0, v1, c, n0 = 0) => box(MAT.panel, u0 + gap, u1 - gap, v0 + gap, v1 - gap, n0, n0 + PANEL_T, { color: c, uv: "keep" });

  let cells = 0;
  for (let ci = 0; ci < uCuts.length - 1; ci++) {
    const u0 = uCuts[ci];
    const u1 = uCuts[ci + 1];
    const cw = u1 - u0;
    if (cw < 0.03) continue;
    const cu = (u0 + u1) / 2;
    const vCuts = columnVCuts(u0, u1);
    for (let ri = 0; ri < vCuts.length - 1; ri++) {
      const v0 = vCuts[ri];
      const v1 = vCuts[ri + 1];
      const ch = v1 - v0;
      if (ch < 0.03) continue;
      const cv = (v0 + v1) / 2;
      if (ops.some((op) => cu > op.u0 - 1e-3 && cu < op.u1 + 1e-3 && cv > op.v0 - 1e-3 && cv < op.v1 + 1e-3)) continue;
      if (isBandRow(v0, v1)) continue; // strips are built per span below
      cells++;
      if (kick && v0 < 1e-3 && Math.abs(v1 - 0.32) < 1e-3) {
        // kick plate: darker, 1 cm proud, black base strip
        box(MAT.panel, u0 + gap, u1 - gap, 0.05, v1 - gap, -0.01, PANEL_T, { color: col("impMid"), uv: "keep" });
        box(MAT.dark, u0, u1, 0, 0.05, -0.015, PANEL_T, { color: col("impBlack"), texel: 2 });
        continue;
      }
      const big = cw > 0.85 && ch > 0.6;
      const r = rand(); // drawn for every cell so the pattern elsewhere does not shift with the clear list
      if (big && greebles > 0 && r < greebles && !inClear(u0, u1)) {
        const kind = rand();
        if (kind < 0.4 && cv > 1.6) {
          // vent: darker panel, recessed grille, steel slats
          box(MAT.panel, u0 + gap, u1 - gap, v0 + gap, v1 - gap, 0.005, PANEL_T, { color: col("impMid"), uv: "keep" });
          const vw = Math.min(cw - 0.3, 0.8);
          const vh = Math.min(ch - 0.24, 0.5);
          box(MAT.dark, cu - vw / 2, cu + vw / 2, cv - vh / 2, cv + vh / 2, -0.005, 0.02, { color: col("impBlack"), texel: 2 });
          const slats = Math.max(4, Math.floor(vh / 0.075));
          for (let s = 0; s < slats; s++) {
            const sv = cv - vh / 2 + 0.04 + ((vh - 0.08) * s) / (slats - 1);
            box(MAT.steel, cu - vw / 2 + 0.03, cu + vw / 2 - 0.03, sv - 0.011, sv + 0.011, -0.03, -0.005, { color: col("impGrey"), texel: 3 });
          }
          continue;
        }
        if (kind < 0.8 && cv > 0.9 && cv < 2.0) {
          // junction box on a plain panel with a conduit running up to the ceiling
          panel(u0, u1, v0, v1, panelTint);
          const bu = cu + (rand() - 0.5) * Math.max(0, cw - 0.7);
          const bv = Math.min(v1 - 0.22, Math.max(v0 + 0.22, cv + (rand() - 0.5) * 0.3));
          box(MAT.dark, bu - 0.18, bu + 0.18, bv - 0.14, bv + 0.14, -0.09, 0, { color: col("impDark"), texel: 2 });
          box(MAT.panel, bu - 0.15, bu + 0.15, bv - 0.11, bv + 0.11, -0.096, -0.09, { color: col("impMid"), uv: "keep" });
          box(rand() < 0.5 ? MAT.blue : MAT.amber, bu + 0.09, bu + 0.12, bv + 0.05, bv + 0.07, -0.102, -0.095);
          box(MAT.red, bu + 0.05, bu + 0.07, bv + 0.05, bv + 0.07, -0.102, -0.095);
          for (let k = 0; k < 3; k++) box(MAT.dark, bu - 0.11 + k * 0.05, bu - 0.08 + k * 0.05, bv - 0.07, bv - 0.04, -0.1, -0.095, { color: col("impBlack") });
          const top = h - 0.02;
          const cx = bu + 0.1;
          const p = point(cx, (bv + 0.14 + top) / 2, -0.045);
          kit.cyl(MAT.steel, p[0], p[1], p[2], 0.02, top - (bv + 0.14), "y", { color: col("impGrey"), segments: 8 });
          for (const cy of [bv + 0.45, Math.min(top - 0.2, bv + 1.4)]) box(MAT.dark, cx - 0.04, cx + 0.04, cy - 0.02, cy + 0.02, -0.075, 0, { color: col("impDark") });
          continue;
        }
        // service placard: small black plate, stencilled service tag (real text when the module registered
        // the text materials; a plain plate otherwise — never text bars), red status dot
        panel(u0, u1, v0, v1, panelTint);
        const pu = cu;
        const pv = cv + 0.1;
        box(MAT.dark, pu - 0.2, pu + 0.2, pv - 0.09, pv + 0.09, -0.012, 0, { color: col("impBlack"), texel: 2 });
        box(MAT.red, pu + 0.12, pu + 0.15, pv - 0.055, pv - 0.025, -0.016, -0.012);
        const tag = `SVC ${10 + Math.floor(rand() * 90)}`;
        if (kit.materials && kit.materials[TEXT_MAT]) {
          const normal = plane === "z" ? [0, 0, inward] : [inward, 0, 0];
          stencilText(kit, { text: tag, pos: point(pu - 0.03, pv + 0.01, -0.013), normal, size: 0.07, color: "white", tint: 0x9a9ea6 });
        }
        continue;
      }
      // plain panel variants
      const v = rand();
      if (big && v < 0.15) {
        // two panels split by a horizontal seam
        const vm = v0 + ch * (0.4 + rand() * 0.2);
        panel(u0, u1, v0, vm, panelTint);
        panel(u0, u1, vm, v1, panelTint);
      } else if (big && v < 0.28) {
        // raised inner plate
        panel(u0, u1, v0, v1, panelTint);
        box(MAT.panel, u0 + 0.16, u1 - 0.16, v0 + 0.14, v1 - 0.14, -0.012, 0.005, { color: panelTint, uv: "keep" });
      } else if (v < 0.42) {
        panel(u0, u1, v0, v1, panelTint2);
      } else {
        panel(u0, u1, v0, v1, panelTint);
      }
    }
  }

  // ---- light strips: continuous per span, broken at holes that cross the band and at stripGaps
  // (world coords along the wall, e.g. behind a status board); a gap gets a plain panel piece instead
  const gaps = stripGaps.map(([g0, g1]) => [Math.max(0, Math.min(g0, g1) - a0), Math.min(L, Math.max(g0, g1) - a0)]).filter(([g0, g1]) => g1 - g0 > 0.03);
  for (const sy of bands) {
    const cut = ops.filter((op) => op.v1 > sy - 0.08 && op.v0 < sy + 0.08).map((op) => [op.u0, op.u1]);
    for (const [s0, s1] of spansMinus(L, [...cut, ...gaps])) {
      box(MAT.dark, s0, s1, sy - 0.08, sy + 0.08, 0.01, 0.06, { color: col("impBlack"), texel: 2 });
      box(MAT.strip, s0 + 0.02, s1 - 0.02, sy - STRIP_H / 2, sy + STRIP_H / 2, -0.004, 0.012);
    }
    for (const [g0, g1] of gaps) {
      if (ops.some((op) => op.v1 > sy - 0.08 && op.v0 < sy + 0.08 && op.u0 < g1 && op.u1 > g0)) continue;
      panel(g0, g1, sy - 0.08, sy + 0.08, panelTint);
    }
  }
  return { length: L, holes: ops, slabs, cells };
}

/**
 * Deck floor slab (top face at y). Optional lighter centre strip and dark edge trims.
 * @param {object} o {x0,x1,z0,z1,y, thick=0.12, tint="impDark", mat=MAT.floor, texel=0.5}
 */
export function impFloorSlab(kit, o) {
  const { x0, x1, z0, z1, y, thick = 0.12, tint = "impDark", mat = MAT.floor, texel = 0.5 } = o;
  kit.boxMM(mat, [x0, y - thick, z0], [x1, y, z1], { color: col(tint), texel });
}

/**
 * Ceiling with black seams and recessed light channels. `y` is the visible (lower) face; the slab
 * occupies [y, y + thick].
 * channels: [{ axis:"x"|"z", at, width=0.6, c0, c1, fixtureAt:[...] | spacing, fixtureLen=2.4, fixtureMat=emitCoolSoft, stripW, fins=true }]
 * Every channel is lit by housed fixtures (impFixture); fixtureMat = "emitBlue" gives a coloured channel.
 */
export function impCeiling(kit, o) {
  const { x0, x1, z0, z1, y, thick = 0.12, panelW = 1.2, tint = "impGrey", seed = 1, channels = [], texel = 0.5 } = o;
  const rand = rng(seed);
  const black = col("impBlack");
  // top plate (channel backs)
  kit.boxMM(MAT.dark, [x0, y + thick - 0.02, z0], [x1, y + thick, z1], { color: black, texel });
  // grid decomposition around channel strips
  const xs = [x0, x1];
  const zs = [z0, z1];
  const strips = channels.map((c) => {
    const w = c.width ?? 0.6;
    const s = { ...c, width: w };
    if (c.axis === "x") {
      s.zA = c.at - w / 2;
      s.zB = c.at + w / 2;
      s.xA = c.c0 ?? x0;
      s.xB = c.c1 ?? x1;
      zs.push(s.zA, s.zB);
      xs.push(s.xA, s.xB);
    } else {
      s.xA = c.at - w / 2;
      s.xB = c.at + w / 2;
      s.zA = c.c0 ?? z0;
      s.zB = c.c1 ?? z1;
      xs.push(s.xA, s.xB);
      zs.push(s.zA, s.zB);
    }
    return s;
  });
  const xc = uniqSorted(xs.filter((v) => v >= x0 - 1e-6 && v <= x1 + 1e-6));
  const zc = uniqSorted(zs.filter((v) => v >= z0 - 1e-6 && v <= z1 + 1e-6));
  const inStrip = (xm, zm) => strips.some((s) => xm > s.xA && xm < s.xB && zm > s.zA && zm < s.zB);
  for (let i = 0; i < xc.length - 1; i++) {
    for (let j = 0; j < zc.length - 1; j++) {
      const ax = xc[i];
      const bx = xc[i + 1];
      const az = zc[j];
      const bz = zc[j + 1];
      if (bx - ax < 0.02 || bz - az < 0.02) continue;
      if (inStrip((ax + bx) / 2, (az + bz) / 2)) continue;
      // backing
      kit.boxMM(MAT.dark, [ax, y + PANEL_T - 0.005, az], [bx, y + thick - 0.02, bz], { color: black, texel });
      // panels
      const nx = Math.max(1, Math.round((bx - ax) / panelW));
      const nz = Math.max(1, Math.round((bz - az) / panelW));
      const pw = (bx - ax) / nx;
      const pd = (bz - az) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const px0 = ax + a * pw + SEAM / 2;
          const px1 = ax + (a + 1) * pw - SEAM / 2;
          const pz0 = az + b * pd + SEAM / 2;
          const pz1 = az + (b + 1) * pd - SEAM / 2;
          if (px1 - px0 < 0.03 || pz1 - pz0 < 0.03) continue;
          const dark = rand() < 0.12;
          kit.boxMM(MAT.panel, [px0, y, pz0], [px1, y + PANEL_T, pz1], { color: col(dark ? "impMid" : tint), uv: "keep" });
        }
      }
    }
  }
  // channels: cheeks + fixtures
  for (const s of strips) {
    const cheek = 0.03;
    if (s.axis === "x") {
      kit.boxMM(MAT.dark, [s.xA, y, s.zA], [s.xB, y + thick - 0.02, s.zA + cheek], { color: black, texel });
      kit.boxMM(MAT.dark, [s.xA, y, s.zB - cheek], [s.xB, y + thick - 0.02, s.zB], { color: black, texel });
    } else {
      kit.boxMM(MAT.dark, [s.xA, y, s.zA], [s.xA + cheek, y + thick - 0.02, s.zB], { color: black, texel });
      kit.boxMM(MAT.dark, [s.xB - cheek, y, s.zA], [s.xB, y + thick - 0.02, s.zB], { color: black, texel });
    }
    const len = s.axis === "x" ? s.xB - s.xA : s.zB - s.zA;
    const start = s.axis === "x" ? s.xA : s.zA;
    let centres = s.fixtureAt;
    if (!centres && s.spacing) {
      centres = [];
      for (let c = start + (s.phase ?? s.spacing / 2); c < start + len - 0.5; c += s.spacing) centres.push(c);
    }
    if (!centres) continue;
    const fl = Math.min(s.fixtureLen ?? 2.4, len - 0.3);
    for (const c of centres) {
      const c0 = Math.max(start + 0.1, c - fl / 2);
      const c1 = Math.min(start + len - 0.1, c + fl / 2);
      if (c1 - c0 < 0.3) continue;
      impFixture(kit, { axis: s.axis, at: s.at, c0, c1, y, width: s.width - 0.1, mat: s.fixtureMat, fins: s.fins !== false, stripW: s.stripW });
    }
  }
}

/**
 * Housed ceiling fixture: a dark housing (side rails + end caps) recessed into a light channel, black
 * back plate, a narrow emissive strip well inside it and black louvre fins across the slot — so the
 * emitter reads as a fitting, not a bare glowing rectangle. `y` is the ceiling face; the housing occupies
 * y + 0.02 .. y + 0.10 (inside a 0.12 slab's channel). axis = along direction, at = centre across.
 */
export function impFixture(kit, o) {
  const { axis, at, c0, c1, y, width = 0.5, mat = MAT.diffuser, fins = true, stripW = 0.14, finEvery = 0.15 } = o;
  const black = col("impBlack");
  const dark = col("impDark");
  const mm = (a0, a1, yy0, yy1, cross0, cross1) => (axis === "x" ? [[a0, yy0, cross0], [a1, yy1, cross1]] : [[cross0, yy0, a0], [cross1, yy1, a1]]);
  const put = (m, a, b, c, d, e, f, opts) => {
    const [mn, mx] = mm(a, b, c, d, e, f);
    kit.boxMM(m, mn, mx, opts);
  };
  const hw = width / 2;
  const hb = y + 0.02;
  const ht = y + 0.1;
  put(MAT.dark, c0, c1, hb, ht, at - hw, at - hw + 0.04, { color: dark, texel: 1 });
  put(MAT.dark, c0, c1, hb, ht, at + hw - 0.04, at + hw, { color: dark, texel: 1 });
  put(MAT.dark, c0, c0 + 0.04, hb, ht, at - hw, at + hw, { color: dark, texel: 1 });
  put(MAT.dark, c1 - 0.04, c1, hb, ht, at - hw, at + hw, { color: dark, texel: 1 });
  put(MAT.dark, c0 + 0.04, c1 - 0.04, ht - 0.02, ht - 0.005, at - hw + 0.04, at + hw - 0.04, { color: black, texel: 1 });
  put(mat, c0 + 0.08, c1 - 0.08, ht - 0.04, ht - 0.02, at - stripW / 2, at + stripW / 2, { uv: "keep" });
  // dark reflector cheeks either side of the strip (they catch the glow and shade it toward the edges)
  put(MAT.dark, c0 + 0.04, c1 - 0.04, ht - 0.045, ht - 0.02, at - hw + 0.04, at - stripW / 2 - 0.02, { color: col("impMid"), texel: 1 });
  put(MAT.dark, c0 + 0.04, c1 - 0.04, ht - 0.045, ht - 0.02, at + stripW / 2 + 0.02, at + hw - 0.04, { color: col("impMid"), texel: 1 });
  if (fins) {
    for (let f = c0 + 0.1; f < c1 - 0.06; f += finEvery) put(MAT.dark, f - 0.004, f + 0.004, hb + 0.005, ht - 0.045, at - hw + 0.04, at + hw - 0.04, { color: black });
  }
}

/**
 * Structural rib: dark frame hugging floor, walls and ceiling, `depth` along the corridor, `proud` into
 * the room. axis = the corridor's along axis; at = rib centre on that axis; c0..c1 = inner wall faces
 * across; y0 = floor; h = ceiling face height above the floor.
 */
export function impRib(kit, o) {
  const { axis, at, c0, c1, y0, h, depth = 0.25, proud = 0.18, collide = true, tag = "rib", index = 0, indicator = true, accent = null } = o;
  // indicator colour: alternating blue/red by default; with an accent (corridor identity) the accent on
  // every rib but each fourth, which stays red
  const indMat = accent ? (index % 4 === 3 ? MAT.red : accent) : index % 2 === 0 ? MAT.blue : MAT.red;
  const dark = col("impDark");
  const black = col("impBlack");
  const mm = (a0, a1, yy0, yy1, cr0, cr1) => (axis === "x" ? [[a0, yy0, cr0], [a1, yy1, cr1]] : [[cr0, yy0, a0], [cr1, yy1, a1]]);
  const a0 = at - depth / 2;
  const a1 = at + depth / 2;
  const put = (mat, a, b, c, d, e, f, opts) => {
    const [mn, mx] = mm(a, b, c, d, e, f);
    kit.boxMM(mat, mn, mx, opts);
    return [mn, mx];
  };
  // posts
  const pL = put(MAT.dark, a0, a1, y0, y0 + h, c0, c0 + proud, { color: dark, texel: 1 });
  const pR = put(MAT.dark, a0, a1, y0, y0 + h, c1 - proud, c1, { color: dark, texel: 1 });
  // beam + floor plate
  put(MAT.dark, a0, a1, y0 + h - proud, y0 + h, c0, c1, { color: dark, texel: 1 });
  put(MAT.dark, a0, a1, y0, y0 + 0.012, c0, c1, { color: black, texel: 1 });
  // inner-face details: recessed black groove line + steel strip + indicator, bolts on the along faces
  for (const [cin, sgn] of [
    [c0 + proud, 1],
    [c1 - proud, -1],
  ]) {
    put(MAT.steel, at - 0.03, at + 0.03, y0 + 0.5, y0 + h - proud - 0.3, cin, cin + sgn * 0.015, { color: col("impGrey"), texel: 2 });
    if (indicator) put(indMat, at - 0.02, at + 0.02, y0 + 1.5, y0 + 1.58, cin, cin + sgn * 0.02);
    put(MAT.dark, a0 - 0.01, a1 + 0.01, y0 + 0.4, y0 + 0.46, cin - sgn * 0.02, cin + sgn * 0.01, { color: black });
  }
  for (const side of [a0, a1]) {
    for (const cc of [c0 + proud / 2, c1 - proud / 2]) {
      for (const yy of [y0 + 0.8, y0 + h - proud - 0.6]) {
        const p = axis === "x" ? [side, yy, cc] : [cc, yy, side];
        kit.cyl(MAT.steel, p[0], p[1], p[2], 0.022, 0.03, axis, { color: col("impGrey"), segments: 8 });
      }
    }
  }
  if (collide) {
    kit.collider(pL[0], pL[1], tag);
    kit.collider(pR[0], pR[1], tag);
  }
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Handrail at 1.02 m (§11). Axis-aligned run from a to b (world [x, z]); flat at floor height y0 or
 * sloped when y1 differs (stair flights — posts stay vertical, rails and infill follow the slope).
 *  wall: true  → steel tube on L-brackets with wall plates (wallSide = [dx, dz] toward the wall)
 *  wall: false → balustrade: square newel posts (with base plates and caps rising above the rail), top
 *                rail, mid rail, and `infill` "panel" (dark sheet 0.12..0.84 m) | "none"; kick plate
 */
export function impRail(kit, o) {
  const { a, b, y0, y1 = y0, height = 1.02, wall = true, wallSide = [0, 1], mid = true, infill = wall ? "none" : "panel", postEvery = 1.4, newel = 0.07, collide = true, tag = "rail" } = o;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const dy = y1 - y0;
  const L = Math.hypot(dx, dz);
  if (L < 0.05) return;
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z";
  const along = new THREE.Vector3(dx, dy, dz);
  const slopeLen = along.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, along.clone().normalize());
  const k = dy / L; // rise per horizontal metre
  const steel = col("impGrey");
  const dark = col("impDark");
  const black = col("impBlack");
  const at = (t, up = 0) => [a[0] + dx * t, y0 + dy * t + up, a[1] + dz * t];
  const tube = (r, up, len) => kit.add(MAT.steel, new THREE.CylinderGeometry(r, r, len, 10), { pos: at(0.5, up), quat: q, color: steel, uv: "scale", uvScale: [2 * Math.PI * r * 2, len * 2] });
  // a box lying along the run whose vertical edges stay vertical on a slope (sheared, not rotated)
  const shearedBox = (t0, t1, v0, v1, thick, mat, opts) => {
    const segL = L * (t1 - t0);
    if (segL < 0.03) return;
    const g = new THREE.BoxGeometry(axis === "x" ? segL : thick, v1 - v0, axis === "x" ? thick : segL);
    if (Math.abs(k) > 1e-6) {
      const m = new THREE.Matrix4();
      if (axis === "x") m.set(1, 0, 0, 0, k * Math.sign(dx), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      else m.set(1, 0, 0, 0, 0, 1, k * Math.sign(dz), 0, 0, 0, 1, 0, 0, 0, 0, 1);
      g.applyMatrix4(m); // positions sheared, normals via the normal matrix; kit.worldUVs needs them present
      g.computeVertexNormals();
    }
    kit.add(mat, g, { pos: at((t0 + t1) / 2, (v0 + v1) / 2), ...opts });
  };

  tube(0.024, height, slopeLen + (wall ? 0 : newel));
  if (mid) tube(0.014, height * 0.55, slopeLen - (wall ? 0.1 : newel));
  const n = Math.max(2, Math.round(L / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const [px, py, pz] = at(t);
    if (wall) {
      const wx = px + wallSide[0] * 0.045;
      const wz = pz + wallSide[1] * 0.045;
      kit.box(MAT.dark, wx, py + height - 0.035, wz, axis === "x" ? 0.045 : 0.11, 0.035, axis === "x" ? 0.11 : 0.045, { color: dark });
      kit.box(MAT.dark, px, py + height - 0.06, pz, 0.045, 0.07, 0.045, { color: dark });
      kit.box(MAT.dark, px + wallSide[0] * 0.095, py + height - 0.05, pz + wallSide[1] * 0.095, axis === "x" ? 0.09 : 0.02, 0.13, axis === "x" ? 0.02 : 0.09, { color: black });
    } else {
      kit.box(MAT.dark, px, py + (height + 0.09) / 2, pz, newel, height + 0.09, newel, { color: dark, texel: 2 });
      kit.box(MAT.dark, px, py + 0.02, pz, newel + 0.07, 0.04, newel + 0.07, { color: black });
      kit.box(MAT.dark, px, py + height + 0.105, pz, newel + 0.03, 0.03, newel + 0.03, { color: black });
      kit.box(MAT.steel, px, py + height + 0.125, pz, newel - 0.02, 0.01, newel - 0.02, { color: steel });
    }
  }
  if (!wall) {
    const tn = (newel / 2) / L;
    if (infill === "panel") {
      for (let i = 0; i < n - 1; i++) shearedBox(i / (n - 1) + tn, (i + 1) / (n - 1) - tn, 0.12, 0.84, 0.02, MAT.dark, { color: dark, texel: 1 });
    }
    shearedBox(tn, 1 - tn, 0, 0.1, 0.03, MAT.dark, { color: black, texel: 2 });
  }
  if (collide) {
    const hw = wall ? 0.08 : 0.06;
    kit.collider([Math.min(a[0], b[0]) - (axis === "x" ? 0 : hw), Math.min(y0, y1), Math.min(a[1], b[1]) - (axis === "x" ? hw : 0)], [Math.max(a[0], b[0]) + (axis === "x" ? 0 : hw), Math.max(y0, y1) + height + 0.1, Math.max(a[1], b[1]) + (axis === "x" ? hw : 0)], tag);
  }
}
