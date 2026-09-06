// Far-LOD tile builder (pure, no three.js): one 256 x 256-block tile = a 64 x 64 heightmap of 4-block cells sampled
// from the worldgen's column sampler (`heightInfo`, never a chunk), plus a skirt down to below sea level along the
// four edges so an unbuilt neighbour tile never shows sky. Vertices carry a colour (the surface block's colour,
// darker under forests, depth-tinted water) and a normal from the height gradient; the layout is fixed per tile
// (VERTS_PER_TILE / INDICES_PER_TILE) so tiles can be written into slots of one pooled geometry (render/farlod.js).
//
// The far layer is a picture of the generator's world only: player edits and disaster damage never reach it (they
// live in chunks, which cover the near ring and always win the depth test where both exist).
import { B, BLOCKS } from '../../blocks.js';
import { SEA_LEVEL, CHUNK_SIZE } from '../../constants.js';
import { hash2 } from '../../rng.js';
import { tileBasePixels, tileCount } from '../../textures.js';

export const TILE = 256;                 // blocks per tile side
export const CELL = 4;                   // blocks per heightmap cell
export const N = TILE / CELL;            // 64 cells per side
export const GRID = N + 1;               // 65 vertices per side
export const SKIRT_Y = SEA_LEVEL - 12;   // skirt bottom: under the ocean floor (SEA_LEVEL - 9 +- 3)
export const SURFACE_DROP = 0.5;         // the far surface sits this far below the chunk's top face: chunks win the depth test
export const VERTS_PER_TILE = GRID * GRID + 4 * GRID;      // 4225 grid + 260 skirt = 4485
export const INDICES_PER_TILE = N * N * 6 + 4 * N * 6;    // 24576 grid + 1536 skirt = 26112
export const BYTES_PER_VERT = 12 + 4 + 3;                  // float32 xyz + rgba8 + int8 normal
export const TILE_BYTES = VERTS_PER_TILE * BYTES_PER_VERT + INDICES_PER_TILE * 4;   // CPU-side copy; the GPU holds the same again

export const tileKey = (tx, tz) => tx * 65536 + tz;
export const tileOf = (v) => Math.floor(v / TILE);

// ------------------------------------------------------------------------------------------------ colours
// Fallback top colours (0..255) for every block the surface decision below can return, used when the texture atlas
// has not been built (node tests) - in the browser the average of the block's top tile is taken instead.
export const COLOR_TABLE = {
  [B.GRASS]: [109, 168, 66], [B.SAND]: [219, 206, 158], [B.STONE]: [125, 125, 125], [B.GRAVEL]: [136, 126, 126],
  [B.SNOW]: [240, 246, 250], [B.DIRT]: [134, 96, 67], [B.COARSE_DIRT]: [119, 85, 59], [B.SMOOTH_STONE]: [160, 160, 160],
  [B.WATER]: [52, 96, 160], [B.SANDSTONE]: [216, 203, 155], [B.MUD]: [80, 65, 50], [B.DIRT_PATH]: [150, 122, 78],
  [B.COBBLESTONE]: [118, 118, 118], [B.BEDROCK]: [70, 70, 70],
};
// Surface blocks the far layer can produce (kept in sync with surfaceBlockFor; the test checks the table covers them).
export const SURFACE_BLOCKS = [B.GRASS, B.SAND, B.STONE, B.GRAVEL, B.SNOW, B.DIRT, B.COARSE_DIRT, B.SMOOTH_STONE, B.WATER];
const WATER_SHALLOW = [58, 118, 168], WATER_DEEP = [22, 58, 128];

const colorCache = new Map();
let useAtlas = true;
// Tests without an atlas (or tools wanting the table look) can pin the source; default: atlas when available.
export function setColorSource(source) { useAtlas = source !== 'table'; colorCache.clear(); }

