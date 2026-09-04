// d4-corridor-east — Deck 4 starboard service corridor along the hangar's aft wall (corridor kit §9.3).
// 130 m straight run from the lift lobby to a locked future-expansion door; the cargo bay opens off its
// forward (left) wall.
import { corridorSegment, openingFromDoor } from "../../systems/corridor/corridor.js";
import { deckPlacard } from "../../systems/corridor/props.js";

const FLOOR = -72;
const HEIGHT = 3.2;
const WIDTH = 3.5;
const Z = 171.75; // centreline
const SEG = { from: [10, Z], to: [140, Z], width: WIDTH };
const B = { min: [10, FLOOR, 170], max: [140, FLOOR + HEIGHT, 173.5] };

const DOORS = [
  { id: "d4-lobby-east", pos: [10, FLOOR, Z], dir: [-1, 0, 0], kind: "standard", to: "d4-lobby" },
  { id: "d4-cargo-aft", pos: [111, FLOOR, 170], dir: [0, 0, -1], kind: "standard", to: "d4-cargo-bay" },
  { id: "d4-corridor-east-end", pos: [140, FLOOR, Z], dir: [1, 0, 0], kind: "standard", to: null },
];

export default {
  id: "d4-corridor-east",
  name: "Deck 4 Corridor — Starboard",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [13, FLOOR, Z], yaw: -90 },
  apertures: [],
  views: {
    "d4-corridor-east-long": { pos: [12.5, FLOOR, Z], yaw: -90, pitch: 1 },
    "d4-corridor-east-cargo-door": { pos: [106.5, FLOOR, 172.6], yaw: -62, pitch: 3 },
    "d4-corridor-east-end": { pos: [134, FLOOR, Z + 0.4], yaw: -84, pitch: 2 },
  },
  build(ctx) {
    const { kit } = ctx;
    const res = corridorSegment(kit, {
      ...SEG,
      floorY: FLOOR,
      height: HEIGHT,
      openings: DOORS.map((d) => openingFromDoor(d, SEG)),
      seed: ctx.seed,
      lights: ctx.lights,
      tag: "d4-corridor-east",
    });
    // Wayfinding placards beside the doors (right wall = aft wall z = 173.5, inner face 173.34)
    deckPlacard(kit, { pos: [12.2, FLOOR + 1.55, 173.34], normal: [0, 0, -1], w: 0.9, h: 0.5, lines: 4, accent: "impBlue" });
    deckPlacard(kit, { pos: [108.6, FLOOR + 1.55, 170.16], normal: [0, 0, 1], w: 0.9, h: 0.5, lines: 3, accent: "impAmber" });
    deckPlacard(kit, { pos: [137.8, FLOOR + 1.55, 173.34], normal: [0, 0, -1], w: 0.9, h: 0.5, lines: 2, accent: "impRed" });
    return { api: { segment: res } };
  },
};
