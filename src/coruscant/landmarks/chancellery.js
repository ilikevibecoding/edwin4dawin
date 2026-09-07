// Senate Office Building / Chancellery (docs/rubrics/06_landmarks.md): a dignified stepped stone tower (four
// setback tiers around one lift-and-stair core) with the Chancellor's red office and its curved window wall on
// the top floor, senators' offices on every floor, meeting rooms with holo tables, a briefing theatre, Senate
// Guard posts, archives, a records vault, a cafeteria and lobbies with reception desks; in front of it the private
// landing platform of the reference: a long approach deck on a stalk ending in a round disc pavilion with lit edge
// rows, railings and a canopy, joined to the tower at the boulevard level. Pure function of the lot and ctx.rng.
// Local coordinates: x 0..80 (west -> east), z 0..106 (north -> south, front = south), y 0 = plateau (repaved),
// walk level y 1, floors on y = 5k, boulevard deck y 35 (walk 36).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const STONE = B.SMOOTH_STONE, BRICK = B.STONE_BRICKS, PLASTER = B.PLASTER, STEEL = B.DURASTEEL, DARK = B.DURASTEEL_DARK;
const CHR = B.CHROME, PLATE = B.DECK_PLATE, BLACK = B.PANEL_BLACK, RED = B.PANEL_RED, STRIPE = B.PANEL_STRIPE;
const GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, GLASS = B.STEEL_GLASS, HOLO = B.HOLO_SIGN, CONSOLE = B.CONSOLE;
const SLAB = B.STONE_BRICK_SLAB, LAMP = B.CITY_LAMP, LANTERN = B.LANTERN, BARS = B.IRON_BARS;

// ------------------------------------------------------------------------------------------------ geometry
// The core (two 2x2 turbolifts opening south, a switchback stair well opening west) is the same on every floor;
// a 3-wide ring corridor surrounds it. Tiers step back around it.
const CORE = { x0: 35, x1: 45, z0: 27, z1: 37 };
const RING = { x0: 32, x1: 48, z0: 24, z1: 40 };
const LIFTS = [{ x: 36, z: 35 }, { x: 43, z: 35 }];     // shaft interiors x..x+1, z..z+1; doors on z 37 toward the ring
const TOP = 106;                                         // Chancellor's floor (walk level); roof walk 111
const TIERS = [
  { x0: 6, x1: 74, z0: 2, z1: 62, y0: 1, y1: 15, floors: [1, 6, 11] },                                            // podium
  { x0: 12, x1: 68, z0: 6, z1: 58, y0: 16, y1: 50, floors: [16, 21, 26, 31, 36, 41, 46], dx: 9, dz: 8, inner: true },
  { x0: 18, x1: 62, z0: 12, z1: 52, y0: 51, y1: 85, floors: [51, 56, 61, 66, 71, 76, 81], dx: 14, dz: 12 },
  { x0: 24, x1: 56, z0: 17, z1: 47, y0: 86, y1: 110, floors: [86, 91, 96, 101], dx: 8, dz: 7 },
];
const DOOR_X = 40;                                        // front door column (x 40..41)
const DECK_Y = 35;                                        // boulevard / landing platform slab
const PAD = { cx: 41, cz: 91, r: 12.5 };                  // disc pavilion (cell centre 40.5, 90.5)

