// Living rooms: apartments, hotel rooms, barracks and the domestic service rooms.
import { B } from '../../blocks.js';
import { defRoom } from './registry.js';
import { SEAT } from './room.js';

const WOOLS = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];

// bed against the back wall + chest, table with a chair, a shelf column and a plant
defRoom('studio', { minW: 4, minD: 4, maxW: 9, maxD: 9, tags: ['home'] }, (r, rng) => {
  const left = rng.chance(0.5);
  const bu = left ? 0 : r.w - 1, ou = left ? r.w - 1 : 0, s = left ? 1 : -1;
  r.bed(bu, r.back);
  r.put(bu + s, 0, r.back, B.CHEST);
  r.table(ou, r.back); r.seat(ou, r.back - 1);
  r.put(ou, 0, r.back - 2 >= 2 ? 2 : r.back - 1, B.BOOKSHELF);
  if (r.d >= 5) { r.put(ou, 1, 2, B.SHELF); r.planter(bu, 2); }
  r.put(bu, 0, r.back - 2, B.BARREL);
  if (r.w >= 6) { r.put(r.cu, 0, r.back, B.FURNACE); r.put(r.cu + 1, 0, r.back, B.PANEL_BLACK); r.put(r.cu + 1, 1, r.back, B.STONE_BRICK_SLAB); }
  r.spot(r.cu, 1); r.spot(bu + s, r.back - 1, 'stand');
  r.ceilingLights(4);
});

// living area near the door (sofa + table), two sleeping alcoves at the back split by a partition, kitchen strip
defRoom('family_apartment', { minW: 6, minD: 5, tags: ['home'] }, (r, rng) => {
  const mid = r.cu;
  for (let v = r.back - 2; v <= r.back; v++) r.fill(mid, 0, v, mid, 2, v, B.PLASTER); // alcove partition
  r.bed(0, r.back); r.bed(r.w - 1, r.back);
  r.put(1, 0, r.back, B.CHEST); r.put(r.w - 2, 0, r.back, B.CHEST);
  const wool = rng.pick(WOOLS);
  // sofa corner and low table
  r.put(0, 0, 2, wool); r.put(1, 0, 2, wool); if (r.free(0, 3)) r.put(0, 0, 3, wool);
  r.spot(0, 2, 'seat'); r.spot(1, 2, 'seat');
  r.table(2, 2); r.spot(2, 3, 'stand');
  // kitchen along the right wall
  r.put(r.w - 1, 0, 2, B.FURNACE); r.put(r.w - 1, 0, 3, B.PANEL_BLACK); r.put(r.w - 1, 1, 3, B.STONE_BRICK_SLAB);
  r.put(r.w - 1, 2, 2, B.SHELF); r.put(r.w - 1, 0, r.back - 1, B.BARREL);
  if (r.d >= 7) { r.planter(mid, 2); r.put(mid, 0, 3, B.BOOKSHELF); }
  r.lantern(1, r.back - 1); r.lantern(r.w - 2, r.back - 1);
  r.ceilingLights(4);
});

// top floors: gold trim, double bed, bar, piano corner, chrome columns
defRoom('penthouse', { minW: 7, minD: 6, tags: ['home', 'top'] }, (r, rng) => {
  r.bed(r.w - 2, r.back); r.bed(r.w - 1, r.back);
  r.put(r.w - 3, 0, r.back, B.CHEST); r.put(r.w - 3, 0, r.back - 1, B.GOLD_BLOCK);
  // bar
  r.counter(0, 2, r.back - 1, B.PANEL_BLACK, B.STONE_BRICK_SLAB);
  r.put(0, 0, r.back, B.SHELF); r.put(1, 0, r.back, B.SHELF); r.put(0, 1, r.back, B.SHELF); r.put(1, 1, r.back, B.SHELF);
  r.work(2, r.back, 'bartender');
  for (let u = 0; u <= 2; u++) r.seat(u, r.back - 2);
  // lounge
  const wool = rng.pick([B.RED_WOOL, B.WHITE_WOOL]);
  const lu = Math.min(r.w - 4, 3), lv = 2;
  r.put(lu, 0, lv, wool); r.put(lu + 1, 0, lv, wool); r.put(lu + 2, 0, lv, wool); r.table(lu + 1, lv + 1);
  r.spot(lu, lv, 'seat'); r.spot(lu + 2, lv, 'seat');
  if (r.w >= 8) { r.put(r.w - 1, 0, 2, B.PIANO); r.seat(r.w - 2, 2); }
  r.planter(0, 2); r.planter(r.w - 1, r.back - 3 >= 3 ? r.back - 3 : 3);
  // chrome columns in the corners
  r.fill(0, 0, r.back - 2, 0, r.h - 1, r.back - 2, B.CHROME);
  r.fill(r.w - 1, 0, r.back - 4 >= 2 ? r.back - 4 : 2, r.w - 1, r.h - 1, r.back - 4 >= 2 ? r.back - 4 : 2, B.CHROME);
  r.lantern(r.cu, r.back - 2); r.lantern(r.cu, 2);
  r.ceilingLights(3);
});

