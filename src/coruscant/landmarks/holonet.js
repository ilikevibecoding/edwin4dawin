// HoloNet broadcast tower (docs/rubrics/06_landmarks.md, id 'holonet').
//
// A seven-storey media centre podium (double-height lobby with a giant holo display wall, two double-height news
// studios with control rooms looking down through steel glass, green rooms, editing suites, cafeteria, server halls,
// garage for the news speeders) carrying a 23-storey tower (newsroom floors with rows of desks, editing suites,
// small studios, an executive floor, transmitter operations) topped by the transmitter deck and an antenna crown of
// chrome masts, iron-bar lattice, dish rings and red beacons. Whole-wall HOLO_SIGN billboards framed in chrome cover
// the facades and blue glow strips race up the tower corners. A stair core and two turbolift shafts run from the
// ground lobby to the deck; the boulevard gangway lands on the podium roof terrace at the tower's south door.
// Pure function of the lot and ctx.rng. Local frame: x 0..107, z 0..101 (front = S), y 0 = repaved plateau,
// walk level 1; floors on y = 5f; podium f 0..6 (roof terrace walk 36 = boulevard level), tower f 7..29, deck walk 151.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const BLACK = B.PANEL_BLACK, DARK = B.DURASTEEL_DARK, HULL = B.HULL_PLATE, PLATE = B.DECK_PLATE, STEEL = B.DURASTEEL;
const RED = B.PANEL_RED, STRIPE = B.PANEL_STRIPE, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, HOLO = B.HOLO_SIGN;
const TRIM = B.CHROME, GLASS = B.STEEL_GLASS, BARS = B.IRON_BARS, SLAB = B.STONE_BRICK_SLAB, LIT = B.WINDOW_LIT, DIM = B.WINDOW_DARK;

const W = 108, D = 102;
const PODIUM = { x0: 4, z0: 4, x1: 103, z1: 97, top: 35 };
const TOWER = { x0: 32, z0: 26, x1: 75, z1: 73, top: 150 };
const CORE = { x0: 46, z0: 42, x1: 61, z1: 57 };
const STAIR = { x: 46, z: 43 };                                    // 8 x 12 switchback core, door on the west corridor
const LIFTS = [{ x: 55, z: 42, faceZ: 41 }, { x: 59, z: 42, faceZ: 41 }];   // 2x2 shafts opening onto the north ring corridor
const CORR_W = { x0: 43, x1: 45 }, CORR_E = { x0: 62, x1: 64 };   // full-depth corridors z 27..72
const RING_N = { z0: 39, z1: 41 }, RING_S = { z0: 58, z1: 60 };
const DOOR_X = 54;
const DECK_Y = TOWER.top + 1;                                      // walk 151
const walk = (f) => 1 + 5 * f;

// --------------------------------------------------------------------------------------------------- primitives
function stairZ(bp, x0, x1, z0, dz, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK); bp.set(x, yTop, z, slab ? SLAB : STEEL); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
function carve(bp, x0, z0, x1, z1, y, floor = PLATE, h = 4) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  bp.fill(x0, y - 1, z0, x1, y - 1, z1, floor);
}
function patternFloor(bp, x0, z0, x1, z1, y, a = PLATE, b = STRIPE, period = 6) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, y, z, (x % period === 0 || z % period === 0) ? b : a);
}
function doorway(bp, x0, z0, x1, z1, y, h = 3, frame = TRIM, lintel = GLOW) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y, z0, x0 - 1, y + h, z0, frame); bp.fill(x1 + 1, y, z0, x1 + 1, y + h, z0, frame); bp.fill(x0, y + h, z0, x1, y + h, z0, lintel); }
  else { bp.fill(x0, y, z0 - 1, x0, y + h, z0 - 1, frame); bp.fill(x0, y, z1 + 1, x0, y + h, z1 + 1, frame); bp.fill(x0, y + h, z0, x0, y + h, z1, lintel); }
}
function lampPost(bp, x, y, z, h = 2, id = B.CITY_LAMP) { bp.fill(x, y, z, x, y + h - 1, z, BARS); bp.set(x, y + h, z, id); }

const DRESS = [B.SHELF, B.CRATE, B.BARREL, B.CHEST, B.CONSOLE, B.BOOKSHELF];
function dress(r, rng) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(DRESS); r.put(u, 0, r.back, id === B.CONSOLE ? BLACK : id); if (id === B.SHELF || id === B.CONSOLE || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 3) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 4 === 0) r.planter(u, v, B.OAK_LEAVES); else { r.put(u, 0, v, BLACK); r.put(u, 1, v, (v % 2) ? HOLO : BLUE); } }
  if (r.w >= 10 && r.d >= 8) {
    let k = 0;
    for (let u = 3; u < r.w - 3; u += 5) for (let v = 4; v < r.back - 2; v += 5) {
      if (!r.free(u, v) || !r.empty(u, 0, v) || !r.free(u + 1, v) || !r.empty(u + 1, 0, v)) continue;
      const kind = (k++ + u) % 4;
      if (kind === 0) { r.table(u, v); r.table(u + 1, v); r.seat(u - 1, v); r.seat(u + 2, v); r.seat(u, v + 1); r.seat(u + 1, v - 1); }
      else if (kind === 1) { r.put(u, 0, v, BLACK); r.put(u, 1, v, B.CONSOLE); r.put(u + 1, 0, v, BLACK); r.put(u + 1, 1, v, B.CONSOLE); r.seat(u, v + 1); r.seat(u + 1, v + 1); }
      else if (kind === 2) { r.fill(u, 0, v, u, 2, v + 1, TRIM); r.put(u, 3, v, GLOW); r.put(u + 1, 0, v, B.CRATE); r.put(u + 1, 0, v + 1, B.BARREL); }
      else { r.fill(u, 0, v, u, 2, v + 2, BLACK); r.put(u, 1, v + 1, HOLO); r.seat(u + 1, v + 1); r.seat(u - 1, v + 1); }
    }
  }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, lights = GLOW, floor = PLATE) {
  carve(bp, x0, z0, x1, z1, y, floor);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  if (r.w * r.d >= 60) dress(r, rng);
  r.ceilingLights(4, lights); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}

