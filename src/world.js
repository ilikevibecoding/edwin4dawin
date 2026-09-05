// Chunk storage, block access, and Minecraft-style voxel lighting (sky + block light flood fill).
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, DIRS } from './constants.js';
import { B, BLOCKS, DOOR_SETS } from './blocks.js';

export const idx = (lx, y, lz) => (lx * CS + lz) * CH + y;

// Block property lookup tables for the lighting hot paths (BLOCKS is filled at startup by initBlocks(),
// so the tables are refreshed on entry to the lighting routines; 256 entries, negligible).
const OPQ = new Uint8Array(256), LOP = new Uint8Array(256), EMIT = new Uint8Array(256);
function refreshTables() {
  for (let i = 0; i < 256; i++) {
    const b = BLOCKS[i];
    if (b) { OPQ[i] = b.opaque ? 1 : 0; LOP[i] = b.lightOpacity; EMIT[i] = b.emit; }
    else { OPQ[i] = 0; LOP[i] = 0; EMIT[i] = 0; }
  }
}
const DX = new Int8Array(6), DY = new Int8Array(6), DZ = new Int8Array(6);
for (let d = 0; d < 6; d++) { DX[d] = DIRS[d][0]; DY[d] = DIRS[d][1]; DZ[d] = DIRS[d][2]; }

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
    // Block entities: posKey -> {type: 'chest', slots: [{id,count}|null x27]} | {type: 'crop', age}. Global (not per
    // chunk) so they survive chunk unloading; persisted by save.js, dropped by the game when the block breaks.
    this.blockEntities = new Map();
    this.onBlockEntityLost = null; // (x, y, z, entity, newId) when a block carrying an entity is replaced
    this.onChunkDirty = null;
    // lightChunk scratch: per-column top of the non-daylight part, and emitter cell indices
    this._colTop = new Int16Array(CS * CS);
    this._emitters = new Int32Array(CS * CS * CH);
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

  // ---------------------------------------------------------------------------
  // Block entities
  // ---------------------------------------------------------------------------
  getBlockEntity(x, y, z) { return this.blockEntities.get(World.posKey(x, y, z)) || null; }
  setBlockEntity(x, y, z, data) {
    const k = World.posKey(x, y, z);
    if (data) { data.x = x; data.y = y; data.z = z; this.blockEntities.set(k, data); } else this.blockEntities.delete(k);
    return data;
  }
  removeBlockEntity(x, y, z) { return this.blockEntities.delete(World.posKey(x, y, z)); }
  // A block with an entity was replaced by something else: hand the entity to the game (drops) and forget it.
  _blockEntityReplaced(x, y, z, oldId, newId) {
    const oldDef = BLOCKS[oldId];
    if (!oldDef || !oldDef.blockEntity) return;
    if (BLOCKS[newId] && BLOCKS[newId].blockEntity === oldDef.blockEntity) return;
    const k = World.posKey(x, y, z);
    const ent = this.blockEntities.get(k);
    if (!ent) return;
    if (this.onBlockEntityLost) this.onBlockEntityLost(x, y, z, ent, newId);
    else this.blockEntities.delete(k);
  }

  // Town/structure generators place two-block doors as two copies of the bottom id; the top half gets its own id so
  // it renders with the upper texture and toggles as one door. Runs on freshly generated chunks (before saved edits).
  normalizeDoors(chunk) {
    const blocks = chunk.blocks;
    let n = 0;
    for (let col = 0; col < CS * CS; col++) {
      const base = col * CH;
      for (let y = 0; y < CH - 1; y++) {
        const id = blocks[base + y];
        if (id === B.AIR) continue;
        const d = BLOCKS[id];
        if (!d.door || d.doorTop || d.doorOpen) continue;
        if (blocks[base + y + 1] === id) { blocks[base + y + 1] = DOOR_SETS[d.door].top; n++; }
        y++; // the cell above belongs to this door either way
      }
    }
    return n;
  }

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
    if (this.blockEntities.size) this._blockEntityReplaced(x, y, z, old, id);
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
    if (this.blockEntities.size) this._blockEntityReplaced(x, y, z, old, id);
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
    refreshTables();
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
        for (let d = 0; d < 6; d++) this.addQueue.push(x + DX[d], y + DY[d], z + DZ[d]);
        if (ch === 1 && newB.emit > arr[i]) { arr[i] = newB.emit; this.addQueue.push(x, y, z); }
      }
      this.propagate(ch);
    }
  }

  runRemoval(ch) {
    const q = this.removeQueue, aq = this.addQueue;
    while (q.head < q.tail) {
      const a = q.a, h = q.head;
      const x = a[h], y = a[h + 1], z = a[h + 2], L = a[h + 3];
      q.head = h + 4;
      for (let d = 0; d < 6; d++) {
        const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d];
        if (ny < 0 || ny >= CH) continue;
        const nc = this.chunkAt(nx, nz);
        if (!nc || !nc.lit) continue;
        const ni = ((nx & 15) * CS + (nz & 15)) * CH + ny;
        const nid = nc.blocks[ni];
        if (OPQ[nid]) continue;
        const narr = ch === 0 ? nc.sky : nc.light;
        const nv = narr[ni];
        if (nv === 0) continue;
        let pv = L - 1 - LOP[nid];
        if (ch === 0 && d === 3 && L === 15 && LOP[nid] === 0) pv = 15;
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
    const chunks = this.chunks;
    let lastC = null, lastKey = null;
    while (q.head < q.tail) {
      const a = q.a, h = q.head;
      const x = a[h], y = a[h + 1], z = a[h + 2];
      q.head = h + 4;
      if (y < 0 || y >= CH) continue;
      const cx = x >> 4, cz = z >> 4;
      const key = World.key(cx, cz);
      let c;
      if (key === lastKey) c = lastC; else { c = chunks.get(key); lastC = c; lastKey = key; }
      if (!c || !c.lit) continue;
      const i = ((x & 15) * CS + (z & 15)) * CH + y;
      const arr = ch === 0 ? c.sky : c.light;
      const L = arr[i];
      if (L <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const nx = x + DX[d], ny = y + DY[d], nz = z + DZ[d];
        if (ny < 0 || ny >= CH) continue;
        let nc = c;
        const ncx = nx >> 4, ncz = nz >> 4;
        if (ncx !== cx || ncz !== cz) { nc = chunks.get(World.key(ncx, ncz)); if (!nc || !nc.lit) continue; }
        const ni = ((nx & 15) * CS + (nz & 15)) * CH + ny;
        const nid = nc.blocks[ni];
        if (OPQ[nid]) continue;
        let nl = L - 1 - LOP[nid];
        if (ch === 0 && d === 3 && L === 15 && LOP[nid] === 0) nl = 15;
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

  _litChunk(cx, cz) {
    const c = this.chunks.get(World.key(cx, cz));
    return c && c.lit ? c : null;
  }

  // Highest y of a lit column whose sky value is below full daylight (-1 when the whole column is 15).
  _colTopOf(sky, base) {
    let y = CH - 1;
    while (y >= 0 && sky[base + y] === 15) y--;
    return y;
  }

  // Initial lighting for a freshly generated chunk.
  lightChunk(c) {
    refreshTables();
    const blocks = c.blocks, sky = c.sky, light = c.light;
    sky.fill(0);
    light.fill(0);
    const wx0 = c.cx * CS, wz0 = c.cz * CS;
    const tops = this._colTop, emitters = this._emitters;
    let nEmit = 0;
    // vertical sky light scan; the pure-air top of each column is full daylight without further checks
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const base = (lx * CS + lz) * CH;
      let y = CH - 1;
      while (y >= 0 && blocks[base + y] === B.AIR) y--;
      sky.fill(15, base + y + 1, base + CH);
      let L = 15, top = -1;
      for (; y >= 0; y--) {
        const id = blocks[base + y];
        if (OPQ[id]) { L = 0; }
        else if (L === 15 && LOP[id] === 0) { /* full sun */ }
        else { L = L - 1 - LOP[id]; if (L < 0) L = 0; }
        sky[base + y] = L;
        if (top < 0 && L < 15) top = y;
        const e = EMIT[id];
        if (e > 0) { light[base + y] = e; emitters[nEmit++] = base + y; }
      }
      tops[lx * CS + lz] = top;
    }
    c.lit = true;

    // Seeds: sky cells that can raise a darker non-opaque horizontal neighbour, in this chunk or in an
    // already-lit neighbour chunk (a border cell facing an unlit or missing chunk cannot propagate anywhere;
    // the neighbour seeds it when it gets lit). The cell below never qualifies: the vertical scan already
    // gave it exactly the value propagation would. Above every involved column's top all cells are 15, so
    // the scan stops there.
    const nW = this._litChunk(c.cx - 1, c.cz), nE = this._litChunk(c.cx + 1, c.cz);
    const nN = this._litChunk(c.cx, c.cz - 1), nS = this._litChunk(c.cx, c.cz + 1);
    const q = this.addQueue;
    q.reset();
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const col = lx * CS + lz, base = col * CH;
      const cW = lx > 0 ? c : nW, bW = lx > 0 ? base - CS * CH : ((CS - 1) * CS + lz) * CH;
      const cE = lx < CS - 1 ? c : nE, bE = lx < CS - 1 ? base + CS * CH : lz * CH;
      const cN = lz > 0 ? c : nN, bN = lz > 0 ? base - CH : (lx * CS + CS - 1) * CH;
      const cS = lz < CS - 1 ? c : nS, bS = lz < CS - 1 ? base + CH : lx * CS * CH;
      const blW = cW ? cW.blocks : null, skW = cW ? cW.sky : null;
      const blE = cE ? cE.blocks : null, skE = cE ? cE.sky : null;
      const blN = cN ? cN.blocks : null, skN = cN ? cN.sky : null;
      const blS = cS ? cS.blocks : null, skS = cS ? cS.sky : null;
      let yMax = tops[col];
      if (skW) { const t = lx > 0 ? tops[col - CS] : this._colTopOf(skW, bW); if (t > yMax) yMax = t; }
      if (skE) { const t = lx < CS - 1 ? tops[col + CS] : this._colTopOf(skE, bE); if (t > yMax) yMax = t; }
      if (skN) { const t = lz > 0 ? tops[col - 1] : this._colTopOf(skN, bN); if (t > yMax) yMax = t; }
      if (skS) { const t = lz < CS - 1 ? tops[col + 1] : this._colTopOf(skS, bS); if (t > yMax) yMax = t; }
      for (let y = 1; y <= yMax; y++) {
        const L = sky[base + y];
        if (L <= 1) continue;
        const L1 = L - 1;
        let seed = false;
        if (skW && skW[bW + y] < L1) { const n = bW + y, id = blW[n]; if (!OPQ[id] && skW[n] < L1 - LOP[id]) seed = true; }
        if (!seed && skE && skE[bE + y] < L1) { const n = bE + y, id = blE[n]; if (!OPQ[id] && skE[n] < L1 - LOP[id]) seed = true; }
        if (!seed && skN && skN[bN + y] < L1) { const n = bN + y, id = blN[n]; if (!OPQ[id] && skN[n] < L1 - LOP[id]) seed = true; }
        if (!seed && skS && skS[bS + y] < L1) { const n = bS + y, id = blS[n]; if (!OPQ[id] && skS[n] < L1 - LOP[id]) seed = true; }
        if (seed) q.push(wx0 + lx, y, wz0 + lz);
      }
    }
    // neighbours' border cells propagate into this chunk
    this.seedFromNeighbors(c, 0);
    this.propagate(0);

    // block light: this chunk's emitters plus neighbours' border light
    q.reset();
    for (let k = 0; k < nEmit; k++) {
      const i = emitters[k];
      const col = (i / CH) | 0;
      q.push(wx0 + ((col / CS) | 0), i - col * CH, wz0 + (col % CS));
    }
    this.seedFromNeighbors(c, 1);
    this.propagate(1);
    c.dirty = true;
  }

  // Queues the border cells of lit neighbours that can raise a darker cell of chunk c (channel ch).
  seedFromNeighbors(c, ch) {
    const q = this.addQueue;
    const cBlocks = c.blocks, cArr = ch === 0 ? c.sky : c.light;
    for (let side = 0; side < 4; side++) {
      // neighbour chunk and the fixed border coordinate on each side (-1 = runs along the border)
      let ncx = c.cx, ncz = c.cz, nfx = -1, nfz = -1, cfx = -1, cfz = -1;
      if (side === 0) { ncx--; nfx = CS - 1; cfx = 0; }
      else if (side === 1) { ncx++; nfx = 0; cfx = CS - 1; }
      else if (side === 2) { ncz--; nfz = CS - 1; cfz = 0; }
      else { ncz++; nfz = 0; cfz = CS - 1; }
      const n = this.getChunk(ncx, ncz);
      if (!n || !n.lit) continue;
      const nArr = ch === 0 ? n.sky : n.light;
      for (let k = 0; k < CS; k++) {
        const nlx = nfx >= 0 ? nfx : k, nlz = nfz >= 0 ? nfz : k;
        const clx = cfx >= 0 ? cfx : k, clz = cfz >= 0 ? cfz : k;
        const nb = (nlx * CS + nlz) * CH, cb = (clx * CS + clz) * CH;
        for (let y = 0; y < CH; y++) {
          const nv = nArr[nb + y];
          if (nv <= 1) continue;
          const cid = cBlocks[cb + y];
          if (OPQ[cid]) continue;
          if (cArr[cb + y] < nv - 1 - LOP[cid]) q.push(ncx * CS + nlx, y, ncz * CS + nlz);
        }
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
