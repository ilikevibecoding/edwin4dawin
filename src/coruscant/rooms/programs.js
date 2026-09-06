// Program room templates (docs/rubrics/16_programs.md B6): the signature rooms of the twenty building programs of
// docs/overhaul/SPEC.md section 7. They live in their own registry (PROGRAM_ROOMS) so the standard library that the
// floor planner draws from (and that W4's staffing table enumerates) is untouched; programs/apply.js refurnishes
// planned rooms with them after the family builder has run. Every template is `fn(room, rng, ctx)` on a Room frame
// (room.js); ctx.palette carries the program's material identity (block ids), ctx.variant a lot-seeded variant.
// Kind names are chosen so W4's roomFunction() keyword inference (src/npc/coruscant/rooms.js) lands on the right
// staffing table; the mapping is listed in the P3 report.
import { B, BLOCKS } from '../../blocks.js';
import { ROOMS } from './index.js';   // index.js registers the standard library the aliases below build on
import { SEAT } from './room.js';

export const PROGRAM_ROOMS = {};

export function defProgramRoom(name, opts, fn) {
  PROGRAM_ROOMS[name] = { name, minW: opts.minW ?? 4, minD: opts.minD ?? 4, maxW: opts.maxW ?? 99, maxD: opts.maxD ?? 99, tags: opts.tags || [], weight: 1, program: true, fn };
  return PROGRAM_ROOMS[name];
}
// A program room kind that reuses a standard library template (label differs, furniture is the library's).
export function aliasProgramRoom(name, base, opts = {}) {
  const t = ROOMS[base];
  return defProgramRoom(name, { minW: t.minW, minD: t.minD, maxW: t.maxW, maxD: t.maxD, tags: t.tags, ...opts }, (r, rng, ctx) => t.fn(r, rng, ctx));
}
export const programRoom = (name) => PROGRAM_ROOMS[name] || ROOMS[name] || null;
export const programRoomKinds = () => Object.keys(PROGRAM_ROOMS);

const DEFAULT_PALETTE = { accent: B.BLUE_WOOL, seat: B.STONE_BRICK_SLAB, counter: B.PANEL_BLACK, light: B.GLOW_PANEL, trim: B.CHROME, floor: null, wall: B.PLASTER };
// a seat an NPC can sit on (and the planner's pruneMeta keeps) is a slab, never a full block: the palette's seat
// and accent colours pick the slab material (wool -> wood, stone -> stone)
const SEAT_SLAB = new Map([[B.RED_WOOL, B.SPRUCE_SLAB], [B.BLUE_WOOL, B.OAK_SLAB], [B.GREEN_WOOL, B.OAK_SLAB], [B.WHITE_WOOL, B.STONE_BRICK_SLAB], [B.SANDSTONE, B.COBBLE_SLAB], [B.PANEL_STRIPE, B.COBBLE_SLAB], [B.GLOW_PANEL_BLUE, B.STONE_BRICK_SLAB], [B.GOLD_BLOCK, B.SPRUCE_SLAB], [B.PANEL_RED, B.COBBLE_SLAB]]);
const SLABS = new Set([B.OAK_SLAB, B.SPRUCE_SLAB, B.COBBLE_SLAB, B.STONE_BRICK_SLAB]);
const slabOf = (id) => SEAT_SLAB.get(id) || (SLABS.has(id) ? id : B.STONE_BRICK_SLAB);
const pal = (ctx) => { const P = { ...DEFAULT_PALETTE, ...((ctx && ctx.palette) || {}) }; P.seatSlab = slabOf(P.seat); P.accentSlab = slabOf(P.accent); return P; };
const emissive = (id) => { const b = BLOCKS[id]; return !!(b && b.emit > 0); };

// ------------------------------------------------------------------------------------------------ helpers
// console desks in rows (v, v+3, ...) with a seat + work record in front of each
function deskRows(r, kind, from = 2, step = 3) {
  let n = 0;
  for (let v = from; v <= r.back; v += step) for (let u = 0; u < r.w; u += 3) {
    if (!r.free(u, v) || !r.free(u, v - 1)) continue;
    r.put(u, 0, v, B.CONSOLE); if (u + 1 < r.w) r.put(u + 1, 0, v, B.TABLE);
    if (r.put(u, 0, v - 1, SEAT)) { r.work(u, v - 1, kind); n++; }
  }
  // a pass-through room (doors at both ends) has no free row pair: one desk against a side wall
  if (n === 0) for (let v = 2; v <= r.back && n === 0; v++) {
    if (r.free(0, v) && r.free(1, v) && r.put(0, 0, v, B.CONSOLE) && r.put(1, 0, v, SEAT)) { r.work(1, v, kind); n++; }
    else if (r.w >= 3 && r.free(r.w - 1, v) && r.free(r.w - 2, v) && r.put(r.w - 1, 0, v, B.CONSOLE) && r.put(r.w - 2, 0, v, SEAT)) { r.work(r.w - 2, v, kind); n++; }
  }
  return n;
}
// the first free, empty cell of the candidates takes the prop; returns the cell used (a prop the interaction needs
// must land somewhere even when the door zones eat the row the template wanted)
function propSomewhere(r, id, cands) {
  for (const [u, v] of cands) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v) && r.put(u, 0, v, id)) return [u, v];
  for (let v = r.back; v >= 2; v--) for (let u = 0; u < r.w; u++) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v) && r.put(u, 0, v, id)) return [u, v];
  return null;
}
// a stove wherever the room allows (kitchens with a door in the back wall lose the stove row)
function stoveSomewhere(r) {
  for (let u = 0; u < r.w; u++) for (let v = 0; v < r.d; v++) if (r.get(u, 0, v) === B.FURNACE) return true;
  // the sink is the one counter piece that can move: a stove matters more to the interaction than a trough
  for (let u = 0; u < r.w; u++) if (r.get(u, 0, r.back) === B.TROUGH && r.put(u, 0, r.back, B.FURNACE)) return true;
  const cells = [];
  for (let v = r.back; v >= 2; v--) for (let u = 0; u < r.w; u++) if (u === 0 || u === r.w - 1 || v === r.back) cells.push([u, v]);
  for (let v = r.back; v >= 2; v--) for (let u = 1; u < r.w - 1; u++) cells.push([u, v]);
  for (const [u, v] of cells) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v) && r.put(u, 0, v, B.FURNACE)) return true;
  return false;
}
// a row of seats along v from u0..u1 every `step`
function seatRow(r, v, id, u0 = 0, u1 = r.w - 1, step = 1) { for (let u = u0; u <= u1; u += step) r.seat(u, v, id); }
// a seat on a raised step (counter block + slab): the sitter's spot is one block up
function raisedSeat(r, u, v, P) {
  if (!r.free(u, v) || !r.put(u, 0, v, P.counter)) return false;
  r.put(u, 1, v, P.seatSlab); r.bp.spot(r.X(u, v), r.y + 1, r.Z(u, v), 'seat'); r.spots++;
  return true;
}
// back wall dressed with a cycle of blocks at heights 0..1 (and a third row when given)
function backWallOf(r, ids, top = null) {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, ids[u % ids.length]); r.put(u, 1, r.back, ids[(u + 1) % ids.length]); if (top) r.put(u, 2, r.back, top[u % top.length]); }
}
// holo board (2 wide) on the back wall
function board(r, u, wide = 2, ly = 1) { for (let k = 0; k < wide; k++) { r.put(u + k, ly, r.back, B.HOLO_SIGN); r.put(u + k, ly + 1, r.back, B.HOLO_SIGN); } }
// low queue rail along row v from ua..ub
function rail(r, ua, ub, v, id = B.IRON_BARS) { for (let u = ua; u <= ub; u++) r.put(u, 0, v, id); }
// stack of crates on cell (u, v), `hi` blocks tall
function stack(r, u, v, hi = 2, id = B.CRATE) { for (let k = 0; k < hi; k++) r.put(u, k, v, id); }
// striped floor marking (row v)
function stripeRow(r, v, id = B.PANEL_STRIPE) { for (let u = 0; u < r.w; u++) if (r.free(u, v) && !emissive(r.get(u, -1, v))) r.putRaw(u, -1, v, id); }   // the floor is the ceiling of the room below: its lights stay
// a parked droid: iron body, chrome dome, an eye light when active
function droid(r, u, v, active) { if (!r.put(u, 0, v, B.IRON_BLOCK)) return false; r.put(u, 1, v, active ? B.GLOW_PANEL_BLUE : B.CHROME); return true; }
// standing lamp post
function lamp(r, u, v) { if (r.put(u, 0, v, B.IRON_BARS)) { r.put(u, 1, v, B.IRON_BARS); r.put(u, 2, v, B.CITY_LAMP); } }
// a light-panel ceiling grid plus the program's light kind
const lights = (r, sp, id) => r.ceilingLights(sp, id);
// a bed somewhere the room allows (deep strips and masked tiers refuse the preferred corner): tries the given
// head cells, then the back corners, then beds laid along the wall
function bedSomewhere(r, prefer = []) {
  const cands = [...prefer, [r.w - 1, r.back], [0, r.back], [r.w - 1, r.back - 1], [0, r.back - 1], [r.cu, r.back], [r.w - 1, 3], [0, 3]];
  for (const [u, v] of cands) if (v >= 1 && r.bed(u, v)) return true;
  for (const [u, v] of cands) { if (u + 1 < r.w && r.bed(u, v, true, 1)) return true; if (u - 1 >= 0 && r.bed(u, v, true, -1)) return true; }
  return false;
}
// overhead storage racks along both side walls at head+1 height (the walkway stays clear): what a small store
// with doors at both ends can still hold
function overheadRacks(r, id = B.SHELF) {
  for (let v = 1; v < r.d - 1; v++) { if (r.inside(0, v)) r.putRaw(0, 2, v, id); if (r.w > 1 && r.inside(r.w - 1, v)) r.putRaw(r.w - 1, 2, v, id); }
}

