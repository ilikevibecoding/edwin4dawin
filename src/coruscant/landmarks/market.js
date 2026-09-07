// CoCo Town market halls — Coruscant signature landmark (docs/rubrics/06_landmarks.md, id 'market').
//
// Four long covered market halls (two either side) with arched STEEL_GLASS skylight roofs on DURASTEEL ribs, joined
// by a taller central food court under its own glass vault. Every hall has an upper gallery walkway (y 5, walk 6)
// running around it behind OAK_FENCE railings, reached by wide half-step stairs at both ends; the galleries connect
// through the party walls and onto the food court's north and south balconies. A two-storey service block closes
// the north side (loading yard, storage, hologame arcade, restrooms, cold store, office, workshop below; canteen,
// lounge, control room, dormitory above) under a flat roof of vents and water tanks. The security post and the
// clinic flank the main entrance under the south balcony bar.
//
// Local frame: x 0..134 (west -> east), z 0..97 (north -> south, front = S), y 0 = repaved plateau, walk y 1.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AW = [B.RED_WOOL, B.WHITE_WOOL, B.BLUE_WOOL, B.GREEN_WOOL];
const STEP_FULL = B.STONE_BRICKS, STEP_SLAB = B.STONE_BRICK_SLAB;
const SEAT = B.STONE_BRICK_SLAB;

// ------------------------------------------------------------------------------------------------ plan constants
// interior x ranges of the halls (party walls at xa-1 / xb+1) and of the court
const HALLS = [
  { xa: 2, xb: 24, west: 'outer', east: 'party' },
  { xa: 26, xb: 49, west: 'party', east: 'court' },
  { xa: 85, xb: 108, west: 'court', east: 'party' },
  { xa: 110, xb: 132, west: 'party', east: 'outer' },
];
const COURT = { xa: 51, xb: 83 };
const ZN = 15, ZS = 94;            // nave interior z (walls at 14 and 95)
const ZCS = 96;                    // court interior south end (facade at 97)
const ZSB0 = 1, ZSB1 = 14;         // service block walls
const EAVE_H = 14, RISE_H = 7;     // hall vault: nominal eaves, rise
const EAVE_C = 16, RISE_C = 8;     // court vault
const GAL = 5;                     // gallery slab y (walk 6)
const ROOF = 10;                   // service block roof slab
const SLOT0 = 18, NSLOT = 18;      // stall grid along z: post at 18 + 4k, stall cells +1..+3 (k = 0..17)
const XAISLE = 8;                  // cross aisle slot (k = 8 -> z 51..53)
const SOUTH_STAIR0 = 82;           // south stairs climb from z 82 to 91, north stairs from 27 down to 18
// west cell of a hall's 2-wide gable door: centred in the middle aisle
const hallDoorX = (h) => { const a0 = h.xa + 10, a1 = h.xb - 10; return a0 + ((a1 - a0 + 1) >> 1) - 1; };

// elliptical vault profile: roof block height for a column at distance d from the centre line
function vaultY(d, hw, eave, rise) {
  const t = d / (hw + 0.5);
  return eave + Math.round(rise * Math.sqrt(Math.max(0, 1 - t * t)));
}
const hallRoof = (h) => { const cx = (h.xa + h.xb) / 2, hw = (h.xb - h.xa) / 2; return (x) => vaultY(Math.abs(x - cx), hw, EAVE_H, RISE_H); };
const courtRoof = () => { const cx = (COURT.xa + COURT.xb) / 2, hw = (COURT.xb - COURT.xa) / 2; return (x) => vaultY(Math.abs(x - cx), hw, EAVE_C, RISE_C); };

// ------------------------------------------------------------------------------------------------ wall patterns
// outer facade: plinth, lit shopfront windows, hull-plate spandrel, stripe band, brick gallery storey with lit /
// dark windows, sandstone string course, stone clerestory with tinted glass, dark eaves; durasteel pilasters every 4
function facade(a, y, top) {
  if (y >= top) return B.DURASTEEL;
  if ((a & 3) === 0) return y === top - 1 ? B.CHROME : B.DURASTEEL;
  switch (y) {
    case 1: return B.DURASTEEL_DARK;
    case 2: case 3: return B.WINDOW_LIT;
    case 4: return B.HULL_PLATE;
    case 5: return B.PANEL_STRIPE;
    case 6: return B.BRICKS;
    case 7: case 8: return (a & 3) === 2 ? B.WINDOW_LIT : B.WINDOW_DARK;
    case 9: return B.SANDSTONE;
    case 10: return B.STONE_BRICKS;
    default: return y <= 13 ? B.STEEL_GLASS : B.DURASTEEL_DARK;
  }
}
// party / court walls seen from inside the halls: brick with holo adverts over the stall racks, stripe band at the
// gallery slab, sandstone gallery storey, red/holo banner band, lit clerestory where the wall rises above a roof
function inner(a, y, top) {
  if (y >= top) return B.DURASTEEL;
  if ((a & 3) === 0) return B.DURASTEEL;
  switch (y) {
    case 1: return B.DURASTEEL_DARK;
    case 2: return B.BRICKS;
    case 3: return (a & 7) === 2 ? B.HOLO_SIGN : B.BRICKS;
    case 4: return B.BRICKS;
    case 5: return B.PANEL_STRIPE;
    case 6: case 7: case 8: return B.SANDSTONE;
    case 9: return B.STONE_BRICKS;
    case 10: return (a & 3) === 2 ? B.HOLO_SIGN : B.PANEL_RED;
    case 11: return B.PANEL_BLACK;
    default: return y >= top - 2 ? B.WINDOW_LIT : B.STONE_BRICKS;
  }
}
// service block partitions: plaster with dark durasteel pilasters and a stripe course at the floor slab
function partition(a, y) {
  if ((a & 3) === 0) return B.DURASTEEL_DARK;
  if (y === 5 || y === 1) return B.PANEL_STRIPE;
  return B.PLASTER;
}
// walls facing the loading yard: hull plating over a trench course, hazard band at truck height, durasteel slab
// line, the upper offices' lit windows, dark pilasters every 4
function dockWall(a, y) {
  if ((a & 3) === 0) return B.DURASTEEL_DARK;
  switch (y) {
    case 1: return B.HULL_TRENCH;
    case 4: return B.PANEL_STRIPE;
    case 5: return B.DURASTEEL;
    case 7: case 8: return B.WINDOW_LIT;
    default: return B.HULL_PLATE;
  }
}
// gable above the eaves: tinted glass in a durasteel frame, lit window bands where the gable sits over a flat roof
function gableBlock(a, y, eave, top) {
  if (y >= top) return B.DURASTEEL;
  if ((a & 3) === 0) return B.DURASTEEL;
  if (y > eave) return B.STEEL_GLASS;
  return y === 11 || y === 13 ? B.STEEL_GLASS : B.WINDOW_LIT;
}

// ------------------------------------------------------------------------------------------------ small helpers
// half-step stairs (slab, full, slab, ...): step i sits at z0 + dz*i; ten steps climb five blocks from walk level y0
function stairsZ(bp, xa, xb, z0, dz, y0, n) {
  for (let i = 0; i < n; i++) {
    const z = z0 + dz * i, nf = Math.floor((i + 1) / 2);
    if (nf > 0) bp.fill(xa, y0, z, xb, y0 + nf - 1, z, STEP_FULL);
    if ((i + 1) & 1) bp.fill(xa, y0 + nf, z, xb, y0 + nf, z, STEP_SLAB);
  }
}
function lampPost(bp, x, z, y0, h = 3, lamp = B.CITY_LAMP) { bp.fill(x, y0, z, x, y0 + h - 1, z, B.IRON_BARS); bp.set(x, y0 + h, z, lamp); }
function planter(bp, x, z, y0, leaf = B.OAK_LEAVES) { bp.set(x, y0, z, B.DURASTEEL_DARK); bp.set(x, y0 + 1, z, leaf); }
function totem(bp, x, z, y0) { bp.set(x, y0, z, B.PANEL_BLACK); bp.set(x, y0 + 1, z, B.HOLO_SIGN); bp.set(x, y0 + 2, z, B.HOLO_SIGN); }
// 2-wide door opening (h high) in a wall cell run, chrome jambs, lit lintel
function doorway(bp, x0, z0, x1, z1, y0, h, lintel = B.GLOW_PANEL) {
  bp.fill(x0, y0, z0, x1, y0 + h - 1, z1, FORCE_AIR);
  const alongX = z0 === z1;
  if (alongX) { bp.fill(x0 - 1, y0, z0, x0 - 1, y0 + h, z0, B.CHROME); bp.fill(x1 + 1, y0, z0, x1 + 1, y0 + h, z0, B.CHROME); bp.fill(x0, y0 + h, z0, x1, y0 + h, z0, lintel); }
  else { bp.fill(x0, y0, z0 - 1, x0, y0 + h, z0 - 1, B.CHROME); bp.fill(x0, y0, z1 + 1, x0, y0 + h, z1 + 1, B.CHROME); bp.fill(x0, y0 + h, z0, x0, y0 + h, z1, lintel); }
}
// arch: 3 wide opening with chrome jambs (ground: 4 high; gallery: 3 high) through a wall running along z
function archX(bp, x, z0, y0, h) { bp.fill(x, y0, z0, x, y0 + h - 1, z0 + 2, FORCE_AIR); bp.fill(x, y0, z0 - 1, x, y0 + h - 1, z0 - 1, B.CHROME); bp.fill(x, y0, z0 + 3, x, y0 + h - 1, z0 + 3, B.CHROME); }
// furnish a room from the shared template library inside a Room frame; the rect registered includes the walls
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW }, kind, {});
  ROOMS[name].fn(r, rng, {});
  r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}

