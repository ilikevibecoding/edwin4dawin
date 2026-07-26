// Architecture & structural assets — owner: fable2 (map) / opus1 (system)
// Schema: docs/asset-manifest.md

export const ARCHITECTURE_ASSETS = [
  {
    id: 'MAP-001', name: 'Northstar Administrative Center — layout', category: 'architecture', owner: 'fable2',
    files: ['src/world/map.js'], rooms: ['*'],
    dimensions: 'interior 64 × 44 m ground + basement strip; plaza 18 × 12 m',
    pivot: 'world origin at NW interior corner', materials: ['(data only)'], textures: [],
    collision: 'derived (builder)', lod: 'n/a', animations: null, audio: null,
    status: 'integrated',
    acceptance: 'all 22 required areas present, ≥2 routes per hostage, loops, controlled long sightlines',
    evidence: 'artifacts/p2_lobby.png', discrepancies: ['graybox materials pending Phase 3+'],
  },
  {
    id: 'ARCH-001', name: 'Derived wall system (interior/exterior, holes, lintels, sills)', category: 'architecture', owner: 'fable2',
    files: ['src/world/builder.js#buildWalls'], rooms: ['*'],
    dimensions: 'thickness 0.16 m interior / 0.32 m exterior', pivot: 'n/a (generated)',
    materials: ['drywall', 'plaster', 'concrete'], textures: ['procedural (Phase 3)'],
    collision: 'AABB per segment', lod: 'merged static batches', animations: null, audio: null,
    status: 'integrated', acceptance: 'no gaps/leaks at any hole; collision matches visuals',
    evidence: 'artifacts/p2_spawn_north.png', discrepancies: ['needs baseboards/trim pass'],
  },
  {
    id: 'ARCH-002', name: 'Stair kit (straight flights, rails, ramps)', category: 'architecture', owner: 'fable2',
    files: ['src/world/builder.js#buildStairs'], rooms: ['stair_w', 'stairwell'],
    dimensions: 'riser 0.18 m, tread 0.22–0.26 m', pivot: 'n/a', materials: ['concrete', 'metal_dark'],
    textures: [], collision: 'ramp region + rails', lod: 'none', animations: null, audio: null,
    status: 'integrated', acceptance: 'player+AI+hostage traverse both directions', evidence: '', discrepancies: [],
  },
  {
    id: 'DOOR-001', name: 'Hinged door system (7 kinds, dual leaves)', category: 'door', owner: 'fable2',
    files: ['src/game/doors.js'], rooms: ['*'],
    dimensions: 'leaf 2.02 m × span', pivot: 'hinge jamb', materials: ['door_office', 'door_metal', 'door_fire', 'door_exec', 'mullion', 'frame_metal'],
    textures: ['procedural (Phase 3)'], collision: 'state-swapped AABBs', lod: 'none',
    animations: ['closed', 'opening', 'open', 'closing', 'locked'], audio: ['door_open', 'door_close', 'door_locked', 'door_unlock'],
    status: 'integrated', acceptance: 'never traps entities; AI opens; locked+keycard works', evidence: '', discrepancies: ['handles/signage detail pass pending'],
  },
  {
    id: 'GLAS-001', name: 'Glazing system (interior partitions, exterior windows, crack/break states)', category: 'glass', owner: 'fable2',
    files: ['src/world/builder.js#buildGlassWallsAndWindows'], rooms: ['lobby', 'conference', 'server_room', 'vestibule', 'exteriors'],
    dimensions: 'panes 0.8–2 m', pivot: 'n/a', materials: ['glass_clear', 'glass_frosted', 'glass_tinted', 'mullion', 'frame_metal'],
    textures: [], collision: 'per-pane AABB, sight rules per style', lod: 'none',
    animations: ['intact', 'cracked', 'broken'], audio: ['glass_crack', 'glass_break'],
    status: 'integrated', acceptance: 'reads as glass; crack→break chain; AI hears breaks', evidence: 'artifacts/p2_lobby.png', discrepancies: ['shard VFX pending Phase 4'],
  },
  {
    id: 'ARCH-003', name: 'Garage & dock shutters', category: 'architecture', owner: 'fable2',
    files: ['src/world/builder.js#buildShutters'], rooms: ['garage', 'loading'],
    dimensions: '8 × 2.9 m / 10 × 2.8 m', pivot: 'top rail', materials: ['metal_painted', 'metal_dark'],
    textures: [], collision: 'AABB removed on open', lod: 'none', animations: ['closed', 'opening(scripted)'], audio: ['(shutter rumble pending)'],
    status: 'integrated', acceptance: 'extraction script opens garage shutter', evidence: '', discrepancies: ['open sound pending'],
  },
  {
    id: 'VEH-000', name: 'PLACEHOLDER extraction van', category: 'vehicle', owner: 'fable4',
    files: ['src/game/game.js#spawnExtractionVan'], rooms: ['garage'],
    dimensions: '2.1 × 1.9 × 4.6 m', pivot: 'floor center', materials: ['metal_painted', 'metal_dark', 'rubber'],
    textures: [], collision: 'AABB', lod: 'none', animations: null, audio: null,
    status: 'integrated', acceptance: 'MUST BE REPLACED by detailed van (Phase 4)', evidence: '', discrepancies: ['placeholder'],
  },
];
