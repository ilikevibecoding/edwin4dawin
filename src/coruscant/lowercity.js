// The lower city (spec section 4): the lazy structure that dresses the terraced ring around the Coruscant plateau
// chunk by chunk. worldgen.js already shaped the ground (terraces 40 / 30 / 20 / 12, the sea wall); this module
// classifies every column by its local frame (side, d, v; see worldgen lowerLocal and lowercity/plan.js) and paints
// the face-strip service decks with conduits and vent boxes, the cells (building masses with sparse warm windows and
// blue service lights, glass-walled industrial rooms, ventilation wells glowing at the bottom, container yards,
// plazas), the rail decks along the terrace edges, the freight trenches (conveyors, containers, slab stairs at the
// terrace steps) and the service corridors (slab stairs down every terrace), then the objects (lowercity/routes.js):
// stair towers to the rim at every corridor, the public lift, the freight ramp, the ventilation-well route, the
// lane-marker masts. Deterministic: hashes on local coordinates only; no Math.random, no DOM.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import { hash2, hash3 } from '../rng.js';
import { LOWER, lowerLocal, lowerBand } from '../worldgen.js';
import { LC, K, railR0, groundOf, trenchFloor, trenchOf, corridorOf, cellAt, inFoot, stepSurface } from './lowercity/plan.js';
import { paintObjects, wellColumn } from './lowercity/routes.js';

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, BLK = B.PANEL_BLACK, PLATE = B.DECK_PLATE, STR = B.PANEL_STRIPE, GL = B.STEEL_GLASS;
const BLUE = B.GLOW_PANEL_BLUE, GLOW = B.GLOW_PANEL, LAMP = B.CITY_LAMP, HOLO = B.HOLO_SIGN, VENT = B.VENT, CHR = B.CHROME;
const RED = B.PANEL_RED, SLAB = B.STONE_BRICK_SLAB, BARS = B.IRON_BARS, WLIT = B.WINDOW_LIT, WDK = B.WINDOW_DARK, SS = B.SMOOTH_STONE;
const CRATE = B.CRATE, FURN = B.FURNACE, CON = B.CONSOLE, RAIL = B.RAIL, NEON = B.NEON_PINK, AIR = B.AIR;
const WALL_BLOCK = [DD, BLK, SS];
const mod = (a, m) => ((a % m) + m) % m;

const C = REGION_BOX();
function REGION_BOX() {
  const half = 512 + LOWER.reach;
  return { x0: 3000 - half, z0: -half, x1: 3000 + half + 1, z1: half + 1 };
}

export function register(gen, game) {
  gen.addStructure({ name: 'lowercity', x0: C.x0, z0: C.z0, x1: C.x1, z1: C.z1, fill: (chunk) => fillChunk(chunk) });
  if (game) {
    game.lowerCity = {
      timing: () => { const s = gen.structures.find((st) => st.name === 'lowercity'); return s ? { chunks: s.chunks || 0, msTotal: +(s.msTotal || 0).toFixed(1), msPerChunk: s.chunks ? +(s.msTotal / s.chunks).toFixed(2) : 0 } : null; },
    };
    // The sky's `lower` look (denser, cooler haze, no clouds over the basin) needs the region mix to carry a `lower`
    // weight; until game.js computes it natively this shim adds it to whatever regionMix returns (see lowerMix).
    if (typeof game.regionMix === 'function' && !game.regionMix.__lowerCity) {
      const orig = game.regionMix.bind(game);
      const wrapped = (x, z) => { const m = orig(x, z); m.lower = lowerMix(x, z); return m; };
      wrapped.__lowerCity = true;
      game.regionMix = wrapped;
    }
  }
}

// 0..1 weight of the lower-city atmosphere at a position: full over the basin, fading over the last 40 blocks of
// the plateau rim and over 120 blocks of sea beyond the wall.
export function lowerMix(x, z) {
  const dc = Math.max(Math.abs(x - 3000), Math.abs(z)) - 512;
  if (dc <= -40) return 0;
  if (dc <= 0) return (dc + 40) / 40;
  if (dc <= LOWER.reach) return 1;
  return Math.max(0, 1 - (dc - LOWER.reach) / 120);
}

// ------------------------------------------------------------------------------------------------ chunk fill
export function fillChunk(chunk) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS, blocks = chunk.blocks;
  for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
    const x = bx + lx, z = bz + lz;
    const loc = lowerLocal(x, z);
    if (!loc) continue;
    const col = (lx * CS + lz) * CH;
    const set = (y, id) => { if (y >= 0 && y < CH) blocks[col + y] = id; };
    paintColumn(set, loc);
  }
  paintObjects(chunk);
}

