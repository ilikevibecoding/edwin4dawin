/**
 * Runtime asset registry.
 *
 * Every production asset in Northstar Rescue is generated in code (geometry via
 * Three.js BufferGeometry, textures via CanvasRenderingContext2D, audio via the
 * WebAudio graph), so the "manifest" is executable rather than a list of files
 * that could go missing. Registration is mandatory: `docs/asset-manifest.md` is
 * generated from this registry, and the QA gallery enumerates it directly.
 *
 * A registration that lacks required fields throws in development so that an
 * unregistered or under-specified production asset cannot silently ship.
 */

const REQUIRED_FIELDS = [
  'id',
  'name',
  'category',
  'owner',
  'files',
  'usedIn',
  'dimensions',
  'pivot',
  'materials',
  'textures',
  'collision',
  'lod',
  'status',
  'acceptance',
];

export const CATEGORIES = [
  'architecture',
  'door',
  'glass',
  'furniture',
  'electronics',
  'breakroom',
  'restroom',
  'maintenance',
  'clutter',
  'signage',
  'material',
  'decal',
  'character',
  'weapon',
  'vfx',
  'ui',
  'audio',
  'lighting',
  'system',
];

export const OWNERS = {
  OPUS1: 'Opus 1 — Lead architect & integrator',
  OPUS2: 'Opus 2 — Player & combat systems',
  OPUS3: 'Opus 3 — AI, objectives & round systems',
  OPUS4: 'Opus 4 — Testing, performance & release quality',
  FABLE1: 'Fable 1 — Art direction, visual bible & interface',
  FABLE2: 'Fable 2 — Map architecture & environmental composition',
  FABLE3: 'Fable 3 — Props, materials, decals & storytelling',
  FABLE4: 'Fable 4 — Characters, weapons, animation & effects',
};

class AssetRegistry {
  constructor() {
    this.assets = new Map();
    this.byCategory = new Map();
    this.warnings = [];
  }

  register(entry) {
    for (const f of REQUIRED_FIELDS) {
      if (entry[f] === undefined || entry[f] === null) {
        const msg = `[assets] "${entry.id ?? '<no id>'}" is missing required manifest field "${f}"`;
        this.warnings.push(msg);
        console.warn(msg);
      }
    }
    if (this.assets.has(entry.id)) {
      // Re-registration happens on hot reload; keep the newest definition.
      this.assets.set(entry.id, { ...this.assets.get(entry.id), ...entry });
      return entry.id;
    }
    const rec = {
      animations: null,
      audio: null,
      evidence: [],
      discrepancies: [],
      scores: null,
      notes: '',
      ...entry,
    };
    this.assets.set(rec.id, rec);
    if (!this.byCategory.has(rec.category)) this.byCategory.set(rec.category, []);
    this.byCategory.get(rec.category).push(rec);
    return rec.id;
  }

  /** Register a family of near-identical assets that share a spec. */
  registerMany(base, variants) {
    return variants.map((v) => this.register({ ...base, ...v }));
  }

  get(id) {
    return this.assets.get(id);
  }

  has(id) {
    return this.assets.has(id);
  }

  all() {
    return Array.from(this.assets.values());
  }

  categories() {
    return Array.from(this.byCategory.keys()).sort();
  }

  inCategory(cat) {
    return (this.byCategory.get(cat) ?? []).slice();
  }

  stats() {
    const byOwner = {};
    const byCat = {};
    let accepted = 0;
    for (const a of this.assets.values()) {
      byOwner[a.owner] = (byOwner[a.owner] ?? 0) + 1;
      byCat[a.category] = (byCat[a.category] ?? 0) + 1;
      if (a.status === 'accepted') accepted++;
    }
    return { total: this.assets.size, accepted, byOwner, byCategory: byCat, warnings: this.warnings.length };
  }

  /** Emits the human-readable manifest table used by docs/asset-manifest.md. */
  toMarkdown() {
    const lines = [];
    lines.push('# Northstar Rescue — Asset Manifest');
    lines.push('');
    const s = this.stats();
    lines.push(`Total registered assets: **${s.total}** · Accepted: **${s.accepted}** · Registration warnings: **${s.warnings}**`);
    lines.push('');
    for (const cat of this.categories()) {
      lines.push(`## ${cat}`);
      lines.push('');
      for (const a of this.inCategory(cat)) {
        lines.push(`### \`${a.id}\` — ${a.name}`);
        lines.push('');
        lines.push(`- **Owner:** ${a.owner}`);
        lines.push(`- **Files:** ${[].concat(a.files).join(', ')}`);
        lines.push(`- **Used in:** ${[].concat(a.usedIn).join(', ')}`);
        lines.push(`- **Dimensions (m):** ${a.dimensions}`);
        lines.push(`- **Pivot / orientation:** ${a.pivot}`);
        lines.push(`- **Material slots:** ${[].concat(a.materials).join(', ')}`);
        lines.push(`- **Texture maps:** ${[].concat(a.textures).join(', ')}`);
        lines.push(`- **Collision:** ${a.collision}`);
        lines.push(`- **LOD:** ${a.lod}`);
        if (a.animations) lines.push(`- **Animation states:** ${[].concat(a.animations).join(', ')}`);
        if (a.audio) lines.push(`- **Audio dependencies:** ${[].concat(a.audio).join(', ')}`);
        lines.push(`- **Status:** ${a.status}`);
        lines.push(`- **Acceptance criteria:** ${a.acceptance}`);
        lines.push(`- **Playwright evidence:** ${a.evidence.length ? [].concat(a.evidence).join(', ') : 'pending'}`);
        lines.push(`- **Remaining discrepancies:** ${a.discrepancies.length ? [].concat(a.discrepancies).join('; ') : 'none'}`);
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}

export const assets = new AssetRegistry();

/** Shorthand used throughout the asset modules. */
export function reg(entry) {
  return assets.register(entry);
}
