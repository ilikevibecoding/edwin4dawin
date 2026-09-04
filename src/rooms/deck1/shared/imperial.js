// Imperial-style room shell builders for Deck 1 (COORDINATION.md §11): dark floors, light-grey panelled
// walls with black recessed seams, ceiling light channels, blue-white strips at head height.
// Everything is world-space kit-bashing; each room builds its own 0.3 m wall inside its bounds.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { IMP } from "./palette.js";
import { doorHole, doorFace } from "./doors.js";

export const WALL_T = 0.3;

const FACE_AXIS = { n: "x", s: "x", w: "z", e: "z" };

// Wall-thickness frame for a bounds face: outer plane, inner face plane and the direction into the room.
export function faceFrame(bounds, face, wallT = WALL_T) {
  const [mn, mx] = [bounds.min, bounds.max];
  let tOuter, tDir;
  if (face === "n") [tOuter, tDir] = [mn[2], 1];
  else if (face === "s") [tOuter, tDir] = [mx[2], -1];
  else if (face === "w") [tOuter, tDir] = [mn[0], 1];
  else [tOuter, tDir] = [mx[0], -1];
  const alongX = FACE_AXIS[face] === "x";
  const a0 = alongX ? mn[0] : mn[2];
  const a1 = alongX ? mx[0] : mx[2];
  return { face, alongX, tOuter, tDir, tFace: tOuter + tDir * wallT, a0, a1 };
}

// Interior AABB of a shell (inside the walls).
export function interior(bounds, floorY, ceilY, wallT = WALL_T) {
  return {
    min: [bounds.min[0] + wallT, floorY, bounds.min[2] + wallT],
    max: [bounds.max[0] - wallT, ceilY, bounds.max[2] - wallT],
  };
}

// Openings (world along-axis coords) for the manifest doors on one face.
export function doorOpenings(manifest, face, floorY) {
  const out = [];
  for (const d of manifest.doors || []) {
    if (doorFace(d) !== face) continue;
    const { w, h } = doorHole(d);
    const a = FACE_AXIS[face] === "x" ? d.pos[0] : d.pos[2];
    out.push({ a0: a - w / 2, a1: a + w / 2, y0: floorY, y1: floorY + h, kind: "door", id: d.id });
  }
  return out;
}

/**
 * One wall on a bounds face, panelled, with rectangular openings cut out.
 * spec: { face, bounds, floorY, ceilY, wallT, openings:[{a0,a1,y0,y1}], aRange, seed, panelW, tone:{light,mid},
 *         strip: "emitWhite"|"emitBlue"|null, stripY, detail: 0|1, collide, tag }
 */