// ------------------------------------------------------------------------------------------------------ rooms
// news studio: holo stage with a glow floor, anchor desk with consoles, camera droid spots, audience seating,
// light rig under the ceiling, a holo backdrop wall
function newsStudio(bp, rng, x0, z0, x1, z1, y, side, doorU, tall = false) {
  const h = tall ? 8 : 4;
  carve(bp, x0, z0, x1, z1, y, BLACK, h);
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side, doorU, doorW: 2 }, 'news_studio', {});
  const sv0 = Math.max(3, r.back - 6), sv1 = r.back - 1;                 // stage rows against the back wall
  for (let u = 1; u < r.w - 1; u++) for (let v = sv0; v <= sv1; v++) r.putRaw(u, -1, v, (u + v) % 3 ? GLOW : BLUE);
  const cu = r.cu, dv = sv1 - 2;
  for (let u = cu - 3; u <= cu + 4; u++) { r.put(u, 0, dv, TRIM); r.put(u, 1, dv, (u - cu) % 3 === 0 ? B.CONSOLE : SLAB); }   // anchor desk
  for (const u of [cu - 1, cu + 2]) { r.put(u, 0, dv + 1, SLAB); r.work(u, dv + 1, 'anchor'); }
  for (let u = 0; u < r.w; u++) { r.putRaw(u, 1, r.back, HOLO); r.putRaw(u, 2, r.back, (u % 2) ? HOLO : BLUE); if (tall) r.putRaw(u, 4, r.back, HOLO); }
  for (const u of [2, r.w - 3]) for (const v of [sv0 - 1, sv0 + 2]) { r.put(u, 0, v, BLACK); r.put(u, 1, v, B.CONSOLE); r.work(u, v - 1, 'camera droid'); }
  // audience seating in stepped rows facing the stage
  for (let v = 2; v < sv0 - 2; v += 2) for (let u = 2; u < r.w - 2; u++) { if (u === cu || u === cu + 1) continue; r.seat(u, v); }
  // light rig: iron bars grid under the ceiling with lamps
  for (let u = 1; u < r.w - 1; u += 3) for (let v = 1; v <= r.back; v += 3) { r.putRaw(u, h - 1, v, BARS); r.putRaw(u, h, v, (u + v) % 2 ? GLOW : LIT); }
  for (let u = 0; u < r.w; u += 4) r.putRaw(u, h, 0, RED);
  r.finalize();
  bp.room('news_studio', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// the lobby: double height, giant holo display wall on the north side, reception island, seating, holo pillars
function lobby(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, PLATE, 9);
  patternFloor(bp, x0, z0, x1, z1, y - 1, PLATE, BLACK, 4);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x + z) % 8 === 0) bp.set(x, y - 1, z, GLOW);
  const cx = DOOR_X;
  // holo display wall: the whole north wall is a stacked HOLO_SIGN screen in a chrome frame
  for (let x = x0; x <= x1; x++) for (let yy = y; yy <= y + 8; yy++) bp.set(x, yy, z0 - 1, (yy === y || yy === y + 8 || x === x0 || x === x1) ? TRIM : ((x + yy) % 7 === 0 ? BLUE : HOLO));
  // reception island facing the door
  const rz = z1 - 10;
  for (let x = cx - 6; x <= cx + 7; x++) { bp.set(x, y, rz, TRIM); bp.set(x, y + 1, rz, (x - cx) % 4 === 0 ? B.CONSOLE : SLAB); }
  for (let x = cx - 4; x <= cx + 5; x += 3) bp.work(x, y, rz - 1, 'receptionist');
  bp.fill(cx - 6, y + 4, rz, cx + 7, y + 4, rz, HOLO); bp.fill(cx - 2, y + 5, rz, cx + 3, y + 6, rz, HOLO);
  // chrome pillars with glow caps, seating clusters, planters
  for (const x of [x0 + 6, x0 + 18, x1 - 18, x1 - 6]) for (const z of [z0 + 8, z0 + 20, z1 - 4]) {
    bp.fill(x, y, z, x, y + 7, z, TRIM); bp.set(x, y + 8, z, GLOW); bp.set(x, y + 3, z, BLUE);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { if (Math.abs(x + dx - cx) <= 4) continue; bp.set(x + dx, y, z + dz, SLAB); bp.spot(x + dx, y, z + dz, 'seat'); }
  }
  for (let x = x0 + 2; x <= x1 - 2; x += 10) { if (Math.abs(x - cx) <= 6) continue; bp.set(x, y, z1, DARK); bp.set(x, y + 1, z1, B.OAK_LEAVES); }
  // news ticker band and ceiling
  for (let x = x0; x <= x1; x++) { bp.set(x, y + 5, z1 + 1, (x % 5) ? HOLO : RED); }
  for (let x = x0 + 2; x <= x1 - 2; x += 4) for (let z = z0 + 2; z <= z1 - 2; z += 4) bp.set(x, y + 9, z, (x + z) % 3 ? GLOW : BLUE);
  // ticket / security gates in the entry lane
  for (const x of [cx - 3, cx + 4]) { bp.fill(x, y, z1 - 3, x, y + 2, z1 - 3, TRIM); bp.set(x, y + 3, z1 - 3, BLUE); }
  bp.fill(cx - 2, y + 3, z1 - 3, cx + 3, y + 3, z1 - 3, BLUE);
  bp.room('lobby', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  bp.meta.lobby = { x: bp.wx(cx), y: bp.wy(y), z: bp.wz(rz + 4) };
}
// control room looking down into a studio through a steel-glass wall on `glassSide`
function controlRoom(bp, rng, x0, z0, x1, z1, y, side, doorU, glassZ) {
  const r = template(bp, rng, 'control_room', 'studio_control', x0, z0, x1, z1, y, side, doorU, 2, BLUE);
  bp.fill(x0, y, glassZ, x1, y + 2, glassZ, GLASS);
  for (let x = x0 + 1; x < x1; x += 2) { const zc = glassZ < z0 ? z0 : z1; bp.set(x, y, zc, BLACK); bp.set(x, y + 1, zc, B.CONSOLE); bp.set(x, y, zc + (glassZ < z0 ? 1 : -1), SLAB); bp.spot(x, y, zc + (glassZ < z0 ? 1 : -1), 'seat'); }
  return r;
}
// transmitter deck: equipment racks, dish consoles, the antenna crown, railings, beacons
function transmitterDeck(bp) {
  const y = DECK_Y, x0 = TOWER.x0, z0 = TOWER.z0, x1 = TOWER.x1, z1 = TOWER.z1;
  bp.walls(x0, y, z0, x1, y, z1, TRIM);
  bp.walls(x0, y + 1, z0, x1, y + 1, z1, BARS);
  // equipment racks along the north and south edges
  for (let x = x0 + 3; x <= x1 - 3; x += 3) { for (const z of [z0 + 2, z1 - 2]) { bp.set(x, y, z, BLACK); bp.set(x, y + 1, z, BLUE); bp.set(x, y + 2, z, BLACK); } }
  for (let z = z0 + 6; z <= z1 - 6; z += 8) for (const x of [x0 + 3, x1 - 3]) { bp.set(x, y, z, BLACK); bp.set(x, y + 1, z, B.CONSOLE); bp.set(x + (x === x0 + 3 ? 1 : -1), y, z, SLAB); bp.spot(x + (x === x0 + 3 ? 1 : -1), y, z, 'seat'); bp.work(x + (x === x0 + 3 ? 1 : -1), y, z, 'transmitter tech'); }
  // central mast with lattice, dish rings and beacons
  const mx = 53, mz = 49;
  bp.fill(mx - 1, y, mz - 1, mx + 2, y + 17, mz + 2, TRIM);
  for (let yy = y + 1; yy <= y + 16; yy += 2) bp.walls(mx - 3, yy, mz - 3, mx + 4, yy, mz + 4, BARS);
  for (const [x, z] of [[mx - 3, mz - 3], [mx + 4, mz - 3], [mx - 3, mz + 4], [mx + 4, mz + 4]]) bp.fill(x, y, z, x, y + 16, z, BARS);
  bp.disc(mx + 0.5, mz + 0.5, 7, y + 6, y + 6, TRIM, true); bp.disc(mx + 0.5, mz + 0.5, 5, y + 11, y + 11, TRIM, true); bp.disc(mx + 0.5, mz + 0.5, 3, y + 15, y + 15, TRIM, true);
  for (let yy = y + 2; yy <= y + 16; yy += 3) for (const [x, z] of [[mx - 1, mz - 1], [mx + 2, mz + 2]]) bp.set(x, yy, z, BLUE);
  bp.fill(mx, y + 18, mz, mx + 1, y + 18, mz + 1, RED); bp.set(mx, y + 19, mz, GLOW); bp.set(mx + 1, y + 19, mz + 1, RED);
  // four corner masts with red beacons
  for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) { bp.fill(x, y, z, x, y + 8, z, BARS); bp.set(x, y + 9, z, RED); bp.set(x, y + 4, z, GLOW); }
  bp.fill(54, y - 1, 41, 61, y - 1, 41, STRIPE);
  for (let x = x0 + 8; x <= x1 - 8; x += 12) for (const z of [z0 + 1, z1 - 1]) lampPost(bp, x, y, z, 2, B.CITY_LAMP);
  bp.room('transmitter_deck', x0, y, z0, x1, z1);
}