// ================================================================================================ delegation office
defProgramRoom('delegation_reception', { minW: 4, minD: 4, tags: ['public', 'office'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  r.counter(c - 1 >= 0 ? c - 1 : 0, c, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(c, 1, r.back - 1, B.CONSOLE);
  r.work(c, r.back, 'desk');
  board(r, Math.max(0, c - 1));                                     // appointment board: today's constituents
  r.fill(r.w - 1, 0, r.back, r.w - 1, 2, r.back, P.accent);        // the delegation's colours on a banner column
  r.put(r.w - 1, 3, r.back, P.trim);
  for (let v = 2; v < r.back - 1; v += 2) { r.seat(0, v, P.accentSlab); if (r.w >= 6) r.seat(r.w - 1, v, P.accentSlab); }
  r.planter(0, r.back); r.lantern(c, 2);
  lights(r, 4, P.light);
});
defProgramRoom('appointments_office', { minW: 4, minD: 4, tags: ['office'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  deskRows(r, 'clerk');
  r.put(r.w - 1, 0, r.back, B.CHEST); r.put(r.w - 1, 1, r.back, B.BOOKSHELF); r.put(0, 0, r.back, B.BOOKSHELF); r.put(0, 1, r.back, B.BOOKSHELF);
  board(r, r.cu, 1);
  r.put(r.w - 1, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('delegation_meeting_room', { minW: 4, minD: 4, tags: ['office'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  for (let v = 2; v <= r.back - 1; v++) { r.table(c, v); r.seat(c - 1, v, P.seatSlab); if (c + 1 < r.w) r.seat(c + 1, v, P.seatSlab); }
  board(r, c); r.put(0, 0, r.back, P.accent); r.put(0, 1, r.back, P.accent); r.put(r.w - 1, 0, r.back, B.SHELF);
  r.work(c, r.back, 'desk');
  lights(r, 4, P.light);
});
defProgramRoom('research_library', { minW: 4, minD: 4, tags: ['culture'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, B.BOOKSHELF); r.put(0, 1, v, B.BOOKSHELF); if (v % 2 === 0) r.put(0, 2, v, B.CHEST); }
  backWallOf(r, [B.BOOKSHELF, B.BOOKSHELF, B.CONSOLE]);
  r.table(r.w - 1, 2); r.seat(r.w - 1, 3, P.seatSlab); r.put(r.w - 1, 1, 2, B.HOLO_SIGN);
  r.work(r.w - 1, r.back - 1, 'archivist');
  r.lantern(r.cu, r.back - 1);
  lights(r, 4, P.light);
});
defProgramRoom('delegation_staff_office', { minW: 4, minD: 4, tags: ['office'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  deskRows(r, 'aide');
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.IRON_BLOCK); }   // lockers
  r.put(r.w - 1, 0, r.back, B.BARREL); r.put(r.w - 1, 1, r.back, B.STONE_BRICK_SLAB);                        // caf urn
  r.put(1, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('envoy_private_office', { minW: 4, minD: 4, tags: ['office', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  for (let v = 2; v <= r.back; v++) for (let u = 0; u < r.w; u++) if (r.free(u, v)) r.putRaw(u, -1, v, P.accent);   // the delegation's carpet
  r.put(c, 0, r.back - 1, B.TABLE); if (c + 1 < r.w) r.put(c + 1, 0, r.back - 1, B.CONSOLE);
  r.seat(c, r.back, P.seatSlab); r.work(c, r.back, 'desk');
  r.put(0, 0, r.back, B.BOOKSHELF); r.put(0, 1, r.back, B.BOOKSHELF); r.put(r.w - 1, 0, r.back, B.GOLD_BLOCK); r.put(r.w - 1, 1, r.back, P.trim);
  r.put(c, 1, r.back, B.HOLO_SIGN); r.put(c, 2, r.back, P.trim);
  r.seat(0, 2, P.seatSlab); r.planter(r.w - 1, 2);
  r.lantern(c, 2);
  lights(r, 5, P.light);
});

// ================================================================================================ passenger terminal
defProgramRoom('ticket_counter', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back - 1, P.counter, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u += 2) { r.put(u, 1, r.back - 1, B.CONSOLE); r.work(u, r.back, 'desk'); }
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : P.accent); }   // destinations and fares
  if (r.d >= 6) rail(r, 0, r.w - 1, 2, B.OAK_FENCE);                                                                   // queue rail
  r.spot(r.cu, r.back - 2, 'wait'); r.spot(0, r.back - 2, 'wait');
  lights(r, 4, P.light);
});
defProgramRoom('departure_lounge', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v += 2) seatRow(r, v, P.seatSlab, 0, r.w - 1, 2);
  for (let u = 0; u < r.w; u++) r.put(u, 2, r.back, u % 3 === 1 ? B.HOLO_SIGN : P.counter);     // departures board
  r.put(r.w - 1, 0, r.back, B.CONSOLE); r.put(r.w - 1, 1, r.back, B.GLOW_PANEL_BLUE);           // holo timetable
  r.planter(0, r.back);
  r.spot(r.cu, r.back - 1, 'wait');
  lights(r, 4, P.light);
});
defProgramRoom('baggage_store', { minW: 4, minD: 4, tags: ['service', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v++) r.putRaw(r.cu, -1, v, B.RAIL);                                  // belt
  for (let v = 2; v <= r.back; v += 2) { stack(r, 0, v, 2); stack(r, r.w - 1, v, v % 4 === 2 ? 2 : 1, B.CHEST); }
  r.put(r.cu + 1 < r.w ? r.cu + 1 : r.cu, 0, r.back, B.CONSOLE);
  r.work(r.cu, r.back - 1, 'stock'); r.spot(1, r.back);
  r.put(0, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('customs_checkpoint', { minW: 4, minD: 4, tags: ['security', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu, v = Math.max(2, r.back - 2);
  r.fill(c - 1 >= 0 ? c - 1 : 0, 0, v, c - 1 >= 0 ? c - 1 : 0, 2, v, B.IRON_BARS); r.fill(c + 1, 0, v, c + 1, 2, v, B.IRON_BARS);   // scanner arch
  r.put(c, 3, v, B.GLOW_PANEL_BLUE); r.put(c - 1 >= 0 ? c - 1 : 0, 3, v, B.CHROME); r.put(c + 1, 3, v, B.CHROME);
  r.spot(c, v - 1, 'wait');
  r.put(0, 0, r.back, B.CONSOLE); r.put(1, 0, r.back, B.TABLE); r.work(0, r.back - 1, 'guard');
  r.put(r.w - 1, 0, r.back, B.CRATE); r.put(r.w - 1, 1, r.back, B.PANEL_RED);
  r.put(c, 1, r.back, B.HOLO_SIGN); r.put(c, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('information_desk', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  r.counter(c - 1 >= 0 ? c - 1 : 0, c + 1 < r.w ? c + 1 : c, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(c, 1, r.back - 1, B.CONSOLE);
  r.work(c, r.back, 'desk');
  for (let u = 0; u < r.w; u++) r.put(u, 1, r.back, B.HOLO_SIGN);                                    // the city map wall
  r.put(0, 2, r.back, P.accent); r.put(r.w - 1, 2, r.back, P.accent);
  r.seat(0, 2, P.seatSlab); r.planter(r.w - 1, 2);
  lights(r, 4, P.light);
});
defProgramRoom('terminal_cafe', { minW: 4, minD: 4, tags: ['food'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 2, r.back - 1, P.counter, B.STONE_BRICK_SLAB);
  r.put(0, 0, r.back, B.FURNACE); r.put(1, 0, r.back, B.BARREL); r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.SHELF);
  r.work(1, r.back, 'barista');
  for (let u = 0; u < r.w - 1; u += 2) r.seat(u, r.back - 2, P.seatSlab);
  if (r.d >= 6) { r.table(r.cu, 2); r.seat(r.cu - 1 >= 0 ? r.cu - 1 : 0, 2, P.seatSlab); }
  r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  lights(r, 4, P.light);
});

// ================================================================================================ cargo terminal
defProgramRoom('manifest_office', { minW: 4, minD: 4, tags: ['office', 'industry'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  deskRows(r, 'clerk');
  for (let u = 0; u < r.w; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.CHEST);                // manifests and the traffic board
  r.put(0, 0, r.back, B.CHEST); r.put(r.w - 1, 0, r.back, B.CRATE);
  r.put(r.cu, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('cargo_inspection', { minW: 4, minD: 4, tags: ['industry', 'security'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) r.table(u, r.back - 1);                                            // inspection bench
  r.put(0, 1, r.back - 1, B.CRATE); if (r.w >= 5) r.put(2, 1, r.back - 1, B.BARREL);
  r.put(r.w - 1, 1, r.back - 1, B.CONSOLE);                                                        // scanner
  r.work(1, r.back - 2, 'stock'); r.work(r.w - 1, r.back - 2, 'guard');
  backWallOf(r, [B.CRATE, B.PANEL_RED, B.CRATE]);
  stripeRow(r, 2);
  lights(r, 4, P.light);
});
defProgramRoom('bonded_store', { minW: 4, minD: 4, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  const P = pal(ctx), gv = Math.max(2, r.back - 2);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) { r.put(u, 0, gv, B.IRON_BARS); r.put(u, 1, gv, B.IRON_BARS); }      // the bonded cage
  r.put(r.cu, 2, gv, B.PANEL_RED);
  for (let u = 0; u < r.w; u++) { stack(r, u, r.back, u % 2 ? 2 : 1); }
  if (gv + 1 < r.back) r.put(0, 0, gv + 1, B.CHEST);
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, 2, 'stock');
  r.put(0, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('loading_yard', { minW: 4, minD: 4, tags: ['industry', 'service', 'freight'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  stripeRow(r, r.back - 1);                                                                          // dock apron line
  for (let u = 0; u < r.w; u += 2) stack(r, u, r.back, u % 4 === 0 ? 2 : 1);
  r.put(0, 0, 2, B.RAIL); r.put(1, 0, 2, B.RAIL);                                                    // hand trolley
  if (r.w >= 5) droid(r, r.w - 1, 2, true);                                                          // cargo droid on duty
  r.put(r.w - 1, 1, r.back, B.HOLO_SIGN);
  r.work(1, r.back - 1, 'stock'); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, r.back - 1, 'stock');
  r.spot(r.cu, 2, 'stand');
  lights(r, 4, P.light);
});
defProgramRoom('freight_dispatch', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, B.HOLO_SIGN); if (u % 2 === 0) { r.seat(u, r.back - 1, P.seatSlab); r.work(u, r.back - 1, 'operator'); } }
  r.put(0, 2, r.back, P.accent); r.put(r.w - 1, 2, r.back, B.PANEL_RED);
  if (r.d >= 6) { r.put(r.cu, 0, 3, P.counter); r.put(r.cu, 1, 3, B.GLOW_PANEL_BLUE); }              // route table
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('bulk_storage', { minW: 4, minD: 4, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) for (let v = 2; v <= r.back; v++) {
    if (u === r.cu || !r.free(u, v)) continue;                                                       // one aisle
    stack(r, u, v, (u + v) % 3 === 0 ? 3 : 2, (u + v) % 4 === 1 ? B.BARREL : B.CRATE);
  }
  r.work(r.cu, r.back, 'stock'); r.spot(r.cu, 2);
  r.putRaw(r.cu, -1, r.back, P.accent);
  lights(r, 3, P.light);
});
defProgramRoom('sorting_depot', { minW: 4, minD: 4, tags: ['industry'] }, (r, rng, ctx) => {
  const P = pal(ctx), bins = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, bins[u % 4]); r.put(u, 1, r.back, B.CRATE); }   // colour-coded bins
  for (let u = 0; u < r.w; u++) r.table(u, r.back - 2 >= 2 ? r.back - 2 : 2);                        // sorting table
  for (let v = 2; v <= r.back; v++) r.putRaw(0, -1, v, B.RAIL);                                      // feed belt
  r.work(1, r.back - 1, 'stock'); r.work(r.w - 1, r.back - 1, 'stock');
  r.put(r.cu, 2, r.back, P.accent);
  lights(r, 4, P.light);
});
defProgramRoom('staff_canteen', { minW: 4, minD: 4, tags: ['food'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back, P.counter); r.put(0, 0, r.back, B.FURNACE); r.put(r.w - 1, 0, r.back, B.BARREL);
  r.work(r.cu, r.back - 1, 'server');
  for (let v = 2; v <= r.back - 2; v += 3) for (let u = 0; u < r.w; u++) { r.table(u, v); r.seat(u, v - 1, P.seatSlab); if (v + 1 < r.back - 1) r.seat(u, v + 1, P.seatSlab); }
  lights(r, 4, P.light);
});

// ================================================================================================ ship repair hangar
defProgramRoom('repair_bay', { minW: 4, minD: 4, tags: ['vehicle', 'industry', 'freight'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu, big = r.w >= 7 && r.d >= 6;
  for (let v = 0; v <= r.back; v += 2) r.putRaw(c, -1, v, B.GLOW_PANEL);                             // centre line
  stripeRow(r, r.back);
  // the craft on its cradle: a shuttle hull in a big bay, a speeder in a small one
  const v0 = Math.max(2, r.back - (big ? 3 : 2));
  if (big) {
    for (let u = c - 2; u <= c + 2; u++) for (let v = v0; v <= v0 + 2; v++) {
      if (!r.free(u, v)) continue;
      const edge = v === v0 || v === v0 + 2;
      r.put(u, 0, v, B.IRON_BARS);
      r.put(u, 1, v, edge && (u === c - 2 || u === c + 2) ? B.PANEL_RED : B.DURASTEEL);
      if (!edge && u > c - 2 && u < c + 2) r.put(u, 2, v, u === c + 1 ? B.STEEL_GLASS : B.HULL_PLATE);
    }
    r.put(c, 1, v0 + 1, B.AIR); r.put(c, 2, v0 + 1, B.AIR);                                          // open engine hatch (the fault under repair)
    r.put(c, 1, v0 + 1, B.IRON_BARS);
  } else {
    for (let u = c - 1; u <= c + 1; u++) if (r.free(u, v0)) { r.put(u, 0, v0, B.IRON_BARS); r.put(u, 1, v0, u === c ? B.STEEL_GLASS : B.CHROME); }
    r.put(c, 1, v0 + 1 <= r.back ? v0 + 1 : v0, B.PANEL_RED);
  }
  // hoist gantry over the cradle
  const gu0 = Math.max(0, c - 2), gu1 = Math.min(r.w - 1, c + 2);
  r.fill(gu0, 0, v0, gu0, 3, v0, B.IRON_BARS); r.fill(gu1, 0, v0, gu1, 3, v0, B.IRON_BARS);
  for (let u = gu0; u <= gu1; u++) r.put(u, 3, v0, B.CHROME);
  r.put(c, 3, v0, B.IRON_BARS); r.put(c, 2, v0, B.IRON_BARS);
  // tool wall and diagnostics
  for (let u = 0; u < r.w; u++) if (u < gu0 || u > gu1) { r.put(u, 0, r.back, B.TABLE); r.put(u, 1, r.back, u % 2 ? B.IRON_BARS : B.ANVIL); }
  r.put(0, 0, 2, B.CONSOLE); r.put(0, 1, 2, B.HOLO_SIGN); r.work(1, 2, 'deck officer');
  r.put(r.w - 1, 0, 2, B.BARREL); r.put(r.w - 1, 0, 3 <= r.back ? 3 : 2, B.CRATE);
  r.work(gu0, v0 - 1 >= 2 ? v0 - 1 : 2, 'mechanic'); r.work(gu1, v0 - 1 >= 2 ? v0 - 1 : 2, 'mechanic');
  r.spot(c, 1, 'stand');
  if (big) { lamp(r, 1, r.back - 1); lamp(r, r.w - 2, r.back - 1); }
  lights(r, 4, P.light);
});
defProgramRoom('parts_store', { minW: 4, minD: 4, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  const P = pal(ctx), parts = [B.IRON_BLOCK, B.CHROME, B.IRON_BARS, B.CONSOLE, B.DURASTEEL];
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, B.SHELF); r.put(0, 1, v, parts[v % parts.length]); r.put(r.w - 1, 0, v, B.SHELF); r.put(r.w - 1, 1, v, parts[(v + 2) % parts.length]); }
  for (let u = 1; u < r.w - 1; u++) { r.put(u, 0, r.back, B.CRATE); if (u % 2) r.put(u, 1, r.back, parts[u % parts.length]); }
  r.put(r.cu, 2, r.back, B.HOLO_SIGN);                                                              // bin labels
  r.work(r.cu, r.back - 1, 'stock'); r.spot(r.cu, 2);
  lights(r, 4, P.light);
});
defProgramRoom('tool_workshop', { minW: 4, minD: 4, tags: ['industry'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.table(u, r.back); r.put(u, 2, r.back, u % 2 ? B.IRON_BARS : P.trim); }   // bench with the tool rail
  r.put(0, 0, r.back, B.ANVIL); r.put(r.w - 1, 0, r.back, B.FURNACE); r.put(r.cu, 1, r.back, B.CONSOLE);
  for (let v = 2; v < r.back; v += 2) r.put(0, 0, v, B.CRATE);
  r.put(r.w - 1, 0, 2, B.IRON_BLOCK); r.put(r.w - 1, 1, 2, B.CHROME);                                  // the part under repair
  r.work(1, r.back - 1, 'mechanic'); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, r.back - 1, 'mechanic');
  lights(r, 4, P.light);
});
defProgramRoom('diagnostics_control', { minW: 4, minD: 4, tags: ['tech', 'industry'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.GLOW_PANEL_BLUE); }
  r.seat(r.cu, r.back - 1, P.seatSlab); r.work(r.cu, r.back - 1, 'technician');
  r.put(0, 0, 2, B.IRON_BLOCK); r.put(0, 1, 2, B.STEEL_GLASS);                                        // hull sample under the scanner
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.put(r.w - 1, 1, 2, B.PANEL_RED);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('crew_office', { minW: 4, minD: 4, tags: ['office'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  deskRows(r, 'foreman');
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.IRON_BLOCK); }
  board(r, r.cu % 2 ? r.cu : r.cu + 1 < r.w ? r.cu + 1 : r.cu, 1);                                     // the job board
  r.put(r.w - 1, 0, r.back, B.CHEST);
  lights(r, 4, P.light);
});
defProgramRoom('crew_break_room', { minW: 4, minD: 4, tags: ['public'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.put(0, 0, r.back, P.accent); r.put(1, 0, r.back, P.accent); r.spot(0, r.back, 'seat'); r.spot(1, r.back, 'seat');
  r.table(1, r.back - 1); r.put(r.w - 1, 0, r.back, B.BARREL); r.put(r.w - 1, 1, r.back, B.STONE_BRICK_SLAB);   // caf
  r.put(r.w - 1, 0, 2, B.FURNACE); r.put(r.cu, 1, r.back, B.HOLO_SIGN);
  if (r.w >= 5) { r.put(r.w - 2, 0, r.back, B.CRATE); }
  r.seat(r.cu, 2, P.seatSlab);
  lights(r, 4, P.light);
});

// ================================================================================================ droid workshop
defProgramRoom('droid_intake', { minW: 4, minD: 4, tags: ['public', 'industry'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 2, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(0, 1, r.back - 1, B.CONSOLE);
  r.work(0, r.back, 'desk');
  for (let u = 1; u < r.w; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.SHELF);                  // tags and tickets
  for (let v = 2; v < r.back - 1; v += 2) droid(r, r.w - 1, v, false);                                // the queue of units waiting
  r.spot(r.cu, 2, 'wait');
  lights(r, 4, P.light);
});
defProgramRoom('droid_diagnostics', { minW: 4, minD: 4, tags: ['tech', 'industry'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu, v = Math.max(2, r.back - 1);
  r.put(c, 0, v, B.TABLE); r.put(c, 1, v, B.IRON_BLOCK);                                              // unit on the rig
  if (c - 1 >= 0) { r.put(c - 1, 0, v, B.CONSOLE); r.put(c - 1, 1, v, B.GLOW_PANEL_BLUE); }
  if (c + 1 < r.w) { r.put(c + 1, 0, v, B.CONSOLE); r.put(c + 1, 1, v, B.GLOW_PANEL_BLUE); }
  r.putRaw(c, 3, v, B.GLOW_PANEL_BLUE);
  r.work(c, v - 1, 'droid tech');
  backWallOf(r, [B.CONSOLE, B.HOLO_SIGN]);
  r.put(0, 0, 2, B.CRATE); r.put(r.w - 1, 0, 2, B.CHEST);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('droid_repair_bench', { minW: 4, minD: 4, tags: ['industry'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.table(u, r.back); r.put(u, 1, r.back, u % 3 === 0 ? B.IRON_BLOCK : u % 3 === 1 ? B.CHROME : B.ANVIL); }   // half-built units on the bench
  r.put(r.cu, 2, r.back, B.IRON_BARS);
  for (let u = 0; u < r.w; u += 2) r.work(u, r.back - 1, 'technician');
  r.put(0, 0, 2, B.CRATE); r.put(0, 1, 2, B.CRATE); r.put(r.w - 1, 0, 2, B.FURNACE);
  if (r.w >= 5 && r.d >= 5) { droid(r, r.w - 1, r.back - 2, true); droid(r, r.w - 1, r.back - 3 >= 2 ? r.back - 3 : 2, false); }   // active vs idle
  lights(r, 4, P.light);
});
defProgramRoom('parts_sorting', { minW: 4, minD: 4, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  const P = pal(ctx), bins = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, bins[v % 4]); r.put(0, 1, v, B.SHELF); r.put(r.w - 1, 0, v, B.SHELF); r.put(r.w - 1, 1, v, [B.CHROME, B.IRON_BARS, B.CONSOLE][v % 3]); }
  for (let u = 1; u < r.w - 1; u++) r.table(u, r.back);
  r.put(r.cu, 1, r.back, B.IRON_BLOCK); r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 4, P.light);
});
defProgramRoom('droid_test_range', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v++) if (r.free(r.cu, v)) r.putRaw(r.cu, -1, v, B.PANEL_STRIPE);      // the test lane
  r.put(r.cu, 0, r.back, B.PANEL_RED); r.put(r.cu, 1, r.back, B.PANEL_RED);                          // target
  droid(r, r.cu, 2, true);
  r.put(0, 0, r.back, B.CONSOLE); r.put(0, 1, r.back, B.HOLO_SIGN); r.work(0, r.back - 1, 'droid tech');
  for (let v = 2; v < r.back; v += 2) r.put(r.w - 1, 0, v, B.IRON_BARS);                             // safety rail
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('droid_charging', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { const on = u % 2 === 0; r.putRaw(u, -1, r.back, on ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK); droid(r, u, r.back, on); }
  if (r.d >= 6) for (let u = 1; u < r.w; u += 3) { r.putRaw(u, -1, r.back - 2, B.GLOW_PANEL_BLUE); droid(r, u, r.back - 2, true); }
  r.put(0, 0, 2, B.CONSOLE); r.work(1, 2, 'technician');
  r.put(r.w - 1, 1, 2, B.PANEL_RED);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('pickup_desk', { minW: 4, minD: 4, tags: ['public'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(r.w - 1, 1, r.back - 1, B.CONSOLE);
  r.work(r.w - 1, r.back, 'desk');
  for (let u = 0; u < r.w - 1; u += 2) droid(r, u, r.back, u % 4 === 0);                              // finished units waiting for their owners
  r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  r.spot(r.cu, 2, 'wait');
  lights(r, 4, P.light);
});

// ================================================================================================ diner
defProgramRoom('diner_counter', { minW: 4, minD: 4, tags: ['food', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx), cv = Math.max(2, r.back - 2), v2 = ctx && ctx.variant;
  r.counter(0, r.w - 1, cv, P.counter, B.STONE_BRICK_SLAB);                                          // the long counter
  for (let u = 0; u < r.w; u += v2 === 1 ? 1 : 2) r.seat(u, cv - 1, P.seatSlab);                          // stools
  r.put(0, 0, r.back, B.FURNACE); r.put(1, 0, r.back, P.counter); r.put(1, 1, r.back, B.STONE_BRICK_SLAB);   // hot plate and pass
  for (let u = 2; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.SHELF); }   // menu board and pie shelf
  if (r.w >= 5) r.put(r.w - 1, 1, r.back, B.HAY_BALE);
  r.work(1, r.back - 1 > cv ? r.back - 1 : cv - 1, 'cook'); r.work(r.cu, cv + 1 <= r.back ? cv + 1 : cv - 1, 'server');
  if (r.d >= 7) for (let u = 0; u < r.w; u += 3) { if (r.table(u, 3)) { r.seat(u, 2, P.seatSlab); if (u + 1 < r.w) r.seat(u + 1, 3, P.seatSlab); } }   // booths
  r.lantern(r.cu, 2);
  lights(r, 4, P.light);
});
defProgramRoom('diner_kitchen', { minW: 4, minD: 4, tags: ['service', 'food'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back, P.counter);
  r.put(0, 0, r.back, B.FURNACE); r.put(r.w - 1, 0, r.back, B.FURNACE); r.put(r.cu, 0, r.back, B.TROUGH); r.put(r.cu, 1, r.back, B.AIR);
  for (let u = 0; u < r.w; u += 2) r.put(u, 2, r.back, B.SHELF);
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, P.counter); r.put(0, 1, v, B.STONE_BRICK_SLAB); }   // prep counter
  r.put(r.w - 1, 0, r.back - 1, B.BARREL); r.put(r.w - 1, 0, 2, B.CRATE);
  r.work(1, r.back - 1, 'cook'); if (r.w >= 5) r.work(r.w - 2, r.back - 1, 'cook');
  lights(r, 4, P.light);
});
defProgramRoom('cold_store', { minW: 3, minD: 3, tags: ['service', 'food'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CRATE); r.put(u, 1, r.back, u % 2 ? B.SNOW : B.BARREL); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.BARREL); if (v % 2 === 0) r.put(0, 1, v, B.SNOW); }
  r.put(r.w - 1, 0, 2, B.CHEST);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL_BLUE);
});
defProgramRoom('kitchen_scullery', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.TROUGH); r.put(u, 1, r.back, u % 2 ? B.CHROME : B.SHELF); }   // sinks and dish racks
  for (let v = 2; v < r.back; v++) { r.put(r.w - 1, 0, v, B.SHELF); }
  r.put(0, 0, 2, B.BARREL);
  r.work(r.cu, r.back - 1, 'cook');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('delivery_store', { minW: 3, minD: 3, tags: ['service', 'freight'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) stack(r, u, r.back, u % 2 ? 2 : 1, u % 3 === 2 ? B.BARREL : B.CRATE);
  r.put(0, 0, 2, B.RAIL);                                                                             // hand trolley
  r.put(r.w - 1, 1, r.back, B.HOLO_SIGN);                                                             // delivery manifest
  r.put(r.w - 1, 0, 2, B.HAY_BALE);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, P.light);
});
defProgramRoom('staff_locker', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.IRON_BLOCK); r.put(u, 1, r.back, B.IRON_BLOCK); }   // lockers
  for (let v = 2; v < r.back; v++) r.put(r.w - 1, 1, v, B.OAK_FENCE);                                 // coat pegs
  r.put(0, 0, 2, B.STONE_BRICK_SLAB); r.spot(0, 2, 'seat');
  r.put(0, 1, r.back - 1, B.GLASS);                                                                    // mirror
  lights(r, 3, B.GLOW_PANEL);
});

// ================================================================================================ cantina / club
defProgramRoom('cantina_bar', { minW: 4, minD: 4, tags: ['food', 'public', 'entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx), bv = Math.max(2, r.back - 1);
  r.counter(0, r.w - 1, bv, P.counter, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, u % 3 === 1 ? B.BARREL : B.SHELF); r.put(u, 2, r.back, u % 3 === 1 ? B.HOLO_SIGN : P.accent); }   // the bottle wall
  for (let u = 0; u < r.w; u += 2) r.seat(u, bv - 1, P.seatSlab);
  r.work(r.cu, r.back, 'bartender'); if (r.w >= 6) r.work(0, r.back, 'bartender');
  if (r.d >= 6) for (let u = 1; u < r.w; u += 3) { if (r.table(u, 2)) { r.seat(u - 1, 2, P.seatSlab); if (u + 1 < r.w) r.seat(u + 1, 2, P.seatSlab); } }
  r.lantern(1, 2); r.lantern(r.w - 2 >= 0 ? r.w - 2 : 0, 2);
  lights(r, 6, P.light);
});
defProgramRoom('booth_seating', { minW: 4, minD: 4, tags: ['public', 'entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  // booths at two heights: the back booths on a raised step give a different sightline to the stage
  for (let u = 0; u < r.w; u += 3) {
    if (!r.free(u, r.back)) continue;
    raisedSeat(r, u, r.back, P);
    if (u + 1 < r.w) { r.put(u + 1, 0, r.back, P.counter); r.put(u + 1, 1, r.back, B.TABLE); }
    if (u + 2 < r.w) raisedSeat(r, u + 2, r.back, P);
  }
  for (let u = 0; u < r.w; u += 3) { if (r.table(u + 1 < r.w ? u + 1 : u, 2)) { r.seat(u, 2, P.accentSlab); if (u + 2 < r.w) r.seat(u + 2, 2, P.accentSlab); } }
  for (let u = 1; u < r.w; u += 3) r.lantern(u, r.back - 1);
  r.put(0, 2, r.back, P.accent); r.put(r.w - 1, 2, r.back, P.accent);
  lights(r, 6, P.light);
});
defProgramRoom('cantina_stage', { minW: 4, minD: 4, tags: ['entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx), sv = Math.max(2, r.back - 1);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, sv, B.SMOOTH_STONE); r.put(u, 0, r.back, B.SMOOTH_STONE); }   // the raised stage
  r.put(0, 1, r.back, B.PIANO); r.spot(0, sv, 'musician'); r.work(1 < r.w ? 1 : 0, r.back, 'musician');
  if (r.w >= 4) { r.put(r.w - 1, 1, r.back, P.counter); r.put(r.w - 1, 2, r.back, B.IRON_BARS); }     // speaker stack
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, 3, sv - 1, u % 4 ? B.GLOW_PANEL_BLUE : P.light);       // stage lights
  for (let u = 0; u < r.w; u += 2) r.seat(u, 2, P.seatSlab);                                             // the front row
  r.put(r.cu, 1, r.back, B.HOLO_SIGN);
  lights(r, 6, P.light);
});
defProgramRoom('stock_room', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) stack(r, u, r.back, u % 2 ? 2 : 1, B.BARREL);
  for (let v = 2; v < r.back; v += 2) stack(r, 0, v, 1, B.CRATE);
  r.put(r.w - 1, 0, 2, B.CHEST);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('private_booth', { minW: 3, minD: 3, tags: ['public', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu, v = Math.max(2, r.back - 1);
  // the table goes wherever the door zone leaves room (a three-deep booth with a centred door has no free centre row)
  const t = propSomewhere(r, B.TABLE, [[c, v], [c, r.back], [c - 1, r.back], [c + 1, r.back], [0, r.back], [r.w - 1, r.back]]) || [c, v];
  for (const [du, dv] of [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1]]) if (r.free(t[0] + du, t[1] + dv) && r.empty(t[0] + du, 0, t[1] + dv)) r.seat(t[0] + du, t[1] + dv, P.accentSlab);
  r.lantern(c, v);
  r.put(0, 1, r.back, P.counter); r.put(r.w - 1, 1, r.back, P.counter);
  r.putRaw(c, r.h, v, B.LANTERN);
});
defProgramRoom('staff_break', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.seat(0, r.back, P.accentSlab); r.table(1 < r.w ? 1 : 0, r.back); if (r.w >= 3) r.seat(2, r.back, P.accentSlab);
  r.put(r.w - 1, 0, r.back, B.IRON_BLOCK); r.put(r.w - 1, 1, r.back, B.IRON_BLOCK);
  r.put(r.w - 1, 0, 2, B.BARREL); r.put(0, 1, 2, B.HOLO_SIGN);
  lights(r, 3, P.light);
});
defProgramRoom('back_office', { minW: 3, minD: 3, tags: ['office', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  // the safe and the ledgers take the back corners first (where the back door leaves them); the desk then lands on
  // a cell that is still empty, so the console the interaction needs is never overwritten by the safe
  if (r.empty(0, 0, r.back)) { r.put(0, 0, r.back, B.IRON_BLOCK); r.put(0, 1, r.back, B.IRON_BLOCK); }    // the safe
  if (r.w > 1 && r.empty(r.w - 1, 0, r.back)) { r.put(r.w - 1, 0, r.back, B.BOOKSHELF); r.put(r.w - 1, 1, r.back, B.CHEST); }   // ledgers
  const t = propSomewhere(r, B.TABLE, [[r.cu, r.back - 1], [r.cu, r.back], [r.cu - 1, r.back], [r.cu + 1, r.back], [1, r.back], [r.w - 2, r.back]]);
  if (t) {
    r.put(t[0], 1, t[1], B.CONSOLE);
    for (const [du, dv] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) if (r.free(t[0] + du, t[1] + dv) && r.empty(t[0] + du, 0, t[1] + dv)) { r.seat(t[0] + du, t[1] + dv, P.seatSlab); r.work(t[0] + du, t[1] + dv, 'executive'); break; }
  } else propSomewhere(r, B.CONSOLE, [[r.cu, 2], [0, 2], [r.w - 1, 2]]);
  r.lantern(r.cu, 2);
});

// ================================================================================================ opera house
defProgramRoom('ticket_desk', { minW: 4, minD: 4, tags: ['public', 'culture'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(r.cu, 1, r.back - 1, B.CONSOLE);
  r.work(r.cu, r.back, 'desk');
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : P.accent); r.put(u, 2, r.back, u % 2 ? P.accent : B.HOLO_SIGN); }   // tonight's bill
  if (r.d >= 6) rail(r, 0, r.w - 1, 2, B.OAK_FENCE);
  r.spot(r.cu, r.back - 2, 'wait');
  lights(r, 4, P.light);
});
defProgramRoom('auditorium', { minW: 4, minD: 4, tags: ['culture', 'entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SMOOTH_STONE); r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : P.accent); }   // stage and the holo backdrop
  r.work(0, r.back, 'projectionist'); r.spot(c, r.back, 'stand');
  const rows = Math.max(0, r.back - 3);
  for (let v = 2; v < r.back - 1; v++) {
    const raised = rows >= 4 && v <= 2 + Math.floor(rows / 2) - 1;                                    // the back rows are raked
    for (let u = 0; u < r.w; u++) {
      if (u === c) continue;                                                                          // centre aisle
      if (raised) { if (v % 2 === 0) raisedSeat(r, u, v, P); else r.put(u, 0, v, P.counter); }
      else if (v % 2 === 0) r.seat(u, v, P.seatSlab);
    }
  }
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, 3, r.back - 1, u % 4 ? B.GLOW_PANEL_BLUE : P.light);   // stage lights
  r.putRaw(c, -1, 2, B.GLOW_PANEL); if (r.back - 2 > 2) r.putRaw(c, -1, r.back - 2, B.GLOW_PANEL);   // aisle lights
  lights(r, 6, P.light);
});
defProgramRoom('stalls_seating', { minW: 4, minD: 4, tags: ['culture'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v += 2) for (let u = 0; u < r.w; u++) if (u !== r.cu) r.seat(u, v, P.seatSlab);
  for (let u = 0; u < r.w; u++) r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : P.counter);                 // relay screen for the cheap seats
  r.putRaw(r.cu, -1, r.back, B.GLOW_PANEL);
  lights(r, 6, P.light);
});
defProgramRoom('private_box', { minW: 3, minD: 3, tags: ['culture', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) raisedSeat(r, u, r.back, P);                                          // the raised row
  r.put(0, 2, r.back, B.RED_WOOL); r.put(r.w - 1, 2, r.back, B.RED_WOOL);                             // curtains
  r.put(r.cu, 0, 2, B.GOLD_BLOCK); r.put(r.cu, 1, 2, B.GLASS);                                        // opera glasses on a stand
  r.lantern(r.cu, r.back - 1);
});
defProgramRoom('backstage', { minW: 4, minD: 4, tags: ['stage', 'service'] }, (r, rng, ctx) => {
  const P = pal(ctx), flats = [B.RED_WOOL, B.BLUE_WOOL, B.WHITE_WOOL, B.GREEN_WOOL];
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, flats[u % 4]); r.put(u, 1, r.back, flats[(u + 1) % 4]); r.put(u, 2, r.back, B.IRON_BARS); }   // scenery flats under the rigging
  for (let v = 2; v < r.back; v += 2) { r.put(0, 0, v, B.CRATE); r.put(0, 1, v, B.CHEST); }           // prop crates
  r.put(r.w - 1, 0, 2, B.IRON_BARS); r.put(r.w - 1, 1, 2, B.IRON_BARS); r.put(r.w - 1, 2, 2, B.CHROME);   // fly rope
  r.work(r.cu, r.back - 1, 'musician'); r.spot(1, r.back - 1);
  lights(r, 4, P.light);
});
defProgramRoom('lighting_control', { minW: 4, minD: 4, tags: ['tech', 'stage'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, [B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.PANEL_RED][u % 3]); }
  r.seat(r.cu, r.back - 1, P.seatSlab); r.work(r.cu, r.back - 1, 'operator');
  r.put(0, 0, 2, B.IRON_BLOCK); r.put(0, 1, 2, B.IRON_BARS); r.put(r.w - 1, 0, 2, B.CHEST);           // spare lamps
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('foyer_bar', { minW: 4, minD: 4, tags: ['food', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 2, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.SHELF);
  for (let u = 0; u < r.w - 1; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : P.accent);              // posters of the season
  r.work(r.cu, r.back, 'bartender');
  for (let u = 0; u < r.w - 1; u += 2) r.seat(u, r.back - 2, P.seatSlab);
  r.planter(r.w - 1, 2);
  lights(r, 4, P.light);
});

// ================================================================================================ market arcade
// every stall has an awning, a counter and a display that matches its stock; the price board (fixed price) or its
// absence (haggling) is the stall's pricing identity
function stall(r, ctx, awning, display, stock, work, fixedPrice) {
  const P = pal(ctx), v = Math.max(2, r.back - 1);
  for (let u = 0; u < r.w; u++) { r.table(u, v); r.put(u, 2, v, awning); r.put(u, 2, v - 1, awning); }
  for (let u = 0; u < r.w; u++) r.put(u, 1, v, display[u % display.length]);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) r.put(u, 0, r.back, stock[u % stock.length]);         // the stallholder stands in the gap
  if (fixedPrice) r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  r.put(0, 0, v - 1, B.OAK_FENCE); r.put(0, 1, v - 1, B.OAK_FENCE); r.put(r.w - 1, 0, v - 1, B.OAK_FENCE); r.put(r.w - 1, 1, v - 1, B.OAK_FENCE);
  r.work(r.cu, r.back, work); r.spot(r.cu, v - 2 >= 1 ? v - 2 : 1); r.spot(r.cu - 1 >= 0 ? r.cu - 1 : 0, v - 2 >= 1 ? v - 2 : 1);
  r.lantern(1 < r.w ? 1 : 0, 1);
  lights(r, 4, P.light);
}
defProgramRoom('produce_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.GREEN_WOOL, [B.PUMPKIN, B.HAY_BALE, B.WHEAT], [B.CRATE, B.BARREL], 'vendor', false));
defProgramRoom('mechanical_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.RED_WOOL, [B.IRON_BARS, B.ANVIL, B.CHROME], [B.CRATE, B.IRON_BLOCK], 'vendor', true));
defProgramRoom('textile_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.WHITE_WOOL, [B.RED_WOOL, B.BLUE_WOOL, B.WHITE_WOOL, B.GREEN_WOOL], [B.WHITE_WOOL, B.CRATE], 'tailor', false));
defProgramRoom('appliance_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.BLUE_WOOL, [B.FURNACE, B.TROUGH, B.CONSOLE], [B.CRATE, B.CHEST], 'vendor', true));
defProgramRoom('navigation_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.PANEL_BLACK, [B.CONSOLE, B.HOLO_SIGN, B.GLOW_PANEL_BLUE], [B.CONSOLE, B.CHEST], 'broker', true));
defProgramRoom('salvage_kiosk', { minW: 4, minD: 4, tags: ['retail', 'public'] }, (r, rng, ctx) => stall(r, ctx, B.PANEL_STRIPE, [B.IRON_BARS, B.BARREL, B.IRON_BLOCK, B.RAIL], [B.CRATE, B.IRON_BARS, B.GRAVEL], 'broker', false));

// ================================================================================================ clinic
defProgramRoom('triage_reception', { minW: 4, minD: 4, tags: ['medical', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  r.counter(c - 1 >= 0 ? c - 1 : 0, c, r.back - 1, B.WHITE_WOOL, B.STONE_BRICK_SLAB); r.put(c, 1, r.back - 1, B.CONSOLE);
  for (let u = 0; u < r.w; u++) r.put(u, u === c ? 2 : 1, r.back, u === c ? B.PANEL_RED : u % 2 ? B.HOLO_SIGN : B.WHITE_WOOL);   // triage screen: numbers and the red cross over the nurse
  for (let v = 2; v < r.back - 1; v++) { r.seat(0, v, P.seatSlab); if (r.w >= 5) r.seat(r.w - 1, v, P.seatSlab); }   // numbered waiting seats
  if (r.back - 1 <= 2) for (let u = 0; u < r.w; u += 2) if (u < c - 1 || u > c) r.seat(u, 2, P.seatSlab);            // shallow room: the seats line the counter row
  r.put(r.w - 1, 0, r.back, B.CHEST);
  r.work(c, r.back, 'nurse');
  lights(r, 3, B.GLOW_PANEL_BLUE);
});
defProgramRoom('medical_exam', { minW: 4, minD: 4, tags: ['medical'] }, (r, rng, ctx) => {
  const c = r.cu, v = Math.max(2, r.back - 1);
  r.put(c, 0, v, B.WHITE_WOOL); r.put(c, 0, r.back, B.WHITE_WOOL);                                    // exam table
  r.putRaw(c, 3, v, B.GLOW_PANEL);
  r.put(0, 0, r.back, B.CONSOLE); r.put(0, 1, r.back, B.HOLO_SIGN); r.seat(0, r.back - 1); r.work(0, r.back - 1, 'medic');
  r.put(r.w - 1, 0, r.back, B.TROUGH); r.put(r.w - 1, 1, r.back, B.CHROME);                           // sink
  r.put(r.w - 1, 0, 2, B.SHELF); r.put(r.w - 1, 1, 2, B.WHITE_WOOL);                                  // cabinet
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('treatment_room', { minW: 4, minD: 4, tags: ['medical'] }, (r, rng, ctx) => {
  const c = r.cu, v = Math.max(2, r.back - 1);
  r.put(c, 0, v, B.GLOW_PANEL_BLUE); r.put(c, 1, v, B.STEEL_GLASS); r.put(c, 2, v, B.STEEL_GLASS); r.put(c, 3, v, B.CHROME);   // the bacta tank
  if (r.free(0, r.back) && r.free(0, r.back - 1)) r.bed(0, r.back);
  r.put(1 < r.w ? 1 : 0, 1, r.back, B.CONSOLE);
  r.put(r.w - 1, 0, r.back, B.CONSOLE); r.put(r.w - 1, 1, r.back, B.GLOW_PANEL_BLUE);
  if (r.back - 1 > 2) r.put(r.w - 1, 0, 2, B.CHEST); else r.put(r.w - 2 >= 0 ? r.w - 2 : 0, 0, r.back, B.CHEST);
  r.put(0, 1, 2, B.PANEL_RED);
  r.work(r.w - 1, r.back - 1, 'medic');
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('recovery_ward', { minW: 4, minD: 4, tags: ['medical'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u += 2) { if (r.bed(u, r.back)) r.put(u, 1, r.back, B.CONSOLE); if (u + 1 < r.w && u + 2 < r.w) r.fill(u + 1, 0, r.back - 1, u + 1, 2, r.back, B.WHITE_WOOL); }   // beds behind privacy panels
  r.put(r.w - 1, 0, 2, B.TABLE); r.put(r.w - 1, 1, 2, B.CONSOLE); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, 2, 'nurse');
  r.put(0, 0, 2, B.SHELF); r.put(0, 1, 2, B.WHITE_WOOL);
  lights(r, 3, B.GLOW_PANEL_BLUE);
});
defProgramRoom('supply_store', { minW: 3, minD: 3, tags: ['medical', 'service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, u % 2 ? B.WHITE_WOOL : B.CHEST); r.put(u, 2, r.back, B.SHELF); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.CRATE); if (v % 2 === 0) r.put(0, 1, v, B.WHITE_WOOL); }
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL_BLUE);
});
defProgramRoom('medical_staff_post', { minW: 3, minD: 3, tags: ['medical'] }, (r, rng, ctx) => {
  r.put(r.cu, 0, r.back, B.CONSOLE); r.put(r.cu, 1, r.back, B.HOLO_SIGN); r.seat(r.cu, r.back - 1); r.work(r.cu, r.back - 1, 'medic');
  r.put(0, 0, r.back, B.IRON_BLOCK); r.put(0, 1, r.back, B.IRON_BLOCK); r.put(r.w - 1, 0, r.back, B.BARREL); r.put(r.w - 1, 1, r.back, B.STONE_BRICK_SLAB);
  r.put(r.w - 1, 0, 2, B.WHITE_WOOL);
  lights(r, 3, B.GLOW_PANEL_BLUE);
});
aliasProgramRoom('washroom', 'restroom');
defProgramRoom('emergency_bay', { minW: 4, minD: 4, tags: ['medical', 'freight'] }, (r, rng, ctx) => {
  const c = r.cu;
  if (r.free(c, r.back) && r.free(c, r.back - 1)) { r.bed(c, r.back); r.put(c, 1, r.back, B.CONSOLE); }   // the gurney and its monitor
  r.put(0, 0, r.back, B.CONSOLE); r.put(0, 1, r.back, B.PANEL_RED); r.work(0, r.back - 1, 'medic');    // crash cart
  r.put(r.w - 1, 0, r.back, B.CHEST); r.put(r.w - 1, 1, r.back, B.WHITE_WOOL);
  for (let u = 0; u < r.w; u += 2) r.putRaw(u, 3, 2, B.PANEL_RED);                                    // emergency strip lights
  stripeRow(r, 2);
  r.spot(c, 2, 'stand');
  lights(r, 3, B.GLOW_PANEL);
});

// ================================================================================================ worker apartments
// each flat is a home with evidence of a specific life
defProgramRoom('nightshift_flat', { minW: 4, minD: 4, tags: ['home'] }, (r, rng, ctx) => {
  bedSomewhere(r, [[0, r.back]]); r.put(1 < r.w ? 1 : 0, 0, r.back, B.CHEST);
  for (let v = 2; v <= r.back; v++) { r.put(r.w - 1, 1, v, B.PANEL_BLACK); r.put(r.w - 1, 2, v, B.PANEL_BLACK); }   // blackout panels over the window wall
  r.put(r.w - 1, 0, 2, B.CONSOLE);                                                                    // the alarm clock console
  r.put(0, 0, 2, B.FURNACE); r.put(0, 1, 2, B.SHELF);
  r.table(r.cu, 2); r.seat(r.cu, 3 <= r.back - 1 ? 3 : 2);
  r.lantern(r.cu, r.back - 1);
});
defProgramRoom('mechanic_flat', { minW: 4, minD: 4, tags: ['home'] }, (r, rng, ctx) => {
  bedSomewhere(r, [[r.w - 1, r.back]]); r.put(r.w - 2 >= 0 ? r.w - 2 : 0, 0, r.back, B.CHEST);
  r.table(0, r.back); r.put(0, 1, r.back, B.IRON_BARS);                                               // the half-repaired appliance on the table
  r.put(0, 0, r.back - 1, B.ANVIL); r.put(0, 0, 2, B.CRATE); r.put(0, 1, 2, B.CHROME);
  r.put(r.w - 1, 0, 2, B.FURNACE); r.put(r.w - 1, 1, 2, B.SHELF);
  r.seat(1 < r.w ? 1 : 0, r.back - 1); r.spot(r.cu, 2);
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('musician_flat', { minW: 4, minD: 4, tags: ['home'] }, (r, rng, ctx) => {
  bedSomewhere(r, [[0, r.back]]); r.put(1 < r.w ? 1 : 0, 0, r.back, B.CHEST);
  r.put(r.w - 1, 0, r.back, B.PIANO); r.seat(r.w - 1, r.back - 1);                                    // the practice corner
  r.put(r.w - 1, 0, 2, B.OAK_FENCE); r.put(r.w - 1, 1, 2, B.BOOKSHELF);                               // music stand and scores
  for (let v = 2; v < r.back; v += 2) r.put(0, 1, v, v % 4 === 2 ? B.RED_WOOL : B.BLUE_WOOL);        // posters
  r.put(0, 0, 2, B.FURNACE); r.table(r.cu, 2);
  r.lantern(r.cu, r.back - 1);
});
defProgramRoom('parcel_store', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, B.SHELF); r.put(u, 2, r.back, B.SHELF); }   // mail slots
  r.put(0, 0, 2, B.CRATE); r.put(r.w - 1, 0, 2, B.CRATE); r.put(r.w - 1, 1, 2, B.CRATE);
  r.put(r.cu, 0, r.back - 1, B.CONSOLE); r.work(r.cu, r.back - 2 >= 2 ? r.back - 2 : 2, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
aliasProgramRoom('shared_laundry', 'laundry');
defProgramRoom('utility_room', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 2, r.back, B.IRON_BARS); r.put(u, 0, r.back, u % 2 ? B.IRON_BLOCK : B.FURNACE); r.put(u, 1, r.back, u % 2 ? B.VENT : B.IRON_BLOCK); }   // boilers and ducts
  for (let v = 2; v < r.back; v++) r.put(0, 2, v, B.IRON_BARS);
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.put(r.w - 1, 1, 2, B.PANEL_RED); r.work(r.w - 1, 3 <= r.back - 1 ? 3 : 2, 'technician');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('communal_kitchen', { minW: 4, minD: 4, tags: ['service', 'home'] }, (r, rng, ctx) => { ROOMS.kitchen.fn(r, rng, ctx); stoveSomewhere(r); });
aliasProgramRoom('residents_garden', 'garden_terrace', { tags: ['green', 'top'] });

// ================================================================================================ affluent apartments
defProgramRoom('visitor_reception', { minW: 4, minD: 4, tags: ['public', 'lobby'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu;
  for (let u = 0; u < r.w; u++) for (let v = 0; v <= r.back; v++) if (r.free(u, v) && (u + v) % 2 === 0) r.putRaw(u, -1, v, B.SMOOTH_STONE);   // marble
  r.counter(c - 1 >= 0 ? c - 1 : 0, c + 1 < r.w ? c + 1 : c, r.back - 1, B.CHROME, B.STONE_BRICK_SLAB); r.put(c, 1, r.back - 1, B.CONSOLE);
  r.work(c, r.back, 'receptionist');
  r.put(0, 0, r.back, B.SMOOTH_STONE); r.put(0, 1, r.back, B.GOLD_BLOCK); r.putRaw(0, r.h, r.back, P.light);   // art on a pedestal
  r.put(r.w - 1, 0, r.back, B.SMOOTH_STONE); r.put(r.w - 1, 1, r.back, B.CHROME);
  r.seat(0, 2, P.seatSlab); r.seat(r.w - 1, 2, P.seatSlab); r.planter(r.w - 1, 3 <= r.back - 1 ? 3 : 2);
  r.put(c, 1, r.back, B.HOLO_SIGN);
  lights(r, 4, P.light);
});
defProgramRoom('grand_residence', { minW: 4, minD: 4, tags: ['home', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  bedSomewhere(r, [[r.w - 1, r.back]]); if (r.w >= 5) r.bed(r.w - 2, r.back);
  r.put(0, 0, r.back, B.GOLD_BLOCK); r.put(0, 1, r.back, B.CHEST);
  for (let v = 2; v < r.back - 1; v += 2) r.put(0, 1, v, [B.RED_WOOL, B.HOLO_SIGN, B.WHITE_WOOL][v % 3]);   // the art wall
  r.table(r.cu, 2); r.seat(r.cu - 1 >= 0 ? r.cu - 1 : 0, 2, P.seatSlab); if (r.cu + 1 < r.w) r.seat(r.cu + 1, 2, P.seatSlab);   // dining
  r.fill(0, 0, 2, 0, 3, 2, B.CHROME);                                                                  // a chrome column
  r.planter(r.w - 1, 2);
  r.lantern(r.cu, r.back - 1);
  lights(r, 4, P.light);
});
defProgramRoom('art_salon', { minW: 4, minD: 4, tags: ['culture', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx), art = [B.GOLD_BLOCK, B.CHROME, B.RED_WOOL, B.HOLO_SIGN];
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.SMOOTH_STONE); r.put(u, 1, r.back, art[u % art.length]); r.putRaw(u, r.h, r.back, P.light); }
  for (let v = 2; v < r.back; v += 2) r.put(0, 1, v, art[(v + 1) % art.length]);
  r.put(r.w - 1, 0, 2, P.accent); r.put(r.w - 1, 0, 3 <= r.back - 1 ? 3 : 2, P.accent); r.spot(r.w - 1, 2, 'seat'); r.spot(r.w - 1, 3 <= r.back - 1 ? 3 : 2, 'seat');
  r.table(r.w - 2 >= 0 ? r.w - 2 : 0, 2);
  lights(r, 5, P.light);
});
defProgramRoom('domestic_service', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 2 ? B.TROUGH : B.IRON_BLOCK); r.put(u, 1, r.back, u % 2 ? B.CHROME : B.SHELF); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.CRATE); }
  r.put(r.w - 1, 0, 2, B.BARREL); r.put(r.w - 1, 1, 2, B.WHITE_WOOL);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('private_study', { minW: 3, minD: 3, tags: ['culture', 'private'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.table(r.cu, r.back); r.seat(r.cu, r.back - 1, P.seatSlab); r.put(r.cu, 1, r.back, B.CONSOLE);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) { r.put(u, 0, r.back, B.BOOKSHELF); r.put(u, 1, r.back, B.BOOKSHELF); }
  r.put(0, 0, 2, B.GOLD_BLOCK); r.lantern(r.cu, 2);
});
aliasProgramRoom('view_terrace', 'observation_deck', { tags: ['public', 'glass', 'top'] });
defProgramRoom('service_pantry', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, u % 2 ? B.BARREL : B.SHELF); r.put(u, 2, r.back, B.SHELF); }
  r.counter(0, r.w - 1, r.back - 1 > 2 ? r.back - 1 : 2, B.PANEL_BLACK, B.STONE_BRICK_SLAB);
  r.put(r.w - 1, 0, 2, B.CRATE);
  r.work(r.cu, 2, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});

// ================================================================================================ transit interchange
defProgramRoom('ticket_hall', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, B.GLOW_PANEL_BLUE); }   // ticket machines
  for (let u = 1; u < r.w; u += 2) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, B.HOLO_SIGN); }   // the destination board
  const gv = Math.max(2, r.back - 2);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) { r.put(u, 0, gv, B.IRON_BARS); r.put(u, 1, gv, u % 2 ? B.STONE_BRICK_SLAB : B.IRON_BARS); }   // barrier gates
  r.put(r.cu, 2, gv, P.accent);
  r.work(0, gv - 1, 'conductor'); r.spot(r.cu, gv - 1, 'wait');
  lights(r, 4, P.light);
});
defProgramRoom('boarding_platform', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  stripeRow(r, r.back);                                                                               // the platform edge
  for (let u = 0; u < r.w; u++) r.put(u, 2, r.back, u % 3 === 1 ? B.HOLO_SIGN : P.counter);           // timetable over the edge
  for (let u = 0; u < r.w; u += 2) r.seat(u, 2, P.seatSlab);
  r.put(r.w - 1, 0, r.back - 1, B.IRON_BARS); r.put(r.w - 1, 1, r.back - 1, B.CITY_LAMP);
  r.spot(r.cu, r.back - 1, 'wait'); r.spot(0, r.back - 1, 'wait');
  r.work(r.cu, 3 <= r.back - 1 ? 3 : 2, 'conductor');
  lights(r, 4, P.light);
});
defProgramRoom('waiting_hall', { minW: 4, minD: 4, tags: ['public', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 2; v <= r.back; v += 2) seatRow(r, v, P.seatSlab, 0, r.w - 1, 1);
  r.put(r.cu, 1, r.back, B.HOLO_SIGN); r.put(r.cu, 2, r.back, B.HOLO_SIGN);
  r.put(r.w - 1, 0, r.back, B.CONSOLE); r.put(r.w - 1, 1, r.back, B.GLOW_PANEL);                     // vending machine
  r.planter(0, r.back);
  lights(r, 4, P.light);
});
defProgramRoom('service_control', { minW: 4, minD: 4, tags: ['tech', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, B.HOLO_SIGN); if (u % 2 === 0) { r.seat(u, r.back - 1, P.seatSlab); r.work(u, r.back - 1, 'operator'); } }
  r.put(0, 2, r.back, B.GLOW_PANEL_BLUE); r.put(r.w - 1, 2, r.back, B.PANEL_RED);                    // route map: green board, red disruption lamp
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
aliasProgramRoom('maintenance_workshop', 'workshop');
defProgramRoom('speeder_rank', { minW: 4, minD: 4, tags: ['vehicle', 'transport'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u += 2) { r.put(u, 0, r.back, B.CHROME); r.put(u, 1, r.back, B.GLASS); r.putRaw(u, -1, r.back - 1, B.PANEL_STRIPE); }   // cabs at the rank
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.put(r.w - 1, 1, 2, B.HOLO_SIGN); r.work(r.w - 1, 3 <= r.back - 1 ? 3 : 2, 'pilot');
  r.seat(0, 2, P.seatSlab); r.spot(r.cu, 2, 'wait');
  lights(r, 4, P.light);
});

// ================================================================================================ security station
defProgramRoom('public_reporting_post', { minW: 4, minD: 4, tags: ['security', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back - 1, P.counter, B.STONE_BRICK_SLAB); r.put(r.cu, 1, r.back - 1, B.CONSOLE);
  r.work(r.cu, r.back, 'guard');
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.PANEL_RED); r.put(u, 2, r.back, B.HOLO_SIGN); }   // the case board
  for (let v = 2; v < r.back - 1; v += 2) r.seat(0, v, P.seatSlab);
  r.put(r.w - 1, 0, 2, B.IRON_BLOCK); r.put(r.w - 1, 1, 2, B.IRON_BARS);
  lights(r, 4, P.light);
});
defProgramRoom('dispatch_room', { minW: 4, minD: 4, tags: ['security', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : B.PANEL_RED); if (u % 2 === 0) { r.seat(u, r.back - 1, P.seatSlab); r.work(u, r.back - 1, 'operator'); } }
  if (r.d >= 6) { r.put(r.cu, 0, 3, P.counter); r.put(r.cu, 1, 3, B.GLOW_PANEL_BLUE); }              // the sector map table
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('evidence_records', { minW: 4, minD: 4, tags: ['security', 'civic'] }, (r, rng, ctx) => {
  const gv = Math.max(2, r.back - 2);
  for (let u = 0; u < r.w; u++) if (u !== r.cu) { r.put(u, 0, gv, B.IRON_BARS); r.put(u, 1, gv, B.IRON_BARS); r.put(u, 2, gv, B.IRON_BARS); }   // the evidence cage
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 2 ? B.CHEST : B.BOOKSHELF); r.put(u, 1, r.back, u % 2 ? B.CRATE : B.BOOKSHELF); }
  r.put(0, 0, 2, B.CONSOLE); r.seat(1 < r.w ? 1 : 0, 2); r.work(1 < r.w ? 1 : 0, 2, 'archivist');
  r.put(r.w - 1, 1, 2, B.PANEL_RED);
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('briefing_room', { minW: 4, minD: 4, tags: ['security', 'office'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, B.HOLO_SIGN); r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : P.counter); }
  r.put(r.cu, 0, r.back - 1, B.CONSOLE); r.work(r.cu, r.back - 1, 'guard');
  for (let v = 2; v <= r.back - 3; v += 2) seatRow(r, v, P.seatSlab, 0, r.w - 1, 1);
  r.put(0, 0, r.back, B.CHEST); r.put(r.w - 1, 0, r.back, B.IRON_BLOCK);
  lights(r, 4, P.light);
});
aliasProgramRoom('rest_bunks', 'barracks');
aliasProgramRoom('equipment_armory', 'armory');
defProgramRoom('holding_cells', { minW: 4, minD: 4, tags: ['security'] }, (r, rng, ctx) => {
  const front = Math.max(2, r.back - 1);
  for (let u = 0; u < r.w; u++) { r.fill(u, 0, front, u, 2, front, B.IRON_BARS); }
  for (let u = 1; u < r.w; u += 3) r.fill(u, 0, r.back, u, 2, r.back, B.PANEL_BLACK);                  // cell dividers
  for (let u = 0; u < r.w; u += 3) { r.put(u, 0, r.back, B.BED_HEAD); r.put(u, 1, front, B.AIR); r.spot(u, r.back, 'seat'); }
  r.put(0, 0, 2, B.CONSOLE); r.seat(1 < r.w ? 1 : 0, 2); r.work(1 < r.w ? 1 : 0, 2, 'warden');
  r.put(r.w - 1, 1, 2, B.PANEL_RED);
  lights(r, 4, B.GLOW_PANEL);
});

