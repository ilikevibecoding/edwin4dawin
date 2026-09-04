// Shared shell builder for the four Deck 4 side bays (Agent D, subagent "bays").
// Closed volume: floor slab (dark reflective plating), ceiling slab with beams, light channels and
// louvred flood fixtures, four WALL_T walls just inside the bounds faces with clean rectangular door
// holes from doorOpening(). Imperial panelling: 2.4 × 1.2 m light-grey plates proud of a black slab
// (recessed black seams), darker plates only in short runs grouped per structural bay, a dark kick to
// 0.9 m, a blue-white light channel at waist height (1.02–1.08 m, routed up and over every door
// header), a dark structural band mid-height, a cornice. Frame ribs every 12 m, cable trays at 2.7 m,
// junction cabinets and sealed crew hatches at human height on request. Bay doors get the only hazard
// marking in the room: a black/yellow surround with red beacons. Everything is kit geometry.
import { rng } from "../../kit.js";
import { doorOpening, WALL_T, FRAME_W } from "../../systems/doors/helper.js";
import { YELLOW } from "./materials.js";
import { louvredFixture } from "./props.js";

export { WALL_T, FRAME_W, YELLOW };

// Shared wall datum heights (metres above the room floor)
export const KICK_H = 0.9; // dark kick plate
export const STRIP_Y = [1.02, 1.08]; // waist light strip (matches the 1.02 m rails)
export const CHANNEL_Y = [0.9, 1.2]; // black channel the strip sits in
export const LOW_TOP = 6.0; // 1.2 m rows below, 2.4 m rows above
export const TRAY_Y = 2.7; // cable tray underside

// ---------------------------------------------------------------------------
// Wall coordinate helper. A wall is the plane at `c` on `axis` ("x" | "z"); `inward` is the sign of the
// room-side normal; u runs along the other horizontal axis, v is world y, n is depth into the room
// measured from the bounds face (n = 0 on the face, n = WALL_T on the slab's inner surface).
// ---------------------------------------------------------------------------
export function makeWall(axis, c, inward, a0, a1, y0, y1) {
  return { axis, c, inward, a0, a1, y0, y1 };
}

export function wallMinMax(w, u0, u1, v0, v1, n0, n1) {
  const na = w.c + w.inward * Math.min(n0, n1);
  const nb = w.c + w.inward * Math.max(n0, n1);
  const nmin = Math.min(na, nb);
  const nmax = Math.max(na, nb);
  if (w.axis === "x") return [[nmin, v0, u0], [nmax, v1, u1]];
  return [[u0, v0, nmin], [u1, v1, nmax]];
}

export function wallBox(kit, mat, w, u0, u1, v0, v1, n0, n1, opts = {}) {
  if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4) return null;
  const [min, max] = wallMinMax(w, u0, u1, v0, v1, n0, n1);
  return kit.boxMM(mat, min, max, opts);
}

export function wallCollider(kit, w, u0, u1, v0, v1, n0, n1, tag = "wall") {
  const [min, max] = wallMinMax(w, u0, u1, v0, v1, n0, n1);
  kit.collider(min, max, tag);
}

// World point on a wall (u along, v up, n into the room)
export function wallPoint(w, u, v, n) {
  const d = w.c + w.inward * n;
  return w.axis === "x" ? [d, v, u] : [u, v, d];
}

// Cylinder along the wall (axis = along u) or along the wall normal
export function wallCyl(kit, mat, w, u0, u1, v, n, r, opts = {}) {
  const [a, b] = wallMinMax(w, u0, u1, v, v, n, n);
  const cx = (a[0] + b[0]) / 2;
  const cz = (a[2] + b[2]) / 2;
  kit.cyl(mat, cx, v, cz, r, u1 - u0, w.axis === "x" ? "z" : "x", opts);
}

// The four walls of an AABB, inward normals pointing into the volume.
export function wallsOf(bounds) {
  const { min, max } = bounds;
  return {
    west: makeWall("x", min[0], +1, min[2], max[2], min[1], max[1]), // x = min, room is +x
    east: makeWall("x", max[0], -1, min[2], max[2], min[1], max[1]), // x = max, room is -x
    fwd: makeWall("z", min[2], +1, min[0], max[0], min[1], max[1]), // z = min (bow side), room is +z
    aft: makeWall("z", max[2], -1, min[0], max[0], min[1], max[1]), // z = max, room is -z
  };
}

// Door openings that lie on this wall, as {u0,u1,v0,v1,door,open}
export function holesOn(wall, doors) {
  const out = [];
  for (const d of doors) {
    const onIt = wall.axis === "x" ? Math.abs(d.pos[0] - wall.c) < 1e-3 : Math.abs(d.pos[2] - wall.c) < 1e-3;
    if (!onIt) continue;
    const o = doorOpening(d);
    out.push({ u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1, door: d, open: o });
  }
  return out.sort((p, q) => p.u0 - q.u0);
}

// rect helpers ({u0,u1,v0,v1})
function intersects(a, b) {
  return a.u0 < b.u1 && a.u1 > b.u0 && a.v0 < b.v1 && a.v1 > b.v0;
}
/** rect minus cut rects -> list of rects (pieces smaller than minSize dropped) */
export function subtractRects(rect, cuts, minSize = 0.05) {
  let pieces = [rect];
  for (const c of cuts) {
    const next = [];
    for (const r of pieces) {
      if (!intersects(r, c)) {
        next.push(r);
        continue;
      }
      if (c.u0 > r.u0) next.push({ u0: r.u0, u1: c.u0, v0: r.v0, v1: r.v1 });
      if (c.u1 < r.u1) next.push({ u0: c.u1, u1: r.u1, v0: r.v0, v1: r.v1 });
      const mu0 = Math.max(r.u0, c.u0);
      const mu1 = Math.min(r.u1, c.u1);
      if (c.v0 > r.v0) next.push({ u0: mu0, u1: mu1, v0: r.v0, v1: c.v0 });
      if (c.v1 < r.v1) next.push({ u0: mu0, u1: mu1, v0: c.v1, v1: r.v1 });
    }
    pieces = next;
  }
  return pieces.filter((r) => r.u1 - r.u0 >= minSize && r.v1 - r.v0 >= minSize);
}

