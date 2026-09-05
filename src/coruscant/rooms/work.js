// Work rooms: offices, technical rooms, workshops, storage, vehicle bays.
import { B } from '../../blocks.js';
import { defRoom } from './registry.js';
import { SEAT } from './room.js';

// rows of console desks with chairs, planters and a water cooler
defRoom('open_plan_office', { minW: 5, minD: 4, tags: ['office'] }, (r, rng) => {
  for (let v = 2; v <= r.back; v += 3) for (let u = 0; u < r.w; u += 3) {
    if (!r.free(u, v) || !r.free(u + 1, v)) continue;
    r.put(u, 0, v, B.CONSOLE); r.put(u + 1, 0, v, B.TABLE);
    if (r.free(u, v - 1) && r.put(u, 0, v - 1, SEAT)) r.work(u, v - 1, 'desk');
    if (r.free(u + 1, v - 1) && r.put(u + 1, 0, v - 1, SEAT)) r.work(u + 1, v - 1, 'desk');
  }
  r.planter(r.w - 1, r.back); r.planter(0, r.back);
  r.put(r.w - 1, 0, 2, B.IRON_BLOCK); r.put(r.w - 1, 1, 2, B.GLASS);
  for (let u = 1; u < r.w - 1; u += 3) r.put(u, 2, r.back, B.HOLO_SIGN);
  r.spot(r.cu, 1);
  r.ceilingLights(4);
});

// big desk, guest chairs, bookshelf wall, gold trim, carpet
defRoom('executive_office', { minW: 5, minD: 5, tags: ['office'] }, (r, rng) => {
  const c = r.cu;
  for (let u = c - 1; u <= c + 1; u++) { r.put(u, 0, r.back - 1, u === c ? B.CONSOLE : B.TABLE); r.putRaw(u, -1, r.back - 1, B.RED_WOOL); r.putRaw(u, -1, r.back - 2, B.RED_WOOL); }
  r.seat(c, r.back); r.work(c, r.back, 'executive');
  r.seat(c - 1, r.back - 3 >= 2 ? r.back - 3 : 2); r.seat(c + 1, r.back - 3 >= 2 ? r.back - 3 : 2);
  for (let u = 0; u < r.w; u++) if (u < c - 1 || u > c + 1) { r.put(u, 0, r.back, B.BOOKSHELF); r.put(u, 1, r.back, B.BOOKSHELF); }
  r.put(c, 1, r.back, B.HOLO_SIGN); r.put(c, 2, r.back, B.GOLD_BLOCK);
  r.planter(0, 2); r.planter(r.w - 1, 2);
  r.put(0, 0, r.back - 2, B.CHEST); r.put(r.w - 1, 0, r.back - 2, B.SHELF);
  r.lantern(c, 2);
  r.ceilingLights(4);
});

// long table with seats on both sides facing a holo screen
defRoom('meeting_room', { minW: 5, minD: 5, tags: ['office'] }, (r, rng) => {
  const c = r.cu;
  for (let v = 2; v <= r.back - 1; v++) { r.table(c, v); if (r.w >= 7) r.table(c + 1, v); r.seat(c - 1, v); r.seat(r.w >= 7 ? c + 2 : c + 1, v); }
  r.put(c, 1, r.back, B.HOLO_SIGN); r.put(c + 1, 1, r.back, B.HOLO_SIGN); r.put(c, 2, r.back, B.HOLO_SIGN); r.put(c + 1, 2, r.back, B.HOLO_SIGN);
  r.put(0, 0, r.back, B.SHELF); r.put(r.w - 1, 0, r.back, B.IRON_BLOCK); r.put(r.w - 1, 1, r.back, B.GLASS);
  r.planter(0, 2); r.planter(r.w - 1, 2);
  r.ceilingLights(4, B.GLOW_PANEL); r.putRaw(c, r.h, 2, B.GLOW_PANEL_BLUE);
});

