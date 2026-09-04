// d4-corridor-east — Deck 4 starboard service corridor along the hangar's aft wall (corridor kit §9.3).
// 130 m straight run from the lift lobby to a locked future-expansion door; the cargo bay opens off its
// forward (left) wall. Starboard identity: amber accents, "4-E" section markers, CARGO signage.
import { corridorSegment, openingFromDoor } from "../../systems/corridor/corridor.js";
import { deckPlacard } from "../../systems/corridor/props.js";
import { textMaterials } from "../../systems/corridor/text.js";

const FLOOR = -72;
const HEIGHT = 3.2;
const WIDTH = 3.5;
const Z = 171.75; // centreline
const SEG = { from: [10, Z], to: [140, Z], width: WIDTH };
const B = { min: [10, FLOOR, 170], max: [140, FLOOR + HEIGHT, 173.5] };
const AFT = 173.34; // inner face of the aft (right) wall
const FWD = 170.16; // inner face of the forward (left) wall

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
  materials: textMaterials,
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
      accent: "impAmber",
      label: "4-E",
      seed: ctx.seed,
      // the two placards beside the end caps sit on the aft (R) wall outside any door-sign zone
      reserved: [
        { side: "R", u0: 1.8, u1: 3.4 },
        { side: "R", u0: 126.8, u1: 128.4 },
      ],
      lights: ctx.lights,
      tag: "d4-corridor-east",
    });
    // Wayfinding: lobby behind you at the start (reader faces +z, so -x is to the right), cargo bay door on
    // the forward wall, sealed section end on the aft wall beside the locked door.
    deckPlacard(kit, { pos: [12.6, FLOOR + 1.7, AFT], normal: [0, 0, -1], w: 1.1, h: 0.34, title: "LIFT LOBBY", sub: "TURBOLIFT T4 - STAIRS", arrow: "→", accent: "impAmber" });
    deckPlacard(kit, { pos: [108.4, FLOOR + 1.7, FWD], normal: [0, 0, 1], w: 1.1, h: 0.34, title: "CARGO BAY", sub: "4-E - LOGISTICS", arrow: "→", accent: "impAmber" });
    deckPlacard(kit, { pos: [137.6, FLOOR + 1.7, AFT], normal: [0, 0, -1], w: 1.2, h: 0.34, title: "SECTION 4-E END", sub: "SEALED - NO ACCESS", accent: "impRed" });
    return { api: { segment: res } };
  },
};
