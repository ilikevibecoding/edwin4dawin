// The spaceport plan: every rectangle, pad and hall of the Coruscant west-edge hub as plain data (world blocks,
// inclusive unless noted). The plateau cannot grow (the lower city ring occupies the surroundings and the city lots
// north / south of the old port stay where they are), so the port grows the Coruscant way: an ELEVATED APRON at the
// deck level (top layer 96, feet on 97) cantilevered west over the lower city on pylons down to the terraces.
//
//   x 2132 .. 2487  the west apron over the lower city (bands 0..3 of the ring), z -358 .. 357
//   x 2488 .. 2575  the plateau strip: the Coruscant station sits in an open cut, the freight lane runs underneath
//   x 2576 .. 2716  the original deck (east terminal, 8 domestic pads, tower, hangar, fuel farm, yards)
// Deck area 356 x 716 + 229 x 353 = 335,733 cells (the old SPACEPORT rect was 232 x 360 = 83,520: x 4.02).
//
// The hyperlane (z -4..3, y 89..95) runs west-east through the apron in an open slot (the TUBE) under a raised glass
// promenade (the HUMP, cover 98 / walk 99) so a rider on the train's roof clears it; the Westport terminus hangs
// under the grand terminal beside the live track.
export const DECK_TOP = 96;              // top block layer of the deck
export const DECK_Y = DECK_TOP + 1;      // walking surface / landing-gear height on the pads
export const STATION_Y = 90;             // floor layer of the Coruscant train platform bridge

export const RECT = { x0: 2130, z0: -360, x1: 2720, z1: 360 };           // structure AABB (x1, z1 exclusive)
export const APRON = { x0: 2132, x1: 2487, z0: -358, z1: 357 };          // the west apron deck (inclusive)
export const PLATEAU_DECK = { x0: 2488, x1: 2716, z0: -176, z1: 176 };   // plateau strip + the original deck
export const OLD_DECK_X0 = 2576;
// holes in the plateau deck: the Coruscant station's open cut and the covered bridge / half-step ramp east of it
export const STATION_CUT = { x0: 2472, x1: 2560, z0: -9, z1: 25 };
export const RAMP_CUT = { x0: 2561, x1: 2588, z0: -7, z1: 7 };
export const inCut = (x, z) => (x >= STATION_CUT.x0 && x <= STATION_CUT.x1 && z >= STATION_CUT.z0 && z <= STATION_CUT.z1) || (x >= RAMP_CUT.x0 && x <= RAMP_CUT.x1 && z >= RAMP_CUT.z0 && z <= RAMP_CUT.z1);
// the hyperlane slot through the apron (deck layers 94..97 open) and the raised promenade over it
export const TUBE = { z0: -5, z1: 4 };
export const HUMP = { z0: -9, z1: 8, cover: 98, walk: 99, x1: 2472 };  // ramps z -9..-6 and 5..8 (4 half steps)
export const inTube = (z) => z >= TUBE.z0 && z <= TUBE.z1;
export const inHump = (x, z) => x <= HUMP.x1 && z >= HUMP.z0 && z <= HUMP.z1;
// the freight lane on the plateau ground (feet 61) from the ramp head at x 2559 west to the cut in the plateau edge
export const FREIGHT_LANE = { x0: 2488, x1: 2560, z0: -10, z1: -8 };
export const FREIGHT_RAMP_BOX = { x0: 2478, x1: 2487, z0: -75, z1: -3 };  // the switchback ramp on the west face (keep clear)

// ------------------------------------------------------------------------------------------------ pylons
// 4x4 pylons under the apron (cells x-1..x+2 / z-1..z+2) from the girder layer down to the lower-city terrace,
// clear of the hyperlane slot, the freight trenches (z = 168k) and service corridors (z = 42 + 84k) of the ring, the
// freight ramp and the terminus undercroft (which gets its own row south of its wall).
export const PYLON_XS = [2150, 2190, 2230, 2270, 2310, 2350, 2390, 2430, 2470];
export const PYLON_ZS = [-350, -300, -260, -220, -180, -140, -100, -60, -20, 20, 60, 100, 140, 180, 220, 260, 300, 350];
export function pylonZ(x, z) {
  if (z === 20 && x >= 2190 && x <= 2350) return 58;                       // under the terminus wall instead of its platforms
  return z;
}

