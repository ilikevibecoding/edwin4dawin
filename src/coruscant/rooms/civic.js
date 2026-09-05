// Civic and green rooms: council chamber, courtroom, gardens, observation decks, archives, the lobby and the
// planner-built circulation templates (lift landing, corridor, stairwell).
import { B } from '../../blocks.js';
import { defRoom } from './registry.js';
import { SEAT } from './room.js';

// tiered ring of seats around a raised dais with a chrome podium; emblem wall; chrome corner columns
defRoom('council_chamber', { minW: 7, minD: 6, tags: ['civic'] }, (r, rng) => {
  const c = r.cu, dv = Math.max(3, Math.floor(r.back / 2) + 1);
  for (let u = c - 1; u <= c + 1; u++) for (let v = dv - 1; v <= dv + 1; v++) r.put(u, 0, v, B.SMOOTH_STONE);
  r.put(c, 1, dv, B.CHROME); r.put(c, 2, dv, B.GOLD_BLOCK); r.work(c, dv + 1 <= r.back ? dv + 1 : dv - 1, 'speaker');
  r.putRaw(c, 1, dv + 1, B.AIR);
  // seats around, outer ring raised
  for (let u = 0; u < r.w; u++) for (let v = 2; v <= r.back; v++) {
    const du = Math.abs(u - c), dvv = Math.abs(v - dv);
    const ring = Math.max(du, dvv);
    if (ring === 2 && (u + v) % 2 === 0) r.seat(u, v);
    else if (ring >= 3 && (u === 0 || u === r.w - 1 || v === r.back) && (u + v) % 2 === 0) { r.put(u, 0, v, B.PANEL_BLACK); r.put(u, 1, v, SEAT); r.spot(u, v, 'seat'); }
  }
  for (let u = c - 1; u <= c + 1; u++) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, u === c ? B.GOLD_BLOCK : B.HOLO_SIGN); }
  for (let v = 0; v < dv - 1; v++) r.putRaw(c, -1, v, B.RED_WOOL);
  r.fill(0, 0, r.back, 0, r.h - 1, r.back, B.CHROME); r.fill(r.w - 1, 0, r.back, r.w - 1, r.h - 1, r.back, B.CHROME);
  r.lantern(c - 2, dv); r.lantern(c + 2, dv);
  r.ceilingLights(3);
});

// judge's bench, witness stand, counsel tables, gallery benches, barred dock
defRoom('courtroom', { minW: 6, minD: 5, tags: ['civic'] }, (r, rng) => {
  const c = r.cu;
  r.counter(c - 1, c + 1, r.back - 1, B.PANEL_BLACK, B.STONE_BRICK_SLAB); r.put(c, 1, r.back - 1, B.CONSOLE);
  r.seat(c, r.back); r.work(c, r.back, 'judge');
  r.put(c, 1, r.back, B.GOLD_BLOCK); r.put(c - 1, 1, r.back, B.HOLO_SIGN); r.put(c + 1, 1, r.back, B.HOLO_SIGN);
  r.put(c + 3 < r.w ? c + 3 : r.w - 1, 0, r.back - 1, B.PANEL_BLACK); r.put(c + 3 < r.w ? c + 3 : r.w - 1, 1, r.back - 1, B.STONE_BRICK_SLAB); r.work(c + 3 < r.w ? c + 3 : r.w - 1, r.back, 'witness');
  const tv = r.back - 3 >= 3 ? r.back - 3 : 3;
  r.table(c - 2 >= 0 ? c - 2 : 0, tv); r.seat(c - 2 >= 0 ? c - 2 : 0, tv - 1); r.table(c + 2, tv); r.seat(c + 2, tv - 1);
  r.fill(0, 0, r.back - 1, 0, 1, r.back, B.IRON_BARS); r.fill(1, 0, r.back - 1, 1, 1, r.back - 1, B.IRON_BARS); r.spot(1, r.back, 'stand');
  for (let u = 0; u < r.w; u++) if (u !== c) r.seat(u, 2);
  r.ceilingLights(4);
});

