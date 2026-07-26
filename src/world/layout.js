// ============================================================================
// NORTHSTAR ADMINISTRATIVE CENTER - original map data (Fable 2 ownership)
// Single source of truth for rooms, connections, windows, stairs, spawns,
// patrols, hostages and extraction. Axis-aligned rects, 1 unit = 1 meter.
// Coordinates: +X east, +Z south, Y up. North = -Z.
// This layout is an original design and intentionally does NOT reproduce any
// existing commercial map footprint.
// ============================================================================

export const FLOOR_Y = { 0: 0, 1: 3.6 };
export const SLAB = 0.35;          // upper floor slab thickness
export const WALL_EXT = 0.3;       // exterior wall thickness
export const WALL_INT = 0.16;      // interior wall thickness
export const GLASS_T = 0.05;

// ---------------------------------------------------------------------------
// Rooms: rect = [x0, z0, x1, z1] (west, north, east, south edges)
// style drives materials/props later. purpose documents real-world use.
// ---------------------------------------------------------------------------
export const ROOMS = [
  // -------------------------------------------------- exterior, ground
  { id: 'courtyard', name: 'Employee Entrance Courtyard', floor: 0, rect: [-54, -12, -38, 12], ceil: 0, style: 'exterior', purpose: 'Snow-covered staff entrance plaza with planters and flag pole.' },

  // -------------------------------------------------- west wing, ground
  { id: 'vestibule', name: 'Security Vestibule', floor: 0, rect: [-38, -3, -32, 3], ceil: 3.0, style: 'lobby', purpose: 'Badge-in airlock between the courtyard and reception.' },
  { id: 'firstaid', name: 'First-Aid Room', floor: 0, rect: [-38, -9, -32, -3], ceil: 3.0, style: 'utility', purpose: 'Building first-aid and facilities office.' },
  { id: 'lobby', name: 'Reception Lobby', floor: 0, rect: [-32, -9, -20, 7], ceil: 7.0, tallZone: [-32, -2, -20, 7], style: 'lobby', purpose: 'Two-story reception with front desk and company branding.' },
  { id: 'waiting', name: 'Visitor Waiting Area', floor: 0, rect: [-38, 3, -32, 12], ceil: 3.0, style: 'lobby', purpose: 'Guest seating with coffee table and brochures.' },
  { id: 'records', name: 'Records Archive', floor: 0, rect: [-38, -22, -28, -9], ceil: 3.0, style: 'archive', purpose: 'Rolling shelf archive for logistics contracts.' },
  { id: 'fileroom', name: 'File Room', floor: 0, rect: [-28, -22, -20, -19], ceil: 3.0, style: 'archive', purpose: 'Active file storage linking records to the copy room.' },
  { id: 'stairwell', name: 'Central Stairwell', floor: 0, rect: [-28, -19, -20, -9], ceil: 7.2, isStairwell: true, style: 'stairwell', purpose: 'Concrete stair core connecting both floors.' },

  // -------------------------------------------------- north strip, ground
  { id: 'copymail', name: 'Copy & Mail Room', floor: 0, rect: [-20, -22, -10, -14], ceil: 3.0, style: 'office', purpose: 'Large copier, mail sorting wall and supply shelves.' },
  { id: 'conference', name: 'Aurora Conference Room', floor: 0, rect: [-10, -22, 3, -14], ceil: 3.0, style: 'conference', purpose: 'Main conference room. Hostage location A.' },
  { id: 'breakroom', name: 'Break Room & Kitchen', floor: 0, rect: [3, -22, 12, -14], ceil: 3.0, style: 'kitchen', purpose: 'Staff kitchen, vending machines and tables.' },
  { id: 'itroom', name: 'IT Workspace', floor: 0, rect: [12, -22, 21, -14], ceil: 3.0, style: 'office', purpose: 'IT support desks, spare parts shelving.' },
  { id: 'server', name: 'Server Room', floor: 0, rect: [21, -22, 30, -14], ceil: 3.0, style: 'server', purpose: 'Rack aisles, UPS units, raised floor.' },

  // -------------------------------------------------- center, ground
  { id: 'northcorr', name: 'North Corridor', floor: 0, rect: [-20, -14, 30, -10.5], ceil: 2.85, style: 'corridor', purpose: 'Main east-west circulation spine.' },
  { id: 'openfloor', name: 'Open-Plan Office Floor', floor: 0, rect: [-20, -10.5, 8, 7], ceil: 3.0, style: 'office', purpose: 'Cubicle floor for dispatch and finance teams.' },
  { id: 'eastcorr', name: 'East Corridor', floor: 0, rect: [8, -10.5, 12, 7], ceil: 2.85, style: 'corridor', purpose: 'North-south link to the logistics wing.' },
  { id: 'storage', name: 'Storage Room', floor: 0, rect: [12, -10.5, 21, -4], ceil: 3.0, style: 'utility', purpose: 'Office furniture and supply overflow storage.' },
  { id: 'security', name: 'Security Office', floor: 0, rect: [21, -10.5, 30, -4], ceil: 3.0, style: 'security', purpose: 'Camera wall, badge printers, key locker.' },

  // -------------------------------------------------- south strip, ground
  { id: 'southcorr', name: 'South Corridor', floor: 0, rect: [-32, 7, 12, 10.5], ceil: 2.85, style: 'corridor', purpose: 'South circulation with courtyard windows.' },
  { id: 'restroomM', name: 'Restroom M', floor: 0, rect: [-14, 10.5, -8, 18.5], ceil: 2.7, style: 'restroom', purpose: 'Men\'s restroom.' },
  { id: 'restroomW', name: 'Restroom W', floor: 0, rect: [-8, 10.5, -2, 18.5], ceil: 2.7, style: 'restroom', purpose: 'Women\'s restroom.' },
  { id: 'janitor', name: 'Janitor Closet', floor: 0, rect: [-2, 10.5, 2, 18.5], ceil: 2.7, style: 'utility', purpose: 'Cleaning cart, mop sink, chemical shelf.' },
  { id: 'electrical', name: 'Electrical Room', floor: 0, rect: [2, 10.5, 8, 18.5], ceil: 2.7, style: 'utility', purpose: 'Breaker panels, transformers, conduit runs.' },

  // -------------------------------------------------- east wing, ground
  { id: 'servicecorr', name: 'Service Corridor', floor: 0, rect: [12, 7, 24, 10.5], ceil: 2.6, style: 'service', purpose: 'Concrete back-of-house link to loading.' },
  { id: 'loading', name: 'Loading Area', floor: 0, rect: [12, -4, 24, 7], ceil: 4.2, style: 'service', purpose: 'Receiving dock with pallets and roller door.' },
  { id: 'garage', name: 'Extraction Garage', floor: 0, rect: [24, -4, 38, 10.5], ceil: 4.6, style: 'garage', purpose: 'Fleet garage. Extraction point.' },

  // -------------------------------------------------- floor 1 (y = 3.6)
  { id: 'upperlanding', name: 'Upper Landing', floor: 1, rect: [-28, -19, -20, -9], ceil: 3.0, isStairwell: true, style: 'stairwell', purpose: 'Stair landing serving the executive floor.' },
  { id: 'mezzanine', name: 'Lobby Mezzanine', floor: 1, rect: [-32, -9, -20, -2], ceil: 3.0, style: 'lobby', purpose: 'Open gallery overlooking reception.', railing: [{ side: 'south' }] },
  { id: 'exechall', name: 'Executive Corridor', floor: 1, rect: [-38, -9, -32, -2], ceil: 3.0, style: 'exec', purpose: 'Wood-paneled corridor to the corner office.' },
  { id: 'execoffice', name: 'Executive Office', floor: 1, rect: [-38, -22, -28, -9], ceil: 3.0, style: 'exec', purpose: 'Director\'s corner office. Hostage location B.' },
];

