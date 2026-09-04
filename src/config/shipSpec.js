// Single source of truth for the Star Destroyer's dimensions, decks, rooms, lifts and hangar layout.
// Units are metres, ship forward is -Z, up is +Y, origin at the hull centroid. Every builder (exterior
// chunks, room modules, lifts, traffic paths, camera presets) reads from here so the interior always sits
// where the exterior says it should.

export const HULL = {
  length: 1600,
  bowZ: -800,
  sternZ: 800,
  beam: 900, // full width at the stern
  dorsalRidge: 60, // centreline height above the trench plane at the stern
  ventralKeel: -95, // centreline depth below the trench plane at the stern
  trenchHeight: 18,
  // ventral keel block under the hangar: its flat underside is the hangar deck, the well opens through it
  keelPlate: { x: 60, z0: 340, z1: 580, y: -82 },
  // the wedge narrows linearly; half-width at a given z
  halfWidthAt(z) {
    const t = (z - this.bowZ) / this.length;
    return Math.max(0, t) * (this.beam / 2);
  },
  // dorsal / ventral surface heights at (x, z): shallow pyramids toward the centreline
  dorsalY(x, z) {
    const hw = this.halfWidthAt(z);
    if (hw < 1) return 0;
    const t = (z - this.bowZ) / this.length;
    return this.dorsalRidge * t * Math.max(0, 1 - Math.abs(x) / hw);
  },
  ventralY(x, z) {
    const hw = this.halfWidthAt(z);
    if (hw < 1) return 0;
    const t = (z - this.bowZ) / this.length;
    return this.ventralKeel * t * Math.max(0, 1 - Math.abs(x) / hw);
  },
};

export const SUPERSTRUCTURE = {
  // terraces: [halfX, z0, z1, yTop]
  terraces: [
    [160, 150, 560, 78],
    [120, 210, 560, 104],
    [80, 290, 560, 130],
  ],
};

export const TOWER = {
  neck: { halfX: 45, z0: 480, z1: 560, y0: 130, y1: 250 },
  slab: { halfX: 135, z0: 470, z1: 590, y0: 250, y1: 290 },
  domes: { radius: 22, positions: [[-90, 305, 530], [90, 305, 530]] },
  spire: { x: 0, z: 545, y0: 290, y1: 360 },
};

export const ENGINES = {
  sternZ: 800,
  main: { radius: 60, positions: [[-190, -10], [0, -10], [190, -10]] }, // [x, y]
  aux: { radius: 24, positions: [[-330, -5], [-95, 45], [95, 45], [330, -5]] },
};

// Hangar mouth on the belly (also the interior hangar well) and the reserved secondary bay.
export const HANGAR = {
  well: { x0: -20, x1: 20, z0: 430, z1: 500, y: -80 }, // opening in the hangar deck / keel block underside
  deckY: -80,
  ceilingY: -42,
  bounds: { x0: -32, x1: 32, z0: 410, z1: 520 },
  rackY: -58, // fighter parking racks hang from here
  rackX: [-14, 14], // two rack rows over the well
  rackZ: [440, 456, 472, 488],
  blastDoorLeaves: 2,
  tractorField: { color: 0x66b6ff, strength: 0.35 },
  secondaryBayDoor: { x0: -16, x1: 16, z0: 360, z1: 400 }, // reserved, stays closed this milestone
};

// Turbolift shafts (constant x/z through every deck they serve).
export const LIFTS = {
  lift1: { x0: -1.5, x1: 1.5, z0: 562, z1: 565, doorSide: "-z", decks: ["A", "B"], vmax: 6, accel: 3 },
  lift2: { x0: -40, x1: -37, z0: 478, z1: 481, doorSide: "+x", decks: ["B", "C", "D"], vmax: 45, accel: 12 },
};

export const DECKS = {
  A: { name: "Command deck", floorY: 265, height: 3.2, zone: "tower" },
  B: { name: "Crew deck", floorY: 252, height: 3.2, zone: "tower" },
  C: { name: "Engineering deck", floorY: 18, height: 4.0, zone: "engineering" },
  D: { name: "Hangar deck", floorY: -80, height: 38, zone: "hangar" },
};

export const ZONES = {
  tower: { decks: ["A", "B"], lifts: ["lift1", "lift2"] },
  engineering: { decks: ["C"], lifts: ["lift2"] },
  hangar: { decks: ["D"], lifts: ["lift2"] },
};

// Corridors: axis-aligned boxes at deck floor level. width is the clear width.
export const CORRIDORS = [
  { id: "A-spine", deck: "A", x0: -1.5, x1: 1.5, z0: 494, z1: 556 },
  { id: "A-cross", deck: "A", x0: -44, x1: -1.5, z0: 496, z1: 499 },
  { id: "A-cross2", deck: "A", x0: 1.5, x1: 44, z0: 496, z1: 499 },
  { id: "B-lobby", deck: "B", x0: -4, x1: 4, z0: 478, z1: 484 },
  { id: "B-lift2", deck: "B", x0: -37, x1: -4, z0: 478, z1: 481 },
  { id: "B-spine", deck: "B", x0: -1.5, x1: 1.5, z0: 484, z1: 556 },
  { id: "C-spine", deck: "C", x0: -37, x1: 86, z0: 478, z1: 481 },
  { id: "D-lift2", deck: "D", x0: -37, x1: -32, z0: 478, z1: 481 },
];

