// 500 Republica (docs/rubrics/06_landmarks.md): the most exclusive residential spire of the city and its tallest
// building. A slender rounded tower that steps in four times as it rises from a plaza podium: white plaster and
// chrome with tinted-glass bands and warm lit windows, a double-height security lobby with the turbolift core, a spa
// and pool level, a double-height garden atrium, a sky garden on the first setback terrace, floors of furnished
// apartments around a ring corridor, private landing pads cantilevered from the upper third, the veranda apartment
// wrapping the top tier (open balcony, curved window wall, its own pad) and the rooftop observatory under a glass
// dome. Everything is a pure function of the lot and ctx.rng. Local coordinates: x 0..115, z 0..83, y 0 = plateau
// top (repaved), walk level y 1; floors at y = 5k; the boulevard deck outside the lot is y 35 (walk 36); the front
// is the south (+z) edge with both doors on the column lot.door (x 58..59).
import { B } from '../../blocks.js';
import { hash3 } from '../../rng.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const W = 116, D = 84;                 // the lot the module is designed for
const CX = 59, CZ = 42;                // tower axis in continuous coordinates (cell x covers [x, x + 1))
const YTOP = 195;                      // highest block the world can hold above this plateau

// palette
const WHITE = B.PLASTER, CHROME = B.CHROME, GLASS = B.STEEL_GLASS, CLEAR = B.GLASS, DARK = B.DURASTEEL_DARK, STEEL = B.DURASTEEL;
const BLACK = B.PANEL_BLACK, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, PLATE = B.DECK_PLATE, SMOOTH = B.SMOOTH_STONE, BRICK = B.STONE_BRICKS;
const LIT = B.WINDOW_LIT, DIM = B.WINDOW_DARK, SLAB = B.STONE_BRICK_SLAB, GOLD = B.GOLD_BLOCK, SEAT = B.STONE_BRICK_SLAB;
const WOOLS = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];

// massing: four tiers (rounded rectangles, superellipse exponent 4) and the podium (exponent 8) under the plaza
const TIERS = [
  { y0: 35, y1: 89, ax: 24, az: 20 },    // x 35..82, z 22..61: lobby (36, double), spa 46, garden atrium 51 (double), homes 61..86
  { y0: 90, y1: 134, ax: 21, az: 18 },   // x 38..79, z 24..59: sky garden 91, homes 96..131
  { y0: 135, y1: 169, ax: 18, az: 16 },  // x 41..76, z 26..57: landing pad level 136, penthouses 141..166
  { y0: 170, y1: 184, ax: 14, az: 13 },  // x 45..72, z 29..54: veranda apartment 171 (double), observatory 181
];
const PODIUM = { ax: 46, az: 37, p: 8 };           // x 13..104, z 5..78 (+ the entrance wing to the lot edge)
const WING = { x0: 42, x1: 75, z0: 76 };            // entrance wing reaching the south lot edge (z 83)
const PODIUM_LEVELS = [1, 11, 16, 21, 26, 31];      // walk levels inside the podium (1 is double height)
const PLAZA = 35;                                   // podium roof / plaza slab (walk 36 = boulevard deck level)
const CORE = { x0: 52, x1: 65, z0: 36, z1: 47 };    // stair + turbolift core (all levels)
const DOOR_X = 58;                                  // both entrances: x 58..59 on the south edge

// corridor ring around the core and the apartment strips per tier (interior x-range, N/S strip z-ranges, unit splits)
const PLANS = [
  { xi: [36, 81], nz: [23, 32], sz: [51, 60], wx: [36, 48], ex: [69, 81], splits: [51, 66] },
  { xi: [39, 78], nz: [25, 32], sz: [51, 58], wx: [39, 48], ex: [69, 78], splits: [52, 65] },
  { xi: [42, 75], nz: [27, 32], sz: [51, 56], wx: [42, 48], ex: [69, 75], splits: [53, 64] },
];
const RING = { nz: [34, 35], sz: [48, 49], wx: [50, 51], ex: [66, 67] };

// ------------------------------------------------------------------------------------------------ masks
// 0 outside, 1 wall cell (inside with an outside 4-neighbour), 2 interior
const superellipse = (x, z, ax, az, p) => Math.pow(Math.abs(x + 0.5 - CX) / ax, p) + Math.pow(Math.abs(z + 0.5 - CZ) / az, p) <= 1;
function buildMask(inside) {
  const m = new Uint8Array(W * D);
  const ins = (x, z) => x >= 0 && z >= 0 && x < W && z < D && inside(x, z);
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (!ins(x, z)) continue;
    m[x * D + z] = (ins(x - 1, z) && ins(x + 1, z) && ins(x, z - 1) && ins(x, z + 1)) ? 2 : 1;
  }
  return m;
}
let MASKS = null;
function masks() {
  if (MASKS) return MASKS;
  const tiers = TIERS.map((t) => buildMask((x, z) => superellipse(x, z, t.ax, t.az, 4)));
  const podium = buildMask((x, z) => superellipse(x, z, PODIUM.ax, PODIUM.az, PODIUM.p) || (x >= WING.x0 && x <= WING.x1 && z >= WING.z0));
  MASKS = { tiers, podium };
  return MASKS;
}
const M = (m, x, z) => (x < 0 || z < 0 || x >= W || z >= D) ? 0 : m[x * D + z];
const tierOf = (y) => TIERS.findIndex((t) => y >= t.y0 && y <= t.y1 + 1);

// ------------------------------------------------------------------------------------------------ helpers
// 2-wide (or n-wide) doorway h high through a wall along x (z0 === z1) or along z, chrome jambs and a lit lintel
function doorway(bp, x0, z0, x1, z1, y, h = 3, lintel = GLOW, jamb = CHROME) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y, z0, x0 - 1, y + h, z0, jamb); bp.fill(x1 + 1, y, z0, x1 + 1, y + h, z0, jamb); bp.fill(x0, y + h, z0, x1, y + h, z0, lintel); }
  else { bp.fill(x0, y, z0 - 1, x0, y + h, z0 - 1, jamb); bp.fill(x0, y, z1 + 1, x0, y + h, z1 + 1, jamb); bp.fill(x0, y + h, z0, x0, y + h, z1, lintel); }
}
// k-th half step of a flight climbing from walk level y (odd k: slab, even k: full block), one riser block below it
function step(bp, x0, z0, x1, z1, y, k, slabId = SLAB, fullId = SMOOTH) {
  const odd = k & 1, yb = odd ? y + (k - 1) / 2 : y + k / 2 - 1;
  bp.fill(x0, yb - 1, z0, x1, yb - 1, z1, DARK);
  bp.fill(x0, yb, z0, x1, yb, z1, odd ? slabId : fullId);
}
// straight flight along z (dz = +1/-1) or x, n full blocks of rise over 2n cells starting at (x0.., z0)
function flightZ(bp, x0, x1, z0, dz, y, n, slabId, fullId) { for (let k = 1; k <= 2 * n; k++) { const z = z0 + dz * (k - 1); step(bp, x0, z, x1, z, y, k, slabId, fullId); bp.fill(x0, y + Math.ceil(k / 2), z, x1, y + Math.ceil(k / 2) + 2, z, AIR); } }
function flightX(bp, z0, z1, x0, dx, y, n, slabId, fullId) { for (let k = 1; k <= 2 * n; k++) { const x = x0 + dx * (k - 1); step(bp, x, z0, x, z1, y, k, slabId, fullId); bp.fill(x, y + Math.ceil(k / 2), z0, x, y + Math.ceil(k / 2) + 2, z1, AIR); } }
function lamp(bp, x, y, z, h = 2, id = B.LANTERN, post = B.IRON_BARS) { bp.fill(x, y, z, x, y + h - 1, z, post); bp.set(x, y + h, z, id); }
function tree(bp, x, y, z, h, leaf = B.OAK_LEAVES, log = B.OAK_LOG) {
  bp.fill(x, y, z, x, y + h - 1, z, log);
  bp.fill(x - 1, y + h - 2, z - 1, x + 1, y + h, z + 1, leaf);
  bp.set(x, y + h + 1, z, leaf); bp.set(x, y + h - 1, z, log);
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) bp.set(x + dx, y + h - 1, z + dz, leaf);
}
function planter(bp, x, y, z, leaf = B.OAK_LEAVES) { bp.set(x, y, z, DARK); bp.set(x, y + 1, z, leaf); }
// raised basin: chrome rim with water inside, standing on the floor
function basin(bp, x0, z0, x1, z1, y, rim = CHROME, fill = B.WATER) { bp.fill(x0, y, z0, x1, y, z1, rim); bp.fill(x0 + 1, y, z0 + 1, x1 - 1, y, z1 - 1, fill); }
// a parked luxury speeder pointing along +x (dir 1) or -x (-1), 7 long x 3 wide, floating on landing skids
function speeder(bp, x, y, z, dir = 1, body = B.DURASTEEL, trim = CHROME) {
  const X = (dx) => x + dx * dir;
  bp.fill(X(0), y, z - 1, X(4), y, z + 1, body);
  bp.fill(X(1), y + 1, z - 1, X(3), y + 1, z + 1, trim); bp.set(X(2), y + 1, z, GLASS); bp.set(X(3), y + 1, z, GLASS);
  bp.set(X(5), y, z, trim); bp.set(X(6), y, z, GLASS);
  bp.set(X(-1), y, z - 1, DARK); bp.set(X(-1), y, z + 1, DARK); bp.set(X(-1), y, z, BLUE);
  bp.set(X(0), y + 1, z, BLACK);
}
// furnish a walled room from the shared library (rect = interior, door on `side`), then generic dressing
const DRESS = [B.SHELF, B.BOOKSHELF, B.CRATE, B.BARREL, B.CHEST];
function dress(r, rng) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(DRESS); r.put(u, 0, r.back, id); if (id === B.SHELF || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 2) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 3 === 0) r.planter(u, v, (v & 1) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); else { r.put(u, 0, v, B.IRON_BARS); r.put(u, 1, v, B.LANTERN); } }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, mask = null, h = 4) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side, doorU, doorW, mask }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  dress(r, rng); r.ceilingLights(4); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}
// plaster wall ring around an interior rect, only on interior mask cells (the facade is already the outer wall)
function wallRing(bp, m, x0, z0, x1, z1, y, id = WHITE, h = 4) {
  for (let x = x0 - 1; x <= x1 + 1; x++) for (const z of [z0 - 1, z1 + 1]) if (M(m, x, z) === 2) bp.fill(x, y, z, x, y + h - 1, z, id);
  for (let z = z0; z <= z1; z++) for (const x of [x0 - 1, x1 + 1]) if (M(m, x, z) === 2) bp.fill(x, y, z, x, y + h - 1, z, id);
}