// ------------------------------------------------------------------------------------------------ circulation
function stairCore(bp, tx0, tz0, f0, f1, roofTo) {
  const y0 = walk(f0), yTop = walk(f1);
  bp.fill(tx0, y0 - 1, tz0, tx0 + 7, roofTo, tz0 + 11, HULL);
  bp.fill(tx0 + 1, y0, tz0 + 1, tx0 + 6, roofTo - 1, tz0 + 10, AIR);
  bp.fill(tx0 + 1, y0 - 1, tz0 + 1, tx0 + 6, y0 - 1, tz0 + 10, PLATE);
  for (let f = f0; f < f1; f++) {
    const level = walk(f), east = (f - f0) % 2 === 0, xs = east ? [tx0 + 1, tx0 + 2] : [tx0 + 5, tx0 + 6];
    stairZ(bp, xs[0], xs[1], east ? tz0 + 1 : tz0 + 10, east ? 1 : -1, level, 5);
    bp.fill(tx0 + 1, level + 4, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level + 4, east ? tz0 + 10 : tz0 + 2, PLATE);
    bp.fill(tx0 + 3, level + 4, tz0 + 1, tx0 + 4, level + 4, tz0 + 10, PLATE);     // catwalk joining the landing to the door
    bp.set(tx0 + 3, level + 3, east ? tz0 + 10 : tz0 + 1, GLOW); bp.set(tx0 + 4, level + 3, east ? tz0 + 1 : tz0 + 10, BLUE);
    bp.set(tx0 + 6, level + 2, tz0 + 5, HOLO);
    bp.room('stairwell', tx0, level, tz0, tx0 + 7, tz0 + 11);
  }
  bp.set(tx0 + 3, yTop + 3, tz0 + 5, GLOW); bp.set(tx0 + 4, yTop + 3, tz0 + 6, BLUE);
  bp.set(tx0 + 1, yTop, tz0 + 1, B.CRATE); bp.set(tx0 + 1, yTop + 1, tz0 + 1, B.CRATE); bp.set(tx0 + 2, yTop, tz0 + 1, B.BARREL);
  bp.set(tx0 + 6, yTop, tz0 + 10, BLACK); bp.set(tx0 + 6, yTop + 1, tz0 + 10, B.CONSOLE); bp.set(tx0 + 5, yTop, tz0 + 10, SLAB); bp.spot(tx0 + 5, yTop, tz0 + 10, 'seat');
  bp.set(tx0 + 1, yTop, tz0 + 10, B.CHEST); bp.set(tx0 + 6, yTop, tz0 + 1, B.SHELF); bp.set(tx0 + 6, yTop + 1, tz0 + 1, B.SHELF);
  bp.room('stairwell', tx0, yTop, tz0, tx0 + 7, tz0 + 11);
  for (let f = f0; f <= f1; f++) doorway(bp, tx0, tz0 + 5, tx0, tz0 + 6, walk(f), 3, TRIM, BLUE);
}
function lifts(bp, y0, y1) {
  for (const l of LIFTS) {
    // walls: the row behind the shaft (z + 2) and the two side columns; the corridor side (faceZ) stays open
    bp.fill(l.x - 1, y0 - 1, l.z, l.x - 1, y1 + 3, l.z + 2, BLACK); bp.fill(l.x + 2, y0 - 1, l.z, l.x + 2, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x - 1, y0 - 1, l.z + 2, l.x + 2, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x, y0, l.z, l.x + 1, y1 + 2, l.z + 1, AIR);
    bp.fill(l.x, y1 + 3, l.z, l.x + 1, y1 + 3, l.z + 1, BLACK);
    bp.lift(l.x, l.z, y0, y1);
    for (let y = y0; y <= y1; y += 5) {
      bp.set(l.x - 1, y + 3, l.z, BLUE); bp.set(l.x + 2, y + 3, l.z, BLUE);
      bp.set(l.x, y - 1, l.faceZ, STRIPE); bp.set(l.x + 1, y - 1, l.faceZ, STRIPE);
      bp.fill(l.x, y - 1, l.z, l.x + 1, y - 1, l.z + 1, AIR);
    }
  }
}

