// ---------------------------------------------------------------------------
// NORTHSTAR ADMINISTRATIVE CENTER — floor plan  (owner: fable2)
//
// Coordinates: metres. +X east, +Y up, +Z south (so -Z is north / "front" of
// the building). Ground floor sits at y=0, the mezzanine at y=4.0.
//
// Design intent
// -------------
// A compact two-storey regional headquarters buried in a winter storm. The
// public half (entrance, vestibule, lobby, waiting, conference) is glassy,
// bright and cold. The working half (open office, break room, copy, IT) is
// fluorescent and cluttered. The back of house (service corridor, mechanical,
// loading, garage) is concrete, dim and lit by emergency fixtures.
//
// The plan is a loop, not a corridor: lobby -> open office -> mid corridor ->
// service corridor -> loading -> conference -> east link -> lobby closes a
// full circuit, and the mezzanine adds a second vertical loop through the
// central stair and the west service stair. Neither hostage can be reached by
// only one path.
// ---------------------------------------------------------------------------

export const FLOOR_Y = { ground: 0, upper: 4.0 };
export const CEIL = { office: 3.0, service: 2.6, atrium: 7.0, tall: 4.5, upper: 3.0 };

/**
 * @typedef {Object} RoomDef
 * @property {string} id
 * @property {string} name
 * @property {'ground'|'upper'} floor
 * @property {number} x0 @property {number} z0 @property {number} x1 @property {number} z1
 * @property {number} ceiling  height above the floor slab
 * @property {string} zone     lighting zone key (see art/palette.js ZONES)
 * @property {string} floorMat @property {string} ceilMat @property {string} wallMat
 * @property {boolean} [noCeiling]  atrium / open to the storey above
 * @property {boolean} [exterior]
 * @property {string} purpose  real-world function, for the room checklist
 */