// ------------------------------------------------------------------------------------------------ stall trades
// every trade has a room kind: the first stall of each trade is registered as a kiosk room (counter, vendor row and
// the aisle cell in front) so the market-arcade program (rooms/programs.js kiosk kinds) can find its vendors
const TRADES = [
  { kind: 'produce_kiosk', counter: B.CRATE, goods: [B.PUMPKIN, B.HAY_BALE, B.PUMPKIN, B.CRATE], rack: B.HAY_BALE },          // produce
  { kind: 'grain_kiosk', counter: B.CRATE, goods: [B.WHEAT, B.CRATE, B.WHEAT, B.HAY_BALE], rack: B.CRATE },               // grain
  { kind: 'textile_kiosk', counter: B.TABLE, goods: [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL], rack: B.WHITE_WOOL }, // fabrics
  { kind: 'mechanical_kiosk', counter: B.IRON_BLOCK, goods: [B.ANVIL, B.CONSOLE, B.VENT, B.IRON_BARS], rack: B.CRATE },        // speeder parts
  { kind: 'navigation_kiosk', counter: B.BOOKSHELF, goods: [B.HOLO_SIGN, B.CHEST, B.BOOKSHELF, 0], rack: B.BOOKSHELF },        // holobooks, charts and data
  { kind: 'spice_kiosk', counter: B.BARREL, goods: [B.SHELF, B.GOLD_BLOCK, B.SHELF, B.BARREL], rack: B.SHELF },           // spices, drinks
  { kind: 'flower_kiosk', counter: B.TABLE, goods: [B.POPPY, B.DANDELION, B.OAK_LEAVES, B.TALL_GRASS], rack: B.OAK_LEAVES }, // flowers
  { kind: 'salvage_kiosk', counter: B.DURASTEEL_DARK, goods: [B.CHROME, B.IRON_BARS, B.GLASS, B.CONSOLE], rack: B.IRON_BLOCK }, // droid scrap
  { kind: 'fish_kiosk', counter: B.CRATE, goods: [B.SNOW, B.BARREL, B.SNOW, B.CHEST], rack: B.BARREL },                  // fish on ice
  { kind: 'jewellery_kiosk', counter: B.SANDSTONE, goods: [B.GOLD_BLOCK, B.CHROME, B.GLASS, B.GOLD_BLOCK], rack: B.SHELF },    // jewellery
  { kind: 'appliance_kiosk', counter: B.PANEL_BLACK, goods: [B.FURNACE, B.TROUGH, B.CONSOLE, B.CHEST], rack: B.SHELF },   // domestic equipment
];
let kioskRooms = new Set();

// A 3-wide stall in the slot whose post cell is z0: counter at x = xc facing the aisle at xc + dx, vendor behind,
// wool awning at y 4 over the counter and vendor rows (and the rack row of wall stalls), a holo price board
// hanging over the aisle edge at y 3, 3-high fence posts with lanterns on top.
function stall(bp, rng, xc, z0, dx, colour, opts = {}) {
  const t = rng.pick(TRADES);
  if (!kioskRooms.has(t.kind)) { kioskRooms.add(t.kind); bp.room(t.kind, Math.min(xc - dx, xc + dx), 1, z0 + 1, Math.max(xc - dx, xc + dx), z0 + 3); }
  bp.fill(xc, 1, z0, xc, 3, z0, B.OAK_FENCE); bp.fill(xc, 1, z0 + 4, xc, 3, z0 + 4, B.OAK_FENCE);
  const back = opts.rackX !== undefined ? opts.rackX : xc - dx;
  for (let z = z0 + 1; z <= z0 + 3; z++) {
    bp.set(xc, 1, z, t.counter);
    const g = t.goods[rng.int(0, t.goods.length - 1)];
    if (g && !(z === z0 + 2 && rng.chance(0.25))) bp.set(xc, 2, z, g);
    for (let x = Math.min(xc, back); x <= Math.max(xc, back); x++) bp.set(x, 4, z, colour);
  }
  bp.set(xc, 3, z0 + 2, B.LANTERN);   // the stall's own lamp, hung under the awning over the counter
  bp.set(xc + dx, 3, z0 + 2, B.HOLO_SIGN);
  if (opts.rackX !== undefined) {
    // wall stall: shelving against the wall behind the vendor, a barrel in the post column, ad or lamp over the rack
    bp.fill(opts.rackX, 1, z0 + 1, opts.rackX, 2, z0 + 3, t.rack);
    bp.set(opts.rackX, 1, z0, B.BARREL);
    if (rng.chance(0.4)) bp.set(opts.rackX, 3, z0 + 2, rng.chance(0.5) ? B.HOLO_SIGN : B.LANTERN);
    bp.set(xc + dx, 4, z0, B.LANTERN);
  } else if (opts.divider) {
    bp.fill(xc - dx, 1, z0, xc - dx, 2, z0, rng.chance(0.5) ? B.CRATE : B.BARREL);
  }
  if (opts.postLamp) bp.set(xc, 4, z0, B.LANTERN);
  bp.work(xc - dx, 1, z0 + 2, 'vendor');
  bp.spot(xc + 2 * dx, 1, z0 + 2, 'shopper');
}

// stacked bulk goods (used beside the stairs and at row ends)
function cargoStack(bp, rng, x0, z0, x1, z1, y0, pool) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (rng.chance(0.2)) continue;
    const id = rng.pick(pool);
    bp.set(x, y0, z, id);
    if (rng.chance(0.5)) bp.set(x, y0 + 1, z, rng.pick(pool));
    if (rng.chance(0.15)) bp.set(x, y0 + 2, z, id);
  }
}

// ================================================================================================ build
export const LANDMARK = {
  id: 'market', name: 'CoCo Town market halls', span: [3, 2], height: 25, minW: 130, minD: 95,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'CoCo Town market halls';
    kioskRooms = new Set();
    pave(bp);
    shell(bp);
    serviceBlock(bp, rng);
    for (const h of HALLS) hall(bp, rng, h);
    court(bp, rng);
    yard(bp, rng);
    rooftop(bp, rng);
    southFront(bp);
    entrances(bp, lot);
  },
};

// ------------------------------------------------------------------------------------------------ ground
function pave(bp) {
  const W = bp.w, D = bp.d;
  bp.fill(0, 0, 0, W - 1, 0, D - 1, B.SMOOTH_STONE);
  // pavement margin round the lot with dark seams every 8
  for (let x = 0; x < W; x++) for (const z of [0, D - 1, D - 2]) bp.set(x, 0, z, (x & 7) === 0 ? B.DURASTEEL_DARK : B.DECK_PLATE);
  for (let z = 0; z < D; z++) for (const x of [0, W - 1]) bp.set(x, 0, z, (z & 7) === 0 ? B.DURASTEEL_DARK : B.DECK_PLATE);
  // approach lamps flanking each hall door and lit paving dots leading to the doors
  for (const h of HALLS) { const xd = hallDoorX(h); lampPost(bp, xd - 7, D - 1, 1); lampPost(bp, xd + 8, D - 1, 1); }
  for (let x = 51; x <= 83; x += 4) bp.set(x, 0, D - 1, B.GLOW_PANEL);
  for (const h of HALLS) { const xd = hallDoorX(h); bp.fill(xd, 0, D - 2, xd + 1, 0, D - 1, B.GLOW_PANEL); }
}

// ------------------------------------------------------------------------------------------------ shell
function shell(bp) {
  const W = bp.w;
  // --- outer west / east walls beside the halls
  const yrH = HALLS.map(hallRoof);
  const topH = (h) => hallRoof(h)(h.xa);           // wall top = roof height at the edge column
  const tW = topH(HALLS[0]), tE = topH(HALLS[3]);
  for (let z = ZSB1; z <= ZS + 1; z++) {
    for (let y = 1; y <= tW; y++) bp.set(1, y, z, facade(z, y, tW));
    for (let y = 1; y <= tE; y++) bp.set(W - 2, y, z, facade(z, y, tE));
  }
  // buttresses with lamps on the outer walls
  for (let z = ZN + 1; z <= ZS; z += 8) {
    bp.fill(0, 1, z, 0, tW - 3, z, B.DURASTEEL_DARK); bp.set(0, tW - 2, z, B.CITY_LAMP);
    bp.fill(W - 1, 1, z, W - 1, tE - 3, z, B.DURASTEEL_DARK); bp.set(W - 1, tE - 2, z, B.CITY_LAMP);
  }
  // --- south facade: hall gables at z 95, court gable at z 97
  for (const h of HALLS) {
    const yr = hallRoof(h);
    for (let x = h.xa; x <= h.xb; x++) {
      const top = yr(x);
      for (let y = 1; y <= top; y++) bp.set(x, y, ZS + 1, y > EAVE_H ? gableBlock(x, y, EAVE_H, top) : facade(x, y, EAVE_H + 1));
    }
  }
  const yrC = courtRoof();
  for (let x = COURT.xa; x <= COURT.xb; x++) {
    const top = yrC(x);
    for (let y = 1; y <= top; y++) bp.set(x, y, ZCS + 1, y > EAVE_C ? gableBlock(x, y, EAVE_C, top) : y > 10 ? ((x & 3) === 0 ? B.DURASTEEL : B.STEEL_GLASS) : facade(x, y, 99));
  }
  // marquee band over the doors, lit at night
  bp.fill(57, 5, ZCS + 1, 77, 6, ZCS + 1, B.HOLO_SIGN);
  bp.fill(55, 5, ZCS + 1, 56, 6, ZCS + 1, B.CITY_LAMP); bp.fill(78, 5, ZCS + 1, 79, 6, ZCS + 1, B.CITY_LAMP);
  // --- party walls between halls and the court walls (z 14 .. 95 / 97); court walls also partition the service block
  const partyTop = (h) => hallRoof(h)(h.xb);
  for (const [x, top] of [[HALLS[0].xb + 1, partyTop(HALLS[0])], [HALLS[2].xb + 1, partyTop(HALLS[2])]]) {
    for (let z = ZSB1; z <= ZS + 1; z++) for (let y = 1; y <= top; y++) bp.set(x, y, z, inner(z, y, top));
  }
  // durasteel corner posts where the outer / party walls meet the gable line
  for (const [x, top] of [[1, tW], [W - 2, tE], [HALLS[0].xb + 1, partyTop(HALLS[0])], [HALLS[2].xb + 1, partyTop(HALLS[2])]]) bp.fill(x, 1, ZS + 1, x, top, ZS + 1, B.DURASTEEL);
  const topC = yrC(COURT.xa);
  for (const x of [COURT.xa - 1, COURT.xb + 1]) {
    for (let z = ZSB0; z <= ZCS + 1; z++) {
      const top = z <= ZSB1 ? ROOF : topC;
      for (let y = 1; y <= top; y++) bp.set(x, y, z, z < ZSB1 ? partition(z, y) : inner(z, y, top));
    }
  }
  // pilaster corners where the court flank meets the hall gable line
  for (const x of [COURT.xa - 1, COURT.xb + 1]) bp.fill(x, 1, ZS + 1, x, topC, ZCS + 1, B.DURASTEEL);
  // --- north wall of the naves (z 14): partition storey, then exposed gables above the service block roof
  for (const h of HALLS) {
    const yr = hallRoof(h);
    for (let x = h.xa; x <= h.xb; x++) {
      const top = yr(x);
      const yardSide = x <= 37;
      for (let y = 1; y <= top; y++) bp.set(x, y, ZSB1, y <= ROOF ? (yardSide ? dockWall(x, y) : partition(x, y)) : gableBlock(x, y, EAVE_H, top));
      bp.set(x, 5, ZSB1, yardSide ? B.DURASTEEL : B.PANEL_STRIPE);
    }
  }
  for (let x = COURT.xa; x <= COURT.xb; x++) {
    const top = yrC(x);
    for (let y = 1; y <= top; y++) bp.set(x, y, ZSB1, y <= ROOF ? partition(x, y) : gableBlock(x, y, EAVE_C, top));
  }
  for (const x of [1, HALLS[0].xb + 1, HALLS[2].xb + 1, W - 2]) bp.fill(x, 1, ZSB1, x, ROOF + 1, ZSB1, B.DURASTEEL);
  // --- vaults
  for (const h of HALLS) vault(bp, h.xa, h.xb, ZN, ZS, hallRoof(h), 8, 6);
  vault(bp, COURT.xa, COURT.xb, ZN, ZCS, yrC, 8, 8);
  // --- service block outer walls (north z 1 and east), flat roof line
  for (let x = 38; x <= W - 2; x++) for (let y = 1; y <= ROOF; y++) bp.set(x, y, ZSB0, facade(x, y, ROOF + 1));
  for (let z = ZSB0; z < ZSB1; z++) for (let y = 1; y <= ROOF; y++) bp.set(W - 2, y, z, facade(z, y, ROOF + 1));
  // yard walls: lower brick wall with a durasteel coping, bars on top, big cargo gate in the north wall
  for (let x = 1; x <= 37; x++) for (let y = 1; y <= 6; y++) bp.set(x, y, ZSB0, y === 6 ? B.DURASTEEL : (x & 3) === 0 ? B.DURASTEEL : y === 1 ? B.DURASTEEL_DARK : B.BRICKS);
  for (let z = ZSB0; z < ZSB1; z++) for (let y = 1; y <= 6; y++) bp.set(1, y, z, y === 6 ? B.DURASTEEL : (z & 3) === 0 ? B.DURASTEEL : y === 1 ? B.DURASTEEL_DARK : B.BRICKS);
  bp.fill(1, 7, ZSB0, 37, 7, ZSB0, B.IRON_BARS); bp.fill(1, 7, ZSB0, 1, 7, ZSB1 - 1, B.IRON_BARS);
  bp.fill(12, 1, ZSB0, 23, 5, ZSB0, FORCE_AIR); bp.fill(11, 1, ZSB0, 11, 6, ZSB0, B.CHROME); bp.fill(24, 1, ZSB0, 24, 6, ZSB0, B.CHROME);
  bp.fill(12, 6, ZSB0, 23, 6, ZSB0, B.HULL_PLATE); bp.fill(12, 7, ZSB0, 23, 7, ZSB0, B.HOLO_SIGN);
  bp.set(1, 8, ZSB0, B.CITY_LAMP); bp.set(37, 8, ZSB0, B.CITY_LAMP); bp.set(1, 8, 7, B.CITY_LAMP);
}