// ------------------------------------------------------------------------------------------------ facades
// one wall cell of a tier at floor walk level fy: chrome at the rounded corners and every fourth cell (mullions),
// plaster sill/head rows, a two-high window (warm lit, tinted glass or dark per bay)
function facade(bp, m, x, fy, z, seed, rows = 4, glassy = false) {
  const ox = !M(m, x - 1, z) || !M(m, x + 1, z), oz = !M(m, x, z - 1) || !M(m, x, z + 1);
  const s = ox && !oz ? z : x;
  if ((ox && oz) || s % 4 === 0) { bp.fill(x, fy, z, x, fy + rows - 1, z, CHROME); return; }
  const h = hash3(s >> 2, fy, ox ? 1 : 0, seed);
  const win = glassy ? GLASS : (h < 0.5 ? LIT : h < 0.85 ? GLASS : DIM);
  for (let r = 0; r < rows; r++) {
    const y = fy + r, last = r === rows - 1;
    if (glassy) bp.set(x, y, z, (r === 0 || last) ? CHROME : GLASS);
    else bp.set(x, y, z, (r === 0 || last) ? WHITE : (r % 5 === 3 ? CHROME : win));
  }
}
// floor slab + outer wall of one tier floor (walk level fy, rows of wall = clear height); interior slab patterned
function shell(bp, t, fy, seed, rows = 4, glassy = false, floorFn = null) {
  const m = t.mask;
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = t.bz0; z <= t.bz1; z++) {
    const v = m[x * D + z]; if (!v) continue;
    if (v === 1) { bp.set(x, fy - 1, z, CHROME); facade(bp, m, x, fy, z, seed, rows, glassy); }
    else bp.set(x, fy - 1, z, floorFn ? floorFn(x, z) : ((x + z) % 2 ? WHITE : SMOOTH));
  }
}
// setback terrace: the ring of the tier below that the tier above does not cover, at slab level y (walk y + 1)
function terrace(bp, below, above, y, rail = true) {
  const mb = below.mask, ma = above ? above.mask : null;
  for (let x = below.bx0; x <= below.bx1; x++) for (let z = below.bz0; z <= below.bz1; z++) {
    const v = mb[x * D + z]; if (!v || (ma && ma[x * D + z])) continue;
    bp.set(x, y, z, v === 1 ? CHROME : ((x % 3 === 0 || z % 3 === 0) ? PLATE : SMOOTH));
    bp.fill(x, y + 1, z, x, y + 4, z, AIR);
    if (rail && v === 1) bp.set(x, y + 1, z, B.IRON_BARS);
  }
}

// ------------------------------------------------------------------------------------------------ core
// x 52..65, z 36..47. Interior x 53..64 / z 37..46: flight A (x 53..54) climbs north from the south landing
// (z 44..46, full level) to the half-level north landing (z 37..38), flight B (x 63..64) climbs south back to the
// next south landing. Between the flights the turbolift block: two 2x3 cabs (x 56..57 and 60..61, z 40..42) in a
// black shaft with a chrome spine, doors to the south landing. Stair door in the south wall at x 58..59.
function coreShaft(bp, ya, yb) {
  bp.fill(CORE.x0, ya - 1, CORE.z0, CORE.x1, yb + 4, CORE.z1, STEEL);
  bp.fill(CORE.x0 + 1, ya, CORE.z0 + 1, CORE.x1 - 1, yb + 3, CORE.z1 - 1, AIR);
  bp.fill(55, ya - 1, 39, 62, yb + 4, 43, BLACK);
  bp.fill(58, ya - 1, 39, 59, yb + 4, 43, DARK);
  bp.lift(56, 40, ya, yb);
  bp.lift(60, 40, ya, yb);
}
function coreLevel(bp, y, { door = true, lifts = true, up = true, kind = 'stair_core' } = {}) {
  // south landing floor (lit inlays), flights, north half landing
  for (let x = 53; x <= 64; x++) for (let z = 44; z <= 46; z++) bp.set(x, y - 1, z, ((x + z) % 3 === 0) ? GLOW : PLATE);
  bp.fill(53, y - 1, 43, 54, y - 1, 43, DARK); bp.fill(63, y - 1, 43, 64, y - 1, 43, DARK);
  if (up) {
    for (let k = 1; k <= 5; k++) step(bp, 53, 44 - k, 54, 44 - k, y, k);
    bp.fill(53, y + 1, 37, 64, y + 1, 38, DARK); bp.fill(53, y + 2, 37, 64, y + 2, 38, SLAB);
    for (let k = 6; k <= 10; k++) step(bp, 63, 33 + k, 64, 33 + k, y, k);
    bp.set(55, y + 1, 41, BLUE); bp.set(62, y + 1, 41, BLUE);
    bp.set(58, y + 3, 36, GLOW); bp.set(59, y + 3, 36, GLOW);
  } else {
    bp.fill(53, y - 1, 37, 64, y - 1, 43, PLATE);
    bp.fill(53, y - 1, 37, 54, y - 1, 43, DARK);
  }
  if (lifts) for (const cx of [56, 60]) {
    bp.fill(cx, y, 40, cx + 1, y + 2, 42, AIR); bp.fill(cx, y, 43, cx + 1, y + 2, 43, AIR);
    bp.fill(cx, y + 3, 40, cx + 1, y + 3, 42, GLOW);
    bp.set(cx - 1, y + 2, 43, BLUE); bp.set(cx + 2, y + 2, 43, BLUE);
    bp.set(cx, y + 1, 39, BLUE); bp.set(cx + 1, y + 1, 39, BLUE);
  }
  if (door) doorway(bp, 58, 47, 59, 47, y, 3, GLOW, CHROME);
  bp.room(kind, CORE.x0, y, CORE.z0, CORE.x1, CORE.z1);
}

// ------------------------------------------------------------------------------------------------ apartments
// A one- or two-bedroom home in a Room frame (u along the door wall, v = depth). A plaster partition splits off the
// private zone at the back: bedroom on one side, bathroom on the other, both with framed doorways. The front zone
// holds the living room (sofa, low table, rug, wall screen, bookshelves, planter) and the kitchen strip with a
// dining table. Big units add a piano corner and a second bedroom.
function apartment(r, rng, luxury = false) {
  const w = r.w, d = r.d;
  const wool = rng.pick(WOOLS), wool2 = rng.pick([B.WHITE_WOOL, B.RED_WOOL]);
  const mirror = rng.chance(0.5);
  const U = (u) => (mirror ? w - 1 - u : u);
  const pv = d >= 8 ? d - 4 : d - 3;                         // partition row; private zone behind it
  const bw = Math.max(3, Math.ceil(w / 2));                  // bedroom u 0..bw-1, bathroom u bw+1..w-1
  const bedDoor = U(1), bathDoor = U(Math.min(bw + 1, w - 2));
  // partition and the bedroom/bathroom divider
  for (let u = 0; u < w; u++) {
    const uu = U(u);
    if (uu === bedDoor || uu === bathDoor) { r.put(uu, 2, pv, CHROME); r.put(uu, 3, pv, WHITE); continue; }
    r.fill(uu, 0, pv, uu, 3, pv, WHITE);
  }
  for (let v = pv + 1; v <= r.back; v++) r.fill(U(bw), 0, v, U(bw), 3, v, WHITE);
  // wall screen and shelving on the partition's living side
  r.put(U(3), 1, pv, B.HOLO_SIGN); if (w >= 9) r.put(U(4), 1, pv, B.HOLO_SIGN);
  // bedroom
  const bu = U(Math.max(1, bw - 2));
  r.bed(bu, r.back);
  r.put(U(bw - 1), 0, r.back, B.CHEST);
  r.put(U(0), 0, r.back, B.BOOKSHELF); r.put(U(0), 1, r.back, B.BOOKSHELF);
  if (r.back - pv >= 3) { r.table(U(0), pv + 1); r.seat(U(1), pv + 1); r.put(U(0), 1, pv + 1, B.SHELF); }
  else r.put(U(0), 0, r.back - 1, B.CHEST);
  for (let u = 0; u < bw; u++) if (u !== Math.max(1, bw - 2)) r.putRaw(U(u), -1, r.back - 1, wool);
  r.lantern(U(Math.floor(bw / 2)), r.back);
  // bathroom: tub, basin with a chrome mirror, towel shelf
  const b0 = bw + 1;
  r.put(U(w - 1), 0, r.back, B.TROUGH); r.put(U(w - 1), 1, r.back, CHROME);
  if (w - 1 > b0) { r.put(U(b0), 0, r.back, B.TROUGH); r.put(U(b0), 1, r.back, CHROME); }
  if (r.back - pv >= 2) { r.put(U(w - 1), 0, pv + 1, B.WHITE_WOOL); r.put(U(w - 1), 1, pv + 1, B.WHITE_WOOL); }
  for (let u = b0; u < w; u++) for (let v = pv + 1; v <= r.back; v++) r.putRaw(U(u), -1, v, (u + v) % 2 ? WHITE : B.WHITE_WOOL);
  r.putRaw(U(Math.min(b0 + 1, w - 1)), 4, r.back, GLOW);
  // living room: sofa along the side wall, low table, rug, bookshelves and a planter in the corner by the partition
  r.put(U(0), 0, 1, wool); r.put(U(0), 0, 2, wool); if (pv > 3) r.put(U(0), 0, 3, wool); r.put(U(1), 0, 1, wool);
  r.spot(U(0), 1, 'seat'); r.spot(U(0), 2, 'seat');
  r.table(U(1), 2);
  for (let v = 1; v <= Math.min(3, pv - 1); v++) for (let u = 0; u <= 2; u++) if (r.empty(U(u), -1, v) || true) r.putRaw(U(u), -1, v, (u + v) % 2 ? wool2 : WHITE);
  r.put(U(0), 0, pv - 1, B.BOOKSHELF); r.put(U(0), 1, pv - 1, B.BOOKSHELF);
  r.planter(U(1), pv - 1, rng.chance(0.5) ? B.OAK_LEAVES : B.BIRCH_LEAVES);
  // kitchen strip along the far side wall, dining table beside it
  const ku = U(w - 1);
  r.put(ku, 0, 1, BLACK); r.put(ku, 1, 1, SLAB); r.put(ku, 2, 1, B.SHELF);
  r.put(ku, 0, 2, B.FURNACE); r.put(ku, 2, 2, B.SHELF);
  if (pv - 1 >= 3) { r.put(ku, 0, 3, B.TROUGH); r.put(ku, 2, 3, B.SHELF); }
  if (pv - 1 >= 4) { r.put(ku, 0, 4, BLACK); r.put(ku, 1, 4, SLAB); }
  r.put(ku, 0, pv - 1, B.CHEST);
  if (w >= 8) { r.table(U(w - 3), 2); r.seat(U(w - 4), 2); if (pv - 1 >= 3) r.seat(U(w - 3), 3); }
  // luxury extras: piano corner, gold plinth, second bedroom's bookshelf wall
  if (luxury && w >= 11 && pv >= 4) { r.put(U(w - 5), 0, pv - 1, B.PIANO); r.seat(U(w - 5), pv - 2); }
  if (luxury) { r.put(U(w - 2), 0, pv - 1, GOLD); r.put(U(w - 2), 1, pv - 1, B.LANTERN); }
  r.lantern(U(1), 1); r.ceilingLights(3);
  r.spot(U(2), 1, 'stand');
}