export function wall(kit, spec) {
  const {
    face,
    bounds,
    floorY,
    ceilY,
    wallT = WALL_T,
    openings = [],
    seed = 1,
    panelW = 2.2,
    tone = {},
    strip = "emitWhite",
    stripY = 2.05,
    detail = 1,
    collide = true,
    tag = "wall",
    kickMat = "paintedMetal",
    panelMat = "impPanel",
  } = spec;
  const rand = rng(seed);
  const fr = faceFrame(bounds, face, wallT);
  const { alongX, tFace, tDir, tOuter } = fr;
  const a0 = spec.aRange ? spec.aRange[0] : fr.a0;
  const a1 = spec.aRange ? spec.aRange[1] : fr.a1;
  const H = ceilY - floorY;
  const light = tone.light || IMP.white;
  const mid = tone.mid || IMP.grey;

  // box spanning along [aa0,aa1] × y [y0,y1] × depth [d0,d1] (d measured from the inner face into the wall)
  const box = (mat, aa0, aa1, y0, y1, d0, d1, opts = {}) => {
    const t0 = tFace - tDir * d1;
    const t1 = tFace - tDir * d0;
    const tmin = Math.min(t0, t1);
    const tmax = Math.max(t0, t1);
    if (aa1 - aa0 < 1e-4 || y1 - y0 < 1e-4) return;
    if (alongX) kit.boxMM(mat, [aa0, y0, tmin], [aa1, y1, tmax], opts);
    else kit.boxMM(mat, [tmin, y0, aa0], [tmax, y1, aa1], opts);
  };
  const collider = (aa0, aa1, y0, y1) => {
    const tmin = Math.min(tOuter, tFace + tDir * 0.03);
    const tmax = Math.max(tOuter, tFace + tDir * 0.03);
    if (alongX) kit.collider([aa0, y0, tmin], [aa1, y1, tmax], tag);
    else kit.collider([tmin, y0, aa0], [tmax, y1, aa1], tag);
  };

  const ops = [...openings].sort((p, q) => p.a0 - q.a0);

  // --- backing + colliders: full-height segments between openings, lintels / sills over and under them
  let cursor = a0;
  for (const op of ops) {
    if (op.a0 > cursor + 1e-3) {
      box("paintedMetal", cursor, op.a0, floorY, ceilY, 0.04, wallT, { color: IMP.black, texel: 0.5 });
      if (collide) collider(cursor, op.a0, floorY, ceilY);
    }
    if (op.y1 < ceilY - 1e-3) box("paintedMetal", op.a0, op.a1, op.y1, ceilY, 0.04, wallT, { color: IMP.black, texel: 0.5 });
    if (op.y0 > floorY + 1e-3) {
      box("paintedMetal", op.a0, op.a1, floorY, op.y0, 0.04, wallT, { color: IMP.black, texel: 0.5 });
      if (collide) collider(op.a0, op.a1, floorY, op.y0);
    }
    cursor = Math.max(cursor, op.a1);
  }
  if (cursor < a1 - 1e-3) {
    box("paintedMetal", cursor, a1, floorY, ceilY, 0.04, wallT, { color: IMP.black, texel: 0.5 });
    if (collide) collider(cursor, a1, floorY, ceilY);
  }

  // --- panel grid
  const L = a1 - a0;
  const nCols = Math.max(1, Math.round(L / panelW));
  let aCuts = [];
  for (let i = 0; i <= nCols; i++) aCuts.push(a0 + (i / nCols) * L);
  const opEdges = ops.flatMap((o) => [o.a0, o.a1]);
  aCuts = aCuts.filter((c) => !opEdges.some((e) => Math.abs(e - c) < 0.35) && !ops.some((o) => c > o.a0 + 0.01 && c < o.a1 - 0.01));
  aCuts.push(...opEdges.filter((e) => e > a0 + 0.001 && e < a1 - 0.001));
  aCuts.sort((p, q) => p - q);
  aCuts = aCuts.filter((c, i) => i === 0 || c - aCuts[i - 1] > 0.05);

  // relative rows: kick, lower, upper, strip channel, high panels (≤ 2 m each), cornice
  const rel = [0, 0.3, 1.2, 2.0];
  const stripTop = strip ? stripY + 0.2 : 2.0;
  if (strip) rel.push(stripY, stripTop);
  const corniceH = H > 3.6 ? 0.45 : 0.3;
  const highTop = H - corniceH;
  let y = stripTop;
  while (highTop - y > 2.3) {
    y += Math.min(2.0, (highTop - y) / 2);
    rel.push(y);
  }
  rel.push(highTop, H);
  const baseRows = [...new Set(rel.map((r) => +r.toFixed(3)))].filter((r) => r >= 0 && r <= H + 1e-6).sort((p, q) => p - q);
  const rowKind = (yy0, yy1) => {
    const c = (yy0 + yy1) / 2;
    if (c < 0.3) return "kick";
    if (strip && c > stripY && c < stripTop) return "strip";
    if (c > highTop) return "cornice";
    return "panel";
  };

  for (let ci = 0; ci < aCuts.length - 1; ci++) {
    const c0 = aCuts[ci];
    const c1 = aCuts[ci + 1];
    const cw = c1 - c0;
    const colOps = ops.filter((o) => o.a1 > c0 + 1e-3 && o.a0 < c1 - 1e-3);
    let rows = baseRows.map((r) => floorY + r);
    for (const o of colOps) {
      rows = rows.filter((r) => Math.abs(r - o.y0) > 0.2 && Math.abs(r - o.y1) > 0.2 && !(r > o.y0 + 0.01 && r < o.y1 - 0.01));
      if (o.y0 > floorY + 0.001) rows.push(o.y0);
      if (o.y1 < ceilY - 0.001) rows.push(o.y1);
    }
    rows.sort((p, q) => p - q);
    rows = rows.filter((r, i) => i === 0 || r - rows[i - 1] > 0.05);
    for (let ri = 0; ri < rows.length - 1; ri++) {
      const r0 = rows[ri];
      const r1 = rows[ri + 1];
      const cy = (r0 + r1) / 2;
      const ca = (c0 + c1) / 2;
      if (colOps.some((o) => ca > o.a0 - 1e-3 && ca < o.a1 + 1e-3 && cy > o.y0 - 1e-3 && cy < o.y1 + 1e-3)) continue;
      const kind = rowKind(r0 - floorY, r1 - floorY);
      const g = 0.025; // half seam
      switch (kind) {
        case "kick":
          box(kickMat, c0 + g, c1 - g, r0, r1 - g, 0.0, 0.04, { color: IMP.dark, texel: 1 });
          break;
        case "cornice":
          box(kickMat, c0 + g, c1 - g, r0 + g, r1, 0.01, 0.04, { color: IMP.dark, texel: 1 });
          if (detail && cw > 1.2 && rand() < 0.5) box("metal", c0 + cw * 0.3, c1 - cw * 0.3, r0 + 0.08, r1 - 0.08, -0.02, 0.01, { color: IMP.mid, texel: 2 });
          break;
        case "strip": {
          // channel housing with a narrow emitter recessed into it (wide bare bars clip to white under bloom)
          box("paintedMetal", c0, c1, r0, r1, 0.0, 0.04, { color: IMP.black, texel: 1 });
          // two proud lips with the 4 cm emitter set back flush between them (recessed channel, no bare bar)
          box("metalRough", c0 + g, c1 - g, r0 + 0.035, r0 + 0.075, -0.03, 0.0, { color: IMP.dark, texel: 2 });
          box("metalRough", c0 + g, c1 - g, r1 - 0.075, r1 - 0.035, -0.03, 0.0, { color: IMP.dark, texel: 2 });
          box(strip, c0 + g + 0.04, c1 - g - 0.04, r0 + 0.08, r1 - 0.08, -0.006, 0.0);
          if (detail && cw > 1.5 && rand() < 0.35) {
            // junction box breaking the strip's monotony
            const ja = c0 + 0.25 + rand() * (cw - 0.5);
            box("metalRough", ja - 0.12, ja + 0.12, r0 - 0.02, r1 + 0.02, -0.06, 0.0, { color: IMP.mid });
            box(rand() < 0.5 ? "emitRedImp" : "emitAmber", ja - 0.03, ja + 0.03, cy - 0.015, cy + 0.015, -0.066, -0.06);
          }
          break;
        }
        default: {
          const v = rand();
          const col = v < 0.72 ? light : v < 0.9 ? mid : IMP.hullLight;
          const ch = r1 - r0;
          if (detail && cw > 1.6 && ch > 0.7 && rand() < 0.22) {
            // recessed panel with a raised inner plate
            box(panelMat, c0 + g, c1 - g, r0 + g, r1 - g, 0.02, 0.04, { color: mid, texel: 0.8 });
            box(panelMat, c0 + 0.16, c1 - 0.16, r0 + 0.14, r1 - 0.14, 0.0, 0.02, { color: col, texel: 0.8 });
          } else if (detail && cw > 1.6 && rand() < 0.2) {
            // split panel pair
            box(panelMat, c0 + g, ca - g, r0 + g, r1 - g, 0.0, 0.04, { color: col, texel: 0.8 });
            box(panelMat, ca + g, c1 - g, r0 + g, r1 - g, 0.0, 0.04, { color: rand() < 0.5 ? col : mid, texel: 0.8 });
          } else {
            box(panelMat, c0 + g, c1 - g, r0 + g, r1 - g, 0.0, 0.04, { color: col, texel: 0.8 });
          }
        }
      }
    }
  }
  return fr;
}

