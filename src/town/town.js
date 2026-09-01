// Layout of the frontier town: streets, boardwalks, buildings, rail yard, ranch, props and POIs.
import { B } from '../blocks.js';
import { TOWN_GROUND } from '../constants.js';
import { RAIL_Z } from '../worldgen.js';
import { TownStore, Frame } from './store.js';
import * as Bld from './buildings.js';
import { hash2 } from '../rng.js';

const G = TOWN_GROUND;      // ground surface block
const F = G + 1;            // floor block of main-street buildings (boardwalk level)

export const TOWN_NAME = 'DUSTWATER';

export function buildTown() {
  const store = new TownStore(-104, -78, 209, 171, G - 6, 40);
  const s = store;

  // ---------------------------------------------------------------- streets
  // main street (mud, with wagon ruts)
  for (let x = -100; x <= 100; x++) for (let z = -4; z <= 4; z++) {
    let id = B.MUD;
    if ((z === -2 || z === 2) && hash2(x, z, 1) < 0.45) id = B.COARSE_DIRT;
    if (Math.abs(z) === 4 && hash2(x, z, 2) < 0.3) id = B.DIRT_PATH;
    s.set(x, G, z, id);
    s.set(x, G + 1, z, B.AIR); s.set(x, G + 2, z, B.AIR);
  }
  // boardwalks + curb steps (gaps at the three cross streets)
  const inCross = (x) => (x >= -3 && x <= 3) || (x >= -60 && x <= -54) || (x >= 54 && x <= 60);
  for (let x = -96; x <= 96; x++) {
    if (inCross(x)) continue;
    for (const z of [-6, -5, 5, 6]) { s.set(x, G + 1, z, B.SPRUCE_PLANKS); s.set(x, G + 2, z, B.AIR); s.set(x, G + 3, z, B.AIR); }
    s.set(x, G + 1, -4, B.SPRUCE_SLAB); s.set(x, G + 1, 4, B.SPRUCE_SLAB);
  }
  // cross streets (dirt path)
  const path = (x0, z0, x1, z1) => { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { s.set(x, G, z, hash2(x, z, 3) < 0.15 ? B.COARSE_DIRT : B.DIRT_PATH); s.set(x, G + 1, z, B.AIR); } };
  path(-3, -58, 3, 60);          // north-south main cross street
  path(-96, -30, 96, -26);       // north back street
  path(-96, 26, 96, 30);         // south back street
  path(-60, -26, -54, 26);       // west cross street
  path(54, -26, 60, 26);         // east cross street
  // ranch lanes
  path(67, 30, 69, 88); path(44, 34, 100, 37);

  // ---------------------------------------------------------------- north side of main street (facing south)
  const N = (x0) => new Frame(s, x0, -7, 'S');
  Bld.blacksmith(N(-96), F);
  Bld.stable(N(-82), F);
  Bld.gunsmith(N(-53), F);
  Bld.doctor(N(-41), F);
  Bld.sheriff(N(-30), F);
  Bld.shop(N(-13), F, 'Telegraph', 'shop', 10, 10, { wall: B.WHITE_PLANKS });
  Bld.bank(N(5), F);
  Bld.hotel(N(23), F);
  Bld.shop(N(45), F, 'Barber', 'shop', 9, 9, { wall: B.PLASTER, trim: B.SPRUCE_LOG, roof: 'gable' });
  Bld.generalStore(N(61), F);
  Bld.shop(N(77), F, 'Feed & Grain', 'shop', 13, 12, { wall: B.SPRUCE_PLANKS, shelf: B.HAY_BALE, furnish: (fr, F, rec, w, d) => { fr.set(2, F + 1, 3, B.HAY_BALE); fr.set(3, F + 1, 3, B.HAY_BALE); fr.set(2, F + 2, 3, B.HAY_BALE); fr.set(w - 3, F + 1, 3, B.BARREL); fr.set(w - 3, F + 1, 4, B.CRATE); } });
  Bld.shop(N(91), F, 'Assay Office', 'shop', 11, 10, { wall: B.BRICKS, trim: B.STONE_BRICKS, shelf: B.BOOKSHELF });

  // ---------------------------------------------------------------- south side (facing north)
  const S = (x0) => new Frame(s, x0, 7, 'N');
  Bld.shop(S(-82), F, 'Bath House', 'shop', 13, 11, { wall: B.WHITE_PLANKS, furnish: (fr, F, rec, w, d) => { for (let u = 2; u < w - 2; u += 3) fr.set(u, F + 1, 4, B.TROUGH); } });
  Bld.shop(S(-68), F, 'Tailor', 'shop', 11, 10, { wall: B.OAK_PLANKS, shelf: B.WHITE_WOOL });
  Bld.shop(S(-53), F, 'Land Office', 'shop', 9, 9, { wall: B.PLASTER, shelf: B.BOOKSHELF });
  const saloonRec = Bld.saloon(S(-43), F);
  Bld.shop(S(-15), F, 'Post Office', 'shop', 10, 10, { wall: B.WHITE_PLANKS, shelf: B.BOOKSHELF });
  Bld.shop(S(5), F, 'Undertaker', 'shop', 11, 11, { wall: B.SPRUCE_PLANKS, trim: B.SPRUCE_LOG, shelf: B.SHELF, furnish: (fr, F, rec, w, d) => { fr.set(2, F + 1, -1, B.CRATE); fr.set(3, F + 1, -1, B.CRATE); fr.set(2, F + 2, -1, B.CRATE); } });
  Bld.shell(S(17), F, { w: 17, d: 13, floors: 2, wall: B.OAK_PLANKS, trim: B.STRIPPED_OAK, roof: 'flat', sign: 'BOARDING HOUSE', name: 'Boarding House', kind: 'hotel', doorU: 8, windowsU: [3, 5, 11, 13], backDoorU: 3 });
  Bld.shop(S(35), F, 'Butcher', 'shop', 9, 9, { wall: B.WHITE_PLANKS, trim: B.SPRUCE_LOG, roof: 'gable' });
  Bld.shop(S(45), F, 'Photographer', 'shop', 9, 9, { wall: B.PLASTER });
  Bld.shop(S(61), F, 'Leather Goods', 'shop', 11, 10, { wall: B.SPRUCE_PLANKS });
  Bld.shop(S(73), F, 'Gazette', 'shop', 11, 10, { wall: B.BRICKS, trim: B.STONE_BRICKS, shelf: B.BOOKSHELF });
  Bld.house(S(86), G, 'Pearson House', 1);
  Bld.house(S(96), G, 'Grimshaw House', 2);

  // ---------------------------------------------------------------- rail yard (north)
  const stationRec = Bld.station(new Frame(s, -10, -44, 'S'), F);
  // platform
  for (let x = -26; x <= 26; x++) for (let z = -60; z <= -52; z++) { s.set(x, G + 1, z, B.SPRUCE_PLANKS); s.set(x, G + 2, z, B.AIR); s.set(x, G, z, B.COBBLESTONE); }
  for (let x = -26; x <= 26; x += 8) { for (let y = G + 2; y <= G + 5; y++) s.set(x, y, -59, B.SPRUCE_LOG); }
  for (let x = -26; x <= 26; x++) for (let z = -60; z <= -53; z++) s.set(x, G + 6, z, B.SPRUCE_SLAB);
  for (let x = -22; x <= 22; x += 8) { s.set(x, G + 5, -57, B.LANTERN); }
  for (let x = -24; x <= 24; x += 12) Bld.bench(s, x, G + 2, -54, 'x', 2);
  for (let x = -20; x <= 20; x += 10) s.set(x, G + 2, -60, B.CRATE);
  s.set(-24, G + 2, -60, B.BARREL); s.set(24, G + 2, -60, B.BARREL); s.set(24, G + 3, -60, B.BARREL);
  // steps from the platform down to the ground on both ends
  for (const x of [-27, 27]) for (let z = -60; z <= -52; z++) s.set(x, G + 1, z, B.SPRUCE_SLAB);
  // rail bed through the whole town area
  for (let x = s.x0; x < s.x0 + s.w; x++) {
    for (let z = RAIL_Z - 1; z <= RAIL_Z + 1; z++) { s.set(x, G, z, B.GRAVEL); s.set(x, G + 1, z, B.AIR); s.set(x, G + 2, z, B.AIR); }
    s.set(x, G + 1, RAIL_Z, B.RAIL);
    if (x % 3 === 0) s.set(x, G, RAIL_Z, B.SPRUCE_PLANKS);
  }
  Bld.waterTower(new Frame(s, 30, -56, 'S'), G + 1);
  Bld.warehouse(new Frame(s, 38, -46, 'S'), F, 'FREIGHT');
  Bld.warehouse(new Frame(s, 56, -46, 'S'), F, 'RAILWAY CO.');
  Bld.wagon(new Frame(s, 74, -50, 'W'), G, 'crates');
  Bld.wagon(new Frame(s, 30, -50, 'E'), G, 'barrels');
  for (let x = 34; x <= 72; x += 6) { s.set(x, G + 1, -59, B.CRATE); if (x % 12 === 0) s.set(x, G + 2, -59, B.CRATE); }
  for (let x = 30; x <= 76; x++) for (let z = -58; z <= -48; z++) if (!s.isSet(x, G, z) && hash2(x, z, 4) < 0.6) s.set(x, G, z, B.DIRT_PATH);

  // ---------------------------------------------------------------- residential north (facing south onto the back street)
  const houseNamesN = ['Miller House', 'Callahan House', 'Whitmore House', 'Beaumont House', 'Ross House', 'Hawkins House', 'Sutter House'];
  [-64, -52, -36, -24, 16, 28, 80].forEach((x0, i) => Bld.house(new Frame(s, x0, -33, 'S'), G, houseNamesN[i], i));
  // plaza well and market on the cross street
  Bld.well(new Frame(s, -1, -21, 'S'), G);
  Bld.marketStalls(new Frame(s, -17, -21, 'S'), G, 3);
  for (const [x, z] of [[-6, -18], [4, -18], [-6, -24], [4, -24]]) Bld.lampPost(s, x, G + 1, z);

  // ---------------------------------------------------------------- south: church, graveyard, houses, ranch
  const churchRec = Bld.church(new Frame(s, -6, 33, 'N'), G);
  Bld.graveyard(new Frame(s, 10, 33, 'N'), G, 19, 17);
  const houseNamesS = ['Kowalski House', 'Downes House', 'Bell House', 'Macfarlane House', 'Holloway House'];
  [-84, -72, -60, -33, -20].forEach((x0, i) => Bld.house(new Frame(s, x0, 33, 'N'), G, houseNamesS[i], i + 2));
  // church yard trees
  for (const [tx, tz] of [[-12, 46], [30, 44], [-30, 48], [-90, 46]]) oakTree(s, tx, G + 1, tz);
  // ranch
  Bld.barn(new Frame(s, 50, 40, 'N'), G);
  const ranchHouse = Bld.house(new Frame(s, 72, 40, 'N'), G, 'Ranch House', 3);
  ranchHouse.kind = 'ranch';
  fencedArea(s, 36, 58, 66, 82, B.OAK_FENCE, [[50, 58], [51, 58]]);   // cattle pen
  fencedArea(s, 70, 58, 82, 68, B.OAK_FENCE, [[70, 63]]);              // pig pen
  fencedArea(s, 70, 72, 78, 78, B.OAK_FENCE, [[74, 72]]);              // chicken run
  fencedArea(s, 34, 40, 47, 54, B.SPRUCE_FENCE, [[40, 54]]);           // horse paddock
  for (const [x, z] of [[40, 64], [58, 72], [46, 76]]) s.set(x, G + 1, z, B.TROUGH);
  for (const [x, z] of [[62, 62], [63, 62], [62, 63], [38, 78]]) s.set(x, G + 1, z, B.HAY_BALE);
  s.set(62, G + 2, 62, B.HAY_BALE);
  // chicken coop
  for (let x = 71; x <= 73; x++) for (let z = 73; z <= 75; z++) { s.set(x, G + 1, z, B.SPRUCE_PLANKS); s.set(x, G + 2, z, B.SPRUCE_SLAB); }
  s.set(72, G + 1, 74, B.AIR); s.set(72, G + 1, 73, B.AIR);
  // pig mud
  for (let x = 71; x <= 81; x++) for (let z = 59; z <= 67; z++) if (hash2(x, z, 5) < 0.5) s.set(x, G, z, B.MUD);
  // wheat field
  for (let x = 84; x <= 98; x++) for (let z = 44; z <= 58; z++) {
    if (x === 84 || x === 98 || z === 44 || z === 58) { s.set(x, G + 1, z, B.OAK_FENCE); continue; }
    if (z % 4 === 46 % 4) { s.set(x, G, z, B.WATER); continue; }
    s.set(x, G, z, B.FARMLAND); s.set(x, G + 1, z, B.WHEAT);
  }
  s.set(91, G + 1, 44, B.AIR);
  Bld.wagon(new Frame(s, 86, 62, 'W'), G, 'hay');
  Bld.hitchingRail(s, 74, G + 1, 52, 'x', 3);
  // animals
  for (let i = 0; i < 7; i++) s.animalSpawns.push({ type: 'cow', x: 40 + hash2(i, 1, 6) * 24, z: 60 + hash2(i, 2, 6) * 20, pen: { x0: 37, z0: 59, x1: 65, z1: 81 } });
  for (let i = 0; i < 5; i++) s.animalSpawns.push({ type: 'pig', x: 72 + hash2(i, 3, 6) * 8, z: 60 + hash2(i, 4, 6) * 6, pen: { x0: 71, z0: 59, x1: 81, z1: 67 } });
  for (let i = 0; i < 7; i++) s.animalSpawns.push({ type: 'chicken', x: 71 + hash2(i, 5, 6) * 6, z: 73 + hash2(i, 6, 6) * 4, pen: { x0: 71, z0: 73, x1: 77, z1: 77 } });
  for (let i = 0; i < 3; i++) s.animalSpawns.push({ type: 'horse', x: 37 + hash2(i, 7, 6) * 9, z: 42 + hash2(i, 8, 6) * 10, pen: { x0: 35, z0: 41, x1: 46, z1: 53 } });

  // ---------------------------------------------------------------- west end: corral, wagons, welcome sign
  fencedArea(s, -100, 9, -85, 21, B.SPRUCE_FENCE, [[-93, 9], [-92, 9]]);
  s.set(-92, G + 1, 15, B.TROUGH); s.set(-87, G + 1, 19, B.HAY_BALE); s.set(-87, G + 2, 19, B.HAY_BALE); s.set(-98, G + 1, 19, B.HAY_BALE);
  for (let i = 0; i < 3; i++) s.animalSpawns.push({ type: 'horse', x: -98 + hash2(i, 9, 6) * 11, z: 11 + hash2(i, 10, 6) * 8, pen: { x0: -99, z0: 10, x1: -86, z1: 20 } });
  Bld.wagon(new Frame(s, -80, 12, 'E'), G, 'hay');
  // hitching rails with horses along main street
  for (const [x, z] of [[-36, 3], [-24, 3], [27, -3], [66, -3], [-24, -3], [8, 3], [76, 3]]) {
    Bld.hitchingRail(s, x, G + 1, z, 'x', 3);
    s.animalSpawns.push({ type: 'horse', x: x + 1.5, z: z + (z > 0 ? -1.5 : 1.5), tie: true, yaw: z > 0 ? Math.PI : 0 });
  }
  // welcome sign at the west entrance
  for (let y = G + 1; y <= G + 3; y++) s.set(-100, y, -6, B.SPRUCE_FENCE);
  const signOrder = [];
  for (const z of [-7, -6, -5]) { s.set(-101, G + 3, z, B.WALL_SIGN); signOrder.push([-101, z]); }
  s.set(-100, G + 3, -7, B.SPRUCE_PLANKS); s.set(-100, G + 3, -5, B.SPRUCE_PLANKS);
  s.signs.push({ y: G + 3, text: TOWN_NAME, order: signOrder });
  s.set(-100, G + 4, -6, B.LANTERN);

  // ---------------------------------------------------------------- street lamps & benches
  const streetLamp = (x, z) => { const base = s.get(x, G + 1, z) !== B.AIR && s.isSet(x, G + 1, z) ? G + 2 : G + 1; Bld.lampPost(s, x, base, z); };
  for (let x = -88; x <= 88; x += 16) if (!inCross(x)) streetLamp(x, x % 32 === 0 ? -5 : 5);
  for (let x = -80; x <= 80; x += 16) if (!inCross(x)) streetLamp(x, x % 32 === 0 ? 5 : -5);
  for (const z of [-40, -20, -12, 14, 22, 40]) { streetLamp(-4, z); streetLamp(4, z); }
  for (const z of [-14, 14]) { streetLamp(-61, z); streetLamp(-53, z); streetLamp(53, z); streetLamp(61, z); }
  for (const x of [-72, -32, 20, 72]) { streetLamp(x, -31); streetLamp(x, 31); }
  const benches = [[-40, 6], [-39, 6], [30, -6], [31, -6], [-27, -6], [-26, -6], [64, -6], [65, -6], [12, -6], [13, -6], [-72, 6], [-71, 6], [-9, 6], [-8, 6]];
  for (const [x, z] of benches) s.set(x, G + 2, z, B.SPRUCE_SLAB);
  // barrels & crates in alleys
  for (let i = 0; i < 40; i++) {
    const x = -95 + Math.floor(hash2(i, 11, 7) * 190);
    const z = hash2(i, 12, 7) < 0.5 ? -23 - Math.floor(hash2(i, 13, 7) * 3) : 23 + Math.floor(hash2(i, 13, 7) * 3);
    if (s.isSet(x, G + 1, z)) continue;
    s.set(x, G + 1, z, hash2(i, 14, 7) < 0.6 ? B.BARREL : B.CRATE);
    if (hash2(i, 15, 7) < 0.3) s.set(x, G + 2, z, B.BARREL);
  }
  // cacti / dead bushes at the town fringe
  for (let i = 0; i < 30; i++) {
    const x = -102 + Math.floor(hash2(i, 16, 8) * 204), z = -76 + Math.floor(hash2(i, 17, 8) * 168);
    if (s.isSet(x, G, z) || s.isSet(x, G + 1, z) || Math.abs(z) < 8) continue;
    if (nearAnyBuilding(s, x, z, 3)) continue;
    s.set(x, G + 1, z, hash2(i, 18, 8) < 0.5 ? B.DEAD_BUSH : B.TALL_GRASS);
  }

  // ---------------------------------------------------------------- street/walk spots for NPC wandering
  const street = [];
  for (let x = -92; x <= 92; x += 6) { street.push({ x, y: G + 1, z: -3 }); street.push({ x, y: G + 1, z: 3 }); }
  for (let x = -90; x <= 90; x += 9) if (x < -4 || x > 4) { street.push({ x, y: G + 2, z: -5 }); street.push({ x, y: G + 2, z: 5 }); }
  for (let z = -40; z <= 56; z += 8) if (z < 31 || z > 50) street.push({ x: 0, y: G + 1, z });
  for (let z = -24; z <= 24; z += 8) { street.push({ x: -57, y: G + 1, z }); street.push({ x: 57, y: G + 1, z }); }
  for (let x = -80; x <= 80; x += 12) { street.push({ x, y: G + 1, z: -28 }); street.push({ x, y: G + 1, z: 28 }); }
  for (let x = -20; x <= 20; x += 8) street.push({ x, y: G + 2, z: -55 });
  street.push({ x: -1, y: G + 1, z: -18 }, { x: 2, y: G + 1, z: -23 }, { x: -10, y: G + 1, z: -20 });
  for (const [x, z] of benches) street.push({ x, y: G + 2, z, sit: true });
  s.streetSpots = street;
  s.gatherSpots = [
    { x: 0, z: -18, y: G + 1, slots: [[-2, -18], [2, -18], [0, -16], [-2, -22], [2, -22]] },
    { x: -27, z: 3, y: G + 1, slots: [[-28, 2], [-26, 2], [-27, 1], [-25, 3]] },
    { x: 30, z: -2, y: G + 1, slots: [[29, -2], [31, -2], [30, 0], [32, -1]] },
    { x: 0, y: G + 2, z: -55, slots: [[-2, -55], [2, -55], [0, -57], [3, -57]] },
    { x: 0, z: 29, y: G + 1, slots: [[-2, 29], [2, 29], [0, 27], [-2, 31], [2, 31]] },
  ];
  s.saloon = saloonRec;
  s.church = churchRec;
  s.station = stationRec;
  s.bounds = { x0: -104, x1: 104, z0: -78, z1: 92 };
  return store;
}

