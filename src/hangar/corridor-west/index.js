// d4-corridor-west — Deck 4 port service corridor along the hangar's aft wall (corridor kit §9.3).
// Mirror of d4-corridor-east: 130 m from the lift lobby to a locked future-expansion door; the repair
// bay opens off its forward wall (the corridor's right wall, since it runs toward -x). Port identity:
// blue accents, "4-W" section markers, REPAIR signage, a different dressing rotation from its seed.
import { corridorSegment, openingFromDoor } from "../../systems/corridor/corridor.js";
import { deckPlacard } from "../../systems/corridor/props.js";
import { textMaterials } from "../../systems/corridor/text.js";

const FLOOR = -72;
const HEIGHT = 3.2;
const WIDTH = 3.5;
const Z = 171.75; // centreline
const SEG = { from: [-10, Z], to: [-140, Z], width: WIDTH };
const B = { min: [-140, FLOOR, 170], max: [-10, FLOOR + HEIGHT, 173.5] };
const AFT = 173.34;
const FWD = 170.16;

const DOORS = [
  { id: "d4-lobby-west", pos: [-10, FLOOR, Z], dir: [1, 0, 0], kind: "standard", to: "d4-lobby" },
  { id: "d4-repair-aft", pos: [-111, FLOOR, 170], dir: [0, 0, -1], kind: "standard", to: "d4-repair-bay" },
  { id: "d4-corridor-west-end", pos: [-140, FLOOR, Z], dir: [-1, 0, 0], kind: "standard", to: null },
];

export default {
  id: "d4-corridor-west",
  name: "Deck 4 Corridor — Port",
  kind: "room",
  deck: 4,
  owner: "D",
  bounds: B,
  doors: DOORS,
  lift: null,
  spawn: { pos: [-13, FLOOR, Z], yaw: 90 },
  apertures: [],
  materials: textMaterials,
  views: {
    "d4-corridor-west-long": { pos: [-12.5, FLOOR, Z], yaw: 90, pitch: 1 },
    "d4-corridor-west-repair-door": { pos: [-106.5, FLOOR, 172.6], yaw: 62, pitch: 3 },
    "d4-corridor-west-end": { pos: [-134, FLOOR, Z + 0.4], yaw: 84, pitch: 2 },
  },
  build(ctx) {
    const { kit } = ctx;
    const res = corridorSegment(kit, {
      ...SEG,
      floorY: FLOOR,
      height: HEIGHT,
      openings: DOORS.map((d) => openingFromDoor(d, SEG)),
      accent: "impBlue",
      label: "4-W",
      seed: ctx.seed + 3, // a different dressing rotation from the starboard corridor
      // running -x, the aft (+z) wall is L: keep its two cap-side placards free of dressing and greebles
      reserved: [
        { side: "L", u0: 1.8, u1: 3.4 },
        { side: "L", u0: 126.8, u1: 128.4 },
      ],
      lights: ctx.lights,
      tag: "d4-corridor-west",
    });
    // reader facing +z has +x (the lobby) on the left
    deckPlacard(kit, { pos: [-12.6, FLOOR + 1.7, AFT], normal: [0, 0, -1], w: 1.1, h: 0.34, title: "LIFT LOBBY", sub: "TURBOLIFT T4 - STAIRS", arrow: "←", accent: "impBlue" });
    deckPlacard(kit, { pos: [-108.4, FLOOR + 1.7, FWD], normal: [0, 0, 1], w: 1.1, h: 0.34, title: "REPAIR BAY", sub: "4-W - MAINTENANCE", arrow: "←", accent: "impBlue" });
    deckPlacard(kit, { pos: [-137.6, FLOOR + 1.7, AFT], normal: [0, 0, -1], w: 1.2, h: 0.34, title: "SECTION 4-W END", sub: "SEALED - NO ACCESS", accent: "impRed" });
    return { api: { segment: res } };
  },
};
