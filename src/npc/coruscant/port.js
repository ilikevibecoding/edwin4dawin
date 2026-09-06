// The spaceport has no lots: its crews (pilots, mechanics, dock workers, customs officers, astromechs, passengers)
// work on the pads, in the hangar and the terminal hall, so their spots come from the SPACEPORT geometry of
// src/coruscant/spaceport.js instead of a blueprint. "people working on the ships, fixing ships": mechanics weld at
// the landing gear of whichever ship is dwelling on a pad (the runtime asks `game.shipTraffic`), and fall back to the
// hangar bays and the workshop benches while the pads are empty. Everything is deterministic from the constants.
import { SPACEPORT as S, DECK_Y } from '../../coruscant/spaceport.js';

export const PORT = 'port';          // pseudo lot id used by the census for spaceport crews
export const PORT_Y = DECK_Y;        // feet level on the deck (97)
const H = S.padHalf;

// yaw for a facing direction (town convention: yaw = atan2(dx, dz))
const YAW = { E: Math.PI / 2, W: -Math.PI / 2, S: 0, N: Math.PI };
const spot = (x, z, face, y = PORT_Y, extra = null) => ({ x, y, z, yaw: typeof face === 'number' ? face : YAW[face], kind: 'port', ...extra });
const toward = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// Rectangles for the coarse walkability map: the deck is walkable except the listed structures; `open` cells are
// carved back into the walls (doors, the hangar's open front, the workshop door).
export function portRects() {
  const T = S.terminal, Hg = S.hangar, F = S.fuel, W = S.workshop, Tw = S.tower;
  return {
    walk: [{ x0: S.deck.x0, z0: S.deck.z0, x1: S.deck.x1 + 1, z1: S.deck.z1 + 1 }],
    block: [
      // terminal walls (one block thick, x1/z1 exclusive)
      { x0: T.x0, z0: T.z0, x1: T.x0 + 1, z1: T.z1 + 1 }, { x0: T.x1, z0: T.z0, x1: T.x1 + 1, z1: T.z1 + 1 },
      { x0: T.x0, z0: T.z0, x1: T.x1 + 1, z1: T.z0 + 1 }, { x0: T.x0, z0: T.z1, x1: T.x1 + 1, z1: T.z1 + 1 },
      { x0: T.cx - 2, z0: -2, x1: T.cx + 2, z1: 2 },                                       // departure board tower
      { x0: 2645, z0: -39, x1: 2650, z1: -33 },                                              // security booth
      { x0: 2598, z0: -37, x1: 2645, z1: -35 },                                              // baggage belt / boards
      { x0: 2598, z0: -31, x1: 2645, z1: -29 },                                              // check-in counters
      // hangar walls except the open west front
      { x0: Hg.x1, z0: Hg.z0, x1: Hg.x1 + 1, z1: Hg.z1 + 1 }, { x0: Hg.x0, z0: Hg.z0, x1: Hg.x1 + 1, z1: Hg.z0 + 1 }, { x0: Hg.x0, z0: Hg.z1, x1: Hg.x1 + 1, z1: Hg.z1 + 1 },
      { x0: F.x0, z0: F.z0, x1: F.x1 + 1, z1: F.z1 + 1 },                                    // fuel farm
      { x0: Tw.x0 - 1, z0: Tw.z0 - 1, x1: Tw.x1 + 2, z1: Tw.z1 + 2 },                        // control tower base
      { x0: 2703, z0: -3, x1: 2708, z1: 4 },                                                 // monument
      // workshop walls
      { x0: W.x0, z0: W.z0, x1: W.x0 + 1, z1: W.z1 + 1 }, { x0: W.x1, z0: W.z0, x1: W.x1 + 1, z1: W.z1 + 1 },
      { x0: W.x0, z0: W.z0, x1: W.x1 + 1, z1: W.z0 + 1 }, { x0: W.x0, z0: W.z1, x1: W.x1 + 1, z1: W.z1 + 1 },
      { x0: 2697, z0: 66, x1: 2704, z1: 75 },                                                // speeder lift
      { x0: S.ramp.x0 - 2, z0: -S.ramp.hw - 2, x1: S.ramp.x1 + 1, z1: S.ramp.hw + 2 },       // ramp cut (leads off the deck)
    ],
    open: [
      { x0: T.x0, z0: -4, x1: T.x0 + 1, z1: 5 }, { x0: T.x1, z0: -4, x1: T.x1 + 1, z1: 5 },  // terminal doors W / E
      { x0: T.cx - 3, z0: T.z0, x1: T.cx + 5, z1: T.z0 + 1 }, { x0: T.cx - 3, z0: T.z1, x1: T.cx + 5, z1: T.z1 + 1 },  // N / S
      { x0: W.x0, z0: 64, x1: W.x0 + 1, z1: 77 },                                            // workshop door
    ],
  };
}