// grass and flowers, bushes, benches, water channel, lamp posts
defRoom('garden_terrace', { minW: 5, minD: 4, tags: ['green', 'public'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) for (let v = 2; v <= r.back; v++) {
    if (!r.free(u, v)) continue;
    if ((u + v) % 3 === 0) continue; // paved paths
    r.putRaw(u, -1, v, B.GRASS);
    const f = rng.next();
    if (f < 0.25) r.put(u, 0, v, B.TALL_GRASS); else if (f < 0.35) r.put(u, 0, v, rng.chance(0.5) ? B.POPPY : B.DANDELION);
  }
  r.put(0, 0, r.back, B.OAK_LEAVES); r.put(0, 1, r.back, B.OAK_LEAVES); r.put(r.w - 1, 0, r.back, B.OAK_LEAVES); r.put(r.w - 1, 1, r.back, B.OAK_LEAVES);
  if (r.w >= 7 && r.d >= 6) { for (let u = 2; u < r.w - 2; u++) { r.put(u, 0, r.back - 1, B.SMOOTH_STONE); } r.putRaw(3, -1, r.back - 1, B.WATER); if (r.w >= 8) r.putRaw(4, -1, r.back - 1, B.WATER); r.putRaw(2, -1, r.back - 1, B.SMOOTH_STONE); r.putRaw(r.w - 3, -1, r.back - 1, B.SMOOTH_STONE); for (let u = 2; u < r.w - 2; u++) r.put(u, 0, r.back - 1, B.AIR); }
  r.seat(1, 2); r.seat(r.w - 2, 2);
  r.put(r.cu, 0, r.back - 1, B.OAK_FENCE); r.put(r.cu, 1, r.back - 1, B.LANTERN);
  r.spot(r.cu, 2, 'stand');
  r.ceilingLights(5);
});

// crops in farmland rows with irrigation, planters, grow lights (glass roof when on the top floor)
defRoom('greenhouse', { minW: 5, minD: 4, tags: ['green'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) for (let v = 2; v <= r.back; v++) {
    if (!r.free(u, v)) continue;
    if (v % 3 === 1) { if (u > 0 && u < r.w - 1) r.putRaw(u, -1, v, B.WATER); continue; }
    r.putRaw(u, -1, v, B.FARMLAND); r.put(u, 0, v, rng.chance(0.85) ? B.WHEAT : B.PUMPKIN);
  }
  for (let v = 2; v <= r.back; v++) if (v % 3 === 1) { r.putRaw(0, -1, v, B.SMOOTH_STONE); r.putRaw(r.w - 1, -1, v, B.SMOOTH_STONE); }
  r.put(0, 0, r.back, B.BARREL); r.put(r.w - 1, 0, r.back, B.CRATE); r.planter(0, 1); r.planter(r.w - 1, 1);
  r.work(r.cu, 1, 'gardener'); r.spot(1, 1);
  if (ctx && ctx.isTop) { for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) if ((u + v) % 4 !== 0) r.putRaw(u, r.h, v, B.GLASS); }
  r.ceilingLights(4);
});

// glass-walled deck: benches facing out, telescopes, small bar, soft light (planner glazes its outer walls)
defRoom('observation_deck', { minW: 6, minD: 4, tags: ['public', 'glass', 'top'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 2) r.seat(u, r.back - 1);
  for (let u = 1; u < r.w; u += 4) { r.put(u, 0, r.back, B.IRON_BARS); r.put(u, 1, r.back, B.CHROME); }
  r.counter(0, 2, 2, B.PANEL_BLACK, B.STONE_BRICK_SLAB); r.put(0, 0, 3, B.SHELF); r.work(1, 3 <= r.back ? 3 : 2, 'bartender');
  r.planter(r.w - 1, 2); r.planter(r.w - 1, r.back - 2 > 2 ? r.back - 2 : 3);
  r.spot(r.cu, r.back, 'stand'); r.spot(r.cu + 1, r.back, 'stand');
  r.lantern(r.cu, 2); r.lantern(r.cu, r.back - 2);
  r.ceilingLights(6);
});

