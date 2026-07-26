import { UNITS } from '../art/palette.js';

/**
 * NORTHSTAR ADMINISTRATIVE CENTER — floor plan data.
 * Owner: Fable 2 (map architecture & environmental composition).
 *
 * Coordinate convention (shared with render_game_to_text):
 *   +X = east, +Y = up, +Z = south. North is -Z. 1 unit = 1 metre.
 *   Ground slab top y 0.0, upper slab top y 4.2, upper ceiling 7.2.
 *
 * Plan logic — a double loop, never a single hallway:
 *   · Perimeter ring : North Cross Corridor / West / East / South Service
 *   · Central spine  : Concourse (ground) and Executive Cross Corridor (upper)
 *   · Mid-block link : Mid-Block Corridor (ground) and Executive Gallery (upper)
 *   · Two vertical links: Central Stairwell (east) and West Fire Stair
 * Every objective room therefore has two or more approaches and no branch
 * terminates in an accidental dead end.
 *
 * Room rectangles tile the building footprint without gaps. Walls are derived
 * from shared rectangle edges, so the shell can never expose the void.
 */

export const FLOOR_Y = { ground: 0, upper: 4.2 };
export const CEIL = { std: 3.2, corridor: 3.0, lobby: 7.2, tall: 4.0, garage: 5.0, waiting: 3.6, upper: 3.0 };

export const SLAB_THICKNESS = 0.35;
export const UPPER_SOFFIT = FLOOR_Y.upper - SLAB_THICKNESS; // 3.85
export const ROOF_LOW = 4.35;
export const ROOF_MID = 5.35;
export const ROOF_HIGH = 7.55;

