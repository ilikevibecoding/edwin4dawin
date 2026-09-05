// Death Star rooms: seeded generic templates packed along the corridors (barracks, mess hall, medical bay, armoury,
// storage, conference, turbolaser turret, reactor control, alcoves) and the fixed set pieces (detention block +
// trash compactor, tractor-beam gallery over a chasm, hangar control gallery, superlaser focusing chamber, the
// overlook tower's command bridge and throne room). Furnishing writes straight into the deck plan's block columns.
//
// Room frame: interior cell (u, v) = (ox + ax*u + dx*v, oz + az*u + dz*v), u across the door wall (0..w-1),
// v away from the door (0..dp-1); v = -1 is the door wall, v = dp the far wall, u = -1 / w the side walls.
import { B } from '../blocks.js';
import { hash2, hash3 } from '../rng.js';
import { FIXED, TOWER, N, X0, Z0, deckInteriorRadius, REACTOR_WALL_R } from './layout.js';

const cellIndex = (x, z) => (x - X0) * N + (z - Z0);

const {
  AIR, DURASTEEL, DURASTEEL_DARK, PANEL_BLACK, PANEL_RED, PANEL_STRIPE, GLOW_PANEL, GLOW_PANEL_BLUE, HOLO_SIGN, CONSOLE,
  VENT, DECK_PLATE, STEEL_GLASS, CHROME, IRON_BARS, IRON_BLOCK, STONE_BRICK_SLAB, TABLE, CHEST, BED_HEAD, BED_FOOT,
  CRATE, BARREL, FURNACE, GRAVEL, MUD, BOOKSHELF,
} = B;

const at = (room, u, v) => [room.ox + room.ax * u + room.dx * v, room.oz + room.az * u + room.dz * v];
const isDoor = (P, x, z, T) => P.t(x, z) === T.DOOR;

// ceiling light grid (every 3rd cell) + wall band; the ceiling is 5 above the floor so the floor gets >= 9 light
function base(P, room, T, band = PANEL_STRIPE, lightStep = 3) {
  const { w, dp } = room;
  for (let u = 0; u < w; u++) for (let v = 0; v < dp; v++) {
    const [x, z] = at(room, u, v);
    if (P.t(x, z) !== T.ROOM) continue;
    const lit = (u % lightStep === 1 && v % lightStep === 1) || (w < 3 && v % lightStep === 1) || (dp < 3 && u % lightStep === 1) || (w < 3 && dp < 3);
    if (lit) P.set(x, z, 6, GLOW_PANEL);
  }
  for (let v = -1; v <= dp; v++) for (let u = -1; u <= w; u++) {
    if (u !== -1 && u !== w && v !== -1 && v !== dp) continue;
    const [x, z] = at(room, u, v), t = P.t(x, z);
    if (t === T.DOOR || t === T.MODULE || t === T.REACTOR || t === T.RDOOR) continue;
    if (t === T.OUT || t === T.SOLID) { P.set(x, z, 1, DURASTEEL); P.set(x, z, 2, DURASTEEL); P.set(x, z, 4, DURASTEEL); P.set(x, z, 5, DURASTEEL); }
    if (t === T.RWALL || t === T.CWALL || t === T.OUT || t === T.SOLID) P.set(x, z, 3, band);
  }
}
const setAt = (P, room, u, v, dy, id) => { const [x, z] = at(room, u, v); P.set(x, z, dy, id); };
const typeAt = (P, room, u, v) => { const [x, z] = at(room, u, v); return P.t(x, z); };