// open-air roof garden (no ceiling): planters, lawns, pergola, lamps
defRoom('roof_garden', { minW: 5, minD: 5, tags: ['green', 'roof'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) {
    if (!r.free(u, v) || (u % 3 === 1 && v % 3 === 1)) continue;
    if ((u + v) % 2 === 0) { r.putRaw(u, -1, v, B.GRASS); if (rng.chance(0.2)) r.put(u, 0, v, B.TALL_GRASS); }
  }
  for (const [u, v] of [[0, r.back], [r.w - 1, r.back], [0, 2], [r.w - 1, 2]]) { r.planter(u, v, rng.chance(0.5) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); }
  // pergola
  if (r.w >= 7 && r.d >= 7) {
    const u0 = r.cu - 1, v0 = r.back - 3;
    for (const [u, v] of [[u0, v0], [u0 + 2, v0], [u0, v0 + 2], [u0 + 2, v0 + 2]]) { r.put(u, 0, v, B.OAK_FENCE); r.put(u, 1, v, B.OAK_FENCE); }
    for (let u = u0; u <= u0 + 2; u++) for (let v = v0; v <= v0 + 2; v++) r.put(u, 2, v, B.OAK_SLAB);
    r.seat(u0 + 1, v0 + 1); r.table(u0 + 1, v0);
  }
  for (const [u, v] of [[1, 1], [r.w - 2, 1], [1, r.back - 1], [r.w - 2, r.back - 1]]) { r.put(u, 0, v, B.IRON_BARS); r.put(u, 1, v, B.IRON_BARS); r.put(u, 2, v, B.CITY_LAMP); }
  r.seat(r.cu, 1); r.spot(r.cu, r.back - 1);
});

// quiet room: ring of cushions around a lit basin, plants, lanterns
defRoom('meditation_chamber', { minW: 5, minD: 5, tags: ['civic', 'green'] }, (r, rng) => {
  const c = r.cu, v = Math.floor((r.back + 2) / 2);
  r.put(c, 0, v, B.SMOOTH_STONE); r.put(c, 1, v, B.LANTERN);
  for (const [du, dv] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) r.put(c + du, 0, v + dv, B.SMOOTH_STONE);
  r.putRaw(c - 1, -1, v, B.WATER); r.putRaw(c + 1, -1, v, B.WATER); r.put(c - 1, 0, v, B.AIR); r.put(c + 1, 0, v, B.AIR);
  for (const [du, dv] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [0, 2], [0, -2]]) { if (r.put(c + du, 0, v + dv, B.WHITE_WOOL)) r.spot(c + du, v + dv, 'seat'); }
  r.planter(0, r.back); r.planter(r.w - 1, r.back); r.planter(0, 2); r.planter(r.w - 1, 2);
  r.lantern(1, r.back - 1); r.lantern(r.w - 2, r.back - 1);
  r.put(c, 1, r.back, B.HOLO_SIGN);
  r.ceilingLights(6);
});

// archive: dense shelving, record chests, a terminal
defRoom('archive', { minW: 4, minD: 4, tags: ['culture', 'civic'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 2) for (let v = 2; v <= r.back; v++) { r.put(u, 0, v, B.BOOKSHELF); r.put(u, 1, v, B.BOOKSHELF); r.put(u, 2, v, v % 2 ? B.CHEST : B.BOOKSHELF); }
  r.put(r.w - 1, 0, r.back, B.CONSOLE); r.work(r.w - 1, r.back - 1, 'archivist');
  if (r.w >= 6) { r.table(r.w - 1, 2); r.seat(r.w - 1, 3); }
  r.lantern(1, r.back - 1);
  r.ceilingLights(4);
});

