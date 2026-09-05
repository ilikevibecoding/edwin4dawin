// Jedi Temple (docs/rubrics/06_landmarks.md): a three-tier ziggurat in warm stone topped by five spires, with the
// Great Hall / Processional Way, the central rotunda, the Room of a Thousand Fountains, the temple hangar, the
// Archives, dojos, classrooms, quarters, refectory, medical bay, communications centre, the Council Chamber at the
// top of the south-west spire and the Tranquility Spire's summit deck. Everything is a pure function of the lot and
// ctx.rng. Local coordinates: x 0..167, z 0..168, y 0 = plateau top (repaved), walk level y 1; the front is the
// south (+z) edge, the boulevard deck outside the lot is at y 35 (walk 36).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
// tiers: [x0, z0, x1, z1, wall y0, wall y1] (roof slab at y1 + 1)
const T1 = { x0: 6, z0: 6, x1: 161, z1: 162, y0: 1, y1: 24, roof: 25 };
const T2 = { x0: 20, z0: 20, x1: 147, z1: 148, y0: 26, y1: 44, roof: 45 };
const T3 = { x0: 34, z0: 34, x1: 133, z1: 134, y0: 46, y1: 60, roof: 61 };
const CX = 84, CZ = 84;                     // rotunda / central spire axis
const ROT_R = 16;                           // rotunda radius (interior)
const SPIRE = 14;                           // corner spire footprint
const CORNERS = [[40, 40], [114, 40], [40, 114], [114, 114]];   // corner spire origins (x, z)
const CENTRAL = { x0: 74, z0: 74, x1: 93, z1: 93 };
const FLOOR_H = 5;

// palette
const STONE = B.SANDSTONE, STONE2 = B.SMOOTH_STONE, BAND = B.STONE_BRICKS, TRIM = B.CHROME, PLATE = B.DECK_PLATE;
const DARK = B.DURASTEEL_DARK, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, GLASS = B.STEEL_GLASS, GOLD = B.GOLD_BLOCK;

// ------------------------------------------------------------------------------------------------ helpers
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const dist = (x, z) => Math.hypot(x + 0.5 - (CX + 0.5), z + 0.5 - (CZ + 0.5));
const inCorner = (x, z) => CORNERS.some(([cx, cz]) => x >= cx && x < cx + SPIRE && z >= cz && z < cz + SPIRE);
const inCentral = (x, z) => inRect(CENTRAL, x, z);

// solid box with an interior carved to air and a ceiling slab; returns nothing (rooms furnish afterwards)
function hollow(bp, x0, y0, z0, x1, y1, z1, wall, floor, ceil) {
  bp.fill(x0, y0 - 1, z0, x1, y0 - 1, z1, floor);
  bp.fill(x0, y0, z0, x1, y1, z1, AIR);
  bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, ceil);
  bp.walls(x0, y0, z0, x1, y1, z1, wall);
}
// 2-wide doorway (3 high) through a wall running along x (z0 === z1) or along z, with chrome jambs and a lit lintel
function doorway(bp, x0, z0, x1, z1, y0, h = 3, lintel = GLOW) {
  bp.fill(x0, y0, z0, x1, y0 + h - 1, z1, AIR);
  if (z0 === z1) { bp.fill(x0 - 1, y0, z0, x0 - 1, y0 + h, z0, TRIM); bp.fill(x1 + 1, y0, z0, x1 + 1, y0 + h, z0, TRIM); bp.fill(x0, y0 + h, z0, x1, y0 + h, z0, lintel); }
  else { bp.fill(x0, y0, z0 - 1, x0, y0 + h, z0 - 1, TRIM); bp.fill(x0, y0, z1 + 1, x0, y0 + h, z1 + 1, TRIM); bp.fill(x0, y0 + h, z0, x0, y0 + h, z1, lintel); }
}
// half-step stair along +z or -z (dz) from walk level y0 up n full blocks: alternating slab / full block on a solid base
function stairZ(bp, x0, x1, z0, dz, y0, n) {
  const steps = n * 2;
  for (let k = 1; k <= steps; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2;
    const yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) {
      bp.fill(x, y0 - 1, z, x, slab ? yTop - 1 : yTop - 1, z, DARK);
      bp.set(x, slab ? yTop : yTop, z, slab ? B.STONE_BRICK_SLAB : STONE2);
      bp.fill(x, (slab ? yTop : yTop) + 1, z, x, (slab ? yTop : yTop) + 3, z, AIR);
    }
  }
}
function stairX(bp, z0, z1, x0, dx, y0, n) {
  const steps = n * 2;
  for (let k = 1; k <= steps; k++) {
    const x = x0 + dx * (k - 1), top = y0 - 1 + k / 2;
    const yTop = Math.floor(top), slab = top !== yTop;
    for (let z = z0; z <= z1; z++) {
      bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK);
      bp.set(x, yTop, z, slab ? B.STONE_BRICK_SLAB : STONE2);
      bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR);
    }
  }
}
// 2x2 lift shaft (PANEL_BLACK) from walk level ya to yb with blue door markers at every floor; openings on `side`
function liftShaft(bp, x, z, ya, yb, side = 'S') {
  bp.fill(x, ya - 1, z, x + 1, yb + 3, z + 1, B.PANEL_BLACK);
  bp.fill(x, ya, z, x + 1, yb + 2, z + 1, AIR);
  for (let y = ya; y <= yb; y += FLOOR_H) {
    const [mx, mz] = side === 'S' ? [x, z + 2] : side === 'N' ? [x, z - 1] : side === 'E' ? [x + 2, z] : [x - 1, z];
    if (bp.inside(mx, y + 2, mz)) bp.set(mx, y + 2, mz, BLUE);
    if (side === 'S' || side === 'N') { bp.fill(x, y, mz === z + 2 ? z + 1 : z, x + 1, y + 2, mz === z + 2 ? z + 1 : z, AIR); }
  }
  bp.lift(x, z, ya, yb);
}
// furnish a walled room with a template from the shared library; rect is the interior, door on `side`
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, h = 4) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side, doorU, doorW }, kind, {});
  const t = ROOMS[name] || ROOMS.storage;
  t.fn(r, rng, {});
  dress(r, rng);
  r.ceilingLights(4);
  r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
// generic dressing after a template: shelving, lamps and planters along the free perimeter cells, a table group in
// the middle of big rooms, so every room reads furnished (>= 1 piece per 6 floor cells)
const DRESS = [B.SHELF, B.BOOKSHELF, B.CRATE, B.BARREL, B.CHEST];
function dress(r, rng) {
  for (let u = 1; u < r.w - 1; u += 2) {
    if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(DRESS); r.put(u, 0, r.back, id); if (id === B.SHELF || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  }
  for (let v = 2; v < r.back; v += 2) {
    for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 3 === 0) r.planter(u, v, (v & 1) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); else { r.put(u, 0, v, B.IRON_BARS); r.put(u, 1, v, B.LANTERN); } }
  }
  if (r.w >= 8 && r.d >= 8) {
    const cu = r.cu, cv = Math.floor(r.back / 2) + 1;
    if (r.free(cu, cv) && r.empty(cu, 0, cv)) { r.table(cu, cv); r.table(cu + 1, cv); for (const [du, dv] of [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 1], [1, 1]]) if (r.free(cu + du, cv + dv) && r.empty(cu + du, 0, cv + dv)) r.seat(cu + du, cv + dv); }
  }
}
// a statue: plinth, robed figure, head; lit from the plinth
function statue(bp, x, y, z, facing) {
  bp.set(x, y, z, STONE2); bp.set(x, y + 1, z, STONE); bp.fill(x, y + 2, z, x, y + 3, z, GOLD); bp.set(x, y + 4, z, STONE);
  const [fx, fz] = facing;
  bp.set(x + fx, y, z + fz, GLOW);
}
function lamp(bp, x, y, z, h = 2, id = B.LANTERN) { bp.fill(x, y, z, x, y + h - 1, z, B.IRON_BARS); bp.set(x, y + h, z, id); }
function tree(bp, x, y, z, h, leaf = B.OAK_LEAVES, log = B.OAK_LOG) {
  bp.fill(x, y, z, x, y + h - 1, z, log);
  bp.fill(x - 1, y + h - 2, z - 1, x + 1, y + h, z + 1, leaf);
  bp.set(x, y + h + 1, z, leaf);
  bp.fill(x, y + h - 2, z, x, y + h - 1, z, log);
}

// ------------------------------------------------------------------------------------------------ massing
function tierShell(bp, t, rng) {
  const { x0, z0, x1, z1, y0, y1 } = t;
  bp.fill(x0, y0, z0, x1, y1, z1, STONE);
  bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, STONE2);                         // roof slab
  // facade dressing: pilasters every 8, floor bands, window slits, a stone-brick base course, chrome cornice
  const ring = (y, id, inset = 0) => { bp.walls(x0 + inset, y, z0 + inset, x1 - inset, y, z1 - inset, id); };
  ring(y0, BAND); ring(y0 + 1, BAND);
  for (let y = y0 + FLOOR_H; y <= y1; y += FLOOR_H) ring(y, BAND);
  ring(y1 + 1, TRIM);
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) {
    const u = x - x0;
    if (u % 8 === 4) { bp.fill(x, y0, z, x, y1, z, STONE2); continue; }
    if (u % 8 === 0 || u % 8 === 1 || u === 0 || x === x1) continue;
    for (let y = y0 + 2; y <= y1 - 1; y++) if (y % FLOOR_H === 3 || y % FLOOR_H === 4) bp.set(x, y, z, (u & 1) ? B.WINDOW_LIT : B.WINDOW_DARK);
  }
  for (let z = z0; z <= z1; z++) for (const x of [x0, x1]) {
    const v = z - z0;
    if (v % 8 === 4) { bp.fill(x, y0, z, x, y1, z, STONE2); continue; }
    if (v % 8 === 0 || v % 8 === 1 || v === 0 || z === z1) continue;
    for (let y = y0 + 2; y <= y1 - 1; y++) if (y % FLOOR_H === 3 || y % FLOOR_H === 4) bp.set(x, y, z, (v & 1) ? B.WINDOW_LIT : B.WINDOW_DARK);
  }
  // roof parapet and lamp posts along the terrace edges
  bp.walls(x0, y1 + 2, z0, x1, y1 + 2, z1, BAND);
  for (let x = x0 + 4; x <= x1 - 4; x += 12) for (const z of [z0 + 1, z1 - 1]) lamp(bp, x, y1 + 2, z, 2, B.CITY_LAMP);
  for (let z = z0 + 4; z <= z1 - 4; z += 12) for (const x of [x0 + 1, x1 - 1]) lamp(bp, x, y1 + 2, z, 2, B.CITY_LAMP);
  // terrace planters on the roof ring (between this tier's wall and the next tier)
  for (let x = x0 + 6; x <= x1 - 6; x += 9) for (const z of [z0 + 4, z1 - 4]) { bp.set(x, y1 + 2, z, DARK); bp.set(x, y1 + 3, z, B.SPRUCE_LEAVES); }
}