// ---------------------------------------------------------------------------
// Connections between rooms (each creates an opening in the shared wall).
// type: door | double | glassdoor | firedoor | securitydoor | restroomdoor
//       | arch (open doorway) | open (wide wall removal) | shutter
// at: offset (m) along the shared edge from its min coordinate to opening
//     CENTER. w: opening width. Omitted 'at' = centered.
// ---------------------------------------------------------------------------
export const CONNECTIONS = [
  // west public flow
  { a: 'courtyard', b: 'vestibule', type: 'double', w: 2.4, name: 'Main Entrance', id: 'd_entry' },
  { a: 'vestibule', b: 'lobby', type: 'securitydoor', w: 1.9, name: 'Security Door', id: 'd_vest' },
  { a: 'firstaid', b: 'lobby', type: 'door', w: 1.0, at: 3.0, name: 'First Aid', id: 'd_firstaid' },
  { a: 'waiting', b: 'lobby', type: 'open', w: 3.6, at: 2.0 },
  { a: 'waiting', b: 'southcorr', type: 'arch', w: 2.0, id: 'a_wait_south' },
  { a: 'lobby', b: 'stairwell', type: 'firedoor', w: 1.1, at: 5.5, name: 'Stairwell A', id: 'd_stair_lobby' },
  { a: 'lobby', b: 'records', type: 'door', w: 1.0, at: 2.0, name: 'Records', id: 'd_records' },
  { a: 'lobby', b: 'openfloor', type: 'glasswall+glassdoor', w: 2.2, at: 8.0, name: 'Office Floor', id: 'd_lobby_open' },
  { a: 'lobby', b: 'southcorr', type: 'arch', w: 2.6, at: 6.0 },
  { a: 'records', b: 'stairwell', type: 'door', w: 1.0, at: 8.7, name: 'Records Side', id: 'd_records_stair' },
  { a: 'records', b: 'fileroom', type: 'door', w: 1.0, name: 'File Room W', id: 'd_file_w' },
  { a: 'fileroom', b: 'copymail', type: 'door', w: 1.0, name: 'File Room E', id: 'd_file_e' },

  // stair core to spine
  { a: 'stairwell', b: 'northcorr', type: 'firedoor', w: 1.2, at: 3.8, name: 'Stairwell B', id: 'd_stair_corr' },

  // north strip
  { a: 'copymail', b: 'northcorr', type: 'door', w: 1.1, at: 5.0, name: 'Copy Room', id: 'd_copy' },
  { a: 'conference', b: 'northcorr', type: 'glasswall+glassdoor', w: 1.2, at: 3.2, name: 'Conference', id: 'd_conf' },
  { a: 'conference', b: 'breakroom', type: 'door', w: 1.0, at: 6.5, name: 'Conference East', id: 'd_conf_east' },
  { a: 'breakroom', b: 'northcorr', type: 'arch', w: 2.2, at: 4.5 },
  { a: 'itroom', b: 'northcorr', type: 'door', w: 1.1, at: 4.5, name: 'IT Office', id: 'd_it' },
  { a: 'itroom', b: 'server', type: 'securitydoor', w: 1.1, at: 4.0, name: 'Server Access', id: 'd_server_it' },
  { a: 'server', b: 'northcorr', type: 'securitydoor', w: 1.1, at: 6.5, name: 'Server Room', id: 'd_server_corr', startLocked: true, keycard: 'server' },

  // center
  { a: 'openfloor', b: 'northcorr', type: 'open', w: 3.4, at: 6.0 },
  { a: 'openfloor', b: 'northcorr', type: 'open', w: 3.4, at: 22.0 },
  { a: 'openfloor', b: 'eastcorr', type: 'arch', w: 2.4, at: 9.0 },
  { a: 'openfloor', b: 'southcorr', type: 'open', w: 3.2, at: 16.0 },
  { a: 'northcorr', b: 'eastcorr', type: 'firedoor', w: 1.3, name: 'Fire Door E', id: 'd_fire_east' },
  { a: 'storage', b: 'eastcorr', type: 'door', w: 1.1, at: 3.2, name: 'Storage', id: 'd_storage' },
  { a: 'security', b: 'northcorr', type: 'securitydoor', w: 1.1, at: 6.8, name: 'Security Office', id: 'd_security' },
  { a: 'storage', b: 'security', type: 'door', w: 1.0, at: 3.0, name: 'Storage Side', id: 'd_storage_sec' },

  // south strip
  { a: 'southcorr', b: 'eastcorr', type: 'open', w: 3.2 },
  { a: 'restroomM', b: 'southcorr', type: 'restroomdoor', w: 0.95, name: 'Restroom M', id: 'd_wcm' },
  { a: 'restroomW', b: 'southcorr', type: 'restroomdoor', w: 0.95, name: 'Restroom W', id: 'd_wcw' },
  { a: 'janitor', b: 'southcorr', type: 'door', w: 0.95, name: 'Janitor', id: 'd_janitor' },
  { a: 'electrical', b: 'southcorr', type: 'firedoor', w: 1.1, name: 'Electrical', id: 'd_electrical' },

  // east service wing
  { a: 'southcorr', b: 'servicecorr', type: 'firedoor', w: 1.3, name: 'Service Door', id: 'd_service' },
  { a: 'servicecorr', b: 'loading', type: 'double', w: 2.2, at: 4.0, name: 'Loading Dock', id: 'd_loading' },
  { a: 'eastcorr', b: 'loading', type: 'door', w: 1.2, at: 4.0, name: 'Loading Side', id: 'd_loading_w' },
  { a: 'servicecorr', b: 'garage', type: 'door', w: 1.1, name: 'Garage Side', id: 'd_garage_s' },
  { a: 'loading', b: 'garage', type: 'shutter', w: 4.2, at: 5.5, name: 'Roller Shutter', id: 'shutter_loading' },

  // floor 1
  { a: 'upperlanding', b: 'mezzanine', type: 'open', w: 5.0, at: 4.0 },
  { a: 'mezzanine', b: 'exechall', type: 'arch', w: 1.8, at: 3.5 },
  { a: 'execoffice', b: 'upperlanding', type: 'door', w: 1.1, at: 8.8, name: 'Executive Office', id: 'd_exec_e' },
  { a: 'execoffice', b: 'exechall', type: 'door', w: 1.1, at: 2.0, name: 'Executive South', id: 'd_exec_s' },
];