// ------------------------------------------------------------------------------------------------------ floors
// rooms in a column along z between za..zb (interior width x0..x1), doors through the wall on `side` ('E' or 'W')
function rowZ(bp, rng, names, za, zb, x0, x1, y, side, depths, custom = {}) {
  let z0 = za, i = 0;
  for (const rd of depths) {
    const z1 = Math.min(zb, z0 + rd - 1), name = names[i % names.length];
    const doorU = Math.floor((z1 - z0 + 1) / 2) - 1, dz = z0 + doorU, dx = side === 'E' ? x1 + 1 : x0 - 1;
    if (custom[name]) custom[name](bp, rng, x0, z0, x1, z1, y, side, doorU); else template(bp, rng, name, name, x0, z0, x1, z1, y, side, doorU, 2);
    doorway(bp, dx, dz, dx, dz + 1, y, 3, TRIM, GLOW);
    z0 = z1 + 2; i++;
    if (z0 > zb) break;
  }
}
// three rooms across a band between the two full-depth corridors: west room x 33..41 (door east onto the
// corridor at x 42), middle room x 47..60 (door onto the ring corridor row `ringZ`), east room x 66..74 (door west)
function bandRooms(bp, rng, names, z0, z1, ringZ, sideMid, y, custom) {
  const du = Math.floor((z1 - z0 + 1) / 2) - 1;
  template(bp, rng, names[0], names[0], 33, z0, 41, z1, y, 'E', du, 2); doorway(bp, 42, z0 + du, 42, z0 + du + 1, y, 3, TRIM, GLOW);
  if (custom[names[1]]) custom[names[1]](bp, rng, 47, z0, 60, z1, y, sideMid, 6); else template(bp, rng, names[1], names[1], 47, z0, 60, z1, y, sideMid, 6, 2);
  doorway(bp, 53, ringZ, 54, ringZ, y, 3, TRIM, GLOW);
  template(bp, rng, names[2], names[2], 66, z0, 74, z1, y, 'W', du, 2); doorway(bp, 65, z0 + du, 65, z0 + du + 1, y, 3, TRIM, GLOW);
}
// the tower ring: two full-depth corridors (x 43..45, 62..64 over z 27..72) and two cross corridors (z 39..41,
// 58..60) around the core; the core closet room; the four bands of rooms
function towerFloor(bp, rng, f, plan, podium = false) {
  const y = walk(f);
  const zA = podium ? 5 : 27, zB = podium ? 96 : 72;
  for (const c of [CORR_W, CORR_E]) { carve(bp, c.x0, zA, c.x1, zB, y, PLATE); for (let z = zA; z <= zB; z++) { bp.set(c.x0 + 1, y - 1, z, STRIPE); if (z % 4 === 0) bp.set(c.x0 + 1, y + 4, z, (z % 8) ? GLOW : BLUE); } }
  for (const c of [RING_N, RING_S]) { carve(bp, CORR_W.x0, c.z0, CORR_E.x1, c.z1, y, PLATE); for (let x = CORR_W.x0; x <= CORR_E.x1; x += 4) bp.set(x, y + 4, c.z0 + 1, GLOW); }
  // core closet (x 54..60, z 46..56) below the lift shafts, opening onto the south ring corridor
  template(bp, rng, plan.closet || 'restroom', plan.closet || 'restroom', 54, 46, 60, 56, y, 'S', 2, 2);
  doorway(bp, 56, 57, 57, 57, y, 3, TRIM, GLOW);
  // north and south bands: west room 33..42 (door E), middle 46..61 (door to the ring), east 65..74 (door W)
  for (const [z0, z1, ringZ, sideMid] of [[27, 37, 38, 'S'], [62, 72, 61, 'N']]) {
    const names = z0 === 27 ? plan.N : plan.S;
    if (!names) continue;
    bandRooms(bp, rng, names, z0, z1, ringZ, sideMid, y, plan.custom || {});
  }
  // west and east bands: two rooms each, doors onto the full-depth corridors (podium floors leave a spoke at z 48..50)
  const zr = podium ? [[39, 46], [52, 60]] : [[39, 48], [50, 60]];
  for (const [x0, x1, side, dx] of [[33, 41, 'E', 42], [66, 74, 'W', 65]]) {
    const names = x0 === 33 ? plan.W : plan.E;
    zr.forEach(([a, b], i) => { template(bp, rng, names[i], names[i], x0, a, x1, b, y, side, Math.floor((b - a + 1) / 2) - 1, 2); doorway(bp, dx, a + Math.floor((b - a + 1) / 2) - 1, dx, a + Math.floor((b - a + 1) / 2), y, 3, TRIM, GLOW); });
  }
  if (podium) { carve(bp, 29, 48, 45, 50, y, PLATE); carve(bp, 62, 48, 78, 50, y, PLATE); bp.set(37, y + 4, 49, GLOW); bp.set(70, y + 4, 49, GLOW); }
}
// podium floors: the tower ring plus an outer ring (x 29..31 / 76..78, z 22..24 / 75..77) and the outer bands
function podiumFloor(bp, rng, f, plan) {
  const y = walk(f);
  towerFloor(bp, rng, f, plan, true);
  for (const [x0, x1] of [[29, 31], [76, 78]]) { carve(bp, x0, 5, x1, 96, y, BLACK); for (let z = 6; z <= 96; z += 4) bp.set(x0 + 1, y + 4, z, (z % 8) ? GLOW : RED); }
  for (const [z0, z1] of [[22, 24], [75, 77]]) { carve(bp, 5, z0, 102, z1, y, BLACK); for (let x = 6; x <= 102; x += 4) bp.set(x, y + 4, z0 + 1, (x % 8) ? GLOW : RED); }
  // outer west / east bands (x 5..27 / 80..102) in three sections: north (z 5..20), middle (26..71), south (79..96)
  for (const [x0, x1, side, dx] of [[5, 27, 'E', 28], [80, 102, 'W', 79]]) {
    const P = x0 === 5 ? plan.OW : plan.OE;
    if (P.north) rowZ(bp, rng, P.north, 5, 20, x0, x1, y, side, [16]);
    if (P.middle) rowZ(bp, rng, P.middle, 26, 71, x0, x1, y, side, P.middleDepths || [14, 14, 14], plan.custom || {});
    if (P.south) rowZ(bp, rng, P.south, 79, 96, x0, x1, y, side, [18]);
  }
  // outer north band (x 33..74, z 5..20, doors onto the ring at z 21) and south band (z 79..96, ring at z 78)
  if (plan.ON) bandRooms(bp, rng, plan.ON, 5, 20, 21, 'S', y, plan.custom || {});
  if (plan.OS) bandRooms(bp, rng, plan.OS, 79, 96, 78, 'N', y, plan.custom || {});
}

