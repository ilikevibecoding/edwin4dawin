// Fixed numbers for d4-hangar (docs/status/d-hangar-systems.md + COORDINATION.md §6.2). Everything in
// this folder builds to these; nothing here may change without the parent agent.
import * as THREE from "three";
import { WALL_T } from "../../systems/doors/helper.js";

export { WALL_T };
export const FLOOR = -72;
export const CEIL = -12;
export const SHAFT_BOTTOM = -85; // keel plate: A owns y <= -85
export const BOUNDS = { min: [-80, SHAFT_BOTTOM, -70], max: [80, CEIL, 170] };
export const HALL = { x0: -80, x1: 80, z0: -70, z1: 170 };

// floor aperture (open to space)
export const HOLE = { x0: -36, x1: 36, z0: -30, z1: 94 };
export const HOLE_CENTER = [0, SHAFT_BOTTOM, 32];
// tractor emitters: the traffic system draws the beam from these points
export const TRACTOR_POINTS = [
  [-36, -73, -30],
  [36, -73, -30],
  [-36, -73, 94],
  [36, -73, 94],
];

export const DOORS = [
  { id: "d4-hangar-aft", pos: [0, FLOOR, 170], dir: [0, 0, 1], kind: "blast", to: "d4-lobby" },
  { id: "d4-control-gantry", pos: [-8, -60, 170], dir: [0, 0, 1], kind: "hatch", to: "d4-control" },
  { id: "d4-hangar-fighter", pos: [80, FLOOR, 15], dir: [1, 0, 0], kind: "bay", w: 14, h: 10, to: "d4-fighter-bay" },
  { id: "d4-hangar-cargo", pos: [80, FLOOR, 120], dir: [1, 0, 0], kind: "bay", w: 10, h: 8, to: "d4-cargo-bay" },
  { id: "d4-hangar-shuttle", pos: [-80, FLOOR, 15], dir: [-1, 0, 0], kind: "bay", w: 16, h: 12, to: "d4-shuttle-bay" },
  { id: "d4-hangar-repair", pos: [-80, FLOOR, 120], dir: [-1, 0, 0], kind: "bay", w: 14, h: 10, to: "d4-repair-bay" },
  { id: "d4-hangar-bow", pos: [0, FLOOR, -70], dir: [0, 0, -1], kind: "blast", to: null },
];
export const DOOR_LABELS = {
  "d4-hangar-fighter": "BAY 1",
  "d4-hangar-cargo": "BAY 2",
  "d4-hangar-shuttle": "BAY 3",
  "d4-hangar-repair": "BAY 4",
  "d4-hangar-aft": "LIFT LOBBY",
  "d4-hangar-bow": "FORWARD SECTIONS",
};

// control-tower window hole in the aft wall (z = 170 face); the control room glazes it from its side
export const WINDOW = { x0: -10, x1: 10, y0: -58.6, y1: -56.0 };
// balcony reached through the control-gantry hatch
export const BALCONY = { x0: -12, x1: 12, z0: 166, z1: 170, y: -60 };

// rack tiers: fighter centres. The slot rows sit between the two bay doors of each side wall (z 15 and
// z 120): every slot centre is >= 15 m from a door centre, and the tiers are 16 m apart (9 m of air
// between a tier-1 fighter's top and a tier-2 fighter's belly).
export const RACK = {
  wallX: 80,
  centreX: 70,
  tiers: [
    { tier: 1, y: -62, platformY: -65.6 },
    { tier: 2, y: -46, platformY: -49.6 },
  ],
  slotsZ: [30, 40, 50, 60, 70, 80, 90],
  zoneZ0: 24,
  zoneZ1: 98,
  clampDX: 4.0, // clamp arms at +-4.0 m in x from the fighter centre
  platformX0: 78.3, // service platform inner edge (|x|); its back edge is the wall panel front
  clearR: 4.2, // nothing but the clamp arms inside this radius of a fighter centre
};
// deck -> tier-1 stairs: foot on the deck at z 106, climbing forward to land on the platform's aft end
export const STAIRS = { starboard: { foot: 106, top: 98 }, port: { foot: 106, top: 98 } };
// caged ladders deck -> tier 2 -> catwalk, z positions (both sides), between cradles
export const LADDER_Z = [45, 75];
// maintenance catwalk ring round all four walls (plate top), 1.0 m wide, standing on the third
// structural band (top y -35.6); openingH = clear height of its pass-through in each frame rib
export const CATWALK = { y: -35.46, w: 1.0, openingH: 2.8 };

// landing pads (centre x,z, radius) and their numbers
export const PADS = [
  { n: "01", x: -22, z: 118, r: 7 },
  { n: "02", x: 22, z: 118, r: 7 },
  { n: "03", x: -22, z: 142, r: 7 },
  { n: "04", x: 22, z: 142, r: 7 },
  { n: "05", x: -20, z: -52, r: 7 },
  { n: "06", x: 20, z: -52, r: 7 },
];
export const TAXI_X = 52; // taxi lanes run along x = +-52 between the aperture rail and the racks

// ribs (frame profiles hugging wall + ceiling): transverse every 20 m along z, longitudinal along x
export const RIB_Z = [-65, -45, -25, -5, 15, 35, 55, 75, 95, 115, 135, 155];
export const RIB_X = [-60, -40, -20, 20, 40, 60];
export const RIB_W = 1.6;
export const RIB_D = 1.2;
export const PANEL_W = 4.0;
export const SEAM = 0.1;
export const BAND_EVERY = 12;

export const RAIL_H = 1.02;
export const RAIL_MID = 0.55;
export const RAIL_KICK = 0.15;

// local colours that the shared PALETTE does not carry
export const HG = {
  yellow: new THREE.Color("#e4c035"),
  white: new THREE.Color("#e6e8ec"),
  red: new THREE.Color("#b8221a"),
  steel: new THREE.Color("#9ea3aa"),
  gunmetal: new THREE.Color("#4a4e55"),
  rubber: new THREE.Color("#ffffff"),
};