// racks of consoles in aisles, blue floor strips, cold light
defRoom('server_room', { minW: 4, minD: 4, tags: ['tech'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 2) for (let v = 2; v <= r.back; v++) {
    if (u % 4 === 2 && v === r.back - 1) continue; // gap in every other rack
    if (r.put(u, 0, v, B.CONSOLE)) r.put(u, 1, v, B.CONSOLE);
    if (u + 1 < r.w && v === 2) r.putRaw(u + 1, -1, v, B.GLOW_PANEL_BLUE);
  }
  for (let u = 1; u < r.w; u += 2) r.putRaw(u, -1, r.back, B.GLOW_PANEL_BLUE);
  r.put(r.w - 1, 2, r.back, B.VENT); r.put(0, 2, r.back, B.VENT);
  r.work(1, r.back - 1, 'technician'); r.spot(r.cu, 1);
  r.ceilingLights(4, B.GLOW_PANEL_BLUE);
});

// U-shaped console bank, big holo wall, central holo table
defRoom('control_room', { minW: 5, minD: 4, tags: ['tech', 'military'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); if (u % 2 === 0) r.seat(u, r.back - 1), r.work(u, r.back - 1, 'operator'); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.CONSOLE); r.put(r.w - 1, 0, v, B.CONSOLE); }
  for (let u = 1; u < r.w - 1; u++) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, u % 3 === 1 ? B.HOLO_SIGN : B.PANEL_BLACK); }
  if (r.w >= 7 && r.d >= 6) { r.put(r.cu, 0, 3, B.PANEL_BLACK); r.put(r.cu, 1, 3, B.GLOW_PANEL_BLUE); r.spot(r.cu - 1, 3); r.spot(r.cu + 1, 3); }
  r.put(0, 1, 2, B.PANEL_RED); r.put(r.w - 1, 1, 2, B.PANEL_RED);
  r.ceilingLights(4, B.GLOW_PANEL_BLUE);
});

// antenna arrays on chrome bases, comm consoles
defRoom('comms_room', { minW: 4, minD: 4, tags: ['tech'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.CHROME); r.put(u, 1, r.back, B.IRON_BARS); r.put(u, 2, r.back, B.IRON_BARS); }
  for (let u = 1; u < r.w; u += 2) r.put(u, 0, r.back, B.CONSOLE);
  r.put(0, 0, 2, B.CONSOLE); r.seat(1, 2); r.work(1, 2, 'comms');
  r.put(r.w - 1, 0, 2, B.PANEL_BLACK); r.put(r.w - 1, 1, 2, B.PANEL_RED);
  r.put(r.w - 1, 1, r.back - 1, B.HOLO_SIGN);
  r.spot(r.cu, r.back - 1);
  r.ceilingLights(4);
});

// workbenches, anvil, furnace, parts crates, a half-built droid
defRoom('workshop', { minW: 5, minD: 4, tags: ['industry'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) r.table(u, r.back);
  r.put(1, 0, r.back, B.ANVIL); r.put(r.w - 2, 0, r.back, B.FURNACE); r.put(r.cu, 1, r.back, B.CONSOLE);
  for (let v = 2; v < r.back; v += 2) { r.put(0, 0, v, B.CRATE); if (v % 4 === 2) r.put(0, 1, v, B.CRATE); }
  r.put(r.w - 1, 0, 2, B.IRON_BLOCK); r.put(r.w - 1, 0, 3, B.BARREL);
  if (r.w >= 7 && r.d >= 6) { r.put(r.cu, 0, 3, B.IRON_BLOCK); r.put(r.cu, 1, 3, B.CHROME); }
  for (let u = 1; u < r.w - 1; u += 2) r.put(u, 2, r.back, B.IRON_BARS);
  r.work(1, r.back - 1, 'mechanic'); r.work(r.w - 2, r.back - 1, 'mechanic'); r.spot(r.cu, 2);
  r.ceilingLights(4);
});