// Floor slab. Returns the top y.
export function floorSlab(kit, bounds, floorY, { mat = "impFloor", color = IMP.dark, thick = 0.2, inset = 0, texel = 0.5, tag = "floor" } = {}) {
  const [mn, mx] = [bounds.min, bounds.max];
  kit.boxMM(mat, [mn[0] + inset, floorY - thick, mn[2] + inset], [mx[0] - inset, floorY, mx[2] - inset], { color, texel });
  return floorY;
}

/**
 * Ceiling: dark top slab with recessed light channels running along an axis.
 * channels: [{ at: <x or z>, w: 0.5, emit: "emitWhite", emitW: 0.18 }], axis: "z" | "x"
 */
export function ceiling(kit, bounds, ceilY, { axis = "z", channels = [], color = IMP.black, mat = "paintedMetal", inset = 0, panelMat = "paintedMetal", panelColor = IMP.dark, depth = 0.22 } = {}) {
  const [mn, mx] = [bounds.min, bounds.max];
  const x0 = mn[0] + inset;
  const x1 = mx[0] - inset;
  const z0 = mn[2] + inset;
  const z1 = mx[2] - inset;
  // top slab (seen through the channels)
  kit.boxMM(mat, [x0, ceilY + depth, z0], [x1, ceilY + depth + 0.15, z1], { color, texel: 0.5 });
  // hanging panels between channels
  const across = axis === "z" ? [x0, x1] : [z0, z1];
  const chans = [...channels].sort((p, q) => p.at - q.at);
  let cur = across[0];
  const panel = (p0, p1) => {
    if (p1 - p0 < 0.01) return;
    if (axis === "z") kit.boxMM(panelMat, [p0, ceilY, z0], [p1, ceilY + depth - 0.02, z1], { color: panelColor, texel: 0.5 });
    else kit.boxMM(panelMat, [x0, ceilY, p0], [x1, ceilY + depth - 0.02, p1], { color: panelColor, texel: 0.5 });
  };
  for (const c of chans) {
    const w = c.w || 0.5;
    panel(cur, c.at - w / 2);
    // channel side lips + emissive strip recessed near the top slab
    const ew = Math.min(c.emitW || 0.18, 0.08);
    const emit = c.emit || "emitWhite";
    const eLo = ceilY + depth - 0.05;
    const eHi = ceilY + depth - 0.03;
    if (axis === "z") {
      kit.boxMM("metalRough", [c.at - w / 2 - 0.04, ceilY + 0.02, z0], [c.at - w / 2 + 0.03, ceilY + depth, z1], { color: IMP.mid, texel: 1 });
      kit.boxMM("metalRough", [c.at + w / 2 - 0.03, ceilY + 0.02, z0], [c.at + w / 2 + 0.04, ceilY + depth, z1], { color: IMP.mid, texel: 1 });
      kit.boxMM(emit, [c.at - ew / 2, eLo, z0 + 0.3], [c.at + ew / 2, eHi, z1 - 0.3]);
    } else {
      kit.boxMM("metalRough", [x0, ceilY + 0.02, c.at - w / 2 - 0.04], [x1, ceilY + depth, c.at - w / 2 + 0.03], { color: IMP.mid, texel: 1 });
      kit.boxMM("metalRough", [x0, ceilY + 0.02, c.at + w / 2 - 0.03], [x1, ceilY + depth, c.at + w / 2 + 0.04], { color: IMP.mid, texel: 1 });
      kit.boxMM(emit, [x0 + 0.3, eLo, c.at - ew / 2], [x1 - 0.3, eHi, c.at + ew / 2]);
    }
    cur = c.at + w / 2;
  }
  panel(cur, across[1]);
}

