// Coruscant: the lazy structure that paints the city chunk by chunk. Per chunk it classifies the 16x16 cells
// (lot / deck / margin / alley / rim / reserved), paints the undercity floor and its dressing, the mid-level
// boulevard decks with pillars, railings, lamps, holo posts and lane lights, the helix stairs and lift shafts at the
// intersections, plazas, gangways to the towers' mid-level doors, then copies the intersecting slice of every lot's
// blueprint and finally the skybridges (carving their openings into the towers). Everything is deterministic from
// the world seed (hash2/hash3 on world coordinates); the layout is computed once and indexed in 64-block buckets.
import { B } from '../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../constants.js';
import { hash2 } from '../rng.js';
import { getLayout, layoutToJSON, PLATEAU, SPACEPORT, LEVELS, DECK_HALF, MARGIN, RIM } from './layout.js';
import { blueprintFor, prewarmBlueprints } from './buildings.js';

const G = LEVELS.ground, DK = LEVELS.deck;
const T_ALLEY = 0, T_LOT = 1, T_DECK = 2, T_MARGIN = 3, T_RIM = 4, T_PORT = 5, T_PLAZA = 6, T_STAIR = 7;
const N = CS + 2;                       // cell mask with a one-cell apron for neighbour checks
const mask = new Uint8Array(N * N), deckN = new Uint8Array(N * N), doorCells = new Set();
const mod = (a, m) => ((a % m) + m) % m;

const metas = new Map();
let current = null;

export function register(gen, game) {
  const layout = getLayout(gen.seed);
  current = layout;
  prewarmBlueprints(layout);
  gen.addStructure({ name: 'coruscant', x0: PLATEAU.x0, z0: PLATEAU.z0, x1: PLATEAU.x1, z1: PLATEAU.z1, fill: (chunk) => fillChunk(chunk, layout) });
  if (game) game.coruscant = { layout, cityMeta, dumpLayout, timing: () => { const s = gen.structures.find((st) => st.name === 'coruscant'); return s ? { chunks: s.chunks || 0, msTotal: +(s.msTotal || 0).toFixed(1), msPerChunk: s.chunks ? +(s.msTotal / s.chunks).toFixed(2) : 0 } : null; } };
  console.log('[coruscant] layout: ' + JSON.stringify(layout.stats));
}

// Building records generated so far (blueprints emit their metadata once; see buildings.js for the shape).
export function cityMeta() { return [...metas.values()]; }
// JSON dump of the layout for the population system (rubric row 7). opts.meta adds the building records.
export function dumpLayout(opts = {}) {
  const layout = current || getLayout();
  return JSON.stringify({ ...layoutToJSON(layout, opts), buildings: opts.meta ? cityMeta() : undefined });
}

const inPort = (x, z) => x >= SPACEPORT.x0 && x < SPACEPORT.x1 && z >= SPACEPORT.z0 && z < SPACEPORT.z1;

