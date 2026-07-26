// Prop/material/decal/signage assets — owner: fable3
export const PROP_ASSETS = [
  {
    id: 'MAT-001', name: 'Procedural PBR material library (full texture pass)', category: 'material', owner: 'fable3',
    files: ['src/world/materials.js', 'src/world/textures.js'], rooms: ['*'], dimensions: 'n/a', pivot: 'n/a',
    materials: ['(is the table — 45 named materials, all texture-mapped)'],
    textures: [
      'canvas-generated base color (sRGB) + normal + roughness per family',
      'seeded Rng per generator (deterministic), seamless wrap, no baked directional light',
      'architectural tileables 512px, prop-scale utility 256px; lazy + cached (~1.0s for all 31 sets)',
      'families: painted drywall (+accent/blue), plaster, brick, ceiling tile (0.6m grid), loop carpet (+exec herringbone/worn), vinyl, ceramic tile (0.3m grout grid, dark + restroom variants), terrazzo lobby (0.8m slabs), concrete (+sealed/wet/garage tire-wear), snow, ice, wood veneer/laminate/door woods, powder-coat metals (+fire-door chips), brushed metals, plastics, rubber, fabrics, leather, paper, cardboard, ribbed entry mat, raised server floor (0.6m panels + corner screws)',
    ],
    collision: 'n/a', lod: 'n/a', animations: null, audio: null,
    status: 'integrated',
    acceptance: 'no gray boxes; families distinct; no visible repetition at gameplay distance; no baked-light artifacts; zero magenta fallbacks; zero console errors',
    evidence: 'artifacts/f3_lobby.png, f3_cubicles.png, f3_conference.png, f3_north_corridor.png, f3_break_room.png, f3_server_room.png, f3_server_close.png, f3_garage.png, f3_service_corridor.png, f3_restrooms.png, f3_exec_office.png, f3_spawn.png, f3_lobby_neutral.png, f3_corridor_neutral.png (see docs/reports/fable3-materials.md)',
    discrepancies: [
      'new names added for future prop work: brick, drywall_blue, wet_concrete, ice, carpet_worn, tile_restroom',
      'break_room shows a raised concrete strip crossing the vinyl floor — builder.js geometry (floor-rect boundary), not a material issue; flagged to Fable 2',
    ],
  },
  {
    id: 'PROP-000', name: 'PLACEHOLDER pickup blocks (medkit/ammo/armor/keycard)', category: 'clutter', owner: 'fable3',
    files: ['src/game/game.js#spawnPickups'], rooms: ['break_room', 'security', 'utility', 'storage_n', 'server_room', 'it_room'],
    dimensions: '≤0.35 m', pivot: 'center', materials: ['plastic_dark'], textures: [],
    collision: 'none (interact radius)', lod: 'none', animations: ['bob/spin'], audio: ['pickup', 'keycard_read'],
    status: 'integrated', acceptance: 'MUST BE REPLACED by modeled props (Phase 4)', evidence: '', discrepancies: ['placeholder'],
  },
];