// ================================================================================================ utility plant
defProgramRoom('plant_control', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CONSOLE); r.put(u, 1, r.back, u % 3 === 2 ? B.PANEL_RED : B.HOLO_SIGN); r.put(u, 2, r.back, u % 2 ? B.HOLO_SIGN : B.PANEL_STRIPE); if (u % 2 === 0) { r.seat(u, r.back - 1, P.seatSlab); r.work(u, r.back - 1, 'operator'); } }
  r.put(0, 0, 2, B.PANEL_STRIPE); r.put(r.w - 1, 0, 2, B.PANEL_STRIPE);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('feedstock_store', { minW: 3, minD: 3, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.BARREL); r.put(u, 1, r.back, B.BARREL); r.put(u, 2, r.back, B.IRON_BARS); }   // hoppers under the feed pipe
  for (let v = 2; v < r.back; v++) { r.put(0, 2, v, B.IRON_BARS); if (v % 2 === 0) r.put(0, 0, v, B.CRATE); }
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('processing_reactor', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  const c = r.cu, v = Math.max(2, r.back - 1);
  r.fill(c, 0, v, c, 3, v, B.GLOW_PANEL_BLUE);                                                        // the core
  for (const [du, dv] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) r.fill(c + du, 0, v + dv, c + du, 1, v + dv, B.IRON_BARS);
  for (let u = 0; u < r.w; u++) r.put(u, 2, r.back, B.IRON_BARS);                                     // pipes
  r.put(0, 0, r.back, B.CONSOLE); r.put(0, 1, r.back, B.VENT); r.put(r.w - 1, 0, r.back, B.CONSOLE); r.put(r.w - 1, 1, r.back, B.PANEL_RED);
  for (let u = 0; u < r.w; u++) if (r.free(u, 2)) r.putRaw(u, -1, 2, B.PANEL_STRIPE);                 // the safe walkway
  r.work(0, r.back - 1 > 2 ? r.back - 1 : 2, 'engineer'); r.spot(r.w - 1, 2);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('distribution_relay', { minW: 4, minD: 4, tags: ['industry', 'tech'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 2 ? B.CONSOLE : B.IRON_BLOCK); r.put(u, 1, r.back, u % 2 ? B.GLOW_PANEL : B.IRON_BARS); r.put(u, 2, r.back, B.IRON_BARS); }   // switchgear and the feeder cables
  for (let v = 2; v < r.back; v++) r.put(r.w - 1, 2, v, B.IRON_BARS);
  r.put(0, 0, 2, B.CONSOLE); r.put(0, 1, 2, B.HOLO_SIGN); r.work(1 < r.w ? 1 : 0, 2, 'technician');    // the customer board: who is fed from here
  r.put(r.w - 1, 0, 2, B.PANEL_RED);
  lights(r, 4, B.GLOW_PANEL);
});
aliasProgramRoom('plant_maintenance', 'workshop');
aliasProgramRoom('spares_store', 'storage');
defProgramRoom('gantry_walkway', { minW: 3, minD: 3, tags: ['industry', 'circulation'] }, (r, rng, ctx) => {
  for (let v = 2; v <= r.back; v++) { r.put(0, 0, v, B.IRON_BARS); r.put(r.w - 1, 0, v, B.IRON_BARS); }   // the rails of the catwalk
  for (let u = 1; u < r.w - 1; u++) for (let v = 2; v <= r.back; v++) if (r.free(u, v)) r.putRaw(u, -1, v, B.DECK_PLATE);
  for (let u = 0; u < r.w; u++) r.put(u, 2, r.back, B.IRON_BARS);
  r.put(r.cu, 1, r.back, B.PANEL_STRIPE); r.put(r.cu, 0, r.back, B.CONSOLE);
  lamp(r, 0, r.back); if (r.w > 1) lamp(r, r.w - 1, r.back);
  r.spot(r.cu, 2);
  lights(r, 4, B.GLOW_PANEL);
});