// ------------------------------------------------------------------------------------------------ grand terminal
// Westport Grand Terminal: hall floor on the deck (96 / feet 97), walls 97 .. 109, stepped glass roof 110 .. 112.
// The hump bridges the hall (z -9..8, walk 99) with the departure boards on its faces; the north hall holds check-in,
// baggage, waiting and customs, the south hall the terminus concourse, caf, shops and toilets; a viewing gallery
// (floor 103) runs along the west wall over the pads.
export const TERMINAL = { x0: 2240, x1: 2359, z0: -46, z1: 60, cx: 2300, wallTop: 109, roof: 110 };
// ground doors (4 wide, feet 97) and the two hump doors (feet 99); side = wall the door is in
// West: from the two west pads; east: the arrivals door into customs (z -25..-22), the concourse door and the shops'
// corridor door; north: the corridor between baggage and customs (field A) and the customs' own pad door; south:
// the two corridors between the caf and the shops (field B).
export const TERMINAL_DOORS = [
  { side: 'W', x: 2240, z0: -25, z1: -22 }, { side: 'W', x: 2240, z0: 20, z1: 23 },
  { side: 'E', x: 2359, z0: -25, z1: -22 }, { side: 'E', x: 2359, z0: 20, z1: 23 }, { side: 'E', x: 2359, z0: 43, z1: 45 },
  { side: 'N', z: -46, x0: 2301, x1: 2304 }, { side: 'N', z: -46, x0: 2328, x1: 2331 },
  { side: 'S', z: 60, x0: 2280, x1: 2283 }, { side: 'S', z: 60, x0: 2316, x1: 2319 },
];
export const TERMINAL_HUMP_DOORS = [{ side: 'W', x: 2240 }, { side: 'E', x: 2359 }];
// gate numbers painted beside the pad-side doors: [door index, first gate, last gate]
export const DOOR_GATES = [[5, 9, 14], [6, 9, 14], [7, 15, 18], [8, 15, 18], [2, 19, 24], [3, 19, 24], [4, 21, 22], [0, 25, 26], [1, 25, 26]];
// interior zones (inclusive), all at the hall floor
export const TZ = {
  baggage: { x0: 2246, x1: 2298, z0: -44, z1: -34 },
  checkIn: { x0: 2248, x1: 2296, z: -30 },                      // counter row facing south, clerks behind at z -31
  waiting: { x0: 2268, x1: 2298, z0: -26, z1: -12 },            // bench rows; x 2246..2266 is the gallery stair's landing
  kiosk: { x0: 2300, x1: 2302, z0: -21, z1: -19 },                // information kiosk (at the foot of the north corridor)
  customs: { x0: 2307, x1: 2358, z0: -45, z1: -15 },            // customs hall (arrivals): glass walls on x 2307 / z -15, door z -15 x 2328..2331
  concourse: { x0: 2246, x1: 2354, z0: 10, z1: 30 },            // terminus concourse: stair heads + lift shafts
  cafe: { x0: 2246, x1: 2278, z0: 34, z1: 58 },                  // partition x 2278 with a door at z 45..46
  shop1: { x0: 2286, x1: 2314, z0: 46, z1: 58 },
  shop2: { x0: 2322, x1: 2354, z0: 46, z1: 58 },
  toilets: { x0: 2322, x1: 2354, z0: 34, z1: 42 },
  gallery: { x0: 2241, x1: 2251, y: 103 },                      // mezzanine along the west wall (feet 104)
  galleryStairs: [{ z0: -19, z1: -18 }, { z0: 30, z1: 31 }],   // 14 half steps eastward from x 2252 down to the hall
};