// the unit rectangles of a tier plan: three in the north strip, three in the south strip, west and east units
function unitsOf(plan) {
  const [xi0, xi1] = plan.xi, [sa, sb] = plan.splits;
  return [
    { x0: xi0, x1: sa - 1, z0: plan.nz[0], z1: plan.nz[1], side: 'S', slot: 'n1' }, { x0: sa + 1, x1: sb - 1, z0: plan.nz[0], z1: plan.nz[1], side: 'S', slot: 'n2' }, { x0: sb + 1, x1: xi1, z0: plan.nz[0], z1: plan.nz[1], side: 'S', slot: 'n3' },
    { x0: xi0, x1: sa - 1, z0: plan.sz[0], z1: plan.sz[1], side: 'N', slot: 's1' }, { x0: sa + 1, x1: sb - 1, z0: plan.sz[0], z1: plan.sz[1], side: 'N', slot: 's2' }, { x0: sb + 1, x1: xi1, z0: plan.sz[0], z1: plan.sz[1], side: 'N', slot: 's3' },
    { x0: plan.wx[0], x1: plan.wx[1], z0: CORE.z0 + 1, z1: CORE.z1 - 1, side: 'E', slot: 'w' }, { x0: plan.ex[0], x1: plan.ex[1], z0: CORE.z0 + 1, z1: CORE.z1 - 1, side: 'W', slot: 'e' },
  ];
}
// door position of a unit in its corridor-facing wall (two wide, centred on the part inside the footprint)
function unitDoor(u, isIn) {
  if (u.side === 'S' || u.side === 'N') {
    const wz = u.side === 'S' ? u.z1 + 1 : u.z0 - 1, inZ = u.side === 'S' ? u.z1 : u.z0;
    let a = u.x0, b = u.x1;
    while (a < b && !isIn(a, inZ)) a++; while (b > a && !isIn(b, inZ)) b--;
    const c = Math.floor((a + b) / 2);
    return { x0: c, x1: c + 1, z0: wz, z1: wz, doorU: c - u.x0 };
  }
  const c = CORE.z0 + 5, wx = u.side === 'E' ? u.x1 + 1 : u.x0 - 1;
  return { x0: wx, x1: wx, z0: c, z1: c + 1, doorU: c - u.z0 };
}
// walls, door and a Room frame for one unit; `fill(room)` furnishes it
function unitRoom(bp, m, u, y, kind, fill) {
  const isIn = (x, z) => M(m, x, z) === 2;
  wallRing(bp, m, u.x0, u.z0, u.x1, u.z1, y);
  const dr = unitDoor(u, isIn);
  doorway(bp, dr.x0, dr.z0, dr.x1, dr.z1, y, 3, GLOW, CHROME);
  const r = new Room(bp, { x0: u.x0, z0: u.z0, x1: u.x1, z1: u.z1, y, h: 4, side: u.side, doorU: dr.doorU, doorW: 2, mask: isIn }, kind, {});
  fill(r);
  r.finalize();
  bp.room(kind, u.x0 - 1, y, u.z0 - 1, u.x1 + 1, u.z1 + 1);
  return r;
}
// ring corridor floors and lit ceilings of a tier floor
function corridors(bp, t, y, plan) {
  const m = t.mask, isIn = (x, z) => M(m, x, z) === 2, [xi0, xi1] = plan.xi;
  const corr = (x0, z0, x1, z1) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (isIn(x, z)) {
      bp.set(x, y - 1, z, ((x + z) % 4 === 0) ? BLACK : ((x + z) % 2 ? PLATE : SMOOTH));
      if ((x % 3 === 0) && (z % 2 === 0)) bp.set(x, y + 4, z, GLOW);
    }
  };
  corr(xi0, RING.nz[0], xi1, RING.nz[1]); corr(xi0, RING.sz[0], xi1, RING.sz[1]);
  corr(RING.wx[0], CORE.z0, RING.wx[1], CORE.z1); corr(RING.ex[0], CORE.z0, RING.ex[1], CORE.z1);
  // lift lobby dressing: directory holo signs on the core wall, planters and benches in the corridor corners
  bp.set(56, y + 1, CORE.z1, B.HOLO_SIGN); bp.set(61, y + 1, CORE.z1, B.HOLO_SIGN);
  for (const x of [RING.wx[0], RING.ex[1]]) { planter(bp, x, y, RING.sz[1], B.SPRUCE_LEAVES); planter(bp, x, y, RING.nz[0], B.OAK_LEAVES); }
  for (const x of [CORE.x0 - 4, CORE.x1 + 4]) if (isIn(x, RING.sz[1])) { bp.set(x, y, RING.sz[1], SEAT); bp.spot(x, y, RING.sz[1], 'seat'); }
}
// the outer wall cell where a ring corridor row meets the facade on the west or east side
function corridorEnd(m, z, west) {
  for (let x = west ? 0 : W - 1; west ? x < W : x >= 0; x += west ? 1 : -1) if (M(m, x, z) === 1) return x;
  return -1;
}
// corridor ends: glass to the view, or doors onto the setback terrace of the tier's first floor
function corridorEnds(bp, t, y, doors) {
  const m = t.mask;
  for (const [za, zb] of [RING.nz, RING.sz]) for (const west of [true, false]) {
    const x = corridorEnd(m, za, west);
    if (x < 0) continue;
    if (doors) doorway(bp, x, za, x, zb, y, 3, GLOW, CHROME);
    else bp.fill(x, y + 1, za, x, y + 2, zb, GLASS);
  }
}

// residential floor: ring corridor, apartments in the four strips (slots may be replaced by library templates)
function homesFloor(bp, t, y, plan, rng, { luxury = false, slots = {}, terraceDoors = false } = {}) {
  const m = t.mask;
  corridors(bp, t, y, plan);
  for (const u of unitsOf(plan)) {
    const special = slots[u.slot];
    if (special) unitRoom(bp, m, u, y, special, (r) => { (ROOMS[special] || ROOMS.lounge).fn(r, rng, {}); dress(r, rng); r.ceilingLights(4); });
    else unitRoom(bp, m, u, y, luxury ? 'penthouse' : 'apartment', (r) => apartment(r, rng, luxury));
  }
  corridorEnds(bp, t, y, terraceDoors);
}

// ------------------------------------------------------------------------------------------------ signature levels
function statue(bp, x, y, z, h = 4) { bp.fill(x, y, z, x, y + 1, z, SMOOTH); bp.fill(x, y + 2, z, x, y + 1 + h, z, GOLD); bp.set(x, y + 2 + h, z, SMOOTH); bp.set(x, y + 3 + h, z, GLOW); }
function chandelier(bp, x, y, z) { bp.set(x, y, z, CHROME); bp.set(x, y - 1, z, GLOW); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) bp.set(x + dx, y - 1, z + dz, B.LANTERN); }
function lounger(bp, x, y, z, dir = 1) { bp.set(x, y, z, SLAB); bp.set(x + dir, y, z, B.WHITE_WOOL); bp.spot(x, y, z, 'seat'); }
function sofaGroup(bp, x, y, z, wool, alongX = true) {
  if (alongX) { bp.fill(x, y, z, x + 2, y, z, wool); bp.set(x + 1, y, z + 1, B.TABLE); bp.set(x, y, z + 2, SEAT); bp.set(x + 2, y, z + 2, SEAT); bp.spot(x, y, z, 'seat'); bp.spot(x + 2, y, z, 'seat'); bp.spot(x, y, z + 2, 'seat'); }
  else { bp.fill(x, y, z, x, y, z + 2, wool); bp.set(x + 1, y, z + 1, B.TABLE); bp.set(x + 2, y, z, SEAT); bp.set(x + 2, y, z + 2, SEAT); bp.spot(x, y, z, 'seat'); bp.spot(x, y, z + 2, 'seat'); bp.spot(x + 2, y, z, 'seat'); }
}
const curtain = (y, s, y0, y1) => (y === y0 || y === y1 || y === y0 + 4 || s % 4 === 0) ? CHROME : GLASS;