// arched skylight over x xa..xb, z za..zb: glass panels between durasteel ribs (every ribEvery along z) and purlins
// (every purlinEvery across), a durasteel ridge beam with glow-panel ridge lights. Steep steps are closed with
// vertical glass so the vault is watertight.
function vault(bp, xa, xb, za, zb, yr, ribEvery, purlinEvery) {
  const cx = (xa + xb) / 2;
  for (let x = xa; x <= xb; x++) {
    const y = yr(x);
    const yn = Math.min(x > xa ? yr(x - 1) : y, x < xb ? yr(x + 1) : y);
    const lo = Math.min(y, yn + 1);
    const ridge = Math.abs(x - cx) < 1, purlin = (x - xa) % purlinEvery === 0 || (xb - x) % purlinEvery === 0;
    for (let z = za; z <= zb; z++) {
      const rib = (z - za) % ribEvery === 0 || z === zb;
      let id = rib || ridge || purlin ? B.DURASTEEL : B.STEEL_GLASS;
      if (ridge && !rib && (z - za) % 4 === 2) id = B.GLOW_PANEL;
      bp.fill(x, lo, z, x, y, z, id);
    }
  }
}

// ------------------------------------------------------------------------------------------------ halls
function hall(bp, rng, h) {
  const { xa, xb } = h;
  const cx = (xa + xb) / 2;
  const aW = [xa + 3, xa + 5], iA = [xa + 6, xa + 9], aM = [xa + 10, xb - 10], iB = [xb - 9, xb - 6], aE = [xb - 5, xb - 3];
  const yr = hallRoof(h);
  // --- floors: aisles in deck plate with lit guide dots, stalls on spruce boards, stone-brick cross aisle and ends
  for (const [x0, x1] of [aW, aM, aE]) {
    bp.fill(x0, 0, ZN, x1, 0, ZS, B.DECK_PLATE);
    const xm = x0 + ((x1 - x0) >> 1);
    for (let z = ZN + 3; z <= ZS - 3; z += 6) bp.set(xm, 0, z, B.GLOW_PANEL);
  }
  for (const [x0, x1] of [[xa, xa + 2], iA, iB, [xb - 2, xb]]) bp.fill(x0, 0, SLOT0, x1, 0, SOUTH_STAIR0 + 8, B.SPRUCE_PLANKS);
  bp.fill(xa, 0, SLOT0 + 4 * XAISLE + 1, xb, 0, SLOT0 + 4 * XAISLE + 3, B.STONE_BRICKS);
  bp.fill(xa, 0, ZN, xb, 0, ZN + 3, B.STONE_BRICKS); bp.fill(xa, 0, ZS - 3, xb, 0, ZS, B.STONE_BRICKS);
  for (let x = xa + 1; x <= xb - 1; x += 3) { bp.set(x, 0, ZN + 1, B.GLOW_PANEL); bp.set(x, 0, ZS - 1, B.GLOW_PANEL); }

  // --- gallery slab (y 5): oak boards with spruce-log beams; side strips 4 wide, end strips 4 deep
  const slab = (x0, z0, x1, z1) => { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) bp.set(x, GAL, z, ((z - SLOT0) & 3) === 0 || ((x - xa) & 3) === 3 ? B.SPRUCE_LOG : B.OAK_PLANKS); };
  slab(xa, ZN, xa + 3, ZS); slab(xb - 3, ZN, xb, ZS); slab(xa, ZN, xb, ZN + 3); slab(xa, ZS - 3, xb, ZS);
  // railings (oak fence) on the inner edges with lanterns every 8; the stairs land through the end railings
  for (let z = ZN + 4; z <= ZS - 4; z++) {
    bp.set(xa + 3, GAL + 1, z, B.OAK_FENCE); bp.set(xb - 3, GAL + 1, z, B.OAK_FENCE);
    if (((z - SLOT0) & 7) === 0) { bp.set(xa + 3, GAL + 2, z, B.LANTERN); bp.set(xb - 3, GAL + 2, z, B.LANTERN); }
  }
  for (let x = xa + 4; x <= xb - 4; x++) {
    if (x >= aM[0] && x <= aM[1]) continue;
    bp.set(x, GAL + 1, ZN + 3, B.OAK_FENCE); bp.set(x, GAL + 1, ZS - 3, B.OAK_FENCE);
  }
  // support posts under the slab edges (also carry lanterns at the aisle side)
  for (let z = SLOT0; z <= SOUTH_STAIR0 + 8; z += 12) { bp.fill(xa + 3, 1, z, xa + 3, 4, z, B.DURASTEEL); bp.fill(xb - 3, 1, z, xb - 3, 4, z, B.DURASTEEL); }
  // --- wide stairs in the middle aisle at both ends (10 half steps climb to the gallery)
  stairsZ(bp, aM[0], aM[1], SLOT0 + 9, -1, 1, 10);
  stairsZ(bp, aM[0], aM[1], SOUTH_STAIR0, 1, 1, 10);
  // guard rails beside the stair heads on the end galleries
  for (const x of [aM[0] - 1, aM[1] + 1]) { bp.set(x, GAL + 1, ZN + 3, B.OAK_FENCE); bp.set(x, GAL + 1, ZS - 3, B.OAK_FENCE); bp.set(x, GAL + 2, ZN + 3, B.LANTERN); bp.set(x, GAL + 2, ZS - 3, B.LANTERN); }

  // --- openings in the side walls: ground arches and gallery-level openings / balustrades
  const wallW = xa - 1, wallE = xb + 1;
  const blocked = (kind) => {
    const s = new Set([XAISLE]);
    if (kind === 'party') { s.add(3); s.add(13); }
    if (kind === 'court') for (let k = 0; k < NSLOT; k += 2) s.add(k);
    return s;
  };
  const bW = blocked(h.west), bE = blocked(h.east);
  for (const [x, kind, bl] of [[wallW, h.west, bW], [wallE, h.east, bE]]) {
    if (kind === 'outer') { doorway(bp, x, SLOT0 + 4 * XAISLE + 1, x, SLOT0 + 4 * XAISLE + 2, 1, 3); continue; }
    // ground arches in every blocked slot, corridors at the hall ends
    for (const k of bl) archX(bp, x, SLOT0 + 4 * k + 1, 1, 4);
    archX(bp, x, ZN, 1, 4); archX(bp, x, ZS - 2, 1, 4);
    // gallery openings at the ends and the cross aisle; balustrade windows toward the court
    archX(bp, x, ZN, GAL + 1, 3); archX(bp, x, ZS - 2, GAL + 1, 3); archX(bp, x, SLOT0 + 4 * XAISLE + 1, GAL + 1, 3);
    if (kind === 'court') for (const k of bl) { if (k === XAISLE) continue; const z0 = SLOT0 + 4 * k + 1; bp.fill(x, GAL + 1, z0, x, GAL + 3, z0 + 2, FORCE_AIR); bp.fill(x, GAL + 1, z0, x, GAL + 1, z0 + 2, B.IRON_BARS); }
  }

  // --- stalls: wall stalls under the galleries, two back-to-back island rows, four awning colours in sequence
  const offW = rng.int(0, 3), offE = rng.int(0, 3), offA = rng.int(0, 3), offB = rng.int(0, 3);
  for (let k = 0; k < NSLOT; k++) {
    const z0 = SLOT0 + 4 * k;
    if (!bW.has(k)) stall(bp, rng, xa + 2, z0, 1, AW[(k + offW) & 3], { rackX: xa });
    if (!bE.has(k)) stall(bp, rng, xb - 2, z0, -1, AW[(k + offE) & 3], { rackX: xb });
    if (k >= 3 && k <= 15 && k !== XAISLE) {
      stall(bp, rng, iA[0], z0, -1, AW[(k + offA) & 3], { postLamp: (k & 1) === 0 });
      stall(bp, rng, iA[1], z0, 1, AW[(k + offA + 2) & 3], { divider: true, postLamp: (k & 1) === 1 });
      stall(bp, rng, iB[0], z0, -1, AW[(k + offB) & 3], { postLamp: (k & 1) === 1 });
      stall(bp, rng, iB[1], z0, 1, AW[(k + offB + 2) & 3], { divider: true, postLamp: (k & 1) === 0 });
    }
  }
  // bulk goods beside the stairs and at the island row ends
  const bulk = [B.CRATE, B.BARREL, B.HAY_BALE, B.PUMPKIN, B.CRATE];
  for (const [x0, x1] of [iA, iB]) {
    cargoStack(bp, rng, x0, SLOT0 + 1, x1, SLOT0 + 8, 1, bulk);
    cargoStack(bp, rng, x0, SLOT0 + 4 * 16 + 1, x1, SOUTH_STAIR0 + 8, 1, bulk);
  }
  // --- ground under the end galleries: benches, planters, info totems, lit ceiling panels
  for (const z of [ZN + 1, ZS - 1]) {
    for (let x = xa + 1; x <= xb - 1; x += 6) { bp.set(x, 1, z, B.OAK_SLAB); bp.spot(x, 1, z, 'seat'); }
    for (let x = xa + 4; x <= xb - 4; x += 6) planter(bp, x, z, 1);
    for (let x = xa + 2; x <= xb - 2; x += 4) bp.set(x, GAL, z, B.GLOW_PANEL);
  }
  totem(bp, aM[0] - 2, ZN + 2, 1); totem(bp, aM[1] + 2, ZS - 2, 1);

  // --- gallery furnishing: display tables, fabric bolts and shelves against the walls, benches and planters
  const upper = (x, z0, k, side) => {
    const kind = (k + side) % 5;
    if (kind === 0) { for (let z = z0 + 1; z <= z0 + 3; z++) { bp.set(x, GAL + 1, z, AW[(z + k) & 3]); bp.set(x, GAL + 2, z, AW[(z + k + 1) & 3]); } bp.set(x, GAL + 3, z0 + 2, B.HOLO_SIGN); bp.work(x + (side ? -1 : 1), GAL + 1, z0 + 2, 'vendor'); }
    else if (kind === 1) { for (let z = z0 + 1; z <= z0 + 3; z++) { bp.set(x, GAL + 1, z, B.TABLE); bp.set(x, GAL + 2, z, rng.pick([B.CHEST, B.GOLD_BLOCK, B.PUMPKIN, B.CONSOLE, B.SHELF, B.BARREL])); } bp.work(x + (side ? -1 : 1), GAL + 1, z0 + 2, 'vendor'); }
    else if (kind === 2) { bp.fill(x, GAL + 1, z0 + 1, x, GAL + 2, z0 + 3, rng.pick([B.SHELF, B.BOOKSHELF, B.CRATE])); bp.set(x, GAL + 3, z0 + 2, B.LANTERN); }
    else if (kind === 3) { for (let z = z0 + 1; z <= z0 + 3; z++) { bp.set(x, GAL + 1, z, B.SPRUCE_SLAB); bp.spot(x, GAL + 1, z, 'seat'); } planter(bp, x, z0, GAL + 1); }
    else { totem(bp, x, z0 + 2, GAL + 1); planter(bp, x, z0, GAL + 1, B.SPRUCE_LEAVES); }
  };
  for (let k = 0; k < NSLOT; k++) {
    const z0 = SLOT0 + 4 * k;
    if (k === XAISLE) continue;
    if (!(h.west === 'court' && (k & 1) === 0)) upper(xa, z0, k, 0);
    if (!(h.east === 'court' && (k & 1) === 0)) upper(xb, z0, k, 1);
  }
  // end galleries: benches, planters, totem, lamp posts
  for (const z of [ZN + 1, ZS - 1]) {
    for (let x = xa + 1; x <= xb - 1; x += 5) { bp.set(x, GAL + 1, z, B.SPRUCE_SLAB); bp.spot(x, GAL + 1, z, 'seat'); }
    for (let x = xa + 3; x <= xb - 3; x += 5) planter(bp, x, z, GAL + 1, (x & 1) ? B.OAK_LEAVES : B.BIRCH_LEAVES);
    totem(bp, Math.floor(cx), z + (z < 50 ? 1 : -1), GAL + 1);
    for (const x of [xa + 5, xb - 5]) { bp.set(x, GAL + 1, z, B.OAK_FENCE); bp.set(x, GAL + 2, z, B.LANTERN); }
  }
  // --- pendant lamps from the vault ribs over the middle aisle, hall name banner over the south door
  const xm = Math.floor(cx);
  for (let z = ZN + 8; z <= ZS - 8; z += 16) { bp.fill(xm, 15, z, xm, yr(xm) - 1, z, B.IRON_BARS); bp.set(xm, 14, z, B.CITY_LAMP); }
  bp.fill(xm - 2, 11, ZS, xm + 2, 12, ZS, B.HOLO_SIGN); bp.fill(xm - 3, 11, ZS, xm - 3, 12, ZS, B.PANEL_BLACK); bp.fill(xm + 3, 11, ZS, xm + 3, 12, ZS, B.PANEL_BLACK);
  // --- rooms
  bp.room('market_hall', xa - 1, 1, ZSB1, xb + 1, ZS + 1);
  bp.room('gallery_west', xa - 1, GAL + 1, ZN, xa + 3, ZS);
  bp.room('gallery_east', xb - 3, GAL + 1, ZN, xb + 1, ZS);
  bp.room('gallery_north', xa - 1, GAL + 1, ZSB1, xb + 1, ZN + 3);
  bp.room('gallery_south', xa - 1, GAL + 1, ZS - 3, xb + 1, ZS + 1);
  for (let z = ZN + 6; z <= ZS - 6; z += 12) { bp.spot(aW[1], 1, z, 'stand'); bp.spot(aE[0], 1, z, 'stand'); bp.spot(xa + 1, GAL + 1, z, 'stand'); bp.spot(xb - 1, GAL + 1, z, 'stand'); }
}

