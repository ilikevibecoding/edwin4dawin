// Imperial interior toolkit: the shared design language for every room of the Star Destroyer.
// Dark polished decks, light grey bevelled wall panels with black seams, recessed white light
// strips, hard-edged consoles with blue / red / amber readouts, hazard trim, cable runs.
//
// All positions are deck-local (floor at y = 0 unless stated). Every helper takes the sector's `kit`
// (geometry batcher) and usually `ctx` (sector context: lights, doors, anims, bounds).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, panelWithHoles, fitUVs } from "../kit.js";
import { decalRect } from "../textures.js";
import { Frame, wallFrame, ceilingFrame, panelGrid, pointLight, X_AXIS } from "./builders.js";

export const WALL_T = 0.16;
export const JAMB = 0.25; // door frame margin cut into the wall on each side of the door leaf

// panelGrid theme for Imperial walls / ceilings
export const IMP_THEME = {
  paintMats: ["impPanel", "impPanel1", "impPanel"],
  accent: "emitWhite",
  accent2: "emitBlue",
  pipeCol: PALETTE.impMid,
  screenMats: ["impScreen0", "impScreen1", "impScreen2"],
  decals: true,
};
export const IMP_PAINTS = [
  [PALETTE.impWhite, 0.6],
  [PALETTE.impLight, 0.24],
  [PALETTE.impGrey, 0.1],
  [PALETTE.impDark, 0.06],
];
export const IMP_PAINTS_DARK = [
  [PALETTE.impGrey, 0.45],
  [PALETTE.impMid, 0.35],
  [PALETTE.impDark, 0.2],
];
export const IMP_STYLES = { panel: 0.7, vent: 0.07, greeble: 0.08, strip: 0.07, screen: 0.04, conduit: 0.04 };
export const IMP_STYLES_TECH = { panel: 0.45, vent: 0.1, greeble: 0.15, strip: 0.1, screen: 0.1, conduit: 0.1 };

// ---------------------------------------------------------------------------
// Wall / opening helpers
// ---------------------------------------------------------------------------
/** Which wall of the sector bounds a door sits on: "zmin" | "zmax" | "xmin" | "xmax" | null. */
export function doorSide(door, bounds) {
  const [min, max] = bounds;
  const [px, pz] = door.pos;
  const tol = 0.7;
  if (door.wall === "x") {
    if (Math.abs(pz - min[2]) < tol && px >= min[0] - 0.01 && px <= max[0] + 0.01) return "zmin";
    if (Math.abs(pz - max[2]) < tol && px >= min[0] - 0.01 && px <= max[0] + 0.01) return "zmax";
  } else {
    if (Math.abs(px - min[0]) < tol && pz >= min[2] - 0.01 && pz <= max[2] + 0.01) return "xmin";
    if (Math.abs(px - max[0]) < tol && pz >= min[2] - 0.01 && pz <= max[2] + 0.01) return "xmax";
  }
  return null;
}

/** Wall segment (from → to as seen from inside, see builders.js frame convention) for a side. */
export function wallSegment(bounds, side) {
  const [min, max] = bounds;
  switch (side) {
    case "zmin":
      return { from: [min[0], min[2]], to: [max[0], min[2]] };
    case "zmax":
      return { from: [max[0], max[2]], to: [min[0], max[2]] };
    case "xmax":
      return { from: [max[0], min[2]], to: [max[0], max[2]] };
    case "xmin":
      return { from: [min[0], max[2]], to: [min[0], min[2]] };
  }
  throw new Error("bad side " + side);
}

/** Opening list (panelGrid format) for the doors on one side of the sector. */
export function doorOpenings(ctx, side, bounds = ctx.bounds) {
  const seg = wallSegment(bounds, side);
  const out = [];
  for (const d of ctx.doors) {
    if (doorSide(d, bounds) !== side) continue;
    let u;
    if (side === "zmin") u = d.pos[0] - seg.from[0];
    else if (side === "zmax") u = seg.from[0] - d.pos[0];
    else if (side === "xmax") u = d.pos[1] - seg.from[1];
    else u = seg.from[1] - d.pos[1];
    out.push({ type: "door", u0: u - d.w / 2 - JAMB, u1: u + d.w / 2 + JAMB, v0: 0, v1: d.h + JAMB, door: d });
  }
  return out;
}

