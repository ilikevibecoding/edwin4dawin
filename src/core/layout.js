// Master layout: hull shape functions, superstructure and tower boxes, engines, bay cut-outs, and every
// interior room with its doors and the turbolift network. Single source of truth (see PLAN.md §1–3).
// World frame: +X starboard, +Y dorsal, −Z forward. Metres.

// ---------------------------------------------------------------------------------------------------
// Hull
// ---------------------------------------------------------------------------------------------------
export const HULL = {
  bowZ: -1100,
  sternZ: 500,
  length: 1600,
  halfWidthStern: 450,
  dorsalMax: 46, // plateau height at the stern
  ventralMax: 74, // belly depth at the stern
  plateauFrac: 0.45, // |x| / halfWidth where the dorsal slope reaches the plateau
  trench: { y0: -6, y1: 6, depth: 11 },
  // stern: flat face for |x| <= sternFlatX, then the trailing edge angles forward to the corners
  sternFlatX: 330,
  sternCornerZ: 440,
};

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/** Fraction of the length from the bow (0 at the bow, 1 at the stern). */
export function tOf(z) {
  return clamp((z - HULL.bowZ) / HULL.length, 0, 1);
}

/** Plan-view half width of the wedge at z: straight side edges to the stern corners, then the notch edge. */
export function halfWidth(z) {
  if (z <= HULL.sternCornerZ) return HULL.halfWidthStern * clamp((z - HULL.bowZ) / (HULL.sternCornerZ - HULL.bowZ), 0, 1);
  const slope = (HULL.halfWidthStern - HULL.sternFlatX) / (HULL.sternZ - HULL.sternCornerZ);
  return Math.max(0, HULL.halfWidthStern - slope * (z - HULL.sternCornerZ));
}

/** z of the trailing edge for a given |x| (stern notch). */
export function sternZAt(x) {
  const ax = Math.abs(x);
  if (ax <= HULL.sternFlatX) return HULL.sternZ;
  const k = clamp((ax - HULL.sternFlatX) / (HULL.halfWidthStern - HULL.sternFlatX), 0, 1);
  return HULL.sternZ - (HULL.sternZ - HULL.sternCornerZ) * k;
}

/** Dorsal (top) surface height at (x, z); 0 at the trench edge, rising to the plateau. */
export function dorsalY(x, z) {
  const hw = halfWidth(z);
  if (hw < 1e-3) return 0;
  const t = tOf(z);
  const h = HULL.dorsalMax * Math.pow(t, 0.85);
  const k = clamp((1 - Math.abs(x) / hw) / (1 - HULL.plateauFrac), 0, 1);
  return h * Math.pow(k, 0.9);
}

// Flat belly plate around the ventral bays (the hangar bulge): the analytic belly blends to this depth here.
export const BELLY_PLATE = { x0: -60, x1: 60, z0: -110, z1: 200, y: -68, margin: 24 };

/** Ventral (belly) surface height at (x, z) — negative. Deeper than the dorsal, flat under the hangar bays. */
export function ventralY(x, z) {
  const hw = halfWidth(z);
  if (hw < 1e-3) return 0;
  const t = tOf(z);
  const h = HULL.ventralMax * Math.pow(t, 0.8);
  const k = clamp((1 - Math.abs(x) / hw) / (1 - 0.35), 0, 1);
  const raw = -HULL.trench.y1 - h * Math.pow(k, 0.8);
  const B = BELLY_PLATE;
  const dx = Math.min(x - B.x0, B.x1 - x);
  const dz = Math.min(z - B.z0, B.z1 - z);
  const inside = Math.min(dx, dz);
  if (inside <= -B.margin) return raw;
  const kk = smoothstep(clamp((inside + B.margin) / B.margin, 0, 1));
  return raw + (B.y - raw) * kk;
}

/** Dorsal surface including the trench lip (the hull edge sits at y = +6 / −6). */
export function topY(x, z) {
  return HULL.trench.y1 + dorsalY(x, z);
}
export const bottomY = ventralY;

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** Inside-the-hull test (rough; used for camera clamping and sanity checks). */
export function insideHull(x, y, z) {
  if (z < HULL.bowZ || z > sternZAt(x)) return false;
  if (Math.abs(x) > halfWidth(z)) return false;
  return y < topY(x, z) && y > ventralY(x, z);
}

