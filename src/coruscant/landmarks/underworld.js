// Uscru District undercity strip (docs/rubrics/06_landmarks.md): a neon canyon of low buildings under a roof deck
// that continues the boulevard level. Main street north-south, a cross street, alleys and courtyards; sixteen
// buildings of two to four storeys with shops below and apartments above, catwalks between them, the Outlander Club,
// Dex's Diner, a pawn shop, a speeder garage, the bounty hunters' cantina, a gambling den, the junk market, a guard
// post, a flophouse; steam vents, puddles, holo signs everywhere; light wells and a stair tower down from the deck.
// Pure function of the lot and ctx.rng. Local coordinates: x 0..145, z 0..137, y 0 = plateau, walk level 1; the
// deck is at y 35 (walk 36 = boulevard level); front = south (+z).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const DECK_Y = 35;                          // roof deck slab (walk 36)
const MAIN = { x0: 66, x1: 77 };            // main street (north-south), 12 wide
const CROSS = { z0: 60, z1: 69 };           // cross street (east-west), 10 wide
const STREET = B.DURASTEEL_DARK, KERB = B.PANEL_STRIPE, PLATE = B.DECK_PLATE, DARK = B.DURASTEEL_DARK;
const GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, HOLO = B.HOLO_SIGN, RED = B.PANEL_RED, TRIM = B.CHROME, GLASS = B.STEEL_GLASS;
const PALETTES = [
  { wall: B.DURASTEEL_DARK, band: B.PANEL_RED, frame: B.CHROME },
  { wall: B.HULL_PLATE, band: B.PANEL_STRIPE, frame: B.DURASTEEL },
  { wall: B.STONE_BRICKS, band: B.DURASTEEL_DARK, frame: B.CHROME },
  { wall: B.PANEL_BLACK, band: B.GLOW_PANEL_BLUE, frame: B.CHROME },
  { wall: B.SMOOTH_STONE, band: B.PANEL_BLACK, frame: B.DURASTEEL_DARK },
  { wall: B.DURASTEEL, band: B.PANEL_RED, frame: B.PANEL_BLACK },
];

function stairZ(bp, x0, x1, z0, dz, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK); bp.set(x, yTop, z, slab ? B.STONE_BRICK_SLAB : B.DURASTEEL); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
function lamp(bp, x, y, z, h = 2, id = B.LANTERN) { bp.fill(x, y, z, x, y + h - 1, z, B.IRON_BARS); bp.set(x, y + h, z, id); }
function doorway(bp, x0, z0, x1, z1, y0, h = 3, frame = TRIM, lintel = GLOW) {
  bp.fill(x0, y0, z0, x1, y0 + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0, y0 - 1, z0 - 1, x1, y0 - 1, z0 + 1, PLATE); bp.fill(x0, y0, z0 - 1, x1, y0 + 2, z0 + 1, AIR); bp.fill(x0 - 1, y0, z0, x0 - 1, y0 + h, z0, frame); bp.fill(x1 + 1, y0, z0, x1 + 1, y0 + h, z0, frame); bp.fill(x0, y0 + h, z0, x1, y0 + h, z0, lintel); }
  else { bp.fill(x0 - 1, y0 - 1, z0, x0 + 1, y0 - 1, z1, PLATE); bp.fill(x0 - 1, y0, z0, x0 + 1, y0 + 2, z1, AIR); bp.fill(x0, y0, z0 - 1, x0, y0 + h, z0 - 1, frame); bp.fill(x0, y0, z1 + 1, x0, y0 + h, z1 + 1, frame); bp.fill(x0, y0 + h, z0, x0, y0 + h, z1, lintel); }
}
const DRESS = [B.SHELF, B.CRATE, B.BARREL, B.CHEST, B.BOOKSHELF];
function dress(r, rng) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(DRESS); r.put(u, 0, r.back, id); if (id === B.SHELF || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 2) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 3 === 0) r.planter(u, v, B.DEAD_BUSH); else { r.put(u, 0, v, B.IRON_BARS); r.put(u, 1, v, B.LANTERN); } }
  // furniture islands on a 5-cell lattice inside big rooms: table groups, crate stacks, bunks, partitions
  if (r.w >= 10 && r.d >= 8) {
    let k = 0;
    for (let u = 3; u < r.w - 3; u += 5) for (let v = 4; v < r.back - 2; v += 5) {
      if (!r.free(u, v) || !r.empty(u, 0, v) || !r.free(u + 1, v)) continue;
      const kind = (k++ + u) % 4;
      if (kind === 0) { r.table(u, v); r.table(u + 1, v); r.seat(u - 1, v); r.seat(u + 2, v); r.seat(u, v + 1); r.seat(u + 1, v - 1); }
      else if (kind === 1) { r.put(u, 0, v, B.CRATE); r.put(u, 1, v, B.CRATE); r.put(u + 1, 0, v, B.BARREL); r.put(u, 0, v + 1, B.BARREL); }
      else if (kind === 2) { if (r.bed(u, v + 1)) { r.put(u + 1, 0, v + 1, B.CHEST); r.put(u - 1, 0, v, B.SHELF); } }
      else { r.fill(u, 0, v, u, 2, v + 2, B.PANEL_BLACK); r.put(u, 1, v + 1, B.HOLO_SIGN); r.seat(u + 1, v + 1); r.seat(u - 1, v + 1); }
    }
  }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, h = 4) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side, doorU, doorW }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  dress(r, rng); r.ceilingLights(4, (rng.next() < 0.4) ? BLUE : GLOW); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}
