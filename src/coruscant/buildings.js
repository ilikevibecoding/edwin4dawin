// PLACEHOLDER building blueprints for Coruscant lots. The towers/rooms builder replaces this file with the real
// tower families and room library; keep the export signature:
//
//   blueprintFor(lot, layout) -> { w, h, d, y0, blocks: Uint8Array(w*h*d), meta }
//
// - blocks are indexed (x*d + z)*h + y (VoxelGrid layout, src/vehicles/voxelMesh.js); 0 = leave the world alone,
//   255 = force air; the footprint is exactly the lot (w = lot.w, d = lot.d), the origin is (lot.x0, y0, lot.z0).
// - y0 = 60 is the plateau top block (repaved by the blueprint); the lobby walk level is y0 + 1 = 61; floors sit on
//   y = 60 + 5k so skybridges (layout.bridges, floors on the same lattice) and the y 95/96 boulevard deck line up.
// - lot.door is the door column on the front side (undercity door at y 61..63); when lot.midDoor the same column
//   also gets a door at y 96..98 that city.js connects to the boulevard with a gangway.
// - city.js carves a 3 wide x 2 high opening 1 block into the lot at every skybridge end (bridge.y + 1 .. + 2), so a
//   tower must present a wall at the lot edge there (lot.bridges lists the bridge ids).
// - meta (absolute coords) mirrors the western town's records: { name, kind, family, district, floorY, bounds, door,
//   inside, midDoor, lobby, spots, work, beds, lifts, floors }. Results are memoised in an LRU of 256 entries.
import { B } from '../blocks.js';
import { RNG, hash2, hash3 } from '../rng.js';
import { LEVELS, DISTRICT_PROFILE } from './layout.js';

const LRU_MAX = 256;
const lru = new Map();
const pinned = new Map();   // the few big landmark blueprints never leave the cache (no 40 ms regeneration spikes)
const P = LEVELS.floorPitch;

export function blueprintFor(lot, layout) {
  const key = (layout ? layout.seed : 0) + ':' + lot.id;
  let bp = pinned.get(key) || lru.get(key);
  if (bp) { if (lru.has(key)) { lru.delete(key); lru.set(key, bp); } return bp; }
  if (lot.kind === 'landmark') { bp = landmark(lot); pinned.set(key, bp); return bp; }
  bp = tower(lot);
  lru.set(key, bp);
  if (lru.size > LRU_MAX) lru.delete(lru.keys().next().value);
  return bp;
}
export function blueprintCacheSize() { return lru.size + pinned.size; }
// Generates the landmark blueprints up front (called at registration, off the streaming path).
export function prewarmBlueprints(layout) { for (const lot of layout.lots) if (lot.kind === 'landmark') blueprintFor(lot, layout); }

class Grid {
  constructor(w, h, d, y0) { this.w = w; this.h = h; this.d = d; this.y0 = y0; this.blocks = new Uint8Array(w * h * d); }
  idx(x, y, z) { return (x * this.d + z) * this.h + y; }
  set(x, y, z, id) { if (x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d) this.blocks[(x * this.d + z) * this.h + y] = id; }
  get(x, y, z) { return (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) ? 0 : this.blocks[(x * this.d + z) * this.h + y]; }
  fill(x0, y0, z0, x1, y1, z1, id) { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) this.set(x, y, z, id); }
}

// Footprint mask from an inside(x, z) predicate: 0 outside, 1 wall (inside with an outside 4-neighbour), 2 interior.
function maskFrom(w, d, inside) {
  const m = new Uint8Array(w * d);
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    if (!inside(x, z)) continue;
    const wall = !inside(x - 1, z) || !inside(x + 1, z) || !inside(x, z - 1) || !inside(x, z + 1);
    m[x * d + z] = wall ? 1 : 2;
  }
  return m;
}
const rectInside = (w, d, i) => (x, z) => x >= i && z >= i && x < w - i && z < d - i;
const ellipseInside = (w, d) => { const cx = (w - 1) / 2, cz = (d - 1) / 2, rx = w / 2 + 0.01, rz = d / 2 + 0.01; return (x, z) => { if (x < 0 || z < 0 || x >= w || z >= d) return false; const u = (x - cx) / rx, v = (z - cz) / rz; return u * u + v * v <= 1; }; };

