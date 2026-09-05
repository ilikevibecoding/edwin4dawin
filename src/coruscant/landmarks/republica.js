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

// residential floor: ring corridor, apartments in the four strips, lit ceilings, lobby dressing in front of the core
function homesFloor(bp, t, y, plan, rng, seed, luxury) {
  const m = t.mask, isIn = (x, z) => M(m, x, z) === 2;
  const [xi0, xi1] = plan.xi;
  // corridor floors and ceilings (ceiling = slab above, lit every third cell)
  const corr = (x0, z0, x1, z1) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (isIn(x, z)) {
      bp.set(x, y - 1, z, ((x + z) % 4 === 0) ? BLACK : ((x + z) % 2 ? PLATE : SMOOTH));
      if ((x % 3 === 0) && (z % 2 === 0)) bp.set(x, y + 4, z, GLOW);
    }
  };
  corr(xi0, RING.nz[0], xi1, RING.nz[1]); corr(xi0, RING.sz[0], xi1, RING.sz[1]);
  corr(RING.wx[0], CORE.z0, RING.wx[1], CORE.z1); corr(RING.ex[0], CORE.z0, RING.ex[1], CORE.z1);
  // units: north and south strips split by the plan, west and east units between the corridors
  const [sa, sb] = plan.splits;
  const units = [
    { x0: xi0, x1: sa - 1, z0: plan.nz[0], z1: plan.nz[1], side: 'S' }, { x0: sa + 1, x1: sb - 1, z0: plan.nz[0], z1: plan.nz[1], side: 'S' }, { x0: sb + 1, x1: xi1, z0: plan.nz[0], z1: plan.nz[1], side: 'S' },
    { x0: xi0, x1: sa - 1, z0: plan.sz[0], z1: plan.sz[1], side: 'N' }, { x0: sa + 1, x1: sb - 1, z0: plan.sz[0], z1: plan.sz[1], side: 'N' }, { x0: sb + 1, x1: xi1, z0: plan.sz[0], z1: plan.sz[1], side: 'N' },
    { x0: plan.wx[0], x1: plan.wx[1], z0: CORE.z0 + 1, z1: CORE.z1 - 1, side: 'E' }, { x0: plan.ex[0], x1: plan.ex[1], z0: CORE.z0 + 1, z1: CORE.z1 - 1, side: 'W' },
  ];
  for (const u of units) {
    wallRing(bp, m, u.x0, u.z0, u.x1, u.z1, y);
    // door in the corridor-facing wall, two wide, centred (corner units: centred on the part inside the footprint)
    let dx0, dz0, dx1, dz1, doorU;
    if (u.side === 'S' || u.side === 'N') {
      let a = u.x0, b = u.x1; const wz = u.side === 'S' ? u.z1 + 1 : u.z0 - 1;
      while (a < b && !isIn(a, wz - (u.side === 'S' ? 1 : -1))) a++; while (b > a && !isIn(b, wz - (u.side === 'S' ? 1 : -1))) b--;
      const c = Math.floor((a + b) / 2); dx0 = c; dx1 = c + 1; dz0 = dz1 = wz; doorU = c - u.x0;
    } else {
      const c = CORE.z0 + 5; dz0 = c; dz1 = c + 1; dx0 = dx1 = u.side === 'E' ? u.x1 + 1 : u.x0 - 1; doorU = c - u.z0;
    }
    doorway(bp, dx0, dz0, dx1, dz1, y, 3, GLOW, CHROME);
    const r = new Room(bp, { x0: u.x0, z0: u.z0, x1: u.x1, z1: u.z1, y, h: 4, side: u.side, doorU, doorW: 2, mask: (x, z) => isIn(x, z) }, 'apartment', {});
    apartment(r, rng, luxury);
    r.finalize();
    bp.room(luxury ? 'penthouse' : 'apartment', u.x0 - 1, y, u.z0 - 1, u.x1 + 1, u.z1 + 1);
  }
  // lift lobby dressing: directory holo sign on the core wall, planters and a bench in the south corridor corners
  bp.set(56, y + 1, CORE.z1, B.HOLO_SIGN); bp.set(61, y + 1, CORE.z1, B.HOLO_SIGN);
  for (const x of [RING.wx[0], RING.ex[1]]) { planter(bp, x, y, RING.sz[1], B.SPRUCE_LEAVES); planter(bp, x, y, RING.nz[0], B.OAK_LEAVES); }
  for (const x of [CORE.x0 - 4, CORE.x1 + 4]) if (isIn(x, RING.sz[1])) { bp.set(x, y, RING.sz[1], SEAT); bp.spot(x, y, RING.sz[1], 'seat'); }
  // corridor ends: lit windows at the facade (the ring corridors run to the outer wall)
  for (const [za, zb] of [RING.nz, RING.sz]) for (const x of [t.bx0, t.bx1]) for (let xx = x; xx !== CX; xx += x < CX ? 1 : -1) { if (M(m, xx, za) === 1) { bp.fill(xx, y + 1, za, xx, y + 2, zb, GLASS); break; } }
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
    // tower floors
    const top = Math.min(YTOP, bp.h - 1);
    for (let ti = 0; ti < TIERS.length; ti++) {
      const t = TIERS[ti];
      for (let y = t.y0 + 1; y <= t.y1; y += 5) shell(bp, t, y, seed);
      if (ti > 0) terrace(bp, TIERS[ti - 1], t, t.y0);
    }
    terrace(bp, TIERS[3], null, TIERS[3].y1 + 1);
    // the core runs from the undercity lobby to the observatory
    coreShaft(bp, 1, 181);
    for (let y = 1; y <= 181; y += 5) coreLevel(bp, y, { up: y < 181 });
    // generic homes on every tier floor (special levels are rebuilt afterwards)
    for (let ti = 0; ti < 3; ti++) {
      const t = TIERS[ti];
      for (let y = t.y0 + 1; y <= t.y1; y += 5) homesFloor(bp, t, y, PLANS[ti], rng, seed, ti === 2);
    }
    // undercity entrance (skeleton): the door column on the south edge, hall to the core
    doorway(bp, DOOR_X, D - 1, DOOR_X + 1, D - 1, 1, 3, GLOW, CHROME);
    bp.door(DOOR_X, 1, D - 1, 'S');
    bp.door(DOOR_X, 36, D - 1, 'S');
    bp.meta.lobby = { x: lot.x0 + DOOR_X, y: bp.y0 + 1, z: lot.z0 + 60 };
    bp.meta.floors = [];
    for (let y = 1; y <= 181; y += 5) bp.meta.floors.push(bp.y0 + y);
  },
};
