// Shared shell builder for the four Deck 4 side bays (Agent D, subagent "bays").
// Closed volume: floor slab, ceiling slab, four WALL_T walls just inside the bounds faces with clean
// rectangular door holes from doorOpening(), Imperial panelling (light panels over a black seam
// backing), kick plates, pilasters, a blue-white strip at head height, a cornice, ceiling beams and
// flood fixtures. Bay doors get a black/yellow hazard surround with red beacons; standard doors a
// heavy dark frame with a status lamp. Everything is kit geometry (merged per material).
import { rng } from "../../kit.js";
import { doorOpening, WALL_T, FRAME_W } from "../../systems/doors/helper.js";

export { WALL_T, FRAME_W };

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

// ---------------------------------------------------------------------------
// Imperial panel field over the slab. Panels are light `impPanel` plates proud of the black slab with
// a 5 cm seam; rows: kick, waist panel, blue-white strip, tall panels, cornice. Cells overlapping a
// door hole (expanded by FRAME_W + margin) are skipped; cut lines are added at hole edges so no cell
// straddles one. Occasional vent / junction / hatch cells break the repetition.
// ---------------------------------------------------------------------------
export function panelField(kit, wall, holes, P, opts = {}) {
  const {
    panelW = 3.7,
    rowH = 2.9,
    kickH = 0.5,
    stripY = 2.2,
    stripH = 0.2,
    corniceH = 0.6,
    seed = 1,
    paints = [
      [P.impWhite, 0.72],
      [P.impGrey, 0.22],
      [P.impMid, 0.06],
    ],
    variants = true,
    holeMargin = FRAME_W + 0.06,
    stripMat = "emitCool",
    panelMat = "impPanel",
    darkMat = "paintedMetal",
  } = opts;
  const rand = rng(seed);
  const gap = 0.05;
  const len = wall.a1 - wall.a0;
  const H = wall.y1 - wall.y0;

  // expanded hole rects (u,v relative to wall.a0 / wall.y0)
  const ex = holes.map((h) => ({ u0: h.u0 - wall.a0 - holeMargin, u1: h.u1 - wall.a0 + holeMargin, v0: 0, v1: h.v1 - wall.y0 + holeMargin }));

  // u cuts
  const nCols = Math.max(1, Math.round(len / panelW));
  let uCuts = [];
  for (let i = 0; i <= nCols; i++) uCuts.push((i / nCols) * len);
  const edgesU = [];
  for (const h of ex) edgesU.push(h.u0, h.u1);
  uCuts = uCuts.filter((c) => !edgesU.some((e) => Math.abs(e - c) < 0.5) && !ex.some((h) => c > h.u0 + 0.01 && c < h.u1 - 0.01));
  uCuts.push(...edgesU.filter((e) => e > 0.001 && e < len - 0.001));
  uCuts.sort((a, b) => a - b);
  uCuts = uCuts.filter((c, i) => i === 0 || c - uCuts[i - 1] > 0.05);

  // base rows: kick, waist, strip, tall rows, cornice
  const base = [0, kickH, stripY, stripY + stripH];
  let y = stripY + stripH;
  const top = H - corniceH;
  const nTall = Math.max(1, Math.round((top - y) / rowH));
  for (let i = 1; i <= nTall; i++) base.push(y + ((top - y) * i) / nTall);
  base.push(H);
  const rows = base.filter((r, i) => i === 0 || r - base[i - 1] > 0.05);

  const pickPaint = () => {
    let r = rand();
    for (const [c, w] of paints) {
      r -= w;
      if (r <= 0) return c;
    }
    return paints[0][0];
  };

  const colVCuts = (u0, u1) => {
    const hs = ex.filter((h) => h.u1 > u0 + 1e-3 && h.u0 < u1 - 1e-3);
    if (!hs.length) return rows;
    const edgesV = hs.map((h) => h.v1).filter((v) => v < H - 0.001);
    let v = rows.filter((c) => !edgesV.some((e) => Math.abs(e - c) < 0.35) && !hs.some((h) => c > h.v0 + 0.01 && c < h.v1 - 0.01));
    v.push(...edgesV);
    v.sort((a, b) => a - b);
    return v.filter((c, i) => i === 0 || c - v[i - 1] > 0.05);
  };

  const nGrey = P.impGrey;
  const nDark = P.impDark;
  const nBlack = P.impBlack;
  const stripStart = stripY;
  const stripEnd = stripY + stripH;

  for (let ci = 0; ci < uCuts.length - 1; ci++) {
    const cu0 = uCuts[ci];
    const cu1 = uCuts[ci + 1];
    const cw = cu1 - cu0;
    if (cw < 0.08) continue;
    const vCuts = colVCuts(cu0, cu1);
    for (let ri = 0; ri < vCuts.length - 1; ri++) {
      const cv0 = vCuts[ri];
      const cv1 = vCuts[ri + 1];
      const ch = cv1 - cv0;
      if (ch < 0.08) continue;
      const cu = (cu0 + cu1) / 2;
      const cv = (cv0 + cv1) / 2;
      if (ex.some((h) => cu > h.u0 - 1e-3 && cu < h.u1 + 1e-3 && cv > h.v0 - 1e-3 && cv < h.v1 + 1e-3)) continue;
      const U0 = wall.a0 + cu0 + gap / 2;
      const U1 = wall.a0 + cu1 - gap / 2;
      const V0 = wall.y0 + cv0 + gap / 2;
      const V1 = wall.y0 + cv1 - gap / 2;
      // strip band: dark channel with a recessed emitter
      if (Math.abs(cv0 - stripStart) < 0.02 && Math.abs(cv1 - stripEnd) < 0.02) {
        wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.05, { color: nBlack, texel: 1 });
        wallBox(kit, stripMat, wall, U0 + 0.1, U1 - 0.1, V0 + 0.05, V1 - 0.05, WALL_T + 0.05, WALL_T + 0.07, { uv: "keep" });
        continue;
      }
      // kick row: dark scuff-proof plate
      if (cv0 < kickH - 0.01 && cv1 <= kickH + 0.01) {
        wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.09, { color: nDark, texel: 1.2 });
        continue;
      }
      // cornice row: dark with a thin light seam under it
      if (cv1 > H - 0.01 && ch <= corniceH + 0.3) {
        wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.12, { color: nDark, texel: 1 });
        continue;
      }
      const col = pickPaint();
      const big = cw > 1.6 && ch > 1.6;
      const r = variants && big && cv0 < H - corniceH - 0.1 ? rand() : 1;
      if (r < 0.06) {
        // vent: dark recess with angled slats
        wallBox(kit, darkMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.03, { color: nBlack, texel: 1 });
        const slats = Math.max(4, Math.floor((ch - 0.5) / 0.28));
        for (let s = 0; s < slats; s++) {
          const sv = V0 + 0.3 + ((ch - 0.6) * s) / (slats - 1);
          wallBox(kit, "metal", wall, U0 + 0.25, U1 - 0.25, sv - 0.04, sv + 0.04, WALL_T + 0.02, WALL_T + 0.12, { color: nGrey, texel: 1.5 });
        }
        wallBox(kit, panelMat, wall, U0, U1, V0, V0 + 0.18, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
        wallBox(kit, panelMat, wall, U0, U1, V1 - 0.18, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
      } else if (r < 0.14) {
        // junction: panel + dark equipment box with indicators and a conduit drop
        wallBox(kit, panelMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
        const bw = Math.min(1.2, cw * 0.4);
        const bh = Math.min(0.9, ch * 0.35);
        const bu = wall.a0 + cu + (rand() - 0.5) * (cw - bw - 0.5);
        const bv = wall.y0 + cv + (rand() - 0.5) * (ch - bh - 0.5);
        wallBox(kit, darkMat, wall, bu - bw / 2, bu + bw / 2, bv - bh / 2, bv + bh / 2, WALL_T + 0.06, WALL_T + 0.26, { color: nBlack, texel: 2 });
        const nLed = 3 + Math.floor(rand() * 4);
        for (let i = 0; i < nLed; i++) {
          const m = ["emitRedImp", "emitBlue", "emitAmber"][Math.floor(rand() * 3)];
          wallBox(kit, m, wall, bu - bw / 2 + 0.12 + i * 0.14, bu - bw / 2 + 0.2 + i * 0.14, bv + bh / 2 - 0.16, bv + bh / 2 - 0.1, WALL_T + 0.26, WALL_T + 0.27);
        }
        const [pmin, pmax] = wallMinMax(wall, bu - 0.03, bu + 0.03, wall.y0 + cv0 + 0.1, bv - bh / 2, WALL_T + 0.1, WALL_T + 0.16);
        kit.boxMM("metal", pmin, pmax, { color: nGrey, texel: 2 });
      } else if (r < 0.22) {
        // hatch: raised inner plate with corner bolts
        wallBox(kit, panelMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
        wallBox(kit, panelMat, wall, U0 + 0.35, U1 - 0.35, V0 + 0.35, V1 - 0.35, WALL_T + 0.06, WALL_T + 0.1, { color: col === P.impWhite ? P.impGrey : P.impWhite, uv: "keep" });
        for (const [su, sv] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const bu = su ? U1 - 0.2 : U0 + 0.2;
          const bv = sv ? V1 - 0.2 : V0 + 0.2;
          wallBox(kit, "metal", wall, bu - 0.04, bu + 0.04, bv - 0.04, bv + 0.04, WALL_T + 0.06, WALL_T + 0.09, { color: nGrey });
        }
      } else if (r < 0.3) {
        // split panel: two half plates with a recessed vertical seam
        const mid = (U0 + U1) / 2;
        wallBox(kit, panelMat, wall, U0, mid - 0.03, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
        wallBox(kit, panelMat, wall, mid + 0.03, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: pickPaint(), uv: "keep" });
      } else {
        wallBox(kit, panelMat, wall, U0, U1, V0, V1, WALL_T, WALL_T + 0.06, { color: col, uv: "keep" });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pilasters: dark structural ribs full height every `spacing` metres, skipped over door holes.
// ---------------------------------------------------------------------------
export function pilasters(kit, wall, holes, P, opts = {}) {
  const { spacing = 12, width = 0.7, depth = 0.45, tag = "pilaster", skipEnds = true, light = true } = opts;
  const len = wall.a1 - wall.a0;
  const n = Math.round(len / spacing);
  const out = [];
  for (let i = skipEnds ? 1 : 0; i < (skipEnds ? n : n + 1); i++) {
    const u = wall.a0 + (len * i) / n;
    if (holes.some((h) => u > h.u0 - width / 2 - 0.9 && u < h.u1 + width / 2 + 0.9)) continue;
    const u0 = u - width / 2;
    const u1 = u + width / 2;
    wallBox(kit, "paintedMetal", wall, u0, u1, wall.y0, wall.y1 - 0.02, WALL_T, WALL_T + depth, { color: P.impDark, texel: 1 });
    // recessed centre channel with a thin blue indicator at the strip height
    wallBox(kit, "paintedMetal", wall, u - 0.12, u + 0.12, wall.y0 + 0.6, wall.y1 - 0.8, WALL_T + depth, WALL_T + depth + 0.04, { color: P.impBlack, texel: 1 });
    wallBox(kit, "hazard", wall, u0 - 0.01, u1 + 0.01, wall.y0 + 0.02, wall.y0 + 0.3, WALL_T + depth, WALL_T + depth + 0.02, { texel: 2 });
    if (light) {
      wallBox(kit, "emitBlue", wall, u - 0.06, u + 0.06, wall.y0 + 2.2, wall.y0 + 2.4, WALL_T + depth + 0.03, WALL_T + depth + 0.05);
      wallBox(kit, "emitRedImp", wall, u - 0.04, u + 0.04, wall.y1 - 1.2, wall.y1 - 1.05, WALL_T + depth + 0.03, WALL_T + depth + 0.05);
    }
    wallCollider(kit, wall, u0, u1, wall.y0, wall.y0 + 3, WALL_T, WALL_T + depth, tag);
    out.push(u);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Door surrounds (outside the FRAME_W reveal the doors system owns).
// bay: hazard-striped black/yellow band + heavy lintel + red beacons + sign plate.
// standard/blast/hatch: dark heavy frame band + status lamp.
// ---------------------------------------------------------------------------
export function doorSurrounds(kit, wall, holes, P, opts = {}) {
  const beacons = [];
  for (const h of holes) {
    const kind = h.door.kind;
    const inner = FRAME_W + 0.04;
    if (kind === "bay") {
      const band = 0.7;
      const n1 = WALL_T + 0.16;
      // sides
      wallBox(kit, "hazard", wall, h.u0 - inner - band, h.u0 - inner, wall.y0, h.v1 + inner + band, WALL_T, n1, { texel: 1.2 });
      wallBox(kit, "hazard", wall, h.u1 + inner, h.u1 + inner + band, wall.y0, h.v1 + inner + band, WALL_T, n1, { texel: 1.2 });
      // top band
      wallBox(kit, "hazard", wall, h.u0 - inner, h.u1 + inner, h.v1 + inner, h.v1 + inner + band, WALL_T, n1, { texel: 1.2 });
      // heavy lintel beam above the band
      wallBox(kit, "paintedMetal", wall, h.u0 - inner - band - 0.6, h.u1 + inner + band + 0.6, h.v1 + inner + band, h.v1 + inner + band + 1.1, WALL_T, WALL_T + 0.55, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, h.u0 - inner - band - 0.6, h.u1 + inner + band + 0.6, h.v1 + inner + band + 0.35, h.v1 + inner + band + 0.75, WALL_T + 0.55, WALL_T + 0.6, { color: P.impBlack, texel: 1 });
      // sign plate (dark) with an amber id bar
      const cu = (h.u0 + h.u1) / 2;
      wallBox(kit, "paintedMetal", wall, cu - 1.6, cu + 1.6, h.v1 + inner + band + 1.25, h.v1 + inner + band + 2.05, WALL_T, WALL_T + 0.12, { color: P.impBlack, texel: 1 });
      wallBox(kit, "emitAmber", wall, cu - 1.4, cu + 1.4, h.v1 + inner + band + 1.5, h.v1 + inner + band + 1.8, WALL_T + 0.12, WALL_T + 0.14);
      // side pylons (thick, floor to lintel) with colliders
      for (const [ua, ub] of [[h.u0 - inner - band - 0.6, h.u0 - inner - band], [h.u1 + inner + band, h.u1 + inner + band + 0.6]]) {
        wallBox(kit, "paintedMetal", wall, ua, ub, wall.y0, h.v1 + inner + band + 1.1, WALL_T, WALL_T + 0.55, { color: P.impDark, texel: 1 });
        wallCollider(kit, wall, ua, ub, wall.y0, wall.y0 + 3, WALL_T, WALL_T + 0.55, "door-pylon");
        // red beacon on the pylon at 2/3 height
        const bu = (ua + ub) / 2;
        const bv = h.v1 * 0.72 + wall.y0 * 0.28;
        wallBox(kit, "paintedMetal", wall, bu - 0.18, bu + 0.18, bv - 0.18, bv + 0.18, WALL_T + 0.55, WALL_T + 0.7, { color: P.impBlack, texel: 2 });
        wallBox(kit, "emitRedImp", wall, bu - 0.12, bu + 0.12, bv - 0.12, bv + 0.12, WALL_T + 0.7, WALL_T + 0.78);
        beacons.push(wallPoint(wall, bu, bv, WALL_T + 0.9));
      }
      // beacons on the lintel corners
      for (const bu of [h.u0 - inner - band / 2, h.u1 + inner + band / 2]) {
        const bv = h.v1 + inner + band + 0.55;
        wallBox(kit, "paintedMetal", wall, bu - 0.22, bu + 0.22, bv - 0.16, bv + 0.16, WALL_T + 0.55, WALL_T + 0.75, { color: P.impBlack, texel: 2 });
        wallBox(kit, "emitRedImp", wall, bu - 0.14, bu + 0.14, bv - 0.1, bv + 0.1, WALL_T + 0.75, WALL_T + 0.85);
        beacons.push(wallPoint(wall, bu, bv, WALL_T + 1.0));
      }
      // floor threshold hazard strip on our side
      const [tmin, tmax] = wallMinMax(wall, h.u0 - inner, h.u1 + inner, wall.y0 + 0.006, wall.y0 + 0.02, WALL_T, WALL_T + 1.2);
      kit.boxMM("hazard", tmin, tmax, { texel: 1.5 });
    } else {
      const band = 0.3;
      const n1 = WALL_T + 0.14;
      wallBox(kit, "paintedMetal", wall, h.u0 - inner - band, h.u0 - inner, wall.y0, h.v1 + inner + band, WALL_T, n1, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, h.u1 + inner, h.u1 + inner + band, wall.y0, h.v1 + inner + band, WALL_T, n1, { color: P.impDark, texel: 1 });
      wallBox(kit, "paintedMetal", wall, h.u0 - inner, h.u1 + inner, h.v1 + inner, h.v1 + inner + band, WALL_T, n1, { color: P.impDark, texel: 1 });
      // status lamp above the door + a small sign
      const cu = (h.u0 + h.u1) / 2;
      wallBox(kit, "paintedMetal", wall, cu - 0.5, cu + 0.5, h.v1 + inner + band + 0.08, h.v1 + inner + band + 0.4, WALL_T, WALL_T + 0.1, { color: P.impBlack, texel: 2 });
      wallBox(kit, "emitBlue", wall, cu - 0.35, cu + 0.35, h.v1 + inner + band + 0.18, h.v1 + inner + band + 0.3, WALL_T + 0.1, WALL_T + 0.12);
      wallCollider(kit, wall, h.u0 - inner - band, h.u0 - inner, wall.y0, wall.y0 + 3, WALL_T, n1, "door-jamb");
      wallCollider(kit, wall, h.u1 + inner, h.u1 + inner + band, wall.y0, wall.y0 + 3, WALL_T, n1, "door-jamb");
    }
  }
  return beacons;
}

// ---------------------------------------------------------------------------
// Cable tray + pipe run along a wall at height v (n from the panel surface). Adds brackets.
// ---------------------------------------------------------------------------
export function wallServices(kit, wall, holes, P, opts = {}) {
  const { v = 4.0, margin = 1.5 } = opts;
  // spans not interrupted by door holes (only holes taller than v matter)
  let spans = [[wall.a0 + margin, wall.a1 - margin]];
  for (const h of holes) {
    if (h.v1 + 1.2 < v) continue;
    const next = [];
    for (const [a, b] of spans) {
      const c0 = h.u0 - 1.6;
      const c1 = h.u1 + 1.6;
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    spans = next;
  }
  const n0 = WALL_T + 0.25;
  for (const [a, b] of spans) {
    if (b - a < 2) continue;
    // tray: U channel
    wallBox(kit, "paintedMetal", wall, a, b, v - 0.02, v, n0, n0 + 0.5, { color: P.impDark, texel: 1 });
    wallBox(kit, "paintedMetal", wall, a, b, v, v + 0.16, n0, n0 + 0.03, { color: P.impDark, texel: 1 });
    wallBox(kit, "paintedMetal", wall, a, b, v, v + 0.16, n0 + 0.47, n0 + 0.5, { color: P.impDark, texel: 1 });
    // cables in the tray
    for (const [dn, r, col] of [[0.1, 0.035, P.impBlack], [0.2, 0.03, P.impRed], [0.3, 0.04, P.impBlack], [0.4, 0.025, P.impBlue]]) {
      const [mn, mx] = wallMinMax(wall, a + 0.05, b - 0.05, v + r, v + r + r, n0 + dn - r, n0 + dn + r);
      kit.boxMM("paintedMetal", mn, mx, { color: col, texel: 2 });
    }
    // pipe pair above the tray with flanges
    const [p0, p1] = wallMinMax(wall, a, b, v + 0.55, v + 0.55, n0 + 0.15, n0 + 0.15);
    const cx = (p0[0] + p1[0]) / 2;
    const cz = (p0[2] + p1[2]) / 2;
    const axis = wall.axis === "x" ? "z" : "x";
    kit.cyl("metal", cx, v + 0.62, cz, 0.11, b - a, axis, { color: P.impGrey, segments: 12 });
    const [q0, q1] = wallMinMax(wall, a, b, v + 0.62, v + 0.62, n0 + 0.42, n0 + 0.42);
    kit.cyl("paintedMetal", (q0[0] + q1[0]) / 2, v + 0.62, (q0[2] + q1[2]) / 2, 0.07, b - a, axis, { color: P.impAmber, segments: 10 });
    // brackets every 6 m
    for (let u = a + 1; u < b; u += 6) {
      wallBox(kit, "paintedMetal", wall, u - 0.06, u + 0.06, v - 0.06, v + 0.9, WALL_T + 0.06, n0 + 0.55, { color: P.impBlack, texel: 2 });
    }
  }
}

// ---------------------------------------------------------------------------
// Floor: slab + plate seams. Returns nothing; markings are per room.
// ---------------------------------------------------------------------------
export function floorSlab(kit, bounds, P, opts = {}) {
  const { color = P.impMid, texel = 0.5, plate = 6, seamColor = P.impBlack } = opts;
  const { min, max } = bounds;
  const y = min[1];
  kit.boxMM("impFloor", [min[0], y - 0.12, min[2]], [max[0], y, max[2]], { color, texel });
  // seams (thin dark strips) forming big deck plates
  const nx = Math.round((max[0] - min[0]) / plate);
  const nz = Math.round((max[2] - min[2]) / plate);
  for (let i = 1; i < nx; i++) {
    const x = min[0] + ((max[0] - min[0]) * i) / nx;
    kit.boxMM("paintedMetal", [x - 0.03, y + 0.002, min[2] + WALL_T], [x + 0.03, y + 0.01, max[2] - WALL_T], { color: seamColor, texel: 1 });
  }
  for (let i = 1; i < nz; i++) {
    const z = min[2] + ((max[2] - min[2]) * i) / nz;
    kit.boxMM("paintedMetal", [min[0] + WALL_T, y + 0.002, z - 0.03], [max[0] - WALL_T, y + 0.01, z + 0.03], { color: seamColor, texel: 1 });
  }
}

// Painted floor line/rect (proud 1.5 cm so it never fights the deck). Material `painted` keeps wear.
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

// ---------------------------------------------------------------------------
// Ceiling: slab, cross beams, flood fixtures (emissive) laid out in rows. Returns fixture centres so
// the room can hang point/spot descriptors under them.
// ---------------------------------------------------------------------------
export function ceiling(kit, bounds, P, opts = {}) {
  const { min, max } = bounds;
  const y = max[1];
  const { beamAxis = "x", beamSpacing = 10, beamDepth = 1.2, beamW = 0.6, fixtureRows = 2, fixturesPerRow = 6, fixtureLen = 6, fixtureW = 0.9, color = P.impDark, floodMat = "emitCoolSoft" } = opts;
  kit.boxMM("paintedMetal", [min[0], y - 0.12, min[2]], [max[0], y, max[2]], { color, texel: 0.5 });
  // light-grey ceiling panels between the beams (large plates, seams via the dark slab showing through)
  const long = beamAxis === "x" ? "z" : "x";
  const L = long === "z" ? max[2] - min[2] : max[0] - min[0];
  const nB = Math.round(L / beamSpacing);
  for (let i = 0; i <= nB; i++) {
    const t = long === "z" ? min[2] + (L * i) / nB : min[0] + (L * i) / nB;
    if (i === 0 || i === nB) continue;
    if (beamAxis === "x") kit.boxMM("paintedMetal", [min[0] + WALL_T, y - beamDepth, t - beamW / 2], [max[0] - WALL_T, y - 0.12, t + beamW / 2], { color: P.impDark, texel: 1 });
    else kit.boxMM("paintedMetal", [t - beamW / 2, y - beamDepth, min[2] + WALL_T], [t + beamW / 2, y - 0.12, max[2] - WALL_T], { color: P.impDark, texel: 1 });
  }
  // panels between beams
  for (let i = 0; i < nB; i++) {
    const t0 = (long === "z" ? min[2] : min[0]) + (L * i) / nB + beamW / 2 + 0.15;
    const t1 = (long === "z" ? min[2] : min[0]) + (L * (i + 1)) / nB - beamW / 2 - 0.15;
    const a0 = (long === "z" ? min[0] : min[2]) + WALL_T + 0.6;
    const a1 = (long === "z" ? max[0] : max[2]) - WALL_T - 0.6;
    // split the span into 3 plates across
    for (let k = 0; k < 3; k++) {
      const p0 = a0 + ((a1 - a0) * k) / 3 + 0.1;
      const p1 = a0 + ((a1 - a0) * (k + 1)) / 3 - 0.1;
      if (long === "z") kit.boxMM("impPanel", [p0, y - 0.2, t0], [p1, y - 0.12, t1], { color: P.impMid, uv: "keep" });
      else kit.boxMM("impPanel", [t0, y - 0.2, p0], [t1, y - 0.12, p1], { color: P.impMid, uv: "keep" });
    }
  }
  // flood fixtures: rows along the long axis
  const fixtures = [];
  const across0 = long === "z" ? min[0] : min[2];
  const across1 = long === "z" ? max[0] : max[2];
  for (let r = 0; r < fixtureRows; r++) {
    const a = across0 + ((across1 - across0) * (r + 0.5)) / fixtureRows;
    for (let f = 0; f < fixturesPerRow; f++) {
      const t = (long === "z" ? min[2] : min[0]) + (L * (f + 0.5)) / fixturesPerRow;
      const cy = y - beamDepth - 0.05;
      if (long === "z") {
        kit.box("paintedMetal", a, cy - 0.15, t, fixtureW + 0.3, 0.3, fixtureLen + 0.4, { color: P.impBlack, texel: 1 });
        kit.box(floodMat, a, cy - 0.32, t, fixtureW, 0.06, fixtureLen, { uv: "keep" });
        for (const d of [-fixtureLen / 2 - 0.1, fixtureLen / 2 + 0.1]) kit.box("paintedMetal", a, cy - 0.28, t + d, fixtureW + 0.3, 0.2, 0.12, { color: P.impBlack });
        // hanger rods to the slab
        for (const d of [-fixtureLen / 2 + 0.3, fixtureLen / 2 - 0.3]) kit.box("metal", a, y - beamDepth / 2, t + d, 0.08, beamDepth, 0.08, { color: P.impGrey });
        fixtures.push([a, cy - 0.35, t]);
      } else {
        kit.box("paintedMetal", t, cy - 0.15, a, fixtureLen + 0.4, 0.3, fixtureW + 0.3, { color: P.impBlack, texel: 1 });
        kit.box(floodMat, t, cy - 0.32, a, fixtureLen, 0.06, fixtureW, { uv: "keep" });
        for (const d of [-fixtureLen / 2 - 0.1, fixtureLen / 2 + 0.1]) kit.box("paintedMetal", t + d, cy - 0.28, a, 0.12, 0.2, fixtureW + 0.3, { color: P.impBlack });
        for (const d of [-fixtureLen / 2 + 0.3, fixtureLen / 2 - 0.3]) kit.box("metal", t + d, y - beamDepth / 2, a, 0.08, beamDepth, 0.08, { color: P.impGrey });
        fixtures.push([t, cy - 0.35, a]);
      }
    }
  }
  return fixtures;
}

// ---------------------------------------------------------------------------
// Whole shell in one call. Returns { walls, holes, beacons, fixtures }.
// ---------------------------------------------------------------------------
export function buildShell(ctx, spec) {
  const { kit, PALETTE: P } = ctx;
  const { bounds, doors, seed = 7 } = spec;
  const walls = wallsOf(bounds);
  const holes = {};
  const beacons = [];
  floorSlab(kit, bounds, P, spec.floor || {});
  let i = 0;
  for (const [name, w] of Object.entries(walls)) {
    const hs = holesOn(w, doors);
    holes[name] = hs;
    wallSlab(kit, "paintedMetal", w, hs, { color: P.impBlack, texel: 0.5 }, "wall");
    panelField(kit, w, hs, P, { seed: seed * 17 + i * 101, ...(spec.panels || {}) });
    pilasters(kit, w, hs, P, { spacing: 12, ...(spec.pilasters || {}) });
    beacons.push(...doorSurrounds(kit, w, hs, P));
    if (spec.services !== false) wallServices(kit, w, hs, P, { v: 4.2, ...(spec.services || {}) });
    i++;
  }
  const fixtures = ceiling(kit, bounds, P, spec.ceiling || {});
  return { walls, holes, beacons, fixtures };
}