// neon sign stack above a door: vertical holo strip with a chrome frame and coloured caps
function neonStack(bp, x, y, z, h, cap) { bp.fill(x, y, z, x, y + h - 1, z, HOLO); bp.set(x, y + h, z, cap); bp.set(x, y - 1, z, TRIM); }

// A building: footprint (x0..x1, z0..z1 inclusive, outer walls), `floors` storeys of 5, the street door on `side`
// (with a neon stack and awning), one room per floor from `rooms` (or a custom builder), a stair core in the
// corner farthest from the door, facade bands, windows, vents, a rooftop with tanks/antenna under the deck.
function building(bp, rng, spec) {
  const { x0, z0, x1, z1, floors, side, rooms, pal, custom, sign } = spec;
  const h = floors * 5;
  bp.fill(x0, 1, z0, x1, h, z1, pal.wall);
  bp.fill(x0, h + 1, z0, x1, h + 1, z1, DARK);                 // roof
  // facade dressing per floor: band at the slab, windows between, frame corners
  for (let f = 0; f < floors; f++) {
    const yb = 1 + f * 5;
    bp.walls(x0, yb + 4, z0, x1, yb + 4, z1, pal.band);
    for (let x = x0 + 1; x < x1; x++) for (const z of [z0, z1]) if ((x - x0) % 3 === 1) { bp.set(x, yb + 1, z, f === 0 && z === (side === 'S' ? z1 : z0) ? GLASS : B.WINDOW_LIT); bp.set(x, yb + 2, z, (x + f) % 2 ? B.WINDOW_LIT : B.WINDOW_DARK); }
    for (let z = z0 + 1; z < z1; z++) for (const x of [x0, x1]) if ((z - z0) % 3 === 1) { bp.set(x, yb + 1, z, (z + f) % 2 ? B.WINDOW_LIT : B.WINDOW_DARK); bp.set(x, yb + 2, z, B.WINDOW_LIT); }
  }
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) bp.fill(x, 1, z, x, h + 1, z, pal.frame);
  // vents and pipes on the side walls
  for (let z = z0 + 2; z < z1 - 1; z += 5) { bp.set(x0, 3, z, B.VENT); bp.set(x1, 3, z, B.VENT); }
  // rooftop: tanks, vents, antenna
  bp.fill(x0 + 2, h + 2, z0 + 2, x0 + 3, h + 3, z0 + 3, B.DURASTEEL); bp.set(x0 + 2, h + 4, z0 + 2, B.VENT);
  bp.set(x1 - 2, h + 2, z1 - 2, B.VENT); bp.fill(x1 - 3, h + 2, z0 + 2, x1 - 3, h + 5, z0 + 2, B.IRON_BARS); bp.set(x1 - 3, h + 6, z0 + 2, RED);
  // interior: stair core in the corner opposite the door, rooms per floor
  const alongX = side === 'N' || side === 'S';
  const w = x1 - x0 - 1, d = z1 - z0 - 1;
  const doorU = Math.floor((alongX ? w : d) / 2) - 1;
  // door cells on the street wall
  const dcells = side === 'S' ? [x0 + 1 + doorU, z1, x0 + 2 + doorU, z1] : side === 'N' ? [x0 + 1 + doorU, z0, x0 + 2 + doorU, z0] : side === 'E' ? [x1, z0 + 1 + doorU, x1, z0 + 2 + doorU] : [x0, z0 + 1 + doorU, x0, z0 + 2 + doorU];
  // stair core: far corner from the door; 4 x 10 switchback well (5-block rise = 10 half steps; flights alternate
  // columns and directions)
  const sx = side === 'E' ? x0 + 1 : x1 - 4, sz = side === 'S' ? z0 + 1 : z1 - 10;
  for (let f = floors - 1; f >= 0; f--) {
    const y = 1 + f * 5;
    const ix0 = x0 + 1, iz0 = z0 + 1, ix1 = x1 - 1, iz1 = z1 - 1;
    bp.fill(ix0, y - 1, iz0, ix1, y - 1, iz1, f === 0 ? ((x0 + z0) % 2 ? B.PANEL_BLACK : PLATE) : PLATE);
    bp.fill(ix0, y, iz0, ix1, y + 3, iz1, AIR);
    bp.fill(ix0, y + 4, iz0, ix1, y + 4, iz1, DARK);
    // room = the floor minus the stair well (rooms come from the list; the ground floor may be custom)
    const rx0 = sx === ix0 ? ix0 + 5 : ix0, rx1 = sx === ix0 ? ix1 : ix1 - 5;
    if (f === 0 && custom) custom(bp, rng, rx0, iz0, rx1, iz1, y, side, doorU - (rx0 - ix0));
    else { const name = rooms[f % rooms.length]; template(bp, rng, name, name, rx0, iz0, rx1, iz1, y, side, doorU - (rx0 - ix0), 2); }
    // the room's back row faces the stair core: keep a lit 4-wide passage clear through the furniture there
    if (alongX) { const pz = side === 'S' ? iz0 : iz1, pz2 = side === 'S' ? iz0 + 1 : iz1 - 1; bp.fill(Math.max(rx0, sx - 1), y, Math.min(pz, pz2), Math.min(rx1, sx + 4), y + 2, Math.max(pz, pz2), AIR); bp.set(sx + 1, y + 3, pz, GLOW); }
    else { const px = side === 'W' ? rx1 : rx0, px2 = side === 'W' ? rx1 - 1 : rx0 + 1; bp.fill(Math.min(px, px2), y, sz + 2, Math.max(px, px2), y + 2, sz + 7, AIR); bp.set(px, y + 3, sz + 4, GLOW); }
    bp.fill(sx === ix0 ? ix0 + 4 : ix1 - 4, y, iz0, sx === ix0 ? ix0 + 4 : ix1 - 4, y + 2, iz1, AIR);   // the gap column beside the core stays clear
    // stair well: 2 wide x 6 long slab flight rising to the next floor, open above
    if (f < floors - 1) {
      const col = f % 2 ? sx + 2 : sx, dir = f % 2 ? -1 : 1;
      stairZ(bp, col, col + 1, dir > 0 ? sz : sz + 9, dir, y, 5);
      bp.fill(col, y + 5, sz, col + 1, y + 8, sz + 9, AIR);
      bp.set(sx === ix0 ? sx + 4 : sx - 1, y + 3, sz + 4, BLUE);
    }
    // wall lights
    bp.set(ix0, y + 3, iz0 + 1, B.LANTERN); bp.set(ix1, y + 3, iz1 - 1, B.LANTERN);
  }
  doorway(bp, dcells[0], dcells[1], dcells[2], dcells[3], 1, 3, pal.frame, GLOW);
  bp.door(dcells[0], 1, dcells[1], side);
  // neon over the door + awning + sign
  const nx = alongX ? dcells[0] - 1 : dcells[0], nz = alongX ? dcells[1] : dcells[1] - 1;
  const ox = side === 'E' ? 1 : side === 'W' ? -1 : 0, oz = side === 'S' ? 1 : side === 'N' ? -1 : 0;
  neonStack(bp, nx + ox, 5, nz + oz, Math.min(h - 3, 4 + (spec.neon || 3)), sign || RED);
  for (let k = -2; k <= 3; k++) { const ax = alongX ? dcells[0] + k : dcells[0] + ox, az = alongX ? dcells[1] + oz : dcells[1] + k; bp.set(ax, 4, az, (k & 1) ? pal.band : GLOW); }
  if (spec.balcony && floors > 1) {
    // catwalk balcony on the street face at the second floor
    for (let k = -3; k <= 4; k++) { const ax = alongX ? dcells[0] + k : dcells[0] + ox, az = alongX ? dcells[1] + oz : dcells[1] + k; bp.set(ax, 5, az, PLATE); bp.set(alongX ? ax : ax + ox, 6, alongX ? az + oz : az, B.IRON_BARS); }
  }
  return { x0, z0, x1, z1, h };
}

