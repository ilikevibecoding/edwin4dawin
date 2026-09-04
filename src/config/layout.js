// Ship layout: the single source of truth for every dimension in the Star Destroyer.
// Units are metres. Ship forward is -Z (bow at z = -800, stern at z = +800), +Y is up, x = 0 is the
// centreline. The plane of the hull's knife edges is y = 0.
//
// Everything here is plain data so the exterior hull, the interior clusters, the turbolift network,
// the fighter traffic and the camera presets all agree on where things are. Change a number here and
// every builder follows.

// ---------------------------------------------------------------------------
// Hull envelope
// ---------------------------------------------------------------------------
export const HULL = {
  bowZ: -800,
  sternZ: 800,
  length: 1600,
  halfWidthStern: 480, // wedge half-width at the stern face
  edgeHalf: 3, // vertical half-thickness of the knife edge
  dorsalRidgeStern: 58, // plateau height above the edge plane at the stern
  dorsalPlateauFrac: 0.32, // plateau half-width / local half-width
  keelDepthStern: 78, // keel depth below the edge plane at the stern
  keelFlatFrac: 0.38, // flat keel half-width / local half-width
  // recessed trench along each knife edge (dense greebling lives in here)
  edgeTrenchDepth: 4,
};

// linear taper: 0 at the bow tip, 1 at the stern
export const hullT = (z) => Math.min(1, Math.max(0, (z - HULL.bowZ) / HULL.length));
export const halfWidth = (z) => Math.max(0.5, HULL.halfWidthStern * hullT(z));
export const dorsalY = (z) => HULL.edgeHalf + HULL.dorsalRidgeStern * hullT(z);
export const keelY = (z) => -HULL.edgeHalf - HULL.keelDepthStern * hullT(z);

// Dorsal superstructure terraces ("the city"). Each is a lofted trapezoid sitting on the one below.
// halfTopFrac is relative to halfWidth(z); slopeRun is how far the side face runs outward at the base.
export const TERRACES = [
  { id: "T1", z0: 120, z1: 800, halfTopFrac: 0.2, slopeRun: 22, rise: 18 },
  { id: "T2", z0: 300, z1: 800, halfTopFrac: 0.12, slopeRun: 16, rise: 18 },
];
// tower base block (absolute half-widths)
export const TOWER_BASE = { z0: 500, z1: 700, halfTop: 52, slopeRun: 10, rise: 20 };
export const terraceTopY = (z) => {
  let y = dorsalY(z);
  for (const t of TERRACES) if (z >= t.z0 && z <= t.z1) y += t.rise;
  return y;
};
export const towerBaseTopY = () => dorsalY(600) + TERRACES[0].rise + TERRACES[1].rise + TOWER_BASE.rise; // ~109.75

// Command tower
export const TOWER = {
  neck: { z0: 565, z1: 640, halfBase: 34, halfTop: 28, yTop: 178 },
  // the wide bridge module; its front face carries the two window banks
  bridgeModule: { z0: 548, z1: 652, halfX: 96, y0: 178, y1: 208, frontChamfer: 6 },
  domes: [
    { x: -60, y: 222, z: 612, r: 17 },
    { x: 60, y: 222, z: 612, r: 17 },
  ],
  mast: { x: 0, z: 618, y0: 208, y1: 262, r: 4 },
};

// Engines on the stern face (z = sternZ), bells protrude aft
export const ENGINES = {
  main: [
    { x: -160, y: 6, r: 42 },
    { x: 0, y: 6, r: 42 },
    { x: 160, y: 6, r: 42 },
  ],
  secondary: [
    { x: -90, y: -32, r: 17 },
    { x: 90, y: -32, r: 17 },
    { x: -262, y: 4, r: 17 },
    { x: 262, y: 4, r: 17 },
  ],
  bellLength: 36,
};

// Ventral reactor bulb
export const REACTOR_BULB = { x: 0, y: -70, z: 540, r: 55 };

// Ventral hangar launch well: a shaft through the keel; blast doors at the keel end
export const HANGAR_WELL = { x0: -24, x1: 24, z0: 130, z1: 250, yDeck: -20, yKeel: -48 };
export const SHUTTLE_WELL = { x0: -20, x1: 20, z0: 310, z1: 360, yDeck: -20, yKeel: -50 };