// ================================================================================================ salvage yard
defProgramRoom('unloading_yard', { minW: 4, minD: 4, tags: ['industry', 'freight'] }, (r, rng, ctx) => {
  stripeRow(r, r.back - 1);
  const heaps = [B.IRON_BLOCK, B.BARREL, B.CRATE, B.IRON_BARS, B.GRAVEL];
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, heaps[u % heaps.length]); if (u % 2 === 0) r.put(u, 1, r.back, heaps[(u + 1) % heaps.length]); }   // sorted by material, not a heap
  r.put(0, 0, 2, B.CONSOLE); r.put(0, 1, 2, B.HOLO_SIGN); r.work(1 < r.w ? 1 : 0, 2, 'stock');   // the weigh scale
  if (r.w >= 5) droid(r, r.w - 1, 2, true);
  r.work(r.cu, r.back - 1, 'stock');
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('assessment_desk', { minW: 3, minD: 3, tags: ['office', 'industry'] }, (r, rng, ctx) => {
  r.table(r.cu, r.back); r.put(r.cu, 1, r.back, B.CONSOLE); r.seat(r.cu, r.back - 1); r.work(r.cu, r.back - 1, 'desk');
  r.put(0, 0, r.back, B.IRON_BLOCK); r.put(0, 1, r.back, B.STONE_BRICK_SLAB);                          // the scale
  r.put(r.w - 1, 0, r.back, B.TABLE); r.put(r.w - 1, 1, r.back, B.IRON_BARS);                          // sample on the bench
  r.put(0, 1, 2, B.HOLO_SIGN);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('disassembly_workshop', { minW: 4, minD: 4, tags: ['industry'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.table(u, r.back); r.put(u, 1, r.back, [B.IRON_BARS, B.CHROME, B.CONSOLE, B.ANVIL][u % 4]); }   // carcasses coming apart
  r.put(0, 0, r.back - 1, B.ANVIL); r.put(r.w - 1, 0, 2, B.FURNACE);
  for (let v = 2; v < r.back - 1; v += 2) r.put(0, 0, v, B.CRATE);
  r.work(1 < r.w ? 1 : 0, r.back - 1, 'mechanic'); r.work(r.w - 1, r.back - 1, 'mechanic');
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('reusable_parts_store', { minW: 3, minD: 3, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  const parts = [B.CHROME, B.CONSOLE, B.IRON_BARS, B.GLASS];
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, parts[u % parts.length]); r.put(u, 2, r.back, B.SHELF); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.SHELF); r.put(0, 1, v, parts[(v + 1) % parts.length]); }
  r.put(r.w - 1, 1, 2, B.HOLO_SIGN); r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('scrap_store', { minW: 3, minD: 3, tags: ['industry', 'service'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, u % 2 ? B.GRAVEL : B.IRON_BLOCK); if (u % 3 === 0) r.put(u, 1, r.back, B.IRON_BARS); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.IRON_BARS); if (v % 2 === 0) r.put(r.w - 1, 0, v, B.GRAVEL); }
  r.put(r.w - 1, 1, 2, B.PANEL_STRIPE); r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('dispatch_office', { minW: 3, minD: 3, tags: ['office', 'industry'] }, (r, rng, ctx) => {
  r.put(r.cu, 0, r.back, B.CONSOLE); r.put(r.cu, 1, r.back, B.HOLO_SIGN); r.seat(r.cu, r.back - 1); r.work(r.cu, r.back - 1, 'operator');   // outgoing orders
  r.put(0, 0, r.back, B.CHEST); r.put(0, 1, r.back, B.CHEST); r.put(r.w - 1, 0, r.back, B.CRATE);
  r.put(r.w - 1, 1, 2, B.PANEL_STRIPE);
  lights(r, 3, B.GLOW_PANEL);
});

// ================================================================================================ criminal front (freight brokerage)
defProgramRoom('brokerage_office', { minW: 4, minD: 4, tags: ['office', 'public'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  deskRows(r, 'broker');
  for (let u = 0; u < r.w; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.GLOW_PANEL);              // the rate board
  r.put(0, 0, r.back, B.CHEST); r.put(r.w - 1, 0, r.back, B.BOOKSHELF);
  r.seat(r.w - 1, 2, P.seatSlab);                                                                          // the client's chair
  lights(r, 4, P.light);
});
aliasProgramRoom('client_meeting_room', 'meeting_room');
defProgramRoom('manifest_records', { minW: 3, minD: 3, tags: ['office', 'civic'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.BOOKSHELF); r.put(u, 1, r.back, u % 2 ? B.CHEST : B.BOOKSHELF); r.put(u, 2, r.back, B.BOOKSHELF); }
  r.put(0, 0, 2, B.CONSOLE); r.work(1 < r.w ? 1 : 0, 2, 'desk');
  r.put(r.w - 1, 0, 2, B.CHEST);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('contraband_store', { minW: 3, minD: 3, tags: ['service', 'private', 'concealed'] }, (r, rng, ctx) => {
  // reads as a spares store from the door; the evidence is at the back: unmarked crates, spice wool, a ledger console
  for (let v = 0; v <= 1; v++) { r.putRaw(0, 1, v, B.SHELF); r.putRaw(r.w - 1, 1, v, B.SHELF); }
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CRATE); r.put(u, 1, r.back, u % 2 ? B.RED_WOOL : B.CRATE); }
  r.put(0, 0, 2, B.GOLD_BLOCK); r.put(0, 1, 2, B.CHEST);
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.cu, r.back - 1, 'stock');                                 // the second set of books
  r.lantern(r.cu, r.back - 1);
});

// ================================================================================================ community hall
defProgramRoom('gathering_lounge', { minW: 4, minD: 4, tags: ['public', 'leisure'] }, (r, rng, ctx) => {
  const P = pal(ctx), c = r.cu, v = Math.max(2, r.back - 1);
  r.table(c, v); for (const [du, dv] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]]) if (r.free(c + du, v + dv) && (c + du !== c || v + dv !== v)) r.seat(c + du, v + dv, P.accentSlab);   // the circle
  for (let u = 0; u < r.w; u++) r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : P.accent);                  // the noticeboard
  r.put(r.w - 1, 0, r.back, B.BARREL); r.put(r.w - 1, 1, r.back, B.STONE_BRICK_SLAB);                 // tea urn
  r.put(0, 0, r.back, B.BOOKSHELF); r.planter(0, 2);
  r.work(r.w - 1, r.back - 1, 'receptionist');
  r.lantern(c, 2); r.lantern(c, r.back - 1);
  lights(r, 5, P.light);
});
defProgramRoom('neighbours_store', { minW: 3, minD: 3, tags: ['service', 'public'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CRATE); r.put(u, 1, r.back, [B.HAY_BALE, B.WHITE_WOOL, B.CHEST][u % 3]); }   // bread, blankets, the shared tool chest
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.SHELF); r.put(0, 1, v, v % 2 ? B.HAY_BALE : B.SHELF); }
  r.put(r.w - 1, 1, 2, B.HOLO_SIGN); r.work(r.cu, r.back - 1, 'stock');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('community_kitchen', { minW: 4, minD: 4, tags: ['service', 'civic'] }, (r, rng, ctx) => { ROOMS.kitchen.fn(r, rng, ctx); stoveSomewhere(r); });