// --------------------------------------------------------------------------------------------- generic templates
function conference(P, room, rng, T) {
  base(P, room, T, PANEL_STRIPE);
  const { w, dp } = room, cu = (w - 1) / 2, cv = (dp - 1) / 2, rr = Math.max(1.5, Math.min(w, dp) / 2 - 2.2);
  for (let u = 0; u < w; u++) for (let v = 1; v < dp; v++) {
    const dd = Math.hypot(u - cu, v - cv);
    if (Math.abs(dd - rr) < 0.6) setAt(P, room, u, v, 1, TABLE);
    else if (Math.abs(dd - rr - 1.1) < 0.55 && (u + v) % 2 === 0) setAt(P, room, u, v, 1, STONE_BRICK_SLAB);
  }
  setAt(P, room, Math.round(cu), dp, 2, HOLO_SIGN); setAt(P, room, Math.round(cu), dp, 3, HOLO_SIGN);
  setAt(P, room, Math.round(cu), Math.round(cv), 6, GLOW_PANEL_BLUE);
}
function barracks(P, room, rng, T) {
  base(P, room, T, DURASTEEL_DARK);
  const { w, dp } = room;
  for (const u of [0, w - 1]) for (let v = 1; v + 1 < dp; v += 3) {
    setAt(P, room, u, v, 1, BED_HEAD); setAt(P, room, u, v + 1, 1, BED_FOOT);
    if (dp >= 7) { setAt(P, room, u, v, 2, DURASTEEL_DARK); setAt(P, room, u, v + 1, 2, DURASTEEL_DARK); setAt(P, room, u, v, 3, BED_HEAD); setAt(P, room, u, v + 1, 3, BED_FOOT); }
    if (v + 2 < dp) setAt(P, room, u, v + 2, 1, CHEST);
  }
  for (let u = 2; u < w - 2; u += 2) setAt(P, room, u, dp - 1, 1, CHEST);
}
function mess(P, room, rng, T) {
  base(P, room, T, PANEL_STRIPE);
  const { w, dp } = room;
  for (let u = 2; u < w - 2; u += 4) for (let v = 2; v < dp - 2; v++) {
    setAt(P, room, u, v, 1, TABLE);
    if (u - 1 >= 1) setAt(P, room, u - 1, v, 1, STONE_BRICK_SLAB);
    if (u + 1 < w - 1) setAt(P, room, u + 1, v, 1, STONE_BRICK_SLAB);
  }
  for (let u = 1; u < w - 1; u++) setAt(P, room, u, dp - 1, 1, u % 3 === 0 ? FURNACE : CHROME);
  setAt(P, room, 0, dp - 1, 1, BARREL); setAt(P, room, 0, dp - 1, 2, BARREL); setAt(P, room, w - 1, dp - 1, 1, CRATE);
}
function medical(P, room, rng, T) {
  base(P, room, T, CHROME, 2);
  const { w, dp } = room;
  for (let v = 1; v + 1 < dp; v += 2) {
    setAt(P, room, 0, v, 1, BED_HEAD); setAt(P, room, 1, v, 1, BED_FOOT);
    if (typeAt(P, room, -1, v) === T.RWALL) setAt(P, room, -1, v, 2, CONSOLE);
  }
  for (let u = Math.max(3, w - 3); u < w; u++) { setAt(P, room, u, dp - 1, 1, CHROME); setAt(P, room, u, dp - 1, 2, CHROME); }
  setAt(P, room, w - 1, 1, 1, CONSOLE);
}
function armoury(P, room, rng, T) {
  base(P, room, T, PANEL_RED);
  const { w, dp } = room;
  for (let v = 1; v < dp - 1; v++) { setAt(P, room, 1, v, 1, CHEST); if (w >= 6) setAt(P, room, w - 2, v, 1, CHEST); }
  for (let u = 1; u < w - 1; u++) { setAt(P, room, u, dp - 1, 1, IRON_BARS); setAt(P, room, u, dp - 1, 2, IRON_BARS); }
  setAt(P, room, 0, dp - 1, 1, IRON_BLOCK); setAt(P, room, 0, dp - 1, 2, IRON_BLOCK); setAt(P, room, w - 1, dp - 1, 1, IRON_BLOCK); setAt(P, room, w - 1, dp - 1, 2, IRON_BLOCK);
}
function storage(P, room, rng, T) {
  base(P, room, T, DURASTEEL_DARK);
  const { w, dp } = room;
  for (let u = 0; u < w; u++) for (let v = 1; v < dp; v++) {
    if (u % 3 === 2 || v % 3 === 0) continue;
    const [x, z] = at(room, u, v), h = hash2(x, z, 91 + room.d);
    if (h < 0.25) continue;
    const id = h < 0.65 ? CRATE : BARREL, n = h > 0.9 ? 3 : h > 0.7 ? 2 : 1;
    for (let k = 1; k <= n; k++) P.set(x, z, k, id);
  }
}
function turbolaser(P, room, rng, T) {
  base(P, room, T, PANEL_RED);
  const { w, dp } = room, cu = Math.floor(w / 2), cv = Math.floor(dp / 2);
  for (let u = 0; u < w; u++) for (let v = 1; v < dp; v++) {
    const dd = Math.hypot(u - cu, v - cv);
    if (Math.abs(dd - 2) < 0.6) setAt(P, room, u, v, 1, CHROME);
  }
  for (let k = 1; k <= 3; k++) setAt(P, room, cu, cv, k, IRON_BLOCK);
  // barrel points at the hull (the far wall lies outward from the corridor)
  for (let v = cv; v <= dp; v++) setAt(P, room, cu, v, 3, IRON_BLOCK);
  setAt(P, room, cu, dp, 3, DURASTEEL_DARK);
  setAt(P, room, 0, 1, 1, CONSOLE); setAt(P, room, w - 1, 1, 1, CONSOLE);
  for (let v = 0; v < dp; v++) { setAt(P, room, 0, v, 0, GLOW_PANEL_BLUE); setAt(P, room, w - 1, v, 0, GLOW_PANEL_BLUE); }
}
function reactorControl(P, room, rng, T) {
  base(P, room, T, GLOW_PANEL_BLUE);
  const { w, dp } = room;
  // the wall nearest the shaft: pick the side whose middle cell has the smallest radius
  const sides = [['far', at(room, Math.floor(w / 2), dp)], ['left', at(room, -1, Math.floor(dp / 2))], ['right', at(room, w, Math.floor(dp / 2))]];
  sides.sort((a, b) => Math.hypot(a[1][0], a[1][1]) - Math.hypot(b[1][0], b[1][1]));
  const side = sides[0][0];
  if (side === 'far') {
    for (let u = 0; u < w; u++) { setAt(P, room, u, dp - 1, 1, CONSOLE); const [x, z] = at(room, u, dp); if (P.t(x, z) === T.RWALLX) { P.set(x, z, 1, STEEL_GLASS); P.set(x, z, 2, STEEL_GLASS); P.set(x, z, 3, STEEL_GLASS); } }
  } else {
    const u = side === 'left' ? 0 : w - 1, wu = side === 'left' ? -1 : w;
    for (let v = 1; v < dp; v++) { setAt(P, room, u, v, 1, CONSOLE); const [x, z] = at(room, wu, v); if (P.t(x, z) === T.RWALLX) { P.set(x, z, 1, STEEL_GLASS); P.set(x, z, 2, STEEL_GLASS); P.set(x, z, 3, STEEL_GLASS); } }
  }
  setAt(P, room, Math.floor(w / 2), 0, 6, GLOW_PANEL_BLUE);
  if (typeAt(P, room, -1, 1) === T.RWALL) { setAt(P, room, -1, 1, 2, HOLO_SIGN); }
  if (typeAt(P, room, w, 1) === T.RWALL) { setAt(P, room, w, 1, 2, HOLO_SIGN); }
}
function alcove(P, room, rng, T) {
  setAt(P, room, 0, 0, 1, CONSOLE);
  setAt(P, room, 0, 0, 6, GLOW_PANEL); setAt(P, room, 1, 0, 6, GLOW_PANEL);
  for (let u = 0; u < 2; u++) if (typeAt(P, room, u, 1) === T.RWALL) setAt(P, room, u, 1, 2, HOLO_SIGN);
}
function office(P, room, rng, T) {
  base(P, room, T, PANEL_STRIPE);
  const { w, dp } = room;
  for (let u = 1; u < w - 1; u += 3) { setAt(P, room, u, dp - 2, 1, CONSOLE); setAt(P, room, u, dp - 3, 1, STONE_BRICK_SLAB); }
  for (let u = 0; u < w; u += 2) setAt(P, room, u, dp - 1, 1, BOOKSHELF);
  if (typeAt(P, room, -1, 1) === T.RWALL) setAt(P, room, -1, 1, 2, HOLO_SIGN);
}
function machinery(P, room, rng, T) {
  base(P, room, T, DURASTEEL_DARK);
  const { w, dp } = room;
  for (let u = 1; u < w - 1; u += 3) for (let v = 1; v < dp - 1; v += 3) {
    setAt(P, room, u, v, 1, IRON_BLOCK); setAt(P, room, u, v, 2, IRON_BLOCK); setAt(P, room, u, v, 3, VENT); setAt(P, room, u, v, 4, IRON_BLOCK); setAt(P, room, u, v, 5, IRON_BLOCK);
    if (u + 1 < w - 1) setAt(P, room, u + 1, v, 2, GLOW_PANEL_BLUE);
  }
  for (let v = 0; v < dp; v += 2) if (typeAt(P, room, w, v) === T.RWALL) setAt(P, room, w, v, 2, VENT);
}

