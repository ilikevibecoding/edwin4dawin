// Coruscant spaceport (Westport): the west edge of the plateau plus an elevated apron cantilevered west over the
// lower city at the deck level (top layer 96 / feet 97), generated lazily per chunk. All the geometry is data in
// ./spaceport/plan.js; the painters live beside it:
//   deck.js      apron plates, pylons down to the terraces, hyperlane tube + glass promenade (the hump), station and
//                ramp cuts, the lit freight lane under the plateau strip, parapet, emergency stair towers
//   terminal.js  Westport Grand Terminal (check-in, baggage, waiting, customs, concourse, caf, shops, toilets, gallery)
//   terminus.js  Westport Terminus: 4-platform undercroft beside the live hyperlane, yard tracks, spare train, lifts
//   pads.js      30 landing pads in three sizes with gate numbers, blast walls and walk lines
//   hangars.js   three repair hangars (the fleet's repair berths stand inside), west fuel farm, repair apron
//   cargo.js     container yard, cranes, hauler dock + manifest office, conveyor, cargo hall (depot)
//   security.js  the fenced security apron with the Coruscant Guard post
//   dealer.js    the starship showroom (ship_dealer)
//   tower.js     the two control towers; east.js the original domestic terminal, bridge, ramp, plaza, yards
// Everything is a pure function of world coordinates (hash-based variation), so every chunk is identical on every
// load and client. The ship traffic that uses the pads lives in ../ships/traffic.js.
import { B } from '../blocks.js';
import { installShipTraffic } from '../ships/traffic.js';
import { Painter } from './spaceport/painter.js';
import * as P from './spaceport/plan.js';
import { paintDeckAll } from './spaceport/deck.js';
import { paintTerminal } from './spaceport/terminal.js';
import { paintTerminus } from './spaceport/terminus.js';
import { paintPads, paintPad } from './spaceport/pads.js';
import { paintHangars } from './spaceport/hangars.js';
import { paintCargo } from './spaceport/cargo.js';
import { paintSecurity } from './spaceport/security.js';
import { paintDealer } from './spaceport/dealer.js';
import { paintTower } from './spaceport/tower.js';
import { paintEast } from './spaceport/east.js';

export const DECK_TOP = P.DECK_TOP;      // top block layer of the deck
export const DECK_Y = P.DECK_Y;          // walking surface / landing-gear height on the pads
export const STATION_Y = P.STATION_Y;    // floor layer of the train platform and of the bridge
export { HALLS as SPACEPORT_HALLS, RECT as SPACEPORT_RECT, APRON as SPACEPORT_APRON, TERMINUS as SPACEPORT_TERMINUS } from './spaceport/plan.js';

// The port as the rest of the game sees it: the structure AABB, the whole deck, the pad list (with each pad's size,
// fleet type and landed heading for the traffic), and the original east terminal's pieces under their old names.
export const SPACEPORT = {
  x0: P.RECT.x0, z0: P.RECT.z0, x1: P.RECT.x1, z1: P.RECT.z1,          // structure AABB (x1, z1 exclusive)
  deck: { x0: P.APRON.x0, z0: P.APRON.z0, x1: P.PLATEAU_DECK.x1, z1: P.APRON.z1 },   // inclusive
  apron: P.APRON, plateauDeck: P.PLATEAU_DECK,
  bridge: P.EAST.bridge,
  ramp: P.EAST.ramp,                                                     // 12 half-steps: surface 91 -> 97
  terminal: P.EAST.terminal,                                             // the domestic (east) terminal
  grandTerminal: P.TERMINAL, terminus: P.TERMINUS,
  spine: P.EAST.spine,
  padHalf: P.PAD_SIZES.S,                                                // the domestic pads' half size; see pads[i].half
  padSizes: P.PAD_SIZES,
  pads: P.padsForTraffic(),                                              // gate id = index + 1
  repairBerths: P.REPAIR_BERTHS,
  tower: P.EAST_TOWER, westTower: P.WEST_TOWER,
  hangar: P.EAST.hangar, hangars: P.HANGARS,
  fuel: P.EAST.fuel, westFuel: P.WEST_FUEL,
  yardN: P.EAST.yardN, yardS: P.EAST.yardS, workshop: P.EAST.workshop,
  cargo: P.CARGO, security: P.SECURITY, dealer: P.DEALER,
  emergencyStairs: P.EMERGENCY_STAIRS,
  halls: P.HALLS,
};