// ---------------------------------------------------------------------------------------------------- exterior
// a whole-wall screen: chrome frame, holo panels with lit "pixel" rows and blue highlights so it reads as a live
// broadcast from across the city
function screenBlock(a, y, blue) { return ((a + y) % 7 === 0) ? BLUE : ((y % 5 === 2 && a % 3 !== 0) ? GLOW : (blue && (a * 3 + y) % 11 === 0) ? LIT : HOLO); }
function billboard(bp, x0, y0, x1, y1, z, blue = false) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) bp.set(x, y, z, (x === x0 || x === x1 || y === y0 || y === y1) ? TRIM : screenBlock(x, y, blue));
}
function billboardX(bp, z0, y0, z1, y1, x) {
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) bp.set(x, y, z, (z === z0 || z === z1 || y === y0 || y === y1) ? TRIM : screenBlock(z, y, true));
}
function facade(bp, box, yBase, yTop, pilaster = 6) {
  const { x0, z0, x1, z1 } = box;
  for (let y = yBase; y <= yTop; y++) {
    const band = y % 5 === 0, win = y % 5 === 2 || y % 5 === 3;
    const pick = (a) => band ? HULL : (a % pilaster === 0) ? TRIM : win ? ((a % 3) ? LIT : DIM) : STEEL;
    for (let x = x0; x <= x1; x++) { bp.set(x, y, z0, pick(x)); bp.set(x, y, z1, pick(x)); }
    for (let z = z0 + 1; z < z1; z++) { bp.set(x0, y, z, pick(z)); bp.set(x1, y, z, pick(z)); }
  }
}
function boulevardPlatform(bp) {
  const y = walk(7);
  bp.fill(DOOR_X - 4, y - 1, 98, DOOR_X + 5, y - 1, 101, PLATE);
  for (let z = 98; z <= 101; z++) { bp.set(DOOR_X - 4, y - 1, z, STRIPE); bp.set(DOOR_X + 5, y - 1, z, STRIPE); bp.set(DOOR_X - 4, y, z, BARS); bp.set(DOOR_X + 5, y, z, BARS); }
  bp.fill(DOOR_X - 3, y, 97, DOOR_X + 4, y + 3, 101, AIR);        // through the terrace parapet onto the roof
  bp.fill(DOOR_X - 4, y, 101, DOOR_X + 5, y, 101, AIR);
  for (const x of [DOOR_X - 4, DOOR_X + 5]) { bp.fill(x, y + 1, 99, x, y + 2, 99, BARS); bp.set(x, y + 3, 99, B.CITY_LAMP); }
  bp.door(DOOR_X, y, 101, 'S');
}

