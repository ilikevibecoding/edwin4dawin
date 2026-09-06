// The spaceport plan: every rectangle, pad and hall of the Coruscant west-edge hub as plain data (world blocks,
// inclusive unless noted). The plateau cannot grow (the lower city ring occupies the surroundings), so the port grows
// the Coruscant way: an ELEVATED APRON at the deck level (top layer 96, feet on 97) cantilevered west over the lower
// city on pylons down to the terraces, and north / south over the plateau on the old deck's pillars.
//
//   x 2144 .. 2487  apron over the lower city (bands 0..3 of the ring; the hyperlane runs under it in a lit slot)
//   x 2488 .. 2575  plateau strip (the Coruscant station sits in an open cut, the freight lane runs underneath)
//   x 2576 .. 2716  the original deck, extended north and south
//
// Programs (see spaceport.js for the painters): the grand terminal with the 4-platform terminus beneath it, three pad
// fields of three sizes, three repair hangars, a control tower, the cargo terminal on the north plateau strip, the
// security apron on the south strip, the ship dealer showroom beside the old workshop, and the original 8-pad
// "east terminal" with its tower, hangar and fuel farm.
export const DECK_TOP = 96;              // top block layer of the deck
export const DECK_Y = DECK_TOP + 1;      // walking surface / landing-gear height on the pads
export const STATION_Y = 90;             // floor layer of the Coruscant train platform bridge

export const RECT = { x0: 2144, z0: -310, x1: 2720, z1: 288 };          // structure AABB and district rect (x1, z1 exclusive)
export const DECK = { x0: 2144, z0: -306, x1: 2716, z1: 283 };          // inclusive deck extent
export const PLATEAU_X0 = 2488;                                          // first plateau column (west of it: the lower city)
export const OLD_DECK_X0 = 2576;                                         // the original deck (2x2 pillars on a 16 grid)
// holes in the deck: the Coruscant station's open cut and the covered bridge / half-step ramp from it
export const STATION_CUT = { x0: 2472, x1: 2561, z0: -9, z1: 27 };
export const RAMP_CUT = { x0: 2561, x1: 2588, z0: -7, z1: 7 };
// the hyperlane slot under the apron: only the 96 plate over it (lit), no lower layers, girders or supports
export const TRACK_SLOT = { z0: -7, z1: 9 };
// the freight lane on the plateau ground (feet 61) from the ramp head at x 2559 west to the cut in the plateau edge
export const FREIGHT_LANE = { x0: 2488, x1: 2560, z0: -10, z1: -8 };
export const FREIGHT_RAMP_BOX = { x0: 2478, x1: 2487, z0: -75, z1: -3 };  // the switchback ramp on the west face (keep clear)

// pylons under the apron (4x4, centre cell = x..x+1 / z..z+1 with one more ring), on the terraces
export const PYLON_XS = [2160, 2200, 2240, 2288, 2320, 2360, 2400, 2440, 2480];
export const PYLON_ZS = [-276, -236, -192, -148, -104, -60, -16, 16, 60, 104, 148, 192, 236, 276];
export function pylonAllowed(x, z) {
  if (x >= FREIGHT_RAMP_BOX.x0 - 2 && z >= FREIGHT_RAMP_BOX.z0 - 2 && z <= FREIGHT_RAMP_BOX.z1 + 2) return false;
  if (x >= STATION_CUT.x0 - 3 && z >= STATION_CUT.z0 - 3 && z <= STATION_CUT.z1 + 3) return false;
  if (z >= TRACK_SLOT.z0 - 2 && z <= TRACK_SLOT.z1 + 2) return false;
  return true;
}

