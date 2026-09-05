// Coruscant spaceport: the west edge of the plateau (x 2561..2719, z -180..179), generated lazily per chunk.
//
// Layout (all y are block layers; players walk one above):
//   - covered bridge at y 90 from the space-train platform (x <= 2560, |z| <= 12, kept free) to a half-step ramp
//     that climbs to the raised deck (top layer y 96 = the city's mid-level boulevards) at x 2576..2716, z -176..176,
//     carried by 2x2 pillars and girders over the plateau ground (y 60);
//   - terminal hall x 2592..2650, z -40..40 with a stepped glass roof, check-in counters, departure boards,
//     seating, cantina, kiosks, security post; doors west (from the ramp), east (plaza) and north/south (concourses);
//   - two covered concourse spines (x 2612..2631) lead north and south to eight 24x24 landing pads with markings,
//     edge lights, fuel bowsers and crates;
//   - control tower (shaft x 2688..2695, z -4..3, cab at y 151..156, ~60 above the deck) on the east plaza;
//   - maintenance hangar with an open west front (NE), fuel farm with four chrome tanks and a pump house (E),
//     container yards with portal cranes (N and S edges) and a workshop yard (SE).
// Everything is a pure function of world coordinates (hash-based variation), so every chunk is identical on every
// load and client. The ship traffic that uses the pads lives in ../ships/traffic.js.
import { B } from '../blocks.js';
import { hash2, hash3 } from '../rng.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import { shipModels, stampShip } from '../ships/models.js';
import { installShipTraffic } from '../ships/traffic.js';

export const DECK_TOP = 96;              // top block layer of the deck
export const DECK_Y = DECK_TOP + 1;      // walking surface / landing-gear height on the pads
export const STATION_Y = 90;             // floor layer of the train platform and of the bridge

export const SPACEPORT = {
  x0: 2561, z0: -180, x1: 2720, z1: 180,                     // structure AABB (x1, z1 exclusive)
  deck: { x0: 2576, z0: -176, x1: 2716, z1: 176 },          // inclusive
  bridge: { x0: 2561, x1: 2575, hw: 6 },
  ramp: { x0: 2576, x1: 2588, hw: 6 },                       // 12 half-steps: surface 91 -> 97
  terminal: { x0: 2592, x1: 2650, z0: -40, z1: 40, cx: 2621 },
  spine: { x0: 2612, x1: 2631, zEnd: 146 },
  padHalf: 12,
  pads: [
    { x: 2596, z: -68 }, { x: 2648, z: -68 }, { x: 2596, z: -116 }, { x: 2648, z: -116 },
    { x: 2596, z: 68 }, { x: 2648, z: 68 }, { x: 2596, z: 116 }, { x: 2648, z: 116 },
  ],
  tower: { x0: 2688, x1: 2695, z0: -4, z1: 3, cabY: 151, roofY: 156 },
  hangar: { x0: 2672, x1: 2711, z0: -140, z1: -100 },
  fuel: { x0: 2672, x1: 2711, z0: -94, z1: -48, tanks: [[2681, -84], [2701, -84], [2681, -60], [2701, -60]] },
  yardN: { x0: 2584, x1: 2711, z0: -172, z1: -148 },
  yardS: { x0: 2584, x1: 2711, z0: 148, z1: 172 },
  workshop: { x0: 2680, x1: 2711, z0: 56, z1: 84 },
  yardSE: { x0: 2682, x1: 2711, z0: 92, z1: 140 },
};
const S = SPACEPORT;

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, PLATE = B.DECK_PLATE, STR = B.PANEL_STRIPE, GL = B.STEEL_GLASS;
const GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, LAMP = B.CITY_LAMP, HOLO = B.HOLO_SIGN, CON = B.CONSOLE;
const CHR = B.CHROME, RED = B.PANEL_RED, BLK = B.PANEL_BLACK, VENT = B.VENT, SLAB = B.STONE_BRICK_SLAB, HP = B.HULL_PLATE;
const AIR = B.AIR;
// Floor markings on the dark deck plate: PANEL_STRIPE only shows its stripes on side faces (its top is dark
// durasteel), so flush markings use light durasteel lines and red hazard cells; PANEL_STRIPE is used for kerbs.
const LINE = D;
const abs = Math.abs, max = Math.max, min = Math.min;

// 3x5 pixel digits 0..8 (row-major, top row first) for the painted pad numbers.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111'];
function paintDigit(p, n, x0, y, z0, id, flip = false) {
  const d = DIGITS[n];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (d[r * 3 + c] === '1') {
    if (flip) p.set(x0 + 2 - c, y, z0 + 4 - r, id); else p.set(x0 + c, y, z0 + r, id);
  }
}