// ---------------------------------------------------------------------------
// Interior standards
// ---------------------------------------------------------------------------
export const STD = {
  wallT: 0.25, // each room owns a 0.25 m wall inside its own box; adjoining rooms => 0.5 m total
  doorW: 2.2,
  doorH: 2.6,
  wideDoorW: 3.6,
  wideDoorH: 3.2,
  blastDoorW: 8,
  blastDoorH: 6,
  corridorW: 4,
  corridorH: 3.4,
  liftCabW: 3,
  liftCabD: 3,
  liftCabH: 3,
  eye: 1.7,
};

// ---------------------------------------------------------------------------
// Interior clusters: each is streamed as a unit. floorY is the walking deck of the cluster.
// ---------------------------------------------------------------------------
export const CLUSTERS = {
  tower: { id: "tower", name: "Command Tower — Bridge Deck", floorY: 190, center: [0, 195, 600], radius: 140, deck: 1 },
  crew: { id: "crew", name: "Deck 7 — Crew Deck", floorY: 50, center: [0, 53, 395], radius: 130, deck: 7 },
  eng: { id: "eng", name: "Deck 12 — Engineering", floorY: 8, center: [0, 12, 640], radius: 150, deck: 12 },
  hangar: { id: "hangar", name: "Deck 19 — Ventral Hangar", floorY: -20, center: [0, -5, 220], radius: 260, deck: 19 },
};