// ------------------------------------------------------------------------------------------------ grand terminal
// Westport Grand Terminal: hall floor on the deck (96 / feet 97), walls 97 .. 109, stepped glass roof 110 .. 112.
// The terminus (4 platforms at the hyperlane level, feet 92) is under it, reached by stairs and lift shafts.
export const TERMINAL = { x0: 2240, x1: 2359, z0: -46, z1: 60, cx: 2300, wallTop: 109, roof: 110 };
export const TERMINAL_DOORS = [
  { side: 'W', x: 2240, z: 0, w: 4 }, { side: 'E', x: 2359, z: 0, w: 4 },
  { side: 'N', x: 2270, z: -46, w: 4 }, { side: 'N', x: 2330, z: -46, w: 4 },
  { side: 'S', x: 2270, z: 60, w: 4 }, { side: 'S', x: 2330, z: 60, w: 4 },
];
// interior zones (inclusive), all at the hall floor
export const TZ = {
  checkIn: { x0: 2246, x1: 2300, z0: -40, z1: -30 },          // counters facing south, baggage hall behind them
  baggage: { x0: 2246, x1: 2300, z0: -44, z1: -35 },
  customs: { x0: 2310, x1: 2354, z0: -42, z1: -14 },          // customs hall with scanner arches, exit to the pad-side doors
  waiting: { x0: 2246, x1: 2300, z0: -24, z1: -12 },
  kiosk: { x: 2300, z: 4 },                                    // information kiosk on the central spine
  cafe: { x0: 2246, x1: 2276, z0: 18, z1: 40 },
  shops: { x0: 2282, x1: 2354, z0: 32, z1: 40 },              // stalls along the concourse's south side
  toilets: { x0: 2334, x1: 2354, z0: 44, z1: 56 },
  gallery: { x0: 2244, x1: 2355, z0: -44, z1: -36, y: 103 },  // viewing gallery (mezzanine over the check-in hall)
  concourse: { x0: 2246, x1: 2354, z0: 12, z1: 58 },          // terminus concourse: stair heads + lift shafts
};

// ------------------------------------------------------------------------------------------------ terminus
// Track 0 is the live hyperlane (deck z -4..3). Yard tracks A/B/C are static copies south of it with the spare train
// parked on A. Platforms (floor 91, feet 92): P1 south of the live track, P2 south of A, P3/P4 an island between B/C.
export const TERMINUS = {
  x0: 2264, x1: 2323,                                          // platform length (60)
  yardX0: 2196, yardX1: 2338,                                   // yard tracks run west of the platforms to a stub end
  tracks: [{ id: 'A', z0: 12, z1: 19 }, { id: 'B', z0: 28, z1: 35 }, { id: 'C', z0: 44, z1: 51 }],
  platforms: [
    { n: 1, z0: 3, z1: 10, screen: 3 },                        // live track
    { n: 2, z0: 20, z1: 27, screen: 20 },                      // faces track A (the spare train's doors)
    { n: 3, z0: 36, z1: 43, screen: 36 },                      // island: faces B ...
    { n: 4, z0: 36, z1: 43, screen: 43 },                      // ... and C
  ],
  spareTrainX0: 2246,                                          // west end of the parked spare train on track A
  stairs: [{ x: 2276, z: 6 }, { x: 2312, z: 23 }, { x: 2276, z: 39 }, { x: 2312, z: 39 }],   // stair heads (deck) per platform
  lifts: [{ x: 2300, z: 4 }, { x: 2300, z: 22 }, { x: 2300, z: 38 }],                          // glass lift shafts
  ceiling: 96,                                                 // the deck plate (lit)
};

// ------------------------------------------------------------------------------------------------ pads
// Three sizes: L (half 24, 48x48: bulk freighter 38, cruiser 40), M (half 18: shuttle, gunship, air bus), S (half
// 12: light freighter, taxi, police). Gate ids run 1..8 on the old east pads, then 9.. on the new fields.
export const PAD_SIZES = { L: 24, M: 18, S: 12 };
// the original eight pads (east terminal, S size)
export const OLD_PADS = [
  { x: 2596, z: -68 }, { x: 2648, z: -68 }, { x: 2596, z: -116 }, { x: 2648, z: -116 },
  { x: 2596, z: 68 }, { x: 2648, z: 68 }, { x: 2596, z: 116 }, { x: 2648, z: 116 },
].map((p) => ({ ...p, size: 'S' }));
// field A: six L pads north-west of the terminal (two rows of three)
const FIELD_A = [[2184, -100], [2240, -100], [2296, -100], [2184, -156], [2240, -156], [2296, -156]].map(([x, z]) => ({ x, z, size: 'L' }));
// field B: four M pads south of the terminal
const FIELD_B = [[2176, 120], [2220, 120], [2264, 120], [2308, 120]].map(([x, z]) => ({ x, z, size: 'M' }));
// field C: eight S pads east of the terminal (two rows of three) and two west of it
const FIELD_C = [[2380, -30], [2416, -30], [2452, -30], [2380, 40], [2416, 40], [2452, 40], [2200, -28], [2200, 44]].map(([x, z]) => ({ x, z, size: 'S' }));
// security apron (south plateau strip): two M pads for gunships
export const SECURITY_PADS = [[2540, 238], [2600, 238]].map(([x, z]) => ({ x, z, size: 'M' }));
export const NEW_PADS = [...FIELD_A, ...FIELD_B, ...FIELD_C, ...SECURITY_PADS];
export const PADS = [...OLD_PADS, ...NEW_PADS];              // gate id = index + 1
export const padHalf = (pad) => PAD_SIZES[pad.size];
// the fleet types per pad index (traffic.js: 0 light freighter, 1 shuttle, 2 taxi, 3 gunship, 4 bulk freighter,
// 5 cruiser, 6 starfighter, 7 police, 8 air bus)
export const PAD_TYPES = [
  0, 1, 0, 2, 0, 8, 1, 7,                                      // old S pads: light freighters, shuttles, taxi, bus, police
  4, 5, 4, 5, 4, 5,                                            // field A (L): bulk freighters and cruisers
  1, 3, 8, 1,                                                  // field B (M): shuttles, gunship, air bus
  0, 2, 7, 0, 2, 6, 0, 7,                                      // field C (S): light freighters, taxis, police, starfighter
  3, 3,                                                        // security apron: gunships
];

