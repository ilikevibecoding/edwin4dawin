// Prop/material/decal/signage assets — owner: fable3
export const PROP_ASSETS = [
  {
    id: 'MAT-001', name: 'Graybox PBR material table (Phase-2 flat values)', category: 'material', owner: 'fable3',
    files: ['src/world/materials.js'], rooms: ['*'], dimensions: 'n/a', pivot: 'n/a',
    materials: ['(is the table)'], textures: ['flat colors — procedural maps land in Phase 3'],
    collision: 'n/a', lod: 'n/a', animations: null, audio: null,
    status: 'integrated', acceptance: 'coherent values; zero magenta fallbacks in any room',
    evidence: '', discrepancies: ['Phase 3 texture pass pending'],
  },
  {
    id: 'PROP-000', name: 'PLACEHOLDER pickup blocks (medkit/ammo/armor/keycard)', category: 'clutter', owner: 'fable3',
    files: ['src/game/game.js#spawnPickups'], rooms: ['break_room', 'security', 'utility', 'storage_n', 'server_room', 'it_room'],
    dimensions: '≤0.35 m', pivot: 'center', materials: ['plastic_dark'], textures: [],
    collision: 'none (interact radius)', lod: 'none', animations: ['bob/spin'], audio: ['pickup', 'keycard_read'],
    status: 'integrated', acceptance: 'MUST BE REPLACED by modeled props (Phase 4)', evidence: '', discrepancies: ['placeholder'],
  },
];
