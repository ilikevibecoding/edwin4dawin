// Public rooms: bars, shops, medical, security, education, culture, entertainment.
import { B } from '../../blocks.js';
import { defRoom } from './registry.js';
import { SEAT } from './room.js';

const AWNINGS = [B.RED_WOOL, B.WHITE_WOOL, B.BLUE_WOOL, B.GREEN_WOOL];

// bar along the back with a bottle wall, stools, round tables, band corner
defRoom('cantina', { minW: 6, minD: 5, tags: ['food', 'public'] }, (r, rng) => {
  const bv = r.back - 2;
  r.counter(1, r.w - 2, bv, B.PANEL_BLACK, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, B.SHELF); r.put(u, 2, r.back, u % 3 === 1 ? B.HOLO_SIGN : B.PANEL_BLACK); }
  for (let u = 1; u < r.w - 1; u += 2) r.seat(u, bv - 1);
  r.work(2, r.back - 1, 'bartender'); if (r.w >= 8) r.work(r.w - 3, r.back - 1, 'bartender');
  // tables in the front area
  for (let u = 1; u < r.w - 1; u += 3) for (let v = 2; v < bv - 2; v += 3) { if (r.table(u, v)) { r.seat(u - 1, v); r.seat(u + 1, v); } }
  if (r.w >= 7 && r.d >= 7) { r.put(r.w - 1, 0, 2, B.PIANO); r.seat(r.w - 1, 3); r.work(r.w - 2, 2, 'musician'); }
  r.lantern(1, bv - 2); r.lantern(r.w - 2, bv - 2);
  r.ceilingLights(5);
});

// tables for two in a grid, kitchen counter with ovens at the back
defRoom('restaurant', { minW: 6, minD: 5, tags: ['food', 'public'] }, (r, rng) => {
  r.counter(0, r.w - 1, r.back - 1, B.PANEL_BLACK);
  r.put(1, 0, r.back, B.FURNACE); r.put(r.w - 2, 0, r.back, B.FURNACE); r.put(r.cu, 0, r.back, B.TROUGH);
  for (let u = 0; u < r.w; u += 2) r.put(u, 2, r.back, B.SHELF);
  r.work(r.cu, r.back, 'cook'); r.work(1, r.back, 'cook');
  for (let u = 1; u < r.w; u += 3) for (let v = 2; v <= r.back - 3; v += 2) {
    if (r.table(u, v)) { r.seat(u - 1, v); if (u + 1 < r.w) r.seat(u + 1, v); }
  }
  r.planter(0, r.back - 2 > 2 ? 2 : 3); r.put(r.cu, 1, 0, B.HOLO_SIGN);
  r.lantern(r.cu, 3);
  r.ceilingLights(4);
});

// long tables with benches, serving counter
defRoom('cafeteria', { minW: 6, minD: 5, tags: ['food'] }, (r, rng) => {
  r.counter(0, r.w - 1, r.back, B.PANEL_BLACK);
  r.put(1, 0, r.back, B.FURNACE); r.put(r.w - 2, 0, r.back, B.CRATE); r.put(r.cu, 0, r.back, B.BARREL);
  r.work(r.cu, r.back - 1, 'server');
  for (let v = 2; v <= r.back - 3; v += 3) for (let u = 1; u < r.w - 1; u++) {
    r.table(u, v); r.seat(u, v - 1); r.seat(u, v + 1);
  }
  r.ceilingLights(4);
});

// counter, goods wall, display crates, sign
defRoom('shop', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng) => {
  const cv = r.back - 2;
  r.counter(0, r.w - 2, cv, B.PANEL_BLACK, B.STONE_BRICK_SLAB);
  const goods = rng.pick([B.SHELF, B.BOOKSHELF, B.CRATE, B.WHITE_WOOL, B.RED_WOOL]);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, goods); r.put(u, 1, r.back, u % 2 ? goods : B.SHELF); }
  r.work(r.cu, r.back - 1, 'shopkeeper');
  r.put(0, 0, 2, B.CRATE); r.put(0, 1, 2, rng.chance(0.5) ? B.PUMPKIN : B.HAY_BALE);
  if (r.w >= 6) { r.put(r.w - 1, 0, 2, B.BARREL); r.put(r.w - 1, 0, 3, B.CRATE); }
  r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  r.spot(r.cu, cv - 1); r.spot(1, cv - 1);
  r.ceilingLights(4);
});

