// Procedural Minecraft-style overworld generation (chunk based, deterministic).
import { SimplexNoise } from './noise.js';
import { hash2, hash3, smoothstep, lerp, clamp } from './rng.js';
import { B } from './blocks.js';
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL, TOWN_GROUND } from './constants.js';

const CS = CHUNK_SIZE, CH = CHUNK_HEIGHT;

export const TOWN_BOUNDS = { x0: -104, x1: 104, z0: -78, z1: 92 }; // flattened area (inclusive-ish)

// ---------------------------------------------------------------------------------------------------- regions
// One world, several regions decided by position. The frontier continent (the western town) sits at the origin and
// ends in an ocean; Coruscant is an artificial plateau rising from that ocean far to the east; the Death Star hangs
// in a void region to the north where nothing is generated but structures.
export const REGIONS = {
  frontier: { kind: 'frontier', coastRadius: 800, coastWidth: 220 },
  coruscant: { kind: 'coruscant', cx: 3000, cz: 0, half: 512, edge: 40, ground: 60 },   // 1024 x 1024 plateau, top at y 60
  space: { kind: 'space', cx: 0, cz: -4000, half: 800 },                                   // void
};
export const CORUSCANT_GROUND = REGIONS.coruscant.ground;

// Returns { kind, t } where t is the 0..1 blend of the region's own terrain (1 = fully inside).
export function regionAt(x, z) {
  const c = REGIONS.coruscant;
  const dcx = Math.abs(x - c.cx) - c.half, dcz = Math.abs(z - c.cz) - c.half;
  const dc = Math.max(dcx, dcz);                       // signed distance to the plateau edge (square)
  if (dc <= c.edge) return { kind: 'coruscant', t: dc <= 0 ? 1 : 1 - dc / c.edge };
  const sp = REGIONS.space;
  if (Math.abs(x - sp.cx) <= sp.half && Math.abs(z - sp.cz) <= sp.half) return { kind: 'space', t: 1 };
  return { kind: 'frontier', t: 1 };
}
export const RAIL_Z = -62;
export const SPAWN = { x: -128.5, z: 0.5 };
const SPAWN_HILL = { x: -130, z: 0, r: 20, h: 9 };

export class WorldGen {
  constructor(seed = 1337) {
    this.seed = seed;
    this.nContinent = new SimplexNoise(seed + 1);
    this.nHills = new SimplexNoise(seed + 2);
    this.nDetail = new SimplexNoise(seed + 3);
    this.nMountain = new SimplexNoise(seed + 4);
    this.nRiver = new SimplexNoise(seed + 5);
    this.nMoisture = new SimplexNoise(seed + 6);
    this.nCave1 = new SimplexNoise(seed + 7);
    this.nCave2 = new SimplexNoise(seed + 8);
    this.nCavern = new SimplexNoise(seed + 9);
    this.nPatch = new SimplexNoise(seed + 10);
    this.structures = []; // lazy structures: { x0, z0, x1, z1, fill(chunk) } (world AABB, x1/z1 exclusive)
    this.heightCache = new Map();
  }

  // Structures write their blocks into a chunk after the terrain (town, Coruscant, Death Star, hyperlane...).
  // `fill(chunk)` must be deterministic and touch only that chunk; it is called for every chunk intersecting the AABB.
  addStructure(st) { this.structures.push(st); }
  // Dense overlay compatibility (the western town): registers a structure that copies the intersecting slice.
  addOverlay(ov) {
    this.addStructure({
      name: ov.name || 'overlay', x0: ov.x0, z0: ov.z0, x1: ov.x0 + ov.w, z1: ov.z0 + ov.d,
      fill: (chunk) => {
        const cx = chunk.cx * CS, cz = chunk.cz * CS;
        const lx0 = Math.max(0, ov.x0 - cx), lx1 = Math.min(CS, ov.x0 + ov.w - cx);
        const lz0 = Math.max(0, ov.z0 - cz), lz1 = Math.min(CS, ov.z0 + ov.d - cz);
        for (let lx = lx0; lx < lx1; lx++) for (let lz = lz0; lz < lz1; lz++) {
          const ox = cx + lx - ov.x0, oz = cz + lz - ov.z0;
          const obase = (ox * ov.d + oz) * ov.h;
          const cbase = (lx * CS + lz) * CH;
          for (let oy = 0; oy < ov.h; oy++) {
            const v = ov.blocks[obase + oy];
            if (v === 0) continue;
            const y = ov.y0 + oy;
            if (y < 0 || y >= CH) continue;
            chunk.blocks[cbase + y] = v === 255 ? B.AIR : v;
          }
        }
      },
    });
  }