// ---------------------------------------------------------------------------
// Exterior windows: room edge ('n','s','e','w'), from/to = range along edge
// (m from edge min coordinate), sill and head heights (m above room floor).
// kind: clear | tinted | frosted | glazedwall | clerestory
// ---------------------------------------------------------------------------
export const WINDOWS = [
  { room: 'vestibule', side: 'w', from: 0.5, to: 1.7, sill: 0.4, head: 2.6, kind: 'glazedwall' },
  { room: 'vestibule', side: 'w', from: 4.3, to: 5.5, sill: 0.4, head: 2.6, kind: 'glazedwall' },
  { room: 'firstaid', side: 'w', from: 1.5, to: 4.5, sill: 0.75, head: 2.5, kind: 'clear' },
  { room: 'waiting', side: 'w', from: 1.0, to: 8.0, sill: 0.75, head: 2.5, kind: 'clear' },
  { room: 'waiting', side: 's', from: 1.0, to: 5.0, sill: 0.75, head: 2.5, kind: 'clear' },
  { room: 'lobby', side: 's', from: 1.0, to: 11.0, sill: 4.5, head: 6.6, kind: 'clerestory' },
  { room: 'lobby', side: 'w', from: 12.5, to: 15.5, sill: 4.5, head: 6.6, kind: 'clerestory' },
  { room: 'records', side: 'w', from: 1.5, to: 11.5, sill: 1.4, head: 2.5, kind: 'clear' },
  { room: 'records', side: 'n', from: 1.5, to: 8.5, sill: 1.4, head: 2.5, kind: 'clear' },
  { room: 'fileroom', side: 'n', from: 1.0, to: 7.0, sill: 1.4, head: 2.5, kind: 'clear' },
  { room: 'copymail', side: 'n', from: 1.0, to: 9.0, sill: 1.0, head: 2.5, kind: 'clear' },
  { room: 'conference', side: 'n', from: 0.8, to: 12.2, sill: 0.75, head: 2.6, kind: 'clear' },
  { room: 'breakroom', side: 'n', from: 1.0, to: 8.0, sill: 0.9, head: 2.5, kind: 'clear' },
  { room: 'itroom', side: 'n', from: 1.5, to: 7.5, sill: 1.1, head: 2.4, kind: 'tinted' },
  { room: 'southcorr', side: 's', from: 2.0, to: 30.0, sill: 0.9, head: 2.5, kind: 'clear' },
  { room: 'security', side: 'e', from: 1.5, to: 5.0, sill: 1.2, head: 2.4, kind: 'tinted' },
  { room: 'garage', side: 'n', from: 2.0, to: 6.0, sill: 2.6, head: 3.8, kind: 'frosted' },
  { room: 'execoffice', side: 'w', from: 1.0, to: 12.0, sill: 0.7, head: 2.7, kind: 'clear' },
  { room: 'execoffice', side: 'n', from: 1.0, to: 9.0, sill: 0.7, head: 2.7, kind: 'clear' },
  { room: 'exechall', side: 'w', from: 1.5, to: 5.5, sill: 0.75, head: 2.6, kind: 'clear' },
  { room: 'restroomM', side: 's', from: 1.5, to: 4.5, sill: 1.8, head: 2.4, kind: 'frosted' },
  { room: 'restroomW', side: 's', from: 1.5, to: 4.5, sill: 1.8, head: 2.4, kind: 'frosted' },
];