// hotel room: bed, desk, wardrobe, wall screen, wash nook
defRoom('hotel_room', { minW: 4, minD: 4, maxW: 8, maxD: 8, tags: ['home', 'hotel'] }, (r, rng) => {
  r.bed(r.w - 1, r.back); r.put(r.w - 2, 0, r.back, B.CHEST);
  r.table(0, r.back); r.seat(0, r.back - 1); r.put(0, 1, r.back, B.CONSOLE);
  r.put(1, 1, r.back, B.HOLO_SIGN);
  r.put(0, 0, 2, B.SHELF); r.put(0, 1, 2, B.SHELF);
  if (r.d >= 5) { r.put(r.w - 1, 0, 2, B.TROUGH); r.put(r.w - 1, 1, 2, B.CHROME); }
  r.spot(r.cu, 2);
  r.ceilingLights(4);
});

// rows of bunks along both walls, lockers at the back
defRoom('barracks', { minW: 5, minD: 5, tags: ['home', 'military'] }, (r, rng) => {
  for (let v = 2; v <= r.back - 1; v += 3) {
    r.bed(0, v + 1, false); r.put(0, 0, v + 2 <= r.back ? v + 2 : v - 1, B.CHEST);
    r.bed(r.w - 1, v + 1, false); r.put(r.w - 1, 0, v + 2 <= r.back ? v + 2 : v - 1, B.CHEST);
  }
  for (let u = 1; u < r.w - 1; u++) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, u % 2 ? B.IRON_BLOCK : B.PANEL_STRIPE); }
  if (r.w >= 7) { r.table(r.cu, 3); r.seat(r.cu - 1, 3); r.seat(r.cu + 1, 3); }
  r.spot(r.cu, r.back - 1);
  r.ceilingLights(4);
});

// counters with ovens, sink, stores
defRoom('kitchen', { minW: 4, minD: 4, tags: ['service'] }, (r, rng) => {
  r.counter(0, r.w - 1, r.back, B.PANEL_BLACK);
  r.put(1, 0, r.back, B.FURNACE); if (r.w >= 6) r.put(r.w - 2, 0, r.back, B.FURNACE);
  r.put(r.cu, 0, r.back, B.TROUGH); r.put(r.cu, 1, r.back, B.AIR);
  for (let u = 0; u < r.w; u += 2) r.put(u, 2, r.back, B.SHELF);
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.PANEL_BLACK); r.put(0, 1, v, B.STONE_BRICK_SLAB); }
  r.put(r.w - 1, 0, r.back - 1, B.BARREL); r.put(r.w - 1, 0, r.back - 2, B.CRATE); if (r.d >= 6) r.put(r.w - 1, 1, r.back - 2, B.HAY_BALE);
  if (r.w >= 6 && r.d >= 6) { r.table(r.cu, r.back - 3); r.table(r.cu + 1, r.back - 3); }
  r.work(1, r.back - 1, 'cook'); r.work(r.cu + 1, r.back - 1, 'cook');
  r.ceilingLights(4);
});

// washing machines, sinks and drying racks
defRoom('laundry', { minW: 4, minD: 4, maxW: 8, maxD: 8, tags: ['service'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, u % 2 ? B.GLASS : B.IRON_BLOCK); }
  for (let v = 2; v < r.back; v += 2) r.put(0, 0, v, B.TROUGH);
  r.put(r.w - 1, 0, 2, B.WHITE_WOOL); r.put(r.w - 1, 1, 2, B.WHITE_WOOL); if (r.d >= 5) r.put(r.w - 1, 0, 3, B.WHITE_WOOL);
  if (r.d >= 5) { r.table(r.cu, r.back - 2); }
  r.put(r.w - 1, 0, r.back - 1, B.BARREL);
  r.work(r.cu, r.back - 1, 'laundry');
  r.ceilingLights(4);
});