// spire: tapering shaft from the tier-3 roof; interior floors every 5 with a lift in the +x/+z corner
function spire(bp, rng, ox, oz, top, council) {
  const w = SPIRE;
  const segs = [[T3.roof + 1, top - 48, 0], [top - 47, top - 20, 1], [top - 19, top - 8, 2]];  // [y0, y1, inset]
  for (const [ya, yb, ins] of segs) {
    bp.fill(ox + ins, ya, oz + ins, ox + w - 1 - ins, yb, oz + w - 1 - ins, STONE);
    // corner ribs in chrome, lit slits
    for (let y = ya; y <= yb; y++) {
      for (const [x, z] of [[ox + ins, oz + ins], [ox + w - 1 - ins, oz + ins], [ox + ins, oz + w - 1 - ins], [ox + w - 1 - ins, oz + w - 1 - ins]]) bp.set(x, y, z, y % FLOOR_H === 0 ? TRIM : STONE2);
      if (y % FLOOR_H === 3) for (let k = 3; k < w - 3 - 2 * ins; k += 3) {
        bp.set(ox + ins + k, y, oz + ins, B.WINDOW_LIT); bp.set(ox + ins + k, y, oz + w - 1 - ins, B.WINDOW_LIT);
        bp.set(ox + ins, y, oz + ins + k, B.WINDOW_LIT); bp.set(ox + w - 1 - ins, y, oz + ins + k, B.WINDOW_LIT);
      }
    }
  }
  // cap: stepped pyramid to the tip with a blue beacon
  const cx0 = ox + 2, cx1 = ox + w - 3, cz0 = oz + 2, cz1 = oz + w - 3;
  for (let k = 0; k < 5; k++) bp.fill(cx0 + k, top - 7 + k, cz0 + k, cx1 - k, top - 7 + k, cz1 - k, k === 4 ? TRIM : STONE2);
  const mx = ox + (w >> 1), mz = oz + (w >> 1);
  bp.fill(mx - 1, top - 2, mz - 1, mx, top + 1, mz, TRIM);
  bp.set(mx - 1, top + 2, mz - 1, BLUE); bp.set(mx, top + 2, mz, BLUE);
  // interior: chambers every floor from the tier-3 roof up to the cap, a lift and a landing per floor
  const lx = ox + w - 4, lz = oz + w - 4;                 // lift shaft 2x2 in the +x+z corner
  const yTopFloor = top - 20 - ((top - 20 - (T3.roof + 1)) % FLOOR_H);
  for (let y = T3.roof + 1; y <= yTopFloor; y += FLOOR_H) {
    const ins = y > top - 47 ? 1 : 0;
    const ix0 = ox + 1 + ins, iz0 = oz + 1 + ins, ix1 = ox + w - 2 - ins, iz1 = oz + w - 2 - ins;
    bp.fill(ix0, y, iz0, ix1, y + 3, iz1, AIR);
    bp.fill(ix0, y - 1, iz0, ix1, y - 1, iz1, PLATE);
    bp.fill(ix0, y + 4, iz0, ix1, y + 4, iz1, STONE2);
    const kinds = council ? ['meditation_chamber', 'archive', 'studio', 'library'] : ['studio', 'meditation_chamber', 'archive', 'lounge'];
    const kind = kinds[Math.floor((y - T3.roof - 1) / FLOOR_H) % kinds.length];
    template(bp, rng, kind, kind, ix0, iz0, lx - 2, iz1, y, 'E', 2, 2);
  }
  // open the lift's west side on every landing (the template room lies west of the shaft)
  for (let y = T3.roof + 1; y <= yTopFloor; y += FLOOR_H) { bp.fill(lx - 1, y, lz, lx - 1, y + 2, lz + 1, AIR); bp.set(lx - 1, y + 3, lz, BLUE); }
  // summit room: Council Chamber (south-west spire) or an observation deck
  const sy = yTopFloor + FLOOR_H;
  const ins = 1, ix0 = ox + 1 + ins, iz0 = oz + 1 + ins, ix1 = ox + w - 2 - ins, iz1 = oz + w - 2 - ins;
  bp.fill(ix0, sy - 1, iz0, ix1, sy - 1, iz1, council ? B.PANEL_BLACK : PLATE);
  bp.fill(ix0, sy, iz0, ix1, sy + 5, iz1, AIR);
  bp.fill(ix0, sy + 6, iz0, ix1, sy + 6, iz1, STONE2);
  // windows all round at seat height
  bp.walls(ox + ins, sy + 1, oz + ins, ox + w - 1 - ins, sy + 3, oz + w - 1 - ins, GLASS);
  for (const [x, z] of [[ox + ins, oz + ins], [ox + w - 1 - ins, oz + ins], [ox + ins, oz + w - 1 - ins], [ox + w - 1 - ins, oz + w - 1 - ins]]) bp.fill(x, sy, z, x, sy + 5, z, TRIM);
  liftShaft(bp, lx, lz, T3.roof + 1, sy, 'W');
  for (let y = T3.roof + 1; y <= yTopFloor; y += FLOOR_H) { bp.fill(lx - 1, y, lz, lx - 1, y + 2, lz + 1, AIR); bp.set(lx - 1, y + 3, lz, BLUE); }
  bp.fill(lx - 1, sy, lz, lx - 1, sy + 2, lz + 1, AIR); bp.set(lx - 1, sy + 3, lz, BLUE);
  const cx = ox + (w >> 1) - 1, cz = oz + (w >> 1) - 1;
  if (council) {
    // twelve seats in a ring around a lit floor medallion, a holo table, ceiling lantern ring
    for (let x = ix0; x <= ix1; x++) for (let z = iz0; z <= iz1; z++) { const d = Math.hypot(x - cx - 0.5, z - cz - 0.5); bp.set(x, sy - 1, z, d < 1.6 ? GLOW : d < 3.2 ? B.PANEL_BLACK : (x + z) % 2 ? STONE2 : B.PANEL_BLACK); }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, sx = Math.round(cx + 0.5 + Math.cos(a) * 4.2), sz = Math.round(cz + 0.5 + Math.sin(a) * 4.2);
      if (sx >= lx - 2 && sz >= lz - 1) continue;
      bp.set(sx, sy, sz, B.STONE_BRICK_SLAB); bp.spot(sx, sy, sz, 'seat');
    }
    bp.set(cx, sy, cz, B.PANEL_BLACK); bp.set(cx + 1, sy, cz, B.PANEL_BLACK); bp.set(cx, sy + 1, cz, B.HOLO_SIGN); bp.set(cx + 1, sy + 1, cz, B.CONSOLE);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) bp.set(cx + dx, sy + 5, cz + dz, B.LANTERN);
    bp.set(cx, sy + 6, cz, GLOW); bp.set(cx + 1, sy + 6, cz + 1, GLOW);
    bp.meta.name = bp.meta.name || 'Jedi Temple';
    bp.room('council_chamber', ix0 - 1, sy, iz0 - 1, ix1 + 1, iz1 + 1);
    bp.work(cx - 1, sy, cz, 'master');
  } else {
    const r = new Room(bp, { x0: ix0, z0: iz0, x1: lx - 2, z1: iz1, y: sy, h: 5, side: 'E', doorU: 2, doorW: 2 }, 'observation_deck', {});
    ROOMS.observation_deck.fn(r, rng, {}); r.finalize();
    bp.room('observation_deck', ix0 - 1, sy, iz0 - 1, ix1 + 1, iz1 + 1);
  }
}