/** One Imperial wall along a side of the bounds (or an explicit from/to), with door openings. */
export function impWall(kit, ctx, side, opts = {}) {
  const bounds = opts.bounds || ctx.bounds;
  const height = opts.height ?? bounds[1][1] - bounds[0][1];
  const base = opts.base ?? bounds[0][1];
  const seg = opts.from ? { from: opts.from, to: opts.to } : wallSegment(bounds, side);
  const { frame, length } = wallFrame(kit, seg.from, seg.to, base);
  const openings = [...(opts.openings || []), ...(opts.noDoors ? [] : doorOpenings(ctx, side, bounds))];
  const rows = opts.rows || (height > 4.5 ? [0, 0.5, 1.6, 2.6, height * 0.62, height - 0.5, height] : [0, 0.5, 1.6, 2.6, height]);
  panelGrid(frame, length, height, {
    openings,
    rows,
    panelW: opts.panelW || 1.2,
    seed: opts.seed ?? (ctx.seed || 7) * 31 + side.length,
    kick: opts.kick ?? true,
    topPipes: opts.topPipes ?? false,
    styles: opts.styles || IMP_STYLES,
    paints: opts.paints || IMP_PAINTS,
    tag: opts.tag || side,
    collide: opts.collide ?? true,
    ...IMP_THEME,
    ...(opts.theme || {}),
  });
  // black base trim (skirting) and a hairline seam strip at the top of the kick row
  if (opts.trim ?? true) {
    // spans between the door openings
    let spans = [[0, length]];
    for (const op of openings.filter((o) => o.type === "door")) {
      const next = [];
      for (const [a, b] of spans) {
        if (op.u1 <= a || op.u0 >= b) next.push([a, b]);
        else {
          if (op.u0 > a) next.push([a, op.u0]);
          if (op.u1 < b) next.push([op.u1, b]);
        }
      }
      spans = next;
    }
    for (const [a, b] of spans) if (b - a > 0.05) frame.box("rubber", (a + b) / 2, 0.06, 0.012, b - a, 0.12, 0.025, { color: PALETTE.rubber });
  }
  // optional cove light along the top edge (white strip recessed into a dark channel)
  if (opts.cove) {
    frame.box("paintedMetal", length / 2, height - 0.1, 0.07, length, 0.16, 0.14, { color: PALETTE.impDark, texel: 2 });
    frame.box("emitWhiteSoft", length / 2, height - 0.12, 0.13, length - 0.2, 0.04, 0.03, { uv: "keep" });
  }
  return { frame, length, openings };
}

// ---------------------------------------------------------------------------
// Floors and ceilings
// ---------------------------------------------------------------------------
export function impFloor(kit, ctx, opts = {}) {
  const b = opts.bounds || ctx.bounds;
  const y = opts.y ?? b[0][1];
  const pad = opts.pad ?? 0.4;
  kit.boxMM(opts.mat || "floorGloss", [b[0][0] - pad, y - 0.12, b[0][2] - pad], [b[1][0] + pad, y, b[1][2] + pad], { color: opts.color || 0xffffff, texel: opts.texel ?? 0.33 });
  // edge channel: a dark recessed gutter with a faint white strip where the walls meet the deck
  if (opts.gutter ?? true) {
    const g = 0.18;
    for (const [x0, z0, x1, z1] of [
      [b[0][0], b[0][2], b[1][0], b[0][2] + g],
      [b[0][0], b[1][2] - g, b[1][0], b[1][2]],
      [b[0][0], b[0][2], b[0][0] + g, b[1][2]],
      [b[1][0] - g, b[0][2], b[1][0], b[1][2]],
    ]) {
      kit.boxMM("paintedMetal", [x0, y, z0], [x1, y + 0.015, z1], { color: PALETTE.impBlack, texel: 2 });
    }
  }
}

