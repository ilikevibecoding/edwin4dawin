// Ship specification: the single source of truth for every dimension of the Star Destroyer.
// Exterior builders, room builders, the cell system, cameras and the harness all read from here.
// Units: metres. +X starboard, +Y up, -Z forward (bow).
import * as THREE from "three";

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ---------------------------------------------------------------------------
// Main hull (dagger wedge)
// ---------------------------------------------------------------------------
export const HULL = {
  length: 1600,
  zBow: -1000,
  zStern: 600,
  halfWidthStern: 480,
  thicknessStern: 130,
  // fraction of the thickness above / below y = 0
  topFrac: 0.4,
  bottomFrac: 0.6,
};

/** 0 at the bow tip, 1 at the stern. */
export function hullFrac(z) {
  return clamp((z - HULL.zBow) / HULL.length, 0, 1);
}
export function hullHalfWidth(z) {
  return HULL.halfWidthStern * hullFrac(z);
}
export function hullThickness(z) {
  return HULL.thicknessStern * hullFrac(z);
}
export function hullTopY(z) {
  return HULL.topFrac * hullThickness(z);
}
export function hullBottomY(z) {
  return -HULL.bottomFrac * hullThickness(z);
}

/**
 * Cross-section outline at station z, starboard half, from the top centreline down to the bottom
 * centreline. Returned as [x, y] pairs; mirror x for port. Segments carry a `tag` so builders can pick
 * materials per face: top, upperSlope, trenchLip, trenchWall, trenchFloor, lowerSlope, bottom.
 */
export const SECTION_PROFILE = [
  { u: 0.0, v: 1.0, tag: "top" },
  { u: 0.72, v: 1.0, tag: "upperSlope" },
  { u: 1.0, v: 0.5, tag: "trenchLip" },
  { u: 0.965, v: 0.5, tag: "trenchWall" },
  { u: 0.965, v: 0.3, tag: "trenchFloor" },
  { u: 1.0, v: 0.3, tag: "lowerSlope" },
  { u: 0.62, v: 0.0, tag: "bottom" },
  { u: 0.0, v: 0.0, tag: "bottom" },
];
export function hullSection(z) {
  const w = hullHalfWidth(z);
  const yT = hullTopY(z);
  const yB = hullBottomY(z);
  return SECTION_PROFILE.map((p) => ({ x: p.u * w, y: yB + p.v * (yT - yB), tag: p.tag }));
}
/** Height of the side trench band centre (world y) and its height at station z. */
export function trenchBand(z) {
  const yT = hullTopY(z);
  const yB = hullBottomY(z);
  return { yTop: yB + 0.5 * (yT - yB), yBottom: yB + 0.3 * (yT - yB), depth: 0.035 * hullHalfWidth(z) };
}

// ---------------------------------------------------------------------------
// Dorsal superstructure: terraced blocks, tower neck, bridge module, shield domes, comms mast
// ---------------------------------------------------------------------------
// Each terrace is a tapered block sitting on the top plate: plan-view half-width grows linearly from
// zFront to zBack; the sides lean in by `draft` (horizontal metres per vertical metre); flat top at yTop.
export const TERRACES = [
  { id: "t0", zFront: -420, zBack: 600, hwFront: 42, hwBack: 265, yTop: 84, draft: 0.45 },
  { id: "t1", zFront: -180, zBack: 600, hwFront: 34, hwBack: 205, yTop: 112, draft: 0.45 },
  { id: "t2", zFront: 60, zBack: 600, hwFront: 28, hwBack: 150, yTop: 138, draft: 0.4 },
];
export function terraceHalfWidth(t, z) {
  const f = clamp((z - t.zFront) / (t.zBack - t.zFront), 0, 1);
  return t.hwFront + (t.hwBack - t.hwFront) * f;
}

