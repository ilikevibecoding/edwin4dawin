# Asset Manifest — Northstar Rescue

The manifest is split per domain to allow concurrent agent ownership without file conflicts.
Each domain file is a JSON array of entries following the schema below. The lead (Opus 1) owns this
index; each domain file is owned by the responsible agent.

| Domain file | Owner | Contents |
|---|---|---|
| `docs/manifest/architecture.json` | Fable 2 | Wall/floor/ceiling/stair/glass/door modules, exterior, shutters |
| `docs/manifest/props.json` | Fable 3 | Furniture, electronics, break room, restroom, maintenance, clutter, signage, decals |
| `docs/manifest/characters.json` | Fable 4 | FP arms, enemies, hostages, animations |
| `docs/manifest/weapons.json` | Fable 4 + Opus 2 | Weapon models, viewmodels, icons, VFX hookups |
| `docs/manifest/vfx.json` | Fable 4 | Particles, impacts, glass, smoke, flash, snow, casings |
| `docs/manifest/ui.json` | Fable 1 | Screens, HUD elements, icons, title treatment |
| `docs/manifest/audio.json` | Opus 1 | Synth sound profiles (weapons, surfaces, ambience, UI, voice) |
| `docs/manifest/materials.json` | Fable 3 | Procedural PBR material families |

## Entry schema (required fields)

```json
{
  "id": "PROP-DESK-STD-01",
  "name": "Standard office desk",
  "category": "furniture",
  "agent": "Fable 3",
  "files": ["src/props/library.js#buildDesk"],
  "locations": ["cubicle-floor", "it-workspace"],
  "dimensions_m": [1.6, 0.75, 0.8],
  "pivot": "floor-center, +Z faces user",
  "materialSlots": ["laminate", "paintedMetal", "hardPlastic"],
  "textures": ["laminate-oak-1k", "paintmetal-gray-1k"],
  "collision": "aabb",
  "lod": "none (<300 tris)",
  "animations": null,
  "audio": null,
  "status": "accepted | in-progress | specified",
  "acceptance": "reads as office desk at 3m; no z-fighting; AO grounded",
  "evidence": "artifacts/shots/props-desk.png",
  "discrepancies": []
}
```

Registration at runtime happens through `registerAsset(id, meta)` in `src/core/assets.js` so the QA
asset gallery and asset-ID overlay can enumerate all production assets. **No unregistered production
assets are permitted.**