// Interior glass panels (non-door) in addition to connection glass walls.
export const INTERIOR_GLASS = [
  { a: 'security', b: 'northcorr', from: 1.0, to: 4.5, sill: 1.1, head: 2.4 },
];

// ---------------------------------------------------------------------------
// Stairs: U-shaped run with a solid central core inside the stairwell.
// flight1 rises northward (ground -> mid landing), flight2 returns southward
// (mid landing -> floor 1). Player enters from the south strip.
// ---------------------------------------------------------------------------
export const STAIRS = [
  {
    id: 'stair_main', room: 'stairwell',
    flight1: { x0: -27.6, x1: -25.6, zStart: -11, zEnd: -17, y0: 0, y1: 1.8 },
    landing: { x0: -27.6, x1: -20.4, z0: -19, z1: -17, y: 1.8 },
    flight2: { x0: -22.4, x1: -20.4, zStart: -17, zEnd: -11, y0: 1.8, y1: 3.6 },
    core: { x0: -25.6, x1: -22.4, z0: -17, z1: -11, y0: 0, y1: 6.6 },
    // rect holes cut from the floor-1 slab (over flights + landing)
    holes: [
      [-28, -19, -25.6, -11],
      [-22.4, -19, -20, -11],
      [-25.6, -19, -22.4, -17],
    ],
    // railing on floor 1 guarding the flight1 void
    railings: [{ floor: 1, x0: -28, z0: -11, x1: -25.6, z1: -11 }],
  },
];