// ------------------------------------------------------------------------------------------------ small helpers
const isEmit = (v) => v === GLOW || v === BLUE || v === HOLO || v === LANTERN || v === LAMP || v === B.WINDOW_LIT;
function doorway(bp, x0, z0, x1, z1, y, h = 3, lintel = GLOW, jamb = CHR) {
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y, z0, x0 - 1, y + h, z0, jamb); bp.fill(x1 + 1, y, z0, x1 + 1, y + h, z0, jamb); bp.fill(x0, y + h, z0, x1, y + h, z0, lintel); }
  else { bp.fill(x0, y, z0 - 1, x0, y + h, z0 - 1, jamb); bp.fill(x0, y, z1 + 1, x0, y + h, z1 + 1, jamb); bp.fill(x0, y + h, z0, x0, y + h, z1, lintel); }
}
function statue(bp, x, y, z, body = CHR, head = B.GOLD_BLOCK) { bp.set(x, y, z, BRICK); bp.fill(x, y + 1, z, x, y + 2, z, body); bp.set(x, y + 3, z, head); }
function lampPost(bp, x, y, z, h = 2, id = LAMP) { bp.fill(x, y, z, x, y + h - 1, z, BARS); bp.set(x, y + h, z, id); }
function planter(bp, x, y, z, leaf = B.OAK_LEAVES) { bp.set(x, y, z, DARK); bp.set(x, y + 1, z, leaf); }
function bench(bp, x, y, z) { bp.set(x, y, z, SLAB); bp.spot(x, y, z, 'seat'); }
function totem(bp, x, y, z) { bp.set(x, y, z, BLACK); bp.set(x, y + 1, z, HOLO); bp.set(x, y + 2, z, HOLO); }
// Senate Guard kiosk: the guard stands on a blue tile at (x, z) behind a console one cell toward (fx, fz); a chrome
// pylon with a blue lamp stands beside it.
function guardKiosk(bp, x, y, z, fx, fz) {
  bp.set(x, y - 1, z, B.BLUE_WOOL); bp.work(x, y, z, 'guard');
  bp.set(x + fx, y, z + fz, BLACK); bp.set(x + fx, y + 1, z + fz, CONSOLE);
  const px = x - fz, pz = z + fx;
  bp.set(px, y, pz, CHR); bp.set(px, y + 1, pz, CHR); bp.set(px, y + 2, pz, BLUE);
}
// stair tread whose walking surface is at height s (multiple of 0.5): slab on a dark base, or a full block on one
function tread(bp, x, z, s, full = STONE) {
  if (Number.isInteger(s)) { bp.set(x, s - 1, z, full); bp.set(x, s - 2, z, DARK); }
  else { const c = Math.floor(s); bp.set(x, c, z, SLAB); bp.set(x, c - 1, z, DARK); }
}
// half-step stair along z (dz = +-1) from walk level y0, n steps (n/2 blocks of rise), xa..xb wide, base filled solid
function stairZ(bp, xa, xb, z0, dz, y0, n) {
  for (let i = 0; i < n; i++) {
    const z = z0 + dz * i, nf = Math.floor((i + 1) / 2);
    for (let x = xa; x <= xb; x++) {
      if (nf > 0) bp.fill(x, y0, z, x, y0 + nf - 1, z, DARK);
      if (nf > 0) bp.set(x, y0 + nf - 1, z, STONE);
      if ((i + 1) & 1) bp.set(x, y0 + nf, z, SLAB);
      bp.fill(x, y0 + nf + 1, z, x, y0 + nf + 3, z, AIR);
    }
  }
}
// split an interior run u0..u1 into rooms of about `target` width separated by 1-cell partitions
function segments(u0, u1, target, rng) {
  const len = u1 - u0 + 1;
  const n = Math.max(1, Math.round((len + 1) / (target + 1)));
  const inner = len - (n - 1), base = Math.floor(inner / n), rem = inner - base * n;
  const out = []; let u = u0;
  for (let i = 0; i < n; i++) { const w = base + (i < rem ? 1 : 0); out.push([u, u + w - 1]); u += w + 1; }
  for (let i = 0; i + 1 < out.length; i++) {
    if (out[i][1] - out[i][0] >= 6 && out[i + 1][1] - out[i + 1][0] >= 6 && rng.chance(0.5)) { const d = rng.chance(0.5) ? 1 : -1; out[i][1] += d; out[i + 1][0] += d; }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ floor plans
// A Plan tracks the corridor cells of one walk level so rooms can find a wall facing a corridor for their door.
class Plan {
  constructor(bp, y) { this.bp = bp; this.y = y; this.corr = new Uint8Array(bp.w * bp.d); }
  mark(x0, z0, x1, z1) { for (let x = Math.max(0, x0); x <= Math.min(this.bp.w - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(this.bp.d - 1, z1); z++) this.corr[x * this.bp.d + z] = 1; }
  isCorr(x, z) { return x >= 0 && z >= 0 && x < this.bp.w && z < this.bp.d && this.corr[x * this.bp.d + z] === 1; }
}
// corridor: carved air with a patterned floor, lit ceiling tiles and wall lights every 4 cells
function corridor(plan, x0, z0, x1, z1, floorA = PLATE, floorB = BLACK) {
  const bp = plan.bp, y = plan.y;
  bp.fill(x0, y, z0, x1, y + 3, z1, AIR);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const cur = bp.get(x, y - 1, z);
    if (!isEmit(cur)) bp.set(x, y - 1, z, ((x % 4 === 0) || (z % 4 === 0)) ? floorB : floorA);
    if ((x + z) % 4 === 0) bp.set(x, y + 4, z, GLOW);
  }
  plan.mark(x0, z0, x1, z1);
}
// wall lights + pilaster pattern for the walls around corridor cells (run after all rooms of the level are carved)
function dressCorridors(plan) {
  const bp = plan.bp, y = plan.y;
  for (let x = 1; x < bp.w - 1; x++) for (let z = 1; z < bp.d - 1; z++) {
    if (!plan.isCorr(x, z) || (x + z) % 4 !== 1) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (plan.isCorr(nx, nz) || bp.get(nx + dx, y, nz + dz) === 0) continue;   // never the outer skin
      if (bp.get(nx, y + 2, nz) === STONE && bp.get(nx, y + 1, nz) === STONE && bp.get(nx, y, nz) === STONE) { bp.set(nx, y + 2, nz, GLOW); bp.set(nx, y, nz, PLASTER); bp.set(nx, y + 1, nz, PLASTER); }
    }
  }
}
// finds a 2-wide door position in the walls around interior x0..x1 / z0..z1 facing a corridor; `prefer` lists sides
function findDoor(plan, x0, z0, x1, z1, prefer = ['S', 'N', 'W', 'E'], w = 2) {
  const sides = [...prefer, ...['S', 'N', 'W', 'E'].filter((s) => !prefer.includes(s))];
  for (const side of sides) {
    const alongX = side === 'N' || side === 'S';
    const u0 = alongX ? x0 : z0, u1 = alongX ? x1 : z1, mid = (u0 + u1) / 2;
    const ok = (u) => alongX ? plan.isCorr(u, side === 'N' ? z0 - 2 : z1 + 2) : plan.isCorr(side === 'W' ? x0 - 2 : x1 + 2, u);
    let best = null, bestD = 1e9;
    for (let u = u0; u + w - 1 <= u1; u++) {
      let good = true;
      for (let k = 0; k < w; k++) if (!ok(u + k)) { good = false; break; }
      if (!good) continue;
      const dd = Math.abs(u + (w - 1) / 2 - mid);
      if (dd < bestD) { bestD = dd; best = u; }
    }
    if (best !== null) return { side, u: best - u0, x: alongX ? best : (side === 'W' ? x0 - 1 : x1 + 1), z: alongX ? (side === 'N' ? z0 - 1 : z1 + 1) : best };
  }
  return null;
}
function paintFloor(bp, x0, z0, x1, z1, y, style) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (isEmit(bp.get(x, y, z))) continue;
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    let id;
    switch (style) {
      case 'red': id = edge ? BLACK : ((x + z) % 5 === 0 ? RED : B.RED_WOOL); break;
      case 'blue': id = edge ? BLACK : ((x + z) % 3 === 0 ? PLATE : B.BLUE_WOOL); break;
      case 'stone': id = edge ? BRICK : ((x % 3 === 0 && z % 3 === 0) ? BRICK : STONE); break;
      case 'wood': id = edge ? DARK : ((x + z) % 2 ? B.SPRUCE_PLANKS : B.OAK_PLANKS); break;
      case 'plate': default: id = edge ? BRICK : ((x % 4 === 0 || z % 4 === 0) ? DARK : PLATE); break;
    }
    bp.set(x, y, z, id);
  }
}
// interior wall dressing for a carved room: pilaster every 4 cells (PLASTER) and a dark cornice row
function dressWalls(bp, x0, z0, x1, z1, y, h) {
  const ring = [];
  for (let x = x0 - 1; x <= x1 + 1; x++) { ring.push([x, z0 - 1]); ring.push([x, z1 + 1]); }
  for (let z = z0; z <= z1; z++) { ring.push([x0 - 1, z]); ring.push([x1 + 1, z]); }
  for (const [x, z] of ring) {
    if (bp.get(x, y + h - 1, z) === STONE) bp.set(x, y + h - 1, z, DARK);
    if ((x + z) % 4 === 0) for (let yy = y; yy < y + h - 1; yy++) if (bp.get(x, yy, z) === STONE) bp.set(x, yy, z, PLASTER);
  }
}
const FLOOR_STYLE = { senator_office: 'plate', senator_suite: 'plate', guard_post: 'blue', holo_meeting: 'stone', archive: 'wood', library: 'wood', lounge: 'wood', cafeteria: 'stone', kitchen: 'stone', vault: 'plate', barracks: 'plate', armory: 'plate', executive_office: 'red', meeting_room: 'stone', restaurant: 'wood', open_plan_office: 'plate' };
// carve + furnish a room whose interior is x0..x1 / z0..z1 at walk level y; the door is found against the plan's
// corridors (or given explicitly). Returns the Room frame or null when no wall faces a corridor.
function makeRoom(plan, rng, kind, x0, z0, x1, z1, opts = {}) {
  const bp = plan.bp, y = plan.y, h = opts.h || 4;
  const door = opts.door || findDoor(plan, x0, z0, x1, z1, opts.prefer || ['S', 'N', 'W', 'E'], opts.doorW || 2);
  if (!door) return null;
  bp.fill(x0, y, z0, x1, y + h - 1, z1, AIR);
  paintFloor(bp, x0, z0, x1, z1, y - 1, opts.floor || FLOOR_STYLE[kind] || 'plate');
  dressWalls(bp, x0, z0, x1, z1, y, h);
  const dw = opts.doorW || 2;
  if (door.side === 'N' || door.side === 'S') doorway(bp, door.x, door.z, door.x + dw - 1, door.z, y, 3, opts.lintel || GLOW);
  else doorway(bp, door.x, door.z, door.x, door.z + dw - 1, y, 3, opts.lintel || GLOW);
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side: door.side, doorU: door.u, doorW: dw }, kind, {});
  const fn = opts.fn || FURNISH[kind] || (ROOMS[kind] && ROOMS[kind].fn) || FURNISH.senator_office;
  fn(r, rng);
  if (opts.dress !== false) dressRoom(r, rng);
  r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
  return r;
}
// generic extra dressing so every room reads as lived-in: wall hangings, a lamp, a plant
const DRESS = [B.SHELF, B.BOOKSHELF, B.CRATE, B.CHEST, B.BARREL];
function dressRoom(r, rng) {
  for (let v = 2; v < r.back; v += 3) for (const u of [0, r.w - 1]) {
    if (!r.free(u, v) || !r.empty(u, 0, v) || !r.empty(u, 1, v)) continue;
    if ((u + v) % 2 === 0) r.planter(u, v, (v & 1) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
    else { r.put(u, 0, v, rng.pick(DRESS)); if (rng.chance(0.5)) r.put(u, 1, v, HOLO); }
  }
  if (r.empty(r.cu, 3, 1)) r.putRaw(r.cu, r.h - 1, 1, LANTERN);
}

// ------------------------------------------------------------------------------------------------ room templates
// senator's office: console desk before the back wall, the senator's chair, guest chairs, shelves, banner, plants
function senatorOffice(r, rng, v0 = 0) {
  const c = r.cu, back = r.back;
  for (let v = v0 + 1; v <= back; v++) for (let u = c - 1; u <= c + 1; u++) if (r.inside(u, v)) r.putRaw(u, -1, v, u === c ? B.BLUE_WOOL : PLATE);
  r.put(c - 1, 0, back - 1, B.TABLE); r.put(c, 0, back - 1, CONSOLE); r.put(c + 1, 0, back - 1, B.TABLE);
  r.seat(c, back); r.work(c, back, 'senator');
  const gv = Math.max(v0 + 2, back - 3);
  r.seat(c - 1, gv); r.seat(c + 1, gv);
  for (let u = 0; u < r.w; u++) if (u < c - 1 || u > c + 1) { r.put(u, 0, back, u % 2 ? B.BOOKSHELF : B.SHELF); r.put(u, 1, back, B.BOOKSHELF); }
  r.put(c, 1, back, HOLO); r.put(c, 2, back, B.RED_WOOL); r.put(c - 1, 2, back, B.RED_WOOL); r.put(c + 1, 2, back, B.RED_WOOL);
  if (back - 2 > v0 + 1) { r.put(0, 0, back - 2, B.CHEST); r.put(r.w - 1, 0, back - 2, B.SHELF); }
  r.planter(0, v0 + 2); r.planter(r.w - 1, v0 + 2);
  r.putRaw(c, r.h - 1, back - 2, LANTERN);
  r.ceilingLights(4);
}
// suite: reception with a secretary's desk, a plaster partition with a lit doorway, the senator's office behind
function senatorSuite(r, rng) {
  const c = r.cu, pv = 3;
  for (let u = 0; u < r.w; u++) { if (u === c || u === c + 1) { r.putRaw(u, 3, pv, GLOW); continue; } r.fill(u, 0, pv, u, 3, pv, (u % 4 === 0) ? DARK : PLASTER); }
  r.put(0, 0, 2, CONSOLE); r.put(1, 0, 2, B.TABLE); r.seat(0, 1); r.work(0, 1, 'secretary');
  for (let u = r.w - 1; u >= r.w - 3 && u > c + 2; u--) r.seat(u, 2);
  r.put(r.w - 1, 1, 1, HOLO);
  senatorOffice(r, rng, pv);
}
// Senate Guard post: blue tiles, a counter with consoles and a gap, weapons rack, holo screens, blue pylons
function guardPost(r, rng) {
  const c = r.cu, back = r.back;
  for (let u = 0; u < r.w; u++) {
    if (u === c || u === c + 1) continue;
    if (r.put(u, 0, 2, BLACK)) r.put(u, 1, 2, (u & 1) ? CONSOLE : SLAB);
  }
  r.seat(c - 1, 3); r.work(c - 1, 3, 'guard'); r.seat(c + 2 < r.w ? c + 2 : c + 1, 3); r.work(c + 2 < r.w ? c + 2 : c + 1, 3, 'guard');
  for (let u = 0; u < r.w; u++) { if (u % 2 === 0) { r.put(u, 0, back, B.IRON_BLOCK); r.put(u, 1, back, BARS); } else { r.put(u, 0, back, B.CHEST); r.put(u, 1, back, HOLO); } r.put(u, 2, back, (u % 3 === 0) ? BLUE : B.BLUE_WOOL); }
  r.put(0, 0, 1, CHR); r.put(0, 1, 1, CHR); r.put(0, 2, 1, BLUE);
  r.put(r.w - 1, 0, 1, CHR); r.put(r.w - 1, 1, 1, CHR); r.put(r.w - 1, 2, 1, BLUE);
  r.spot(c, 4 <= back ? 4 : back, 'stand');
  r.ceilingLights(4, BLUE);
}
// meeting room around a holo table: long table with a projector in the middle, seats both sides, holo wall
function holoMeeting(r, rng) {
  const c = r.cu, wide = r.w >= 7, v0 = 2, v1 = r.back - 1;
  for (let v = v0; v <= v1; v++) { r.table(c, v); if (wide) r.table(c + 1, v); r.seat(c - 1, v); r.seat(wide ? c + 2 : c + 1, v); }
  const vm = Math.floor((v0 + v1) / 2); r.put(c, 0, vm, BLACK); r.put(c, 1, vm, HOLO);
  r.put(c, 1, r.back, HOLO); r.put(c + 1, 1, r.back, HOLO); r.put(c, 2, r.back, HOLO); r.put(c + 1, 2, r.back, HOLO);
  r.put(0, 0, r.back, B.SHELF); r.put(r.w - 1, 0, r.back, B.IRON_BLOCK); r.put(r.w - 1, 1, r.back, B.GLASS);
  r.planter(0, 2); r.planter(r.w - 1, 2);
  r.ceilingLights(4); r.putRaw(c, r.h, vm, BLUE);
}
// records vault: iron cage across the room with a chrome gate, chests and gold inside, red warning panels
function vault(r, rng) {
  const c = r.cu, vf = 2;
  for (let u = 0; u < r.w; u++) { if (u === c || u === c + 1) { r.putRaw(u, 3, vf, RED); continue; } r.fill(u, 0, vf, u, 3, vf, (u % 3 === 0) ? B.IRON_BLOCK : BARS); }
  r.put(c - 1, 0, vf, CHR); r.put(c - 1, 1, vf, CHR); r.put(c + 2, 0, vf, CHR); r.put(c + 2, 1, vf, CHR);
  for (let v = vf + 2; v <= r.back; v += 2) for (let u = 0; u < r.w; u++) {
    if (u === c || u === c + 1) continue;
    r.put(u, 0, v, (u + v) % 3 === 0 ? B.GOLD_BLOCK : B.CHEST); if ((u + v) % 3 === 1) r.put(u, 1, v, B.CHEST);
  }
  r.put(c, 0, r.back, CONSOLE); r.put(c + 1, 0, r.back, B.IRON_BLOCK); r.put(c + 1, 1, r.back, B.GOLD_BLOCK);
  r.work(c, r.back - 1, 'vault clerk'); r.spot(c + 1, 1, 'guard');
  r.put(0, 2, r.back, RED); r.put(r.w - 1, 2, r.back, RED);
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, -1, 1, BLUE);
  r.ceilingLights(3, BLUE);
}
// archive hall: double-sided bookshelf stacks with lantern-lit aisles, reading tables, archivist console
function archiveHall(r, rng) {
  for (let u = 1; u < r.w - 1; u += 3) for (let v = 2; v <= r.back - 3; v++) { r.put(u, 0, v, B.BOOKSHELF); r.put(u, 1, v, B.BOOKSHELF); r.put(u, 2, v, (v % 3 === 0) ? B.CHEST : B.BOOKSHELF); }
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.BOOKSHELF); r.put(u, 1, r.back, B.BOOKSHELF); r.put(u, 2, r.back, B.SHELF); }
  for (let u = 2; u < r.w - 2; u += 4) { r.table(u, r.back - 2); r.seat(u - 1, r.back - 2); r.seat(u + 1, r.back - 2); }
  r.put(r.w - 1, 0, r.back - 1, CONSOLE); r.work(r.w - 2, r.back - 1, 'archivist');
  for (let u = 2; u < r.w; u += 3) r.lantern(u, 3);
  r.ceilingLights(4);
}
// cafeteria: servery counter with kitchen gear along the back, rows of tables and seats, planters, menu holo
function cafeteria(r, rng) {
  r.counter(0, r.w - 1, r.back, BLACK);
  r.put(1, 0, r.back, B.FURNACE); r.put(r.w - 2, 0, r.back, B.CRATE); r.put(r.cu, 0, r.back, B.BARREL); r.put(2, 1, r.back, B.CHEST);
  r.work(r.cu, r.back - 1, 'server'); r.put(r.cu, 2, r.back, HOLO); r.put(r.cu + 1, 2, r.back, HOLO);
  for (let v = 2; v <= r.back - 3; v += 3) for (let u = 1; u < r.w - 1; u++) { if (u % 4 === 3) continue; r.table(u, v); r.seat(u, v - 1); r.seat(u, v + 1); }
  r.planter(0, 2); r.planter(r.w - 1, 2);
  r.ceilingLights(4);
}
// lounge: sofas (slabs) around low tables, planters, a bar counter, holo screen
function lounge(r, rng) {
  for (let v = 2; v <= r.back - 2; v += 3) for (let u = 1; u < r.w - 1; u += 4) { r.table(u, v); r.seat(u - 1, v); r.seat(u + 1, v); if (r.free(u, v + 1)) r.seat(u, v + 1); }
  r.counter(0, Math.min(r.w - 1, 3), r.back, BLACK); r.put(1, 0, r.back, B.BARREL); r.work(1, r.back - 1, 'bartender');
  r.put(r.w - 1, 1, r.back, HOLO); r.put(r.w - 2, 1, r.back, HOLO); r.planter(r.w - 1, r.back, B.SPRUCE_LEAVES);
  r.ceilingLights(4);
}
const FURNISH = {
  senator_office: senatorOffice, senator_suite: senatorSuite, guard_post: guardPost, holo_meeting: holoMeeting, vault,
  archive: archiveHall, cafeteria, lounge,
  library: ROOMS.library.fn, barracks: ROOMS.barracks.fn, armory: ROOMS.armory.fn, restroom: ROOMS.restroom.fn, storage: ROOMS.storage.fn,
  server_room: ROOMS.server_room.fn, comms_room: ROOMS.comms_room.fn, control_room: ROOMS.control_room.fn, droid_bay: ROOMS.droid_bay.fn,
  kitchen: ROOMS.kitchen.fn, open_plan_office: ROOMS.open_plan_office.fn, executive_office: ROOMS.executive_office.fn, restaurant: ROOMS.restaurant.fn,
  meeting_room: holoMeeting, medbay: ROOMS.medbay.fn, gym: ROOMS.gym.fn,
};