// Rooms. bounds are interior clear volumes (floor at deck floorY unless floorY is given).
// doors: wall openings that connect to a corridor or another room; each is [x, z, width, facing, height?]
// where facing is the outward normal axis ('+x' | '-x' | '+z' | '-z') and height defaults to DOOR_H.
// windows: exterior-facing openings the exterior culler uses to decide which hull chunks stay visible.
export const ROOMS = [
  // ---------------- Deck A: command level ----------------
  { id: "bridge", name: "Main bridge", deck: "A", purpose: "Command bridge: walkway, crew pits, forward windows over the hull",
    x0: -16, x1: 16, z0: 471, z1: 494, height: 6.0, doors: [[0, 494, 2.4, "+z"]], windows: ["forward"], accent: "red-blue" },
  { id: "flightControl", name: "Auxiliary flight control", deck: "A", purpose: "Secondary navigation and helm station (former cockpit)",
    x0: -46, x1: -34, z0: 472, z1: 496, height: 2.8, doors: [[-40, 496, 1.7, "+z", 2.35]], windows: ["forward"], accent: "amber", legacy: "kestrel" },
  { id: "tactical", name: "Tactical operations", deck: "A", purpose: "Holographic planning table, fleet-status wall",
    x0: -24, x1: -2, z0: 502, z1: 520, height: 3.6, doors: [[-2, 511, 2.0, "+x"]], accent: "blue" },
  { id: "comms", name: "Communications and sensor control", deck: "A", purpose: "Sensor operator rows, comms arrays, signal displays",
    x0: 2, x1: 24, z0: 502, z1: 520, height: 3.2, doors: [[2, 511, 2.0, "-x"]], accent: "green-blue" },
  { id: "intel", name: "Restricted intelligence room", deck: "A", purpose: "Locked command / intelligence briefing, red lighting",
    x0: 2, x1: 16, z0: 526, z1: 540, height: 3.0, doors: [[2, 533, 1.6, "-x"]], accent: "red", restricted: true },
  { id: "officers", name: "Officers' quarters", deck: "A", purpose: "Four officer cabins off a private hall",
    x0: -24, x1: -2, z0: 526, z1: 544, height: 3.0, doors: [[-2, 535, 1.6, "+x"]], accent: "warm" },
  { id: "observation", name: "Observation gallery", deck: "A", purpose: "Tall forward windows beside the bridge, quiet viewing gallery",
    x0: 20, x1: 44, z0: 471, z1: 496, height: 4.5, doors: [[32, 496, 1.8, "+z"]], windows: ["forward"], accent: "cool" },
  { id: "lift1LobbyA", name: "Lift lobby", deck: "A", purpose: "Turbolift 1 landing, deck directory",
    x0: -4, x1: 4, z0: 556, z1: 562, height: 3.2, doors: [[0, 556, 3.0, "-z"]], accent: "neutral" },

  // ---------------- Deck B: crew level ----------------
  { id: "escapePods", name: "Escape pod bay", deck: "B", purpose: "Ring of pod hatches, evacuation markings, emergency lighting",
    x0: -12, x1: 12, z0: 471, z1: 478, height: 3.2, doors: [[0, 478, 2.0, "+z"]], windows: ["forward-small"], accent: "amber-red" },
  { id: "crewQuarters", name: "Crew quarters", deck: "B", purpose: "Bunk bays for enlisted crew, lockers",
    x0: -26, x1: -2, z0: 486, z1: 502, height: 3.0, doors: [[-2, 494, 1.8, "+x"]], accent: "neutral" },
  { id: "refresher", name: "Refresher", deck: "B", purpose: "Crew washroom",
    x0: -10, x1: -2, z0: 504, z1: 508, height: 2.8, doors: [[-2, 506, 1.2, "+x"]], accent: "cool" },
  { id: "mess", name: "Mess hall and galley", deck: "B", purpose: "Long tables, serving line, food-prep line",
    x0: 2, x1: 26, z0: 486, z1: 508, height: 3.4, doors: [[2, 497, 2.4, "-x"]], accent: "warm" },
  { id: "medbay", name: "Medical bay", deck: "B", purpose: "Treatment beds, bacta-style tank, diagnostics",
    x0: -22, x1: -2, z0: 510, z1: 524, height: 3.2, doors: [[-2, 517, 1.8, "+x"]], accent: "white-blue" },
  { id: "lounge", name: "Recreation lounge", deck: "B", purpose: "Seating, holo-game table, dim warm light",
    x0: 2, x1: 20, z0: 512, z1: 524, height: 3.0, doors: [[2, 518, 1.8, "-x"]], accent: "warm" },
  { id: "briefing", name: "Crew briefing room", deck: "B", purpose: "Tiered seating facing a holo-screen wall",
    x0: -20, x1: -2, z0: 526, z1: 540, height: 3.4, doors: [[-2, 533, 1.8, "+x"]], accent: "blue" },
  { id: "armory", name: "Armoury", deck: "B", purpose: "Weapon racks behind a counter, equipment lockers",
    x0: 2, x1: 18, z0: 526, z1: 540, height: 3.0, doors: [[2, 533, 1.6, "-x"]], accent: "red" },
  { id: "detention", name: "Security and detention block", deck: "B", purpose: "Guard desk, cell row, sealed cell doors",
    x0: -24, x1: -2, z0: 542, z1: 556, height: 3.0, doors: [[-2, 549, 1.6, "+x"]], accent: "red" },
  { id: "lifeSupport", name: "Life support", deck: "B", purpose: "Air scrubbers, water processing, waste reclamation",
    x0: 2, x1: 24, z0: 542, z1: 556, height: 3.6, doors: [[2, 549, 1.8, "-x"]], accent: "cyan" },
  { id: "lift1LobbyB", name: "Lift lobby", deck: "B", purpose: "Turbolift 1 landing",
    x0: -4, x1: 4, z0: 556, z1: 562, height: 3.2, doors: [[0, 556, 3.0, "-z"]], accent: "neutral" },

  // ---------------- Deck C: engineering ----------------
  { id: "engineering", name: "Engineering control", deck: "C", purpose: "Power-distribution boards, status wall, engineer stations",
    x0: 6, x1: 30, z0: 481.5, z1: 500, height: 4.0, doors: [[18, 481.5, 2.4, "-z"]], accent: "amber" },
  { id: "reactor", name: "Main reactor chamber", deck: "C", purpose: "Vertical core, catwalk ring, containment field",
    x0: 4, x1: 48, z0: 440, z1: 477.5, height: 30, doors: [[26, 477.5, 2.8, "+z"]], accent: "blue-white" },
  { id: "hyperdrive", name: "Hyperdrive room", deck: "C", purpose: "Stacked motivator banks, coolant lines, heat shimmer",
    x0: 36, x1: 72, z0: 481.5, z1: 506, height: 6.0, doors: [[54, 481.5, 2.4, "-z"]], accent: "amber-white" },
  { id: "maintenance", name: "Maintenance and repair bay", deck: "C", purpose: "Workshop, parts racks, overhead gantry crane",
    x0: 54, x1: 88, z0: 444, z1: 477.5, height: 8.0, doors: [[70, 477.5, 3.0, "+z"]], accent: "amber" },

  // ---------------- Deck D: hangar ----------------
  { id: "hangar", name: "Main hangar", deck: "D", purpose: "Launch/recovery well, fighter racks, control tower, catwalks, cranes",
    x0: -32, x1: 32, z0: 410, z1: 520, height: 38, doors: [[-32, 479.5, 3.0, "-x"], [32, 460, 6.0, "+x", 5.0], [0, 410, 8.0, "-z", 6.0], [0, 520, 8.0, "+z", 6.0]],
    windows: ["belly"], accent: "white-red" },
  { id: "fighterMaint", name: "Fighter maintenance and refuelling", deck: "D", purpose: "Cradled fighter, fuel lines, parts racks, workbenches",
    x0: 32.5, x1: 60, z0: 420, z1: 500, height: 14, doors: [[32.5, 460, 6.0, "-x", 5.0]], accent: "amber" },
  { id: "shuttleDock", name: "Shuttle docking bay", deck: "D", purpose: "Docking cradle reserved for a future shuttle, sealed belly door",
    x0: -28, x1: 28, z0: 350, z1: 409.5, height: 22, doors: [[0, 409.5, 8.0, "+z", 6.0]], accent: "blue" },
  { id: "cargo", name: "Cargo storage and logistics", deck: "D", purpose: "Container stacks, cargo lifts, loader lanes",
    x0: -30, x1: 30, z0: 520.5, z1: 570, height: 16, doors: [[0, 520.5, 8.0, "-z", 6.0]], accent: "amber" },
];

// Where the legacy Kestrel wing (corridor + cockpit + quarters + galley + refresher, built in its own
// local space with the corridor running z=0..-16) sits inside the command deck.
export const LEGACY_WING = { x: -40, y: 265, z: 496 };

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export function roomFloorY(room) {
  return room.floorY ?? DECKS[room.deck].floorY;
}

// Reserved future systems (see src/systems/reserved.js): listed here so the plan and code agree.
export const RESERVED_SYSTEMS = [
  "flightControl",
  "atmosphericEntry",
  "landingSupports",
  "docking",
  "surfaceContact",
  "hangarDeployment",
  "descentCamera",
  "landingZones",
];