// ------------------------------------------------------------------------------------------------ food court
function court(bp, rng) {
  const { xa, xb } = COURT;
  const cx = 67;
  // --- floor: stone with brick lanes, dotted glow strips like the plaza reference, spruce boards under the stalls
  bp.fill(xa, 0, ZN, xb, 0, ZCS, B.SMOOTH_STONE);
  for (const x of [xa + 4, xa + 5, xb - 5, xb - 4]) bp.fill(x, 0, ZN, x, 0, ZCS, B.STONE_BRICKS);
  for (let z = 30; z <= 90; z++) {
    if ((z & 1) === 0) { bp.set(xa + 5, 0, z, B.GLOW_PANEL); bp.set(xb - 5, 0, z, B.GLOW_PANEL); }
    else { bp.set(cx - 4, 0, z, B.GLOW_PANEL); bp.set(cx + 4, 0, z, B.GLOW_PANEL); }
  }
  bp.fill(xa, 0, 30, xa + 3, 0, 84, B.SPRUCE_PLANKS); bp.fill(xb - 3, 0, 30, xb, 0, 84, B.SPRUCE_PLANKS);
  for (let z = ZN; z <= ZCS; z += 8) { bp.fill(xa + 6, 0, z, xb - 6, 0, z, B.STONE_BRICKS); }

  // --- food stalls along both walls: back counter with furnaces and bottle shelves, holo menu boards, serving
  // counter with stools, striped awning, lantern, lamp post and planter in the gaps
  for (const side of [-1, 1]) {
    const xw = side < 0 ? xa : xb;            // back row against the wall
    const dx = side < 0 ? 1 : -1;             // toward the court
    for (let z0 = 30; z0 <= 78; z0 += 8) {
      const backs = [B.FURNACE, B.SHELF, B.BARREL, B.FURNACE, B.SHELF, B.CRATE];
      for (let i = 0; i < 6; i++) {
        const z = z0 + i;
        bp.set(xw, 1, z, backs[(i + rng.int(0, 1)) % 6]);
        if (i & 1) bp.set(xw, 2, z, B.SHELF);
        bp.set(xw + 2 * dx, 1, z, B.PANEL_BLACK); bp.set(xw + 2 * dx, 2, z, B.STONE_BRICK_SLAB);
        for (let j = 0; j <= 3; j++) bp.set(xw + j * dx, 4, z, (i + j) & 1 ? AW[(z0 >> 3) & 3] : B.WHITE_WOOL);
        if (i === 1 || i === 3 || i === 5) { bp.set(xw + 3 * dx, 1, z, SEAT); bp.spot(xw + 3 * dx, 1, z, 'seat'); }
      }
      bp.set(xw, 3, z0 + 1, B.HOLO_SIGN); bp.set(xw, 3, z0 + 4, B.HOLO_SIGN);
      bp.set(xw + 2 * dx, 3, z0 + 2, B.LANTERN);
      bp.fill(xw + 3 * dx, 1, z0, xw + 3 * dx, 3, z0, B.OAK_FENCE); bp.fill(xw + 3 * dx, 1, z0 + 5, xw + 3 * dx, 3, z0 + 5, B.OAK_FENCE);
      bp.work(xw + dx, 1, z0 + 2, 'cook'); bp.spot(xw + dx, 1, z0 + 4, 'stand');
      if (z0 + 7 <= 85) { planter(bp, xw + dx, z0 + 6, 1); lampPost(bp, xw + 2 * dx, z0 + 7, 1); }
    }
  }
  // --- seating: tables with four stools in two rows, planters and tall lamps along the lanes
  for (const x of [cx - 7, cx + 7]) {
    for (let z = 33; z <= 87; z += 6) {
      bp.set(x, 1, z, B.TABLE);
      for (const [sx, sz] of [[x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]]) { bp.set(sx, 1, sz, B.OAK_SLAB); bp.spot(sx, 1, sz, 'seat'); }
      if (((z - 33) / 6) & 1) planter(bp, x + (x < cx ? -2 : 2), z + 3, 1, B.BIRCH_LEAVES);
    }
  }
  // more tables in the centre lane between the kiosks and the fountain
  for (const z of [44, 48, 70, 74]) for (const x of [cx - 2, cx + 2]) {
    bp.set(x, 1, z, B.TABLE);
    for (const [sx, sz] of [[x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]]) { bp.set(sx, 1, sz, B.OAK_SLAB); bp.spot(sx, 1, sz, 'seat'); }
  }
  for (let z = 32; z <= 88; z += 14) { lampPost(bp, xa + 6, z, 1); lampPost(bp, xb - 6, z, 1); }
  // --- fountain: ring basin with a glowing pool and a chrome light column
  bp.disc(cx + 0.5, 58.5, 6.5, 0, 0, B.STONE_BRICKS); bp.disc(cx + 0.5, 58.5, 4.5, 1, 1, B.DURASTEEL_DARK, true);
  bp.disc(cx + 0.5, 58.5, 3.5, 0, 0, B.GLOW_PANEL_BLUE); bp.disc(cx + 0.5, 58.5, 3.5, 1, 1, B.WATER);
  bp.fill(cx, 1, 58, cx, 3, 58, B.CHROME); bp.set(cx, 4, 58, B.GLOW_PANEL); bp.set(cx, 5, 58, B.WATER);
  for (const [x, z] of [[cx - 5, 53], [cx + 5, 53], [cx - 5, 64], [cx + 5, 64]]) { bp.set(x, 1, z, B.SPRUCE_SLAB); bp.spot(x, 1, z, 'seat'); }
  // --- round drink kiosks with warm lit bands (the reference's pavilions) and stools around
  for (const kz of [38, 78]) {
    bp.disc(cx + 0.5, kz + 0.5, 2.5, 1, 1, B.PANEL_BLACK, true);
    bp.disc(cx + 0.5, kz + 0.5, 2.5, 2, 2, B.WINDOW_LIT, true);
    for (const [x, z] of [[cx - 2, kz], [cx + 2, kz], [cx, kz - 2]]) bp.set(x, 2, z, FORCE_AIR);   // serving hatches
    bp.fill(cx, 1, kz + 2, cx, 2, kz + 2, FORCE_AIR);                                            // staff door
    bp.disc(cx + 0.5, kz + 0.5, 2.5, 3, 3, B.CHROME); bp.disc(cx + 0.5, kz + 0.5, 1.5, 4, 4, B.PANEL_BLACK); bp.set(cx, 5, kz, B.HOLO_SIGN);
    bp.set(cx - 1, 1, kz - 1, B.FURNACE); bp.set(cx + 1, 1, kz - 1, B.SHELF); bp.set(cx - 1, 1, kz + 1, B.BARREL); bp.set(cx + 1, 1, kz + 1, B.CHEST);
    bp.work(cx, 1, kz, 'barkeep');
    for (const [x, z] of [[cx - 3, kz], [cx + 3, kz], [cx, kz - 3], [cx - 3, kz - 1], [cx + 3, kz + 1]]) { bp.set(x, 1, z, SEAT); bp.spot(x, 1, z, 'seat'); }
  }
  // info totems at the lanes
  totem(bp, xa + 6, 47, 1); totem(bp, xb - 6, 69, 1);

  // --- grand stair to the north balcony (8 wide), planters and lamps at its foot
  stairsZ(bp, cx - 4, cx + 3, 29, -1, 1, 10);
  for (const x of [cx - 5, cx + 4]) { planter(bp, x, 29, 1); planter(bp, x, 28, 1, B.SPRUCE_LEAVES); lampPost(bp, x, 27, 1); bp.fill(x, 1, 20, x, 5, 26, B.DURASTEEL_DARK); bp.fill(x, 6, 20, x, 6, 26, B.IRON_BARS); }
  // --- north balcony (y 5): deck over the arcade entrance, railing with lamps, benches, holo wall, lift
  for (let x = xa; x <= xb; x++) for (let z = ZN; z <= 19; z++) bp.set(x, GAL, z, ((x + z) & 1) ? B.DECK_PLATE : B.DURASTEEL_DARK);
  for (let x = xa; x <= xb; x++) if (x < cx - 4 || x > cx + 3) bp.set(x, GAL + 1, 19, B.IRON_BARS);
  for (const x of [xa + 3, xa + 9, xb - 9, xb - 3]) { bp.fill(x, GAL + 1, 19, x, GAL + 2, 19, B.IRON_BARS); bp.set(x, GAL + 3, 19, B.CITY_LAMP); }
  for (let x = xa + 2; x <= xb - 2; x += 3) { if (x >= cx - 5 && x <= cx + 4) continue; bp.set(x, GAL + 1, 17, B.SPRUCE_SLAB); bp.spot(x, GAL + 1, 17, 'seat'); }
  for (let x = xa + 4; x <= xb - 4; x += 6) { if (x >= cx - 5 && x <= cx + 4) continue; planter(bp, x, 16, GAL + 1, B.OAK_LEAVES); }
  for (let x = xa + 1; x <= xb - 1; x++) if ((x & 3) !== 0 && !(x >= 58 && x <= 59) && !(x >= 75 && x <= 76)) bp.set(x, GAL + 2, ZSB1, B.HOLO_SIGN);
  totem(bp, cx - 6, 16, GAL + 1); totem(bp, cx + 5, 16, GAL + 1);
  // public lift: 2x2 black shaft with chrome doors and blue call markers at both levels
  bp.fill(xa + 1, 0, ZN, xa + 2, ROOF, ZN + 1, B.PANEL_BLACK);
  bp.fill(xa + 1, 1, ZN + 2, xa + 2, 2, ZN + 2, B.CHROME); bp.fill(xa + 1, 3, ZN + 2, xa + 2, 3, ZN + 2, B.GLOW_PANEL_BLUE);
  bp.fill(xa + 1, GAL + 1, ZN + 2, xa + 2, GAL + 2, ZN + 2, B.CHROME); bp.fill(xa + 1, GAL + 3, ZN + 2, xa + 2, GAL + 3, ZN + 2, B.GLOW_PANEL_BLUE);
  bp.lift(xa + 1, ZN, 1, GAL + 1);
  // ground under the balcony: arcade entrance with marquee, blue guide tiles, benches, lit ceiling
  doorway(bp, cx - 2, ZSB1, cx + 1, ZSB1, 1, 3, B.HOLO_SIGN);
  bp.fill(cx - 4, 4, ZSB1, cx - 3, 4, ZSB1, B.HOLO_SIGN); bp.fill(cx + 2, 4, ZSB1, cx + 3, 4, ZSB1, B.HOLO_SIGN);
  for (let z = ZN; z <= 19; z++) { bp.set(cx - 2, 0, z, B.GLOW_PANEL_BLUE); bp.set(cx + 1, 0, z, B.GLOW_PANEL_BLUE); }
  for (let x = xa + 4; x <= xb - 4; x += 4) { if (x >= cx - 5 && x <= cx + 4) continue; bp.set(x, GAL, 17, B.GLOW_PANEL); }
  for (let x = xa + 5; x <= xb - 5; x += 5) { if (x >= cx - 6 && x <= cx + 5) continue; bp.set(x, 1, 16, B.OAK_SLAB); bp.spot(x, 1, 16, 'seat'); planter(bp, x + 1, 16, 1); }
  bp.room('balcony_north', xa - 1, GAL + 1, ZSB1, xb + 1, 19);

  // --- south end: the balcony deck first (the rooms below hang their ceiling lights in it), then the security post
  // (west) and clinic (east) under the south balcony bar, entrance lobby between
  for (let x = xa; x <= xb; x++) for (let z = 91; z <= ZCS; z++) bp.set(x, GAL, z, ((x + z) & 1) ? B.DECK_PLATE : B.DURASTEEL_DARK);
  securityPost(bp);
  clinic(bp);
  lobby(bp);
  // south balcony (y 5) with the gallery bar
  for (let x = xa; x <= xb; x++) bp.set(x, GAL + 1, 91, B.IRON_BARS);
  for (const x of [xa + 3, xa + 11, cx, xb - 11, xb - 3]) { bp.fill(x, GAL + 1, 91, x, GAL + 2, 91, B.IRON_BARS); bp.set(x, GAL + 3, 91, B.CITY_LAMP); }
  for (let x = cx - 7; x <= cx + 7; x++) {
    bp.set(x, GAL + 1, 94, B.PANEL_BLACK); bp.set(x, GAL + 2, 94, B.STONE_BRICK_SLAB);
    bp.fill(x, GAL + 1, ZCS, x, GAL + 2, ZCS, B.SHELF);
    if ((x - cx) & 1) { bp.set(x, GAL + 1, 93, SEAT); bp.spot(x, GAL + 1, 93, 'seat'); }
  }
  bp.set(cx, GAL + 3, ZCS, B.HOLO_SIGN); bp.set(cx - 4, GAL + 3, ZCS, B.LANTERN); bp.set(cx + 4, GAL + 3, ZCS, B.LANTERN);
  bp.work(cx - 2, GAL + 1, 95, 'bartender'); bp.work(cx + 2, GAL + 1, 95, 'bartender');
  for (const x0 of [xa + 1, xb - 6]) {
    // lounge corners: wool sofas round a low table
    const wool = x0 < cx ? B.RED_WOOL : B.BLUE_WOOL;
    bp.fill(x0, GAL + 1, ZCS, x0 + 3, GAL + 1, ZCS, wool); bp.fill(x0, GAL + 1, 94, x0, GAL + 1, 95, wool);
    bp.set(x0 + 2, GAL + 1, 94, B.TABLE); planter(bp, x0 + 5, ZCS, GAL + 1, B.SPRUCE_LEAVES);
    for (const [sx, sz] of [[x0 + 1, ZCS], [x0 + 3, ZCS], [x0, 94]]) bp.spot(sx, GAL + 1, sz, 'seat');
    bp.set(x0 + 2, GAL + 3, ZCS, B.HOLO_SIGN);
  }
  bp.room('gallery_bar', xa - 1, GAL + 1, 91, xb + 1, ZCS + 1);
  bp.room('food_court', xa - 1, 1, 29, xb + 1, 90);
  for (let z = 34; z <= 86; z += 13) { bp.spot(cx - 4, 1, z, 'stand'); bp.spot(cx + 4, 1, z, 'stand'); }
}

