import { assets } from '../core/assets.js';

// ---------------------------------------------------------------------------
// Architecture asset manifest.  (owner: fable2)
//
// Every architectural module that appears in the built level is registered
// here with the metadata required by docs/asset-manifest.md. `assets.tag()`
// calls in src/map/build.js, src/map/doors.js and src/map/lighting.js refer to
// these IDs, and tests/assets.spec.js fails if a tagged object has no record.
// ---------------------------------------------------------------------------

const F = ['src/map/kit.js', 'src/map/build.js', 'src/map/layout.js'];
const ALL_INTERIOR = ['all interior rooms'];

/** @type {Array<Partial<import('../core/assets.js').AssetRecord>>} */
const RECORDS = [
  // ------------------------------------------------------------------ walls
  {
    id: 'ARCH-WALL-STRAIGHT', name: 'Straight Interior Partition', category: 'architecture',
    rooms: ALL_INTERIOR, dims: [1, 3.0, 0.1],
    pivot: 'base centre; run along local +X, faces ±Z',
    materials: ['drywall-face-a', 'drywall-face-b', 'baseboard'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'compound (one AABB per solid piece around each opening)',
    lod: 'single mesh; 2.5 m per texture tile',
    acceptance: 'Runs floor to structural deck so no light leaks over it; 6 mm chamfer on every exposed arris; baseboard and correct finish on each side.',
    evidence: 'tests/rooms.spec.js, artifacts/screenshots/room-*.png',
  },
  {
    id: 'ARCH-WALL-EXT', name: 'Exterior Wall Module', category: 'architecture',
    rooms: ['building envelope'], dims: [1, 7.6, 0.24],
    pivot: 'base centre; run along local +X',
    materials: ['exterior-face', 'interior-face', 'baseboard'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'compound AABB', lod: 'single mesh',
    acceptance: '240 mm thick, full building height, no gap at any junction, no sky visible from inside.',
    evidence: 'tests/rooms.spec.js',
  },
  {
    id: 'ARCH-WALL-CORNER', componentOf: 'ARCH-WALL-STRAIGHT', name: 'Wall Corner Junction (interior & exterior)', category: 'architecture',
    rooms: ALL_INTERIOR, dims: [0.1, 3.0, 0.1],
    pivot: 'base centre of the corner post',
    materials: ['drywall'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'shared with the adjoining wall segments', lod: 'single mesh',
    acceptance: 'Corners close exactly — the wall derivation in build.js splits every shared edge so no seam or gap can open.',
    evidence: 'tests/movement.spec.js (containment test)',
  },
  {
    id: 'ARCH-HALFWALL', name: 'Half Wall / Knee Wall', category: 'architecture',
    rooms: ['lobby', 'waiting', 'openoffice'], dims: [1, 1.1, 0.12],
    pivot: 'base centre', materials: ['drywall', 'cap-trim'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'aabb', lod: 'single mesh',
    acceptance: 'Reads as usable waist-high cover with a capped top edge.',
    evidence: 'artifacts/screenshots/room-lobby.png',
  },
  {
    id: 'ARCH-COLUMN', name: 'Structural Column', category: 'architecture',
    rooms: ['lobby', 'openoffice', 'loading'], dims: [0.42, 3.0, 0.42],
    pivot: 'base centre', materials: ['drywall', 'base-cap'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'aabb', lod: 'single mesh',
    acceptance: 'Base and cap detail present; 12 mm chamfer; breaks the open-office sightline without blocking the aisle.',
    evidence: 'artifacts/screenshots/room-openoffice.png',
  },
  {
    id: 'ARCH-BASEBOARD', componentOf: 'ARCH-WALL-STRAIGHT', name: 'Baseboard / Skirting', category: 'architecture',
    rooms: ALL_INTERIOR, dims: [1, 0.105, 0.122], pivot: 'base centre',
    materials: ['painted-trim'], textures: ['baseColor', 'roughness'],
    collision: 'none (inside the wall collider)', lod: 'single mesh',
    acceptance: 'Continuous along every finished wall, returns into door casings, 4 mm chamfer.',
    evidence: 'artifacts/screenshots/room-lobby.png',
  },
  {
    id: 'ARCH-CROWN-TRIM', componentOf: 'ARCH-WALL-STRAIGHT', name: 'Crown / Edge Trim', category: 'architecture',
    rooms: ['lobby', 'execcorr', 'execoffice', 'conference'], dims: [1, 0.06, 0.13],
    pivot: 'top centre', materials: ['painted-trim'], textures: ['baseColor', 'roughness'],
    collision: 'none', lod: 'single mesh',
    acceptance: 'Used only in the finished public and executive spaces, absent in back of house.',
    evidence: 'artifacts/screenshots/room-execcorr.png',
  },

  // ------------------------------------------------------------------ floors
  {
    id: 'ARCH-FLOOR-CARPET', name: 'Carpet Floor Module', category: 'architecture',
    rooms: ['openoffice', 'conference', 'waiting', 'eastlink', 'execcorr', 'execoffice', 'upperlanding'],
    dims: [1, 0.3, 1], pivot: 'top face centre', materials: ['carpet'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'aabb (top face walkable)',
    lod: 'single slab per room region; 2 m per texture tile',
    acceptance: 'Loop-pile relief visible at grazing angles; traffic wear where routes converge; no stretched UVs.',
    evidence: 'tests/rooms.spec.js',
  },
  {
    id: 'ARCH-FLOOR-TILE', name: 'Ceramic / Terrazzo Tile Floor Module', category: 'architecture',
    rooms: ['entrance', 'vestibule', 'lobby', 'restrooms'], dims: [1, 0.3, 1],
    pivot: 'top face centre', materials: ['ceramic-tile'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'aabb',
    lod: 'single slab; 2.4 m per tile', acceptance: 'Grout lines recessed, tiles glossy, per-tile value variation.',
    evidence: 'artifacts/screenshots/room-vestibule.png',
  },
  {
    id: 'ARCH-FLOOR-VINYL', name: 'Vinyl Composition Tile Floor Module', category: 'architecture',
    rooms: ['breakroom', 'midcorr', 'copyroom', 'itroom', 'archive'], dims: [1, 0.3, 1],
    pivot: 'top face centre', materials: ['vct'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'aabb',
    lod: 'single slab; 2.4 m per tile', acceptance: 'Buffed sheen with dirt in the seams; aggregate speckle reads at 1 m.',
    evidence: 'artifacts/screenshots/room-breakroom.png',
  },
  {
    id: 'ARCH-FLOOR-CONCRETE', name: 'Concrete Floor Module', category: 'architecture',
    rooms: ['serverroom', 'mechanical', 'servicecorr', 'loading', 'garage', 'weststair', 'janitor'],
    dims: [1, 0.3, 1], pivot: 'top face centre', materials: ['concrete'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'aabb',
    lod: 'single slab; 4 m per tile', acceptance: 'Sealed and unsealed variants differ in roughness; hairline cracks, no tiling repeats within a room.',
    evidence: 'artifacts/screenshots/room-loading.png',
  },
  {
    id: 'ARCH-FLOOR-SNOW', name: 'Snow Ground Plane', category: 'architecture',
    rooms: ['courtyard', 'eastapron'], dims: [1, 0.5, 1], pivot: 'top face centre',
    materials: ['snow'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'aabb', lod: 'single slab; 4 m per tile',
    acceptance: 'Drift relief and sparkle without reading as white plastic; footprint decals sit flat on it.',
    evidence: 'artifacts/screenshots/room-courtyard.png',
  },

  // ---------------------------------------------------------------- ceilings
  {
    id: 'ARCH-CEIL-GRID', name: 'Suspended Ceiling Grid', category: 'architecture',
    rooms: ['vestibule', 'waiting', 'openoffice', 'conference', 'breakroom', 'restrooms', 'midcorr', 'copyroom', 'itroom', 'archive', 'execcorr', 'execoffice', 'upperlanding', 'eastlink'],
    dims: [0.6, 0.05, 1.2], pivot: 'grid centre at ceiling height',
    materials: ['t-bar', 'ceiling-tile', 'ceiling-tile-stained'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'none (deck collider above)',
    lod: 'shared tile geometry, one draw per tile batch',
    anims: ['intact', 'stained', 'missing'],
    acceptance: 'Fissured tile face, exposed T-bar, slight per-tile sag and rotation so the grid never reads as a perfect CG plane; stained and missing variants placed deliberately.',
    evidence: 'artifacts/screenshots/room-servicecorr.png',
  },
  {
    id: 'ARCH-CEIL-TILE-INTACT', componentOf: 'ARCH-CEIL-GRID', name: 'Acoustic Ceiling Tile (intact)', category: 'architecture',
    rooms: ALL_INTERIOR, dims: [0.576, 0.016, 1.176], pivot: 'centre',
    materials: ['ceiling-tile'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'none', lod: 'shared geometry',
    acceptance: 'Worley-pitted face, off-white, no baked lighting.', evidence: 'gallery capture',
  },
  {
    id: 'ARCH-CEIL-TILE-STAINED', componentOf: 'ARCH-CEIL-GRID', name: 'Acoustic Ceiling Tile (water stained)', category: 'architecture',
    rooms: ['restrooms', 'janitor', 'servicecorr', 'copyroom'], dims: [0.576, 0.016, 1.176],
    pivot: 'centre', materials: ['ceiling-tile-stained'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'none', lod: 'shared geometry',
    acceptance: 'Concentric tide-line rings, darker toward the centre; paired with a water-stain decal on the floor below.',
    evidence: 'artifacts/screenshots/room-restrooms.png',
  },
  {
    id: 'ARCH-CEIL-TILE-MISSING', componentOf: 'ARCH-CEIL-GRID', name: 'Missing Ceiling Tile (open plenum)', category: 'architecture',
    rooms: ['servicecorr', 'copyroom'], dims: [0.6, 0, 1.2], pivot: 'grid cell centre',
    materials: [], textures: [], collision: 'none', lod: 'n/a',
    acceptance: 'Reveals duct/conduit above rather than a black void.',
    evidence: 'artifacts/screenshots/room-servicecorr.png',
  },
  {
    id: 'ARCH-CEIL-PLASTER', name: 'Hard Plaster Ceiling', category: 'architecture',
    rooms: ['entrance', 'lobby', 'stairwell'], dims: [1, 0.08, 1], pivot: 'centre',
    materials: ['plaster'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'none (deck above)', lod: 'single mesh',
    acceptance: 'Used where the room is double height and a suspended grid would look wrong.',
    evidence: 'artifacts/screenshots/room-lobby.png',
  },
  {
    id: 'ARCH-CEIL-CONCRETE', name: 'Exposed Concrete Soffit', category: 'architecture',
    rooms: ['serverroom', 'mechanical', 'garage', 'loading', 'servicecorr', 'weststair', 'janitor'],
    dims: [1, 0.08, 1], pivot: 'centre', materials: ['concrete'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'none', lod: 'single mesh',
    acceptance: 'Back-of-house rooms show structure, not finish.', evidence: 'artifacts/screenshots/room-mechanical.png',
  },
  {
    id: 'ARCH-ROOF-EDGE', name: 'Roof Slab & Parapet', category: 'architecture',
    rooms: ['visible from courtyard and east apron'], dims: [1, 0.34, 1], pivot: 'centre',
    materials: ['concrete'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'aabb', lod: 'single mesh',
    acceptance: 'Caps every interior volume so the sky never leaks in; parapet visible from the exterior on the tall volumes.',
    evidence: 'artifacts/screenshots/room-courtyard.png',
  },

  // ------------------------------------------------- openings & circulation
  {
    id: 'ARCH-DOORFRAME', name: 'Door Frame & Threshold', category: 'architecture',
    rooms: ALL_INTERIOR, dims: [1.06, 2.16, 0.13], pivot: 'base centre of the opening',
    materials: ['painted-frame', 'aluminium-threshold'], textures: ['baseColor', 'roughness'],
    collision: 'shared with the wall pieces', lod: 'single mesh',
    acceptance: 'Jambs, head and threshold present with a real reveal; the door leaf hangs inside it without clipping.',
    evidence: 'tests/doors.spec.js',
  },
  {
    id: 'ARCH-CASED-OPENING', name: 'Cased Opening (no leaf)', category: 'architecture',
    rooms: ['lobby', 'openoffice', 'midcorr', 'breakroom', 'servicecorr', 'loading', 'stairwell', 'execcorr'],
    dims: [1, 2.4, 0.12], pivot: 'base centre of the opening',
    materials: ['painted-casing'], textures: ['baseColor', 'roughness'],
    collision: 'shared with the wall pieces', lod: 'single mesh',
    acceptance: 'Reads as a built aperture with a casing, not a hole cut in a wall.',
    evidence: 'artifacts/screenshots/room-midcorr.png',
  },
  {
    id: 'ARCH-WINDOWFRAME', name: 'Exterior Window Frame', category: 'architecture',
    rooms: ['lobby', 'waiting', 'breakroom', 'conference', 'execoffice', 'execcorr', 'upperlanding', 'archive', 'loading'],
    dims: [3.0, 1.6, 0.26], pivot: 'base centre of the opening',
    materials: ['anodised-aluminium', 'painted-stool'], textures: ['baseColor', 'normal', 'roughness'],
    collision: 'shared with the glazing collider', lod: 'single mesh',
    acceptance: 'Head, sill, jambs, mullions and an interior stool board; mullion count scales with the opening width.',
    evidence: 'artifacts/screenshots/room-lobby.png',
  },
  {
    id: 'ARCH-INTWINFRAME', name: 'Interior Glazed Screen Frame', category: 'architecture',
    rooms: ['vestibule', 'lobby', 'conference', 'execcorr'], dims: [2.2, 1.4, 0.12],
    pivot: 'base centre of the opening', materials: ['painted-steel-frame'],
    textures: ['baseColor', 'normal', 'roughness'], collision: 'shared with the glazing collider',
    lod: 'single mesh', acceptance: 'Slimmer than the exterior frame and a different finish, so interior and exterior glazing read differently.',
    evidence: 'artifacts/screenshots/room-conference.png',
  },
  {
    id: 'ARCH-BLINDS', name: 'Venetian Blinds', category: 'architecture',
    rooms: ['lobby', 'waiting', 'breakroom', 'conference', 'execoffice', 'archive'],
    dims: [3.0, 1.6, 0.06], pivot: 'top centre at the window head',
    materials: ['blind-slat', 'headrail'], textures: ['baseColor', 'roughness'],
    collision: 'none', lod: 'single mesh',
    anims: ['raised', 'partially lowered (35%)', 'lowered (85%)'],
    acceptance: 'Individual tilted slats, headrail, at least two drop states across the building.',
    evidence: 'artifacts/screenshots/room-conference.png',
  },
  {
    id: 'ARCH-STAIR-RUN', name: 'Stair Flight', category: 'architecture',
    rooms: ['stairwell', 'weststair'], dims: [2.6, 4.0, 5.8],
    pivot: 'base of the bottom riser, ascending toward -Z',
    materials: ['tread', 'riser', 'stringer'], textures: ['baseColor', 'normal', 'roughness', 'ao'],
    collision: 'one AABB per step (exact step-up behaviour)', lod: 'single mesh',
    acceptance: '200 mm rise / 290 mm going, 20 risers, nosing overhang, closed risers, painted steel stringers; traversable up and down by the player, enemies and hostages.',
    evidence: 'tests/ai.spec.js, tests/hostages.spec.js',
  },
  {
    id: 'ARCH-STAIR-LANDING', componentOf: 'ARCH-STAIR-RUN', name: 'Stair Landing Slab', category: 'architecture',
    rooms: ['stairwell', 'weststair', 'upperlanding', 'upperweststair'], dims: [2.6, 0.28, 2.5],
    pivot: 'top face centre', materials: ['tread'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'aabb', lod: 'single mesh',
    acceptance: 'Landings exist at the head of both flights and are walkable, so the mezzanine is reachable.',
    evidence: 'tests/rooms.spec.js (upperlanding, archive, execoffice)',
  },
  {
    id: 'ARCH-RAILING', name: 'Guard Rail / Balustrade', category: 'architecture',
    rooms: ['stairwell', 'weststair', 'execcorr', 'upperlanding'], dims: [1, 1.07, 0.06],
    pivot: 'base centre, running along local X',
    materials: ['stainless-post', 'glass-infill'], textures: ['baseColor', 'roughness'],
    collision: 'aabb along the run (does not block sight)', lod: 'single mesh',
    acceptance: 'Posts, top rail, mid rail and glass infill; prevents falling into the atrium without blocking the view down.',
    evidence: 'artifacts/screenshots/room-execcorr.png',
  },

  // ---------------------------------------------------- services & utility
  {
    id: 'ARCH-DUCT', name: 'HVAC Duct Run', category: 'architecture',
    rooms: ['servicecorr', 'mechanical', 'loading', 'garage', 'serverroom'],
    dims: [1, 0.35, 0.5], pivot: 'centre, running along local X',
    materials: ['galvanised-steel'], textures: ['baseColor', 'normal', 'roughness'],
    collision: 'aabb', lod: 'single mesh',
    acceptance: 'Flanged joints at 1.5 m; visible where the ceiling is open or a tile is missing.',
    evidence: 'artifacts/screenshots/room-servicecorr.png',
  },
  {
    id: 'ARCH-PIPE', name: 'Pipe Run with Couplings', category: 'architecture',
    rooms: ['mechanical', 'servicecorr', 'janitor', 'restrooms', 'garage'],
    dims: [1, 0.1, 0.1], pivot: 'centre, running along local X',
    materials: ['painted-steel'], textures: ['baseColor', 'normal', 'roughness'],
    collision: 'aabb', lod: 'single mesh',
    acceptance: 'Couplings every 2.2 m; colour-coded service painting.',
    evidence: 'artifacts/screenshots/room-mechanical.png',
  },
  {
    id: 'ARCH-CABLETRAY', name: 'Cable Tray with Bundles', category: 'architecture',
    rooms: ['serverroom', 'itroom', 'servicecorr', 'mechanical'], dims: [1, 0.08, 0.32],
    pivot: 'centre, running along local X', materials: ['tray-steel', 'cable-jacket'],
    textures: ['baseColor', 'normal', 'roughness'], collision: 'aabb', lod: 'single mesh',
    acceptance: 'Side rails, rungs and four cable bundles; reads as a real containment system.',
    evidence: 'artifacts/screenshots/room-serverroom.png',
  },
  {
    id: 'ARCH-ACCESS-PANEL', name: 'Utility Access Panel', category: 'architecture',
    rooms: ['servicecorr', 'mechanical', 'restrooms', 'janitor', 'stairwell'], dims: [0.5, 0.5, 0.02],
    pivot: 'panel centre, faces +Z', materials: ['painted-metal', 'screw'],
    textures: ['baseColor', 'normal', 'roughness'], collision: 'none', lod: 'single mesh',
    acceptance: 'Recessed inner leaf and four corner fixings.', evidence: 'gallery capture',
  },
  {
    id: 'ARCH-FLOORDRAIN', name: 'Floor Drain Grate', category: 'architecture',
    rooms: ['mechanical', 'garage', 'restrooms', 'janitor'], dims: [0.26, 0.02, 0.26],
    pivot: 'top face centre', materials: ['cast-iron'], textures: ['baseColor', 'normal', 'roughness'],
    collision: 'none', lod: 'single mesh',
    acceptance: 'Sits flush in the slab with no z-fighting against the floor.', evidence: 'artifacts/screenshots/room-garage.png',
  },
  {
    id: 'ARCH-LOADING-DOCK', name: 'Loading Dock Structure', category: 'architecture',
    rooms: ['loading'], dims: [6.0, 1.1, 2.4], pivot: 'base centre',
    materials: ['concrete', 'rubber-bumper', 'steel-edge'],
    textures: ['baseColor', 'normal', 'roughness', 'ao'], collision: 'compound aabb',
    lod: 'single mesh',
    acceptance: 'Dock edge, steel nosing and rubber bumpers at truck-bed height; climbable via steps, and the step-up behaviour is consistent.',
    evidence: 'artifacts/screenshots/room-loading.png',
  },
  {
    id: 'ARCH-GARAGE-SHUTTER', name: 'Rolling Garage Shutter', category: 'architecture',
    rooms: ['garage'], dims: [4.6, 3.8, 0.18], pivot: 'base centre of the opening',
    materials: ['painted-slat', 'guide-rail', 'drum'], textures: ['baseColor', 'normal', 'roughness'],
    collision: 'aabb, removed as the curtain rises',
    lod: 'slats culled as they roll away',
    anims: ['closed', 'raising', 'open'], audio: ['door_shutter_motor', 'door_shutter_stop'],
    acceptance: 'Individual slats, guide rails and a head drum; opening it removes the collider and enables extraction.',
    evidence: 'tests/doors.spec.js, tests/mission.spec.js',
  },
];

const LIGHT_RECORDS = [
  {
    id: 'LIGHT-TROFFER', name: '1200 mm Recessed Troffer', dims: [1.22, 0.07, 0.62],
    rooms: ['office-zone rooms'], materials: ['housing', 'diffuser-emissive'],
    acceptance: 'Emissive diffuser reads as lit even when its point light is culled; tired-tube variant is slightly green.',
  },
  {
    id: 'LIGHT-DOWNLIGHT', name: 'Recessed Downlight', dims: [0.26, 0.05, 0.26],
    rooms: ['lobby', 'entrance', 'execcorr', 'execoffice', 'upperlanding'],
    materials: ['can', 'lens-emissive'],
    acceptance: 'Pendant stem in double-height spaces; warm in executive areas, cool in the lobby.',
  },
  {
    id: 'LIGHT-STRIP', name: 'Surface Strip Light', dims: [1.4, 0.07, 0.09],
    rooms: ['servicecorr', 'mechanical', 'serverroom', 'weststair', 'janitor', 'loading', 'garage'],
    materials: ['body', 'tube-emissive'],
    acceptance: 'Bare-tube back-of-house fixture; one flickers.',
  },
  {
    id: 'LIGHT-EMERGENCY', name: 'Emergency Twin-Spot', dims: [0.26, 0.11, 0.1],
    rooms: ['servicecorr', 'weststair', 'upperweststair', 'mechanical', 'garage', 'janitor'],
    materials: ['body', 'lamp-emissive'],
    acceptance: 'Two red spot heads; becomes the only light source in the blackout lighting scenario.',
  },
  {
    id: 'SIGN-EXIT', name: 'Illuminated Exit Sign', dims: [0.34, 0.15, 0.03],
    rooms: ['lobby', 'midcorr', 'servicecorr', 'garage', 'stairwell', 'weststair'],
    materials: ['panel-emissive', 'bracket'],
    acceptance: 'Green emissive panel readable from the far end of the corridor; doubles as navigation lighting.',
  },
  {
    id: 'SIGN-DOOR-PLATE', name: 'Door Sign Plate', dims: [0.24, 0.09, 0.006],
    rooms: ALL_INTERIOR, materials: ['sign-face'],
    acceptance: 'Original room names and numbers, legible at 2 m, abstracted at distance.',
  },
];

const DOOR_RECORDS = [
  {
    id: 'DOOR-STANDARD', name: 'Standard Office Door', dims: [0.95, 2.1, 0.045],
    rooms: ['breakroom', 'restrooms', 'janitor', 'copyroom', 'mechanical', 'archive'],
    materials: ['wood-veneer-face', 'edge-trim', 'brushed-hardware', 'aluminium-kickplate'],
    anims: ['closed', 'opening', 'open', 'closing'],
    audio: ['door_wood_open', 'door_wood_close', 'door_handle', 'door_impact'],
    acceptance: 'Timber leaf with recessed panels, lever handle both sides, three hinges, kick plate; hinge-side pivot, collider clears as the leaf swings past 50%, AI paths through it.',
  },
  {
    id: 'DOOR-GLASS', name: 'Glazed Office Door', dims: [0.95, 2.1, 0.045],
    rooms: ['entrance', 'vestibule', 'lobby', 'conference', 'itroom', 'execoffice'],
    materials: ['anodised-stile', 'clear-glass', 'brushed-hardware'],
    anims: ['closed', 'opening', 'open', 'closing', 'damaged'],
    audio: ['door_glass_open', 'door_glass_close', 'glass_crack', 'glass_shatter'],
    acceptance: 'Stile-and-rail leaf with a real glazed panel that reads as glass and does not block line of sight; double-leaf variant used at the entrance and vestibule.',
  },
  {
    id: 'DOOR-FIRE', name: 'Fire Door', dims: [0.95, 2.1, 0.045],
    rooms: ['weststair', 'upperweststair', 'conference', 'loading'],
    materials: ['painted-steel-face', 'vision-panel-glass', 'push-bar', 'overhead-closer'],
    anims: ['closed', 'opening', 'open', 'closing', 'damaged'],
    audio: ['door_fire_open', 'door_fire_close', 'door_impact'],
    acceptance: 'Vision panel both sides, push bar on the egress side, overhead closer with arm, 260 HP before failing; signed "FIRE DOOR — KEEP SHUT".',
  },
  {
    id: 'DOOR-SECURITY', name: 'Security Door', dims: [1.05, 2.1, 0.045],
    rooms: ['vestibule', 'serverroom'],
    materials: ['dark-painted-steel', 'push-bar', 'overhead-closer'],
    anims: ['locked', 'unlocked', 'opening', 'open', 'closing', 'damaged'],
    audio: ['door_metal_open', 'door_metal_close', 'door_locked', 'door_unlocked'],
    acceptance: 'Starts locked; refuses until the IT-workshop key card is collected, then the reader LED turns green and it opens. Reports `locked` in the text state.',
  },
  {
    id: 'DOOR-CARDREADER', name: 'Door Card Reader', dims: [0.075, 0.12, 0.022],
    rooms: ['vestibule', 'serverroom'],
    materials: ['reader-shell', 'status-led-emissive'],
    anims: ['denied (red)', 'granted (green)'],
    audio: ['door_locked', 'door_unlocked'],
    acceptance: 'Mounted at 1.15 m on the handle side; emissive LED changes colour on a successful read and resets on mission restart.',
  },
];

const GLASS_RECORDS = [
  {
    id: 'GLASS-CLEAR', name: 'Clear Glazing Pane', rooms: ['lobby', 'conference', 'waiting', 'vestibule', 'breakroom', 'execoffice'],
    acceptance: 'Reads as glass, not an opaque blue wall: low opacity, clearcoat specular, does not block line of sight, breakable with a visual fracture state.',
  },
  {
    id: 'GLASS-FROSTED', name: 'Frosted Glazing Pane', rooms: ['execcorr', 'archive', 'loading'],
    acceptance: 'Obscures shapes without going opaque; higher roughness than clear glass.',
  },
  {
    id: 'GLASS-TINTED', name: 'Tinted Exterior Glazing', rooms: ['lobby', 'conference', 'execcorr', 'upperlanding'],
    acceptance: 'Cooler and darker than interior glass; the snow outside still reads through it.',
  },
  {
    id: 'GLASS-BROKEN', componentOf: 'GLASS-CLEAR', name: 'Broken Glazing State', rooms: ['any glazed opening'],
    anims: ['intact', 'cracked', 'shattered'],
    acceptance: 'Shooting a pane produces a crack decal then a shatter with falling fragments, stops blocking bullets, and updates the text state.',
  },
];

export function registerArchitectureAssets() {
  for (const r of RECORDS) {
    assets.register({
      owner: 'fable2', files: F, category: 'architecture', status: 'accepted',
      lod: 'single mesh', collision: 'aabb', discrepancies: 'none',
      evidence: 'tests/rooms.spec.js', ...r,
    });
  }
  for (const r of LIGHT_RECORDS) {
    assets.register({
      owner: 'fable1', category: 'lighting', status: 'accepted',
      files: ['src/map/lighting.js'], pivot: 'fixture centre at ceiling height',
      textures: ['baseColor', 'emissive', 'roughness'], collision: 'none',
      lod: 'emissive geometry always drawn; point light culled to the quality budget',
      evidence: 'tests/rooms.spec.js', discrepancies: 'none', ...r,
    });
  }
  for (const r of DOOR_RECORDS) {
    assets.register({
      owner: 'fable2', category: 'door', status: 'accepted',
      files: ['src/map/doors.js', 'src/map/layout.js'],
      pivot: 'hinge side, base of the opening; leaf swings about local Y',
      textures: ['baseColor', 'normal', 'roughness'],
      collision: 'aabb, disabled once the leaf passes 50% open',
      lod: 'single mesh; hardware merged into the leaf at load',
      evidence: 'tests/doors.spec.js', discrepancies: 'none', ...r,
    });
  }
  for (const r of GLASS_RECORDS) {
    assets.register({
      owner: 'fable2', category: 'glass', status: 'accepted',
      files: ['src/map/build.js', 'src/art/materials.js', 'src/fx/effects.js'],
      dims: [3.0, 2.1, 0.012], pivot: 'pane centre',
      materials: ['physical-glass'], textures: ['none (analytic)'],
      collision: 'aabb, blocksSight=false', lod: 'single quad',
      audio: ['glass_crack', 'glass_shatter', 'glass_fragments'],
      evidence: 'tests/weapons.spec.js', discrepancies: 'none', ...r,
    });
  }
}