// Horizontal wall-mounted light strip between two points (world), housing + emitter.
export function lightStrip(kit, from, to, y, { emit = "emitWhite", h = 0.08, d = 0.05 } = {}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const rot = [0, Math.atan2(dx, dz), 0];
  kit.add("paintedMetal", new THREE.BoxGeometry(0.1, h + 0.06, len), { pos: [cx, y, cz], rot, color: IMP.black, texel: 1 });
  kit.add(emit, new THREE.BoxGeometry(0.11, h, len - 0.1), { pos: [cx, y, cz], rot });
}

// Railing with posts, top rail at 1.02 m, mid rail, kick plate. from/to are [x,z]; y = floor level.
export function railing(kit, from, to, y, { postEvery = 1.6, color = IMP.mid, collide = true, tag = "rail" } = {}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const ux = dx / len;
  const uz = dz / len;
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const rot = [0, Math.atan2(dx, dz), 0];
  kit.add("metal", new THREE.BoxGeometry(0.05, 0.06, len), { pos: [cx, y + 1.02, cz], rot, color: IMP.steel, texel: 2 });
  kit.add("metal", new THREE.BoxGeometry(0.03, 0.03, len), { pos: [cx, y + 0.55, cz], rot, color, texel: 2 });
  kit.add("paintedMetal", new THREE.BoxGeometry(0.04, 0.12, len), { pos: [cx, y + 0.06, cz], rot, color: IMP.black, texel: 2 });
  const n = Math.max(2, Math.round(len / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * len;
    const px = from[0] + ux * s;
    const pz = from[1] + uz * s;
    kit.box("paintedMetal", px, y + 0.5, pz, 0.07, 1.0, 0.07, { color: IMP.dark, texel: 2 });
  }
  if (collide) {
    const minX = Math.min(from[0], to[0]) - 0.06;
    const maxX = Math.max(from[0], to[0]) + 0.06;
    const minZ = Math.min(from[1], to[1]) - 0.06;
    const maxZ = Math.max(from[1], to[1]) + 0.06;
    kit.collider([minX, y, minZ], [maxX, y + 1.1, maxZ], tag);
  }
}

/**
 * Straight stair descending along +axisDir from (yTop at the start) to yBottom. Steps are boxes.
 * spec: { x0, x1, z0, z1, yTop, yBottom, dir: "+z"|"-z"|"+x"|"-x" }  (the run spans the box footprint)
 * Adds a "stairs-pending" blocker at the top edge until the player can change floor height.
 */
export function stairs(kit, { x0, x1, z0, z1, yTop, yBottom, dir = "+z", mat = "impFloor", color = IMP.dark, nosing = true }) {
  const drop = yTop - yBottom;
  const run = dir[1] === "z" ? z1 - z0 : x1 - x0;
  const n = Math.max(2, Math.round(drop / 0.18));
  const rise = drop / n;
  const tread = run / n;
  for (let i = 0; i < n; i++) {
    // step i (0 = highest): its own box from the pit floor up to the tread, one tread deep, walking in `dir`
    const top = yTop - rise * (i + 1);
    let bx0 = x0;
    let bx1 = x1;
    let bz0 = z0;
    let bz1 = z1;
    if (dir === "+z") [bz0, bz1] = [z0 + tread * i, z0 + tread * (i + 1)];
    else if (dir === "-z") [bz0, bz1] = [z1 - tread * (i + 1), z1 - tread * i];
    else if (dir === "+x") [bx0, bx1] = [x0 + tread * i, x0 + tread * (i + 1)];
    else [bx0, bx1] = [x1 - tread * (i + 1), x1 - tread * i];
    kit.boxMM(mat, [bx0, yBottom - 0.02, bz0], [bx1, top, bz1], { color, texel: 1 });
    if (nosing) {
      // bright nosing strip on the step-off edge of each tread
      const t = 0.03;
      if (dir === "+z") kit.boxMM("metal", [bx0 + 0.02, top, bz1 - t], [bx1 - 0.02, top + 0.006, bz1], { color: IMP.steel });
      else if (dir === "-z") kit.boxMM("metal", [bx0 + 0.02, top, bz0], [bx1 - 0.02, top + 0.006, bz0 + t], { color: IMP.steel });
      else if (dir === "+x") kit.boxMM("metal", [bx1 - t, top, bz0 + 0.02], [bx1, top + 0.006, bz1 - 0.02], { color: IMP.steel });
      else kit.boxMM("metal", [bx0, top, bz0 + 0.02], [bx0 + t, top + 0.006, bz1 - 0.02], { color: IMP.steel });
    }
  }
  // blocker at the top edge (player has no vertical motion yet)
  const b = 0.12;
  if (dir === "+z") kit.collider([x0, yTop - 0.1, z0 - b], [x1, yTop + 1.2, z0 + b], "stairs-pending");
  else if (dir === "-z") kit.collider([x0, yTop - 0.1, z1 - b], [x1, yTop + 1.2, z1 + b], "stairs-pending");
  else if (dir === "+x") kit.collider([x0 - b, yTop - 0.1, z0], [x0 + b, yTop + 1.2, z1], "stairs-pending");
  else kit.collider([x1 - b, yTop - 0.1, z0], [x1 + b, yTop + 1.2, z1], "stairs-pending");
}

/**
 * Complete closed shell for a rectangular manifest room: floor, ceiling, four panelled walls with the
 * manifest's doors cut out. Returns the interior AABB and per-face frames.
 * opts: { floorY, ceilY, wallT, seed, panelW, tone, strip, stripY, detail, extra: {n:[],s:[],w:[],e:[]},
 *         skip: ["n"], floor: {...}, ceiling: {...} | null, walls: { n: {...overrides} } }
 */
export function roomShell(kit, manifest, opts) {
  const { floorY, ceilY, wallT = WALL_T, seed = 1, extra = {}, skip = [], floor = {}, ceiling: ceil = {}, walls = {} } = opts;
  const bounds = manifest.bounds;
  const frames = {};
  if (floor !== null) floorSlab(kit, bounds, floorY, floor);
  if (ceil !== null) ceiling(kit, bounds, ceilY, ceil);
  ["n", "s", "w", "e"].forEach((face, i) => {
    if (skip.includes(face)) return;
    const openings = [...doorOpenings(manifest, face, floorY), ...(extra[face] || [])];
    frames[face] = wall(kit, {
      face,
      bounds,
      floorY,
      ceilY,
      wallT,
      openings,
      seed: seed * 7 + i * 131,
      panelW: opts.panelW,
      tone: opts.tone,
      strip: opts.strip === undefined ? "emitWhite" : opts.strip,
      stripY: opts.stripY,
      detail: opts.detail ?? 1,
      tag: `${manifest.id}-${face}`,
      ...(walls[face] || {}),
    });
  });
  return { interior: interior(bounds, floorY, ceilY, wallT), frames };
}

/**
 * Internal partition wall panelled on both sides. axis "x": runs along x at z = at (faces ±z);
 * axis "z": runs along z at x = at (faces ±x). openings: [{a0, a1, h}] door gaps along the run.
 */
export function partition(kit, { axis, at, from, to, floorY, ceilY, wt = 0.15, openings = [], seed = 5, strip = null, tone, detail = 1, tag = "partition" }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const ops = openings.map((o) => ({ a0: o.a0, a1: o.a1, y0: floorY, y1: floorY + (o.h || 2.2), kind: "door" }));
  // Each half is its own wall whose visible face is on the outside: the -t half is the "s"/"e" face of a bounds
  // ending at `at`, the +t half the "n"/"w" face of a bounds starting at `at`.
  const halves =
    axis === "x"
      ? [
          { face: "s", bounds: { min: [lo, floorY, at - 2 * wt], max: [hi, ceilY, at] } },
          { face: "n", bounds: { min: [lo, floorY, at], max: [hi, ceilY, at + 2 * wt] } },
        ]
      : [
          { face: "e", bounds: { min: [at - 2 * wt, floorY, lo], max: [at, ceilY, hi] } },
          { face: "w", bounds: { min: [at, floorY, lo], max: [at + 2 * wt, ceilY, hi] } },
        ];
  halves.forEach((h, i) => wall(kit, { face: h.face, bounds: h.bounds, floorY, ceilY, wallT: wt, openings: ops, seed: seed + i * 17, strip, tone, detail, tag, collide: true }));
  // door gap liners (both jambs + head) so the cut reads finished
  for (const o of ops) {
    const y1 = o.y1;
    if (axis === "x") {
      kit.boxMM("paintedMetal", [o.a0 - 0.06, floorY, at - wt - 0.02], [o.a0, y1 + 0.06, at + wt + 0.02], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [o.a1, floorY, at - wt - 0.02], [o.a1 + 0.06, y1 + 0.06, at + wt + 0.02], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [o.a0 - 0.06, y1, at - wt - 0.02], [o.a1 + 0.06, y1 + 0.06, at + wt + 0.02], { color: IMP.black, texel: 1 });
    } else {
      kit.boxMM("paintedMetal", [at - wt - 0.02, floorY, o.a0 - 0.06], [at + wt + 0.02, y1 + 0.06, o.a0], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [at - wt - 0.02, floorY, o.a1], [at + wt + 0.02, y1 + 0.06, o.a1 + 0.06], { color: IMP.black, texel: 1 });
      kit.boxMM("paintedMetal", [at - wt - 0.02, y1, o.a0 - 0.06], [at + wt + 0.02, y1 + 0.06, o.a1 + 0.06], { color: IMP.black, texel: 1 });
    }
  }
}

/**
 * Corridor greybox in the §9.3 corridor-kit look (dark floor with centre strip, light-grey panels, ceiling light
 * channel, wall strips at 2.05 m, ribs every 4 m). Replaced by D's corridorSegment() when it lands.
 * Runs along the longer bounds axis.
 */
export function corridorDressing(kit, manifest, floorY, ceilY, { ribEvery = 4, ribs = true, wallT = WALL_T, stripEmit = "emitWhite", segment = 6 } = {}) {
  const b = manifest.bounds;
  const alongZ = b.max[2] - b.min[2] > b.max[0] - b.min[0];
  const x0 = b.min[0] + wallT;
  const x1 = b.max[0] - wallT;
  const z0 = b.min[2] + wallT;
  const z1 = b.max[2] - wallT;
  // Long thin boxes are split into ≤ `segment` m pieces: a single 160 m × 1 cm triangle straddling the camera plane
  // leaks through walls under software GL (depth interpolation precision), and segments cull better anyway.
  const run = (mat, lo, hi, place, opts) => {
    const n = Math.max(1, Math.ceil((hi - lo) / segment));
    for (let i = 0; i < n; i++) place(mat, lo + ((hi - lo) * i) / n, lo + ((hi - lo) * (i + 1)) / n, opts);
  };
  // centre floor strip (slightly proud, lit edge lines)
  if (alongZ) {
    const cx = (x0 + x1) / 2;
    run("blackGloss", z0, z1, (m, a, c, o) => kit.boxMM(m, [cx - 0.5, floorY, a], [cx + 0.5, floorY + 0.012, c], o), { color: IMP.black });
    run("emitBlue", z0 + 0.4, z1 - 0.4, (m, a, c) => kit.boxMM(m, [cx - 0.53, floorY, a], [cx - 0.5, floorY + 0.01, c]));
    run("emitBlue", z0 + 0.4, z1 - 0.4, (m, a, c) => kit.boxMM(m, [cx + 0.5, floorY, a], [cx + 0.53, floorY + 0.01, c]));
  } else {
    const cz = (z0 + z1) / 2;
    run("blackGloss", x0, x1, (m, a, c, o) => kit.boxMM(m, [a, floorY, cz - 0.5], [c, floorY + 0.012, cz + 0.5], o), { color: IMP.black });
    run("emitBlue", x0 + 0.4, x1 - 0.4, (m, a, c) => kit.boxMM(m, [a, floorY, cz - 0.53], [c, floorY + 0.01, cz - 0.5]));
    run("emitBlue", x0 + 0.4, x1 - 0.4, (m, a, c) => kit.boxMM(m, [a, floorY, cz + 0.5], [c, floorY + 0.01, cz + 0.53]));
  }
  if (!ribs) return;
  // ribs: shallow frames around the section every ribEvery m, skipping door positions
  const doorsAlong = (manifest.doors || []).map((d) => (alongZ ? d.pos[2] : d.pos[0]));
  const a0 = alongZ ? z0 : x0;
  const a1 = alongZ ? z1 : x1;
  const rib = 0.18;
  const depth = 0.16;
  for (let a = a0 + ribEvery / 2; a < a1 - 0.5; a += ribEvery) {
    if (doorsAlong.some((d) => Math.abs(d - a) < 2.4)) continue;
    if (alongZ) {
      kit.boxMM("paintedMetal", [x0, floorY, a - rib / 2], [x0 + depth, ceilY, a + rib / 2], { color: IMP.dark, texel: 1 });
      kit.boxMM("paintedMetal", [x1 - depth, floorY, a - rib / 2], [x1, ceilY, a + rib / 2], { color: IMP.dark, texel: 1 });
      kit.boxMM("paintedMetal", [x0, ceilY - depth, a - rib / 2], [x1, ceilY, a + rib / 2], { color: IMP.dark, texel: 1 });
      kit.boxMM("emitWhite", [x0 + depth, ceilY - 0.07, a - 0.015], [x1 - depth, ceilY - 0.05, a + 0.015]);
    } else {
      kit.boxMM("paintedMetal", [a - rib / 2, floorY, z0], [a + rib / 2, ceilY, z0 + depth], { color: IMP.dark, texel: 1 });
      kit.boxMM("paintedMetal", [a - rib / 2, floorY, z1 - depth], [a + rib / 2, ceilY, z1], { color: IMP.dark, texel: 1 });
      kit.boxMM("paintedMetal", [a - rib / 2, ceilY - depth, z0], [a + rib / 2, ceilY, z1], { color: IMP.dark, texel: 1 });
      kit.boxMM("emitWhite", [a - 0.015, ceilY - 0.07, z0 + depth], [a + 0.015, ceilY - 0.05, z1 - depth]);
    }
  }
}

// Door threshold plate + status light housing on the room side of a door hole (D adds the assembly; this only
// keeps the cut edges of a greybox wall from reading raw). Kept 2 cm inside the bounds face.
export function doorReveal(kit, manifest, door, floorY, wallT = WALL_T) {
  const face = doorFace(door);
  const fr = faceFrame(manifest.bounds, face, wallT);
  const { w, h } = doorHole(door);
  const a = fr.alongX ? door.pos[0] : door.pos[2];
  const jamb = (aa0, aa1, y0, y1) => {
    const t0 = fr.tOuter + fr.tDir * 0.02;
    const t1 = fr.tFace + fr.tDir * 0.02;
    const tmin = Math.min(t0, t1);
    const tmax = Math.max(t0, t1);
    if (fr.alongX) kit.boxMM("paintedMetal", [aa0, y0, tmin], [aa1, y1, tmax], { color: IMP.black, texel: 1 });
    else kit.boxMM("paintedMetal", [tmin, y0, aa0], [tmax, y1, aa1], { color: IMP.black, texel: 1 });
  };
  // thin jamb liners on both sides and the lintel (5 cm), plus a threshold plate
  jamb(a - w / 2 - 0.05, a - w / 2, floorY, floorY + h + 0.05);
  jamb(a + w / 2, a + w / 2 + 0.05, floorY, floorY + h + 0.05);
  jamb(a - w / 2 - 0.05, a + w / 2 + 0.05, floorY + h, floorY + h + 0.05);
  const t0 = fr.tOuter;
  const t1 = fr.tFace + fr.tDir * 0.05;
  const tmin = Math.min(t0, t1);
  const tmax = Math.max(t0, t1);
  if (fr.alongX) kit.boxMM("metal", [a - w / 2, floorY, tmin], [a + w / 2, floorY + 0.012, tmax], { color: IMP.mid, texel: 2 });
  else kit.boxMM("metal", [tmin, floorY, a - w / 2], [tmax, floorY + 0.012, a + w / 2], { color: IMP.mid, texel: 2 });
}