// Average colour (0..255) of a block's top tile, from the painted 16 x 16 base pixels when the atlas exists.
export function blockColor(id) {
  let c = colorCache.get(id);
  if (c) return c;
  c = null;
  const def = BLOCKS[id];
  if (useAtlas && def && def.tex && tileCount() > 0) {
    const px = tileBasePixels(def.tex[2]);
    if (px && px.length >= 4) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 128) continue; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
      if (n > 0) c = [r / n, g / n, b / n];
    }
  }
  if (!c) c = COLOR_TABLE[id] || COLOR_TABLE[B.STONE];
  colorCache.set(id, c);
  return c;
}

// ------------------------------------------------------------------------------------------------ surface
// Top block of a column, mirroring the surface choice of WorldGen.generateChunk (biome, patch noise, shore sand)
// through the generator's own samplers (biomeAt, nPatch); heights and masks come from heightInfo. Returns -1 for the
// void (space region) and B.WATER for columns under the sea.
export function surfaceBlockFor(gen, info, x, z) {
  if (info.region === 'space') return -1;
  const h = info.h;
  if (h < SEA_LEVEL) return B.WATER;
  if (info.region === 'coruscant' && info.regionT >= 0.999) return B.SMOOTH_STONE;
  const biome = gen.biomeAt(info, x, z);
  const patch = gen.nPatch.noise2(x * 0.06, z * 0.06);
  let surface = B.GRASS;
  if (biome === 'mountain') {
    if (h > 96) surface = B.SNOW;
    else surface = patch > 0.45 ? B.GRAVEL : B.STONE;
    if (h < 84 && patch < -0.3) surface = B.GRASS;
  } else if (biome === 'dry') {
    surface = patch > 0.55 ? B.COARSE_DIRT : B.SAND;
  } else if (patch > 0.68 && info.town < 0.3) surface = B.GRAVEL;
  else if (patch < -0.72 && info.town < 0.3) surface = B.COARSE_DIRT;
  if (h <= SEA_LEVEL + 1 && info.town < 0.5) surface = B.SAND;
  return surface;
}

// Forest darkening: the generator plants dense trees where moisture > 0.18 ('forest' biome); the far layer has no
// trees, so the canopy reads as a darker green instead. 1 = untouched, ~0.68 = deep forest.
export function forestTint(info) {
  const m = info.moisture;
  const k = m <= 0.08 ? 0 : m >= 0.3 ? 1 : (m - 0.08) / 0.22;
  return 1 - 0.32 * k * k * (3 - 2 * k);
}

// ------------------------------------------------------------------------------------------------ geometry
// Winding helper: writes the two triangles of quad (a, b, c, d) so their normal points along `outward`.
function quad(idx, at, a, b, c, d, pos, ox, oy, oz) {
  const ax = pos[a * 3] - pos[b * 3], ay = pos[a * 3 + 1] - pos[b * 3 + 1], az = pos[a * 3 + 2] - pos[b * 3 + 2];
  const cx = pos[c * 3] - pos[b * 3], cy = pos[c * 3 + 1] - pos[b * 3 + 1], cz = pos[c * 3 + 2] - pos[b * 3 + 2];
  // normal of triangle (b, c, a) as three.js sees it: cross(c - b, a - b)
  const nx = cy * az - cz * ay, ny = cz * ax - cx * az, nz = cx * ay - cy * ax;
  if (nx * ox + ny * oy + nz * oz >= 0) { idx[at] = b; idx[at + 1] = c; idx[at + 2] = a; idx[at + 3] = c; idx[at + 4] = d; idx[at + 5] = a; }
  else { idx[at] = b; idx[at + 1] = a; idx[at + 2] = c; idx[at + 3] = c; idx[at + 4] = a; idx[at + 5] = d; }
  return at + 6;
}