// lobby: reception desk facing the doors, seating clusters, chrome pillars, lit floor path, directory signs
defRoom('lobby_atrium', { minW: 6, minD: 4, tags: ['lobby'], special: true }, (r, rng, ctx) => {
  const c = r.cu, dv = r.back - 1;
  const clear = (u, v) => v <= 1 || (u >= c - 1 && u <= c + 2 && v <= dv - 1);
  const style = ctx.style || {};
  // floor path and pattern
  for (let v = 0; v <= r.back; v++) { r.putRaw(c, -1, v, v % 2 ? B.GLOW_PANEL : B.PANEL_BLACK); r.putRaw(c + 1, -1, v, v % 2 ? B.PANEL_BLACK : B.GLOW_PANEL); }
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) if ((u < c - 1 || u > c + 2) && (u + v) % 4 === 0) r.putRaw(u, -1, v, style.floorAccent || B.PANEL_STRIPE);
  // reception desk
  const dw = Math.min(3, Math.max(1, Math.floor(r.w / 4)));
  for (let u = c - dw + 1; u <= c + dw; u++) if (!clear(u, dv) || (u >= c - 1 && u <= c + 2)) { r.putRaw(u, 0, dv, B.PANEL_BLACK); r.putRaw(u, 1, dv, u === c || u === c + 1 ? B.CONSOLE : B.STONE_BRICK_SLAB); }
  r.work(c, r.back, 'receptionist'); r.work(c + 1, r.back, 'receptionist');
  // pillars
  for (let u = 1; u < r.w - 1; u += 4) { if (Math.abs(u - c) <= 2) continue; r.fill(u, 0, 2, u, r.h - 1, 2, B.CHROME); if (r.back >= 5) r.fill(u, 0, r.back - 1, u, r.h - 1, r.back - 1, B.CHROME); }
  // seating clusters left and right
  const wool = style.accentWool || B.BLUE_WOOL;
  for (const side of [0, 1]) {
    const u0 = side === 0 ? 1 : r.w - 3;
    if (u0 + 2 >= c - 1 && u0 <= c + 2) continue;
    for (let u = u0; u <= u0 + 2 && u < r.w; u++) { if (!clear(u, 3) && r.put(u, 0, 3, wool)) r.spot(u, 3, 'seat'); }
    if (!clear(u0 + 1, 4) && r.back >= 5) r.table(u0 + 1, 4);
    if (!clear(u0, 2)) r.planter(u0, r.back);
  }
  // wall signs and hanging lanterns
  for (let u = 0; u < r.w; u++) if (u % 5 === 2 && Math.abs(u - c) > 2) { r.put(u, 2, r.back, B.HOLO_SIGN); if (r.h > 6) r.put(u, 5, r.back, B.HOLO_SIGN); }
  for (let u = 2; u < r.w - 1; u += 5) r.putRaw(u, r.h - 1, 2, B.LANTERN);
  r.spot(c - 2 >= 0 ? c - 2 : 0, 2); r.spot(Math.min(c + 3, r.w - 1), 2); r.spot(c, 2, 'stand');
  r.ceilingLights(4);
});

// lift landing / corridor pocket in front of the core: directory, blue floor strip, planters
defRoom('lift_landing', { minW: 3, minD: 1, tags: ['circulation'], special: true }, (r) => {
  for (let u = 0; u < r.w; u++) r.putRaw(u, -1, r.back, (u % 2) ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK);
  if (r.d >= 2) { r.planter(0, 0); r.planter(r.w - 1, 0); }
  r.putRaw(r.cu, 2, r.back, B.HOLO_SIGN);
  r.spot(r.cu, 0, 'wait');
  r.ceilingLights(3);
});

// corridor decoration (the planner lays the corridor itself): lights, vents, stripe, a sign now and then
defRoom('corridor', { minW: 2, minD: 1, tags: ['circulation'], special: true }, (r) => {
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) {
    const k = (u + v);
    if (k % 4 === 0) r.putRaw(u, r.h, v, B.GLOW_PANEL); else if (k % 4 === 2) r.putRaw(u, r.h, v, B.VENT);
  }
});

// stairwell: built by core.js (switchback slab flights); registered here so the library lists it
defRoom('stairwell', { minW: 2, minD: 6, tags: ['circulation'], special: true }, () => {});