// holes expanded by the frame reveal (+margin), in wall-local u/v
function expandedHoles(wall, holes, margin) {
  return holes.map((h) => ({ u0: h.u0 - margin, u1: h.u1 + margin, v0: wall.y0, v1: h.v1 + margin }));
}

// ---------------------------------------------------------------------------
// Slab with rectangular holes (the structural wall + colliders). Slab occupies n 0..WALL_T.
// ---------------------------------------------------------------------------
export function wallSlab(kit, mat, wall, holes, opts, tag = "wall") {
  const pieces = [];
  let cursor = wall.a0;
  for (const h of holes) {
    if (h.u0 > cursor) pieces.push([cursor, h.u0, wall.y0, wall.y1]);
    if (h.v1 < wall.y1) pieces.push([h.u0, h.u1, h.v1, wall.y1]);
    if (h.v0 > wall.y0) pieces.push([h.u0, h.u1, wall.y0, h.v0]);
    cursor = Math.max(cursor, h.u1);
  }
  if (cursor < wall.a1) pieces.push([cursor, wall.a1, wall.y0, wall.y1]);
  for (const [u0, u1, v0, v1] of pieces) {
    if (u1 - u0 < 1e-3 || v1 - v0 < 1e-3) continue;
    wallBox(kit, mat, wall, u0, u1, v0, v1, 0, WALL_T, opts);
    // colliders only where the player can reach (skip the strip above a door)
    if (v0 <= wall.y0 + 2.5) wallCollider(kit, wall, u0, u1, v0, Math.min(v1, wall.y0 + 3.5), 0, WALL_T + 0.05, tag);
  }
}