// Clipped writer for one chunk.
class Painter {
  constructor(chunk) {
    this.b = chunk.blocks;
    this.x0 = chunk.cx * CS; this.z0 = chunk.cz * CS; this.x1 = this.x0 + CS - 1; this.z1 = this.z0 + CS - 1;
  }
  overlaps(x0, z0, x1, z1) { return !(x1 < this.x0 || x0 > this.x1 || z1 < this.z0 || z0 > this.z1); }
  set(x, y, z, id) {
    const lx = x - this.x0, lz = z - this.z0;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
    this.b[(lx * CS + lz) * CH + y] = id;
  }
  get(x, y, z) {
    const lx = x - this.x0, lz = z - this.z0;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return -1;
    return this.b[(lx * CS + lz) * CH + y];
  }
  // inclusive box, clipped
  box(x0, y0, z0, x1, y1, z1, id) {
    const ax0 = max(x0, this.x0), ax1 = min(x1, this.x1), az0 = max(z0, this.z0), az1 = min(z1, this.z1);
    if (ax0 > ax1 || az0 > az1) return;
    const by0 = max(0, y0), by1 = min(CH - 1, y1);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const base = ((x - this.x0) * CS + (z - this.z0)) * CH;
      for (let y = by0; y <= by1; y++) this.b[base + y] = id;
    }
  }
  // vertical column
  col(x, z, y0, y1, id) { this.box(x, y0, z, x, y1, z, id); }
  // walls of a box (no floor/ceiling)
  walls(x0, y0, z0, x1, y1, z1, id) {
    this.box(x0, y0, z0, x0, y1, z1, id); this.box(x1, y0, z0, x1, y1, z1, id);
    this.box(x0, y0, z0, x1, y1, z0, id); this.box(x0, y0, z1, x1, y1, z1, id);
  }
  // solid cylinder around the block corner (cx, cz) (cells whose centre is within r), clipped
  cyl(cx, cz, r, y0, y1, id) {
    const R = Math.ceil(r);
    const ax0 = max(cx - R, this.x0), ax1 = min(cx + R, this.x1), az0 = max(cz - R, this.z0), az1 = min(cz + R, this.z1);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) this.col(x, z, y0, y1, id);
    }
  }
  // clipped iteration helpers
  xRange(x0, x1) { return [max(x0, this.x0), min(x1, this.x1)]; }
  zRange(z0, z1) { return [max(z0, this.z0), min(z1, this.z1)]; }
}

// A lamp post: dark post with a city lamp on top (standing on the deck).
function lampPost(p, x, z, h = 3) { p.col(x, z, DECK_Y, DECK_Y + h - 1, DD); p.set(x, DECK_Y + h, z, LAMP); }

// ------------------------------------------------------------------------------------------------ deck
function paintDeck(p) {
  const d = S.deck;
  if (!p.overlaps(d.x0, d.z0, d.x1, d.z1)) return;
  const [x0, x1] = p.xRange(d.x0, d.x1), [z0, z1] = p.zRange(d.z0, d.z1);
  const R = S.ramp;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (x <= R.x1 && abs(z) <= R.hw + 1) continue;             // the ramp cut stays open
    p.set(x, 94, z, DD); p.set(x, 95, z, DD); p.set(x, 96, z, PLATE);
  }
  // girders under the deck on a 16 grid, 2x2 pillars at the crossings, blue underside lights between them
  for (let z = z0; z <= z1; z++) if (((z + 168) & 15) === 0) p.box(x0, 93, z, x1, 93, z, DD);
  for (let x = x0; x <= x1; x++) if (((x - 2584) & 15) === 0) p.box(x, 93, z0, x, 93, z1, DD);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const px = (x - 2584) & 15, pz = (z + 168) & 15;
    if (px <= 1 && pz <= 1) p.col(x, z, 61, 92, DD);
    else if (px === 8 && pz === 8 && !(x <= R.x1 && abs(z) <= R.hw + 1)) p.set(x, 93, z, BLUE);
  }
  // perimeter parapet: dark kerb + glass, lamp posts every 16
  const kerb = (x, z) => { p.set(x, 97, z, STR); p.set(x, 98, z, GL); };
  for (let z = z0; z <= z1; z++) {
    if (abs(z) > R.hw + 1) kerb(d.x0, z);
    kerb(d.x1, z);
    if (((z + 176) & 15) === 0 || z === d.z1) { if (abs(z) > R.hw + 1) lampPost(p, d.x0, z); lampPost(p, d.x1, z); }
  }
  for (let x = x0; x <= x1; x++) {
    kerb(x, d.z0); kerb(x, d.z1);
    if (((x - 2576) & 15) === 0 || x === d.x1) { lampPost(p, x, d.z0); lampPost(p, x, d.z1); }
  }
}