function securityPost(bp) {
  const { xa } = COURT;
  // glass-fronted box: dark plinth, tinted glass, durasteel head; door to the court on the north face
  for (let x = xa; x <= xa + 5; x++) for (let y = 1; y <= 4; y++) bp.set(x, y, 90, y === 1 || y === 4 ? B.DURASTEEL_DARK : B.STEEL_GLASS);
  for (let z = 90; z <= ZCS; z++) for (let y = 1; y <= 4; y++) bp.set(xa + 5, y, z, y === 1 || y === 4 ? B.DURASTEEL_DARK : B.STEEL_GLASS);
  bp.fill(xa + 5, 1, 90, xa + 5, 4, 90, B.DURASTEEL);
  doorway(bp, xa + 1, 90, xa + 2, 90, 1, 2, B.PANEL_RED);
  bp.set(xa + 3, 3, 90, B.HOLO_SIGN);
  // surveillance wall on the south side, duty chair, weapon rack, holding cell, evidence chest, alarm panel
  bp.fill(xa + 1, 1, ZCS, xa + 4, 1, ZCS, B.CONSOLE); bp.fill(xa + 1, 2, ZCS, xa + 4, 2, ZCS, B.HOLO_SIGN);
  bp.set(xa + 2, 1, 95, SEAT); bp.work(xa + 2, 1, 95, 'guard'); bp.work(xa + 3, 1, 91, 'guard');
  bp.set(xa, 1, 94, B.IRON_BLOCK); bp.set(xa, 2, 94, B.IRON_BARS); bp.set(xa, 3, 94, B.PANEL_RED);
  bp.fill(xa + 1, 1, 91, xa + 1, 2, 92, B.IRON_BARS); bp.fill(xa, 1, 93, xa, 2, 93, B.IRON_BARS);
  bp.set(xa, 1, 91, B.STONE_BRICK_SLAB); bp.spot(xa, 1, 92, 'stand');
  bp.set(xa + 4, 1, 91, B.CHEST); bp.set(xa + 4, 2, 91, B.PANEL_RED); bp.set(xa + 4, 1, 93, B.TABLE); bp.set(xa + 4, 2, 93, B.CONSOLE);
  bp.set(xa + 2, GAL, 93, B.GLOW_PANEL); bp.set(xa + 2, GAL, 95, B.GLOW_PANEL_BLUE); bp.set(xa + 4, GAL, 92, B.GLOW_PANEL);
  bp.room('security_post', xa - 1, 1, 90, xa + 5, ZCS + 1);
}