// crates and barrels in stacks with aisles
defRoom('storage', { minW: 3, minD: 3, tags: ['service'], weight: 0.7 }, (r, rng) => {
  for (let u = 0; u < r.w; u++) for (let v = 1; v <= r.back; v++) {
    const edge = u === 0 || u === r.w - 1 || v === r.back;
    const island = r.w >= 6 && r.d >= 6 && u % 3 === 1 && v % 3 === 0;
    if (!edge && !island) continue;
    if (!r.free(u, v) || rng.chance(0.2)) continue;
    const id = rng.chance(0.55) ? B.CRATE : B.BARREL;
    r.put(u, 0, v, id); if (rng.chance(0.45)) r.put(u, 1, v, id);
  }
  r.spot(r.cu, 1); r.work(r.cu, r.back - 1, 'stock');
  r.lantern(r.cu, r.back - 1);
  r.ceilingLights(5);
});

// parked speeders, tool racks, floor markings
defRoom('garage', { minW: 6, minD: 5, tags: ['vehicle', 'industry'] }, (r, rng) => {
  const bays = Math.floor((r.w - 1) / 4);
  for (let b = 0; b < bays; b++) {
    const u = 1 + b * 4, v = r.back - 1;
    r.putRaw(u - 1, -1, v - 2, B.PANEL_STRIPE); r.putRaw(u + 3, -1, v - 2, B.PANEL_STRIPE);
    if (!r.free(u, v) || !r.free(u + 2, v - 1)) continue;
    r.put(u, 0, v, B.CHROME); r.put(u + 1, 0, v, B.PANEL_RED); r.put(u + 2, 0, v, B.CHROME);
    r.put(u + 1, 1, v, B.GLASS); r.put(u + 1, 0, v - 1, B.DURASTEEL_DARK);
    r.spot(u + 1, v - 2 >= 2 ? v - 2 : 2);
  }
  for (let u = 0; u < r.w; u += 2) { r.put(u, 1, r.back, B.IRON_BARS); r.put(u, 2, r.back, B.IRON_BLOCK); }
  r.put(r.w - 1, 0, 2, B.BARREL); r.put(r.w - 1, 0, 3, B.BARREL); r.put(r.w - 1, 1, 3, B.BARREL);
  r.put(0, 0, 2, B.ANVIL); r.work(1, 2, 'mechanic');
  r.ceilingLights(4);
});

// shuttle bay: a parked shuttle, deck markings, fuel drums, lamps on posts (works at double height too)
defRoom('hangar', { minW: 8, minD: 6, tags: ['vehicle'] }, (r, rng) => {
  const c = r.cu, v0 = Math.max(2, r.back - 4);
  // centre-line deck lights and edge stripes
  for (let v = 0; v <= r.back; v += 2) r.putRaw(c, -1, v, B.GLOW_PANEL);
  for (let u = 0; u < r.w; u++) { r.putRaw(u, -1, r.back, B.PANEL_STRIPE); }
  // shuttle: hull 5 x 3 with cockpit glass, wing stubs and struts
  const su = c - 2;
  for (let u = su; u <= su + 4; u++) for (let v = v0; v <= v0 + 2; v++) {
    if (!r.free(u, v)) continue;
    const edge = v === v0 || v === v0 + 2;
    r.put(u, 0, v, B.IRON_BARS);
    r.put(u, 1, v, edge && (u === su || u === su + 4) ? B.PANEL_RED : B.DURASTEEL);
    if (!edge && u > su && u < su + 4) r.put(u, 2, v, u === su + 3 ? B.STEEL_GLASS : B.HULL_PLATE);
  }
  r.put(su - 1, 1, v0 + 1, B.DURASTEEL_DARK); r.put(su + 5, 1, v0 + 1, B.DURASTEEL_DARK);
  // cargo and fuel
  r.put(0, 0, r.back, B.BARREL); r.put(0, 0, r.back - 1, B.BARREL); r.put(0, 1, r.back, B.BARREL);
  r.put(r.w - 1, 0, r.back, B.CRATE); r.put(r.w - 1, 0, r.back - 1, B.CRATE); r.put(r.w - 1, 1, r.back, B.CRATE);
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 2, 2, 'deck officer');
  // lamp posts in the far corners
  for (const u of [1, r.w - 2]) { r.put(u, 0, 2, B.IRON_BARS); r.put(u, 1, 2, B.IRON_BARS); r.put(u, 2, 2, B.CITY_LAMP); }
  r.spot(1, r.back - 2); r.spot(r.w - 2, r.back - 2, 'stand'); r.spot(c, 1);
  r.ceilingLights(4);
});