const PALETTES = {
  slab: [{ wall: B.DURASTEEL, pier: B.DURASTEEL, trim: B.CHROME, roof: B.DURASTEEL_DARK, every: 3 }, { wall: B.HULL_PLATE, pier: B.DURASTEEL_DARK, trim: B.DURASTEEL, roof: B.DECK_PLATE, every: 4 }, { wall: B.PANEL_BLACK, pier: B.PANEL_BLACK, trim: B.CHROME, roof: B.PANEL_BLACK, every: 3 }],
  twin: [{ wall: B.DURASTEEL, pier: B.CHROME, trim: B.CHROME, roof: B.DURASTEEL_DARK, every: 3 }, { wall: B.DURASTEEL_DARK, pier: B.DURASTEEL, trim: B.CHROME, roof: B.DECK_PLATE, every: 4 }],
  cylinder: [{ wall: B.CHROME, pier: B.DURASTEEL, trim: B.DURASTEEL_DARK, roof: B.DURASTEEL, every: 4 }, { wall: B.DURASTEEL, pier: B.DURASTEEL_DARK, trim: B.CHROME, roof: B.DURASTEEL_DARK, every: 3 }],
  setback: [{ wall: B.HULL_PLATE, pier: B.HULL_PLATE, trim: B.DURASTEEL, roof: B.DURASTEEL_DARK, every: 3 }, { wall: B.DURASTEEL_DARK, pier: B.DURASTEEL, trim: B.PANEL_RED, roof: B.DECK_PLATE, every: 4 }],
  habitat: [{ wall: B.PLASTER, pier: B.DURASTEEL, trim: B.DURASTEEL_DARK, roof: B.DURASTEEL_DARK, every: 3 }, { wall: B.SMOOTH_STONE, pier: B.DURASTEEL_DARK, trim: B.CHROME, roof: B.DECK_PLATE, every: 4 }],
  stack: [{ wall: B.DURASTEEL_DARK, pier: B.HULL_PLATE, trim: B.PANEL_RED, roof: B.DECK_PLATE, every: 4 }, { wall: B.HULL_PLATE, pier: B.PANEL_BLACK, trim: B.PANEL_RED, roof: B.DURASTEEL_DARK, every: 5 }],
  pad: [{ wall: B.DURASTEEL, pier: B.PANEL_BLACK, trim: B.CHROME, roof: B.DECK_PLATE, every: 3 }],
  hall: [{ wall: B.DURASTEEL_DARK, pier: B.DURASTEEL, trim: B.HOLO_SIGN, roof: B.DECK_PLATE, every: 4 }, { wall: B.HULL_PLATE, pier: B.DURASTEEL_DARK, trim: B.PANEL_RED, roof: B.DURASTEEL_DARK, every: 4 }],
  civic: [{ wall: B.CHROME, pier: B.DURASTEEL, trim: B.GLOW_PANEL, roof: B.CHROME, every: 3 }, { wall: B.DURASTEEL, pier: B.CHROME, trim: B.GLOW_PANEL, roof: B.DURASTEEL_DARK, every: 4 }],
};