// a row of covered stalls with goods, vendors behind, customers in front
defRoom('market_stalls', { minW: 6, minD: 4, tags: ['retail', 'public'] }, (r, rng) => {
  const n = Math.floor((r.w + 1) / 4);
  for (let i = 0; i < n; i++) {
    const u0 = i * 4, v = r.back - 1;
    const awning = AWNINGS[(i + rng.int(0, 3)) % 4];
    for (let u = u0; u <= u0 + 2 && u < r.w; u++) { r.table(u, v); r.put(u, 2, v, awning); r.put(u, 2, v + 1, awning); r.put(u, 2, v - 1, awning); }
    r.put(u0, 0, v - 1, B.OAK_FENCE); r.put(u0, 1, v - 1, B.OAK_FENCE);
    r.put(Math.min(u0 + 2, r.w - 1), 0, v - 1, B.OAK_FENCE); r.put(Math.min(u0 + 2, r.w - 1), 1, v - 1, B.OAK_FENCE);
    r.put(u0 + 1, 1, v, [B.PUMPKIN, B.HAY_BALE, B.CRATE, B.GOLD_BLOCK, B.SHELF][i % 5]);
    r.put(u0 + 1, 0, r.back, B.BARREL);
    r.work(u0 + 1, r.back, 'vendor');
    r.spot(u0 + 1, v - 2 >= 1 ? v - 2 : 1); r.spot(u0, v - 2 >= 1 ? v - 2 : 1);
  }
  r.lantern(1, 1); r.lantern(r.w - 2, 1);
  r.ceilingLights(4);
});

// beds with monitors, surgical table under a lamp, cabinets, sink
defRoom('medbay', { minW: 5, minD: 4, tags: ['medical', 'public'] }, (r, rng) => {
  for (let v = 2; v <= r.back - 1; v += 2) { if (r.bed(0, v + 1 <= r.back ? v + 1 : v)) r.put(0, 1, v + 1 <= r.back ? v + 1 : v, B.CONSOLE); }
  r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.SHELF); r.put(r.w - 2, 0, r.back, B.TROUGH); r.put(r.w - 2, 1, r.back, B.CHROME);
  if (r.w >= 6 && r.d >= 6) { r.put(r.cu + 1, 0, r.back - 2, B.WHITE_WOOL); r.putRaw(r.cu + 1, r.h, r.back - 2, B.GLOW_PANEL); r.work(r.cu + 2, r.back - 2, 'medic'); }
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.seat(r.w - 2, 2); r.work(r.w - 2, 2, 'medic');
  r.put(r.w - 1, 1, 3, B.PANEL_RED);
  r.ceilingLights(3, B.GLOW_PANEL_BLUE);
});

// ward: beds separated by curtains, nurse desk
defRoom('clinic_ward', { minW: 6, minD: 5, tags: ['medical'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 3) {
    if (r.bed(u, r.back)) { r.put(u + 1, 0, r.back, B.CONSOLE); }
    if (u + 2 < r.w) r.fill(u + 2, 0, r.back - 1, u + 2, 2, r.back, B.WHITE_WOOL);
  }
  r.put(r.w - 1, 0, 2, B.TABLE); r.put(r.w - 1, 1, 2, B.CONSOLE); r.seat(r.w - 2, 2); r.work(r.w - 2, 2, 'nurse');
  r.put(0, 0, 2, B.SHELF); r.put(0, 1, 2, B.SHELF);
  r.ceilingLights(3, B.GLOW_PANEL_BLUE);
});