// Dex's Diner: chrome and red, counter with stools, booths, kitchen with furnaces, waitress droid spot
function diner(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'diner', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 2 ? B.WHITE_WOOL : B.RED_WOOL);
  const cv = r.back - 3;
  for (let u = 1; u < r.w - 1; u++) { r.put(u, 0, cv, TRIM); r.put(u, 1, cv, B.STONE_BRICK_SLAB); if (u % 2) { r.put(u, 0, cv - 1, B.STONE_BRICK_SLAB); r.spot(u, cv - 1, 'seat'); } }
  for (let u = 1; u < r.w - 1; u += 2) { r.put(u, 0, r.back, B.FURNACE); r.put(u + 1, 0, r.back, B.SHELF); r.put(u + 1, 1, r.back, B.SHELF); }
  r.work(r.cu, cv + 1, 'cook'); r.work(r.cu + 1, cv - 2, 'waitress droid');
  for (let u = 0; u + 2 < r.w; u += 4) { r.put(u, 0, 2, B.RED_WOOL); r.put(u + 2, 0, 2, B.RED_WOOL); r.put(u + 1, 0, 2, B.TABLE); r.spot(u, 2, 'seat'); r.spot(u + 2, 2, 'seat'); }
  for (let u = 0; u < r.w; u += 3) r.putRaw(u, 3, 0, HOLO);
  r.ceilingLights(3); r.finalize();
  bp.room('diner', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// gambling den: dim red, tables with gold and iron "chips", a cage, seats
function den(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'gambling_den', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u * 3 + v) % 5 ? B.PANEL_BLACK : B.RED_WOOL);
  for (let u = 1; u + 1 < r.w; u += 4) for (let v = 3; v + 1 <= r.back - 2; v += 4) { r.put(u, 0, v, B.TABLE); r.put(u + 1, 0, v, B.TABLE); r.put(u, 1, v, (u + v) % 2 ? B.GOLD_BLOCK : B.IRON_BLOCK); for (const [du, dv] of [[-1, 0], [2, 0], [0, 1], [1, 1], [0, -1], [1, -1]]) r.seat(u + du, v + dv); }
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.IRON_BARS); r.put(u, 1, r.back, B.IRON_BARS); }
  r.put(r.cu, 0, r.back, B.PANEL_BLACK); r.put(r.cu, 1, r.back, B.CONSOLE); r.work(r.cu, r.back - 1, 'croupier');
  for (let u = 1; u < r.w; u += 3) r.putRaw(u, 3, r.back, RED);
  r.ceilingLights(4, RED === RED ? B.LANTERN : GLOW); r.finalize();
  bp.room('gambling_den', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// pawn shop: counter, barred window shelves, chests, a safe
function pawn(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'pawn_shop', {});
  r.counter(1, r.w - 2, r.back - 2, B.PANEL_BLACK, B.STONE_BRICK_SLAB); r.work(r.cu, r.back - 1, 'broker');
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 3 === 2 ? B.CHEST : B.SHELF); r.put(u, 1, r.back, u % 3 === 1 ? B.IRON_BARS : B.SHELF); r.put(u, 2, r.back, B.SHELF); }
  r.fill(0, 0, 2, 0, 1, 3, B.IRON_BLOCK); r.put(r.w - 1, 0, 2, B.ANVIL); r.put(r.w - 1, 0, 3, B.BARREL);
  for (let v = 2; v <= r.back - 3; v += 2) { r.put(r.w - 1, 0, v + 1, B.CRATE); r.put(0, 0, v + 2, B.CHEST); }
  r.putRaw(r.cu, 3, 0, HOLO); r.ceilingLights(4); r.finalize();
  bp.room('pawn_shop', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// speeder garage with two voxel speeders, lifts, tool benches
function garage(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, 'speeder_garage', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u % 6 === 0 || v % 6 === 0) ? B.PANEL_STRIPE : PLATE);
  for (let b = 0; b < 2; b++) {
    const u = 1 + b * Math.max(5, Math.floor((r.w - 2) / 2)), v = r.back - 3;
    if (u + 3 >= r.w) break;
    r.put(u, 0, v, TRIM); r.put(u + 1, 0, v, RED); r.put(u + 2, 0, v, RED); r.put(u + 3, 0, v, TRIM);
    r.put(u + 1, 1, v, GLASS); r.put(u + 2, 1, v, B.PANEL_BLACK); r.put(u + 1, 0, v - 1, BLUE); r.put(u + 2, 0, v + 1, DARK);
  }
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.ANVIL); r.put(u + 1, 0, r.back, B.TABLE); r.put(u + 1, 1, r.back, B.IRON_BARS); }
  r.put(0, 0, 2, B.BARREL); r.put(0, 1, 2, B.BARREL); r.put(0, 0, 3, B.CRATE); r.work(2, r.back - 1, 'mechanic');
  r.ceilingLights(3); r.finalize();
  bp.room('speeder_garage', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// bounty hunters' cantina: dark, weapon racks, wanted holo boards, booths
function bounty(bp, rng, x0, z0, x1, z1, y, side, doorU) {
  const r = template(bp, rng, 'cantina', 'bounty_cantina', x0, z0, x1, z1, y, side, doorU, 2);
  for (let u = 0; u < r.w; u += 2) { r.putRaw(u, 2, r.back, HOLO); r.put(u, 1, r.back, B.IRON_BARS); }
  r.putRaw(0, 3, 1, RED); r.putRaw(r.w - 1, 3, 1, RED);
}

// streets, kerbs, puddles, grime, lamp posts, holo totems, steam vents on the ground floor walls
function streets(bp, rng) {
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) {
    const main = x >= MAIN.x0 && x <= MAIN.x1, cross = z >= CROSS.z0 && z <= CROSS.z1;
    let id = (x + z) % 7 === 0 ? B.COARSE_DIRT : (x * 3 + z) % 11 === 0 ? B.GRAVEL : STREET;
    if (main && (x === MAIN.x0 || x === MAIN.x1)) id = KERB;
    if (cross && (z === CROSS.z0 || z === CROSS.z1)) id = KERB;
    if ((main && (x === 71 || x === 72) && z % 4 < 2) || (cross && (z === 64 || z === 65) && x % 4 < 2)) id = GLOW;
    bp.set(x, 0, z, id);
  }
  // puddles
  for (let k = 0; k < 40; k++) { const x = rng.int(2, bp.w - 3), z = rng.int(2, bp.d - 3); if (bp.get(x, 0, z) !== GLOW && bp.get(x, 0, z) !== KERB) bp.set(x, 0, z, B.WATER); }
  // lamp posts along the main and cross streets, holo totems at the corners
  for (let z = 4; z < bp.d - 4; z += 8) { lamp(bp, MAIN.x0 + 1, 1, z, 3, B.CITY_LAMP); lamp(bp, MAIN.x1 - 1, 1, z + 4 < bp.d - 4 ? z + 4 : z, 3, B.CITY_LAMP); }
  for (let x = 4; x < bp.w - 4; x += 8) { if (x >= MAIN.x0 - 2 && x <= MAIN.x1 + 2) continue; lamp(bp, x, 1, CROSS.z0 + 1, 3, B.CITY_LAMP); lamp(bp, x + 4, 1, CROSS.z1 - 1, 3, B.CITY_LAMP); }
  for (const [x, z] of [[MAIN.x0 - 2, CROSS.z0 - 2], [MAIN.x1 + 2, CROSS.z0 - 2], [MAIN.x0 - 2, CROSS.z1 + 2], [MAIN.x1 + 2, CROSS.z1 + 2]]) { bp.set(x, 1, z, B.PANEL_BLACK); bp.fill(x, 2, z, x, 5, z, HOLO); bp.set(x, 6, z, BLUE); }
}