// central Tranquility Spire: 20 x 20 shaft from the rotunda floor to the summit, four lifts, landings every 10
function centralSpire(bp, rng, top) {
  const { x0, z0, x1, z1 } = CENTRAL;
  bp.fill(x0, T3.roof + 1, z0, x1, top - 10, z1, STONE);
  // set-backs
  bp.fill(x0 + 1, top - 45, z0 + 1, x1 - 1, top - 10, z1 - 1, STONE);
  for (let y = T3.roof + 1; y <= top - 10; y++) {
    const ins = y > top - 45 ? 1 : 0;
    for (const [x, z] of [[x0 + ins, z0 + ins], [x1 - ins, z0 + ins], [x0 + ins, z1 - ins], [x1 - ins, z1 - ins]]) bp.set(x, y, z, y % FLOOR_H === 0 ? TRIM : STONE2);
    if (y % FLOOR_H === 3) for (let k = 3; k < 17 - 2 * ins; k += 3) { bp.set(x0 + ins + k, y, z0 + ins, B.WINDOW_LIT); bp.set(x0 + ins + k, y, z1 - ins, B.WINDOW_LIT); bp.set(x0 + ins, y, z0 + ins + k, B.WINDOW_LIT); bp.set(x1 - ins, y, z0 + ins + k, B.WINDOW_LIT); }
    if (y > top - 45) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) bp.set(x, y, z, AIR);
  }
  // summit deck (glass all round) and the cap
  const sy = top - 9;
  bp.fill(x0 + 2, sy - 1, z0 + 2, x1 - 2, sy - 1, z1 - 2, PLATE);
  bp.fill(x0 + 2, sy, z0 + 2, x1 - 2, sy + 4, z1 - 2, AIR);
  bp.walls(x0 + 2, sy, z0 + 2, x1 - 2, sy + 4, z1 - 2, GLASS);
  for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) bp.fill(x, sy, z, x, sy + 5, z, TRIM);
  bp.fill(x0 + 2, sy + 5, z0 + 2, x1 - 2, sy + 5, z1 - 2, STONE2);
  for (let k = 0; k < 3; k++) bp.fill(x0 + 4 + k, sy + 6 + k, z0 + 4 + k, x1 - 4 - k, sy + 6 + k, z1 - 4 - k, k === 2 ? TRIM : STONE2);
  bp.fill(CX - 1, sy + 9, CZ - 1, CX, top, CZ, TRIM);
  bp.set(CX - 1, top + 1, CZ - 1, BLUE); bp.set(CX, top + 1, CZ, BLUE);
  // interior: lift shaft on the axis from the rotunda floor to the summit, landings with meditation cells
  const lx = CX - 1, lz = CZ - 1;
  const lastLanding = sy - ((sy - (T3.roof + 1)) % FLOOR_H) - FLOOR_H;
  for (let y = T3.roof + 1; y <= lastLanding; y += FLOOR_H * 2) {
    const ins = y > top - 45 ? 2 : 1;
    bp.fill(x0 + ins, y - 1, z0 + ins, x1 - ins, y - 1, z1 - ins, PLATE);
    bp.fill(x0 + ins, y, z0 + ins, x1 - ins, y + 3, z1 - ins, AIR);
    bp.fill(x0 + ins, y + 4, z0 + ins, x1 - ins, y + 4, z1 - ins, STONE2);
    template(bp, rng, 'meditation_chamber', 'meditation_chamber', x0 + ins, z0 + ins, lx - 2, z1 - ins, y, 'E', 3, 2);
    template(bp, rng, 'archive', 'archive', lx + 3, z0 + ins, x1 - ins, z1 - ins, y, 'W', 3, 2);
  }
  liftShaft(bp, lx, lz, 1, sy, 'N');
  // open both sides of the shaft at every landing and at the summit
  for (let y = T3.roof + 1; y <= lastLanding; y += FLOOR_H * 2) { bp.fill(lx - 1, y, lz, lx - 1, y + 2, lz + 1, AIR); bp.fill(lx + 2, y, lz, lx + 2, y + 2, lz + 1, AIR); }
  bp.fill(lx - 1, sy, lz, lx - 1, sy + 2, lz + 1, AIR); bp.fill(lx + 2, sy, lz, lx + 2, sy + 2, lz + 1, AIR);
  // summit deck furnishing: a ring of benches, telescopes, holo map
  for (const [x, z] of [[x0 + 3, z0 + 3], [x1 - 3, z0 + 3], [x0 + 3, z1 - 3], [x1 - 3, z1 - 3]]) { bp.set(x, sy, z, B.IRON_BARS); bp.set(x, sy + 1, z, TRIM); }
  for (let x = x0 + 4; x <= x1 - 4; x += 3) { bp.set(x, sy, z0 + 3, B.STONE_BRICK_SLAB); bp.spot(x, sy, z0 + 3, 'seat'); bp.set(x, sy, z1 - 3, B.STONE_BRICK_SLAB); bp.spot(x, sy, z1 - 3, 'seat'); }
  bp.set(lx - 3, sy, lz, B.PANEL_BLACK); bp.set(lx - 3, sy + 1, lz, B.HOLO_SIGN);
  for (let x = x0 + 3; x <= x1 - 3; x += 4) for (let z = z0 + 3; z <= z1 - 3; z += 4) bp.set(x, sy + 5, z, GLOW);
  bp.room('observation_deck', x0 + 2, sy, z0 + 2, x1 - 2, z1 - 2);
}

// ------------------------------------------------------------------------------------------------ interiors
// the Great Hall / Processional Way: from the south portal to the rotunda, statues between columns, lit spine
function greatHall(bp, rng) {
  const x0 = 66, x1 = 101, z0 = CZ + ROT_R - 1, z1 = T1.z1 - 1, y0 = 1, y1 = 21;
  bp.fill(x0, y0, z0, x1, y1, z1, AIR);
  bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, BAND);
  // floor: smooth stone with a glowing spine and sandstone bands
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, 0, z, (x === CX - 1 || x === CX) ? (z % 3 ? STONE2 : GLOW) : (x >= CX - 3 && x <= CX + 2) ? B.PANEL_BLACK : (z % 8 === 0 ? STONE : STONE2));
  // coffered ceiling with lights
  for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) if (x % 6 === 3 && z % 3 === 0) bp.set(x, y1 + 1, z, GLOW); else if (x % 6 === 0 || z % 6 === 0) bp.set(x, y1 + 1, z, STONE2);
  for (let z = z0 + 2; z <= z1 - 2; z += 4) for (const x of [x0, x1]) { bp.set(x, y0 + 7, z, GLOW); bp.set(x, y0 + 2, z, (z % 8) ? B.WINDOW_LIT : GLOW); }
  // columns and statues along both sides
  for (let z = z0 + 5; z <= z1 - 5; z += 8) {
    for (const x of [x0 + 2, x1 - 2]) { bp.fill(x, y0, z, x, y1, z, STONE2); bp.set(x, y0 + 8, z, TRIM); bp.set(x, y1, z, TRIM); bp.fill(x, y0 + 15, z, x, y0 + 15, z, GOLD); }
    statue(bp, x0 + 5, y0, z + 4, [1, 0]); statue(bp, x1 - 5, y0, z + 4, [-1, 0]);
    lamp(bp, x0 + 3, y0, z + 4, 3, B.LANTERN); lamp(bp, x1 - 3, y0, z + 4, 3, B.LANTERN);
    bp.spot(x0 + 8, y0, z + 4, 'stand'); bp.spot(x1 - 8, y0, z + 4, 'stand');
  }
  // banners (wool) hanging high between the columns
  for (let z = z0 + 9; z <= z1 - 5; z += 8) for (const x of [x0 + 1, x1 - 1]) { bp.fill(x, y0 + 10, z, x, y0 + 16, z, (z >> 3) % 2 ? B.BLUE_WOOL : B.WHITE_WOOL); bp.set(x, y0 + 17, z, TRIM); }
  // south portal: 12 wide x 12 high in the tier-1 wall, chrome frame, lit lintel, doors of dark panels left open
  const px0 = CX - 6, px1 = CX + 5, pz = T1.z1;
  bp.fill(px0, y0, pz, px1, y0 + 11, pz, AIR);
  bp.fill(px0 - 1, y0, pz, px0 - 1, y0 + 12, pz, TRIM); bp.fill(px1 + 1, y0, pz, px1 + 1, y0 + 12, pz, TRIM);
  bp.fill(px0, y0 + 12, pz, px1, y0 + 12, pz, GLOW);
  for (let k = 0; k < 3; k++) { bp.fill(px0 - 2 - k, y0 + 12 + k, pz, px0 - 2 - k, T1.y1, pz, TRIM); bp.fill(px1 + 2 + k, y0 + 12 + k, pz, px1 + 2 + k, T1.y1, pz, TRIM); }
  bp.room('great_hall', x0, y0, z0, x1, z1);
  bp.work(CX, y0, z1 - 3, 'guard'); bp.work(CX - 1, y0, z1 - 3, 'guard');
}

