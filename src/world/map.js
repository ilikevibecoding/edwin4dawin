// ============================================================================
// NORTHSTAR ADMINISTRATIVE CENTER — original map data (not derived from any
// existing game map). One unit = 1 meter. +Y up. North = -Z (z=0 edge).
//
// Ground floor (level g, floor y=0)          Basement (level b, floor y=-3.6)
//
//   z=0  ┌────┬──────┬──────┬───────────┐
//        │stor│break │facil.│ training  │      ┌─────────┬─────────────┐
//        ├────┴──┬───┴──┬───┴───────────┤      │ utility │   loading   │ garage
//   z=10 │ STAIR │  north corridor      │      ├─────────┴──────┬──────┤ (44..64,
//        │  W    ├──────┬────┬─────┬────┤      │ service corr.  │      │  0..16)
//   z=14 ├───────┤      │arch│ IT  │srvr│      └──▲─────────────┘  ▲   │
//        │ copy  │ cubi │ive │     ├────┤       stairs W       finger  │
//   z=16 │ mail  │ cle  │    │     │    │                      (56,16..30)
//        ├───────┤ floor├────┴─┬───┴────┤
//   z=24 │hall W │      │ east │stair│me│
//   z=26 ├───────┤      │ hall │ C   │ch│
//   z=30 ├──rr───┼──────┴──┬───┴─────┴──┤
//        │hall+  │  LOBBY  │ exec corr. │
//   z=34 │waiting│         ├────────┬───┤
//        │+janit.│         │confer. │exe│
//   z=40 │       ├──vest─┬─┤ ence   │c  │
//   z=44 └───────┴───────┴─┴────────┴───┘
//              PLAZA (exterior, spawn)        courtyard: east of x=64 (visual)
// ============================================================================

export const LEVELS = {
  g: { y: 0, name: 'Ground floor' },
  b: { y: -3.6, name: 'Service level' },
};

export const WALL = { intThick: 0.16, extThick: 0.32, defaultCeil: 3.0 };