// duty desk with monitors, weapon rack, a holding cell when there is room
defRoom('security_post', { minW: 4, minD: 4, tags: ['security', 'public'] }, (r, rng) => {
  r.put(0, 0, r.back, B.CONSOLE); r.put(1, 0, r.back, B.CONSOLE); r.seat(0, r.back - 1); r.work(0, r.back - 1, 'guard');
  for (let u = 0; u < Math.min(r.w, 3); u++) r.put(u, 1, r.back, B.HOLO_SIGN);
  r.put(r.w - 1, 0, r.back, B.IRON_BLOCK); r.put(r.w - 1, 1, r.back, B.IRON_BARS); r.put(r.w - 1, 2, r.back, B.PANEL_RED);
  if (r.w >= 6 && r.d >= 6) {
    r.fill(r.w - 3, 0, r.back - 3, r.w - 3, 2, r.back - 1, B.IRON_BARS); r.fill(r.w - 2, 0, r.back - 3, r.w - 1, 2, r.back - 3, B.IRON_BARS);
    r.put(r.w - 1, 0, r.back - 3, B.PLASTER); r.put(r.w - 1, 1, r.back - 3, B.PLASTER);
    r.bed(r.w - 1, r.back - 1, false); r.spot(r.w - 2, r.back - 2, 'stand');
  }
  r.put(0, 0, 2, B.CHEST); r.spot(r.cu, 2, 'stand'); r.work(r.w - 1, 1, 'guard');
  r.ceilingLights(4);
});

// cell block: barred cells along the back, guard console at the door
defRoom('detention_cell', { minW: 5, minD: 5, tags: ['security'] }, (r, rng) => {
  const front = r.back - 2;
  for (let u = 0; u < r.w; u++) r.fill(u, 0, front, u, 2, front, B.IRON_BARS);
  for (let u = 2; u < r.w; u += 3) r.fill(u, 0, front + 1, u, 2, r.back, B.PANEL_BLACK);
  for (let u = 0; u < r.w; u += 3) { if (u + 1 < r.w) { r.bed(u, r.back, true, 1); } r.put(u, 1, front, B.AIR); }
  r.put(0, 0, 2, B.CONSOLE); r.seat(1, 2); r.work(1, 2, 'warden');
  r.put(r.w - 1, 1, 2, B.PANEL_RED);
  r.spot(r.cu, front - 1);
  r.ceilingLights(4);
});

// double-sided bookshelf stacks, reading tables, librarian desk
defRoom('library', { minW: 5, minD: 4, tags: ['culture', 'public'] }, (r, rng) => {
  for (let u = 1; u < r.w - 1; u += 3) for (let v = 3; v <= r.back; v++) { r.put(u, 0, v, B.BOOKSHELF); r.put(u, 1, v, B.BOOKSHELF); if (v === 3) r.put(u, 2, v, B.LANTERN); }
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, B.BOOKSHELF); r.put(0, 1, v, B.BOOKSHELF); r.put(r.w - 1, 0, v, B.BOOKSHELF); r.put(r.w - 1, 1, v, B.BOOKSHELF); }
  r.table(r.cu, 2); r.seat(r.cu - 1, 2); r.seat(r.cu + 1, 2);
  r.put(r.w - 2, 0, 2, B.CONSOLE); r.work(r.w - 2, 1, 'librarian');
  r.lantern(r.cu, r.back - 1);
  r.ceilingLights(4);
});

// desks facing a holo board, teacher's console
defRoom('school_room', { minW: 5, minD: 4, tags: ['culture', 'public'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, u === 0 || u === r.w - 1 ? B.PLASTER : B.HOLO_SIGN); r.put(u, 2, r.back, B.PLASTER); }
  r.put(r.cu, 0, r.back - 1, B.CONSOLE); r.work(r.cu + 1, r.back - 1, 'teacher');
  for (let v = 2; v <= r.back - 3; v += 2) for (let u = 0; u < r.w; u += 2) { if (r.table(u, v)) r.seat(u, v - 1); }
  r.put(r.w - 1, 0, r.back, B.BOOKSHELF); r.put(0, 0, r.back, B.CHEST);
  r.ceilingLights(4);
});