function tower(lot) {
  const w = lot.w, d = lot.d, H = lot.height;
  const g = new Grid(w, H + 1, d, LEVELS.ground);
  const rng = new RNG(lot.seed);
  const prof = DISTRICT_PROFILE[lot.district] || DISTRICT_PROFILE.residential;
  const pals = PALETTES[lot.family] || PALETTES.slab;
  const pal = pals[Math.floor(rng.next() * pals.length)];
  const litFrac = prof.lit;
  const roofLy = Math.max(P, Math.floor((H - 3) / P) * P);        // top structural slab
  const door = { x: lot.door.x - lot.x0, z: lot.door.z - lot.z0, side: lot.door.side };
  const frontX = door.side === 'W' || door.side === 'E';

  // footprint(s): rect by default; ellipse for round families without bridges; twin towers split perpendicular
  // to the facade; setbacks inset the upper part above every bridge attachment
  let family = lot.family;
  let gap = null;
  if ((family === 'cylinder' || family === 'habitat') && (lot.bridges.length || w < 18 || d < 18)) family = 'slab';
  if (family === 'twin') {
    const L = frontX ? w : d;
    if (L >= 30) { const a = Math.floor(L / 2) - 1; gap = [a, a + 2]; } else family = 'slab';     // 3-wide gap cells a..a+2
  }
  const baseInside = family === 'cylinder' || family === 'habitat' ? ellipseInside(w, d)
    : gap ? (x, z) => x >= 0 && z >= 0 && x < w && z < d && !((frontX ? x : z) >= gap[0] && (frontX ? x : z) <= gap[1])
      : rectInside(w, d, 0);
  const base = maskFrom(w, d, baseInside);
  let setbackLy = Infinity, upper = null;
  if (family === 'setback' && H >= 60 && w >= 22 && d >= 22) {
    setbackLy = Math.max(Math.round(H * 0.65 / P) * P, 40);
    upper = maskFrom(w, d, rectInside(w, d, 3));
  }
  const maskAt = (ly) => (ly >= setbackLy ? upper : base);
  const wallBlock = (x, z, ly, floorI) => {
    // spandrel on slab layers, window bands elsewhere; piers every N cells; corners in trim
    const m = maskAt(ly);
    const facesX = x === 0 || x === w - 1 || (gap && frontX && (x === gap[0] - 1 || x === gap[1] + 1));
    const u = facesX ? z : x;
    if (ly % P === 0) return pal.wall;
    const corner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
    if (corner) return pal.trim === B.GLOW_PANEL && ly % P === 3 ? B.GLOW_PANEL : (pal.trim === B.GLOW_PANEL ? pal.pier : pal.trim);
    if (u % pal.every === 0) return pal.pier;
    if (family === 'stack' && ((u + floorI) % 5 === 1)) return B.VENT;
    if (family === 'hall') return B.STEEL_GLASS;
    if (ly % P === 4) return pal.wall;                                   // lintel band under each slab
    const lit = hash3(floorI, u >> 1, lot.seed + (m === upper ? 3 : 0)) < litFrac;
    return lit ? B.WINDOW_LIT : B.WINDOW_DARK;
  };

  const meta = { id: lot.id, name: `${cap(lot.district)} ${cap(family)} ${lot.id}`, kind: 'tower', family, district: lot.district, floorY: LEVELS.underWalk,
    bounds: { x0: lot.x0, x1: lot.x1 - 1, z0: lot.z0, z1: lot.z1 - 1 }, door: { x: lot.door.out.x, y: LEVELS.underWalk, z: lot.door.out.z },
    inside: { x: lot.door.in.x, y: LEVELS.underWalk, z: lot.door.in.z }, midDoor: lot.midDoor ? { x: lot.door.out.x, y: LEVELS.midWalk, z: lot.door.out.z } : null,
    lobby: null, spots: [], work: [], beds: [], lifts: [], floors: [] };

  // ground slab (repaves the plateau under the lot)
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) g.set(x, 0, z, base[x * d + z] ? (base[x * d + z] === 1 ? pal.pier : B.DECK_PLATE) : B.DECK_PLATE);
  // lift shaft position (inside the base footprint, avoiding a twin gap)
  let sx = (w >> 1) - 1, sz = (d >> 1) - 1;
  if (gap) { if (frontX) sx = gap[0] - 4; else sz = gap[0] - 4; }
  sx = Math.max(2, Math.min(w - 4, sx)); sz = Math.max(2, Math.min(d - 4, sz));
  meta.lifts.push({ x: lot.x0 + sx, z: lot.z0 + sz, y0: LEVELS.underWalk, y1: LEVELS.ground + roofLy });

  // cell lists per footprint so each layer only touches its walls (and interiors on slab layers)
  const cellLists = (m) => { const walls = [], inner = []; for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { const c = m[x * d + z]; if (c === 1) walls.push(x, z); else if (c === 2) inner.push(x, z); } return { walls, inner }; };
  const baseCells = cellLists(base), upperCells = upper ? cellLists(upper) : null;
  const H1 = H + 1, blocks = g.blocks;
  for (let ly = 1; ly <= roofLy; ly++) {
    const m = maskAt(ly), cells = m === upper ? upperCells : baseCells;
    const slab = ly % P === 0;
    const floorI = Math.floor(ly / P);
    const wl = cells.walls;
    for (let k = 0; k < wl.length; k += 2) { const x = wl[k], z = wl[k + 1]; blocks[(x * d + z) * H1 + ly] = ly < P ? lobbyWall(x, z, ly, pal, w, d) : wallBlock(x, z, ly, floorI); }
    if (slab) {
      const il = cells.inner, roof = ly === roofLy;
      for (let k = 0; k < il.length; k += 2) {
        const x = il[k], z = il[k + 1];
        blocks[(x * d + z) * H1 + ly] = roof ? pal.roof : ((x % 7 === 3) && (z % 7 === 3) ? B.GLOW_PANEL : B.DECK_PLATE);   // light panels in the slabs
      }
    }
    // setback terrace: the ring between the two footprints becomes a roof at the setback slab
    if (ly === setbackLy) for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) if (base[x * d + z] && !upper[x * d + z]) { g.set(x, ly, z, pal.roof); if (base[x * d + z] === 1) g.set(x, ly + 1, z, B.IRON_BARS); }
    // lift shaft through every layer
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) g.set(sx + dx, ly, sz + dz, B.PANEL_BLACK);
    if (ly % P === 2) g.set(sx, ly, sz, B.GLOW_PANEL_BLUE);
  }
  // floors: furniture + NPC metadata (walk level ly = 5k + 1)
  for (let ly = 1; ly < roofLy; ly += P) {
    const m = maskAt(ly);
    const wy = LEVELS.ground + ly;
    meta.floors.push(wy);
    const fx = sx - 2 >= 2 ? 2 : w - 3, fz = 2;
    const interior = (x, z) => x >= 0 && z >= 0 && x < w && z < d && m[x * d + z] === 2 && !(x >= sx - 1 && x <= sx + 2 && z >= sz - 1 && z <= sz + 2);
    if (interior(fx, fz) && interior(fx, fz + 1)) {
      if (lot.district === 'residential' || family === 'habitat') {
        if (((ly - 1) / P) % 2 === 0) { g.set(fx, ly, fz, B.BED_HEAD); g.set(fx, ly, fz + 1, B.BED_FOOT); meta.beds.push({ x: lot.x0 + fx, y: wy, z: lot.z0 + fz + 2 }); }
        else { g.set(fx, ly, fz, B.TABLE); g.set(fx, ly, fz + 1, B.CHEST); }
      } else if (family === 'stack') { g.set(fx, ly, fz, B.CRATE); g.set(fx, ly + 1, fz, B.CRATE); g.set(fx, ly, fz + 1, B.BARREL); }
      else if (family === 'hall') { g.set(fx, ly, fz, B.SHELF); g.set(fx, ly, fz + 1, B.CRATE); meta.work.push({ x: lot.x0 + fx + 1, y: wy, z: lot.z0 + fz }); }
      else { g.set(fx, ly, fz, B.CONSOLE); g.set(fx, ly, fz + 1, B.TABLE); meta.work.push({ x: lot.x0 + fx + 1, y: wy, z: lot.z0 + fz }); }
    }
    if (interior(w - 3, d - 3)) meta.spots.push({ x: lot.x0 + w - 3, y: wy, z: lot.z0 + d - 3 });
    if (interior(2, d - 3)) meta.spots.push({ x: lot.x0 + 2, y: wy, z: lot.z0 + d - 3 });
  }
  // lobby: reception console, lights, vents on the back wall, doors
  const lobbyCx = Math.max(1, Math.min(w - 2, door.x + (door.side === 'W' ? 3 : door.side === 'E' ? -3 : 0)));
  const lobbyCz = Math.max(1, Math.min(d - 2, door.z + (door.side === 'N' ? 3 : door.side === 'S' ? -3 : 0)));
  meta.lobby = { x: lot.x0 + lobbyCx, y: LEVELS.underWalk, z: lot.z0 + lobbyCz };
  if (base[lobbyCx * d + lobbyCz] === 2 && !(lobbyCx >= sx - 1 && lobbyCx <= sx + 2 && lobbyCz >= sz - 1 && lobbyCz <= sz + 2)) { g.set(lobbyCx, 1, lobbyCz, B.CONSOLE); meta.work.push({ x: lot.x0 + lobbyCx, y: LEVELS.underWalk, z: lot.z0 + lobbyCz + 1 }); }
  carveDoor(g, door, 1, w, d);
  if (lot.midDoor && roofLy > 36) carveDoor(g, door, 36, w, d);
  // roof: parapet, plant box, antenna / beacon; landing pad for the 'pad' family
  const top = maskAt(roofLy);
  if (family === 'pad') {
    const cx = (w - 1) / 2, cz = (d - 1) / 2, r = Math.min(w, d) / 2 - 2;
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
      if (!top[x * d + z]) continue;
      const dd = Math.hypot(x - cx, z - cz);
      if (dd > r - 1.2 && dd <= r) g.set(x, roofLy, z, B.CHROME);
      if (dd <= 1.5) g.set(x, roofLy, z, B.GLOW_PANEL);
    }
    for (const [x, z] of [[1, 1], [w - 2, 1], [1, d - 2], [w - 2, d - 2]]) g.set(x, roofLy + 1, z, B.GLOW_PANEL_BLUE);
  } else {
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) if (top[x * d + z] === 1) g.set(x, roofLy + 1, z, hash2(x, z, lot.seed) < 0.5 ? pal.trim : B.IRON_BARS);
    if (top[2 * d + 2] === 2 && top[4 * d + 4] === 2) { g.fill(2, roofLy + 1, 2, 4, roofLy + 2, 4, B.DURASTEEL_DARK); g.set(3, roofLy + 3, 3, B.VENT); }
    if (family === 'stack') for (const [x, z] of [[w - 4, d - 4], [w - 4, d - 7]]) if (top[x * d + z] === 2) { g.fill(x, roofLy + 1, z, x + 1, roofLy + 6, z + 1, B.DURASTEEL_DARK); g.fill(x, roofLy + 7, z, x + 1, roofLy + 7, z + 1, B.PANEL_RED); }
  }
  // antenna on the lift shaft
  g.fill(sx, roofLy + 1, sz, sx + 1, Math.min(H, roofLy + 2), sz + 1, B.PANEL_BLACK);
  for (let ly = roofLy + 3; ly < H; ly++) g.set(sx, ly, sz, B.IRON_BARS);
  g.set(sx, H, sz, hash2(lot.x0, lot.z0, 4) < 0.5 ? B.PANEL_RED : B.GLOW_PANEL_BLUE);
  // twin connector at 60 % height
  if (gap) {
    const by = Math.max(P * 2, Math.round(H * 0.6 / P) * P);
    const c0 = frontX ? door.z - 1 : door.x - 1;
    for (let k = 0; k < 3; k++) for (let gi = gap[0]; gi <= gap[1]; gi++) {
      const x = frontX ? gi : c0 + k, z = frontX ? c0 + k : gi;
      g.set(x, by, z, B.DECK_PLATE); g.set(x, by + 3, z, B.GLOW_PANEL);
      const edge = k === 0 || k === 2;
      for (let yy = by + 1; yy <= by + 2; yy++) g.set(x, yy, z, edge ? B.STEEL_GLASS : 255);
    }
  }
  return { w, h: H + 1, d, y0: LEVELS.ground, blocks: g.blocks, meta };
}