// Room boxes are [x0, z0, x1, z1] on the cluster floor; `h` is the clear ceiling height.
// `doors` are shared-plane openings: { to, axis: 'x'|'z', at, c, w, h, kind } where `at` is the plane
// coordinate on the door axis, `c` the centre coordinate along the wall, `kind` selects the door type.
// Doors are listed once, on the room that "owns" them (both rooms leave the opening).
export const ROOMS = {
  // ---- tower ---------------------------------------------------------------------------------
  // the bridge's forward wall IS the bridge module's front face: the exterior leaves the window band open
  bridge: { cluster: "tower", name: "Main Bridge", box: [-21, 548, 21, 600], h: 9, hero: true, frontIsHullFace: true, windowBand: { y0: 190.8, y1: 198.6, x0: -20, x1: 20 } },
  corridorT: { cluster: "tower", name: "Bridge Deck Corridor", box: [-82, 600, 82, 604], h: 3.4, corridor: true },
  holo: { cluster: "tower", name: "Tactical Operations / Holo Planning", box: [-48, 604, -22, 634], h: 5.2 },
  comms: { cluster: "tower", name: "Communications & Sensor Control", box: [22, 604, 48, 634], h: 5.2 },
  intel: { cluster: "tower", name: "Restricted Intelligence Room", box: [-82, 604, -52, 628], h: 4.2, restricted: true },
  briefing: { cluster: "tower", name: "Crew Briefing Room", box: [52, 604, 82, 628], h: 4.6 },
  liftLobbyT: { cluster: "tower", name: "Turbolift Lobby — Bridge Deck", box: [-8, 604, 8, 620], h: 3.6, lobby: true },
  observation: { cluster: "tower", name: "Aft Observation Deck", box: [-20, 620, 20, 650], h: 5.6 },

  // ---- crew deck -----------------------------------------------------------------------------
  spineC: { cluster: "crew", name: "Deck 7 Spine Corridor", box: [-2.5, 306, 2.5, 440], h: 3.4, corridor: true },
  crossC: { cluster: "crew", name: "Deck 7 Cross Corridor", box: [-52, 378, 56, 382], h: 3.4, corridor: true },
  liftLobbyC: { cluster: "crew", name: "Turbolift Lobby — Deck 7", box: [-8, 440, 8, 452], h: 3.6, lobby: true },
  crewQuarters: { cluster: "crew", name: "Enlisted Crew Quarters", box: [2.5, 400, 34, 440], h: 3.6 },
  officersQuarters: { cluster: "crew", name: "Officers' Quarters", box: [-34, 400, -2.5, 436], h: 3.6 },
  mess: { cluster: "crew", name: "Mess Hall & Galley", box: [2.5, 336, 40, 378], h: 4.4 },
  // west wall sits 1 m inside the T1 terrace's sloped flank: its slanted viewports look out over the dorsal hull
  lounge: { cluster: "crew", name: "Recreation Lounge", box: [-78, 346, -52, 384], h: 4.2, viewport: true },
  medbay: { cluster: "crew", name: "Medical Bay", box: [2.5, 306, 30, 334], h: 3.8 },
  armory: { cluster: "crew", name: "Armory & Equipment Storage", box: [-30, 306, -2.5, 338], h: 3.8 },
  detention: { cluster: "crew", name: "Security & Detention Block", box: [-16, 452, 16, 480], h: 3.6 },

  // ---- engineering ---------------------------------------------------------------------------
  liftLobbyE: { cluster: "eng", name: "Turbolift Lobby — Deck 12", box: [-8, 600, 8, 612], h: 3.6, lobby: true },
  reactor: { cluster: "eng", name: "Main Reactor Chamber", box: [-30, 540, 30, 600], h: 30, floorDrop: 26, hero: true },
  engControl: { cluster: "eng", name: "Engineering Control", box: [-56, 556, -30, 600], h: 5 },
  hyperdrive: { cluster: "eng", name: "Hyperdrive & Propulsion Systems", box: [30, 556, 60, 600], h: 7 },
  corrEW: { cluster: "eng", name: "Deck 12 West Passage", box: [-56, 600, -8, 604], h: 3.4, corridor: true },
  corrEE: { cluster: "eng", name: "Deck 12 East Passage", box: [8, 600, 60, 604], h: 3.4, corridor: true },
  spineE: { cluster: "eng", name: "Deck 12 Spine Corridor", box: [-2.5, 612, 2.5, 664], h: 3.4, corridor: true },
  lifeSupport: { cluster: "eng", name: "Life Support — Air, Water & Waste", box: [-46, 612, -2.5, 656], h: 7 },
  maintenance: { cluster: "eng", name: "Maintenance & Repair Bay", box: [2.5, 612, 46, 656], h: 8 },
  cargo: { cluster: "eng", name: "Cargo Storage & Logistics Bay", box: [-46, 664, 46, 740], h: 12 },

  // ---- hangar --------------------------------------------------------------------------------
  liftLobbyH: { cluster: "hangar", name: "Turbolift Lobby — Deck 19", box: [-8, 86, 8, 100], h: 3.6, lobby: true },
  hangar: { cluster: "hangar", name: "Main Hangar Bay", box: [-60, 100, 60, 290], h: 42, hero: true },
  // raised booth inside the hangar volume (built by the hangar module, no separate shell / doors)
  flightControl: { cluster: "hangar", name: "Hangar Flight Control", box: [-12, 100, 12, 108], h: 3.2, floorY: -8, booth: true, sub: "hangar" },
  fighterMaint: { cluster: "hangar", name: "Fighter Maintenance & Refuelling", box: [60, 150, 100, 230], h: 14 },
  shuttleBay: { cluster: "hangar", name: "Shuttle Docking Bay", box: [-50, 290, 50, 380], h: 22 },
  escapePods: { cluster: "hangar", name: "Emergency Escape Pod Bay", box: [-100, 120, -60, 160], h: 4 },
};

