// Room shells in the Imperial design language: dark deck, light grey-white panel walls with black
// kick and trim bands, recessed ceiling light channels. Every room builder starts from `roomShell`
// and adds its own contents, so the decks read as one ship while each room keeps its identity.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { Frame, wallFrame, ceilingFrame, panelGrid, pointLight, WALL_T, DOOR_H } from "./lib.js";
import { roomFloorY, LIFTS } from "../config/shipSpec.js";

// Cleaner style mix than the freighter default: mostly plain panels, a few vents / strips.
export const IMPERIAL_STYLES = { panel: 0.8, vent: 0.06, greeble: 0.05, strip: 0.05, screen: 0.02, conduit: 0.02 };
export const IMPERIAL_PAINTS = [
  [PALETTE.cream, 0.8],
  [PALETTE.creamDark, 0.1],
  [PALETTE.gunmetal, 0.08],
  [PALETTE.orange, 0.02],
];
export const DARK_PAINTS = [
  [PALETTE.gunmetal, 0.6],
  [PALETTE.darkMetal, 0.25],
  [PALETTE.slate, 0.12],
  [PALETTE.orange, 0.03],
];

/**
 * Wall frames of an axis-aligned room, keyed by the outward direction of each wall.
 * Frames are oriented "left to right as seen from inside" so their normal points into the room.
 */
export function roomWalls(kit, room, base) {
  const { x0, x1, z0, z1 } = room;
  return {
    "-z": wallFrame(kit, [x0, z0], [x1, z0], base), // forward wall
    "+z": wallFrame(kit, [x1, z1], [x0, z1], base), // aft wall
    "-x": wallFrame(kit, [x0, z1], [x0, z0], base), // port wall
    "+x": wallFrame(kit, [x1, z0], [x1, z1], base), // starboard wall
  };
}

// Convert a spec door [x, z, width, facing] into a panelGrid opening on the matching wall frame.
export function doorOpening(room, door, base, wallLen, height = DOOR_H) {
  const [dx, dz, w, facing] = door;
  const { x0, x1, z0, z1 } = room;
  let u;
  if (facing === "-z") u = dx - x0;
  else if (facing === "+z") u = x1 - dx;
  else if (facing === "-x") u = z1 - dz;
  else u = dz - z0;
  return { u0: Math.max(0, u - w / 2), u1: Math.min(wallLen, u + w / 2), v0: 0, v1: height, type: "door" };
}

// Openings for turbolift portals whose door face touches this wall (2 m wide, 2.4 m tall).
export function liftOpenings(room, dir, wallLen) {
  const out = [];
  const plane = dir === "-z" ? room.z0 : dir === "+z" ? room.z1 : dir === "-x" ? room.x0 : room.x1;
  for (const l of Object.values(LIFTS)) {
    if (!l.decks.includes(room.deck)) continue;
    const face = l.doorSide;
    const cx = (l.x0 + l.x1) / 2;
    const cz = (l.z0 + l.z1) / 2;
    let u = null;
    if (face === "-z" && dir === "+z" && Math.abs(l.z0 - plane) < 0.5 && cx > room.x0 && cx < room.x1) u = room.x1 - cx;
    if (face === "+z" && dir === "-z" && Math.abs(l.z1 - plane) < 0.5 && cx > room.x0 && cx < room.x1) u = cx - room.x0;
    if (face === "-x" && dir === "+x" && Math.abs(l.x0 - plane) < 0.5 && cz > room.z0 && cz < room.z1) u = cz - room.z0;
    if (face === "+x" && dir === "-x" && Math.abs(l.x1 - plane) < 0.5 && cz > room.z0 && cz < room.z1) u = room.z1 - cz;
    if (u !== null) out.push({ u0: Math.max(0, u - 1), u1: Math.min(wallLen, u + 1), v0: 0, v1: 2.4, type: "lift" });
  }
  return out;
}

/**
 * Build floor, ceiling and the four walls of a room.
 * opts: { style: 'light'|'dark', skipWalls: ['-z'], openings: { '-z': [...] }, ceiling: true, floor: true,
 *         floorMat, floorColor, lightRows, lightMat, lights: true (adds point lights to ctx),
 *         panelW (panel pitch, use ~2 for tall halls), styles (panelGrid style mix) }
 */