// grand security lobby: the double-height base of the tower plus the entrance wing to the boulevard door, with the
// checkpoint, reception, lounges, fountains, statues, trees, and a mezzanine cafe over the concierge rooms
function lobby(bp, rng, seed) {
  const t = TIERS[0], m = t.mask, y = 36, top = 44;
  const isIn = (x, z) => M(m, x, z) === 2;
  shell(bp, t, y, seed, 9, true);
  // the wing: carve the tier wall inside it, glass walls with chrome mullions, roof at 45 (the pool terrace)
  for (let x = WING.x0; x <= WING.x1; x++) for (let z = 61; z <= D - 1; z++) {
    const inner = x > WING.x0 && x < WING.x1 && z < D - 1;
    if (inner) { if (M(m, x, z)) bp.fill(x, y, z, x, top, z, AIR); if (!isIn(x, z)) bp.set(x, y - 1, z, 0); }
    if (M(m, x, z)) continue;
    if (inner) { bp.set(x, top + 1, z, (x % 3 === 0 || z % 3 === 0) ? PLATE : SMOOTH); continue; }
    for (let yy = y; yy <= top; yy++) bp.set(x, yy, z, curtain(yy, z === D - 1 ? x : z, y, top));
    bp.set(x, y - 1, z, CHROME); bp.set(x, top + 1, z, CHROME); bp.set(x, top + 2, z, B.IRON_BARS);
  }
  // lobby floor: rings around the core, lit inlays, red carpet with gold edges from the door to the turbolifts
  for (let x = t.bx0; x <= WING.x1; x++) for (let z = t.bz0; z <= D - 2; z++) {
    if (!(isIn(x, z) || (x > WING.x0 && x < WING.x1 && z >= 61))) continue;
    const d = Math.max(Math.abs(x + 0.5 - CX), Math.abs(z + 0.5 - CZ));
    let id = (x + z) % 2 ? WHITE : SMOOTH;
    if (Math.floor(d) % 5 === 0) id = BLACK; else if (x % 6 === 0 && z % 6 === 0) id = GLOW;
    if (z >= CORE.z1 + 1 && x >= 56 && x <= 61) id = (x === 56 || x === 61) ? GOLD : B.RED_WOOL;
    bp.set(x, y - 1, z, id);
  }
  // portal on the lot edge: 6 wide, 5 high, chrome jambs, lit lintel, holo name above
  bp.fill(56, y, D - 1, 61, y + 4, D - 1, AIR);
  bp.fill(55, y, D - 1, 55, y + 6, D - 1, CHROME); bp.fill(62, y, D - 1, 62, y + 6, D - 1, CHROME);
  bp.fill(56, y + 5, D - 1, 61, y + 5, D - 1, GLOW); bp.fill(57, y + 6, D - 1, 60, y + 7, D - 1, B.HOLO_SIGN);
  bp.door(DOOR_X, y, D - 1, 'S');
  // doors to the plaza from the wing (west/east) and from the hall
  doorway(bp, WING.x0, 70, WING.x0, 71, y, 3); doorway(bp, WING.x1, 70, WING.x1, 71, y, 3);
  doorway(bp, corridorEnd(m, 41, true), 41, corridorEnd(m, 41, true), 42, y, 3); doorway(bp, corridorEnd(m, 41, false), 41, corridorEnd(m, 41, false), 42, y, 3);
  // security checkpoint: scanner arch over the carpet, guard desks with consoles, striped pylons, holo notices
  for (const x of [55, 62]) { bp.fill(x, y, 78, x, y + 2, 78, B.PANEL_STRIPE); bp.set(x, y + 3, 78, BLUE); }
  bp.fill(56, y + 4, 78, 61, y + 4, 78, GLOW); bp.fill(55, y + 4, 78, 55, y + 4, 78, CHROME); bp.fill(62, y + 4, 78, 62, y + 4, 78, CHROME);
  for (const x of [50, 66]) { bp.fill(x, y, 77, x + 1, y, 79, BLACK); bp.fill(x, y + 1, 77, x + 1, y + 1, 79, SLAB); bp.set(x, y + 1, 78, B.CONSOLE); bp.set(x + 1, y + 1, 78, B.CONSOLE); bp.work(x + (x < CX ? 2 : -1), y, 78, 'guard'); bp.set(x + (x < CX ? -1 : 2), y, 78, B.IRON_BLOCK); bp.set(x + (x < CX ? -1 : 2), y + 1, 78, B.IRON_BARS); }
  bp.set(WING.x0 + 1, y + 2, 79, B.HOLO_SIGN); bp.set(WING.x1 - 1, y + 2, 79, B.HOLO_SIGN);
  // reception: long counter with consoles, hanging holo sign, receptionists, planters at both ends
  bp.fill(51, y, 67, 66, y, 67, BLACK); bp.fill(51, y + 1, 67, 66, y + 1, 67, SLAB);
  for (const x of [53, 58, 59, 64]) bp.set(x, y + 1, 67, B.CONSOLE);
  bp.work(55, y, 66, 'receptionist'); bp.work(62, y, 66, 'receptionist');
  for (const x of [55, 62]) bp.fill(x, y + 5, 67, x, top, 67, CHROME);
  bp.fill(56, y + 5, 67, 61, y + 5, 67, B.HOLO_SIGN); bp.fill(56, y + 4, 67, 61, y + 4, 67, GLOW);
  planter(bp, 50, y, 67, B.BIRCH_LEAVES); planter(bp, 67, y, 67, B.BIRCH_LEAVES);
  // waiting lounges in both halves of the wing
  for (const z of [63, 69, 75]) { sofaGroup(bp, 44, y, z, z === 69 ? B.RED_WOOL : B.WHITE_WOOL); sofaGroup(bp, 70, y, z, z === 69 ? B.RED_WOOL : B.WHITE_WOOL); }
  for (const z of [62, 74]) { lamp(bp, 48, y, z, 2); lamp(bp, 69, y, z, 2); }
  for (const z of [66, 72]) { planter(bp, 43, y, z, B.OAK_LEAVES); planter(bp, 74, y, z, B.OAK_LEAVES); }
  // hall: statues at the core corners, fountains west and east, trees, chandeliers, lit core face with directory
  for (const [x, z] of [[49, 33], [68, 33], [49, 50], [68, 50]]) statue(bp, x, y, z);
  for (const x0 of [39, 73]) {
    basin(bp, x0, 38, x0 + 6, 46, y); bp.fill(x0 + 1, y - 1, 39, x0 + 5, y - 1, 45, BLUE);
    bp.fill(x0 + 3, y + 1, 42, x0 + 3, y + 2, 42, CLEAR); bp.set(x0 + 3, y + 3, 42, GLOW); bp.set(x0 + 3, y, 42, CHROME);
    for (const dz of [-6, 6]) { bp.set(x0 + 3, y, 42 + dz, SEAT); bp.spot(x0 + 3, y, 42 + dz, 'seat'); }
  }
  for (const [x, z] of [[41, 28], [76, 28], [41, 56], [76, 56], [46, 24], [71, 24]]) if (isIn(x, z)) { bp.fill(x - 1, y, z - 1, x + 1, y, z + 1, DARK); bp.set(x, y, z, B.GRASS); tree(bp, x, y + 1, z, 4, (x + z) % 2 ? B.OAK_LEAVES : B.BIRCH_LEAVES); }
  for (const [x, z] of [[46, 42], [71, 42], [58, 56], [59, 56], [58, 73], [59, 73]]) chandelier(bp, x, top, z);
  for (const x of [53, 54, 63, 64]) bp.fill(x, y + 1, CORE.z1, x, y + 7, CORE.z1, (x === 54 || x === 63) ? BLUE : STEEL);
  bp.fill(56, y + 4, CORE.z1, 57, y + 5, CORE.z1, B.HOLO_SIGN); bp.fill(60, y + 4, CORE.z1, 61, y + 5, CORE.z1, B.HOLO_SIGN);
  bp.fill(CORE.x0, y + 8, CORE.z0 - 1, CORE.x1, y + 8, CORE.z0 - 1, GLOW); bp.fill(CORE.x0, y + 8, CORE.z1 + 1, CORE.x1, y + 8, CORE.z1 + 1, GLOW);
  bp.fill(CORE.x0 - 1, y + 8, CORE.z0, CORE.x0 - 1, y + 8, CORE.z1, GLOW); bp.fill(CORE.x1 + 1, y + 8, CORE.z0, CORE.x1 + 1, y + 8, CORE.z1, GLOW);
  for (let x = t.bx0; x <= t.bx1; x += 6) for (const z of [t.bz0 + 8, t.bz1 - 8]) if (isIn(x, z) && Math.abs(x + 0.5 - CX) > 8) bp.set(x, top + 1, z, GLOW);
  bp.spot(58, y, 60, 'stand'); bp.spot(59, y, 75, 'stand');
  // concierge rooms under the mezzanine (north band) and the mezzanine cafe above them with two stairs
  const zb0 = 24, zb1 = 29;
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = zb0; z <= zb1 + 1; z++) if (isIn(x, z)) { bp.set(x, y + 4, z, (x + z) % 2 ? PLATE : SMOOTH); if (z === zb1 + 1) bp.fill(x, y, z, x, y + 3, z, WHITE); }
  for (const x of [49, 68]) if (isIn(x, zb0)) bp.fill(x, y, zb0, x, y + 3, zb1, WHITE);
  template(bp, rng, 'security_post', 'security_office', 37, zb0, 48, zb1, y, 'S', 5, 2, isIn);
  template(bp, rng, 'lounge', 'residents_lounge', 50, zb0, 67, zb1, y, 'S', 8, 2, isIn);
  template(bp, rng, 'executive_office', 'concierge_office', 69, zb0, 80, zb1, y, 'S', 5, 2, isIn);
  doorway(bp, 42, zb1 + 1, 43, zb1 + 1, y, 3); doorway(bp, 58, zb1 + 1, 59, zb1 + 1, y, 3); doorway(bp, 74, zb1 + 1, 75, zb1 + 1, y, 3);
  for (let x = t.bx0; x <= t.bx1; x++) if (isIn(x, zb1 + 1)) bp.set(x, y + 5, zb1 + 1, B.IRON_BARS);
  flightZ(bp, 37, 38, 40, -1, y, 5); flightZ(bp, 79, 80, 40, -1, y, 5);
  for (const x of [37, 38, 79, 80]) bp.set(x, y + 5, 31, AIR);
  const my = y + 5;
  bp.fill(52, my, 25, 65, my, 25, BLACK); bp.fill(52, my + 1, 25, 65, my + 1, 25, SLAB);
  for (let x = 52; x <= 65; x++) if (isIn(x, 24)) { bp.set(x, my, 24, B.SHELF); bp.set(x, my + 1, 24, x % 3 ? B.SHELF : GLOW); }
  bp.set(55, my + 1, 25, B.CONSOLE); bp.set(62, my + 1, 25, B.CONSOLE); bp.work(58, my, 24, 'bartender');
  for (let x = 40; x <= 78; x += 4) for (const z of [27, 29]) if (isIn(x, z) && isIn(x + 1, z)) { if (z === 27) { bp.set(x, my, z, B.TABLE); bp.set(x + 1, my, z, SEAT); bp.spot(x + 1, my, z, 'seat'); } else { bp.set(x, my, z, SEAT); bp.set(x + 1, my, z, B.TABLE); bp.spot(x, my, z, 'seat'); } }
  for (const x of [39, 78]) { planter(bp, x, my, 26, B.SPRUCE_LEAVES); planter(bp, x, my, 29, B.SPRUCE_LEAVES); }
  for (let x = 42; x <= 76; x += 6) { bp.set(x, top, 27, B.LANTERN); }
  bp.room('security_lobby', WING.x0, y, 61, WING.x1, D - 1);
  bp.room('grand_lobby', t.bx0, y, 31, t.bx1, t.bz1);
  bp.room('mezzanine_cafe', t.bx0, my, 23, t.bx1, zb1 + 1);
}