// central rotunda: a drum through tiers 1 and 2 with a fountain, four grand arches, a gallery ring at tier 2 level
function rotunda(bp, rng) {
  const y0 = 1, gallY = T2.y0, y1 = T2.y1 - 1;
  for (let x = CX - ROT_R - 1; x <= CX + ROT_R + 1; x++) for (let z = CZ - ROT_R - 1; z <= CZ + ROT_R + 1; z++) {
    const d = dist(x, z);
    if (d > ROT_R + 1) continue;
    if (d > ROT_R) { bp.fill(x, y0, z, x, y1 + 1, z, STONE2); if (Math.round(d * 2) % 3 === 0) for (let y = y0 + 3; y <= y1; y += FLOOR_H) bp.set(x, y, z, (y === y0 + 3 || y === gallY + 2) ? GLOW : B.WINDOW_LIT); continue; }
    bp.fill(x, y0, z, x, y1, z, AIR);
    bp.set(x, y1 + 1, z, d < 2 ? GLOW : (Math.round(d) % 4 === 0 ? GLOW : BAND));
    bp.set(x, 0, z, d < 4.5 ? (d < 3.5 ? B.WATER : TRIM) : ((Math.floor(d) % 3 === 0) ? STONE : STONE2));
    // gallery ring at tier-2 level (walk gallY) between radius 11 and the wall, with a railing
    if (d >= 11) { bp.set(x, gallY - 1, z, PLATE); if (d < 12) bp.set(x, gallY, z, B.IRON_BARS); }
  }
  // fountain: basin ring, water, a chrome column with a lantern
  bp.fill(CX - 1, y0, CZ - 1, CX, y0 + 4, CZ, TRIM); bp.set(CX - 1, y0 + 5, CZ - 1, B.LANTERN); bp.set(CX, y0 + 5, CZ, B.LANTERN);
  for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) bp.set(CX + dx, y0, CZ + dz, B.WATER);
  // benches and planters around the pool
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, bx = Math.round(CX + Math.cos(a) * 7), bz = Math.round(CZ + Math.sin(a) * 7);
    bp.set(bx, y0, bz, B.STONE_BRICK_SLAB); bp.spot(bx, y0, bz, 'seat');
    const px = Math.round(CX + Math.cos(a + 0.35) * 9), pz = Math.round(CZ + Math.sin(a + 0.35) * 9);
    bp.set(px, y0, pz, DARK); bp.set(px, y0 + 1, pz, B.SPRUCE_LEAVES);
  }
  // four arches into the rotunda at ground level (N/S/E/W) and four at gallery level
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const ax = CX + dx * (ROT_R + 1), az = CZ + dz * (ROT_R + 1);
    for (const y of [y0, gallY]) {
      if (dx) bp.fill(ax, y, az - 2, ax, y + 4, az + 1, AIR); else bp.fill(ax - 2, y, az, ax + 1, y + 4, az, AIR);
      if (dx) { bp.fill(ax, y + 5, az - 2, ax, y + 5, az + 1, GLOW); } else bp.fill(ax - 2, y + 5, az, ax + 1, y + 5, az, GLOW);
    }
  }
  // gallery statues of the great masters, lantern posts on the railing, chrome bands on the lift pier
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8, sx = Math.round(CX + Math.cos(a) * 14), sz = Math.round(CZ + Math.sin(a) * 14); statue(bp, sx, gallY, sz, [0, 0]); }
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, px = Math.round(CX + Math.cos(a) * 11.5), pz = Math.round(CZ + Math.sin(a) * 11.5); lamp(bp, px, gallY, pz, 2, B.LANTERN); }
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26, px = Math.round(CX + Math.cos(a) * 12), pz = Math.round(CZ + Math.sin(a) * 12); lamp(bp, px, y0, pz, 3, B.LANTERN); }
  // passages: north to the fountain garden, west to the hangar, east to the east-wing corridor
  bp.fill(CX - 2, y0, 64, CX + 1, y0 + 4, CZ - ROT_R - 2, AIR); bp.fill(CX - 2, y0 + 5, 64, CX + 1, y0 + 5, CZ - ROT_R - 2, GLOW);
  bp.fill(49, y0, CZ - 2, CX - ROT_R - 2, y0 + 4, CZ + 1, AIR); for (let x = 50; x < CX - ROT_R - 2; x += 3) bp.set(x, y0 + 5, CZ, GLOW);
  bp.fill(CX + ROT_R + 2, y0, CZ - 2, 104, y0 + 4, CZ + 1, AIR); bp.set(103, y0 + 5, CZ, GLOW);
  // west-wing corridor door into the great hall
  bp.fill(65, y0, 138, 65, y0 + 2, 139, AIR); bp.set(65, y0 + 3, 138, GLOW);
  bp.fill(102, y0, 138, 103, y0 + 2, 139, AIR); bp.set(102, y0 + 3, 138, GLOW);
  // sky-walk at gallery level: a landing around the central lift bridged to the gallery ring (east and west)
  bp.fill(CX - 4, gallY - 1, CZ - 4, CX + 3, gallY - 1, CZ + 3, PLATE);
  bp.walls(CX - 4, gallY, CZ - 4, CX + 3, gallY, CZ + 3, B.IRON_BARS);
  bp.fill(CX - ROT_R - 1, gallY - 1, CZ - 1, CX - 4, gallY - 1, CZ, TRIM); bp.fill(CX + 3, gallY - 1, CZ - 1, CX + ROT_R + 1, gallY - 1, CZ, TRIM);
  for (const z of [CZ - 2, CZ + 1]) { bp.fill(CX - ROT_R - 1, gallY, z, CX - 4, gallY, z, B.IRON_BARS); bp.fill(CX + 3, gallY, z, CX + ROT_R + 1, gallY, z, B.IRON_BARS); }
  bp.fill(CX - ROT_R, gallY, CZ - 1, CX + ROT_R, gallY + 3, CZ, AIR); bp.fill(CX - 4, gallY, CZ - 4, CX + 3, gallY + 3, CZ + 3, AIR);
  bp.fill(CX - 4, gallY, CZ - 4, CX + 3, gallY, CZ - 4, B.IRON_BARS); bp.fill(CX - 4, gallY, CZ + 3, CX + 3, gallY, CZ + 3, B.IRON_BARS);
  bp.fill(CX - 4, gallY, CZ - 3, CX - 4, gallY, CZ - 2, B.IRON_BARS); bp.fill(CX - 4, gallY, CZ + 1, CX - 4, gallY, CZ + 2, B.IRON_BARS);
  bp.fill(CX + 3, gallY, CZ - 3, CX + 3, gallY, CZ - 2, B.IRON_BARS); bp.fill(CX + 3, gallY, CZ + 1, CX + 3, gallY, CZ + 2, B.IRON_BARS);
  bp.room('rotunda', CX - ROT_R, y0, CZ - ROT_R, CX + ROT_R, CZ + ROT_R);
  bp.room('gallery', CX - ROT_R, gallY, CZ - ROT_R, CX + ROT_R, CZ + ROT_R);
  // the central spire's lift shaft descends into the rotunda: a chrome-clad pier from y 1 to the tier-3 roof
  bp.fill(CX - 2, y0, CZ - 2, CX + 1, T3.roof, CZ + 1, B.PANEL_BLACK);
  for (let y = y0 + 4; y <= T2.y1; y += FLOOR_H) bp.walls(CX - 2, y, CZ - 2, CX + 1, y, CZ + 1, y % 2 ? TRIM : BLUE);
  bp.fill(CX - 1, y0, CZ - 1, CX, T3.roof, CZ, AIR);
  bp.fill(CX - 1, y0, CZ - 1, CX, y0 + 4, CZ, TRIM);   // fountain column occupies the shaft base; the lift starts at the gallery
  bp.fill(CX - 3, gallY, CZ - 1, CX + 2, gallY + 2, CZ, AIR);          // lift doors east and west at the sky-walk
  bp.set(CX - 3, gallY + 3, CZ - 1, BLUE); bp.set(CX + 2, gallY + 3, CZ - 1, BLUE);
}

// Room of a Thousand Fountains: the north half of tier 1, a garden hall of pools, falls, trees and paths
function fountains(bp, rng) {
  const x0 = 24, x1 = 143, z0 = 22, z1 = 64, y0 = 1, y1 = 22;
  bp.fill(x0, y0, z0, x1, y1, z1, AIR);
  bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, STONE2);
  for (let x = x0 + 2; x <= x1 - 2; x += 5) for (let z = z0 + 2; z <= z1 - 2; z += 5) bp.set(x, y1 + 1, z, GLOW);
  // ground: grass with stone paths on a 12 grid, pools in the cells between
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (inCorner(x, z)) { bp.fill(x, y0, z, x, y1, z, STONE); if ((x + z) % 7 === 0) for (let y = y0 + 2; y <= y1; y += 6) bp.set(x, y, z, B.WINDOW_LIT); continue; }
    const path = (x - x0) % 12 < 2 || (z - z0) % 14 < 2;
    bp.set(x, 0, z, path ? STONE2 : B.GRASS);
  }
  // pools with fountains and small falls from a raised ledge on the north wall
  for (let x = x0 + 4; x <= x1 - 8; x += 12) for (let z = z0 + 3; z <= z1 - 8; z += 14) {
    if (inCorner(x + 3, z + 3) || inCorner(x, z) || inCorner(x + 6, z + 6)) continue;
    bp.fill(x, 0, z, x + 6, 0, z + 6, STONE2);
    bp.fill(x + 1, 0, z + 1, x + 5, 0, z + 5, B.WATER);
    bp.set(x + 3, y0, z + 3, TRIM); bp.set(x + 3, y0 + 1, z + 3, B.WATER);
    for (const [bx, bz] of [[x - 1, z + 3], [x + 7, z + 3]]) if (!inCorner(bx, bz)) { bp.set(bx, y0, bz, B.STONE_BRICK_SLAB); bp.spot(bx, y0, bz, 'seat'); }
    const tx = x + 9, tz = z + 3;
    if (tx <= x1 - 2 && !inCorner(tx, tz)) tree(bp, tx, y0, tz, 5 + ((x + z) % 3), (x % 2) ? B.OAK_LEAVES : B.SPRUCE_LEAVES, (x % 2) ? B.OAK_LOG : B.SPRUCE_LOG);
  }
  // north wall waterfall ledges: water spills from y 10 into troughs
  for (let x = x0 + 8; x <= x1 - 8; x += 24) {
    if (inCorner(x, z0 + 1)) continue;
    bp.fill(x - 2, y0 + 9, z0, x + 2, y0 + 9, z0 + 1, STONE2); bp.fill(x - 1, y0 + 10, z0 + 1, x + 1, y0 + 10, z0 + 1, B.WATER);
    bp.fill(x - 2, 0, z0 + 1, x + 2, 0, z0 + 3, STONE2); bp.fill(x - 1, 0, z0 + 2, x + 1, 0, z0 + 2, B.WATER);
    lamp(bp, x - 3, y0, z0 + 1, 3, B.LANTERN); lamp(bp, x + 3, y0, z0 + 1, 3, B.LANTERN);
  }
  // low light: lantern posts at every path crossing, lit pool rims, glow bands on the walls and the spire piers at
  // y 4 and y 12 (the 22-block ceiling is too far for its lights to reach the ground), flowers on the lawns
  for (let x = x0; x <= x1; x += 12) for (let z = z0; z <= z1; z += 14) { const px = x + 2, pz = z + 2; if (px < x1 && pz < z1 && !inCorner(px, pz)) lamp(bp, px, y0, pz, 3, B.LANTERN); }
  for (let x = x0 + 4; x <= x1 - 8; x += 12) for (let z = z0 + 3; z <= z1 - 8; z += 14) { if (inCorner(x + 3, z + 3) || inCorner(x, z) || inCorner(x + 6, z + 6)) continue; for (const [gx, gz] of [[x, z], [x + 6, z], [x, z + 6], [x + 6, z + 6]]) bp.set(gx, 0, gz, GLOW); }
  for (let x = x0; x <= x1; x += 4) for (const z of [z0, z1]) for (const y of [y0 + 3, y0 + 11]) if (bp.get(x, y, z) !== AIR && !inCorner(x, z)) bp.set(x, y, z, GLOW);
  for (let z = z0; z <= z1; z += 4) for (const x of [x0, x1]) for (const y of [y0 + 3, y0 + 11]) if (bp.get(x, y, z) !== AIR) bp.set(x, y, z, GLOW);
  for (const [cx, cz] of CORNERS) if (cz < CZ) for (let k = 1; k < SPIRE - 1; k += 3) for (const y of [y0 + 3, y0 + 11]) { bp.set(cx + k, y, cz - 1 + 0, GLOW); bp.set(cx + k, y, cz + SPIRE, GLOW); bp.set(cx - 1 + 0, y, cz + k, GLOW); bp.set(cx + SPIRE, y, cz + k, GLOW); }
  for (let x = x0 + 6; x <= x1 - 6; x += 10) for (let z = z0 + 7; z <= z1 - 7; z += 14) if (!inCorner(x, z) && bp.isAir(x, y0, z)) bp.set(x, y0, z, (x + z) % 2 ? B.POPPY : B.DANDELION);
  bp.room('fountain_garden', x0, y0, z0, x1, z1);
  bp.work(x0 + 3, y0, z1 - 3, 'gardener'); bp.work(x1 - 3, y0, z0 + 5, 'gardener');
}