function paintColumn(set, loc) {
  const { side, d, v } = loc;
  const { band, r } = lowerBand(d);
  if (band === LOWER.levels.length) { paintWall(set, r, v); return; }
  const g = groundOf(band);
  const tv = trenchOf(v);
  if (tv !== null) { paintTrench(set, band, r, tv, g, d, v); return; }
  const cv = corridorOf(side, v);
  if (cv !== null) { paintCorridor(set, band, r, cv, g, d, v); return; }
  if (r < LC.faceW) { paintFace(set, side, band, r, g, d, v); return; }
  const rr0 = railR0(band);
  if (r >= rr0) { paintRail(set, band, r - rr0, g, d, v); return; }
  const row = Math.floor((r - LC.faceW) / LC.cell), j = Math.floor(v / LC.cell);
  paintCell(set, cellAt(side, band, row, j), d, v, r, g);
}

// The sea wall: walkway on top with railings both sides, a stripe course, blue beacons on the sea side.
function paintWall(set, r, v) {
  const top = LOWER.wallTop;
  if (r === 4) set(top, STR);
  if (r === 0 || r === 8) set(top + 1, BARS);
  if (r === 8) {
    if (mod(v, 32) === 0) { set(top + 1, DD); set(top + 2, DD); set(top + 3, BLUE); }
    if (mod(v, 16) === 8) set(top - 2, BLUE);
  }
}

// Freight trench: floor 10 below the terrace (conveyor on one side, container stacks on the other), slab stairs at
// the terrace steps, railed ledges with flush blue lane lights along both edges.
function paintTrench(set, band, r, tv, g, d, v) {
  const tf = trenchFloor(band);
  if (tf === null) { set(g, mod(d, 8) === 0 && (tv === -1 || tv === 0) ? BLUE : PLATE); return; }
  if (tv === -LC.trenchHalf - 1 || tv === LC.trenchHalf) {           // ledges
    set(g, mod(d, 8) === 0 ? BLUE : STR);
    set(g + 1, BARS);
    if (mod(d, 16) === 8) { set(g + 2, BARS); set(g + 3, LAMP); }
    if (mod(d, 16) === 0) set(g - 3, GLOW);                            // wall light facing the trench
    return;
  }
  // stairs: down to the next band's trench floor at this band's outer end, or the lower half of the stair coming
  // down from the previous band
  let s = null;
  if (band < LOWER.levels.length - 1) { const nf = trenchFloor(band + 1) ?? groundOf(band + 1); s = stepSurface(band, r, tf, nf, band); }
  if (s === null && band > 0) { const pf = trenchFloor(band - 1); if (pf !== null) s = stepSurface(band, r, pf, tf, band - 1); }
  for (let y = tf + 1; y <= g; y++) set(y, AIR);
  if (s !== null) { paintStep(set, s, tf); return; }
  set(tf, PLATE);
  if (tv === -LC.trenchHalf || tv === -LC.trenchHalf + 1) { set(tf, BLK); set(tf + 1, RAIL); }   // conveyor
  else if (tv >= LC.trenchHalf - 2 && mod(d, 6) <= 1) {                                          // container stacks
    const hs = hash2(Math.floor(d / 6), v - tv, 811 + band);
    if (hs < 0.6) {
      const id = hs < 0.2 ? CRATE : hs < 0.35 ? RED : hs < 0.5 ? D : DD;
      set(tf + 1, id); set(tf + 2, id);
      if (hash2(Math.floor(d / 6), v - tv, 812) < 0.3) set(tf + 3, id === CRATE ? D : CRATE);
    }
  }
}

// Service corridor: 4 wide, kerb stripes, flush blue lights, slab stairs (2 wide between solid parapets) down every
// terrace step. The stair tower to the rim stands on it at the plateau face (routes.js).
function paintCorridor(set, band, r, cv, g, d, v) {
  const last = LOWER.levels.length - 1;
  let s = null;
  if (band < last) s = stepSurface(band, r, g, groundOf(band + 1), band);
  if (s === null && band > 0) s = stepSurface(band, r, groundOf(band - 1), g, band - 1);
  if (s !== null) {
    if (cv === -2 || cv === 1) {                                        // parapets over the elevated half
      const top = Math.ceil(s);
      for (let y = g + 1; y <= top; y++) set(y, y === top ? STR : DD);
      if (top === g) set(g, STR);
      return;
    }
    paintStep(set, s, g);
    return;
  }
  set(g, cv === -2 || cv === 1 ? STR : (cv === -1 && mod(d, 8) === 0 ? BLUE : PLATE));
}

// One slab-stair column: walking surface s (multiples of 0.5); the cut above it is opened to the ground level and
// the space below is filled down to `base`.
function paintStep(set, s, base) {
  const L = Math.floor(s);
  const top = s === L ? L - 1 : L;
  for (let y = base + 1; y < top; y++) set(y, DD);
  set(top, s === L ? D : SLAB);
  for (let y = top + 1; y <= Math.max(base, top + 3); y++) set(y, AIR);
}

