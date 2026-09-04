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
// service gallery at y -60 (12 m up, on the first structural band): the whole bow and aft walls (either
// side of the balcony), and the side walls outside the rack zone and clear of the bay-door surrounds
export const GALLERY = { y: -60, w: 1.2, openingH: 2.8 };
export const GALLERY_SPANS = {
  aft: [[-78.5, BALCONY.x0 - 0.5], [BALCONY.x1 + 0.5, 78.5]],
  bow: [[-78.5, 78.5]],
  starboard: [[-68.5, 3], [131, 168.5]],
  port: [[-68.5, 3], [131, 168.5]],
};

// the four spot descriptors of the light plan: each is a real ceiling flood fixture with a lit lens
// (walls.js builds the housing at `pos`, index.js lights it toward `target`). Two pools centred on pads
// 03/04 (0.21 rad from 55 m up: a 10 m pool with the full-intensity core 5 m wide, so the pad ring sits
// in the penumbra and the apron lane between the pads stays dark - from the balcony camera the two pads
// read as pools with edges, from the spawn the pool halves flank the lane), and one key light per side
// aimed at the tier-1 fighters (0.24 rad, ~520: the cone stops short of the wall behind tier 2, and the
// panel wall behind tier 1 takes a mid-grey wash instead of a blown-out patch). The first one casts the
// shadows.
export const FLOODS = [
  { pos: [-22, -17, 143], target: [-22, FLOOR, 142], angle: 0.21, penumbra: 0.5, intensity: 1300 },
  { pos: [22, -17, 143], target: [22, FLOOR, 142], angle: 0.21, penumbra: 0.5, intensity: 1300 },
  { pos: [-44, -17, 42], target: [-70, -60, 42], angle: 0.24, penumbra: 0.4, intensity: 520 },
  { pos: [44, -17, 42], target: [70, -60, 42], angle: 0.24, penumbra: 0.4, intensity: 520 },
];

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
  black: new THREE.Color("#111214"),
  shadow: new THREE.Color("#000000"),
};

// emitter levels (linear light) for the vertex-level emitter materials.hgEmit: everything here stays
// under the bloom threshold (1.15) so it glows as a lit surface instead of clipping to white
export const EM = {
  lens: new THREE.Color(0.98, 1.0, 1.08), // housed ceiling / wall flood lenses
  strip: new THREE.Color(0.88, 0.9, 0.98), // balcony rail strip, hatch slits
  jamb: new THREE.Color(0.58, 0.6, 0.68), // caged bay-door jamb bars (about 40 % of emitWhite)
  crane: new THREE.Color(1.02, 1.04, 1.1), // crane under-girder strips
  amberGlow: new THREE.Color(0.34, 0.16, 0.03), // behind the vent louvres (a warm glow through the slats, not a lamp)
  blueGlow: new THREE.Color(0.3, 0.45, 0.85), // behind the hatch slats
  window: new THREE.Color(0.46, 0.54, 0.76), // tower / lift window bands (lit glazing, not a lamp)
};