// spa level: tinted-glass walls, the lap pool and a round plunge pool on the south side with loungers and a juice
// bar, treatment rooms along the north corridor (sauna, massage, steam room), gym and changing rooms west and east,
// the pool terrace on the wing roof
function spa(bp, rng, seed) {
  const t = TIERS[0], m = t.mask, y = 46, plan = PLANS[0];
  const isIn = (x, z) => M(m, x, z) === 2;
  shell(bp, t, y, seed, 4, true, (x, z) => ((x + z) % 3 === 0 ? CHROME : ((x + z) % 2 ? WHITE : SMOOTH)));
  corridors(bp, t, y, plan);
  // pool hall: the south strip opened up, lap pool with blue lit floor, plunge pool, loungers, palms, bar
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = 48; z <= 60; z++) if (isIn(x, z)) { bp.set(x, y - 1, z, (x + z) % 2 ? B.WHITE_WOOL : WHITE); if (x % 4 === 0 && z % 4 === 0) bp.set(x, y + 4, z, GLOW); }
  basin(bp, 44, 53, 73, 58, y); bp.fill(45, y - 1, 54, 72, y - 1, 57, BLUE);
  for (let x = 47; x <= 70; x += 3) bp.set(x, y, 53, SLAB);
  basin(bp, 38, 51, 42, 55, y); bp.fill(39, y - 1, 52, 41, y - 1, 54, BLUE); bp.set(40, y, 53, CHROME);
  for (let x = 45; x <= 72; x += 3) lounger(bp, x, y, 51, 0 === 0 ? 0 : 1);
  for (let x = 45; x <= 72; x += 3) { bp.set(x, y, 51, SLAB); bp.set(x, y, 50, B.WHITE_WOOL); bp.spot(x, y, 51, 'seat'); }
  for (const [x, z] of [[40, 58], [76, 58], [45, 60], [72, 60]]) if (isIn(x, z)) { planter(bp, x, y, z, B.OAK_LEAVES); bp.set(x, y + 2, z, B.OAK_LEAVES); }
  bp.fill(75, y, 51, 79, y, 51, BLACK); bp.fill(75, y + 1, 51, 79, y + 1, 51, SLAB); bp.fill(78, y, 52, 79, y + 1, 52, B.SHELF); bp.work(77, y, 52, 'bartender');
  for (const x of [75, 76]) { bp.set(x, y, 50, SEAT); bp.spot(x, y, 50, 'seat'); }
  for (const [x, z] of [[43, 59], [74, 59]]) lamp(bp, x, y, z, 2);
  bp.room('pool_hall', t.bx0, y, 48, t.bx1, t.bz1);
  // treatment rooms in the north strip
  const units = unitsOf(plan);
  unitRoom(bp, m, units[0], y, 'sauna', (r) => {
    for (let u = 0; u < r.w; u++) for (let v = 1; v <= r.back; v++) r.putRaw(u, -1, v, B.SPRUCE_PLANKS);
    for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SPRUCE_SLAB); r.put(u, 1, r.back, B.SPRUCE_PLANKS); r.put(u, 2, r.back, B.SPRUCE_SLAB_TOP); if (u % 3 === 1) r.spot(u, r.back, 'seat'); }
    for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.SPRUCE_SLAB); r.put(r.w - 1, 0, v, B.SPRUCE_SLAB); }
    r.put(r.cu, 0, 2, B.IRON_BARS); r.put(r.cu, 1, 2, B.MAGMA); r.put(r.cu + 1, 0, 2, B.IRON_BARS); r.put(r.cu + 1, 1, 2, B.MAGMA);
    r.put(1, 0, 1, B.BARREL); r.put(r.w - 2, 0, 1, B.WHITE_WOOL); r.lantern(1, r.back - 1); r.lantern(r.w - 2, r.back - 1);
  });
  unitRoom(bp, m, units[1], y, 'treatment_room', (r) => {
    for (let u = 1; u < r.w - 1; u += 3) { r.bed(u, r.back); r.put(u + 1, 0, r.back, B.CHEST); r.put(u + 1, 1, r.back, B.SHELF); }
    for (let u = 0; u < r.w; u += 2) { r.put(u, 0, 2, B.TROUGH); r.put(u, 1, 2, CHROME); }
    r.planter(0, r.back - 1, B.BIRCH_LEAVES); r.planter(r.w - 1, r.back - 1, B.BIRCH_LEAVES); r.work(r.cu, r.back - 2, 'masseur');
    r.putRaw(r.cu, 4, 2, GLOW); r.lantern(1, 1); r.lantern(r.w - 2, 1);
  });
  unitRoom(bp, m, units[2], y, 'steam_room', (r) => {
    for (let u = 0; u < r.w; u++) for (let v = 1; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 2 ? B.WHITE_WOOL : SMOOTH);
    for (let u = 1; u < r.w - 1; u += 2) { r.put(u, 0, r.back, SEAT); r.spot(u, r.back, 'seat'); }
    r.fill(2, 0, r.back - 2, r.w - 3, 0, r.back - 2, CHROME); r.fill(3, 0, r.back - 2, r.w - 4, 0, r.back - 2, B.WATER);
    for (let u = 0; u < r.w; u += 3) { r.put(u, 2, 2, CHROME); r.put(u, 1, 2, B.IRON_BARS); r.put(u, 0, 2, B.TROUGH); }
    r.put(0, 0, r.back, B.BARREL); r.put(r.w - 1, 0, r.back, B.WHITE_WOOL); r.put(r.w - 1, 1, r.back, B.WHITE_WOOL);
    r.putRaw(r.cu, 4, r.back - 1, BLUE); r.lantern(1, 1);
  });
  unitRoom(bp, m, units[6], y, 'gym', (r) => { ROOMS.gym.fn(r, rng, {}); dress(r, rng); r.ceilingLights(4); });
  unitRoom(bp, m, units[7], y, 'changing_room', (r) => { ROOMS.dressing_room.fn(r, rng, {}); for (let v = 2; v < r.back; v += 2) r.put(r.w - 1, 0, v, B.CHEST); r.ceilingLights(4); });
  // pool terrace on the wing roof: door from the pool hall, loungers, planters, lamps, a canopy bar
  doorway(bp, 57, 61, 60, 61, y, 3);
  for (let x = WING.x0 + 1; x <= WING.x1 - 1; x += 4) for (const z of [66, 74]) lounger(bp, x, y, z, 1);
  for (let x = WING.x0 + 2; x <= WING.x1 - 2; x += 5) { planter(bp, x, y, 80, B.OAK_LEAVES); planter(bp, x, y, 63, B.SPRUCE_LEAVES); }
  for (const [x, z] of [[WING.x0 + 1, 82], [WING.x1 - 1, 82], [WING.x0 + 1, 63], [WING.x1 - 1, 63]]) lamp(bp, x, y, z, 3, B.CITY_LAMP);
  bp.fill(54, y, 78, 63, y, 78, BLACK); bp.fill(54, y + 1, 78, 63, y + 1, 78, SLAB); bp.set(58, y + 1, 78, B.CONSOLE); bp.work(59, y, 79, 'bartender');
  for (const x of [54, 63]) bp.fill(x, y, 79, x, y + 3, 79, CHROME); bp.fill(54, y + 4, 77, 63, y + 4, 80, PLATE); bp.fill(55, y + 3, 78, 62, y + 3, 78, GLOW);
  basin(bp, 45, 68, 50, 73, y); bp.fill(46, y - 1, 69, 49, y - 1, 72, BLUE);
  bp.room('pool_terrace', WING.x0, y, 61, WING.x1, D - 1);
  corridorEnds(bp, t, y, false);
}

// garden atrium: a double-height conservatory with lawns, trees, flower beds, a pond and a pergola in the south
// garden and the west/east courts; greenhouses in the north strip on both levels; a railed gallery ring around the
// core at level 56 bridging to stairs down at both ends
function gardens(bp, rng, seed) {
  const t = TIERS[0], m = t.mask, y = 51, plan = PLANS[0], gy = 56;
  const isIn = (x, z) => M(m, x, z) === 2;
  shell(bp, t, y, seed, 9, true);
  const inGarden = (x, z) => isIn(x, z) && z >= 34 && !(x >= CORE.x0 && x <= CORE.x1 && z >= CORE.z0 && z <= CORE.z1);
  const path = (x, z) => (z >= 48 && z <= 49) || (z >= 34 && z <= 35) || ((x === 50 || x === 51 || x === 66 || x === 67) && z <= 47) || (x === 58 || x === 59) || (z === 57 && x % 2 === 0);
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = 34; z <= t.bz1; z++) {
    if (!inGarden(x, z)) continue;
    if (path(x, z)) { bp.set(x, y - 1, z, ((x + z) % 3 === 0) ? PLATE : SMOOTH); continue; }
    bp.set(x, y - 1, z, B.GRASS);
    const h = hash3(x, y, z, seed);
    if (h < 0.18) bp.set(x, y, z, B.TALL_GRASS); else if (h < 0.26) bp.set(x, y, z, B.POPPY); else if (h < 0.34) bp.set(x, y, z, B.DANDELION);
  }
  // trees, hedges, benches, lamps, pond, pergola
  for (const [x, z, h] of [[40, 56, 5], [77, 56, 5], [47, 58, 4], [70, 58, 4], [40, 39, 6], [77, 39, 6], [44, 45, 4], [73, 45, 4], [63, 55, 5], [54, 55, 5]]) if (inGarden(x, z)) tree(bp, x, y, z, h, [B.OAK_LEAVES, B.BIRCH_LEAVES, B.SPRUCE_LEAVES][(x + z) % 3], [B.OAK_LOG, B.BIRCH_LOG, B.SPRUCE_LOG][(x + z) % 3]);
  for (let x = 41; x <= 76; x += 2) if (inGarden(x, 52) && x !== 58 && x !== 59) { bp.set(x, y, 52, B.OAK_LEAVES); }
  for (let x = 42; x <= 76; x += 6) if (inGarden(x, 50)) { bp.set(x, y, 50, SEAT); bp.spot(x, y, 50, 'seat'); }
  for (const [x, z] of [[46, 47], [71, 47], [44, 36], [73, 36], [42, 59], [75, 59], [56, 59], [61, 59]]) if (inGarden(x, z)) lamp(bp, x, y, z, 2, B.LANTERN);
  basin(bp, 61, 53, 66, 57, y); bp.fill(62, y - 1, 54, 65, y - 1, 56, BLUE); bp.set(63, y, 53, B.WATER); bp.set(64, y + 1, 55, B.LANTERN);
  const px = 46, pz = 54;
  for (const [dx, dz] of [[0, 0], [4, 0], [0, 3], [4, 3]]) bp.fill(px + dx, y, pz + dz, px + dx, y + 2, pz + dz, B.OAK_FENCE);
  bp.fill(px, y + 3, pz, px + 4, y + 3, pz + 3, B.OAK_SLAB);
  bp.set(px + 2, y, pz + 1, B.TABLE); bp.set(px + 1, y, pz + 1, SEAT); bp.set(px + 3, y, pz + 1, SEAT); bp.spot(px + 1, y, pz + 1, 'seat'); bp.spot(px + 3, y, pz + 1, 'seat');
  for (let x = 37; x <= 48; x += 3) for (const z of [38, 44]) if (inGarden(x, z) && (x + z) % 2) { bp.set(x, y, z, B.DURASTEEL_DARK); bp.set(x, y + 1, z, B.SPRUCE_LEAVES); }
  for (let x = 69; x <= 80; x += 3) for (const z of [38, 44]) if (inGarden(x, z) && (x + z) % 2) { bp.set(x, y, z, B.DURASTEEL_DARK); bp.set(x, y + 1, z, B.OAK_LEAVES); }
  for (const x of [43, 74]) { bp.set(x, y, 41, SEAT); bp.spot(x, y, 41, 'seat'); }
  // greenhouses in the north strip at both levels, doors to the north corridor / north gallery
  const units = unitsOf(plan);
  for (const lvl of [y, gy]) {
    if (lvl === gy) for (let x = t.bx0; x <= t.bx1; x++) for (let z = plan.nz[0]; z <= plan.nz[1] + 1; z++) if (isIn(x, z)) bp.set(x, lvl - 1, z, (x + z) % 2 ? WHITE : SMOOTH);
    for (let i = 0; i < 3; i++) unitRoom(bp, m, units[i], lvl, lvl === y ? 'greenhouse' : 'garden_terrace', (r) => { ROOMS[lvl === y ? 'greenhouse' : 'garden_terrace'].fn(r, rng, {}); r.ceilingLights(4); });
  }
  // gallery ring at 56: north gallery over the north corridor, west/east galleries beside the core, south bridge
  const gallery = (x0, z0, x1, z1) => { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (isIn(x, z)) bp.set(x, gy - 1, z, ((x + z) % 3 === 0) ? PLATE : SMOOTH); };
  gallery(t.bx0, RING.nz[0], t.bx1, RING.nz[1]); gallery(t.bx0, RING.sz[0], t.bx1, RING.sz[1]);
  gallery(RING.wx[0], CORE.z0, RING.wx[1], CORE.z1); gallery(RING.ex[0], CORE.z0, RING.ex[1], CORE.z1);
  for (let x = t.bx0; x <= t.bx1; x++) { if (isIn(x, RING.sz[1] + 1)) bp.set(x, gy, RING.sz[1] + 1, B.IRON_BARS); if (isIn(x, RING.sz[0] - 1) && (x < RING.wx[0] || x > RING.ex[1])) bp.set(x, gy, RING.sz[0] - 1, B.IRON_BARS); if (isIn(x, RING.nz[1] + 1) && (x < RING.wx[0] || x > RING.ex[1])) bp.set(x, gy, RING.nz[1] + 1, B.IRON_BARS); }
  for (let z = CORE.z0; z <= CORE.z1; z++) { bp.set(RING.wx[0] - 1, gy, z, B.IRON_BARS); bp.set(RING.ex[1] + 1, gy, z, B.IRON_BARS); }
  for (const x of [RING.wx[0] - 1, RING.ex[1] + 1]) for (const z of [RING.sz[0] - 1, RING.nz[1] + 1]) bp.set(x, gy, z, B.IRON_BARS);
  for (const x of [37, 38, 79, 80]) { bp.set(x, gy, RING.sz[1] + 1, AIR); }
  flightZ(bp, 40, 41, 59, -1, y, 5); flightZ(bp, 76, 77, 59, -1, y, 5);
  for (const x of [40, 41, 76, 77]) { bp.set(x, gy, 50, AIR); }
  for (let x = 42; x <= 75; x += 3) if (isIn(x, 48)) { bp.set(x, gy, 48, B.DURASTEEL_DARK); bp.set(x, gy + 1, 48, (x % 2) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); }
  for (const x of [45, 72]) { bp.set(x, gy, 49, SEAT); bp.spot(x, gy, 49, 'seat'); }
  for (const x of [50, 67]) { bp.set(x, gy + 3, 35, GLOW); bp.set(x, gy + 3, 48, GLOW); }
  for (let x = t.bx0 + 2; x <= t.bx1; x += 5) for (const z of [35, 49]) if (isIn(x, z)) bp.set(x, y + 8, z, GLOW);
  for (let x = t.bx0; x <= t.bx1; x += 4) for (const z of [40, 44, 56]) if (inGarden(x, z) && !path(x, z)) bp.set(x, y + 8, z, GLOW);
  bp.room('garden_atrium', t.bx0, y, 48, t.bx1, t.bz1);
  bp.room('garden_court_w', t.bx0, y, CORE.z0 - 1, RING.wx[0], CORE.z1 + 1);
  bp.room('garden_court_e', RING.ex[1], y, CORE.z0 - 1, t.bx1, CORE.z1 + 1);
  bp.room('garden_gallery', t.bx0, gy, RING.sz[0] - 1, t.bx1, RING.sz[1] + 1);
  corridorEnds(bp, t, y, false);
}