// temple hangar: west side of tier 1, opening in the west wall onto the apron, a parked shuttle
function hangar(bp, rng) {
  const x0 = T1.x0 + 1, x1 = 48, z0 = 74, z1 = 118, y0 = 1, y1 = 19;
  bp.fill(x0, y0, z0, x1, y1, z1, AIR);
  bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, BAND);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (inCorner(x, z)) { bp.fill(x, y0, z, x, y1, z, STONE); continue; }
    bp.set(x, 0, z, (z - z0) % 4 === 0 || (x - x0) % 8 === 0 ? DARK : PLATE);
    if ((x - x0) % 6 === 3 && (z - z0) % 6 === 3) bp.set(x, y1 + 1, z, GLOW);
  }
  // mouth in the west wall: 30 wide, 14 high, chrome frame, hazard stripe threshold, apron outside
  const mz0 = z0 + 7, mz1 = z1 - 7;
  bp.fill(T1.x0, y0, mz0, T1.x0, y0 + 13, mz1, AIR);
  bp.fill(T1.x0, y0, mz0 - 1, T1.x0, y0 + 14, mz0 - 1, TRIM); bp.fill(T1.x0, y0, mz1 + 1, T1.x0, y0 + 14, mz1 + 1, TRIM); bp.fill(T1.x0, y0 + 14, mz0, T1.x0, y0 + 14, mz1, GLOW);
  bp.fill(0, 0, mz0 - 2, T1.x0, 0, mz1 + 2, PLATE);
  for (let z = mz0 - 2; z <= mz1 + 2; z++) { bp.set(0, 0, z, B.PANEL_STRIPE); bp.set(T1.x0 - 1, 0, z, B.PANEL_STRIPE); }
  for (let z = mz0; z <= mz1; z += 4) bp.set(2, 0, z, B.CITY_LAMP);
  // landing circle on the hangar floor, fuel and cargo along the back wall, tool benches, a control cabin
  const cx = 30, cz = (z0 + z1) >> 1;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const d = Math.hypot(x - cx, z - cz); if (d > 10 && d <= 11) bp.set(x, 0, z, B.PANEL_STRIPE); if (d < 1.5) bp.set(x, 0, z, GLOW); }
  for (let z = z0 + 2; z <= z1 - 2; z += 3) { bp.set(x1, y0, z, B.CRATE); bp.set(x1, y0 + 1, z, (z % 2) ? B.BARREL : B.CRATE); bp.set(x1 - 1, y0, z + 1, B.BARREL); }
  for (let z = z0 + 1; z <= z1 - 1; z += 9) { bp.set(x0 + 1, y0, z, B.TABLE); bp.set(x0 + 1, y0, z + 1, B.ANVIL); bp.set(x0 + 1, y0, z + 2, B.CONSOLE); bp.work(x0 + 2, y0, z + 1, 'mechanic'); }
  bp.fill(x1 - 6, y0 + 7, z0 + 1, x1, y0 + 7, z0 + 5, PLATE); bp.walls(x1 - 6, y0 + 8, z0 + 1, x1, y0 + 10, z0 + 5, GLASS); bp.fill(x1 - 5, y0 + 8, z0 + 2, x1 - 1, y0 + 10, z0 + 4, AIR);
  bp.set(x1 - 3, y0 + 8, z0 + 3, B.CONSOLE); bp.work(x1 - 4, y0 + 8, z0 + 3, 'controller');
  stairX(bp, z0 + 1, z0 + 2, x1 - 7, -1, y0, 7);
  // shuttle: fuselage, cockpit glass, folded wings, engines
  const sx = cx - 6, sz = cz - 2, sy = y0;
  bp.fill(sx, sy, sz, sx + 12, sy + 2, sz + 4, B.DURASTEEL); bp.fill(sx + 1, sy + 1, sz + 1, sx + 11, sy + 1, sz + 3, AIR);
  bp.fill(sx + 12, sy + 1, sz + 1, sx + 13, sy + 2, sz + 3, GLASS); bp.fill(sx - 2, sy, sz + 1, sx - 1, sy + 1, sz + 3, DARK); bp.set(sx - 3, sy, sz + 2, BLUE);
  bp.fill(sx + 3, sy + 3, sz - 3, sx + 8, sy + 3, sz - 1, TRIM); bp.fill(sx + 3, sy + 3, sz + 5, sx + 8, sy + 3, sz + 7, TRIM);
  bp.fill(sx + 3, sy + 4, sz - 3, sx + 8, sy + 7, sz - 3, B.DURASTEEL); bp.fill(sx + 3, sy + 4, sz + 7, sx + 8, sy + 7, sz + 7, B.DURASTEEL);
  bp.set(sx + 5, sy + 3, sz + 2, B.HOLO_SIGN);
  bp.fill(sx + 5, sy, sz + 4, sx + 6, sy + 2, sz + 4, AIR);     // open hatch
  bp.room('hangar', x0, y0, z0, x1, z1);
  for (let k = 0; k < 4; k++) bp.spot(x0 + 6 + k * 8, y0, z1 - 3, 'stand');
}

// tier-1 wings (east and south-west): stacked floors of quarters and services around corridors, slab stairs
function wings(bp, rng) {
  const E = { x0: 104, z0: 70, x1: T1.x1 - 1, z1: T1.z1 - 1 };
  const W = { x0: T1.x0 + 1, z0: 120, x1: 64, z1: T1.z1 - 1 };
  const floors = [16, 11, 6, 1];   // top-down so a floor's ceiling lights are not painted over by the slab above
  const eastKinds = [['barracks', 'cafeteria', 'kitchen', 'restroom', 'laundry'], ['barracks', 'barracks', 'lounge', 'medbay', 'storage'], ['hotel_room', 'hotel_room', 'hotel_room', 'library', 'restroom'], ['dojo', 'gym', 'meditation_chamber', 'storage', 'lounge']];
  const westKinds = [['workshop', 'droid_bay', 'armory', 'security_post'], ['garage', 'workshop', 'storage', 'server_room'], ['comms_room', 'control_room', 'meeting_room', 'restroom'], ['school_room', 'school_room', 'library', 'lounge']];
  for (const [wing, kinds, corrX] of [[E, eastKinds, E.x0], [W, westKinds, W.x1 - 3]]) {
    for (let f = 0; f < floors.length; f++) {
      const y = floors[f];
      // corridor 4 wide along z at the wing's inner edge, lit
      const cx0 = corrX, cx1 = corrX + 3;
      bp.fill(wing.x0, y - 1, wing.z0, wing.x1, y - 1, wing.z1, f === 0 ? STONE2 : PLATE);
      bp.fill(cx0, y, wing.z0, cx1, y + 3, wing.z1, AIR);
      for (let z = wing.z0 + 2; z <= wing.z1; z += 4) { bp.set(cx0 + 1, y + 4, z, GLOW); bp.set(cx1 - 1, y + 4, z, GLOW); }
      for (let z = wing.z0; z <= wing.z1; z++) bp.set(cx0 + (z % 2), y - 1, z, B.PANEL_BLACK);
      // rooms along the outer side of the corridor, 12 deep, split every 10 along z
      const rx0 = wing === E ? cx1 + 2 : wing.x0 + 1, rx1 = wing === E ? wing.x1 - 1 : cx0 - 2;
      const list = kinds[f];
      let zi = wing.z0 + 1, k = 0;
      while (zi + 9 <= wing.z1 - 12) {
        const rz0 = zi, rz1 = Math.min(wing.z1 - 1, zi + 8);
        if (!CORNERS.some(([cx, cz]) => rx1 >= cx && rx0 < cx + SPIRE && rz1 >= cz && rz0 < cz + SPIRE)) {
          hollow(bp, rx0 - 1, y, rz0 - 1, rx1 + 1, y + 3, rz1 + 1, STONE, f === 0 ? STONE2 : PLATE, STONE2);
          const kind = list[k % list.length];
          const side = wing === E ? 'W' : 'E';
          if (kind === 'dojo') dojo(bp, rng, rx0, rz0, rx1, rz1, y, side);
          else template(bp, rng, kind, kind, rx0, rz0, rx1, rz1, y, side, 3, 2);
          if (wing === E) doorway(bp, rx0 - 1, rz0 + 3, rx0 - 1, rz0 + 4, y); else doorway(bp, rx1 + 1, rz0 + 3, rx1 + 1, rz0 + 4, y);
          k++;
        }
        zi += 10;
      }
      // windows in the outer wall for every room floor
      const wx = wing === E ? T1.x1 : T1.x0;
      for (let z = wing.z0 + 2; z <= wing.z1 - 2; z += 2) bp.set(wx, y + 2, z, (z % 4) ? B.WINDOW_LIT : B.WINDOW_DARK);
    }
    // stairs between floors at the corridor's south end (half-slab flights, 2 wide), landing lights
    for (let f = 1; f < floors.length; f++) {
      const y = floors[f];
      const sx0 = corrX + 1, sz = wing.z1 - 2;
      stairZ(bp, sx0, sx0 + 1, sz, -1, y, FLOOR_H);
      bp.fill(sx0, y + FLOOR_H, sz - 2 * FLOOR_H, sx0 + 1, y + FLOOR_H + 3, sz - 2 * FLOOR_H - 2, AIR);
      bp.set(sx0, y + 4, sz - 2 * FLOOR_H - 1, GLOW);
    }
    // lift at the corridor's north end
    liftShaft(bp, corrX + 1, wing.z0 + 1, 1, floors[0], 'S');
  }
}
// dojo: wool mats, a sparring circle, weapon racks, a kneeling row for students
function dojo(bp, rng, x0, z0, x1, z1, y, side) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU: 3, doorW: 2 }, 'dojo', {});
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) r.putRaw(u, -1, v, (u + v) % 2 ? B.WHITE_WOOL : B.BLUE_WOOL);
  const cu = r.cu, cv = Math.floor(r.back / 2);
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) { const d = Math.hypot(u - cu, v - cv); if (d > 2.2 && d <= 3.2) r.putRaw(u, -1, v, B.RED_WOOL); }
  for (let u = 1; u < r.w - 1; u += 2) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, B.IRON_BARS); }
  for (let v = 2; v <= r.back - 1; v += 2) { if (r.put(0, 0, v, B.WHITE_WOOL)) r.spot(0, v, 'seat'); }
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 2, 2, 'instructor');
  r.lantern(1, 1); r.lantern(r.w - 2, r.back - 1);
  r.ceilingLights(4);
  r.finalize();
  bp.room('dojo', x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}

