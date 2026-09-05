// Persistent save (localStorage) per world seed: player block edits, block entities (chest contents, crop timers),
// the player's position / health / hunger and the inventory. Disaster damage is journaled separately by the
// DisasterManager and is NOT written to the save unless an administrator explicitly commits it, so a disaster can
// never silently corrupt the main save. Saved edits are applied as a sparse overlay whenever a chunk is generated.
//
// Format v2: {version: 2, edits: [[x,y,z,id], ...], entities: [{x,y,z,type,...}], player: {...}|null, inventory: {...}|null}
// v1 saves ({version: 1, edits}) are migrated on load.
import { CHUNK_SIZE as CS, CHUNK_HEIGHT } from './constants.js';

const VERSION = 2;

export class SaveManager {
  constructor(worldSeed, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.seed = worldSeed;
    this.key = `frontier-craft:v${VERSION}:${worldSeed}`;
    this.legacyKey = `frontier-craft:v1:${worldSeed}`;
    this.storage = storage;
    this.byChunk = new Map();   // chunkKey -> Map(posKey -> [x,y,z,id])
    this.count = 0;
    this.entities = new Map();  // posKey -> {x,y,z,type,...} (plain JSON data)
    this.player = null;         // {x,y,z,yaw,pitch,health,food,saturation}
    this.inventory = null;      // {slots: [[id,count]|null], selected}
    this.dirty = false;
    this.enabled = true;
    this.disasterCells = new Set(); // cells currently owned by an active disaster journal (excluded from save)
    this.migrated = false;
    this.load();
    this.timer = null;
  }

  static chunkKey(x, z) { return Math.floor(x / CS) * 100000 + Math.floor(z / CS); }
  static posKey(x, y, z) { return `${x},${y},${z}`; }

  load() {
    if (!this.storage) return;
    try {
      let raw = this.storage.getItem(this.key);
      if (!raw) {
        raw = this.storage.getItem(this.legacyKey); // v1: edits only
        if (!raw) return;
        this.migrated = true;
      }
      const data = JSON.parse(raw);
      for (const [x, y, z, id] of data.edits || []) this._set(x, y, z, id);
      if (Array.isArray(data.entities)) for (const e of data.entities) if (e && typeof e.x === 'number') this.entities.set(SaveManager.posKey(e.x, e.y, e.z), e);
      this.player = data.player && typeof data.player.x === 'number' ? data.player : null;
      this.inventory = data.inventory && Array.isArray(data.inventory.slots) ? data.inventory : null;
      this.dirty = this.migrated; // a migrated save is rewritten in the new format on the next flush
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

  // ---------------------------------------------------------------- block entities (chest contents, crops)
  // data: plain object {type, ...} or null to remove. Stored as a snapshot (deep-copied through JSON on flush).
  setEntity(x, y, z, data) {
    if (!this.enabled) return;
    const pk = SaveManager.posKey(x, y, z);
    if (data) this.entities.set(pk, Object.assign({}, data, { x, y, z })); else this.entities.delete(pk);
    this.scheduleWrite();
  }
  getEntity(x, y, z) { return this.entities.get(SaveManager.posKey(x, y, z)) || null; }
  // Installs every saved entity into the world's block entity map (called once after the world is created).
  restoreEntities(world) {
    let n = 0;
    for (const e of this.entities.values()) { world.setBlockEntity(e.x, e.y, e.z, JSON.parse(JSON.stringify(e))); n++; }
    return n;
  }

  // ---------------------------------------------------------------- player + inventory
  setPlayer(state) {
    if (!this.enabled) return;
    const p = this.player;
    if (p && p.health === state.health && p.food === state.food && Math.abs(p.saturation - state.saturation) < 0.01 &&
        Math.abs(p.x - state.x) < 0.01 && Math.abs(p.y - state.y) < 0.01 && Math.abs(p.z - state.z) < 0.01 && Math.abs(p.yaw - state.yaw) < 0.01 && Math.abs(p.pitch - state.pitch) < 0.01 &&
        Math.abs((p.vehicleTick || 0) - (state.vehicleTick || 0)) < 100) return;
    this.player = Object.assign({}, state);
    this.scheduleWrite();
  }
  setInventory(data) {
    if (!this.enabled) return;
    const s = JSON.stringify(data);
    if (this.inventory && this._invJson === s) return;
    this._invJson = s;
    this.inventory = JSON.parse(s);
    this.scheduleWrite();
  }

  scheduleWrite() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 1500);
  }

  serialize() {
    const edits = [];
    for (const m of this.byChunk.values()) for (const e of m.values()) edits.push(e);
    return { version: VERSION, edits, entities: [...this.entities.values()], player: this.player, inventory: this.inventory };
  }

  flush() {
    if (!this.storage || !this.dirty) return;
    try { this.storage.setItem(this.key, JSON.stringify(this.serialize())); this.dirty = false; }
    catch (e) { console.warn('save write failed', e); }
  }

  clear() {
    this.byChunk.clear(); this.count = 0; this.entities.clear(); this.player = null; this.inventory = null; this._invJson = null; this.dirty = false;
    if (this.storage) { this.storage.removeItem(this.key); this.storage.removeItem(this.legacyKey); }
  }
}