export const GENERIC_TEMPLATES = [
  { name: 'barracks', w: [7, 9], dp: [9, 13], weight: 4, furnish: barracks },
  { name: 'mess', w: [9, 13], dp: [9, 13], weight: 2, furnish: mess },
  { name: 'medical', w: [7, 9], dp: [7, 11], weight: 2, furnish: medical },
  { name: 'armoury', w: [6, 9], dp: [7, 11], weight: 2, furnish: armoury },
  { name: 'storage', w: [7, 11], dp: [7, 11], weight: 5, furnish: storage },
  { name: 'conference', w: [7, 11], dp: [7, 11], weight: 2, furnish: conference },
  { name: 'turbolaser', w: [7, 9], dp: [7, 9], weight: 2, furnish: turbolaser, accept: ({ rMax, d }) => rMax > deckInteriorRadius(d) - 14 },
  { name: 'reactorControl', w: [7, 11], dp: [5, 11], weight: 2, furnish: reactorControl, wallTypes: [1, 4, 6, 0, 11], accept: ({ rMin }) => rMin < REACTOR_WALL_R + 1.6 },
  { name: 'office', w: [5, 9], dp: [5, 9], weight: 4, furnish: office },
  { name: 'machinery', w: [7, 11], dp: [7, 11], weight: 4, furnish: machinery },
  { name: 'alcove', w: [2, 2], dp: [1, 1], weight: 6, furnish: alcove, singleDoor: true },
];
// Templates every deck must try to place first (a static schedule so the layout stays a pure function of the deck).
const CYCLE = ['barracks', 'mess', 'medical', 'armoury', 'storage', 'conference', 'turbolaser', 'reactorControl', 'office', 'machinery'];
export function forcedTemplatesFor(d) {
  const out = [];
  for (let i = 0; i < 4; i++) out.push(CYCLE[(d * 3 + i) % CYCLE.length]);
  return out;
}