// tier 2: the Archives (north), the south hall with the stair to tier 3, quarters east, classrooms west,
// a square ring corridor around the rotunda gallery
function tier2(bp, rng) {
  const y = T2.y0, floors = [41, 36, 31, 26];   // top-down (see wings)
  // ring corridor 4 wide around the rotunda gallery at every floor
  const c0 = CX - ROT_R - 6, c1 = CX + ROT_R + 5;
  for (const fy of floors) {
    for (const [ax0, az0, ax1, az1] of [[c0, c0, c1, c0 + 3], [c0, c1 - 3, c1, c1], [c0, c0, c0 + 3, c1], [c1 - 3, c0, c1, c1]]) {
      bp.fill(ax0, fy - 1, az0, ax1, fy - 1, az1, PLATE);
      bp.fill(ax0, fy, az0, ax1, fy + 3, az1, AIR);
      bp.fill(ax0, fy + 4, az0, ax1, fy + 4, az1, STONE2);
      for (let x = ax0 + 2; x <= ax1; x += 4) for (let z = az0 + 2; z <= az1; z += 4) bp.set(x, fy + 4, z, GLOW);
    }
    // gallery openings from the corridor into the rotunda at the first tier-2 floor only (the drum is glazed above)
    if (fy === y) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const ax = CX + dx * (ROT_R + 1), az = CZ + dz * (ROT_R + 1); if (dx) bp.fill(ax, fy, az - 2, ax + dx * 4, fy + 4, az + 1, AIR); else bp.fill(ax - 2, fy, az, ax + 1, fy + 4, az + dz * 4, AIR); }
  }
  // Archives: north block, two double-height floors of bookshelf stacks under blue light
  const A = { x0: T2.x0 + 2, z0: T2.z0 + 2, x1: T2.x1 - 2, z1: c0 - 2 };
  for (const [ay, ah] of [[36, 8], [26, 9]]) {
    bp.fill(A.x0, ay - 1, A.z0, A.x1, ay - 1, A.z1, ay === 26 ? STONE2 : PLATE);
    bp.fill(A.x0, ay, A.z0, A.x1, ay + ah - 1, A.z1, AIR);
    bp.fill(A.x0, ay + ah, A.z0, A.x1, ay + ah, A.z1, STONE2);
    for (let x = A.x0 + 2; x <= A.x1 - 2; x += 4) {
      if (CORNERS.some(([cx, cz]) => x >= cx - 1 && x <= cx + SPIRE)) { }
      for (let z = A.z0 + 2; z <= A.z1 - 2; z++) {
        if (inCorner(x, z) || inCorner(x + 1, z)) continue;
        if ((z - A.z0) % 9 === 0) continue;                              // cross aisles
        bp.fill(x, ay, z, x, ay + ah - 3, z, B.BOOKSHELF);
        bp.set(x, ay + ah - 2, z, (z - A.z0) % 3 === 1 ? BLUE : GLOW);
      }
      for (let z = A.z0 + 2; z <= A.z1 - 2; z += 9) { bp.set(x + 1, ay, z, B.TABLE); bp.set(x + 2, ay, z, B.STONE_BRICK_SLAB); bp.spot(x + 2, ay, z, 'seat'); lamp(bp, x + 3, ay, z, 2, B.LANTERN); }
    }
    for (let x = A.x0 + 1; x <= A.x1 - 1; x += 6) for (let z = A.z0 + 1; z <= A.z1 - 1; z += 6) bp.set(x, ay + ah, z, BLUE);
    for (let x = A.x0 + 6; x <= A.x1 - 6; x += 24) { statue(bp, x, ay, A.z1 - 1, [0, -1]); }
    bp.set(A.x0 + 1, ay, A.z1 - 1, B.CONSOLE); bp.work(A.x0 + 2, ay, A.z1 - 1, 'archivist');
    bp.set(A.x1 - 1, ay, A.z1 - 1, B.CONSOLE); bp.work(A.x1 - 2, ay, A.z1 - 1, 'archivist');
    bp.room('archives', A.x0, ay, A.z0, A.x1, A.z1);
    // doors from the ring corridor (south wall of the archives)
    doorway(bp, CX - 1, A.z1 + 1, CX, A.z1 + 1, ay, 4, BLUE);
    doorway(bp, c0 + 1, A.z1 + 1, c0 + 2, A.z1 + 1, ay, 3, BLUE);
    doorway(bp, c1 - 2, A.z1 + 1, c1 - 1, A.z1 + 1, ay, 3, BLUE);
    // the corridor cells in front of the archive doors on the upper archive floor (36) are part of floor 36
  }
  // south block: entrance hall for the sky-bridge door (floor 36), the great interior stair to tier 3, classrooms
  const S = { x0: T2.x0 + 2, z0: c1 + 3, x1: T2.x1 - 2, z1: T2.z1 - 2 };
  for (let f = 0; f < floors.length; f++) {
    const fy = floors[f];
    bp.fill(S.x0, fy - 1, S.z0, S.x1, fy - 1, S.z1, f === 0 ? STONE2 : PLATE);
    bp.fill(S.x0, fy, S.z0, S.x1, fy + 3, S.z1, AIR);
    // the hall opens north into the ring corridor
    bp.fill(70, fy - 1, c1 + 1, 97, fy - 1, c1 + 2, PLATE); bp.fill(70, fy, c1 + 1, 97, fy + 3, c1 + 2, AIR);
    bp.fill(S.x0, fy + 4, S.z0, S.x1, fy + 4, S.z1, STONE2);
    for (let x = S.x0 + 2; x <= S.x1; x += 4) for (let z = S.z0 + 2; z <= S.z1; z += 4) bp.set(x, fy + 4, z, GLOW);
    // rooms east and west of a central hall (x 70..97 stays open)
    const kindsW = ['school_room', 'library', 'meeting_room', 'holo_theatre'], kindsE = ['restaurant', 'kitchen', 'medbay', 'gym'];
    for (const [rx0, rx1, kinds, side] of [[S.x0 + 1, 66, kindsW, 'E'], [102, S.x1 - 1, kindsE, 'W']]) {
      let zi = S.z0 + 1, k = 0;
      while (zi + 8 <= S.z1 - 1) {
        const rz0 = zi, rz1 = Math.min(S.z1 - 1, zi + 8);
        if (!CORNERS.some(([cx, cz]) => rx1 >= cx && rx0 < cx + SPIRE && rz1 >= cz && rz0 < cz + SPIRE)) {
          hollow(bp, rx0 - 1, fy, rz0 - 1, rx1 + 1, fy + 3, rz1 + 1, STONE, f === 0 ? STONE2 : PLATE, STONE2);
          const kind = kinds[(k + f) % kinds.length];
          template(bp, rng, kind, kind, rx0, rz0, rx1, rz1, fy, side, 3, 2);
          if (side === 'E') doorway(bp, rx1 + 1, rz0 + 3, rx1 + 1, rz0 + 4, fy); else doorway(bp, rx0 - 1, rz0 + 3, rx0 - 1, rz0 + 4, fy);
          k++;
        }
        zi += 10;
      }
    }
    // hall floor pattern
    for (let x = 68; x <= 99; x++) for (let z = S.z0; z <= S.z1; z++) bp.set(x, fy - 1, z, (x === CX - 1 || x === CX) ? (z % 2 ? GLOW : B.PANEL_BLACK) : ((x + z) % 6 === 0 ? STONE : STONE2));
  }
  // the sky-bridge door in the tier-2 south wall at floor 36 (x 84..85), lit portal
  doorway(bp, CX - 1, T2.z1, CX, T2.z1, 36, 4, GLOW);
  bp.fill(CX - 1, 36, T2.z1 - 1, CX, 39, T2.z1 - 1, AIR); bp.fill(CX - 1, 35, T2.z1 - 1, CX, 35, T2.z1, PLATE);
  bp.fill(CX - 3, 36, T2.z1, CX - 2, 41, T2.z1, TRIM); bp.fill(CX + 1, 36, T2.z1, CX + 2, 41, T2.z1, TRIM);
  // grand interior stairs in the south hall: floor 26 -> 31 -> 36 -> 41 -> tier-3 floor 46 (6-wide flights)
  for (let f = 0; f < floors.length; f++) { const fy = floors[f]; stairZ(bp, 74, 79, S.z1 - 2, -1, fy, FLOOR_H); stairZ(bp, 88, 93, S.z1 - 2, -1, fy, FLOOR_H); bp.fill(74, fy + FLOOR_H, S.z1 - 2 * FLOOR_H - 3, 79, fy + FLOOR_H + 3, S.z1 - 2 * FLOOR_H - 5, AIR); bp.fill(88, fy + FLOOR_H, S.z1 - 2 * FLOOR_H - 3, 93, fy + FLOOR_H + 3, S.z1 - 2 * FLOOR_H - 5, AIR); }
  // east and west blocks between the archives and the south hall: quarters (E) and classrooms (W)
  for (const [bx0, bx1, kinds, side] of [[c1, T2.x1 - 2, ['hotel_room', 'hotel_room', 'barracks', 'lounge', 'restroom'], 'W'], [T2.x0 + 2, c0, ['school_room', 'meditation_chamber', 'library', 'clinic_ward', 'laundry'], 'E']]) {
    for (let f = 0; f < floors.length; f++) {
      const fy = floors[f];
      bp.fill(bx0, fy - 1, c0, bx1, fy - 1, c1, f === 0 ? STONE2 : PLATE);
      const rx0 = side === 'W' ? bx0 + 2 : bx0 + 1, rx1 = side === 'W' ? bx1 - 1 : bx1 - 2;
      let zi = c0 + 1, k = 0;
      while (zi + 8 <= c1 - 1) {
        const rz0 = zi, rz1 = zi + 8;
        if (!CORNERS.some(([cx, cz]) => rx1 >= cx && rx0 < cx + SPIRE && rz1 >= cz && rz0 < cz + SPIRE)) {
          hollow(bp, rx0 - 1, fy, rz0 - 1, rx1 + 1, fy + 3, rz1 + 1, STONE, f === 0 ? STONE2 : PLATE, STONE2);
          const kind = kinds[(k + f) % kinds.length];
          template(bp, rng, kind, kind, rx0, rz0, rx1, rz1, fy, side, 3, 2);
          if (side === 'W') doorway(bp, rx0 - 1, rz0 + 3, rx0 - 1, rz0 + 4, fy); else doorway(bp, rx1 + 1, rz0 + 3, rx1 + 1, rz0 + 4, fy);
          k++;
        }
        zi += 10;
      }
    }
  }
  // stairs from the tier-1 east/west wing corridors (floor 16 -> 21 -> 26) are provided by the wing lifts; add
  // a public stair from the rotunda floor to the gallery (two 3-wide flights on the north side)
}