// ------------------------------------------------------------------------------------------------ frontier mini spaceport
// A single pad and a tiny terminal on a roof deck above the hyperlane station (deck top y 98, walking at 99: the
// station canopy level, two blocks above the train corridor which ends at y 96), inside the reserved x 240..300,
// z -40..40. The north half stands on pillars over the forest, the rest rests on the station's canopy columns and
// waiting hall. A small balcony (x 248..251, |z| <= 4) overlooks the track at the deck's west edge; the station
// builder's stair from the platform arrives on the deck at x 256, z 8..9 (through the opening it cuts at x 252..255).
// The domestic port of the frontier town: one S pad, a shuttle service to Coruscant, no customs, no cargo.
export const FRONTIER = {
  x0: 246, z0: -26, x1: 298, z1: 27,                         // structure AABB (x1, z1 exclusive)
  deck: { x0: 252, z0: -24, x1: 297, z1: 23 },              // x1 297 keeps the pad's service strip (x 295..296) on the deck
  balcony: { x0: 248, x1: 251, z0: -4, z1: 4 },              // footprint including its kerbs
  terminal: { x0: 256, x1: 268, z0: -10, z1: 6 },
  pad: { x: 282, z: 0, size: 'S' },
};
export const FRONTIER_DECK_TOP = 98, FRONTIER_DECK_Y = 99;
// True for the cells whose floor is the frontier deck (deck + balcony): the station builder leaves them alone.
export function onFrontierDeck(x, z) {
  const d = FRONTIER.deck, b = FRONTIER.balcony;
  return (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) || (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
}

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, PLATE = B.DECK_PLATE, STR = B.PANEL_STRIPE, GL = B.STEEL_GLASS;
const GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, LAMP = B.CITY_LAMP, HOLO = B.HOLO_SIGN, CON = B.CONSOLE, SLAB = B.STONE_BRICK_SLAB;
const AIR = B.AIR, LINE = D, abs = Math.abs;

function paintFrontier(p) {
  const F = FRONTIER, d = F.deck, b = F.balcony, Y = FRONTIER_DECK_TOP, W = FRONTIER_DECK_Y;
  if (!p.overlaps(F.x0, F.z0, F.x1, F.z1)) return;
  const [x0, x1] = p.xRange(d.x0, d.x1), [z0, z1] = p.zRange(d.z0, d.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    p.set(x, Y - 1, z, DD); p.set(x, Y, z, PLATE);
    if (z > -6) continue;                                                                   // over the station: carried by its canopy columns and hall
    const px = (x - d.x0) % 12, pz = (z - d.z0) % 12;
    if (px <= 1 && pz <= 1) p.col(x, z, 40, Y - 2, DD);                                  // 2x2 pillars on a 12 grid (north half)
    else if (px === 0 || pz === 0) p.set(x, Y - 2, z, DD);                                // girders
  }
  // parapet (striped kerb + glass) with lamp posts; the west kerb opens onto the balcony (|z| <= 3)
  const kerb = (x, z) => { p.set(x, W, z, STR); p.set(x, W + 1, z, GL); };
  for (let z = d.z0; z <= d.z1; z++) { if (abs(z) > 3) kerb(d.x0, z); kerb(d.x1, z); }
  for (let x = d.x0; x <= d.x1; x++) { kerb(x, d.z0); kerb(x, d.z1); }
  for (const x of [d.x0, d.x1]) for (const z of [d.z0, d.z1]) { p.col(x, z, W, W + 2, DD); p.set(x, W + 3, z, LAMP); }
  for (const z of [-4, 4]) { p.col(d.x0, z, W, W + 2, DD); p.set(d.x0, W + 3, z, LAMP); }
  // balcony over the track: floor with stub markings, kerbs on its three open sides
  for (let x = b.x0; x <= b.x1; x++) for (let z = b.z0; z <= b.z1; z++) {
    const edge = x === b.x0 || abs(z) === 4;
    p.set(x, Y - 1, z, DD); p.set(x, Y, z, edge ? DD : abs(z) === 3 && x >= b.x1 - 1 ? LINE : PLATE);
    if (edge) kerb(x, z);
  }
  // tiny terminal: dark base, glass band, glass roof with a durasteel frame, doors west (deck) and east (pad)
  const T = F.terminal, roof = W + 5;
  for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    if (!p.overlaps(x, z, x, z)) continue;
    const onX = x === T.x0 || x === T.x1, onZ = z === T.z0 || z === T.z1;
    p.set(x, Y, z, onX || onZ ? DD : abs(z) <= 1 ? D : ((x + z) & 1) ? D : DD);
    if (onX || onZ) {
      const corner = onX && onZ, mullion = onX ? (z % 4 === 0) : ((x - T.x0) % 4 === 0);
      for (let y = W; y < roof; y++) p.set(x, y, z, y === W ? DD : y === W + 1 ? ((!corner && (onX ? z % 4 === 2 : (x - T.x0) % 4 === 2)) ? GLOW : DD) : (corner || mullion) ? D : GL);
    }
    p.set(x, roof, z, (onX || onZ || (x - T.x0) % 4 === 0 || z % 4 === 0) ? D : GL);
  }
  for (const x of [T.x0, T.x1]) { p.box(x, W, -1, x, W + 2, 1, AIR); p.box(x, W + 3, -1, x, W + 3, 1, HOLO); }
  p.box(T.x0 + 3, W + 2, T.z0 + 1, T.x1 - 3, W + 3, T.z0 + 1, HOLO);                     // departure board
  for (const z of [-4, 4]) for (let x = T.x0 + 3; x <= T.x1 - 3; x++) if (x !== T.x0 + 6) p.set(x, W, z, SLAB);   // benches
  p.box(T.x1 - 3, W, T.z1 - 3, T.x1 - 1, W, T.z1 - 3, DD); p.set(T.x1 - 2, W, T.z1 - 3, CON);              // check-in counter
  p.box(T.x0 + 1, W, T.z1 - 2, T.x0 + 1, W + 1, T.z1 - 1, B.SHELF); p.set(T.x0 + 1, W + 2, T.z1 - 1, BLUE); // kiosk shelf
  for (const x of [T.x0 + 3, T.x1 - 3]) for (const z of [T.z0 + 2, T.z1 - 2]) p.set(x, roof - 1, z, GLOW);  // ceiling lights
  for (let x = T.x1 + 1; x < F.pad.x - P.PAD_SIZES.S; x++) for (const z of [-3, 3]) p.set(x, Y, z, LINE);   // walkway to the pad
  paintPad(p, F.pad, 1, Y);
  for (const x of [d.x0 + 22, d.x0 + 34]) for (const z of [d.z0, d.z1]) { p.col(x, z, W, W + 2, DD); p.set(x, W + 3, z, LAMP); }
  // "FRONTIER DOMESTIC" holo strip on the terminal's roof edge: a small-town field, not the hub
  p.box(T.x0 + 2, roof + 1, T.z0, T.x0 + 9, roof + 1, T.z0, HOLO); p.set(T.x0 + 1, roof + 1, T.z0, BLUE);
}

