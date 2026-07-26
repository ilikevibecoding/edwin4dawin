// Runtime asset registry. Every production asset must register here so QA's asset gallery and
// asset-ID overlay can enumerate them. Duplicate IDs overwrite (hot-reload safety).
const registry = new Map();

export function registerAsset(id, meta = {}) {
  registry.set(id, { id, ...meta });
  return id;
}

export function getAsset(id) { return registry.get(id); }
export function listAssets(categoryFilter = null) {
  const all = [...registry.values()];
  return categoryFilter ? all.filter((a) => a.category === categoryFilter) : all;
}
export function assetCount() { return registry.size; }