// ------------------------------------------------------------------------------------------------ hangars + tower
// Three repair hangars along the north edge of the west apron, open fronts facing south onto the repair apron; the
// repair berths (traffic.js) stand inside them. Roof 113 (16 above the floor), opening 28 wide x 15 high.
export const HANGARS = [
  { id: 'H1', x0: 2196, x1: 2239, z0: -302, z1: -266 },
  { id: 'H2', x0: 2248, x1: 2291, z0: -302, z1: -266 },
  { id: 'H3', x0: 2300, x1: 2343, z0: -302, z1: -266 },
];
export const HANGAR_ROOF = 113, HANGAR_OPEN_H = 15, HANGAR_OPEN_HALF = 14;
// [type, x, z, yaw] of the ships under repair inside the hangars (nose toward the open south front: yaw 0)
export const REPAIR_BERTHS = [[4, 2217, -284, 0], [0, 2269, -286, 0], [1, 2321, -286, 0]];
// West tower: 8x8 shaft, cab at 165 (68 above the deck), radar mast above the cab
export const WEST_TOWER = { x0: 2364, x1: 2371, z0: -240, z1: -233, cabY: 165, roofY: 170 };
// the original east tower (cab at 151)
export const EAST_TOWER = { x0: 2688, x1: 2695, z0: -4, z1: 3, cabY: 151, roofY: 156 };
// emergency stair towers at the apron edge (deck 97 down to the terrace / plateau), painter.js switchbackTower
export const EMERGENCY_STAIRS = [
  { x0: 2400, z0: -306, ground: 'lower' }, { x0: 2400, z0: 278, ground: 'lower' }, { x0: 2160, z0: 0 - 3, ground: 'lower' },
  { x0: 2562, z0: -24, ground: 'plateau' },                    // beside the freight lane: the ramp head stays reachable from the deck
];

// ------------------------------------------------------------------------------------------------ cargo terminal
// North plateau strip: container yard with two gantry cranes, the hauler dock (two bays + manifest office), the
// conveyor into the cargo hall (bonded store, storage rooms, dispatch office).
export const CARGO = {
  yard: { x0: 2496, x1: 2604, z0: -300, z1: -232 },
  cranes: [2520, 2570],                                        // x of the two portal cranes spanning the yard in z
  dock: { x0: 2496, x1: 2604, z0: -226, z1: -196 },            // hauler dock: two bays with a marked apron
  office: { x0: 2586, x1: 2604, z0: -226, z1: -212 },          // manifest office (glass box on the dock)
  hall: { x0: 2612, x1: 2712, z0: -300, z1: -196, roof: 109 },  // cargo hall
  conveyor: { z: -240, x0: 2560, x1: 2612 },                   // belt from the yard into the hall (west wall opening)
  bonded: { x0: 2660, x1: 2710, z0: -298, z1: -260 },          // bonded storage (cage inside the hall)
  stores: [{ x0: 2614, x1: 2656, z0: -298, z1: -280 }, { x0: 2614, x1: 2656, z0: -276, z1: -258 }],
  dispatch: { x0: 2680, x1: 2710, z0: -232, z1: -200 },        // dispatch office (the depot's front desk)
  doors: [{ side: 'S', x: 2662, z: -196 }, { side: 'W', x: 2612, z: -220 }],
};