// droid repair bay: repair stations and a row of parked droids
defRoom('droid_bay', { minW: 4, minD: 4, tags: ['tech', 'industry'] }, (r, rng) => {
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.CHROME); }
  for (let u = 1; u < r.w; u += 2) r.put(u, 0, r.back, B.CONSOLE);
  r.put(0, 0, 2, B.ANVIL); r.put(1, 0, 2, B.TABLE); r.put(1, 1, 2, B.CONSOLE);
  r.work(0, 3 <= r.back - 1 ? 3 : r.back - 1, 'droid tech');
  r.put(r.w - 1, 0, 2, B.CRATE); r.put(r.w - 1, 0, 3, B.CRATE); r.put(r.w - 1, 1, 2, B.IRON_BLOCK);
  r.spot(r.cu, r.back - 1);
  r.ceilingLights(4, B.GLOW_PANEL_BLUE);
});

// central glowing core in a cage, console ring, warning stripes
defRoom('reactor_room', { minW: 5, minD: 5, tags: ['industry', 'tech'] }, (r, rng) => {
  const c = r.cu, v = Math.floor((r.back + 1) / 2) + (r.d >= 7 ? 0 : 1);
  r.fill(c, 0, v, c, r.h - 1, v, B.GLOW_PANEL_BLUE);
  for (const [du, dv] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) r.fill(c + du, 0, v + dv, c + du, 1, v + dv, B.IRON_BARS);
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, B.VENT); }
  for (let u = 1; u < r.w; u += 2) r.put(u, 1, r.back, B.PANEL_RED);
  r.put(0, 0, 2, B.PANEL_STRIPE); r.put(r.w - 1, 0, 2, B.PANEL_STRIPE);
  r.work(c, r.back - 1, 'engineer'); r.spot(0, r.back - 1); r.spot(r.w - 1, r.back - 1);
  r.ceilingLights(4, B.GLOW_PANEL_BLUE);
});

// weapon racks, lockers, caged ammunition store
defRoom('armory', { minW: 4, minD: 4, tags: ['military'] }, (r, rng) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.IRON_BARS); r.put(u, 2, r.back, u % 2 ? B.PANEL_RED : B.PANEL_BLACK); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.IRON_BLOCK); r.put(0, 1, v, v % 2 ? B.IRON_BARS : B.IRON_BLOCK); }
  if (r.w >= 6 && r.d >= 6) {
    r.fill(r.w - 3, 0, r.back - 3, r.w - 3, 2, r.back - 1, B.IRON_BARS); r.fill(r.w - 2, 0, r.back - 3, r.w - 1, 2, r.back - 3, B.IRON_BARS);
    r.put(r.w - 2, 0, r.back - 2, B.CHEST); r.put(r.w - 1, 0, r.back - 2, B.CHEST); r.put(r.w - 1, 0, r.back - 1, B.CRATE);
  } else { r.put(r.w - 1, 0, 2, B.CHEST); }
  r.put(r.w - 1, 0, r.back - 1 > 2 ? 2 : 3, B.TABLE);
  r.work(1, r.back - 1, 'quartermaster'); r.spot(r.cu, 2);
  r.ceilingLights(4);
});