/** Panelled ceiling with recessed white light strips; adds point lights through ctx.light. */
export function impCeiling(kit, ctx, opts = {}) {
  const b = opts.bounds || ctx.bounds;
  const y = opts.y ?? b[1][1];
  const x0 = b[0][0];
  const z0 = b[0][2];
  const w = b[1][0] - x0;
  const d = b[1][2] - z0;
  const f = ceilingFrame(kit, x0, z0, y);
  panelGrid(f, w, d, {
    rowH: opts.rowH || 1.4,
    panelW: opts.panelW || 1.4,
    kick: false,
    topPipes: false,
    seed: (ctx.seed || 7) * 17 + 3,
    collide: false,
    styles: opts.styles || { panel: 0.82, greeble: 0.08, vent: 0.1 },
    paints: opts.paints || [
      [PALETTE.impLight, 0.6],
      [PALETTE.impGrey, 0.3],
      [PALETTE.impMid, 0.1],
    ],
    ...IMP_THEME,
    decals: false,
  });
  // light strips: run along the longer axis, spaced ~4.5 m (emissive only; they carry the look)
  const along = opts.along || (w >= d ? "x" : "z");
  const span = along === "x" ? w : d;
  const across = along === "x" ? d : w;
  const n = Math.max(1, Math.round(across / (opts.spacing || 4.5)));
  for (let i = 0; i < n; i++) {
    const c = (i + 0.5) / n;
    const L = span - 1.2;
    if (along === "x") {
      const z = z0 + c * d;
      kit.box("paintedMetal", x0 + w / 2, y - 0.06, z, L + 0.2, 0.1, 0.42, { color: PALETTE.impDark, texel: 2 });
      kit.box("emitWhiteSoft", x0 + w / 2, y - 0.1, z, L, 0.03, 0.16, { uv: "keep" });
    } else {
      const x = x0 + c * w;
      kit.box("paintedMetal", x, y - 0.06, z0 + d / 2, 0.42, 0.1, L + 0.2, { color: PALETTE.impDark, texel: 2 });
      kit.box("emitWhiteSoft", x, y - 0.1, z0 + d / 2, 0.16, 0.03, L, { uv: "keep" });
    }
  }
  // real lights: a budgeted grid (forward renderer — every light costs every pixel). Big rooms get
  // a few strong lights with a wide range instead of one per strip.
  const lights = [];
  if (opts.lights ?? true) {
    const area = w * d;
    const budget = Math.max(1, Math.min(opts.maxLights ?? 6, Math.round(area / (opts.areaPerLight ?? 45))));
    const cols = Math.max(1, Math.round(Math.sqrt(budget * (w / d))));
    const rows = Math.max(1, Math.round(budget / cols));
    const cell = Math.sqrt(area / (cols * rows));
    const color = opts.lightColor || 0xe8f0ff;
    const intensity = opts.lightIntensity ?? Math.min(60, 4.5 + cell * cell * 0.09);
    const dist = opts.lightDistance ?? Math.min(60, cell * 1.6 + 4);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const p = [x0 + ((i + 0.5) / cols) * w, y - Math.min(0.9, (y - b[0][1]) * 0.2), z0 + ((j + 0.5) / rows) * d];
        lights.push(p);
        ctx.light(pointLight(color, intensity, dist, p));
      }
    }
  }
  return lights;
}

/** Floor + ceiling + the four walls with door openings. opts per part: floor, ceiling, walls. */
export function roomShell(kit, ctx, opts = {}) {
  impFloor(kit, ctx, opts.floor || {});
  if (opts.ceiling !== false) impCeiling(kit, ctx, opts.ceiling || {});
  const walls = {};
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    if (opts.skip && opts.skip.includes(side)) continue;
    walls[side] = impWall(kit, ctx, side, { ...(opts.walls || {}), ...((opts.wall && opts.wall[side]) || {}) });
  }
  return walls;
}

// ---------------------------------------------------------------------------
// Sunken pits, stairs, platforms, railings
// ---------------------------------------------------------------------------
/**
 * Sunken floor region (bridge crew pits). x0..x1, z0..z1 at depth below the deck. Adds the pit
 * floor, dark panelled pit walls, the walkable region collider and the wall colliders that stop
 * someone inside walking through the pit wall. `stairs`: { side: "zmin"|"zmax"|"xmin"|"xmax", u: centre along that side, w }.
 */
