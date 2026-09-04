// Door opening geometry shared by every room author and the doors system (COORDINATION.md §9.1).
// Rooms leave a clean rectangular hole of exactly this size on their bounds face; the doors system
// builds the frame, leaves and tunnel lining into it. Import from any deck:
//   import { doorHole, doorOpening, WALL_T } from "../../systems/doors/helper.js";

// Clear opening sizes (metres) per door kind. "bay" doors carry their own {w, h} on the manifest entry.
export const DOOR_KINDS = {
  standard: { w: 2.4, h: 3.0 },
  blast: { w: 4.0, h: 4.0 },
  hatch: { w: 1.2, h: 2.0 },
};

// Wall thickness the doors system assumes per room (Kestrel's WALL_T). Two rooms sharing a face have
// their inner wall surfaces 2 * WALL_T apart; the tunnel lining spans that gap.
export const WALL_T = 0.16;

// Frame reveal the doors system adds around the clear opening on each face (rooms may keep panels
// this far from the hole edge without being overlapped by the frame).
export const FRAME_W = 0.22;

/** @returns {{w:number,h:number}} clear opening for a door kind or a manifest door entry */
export function doorHole(kindOrDoor) {
  if (typeof kindOrDoor === "string") {
    const k = DOOR_KINDS[kindOrDoor];
    if (!k) throw new Error("doorHole: unknown door kind " + kindOrDoor);
    return { ...k };
  }
  const d = kindOrDoor;
  if (d.kind === "bay") {
    if (!(d.w > 0 && d.h > 0)) throw new Error(`doorHole: bay door ${d.id} needs w and h`);
    return { w: d.w, h: d.h };
  }
  return doorHole(d.kind || "standard");
}

/**
 * World-space description of a door opening from a manifest entry.
 * pos = opening centre at floor level on the bounds face, dir = outward normal (axis-aligned).
 * @returns {{
 *   w:number, h:number, pos:number[], dir:number[], axis:"x"|"z", across:"x"|"z",
 *   min:number[], max:number[],          // AABB of the hole through a 2*WALL_T shared wall
 *   u0:number, u1:number, v0:number, v1:number, // extents along the wall's horizontal axis and up
 *   center:number[]                      // centre of the opening at mid height
 * }}
 */
export function doorOpening(door, wallT = WALL_T) {
  const { w, h } = doorHole(door);
  const [px, py, pz] = door.pos;
  const [dx, , dz] = door.dir;
  const axis = Math.abs(dx) > Math.abs(dz) ? "x" : "z"; // wall normal axis
  const across = axis === "x" ? "z" : "x";
  const half = w / 2;
  const min = [px, py, pz];
  const max = [px, py + h, pz];
  if (axis === "x") {
    min[0] = px - wallT;
    max[0] = px + wallT;
    min[2] = pz - half;
    max[2] = pz + half;
  } else {
    min[2] = pz - wallT;
    max[2] = pz + wallT;
    min[0] = px - half;
    max[0] = px + half;
  }
  const u = across === "x" ? px : pz;
  return { w, h, pos: door.pos, dir: door.dir, axis, across, min, max, u0: u - half, u1: u + half, v0: py, v1: py + h, center: [px, py + h / 2, pz] };
}

/**
 * Convert a door on a room's face into a panelGrid-style opening {u0,u1,v0,v1,type:"door"} for a wall
 * frame whose origin is `wallFrom` ([x,z] at floor level) running toward `wallTo`.
 */
export function doorAsWallOpening(door, wallFrom, wallTo) {
  const { w, h } = doorHole(door);
  const ux = wallTo[0] - wallFrom[0];
  const uz = wallTo[1] - wallFrom[1];
  const len = Math.hypot(ux, uz);
  const t = ((door.pos[0] - wallFrom[0]) * ux + (door.pos[2] - wallFrom[1]) * uz) / len;
  return { type: "door", u0: t - w / 2, u1: t + w / 2, v0: 0, v1: h, id: door.id };
}