// roof deck: slab at y 35 over the whole lot with light wells, kerbs, benches, planters, lamps; pillars to the
// ground at the block corners; a stair tower and a lift down to the strip near the south gangway
function deck(bp, rng, lot) {
  const wells = [[20, 20, 36, 36], [110, 20, 126, 36], [20, 100, 36, 116], [110, 100, 126, 116], [64, 8, 79, 20], [64, 118, 79, 130]];
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) {
    const inWell = wells.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d);
    if (inWell) continue;
    const rim = wells.some(([a, b, c, d]) => x >= a - 1 && x <= c + 1 && z >= b - 1 && z <= d + 1);
    bp.set(x, DECK_Y, z, rim ? GLOW : ((x % 8 === 0 || z % 8 === 0) ? B.DURASTEEL : DARK));
    if (rim) bp.set(x, DECK_Y + 1, z, B.IRON_BARS);
    bp.set(x, DECK_Y - 1, z, (x % 12 === 6 && z % 12 === 6) ? BLUE : DARK);   // underside with blue light dots
  }
  // benches, planters and lamps on the deck
  for (let x = 8; x < bp.w - 8; x += 16) for (let z = 8; z < bp.d - 8; z += 16) {
    if (wells.some(([a, b, c, d]) => x >= a - 2 && x <= c + 2 && z >= b - 2 && z <= d + 2)) continue;
    bp.set(x, DECK_Y + 1, z, DARK); bp.set(x, DECK_Y + 2, z, B.OAK_LEAVES);
    bp.set(x + 2, DECK_Y + 1, z, B.STONE_BRICK_SLAB); bp.spot(x + 2, DECK_Y + 1, z, 'seat');
    lamp(bp, x - 2, DECK_Y + 1, z, 2, B.CITY_LAMP);
  }
  // pillars (2x2) at the four block corners near the streets, and under the deck edge every 24
  for (const [x, z] of [[MAIN.x0 - 3, CROSS.z0 - 3], [MAIN.x1 + 2, CROSS.z0 - 3], [MAIN.x0 - 3, CROSS.z1 + 2], [MAIN.x1 + 2, CROSS.z1 + 2]]) { bp.fill(x, 1, z, x + 1, DECK_Y - 1, z + 1, B.HULL_PLATE); for (let y = 6; y < DECK_Y; y += 6) bp.set(x, y, z - 1, BLUE); }
  // the sky-bridge gangway arrives at the lot's south edge at the door column: deck edge railing there is opened
  const dx = lot.door.x - lot.x0;
  bp.fill(dx - 1, DECK_Y + 1, bp.d - 1, dx + 2, DECK_Y + 1, bp.d - 1, AIR);
  bp.door(dx, DECK_Y + 1, bp.d - 1, 'S');
  // stair tower down to the strip (switchback, 8 x 12) at the south end beside the main street, plus a lift
  const tx0 = MAIN.x1 + 3, tz0 = bp.d - 18;
  bp.fill(tx0, 1, tz0, tx0 + 7, DECK_Y, tz0 + 11, B.HULL_PLATE);
  bp.fill(tx0 + 1, 1, tz0 + 1, tx0 + 6, DECK_Y - 1, tz0 + 10, AIR);
  for (let y = 4; y <= 32; y += 4) for (let z = tz0 + 2; z <= tz0 + 9; z += 3) { bp.set(tx0, y, z, B.WINDOW_LIT); bp.set(tx0 + 7, y, z, (y % 8) ? B.WINDOW_LIT : HOLO); }
  let level = 1;
  for (let f = 0; f < 7; f++) {
    const east = f % 2 === 0, xs = east ? [tx0 + 1, tx0 + 2] : [tx0 + 5, tx0 + 6];
    stairZ(bp, xs[0], xs[1], east ? tz0 + 1 : tz0 + 10, east ? 1 : -1, level, 5);
    level += 5;
    bp.fill(tx0 + 1, level - 1, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level - 1, east ? tz0 + 10 : tz0 + 2, PLATE);
    bp.set(tx0 + 3, level + 2, east ? tz0 + 10 : tz0 + 1, GLOW);
  }
  bp.fill(tx0 + 1, DECK_Y, tz0 + 1, tx0 + 6, DECK_Y, tz0 + 10, AIR);           // open to the deck
  bp.fill(tx0 + 1, DECK_Y + 1, tz0 + 1, tx0 + 6, DECK_Y + 1, tz0 + 10, AIR);
  bp.walls(tx0, DECK_Y + 1, tz0, tx0 + 7, DECK_Y + 1, tz0 + 11, B.IRON_BARS);
  bp.fill(tx0 + 3, DECK_Y + 1, tz0 + 11, tx0 + 4, DECK_Y + 1, tz0 + 11, AIR);
  doorway(bp, tx0, tz0 + 5, tx0, tz0 + 6, 1, 3, TRIM, GLOW);
  bp.set(tx0 + 3, 4, tz0 + 5, GLOW); bp.set(tx0 + 4, 4, tz0 + 6, GLOW);
  bp.room('stair_tower', tx0, 1, tz0, tx0 + 7, tz0 + 11);
  // lift on the other side of the main street
  const lx = MAIN.x0 - 5, lz = bp.d - 12;
  bp.fill(lx - 1, 0, lz - 1, lx + 2, DECK_Y + 3, lz + 2, B.PANEL_BLACK); bp.fill(lx, 1, lz, lx + 1, DECK_Y + 2, lz + 1, AIR);
  bp.lift(lx, lz, 1, DECK_Y + 1);
  bp.fill(lx + 2, 1, lz, lx + 2, 3, lz + 1, AIR); bp.set(lx + 2, 3, lz - 1, BLUE);
  bp.fill(lx + 2, DECK_Y + 1, lz, lx + 2, DECK_Y + 3, lz + 1, AIR); bp.set(lx + 2, DECK_Y + 3, lz - 1, BLUE);
  bp.fill(lx + 3, DECK_Y, lz, lx + 3, DECK_Y, lz + 1, PLATE);
}