export function roomShell(kit, ctx, room, opts = {}) {
  const {
    style = "light",
    skipWalls = [],
    openings = {},
    ceiling = true,
    floor = true,
    floorMat = "deck",
    floorColor = PALETTE.impGreyDark,
    lightMat = "emitWhiteSoft",
    lightRows = null,
    lights = true,
    seed = 7,
    kick = true,
    topPipes = false,
    wallDepth = WALL_T,
    panelW = 1.05,
    styles = IMPERIAL_STYLES,
  } = opts;
  const y0 = roomFloorY(room);
  const h = room.height;
  const yTop = y0 + h;
  const { x0, x1, z0, z1 } = room;
  const w = x1 - x0;
  const d = z1 - z0;

  // floor slab + walkable surface (rooms with pits or wells build their own)
  if (floor) {
    kit.boxMM(floorMat, [x0 - wallDepth, y0 - 0.12, z0 - wallDepth], [x1 + wallDepth, y0, z1 + wallDepth], { color: floorColor, uv: "world", texel: 1 });
    kit.floor(x0 - wallDepth, z0 - wallDepth, x1 + wallDepth, z1 + wallDepth, y0);
  }

  // walls
  const frames = roomWalls(kit, room, y0);
  const paints = style === "dark" ? DARK_PAINTS : IMPERIAL_PAINTS;
  let s = seed;
  for (const [dir, { frame, length }] of Object.entries(frames)) {
    if (skipWalls.includes(dir)) continue;
    const ops = [...(openings[dir] || []), ...liftOpenings(room, dir, length)];
    for (const door of room.doors || []) if (door[3] === dir) ops.push(doorOpening(room, door, y0, length, Math.min(h - 0.1, door[4] || DOOR_H)));
    // tall rooms: repeat the standard 3.2 m band so panels stay human-scaled instead of stretching
    const rows = h > 4.2 ? [0, 0.45, 1.55, 2.2, 3.2, ...Array.from({ length: Math.ceil((h - 3.2) / 3) }, (_, i) => Math.min(h, 3.2 + (i + 1) * 3))] : null;
    panelGrid(frame, length, h, { openings: ops, depth: wallDepth, seed: s++, kick, topPipes, rows, panelW, styles, paints, tag: room.id + dir });
    // black trim band along the top edge
    frame.box("satinBlack", length / 2, h - 0.09, 0.02, length, 0.18, 0.05);
  }

  // ceiling: dark plate, structural ribs across the short axis, recessed light channels along the long axis
  if (ceiling) {
    kit.boxMM("paintedMetal", [x0 - wallDepth, yTop, z0 - wallDepth], [x1 + wallDepth, yTop + 0.12, z1 + wallDepth], { color: PALETTE.gunmetal, uv: "world", texel: 0.7 });
    const longX = w >= d;
    const ribStep = 3.2;
    const ribCount = Math.max(1, Math.floor((longX ? w : d) / ribStep));
    for (let i = 1; i < ribCount; i++) {
      const t = i / ribCount;
      if (longX) kit.box("paintedMetal", x0 + w * t, yTop - 0.09, (z0 + z1) / 2, 0.16, 0.18, d, { color: PALETTE.darkMetal, texel: 1.2 });
      else kit.box("paintedMetal", (x0 + x1) / 2, yTop - 0.09, z0 + d * t, w, 0.18, 0.16, { color: PALETTE.darkMetal, texel: 1.2 });
    }
    const rows = lightRows ?? Math.max(1, Math.round((longX ? d : w) / 4));
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows;
      const len = (longX ? w : d) - 1.2;
      if (longX) {
        const z = z0 + d * t;
        kit.box("satinBlack", (x0 + x1) / 2, yTop - 0.03, z, len + 0.16, 0.06, 0.34);
        kit.box(lightMat, (x0 + x1) / 2, yTop - 0.06, z, len, 0.02, 0.22, { uv: "keep" });
      } else {
        const x = x0 + w * t;
        kit.box("satinBlack", x, yTop - 0.03, (z0 + z1) / 2, 0.34, 0.06, len + 0.16);
        kit.box(lightMat, x, yTop - 0.06, (z0 + z1) / 2, 0.22, 0.02, len, { uv: "keep" });
      }
    }
    if (lights) {
      // a grid of cool-white practicals, one per ~6 m in each direction; intensity scales with the
      // ceiling height so tall rooms are not left in the dark
      const nx = Math.max(1, Math.round(w / 6));
      const nz = Math.max(1, Math.round(d / 6));
      const reach = Math.max(8, Math.min(w, d) * 1.3);
      const intensity = 5.5 * Math.max(1, h / 3.2);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const px = x0 + (w * (i + 0.5)) / nx;
        const pz = z0 + (d * (j + 0.5)) / nz;
        ctx.lights.cool.push(pointLight(0xdfe8ff, intensity, reach, [px, yTop - 0.6, pz]));
      }
    }
  }
  return { y0, yTop, frames, w, d };
}

// Long horizontal wall light bar (Imperial corridor signature): black housing with a soft white strip.
export function wallLightBar(frame, u0, u1, v, mat = "emitWhiteSoft") {
  const len = u1 - u0;
  frame.box("satinBlack", (u0 + u1) / 2, v, 0.03, len, 0.16, 0.06);
  frame.box(mat, (u0 + u1) / 2, v, 0.062, len - 0.06, 0.08, 0.01, { uv: "keep" });
}

// Wall-mounted console: black slanted desk with a screen and a button row. u is the centre along the wall.
export function wallConsole(frame, u, width, matScreen = "screen4", opts = {}) {
  const { height = 1.05, depth = 0.55 } = opts;
  frame.box("satinBlack", u, height / 2, depth / 2, width, height, depth);
  frame.box("satinBlack", u, height + 0.14, depth * 0.55, width, 0.28, depth * 0.9, { tilt: -0.5 });
  frame.box(matScreen, u, height + 0.16, depth * 0.55 + 0.13, width - 0.12, 0.2, 0.01, { uv: "keep", tilt: -0.5 });
  frame.box("leds", u, height + 0.02, depth + 0.005, width - 0.2, 0.05, 0.01, { uv: "keep" });
  frame.collider(u - width / 2, u + width / 2, 0, height + 0.3, 0, depth + 0.05, "console");
}

export { Frame, ceilingFrame, pointLight, DOOR_H };