export const LANDMARK = {
  id: 'holonet', name: 'HoloNet broadcast tower', span: [2, 2], height: 170, minW: 106, minD: 100,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'HoloNet broadcast tower';
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) bp.set(x, 0, z, (x < 4 || z < 4 || x > 103 || z > 97) ? ((x + z) % 6 === 0 ? BLUE : DARK) : PLATE);
    // masses
    bp.fill(PODIUM.x0, 1, PODIUM.z0, PODIUM.x1, PODIUM.top, PODIUM.z1, STEEL);
    bp.fill(TOWER.x0, PODIUM.top + 1, TOWER.z0, TOWER.x1, TOWER.top, TOWER.z1, DARK);
    // podium roof terrace and the transmitter deck floor before the floors (ceiling lights show as lit tiles)
    patternFloor(bp, PODIUM.x0 + 1, PODIUM.z0 + 1, PODIUM.x1 - 1, PODIUM.z1 - 1, PODIUM.top, PLATE, DARK, 6);
    bp.walls(PODIUM.x0, PODIUM.top + 1, PODIUM.z0, PODIUM.x1, PODIUM.top + 1, PODIUM.z1, BARS);
    patternFloor(bp, TOWER.x0, TOWER.z0, TOWER.x1, TOWER.z1, TOWER.top, PLATE, STRIPE, 8);
    // floors, top down
    const newsroom = { N: ['open_plan_office', 'open_plan_office', 'meeting_room'], S: ['open_plan_office', 'open_plan_office', 'server_room'], W: ['control_room', 'storage'], E: ['lounge', 'comms_room'], closet: 'restroom' };
    const editing = { N: ['control_room', 'open_plan_office', 'control_room'], S: ['workshop', 'open_plan_office', 'archive'], W: ['control_room', 'control_room'], E: ['lounge', 'storage'], closet: 'server_room' };
    const studioFloor = { N: ['control_room', 'news_studio', 'dressing_room'], S: ['lounge', 'open_plan_office', 'meeting_room'], W: ['control_room', 'storage'], E: ['dressing_room', 'restroom'], closet: 'server_room', custom: { news_studio: (bp, rng, x0, z0, x1, z1, y, side, doorU) => newsStudio(bp, rng, x0, z0, x1, z1, y, side, doorU, false) } };
    const executive = { N: ['executive_office', 'meeting_room', 'executive_office'], S: ['lounge', 'executive_office', 'library'], W: ['meeting_room', 'executive_office'], E: ['executive_office', 'restroom'], closet: 'storage' };
    const txOps = { N: ['control_room', 'comms_room', 'control_room'], S: ['server_room', 'server_room', 'server_room'], W: ['workshop', 'storage'], E: ['lounge', 'comms_room'], closet: 'server_room' };
    const cafeteria = { N: ['kitchen', 'cafeteria', 'lounge'], S: ['open_plan_office', 'open_plan_office', 'gym'], W: ['medbay', 'storage'], E: ['lounge', 'restroom'], closet: 'restroom' };
    for (let f = 29; f >= 7; f--) {
      const plan = f === 29 ? txOps : f === 28 ? executive : (f === 12 || f === 20) ? studioFloor : (f === 16) ? cafeteria : (f % 3 === 1) ? editing : newsroom;
      towerFloor(bp, rng, f, plan);
    }
    // podium floors
    const pod = (extra) => ({ N: ['open_plan_office', 'open_plan_office', 'archive'], S: ['meeting_room', 'open_plan_office', 'server_room'], W: ['control_room', 'storage'], E: ['lounge', 'comms_room'], closet: 'restroom', ...extra });
    podiumFloor(bp, rng, 6, pod({ ON: ['gym', 'cafeteria', 'kitchen'], OS: ['library', 'open_plan_office', 'meeting_room'], OW: { north: ['medbay'], middle: ['open_plan_office', 'server_room', 'lounge'], south: ['barracks'] }, OE: { north: ['storage'], middle: ['open_plan_office', 'control_room', 'archive'], south: ['barracks'] } }));
    podiumFloor(bp, rng, 5, pod({ ON: ['open_plan_office', 'open_plan_office', 'meeting_room'], OS: ['control_room', 'open_plan_office', 'control_room'], OW: { north: ['server_room'], middle: ['server_room', 'server_room', 'workshop'], south: ['lounge'] }, OE: { north: ['server_room'], middle: ['server_room', 'comms_room', 'workshop'], south: ['lounge'] } }));
    podiumFloor(bp, rng, 4, pod({ ON: ['meeting_room', 'open_plan_office', 'meeting_room'], OS: ['open_plan_office', 'open_plan_office', 'archive'], OW: { north: ['storage'], middle: ['control_room', 'control_room', 'control_room'], south: ['dressing_room'] }, OE: { north: ['storage'], middle: ['control_room', 'control_room', 'workshop'], south: ['dressing_room'] } }));
    podiumFloor(bp, rng, 3, pod({ ON: ['open_plan_office', 'archive', 'open_plan_office'], OS: ['lounge', 'open_plan_office', 'gym'], OW: { north: ['restroom'], middle: ['news_studio'], middleDepths: [46], south: ['control_room'] }, OE: { north: ['restroom'], middle: ['news_studio'], middleDepths: [46], south: ['control_room'] }, custom: { news_studio: (bp, rng, x0, z0, x1, z1, y, side, doorU) => newsStudio(bp, rng, x0, z0, x1, z1, y, side, doorU, false) } }));
    podiumFloor(bp, rng, 2, pod({ ON: ['open_plan_office', 'open_plan_office', 'open_plan_office'], OS: ['meeting_room', 'lounge', 'meeting_room'], OW: { north: ['storage'], middle: ['open_plan_office', 'meeting_room', 'server_room'], south: ['lounge'] }, OE: { north: ['storage'], middle: ['open_plan_office', 'meeting_room', 'server_room'], south: ['lounge'] } }));
    // level 6: studio control rooms look down into the double-height ground studios through steel glass
    podiumFloor(bp, rng, 1, pod({ S: null, ON: ['cafeteria', 'kitchen', 'lounge'], OS: null, OW: { north: ['dressing_room'], middle: null, south: ['lounge'] }, OE: { north: ['dressing_room'], middle: null, south: ['gym'] } }));
    controlRoom(bp, rng, 5, 62, 27, 72, walk(1), 'E', 4, 61); doorway(bp, 28, 66, 28, 67, walk(1), 3, TRIM, GLOW);
    controlRoom(bp, rng, 80, 62, 102, 72, walk(1), 'W', 4, 61); doorway(bp, 79, 66, 79, 67, walk(1), 3, TRIM, GLOW);
    // ground: lobby (double height), two double-height studios, garage, droid bay, security, green rooms
    podiumFloor(bp, rng, 0, pod({ S: null, ON: ['garage', 'droid_bay', 'workshop'], OS: null, OW: { north: ['security_post'], middle: null, south: null }, OE: { north: ['storage'], middle: null, south: null } }));
    newsStudio(bp, rng, 5, 26, 27, 60, walk(0), 'E', 16, true); doorway(bp, 28, 42, 28, 43, walk(0), 3, TRIM, BLUE);
    newsStudio(bp, rng, 80, 26, 102, 60, walk(0), 'W', 16, true); doorway(bp, 79, 42, 79, 43, walk(0), 3, TRIM, BLUE);
    template(bp, rng, 'lounge', 'green_room', 5, 62, 27, 72, walk(0), 'E', 4, 2); doorway(bp, 28, 66, 28, 67, walk(0), 3, TRIM, GLOW);
    template(bp, rng, 'dressing_room', 'dressing_room', 80, 62, 102, 72, walk(0), 'W', 4, 2); doorway(bp, 79, 66, 79, 67, walk(0), 3, TRIM, GLOW);
    template(bp, rng, 'cafeteria', 'cafeteria', 5, 79, 27, 96, walk(0), 'E', 8, 2); doorway(bp, 28, 87, 28, 88, walk(0), 3, TRIM, GLOW);
    template(bp, rng, 'medbay', 'medbay', 80, 79, 102, 96, walk(0), 'W', 8, 2); doorway(bp, 79, 87, 79, 88, walk(0), 3, TRIM, GLOW);
    lobby(bp, rng, 33, 62, 74, 96, walk(0));
    for (const x0 of [43, 62]) { bp.fill(x0, walk(0), 61, x0 + 2, walk(0) + 3, 61, AIR); bp.fill(x0 - 1, walk(0), 61, x0 - 1, walk(0) + 4, 61, TRIM); bp.fill(x0 + 3, walk(0), 61, x0 + 3, walk(0) + 4, 61, TRIM); bp.fill(x0, walk(0) + 4, 61, x0 + 2, walk(0) + 4, 61, BLUE); }
    doorway(bp, 32, 66, 32, 67, walk(0), 3, TRIM, GLOW); doorway(bp, 75, 66, 75, 67, walk(0), 3, TRIM, GLOW);
    doorway(bp, 32, 86, 32, 87, walk(0), 3, TRIM, GLOW); doorway(bp, 75, 86, 75, 87, walk(0), 3, TRIM, GLOW);
    doorway(bp, DOOR_X, 97, DOOR_X + 1, 97, walk(0), 4, TRIM, BLUE);
    bp.door(DOOR_X, walk(0), 97, 'S');
    // the lobby void rises through level 6: no slab, and the level-6 ring/outer corridors stop at its walls
    bp.fill(33, walk(1) - 1, 62, 74, walk(1) - 1, 96, AIR);
    bp.fill(33, walk(1), 62, 74, walk(1) + 3, 96, AIR);
    bp.fill(43, walk(1) - 1, 61, 45, walk(1) - 1, 61, PLATE); bp.fill(62, walk(1) - 1, 61, 64, walk(1) - 1, 61, PLATE);
    bp.fill(43, walk(1), 61, 45, walk(1), 61, BARS); bp.fill(62, walk(1), 61, 64, walk(1), 61, BARS);   // balcony rails at the level-6 corridor ends
    bp.fill(5, walk(1) - 1, 26, 27, walk(1) - 1, 60, AIR); bp.fill(80, walk(1) - 1, 26, 102, walk(1) - 1, 60, AIR);   // studio voids
    bp.fill(5, walk(1), 26, 27, walk(1) + 2, 60, AIR); bp.fill(80, walk(1), 26, 102, walk(1) + 2, 60, AIR);   // up to y 8: the rig at y 9 stays
    // circulation
    lifts(bp, 1, DECK_Y);
    stairCore(bp, STAIR.x, STAIR.z, 0, 30, DECK_Y + 3);
    // podium roof terrace: planters, benches, holo totems, the tower's south door at the gangway column
    for (let x = PODIUM.x0 + 4; x <= PODIUM.x1 - 4; x += 10) for (const z of [PODIUM.z0 + 3, PODIUM.z1 - 3]) { if (x >= TOWER.x0 - 2 && x <= TOWER.x1 + 2 && z > TOWER.z0 - 3 && z < TOWER.z1 + 3) continue; bp.set(x, PODIUM.top + 1, z, DARK); bp.set(x, PODIUM.top + 2, z, B.OAK_LEAVES); bp.set(x + 2, PODIUM.top + 1, z, SLAB); bp.spot(x + 2, PODIUM.top + 1, z, 'seat'); lampPost(bp, x - 2, PODIUM.top + 1, z, 2, B.CITY_LAMP); }
    for (const [x, z] of [[PODIUM.x0 + 3, PODIUM.z0 + 3], [PODIUM.x1 - 3, PODIUM.z0 + 3], [PODIUM.x0 + 3, PODIUM.z1 - 3], [PODIUM.x1 - 3, PODIUM.z1 - 3]]) { bp.fill(x, PODIUM.top + 1, z, x, PODIUM.top + 6, z, HOLO); bp.set(x, PODIUM.top + 7, z, BLUE); }
    boulevardPlatform(bp);
    doorway(bp, DOOR_X, TOWER.z1, DOOR_X + 1, TOWER.z1, walk(7), 3, TRIM, BLUE);
    bp.door(DOOR_X, walk(7), TOWER.z1, 'S');
    // facades and billboards
    facade(bp, PODIUM, 1, PODIUM.top, 6);
    facade(bp, TOWER, PODIUM.top + 1, TOWER.top, 7);
    for (const [x, z] of [[TOWER.x0, TOWER.z0], [TOWER.x1, TOWER.z0], [TOWER.x0, TOWER.z1], [TOWER.x1, TOWER.z1]]) bp.fill(x, PODIUM.top + 1, z, x, TOWER.top + 2, z, BLUE);   // blue strips up the corners
    for (const [x, z] of [[PODIUM.x0, PODIUM.z0], [PODIUM.x1, PODIUM.z0], [PODIUM.x0, PODIUM.z1], [PODIUM.x1, PODIUM.z1]]) bp.fill(x, 1, z, x, PODIUM.top + 1, z, TRIM);
    billboard(bp, 8, 12, 27, 30, PODIUM.z1, true); billboard(bp, 80, 12, 99, 30, PODIUM.z1, true);          // podium south face
    billboard(bp, 36, 14, 71, 30, PODIUM.z0);                                                               // podium north face
    billboard(bp, 38, 56, 69, 92, TOWER.z1, true); billboard(bp, 38, 100, 69, 126, TOWER.z1);               // tower south face
    billboard(bp, 38, 70, 69, 110, TOWER.z0, true);                                                          // tower north face
    billboardX(bp, 32, 60, 67, 96, TOWER.x0); billboardX(bp, 32, 104, 67, 134, TOWER.x1);                   // tower west / east faces
    for (let y = 40; y <= TOWER.top; y += 25) for (const x of [TOWER.x0, TOWER.x1]) for (let z = TOWER.z0 + 2; z <= TOWER.z1 - 2; z += 2) bp.set(x, y, z, (z % 4) ? RED : GLOW);   // ticker bands
    transmitterDeck(bp);
    // ground entrance canopy and the HoloNet emblem
    bp.fill(DOOR_X - 8, 6, PODIUM.z1 + 1, DOOR_X + 9, 6, PODIUM.z1 + 3, TRIM); bp.fill(DOOR_X - 8, 5, PODIUM.z1 + 3, DOOR_X + 9, 5, PODIUM.z1 + 3, (BLUE));
    for (let x = DOOR_X - 8; x <= DOOR_X + 9; x += 4) bp.set(x, 5, PODIUM.z1 + 1, GLOW);
    bp.fill(DOOR_X - 3, 7, PODIUM.z1, DOOR_X + 4, 10, PODIUM.z1, HOLO); bp.fill(DOOR_X - 1, 8, PODIUM.z1, DOOR_X + 2, 9, PODIUM.z1, BLUE);
    doorway(bp, DOOR_X, PODIUM.z1, DOOR_X + 1, PODIUM.z1, walk(0), 4, TRIM, BLUE);
    doorway(bp, DOOR_X, TOWER.z1, DOOR_X + 1, TOWER.z1, walk(7), 3, TRIM, BLUE);
    bp.meta.floors = []; for (let f = 0; f <= 30; f++) bp.meta.floors.push(bp.y0 + walk(f));
  },
};
