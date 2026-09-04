// Generic Imperial corridor built from a spec box. Openings are derived automatically: doors of
// adjacent rooms, junctions with other corridors, and lift portals. Signature look: light grey panel
// walls with a black kick and trim, continuous recessed light channels along both ceiling edges, dark
// deck with a lighter centre runner and black edge strips.
import { PALETTE } from "../materials.js";
import { wallFrame, panelGrid, pointLight, WALL_T, DOOR_H } from "./lib.js";
import { IMPERIAL_STYLES, IMPERIAL_PAINTS, DARK_PAINTS, wallLightBar } from "./shell.js";
import { DECKS, CORRIDORS, ROOMS, LIFTS, roomFloorY } from "../config/shipSpec.js";

export const CORRIDOR_H = 3.0;
const EPS = 0.45; // adjacency tolerance (two back-to-back walls)

// Per-deck corridor identity: command level is the cleanest and coolest, crew level warmer, the
// engineering and hangar decks are dark industrial with amber / white work light.
const DECK_STYLE = {
  A: { paints: IMPERIAL_PAINTS, bar: "emitWhiteSoft", runner: "impGrey", light: 0xe4ecff, accent: "emitBlue" },
  B: { paints: IMPERIAL_PAINTS, bar: "emitWarmSoft", runner: "impGrey", light: 0xf2e6d2, accent: "emitAmber" },
  C: { paints: DARK_PAINTS, bar: "emitWarmSoft", runner: "impGreyDark", light: 0xffd2a0, accent: "emitAmber" },
  D: { paints: DARK_PAINTS, bar: "emitWhiteSoft", runner: "impGreyDark", light: 0xe8eeff, accent: "emitRed" },
};

// Walls of an axis-aligned box keyed by outward direction, frames oriented so N points inside.
function boxWalls(kit, b, base) {
  return {
    "-z": wallFrame(kit, [b.x0, b.z0], [b.x1, b.z0], base),
    "+z": wallFrame(kit, [b.x1, b.z1], [b.x0, b.z1], base),
    "-x": wallFrame(kit, [b.x0, b.z1], [b.x0, b.z0], base),
    "+x": wallFrame(kit, [b.x1, b.z0], [b.x1, b.z1], base),
  };
}

// Wall-local u coordinate of a world point on the wall `dir` of box b.
function uOn(b, dir, x, z) {
  if (dir === "-z") return x - b.x0;
  if (dir === "+z") return b.x1 - x;
  if (dir === "-x") return b.z1 - z;
  return z - b.z0;
}

function overlap1D(a0, a1, b0, b1) {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi - lo > 0.05 ? [lo, hi] : null;
}

/**
 * Compute the openings of every wall of box `b` (a corridor) against the other spaces on its deck.
 * Returns { dir: [{u0,u1,v0,v1,type,door?}] , skip: Set(dir) }.
 */
export function corridorOpenings(b, height) {
  const out = { "-z": [], "+z": [], "-x": [], "+x": [] };
  const skip = new Set();
  const others = CORRIDORS.filter((c) => c !== b && c.deck === b.deck);
  const rooms = ROOMS.filter((r) => r.deck === b.deck);
  const planeOf = (dir) => (dir === "-z" ? b.z0 : dir === "+z" ? b.z1 : dir === "-x" ? b.x0 : b.x1);
  for (const dir of Object.keys(out)) {
    const alongZ = dir === "-x" || dir === "+x";
    const plane = planeOf(dir);
    const ext = alongZ ? [b.z0, b.z1] : [b.x0, b.x1];
    // junctions with other corridors: their footprint (expanded) contains this wall plane
    for (const o of others) {
      const inPlane = alongZ ? plane >= o.x0 - EPS && plane <= o.x1 + EPS : plane >= o.z0 - EPS && plane <= o.z1 + EPS;
      if (!inPlane) continue;
      const ov = alongZ ? overlap1D(ext[0], ext[1], o.z0, o.z1) : overlap1D(ext[0], ext[1], o.x0, o.x1);
      if (!ov) continue;
      const u0 = alongZ ? uOn(b, dir, plane, ov[0]) : uOn(b, dir, ov[0], plane);
      const u1 = alongZ ? uOn(b, dir, plane, ov[1]) : uOn(b, dir, ov[1], plane);
      const lo = Math.min(u0, u1);
      const hi = Math.max(u0, u1);
      if (lo < 0.05 && hi > ext[1] - ext[0] - 0.05) skip.add(dir);
      else out[dir].push({ u0: lo, u1: hi, v0: 0, v1: height, type: "junction" });
    }
    // room doors lying on this wall plane
    for (const r of rooms) {
      for (const door of r.doors || []) {
        const [dx, dz, w, facing, h] = door;
        const onPlane = alongZ ? Math.abs(dx - plane) < EPS + 0.2 : Math.abs(dz - plane) < EPS + 0.2;
        if (!onPlane) continue;
        const along = alongZ ? dz : dx;
        if (along < ext[0] - 0.01 || along > ext[1] + 0.01) continue;
        const uc = alongZ ? uOn(b, dir, plane, dz) : uOn(b, dir, dx, plane);
        out[dir].push({ u0: uc - w / 2, u1: uc + w / 2, v0: 0, v1: Math.min(height - 0.1, h || DOOR_H), type: "door", door, room: r.id });
      }
    }
    // lift portals: the shaft's door face touches this wall
    for (const [id, l] of Object.entries(LIFTS)) {
      if (!l.decks.includes(b.deck)) continue;
      const face = l.doorSide;
      const touches =
        (face === "+x" && dir === "-x" && Math.abs(l.x1 - plane) < EPS && overlap1D(ext[0], ext[1], l.z0, l.z1)) ||
        (face === "-x" && dir === "+x" && Math.abs(l.x0 - plane) < EPS && overlap1D(ext[0], ext[1], l.z0, l.z1)) ||
        (face === "+z" && dir === "-z" && Math.abs(l.z1 - plane) < EPS && overlap1D(ext[0], ext[1], l.x0, l.x1)) ||
        (face === "-z" && dir === "+z" && Math.abs(l.z0 - plane) < EPS && overlap1D(ext[0], ext[1], l.x0, l.x1));
      if (!touches) continue;
      const cx = (l.x0 + l.x1) / 2;
      const cz = (l.z0 + l.z1) / 2;
      const uc = alongZ ? uOn(b, dir, plane, cz) : uOn(b, dir, cx, plane);
      out[dir].push({ u0: uc - 1.0, u1: uc + 1.0, v0: 0, v1: 2.4, type: "lift", lift: id });
    }
  }
  return { openings: out, skip };
}

