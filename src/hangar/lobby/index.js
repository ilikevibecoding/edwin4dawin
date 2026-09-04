// d4-lobby — Deck 4 turbolift lobby (Phase 1 greybox).
import * as THREE from "three";
import { doorOpening } from "../../systems/doors/helper.js";
import { LIFT_DOOR } from "../../systems/lifts/helper.js";

const FLOOR = -72;
const CEIL = -67.5;
const B = { min: [-10, FLOOR, 170], max: [10, CEIL, 181] };
const T = 0.16; // wall thickness

const DOORS = [
  { id: "d4-hangar-aft", pos: [0, FLOOR, 170], dir: [0, 0, -1], kind: "blast", to: "d4-hangar" },
  { id: "d4-lobby-east", pos: [10, FLOOR, 171.75], dir: [1, 0, 0], kind: "standard", to: "d4-corridor-east" },
  { id: "d4-lobby-west", pos: [-10, FLOOR, 171.75], dir: [-1, 0, 0], kind: "standard", to: "d4-corridor-west" },
  { id: "d4-lobby-stairs", pos: [7, FLOOR, 181], dir: [0, 0, 1], kind: "standard", to: "d4-stairs" },
];
const LIFT = { id: "T4", pos: [0, FLOOR, 181], dir: [0, 0, -1] };

// Axis-aligned wall slab with rectangular holes. plane "z": wall at z=c spanning x a0..a1; plane "x": at x=c spanning z a0..a1.
function wallWithHoles(kit, mat, plane, c, a0, a1, y0, y1, holes, opts) {
  const slabs = [];
  let cursor = a0;
  const sorted = [...holes].sort((p, q) => p.u0 - q.u0);
  for (const h of sorted) {
    if (h.u0 > cursor) slabs.push({ u0: cursor, u1: h.u0, v0: y0, v1: y1 });
    if (h.v1 < y1) slabs.push({ u0: h.u0, u1: h.u1, v0: h.v1, v1: y1 });
    if (h.v0 > y0) slabs.push({ u0: h.u0, u1: h.u1, v0: y0, v1: h.v0 });
    cursor = Math.max(cursor, h.u1);
  }
  if (cursor < a1) slabs.push({ u0: cursor, u1: a1, v0: y0, v1: y1 });
  for (const s of slabs) {
    if (s.u1 - s.u0 < 1e-3 || s.v1 - s.v0 < 1e-3) continue;
    const min = plane === "z" ? [s.u0, s.v0, c - T / 2] : [c - T / 2, s.v0, s.u0];
    const max = plane === "z" ? [s.u1, s.v1, c + T / 2] : [c + T / 2, s.v1, s.u1];
    kit.boxMM(mat, min, max, opts);
    kit.collider(min, max, "wall");
  }
}

export default {
  id: "d4-lobby",
  name: "Deck 4 Lift Lobby",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: LIFT,
  spawn: { pos: [0, FLOOR, 176], yaw: 0 },
  apertures: [],
  views: {
    "d4-lobby-lift": { pos: [0, FLOOR, 173.5], yaw: 180, pitch: 2 },
    "d4-lobby-hangar-door": { pos: [0, FLOOR, 179], yaw: 0, pitch: 0 },
  },
  build(ctx) {
    const { kit, PALETTE } = ctx;
    const { min, max } = B;
    // floor / ceiling (inner faces at the bounds; slabs sit just outside so neighbours never overlap)
    kit.boxMM("impFloor", [min[0], FLOOR - 0.12, min[2]], [max[0], FLOOR, max[2]], { color: PALETTE.impDark, texel: 0.5 });
    kit.boxMM("impPanel", [min[0], CEIL, min[2]], [max[0], CEIL + 0.12, max[2]], { color: PALETTE.impMid, texel: 0.5 });
    // walls, holes from the door contract
    const holesOn = (plane, c) =>
      DOORS.filter((d) => (plane === "z" ? Math.abs(d.pos[2] - c) < 1e-3 : Math.abs(d.pos[0] - c) < 1e-3)).map((d) => {
        const o = doorOpening(d);
        return { u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1 };
      });
    const liftHole = { u0: LIFT.pos[0] - LIFT_DOOR.w / 2, u1: LIFT.pos[0] + LIFT_DOOR.w / 2, v0: FLOOR, v1: FLOOR + LIFT_DOOR.h };
    const wallOpts = { color: PALETTE.impGrey, texel: 0.7 };
    wallWithHoles(kit, "impPanel", "z", min[2] + T / 2, min[0], max[0], FLOOR, CEIL, holesOn("z", min[2]), wallOpts); // forward (hangar)
    wallWithHoles(kit, "impPanel", "z", max[2] - T / 2, min[0], max[0], FLOOR, CEIL, [...holesOn("z", max[2]), liftHole], wallOpts); // aft (lift + stairs)
    wallWithHoles(kit, "impPanel", "x", min[0] + T / 2, min[2], max[2], FLOOR, CEIL, holesOn("x", min[0]), wallOpts); // west
    wallWithHoles(kit, "impPanel", "x", max[0] - T / 2, min[2], max[2], FLOOR, CEIL, holesOn("x", max[0]), wallOpts); // east
    // greybox light channel + descriptors
    kit.boxMM("emitWhite", [-0.3, CEIL - 0.03, min[2] + 1], [0.3, CEIL - 0.01, max[2] - 1]);
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.8, 173], color: 0xdfe8ff, intensity: 18, distance: 14, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: [0, CEIL - 0.8, 179], color: 0xdfe8ff, intensity: 18, distance: 14, priority: 0.7 });
    return {};
  },
};