export const TOWER = {
  // the slimmer neck between terrace 2 and the bridge module
  neck: { z0: 250, z1: 370, hw: 40, yBase: 138, yTop: 230, draft: 0.06 },
  // the wide "T" head that carries the bridge; the forward face holds the bridge viewports
  bridge: { z0: 215, z1: 395, hw: 105, y0: 230, y1: 268 },
  // bridge viewport strip on the forward face (world y, half-width in x)
  viewports: { y0: 247.6, y1: 251.4, hw: 34, count: 9, pillar: 1.1 },
  // lower observation gallery viewports (deck B), two runs left and right of the centreline
  galleryViewports: { y0: 233.2, y1: 235.4, x0: 8, x1: 46, count: 6 },
  domes: [
    { x: -62, z: 330, r: 30, yCenter: 282 },
    { x: 62, z: 330, r: 30, yCenter: 282 },
  ],
  mast: { x: 0, z: 345, yBase: 268, yTop: 336, r: 3.2 },
};

// ---------------------------------------------------------------------------
// Engines (stern face at z = zStern)
// ---------------------------------------------------------------------------
export const ENGINES = {
  z: HULL.zStern,
  length: 58,
  main: [
    { x: -190, y: -8, r: 42 },
    { x: 0, y: -8, r: 46 },
    { x: 190, y: -8, r: 42 },
  ],
  secondary: [
    { x: -300, y: -6, r: 15 },
    { x: -95, y: -4, r: 17 },
    { x: 95, y: -4, r: 17 },
    { x: 300, y: -6, r: 15 },
  ],
  glow: new THREE.Color("#8fc4ff"),
};

// ---------------------------------------------------------------------------
// Ventral features: hangar mouth, reactor bulb, docking recesses
// ---------------------------------------------------------------------------
export const VENTRAL = {
  // reactor bulb protruding below the bottom plate
  reactorBulb: { x: 0, z: 300, r: 72, yCenter: -70 },
  // aft secondary docking recess (future landing / docking phase)
  dockingRecess: { x: 0, z: 430, hw: 30, hl: 40, depth: 12 },
};

// ---------------------------------------------------------------------------
// Interior decks
// ---------------------------------------------------------------------------
export const DECKS = {
  A: { id: "A", name: "Bridge Deck", y: 246 },
  B: { id: "B", name: "Command Deck", y: 232 },
  C: { id: "C", name: "Crew Deck", y: 100 },
  D: { id: "D", name: "Engineering Deck", y: 48 },
  E: { id: "E", name: "Hangar Deck", y: -40 },
};
export const DECK_ORDER = ["A", "B", "C", "D", "E"];

// Turbolift shaft positions (x, z) shared by decks A–D. Deck E's lobby sits at the hangar's aft wall;
// lifts are allowed to travel horizontally (as they do in canon), so the network still connects.
export const LIFT_SHAFTS = [
  { id: "L1", x: -9.5, z: 253 },
  { id: "L2", x: 9.5, z: 253 },
];
export const LIFT_SHAFTS_E = [
  { id: "L1", x: 51.5, z: 96 },
  { id: "L2", x: 70.5, z: 96 },
];

export const WALL_T = 0.4; // interior wall thickness
export const DOOR = { w: 2.0, h: 2.8, blastW: 3.2, blastH: 3.4 };

/**
 * Room record.
 *  id, name, deck, origin [x, y, z] = world position of the room's floor centre,
 *  size [w, h, d] = interior clear dimensions (x, y, z), accent = hex colour for HUD/light theme,
 *  spawn = { x, z, yaw, pitch } in room-local coordinates (yaw degrees, 0 looks toward -Z),
 *  kind = "room" | "corridor" | "lobby" | "lift" | "hangar".
 */
const rooms = [];
const doors = [];
function room(r) {
  r.kind = r.kind || "room";
  r.tags = r.tags || [];
  r.fog = r.fog ?? 0.03;
  r.spawn = r.spawn || { x: 0, z: r.size[2] / 2 - 1.5, yaw: 0, pitch: -4 };
  rooms.push(r);
  return r;
}
/**
 * Door between two rooms. pos = world [x, y, z] at the door's floor centre; axis = "x" if the door's
 * passage runs along x (i.e. the door sits in a wall that faces ±x), "z" otherwise.
 * width/height, type "std" | "blast" | "lift".
 */