// Garage exit shutter on the east exterior wall (opens during extraction).
export const SPECIALS = {
  garageExit: { room: 'garage', side: 'e', from: 4.0, to: 9.0, head: 3.4, id: 'shutter_exit', name: 'Garage Exit Shutter' },
  extractionPanel: { x: 37.5, y: 1.15, z: 6.2, name: 'Dock Master Panel' },
};

// ---------------------------------------------------------------------------
// Mission data
// ---------------------------------------------------------------------------
export const SPAWN = { pos: { x: -48, y: 0, z: 6.5 }, yaw: -Math.PI / 2 }; // courtyard, facing the entrance

export const HOSTAGES = [
  { id: 'hostage_a', name: 'K. Serrano', variant: 'analyst', pos: { x: -4.5, y: 0, z: -18.5 }, yaw: 2.2, room: 'conference' },
  { id: 'hostage_b', name: 'D. Okafor', variant: 'manager', pos: { x: -34.5, y: 3.6, z: -18.0 }, yaw: 1.2, room: 'execoffice' },
];

export const EXTRACTION = {
  room: 'garage',
  zone: { x0: 27, z0: -1, x1: 36, z1: 8 },
};

// Patrol waypoints (x, z; floor derived from position/stairs).
export const PATROL_POINTS = {
  p_lobby: { x: -26, z: 0 }, p_lobby2: { x: -23, z: 5 },
  p_vest: { x: -35, z: 0 },
  p_wait: { x: -35, z: 8 },
  p_open1: { x: -14, z: -6 }, p_open2: { x: 2, z: -6 }, p_open3: { x: 2, z: 4 }, p_open4: { x: -14, z: 4 },
  p_ncorr1: { x: -16, z: -12.2 }, p_ncorr2: { x: 0, z: -12.2 }, p_ncorr3: { x: 16, z: -12.2 }, p_ncorr4: { x: 27, z: -12.2 },
  p_conf: { x: -6, z: -18 }, p_conf2: { x: 0, z: -16 },
  p_break: { x: 7, z: -18 },
  p_it: { x: 16, z: -18 },
  p_server: { x: 25, z: -18 },
  p_scorr1: { x: -28, z: 8.8 }, p_scorr2: { x: -8, z: 8.8 }, p_scorr3: { x: 8, z: 8.8 },
  p_ecorr: { x: 10, z: -2 },
  p_storage: { x: 16, z: -7 },
  p_security: { x: 25, z: -7 },
  p_load1: { x: 15, z: 2 }, p_load2: { x: 21, z: 4 },
  p_garage1: { x: 28, z: 3 }, p_garage2: { x: 34, z: 7 },
  p_svc: { x: 18, z: 8.8 },
  p_land: { x: -24, y: 3.6, z: -10 },
  p_mezz1: { x: -28, y: 3.6, z: -5 }, p_mezz2: { x: -22, y: 3.6, z: -5 },
  p_exec: { x: -33, y: 3.6, z: -15 }, p_exec2: { x: -31, y: 3.6, z: -11 },
  p_hall: { x: -35, y: 3.6, z: -5.5 },
  p_records: { x: -33, z: -15.5 },
  p_copy: { x: -15, z: -18 },
};

