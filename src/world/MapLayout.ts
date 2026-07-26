/**
 * Northstar Administrative Center — layout data. Owner: Fable 2.
 *
 * The plan is authored as a watertight partition of axis-aligned room rectangles per level.
 * MapBuilder derives every wall from the partition (shared edge -> interior wall, free edge ->
 * exterior wall), which is what guarantees there is no gap anywhere that could expose the void.
 * Openings are punched by the portal table.
 *
 * Orientation: -Z is north (service/loading side), +Z is south (public entrance and courtyard).
 * -X is west, +X is east. Level 0 slab top y = 0, level 1 slab top y = 4.0.
 *
 * The building reads as three masses:
 *   - a single-storey north service wing (garage, loading, plant, server, corridor)
 *   - a two-storey central office block (open plan below, executive floor above)
 *   - a double-height south lobby with a glazed facade onto the snow courtyard
 */

export type FloorFinish =
  | 'carpet-blue'
  | 'carpet-grey'
  | 'carpet-exec'
  | 'vinyl'
  | 'tile-restroom'
  | 'tile-kitchen'
  | 'concrete'
  | 'concrete-sealed'
  | 'terrazzo'
  | 'raised-metal'
  | 'snow'
  | 'asphalt-snow';

export type CeilingFinish = 'grid' | 'grid-service' | 'concrete' | 'exposed' | 'open' | 'none';

export type LightZone =
  | 'daylight-cold'   // heavy exterior glazing, snow bounce
  | 'fluorescent'     // neutral/slightly green office troffers
  | 'warm-occupied'   // desk lamps, occupied rooms
  | 'service-dim'     // darker corridors with readable navigation lighting
  | 'server-cool'     // cold emissive equipment glow
  | 'emergency'       // red/amber emergency lighting dominant
  | 'exterior';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface RoomDef {
  id: string;
  name: string;
  /** Short label used on the minimap and objective text. */
  short: string;
  level: 0 | 1;
  rects: Rect[];
  /** Slab top. */
  floorY: number;
  /** Underside of the finished ceiling. */
  ceilingY: number;
  floor: FloorFinish;
  ceiling: CeilingFinish;
  /** Wall paint key from the palette. */
  wall: 'office-warm-white' | 'office-cool-grey' | 'accent-navy' | 'service-grey' | 'restroom-tile' | 'exec-walnut' | 'glass' | 'exterior';
  light: LightZone;
  /** Purpose recorded so the room-by-room audit can confirm every space has a reason to exist. */
  purpose: string;
  /** Rooms the AI treats as one navigation region for patrol naming. */
  patrolTag?: string;
  /** Exterior spaces skip ceilings and use sky lighting. */
  exterior?: boolean;
}

export type PortalKind =
  | 'opening'          // no door: cased opening
  | 'wide-opening'     // structural opening, no casing
  | 'door-standard'
  | 'door-glass'
  | 'door-double-glass'
  | 'door-fire'
  | 'door-security'
  | 'door-restroom'
  | 'door-server'
  | 'door-loading'
  | 'garage-shutter'
  | 'window-interior'
  | 'window-exterior'
  | 'window-clerestory'
  | 'curtain-wall'
  | 'pass-through';    // service hatch / reception window

export interface PortalDef {
  id: string;
  kind: PortalKind;
  /** Wall plane axis: 'x' = wall runs along Z at constant X; 'z' = wall runs along X at constant Z. */
  axis: 'x' | 'z';
  /** Constant coordinate of the wall plane. */
  at: number;
  /** Centre of the opening along the wall. */
  center: number;
  width: number;
  /** Sill height above the room floor (0 for doors). */
  sill: number;
  /** Head height above the room floor. */
  head: number;
  level: 0 | 1;
  /** Hinge on the low-coordinate side of the opening. */
  hingeLow?: boolean;
  /** Door swings toward increasing plane coordinate. */
  swingPositive?: boolean;
  locked?: boolean;
  /** Requires the facility keycard the player already carries; shows a card reader. */
  cardReader?: boolean;
  /** Both leaves of a double door. */
  double?: boolean;
  /** Label printed on the door sign. */
  sign?: string;
  /** Rooms joined; used for nav links and audio portals. */
  rooms: [string, string];
  /** Blinds fitted to this window. 0 = none, 1 = fully closed. */
  blinds?: number;
}

export interface LightFixtureDef {
  id: string;
  kind:
    | 'troffer'          // recessed 1200x300 fluorescent
    | 'troffer-large'    // recessed 1200x600
    | 'pendant'          // lobby pendant
    | 'downlight'
    | 'strip'            // surface-mounted service strip
    | 'wallpack'
    | 'desk-lamp'
    | 'emergency'
    | 'exit-sign'
    | 'server-strip'
    | 'floodlight';
  x: number;
  y: number;
  z: number;
  /** Rotation about Y. */
  rot?: number;
  room: string;
  /** Whether the fixture contributes a real dynamic light (budgeted by quality tier). */
  dynamic?: boolean;
  /** Colour temperature override. */
  color?: number;
  intensity?: number;
  /** Fixture is dead/flickering - environmental storytelling. */
  state?: 'on' | 'off' | 'flicker';
}

export interface SpawnDef {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  room: string;
}