export function pit(kit, ctx, { x0, z0, x1, z1, depth = 1.8, stairs = null, floorMat = "floorGloss", wallPaints = IMP_PAINTS_DARK, seed = 5 }) {
  const y = -depth;
  kit.boxMM(floorMat, [x0, y - 0.12, z0], [x1, y, z1], { texel: 0.33 });
  // pit walls face inward; build each as a short panel wall with a top lip
  const b = [
    [x0, y, z0],
    [x1, 0, z1],
  ];
  const fakeCtx = { doors: [], bounds: b, seed };
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    let openings = [];
    if (stairs && stairs.side === side) {
      const seg = wallSegment(b, side);
      let u;
      if (side === "zmin") u = stairs.u - seg.from[0];
      else if (side === "zmax") u = seg.from[0] - stairs.u;
      else if (side === "xmax") u = stairs.u - seg.from[1];
      else u = seg.from[1] - stairs.u;
      openings = [{ type: "door", u0: u - stairs.w / 2, u1: u + stairs.w / 2, v0: 0, v1: depth }];
    }
    impWall(kit, fakeCtx, side, { bounds: b, height: depth, base: y, openings, noDoors: true, rows: [0, depth * 0.5, depth], kick: false, paints: wallPaints, styles: { panel: 0.55, greeble: 0.2, vent: 0.15, conduit: 0.1 }, trim: false, collide: false, seed: seed + side.length });
  }
  // lip around the top edge
  const lip = 0.14;
  for (const [ax, az, bx, bz] of [
    [x0 - lip, z0 - lip, x1 + lip, z0],
    [x0 - lip, z1, x1 + lip, z1 + lip],
    [x0 - lip, z0, x0, z1],
    [x1, z0, x1 + lip, z1],
  ]) {
    kit.boxMM("paintedMetal", [ax, -0.02, az], [bx, 0.03, bz], { color: PALETTE.impMid, texel: 2 });
  }
  // colliders: the region (floor override) + walls usable only from inside
  kit.colliders.push({ type: "region", min: new THREE.Vector3(x0, y, z0), max: new THREE.Vector3(x1, 0, z1), floor: y, tag: "pit" });
  const wallT = 0.05;
  const walls = [
    [x0 - wallT, z0 - wallT, x1 + wallT, z0],
    [x0 - wallT, z1, x1 + wallT, z1 + wallT],
    [x0 - wallT, z0, x0, z1],
    [x1, z0, x1 + wallT, z1],
  ];
  for (let i = 0; i < 4; i++) {
    const side = ["zmin", "zmax", "xmin", "xmax"][i];
    const [ax, az, bx, bz] = walls[i];
    if (stairs && stairs.side === side) {
      // split the wall around the stair opening
      const hor = side.startsWith("z");
      const u0 = stairs.u - stairs.w / 2;
      const u1 = stairs.u + stairs.w / 2;
      if (hor) {
        kit.collider([ax, y, az], [u0, 0, bz], "pitwall");
        kit.collider([u1, y, az], [bx, 0, bz], "pitwall");
      } else {
        kit.collider([ax, y, az], [bx, 0, u0], "pitwall");
        kit.collider([ax, y, u1], [bx, 0, bz], "pitwall");
      }
    } else kit.collider([ax, y, az], [bx, 0, bz], "pitwall");
  }
  if (stairs) {
    // stairs descend from the deck into the pit, occupying a run of 0.3 m per 0.18 m rise
    const steps = Math.max(3, Math.round(depth / 0.18));
    const run = 0.3;
    const total = steps * run;
    const hor = stairs.side.startsWith("z");
    const dir = stairs.side === "zmin" || stairs.side === "xmin" ? 1 : -1; // direction into the pit
    for (let i = 0; i < steps; i++) {
      const top = -((i + 1) * depth) / steps;
      const a = i * run;
      if (hor) {
        const zc = (stairs.side === "zmin" ? z0 : z1) + dir * (a + run / 2);
        kit.box("paintedMetal", stairs.u, (top + y) / 2, zc, stairs.w, top - y, run, { color: PALETTE.impMid, texel: 1.5 });
        kit.box("hazard", stairs.u, top + 0.005, zc + dir * (run / 2 - 0.03), stairs.w, 0.01, 0.05, { texel: 4 });
      } else {
        const xc = (stairs.side === "xmin" ? x0 : x1) + dir * (a + run / 2);
        kit.box("paintedMetal", xc, (top + y) / 2, stairs.u, run, top - y, stairs.w, { color: PALETTE.impMid, texel: 1.5 });
        kit.box("hazard", xc + dir * (run / 2 - 0.03), top + 0.005, stairs.u, 0.05, 0.01, stairs.w, { texel: 4 });
      }
    }
    // ramp collider over the stair run
    let min, max, axis, y0, y1;
    if (hor) {
      const zA = stairs.side === "zmin" ? z0 : z1 - total;
      min = [stairs.u - stairs.w / 2, y, zA];
      max = [stairs.u + stairs.w / 2, 0, zA + total];
      axis = "z";
      y0 = stairs.side === "zmin" ? 0 : y;
      y1 = stairs.side === "zmin" ? y : 0;
    } else {
      const xA = stairs.side === "xmin" ? x0 : x1 - total;
      min = [xA, y, stairs.u - stairs.w / 2];
      max = [xA + total, 0, stairs.u + stairs.w / 2];
      axis = "x";
      y0 = stairs.side === "xmin" ? 0 : y;
      y1 = stairs.side === "xmin" ? y : 0;
    }
    kit.colliders.push({ type: "ramp", min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), axis, y0, y1, tag: "pitstairs" });
  }
}

/**
 * Free-standing stairs from y0 up to y1 along +axis (dir +1) or -axis (dir -1), starting at (x, z)
 * (the bottom edge centre), `w` wide. Adds geometry + a ramp collider + side stringers.
 */