// --------------------------------------------------------------------------------------------- fixed rooms
function stampFixed(P, T, carve, name, x0, x1, z0, z1, opts = {}) {
  const id = P.rooms.length;
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
    const wall = x < x0 || x > x1 || z < z0 || z > z1, t = P.t(x, z);
    if (wall) {
      if (opts.openSide && ((opts.openSide === '+z' && z > z1) || (opts.openSide === '-z' && z < z0))) continue;
      if (t === T.FREE || (opts.force && t === T.OUT)) P.setT(x, z, T.RWALL);
      else if (t === T.CORR && !opts.cutCorridor) P.warnings.push(`${name} wall crosses a corridor at ${x},${z}`);
    } else {
      if ((t === T.CORR && !opts.cutCorridor) || t === T.MODULE || t === T.REACTOR) P.warnings.push(`${name} interior overlaps ${t} at ${x},${z}`);
      if (t === T.OUT && !opts.force) P.warnings.push(`${name} interior is outside the hull at ${x},${z}`);
      P.setT(x, z, T.ROOM);
      P.roomOf[cellIndex(x, z)] = id;
    }
  }
  const room = { id, name, d: P.d, x0, x1, z0, z1, ox: x0, oz: z0, ax: 1, az: 0, dx: 0, dz: 1, w: x1 - x0 + 1, dp: z1 - z0 + 1, fixed: true, doors: [] };
  for (const [x, z, ddx, ddz] of opts.doors || []) {
    P.setT(x, z, T.DOOR); room.doors.push([x, z]);
    if (!carve(P, x + ddx, z + ddz, opts.maxLen || 14)) P.warnings.push(`${name} door at ${x},${z} could not reach a corridor`);
  }
  P.rooms.push(room);
  return room;
}