// ------------------------------------------------------------------------------------------------ the core
// carves the lift shafts, the alcove between them and the switchback stair for every walk level in `levels`
function core(bp, levels) {
  const yTop = levels[levels.length - 1];
  // lift shafts: black walls, air inside, doors south at every level
  for (const l of LIFTS) {
    bp.fill(l.x - 1, 0, l.z - 1, l.x + 2, yTop + 4, l.z + 2, BLACK);
    bp.fill(l.x, 1, l.z, l.x + 1, yTop + 3, l.z + 1, AIR);
    bp.lift(l.x, l.z, 1, yTop);
    for (const y of levels) {
      bp.fill(l.x, y, l.z + 2, l.x + 1, y + 2, l.z + 2, AIR);
      bp.set(l.x - 1, y + 2, l.z + 2, BLUE); bp.set(l.x + 2, y + 2, l.z + 2, BLUE); bp.set(l.x, y + 3, l.z + 2, CHR); bp.set(l.x + 1, y + 3, l.z + 2, CHR);
    }
    bp.fill(l.x, yTop + 4, l.z, l.x + 1, yTop + 4, l.z + 1, CHR);
  }
  // directory alcove between the lifts (x 39..41, z 35..37)
  for (const y of levels) {
    bp.fill(39, y, 35, 41, y + 2, 37, AIR);
    bp.fill(39, y - 1, 35, 41, y - 1, 37, BLUE); bp.set(40, y - 1, 36, BLACK);
    bp.set(40, y + 1, 34, HOLO); bp.set(40, y + 2, 34, HOLO); bp.set(39, y + 1, 34, BLUE); bp.set(41, y + 1, 34, BLUE);
    bench(bp, 39, y, 35); bench(bp, 41, y, 35);
    bp.set(40, y + 3, 36, GLOW);
  }
  // stair well x 36..44, z 28..32: landing x 36..38, up-flight along z 28..29, half landing x 43..44, back along z 31..32
  for (let i = 0; i < levels.length; i++) {
    const y = levels[i], last = i === levels.length - 1;
    bp.fill(36, y, 28, 44, y + 3, 32, AIR);
    paintFloor(bp, 36, 28, 38, 32, y - 1, 'stone');
    for (let yy = y; yy <= y + 2; yy++) { bp.set(45, yy, 30, yy === y + 2 ? BLUE : STRIPE); bp.set(35, yy, 28, yy === y + 2 ? BLUE : STRIPE); }
    doorway(bp, 35, 30, 35, 31, y, 3, BLUE);
    bp.set(37, y + 4, 30, GLOW); bp.set(42, y + 4, 30, GLOW);
    bp.room('stair_core', 35, y, 27, 45, 33);
    if (last) {
      // roof exit vestibule: ceiling, a directory totem, benches, planters and vents along the blind east wall
      bp.fill(36, y + 4, 28, 44, y + 4, 32, DARK); bp.set(40, y + 4, 30, GLOW);
      totem(bp, 44, y, 30); bench(bp, 44, y, 28); bench(bp, 44, y, 32); planter(bp, 43, y, 28, B.OAK_LEAVES); planter(bp, 43, y, 32, B.SPRUCE_LEAVES);
      for (const x of [37, 40]) { bp.set(x, y, 28, B.VENT); bp.set(x, y, 32, B.VENT); bp.set(x, y + 1, 28, BLUE); bp.set(x, y + 1, 32, HOLO); }
      continue;
    }
    bp.fill(39, y + 4, 28, 44, y + 4, 32, AIR);
    for (let k = 0; k < 5; k++) for (const z of [28, 29]) tread(bp, 38 + k, z, y + 0.5 * (k + 1));
    for (const x of [43, 44]) for (let z = 28; z <= 32; z++) tread(bp, x, z, y + 2.5);
    for (let k = 5; k < 9; k++) for (const z of [31, 32]) tread(bp, 42 - (k - 5), z, y + 0.5 * (k + 1));
    bp.fill(40, y, 30, 40, y + 4, 30, CHR); bp.set(40, y + 2, 30, BLUE);
  }
}

// ------------------------------------------------------------------------------------------------ tower floors
const TOWER_POOL = [['senator_office', 6], ['holo_meeting', 2], ['archive', 1], ['lounge', 1], ['open_plan_office', 1], ['executive_office', 1], ['library', 0.6], ['comms_room', 0.5], ['restroom', 0.5], ['storage', 0.3], ['server_room', 0.4]];
function pickKind(rng, pool = TOWER_POOL) {
  let total = 0; for (const [, w] of pool) total += w;
  let r = rng.next() * total;
  for (const [k, w] of pool) { r -= w; if (r <= 0) return k; }
  return pool[0][0];
}
// rooms along one strip of a band: alongX strips run in x with depth in z, else in z with depth in x; `skip` is an
// optional [a, b] range of u reserved for a hand-built room (its walls at a-1 and b+1)
function strip(plan, rng, alongX, u0, u1, v0, v1, target, prefer, kinds, skip = null) {
  if (skip) return strip(plan, rng, alongX, u0, skip[0] - 2, v0, v1, target, prefer, kinds) + strip(plan, rng, alongX, skip[1] + 2, u1, v0, v1, target, prefer, kinds);
  if (u1 - u0 + 1 < 4) return 0;
  let n = 0;
  for (const [a, b] of segments(u0, u1, target, rng)) {
    const w = b - a + 1;
    if (w < 4) continue;
    let kind = kinds ? kinds(n, w) : pickKind(rng);
    const depth = v1 - v0 + 1;
    if (kind === 'senator_office' && depth >= 9 && w >= 6) kind = 'senator_suite';
    if (kind === 'senator_suite' && (depth < 9 || w < 6)) kind = 'senator_office';
    if (kind === 'holo_meeting' && (w < 5 || depth < 5)) kind = 'senator_office';
    const r = alongX ? makeRoom(plan, rng, kind, a, v0, b, v1, { prefer }) : makeRoom(plan, rng, kind, v0, a, v1, b, { prefer });
    if (r) n++;
  }
  return n;
}
// a generic office floor of a tier: ring corridor(s) with window bays at the corners, strips of rooms, the core ring
function towerFloor(bp, rng, tier, y, special = null) {
  const plan = new Plan(bp, y);
  const { x0, x1, z0, z1, dx, dz } = tier;
  // outer corridor ring: north and south legs run wall to wall (window bays at the corners), west/east legs between
  corridor(plan, x0 + 1, z0 + dz, x1 - 1, z0 + dz + 2);
  corridor(plan, x0 + 1, z1 - dz - 2, x1 - 1, z1 - dz);
  corridor(plan, x0 + dx, z0 + dz + 3, x0 + dx + 2, z1 - dz - 3);
  corridor(plan, x1 - dx - 2, z0 + dz + 3, x1 - dx, z1 - dz - 3);
  // the core ring (already the outer ring for the single-band tiers)
  if (tier.inner) {
    corridor(plan, RING.x0, RING.z0, RING.x1, RING.z0 + 2); corridor(plan, RING.x0, RING.z1 - 2, RING.x1, RING.z1);
    corridor(plan, RING.x0, RING.z0 + 3, RING.x0 + 2, RING.z1 - 3); corridor(plan, RING.x1 - 2, RING.z0 + 3, RING.x1, RING.z1 - 3);
    // passages through the inner band at the four cardinals
    corridor(plan, 39, z0 + dz + 3, 41, RING.z0 - 1); corridor(plan, 39, RING.z1 + 1, 41, z1 - dz - 3);
    corridor(plan, x0 + dx + 3, 31, RING.x0 - 1, 33); corridor(plan, RING.x1 + 1, 31, x1 - dx - 3, 33);
  }
  // corner bays: bench, planter, lamp
  for (const [bx, bz] of [[x0 + 2, z0 + dz + 1], [x1 - 2, z0 + dz + 1], [x0 + 2, z1 - dz - 1], [x1 - 2, z1 - dz - 1]]) {
    bench(bp, bx, y, bz); planter(bp, bx + (bx < 40 ? 1 : -1), y, bz, B.SPRUCE_LEAVES); bp.set(bx, y + 3, bz, LANTERN);
  }
  // one guard post per floor by the lifts, one meeting room; the rest from the pool
  let guardDone = false, meetDone = false;
  const kinds = (n, w) => {
    if (!guardDone && w >= 5) { guardDone = true; return 'guard_post'; }
    if (!meetDone && w >= 6) { meetDone = true; return 'holo_meeting'; }
    return pickKind(rng);
  };
  const S = special || {};
  // outer band strips (interior cells); the south strip (by the entrance side) gets the guard post on single-band tiers
  strip(plan, rng, true, x0 + 1, x1 - 1, z1 - dz + 2, z1 - 1, 9, ['N'], S.south || (tier.inner ? null : kinds), S.southSkip || null);
  strip(plan, rng, true, x0 + 1, x1 - 1, z0 + 1, z0 + dz - 2, 9, ['S'], null);
  strip(plan, rng, false, z0 + dz + 4, z1 - dz - 4, x0 + 1, x0 + dx - 2, 9, ['E'], null);
  strip(plan, rng, false, z0 + dz + 4, z1 - dz - 4, x1 - dx + 2, x1 - 1, 9, ['W'], null);
  if (tier.inner) {
    // inner band between the outer corridor and the core ring, split by the cardinal passages
    const ix0 = x0 + dx + 4, ix1 = x1 - dx - 4, iz0 = z0 + dz + 4, iz1 = z1 - dz - 4;   // 25..55 / 18..46
    strip(plan, rng, true, ix0, 37, RING.z1 + 2, iz1, 7, ['N', 'W'], S.southInner || kinds);   // by the lift lobby
    strip(plan, rng, true, 43, ix1, RING.z1 + 2, iz1, 7, ['N', 'E'], null);
    strip(plan, rng, true, ix0, 37, iz0, RING.z0 - 2, 7, ['S', 'W'], null);
    strip(plan, rng, true, 43, ix1, iz0, RING.z0 - 2, 7, ['S', 'E'], null);
    strip(plan, rng, false, RING.z0, 29, ix0, RING.x0 - 2, 7, ['E', 'W'], null);
    strip(plan, rng, false, 35, RING.z1, ix0, RING.x0 - 2, 7, ['E', 'W'], null);
    strip(plan, rng, false, RING.z0, 29, RING.x1 + 2, ix1, 7, ['W', 'E'], null);
    strip(plan, rng, false, 35, RING.z1, RING.x1 + 2, ix1, 7, ['W', 'E'], null);
  }
  if (S.after) S.after(plan);
  dressCorridors(plan);
  return plan;
}

