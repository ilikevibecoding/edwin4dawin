// BlockJournal: records the original block of every cell a disaster touches so the affected area can be
// restored completely (and gradually), and hashes the final state for deterministic replay tests.
import { World } from '../world.js';

export class BlockJournal {
  constructor() {
    this.entries = new Map(); // posKey -> {x,y,z,orig}
    this.order = [];          // posKeys in first-touch order
  }
  get size() { return this.entries.size; }

  // Record the original block id for a cell the first time it is modified.
  record(x, y, z, orig) {
    const k = World.posKey(x, y, z);
    if (this.entries.has(k)) return false;
    this.entries.set(k, { x, y, z, orig });
    this.order.push(k);
    return true;
  }

  has(x, y, z) { return this.entries.has(World.posKey(x, y, z)); }
  original(x, y, z) { const e = this.entries.get(World.posKey(x, y, z)); return e ? e.orig : undefined; }

  // Iterates entries newest-first (so restoring undoes damage in reverse) in batches.
  *restoreBatches(batchSize) {
    let batch = [];
    for (let i = this.order.length - 1; i >= 0; i--) {
      const e = this.entries.get(this.order[i]);
      if (!e) continue;
      batch.push(e);
      if (batch.length >= batchSize) { yield batch; batch = []; }
    }
    if (batch.length) yield batch;
  }

  clear() { this.entries.clear(); this.order.length = 0; }

  // Deterministic FNV-1a hash over (x,y,z,currentId) of all touched cells, order independent.
  hash(world) {
    const rows = [];
    for (const e of this.entries.values()) rows.push(`${e.x},${e.y},${e.z}:${world.getBlock(e.x, e.y, e.z)}`);
    rows.sort();
    let h = 0x811c9dc5;
    for (const r of rows) for (let i = 0; i < r.length; i++) { h ^= r.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return (h >>> 0).toString(16).padStart(8, '0') + ':' + rows.length;
  }

  // Serializable list of current changes (used when an admin commits disaster damage to the save)
  changes(world) {
    const out = [];
    for (const e of this.entries.values()) { const cur = world.getBlock(e.x, e.y, e.z); if (cur !== e.orig) out.push([e.x, e.y, e.z, cur]); }
    return out;
  }
}