// pedestals with exhibits, wall art, benches
defRoom('gallery', { minW: 5, minD: 4, tags: ['culture', 'public'] }, (r, rng) => {
  const items = [B.GOLD_BLOCK, B.CHROME, B.ANVIL, B.PUMPKIN, B.IRON_BLOCK, B.HAY_BALE];
  for (let u = 1; u < r.w - 1; u += 3) for (let v = 3; v <= r.back - 1; v += 3) { if (r.put(u, 0, v, B.SMOOTH_STONE)) { r.put(u, 1, v, rng.pick(items)); r.putRaw(u, r.h, v, B.GLOW_PANEL); } }
  const art = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL, B.HOLO_SIGN];
  for (let v = 2; v <= r.back; v += 2) { r.put(0, 1, v, rng.pick(art)); r.put(r.w - 1, 1, v, rng.pick(art)); }
  for (let u = 1; u < r.w - 1; u += 2) r.put(u, 1, r.back, rng.pick(art));
  r.seat(r.cu, 2); r.spot(r.cu + 1, r.back - 1); r.work(0, 2, 'curator');
  r.ceilingLights(4);
});

// museum: glass cases on pedestals around a ship model on a dais
defRoom('museum_hall', { minW: 7, minD: 5, tags: ['culture', 'public'] }, (r, rng) => {
  const c = r.cu, v = r.back - 1;
  for (let u = c - 2; u <= c + 2; u++) { r.put(u, 0, v, B.PANEL_BLACK); r.put(u, 0, v - 1, B.PANEL_BLACK); }
  r.put(c - 1, 1, v, B.DURASTEEL); r.put(c, 1, v, B.DURASTEEL); r.put(c + 1, 1, v, B.STEEL_GLASS); r.put(c, 2, v, B.HULL_PLATE); r.put(c - 1, 1, v - 1, B.PANEL_RED); r.put(c + 1, 1, v - 1, B.PANEL_RED);
  const items = [B.GOLD_BLOCK, B.CHROME, B.ANVIL, B.PIANO, B.IRON_BLOCK, B.CONSOLE];
  for (let vv = 2; vv <= r.back; vv += 3) { r.put(0, 0, vv, B.SMOOTH_STONE); r.put(0, 1, vv, B.GLASS); r.put(r.w - 1, 0, vv, B.SMOOTH_STONE); r.put(r.w - 1, 1, vv, B.GLASS); }
  for (let u = 1; u < r.w - 1; u += 4) if (Math.abs(u - c) > 2) { r.put(u, 0, 2, B.SMOOTH_STONE); r.put(u, 1, 2, rng.pick(items)); }
  r.put(c - 3 >= 0 ? c - 3 : 0, 1, r.back, B.HOLO_SIGN); r.put(Math.min(c + 3, r.w - 1), 1, r.back, B.HOLO_SIGN);
  r.seat(c - 1, 2); r.seat(c + 1, 2); r.spot(c, 3); r.work(1, r.back - 1, 'guide');
  r.ceilingLights(3);
});

// tiered seating facing a holo screen wall
defRoom('holo_theatre', { minW: 6, minD: 5, tags: ['culture', 'entertainment'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, B.HOLO_SIGN); r.put(u, 0, r.back, B.PANEL_BLACK); }
  const tier = Math.max(3, Math.floor(r.back / 2));
  for (let v = 2; v <= r.back - 2; v++) {
    const raised = v <= tier - 1 && r.d >= 7;
    for (let u = 0; u < r.w; u++) {
      if (u === r.cu) continue; // aisle
      if (raised) { r.put(u, 0, v, B.PANEL_BLACK); if (v % 2 === 0) { r.put(u, 1, v, SEAT); r.spot(u, v, 'seat'); } }
      else if (v % 2 === 0) r.seat(u, v);
    }
    if (raised && v === tier - 1) r.put(r.cu, 0, v, B.STONE_BRICK_SLAB);
  }
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, -1, 1, B.GLOW_PANEL_BLUE);
  r.putRaw(r.cu, -1, 2, B.GLOW_PANEL_BLUE); r.putRaw(r.cu, -1, r.back - 2, B.GLOW_PANEL_BLUE);
  r.work(r.w - 1, r.back - 1, 'projectionist');
  r.ceilingLights(6);
});