aliasProgramRoom('rooftop_garden', 'garden_terrace', { tags: ['green', 'top'] });
defProgramRoom('caretaker_office', { minW: 3, minD: 3, tags: ['office'] }, (r, rng, ctx) => {
  r.table(r.cu, r.back); r.put(r.cu, 1, r.back, B.CONSOLE); r.seat(r.cu, r.back - 1); r.work(r.cu, r.back - 1, 'desk');
  r.put(0, 1, r.back, B.HOLO_SIGN); r.put(0, 0, r.back, B.CHEST);                                    // the key board and the lost-property chest
  r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.BARREL);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('quiet_meditation', { minW: 3, minD: 3, tags: ['civic', 'green'] }, (r, rng, ctx) => {
  const c = r.cu, v = Math.max(2, r.back - 1);
  r.put(c, 0, v, B.SMOOTH_STONE); r.put(c, 1, v, B.LANTERN);
  for (const [du, dv] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]]) if (r.free(c + du, v + dv)) r.seat(c + du, v + dv, B.STONE_BRICK_SLAB);   // cushions on the floor
  r.planter(0, r.back); r.planter(r.w - 1, r.back);
  r.put(0, 1, r.back, B.WHITE_WOOL); r.put(r.w - 1, 1, r.back, B.WHITE_WOOL);                           // the white hangings
  r.put(c, 1, r.back, B.HOLO_SIGN);
});