function fillChunk(chunk, L) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS, blocks = chunk.blocks;
  if (bx >= SPACEPORT.x0 && bx + CS <= SPACEPORT.x1 && bz >= SPACEPORT.z0 && bz + CS <= SPACEPORT.z1) return;
  const mids = L._mids || (L._mids = L.boulevards.filter((s) => s.level === 'mid'));
  const ax0 = bx - 1, az0 = bz - 1;
  const lots = L.lotsIn(bx - 6, bz - 6, bx + CS + 6, bz + CS + 6);
  const district = L.districtAt(bx + 8, bz + 8);

  // ---------------------------------------------------------------- classify cells (apron included)
  mask.fill(T_ALLEY); deckN.fill(0);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = ax0 + i, z = az0 + j;
    if (x < PLATEAU.x0 || x >= PLATEAU.x1 || z < PLATEAU.z0 || z >= PLATEAU.z1 || inPort(x, z)) { mask[i * N + j] = T_PORT; continue; }
    if (x < PLATEAU.x0 + RIM || x >= PLATEAU.x1 - RIM || z < PLATEAU.z0 + RIM || z >= PLATEAU.z1 - RIM) mask[i * N + j] = T_RIM;
  }
  const segs = [];
  for (const s of mids) {
    const m = DECK_HALF + MARGIN;
    if (s.x1 + m <= ax0 || s.x0 - m >= ax0 + N || s.z1 + m <= az0 || s.z0 - m >= az0 + N) continue;
    segs.push(s);
    const px0 = s.axis === 'z' ? s.coord - m : s.x0, px1 = s.axis === 'z' ? s.coord + m : s.x1;
    const pz0 = s.axis === 'x' ? s.coord - m : s.z0, pz1 = s.axis === 'x' ? s.coord + m : s.z1;
    for (let x = Math.max(px0, ax0); x < Math.min(px1, ax0 + N); x++) for (let z = Math.max(pz0, az0); z < Math.min(pz1, az0 + N); z++) {
      const k = (x - ax0) * N + (z - az0);
      if (mask[k] === T_PORT) continue;
      const o = s.axis === 'x' ? z - s.coord : x - s.coord;
      if (o >= -DECK_HALF && o < DECK_HALF) { mask[k] = T_DECK; deckN[k]++; }
      else if (mask[k] !== T_DECK) mask[k] = T_MARGIN;
    }
  }
  for (const lot of lots) {
    const t = lot.kind === 'plaza' ? T_PLAZA : T_LOT;
    for (let x = Math.max(lot.x0, ax0); x < Math.min(lot.x1, ax0 + N); x++) for (let z = Math.max(lot.z0, az0); z < Math.min(lot.z1, az0 + N); z++) {
      const k = (x - ax0) * N + (z - az0);
      if (mask[k] !== T_PORT) mask[k] = t;
    }
  }
  const markFoot = (x0, z0, size) => {
    for (let x = Math.max(x0, ax0); x < Math.min(x0 + size, ax0 + N); x++) for (let z = Math.max(z0, az0); z < Math.min(z0 + size, az0 + N); z++) mask[(x - ax0) * N + (z - az0)] = T_STAIR;
  };
  for (const st of L.stairs) if (st.x0 < ax0 + N && st.x0 + 4 > ax0 && st.z0 < az0 + N && st.z0 + 4 > az0) markFoot(st.x0, st.z0, 4);
  for (const lf of L.lifts) if (lf.x0 < ax0 + N && lf.x0 + 2 > ax0 && lf.z0 < az0 + N && lf.z0 + 2 > az0) markFoot(lf.x0, lf.z0, 2);
  // cells in front of the ground doors (3 wide, 2 deep) stay clear of lamp posts and stalls
  doorCells.clear();
  for (const lot of lots) {
    if (lot.kind === 'plaza' || !lot.door) continue;
    const o = lot.door.out, alongX = o.z !== lot.door.z;
    for (let a = -1; a <= 1; a++) for (let b = 0; b <= 1; b++) {
      const x = alongX ? o.x + a : o.x + (o.x - lot.door.x) * b, z = alongX ? o.z + (o.z - lot.door.z) * b : o.z + a;
      if (x >= ax0 && x < ax0 + N && z >= az0 && z < az0 + N) doorCells.add((x - ax0) * N + (z - az0));
    }
  }
  const M = (x, z) => mask[(x - ax0) * N + (z - az0)];
  const nearDoor = (x, z) => doorCells.has((x - ax0) * N + (z - az0));
  const walkable = (t) => t === T_ALLEY || t === T_MARGIN || t === T_DECK || t === T_PLAZA;
  const stallP = district === 'market' ? 0.45 : district === 'entertainment' ? 0.12 : 0.05;

  // ---------------------------------------------------------------- undercity floor + dressing
  for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
    const x = bx + lx, z = bz + lz, t = M(x, z), col = (lx * CS + lz) * CH;
    if (t === T_PORT) continue;
    if (t === T_STAIR) { blocks[col + G] = B.DECK_PLATE; continue; }
    if (t === T_LOT || t === T_PLAZA) { blocks[col + G] = B.DURASTEEL_DARK; if (t === T_LOT) continue; }
    else if (t === T_DECK) blocks[col + G] = B.DURASTEEL_DARK;
    else if (t === T_MARGIN) blocks[col + G] = hash2(x, z, 90) < 0.08 ? B.DURASTEEL_DARK : B.DECK_PLATE;
    else if (t === T_RIM) {
      blocks[col + G] = B.DURASTEEL;
      const outer = x === PLATEAU.x0 || x === PLATEAU.x1 - 1 || z === PLATEAU.z0 || z === PLATEAU.z1 - 1;
      if (outer) { blocks[col + G + 1] = B.IRON_BARS; if (mod(x, 16) === 0 && mod(z, 16) === 0 || (mod(x, 16) === 0 && (z === PLATEAU.z0 || z === PLATEAU.z1 - 1)) || (mod(z, 16) === 0 && (x === PLATEAU.x0 || x === PLATEAU.x1 - 1))) { blocks[col + G + 2] = B.IRON_BARS; blocks[col + G + 3] = B.CITY_LAMP; } }
      continue;
    } else {
      const h = hash2(x, z, 91);
      blocks[col + G] = h < 0.04 ? B.VENT : h < 0.55 ? B.DURASTEEL_DARK : B.DECK_PLATE;
    }
    // lamp posts on a world grid, pipes and blue light boxes along the tower facades
    if (t !== T_DECK && mod(x, 8) === 3 && mod(z, 8) === 3 && !nearDoor(x, z)) { blocks[col + G + 1] = B.IRON_BARS; blocks[col + G + 2] = B.IRON_BARS; blocks[col + G + 3] = B.CITY_LAMP; }
    const facade = M(x - 1, z) === T_LOT || M(x + 1, z) === T_LOT || M(x, z - 1) === T_LOT || M(x, z + 1) === T_LOT;
    if (facade) {
      if (hash2(x >> 3, z >> 3, 92) < 0.6) blocks[col + G + 4] = B.IRON_BARS;
      if (hash2(x >> 3, z >> 3, 94) < 0.35) blocks[col + G + 7] = B.IRON_BARS;
      if (hash2(x >> 2, z >> 2, 93) < 0.12 && hash2(x, z, 96) < 0.5) blocks[col + G + 6] = B.GLOW_PANEL_BLUE;
    }
  }
  // market stalls (2x2 footprint anchored on a 6-block world grid; painted by every chunk the stall touches)
  for (let x = bx - 1; x < bx + CS + 1; x++) for (let z = bz - 1; z < bz + CS + 1; z++) {
    if (mod(x, 6) !== 0 || mod(z, 6) !== 0 || hash2(x, z, 95) >= stallP) continue;
    if (!walkable(M(x, z)) || !walkable(M(x + 1, z)) || !walkable(M(x, z + 1)) || !walkable(M(x + 1, z + 1))) continue;
    if (nearDoor(x, z) || nearDoor(x + 1, z) || nearDoor(x, z + 1) || nearDoor(x + 1, z + 1)) continue;
    if (M(x, z) === T_PLAZA && district !== 'market') continue;
    const wool = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL][Math.floor(hash2(x, z, 97) * 4)];
    for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) {
      const xx = x + dx, zz = z + dz;
      if (xx < bx || xx >= bx + CS || zz < bz || zz >= bz + CS) continue;
      const col = ((xx - bx) * CS + (zz - bz)) * CH;
      if (dz === 0) blocks[col + G + 1] = dx === 0 ? B.CRATE : B.BARREL;
      if (dx === 0 && dz === 1) { blocks[col + G + 1] = B.IRON_BARS; blocks[col + G + 2] = B.IRON_BARS; blocks[col + G + 3] = B.HOLO_SIGN; }
      blocks[col + G + 4] = wool;
      if (dx === 1 && dz === 1) blocks[col + G + 3] = B.GLOW_PANEL;
    }
  }

  // ---------------------------------------------------------------- boulevard decks
  for (const s of segs) {
    const ex0 = Math.max(s.x0, bx), ex1 = Math.min(s.x1, bx + CS), ez0 = Math.max(s.z0, bz), ez1 = Math.min(s.z1, bz + CS);
    if (ex0 >= ex1 || ez0 >= ez1) continue;
    const t0 = s.axis === 'x' ? s.x0 : s.z0, t1 = s.axis === 'x' ? s.x1 : s.z1;
    for (let x = ex0; x < ex1; x++) for (let z = ez0; z < ez1; z++) {
      const k = (x - ax0) * N + (z - az0);
      if (mask[k] !== T_DECK) continue;
      const o = s.axis === 'x' ? z - s.coord : x - s.coord, t = s.axis === 'x' ? x : z;
      const col = ((x - bx) * CS + (z - bz)) * CH, cross = deckN[k] > 1;
      blocks[col + DK - 1] = B.DURASTEEL_DARK;
      if (o === -1 || o === 0) blocks[col + G] = B.DECK_PLATE;                     // service lane on the undercity floor
      else if (hash2(x, z, 98) < 0.04) blocks[col + G] = B.VENT;
      if (cross) blocks[col + DK] = (o === -DECK_HALF || o === DECK_HALF - 1) && hash2(x, z, 99) < 0.5 ? B.CHROME : B.DURASTEEL_DARK;
      else if (o === -DECK_HALF || o === DECK_HALF - 1) {
        blocks[col + DK] = B.PANEL_STRIPE; blocks[col + DK + 1] = B.IRON_BARS;      // kerb + railing
        if (mod(t, 12) === 6) { blocks[col + DK + 2] = B.IRON_BARS; blocks[col + DK + 3] = B.CITY_LAMP; }
      } else if (o <= -4 || o >= 3) {
        blocks[col + DK] = B.DURASTEEL;                                              // sidewalks
        if ((o === -5 || o === 4) && mod(t, 32) === 16) { blocks[col + DK + 1] = B.IRON_BARS; blocks[col + DK + 2] = B.IRON_BARS; blocks[col + DK + 3] = B.HOLO_SIGN; blocks[col + DK + 4] = B.HOLO_SIGN; }
      } else {
        let id = B.DURASTEEL_DARK;                                                   // speeder lanes
        if ((o === -1 || o === 0) && mod(t, 6) < 3) id = B.CHROME;
        if ((o === -3 || o === 2) && mod(t, 16) === 8) id = B.GLOW_PANEL_BLUE;
        blocks[col + DK] = id;
      }
      if (!cross && (t === t0 || t === t1 - 1)) blocks[col + DK + 1] = B.IRON_BARS;  // dead-end railing at the rim
      // pillars every 16 blocks under the deck edges, blue light strips under the deck
      if ((o <= -5 || o >= 4) && mod(t, 16) <= 1) {
        for (let y = G + 1; y < DK - 1; y++) blocks[col + y] = B.DURASTEEL_DARK;
        blocks[col + G + 1] = B.VENT; blocks[col + G + 2] = B.VENT; blocks[col + G + 12] = B.GLOW_PANEL_BLUE; blocks[col + G + 24] = B.GLOW_PANEL_BLUE;
      } else if ((o === -3 || o === 2) && mod(t, 8) === 4) blocks[col + DK - 2] = B.GLOW_PANEL_BLUE;
    }
  }

  // ---------------------------------------------------------------- gangways from the decks to the mid-level doors
  for (const lot of lots) {
    if (!lot.midDoor || lot.kind === 'plaza') continue;
    const dr = lot.door, side = dr.side;
    const gx0 = side === 'W' ? lot.x0 - MARGIN : side === 'E' ? lot.x1 : dr.x - 1, gx1 = side === 'W' ? lot.x0 : side === 'E' ? lot.x1 + MARGIN : dr.x + 3;
    const gz0 = side === 'N' ? lot.z0 - MARGIN : side === 'S' ? lot.z1 : dr.z - 1, gz1 = side === 'N' ? lot.z0 : side === 'S' ? lot.z1 + MARGIN : dr.z + 3;
    const alongX = side === 'N' || side === 'S';
    for (let x = Math.max(gx0, bx); x < Math.min(gx1, bx + CS); x++) for (let z = Math.max(gz0, bz); z < Math.min(gz1, bz + CS); z++) {
      const t = M(x, z);
      if (t !== T_MARGIN && t !== T_ALLEY) continue;
      const col = ((x - bx) * CS + (z - bz)) * CH;
      const edge = alongX ? (x === gx0 || x === gx1 - 1) : (z === gz0 || z === gz1 - 1);
      blocks[col + DK - 1] = B.DURASTEEL_DARK; blocks[col + DK] = B.DECK_PLATE;
      if (edge) blocks[col + DK + 1] = B.IRON_BARS;
      const far = side === 'W' ? x === gx0 : side === 'E' ? x === gx1 - 1 : side === 'N' ? z === gz0 : z === gz1 - 1;
      if (edge && far && (alongX ? x === gx0 : z === gz0)) { blocks[col + DK + 2] = B.IRON_BARS; blocks[col + DK + 3] = B.CITY_LAMP; }
    }
    // open the deck kerb railing in front of the gangway
    const kx = side === 'W' ? lot.x0 - MARGIN - 1 : side === 'E' ? lot.x1 + MARGIN : 0, kz = side === 'N' ? lot.z0 - MARGIN - 1 : side === 'S' ? lot.z1 + MARGIN : 0;
    for (let k = 0; k < 2; k++) {
      const x = alongX ? dr.x + k : kx, z = alongX ? kz : dr.z + k;
      if (x < bx || x >= bx + CS || z < bz || z >= bz + CS || M(x, z) !== T_DECK) continue;
      blocks[((x - bx) * CS + (z - bz)) * CH + DK + 1] = B.AIR;
    }
  }

  // ---------------------------------------------------------------- helix stairs + lift shafts at the intersections
  for (const st of L.stairs) {
    if (st.x0 + 4 <= bx || st.x0 >= bx + CS || st.z0 + 4 <= bz || st.z0 >= bz + CS) continue;
    paintHelix(blocks, bx, bz, st);
  }
  for (const lf of L.lifts) {
    if (lf.x0 + 2 <= bx || lf.x0 >= bx + CS || lf.z0 + 2 <= bz || lf.z0 >= bz + CS) continue;
    const fx = lf.sx > 0 ? lf.x0 : lf.x0 + 1;
    for (let x = lf.x0; x < lf.x0 + 2; x++) for (let z = lf.z0; z < lf.z0 + 2; z++) {
      if (x < bx || x >= bx + CS || z < bz || z >= bz + CS) continue;
      const col = ((x - bx) * CS + (z - bz)) * CH;
      for (let y = G + 1; y <= DK + 4; y++) blocks[col + y] = B.PANEL_BLACK;
      if (x === fx) { blocks[col + G + 2] = B.GLOW_PANEL_BLUE; blocks[col + DK + 2] = B.GLOW_PANEL_BLUE; }
      blocks[col + DK + 5] = B.CHROME;
    }
  }

  // ---------------------------------------------------------------- plazas (open decks with planters and a fountain)
  for (const lot of lots) {
    if (lot.kind !== 'plaza') continue;
    const cxp = (lot.w - 1) / 2, czp = (lot.d - 1) / 2;
    for (let x = Math.max(lot.x0, bx); x < Math.min(lot.x1, bx + CS); x++) for (let z = Math.max(lot.z0, bz); z < Math.min(lot.z1, bz + CS); z++) {
      const u = x - lot.x0, v = z - lot.z0, col = ((x - bx) * CS + (z - bz)) * CH;
      blocks[col + DK - 1] = B.DURASTEEL_DARK;
      const ring = Math.min(u, v, lot.w - 1 - u, lot.d - 1 - v);
      blocks[col + DK] = ring === MARGIN || ring === MARGIN + 1 ? B.CHROME : (u % 6 === 0 || v % 6 === 0 ? B.DECK_PLATE : B.DURASTEEL);
      const r = Math.hypot(u - cxp, v - czp);
      if (r <= 3.6) { blocks[col + DK] = B.CHROME; blocks[col + DK + 1] = r > 2.6 ? B.CHROME : B.WATER; if (r < 0.8) { blocks[col + DK + 1] = B.CHROME; blocks[col + DK + 2] = B.CHROME; blocks[col + DK + 3] = B.GLOW_PANEL; } }
      // planters on a 12-block lattice (skipped near the fountain), with bushes and small trees
      const pu = mod(u - 4, 12), pv = mod(v - 4, 12);
      if (pu < 4 && pv < 4 && ring >= MARGIN + 2 && Math.hypot(u - pu + 1.5 - cxp, v - pv + 1.5 - czp) > 8) {
        const inner = pu >= 1 && pu <= 2 && pv >= 1 && pv <= 2;
        blocks[col + DK + 1] = inner ? B.GRASS : B.DURASTEEL_DARK;
        if (inner) {
          const tree = hash2(x - pu, z - pv, 100) < 0.5;
          if (tree && pu === 1 && pv === 1) { for (let y = 2; y <= 4; y++) blocks[col + DK + y] = B.SPRUCE_LOG; }
          else if (!tree) blocks[col + DK + 2] = B.OAK_LEAVES;
        }
        if (hash2(x - pu, z - pv, 100) < 0.5 && Math.abs(pu - 1) <= 1 && Math.abs(pv - 1) <= 1 && !(pu === 1 && pv === 1)) { blocks[col + DK + 4] = B.SPRUCE_LEAVES; blocks[col + DK + 5] = B.SPRUCE_LEAVES; }
        if (hash2(x - pu, z - pv, 100) < 0.5 && pu === 1 && pv === 1) { blocks[col + DK + 5] = B.SPRUCE_LEAVES; blocks[col + DK + 6] = B.SPRUCE_LEAVES; }
      }
      if (pu === 5 && (pv === 1 || pv === 2) && ring >= MARGIN + 2) blocks[col + DK + 1] = B.STONE_BRICK_SLAB;   // benches beside the planters
      if (pu === 10 && pv === 10 && ring >= MARGIN + 1) { blocks[col + DK + 1] = B.IRON_BARS; blocks[col + DK + 2] = B.IRON_BARS; blocks[col + DK + 3] = B.CITY_LAMP; }
      if (ring === MARGIN + 3 && u === MARGIN + 3 && v % 9 === 4) { blocks[col + DK + 1] = B.IRON_BARS; blocks[col + DK + 2] = B.HOLO_SIGN; blocks[col + DK + 3] = B.HOLO_SIGN; }
      // pillars carrying the deck, lit in blue
      if (mod(u, 12) >= 6 && mod(u, 12) <= 7 && mod(v, 12) >= 6 && mod(v, 12) <= 7) {
        for (let y = G + 1; y < DK - 1; y++) blocks[col + y] = B.DURASTEEL_DARK;
        blocks[col + G + 12] = B.GLOW_PANEL_BLUE; blocks[col + G + 24] = B.GLOW_PANEL_BLUE;
      }
    }
  }

  // ---------------------------------------------------------------- buildings: copy the intersecting blueprint slices
  for (const lot of lots) {
    if (lot.kind === 'plaza') continue;
    const x0 = Math.max(lot.x0, bx), x1 = Math.min(lot.x1, bx + CS), z0 = Math.max(lot.z0, bz), z1 = Math.min(lot.z1, bz + CS);
    if (x0 >= x1 || z0 >= z1) continue;
    const bp = blueprintFor(lot, L);
    if (!metas.has(lot.id)) metas.set(lot.id, bp.meta);
    const h = bp.h, y0 = bp.y0, src = bp.blocks, hmax = Math.min(h, CH - y0), bd = bp.d;
    for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
      const sb = ((x - lot.x0) * bd + (z - lot.z0)) * h, db = ((x - bx) * CS + (z - bz)) * CH + y0;
      for (let y = 0; y < hmax; y++) { const v = src[sb + y]; if (v !== 0) blocks[db + y] = v === 255 ? B.AIR : v; }
    }
  }

  // ---------------------------------------------------------------- skybridges (glass tubes) + openings into the towers
  for (const br of L.bridgesIn(bx - 1, bz - 1, bx + CS + 1, bz + CS + 1)) {
    const y = br.y;
    for (let x = Math.max(br.x0, bx); x < Math.min(br.x1, bx + CS); x++) for (let z = Math.max(br.z0, bz); z < Math.min(br.z1, bz + CS); z++) {
      const edge = br.axis === 'x' ? (z === br.z0 || z === br.z1 - 1) : (x === br.x0 || x === br.x1 - 1);
      const col = ((x - bx) * CS + (z - bz)) * CH;
      blocks[col + y] = B.DECK_PLATE;
      blocks[col + y + 1] = edge ? B.STEEL_GLASS : B.AIR; blocks[col + y + 2] = edge ? B.STEEL_GLASS : B.AIR;
      blocks[col + y + 3] = edge ? B.DURASTEEL_DARK : B.GLOW_PANEL;
    }
    const ends = br.axis === 'x' ? [[br.x0 - 1, 0], [br.x1, 0]] : [[0, br.z0 - 1], [0, br.z1]];
    for (const [ex, ez] of ends) {
      for (let k = 1; k <= 3; k++) {
        const x = br.axis === 'x' ? ex : br.x0 + k, z = br.axis === 'x' ? br.z0 + k : ez;
        if (x < bx || x >= bx + CS || z < bz || z >= bz + CS) continue;
        const col = ((x - bx) * CS + (z - bz)) * CH;
        blocks[col + y + 1] = B.AIR; blocks[col + y + 2] = B.AIR;
        if (blocks[col + y] === B.AIR) blocks[col + y] = B.DECK_PLATE;
      }
    }
  }
}