export function stairs(kit, ctx, { x, z, y0 = 0, y1, axis = "z", dir = -1, w = 2.0, rise = 0.18, run = 0.3, stringers = true }) {
  const steps = Math.max(2, Math.round((y1 - y0) / rise));
  const total = steps * run;
  for (let i = 0; i < steps; i++) {
    const top = y0 + ((i + 1) * (y1 - y0)) / steps;
    const a = i * run;
    if (axis === "z") {
      kit.box("paintedMetal", x, (top + y0 - 0.15) / 2, z + dir * (a + run / 2), w, top - y0 + 0.15, run, { color: PALETTE.impMid, texel: 1.5 });
      kit.box("hazard", x, top + 0.005, z + dir * (a + 0.03), w, 0.01, 0.05, { texel: 4 });
    } else {
      kit.box("paintedMetal", x + dir * (a + run / 2), (top + y0 - 0.15) / 2, z, run, top - y0 + 0.15, w, { color: PALETTE.impMid, texel: 1.5 });
      kit.box("hazard", x + dir * (a + 0.03), top + 0.005, z, 0.05, 0.01, w, { texel: 4 });
    }
  }
  if (stringers) {
    for (const s of [-1, 1]) {
      const off = s * (w / 2 + 0.04);
      const len = Math.hypot(total, y1 - y0);
      const ang = Math.atan2(y1 - y0, total);
      const cx = axis === "z" ? x + off : x + (dir * total) / 2;
      const cz = axis === "z" ? z + (dir * total) / 2 : z + off;
      const geo = new THREE.BoxGeometry(axis === "z" ? 0.08 : len, 0.5, axis === "z" ? len : 0.08);
      const rot = axis === "z" ? [dir * -ang, 0, 0] : [0, 0, dir * ang];
      kit.add("paintedMetal", geo, { pos: [cx, (y0 + y1) / 2 + 0.05, cz], rot, color: PALETTE.impDark, texel: 1.5 });
      // handrail
      const rg = new THREE.CylinderGeometry(0.025, 0.025, len, 8);
      rg.rotateX(axis === "z" ? Math.PI / 2 : 0);
      rg.rotateZ(axis === "z" ? 0 : Math.PI / 2);
      kit.add("metal", rg, { pos: [cx, (y0 + y1) / 2 + 1.0, cz], rot, color: PALETTE.steel, uv: "scale", uvScale: [0.2, len] });
    }
  }
  const min = axis === "z" ? [x - w / 2, y0, Math.min(z, z + dir * total)] : [Math.min(x, x + dir * total), y0, z - w / 2];
  const max = axis === "z" ? [x + w / 2, y1, Math.max(z, z + dir * total)] : [Math.max(x, x + dir * total), y1, z + w / 2];
  const lowAtMin = dir > 0;
  kit.colliders.push({ type: "ramp", min: new THREE.Vector3(...min), max: new THREE.Vector3(...max), axis, y0: lowAtMin ? y0 : y1, y1: lowAtMin ? y1 : y0, tag: "stairs" });
  return { total, steps };
}

