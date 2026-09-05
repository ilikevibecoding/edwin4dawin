// Persistent save of player block edits (localStorage). Disaster damage is journaled separately by the
// DisasterManager and is NOT written to the save unless an administrator explicitly commits it, so a
// disaster can never silently corrupt the main save. Saved edits are applied as a sparse overlay whenever
// a chunk is generated.
import { CHUNK_SIZE as CS, CHUNK_HEIGHT } from './constants.js';

const VERSION = 1;

export class SaveManager {
  constructor(worldSeed, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.key = `frontier-craft:v${VERSION}:${worldSeed}`;
    this.storage = storage;
    this.byChunk = new Map();   // chunkKey -> Map(posKey -> id)
    this.count = 0;
    this.dirty = false;
    this.enabled = true;
    this.disasterCells = new Set(); // cells currently owned by an active disaster journal (excluded from save)
    this.load();
    this.timer = null;
  }

  static chunkKey(x, z) { return Math.floor(x / CS) * 100000 + Math.floor(z / CS); }
  static posKey(x, y, z) { return `${x},${y},${z}`; }

  load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return;
      const data = JSON.parse(raw);
      for (const [x, y, z, id] of data.edits || []) this._set(x, y, z, id);
      this.dirty = false;
    } catch (e) { console.warn('save load failed', e); }
  }

  _set(x, y, z, id) {
    const ck = SaveManager.chunkKey(x, z);
    let m = this.byChunk.get(ck);
    if (!m) { m = new Map(); this.byChunk.set(ck, m); }
    const pk = SaveManager.posKey(x, y, z);
    if (!m.has(pk)) this.count++;
    m.set(pk, [x, y, z, id]);
  }

  // Player edit: recorded unless the cell is currently part of an un-committed disaster journal.
  recordEdit(x, y, z, id) {
    if (!this.enabled) return;
    if (this.disasterCells.has(SaveManager.posKey(x, y, z))) return;
    this._set(x, y, z, id);
    this.scheduleWrite();
  }

  onDisasterEdit(x, y, z) { this.disasterCells.add(SaveManager.posKey(x, y, z)); }
  clearDisasterCells() { this.disasterCells.clear(); }

  // Explicit administrator action: bake disaster damage into the save.
  commitDisaster(changes) {
    for (const [x, y, z, id] of changes) this._set(x, y, z, id);
    this.disasterCells.clear();
    this.scheduleWrite();
  }

  // Apply saved edits to a freshly generated chunk's block array
  applyToChunk(chunk) {
    const m = this.byChunk.get(chunk.cx * 100000 + chunk.cz);
    if (!m) return 0;
    let n = 0;
    for (const [x, y, z, id] of m.values()) { chunk.blocks[((x & 15) * CS + (z & 15)) * CHUNK_HEIGHT + y] = id; n++; }
    return n;
  }

  scheduleWrite() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 1500);
  }

  flush() {
    if (!this.storage || !this.dirty) return;
    const edits = [];
    for (const m of this.byChunk.values()) for (const e of m.values()) edits.push(e);
    try { this.storage.setItem(this.key, JSON.stringify({ version: VERSION, edits })); this.dirty = false; }
    catch (e) { console.warn('save write failed', e); }
  }

  clear() {
    this.byChunk.clear(); this.count = 0; this.dirty = false;
    if (this.storage) this.storage.removeItem(this.key);
  }
}