/** @type {RoomDef[]} */
export const ROOMS = [
  // ---------------------------------------------------------------- exterior
  {
    id: 'courtyard', name: 'North Courtyard & Employee Lot', floor: 'ground', zone: 'exterior',
    x0: -20, z0: -30, x1: 20, z1: -16, ceiling: 0, exterior: true, noCeiling: true,
    floorMat: 'snow', ceilMat: null, wallMat: 'concrete',
    purpose: 'Snow-covered arrival apron and staff parking; the operator inserts here.',
  },
  {
    id: 'eastapron', name: 'East Service Apron', floor: 'ground', zone: 'exterior',
    x0: 27, z0: 5, x1: 36, z1: 20, ceiling: 0, exterior: true, noCeiling: true,
    floorMat: 'snow', ceilMat: null, wallMat: 'concrete',
    purpose: 'Ploughed yard outside the garage; the extraction vehicle waits here.',
  },

  // ------------------------------------------------------------ public front
  {
    id: 'entrance', name: 'Employee Entrance', floor: 'ground', zone: 'exterior',
    x0: -5, z0: -16, x1: 5, z1: -12.5, ceiling: 3.2,
    floorMat: 'tileFloor', ceilMat: 'plasterCeil', wallMat: 'wallCool',
    purpose: 'Covered entrance porch with matting, snow tracked in from the lot.',
  },
  {
    id: 'vestibule', name: 'Security Vestibule', floor: 'ground', zone: 'office',
    x0: -7, z0: -12.5, x1: 7, z1: -8.5, ceiling: 3.0,
    floorMat: 'tileFloor', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'Badge-controlled airlock with turnstiles, guard desk and monitors.',
  },
  {
    id: 'lobby', name: 'Reception Lobby', floor: 'ground', zone: 'exterior',
    x0: -11, z0: -8.5, x1: 11, z1: 0, ceiling: 7.0, structTop: 7.5,
    floorMat: 'tileFloor', ceilMat: 'plasterCeil', wallMat: 'wallAccent',
    purpose: 'Double-height reception atrium; the map\'s primary landmark.',
  },
  {
    id: 'waiting', name: 'Visitor Waiting Area', floor: 'ground', zone: 'exterior',
    x0: -19, z0: -8.5, x1: -11, z1: 0, ceiling: 3.0,
    floorMat: 'carpetAccent', ceilMat: 'ceiling', wallMat: 'wallOffice',
    purpose: 'Seating for visitors awaiting escort, glazed to the lobby.',
  },
  {
    id: 'weststair', name: 'West Service Stair', floor: 'ground', zone: 'service',
    x0: -23, z0: -8.5, x1: -19, z1: 0, ceiling: 7.0, structTop: 7.5,
    floorMat: 'concreteSealed', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Fire stair serving the executive suite; the flanking route to the mezzanine.',
  },
  {
    id: 'stairwell', name: 'Central Stairwell', floor: 'ground', zone: 'office',
    x0: 11, z0: -8.5, x1: 18, z1: -2, ceiling: 7.0, structTop: 7.5,
    floorMat: 'tileFloor', ceilMat: 'plasterCeil', wallMat: 'wallCool',
    purpose: 'Open feature stair from the lobby to the executive mezzanine.',
  },
  {
    id: 'eastlink', name: 'East Link Corridor', floor: 'ground', zone: 'office',
    x0: 11, z0: -2, x1: 20, z1: 0, ceiling: 3.0,
    floorMat: 'carpetMain', ceilMat: 'ceiling', wallMat: 'wallOffice',
    purpose: 'Short link tying the stair hall to the conference suite.',
  },

  // ------------------------------------------------------------ working floor
  {
    id: 'openoffice', name: 'Open-Plan Cubicle Floor', floor: 'ground', zone: 'office',
    x0: -14, z0: 0, x1: 11, z1: 9, ceiling: 3.0,
    floorMat: 'carpetMain', ceilMat: 'ceiling', wallMat: 'wallOffice',
    purpose: 'Main workfloor: 14 cubicles, print bay and the map\'s long sightline.',
  },
  {
    id: 'conference', name: 'Sunfield Conference Room', floor: 'ground', zone: 'office',
    x0: 11, z0: 0, x1: 20, z1: 7, ceiling: 3.0,
    floorMat: 'carpetAccent', ceilMat: 'ceiling', wallMat: 'wallOffice',
    purpose: 'Glass-walled meeting room; hostage holding point A.',
  },
  {
    id: 'breakroom', name: 'Break Room & Kitchen', floor: 'ground', zone: 'office',
    x0: -22, z0: 0, x1: -14, z1: 5, ceiling: 3.0,
    floorMat: 'vinyl', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'Staff kitchen and eating area with vending and notice board.',
  },
  {
    id: 'restrooms', name: 'Restrooms', floor: 'ground', zone: 'office',
    x0: -22, z0: 5, x1: -14, z1: 11, ceiling: 2.8,
    floorMat: 'tileFloor', ceilMat: 'ceiling', wallMat: 'tileWall',
    purpose: 'Two-fixture restroom block off the west end of the cross corridor.',
  },
  {
    id: 'midcorr', name: 'Cross Corridor', floor: 'ground', zone: 'office',
    x0: -14, z0: 9, x1: 14, z1: 11, ceiling: 2.8,
    floorMat: 'vinyl', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'East-west spine linking the work floor to every back-of-house room.',
  },
  {
    id: 'janitor', name: 'Janitor Closet', floor: 'ground', zone: 'service',
    x0: -14, z0: 11, x1: -11.5, z1: 14, ceiling: 2.6,
    floorMat: 'concreteSealed', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Mop sink, cart and cleaning stock.',
  },
  {
    id: 'copyroom', name: 'Copy & Mail Room', floor: 'ground', zone: 'office',
    x0: -11.5, z0: 11, x1: -5, z1: 15.5, ceiling: 2.8,
    floorMat: 'vinyl', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'Production copier, mail pigeonholes and paper stock.',
  },
  {
    id: 'itroom', name: 'IT Workspace', floor: 'ground', zone: 'office',
    x0: -5, z0: 11, x1: 1, z1: 15.5, ceiling: 2.8,
    floorMat: 'vinyl', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'Bench-repair desks and spares shelving in front of the server room.',
  },
  {
    id: 'serverroom', name: 'Server Room', floor: 'ground', zone: 'server',
    x0: 1, z0: 11, x1: 7, z1: 15.5, ceiling: 2.8,
    floorMat: 'concreteSealed', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Four racks, UPS bank and hot aisle; the darkest interior room.',
  },
  {
    id: 'mechanical', name: 'Electrical & Mechanical Room', floor: 'ground', zone: 'service',
    x0: 7, z0: 11, x1: 12, z1: 15.5, ceiling: 3.4,
    floorMat: 'concrete', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Switchgear, air handler and the building water service.',
  },
  {
    id: 'servicecorr', name: 'Service Corridor', floor: 'ground', zone: 'service',
    x0: -14, z0: 15.5, x1: 14, z1: 18, ceiling: 2.6,
    floorMat: 'concreteSealed', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Back-of-house spine; the map\'s controlled 28 m sightline.',
  },
  {
    id: 'loading', name: 'Loading Area', floor: 'ground', zone: 'service',
    x0: 14, z0: 7, x1: 20, z1: 18, ceiling: 4.5,
    floorMat: 'concrete', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Goods-in dock with pallets, crates and the freight route to the garage.',
  },
  {
    id: 'garage', name: 'Extraction Garage', floor: 'ground', zone: 'service',
    x0: 20, z0: 7, x1: 27, z1: 18, ceiling: 4.5,
    floorMat: 'concrete', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Fleet bay behind a roller shutter; the extraction point.',
  },

  // --------------------------------------------------------------- mezzanine
  {
    id: 'upperlanding', name: 'Mezzanine Landing', floor: 'upper', zone: 'office',
    x0: 11, z0: -8.5, x1: 18, z1: -2, ceiling: 3.0,
    floorMat: 'carpetExec', ceilMat: 'ceiling', wallMat: 'wallCool',
    purpose: 'Head of the feature stair, overlooking the lobby.',
  },
  {
    id: 'execcorr', name: 'Executive Corridor', floor: 'upper', zone: 'executive',
    x0: -11, z0: -8.5, x1: 11, z1: -4.5, ceiling: 3.0,
    floorMat: 'carpetExec', ceilMat: 'ceiling', wallMat: 'wallAccent',
    purpose: 'Glazed gallery above the lobby; portraits, awards, warm lamps.',
  },
  {
    id: 'execoffice', name: 'Executive Office', floor: 'upper', zone: 'executive',
    x0: -19, z0: -8.5, x1: -11, z1: -3.5, ceiling: 3.0,
    floorMat: 'carpetExec', ceilMat: 'ceiling', wallMat: 'wallAccent',
    purpose: 'Corner office of the regional director; hostage holding point B.',
  },
  {
    id: 'archive', name: 'Records Archive', floor: 'upper', zone: 'service',
    x0: -19, z0: -3.5, x1: -11, z1: 2.5, ceiling: 3.0,
    floorMat: 'vinyl', ceilMat: 'ceiling', wallMat: 'wallService',
    purpose: 'Rolling shelf bays of paper records; the flank into the executive suite.',
  },
  {
    id: 'upperweststair', name: 'West Stair Head', floor: 'upper', zone: 'service',
    x0: -23, z0: -8.5, x1: -19, z1: 0, ceiling: 3.0,
    floorMat: 'concreteSealed', ceilMat: 'concreteCeil', wallMat: 'wallService',
    purpose: 'Top of the fire stair; emergency lighting only.',
  },
];