/** Raised platform slab (walkable: solid collider ≤ STEP is stepped on, higher ones need stairs). */
export function platform(kit, ctx, { x0, z0, x1, z1, y, thickness = 0.3, mat = "floorGloss", edge = true }) {
  kit.boxMM(mat, [x0, y - thickness, z0], [x1, y, z1], { texel: 0.33 });
  if (edge) {
    const e = 0.08;
    kit.boxMM("paintedMetal", [x0 - e, y - thickness, z0 - e], [x1 + e, y - thickness + 0.1, z1 + e], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("hazard", [x0 - 0.01, y - 0.06, z0 - 0.01], [x1 + 0.01, y - 0.001, z1 + 0.01], { texel: 3 });
  }
  kit.collider([x0, y - thickness, z0], [x1, y, z1], "platform");
}

/** Railing along a line from (x0,z0) to (x1,z1) at floor height y. */
export function railing(kit, x0, z0, x1, z1, y = 0, opts = {}) {
  const h = opts.h ?? 1.05;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const rot = [0, ang, 0];
  const bar = (yy, r, col) => {
    const g = new THREE.CylinderGeometry(r, r, len, 8);
    g.rotateX(Math.PI / 2);
    kit.add("metal", g, { pos: [cx, y + yy, cz], rot, color: col, uv: "scale", uvScale: [0.2, len] });
  };
  bar(h, 0.028, PALETTE.steel);
  bar(h * 0.55, 0.018, PALETTE.impMid);
  const n = Math.max(2, Math.round(len / 1.6) + 1);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    kit.box("paintedMetal", px, y + h / 2, pz, 0.06, h, 0.06, { color: PALETTE.impDark, texel: 2 });
    kit.box("metal", px, y + 0.03, pz, 0.14, 0.06, 0.14, { color: PALETTE.impMid });
  }
  if (opts.collide ?? true) {
    const t = 0.08;
    kit.collider([Math.min(x0, x1) - t, y, Math.min(z0, z1) - t], [Math.max(x0, x1) + t, y + h, Math.max(z0, z1) + t], "rail");
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
/**
 * Imperial console: dark angular body with a sloped top carrying screens and button rows, side
 * lamps, and an optional operator chair behind it. `yaw` in radians: 0 faces -Z (screens toward +Z,
 * i.e. the operator stands at +Z looking at -Z).
 */
export function impConsole(kit, ctx, { x, z, y = 0, yaw = 0, w = 1.8, d = 0.8, h = 0.95, screens = [0, 1], chair = false, seed = 3, lampMat = "emitBlue", tall = false }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}, tiltX = 0) => {
    const p = local(lx, ly, lz);
    const qq = tiltX ? q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tiltX)) : q;
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: qq, ...extra });
  };
  const rand = rng(seed);
  // body: base plinth, main housing, kick recess with a blue strip, side cheeks
  add("paintedMetal", new THREE.BoxGeometry(w, 0.1, d), 0, 0.05, 0, { color: PALETTE.impBlack, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(w - 0.06, h - 0.35, d - 0.1), 0, 0.1 + (h - 0.35) / 2, 0, { color: PALETTE.impDark, texel: 1.5 });
  add(lampMat, new THREE.BoxGeometry(w - 0.3, 0.02, 0.01), 0, 0.13, d / 2 - 0.045);
  for (const s of [-1, 1]) add("impPanel", new THREE.BoxGeometry(0.05, h - 0.3, d), s * (w / 2 - 0.02), 0.1 + (h - 0.3) / 2, 0, { color: PALETTE.impGrey, uv: "keep" });
  // sloped top slab facing the operator (+Z)
  const slabD = d + 0.1;
  const tilt = -0.42;
  add("paintedMetal", new THREE.BoxGeometry(w, 0.08, slabD), 0, h - 0.18, 0.02, { color: PALETTE.impBlack, texel: 2 }, tilt);
  // screens across the slab
  const n = screens.length;
  const sw = (w - 0.2) / n - 0.08;
  for (let i = 0; i < n; i++) {
    const sx = -w / 2 + 0.1 + (i + 0.5) * ((w - 0.2) / n);
    const p = local(sx, h - 0.18, 0.02);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt)));
    const pos = p.clone().addScaledVector(up, 0.045);
    const qq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    kit.add("darkGloss", new THREE.BoxGeometry(sw + 0.04, 0.012, slabD * 0.5 + 0.04), { pos: [pos.x, pos.y, pos.z], quat: qq });
    const sg = new THREE.PlaneGeometry(sw, slabD * 0.5);
    sg.rotateX(-Math.PI / 2);
    const pos2 = p.clone().addScaledVector(up, 0.053);
    kit.add("impScreen" + (screens[i] % 5), sg, { pos: [pos2.x, pos2.y, pos2.z], quat: qq, uv: "keep" });
  }
  // button rows along the operator edge of the slab
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    const nb = Math.floor((w - 0.3) / 0.11);
    for (let i = 0; i < nb; i++) {
      const bx = -w / 2 + 0.15 + i * 0.11;
      const lit = rand() < 0.4;
      const mat = lit ? (rand() < 0.5 ? "emitBlue" : rand() < 0.6 ? "emitRed" : "emitAmber") : "rubber";
      const p = local(bx, h - 0.18, 0.02);
      const qq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qq);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qq);
      const pos = p.clone().addScaledVector(up, 0.06).addScaledVector(fwd, slabD * 0.28 + r * 0.09);
      kit.add(mat, new THREE.BoxGeometry(0.07, 0.03, 0.06), { pos: [pos.x, pos.y, pos.z], quat: qq, color: PALETTE.rubber });
    }
  }
  // status lamps on the cheeks
  for (const s of [-1, 1]) add(rand() < 0.7 ? lampMat : "emitRed", new THREE.BoxGeometry(0.02, 0.05, 0.05), s * (w / 2 + 0.006), h - 0.45, -d * 0.2);
  if (tall) {
    // rear riser with a large vertical display (bridge pit stations)
    add("paintedMetal", new THREE.BoxGeometry(w, 0.9, 0.12), 0, h + 0.4, -d / 2 + 0.05, { color: PALETTE.impDark, texel: 1.5 });
    add("darkGloss", new THREE.BoxGeometry(w - 0.24, 0.7, 0.012), 0, h + 0.42, -d / 2 + 0.115);
    const sg = new THREE.PlaneGeometry(w - 0.3, 0.62);
    add("impScreen" + (screens[0] % 5), sg, 0, h + 0.42, -d / 2 + 0.123, { uv: "keep" });
  }
  // collider (axis-aligned bound of the rotated footprint)
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (w * c + d * s) / 2;
  const ez = (w * s + d * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + h, z + ez], "console");
  if (chair) impChair(kit, ctx, { x: local(0, 0, d / 2 + 0.55).x, z: local(0, 0, d / 2 + 0.55).z, y, yaw });
}