  // 0 on the frontier continent, 1 on the open ocean floor between the regions
  oceanMask(x, z) {
    const f = REGIONS.frontier;
    const d = Math.sqrt(x * x + z * z) - f.coastRadius;
    return smoothstep(0, f.coastWidth, d);
  }

  // 0 outside town, 1 fully flattened town ground
  townMask(x, z) {
    const b = TOWN_BOUNDS;
    const dx = Math.max(b.x0 - x, x - b.x1, 0);
    const dz = Math.max(b.z0 - z, z - b.z1, 0);
    const d = Math.sqrt(dx * dx + dz * dz);
    return 1 - smoothstep(0, 36, d);
  }

  railMask(x, z) {
    const d = Math.abs(z - RAIL_Z);
    return 1 - smoothstep(2.5, 16, d);
  }

  // Raw terrain height (top solid block y) before flattening
  rawHeight(x, z) {
    const cont = this.nContinent.fbm2(x * 0.0016, z * 0.0016, 3);
    const hills = this.nHills.fbm2(x * 0.0075, z * 0.0075, 4);
    const detail = this.nDetail.noise2(x * 0.035, z * 0.035);
    const mMask = smoothstep(0.22, 0.75, this.nMountain.fbm2((x + 3000) * 0.0021, (z - 2000) * 0.0021, 2));
    let h = 55 + cont * 9 + hills * 7 + detail * 1.6;
    if (mMask > 0) {
      const ridge = this.nMountain.ridge2((x + 500) * 0.012, (z + 500) * 0.012);
      h += mMask * (18 + ridge * 30 + hills * 8);
    }
    // rivers
    const rv = Math.abs(this.nRiver.noise2(x * 0.0032, z * 0.0032) + 0.12 * this.nRiver.noise2(x * 0.018, z * 0.018));
    let riverT = 1 - smoothstep(0.012, 0.06, rv);
    riverT *= 1 - mMask;
    if (riverT > 0) {
      const riverBed = SEA_LEVEL - 4;
      const target = Math.min(h, riverBed + (1 - riverT) * 2);
      h = lerp(h, target, Math.pow(riverT, 0.6));
    }
    return { h, mMask, riverT };
  }

  heightInfo(x, z) {
    const key = x * 100003 + z;
    let v = this.heightCache.get(key);
    if (v) return v;
    const region = regionAt(x, z);
    if (region.kind === 'space') {
      v = { h: 0, mMask: 0, riverT: 0, town: 0, rail: 0, moisture: 0, region: 'space', regionT: 1, ocean: 0 };
      this.heightCache.set(key, v); return v;
    }
    const raw = this.rawHeight(x, z);
    let h = raw.h;
    // open ocean between the continent and the far regions
    const om = this.oceanMask(x, z);
    if (om > 0) { const floor = SEA_LEVEL - 9 + this.nDetail.noise2(x * 0.01, z * 0.01) * 3; h = lerp(h, floor, om); }
    // Coruscant: a flat artificial plateau rising from the ocean
    if (region.kind === 'coruscant') h = lerp(h, REGIONS.coruscant.ground, smoothstep(0, 1, region.t));
    const tm = this.townMask(x, z);
    if (tm > 0) h = lerp(h, TOWN_GROUND, tm);
    const rm = this.railMask(x, z) * (1 - om) * (region.kind === 'frontier' ? 1 : 0); // the frontier railway ends at the coast
    if (rm > 0) h = lerp(h, TOWN_GROUND, rm);
    // spawn overlook hill
    const dx = x - SPAWN_HILL.x, dz = z - SPAWN_HILL.z;
    const dd = (dx * dx + dz * dz) / (SPAWN_HILL.r * SPAWN_HILL.r);
    if (dd < 4) h += SPAWN_HILL.h * Math.exp(-dd * 1.6) * (1 - tm);
    const moisture = this.nMoisture.fbm2(x * 0.004 + 50, z * 0.004 - 50, 2);
    v = { h: Math.floor(h), mMask: raw.mMask * (1 - om), riverT: raw.riverT * (1 - tm) * (1 - rm) * (1 - om), town: tm, rail: rm, moisture, region: region.kind, regionT: region.t, ocean: om };
    if (this.heightCache.size > 200000) this.heightCache.clear();
    this.heightCache.set(key, v);
    return v;
  }

  biomeAt(info, x, z) {
    if (info.h > 78 + info.mMask * 6) return 'mountain';
    if (info.moisture < -0.42 && info.mMask < 0.2) return 'dry';
    if (info.moisture > 0.18) return 'forest';
    return 'plains';
  }