// Face strip at the foot of a terrace wall (the plateau face for band 0): conduits along the wall, vent boxes, flush
// blue lane lights, lamp posts, the odd container.
function paintFace(set, side, band, r, g, d, v) {
  const m = mod(v, 32);
  if (r === 0) {
    set(g, DD);
    if (m <= 1) { set(g + 1, VENT); set(g + 2, VENT); set(g + 3, VENT); }
    else { set(g + 3, CHR); set(g + 5, D); if (mod(v, 8) === 4) set(g + 4, BARS); }
    return;
  }
  if (r === 1 && m <= 1) { set(g + 1, VENT); set(g + 2, VENT); }
  set(g, r === 8 && mod(v, 8) === 0 ? BLUE : (hash2(d, v, 44 + side) < 0.06 ? VENT : PLATE));
  if (r === 9 && mod(v, 16) === 8) { set(g + 1, BARS); set(g + 2, BARS); set(g + 3, LAMP); }
  if ((r === 11 || r === 12) && (mod(v, 24) === 3 || mod(v, 24) === 4) && hash2(Math.floor(v / 24), band, 45 + side) < 0.5) {
    const id = hash2(Math.floor(v / 24), band, 46 + side) < 0.5 ? CRATE : D;
    set(g + 1, id);
    if (r === 11 && hash2(Math.floor(v / 24), band, 47 + side) < 0.4) set(g + 2, CRATE);
  }
}

// Rail deck along the terrace edge: kerb stripe (its outer face is the top course of the terrace wall), railing,
// lamps, and blue markers in the wall below for the lane along the lower terrace.
function paintRail(set, band, rr, g, d, v) {
  if (band === LOWER.levels.length - 1) { set(g, mod(v, 8) === 0 && rr === 2 ? BLUE : PLATE); return; }   // wall-foot deck
  set(g, rr === LC.railW - 1 ? STR : PLATE);
  if (rr === LC.railW - 1) {
    set(g + 1, BARS);
    if (mod(v, 16) === 0) { set(g + 2, BARS); set(g + 3, LAMP); }
    if (mod(v, 16) === 8) set(g - 2, BLUE);
  }
}

// ------------------------------------------------------------------------------------------------ cells
function paintCell(set, cell, d, v, r, g) {
  if (!inFoot(cell, d, v)) { paintAlley(set, cell, d, v, r, g); return; }
  const u = v - cell.fv0, t = r - cell.fr0, w = cell.fv1 - cell.fv0, dd = cell.fr1 - cell.fr0;
  switch (cell.kind) {
    case K.MASS: paintMass(set, cell, u, t, w, dd, g, d, v); break;
    case K.ROOM: paintRoom(set, cell, u, t, w, dd, g, d, v); break;
    case K.WELL: wellColumn(set, u, t, g, { collar: 3, cover: true, spiral: false, seed: cell.seed }); break;
    case K.YARD: paintYard(set, cell, u, t, g); break;
    default: paintPlaza(set, cell, u, t, w, dd, g);
  }
}

function paintAlley(set, cell, d, v, r, g) {
  const h = hash2(d, v, 40 + cell.side);
  set(g, h < 0.05 ? VENT : h < 0.55 ? DD : PLATE);
  if (cell.band === 0 && mod(v, 8) === 0 && mod(r, 8) === 4) set(g, BLUE);   // lane markers of the y 40 lane
  if (cell.kind === K.MASS || cell.kind === K.ROOM) {
    // conduits along the walls of the neighbouring mass
    const along = (v === cell.fv0 - 1 || v === cell.fv1) && r >= cell.fr0 && r < cell.fr1;
    const across = (r === cell.fr0 - 1 || r === cell.fr1) && v >= cell.fv0 && v < cell.fv1;
    if (along || across) { set(g + 3, CHR); if (mod(along ? r : v, 6) === 3) set(g + 2, BARS); if (hash2(d, v, 48) < 0.5) set(g + 5, D); }
  }
}

