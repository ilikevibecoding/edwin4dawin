// Runtime asset registry. Every production asset must be registered here with
// the same metadata recorded in docs/asset-manifest.md. The QA gallery, the
// `render_game_to_text()` hook and the manifest audit test all read from this
// registry, which is how "no unregistered production asset" is enforced.

/**
 * @typedef {Object} AssetRecord
 * @property {string} id            Unique asset ID, e.g. "ARCH-WALL-STRAIGHT".
 * @property {string} name          Human readable name.
 * @property {string} category      architecture|door|glass|furniture|electronics|
 *                                  breakroom|restroom|maintenance|clutter|signage|
 *                                  material|decal|character|weapon|vfx|ui|audio
 * @property {string} owner         Responsible agent id (opus1..4, fable1..4).
 * @property {string[]} files       Source file locations.
 * @property {string[]} rooms       Intended rooms / game states.
 * @property {[number,number,number]} dims  Physical dimensions in metres (w,h,d).
 * @property {string} pivot         Pivot + orientation convention.
 * @property {string[]} materials   Material slot names.
 * @property {string[]} textures    Texture maps used.
 * @property {string} collision     none|aabb|box|compound|capsule|mesh|proxy
 * @property {string} lod           LOD strategy.
 * @property {string[]} [anims]     Animation states.
 * @property {string[]} [audio]     Audio dependencies.
 * @property {string} status        spec|wip|integrated|accepted
 * @property {string} acceptance    Acceptance criteria.
 * @property {string} evidence      Playwright evidence (screenshot / spec name).
 * @property {string} discrepancies Remaining discrepancies, "none" when clean.
 */

class AssetRegistry {
  constructor() {
    /** @type {Map<string, AssetRecord>} */
    this.records = new Map();
    /** @type {Map<string, number>} */
    this.instanceCounts = new Map();
  }

  /** @param {AssetRecord} rec */
  register(rec) {
    if (!rec || !rec.id) throw new Error('[assets] record requires an id');
    if (this.records.has(rec.id)) {
      // Re-registration during hot reload is fine; merge instead of throwing.
      Object.assign(this.records.get(rec.id), rec);
      return this.records.get(rec.id);
    }
    const full = {
      dims: [0, 0, 0],
      pivot: 'base-center, -Z forward',
      materials: [],
      textures: [],
      collision: 'none',
      lod: 'single mesh',
      rooms: [],
      files: [],
      anims: [],
      audio: [],
      status: 'spec',
      acceptance: '',
      evidence: '',
      discrepancies: 'none',
      ...rec,
    };
    this.records.set(rec.id, full);
    return full;
  }

  registerMany(list) {
    return list.map((r) => this.register(r));
  }

  get(id) {
    return this.records.get(id);
  }

  has(id) {
    return this.records.has(id);
  }

  /** Tag a three.js object with its asset id so the gallery/debug overlay can label it. */
  tag(object3d, id, extra = {}) {
    if (!object3d) return object3d;
    if (!this.records.has(id)) {
      console.warn(`[assets] object tagged with unregistered asset id "${id}"`);
    }
    object3d.userData.assetId = id;
    Object.assign(object3d.userData, extra);
    this.instanceCounts.set(id, (this.instanceCounts.get(id) || 0) + 1);
    return object3d;
  }

  countInstances(id) {
    return this.instanceCounts.get(id) || 0;
  }

  resetInstanceCounts() {
    this.instanceCounts.clear();
  }

  list(filter = {}) {
    let out = Array.from(this.records.values());
    if (filter.category) out = out.filter((r) => r.category === filter.category);
    if (filter.owner) out = out.filter((r) => r.owner === filter.owner);
    if (filter.status) out = out.filter((r) => r.status === filter.status);
    return out;
  }

  categories() {
    return Array.from(new Set(Array.from(this.records.values()).map((r) => r.category))).sort();
  }

  summary() {
    const byStatus = {};
    const byCategory = {};
    const byOwner = {};
    for (const r of this.records.values()) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byOwner[r.owner] = (byOwner[r.owner] || 0) + 1;
    }
    return { total: this.records.size, byStatus, byCategory, byOwner };
  }

  /** Records that are registered but never instantiated in the built level. */
  unusedRecords() {
    return this.list().filter(
      (r) => !['ui', 'audio', 'vfx', 'material', 'decal'].includes(r.category) && !this.instanceCounts.has(r.id)
    );
  }

  toJSON() {
    return Array.from(this.records.values());
  }
}

export const assets = new AssetRegistry();