// Pilaster positions (u) for a wall: every `spacing` m, skipped over door holes. Pure.
export function pilasterUs(wall, holes, opts = {}) {
  const { spacing = 12, width = 0.7 } = opts;
  const len = wall.a1 - wall.a0;
  const n = Math.max(1, Math.round(len / spacing));
  const out = [];
  for (let i = 1; i < n; i++) {
    const u = wall.a0 + (len * i) / n;
    if (holes.some((h) => u > h.u0 - width / 2 - 1.2 && u < h.u1 + width / 2 + 1.2)) continue;
    out.push(u);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Imperial panel field over the slab. Rows: kick (dark, 0–0.9), light channel (0.9–1.2, blue-white
// strip inside), four 1.2 m rows to 6 m, ~2.4 m rows above with one dark structural band, cornice.
// Columns 2.4 m. Panels are light-grey plates proud of the black slab with a 5 cm seam; darker
// (impMid) plates only as one-row runs per structural bay (≈ 4 % of cells), lighter (impWhite) plates
// as short runs in the lower rows; a vent grille in the first tall row of most bays. Holes are cut
// exactly (plus the frame reveal) so no plate straddles a door.
// ---------------------------------------------------------------------------
export function panelField(kit, wall, holes, P, opts = {}) {
  const {
    colW = 2.4,
    corniceH = 0.8,
    seed = 1,
    holeMargin = FRAME_W + 0.06,
    pilasters = [],
    panelMat = "impPanel",
    darkMat = "paintedMetal",
    stripMat = "emitWhite",
    darkRuns = 0.4,
    lightRuns = 0.45,
    vents = 0.6,
    stripCuts = [], // world-u ranges where tall props stand against the wall: the channel stays, the strip goes dark
  } = opts;
  const rand = rng(seed);
  const gap = 0.05;
  const stripSpans = (a, b) => {
    let spans = [[a, b]];
    for (const [c0, c1] of stripCuts) {
      const next = [];
      for (const [s0, s1] of spans) {
        if (c1 <= s0 || c0 >= s1) next.push([s0, s1]);
        else {
          if (c0 > s0) next.push([s0, c0]);
          if (c1 < s1) next.push([c1, s1]);
        }
      }
      spans = next;
    }
    return spans.filter(([s0, s1]) => s1 - s0 > 0.5);
  };
  const len = wall.a1 - wall.a0;
  const H = wall.y1 - wall.y0;
  const ex = expandedHoles(wall, holes, holeMargin).map((h) => ({ u0: h.u0 - wall.a0, u1: h.u1 - wall.a0, v0: 0, v1: h.v1 - wall.y0 }));

  // columns
  const nCols = Math.max(1, Math.round(len / colW));
  const uCuts = [];
  for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * len);

  // rows: [v0, v1, type, tallIndex?]
  const rows = [[0, KICK_H, "kick"], [CHANNEL_Y[0], CHANNEL_Y[1], "chan"]];
  const lowRows = 4;
  for (let i = 0; i < lowRows; i++) rows.push([CHANNEL_Y[1] + ((LOW_TOP - CHANNEL_Y[1]) * i) / lowRows, CHANNEL_Y[1] + ((LOW_TOP - CHANNEL_Y[1]) * (i + 1)) / lowRows, "panel", -1]);
  const top = H - corniceH;
  const bandH = 0.5;
  const span = top - LOW_TOP - bandH;
  const nTall = Math.max(2, Math.round(span / 2.4));
  const rowH = span / nTall;
  const bandAfter = Math.floor(nTall / 2);
  let y = LOW_TOP;
  for (let i = 0; i < nTall; i++) {
    rows.push([y, y + rowH, "panel", i]);
    y += rowH;
    if (i === bandAfter - 1) {
      rows.push([y, y + bandH, "band"]);
      y += bandH;
    }
  }
  rows.push([top, H, "cornice"]);
  const tallRows = rows.filter((r) => r[2] === "panel" && r[3] >= 0);
  const panelRows = rows.filter((r) => r[2] === "panel");

  // structural bays (between ribs) in local u
  const bayEdges = [0, ...pilasters.map((u) => u - wall.a0).sort((a, b) => a - b), len];
  const colCentre = (ci) => (uCuts[ci] + uCuts[ci + 1]) / 2;
  const colsIn = (s0, s1) => {
    const out = [];
    for (let ci = 0; ci < nCols; ci++) if (colCentre(ci) > s0 + 0.3 && colCentre(ci) < s1 - 0.3) out.push(ci);
    return out;
  };
  const dark = new Set();
  const light = new Set();
  const vent = new Set();
  const key = (ri, ci) => ri * 1000 + ci;
  for (let b = 0; b < bayEdges.length - 1; b++) {
    const cols = colsIn(bayEdges[b], bayEdges[b + 1]);
    if (!cols.length) continue;
    if (rand() < darkRuns && tallRows.length) {
      const row = tallRows[Math.floor(rand() * tallRows.length)];
      const ri = rows.indexOf(row);
      for (const ci of cols) dark.add(key(ri, ci));
    }
    if (rand() < vents && cols.length >= 2) {
      const ri = rows.indexOf(tallRows[0]);
      vent.add(key(ri, cols[Math.floor(cols.length / 2)]));
    }
  }
  for (const row of panelRows) {
    if (rand() > lightRuns) continue;
    const ri = rows.indexOf(row);
    const n = 3 + Math.floor(rand() * 3);
    const start = Math.floor(rand() * Math.max(1, nCols - n));
    for (let ci = start; ci < start + n && ci < nCols; ci++) if (!dark.has(key(ri, ci))) light.add(key(ri, ci));
  }

  const nGrey = P.impGrey;
  const nDark = P.impDark;
  const nBlack = P.impBlack;
  for (let ri = 0; ri < rows.length; ri++) {
    const [rv0, rv1, type] = rows[ri];
    if (type === "kick" || type === "band" || type === "cornice" || type === "chan") {
      // continuous rows (merged across columns), cut by the holes only
      for (const r of subtractRects({ u0: 0, u1: len, v0: rv0, v1: rv1 }, ex, 0.08)) {
        const U0 = wall.a0 + r.u0 + gap / 2;
        const U1 = wall.a0 + r.u1 - gap / 2;
        const V0 = wall.y0 + r.v0 + (type === "kick" ? 0 : gap / 2);
        const V1 = wall.y0 + r.v1 - gap / 2;
        if (type === "kick") wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.09, { color: nDark, texel: 1.2 });
        else if (type === "cornice") wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.12, { color: nDark, texel: 1 });
        else if (type === "band") {
          wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.3, { color: nDark, texel: 1 });
          for (let u = U0 + 1; u < U1 - 0.5; u += 2.4) wallBox(kit, "metal", wall, u - 0.08, u + 0.08, V0 + 0.15, V0 + 0.32, WALL_T + 0.3, WALL_T + 0.35, { color: nGrey });
        } else {
          // light channel: black recess with the blue-white strip inside
          wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.05, { color: nBlack, texel: 1 });
          for (const [s0, s1] of stripSpans(U0 + 0.12, U1 - 0.12)) wallBox(kit, stripMat, wall, s0, s1, wall.y0 + STRIP_Y[0], wall.y0 + STRIP_Y[1], WALL_T + 0.05, WALL_T + 0.075, { uv: "keep" });
        }
      }
      continue;
    }
    for (let ci = 0; ci < nCols; ci++) {
      const cell = { u0: uCuts[ci], u1: uCuts[ci + 1], v0: rv0, v1: rv1 };
      const pieces = subtractRects(cell, ex, 0.12);
      const full = pieces.length === 1 && pieces[0].u1 - pieces[0].u0 > cell.u1 - cell.u0 - 0.01 && pieces[0].v1 - pieces[0].v0 > rv1 - rv0 - 0.01;
      const k = key(ri, ci);
      const col = dark.has(k) ? P.impMid : light.has(k) ? P.impWhite : nGrey;
      for (const r of pieces) {
        const U0 = wall.a0 + r.u0 + gap / 2;
        const U1 = wall.a0 + r.u1 - gap / 2;
        const V0 = wall.y0 + r.v0 + gap / 2;
        const V1 = wall.y0 + r.v1 - gap / 2;
        if (full && vent.has(k)) {
          // vent grille: dark recess with horizontal slats, framed by the plate above and below
          wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.03, { color: nBlack, texel: 1 });
          const ch = V1 - V0;
          const slats = Math.max(4, Math.floor((ch - 0.7) / 0.3));
          for (let s = 0; s < slats; s++) {
            const sv = V0 + 0.4 + ((ch - 0.8) * s) / (slats - 1);
            wallBox(kit, "metal", wall, U0 + 0.3, U1 - 0.3, sv - 0.045, sv + 0.045, WALL_T + 0.02, WALL_T + 0.12, { color: nGrey, texel: 1.5 });
          }
          wallBox(kit, panelMat, wall, U0, U1, V0, V0 + 0.25, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
          wallBox(kit, panelMat, wall, U0, U1, V1 - 0.25, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
          wallBox(kit, panelMat, wall, U0, U0 + 0.2, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
          wallBox(kit, panelMat, wall, U1 - 0.2, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
          continue;
        }
        wallBox(kit, panelMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Frame ribs: dark structural ribs full height at the given u positions (see pilasterUs). Light-grey
// side flanges and a centre inset so they read as a profile; a plinth to 1.6 m with a single blue lens.
// ---------------------------------------------------------------------------
export function pilasters(kit, wall, us, P, opts = {}) {
  const { width = 0.7, depth = 0.45, tag = "pilaster", light = true } = opts;
  for (const u of us) {
    const u0 = u - width / 2;
    const u1 = u + width / 2;
    wallBox(kit, "paintedMetal", wall, u0, u1, wall.y0, wall.y1 - 0.02, WALL_T, WALL_T + depth, { color: P.impDark, texel: 1 });
    for (const s of [-1, 1]) wallBox(kit, "paintedMetal", wall, u + s * (width / 2 + 0.12) - 0.12, u + s * (width / 2 + 0.12) + 0.12, wall.y0, wall.y1 - 0.02, WALL_T + 0.06, WALL_T + depth - 0.15, { color: P.impMid, texel: 1 });
    wallBox(kit, "impPanel", wall, u - 0.2, u + 0.2, wall.y0 + 2.0, wall.y1 - 0.8, WALL_T + depth, WALL_T + depth + 0.05, { color: P.impMid, uv: "keep" });
    // plinth with a single lens
    wallBox(kit, "paintedMetal", wall, u0 - 0.25, u1 + 0.25, wall.y0, wall.y0 + 1.6, WALL_T, WALL_T + depth + 0.1, { color: P.impDark, texel: 1 });
    if (light) {
      wallBox(kit, "paintedMetal", wall, u - 0.14, u + 0.14, wall.y0 + 1.62, wall.y0 + 1.92, WALL_T + depth, WALL_T + depth + 0.08, { color: P.impBlack, texel: 2 });
      wallBox(kit, "emitBlue", wall, u - 0.07, u + 0.07, wall.y0 + 1.7, wall.y0 + 1.84, WALL_T + depth + 0.08, WALL_T + depth + 0.1);
    }
    wallCollider(kit, wall, u0 - 0.25, u1 + 0.25, wall.y0, wall.y0 + 3, WALL_T, WALL_T + depth + 0.1, tag);
  }
  return us;
}

// ---------------------------------------------------------------------------
// Door surrounds (outside the FRAME_W reveal the doors system owns). The waist light strip is routed
// up each side and over the header so it never dies into a frame.
// bay: black/yellow band + lintel + pylons + red beacons + amber sign, lit portal strip.
// standard/blast/hatch: dark frame band with the strip routed over it + a blue status lamp.
// ---------------------------------------------------------------------------
export function doorSurrounds(kit, wall, holes, P, opts = {}) {
  const { stripMat = "emitWhite" } = opts;
  const beacons = [];
  const y0 = wall.y0;
  for (const h of holes) {
    const kind = h.door.kind;
    const inner = FRAME_W + 0.04;
    if (kind === "bay") {
      const band = 0.7;
      const n1 = WALL_T + 0.16;
      const bandTop = h.v1 + inner + band;
      // dark jambs + header; black/yellow only on the lower 2.4 m of each jamb (sparse, at eye level)
      const hz = 2.4;
      for (const [ja, jb] of [[h.u0 - inner - band, h.u0 - inner], [h.u1 + inner, h.u1 + inner + band]]) {
        wallBox(kit, "hazardImp", wall, ja, jb, y0, y0 + hz, WALL_T, n1, { texel: 0.4 });
        wallBox(kit, "paintedMetal", wall, ja, jb, y0 + hz, bandTop, WALL_T, n1, { color: P.impDark, texel: 1 });
      }
      wallBox(kit, "paintedMetal", wall, h.u0 - inner, h.u1 + inner, h.v1 + inner, bandTop, WALL_T, n1, { color: P.impDark, texel: 1 });
      wallBox(kit, "emitAmber", wall, h.u0 - inner + 0.3, h.u1 + inner - 0.3, h.v1 + inner + 0.3, h.v1 + inner + 0.38, n1, n1 + 0.02, { uv: "keep" });
      // heavy lintel above the band + pylons either side (proud 0.55), a lit strip runs up and over
      const pu0 = h.u0 - inner - band - 0.6;
      const pu1 = h.u1 + inner + band + 0.6;
      wallBox(kit, "paintedMetal", wall, pu0, pu1, bandTop, bandTop + 1.1, WALL_T, WALL_T + 0.55, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, pu0, pu1, bandTop + 0.3, bandTop + 0.6, WALL_T + 0.55, WALL_T + 0.6, { color: P.impBlack, texel: 1 });
      // sign plate (dark) with an amber id bar
      const cu = (h.u0 + h.u1) / 2;
      wallBox(kit, "paintedMetal", wall, cu - 1.6, cu + 1.6, bandTop + 1.25, bandTop + 2.05, WALL_T, WALL_T + 0.12, { color: P.impBlack, texel: 1 });
      wallBox(kit, "emitAmber", wall, cu - 1.4, cu + 1.4, bandTop + 1.5, bandTop + 1.8, WALL_T + 0.12, WALL_T + 0.14);
      for (const [ua, ub] of [[pu0, pu0 + 0.6], [pu1 - 0.6, pu1]]) {
        wallBox(kit, "paintedMetal", wall, ua, ub, y0, bandTop + 1.1, WALL_T, WALL_T + 0.55, { color: P.impDark, texel: 1 });
        wallCollider(kit, wall, ua, ub, y0, y0 + 3, WALL_T, WALL_T + 0.55, "door-pylon");
        // red beacon at 2/3 height
        const bu = (ua + ub) / 2;
        const bv = h.v1 * 0.72 + y0 * 0.28;
        wallBox(kit, "paintedMetal", wall, bu - 0.18, bu + 0.18, bv - 0.18, bv + 0.18, WALL_T + 0.55, WALL_T + 0.7, { color: P.impBlack, texel: 2 });
        wallBox(kit, "emitRedImp", wall, bu - 0.12, bu + 0.12, bv - 0.12, bv + 0.12, WALL_T + 0.7, WALL_T + 0.78);
        beacons.push(wallPoint(wall, bu, bv, WALL_T + 0.9));
        // routed strip up the pylon (outer third of its face)
        const su = ua === pu0 ? ua + 0.15 : ub - 0.15;
        wallBox(kit, stripMat, wall, su - 0.03, su + 0.03, y0 + STRIP_Y[0], bandTop + 1.0, WALL_T + 0.55, WALL_T + 0.575, { uv: "keep" });
      }
      // strip across the lintel face (joins the two pylon strips)
      wallBox(kit, stripMat, wall, pu0 + 0.12, pu1 - 0.12, bandTop + 0.97, bandTop + 1.03, WALL_T + 0.55, WALL_T + 0.575, { uv: "keep" });
      // beacons on the lintel corners
      for (const bu of [h.u0 - inner - band / 2, h.u1 + inner + band / 2]) {
        const bv = bandTop + 0.55;
        wallBox(kit, "paintedMetal", wall, bu - 0.22, bu + 0.22, bv - 0.16, bv + 0.16, WALL_T + 0.55, WALL_T + 0.75, { color: P.impBlack, texel: 2 });
        wallBox(kit, "emitRedImp", wall, bu - 0.14, bu + 0.14, bv - 0.1, bv + 0.1, WALL_T + 0.75, WALL_T + 0.85);
        beacons.push(wallPoint(wall, bu, bv, WALL_T + 1.0));
      }
      // floor threshold: black/yellow strip on our side
      const [tmin, tmax] = wallMinMax(wall, h.u0 - inner, h.u1 + inner, y0 + 0.006, y0 + 0.02, WALL_T, WALL_T + 1.0);
      kit.boxMM("hazardImp", tmin, tmax, { texel: 0.5 });
    } else {
      const band = 0.3;
      const n1 = WALL_T + 0.14;
      const bandTop = h.v1 + inner + band;
      wallBox(kit, "paintedMetal", wall, h.u0 - inner - band, h.u0 - inner, y0, bandTop, WALL_T, n1, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, h.u1 + inner, h.u1 + inner + band, y0, bandTop, WALL_T, n1, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, h.u0 - inner, h.u1 + inner, h.v1 + inner, bandTop, WALL_T, n1, { color: P.impDark, texel: 1 });
      // routed waist strip: up both jambs and across the header, on the band face
      for (const su of [h.u0 - inner - band / 2, h.u1 + inner + band / 2]) wallBox(kit, stripMat, wall, su - 0.03, su + 0.03, y0 + STRIP_Y[0], bandTop - 0.12, n1, n1 + 0.025, { uv: "keep" });
      wallBox(kit, stripMat, wall, h.u0 - inner - band / 2 - 0.03, h.u1 + inner + band / 2 + 0.03, bandTop - 0.18, bandTop - 0.12, n1, n1 + 0.025, { uv: "keep" });
      // status lamp above the door
      const cu = (h.u0 + h.u1) / 2;
      wallBox(kit, "paintedMetal", wall, cu - 0.5, cu + 0.5, bandTop + 0.08, bandTop + 0.4, WALL_T, WALL_T + 0.1, { color: P.impBlack, texel: 2 });
      wallBox(kit, "emitBlue", wall, cu - 0.35, cu + 0.35, bandTop + 0.18, bandTop + 0.3, WALL_T + 0.1, WALL_T + 0.12);
      wallCollider(kit, wall, h.u0 - inner - band, h.u0 - inner, y0, y0 + 3, WALL_T, n1, "door-jamb");
      wallCollider(kit, wall, h.u1 + inner, h.u1 + inner + band, y0, y0 + 3, WALL_T, n1, "door-jamb");
    }
  }
  return beacons;
}

// ---------------------------------------------------------------------------
// Cable tray at TRAY_Y along the wall with two dark pipes above it (flanged, thin amber bands),
// interrupted by door surrounds (terminating in junction boxes) and by the frame ribs.
// ---------------------------------------------------------------------------
export function wallServices(kit, wall, holes, P, opts = {}) {
  const { v: trayH = TRAY_Y, margin = 1.2, pilasters = [], endBoxes = true } = opts;
  const v = wall.y0 + trayH; // opts.v is the tray height above the room floor
  let spans = [[wall.a0 + margin, wall.a1 - margin]];
  const cut = (c0, c1) => {
    const next = [];
    for (const [a, b] of spans) {
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    spans = next;
  };
  const doorCuts = [];
  for (const h of holes) {
    if (h.v1 + 0.6 < v) continue;
    const pad = h.door.kind === "bay" ? 1.9 : 1.1;
    cut(h.u0 - pad, h.u1 + pad);
    doorCuts.push([h.u0 - pad, h.u1 + pad]);
  }
  for (const u of pilasters) cut(u - 0.8, u + 0.8);
  const n0 = WALL_T + 0.25;
  for (const [a, b] of spans) {
    if (b - a < 2) continue;
    // tray: bottom plate + back + front lip
    wallBox(kit, "paintedMetal", wall, a, b, v, v + 0.04, n0, n0 + 0.5, { color: P.impDark, texel: 1 });
    wallBox(kit, "paintedMetal", wall, a, b, v + 0.04, v + 0.26, n0, n0 + 0.03, { color: P.impDark, texel: 1 });
    wallBox(kit, "paintedMetal", wall, a, b, v + 0.04, v + 0.26, n0 + 0.47, n0 + 0.5, { color: P.impDark, texel: 1 });
    for (const [dn, r, col] of [[0.1, 0.035, P.impBlack], [0.2, 0.03, P.impMid], [0.3, 0.04, P.impBlack], [0.4, 0.025, P.impBlue]]) {
      const [mn, mx] = wallMinMax(wall, a + 0.05, b - 0.05, v + 0.04, v + 0.04 + 2 * r, n0 + dn - r, n0 + dn + r);
      kit.boxMM("paintedMetal", mn, mx, { color: col, texel: 2 });
    }
    // pipes above the tray: a dark main with flanges + amber bands, a thinner black line
    wallCyl(kit, "paintedMetal", wall, a, b, v + 0.72, n0 + 0.2, 0.11, { color: P.impDark, segments: 12 });
    wallCyl(kit, "paintedMetal", wall, a, b, v + 0.98, n0 + 0.14, 0.065, { color: P.impBlack, segments: 10 });
    for (let u = a + 1.0; u < b - 0.4; u += 6) {
      wallCyl(kit, "paintedMetal", wall, u - 0.06, u + 0.06, v + 0.72, n0 + 0.2, 0.15, { color: P.impBlack, segments: 12 });
      wallCyl(kit, "emitAmber", wall, u + 0.14, u + 0.18, v + 0.72, n0 + 0.2, 0.115, { segments: 12 });
      // bracket: vertical bar on the wall + arm under the tray
      wallBox(kit, "paintedMetal", wall, u - 0.06, u + 0.06, v - 0.12, v + 1.15, WALL_T + 0.06, WALL_T + 0.2, { color: P.impBlack, texel: 2 });
      wallBox(kit, "paintedMetal", wall, u - 0.06, u + 0.06, v - 0.08, v, WALL_T + 0.06, n0 + 0.5, { color: P.impBlack, texel: 2 });
    }
  }
  if (endBoxes) {
    // junction boxes where the tray stops at a door
    for (const [c0, c1] of doorCuts) {
      for (const u of [c0, c1]) {
        if (u - 0.3 < wall.a0 + margin || u + 0.3 > wall.a1 - margin) continue;
        wallBox(kit, "paintedMetal", wall, u - 0.3, u + 0.3, v - 0.1, v + 0.6, WALL_T + 0.06, WALL_T + 0.6, { color: P.impBlack, texel: 2 });
        wallBox(kit, "emitBlue", wall, u - 0.12, u - 0.04, v + 0.42, v + 0.48, WALL_T + 0.6, WALL_T + 0.62);
        wallBox(kit, "emitRedImp", wall, u + 0.04, u + 0.12, v + 0.42, v + 0.48, WALL_T + 0.6, WALL_T + 0.62);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Wall gear at human height (rooms call these where the wall is free of props).
// ---------------------------------------------------------------------------
// Junction cabinet 0.8 × 0.9 at 1.3–2.2 m with conduit up to the tray and down to the kick.
export function wallJunction(kit, wall, u, P, opts = {}) {
  const { w = 0.8, v0 = 1.3, v1 = 2.2 } = opts;
  const y0 = wall.y0;
  wallBox(kit, "paintedMetal", wall, u - w / 2, u + w / 2, y0 + v0, y0 + v1, WALL_T + 0.06, WALL_T + 0.3, { color: P.impBlack, texel: 2 });
  wallBox(kit, "paintedMetal", wall, u - w / 2 + 0.06, u + w / 2 - 0.06, y0 + v0 + 0.06, y0 + v1 - 0.22, WALL_T + 0.3, WALL_T + 0.32, { color: P.impDark, texel: 2 });
  wallBox(kit, "impPanel", wall, u - 0.2, u + 0.2, y0 + v1 - 0.17, y0 + v1 - 0.06, WALL_T + 0.3, WALL_T + 0.315, { color: P.impGrey, uv: "keep" });
  wallBox(kit, "emitBlue", wall, u + w / 2 - 0.22, u + w / 2 - 0.14, y0 + v1 - 0.15, y0 + v1 - 0.08, WALL_T + 0.3, WALL_T + 0.32);
  wallBox(kit, "emitRedImp", wall, u + w / 2 - 0.36, u + w / 2 - 0.28, y0 + v1 - 0.15, y0 + v1 - 0.08, WALL_T + 0.3, WALL_T + 0.32);
  // conduits: up to the tray, down to the kick
  const [a, b] = wallMinMax(wall, u - 0.15, u - 0.15, y0 + v1, y0 + TRAY_Y, WALL_T + 0.18, WALL_T + 0.18);
  kit.cyl("metal", (a[0] + b[0]) / 2, (y0 + v1 + y0 + TRAY_Y) / 2, (a[2] + b[2]) / 2, 0.035, TRAY_Y - v1, "y", { color: P.impGrey, segments: 8 });
  const [c, d] = wallMinMax(wall, u + 0.15, u + 0.15, y0 + KICK_H, y0 + v0, WALL_T + 0.18, WALL_T + 0.18);
  kit.cyl("metal", (c[0] + d[0]) / 2, (y0 + KICK_H + y0 + v0) / 2, (c[2] + d[2]) / 2, 0.035, v0 - KICK_H, "y", { color: P.impGrey, segments: 8 });
}

// Sealed personnel hatch: framed 1.3 × 2.2 recess with a centre seam, a red "sealed" lens and a sign.
export function crewHatch(kit, wall, u, P, opts = {}) {
  const { w = 1.3, h = 2.2 } = opts;
  const y0 = wall.y0;
  wallBox(kit, "paintedMetal", wall, u - w / 2 - 0.2, u + w / 2 + 0.2, y0, y0 + h + 0.3, WALL_T + 0.06, WALL_T + 0.18, { color: P.impDark, texel: 1 });
  wallBox(kit, "paintedMetal", wall, u - w / 2, u + w / 2, y0 + 0.04, y0 + h, WALL_T + 0.06, WALL_T + 0.09, { color: P.impBlack, texel: 1 });
  wallBox(kit, "paintedMetal", wall, u - 0.015, u + 0.015, y0 + 0.04, y0 + h, WALL_T + 0.09, WALL_T + 0.1, { color: P.impMid, texel: 2 });
  wallBox(kit, "paintedMetal", wall, u - w / 2, u + w / 2, y0 + 1.06, y0 + 1.1, WALL_T + 0.09, WALL_T + 0.1, { color: P.impMid, texel: 2 });
  // control plate beside the leaf + sealed lens above
  wallBox(kit, "paintedMetal", wall, u + w / 2 + 0.04, u + w / 2 + 0.18, y0 + 1.15, y0 + 1.45, WALL_T + 0.18, WALL_T + 0.22, { color: P.impBlack, texel: 2 });
  wallBox(kit, "emitRedImp", wall, u + w / 2 + 0.08, u + w / 2 + 0.14, y0 + 1.34, y0 + 1.4, WALL_T + 0.22, WALL_T + 0.23);
  wallBox(kit, "paintedMetal", wall, u - 0.25, u + 0.25, y0 + h + 0.06, y0 + h + 0.24, WALL_T + 0.18, WALL_T + 0.22, { color: P.impBlack, texel: 2 });
  wallBox(kit, "emitRedImp", wall, u - 0.16, u + 0.16, y0 + h + 0.12, y0 + h + 0.18, WALL_T + 0.22, WALL_T + 0.23);
  // the frame is proud 0.18 — inside the wall collider's 0.21 skin, so no extra collider
}

// ---------------------------------------------------------------------------
// Floor: dark reflective slab + recessed plate seams. Markings are per room.
// ---------------------------------------------------------------------------
export function floorSlab(kit, bounds, P, opts = {}) {
  const { color = 0x4a4e55, texel = 0.5, plate = 6, seamColor = P.impBlack } = opts;
  const { min, max } = bounds;
  const y = min[1];
  kit.boxMM("bayFloor", [min[0], y - 0.12, min[2]], [max[0], y, max[2]], { color, texel });
  const nx = Math.round((max[0] - min[0]) / plate);
  const nz = Math.round((max[2] - min[2]) / plate);
  for (let i = 1; i < nx; i++) {
    const x = min[0] + ((max[0] - min[0]) * i) / nx;
    kit.boxMM("paintedMetal", [x - 0.025, y + 0.001, min[2] + WALL_T], [x + 0.025, y + 0.005, max[2] - WALL_T], { color: seamColor, texel: 1 });
  }
  for (let i = 1; i < nz; i++) {
    const z = min[2] + ((max[2] - min[2]) * i) / nz;
    kit.boxMM("paintedMetal", [min[0] + WALL_T, y + 0.001, z - 0.025], [max[0] - WALL_T, y + 0.005, z + 0.025], { color: seamColor, texel: 1 });
  }
}

// Painted floor line/rect (proud 1.4 cm so it never fights the deck). Material `painted` keeps wear.
export function floorMark(kit, x0, z0, x1, z1, y, color, opts = {}) {
  const { h = 0.014, mat = "painted" } = opts;
  kit.boxMM(mat, [Math.min(x0, x1), y + 0.006, Math.min(z0, z1)], [Math.max(x0, x1), y + 0.006 + h, Math.max(z0, z1)], { color, texel: 1, ...opts.kit });
}

// Rectangle outline in paint
export function floorRect(kit, x0, z0, x1, z1, y, color, w = 0.15, opts = {}) {
  floorMark(kit, x0, z0, x1, z0 + w, y, color, opts);
  floorMark(kit, x0, z1 - w, x1, z1, y, color, opts);
  floorMark(kit, x0, z0, x0 + w, z1, y, color, opts);
  floorMark(kit, x1 - w, z0, x1, z1, y, color, opts);
}

// Dashed line between two points (axis aligned)
export function floorDashes(kit, x0, z0, x1, z1, y, color, opts = {}) {
  const { w = 0.15, dash = 1.2, gapLen = 0.8 } = opts;
  const L = Math.hypot(x1 - x0, z1 - z0);
  const dx = (x1 - x0) / L;
  const dz = (z1 - z0) / L;
  for (let s = 0; s < L; s += dash + gapLen) {
    const e = Math.min(L, s + dash);
    const ax = x0 + dx * s;
    const az = z0 + dz * s;
    const bx = x0 + dx * e;
    const bz = z0 + dz * e;
    if (Math.abs(dx) > 0.5) floorMark(kit, ax, az - w / 2, bx, bz + w / 2, y, color, opts);
    else floorMark(kit, ax - w / 2, az, bx + w / 2, bz, y, color, opts);
  }
}

// Corner brackets (L marks) for a footprint x0..x1 × z0..z1
export function floorCorners(kit, x0, z0, x1, z1, y, color, len = 1.6, w = 0.18) {
  for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const cx = sx ? x1 : x0;
    const cz = sz ? z1 : z0;
    const dx = sx ? -1 : 1;
    const dz = sz ? -1 : 1;
    floorMark(kit, cx, cz, cx + dx * len, cz + dz * w, y, color);
    floorMark(kit, cx, cz, cx + dx * w, cz + dz * len, y, color);
  }
}

// ---------------------------------------------------------------------------
// Ceiling: slab, cross beams, light-grey panels between the beams with faint emissive light channels
// along the beams (so the plane reads instead of a void), louvred flood fixtures in rows. Returns
// fixture centres so the room can hang point/spot descriptors under them.
// ---------------------------------------------------------------------------
export function ceiling(kit, bounds, P, opts = {}) {
  const { min, max } = bounds;
  const y = max[1];
  const { beamAxis = "x", beamSpacing = 10, beamDepth = 1.2, beamW = 0.6, fixtureRows = 2, fixturesPerRow = 4, fixtureLen = 7, fixtureW = 1.0, color = P.impDark, floodMat = "emitWhite" } = opts;
  kit.boxMM("paintedMetal", [min[0], y - 0.12, min[2]], [max[0], y, max[2]], { color, texel: 0.5 });
  const long = beamAxis === "x" ? "z" : "x";
  const L = long === "z" ? max[2] - min[2] : max[0] - min[0];
  const nB = Math.round(L / beamSpacing);
  const a0 = (long === "z" ? min[0] : min[2]) + WALL_T;
  const a1 = (long === "z" ? max[0] : max[2]) - WALL_T;
  for (let i = 1; i < nB; i++) {
    const t = (long === "z" ? min[2] : min[0]) + (L * i) / nB;
    if (beamAxis === "x") kit.boxMM("paintedMetal", [a0, y - beamDepth, t - beamW / 2], [a1, y - 0.12, t + beamW / 2], { color: P.impDark, texel: 1 });
    else kit.boxMM("paintedMetal", [t - beamW / 2, y - beamDepth, a0], [t + beamW / 2, y - 0.12, a1], { color: P.impDark, texel: 1 });
  }
  // panels between beams (light grey, three plates across) + light channels hugging each beam
  for (let i = 0; i < nB; i++) {
    const t0 = (long === "z" ? min[2] : min[0]) + (L * i) / nB + beamW / 2 + 0.1;
    const t1 = (long === "z" ? min[2] : min[0]) + (L * (i + 1)) / nB - beamW / 2 - 0.1;
    for (let k = 0; k < 3; k++) {
      const p0 = a0 + 0.5 + ((a1 - a0 - 1.0) * k) / 3 + 0.08;
      const p1 = a0 + 0.5 + ((a1 - a0 - 1.0) * (k + 1)) / 3 - 0.08;
      if (long === "z") kit.boxMM("impPanel", [p0, y - 0.22, t0 + 0.3], [p1, y - 0.12, t1 - 0.3], { color: P.impGrey, uv: "keep" });
      else kit.boxMM("impPanel", [t0 + 0.3, y - 0.22, p0], [t1 - 0.3, y - 0.12, p1], { color: P.impGrey, uv: "keep" });
    }
    for (const t of [t0 + 0.1, t1 - 0.1]) {
      if (long === "z") kit.boxMM("emitCeil", [a0 + 0.8, y - 0.24, t - 0.09], [a1 - 0.8, y - 0.2, t + 0.09], { uv: "keep" });
      else kit.boxMM("emitCeil", [t - 0.09, y - 0.24, a0 + 0.8], [t + 0.09, y - 0.2, a1 - 0.8], { uv: "keep" });
    }
  }
  // flood fixtures: rows along the long axis, hung under the beam line on rods
  const fixtures = [];
  const across0 = long === "z" ? min[0] : min[2];
  const across1 = long === "z" ? max[0] : max[2];
  for (let r = 0; r < fixtureRows; r++) {
    const a = across0 + ((across1 - across0) * (r + 0.5)) / fixtureRows;
    for (let f = 0; f < fixturesPerRow; f++) {
      const t = (long === "z" ? min[2] : min[0]) + (L * (f + 0.5)) / fixturesPerRow;
      const cy = y - beamDepth - 0.35;
      const [fx, fz] = long === "z" ? [a, t] : [t, a];
      louvredFixture(kit, P, fx, cy, fz, fixtureLen, fixtureW, long, floodMat, { depth: 0.3 });
      for (const d of [-fixtureLen / 2 + 0.4, fixtureLen / 2 - 0.4]) {
        const [hx, hz] = long === "z" ? [fx, fz + d] : [fx + d, fz];
        kit.box("metal", hx, (cy + 0.3 + y - 0.12) / 2, hz, 0.08, y - 0.12 - cy - 0.3, 0.08, { color: P.impGrey });
      }
      fixtures.push([fx, cy - 0.05, fz]);
    }
  }
  return fixtures;
}

// ---------------------------------------------------------------------------
// Whole shell in one call. Returns { walls, holes, beacons, fixtures, pilasters }.
// ---------------------------------------------------------------------------
export function buildShell(ctx, spec) {
  const { kit, PALETTE: P } = ctx;
  const { bounds, doors, seed = 7 } = spec;
  const walls = wallsOf(bounds);
  const holes = {};
  const pil = {};
  const beacons = [];
  floorSlab(kit, bounds, P, spec.floor || {});
  let i = 0;
  for (const [name, w] of Object.entries(walls)) {
    const hs = holesOn(w, doors);
    holes[name] = hs;
    const us = pilasterUs(w, hs, { spacing: 12, ...(spec.pilasters || {}) });
    pil[name] = us;
    wallSlab(kit, "paintedMetal", w, hs, { color: P.impBlack, texel: 0.5 }, "wall");
    // panelsPerWall: { east: { stripCuts: [[u0, u1]] } } for walls with racking / lockers against them
    panelField(kit, w, hs, P, { seed: seed * 17 + i * 101, pilasters: us, ...(spec.panels || {}), ...((spec.panelsPerWall || {})[name] || {}) });
    pilasters(kit, w, us, P, spec.pilasters || {});
    beacons.push(...doorSurrounds(kit, w, hs, P));
    if (spec.services !== false) {
      // services.perWall: { west: false | { v: 3.4 } } skips or retunes one wall (e.g. a platform runs along it)
      const { perWall = {}, ...svc } = spec.services || {};
      const pw = perWall[name];
      if (pw !== false) wallServices(kit, w, hs, P, { pilasters: us, ...svc, ...(pw || {}) });
    }
    i++;
  }
  const fixtures = ceiling(kit, bounds, P, spec.ceiling || {});
  return { walls, holes, beacons, fixtures, pilasters: pil };
}