  // Fill a chunk's block array
  generateChunk(chunk) {
    const blocks = chunk.blocks;
    const cx = chunk.cx * CS, cz = chunk.cz * CS;
    const heights = new Int16Array(CS * CS);
    const infos = new Array(CS * CS);
    let anyTerrain = false;
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const x = cx + lx, z = cz + lz;
      const info = this.heightInfo(x, z);
      infos[lx * CS + lz] = info;
      heights[lx * CS + lz] = info.h;
      if (info.region !== 'space') anyTerrain = true;
    }
    chunk.region = infos[0].region;
    if (!anyTerrain) { this.applyStructures(chunk); return; } // void: nothing but structures

    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const x = cx + lx, z = cz + lz;
      const info = infos[lx * CS + lz];
      const h = clamp(info.h, 1, CH - 2);
      const biome = this.biomeAt(info, x, z);
      const base = (lx * CS + lz) * CH;
      const nearWater = h <= SEA_LEVEL + 1;
      const patch = this.nPatch.noise2(x * 0.06, z * 0.06);

      let surface = B.GRASS, filler = B.DIRT, fillerDepth = 3 + Math.floor(hash2(x, z, 9) * 2);
      const plateau = info.region === 'coruscant' && info.regionT >= 0.999;
      if (plateau) {
        // the city's artificial foundation: plating over stone; the city structure paints the real streets on top
        surface = B.SMOOTH_STONE; filler = B.STONE; fillerDepth = 6;
      } else if (biome === 'mountain') {
        if (h > 96) { surface = B.SNOW; filler = B.STONE; }
        else { surface = patch > 0.45 ? B.GRAVEL : B.STONE; filler = B.STONE; }
        if (h < 84 && patch < -0.3) { surface = B.GRASS; filler = B.DIRT; }
      } else if (biome === 'dry') {
        surface = B.SAND; filler = B.SANDSTONE; fillerDepth = 3;
        if (patch > 0.55) { surface = B.COARSE_DIRT; filler = B.DIRT; }
      } else if (patch > 0.68 && info.town < 0.3) {
        surface = B.GRAVEL;
      } else if (patch < -0.72 && info.town < 0.3) {
        surface = B.COARSE_DIRT;
      }
      if (nearWater && info.town < 0.5) { surface = B.SAND; filler = B.SAND; fillerDepth = 2; }
      if (h < SEA_LEVEL - 3) { surface = hash2(x, z, 3) < 0.4 ? B.GRAVEL : B.DIRT; filler = B.DIRT; }
      // Trail leading east-west through the spawn hill into town and out the other side
      if (Math.abs(z) <= 2 && info.town < 0.999 && ((x < -60 && x > -300) || (x > 60 && x < 300)) && !nearWater && biome !== 'mountain') {
        const edge = Math.abs(z) === 2 && hash2(x, z, 11) < 0.35;
        if (!edge) surface = B.DIRT_PATH;
      }
      // railway bed outside the town overlay (the overlay writes its own inside)
      let railHere = false;
      if (info.rail > 0.999 && Math.abs(z - RAIL_Z) <= 1) { surface = B.GRAVEL; filler = B.GRAVEL; railHere = z === RAIL_Z; }