// Incremental builder: `step(budgetMs)` samples rows of the height grid until the budget is spent and returns true
// once the tile's vertices and indices have been written into `target` at (vBase, iBase). Index values are absolute
// vertex indices of the target arrays, so a pool slot at vBase = slot * VERTS_PER_TILE needs no fix-up.
export class TileBuilder {
  constructor(gen, tx, tz, target, { evictCache = true } = {}) {
    this.gen = gen; this.tx = tx; this.tz = tz;
    this.x0 = tx * TILE; this.z0 = tz * TILE;
    this.target = target;
    this.evictCache = evictCache;
    const S = GRID + 2;                 // one extra ring of samples for the normals
    this.S = S;
    this.h = new Float32Array(S * S);   // vertex height (top face y - drop; water: sea surface)
    this.kind = new Uint8Array(S * S);  // 0 land, 1 water, 2 void
    this.rgb = new Uint8Array(S * S * 3);
    this.row = 0;
    this.done = false;
    this.stats = { land: 0, water: 0, voidCells: 0, cells: 0, minY: Infinity, maxY: -Infinity, ms: 0 };
  }

  // one row of the (GRID + 2)^2 sample grid; row r covers world z = z0 + (r - 1) * CELL
  sampleRow(r) {
    const gen = this.gen, S = this.S, z = this.z0 + (r - 1) * CELL;
    const cache = gen.heightCache;
    for (let c = 0; c < S; c++) {
      const x = this.x0 + (c - 1) * CELL;
      const key = x * 100003 + z;
      const had = cache ? cache.has(key) : true;
      const info = gen.heightInfo(x, z);
      if (this.evictCache && cache && !had) cache.delete(key);   // keep the generator's column cache for the near ring
      const i = r * S + c;
      const sb = surfaceBlockFor(gen, info, x, z);
      if (sb < 0) { this.kind[i] = 2; this.h[i] = SKIRT_Y; continue; }
      if (sb === B.WATER) {
        this.kind[i] = 1;
        this.h[i] = SEA_LEVEL + 1 - SURFACE_DROP;
        const depth = SEA_LEVEL - info.h;
        const t = Math.max(0, Math.min(1, (depth - 1) / 7));
        this.rgb[i * 3] = WATER_SHALLOW[0] + (WATER_DEEP[0] - WATER_SHALLOW[0]) * t;
        this.rgb[i * 3 + 1] = WATER_SHALLOW[1] + (WATER_DEEP[1] - WATER_SHALLOW[1]) * t;
        this.rgb[i * 3 + 2] = WATER_SHALLOW[2] + (WATER_DEEP[2] - WATER_SHALLOW[2]) * t;
        continue;
      }
      this.kind[i] = 0;
      this.h[i] = info.h + 1 - SURFACE_DROP;
      const col = blockColor(sb);
      // forests darken the grass; a little deterministic per-column variation keeps big meadows from banding
      let tint = sb === B.GRASS ? forestTint(info) : 1;
      tint *= 0.96 + 0.08 * hash2(x, z, 913);
      this.rgb[i * 3] = Math.min(255, col[0] * tint);
      this.rgb[i * 3 + 1] = Math.min(255, col[1] * tint);
      this.rgb[i * 3 + 2] = Math.min(255, col[2] * tint);
    }
  }

  step(budgetMs = 2) {
    if (this.done) return true;
    const t0 = performance.now();
    while (this.row < this.S) {
      this.sampleRow(this.row++);
      if (performance.now() - t0 > budgetMs) break;
    }
    if (this.row >= this.S) { this.emit(); this.done = true; }
    this.stats.ms += performance.now() - t0;
    return this.done;
  }

