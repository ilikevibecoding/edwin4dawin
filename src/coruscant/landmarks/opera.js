// Galaxies Opera House (docs/rubrics/06_landmarks.md, id 'opera').
//
// An elliptical shell of durasteel and chrome with glow strips tracing its curves, rising into a ribbed dome, joined
// to a foyer wing on the boulevard side. The boulevard gangway lands on a covered speeder drop-off deck (canopy on
// chrome pillars, parked speeders, holo marquees) in front of the grand entrance; inside, the double-height grand
// foyer with chandeliers, a bar, cloakroom counters and two sweeping curved stairs up to the upper-circle gallery.
// The auditorium: a horseshoe of tiered stalls in red wool on slab steps, a grand tier and an upper circle with
// curved fronts, the Chancellor's red-and-gold box with its antechamber and guards, the stage behind red curtains
// under a holo backdrop, an orchestra pit, a lighting bridge and a chandelier cluster under the dome. Below and
// behind: scenery workshop, dressing rooms, wardrobe, rehearsal halls, green room, canteen, artists' quarters,
// administration, interval bars, and a roof terrace bar on the wing. A stair core with landing catwalks and two
// turbolifts join every level. Pure function of the lot and ctx.rng.
// Local frame: x 0..93, z 0..87 (front = S), y 0 = repaved plateau, walk 1; floors on y = 5f; the boulevard deck and
// grand entrance are at walk 36; the dome tops out at y 60.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const STEEL = B.DURASTEEL, DARK = B.DURASTEEL_DARK, TRIM = B.CHROME, GLASS = B.STEEL_GLASS, PLATE = B.DECK_PLATE, HULL = B.HULL_PLATE;
const BLACK = B.PANEL_BLACK, RED = B.PANEL_RED, STRIPE = B.PANEL_STRIPE, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, HOLO = B.HOLO_SIGN;
const BARS = B.IRON_BARS, SLAB = B.STONE_BRICK_SLAB, LIT = B.WINDOW_LIT, RWOOL = B.RED_WOOL, WWOOL = B.WHITE_WOOL, GOLD = B.GOLD_BLOCK;
const CARPET = B.RED_WOOL, STONE = B.SMOOTH_STONE, PLASTER = B.PLASTER;

const W = 94, D = 88;
const ELL = { cx: 47, cz: 30, rx: 48, rz: 30 };                 // shell footprint (clipped to x 4..89, z 4..55)
const SHELL = { x0: 4, z0: 4, x1: 89, z1: 55, wallTop: 47 };
const WING = { x0: 6, z0: 56, x1: 87, z1: 82, top: 34 };       // lower wing (walk 1..31), roof = deck level y 35
const UPPER = { x0: 6, z0: 56, x1: 87, z1: 74, top: 45 };      // grand foyer wing (walk 36..44), roof terrace at 46
const DECK = { x0: 20, z0: 75, x1: 73, z1: 87, y: 35 };
const STAIR = { x: 8, z: 64 };                                  // 8 x 12 core, door east onto the wing corridor
const LIFTS = [{ x: 81, z: 71, faceZ: 70 }, { x: 84, z: 71, faceZ: 70 }];
const CORR = { z0: 68, z1: 70 };                                // wing corridor
const LINK = { x0: 45, x1: 48 };                                // wing link corridor to the auditorium block
const DOOR_X = 47;
const STAGE = { x0: 30, x1: 64, z0: 8, z1: 20, y: 21 };        // stage floor walk 21
const walk = (f) => 1 + 5 * f;
const E = (x, z) => ((x + 0.5 - ELL.cx) / ELL.rx) ** 2 + ((z + 0.5 - ELL.cz) / ELL.rz) ** 2;
const inShell = (x, z) => x >= SHELL.x0 && x <= SHELL.x1 && z >= SHELL.z0 && z <= SHELL.z1 && E(x, z) <= 1;
const domeH = (x, z) => SHELL.wallTop + Math.round(13 * Math.sqrt(Math.max(0, 1 - E(x, z))));
// interior half-width of the auditorium horseshoe at row z (inside the 2-thick shell)
const halfW = (z) => Math.min(40, Math.floor((ELL.rx - 3) * Math.sqrt(Math.max(0, 1 - ((z + 0.5 - ELL.cz) / ELL.rz) ** 2))));

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

const DRESS = [B.SHELF, B.CHEST, B.CRATE, B.BARREL, B.BOOKSHELF, B.CONSOLE];
const CIVIC = new Set(['courtroom', 'control_room', 'executive_office', 'meeting_room', 'lobby_atrium', 'archive', 'library', 'medbay', 'clinic_ward', 'council_chamber', 'holo_theatre', 'observation_deck', 'gallery', 'museum_hall', 'lounge', 'restaurant', 'cafeteria', 'open_plan_office']);
// civic rooms get shelves, consoles, benches, planters and holo boards; the crate-and-barrel filler is for stores
function dress(r, rng, civic = false) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(civic ? DRESS.filter((d) => d !== B.CRATE && d !== B.BARREL && d !== B.CHEST) : DRESS); r.put(u, 0, r.back, id === B.CONSOLE ? BLACK : id); if (id === B.SHELF || id === B.CONSOLE || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 3) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 4 === 0) r.planter(u, v, B.OAK_LEAVES); else { r.put(u, 0, v, TRIM); r.put(u, 1, v, (v % 2) ? HOLO : GLOW); } }
  if (r.w >= 10 && r.d >= 8) {
    let k = 0;
    for (let u = 3; u < r.w - 3; u += 5) for (let v = 4; v < r.back - 2; v += 5) {
      if (!r.free(u, v) || !r.empty(u, 0, v) || !r.free(u + 1, v) || !r.empty(u + 1, 0, v)) continue;
      const kind = (k++ + u) % 4;
      if (kind === 0) { r.table(u, v); r.table(u + 1, v); r.seat(u - 1, v); r.seat(u + 2, v); r.seat(u, v + 1); r.seat(u + 1, v - 1); }
      else if (kind === 1) { if (civic) { r.table(u, v); r.table(u + 1, v); r.seat(u, v + 1); r.seat(u + 1, v + 1); r.put(u - 1, 0, v, B.SHELF); } else { r.put(u, 0, v, B.CRATE); r.put(u, 1, v, B.CRATE); r.put(u + 1, 0, v, B.BARREL); r.put(u, 0, v + 1, B.CHEST); } }
      else if (kind === 2) { r.fill(u, 0, v, u, 2, v + 1, TRIM); r.put(u, 3, v, GLOW); r.put(u + 1, 0, v, B.SHELF); r.put(u + 1, 1, v, B.SHELF); }
      else { r.planter(u, v, B.OAK_LEAVES); r.seat(u + 1, v); r.seat(u, v + 1); r.put(u + 1, 0, v + 1, RWOOL); }
    }
  }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, lights = GLOW, floor = PLATE, backDoorU = -100) {
  carve(bp, x0, z0, x1, z1, y, floor);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW, backDoorU }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  if (r.w * r.d >= 60) dress(r, rng, CIVIC.has(name) || CIVIC.has(kind));
  r.ceilingLights(4, lights); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}