// Dorsal superstructure ("city") — terraced block on the plateau
export const CITY = {
  z0: -330,
  z1: 470,
  halfWidthAt(z) {
    const k = clamp((z - this.z0) / (this.z1 - this.z0), 0, 1);
    return 35 + 175 * k;
  },
  levels: [
    { y0: 40, y1: 64, inset: 0, z0: -330 }, // level 1 sits into the plateau
    { y0: 64, y1: 78, inset: 22, z0: -270 },
    { y0: 78, y1: 90, inset: 45, z0: -240 },
  ],
  turbolasers: [-150, -30, 90, 210], // z positions of the heavy turrets on the level-1 shoulders (both sides)
};

// Command tower
export const TOWER = {
  neck: [
    { x: 95, z0: 150, z1: 260, y0: 90, y1: 130 },
    { x: 80, z0: 160, z1: 250, y0: 130, y1: 165 },
    { x: 70, z0: 165, z1: 245, y0: 165, y1: 195 },
  ],
  bridge: { x: 120, z0: 170, z1: 230, y0: 195, y1: 235 },
  // glazing slots on the forward face (z = bridge.z0)
  // glazing runs from the bridge deck (y 210) up: the bow is only 9° below a standing eye 1.3 km away, so a
  // sill at any height above the deck would hide the hull from the dais
  windows: [
    { x0: -34, x1: 34, y0: 210.0, y1: 216.5 },
    { x0: -84, x1: -62, y0: 210.0, y1: 215.5 },
  ],
  globes: { x: 92, y: 253, z: 200, r: 22 },
  mast: { x: 0, z: 200, y0: 235, y1: 290, w: 12, dishR: 10, tipY: 305 },
};

// Engines on the stern face
export const ENGINES = {
  main: [
    { x: 0, y: -8, r: 46 },
    { x: -150, y: -6, r: 44 },
    { x: 150, y: -6, r: 44 },
  ],
  aux: [
    { x: -75, y: 30, r: 17 },
    { x: 75, y: 30, r: 17 },
    { x: -255, y: 8, r: 16 },
    { x: 255, y: 8, r: 16 },
  ],
  nozzleLen: 60,
};

// Reactor bulb under the aft belly. Its top (y −20) stays below the engineering deck (floor −10), so the
// sphere never crosses a room volume; it emerges from the belly (y ≈ −72 there) and hangs 108 m below it.
export const REACTOR_BULB = { x: 0, y: -100, z: 330, r: 80 };

// Ventral bays cut through the belly (x0,x1,z0,z1); the shaft runs from the hangar deck to the belly
export const BAYS = {
  hangar: { x0: -22, x1: 22, z0: -70, z1: 50, deckY: -40, bellyY: -68 },
  shuttle: { x0: -14, x1: 14, z0: 110, z1: 160, deckY: -40, bellyY: -68 },
};

// ---------------------------------------------------------------------------------------------------
// Interior rooms
// ---------------------------------------------------------------------------------------------------
export const WALL_T = 0.5; // gap between adjacent room boxes = wall thickness (each room panels 0.2 into it)

/**
 * Room record: id, cluster, title, floor y, h (ceiling height), box [x0,x1,z0,z1] (nominal — walls sit on
 * these lines), accent family, spawn (player position + yaw for teleports / debug views).
 * Doors are declared once, in `DOORS`, and mirrored to both rooms by the RoomManager.
 */
const R = (id, cluster, title, floor, h, box, extra = {}) => ({ id, cluster, title, floor, h, box, ...extra });