// ------------------------------------------------------------------------------------------------ podium
// ground floor: grand double-height lobby (void x 25..55 z 42..58 up to y 9), cafeteria and kitchen west, archives
// and vault east, Senate Guard station, briefing theatre, barracks and service rooms along a north corridor
function podiumGround(bp, rng) {
  const y = 1, plan = new Plan(bp, y);
  // corridors
  corridor(plan, 32, 24, 34, 40); corridor(plan, 46, 24, 48, 40); corridor(plan, 7, 24, 73, 26);
  corridor(plan, 39, 3, 41, 23); corridor(plan, 50, 3, 52, 23);
  // lobby
  bp.fill(22, y, 38, 58, y + 3, 61, AIR);
  bp.fill(25, y, 42, 55, 9, 58, AIR);
  paintFloor(bp, 22, 38, 58, 61, 0, 'stone');
  for (let z = 40; z <= 61; z++) for (const x of [40, 41]) bp.set(x, 0, z, (z % 3 === 0) ? GLOW : B.RED_WOOL);
  for (let x = 25; x <= 55; x++) for (let z = 42; z <= 58; z++) bp.set(x, 10, z, ((x % 4 === 0) && (z % 4 === 2)) ? GLOW : ((x + z) % 2 ? DARK : STEEL));
  for (let x = 22; x <= 58; x++) for (let z = 38; z <= 61; z++) if (bp.get(x, 5, z) === STONE && (x + z) % 4 === 0) bp.set(x, 5, z, GLOW);
  plan.mark(22, 38, 58, 61);
  lobbyFurnish(bp, rng, y);
  // west wing
  makeRoom(plan, rng, 'cafeteria', 7, 44, 20, 60, { prefer: ['E'] });
  makeRoom(plan, rng, 'kitchen', 7, 36, 20, 42, { prefer: ['E'] });
  makeRoom(plan, rng, 'guard_post', 7, 28, 30, 34, { prefer: ['N', 'E'], floor: 'blue' });
  briefingTheatre(bp, rng, plan);
  // north-centre: Senate Guard barracks and armoury west of the spine, droid bay and stores east
  makeRoom(plan, rng, 'barracks', 32, 3, 37, 12, { prefer: ['E'] });
  makeRoom(plan, rng, 'armory', 32, 14, 37, 22, { prefer: ['E'] });
  makeRoom(plan, rng, 'droid_bay', 43, 3, 48, 12, { prefer: ['W'] });
  makeRoom(plan, rng, 'storage', 43, 14, 48, 22, { prefer: ['W'] });
  // east wing
  makeRoom(plan, rng, 'control_room', 54, 3, 73, 12, { prefer: ['W'] });
  makeRoom(plan, rng, 'server_room', 54, 14, 73, 22, { prefer: ['W'] });
  makeRoom(plan, rng, 'holo_meeting', 50, 28, 61, 34, { prefer: ['N'] });
  makeRoom(plan, rng, 'holo_meeting', 63, 28, 73, 34, { prefer: ['N'] });
  makeRoom(plan, rng, 'vault', 60, 36, 73, 42, { prefer: ['W'] });
  makeRoom(plan, rng, 'archive', 60, 44, 73, 60, { prefer: ['W'] });
  dressCorridors(plan);
  bp.room('lobby', 21, y, 37, 59, 62);
  // rear service door on the north face
  doorway(bp, 40, 2, 41, 2, y, 3, GLOW); bp.door(40, y, 2, 'N');
}
function lobbyFurnish(bp, rng, y) {
  // reception desk facing the entrance
  for (let x = 36; x <= 45; x++) { bp.set(x, y, 50, BLACK); bp.set(x, y + 1, 50, (x === 40 || x === 41) ? CONSOLE : SLAB); }
  bp.set(35, y, 50, CHR); bp.set(46, y, 50, CHR); bp.set(35, y + 1, 50, BLUE); bp.set(46, y + 1, 50, BLUE);
  for (const x of [38, 43]) { bp.set(x, y, 49, SLAB); bp.work(x, y, 49, 'receptionist'); }
  bp.set(40, y + 2, 49, HOLO); bp.set(41, y + 2, 49, HOLO);
  // guard kiosks flanking the entrance, statues, planters, seating clusters, directory totems
  guardKiosk(bp, 34, y, 59, 0, 1); guardKiosk(bp, 47, y, 59, 0, 1);
  for (const z of [44, 48, 52, 56]) { statue(bp, 26, y, z); statue(bp, 54, y, z); lampPost(bp, 27, y, z - 2, 2, LANTERN); lampPost(bp, 53, y, z - 2, 2, LANTERN); }
  for (const [x, z] of [[30, 45], [30, 55], [51, 45], [51, 55]]) { bp.set(x, y, z, B.TABLE); for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bench(bp, x + dx, y, z + dz); }
  for (const [x, z] of [[24, 40], [56, 40], [24, 60], [56, 60], [33, 44], [48, 44]]) planter(bp, x, y, z, (x + z) % 2 ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
  totem(bp, 36, y, 44); totem(bp, 45, y, 44); totem(bp, 22, y, 50); totem(bp, 58, y, 50);
  // waiting corners under the mezzanine, planters and red banners along the side galleries
  for (const [x, z] of [[29, 40], [52, 40]]) { bp.set(x, y, z, B.TABLE); for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bench(bp, x + dx, y, z + dz); }
  for (const z of [44, 48, 52, 56]) { planter(bp, 23, y, z, (z % 8) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); planter(bp, 57, y, z, (z % 8) ? B.SPRUCE_LEAVES : B.OAK_LEAVES); }
  for (const z of [42, 46, 50, 54, 58]) for (const x of [23, 57]) { bp.set(x, y + 3, z, B.RED_WOOL); bp.set(x, y + 2, z, (z % 8 === 2) ? B.GOLD_BLOCK : B.RED_WOOL); }
  // chrome columns at the void edge, chandeliers over the hall
  for (const x of [25, 55]) for (const z of [42, 50, 58]) { bp.fill(x, y, z, x, 9, z, CHR); bp.set(x, 5, z, BLUE); }
  for (const x of [30, 40, 50]) for (const z of [46, 54]) { bp.set(x, 9, z, BARS); bp.set(x, 8, z, LANTERN); for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bp.set(x + dx, 8, z + dz, (dx + dz + x) % 2 ? GLOW : CHR); }
  bp.spot(40, y, 55, 'stand'); bp.spot(41, y, 47, 'stand');
}
// briefing theatre x 7..30, z 3..22: raised stage at the south end with the holo screen, four rising rows of desks
// and seats to the north, half-step ramps in the west, middle and east aisles, doors flanking the stage
function briefingTheatre(bp, rng, plan) {
  const y = 1;
  bp.fill(7, y, 3, 30, 9, 22, AIR);
  paintFloor(bp, 7, 3, 30, 22, 0, 'stone');
  for (let x = 7; x <= 30; x++) for (let z = 3; z <= 22; z++) bp.set(x, 10, z, ((x + z) % 3 === 0) ? GLOW : DARK);
  // stage z 20..22 at +1
  bp.fill(10, y, 20, 27, y, 22, BLACK); for (let x = 10; x <= 27; x += 2) bp.set(x, y, 20, GLOW);
  bp.set(18, y + 1, 21, CONSOLE); bp.set(19, y + 1, 21, BLACK); bp.set(19, y + 2, 21, HOLO); bp.set(19, y + 3, 21, HOLO);
  for (let x = 12; x <= 25; x++) for (let yy = y + 2; yy <= y + 4; yy++) bp.set(x, yy, 23, (x % 5 === 0) ? BLUE : HOLO);
  bp.work(17, y + 1, 21, 'briefing officer');
  // rows k = 1..4 at z 17-3k .. 19-3k rising one block per row; desk row nearest the stage, seats behind
  for (let k = 1; k <= 4; k++) {
    const zf = 19 - 3 * k, zs = zf - 1, zw = zf - 2, lvl = y + k - 1;   // floor block level (walk = lvl + 1)
    bp.fill(7, y, zw, 30, lvl, zf, DARK);
    for (let x = 7; x <= 30; x++) for (const z of [zw, zs, zf]) bp.set(x, lvl, z, ((x + z) % 2) ? PLATE : STONE);
    for (let x = 9; x <= 28; x++) {
      if (x === 18 || x === 19) continue;
      bp.set(x, lvl + 1, zf, (x % 3 === 0) ? CONSOLE : B.TABLE);
      bp.set(x, lvl + 1, zs, SLAB); bp.spot(x, lvl + 1, zs, 'seat');
    }
    // aisles: half-step ramps (front cell a slab at the lower level)
    for (const x of [7, 8, 18, 19, 29, 30]) { bp.fill(x, lvl, zf, x, lvl + 3, zf, AIR); bp.fill(x, y, zf, x, lvl - 1, zf, DARK); bp.set(x, lvl, zf, SLAB); bp.set(x, lvl, zs, STONE); bp.set(x, lvl, zw, STONE); if (lvl > y) bp.set(x, lvl - 1, zf, DARK); }
    for (const x of [8, 19, 30]) bp.set(x, lvl, zw, k % 2 ? BLUE : GLOW);
  }
  for (let x = 12; x <= 25; x++) bp.set(x, y, 19, SLAB);   // half step up onto the stage
  // back aisle z 3..4 at the top level: guard kiosk, lanterns
  const topL = y + 4;
  bp.fill(7, y, 3, 30, topL - 1, 4, DARK); for (let x = 7; x <= 30; x++) for (const z of [3, 4]) bp.set(x, topL - 1, z, (x % 4 === 0) ? BRICK : STONE);
  for (let x = 9; x <= 28; x += 4) lampPost(bp, x, topL, 3, 1, LANTERN);
  // front floor z 17..19 at walk level 1: guard kiosks by the doors, footlights
  guardKiosk(bp, 10, y, 18, 1, 0); guardKiosk(bp, 27, y, 18, -1, 0);
  for (let x = 7; x <= 30; x += 3) bp.set(x, 0, 18, BLUE);
  for (const x of [7, 30]) for (let z = 5; z <= 20; z += 5) bp.set(x, y + 2, z, LANTERN);
  // doors from the north corridor (z 24..26) flank the stage
  doorway(bp, 8, 23, 9, 23, y, 3, BLUE); doorway(bp, 28, 23, 29, 23, y, 3, BLUE);
  bp.room('briefing_theatre', 6, y, 2, 31, 23);
}
// mezzanine level y 6: the ring's south leg opens onto a gallery around the lobby void
function podiumMezzanine(bp, rng) {
  const y = 6, plan = new Plan(bp, y);
  corridor(plan, 32, 24, 34, 40); corridor(plan, 46, 24, 48, 40); corridor(plan, 7, 24, 73, 26);
  corridor(plan, 39, 3, 41, 23); corridor(plan, 50, 3, 52, 23);
  corridor(plan, 7, 35, 31, 37); corridor(plan, 49, 35, 73, 37);
  // gallery around the void (void x 25..55, z 42..58 is open air from the lobby)
  for (const [gx0, gz0, gx1, gz1] of [[22, 38, 58, 41], [22, 42, 24, 61], [56, 42, 58, 61], [22, 59, 58, 61]]) {
    bp.fill(gx0, y, gz0, gx1, y + 3, gz1, AIR); paintFloor(bp, gx0, gz0, gx1, gz1, 5, 'plate'); plan.mark(gx0, gz0, gx1, gz1);
  }
  for (let x = 25; x <= 55; x++) { bp.set(x, y, 41, BARS); bp.set(x, y, 59, BARS); }
  for (let z = 42; z <= 58; z++) { bp.set(24, y, z, BARS); bp.set(56, y, z, BARS); }
  for (const [x, z] of [[23, 44], [23, 52], [57, 44], [57, 52], [30, 60], [50, 60]]) { bench(bp, x, y, z); planter(bp, x, y, z + 1, B.SPRUCE_LEAVES); }
  for (const [x, z] of [[23, 40], [57, 40], [40, 60]]) totem(bp, x, y, z);
  for (let x = 26; x <= 54; x += 4) for (const z of [41, 59]) bp.set(x, y + 3, z, LANTERN);
  for (const z of [46, 50, 56]) { planter(bp, 22, y, z, B.OAK_LEAVES); planter(bp, 58, y, z, B.SPRUCE_LEAVES); }
  for (const x of [27, 51]) { planter(bp, x, y, 38, (x % 2) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); bench(bp, x + 1, y, 38); bench(bp, x + 2, y, 38); }
  for (const [x, z] of [[22, 60], [58, 60], [22, 39], [58, 39]]) { bp.set(x, y, z, CHR); bp.set(x, y + 1, z, CHR); bp.set(x, y + 2, z, BLUE); }
  bp.room('mezzanine_gallery', 21, y, 37, 59, 62);
  // rooms
  makeRoom(plan, rng, 'lounge', 7, 28, 17, 33, { prefer: ['S'] });
  makeRoom(plan, rng, 'library', 19, 28, 30, 33, { prefer: ['S', 'E'] });
  makeRoom(plan, rng, 'holo_meeting', 7, 39, 20, 43, { prefer: ['E', 'N'] });
  makeRoom(plan, rng, 'senator_suite', 7, 45, 20, 52, { prefer: ['E'] });
  makeRoom(plan, rng, 'senator_suite', 7, 54, 20, 61, { prefer: ['E'] });
  makeRoom(plan, rng, 'meeting_room', 32, 3, 37, 12, { prefer: ['E'] });
  makeRoom(plan, rng, 'restroom', 32, 14, 37, 22, { prefer: ['E'] });
  makeRoom(plan, rng, 'comms_room', 43, 3, 48, 12, { prefer: ['W'] });
  makeRoom(plan, rng, 'archive', 43, 14, 48, 22, { prefer: ['W'] });
  makeRoom(plan, rng, 'open_plan_office', 54, 3, 73, 12, { prefer: ['W'] });
  makeRoom(plan, rng, 'archive', 54, 14, 73, 22, { prefer: ['W'] });
  makeRoom(plan, rng, 'senator_suite', 50, 28, 61, 33, { prefer: ['N', 'S'] });
  makeRoom(plan, rng, 'senator_suite', 63, 28, 73, 33, { prefer: ['N', 'S'] });
  makeRoom(plan, rng, 'medbay', 60, 39, 73, 43, { prefer: ['W', 'N'] });
  makeRoom(plan, rng, 'senator_suite', 60, 45, 73, 52, { prefer: ['W'] });
  makeRoom(plan, rng, 'executive_office', 60, 54, 73, 61, { prefer: ['W'] });
  dressCorridors(plan);
}
// full floor y 11 over the lobby and theatre: two east-west corridors, the ring, the spines
function podiumTop(bp, rng) {
  const y = 11, plan = new Plan(bp, y);
  corridor(plan, 32, 24, 34, 40); corridor(plan, 46, 24, 48, 40); corridor(plan, 7, 24, 73, 26); corridor(plan, 32, 38, 48, 40);
  corridor(plan, 39, 3, 41, 23); corridor(plan, 50, 3, 52, 23); corridor(plan, 39, 41, 41, 61);
  corridor(plan, 7, 13, 73, 15); corridor(plan, 7, 35, 31, 37); corridor(plan, 49, 35, 73, 37); corridor(plan, 7, 49, 73, 51);
  const rooms = [
    ['senator_office', 7, 3, 16, 12], ['senator_office', 18, 3, 27, 12], ['holo_meeting', 29, 3, 37, 12], ['restroom', 43, 3, 48, 12], ['senator_suite', 54, 3, 63, 12], ['senator_office', 65, 3, 73, 12],
    ['library', 7, 17, 20, 22], ['senator_office', 22, 17, 30, 22], ['guard_post', 32, 17, 37, 22], ['storage', 43, 17, 48, 22], ['lounge', 54, 17, 73, 22],
    ['senator_office', 7, 28, 17, 33], ['senator_office', 19, 28, 30, 33], ['executive_office', 50, 28, 61, 33], ['senator_office', 63, 28, 73, 33],
    ['holo_meeting', 7, 39, 18, 47], ['senator_suite', 20, 39, 30, 47], ['senator_suite', 50, 39, 61, 47], ['holo_meeting', 63, 39, 73, 47],
    ['archive', 22, 42, 37, 47], ['comms_room', 43, 42, 48, 47],
    ['senator_office', 7, 53, 16, 61], ['senator_office', 18, 53, 27, 61], ['senator_office', 29, 53, 37, 61], ['senator_office', 43, 53, 51, 61], ['senator_office', 53, 53, 62, 61], ['senator_office', 64, 53, 73, 61],
  ];
  for (const [k, x0, z0, x1, z1] of rooms) makeRoom(plan, rng, k, x0, z0, x1, z1, {});
  dressCorridors(plan);
}

// ------------------------------------------------------------------------------------------------ Chancellor's floor
// the whole top floor: the ring's south leg is the red antechamber with guard posts, the office fills the south half
// behind a curved steel-glass window wall that bows out over the facade; study, secretariat, dining, records and a
// Red Guard post around the rest of the ring
function chancellorFloor(bp, rng) {
  const y = TOP, plan = new Plan(bp, y);
  corridor(plan, RING.x0, RING.z0, RING.x1, RING.z0 + 2);
  corridor(plan, RING.x0, RING.z0 + 3, RING.x0 + 2, RING.z1 - 3); corridor(plan, RING.x1 - 2, RING.z0 + 3, RING.x1, RING.z1 - 3);
  // antechamber: five deep (z 38..42) between the core's south face and the office wall; waiting benches by the
  // lifts, Red Guard kiosks flanking the approach to the grand door, statues, directory totems, red carpet
  const az0 = RING.z1 - 2, az1 = OFFICE_ZN - 2;
  bp.fill(RING.x0, y, az0, RING.x1, y + 3, az1, AIR);
  paintFloor(bp, RING.x0, az0, RING.x1, az1, y - 1, 'red');
  for (let z = az0; z <= az1; z++) for (const x of [39, 40, 41, 42]) bp.set(x, y - 1, z, (z % 2) ? B.RED_WOOL : B.GOLD_BLOCK);
  plan.mark(RING.x0, az0, RING.x1, az1);
  for (let x = RING.x0; x <= RING.x1; x += 3) for (const z of [az0 + 1, az1 - 1]) bp.set(x, y + 4, z, (x % 2) ? GLOW : BLUE);
  statue(bp, 33, y, az1); statue(bp, 47, y, az1); statue(bp, 36, y, az1); statue(bp, 45, y, az1);
  guardKiosk(bp, 37, y, az1 - 1, 0, -1); guardKiosk(bp, 44, y, az1 - 1, 0, -1);
  totem(bp, 32, y, az1); totem(bp, 48, y, az1);
  for (const x of [33, 34, 46, 47]) bench(bp, x, y, az0);
  planter(bp, 32, y, az0, B.SPRUCE_LEAVES); planter(bp, 48, y, az0, B.SPRUCE_LEAVES);
  for (const x of [RING.x0 - 1, RING.x1 + 1]) for (const z of [az0 + 1, az1 - 1]) { bp.set(x, y + 1, z, RED); bp.set(x, y + 2, z, GLOW); bp.set(x, y, z, B.RED_WOOL); }
  bp.set(40, y + 3, az0 + 2, LANTERN); bp.set(41, y + 3, az0 + 2, LANTERN);
  bp.spot(40, y, az0 + 1, 'stand'); bp.spot(35, y, az1 - 1, 'stand');
  bp.room('antechamber', RING.x0 - 1, y, az0 - 1, RING.x1 + 1, az1 + 1);
  chancellorOffice(bp, rng);
  makeRoom(plan, rng, 'executive_office', 25, 28, 30, 40, { prefer: ['E'], floor: 'red' });
  makeRoom(plan, rng, 'open_plan_office', 50, 28, 55, 40, { prefer: ['W'] });
  makeRoom(plan, rng, 'guard_post', 25, 18, 36, 22, { prefer: ['S'], floor: 'red' });
  makeRoom(plan, rng, 'restaurant', 38, 18, 43, 22, { prefer: ['S'] });
  makeRoom(plan, rng, 'archive', 45, 18, 55, 22, { prefer: ['S'] });
  dressCorridors(plan);
}
const ARC_R = 32, ARC_CZ = 20;   // a gentle bow: z 49 at the office corners, 52 across the middle
const OFFICE_ZN = 44, OFFICE_X0 = 27, OFFICE_X1 = 53;   // office interior: first row z 44 (north wall at 43), x 27..53
const arcZ = (x) => Math.round(ARC_CZ + Math.sqrt(ARC_R * ARC_R - (x - 40.5) * (x - 40.5)));   // first wall cell of the window arc
function chancellorOffice(bp, rng) {
  const y = TOP, x0 = OFFICE_X0, x1 = OFFICE_X1, zN = OFFICE_ZN;
  for (let x = x0; x <= x1; x++) {
    const zw = arcZ(x), zi = zw - 1;
    const wz1 = Math.max(zw, (x > x0 ? arcZ(x - 1) : 0) - 1, (x < x1 ? arcZ(x + 1) : 0) - 1);
    bp.fill(x, y, zN, x, y + 3, zi, AIR);
    for (let z = zN; z <= wz1; z++) {
      const d = Math.hypot(x - 40.5, z - 47.5);
      const edge = x === x0 || x === x1 || z === zN;
      bp.set(x, y - 1, z, edge ? BLACK : (d > 2.2 && d < 3.4) ? B.GOLD_BLOCK : ((x + z) % 5 === 0 ? RED : B.RED_WOOL));
      bp.set(x, y + 4, z, ((x % 4 === 0) && (z % 3 === 0)) ? GLOW : (d > 5.5 && d < 6.6 ? BLUE : ((x + z) % 2 ? DARK : BLACK)));
    }
    // the curved window wall: steel glass between chrome mullions, chrome head, railing on the bay roof
    for (let z = zw; z <= wz1; z++) { bp.fill(x, y, z, x, y + 2, z, (x % 3 === 1) ? CHR : GLASS); bp.set(x, y + 3, z, CHR); bp.set(x, y + 4, z, CHR); bp.set(x, y + 5, z, BARS); }
    // corbelled underside where the bay hangs over the tier's south face
    if (wz1 > 47) for (let z = 48; z <= wz1; z++) { bp.set(x, y - 2, z, DARK); if (z <= wz1 - 1) bp.set(x, y - 3, z, STEEL); if (z <= wz1 - 2) bp.set(x, y - 4, z, DARK); if (z === 48) bp.set(x, y - 2, z, (x % 2) ? BLUE : DARK); }
  }
  // the bay's side walls where it projects past the tier's face (z 48 onwards)
  for (const [sx, dir] of [[x0 - 1, 1], [x1 + 1, -1]]) {
    for (let z = 48; z <= arcZ(sx + dir); z++) {
      bp.fill(sx, y, z, sx, y + 2, z, (z % 3 === 1) ? CHR : GLASS); bp.set(sx, y + 3, z, CHR); bp.set(sx, y + 4, z, CHR); bp.set(sx, y + 5, z, BARS);
      bp.set(sx, y - 1, z, BLACK); bp.set(sx, y - 2, z, DARK);
    }
  }
  // red north wall with chrome pilasters and gold-topped banners, the grand door in the middle
  for (let x = x0; x <= x1; x++) for (let yy = y; yy <= y + 3; yy++) bp.set(x, yy, zN - 1, (x % 4 === 0) ? CHR : (yy === y + 3 ? DARK : RED));
  for (const x of [29, 33, 47, 51]) { bp.fill(x, y, zN - 1, x, y + 2, zN - 1, B.RED_WOOL); bp.set(x, y + 3, zN - 1, B.GOLD_BLOCK); }
  doorway(bp, 39, zN - 1, 42, zN - 1, y, 3, B.GOLD_BLOCK);
  // the Chancellor's desk before the window with his chair, guest chairs and low tables, Red Guards inside the door
  bp.set(39, y, 49, B.TABLE); bp.set(40, y, 49, CONSOLE); bp.set(41, y, 49, CONSOLE); bp.set(42, y, 49, B.TABLE); bp.set(40, y + 1, 49, HOLO); bp.set(41, y + 1, 49, HOLO);
  bench(bp, 40, y, 50); bp.work(40, y, 50, 'chancellor'); bench(bp, 41, y, 50);
  bench(bp, 38, y, 47); bench(bp, 43, y, 47); bp.set(39, y, 46, B.TABLE); bp.set(42, y, 46, B.TABLE); bench(bp, 38, y, 45); bench(bp, 43, y, 45);
  guardKiosk(bp, 36, y, 45, 0, -1); guardKiosk(bp, 45, y, 45, 0, -1);
  // gilded statues on lit plinths along the walls, holo-table lounge west, dining/lounge east, plants
  for (const [sx, sz] of [[29, 46], [33, 49], [48, 49], [52, 46], [27, zN], [53, zN]]) { statue(bp, sx, y, sz); bp.set(sx, y - 1, sz, GLOW); }
  for (let x = 29; x <= 31; x++) bp.set(x, y, zN, BLACK); bp.set(30, y + 1, zN, HOLO); bp.set(29, y + 1, zN, CONSOLE); bp.set(31, y + 1, zN, HOLO);
  for (const [bx, bz] of [[28, zN], [32, zN], [29, zN + 1], [31, zN + 1]]) bench(bp, bx, y, bz);
  bp.set(50, y, zN, B.TABLE); bp.set(51, y, zN, B.TABLE); bench(bp, 49, y, zN); bench(bp, 52, y, zN); bench(bp, 50, y, zN + 1); bench(bp, 51, y, zN + 1); bp.set(50, y + 1, zN, LANTERN);
  planter(bp, 28, y, 48, B.SPRUCE_LEAVES); planter(bp, 52, y, 48, B.SPRUCE_LEAVES); planter(bp, 36, y, 51, B.OAK_LEAVES); planter(bp, 45, y, 51, B.OAK_LEAVES);
  bp.set(35, y, 48, B.SHELF); bp.set(35, y + 1, 48, HOLO); bp.set(46, y, 48, B.BOOKSHELF); bp.set(46, y + 1, 48, B.BOOKSHELF);
  for (const x of [34, 47]) bp.set(x, y + 3, 47, LANTERN);
  bp.set(40, y + 3, zN + 1, LANTERN); bp.set(41, y + 3, zN + 1, LANTERN);
  bp.spot(40, y, zN + 1, 'stand'); bp.spot(35, y, 47, 'stand'); bp.spot(46, y, 47, 'stand');
  bp.room('chancellor_office', x0 - 1, y, zN - 1, x1 + 1, 53);
}
// the roof of the top tier: core house for the stair and lifts, terrace furnishing, four corner pylons, the lit
// disc and glass dome that crown the tower
function coreHouse(bp) { bp.fill(CORE.x0, TOP + 5, CORE.z0, CORE.x1, TOP + 8, CORE.z1, BLACK); }
function crown(bp) {
  const y = TOP + 5, t = TIERS[3];   // 111 = roof walk level
  // core house dressing and cap
  for (let x = CORE.x0; x <= CORE.x1; x++) for (let z = CORE.z0; z <= CORE.z1; z++) {
    const edge = x === CORE.x0 || x === CORE.x1 || z === CORE.z0 || z === CORE.z1;
    if (edge && bp.get(x, y + 1, z) === BLACK && (x + z) % 3 === 0) bp.set(x, y + 1, z, BLUE);
    if (edge && bp.get(x, y + 2, z) === BLACK && (x + z) % 4 === 0) bp.set(x, y + 2, z, B.WINDOW_LIT);
  }
  // disc over the house (r 10.5 around the core centre, lit rim, blue ring) and the glass dome (the height budget
  // ends at y 120, so the dome is 4 high)
  for (let x = 29; x <= 52; x++) for (let z = 21; z <= 44; z++) {
    const d = Math.hypot(x - 40.5, z - 32.5);
    if (d > 10.5) continue;
    bp.set(x, y + 4, z, d > 9.5 ? CHR : ((x + z) % 3 === 0 ? BLUE : DARK));
    bp.set(x, y + 5, z, d > 9.5 ? ((x + z) % 2 ? GLOW : CHR) : (d > 7.5 && d <= 8.5 ? BLUE : ((x % 4 === 0 || z % 4 === 0) ? DARK : PLATE)));
    if (d <= 5.5) {
      const h = Math.min(4, Math.max(1, Math.round(Math.sqrt(30.25 - d * d))));
      bp.set(x, y + 5 + h, z, d < 1.2 ? BLUE : GLASS);
      if (d > 4.3) for (let yy = y + 6; yy < y + 5 + h; yy++) bp.set(x, yy, z, ((x + z) % 3) ? GLASS : CHR);
    }
  }
  bp.fill(40, y + 6, 32, 41, y + 8, 33, GLOW);
  for (const [px, pz] of [[33, 32], [48, 32], [40, 25], [40, 40]]) { bp.set(px, y + 6, pz, CHR); bp.set(px, y + 7, pz, BLUE); }   // beacons on the disc
  // the office bay's roof carries its own parapet; drop the terrace railing where it would cross the bay
  for (let x = OFFICE_X0; x <= OFFICE_X1; x++) if (arcZ(x) >= 48) bp.set(x, y, 47, AIR);
  // corner pylons
  for (const [px, pz] of [[t.x0 + 1, t.z0 + 1], [t.x1 - 2, t.z0 + 1], [t.x0 + 1, t.z1 - 2], [t.x1 - 2, t.z1 - 2]]) {
    bp.fill(px, y, pz, px + 1, y + 6, pz + 1, STEEL); bp.fill(px, y + 7, pz, px + 1, y + 7, pz + 1, BLUE);
    for (let yy = y + 1; yy <= y + 5; yy += 2) { bp.set(px, yy, pz, DARK); bp.set(px + 1, yy, pz + 1, DARK); }
  }
  // terrace: planters and benches along the parapet, lamps, vents, holo pylons; the roof itself is painted by roofTerrace
  for (let x = t.x0 + 3; x <= t.x1 - 3; x += 2) for (const z of [t.z0 + 1, t.z1 - 1]) {
    if (x % 8 === 0) lampPost(bp, x, y, z, 2, LAMP); else if (x % 8 === 4) bench(bp, x, y, z + (z < 32 ? 1 : -1)); else planter(bp, x, y, z, (x % 3) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
  }
  for (let z = t.z0 + 3; z <= t.z1 - 3; z += 2) for (const x of [t.x0 + 1, t.x1 - 1]) {
    if (z % 8 === 0) lampPost(bp, x, y, z, 2, LAMP); else if (z % 8 === 4) bench(bp, x + (x < 40 ? 1 : -1), y, z); else planter(bp, x, y, z, (z % 3) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
  }
  for (let x = CORE.x0 - 2; x <= CORE.x1 + 2; x += 2) for (const z of [CORE.z0 - 2, CORE.z1 + 2]) { if (bp.isAir(x, y, z)) { bp.set(x, y, z, (x % 4) ? B.VENT : BLACK); if (x % 4 === 0) bp.set(x, y + 1, z, HOLO); } }
  for (let z = CORE.z0; z <= CORE.z1; z += 2) for (const x of [CORE.x0 - 2, CORE.x1 + 2]) { if (bp.isAir(x, y, z) && !(x === CORE.x0 - 2 && (z === 30 || z === 31))) bp.set(x, y, z, B.VENT); }
  for (const [tx, tz] of [[28, 24], [52, 24], [28, 40], [52, 40]]) { bp.set(tx, y, tz, B.TABLE); for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bench(bp, tx + dx, y, tz + dz); }
  bp.room('roof_terrace', t.x0, y, t.z0, t.x1, t.z1);
}

// ------------------------------------------------------------------------------------------------ sky lobby (y 36)
// the boulevard-level lobby behind the approach deck: reception desk, Senate Guard kiosks, statues, planters
function skyLobby(plan, rng) {
  const bp = plan.bp, y = plan.y, x0 = 30, x1 = 50, z0 = 52, z1 = 57;
  bp.fill(x0, y, z0, x1, y + 3, z1, AIR);
  paintFloor(bp, x0, z0, x1, z1, y - 1, 'stone');
  for (let z = z0; z <= z1; z++) for (const x of [40, 41]) bp.set(x, y - 1, z, (z % 3 === 0) ? GLOW : B.RED_WOOL);
  for (let x = x0; x <= x1; x += 3) for (let z = z0 + 1; z <= z1; z += 4) bp.set(x, y + 4, z, GLOW);
  dressWalls(bp, x0, z0, x1, z1, y, 4);
  plan.mark(x0, z0, x1, z1);
  // entrance in the south face and the wide opening to the corridor
  doorway(bp, 39, z1 + 1, 42, z1 + 1, y, 3, GLOW); bp.door(40, y, z1 + 1, 'S');
  // the north wall is a chrome colonnade: the lobby reads as one hall with the ring corridor behind it
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    if (x % 4 === 1) { bp.fill(x, y, z0 - 1, x, y + 2, z0 - 1, CHR); bp.set(x, y + 3, z0 - 1, BLUE); continue; }
    bp.fill(x, y, z0 - 1, x, y + 2, z0 - 1, AIR); bp.set(x, y + 3, z0 - 1, (x % 2) ? GLOW : DARK);
  }
  for (let x = 36; x <= 45; x++) { bp.set(x, y, 54, BLACK); bp.set(x, y + 1, 54, (x === 40 || x === 41) ? CONSOLE : SLAB); }
  bp.set(35, y, 54, CHR); bp.set(46, y, 54, CHR); bp.set(35, y + 1, 54, BLUE); bp.set(46, y + 1, 54, BLUE);
  for (const x of [38, 43]) { bp.set(x, y, 53, SLAB); bp.work(x, y, 53, 'receptionist'); }
  bp.set(40, y + 2, 53, HOLO); bp.set(41, y + 2, 53, HOLO);
  guardKiosk(bp, 36, y, 56, 0, 1); guardKiosk(bp, 45, y, 56, 0, 1);
  for (const [sx, sz] of [[31, 53], [31, 56], [49, 53], [49, 56]]) statue(bp, sx, y, sz);
  planter(bp, 33, y, 57, B.SPRUCE_LEAVES); planter(bp, 47, y, 57, B.SPRUCE_LEAVES);
  for (const x of [33, 34, 46, 47]) bench(bp, x, y, 52);
  totem(bp, 32, y, 52); totem(bp, 48, y, 52);
  bp.room('sky_lobby', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}

// ------------------------------------------------------------------------------------------------ landing platform
// the approach deck (y 35) from the tower's south face to the disc, on a stalk, with lit edge rows and railings
function approachDeck(bp) {
  const y = DECK_Y, z0 = 59, z1 = 79;
  for (let z = z0; z <= z1; z++) for (let x = 35; x <= 46; x++) {
    const edge = x === 35 || x === 46;
    bp.set(x, y, z, edge ? ((z % 3 === 0) ? GLOW : CHR) : ((x === 40 || x === 41) ? B.RED_WOOL : ((z % 4 === 0) ? DARK : PLATE)));
    if (edge) bp.set(x, y + 1, z, BARS);
    if (x >= 36 && x <= 45) bp.set(x, y - 1, z, DARK);
    if (x >= 38 && x <= 43) bp.set(x, y - 2, z, (z % 3) ? STEEL : BLUE);
  }
  for (let z = z0 + 2; z <= z1; z += 6) for (const x of [35, 46]) { bp.set(x, y + 2, z, BARS); bp.set(x, y + 3, z, LAMP); }
  // red Senate banners on chrome poles between the lamps, statues flanking the sky lobby door, benches, planters
  for (let z = z0 + 5; z <= z1 - 2; z += 6) for (const x of [35, 46]) { bp.fill(x, y + 2, z, x, y + 5, z, CHR); const bx = x === 35 ? 36 : 45; bp.set(bx, y + 5, z, B.RED_WOOL); bp.set(bx, y + 4, z, B.RED_WOOL); bp.set(bx, y + 3, z, B.GOLD_BLOCK); }
  statue(bp, 37, y + 1, z0 + 1); statue(bp, 44, y + 1, z0 + 1);
  for (const x of [36, 45]) { bench(bp, x, y + 1, z0 + 3); planter(bp, x, y + 1, z0 + 5, B.SPRUCE_LEAVES); bench(bp, x, y + 1, z0 + 11); planter(bp, x, y + 1, z0 + 13, B.OAK_LEAVES); }
  // stalk under the deck and the chrome props on the podium roof edge
  bp.fill(38, 1, 68, 43, 32, 71, DARK);
  for (let yy = 1; yy <= 32; yy++) for (const [cx, cz] of [[38, 68], [43, 68], [38, 71], [43, 71]]) bp.set(cx, yy, cz, (yy % 5 === 0) ? BLUE : CHR);
  bp.fill(37, 1, 67, 44, 6, 72, DARK); for (const z of [67, 72]) for (let x = 38; x <= 43; x += 2) bp.set(x, 2, z, BLUE), bp.set(x, 5, z, B.VENT);
  bp.fill(37, 33, 67, 44, 33, 72, STEEL);
  for (const x of [36, 45]) { bp.fill(x, 16, 61, x, 33, 61, CHR); bp.set(x, 25, 61, BLUE); bp.fill(x, 33, 60, x, 33, 62, STEEL); }
  bp.room('approach_deck', 34, y + 1, z0 - 1, 47, z1 + 1);
}
// the disc pavilion: lit rim rows, railing with lamps, the landing pad with its markings, the stalk with the lift and
// the helix stair wrapped around it, an annular glass canopy on chrome posts, a parked Senate shuttle
function discPavilion(bp) {
  const y = DECK_Y, cx = 40.5, cz = 90.5, R = 12.5;
  const dist = (x, z) => Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
  for (let x = 28; x <= 53; x++) for (let z = 78; z <= 103; z++) {
    const d = dist(x, z);
    if (d > R) continue;
    const join = (z <= 81 && x >= 36 && x <= 45) || (z >= 100 && x >= 38 && x <= 43);   // approach deck / gangway joins
    if (d > R - 1 && !join) { bp.set(x, y, z, ((x + z) % 3 === 0) ? GLOW : CHR); bp.set(x, y + 1, z, BARS); }
    else if (d > 8.5) bp.set(x, y, z, (d > 9.5 && d <= 10.5 && (x + z) % 2 === 0) ? BLUE : ((x % 4 === 0 || z % 4 === 0) ? DARK : PLATE));
    else bp.set(x, y, z, (d > 7.5) ? GLOW : ((x === 40 || x === 41 || z === 90 || z === 91) && (x + z) % 2 === 0 ? GLOW : ((x + z) % 2 ? BLACK : DARK)));
    // underside: dark plate with blue light rows, radial ribs and a ring
    bp.set(x, y - 1, z, (d > R - 1.5 && (x + z) % 3 === 0) ? BLUE : DARK);
    const a = Math.atan2(z + 0.5 - cz, x + 0.5 - cx), rib = Math.abs(((a / (Math.PI / 4)) + 0.5) % 1 - 0.5) < 0.08;
    if ((rib && d > 2) || (d > 10.5 && d <= 11.5)) bp.set(x, y - 2, z, STEEL);
  }
  // railing lamps
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; const x = Math.round(cx - 0.5 + Math.cos(a) * (R - 0.6)), z = Math.round(cz - 0.5 + Math.sin(a) * (R - 0.6)); bp.set(x, y + 2, z, BARS); bp.set(x, y + 3, z, (k % 2) ? LAMP : BLUE); }
  // stalk: 4x4 housing from the ground to the pad with the lift inside; doors south at the ground, north at the pad
  bp.fill(39, 1, 89, 42, y + 4, 92, DARK);
  for (let yy = 1; yy <= y + 3; yy++) for (const [sx, sz] of [[39, 89], [42, 89], [39, 92], [42, 92]]) bp.set(sx, yy, sz, (yy % 5 === 0) ? BLUE : BLACK);
  bp.fill(39, y + 5, 89, 42, y + 5, 92, STEEL); bp.set(40, y + 5, 90, BLUE); bp.set(41, y + 5, 91, BLUE);
  bp.fill(40, 1, 90, 41, y + 3, 91, AIR);
  bp.lift(40, 90, 1, y + 1);
  bp.fill(40, 1, 92, 41, 3, 92, AIR); bp.set(39, 3, 92, BLUE); bp.set(42, 3, 92, BLUE);
  bp.fill(40, y + 1, 89, 41, y + 3, 89, AIR); bp.set(39, y + 3, 89, BLUE); bp.set(42, y + 3, 89, BLUE);
  bp.set(40, y + 2, 92, HOLO); bp.set(41, y + 2, 92, HOLO);
  // helix stair around the stalk: ring x 37..44 / z 87..94, half a block per outer cell, 14 blocks per loop, starting
  // at the south (by the ground-level lift door) and arriving on the pad north of the housing after 2.5 turns
  const helixF = (x, z) => { const a = Math.atan2(z + 0.5 - cz, x + 0.5 - cx); return (((a - Math.PI / 2) / (2 * Math.PI)) % 1 + 1) % 1; };
  const carve = new Map();
  for (let x = 37; x <= 44; x++) for (let z = 87; z <= 94; z++) {
    if (x >= 39 && x <= 42 && z >= 89 && z <= 92) continue;
    const f = helixF(x, z);
    let top = 0;
    for (let k = 0; k < 3; k++) {
      const s = Math.round((1 + 14 * (f + k)) * 2) / 2;
      if (s >= y + 1) continue;
      tread(bp, x, z, s, PLATE); top = s;
    }
    if (top >= 31.5) carve.set(x * 200 + z, top);
  }
  // head room through the pad where the last treads pass under it, railing around the resulting opening
  for (const [key, s] of carve) { const x = Math.floor(key / 200), z = key % 200; bp.fill(x, Number.isInteger(s) ? s : Math.floor(s) + 1, z, x, y, z, AIR); }
  for (const [key] of carve) {
    const x = Math.floor(key / 200), z = key % 200;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (carve.has(nx * 200 + nz) || (nx >= 39 && nx <= 42 && nz >= 89 && nz <= 92) || !bp.isAir(nx, y + 1, nz) || bp.isAir(nx, y, nz)) continue;
      bp.set(nx, y + 1, nz, BARS);
    }
  }
  // outer railing of the helix (ring x 36..45 / z 86..95) following the treads, lanterns on some posts
  for (let x = 36; x <= 45; x++) for (let z = 86; z <= 95; z++) {
    if (x > 36 && x < 45 && z > 86 && z < 95) continue;
    const f = helixF(x, z);
    for (let k = 0; k < 3; k++) { const s = Math.round((1 + 14 * (f + k)) * 2) / 2, yy = Math.ceil(s); if (yy < y - 2) { bp.set(x, yy, z, BARS); if ((x + z) % 5 === 0) bp.set(x, yy + 1, z, LANTERN); } }
  }
  // canopy over the stalk: eight chrome posts, a dark saucer roof with a lit rim and a steel-glass dome, so the
  // pavilion reads as the saucer of the reference while the outer ring of the pad stays open for shuttles
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + k * Math.PI / 4;
    const px = Math.round(cx - 0.5 + Math.cos(a) * 6.8), pz = Math.round(cz - 0.5 + Math.sin(a) * 6.8);
    bp.fill(px, y + 1, pz, px, y + 6, pz, DARK); bp.set(px, y + 4, pz, BLUE);
  }
  for (let x = 32; x <= 49; x++) for (let z = 82; z <= 99; z++) {
    const d = dist(x, z);
    if (d > 8) continue;
    if (d > 4.5) { bp.set(x, y + 7, z, d > 7 ? ((x + z) % 3 === 0 ? BLUE : DARK) : ((x + z) % 2 ? DARK : BLACK)); if (d > 6 && (x + z) % 6 === 2) bp.set(x, y + 6, z, BLUE); continue; }
    const h = Math.max(1, Math.round(Math.sqrt(20.25 - d * d)) - 1);
    bp.set(x, y + 7 + h, z, d < 1.2 ? BLUE : GLASS);
    if (d > 3.4) for (let yy = y + 7; yy < y + 7 + h; yy++) bp.set(x, yy, z, ((x + z) % 3) ? GLASS : DARK);
    else bp.set(x, y + 7, z, (x + z) % 2 ? DARK : BLACK);
  }
  bp.fill(40, y + 8, 90, 41, y + 9, 91, BLUE);
  // the Senate shuttle docked at the east rim, nose over the pad, boarding ramp down onto the deck
  bp.fill(49, y + 2, 89, 58, y + 4, 92, STEEL); bp.fill(50, y + 3, 90, 57, y + 3, 91, AIR);
  bp.fill(49, y + 2, 89, 49, y + 2, 92, DARK); bp.fill(49, y + 3, 90, 49, y + 3, 91, GLASS);          // nose and cockpit
  bp.fill(59, y + 3, 90, 59, y + 3, 91, BLUE); bp.fill(59, y + 2, 89, 59, y + 4, 89, DARK); bp.fill(59, y + 2, 92, 59, y + 4, 92, DARK);   // engines
  bp.fill(52, y + 3, 88, 56, y + 3, 88, STEEL); bp.fill(52, y + 3, 93, 56, y + 3, 93, STEEL); bp.set(56, y + 3, 88, BLUE); bp.set(56, y + 3, 93, BLUE);   // wings
  bp.fill(54, y + 5, 90, 57, y + 5, 91, DARK); bp.fill(56, y + 6, 90, 57, y + 6, 91, DARK); bp.set(57, y + 7, 90, BLUE);   // swept fin
  for (const gz of [88, 93]) { bp.set(50, y + 1, gz, BARS); bp.set(50, y + 2, gz, STEEL); bp.set(50, y + 3, gz, BLUE); }   // mooring beacons
  bp.set(47, y + 1, 90, SLAB); bp.set(47, y + 1, 91, SLAB); bp.set(48, y + 1, 90, PLATE); bp.set(48, y + 1, 91, PLATE);
  bp.spot(46, y + 1, 90, 'stand'); bp.work(36, y + 1, 96, 'deck officer');
  // benches and holo totems on the pad's west half
  for (const [bx, bz] of [[33, 88], [33, 93], [35, 84], [35, 97]]) bench(bp, bx, y + 1, bz);
  totem(bp, 31, y + 1, 90); totem(bp, 40, y + 1, 99); planter(bp, 34, y + 1, 86, B.SPRUCE_LEAVES); planter(bp, 34, y + 1, 95, B.SPRUCE_LEAVES);
  bp.room('landing_pavilion', 27, y + 1, 77, 54, 104);
  // link to the boulevard gangway on the front door column
  for (let z = 103; z <= bp.d - 1; z++) for (let x = 37; x <= 44; x++) { if (dist(x, z) <= R) continue; bp.set(x, y, z, (x === 37 || x === 44) ? CHR : PLATE); if (x === 37 || x === 44) bp.set(x, y + 1, z, BARS); }
  for (const x of [39, 42]) { bp.fill(x, y + 1, bp.d - 1, x, y + 3, bp.d - 1, DARK); bp.set(x, y + 4, bp.d - 1, BLUE); }
  bp.fill(40, y + 4, bp.d - 1, 41, y + 4, bp.d - 1, GLOW); bp.set(37, y + 3, 104, LANTERN); bp.set(44, y + 3, 104, LANTERN); bp.set(37, y + 2, 104, BARS); bp.set(44, y + 2, 104, BARS);
  bp.fill(40, y + 1, bp.d - 1, 41, y + 3, bp.d - 1, AIR);
  bp.door(DOOR_X, y + 1, bp.d - 1, 'S');
}
// ------------------------------------------------------------------------------------------------ forecourt
// ceremonial avenue from the gate to the portico: red carpets, statue rows, lamps, planters, a reflecting pool
// between the two stalks, garden squares with ring pools east and west, pavements around the podium
function forecourt(bp) {
  const y = 1;
  for (let z = 63; z <= bp.d - 1; z++) for (const x of [33, 34, 47, 48]) bp.set(x, 0, z, B.RED_WOOL);
  for (let z = 64; z <= 104; z += 2) for (const x of [31, 50]) bp.set(x, 0, z, GLOW);
  for (let z = 66; z <= 102; z += 6) { statue(bp, 29, y, z); statue(bp, 52, y, z); }
  for (let z = 69; z <= 105; z += 6) { lampPost(bp, 27, y, z, 3, LAMP); lampPost(bp, 54, y, z, 3, LAMP); planter(bp, 29, y, z, (z % 4) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); planter(bp, 52, y, z, (z % 4) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); }
  // reflecting pool on the axis between the deck stalk and the disc stalk
  bp.fill(36, 0, 74, 45, 0, 84, B.WATER); bp.walls(36, 0, 74, 45, 0, 84, CHR);
  for (let z = 75; z <= 83; z += 2) { bp.set(36, y, z, BARS); bp.set(45, y, z, BARS); }
  bp.set(40, 0, 79, GLOW); bp.set(41, 0, 79, GLOW);
  // garden squares with ring pools
  for (const gx of [16, 65]) {
    for (let x = gx - 8; x <= gx + 8; x++) for (let z = 76; z <= 92; z++) {
      const d = Math.hypot(x - gx, z - 84);
      if (d <= 4) bp.set(x, 0, z, d <= 1.5 ? CHR : B.WATER);
      else if (d <= 5) bp.set(x, 0, z, CHR);
      else if (d <= 8 && (Math.round(d) === 7) && (x + z) % 2 === 0) planter(bp, x, y, z, B.OAK_LEAVES);
      else if (d <= 8 && Math.round(d) === 6 && (x + z) % 3 === 0) bench(bp, x, y, z);
    }
    bp.set(gx, y, 84, CHR); bp.set(gx, y + 1, 84, GLOW);
    for (const [lx, lz] of [[gx - 7, 77], [gx + 7, 77], [gx - 7, 91], [gx + 7, 91]]) lampPost(bp, lx, y, lz, 3, LAMP);
    bp.room('garden', gx - 9, y, 75, gx + 9, 93);
  }
  // pavements around the podium and along the lot edges
  for (let z = 2; z <= 62; z += 4) for (const x of [2, 78]) { if (z % 12 === 2) lampPost(bp, x, y, z, 3, LAMP); else planter(bp, x, y, z, (z % 8) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); }
  for (let x = 8; x <= 72; x += 4) { if (x >= 36 && x <= 45) continue; if (x % 16 === 8) lampPost(bp, x, y, 0, 3, LAMP); else planter(bp, x, y, 0, B.SPRUCE_LEAVES); }   // nothing in the rear door's approach
  for (let x = 8; x <= 72; x += 8) for (const z of [64, 100]) if (x < 26 || x > 55) { totem(bp, x, y, z); }
  // rear door canopy
  bp.fill(38, 4, 0, 43, 4, 1, STEEL); bp.set(40, 4, 1, GLOW); bp.set(41, 4, 1, GLOW); for (const x of [38, 43]) bp.fill(x, 1, 1, x, 3, 1, CHR);
}