export function fillFrontierChunk(chunk) { paintFrontier(new Painter(chunk)); }

// ------------------------------------------------------------------------------------------------ registry
export function fillSpaceportChunk(chunk) {
  const p = new Painter(chunk);
  paintDeckAll(p);
  paintEast(p);
  paintTerminal(p);
  paintTerminus(p);
  paintPads(p);
  paintHangars(p);
  paintCargo(p);
  paintSecurity(p);
  paintDealer(p);
  paintTower(p, P.EAST_TOWER);
  paintTower(p, P.WEST_TOWER);
}

// The halls as building records in the shape of the city's `cityMeta()` entries (buildings.js finishMeta): id (the
// layout lot appended by layout.js for the hall, matched by key), name, kind, purpose, bounds, floorY, the ground
// doors (wall cells at the deck level, with the side they face so signs.js hangs a board over each), door / inside /
// lobby (the first door and the cell inside it), the staff spots (NPC work spots on the deck) and empty room / bed
// lists (nothing to rent here). The lot ids come from the layout when one is given.
export function spaceportHallMeta(layout = null) {
  const byKey = new Map();
  if (layout && layout.lots) for (const l of layout.lots) if (l.spaceport) byKey.set(l.spaceport, l);
  const step = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] };
  return P.HALLS.map((h, i) => {
    const lot = byKey.get(h.key);
    const r = h.rect, d0 = h.doors[0], [nx, nz] = step[d0.side];
    return {
      id: lot ? lot.id : -1 - i, key: h.key, name: h.name, kind: 'landmark', family: 'spaceport_hall', purpose: h.purpose, district: 'spaceport',
      height: 0, floorY: DECK_Y, front: h.front, order: i,
      bounds: { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 },
      x0: r.x0, z0: r.z0, x1: r.x1 + 1, z1: r.z1 + 1, w: r.x1 + 1 - r.x0, d: r.z1 + 1 - r.z0,
      doors: h.doors.map((d) => ({ x: d.x, y: DECK_Y, z: d.z, side: d.side })),
      door: { x: d0.x + nx, y: DECK_Y, z: d0.z + nz }, inside: { x: d0.x - nx, y: DECK_Y, z: d0.z - nz }, lobby: { x: d0.x - nx, y: DECK_Y, z: d0.z - nz },
      midDoor: null, floors: [DECK_Y], rooms: [], beds: [],
      spots: h.spots.map(([x, z]) => ({ x, y: DECK_Y, z })),
    };
  });
}

