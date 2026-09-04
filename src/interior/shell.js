// Room shell: floor, ceiling and four Imperial walls with the door openings the layout demands.
// Rooms build their own contents; hero rooms (bridge, hangar, reactor) may skip walls and build custom
// enclosures via opts.skip.
import * as THREE from "three";
import { STD, doorsOf, doorSize, roomFloorY } from "../config/layout.js";
import { wallFrame, ceilingFrame } from "../core/frame.js";
import { impWall, impCeiling, impFloor, walkable, doorSign } from "./impKit.js";
import { IMP } from "../materials/imperial.js";

// Wall descriptors for a room box: id, from, to, axis/at for door matching, u mapping
export function roomWalls(room) {
  const [x0, z0, x1, z1] = room.box;
  const t = STD.wallT;
  return {
    north: { from: [x0, z0 + t], to: [x1, z0 + t], axis: "z", at: z0, u: (c) => c - x0, length: x1 - x0 },
    south: { from: [x1, z1 - t], to: [x0, z1 - t], axis: "z", at: z1, u: (c) => x1 - c, length: x1 - x0 },
    west: { from: [x0 + t, z1], to: [x0 + t, z0], axis: "x", at: x0, u: (c) => z1 - c, length: z1 - z0 },
    east: { from: [x1 - t, z0], to: [x1 - t, z1], axis: "x", at: x1, u: (c) => c - z0, length: z1 - z0 },
  };
}

// Openings (doors from the layout) for a wall of a room, in wall coordinates
export function wallOpenings(roomId, room, wallKey) {
  const w = roomWalls(room)[wallKey];
  const out = [];
  for (const d of doorsOf(roomId)) {
    if (d.axis !== w.axis || Math.abs(d.at - w.at) > 1e-6) continue;
    const { w: dw, h: dh } = doorSize(d);
    const uc = w.u(d.c);
    out.push({ type: "door", u0: uc - dw / 2, u1: uc + dw / 2, v0: 0, v1: dh, door: d });
  }
  return out;
}

/**
 * Build a room shell.
 * opts.skip: array of 'floor'|'ceiling'|'north'|'south'|'east'|'west'
 * opts.walls: per-wall impWall options (object keyed by wall) merged over opts.wall
 * opts.extraOpenings: per-wall arrays of openings appended (windows / holes)
 * opts.floor / opts.ceiling: impFloor / impCeiling options
 */
export function buildShell(kit, ctx, roomId, room, opts = {}) {
  const floorY = ctx.floorY !== undefined ? ctx.floorY : roomFloorY(roomId);
  const h = room.h;
  const [x0, z0, x1, z1] = room.box;
  const skip = new Set(opts.skip || []);
  const walls = roomWalls(room);
  const seedBase = opts.seed || hashId(roomId);

  if (!skip.has("floor")) {
    impFloor(kit, room.box, floorY, { tone: IMP.wallDark, strip: !!room.corridor, stripAxis: x1 - x0 > z1 - z0 ? "x" : "z", ...(opts.floor || {}) });
    walkable(ctx, x0, z0, x1, z1, floorY, roomId);
  }
  if (!skip.has("ceiling")) {
    const f = ceilingFrame(kit, x0, z0, floorY + h);
    impCeiling(f, x1 - x0, z1 - z0, { seed: seedBase + 3, ...(opts.ceiling || {}) });
  }
  let wi = 0;
  for (const key of ["north", "south", "west", "east"]) {
    wi++;
    if (skip.has(key)) continue;
    const w = walls[key];
    const openings = [...wallOpenings(roomId, room, key), ...((opts.extraOpenings && opts.extraOpenings[key]) || [])];
    const { frame, length } = wallFrame(kit, w.from, w.to, floorY);
    const wallOpts = { seed: seedBase + wi * 11, tag: roomId + ":" + key, ...(opts.wall || {}), ...((opts.walls && opts.walls[key]) || {}) };
    impWall(frame, length, h, { openings, ...wallOpts });
    // sign above every door on this wall
    for (const op of openings) {
      if (op.type !== "door") continue;
      const u = (op.u0 + op.u1) / 2;
      const locked = op.door ? !!op.door.locked : false;
      if (op.v1 + 0.5 < h) doorSign(frame, u, op.v1 + 0.28, { color: locked ? "emitRed" : "emitBlue", decal: locked ? 5 : op.lift ? 14 : 7 });
    }
  }
  return { floorY, h, walls };
}

export function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}

export { THREE };