function lobbyWall(x, z, ly, pal, w, d) {
  const u = (x === 0 || x === w - 1) ? z : x;
  if (u % 3 === 0 || ly === 4) return pal.pier;
  const back = (x === 0 || x === w - 1) ? (z % 4 === 2) : (x % 4 === 2);
  return back && ly <= 2 ? B.VENT : B.STEEL_GLASS;
}

// 2 wide x 3 high opening at the door column with a chrome frame and blue markers; `ly` is the walk layer.
function carveDoor(g, door, ly, w, d) {
  const along = door.side === 'W' || door.side === 'E' ? 'z' : 'x';
  const cells = along === 'z' ? [[door.x, door.z], [door.x, door.z + 1]] : [[door.x, door.z], [door.x + 1, door.z]];
  const frame = along === 'z' ? [[door.x, door.z - 1], [door.x, door.z + 2]] : [[door.x - 1, door.z], [door.x + 2, door.z]];
  for (const [x, z] of cells) { for (let k = 0; k < 3; k++) g.set(x, ly + k, z, 255); g.set(x, ly + 3, z, B.CHROME); }
  for (const [x, z] of frame) { for (let k = 0; k < 4; k++) g.set(x, ly + k, z, B.CHROME); g.set(x, ly + 1, z, B.GLOW_PANEL_BLUE); }
  // a clear path two cells into the lobby
  const inward = door.side === 'W' ? [1, 0] : door.side === 'E' ? [-1, 0] : door.side === 'N' ? [0, 1] : [0, -1];
  for (const [x, z] of cells) for (let s = 1; s <= 2; s++) for (let k = 0; k < 3; k++) { const xx = x + inward[0] * s, zz = z + inward[1] * s; if (xx > 0 && zz > 0 && xx < w - 1 && zz < d - 1) g.set(xx, ly + k, zz, 255); }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ------------------------------------------------------------------------------------------------ landmarks
function landmark(lot) {
  if (lot.family === 'senate') return senate(lot);
  if (lot.family === 'temple') return temple(lot);
  return opera(lot);
}

function baseMeta(lot, name, kind) {
  const cx = lot.x0 + (lot.w >> 1), cz = lot.z0 + (lot.d >> 1);
  return { id: lot.id, name, kind, family: lot.family, district: lot.district, floorY: LEVELS.underWalk,
    bounds: { x0: lot.x0, x1: lot.x1 - 1, z0: lot.z0, z1: lot.z1 - 1 },
    door: { x: cx, y: LEVELS.underWalk, z: lot.z1 }, inside: { x: cx, y: LEVELS.underWalk, z: lot.z1 - 3 }, midDoor: null,
    lobby: { x: cx, y: LEVELS.underWalk, z: cz }, spots: [], work: [], beds: [], lifts: [], floors: [LEVELS.underWalk] };
}

// Senate: a windowed drum with four arched entrances under a great dome with chrome meridians and a spire.
function senate(lot) {
  const w = lot.w, d = lot.d, H = lot.height;
  const g = new Grid(w, H + 1, d, LEVELS.ground);
  const cx = (w - 1) / 2, cz = (d - 1) / 2;
  const R1 = Math.min(w, d) / 2 - 2, drumH = 16, R2 = R1 - 2;
  const meta = baseMeta(lot, 'Galactic Senate', 'landmark');
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    const dd = Math.hypot(x - cx, z - cz);
    const ang = Math.atan2(z - cz, x - cx);
    g.set(x, 0, z, dd <= R1 ? (dd <= 3 ? B.CHROME : (Math.floor(dd / 4) % 2 ? B.DECK_PLATE : B.DURASTEEL)) : B.DECK_PLATE);
    if (dd > R1) { if (dd <= R1 + 1.5 && (Math.round(dd) % 2 === 0)) g.set(x, 1, z, B.IRON_BARS); continue; }
    // drum
    if (dd > R1 - 1.2) {
      for (let ly = 1; ly <= drumH; ly++) {
        let id = B.DURASTEEL;
        if (ly >= 6 && ly <= 9 && Math.round(ang * 24 / Math.PI) % 2 === 0) id = ly % 2 ? B.WINDOW_LIT : B.WINDOW_DARK;
        if (ly === drumH) id = B.CHROME;
        g.set(x, ly, z, id);
      }
      // arched entrances at the cardinal points (4 wide, 5 high)
      const isCardinal = (Math.abs(x - cx) <= 2 && Math.abs(z - cz) > R1 - 3) || (Math.abs(z - cz) <= 2 && Math.abs(x - cx) > R1 - 3);
      if (isCardinal) { for (let ly = 1; ly <= 5; ly++) g.set(x, ly, z, 255); g.set(x, 6, z, B.GLOW_PANEL_BLUE); }
    }
  }
  // dome shell, layer by layer: cells inside this layer's disc but outside the next layer's disc (closed voxel dome)
  for (let t = 0; t <= R2; t++) {
    const r2 = R2 * R2 - t * t, r = Math.sqrt(Math.max(0, r2));
    const rn2 = t + 1 <= R2 ? R2 * R2 - (t + 1) * (t + 1) : -1, ri2 = (r - 1.1) * (r - 1.1);
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    for (let x = x0; x <= x1; x++) {
      const dx2 = (x - cx) * (x - cx);
      for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(d - 1, Math.ceil(cz + r)); z++) {
        const dd2 = dx2 + (z - cz) * (z - cz);
        if (dd2 > r2 || (dd2 <= rn2 && dd2 <= ri2)) continue;
        const ang = Math.atan2(z - cz, x - cx);
        const meridian = Math.abs(((ang / (Math.PI * 2)) * 16 + 16.5) % 1 - 0.5) < 0.04;
        g.set(x, drumH + 1 + t, z, t === 0 ? B.GLOW_PANEL : t === 1 ? B.CHROME : meridian ? B.CHROME : B.DURASTEEL);
      }
    }
  }
  // spire on the apex
  const ax = Math.round(cx), az = Math.round(cz), apex = drumH + 1 + Math.ceil(R2);
  for (let ly = apex; ly <= Math.min(H - 1, apex + 8); ly++) g.set(ax, ly, az, B.CHROME);
  g.set(ax, Math.min(H, apex + 9), az, B.GLOW_PANEL_BLUE);
  // podium + rings of seats inside the hall
  g.fill(ax - 2, 1, az - 2, ax + 2, 1, az + 2, B.CHROME); g.set(ax, 2, az, B.CONSOLE);
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { const dd = Math.hypot(x - cx, z - cz); if (dd > 8 && dd < R1 - 4 && Math.floor(dd) % 6 === 0) g.set(x, 1 + Math.floor(dd / 12), z, B.STONE_BRICK_SLAB); }
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.set(Math.round(cx + Math.cos(a) * 6), 1, Math.round(cz + Math.sin(a) * 6), B.GLOW_PANEL); }
  meta.work.push({ x: lot.x0 + ax, y: LEVELS.underWalk + 1, z: lot.z0 + az + 1 });
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; meta.spots.push({ x: lot.x0 + Math.round(cx + Math.cos(a) * 12), y: LEVELS.underWalk, z: lot.z0 + Math.round(cz + Math.sin(a) * 12) }); }
  return { w, h: H + 1, d, y0: LEVELS.ground, blocks: g.blocks, meta };
}

