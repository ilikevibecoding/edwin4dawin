// ============================================================================
// NORTHSTAR ADMINISTRATIVE CENTER — authoritative layout data (Fable 2 domain)
// Original two-floor snowbound corporate HQ. 1 unit = 1 m. Building: x 0..48, z 0..36.
// South (+z) = entrance plaza. North (−z) = loading aprons. West (−x) = courtyard.
//
// GROUND (F0, y=0, ceil 3.0)                UPPER (F1, y=3.6, ceil 2.7)
// ┌─────────┬───────────┬──────┬─────────┐  ┌──────────────────────┬─────────┬──────┐
// │ GARAGE  │ LOADING   │ MECH │ SERVER  │  │ CUBICLE FLOOR        │ CONF    │ RECS │
// ├─────────┴──┬────────┴──────┼─────────┤  │          ┌─────┐     ├──glass──┴──────┤
// │ SERVICE CORRIDOR (west−east)│  IT    │  │          │STR-B│     │ CORR-N         │
// ├────┬───┬───┼──────┬────────┼─────────┤  ├──────────┴─────┴┬────┴─┬─EXEC-CORR────┤
// │BRK │JAN│ S │ SEC  │ STAIR-A│ COPY │CE│  │ CORR-W   │PRINT │STR-A │ ASST │ EXEC  │
// │    ├───┤ T │      │        ├──────┤  │  ├───┬──────┼──────┴──────┼──────┴───────┤
// │    │RRM│ B │      │        │      │  │  │WEL│ MEZZ │  ATRIUM ▼  │ MEZZ │ HR │ST│
// ├────┴┬──┴───┴──────┴────────┴───┬──┴──┤  │   │ WEST │   (void)   │ EAST │    │OR│
// │RRW  │ RECEPTION LOBBY (atrium) │WAIT │  ├───┴──────┴─────────────┴──────┴────┴──┤
// ├─────┴───────┬──────┬───────────┤     │  │ MEZZANINE SOUTH (plaza view curtain)  │
// │   (notch)   │ VEST │ GALLERY   │     │  └───────────────────────────────────────┘
// └─────────────┴──────┴───────────┴─────┘
// ============================================================================

export const MAP_NAME = 'Northstar Administrative Center';
export const COMPANY = 'Northstar Dynamics';

export const FLOORS = [
  { y: 0, ceil: 3.0 },
  { y: 3.6, ceil: 2.7 },
];
export const SLAB = 0.6; // structural slab between F0 ceiling and F1 floor