// catwalks between facing buildings across the alleys at the second floor (y 6), railings, lamps
function catwalk(bp, xa, xb, z, y) {
  bp.fill(xa, y - 1, z, xb, y - 1, z + 1, PLATE);
  bp.fill(xa, y, z - 1, xb, y, z - 1, B.IRON_BARS); bp.fill(xa, y, z + 2, xb, y, z + 2, B.IRON_BARS);
  bp.fill(xa, y, z, xb, y + 2, z + 1, AIR);
  bp.set(Math.floor((xa + xb) / 2), y + 3, z, B.LANTERN);
}
function catwalkZ(bp, za, zb, x, y) {
  bp.fill(x, y - 1, za, x + 1, y - 1, zb, PLATE);
  bp.fill(x - 1, y, za, x - 1, y, zb, B.IRON_BARS); bp.fill(x + 2, y, za, x + 2, y, zb, B.IRON_BARS);
  bp.fill(x, y, za, x + 1, y + 2, zb, AIR);
  bp.set(x, y + 3, Math.floor((za + zb) / 2), B.LANTERN);
}

// junk market: stall rows under wool awnings in a courtyard
function junkMarket(bp, rng, x0, z0, x1, z1) {
  const wool = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];
  for (let x = x0; x + 3 <= x1; x += 5) for (let z = z0; z + 2 <= z1; z += 6) {
    const c = rng.pick(wool);
    bp.set(x, 1, z, B.CRATE); bp.set(x + 1, 1, z, rng.pick([B.BARREL, B.IRON_BLOCK, B.CHROME, B.CONSOLE, B.ANVIL, B.SHELF])); bp.set(x + 2, 1, z, B.CRATE);
    bp.set(x, 2, z, rng.pick([B.VENT, B.IRON_BARS, B.CHEST, B.GOLD_BLOCK, 0]));
    bp.fill(x - 1, 1, z + 1, x - 1, 3, z + 1, B.IRON_BARS); bp.fill(x + 3, 1, z + 1, x + 3, 3, z + 1, B.IRON_BARS);
    bp.fill(x - 1, 4, z - 1, x + 3, 4, z + 1, c);
    bp.set(x + 1, 3, z + 1, HOLO); bp.work(x + 1, 1, z + 1, 'vendor'); bp.spot(x + 1, 1, z - 1, 'stand');
  }
  bp.room('junk_market', x0 - 1, 1, z0 - 1, x1 + 1, z1 + 1);
  for (let x = x0; x <= x1; x += 6) lamp(bp, x, 1, z1 + 1, 3, B.LANTERN);
}