// setback terrace dressing (walk level y): planters and lamps along the railing, benches
function terraceDressing(bp, below, above, y) {
  const mb = below.mask, ma = above.mask;
  let k = 0;
  for (let x = below.bx0; x <= below.bx1; x++) for (let z = below.bz0; z <= below.bz1; z++) {
    if (mb[x * D + z] !== 2 || ma[x * D + z]) continue;
    const edge = M(mb, x - 1, z) === 1 || M(mb, x + 1, z) === 1 || M(mb, x, z - 1) === 1 || M(mb, x, z + 1) === 1;
    if (!edge) continue;
    k++;
    if (k % 7 === 0) planter(bp, x, y, z, (k % 2) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
    else if (k % 7 === 3) lamp(bp, x, y, z, 2, B.CITY_LAMP);
  }
}

// landing pad: a disc at slab level y (walk y + 1) centred on (cx, cz), chrome rim with blue edge lights, lit ring
// and cross markings, lamp posts, struts back to the tower wall at x = wallX
function landingPad(bp, cx, cz, r, y, wallX) {
  for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r + 1); z++) {
    const q = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (q > r) continue;
    let id = PLATE;
    if (q > r - 1) id = CHROME; else if (Math.abs(q - (r - 2.5)) < 0.5) id = GLOW; else if ((x === Math.floor(cx) || z === Math.floor(cz)) && q < r - 3) id = GLOW; else if ((x + z) % 3 === 0) id = DARK;
    bp.set(x, y, z, id);
    bp.fill(x, y + 1, z, x, y + 6, z, AIR);
    if (q > r - 1 && (x + z) % 3 === 0) bp.set(x, y + 1, z, BLUE);
    if (q > r - 1) bp.set(x, y - 1, z, DARK);
  }
  const dir = wallX < cx ? -1 : 1;                       // toward the tower
  for (const dz of [-3, 0, 3]) {
    for (let k = 0; k <= Math.abs(Math.round(cx) - wallX) + 2; k++) {
      const x = Math.round(cx) + dir * k, yy = y - 1 - Math.floor(k * 0.8);
      if (yy < y - 14) break;
      bp.set(x, yy, Math.round(cz) + dz, k % 4 === 0 ? CHROME : DARK);
    }
  }
  bp.fill(wallX + (dir > 0 ? -1 : 1) * 0, y, Math.round(cz) - 2, Math.round(cx) - dir * (r - 1), y, Math.round(cz) + 2, PLATE);
  for (const [dx, dz] of [[-r + 1.5, -r + 1.5], [r - 2.5, -r + 1.5], [-r + 1.5, r - 2.5], [r - 2.5, r - 2.5]]) lamp(bp, Math.round(cx + dx), y + 1, Math.round(cz + dz), 3, B.CITY_LAMP);
}

// landing pad level (first floor of tier 3): lounges west and east, homes north and south, doors onto the terrace
// ring, two pads cantilevered west and east with a bridge from the terrace
function padLevel(bp, rng, seed) {
  const t = TIERS[2], y = 136;
  shell(bp, t, y, seed);
  homesFloor(bp, t, y, PLANS[2], rng, { luxury: true, slots: { w: 'lounge', e: 'lounge' }, terraceDoors: true });
  terraceDressing(bp, TIERS[1], t, y);
  landingPad(bp, 30, CZ, 7.5, y - 1, TIERS[1].bx0 + 1);
  landingPad(bp, 88, CZ, 7.5, y - 1, TIERS[1].bx1 - 1);
  // the terrace railing opens onto the bridges
  for (const x of [TIERS[1].bx0, TIERS[1].bx1]) for (let z = CZ - 2; z <= CZ + 2; z++) if (M(TIERS[1].mask, x, z) === 1) { bp.set(x, y, z, PLATE); bp.set(x, y - 1, z, PLATE); }
  speeder(bp, 84, y, CZ + 3, -1, B.CHROME, B.DURASTEEL_DARK);
  speeder(bp, 33, y, CZ - 3, 1, B.DURASTEEL, B.CHROME);
  bp.spot(28, y, CZ + 4, 'stand'); bp.work(90, y, CZ - 4, 'pilot');
  bp.room('landing_pad_w', 22, y, CZ - 8, 37, CZ + 8);
  bp.room('landing_pad_e', 80, y, CZ - 8, 95, CZ + 8);
  bp.room('sky_terrace_w', TIERS[1].bx0, y, CZ - 8, t.bx0, CZ + 8);
  bp.room('sky_terrace_e', t.bx1, y, CZ - 8, TIERS[1].bx1, CZ + 8);
}

