// Chunk storage, block access, and Minecraft-style voxel lighting (sky + block light flood fill).
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, DIRS } from './constants.js';
import { B, BLOCKS } from './blocks.js';

export const idx = (lx, y, lz) => (lx * CS + lz) * CH + y;

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CS * CS * CH);
    this.sky = new Uint8Array(CS * CS * CH);
    this.light = new Uint8Array(CS * CS * CH);
    this.generated = false;
    this.lit = false;
    this.dirty = true;
    this.mesh = null;
    this.waterMesh = null;
    this.meshed = false;
  }
}

class Queue {
  constructor(cap = 1 << 18) {
    this.a = new Int32Array(cap * 4);
    this.head = 0;
    this.tail = 0;
  }
  push(x, y, z, v = 0) {
    if (this.tail + 4 > this.a.length) {
      if (this.head > 0) {
        this.a.copyWithin(0, this.head, this.tail);
        this.tail -= this.head;
        this.head = 0;
      }
      if (this.tail + 4 > this.a.length) {
        const n = new Int32Array(this.a.length * 2);
        n.set(this.a.subarray(0, this.tail));
        this.a = n;
      }
    }
    const a = this.a, t = this.tail;
    a[t] = x; a[t + 1] = y; a[t + 2] = z; a[t + 3] = v;
    this.tail = t + 4;
  }
  get empty() { return this.head >= this.tail; }
  reset() { this.head = 0; this.tail = 0; }
}

export class World {
  constructor(gen) {
    this.gen = gen;
    this.chunks = new Map();
    this.addQueue = new Queue();
    this.removeQueue = new Queue();
    this.signTiles = new Map(); // packed pos -> atlas tile index for sign text
    this.onChunkDirty = null;
  }

  static key(cx, cz) { return cx * 100000 + cz; }
  static posKey(x, y, z) { return ((x + 1048576) * 2097152 + (z + 1048576)) * 256 + y; }

  getChunk(cx, cz) { return this.chunks.get(World.key(cx, cz)); }
  chunkAt(x, z) { return this.chunks.get(World.key(Math.floor(x / CS), Math.floor(z / CS))); }

  getOrCreateChunk(cx, cz) {
    let c = this.getChunk(cx, cz);
    if (!c) { c = new Chunk(cx, cz); this.chunks.set(World.key(cx, cz), c); }
    return c;
  }

  getBlock(x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (y >= CH) return B.AIR;
    const c = this.chunks.get(World.key(Math.floor(x / CS), Math.floor(z / CS)));
    if (!c || !c.generated) return B.AIR;
    return c.blocks[((x & 15) * CS + (z & 15)) * CH + y];
  }

  getBlockDef(x, y, z) { return BLOCKS[this.getBlock(x, y, z)]; }

  isLoaded(x, z) {
    const c = this.chunkAt(x, z);
    return !!(c && c.generated);
  }

  getSky(x, y, z) {
    if (y >= CH) return 15;
    if (y < 0) return 0;
    const c = this.chunkAt(x, z);
    if (!c || !c.lit) return 15;
    return c.sky[((x & 15) * CS + (z & 15)) * CH + y];
  }
  getLight(x, y, z) {
    if (y >= CH || y < 0) return 0;
    const c = this.chunkAt(x, z);
    if (!c || !c.lit) return 0;
    return c.light[((x & 15) * CS + (z & 15)) * CH + y];
  }