// ------------------------------------------------------------------------------------------------ terminus
// Westport terminus (the third stop of the hyperlane, route.js ROUTE.terminus): an undercroft under the south hall
// beside the live track. Track 0 is the hyperlane (deck z -4..3); yard tracks A/B/C are static copies south of it
// with the spare train parked on A. Platforms: floor 91 (feet 92), head room 92..95, ceiling = the deck plate 96.
export const TERMINUS = {
  name: 'Westport Terminus', dockX0: 2250, x0: 2264, x1: 2323,   // platform length 60 (the train's doors line up)
  box: { x0: 2200, x1: 2340, z0: 3, z1: 52, floor: 88 },         // undercroft (walls on x0 / x1 / z1, floor slab 88..90)
  trackX0: 2212, trackX1: 2328,                                  // yard tracks (buffers at both ends); concourses beyond them
  tracks: [{ id: 'A', z0: 12, z1: 19 }, { id: 'B', z0: 28, z1: 35 }, { id: 'C', z0: 42, z1: 49 }],   // 8-wide decks like the hyperlane's
  // island platforms between the tracks; a face gets a numbered screen line where a train's doors open onto it
  platforms: [
    { n: 1, z0: 3, z1: 11, screens: [3] },                      // live track (screens driven by the train, stations.js)
    { n: 2, z0: 19, z1: 27, screens: [19] },                    // faces track A (the spare train's doors)
    { n: 3, z0: 35, z1: 42, screens: [35] },                    // island: faces B ...
    { n: 4, z0: 35, z1: 42, screens: [42] },                    // ... and C
  ],
  supports: { xs: [2210, 2250, 2290, 2330], zs: [12, 26] },      // 4x4 pylons under the undercroft slab
  spareTrainX0: 2246,                                           // west end of the parked spare train on track A
  stairs: [{ x0: 2282, z0: 9, z1: 10 }, { x0: 2282, z0: 23, z1: 24 }, { x0: 2282, z0: 38, z1: 39 }],   // 10 half steps eastward from the hall floor (97 -> 92)
  lifts: [{ x: 2312, z: 6 }, { x: 2312, z: 23 }, { x: 2312, z: 38 }],                                 // 3x3 glass shafts 91..101 (decorative, like the city's)
};