// the veranda apartment: the whole top tier. Double-height living room behind the curved glass south wall, a gallery
// at 176 over its inner half, kitchen and dining west, study and piano lounge east, art hall north; bedrooms, baths
// and a gym upstairs; the veranda terrace around the tier with the open balcony to the south and the private
// landing pad bridged from the east side
function veranda(bp, rng, seed) {
  const t = TIERS[3], m = t.mask, y = 171, up = 176, top = 179;
  const isIn = (x, z) => M(m, x, z) === 2;
  shell(bp, t, y, seed, 9, true, (x, z) => ((x + z) % 4 === 0 ? GOLD : ((x + z) % 2 ? WHITE : SMOOTH)));
  // upper floor slab over everything but the double-height south room (z >= 50) and the gallery stair run
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = t.bz0; z <= t.bz1; z++) {
    if (!isIn(x, z) || z >= 50) continue;
    if (z >= 48 && x <= 55) continue;                                    // the stair up to the gallery
    if (x >= CORE.x0 && x <= CORE.x1 && z >= CORE.z0 && z <= CORE.z1) continue;
    bp.set(x, up - 1, z, (z >= 48) ? ((x % 3) ? PLATE : SMOOTH) : ((x + z) % 2 ? B.SPRUCE_PLANKS : B.WHITE_PLANKS));
  }
  flightX(bp, 48, 49, 46, 1, y, 5, B.SPRUCE_SLAB, B.SPRUCE_PLANKS);
  for (let x = 56; x <= t.bx1; x++) if (isIn(x, 50)) bp.set(x, up, 50 - 1 + 1, B.IRON_BARS);
  for (let x = t.bx0; x <= t.bx1; x++) if (isIn(x, 50)) bp.set(x, up, 50, B.IRON_BARS);
  bp.set(55, up, 50, B.IRON_BARS);
  // living room (double height): sofas around a low table on a rug, holo wall, grand window seat, planters
  const wool = rng.pick([B.RED_WOOL, B.WHITE_WOOL]);
  for (let x = 50; x <= 67; x++) for (let z = 50; z <= 52; z++) bp.set(x, y - 1, z, (x + z) % 2 ? wool : B.WHITE_WOOL);
  sofaGroup(bp, 52, y, 50, wool); sofaGroup(bp, 63, y, 50, wool); bp.fill(56, y, 51, 61, y, 51, wool); bp.set(58, y, 52, B.TABLE); bp.set(59, y, 52, B.TABLE);
  for (const x of [56, 61]) bp.spot(x, y, 51, 'seat');
  for (let x = 47; x <= 70; x += 3) if (isIn(x, 53)) { bp.set(x, y, 53, SEAT); bp.spot(x, y, 53, 'seat'); }
  bp.fill(53, y + 6, CORE.z1, 64, y + 7, CORE.z1, B.HOLO_SIGN);
  for (const [x, z] of [[47, 48], [70, 48], [47, 52], [70, 52]]) if (isIn(x, z)) { planter(bp, x, y, z, B.BIRCH_LEAVES); bp.set(x, y + 2, z, B.BIRCH_LEAVES); }
  for (const x of [50, 67]) chandelier(bp, x, top, 51);
  bp.set(58, top, 52, CHROME); bp.set(59, top, 52, CHROME); bp.set(58, top - 1, 52, GLOW); bp.set(59, top - 1, 52, GLOW);
  for (let x = t.bx0; x <= t.bx1; x++) if (isIn(x, 48) && x >= 56) bp.set(x, y + 4, 48, (x % 3) ? PLATE : GLOW);
  bp.set(65 + 1, y, 48, B.PIANO); bp.set(67, y, 48, SEAT); bp.spot(67, y, 48, 'seat');
  bp.set(56, y, 48, GOLD); bp.set(56, y + 1, 48, B.LANTERN);
  // west wing: kitchen and dining
  for (let z = 37; z <= 46; z++) for (let x = 46; x <= 51; x++) bp.set(x, y - 1, z, (x + z) % 2 ? B.WHITE_PLANKS : WHITE);
  for (let z = 37; z <= 43; z++) { bp.set(46, y, z, BLACK); bp.set(46, y + 1, z, z % 3 === 1 ? B.CONSOLE : SLAB); if (z % 2) bp.set(46, y + 2, z, B.SHELF); }
  bp.set(46, y, 38, B.FURNACE); bp.set(46, y, 41, B.TROUGH); bp.set(46, y, 44, B.CHEST); bp.set(46, y, 45, B.BARREL);
  bp.fill(48, y, 38, 49, y, 38, BLACK); bp.fill(48, y + 1, 38, 49, y + 1, 38, SLAB);
  for (let z = 41; z <= 44; z++) { bp.set(49, y, z, B.TABLE); bp.set(48, y, z, SEAT); bp.set(50, y, z, SEAT); bp.spot(48, y, z, 'seat'); bp.spot(50, y, z, 'seat'); }
  bp.set(48, y + 3, 42, B.LANTERN); bp.set(50, y + 3, 39, GLOW);
  // east wing: study and library
  for (let z = 37; z <= 46; z++) for (let x = 66; x <= 71; x++) bp.set(x, y - 1, z, (x + z) % 2 ? B.SPRUCE_PLANKS : B.RED_WOOL);
  for (let z = 37; z <= 46; z++) if (z % 3 !== 0) { bp.fill(71, y, z, 71, y + 2, z, B.BOOKSHELF); }
  bp.set(68, y, 40, B.TABLE); bp.set(69, y, 40, B.TABLE); bp.set(68, y, 41, SEAT); bp.spot(68, y, 41, 'seat'); bp.set(69, y + 1, 40, B.CONSOLE);
  bp.set(67, y, 44, B.PIANO); bp.set(67, y, 45, SEAT); bp.spot(67, y, 45, 'seat');
  bp.set(66, y, 37, GOLD); bp.set(66, y + 1, 37, B.LANTERN); bp.set(70, y, 37, B.CHEST); bp.set(68, y + 3, 43, B.LANTERN);
  // north hall: art gallery with statues and holo exhibits, home cinema screen
  for (let x = 46; x <= 71; x++) for (let z = 30; z <= 35; z++) if (isIn(x, z)) bp.set(x, y - 1, z, (Math.abs(x + 0.5 - CX) % 4 < 2) ? BLACK : WHITE);
  for (const x of [49, 55, 62, 68]) if (isIn(x, 31)) { bp.set(x, y, 31, SMOOTH); bp.set(x, y + 1, 31, GOLD); bp.set(x, y + 2, 31, GLOW); }
  for (const x of [52, 65]) if (isIn(x, 31)) { bp.set(x, y, 31, CHROME); bp.fill(x, y + 1, 31, x, y + 2, 31, B.HOLO_SIGN); }
  bp.fill(55, y + 1, CORE.z0, 62, y + 2, CORE.z0, B.HOLO_SIGN);
  for (let x = 52; x <= 65; x += 2) { bp.set(x, y, 34, wool); bp.spot(x, y, 34, 'seat'); }
  for (const [x, z] of [[47, 35], [70, 35]]) if (isIn(x, z)) lamp(bp, x, y, z, 2);
  // upstairs: master bedroom west, guest rooms east, two bedrooms + gym north; partitions with framed doors
  const partition = (x0, z0, x1, z1) => bp.fill(x0, up, z0, x1, up + 3, z1, WHITE);
  partition(46, 41, 51, 41); doorway(bp, 48, 41, 49, 41, up, 3, GLOW, CHROME);
  bp.set(46, up, 44, B.BED_HEAD); bp.set(46, up, 43, B.BED_FOOT); bp.set(47, up, 44, B.BED_HEAD); bp.set(47, up, 43, B.BED_FOOT); bp.bed(48, up, 44);
  bp.set(49, up, 46, B.CHEST); bp.set(50, up, 46, B.BOOKSHELF); bp.set(50, up + 1, 46, B.BOOKSHELF); bp.set(51, up, 45, B.TABLE); bp.set(51, up, 44, SEAT); bp.spot(51, up, 44, 'seat');
  bp.set(46, up, 37, B.TROUGH); bp.set(46, up + 1, 37, CHROME); bp.set(47, up, 37, B.TROUGH); bp.set(50, up, 37, B.WHITE_WOOL); bp.set(50, up + 1, 37, B.WHITE_WOOL); bp.set(48, up, 38, B.TROUGH); bp.set(49, up, 38, B.TROUGH);
  for (let x = 46; x <= 51; x++) for (let z = 37; z <= 40; z++) bp.set(x, up - 1, z, (x + z) % 2 ? B.WHITE_WOOL : CHROME);
  partition(66, 41, 71, 41); doorway(bp, 68, 41, 69, 41, up, 3, GLOW, CHROME);
  bp.set(71, up, 46, B.BED_HEAD); bp.set(71, up, 45, B.BED_FOOT); bp.bed(70, up, 46); bp.set(70, up, 46, B.CHEST); bp.set(66, up, 46, B.BOOKSHELF); bp.set(66, up + 1, 46, B.BOOKSHELF);
  bp.set(71, up, 37, B.BED_HEAD); bp.set(71, up, 38, B.BED_FOOT); bp.bed(70, up, 38); bp.set(70, up, 37, B.CHEST); bp.set(66, up, 38, B.TABLE); bp.set(67, up, 38, SEAT); bp.spot(67, up, 38, 'seat');
  bp.set(66, up, 43, B.SHELF); bp.set(66, up + 1, 43, B.SHELF); bp.set(69, up + 1, 42, B.HOLO_SIGN);
  partition(46, 36, 71, 36); doorway(bp, 48, 36, 49, 36, up, 3, GLOW, CHROME); doorway(bp, 68, 36, 69, 36, up, 3, GLOW, CHROME); doorway(bp, 58, 36, 59, 36, up, 3, GLOW, CHROME);
  partition(54, 30, 54, 35); partition(63, 30, 63, 35);
  bp.set(48, up, 31, B.BED_HEAD); bp.set(48, up, 32, B.BED_FOOT); bp.bed(49, up, 31); bp.set(50, up, 31, B.CHEST); bp.set(52, up, 31, B.BOOKSHELF); bp.set(52, up + 1, 31, B.BOOKSHELF); bp.set(52, up, 34, B.TABLE); bp.set(51, up, 34, SEAT); bp.spot(51, up, 34, 'seat');
  bp.set(69, up, 31, B.BED_HEAD); bp.set(69, up, 32, B.BED_FOOT); bp.bed(68, up, 31); bp.set(67, up, 31, B.CHEST); bp.set(65, up, 31, B.BOOKSHELF); bp.set(65, up + 1, 31, B.BOOKSHELF); bp.set(65, up, 34, B.TABLE); bp.set(66, up, 34, SEAT); bp.spot(66, up, 34, 'seat');
  for (let x = 55; x <= 62; x += 2) { bp.set(x, up, 31, B.IRON_BLOCK); bp.set(x, up + 1, 31, B.IRON_BARS); }
  bp.set(56, up, 34, B.OAK_FENCE); bp.set(56, up + 1, 34, B.HAY_BALE); bp.set(61, up, 34, B.RAIL); bp.set(60, up, 34, B.RAIL); bp.spot(58, up, 33, 'stand');
  for (const [x, z] of [[48, 33], [69, 33], [58, 32], [48, 44], [69, 44], [69, 39]]) bp.set(x, up + 3, z, B.LANTERN);
  for (let x = 46; x <= 71; x += 3) for (const z of [32, 39, 45]) if (isIn(x, z)) bp.set(x, top + 1, z, GLOW);
  for (let x = 56; x <= 71; x += 3) if (isIn(x, 48)) bp.set(x, top + 1, 48, GLOW);
  // doors onto the veranda: four-wide glass door south, two-wide doors west and east, and out to the pad
  doorway(bp, 57, t.bz1, 60, t.bz1, y, 4, GLOW, CHROME);
  doorway(bp, corridorEnd(m, 41, true), 41, corridorEnd(m, 41, true), 42, y, 3); doorway(bp, corridorEnd(m, 41, false), 41, corridorEnd(m, 41, false), 42, y, 3);
  // the veranda terrace: loungers, planters, lamps, a bar on the south balcony, a plunge pool east
  terraceDressing(bp, TIERS[2], t, y);
  for (let x = 44; x <= 74; x += 5) if (M(TIERS[2].mask, x, 56) === 2 && !M(m, x, 56)) lounger(bp, x, y, 56, 1);
  for (let x = 44; x <= 74; x += 5) if (M(TIERS[2].mask, x, 27) === 2 && !M(m, x, 27)) planter(bp, x, y, 27, B.SPRUCE_LEAVES);
  bp.fill(62, y, 55, 66, y, 55, BLACK); bp.fill(62, y + 1, 55, 66, y + 1, 55, SLAB); bp.set(64, y + 1, 55, B.CONSOLE); bp.work(64, y, 56, 'bartender');
  basin(bp, 73, 30, 76, 34, y); bp.fill(74, y - 1, 31, 75, y - 1, 33, BLUE);
  for (const [x, z] of [[43, 30], [43, 54], [74, 54]]) lamp(bp, x, y, z, 2);
  // private landing pad east of the terrace
  landingPad(bp, 85, CZ, 6, y - 1, TIERS[2].bx1 - 1);
  for (let z = CZ - 2; z <= CZ + 2; z++) { bp.set(TIERS[2].bx1, y, z, PLATE); bp.set(TIERS[2].bx1, y - 1, z, PLATE); }
  speeder(bp, 87, y, CZ - 3, -1, B.CHROME, B.GOLD_BLOCK);
  bp.spot(84, y, CZ + 3, 'stand');
  bp.room('veranda_living', t.bx0, y, 47, t.bx1, t.bz1);
  bp.room('veranda_kitchen', t.bx0, y, CORE.z0, CORE.x0 - 1, CORE.z1);
  bp.room('veranda_study', CORE.x1 + 1, y, CORE.z0, t.bx1, CORE.z1);
  bp.room('veranda_gallery_hall', t.bx0, y, t.bz0, t.bx1, CORE.z0);
  bp.room('veranda_master_suite', t.bx0, up, CORE.z0, CORE.x0 - 1, CORE.z1);
  bp.room('veranda_guest_rooms', CORE.x1 + 1, up, CORE.z0, t.bx1, CORE.z1);
  bp.room('veranda_upper_hall', t.bx0, up, t.bz0, t.bx1, CORE.z0);
  bp.room('veranda_balcony', TIERS[2].bx0 + 3, y, t.bz1, TIERS[2].bx1 - 3, TIERS[2].bz1);
  bp.room('veranda_pad', 78, y, CZ - 7, 92, CZ + 7);
}