function paintMass(set, cell, u, t, w, dd, g, d, v) {
  const wall = WALL_BLOCK[cell.style], roof = cell.roof;
  const onV = u === 0 || u === w - 1, onT = t === 0 || t === dd - 1;
  const perimeter = onV || onT, corner = onV && onT;
  const cu = w >> 1, ct = dd >> 1;
  for (let y = g + 1; y <= roof; y++) {
    let id = DD;
    if (perimeter) {
      id = wall;
      if (corner) id = D;
      else if (y === roof) id = STR;
      else if (y <= g + 2) id = mod(u + t, 6) === 0 && y === g + 1 ? VENT : DD;
      else if ((y - g) % 4 === 0 && y < roof - 1) {
        const along = onT ? u : t;
        if (along % 3 === 1) id = hash3(v, y, d, cell.seed) < cell.lit ? WLIT : WDK;
      }
    }
    set(y, id);
  }
  if (perimeter) {
    set(roof + 1, D);                                                  // parapet
    if (!corner && ((onT && u === cu) || (onV && t === ct))) set(g + 2, BLUE);   // service light mid-face
    return;
  }
  const env = cell.env;
  if (Math.abs(u - cu) <= 1 && Math.abs(t - ct) <= 1 && roof + 2 <= env) { set(roof + 1, DD); set(roof + 2, u === cu && t === ct ? CHR : DD); }
  else if (cell.beacon && u === 2 && t === 2 && roof + 2 <= env) { set(roof + 1, BARS); set(roof + 2, NEON); }
  else if (u === w - 3 && t === 2 && roof + 1 <= env && hash2(cell.seed, 3, 49) < 0.6) set(roof + 1, VENT);
}

// Industrial room: steel-glass band all round at eye level, a lit hall inside with a chrome reactor core, pump
// blocks, consoles along the glass and a furnace row at the back; a doorway on the face side.
function paintRoom(set, cell, u, t, w, dd, g, d, v) {
  const wall = WALL_BLOCK[cell.style];
  const env = cell.env;
  const roof = Math.min(cell.roof, g + 9);
  const onV = u === 0 || u === w - 1, onT = t === 0 || t === dd - 1;
  const perimeter = onV || onT, corner = onV && onT;
  const cu = w >> 1, ct = dd >> 1;
  if (perimeter) {
    for (let y = g + 1; y <= roof; y++) {
      let id = wall;
      if (corner) id = D;
      else if (y >= g + 2 && y <= g + 4) id = GL;
      else if (y === roof) id = STR;
      set(y, id);
    }
    set(roof + 1, D);
    if (t === 0 && (u === cu - 1 || u === cu)) { set(g + 1, AIR); set(g + 2, AIR); set(g + 3, GLOW); }   // doorway
    return;
  }
  set(g, PLATE);
  for (let y = g + 1; y < roof; y++) set(y, AIR);
  set(roof, (u % 4 === 1 && t % 4 === 1) ? GLOW : DD);
  if (Math.abs(u - cu) <= 1 && Math.abs(t - ct) <= 1) {                // reactor core
    const ring = Math.abs(u - cu) === 1 || Math.abs(t - ct) === 1;
    for (let y = g + 1; y < roof; y++) set(y, ring && (y === g + 3 || y === g + 6) ? BLUE : CHR);
  } else if ((u === 2 || u === w - 3) && t % 5 === 2 && t > 1 && t < dd - 2) { set(g + 1, DD); set(g + 2, CHR); set(g + 3, CHR); }   // pumps + risers
  else if (t === 1 && u % 3 === 1 && u > 1 && u < w - 2) set(g + 1, CON);                                                       // consoles behind the glass
  else if (t === dd - 2 && u % 2 === 0 && u > 1 && u < w - 2) set(g + 1, FURN);                                                 // furnace row
  else if (t === 3 && (u === 1 || u === w - 2)) set(g + 1, CRATE);
  if (u === w - 3 && t === dd - 3) for (let y = roof + 1; y <= Math.min(roof + 3, env); y++) set(y, CHR);                        // stack
}

function paintYard(set, cell, u, t, g) {
  set(g, (u % 8 === 3 && t % 8 === 3) ? VENT : (hash2(u, t, cell.seed) < 0.5 ? PLATE : DD));
  if (u === 0 && t === 0) { set(g + 1, BARS); set(g + 2, BARS); set(g + 3, LAMP); return; }
  const bu = Math.floor(u / 5), bt = Math.floor(t / 5);
  if (u % 5 < 2 && t % 5 < 2 && u > 0 && t > 0) {
    const hs = hash2(bu + cell.seed, bt, 77);
    if (hs < 0.55) {
      const id = hs < 0.15 ? CRATE : hs < 0.28 ? RED : hs < 0.42 ? D : DD;
      set(g + 1, id); set(g + 2, id);
      if (hash2(bu, bt + cell.seed, 78) < 0.3) set(g + 3, id === CRATE ? DD : CRATE);
    }
  }
}

function paintPlaza(set, cell, u, t, w, dd, g) {
  set(g, (u % 6 === 0 && t % 6 === 0) ? BLUE : PLATE);
  const cu = w >> 1, ct = dd >> 1;
  if (u === cu && t === ct) { set(g + 1, BARS); set(g + 2, BARS); set(g + 3, HOLO); set(g + 4, LAMP); }
  else if ((u === 1 || u === w - 2) && (t === 1 || t === dd - 2)) { set(g + 1, BARS); set(g + 2, BARS); set(g + 3, LAMP); }
}