// Enemy roster. min = minimum difficulty at which this enemy spawns.
export const ENEMIES = [
  { id: 'e_lobby_1', outfit: 'merc', weapon: 'vesper', kind: 'patrol', route: ['p_lobby', 'p_vest', 'p_lobby2', 'p_wait'], min: 'recruit' },
  { id: 'e_open_1', outfit: 'scout', weapon: 'vesper', kind: 'patrol', route: ['p_open1', 'p_open2', 'p_open3', 'p_open4'], min: 'recruit' },
  { id: 'e_open_2', outfit: 'merc', weapon: 'bdr15', kind: 'patrol', route: ['p_open2', 'p_ncorr2', 'p_ncorr1', 'p_open1'], min: 'operative' },
  { id: 'e_conf_guard', outfit: 'heavy', weapon: 'bdr15', kind: 'guard', route: ['p_conf', 'p_conf2'], min: 'recruit' },
  { id: 'e_break_1', outfit: 'scout', weapon: 'havelock', kind: 'patrol', route: ['p_break', 'p_ncorr2', 'p_ncorr3', 'p_it'], min: 'recruit' },
  { id: 'e_server_1', outfit: 'merc', weapon: 'vesper', kind: 'guard', route: ['p_server'], min: 'operative' },
  { id: 'e_south_1', outfit: 'scout', weapon: 'vesper', kind: 'patrol', route: ['p_scorr1', 'p_scorr2', 'p_scorr3', 'p_svc'], min: 'recruit' },
  { id: 'e_load_1', outfit: 'merc', weapon: 'bdr15', kind: 'patrol', route: ['p_load1', 'p_load2', 'p_garage1', 'p_ecorr'], min: 'recruit' },
  { id: 'e_garage_1', outfit: 'heavy', weapon: 'havelock', kind: 'guard', route: ['p_garage1', 'p_garage2'], min: 'operative' },
  { id: 'e_security_1', outfit: 'merc', weapon: 'vesper', kind: 'guard', route: ['p_security', 'p_storage'], min: 'veteran' },
  { id: 'e_mezz_1', outfit: 'scout', weapon: 'meridian', kind: 'guard', route: ['p_mezz1', 'p_mezz2'], min: 'operative' },
  { id: 'e_exec_guard', outfit: 'heavy', weapon: 'bdr15', kind: 'guard', route: ['p_exec', 'p_exec2'], min: 'recruit' },
  { id: 'e_hall_1', outfit: 'merc', weapon: 'vesper', kind: 'patrol', route: ['p_hall', 'p_mezz1', 'p_land'], min: 'recruit' },
  { id: 'e_records_1', outfit: 'scout', weapon: 'vesper', kind: 'guard', route: ['p_records'], min: 'veteran' },
  { id: 'e_copy_1', outfit: 'merc', weapon: 'vesper', kind: 'patrol', route: ['p_copy', 'p_ncorr1'], min: 'veteran' },
];