  // Combined light in 0..1 pairs for entities: [sky, block]
  sampleLight(x, y, z) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    let s = this.getSky(bx, by, bz), l = this.getLight(bx, by, bz);
    // if inside an opaque block sample above
    if (BLOCKS[this.getBlock(bx, by, bz)].opaque) { s = this.getSky(bx, by + 1, bz); l = this.getLight(bx, by + 1, bz); }
    return [s / 15, l / 15];
  }

  markDirty(x, y, z) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const lx = x & 15, lz = z & 15;
    this._dirty(cx, cz);
    if (lx === 0) this._dirty(cx - 1, cz);
    if (lx === 15) this._dirty(cx + 1, cz);
    if (lz === 0) this._dirty(cx, cz - 1);
    if (lz === 15) this._dirty(cx, cz + 1);
    if (lx === 0 && lz === 0) this._dirty(cx - 1, cz - 1);
    if (lx === 15 && lz === 0) this._dirty(cx + 1, cz - 1);
    if (lx === 0 && lz === 15) this._dirty(cx - 1, cz + 1);
    if (lx === 15 && lz === 15) this._dirty(cx + 1, cz + 1);
  }
  _dirty(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c) c.dirty = true;
  }

  // ---------------------------------------------------------------------------
  // Block modification with incremental light updates
  // ---------------------------------------------------------------------------
  setBlock(x, y, z, id, silent = false) {
    if (y < 0 || y >= CH) return false;
    const c = this.chunkAt(x, z);
    if (!c || !c.generated) return false;
    const i = ((x & 15) * CS + (z & 15)) * CH + y;
    const old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id;
    if (id !== B.WALL_SIGN) this.signTiles.delete(World.posKey(x, y, z));
    this.markDirty(x, y, z);
    if (c.lit) this.updateLight(x, y, z, old, id);
    if (!silent && this.onChunkDirty) this.onChunkDirty(x, y, z);
    return true;
  }

  chunkKeyAt(x, z) { return World.key(Math.floor(x / CS), Math.floor(z / CS)); }

  // Bulk edit without incremental lighting: the caller relights touched chunks afterwards (relightChunk).
  setBlockRaw(x, y, z, id) {
    if (y < 0 || y >= CH) return false;
    const c = this.chunkAt(x, z);
    if (!c || !c.generated) return false;
    const i = ((x & 15) * CS + (z & 15)) * CH + y;
    const old = c.blocks[i];
    if (old === id) return false;
    c.blocks[i] = id;
    if (old === B.WALL_SIGN) this.signTiles.delete(World.posKey(x, y, z));
    c.needsRelight = true;
    this.markDirty(x, y, z);
    return true;
  }

  // Full lighting recompute for one chunk (used after bulk edits). With markNeighbors the 8 neighbours are
  // flagged for remeshing too (the caller may instead compare border light itself and flag selectively).
  relightChunk(c, markNeighbors = true) {
    if (!c || !c.generated) return;
    this.lightChunk(c);
    c.needsRelight = false;
    if (!markNeighbors) return;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (n) n.dirty = true;
    }
  }

  updateLight(x, y, z, oldId, newId) {
    const oldB = BLOCKS[oldId], newB = BLOCKS[newId];
    for (let ch = 0; ch < 2; ch++) {
      const c = this.chunkAt(x, z);
      const i = ((x & 15) * CS + (z & 15)) * CH + y;
      const arr = ch === 0 ? c.sky : c.light;
      const worse = newB.opaque || newB.lightOpacity > oldB.lightOpacity || (ch === 1 && newB.emit < oldB.emit);
      this.addQueue.reset();
      this.removeQueue.reset();
      if (worse) {
        const cur = arr[i];
        if (cur > 0) { arr[i] = 0; this.removeQueue.push(x, y, z, cur); }
        this.runRemoval(ch);
      }
      if (!newB.opaque) {
        for (let d = 0; d < 6; d++) this.addQueue.push(x + DIRS[d][0], y + DIRS[d][1], z + DIRS[d][2]);
        if (ch === 1 && newB.emit > arr[i]) { arr[i] = newB.emit; this.addQueue.push(x, y, z); }
      }
      this.propagate(ch);
    }
  }

  runRemoval(ch) {
    const q = this.removeQueue, aq = this.addQueue;
    while (!q.empty) {
      const a = q.a, h = q.head;
      const x = a[h], y = a[h + 1], z = a[h + 2], L = a[h + 3];
      q.head = h + 4;
      for (let d = 0; d < 6; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
        if (ny < 0 || ny >= CH) continue;
        const nc = this.chunkAt(nx, nz);
        if (!nc || !nc.lit) continue;
        const ni = ((nx & 15) * CS + (nz & 15)) * CH + ny;
        const nb = BLOCKS[nc.blocks[ni]];
        if (nb.opaque) continue;
        const narr = ch === 0 ? nc.sky : nc.light;
        const nv = narr[ni];
        if (nv === 0) continue;
        let pv = L - 1 - nb.lightOpacity;
        if (ch === 0 && d === 3 && L === 15 && nb.lightOpacity === 0) pv = 15;
        if (nv <= pv) {
          narr[ni] = 0;
          q.push(nx, ny, nz, nv);
          this.markDirty(nx, ny, nz);
        } else {
          aq.push(nx, ny, nz);
        }
      }
    }
  }

  propagate(ch) {
    const q = this.addQueue;
    let lastC = null, lastKey = null;
    while (!q.empty) {
      const a = q.a, h = q.head;
      const x = a[h], y = a[h + 1], z = a[h + 2];
      q.head = h + 4;
      if (y < 0 || y >= CH) continue;
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      const key = World.key(cx, cz);
      let c;
      if (key === lastKey) c = lastC; else { c = this.chunks.get(key); lastC = c; lastKey = key; }
      if (!c || !c.lit) continue;
      const i = ((x & 15) * CS + (z & 15)) * CH + y;
      const arr = ch === 0 ? c.sky : c.light;
      const L = arr[i];
      if (L <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1], nz = z + DIRS[d][2];
        if (ny < 0 || ny >= CH) continue;
        let nc = c;
        if ((nx >> 4) !== cx || (nz >> 4) !== cz) { nc = this.chunkAt(nx, nz); if (!nc || !nc.lit) continue; }
        const ni = ((nx & 15) * CS + (nz & 15)) * CH + ny;
        const nb = BLOCKS[nc.blocks[ni]];
        if (nb.opaque) continue;
        let nl = L - 1 - nb.lightOpacity;
        if (ch === 0 && d === 3 && L === 15 && nb.lightOpacity === 0) nl = 15;
        if (nl <= 0) continue;
        const narr = ch === 0 ? nc.sky : nc.light;
        if (narr[ni] < nl) {
          narr[ni] = nl;
          q.push(nx, ny, nz);
          if ((nx & 15) === 0 || (nx & 15) === 15 || (nz & 15) === 0 || (nz & 15) === 15) this.markDirty(nx, ny, nz);
          else nc.dirty = true;
        }
      }
    }
  }

  // Initial lighting for a freshly generated chunk.
  lightChunk(c) {
    const blocks = c.blocks, sky = c.sky, light = c.light;
    sky.fill(0);
    light.fill(0);
    const wx0 = c.cx * CS, wz0 = c.cz * CS;
    // vertical sky light scan
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const base = (lx * CS + lz) * CH;
      let L = 15;
      for (let y = CH - 1; y >= 0; y--) {
        const b = BLOCKS[blocks[base + y]];
        if (b.opaque) { L = 0; }
        else if (L === 15 && b.lightOpacity === 0) { /* full sun */ }
        else L = Math.max(0, L - 1 - b.lightOpacity);
        sky[base + y] = L;
        if (L === 0) { /* remaining cells below are 0 unless BFS lights them */ }
        if (b.emit > 0) light[base + y] = b.emit;
      }
    }
    c.lit = true;

    // seeds: sky cells adjacent to darker non-opaque cells
    const q = this.addQueue;
    q.reset();
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const base = (lx * CS + lz) * CH;
      for (let y = 1; y < CH; y++) {
        const L = sky[base + y];
        if (L <= 1) continue;
        // horizontal neighbours within chunk
        let seed = false;
        if (lx > 0) { const n = base - CS * CH + y; if (!BLOCKS[blocks[n]].opaque && sky[n] < L - 1) seed = true; }
        if (!seed && lx < CS - 1) { const n = base + CS * CH + y; if (!BLOCKS[blocks[n]].opaque && sky[n] < L - 1) seed = true; }
        if (!seed && lz > 0) { const n = base - CH + y; if (!BLOCKS[blocks[n]].opaque && sky[n] < L - 1) seed = true; }
        if (!seed && lz < CS - 1) { const n = base + CH + y; if (!BLOCKS[blocks[n]].opaque && sky[n] < L - 1) seed = true; }
        if (!seed && y > 0) { const n = base + y - 1; if (!BLOCKS[blocks[n]].opaque && sky[n] < L - 1) seed = true; }
        if (!seed && (lx === 0 || lx === CS - 1 || lz === 0 || lz === CS - 1)) seed = true;
        if (seed) q.push(wx0 + lx, y, wz0 + lz);
      }
    }
    // neighbours' border cells propagate into this chunk
    this.seedFromNeighbors(c, 0);
    this.propagate(0);

    q.reset();
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const base = (lx * CS + lz) * CH;
      for (let y = 0; y < CH; y++) if (light[base + y] > 0) q.push(wx0 + lx, y, wz0 + lz);
    }
    this.seedFromNeighbors(c, 1);
    this.propagate(1);
    c.dirty = true;
  }

  seedFromNeighbors(c, ch) {
    const q = this.addQueue;
    const wx0 = c.cx * CS, wz0 = c.cz * CS;
    const sides = [[c.cx - 1, c.cz, 15, -1], [c.cx + 1, c.cz, 0, -1], [c.cx, c.cz - 1, -1, 15], [c.cx, c.cz + 1, -1, 0]];
    for (const [ncx, ncz, fx, fz] of sides) {
      const n = this.getChunk(ncx, ncz);
      if (!n || !n.lit) continue;
      const arr = ch === 0 ? n.sky : n.light;
      for (let k = 0; k < CS; k++) {
        const lx = fx >= 0 ? fx : k, lz = fz >= 0 ? fz : k;
        const base = (lx * CS + lz) * CH;
        for (let y = 0; y < CH; y++) if (arr[base + y] > 1) q.push(ncx * CS + lx, y, ncz * CS + lz);
      }
    }
  }

  // Highest solid block y at column (for spawning), or -1
  surfaceY(x, z) {
    for (let y = CH - 1; y >= 0; y--) {
      const b = BLOCKS[this.getBlock(x, y, z)];
      if (b.solid || b.id === B.WATER) return y;
    }
    return -1;
  }
}