// ------------------------------------------------------------------------------------------------ facade + roofs
// paints the four faces of a tier: chrome slab bands, durasteel pilasters every 4, glass where a room is behind
// (lit window blocks elsewhere), dark heads with blue accents, stone-brick corners
function facade(bp, tier) {
  const { x0, x1, z0, z1, y0, y1 } = tier;
  const paint = (x, y, z, u, len, inX, inZ) => {
    if (bp.get(x, y, z) !== STONE) return;    // only the raw shell: doors, frames and the office's window wall stay
    const r = (y - (y0 - 1)) % 5;
    let id;
    if (r === 0) id = (u % 8 === 0) ? BLUE : CHR;
    else if (u === 0 || u === len - 1) id = BRICK;
    else if (u % 4 === 0) id = STEEL;
    else if (r === 2 || r === 3) id = bp.isAir(inX, y, inZ) ? GLASS : ((u % 2) ? B.WINDOW_LIT : STONE);
    else if (r === 4) id = (u % 8 === 2) ? BLUE : DARK;
    else id = STONE;
    bp.set(x, y, z, id);
  };
  for (let y = y0 - 1; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) { paint(x, y, z0, x - x0, x1 - x0 + 1, x, z0 + 1); paint(x, y, z1, x - x0, x1 - x0 + 1, x, z1 - 1); }
    for (let z = z0 + 1; z < z1; z++) { paint(x0, y, z, z - z0, z1 - z0 + 1, x0 + 1, z); paint(x1, y, z, z - z0, z1 - z0 + 1, x1 - 1, z); }
  }
}
// the roof of a tier outside the footprint of the next: deck plate terrace, railing, planters, lamps, vents
function roofTerrace(bp, tier, next) {
  const y = tier.y1, w = y + 1;
  for (let x = tier.x0; x <= tier.x1; x++) for (let z = tier.z0; z <= tier.z1; z++) {
    if (next && x >= next.x0 && x <= next.x1 && z >= next.z0 && z <= next.z1) continue;
    const edge = x === tier.x0 || x === tier.x1 || z === tier.z0 || z === tier.z1;
    if (!isEmit(bp.get(x, y, z))) bp.set(x, y, z, edge ? CHR : ((x % 4 === 0 || z % 4 === 0) ? DARK : PLATE));   // room ceiling lights show as lit deck tiles
    if (edge) bp.set(x, w, z, BARS);
  }
  if (!next) return;
  // furnishing rings just inside the railing
  for (let x = tier.x0 + 2; x <= tier.x1 - 2; x += 2) for (const z of [tier.z0 + 1, tier.z1 - 1]) {
    if (x >= next.x0 - 1 && x <= next.x1 + 1 && z >= next.z0 - 1 && z <= next.z1 + 1) continue;
    if (x % 8 === 0) lampPost(bp, x, w, z, 2, LAMP); else if (x % 8 === 4) bench(bp, x, w, z + (z < 40 ? 1 : -1)); else planter(bp, x, w, z, (x % 3) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
  }
  for (let z = tier.z0 + 2; z <= tier.z1 - 2; z += 2) for (const x of [tier.x0 + 1, tier.x1 - 1]) {
    if (x >= next.x0 - 1 && x <= next.x1 + 1 && z >= next.z0 - 1 && z <= next.z1 + 1) continue;
    if (z % 8 === 0) lampPost(bp, x, w, z, 2, LAMP); else if (z % 8 === 4) bench(bp, x + (x < 40 ? 1 : -1), w, z); else planter(bp, x, w, z, (z % 3) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
  }
  // vents and blue light strips along the next tier's base
  for (let x = next.x0 + 2; x <= next.x1 - 2; x += 3) { bp.set(x, w, next.z0 - 1, (x % 2) ? B.VENT : BLUE); bp.set(x, w, next.z1 + 1, (x % 2) ? B.VENT : BLUE); }
  for (let z = next.z0 + 2; z <= next.z1 - 2; z += 3) { bp.set(next.x0 - 1, w, z, (z % 2) ? B.VENT : BLUE); bp.set(next.x1 + 1, w, z, (z % 2) ? B.VENT : BLUE); }
}
// terrace doors from the corridor corner bays of the tier above onto the setback terraces
function terraceDoors(bp, tier, lower) {
  const y = tier.y0;
  const { x0, x1, z0, dz } = tier;
  doorway(bp, x0, z0 + dz, x0, z0 + dz + 1, y, 3, BLUE); doorway(bp, x1, z0 + dz, x1, z0 + dz + 1, y, 3, BLUE);
  const zs = tier.z1 - dz - 2;
  doorway(bp, x0, zs, x0, zs + 1, y, 3, BLUE); doorway(bp, x1, zs, x1, zs + 1, y, 3, BLUE);
  const rooms = [[lower.x0, lower.z0, x0 - 1, lower.z1], [x1 + 1, lower.z0, lower.x1, lower.z1], [x0, lower.z0, x1, z0 - 1], [x0, tier.z1 + 1, x1, lower.z1]];
  for (const [a, b, c, d] of rooms) bp.room('roof_terrace', a, y, b, c, d);
}

// ------------------------------------------------------------------------------------------------ entrances + site
function entrances(bp, lot) {
  // ground entrance: a 6-wide, 5-high portal in the podium's south face with a chrome portico
  doorway(bp, 37, 62, 44, 62, 1, 5, GLOW);
  for (const x of [35, 46]) { bp.fill(x, 1, 64, x, 8, 64, CHR); bp.fill(x, 1, 66, x, 8, 66, CHR); }
  bp.fill(34, 8, 63, 47, 8, 66, STEEL); for (let x = 35; x <= 46; x += 2) bp.set(x, 8, 65, GLOW); bp.fill(34, 9, 63, 47, 9, 66, CHR);
  for (let x = 36; x <= 45; x++) { bp.set(x, 5, 63, BLUE); }
  bp.door(40, 1, 62, 'S');
  // the lot's front gate (undercity door) and the boulevard-level door on the same column
  const gz = bp.d - 1;
  for (const x of [38, 43]) { bp.fill(x, 1, gz, x, 7, gz, CHR); bp.set(x, 8, gz, BLUE); }
  bp.fill(39, 4, gz, 42, 4, gz, GLOW); bp.fill(39, 5, gz, 42, 6, gz, STEEL); bp.set(40, 6, gz, HOLO); bp.set(41, 6, gz, HOLO);
  bp.fill(39, 1, gz, 39, 3, gz, CHR); bp.fill(42, 1, gz, 42, 3, gz, CHR);
  bp.fill(40, 1, gz, 41, 3, gz, AIR);
  bp.door(DOOR_X, 1, gz, 'S');
}

export const LANDMARK = {
  id: 'chancellery', name: 'Senate Office Building', span: [2, 2], height: 120, minW: 81, minD: 107,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Senate Office Building';
    // ground paving over the whole lot
    for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) bp.set(x, 0, z, ((x % 6 === 0) || (z % 6 === 0)) ? BRICK : ((x + z) % 2 ? PLASTER : STONE));
    // solid tier masses (rooms are carved from them, walls are what remains)
    for (const t of TIERS) bp.fill(t.x0, t.y0 - 1, t.z0, t.x1, t.y1, t.z1, STONE);
    // floors: podium, tower floors (the boulevard-level floor carries the sky lobby behind the landing platform),
    // the Chancellor's floor on top
    podiumGround(bp, rng); podiumMezzanine(bp, rng); podiumTop(bp, rng);
    for (let ti = 1; ti < TIERS.length; ti++) for (const y of TIERS[ti].floors) {
      if (y === DECK_Y + 1) towerFloor(bp, rng, TIERS[ti], y, { southSkip: [30, 50], after: (plan) => skyLobby(plan, rng) });
      else towerFloor(bp, rng, TIERS[ti], y);
    }
    chancellorFloor(bp, rng);
    // skins, setbacks, terraces (before the core: the top roof slab must not close the stair up to the roof)
    for (let ti = 0; ti < TIERS.length; ti++) { facade(bp, TIERS[ti]); roofTerrace(bp, TIERS[ti], TIERS[ti + 1] || null); }
    for (let ti = 1; ti < TIERS.length; ti++) terraceDoors(bp, TIERS[ti], TIERS[ti - 1]);
    // the core through every level up to the roof exit in the core house, then the crown
    coreHouse(bp);
    const levels = [];
    for (const t of TIERS) levels.push(...t.floors);
    levels.push(TOP, TOP + 5);
    core(bp, levels);
    crown(bp);
    // the landing platform, the forecourt, the doors
    approachDeck(bp); discPavilion(bp); forecourt(bp);
    entrances(bp, lot);
    bp.meta.lobby = { x: bp.wx(40), y: bp.wy(1), z: bp.wz(52) };
    bp.meta.floors = [...levels, DECK_Y + 1].map((y) => bp.wy(y));
  },
};