// rects: [x0, z0, x1, z1] — may be multiple per room (L-shapes)
export const ROOMS = [
  // ---- south band -------------------------------------------------------
  { id: 'restroom_m', name: 'Restroom — Men', level: 'g', rects: [[0, 30, 6, 37]], floor: 'tile', ceil: 3.0, zone: 'rr' },
  { id: 'restroom_w', name: 'Restroom — Women', level: 'g', rects: [[0, 37, 6, 44]], floor: 'tile', ceil: 3.0, zone: 'rr' },
  { id: 'restroom_hall', name: 'Restroom Hall', level: 'g', rects: [[6, 30, 10, 44]], floor: 'tile', ceil: 3.0, zone: 'rr' },
  { id: 'janitor', name: 'Janitor Closet', level: 'g', rects: [[10, 38, 14, 44]], floor: 'concrete', ceil: 3.0, zone: 'service' },
  { id: 'waiting', name: 'Visitor Waiting', level: 'g', rects: [[10, 30, 22, 38], [14, 38, 22, 44]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  { id: 'lobby', name: 'Reception Lobby', level: 'g', rects: [[22, 30, 40, 40]], floor: 'lobby', ceil: 4.4, zone: 'lobby' },
  { id: 'vestibule', name: 'Security Vestibule', level: 'g', rects: [[27, 40, 35, 44]], floor: 'entry', ceil: 3.2, zone: 'lobby' },
  { id: 'security', name: 'Security Office', level: 'g', rects: [[35, 40, 40, 44]], floor: 'tile', ceil: 3.0, zone: 'service' },
  { id: 'exec_corridor', name: 'Executive Corridor', level: 'g', rects: [[40, 30, 64, 34]], floor: 'carpet_exec', ceil: 3.0, zone: 'exec' },
  { id: 'conference', name: 'Conference Room', level: 'g', rects: [[40, 34, 54, 44]], floor: 'carpet_exec', ceil: 3.0, zone: 'exec' },
  { id: 'exec_office', name: 'Executive Office', level: 'g', rects: [[54, 34, 64, 44]], floor: 'carpet_exec', ceil: 3.0, zone: 'exec' },
  // ---- middle band ------------------------------------------------------
  { id: 'hallway_w', name: 'West Hallway', level: 'g', rects: [[10, 24, 18, 30]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  { id: 'copy_mail', name: 'Copy & Mail Room', level: 'g', rects: [[10, 16, 18, 24]], floor: 'vinyl', ceil: 3.0, zone: 'office' },
  { id: 'cubicles', name: 'Open-Plan Office', level: 'g', rects: [[18, 14, 40, 30]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  { id: 'archive', name: 'Records Archive', level: 'g', rects: [[40, 14, 48, 26]], floor: 'concrete_seal', ceil: 3.0, zone: 'archive' },
  { id: 'it_room', name: 'IT Workspace', level: 'g', rects: [[48, 14, 56, 26]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  { id: 'server_room', name: 'Server Room', level: 'g', rects: [[56, 14, 64, 22]], floor: 'server', ceil: 3.0, zone: 'server' },
  { id: 'east_hall', name: 'East Hall', level: 'g', rects: [[40, 26, 56, 30]], floor: 'vinyl', ceil: 3.0, zone: 'office' },
  { id: 'stairwell', name: 'Central Stairwell', level: 'g', rects: [[56, 22, 60, 30]], floor: 'concrete', ceil: 3.0, zone: 'stair', openBelow: true },
  { id: 'mech_room', name: 'Mechanical Room', level: 'g', rects: [[60, 22, 64, 30]], floor: 'concrete', ceil: 3.0, zone: 'service' },
  // ---- north band -------------------------------------------------------
  { id: 'north_corridor', name: 'North Corridor', level: 'g', rects: [[18, 10, 64, 14]], floor: 'vinyl', ceil: 2.9, zone: 'corridor' },
  { id: 'stair_w', name: 'West Stair', level: 'g', rects: [[14, 10, 18, 16]], floor: 'concrete', ceil: 3.0, zone: 'stair', openBelow: true },
  { id: 'storage_n', name: 'Facilities Storage', level: 'g', rects: [[18, 0, 22, 10]], floor: 'concrete', ceil: 3.0, zone: 'service' },
  { id: 'break_room', name: 'Break Room', level: 'g', rects: [[22, 0, 34, 10]], floor: 'vinyl', ceil: 3.0, zone: 'break' },
  { id: 'facilities', name: 'Facilities Office', level: 'g', rects: [[34, 0, 44, 10]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  { id: 'training', name: 'Training Room', level: 'g', rects: [[44, 0, 64, 10]], floor: 'carpet', ceil: 3.0, zone: 'office' },
  // ---- exterior (playable) ---------------------------------------------
  { id: 'plaza', name: 'Employee Entrance', level: 'g', rects: [[22, 44, 40, 56]], floor: 'snow', ceil: 0, zone: 'exterior', outdoor: true },
  // ---- basement ---------------------------------------------------------
  { id: 'b_landing_w', name: 'West Stair Base', level: 'b', rects: [[14, 8, 18, 16]], floor: 'concrete', ceil: 2.8, zone: 'stair', openAbove: 'stair_w' },
  { id: 'service_corridor', name: 'Service Corridor', level: 'b', rects: [[18, 8, 44, 12]], floor: 'concrete', ceil: 2.6, zone: 'basement' },
  { id: 'utility', name: 'Utility Room', level: 'b', rects: [[18, 0, 30, 8]], floor: 'concrete', ceil: 2.8, zone: 'basement' },
  { id: 'loading', name: 'Loading Area', level: 'b', rects: [[30, 0, 44, 8]], floor: 'concrete', ceil: 3.2, zone: 'loading' },
  { id: 'garage', name: 'Extraction Garage', level: 'b', rects: [[44, 0, 64, 16]], floor: 'garage', ceil: 3.2, zone: 'garage' },
  { id: 'b_finger', name: 'South Service Link', level: 'b', rects: [[56, 16, 60, 22]], floor: 'concrete', ceil: 2.6, zone: 'basement' },
  { id: 'b_stair_c', name: 'Central Stair Base', level: 'b', rects: [[56, 22, 60, 30]], floor: 'concrete', ceil: 2.8, zone: 'stair', openAbove: 'stairwell' },
];

// Doors: line = wall coordinate; span = [min,max] along the wall; dir 'x' means
// the wall runs along the X axis (door line is a Z value).
export const DOORS = [
  { id: 'd_plaza_vest', kind: 'double-glass', dir: 'x', line: 44, span: [29.4, 32.6], level: 'g', rooms: ['vestibule', 'plaza'], label: 'Staff Entrance' },
  { id: 'd_vest_lobby', kind: 'double-glass', dir: 'x', line: 40, span: [29.4, 32.6], level: 'g', rooms: ['lobby', 'vestibule'], label: 'Lobby Doors' },
  { id: 'd_lobby_security', kind: 'office', dir: 'x', line: 40, span: [36.4, 37.4], level: 'g', rooms: ['lobby', 'security'], label: 'Security Office' },
  { id: 'd_lobby_cubicles', kind: 'double-glass', dir: 'x', line: 30, span: [28.5, 31.5], level: 'g', rooms: ['cubicles', 'lobby'], label: 'Office Floor' },
  { id: 'd_waiting_rrhall', kind: 'office', dir: 'z', line: 10, span: [32.4, 33.4], level: 'g', rooms: ['restroom_hall', 'waiting'], label: 'Restrooms' },
  { id: 'd_rr_m', kind: 'restroom', dir: 'z', line: 6, span: [32.7, 33.7], level: 'g', rooms: ['restroom_m', 'restroom_hall'], label: 'Men' },
  { id: 'd_rr_w', kind: 'restroom', dir: 'z', line: 6, span: [39.7, 40.7], level: 'g', rooms: ['restroom_w', 'restroom_hall'], label: 'Women' },
  { id: 'd_janitor', kind: 'metal', dir: 'z', line: 10, span: [40.2, 41.2], level: 'g', rooms: ['janitor', 'restroom_hall'], label: 'Janitor', locked: false },
  { id: 'd_waiting_hallw', kind: 'office', dir: 'x', line: 30, span: [11.4, 12.4], level: 'g', rooms: ['hallway_w', 'waiting'], label: 'West Hallway' },
  { id: 'd_hallw_cub', kind: 'office', dir: 'z', line: 18, span: [26.3, 27.3], level: 'g', rooms: ['cubicles', 'hallway_w'], label: 'Office Floor' },
  { id: 'd_hallw_copy', kind: 'office', dir: 'x', line: 24, span: [13.4, 14.4], level: 'g', rooms: ['copy_mail', 'hallway_w'], label: 'Copy Room' },
  { id: 'd_copy_cub', kind: 'office', dir: 'z', line: 18, span: [19.4, 20.4], level: 'g', rooms: ['cubicles', 'copy_mail'], label: 'Copy Room' },
  { id: 'd_copy_stairw', kind: 'fire', dir: 'x', line: 16, span: [15.3, 16.3], level: 'g', rooms: ['stair_w', 'copy_mail'], label: 'Stair W' },
  { id: 'd_corr_storage', kind: 'metal', dir: 'x', line: 10, span: [19.4, 20.4], level: 'g', rooms: ['storage_n', 'north_corridor'], label: 'Storage' },
  { id: 'd_corr_break', kind: 'office', dir: 'x', line: 10, span: [27.4, 28.4], level: 'g', rooms: ['break_room', 'north_corridor'], label: 'Break Room', startOpen: true },
  { id: 'd_corr_fac', kind: 'office', dir: 'x', line: 10, span: [38.4, 39.4], level: 'g', rooms: ['facilities', 'north_corridor'], label: 'Facilities' },
  { id: 'd_corr_training1', kind: 'office', dir: 'x', line: 10, span: [48.4, 49.4], level: 'g', rooms: ['training', 'north_corridor'], label: 'Training' },
  { id: 'd_corr_training2', kind: 'office', dir: 'x', line: 10, span: [58.4, 59.4], level: 'g', rooms: ['training', 'north_corridor'], label: 'Training' },
  { id: 'd_corr_fire', kind: 'fire-double', dir: 'z', line: 40, span: [10.7, 13.3], level: 'g', rooms: ['north_corridor', 'north_corridor'], label: 'Fire Door', crossWall: [10, 14] },
  { id: 'd_cub_corr1', kind: 'office', dir: 'x', line: 14, span: [24.4, 25.4], level: 'g', rooms: ['cubicles', 'north_corridor'], label: 'Office Floor' },
  { id: 'd_cub_corr2', kind: 'office', dir: 'x', line: 14, span: [34.4, 35.4], level: 'g', rooms: ['cubicles', 'north_corridor'], label: 'Office Floor' },
  { id: 'd_cub_archive', kind: 'office', dir: 'z', line: 40, span: [20.4, 21.4], level: 'g', rooms: ['archive', 'cubicles'], label: 'Archive' },
  { id: 'd_corr_archive', kind: 'metal', dir: 'x', line: 14, span: [43.4, 44.4], level: 'g', rooms: ['archive', 'north_corridor'], label: 'Archive' },
  { id: 'd_corr_it', kind: 'office', dir: 'x', line: 14, span: [51.4, 52.4], level: 'g', rooms: ['it_room', 'north_corridor'], label: 'IT' },
  { id: 'd_ehall_archive', kind: 'office', dir: 'x', line: 26, span: [43.4, 44.4], level: 'g', rooms: ['archive', 'east_hall'], label: 'Archive' },
  { id: 'd_ehall_it', kind: 'office', dir: 'x', line: 26, span: [51.4, 52.4], level: 'g', rooms: ['it_room', 'east_hall'], label: 'IT' },
  { id: 'd_it_server', kind: 'security', dir: 'z', line: 56, span: [18.3, 19.3], level: 'g', rooms: ['server_room', 'it_room'], label: 'Server Room', locked: true, keyId: 'keycard_server' },
  { id: 'd_ehall_stairc', kind: 'fire', dir: 'z', line: 56, span: [28.5, 29.5], level: 'g', rooms: ['stairwell', 'east_hall'], label: 'Stairwell' },
  { id: 'd_corr_stairc', kind: 'fire', dir: 'x', line: 30, span: [57.4, 58.4], level: 'g', rooms: ['stairwell', 'exec_corridor'], label: 'Stairwell' },
  { id: 'd_corr_mech', kind: 'metal', dir: 'x', line: 30, span: [61.4, 62.4], level: 'g', rooms: ['mech_room', 'exec_corridor'], label: 'Mechanical' },
  { id: 'd_conf_glass', kind: 'glass', dir: 'x', line: 34, span: [44.3, 45.3], level: 'g', rooms: ['conference', 'exec_corridor'], label: 'Conference' },
  { id: 'd_lobby_conf', kind: 'office', dir: 'z', line: 40, span: [37.2, 38.2], level: 'g', rooms: ['conference', 'lobby'], label: 'Conference' },
  { id: 'd_corr_exec', kind: 'exec', dir: 'x', line: 34, span: [58.4, 59.4], level: 'g', rooms: ['exec_office', 'exec_corridor'], label: 'Executive Office' },
  // basement
  { id: 'd_bland_corr', kind: 'fire', dir: 'z', line: 18, span: [9.0, 10.0], level: 'b', rooms: ['service_corridor', 'b_landing_w'], label: 'Service Corridor' },
  { id: 'd_bcorr_utility', kind: 'metal', dir: 'x', line: 8, span: [22.4, 23.4], level: 'b', rooms: ['utility', 'service_corridor'], label: 'Utility' },
  { id: 'd_bcorr_loading', kind: 'metal', dir: 'x', line: 8, span: [36.4, 37.4], level: 'b', rooms: ['loading', 'service_corridor'], label: 'Loading' },
  { id: 'd_utility_loading', kind: 'metal', dir: 'z', line: 30, span: [3.4, 4.4], level: 'b', rooms: ['loading', 'utility'], label: 'Loading' },
  { id: 'd_bcorr_garage', kind: 'metal-double', dir: 'z', line: 44, span: [8.9, 11.1], level: 'b', rooms: ['garage', 'service_corridor'], label: 'Garage' },
  { id: 'd_loading_garage', kind: 'metal', dir: 'z', line: 44, span: [3.4, 4.4], level: 'b', rooms: ['garage', 'loading'], label: 'Garage' },
  { id: 'd_bfinger_garage', kind: 'fire', dir: 'x', line: 16, span: [57.4, 58.4], level: 'b', rooms: ['garage', 'b_finger'], label: 'Garage' },
];

// Cased openings (no door leaf)
export const OPENINGS = [
  { id: 'o_waiting_lobby', dir: 'z', line: 22, span: [33, 37], level: 'g', rooms: ['waiting', 'lobby'], head: 2.6 },
  { id: 'o_lobby_corr', dir: 'z', line: 40, span: [31, 33.2], level: 'g', rooms: ['lobby', 'exec_corridor'], head: 2.6 },
  { id: 'o_cub_ehall', dir: 'z', line: 40, span: [27, 29.2], level: 'g', rooms: ['cubicles', 'east_hall'], head: 2.6 },
  { id: 'o_ehall_corr', dir: 'x', line: 30, span: [46, 48], level: 'g', rooms: ['east_hall', 'exec_corridor'], head: 2.6 },
  { id: 'o_bfinger_stairc', dir: 'x', line: 22, span: [56.9, 59.1], level: 'b', rooms: ['b_finger', 'b_stair_c'], head: 2.4 },
];

// Interior glass partitions: span of glazed wall with mullions
export const GLASS_WALLS = [
  { id: 'g_conf_corr', dir: 'x', line: 34, span: [40.3, 44.1], level: 'g', sill: 0.75, head: 2.6, style: 'clear' },
  { id: 'g_conf_corr2', dir: 'x', line: 34, span: [45.5, 53.7], level: 'g', sill: 0.75, head: 2.6, style: 'clear' },
  { id: 'g_lobby_cub_w', dir: 'x', line: 30, span: [23, 28.3], level: 'g', sill: 0.75, head: 2.6, style: 'clear' },
  { id: 'g_lobby_cub_e', dir: 'x', line: 30, span: [31.7, 39.2], level: 'g', sill: 0.75, head: 2.6, style: 'frosted' },
  { id: 'g_server_corr', dir: 'x', line: 14, span: [58, 62.5], level: 'g', sill: 0.9, head: 2.5, style: 'clear' },
  { id: 'g_server_it', dir: 'z', line: 56, span: [15, 17.6], level: 'g', sill: 0.9, head: 2.5, style: 'clear' },
  { id: 'g_security_vest', dir: 'z', line: 35, span: [41, 43.4], level: 'g', sill: 1.0, head: 2.4, style: 'clear' },
];

// Exterior windows: on outside walls. sill/head heights from floor.
export const WINDOWS = [
  { id: 'w_waiting_s', dir: 'x', line: 44, span: [15, 21], level: 'g', room: 'waiting', sill: 0.85, head: 2.6, panes: 3 },
  { id: 'w_lobby_porch', dir: 'x', line: 40, span: [22.6, 26.6], level: 'g', room: 'lobby', sill: 0.45, head: 3.6, panes: 2, style: 'curtain' },
  { id: 'w_conf_s', dir: 'x', line: 44, span: [41, 53], level: 'g', room: 'conference', sill: 0.85, head: 2.6, panes: 5 },
  { id: 'w_exec_s', dir: 'x', line: 44, span: [55.5, 62.5], level: 'g', room: 'exec_office', sill: 0.85, head: 2.6, panes: 3 },
  { id: 'w_exec_e', dir: 'z', line: 64, span: [35.5, 42.5], level: 'g', room: 'exec_office', sill: 0.85, head: 2.6, panes: 3 },
  { id: 'w_corr_e', dir: 'z', line: 64, span: [30.6, 33.4], level: 'g', room: 'exec_corridor', sill: 0.85, head: 2.6, panes: 1 },
  { id: 'w_ncorr_e', dir: 'z', line: 64, span: [10.6, 13.4], level: 'g', room: 'north_corridor', sill: 0.9, head: 2.5, panes: 1 },
  { id: 'w_train_n', dir: 'x', line: 0, span: [46, 62], level: 'g', room: 'training', sill: 0.85, head: 2.6, panes: 6 },
  { id: 'w_fac_n', dir: 'x', line: 0, span: [35, 43], level: 'g', room: 'facilities', sill: 0.85, head: 2.6, panes: 3 },
  { id: 'w_break_n', dir: 'x', line: 0, span: [23, 33], level: 'g', room: 'break_room', sill: 0.85, head: 2.6, panes: 4 },
  { id: 'w_copy_w', dir: 'z', line: 10, span: [17.5, 22.5], level: 'g', room: 'copy_mail', sill: 0.95, head: 2.5, panes: 2 },
  { id: 'w_rr_m', dir: 'z', line: 0, span: [31.5, 35.5], level: 'g', room: 'restroom_m', sill: 1.8, head: 2.6, panes: 2, style: 'frosted' },
  { id: 'w_rr_w', dir: 'z', line: 0, span: [38.5, 42.5], level: 'g', room: 'restroom_w', sill: 1.8, head: 2.6, panes: 2, style: 'frosted' },
  { id: 'w_vest_e', dir: 'z', line: 35, span: [41, 43.4], level: 'g', room: 'vestibule', sill: 1.0, head: 2.4, panes: 1, interiorTo: 'security' },
  { id: 'w_vest_front_w', dir: 'x', line: 44, span: [27.3, 29.1], level: 'g', room: 'vestibule', sill: 0.35, head: 2.8, panes: 1, style: 'curtain' },
  { id: 'w_vest_front_e', dir: 'x', line: 44, span: [32.9, 34.7], level: 'g', room: 'vestibule', sill: 0.35, head: 2.8, panes: 1, style: 'curtain' },
];

// Big scripted shutters
export const SHUTTERS = [
  { id: 'garage_shutter', dir: 'z', line: 64, span: [4, 12], level: 'b', room: 'garage', height: 2.9, scripted: 'extraction' },
  { id: 'dock_shutter', dir: 'x', line: 0, span: [32, 42], level: 'b', room: 'loading', height: 2.8, scripted: null },
];

// Stairs: sequences of flights/landings. Each flight: from (x,z,y) to (x,z,y),
// width, axis of travel. Steps generated by the builder (riser ≤0.18).
export const STAIRS = [
  {
    // Straight utility flight: top platform at the south end (copy-room door),
    // descends northward to the basement landing.
    id: 'stair_west', top: 'stair_w', bottom: 'b_landing_w',
    topPlatform: [14.16, 14.6, 17.84, 16],
    pieces: [
      { type: 'flight', axis: 'z', x0: 14.6, x1: 17.4, zStart: 14.6, zEnd: 10.2, yStart: 0, yEnd: -3.6 },
    ],
    rails: [
      { dir: 'z', x: 14.6, z0: 10.2, z1: 14.6, side: 'flight' },
      { dir: 'z', x: 17.4, z0: 10.2, z1: 14.6, side: 'flight' },
    ],
    waypoints: [[16, 0, 15.2], [16, -1.8, 12.4], [16, -3.6, 9.6]],
  },
  {
    id: 'stair_central', top: 'stairwell', bottom: 'b_stair_c',
    topPlatform: [56.16, 28.6, 59.84, 29.84],
    pieces: [
      { type: 'flight', axis: 'z', x0: 56.6, x1: 59.4, zStart: 28.6, zEnd: 23.4, yStart: 0, yEnd: -3.6 },
    ],
    rails: [
      { dir: 'z', x: 56.6, z0: 23.4, z1: 28.6, side: 'flight' },
      { dir: 'z', x: 59.4, z0: 23.4, z1: 28.6, side: 'flight' },
    ],
    waypoints: [[58, 0, 29.2], [58, -1.8, 26.0], [58, -3.6, 22.8]],
  },
];

// ---------------------------------------------------------------------------
// Mission placement
// ---------------------------------------------------------------------------
// yawDeg convention: 0 faces north(-Z), 90 west(-X), 180 south(+Z), 270 east(+X)
export const PLAYER_SPAWN = { x: 31, y: 0, z: 51.5, yawDeg: 0 }; // facing north, toward the entrance

export const HOSTAGE_SPOTS = [
  { id: 'voss', room: 'conference', x: 48.5, z: 41.6, faceDeg: 20 },
  { id: 'reid', room: 'archive', x: 45.6, z: 17.2, faceDeg: 205 },
];

export const EXTRACTION = { room: 'garage', x: 57.5, y: -3.6, z: 8.0, radius: 3.4, vanAt: { x: 60.4, z: 8.0, faceDeg: 90 } };

export const PICKUPS = [
  { id: 'keycard_server', type: 'keycard', room: 'it_room', x: 53.4, z: 16.2, label: 'Server Room Keycard' },
  { id: 'medkit_break', type: 'medkit', room: 'break_room', x: 23.2, z: 1.4, heal: 50 },
  { id: 'medkit_security', type: 'medkit', room: 'security', x: 39.2, z: 43.2, heal: 50 },
  { id: 'medkit_utility', type: 'medkit', room: 'utility', x: 19.2, z: 1.2, heal: 50 },
  { id: 'ammo_storage', type: 'ammo', room: 'storage_n', x: 21.0, z: 8.8, amount: 0.5 },
  { id: 'ammo_security', type: 'ammo', room: 'security', x: 36.0, z: 43.2, amount: 0.5 },
  { id: 'ammo_server', type: 'ammo', room: 'server_room', x: 62.8, z: 15.4, amount: 1.0 },
  { id: 'armor_server', type: 'armor', room: 'server_room', x: 62.8, z: 17.2, amount: 50 },
];

// Enemy roster in priority order — difficulty takes the first N.
// type: scout(smg,70hp) | trooper(carbine,100hp) | heavy(shotgun,150hp) | marksman(rifle,85hp)
export const ENEMY_ROSTER = [
  { id: 'e_lobby_1', type: 'trooper', patrol: [[31, 36], [25, 33], [24.5, 38.5], [36, 37.5], [33, 31.5]], room: 'lobby' },
  { id: 'e_conf_guard', type: 'trooper', patrol: [[46.5, 40.5], [50.5, 38.2], [46, 36.5]], room: 'conference', guard: 'voss' },
  { id: 'e_archive_guard', type: 'scout', patrol: [[43.5, 19], [45.5, 23.5], [42, 24]], room: 'archive', guard: 'reid' },
  { id: 'e_cub_1', type: 'scout', patrol: [[21, 17], [36, 16.5], [37.5, 27.5], [21.5, 28]], room: 'cubicles' },
  { id: 'e_garage_1', type: 'trooper', patrol: [[47, 4], [61, 3.5], [61.5, 13], [47.5, 13.5]], room: 'garage' },
  { id: 'e_ncorr_marks', type: 'marksman', patrol: [[62, 12], [55, 12.2]], room: 'north_corridor' },
  { id: 'e_exec_1', type: 'scout', patrol: [[42.5, 32], [61.5, 32.2], [58.5, 38], [60.5, 41.5]], room: 'exec_corridor' },
  { id: 'e_break_1', type: 'scout', patrol: [[24, 4], [31.5, 3], [32, 8.5], [23.5, 8]], room: 'break_room' },
  // -- 9..11 (operator) --
  { id: 'e_cub_2', type: 'heavy', patrol: [[28, 22], [34.5, 21], [29, 26.5]], room: 'cubicles' },
  { id: 'e_bcorr_1', type: 'scout', patrol: [[19.5, 10], [42.5, 10.2], [34, 9.8]], room: 'service_corridor', level: 'b' },
  { id: 'e_it_1', type: 'trooper', patrol: [[50, 16], [54.5, 24], [49.5, 23.5]], room: 'it_room' },
  // -- 12..14 (nightwatch) --
  { id: 'e_loading_1', type: 'heavy', patrol: [[33, 4], [41.5, 3.5], [41, 6.5]], room: 'loading', level: 'b' },
  { id: 'e_waiting_1', type: 'scout', patrol: [[13, 33], [19.5, 34.5], [18.5, 41.5]], room: 'waiting' },
  { id: 'e_train_marks', type: 'marksman', patrol: [[46, 3], [61.5, 3.2]], room: 'training' },
];

// QA teleport checkpoints (dev tooling)
export const CHECKPOINTS = {
  spawn: { x: 31, y: 0, z: 51.5, yaw: 0 },
  vestibule: { x: 31, y: 0, z: 42, yaw: 0 },
  lobby: { x: 31, y: 0, z: 35, yaw: 0 },
  waiting: { x: 16, y: 0, z: 34, yaw: 270 },
  restrooms: { x: 8, y: 0, z: 37, yaw: 90 },
  janitor: { x: 12, y: 0, z: 41, yaw: 90 },
  cubicles: { x: 29, y: 0, z: 22, yaw: 0 },
  copy_mail: { x: 14, y: 0, z: 20, yaw: 270 },
  conference: { x: 47, y: 0, z: 38, yaw: 180 },
  exec_office: { x: 59, y: 0, z: 39, yaw: 270 },
  exec_corridor: { x: 44, y: 0, z: 32, yaw: 270 },
  archive: { x: 44, y: 0, z: 22, yaw: 0 },
  it_room: { x: 52, y: 0, z: 20, yaw: 0 },
  server_room: { x: 58, y: 0, z: 18, yaw: 270 },
  east_hall: { x: 42, y: 0, z: 28, yaw: 270 },
  break_room: { x: 28, y: 0, z: 6, yaw: 0 },
  training: { x: 54, y: 0, z: 6, yaw: 0 },
  facilities: { x: 39, y: 0, z: 6, yaw: 0 },
  storage: { x: 20, y: 0, z: 6, yaw: 0 },
  north_corridor: { x: 22, y: 0, z: 12, yaw: 270 },
  north_corridor_e: { x: 60, y: 0, z: 12, yaw: 90 },
  mech_room: { x: 62, y: 0, z: 26, yaw: 0 },
  stairwell_top: { x: 58, y: 0, z: 29.2, yaw: 0 },
  stair_west_top: { x: 16, y: 0, z: 15.3, yaw: 0 },
  service_corridor: { x: 20, y: -3.6, z: 10, yaw: 270 },
  utility: { x: 24, y: -3.6, z: 4, yaw: 0 },
  loading: { x: 37, y: -3.6, z: 4, yaw: 0 },
  garage: { x: 48, y: -3.6, z: 8, yaw: 270 },
  extraction: { x: 56, y: -3.6, z: 8, yaw: 270 },
};

// ---------------------------------------------------------------------------
export function roomById(id) { return ROOMS.find((r) => r.id === id); }

export function roomAt(x, z, y = 0) {
  const level = y < -1.6 ? 'b' : 'g';
  for (const r of ROOMS) {
    if (r.level !== level) continue;
    for (const [x0, z0, x1, z1] of r.rects) {
      if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r;
    }
  }
  // stairwells span levels
  if (level === 'b') {
    for (const r of ROOMS) {
      if (r.level === 'g' && r.openBelow) {
        for (const [x0, z0, x1, z1] of r.rects) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return r;
      }
    }
  }
  return null;
}

export const MAP_BOUNDS = { x0: -12, z0: -14, x1: 80, z1: 60 };