// ------------------------------------------------------------------------------------------------------ rooms
// dressing room: mirror wall (glass over chrome), tables with lamps, wardrobes, a costume rail, a couch
function dressingRoom(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  carve(bp, x0, z0, x1, z1, y, CARPET);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'dressing_room', {});
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, TRIM); r.put(u, 1, r.back, GLASS); r.put(u, 2, r.back, (u % 2) ? GLOW : GLASS); if (u % 3 === 1) { r.put(u, 0, r.back - 1, B.TABLE); r.seat(u, r.back - 2); } }
  for (let v = 2; v < r.back - 2; v += 2) { r.put(0, 0, v, B.SHELF); r.put(0, 1, v, B.SHELF); }
  for (let v = 2; v < r.back - 2; v += 3) { r.put(r.w - 1, 0, v, BARS); r.put(r.w - 1, 1, v, RWOOL); }
  r.put(r.w - 2, 0, 2, RWOOL); r.put(r.w - 3, 0, 2, RWOOL); r.spot(r.w - 2, 2, 'seat');
  r.put(1, 0, 2, B.CHEST);
  r.ceilingLights(3, GLOW); r.finalize();
  bp.room('dressing_room', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// bar: long chrome counter with stools, bottle shelves behind, high tables, holo menu boards
function bar(bp, rng, x0, z0, x1, z1, y, side, doorU, kind = 'bar') {
  carve(bp, x0, z0, x1, z1, y, BLACK);
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, kind, {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 3 ? BLACK : RWOOL);
  const cv = r.back - 2;
  for (let u = 1; u < r.w - 1; u++) { r.put(u, 0, cv, TRIM); r.put(u, 1, cv, SLAB); if (u % 2) { r.put(u, 0, cv - 1, SLAB); r.spot(u, cv - 1, 'seat'); } }
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.BARREL); r.put(u, 1, r.back, (u % 3) ? B.SHELF : GLOW); r.put(u, 2, r.back, (u % 4 === 2) ? HOLO : B.SHELF); }
  r.work(r.cu, cv + 1, 'bartender'); r.work(r.cu + 3, cv + 1, 'bartender');
  for (let u = 1; u + 1 < r.w; u += 4) for (let v = 2; v < cv - 3; v += 4) { r.table(u, v); r.seat(u - 1, v); r.seat(u + 1, v); r.seat(u, v + 1); }
  for (let u = 1; u < r.w; u += 5) r.putRaw(u, 3, 0, HOLO);
  r.ceilingLights(4, GLOW); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// lower foyer at street level: box office windows, cloakroom counters, benches, holo posters
