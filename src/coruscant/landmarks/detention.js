// Republic Judiciary Central Detention Center (docs/rubrics/06_landmarks.md, id 'detention').
//
// A brooding stepped fortress: a five-storey base block of black panelling with hull-plate floor bands, narrow lit
// slits and red hazard bands; a four-storey upper block set back on the base roof terrace; a three-storey keep on
// top carrying the gunship landing deck with a parked voxel gunship; four corner watchtowers with searchlight masts.
// Inside: an intake hall behind the ground door (reception desk, scanner arches, guard posts), cell blocks in the
// Death Star idiom (black corridors under red ceilings, rows of 3x3 cells behind blue force-field doorways, holo cell
// numbers), an interrogation floor, the guard floor (mess, kitchen, barracks, gym, medbay), a control room whose
// steel-glass floor looks straight down into the central spine corridor, briefing rooms, comms, the visitor level
// with a hearing room at the boulevard door, the warden's suite and records, tactical ops and crew quarters in the
// keep. A central spine corridor with two turbolift shafts runs the full length of every base and upper floor; a
// switchback stair core serves each block. Pure function of the lot and ctx.rng.
//
// Local frame: x 0..84 (west -> east), z 0..101 (north -> south; front = S), y 0 = repaved plateau, walk level 1;
// floors on y = 5f (walk 5f + 1); base f 0..4, upper f 5..8 (walk 26 / 31 / 36 = boulevard door / 41), keep f 9..11,
// landing deck slab y 60 (walk 61).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const BLACK = B.PANEL_BLACK, DARK = B.DURASTEEL_DARK, HULL = B.HULL_PLATE, PLATE = B.DECK_PLATE, STEEL = B.DURASTEEL;
const RED = B.PANEL_RED, STRIPE = B.PANEL_STRIPE, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, HOLO = B.HOLO_SIGN;
const TRIM = B.CHROME, GLASS = B.STEEL_GLASS, BARS = B.IRON_BARS, SLAB = B.STONE_BRICK_SLAB;

const W = 85, D = 102;
const BASE = { x0: 2, z0: 2, x1: 82, z1: 99, top: 25 };        // outer walls inclusive; roof slab y 25
const UPPER = { x0: 12, z0: 12, x1: 72, z1: 89, top: 45 };
const KEEP = { x0: 28, z0: 34, x1: 60, z1: 66, top: 60 };
const SPINE = { x0: 39, x1: 45 };                                // central corridor (7 wide, north-south)
const LIFTS = [{ x: 37, z: 48, face: 39 }, { x: 46, z: 48, face: 45 }];   // 2x2 shafts sunk into both spine walls
const TOWERS = [[2, 2], [76, 2], [2, 93], [76, 93]];              // 7x7 watchtowers (x0, z0)
const TOWER_TOP = 48;
const DOOR_X = 42;                                               // lot.door column (2 wide: 42..43)
const walk = (f) => 1 + 5 * f;

// --------------------------------------------------------------------------------------------------- primitives
function stairZ(bp, x0, x1, z0, dz, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK); bp.set(x, yTop, z, slab ? SLAB : STEEL); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
// carve a box of air (walk level y, 4 clear) over a patterned floor slab
function carve(bp, x0, z0, x1, z1, y, floor = PLATE, h = 4) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  bp.fill(x0, y - 1, z0, x1, y - 1, z1, floor);
}
function patternFloor(bp, x0, z0, x1, z1, y, a = PLATE, b = STRIPE, period = 6) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, y, z, (x % period === 0 || z % period === 0) ? b : a);
}
// 2-wide (or 1-wide) doorway through a wall row/column at walk level y with a chrome frame and a lit lintel
function doorway(bp, x0, z0, x1, z1, y, h = 3, frame = TRIM, lintel = GLOW) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y, z0, x0 - 1, y + h, z0, frame); bp.fill(x1 + 1, y, z0, x1 + 1, y + h, z0, frame); bp.fill(x0, y + h, z0, x1, y + h, z0, lintel); }
  else { bp.fill(x0, y, z0 - 1, x0, y + h, z0 - 1, frame); bp.fill(x0, y, z1 + 1, x0, y + h, z1 + 1, frame); bp.fill(x0, y + h, z0, x0, y + h, z1, lintel); }
}
function lampPost(bp, x, y, z, h = 2, id = B.CITY_LAMP) { bp.fill(x, y, z, x, y + h - 1, z, BARS); bp.set(x, y + h, z, id); }

// Extra dressing for big rooms so the library templates (sized for tower floors) do not leave them bare:
// lockers / crates / consoles along the back wall, wall lights and planters on the sides, furniture islands
const DRESS = [B.SHELF, B.CRATE, B.BARREL, B.CHEST, B.CONSOLE, B.IRON_BLOCK];
const CIVIC = new Set(['courtroom', 'control_room', 'executive_office', 'meeting_room', 'lobby_atrium', 'archive', 'library', 'medbay', 'clinic_ward', 'council_chamber', 'holo_theatre', 'observation_deck', 'gallery', 'museum_hall', 'lounge', 'restaurant', 'cafeteria', 'open_plan_office']);
// civic rooms get shelves, consoles, benches, planters and holo boards; the crate-and-barrel filler is for stores
function dress(r, rng, civic = false) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(civic ? DRESS.filter((d) => d !== B.CRATE && d !== B.BARREL && d !== B.CHEST) : DRESS); r.put(u, 0, r.back, id === B.CONSOLE ? BLACK : id); if (id === B.SHELF || id === B.CONSOLE) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 3) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 4 === 0) r.planter(u, v, B.OAK_LEAVES); else { r.put(u, 0, v, BLACK); r.put(u, 1, v, (v % 2) ? HOLO : RED); } }
  if (r.w >= 10 && r.d >= 8) {
    let k = 0;
    for (let u = 3; u < r.w - 3; u += 5) for (let v = 4; v < r.back - 2; v += 5) {
      if (!r.free(u, v) || !r.empty(u, 0, v) || !r.free(u + 1, v) || !r.empty(u + 1, 0, v)) continue;
      const kind = (k++ + u) % 4;
      if (kind === 0) { r.table(u, v); r.table(u + 1, v); r.seat(u - 1, v); r.seat(u + 2, v); r.seat(u, v + 1); r.seat(u + 1, v - 1); }
      else if (kind === 1) { if (civic) { r.table(u, v); r.table(u + 1, v); r.seat(u, v + 1); r.seat(u + 1, v + 1); r.put(u - 1, 0, v, B.SHELF); } else { r.put(u, 0, v, B.CRATE); r.put(u, 1, v, B.CRATE); r.put(u + 1, 0, v, B.BARREL); r.put(u, 0, v + 1, B.CHEST); } }
      else if (kind === 2) { r.fill(u, 0, v, u, 2, v + 1, TRIM); r.put(u, 3, v, GLOW); r.put(u + 1, 0, v, BLACK); r.put(u + 1, 1, v, B.CONSOLE); r.seat(u + 1, v + 1); }
      else { r.fill(u, 0, v, u, 2, v + 2, BLACK); r.put(u, 1, v + 1, HOLO); r.seat(u + 1, v + 1); r.seat(u - 1, v + 1); }
    }
  }
}
// Furnish an interior box with a library template (door on `side`, first door cell at u = doorU) and register it.
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, lights = GLOW, floor = PLATE) {
  carve(bp, x0, z0, x1, z1, y, floor);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  if (r.w * r.d >= 60) dress(r, rng, CIVIC.has(name) || CIVIC.has(kind));
  r.ceilingLights(4, lights); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}

