// Grand Republic Medical Facility (docs/rubrics/06_landmarks.md, id 'medcenter').
//
// A clean white-and-chrome hospital: a seven-storey podium (double-height reception and waiting hall with triage desks,
// emergency bays, the triple-height bacta tank hall with lit steel-glass cylinders and catwalks, surgical theatres,
// wards of beds behind glass partitions, pharmacy, med-droid bays, morgue cold storage, cafeteria, staff quarters)
// carrying a fourteen-storey ward tower with an ambulance speeder pad cantilevered off its east face at the mid
// level, a red-cross emblem in wool on the south face, blue glow strips up the corners and a rooftop garden under
// glass pergolas. A stair core with landing catwalks and two turbolifts join every level; the boulevard gangway lands
// on the podium roof terrace at the tower's south door. Pure function of the lot and ctx.rng.
// Local frame: x 0..107, z 0..93 (front = S), y 0 = repaved plateau, walk 1; floors on y = 5f; podium f 0..6 (roof
// terrace walk 36 = boulevard level), tower f 7..20, roof garden walk 106.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const WHITE = B.PLASTER, STONE = B.SMOOTH_STONE, TRIM = B.CHROME, GLASS = B.STEEL_GLASS, PLATE = B.DECK_PLATE, STEEL = B.DURASTEEL;
const BLACK = B.PANEL_BLACK, RED = B.PANEL_RED, STRIPE = B.PANEL_STRIPE, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, HOLO = B.HOLO_SIGN;
const BARS = B.IRON_BARS, SLAB = B.STONE_BRICK_SLAB, LIT = B.WINDOW_LIT, WOOL = B.WHITE_WOOL, BWOOL = B.BLUE_WOOL, SNOW = B.SNOW;

const W = 108, D = 94;
const PODIUM = { x0: 4, z0: 4, x1: 103, z1: 89, top: 35 };
const TOWER = { x0: 30, z0: 22, x1: 77, z1: 71, top: 105 };
const STAIR = { x: 45, z: 39 };
const LIFTS = [{ x: 54, z: 38, faceZ: 37 }, { x: 58, z: 38, faceZ: 37 }];
const CORR_W = { x0: 42, x1: 44 }, CORR_E = { x0: 61, x1: 63 };
const RING_N = { z0: 35, z1: 37 }, RING_S = { z0: 54, z1: 56 };
const DOOR_X = 54;
const PAD = { x0: 78, z0: 40, x1: 97, z1: 54, y: 65 };            // ambulance pad slab (walk 66)
const GARDEN_Y = TOWER.top + 1;                                   // walk 106
const walk = (f) => 1 + 5 * f;

// --------------------------------------------------------------------------------------------------- primitives
function stairZ(bp, x0, x1, z0, dz, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, STONE); bp.set(x, yTop, z, slab ? SLAB : STEEL); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
function carve(bp, x0, z0, x1, z1, y, floor = WHITE, h = 4) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  bp.fill(x0, y - 1, z0, x1, y - 1, z1, floor);
}
function patternFloor(bp, x0, z0, x1, z1, y, a = WHITE, b = STONE, period = 6) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, y, z, (x % period === 0 || z % period === 0) ? b : a);
}
function doorway(bp, x0, z0, x1, z1, y, h = 3, frame = TRIM, lintel = GLOW) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y, z0, x0 - 1, y + h, z0, frame); bp.fill(x1 + 1, y, z0, x1 + 1, y + h, z0, frame); bp.fill(x0, y + h, z0, x1, y + h, z0, lintel); }
  else { bp.fill(x0, y, z0 - 1, x0, y + h, z0 - 1, frame); bp.fill(x0, y, z1 + 1, x0, y + h, z1 + 1, frame); bp.fill(x0, y + h, z0, x0, y + h, z1, lintel); }
}
function lampPost(bp, x, y, z, h = 2, id = B.CITY_LAMP) { bp.fill(x, y, z, x, y + h - 1, z, BARS); bp.set(x, y + h, z, id); }

const DRESS = [B.SHELF, B.CHEST, B.CONSOLE, B.CRATE, B.BOOKSHELF, B.BARREL];
const CIVIC = new Set(['courtroom', 'control_room', 'executive_office', 'meeting_room', 'lobby_atrium', 'archive', 'library', 'medbay', 'clinic_ward', 'council_chamber', 'holo_theatre', 'observation_deck', 'gallery', 'museum_hall', 'lounge', 'restaurant', 'cafeteria', 'open_plan_office']);
// civic rooms get shelves, consoles, benches, planters and holo boards; the crate-and-barrel filler is for stores
function dress(r, rng, civic = false) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(civic ? DRESS.filter((d) => d !== B.CRATE && d !== B.BARREL && d !== B.CHEST) : DRESS); r.put(u, 0, r.back, id === B.CONSOLE ? BLACK : id); if (id === B.SHELF || id === B.CONSOLE || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 3) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 4 === 0) r.planter(u, v, B.OAK_LEAVES); else { r.put(u, 0, v, TRIM); r.put(u, 1, v, (v % 2) ? HOLO : BLUE); } }
  if (r.w >= 10 && r.d >= 8) {
    let k = 0;
    for (let u = 3; u < r.w - 3; u += 5) for (let v = 4; v < r.back - 2; v += 5) {
      if (!r.free(u, v) || !r.empty(u, 0, v) || !r.free(u + 1, v) || !r.empty(u + 1, 0, v)) continue;
      const kind = (k++ + u) % 4;
      if (kind === 0) { r.table(u, v); r.table(u + 1, v); r.seat(u - 1, v); r.seat(u + 2, v); r.seat(u, v + 1); r.seat(u + 1, v - 1); }
      else if (kind === 1) { r.put(u, 0, v, TRIM); r.put(u, 1, v, B.CONSOLE); r.put(u + 1, 0, v, WOOL); r.put(u + 1, 0, v + 1, WOOL); r.seat(u, v + 1); }
      else if (kind === 2) { r.fill(u, 0, v, u, 2, v + 1, TRIM); r.put(u, 3, v, GLOW); r.put(u + 1, 0, v, B.CHEST); r.put(u + 1, 0, v + 1, B.SHELF); }
      else { r.planter(u, v, B.OAK_LEAVES); r.planter(u + 1, v + 1, B.OAK_LEAVES); r.seat(u + 1, v); r.seat(u, v + 1); }
    }
  }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, lights = GLOW, floor = WHITE) {
  carve(bp, x0, z0, x1, z1, y, floor);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  if (r.w * r.d >= 60) dress(r, rng, CIVIC.has(name) || CIVIC.has(kind));
  r.ceilingLights(4, lights); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}