/**
 * Rectangles where an upper-storey floor slab is omitted.
 *
 * These are the two stair shafts only — the volume you would fall down if the
 * slab were continuous. They are deliberately trimmed to the flight footprint
 * and stop exactly at the top tread, so each stair-head room keeps an L-shaped
 * landing wrapping its shaft. The lobby atrium needs no void because the
 * mezzanine rooms are separate rectangles that simply do not cover it.
 */
export const VOIDS = [
  { floor: 'upper', x0: 13.15, z0: -7.79, x1: 15.85, z1: -2.5, reason: 'central stair shaft' },
  { floor: 'upper', x0: -21.75, z0: -6.64, x1: -20.25, z1: -1.35, reason: 'west stair shaft' },
];

/**
 * Openings punched through the generated wall grid.
 * type: door | doubledoor | arch | window | interiorwindow | glasswall | shutter | passthrough
 * `axis` is the wall orientation: 'x' means the wall runs along X (a north or
 * south wall); 'z' means it runs along Z (an east or west wall).
 */
export const OPENINGS = [
  // --- exterior entry sequence -------------------------------------------
  { id: 'op-ext-entry', floor: 'ground', axis: 'x', coord: -16, at: 0, width: 3.2, type: 'doubledoor', sill: 0, head: 2.25, door: 'DOOR-EXT-ENTRY', glass: true },
  { id: 'op-vest-in', floor: 'ground', axis: 'x', coord: -12.5, at: 0, width: 2.6, type: 'doubledoor', sill: 0, head: 2.25, door: 'DOOR-VEST-N', glass: true },
  { id: 'op-vest-out', floor: 'ground', axis: 'x', coord: -8.5, at: -2.2, width: 1.1, type: 'door', sill: 0, head: 2.1, door: 'DOOR-VEST-S1', security: true },
  { id: 'op-vest-out2', floor: 'ground', axis: 'x', coord: -8.5, at: 2.2, width: 1.1, type: 'door', sill: 0, head: 2.1, door: 'DOOR-VEST-S2', security: true },
  { id: 'op-vest-win-w', floor: 'ground', axis: 'z', coord: -7, at: -10.5, width: 2.2, type: 'interiorwindow', sill: 1.0, head: 2.4 },
  { id: 'op-vest-win-e', floor: 'ground', axis: 'z', coord: 7, at: -10.5, width: 2.2, type: 'interiorwindow', sill: 1.0, head: 2.4 },

  // --- lobby glazing (exterior curtain wall on the north face of the lobby)
  { id: 'op-lobby-glass-w', floor: 'ground', axis: 'x', coord: -8.5, at: -9.2, width: 3.0, type: 'window', sill: 0.35, head: 5.6, glassKind: 'tinted' },
  { id: 'op-lobby-glass-e', floor: 'ground', axis: 'x', coord: -8.5, at: 9.2, width: 3.0, type: 'window', sill: 0.35, head: 5.6, glassKind: 'tinted' },

  // --- lobby to waiting / stair / office ---------------------------------
  { id: 'op-lobby-waiting', floor: 'ground', axis: 'z', coord: -11, at: -6.4, width: 2.4, type: 'arch', sill: 0, head: 2.5 },
  { id: 'op-lobby-waiting-glass', floor: 'ground', axis: 'z', coord: -11, at: -2.6, width: 3.6, type: 'interiorwindow', sill: 0.5, head: 2.6 },
  { id: 'op-lobby-stair', floor: 'ground', axis: 'z', coord: 11, at: -5.4, width: 5.6, type: 'arch', sill: 0, head: 3.4 },
  { id: 'op-lobby-office', floor: 'ground', axis: 'x', coord: 0, at: 0, width: 3.0, type: 'doubledoor', sill: 0, head: 2.25, door: 'DOOR-LOBBY-OFFICE', glass: true },
  { id: 'op-lobby-eastlink', floor: 'ground', axis: 'z', coord: 11, at: -1.0, width: 1.8, type: 'arch', sill: 0, head: 2.4 },

  // --- waiting / west wing ------------------------------------------------
  { id: 'op-waiting-break', floor: 'ground', axis: 'x', coord: 0, at: -16.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-BREAK-N' },
  { id: 'op-waiting-weststair', floor: 'ground', axis: 'z', coord: -19, at: -5.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-WSTAIR-G', fire: true },
  { id: 'op-waiting-win', floor: 'ground', axis: 'x', coord: -8.5, at: -15.0, width: 3.0, type: 'window', sill: 0.85, head: 2.45, glassKind: 'clear' },

  // --- break room / restrooms --------------------------------------------
  { id: 'op-break-office', floor: 'ground', axis: 'z', coord: -14, at: 2.5, width: 1.6, type: 'arch', sill: 0, head: 2.3 },
  { id: 'op-break-win', floor: 'ground', axis: 'z', coord: -22, at: 2.5, width: 3.0, type: 'window', sill: 0.95, head: 2.4, glassKind: 'clear' },
  { id: 'op-rest-corr', floor: 'ground', axis: 'z', coord: -14, at: 10.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-REST' },
  { id: 'op-rest-office', floor: 'ground', axis: 'z', coord: -14, at: 6.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-REST-2' },

  // --- open office --------------------------------------------------------
  { id: 'op-office-corr-w', floor: 'ground', axis: 'x', coord: 9, at: -10.5, width: 3.2, type: 'arch', sill: 0, head: 2.4 },
  { id: 'op-office-corr-e', floor: 'ground', axis: 'x', coord: 9, at: 6.0, width: 3.2, type: 'arch', sill: 0, head: 2.4 },
  { id: 'op-office-conf-glass', floor: 'ground', axis: 'z', coord: 11, at: 3.6, width: 5.2, type: 'glasswall', sill: 0.0, head: 2.7, glassKind: 'clear' },
  { id: 'op-office-conf-door', floor: 'ground', axis: 'z', coord: 11, at: 0.9, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-CONF-W', glass: true },

  // --- conference ---------------------------------------------------------
  { id: 'op-conf-link', floor: 'ground', axis: 'x', coord: 0, at: 15.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-CONF-N' },
  { id: 'op-conf-load', floor: 'ground', axis: 'x', coord: 7, at: 17.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-CONF-S', fire: true },
  { id: 'op-conf-win', floor: 'ground', axis: 'z', coord: 20, at: 3.5, width: 4.4, type: 'window', sill: 0.85, head: 2.6, glassKind: 'tinted' },

  // --- cross corridor to back of house ------------------------------------
  { id: 'op-corr-jan', floor: 'ground', axis: 'x', coord: 11, at: -12.75, width: 0.9, type: 'door', sill: 0, head: 2.1, door: 'DOOR-JANITOR' },
  { id: 'op-corr-copy', floor: 'ground', axis: 'x', coord: 11, at: -8.5, width: 1.6, type: 'arch', sill: 0, head: 2.3 },
  { id: 'op-corr-it', floor: 'ground', axis: 'x', coord: 11, at: -2.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-IT', glass: true },
  { id: 'op-corr-server', floor: 'ground', axis: 'x', coord: 11, at: 4.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-SERVER', security: true },
  { id: 'op-corr-mech', floor: 'ground', axis: 'x', coord: 11, at: 9.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-MECH' },
  { id: 'op-corr-load', floor: 'ground', axis: 'z', coord: 14, at: 10.0, width: 1.6, type: 'door', sill: 0, head: 2.2, door: 'DOOR-LOAD-W', fire: true },

  // --- back of house ------------------------------------------------------
  { id: 'op-copy-service', floor: 'ground', axis: 'x', coord: 15.5, at: -8.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-COPY-S' },
  { id: 'op-server-service', floor: 'ground', axis: 'x', coord: 15.5, at: 4.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-SERVER-S', security: true },
  { id: 'op-mech-service', floor: 'ground', axis: 'x', coord: 15.5, at: 9.5, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-MECH-S' },
  { id: 'op-service-load', floor: 'ground', axis: 'z', coord: 14, at: 16.75, width: 2.6, type: 'arch', sill: 0, head: 2.5 },
  { id: 'op-load-garage', floor: 'ground', axis: 'z', coord: 20, at: 12.5, width: 4.0, type: 'arch', sill: 0, head: 3.6 },
  { id: 'op-garage-shutter', floor: 'ground', axis: 'z', coord: 27, at: 12.5, width: 4.6, type: 'shutter', sill: 0, head: 3.8, door: 'DOOR-GARAGE' },
  { id: 'op-load-dockwin', floor: 'ground', axis: 'x', coord: 18, at: 17.0, width: 2.2, type: 'window', sill: 1.6, head: 2.8, glassKind: 'frosted' },

  // --- mezzanine ----------------------------------------------------------
  { id: 'op-exec-landing', floor: 'upper', axis: 'z', coord: 11, at: -6.5, width: 2.4, type: 'arch', sill: 0, head: 2.4 },
  { id: 'op-exec-door', floor: 'upper', axis: 'z', coord: -11, at: -6.4, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-EXEC', glass: true },
  { id: 'op-exec-glass', floor: 'upper', axis: 'z', coord: -11, at: -5.1, width: 1.0, type: 'interiorwindow', sill: 0.9, head: 2.4, glassKind: 'frosted' },
  { id: 'op-exec-archive', floor: 'upper', axis: 'x', coord: -3.5, at: -14.0, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-ARCHIVE-N' },
  { id: 'op-archive-wstair', floor: 'upper', axis: 'z', coord: -19, at: -2.4, width: 1.05, type: 'door', sill: 0, head: 2.1, door: 'DOOR-WSTAIR-U', fire: true },
  { id: 'op-exec-win-w', floor: 'upper', axis: 'z', coord: -19, at: -6.0, width: 3.2, type: 'window', sill: 0.7, head: 2.5, glassKind: 'clear' },
  { id: 'op-exec-win-n', floor: 'upper', axis: 'x', coord: -8.5, at: -15.0, width: 3.2, type: 'window', sill: 0.7, head: 2.5, glassKind: 'clear' },
  { id: 'op-execcorr-win', floor: 'upper', axis: 'x', coord: -8.5, at: 0, width: 6.0, type: 'window', sill: 0.7, head: 2.5, glassKind: 'tinted' },
  { id: 'op-landing-win', floor: 'upper', axis: 'z', coord: 18, at: -5.0, width: 3.0, type: 'window', sill: 0.7, head: 2.5, glassKind: 'tinted' },
  { id: 'op-archive-win', floor: 'upper', axis: 'z', coord: -19, at: 1.0, width: 1.8, type: 'window', sill: 1.2, head: 2.4, glassKind: 'frosted' },

  // Mezzanine edges. These are the openings the balustrades stand in: without
  // them the auto-derived wall network would seal the gallery off from the
  // atrium it is supposed to overlook. The head piece above each one reads as
  // the mezzanine fascia beam.
  { id: 'op-execcorr-gallery', floor: 'upper', axis: 'x', coord: -4.5, at: 0, width: 21.0, type: 'arch', sill: 0, head: 2.45 },
  { id: 'op-landing-gallery-w', floor: 'upper', axis: 'z', coord: 11, at: -3.2, width: 2.2, type: 'arch', sill: 0, head: 2.45 },
  { id: 'op-landing-gallery-s', floor: 'upper', axis: 'x', coord: -2, at: 14.5, width: 6.4, type: 'arch', sill: 0, head: 2.45 },
];

/** Stairs: geometry + the nav links they create. */
/**
 * Stair flights. 18 risers of 222 mm over a 280 mm going climbs exactly the
 * 4.0 m storey height in 5.04 m of run, which leaves a real landing at the head
 * of both flights inside the stair-head room rather than dumping the player
 * against the far wall.
 */
export const STAIRS = [
  {
    id: 'stair-central', name: 'Central Feature Stair', room: 'stairwell',
    // Ascends toward -Z from z = -2.75 and arrives at y = 4.0 around z = -7.79.
    // The foot sits 0.75 m clear of the z = -2 wall so an agent capsule (0.66 m
    // wide) can stand square in front of the bottom tread instead of having to
    // enter the flight from the side.
    x: 14.5, zBottom: -2.75, width: 2.6, steps: 18, rise: 4.0 / 18, run: 0.28,
    fromFloor: 'ground', toFloor: 'upper', landingZ: -8.5, railing: 'glass',
  },
  {
    id: 'stair-west', name: 'West Service Stair', room: 'weststair',
    x: -21, zBottom: -1.6, width: 1.4, steps: 18, rise: 4.0 / 18, run: 0.28,
    fromFloor: 'ground', toFloor: 'upper', landingZ: -8.5, railing: 'steel',
  },
];

/** Balustrades at slab edges so the player cannot walk into the atrium. */
export const RAILINGS = [
  { id: 'rail-exec', floor: 'upper', x0: -10.4, z0: -4.5, x1: 10.4, z1: -4.5, glass: true },
  { id: 'rail-landing-w', floor: 'upper', x0: 11, z0: -4.3, x1: 11, z1: -2.1, glass: true },
  { id: 'rail-landing-s', floor: 'upper', x0: 11.3, z0: -2, x1: 17.7, z1: -2, glass: true },
];
// The two stair shafts are guarded by the flights' own full-length balustrades
// (see buildStairs in build.js), so they need no separate railing entries.

/** Named checkpoints for the QA teleport tool and Playwright scenarios. */
export const CHECKPOINTS = {
  insertion: { pos: [0, 0, -21], yaw: Math.PI, room: 'courtyard' },
  entrance: { pos: [0, 0, -14.2], yaw: Math.PI, room: 'entrance' },
  vestibule: { pos: [0, 0, -10.5], yaw: Math.PI, room: 'vestibule' },
  lobby: { pos: [0, 0, -5.0], yaw: Math.PI, room: 'lobby' },
  reception: { pos: [-3.0, 0, -1.4], yaw: Math.PI * 0.75, room: 'lobby' },
  waiting: { pos: [-15, 0, -5], yaw: Math.PI / 2, room: 'waiting' },
  stairwell: { pos: [12.1, 0, -4], yaw: Math.PI, room: 'stairwell' },
  openoffice: { pos: [-2, 0, 4.5], yaw: Math.PI / 2, room: 'openoffice' },
  officeWest: { pos: [-11.5, 0, 4.5], yaw: Math.PI / 2, room: 'openoffice' },
  conference: { pos: [12.4, 0, 1.4], yaw: -Math.PI / 4, room: 'conference' },
  breakroom: { pos: [-18, 0, 2.5], yaw: Math.PI / 2, room: 'breakroom' },
  restrooms: { pos: [-18, 0, 8], yaw: Math.PI / 2, room: 'restrooms' },
  midcorr: { pos: [0, 0, 10], yaw: Math.PI / 2, room: 'midcorr' },
  janitor: { pos: [-12.75, 0, 12.5], yaw: 0, room: 'janitor' },
  copyroom: { pos: [-8, 0, 13], yaw: 0, room: 'copyroom' },
  itroom: { pos: [-2, 0, 13], yaw: 0, room: 'itroom' },
  serverroom: { pos: [4, 0, 13], yaw: 0, room: 'serverroom' },
  mechanical: { pos: [9.5, 0, 13], yaw: 0, room: 'mechanical' },
  servicecorr: { pos: [0, 0, 16.75], yaw: Math.PI / 2, room: 'servicecorr' },
  loading: { pos: [15.4, 0, 9.4], yaw: Math.PI / 2, room: 'loading' },
  garage: { pos: [23.5, 0, 12.5], yaw: -Math.PI / 2, room: 'garage' },
  extraction: { pos: [23.5, 0, 12.5], yaw: -Math.PI / 2, room: 'garage' },
  execcorr: { pos: [0, 4, -6.5], yaw: -Math.PI / 2, room: 'execcorr' },
  execoffice: { pos: [-15, 4, -6], yaw: Math.PI / 2, room: 'execoffice' },
  archive: { pos: [-15, 4, -0.5], yaw: 0, room: 'archive' },
  upperlanding: { pos: [12.1, 4, -5], yaw: Math.PI / 2, room: 'upperlanding' },
  upperweststair: { pos: [-19.6, 4, -3], yaw: -Math.PI / 2, room: 'upperweststair' },
  weststair: { pos: [-19.6, 0, -3], yaw: -Math.PI / 2, room: 'weststair' },
  eastlink: { pos: [15, 0, -1], yaw: -Math.PI / 2, room: 'eastlink' },
};

/** Player insertion. */
export const PLAYER_SPAWN = { pos: [0, 0, -20.5], yaw: Math.PI };

/** Extraction volume. */
export const EXTRACTION = {
  id: 'extraction-garage',
  center: [23.5, 0, 12.5],
  size: [5.0, 3.0, 6.0],
  room: 'garage',
  label: 'EXTRACTION — VEHICLE BAY',
};

/** Hostage holding points. */
export const HOSTAGE_POINTS = [
  {
    id: 'hostage-a', name: 'Dr. Rhea Calloway', room: 'conference',
    pos: [16.6, 0, 4.6], yaw: -Math.PI / 2, variant: 'analyst',
    intro: 'Bound to a chair at the head of the conference table.',
  },
  {
    id: 'hostage-b', name: 'Martin Oyelaran', room: 'execoffice',
    pos: [-16.4, 4, -5.2], yaw: Math.PI / 2, variant: 'director',
    intro: 'Held in the corner of the executive office, away from the windows.',
  },
];

/** Enemy patrol posts and routes, consumed by ai/director.js. */
export const ENEMY_POSTS = [
  { id: 'post-vestibule', pos: [3.4, 0, -10.4], room: 'vestibule', role: 'sentry', facing: Math.PI },
  { id: 'post-lobby', pos: [6.0, 0, -3.0], room: 'lobby', role: 'patrol', facing: -Math.PI / 2 },
  { id: 'post-waiting', pos: [-15.5, 0, -3.0], room: 'waiting', role: 'patrol', facing: Math.PI / 2 },
  { id: 'post-office-w', pos: [-9.4, 0, 4.5], room: 'openoffice', role: 'patrol', facing: Math.PI / 2 },
  { id: 'post-office-e', pos: [7.0, 0, 6.5], room: 'openoffice', role: 'patrol', facing: -Math.PI / 2 },
  { id: 'post-conference', pos: [13.0, 0, 2.0], room: 'conference', role: 'guard', facing: Math.PI, guards: 'hostage-a' },
  { id: 'post-conference2', pos: [18.0, 0, 5.6], room: 'conference', role: 'guard', facing: 0, guards: 'hostage-a' },
  { id: 'post-break', pos: [-17.4, 0, 2.4], room: 'breakroom', role: 'patrol', facing: 0 },
  { id: 'post-corr', pos: [2.0, 0, 10.0], room: 'midcorr', role: 'patrol', facing: Math.PI / 2 },
  { id: 'post-copy', pos: [-8.0, 0, 13.0], room: 'copyroom', role: 'sentry', facing: 0 },
  { id: 'post-server', pos: [4.0, 0, 13.5], room: 'serverroom', role: 'sentry', facing: Math.PI },
  { id: 'post-service', pos: [-4.0, 0, 16.7], room: 'servicecorr', role: 'patrol', facing: Math.PI / 2 },
  { id: 'post-loading', pos: [15.4, 0, 11.6], room: 'loading', role: 'patrol', facing: Math.PI },
  { id: 'post-garage', pos: [23.0, 0, 10.0], room: 'garage', role: 'sentry', facing: Math.PI / 2 },
  { id: 'post-execcorr', pos: [3.0, 4, -6.5], room: 'execcorr', role: 'patrol', facing: -Math.PI / 2 },
  { id: 'post-exec', pos: [-13.5, 4, -7.0], room: 'execoffice', role: 'guard', facing: Math.PI / 2, guards: 'hostage-b' },
  { id: 'post-exec2', pos: [-17.6, 4, -4.6], room: 'execoffice', role: 'guard', facing: 0, guards: 'hostage-b' },
  { id: 'post-archive', pos: [-13.2, 4, 1.2], room: 'archive', role: 'patrol', facing: Math.PI },
  // Must stand on the landing itself, not over the stair shaft (x 13.15-15.85).
  { id: 'post-landing', pos: [12.1, 4, -3.4], room: 'upperlanding', role: 'sentry', facing: Math.PI },
];

/** Patrol routes referenced by the AI director (lists of checkpoint names). */
export const PATROL_ROUTES = {
  frontLoop: ['vestibule', 'lobby', 'reception', 'waiting', 'lobby'],
  officeLoop: ['openoffice', 'officeWest', 'breakroom', 'midcorr', 'openoffice'],
  backLoop: ['midcorr', 'copyroom', 'servicecorr', 'loading', 'midcorr'],
  execLoop: ['execcorr', 'upperlanding', 'execcorr', 'archive'],
  dockLoop: ['loading', 'garage', 'loading', 'servicecorr'],
};

export function roomById(id) {
  return ROOMS.find((r) => r.id === id);
}

export function roomAt(x, z, floor = 'ground') {
  return ROOMS.find((r) => r.floor === floor && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
}

/** Which floor a world Y belongs to. */
export function floorForY(y) {
  return y >= FLOOR_Y.upper - 1.2 ? 'upper' : 'ground';
}