/** Black operator chair facing -Z (rotated by yaw). */
export function impChair(kit, ctx, { x, z, y = 0, yaw = 0 }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = local(lx, ly, lz);
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  kit.cyl("metal", x, y + 0.02, z, 0.3, 0.04, "y", { color: PALETTE.impBlack, segments: 16 });
  kit.cyl("metal", x, y + 0.22, z, 0.05, 0.4, "y", { color: PALETTE.impMid });
  add("rubber", new THREE.BoxGeometry(0.5, 0.1, 0.5), 0, 0.47, 0, { color: PALETTE.rubber });
  add("fabric", new THREE.BoxGeometry(0.42, 0.05, 0.42), 0, 0.545, 0, { color: PALETTE.impBlack, uv: "world", texel: 2 });
  // backrest leaning aft (+Z is the back)
  const bq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -0.18));
  const p = local(0, 0.85, 0.24);
  kit.add("rubber", new THREE.BoxGeometry(0.48, 0.7, 0.1), { pos: [p.x, p.y, p.z], quat: bq, color: PALETTE.rubber });
  const p2 = local(0, 0.85, 0.19);
  kit.add("fabric", new THREE.BoxGeometry(0.38, 0.6, 0.03), { pos: [p2.x, p2.y, p2.z], quat: bq, color: PALETTE.impBlack, uv: "world", texel: 2 });
  for (const s of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.05, 0.05, 0.4), s * 0.27, 0.72, 0.02, { color: PALETTE.impDark });
  kit.collider([x - 0.3, y, z - 0.3], [x + 0.3, y + 0.6, z + 0.3], "chair");
}

/** Wall-mounted display panel: dark bezel + Imperial screen + a lamp bar. `side` = wall side it hangs on. */
export function wallScreen(kit, ctx, { side, u, v = 1.6, w = 1.2, h = 0.7, screen = 0, bounds = ctx.bounds }) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.box("paintedMetal", u, v, 0.03, w + 0.16, h + 0.16, 0.06, { color: PALETTE.impDark, texel: 2 });
  frame.box("darkGloss", u, v, 0.062, w + 0.04, h + 0.04, 0.006);
  frame.add("impScreen" + (screen % 5), new THREE.PlaneGeometry(w, h), u, v, 0.067, { uv: "keep" });
  frame.box("leds", u, v - h / 2 - 0.05, 0.05, w * 0.6, 0.03, 0.01, { uv: "keep" });
}

/** Stacked equipment cabinet against a wall (server-rack look with lit slots). */
export function equipmentRack(kit, ctx, { side, u, w = 1.2, h = 2.4, d = 0.6, seed = 9, bounds = ctx.bounds, lit = "emitBlue" }) {
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  const rand = rng(seed);
  frame.box("paintedMetal", u, h / 2, d / 2, w, h, d, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("impPanel", u, h / 2, d + 0.006, w - 0.1, h - 0.1, 0.012, { color: PALETTE.impMid, uv: "keep" });
  let y = 0.25;
  while (y < h - 0.3) {
    const sh = 0.12 + rand() * 0.25;
    frame.box("metal", u, y + sh / 2, d + 0.02, w - 0.24, sh - 0.03, 0.03, { color: rand() < 0.5 ? PALETTE.impBlack : PALETTE.impMid, texel: 2 });
    const nl = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < nl; i++) frame.box(rand() < 0.15 ? "emitRed" : lit, u - w / 2 + 0.2 + i * 0.09, y + sh / 2, d + 0.038, 0.03, 0.02, 0.008);
    if (rand() < 0.3) frame.box("leds", u + w * 0.2, y + sh / 2, d + 0.038, w * 0.3, 0.02, 0.008, { uv: "keep" });
    y += sh;
  }
  frame.box("hazard", u, 0.03, d / 2, w, 0.06, d, { texel: 3 });
  // world collider through the frame
  frame.collider(u - w / 2, u + w / 2, 0, h, 0, d, "rack");
}