// tier 3: Masters' level around the central spire: council annex, map room, refectory, offices, roof gardens
function tier3(bp, rng) {
  const floors = [56, 51, 46];   // top-down (see wings)
  const c0 = CENTRAL.x0 - 5, c1 = CENTRAL.x1 + 5;
  for (const fy of floors) {
    // ring corridor around the central spire
    for (const [ax0, az0, ax1, az1] of [[c0, c0, c1, c0 + 3], [c0, c1 - 3, c1, c1], [c0, c0, c0 + 3, c1], [c1 - 3, c0, c1, c1]]) {
      bp.fill(ax0, fy - 1, az0, ax1, fy - 1, az1, PLATE); bp.fill(ax0, fy, az0, ax1, fy + 3, az1, AIR); bp.fill(ax0, fy + 4, az0, ax1, fy + 4, az1, STONE2);
      for (let x = ax0 + 2; x <= ax1; x += 4) for (let z = az0 + 2; z <= az1; z += 4) bp.set(x, fy + 4, z, GLOW);
    }
    // rooms in the four blocks around the corridor
    const blocks = [
      [T3.x0 + 2, T3.z0 + 2, T3.x1 - 2, c0, 'S'], [T3.x0 + 2, c1, T3.x1 - 2, T3.z1 - 2, 'N'],
      [T3.x0 + 2, c0, c0, c1, 'E'], [c1, c0, T3.x1 - 2, c1, 'W'],
    ];
    const blocked = (rx0, rz0, rx1, rz1) => CORNERS.some(([cx, cz]) => rx1 >= cx - 1 && rx0 <= cx + SPIRE && rz1 >= cz - 1 && rz0 <= cz + SPIRE)
      || (rz1 > c1 && ((rx1 >= 73 && rx0 <= 80) || (rx1 >= 87 && rx0 <= 94)));
    const kinds = fy === 46 ? ['council_chamber', 'meeting_room', 'holo_theatre', 'executive_office', 'lounge'] : fy === 51 ? ['restaurant', 'kitchen', 'garden_terrace', 'library', 'executive_office'] : ['observation_deck', 'meditation_chamber', 'garden_terrace', 'archive', 'lounge'];
    let k = 0;
    for (const [bx0, bz0, bx1, bz1, side] of blocks) {
      bp.fill(bx0, fy - 1, bz0, bx1, fy - 1, bz1, PLATE);
      const alongX = side === 'N' || side === 'S';
      const len = alongX ? bx1 - bx0 : bz1 - bz0;
      for (let s = 0; s + 10 <= len + 1; s += 12) {
        const rx0 = alongX ? bx0 + s : bx0 + 1, rx1 = alongX ? Math.min(bx1, bx0 + s + 9) : bx1 - 1;
        const rz0 = alongX ? bz0 + 1 : bz0 + s, rz1 = alongX ? bz1 - 1 : Math.min(bz1, bz0 + s + 9);
        if (rx1 - rx0 < 5 || rz1 - rz0 < 5 || blocked(rx0, rz0, rx1, rz1)) continue;
        hollow(bp, rx0 - 1, fy, rz0 - 1, rx1 + 1, fy + 3, rz1 + 1, STONE, PLATE, STONE2);
        const kind = kinds[k % kinds.length]; k++;
        template(bp, rng, kind, kind, rx0, rz0, rx1, rz1, fy, side, 2, 2);
        if (side === 'S') doorway(bp, rx0 + 2, rz1 + 1, rx0 + 3, rz1 + 1, fy);
        else if (side === 'N') doorway(bp, rx0 + 2, rz0 - 1, rx0 + 3, rz0 - 1, fy);
        else if (side === 'E') doorway(bp, rx1 + 1, rz0 + 2, rx1 + 1, rz0 + 3, fy);
        else doorway(bp, rx0 - 1, rz0 + 2, rx0 - 1, rz0 + 3, fy);
      }
    }
    // windows in the tier-3 outer walls at this floor
    for (let x = T3.x0 + 2; x <= T3.x1 - 2; x += 2) { bp.set(x, fy + 2, T3.z0, B.WINDOW_LIT); bp.set(x, fy + 2, T3.z1, B.WINDOW_LIT); }
    for (let z = T3.z0 + 2; z <= T3.z1 - 2; z += 2) { bp.set(T3.x0, fy + 2, z, B.WINDOW_LIT); bp.set(T3.x1, fy + 2, z, B.WINDOW_LIT); }
  }
  // stairs 41 -> 46 arrive from tier 2's south hall (x 74..79 / 88..93); continue 46 -> 51 -> 56 in the south corridor
  for (const fy of [46, 51]) { stairZ(bp, c0 + 1, c0 + 2, c1 - 1, -1, fy, FLOOR_H); bp.fill(c0 + 1, fy + FLOOR_H, c1 - 2 * FLOOR_H - 1, c0 + 2, fy + FLOOR_H + 3, c1 - 2 * FLOOR_H - 3, AIR); }
  // openings from the tier-2 stair landings (y 46 at z ~ 118) into the tier-3 south corridor: the flights end at
  // z = T2.z1 - 2 - 2*5*4 = 106; carve a lit passage from there north to the corridor at c1 = 98
  bp.fill(74, 46, c1 + 1, 79, 49, T3.z1, AIR); bp.fill(88, 46, c1 + 1, 93, 49, T3.z1, AIR);
  bp.fill(74, 45, c1 + 1, 79, 45, T3.z1, PLATE); bp.fill(88, 45, c1 + 1, 93, 45, T3.z1, PLATE);
  bp.fill(74, 50, c1 + 1, 79, 50, T3.z1, STONE2); bp.fill(88, 50, c1 + 1, 93, 50, T3.z1, STONE2);
  for (let z = c1 + 2; z <= T3.z1; z += 3) { bp.set(76, 50, z, GLOW); bp.set(90, 50, z, GLOW); }
  for (const x of [73, 80, 87, 94]) for (let z = c1 + 1; z <= T3.z1; z += 2) bp.set(x, 48, z, B.WINDOW_LIT);
}