// arcade: glowing machines in rows, stools
defRoom('arcade', { minW: 5, minD: 4, tags: ['entertainment', 'public'] }, (r, rng) => {
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, B.CONSOLE); r.put(0, 1, v, B.HOLO_SIGN); r.put(r.w - 1, 0, v, B.CONSOLE); r.put(r.w - 1, 1, v, B.HOLO_SIGN); if (v % 2 === 0) { r.seat(1, v, B.RED_WOOL); r.seat(r.w - 2, v, B.RED_WOOL); } }
  if (r.w >= 8) for (let v = 3; v <= r.back - 1; v += 2) { r.put(r.cu, 0, v, B.CONSOLE); r.put(r.cu, 1, v, B.GLOW_PANEL_BLUE); r.put(r.cu + 1, 0, v, B.CONSOLE); }
  for (let u = 1; u < r.w - 1; u += 2) r.put(u, 1, r.back, B.HOLO_SIGN);
  r.work(r.cu, r.back - 1 > 2 ? r.back - 1 : 2, 'attendant');
  r.ceilingLights(4, B.GLOW_PANEL_BLUE);
});

// night club: lit dance floor, DJ booth, bar, booths
defRoom('night_club', { minW: 6, minD: 5, tags: ['entertainment'] }, (r, rng) => {
  const u0 = 1, u1 = r.w - 2, v0 = 2, v1 = r.back - 2;
  for (let u = u0; u <= u1; u++) for (let v = v0; v <= v1; v++) r.putRaw(u, -1, v, (u + v) % 3 === 0 ? B.GLOW_PANEL : (u + v) % 3 === 1 ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK);
  r.counter(r.cu - 1, r.cu + 1, r.back - 1, B.PANEL_BLACK, B.STONE_BRICK_SLAB); r.put(r.cu, 1, r.back - 1, B.CONSOLE);
  for (let u = 0; u < r.w; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.PANEL_BLACK);
  r.work(r.cu, r.back, 'dj');
  for (let v = 2; v <= r.back; v += 2) { r.put(0, 0, v, B.RED_WOOL); r.spot(0, v, 'seat'); }
  for (let v = 2; v <= r.back - 1; v++) { r.put(r.w - 1, 0, v, B.PANEL_BLACK); r.put(r.w - 1, 1, v, B.STONE_BRICK_SLAB); }
  r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.SHELF); r.work(r.w - 2, r.back, 'bartender');
  for (let u = u0 + 1; u < u1; u += 2) r.spot(u, v0 + 1, 'dance');
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, r.h, 2, B.GLOW_PANEL_BLUE);
  r.putRaw(r.cu, r.h, Math.floor(r.back / 2), B.GLOW_PANEL);
});

// vault: iron-walled strongroom with gold and chests behind a barred gate, teller counter outside
defRoom('bank_vault', { minW: 5, minD: 5, tags: ['finance', 'public'] }, (r, rng) => {
  const vf = r.back - 2;
  for (let u = 0; u < r.w; u++) r.fill(u, 0, vf, u, 2, vf, B.IRON_BLOCK);
  r.put(r.cu, 0, vf, B.IRON_BARS); r.put(r.cu, 1, vf, B.IRON_BARS);
  for (let u = 0; u < r.w; u++) { if (u !== r.cu) { r.put(u, 0, r.back, u % 2 ? B.GOLD_BLOCK : B.CHEST); if (u % 2) r.put(u, 1, r.back, B.GOLD_BLOCK); } }
  r.putRaw(r.cu, -1, r.back, B.GOLD_BLOCK); r.putRaw(r.cu, -1, r.back - 1, B.GOLD_BLOCK);
  r.counter(0, r.w - 1, 2, B.PANEL_BLACK, B.STONE_BRICK_SLAB); r.put(r.cu, 1, 2, B.AIR); r.put(r.cu, 0, 2, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) r.put(u, 2, 2, B.IRON_BARS);
  r.work(1, 3, 'teller'); r.work(r.w - 2, 3, 'teller'); r.spot(r.cu, 1); r.work(r.cu, r.back - 1, 'vault guard');
  r.ceilingLights(4);
});