export function placeFixedRooms(P, T, carve) {
  const d = P.d, F = FIXED;
  if (d === F.detention.deck) {
    const r = stampFixed(P, T, carve, 'detention', F.detention.x0, F.detention.x1, F.detention.z0, F.detention.z1, { doors: [[F.detention.x0 - 1, 33, -1, 0]] });
    for (let x = F.chute.x0; x <= F.chute.x1; x++) for (let z = F.chute.z0; z <= F.chute.z1; z++) { P.setT(x, z, T.ROOM); P.roomOf[cellIndex(x, z)] = r.id; }
  }
  if (d === F.compactor.deck) stampFixed(P, T, carve, 'compactor', F.compactor.x0, F.compactor.x1, F.compactor.z0, F.compactor.z1, { doors: [[68, F.compactor.z0 - 1, 0, -1]], maxLen: 16 });
  if (d >= F.tractor.deck0 && d <= F.tractor.deck1) {
    const doors = (d === F.tractor.deck0 || d === F.tractor.deck1) ? [[0, F.tractor.z1 + 1, 0, 1]] : [];
    stampFixed(P, T, carve, d === F.tractor.deck1 ? 'tractorLedge' : d === F.tractor.deck0 ? 'tractorFloor' : 'tractorChasm', F.tractor.x0, F.tractor.x1, F.tractor.z0, F.tractor.z1, { doors });
  }
  if (d === F.gallery.deck) stampFixed(P, T, carve, 'gallery', F.gallery.x0, F.gallery.x1, F.gallery.z0, F.gallery.z1, { doors: [[-26, F.gallery.z1 + 1, 0, 1]] });
  if (d === F.superlaser.deck) {
    stampFixed(P, T, carve, 'superlaser', F.superlaser.x0, F.superlaser.x1, F.superlaser.z0, F.superlaser.z1, { cutCorridor: true, force: true, openSide: '+z', doors: [[-1, F.superlaser.z0 - 1, 0, -1], [0, F.superlaser.z0 - 1, 0, -1], [1, F.superlaser.z0 - 1, 0, -1]] });
  }
}