export function register(gen, game) {
  const S = SPACEPORT;
  gen.addStructure({ name: 'spaceport', x0: S.x0, z0: S.z0, x1: S.x1, z1: S.z1, fill: fillSpaceportChunk });
  gen.addStructure({ name: 'frontier-spaceport', x0: FRONTIER.x0, z0: FRONTIER.z0, x1: FRONTIER.x1, z1: FRONTIER.z1, fill: fillFrontierChunk });
  if (game) {
    const layout = game.coruscant && game.coruscant.layout ? game.coruscant.layout : null;
    game.spaceportHalls = spaceportHallMeta(layout);
    // the signs / toasts / economy read building records through game.coruscant.cityMeta(): the city registers first
    // (structures/index.js), so its records are extended with the halls' (the city painter never builds them)
    if (game.coruscant && typeof game.coruscant.cityMeta === 'function') {
      const cityMeta = game.coruscant.cityMeta, halls = game.spaceportHalls.filter((m) => m.id >= 0);
      game.coruscant.cityMeta = () => [...cityMeta(), ...halls];
    }
    installShipTraffic(game, {
      pads: S.pads, deckY: DECK_Y, repairBerths: S.repairBerths,
      center: { x: (P.RECT.x0 + P.RECT.x1) / 2, y: DECK_Y, z: 0 },
      frontier: { pad: FRONTIER.pad, deckY: FRONTIER_DECK_Y },
    });
  }
}