// Reinforcement wave that spawns when the extraction shutter opens.
export const EXTRACTION_WAVE = [
  { outfit: 'merc', weapon: 'vesper', at: 'p_svc' },
  { outfit: 'scout', weapon: 'vesper', at: 'p_ecorr' },
  { outfit: 'heavy', weapon: 'bdr15', at: 'p_load1', min: 'operative' },
  { outfit: 'merc', weapon: 'bdr15', at: 'p_scorr3', min: 'veteran' },
];

// QA teleport checkpoints (dev/testing only).
export const CHECKPOINTS = {
  spawn: { x: -48, y: 0, z: 6.5, yaw: -Math.PI / 2 },
  courtyard: { x: -46, y: 0, z: 0, yaw: -Math.PI / 2 },
  vestibule: { x: -35, y: 0, z: 0, yaw: -Math.PI / 2 },
  firstaid: { x: -35, y: 0, z: -6, yaw: Math.PI / 2 },
  lobby: { x: -26, y: 0, z: 0, yaw: -Math.PI / 2 },
  waiting: { x: -35, y: 0, z: 7.5, yaw: -2.2 },
  records: { x: -33, y: 0, z: -15, yaw: Math.PI / 2 },
  fileroom: { x: -24, y: 0, z: -20.5, yaw: Math.PI / 2 },
  stairwell: { x: -24, y: 0, z: -10, yaw: Math.PI },
  copymail: { x: -15, y: 0, z: -18, yaw: Math.PI },
  conference: { x: -3.5, y: 0, z: -18, yaw: 2.6 },
  breakroom: { x: 7.5, y: 0, z: -18, yaw: Math.PI },
  itroom: { x: 16.5, y: 0, z: -18, yaw: Math.PI },
  server: { x: 25.5, y: 0, z: -18, yaw: Math.PI },
  northcorr: { x: -5, y: 0, z: -12.2, yaw: -Math.PI / 2 },
  openfloor: { x: -6, y: 0, z: -2, yaw: -Math.PI / 2 },
  eastcorr: { x: 10, y: 0, z: -2, yaw: 0 },
  storage: { x: 16.5, y: 0, z: -7, yaw: 0 },
  security: { x: 25.5, y: 0, z: -7, yaw: 0 },
  southcorr: { x: -10, y: 0, z: 8.8, yaw: -Math.PI / 2 },
  restroomM: { x: -11, y: 0, z: 14, yaw: 0 },
  restroomW: { x: -5, y: 0, z: 14, yaw: 0 },
  janitor: { x: 0, y: 0, z: 14, yaw: 0 },
  electrical: { x: 5, y: 0, z: 14, yaw: 0 },
  servicecorr: { x: 18, y: 0, z: 8.8, yaw: -Math.PI / 2 },
  loading: { x: 18, y: 0, z: 1.5, yaw: -Math.PI / 2 },
  garage: { x: 30, y: 0, z: 3, yaw: -Math.PI / 2 },
  extraction: { x: 31, y: 0, z: 3.5, yaw: Math.PI / 2 },
  upperlanding: { x: -24, y: 3.6, z: -10, yaw: Math.PI / 2 },
  mezzanine: { x: -26, y: 3.6, z: -5.5, yaw: Math.PI },
  exechall: { x: -35, y: 3.6, z: -5.5, yaw: 0 },
  execoffice: { x: -33, y: 3.6, z: -15, yaw: 0.8 },
  hostageA: { x: -3, y: 0, z: -17, yaw: 2.4 },
  hostageB: { x: -33.5, y: 3.6, z: -16.5, yaw: 0.9 },
};

export function roomById(id) { return ROOMS.find((r) => r.id === id); }

export function roomAt(x, z, y = 0) {
  const floor = y > 2.8 ? 1 : 0;
  for (const r of ROOMS) {
    if (r.floor !== floor) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r;
  }
  for (const r of ROOMS) {
    if (!r.isStairwell || r.floor !== 0) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r;
  }
  return null;
}