// ------------------------------------------------------------------------------------------------ security apron
export const SECURITY = {
  x0: 2496, x1: 2660, z0: 190, z1: 280,                        // fenced annex on the south plateau strip
  post: { x0: 2620, x1: 2650, z0: 200, z1: 226 },              // Coruscant Guard post (hall + watch room)
  gate: { x: 2510, z0: 190 },                                  // gate in the north fence (checkpoint), 6 wide
  gateX0: 2508, gateX1: 2513,
};

// ------------------------------------------------------------------------------------------------ dealer
// Glass showroom beside the old workshop: four plinths (speeder, shuttle, freighter, yacht) with price holo boards.
export const DEALER = { x0: 2662, x1: 2715, z0: 92, z1: 152, roof: 108, door: { x: 2662, z: 122 } };
export const DEALER_PLINTHS = [
  { cls: 'speeder', type: 2, x: 2705, z: 143, yaw: 0 },
  { cls: 'shuttle', type: 1, x: 2700, z: 108, yaw: 0 },
  { cls: 'freighter', type: 0, x: 2675, z: 140, yaw: 0 },
  { cls: 'yacht', type: 5, x: 2676, z: 113, yaw: 0 },
];

// ------------------------------------------------------------------------------------------------ the east terminal (original)
export const EAST = {
  terminal: { x0: 2592, x1: 2650, z0: -40, z1: 40, cx: 2621 },
  spine: { x0: 2612, x1: 2631, zEnd: 146 },
  hangar: { x0: 2672, x1: 2711, z0: -140, z1: -100 },
  fuel: { x0: 2672, x1: 2711, z0: -94, z1: -48, tanks: [[2681, -84], [2701, -84], [2681, -60], [2701, -60]] },
  yardN: { x0: 2584, x1: 2711, z0: -172, z1: -148 },
  yardS: { x0: 2584, x1: 2711, z0: 148, z1: 172 },
  workshop: { x0: 2680, x1: 2711, z0: 56, z1: 84 },
  bridge: { x0: 2561, x1: 2575, hw: 6 },
  ramp: { x0: 2576, x1: 2588, hw: 6 },
};

// ------------------------------------------------------------------------------------------------ halls (lots + signs)
// The halls the economy / signs system should know about: registered as landmark lots of the city layout (kind
// 'landmark', low height so the skyline skips them) with a fixed purpose; their doors are on the deck (feet 97).
export const HALLS = [
  { key: 'terminal', name: 'Westport Grand Terminal', purpose: 'transit_station', rect: TERMINAL, front: 'W', door: { x: 2240, z: 0 } },
  { key: 'customs', name: 'Westport Customs Hall', purpose: 'customs', rect: { x0: 2310, x1: 2354, z0: -42, z1: -14 }, front: 'S', door: { x: 2332, z: -14 }, inner: true },
  { key: 'cafe', name: 'Departures Caf', purpose: 'caf', rect: { x0: 2246, x1: 2276, z0: 18, z1: 40 }, front: 'E', door: { x: 2276, z: 29 }, inner: true },
  { key: 'shop', name: 'Concourse Traders', purpose: 'general_store', rect: { x0: 2282, x1: 2310, z0: 32, z1: 40 }, front: 'N', door: { x: 2296, z: 32 }, inner: true },
  { key: 'shop2', name: 'Spaceport Provisions', purpose: 'grocery', rect: { x0: 2318, x1: 2354, z0: 32, z1: 40 }, front: 'N', door: { x: 2336, z: 32 }, inner: true },
  { key: 'cargo', name: 'Westport Cargo Terminal', purpose: 'depot', rect: CARGO.hall, front: 'S', door: { x: 2662, z: -196 } },
  { key: 'hangar1', name: 'Repair Hangar 1', purpose: 'repair_shop', rect: HANGARS[0], front: 'S', door: { x: 2217, z: -266 } },
  { key: 'hangar2', name: 'Repair Hangar 2', purpose: 'repair_shop', rect: HANGARS[1], front: 'S', door: { x: 2269, z: -266 } },
  { key: 'hangar3', name: 'Repair Hangar 3', purpose: 'hangar', rect: HANGARS[2], front: 'S', door: { x: 2321, z: -266 } },
  { key: 'dealer', name: 'Westport Starship Showroom', purpose: 'ship_dealer', rect: DEALER, front: 'W', door: DEALER.door },
  { key: 'guard', name: 'Coruscant Guard Post - Security Apron', purpose: 'security_station', rect: SECURITY.post, front: 'W', door: { x: 2620, z: 213 } },
  { key: 'eastTerminal', name: 'East Terminal (domestic)', purpose: 'transit_station', rect: EAST.terminal, front: 'W', door: { x: 2592, z: 0 } },
];