function clinic(bp) {
  const { xb } = COURT;
  const x0 = xb - 5;   // west wall of the clinic
  for (let x = x0; x <= xb; x++) for (let y = 1; y <= 4; y++) bp.set(x, y, 90, y === 1 ? B.DURASTEEL_DARK : y === 4 ? B.WHITE_WOOL : B.STEEL_GLASS);
  for (let z = 90; z <= ZCS; z++) for (let y = 1; y <= 4; y++) bp.set(x0, y, z, y === 1 ? B.DURASTEEL_DARK : y === 4 ? B.WHITE_WOOL : B.PLASTER);
  bp.fill(x0, 1, 90, x0, 4, 90, B.DURASTEEL);
  doorway(bp, x0 + 2, 90, x0 + 3, 90, 1, 2, B.GLOW_PANEL_BLUE);
  bp.set(x0 + 4, 3, 90, B.PANEL_RED); bp.set(x0 + 1, 3, 90, B.HOLO_SIGN);
  // clean chequered floor; red cross on the lobby-facing wall (reads from both sides)
  for (let x = x0 + 1; x <= xb; x++) for (let z = 91; z <= ZCS; z++) bp.set(x, 0, z, ((x + z) & 1) ? B.PLASTER : B.SMOOTH_STONE);
  bp.set(x0, 2, 93, B.PANEL_RED); bp.fill(x0, 3, 92, x0, 3, 94, B.PANEL_RED); bp.set(x0, 4, 93, B.PANEL_RED);
  // two beds with monitors and a curtain between, medic desk, medicine cabinets, sink, bacta drum
  bp.set(x0 + 1, 1, ZCS, B.BED_HEAD); bp.set(x0 + 1, 1, 95, B.BED_FOOT); bp.set(x0 + 2, 1, ZCS, B.CONSOLE); bp.bed(x0 + 2, 1, 95);
  bp.set(xb, 1, ZCS, B.BED_HEAD); bp.set(xb, 1, 95, B.BED_FOOT); bp.set(xb - 1, 1, ZCS, B.CONSOLE); bp.bed(xb - 1, 1, 95);
  bp.fill(x0 + 3, 1, 95, x0 + 3, 2, ZCS, B.WHITE_WOOL);
  bp.set(x0 + 1, 1, 92, B.TABLE); bp.set(x0 + 1, 1, 91, B.CONSOLE); bp.set(x0 + 2, 1, 92, SEAT); bp.work(x0 + 2, 1, 92, 'medic');
  bp.fill(x0 + 1, 1, 94, x0 + 1, 3, 94, B.SHELF); bp.set(x0 + 1, 1, 93, B.CHEST); bp.set(x0 + 1, 3, 93, B.GLOW_PANEL_BLUE);
  bp.fill(xb, 1, 91, xb, 2, 92, B.SHELF); bp.set(xb, 1, 93, B.TROUGH); bp.set(xb, 2, 93, B.CHROME); bp.set(xb, 3, 92, B.HOLO_SIGN);
  bp.set(xb, 1, 94, B.IRON_BLOCK); bp.set(xb, 2, 94, B.STEEL_GLASS); bp.set(xb, 3, 94, B.GLOW_PANEL_BLUE);
  bp.set(x0 + 1, 2, 91, B.HOLO_SIGN);
  bp.set(x0 + 3, GAL, 93, B.GLOW_PANEL_BLUE); bp.set(x0 + 1, GAL, 95, B.GLOW_PANEL); bp.set(xb, GAL, 95, B.GLOW_PANEL);
  bp.set(x0 + 4, GAL, 91, B.GLOW_PANEL); bp.set(x0 + 2, GAL, 92, B.GLOW_PANEL);
  bp.room('clinic', x0, 1, 90, xb + 1, ZCS + 1);
}

function lobby(bp) {
  const x0 = COURT.xa + 6, x1 = COURT.xb - 6, cx = 67;
  bp.fill(x0, 0, 91, x1, 0, ZCS, B.STONE_BRICKS);
  for (let x = x0 + 1; x <= x1 - 1; x += 2) bp.set(x, 0, 92, B.GLOW_PANEL);
  for (const x of [cx - 7, cx, cx + 7]) bp.set(x, GAL, 93, B.GLOW_PANEL);
  totem(bp, cx - 3, 93, 1); totem(bp, cx + 3, 93, 1);
  for (const x of [x0, x1]) { bp.fill(x, 1, 93, x, 1, 94, B.OAK_SLAB); bp.spot(x, 1, 93, 'seat'); planter(bp, x, 95, 1, B.BIRCH_LEAVES); planter(bp, x, 91, 1); }
  // droid greeter and a holo directory beside the doors
  bp.set(cx - 3, 1, 95, B.IRON_BLOCK); bp.set(cx - 3, 2, 95, B.CHROME); bp.work(cx - 2, 1, 95, 'greeter');
  bp.set(cx + 3, 1, 95, B.PANEL_BLACK); bp.set(cx + 3, 2, 95, B.HOLO_SIGN); bp.set(cx + 3, 3, 95, B.HOLO_SIGN);
  bp.set(cx - 5, 1, 91, B.CHEST); bp.set(cx + 5, 1, 91, B.BARREL);
  bp.room('entrance_lobby', x0 - 1, 1, 90, x1 + 1, ZCS + 1);
  for (const x of [cx - 4, cx, cx + 4]) bp.spot(x, 1, 93, 'stand');
}

// ------------------------------------------------------------------------------------------------ service block
function serviceBlock(bp, rng) {
  const W = bp.w;
  const z0 = ZSB0 + 1, z1 = ZSB1 - 1;
  // floor slab between the storeys and the roof slab (checkered metal), east of the open yard
  for (let x = 38; x <= W - 2; x++) for (let z = ZSB0; z <= ZSB1; z++) {
    bp.set(x, GAL, z, ((x + z) & 1) ? B.DURASTEEL_DARK : B.DECK_PLATE);
    bp.set(x, ROOF, z, ((x >> 1) + (z >> 1)) & 1 ? B.DECK_PLATE : B.DURASTEEL_DARK);
  }
  // partitions (full height; the storage block's yard side is dock-plated) and the upper-only partition over the arcade
  for (const x of [38, 87, 94, 104, 116]) for (let z = ZSB0; z <= ZSB1; z++) for (let y = 1; y <= ROOF - 1; y++) bp.set(x, y, z, x === 38 ? dockWall(z, y) : partition(z, y));
  for (let x = 39; x <= 49; x++) for (let y = 1; y <= ROOF - 1; y++) bp.set(x, y, 7, partition(x, y));
  for (let x = 88; x <= 93; x++) for (let y = 1; y <= ROOF - 1; y++) bp.set(x, y, 7, partition(x, y));
  for (let z = z0; z <= z1; z++) for (let y = GAL + 1; y <= ROOF - 1; y++) bp.set(67, y, z, partition(z, y));
  // ground floor pattern under the service rooms
  for (let x = 39; x <= W - 3; x++) for (let z = z0; z <= z1; z++) bp.set(x, 0, z, ((x + z) & 1) ? B.STONE_BRICKS : B.SMOOTH_STONE);

  // --- storage rooms (hand-built): crate and barrel stacks, shelving, hay pallets, a freight lift to the office
  const stock = [B.CRATE, B.BARREL, B.CRATE, B.HAY_BALE, B.CHEST];
  cargoStack(bp, rng, 39, z0, 39, 6, 1, stock); cargoStack(bp, rng, 41, z0, 48, z0, 1, stock); cargoStack(bp, rng, 43, 4, 45, 4, 1, stock);
  bp.fill(49, 1, z0, 49, 2, 5, B.SHELF); bp.set(44, 4, 4, B.LANTERN); bp.set(41, GAL, 4, B.GLOW_PANEL);
  bp.work(46, 1, 5, 'stock'); bp.spot(42, 1, 5, 'stand');
  doorway(bp, 44, 7, 45, 7, 1, 2, B.GLOW_PANEL);
  cargoStack(bp, rng, 39, 11, 39, 13, 1, stock); cargoStack(bp, rng, 42, 10, 46, 10, 1, stock); cargoStack(bp, rng, 39, 8, 44, 8, 1, stock);
  bp.fill(49, 1, 8, 49, 2, 10, B.SHELF); bp.set(43, 4, 12, B.LANTERN); bp.set(46, GAL, 12, B.GLOW_PANEL);
  bp.work(41, 1, 12, 'stock'); bp.spot(45, 1, 12, 'stand');
  bp.fill(48, 0, 12, 49, ROOF, 13, B.PANEL_BLACK);
  bp.fill(47, 1, 12, 47, 2, 13, B.CHROME); bp.fill(47, 3, 12, 47, 3, 13, B.GLOW_PANEL_BLUE);
  bp.fill(47, GAL + 1, 12, 47, GAL + 2, 13, B.CHROME); bp.fill(47, GAL + 3, 12, 47, GAL + 3, 13, B.GLOW_PANEL_BLUE);
  bp.lift(48, 12, 1, GAL + 1);
  bp.room('storage', 38, 1, ZSB0, 50, 7); bp.room('storage', 38, 1, 7, 50, ZSB1);

  // --- hologame arcade (hand-built): black walls, blue floor strips, rows of consoles with stools, holo posters
  arcade(bp, rng);

  // --- restrooms off a lit corridor (template), cold store (hand-built), office and workshop (templates)
  for (const y of [1, GAL + 1]) {
    for (let z = z0; z <= z1; z++) bp.set(85, y - 1, z, (z & 1) ? B.GLOW_PANEL_BLUE : B.SMOOTH_STONE);
    bp.set(86, y + 3, 5, B.GLOW_PANEL); bp.set(86, y + 3, 10, B.GLOW_PANEL);
    doorway(bp, 87, 3, 87, 4, y, 2); doorway(bp, 87, 10, 87, 11, y, 2);
    template(bp, rng, 'restroom', 'restroom', 88, z0, 93, 6, y, 'W', 1);
    template(bp, rng, 'restroom', 'restroom', 88, 8, 93, z1, y, 'W', 2);
    bp.set(85, y, z0, B.TROUGH); bp.set(86, y, z0, B.CHROME); bp.set(86, y + 1, z0, B.HOLO_SIGN); bp.set(85, y + 1, z0, B.CHROME);
  }
  coldStore(bp, rng);
  template(bp, rng, 'open_plan_office', 'market_office', 105, z0, 115, z1, 1, 'S', 1);
  template(bp, rng, 'workshop', 'repair_shop', 117, z0, W - 3, z1, 1, 'S', 3);
  // upper storey
  template(bp, rng, 'meeting_room', 'vendors_association', 39, z0, 47, z1, GAL + 1, 'S', 1);
  template(bp, rng, 'cafeteria', 'staff_canteen', 51, z0, 66, z1, GAL + 1, 'S', 7);
  template(bp, rng, 'holo_theatre', 'holo_theatre', 68, z0, 83, z1, GAL + 1, 'S', 7);
  template(bp, rng, 'storage', 'dry_store', 95, z0, 103, z1, GAL + 1, 'S', 5);
  template(bp, rng, 'control_room', 'market_control', 105, z0, 115, z1, GAL + 1, 'S', 1);
  template(bp, rng, 'barracks', 'vendors_dormitory', 117, z0, W - 3, z1, GAL + 1, 'S', 3);

  // --- doors from the naves / galleries into the service rooms (ground 3 high, upper 2 high, lit lintels)
  for (const [x, ground, up] of [[40, true, true], [85, true, true], [100, true, true], [106, true, true], [120, true, true], [58, false, true], [75, false, true]]) {
    if (ground) doorway(bp, x, ZSB1, x + 1, ZSB1, 1, 3);
    if (up) doorway(bp, x, ZSB1, x + 1, ZSB1, GAL + 1, 2);
  }
  // yard -> storage cargo doors and yard -> hall doors
  doorway(bp, 38, 3, 38, 4, 1, 3); doorway(bp, 38, 9, 38, 10, 1, 3);
  doorway(bp, 12, ZSB1, 13, ZSB1, 1, 3); doorway(bp, 36, ZSB1, 37, ZSB1, 1, 3);
}