// ------------------------------------------------------------------------------------------------------ rooms
// ward: beds along both long walls behind steel-glass partitions, bedside consoles and chests, a nurse station
function ward(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  carve(bp, x0, z0, x1, z1, y, WHITE);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'ward', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (v === 2 || v === r.back - 2) ? WOOL : ((u + v) % 6 ? WHITE : STONE));
  // bays of 3 along u on both sides: bed, bedside chest/console, glass partition
  for (const [bv, dir] of [[r.back, -1], [2, 1]]) {
    for (let u = 1; u + 2 < r.w; u += 3) {
      if (!r.free(u, bv) || !r.free(u, bv + dir)) continue;
      r.bed(u, bv, false, dir);
      r.put(u + 1, 0, bv, (u % 2) ? B.CHEST : TRIM); if (u % 2 === 0) r.put(u + 1, 1, bv, B.CONSOLE);
      r.put(u + 2, 0, bv, GLASS); r.put(u + 2, 1, bv, GLASS); r.put(u + 2, 0, bv + dir, GLASS); r.put(u + 2, 1, bv + dir, GLASS);
      r.putRaw(u, 3, bv, BLUE);
    }
  }
  // nurse station in the middle of the room
  const cv = Math.floor(r.back / 2);
  if (r.back >= 8) { r.put(r.cu, 0, cv, TRIM); r.put(r.cu + 1, 0, cv, TRIM); r.put(r.cu, 1, cv, B.CONSOLE); r.put(r.cu + 1, 1, cv, SLAB); r.work(r.cu, cv + 1, 'nurse'); r.put(r.cu - 1, 0, cv, B.CHEST); }
  for (let u = 0; u < r.w; u += 4) r.putRaw(u, 2, r.back, (u % 8) ? HOLO : RED);
  r.ceilingLights(3, GLOW); r.finalize();
  bp.room('ward', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// surgical theatre: chrome table under a bright glow ceiling, consoles and droid alcoves around, scrub sinks
function surgery(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  carve(bp, x0, z0, x1, z1, y, WHITE);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'surgery', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 2 ? WHITE : STONE);
  const cu = r.cu, cv = Math.max(3, Math.floor(r.back / 2));
  r.put(cu, 0, cv, TRIM); r.put(cu + 1, 0, cv, TRIM); r.put(cu, 0, cv + 1, TRIM); r.put(cu + 1, 0, cv + 1, TRIM);   // the table
  r.put(cu, 1, cv, SLAB); r.put(cu + 1, 1, cv, SLAB); r.put(cu, 1, cv + 1, WOOL); r.put(cu + 1, 1, cv + 1, WOOL);
  for (const [du, dv] of [[-2, 0], [3, 0], [-2, 1], [3, 1]]) { r.put(cu + du, 0, cv + dv, BLACK); r.put(cu + du, 1, cv + dv, B.CONSOLE); }
  r.work(cu - 1, cv - 1, 'surgeon'); r.work(cu + 2, cv + 2, 'surgical droid');
  for (let u = 0; u < r.w; u += 3) { r.put(u, 0, r.back, TRIM); r.put(u, 1, r.back, (u % 2) ? B.CONSOLE : B.SHELF); r.put(u, 2, r.back, BLACK); }
  r.put(0, 0, 1, B.BARREL); r.put(r.w - 1, 0, 1, B.CHEST); r.put(0, 0, 2, TRIM); r.put(0, 1, 2, B.WATER);   // scrub sink
  // instrument carts and monitor stands along both side walls, a glass observation partition, a second table in big theatres
  for (let v = 3; v < r.back - 1; v += 2) for (const u of [0, r.w - 1]) { if (!r.free(u, v) || !r.empty(u, 0, v)) continue; r.put(u, 0, v, (v % 4 === 3) ? B.CHEST : TRIM); if (v % 4 !== 3) r.put(u, 1, v, B.CONSOLE); }
  if (r.w >= 14) {
    const u2 = cu + 6;
    r.put(u2, 0, cv, TRIM); r.put(u2 + 1, 0, cv, TRIM); r.put(u2, 0, cv + 1, TRIM); r.put(u2 + 1, 0, cv + 1, TRIM); r.put(u2, 1, cv, SLAB); r.put(u2 + 1, 1, cv, SLAB); r.put(u2, 1, cv + 1, WOOL); r.put(u2 + 1, 1, cv + 1, WOOL);
    r.put(u2 + 3, 0, cv, BLACK); r.put(u2 + 3, 1, cv, B.CONSOLE); r.work(u2 - 1, cv - 1, 'surgeon');
    for (let v = 1; v <= r.back; v++) { if (v >= cv - 1 && v <= cv + 2) continue; r.put(cu + 4, 0, v, GLASS); r.put(cu + 4, 1, v, GLASS); }
    r.putRaw(u2, 3, cv, BLUE);
  }
  if (r.back >= 10) for (let u = 2; u < r.w - 2; u += 4) { r.put(u, 0, 2, TRIM); r.put(u, 1, 2, (u % 8 === 2) ? B.SHELF : B.CHEST); }
  for (let u = 0; u < r.w; u += 2) for (let v = 0; v <= r.back; v += 2) r.putRaw(u, 4, v, GLOW);   // bright ceiling
  r.putRaw(cu, 3, cv, BLUE); r.putRaw(cu + 1, 3, cv + 1, BLUE);
  r.finalize();
  bp.room('surgery', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// morgue cold storage: blue and quiet, drawer banks of chests in black frames, examination slabs
function morgue(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  carve(bp, x0, z0, x1, z1, y, STONE);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'morgue', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 5 ? STONE : BWOOL);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 3 === 1 ? BLACK : B.CHEST); r.put(u, 1, r.back, u % 3 === 1 ? BLACK : B.CHEST); r.put(u, 2, r.back, BLACK); }
  for (let v = 3; v < r.back - 2; v += 3) { r.put(r.cu, 0, v, TRIM); r.put(r.cu + 1, 0, v, TRIM); r.put(r.cu, 1, v, SLAB); r.put(r.cu + 1, 1, v, WOOL); }
  r.put(0, 0, 2, B.CONSOLE); r.work(1, 2, 'coroner droid'); r.put(r.w - 1, 0, 2, SNOW); r.put(r.w - 1, 0, 3, SNOW);
  r.ceilingLights(4, BLUE); r.finalize();
  bp.room('morgue', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// bacta tank hall: triple height (y..y+13), six steel-glass cylinders lit blue from inside, catwalks at the two
// upper levels with railings, monitoring consoles at the foot of each tank
function bactaHall(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, STONE, 14);
  patternFloor(bp, x0, z0, x1, z1, y - 1, STONE, BWOOL, 5);
  for (let x = x0 + 2; x <= x1 - 2; x += 5) for (let z = z0 + 2; z <= z1 - 2; z += 5) bp.set(x, y - 1, z, GLOW);   // lit floor grid under the tanks
  for (let z = z0 + 2; z <= z1 - 2; z += 4) for (const yy of [y + 3, y + 8]) { bp.set(x0 - 1, yy, z, BLUE); bp.set(x1 + 1, yy, z, GLOW); }
  const tanks = [];
  for (let k = 0; k < 6; k++) { const cx = x0 + 5 + (k % 2) * 10, cz = z0 + 7 + Math.floor(k / 2) * 16; tanks.push([cx, cz]); }
  for (const [cx, cz] of tanks) {
    bp.disc(cx + 0.5, cz + 0.5, 3.6, y - 1, y - 1, TRIM);
    bp.disc(cx + 0.5, cz + 0.5, 3.6, y, y + 10, GLASS, true);
    bp.disc(cx + 0.5, cz + 0.5, 2.5, y, y + 10, AIR);
    bp.fill(cx, y, cz, cx + 1, y + 10, cz + 1, BLUE);                                  // the lit core
    bp.disc(cx + 0.5, cz + 0.5, 3.6, y + 11, y + 11, TRIM);
    bp.set(cx, y + 12, cz, BLUE); bp.set(cx + 1, y + 12, cz + 1, BLUE);
    bp.set(cx - 4, y, cz, BLACK); bp.set(cx - 4, y + 1, cz, B.CONSOLE); bp.work(cx - 4, y, cz + 1, 'bacta tech');
    bp.set(cx + 5, y, cz + 1, SLAB); bp.spot(cx + 5, y, cz + 1, 'seat');
  }
  // catwalks at the two upper levels (walk y+5 and y+10) along the room's centre line with cross bridges
  for (const cy of [y + 4, y + 9]) {
    const mx = x0 + 10;                                                                  // between the two tank columns
    bp.fill(mx, cy, z0, mx + 1, cy, z1, PLATE);
    bp.fill(mx - 1, cy + 1, z0, mx - 1, cy + 1, z1, BARS); bp.fill(mx + 2, cy + 1, z0, mx + 2, cy + 1, z1, BARS);
    for (const bz of [z0 + 15, z0 + 31]) {                                               // bridges through the gaps between tank rows
      bp.fill(x0, cy, bz, x1, cy, bz + 1, PLATE);
      bp.fill(x0, cy + 1, bz - 1, x1, cy + 1, bz - 1, BARS); bp.fill(x0, cy + 1, bz + 2, x1, cy + 1, bz + 2, BARS);
      bp.fill(mx - 1, cy + 1, bz, mx + 2, cy + 1, bz + 1, AIR);
    }
    for (const [cx, cz] of tanks) { bp.disc(cx + 0.5, cz + 0.5, 3.6, cy, cy + 1, GLASS, true); bp.disc(cx + 0.5, cz + 0.5, 2.5, cy, cy + 1, AIR); bp.fill(cx, cy, cz, cx + 1, cy + 1, cz + 1, BLUE); }
    bp.set(mx, cy + 4, z0 + 3, GLOW); bp.set(mx + 1, cy + 4, z1 - 3, GLOW);
  }
  for (let x = x0 + 2; x <= x1 - 2; x += 4) for (let z = z0 + 2; z <= z1 - 2; z += 4) bp.set(x, y + 14, z, (x + z) % 3 ? GLOW : BLUE);
  for (let z = z0; z <= z1; z += 3) { bp.set(x0 - 1, y + 2, z, (z % 2) ? HOLO : BLUE); bp.set(x0 - 1, y + 7, z, HOLO); bp.set(x0 - 1, y + 12, z, BLUE); }
  bp.room('bacta_hall', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  bp.room('bacta_catwalk', x0 - 1, y + 5, z0 - 1, x1 + 1, z1 + 1);
  bp.room('bacta_catwalk', x0 - 1, y + 10, z0 - 1, x1 + 1, z1 + 1);
}
// reception and waiting hall: double height, reception desks, triage bays, benches, planters, holo boards
function receptionHall(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, WHITE, 9);
  patternFloor(bp, x0, z0, x1, z1, y - 1, WHITE, STONE, 4);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x + z) % 8 === 0) bp.set(x, y - 1, z, BLUE);
  const cx = DOOR_X, rz = z1 - 9;
  for (let x = cx - 7; x <= cx + 8; x++) { bp.set(x, y, rz, TRIM); bp.set(x, y + 1, rz, (x - cx) % 4 === 0 ? B.CONSOLE : SLAB); }
  for (let x = cx - 5; x <= cx + 6; x += 4) bp.work(x, y, rz - 1, 'receptionist');
  bp.fill(cx - 7, y + 4, rz, cx + 8, y + 4, rz, HOLO); bp.set(cx, y + 5, rz, RED); bp.set(cx + 1, y + 5, rz, RED); bp.fill(cx - 1, y + 6, rz, cx + 2, y + 6, rz, RED); bp.set(cx, y + 7, rz, RED); bp.set(cx + 1, y + 7, rz, RED);
  // triage bays along the west and east walls: bed, console, glass screen
  for (let z = z0 + 2; z + 3 <= rz - 3; z += 5) for (const [bx, dir] of [[x0 + 1, 1], [x1 - 1, -1]]) {
    bp.set(bx, y, z, B.BED_HEAD); bp.set(bx + dir, y, z, B.BED_FOOT); bp.bed(bx + dir, y, z + 1);
    bp.set(bx, y, z + 1, TRIM); bp.set(bx, y + 1, z + 1, B.CONSOLE);
    bp.fill(bx, y, z + 2, bx + dir * 2, y + 1, z + 2, GLASS);
    bp.set(bx + dir * 2, y + 3, z, BLUE);
  }
  // waiting benches in rows facing the desk, planters, holo boards on pillars
  for (let z = rz + 2; z <= z1 - 2; z += 2) for (let x = x0 + 5; x <= x1 - 5; x++) { if (Math.abs(x - cx) <= 4 || (x - x0) % 6 === 0) continue; bp.set(x, y, z, SLAB); bp.spot(x, y, z, 'seat'); }
  // information kiosks and med-droid stations in the triage zone
  for (let z = z0 + 3; z < rz - 3; z += 6) for (const x of [cx - 10, cx + 11]) { bp.set(x, y, z, TRIM); bp.set(x, y + 1, z, B.CONSOLE); bp.set(x + 1, y, z, BLACK); bp.set(x + 1, y + 1, z, HOLO); bp.work(x, y, z + 1, 'med droid'); bp.set(x - 1, y, z, B.CHEST); }
  for (let x = x0 + 6; x <= x1 - 6; x += 7) for (const z of [rz + 2, z1 - 1]) { if (Math.abs(x - cx) <= 4) continue; bp.set(x, y, z, STONE); bp.set(x, y + 1, z, B.OAK_LEAVES); }
  for (const x of [x0 + 3, x1 - 3]) for (const z of [z0 + 4, rz - 2, z1 - 3]) { bp.fill(x, y, z, x, y + 7, z, TRIM); bp.set(x, y + 8, z, GLOW); bp.set(x, y + 3, z, HOLO); bp.set(x, y + 4, z, HOLO); }
  for (let x = x0 + 2; x <= x1 - 2; x += 4) for (let z = z0 + 2; z <= z1 - 2; z += 4) bp.set(x, y + 9, z, (x + z) % 3 ? GLOW : BLUE);
  for (const x of [cx - 3, cx + 4]) { bp.fill(x, y, z1 - 3, x, y + 2, z1 - 3, TRIM); bp.set(x, y + 3, z1 - 3, BLUE); }
  bp.room('reception_hall', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  bp.meta.lobby = { x: bp.wx(cx), y: bp.wy(y), z: bp.wz(rz + 4) };
}
// ambulance pad cantilevered off the tower's east face: slab, chrome edge, railings, lamps, a parked speeder
// ambulance, and the emergency receiving bay door in the tower wall
function ambulancePad(bp) {
  const { x0, z0, x1, z1, y } = PAD;
  bp.fill(x0, y, z0, x1, y, z1, PLATE);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x - x0) % 4 === 0 || (z - z0) % 4 === 0) bp.set(x, y, z, STONE);
  bp.fill(x0, y, z0, x1, y, z0, TRIM); bp.fill(x0, y, z1, x1, y, z1, TRIM); bp.fill(x1, y, z0, x1, y, z1, TRIM);
  bp.fill(x0, y + 1, z0, x1, y + 1, z0, BARS); bp.fill(x0, y + 1, z1, x1, y + 1, z1, BARS); bp.fill(x1, y + 1, z0, x1, y + 1, z1, BARS);
  bp.fill(x0 + 6, y + 1, z0, x0 + 9, y + 1, z0, AIR); bp.fill(x0 + 6, y + 1, z1, x0 + 9, y + 1, z1, AIR);
  for (let a = 0; a < 24; a++) { const cx = x0 + 12.5, cz = (z0 + z1) / 2 + 0.5, x = Math.round(cx + 5 * Math.cos(a / 24 * Math.PI * 2)), z = Math.round(cz + 5 * Math.sin(a / 24 * Math.PI * 2)); bp.set(x, y, z, RED); }
  bp.fill(x0 + 12, y, z0 + 7, x0 + 13, y, z0 + 7, WOOL); bp.fill(x0 + 12, y, z0 + 6, x0 + 13, y, z0 + 8, WOOL);
  // braces under the slab back to the tower wall
  for (const z of [z0 + 1, (z0 + z1) >> 1, z1 - 1]) for (let x = x0; x <= x1 - 2; x += 2) bp.set(x, y - 1 - Math.floor((x - x0) / 5), z, TRIM);
  // speeder ambulance: white hull with red stripe, blue lights, glass canopy, rear doors open
  const sx = x0 + 10, sz = (z0 + z1) >> 1;
  bp.fill(sx, y + 1, sz - 1, sx + 6, y + 2, sz + 1, WOOL); bp.fill(sx + 1, y + 2, sz, sx + 5, y + 2, sz, AIR);
  bp.fill(sx, y + 2, sz - 1, sx + 6, y + 2, sz - 1, RED); bp.fill(sx, y + 2, sz + 1, sx + 6, y + 2, sz + 1, RED);
  bp.fill(sx + 6, y + 2, sz - 1, sx + 7, y + 2, sz + 1, GLASS); bp.fill(sx + 7, y + 1, sz - 1, sx + 7, y + 1, sz + 1, WOOL);
  bp.fill(sx - 1, y + 1, sz - 1, sx - 1, y + 2, sz + 1, AIR); bp.set(sx - 1, y + 1, sz, B.BED_FOOT); bp.set(sx, y + 1, sz, B.BED_HEAD);
  bp.set(sx + 3, y + 3, sz, BLUE); bp.set(sx + 1, y + 3, sz, RED); bp.set(sx + 5, y + 3, sz, RED);
  for (const dz of [-2, 2]) { bp.fill(sx + 1, y + 1, sz + dz, sx + 5, y + 1, sz + dz, STONE); bp.set(sx + 3, y + 1, sz + dz, BLUE); }
  for (const [x, z] of [[x1 - 1, z0 + 1], [x1 - 1, z1 - 1]]) lampPost(bp, x, y + 1, z, 2, B.CITY_LAMP);
  bp.fill(x0 + 2, y + 1, z0 + 1, x0 + 2, y + 1, z0 + 1, B.CHEST); bp.set(x0 + 3, y + 1, z0 + 1, B.BARREL); bp.set(x0 + 2, y + 1, z1 - 1, B.CRATE);
  bp.room('ambulance_pad', x0, y + 1, z0, x1, z1);
}
function roofGarden(bp) {
  const y = GARDEN_Y, x0 = TOWER.x0, z0 = TOWER.z0, x1 = TOWER.x1, z1 = TOWER.z1;
  // lawns between stone paths (a 6-grid), hedges and trees in the lawn squares
  for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) {
    const path = (x - x0) % 6 === 0 || (z - z0) % 6 === 0 || (x >= 37 && x <= 47 && z >= 44 && z <= 56) || (x >= STAIR.x - 1 && x <= STAIR.x + 8 && z >= STAIR.z - 1 && z <= STAIR.z + 12) || (x >= 52 && x <= 61 && z >= 36 && z <= 41);
    bp.set(x, y - 1, z, path ? ((x + z) % 2 ? WHITE : STONE) : B.GRASS);
    if (!path && (x + z) % 7 === 0) bp.set(x, y, z, (x % 3) ? B.POPPY : B.DANDELION);
  }
  bp.walls(x0, y, z0, x1, y, z1, TRIM); bp.walls(x0, y + 1, z0, x1, y + 1, z1, BARS);
  for (let x = x0 + 4; x <= x1 - 4; x += 12) for (let z = z0 + 4; z <= z1 - 4; z += 12) { if (x >= STAIR.x - 2 && x <= STAIR.x + 9 && z >= STAIR.z - 2 && z <= STAIR.z + 13) continue; if (x >= 51 && x <= 62 && z >= 35 && z <= 42) continue; bp.fill(x, y, z, x, y + 2, z, B.OAK_LOG); bp.fill(x - 1, y + 2, z - 1, x + 1, y + 4, z + 1, B.OAK_LEAVES); bp.set(x, y + 5, z, B.OAK_LEAVES); }
  for (let x = x0 + 3; x <= x1 - 3; x += 6) for (let z = z0 + 3; z <= z1 - 3; z += 6) {
    if (x >= STAIR.x - 1 && x <= STAIR.x + 8 && z >= STAIR.z - 1 && z <= STAIR.z + 12) continue;
    if (x >= 52 && x <= 61 && z >= 36 && z <= 41) continue;
    const k = ((x + z) / 6) % 4;
    if (k === 0) { bp.fill(x, y - 1, z, x + 1, y - 1, z + 1, B.GRASS); bp.set(x, y, z, B.OAK_LEAVES); bp.set(x + 1, y, z + 1, B.OAK_LEAVES); bp.set(x + 1, y + 1, z + 1, B.OAK_LEAVES); }
    else if (k === 1) { bp.set(x, y - 1, z, B.WATER); bp.set(x + 1, y - 1, z, B.WATER); bp.set(x, y - 1, z + 1, B.WATER); bp.set(x + 1, y - 1, z + 1, B.WATER); bp.walls(x - 1, y - 1, z - 1, x + 2, y - 1, z + 2, TRIM); }
    else if (k === 2) { bp.set(x, y, z, SLAB); bp.spot(x, y, z, 'seat'); bp.set(x + 1, y, z, SLAB); bp.spot(x + 1, y, z, 'seat'); bp.set(x, y, z + 1, STONE); bp.set(x, y + 1, z + 1, B.OAK_LEAVES); }
    else { bp.fill(x, y, z, x, y + 3, z, TRIM); bp.set(x, y + 4, z, GLOW); bp.fill(x - 2, y + 4, z - 2, x + 2, y + 4, z + 2, GLASS); bp.set(x, y + 4, z, GLOW); }
  }
  for (let x = x0 + 4; x <= x1 - 4; x += 12) for (const z of [z0 + 1, z1 - 1]) lampPost(bp, x, y, z, 2, B.CITY_LAMP);
  bp.fill(x0 + 2, y, z0 + 2, x0 + 2, y + 2, z0 + 2, TRIM); bp.set(x0 + 2, y + 3, z0 + 2, RED);
  bp.room('roof_garden', x0, y, z0, x1, z1);
}