// --------------------------------------------------------------------------------------------- fixed furnishing
function detention(P, room, rng, T) {
  base(P, room, T, PANEL_RED);
  const { x0, x1, z0, z1 } = room;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const corridor = z >= 32 && z <= 34;
    if (corridor) { if (z === 33) P.set(x, z, 6, GLOW_PANEL); else P.set(x, z, 6, DURASTEEL_DARK); continue; }
    if (x >= 69) { P.fillCol(x, z, 1, 5, DURASTEEL_DARK); continue; }                    // guard post walls
    const divider = x === 61 || x === 65;
    if (divider) { P.fillCol(x, z, 1, 5, DURASTEEL_DARK); continue; }
    const front = z === 31 || z === 35;
    if (front) {
      const cellIdx = Math.floor((x - x0) / 4), openCell = (z === 31 && cellIdx === 1) || (z === 35 && cellIdx === 2);
      if (openCell && (x - x0) % 4 === 1) { P.set(x, z, 3, GLOW_PANEL_BLUE); continue; }  // open cell door
      P.set(x, z, 1, IRON_BARS); P.set(x, z, 2, IRON_BARS); P.fillCol(x, z, 3, 5, DURASTEEL_DARK);
      continue;
    }
    // cell interiors: bunk + seat, dim light
    const back = z === z0 || z === z1;
    if ((x - x0) % 4 === 0 && back) { P.set(x, z, 1, BED_HEAD); P.set(x, z + (z === z0 ? 1 : -1), 1, BED_FOOT); }
    if ((x - x0) % 4 === 2 && !back) P.set(x, z, 1, STONE_BRICK_SLAB);
    P.set(x, z, 6, (x - x0) % 4 === 1 && (z === 29 || z === 37) ? GLOW_PANEL : DURASTEEL_DARK);
  }
  // guard post consoles facing the corridor, holo signs
  P.set(69, 33, 1, CONSOLE); P.set(69, 33, 2, HOLO_SIGN); P.set(70, 33, 1, CONSOLE);
  P.set(69, 32, 1, CONSOLE); P.set(69, 34, 1, CONSOLE);
  // garbage chute: opening in the end wall behind the guard post, 2x2 shaft with no floor
  for (let x = FIXED.chute.x0; x <= FIXED.chute.x1; x++) for (let z = FIXED.chute.z0; z <= FIXED.chute.z1; z++) {
    P.set(x, z, 0, AIR); P.fillCol(x, z, 1, 5, AIR); P.set(x, z, 6, DURASTEEL_DARK);
  }
  P.set(70, 33, 1, AIR); P.set(70, 34, 1, AIR);           // clear the way into the chute
  P.set(70, 33, 4, PANEL_RED); P.set(70, 34, 4, PANEL_RED);
  for (let z = 32; z <= 34; z++) P.set(x1 + 1, z, 3, PANEL_RED);
}
function compactor(P, room, rng, T) {
  base(P, room, T, PANEL_RED, 4);
  const { x0, x1, z0, z1 } = room;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (x === 65) { P.fillCol(x, z, 1, 5, IRON_BLOCK); if (z % 3 === 1) P.set(x, z, 3, GLOW_PANEL_BLUE); continue; }  // the crushing wall
    const h = hash3(x, P.d, z, 55);
    if (x > 65 && h < 0.45) {
      const id = h < 0.12 ? CRATE : h < 0.22 ? BARREL : h < 0.3 ? IRON_BLOCK : h < 0.38 ? GRAVEL : MUD;
      P.set(x, z, 1, id);
      if (h < 0.1) P.set(x, z, 2, CRATE);
    }
    P.set(x, z, 0, hash3(x, P.d, z, 56) < 0.3 ? MUD : DURASTEEL_DARK);
  }
  for (let x = FIXED.chute.x0; x <= FIXED.chute.x1; x++) for (let z = FIXED.chute.z0; z <= FIXED.chute.z1; z++) { P.set(x, z, 6, AIR); P.set(x, z, 1, AIR); P.set(x, z, 2, AIR); }
  P.set(68, z0 - 1, 4, GLOW_PANEL);
}
function tractor(P, room, rng, T, level) {
  const { x0, x1, z0, z1 } = room, F = FIXED.tractor;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (level !== 'floor') P.set(x, z, 0, AIR);
    if (level !== 'ledge') P.set(x, z, 6, AIR);
    else P.set(x, z, 6, (x % 4 === 0 && z % 4 === 0) ? GLOW_PANEL : DURASTEEL_DARK);
    if (level === 'ledge' && z >= z1 - 1) P.set(x, z, 0, DECK_PLATE);
    if (level === 'floor' && (x + z) % 5 === 0) P.set(x, z, 0, GLOW_PANEL_BLUE);
    // power column in the middle of the chasm
    if (Math.abs(x) <= 1 && z >= -73 && z <= -71) { P.fillCol(x, z, 0, 6, CHROME); P.set(x, z, 2, GLOW_PANEL_BLUE); P.set(x, z, 5, GLOW_PANEL_BLUE); }
  }
  if (level === 'ledge') for (const x of [-6, 0, 6]) { P.set(x, z1 - 1, 1, DURASTEEL_DARK); P.set(x, z1 - 1, 2, CONSOLE); }
  // wall band lights all the way down
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) continue;
    if (P.t(x, z) === T.RWALL) { P.set(x, z, 3, GLOW_PANEL_BLUE); if (level === 'chasm') P.set(x, z, 0, DURASTEEL); }
  }
  if (level === 'floor') { P.set(0, z1 + 1, 4, GLOW_PANEL); }
}
function gallery(P, room, rng, T) {
  base(P, room, T, PANEL_STRIPE);
  const { x0, x1, z0, z1 } = room;
  for (let z = z0 + 1; z < z1; z++) P.set(x1, z, 1, CONSOLE);
  for (let z = z0 + 2; z < z1; z += 3) P.set(x1 - 1, z, 1, STONE_BRICK_SLAB);
  P.set(x0, z0 + 1, 2, HOLO_SIGN); P.set(x0, z1 - 1, 2, HOLO_SIGN);
  for (let z = z0; z <= z1; z++) P.set(x0 - 1, z, 3, GLOW_PANEL_BLUE);
}
function superlaser(P, room, rng, T) {
  base(P, room, T, PANEL_STRIPE);
  const { x0, x1, z0, z1 } = room;
  for (let x = x0; x <= x1; x++) {
    if (Math.abs(x) <= 1) continue;
    P.set(x, z0 + 1, 1, CONSOLE);
    if (x % 3 === 0) P.set(x, z0 + 1, 2, HOLO_SIGN);
  }
  for (let z = z0; z <= z1; z++) P.set(0, z, 0, GLOW_PANEL_BLUE);
  for (let x = x0; x <= x1; x += 2) P.set(x, z0 + 3, 0, GLOW_PANEL_BLUE);
  P.set(x0 - 1, z0 + 2, 3, GLOW_PANEL_BLUE); P.set(x1 + 1, z0 + 2, 3, GLOW_PANEL_BLUE);
  P.set(x0 - 1, z0 + 2, 2, HOLO_SIGN); P.set(x1 + 1, z0 + 2, 2, HOLO_SIGN);
}
// Command bridge (deck 24): glass front over the dish rim and glass flanks near it, two console rows facing the
// window with a centre aisle running from the corridor door at the back, tactical displays along the back wall,
// the commander's chair beside the aisle.
function bridge(P, room, rng, T) {
  const tw = TOWER;
  base(P, room, T, PANEL_STRIPE);
  for (let x = tw.x0 + 1; x < tw.x1; x++) { for (let dy = 1; dy <= 5; dy++) P.set(x, tw.z1, dy, STEEL_GLASS); P.set(x, tw.z1, 0, CHROME); }
  for (const x of [tw.x0, tw.x1]) for (let z = tw.z1 - 9; z < tw.z1; z++) for (let dy = 2; dy <= 4; dy++) P.set(x, z, dy, STEEL_GLASS);
  for (const z of [tw.z1 - 4, tw.z1 - 9]) for (let x = tw.x0 + 2; x < tw.x1 - 1; x++) {
    if (Math.abs(x) <= 1 || P.t(x, z) !== T.ROOM) continue;
    P.set(x, z, 1, CONSOLE); if (x % 4 === 0) P.set(x, z, 2, HOLO_SIGN);
  }
  for (let x = tw.x0 + 1; x < tw.x1; x++) {
    if (Math.abs(x) <= 1 || P.t(x, tw.z0 + 1) !== T.ROOM) continue;
    P.set(x, tw.z0, 2, HOLO_SIGN); P.set(x, tw.z0, 3, x % 2 ? HOLO_SIGN : DURASTEEL_DARK);
  }
  P.set(3, tw.z1 - 13, 1, PANEL_BLACK); P.set(3, tw.z1 - 12, 1, STONE_BRICK_SLAB); P.set(4, tw.z1 - 13, 1, STONE_BRICK_SLAB);
  for (let x = tw.x0 + 1; x < tw.x1; x += 2) P.set(x, tw.z1 - 1, 6, GLOW_PANEL);
  for (let x = -1; x <= 1; x++) for (let z = tw.z0 + 1; z < tw.z1; z += 2) P.set(x, z, 0, x === 0 ? PANEL_STRIPE : DECK_PLATE);   // aisle marking
}
// Throne room (deck 25, double height): black floor with a red carpet from the dais to the glass-floored balcony
// over the dish, floor and wall lights (the ceiling is 12 above, too far to light the walking height), the throne on
// a raised dais at the back facing the window, glass flanks and balcony.
function throne(P, room, rng, T) {
  const tw = TOWER, zd = tw.z0 + 4;
  base(P, room, T, PANEL_RED);
  for (let x = tw.tx0 + 1; x < tw.tx1; x++) for (let z = tw.z0 + 1; z < tw.balconyZ1; z++) {
    if (P.t(x, z) !== T.ROOM) continue;
    P.set(x, z, 0, PANEL_BLACK); P.set(x, z, 6, AIR);
    if (Math.abs(x) <= 1 && z > zd) P.set(x, z, 0, PANEL_RED);
    if ((Math.abs(x) === 3 || Math.abs(x) === 8) && z % 3 === 0 && z > zd && z <= tw.z1) P.set(x, z, 0, GLOW_PANEL);
    if (z > tw.z1) P.set(x, z, 0, (x + 10) % 4 === 0 ? CHROME : STEEL_GLASS);            // balcony: glass floor over the dish, chrome ribs at x = +-2, +-6, +-10
    if (Math.abs(x) <= 3 && z < zd) P.set(x, z, 1, PANEL_BLACK);                         // dais
    if (Math.abs(x) <= 3 && z === zd) P.set(x, z, 1, STONE_BRICK_SLAB);
  }
  const zt = tw.z0 + 2;
  P.set(0, zt + 1, 2, STONE_BRICK_SLAB); P.set(0, zt, 2, CHROME); P.set(0, zt, 3, CHROME); P.set(0, zt, 4, PANEL_RED); P.set(-1, zt, 2, PANEL_RED); P.set(1, zt, 2, PANEL_RED);
  for (const x of [-4, 4]) { P.set(x, zt, 1, CHROME); P.set(x, zt, 2, CHROME); P.set(x, zt, 3, GLOW_PANEL); }   // dais lamps
  for (let x = tw.tx0 + 1; x < tw.tx1; x++) for (let dy = 0; dy <= 6; dy++) P.set(x, tw.balconyZ1, dy, STEEL_GLASS);
  for (const x of [tw.tx0, tw.tx1]) for (let z = tw.z1 - 7; z < tw.balconyZ1; z++) { for (let dy = 1; dy <= 6; dy++) P.set(x, z, dy, STEEL_GLASS); if (z > tw.z1) P.set(x, z, 0, CHROME); }
  for (const x of [tw.tx0, tw.tx1]) for (let z = tw.z0 + 2; z < tw.z1 - 7; z += 4) if (P.t(x, z) === T.RWALL) { P.set(x, z, 2, GLOW_PANEL); P.set(x, z, 5, GLOW_PANEL); }
  for (let x = -7; x <= 7; x += 2) P.set(x, tw.z0, 2, x % 3 === 0 ? PANEL_RED : PANEL_BLACK);
}
function throneUpper(P, room, rng, T) {
  const tw = TOWER;
  for (let x = tw.tx0; x <= tw.tx1; x++) for (let z = tw.z0; z <= tw.balconyZ1; z++) {
    const t = P.t(x, z);
    if (t === T.ROOM) { P.set(x, z, 0, AIR); P.set(x, z, 6, ((x + 12) % 3 === 1 && z % 3 === 1) ? GLOW_PANEL : DURASTEEL_DARK); }
    else if (t === T.RWALL) { P.set(x, z, 3, PANEL_RED); if (z % 4 === 0 && z < tw.z1 - 7) P.set(x, z, 1, GLOW_PANEL); }
    else if (t === T.SOLID) { P.fillCol(x, z, 0, 6, PANEL_BLACK); if (x === tw.module.mx - 4 && z % 2 === 0) P.set(x, z, 2, GLOW_PANEL_BLUE); }
  }
  for (let x = tw.tx0 + 1; x < tw.tx1; x++) for (let dy = 0; dy <= 5; dy++) P.set(x, tw.balconyZ1, dy, STEEL_GLASS);
  for (const x of [tw.tx0, tw.tx1]) for (let z = tw.z1 - 7; z < tw.balconyZ1; z++) for (let dy = 0; dy <= 3; dy++) P.set(x, z, dy, STEEL_GLASS);
}

const FIXED_FURNISH = {
  detention, compactor, gallery, superlaser, bridge, throne, throneUpper,
  tractorLedge: (P, r, rng, T) => tractor(P, r, rng, T, 'ledge'),
  tractorChasm: (P, r, rng, T) => tractor(P, r, rng, T, 'chasm'),
  tractorFloor: (P, r, rng, T) => tractor(P, r, rng, T, 'floor'),
};

export function furnishRoom(P, room, rng, T) {
  if (room.fixed) { const f = FIXED_FURNISH[room.name]; if (f) f(P, room, rng, T); return; }
  room.tpl.furnish(P, room, rng, T);
}