export interface CoverPointDef {
  x: number;
  z: number;
  y: number;
  /** Height of the cover from the floor. */
  height: number;
  /** Facing the cover protects from, radians; -1 means omnidirectional. */
  facing: number;
  room: string;
}

// ---------------------------------------------------------------------------
// Level 0
// ---------------------------------------------------------------------------

const L0_CEIL = 3.0;
const SERVICE_CEIL = 2.9;

export const ROOMS: RoomDef[] = [
  // ---- exterior -----------------------------------------------------------
  {
    id: 'courtyard',
    name: 'North Approach Courtyard',
    short: 'Courtyard',
    level: 0,
    rects: [{ x0: -22, z0: 14.4, x1: 22, z1: 30 }],
    floorY: 0,
    ceilingY: 0,
    floor: 'snow',
    ceiling: 'none',
    wall: 'exterior',
    light: 'exterior',
    purpose: 'Snow-covered employee entrance forecourt with parking bays; player insertion point.',
    exterior: true,
    patrolTag: 'exterior',
  },
  {
    id: 'dock-yard',
    name: 'Service Yard',
    short: 'Yard',
    level: 0,
    rects: [{ x0: -22, z0: -30, x1: 6, z1: -21.4 }],
    floorY: 0,
    ceilingY: 0,
    floor: 'asphalt-snow',
    ceiling: 'none',
    wall: 'exterior',
    light: 'exterior',
    purpose: 'Snow-cleared yard behind the loading dock; visible through the garage shutter at extraction.',
    exterior: true,
    patrolTag: 'exterior',
  },

  // ---- north service band (single storey wing) ----------------------------
  {
    id: 'garage',
    name: 'Extraction Garage',
    short: 'Garage',
    level: 0,
    rects: [{ x0: -20, z0: -21, x1: -9.5, z1: -14.5 }],
    floorY: 0,
    ceilingY: 4.8,
    floor: 'concrete-sealed',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'emergency',
    purpose: 'Vehicle bay holding the armoured extraction van; mission exit point.',
    patrolTag: 'service',
  },
  {
    id: 'loading',
    name: 'Loading Area',
    short: 'Loading',
    level: 0,
    rects: [{ x0: -9.5, z0: -21, x1: -1, z1: -14.5 }],
    floorY: 0,
    ceilingY: 4.8,
    floor: 'concrete',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Goods-in dock with pallet storage, hand truck and dock leveller.',
    patrolTag: 'service',
  },
  {
    id: 'mech',
    name: 'Mechanical & Electrical Room',
    short: 'Plant',
    level: 0,
    rects: [{ x0: -1, z0: -21, x1: 6, z1: -14.5 }],
    floorY: 0,
    ceilingY: 3.2,
    floor: 'concrete',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Building plant: air handling unit, distribution boards, transformer cabinet.',
    patrolTag: 'service',
  },
  {
    id: 'janitor',
    name: 'Janitor Closet',
    short: 'Janitor',
    level: 0,
    rects: [{ x0: 6, z0: -21, x1: 9.5, z1: -14.5 }],
    floorY: 0,
    ceilingY: 2.7,
    floor: 'concrete',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Cleaning store: mop sink, janitor cart, chemical shelving.',
    patrolTag: 'service',
  },
  {
    id: 'facilities',
    name: 'Facilities Store',
    short: 'Store',
    level: 0,
    rects: [{ x0: 9.5, z0: -21, x1: 13, z1: -14.5 }],
    floorY: 0,
    ceilingY: 2.7,
    floor: 'concrete',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Spares and consumables: ladder, tool cases, utility shelving, warning cones.',
    patrolTag: 'service',
  },
  {
    id: 'server',
    name: 'Server Room',
    short: 'Server',
    level: 0,
    rects: [{ x0: 13, z0: -21, x1: 20, z1: -14.5 }],
    floorY: 0,
    ceilingY: 3.0,
    floor: 'raised-metal',
    ceiling: 'grid',
    wall: 'service-grey',
    light: 'server-cool',
    purpose: 'Core data hall: server racks, network cabinets, UPS bank, cold-aisle containment.',
    patrolTag: 'east',
  },

  // ---- service corridor ---------------------------------------------------
  {
    id: 'servicecorr',
    name: 'Service Corridor',
    short: 'Svc Corridor',
    level: 0,
    rects: [{ x0: -20, z0: -14.5, x1: 13, z1: -11 }],
    floorY: 0,
    ceilingY: SERVICE_CEIL,
    floor: 'concrete-sealed',
    ceiling: 'exposed',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Back-of-house spine linking every service room to the office floor; the map\'s long sightline.',
    patrolTag: 'service',
  },

  // ---- middle band --------------------------------------------------------
  {
    id: 'it',
    name: 'IT Workspace',
    short: 'IT',
    level: 0,
    rects: [{ x0: 13, z0: -14.5, x1: 20, z1: -8 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'vinyl',
    ceiling: 'grid',
    wall: 'office-cool-grey',
    light: 'fluorescent',
    purpose: 'Technician bench, spare hardware, monitoring wall; glazed onto the server room.',
    patrolTag: 'east',
  },
  {
    id: 'restroom-vest',
    name: 'Restroom Vestibule',
    short: 'Restrooms',
    level: 0,
    rects: [{ x0: 13, z0: -8, x1: 14.8, z1: -2 }],
    floorY: 0,
    ceilingY: 2.8,
    floor: 'tile-restroom',
    ceiling: 'grid',
    wall: 'restroom-tile',
    light: 'fluorescent',
    purpose: 'Shared entry lobby serving both restrooms; drinking fountain and notice frame.',
    patrolTag: 'east',
  },
  {
    id: 'restroom-a',
    name: 'Restroom A',
    short: 'Restroom A',
    level: 0,
    rects: [{ x0: 14.8, z0: -8, x1: 20, z1: -5 }],
    floorY: 0,
    ceilingY: 2.8,
    floor: 'tile-restroom',
    ceiling: 'grid',
    wall: 'restroom-tile',
    light: 'fluorescent',
    purpose: 'Restroom: three stalls, twin basins, hand dryer.',
    patrolTag: 'east',
  },
  {
    id: 'restroom-b',
    name: 'Restroom B',
    short: 'Restroom B',
    level: 0,
    rects: [{ x0: 14.8, z0: -5, x1: 20, z1: -2 }],
    floorY: 0,
    ceilingY: 2.8,
    floor: 'tile-restroom',
    ceiling: 'grid',
    wall: 'restroom-tile',
    light: 'fluorescent',
    purpose: 'Restroom: two stalls, urinals, twin basins.',
    patrolTag: 'east',
  },
  {
    id: 'archive',
    name: 'Records Archive',
    short: 'Archive',
    level: 0,
    rects: [{ x0: -20, z0: -11, x1: -12, z1: -4.5 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'concrete-sealed',
    ceiling: 'grid',
    wall: 'office-cool-grey',
    light: 'service-dim',
    purpose: 'Rolling archive racks holding paper case files; only half the lights are switched on.',
    patrolTag: 'west',
  },
  {
    id: 'copy',
    name: 'Copy & Mail Room',
    short: 'Copy/Mail',
    level: 0,
    rects: [{ x0: -20, z0: -4.5, x1: -12, z1: 2 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'vinyl',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'fluorescent',
    purpose: 'Production copier, mail pigeonholes, paper store and franking bench.',
    patrolTag: 'west',
  },
  {
    id: 'openplan',
    name: 'Open-Plan Floor',
    short: 'Open Plan',
    level: 0,
    rects: [{ x0: -12, z0: -11, x1: 6, z1: 2 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'carpet-blue',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'fluorescent',
    purpose: 'Main cubicle floor for 24 desks arranged in six pods around four structural columns.',
    patrolTag: 'core',
  },
  {
    id: 'stairwell',
    name: 'Central Stairwell',
    short: 'Stairwell',
    level: 0,
    rects: [{ x0: 6, z0: -11, x1: 13, z1: -4 }],
    floorY: 0,
    ceilingY: 7.2,
    floor: 'concrete-sealed',
    ceiling: 'concrete',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Protected fire stair connecting both office levels; landing at 2.0 m.',
    patrolTag: 'core',
  },
  {
    id: 'stairhall',
    name: 'Stair Hall',
    short: 'Stair Hall',
    level: 0,
    rects: [{ x0: 6, z0: -4, x1: 13, z1: 2 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'carpet-grey',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'fluorescent',
    purpose: 'Circulation hub joining the stair, open-plan floor, east concourse and lobby.',
    patrolTag: 'core',
  },
  {
    id: 'concourse',
    name: 'East Concourse',
    short: 'E Concourse',
    level: 0,
    rects: [{ x0: 13, z0: -2, x1: 20, z1: 2 }, { x0: 9, z0: 2, x1: 20, z1: 6 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'carpet-grey',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'fluorescent',
    purpose: 'East circulation linking the lobby, break room, restrooms and stair hall.',
    patrolTag: 'east',
  },
  {
    id: 'westgallery',
    name: 'West Gallery',
    short: 'W Gallery',
    level: 0,
    rects: [{ x0: -20, z0: 2, x1: -9, z1: 6 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'carpet-grey',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'fluorescent',
    purpose: 'Display gallery joining the lobby to the copy room and visitor lounge.',
    patrolTag: 'west',
  },
  {
    id: 'waiting',
    name: 'Visitor Waiting Area',
    short: 'Waiting',
    level: 0,
    rects: [{ x0: -20, z0: 6, x1: -9, z1: 14 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'carpet-grey',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'daylight-cold',
    purpose: 'Visitor lounge with sofas, coat rail and reading table under the west glazing.',
    patrolTag: 'south',
  },
  {
    id: 'lobby',
    name: 'Reception Lobby',
    short: 'Lobby',
    level: 0,
    rects: [
      { x0: -9, z0: 2, x1: 9, z1: 10.5 },
      { x0: -9, z0: 10.5, x1: -4, z1: 14 },
      { x0: 4, z0: 10.5, x1: 9, z1: 14 },
    ],
    floorY: 0,
    ceilingY: 7.6,
    floor: 'terrazzo',
    ceiling: 'exposed',
    wall: 'office-cool-grey',
    light: 'daylight-cold',
    purpose: 'Double-height reception with feature stair to the mezzanine and the company wall logo.',
    patrolTag: 'south',
  },
  {
    id: 'vestibule',
    name: 'Security Vestibule',
    short: 'Vestibule',
    level: 0,
    rects: [{ x0: -4, z0: 10.5, x1: 4, z1: 14 }],
    floorY: 0,
    ceilingY: 2.9,
    floor: 'tile-kitchen',
    ceiling: 'grid',
    wall: 'office-cool-grey',
    light: 'daylight-cold',
    purpose: 'Airlock between the courtyard and the lobby with badge pedestals and a guard window.',
    patrolTag: 'south',
  },
  {
    id: 'breakroom',
    name: 'Break Room & Kitchen',
    short: 'Break Room',
    level: 0,
    rects: [{ x0: 9, z0: 6, x1: 20, z1: 14 }],
    floorY: 0,
    ceilingY: L0_CEIL,
    floor: 'tile-kitchen',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'warm-occupied',
    purpose: 'Staff kitchen and dining area; hostiles are holding a hostage against the north wall.',
    patrolTag: 'south',
  },

  // ---- level 1 ------------------------------------------------------------
  {
    id: 'execoffice',
    name: 'Executive Office',
    short: 'Exec Office',
    level: 1,
    rects: [{ x0: -12, z0: -11, x1: -4, z1: -4 }],
    floorY: 4.0,
    ceilingY: 7.0,
    floor: 'carpet-exec',
    ceiling: 'grid',
    wall: 'exec-walnut',
    light: 'warm-occupied',
    purpose: 'Director\'s corner office: walnut desk, meeting settee, private records cabinet.',
    patrolTag: 'upper',
  },
  {
    id: 'conference',
    name: 'Conference Room',
    short: 'Conference',
    level: 1,
    rects: [{ x0: -4, z0: -11, x1: 6, z1: -4 }],
    floorY: 4.0,
    ceilingY: 7.0,
    floor: 'carpet-exec',
    ceiling: 'grid',
    wall: 'office-warm-white',
    light: 'warm-occupied',
    purpose: 'Twelve-seat boardroom with glazed corridor wall; a hostage is held here.',
    patrolTag: 'upper',
  },
  {
    id: 'stairwell-up',
    name: 'Stairwell Landing',
    short: 'Stair Landing',
    level: 1,
    rects: [{ x0: 6, z0: -11, x1: 13, z1: -4 }],
    floorY: 4.0,
    ceilingY: 7.2,
    floor: 'concrete-sealed',
    ceiling: 'concrete',
    wall: 'service-grey',
    light: 'service-dim',
    purpose: 'Upper landing of the protected stair with roof access hatch above.',
    patrolTag: 'upper',
  },
  {
    id: 'execcorr',
    name: 'Executive Corridor',
    short: 'Exec Corridor',
    level: 1,
    rects: [{ x0: -12, z0: -4, x1: 13, z1: -1 }],
    floorY: 4.0,
    ceilingY: 7.0,
    floor: 'carpet-exec',
    ceiling: 'grid',
    wall: 'exec-walnut',
    light: 'warm-occupied',
    purpose: 'Panelled corridor serving the executive suite; second controlled long sightline.',
    patrolTag: 'upper',
  },
  {
    id: 'mezzanine',
    name: 'Mezzanine Gallery',
    short: 'Mezzanine',
    level: 1,
    rects: [{ x0: -12, z0: -1, x1: 13, z1: 2 }],
    floorY: 4.0,
    ceilingY: 7.6,
    floor: 'carpet-exec',
    ceiling: 'open',
    wall: 'accent-navy',
    light: 'daylight-cold',
    purpose: 'Balcony overlooking reception; feature stair descends into the lobby from its south edge.',
    patrolTag: 'upper',
  },
];

export const ROOM_BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

// ---------------------------------------------------------------------------
// Portals
// ---------------------------------------------------------------------------

export const PORTALS: PortalDef[] = [
  // --- exterior facade ---------------------------------------------------
  {
    id: 'p-entry-outer', kind: 'door-double-glass', axis: 'z', at: 14, center: 0, width: 2.4,
    sill: 0, head: 2.3, level: 0, double: true, swingPositive: true, rooms: ['courtyard', 'vestibule'],
    sign: 'EMPLOYEE ENTRANCE',
  },
  {
    id: 'p-entry-inner', kind: 'door-double-glass', axis: 'z', at: 10.5, center: 0, width: 2.4,
    sill: 0, head: 2.3, level: 0, double: true, swingPositive: false, cardReader: true,
    rooms: ['vestibule', 'lobby'], sign: 'RECEPTION',
  },
  {
    id: 'w-facade-w1', kind: 'curtain-wall', axis: 'z', at: 14, center: -6.5, width: 4.6,
    sill: 0.0, head: 3.4, level: 0, rooms: ['lobby', 'courtyard'],
  },
  {
    id: 'w-facade-e1', kind: 'curtain-wall', axis: 'z', at: 14, center: 6.5, width: 4.6,
    sill: 0.0, head: 3.4, level: 0, rooms: ['lobby', 'courtyard'],
  },
  {
    id: 'w-vest-w', kind: 'curtain-wall', axis: 'z', at: 14, center: -2.6, width: 1.9,
    sill: 0.0, head: 2.6, level: 0, rooms: ['vestibule', 'courtyard'],
  },
  {
    id: 'w-vest-e', kind: 'curtain-wall', axis: 'z', at: 14, center: 2.6, width: 1.9,
    sill: 0.0, head: 2.6, level: 0, rooms: ['vestibule', 'courtyard'],
  },
  {
    id: 'w-waiting-s1', kind: 'window-exterior', axis: 'z', at: 14, center: -12, width: 3.6,
    sill: 0.5, head: 2.55, level: 0, rooms: ['waiting', 'courtyard'], blinds: 0.25,
  },
  {
    id: 'w-waiting-s2', kind: 'window-exterior', axis: 'z', at: 14, center: -17, width: 3.6,
    sill: 0.5, head: 2.55, level: 0, rooms: ['waiting', 'courtyard'], blinds: 0.6,
  },
  {
    id: 'w-waiting-w1', kind: 'window-exterior', axis: 'x', at: -20, center: 11.5, width: 3.4,
    sill: 0.5, head: 2.55, level: 0, rooms: ['waiting', 'courtyard'], blinds: 0,
  },
  {
    id: 'w-waiting-w2', kind: 'window-exterior', axis: 'x', at: -20, center: 7.6, width: 2.6,
    sill: 0.5, head: 2.55, level: 0, rooms: ['waiting', 'courtyard'], blinds: 0.4,
  },
  {
    id: 'w-break-s1', kind: 'window-exterior', axis: 'z', at: 14, center: 12, width: 3.6,
    sill: 0.95, head: 2.55, level: 0, rooms: ['breakroom', 'courtyard'], blinds: 0.15,
  },
  {
    id: 'w-break-s2', kind: 'window-exterior', axis: 'z', at: 14, center: 17, width: 3.4,
    sill: 0.95, head: 2.55, level: 0, rooms: ['breakroom', 'courtyard'], blinds: 0.5,
  },
  {
    id: 'w-break-e1', kind: 'window-exterior', axis: 'x', at: 20, center: 11.5, width: 3.4,
    sill: 0.95, head: 2.55, level: 0, rooms: ['breakroom', 'courtyard'], blinds: 0,
  },
  {
    id: 'w-archive-w', kind: 'window-clerestory', axis: 'x', at: -20, center: -7.5, width: 2.2,
    sill: 2.15, head: 2.75, level: 0, rooms: ['archive', 'courtyard'],
  },
  {
    id: 'w-copy-w', kind: 'window-exterior', axis: 'x', at: -20, center: -1.5, width: 2.4,
    sill: 1.05, head: 2.45, level: 0, rooms: ['copy', 'courtyard'], blinds: 0.7,
  },
  {
    id: 'w-it-e', kind: 'window-exterior', axis: 'x', at: 20, center: -11.5, width: 3.0,
    sill: 1.05, head: 2.45, level: 0, rooms: ['it', 'courtyard'], blinds: 0.35,
  },
  {
    id: 'w-exec-w1', kind: 'window-exterior', axis: 'x', at: -12, center: -9.2, width: 2.8,
    sill: 0.6, head: 2.7, level: 1, rooms: ['execoffice', 'courtyard'], blinds: 0.2,
  },
  {
    id: 'w-exec-w2', kind: 'window-exterior', axis: 'x', at: -12, center: -5.8, width: 2.8,
    sill: 0.6, head: 2.7, level: 1, rooms: ['execoffice', 'courtyard'], blinds: 0.45,
  },
  {
    id: 'w-exec-n', kind: 'window-exterior', axis: 'z', at: -11, center: -8, width: 3.6,
    sill: 0.6, head: 2.7, level: 1, rooms: ['execoffice', 'courtyard'], blinds: 0,
  },
  {
    id: 'w-conf-n1', kind: 'window-exterior', axis: 'z', at: -11, center: -1.5, width: 3.4,
    sill: 0.6, head: 2.7, level: 1, rooms: ['conference', 'courtyard'], blinds: 0.1,
  },
  {
    id: 'w-conf-n2', kind: 'window-exterior', axis: 'z', at: -11, center: 3, width: 3.4,
    sill: 0.6, head: 2.7, level: 1, rooms: ['conference', 'courtyard'], blinds: 0.55,
  },
  {
    id: 'w-openplan-n1', kind: 'window-clerestory', axis: 'z', at: -11, center: -8.5, width: 2.6,
    sill: 2.2, head: 2.8, level: 0, rooms: ['openplan', 'servicecorr'],
  },

  // --- north service band to service corridor ------------------------------
  {
    id: 'd-garage-corr', kind: 'door-fire', axis: 'z', at: -14.5, center: -12, width: 1.1,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['garage', 'servicecorr'], sign: 'GARAGE',
  },
  {
    id: 'o-garage-loading', kind: 'wide-opening', axis: 'x', at: -9.5, center: -18, width: 3.4,
    sill: 0, head: 3.2, level: 0, rooms: ['garage', 'loading'],
  },
  {
    id: 'd-loading-corr', kind: 'door-loading', axis: 'z', at: -14.5, center: -5.5, width: 1.8,
    sill: 0, head: 2.4, level: 0, hingeLow: false, swingPositive: true,
    rooms: ['loading', 'servicecorr'], sign: 'GOODS IN',
  },
  {
    id: 'd-mech-corr', kind: 'door-security', axis: 'z', at: -14.5, center: 2.4, width: 1.0,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true, cardReader: true,
    rooms: ['mech', 'servicecorr'], sign: 'PLANT ROOM — AUTHORISED ACCESS',
  },
  {
    id: 'd-janitor-corr', kind: 'door-standard', axis: 'z', at: -14.5, center: 7.75, width: 0.92,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['janitor', 'servicecorr'], sign: 'JANITOR',
  },
  {
    id: 'd-facilities-corr', kind: 'door-standard', axis: 'z', at: -14.5, center: 11.25, width: 0.92,
    sill: 0, head: 2.1, level: 0, hingeLow: false, swingPositive: true,
    rooms: ['facilities', 'servicecorr'], sign: 'FACILITIES STORE',
  },
  {
    id: 'd-server-it', kind: 'door-server', axis: 'z', at: -14.5, center: 15.2, width: 1.0,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true, cardReader: true, locked: false,
    rooms: ['server', 'it'], sign: 'DATA HALL — RESTRICTED',
  },
  {
    id: 'w-server-it', kind: 'window-interior', axis: 'z', at: -14.5, center: 18, width: 3.0,
    sill: 0.95, head: 2.45, level: 0, rooms: ['server', 'it'],
  },
  {
    id: 'd-corr-it', kind: 'door-fire', axis: 'x', at: 13, center: -12.75, width: 1.05,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['servicecorr', 'it'], sign: 'IT WORKSHOP',
  },
  {
    id: 'd-garage-shutter', kind: 'garage-shutter', axis: 'z', at: -21, center: -14.5, width: 5.0,
    sill: 0, head: 4.0, level: 0, rooms: ['garage', 'dock-yard'],
  },
  {
    id: 'd-loading-shutter', kind: 'garage-shutter', axis: 'z', at: -21, center: -5.5, width: 3.6,
    sill: 0.9, head: 3.9, level: 0, rooms: ['loading', 'dock-yard'],
  },

  // --- service corridor to office core -------------------------------------
  {
    id: 'd-corr-openplan-w', kind: 'door-fire', axis: 'z', at: -11, center: -10, width: 1.1,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['servicecorr', 'openplan'], sign: 'OFFICE FLOOR',
  },
  {
    id: 'd-corr-openplan-e', kind: 'door-fire', axis: 'z', at: -11, center: 2.5, width: 1.1,
    sill: 0, head: 2.1, level: 0, hingeLow: false, swingPositive: true,
    rooms: ['servicecorr', 'openplan'],
  },
  {
    id: 'd-corr-stair', kind: 'door-fire', axis: 'z', at: -11, center: 9.5, width: 1.1,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: false,
    rooms: ['servicecorr', 'stairwell'], sign: 'STAIR 1',
  },
  {
    id: 'd-corr-archive', kind: 'door-standard', axis: 'z', at: -11, center: -16.5, width: 0.95,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: false,
    rooms: ['servicecorr', 'archive'], sign: 'RECORDS ARCHIVE',
  },

  // --- middle band links ---------------------------------------------------
  {
    id: 'o-archive-copy', kind: 'opening', axis: 'z', at: -4.5, center: -14, width: 1.6,
    sill: 0, head: 2.2, level: 0, rooms: ['archive', 'copy'],
  },
  {
    id: 'o-copy-openplan', kind: 'wide-opening', axis: 'x', at: -12, center: -1.6, width: 2.8,
    sill: 0, head: 2.4, level: 0, rooms: ['copy', 'openplan'],
  },
  {
    id: 'd-archive-openplan', kind: 'door-standard', axis: 'x', at: -12, center: -7.5, width: 0.95,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['archive', 'openplan'], sign: 'ARCHIVE',
  },
  {
    id: 'o-copy-westgallery', kind: 'opening', axis: 'z', at: 2, center: -16, width: 1.8,
    sill: 0, head: 2.2, level: 0, rooms: ['copy', 'westgallery'],
  },
  {
    id: 'o-openplan-stairhall', kind: 'wide-opening', axis: 'x', at: 6, center: -1.6, width: 3.2,
    sill: 0, head: 2.5, level: 0, rooms: ['openplan', 'stairhall'],
  },
  {
    id: 'd-openplan-stair', kind: 'door-fire', axis: 'x', at: 6, center: -8.5, width: 1.1,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['openplan', 'stairwell'], sign: 'STAIR 1',
  },
  {
    id: 'o-stair-stairhall', kind: 'wide-opening', axis: 'z', at: -4, center: 11, width: 2.4,
    sill: 0, head: 2.5, level: 0, rooms: ['stairwell', 'stairhall'],
  },
  {
    id: 'o-stairhall-concourse', kind: 'wide-opening', axis: 'x', at: 13, center: 0, width: 3.0,
    sill: 0, head: 2.5, level: 0, rooms: ['stairhall', 'concourse'],
  },
  {
    id: 'o-stairhall-lobby', kind: 'wide-opening', axis: 'z', at: 2, center: 7.5, width: 2.6,
    sill: 0, head: 2.6, level: 0, rooms: ['stairhall', 'lobby'],
  },
  {
    id: 'w-lobby-openplan', kind: 'window-interior', axis: 'z', at: 2, center: -3.5, width: 5.4,
    sill: 1.05, head: 2.5, level: 0, rooms: ['openplan', 'lobby'],
  },
  {
    id: 'd-concourse-restroom', kind: 'door-restroom', axis: 'z', at: -2, center: 13.9, width: 0.95,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['concourse', 'restroom-vest'], sign: 'RESTROOMS',
  },
  {
    id: 'd-vest-restroom-a', kind: 'door-restroom', axis: 'x', at: 14.8, center: -6.5, width: 0.92,
    sill: 0, head: 2.1, level: 0, hingeLow: true, swingPositive: true,
    rooms: ['restroom-vest', 'restroom-a'], sign: 'RESTROOM A',
  },
  {
    id: 'd-vest-restroom-b', kind: 'door-restroom', axis: 'x', at: 14.8, center: -3.5, width: 0.92,
    sill: 0, head: 2.1, level: 0, hingeLow: false, swingPositive: true,
    rooms: ['restroom-vest', 'restroom-b'], sign: 'RESTROOM B',
  },
  {
    id: 'd-vest-it', kind: 'door-standard', axis: 'z', at: -8, center: 13.9, width: 0.95,
    sill: 0, head: 2.1, level: 0, hingeLow: false, swingPositive: false,
    rooms: ['restroom-vest', 'it'],
  },
  {
    id: 'o-concourse-breakroom', kind: 'wide-opening', axis: 'z', at: 6, center: 14.5, width: 3.6,
    sill: 0, head: 2.5, level: 0, rooms: ['concourse', 'breakroom'],
  },
  {
    id: 'o-concourse-lobby', kind: 'wide-opening', axis: 'x', at: 9, center: 4, width: 3.6,
    sill: 0, head: 2.8, level: 0, rooms: ['concourse', 'lobby'],
  },
  {
    id: 'o-lobby-westgallery', kind: 'wide-opening', axis: 'x', at: -9, center: 4, width: 3.6,
    sill: 0, head: 2.8, level: 0, rooms: ['lobby', 'westgallery'],
  },
  {
    id: 'o-westgallery-waiting', kind: 'wide-opening', axis: 'z', at: 6, center: -14.5, width: 5.0,
    sill: 0, head: 2.6, level: 0, rooms: ['westgallery', 'waiting'],
  },
  {
    id: 'w-guard', kind: 'pass-through', axis: 'x', at: -4, center: 12.2, width: 1.6,
    sill: 1.0, head: 2.2, level: 0, rooms: ['vestibule', 'lobby'],
  },

  // --- level 1 -------------------------------------------------------------
  {
    id: 'd-stairup-corr', kind: 'door-fire', axis: 'z', at: -4, center: 11, width: 1.1,
    sill: 0, head: 2.1, level: 1, hingeLow: true, swingPositive: true,
    rooms: ['stairwell-up', 'execcorr'], sign: 'STAIR 1',
  },
  {
    id: 'd-conf-corr', kind: 'door-glass', axis: 'z', at: -4, center: 3.6, width: 1.0,
    sill: 0, head: 2.15, level: 1, hingeLow: true, swingPositive: true,
    rooms: ['conference', 'execcorr'], sign: 'BOARDROOM 2A',
  },
  {
    id: 'w-conf-corr', kind: 'window-interior', axis: 'z', at: -4, center: -0.5, width: 6.0,
    sill: 0.0, head: 2.5, level: 1, rooms: ['conference', 'execcorr'],
  },
  {
    id: 'd-exec-corr', kind: 'door-standard', axis: 'z', at: -4, center: -5.5, width: 0.98,
    sill: 0, head: 2.15, level: 1, hingeLow: false, swingPositive: true,
    rooms: ['execoffice', 'execcorr'], sign: 'DIRECTOR — B. HALVORSEN',
  },
  {
    id: 'w-exec-corr', kind: 'window-interior', axis: 'z', at: -4, center: -9.2, width: 3.4,
    sill: 0.95, head: 2.5, level: 1, rooms: ['execoffice', 'execcorr'],
  },
  {
    id: 'o-corr-mezz', kind: 'wide-opening', axis: 'z', at: -1, center: 2, width: 12.0,
    sill: 0, head: 2.7, level: 1, rooms: ['execcorr', 'mezzanine'],
  },
];

// ---------------------------------------------------------------------------
// Named checkpoints for QA teleport and testing
// ---------------------------------------------------------------------------

export const CHECKPOINTS: SpawnDef[] = [
  { id: 'spawn', x: 0, y: 0, z: 20.5, yaw: 0, room: 'courtyard' },
  { id: 'courtyard-west', x: -12, y: 0, z: 19, yaw: -0.5, room: 'courtyard' },
  { id: 'vestibule', x: 0, y: 0, z: 12.2, yaw: 0, room: 'vestibule' },
  { id: 'lobby', x: 0, y: 0, z: 8.5, yaw: 0, room: 'lobby' },
  { id: 'lobby-desk', x: -3.5, y: 0, z: 6.5, yaw: 0, room: 'lobby' },
  { id: 'waiting', x: -14.5, y: 0, z: 10, yaw: Math.PI * 0.5, room: 'waiting' },
  { id: 'west-gallery', x: -14, y: 0, z: 4, yaw: Math.PI, room: 'westgallery' },
  { id: 'copy', x: -16, y: 0, z: -1.5, yaw: Math.PI, room: 'copy' },
  { id: 'archive', x: -16, y: 0, z: -7.5, yaw: 0, room: 'archive' },
  { id: 'openplan', x: -3, y: 0, z: -4, yaw: Math.PI, room: 'openplan' },
  { id: 'openplan-north', x: -3, y: 0, z: -9.5, yaw: 0, room: 'openplan' },
  { id: 'stairhall', x: 9.5, y: 0, z: -1, yaw: Math.PI, room: 'stairhall' },
  { id: 'stairwell', x: 11.4, y: 0, z: -5.2, yaw: 0, room: 'stairwell' },
  { id: 'concourse', x: 15, y: 0, z: 4, yaw: Math.PI * 0.5, room: 'concourse' },
  { id: 'breakroom', x: 14.5, y: 0, z: 10, yaw: 0, room: 'breakroom' },
  { id: 'restrooms', x: 13.9, y: 0, z: -5, yaw: Math.PI * 0.5, room: 'restroom-vest' },
  { id: 'restroom-a', x: 17.4, y: 0, z: -6.5, yaw: Math.PI * 0.5, room: 'restroom-a' },
  { id: 'restroom-b', x: 17.4, y: 0, z: -3.5, yaw: Math.PI * 0.5, room: 'restroom-b' },
  { id: 'it', x: 16.5, y: 0, z: -11, yaw: 0, room: 'it' },
  { id: 'server', x: 16.5, y: 0.3, z: -17.5, yaw: Math.PI, room: 'server' },
  { id: 'service-corridor', x: 0, y: 0, z: -12.75, yaw: Math.PI * 1.5, room: 'servicecorr' },
  { id: 'service-corridor-west', x: -18, y: 0, z: -12.75, yaw: Math.PI * 0.5, room: 'servicecorr' },
  { id: 'facilities', x: 11.25, y: 0, z: -17.5, yaw: Math.PI, room: 'facilities' },
  { id: 'janitor', x: 7.75, y: 0, z: -17.5, yaw: Math.PI, room: 'janitor' },
  { id: 'mech', x: 2.5, y: 0, z: -17.5, yaw: Math.PI, room: 'mech' },
  { id: 'loading', x: -5.5, y: 0, z: -17.5, yaw: Math.PI, room: 'loading' },
  { id: 'garage', x: -14.5, y: 0, z: -17.5, yaw: 0, room: 'garage' },
  { id: 'mezzanine', x: 2, y: 4, z: 0.5, yaw: Math.PI, room: 'mezzanine' },
  { id: 'exec-corridor', x: 0, y: 4, z: -2.5, yaw: Math.PI * 1.5, room: 'execcorr' },
  { id: 'conference', x: 1, y: 4, z: -7.5, yaw: 0, room: 'conference' },
  { id: 'exec-office', x: -8, y: 4, z: -7.5, yaw: 0, room: 'execoffice' },
  { id: 'stair-landing', x: 11.4, y: 4, z: -5.2, yaw: Math.PI, room: 'stairwell-up' },
];

export const PLAYER_SPAWN: SpawnDef = CHECKPOINTS[0];

/** Hostage holding positions. */
export const HOSTAGE_SPOTS = {
  'hostage-a': { x: -1.4, y: 4.0, z: -8.6, yaw: Math.PI * 0.5, room: 'conference' },
  'hostage-b': { x: 12.2, y: 0.0, z: 7.6, yaw: Math.PI * 0.25, room: 'breakroom' },
} as const;

/** Extraction trigger volume inside the garage, behind the van. */
export const EXTRACTION_ZONE = {
  x0: -18.6, z0: -20.2, x1: -12.4, z1: -16.0, y: 0,
  markerX: -15.5, markerZ: -18.1,
};

// ---------------------------------------------------------------------------
// Structural columns (visible, collidable, and used as natural cover)
// ---------------------------------------------------------------------------

export const COLUMNS: { x: number; z: number; level: 0 | 1; size: number; top: number }[] = [
  { x: -7.5, z: -7.5, level: 0, size: 0.5, top: 3.4 },
  { x: -7.5, z: -1.5, level: 0, size: 0.5, top: 3.4 },
  { x: 1.5, z: -7.5, level: 0, size: 0.5, top: 3.4 },
  { x: 1.5, z: -1.5, level: 0, size: 0.5, top: 3.4 },
  { x: -4.5, z: 4.5, level: 0, size: 0.6, top: 7.8 },
  { x: 4.5, z: 4.5, level: 0, size: 0.6, top: 7.8 },
  { x: -7.5, z: -7.5, level: 1, size: 0.45, top: 7.2 },
  { x: 1.5, z: -7.5, level: 1, size: 0.45, top: 7.2 },
];

/** Wall thickness constants shared by builder and collision. */
export const WALL = {
  interior: 0.14,
  interiorHeavy: 0.22,
  exterior: 0.4,
  slab: 0.6,
  /** Gap between finished ceiling and the slab above. */
  plenum: 0.4,
};

export const BUILDING = {
  minX: -20,
  maxX: 20,
  minZ: -21,
  maxZ: 14,
  level0Y: 0,
  level1Y: 4.0,
  roofCentralY: 8.2,
  roofServiceY: 5.4,
  roofLobbyY: 8.2,
};