export const LANDMARK = {
  id: 'underworld', name: 'Uscru undercity strip', span: [3, 3], height: 35, minW: 140, minD: 130,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Uscru undercity strip';
    streets(bp, rng);
    const P = (i) => PALETTES[i % PALETTES.length];
    // building specs: footprints in the four blocks, doors facing the streets
    const specs = [
      // south-west block (x 4..61, z 74..131): Outlander Club on the main street, pawn shop, flophouse, apartments
      { x0: 40, z0: 74, x1: 61, z1: 95, floors: 3, side: 'E', rooms: ['night_club', 'lounge', 'studio'], custom: null, pal: P(3), neon: 5, sign: BLUE, balcony: true },
      { x0: 40, z0: 100, x1: 61, z1: 118, floors: 3, side: 'E', rooms: ['shop', 'hotel_room', 'hotel_room'], custom: pawn, pal: P(1), sign: RED },
      { x0: 8, z0: 74, x1: 35, z1: 91, floors: 2, side: 'N', rooms: ['workshop', 'family_apartment'], pal: P(4) },
      { x0: 8, z0: 96, x1: 35, z1: 118, floors: 4, side: 'E', rooms: ['restaurant', 'studio', 'studio', 'family_apartment'], pal: P(0), neon: 6, sign: GLOW, balcony: true },
      // south-east block (x 82..141, z 74..131): Dex's Diner, gambling den, bounty cantina, apartments
      { x0: 82, z0: 74, x1: 103, z1: 90, floors: 2, side: 'W', rooms: ['restaurant', 'studio'], custom: diner, pal: P(5), neon: 4, sign: RED, balcony: true },
      { x0: 82, z0: 95, x1: 103, z1: 118, floors: 3, side: 'W', rooms: ['cantina', 'hotel_room', 'barracks'], custom: bounty, pal: P(0), neon: 5, sign: RED },
      { x0: 108, z0: 74, x1: 137, z1: 91, floors: 3, side: 'N', rooms: ['arcade', 'studio', 'family_apartment'], custom: den, pal: P(3), neon: 4, sign: RED, balcony: true },
      { x0: 118, z0: 96, x1: 137, z1: 118, floors: 2, side: 'W', rooms: ['security_post', 'barracks'], pal: P(2) },
      // north-west block (x 4..61, z 6..55): speeder garage, market hall, apartments
      { x0: 40, z0: 40, x1: 61, z1: 55, floors: 2, side: 'S', rooms: ['garage', 'storage'], custom: garage, pal: P(1), sign: BLUE },
      { x0: 40, z0: 8, x1: 61, z1: 35, floors: 4, side: 'E', rooms: ['shop', 'studio', 'studio', 'penthouse'], pal: P(4), neon: 6, sign: BLUE, balcony: true },
      { x0: 8, z0: 40, x1: 35, z1: 55, floors: 3, side: 'S', rooms: ['cafeteria', 'kitchen', 'laundry'], pal: P(2), sign: GLOW },
      // north-east block (x 82..141, z 6..55): holo arcade, droid shop, apartments, guard post
      { x0: 82, z0: 40, x1: 103, z1: 55, floors: 3, side: 'S', rooms: ['arcade', 'lounge', 'studio'], pal: P(5), neon: 5, sign: BLUE, balcony: true },
      { x0: 82, z0: 8, x1: 103, z1: 35, floors: 3, side: 'W', rooms: ['droid_bay', 'workshop', 'studio'], pal: P(0), sign: GLOW },
      { x0: 108, z0: 40, x1: 137, z1: 55, floors: 2, side: 'S', rooms: ['medbay', 'clinic_ward'], pal: P(4), sign: BLUE },
      { x0: 108, z0: 8, x1: 137, z1: 35, floors: 4, side: 'W', rooms: ['shop', 'family_apartment', 'family_apartment', 'gym'], pal: P(2), neon: 5, sign: RED, balcony: true },
    ];
    const built = specs.map((sp) => building(bp, rng, sp));
    // junk market in the NW courtyard alley between the garage and the cafeteria (x 8..35, z 20..35) and the SW alley
    junkMarket(bp, rng, 12, 12, 34, 34);
    junkMarket(bp, rng, 109, 97, 115, 117);
    // catwalks across the alleys at the second floor
    catwalk(bp, 36, 39, 84, 6); catwalk(bp, 36, 39, 108, 6);
    catwalk(bp, 104, 107, 82, 6); catwalk(bp, 104, 107, 104, 6);
    catwalkZ(bp, 92, 99, 50, 6); catwalkZ(bp, 92, 99, 92, 6); catwalkZ(bp, 36, 39, 50, 6); catwalkZ(bp, 36, 39, 92, 6);
    // openings from the second floors onto the catwalks (windows replaced by doors)
    for (const [x, z, side] of [[35, 84, 'E'], [40, 84, 'W'], [35, 108, 'E'], [40, 108, 'W'], [103, 82, 'E'], [108, 82, 'W'], [103, 104, 'E'], [108, 104, 'W']]) doorway(bp, x, z, x, z + 1, 6, 3, TRIM, BLUE);
    for (const [x, z, side] of [[50, 91, 'S'], [50, 100, 'N'], [92, 91, 'S'], [92, 96, 'N'], [50, 35, 'S'], [50, 40, 'N'], [92, 35, 'S'], [92, 40, 'N']]) doorway(bp, x, z, x + 1, z, 6, 3, TRIM, BLUE);
    // steam vents and grime on the street walls, wall neon strips at the second-floor line along the main street
    for (const b of built) {
      for (let z = b.z0 + 3; z < b.z1 - 2; z += 7) { if (b.x1 === MAIN.x0 - 5 || b.x1 === 61) bp.set(b.x1, 2, z, B.VENT); if (b.x0 === 82) bp.set(b.x0, 2, z, B.VENT); }
    }
    for (let z = 6; z < bp.d - 6; z++) { if (z % 9 < 6) { bp.set(MAIN.x0 - 5, 9, z, (z % 2) ? BLUE : HOLO); bp.set(MAIN.x1 + 5, 9, z, (z % 2) ? RED : HOLO); } }
    deck(bp, rng, lot);
    // the south gangway lands on the deck; the undercity door is the lot door column at street level: keep the
    // street open there and frame it with holo pylons
    const dx = lot.door.x - lot.x0;
    bp.fill(dx - 2, 1, bp.d - 1, dx - 2, 6, bp.d - 1, TRIM); bp.fill(dx + 3, 1, bp.d - 1, dx + 3, 6, bp.d - 1, TRIM);
    bp.fill(dx - 2, 2, bp.d - 2, dx - 2, 5, bp.d - 2, HOLO); bp.fill(dx + 3, 2, bp.d - 2, dx + 3, 5, bp.d - 2, HOLO);
    bp.door(dx, 1, bp.d - 1, 'S');
    bp.meta.lobby = { x: lot.x0 + 71, y: bp.y0 + 1, z: lot.z0 + 120 };
    bp.meta.floors = [1, 6, 11, 16, 36].map((y) => bp.y0 + y);
  },
};