      blocks[base] = B.BEDROCK;
      // ore / gravel hashes are constant over 2x2x2 and 4x4x4 cells: evaluate once per cell along the column
      const hx1 = x >> 1, hz1 = z >> 1, hx2 = x >> 2, hz2 = z >> 2;
      let oreY = -1, oreH = 0, gravY = -1, gravH = 0;
      for (let y = 1; y <= h; y++) {
        let id;
        if (y === h) id = surface;
        else if (y > h - fillerDepth) id = filler;
        else {
          id = B.STONE;
          // ores in 2x2x2 clusters
          const y1 = y >> 1;
          if (y1 !== oreY) { oreY = y1; oreH = hash3(hx1, y1, hz1, 31); }
          const hh = oreH;
          if (hh < 0.018 && y < 110) id = B.COAL_ORE;
          else if (hh < 0.026 && y < 60) id = B.IRON_ORE;
          else if (hh < 0.0285 && y < 30) id = B.GOLD_ORE;
          else if (y < 5 && hash3(x, y, z, 5) < 0.5) id = B.BEDROCK;
          else {
            const y2 = y >> 2;
            if (y2 !== gravY) { gravY = y2; gravH = hash3(hx2, y2, hz2, 41); }
            if (gravH < 0.05) id = B.GRAVEL;
          }
        }
        blocks[base + y] = id;
      }
      // caves (none under the town, the spawn hill or the Coruscant plateau)
      const spawnD2 = (x - SPAWN.x) * (x - SPAWN.x) + (z - SPAWN.z) * (z - SPAWN.z);
      if (info.town < 0.6 && h > SEA_LEVEL + 1 && spawnD2 > 45 * 45 && info.region !== 'coruscant') {
        const top = Math.min(h, CH - 2);
        const cx1 = x * 0.042, cz1 = z * 0.042, cx2 = x * 0.042 + 77, cz2 = z * 0.042 - 77, cx3 = x * 0.021, cz3 = z * 0.021;
        const nCave1 = this.nCave1, nCave2 = this.nCave2, nCavern = this.nCavern;
        for (let y = 6; y <= top; y++) {
          let thr = 0.0030;
          if (y > top - 5) thr = 0.0007; // rare cave mouths near the surface
          // c1*c1 + c2*c2 < thr needs c1*c1 < thr, so the second noise is only evaluated when that holds
          const c1 = nCave1.noise3(cx1, y * 0.085, cz1);
          if (c1 * c1 < thr) {
            const c2 = nCave2.noise3(cx2, y * 0.085, cz2);
            if (c1 * c1 + c2 * c2 < thr) { blocks[base + y] = B.AIR; continue; }
          }
          if (y < 40 && nCavern.noise3(cx3, y * 0.035, cz3) > 0.66) blocks[base + y] = B.AIR;
        }
      }
      // water
      if (h < SEA_LEVEL) for (let y = h + 1; y <= SEA_LEVEL; y++) blocks[base + y] = B.WATER;
      if (railHere) { blocks[base + h + 1] = B.RAIL; if (x % 3 === 0) blocks[base + h] = B.SPRUCE_PLANKS; }