function arcade(bp, rng) {
  const x0 = 51, x1 = 83, z0 = 2, z1 = 13;
  // dark shell: black wall lining, black ceiling with sparse blue panels, blue floor strips on black
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    bp.set(x, 0, z, (z === 4 || z === 5 || z === 10 || z === 11) && ((x + z) & 1) ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK);
    bp.set(x, GAL, z, (x % 6 === 3 && z % 6 === 2) ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK);
  }
  // wall lining: holo posters alternate with pink and green neon tubes so the arcade glows in colour
  const poster = (u) => ((u & 3) === 1 ? ((u & 4) ? B.NEON_PINK : B.HOLO_SIGN) : (u & 3) === 3 ? B.NEON_GREEN : B.PANEL_BLACK);
  for (let x = x0; x <= x1; x++) for (let y = 1; y <= 4; y++) { bp.set(x, y, z0 - 1, y === 3 ? poster(x) : B.PANEL_BLACK); }
  for (let z = z0; z <= z1; z++) for (let y = 1; y <= 4; y++) { bp.set(x0 - 1, y, z, y === 3 ? poster(z) : B.PANEL_BLACK); bp.set(x1 + 1, y, z, y === 3 ? poster(z) : B.PANEL_BLACK); }
  for (let x = x0; x <= x1; x++) for (let y = 1; y <= 4; y++) if (!(x >= 64 && x <= 69)) bp.set(x, y, z1 + 1, y === 3 ? poster(x) : B.PANEL_BLACK);
  // machine rows: wall row (z 2, stools z 3), double island (consoles z 7/8, stools z 6/9), wall row (z 13, stools z 12);
  // every machine has a lit marquee (holo, pink or green) and the stools are black
  const machine = (x, z, up) => { bp.set(x, 1, z, B.CONSOLE); if (up) bp.set(x, 2, z, (x & 3) === 0 ? B.HOLO_SIGN : (x & 3) === 2 ? ((x & 4) ? B.NEON_PINK : B.NEON_GREEN) : B.PANEL_BLACK); };
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    const gap = x % 6 === 0;
    if (!gap) { machine(x, z0, true); if (x & 1) { bp.set(x, 1, z0 + 1, B.PANEL_BLACK); bp.spot(x, 1, z0 + 1, 'seat'); } }
    if (!gap) { machine(x, 7, (x & 1) === 0); machine(x, 8, (x & 1) === 1); if (x & 1) { bp.set(x, 1, 6, B.PANEL_BLACK); bp.spot(x, 1, 6, 'seat'); } else { bp.set(x, 1, 9, B.PANEL_BLACK); bp.spot(x, 1, 9, 'seat'); } }
    if (!gap && !(x >= 63 && x <= 70)) { machine(x, z1, true); if (x & 1) { bp.set(x, 1, z1 - 1, B.PANEL_BLACK); bp.spot(x, 1, z1 - 1, 'seat'); } }
  }
  // prize counter (west) and snack bar (east), attendant, dividers with blue light
  bp.fill(x0, 1, 4, x0, 1, 11, B.PANEL_BLACK); bp.fill(x0, 2, 4, x0, 2, 11, B.STONE_BRICK_SLAB); bp.set(x0, 2, 6, B.GOLD_BLOCK); bp.set(x0, 2, 9, B.CHEST); bp.set(x0, 3, 7, B.HOLO_SIGN);
  bp.work(x0 + 1, 1, 7, 'attendant');
  bp.fill(x1, 1, 4, x1, 1, 11, B.SHELF); bp.fill(x1, 2, 4, x1, 2, 11, B.SHELF); bp.set(x1, 1, 7, B.BARREL); bp.set(x1, 1, 8, B.FURNACE); bp.set(x1, 3, 7, B.HOLO_SIGN);
  bp.work(x1 - 1, 1, 8, 'snack vendor');
  for (const x of [x0 + 6, x0 + 12, x1 - 12, x1 - 6]) { bp.set(x, 1, 7, B.PANEL_BLACK); bp.set(x, 2, 7, B.GLOW_PANEL_BLUE); bp.set(x, 1, 8, B.PANEL_BLACK); bp.set(x, 2, 8, B.GLOW_PANEL_BLUE); }
  for (let x = 60; x <= 74; x += 7) bp.spot(x, 1, 5, 'stand');
  bp.room('hologame_arcade', x0 - 1, 1, z0 - 1, x1 + 1, z1 + 1);
}

function coldStore(bp, rng) {
  const x0 = 95, x1 = 103, z0 = 2, z1 = 13;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { bp.set(x, 0, z, ((x + z) & 1) ? B.SNOW : B.IRON_BLOCK); if ((x - x0) % 4 === 2 && (z - z0) % 4 === 1) bp.set(x, GAL, z, B.GLOW_PANEL_BLUE); }
  // snow (ice) stacks and freezer units along the walls, produce crates in the middle
  for (let z = z0; z <= z1; z++) {
    if (z % 3 !== 0) { bp.fill(x0, 1, z, x0, 2, z, B.SNOW); }
    if (z % 4 === 1) { bp.set(x1, 1, z, B.IRON_BLOCK); bp.set(x1, 2, z, B.GLOW_PANEL_BLUE); bp.set(x1, 3, z, B.VENT); } else if (z % 4 !== 3) bp.set(x1, 1, z, B.BARREL);
  }
  for (let x = x0 + 1; x <= x1 - 1; x++) { if (x % 3 === 0) { bp.set(x, 1, z0, B.CRATE); bp.set(x, 2, z0, B.SNOW); } else bp.set(x, 1, z0, B.SNOW); }
  cargoStack(bp, rng, x0 + 2, 6, x1 - 2, 6, 1, [B.CRATE, B.BARREL, B.SNOW, B.PUMPKIN]);
  cargoStack(bp, rng, x0 + 2, 9, x1 - 2, 9, 1, [B.CRATE, B.SNOW, B.CRATE, B.BARREL]);
  bp.set(x0 + 4, 4, 4, B.LANTERN); bp.set(x0 + 4, 4, 11, B.LANTERN);
  bp.work(x0 + 3, 1, 11, 'stock'); bp.spot(x0 + 5, 1, 4, 'stand');
  bp.room('cold_store', x0 - 1, 1, z0 - 1, x1 + 1, z1 + 1);
}