// Temple: three stepped tiers with a central hall and five spires (the centre one reaches y 250).
function temple(lot) {
  const w = lot.w, d = lot.d, H = lot.height;
  const g = new Grid(w, H + 1, d, LEVELS.ground);
  const meta = baseMeta(lot, 'Temple of the Order', 'landmark');
  const tiers = [[0, 0, 8], [8, 9, 16], [16, 17, 24]];   // [inset, ly0, ly1]
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) g.set(x, 0, z, B.DECK_PLATE);
  for (const [ins, ly0, ly1] of tiers) {
    for (let x = ins; x < w - ins; x++) for (let z = ins; z < d - ins; z++) {
      const wall = x === ins || x === w - 1 - ins || z === ins || z === d - 1 - ins;
      for (let ly = ly0; ly <= ly1; ly++) {
        if (ly === ly1) { g.set(x, ly, z, wall ? B.CHROME : B.DURASTEEL); continue; }
        if (!wall) { if (ly === ly0 && ly0 > 0) g.set(x, ly, z, B.DECK_PLATE); continue; }
        const u = (x === ins || x === w - 1 - ins) ? z : x;
        g.set(x, ly, z, (ly - ly0) % 4 === 2 && u % 3 === 1 ? B.WINDOW_DARK : B.HULL_PLATE);
      }
    }
  }
  // entrances (south) + hall
  const mx = w >> 1;
  for (let dx = -2; dx <= 2; dx++) for (let ly = 1; ly <= 5; ly++) g.set(mx + dx, ly, d - 1, 255);
  for (let x = 4; x < w - 4; x++) for (let z = 4; z < d - 4; z++) for (let ly = 1; ly <= 6; ly++) g.set(x, ly, z, 255);
  for (let x = 6; x < w - 6; x += 8) for (let z = 6; z < d - 6; z += 8) { g.fill(x, 1, z, x, 6, z, B.CHROME); g.set(x, 7, z, B.GLOW_PANEL); }
  // spires: 4 corners of the top tier + centre
  const topLy = 24, s = 7;
  const spires = [[18, 18, 150], [w - 18 - s, 18, 150], [18, d - 18 - s, 150], [w - 18 - s, d - 18 - s, 150], [mx - 4, (d >> 1) - 4, H]];
  for (const [x0, z0, hh] of spires) {
    const sw = x0 === mx - 4 ? 9 : s;
    const top = Math.min(H, hh);
    for (let x = x0; x < x0 + sw; x++) for (let z = z0; z < z0 + sw; z++) {
      const wall = x === x0 || x === x0 + sw - 1 || z === z0 || z === z0 + sw - 1;
      for (let ly = topLy; ly <= top - 6; ly++) {
        if (wall) { const u = (x === x0 || x === x0 + sw - 1) ? z - z0 : x - x0; g.set(x, ly, z, ly % P === 0 ? B.DURASTEEL : (u % 2 === 1 && ly % P !== 4 ? (hash3(x, ly, z, lot.seed) < 0.4 ? B.WINDOW_LIT : B.WINDOW_DARK) : B.DURASTEEL)); }
        else if (ly % P === 0) g.set(x, ly, z, B.DECK_PLATE);
      }
      // cap: stepped chrome pyramid + beacon
      const ci = Math.max(Math.abs(x - (x0 + (sw - 1) / 2)), Math.abs(z - (z0 + (sw - 1) / 2)));
      for (let k = 0; k < 5; k++) if (ci <= (sw - 1) / 2 - k) g.set(x, top - 5 + k, z, B.CHROME);
    }
    g.set(x0 + (sw >> 1), top, z0 + (sw >> 1), B.GLOW_PANEL_BLUE);
    meta.lifts.push({ x: lot.x0 + x0 + 1, z: lot.z0 + z0 + 1, y0: LEVELS.ground + topLy + 1, y1: LEVELS.ground + top - 6 });
  }
  meta.spots.push({ x: lot.x0 + mx, y: LEVELS.underWalk, z: lot.z0 + (d >> 1) });
  return { w, h: H + 1, d, y0: LEVELS.ground, blocks: g.blocks, meta };
}