// floorMat: carpet|carpetBlue|tile|tileWhite|vinyl|concrete|concretePaint|wood|raisedTile|snow
// light: lobby|office|service|server|exec|break|rr|garage|exterior
export const ROOMS = [
  // ---------- GROUND FLOOR ----------
  { id: 'garage', name: 'Extraction Garage', floor: 0, rects: [[0, 0, 14, 12]], floorMat: 'concrete', ceilMat: 'deck', light: 'garage', purpose: 'Vehicle bay and extraction point', ambience: 'hvac' },
  { id: 'loading', name: 'Loading Area', floor: 0, rects: [[14, 0, 30, 12]], floorMat: 'concrete', ceilMat: 'deck', light: 'service', purpose: 'Goods receiving and dispatch', ambience: 'hvac' },
  { id: 'mech', name: 'Mechanical Room', floor: 0, rects: [[30, 0, 38, 12]], floorMat: 'concretePaint', ceilMat: 'deck', light: 'service', purpose: 'Electrical switchgear and HVAC plant', ambience: 'hvac' },
  { id: 'server', name: 'Server Room', floor: 0, rects: [[38, 0, 48, 10]], floorMat: 'raisedTile', ceilMat: 'deck', light: 'server', purpose: 'Data center — hostage location A', ambience: 'server' },
  { id: 'it', name: 'IT Workspace', floor: 0, rects: [[38, 10, 48, 18]], floorMat: 'vinyl', ceilMat: 'acoustic', light: 'office', purpose: 'IT support benches and equipment', ambience: 'fluorescent' },
  { id: 'sc', name: 'Service Corridor', floor: 0, rects: [[0, 12, 38, 15]], floorMat: 'concretePaint', ceilMat: 'deck', light: 'service', purpose: 'Back-of-house spine', ambience: 'hvac' },
  { id: 'stair-b', name: 'Service Stair B', floor: 0, rects: [[14, 15, 20, 21]], floorMat: 'concrete', ceilMat: 'none', light: 'service', purpose: 'Secondary stair', stair: { lanes: 'high' } },
  { id: 'break', name: 'Break Room', floor: 0, rects: [[0, 15, 8, 24]], floorMat: 'vinyl', ceilMat: 'acoustic', light: 'break', purpose: 'Kitchen and staff lunch room', ambience: 'fluorescent' },
  { id: 'janitor', name: 'Janitor Closet', floor: 0, rects: [[8, 15, 14, 18]], floorMat: 'concretePaint', ceilMat: 'deck', light: 'service', purpose: 'Cleaning supplies' },
  { id: 'rr-m', name: 'Restroom M', floor: 0, rects: [[8, 18, 14, 24]], floorMat: 'tileWhite', ceilMat: 'acoustic', light: 'rr', purpose: 'Restroom' },
  { id: 'rr-w', name: 'Restroom W', floor: 0, rects: [[0, 24, 6, 29]], floorMat: 'tileWhite', ceilMat: 'acoustic', light: 'rr', purpose: 'Restroom' },
  { id: 'lobby', name: 'Reception Lobby', floor: 0, rects: [[6, 24, 34, 32], [20, 32, 34, 36]], floorMat: 'tile', ceilMat: 'acoustic', light: 'lobby', purpose: 'Two-story reception atrium', ambience: 'fluorescent' },
  { id: 'vest', name: 'Security Vestibule', floor: 0, rects: [[14, 32, 20, 36]], floorMat: 'tile', ceilMat: 'acoustic', light: 'lobby', purpose: 'Badge-controlled entry airlock' },
  { id: 'wait', name: 'Visitor Waiting', floor: 0, rects: [[34, 24, 48, 36]], floorMat: 'carpetBlue', ceilMat: 'acoustic', light: 'lobby', purpose: 'Visitor lounge with winter view', ambience: 'fluorescent' },
  { id: 'corr-e', name: 'East Corridor', floor: 0, rects: [[38, 18, 48, 24]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Links IT wing to the lobby' },
  { id: 'copy', name: 'Copy & Mail Room', floor: 0, rects: [[34, 15, 38, 24]], floorMat: 'vinyl', ceilMat: 'acoustic', light: 'office', purpose: 'Print, copy and mail sorting' },
  { id: 'sec', name: 'Security Office', floor: 0, rects: [[20, 15, 28, 24]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'CCTV monitoring room', ambience: 'fluorescent' },
  { id: 'stair-a', name: 'Central Stairwell', floor: 0, rects: [[28, 15, 34, 24]], floorMat: 'concrete', ceilMat: 'none', light: 'service', purpose: 'Main stair', stair: { lanes: 'low' } },

  // ---------- UPPER FLOOR ----------
  { id: 'cubes', name: 'Open Office', floor: 1, rects: [[0, 0, 28, 15], [0, 15, 14, 21]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Open-plan cubicle floor', ambience: 'fluorescent' },
  { id: 'stair-b1', name: 'Service Stair B (Upper)', floor: 1, rects: [[14, 15, 20, 21]], floorMat: 'concrete', ceilMat: 'deck', light: 'service', purpose: 'Secondary stair', stairTop: 'stair-b' },
  { id: 'print', name: 'Print & Supply', floor: 1, rects: [[20, 15, 28, 24]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Printer bank and supply shelves; atrium balcony' },
  { id: 'stair-a1', name: 'Central Stairwell (Upper)', floor: 1, rects: [[28, 15, 34, 24]], floorMat: 'concrete', ceilMat: 'deck', light: 'service', purpose: 'Main stair', stairTop: 'stair-a' },
  { id: 'corr-n', name: 'North Corridor', floor: 1, rects: [[28, 10, 48, 13], [28, 13, 34, 15]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Serves conference and records' },
  { id: 'conference', name: 'Conference Room', floor: 1, rects: [[28, 0, 40, 10]], floorMat: 'carpetBlue', ceilMat: 'acoustic', light: 'office', purpose: 'Board meetings — glass front', ambience: 'fluorescent' },
  { id: 'records', name: 'Records Archive', floor: 1, rects: [[40, 0, 48, 10]], floorMat: 'vinyl', ceilMat: 'acoustic', light: 'service', purpose: 'Rolling archive shelving' },
  { id: 'exec-corr', name: 'Executive Corridor', floor: 1, rects: [[34, 13, 48, 17]], floorMat: 'wood', ceilMat: 'acoustic', light: 'exec', purpose: 'Wood-panelled executive wing' },
  { id: 'asst', name: 'Executive Assistant', floor: 1, rects: [[34, 17, 40, 24]], floorMat: 'carpetBlue', ceilMat: 'acoustic', light: 'exec', purpose: 'Assistant desk guarding the corner office' },
  { id: 'exec', name: 'Executive Office', floor: 1, rects: [[40, 17, 48, 24]], floorMat: 'wood', ceilMat: 'acoustic', light: 'exec', purpose: 'Corner office — hostage location B' },
  { id: 'corr-w', name: 'West Corridor', floor: 1, rects: [[0, 21, 20, 24]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Links open office to mezzanine; atrium overlook' },
  { id: 'well', name: 'Quiet Room', floor: 1, rects: [[0, 24, 6, 29]], floorMat: 'carpetBlue', ceilMat: 'acoustic', light: 'break', purpose: 'Wellness / quiet room' },
  { id: 'mezz', name: 'Mezzanine Gallery', floor: 1, rects: [[6, 24, 14, 30], [6, 30, 44, 36], [28, 24, 34, 30]], floorMat: 'tile', ceilMat: 'acoustic', light: 'lobby', purpose: 'Gallery ring over the lobby atrium', ambience: 'fluorescent' },
  { id: 'hr', name: 'Personnel Office', floor: 1, rects: [[34, 24, 44, 30]], floorMat: 'carpet', ceilMat: 'acoustic', light: 'office', purpose: 'Personnel and payroll' },
  { id: 'store', name: 'Upper Storage', floor: 1, rects: [[44, 24, 48, 36]], floorMat: 'vinyl', ceilMat: 'acoustic', light: 'service', purpose: 'Furniture and event storage' },

  // ---------- EXTERIOR (walkable snow) ----------
  { id: 'plaza', name: 'Employee Entrance', floor: 0, rects: [[4, 36, 36, 45], [6, 32, 14, 36]], floorMat: 'snow', ceilMat: 'sky', light: 'exterior', exterior: true, purpose: 'Snow-covered entrance plaza', ambience: 'wind' },
  { id: 'courtyard', name: 'West Courtyard', floor: 0, rects: [[-8, 8, 0, 30]], floorMat: 'snow', ceilMat: 'sky', light: 'exterior', exterior: true, purpose: 'Enclosed courtyard, smokers bench', ambience: 'wind' },
];

// Atrium void: F1 floor + F0 ceiling omitted here; ringed by railings.
export const VOIDS = [{ floor: 1, rect: [14, 24, 28, 30] }];

// door kinds: standard|wide|double|glassDouble|fire|security|restroom|wood|woodDouble
// arch = permanent opening (with header). window kinds: exterior|curtain|slit|interior
export const OPENINGS = [
  // ---------- GROUND: doors ----------
  { type: 'door', kind: 'glassDouble', a: 'plaza', b: 'vest', at: [17, 36], w: 1.9, id: 'door-entry' },
  { type: 'door', kind: 'glassDouble', a: 'vest', b: 'lobby', at: [17, 32], w: 1.9, id: 'door-vest' },
  { type: 'door', kind: 'standard', a: 'lobby', b: 'sec', at: [24.5, 24], w: 1.0, id: 'door-sec-lobby' },
  { type: 'door', kind: 'standard', a: 'sec', b: 'sc', at: [24.5, 15], w: 1.0, id: 'door-sec-sc' },
  { type: 'arch', a: 'lobby', b: 'stair-a', at: [30.2, 24], w: 2.6 },
  { type: 'door', kind: 'fire', a: 'stair-a', b: 'sc', at: [32.8, 15], w: 1.1, id: 'door-sta-sc' },
  { type: 'door', kind: 'restroom', a: 'lobby', b: 'rr-m', at: [11.25, 24], w: 1.0, id: 'door-rrm' },
  { type: 'door', kind: 'restroom', a: 'rr-w', b: 'lobby', at: [6, 26.75], w: 1.0, id: 'door-rrw' },
  { type: 'door', kind: 'standard', a: 'break', b: 'sc', at: [5, 15], w: 1.0, id: 'door-break-sc' },
  { type: 'door', kind: 'standard', a: 'break', b: 'lobby', at: [7, 24], w: 1.0, id: 'door-break-lobby' },
  { type: 'door', kind: 'standard', a: 'janitor', b: 'sc', at: [10.75, 15], w: 1.0, id: 'door-jan' },
  { type: 'door', kind: 'fire', a: 'garage', b: 'sc', at: [8.5, 12], w: 1.1, id: 'door-garage' },
  { type: 'door', kind: 'wide', a: 'loading', b: 'sc', at: [20.5, 12], w: 1.4, id: 'door-loading' },
  { type: 'door', kind: 'fire', a: 'mech', b: 'sc', at: [33.5, 12], w: 1.1, id: 'door-mech' },
  { type: 'door', kind: 'fire', a: 'sc', b: 'it', at: [38, 13.5], w: 1.1, id: 'door-sc-it' },
  { type: 'door', kind: 'security', a: 'it', b: 'server', at: [42.5, 10], w: 1.1, id: 'door-server-main' },
  { type: 'door', kind: 'security', a: 'mech', b: 'server', at: [38, 4.5], w: 1.1, id: 'door-server-back' },
  { type: 'door', kind: 'standard', a: 'it', b: 'corr-e', at: [41, 18], w: 1.0, id: 'door-it-corr' },
  { type: 'door', kind: 'standard', a: 'corr-e', b: 'wait', at: [41, 24], w: 1.0, id: 'door-corre-wait' },
  { type: 'door', kind: 'standard', a: 'copy', b: 'corr-e', at: [38, 20.5], w: 1.0, id: 'door-copy' },
  { type: 'arch', a: 'lobby', b: 'wait', at: [34, 28], w: 3.6 },
  { type: 'arch', a: 'garage', b: 'loading', at: [14, 6], w: 3.6, h: 2.6 },
  { type: 'door', kind: 'fire', a: 'sc', b: 'courtyard', at: [0, 13.5], w: 1.1, id: 'door-courtyard' },
  { type: 'shutter', a: 'garage', b: 'out', at: [7, 0], w: 4.6, h: 2.7, id: 'garage-shutter' },
  { type: 'door', kind: 'fire', a: 'loading', b: 'out', at: [26.5, 0], w: 1.1, id: 'door-dock', locked: true },
  { type: 'dockdoor', a: 'loading', b: 'out', at: [19, 0], w: 3.4, h: 2.5 },

  // ---------- UPPER: doors ----------
  { type: 'door', kind: 'fire', a: 'stair-a1', b: 'exec-corr', at: [34, 16], w: 1.1, id: 'door-sta1-exec' },
  { type: 'door', kind: 'fire', a: 'stair-a1', b: 'mezz', at: [30.2, 24], w: 1.1, id: 'door-sta1-mezz' },
  { type: 'door', kind: 'fire', a: 'stair-b', b: 'sc', at: [15.2, 15], w: 1.1, id: 'door-stb-sc' },
  { type: 'door', kind: 'fire', a: 'stair-b1', b: 'corr-w', at: [15.0, 21], w: 1.1, id: 'door-stb1' },
  { type: 'arch', a: 'corr-n', b: 'cubes', at: [28, 11.5], w: 2.6 },
  { type: 'door', kind: 'glass', a: 'conference', b: 'corr-n', at: [33, 10], w: 1.1, id: 'door-conf' },
  { type: 'door', kind: 'standard', a: 'records', b: 'corr-n', at: [43.5, 10], w: 1.0, id: 'door-records' },
  { type: 'arch', a: 'exec-corr', b: 'corr-n', at: [46, 13], w: 2.2 },
  { type: 'door', kind: 'standard', a: 'asst', b: 'exec-corr', at: [36.5, 17], w: 1.0, id: 'door-asst-n' },
  { type: 'door', kind: 'standard', a: 'asst', b: 'hr', at: [36.5, 24], w: 1.0, id: 'door-asst-s' },
  { type: 'door', kind: 'woodDouble', a: 'exec', b: 'exec-corr', at: [42.5, 17], w: 1.7, id: 'door-exec' },
  { type: 'door', kind: 'standard', a: 'hr', b: 'mezz', at: [39, 30], w: 1.0, id: 'door-hr' },
  { type: 'door', kind: 'standard', a: 'store', b: 'mezz', at: [44, 32.5], w: 1.0, id: 'door-store' },
  { type: 'arch', a: 'hr', b: 'mezz', at: [34, 27], w: 1.8 },
  { type: 'arch', a: 'cubes', b: 'print', at: [24, 15], w: 3.0 },
  { type: 'arch', a: 'cubes', b: 'corr-w', at: [8, 21], w: 2.4 },
  { type: 'arch', a: 'corr-w', b: 'mezz', at: [10.5, 24], w: 3.0 },
  { type: 'door', kind: 'standard', a: 'well', b: 'corr-w', at: [3.25, 24], w: 1.0, id: 'door-well' },

  // ---------- Windows: exterior ----------
  { type: 'window', kind: 'curtain', a: 'lobby', b: 'plaza', at: [10, 32], w: 6.4, sill: 0.4, head: 2.7 },
  { type: 'window', kind: 'curtain', a: 'lobby', b: 'plaza', at: [27, 36], w: 12.0, sill: 0.4, head: 2.7 },
  { type: 'window', kind: 'exterior', a: 'vest', b: 'plaza', at: [14, 34], w: 1.6, sill: 0.4, head: 2.6 },
  { type: 'glasswall', a: 'vest', b: 'lobby', at: [20, 34], w: 1.6, sill: 0.4, head: 2.6 },
  { type: 'window', kind: 'curtain', a: 'wait', b: 'out', at: [41, 36], w: 10.0, sill: 0.4, head: 2.7 },
  { type: 'window', kind: 'exterior', a: 'wait', b: 'out', at: [48, 30], w: 4.4, sill: 0.7, head: 2.6 },
  { type: 'window', kind: 'exterior', a: 'break', b: 'courtyard', at: [0, 19.5], w: 3.2, sill: 0.9, head: 2.6 },
  { type: 'window', kind: 'slit', a: 'garage', b: 'courtyard', at: [0, 10], w: 1.8, sill: 1.8, head: 2.6 },
  { type: 'window', kind: 'exterior', a: 'it', b: 'out', at: [48, 14], w: 3.0, sill: 0.9, head: 2.6 },
  { type: 'window', kind: 'exterior', a: 'corr-e', b: 'out', at: [48, 21], w: 2.6, sill: 0.9, head: 2.6 },
  { type: 'window', kind: 'slit', a: 'loading', b: 'out', at: [25.5, 0], w: 2.0, sill: 1.8, head: 2.6 },
  // Upper exterior
  { type: 'window', kind: 'ribbon', a: 'cubes', b: 'out', at: [7, 0], w: 9.4, sill: 0.85, head: 2.45 },
  { type: 'window', kind: 'ribbon', a: 'cubes', b: 'out', at: [20, 0], w: 9.4, sill: 0.85, head: 2.45 },
  { type: 'window', kind: 'ribbon', a: 'cubes', b: 'out', at: [0, 7.5], w: 10.4, sill: 0.85, head: 2.45 },
  { type: 'window', kind: 'ribbon', a: 'conference', b: 'out', at: [34, 0], w: 10.0, sill: 0.85, head: 2.45 },
  { type: 'window', kind: 'slit', a: 'records', b: 'out', at: [44, 0], w: 5.6, sill: 1.7, head: 2.4 },
  { type: 'window', kind: 'exterior', a: 'records', b: 'out', at: [48, 5], w: 3.6, sill: 0.9, head: 2.45 },
  { type: 'window', kind: 'ribbon', a: 'exec', b: 'out', at: [48, 20.5], w: 5.4, sill: 0.5, head: 2.5 },
  { type: 'window', kind: 'exterior', a: 'store', b: 'out', at: [48, 30], w: 3.6, sill: 0.9, head: 2.45 },
  { type: 'window', kind: 'curtain', a: 'mezz', b: 'out', at: [25, 36], w: 34.0, sill: 0.4, head: 2.55 },
  { type: 'window', kind: 'exterior', a: 'well', b: 'out', at: [0, 26.5], w: 2.6, sill: 0.9, head: 2.45 },
  { type: 'window', kind: 'exterior', a: 'corr-w', b: 'out', at: [0, 22.5], w: 2.0, sill: 0.9, head: 2.45 },

  // ---------- Interior glass ----------
  { type: 'glasswall', a: 'sec', b: 'lobby', at: [21.8, 24], w: 3.2, sill: 0.9, head: 2.5 },
  { type: 'glasswall', a: 'conference', b: 'corr-n', at: [36.5, 10], w: 5.4, sill: 0.75, head: 2.5 },
  { type: 'glasswall', a: 'vest', b: 'lobby', at: [15, 32], w: 1.6, sill: 0.4, head: 2.6 },
  { type: 'glasswall', a: 'vest', b: 'lobby', at: [19, 32], w: 1.6, sill: 0.4, head: 2.6 },
  { type: 'glasswall', a: 'asst', b: 'exec-corr', at: [38.4, 17], w: 2.2, sill: 0.9, head: 2.5 },
];

// Named checkpoints for QA teleports and repeatable cameras: [x, y(feet), z, yawDeg]
export const CHECKPOINTS = {
  'plaza': [20, 0, 41, 355],
  'plaza-spawn': [26, 0, 42.5, 10],
  'vest': [17, 0, 34, 0],
  'lobby': [17, 0, 28, 90],
  'lobby-desk': [22, 0, 26.5, 135],
  'gallery': [27, 0, 34, 90],
  'wait': [41, 0, 30, 45],
  'sec': [24, 0, 19.5, 0],
  'stair-a': [31, 0, 20, 0],
  'copy': [36, 0, 19.5, 90],
  'corr-e': [43, 0, 21, 90],
  'it': [43, 0, 14, 0],
  'server': [43, 0, 5, 315],
  'mech': [34, 0, 6, 0],
  'loading': [22, 0, 6, 270],
  'garage': [7, 0, 6, 0],
  'sc-west': [2, 0, 13.5, 90],
  'sc-mid': [20, 0, 13.5, 90],
  'sc-east': [36, 0, 13.5, 270],
  'break': [4, 0, 19.5, 0],
  'janitor': [11, 0, 16.5, 180],
  'rr-m': [11, 0, 21, 0],
  'rr-w': [3, 0, 26.5, 270],
  'stair-b': [17, 0, 18, 0],
  'courtyard': [-4, 0, 19, 90],
  'cubes': [14, 3.6, 8, 200],
  'cubes-west': [4, 3.6, 12, 270],
  'print': [24, 3.6, 19.5, 180],
  'corr-n': [38, 3.6, 11.5, 90],
  'conference': [34, 3.6, 5, 0],
  'records': [44, 3.6, 5, 0],
  'exec-corr': [41, 3.6, 15, 90],
  'asst': [37, 3.6, 20.5, 0],
  'exec': [44, 3.6, 20.5, 45],
  'corr-w': [10, 3.6, 22.5, 90],
  'well': [3, 3.6, 26.5, 0],
  'mezz-west': [10, 3.6, 27, 180],
  'mezz-south': [25, 3.6, 33, 0],
  'mezz-east': [31, 3.6, 27, 0],
  'hr': [39, 3.6, 27, 90],
  'store': [46, 3.6, 30, 0],
  'stair-a1': [31, 3.6, 20, 180],
  'stair-b1': [17, 3.6, 18, 180],
};

export const PLAYER_SPAWN = { pos: [26, 0, 42.5], yawDeg: 10 };

// Hostage setups: primary spot + kneel orientation
export const HOSTAGES = [
  { id: 'hostage-a', name: 'D. Okafor', variant: 0, pos: [45.5, 0, 3.0], yawDeg: 300, room: 'server' },
  { id: 'hostage-b', name: 'M. Lindqvist', variant: 1, pos: [45.8, 3.6, 21.5], yawDeg: 270, room: 'exec' },
];

// Extraction zone (inside garage, by the response van)
export const EXTRACTION = { center: [5.2, 0, 6.4], radius: 3.4, room: 'garage' };

// Enemy roster: pos + patrol waypoints (checkpoint-relative free points). type: scout|trooper|heavy
export const ENEMIES = [
  { id: 'e-lobby-1', type: 'trooper', pos: [12, 0, 27], patrol: [[12, 0, 27], [24, 0, 29.5], [30, 0, 34], [17, 0, 29]], room: 'lobby' },
  { id: 'e-lobby-2', type: 'scout', pos: [28, 0, 33.5], patrol: [[28, 0, 33.5], [40, 0, 31], [44, 0, 27], [36, 0, 28]], room: 'wait' },
  { id: 'e-sec', type: 'trooper', pos: [24, 0, 20], patrol: [[24, 0, 20], [22, 0, 22.5]], room: 'sec' },
  { id: 'e-sc-1', type: 'scout', pos: [10, 0, 13.5], patrol: [[10, 0, 13.5], [30, 0, 13.5], [35, 0, 13.5], [18, 0, 13.5]], room: 'sc' },
  { id: 'e-loading-1', type: 'trooper', pos: [20, 0, 5], patrol: [[20, 0, 5], [26, 0, 8], [17, 0, 9]], room: 'loading' },
  { id: 'e-loading-2', type: 'heavy', pos: [26, 0, 3], patrol: [[26, 0, 3], [22, 0, 6.5]], room: 'loading', minDifficulty: 1.0 },
  { id: 'e-mech', type: 'scout', pos: [34, 0, 6], patrol: [[34, 0, 6], [32, 0, 9.5], [36, 0, 3.5]], room: 'mech', minDifficulty: 1.0 },
  { id: 'e-it', type: 'trooper', pos: [43, 0, 14], patrol: [[43, 0, 14], [40, 0, 12], [46, 0, 16]], room: 'it' },
  { id: 'e-server', type: 'heavy', pos: [42, 0, 4.5], patrol: [[42, 0, 4.5], [40.5, 0, 7.5]], room: 'server' },
  { id: 'e-cubes-1', type: 'trooper', pos: [8, 3.6, 8], patrol: [[8, 3.6, 8], [22, 3.6, 6], [24, 3.6, 12], [10, 3.6, 13]], room: 'cubes' },
  { id: 'e-cubes-2', type: 'scout', pos: [5, 3.6, 17], patrol: [[5, 3.6, 17], [16, 3.6, 22.5], [10, 3.6, 27]], room: 'cubes', minDifficulty: 1.0 },
  { id: 'e-corrn', type: 'scout', pos: [38, 3.6, 11.5], patrol: [[38, 3.6, 11.5], [46, 3.6, 11.5], [33, 3.6, 5], [30, 3.6, 11.5]], room: 'corr-n' },
  { id: 'e-mezz', type: 'trooper', pos: [25, 3.6, 33], patrol: [[25, 3.6, 33], [10, 3.6, 33], [31, 3.6, 27], [40, 3.6, 33]], room: 'mezz' },
  { id: 'e-exec-1', type: 'heavy', pos: [43, 3.6, 20], patrol: [[43, 3.6, 20], [41.5, 3.6, 22.5]], room: 'exec' },
  { id: 'e-exec-2', type: 'trooper', pos: [37, 3.6, 15], patrol: [[37, 3.6, 15], [44, 3.6, 15], [37, 3.6, 20.5]], room: 'exec-corr', minDifficulty: 1.2 },
  { id: 'e-records', type: 'scout', pos: [44, 3.6, 5], patrol: [[44, 3.6, 5], [41.5, 3.6, 8]], room: 'records', minDifficulty: 1.2 },
];

export function roomById(id) { return ROOMS.find((r) => r.id === id); }

export function roomAt(x, z, floorIdx) {
  for (const r of ROOMS) {
    if (r.floor !== floorIdx) continue;
    for (const rc of r.rects) {
      if (x >= rc[0] && x <= rc[2] && z >= rc[1] && z <= rc[3]) return r;
    }
  }
  return null;
}
export function floorIndexForY(y) { return y > 2.4 ? 1 : 0; }