// Open helix stair in a 4x4 footprint: slab/full steps (0.5 rise each) spiralling around a 2x2 core from the
// undercity (feet 61) to the deck (feet 96); the last step lands next to the deck kerb, whose railing is opened.
function paintHelix(blocks, bx, bz, st) {
  const x0 = st.x0, z0 = st.z0;
  const ring = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];
  const endX = st.sx > 0 ? 0 : 3, endZ = st.sz > 0 ? 0 : 3;
  const e = ring.findIndex(([u, v]) => u === endX && v === endZ);
  const steps = (LEVELS.midWalk - LEVELS.underWalk) * 2;         // 70 half-steps
  const start = mod(e - steps, 12);
  const inChunk = (x, z) => x >= bx && x < bx + CS && z >= bz && z < bz + CS;
  const colOf = (x, z) => ((x - bx) * CS + (z - bz)) * CH;
  for (let k = 1; k <= steps; k++) {
    const [u, v] = ring[(start + k) % 12];
    const x = x0 + u, z = z0 + v;
    if (!inChunk(x, z)) continue;
    const col = colOf(x, z);
    if (k % 2 === 0) blocks[col + G + k / 2] = B.DURASTEEL;
    else blocks[col + G + (k + 1) / 2] = B.STONE_BRICK_SLAB;
  }
  for (let u = 1; u <= 2; u++) for (let v = 1; v <= 2; v++) {
    const x = x0 + u, z = z0 + v;
    if (!inChunk(x, z)) continue;
    const col = colOf(x, z);
    for (let y = G + 1; y <= DK + 3; y++) blocks[col + y] = B.PANEL_BLACK;
    blocks[col + DK + 3] = B.GLOW_PANEL_BLUE;
  }
  for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) { const x = x0 + u, z = z0 + v; if (inChunk(x, z)) blocks[colOf(x, z) + DK + 4] = B.DURASTEEL; }
  // open the kerb railings next to the landing
  const kerbs = [[x0 + endX + (st.sx > 0 ? -1 : 1), z0 + endZ], [x0 + endX, z0 + endZ + (st.sz > 0 ? -1 : 1)]];
  for (const [x, z] of kerbs) if (inChunk(x, z)) blocks[colOf(x, z) + DK + 1] = B.AIR;
}