export const ROOMS = [
  /* ================= GROUND FLOOR ================= */
  {
    id: 'mechanical', name: 'Mechanical Plant', floor: 'ground', kind: 'room',
    x0: -32, z0: -20, x1: -21, z1: -9, ceilH: CEIL.tall,
    floorMat: 'concrete.raw', wallMat: 'concrete.wall', ceiling: 'slab', light: 'service',
  },
  {
    id: 'lobby', name: 'Reception Lobby', floor: 'ground', kind: 'room',
    x0: -21, z0: -20, x1: 12, z1: -9, ceilH: CEIL.lobby,
    floorMat: 'tile.darkFloor', wallMat: 'drywall.warm', ceiling: 'custom', light: 'lobby',
    doubleHeight: true,
  },
  {
    id: 'vestibule', name: 'Security Vestibule', floor: 'ground', kind: 'room',
    x0: -5, z0: -20, x1: 5, z1: -16.5, ceilH: 3.0, insideOf: 'lobby', skipEdges: ['n'],
    floorMat: 'concrete.polished', wallMat: 'drywall.cool', ceiling: 'grid', light: 'vestibule',
  },
  {
    id: 'waiting', name: 'Visitor Waiting Area', floor: 'ground', kind: 'room',
    x0: 12, z0: -20, x1: 21, z1: -9, ceilH: CEIL.waiting,
    floorMat: 'carpet.teal', wallMat: 'drywall.warm', ceiling: 'grid', light: 'waiting',
  },

  {
    id: 'northcorr', name: 'North Cross Corridor', floor: 'ground', kind: 'corridor',
    x0: -24, z0: -9, x1: 24, z1: -5, ceilH: CEIL.corridor,
    floorMat: 'carpet.worn', wallMat: 'drywall.warm', ceiling: 'grid', light: 'corridor',
  },
  {
    id: 'westcorr', name: 'West Corridor', floor: 'ground', kind: 'corridor',
    x0: -24, z0: -5, x1: -21, z1: 18, ceilH: CEIL.corridor,
    floorMat: 'carpet.worn', wallMat: 'drywall.warm', ceiling: 'grid', light: 'corridorWest',
  },
  {
    id: 'eastcorr', name: 'East Corridor', floor: 'ground', kind: 'corridor',
    x0: 21, z0: -5, x1: 24, z1: 18, ceilH: CEIL.corridor,
    floorMat: 'vinyl.grey', wallMat: 'drywall.scuffed', ceiling: 'grid', light: 'service',
  },
  {
    id: 'southcorr', name: 'South Service Corridor', floor: 'ground', kind: 'corridor',
    x0: -21, z0: 15, x1: 21, z1: 18, ceilH: CEIL.corridor,
    floorMat: 'vinyl.grey', wallMat: 'drywall.scuffed', ceiling: 'grid', light: 'service',
  },
  {
    id: 'spine', name: 'Central Concourse', floor: 'ground', kind: 'corridor',
    x0: -2.5, z0: -5, x1: 2.5, z1: 15, ceilH: CEIL.corridor,
    floorMat: 'carpet.worn', wallMat: 'drywall.warm', ceiling: 'grid', light: 'corridor',
  },
  {
    id: 'midcorr', name: 'Mid-Block Corridor', floor: 'ground', kind: 'corridor',
    x0: 2.5, z0: 8.5, x1: 21, z1: 11.5, ceilH: CEIL.corridor,
    floorMat: 'carpet.worn', wallMat: 'drywall.warm', ceiling: 'grid', light: 'corridor',
  },

  {
    id: 'archive', name: 'Records Archive', floor: 'ground', kind: 'room',
    x0: -32, z0: -9, x1: -24, z1: 0.5, ceilH: CEIL.std,
    floorMat: 'vinyl.grey', wallMat: 'drywall.cool', ceiling: 'grid', light: 'archive',
  },
  {
    id: 'it', name: 'IT Workspace', floor: 'ground', kind: 'room',
    x0: -32, z0: 0.5, x1: -24, z1: 9.6, ceilH: CEIL.std,
    floorMat: 'vinyl.grey', wallMat: 'drywall.cool', ceiling: 'grid', light: 'it',
  },

  {
    id: 'firestair', name: 'West Fire Stair', floor: 'ground', kind: 'stair',
    x0: -21, z0: -5, x1: -15, z1: 1, ceilH: CEIL.upper + FLOOR_Y.upper,
    floorMat: 'concrete.polished', wallMat: 'concrete.wall', ceiling: 'open', light: 'stair',
  },
  {
    id: 'openplanA', name: 'Open-Plan Floor (East Bay)', floor: 'ground', kind: 'room',
    x0: -15, z0: -5, x1: -2.5, z1: 15, ceilH: CEIL.std,
    floorMat: 'carpet.slate', wallMat: 'drywall.warm', ceiling: 'grid', light: 'openplan',
  },
  {
    id: 'openplanB', name: 'Open-Plan Floor (West Bay)', floor: 'ground', kind: 'room',
    x0: -21, z0: 1, x1: -15, z1: 15, ceilH: CEIL.std,
    floorMat: 'carpet.slate', wallMat: 'drywall.warm', ceiling: 'grid', light: 'openplan',
  },

  {
    id: 'conference', name: 'Aurora Conference Room', floor: 'ground', kind: 'room',
    x0: 2.5, z0: -5, x1: 13, z1: 2.5, ceilH: CEIL.std,
    floorMat: 'carpet.warm', wallMat: 'drywall.accent', ceiling: 'grid', light: 'conference',
  },
  {
    id: 'breakroom', name: 'Break Room & Kitchen', floor: 'ground', kind: 'room',
    x0: 13, z0: -5, x1: 21, z1: 2.5, ceilH: CEIL.std,
    floorMat: 'vinyl.plank', wallMat: 'drywall.warm', ceiling: 'grid', light: 'breakroom',
  },
  {
    id: 'copy', name: 'Copy & Mail Room', floor: 'ground', kind: 'room',
    x0: 2.5, z0: 2.5, x1: 9.5, z1: 8.5, ceilH: CEIL.std,
    floorMat: 'vinyl.grey', wallMat: 'drywall.cool', ceiling: 'grid', light: 'copy',
  },
  {
    id: 'restroom', name: 'Restrooms', floor: 'ground', kind: 'room',
    x0: 9.5, z0: 2.5, x1: 16, z1: 8.5, ceilH: CEIL.std,
    floorMat: 'tile.ceramic', wallMat: 'tile.mosaic', ceiling: 'grid', light: 'restroom',
  },
  {
    id: 'janitor', name: 'Janitor & Utility Closet', floor: 'ground', kind: 'room',
    x0: 16, z0: 2.5, x1: 21, z1: 8.5, ceilH: CEIL.std,
    floorMat: 'concrete.polished', wallMat: 'drywall.scuffed', ceiling: 'slab', light: 'service',
  },
  {
    id: 'stairwell', name: 'Central Stairwell', floor: 'ground', kind: 'stair',
    x0: 2.5, z0: 11.5, x1: 10, z1: 15, ceilH: CEIL.upper + FLOOR_Y.upper,
    floorMat: 'concrete.polished', wallMat: 'concrete.wall', ceiling: 'open', light: 'stair',
  },
  {
    id: 'server', name: 'Server Room', floor: 'ground', kind: 'room',
    x0: 10, z0: 11.5, x1: 21, z1: 15, ceilH: CEIL.std,
    floorMat: 'tile.darkFloor', wallMat: 'drywall.cool', ceiling: 'slab', light: 'server',
  },

  {
    id: 'loading', name: 'Loading Area', floor: 'ground', kind: 'room',
    x0: 24, z0: -9, x1: 32, z1: 5, ceilH: CEIL.garage,
    floorMat: 'concrete.raw', wallMat: 'concrete.wall', ceiling: 'slab', light: 'loading',
  },
  {
    id: 'garage', name: 'Extraction Garage', floor: 'ground', kind: 'room',
    x0: 24, z0: 5, x1: 32, z1: 18, ceilH: CEIL.garage,
    floorMat: 'concrete.raw', wallMat: 'concrete.wall', ceiling: 'slab', light: 'garage',
  },

  /* ================= UPPER FLOOR ================= */
  {
    id: 'mezz', name: 'Lobby Mezzanine', floor: 'upper', kind: 'corridor',
    x0: -21, z0: -13, x1: 21, z1: -9, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.warm', ceiling: 'grid', light: 'mezz',
  },
  {
    id: 'execcorr', name: 'Executive Corridor', floor: 'upper', kind: 'corridor',
    x0: -21, z0: -9, x1: 21, z1: -5, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.brand', ceiling: 'grid', light: 'exec',
  },
  {
    id: 'firestairU', name: 'West Fire Stair Landing', floor: 'upper', kind: 'stair',
    x0: -21, z0: -5, x1: -15, z1: -2.9, ceilH: CEIL.upper,
    floorMat: 'concrete.polished', wallMat: 'concrete.wall', ceiling: 'slab', light: 'stair',
  },
  {
    id: 'boardroom', name: 'Northlight Boardroom', floor: 'upper', kind: 'room',
    x0: -15, z0: -5, x1: -2.5, z1: 4, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.accent', ceiling: 'grid', light: 'boardroom',
  },
  {
    id: 'boardroomW', name: 'Boardroom West Bay', floor: 'upper', kind: 'room',
    x0: -21, z0: 1, x1: -15, z1: 4, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.accent', ceiling: 'grid', light: 'boardroom',
  },
  {
    id: 'records2', name: 'Upper Records Annex', floor: 'upper', kind: 'room',
    x0: -21, z0: 4, x1: -2.5, z1: 15, ceilH: CEIL.upper,
    floorMat: 'vinyl.grey', wallMat: 'drywall.cool', ceiling: 'grid', light: 'archive',
  },
  {
    id: 'execspine', name: 'Executive Cross Corridor', floor: 'upper', kind: 'corridor',
    x0: -2.5, z0: -5, x1: 2.5, z1: 15, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.warm', ceiling: 'grid', light: 'exec',
  },
  {
    id: 'execante', name: 'Executive Anteroom', floor: 'upper', kind: 'room',
    x0: 2.5, z0: -5, x1: 21, z1: 2.5, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.warm', ceiling: 'grid', light: 'exec',
  },
  {
    id: 'exec', name: 'Executive Office', floor: 'upper', kind: 'room',
    x0: 2.5, z0: 2.5, x1: 21, z1: 10, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'wood.veneer', ceiling: 'slab', light: 'execOffice',
  },
  {
    id: 'execgal', name: 'Executive Gallery', floor: 'upper', kind: 'corridor',
    x0: 2.5, z0: 10, x1: 21, z1: 11.5, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.brand', ceiling: 'grid', light: 'exec',
  },
  {
    id: 'landing', name: 'Central Stair Landing', floor: 'upper', kind: 'stair',
    x0: 2.5, z0: 11.5, x1: 4, z1: 15, ceilH: CEIL.upper,
    floorMat: 'concrete.polished', wallMat: 'concrete.wall', ceiling: 'slab', light: 'stair',
  },
  {
    id: 'execlounge', name: 'Executive Lounge', floor: 'upper', kind: 'room',
    x0: 10, z0: 11.5, x1: 21, z1: 15, ceilH: CEIL.upper,
    floorMat: 'carpet.exec', wallMat: 'drywall.warm', ceiling: 'grid', light: 'lounge',
  },

  /* ================= EXTERIOR ZONES (nav + lighting only) ================= */
  {
    id: 'court', name: 'North Courtyard', floor: 'ground', kind: 'exterior',
    x0: -24, z0: -34, x1: 24, z1: -20, ceilH: 0,
    floorMat: 'snow.fresh', ceiling: 'none', light: 'exterior',
  },
  {
    id: 'westyard', name: 'West Service Yard', floor: 'ground', kind: 'exterior',
    x0: -36, z0: 9.6, x1: -24, z1: 22, ceilH: 0,
    floorMat: 'snow.fresh', ceiling: 'none', light: 'exterior',
  },
  {
    id: 'eastyard', name: 'East Extraction Yard', floor: 'ground', kind: 'exterior',
    x0: 32, z0: 2, x1: 46, z1: 22, ceilH: 0,
    floorMat: 'snow.trampled', ceiling: 'none', light: 'exterior',
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
export const INTERIOR_ROOMS = ROOMS.filter((r) => r.kind !== 'exterior');

/** Voids: upper-floor rectangles that are intentionally open to the floor below. */
export const UPPER_VOIDS = [
  { id: 'void.centralStair', x0: 4, z0: 11.5, x1: 10, z1: 15 },
  { id: 'void.fireStair', x0: -21, z0: -2.9, x1: -15, z1: 1 },
  { id: 'void.lobby', x0: -21, z0: -20, x1: 12, z1: -13 },
];

/**
 * Openings carve holes through generated walls.
 *  axis 'x' → wall plane at constant X, runs along Z
 *  axis 'z' → wall plane at constant Z, runs along X
 *  a,b      → span along the running axis (world coordinates)
 *  y0,y1    → height above that floor's slab
 */
export const OPENINGS = [
  /* ---- Entrance sequence ---- */
  { id: 'op.entrance', floor: 'ground', axis: 'z', at: -20, a: -2.1, b: 2.1, y0: 0, y1: 2.45, type: 'door', door: 'exteriorDouble' },
  { id: 'op.vest.inner', floor: 'ground', axis: 'z', at: -16.5, a: -2.1, b: 2.1, y0: 0, y1: 2.45, type: 'door', door: 'glassDouble' },
  { id: 'op.vest.wglass', floor: 'ground', axis: 'x', at: -5, a: -19.7, b: -17.0, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.vest.eglass', floor: 'ground', axis: 'x', at: 5, a: -19.7, b: -17.0, y0: 0.0, y1: 2.7, type: 'glasswall' },

  /* ---- Lobby & waiting glazing ---- */
  { id: 'op.lobby.cw1', floor: 'ground', axis: 'z', at: -20, a: -20.3, b: -5.3, y0: 0.35, y1: 6.4, type: 'window', glass: 'tinted', mullions: true },
  { id: 'op.lobby.cw2', floor: 'ground', axis: 'z', at: -20, a: 5.3, b: 11.3, y0: 0.35, y1: 6.4, type: 'window', glass: 'tinted', mullions: true },
  { id: 'op.wait.cw', floor: 'ground', axis: 'z', at: -20, a: 12.7, b: 20.3, y0: 0.5, y1: 3.0, type: 'window', glass: 'tinted', mullions: true },
  { id: 'op.wait.e', floor: 'ground', axis: 'x', at: 21, a: -19.3, b: -9.7, y0: 0.5, y1: 3.0, type: 'window', glass: 'tinted', mullions: true },

  /* ---- Lobby internal connections ---- */
  { id: 'op.lobby.wait', floor: 'ground', axis: 'x', at: 12, a: -18.5, b: -11.5, y0: 0, y1: 3.1, type: 'arch' },
  { id: 'op.lobby.nc.w', floor: 'ground', axis: 'z', at: -9, a: -9.6, b: -5.6, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.lobby.nc.e', floor: 'ground', axis: 'z', at: -9, a: 3.6, b: 7.6, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.lobby.nc.g1', floor: 'ground', axis: 'z', at: -9, a: -19.6, b: -11.4, y0: 0.9, y1: 2.7, type: 'glasswall' },
  { id: 'op.lobby.nc.g2', floor: 'ground', axis: 'z', at: -9, a: -3.6, b: 1.6, y0: 0.9, y1: 2.7, type: 'glasswall' },
  { id: 'op.wait.nc', floor: 'ground', axis: 'z', at: -9, a: 14.6, b: 15.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.mech.lobby', floor: 'ground', axis: 'x', at: -21, a: -14.6, b: -13.6, y0: 0, y1: 2.1, type: 'door', door: 'security' },
  { id: 'op.mech.nc', floor: 'ground', axis: 'z', at: -9, a: -23.4, b: -22.4, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.mech.win', floor: 'ground', axis: 'x', at: -32, a: -18, b: -11, y0: 2.5, y1: 3.6, type: 'window', glass: 'frosted', mullions: true },

  /* ---- West block ---- */
  { id: 'op.arch.nc', floor: 'ground', axis: 'x', at: -24, a: -8.2, b: -7.2, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.arch.wc', floor: 'ground', axis: 'x', at: -24, a: -3.6, b: -2.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.arch.win', floor: 'ground', axis: 'x', at: -32, a: -7.6, b: -1.4, y0: 1.5, y1: 2.9, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.it.wc1', floor: 'ground', axis: 'x', at: -24, a: 1.6, b: 2.6, y0: 0, y1: 2.1, type: 'door', door: 'glass' },
  { id: 'op.it.wc2', floor: 'ground', axis: 'x', at: -24, a: 7.6, b: 8.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.it.vis', floor: 'ground', axis: 'x', at: -24, a: 3.8, b: 6.4, y0: 0.95, y1: 2.35, type: 'glasswall' },
  { id: 'op.it.win', floor: 'ground', axis: 'x', at: -32, a: 1.4, b: 8.8, y0: 0.9, y1: 2.9, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.wc.win', floor: 'ground', axis: 'x', at: -24, a: 10.4, b: 17.4, y0: 0.9, y1: 2.75, type: 'window', glass: 'clear', mullions: true },

  /* ---- Fire stair ---- */
  { id: 'op.fs.nc', floor: 'ground', axis: 'z', at: -5, a: -19.6, b: -18.6, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.fs.op', floor: 'ground', axis: 'z', at: 1, a: -19.6, b: -18.6, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.fsU.corr', floor: 'upper', axis: 'z', at: -5, a: -19.6, b: -18.6, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.fsU.board', floor: 'upper', axis: 'x', at: -15, a: -4.6, b: -3.6, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  // West fire stair head: the flight arrives across z = -2.9 at x -17.8..-16.3.
  { id: 'op.fsU.stairhead', floor: 'upper', axis: 'z', at: -2.9, a: -17.9, b: -16.2, y0: 0, y1: 2.9, type: 'open' },
  { id: 'op.fsU.railW', floor: 'upper', axis: 'z', at: -2.9, a: -21, b: -17.9, y0: 0, y1: 3.0, type: 'rail' },
  { id: 'op.fsU.railE', floor: 'upper', axis: 'z', at: -2.9, a: -16.2, b: -15, y0: 0, y1: 3.0, type: 'rail' },

  /* ---- Open plan ---- */
  { id: 'op.op.nc1', floor: 'ground', axis: 'z', at: -5, a: -13.6, b: -10.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.nc2', floor: 'ground', axis: 'z', at: -5, a: -7.6, b: -4.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.nc.g', floor: 'ground', axis: 'z', at: -5, a: -9.8, b: -8.2, y0: 0.9, y1: 2.6, type: 'glasswall' },
  { id: 'op.op.spine1', floor: 'ground', axis: 'x', at: -2.5, a: -3.6, b: -0.6, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.spine2', floor: 'ground', axis: 'x', at: -2.5, a: 6, b: 9, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.spine.g', floor: 'ground', axis: 'x', at: -2.5, a: 1.4, b: 4.6, y0: 0.9, y1: 2.6, type: 'glasswall' },
  { id: 'op.op.wc1', floor: 'ground', axis: 'x', at: -21, a: 2.6, b: 3.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.op.wc2', floor: 'ground', axis: 'x', at: -21, a: 10.4, b: 13.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.sc1', floor: 'ground', axis: 'z', at: 15, a: -13.6, b: -10.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.op.sc2', floor: 'ground', axis: 'z', at: 15, a: -19.4, b: -18.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.spine.sc', floor: 'ground', axis: 'z', at: 15, a: -2.5, b: 2.5, y0: 0, y1: 2.8, type: 'open' },

  /* ---- Centre-east rooms ---- */
  { id: 'op.conf.nc', floor: 'ground', axis: 'z', at: -5, a: 5.6, b: 6.6, y0: 0, y1: 2.1, type: 'door', door: 'glass' },
  { id: 'op.conf.ncg', floor: 'ground', axis: 'z', at: -5, a: 7.4, b: 12.4, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.conf.spine.d', floor: 'ground', axis: 'x', at: 2.5, a: -2.6, b: -1.6, y0: 0, y1: 2.1, type: 'door', door: 'glass' },
  { id: 'op.conf.spine.g', floor: 'ground', axis: 'x', at: 2.5, a: -4.6, b: -3.2, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.conf.spine.g2', floor: 'ground', axis: 'x', at: 2.5, a: -1.0, b: 1.9, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.conf.brk', floor: 'ground', axis: 'x', at: 13, a: 0.4, b: 1.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.brk.nc', floor: 'ground', axis: 'z', at: -5, a: 16.4, b: 17.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.brk.ec', floor: 'ground', axis: 'x', at: 21, a: -2.6, b: -1.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.copy.spine', floor: 'ground', axis: 'x', at: 2.5, a: 4.4, b: 5.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.copy.mid', floor: 'ground', axis: 'z', at: 8.5, a: 6.6, b: 7.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.rest.mid1', floor: 'ground', axis: 'z', at: 8.5, a: 10.4, b: 11.3, y0: 0, y1: 2.1, type: 'door', door: 'restroom' },
  { id: 'op.rest.mid2', floor: 'ground', axis: 'z', at: 8.5, a: 13.6, b: 14.5, y0: 0, y1: 2.1, type: 'door', door: 'restroom' },
  { id: 'op.jan.mid', floor: 'ground', axis: 'z', at: 8.5, a: 17.8, b: 18.8, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.jan.ec', floor: 'ground', axis: 'x', at: 21, a: 4.2, b: 5.2, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.mid.ec', floor: 'ground', axis: 'x', at: 21, a: 9.0, b: 11.2, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.srv.mid', floor: 'ground', axis: 'z', at: 11.5, a: 13.6, b: 14.6, y0: 0, y1: 2.1, type: 'door', door: 'server' },
  { id: 'op.srv.win', floor: 'ground', axis: 'z', at: 11.5, a: 15.8, b: 19.2, y0: 1.0, y1: 2.3, type: 'glasswall' },
  { id: 'op.srv.sc', floor: 'ground', axis: 'z', at: 15, a: 18.0, b: 19.0, y0: 0, y1: 2.1, type: 'door', door: 'security' },
  { id: 'op.stair.mid', floor: 'ground', axis: 'z', at: 11.5, a: 2.7, b: 3.9, y0: 0, y1: 2.4, type: 'arch' },
  { id: 'op.stair.spine', floor: 'ground', axis: 'x', at: 2.5, a: 12.2, b: 14.4, y0: 0, y1: 2.4, type: 'arch' },
  { id: 'op.stair.sc', floor: 'ground', axis: 'z', at: 15, a: 5.4, b: 6.4, y0: 0, y1: 2.1, type: 'door', door: 'fire' },

  /* ---- South & east ---- */
  { id: 'op.sc.win', floor: 'ground', axis: 'z', at: 18, a: -19, b: -13, y0: 1.6, y1: 2.6, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.sc.win2', floor: 'ground', axis: 'z', at: 18, a: 8, b: 14, y0: 1.6, y1: 2.6, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.load.nc', floor: 'ground', axis: 'x', at: 24, a: -8.6, b: -6.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.load.ec', floor: 'ground', axis: 'x', at: 24, a: -3.6, b: -2.6, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.load.dock', floor: 'ground', axis: 'x', at: 32, a: -6.5, b: -2.5, y0: 0.9, y1: 3.6, type: 'shutter', door: 'garageShutter', state: 'closed' },
  { id: 'op.load.win', floor: 'ground', axis: 'x', at: 32, a: 0.5, b: 4.0, y0: 3.2, y1: 4.4, type: 'window', glass: 'frosted', mullions: true },
  { id: 'op.load.gar', floor: 'ground', axis: 'z', at: 5, a: 26.4, b: 27.4, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.gar.ec', floor: 'ground', axis: 'x', at: 24, a: 7.4, b: 8.4, y0: 0, y1: 2.1, type: 'door', door: 'fire' },
  { id: 'op.gar.ec2', floor: 'ground', axis: 'x', at: 24, a: 13.4, b: 16.4, y0: 0, y1: 2.8, type: 'arch' },
  { id: 'op.gar.shutter', floor: 'ground', axis: 'x', at: 32, a: 8.6, b: 14.4, y0: 0, y1: 4.0, type: 'shutter', door: 'garageShutter', state: 'closed' },
  { id: 'op.gar.win', floor: 'ground', axis: 'x', at: 32, a: 15.4, b: 17.4, y0: 2.8, y1: 4.4, type: 'window', glass: 'frosted', mullions: true },

  /* ================= UPPER FLOOR ================= */
  { id: 'op.mezz.rail', floor: 'upper', axis: 'z', at: -13, a: -20.6, b: 11.6, y0: 0, y1: 3.0, type: 'rail' },
  { id: 'op.mezz.win', floor: 'upper', axis: 'z', at: -13, a: 12.6, b: 20.4, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.mezz.corr', floor: 'upper', axis: 'z', at: -9, a: -20.6, b: 20.6, y0: 0, y1: 2.85, type: 'open' },
  { id: 'op.exec.w.win', floor: 'upper', axis: 'x', at: -21, a: -8.4, b: -5.6, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.exec.e.win', floor: 'upper', axis: 'x', at: 21, a: -8.4, b: -5.6, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.mezz.w.win', floor: 'upper', axis: 'x', at: -21, a: -12.4, b: -9.6, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.mezz.e.win', floor: 'upper', axis: 'x', at: 21, a: -12.4, b: -9.6, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },

  { id: 'op.board.corr', floor: 'upper', axis: 'z', at: -5, a: -9.0, b: -8.0, y0: 0, y1: 2.1, type: 'door', door: 'glass' },
  { id: 'op.board.corr.g', floor: 'upper', axis: 'z', at: -5, a: -14.4, b: -9.6, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.board.corr.g2', floor: 'upper', axis: 'z', at: -5, a: -7.4, b: -3.2, y0: 0.0, y1: 2.7, type: 'glasswall' },
  { id: 'op.board.spine', floor: 'upper', axis: 'x', at: -2.5, a: -1.6, b: -0.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.boardW.win', floor: 'upper', axis: 'x', at: -21, a: 1.6, b: 3.4, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.board.bw', floor: 'upper', axis: 'x', at: -15, a: 1.6, b: 3.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.rec2.board', floor: 'upper', axis: 'z', at: 4, a: -8.5, b: -7.5, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.rec2.spine', floor: 'upper', axis: 'x', at: -2.5, a: 6.4, b: 7.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.rec2.spine2', floor: 'upper', axis: 'x', at: -2.5, a: 12.0, b: 13.0, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.rec2.win', floor: 'upper', axis: 'x', at: -21, a: 5.6, b: 14.4, y0: 0.9, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.rec2.swin', floor: 'upper', axis: 'z', at: 15, a: -19, b: -5, y0: 0.9, y1: 2.5, type: 'window', glass: 'clear', mullions: true },

  { id: 'op.ante.corr', floor: 'upper', axis: 'z', at: -5, a: 6.6, b: 9.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.ante.spine', floor: 'upper', axis: 'x', at: 2.5, a: -3.6, b: -2.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.ante.win', floor: 'upper', axis: 'x', at: 21, a: -4.4, b: 1.9, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.exec.ante', floor: 'upper', axis: 'z', at: 2.5, a: 5.4, b: 6.4, y0: 0, y1: 2.1, type: 'door', door: 'exec' },
  { id: 'op.exec.spine', floor: 'upper', axis: 'x', at: 2.5, a: 4.4, b: 5.4, y0: 0, y1: 2.1, type: 'door', door: 'exec' },
  { id: 'op.exec.win', floor: 'upper', axis: 'x', at: 21, a: 3.6, b: 9.4, y0: 0.5, y1: 2.6, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.exec.gal1', floor: 'upper', axis: 'z', at: 10, a: 5.6, b: 6.6, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.exec.gal2', floor: 'upper', axis: 'z', at: 10, a: 16.4, b: 17.4, y0: 0, y1: 2.1, type: 'door', door: 'standard' },
  { id: 'op.gal.spine', floor: 'upper', axis: 'x', at: 2.5, a: 10.2, b: 11.3, y0: 0, y1: 2.6, type: 'open' },
  { id: 'op.gal.landing', floor: 'upper', axis: 'z', at: 11.5, a: 2.5, b: 4, y0: 0, y1: 2.6, type: 'open' },
  { id: 'op.gal.void', floor: 'upper', axis: 'z', at: 11.5, a: 4, b: 10, y0: 0, y1: 3.0, type: 'rail' },
  { id: 'op.gal.lounge', floor: 'upper', axis: 'z', at: 11.5, a: 14.4, b: 16.4, y0: 0, y1: 2.6, type: 'arch' },
  { id: 'op.landing.spine', floor: 'upper', axis: 'x', at: 2.5, a: 12.2, b: 14.4, y0: 0, y1: 2.4, type: 'arch' },
  // The upper flight lands at x = 4 between z 13.4 and 15, so the guarding
  // rail stops short of the stair head and the rest of that line is left open.
  { id: 'op.landing.void', floor: 'upper', axis: 'x', at: 4, a: 11.5, b: 13.4, y0: 0, y1: 3.0, type: 'rail' },
  { id: 'op.landing.stairhead', floor: 'upper', axis: 'x', at: 4, a: 13.4, b: 15, y0: 0, y1: 2.9, type: 'open' },
  { id: 'op.lounge.void', floor: 'upper', axis: 'x', at: 10, a: 11.5, b: 15, y0: 0, y1: 3.0, type: 'wall' },
  { id: 'op.lounge.win', floor: 'upper', axis: 'z', at: 15, a: 11.6, b: 20.4, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.lounge.ewin', floor: 'upper', axis: 'x', at: 21, a: 11.6, b: 14.4, y0: 0.6, y1: 2.5, type: 'window', glass: 'clear', mullions: true },
  { id: 'op.landing.swin', floor: 'upper', axis: 'z', at: 15, a: 2.7, b: 3.8, y0: 1.2, y1: 2.5, type: 'window', glass: 'frosted', mullions: false },
];

/** Stair runs — real geometry plus vertical nav links. */
export const STAIRS = [
  {
    id: 'stair.central', name: 'Central Stairwell Flights', room: 'stairwell', upperRoom: 'landing',
    flights: [
      { x0: 4.0, z0: 11.7, dir: 'x+', length: 3.36, width: 1.3, y0: 0, y1: 2.1, risers: 12 },
      { x0: 7.36, z0: 13.5, dir: 'x-', length: 3.36, width: 1.3, y0: 2.1, y1: 4.2, risers: 12 },
    ],
    midLanding: { x0: 7.36, z0: 11.7, x1: 9.85, z1: 14.8, y: 2.1 },
    bottom: [3.2, 0, 13.2],
    top: [3.2, 4.2, 13.2],
  },
  {
    id: 'stair.fire', name: 'West Fire Stair Flights', room: 'firestair', upperRoom: 'firestairU',
    flights: [
      { x0: -20.85, z0: -1.0, dir: 'z-', length: 3.36, width: 1.3, y0: 0, y1: 2.1, risers: 12 },
      { x0: -17.05, z0: -4.36, dir: 'z+', length: 3.36, width: 1.3, y0: 2.1, y1: 4.2, risers: 12 },
    ],
    midLanding: { x0: -20.9, z0: -4.85, x1: -15.2, z1: -4.36, y: 2.1 },
    bottom: [-18, 0, 0.2],
    top: [-18, 4.2, -3.9],
  },
];

/** Roof decks visible from upper-floor windows. */
export const ROOFS = [
  { x0: -32, z0: -20, x1: -21, z1: -9, y: ROOF_LOW },
  { x0: -32, z0: -9, x1: -21, z1: 9.6, y: ROOF_LOW },
  { x0: -24, z0: 9.6, x1: -21, z1: 18, y: ROOF_LOW },
  { x0: -21, z0: 15, x1: 21, z1: 18, y: ROOF_LOW },
  { x0: 21, z0: -9, x1: 24, z1: 18, y: ROOF_LOW },
  { x0: 12, z0: -20, x1: 21, z1: -13, y: ROOF_LOW },
  { x0: 24, z0: -9, x1: 32, z1: 18, y: ROOF_MID },
  { x0: -21, z0: -20, x1: 12, z1: -13, y: ROOF_HIGH },
  { x0: -21, z0: -13, x1: 21, z1: 15, y: ROOF_HIGH },
];

export const CHECKPOINTS = {
  spawn: { pos: [0, 0, -27.5], yaw: 0, floor: 'ground', label: 'Courtyard insertion point' },
  courtyard: { pos: [-9, 0, -25], yaw: 40, floor: 'ground', label: 'North courtyard' },
  vestibule: { pos: [0, 0, -18.2], yaw: 0, floor: 'ground', label: 'Security vestibule' },
  lobby: { pos: [0, 0, -13], yaw: 0, floor: 'ground', label: 'Reception lobby' },
  waiting: { pos: [16.5, 0, -14], yaw: -90, floor: 'ground', label: 'Visitor waiting area' },
  northcorr: { pos: [-6, 0, -7], yaw: 90, floor: 'ground', label: 'North cross corridor' },
  openplan: { pos: [-9, 0, 4], yaw: 180, floor: 'ground', label: 'Open-plan floor' },
  conference: { pos: [7.5, 0, -1.5], yaw: 180, floor: 'ground', label: 'Aurora conference room' },
  breakroom: { pos: [17, 0, -1.5], yaw: 180, floor: 'ground', label: 'Break room' },
  copy: { pos: [6, 0, 5.5], yaw: 180, floor: 'ground', label: 'Copy & mail room' },
  restroom: { pos: [12.7, 0, 5.5], yaw: 180, floor: 'ground', label: 'Restrooms' },
  janitor: { pos: [18.5, 0, 5.5], yaw: 180, floor: 'ground', label: 'Janitor closet' },
  server: { pos: [15.5, 0, 13.2], yaw: 0, floor: 'ground', label: 'Server room' },
  it: { pos: [-28, 0, 5], yaw: 90, floor: 'ground', label: 'IT workspace' },
  archive: { pos: [-28, 0, -4.5], yaw: 90, floor: 'ground', label: 'Records archive' },
  mechanical: { pos: [-26.5, 0, -14.5], yaw: 90, floor: 'ground', label: 'Mechanical plant' },
  westcorr: { pos: [-22.5, 0, 12], yaw: 0, floor: 'ground', label: 'West corridor' },
  southcorr: { pos: [0, 0, 16.5], yaw: 90, floor: 'ground', label: 'South service corridor' },
  eastcorr: { pos: [22.5, 0, 6], yaw: 0, floor: 'ground', label: 'East corridor' },
  midcorr: { pos: [11, 0, 10], yaw: 90, floor: 'ground', label: 'Mid-block corridor' },
  loading: { pos: [28, 0, -2], yaw: 90, floor: 'ground', label: 'Loading area' },
  garage: { pos: [28, 0, 9], yaw: 180, floor: 'ground', label: 'Extraction garage' },
  stairwell: { pos: [3.2, 0, 13.2], yaw: 90, floor: 'ground', label: 'Central stairwell (ground)' },
  firestair: { pos: [-18, 0, 0], yaw: 0, floor: 'ground', label: 'West fire stair (ground)' },
  landing: { pos: [3.2, 4.2, 13.2], yaw: 270, floor: 'upper', label: 'Central stair landing' },
  execgal: { pos: [11, 4.2, 10.7], yaw: 90, floor: 'upper', label: 'Executive gallery' },
  execcorr: { pos: [0, 4.2, -7], yaw: 90, floor: 'upper', label: 'Executive corridor' },
  exec: { pos: [12, 4.2, 6.5], yaw: 180, floor: 'upper', label: 'Executive office' },
  execante: { pos: [12, 4.2, -1.5], yaw: 180, floor: 'upper', label: 'Executive anteroom' },
  boardroom: { pos: [-9, 4.2, -0.5], yaw: 180, floor: 'upper', label: 'Northlight boardroom' },
  records2: { pos: [-12, 4.2, 10], yaw: 180, floor: 'upper', label: 'Upper records annex' },
  execlounge: { pos: [15.5, 4.2, 13.2], yaw: 180, floor: 'upper', label: 'Executive lounge' },
  mezz: { pos: [-4, 4.2, -11], yaw: 0, floor: 'upper', label: 'Lobby mezzanine' },
  extraction: { pos: [28, 0, 14], yaw: 90, floor: 'ground', label: 'Extraction point' },
};

export const HOSTAGE_SPOTS = [
  {
    id: 'hostage.dana', name: 'Dana Reyes', room: 'conference', floor: 'ground',
    pos: [9.0, 0, -1.2], yaw: 200, variant: 'analyst',
    hint: 'Aurora conference room, ground floor east of the concourse',
  },
  {
    id: 'hostage.milo', name: 'Milo Chen', room: 'exec', floor: 'upper',
    pos: [17.0, 4.2, 7.4], yaw: 300, variant: 'executive',
    hint: 'Executive office, upper floor south-east',
  },
];

export const EXTRACTION_ZONE = { x0: 25.4, z0: 12.2, x1: 30.6, z1: 16.8, floor: 'ground', y: 0 };

export const WORLD_BOUNDS = { x0: -40, z0: -36, x1: 50, z1: 26 };
export const BUILDING_SHELL = { x0: -32, z0: -20, x1: 32, z1: 18 };
export const UPPER_SHELL = { x0: -21, z0: -13, x1: 21, z1: 15 };

export function roomAt(x, z, floor = 'ground') {
  let best = null;
  for (const r of ROOMS) {
    if (r.floor !== floor || r.kind === 'exterior') continue;
    if (x > r.x0 + 1e-9 && x < r.x1 - 1e-9 && z > r.z0 + 1e-9 && z < r.z1 - 1e-9) {
      if (r.insideOf) return r;
      best = r;
    }
  }
  return best;
}

export function zoneAt(x, z, floor = 'ground') {
  return roomAt(x, z, floor) ?? ROOMS.find((r) => r.kind === 'exterior' && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
}

export function isVoid(x, z, floor) {
  if (floor !== 'upper') return false;
  return UPPER_VOIDS.some((v) => x > v.x0 && x < v.x1 && z > v.z0 && z < v.z1);
}

export function roomCenter(id) {
  const r = ROOM_BY_ID[id];
  if (!r) return [0, 0, 0];
  return [(r.x0 + r.x1) / 2, FLOOR_Y[r.floor], (r.z0 + r.z1) / 2];
}

export const DOOR_SPECS = {
  standard: { w: 0.94, h: 2.06, thickness: 0.045, mat: 'wood.veneer', hardware: 'lever', closer: true, sound: 'wood' },
  glass: { w: 0.94, h: 2.06, thickness: 0.016, mat: 'glass.clear', hardware: 'pull', closer: true, sound: 'glass', frame: 'metal.aluminium' },
  glassDouble: { w: 1.0, h: 2.4, thickness: 0.016, mat: 'glass.clear', hardware: 'pull', double: true, closer: true, sound: 'glass', frame: 'metal.aluminium' },
  exteriorDouble: { w: 1.0, h: 2.4, thickness: 0.05, mat: 'metal.painted', hardware: 'pushbar', double: true, closer: true, sound: 'metal', frame: 'metal.aluminium', glazed: true },
  fire: { w: 0.94, h: 2.06, thickness: 0.055, mat: 'metal.painted', hardware: 'pushbar', closer: true, sound: 'metal', vision: true },
  security: { w: 0.94, h: 2.06, thickness: 0.06, mat: 'metal.paintedDark', hardware: 'lever', closer: true, sound: 'metal', cardReader: true },
  server: { w: 0.94, h: 2.06, thickness: 0.06, mat: 'metal.brushedV', hardware: 'lever', closer: true, sound: 'metal', cardReader: true, vision: true },
  restroom: { w: 0.86, h: 2.06, thickness: 0.04, mat: 'wood.pale', hardware: 'lever', closer: true, sound: 'wood' },
  exec: { w: 1.0, h: 2.3, thickness: 0.055, mat: 'wood.dark', hardware: 'lever', closer: false, sound: 'wood' },
  garageShutter: { roller: true, sound: 'shutter', mat: 'metal.galvanised' },
};

export const ROOM_PURPOSES = {
  court: 'Staff arrival forecourt with a cleared path, planters, bollards and drifting snow.',
  westyard: 'Service yard for plant access, gritting bins and snow clearing equipment.',
  eastyard: 'Vehicle apron in front of the extraction garage.',
  mechanical: 'Building plant: air handling units, transformers, breaker panels and the sprinkler riser.',
  lobby: 'Public reception with sign-in desk, brand wall, seating and a double-height curtain wall.',
  vestibule: 'Entry airlock with badge turnstile, screening table and guard position.',
  waiting: 'Visitor lounge attached to the lobby with exterior glazing on two sides.',
  northcorr: 'Primary east-west circulation behind the lobby; the map long sightline.',
  westcorr: 'Secondary circulation serving the west block, glazed to the service yard.',
  eastcorr: 'Back-of-house circulation linking loading, the garage and the mid block.',
  southcorr: 'Service corridor for deliveries, cleaning and plant access.',
  spine: 'Central concourse joining reception to the south of the building.',
  midcorr: 'Mid-block corridor serving copy, restrooms, janitor and the server room.',
  archive: 'Physical records storage on mobile racking.',
  it: 'IT support bench, spares shelving and an imaging station.',
  firestair: 'Protected west escape stair to the executive floor.',
  openplanA: 'Main workstation floor, east bay: cubicle pods and circulation.',
  openplanB: 'Main workstation floor, west bay: collaboration tables and lockers.',
  conference: 'Ten-person conference room with a display wall and glass front.',
  breakroom: 'Staff kitchen and dining with vending and a notice board.',
  copy: 'Reprographics and internal mail sorting.',
  restroom: 'Staff restrooms with stalls, washbasins and mirrors.',
  janitor: 'Cleaning store with a mop sink, cart and consumables.',
  stairwell: 'Central open stair between the two floors.',
  server: 'Comms room with racks, UPS units and cooling.',
  loading: 'Goods-in dock with pallets, crates, hand truck and a roller shutter.',
  garage: 'Covered vehicle bay used as the extraction point.',
  mezz: 'Balcony overlooking the reception lobby.',
  execcorr: 'Executive floor spine with the brand wall and display cases.',
  execspine: 'North-south executive circulation.',
  firestairU: 'Upper landing of the west escape stair.',
  boardroom: 'Glass-fronted boardroom for the executive floor.',
  boardroomW: 'Boardroom west bay with credenza and windows onto the roof deck.',
  records2: 'Upper archive annex and secure file storage.',
  execante: 'Assistant desks outside the executive office.',
  exec: 'Chief executive office with meeting seating.',
  execgal: 'Executive gallery overlooking the stair void.',
  landing: 'Upper landing of the central stair.',
  execlounge: 'Executive lounge with soft seating and a coffee point.',
};

export const UNITS_REF = UNITS;