export const ROOMS = [
  // ---- TOWER (floor 210)
  R("bridge", "tower", "Main Command Bridge", 210, 7, [-14, 14, 172, 206], { accent: "bridge", spawn: [0, 210, 200, 0], windows: [{ side: "zmin", x0: -13, x1: 13, v0: 0.0, v1: 6.5 }] }),
  R("tactical", "tower", "Tactical Operations / Holo Planning", 210, 6, [-34, -16, 172, 206], { accent: "bridge", spawn: [-25, 210, 200, 0], windows: [{ side: "zmin", x0: -33, x1: -17, v0: 0.0, v1: 5.5 }] }),
  R("nav_station", "tower", "Secondary Navigation / Flight Control", 210, 6, [16, 34, 172, 206], { accent: "bridge", spawn: [25, 210, 200, 0], windows: [{ side: "zmin", x0: 17, x1: 33, v0: 0.0, v1: 5.5 }] }),
  R("observation", "tower", "Observation Gallery", 210, 6, [-84, -62, 172, 206], { accent: "bridge", spawn: [-73, 210, 200, 0], windows: [{ side: "zmin", x0: -83, x1: -63, v0: 0.0, v1: 5.5 }] }),
  R("cmd_corridor", "tower", "Command Deck Corridor", 210, 4.5, [-84, 60, 206, 212], { accent: "corridor", spawn: [0, 210, 209, 90] }),
  R("lift_lobby_tower", "tower", "Turbolift Lobby — Command Deck", 210, 4.5, [-6, 6, 212, 222], { accent: "corridor", spawn: [0, 210, 216, 180], lift: { cabs: [{ x0: -5, x1: -1 }, { x0: 1, x1: 5 }], wall: "zmax", z0: 222, z1: 225 } }),
  R("intelligence", "tower", "Restricted Intelligence Room", 210, 4.5, [-60, -40, 212, 228], { accent: "detention", spawn: [-50, 210, 220, 0] }),
  R("briefing", "tower", "Crew Briefing Room", 210, 5, [-38, -8, 212, 228], { accent: "bridge", spawn: [-23, 210, 220, 0] }),
  R("comms", "tower", "Communications & Sensor Control", 210, 5, [8, 38, 212, 228], { accent: "bridge", spawn: [23, 210, 220, 0] }),
  R("officers_quarters", "tower", "Officers' Quarters", 210, 4, [40, 60, 212, 228], { accent: "crew", spawn: [50, 210, 220, 0] }),

  // ---- HANGAR DECK (floor -40)
  R("hangar", "hangar", "Main Hangar Bay", -40, 32, [-40, 40, -90, 70], { accent: "hangar", spawn: [-30, -40, -80, -30], well: BAYS.hangar }),
  R("fighter_maint", "hangar", "Fighter Maintenance & Refuelling", -40, 18, [-80, -44, -60, 30], { accent: "hangar", spawn: [-60, -40, -15, 90] }),
  R("cargo_bay", "hangar", "Cargo Storage & Logistics", -40, 18, [44, 80, -60, -24], { accent: "hangar", spawn: [60, -40, -40, -90] }),
  R("repair_bay", "hangar", "Ship-wide Maintenance & Repair Bay", -40, 14, [44, 80, 30, 90], { accent: "engineering", spawn: [60, -40, 60, -90] }),
  R("shuttle_bay", "hangar", "Shuttle Docking Bay", -40, 26, [-30, 30, 72, 170], { accent: "hangar", spawn: [0, -40, 80, 180], well: BAYS.shuttle }),
  R("hangar_lobby", "hangar", "Turbolift Lobby — Hangar Deck", -40, 5, [-8, 8, -110, -92], { accent: "corridor", spawn: [0, -40, -100, 180], lift: { cabs: [{ x0: -5, x1: -1 }, { x0: 1, x1: 5 }], wall: "zmin", z0: -113, z1: -110 } }),
  R("flight_control", "hangar", "Hangar Flight Control", -22, 4, [40, 52, -20, 0], { accent: "hangar", spawn: [46, -22, -10, 90] }),

  // ---- ENGINEERING (floor -10)
  R("eng_lobby", "engineering", "Turbolift Lobby — Engineering", -10, 4.5, [-6, 6, 252, 262], { accent: "corridor", spawn: [0, -10, 257, 0], lift: { cabs: [{ x0: -5, x1: -1 }, { x0: 1, x1: 5 }], wall: "zmin", z0: 249, z1: 252 } }),
  R("eng_corridor", "engineering", "Engineering Corridor", -10, 4.5, [-70, 70, 262, 270], { accent: "engineering", spawn: [0, -10, 266, 90] }),
  R("engineering", "engineering", "Engineering Control", -10, 6, [-20, 20, 270, 300], { accent: "engineering", spawn: [0, -10, 275, 180] }),
  R("reactor", "engineering", "Main Reactor Chamber", -10, 40, [-32, 32, 304, 368], { accent: "reactor", spawn: [0, -10, 310, 180] }),
  R("hyperdrive", "engineering", "Hyperdrive & Propulsion Systems", -10, 12, [-70, -38, 270, 340], { accent: "hyperdrive", spawn: [-54, -10, 275, 180] }),
  R("life_support", "engineering", "Life Support: Air, Water & Waste", -10, 10, [38, 70, 270, 340], { accent: "engineering", spawn: [54, -10, 275, 180] }),

  // ---- CREW DECK (floor 6)
  R("crew_lobby", "crew", "Turbolift Lobby — Crew Deck", 6, 4.5, [-6, 6, -122, -112], { accent: "corridor", spawn: [0, 6, -117, 0], lift: { cabs: [{ x0: -5, x1: -1 }, { x0: 1, x1: 5 }], wall: "zmax", z0: -112, z1: -109 } }),
  R("crew_corridor", "crew", "Crew Deck Corridor", 6, 4.5, [-62, 62, -130, -122], { accent: "corridor", spawn: [0, 6, -126, 90] }),
  R("crew_quarters", "crew", "Crew Quarters", 6, 4.5, [-62, -36, -170, -130], { accent: "crew", spawn: [-49, 6, -135, 0] }),
  R("mess", "crew", "Mess Hall & Galley", 6, 5, [-32, -4, -170, -130], { accent: "mess", spawn: [-18, 6, -135, 0] }),
  R("lounge", "crew", "Recreation Lounge", 6, 5, [4, 32, -170, -130], { accent: "crew", spawn: [18, 6, -135, 0] }),
  R("medbay", "crew", "Medical Bay", 6, 4.5, [36, 62, -170, -130], { accent: "medbay", spawn: [49, 6, -135, 0] }),
  R("crew_connector", "crew", "Deck Connector", 6, 4.5, [-3, 3, -170, -130], { accent: "corridor", spawn: [0, 6, -150, 0] }),
  R("crew_corridor_fwd", "crew", "Forward Crew Corridor", 6, 4.5, [-62, 62, -178, -170], { accent: "corridor", spawn: [0, 6, -174, 90] }),
  R("armory", "crew", "Armory & Equipment Storage", 6, 4.5, [-62, -36, -206, -178], { accent: "detention", spawn: [-49, 6, -182, 0] }),
  R("detention", "crew", "Security & Detention Block", 6, 4.5, [-30, 4, -220, -178], { accent: "detention", spawn: [-12, 6, -182, 0] }),
  R("escape_pods", "crew", "Emergency Escape Pods", 6, 4.5, [8, 62, -206, -178], { accent: "corridor", spawn: [35, 6, -182, 0] }),
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
export const CLUSTERS = ["tower", "hangar", "engineering", "crew"];

/**
 * Doors: { id, a, b, axis: 'x'|'z' (the wall plane is perpendicular to this axis), at (plane coordinate,
 * nominal shared line), from, to (span along the other axis), h, kind: 'blast'|'slide'|'secure'|'arch'|'open' }
 * The RoomManager expands each into both rooms' wall openings and builds one door object in the gap.
 */
const D = (id, a, b, axis, at, from, to, h, kind = "slide") => ({ id, a, b, axis, at, from, to, h, kind });

export const DOORS = [
  // tower
  D("br_corr", "bridge", "cmd_corridor", "z", 206, -2, 2, 3.2, "blast"),
  D("br_tac", "bridge", "tactical", "x", -14, 186, 189, 2.6),
  D("br_nav", "bridge", "nav_station", "x", 14, 186, 189, 2.6),
  D("tac_corr", "tactical", "cmd_corridor", "z", 206, -26, -23, 2.6),
  D("nav_corr", "nav_station", "cmd_corridor", "z", 206, 23, 26, 2.6),
  D("obs_corr", "observation", "cmd_corridor", "z", 206, -75, -72, 2.6),
  D("corr_lift_t", "cmd_corridor", "lift_lobby_tower", "z", 212, -2, 2, 3.0, "blast"),
  D("corr_intel", "cmd_corridor", "intelligence", "z", 212, -51, -49, 2.4, "secure"),
  D("corr_brief", "cmd_corridor", "briefing", "z", 212, -24, -21, 2.6),
  D("corr_comms", "cmd_corridor", "comms", "z", 212, 21, 24, 2.6),
  D("corr_off", "cmd_corridor", "officers_quarters", "z", 212, 48, 51, 2.4),
  // hangar deck
  D("hg_shuttle", "hangar", "shuttle_bay", "z", 70, -10, 10, 14, "blast"),
  D("hg_maint_a", "hangar", "fighter_maint", "x", -40, -50, -30, 12, "arch"),
  D("hg_maint_b", "hangar", "fighter_maint", "x", -40, 0, 20, 12, "arch"),
  D("hg_cargo", "hangar", "cargo_bay", "x", 40, -50, -30, 12, "arch"),
  D("hg_repair", "hangar", "repair_bay", "x", 40, 40, 56, 10, "arch"),
  D("hg_lobby", "hangar", "hangar_lobby", "z", -90, -3, 3, 4, "blast"),
  D("hg_fc", "hangar", "flight_control", "x", 40, -20, 0, 4, "open"), // glass front; passable via the stair landing
  // engineering
  D("eng_lobby_corr", "eng_lobby", "eng_corridor", "z", 262, -2, 2, 3.0, "blast"),
  D("eng_corr_ctrl", "eng_corridor", "engineering", "z", 270, -3, 3, 3.2, "blast"),
  D("eng_corr_hyper", "eng_corridor", "hyperdrive", "z", 270, -56, -52, 3.6, "blast"),
  D("eng_corr_life", "eng_corridor", "life_support", "z", 270, 52, 56, 3.2, "blast"),
  D("eng_ctrl_reactor", "engineering", "reactor", "z", 300, -3, 3, 3.6, "blast"),
  // crew deck
  D("crew_lobby_corr", "crew_lobby", "crew_corridor", "z", -122, -2, 2, 3.0, "blast"),
  D("crew_corr_q", "crew_corridor", "crew_quarters", "z", -130, -50, -47, 2.6),
  D("crew_corr_mess", "crew_corridor", "mess", "z", -130, -20, -17, 2.8),
  D("crew_corr_conn", "crew_corridor", "crew_connector", "z", -130, -3, 3, 3.2, "open"),
  D("crew_corr_lounge", "crew_corridor", "lounge", "z", -130, 17, 20, 2.8),
  D("crew_corr_med", "crew_corridor", "medbay", "z", -130, 47, 50, 2.6),
  D("conn_fwd", "crew_connector", "crew_corridor_fwd", "z", -170, -3, 3, 3.2, "open"),
  D("fwd_armory", "crew_corridor_fwd", "armory", "z", -178, -50, -47, 2.6, "secure"),
  D("fwd_det", "crew_corridor_fwd", "detention", "z", -178, -14, -11, 2.6, "secure"),
  D("fwd_pods", "crew_corridor_fwd", "escape_pods", "z", -178, 33, 36, 2.8, "blast"),
];

/** Turbolift network: the lobby rooms, in ride order. Each has two cabs (see room.lift). */
export const LIFT_LOBBIES = ["lift_lobby_tower", "crew_lobby", "hangar_lobby", "eng_lobby"];
export const DECK_NAMES = { lift_lobby_tower: "Command Deck", crew_lobby: "Crew Deck", hangar_lobby: "Hangar Deck", eng_lobby: "Engineering" };

// Where the exterior camera should appear when leaving a cluster (position, look target)
export const CLUSTER_EXIT_VIEW = {
  tower: { pos: [60, 225, 60], target: [0, 214, 172] },
  hangar: { pos: [140, -170, -10], target: [0, -50, -10] },
  engineering: { pos: [260, 20, 700], target: [0, 0, 480] },
  crew: { pos: [120, 130, -330], target: [0, 40, -150] },
};

// The boarding flight: exterior camera glides here, then the player appears at the bridge glazing.
export const BOARDING = {
  approach: [0, 214.5, 120],
  lookAt: [0, 213.5, 172],
  spawn: { pos: [0, 210, 176.5], yaw: 0 },
};

export function roomsInCluster(cluster) {
  return ROOMS.filter((r) => r.cluster === cluster);
}