      // plants
      if (plateau) continue;
      if (h >= SEA_LEVEL + 1 && blocks[base + h] === B.GRASS && blocks[base + h + 1] === B.AIR) {
        const r = hash2(x, z, 77);
        const density = biome === 'forest' ? 0.16 : 0.12;
        const townFactor = 1 - info.town * 0.85;
        if (r < density * townFactor) blocks[base + h + 1] = B.TALL_GRASS;
        else if (r < (density + 0.018) * townFactor) blocks[base + h + 1] = hash2(x, z, 78) < 0.55 ? B.DANDELION : B.POPPY;
      } else if (blocks[base + h] === B.SAND && biome === 'dry' && h > SEA_LEVEL + 1 && blocks[base + h + 1] === B.AIR) {
        const r = hash2(x, z, 79);
        if (r < 0.012) { const ch = 1 + Math.floor(hash2(x, z, 80) * 3); for (let k = 1; k <= ch; k++) blocks[base + h + k] = B.CACTUS; }
        else if (r < 0.03) blocks[base + h + 1] = B.DEAD_BUSH;
      }
    }

    if (chunk.region !== 'coruscant') this.placeTrees(chunk, heights);
    this.applyStructures(chunk);
  }

  // Deterministic trees; considers neighbours' trees so canopies cross chunk borders.
  placeTrees(chunk, heights) {
    const cx = chunk.cx * CS, cz = chunk.cz * CS;
    for (let ncx = chunk.cx - 1; ncx <= chunk.cx + 1; ncx++) for (let ncz = chunk.cz - 1; ncz <= chunk.cz + 1; ncz++) {
      const trees = this.treesForChunk(ncx, ncz);
      for (const t of trees) this.stampTree(chunk, t, cx, cz);
    }
    // boulders
    for (let ncx = chunk.cx - 1; ncx <= chunk.cx + 1; ncx++) for (let ncz = chunk.cz - 1; ncz <= chunk.cz + 1; ncz++) {
      if (hash2(ncx, ncz, 501) > 0.18) continue;
      const bx = ncx * CS + Math.floor(hash2(ncx, ncz, 502) * CS);
      const bz = ncz * CS + Math.floor(hash2(ncx, ncz, 503) * CS);
      const info = this.heightInfo(bx, bz);
      if (info.town > 0.05 || info.rail > 0.05 || info.h <= SEA_LEVEL + 1 || info.riverT > 0.1) continue;
      const size = 1 + Math.floor(hash2(bx, bz, 504) * 2);
      for (let dx = -size; dx <= size; dx++) for (let dz = -size; dz <= size; dz++) for (let dy = 0; dy <= size; dy++) {
        if (hash3(bx + dx, dy, bz + dz, 505) < 0.3 && (Math.abs(dx) === size || Math.abs(dz) === size || dy === size)) continue;
        const lx = bx + dx - cx, lz = bz + dz - cz;
        if (lx < 0 || lz < 0 || lx >= CS || lz >= CS) continue;
        const gy = this.heightInfo(bx + dx, bz + dz).h;
        const y = info.h + dy;
        if (y < gy) continue;
        chunk.blocks[(lx * CS + lz) * CH + y] = hash3(dx, dy, dz, 506) < 0.6 ? B.COBBLESTONE : B.STONE;
      }
    }
  }

  treesForChunk(ccx, ccz) {
    const out = [];
    const cx = ccx * CS, cz = ccz * CS;
    const centerInfo = this.heightInfo(cx + 8, cz + 8);
    const biome = this.biomeAt(centerInfo, cx + 8, cz + 8);
    let attempts = biome === 'forest' ? 7 : biome === 'plains' ? 1 : biome === 'mountain' ? 2 : 0;
    if (biome === 'plains' && hash2(ccx, ccz, 600) < 0.45) attempts = 0;
    for (let i = 0; i < attempts; i++) {
      const x = cx + Math.floor(hash2(ccx * 3 + i, ccz, 601) * CS);
      const z = cz + Math.floor(hash2(ccx, ccz * 3 + i, 602) * CS);
      const info = this.heightInfo(x, z);
      if (info.town > 0.02 || info.rail > 0.02 || info.riverT > 0.05) continue;
      if (info.h <= SEA_LEVEL + 1) continue;
      const b = this.biomeAt(info, x, z);
      if (b === 'dry') continue;
      if (b === 'mountain' && info.h > 88) continue;
      const r = hash2(x, z, 603);
      let type = 'oak';
      if (b === 'mountain' || info.h > 70) type = r < 0.8 ? 'spruce' : 'oak';
      else if (b === 'forest') type = r < 0.65 ? 'oak' : r < 0.85 ? 'birch' : 'spruce';
      else type = r < 0.85 ? 'oak' : 'birch';
      const trunk = type === 'spruce' ? 7 + Math.floor(hash2(x, z, 604) * 4) : 4 + Math.floor(hash2(x, z, 604) * 3);
      out.push({ x, z, y: info.h + 1, type, trunk });
    }
    return out;
  }

  stampTree(chunk, t, cx, cz) {
    const set = (x, y, z, id, onlyAir = true) => {
      const lx = x - cx, lz = z - cz;
      if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
      const i = (lx * CS + lz) * CH + y;
      if (onlyAir && chunk.blocks[i] !== B.AIR) return;
      chunk.blocks[i] = id;
    };
    const log = t.type === 'spruce' ? B.SPRUCE_LOG : t.type === 'birch' ? B.BIRCH_LOG : B.OAK_LOG;
    const leaf = t.type === 'spruce' ? B.SPRUCE_LEAVES : t.type === 'birch' ? B.BIRCH_LEAVES : B.OAK_LEAVES;
    const top = t.y + t.trunk - 1;
    if (t.type === 'spruce') {
      for (let layer = 0; ; layer++) {
        const y = top + 1 - layer;
        if (y < t.y + 2) break;
        let r;
        if (layer === 0) r = 0;
        else if (layer % 2 === 1) r = 1;
        else r = layer >= 6 ? 3 : 2;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (r > 1 && Math.abs(dx) === r && Math.abs(dz) === r) continue;
          set(t.x + dx, y, t.z + dz, leaf);
        }
      }
      for (let y = t.y; y <= top; y++) set(t.x, y, t.z, log, false);
      set(t.x, t.y - 1, t.z, B.DIRT, false);
    } else {
      for (let dy = -2; dy <= 1; dy++) {
        const y = top + dy;
        const r = dy <= -1 ? 2 : 1;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r) {
            if (dy === 1) continue;
            if (hash3(t.x + dx, y, t.z + dz, 610) < 0.45) continue;
          }
          set(t.x + dx, y, t.z + dz, leaf);
        }
      }
      for (let y = t.y; y <= top; y++) set(t.x, y, t.z, log, false);
      // dirt under trunk
      set(t.x, t.y - 1, t.z, B.DIRT, false);
    }
  }

  applyStructures(chunk) {
    const cx = chunk.cx * CS, cz = chunk.cz * CS;
    for (const st of this.structures) {
      if (cx + CS <= st.x0 || cx >= st.x1 || cz + CS <= st.z0 || cz >= st.z1) continue;
      const t0 = performance.now();
      st.fill(chunk, this);
      st.msTotal = (st.msTotal || 0) + (performance.now() - t0); st.chunks = (st.chunks || 0) + 1;
    }
  }

  surfaceHeight(x, z) { return this.heightInfo(x, z).h; }
}