// ------------------------------------------------------------------------------------------- adaptations
// Spec 6: "Standardized apartments can share a shell while showing genuinely different households and adaptations."
// Every tower gets one or two of these (seeded from the lot, programs/apply.js), skipping any whose function the
// building already has (`avoid` is that kind pattern): a different amenity, a different member of staff and a
// different thing to do, so two same-kind buildings never offer the same set of activities. Kind names infer the
// right W4 staffing base (roomFunction keywords): garden -> garden_terrace, shrine -> meditation_chamber, studio ->
// studio, library -> library, droid -> droid_bay, bar -> cantina, aid -> medbay, dejarik -> arcade, records ->
// archive, gym -> gym, workshop -> workshop, observation -> observation_deck, bath -> restroom, kitchen -> kitchen.
export const ADAPTATIONS = [
  { kind: 'hydroponics_garden', avoid: /garden|greenhouse|terrace|farm|hydroponic/, verbs: ['tend the garden'], staff: 'gardener' },
  { kind: 'residents_shrine', avoid: /shrine|meditat|temple|sanctum|chapel/, verbs: ['meditate'], staff: 'attendant' },
  { kind: 'music_studio', avoid: /music|studio|band|stage/, verbs: ['play the piano', 'listen to the band'], staff: 'musician' },
  { kind: 'holo_library', avoid: /library|archive|reading|study/, verbs: ['read'], staff: 'librarian' },
  { kind: 'droid_pool', avoid: /droid/, verbs: ['charge a droid'], staff: 'droid tech' },
  { kind: 'caf_bar', avoid: /bar|cantina|club|lounge_bar|tavern/, verbs: ['order drink'], staff: 'bartender' },
  { kind: 'first_aid_post', avoid: /medbay|medic|clinic|aid|ward|infirmary|treatment/, verbs: ['receive treatment', 'rest in a bed'], staff: 'medic' },
  { kind: 'dejarik_lounge', avoid: /arcade|dejarik|game|gambling|casino/, verbs: ['take a private meeting', 'sit'], staff: 'attendant' },
  { kind: 'records_vault', avoid: /records|archive|vault|registry/, verbs: ['inspect evidence', 'read'], staff: 'archivist' },
  { kind: 'sparring_gym', avoid: /gym|dojo|sparring|training/, verbs: ['watch the work'], staff: 'teacher' },
  { kind: 'hobby_workshop', avoid: /workshop|repair|garage|machine/, verbs: ['watch the work', 'browse stock'], staff: 'mechanic' },
  { kind: 'observation_lounge', avoid: /observation|view|overlook|terrace/, verbs: ['enjoy the view', 'sit'], staff: 'attendant' },
  { kind: 'bath_house', avoid: /bath|restroom|washroom|refresher|shower/, verbs: ['wash'], staff: 'attendant' },
  { kind: 'tea_kitchen', avoid: /kitchen|galley|canteen|cafeteria/, verbs: ['cook a meal'], staff: 'cook' },
];
export const ADAPTATION_BY_KIND = Object.fromEntries(ADAPTATIONS.map((a) => [a.kind, a]));