// sky bridge from the boulevard gangway at the lot's south edge (y 35 / walk 36) over the tier-1 roof to the
// tier-2 south door; the undercity forecourt with the Avenue gate; the outer grand stairs up the south face
function approaches(bp, lot) {
  const dx = lot.door.x - lot.x0;               // 84
  // forecourt at y 0..1: paved plaza between the lot edge and the tier-1 wall with lamp posts and planters
  for (let x = 0; x < bp.w; x++) for (let z = T1.z1 + 1; z < bp.d; z++) bp.set(x, 0, z, ((x + z) % 5 === 0) ? STONE : STONE2);
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < T1.z0; z++) bp.set(x, 0, z, ((x + z) % 5 === 0) ? STONE : STONE2);
  for (let z = 0; z < bp.d; z++) for (const x of [0, 1, 2, 3, 4, 5, 162, 163, 164, 165, 166, 167]) if (bp.get(x, 0, z) === 0) bp.set(x, 0, z, ((x + z) % 5 === 0) ? STONE : STONE2);
  for (let x = 8; x < bp.w - 8; x += 16) { lamp(bp, x, 1, T1.z1 + 3, 3, B.CITY_LAMP); lamp(bp, x, 1, T1.z0 - 3, 3, B.CITY_LAMP); }
  // gate at the lot door: two chrome pylons with beacons framing the 2-wide door cells (kept open)
  bp.fill(dx - 2, 1, bp.d - 1, dx - 2, 6, bp.d - 1, TRIM); bp.fill(dx + 3, 1, bp.d - 1, dx + 3, 6, bp.d - 1, TRIM);
  bp.set(dx - 2, 7, bp.d - 1, BLUE); bp.set(dx + 3, 7, bp.d - 1, BLUE);
  bp.door(dx, 1, bp.d - 1, 'S');
  // avenue of statues from the gate to the portal
  for (let z = T1.z1 + 2; z <= bp.d - 3; z += 2) { statue(bp, dx - 5, 1, z, [1, 0]); statue(bp, dx + 6, 1, z, [-1, 0]); }
  // sky bridge: 6 wide deck at y 35 from the lot edge to the tier-2 door, railings, lamps; piers down to the roof
  const bx0 = dx - 3, bx1 = dx + 4;
  bp.fill(bx0, 35, T2.z1 + 1, bx1, 35, bp.d - 1, PLATE);
  bp.fill(bx0 + 1, 35, T2.z1 + 1, bx1 - 1, 35, bp.d - 1, B.DECK_PLATE);
  bp.fill(bx0, 36, T2.z1 + 1, bx0, 36, bp.d - 1, B.IRON_BARS); bp.fill(bx1, 36, T2.z1 + 1, bx1, 36, bp.d - 1, B.IRON_BARS);
  bp.fill(bx0 + 1, 36, T2.z1 + 1, bx1 - 1, 40, bp.d - 1, AIR);
  for (let z = T2.z1 + 4; z <= bp.d - 2; z += 6) { lamp(bp, bx0, 37, z, 1, B.CITY_LAMP); lamp(bp, bx1, 37, z, 1, B.CITY_LAMP); }
  for (let z = T1.z1 + 3; z <= bp.d - 3; z += 8) { bp.fill(bx0, 1, z, bx0, 34, z, STONE2); bp.fill(bx1, 1, z, bx1, 34, z, STONE2); }
  for (let z = T2.z1 + 2; z <= T1.z1; z += 8) { bp.fill(bx0, T1.roof + 1, z, bx0, 34, z, STONE2); bp.fill(bx1, T1.roof + 1, z, bx1, 34, z, STONE2); }
  bp.door(dx, 36, bp.d - 1, 'S');
  // outer grand stairs: two 4-wide flights along the south face (x 8 -> 57 and x 159 -> 110) from the forecourt up to
  // the tier-1 roof terrace, each ending on a landing that bridges to the roof through an opened parapet
  stairX(bp, T1.z1 + 2, T1.z1 + 5, 8, 1, 1, T1.roof);
  stairX(bp, T1.z1 + 2, T1.z1 + 5, 159, -1, 1, T1.roof);
  for (const [lx0, lx1] of [[57, 61], [106, 110]]) {
    bp.fill(lx0, T1.roof, T1.z1 - 1, lx1, T1.roof, T1.z1 + 5, PLATE);
    bp.fill(lx0, T1.roof + 1, T1.z1 - 1, lx1, T1.roof + 4, T1.z1 + 5, AIR);
    bp.fill(lx0 - 1, T1.roof + 1, T1.z1 + 1, lx0 - 1, T1.roof + 1, T1.z1 + 5, B.IRON_BARS); bp.fill(lx1 + 1, T1.roof + 1, T1.z1 + 1, lx1 + 1, T1.roof + 1, T1.z1 + 5, B.IRON_BARS);
    lamp(bp, lx0 - 1, T1.roof + 1, T1.z1 + 5, 2, B.CITY_LAMP); lamp(bp, lx1 + 1, T1.roof + 1, T1.z1 + 5, 2, B.CITY_LAMP);
  }
  // terrace stairs along the tier walls (west and east strips), landings bridging to the next roof
  for (const [t, tn, xs, xe] of [[T1, T2, [T1.x0 + 3, T1.x0 + 6], [T1.x1 - 6, T1.x1 - 3]], [T2, T3, [T2.x0 + 3, T2.x0 + 6], [T2.x1 - 6, T2.x1 - 3]]]) {
    const rise = tn.roof - t.roof, z0 = tn.z0 + 2;
    for (const [x0, x1] of [xs, xe]) {
      stairZ(bp, x0, x1, z0, 1, t.roof + 1, rise);
      const zl = z0 + rise * 2, west = x0 < CX;
      const bx0 = west ? x0 : tn.x1 + 1, bx1 = west ? tn.x0 - 1 : x1;
      bp.fill(Math.min(bx0, x0), tn.roof, zl, Math.max(bx1, x1), tn.roof, zl + 3, PLATE);
      bp.fill(Math.min(bx0, x0), tn.roof + 1, zl, Math.max(bx1, x1), tn.roof + 4, zl + 3, AIR);
      bp.fill(west ? tn.x0 : tn.x1, tn.roof + 1, zl, west ? tn.x0 : tn.x1, tn.roof + 4, zl + 3, AIR);   // parapet + wall edge opened
      bp.fill(Math.min(bx0, x0), tn.roof + 1, zl - 1, Math.max(bx1, x1), tn.roof + 1, zl - 1, B.IRON_BARS);
      bp.fill(Math.min(bx0, x0), tn.roof + 1, zl + 4, Math.max(bx1, x1), tn.roof + 1, zl + 4, B.IRON_BARS);
    }
  }
  // doors from the terraces into the tiers (tier-2 east/west at floor 26, tier-3 east/west at floor 46)
  doorway(bp, T2.x0, 84, T2.x0, 85, 26); doorway(bp, T2.x1, 84, T2.x1, 85, 26);
  doorway(bp, T3.x0, 84, T3.x0, 85, 46); doorway(bp, T3.x1, 84, T3.x1, 85, 46);
  // corridors from those doors to the ring corridors (tier 2: x 20..c0; tier 3: x 34..CENTRAL.x0-5)
  bp.fill(T2.x0 + 1, 26, 83, CX - ROT_R - 6, 29, 86, AIR); bp.fill(CX + ROT_R + 5, 26, 83, T2.x1 - 1, 29, 86, AIR);
  bp.fill(T2.x0 + 1, 25, 83, T2.x1 - 1, 25, 86, PLATE);
  bp.fill(T3.x0 + 1, 46, 83, CENTRAL.x0 - 5, 49, 86, AIR); bp.fill(CENTRAL.x1 + 5, 46, 83, T3.x1 - 1, 49, 86, AIR);
  bp.fill(T3.x0 + 1, 45, 83, T3.x1 - 1, 45, 86, PLATE);
  for (let x = T2.x0 + 3; x <= T2.x1 - 3; x += 4) bp.set(x, 30, 84, GLOW);
  for (let x = T3.x0 + 3; x <= T3.x1 - 3; x += 4) bp.set(x, 50, 84, GLOW);
}

// lift exits from a corner pier at every floor: the north piers open south into the garden / archives / tier-3
// rooms, the south piers open toward the tier-1 wing corridors (x 61..64 / 104..107), the tier-2 south hall and
// the tier-3 ring corridor; each exit is a lit 2-wide passage with a floor
function pierExits(bp, k, lx, lz, ox, oz) {
  const north = oz < CZ, west = ox < CX;
  for (const y of [1, 6, 11, 16, 26, 31, 36, 41, 46, 51, 56]) {
    let cells;
    if (north) {
      // south face: passage from the shaft to just outside the pier (garden floor at 1, archives at 26/36, tier 3 at 46..56)
      if ([6, 11, 16, 31, 41].includes(y)) continue;
      const zEnd = y >= 46 ? (CX - ROT_R - 6) + 3 + 3 : oz + SPIRE + 1;   // tier 3: reach the ring corridor's north band
      const zTo = y >= 46 ? (CENTRAL.z0 - 5) : zEnd;
      cells = { x0: lx, x1: lx + 1, z0: lz + 2, z1: zTo };
    } else {
      // west face (SW pier) or east face (SE pier) toward the wing corridor / south hall / tier-3 corridor
      const xTo = y <= 16 ? (west ? 61 : 107) : y <= 41 ? (west ? 67 : 100) : (west ? CENTRAL.x0 - 5 : CENTRAL.x1 + 5);
      cells = west ? { x0: ox + SPIRE - 4 + 2, x1: xTo, z0: lz, z1: lz + 1 } : { x0: xTo, x1: ox + SPIRE - 4 - 1, z0: lz, z1: lz + 1 };
      if (west) cells.x0 = lx + 2; else cells.x1 = lx - 1;
    }
    const { x0, x1, z0, z1 } = cells;
    const ax0 = Math.min(x0, x1), ax1 = Math.max(x0, x1), az0 = Math.min(z0, z1), az1 = Math.max(z0, z1);
    bp.fill(ax0, y - 1, az0, ax1, y - 1, az1, PLATE);
    bp.fill(ax0, y, az0, ax1, y + 2, az1, AIR);
    bp.fill(ax0, y + 3, az0, ax1, y + 3, az1, STONE2);
    if (north) bp.set(lx, y + 3, lz + 3, BLUE); else bp.set(west ? lx + 2 : lx - 1, y + 3, lz, BLUE);
    for (let x = ax0; x <= ax1; x += 3) for (let z = az0; z <= az1; z += 3) bp.set(x, y + 3, z, GLOW);
  }
}

// ------------------------------------------------------------------------------------------------ module
export const LANDMARK = {
  id: 'temple', name: 'Jedi Temple', span: [3, 3], height: 190,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    const top = Math.min(bp.h - 6, 185);
    bp.meta.name = 'Jedi Temple';
    // plateau repaved under the whole lot, then the massing
    bp.fill(0, 0, 0, bp.w - 1, 0, bp.d - 1, STONE2);
    tierShell(bp, T1, rng); tierShell(bp, T2, rng); tierShell(bp, T3, rng);
    // interiors (carved out of the solid tiers)
    greatHall(bp, rng);
    fountains(bp, rng);
    hangar(bp, rng);
    wings(bp, rng);
    tier2(bp, rng);
    tier3(bp, rng);
    rotunda(bp, rng);
    // spires last so their piers cut through the halls below
    for (let k = 0; k < CORNERS.length; k++) {
      const [ox, oz] = CORNERS[k];
      // solid pier through the tiers with a lift from the ground to the spire
      bp.fill(ox, 1, oz, ox + SPIRE - 1, T3.roof, oz + SPIRE - 1, STONE);
      for (let y = 1; y <= T3.roof; y++) for (const [x, z] of [[ox, oz], [ox + SPIRE - 1, oz], [ox, oz + SPIRE - 1], [ox + SPIRE - 1, oz + SPIRE - 1]]) bp.set(x, y, z, y % FLOOR_H === 0 ? TRIM : STONE2);
      spire(bp, rng, ox, oz, top - 32, k === 2);
      // ground-to-spire lift inside the pier (2x2 in the +x+z corner, same column as the spire lift) with doors at
      // every wing/tier floor level facing the nearest corridor
      const lx = ox + SPIRE - 4, lz = oz + SPIRE - 4;
      bp.fill(lx - 1, 0, lz - 1, lx + 2, T3.roof, lz + 2, B.PANEL_BLACK);
      bp.fill(lx, 1, lz, lx + 1, T3.roof, lz + 1, AIR);
      bp.lift(lx, lz, 1, T3.roof + 1);
      pierExits(bp, k, lx, lz, ox, oz);
    }
    centralSpire(bp, rng, top);
    approaches(bp, lot);
    // metadata: lobby in the great hall, floors list
    bp.meta.lobby = { x: lot.x0 + CX, y: bp.y0 + 1, z: lot.z0 + T1.z1 - 6 };
    bp.meta.floors = [1, 6, 11, 16, 26, 31, 36, 41, 46, 51, 56].map((y) => bp.y0 + y);
  },
};