// Doors between rooms (shared planes). axis 'z' => the door sits in a wall of constant z = at, centred at x = c.
// axis 'x' => wall of constant x = at, centred at z = c. Sizes default to STD door / kind.
export const DOORS = [
  // tower
  { id: "bridge_main", a: "bridge", b: "corridorT", axis: "z", at: 600, c: 0, kind: "wide" },
  { id: "bridge_w", a: "bridge", b: "corridorT", axis: "z", at: 600, c: -14, kind: "std" },
  { id: "bridge_e", a: "bridge", b: "corridorT", axis: "z", at: 600, c: 14, kind: "std" },
  { id: "holo_door", a: "corridorT", b: "holo", axis: "z", at: 604, c: -35, kind: "wide" },
  { id: "comms_door", a: "corridorT", b: "comms", axis: "z", at: 604, c: 35, kind: "wide" },
  { id: "intel_door", a: "corridorT", b: "intel", axis: "z", at: 604, c: -67, kind: "std", locked: "ISB CLEARANCE" },
  { id: "briefing_door", a: "corridorT", b: "briefing", axis: "z", at: 604, c: 67, kind: "std" },
  { id: "lobbyT_door", a: "corridorT", b: "liftLobbyT", axis: "z", at: 604, c: 0, kind: "wide" },
  { id: "obs_door", a: "liftLobbyT", b: "observation", axis: "z", at: 620, c: 0, kind: "wide" },
  // crew
  { id: "lobbyC_door", a: "spineC", b: "liftLobbyC", axis: "z", at: 440, c: 0, kind: "wide" },
  { id: "detention_door", a: "liftLobbyC", b: "detention", axis: "z", at: 452, c: 0, kind: "std", locked: "SECURITY" },
  { id: "crewq_door", a: "spineC", b: "crewQuarters", axis: "x", at: 2.5, c: 420, kind: "std" },
  { id: "offq_door", a: "spineC", b: "officersQuarters", axis: "x", at: -2.5, c: 418, kind: "std" },
  { id: "mess_door", a: "spineC", b: "mess", axis: "x", at: 2.5, c: 356, kind: "wide" },
  { id: "mess_door2", a: "crossC", b: "mess", axis: "z", at: 378, c: 20, kind: "std" },
  { id: "lounge_door", a: "crossC", b: "lounge", axis: "x", at: -52, c: 380, kind: "wide" },
  { id: "medbay_door", a: "spineC", b: "medbay", axis: "x", at: 2.5, c: 320, kind: "wide" },
  { id: "armory_door", a: "spineC", b: "armory", axis: "x", at: -2.5, c: 322, kind: "std", locked: "ARMORY" },
  // engineering
  { id: "reactor_door", a: "liftLobbyE", b: "reactor", axis: "z", at: 600, c: 0, kind: "blastSmall" },
  { id: "engctl_reactor", a: "engControl", b: "reactor", axis: "x", at: -30, c: 592, kind: "std" },
  { id: "hyper_reactor", a: "hyperdrive", b: "reactor", axis: "x", at: 30, c: 592, kind: "std" },
  { id: "corrEW_lobby", a: "corrEW", b: "liftLobbyE", axis: "x", at: -8, c: 602, kind: "std" },
  { id: "corrEE_lobby", a: "corrEE", b: "liftLobbyE", axis: "x", at: 8, c: 602, kind: "std" },
  { id: "engctl_door", a: "corrEW", b: "engControl", axis: "z", at: 600, c: -43, kind: "wide" },
  { id: "hyper_door", a: "corrEE", b: "hyperdrive", axis: "z", at: 600, c: 45, kind: "wide" },
  { id: "spineE_door", a: "liftLobbyE", b: "spineE", axis: "z", at: 612, c: 0, kind: "wide" },
  { id: "life_door", a: "spineE", b: "lifeSupport", axis: "x", at: -2.5, c: 634, kind: "wide" },
  { id: "maint_door", a: "spineE", b: "maintenance", axis: "x", at: 2.5, c: 634, kind: "wide" },
  { id: "cargo_door", a: "spineE", b: "cargo", axis: "z", at: 664, c: 0, kind: "blastSmall" },
  // hangar
  { id: "lobbyH_door", a: "liftLobbyH", b: "hangar", axis: "z", at: 100, c: 0, kind: "wide" },
  { id: "maintH_door", a: "hangar", b: "fighterMaint", axis: "x", at: 60, c: 190, kind: "blast" },
  { id: "shuttle_door", a: "hangar", b: "shuttleBay", axis: "z", at: 290, c: 0, kind: "blastWide" },
  { id: "pods_door", a: "hangar", b: "escapePods", axis: "x", at: -60, c: 140, kind: "wide" },
];

