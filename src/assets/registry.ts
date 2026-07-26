/**
 * Runtime asset registry — the enforcement point for "no unregistered production
 * assets". Every builder (props, characters, weapons, materials, decals, audio
 * patches, UI graphics) must register its manifest record here at module-build time.
 * `tools/export-manifest.mjs` extracts this registry into docs/asset-manifest.md.
 */
export type AssetCategory =
  | 'architecture' | 'door' | 'glass' | 'furniture' | 'electronics' | 'breakroom'
  | 'restroom' | 'maintenance' | 'clutter' | 'signage' | 'material' | 'decal'
  | 'character' | 'weapon' | 'vfx' | 'ui' | 'audio';

export type AssetAgent =
  | 'Opus 1' | 'Opus 2' | 'Opus 3' | 'Opus 4'
  | 'Fable 1' | 'Fable 2' | 'Fable 3' | 'Fable 4';

export interface AssetRecord {
  id: string;
  name: string;
  category: AssetCategory;
  agent: AssetAgent;
  files: string;
  where: string;
  dims: string;
  pivot?: string;
  materials: string;
  textures?: string;
  /** e.g. none | static-aabb | static-mesh | dynamic | trigger (free-form detail allowed) */
  collision?: string;
  /** e.g. merged-static | instanced | none | billboard-far | shared-geometry */
  lod?: string;
  anim?: string;
  audio?: string;
  status: 'spec' | 'built' | 'integrated' | 'inspected' | 'accepted';
  accept: string;
  evidence?: string;
  notes?: string;
}

const registry = new Map<string, AssetRecord>();

export function registerAsset(rec: AssetRecord): string {
  const existing = registry.get(rec.id);
  if (existing) {
    // Re-registration with identical id is allowed only from the same builder
    // (hot reload); the latest record wins.
    registry.set(rec.id, { ...existing, ...rec });
    return rec.id;
  }
  registry.set(rec.id, rec);
  return rec.id;
}

export function updateAssetStatus(id: string, status: AssetRecord['status'], evidence?: string): void {
  const rec = registry.get(id);
  if (!rec) throw new Error(`Asset not registered: ${id}`);
  rec.status = status;
  if (evidence) rec.evidence = evidence;
}

export function getAsset(id: string): AssetRecord | undefined {
  return registry.get(id);
}

export function allAssets(): AssetRecord[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function assetCount(): number {
  return registry.size;
}