// ------------------------------------------------------------------------------------------------ circulation
function stairCore(bp, tx0, tz0, f0, f1, roofTo) {
  const y0 = walk(f0), yTop = walk(f1);
  bp.fill(tx0, y0 - 1, tz0, tx0 + 7, roofTo, tz0 + 11, STONE);
  bp.fill(tx0 + 1, y0, tz0 + 1, tx0 + 6, roofTo - 1, tz0 + 10, AIR);
  bp.fill(tx0 + 1, y0 - 1, tz0 + 1, tx0 + 6, y0 - 1, tz0 + 10, WHITE);
  for (let f = f0; f < f1; f++) {
    const level = walk(f), east = (f - f0) % 2 === 0, xs = east ? [tx0 + 1, tx0 + 2] : [tx0 + 5, tx0 + 6];
    stairZ(bp, xs[0], xs[1], east ? tz0 + 1 : tz0 + 10, east ? 1 : -1, level, 5);
    bp.fill(tx0 + 1, level + 4, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level + 4, east ? tz0 + 10 : tz0 + 2, WHITE);
    bp.fill(tx0 + 3, level + 4, tz0 + 1, tx0 + 4, level + 4, tz0 + 10, WHITE);
    bp.set(tx0 + 3, level + 3, east ? tz0 + 10 : tz0 + 1, GLOW); bp.set(tx0 + 4, level + 3, east ? tz0 + 1 : tz0 + 10, BLUE);
    bp.set(tx0 + 6, level + 2, tz0 + 5, HOLO);
    bp.room('stairwell', tx0, level, tz0, tx0 + 7, tz0 + 11);
  }
  bp.set(tx0 + 3, yTop + 3, tz0 + 5, GLOW); bp.set(tx0 + 4, yTop + 3, tz0 + 6, BLUE);
  bp.set(tx0 + 1, yTop, tz0 + 1, B.CRATE); bp.set(tx0 + 1, yTop + 1, tz0 + 1, B.CRATE); bp.set(tx0 + 2, yTop, tz0 + 1, B.BARREL);
  bp.set(tx0 + 6, yTop, tz0 + 10, TRIM); bp.set(tx0 + 6, yTop + 1, tz0 + 10, B.CONSOLE); bp.set(tx0 + 5, yTop, tz0 + 10, SLAB); bp.spot(tx0 + 5, yTop, tz0 + 10, 'seat');
  bp.set(tx0 + 1, yTop, tz0 + 10, B.CHEST); bp.set(tx0 + 6, yTop, tz0 + 1, B.SHELF); bp.set(tx0 + 6, yTop + 1, tz0 + 1, B.SHELF);
  bp.room('stairwell', tx0, yTop, tz0, tx0 + 7, tz0 + 11);
  for (let f = f0; f <= f1; f++) doorway(bp, tx0, tz0 + 5, tx0, tz0 + 6, walk(f), 3, TRIM, BLUE);
}
function lifts(bp, y0, y1) {
  for (const l of LIFTS) {
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
const CUSTOM = { ward, surgery, morgue };
function place(bp, rng, name, x0, z0, x1, z1, y, side, doorU) {
  if (CUSTOM[name]) CUSTOM[name](bp, rng, x0, z0, x1, z1, y, side, doorU); else template(bp, rng, name, name, x0, z0, x1, z1, y, side, doorU, 2);
}
// three rooms across a band between the two full-depth corridors: west 31..40 (door E at 41), middle 46..59 (door
// onto the ring row), east 65..76 (door W at 64)
function bandRooms(bp, rng, names, z0, z1, ringZ, sideMid, y) {
  const du = Math.floor((z1 - z0 + 1) / 2) - 1;
  place(bp, rng, names[0], 31, z0, 40, z1, y, 'E', du); doorway(bp, 41, z0 + du, 41, z0 + du + 1, y, 3, TRIM, GLOW);
  place(bp, rng, names[1], 46, z0, 59, z1, y, sideMid, 6); doorway(bp, 52, ringZ, 53, ringZ, y, 3, TRIM, GLOW);
  place(bp, rng, names[2], 65, z0, 76, z1, y, 'W', du); doorway(bp, 64, z0 + du, 64, z0 + du + 1, y, 3, TRIM, GLOW);
}
function rowZ(bp, rng, names, za, zb, x0, x1, y, side, depths) {
  let z0 = za, i = 0;
  for (const rd of depths) {
    const z1 = Math.min(zb, z0 + rd - 1), name = names[i % names.length];
    const doorU = Math.floor((z1 - z0 + 1) / 2) - 1, dz = z0 + doorU, dx = side === 'E' ? x1 + 1 : x0 - 1;
    place(bp, rng, name, x0, z0, x1, z1, y, side, doorU);
    doorway(bp, dx, dz, dx, dz + 1, y, 3, TRIM, GLOW);
    z0 = z1 + 2; i++;
    if (z0 > zb) break;
  }
}
function towerFloor(bp, rng, f, plan, podium = false) {
  const y = walk(f);
  const zA = podium ? 5 : 23, zB = podium ? 88 : 70;
  for (const c of [CORR_W, CORR_E]) { carve(bp, c.x0, zA, c.x1, zB, y, WHITE); for (let z = zA; z <= zB; z++) { bp.set(c.x0 + 1, y - 1, z, (z % 6) ? STONE : BWOOL); if (z % 4 === 0) bp.set(c.x0 + 1, y + 4, z, (z % 8) ? GLOW : BLUE); } }
  for (const c of [RING_N, RING_S]) { carve(bp, CORR_W.x0, c.z0, CORR_E.x1, c.z1, y, WHITE); for (let x = CORR_W.x0; x <= CORR_E.x1; x += 4) bp.set(x, y + 4, c.z0 + 1, GLOW); }
  template(bp, rng, plan.closet || 'restroom', plan.closet || 'restroom', 53, 42, 59, 52, y, 'S', 2, 2);
  doorway(bp, 55, 53, 56, 53, y, 3, TRIM, GLOW);
  if (plan.N) bandRooms(bp, rng, plan.N, 23, 33, 34, 'S', y);
  if (plan.S) bandRooms(bp, rng, plan.S, 58, 70, 57, 'N', y);
  const zr = podium ? [[35, 42], [48, 56]] : [[35, 45], [47, 56]];
  for (const [x0, x1, side, dx] of [[31, 40, 'E', 41], [65, 76, 'W', 64]]) {
    const names = x0 === 31 ? plan.W : plan.E;
    if (!names) continue;
    zr.forEach(([a, b], i) => { if (!names[i]) return; place(bp, rng, names[i], x0, a, x1, b, y, side, Math.floor((b - a + 1) / 2) - 1); doorway(bp, dx, a + Math.floor((b - a + 1) / 2) - 1, dx, a + Math.floor((b - a + 1) / 2), y, 3, TRIM, GLOW); });
  }
  if (podium) { carve(bp, 27, 44, 44, 46, y, WHITE); carve(bp, 61, 44, 80, 46, y, WHITE); bp.set(35, y + 4, 45, GLOW); bp.set(70, y + 4, 45, GLOW); }
}
function podiumFloor(bp, rng, f, plan) {
  const y = walk(f);
  towerFloor(bp, rng, f, plan, true);
  for (const [x0, x1] of [[27, 29], [78, 80]]) { carve(bp, x0, 5, x1, 88, y, WHITE); for (let z = 6; z <= 88; z += 4) bp.set(x0 + 1, y + 4, z, (z % 8) ? GLOW : BLUE); }
  for (const [z0, z1] of [[18, 20], [73, 75]]) { carve(bp, 5, z0, 102, z1, y, WHITE); for (let x = 6; x <= 102; x += 4) bp.set(x, y + 4, z0 + 1, (x % 8) ? GLOW : BLUE); }
  for (const [x0, x1, side] of [[5, 25, 'E'], [81, 102, 'W']]) {
    const P = x0 === 5 ? plan.OW : plan.OE;
    if (!P) continue;
    if (P.north) rowZ(bp, rng, P.north, 5, 16, x0, x1, y, side, [12]);
    if (P.middle) rowZ(bp, rng, P.middle, 22, 71, x0, x1, y, side, P.middleDepths || [16, 16, 16]);
    if (P.south) rowZ(bp, rng, P.south, 77, 88, x0, x1, y, side, [12]);
  }
  if (plan.ON) bandRooms(bp, rng, plan.ON, 5, 16, 17, 'S', y);
  if (plan.OS) bandRooms(bp, rng, plan.OS, 77, 88, 76, 'N', y);
}

// ---------------------------------------------------------------------------------------------------- exterior
function facade(bp, box, yBase, yTop, pilaster) {
  const { x0, z0, x1, z1 } = box;
  for (let y = yBase; y <= yTop; y++) {
    const band = y % 5 === 0, win = y % 5 === 2 || y % 5 === 3;
    const pick = (a) => band ? TRIM : (a % pilaster === 0) ? STONE : win ? ((a % 3) ? GLASS : LIT) : WHITE;
    for (let x = x0; x <= x1; x++) { bp.set(x, y, z0, pick(x)); bp.set(x, y, z1, pick(x)); }
    for (let z = z0 + 1; z < z1; z++) { bp.set(x0, y, z, pick(z)); bp.set(x1, y, z, pick(z)); }
  }
}
function emblem(bp, cx, cy, z) {
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 7; x++) bp.set(x, y, z, WOOL);
  for (let y = cy - 5; y <= cy + 5; y++) { bp.set(cx, y, z, B.RED_WOOL); bp.set(cx + 1, y, z, B.RED_WOOL); }
  for (let x = cx - 5; x <= cx + 6; x++) { bp.set(x, cy, z, B.RED_WOOL); bp.set(x, cy + 1, z, B.RED_WOOL); }
  for (let x = cx - 6; x <= cx + 7; x++) { bp.set(x, cy - 6, z, TRIM); bp.set(x, cy + 6, z, TRIM); }
}
function boulevardPlatform(bp) {
  const y = walk(7);
  bp.fill(DOOR_X - 4, y - 1, 90, DOOR_X + 5, y - 1, 93, WHITE);
  for (let z = 90; z <= 93; z++) { bp.set(DOOR_X - 4, y - 1, z, STONE); bp.set(DOOR_X + 5, y - 1, z, STONE); bp.set(DOOR_X - 4, y, z, BARS); bp.set(DOOR_X + 5, y, z, BARS); }
  bp.fill(DOOR_X - 3, y, 89, DOOR_X + 4, y + 3, 93, AIR);
  bp.fill(DOOR_X - 4, y, 93, DOOR_X + 5, y, 93, AIR);
  for (const x of [DOOR_X - 4, DOOR_X + 5]) { bp.fill(x, y + 1, 91, x, y + 2, 91, BARS); bp.set(x, y + 3, 91, B.CITY_LAMP); }
  bp.door(DOOR_X, y, 93, 'S');
}

export const LANDMARK = {
  id: 'medcenter', name: 'Grand Republic Medical Facility', span: [2, 2], height: 110, minW: 106, minD: 92,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Grand Republic Medical Facility';
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) bp.set(x, 0, z, (x < 4 || z < 4 || x > 103 || z > 89) ? ((x + z) % 6 === 0 ? BLUE : STONE) : WHITE);
    bp.fill(PODIUM.x0, 1, PODIUM.z0, PODIUM.x1, PODIUM.top, PODIUM.z1, WHITE);
    bp.fill(TOWER.x0, PODIUM.top + 1, TOWER.z0, TOWER.x1, TOWER.top, TOWER.z1, WHITE);
    patternFloor(bp, PODIUM.x0 + 1, PODIUM.z0 + 1, PODIUM.x1 - 1, PODIUM.z1 - 1, PODIUM.top, WHITE, STONE, 6);
    bp.walls(PODIUM.x0, PODIUM.top + 1, PODIUM.z0, PODIUM.x1, PODIUM.top + 1, PODIUM.z1, BARS);
    // floors, top down
    const wards = { N: ['ward', 'ward', 'clinic_ward'], S: ['ward', 'medbay', 'ward'], W: ['clinic_ward', 'restroom'], E: ['ward', 'storage'], closet: 'restroom' };
    const surgical = { N: ['surgery', 'surgery', 'medbay'], S: ['surgery', 'clinic_ward', 'surgery'], W: ['droid_bay', 'storage'], E: ['ward', 'laundry'], closet: 'server_room' };
    const research = { N: ['server_room', 'workshop', 'library'], S: ['open_plan_office', 'meeting_room', 'open_plan_office'], W: ['workshop', 'storage'], E: ['clinic_ward', 'restroom'], closet: 'server_room' };
    const staff = { N: ['barracks', 'cafeteria', 'kitchen'], S: ['barracks', 'lounge', 'gym'], W: ['hotel_room', 'hotel_room'], E: ['barracks', 'laundry'], closet: 'restroom' };
    const admin = { N: ['executive_office', 'meeting_room', 'executive_office'], S: ['open_plan_office', 'archive', 'lounge'], W: ['meeting_room', 'storage'], E: ['executive_office', 'restroom'], closet: 'storage' };
    const emergency = { N: ['ward', 'surgery', 'ward'], S: ['ward', 'medbay', 'droid_bay'], W: ['storage', 'restroom'], E: [null, null], closet: 'server_room' };   // east band opens onto the ambulance pad
    for (let f = 20; f >= 7; f--) {
      const plan = f === 20 ? admin : f === 19 ? staff : f === 13 ? emergency : (f % 4 === 1) ? surgical : (f % 5 === 0) ? research : wards;
      towerFloor(bp, rng, f, plan);
    }
    // podium floors
    const pod = (extra) => ({ N: ['ward', 'ward', 'ward'], S: ['ward', 'medbay', 'ward'], W: ['clinic_ward', 'storage'], E: ['ward', 'restroom'], closet: 'restroom', ...extra });
    podiumFloor(bp, rng, 6, pod({ ON: ['cafeteria', 'kitchen', 'lounge'], OS: ['barracks', 'barracks', 'gym'], OW: { north: ['storage'], middle: ['hotel_room', 'hotel_room', 'hotel_room'], south: ['laundry'] }, OE: { north: ['storage'], middle: ['barracks', 'lounge', 'barracks'], south: ['restroom'] } }));
    podiumFloor(bp, rng, 5, pod({ ON: ['ward', 'clinic_ward', 'ward'], OS: ['open_plan_office', 'meeting_room', 'archive'], OW: { north: ['medbay'], middle: ['ward', 'ward', 'ward'], south: ['storage'] }, OE: { north: ['medbay'], middle: ['ward', 'ward', 'ward'], south: ['storage'] } }));
    podiumFloor(bp, rng, 4, pod({ N: ['surgery', 'surgery', 'surgery'], ON: ['droid_bay', 'workshop', 'server_room'], OS: ['surgery', 'surgery', 'medbay'], OW: { north: ['storage'], middle: ['surgery', 'surgery', 'droid_bay'], south: ['restroom'] }, OE: { north: ['storage'], middle: ['surgery', 'clinic_ward', 'surgery'], south: ['restroom'] } }));
    podiumFloor(bp, rng, 3, pod({ ON: ['library', 'open_plan_office', 'meeting_room'], OS: ['shop', 'shop', 'storage'], OW: { north: ['storage'], middle: null, south: ['medbay'] }, OE: { north: ['droid_bay'], middle: ['ward', 'ward', 'ward'], south: ['medbay'] } }));
    podiumFloor(bp, rng, 2, pod({ ON: ['ward', 'ward', 'ward'], OS: ['clinic_ward', 'medbay', 'clinic_ward'], OW: { north: ['storage'], middle: null, south: ['storage'] }, OE: { north: ['restroom'], middle: ['ward', 'ward', 'ward'], south: ['storage'] } }));
    podiumFloor(bp, rng, 1, pod({ S: null, ON: ['droid_bay', 'server_room', 'workshop'], OS: null, OW: { north: ['storage'], middle: null, south: ['lounge'] }, OE: { north: ['storage'], middle: ['surgery', 'surgery', 'surgery'], south: ['lounge'] } }));
    podiumFloor(bp, rng, 0, pod({ S: null, N: ['morgue', 'droid_bay', 'garage'], ON: ['garage', 'droid_bay', 'storage'], OS: null, OW: { north: ['security_post'], middle: null, south: null }, OE: { north: ['storage'], middle: ['medbay', 'surgery', 'medbay'], south: null } }));
    // the bacta tank hall fills the west outer band's middle section through three floors (walk 1..14)
    bactaHall(bp, rng, 5, 22, 25, 71, walk(0));
    for (const f of [0, 1, 2]) { doorway(bp, 26, 37, 26, 38, walk(f), 3, TRIM, BLUE); doorway(bp, 26, 53, 26, 54, walk(f), 3, TRIM, BLUE); }
    // ground: pharmacy and cafeteria at the south corners, the double-height reception hall, the entrance
    template(bp, rng, 'shop', 'pharmacy', 5, 77, 25, 88, walk(0), 'E', 4, 2); doorway(bp, 26, 81, 26, 82, walk(0), 3, TRIM, GLOW);
    template(bp, rng, 'cafeteria', 'cafeteria', 81, 77, 102, 88, walk(0), 'W', 4, 2); doorway(bp, 80, 81, 80, 82, walk(0), 3, TRIM, GLOW);
    receptionHall(bp, rng, 31, 58, 76, 88, walk(0));
    for (const x0 of [42, 61]) { bp.fill(x0, walk(0), 57, x0 + 2, walk(0) + 3, 57, AIR); bp.fill(x0 - 1, walk(0), 57, x0 - 1, walk(0) + 4, 57, TRIM); bp.fill(x0 + 3, walk(0), 57, x0 + 3, walk(0) + 4, 57, TRIM); bp.fill(x0, walk(0) + 4, 57, x0 + 2, walk(0) + 4, 57, BLUE); }
    doorway(bp, 30, 66, 30, 67, walk(0), 3, TRIM, GLOW); doorway(bp, 77, 66, 77, 67, walk(0), 3, TRIM, GLOW);
    doorway(bp, 30, 82, 30, 83, walk(0), 3, TRIM, GLOW); doorway(bp, 77, 82, 77, 83, walk(0), 3, TRIM, GLOW);
    bp.door(DOOR_X, walk(0), 89, 'S');
    // level 6 void over the reception hall (rails at the corridor ends) and the level 6 / 11 bacta hall voids
    bp.fill(31, walk(1) - 1, 58, 76, walk(1) - 1, 88, AIR); bp.fill(31, walk(1), 58, 76, walk(1) + 3, 88, AIR);
    bp.fill(42, walk(1) - 1, 57, 44, walk(1) - 1, 57, WHITE); bp.fill(61, walk(1) - 1, 57, 63, walk(1) - 1, 57, WHITE);
    bp.fill(42, walk(1), 57, 44, walk(1), 57, BARS); bp.fill(61, walk(1), 57, 63, walk(1), 57, BARS);
    // circulation
    lifts(bp, 1, GARDEN_Y);
    stairCore(bp, STAIR.x, STAIR.z, 0, 21, GARDEN_Y + 3);
    // podium roof terrace dressing, the boulevard platform and the tower's south door
    for (let x = PODIUM.x0 + 4; x <= PODIUM.x1 - 4; x += 10) for (const z of [PODIUM.z0 + 3, PODIUM.z1 - 3]) { if (x >= TOWER.x0 - 2 && x <= TOWER.x1 + 2 && z > TOWER.z0 - 3 && z < TOWER.z1 + 3) continue; bp.set(x, PODIUM.top + 1, z, STONE); bp.set(x, PODIUM.top + 2, z, B.OAK_LEAVES); bp.set(x + 2, PODIUM.top + 1, z, SLAB); bp.spot(x + 2, PODIUM.top + 1, z, 'seat'); lampPost(bp, x - 2, PODIUM.top + 1, z, 2, B.CITY_LAMP); }
    boulevardPlatform(bp);
    // facades, emblem, blue strips, ambulance pad, roof garden
    facade(bp, PODIUM, 1, PODIUM.top, 6);
    facade(bp, TOWER, PODIUM.top + 1, TOWER.top, 8);
    for (const [x, z] of [[TOWER.x0, TOWER.z0], [TOWER.x1, TOWER.z0], [TOWER.x0, TOWER.z1], [TOWER.x1, TOWER.z1]]) bp.fill(x, PODIUM.top + 1, z, x, TOWER.top + 1, z, BLUE);
    for (const [x, z] of [[PODIUM.x0, PODIUM.z0], [PODIUM.x1, PODIUM.z0], [PODIUM.x0, PODIUM.z1], [PODIUM.x1, PODIUM.z1]]) bp.fill(x, 1, z, x, PODIUM.top + 1, z, TRIM);
    emblem(bp, 53, 88, TOWER.z1); emblem(bp, 53, 20, PODIUM.z1);
    for (let y = 45; y <= TOWER.top; y += 20) for (const x of [TOWER.x0, TOWER.x1]) for (let z = TOWER.z0 + 2; z <= TOWER.z1 - 2; z += 2) bp.set(x, y, z, (z % 4) ? BLUE : GLOW);
    ambulancePad(bp);
    // emergency receiving bay: the tower's east band at the pad level opens onto the pad through a wide door
    carve(bp, 65, 40, 76, 54, walk(13), WHITE);
    for (let x = 66; x <= 75; x += 3) for (const z of [41, 53]) { bp.set(x, walk(13), z, B.BED_HEAD); bp.set(x, walk(13), z + (z === 41 ? 1 : -1), B.BED_FOOT); bp.bed(x + 1, walk(13), z); bp.set(x + 1, walk(13), z, TRIM); bp.set(x + 1, walk(13) + 1, z, B.CONSOLE); }
    for (let x = 66; x <= 75; x += 4) bp.set(x, walk(13) + 4, 47, GLOW);
    bp.set(70, walk(13), 47, TRIM); bp.set(70, walk(13) + 1, 47, B.CONSOLE); bp.work(69, walk(13), 47, 'triage droid');
    doorway(bp, 77, 45, 77, 49, walk(13), 3, TRIM, RED);
    bp.fill(77, walk(13), 45, 77, walk(13) + 2, 49, AIR);
    doorway(bp, 64, 46, 64, 47, walk(13), 3, TRIM, GLOW);
    bp.room('emergency_bay', 64, walk(13), 39, 77, 55);
    roofGarden(bp);
    // ground entrance canopy and doors
    bp.fill(DOOR_X - 7, 6, PODIUM.z1 + 1, DOOR_X + 8, 6, PODIUM.z1 + 3, GLASS); bp.fill(DOOR_X - 7, 6, PODIUM.z1 + 3, DOOR_X + 8, 6, PODIUM.z1 + 3, TRIM);
    for (let x = DOOR_X - 7; x <= DOOR_X + 8; x += 5) bp.fill(x, 1, PODIUM.z1 + 3, x, 5, PODIUM.z1 + 3, TRIM);
    for (let x = DOOR_X - 6; x <= DOOR_X + 7; x += 4) bp.set(x, 5, PODIUM.z1 + 1, GLOW);
    doorway(bp, DOOR_X, PODIUM.z1, DOOR_X + 1, PODIUM.z1, walk(0), 4, TRIM, BLUE);
    bp.fill(DOOR_X - 3, 1, PODIUM.z1, DOOR_X - 2, 4, PODIUM.z1, GLASS); bp.fill(DOOR_X + 3, 1, PODIUM.z1, DOOR_X + 4, 4, PODIUM.z1, GLASS);
    doorway(bp, DOOR_X, TOWER.z1, DOOR_X + 1, TOWER.z1, walk(7), 3, TRIM, BLUE);
    bp.door(DOOR_X, walk(7), TOWER.z1, 'S');
    bp.meta.floors = []; for (let f = 0; f <= 21; f++) bp.meta.floors.push(bp.y0 + walk(f));
  },
};