export const inPort = (x, z) => x >= S.deck.x0 && x <= S.deck.x1 && z >= S.deck.z0 && z <= S.deck.z1;
export function padAt(x, z) { for (let i = 0; i < S.pads.length; i++) { const p = S.pads[i]; if (Math.abs(x - p.x) <= H && Math.abs(z - p.z) <= H) return i; } return -1; }

// ---------------------------------------------------------------------------------------------- spot tables
function padSpots(fn) { const out = []; S.pads.forEach((p, i) => fn(p, i, out)); return out; }
const strip = (p) => ({ sx: p.x + H + 2, z0: p.z - H, z1: p.z + H - 1 });   // service strip east of pad p

const WORK = {
  // welding at the landing gear (four gear positions around the pad centre), facing the ship
  mechanic: [
    ...padSpots((p, i, out) => { for (const [dx, dz] of [[-6, -5], [6, 5], [-6, 5], [6, -5]]) out.push(spot(p.x + dx, p.z + dz, toward(p.x + dx, p.z + dz, p.x, p.z), PORT_Y, { pad: i, mode: 'welding' })); }),
    // workshop benches along the east wall (console / anvil / table / furnace) and the parked speeder on the lift
    ...[59, 62, 65, 68, 71, 74, 77, 80].map((z) => spot(S.workshop.x1 - 2, z, 'E', PORT_Y, { mode: 'welding' })),
    spot(2696, 68, 'E', PORT_Y, { mode: 'welding' }), spot(2696, 72, 'E', PORT_Y, { mode: 'welding' }),
    // hangar bays: floor markings either side of the centre line
    ...[0, 1, 2].flatMap((k) => [spot(2680 + 8 * k, -128, 'N', PORT_Y, { mode: 'welding' }), spot(2680 + 8 * k, -112, 'S', PORT_Y, { mode: 'welding' })]),
  ],
  astromech: [
    ...padSpots((p, i, out) => { out.push(spot(p.x - 9, p.z, 'E', PORT_Y, { pad: i, mode: 'tending' })); out.push(spot(p.x + 9, p.z + 2, 'W', PORT_Y, { pad: i, mode: 'tending' })); }),
    ...[0, 1, 2].map((k) => spot(2684 + 8 * k, -120, 'E', PORT_Y, { mode: 'tending' })),
  ],
  'dock worker': [
    ...padSpots((p, i, out) => { const s = strip(p); out.push(spot(s.sx - 1, s.z1 - 4, 'E', PORT_Y, { mode: 'carry', pad: i })); out.push(spot(s.sx + 2, s.z1 - 3, 'W', PORT_Y, { mode: 'tending', pad: i })); out.push(spot(s.sx, s.z0 + 5, 'S', PORT_Y, { mode: 'typing', pad: i })); }),
    ...[0, 1, 2, 3].flatMap((k) => [spot(2596 + 24 * k, S.yardN.z0 + 12, 'N', PORT_Y, { mode: 'carry' }), spot(2596 + 24 * k, S.yardS.z0 + 12, 'S', PORT_Y, { mode: 'carry' })]),
  ],
  pilot: [
    ...padSpots((p, i, out) => { out.push(spot(p.x + 8, p.z - 8, toward(p.x + 8, p.z - 8, p.x, p.z), PORT_Y, { pad: i, mode: 'watching' })); out.push(spot(p.x - 8, p.z + 8, toward(p.x - 8, p.z + 8, p.x, p.z), PORT_Y, { pad: i, mode: 'talking' })); }),
    spot(2647, -20, 'E', PORT_Y, { mode: 'typing' }), spot(2647, 20, 'E', PORT_Y, { mode: 'typing' }),
    ...[0, 1, 2].map((k) => spot(2690 + 6 * k, -104, 'N', PORT_Y, { mode: 'talking' })),
  ],
  'customs officer': [
    ...[2600, 2604, 2608, 2612, 2630, 2634, 2638, 2642].map((x) => spot(x, -32, 'S', PORT_Y, { mode: 'typing' })),
    spot(2647, -36, 'N', PORT_Y + 1, { mode: 'guarding' }),
    spot(2647, -20, 'E', PORT_Y, { mode: 'guarding' }), spot(2647, 20, 'E', PORT_Y, { mode: 'guarding' }),
    spot(S.terminal.x0 + 2, 0, 'W', PORT_Y, { mode: 'guarding' }), spot(S.terminal.x1 - 2, 0, 'E', PORT_Y, { mode: 'guarding' }),
  ],
  'deck officer': [spot(2647, -20, 'E', PORT_Y, { mode: 'typing' }), spot(2647, 20, 'E', PORT_Y, { mode: 'typing' }), spot(2690, -104, 'N', PORT_Y, { mode: 'talking' })],
  bartender: [spot(2604, 36, 'N', PORT_Y, { mode: 'serving' }), spot(2600, 36, 'N', PORT_Y, { mode: 'serving' })],
  vendor: [2628, 2634, 2640].map((k) => spot(k + 2, 36, 'N', PORT_Y, { mode: 'serving' })),
  courier: [spot(S.terminal.x0 - 3, 0, 'E', PORT_Y, { mode: 'waiting' }), spot(S.terminal.x1 + 3, 0, 'W', PORT_Y, { mode: 'waiting' }), spot(2621, -44, 'S', PORT_Y, { mode: 'waiting' }), spot(2621, 44, 'N', PORT_Y, { mode: 'waiting' })],
  'sweeper droid': [spot(2621, -60, 'S', PORT_Y, { mode: 'sweeping' }), spot(2621, 60, 'N', PORT_Y, { mode: 'sweeping' }), spot(2680, 0, 'E', PORT_Y, { mode: 'sweeping' })],
};
// passengers wait in the seating rows and the gate lounge; tourists on the plaza benches
const SEATS = [];
for (const z of [10, 14, 18, 22]) for (const [bx0, bx1] of [[2598, 2612], [2630, 2644]]) for (let x = bx0; x <= bx1; x++) if ((x - bx0) % 6 !== 5) SEATS.push(spot(x, z, 'S', PORT_Y, { mode: 'sitting', seat: true }));
for (const x of [2640, 2644]) for (let z = -30; z <= 30; z += 2) if (Math.abs(z) > 5 && z % 6 !== 0) SEATS.push(spot(x, z, 'E', PORT_Y, { mode: 'sitting', seat: true }));
const PLAZA_SEATS = [];
for (const z of [-20, 20]) for (let x = 2660; x <= 2676; x++) if (x % 5 !== 4) PLAZA_SEATS.push(spot(x, z, z < 0 ? 'S' : 'N', PORT_Y, { mode: 'sitting', seat: true }));
for (const [x, z] of [[2703, -2], [2707, -2], [2703, 2], [2707, 2]]) PLAZA_SEATS.push(spot(x, z, toward(x, z, 2705, 0), PORT_Y, { mode: 'sitting', seat: true }));
// cantina: seats beside the tables, standing room at the kiosks
const MEALS = [];
for (const [tx, tz] of [[2600, 28], [2606, 28], [2600, 31], [2606, 31], [2609, 29]]) { MEALS.push(spot(tx - 1, tz, 'E', PORT_Y, { mode: 'eating', seat: true })); MEALS.push(spot(tx + 1, tz, 'W', PORT_Y, { mode: 'eating', seat: true })); }
for (const kx0 of [2628, 2634, 2640]) { MEALS.push(spot(kx0 + 1, 34, 'S', PORT_Y, { mode: 'eating' })); MEALS.push(spot(kx0 + 3, 34, 'S', PORT_Y, { mode: 'browsing' })); }
MEALS.push(spot(2602, 36, 'S', PORT_Y, { mode: 'eating' }), spot(2606, 36, 'S', PORT_Y, { mode: 'eating' }), spot(2608, 36, 'S', PORT_Y, { mode: 'eating' }));
// crew bunks: along the hangar's back wall; droids power down in the hangar bays
const BUNKS = [];
for (let z = -136; z <= -104; z += 3) BUNKS.push(spot(S.hangar.x1 - 2, z, 'W', PORT_Y, { mode: 'sleeping' }));
for (let k = 0; k < 6; k++) BUNKS.push(spot(2676 + 4 * k, -136, 'S', PORT_Y, { mode: 'sleeping' }));

// Candidate spots for `job` doing `act` in the port. Visitors (passengers, tourists) sit; staff work their tables.
export function portSpots(job, act, visitor = false) {
  if (act === 'work') {
    if (visitor || job === 'passenger') return job === 'tourist' ? PLAZA_SEATS.concat(SEATS) : SEATS;
    return WORK[job] || WORK.courier;
  }
  if (act === 'meal') return MEALS;
  if (act === 'leisure') return PLAZA_SEATS.concat(SEATS.slice(0, 20));
  // sleep / home
  if (job === 'passenger' || job === 'tourist' || visitor) return SEATS;
  return BUNKS;
}

// Ship parked on pad i right now? traffic: game.shipTraffic (ships[] with .pad and .phase)
export function shipOnPad(traffic, i) {
  if (!traffic || !traffic.ships) return false;
  for (const sh of traffic.ships) if (sh.pad === i && sh.phase === 'dwell') return true;
  return false;
}