  // Writes vertices, normals, colours and indices for the whole tile.
  emit() {
    const { pos, col, nrm, idx, vBase = 0, iBase = 0 } = this.target;
    const S = this.S, h = this.h, kind = this.kind, rgb = this.rgb, st = this.stats;
    const x0 = this.x0, z0 = this.z0;
    const V = (i, j) => i * GRID + j;                     // grid vertex (i along x, j along z)
    let v = vBase;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      const s = (j + 1) * S + (i + 1);
      const y = h[s];
      pos[v * 3] = x0 + i * CELL; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z0 + j * CELL;
      col[v * 4] = rgb[s * 3]; col[v * 4 + 1] = rgb[s * 3 + 1]; col[v * 4 + 2] = rgb[s * 3 + 2]; col[v * 4 + 3] = kind[s] === 1 ? 0 : 255;
      // normal from the central height difference (void neighbours fall back to the vertex itself)
      const hl = kind[s - 1] === 2 ? y : h[s - 1], hr = kind[s + 1] === 2 ? y : h[s + 1];
      const hd = kind[s - S] === 2 ? y : h[s - S], hu = kind[s + S] === 2 ? y : h[s + S];
      let nx = (hl - hr) / (2 * CELL), nz = (hd - hu) / (2 * CELL), ny = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nrm[v * 3] = Math.round(nx / len * 127); nrm[v * 3 + 1] = Math.round(ny / len * 127); nrm[v * 3 + 2] = Math.round(nz / len * 127);
      if (kind[s] !== 2) { if (y < st.minY) st.minY = y; if (y > st.maxY) st.maxY = y; if (kind[s] === 1) st.water++; else st.land++; }
      v++;
    }
    // skirt vertices: copies of the edge vertices dropped to SKIRT_Y, darker, with an outward horizontal normal
    const skirtBase = vBase + GRID * GRID;
    const edges = [
      { n: [0, 0, -1], at: (k) => V(k, 0) },           // -z edge
      { n: [0, 0, 1], at: (k) => V(k, N) },            // +z edge
      { n: [-1, 0, 0], at: (k) => V(0, k) },           // -x edge
      { n: [1, 0, 0], at: (k) => V(N, k) },            // +x edge
    ];
    for (let e = 0; e < 4; e++) {
      const ed = edges[e];
      for (let k = 0; k < GRID; k++) {
        const src = vBase + ed.at(k), dst = skirtBase + e * GRID + k;
        pos[dst * 3] = pos[src * 3]; pos[dst * 3 + 1] = SKIRT_Y; pos[dst * 3 + 2] = pos[src * 3 + 2];
        col[dst * 4] = col[src * 4] * 0.55; col[dst * 4 + 1] = col[src * 4 + 1] * 0.55; col[dst * 4 + 2] = col[src * 4 + 2] * 0.55; col[dst * 4 + 3] = 255;
        nrm[dst * 3] = ed.n[0] * 127; nrm[dst * 3 + 1] = 0; nrm[dst * 3 + 2] = ed.n[2] * 127;
      }
    }
    // indices: grid cells (skipping any cell touching the void), then the skirt quads
    let at = iBase;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      st.cells++;
      const a = vBase + V(i, j), b = vBase + V(i + 1, j), c = vBase + V(i + 1, j + 1), d = vBase + V(i, j + 1);
      const sa = (j + 1) * S + (i + 1);
      if (kind[sa] === 2 || kind[sa + 1] === 2 || kind[sa + S] === 2 || kind[sa + S + 1] === 2) { st.voidCells++; continue; }
      at = quad(idx, at, a, b, c, d, pos, 0, 1, 0);
    }
    for (let e = 0; e < 4; e++) {
      const ed = edges[e];
      for (let k = 0; k < N; k++) {
        const e0 = vBase + ed.at(k), e1 = vBase + ed.at(k + 1);
        const s0 = skirtBase + e * GRID + k, s1 = s0 + 1;
        const ke0 = (e < 2 ? (e === 0 ? 1 : GRID) * S + (k + 1) : (k + 1) * S + (e === 2 ? 1 : GRID));
        const ke1 = (e < 2 ? (e === 0 ? 1 : GRID) * S + (k + 2) : (k + 2) * S + (e === 2 ? 1 : GRID));
        if (kind[ke0] === 2 || kind[ke1] === 2) continue;
        at = quad(idx, at, e0, e1, s1, s0, pos, ed.n[0], 0, ed.n[2]);
      }
    }
    // unused index slots (void cells) collapse onto one vertex: degenerate triangles draw nothing
    for (; at < iBase + INDICES_PER_TILE; at++) idx[at] = vBase;
    // release the sampling scratch
    this.h = null; this.kind = null; this.rgb = null;
  }
}