function fencedArea(s, x0, z0, x1, z1, fence, gates = []) {
  for (let x = x0; x <= x1; x++) { s.set(x, G + 1, z0, fence); s.set(x, G + 1, z1, fence); }
  for (let z = z0; z <= z1; z++) { s.set(x0, G + 1, z, fence); s.set(x1, G + 1, z, fence); }
  for (const [gx, gz] of gates) s.set(gx, G + 1, gz, B.AIR);
  // trampled ground inside
  for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) if (hash2(x, z, 21) < 0.25) s.set(x, G, z, B.COARSE_DIRT);
}

function nearAnyBuilding(s, x, z, m) {
  for (const b of s.buildings) if (x >= b.bounds.x0 - m && x <= b.bounds.x1 + m && z >= b.bounds.z0 - m && z <= b.bounds.z1 + m) return true;
  return false;
}

function oakTree(s, x, y, z) {
  const h = 5;
  for (let k = 0; k < h; k++) s.set(x, y + k, z, B.OAK_LOG);
  for (let dy = -2; dy <= 1; dy++) {
    const yy = y + h - 1 + dy;
    const r = dy <= -1 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || hash2(x + dx, z + dz, dy) < 0.5)) continue;
      if (dx === 0 && dz === 0 && dy <= 0) continue;
      if (!s.isSet(x + dx, yy, z + dz)) s.set(x + dx, yy, z + dz, B.OAK_LEAVES);
    }
  }
}