function lowerFoyer(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, CARPET);
  patternFloor(bp, x0, z0, x1, z1, y - 1, CARPET, BLACK, 4);
  const cx = DOOR_X;
  for (let x = x0 + 2; x <= x0 + 12; x++) { bp.set(x, y, z0, TRIM); bp.set(x, y + 1, z0, (x % 3) ? GLASS : B.CONSOLE); bp.set(x, y + 2, z0, GLASS); }   // box office
  for (let x = x0 + 3; x <= x0 + 11; x += 4) bp.work(x, y, z0 + 1, 'ticket clerk');
  for (let x = x1 - 12; x <= x1 - 2; x++) { bp.set(x, y, z0, TRIM); bp.set(x, y + 1, z0, SLAB); bp.set(x, y + 2, z0, (x % 2) ? B.SHELF : GLOW); }   // cloakroom
  for (let x = x1 - 11; x <= x1 - 3; x += 4) bp.work(x, y, z0 + 1, 'cloakroom attendant');
  for (let x = x0 + 4; x <= x1 - 4; x += 6) { if (Math.abs(x - cx) <= 4) continue; for (const z of [z0 + 4, z1 - 3]) { bp.set(x, y, z, SLAB); bp.spot(x, y, z, 'seat'); bp.set(x + 1, y, z, SLAB); bp.spot(x + 1, y, z, 'seat'); } }
  for (let x = x0 + 5; x <= x1 - 5; x += 8) { bp.set(x, y + 1, z1 + 1, HOLO); bp.set(x, y + 2, z1 + 1, HOLO); bp.set(x + 1, y + 1, z1 + 1, HOLO); bp.set(x + 1, y + 2, z1 + 1, HOLO); }
  for (const x of [x0 + 8, cx - 6, cx + 7, x1 - 8]) { bp.fill(x, y, z0 + 6, x, y + 2, z0 + 6, TRIM); bp.set(x, y + 3, z0 + 6, GLOW); }
  for (let x = x0 + 1; x <= x1 - 1; x += 4) for (let z = z0 + 1; z <= z1 - 1; z += 4) bp.set(x, y + 4, z, (x + z) % 3 ? GLOW : RED);
  bp.room('lower_foyer', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// a 4-connected curved stair from (x0, z0) at height y0 to height y1 along an arc around (cx, cz) with radius r
// between angles a0 and a1; half steps alternate slab / full block, chrome railing posts on the outer side
function curvedStair(bp, cx, cz, r, a0, a1, y0, y1) {
  const cells = [];
  const n = Math.max(2, Math.round(Math.abs(a1 - a0) * r * 1.5));
  let px = null, pz = null;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    const x = Math.round(cx + r * Math.cos(a)), z = Math.round(cz + r * Math.sin(a));
    if (px !== null && (x !== px || z !== pz)) {
      if (x !== px && z !== pz) cells.push([x, pz]);     // keep the path 4-connected
      cells.push([x, z]);
    } else if (px === null) cells.push([x, z]);
    px = x; pz = z;
  }
  const steps = 2 * (y1 - y0);
  cells.forEach(([x, z], i) => {
    const t = Math.min(steps, Math.floor(i * steps / Math.max(1, cells.length - 1)));
    const slab = (t & 1) === 1, base = slab ? y0 + (t >> 1) : y0 + (t >> 1) - 1;   // standing height y0 + t/2
    bp.fill(x, y0 - 1, z, x, base - 1, z, DARK);
    bp.set(x, base, z, slab ? SLAB : STEEL);
    bp.fill(x, base + 1, z, x, base + 3, z, AIR);
    // railing on the outer side of the arc
    const ox = x + Math.sign(x + 0.5 - cx), oz = z + Math.sign(z + 0.5 - cz);
    const far = Math.abs(x + 0.5 - cx) > Math.abs(z + 0.5 - cz) ? [ox, z] : [x, oz];
    if (bp.isAir(far[0], base + 1, far[1]) && !cells.some(([a, b]) => a === far[0] && b === far[1])) { bp.set(far[0], base + 1, far[1], slab ? BARS : TRIM); }
  });
  return cells;
}
// the grand foyer: double height, chandeliers, bar island, cloakroom counters, two sweeping stairs to the gallery
function grandFoyer(bp, rng, x0, z0, x1, z1, y) {
  carve(bp, x0, z0, x1, z1, y, CARPET, 9);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, y - 1, z, ((x + z) % 7 === 0) ? GOLD : (x % 5 === 0 || z % 5 === 0) ? BLACK : CARPET);
  const cx = DOOR_X;
  // chandeliers: chrome stems from the ceiling with glow clusters
  for (const x of [x0 + 14, cx, x1 - 14]) for (const z of [z0 + 6, z1 - 5]) {
    bp.fill(x, y + 6, z, x, y + 8, z, TRIM);
    bp.set(x, y + 5, z, GLOW); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { bp.set(x + dx, y + 5, z + dz, TRIM); bp.set(x + dx, y + 4, z + dz, GLOW); }
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) bp.set(x + dx, y + 6, z + dz, GLOW);
  }
  // bar island in the middle
  for (let x = cx - 6; x <= cx + 7; x++) { bp.set(x, y, z0 + 10, TRIM); bp.set(x, y + 1, z0 + 10, SLAB); if (x % 2) { bp.set(x, y, z0 + 11, SLAB); bp.spot(x, y, z0 + 11, 'seat'); } }
  for (let x = cx - 5; x <= cx + 6; x += 3) { bp.set(x, y, z0 + 8, B.BARREL); bp.set(x, y + 1, z0 + 8, B.SHELF); bp.set(x, y + 2, z0 + 8, GLOW); }
  bp.work(cx, y, z0 + 9, 'bartender'); bp.work(cx + 3, y, z0 + 9, 'bartender');
  // cloakroom counters along the west and east walls
  for (let z = z0 + 3; z <= z0 + 9; z++) { for (const x of [x0 + 1, x1 - 1]) { bp.set(x, y, z, TRIM); bp.set(x, y + 1, z, SLAB); } bp.set(x0, y + 1, z, B.SHELF); bp.set(x1, y + 1, z, B.SHELF); bp.set(x0, y + 2, z, (z % 2) ? B.SHELF : GLOW); bp.set(x1, y + 2, z, (z % 2) ? B.SHELF : GLOW); }
  bp.work(x0 + 2, y, z0 + 6, 'cloakroom attendant'); bp.work(x1 - 2, y, z0 + 6, 'cloakroom attendant');
  // seating clusters and planters near the entrance
  for (const x of [x0 + 8, x0 + 20, x1 - 20, x1 - 8]) { bp.set(x, y, z1 - 3, B.TABLE); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { bp.set(x + dx, y, z1 - 3 + dz, RWOOL); bp.spot(x + dx, y, z1 - 3 + dz, 'seat'); } }
  for (let x = x0 + 4; x <= x1 - 4; x += 12) { if (Math.abs(x - cx) <= 5) continue; bp.set(x, y, z1, DARK); bp.set(x, y + 1, z1, B.OAK_LEAVES); }
  // programme boards and the marquee band inside over the doors
  for (let x = x0 + 2; x <= x1 - 2; x += 3) bp.set(x, y + 3, z1 + 1, (x % 2) ? HOLO : GOLD);
  for (let x = x0 + 2; x <= x1 - 2; x += 4) for (let z = z0 + 2; z <= z1 - 2; z += 4) bp.set(x, y + 9, z, (x + z) % 3 ? GLOW : GOLD);
  // the upper-circle gallery: a mezzanine slab along the north side at y + 5 with a chrome rail, reached by the
  // two sweeping stairs that curve up from the foyer floor
  const gy = y + 5;
  bp.fill(x0, gy - 1, z0, x1, gy - 1, z0 + 3, PLATE);
  for (let x = x0; x <= x1; x++) bp.set(x, gy, z0 + 4, (x % 3) ? BARS : TRIM);
  bp.fill(x0, gy - 1, z0 + 4, x1, gy - 1, z0 + 4, TRIM);
  for (let x = x0 + 3; x <= x1 - 3; x += 6) bp.set(x, gy - 2, z0 + 2, GLOW);
  for (let x = x0 + 4; x <= x1 - 4; x += 5) { if (x <= x0 + 14 || x >= x1 - 14) continue; bp.set(x, gy, z0 + 3, RWOOL); bp.spot(x, gy, z0 + 3, 'seat'); bp.set(x + 2, gy, z0 + 3, DARK); bp.set(x + 2, gy + 1, z0 + 3, B.OAK_LEAVES); }
  for (let x = x0 + 2; x <= x1 - 2; x += 3) { bp.set(x, gy + 1, z0 - 1, (x % 2) ? HOLO : GOLD); bp.set(x, gy + 2, z0 - 1, HOLO); }
  curvedStair(bp, x0 + 14, z0 + 4, 12, Math.PI / 2, Math.PI, y, gy);          // west stair: from (x0+14, z0+16) up to (x0+2, z0+4)
  curvedStair(bp, x1 - 14, z0 + 4, 12, Math.PI / 2, 0, y, gy);                // east stair mirrored
  bp.room('grand_foyer', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  bp.room('gallery', x0 - 1, gy, z0 - 1, x1 + 1, z0 + 4);
  bp.meta.lobby = { x: bp.wx(cx), y: bp.wy(y), z: bp.wz(z1 - 6) };
}
// the auditorium: horseshoe stalls, grand tier and upper circle, Chancellor's box, stage, pit, curtains, dome
function auditorium(bp, rng) {
  const y = STAGE.y;                       // stalls start level with the stage floor
  // carve the whole volume inside the shell from the stage house to the back wall, up to the dome's inner surface
  for (let z = STAGE.z0; z <= 53; z++) {
    const stage = z <= STAGE.z1, hw = halfW(z);
    const xa = stage ? STAGE.x0 : ELL.cx - hw, xb = stage ? STAGE.x1 : ELL.cx + hw - 1;
    for (let x = xa; x <= xb; x++) {
      const top = stage ? 44 : Math.max(y + 8, domeH(x, z) - 2);
      bp.fill(x, y, z, x, top, z, AIR);
      bp.set(x, y - 1, z, stage ? B.OAK_PLANKS : CARPET);
    }
  }
  // the horseshoe wall: red wool panels between gold bands at the balcony levels with glow strips, so the house reads
  // as a red-and-gold opera interior instead of the bare dark shell
  for (let z = STAGE.z1 + 2; z <= 53; z++) {
    const hw = halfW(z);
    for (const wx of [ELL.cx - hw - 1, ELL.cx + hw]) {
      for (let yy = y; yy <= 46; yy++) {
        if (bp.isAir(wx, yy, z)) continue;
        const band = yy === 34 || yy === 39 || yy === 45;
        bp.set(wx, yy, z, band ? ((z % 4 === 0) ? GLOW : GOLD) : ((z % 6 === 0) ? GOLD : RWOOL));
      }
    }
  }
  // proscenium wall with the opening, red curtains and gold frame
  for (let x = ELL.cx - halfW(STAGE.z1 + 1); x <= ELL.cx + halfW(STAGE.z1 + 1) - 1; x++) for (let yy = y; yy <= 46; yy++) bp.set(x, yy, STAGE.z1 + 1, DARK);
  bp.fill(34, y, STAGE.z1 + 1, 60, y + 13, STAGE.z1 + 1, AIR);
  bp.fill(33, y, STAGE.z1 + 1, 33, y + 14, STAGE.z1 + 1, GOLD); bp.fill(61, y, STAGE.z1 + 1, 61, y + 14, STAGE.z1 + 1, GOLD); bp.fill(33, y + 14, STAGE.z1 + 1, 61, y + 14, STAGE.z1 + 1, GOLD);
  bp.fill(34, y, STAGE.z1 + 2, 36, y + 13, STAGE.z1 + 2, RWOOL); bp.fill(58, y, STAGE.z1 + 2, 60, y + 13, STAGE.z1 + 2, RWOOL);     // side curtains
  bp.fill(37, y + 10, STAGE.z1 + 2, 57, y + 13, STAGE.z1 + 2, RWOOL);                                                            // valance
  for (let x = 37; x <= 57; x += 4) bp.set(x, y + 9, STAGE.z1 + 2, GOLD);
  // stage: holo backdrop, wings, lighting bridge, footlights, scenery flats
  for (let x = STAGE.x0; x <= STAGE.x1; x++) for (let yy = y; yy <= y + 12; yy++) bp.set(x, yy, STAGE.z0 - 1, (x + yy) % 9 === 0 ? BLUE : HOLO);
  for (let x = STAGE.x0 + 2; x <= STAGE.x1 - 2; x += 3) { bp.set(x, y + 14, STAGE.z1 - 1, BARS); bp.set(x, y + 13, STAGE.z1 - 1, (x % 2) ? GLOW : B.LANTERN); }
  for (let x = 36; x <= 58; x += 2) bp.set(x, y - 1, STAGE.z1, GLOW);
  for (const [x, z] of [[STAGE.x0 + 3, STAGE.z0 + 4], [STAGE.x1 - 3, STAGE.z0 + 4], [STAGE.x0 + 6, STAGE.z0 + 9], [STAGE.x1 - 6, STAGE.z0 + 9]]) { bp.fill(x, y, z, x, y + 4, z, TRIM); bp.set(x, y + 2, z, HOLO); }
  for (let x = 44; x <= 50; x += 3) { bp.set(x, y, STAGE.z0 + 6, GOLD); bp.spot(x, y, STAGE.z0 + 7, 'stand'); }
  bp.work(47, y, STAGE.z0 + 8, 'performer'); bp.work(41, y, STAGE.z0 + 7, 'performer'); bp.work(53, y, STAGE.z0 + 7, 'performer');
  // set pieces: a chrome throne on a dais, columns, a holo moon, crates in the wings, follow-spot stands
  bp.fill(45, y, STAGE.z0 + 2, 49, y, STAGE.z0 + 3, GOLD); bp.set(47, y + 1, STAGE.z0 + 2, TRIM); bp.set(47, y + 2, STAGE.z0 + 2, RWOOL);
  for (const x of [38, 56]) { bp.fill(x, y, STAGE.z0 + 3, x, y + 6, STAGE.z0 + 3, PLASTER); bp.set(x, y + 7, STAGE.z0 + 3, GOLD); }
  bp.fill(46, y + 8, STAGE.z0 + 1, 48, y + 10, STAGE.z0 + 1, BLUE);
  for (let z = STAGE.z0 + 1; z <= STAGE.z1 - 1; z += 3) { bp.set(STAGE.x0 + 1, y, z, B.CRATE); bp.set(STAGE.x1 - 1, y, z, B.CRATE); if (z % 2) { bp.set(STAGE.x0 + 1, y + 1, z, B.CRATE); bp.set(STAGE.x1 - 1, y + 1, z, B.BARREL); } }
  for (const x of [STAGE.x0 + 2, STAGE.x1 - 2]) { bp.fill(x, y, STAGE.z1 - 2, x, y + 2, STAGE.z1 - 2, BARS); bp.set(x, y + 3, STAGE.z1 - 2, B.CITY_LAMP); }
  bp.room('stage', STAGE.x0 - 1, y, STAGE.z0 - 1, STAGE.x1 + 1, STAGE.z1 + 1);
  // orchestra pit in front of the stage (one block lower), music stands, conductor's podium, rail
  const pz0 = STAGE.z1 + 2, pz1 = STAGE.z1 + 4;
  bp.fill(37, y - 1, pz0, 57, y - 1, pz1, AIR); bp.fill(37, y - 2, pz0, 57, y - 2, pz1, B.OAK_PLANKS);
  bp.fill(36, y - 2, pz0, 36, y - 1, pz1, DARK); bp.fill(58, y - 2, pz0, 58, y - 1, pz1, DARK); bp.fill(37, y - 2, pz1 + 1, 57, y - 1, pz1 + 1, DARK);
  for (let x = 38; x <= 56; x += 3) { bp.set(x, y - 1, pz0 + 1, B.TABLE); bp.set(x, y - 1, pz0, SLAB); bp.spot(x, y - 1, pz0, 'seat'); bp.work(x, y - 1, pz0, 'musician'); }
  bp.set(47, y - 1, pz1, GOLD); bp.work(47, y, pz1, 'conductor');
  bp.fill(36, y, pz1 + 1, 58, y, pz1 + 1, BARS);
  bp.room('orchestra_pit', 36, y - 1, pz0 - 1, 58, pz1 + 1);
  // stalls: rows of red seats on slab steps rising toward the back; centre and side aisles
  const s0 = pz1 + 2;
  // rows cycle floor / seats / half step, rising one block every three rows; aisles down the centre and at the
  // vomitory columns (x 30..32 and 62..64)
  const isAisle = (x) => x === 46 || x === 47 || (x >= 30 && x <= 32) || (x >= 62 && x <= 64);
  for (let z = s0; z <= 53; z++) {
    const k = z - s0, level = y + Math.floor(k / 3), step = k % 3;
    const hw = halfW(z) - 1;
    for (let x = ELL.cx - hw; x <= ELL.cx + hw - 1; x++) {
      bp.fill(x, y - 1, z, x, level - 1, z, DARK);
      bp.set(x, level, z, step === 2 ? SLAB : CARPET);
      // every third seat is the one an NPC takes: a spruce slab (a spot inside a solid wool block is pruned)
      if (!isAisle(x) && step === 1) { if (x % 3 === 0) { bp.set(x, level + 1, z, B.SPRUCE_SLAB); bp.spot(x, level + 1, z, 'seat'); } else bp.set(x, level + 1, z, RWOOL); }
    }
  }
  bp.room('stalls', ELL.cx - halfW(s0), y, s0, ELL.cx + halfW(s0), 41);
  // grand tier (walk 36) and upper circle (walk 41): curved-front balconies over the back of the stalls
  for (const [ty, zf, kind] of [[36, 42, 'grand_tier'], [41, 46, 'upper_circle']]) {
    for (let z = zf; z <= 53; z++) {
      const hw = halfW(z) - 1, k = z - zf, level = ty + Math.floor(k / 3);
      for (let x = ELL.cx - hw; x <= ELL.cx + hw - 1; x++) {
        bp.fill(x, ty - 1, z, x, level - 1, z, DARK);
        bp.set(x, level, z, k % 3 === 2 ? SLAB : CARPET);
        const aisle = x === 46 || x === 47;
        if (z === zf) { bp.set(x, level + 1, z, (x % 3) ? BARS : GOLD); continue; }
        if (!aisle && k % 3 === 1) { if (x % 3 === 0) { bp.set(x, level + 1, z, B.SPRUCE_SLAB); bp.spot(x, level + 1, z, 'seat'); } else bp.set(x, level + 1, z, RWOOL); }
      }
    }
    // the balcony front face in gold with glow strip; lights in the underside over the rows below
    for (let x = ELL.cx - halfW(zf) + 1; x <= ELL.cx + halfW(zf) - 2; x++) { bp.set(x, ty - 1, zf, GOLD); bp.set(x, ty - 2, zf, (x % 2) ? GLOW : GOLD); }
    for (let z = zf + 2; z <= 53; z += 4) for (let x = ELL.cx - halfW(z) + 3; x <= ELL.cx + halfW(z) - 4; x += 4) if (!bp.isAir(x, ty - 1, z)) bp.set(x, ty - 1, z, GLOW);
    bp.room(kind, ELL.cx - halfW(zf), ty, zf, ELL.cx + halfW(zf), 54);
    // doors from the foyer wing through the south wall (z 55/56) at both sides
    for (const dx of [26, 67]) { doorway(bp, dx, 55, dx + 1, 55, ty + (ty === 36 ? 0 : 0), 3, GOLD, GLOW); doorway(bp, dx, 56, dx + 1, 56, ty, 3, GOLD, GLOW); bp.fill(dx, ty - 1, 54, dx + 1, ty - 1, 56, CARPET); bp.fill(dx, ty, 54, dx + 1, ty + 2, 54, AIR); }
  }
  // Chancellor's box on the east side between the stalls and the grand tier: red and gold, antechamber, guards
  const bx0 = 70, bx1 = 76, bz0 = 32, bz1 = 38, by = 31;
  bp.fill(bx0 - 1, by - 1, bz0 - 1, bx1 + 1, by + 5, bz1 + 1, GOLD);
  carve(bp, bx0, bz0, bx1, bz1, by, RWOOL, 5);
  // red walls with gold pilasters every third block and a gold cornice, the gold shell shows only as trim
  for (let yy = by; yy <= by + 3; yy++) {
    for (let z = bz0; z <= bz1; z++) bp.set(bx1 + 1, yy, z, ((z - bz0) % 3 === 0 || yy === by + 3) ? GOLD : RWOOL);
    for (let x = bx0; x <= bx1; x++) for (const z of [bz0 - 1, bz1 + 1]) bp.set(x, yy, z, ((x - bx0) % 3 === 0 || yy === by + 3) ? GOLD : RWOOL);
  }
  bp.fill(bx0 - 1, by, bz0, bx0 - 1, by + 1, bz1, AIR);                                  // open front toward the stage side
  bp.fill(bx0 - 1, by, bz0, bx0 - 1, by, bz1, BARS); bp.fill(bx0 - 1, by + 2, bz0, bx0 - 1, by + 3, bz1, AIR);
  // the Chancellor's throne on a gold dais at the centre, two aides' seats, drapes down both sides, a refreshment table
  // with gold goblets, holo emblem behind, guards at the door
  for (let z = bz0; z <= bz1; z++) bp.set(bx0, by - 1, z, GOLD);
  bp.fill(bx0 + 2, by, bz0 + 2, bx0 + 3, by, bz0 + 4, GOLD);
  bp.set(bx0 + 2, by + 1, bz0 + 3, RWOOL); bp.set(bx0 + 3, by + 1, bz0 + 3, GOLD); bp.set(bx0 + 3, by + 2, bz0 + 3, GOLD); bp.spot(bx0 + 2, by + 1, bz0 + 3, 'seat');
  for (const z of [bz0 + 1, bz1 - 1]) { bp.set(bx0 + 1, by, z, RWOOL); bp.spot(bx0 + 1, by, z, 'seat'); }
  for (const z of [bz0, bz1]) for (let yy = by; yy <= by + 4; yy++) bp.set(bx0 + 1, yy, z, (yy % 2) ? RWOOL : GOLD);   // drapes
  bp.set(bx1, by, bz0 + 2, B.TABLE); bp.set(bx1, by, bz0 + 3, B.TABLE); bp.set(bx1, by + 1, bz0 + 2, GOLD); bp.set(bx1, by, bz0 + 4, B.TABLE); bp.set(bx1, by + 1, bz0 + 4, GOLD);
  bp.fill(bx1 + 1, by + 1, bz0 + 2, bx1 + 1, by + 3, bz0 + 4, HOLO); bp.set(bx1 + 1, by + 2, bz0 + 3, GOLD);
  bp.fill(bx0 + 1, by + 4, bz0 + 1, bx1 - 1, by + 4, bz1 - 1, RWOOL); for (let z = bz0 + 1; z <= bz1 - 1; z += 2) bp.set(bx0 + 3, by + 4, z, GLOW);
  bp.set(bx1 - 1, by + 4, bz0 + 3, GLOW); bp.work(bx1 - 1, by, bz0 + 1, 'red guard'); bp.work(bx1 - 1, by, bz1 - 1, 'red guard');
  bp.room('chancellor_box', bx0 - 1, by, bz0 - 1, bx1 + 1, bz1 + 1);
  // antechamber behind the box and the private corridor south to the wing at walk 31
  carve(bp, bx1 + 2, bz0, bx1 + 7, bz1, by, RWOOL);
  bp.fill(bx1 + 1, by - 1, bz0 - 1, bx1 + 8, by - 1, bz1 + 1, GOLD);
  bp.set(bx1 + 3, by, bz0 + 1, RWOOL); bp.set(bx1 + 4, by, bz0 + 1, RWOOL); bp.spot(bx1 + 3, by, bz0 + 1, 'seat'); bp.set(bx1 + 6, by, bz0 + 1, B.CHEST); bp.set(bx1 + 6, by, bz1 - 1, B.TABLE);
  bp.set(bx1 + 4, by + 4, bz0 + 3, GLOW); bp.set(bx1 + 7, by + 1, bz0 + 3, HOLO);
  bp.set(bx1 + 3, by, bz1 - 1, RWOOL); bp.set(bx1 + 4, by, bz1 - 1, RWOOL); bp.spot(bx1 + 4, by, bz1 - 1, 'seat'); bp.set(bx1 + 5, by, bz0 + 1, B.SHELF); bp.set(bx1 + 5, by + 1, bz0 + 1, GOLD); bp.set(bx1 + 2, by, bz0 + 3, DARK); bp.set(bx1 + 2, by + 1, bz0 + 3, B.OAK_LEAVES);
  doorway(bp, bx1 + 1, bz0 + 2, bx1 + 1, bz0 + 3, by, 3, GOLD, GLOW);
  bp.work(bx1 + 2, by, bz0 + 5, 'guard'); bp.work(bx1 + 6, by, bz0 + 5, 'guard');
  bp.room('chancellor_antechamber', bx1 + 1, by, bz0 - 1, bx1 + 8, bz1 + 1);
  bp.fill(bx1 + 9, by - 1, bz0 - 1, 88, by + 5, bz1 + 1, GOLD);                       // ties the suite to the shell wall
  carve(bp, 78, bz1 + 2, 80, 55, by, RWOOL);
  for (let z = bz1 + 2; z <= 45; z++) { bp.set(77, by, z, (z % 3) ? BARS : GOLD); bp.set(77, by - 1, z, GOLD); }   // gallery rail over the stalls
  for (let z = bz1 + 3; z <= 54; z += 4) bp.set(79, by + 4, z, GLOW);
  doorway(bp, 79, bz1 + 1, 80, bz1 + 1, by, 3, GOLD, GLOW);
  doorway(bp, 78, 56, 80, 56, by, 3, GOLD, GLOW);
  bp.room('private_corridor', 77, by, bz1 + 1, 81, 56);
  // vomitories: tunnels under the rake from the wing (z 56) to the front rows, at the aisle columns
  for (const [x0, x1] of [[30, 32], [62, 64]]) {
    carve(bp, x0, 28, x1, 55, y, CARPET);
    for (let z = 30; z <= 54; z += 4) { bp.set(x0 + 1, y + 4, z, GLOW); bp.set(x0, y + 2, z + 2, HOLO); bp.set(x1, y + 2, z + 2, GOLD); bp.set(x0, y, z + 2, TRIM); bp.set(x1, y, z + 2, TRIM); }
    doorway(bp, x0, 56, x1, 56, y, 3, GOLD, GLOW);
    bp.fill(x0, y, 28, x1, y + 3, 29, AIR);
    bp.room('vomitory', x0 - 1, y, 30, x1 + 1, 56);
  }
  // lighting bridge over the stalls and the dome's chandelier cluster
  for (let x = 30; x <= 64; x += 2) { bp.set(x, 44, 30, BARS); bp.set(x, 43, 30, (x % 4) ? GLOW : B.LANTERN); }
  const cy = domeH(47, 38) - 3;
  bp.fill(46, cy, 37, 47, cy + 2, 38, TRIM);
  for (let r = 1; r <= 4; r++) for (let a = 0; a < 8; a++) { const x = Math.round(46.5 + r * 1.6 * Math.cos(a / 8 * Math.PI * 2)), z = Math.round(37.5 + r * 1.6 * Math.sin(a / 8 * Math.PI * 2)); bp.set(x, cy - r + 3, z, (r + a) % 2 ? GLOW : TRIM); }
  for (let z = 22; z <= 53; z += 5) for (let x = 20; x <= 74; x += 6) { const top = domeH(x, z) - 1; if (bp.isAir(x, top - 1, z)) bp.set(x, top, z, (x + z) % 2 ? GLOW : GOLD); }
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
    bp.fill(tx0 + 3, level + 4, tz0 + 1, tx0 + 4, level + 4, tz0 + 10, PLATE);
    bp.set(tx0 + 3, level + 3, east ? tz0 + 10 : tz0 + 1, GLOW); bp.set(tx0 + 4, level + 3, east ? tz0 + 1 : tz0 + 10, GOLD);
    bp.set(tx0 + 1, level + 2, tz0 + 5, HOLO);
    bp.room('stairwell', tx0, level, tz0, tx0 + 7, tz0 + 11);
  }
  bp.set(tx0 + 3, yTop + 3, tz0 + 5, GLOW); bp.set(tx0 + 4, yTop + 3, tz0 + 6, GOLD);
  bp.set(tx0 + 1, yTop, tz0 + 1, B.CRATE); bp.set(tx0 + 1, yTop + 1, tz0 + 1, B.CRATE); bp.set(tx0 + 2, yTop, tz0 + 1, B.BARREL);
  bp.set(tx0 + 6, yTop, tz0 + 10, BLACK); bp.set(tx0 + 6, yTop + 1, tz0 + 10, B.CONSOLE); bp.set(tx0 + 5, yTop, tz0 + 10, SLAB); bp.spot(tx0 + 5, yTop, tz0 + 10, 'seat');
  bp.set(tx0 + 1, yTop, tz0 + 10, B.CHEST); bp.set(tx0 + 6, yTop, tz0 + 1, B.SHELF); bp.set(tx0 + 6, yTop + 1, tz0 + 1, B.SHELF);
  bp.room('stairwell', tx0, yTop, tz0, tx0 + 7, tz0 + 11);
  for (let f = f0; f <= f1; f++) doorway(bp, tx0 + 7, tz0 + 5, tx0 + 7, tz0 + 6, walk(f), 3, TRIM, GOLD);
}
function lifts(bp, y0, y1) {
  for (const l of LIFTS) {
    bp.fill(l.x - 1, y0 - 1, l.z, l.x - 1, y1 + 3, l.z + 2, BLACK); bp.fill(l.x + 2, y0 - 1, l.z, l.x + 2, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x - 1, y0 - 1, l.z + 2, l.x + 2, y1 + 3, l.z + 2, BLACK);
    bp.fill(l.x, y0, l.z, l.x + 1, y1 + 2, l.z + 1, AIR);
    bp.fill(l.x, y1 + 3, l.z, l.x + 1, y1 + 3, l.z + 1, BLACK);
    bp.lift(l.x, l.z, y0, y1);
    for (let y = y0; y <= y1; y += 5) {
      bp.set(l.x - 1, y + 3, l.z, GOLD); bp.set(l.x + 2, y + 3, l.z, GOLD);
      bp.set(l.x, y - 1, l.faceZ, STRIPE); bp.set(l.x + 1, y - 1, l.faceZ, STRIPE);
      bp.fill(l.x, y - 1, l.z, l.x + 1, y - 1, l.z + 1, AIR);
    }
  }
}