// ------------------------------------------------------------------------------------------------ loading yard
function yard(bp, rng) {
  const x0 = 2, x1 = 37, z0 = 2, z1 = 13;
  // dark floor with hazard stripes round the speeder pad, deck-plate pad with lit corner markers
  bp.fill(x0, 0, z0, x1, 0, z1, B.DURASTEEL_DARK);
  bp.fill(4, 0, 3, 17, 0, 11, B.PANEL_STRIPE); bp.fill(5, 0, 4, 16, 0, 10, B.DECK_PLATE);
  for (const [x, z] of [[5, 4], [16, 4], [5, 10], [16, 10]]) bp.set(x, 0, z, B.GLOW_PANEL);
  for (let x = 20; x <= 36; x += 4) bp.fill(x, 0, z0, x, 0, z1, B.PANEL_STRIPE);
  // cargo speeder hovering over the pad: dark skids, durasteel hull with a red stripe, glass cockpit, open bed
  // with cargo, engine pods with blue exhausts
  for (const [x, z] of [[7, 5], [7, 8], [13, 5], [13, 8]]) bp.set(x, 1, z, B.DURASTEEL_DARK);
  bp.fill(7, 2, 5, 14, 2, 8, B.DURASTEEL); bp.fill(7, 2, 5, 14, 2, 5, B.PANEL_RED); bp.fill(7, 2, 8, 14, 2, 8, B.PANEL_RED);
  bp.fill(7, 3, 6, 8, 3, 7, B.STEEL_GLASS); bp.fill(9, 3, 5, 9, 3, 8, B.DURASTEEL); bp.set(6, 2, 6, B.CHROME); bp.set(6, 2, 7, B.CHROME);
  bp.fill(10, 3, 5, 14, 3, 5, B.HULL_PLATE); bp.fill(10, 3, 8, 14, 3, 8, B.HULL_PLATE);
  bp.set(11, 3, 6, B.CRATE); bp.set(12, 3, 7, B.BARREL); bp.set(13, 3, 6, B.CRATE); bp.set(13, 3, 7, B.HAY_BALE); bp.set(11, 4, 6, B.CRATE);
  bp.fill(15, 2, 5, 15, 3, 5, B.DURASTEEL_DARK); bp.fill(15, 2, 8, 15, 3, 8, B.DURASTEEL_DARK); bp.set(16, 2, 5, B.GLOW_PANEL_BLUE); bp.set(16, 2, 8, B.GLOW_PANEL_BLUE);
  bp.set(10, 3, 5, B.VENT); bp.set(10, 3, 8, B.VENT);
  // gantry crane over the pad with a hanging crate; lamp posts; a cargo droid
  bp.fill(4, 1, 12, 4, 7, 12, B.DURASTEEL); bp.fill(17, 1, 12, 17, 7, 12, B.DURASTEEL); bp.fill(4, 7, 12, 17, 7, 12, B.DURASTEEL);
  bp.fill(4, 1, 2, 4, 7, 2, B.DURASTEEL); bp.fill(17, 1, 2, 17, 7, 2, B.DURASTEEL); bp.fill(4, 7, 2, 17, 7, 2, B.DURASTEEL);
  bp.fill(10, 7, 3, 10, 7, 11, B.DURASTEEL); bp.fill(10, 5, 9, 10, 6, 9, B.IRON_BARS); bp.set(10, 4, 9, B.CRATE);
  for (const [x, z] of [[3, 3], [36, 3], [36, 12], [20, 12]]) lampPost(bp, x, z, 1);
  bp.set(30, 1, 6, B.DURASTEEL_DARK); bp.set(30, 2, 6, B.CHROME); bp.work(31, 1, 6, 'cargo droid');
  // charging post and fuel drums beside the pad
  bp.fill(18, 1, 3, 18, 2, 3, B.DURASTEEL_DARK); bp.set(18, 3, 3, B.GLOW_PANEL_BLUE); bp.set(19, 1, 3, B.IRON_BARS);
  bp.fill(20, 1, 3, 21, 1, 3, B.BARREL); bp.set(20, 2, 3, B.BARREL);
  // stacked cargo: crate walls along the west wall, barrel and hay pallets by the storage doors, pumpkin crates
  cargoStack(bp, rng, x0, 3, x0 + 1, 11, 1, [B.CRATE, B.CRATE, B.BARREL, B.HAY_BALE]);
  cargoStack(bp, rng, 33, 5, 36, 8, 1, [B.BARREL, B.CRATE, B.HAY_BALE, B.CRATE]);
  cargoStack(bp, rng, 22, 3, 27, 4, 1, [B.CRATE, B.PUMPKIN, B.CRATE, B.BARREL]);
  cargoStack(bp, rng, 22, 10, 30, 11, 1, [B.HAY_BALE, B.CRATE, B.BARREL, B.CRATE]);
  bp.fill(19, 1, 6, 19, 3, 7, B.CRATE); bp.set(20, 1, 6, B.BARREL); bp.set(20, 1, 7, B.BARREL);
  // dispatch desk and manifest board by the storage doors, work spots
  bp.set(35, 1, 11, B.TABLE); bp.set(35, 2, 11, B.CONSOLE); bp.set(34, 1, 11, SEAT); bp.work(34, 1, 11, 'dispatcher');
  bp.set(37, 2, 7, B.HOLO_SIGN); bp.set(37, 3, 6, B.HOLO_SIGN);
  bp.work(18, 1, 9, 'loader'); bp.work(28, 1, 7, 'loader'); bp.spot(12, 1, 10, 'stand'); bp.spot(25, 1, 7, 'stand');
  bp.room('loading_yard', 1, 1, ZSB0, 38, ZSB1);
}

// ------------------------------------------------------------------------------------------------ rooftop
function rooftop(bp, rng) {
  const W = bp.w, y = ROOF + 1;
  // parapet with corner beacons
  bp.fill(38, y, ZSB0, W - 2, y, ZSB0, B.DURASTEEL); bp.fill(W - 2, y, ZSB0, W - 2, y, ZSB1, B.DURASTEEL); bp.fill(38, y, ZSB0, 38, y, ZSB1 - 1, B.DURASTEEL);
  for (const [x, z] of [[38, ZSB0], [W - 2, ZSB0], [W - 2, ZSB1 - 1]]) bp.set(x, y + 1, z, B.PANEL_RED);
  // water tanks on legs: iron drums with chrome bands and dark lids
  for (const cx of [44.5, 98.5, 124.5]) {
    const cz = 7.5;
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) bp.set(Math.floor(cx + dx), y, Math.floor(cz + dz), B.DURASTEEL_DARK);
    bp.disc(cx, cz, 2.5, y + 1, y + 3, B.IRON_BLOCK); bp.disc(cx, cz, 2.5, y + 2, y + 2, B.CHROME, true);
    bp.disc(cx, cz, 2.5, y + 4, y + 4, B.DURASTEEL_DARK); bp.set(Math.floor(cx), y + 5, Math.floor(cz), B.CHROME);
    bp.fill(Math.floor(cx) + 3, y, Math.floor(cz), Math.floor(cx) + 6, y, Math.floor(cz), B.IRON_BARS);
  }
  // vent stacks and air handlers
  for (const [x, z] of [[58, 4], [75, 4], [90, 10], [110, 4], [66, 10], [119, 10]]) {
    bp.fill(x, y, z, x + 1, y + 1, z + 1, B.VENT); bp.fill(x, y + 2, z, x + 1, y + 2, z + 1, B.HULL_TRENCH);
  }
  for (const [x, z] of [[62, 9], [106, 9], [86, 3]]) {
    bp.fill(x, y, z, x + 2, y + 1, z + 2, B.DURASTEEL); bp.fill(x + 1, y, z, x + 1, y + 1, z, B.VENT); bp.fill(x + 1, y, z + 2, x + 1, y + 1, z + 2, B.VENT); bp.set(x + 1, y + 2, z + 1, B.IRON_BARS);
  }
  // pipes, comms mast, roof lamps
  bp.fill(52, y, 7, 56, y, 7, B.IRON_BARS); bp.fill(80, y, 7, 92, y, 7, B.IRON_BARS); bp.fill(101, y, 7, 118, y, 7, B.IRON_BARS);
  bp.fill(128, y, 3, 128, y + 6, 3, B.IRON_BARS); bp.set(128, y + 7, 3, B.CITY_LAMP); bp.set(128, y + 3, 4, B.PANEL_RED);
  for (const x of [48, 72, 96, 120]) bp.set(x, ROOF, 12, B.GLOW_PANEL);
  // upper-floor windows in the north facade are already lit; the yard's coping gets lamps
  for (let x = 5; x <= 37; x += 8) bp.set(x, 8, ZSB0, B.CITY_LAMP);
  rng.next();
}

// ------------------------------------------------------------------------------------------------ south front
// depth for the flat gable line: dark buttresses with lamps either side of each hall door, striped wool awnings on
// fence posts over the doors, holo billboards in the glass gables (hall names, the market's name over the court)
function southFront(bp) {
  const zf = ZS + 2;   // one block in front of the hall gables (the court facade stands at ZCS + 1 = zf + 1)
  for (const h of HALLS) {
    const xd = hallDoorX(h), xm = Math.floor((h.xa + h.xb) / 2);
    for (const x of [xd - 4, xd + 5]) { bp.fill(x, 1, zf, x, 10, zf, B.DURASTEEL_DARK); bp.set(x, 11, zf, B.CHROME); bp.set(x, 12, zf, B.CITY_LAMP); }
    bp.fill(xd - 2, 1, zf, xd - 2, 3, zf, B.OAK_FENCE); bp.fill(xd + 3, 1, zf, xd + 3, 3, zf, B.OAK_FENCE);
    for (let x = xd - 2; x <= xd + 3; x++) bp.set(x, 4, zf, (x - xd) & 1 ? B.WHITE_WOOL : B.RED_WOOL);
    bp.fill(xm - 4, 15, ZS + 1, xm + 4, 18, ZS + 1, B.PANEL_BLACK); bp.fill(xm - 3, 16, ZS + 1, xm + 3, 17, ZS + 1, B.HOLO_SIGN);
  }
  const cx = (COURT.xa + COURT.xb) >> 1;
  bp.fill(cx - 8, 18, ZCS + 1, cx + 8, 22, ZCS + 1, B.PANEL_BLACK); bp.fill(cx - 7, 19, ZCS + 1, cx + 7, 21, ZCS + 1, B.HOLO_SIGN);
}

// ------------------------------------------------------------------------------------------------ entrances
function entrances(bp, lot) {
  const D = bp.d;
  const dx = lot.door ? lot.door.x - lot.x0 : 67;
  // main doors in the court facade at the lot's door column, plus two more each side; chrome frames, lit lintels
  for (const x of [dx - 7, dx, dx + 7]) { doorway(bp, x, D - 1, x + 1, D - 1, 1, 3, B.GLOW_PANEL); bp.door(x, 1, D - 1, 'S'); }
  // hall doors in the gables (middle aisle), side doors at the cross aisle, the yard gate
  for (const h of HALLS) {
    const xd = hallDoorX(h);
    doorway(bp, xd, ZS + 1, xd + 1, ZS + 1, 1, 3, B.GLOW_PANEL); bp.door(xd, 1, ZS + 1, 'S');
  }
  bp.door(1, 1, SLOT0 + 4 * XAISLE + 1, 'W'); bp.door(bp.w - 2, 1, SLOT0 + 4 * XAISLE + 1, 'E');
  bp.door(17, 1, ZSB0, 'N');
}