function door(a, b, pos, axis, opts = {}) {
  const d = { id: `${a}__${b}`, a, b, pos, axis, w: opts.w || DOOR.w, h: opts.h || DOOR.h, type: opts.type || "std", ...opts };
  doors.push(d);
  return d;
}

// ---- Deck A: bridge deck ---------------------------------------------------------------------
{
  const y = DECKS.A.y;
  room({ id: "bridge", name: "Command Bridge", deck: "A", origin: [0, y, 231], size: [64, 12, 30], accent: "#6fa8ff", kind: "room", fog: 0.012, spawn: { x: 0, z: 13.5, yaw: 0, pitch: -3 }, tags: ["key"] });
  room({ id: "lobby_a", name: "Bridge Turbolift Lobby", deck: "A", origin: [0, y, 253], size: [24, 4.2, 12], accent: "#6fa8ff", kind: "lobby" });
  room({ id: "corridor_a", name: "Command Corridor", deck: "A", origin: [0, y, 285.5], size: [6, 3.6, 51], accent: "#6fa8ff", kind: "corridor", spawn: { x: 0, z: 24, yaw: 0, pitch: -2 } });
  room({ id: "intel", name: "Restricted Intelligence Room", deck: "A", origin: [-15.4, y, 272], size: [24, 4.2, 16], accent: "#ff4a3a", spawn: { x: 11, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "ready_room", name: "Officers' Ready Room", deck: "A", origin: [13.4, y, 272], size: [20, 4.0, 16], accent: "#c8b482", spawn: { x: -9, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "comms", name: "Communications & Sensor Control", deck: "A", origin: [-16.4, y, 298], size: [26, 5.0, 22], accent: "#5fd0ff", spawn: { x: 12, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "tactical", name: "Tactical Operations / Holo Planning", deck: "A", origin: [16.4, y, 298], size: [26, 6.0, 22], accent: "#3fb0ff", spawn: { x: -12, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "navigation", name: "Navigation & Flight Control", deck: "A", origin: [0, y, 322], size: [24, 5.0, 20], accent: "#ffb347", spawn: { x: 0, z: -9, yaw: 180, pitch: -4 } });

  door("bridge", "lobby_a", [0, y, 246.5], "z", { type: "blast", w: DOOR.blastW, h: DOOR.blastH });
  door("lobby_a", "corridor_a", [0, y, 259.5], "z", { w: 3.0, h: 3.2 });
  door("corridor_a", "intel", [-3.2, y, 272], "x", { type: "blast", w: 2.4, h: 3.0 });
  door("corridor_a", "ready_room", [3.2, y, 272], "x");
  door("corridor_a", "comms", [-3.2, y, 298], "x", { w: 2.6, h: 3.0 });
  door("corridor_a", "tactical", [3.2, y, 298], "x", { w: 2.6, h: 3.0 });
  door("corridor_a", "navigation", [0, y, 311.5], "z", { w: 3.0, h: 3.2 });
}

// ---- Deck B: command deck -------------------------------------------------------------------
{
  const y = DECKS.B.y;
  room({ id: "lobby_b", name: "Command Deck Lobby", deck: "B", origin: [0, y, 253], size: [24, 4.2, 12], accent: "#8fb4ff", kind: "lobby" });
  room({ id: "observation", name: "Forward Observation Gallery", deck: "B", origin: [0, y, 226], size: [96, 5.0, 16], accent: "#9fc6ff", fog: 0.015, spawn: { x: 0, z: 6, yaw: 0, pitch: 0 } });
  room({ id: "corridor_b", name: "Command Deck Corridor", deck: "B", origin: [0, y, 282], size: [6, 3.6, 44], accent: "#8fb4ff", kind: "corridor", spawn: { x: 0, z: 20, yaw: 0, pitch: -2 } });
  room({ id: "officers_quarters", name: "Officers' Quarters", deck: "B", origin: [-18.4, y, 273], size: [30, 3.6, 24], accent: "#d7b98c", spawn: { x: 13, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "briefing", name: "Crew Briefing Room", deck: "B", origin: [16.4, y, 273], size: [26, 4.5, 22], accent: "#7fc4ff", spawn: { x: -12, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "lounge", name: "Officers' Lounge", deck: "B", origin: [16.4, y, 297], size: [26, 4.0, 20], accent: "#ffb56b", spawn: { x: -12, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "escape_pods", name: "Emergency Evacuation Bay", deck: "B", origin: [-16.4, y, 297], size: [26, 4.2, 20], accent: "#ff5a3a", spawn: { x: 12, z: 0, yaw: 90, pitch: -4 } });

  door("lobby_b", "observation", [0, y, 240.5], "z", { w: 3.0, h: 3.2 });
  door("lobby_b", "corridor_b", [0, y, 259.5], "z", { w: 3.0, h: 3.2 });
  door("corridor_b", "officers_quarters", [-3.2, y, 273], "x");
  door("corridor_b", "briefing", [3.2, y, 273], "x", { w: 2.6, h: 3.0 });
  door("corridor_b", "lounge", [3.2, y, 297], "x");
  door("corridor_b", "escape_pods", [-3.2, y, 297], "x", { type: "blast", w: 2.6, h: 3.0 });
}

// ---- Deck C: crew deck ----------------------------------------------------------------------
{
  const y = DECKS.C.y;
  room({ id: "lobby_c", name: "Crew Deck Lobby", deck: "C", origin: [0, y, 253], size: [24, 4.2, 12], accent: "#b0b8c8", kind: "lobby" });
  room({ id: "corridor_c", name: "Crew Deck Corridor", deck: "C", origin: [0, y, 291], size: [6, 3.6, 62], accent: "#b0b8c8", kind: "corridor", spawn: { x: 0, z: 29, yaw: 0, pitch: -2 } });
  room({ id: "crew_quarters", name: "Crew Quarters", deck: "C", origin: [-20.4, y, 275], size: [34, 3.6, 24], accent: "#9fb0c8", spawn: { x: 15, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "mess_hall", name: "Mess Hall & Galley", deck: "C", origin: [20.4, y, 275], size: [34, 4.5, 24], accent: "#ffc36b", spawn: { x: -15, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "medbay", name: "Medical Bay", deck: "C", origin: [-20.4, y, 302], size: [34, 4.0, 22], accent: "#7fe0d8", spawn: { x: 15, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "armory", name: "Armory & Equipment Storage", deck: "C", origin: [18.4, y, 302], size: [30, 4.0, 22], accent: "#ff7a3a", spawn: { x: -13, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "detention", name: "Security & Detention Block", deck: "C", origin: [0, y, 336], size: [40, 4.0, 24], accent: "#ff3a3a", spawn: { x: 0, z: -10, yaw: 180, pitch: -4 } });

  door("lobby_c", "corridor_c", [0, y, 259.5], "z", { w: 3.0, h: 3.2 });
  door("corridor_c", "crew_quarters", [-3.2, y, 275], "x");
  door("corridor_c", "mess_hall", [3.2, y, 275], "x", { w: 2.6, h: 3.0 });
  door("corridor_c", "medbay", [-3.2, y, 302], "x", { w: 2.6, h: 3.0 });
  door("corridor_c", "armory", [3.2, y, 302], "x", { type: "blast", w: 2.4, h: 3.0 });
  door("corridor_c", "detention", [0, y, 323.5], "z", { type: "blast", w: 3.0, h: 3.2 });
}

// ---- Deck D: engineering deck ---------------------------------------------------------------
{
  const y = DECKS.D.y;
  room({ id: "lobby_d", name: "Engineering Lobby", deck: "D", origin: [0, y, 253], size: [24, 4.2, 12], accent: "#ffb040", kind: "lobby" });
  room({ id: "corridor_d", name: "Engineering Corridor", deck: "D", origin: [0, y, 295], size: [6, 3.8, 70], accent: "#ffb040", kind: "corridor", spawn: { x: 0, z: 33, yaw: 0, pitch: -2 } });
  room({ id: "engineering", name: "Engineering Control", deck: "D", origin: [-20.4, y, 278], size: [34, 5.0, 26], accent: "#ffb040", spawn: { x: 15, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "hyperdrive", name: "Hyperdrive & Propulsion", deck: "D", origin: [20.4, y, 278], size: [34, 8.0, 26], accent: "#7fb0ff", spawn: { x: -15, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "life_support", name: "Life Support: Air / Water / Waste", deck: "D", origin: [-20.4, y, 308], size: [34, 5.0, 24], accent: "#7fe0a0", spawn: { x: 15, z: 0, yaw: 90, pitch: -4 } });
  room({ id: "maintenance", name: "Maintenance & Repair Bay", deck: "D", origin: [20.4, y, 308], size: [34, 6.0, 24], accent: "#ffd060", spawn: { x: -15, z: 0, yaw: -90, pitch: -4 } });
  room({ id: "reactor", name: "Main Reactor Chamber", deck: "D", origin: [0, y, 362], size: [60, 30, 60], accent: "#fff0c0", fog: 0.012, spawn: { x: 0, z: -27, yaw: 180, pitch: 4 }, tags: ["key"] });

  door("lobby_d", "corridor_d", [0, y, 259.5], "z", { w: 3.0, h: 3.2 });
  door("corridor_d", "engineering", [-3.2, y, 278], "x", { w: 2.6, h: 3.0 });
  door("corridor_d", "hyperdrive", [3.2, y, 278], "x", { type: "blast", w: 3.0, h: 3.2 });
  door("corridor_d", "life_support", [-3.2, y, 308], "x");
  door("corridor_d", "maintenance", [3.2, y, 308], "x", { type: "blast", w: 3.2, h: 3.4 });
  door("corridor_d", "reactor", [0, y, 331], "z", { type: "blast", w: DOOR.blastW, h: DOOR.blastH });
}

// ---- Deck E: hangar deck --------------------------------------------------------------------
{
  const y = DECKS.E.y;
  room({ id: "hangar", name: "Main Hangar Bay", deck: "E", origin: [0, y, -30], size: [130, 40, 220], accent: "#ffb45a", kind: "hangar", fog: 0.0035, spawn: { x: -20, z: 90, yaw: 20, pitch: 2 }, tags: ["key"] });
  room({ id: "fighter_bay", name: "Fighter Maintenance & Refuelling", deck: "E", origin: [-95.4, y, -60], size: [50, 14, 80], accent: "#ffa040", fog: 0.008, spawn: { x: 22, z: 30, yaw: 30, pitch: 0 } });
  room({ id: "shuttle_bay", name: "Shuttle & Secondary Docking Bay", deck: "E", origin: [95.4, y, -60], size: [50, 18, 80], accent: "#a0c8ff", fog: 0.008, spawn: { x: -22, z: 30, yaw: -30, pitch: 0 } });
  room({ id: "cargo", name: "Cargo Storage & Logistics", deck: "E", origin: [0, y, 110.4], size: [80, 14, 60], accent: "#d0a060", fog: 0.01, spawn: { x: 0, z: -27, yaw: 180, pitch: -2 } });
  room({ id: "lobby_e", name: "Hangar Deck Lobby", deck: "E", origin: [61, y, 90], size: [24, 4.2, 12], accent: "#ffb45a", kind: "lobby" });
  // raised booth set into the hangar's east wall, 16 m above the deck, reached by the stair tower
  room({ id: "flight_control", name: "Hangar Flight Control", deck: "E", origin: [77.4, -24, -30], size: [24, 4.0, 14], accent: "#5fd0ff", spawn: { x: 6, z: 0, yaw: 90, pitch: -8 }, tags: ["seeThrough"] });

  door("hangar", "fighter_bay", [-65.2, y, -60], "x", { type: "blast", w: 16, h: 12 });
  door("hangar", "shuttle_bay", [65.2, y, -60], "x", { type: "blast", w: 20, h: 16 });
  door("hangar", "cargo", [0, y, 80.2], "z", { type: "blast", w: 18, h: 10 });
  door("hangar", "lobby_e", [61, y, 83.8], "z", { w: 3.0, h: 3.2 });
  // flight control is reached by the stair tower on the hangar's east wall; the doorway sits 16 m up
  door("hangar", "flight_control", [65.2, -24, -30], "x", { w: 2.4, h: 3.0 });
}

// ---- Lift cars: one per shaft per lobby -----------------------------------------------------
const LIFT_CAR = { w: 3.2, h: 3.2, d: 3.2 };
for (const r of rooms.filter((x) => x.kind === "lobby")) {
  const shafts = r.deck === "E" ? LIFT_SHAFTS_E : LIFT_SHAFTS;
  const y = r.origin[1];
  for (const s of shafts) {
    // cars sit on the lobby's aft wall (+z side) for A-D, on the aft wall for E too
    const zCar = r.origin[2] + r.size[2] / 2 + WALL_T + LIFT_CAR.d / 2;
    const car = room({ id: `lift_${s.id}_${r.deck}`, name: `Turbolift ${s.id}`, deck: r.deck, origin: [s.x, y, zCar], size: [LIFT_CAR.w, LIFT_CAR.h, LIFT_CAR.d], accent: r.accent, kind: "lift", shaft: s.id, lobby: r.id });
    door(r.id, car.id, [s.x, y, r.origin[2] + r.size[2] / 2 + WALL_T / 2], "z", { type: "lift", w: 2.2, h: 2.9 });
  }
}

/** World AABB of a room's interior clear volume. */
export function roomBounds(r) {
  const [x, y, z] = r.origin;
  const [w, h, d] = r.size;
  return { min: new THREE.Vector3(x - w / 2, y, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h, z + d / 2) };
}

/** Doors touching a room, expressed in that room's local frame. */
export function roomDoors(roomId) {
  const r = ROOM_BY_ID[roomId];
  const out = [];
  for (const d of DOORS) {
    if (d.a !== roomId && d.b !== roomId) continue;
    const other = d.a === roomId ? d.b : d.a;
    const lx = d.pos[0] - r.origin[0];
    const lz = d.pos[2] - r.origin[2];
    const ly = d.pos[1] - r.origin[1];
    // which wall: N (-z), S (+z), W (-x), E (+x)
    let side;
    if (d.axis === "z") side = lz < 0 ? "N" : "S";
    else side = lx < 0 ? "W" : "E";
    out.push({ door: d, other, side, lx, ly, lz, w: d.w, h: d.h, type: d.type });
  }
  return out;
}

/** Rooms adjacent through any door. */
export function neighbours(roomId) {
  const set = new Set();
  for (const d of DOORS) {
    if (d.a === roomId) set.add(d.b);
    else if (d.b === roomId) set.add(d.a);
  }
  return [...set];
}

// ---------------------------------------------------------------------------
// The Kestrel (the original freighter) is parked on the hangar deck, nose pointing aft (+Z), so its
// windshield looks across the bay toward the opening. Its interior frame has the aft door at local z=0
// and the cockpit at local z=-22; the group is rotated 180° about Y.
// ---------------------------------------------------------------------------
export const KESTREL = {
  // interior frame origin (the aft door threshold) in world space; the deck is 2.3 m below the cabin floor
  position: new THREE.Vector3(-22, DECKS.E.y + 2.3, -108),
  yaw: Math.PI,
  clearance: 2.3,
  // interior extents in the Kestrel's local frame (x right, z aft->fwd is -z)
  local: { x0: -5.5, x1: 5.2, z0: -25.5, z1: 0.3, h: 3.0 },
  // boarding ramp: from the aft door threshold down to the deck, running aft (+z world)
  ramp: { length: 7.0, width: 1.9 },
  // shell footprint (world AABB) for the hangar builder to keep clear
  footprint: { x0: -22 - 9, x1: -22 + 9, z0: -108 - 4, z1: -108 + 32 },
};
{
  const y = DECKS.E.y;
  // The Kestrel's cabin is a room too (its colliders/floors come from the legacy builder); its aft
  // blast door opens onto the ramp into the hangar. Local -z (bow) is world +z after the 180° yaw.
  room({ id: "kestrel", name: "Kestrel — Light Freighter", deck: "E", origin: [-22, KESTREL.position.y, -108 + 12.6], size: [10.7, 3.0, 25.8], accent: "#4fd8cc", fog: 0.03, spawn: { x: 0, z: -11.0, yaw: 180, pitch: 0 }, kind: "room", tags: ["legacy", "seeThrough"] });
  door("kestrel", "hangar", [-22, KESTREL.position.y, -108], "z", { type: "blast", w: 1.7, h: 2.35, span: [-0.28, 0.28], kestrel: true });
  void y;
}

export const ROOMS = rooms;
export const DOORS = doors;
export const ROOM_BY_ID = Object.fromEntries(rooms.map((r) => [r.id, r]));


// ---------------------------------------------------------------------------
// Hangar mouth (opening in the hangar floor and the ventral hull) and TIE racks
// ---------------------------------------------------------------------------
export const HANGAR = {
  floorY: DECKS.E.y,
  ceilingY: DECKS.E.y + 40,
  x0: -65,
  x1: 65,
  z0: -140,
  z1: 80,
  opening: { x0: -30, x1: 30, z0: -40, z1: 60 },
  // approach corridor in space below the mouth for the fighters (world)
  approach: { y: -160, zStart: -520, zEnd: 40 },
  // rack rows hanging from the ceiling: fighters park with their hatch up against the rack
  rackRows: [
    { x: -50, z0: -125, z1: -50, n: 6 },
    { x: 50, z0: -125, z1: -50, n: 6 },
    { x: -50, z0: -20, z1: 55, n: 6 },
    { x: 50, z0: -20, z1: 55, n: 6 },
  ],
  // TIE-style fighter envelope shared by the model, the racks and the traffic paths (metres)
  tie: { ballR: 1.75, wingHalfSpan: 3.3, wingH: 7.6, wingW: 4.4, clampH: 1.6 },
};
/** World position of the centre of the fighter docked in rack row `row`, slot `k`. */
export function rackSlot(row, k) {
  const r = HANGAR.rackRows[row];
  const z = r.z0 + ((r.z1 - r.z0) * (k + 0.5)) / r.n;
  const y = HANGAR.ceilingY - HANGAR.tie.clampH - HANGAR.tie.wingH / 2 - 0.4;
  return new THREE.Vector3(r.x, y, z);
}
/** Fighter parking spots on the deck (world), used by the hangar builder and the traffic system. */
export const DECK_SPOTS = [
  { x: -44, z: 35, yaw: Math.PI * 0.5 },
  { x: -44, z: 48, yaw: Math.PI * 0.5 },
  { x: 44, z: -110, yaw: -Math.PI * 0.5 },
];

// ---------------------------------------------------------------------------
// Exterior camera presets (world positions and look-at targets).
// `time` is the far-field clock (seconds) main.js applies with space.setTime(): the sun bearing is
// -30° + 1.3°·time (measured from +z toward +x, 22° elevation), so each preset gets a 3/4 key light
// 45–60° off the camera's back axis with a readable shadow side, the sun sprite out of frame and the
// planets behind the ship rather than beside it.
// ---------------------------------------------------------------------------
export const EXTERIOR_VIEWS = {
  ext_hero: { pos: [-1150, 260, -1250], look: [0, 60, -100], fov: 45, time: 230.8 },
  ext_bow: { pos: [-300, -10, -1450], look: [0, 40, -350], fov: 55, time: 215.4 },
  ext_stern: { pos: [850, 240, 1250], look: [0, 10, 350], fov: 50, time: 96.2 },
  ext_tower: { pos: [-330, 300, 40], look: [0, 235, 300], fov: 45, time: 246.2 },
  ext_bridge_close: { pos: [-50, 250, 125], look: [0, 249, 215], fov: 50, time: 215.4 },
  ext_belly: { pos: [-650, -480, -450], look: [0, -60, -50], fov: 55, time: 7.7 },
  ext_hangar_mouth: { pos: [-120, -160, 160], look: [0, -40, 10], fov: 60, time: 67.7 },
  ext_trench: { pos: [-430, 12, -260], look: [-320, -2, 120], fov: 50, time: 215.4 },
  ext_far: { pos: [-3000, 1000, -2600], look: [0, 60, -100], fov: 30, time: 230.8 },
  ext_top: { pos: [0, 2600, -200], look: [0, 0, -200], fov: 45, time: 215.4 },
};

export const SHIP_NAME = "VINDICATOR";