// ------------------------------------------------------------------------------------------------ bridge + ramp
function paintBridge(p) {
  const br = S.bridge, hw = br.hw;
  if (p.overlaps(br.x0, -hw - 1, br.x1, hw + 1)) {
    const [x0, x1] = p.xRange(br.x0, br.x1);
    for (let x = x0; x <= x1; x++) {
      for (let z = -hw; z <= hw; z++) {
        p.set(x, STATION_Y, z, z === 0 ? STR : (abs(z) === 5 && (x & 3) === 0) ? GLOW : D);
        p.set(x, STATION_Y + 5, z, ((x - br.x0) % 7 === 0) ? D : GL);        // glass canopy with beams
      }
      for (const z of [-hw - 1, hw + 1]) {
        p.set(x, STATION_Y, z, DD); p.set(x, STATION_Y + 1, z, DD);
        p.box(x, STATION_Y + 2, z, x, STATION_Y + 4, z, GL);
        p.set(x, STATION_Y + 5, z, D);
        p.set(x, STATION_Y - 1, z, DD);                                          // underside rail
        if ((x - br.x0) % 8 === 2) p.col(x, z, 61, STATION_Y - 2, DD);           // support pillars to the ground
      }
    }
  }
  const R = S.ramp;
  if (p.overlaps(R.x0, -R.hw - 1, R.x1, R.hw + 1)) {
    const [x0, x1] = p.xRange(R.x0, R.x1);
    for (let x = x0; x <= x1; x++) {
      const k = x - R.x0;                    // 0..12, walking surface 91 + k/2
      const T = STATION_Y + 1 + k / 2, top = Math.floor(T), half = T !== top;
      for (let z = -R.hw; z <= R.hw; z++) {
        p.box(x, STATION_Y, z, x, top - 1, z, k === 0 ? D : DD);
        if (half) p.set(x, top, z, SLAB);
        if (!half && k > 0 && k < 12 && abs(z) === 5) p.set(x, top - 1, z, GLOW);   // step lights
      }
      for (const z of [-R.hw - 1, R.hw + 1]) {                                        // glass balustrade
        p.col(x, z, STATION_Y, top, DD);
        p.set(x, top + 1, z, GL); p.set(x, top + 2, z, GL);
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------ terminal
const roofY = (z) => 111 + (abs(z) <= 8 ? 2 : abs(z) <= 24 ? 1 : 0);

function terminalFloor(x, z) {
  const T = S.terminal;
  if (abs(z) === 4 && x > T.x0 && x < T.x1) return (x & 3) === 0 ? GLOW : STR;                // east-west spine edges
  if (abs(z) < 4) return D;
  if ((x === T.cx - 4 || x === T.cx + 5)) return (z & 3) === 0 ? GLOW : STR;                  // north-south spine edges
  if (x > T.cx - 4 && x < T.cx + 5) return D;
  return ((x & 7) === 0 || (z & 7) === 0) ? DD : D;
}

function paintTerminal(p) {
  const T = S.terminal;
  if (!p.overlaps(T.x0, T.z0, T.x1, T.z1)) return;
  const [x0, x1] = p.xRange(T.x0, T.x1), [z0, z1] = p.zRange(T.z0, T.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const ry = roofY(z);
    const onX = x === T.x0 || x === T.x1, onZ = z === T.z0 || z === T.z1;
    p.set(x, 96, z, terminalFloor(x, z));
    if (onX || onZ) {
      const corner = onX && onZ, mullion = onX ? ((z & 3) === 0) : ((x - T.x0) % 4 === 0);
      for (let y = 97; y < ry; y++) {
        let id = D;
        if (y <= 98) id = (y === 98 && !corner && (onX ? (z & 7) === 4 : ((x - T.x0) & 7) === 4)) ? GLOW : DD;
        else if (y <= 106) id = (corner || mullion) ? D : GL;
        p.set(x, y, z, id);
      }
    }
    // roof: durasteel frame every 8 blocks, tinted glass between
    p.set(x, ry, z, (((x - T.x0) & 7) === 0 || (z & 7) === 0 || x === T.x1) ? D : GL);
  }
  // doors (west/east on the spine, north/south to the concourses) with holo headers and glow frames
  for (const x of [T.x0, T.x1]) {
    p.box(x, 97, -4, x, 101, 4, AIR);
    p.box(x, 102, -4, x, 103, 4, HOLO);
    p.col(x, -5, 97, 103, GLOW); p.col(x, 5, 97, 103, GLOW);
  }
  for (const z of [T.z0, T.z1]) {
    p.box(T.cx - 3, 97, z, T.cx + 4, 101, z, AIR);
    p.box(T.cx - 3, 102, z, T.cx + 4, 103, z, HOLO);
    p.col(T.cx - 4, z, 97, 103, GLOW); p.col(T.cx + 5, z, 97, 103, GLOW);
  }
  // interior pillars with lamps at knee and head height
  for (const x of [2604, 2616, 2628, 2640]) for (const z of [-24, -12, 12, 24]) {
    p.col(x, z, 97, roofY(z) - 1, D); p.set(x, 98, z, GLOW); p.set(x, 101, z, GLOW);
  }
  // central departure-board tower
  p.box(T.cx - 1, 97, -1, T.cx + 1, 99, 1, DD); p.box(T.cx - 1, 100, -1, T.cx + 1, 102, 1, HOLO); p.box(T.cx - 1, 103, -1, T.cx + 1, 103, 1, CHR);
  // check-in counters (north side) with consoles, baggage belt and wall boards behind them
  for (const [cx0, cx1] of [[2598, 2614], [2628, 2644]]) {
    for (let x = cx0; x <= cx1; x++) p.set(x, 97, -30, (x & 3) === 2 ? CON : DD);
    p.box(cx0, 97, -36, cx1, 97, -36, DD);
    for (let x = cx0; x <= cx1; x++) if (hash2(x, 1, 21) < 0.45) p.set(x, 98, -36, B.CRATE);
    p.box(cx0 + 2, 100, T.z0 + 1, cx1 - 2, 101, T.z0 + 1, HOLO);
  }
  // security post (NE corner): glass booth with a console
  p.box(2645, 97, -38, 2649, 97, -34, DD); p.walls(2645, 98, -38, 2649, 99, -34, GL); p.box(2645, 100, -38, 2649, 100, -34, DD);
  p.set(2647, 100, -36, GLOW); p.set(2647, 98, -37, CON); p.box(2645, 98, -36, 2645, 99, -36, AIR);
  // seating rows (south half), benches of five with aisles
  for (const z of [10, 14, 18, 22]) for (const [bx0, bx1] of [[2598, 2612], [2630, 2644]]) {
    for (let x = bx0; x <= bx1; x++) if ((x - bx0) % 6 !== 5) p.set(x, 97, z, SLAB);
    p.set(bx0 + 5, 97, z, DD);
  }
  // cantina (SW corner): bar, back shelves with blue light, tables and seats
  p.box(2598, 97, 34, 2610, 97, 34, DD); p.set(2598, 97, 34, B.BARREL); p.set(2610, 97, 34, B.BARREL); p.set(2604, 97, 34, CON);
  p.box(2598, 97, T.z1 - 1, 2610, 98, T.z1 - 1, B.SHELF); p.box(2598, 99, T.z1 - 1, 2610, 99, T.z1 - 1, BLUE);
  p.box(2603, 100, 34, 2605, 101, 34, HOLO);
  for (const [tx, tz] of [[2600, 28], [2606, 28], [2600, 31], [2606, 31], [2609, 29]]) {
    p.set(tx, 97, tz, B.TABLE); p.set(tx - 1, 97, tz, SLAB); p.set(tx + 1, 97, tz, SLAB);
  }
  // kiosks along the south wall: counter, side partitions, back shelves, holo sign under a lit canopy
  for (const kx0 of [2628, 2634, 2640]) {
    const kx1 = kx0 + 5;
    p.box(kx0, 97, 35, kx1 - 1, 97, 35, DD);
    p.box(kx0, 97, 36, kx0, 100, 38, DD);
    p.box(kx0 + 1, 97, T.z1 - 1, kx1, 98, T.z1 - 1, B.SHELF);
    for (let x = kx0 + 1; x <= kx1; x++) for (let z = 37; z <= 38; z++) if (hash2(x, z, 22) < 0.35) p.set(x, 97, z, hash2(x, z, 23) < 0.5 ? B.CRATE : B.BARREL);
    p.box(kx0, 101, 35, kx1, 101, T.z1 - 1, DD); p.set(kx0 + 3, 101, 37, GLOW);
    p.box(kx0 + 1, 100, 35, kx1 - 1, 100, 35, HOLO);
  }
  // gate lounge (east end): benches facing the glass wall, consoles at the gates
  for (const x of [2640, 2644]) for (let z = -30; z <= 30; z++) if (abs(z) > 5 && (z % 6) !== 0) p.set(x, 97, z, SLAB);
  for (const z of [-20, 20]) { p.set(2648, 97, z, CON); p.set(2648, 97, z + 1, DD); p.set(2648, 97, z - 1, DD); }
}

// ------------------------------------------------------------------------------------------------ concourses
function paintSpines(p) {
  const sp = S.spine, T = S.terminal;
  if (!p.overlaps(sp.x0 - 1, -sp.zEnd, sp.x1 + 1, sp.zEnd)) return;
  const [x0, x1] = p.xRange(sp.x0 - 1, sp.x1 + 1);
  for (const side of [-1, 1]) {
    const za = side < 0 ? -sp.zEnd : T.z1 + 1, zb = side < 0 ? T.z0 - 1 : sp.zEnd;
    const [z0, z1] = p.zRange(za, zb);
    if (z0 > z1) continue;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x === sp.x0 || x === sp.x1) p.set(x, 96, z, (z % 6 === 0) ? GLOW : LINE);              // lit edge lines
      else if ((x === T.cx || x === T.cx + 1) && ((z & 7) < 4)) p.set(x, 96, z, LINE);             // dashed centre line
      if (x === sp.x0 - 1 || x === sp.x1 + 1) {
        if (((z + 168) & 15) === 8) { p.col(x, z, 97, 101, DD); p.set(x, 99, z, LAMP); }           // lamp posts carry the canopy
        p.set(x, 102, z, D);
      } else p.set(x, 102, z, GL);                                                                   // glass canopy
    }
  }
  // cross-walk markings from the spines to the pads and from the east pads to the plaza/east zone
  for (const pad of S.pads) {
    const west = pad.x < T.cx;
    const gx0 = west ? pad.x + S.padHalf : sp.x1 + 1, gx1 = west ? sp.x0 - 1 : pad.x - S.padHalf - 1;
    for (const dz of [-3, 3]) for (let x = gx0; x <= gx1; x++) p.set(x, 96, pad.z + dz, LINE);
    if (!west) for (const dz of [-3, 3]) for (let x = pad.x + S.padHalf; x <= 2671; x++) p.set(x, 96, pad.z + dz, LINE);
  }
}

// ------------------------------------------------------------------------------------------------ landing pads
function paintPads(p) {
  const H = S.padHalf;
  for (let i = 0; i < S.pads.length; i++) {
    const pad = S.pads[i];
    const px0 = pad.x - H, px1 = pad.x + H - 1, pz0 = pad.z - H, pz1 = pad.z + H - 1;
    if (!p.overlaps(px0 - 3, pz0 - 3, px1 + 3, pz1 + 3)) continue;
    const [x0, x1] = p.xRange(px0, px1), [z0, z1] = p.zRange(pz0, pz1);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const dx = x + 0.5 - pad.x, dz = z + 0.5 - pad.z, r2 = dx * dx + dz * dz;
      const edge = x === px0 || x === px1 || z === pz0 || z === pz1;
      let id = PLATE;
      if (edge) {                                                                       // hazard border with flush edge lights
        const k = x === px0 ? z - pz0 : x === px1 ? pz1 - z : z === pz0 ? px1 - x : x - px0;
        id = k % 6 === 3 ? LAMP : ((k >> 1) & 1) ? RED : LINE;
      } else if (r2 >= 64 && r2 < 81) id = LINE;                                         // landing circle
      else if ((abs(dx) < 1 && abs(dz) < 6) || (abs(dz) < 1 && abs(dx) < 6)) id = abs(dx) < 1 && abs(dz) < 1 ? GLOW : RED; // centre cross
      p.set(x, 96, z, id);
    }
    paintDigit(p, i + 1, px0 + 3, 96, pz0 + 3, LINE); paintDigit(p, i + 1, px1 - 5, 96, pz1 - 7, LINE, true);   // pad number, both corners
    // corner lamps inside the pad, fuel bowser and cargo crates in the service strip beside it
    for (const [cx, cz] of [[px0 + 1, pz0 + 1], [px1 - 1, pz0 + 1], [px0 + 1, pz1 - 1], [px1 - 1, pz1 - 1]]) lampPost(p, cx, cz, 2);
    const sx = px1 + 2;
    p.box(sx, 97, pz0 + 2, sx + 1, 97, pz0 + 3, STR); p.box(sx, 98, pz0 + 2, sx + 1, 98, pz0 + 3, CHR); p.set(sx, 99, pz0 + 2, DD); p.set(sx + 1, 99, pz0 + 3, RED); p.set(sx, 97, pz0 + 4, DD);
    for (let k = 0; k < 4; k++) {
      const cx = sx + (k & 1), cz = pz1 - 4 + (k >> 1);
      const h = Math.floor(hash3(cx, i, cz, 31) * 3);
      if (h > 0) p.box(cx, 97, cz, cx, 96 + h, cz, hash3(cx, i, cz, 32) < 0.7 ? B.CRATE : B.BARREL);
    }
    p.box(sx, 97, pz0 + 6, sx + 1, 97, pz0 + 7, DD); p.set(sx, 98, pz0 + 6, CON);            // pad control console
    p.box(sx, 97, pz0 + 8, sx, 100, pz0 + 8, DD); p.set(sx, 101, pz0 + 8, HOLO);              // pad marker mast
  }
}

// ------------------------------------------------------------------------------------------------ tower
function paintTower(p) {
  const T = S.tower;
  if (!p.overlaps(T.x0 - 4, T.z0 - 4, T.x1 + 4, T.z1 + 4)) return;
  const cabY = T.cabY;
  // shaft: durasteel with dark corners, blue light strips, stripe bands, slit windows
  for (let y = 97; y <= cabY - 3; y++) {
    for (let x = T.x0; x <= T.x1; x++) for (const z of [T.z0, T.z1]) {
      const corner = x === T.x0 || x === T.x1;
      p.set(x, y, z, corner ? DD : (y % 6 === 3 && x >= 2690 && x <= 2693) ? GL : (y === 120 || y === 140) ? STR : D);
    }
    for (const x of [T.x0, T.x1]) for (let z = T.z0 + 1; z <= T.z1 - 1; z++) {
      p.set(x, y, z, (z === -1 || z === 0) && y >= 100 ? BLUE : (y === 120 || y === 140) ? STR : D);
    }
  }
  // flare below the cab (solid rings), then the shaft interior is carved back through it
  p.box(T.x0 - 1, cabY - 3, T.z0 - 1, T.x1 + 1, cabY - 3, T.z1 + 1, DD);
  p.box(T.x0 - 2, cabY - 2, T.z0 - 2, T.x1 + 2, cabY - 1, T.z1 + 2, DD);
  p.box(T.x0 + 1, 97, T.z0 + 1, T.x1 - 1, cabY - 1, T.z1 - 1, AIR);
  p.box(T.x0, 97, -1, T.x0, 98, 0, AIR); p.box(T.x0, 99, -1, T.x0, 99, 0, HOLO);      // door + sign
  // core column with stairwell lights
  p.box(2691, 97, -1, 2692, cabY - 1, 0, DD);
  for (let y = 99; y < cabY; y += 4) { p.set(2691, y, -1, BLUE); p.set(2692, y, 0, BLUE); }
  // spiral stair on the interior ring (20 cells, half a block per cell)
  const ring = [];
  for (let x = 2689; x <= 2694; x++) ring.push([x, -3]);
  for (let z = -2; z <= 2; z++) ring.push([2694, z]);
  for (let x = 2693; x >= 2689; x--) ring.push([x, 2]);
  for (let z = 1; z >= -2; z--) ring.push([2689, z]);
  for (let k = 1; k <= 110; k++) {
    const [x, z] = ring[k % 20];
    const T2 = DECK_Y + k / 2, top = Math.floor(T2), half = T2 !== top;
    if (half) { p.set(x, top, z, SLAB); p.set(x, top - 1, z, DD); }
    else { p.set(x, top - 1, z, DD); p.set(x, top - 2, z, DD); }
  }
  // cab (16 x 16)
  p.box(T.x0 - 4, cabY, T.z0 - 4, T.x1 + 4, cabY, T.z1 + 4, D);
  p.box(T.x0 + 1, cabY, T.z0 + 1, T.x1 - 1, cabY, T.z1 - 1, AIR);                     // stairwell opening
  p.box(2691, cabY, -1, 2692, cabY, 0, DD);                                             // core column reaches the cab floor
  p.set(2694, cabY, 2, DD); p.set(2694, cabY, 1, SLAB);                                 // last steps
  p.walls(T.x0 - 4, cabY + 1, T.z0 - 4, T.x1 + 4, cabY + 1, T.z1 + 4, DD);              // sill ring
  p.walls(T.x0 - 4, cabY + 2, T.z0 - 4, T.x1 + 4, cabY + 4, T.z1 + 4, GL);
  for (const x of [T.x0 - 4, T.x1 + 4]) for (const z of [T.z0 - 4, T.z1 + 4]) p.col(x, z, cabY + 1, cabY + 4, D);
  p.box(T.x0 - 4, cabY + 5, T.z0 - 4, T.x1 + 4, cabY + 5, T.z1 + 4, D);                 // roof
  for (let x = T.x0 - 2; x <= T.x1 + 2; x += 3) for (let z = T.z0 - 2; z <= T.z1 + 2; z += 3) p.set(x, cabY + 5, z, GLOW);
  p.walls(T.x0 - 3, cabY + 6, T.z0 - 3, T.x1 + 3, cabY + 6, T.z1 + 3, DD);              // roof lip
  for (const x of [T.x0 - 3, T.x1 + 3]) for (const z of [T.z0 - 3, T.z1 + 3]) p.set(x, cabY + 6, z, RED);
  // stairwell railing (glass) around the opening, gap at the arrival
  for (let x = T.x0; x <= T.x1; x++) for (const z of [T.z0, T.z1]) p.set(x, cabY + 1, z, GL);
  for (let z = T.z0; z <= T.z1; z++) { p.set(T.x0, cabY + 1, z, GL); if (z < 1) p.set(T.x1, cabY + 1, z, GL); }
  // console ring along the cab windows, holo column on the antenna base
  for (let x = T.x0 - 3; x <= T.x1 + 3; x++) for (let z = T.z0 - 3; z <= T.z1 + 3; z++) {
    if (x === T.x0 - 3 || x === T.x1 + 3 || z === T.z0 - 3 || z === T.z1 + 3) p.set(x, cabY + 1, z, ((x + z) & 1) ? CON : DD);
  }
  p.box(2691, cabY + 1, -1, 2692, cabY + 3, 0, HOLO);
  // antenna mast with beacon
  p.box(2691, cabY + 6, -1, 2692, cabY + 11, 0, DD); p.box(2691, cabY + 12, -1, 2692, cabY + 12, 0, LAMP); p.set(2691, cabY + 13, -1, RED); p.set(2692, cabY + 14, -1, LAMP);
}

// ------------------------------------------------------------------------------------------------ hangar
function paintHangar(p) {
  const H = S.hangar;
  if (!p.overlaps(H.x0, H.z0, H.x1, H.z1)) return;
  const roof = 112, zc = (H.z0 + H.z1) >> 1;
  const [x0, x1] = p.xRange(H.x0, H.x1), [z0, z1] = p.zRange(H.z0, H.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    // floor: centre line and bay markings, vent grates
    if (x > H.x0 && (abs(z - zc) === 12 || (z === zc && (x & 7) < 4))) p.set(x, 96, z, LINE);
    else if (((x - H.x0) % 9) === 4 && ((z - H.z0) % 9) === 4) p.set(x, 96, z, VENT);
    // walls
    const back = x === H.x1, side = z === H.z0 || z === H.z1, front = x === H.x0;
    if (back || side) {
      const column = back ? ((z - H.z0) & 7) === 0 : ((x - H.x0) & 7) === 0;
      for (let y = 97; y < roof; y++) {
        let id = DD;
        if (column) id = D;
        else if (y >= 104 && y <= 105 && ((back ? (z - H.z0) : (x - H.x0)) & 7) >= 3) id = GL;
        else if ((y === 99 || y === 108) && ((back ? (z - H.z0) : (x - H.x0)) % 3) === 1) id = GLOW;   // work-light strips
        else if (y === roof - 1) id = D;
        p.set(x, y, z, id);
      }
    } else if (front) {
      // open front: stubs beside the opening, lintel over it
      if (abs(z - zc) > 16) p.box(x, 97, z, x, roof - 1, z, abs(z - zc) === 17 ? D : DD);
      else p.box(x, roof - 2, z, x, roof - 1, z, D);
    }
    // roof with vents and a lit skylight grid
    p.set(x, roof, z, (front || back || side) ? D : ((x - H.x0) % 6 === 3 && (z - H.z0) % 6 === 3) ? VENT : DD);
    if (!front && !back && !side && ((x - H.x0) & 3) === 2 && ((z - H.z0) & 3) === 2) p.set(x, roof - 1, z, GLOW);   // dense ceiling lights
  }
  // gantry: beam along the bay with a trolley and hook, rails on the side walls
  p.box(H.x0 + 1, 108, zc, H.x1 - 1, 108, zc, D);
  p.box(H.x0 + 1, 108, H.z0 + 1, H.x1 - 1, 108, H.z0 + 1, DD); p.box(H.x0 + 1, 108, H.z1 - 1, H.x1 - 1, 108, H.z1 - 1, DD);
  p.box(2685, 106, zc - 1, 2686, 107, zc, DD); p.set(2685, 105, zc, CHR); p.set(2685, 104, zc, CHR);
  // parked freighter under maintenance (nose toward the open front), workbenches, crates, barrels
  stampShip(shipModels()[0], (x, y, z, id) => p.set(x, y, z, id), 2693, DECK_Y, zc, 1);
  for (let z = zc - 10; z <= zc + 10; z += 4) { p.set(H.x1 - 1, 97, z, CON); p.set(H.x1 - 1, 97, z + 1, DD); }
  for (let x = H.x1 - 5; x <= H.x1 - 1; x++) for (let z = H.z0 + 1; z <= H.z0 + 5; z++) {
    const h = Math.floor(hash2(x, z, 41) * 3.2);
    if (h > 0) p.box(x, 97, z, x, 96 + h, z, hash2(x, z, 42) < 0.6 ? B.CRATE : B.BARREL);
  }
  for (let x = H.x1 - 5; x <= H.x1 - 1; x++) for (let z = H.z1 - 5; z <= H.z1 - 1; z++) if (hash2(x, z, 43) < 0.4) p.set(x, 97, z, B.BARREL);
  p.set(H.x0 + 4, 97, H.z0 + 2, B.ANVIL); p.set(H.x0 + 6, 97, H.z0 + 2, B.FURNACE); p.set(H.x0 + 8, 97, H.z0 + 2, B.TABLE);
  for (const z of [zc - 14, zc + 14]) for (let x = H.x0 + 6; x <= H.x1 - 6; x += 12) lampPost(p, x, z, 3);
}

// ------------------------------------------------------------------------------------------------ fuel farm
function paintFuel(p) {
  const F = S.fuel;
  if (!p.overlaps(F.x0, F.z0, F.x1, F.z1)) return;
  for (const [cx, cz] of F.tanks) {
    p.cyl(cx, cz, 6.5, 96, 96, DD); p.cyl(cx, cz, 5.6, 96, 96, RED); p.cyl(cx, cz, 4.8, 96, 96, DD);
    p.cyl(cx, cz, 5.5, 97, 111, CHR);
    p.cyl(cx, cz, 5.5, 104, 104, STR); p.cyl(cx, cz, 4.7, 104, 104, CHR);
    p.cyl(cx, cz, 4.5, 112, 112, CHR); p.cyl(cx, cz, 3, 113, 113, CHR); p.cyl(cx, cz, 1.5, 114, 114, DD); p.set(cx, 115, cz, LAMP);
    p.box(cx - 1, 97, cz - 1, cx, 99, cz, DD);                                              // access hatch stub
  }
  // manifold pipes between the tanks (overhead, walk-under), posts every 8
  p.box(2681, 100, -84, 2701, 100, -84, DD); p.box(2681, 100, -60, 2701, 100, -60, DD); p.box(2691, 100, -84, 2691, 100, -60, DD);
  for (let z = -84; z <= -60; z += 8) p.col(2691, z, 97, 99, DD);
  for (let x = 2681; x <= 2701; x += 8) { p.col(x, -84, 97, 99, DD); p.col(x, -60, 97, 99, DD); }
  // pump house
  p.box(2689, 97, -74, 2693, 100, -70, DD); p.box(2690, 97, -73, 2692, 99, -71, AIR);
  p.box(2689, 97, -72, 2689, 98, -72, AIR); p.set(2691, 100, -72, GLOW); p.set(2692, 97, -71, CON); p.set(2693, 98, -72, RED);
  p.box(2689, 101, -74, 2693, 101, -70, D); p.box(2691, 101, -72, 2691, 103, -72, DD); p.set(2691, 104, -72, LAMP);
  // low glass fence with gaps at the walkway, warning lamps at the corners
  for (let x = F.x0; x <= F.x1; x++) for (const z of [F.z0, F.z1]) { p.set(x, 97, z, DD); p.set(x, 98, z, GL); }
  for (let z = F.z0; z <= F.z1; z++) for (const x of [F.x0, F.x1]) if (abs(z + 71) > 2) { p.set(x, 97, z, DD); p.set(x, 98, z, GL); }
  for (const x of [F.x0, F.x1]) for (const z of [F.z0, F.z1]) lampPost(p, x, z, 3);
  p.box(F.x0, 96, -73, F.x0 + 10, 96, -69, LINE);                                            // entrance marking
}

// ------------------------------------------------------------------------------------------------ cargo yards
function containers(p, Y, seed) {
  if (!p.overlaps(Y.x0, Y.z0, Y.x1, Y.z1)) return;
  const colors = [DD, RED, STR, D, HP];
  for (let z = Y.z0 + 1; z + 2 <= Y.z1 - 1; z += 6) for (let x = Y.x0 + 2; x + 5 <= Y.x1 - 2; x += 8) {
    if (!p.overlaps(x, z, x + 5, z + 2)) continue;
    const r = hash3(x, z, seed, 51);
    if (r > 0.72) {
      if (r > 0.9) for (let k = 0; k < 3; k++) if (hash3(x + k, z, seed, 55) < 0.6) p.set(x + k * 2, 97, z + 1, hash3(x, z + k, seed, 56) < 0.5 ? B.CRATE : B.BARREL);
      continue;
    }
    const stack = hash3(x, z, seed, 52) < 0.35 ? 2 : 1;
    for (let s = 0; s < stack; s++) {
      const c = colors[Math.floor(hash3(x, z + s, seed, 53) * colors.length)];
      p.box(x, 97 + s * 3, z, x + 5, 99 + s * 3, z + 2, c);
      p.box(x, 97 + s * 3, z, x, 99 + s * 3, z + 2, DD); p.box(x + 5, 97 + s * 3, z, x + 5, 99 + s * 3, z + 2, DD);
      p.set(x + 2, 99 + s * 3, z + 1, VENT);
    }
  }
  for (let x = Y.x0; x <= Y.x1; x += 16) { lampPost(p, x, Y.z0, 4); lampPost(p, x, Y.z1, 4); }
}

function crane(p, x, z0, z1, h = 113) {
  if (!p.overlaps(x, z0, x + 1, z1)) return;
  p.box(x, 97, z0, x + 1, h - 1, z0 + 1, DD); p.box(x, 97, z1 - 1, x + 1, h - 1, z1, DD);
  p.box(x, h, z0, x + 1, h + 1, z1, DD);
  const tz = (z0 + z1) >> 1;
  p.box(x, h - 2, tz - 1, x + 1, h - 1, tz, CHR); p.box(x, h - 5, tz, x, h - 3, tz, DD);
  p.set(x, h + 2, z0, LAMP); p.set(x + 1, h + 2, z1, LAMP);
}

function paintYards(p) {
  containers(p, S.yardN, 1); crane(p, 2640, S.yardN.z0 - 2, S.yardN.z1 + 2);
  containers(p, S.yardS, 2); crane(p, 2640, S.yardS.z0 - 2, S.yardS.z1 + 2);
  containers(p, S.yardSE, 3);
  // workshop: closed hall with a wide open door to the west, benches and lights inside
  const W = S.workshop;
  if (p.overlaps(W.x0, W.z0, W.x1, W.z1)) {
    const roof = 108;
    p.walls(W.x0, 97, W.z0, W.x1, roof - 1, W.z1, DD);
    for (let x = W.x0; x <= W.x1; x += 8) { p.col(x, W.z0, 97, roof, D); p.col(x, W.z1, 97, roof, D); }
    for (let z = W.z0; z <= W.z1; z += 7) { p.col(W.x0, z, 97, roof, D); p.col(W.x1, z, 97, roof, D); }
    p.box(W.x0, 101, W.z0 + 1, W.x1, 102, W.z1 - 1, GL); p.box(W.x0, 101, W.z0, W.x0, 102, W.z0, D);
    p.box(W.x0 + 1, 101, W.z0, W.x1 - 1, 102, W.z0, GL); p.box(W.x0 + 1, 101, W.z1, W.x1 - 1, 102, W.z1, GL);
    p.box(W.x0, 97, 64, W.x0, 104, 76, AIR); p.box(W.x0, 105, 63, W.x0, roof - 1, 77, D);   // open door
    p.box(W.x0, roof, W.z0, W.x1, roof, W.z1, DD);
    for (let x = W.x0 + 4; x < W.x1; x += 8) for (let z = W.z0 + 4; z < W.z1; z += 7) { p.set(x, roof, z, VENT); p.set(x, roof - 1, z, GLOW); }
    for (let x = W.x0 + 4; x < W.x1; x += 8) { p.set(x, 98, W.z0 + 1, GLOW); p.set(x, 98, W.z1 - 1, GLOW); }
    for (let z = W.z0 + 3; z <= W.z1 - 3; z += 3) p.set(W.x1 - 1, 97, z, [CON, B.ANVIL, B.TABLE, B.FURNACE, DD][((z - W.z0) / 3) % 5 | 0]);
    for (let x = W.x0 + 3; x <= W.x1 - 3; x += 3) { p.set(x, 97, W.z0 + 1, (x & 1) ? B.CRATE : B.BARREL); }
    // speeder lift: marked square with a speeder parked on it
    p.box(2697, 96, 66, 2703, 96, 74, LINE); p.box(2698, 96, 67, 2702, 96, 73, PLATE);
    stampShip(shipModels()[2], (x, y, z, id) => p.set(x, y, z, id), 2700, DECK_Y, 70, 1);
  }
  // speeder park beside the workshop
  if (p.overlaps(2668, 92, 2679, 140)) {
    for (let k = 0; k < 4; k++) {
      const z = 100 + k * 12;
      p.box(2670, 96, z - 3, 2678, 96, z + 3, LINE); p.box(2671, 96, z - 2, 2677, 96, z + 2, PLATE);
      if (hash2(k, 7, 61) < 0.7) stampShip(shipModels()[2], (x, y, zz, id) => p.set(x, y, zz, id), 2674, DECK_Y, z, 1);
    }
  }
}

// ------------------------------------------------------------------------------------------------ plaza
function paintPlaza(p) {
  if (!p.overlaps(2651, -40, 2716, 40)) return;
  for (let x = 2651; x <= 2715; x++) { p.set(x, 96, -5, LINE); p.set(x, 96, 5, LINE); if ((x & 3) === 0) { p.set(x, 96, -4, GLOW); p.set(x, 96, 4, GLOW); } }
  for (let x = 2656; x <= 2712; x += 14) { lampPost(p, x, -8, 3); lampPost(p, x, 8, 3); }
  // ring around the tower base
  p.cyl(2692, 0, 10.5, 96, 96, D); p.cyl(2692, 0, 9.5, 96, 96, STR); p.cyl(2692, 0, 8.5, 96, 96, D);
  // monument: chrome obelisk with a blue crown, benches around
  p.box(2704, 97, -1, 2706, 98, 1, DD); p.box(2705, 99, 0, 2705, 110, 0, CHR); p.set(2705, 111, 0, BLUE); p.set(2705, 112, 0, LAMP);
  for (const [x, z] of [[2703, -2], [2707, -2], [2703, 2], [2707, 2]]) p.set(x, 97, z, SLAB);
  for (const z of [-20, 20]) for (let x = 2660; x <= 2676; x++) if (x % 5 !== 4) p.set(x, 97, z, SLAB);
}

// ------------------------------------------------------------------------------------------------ registry
export function fillSpaceportChunk(chunk) {
  const p = new Painter(chunk);
  paintDeck(p);
  paintBridge(p);
  paintTerminal(p);
  paintSpines(p);
  paintPads(p);
  paintPlaza(p);
  paintTower(p);
  paintHangar(p);
  paintFuel(p);
  paintYards(p);
}

export function register(gen, game) {
  gen.addStructure({ name: 'spaceport', x0: S.x0, z0: S.z0, x1: S.x1, z1: S.z1, fill: fillSpaceportChunk });
  if (game) installShipTraffic(game, { pads: S.pads, deckY: DECK_Y });
}