// rooftop observatory: glass walls under the dome, telescopes along the windows, star charts, a bar, and the great
// telescope on the platform over the core reached by a stair in the east gallery
function observatory(bp, rng, seed) {
  const t = TIERS[3], m = t.mask, y = 181, R = 10.5, base = 185;
  const isIn = (x, z) => M(m, x, z) === 2;
  shell(bp, t, y, seed, 4, true, (x, z) => (hash3(x, 7, z, seed) < 0.12 ? BLUE : ((x + z) % 2 ? BLACK : DARK)));
  terrace(bp, t, null, base, true);
  // dome: spherical shell of clear glass with chrome ribs, open to the room below; lit apex
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = t.bz0; z <= t.bz1; z++) {
    const q = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    if (q > R) continue;
    if (q <= R - 1.1) bp.set(x, base, z, AIR);
    const a = Math.atan2(z + 0.5 - CZ, x + 0.5 - CX);
    const rib = Math.abs((((a / (Math.PI * 2)) * 8 + 8.5) % 1) - 0.5) < 0.06 && q > 2.5;
    for (let yy = base; yy <= YTOP; yy++) {
      const dy = yy - base;
      if (dy > R) break;
      const ro = Math.sqrt(R * R - dy * dy), ri = Math.sqrt(Math.max(0, (R - 1.1) * (R - 1.1) - dy * dy));
      if (q > ro || q <= ri) continue;
      bp.set(x, yy, z, rib ? CHROME : (yy === base ? CHROME : CLEAR));
    }
    if (q < 1.6) bp.set(x, Math.round(base + R) - 1, z, GLOW);
  }
  bp.set(58, base + Math.round(R), 41, CHROME); bp.set(59, base + Math.round(R), 42, BLUE);
  // stair to the platform over the core (east gallery), platform railing, the great telescope, consoles, seats
  flightZ(bp, 66, 67, 47, -1, y, 5);
  bp.set(66, y + 5, 37, PLATE); bp.set(67, y + 5, 37, PLATE);
  for (let x = CORE.x0; x <= CORE.x1; x++) for (let z = CORE.z0; z <= CORE.z1; z++) bp.set(x, base, z, ((x + z) % 3 === 0) ? BLUE : DARK);
  for (let x = CORE.x0; x <= CORE.x1; x++) { bp.set(x, base + 1, CORE.z0, B.IRON_BARS); bp.set(x, base + 1, CORE.z1, B.IRON_BARS); }
  for (let z = CORE.z0; z <= CORE.z1; z++) { bp.set(CORE.x0, base + 1, z, B.IRON_BARS); if (z < 37 || z > 38) bp.set(CORE.x1, base + 1, z, B.IRON_BARS); }
  const py = base + 1;
  bp.fill(58, py, 41, 59, py, 42, CHROME); bp.fill(58, py + 1, 41, 59, py + 2, 42, B.IRON_BARS); bp.fill(58, py + 3, 41, 59, py + 4, 42, CHROME); bp.set(58, py + 5, 41, CLEAR); bp.set(59, py + 5, 42, CLEAR);
  for (const [x, z] of [[55, 39], [62, 39], [55, 44], [62, 44]]) { bp.set(x, py, z, BLACK); bp.set(x, py + 1, z, B.CONSOLE); }
  for (const [x, z] of [[56, 39], [61, 39], [56, 44], [61, 44]]) { bp.set(x, py, z, SEAT); bp.spot(x, py, z, 'seat'); }
  bp.set(53, py, 41, CHROME); bp.fill(53, py + 1, 41, 53, py + 2, 41, B.HOLO_SIGN); bp.set(64, py, 42, CHROME); bp.fill(64, py + 1, 42, 64, py + 2, 42, B.HOLO_SIGN);
  bp.work(57, py, 43, 'astronomer'); bp.set(60, py + 3, 39, B.LANTERN); bp.set(57, py + 3, 45, B.LANTERN);
  // floor level: telescopes at the windows, exhibits on chrome stands, benches, a bar west, planters, lanterns
  let k = 0;
  for (let x = t.bx0; x <= t.bx1; x++) for (let z = t.bz0; z <= t.bz1; z++) {
    if (!isIn(x, z)) continue;
    const edge = M(m, x - 1, z) === 1 || M(m, x + 1, z) === 1 || M(m, x, z - 1) === 1 || M(m, x, z + 1) === 1;
    if (!edge) continue;
    k++;
    if (k % 5 === 0) { bp.set(x, y, z, B.IRON_BARS); bp.set(x, y + 1, z, CHROME); bp.set(x, y + 2, z, B.IRON_BARS); }
    else if (k % 5 === 2) { bp.set(x, y, z, SEAT); bp.spot(x, y, z, 'seat'); }
    else if (k % 5 === 4) { bp.set(x, y, z, CHROME); bp.set(x, y + 1, z, B.HOLO_SIGN); }
  }
  bp.fill(47, y, 38, 47, y, 45, BLACK); bp.fill(47, y + 1, 38, 47, y + 1, 45, SLAB); bp.set(47, y + 1, 41, B.CONSOLE); bp.fill(46, y, 39, 46, y + 1, 44, B.SHELF); bp.work(47, y, 46, 'bartender');
  for (const [x, z] of [[49, 35], [68, 35], [49, 48], [68, 48]]) planter(bp, x, y, z, B.SPRUCE_LEAVES);
  for (const [x, z] of [[50, 41], [69, 41], [58, 33], [59, 50]]) bp.set(x, y + 3, z, B.LANTERN);
  for (let x = t.bx0; x <= t.bx1; x += 4) for (const z of [31, 52]) if (isIn(x, z)) bp.set(x, y + 4, z, GLOW);
  bp.room('observatory', t.bx0, y, t.bz0, t.bx1, t.bz1);
  bp.room('telescope_platform', CORE.x0, py, CORE.z0, CORE.x1, CORE.z1);
}

// ------------------------------------------------------------------------------------------------ podium
function podiumShell(bp, seed) {
  const m = masks().podium;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const v = m[x * D + z];
    if (!v) { bp.set(x, 0, z, ((x + z) % 7 === 0) ? DARK : ((x % 9 === 0 || z % 9 === 0) ? SMOOTH : PLATE)); continue; }
    if (v === 1) {
      bp.fill(x, 1, z, x, 2, z, DARK);
      const ox = !M(m, x - 1, z) || !M(m, x + 1, z), oz = !M(m, x, z - 1) || !M(m, x, z + 1);
      const s = ox && !oz ? z : x, corner = ox && oz;
      for (let y = 3; y <= PLAZA - 1; y++) {
        const lvl = PODIUM_LEVELS.filter((l) => l <= y).pop(), r = y - lvl;
        let id = WHITE;
        if (corner || s % 4 === 0) id = CHROME;
        else if (y === lvl - 1) id = CHROME;
        else if (r >= 1 && r <= 2 || (lvl === 1 && (r === 5 || r === 6))) id = hash3(s >> 2, lvl, r > 3 ? 1 : 0, seed) < 0.55 ? LIT : GLASS;
        bp.set(x, y, z, id);
      }
      bp.set(x, 0, z, DARK); bp.set(x, PLAZA, z, CHROME); bp.set(x, PLAZA + 1, z, B.IRON_BARS);
    } else {
      bp.set(x, 0, z, ((x + z) % 2) ? SMOOTH : BRICK);
      for (const fy of PODIUM_LEVELS) if (fy > 1) bp.set(x, fy - 1, z, ((x + z) % 2) ? WHITE : SMOOTH);
      bp.set(x, PLAZA, z, ((x % 6 === 0 || z % 6 === 0) ? PLATE : ((x + z) % 2 ? WHITE : SMOOTH)));
    }
  }
}

// ------------------------------------------------------------------------------------------------ build
export const LANDMARK = {
  id: 'republica', name: '500 Republica', span: [2, 2], height: 200, minW: 116, minD: 84,
  build(bp, lot, ctx) {
    const rng = ctx.rng, seed = (lot.seed ?? 1) >>> 0;
    bp.meta.name = '500 Republica';
    const { tiers } = masks();
    TIERS.forEach((t, i) => { t.mask = tiers[i]; t.bx0 = Math.floor(CX - t.ax - 1); t.bx1 = Math.ceil(CX + t.ax); t.bz0 = Math.floor(CZ - t.az - 1); t.bz1 = Math.ceil(CZ + t.az); });

    podiumShell(bp, seed);
    // setback terraces between the tiers (the tower top is handled by the observatory)
    for (let ti = 1; ti < TIERS.length; ti++) terrace(bp, TIERS[ti - 1], TIERS[ti], TIERS[ti].y0);
    // the core runs from the undercity hall to the observatory; no landings inside the double-height spaces
    const noLanding = new Set([6, 41, 56, 176]);
    coreShaft(bp, 1, 181);
    for (let y = 1; y <= 181; y += 5) coreLevel(bp, y, { up: y < 181, door: !noLanding.has(y), lifts: !noLanding.has(y) });
    // tower levels
    const club = { n1: 'library', n2: 'holo_theatre', n3: 'gallery', s1: 'cantina', s2: 'restaurant', s3: 'lounge', w: 'meditation_chamber', e: 'garden_terrace' };
    for (let ti = 0; ti < TIERS.length; ti++) {
      const t = TIERS[ti];
      for (let y = t.y0 + 1; y <= t.y1; y += 5) {
        if (y === 36) { lobby(bp, rng, seed); continue; }
        if (y === 41 || y === 56 || y === 176) continue;
        if (y === 46) { spa(bp, rng, seed); continue; }
        if (y === 51) { gardens(bp, rng, seed); continue; }
        if (y === 136) { padLevel(bp, rng, seed); continue; }
        if (y === 171) { veranda(bp, rng, seed); continue; }
        if (y === 181) { observatory(bp, rng, seed); continue; }
        shell(bp, t, y, seed);
        if (y === 91) { homesFloor(bp, t, y, PLANS[ti], rng, { slots: club, terraceDoors: true }); terraceDressing(bp, TIERS[0], t, y); continue; }
        homesFloor(bp, t, y, PLANS[ti], rng, { luxury: ti === 2 });
      }
    }
    // undercity entrance: the door column on the south edge, hall to the core (podium interiors below)
    doorway(bp, DOOR_X, D - 1, DOOR_X + 1, D - 1, 1, 3, GLOW, CHROME);
    bp.door(DOOR_X, 1, D - 1, 'S');
    bp.meta.lobby = { x: lot.x0 + DOOR_X, y: bp.y0 + 36, z: lot.z0 + 70 };
    bp.meta.floors = [];
    for (let y = 1; y <= 181; y += 5) if (!noLanding.has(y)) bp.meta.floors.push(bp.y0 + y);
  },
};