// Fresh typed arrays for one tile (tests, tools).
export function allocTileTarget() {
  return { pos: new Float32Array(VERTS_PER_TILE * 3), col: new Uint8Array(VERTS_PER_TILE * 4), nrm: new Int8Array(VERTS_PER_TILE * 3), idx: new Uint32Array(INDICES_PER_TILE), vBase: 0, iBase: 0 };
}

// Builds one tile synchronously; returns { pos, col, nrm, idx, stats }.
export function buildTile(gen, tx, tz, opts = {}) {
  const target = allocTileTarget();
  const b = new TileBuilder(gen, tx, tz, target, opts);
  while (!b.step(1e9)) { /* single pass */ }
  return { ...target, stats: b.stats };
}

// ------------------------------------------------------------------------------------------------ coverage
// Tiles the far layer needs around (px, pz): every tile whose nearest point lies within `farRadius`, except those
// lying entirely inside the near cull radius by `skipMargin` (there, the full chunks are all meshed). Sorted
// nearest-first. Each entry: { tx, tz, key, dNear, dFar } (block distances from the player to the tile's AABB).
export function tilesNeeded(px, pz, farRadius, nearCull = 0, skipMargin = 48) {
  const out = [];
  const t0x = tileOf(px - farRadius), t1x = tileOf(px + farRadius), t0z = tileOf(pz - farRadius), t1z = tileOf(pz + farRadius);
  for (let tx = t0x; tx <= t1x; tx++) for (let tz = t0z; tz <= t1z; tz++) {
    const x0 = tx * TILE, z0 = tz * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
    const dx = Math.max(x0 - px, 0, px - x1), dz = Math.max(z0 - pz, 0, pz - z1);
    const dNear = Math.sqrt(dx * dx + dz * dz);
    if (dNear > farRadius) continue;
    const fx = Math.max(Math.abs(px - x0), Math.abs(px - x1)), fz = Math.max(Math.abs(pz - z0), Math.abs(pz - z1));
    const dFar = Math.sqrt(fx * fx + fz * fz);
    if (dFar < nearCull - skipMargin) continue;   // fully inside the meshed near ring
    out.push({ tx, tz, key: tileKey(tx, tz), dNear, dFar });
  }
  out.sort((a, b) => a.dNear - b.dNear);
  return out;
}

// Whether a built tile may be dropped: well outside the coverage or deep inside the meshed ring (hysteresis so a
// tile is not rebuilt every few frames as the player straddles a boundary).
export function tileStale(t, px, pz, farRadius, nearCull, margin = 64, skipMargin = 48) {
  const x0 = t.tx * TILE, z0 = t.tz * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
  const dx = Math.max(x0 - px, 0, px - x1), dz = Math.max(z0 - pz, 0, pz - z1);
  if (Math.sqrt(dx * dx + dz * dz) > farRadius + margin) return true;
  const fx = Math.max(Math.abs(px - x0), Math.abs(px - x1)), fz = Math.max(Math.abs(pz - z0), Math.abs(pz - z1));
  return Math.sqrt(fx * fx + fz * fz) < nearCull - skipMargin - margin;
}

// Far coverage radius (blocks) for a view distance in chunks: the fog end or the view distance, whichever is
// further, plus one cell row so the fog never reaches an unbuilt edge.
export function farRadiusFor(viewDistanceChunks, fogFar = 0) {
  return Math.max(viewDistanceChunks * CHUNK_SIZE, fogFar || 0) + 48;
}

// Memory estimate (bytes, CPU + GPU copies) for the tiles needed at a view distance.
export function farMemoryEstimate(viewDistanceChunks, fogFar = 0) {
  const n = tilesNeeded(TILE / 2, TILE / 2, farRadiusFor(viewDistanceChunks, fogFar)).length;
  return { tiles: n, bytes: n * TILE_BYTES * 2, perTile: TILE_BYTES };
}