// ------------------------------------------------------------------------------------------------ pads
// Three sizes: L (half 24 = 48x48: bulk freighter 38, cruiser 40), M (half 18: shuttle 26, gunship, air bus), S (half
// 12: light freighter 24, taxi, police, starfighter). Gate ids run 1..8 on the old east pads, then 9.. westward.
export const PAD_SIZES = { L: 24, M: 18, S: 12 };
// Landed heading (ships/traffic.js: yaw 0 = nose -z, boarding door toward -x; PI = door toward +x; PI/2 = door toward
// +z; -PI/2 = door toward -z): the door faces the hall the pad serves.
const E = Math.PI, W = 0, S = Math.PI / 2, N = -Math.PI / 2;
export const OLD_PADS = [
  { x: 2596, z: -68 }, { x: 2648, z: -68 }, { x: 2596, z: -116 }, { x: 2648, z: -116 },
  { x: 2596, z: 68 }, { x: 2648, z: 68 }, { x: 2596, z: 116 }, { x: 2648, z: 116 },
].map((p) => ({ ...p, size: 'S', yaw: p.x < 2622 ? E : W }));    // doors toward the concourse spine
// field A: six L pads north of the terminal (two rows of three), doors toward the terminal
const FIELD_A = [[2184, -100], [2240, -100], [2296, -100], [2184, -156], [2240, -156], [2296, -156]].map(([x, z]) => ({ x, z, size: 'L', yaw: S }));
// field B: four M pads south of the terminal
const FIELD_B = [[2176, 120], [2220, 120], [2264, 120], [2308, 120]].map(([x, z]) => ({ x, z, size: 'M', yaw: N }));
// field C: six S pads east of the terminal (three rows of two; the harbour lane at x >= 2440 stays clear of their
// approach columns) and two west of it
const FIELD_C = [[2380, -30, W], [2416, -30, W], [2380, 40, W], [2416, 40, W], [2380, -100, W], [2416, -100, W], [2200, -28, E], [2200, 26, E]].map(([x, z, yaw]) => ({ x, z, size: 'S', yaw }));
// security apron: two M pads for gunships (doors toward the guard post); cargo dock: two L bays for the bulk haulers
// (doors toward the manifest office)
export const SECURITY_PADS = [[2390, 170], [2440, 170]].map(([x, z]) => ({ x, z, size: 'M', yaw: S, security: true }));
export const CARGO_BAYS = [[2190, -234], [2256, -234]].map(([x, z]) => ({ x, z, size: 'L', yaw: E, cargo: true }));
export const NEW_PADS = [...FIELD_A, ...FIELD_B, ...FIELD_C, ...SECURITY_PADS, ...CARGO_BAYS];
export const PADS = [...OLD_PADS, ...NEW_PADS];              // gate id = index + 1
export const padHalf = (pad) => PAD_SIZES[pad.size];
// the fleet type per pad (ships/models.js order: 0 light freighter 24, 1 shuttle 26, 2 taxi 12, 3 gunship 24, 4 bulk
// freighter 38, 5 cruiser 40, 6 starfighter 16, 7 police 14, 8 air bus 22 blocks long); every hull fits its pad
export const PAD_TYPES = [
  0, 8, 2, 7, 0, 8, 6, 3,                                      // old S pads: light freighters, air buses, taxi, police, starfighter, gunship
  4, 5, 4, 5, 4, 5,                                            // field A (L): bulk freighters and cruisers
  1, 3, 8, 1,                                                  // field B (M): shuttles, gunship, air bus
  0, 2, 7, 0, 6, 2, 0, 7,                                      // field C (S): light freighters, taxis, police, starfighter
  3, 3,                                                        // security apron: gunships
  4, 4,                                                        // cargo dock: bulk haulers
];
// the longest hull a pad of each size takes (padsFit in the tests): 2 * half - 4 leaves a 2-block rim
export const padsForTraffic = () => PADS.map((p, i) => ({ x: p.x, z: p.z, half: padHalf(p), size: p.size, type: PAD_TYPES[i], yaw: p.yaw, gate: i + 1 }));
// [type, x, z, yaw] of the ships under repair inside the hangars (yaw 0: nose toward -z = the open north front)
export const REPAIR_BERTHS = [[4, 2217, 285, 0], [0, 2269, 287, 0], [1, 2321, 287, 0]];

// ------------------------------------------------------------------------------------------------ hangars + tower
// Three repair hangars in the south wing, open fronts facing north onto the repair apron; the repair berths
// (traffic.js) stand inside them, noses toward the opening. Roof 113 (16 above the floor), opening 30 wide x 15 high.
export const HANGARS = [
  { id: 'H1', x0: 2196, x1: 2239, z0: 262, z1: 306 },
  { id: 'H2', x0: 2248, x1: 2291, z0: 262, z1: 306 },
  { id: 'H3', x0: 2300, x1: 2343, z0: 262, z1: 306 },
];
export const HANGAR_ROOF = 113, HANGAR_OPEN_H = 15, HANGAR_OPEN_HALF = 15;
// west fuel farm beside the hangars (two chrome tanks + pump house)
export const WEST_FUEL = { x0: 2150, x1: 2188, z0: 262, z1: 306, tanks: [[2160, 275], [2178, 293]] };
// Westport control at the south-west corner of the apron beside the hangar wing: 8x8 shaft, cab at 145 (48 above
// the deck), radar mast above the cab. Every pad loop leaves and returns through x 2440 / |z| 230..320 or swings
// west at |z| <= 180, so this corner is the one spot on the apron no lane crosses below y 190.
export const WEST_TOWER = { x0: 2142, x1: 2149, z0: 330, z1: 337, cabY: 145, roofY: 150 };
// the original east tower (cab at 151)
export const EAST_TOWER = { x0: 2688, x1: 2695, z0: -4, z1: 3, cabY: 151, roofY: 156 };
// emergency stair towers (painter.js switchbackTower, 16 x 6) at the apron edges, deck 97 down to the terrace
export const EMERGENCY_STAIRS = [{ x0: 2340, z0: -358 }, { x0: 2440, z0: 352 }, { x0: 2133, z0: 20 }, { x0: 2133, z0: -226 }];

