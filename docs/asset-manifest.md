# Asset Manifest — schema & registry

The manifest is code so the game itself can consume it (asset gallery, QA
`showAssetIds`). Domain files live in `assets/manifest/` — one file per owner,
merged by `assets/manifest/index.js`. **No agent may introduce a production
asset without registering it.**

## Entry schema

```js
{
  id: 'FURN-012',            // unique: <CAT>-<###>
  name: 'Standard work desk',
  category: 'furniture',     // architecture|door|glass|furniture|electronics|
                             // breakroom|restroom|maintenance|clutter|signage|
                             // decal|material|character|weapon|vfx|ui|audio|vehicle
  owner: 'fable3',           // opus1..4 | fable1..4
  files: ['src/world/props/furniture.js#createDesk'],
  rooms: ['cubicles','facilities','it_room'],   // or game states
  dimensions: '1.6 × 0.75 × 0.8 m',
  pivot: 'floor center, +Z faces user',
  materials: ['laminate','metal_painted','plastic_dark'],
  textures: ['procedural: laminate (worldRng)'],
  collision: 'AABB (auto from prop bounds)',
  lod: 'room chunk cull @ 40m',                  // or 'none (large)'
  animations: null,                              // or list
  audio: null,                                   // or sfx names
  status: 'accepted',        // spec | built | integrated | accepted
  acceptance: 'silhouette reads at 10m; no z-fight; legs touch floor',
  evidence: 'docs/screenshots/props_cubicles.png',
  discrepancies: [],
}
```

## Scoring gate (per prompt)

Silhouette, proportions, materials, texture quality, lighting response,
animation, integration, functional behavior, performance, visual-bible
consistency — each 1–5, **all ≥ 4 to accept**. Failures get a `discrepancies`
entry and stay `integrated` until fixed.

## Current domains

- `assets/manifest/architecture.js` — Fable 2 (walls/floors/stairs/doors/glass kits)
- `assets/manifest/props.js` — Fable 3 (furniture, electronics, break/restroom, maintenance, clutter, signage, decals, materials)
- `assets/manifest/characters.js` — Fable 4 (characters, arms, weapons, vfx)
- `assets/manifest/ui.js` — Fable 1 (screens, HUD elements, icons)
- `assets/manifest/audio.js` — lead (synth sound set)