export const DOOR_KINDS = {
  std: { w: STD.doorW, h: STD.doorH, style: "split" },
  wide: { w: STD.wideDoorW, h: STD.wideDoorH, style: "split" },
  blastSmall: { w: 4.4, h: 3.6, style: "blast" },
  blast: { w: STD.blastDoorW, h: STD.blastDoorH, style: "blast" },
  blastWide: { w: 14, h: 10, style: "blast" },
};

// Turbolift network: one cab per lobby wall position; every cab reaches every other deck.
export const LIFTS = [
  { id: "lift_T1", lobby: "liftLobbyT", cluster: "tower", axis: "x", at: 8, c: 610, side: 1 },
  { id: "lift_T2", lobby: "liftLobbyT", cluster: "tower", axis: "x", at: -8, c: 610, side: -1 },
  { id: "lift_C1", lobby: "liftLobbyC", cluster: "crew", axis: "x", at: 8, c: 446, side: 1 },
  { id: "lift_C2", lobby: "liftLobbyC", cluster: "crew", axis: "x", at: -8, c: 446, side: -1 },
  { id: "lift_E1", lobby: "liftLobbyE", cluster: "eng", axis: "x", at: 8, c: 606, side: 1 },
  { id: "lift_E2", lobby: "liftLobbyE", cluster: "eng", axis: "x", at: -8, c: 606, side: -1 },
  { id: "lift_H1", lobby: "liftLobbyH", cluster: "hangar", axis: "x", at: 8, c: 93, side: 1 },
  { id: "lift_H2", lobby: "liftLobbyH", cluster: "hangar", axis: "x", at: -8, c: 93, side: -1 },
];

// Hangar: TIE racks hang from the ceiling over the launch well (fighters drop straight out of the
// belly); two rows of six. `y` is the rack arm pivot height; the fighter hangs ~4 m below it.
export const HANGAR_RACKS = (() => {
  const out = [];
  for (const x of [-12, 12]) for (let i = 0; i < 6; i++) out.push({ id: `rack_${x < 0 ? "P" : "S"}${i + 1}`, x, y: 14, z: 145 + i * 18, side: x < 0 ? -1 : 1 });
  return out;
})();
// Patrol anchors around the ship (world). Fighters fly loops through these after leaving the well.
export const PATROL_LOOPS = {
  dorsal: [
    [0, -140, 240],
    [-260, -40, 60],
    [-420, 120, -300],
    [-120, 260, -700],
    [200, 240, -600],
    [380, 140, -100],
    [220, 190, 420],
    [60, 330, 700],
    [-160, 280, 620],
    [-40, 60, 380],
  ],
  ventral: [
    [0, -140, 240],
    [180, -260, 0],
    [360, -180, -420],
    [120, -120, -760],
    [-280, -220, -520],
    [-420, -160, 40],
    [-220, -260, 520],
    [120, -200, 620],
  ],
};

// Where the player appears when boarding from the exterior camera, per cluster
export const SPAWNS = {
  tower: { x: 0, z: 612, yaw: 180, room: "liftLobbyT" }, // facing the corridor / bridge
  crew: { x: 0, z: 446, yaw: 180, room: "liftLobbyC" },
  eng: { x: 0, z: 606, yaw: 180, room: "liftLobbyE" },
  hangar: { x: 0, z: 93, yaw: 180, room: "liftLobbyH" },
  bridge: { x: 0, z: 596, yaw: 0, room: "bridge" },
};

// Helpers ---------------------------------------------------------------------------------------
export function roomFloorY(id) {
  const r = ROOMS[id];
  return r.floorY !== undefined ? r.floorY : CLUSTERS[r.cluster].floorY;
}
export function roomCenter(id) {
  const r = ROOMS[id];
  return [(r.box[0] + r.box[2]) / 2, roomFloorY(id), (r.box[1] + r.box[3]) / 2];
}
export function doorSize(d) {
  const k = DOOR_KINDS[d.kind || "std"];
  return { w: d.w || k.w, h: d.h || k.h, style: d.style || k.style };
}
// Doors that touch a room (either side), with the opening expressed in that room's terms
export function doorsOf(roomId) {
  return DOORS.filter((d) => d.a === roomId || d.b === roomId);
}