// ------------------------------------------------------------------------------------------------ cargo terminal
// North wing: container yard with two portal cranes, the hauler dock (two L bays + manifest office), the conveyor into
// the cargo hall (bonded cage, two storage rooms, dispatch office = the depot's front desk).
export const CARGO = {
  hall: { x0: 2378, x1: 2478, z0: -354, z1: -250, roof: 109 },
  bonded: { x0: 2430, x1: 2476, z0: -352, z1: -312 },
  stores: [{ x0: 2380, x1: 2424, z0: -352, z1: -330 }, { x0: 2380, x1: 2424, z0: -326, z1: -304 }],
  dispatch: { x0: 2436, x1: 2476, z0: -280, z1: -252 },
  doors: [{ side: 'S', x0: 2408, x1: 2411, z: -250 }, { side: 'W', x: 2378, z0: -302, z1: -298 }, { side: 'E', x: 2478, z0: -302, z1: -299 }],
  yard: { x0: 2150, x1: 2296, z0: -352, z1: -272 },
  cranes: [2200, 2250],
  dock: { x0: 2150, x1: 2296, z0: -262, z1: -206 },
  office: { x0: 2304, x1: 2330, z0: -246, z1: -222, door: { x: 2304, z: -234 } },   // facing the bays' doors
  conveyor: { z: -300, x0: 2298, x1: 2377, y: 98 },
};

// ------------------------------------------------------------------------------------------------ security apron
export const SECURITY = {
  x0: 2350, x1: 2487, z0: 80, z1: 244,                          // fenced annex east of field B (the harbour west lane
  post: { x0: 2408, x1: 2446, z0: 204, z1: 236, roof: 105, door: { x: 2427, z: 204 } },   // passes north-east of the pads)
  gateW: { x: 2350, z0: 118, z1: 123 },                         // checkpoint in the west fence (from field B)
  gateN: { z: 80, x0: 2398, x1: 2403 },                         // checkpoint in the north fence (from the hump)
};