// ------------------------------------------------------------------------------------------------------ rooms
// interrogation room: the chair under one lamp, a console desk, a black mirror wall, restraints, a recorder droid
function interrogation(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  carve(bp, x0, z0, x1, z1, y, BLACK);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 1 }, 'interrogation', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 2 ? BLACK : DARK);
  const cu = r.cu, cv = Math.max(2, r.back - 2);
  r.put(cu, 0, cv, SLAB); r.spot(cu, cv, 'seat');                       // the chair
  r.putRaw(cu, 3, cv, B.LANTERN);                                        // one lamp straight above it
  r.put(cu - 1, 0, cv - 1, BARS); r.put(cu + 1, 0, cv - 1, BARS);        // restraint posts
  r.put(0, 0, r.back, BLACK); r.put(0, 1, r.back, B.CONSOLE); r.work(1, r.back, 'interrogator');
  r.put(r.w - 1, 0, r.back, BLACK); r.put(r.w - 1, 1, r.back, HOLO);
  for (let u = 1; u < r.w - 1; u++) r.put(u, 2, r.back, GLASS);           // the black mirror strip
  r.put(r.w - 1, 0, 1, B.PANEL_BLACK); r.put(r.w - 1, 1, 1, B.VENT);
  r.put(0, 0, 1, B.CHEST);
  r.finalize();
  bp.room('interrogation', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// guard post: console, weapon rack, seat, holo board, red alarm panel
function guardPost(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = template(bp, rng, 'security_post', 'guard_post', x0, z0, x1, z1, y, side, doorU, 1, GLOW);
  r.putRaw(0, 2, r.back, RED); r.putRaw(r.w - 1, 2, r.back, RED);
}
// the intake hall: chrome reception desk facing the door, scanner arches, benches, guard rails, holo boards
function intakeHall(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, PLATE);
  patternFloor(bp, x0, z0, x1, z1, y - 1, PLATE, STRIPE, 5);
  const cx = DOOR_X;
  // scanner arches across the entry lane (chrome posts, blue field lintel), guard rails either side of the lane
  for (const z of [z1 - 3, z1 - 7]) {
    bp.fill(cx - 2, y, z, cx - 2, y + 2, z, TRIM); bp.fill(cx + 3, y, z, cx + 3, y + 2, z, TRIM);
    bp.fill(cx - 2, y + 3, z, cx + 3, y + 3, z, BLUE);
    bp.set(cx - 3, y, z, B.CONSOLE); bp.set(cx + 4, y, z, B.CONSOLE);
    bp.work(cx - 4, y, z, 'scanner guard'); bp.work(cx + 5, y, z, 'scanner guard');
  }
  for (let z = z1 - 8; z <= z1 - 1; z++) { bp.set(cx - 5, y, z, BARS); bp.set(cx + 6, y, z, BARS); }
  // reception desk: a long chrome counter with consoles, staff behind it
  const dz = z1 - 12;
  for (let x = cx - 8; x <= cx + 9; x++) { bp.set(x, y, dz, BLACK); bp.set(x, y + 1, dz, (x - cx) % 4 === 0 ? B.CONSOLE : SLAB); }
  for (let x = cx - 6; x <= cx + 7; x += 4) bp.work(x, y, dz - 1, 'intake clerk');
  bp.fill(cx - 8, y + 3, dz, cx + 9, y + 3, dz, HOLO);
  // waiting benches and planters along both side walls, holo boards above
  for (let z = z0 + 2; z < dz - 2; z += 3) {
    for (const x of [x0 + 1, x1 - 1]) { bp.set(x, y, z, SLAB); bp.spot(x, y, z, 'seat'); bp.set(x, y, z + 1, SLAB); bp.spot(x, y, z + 1, 'seat'); }
    bp.set(x0, y + 2, z, HOLO); bp.set(x1, y + 2, z, HOLO);
  }
  for (let x = x0 + 6; x < x1 - 4; x += 8) { if (x >= cx - 6 && x <= cx + 7) continue; bp.set(x, y, z1 - 2, DARK); bp.set(x, y + 1, z1 - 2, B.OAK_LEAVES); }
  // holo information pillars and bench islands in the waiting zone
  for (const x of [cx - 12, cx + 13]) for (const z of [dz + 4, dz + 8]) { bp.fill(x, y, z, x, y + 2, z, TRIM); bp.set(x, y + 3, z, HOLO); for (const [dx, dzz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { bp.set(x + dx, y, z + dzz, SLAB); bp.spot(x + dx, y, z + dzz, 'seat'); } }
  // processing counters at the back corners (fingerprint / property lockers)
  for (const xa of [x0 + 1, x1 - 6]) { for (let x = xa; x < xa + 6; x++) { bp.set(x, y, z0 + 1, B.CHEST); bp.set(x, y + 1, z0 + 1, B.SHELF); } bp.work(xa + 2, y, z0 + 2, 'property clerk'); }
  // ceiling: red strip down the entry lane, glow grid elsewhere, banner over the desk
  for (let x = x0; x <= x1; x += 4) for (let z = z0 + 1; z <= z1; z += 4) bp.set(x, y + 4, z, GLOW);
  for (let z = z0; z <= z1; z++) { bp.set(cx, y + 4, z, RED); bp.set(cx + 1, y + 4, z, RED); }
  bp.fill(cx - 1, y + 4, z1 - 5, cx + 2, y + 4, z1 - 5, BLUE);
  bp.room('intake_hall', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  bp.meta.lobby = { x: bp.wx(cx), y: bp.wy(y), z: bp.wz(dz + 4) };
}
// control room: console banks in a horseshoe around the steel-glass floor over the spine, holo wall, seats
function controlRoom(bp, rng, x0, z0, x1, z1, y, glassX0, glassX1, glassZ0, glassZ1) {
  carve(bp, x0, z0, x1, z1, y, PLATE);
  patternFloor(bp, x0, z0, x1, z1, y - 1, PLATE, BLACK, 4);
  bp.fill(glassX0, y - 1, glassZ0, glassX1, y - 1, glassZ1, GLASS);
  // console banks along both long sides of the glass with operator seats
  for (let z = glassZ0 + 1; z <= glassZ1 - 1; z += 2) {
    for (const [cx, sx] of [[glassX0 - 2, glassX0 - 3], [glassX1 + 2, glassX1 + 3]]) {
      if (!bp.isAir(cx, y, z) || !bp.isAir(sx, y, z)) continue;
      bp.set(cx, y, z, BLACK); bp.set(cx, y + 1, z, B.CONSOLE); bp.set(sx, y, z, SLAB); bp.spot(sx, y, z, 'seat'); bp.work(sx, y, z, 'operator');
    }
  }
  // holo wall with the cell-block map on the north wall, red alert panels, officer's desk on the south side
  for (let x = x0; x <= x1; x++) { bp.set(x, y + 1, z0 - 1, (x % 3) ? HOLO : RED); bp.set(x, y + 2, z0 - 1, HOLO); bp.set(x, y + 2, z1 + 1, (x % 4) ? B.WINDOW_LIT : RED); }
  for (let x = x0 + 1; x <= x1 - 1; x += 3) { if (x >= glassX0 - 1 && x <= glassX1 + 1) continue; bp.set(x, y, z1, BLACK); bp.set(x, y + 1, z1, B.CONSOLE); }
  bp.set(x0 + 2, y, z1 - 3, B.TABLE); bp.set(x0 + 1, y, z1 - 3, SLAB); bp.spot(x0 + 1, y, z1 - 3, 'seat'); bp.work(x0 + 2, y, z1 - 4, 'watch officer');
  bp.set(x1 - 2, y, z1 - 3, B.TABLE); bp.set(x1 - 1, y, z1 - 3, SLAB); bp.spot(x1 - 1, y, z1 - 3, 'seat'); bp.set(x1 - 1, y, z0, B.CHEST); bp.set(x0, y, z0, B.SHELF); bp.set(x0, y + 1, z0, B.SHELF);
  for (let x = x0 + 1; x <= x1 - 1; x += 3) for (let z = z0 + 1; z <= z1 - 1; z += 3) bp.set(x, y + 4, z, (x + z) % 2 ? BLUE : GLOW);
  bp.room('control_room', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// 3x3 cell behind a force-field doorway (air + blue lintel), bed, seat, vent, holo cell number over the door
function cell(bp, x0, z0, y, doorZ, back, num) {
  carve(bp, x0, z0, x0 + 2, z0 + 2, y, PLATE);
  const bz = back > 0 ? z0 + 2 : z0, bz2 = back > 0 ? z0 + 1 : z0 + 1;
  bp.set(x0, y, bz, B.BED_HEAD); bp.set(x0, y, bz2, B.BED_FOOT); bp.bed(x0 + 1, y, bz2);
  bp.set(x0 + 2, y, bz, SLAB); bp.spot(x0 + 2, y, bz, 'seat');
  bp.set(x0 + 1, y + 4, z0 + 1, (num % 5) ? GLOW : BLUE);
  bp.set(x0 + 2, y + 2, bz + back, B.VENT);           // vent in the back wall
  bp.set(x0 + 1, y + 1, bz + back, RED);              // red panel on the back wall
  // doorway: 1 wide, 2 high air, blue field lintel, chrome jambs, holo number above
  bp.fill(x0 + 1, y, doorZ, x0 + 1, y + 1, doorZ, AIR);
  bp.set(x0 + 1, y + 2, doorZ, BLUE);
  bp.set(x0, y, doorZ, TRIM); bp.set(x0, y + 1, doorZ, TRIM); bp.set(x0 + 2, y, doorZ, TRIM); bp.set(x0 + 2, y + 1, doorZ, TRIM);
  bp.set(x0 + 1, y + 3, doorZ, HOLO);
  bp.room('detention_cell', x0 - 1, y, Math.min(z0 - 1, doorZ), x0 + 3, Math.max(z0 + 3, doorZ));
}
// a cell-block band: corridor rows z0+4..z0+6 with cells north (z0..z0+2) and south (z0+8..z0+10) of it
function cellBand(bp, xa, xb, z0, y, hot, cellsFrom = xa) {
  carve(bp, xa, z0 + 4, xb, z0 + 6, y, BLACK);
  for (let x = xa; x <= xb; x++) { bp.set(x, y - 1, z0 + 5, STRIPE); bp.set(x, y + 4, z0 + 5, (x % 4 === 1) ? GLOW : RED); bp.set(x, y + 4, z0 + 4, hot ? RED : BLACK); bp.set(x, y + 4, z0 + 6, hot ? RED : BLACK); }
  let n = 0;
  for (let cx = cellsFrom; cx + 2 <= xb; cx += 4) {
    cell(bp, cx, z0, y, z0 + 3, -1, n++);
    cell(bp, cx, z0 + 8, y, z0 + 7, 1, n++);
    bp.set(cx + 3, y + 2, z0 + 3, hot ? RED : STRIPE); bp.set(cx + 3, y + 2, z0 + 7, hot ? RED : STRIPE);
  }
  return n;
}
// a row of template rooms of width `rw` along x between xa..xb, interior depth rows z0..z1, doors on `side`
function roomRow(bp, rng, names, xa, xb, z0, z1, y, side, rw, kindOf = (n) => n) {
  let i = 0;
  for (let x0 = xa; x0 + rw - 1 <= xb; x0 += rw + 1) {
    const x1 = x0 + rw - 1, name = names[i % names.length];
    const doorU = Math.floor(rw / 2) - 1, dx = x0 + doorU;
    const dz = side === 'S' ? z1 + 1 : z0 - 1;
    if (name === 'interrogation') { interrogation(bp, rng, x0, z0, x1, z1, y, side, doorU); doorway(bp, dx, dz, dx, dz, y, 3, TRIM, RED); }
    else if (name === 'guard_post') { guardPost(bp, rng, x0, z0, x1, z1, y, side, doorU); doorway(bp, dx, dz, dx, dz, y, 3, TRIM, BLUE); }
    else { template(bp, rng, name, kindOf(name), x0, z0, x1, z1, y, side, doorU, 2); doorway(bp, dx, dz, dx + 1, dz, y, 3, TRIM, GLOW); }
    i++;
  }
}
// a band with rooms of depth 6 both sides of a 3-wide corridor: rows z0..z0+5 | wall | corr z0+7..z0+9 | wall | z0+11..z0+16
function roomBand(bp, rng, xa, xb, z0, y, northNames, southNames, rw) {
  carve(bp, xa, z0 + 7, xb, z0 + 9, y, BLACK);
  for (let x = xa; x <= xb; x++) { bp.set(x, y - 1, z0 + 8, STRIPE); if (x % 4 === 1) bp.set(x, y + 4, z0 + 8, GLOW); }
  roomRow(bp, rng, northNames, xa, xb, z0, z0 + 5, y, 'S', rw);
  roomRow(bp, rng, southNames, xa, xb, z0 + 11, z0 + 16, y, 'N', rw);
}

// -------------------------------------------------------------------------------------------- vertical cores
// switchback stair core: 8 x 12 housing, flights of 2 x 10 rising 5 per level, landing slabs, door per level on +x
function stairCore(bp, tx0, tz0, f0, f1, roofTo, doorSide = 'E') {
  const y0 = walk(f0), yTop = walk(f1);
  bp.fill(tx0, y0 - 1, tz0, tx0 + 7, roofTo, tz0 + 11, HULL);
  bp.fill(tx0 + 1, y0, tz0 + 1, tx0 + 6, roofTo - 1, tz0 + 10, AIR);
  bp.fill(tx0 + 1, y0 - 1, tz0 + 1, tx0 + 6, y0 - 1, tz0 + 10, PLATE);
  for (let f = f0; f < f1; f++) {
    const level = walk(f), east = (f - f0) % 2 === 0, xs = east ? [tx0 + 1, tx0 + 2] : [tx0 + 5, tx0 + 6];
    stairZ(bp, xs[0], xs[1], east ? tz0 + 1 : tz0 + 10, east ? 1 : -1, level, 5);
    bp.fill(tx0 + 1, level + 4, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level + 4, east ? tz0 + 10 : tz0 + 2, PLATE);
    bp.fill(tx0 + 3, level + 4, tz0 + 1, tx0 + 4, level + 4, tz0 + 10, PLATE);     // catwalk joining the landing to the door
    bp.set(tx0 + 3, level + 3, east ? tz0 + 10 : tz0 + 1, GLOW); bp.set(tx0 + 4, level + 3, east ? tz0 + 1 : tz0 + 10, RED);
    bp.room('stairwell', tx0, level, tz0, tx0 + 7, tz0 + 11);
  }
  bp.set(tx0 + 3, yTop + 3, tz0 + 5, GLOW); bp.set(tx0 + 4, yTop + 3, tz0 + 6, BLUE);
  bp.set(tx0 + 1, yTop, tz0 + 1, B.CRATE); bp.set(tx0 + 1, yTop + 1, tz0 + 1, B.CRATE); bp.set(tx0 + 2, yTop, tz0 + 1, B.BARREL);
  bp.set(tx0 + 6, yTop, tz0 + 10, BLACK); bp.set(tx0 + 6, yTop + 1, tz0 + 10, B.CONSOLE); bp.set(tx0 + 5, yTop, tz0 + 10, SLAB); bp.spot(tx0 + 5, yTop, tz0 + 10, 'seat');
  bp.set(tx0 + 1, yTop, tz0 + 10, B.CHEST); bp.set(tx0 + 6, yTop, tz0 + 1, B.SHELF); bp.set(tx0 + 6, yTop + 1, tz0 + 1, B.SHELF);
  bp.room('stairwell', tx0, yTop, tz0, tx0 + 7, tz0 + 11);
  for (let f = f0; f <= f1; f++) {
    const level = walk(f);
    if (doorSide === 'E') doorway(bp, tx0 + 7, tz0 + 5, tx0 + 7, tz0 + 6, level, 3, TRIM, BLUE);
    else doorway(bp, tx0, tz0 + 5, tx0, tz0 + 6, level, 3, TRIM, BLUE);
  }
  // slit windows up the outer faces
  for (let y = y0 + 2; y < roofTo - 1; y += 5) for (const z of [tz0 + 3, tz0 + 8]) { if (bp.get(tx0 - 1, y, z) === 0 || bp.get(tx0 - 1, y, z) === AIR) bp.set(tx0, y, z, B.WINDOW_LIT); }
}
function lifts(bp, y0, y1) {
  for (const l of LIFTS) {
    const outer = l.face > l.x ? l.x - 1 : l.x + 2;                 // wall column on the side away from the spine
    bp.fill(outer, y0 - 1, l.z - 1, outer, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x, y0 - 1, l.z - 1, l.x + 1, y1 + 3, l.z - 1, BLACK); bp.fill(l.x, y0 - 1, l.z + 2, l.x + 1, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x, y0, l.z, l.x + 1, y1 + 2, l.z + 1, AIR);           // the shaft, open toward the spine
    bp.fill(l.x, y1 + 3, l.z, l.x + 1, y1 + 3, l.z + 1, BLACK);
    bp.lift(l.x, l.z, y0, y1);
    const jamb = l.face > l.x ? l.x + 1 : l.x;                      // shaft-wall cells nearest the corridor
    for (let y = y0; y <= y1; y += 5) {
      bp.set(jamb, y + 3, l.z - 1, BLUE); bp.set(jamb, y + 3, l.z + 2, BLUE);
      bp.set(l.face, y - 1, l.z, STRIPE); bp.set(l.face, y - 1, l.z + 1, STRIPE);
      bp.fill(l.x, y - 1, l.z, l.x + 1, y - 1, l.z + 1, AIR);       // no slab inside the shaft
    }
  }
}

// ---------------------------------------------------------------------------------------------------- exterior
// black panelling with hull-plate floor bands, durasteel pilasters every 4, narrow lit slits, red hazard bands
function facadeBlock(bp, box, yBase, yTop, lit) {
  const { x0, z0, x1, z1 } = box;
  for (let y = yBase; y <= yTop; y++) {
    const band = y % 5 === 0, slit = y % 5 === 3, red = y === yTop;
    const pick = (a) => red ? ((a & 1) ? RED : STRIPE) : band ? HULL : (a % 4 === 0) ? DARK : (slit && a % 4 === 2 && lit) ? B.WINDOW_LIT : BLACK;
    for (let x = x0; x <= x1; x++) { bp.set(x, y, z0, pick(x)); bp.set(x, y, z1, pick(x)); }
    for (let z = z0 + 1; z < z1; z++) { bp.set(x0, y, z, pick(z)); bp.set(x1, y, z, pick(z)); }
  }
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) bp.fill(x, yBase, z, x, yTop, z, TRIM);
}
// spiral of half steps around the tower's central pillar from the ground door up to the lookout; returns the
// ring cells the last steps occupy so the lookout floor can leave the stair opening
function towerSpiral(bp, tx, tz, yTop, start) {
  const ring = [];
  for (let x = tx + 1; x <= tx + 5; x++) ring.push([x, tz + 5]);            // south row west -> east
  for (let z = tz + 4; z >= tz + 1; z--) ring.push([tx + 5, z]);            // east column north
  for (let x = tx + 4; x >= tx + 1; x--) ring.push([x, tz + 1]);            // north row west
  for (let z = tz + 2; z <= tz + 4; z++) ring.push([tx + 1, z]);            // west column south
  bp.fill(tx + 2, 1, tz + 2, tx + 4, yTop - 1, tz + 4, DARK);               // central pillar
  for (let y = 4; y < yTop - 2; y += 5) { bp.set(tx + 3, y, tz + 2, B.LANTERN); bp.set(tx + 3, y, tz + 4, B.LANTERN); bp.set(tx + 2, y, tz + 3, RED); bp.set(tx + 4, y, tz + 3, RED); }
  const opening = [];
  for (let i = 0; ; i++) {
    const base = 1 + (i >> 1), [x, z] = ring[(i + start) % ring.length];
    if (base >= yTop) break;
    if (i & 1) { bp.set(x, base, z, SLAB); bp.fill(x, base + 1, z, x, base + 3, z, AIR); if (base - 1 >= 1) bp.set(x, base - 1, z, STEEL); }
    else { bp.set(x, base - 1, z, STEEL); bp.fill(x, base, z, x, base + 2, z, AIR); }
    if (base >= yTop - 4) opening.push([x, z]);
  }
  return opening;
}
function watchtower(bp, tx, tz) {
  bp.fill(tx, 0, tz, tx + 6, TOWER_TOP, tz + 6, DARK);
  for (let y = 5; y <= TOWER_TOP; y += 5) bp.walls(tx, y, tz, tx + 6, y, tz + 6, HULL);
  for (let y = 3; y < TOWER_TOP - 5; y += 5) for (const [x, z] of [[tx + 3, tz], [tx + 3, tz + 6], [tx, tz + 3], [tx + 6, tz + 3]]) bp.set(x, y, z, B.WINDOW_LIT);
  bp.walls(tx, TOWER_TOP - 1, tz, tx + 6, TOWER_TOP, tz + 6, RED);
  for (const [x, z] of [[tx, tz], [tx + 6, tz], [tx, tz + 6], [tx + 6, tz + 6]]) bp.fill(x, 0, z, x, TOWER_TOP + 1, z, TRIM);
  // hollow shaft with the spiral stair (starting beside the ground door), then the glazed lookout on top
  const topY = 41, west = tx < 40;
  bp.fill(tx + 1, 1, tz + 1, tx + 5, topY + 2, tz + 5, AIR);
  const opening = towerSpiral(bp, tx, tz, topY, west ? 5 : 14);
  for (let x = tx + 1; x <= tx + 5; x++) for (let z = tz + 1; z <= tz + 5; z++) if (!opening.some(([ox, oz]) => ox === x && oz === z)) bp.set(x, topY - 1, z, (x === tx + 3 && z === tz + 3) ? GLOW : PLATE);
  bp.walls(tx, topY + 1, tz, tx + 6, topY + 2, tz + 6, GLASS);
  for (const [x, z] of [[tx, tz], [tx + 6, tz], [tx, tz + 6], [tx + 6, tz + 6]]) bp.fill(x, topY, z, x, topY + 3, z, TRIM);
  bp.set(tx + 3, topY, tz + 3, B.CONSOLE); bp.work(tx + 3, topY, tz + 2, 'lookout'); bp.set(tx + 2, topY, tz + 2, SLAB); bp.spot(tx + 2, topY, tz + 2, 'seat');
  bp.set(tx + 4, topY, tz + 2, B.CHEST); bp.set(tx + 3, topY + 4, tz + 3, B.LANTERN); bp.set(tx + 2, topY + 1, tz + 4, HOLO); bp.set(tx + 4, topY, tz + 4, B.BARREL); bp.set(tx + 2, topY, tz + 4, B.SHELF);
  bp.room('watchtower', tx, topY, tz, tx + 6, tz + 6);
  bp.room('tower_stair', tx, 1, tz, tx + 6, tz + 6);
  // ground door into the patrol corridor / guard post
  if (west) doorway(bp, tx + 6, tz + 3, tx + 6, tz + 4, 1, 3, TRIM, BLUE); else doorway(bp, tx, tz + 3, tx, tz + 4, 1, 3, TRIM, BLUE);
  // searchlight mast: chrome column with four lamp heads and a red beacon
  bp.fill(tx + 3, TOWER_TOP + 1, tz + 3, tx + 3, TOWER_TOP + 3, tz + 3, TRIM);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) bp.set(tx + 3 + dx, TOWER_TOP + 3, tz + 3 + dz, B.CITY_LAMP);
  bp.set(tx + 3, TOWER_TOP + 4, tz + 3, RED);
  for (const [x, z] of [[tx + 1, tz + 1], [tx + 5, tz + 1], [tx + 1, tz + 5], [tx + 5, tz + 5]]) bp.set(x, TOWER_TOP + 1, z, B.CITY_LAMP);
}
// a parked gunship: hull, cockpit, troop bay with open side doors, wings with engine pods, tail, skids
function gunship(bp, cx, y, cz) {
  const H = HULL, R = RED, S = STEEL;
  bp.fill(cx - 7, y + 1, cz - 2, cx + 6, y + 3, cz + 2, H);                 // fuselage 14 x 5 x 3
  bp.fill(cx - 6, y + 2, cz - 1, cx + 5, y + 2, cz + 1, AIR);               // troop bay
  bp.fill(cx - 3, y + 2, cz - 2, cx + 2, y + 3, cz - 2, AIR); bp.fill(cx - 3, y + 2, cz + 2, cx + 2, y + 3, cz + 2, AIR);   // open side doors
  bp.fill(cx - 7, y + 2, cz - 2, cx - 7, y + 3, cz + 2, R);                 // red nose band
  bp.fill(cx + 7, y + 2, cz - 1, cx + 9, y + 3, cz + 1, GLASS); bp.fill(cx + 7, y + 1, cz - 1, cx + 9, y + 1, cz + 1, H);   // cockpit
  bp.fill(cx + 10, y + 2, cz, cx + 10, y + 2, cz, TRIM);
  bp.fill(cx - 2, y + 4, cz - 1, cx + 3, y + 4, cz + 1, DARK); bp.set(cx, y + 5, cz, B.CONSOLE);   // dorsal turret
  for (const s of [-1, 1]) {                                                  // wings + engine pods
    bp.fill(cx - 4, y + 3, cz + 3 * s, cx + 2, y + 3, cz + 5 * s, S);
    bp.fill(cx - 5, y + 2, cz + 5 * s, cx + 1, y + 3, cz + 6 * s, DARK);
    bp.set(cx - 5, y + 2, cz + 6 * s, BLUE); bp.set(cx - 5, y + 3, cz + 6 * s, BLUE);
    bp.fill(cx - 1, y + 1, cz + 4 * s, cx + 1, y + 1, cz + 4 * s, R);
    bp.fill(cx - 6, y, cz + 2 * s, cx - 5, y, cz + 2 * s, DARK); bp.fill(cx + 4, y, cz + 2 * s, cx + 5, y, cz + 2 * s, DARK);   // skids
  }
  bp.fill(cx - 9, y + 2, cz, cx - 8, y + 4, cz, S); bp.fill(cx - 9, y + 5, cz - 2, cx - 9, y + 5, cz + 2, DARK);   // tail
  bp.set(cx - 9, y + 6, cz, R);
  bp.fill(cx - 7, y + 4, cz - 2, cx + 6, y + 4, cz - 2, R); bp.fill(cx - 7, y + 4, cz + 2, cx + 6, y + 4, cz + 2, R);   // hazard stripes along the roofline
  bp.set(cx - 7, y + 2, cz, B.LANTERN);
}
function deckFloor(bp) {
  const y = KEEP.top, x0 = KEEP.x0, z0 = KEEP.z0, x1 = KEEP.x1, z1 = KEEP.z1;
  patternFloor(bp, x0, z0, x1, z1, y, PLATE, STRIPE, 8);
  bp.walls(x0, y, z0, x1, y, z1, RED);
  bp.walls(x0, y + 1, z0, x1, y + 1, z1, BARS);
}
function landingDeck(bp) {
  const y = KEEP.top, x0 = KEEP.x0, z0 = KEEP.z0, x1 = KEEP.x1, z1 = KEEP.z1;
  // landing circle (chrome ring with a blue centre) and the gunship on it
  const cx = 44, cz = 57;
  for (let a = 0; a < 32; a++) { const x = Math.round(cx + 8 * Math.cos(a / 32 * Math.PI * 2)), z = Math.round(cz + 8 * Math.sin(a / 32 * Math.PI * 2)); bp.set(x, y, z, TRIM); }
  bp.fill(cx - 1, y, cz - 1, cx, y, cz, BLUE);
  gunship(bp, cx, y, cz);
  // lift housing over the two shafts, fuel depot, crew bench, lamps at the corners
  bp.fill(35, y + 1, 46, 49, y + 4, 51, BLACK); bp.fill(36, y + 1, 47, 48, y + 3, 50, AIR);
  bp.fill(41, y + 1, 51, 43, y + 3, 51, AIR); bp.set(42, y + 4, 51, BLUE); bp.fill(40, y + 1, 51, 40, y + 4, 51, TRIM); bp.fill(44, y + 1, 51, 44, y + 4, 51, TRIM);
  bp.set(42, y + 3, 46, HOLO); bp.set(41, y + 3, 46, HOLO); bp.set(43, y + 3, 46, HOLO);
  for (let z = z0 + 14; z <= z0 + 24; z += 2) { bp.set(x0 + 2, y + 1, z, B.BARREL); if (z % 4 === 0) bp.set(x0 + 2, y + 2, z, B.BARREL); }
  bp.set(x0 + 2, y + 1, z1 - 3, B.CRATE); bp.set(x0 + 3, y + 1, z1 - 3, B.CRATE); bp.set(x0 + 2, y + 2, z1 - 3, B.CRATE);
  for (let x = x1 - 8; x <= x1 - 2; x++) { bp.set(x, y + 1, z0 + 2, SLAB); bp.spot(x, y + 1, z0 + 2, 'seat'); }
  for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) lampPost(bp, x, y + 1, z, 3, B.CITY_LAMP);
  for (let x = x0 + 2; x <= x1 - 2; x += 6) { bp.set(x, y + 1, z0 + 1, B.LANTERN); bp.set(x, y + 1, z1 - 1, B.LANTERN); }
  bp.room('landing_deck', 33, y + 1, 46, 56, 65);
}

// ------------------------------------------------------------------------------------------------------ floors
const WEST = { xa: 4, xb: 37 }, EAST = { xa: 47, xb: 81 };

function spine(bp, y, z0, z1, floor = BLACK) {
  carve(bp, SPINE.x0, z0, SPINE.x1, z1, y, floor);
  for (let z = z0; z <= z1; z++) { bp.set(42, y - 1, z, STRIPE); if (z % 4 === 0) { bp.set(42, y + 4, z, GLOW); bp.set(40, y + 4, z, RED); bp.set(44, y + 4, z, RED); } }
  for (let z = z0 + 2; z <= z1 - 2; z += 6) { bp.set(SPINE.x0 - 1, y + 2, z, HOLO); bp.set(SPINE.x1 + 1, y + 2, z, (z % 3) ? B.WINDOW_LIT : HOLO); }
}
// wing corridor openings into the spine at the given rows
function spineDoor(bp, x, z0, z1, y) { doorway(bp, x, z0, x, z1, y, 3, TRIM, RED); }

function groundFloor(bp, rng) {
  const y = walk(0);
  spine(bp, y, 3, 81);
  intakeHall(bp, rng, 20, 82, 64, 98, y);
  doorway(bp, DOOR_X, 99, DOOR_X + 1, 99, y, 3, TRIM, GLOW);
  bp.fill(DOOR_X - 3, y, 99, DOOR_X - 2, y + 4, 99, RED); bp.fill(DOOR_X + 3, y, 99, DOOR_X + 4, y + 4, 99, RED);
  bp.fill(DOOR_X - 1, y + 4, 99, DOOR_X + 2, y + 5, 99, HOLO);
  bp.door(DOOR_X, y, 99, 'S');
  // north patrol corridor joining the two front towers, and the tower doors
  carve(bp, 9, 4, 75, 8, y, BLACK); for (let x = 9; x <= 75; x += 4) bp.set(x, y + 4, 6, GLOW);
  // wings: two room bands per wing (z 10..26, 28..44), then the holding block (46..63) and services (64..80)
  for (const wing of [WEST, EAST]) {
    const xa = wing === WEST ? 4 : 47, xb = wing === WEST ? 37 : 81, rw = 15;
    roomBand(bp, rng, xa, xb, 10, y, wing === WEST ? ['garage', 'workshop'] : ['droid_bay', 'garage'], wing === WEST ? ['armory', 'storage'] : ['workshop', 'server_room'], rw);
    roomBand(bp, rng, xa, xb, 28, y, wing === WEST ? ['medbay', 'clinic_ward'] : ['comms_room', 'storage'], wing === WEST ? ['security_post', 'lounge'] : ['security_post', 'kitchen'], rw);
    // holding cells for new arrivals (a cell band), then a services band
    cellBand(bp, wing === WEST ? 12 : xa, xb, 46, y, false, wing === WEST ? 12 : 51);
    roomBand(bp, rng, xa, xb, 64, y, ['laundry', 'restroom', 'storage', 'security_post'], ['storage', 'kitchen'], 7);
    spineDoor(bp, wing === WEST ? 38 : 46, 17, 19, y); spineDoor(bp, wing === WEST ? 38 : 46, 35, 37, y); spineDoor(bp, wing === WEST ? 38 : 46, 50, 52, y); spineDoor(bp, wing === WEST ? 38 : 46, 71, 73, y);
  }
  // hall side rooms beyond the hall (x 4..19 and 65..81, z 82..98): guard post and property store
  template(bp, rng, 'security_post', 'guard_post', 4, 83, 18, 97, y, 'E', 6, 2, GLOW); doorway(bp, 19, 89, 19, 90, y, 3, TRIM, BLUE);
  template(bp, rng, 'storage', 'property_store', 66, 83, 81, 97, y, 'W', 6, 2); doorway(bp, 65, 89, 65, 90, y, 3, TRIM, GLOW);
}
function cellFloor(bp, rng, f, hot) {
  const y = walk(f);
  spine(bp, y, 3, 98);
  // south patrol corridor with holo boards, then seven cell bands per wing (z 10 + 12k)
  carve(bp, 4, 94, 81, 98, y, BLACK); for (let x = 4; x <= 81; x += 4) bp.set(x, y + 4, 96, hot ? BLUE : GLOW);
  carve(bp, 9, 4, 75, 8, y, BLACK); for (let x = 9; x <= 75; x += 4) bp.set(x, y + 4, 6, GLOW);
  let cells = 0;
  for (const wing of [WEST, EAST]) {
    for (let k = 0; k < 7; k++) {
      const z0 = 10 + 12 * k, xa = (wing === WEST && k === 3) ? 12 : wing.xa;
      cells += cellBand(bp, xa, wing.xb, z0, y, hot, (wing === EAST && k === 3) ? 51 : xa);
      spineDoor(bp, wing === WEST ? 38 : 46, z0 + 4, z0 + 6, y);
    }
  }
  return cells;
}
function interrogationFloor(bp, rng) {
  const y = walk(3);
  spine(bp, y, 3, 98);
  carve(bp, 9, 4, 75, 8, y, BLACK); for (let x = 9; x <= 75; x += 4) bp.set(x, y + 4, 6, GLOW);
  for (const wing of [WEST, EAST]) {
    const xa = wing.xa, xb = wing.xb;
    // three room bands of 7-wide rooms (interrogation suites, holding, guard posts, evidence storage)
    roomBand(bp, rng, xa, xb, 10, y, ['interrogation', 'guard_post', 'interrogation', 'storage'], ['interrogation', 'interrogation', 'guard_post', 'interrogation'], 7);
    roomBand(bp, rng, xa, xb, 28, y, ['detention_cell', 'interrogation', 'detention_cell', 'guard_post'], ['interrogation', 'storage', 'interrogation', 'interrogation'], 7);
    // the stair core sits in the west wing at z 46..57: this band starts east of it
    roomBand(bp, rng, wing === WEST ? 12 : xa, xb, 46, y, ['meeting_room', 'interrogation', 'security_post'], ['interrogation', 'server_room', 'interrogation'], 7);
    roomBand(bp, rng, xa, xb, 64, y, ['droid_bay', 'archive'], ['medbay', 'storage'], 15);
    for (const z of [17, 35, 53, 71]) spineDoor(bp, wing === WEST ? 38 : 46, z, z + 2, y);
    // evidence archive strip at the south (z 82..92)
    template(bp, rng, wing === WEST ? 'archive' : 'library', wing === WEST ? 'evidence_archive' : 'records', xa, 85, xb, 92, y, 'N', Math.floor((xb - xa) / 2) - 1, 2);
    doorway(bp, xa + Math.floor((xb - xa) / 2) - 1, 84, xa + Math.floor((xb - xa) / 2), 84, y, 3, TRIM, GLOW);
  }
  // a cross corridor along z 82..83 joins the spine to both archives
  carve(bp, 4, 82, 81, 83, y, BLACK); for (let x = 4; x <= 81; x += 4) bp.set(x, y + 4, 82, RED);
}
function guardFloor(bp, rng) {
  const y = walk(4);
  spine(bp, y, 3, 98);
  carve(bp, 9, 4, 75, 8, y, BLACK); for (let x = 9; x <= 75; x += 4) bp.set(x, y + 4, 6, GLOW);
  carve(bp, 4, 94, 81, 98, y, BLACK); for (let x = 4; x <= 81; x += 4) bp.set(x, y + 4, 96, GLOW);
  const W1 = [['barracks', 'barracks'], ['gym', 'lounge'], ['barracks', 'restroom'], ['cafeteria', 'kitchen']];
  const E1 = [['barracks', 'barracks'], ['medbay', 'clinic_ward'], ['barracks', 'laundry'], ['armory', 'storage']];
  for (const wing of [WEST, EAST]) {
    const names = wing === WEST ? W1 : E1;
    for (let k = 0; k < 4; k++) {
      const z0 = 10 + 18 * k, xa = (wing === WEST && k === 2) ? 12 : wing.xa;
      roomBand(bp, rng, xa, wing.xb, z0, y, [names[k][0]], [names[k][1]], xa === 12 ? 12 : 15);
      spineDoor(bp, wing === WEST ? 38 : 46, z0 + 7, z0 + 9, y);
    }
  }
  // the spine is open to the control room above between z 40 and 60 (its steel-glass floor)
  bp.fill(SPINE.x0, y + 4, 40, SPINE.x1, y + 4, 60, GLASS);
}
// upper block floors: spine + cross corridor (z 47..53) make four quadrants of rooms; the NW quadrant's rooms
// start at x 22 beside the upper stair core (x 14..21, z 14..25)
const QUADS = { NW: [22, 13, 37, 45], NE: [47, 13, 71, 45], SW: [13, 55, 37, 88], SE: [47, 55, 71, 88] };
function quadrantRooms(bp, rng, y, q, names, box) {
  const [qx0, qz0, qx1, qz1] = box;
  const toSpine = q === 'NW' || q === 'SW' ? 'E' : 'W';
  const place = (a, b, name) => {
    template(bp, rng, name, name, qx0, a, qx1, b, y, toSpine, Math.floor((b - a) / 2) - 1, 2);
    const dz = a + Math.floor((b - a) / 2) - 1, dx = toSpine === 'E' ? qx1 + 1 : qx0 - 1;
    doorway(bp, dx, dz, dx, dz + 1, y, 3, TRIM, GLOW);
  };
  if (names.length === 1) place(qz0, qz1, names[0]);
  else { const zm = Math.floor((qz0 + qz1) / 2); place(qz0, zm - 1, names[0]); place(zm + 1, qz1, names[1]); }
}
function upperFloor(bp, rng, f, plan) {
  const y = walk(f);
  const ix0 = UPPER.x0 + 1, ix1 = UPPER.x1 - 1, iz0 = UPPER.z0 + 1, iz1 = UPPER.z1 - 1;
  spine(bp, y, iz0, iz1, PLATE);
  carve(bp, ix0, 47, ix1, 53, y, PLATE); for (let x = ix0; x <= ix1; x += 4) bp.set(x, y + 4, 50, (x % 8) ? GLOW : RED);
  for (const q of Object.keys(plan)) quadrantRooms(bp, rng, y, q, plan[q], QUADS[q]);
}
// level 26: the control room straddles the spine (x 31..53, z 39..61) with a steel-glass floor over the spine of
// the guard floor; the cross corridor and the spine enter it through doors; the quadrants shrink around it
function controlFloor(bp, rng) {
  const y = walk(5);
  const ix0 = UPPER.x0 + 1, ix1 = UPPER.x1 - 1, iz0 = UPPER.z0 + 1, iz1 = UPPER.z1 - 1;
  spine(bp, y, iz0, 37, PLATE); spine(bp, y, 63, iz1, PLATE);
  carve(bp, ix0, 47, 29, 53, y, PLATE); carve(bp, 55, 47, ix1, 53, y, PLATE);
  for (let x = ix0; x <= ix1; x += 4) if (x < 30 || x > 54) bp.set(x, y + 4, 50, (x % 8) ? GLOW : RED);
  controlRoom(bp, rng, 31, 39, 53, 61, y, SPINE.x0, SPINE.x1, 40, 60);
  doorway(bp, 41, 38, 42, 38, y, 3, TRIM, BLUE); doorway(bp, 41, 62, 42, 62, y, 3, TRIM, BLUE);
  doorway(bp, 30, 49, 30, 50, y, 3, TRIM, BLUE); doorway(bp, 54, 49, 54, 50, y, 3, TRIM, BLUE);
  quadrantRooms(bp, rng, y, 'NW', ['comms_room', 'server_room'], [22, 13, 37, 36]);
  quadrantRooms(bp, rng, y, 'NE', ['open_plan_office', 'armory'], [47, 13, 71, 36]);
  quadrantRooms(bp, rng, y, 'SW', ['meeting_room', 'meeting_room'], [13, 64, 37, 88]);
  quadrantRooms(bp, rng, y, 'SE', ['storage', 'security_post'], [47, 64, 71, 88]);
}
function keepFloor(bp, rng, f, west, east) {
  const y = walk(f);
  const ix0 = KEEP.x0 + 1, ix1 = KEEP.x1 - 1, iz0 = KEEP.z0 + 1, iz1 = KEEP.z1 - 1;
  // lift lobby around the shafts (x 38..46, z 44..55); rooms north, east and south of it; the stair core (x 30..37,
  // z 36..47) opens into the north room; the south-west room hangs off a short passage at z 51..52
  carve(bp, 38, 44, 46, 55, y, PLATE); for (const z of [45, 50, 54]) bp.set(42, y + 4, z, BLUE);
  bp.fill(38, y + 4, 47, 46, y + 4, 51, RED);
  template(bp, rng, west, west, 39, iz0, 46, 42, y, 'S', 2, 2); doorway(bp, 41, 43, 42, 43, y, 3, TRIM, GLOW);
  doorway(bp, 38, 41, 38, 42, y, 3, TRIM, BLUE);                                  // from the stair core
  template(bp, rng, east, east, 48, iz0, ix1, iz1, y, 'W', 18, 2); doorway(bp, 47, 53, 47, 54, y, 3, TRIM, GLOW);
  const sName = f === 9 ? 'comms_room' : f === 10 ? 'lounge' : 'storage', sKind = f === 9 ? 'comms_room' : f === 10 ? 'ready_room' : 'deck_stores';
  template(bp, rng, sName, sKind, 39, 57, 46, iz1, y, 'N', 2, 2); doorway(bp, 41, 56, 42, 56, y, 3, TRIM, GLOW);
  carve(bp, 30, 51, 37, 52, y, PLATE); bp.set(34, y + 4, 51, GLOW);
  const wName = f === 9 ? 'armory' : f === 10 ? 'barracks' : 'workshop', wKind = f === 9 ? 'ready_armory' : f === 10 ? 'crew_quarters' : 'gunship_maintenance';
  template(bp, rng, wName, wKind, ix0, 54, 37, iz1, y, 'N', 4, 2); doorway(bp, 33, 53, 34, 53, y, 3, TRIM, GLOW);
}

// ---------------------------------------------------------------------------------------------------- terraces
function terrace(bp, box, y, inner) {
  patternFloor(bp, box.x0 + 1, box.z0 + 1, box.x1 - 1, box.z1 - 1, y, PLATE, DARK, 6);
  bp.walls(box.x0, y + 1, box.z0, box.x1, y + 1, box.z1, RED);
  const free = (x, z) => x > box.x0 + 8 && x < box.x1 - 8 && z > box.z0 + 8 && z < box.z1 - 8 && !(x >= inner.x0 - 1 && x <= inner.x1 + 1 && z >= inner.z0 - 1 && z <= inner.z1 + 1);
  for (let x = box.x0 + 10; x < box.x1 - 9; x += 10) for (const z of [box.z0 + 3, box.z1 - 3]) { if (!free(x, z)) continue; bp.set(x, y + 1, z, B.VENT); bp.fill(x + 2, y + 1, z, x + 2, y + 2, z, BARS); bp.set(x + 2, y + 3, z, B.CITY_LAMP); }
  for (let z = box.z0 + 10; z < box.z1 - 9; z += 10) for (const x of [box.x0 + 3, box.x1 - 3]) { if (!free(x, z)) continue; bp.fill(x, y + 1, z, x, y + 2, z, STEEL); bp.set(x, y + 3, z, GLOW); }
}
// boulevard platform: slab at y 35 from the upper block's south door to the lot edge at the gangway column
function boulevardPlatform(bp) {
  const y = walk(7);
  bp.fill(DOOR_X - 4, y - 1, 90, DOOR_X + 5, y - 1, 101, PLATE);
  for (let z = 90; z <= 101; z++) { bp.set(DOOR_X - 4, y - 1, z, STRIPE); bp.set(DOOR_X + 5, y - 1, z, STRIPE); bp.fill(DOOR_X - 4, y, z, DOOR_X - 4, y, z, BARS); bp.fill(DOOR_X + 5, y, z, DOOR_X + 5, y, z, BARS); }
  bp.fill(DOOR_X - 4, y, 101, DOOR_X + 5, y, 101, AIR);   // open onto the gangway
  bp.fill(DOOR_X - 3, y, 90, DOOR_X + 4, y + 3, 101, AIR);
  for (const z of [92, 98]) for (const x of [DOOR_X - 4, DOOR_X + 5]) { bp.fill(x, y + 1, z, x, y + 2, z, BARS); bp.set(x, y + 3, z, B.CITY_LAMP); }
  // pylons down to the base roof terrace
  for (const [x, z] of [[DOOR_X - 4, 92], [DOOR_X + 5, 92], [DOOR_X - 4, 98], [DOOR_X + 5, 98]]) bp.fill(x, BASE.top + 1, z, x, y - 2, z, HULL);
  doorway(bp, DOOR_X, 89, DOOR_X + 1, 89, y, 3, TRIM, GLOW);
  bp.fill(DOOR_X - 2, y, 89, DOOR_X - 2, y + 3, 89, RED); bp.fill(DOOR_X + 3, y, 89, DOOR_X + 3, y + 3, 89, RED);
  bp.fill(DOOR_X - 1, y + 4, 89, DOOR_X + 2, y + 4, 89, HOLO);
  bp.door(DOOR_X, y, 101, 'S'); bp.door(DOOR_X, y, 89, 'S');
}

export const LANDMARK = {
  id: 'detention', name: 'Republic Judiciary Central Detention Center', span: [2, 2], height: 70, minW: 84, minD: 100,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Republic Judiciary Central Detention Center';
    // plateau repave: dark plating with a lit kerb strip around the fortress
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) bp.set(x, 0, z, (x < 2 || z < 2 || x > 82 || z > 99) ? ((x + z) % 5 === 0 ? GLOW : DARK) : PLATE);
    // solid masses
    bp.fill(BASE.x0, 1, BASE.z0, BASE.x1, BASE.top, BASE.z1, BLACK);
    bp.fill(UPPER.x0, BASE.top + 1, UPPER.z0, UPPER.x1, UPPER.top, UPPER.z1, DARK);
    bp.fill(KEEP.x0, UPPER.top + 1, KEEP.z0, KEEP.x1, KEEP.top, KEEP.z1, BLACK);
    // terraces and the deck floor first: room ceiling lights then show as lit tiles in the decks above them
    terrace(bp, BASE, BASE.top, UPPER);
    terrace(bp, UPPER, UPPER.top, KEEP);
    deckFloor(bp);
    // floors, top down: a room's ceiling lights sit in the slab of the floor above, so the lower floor must be
    // drawn after the upper one (the lights then read as lit tiles in the floor above)
    keepFloor(bp, rng, 11, 'storage', 'hangar');
    keepFloor(bp, rng, 10, 'barracks', 'barracks');
    keepFloor(bp, rng, 9, 'control_room', 'control_room');
    upperFloor(bp, rng, 8, { NW: ['executive_office', 'meeting_room'], NE: ['open_plan_office', 'archive'], SW: ['archive', 'library'], SE: ['lounge', 'restroom'] });
    upperFloor(bp, rng, 7, { NW: ['meeting_room', 'storage'], NE: ['courtroom'], SW: ['lobby_atrium'], SE: ['security_post', 'meeting_room'] });
    upperFloor(bp, rng, 6, { NW: ['barracks', 'barracks'], NE: ['barracks', 'gym'], SW: ['cafeteria', 'kitchen'], SE: ['lounge', 'medbay'] });
    controlFloor(bp, rng);
    guardFloor(bp, rng);
    interrogationFloor(bp, rng);
    cellFloor(bp, rng, 2, true);
    cellFloor(bp, rng, 1, false);
    groundFloor(bp, rng);
    // vertical circulation: spine lifts through every level up to the deck, three stair cores
    lifts(bp, 1, 61);
    stairCore(bp, 4, 46, 0, 5, BASE.top + 4, 'E');          // base: ground .. roof terrace (walk 26)
    stairCore(bp, 14, 14, 5, 9, UPPER.top + 4, 'E');        // upper block: 26 .. 46 (upper roof terrace)
    stairCore(bp, 30, 36, 9, 12, KEEP.top + 4, 'E');        // keep: 46 .. 61 (landing deck)
    boulevardPlatform(bp);
    // doors from the terraces into the blocks (west and east faces at the cross corridor / lift lobby rows)
    doorway(bp, UPPER.x0, 49, UPPER.x0, 50, walk(5), 3, TRIM, GLOW); doorway(bp, UPPER.x1, 49, UPPER.x1, 50, walk(5), 3, TRIM, GLOW);
    doorway(bp, KEEP.x0, 49, KEEP.x0, 50, walk(9), 3, TRIM, GLOW); doorway(bp, KEEP.x1, 49, KEEP.x1, 50, walk(9), 3, TRIM, GLOW);
    // facades, towers, deck
    facadeBlock(bp, BASE, 1, BASE.top, true);
    facadeBlock(bp, UPPER, BASE.top + 1, UPPER.top, true);
    facadeBlock(bp, KEEP, UPPER.top + 1, KEEP.top, false);
    bp.walls(KEEP.x0, walk(9) + 1, KEEP.z0, KEEP.x1, walk(9) + 2, KEEP.z1, GLASS);   // tactical ops window band
    for (const [tx, tz] of TOWERS) watchtower(bp, tx, tz);
    landingDeck(bp);
    // ground door, seal and emblem over the entrance
    for (let x = DOOR_X - 6; x <= DOOR_X + 7; x++) bp.set(x, 7, 99, (x % 2) ? RED : STRIPE);
    bp.fill(DOOR_X - 1, 8, 99, DOOR_X + 2, 10, 99, HOLO); bp.set(DOOR_X, 9, 99, GLOW); bp.set(DOOR_X + 1, 9, 99, GLOW);
    // re-open the ground door and the boulevard door through the facade pass
    doorway(bp, DOOR_X, 99, DOOR_X + 1, 99, walk(0), 3, TRIM, GLOW);
    bp.fill(DOOR_X - 3, 1, 99, DOOR_X - 2, 5, 99, RED); bp.fill(DOOR_X + 3, 1, 99, DOOR_X + 4, 5, 99, RED);
    doorway(bp, DOOR_X, 89, DOOR_X + 1, 89, walk(7), 3, TRIM, GLOW);
    bp.meta.floors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((f) => bp.y0 + walk(f));
  },
};