// Opera: an elliptical hall with chrome walls, glow strips, a low dome roof, a stage and tiered seating.
function opera(lot) {
  const w = lot.w, d = lot.d, H = lot.height;
  const g = new Grid(w, H + 1, d, LEVELS.ground);
  const meta = baseMeta(lot, 'Galaxies Opera House', 'landmark');
  const cx = (w - 1) / 2, cz = (d - 1) / 2, rx = w / 2 - 3, rz = d / 2 - 3, wallH = 30, domeH = Math.max(6, H - wallH - 1);
  const inside = (x, z) => { const u = (x - cx) / rx, v = (z - cz) / rz; return u * u + v * v <= 1; };
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    g.set(x, 0, z, inside(x, z) ? B.DECK_PLATE : B.DURASTEEL);
    if (!inside(x, z)) { if (hash2(x, z, lot.seed) < 0.04) { g.set(x, 1, z, B.IRON_BARS); g.set(x, 2, z, B.CITY_LAMP); } continue; }
    const wall = !inside(x - 1, z) || !inside(x + 1, z) || !inside(x, z - 1) || !inside(x, z + 1);
    const ang = Math.atan2(z - cz, x - cx);
    const strip = Math.abs(((ang / (Math.PI * 2)) * 20 + 20.5) % 1 - 0.5) < 0.05;
    if (wall) for (let ly = 1; ly <= wallH; ly++) g.set(x, ly, z, strip ? B.GLOW_PANEL : (ly % 6 === 0 ? B.DURASTEEL_DARK : B.CHROME));
    // dome: scaled ellipse per layer
    const u = (x - cx) / rx, v = (z - cz) / rz, rr = Math.sqrt(u * u + v * v);
    for (let t = 0; t <= domeH; t++) {
      const s = Math.sqrt(Math.max(0, 1 - (t / domeH) * (t / domeH))), sn = t + 1 <= domeH ? Math.sqrt(Math.max(0, 1 - ((t + 1) / domeH) * ((t + 1) / domeH))) : -1;
      if (rr > s) continue;
      if (rr > sn || rr > s - 0.05) g.set(x, wallH + 1 + t, z, t === 0 ? B.CHROME : B.DURASTEEL);
    }
  }
  // entrance (south) with holo signs above
  const mx = w >> 1;
  for (let dx = -3; dx <= 3; dx++) for (let z = d - 4; z < d; z++) for (let ly = 1; ly <= 5; ly++) if (inside(mx + dx, z) || z >= d - 4) g.set(mx + dx, ly, z, 255);
  for (let dx = -3; dx <= 3; dx++) { g.set(mx + dx, 6, d - 3, B.HOLO_SIGN); g.set(mx + dx, 7, d - 3, B.HOLO_SIGN); }
  // stage (north) + tiered seating rising to the south
  const sz = Math.round(cz - rz * 0.6);
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    if (!inside(x, z) || (Math.abs(x - cx) > rx - 2)) continue;
    if (z < sz - 3) { g.set(x, 1, z, B.PANEL_RED); if (z === sz - 4) g.set(x, 4, z, B.GLOW_PANEL); }
    else if (z > sz + 4 && z < d - 6) { const row = Math.floor((z - sz - 5) / 3); g.fill(x, 1, z, x, row, z, B.DURASTEEL_DARK); g.set(x, row + 1, z, (z - sz - 5) % 3 === 0 ? B.STONE_BRICK_SLAB : B.DURASTEEL_DARK); }
  }
  for (let k = 0; k < 10; k++) meta.spots.push({ x: lot.x0 + Math.round(cx + (k - 4.5) * 3), y: LEVELS.underWalk + 1, z: lot.z0 + sz + 8 });
  meta.work.push({ x: lot.x0 + Math.round(cx), y: LEVELS.underWalk + 1, z: lot.z0 + sz - 6 });
  return { w, h: H + 1, d, y0: LEVELS.ground, blocks: g.blocks, meta };
}