// ------------------------------------------------------------------------------------------------ dealer
// Glass showroom on the old deck beside the workshop: four plinths (speeder, shuttle, freighter, yacht) with price
// holo boards. Within 200 blocks of the city's spaceport gate (purposes.js pins a ship dealer there).
// x 2666 keeps the east pads' service strips (x 2661..2662) clear; aisles: x 2667..2670 (west), x 2686..2689 (centre).
export const DEALER = { x0: 2666, x1: 2712, z0: 90, z1: 154, roof: 108, door: { x: 2666, z0: 121, z1: 123 }, doorN: { z: 90, x0: 2686, x1: 2688 } };
export const DEALER_PLINTHS = [
  { cls: 'speeder', type: 2, x: 2678, z: 97, price: 4000 },       // taxi hull 7 x 12
  { cls: 'yacht', type: 5, x: 2678, z: 126, price: 60000 },       // cruiser hull 15 x 40
  { cls: 'shuttle', type: 1, x: 2698, z: 105, price: 14000 },     // 17 x 26
  { cls: 'freighter', type: 0, x: 2698, z: 138, price: 32000 },   // light freighter 15 x 24
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
// The halls the economy / signs system should know about: appended to the city layout as landmark lots (kind
// 'landmark', family 'slab', height 0: no skyline impostor, a cheap blueprint) with a fixed purpose and name; the
// doors are on the deck (feet 97). Inner halls come first so the "Entering ..." toast picks them over the terminal
// that contains them. rect: x1 / z1 inclusive. `spots`: where the staff stand (NPC work spots, feet level).
export const HALLS = [
  { key: 'customs', name: 'Westport Customs Hall', purpose: 'customs', rect: TZ.customs, front: 'S', doors: [{ side: 'S', x: 2329, z: -15 }],
    spots: [[2313, -37], [2341, -37], [2320, -35], [2328, -35], [2336, -35], [2344, -35]] },
  { key: 'cafe', name: 'Departures Caf', purpose: 'caf', rect: TZ.cafe, front: 'E', doors: [{ side: 'E', x: 2278, z: 45 }], spots: [[2250, 40], [2250, 50]] },
  { key: 'shop1', name: 'Concourse Traders', purpose: 'general_store', rect: TZ.shop1, front: 'N', doors: [{ side: 'N', x: 2300, z: 46 }], spots: [[2296, 50], [2306, 50]] },
  { key: 'shop2', name: 'Spaceport Provisions', purpose: 'grocery', rect: TZ.shop2, front: 'N', doors: [{ side: 'N', x: 2338, z: 46 }], spots: [[2332, 50], [2344, 50]] },
  { key: 'terminal', name: 'Westport Grand Terminal', purpose: 'transit_station', rect: TERMINAL, front: 'W',
    doors: [{ side: 'W', x: 2240, z: -23 }, { side: 'W', x: 2240, z: 22 }, { side: 'E', x: 2359, z: -23 }, { side: 'E', x: 2359, z: 22 }, { side: 'E', x: 2359, z: 44 }, { side: 'N', x: 2302, z: -46 }, { side: 'N', x: 2329, z: -46 }, { side: 'S', x: 2281, z: 60 }, { side: 'S', x: 2317, z: 60 }],
    spots: [[2250, -31], [2256, -31], [2264, -31], [2278, -31], [2284, -31], [2292, -31], [2303, -22], [2260, -40], [2286, -40]] },
  { key: 'cargo', name: 'Westport Cargo Terminal', purpose: 'depot', rect: CARGO.hall, front: 'S', doors: [{ side: 'S', x: 2409, z: -250 }, { side: 'E', x: 2478, z: -300 }],
    spots: [[2444, -266], [2444, -272], [2400, -290], [2440, -320]] },
  { key: 'manifest', name: 'Hauler Dock Manifest Office', purpose: 'depot', rect: CARGO.office, front: 'W', doors: [{ side: 'W', x: 2304, z: -234 }], spots: [[2311, -238], [2311, -228]] },
  { key: 'hangar1', name: 'Repair Hangar 1', purpose: 'repair_shop', rect: HANGARS[0], front: 'N', doors: [{ side: 'N', x: 2217, z: 262 }], spots: [[2202, 300], [2233, 300]] },
  { key: 'hangar2', name: 'Repair Hangar 2', purpose: 'repair_shop', rect: HANGARS[1], front: 'N', doors: [{ side: 'N', x: 2269, z: 262 }], spots: [[2254, 300], [2285, 300]] },
  { key: 'hangar3', name: 'Repair Hangar 3', purpose: 'hangar', rect: HANGARS[2], front: 'N', doors: [{ side: 'N', x: 2321, z: 262 }], spots: [[2306, 300], [2337, 300]] },
  { key: 'dealer', name: 'Westport Starship Showroom', purpose: 'ship_dealer', rect: DEALER, front: 'W', doors: [{ side: 'W', x: 2666, z: 122 }, { side: 'N', x: 2687, z: 90 }], spots: [[2688, 122], [2669, 150]] },
  { key: 'guard', name: 'Coruscant Guard Post - Security Apron', purpose: 'security_station', rect: SECURITY.post, front: 'N', doors: [{ side: 'N', x: 2427, z: 204 }], spots: [[2427, 212], [2416, 226], [2438, 226]] },
  { key: 'east', name: 'East Terminal (domestic)', purpose: 'transit_station', rect: EAST.terminal, front: 'W', doors: [{ side: 'W', x: 2592, z: 0 }, { side: 'E', x: 2650, z: 0 }], spots: [[2606, -31], [2636, -31]] },
];