/** Cargo crate / container (Imperial black-and-grey with a lit status plate). */
export function crate(kit, ctx, { x, y = 0, z, sx = 1.2, sy = 1.0, sz = 1.2, yaw = 0, seed = 1, color = null }) {
  const rand = rng(seed);
  const col = color || [PALETTE.impMid, PALETTE.impDark, PALETTE.impGrey][Math.floor(rand() * 3)];
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z));
    return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  add("impPanel1", new THREE.BoxGeometry(sx, sy, sz), 0, sy / 2, 0, { color: col, uv: "keep" });
  add("paintedMetal", new THREE.BoxGeometry(sx + 0.03, sy * 0.12, sz + 0.03), 0, sy * 0.06, 0, { color: PALETTE.impBlack, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(sx + 0.03, sy * 0.1, sz + 0.03), 0, sy - sy * 0.05, 0, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) add("paintedMetal", new THREE.BoxGeometry(0.06, sy, sz + 0.04), s * (sx / 2 - 0.2), sy / 2, 0, { color: PALETTE.impBlack, texel: 2 });
  add(rand() < 0.8 ? "emitBlue" : "emitRed", new THREE.BoxGeometry(0.12, 0.03, 0.01), sx * 0.25, sy * 0.5, sz / 2 + 0.006);
  add("decal", new THREE.PlaneGeometry(Math.min(0.4, sy * 0.4), Math.min(0.4, sy * 0.4)), -sx * 0.2, sy * 0.5, sz / 2 + 0.004, { uv: "keep", uvRect: decalRect(Math.floor(rand() * 16)) });
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (sx * c + sz * s) / 2;
  const ez = (sx * s + sz * c) / 2;
  kit.collider([x - ex, y, z - ez], [x + ex, y + sy, z + ez], "crate");
}

/** Pipe run through a list of [x, y, z] points with elbows; radius r. */
export function pipeRun(kit, points, r = 0.08, color = PALETTE.impMid, mat = "metal") {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const g = new THREE.CylinderGeometry(r, r, len, 10);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    kit.add(mat, g, { pos: [mid.x, mid.y, mid.z], quat: q, color, uv: "scale", uvScale: [2 * Math.PI * r, len] });
    if (i > 0) kit.add(mat, new THREE.SphereGeometry(r * 1.15, 10, 8), { pos: [a.x, a.y, a.z], color });
  }
}

/** Structural pillar (square column with a chamfered cap and a lit base). */
export function pillar(kit, x, z, y0, y1, size = 0.6, color = PALETTE.impMid) {
  kit.box("paintedMetal", x, (y0 + y1) / 2, z, size, y1 - y0, size, { color, texel: 1.2 });
  kit.box("paintedMetal", x, y0 + 0.2, z, size + 0.12, 0.4, size + 0.12, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", x, y1 - 0.2, z, size + 0.12, 0.4, size + 0.12, { color: PALETTE.impBlack, texel: 2 });
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    kit.box("emitWhite", x + dx * (size / 2 + 0.061), y0 + 0.45, z + dz * (size / 2 + 0.061), dx ? 0.004 : size * 0.6, 0.04, dz ? 0.004 : size * 0.6);
  }
  kit.collider([x - size / 2 - 0.06, y0, z - size / 2 - 0.06], [x + size / 2 + 0.06, y1, z + size / 2 + 0.06], "pillar");
}

/** Holographic projection: a translucent grid-textured shape floating above a point (adds a slow spin). */
export function hologram(kit, ctx, { x, y, z, kind = "ship", scale = 1.0 }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const mat = ctx.materials.holo;
  if (kind === "ship") {
    // a wedge silhouette of the ship itself
    const shape = new THREE.Shape([new THREE.Vector2(0, -1.6), new THREE.Vector2(0.9, 1.5), new THREE.Vector2(-0.9, 1.5)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    g.scale(scale, scale, scale);
    const m = new THREE.Mesh(g, mat);
    group.add(m);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.3 * scale, 0.25 * scale), mat);
    tower.position.set(0, 0.2 * scale, 1.0 * scale);
    group.add(tower);
  } else if (kind === "planet") {
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 24, 16), mat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1 * scale, 1.5 * scale, 48), mat);
    ring.rotation.x = Math.PI / 2 - 0.3;
    group.add(ring);
  } else {
    // tactical grid disc with contacts
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.4 * scale, 48), mat);
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);
    const rand = rng(11);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * scale), mat);
      c.position.set((rand() - 0.5) * 2.4 * scale, 0.1 + rand() * 0.9 * scale, (rand() - 0.5) * 2.4 * scale);
      group.add(c);
    }
  }
  ctx.mesh(group);
  ctx.anim((dt, t) => {
    group.rotation.y = t * 0.25;
    group.position.y = y + Math.sin(t * 0.8) * 0.03;
  });
  return group;
}
