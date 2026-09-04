// Interior layout registry: decks, sectors (rooms / corridors / lobbies / lift cabs), doors and open
// links. Coordinates inside a deck are local to the deck origin (floor at local y = 0, forward = -Z).
// Bounds are the clear interior volume [min, max]; walls are built 0.16 m outside them, so adjacent
// sectors leave a 0.4 m (or wider) gap that the door tunnel fills.
//
// Door: { a, b, pos: [x, z], wall: "x" | "z", w, h, style }
//   wall "x": the wall runs along X, the door is crossed along Z (pos.z is the wall plane midpoint).
//   wall "z": the wall runs along Z, the door is crossed along X.
//   style: "single" (2.2 m sliding pair), "double" (wider pair), "blast" (heavy segmented, slow),
//          "secure" (red-marked, with a keypad prop), "lift" (turbolift cab door), "open" (a framed
//          opening without panels: still a visibility edge).
//
// Rooms get a `builder` name resolved in interior/rooms/index.js. Lobbies, corridors and lift cabs use
// the shared Imperial builders. `spawn` is the default standing spot + yaw (deg) used by teleports.

export const DECKS = [
  {
    id: "bridge",
    index: 1,
    name: "Bridge Deck",
    origin: [0, 180, 640],
    sectors: [
      { id: "d1_lift", kind: "lift", name: "Turbolift", bounds: [[-1.6, 0, 3.4], [1.6, 3.0, 6.4]] },
      { id: "d1_lobby", kind: "lobby", name: "Bridge Lobby", bounds: [[-5, 0, -3], [5, 3.6, 3]], spawn: [0, 1.5, 0] },
      { id: "d1_corridor", kind: "corridor", name: "Bridge Access Corridor", bounds: [[-2, 0, -14.6], [2, 3.6, -3.4]] },
      { id: "d1_bridge", kind: "room", builder: "bridge", name: "Main Bridge", bounds: [[-24, -2, -49], [24, 8, -15]], seesExterior: true, spawn: [0, -18, 0] },
      { id: "d1_comms", kind: "room", builder: "comms", name: "Communications & Sensor Control", bounds: [[2.4, 0, -13], [16, 3.6, -4]], spawn: [9, -8.5, 90] },
      { id: "d1_intel", kind: "room", builder: "intel", name: "Restricted Command Intelligence", bounds: [[-16, 0, -13], [-2.4, 3.6, -4]], spawn: [-9, -8.5, -90] },
    ],
    doors: [
      { a: "d1_lobby", b: "d1_lift", pos: [0, 3.2], wall: "x", w: 2.0, h: 2.6, style: "lift" },
      { a: "d1_lobby", b: "d1_corridor", pos: [0, -3.2], wall: "x", w: 3.2, h: 3.2, style: "open" },
      { a: "d1_corridor", b: "d1_bridge", pos: [0, -14.8], wall: "x", w: 3.2, h: 3.2, style: "blast" },
      { a: "d1_corridor", b: "d1_comms", pos: [2.2, -9], wall: "z", w: 2.2, h: 2.8, style: "single" },
      { a: "d1_corridor", b: "d1_intel", pos: [-2.2, -9], wall: "z", w: 2.2, h: 2.8, style: "secure" },
    ],
  },
  {
    id: "command",
    index: 2,
    name: "Command Deck",
    origin: [0, 150, 610],
    sectors: [
      { id: "d2_lift", kind: "lift", name: "Turbolift", bounds: [[-1.6, 0, 3.4], [1.6, 3.0, 6.4]] },
      { id: "d2_lobby", kind: "lobby", name: "Command Lobby", bounds: [[-5, 0, -3], [5, 3.6, 3]], spawn: [0, 1.5, 0] },
      { id: "d2_corridor", kind: "corridor", name: "Command Corridor", bounds: [[-2, 0, -40.6], [2, 3.6, -3.4]] },
      { id: "d2_tactical", kind: "room", builder: "tactical", name: "Tactical Operations", bounds: [[-22, 0, -24], [-2.4, 5, -8]], spawn: [-5.2, -16, 90] },
      { id: "d2_nav", kind: "room", builder: "navigation", name: "Navigation & Flight Control", bounds: [[2.4, 0, -24], [18, 3.6, -12]], spawn: [10, -18, 90] },
      { id: "d2_briefing", kind: "room", builder: "briefing", name: "Crew Briefing Room", bounds: [[2.4, 0, -11], [18, 3.6, -4]], spawn: [5.2, -7.5, -90] },
      { id: "d2_officers", kind: "room", builder: "officers", name: "Officers' Quarters", bounds: [[-24, 0, -7], [-5.4, 3.6, 7]], spawn: [-14, 0, -90] },
      // the gallery's glass wall (zmin, local -48) sits on the tower neck's front face (world z = 562)
      { id: "d2_observation", kind: "room", builder: "observation", name: "Observation Gallery", bounds: [[-16, 0, -48], [16, 4, -41]], seesExterior: true, spawn: [0, -44, 0] },
    ],
    doors: [
      { a: "d2_lobby", b: "d2_lift", pos: [0, 3.2], wall: "x", w: 2.0, h: 2.6, style: "lift" },
      { a: "d2_lobby", b: "d2_corridor", pos: [0, -3.2], wall: "x", w: 3.2, h: 3.2, style: "open" },
      { a: "d2_corridor", b: "d2_tactical", pos: [-2.2, -16], wall: "z", w: 2.6, h: 3.0, style: "double" },
      { a: "d2_corridor", b: "d2_nav", pos: [2.2, -18], wall: "z", w: 2.2, h: 2.8, style: "single" },
      { a: "d2_corridor", b: "d2_briefing", pos: [2.2, -7.5], wall: "z", w: 2.2, h: 2.8, style: "single" },
      { a: "d2_lobby", b: "d2_officers", pos: [-5.2, 0], wall: "z", w: 2.2, h: 2.8, style: "single" },
      { a: "d2_corridor", b: "d2_observation", pos: [0, -40.8], wall: "x", w: 3.0, h: 3.0, style: "double" },
    ],
  },
  {
    id: "crew",
    index: 3,
    name: "Crew Deck",
    origin: [0, 60, 450],
    sectors: [
      { id: "d3_lift", kind: "lift", name: "Turbolift", bounds: [[-1.6, 0, 3.4], [1.6, 3.0, 6.4]] },
      { id: "d3_lobby", kind: "lobby", name: "Crew Deck Lobby", bounds: [[-5, 0, -3], [5, 3.6, 3]], spawn: [0, 1.5, 0] },
      { id: "d3_corridor", kind: "corridor", name: "Crew Deck Main Corridor", bounds: [[-2.5, 0, -70.6], [2.5, 3.6, -3.4]] },
      { id: "d3_crossP", kind: "corridor", name: "Port Cross Corridor", bounds: [[-42, 0, -38], [-2.9, 3.6, -34]] },
      { id: "d3_crossS", kind: "corridor", name: "Starboard Cross Corridor", bounds: [[2.9, 0, -38], [42, 3.6, -34]] },
      { id: "d3_mess", kind: "room", builder: "mess", name: "Mess Hall & Galley", bounds: [[2.9, 0, -30], [30, 4, -8]], spawn: [12, -19, 90] },
      { id: "d3_quarters", kind: "room", builder: "quarters", name: "Crew Quarters", bounds: [[-34, 0, -30], [-2.9, 3.6, -8]], spawn: [-12, -19, -90] },
      { id: "d3_medbay", kind: "room", builder: "medbay", name: "Medical Bay", bounds: [[2.9, 0, -64], [26, 3.6, -42]], spawn: [12, -53, 90] },
      { id: "d3_rec", kind: "room", builder: "recreation", name: "Recreation Lounge", bounds: [[-26, 0, -64], [-2.9, 3.6, -42]], spawn: [-12, -53, -90] },
      { id: "d3_armory", kind: "room", builder: "armory", name: "Armoury & Equipment Storage", bounds: [[-56, 0, -44], [-42.4, 3.6, -28]], spawn: [-48, -36, -90] },
      { id: "d3_detention", kind: "room", builder: "detention", name: "Security & Detention Block", bounds: [[42.4, 0, -46], [62, 3.6, -26]], spawn: [50, -36, 90] },
      { id: "d3_escape", kind: "room", builder: "escape", name: "Emergency Escape Pod Bay", bounds: [[-14, 0, -86], [14, 4, -71]], spawn: [0, -76, 0] },
      { id: "d3_lifesupport", kind: "room", builder: "lifesupport", name: "Life Support Systems", bounds: [[-30, 0, -7], [-5.4, 4.5, 8]], spawn: [-14, 0, -90] },
    ],
    doors: [
      { a: "d3_lobby", b: "d3_lift", pos: [0, 3.2], wall: "x", w: 2.0, h: 2.6, style: "lift" },
      { a: "d3_lobby", b: "d3_corridor", pos: [0, -3.2], wall: "x", w: 3.6, h: 3.2, style: "open" },
      { a: "d3_corridor", b: "d3_crossP", pos: [-2.7, -36], wall: "z", w: 4.0, h: 3.6, style: "open" },
      { a: "d3_corridor", b: "d3_crossS", pos: [2.7, -36], wall: "z", w: 4.0, h: 3.6, style: "open" },
      { a: "d3_corridor", b: "d3_mess", pos: [2.7, -19], wall: "z", w: 3.0, h: 3.0, style: "double" },
      { a: "d3_corridor", b: "d3_quarters", pos: [-2.7, -19], wall: "z", w: 2.2, h: 2.8, style: "single" },
      { a: "d3_corridor", b: "d3_medbay", pos: [2.7, -53], wall: "z", w: 2.6, h: 2.8, style: "double" },
      { a: "d3_corridor", b: "d3_rec", pos: [-2.7, -53], wall: "z", w: 2.6, h: 2.8, style: "double" },
      { a: "d3_crossP", b: "d3_armory", pos: [-42.2, -36], wall: "z", w: 2.2, h: 2.8, style: "secure" },
      { a: "d3_crossS", b: "d3_detention", pos: [42.2, -36], wall: "z", w: 2.2, h: 2.8, style: "secure" },
      { a: "d3_corridor", b: "d3_escape", pos: [0, -70.8], wall: "x", w: 3.0, h: 3.0, style: "blast" },
      { a: "d3_lobby", b: "d3_lifesupport", pos: [-5.2, 0], wall: "z", w: 2.2, h: 2.8, style: "single" },
    ],
  },
  {
    id: "engineering",
    index: 4,
    name: "Engineering Deck",
    origin: [0, 10, 560],
    sectors: [
      { id: "d4_lift", kind: "lift", name: "Turbolift", bounds: [[-1.6, 0, 3.4], [1.6, 3.0, 6.4]] },
      { id: "d4_lobby", kind: "lobby", name: "Engineering Lobby", bounds: [[-5, 0, -3], [5, 3.6, 3]], spawn: [0, 1.5, 0] },
      { id: "d4_corridor", kind: "corridor", name: "Engineering Corridor", bounds: [[-2.5, 0, -64.6], [2.5, 3.8, -3.4]] },
      { id: "d4_engctrl", kind: "room", builder: "engineering", name: "Engineering Control", bounds: [[-32, 0, -30], [-2.9, 4, -8]], spawn: [-14, -19, -90] },
      { id: "d4_hyperdrive", kind: "room", builder: "hyperdrive", name: "Hyperdrive Chamber", bounds: [[2.9, 0, -32], [36, 8, -6]], spawn: [14, -19, 90] },
      { id: "d4_maintenance", kind: "room", builder: "maintenance", name: "Maintenance & Repair Bay", bounds: [[2.9, 0, -64], [48, 9, -36]], spawn: [16, -50, 90] },
      { id: "d4_cargo", kind: "room", builder: "cargo", name: "Cargo & Logistics Bay", bounds: [[-48, 0, -64], [-2.9, 9, -36]], spawn: [-16, -50, -90] },
      { id: "d4_reactor", kind: "room", builder: "reactor", name: "Main Reactor Chamber", bounds: [[-24, -12, -112], [24, 20, -65]], spawn: [0, -72, 0] },
    ],
    doors: [
      { a: "d4_lobby", b: "d4_lift", pos: [0, 3.2], wall: "x", w: 2.0, h: 2.6, style: "lift" },
      { a: "d4_lobby", b: "d4_corridor", pos: [0, -3.2], wall: "x", w: 3.6, h: 3.4, style: "open" },
      { a: "d4_corridor", b: "d4_engctrl", pos: [-2.7, -19], wall: "z", w: 2.6, h: 3.0, style: "double" },
      { a: "d4_corridor", b: "d4_hyperdrive", pos: [2.7, -19], wall: "z", w: 3.0, h: 3.2, style: "blast" },
      { a: "d4_corridor", b: "d4_maintenance", pos: [2.7, -50], wall: "z", w: 4.0, h: 3.6, style: "blast" },
      { a: "d4_corridor", b: "d4_cargo", pos: [-2.7, -50], wall: "z", w: 4.0, h: 3.6, style: "blast" },
      { a: "d4_corridor", b: "d4_reactor", pos: [0, -64.8], wall: "x", w: 3.2, h: 3.4, style: "blast" },
    ],
  },
  {
    id: "hangar",
    index: 5,
    name: "Hangar Deck",
    origin: [0, -30, 95],
    sectors: [
      { id: "d5_lift", kind: "lift", name: "Turbolift", bounds: [[-1.6, 0, 3.4], [1.6, 3.0, 6.4]] },
      { id: "d5_lobby", kind: "lobby", name: "Hangar Deck Lobby", bounds: [[-5, 0, -3], [5, 3.6, 3]], spawn: [0, 1.5, 0] },
      { id: "d5_corridor", kind: "corridor", name: "Hangar Access Corridor", bounds: [[-2.5, 0, -34.6], [2.5, 3.8, -3.4]] },
      { id: "d5_cargo", kind: "room", builder: "hangarCargo", name: "Cargo Lift & Logistics", bounds: [[2.9, 0, -30], [28, 7, -8]], spawn: [12, -19, 90] },
      { id: "d5_hangar", kind: "room", builder: "hangar", name: "Main Hangar Bay", bounds: [[-36, -16, -155], [36, 30, -35]], seesExterior: true, spawn: [0, -45, 0] },
      { id: "d5_fighterbay", kind: "room", builder: "fighterBay", name: "Fighter Maintenance & Refuelling", bounds: [[36.4, 0, -125], [70, 14, -75]], spawn: [50, -100, 90] },
      { id: "d5_shuttlebay", kind: "room", builder: "shuttleBay", name: "Shuttle & Secondary Docking Bay", bounds: [[-90, 0, -140], [-36.4, 18, -70]], spawn: [-55, -105, -90] },
    ],
    doors: [
      { a: "d5_lobby", b: "d5_lift", pos: [0, 3.2], wall: "x", w: 2.0, h: 2.6, style: "lift" },
      { a: "d5_lobby", b: "d5_corridor", pos: [0, -3.2], wall: "x", w: 3.6, h: 3.4, style: "open" },
      { a: "d5_corridor", b: "d5_cargo", pos: [2.7, -19], wall: "z", w: 4.0, h: 3.6, style: "blast" },
      { a: "d5_corridor", b: "d5_hangar", pos: [0, -34.8], wall: "x", w: 4.0, h: 3.6, style: "blast" },
      { a: "d5_hangar", b: "d5_fighterbay", pos: [36.2, -100], wall: "z", w: 12, h: 9, style: "open" },
      { a: "d5_hangar", b: "d5_shuttlebay", pos: [-36.2, -105], wall: "z", w: 16, h: 12, style: "open" },
    ],
  },
];

// The hangar's ventral opening in deck-local coordinates (also cut into the exterior hull).
export const HANGAR_OPENING = { x: [-22, 22], z: [-130, -60] };

export function findDeck(id) {
  return DECKS.find((d) => d.id === id);
}

export function findSector(id) {
  for (const d of DECKS) {
    const s = d.sectors.find((s) => s.id === id);
    if (s) return { deck: d, sector: s };
  }
  return null;
}

// World-space helpers
export function sectorWorldBounds(deck, s) {
  const [ox, oy, oz] = deck.origin;
  return {
    min: [s.bounds[0][0] + ox, s.bounds[0][1] + oy, s.bounds[0][2] + oz],
    max: [s.bounds[1][0] + ox, s.bounds[1][1] + oy, s.bounds[1][2] + oz],
  };
}
