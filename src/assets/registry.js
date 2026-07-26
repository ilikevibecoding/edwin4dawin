// Asset registry: every production asset registers here with metadata.
// The QA gallery and the manifest generator read from this registry, so no
// unregistered asset can ship silently. `build` returns a display Object3D.
const REGISTRY = new Map();

export function registerAsset(def) {
  if (!def.id) throw new Error('asset def requires id');
  if (REGISTRY.has(def.id)) console.warn('[registry] duplicate asset id', def.id);
  REGISTRY.set(def.id, {
    category: 'prop', agent: 'unassigned', status: 'registered',
    ...def,
  });
}

export function listAssets(category) {
  const all = [...REGISTRY.values()];
  return (category ? all.filter((a) => a.category === category) : all)
    .map(({ build, ...meta }) => ({ ...meta, hasBuilder: !!build }));
}

export function buildAsset(id, game) {
  const def = REGISTRY.get(id);
  if (!def || !def.build) return null;
  const obj = def.build(game);
  if (obj) obj.name = 'asset_' + id;
  return obj;
}

export function getAsset(id) { return REGISTRY.get(id); }
export function assetCount() { return REGISTRY.size; }