// ------------------------------------------------------------------------------------------------------ floors
const CUSTOM = { dressing_room: dressingRoom, bar: (bp, rng, x0, z0, x1, z1, y, side, doorU) => bar(bp, rng, x0, z0, x1, z1, y, side, doorU, 'bar') };
function place(bp, rng, name, x0, z0, x1, z1, y, side, doorU) {
  if (CUSTOM[name]) CUSTOM[name](bp, rng, x0, z0, x1, z1, y, side, doorU); else template(bp, rng, name, name, x0, z0, x1, z1, y, side, doorU, 2);
}
function rowX(bp, rng, names, ranges, z0, z1, y, side) {
  ranges.forEach(([x0, x1], i) => {
    const name = names[i % names.length]; if (!name) return;
    const doorU = Math.floor((x1 - x0 + 1) / 2) - 1, dx = x0 + doorU, dz = side === 'S' ? z1 + 1 : z0 - 1;
    place(bp, rng, name, x0, z0, x1, z1, y, side, doorU);
    doorway(bp, dx, dz, dx + 1, dz, y, 3, TRIM, GLOW);
  });
}
const WING_W = [[17, 29], [31, 43]], WING_E = [[50, 62], [64, 79]];
// lower wing floor: corridor z 68..70, link corridor x 45..48 north to the block, north/south room bands
function wingFloor(bp, rng, f, north, south, extras = {}) {
  const y = walk(f);
  carve(bp, 16, CORR.z0, 79, CORR.z1, y, BLACK); for (let x = 16; x <= 79; x += 4) bp.set(x, y + 4, CORR.z0 + 1, (x % 8) ? GLOW : GOLD);
  for (let x = 16; x <= 79; x++) bp.set(x, y - 1, CORR.z0 + 1, RWOOL);
  // lift lobby east of the corridor
  carve(bp, 80, CORR.z0, 86, CORR.z1, y, BLACK); bp.set(83, y + 4, 69, GOLD);
  if (f <= 3) {
    // link corridor north into the backstage block
    carve(bp, LINK.x0, 57, LINK.x1, CORR.z0 - 1, y, BLACK); for (let z = 58; z <= 66; z += 4) bp.set(46, y + 4, z, GLOW);
    doorway(bp, LINK.x0, 56, LINK.x1, 56, y, 3, TRIM, GOLD);
    if (north) rowX(bp, rng, north, [...WING_W, ...WING_E], 57, 66, y, 'S');
  } else if (f === 4) {
    // stalls level: two passages to the vomitories (x 30..32 and 62..64) split the north band
    for (const [x0, x1] of [[30, 32], [62, 64]]) { carve(bp, x0, 57, x1, CORR.z0 - 1, y, CARPET); for (let z = 58; z <= 66; z += 4) bp.set(x0 + 1, y + 4, z, GOLD); }
    if (north) rowX(bp, rng, north, [[17, 28], [34, 43], [50, 60], [66, 79]], 57, 66, y, 'S');
  } else if (north) rowX(bp, rng, north, [[17, 29], [31, 43], [45, 62], [64, 79]], 57, 66, y, 'S');
  if (south) rowX(bp, rng, south, extras.southRanges || [[17, 29], [31, 43], [45, 57], [59, 71]], 72, 81, y, 'N');
  if (extras.eastSouth) { place(bp, rng, extras.eastSouth, 73, 72, 79, 81, y, 'N', 2); doorway(bp, 75, 71, 76, 71, y, 3, TRIM, GLOW); }
}
// backstage floor inside the shell: corridor cross + bands; the stage house (x 30..64, z 8..20) gets its own rooms
function backstageFloor(bp, rng, f, plan) {
  const y = walk(f);
  carve(bp, 46, 8, 48, 55, y, BLACK); for (let z = 8; z <= 55; z += 4) bp.set(47, y + 4, z, (z % 8) ? GLOW : RED);
  carve(bp, 12, 30, 82, 32, y, BLACK); for (let x = 12; x <= 82; x += 4) bp.set(x, y + 4, 31, (x % 8) ? GLOW : RED);
  carve(bp, 30, 43, 64, 45, y, BLACK); for (let x = 30; x <= 64; x += 4) bp.set(x, y + 4, 44, GLOW);
  doorway(bp, 46, 56, 48, 56, y, 3, TRIM, GOLD);
  const west = [[12, 23], [25, 36], [38, 44]], east = [[50, 56], [58, 69], [71, 82]];
  if (plan.N) rowX(bp, rng, plan.N, [...west, ...east], 22, 29, y, 'S');
  if (plan.S) rowX(bp, rng, plan.S, [...west, ...east], 33, 42, y, 'N');
  if (plan.FS) rowX(bp, rng, plan.FS, [[30, 44], [50, 64]], 46, 53, y, 'N');
  if (plan.stage) {
    // rooms either side of the corridor inside the stage house
    for (const [x0, x1, side, dx, i] of [[39, 44, 'E', 45, 0], [49, 55, 'W', 48, 1]]) { const n = plan.stage[i % plan.stage.length]; template(bp, rng, n, n, x0, 8, x1, 20, y, side, 5, 2, GLOW, PLATE, 5); doorway(bp, dx, 13, dx, 14, y, 3, TRIM, GLOW); }
    for (const [x0, x1, side, dx, i] of [[30, 37, 'E', 38, 2], [57, 64, 'W', 56, 3]]) { place(bp, rng, plan.stage[i % plan.stage.length], x0, 8, x1, 20, y, side, 5); doorway(bp, dx, 13, dx, 14, y, 3, TRIM, GLOW); }
  }
}
// scenery workshop under the stage: double height with a gantry, flats, paint frames, a scenery lift platform
function sceneryWorkshop(bp, rng, y) {
  carve(bp, 30, 8, 64, 20, y, PLATE, 9);
  patternFloor(bp, 30, 8, 64, 20, y - 1, PLATE, STRIPE, 5);
  const r = new Room(bp, { x0: 30, z0: 8, x1: 64, z1: 20, y, h: 9, side: 'S', doorU: 16, doorW: 3 }, 'scenery_workshop', {});
  ROOMS.workshop.fn(r, rng, {});
  for (let u = 2; u < r.w - 2; u += 6) { r.fill(u, 0, r.back - 2, u, 6, r.back - 2, BARS); r.put(u, 3, r.back - 3, HOLO); r.put(u + 1, 0, r.back - 2, B.OAK_PLANKS); r.put(u + 1, 1, r.back - 2, B.OAK_PLANKS); r.put(u + 1, 2, r.back - 2, (u % 2) ? RWOOL : B.WHITE_WOOL); }   // flats
  for (let u = 1; u < r.w; u += 3) { r.put(u, 0, 1, B.CRATE); if (u % 2) r.put(u, 1, 1, B.BARREL); }
  r.fill(1, 6, 0, r.w - 2, 6, 0, BARS); for (let u = 2; u < r.w - 2; u += 4) r.put(u, 7, 0, GLOW);     // gantry rail
  r.fill(r.cu - 3, 0, 4, r.cu + 3, 0, 8, GOLD); r.put(r.cu, 1, 6, B.ANVIL); r.work(r.cu - 1, 6, 'stage hand'); r.work(r.cu + 2, 5, 'stage hand');
  for (let u = 1; u < r.w - 1; u += 4) for (let v = 2; v <= r.back; v += 4) r.putRaw(u, 9, v, (u + v) % 3 ? GLOW : BLUE);
  r.finalize();
  doorway(bp, 46, 21, 48, 21, y, 3, TRIM, GOLD);
  bp.room('scenery_workshop', 29, y, 7, 65, 21);
}
// roof terrace bar on the foyer wing: bar counter, tables, planters, railings, lamps, view of the dome
function roofTerrace(bp) {
  const y = walk(9), x0 = UPPER.x0 + 1, z0 = UPPER.z0 + 1, x1 = UPPER.x1 - 1, z1 = UPPER.z1 - 1;
  patternFloor(bp, x0, z0, x1, z1, y - 1, PLATE, RWOOL, 5);
  bp.walls(UPPER.x0, y, UPPER.z0, UPPER.x1, y, UPPER.z1, TRIM); bp.walls(UPPER.x0, y + 1, UPPER.z0, UPPER.x1, y + 1, UPPER.z1, BARS);
  for (let x = 30; x <= 64; x++) { bp.set(x, y, z0 + 4, TRIM); bp.set(x, y + 1, z0 + 4, SLAB); if (x % 2) { bp.set(x, y, z0 + 5, SLAB); bp.spot(x, y, z0 + 5, 'seat'); } }
  for (let x = 32; x <= 62; x += 5) { bp.set(x, y, z0 + 2, B.BARREL); bp.set(x, y + 1, z0 + 2, B.SHELF); bp.set(x, y + 2, z0 + 2, GLOW); }
  bp.work(40, y, z0 + 3, 'bartender'); bp.work(54, y, z0 + 3, 'bartender');
  for (let x = x0 + 4; x <= x1 - 4; x += 8) for (let z = z0 + 9; z <= z1 - 3; z += 6) { if (x >= STAIR.x - 1 && x <= STAIR.x + 8 && z >= STAIR.z - 1 && z <= STAIR.z + 12) continue; if (x >= 79 && z >= 69 && z <= 74) continue; bp.set(x, y, z, B.TABLE); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { bp.set(x + dx, y, z + dz, RWOOL); bp.spot(x + dx, y, z + dz, 'seat'); } }
  for (let x = x0 + 2; x <= x1 - 2; x += 10) { bp.set(x, y, z1, DARK); bp.set(x, y + 1, z1, B.OAK_LEAVES); lampPost(bp, x + 2, y, z1, 2, B.CITY_LAMP); }
  for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) lampPost(bp, x, y, z, 3, B.CITY_LAMP);
  bp.room('roof_terrace_bar', UPPER.x0, y, UPPER.z0, UPPER.x1, UPPER.z1);
}
// drop-off deck at the boulevard level: slab, canopy on chrome pillars, holo marquees, parked speeders, railings
function dropOffDeck(bp) {
  const { x0, z0, x1, z1, y } = DECK;
  patternFloor(bp, x0, z0, x1, z1, y, PLATE, RWOOL, 4);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x + z) % 6 === 0) bp.set(x, y, z, GLOW);
  bp.fill(x0, y + 1, z1, x1, y + 1, z1, BARS); bp.fill(x0, y + 1, z0, x0, y + 1, z1, BARS); bp.fill(x1, y + 1, z0, x1, y + 1, z1, BARS);
  bp.fill(DOOR_X - 3, y + 1, z1, DOOR_X + 4, y + 1, z1, AIR);                     // open onto the gangway
  // canopy: chrome frame with a glowing underside on pillars
  for (const x of [x0 + 3, x0 + 16, x1 - 16, x1 - 3]) for (const z of [z0 + 3, z1 - 3]) bp.fill(x, y + 1, z, x, y + 6, z, TRIM);
  bp.fill(x0 + 1, y + 7, z0 + 1, x1 - 1, y + 7, z1 - 1, DARK);
  for (let x = x0 + 2; x <= x1 - 2; x++) for (let z = z0 + 2; z <= z1 - 2; z++) if (x % 3 === 0 && z % 3 === 0) bp.set(x, y + 7, z, GLOW);
  bp.walls(x0 + 1, y + 7, z0 + 1, x1 - 1, y + 7, z1 - 1, TRIM); bp.walls(x0 + 1, y + 8, z0 + 1, x1 - 1, y + 8, z1 - 1, (GLOW));
  // marquees over the entrance and along the canopy edge
  for (let x = x0 + 2; x <= x1 - 2; x++) bp.set(x, y + 8, z1 - 1, (x % 2) ? HOLO : GOLD);
  // parked speeders: sleek chrome-and-red voxel cars
  for (const sx of [x0 + 6, x1 - 12]) {
    const sz = z0 + 6;
    bp.fill(sx, y + 1, sz, sx + 6, y + 1, sz + 2, DARK); bp.fill(sx + 1, y + 2, sz, sx + 5, y + 2, sz + 2, RWOOL);
    bp.fill(sx + 2, y + 3, sz, sx + 4, y + 3, sz + 2, GLASS); bp.fill(sx + 6, y + 2, sz + 1, sx + 7, y + 2, sz + 1, TRIM); bp.set(sx, y + 2, sz + 1, BLUE);
    bp.set(sx + 1, y + 1, sz - 1, TRIM); bp.set(sx + 5, y + 1, sz - 1, TRIM); bp.set(sx + 1, y + 1, sz + 3, TRIM); bp.set(sx + 5, y + 1, sz + 3, TRIM);
  }
  for (const [px, pz] of [[x0 + 2, z1 - 2], [x1 - 2, z1 - 2], [DOOR_X - 8, z1 - 1], [DOOR_X + 9, z1 - 1]]) bp.fill(px, 1, pz, px, y - 1, pz, HULL);   // pillars down to the plateau
  // valet post and a red carpet to the doors
  bp.set(DOOR_X - 6, y + 1, z1 - 2, BLACK); bp.set(DOOR_X - 6, y + 2, z1 - 2, B.CONSOLE); bp.work(DOOR_X - 5, y + 1, z1 - 2, 'valet');
  bp.fill(DOOR_X - 1, y, z0, DOOR_X + 2, y, z1, RWOOL);
  for (const [x, z] of [[x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) lampPost(bp, x, y + 1, z, 2, B.CITY_LAMP);
  bp.room('drop_off_deck', x0, y + 1, z0, x1, z1);
  bp.door(DOOR_X, y + 1, z1, 'S');
}
// the shell exterior: curved wall in durasteel with chrome ribs and glow strips, ribbed dome with glow rings
function shellExterior(bp) {
  for (let x = SHELL.x0; x <= SHELL.x1; x++) for (let z = SHELL.z0; z <= SHELL.z1; z++) {
    if (!inShell(x, z)) continue;
    const boundary = !inShell(x - 1, z) || !inShell(x + 1, z) || !inShell(x, z - 1) || (z === SHELL.z1 ? false : !inShell(x, z + 1));
    const ang = Math.atan2(z + 0.5 - ELL.cz, x + 0.5 - ELL.cx), rib = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
    const onRib = Math.abs(ang - rib) < 0.03;
    if (boundary) for (let y = 1; y <= SHELL.wallTop; y++) bp.set(x, y, z, (y % 5 === 0) ? GLOW : onRib ? TRIM : (y % 5 === 3 && (x + z) % 4 === 0) ? LIT : STEEL);
    const top = domeH(x, z);
    for (let y = SHELL.wallTop + 1; y <= top; y++) {
      const ring = (y === 51 || y === 55 || y === 59);
      bp.set(x, y, z, y === top ? (ring ? GLOW : onRib ? TRIM : (x + z) % 2 ? STEEL : PLASTER) : DARK);
    }
    if (top === SHELL.wallTop) bp.set(x, top + 1, z, onRib ? TRIM : GLOW);   // rim strip where the dome meets the wall
  }
  bp.fill(46, 60, 29, 47, 60, 30, GLOW); bp.set(46, 61, 29, TRIM); bp.set(47, 61, 30, RED);
}
function wingFacade(bp) {
  const paint = (x, y, z, a) => bp.set(x, y, z, (y % 5 === 0) ? GLOW : (a % 6 === 0) ? TRIM : (y % 5 === 2 || y % 5 === 3) ? ((a % 3) ? GLASS : LIT) : STEEL);
  for (let y = 1; y <= WING.top; y++) {
    for (let x = WING.x0; x <= WING.x1; x++) paint(x, y, WING.z1, x);
    for (let z = WING.z0; z <= WING.z1; z++) { paint(WING.x0, y, z, z); paint(WING.x1, y, z, z); }
  }
  for (let y = UPPER.top - 9; y <= UPPER.top; y++) {
    for (let x = UPPER.x0; x <= UPPER.x1; x++) paint(x, y, UPPER.z1, x);
    for (let z = UPPER.z0; z <= UPPER.z1; z++) { paint(UPPER.x0, y, z, z); paint(UPPER.x1, y, z, z); }
  }
  for (const [x, z] of [[WING.x0, WING.z1], [WING.x1, WING.z1]]) bp.fill(x, 1, z, x, WING.top + 1, z, TRIM);
  for (const [x, z] of [[UPPER.x0, UPPER.z1], [UPPER.x1, UPPER.z1]]) bp.fill(x, WING.top + 1, z, x, UPPER.top + 1, z, TRIM);
  // grand entrance: gold portal with holo marquee, six wide
  doorway(bp, DOOR_X - 2, UPPER.z1, DOOR_X + 3, UPPER.z1, walk(7), 4, GOLD, GLOW);
  bp.fill(DOOR_X - 4, walk(7), UPPER.z1, DOOR_X - 3, walk(7) + 4, UPPER.z1, GOLD); bp.fill(DOOR_X + 4, walk(7), UPPER.z1, DOOR_X + 5, walk(7) + 4, UPPER.z1, GOLD);
  bp.fill(DOOR_X - 4, walk(7) + 5, UPPER.z1, DOOR_X + 5, walk(7) + 7, UPPER.z1, HOLO); bp.fill(DOOR_X - 1, walk(7) + 6, UPPER.z1, DOOR_X + 2, walk(7) + 6, UPPER.z1, GOLD);
  bp.door(DOOR_X, walk(7), UPPER.z1, 'S');
  // undercity entrance
  doorway(bp, DOOR_X, WING.z1, DOOR_X + 1, WING.z1, walk(0), 3, GOLD, GLOW);
  bp.fill(DOOR_X - 3, 5, WING.z1, DOOR_X + 4, 6, WING.z1, HOLO);
  bp.door(DOOR_X, walk(0), WING.z1, 'S');
}

export const LANDMARK = {
  id: 'opera', name: 'Galaxies Opera House', span: [2, 2], height: 60, minW: 92, minD: 86,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Galaxies Opera House';
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) bp.set(x, 0, z, (!inShell(x, z) && !(x >= WING.x0 && x <= WING.x1 && z >= WING.z0 && z <= WING.z1)) ? ((x + z) % 5 === 0 ? GLOW : DARK) : PLATE);
    // masses: the shell (to its dome height) and the wing
    for (let x = SHELL.x0; x <= SHELL.x1; x++) for (let z = SHELL.z0; z <= SHELL.z1; z++) if (inShell(x, z)) bp.fill(x, 1, z, x, domeH(x, z), DARK);
    bp.fill(WING.x0, 1, WING.z0, WING.x1, WING.top, WING.z1, STEEL);
    bp.fill(UPPER.x0, WING.top + 1, UPPER.z0, UPPER.x1, UPPER.top, UPPER.z1, STEEL);
    // lower wing roof outside the deck (planters) and the deck slab, the terrace floor, before the floors
    patternFloor(bp, WING.x0 + 1, DECK.z0, WING.x1 - 1, WING.z1 - 1, WING.top + 1, PLATE, DARK, 5);
    patternFloor(bp, UPPER.x0 + 1, UPPER.z0 + 1, UPPER.x1 - 1, UPPER.z1 - 1, UPPER.top, PLATE, RWOOL, 5);
    // floors top down: roof terrace bar, grand foyer + auditorium, then the wing and backstage levels
    roofTerrace(bp);
    grandFoyer(bp, rng, 16, 57, 80, 73, walk(7));
    // lift lobby and stair door zone at the grand foyer level: keep the corridor cells clear at x 80..86
    carve(bp, 80, 57, 86, 73, walk(7), CARPET, 9);
    auditorium(bp, rng);
    const wings = [
      [6, ['bar', 'restaurant', 'lounge', 'lounge'], ['lounge', 'bar', 'storage', 'restroom'], { eastSouth: 'restroom' }],
      [5, ['lounge', 'cafeteria', 'kitchen', 'storage'], ['executive_office', 'meeting_room', 'open_plan_office', 'security_post'], { eastSouth: 'storage' }],
      [4, ['dressing_room', 'dressing_room', 'dressing_room', 'dressing_room'], ['laundry', 'workshop', 'storage', 'dressing_room'], { eastSouth: 'restroom' }],
      [3, ['gym', 'gym', 'dressing_room', 'dressing_room'], ['barracks', 'hotel_room', 'hotel_room', 'hotel_room'], { eastSouth: 'restroom' }],
      [2, ['open_plan_office', 'open_plan_office', 'meeting_room', 'archive'], ['library', 'open_plan_office', 'storage', 'lounge'], { eastSouth: 'restroom' }],
      [1, ['restaurant', 'kitchen', 'lounge', 'storage'], ['bar', 'restaurant', 'lounge', 'dressing_room'], { eastSouth: 'restroom' }],
    ];
    for (const [f, n, s, extras] of wings) wingFloor(bp, rng, f, n, s, extras);
    wingFloor(bp, rng, 0, ['shop', 'security_post', 'storage', 'shop'], null, {});
    lowerFoyer(bp, rng, 17, 72, 79, 81, walk(0));
    doorway(bp, 46, 71, 48, 71, walk(0), 3, GOLD, GLOW);
    // backstage levels inside the shell (walk 1, 6, 11, 16); the stage house is the scenery workshop at the bottom
    backstageFloor(bp, rng, 3, { N: ['dressing_room', 'dressing_room', 'storage', 'storage', 'dressing_room', 'dressing_room'], S: ['gym', 'lounge', 'restroom', 'restroom', 'cafeteria', 'kitchen'], FS: ['barracks', 'barracks'], stage: ['dressing_room', 'dressing_room', 'laundry', 'storage'] });
    backstageFloor(bp, rng, 2, { N: ['dressing_room', 'dressing_room', 'restroom', 'restroom', 'dressing_room', 'dressing_room'], S: ['gym', 'gym', 'storage', 'storage', 'lounge', 'medbay'], FS: ['library', 'open_plan_office'], stage: ['dressing_room', 'dressing_room', 'workshop', 'storage'] });
    backstageFloor(bp, rng, 1, { N: ['workshop', 'storage', 'droid_bay', 'droid_bay', 'storage', 'workshop'], S: ['laundry', 'dressing_room', 'restroom', 'restroom', 'dressing_room', 'laundry'], FS: ['cafeteria', 'kitchen'] });
    backstageFloor(bp, rng, 0, { N: ['workshop', 'garage', 'storage', 'storage', 'garage', 'workshop'], S: ['security_post', 'storage', 'restroom', 'restroom', 'storage', 'medbay'], FS: ['gym', 'gym'] });
    sceneryWorkshop(bp, rng, walk(0));
    bp.fill(46, walk(1), 21, 48, walk(1), 21, BARS);                                 // level-6 corridor ends on a rail over the workshop
    bp.fill(46, walk(1) - 1, 21, 48, walk(1) - 1, 21, PLATE);
    // circulation
    lifts(bp, 1, walk(9));
    stairCore(bp, STAIR.x, STAIR.z, 0, 9, walk(9) + 3);
    // exterior
    shellExterior(bp);
    wingFacade(bp);
    dropOffDeck(bp);
    // the stair core door and lift faces at the grand foyer / terrace levels open into the carved zones (redo doors)
    for (const f of [7, 9]) doorway(bp, STAIR.x + 7, STAIR.z + 5, STAIR.x + 7, STAIR.z + 6, walk(f), 3, TRIM, GOLD);
    bp.meta.floors = []; for (let f = 0; f <= 9; f++) bp.meta.floors.push(bp.y0 + walk(f));
  },
};