// stalls along one wall, sinks with mirrors along the other
defRoom('restroom', { minW: 3, minD: 3, maxW: 7, maxD: 8, tags: ['service'] }, (r, rng) => {
  for (let v = 1; v <= r.back; v += 2) {
    r.put(r.w - 1, 0, v, B.STONE_BRICK_SLAB);
    if (v + 1 <= r.back) r.fill(r.w - 1, 0, v + 1, r.w - 1, 2, v + 1, B.PLASTER);
    if (r.w >= 4) { r.fill(r.w - 2, 0, v + 1, r.w - 2, 2, v + 1, B.PLASTER); }
  }
  for (let v = 2; v <= r.back; v += 2) { r.put(0, 0, v, B.TROUGH); r.put(0, 1, v, B.CHROME); }
  r.spot(1, r.back);
  r.ceilingLights(3);
});

// weight racks, mats, treadmills, punching post
defRoom('gym', { minW: 5, minD: 5, tags: ['leisure'] }, (r, rng) => {
  for (let u = 1; u < r.w - 1; u += 2) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.IRON_BARS); }
  const mat = rng.pick([B.BLUE_WOOL, B.RED_WOOL]);
  for (let u = 0; u < r.w; u += 2) for (let v = 2; v < r.back - 1; v += 3) { if (r.free(u, v)) r.putRaw(u, -1, v, mat); }
  for (let v = 2; v < r.back; v += 2) { r.put(0, 0, v, B.PANEL_BLACK); r.put(0, 1, v, B.RAIL); }
  r.put(r.w - 1, 0, 2, B.OAK_FENCE); r.put(r.w - 1, 1, 2, B.HAY_BALE);
  if (r.d >= 6) { r.put(r.w - 1, 0, r.back - 1, SEAT); r.spot(r.w - 1, r.back - 1, 'seat'); }
  r.spot(r.cu, 3); r.spot(r.cu + 1, r.back - 1); r.spot(1, r.back - 1);
  r.ceilingLights(4);
});

// mirrors with lights, make-up tables, wardrobes
defRoom('dressing_room', { minW: 4, minD: 4, maxW: 8, tags: ['service', 'stage'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, B.CHROME); r.put(u, 2, r.back, u % 2 ? B.GLOW_PANEL : B.PLASTER); if (u % 2 === 0) { r.table(u, r.back); r.seat(u, r.back - 1); } }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.SHELF); r.put(0, 1, v, v % 2 ? B.WHITE_WOOL : B.RED_WOOL); }
  r.put(r.w - 1, 0, 2, B.CHEST);
  r.spot(r.cu, 2);
  r.ceilingLights(4);
});

// waiting lounge: sofas around low tables, plants, wall screen
defRoom('lounge', { minW: 5, minD: 4, tags: ['public'] }, (r, rng) => {
  const wool = rng.pick(WOOLS);
  r.put(0, 0, r.back, wool); r.put(1, 0, r.back, wool); r.put(0, 0, r.back - 1, wool);
  r.spot(0, r.back, 'seat'); r.spot(1, r.back, 'seat'); r.spot(0, r.back - 1, 'seat');
  r.table(1, r.back - 1);
  r.put(r.w - 1, 0, r.back, wool); r.put(r.w - 2, 0, r.back, wool); r.spot(r.w - 1, r.back, 'seat'); r.spot(r.w - 2, r.back, 'seat');
  r.table(r.w - 1, r.back - 1);
  r.put(r.cu, 1, r.back, B.HOLO_SIGN); if (r.w >= 7) r.put(r.cu + 1, 1, r.back, B.HOLO_SIGN);
  r.planter(0, 2); r.planter(r.w - 1, 2);
  if (r.d >= 6) { r.put(r.cu, 0, 3, B.IRON_BLOCK); r.put(r.cu, 1, 3, B.GLASS); }
  r.ceilingLights(4);
});
