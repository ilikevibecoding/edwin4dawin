// Character/weapon/vfx assets — owner: fable4
export const CHARACTER_ASSETS = [
  {
    id: 'CHR-000', name: 'PLACEHOLDER graybox bodies (enemy capsule, hostage capsule)', category: 'character', owner: 'fable4',
    files: ['src/characters/bodies.js'], rooms: ['*'],
    dimensions: 'human scale 1.7–1.8 m', pivot: 'floor center', materials: ['flat colors'], textures: [],
    collision: 'hit boxes: head/body/legs', lod: 'none',
    animations: ['move-bob', 'crouch', 'death-fall'], audio: ['enemy_bark', 'enemy_hurt', 'enemy_death'],
    status: 'integrated', acceptance: 'MUST BE REPLACED by rigged characters (Phase 4)', evidence: 'artifacts/p2_lobby.png', discrepancies: ['placeholder'],
  },
  {
    id: 'VFX-001', name: 'Impact/tracer/smoke/flash effect set (v1)', category: 'vfx', owner: 'fable4',
    files: ['src/fx/vfx.js'], rooms: ['*'],
    dimensions: 'n/a', pivot: 'n/a', materials: ['basic emissive'], textures: [],
    collision: 'n/a', lod: 'particle count by quality preset', animations: null,
    audio: ['per-event sfx'], status: 'integrated',
    acceptance: 'every impact surface distinct; smoke blocks AI sight; flash blinds',
    evidence: '', discrepancies: ['muzzle flash sprites, casings, glass shards pending'],
  },
];