defProgramRoom('hydroponics_garden', { minW: 4, minD: 4, tags: ['green'] }, (r, rng, ctx) => {
  // trays of wheat under grow lamps along both side walls, a grass strip down the middle, the gardener at the tap
  for (let v = 2; v <= r.back; v++) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.put(u, 0, v, B.FARMLAND)) { r.put(u, 1, v, v % 2 ? B.WHEAT : B.TALL_GRASS); r.putRaw(u, r.h - 1, v, B.GLOW_PANEL); }
  for (let v = 2; v <= r.back; v++) if (r.free(r.cu, v) && v % 2 === 0) r.putRaw(r.cu, -1, v, B.GRASS);
  r.put(r.cu, 0, r.back, B.TROUGH); r.work(r.cu, r.back - 1, 'gardener');
  r.planter(1 < r.w - 1 ? 1 : 0, r.back, B.OAK_LEAVES); r.planter(r.w - 2 > 0 ? r.w - 2 : 0, r.back, B.BIRCH_LEAVES);
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('residents_shrine', { minW: 3, minD: 3, tags: ['civic'] }, (r, rng, ctx) => {
  const c = r.cu, v = Math.max(2, r.back - 1);
  r.put(c, 0, v, B.SMOOTH_STONE); r.put(c, 1, v, B.LANTERN);                                            // the flame
  for (const [du, dv] of [[-1, 1], [0, 1], [1, 1], [-2, 0], [2, 0]]) if (r.free(c + du, v + dv)) r.seat(c + du, v + dv, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u++) if (u !== c) r.put(u, 1, r.back, u % 2 ? B.WHITE_WOOL : B.GOLD_BLOCK);    // hangings and offerings
  r.put(0, 0, 2, B.CHEST); r.work(r.w - 1, 2, 'attendant');
  r.lantern(0, r.back - 1); r.lantern(r.w - 1, r.back - 1);
});
defProgramRoom('music_studio', { minW: 4, minD: 4, tags: ['culture'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.put(r.cu, 0, r.back, B.PIANO); r.seat(r.cu, r.back - 1, P.seatSlab); r.work(r.cu, r.back - 1, 'musician');
  for (let u = 0; u < r.w; u += 2) if (u !== r.cu) { r.put(u, 1, r.back, B.RED_WOOL); }                 // sound baffles
  for (let v = 2; v < r.back - 1; v += 2) { if (r.free(0, v)) r.seat(0, v, P.seatSlab); if (r.free(r.w - 1, v)) r.seat(r.w - 1, v, P.seatSlab); }
  r.put(0, 0, r.back, B.OAK_FENCE); r.put(0, 1, r.back, B.HOLO_SIGN);                                     // the stand and tonight's set list
  r.put(r.w - 1, 0, r.back, B.CHEST);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('holo_library', { minW: 4, minD: 4, tags: ['culture'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.BOOKSHELF); r.put(u, 1, r.back, B.BOOKSHELF); }
  for (let v = 2; v < r.back; v += 2) { r.put(0, 0, v, B.BOOKSHELF); r.put(0, 1, v, B.BOOKSHELF); }
  const tv = Math.max(2, Math.floor(r.back / 2));
  if (r.w >= 5) { r.table(r.cu, tv); r.put(r.cu, 1, tv, B.HOLO_SIGN); r.seat(r.cu - 1, tv, P.seatSlab); r.seat(r.cu + 1, tv, P.seatSlab); }
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, 2, 'librarian');
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('droid_pool', { minW: 4, minD: 4, tags: ['tech'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { const on = u % 3 !== 1; r.putRaw(u, -1, r.back, on ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK); droid(r, u, r.back, on); }
  r.put(0, 0, 2, B.CONSOLE); r.work(1, 2, 'droid tech');
  r.put(r.w - 1, 0, 2, B.CRATE); r.put(r.w - 1, 1, 2, B.IRON_BARS);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('caf_bar', { minW: 4, minD: 4, tags: ['entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  r.counter(0, r.w - 1, r.back - 1, P.counter, B.STONE_BRICK_SLAB);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, u % 2 ? B.GLASS : B.SHELF); }   // the bottle wall
  r.work(r.cu, r.back, 'bartender');
  for (let u = 0; u < r.w; u += 2) if (r.free(u, r.back - 2)) r.seat(u, r.back - 2, P.seatSlab);
  r.lantern(0, 2); r.lantern(r.w - 1, 2);
  lights(r, 5, P.light);
});
defProgramRoom('first_aid_post', { minW: 4, minD: 4, tags: ['medical'] }, (r, rng, ctx) => {
  bedSomewhere(r, [[r.w - 1, r.back]]);
  r.put(0, 0, r.back, B.CHEST); r.put(0, 1, r.back, B.WHITE_WOOL); r.put(1 < r.w ? 1 : 0, 1, r.back, B.PANEL_RED);
  r.put(0, 0, 2, B.CONSOLE); r.work(1 < r.w ? 1 : 0, 2, 'medic');
  r.put(r.w - 1, 1, 2, B.HOLO_SIGN);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('dejarik_lounge', { minW: 4, minD: 4, tags: ['entertainment'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let v = 3; v <= r.back - 1; v += 3) for (let u = 1; u < r.w - 1; u += 3) {
    if (!r.free(u, v)) continue;
    r.table(u, v); r.put(u, 1, v, B.HOLO_SIGN);                                                          // the holochess board
    if (r.free(u - 1, v)) r.seat(u - 1, v, P.seatSlab); if (r.free(u + 1, v)) r.seat(u + 1, v, P.seatSlab);
  }
  r.put(r.w - 1, 0, r.back, B.SHELF); r.put(r.w - 1, 1, r.back, B.GLASS); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, r.back, 'attendant');
  r.lantern(r.cu, 2);
  lights(r, 4, B.GLOW_PANEL_BLUE);
});
defProgramRoom('records_vault', { minW: 3, minD: 3, tags: ['office'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.CHEST); r.put(u, 1, r.back, B.SHELF); r.put(u, 2, r.back, B.SHELF); }
  for (let v = 2; v < r.back; v++) { r.put(0, 0, v, B.IRON_BARS); r.put(0, 1, v, B.IRON_BARS); }          // the cage
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 1, 3 <= r.back ? 3 : 2, 'archivist');
  r.put(r.w - 1, 1, 2, B.HOLO_SIGN);
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('sparring_gym', { minW: 4, minD: 4, tags: ['public'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) for (let v = 1; v <= r.back; v++) if (r.free(u, v) && (u + v) % 2 === 0) r.putRaw(u, -1, v, B.RED_WOOL);   // the mat
  for (let u = 1; u < r.w; u += 2) { r.put(u, 0, r.back, B.SHELF); r.put(u, 1, r.back, B.IRON_BARS); }   // weapon and weight racks
  for (let v = 2; v < r.back; v += 2) if (r.free(0, v)) r.seat(0, v, B.STONE_BRICK_SLAB);
  r.put(r.w - 1, 0, 2, B.CONSOLE); r.work(r.w - 2 >= 0 ? r.w - 2 : 0, 2, 'teacher');
  lights(r, 4, B.GLOW_PANEL);
});
defProgramRoom('hobby_workshop', { minW: 4, minD: 4, tags: ['industry'] }, (r, rng, ctx) => {
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.TABLE); r.put(u, 1, r.back, u % 2 ? B.IRON_BARS : B.SHELF); }   // the bench and tool rail
  r.work(r.cu, r.back - 1, 'mechanic');
  r.put(0, 0, 2, B.CRATE); r.put(0, 1, 2, B.CRATE); r.put(r.w - 1, 0, 2, B.BARREL);
  if (r.w >= 5) r.put(r.w - 1, 0, r.back - 1, B.IRON_BLOCK);                                             // the half-stripped unit
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('observation_lounge', { minW: 4, minD: 4, tags: ['public', 'glass'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 1, r.back, B.GLASS); r.put(u, 2, r.back, B.GLASS); }        // the window wall
  for (let u = 0; u < r.w; u += 2) if (r.free(u, r.back - 1)) r.seat(u, r.back - 1, P.seatSlab);
  r.put(r.cu, 1, 2, B.HOLO_SIGN);                                                                        // the skyline key
  r.put(0, 0, 2, B.SHELF); r.put(0, 1, 2, B.GLASS); r.work(1 < r.w ? 1 : 0, 2, 'attendant');
  r.lantern(0, r.back - 1); r.lantern(r.w - 1, r.back - 1);
});
defProgramRoom('bath_house', { minW: 3, minD: 3, tags: ['service'] }, (r, rng, ctx) => {
  let pools = 0;
  for (let u = 0; u < r.w; u++) { if (r.put(u, 0, r.back, B.TROUGH)) pools++; r.put(u, 1, r.back, u % 2 ? B.WHITE_WOOL : B.GLASS); }
  // a back door eats the pool row: the plunge pool moves to the side wall
  if (!pools) propSomewhere(r, B.TROUGH, [[0, r.back - 1], [r.w - 1, r.back - 1], [0, 2], [r.w - 1, 2]]);
  for (let v = 2; v < r.back; v += 2) if (r.empty(0, 0, v)) { r.put(0, 0, v, B.WHITE_WOOL); r.put(0, 1, v, B.WHITE_WOOL); }    // towel stacks
  if (r.empty(r.w - 1, 0, 2)) r.put(r.w - 1, 0, 2, B.SHELF);
  r.work(r.w - 1, 3 <= r.back - 1 ? 3 : 2, 'attendant');
  lights(r, 3, B.GLOW_PANEL);
});
defProgramRoom('tea_kitchen', { minW: 4, minD: 4, tags: ['service'] }, (r, rng, ctx) => { ROOMS.kitchen.fn(r, rng, ctx); stoveSomewhere(r); });

// ---- generic programs' signature rooms ------------------------------------------------------------------------
// the HoloNet studio floor: the news desk in front of the holo stage, camera droids on the floor, the gallery window
defProgramRoom('news_studio', { minW: 5, minD: 5, tags: ['culture', 'tech'] }, (r, rng, ctx) => {
  const P = pal(ctx);
  for (let u = 0; u < r.w; u++) { r.put(u, 0, r.back, B.SMOOTH_STONE); r.put(u, 1, r.back, u % 2 ? B.HOLO_SIGN : B.PANEL_BLACK); r.putRaw(u, r.h - 1, r.back, B.GLOW_PANEL_BLUE); }   // the holo stage and its backdrop
  const dv = Math.max(2, r.back - 2);
  r.put(r.cu - 1, 0, dv, B.TABLE); r.put(r.cu, 0, dv, B.CONSOLE); r.put(r.cu + 1, 0, dv, B.TABLE);         // the news desk
  r.seat(r.cu - 1, dv + 1 <= r.back ? dv + 1 : dv, P.seatSlab); r.work(r.cu, dv + 1 <= r.back ? dv + 1 : dv, 'journalist');
  for (const u of [0, r.w - 1]) if (r.free(u, dv)) { r.put(u, 0, dv, B.IRON_BLOCK); r.put(u, 1, dv, B.GLASS); }   // camera droids
  for (const u of [0, r.w - 1]) if (r.free(u, 2)) { r.put(u, 0, 2, B.CONSOLE); }
  r.work(1 < r.w ? 1 : 0, 2, 'operator');
  r.put(r.cu, 1, 2, B.HOLO_SIGN);                                                                          // the running order
  lights(r, 3, B.GLOW_PANEL);
});

// ---- library rooms hardened for the bays the planner hands a program -------------------------------------------
// The library's dining and class rooms lay their seating in rows from v = 2 to back - 3: a room of the template's
// minimum depth (5) has no such row and gets a counter with nobody to serve. The program versions run the library
// template and, when no seat survived, seat the room in the rows the door zones leave (`order food` / `sit` /
// `attend a lesson` all need a seat spot).
function seatCount(r) {
  const xa = r.X(0, 0), xb = r.X(r.w - 1, r.d - 1), za = r.Z(0, 0), zb = r.Z(r.w - 1, r.d - 1);
  const x0 = r.bp.wx(Math.min(xa, xb)), x1 = r.bp.wx(Math.max(xa, xb)), z0 = r.bp.wz(Math.min(za, zb)), z1 = r.bp.wz(Math.max(za, zb)), y = r.bp.wy(r.y);
  let n = 0;
  for (const s of r.bp.meta.spots) if (s.kind === 'seat' && s.y === y && s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1) n++;
  return n;
}
// tables for two in the free rows between the door zone and the counter
function diningSeats(r, P, vLast = r.back - 2) {
  let n = 0;
  for (let v = 2; v <= vLast; v += 2) for (let u = 1; u < r.w; u += 3) {
    if (!r.free(u, v) || !r.empty(u, 0, v) || !r.empty(u, 1, v)) continue;
    if (!r.table(u, v)) continue;
    for (const du of [-1, 1]) if (r.free(u + du, v) && r.empty(u + du, 0, v)) { r.seat(u + du, v, P.seatSlab); n++; }
  }
  // a single free row against the side walls: a bench of seats facing the counter
  if (!n) for (let v = 2; v <= vLast && !n; v++) for (let u = 0; u < r.w; u += 2) if (r.free(u, v) && r.empty(u, 0, v)) { r.seat(u, v, P.seatSlab); n++; }
  return n;
}
defProgramRoom('restaurant', { minW: 6, minD: 5, tags: ['food', 'public'] }, (r, rng, ctx) => {
  ROOMS.restaurant.fn(r, rng, ctx);
  if (!seatCount(r)) diningSeats(r, pal(ctx), r.back - 2);
});
defProgramRoom('cafeteria', { minW: 6, minD: 5, tags: ['food'] }, (r, rng, ctx) => {
  ROOMS.cafeteria.fn(r, rng, ctx);
  if (!seatCount(r)) diningSeats(r, pal(ctx), r.back - 2);
});
defProgramRoom('school_room', { minW: 5, minD: 4, tags: ['culture', 'public'] }, (r, rng, ctx) => {
  ROOMS.school_room.fn(r, rng, ctx);
  if (seatCount(r)) return;
  const P = pal(ctx);
  // shallow classroom: a row of desks two in front of the board, the seats behind them facing it
  let n = 0;
  for (let v = r.back - 2; v >= 2 && !n; v--) for (let u = 0; u < r.w; u += 2) {
    if (!r.free(u, v) || !r.empty(u, 0, v)) continue;
    if (v - 1 >= 1 && r.free(u, v - 1) && r.empty(u, 0, v - 1) && r.table(u, v)) { r.seat(u, v - 1, P.seatSlab); n++; }
    else { r.seat(u, v, P.seatSlab); n++; }
  }
});
defProgramRoom('kitchen', { minW: 4, minD: 4, tags: ['service'] }, (r, rng, ctx) => { ROOMS.kitchen.fn(r, rng, ctx); stoveSomewhere(r); });