export function buildCorridorBox(kit, ctx, b, opts = {}) {
  const y0 = DECKS[b.deck].floorY;
  const h = opts.height || CORRIDOR_H;
  const w = b.x1 - b.x0;
  const d = b.z1 - b.z0;
  const longX = w >= d;
  const { openings, skip } = corridorOpenings(b, h);
  ctx.openings = openings;
  const style = DECK_STYLE[b.deck] || DECK_STYLE.A;

  // deck: dark plate, lighter runner, black edge strips
  kit.boxMM("deck", [b.x0 - WALL_T, y0 - 0.12, b.z0 - WALL_T], [b.x1 + WALL_T, y0, b.z1 + WALL_T], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
  kit.floor(b.x0 - WALL_T, b.z0 - WALL_T, b.x1 + WALL_T, b.z1 + WALL_T, y0);
  const runnerW = Math.min(longX ? d : w, 3) * 0.42;
  if (longX) {
    kit.boxMM("deck", [b.x0 + 0.3, y0, (b.z0 + b.z1) / 2 - runnerW / 2], [b.x1 - 0.3, y0 + 0.012, (b.z0 + b.z1) / 2 + runnerW / 2], { color: PALETTE[style.runner], uv: "world", texel: 1 });
    kit.boxMM("satinBlack", [b.x0, y0, b.z0], [b.x1, y0 + 0.008, b.z0 + 0.25]);
    kit.boxMM("satinBlack", [b.x0, y0, b.z1 - 0.25], [b.x1, y0 + 0.008, b.z1]);
  } else {
    kit.boxMM("deck", [(b.x0 + b.x1) / 2 - runnerW / 2, y0, b.z0 + 0.3], [(b.x0 + b.x1) / 2 + runnerW / 2, y0 + 0.012, b.z1 - 0.3], { color: PALETTE[style.runner], uv: "world", texel: 1 });
    kit.boxMM("satinBlack", [b.x0, y0, b.z0], [b.x0 + 0.25, y0 + 0.008, b.z1]);
    kit.boxMM("satinBlack", [b.x1 - 0.25, y0, b.z0], [b.x1, y0 + 0.008, b.z1]);
  }

  // walls
  const frames = boxWalls(kit, b, y0);
  let seed = (b.id.length * 131 + b.x0 * 7 + b.z0 * 3) | 0;
  for (const [dir, { frame, length }] of Object.entries(frames)) {
    if (skip.has(dir)) continue;
    const ops = openings[dir];
    panelGrid(frame, length, h, { openings: ops, depth: WALL_T, seed: seed++, kick: true, topPipes: b.deck === "C" || b.deck === "D", styles: IMPERIAL_STYLES, paints: style.paints, panelW: 1.25, tag: b.id + dir });
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
    // wall light bars at 2.25 m between openings, only on the long walls
    const isLong = longX ? dir === "-z" || dir === "+z" : dir === "-x" || dir === "+x";
    if (!isLong || length < 3) continue;
    const cuts = [0, ...ops.flatMap((o) => [o.u0 - 0.3, o.u1 + 0.3]), length].sort((a, c) => a - c);
    for (let i = 0; i + 1 < cuts.length; i += 2) {
      const u0 = cuts[i] + 0.4;
      const u1 = cuts[i + 1] - 0.4;
      if (u1 - u0 > 1.2) wallLightBar(frame, u0, u1, 2.3, style.bar);
      // deck marker lamp beside each opening
      if (i + 1 < cuts.length - 1) frame.box(style.accent, cuts[i + 1] + 0.15, 1.9, 0.03, 0.05, 0.3, 0.03);
    }
  }

  // floor guide light lines along both walls (lift the lower third out of the black) and bulkhead
  // frames every ~12 m with a section stencil so long runs read as structure, not one repeated module
  const len0 = longX ? w : d;
  const guide = (side) => {
    if (longX) {
      const z = side < 0 ? b.z0 + 0.06 : b.z1 - 0.06;
      kit.box(style.bar, (b.x0 + b.x1) / 2, y0 + 0.1, z, w - 0.6, 0.02, 0.03, { uv: "keep" });
    } else {
      const x = side < 0 ? b.x0 + 0.06 : b.x1 - 0.06;
      kit.box(style.bar, x, y0 + 0.1, (b.z0 + b.z1) / 2, 0.03, 0.02, d - 0.6, { uv: "keep" });
    }
  };
  guide(-1);
  guide(1);
  if (len0 > 14) {
    const nB = Math.floor(len0 / 12);
    for (let i = 1; i <= nB; i++) {
      const t = (i - 0.5 + (nB % 2 ? 0.5 : 0)) / nB;
      const a = (longX ? b.x0 : b.z0) + len0 * t;
      // skip frames that would land on an opening
      const hit = Object.values(openings).some((ops) => ops.some((o) => Math.abs((longX ? o.u0 + o.u1 : o.u0 + o.u1) / 2 - (a - (longX ? b.x0 : b.z0))) < 2.2 || Math.abs(len0 - (o.u0 + o.u1) / 2 - (a - (longX ? b.x0 : b.z0))) < 2.2));
      if (hit) continue;
      const beamY = y0 + h - 0.12;
      if (longX) {
        kit.box("paintedMetal", a, y0 + h / 2, b.z0 + 0.06, 0.24, h, 0.12, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box("paintedMetal", a, y0 + h / 2, b.z1 - 0.06, 0.24, h, 0.12, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box("paintedMetal", a, beamY, (b.z0 + b.z1) / 2, 0.24, 0.24, d, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box(style.accent, a, y0 + 2.05, b.z0 + 0.125, 0.06, 0.06, 0.01);
        kit.box(style.accent, a, y0 + 2.05, b.z1 - 0.125, 0.06, 0.06, 0.01);
      } else {
        kit.box("paintedMetal", b.x0 + 0.06, y0 + h / 2, a, 0.12, h, 0.24, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box("paintedMetal", b.x1 - 0.06, y0 + h / 2, a, 0.12, h, 0.24, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box("paintedMetal", (b.x0 + b.x1) / 2, beamY, a, w, 0.24, 0.24, { color: PALETTE.darkMetal, texel: 1.5 });
        kit.box(style.accent, b.x0 + 0.125, y0 + 2.05, a, 0.01, 0.06, 0.06);
        kit.box(style.accent, b.x1 - 0.125, y0 + 2.05, a, 0.01, 0.06, 0.06);
      }
    }
  }

  // ceiling: plate, ribs, two edge light channels along the long axis
  kit.boxMM("painted", [b.x0 - WALL_T, y0 + h, b.z0 - WALL_T], [b.x1 + WALL_T, y0 + h + 0.12, b.z1 + WALL_T], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  const len = longX ? w : d;
  const ribs = Math.max(1, Math.floor(len / 4));
  for (let i = 1; i < ribs; i++) {
    const t = i / ribs;
    if (longX) kit.box("paintedMetal", b.x0 + w * t, y0 + h - 0.08, (b.z0 + b.z1) / 2, 0.14, 0.16, d, { color: PALETTE.darkMetal, texel: 1.2 });
    else kit.box("paintedMetal", (b.x0 + b.x1) / 2, y0 + h - 0.08, b.z0 + d * t, w, 0.16, 0.14, { color: PALETTE.darkMetal, texel: 1.2 });
  }
  const inset = 0.42;
  for (const side of [-1, 1]) {
    if (longX) {
      const z = (b.z0 + b.z1) / 2 + side * (d / 2 - inset);
      kit.box("satinBlack", (b.x0 + b.x1) / 2, y0 + h - 0.03, z, w - 0.6, 0.06, 0.3);
      kit.box(style.bar, (b.x0 + b.x1) / 2, y0 + h - 0.06, z, w - 0.7, 0.02, 0.18, { uv: "keep" });
    } else {
      const x = (b.x0 + b.x1) / 2 + side * (w / 2 - inset);
      kit.box("satinBlack", x, y0 + h - 0.03, (b.z0 + b.z1) / 2, 0.3, 0.06, d - 0.6);
      kit.box(style.bar, x, y0 + h - 0.06, (b.z0 + b.z1) / 2, 0.18, 0.02, d - 0.7, { uv: "keep" });
    }
  }
  // practicals every ~7 m
  const n = Math.max(1, Math.round(len / 7));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = longX ? b.x0 + w * t : (b.x0 + b.x1) / 2;
    const pz = longX ? (b.z0 + b.z1) / 2 : b.z0 + d * t;
    ctx.lights.cool.push(pointLight(style.light, 4.5, 10, [px, y0 + h - 0.9, pz]));
  }
  return { y0, h, openings, frames };
}

export { roomFloorY };
