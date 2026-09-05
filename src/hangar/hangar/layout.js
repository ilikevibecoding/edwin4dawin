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

// the fixed spot descriptors of the light plan: each is a real ceiling flood fixture with a lit lens
// (walls.js builds the housing at `pos`, index.js lights it toward `target`). Two apron pools that fall
// 3.5 m inboard and aft of the centres of pads 03/04 (0.23 rad from 55 m up with a 0.65 penumbra: the
// pool is a soft 12 m disc that overlaps the painted ring off-centre, so the ring reads as paint lying in
// a light, not as a lighter disc), and one key light per side aimed at the tier-1 fighters (0.24 rad,
// ~520: the cone stops short of the wall behind tier 2, and the panel wall behind tier 1 takes a mid-
// grey wash instead of a blown-out patch). The crane's two work lights (machinery.js) are spots too:
// the harness pool holds four, and scores them by priority and distance, so the rack keys sit a notch
// under the others - a viewer at the racks still gets them (they are 12 m over that camera), the spawn
// and balcony cameras drop them for the crane pool instead. The top-scoring one casts the shadows.
// Then one threshold flood over each bay door (0.5, 80 m range: from the door's own camera 54 m away it
// scores over the crane pair and lights the tug tracks rolling out of the door; from every other camera
// it is out of range and never displaces a pool). A point light there did not work: 8 m up and 14 m off
// the axis so its mirror image stayed off the glossy leaves, it left the threshold at IBL level.
export const FLOODS = [
  { pos: [-19, -17, 140], target: [-18.5, FLOOR, 138.5], angle: 0.23, penumbra: 0.65, intensity: 1400, priority: 0.9 },
  { pos: [19, -17, 140], target: [18.5, FLOOR, 138.5], angle: 0.23, penumbra: 0.65, intensity: 1400, priority: 0.9 },
  { pos: [-44, -17, 42], target: [-70, -60, 42], angle: 0.24, penumbra: 0.4, intensity: 520, priority: 0.85 },
  { pos: [44, -17, 42], target: [70, -60, 42], angle: 0.24, penumbra: 0.4, intensity: 520, priority: 0.85 },
  ...DOORS.filter((d) => d.kind === "bay").map((d) => {
    const s = Math.sign(d.dir[0]);
    return { pos: [s * 68, -17, d.pos[2]], target: [s * 74, FLOOR, d.pos[2]], angle: 0.2, penumbra: 0.6, intensity: 500, priority: 0.5, distance: 80 };
  }),
];
// the crane's aft park (t = 40 in every frozen view): bridge over z 23 (between the bay-3 door at z 15
// and the first rack slot at z 30: the slung container's far side is 4.2 m short of a fighter turning
// into slot 30, and every approach line runs at z 30 .. 90), the trolley over the outer edge of the
// port taxi lane at x -58 (12 m from the fighter centreline, 4 m outside the lane's edge line), the
// hook block down at y -54 - in the 8 m of air between the tier-1 fighters' tops and the tier-2
// bellies, so the black/yellow block sits against the dark wall behind the racks, not against a
// light-grey fighter - with the slung container's floor 9 m over the lane. From the racks camera
// (x -40, z 30) the block and the container hang 18 m away in the frame's upper right, whole (the
// frame's top edge is at y -50 there), over their own work-light pool, which also reaches the bowser
// group at z 30; from the spawn they are 137 m out in the middle third of the frame under the
// light-grey girders; from the balcony likewise. Nothing hangs inside the rack zone.
export const CRANE_PARK = { z: 23, x: -58, hook: -54 };

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
  nonSlip: new THREE.Color("#15161a"), // the aperture's clean dark non-slip band
};

// emitter levels (linear light) for the vertex-level emitter materials.hgEmit: everything here stays
// under the bloom threshold (1.15) so it glows as a lit surface instead of clipping to white
export const EM = {
  lens: new THREE.Color(0.98, 1.0, 1.08), // housed ceiling / wall flood lenses
  ceil: new THREE.Color(0.4, 0.415, 0.47), // ceiling light runs (a full bay)
  ceilWarm: new THREE.Color(0.42, 0.34, 0.21), // ceiling light runs in the bays relamped with warm tubes (a sixth of them)
  ceilDim: new THREE.Color(0.18, 0.19, 0.22), // ceiling light runs in the 40 % dimmer bays
  off: new THREE.Color(0.012, 0.012, 0.014), // a dead segment: the dark lens is still in its housing
  strip: new THREE.Color(0.88, 0.9, 0.98), // balcony rail strip, hatch slits
  // the aperture rails' strips and post caps: 72 m of them face the spawn 66 m out and the glossy lane
  // mirrors them - at the strip level they merged into one hot bar at the vanishing point
  rail: new THREE.Color(0.4, 0.42, 0.48),
  channel: new THREE.Color(0.72, 0.74, 0.82), // segmented lit channels (tier fascias, waist strips, gallery edges)
  jamb: new THREE.Color(0.5, 0.52, 0.6), // bay-door jamb light channels
  crane: new THREE.Color(0.42, 0.44, 0.5), // crane under-girder and rail strips
  lining: new THREE.Color(0.38, 0.4, 0.46), // shaft lip-beam lining strips (two stops under emitWhite)
  amberGlow: new THREE.Color(0.34, 0.16, 0.03), // behind the vent louvres (a warm glow through the slats, not a lamp)
  amberGrille: new THREE.Color(0.5, 0.24, 0.05), // the amber grilles of the top slot row
  blueGlow: new THREE.Color(0.3, 0.45, 0.85), // behind the hatch slats
  blueGrille: new THREE.Color(0.26, 0.36, 0.62), // dim blue-white behind the top slot-row grilles
  window: new THREE.Color(0.46, 0.54, 0.76), // the control room's ceiling light runs seen through the fake glazing either side of the real window
  glass: new THREE.Color(0.05, 0.065, 0.11), // the fake glazing itself: dark blue-grey glass over a lit room (the real window's interior reads at this level)
  tower: new THREE.Color(0.28, 0.33, 0.48), // the buttress towers' lift / stair window bands (a stop under the control glazing)
  column: new THREE.Color(0.62, 0.64, 0.72), // the vertical light columns flanking the balcony
  laneEdge: new THREE.Color(0.5, 0.38, 0.09), // the forward apron lane's lit edge lines (embedded amber edge lighting: the far lane reads from 200 m)
  jambSealed: new THREE.Color(0.12, 0.125, 0.15), // the sealed bow portal's jamb channels: two stops under the live ones
  // self-lit "paint" levels for structure at the roof, where no light of the plan reaches (the harness
  // environment lights it from above only, so a hull-grey girder seen from below reads black): the
  // crane's hull grey and its steel flanges, and the roof channels' housings and caps, at the sRGB
  // values the lit base storey of the walls has (so they read as the same grey, lit)
  hull: new THREE.Color(0.1, 0.104, 0.115),
  hullLight: new THREE.Color(0.17, 0.174, 0.185),
  housing: new THREE.Color(0.045, 0.047, 0.052),
  housingCap: new THREE.Color(0.09, 0.093, 0.1),
  // the hook block's yellow bands: hazard paint at the value it has under the two work lights right over
  // it (the block hangs 34 m under them, over a dark wall: on plain paint it read as a black rectangle)
  hazard: new THREE.Color(0.55, 0.36, 0.03),
};
