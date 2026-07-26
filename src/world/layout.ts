import type { DoorKind, RoomId } from '../game/types';

/**
 * NORTHSTAR ADMINISTRATIVE ANNEX — original two-story office layout (Fable 2).
 *
 * Coordinates in meters. x: 0(W)→56(E), z: 0(N)→40(S). Ground floor y=0,
 * upper floor y=3.6. North (z<6) is the snowbound exterior courtyard.
 *
 * GROUND                                UPPER (y=3.6)
 * z0  ┌────────────────────────────┐
 *     │ COURTYARD (snow, spawn)    │
 * z6  ├──┬───────┬─────────────┬───┤    ┌REC┬BALCONY┬EXEC CORR──┬────┐
 *     │EN│ LOBBY │ N CORRIDOR  │IT │    │ORD│(rail)  x26..44    │EXEC│
 * z10 │VE│ (2-st.│──────────── │   │    │S  ├─(void)─┬──────────┤OFF.│
 *     │ST│ void) │ST|RM|RW|JA|SRV  │    │x6 │ lobby  │CONFERENCE│x44 │
 * z14 ├──┤ stair │AIR         │   │    │..1│  void  │ x32..44  │..54│
 *     │SEC│      │WELL        ├───┤    │2  │        │          │    │
 * z18 ├──┴┬──────┴────────────┴───┤    └───┴────────┴──────────┴────┘
 *     │      MAIN HALL x12..48    │SVC│
 * z21 ├────┬──────────────┬──┬────┤COR│
 *     │WAIT│              │CO│LOAD│RID│
 * z26 ├────┤   OPEN-PLAN  │PY│ING │OR │
 *     │BRK │   CUBICLES   │  │    │   │
 * z30 ├────┤   x20..36    ├──┴────┼───┤
 *     │WELL│              │GARAGE │MECH
 * z38 └────┴──────────────┴───────┴───┘
 */

export type MatId =
  | 'gb' // graybox fallback
  | 'drywall' | 'drywall-blue' | 'drywall-green' | 'drywall-warm' | 'plaster'
  | 'concrete' | 'concrete-floor' | 'concrete-sealed' | 'cmu'
  | 'carpet-office' | 'carpet-exec' | 'carpet-lobby'
  | 'tile-lobby' | 'tile-restroom' | 'tile-restroom-wall' | 'vinyl' | 'vinyl-service'
  | 'ceiling-tile' | 'ceiling-slab' | 'wood-floor'
  | 'metal-panel' | 'metal-galv' | 'brick-dark' | 'snow' | 'asphalt'
  | 'wood-veneer' | 'stone-dark';

export interface RoomDef {
  id: RoomId;
  rect: [number, number, number, number]; // x0,z0,x1,z1
  floorY: number;
  ceilY: number | null; // null = open to sky (outdoor)
  floorMat: MatId;
  ceilMat: MatId;
  outdoor?: boolean;
  /** ambient audio patch id */
  amb?: string;
}

export interface OpeningSpec {
  /** center distance along wall from endpoint A, meters */
  at: number;
  width: number;
  /** bottom of opening relative to wall y0 */
  sill: number;
  /** top of opening relative to wall y0 */
  top: number;
  kind: 'passage' | 'door' | 'window' | 'glass' | 'shutter';
  door?: {
    id: string;
    kind: DoorKind;
    /** door leaf swings into positive wall-normal side? (visual) */
    flip?: boolean;
    /** initial fraction open 0..1 */
    ajar?: number;
    double?: boolean;
  };
  glass?: {
    id: string;
    frosted?: boolean;
    wired?: boolean;
    /** number of panel subdivisions along width */
    panels?: number;
    breakable?: boolean;
  };
  shutterId?: string;
}

export interface WallSpec {
  id: string;
  a: [number, number];
  b: [number, number];
  y0: number;
  y1: number;
  t: number;
  mat: MatId;
  exterior?: boolean;
  /** low wall (parapet/half-wall) */
  cap?: boolean;
  openings?: OpeningSpec[];
}

export interface StairSpec {
  id: string;
  /** rectangle containing the run */
  x0: number; z0: number; x1: number; z1: number;
  /** axis of ascent: '+z' | '-z' | '+x' | '-x' */
  dir: '+z' | '-z' | '+x' | '-x';
  baseY: number;
  steps: number;
  rise: number;
  mat: MatId;
  /** which sides get railings: 'e','w','n','s' letters */
  rails?: string;
}

export interface ZoneSpec {
  id: string;
  rect: [number, number, number, number];
  y: number;
  name: string;
}

export interface PatrolRoute {
  id: string;
  floorY: number;
  points: [number, number][];
}

const R = (
  id: RoomId, x0: number, z0: number, x1: number, z1: number,
  floorY: number, ceilY: number | null, floorMat: MatId, ceilMat: MatId,
  extra: Partial<RoomDef> = {},
): RoomDef => ({ id, rect: [x0, z0, x1, z1], floorY, ceilY, floorMat, ceilMat, ...extra });

export const ROOMS: RoomDef[] = [
  R('courtyard', 0, 0, 26, 6, 0, null, 'snow', 'gb', { outdoor: true, amb: 'wind' }),
  R('entrance', 6, 6, 12, 9, 0, 3.3, 'concrete-sealed', 'ceiling-slab', { outdoor: true, amb: 'wind' }),
  R('vestibule', 6, 9, 12, 14, 0, 2.7, 'tile-lobby', 'ceiling-tile'),
  R('security', 6, 14, 12, 20, 0, 2.7, 'vinyl', 'ceiling-tile'),
  R('lobby', 12, 6, 26, 18, 0, 6.15, 'tile-lobby', 'ceiling-tile', { amb: 'hvac' }),
  R('ncorr', 26, 6, 48, 10, 0, 2.7, 'carpet-office', 'ceiling-tile'),
  R('it', 48, 6, 54, 16, 0, 2.7, 'vinyl', 'ceiling-tile', { amb: 'hvac' }),
  R('stairwell', 26, 10, 32, 18, 0, 6.15, 'concrete-sealed', 'ceiling-slab', { amb: 'stairwell' }),
  R('restroom-m', 32, 10, 36, 18, 0, 2.6, 'tile-restroom', 'ceiling-tile'),
  R('restroom-w', 36, 10, 40, 18, 0, 2.6, 'tile-restroom', 'ceiling-tile'),
  R('janitor', 40, 10, 42, 18, 0, 2.6, 'concrete-floor', 'ceiling-slab'),
  R('server', 42, 10, 48, 18, 0, 2.6, 'vinyl-service', 'ceiling-slab', { amb: 'server' }),
  R('mainhall', 12, 18, 48, 21, 0, 2.7, 'carpet-office', 'ceiling-tile'),
  R('waiting', 12, 21, 20, 26, 0, 2.7, 'carpet-lobby', 'ceiling-tile'),
  R('break', 12, 26, 20, 33, 0, 2.7, 'vinyl', 'ceiling-tile'),
  R('wellness', 12, 33, 20, 38, 0, 2.7, 'vinyl', 'ceiling-tile'),
  R('cubicles', 20, 21, 36, 38, 0, 2.9, 'carpet-office', 'ceiling-tile', { amb: 'hvac' }),
  R('copy', 36, 21, 40, 30, 0, 2.7, 'vinyl', 'ceiling-tile'),
  R('loading', 40, 21, 48, 30, 0, 3.4, 'concrete-floor', 'ceiling-slab', { amb: 'hvac' }),
  R('garage', 36, 30, 50, 38, 0, 4.2, 'concrete-floor', 'ceiling-slab', { amb: 'garage' }),
  R('servicecorr', 48, 16, 54, 30, 0, 2.5, 'concrete-floor', 'ceiling-slab', { amb: 'service' }),
  R('mech', 50, 30, 54, 38, 0, 3.0, 'concrete-floor', 'ceiling-slab', { amb: 'mech' }),
  // Upper floor
  R('records', 6, 6, 12, 20, 3.6, 6.15, 'carpet-office', 'ceiling-tile'),
  R('balcony', 12, 6, 26, 10, 3.6, 6.15, 'tile-lobby', 'ceiling-tile'),
  R('execcorr', 26, 6, 44, 10, 3.6, 6.15, 'carpet-exec', 'ceiling-tile'),
  R('conference', 32, 10, 44, 18, 3.6, 6.15, 'carpet-exec', 'ceiling-tile'),
  R('exec', 44, 6, 54, 18, 3.6, 6.15, 'carpet-exec', 'ceiling-tile'),
];

// ---------------------------------------------------------------------------
// Walls. Interior t=0.14, exterior t=0.3, glass partition t=0.08.
// Ground interior walls run 0→3.3 (to slab); upper 3.6→6.45; exterior per face.
// ---------------------------------------------------------------------------

const W = (
  id: string, a: [number, number], b: [number, number],
  y0: number, y1: number, t: number, mat: MatId,
  openings: OpeningSpec[] = [], extra: Partial<WallSpec> = {},
): WallSpec => ({ id, a, b, y0, y1, t, mat, openings, ...extra });

const DOOR_H = 2.06;
const G0 = 0; const G1 = 3.3;    // ground wall band
const U0 = 3.6; const U1 = 6.45; // upper wall band

export const WALLS: WallSpec[] = [
  // ===== EXTERIOR SHELL =====
  // North face west wing (vestibule/alcove side walls & face)
  W('x-n-alcove-w', [6, 6], [6, 9], 0, 7.0, 0.3, 'brick-dark', [], { exterior: true }),
  W('x-n-alcove-e', [12, 6], [12, 9], 0, 3.3, 0.3, 'brick-dark', [], { exterior: true }),
  W('x-n-vest', [6, 9], [12, 9], 0, 3.3, 0.3, 'brick-dark', [
    { at: 3.0, width: 2.0, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-entry', kind: 'glass', double: true } },
  ], { exterior: true }),
  // Lobby curtain wall (two-story glass, panels split by builder)
  W('x-n-lobby', [12, 6], [26, 6], 0, 6.45, 0.24, 'metal-panel', [
    { at: 7.0, width: 12.8, sill: 0.25, top: 5.9, kind: 'glass', glass: { id: 'g-curtain', panels: 8, breakable: true } },
  ], { exterior: true }),
  // North corridor face: ribbon windows
  W('x-n-ncorr', [26, 6], [48, 6], 0, 7.0, 0.3, 'brick-dark', [
    { at: 4, width: 3.4, sill: 1.15, top: 2.45, kind: 'window', glass: { id: 'g-nc1', panels: 3, breakable: true } },
    { at: 11, width: 3.4, sill: 1.15, top: 2.45, kind: 'window', glass: { id: 'g-nc2', panels: 3, breakable: true } },
    { at: 18, width: 3.4, sill: 1.15, top: 2.45, kind: 'window', glass: { id: 'g-nc3', panels: 3, breakable: true } },
    // upper (exec corridor) clerestory
    { at: 6, width: 5, sill: 4.85, top: 5.95, kind: 'window', glass: { id: 'g-ecc1', panels: 4 } },
    { at: 14, width: 5, sill: 4.85, top: 5.95, kind: 'window', glass: { id: 'g-ecc2', panels: 4 } },
  ], { exterior: true }),
  // IT north face + exec above
  W('x-n-it', [48, 6], [54, 6], 0, 7.0, 0.3, 'brick-dark', [
    { at: 3, width: 3.2, sill: 0.95, top: 2.45, kind: 'window', glass: { id: 'g-it-n', panels: 3, breakable: true } },
    { at: 3, width: 4.0, sill: 4.2, top: 5.95, kind: 'window', glass: { id: 'g-exec-n', panels: 3 } },
  ], { exterior: true }),
  // East face
  W('x-e', [54, 6], [54, 30], 0, 7.0, 0.3, 'brick-dark', [
    { at: 6, width: 3.4, sill: 4.2, top: 5.95, kind: 'window', glass: { id: 'g-exec-e', panels: 3 } },   // exec upper
    { at: 22.5, width: 2.0, sill: 1.5, top: 2.3, kind: 'window', glass: { id: 'g-svc-e', wired: true, panels: 2 } }, // service corr slit
  ], { exterior: true }),
  W('x-e-mech', [54, 30], [54, 38], 0, 4.5, 0.3, 'brick-dark', [], { exterior: true }),
  // South face
  W('x-s-mech', [50, 38], [54, 38], 0, 4.5, 0.3, 'brick-dark', [], { exterior: true }),
  W('x-s-garage', [36, 38], [50, 38], 0, 4.9, 0.3, 'brick-dark', [
    { at: 7.0, width: 9.6, sill: 0, top: 3.35, kind: 'shutter', shutterId: 'shutter-garage' },
  ], { exterior: true }),
  W('x-s-cub', [20, 38], [36, 38], 0, 3.9, 0.3, 'brick-dark', [
    { at: 2.6, width: 3.4, sill: 0.95, top: 2.55, kind: 'window', glass: { id: 'g-cub-s1', panels: 3, breakable: true } },
    { at: 8.0, width: 3.4, sill: 0.95, top: 2.55, kind: 'window', glass: { id: 'g-cub-s2', panels: 3, breakable: true } },
    { at: 13.4, width: 3.4, sill: 0.95, top: 2.55, kind: 'window', glass: { id: 'g-cub-s3', panels: 3, breakable: true } },
  ], { exterior: true }),
  W('x-s-well', [12, 38], [20, 38], 0, 3.9, 0.3, 'brick-dark', [
    { at: 4, width: 3.0, sill: 0.95, top: 2.55, kind: 'window', glass: { id: 'g-well-s', panels: 3, breakable: true } },
  ], { exterior: true }),
  // West face
  W('x-w-south', [12, 20], [12, 38], 0, 3.9, 0.3, 'brick-dark', [
    { at: 8.2, width: 3.2, sill: 0.95, top: 2.55, kind: 'window', glass: { id: 'g-break-w', panels: 3, breakable: true } },
  ], { exterior: true }),
  W('x-w-sec', [6, 14], [6, 20], 0, 7.0, 0.3, 'brick-dark', [
    { at: 3.0, width: 2.4, sill: 1.0, top: 2.45, kind: 'window', glass: { id: 'g-sec-w', panels: 2, breakable: true } },
    { at: 3.0, width: 2.4, sill: 4.55, top: 5.95, kind: 'window', glass: { id: 'g-rec-w2', panels: 2 } },
  ], { exterior: true }),
  W('x-w-vest', [6, 9], [6, 14], 0, 7.0, 0.3, 'brick-dark', [
    { at: 2.5, width: 1.8, sill: 4.55, top: 5.95, kind: 'window', glass: { id: 'g-rec-w1', panels: 2 } },
  ], { exterior: true }),
  // Step face at z20 from x6→x12 (exterior corner near security)
  W('x-w-step', [6, 20], [12, 20], 0, 7.0, 0.3, 'brick-dark', [], { exterior: true }),

  // ===== GROUND FLOOR INTERIOR =====
  // Vestibule east → lobby (badge line)
  W('i-vest-lobby', [12, 9], [12, 14], G0, G1, 0.14, 'drywall', [
    { at: 2.1, width: 2.0, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-vest-lobby', kind: 'glass', double: true } },
  ]),
  // Vestibule south → security
  W('i-vest-sec', [6, 14], [12, 14], G0, G1, 0.14, 'drywall', [
    { at: 2.6, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-vest-sec', kind: 'security' } },
    { at: 4.6, width: 1.6, sill: 1.0, top: 2.1, kind: 'glass', glass: { id: 'g-vest-sec', wired: true, panels: 2 } },
  ]),
  // Security east → lobby
  W('i-sec-lobby', [12, 14], [12, 18], G0, G1, 0.14, 'drywall', [
    { at: 2.4, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-sec-lobby', kind: 'office' } },
  ]),
  // Lobby south wall (grand opening to main hall + brand wall above)
  W('i-lobby-mh', [12, 18], [26, 18], 0, 6.15, 0.2, 'drywall', [
    { at: 7.0, width: 8.0, sill: 0, top: 2.62, kind: 'passage' },
  ]),
  // Lobby east: wall to stairwell (ground) — solid below, upper part closes void edge
  W('i-lobby-stair', [26, 10], [26, 18], 0, 6.15, 0.16, 'drywall', [
    { at: 6.5, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-stair-w0', kind: 'fire' } },
  ]),
  // Lobby/ncorr archway pier (opening x26 z6..10 => wall with big passage)
  W('i-lobby-ncorr', [26, 6], [26, 10], G0, G1, 0.14, 'drywall', [
    { at: 2.1, width: 2.6, sill: 0, top: 2.62, kind: 'passage' },
  ]),
  // N corridor south wall: stairwell/restrooms/janitor/server doors + server window
  W('i-ncorr-s', [26, 10], [48, 10], G0, G1, 0.14, 'drywall', [
    { at: 3.0, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-stair-n0', kind: 'fire' } },
    { at: 8.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-rr-m', kind: 'restroom' } },
    { at: 12.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-rr-w', kind: 'restroom' } },
    { at: 15.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-janitor', kind: 'office' } },
    { at: 19.0, width: 3.6, sill: 1.15, top: 2.25, kind: 'glass', glass: { id: 'g-server-n', wired: true, panels: 3 } },
  ]),
  // N corridor east → IT
  W('i-ncorr-it', [48, 6], [48, 10], G0, G1, 0.14, 'drywall', [
    { at: 2.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-it', kind: 'office' } },
  ]),
  // Restroom dividers
  W('i-rr-div', [36, 10], [36, 18], G0, G1, 0.14, 'tile-restroom-wall'),
  W('i-rr-jan', [40, 10], [40, 18], G0, G1, 0.14, 'drywall'),
  W('i-jan-server', [42, 10], [42, 18], G0, G1, 0.14, 'drywall'),
  // Stairwell east wall (to restroom-m)
  W('i-stair-rrm', [32, 10], [32, 18], 0, 6.15, 0.2, 'cmu'),
  // Server east → IT (door + wired window)
  W('i-server-it', [48, 10], [48, 16], G0, G1, 0.14, 'drywall', [
    { at: 2.9, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-it-server', kind: 'server' } },
    { at: 4.9, width: 1.6, sill: 1.05, top: 2.15, kind: 'glass', glass: { id: 'g-it-server', wired: true, panels: 2 } },
  ]),
  // IT south → service corridor
  W('i-it-svc', [48, 16], [54, 16], G0, G1, 0.14, 'drywall', [
    { at: 3.1, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-it-svc', kind: 'office' } },
  ]),
  // Main hall north wall segments (stairwell south door, restrooms/server backs)
  W('i-mh-n', [26, 18], [48, 18], G0, G1, 0.14, 'drywall', [
    { at: 3.0, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-stair-s0', kind: 'fire' } },
    { at: 18.9, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-server-s', kind: 'fire', ajar: 0.35 } },
  ]),
  // Main hall east end → service corridor
  W('i-mh-svc', [48, 18], [48, 21], G0, G1, 0.14, 'drywall', [
    { at: 1.5, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-mh-svc', kind: 'fire' } },
  ]),
  // Main hall south wall: waiting opening, cubicle openings, copy door, loading double
  W('i-mh-s', [12, 21], [48, 21], G0, G1, 0.14, 'drywall', [
    { at: 4.0, width: 5.6, sill: 0, top: 2.62, kind: 'passage' },                     // → waiting
    { at: 14.0, width: 3.6, sill: 0, top: 2.62, kind: 'passage' },                    // → cubicles W
    { at: 20.0, width: 2.4, sill: 0, top: 2.62, kind: 'passage' },                    // → cubicles E
    { at: 26.1, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-copy', kind: 'office' } },
    { at: 32.0, width: 1.9, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-loading-n', kind: 'loading', double: true } },
  ]),
  // Waiting south → break
  W('i-wait-break', [12, 26], [20, 26], G0, G1, 0.14, 'drywall', [
    { at: 4.4, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-break', kind: 'office' } },
  ]),
  // Waiting east → cubicles (half-wall + planter opening)
  W('i-wait-cub', [20, 21], [20, 26], G0, G1, 0.14, 'drywall', [
    { at: 2.5, width: 2.6, sill: 0, top: 2.62, kind: 'passage' },
  ]),
  // Break east → cubicles
  W('i-break-cub', [20, 26], [20, 33], G0, G1, 0.14, 'drywall', [
    { at: 3.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-break-e', kind: 'office' } },
    { at: 5.4, width: 1.8, sill: 1.05, top: 2.15, kind: 'glass', glass: { id: 'g-break-cub', panels: 2, breakable: true } },
  ]),
  // Break south → wellness
  W('i-break-well', [12, 33], [20, 33], G0, G1, 0.14, 'drywall'),
  // Wellness east → cubicles
  W('i-well-cub', [20, 33], [20, 38], G0, G1, 0.14, 'drywall', [
    { at: 2.4, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-wellness', kind: 'office' } },
  ]),
  // Cubicles east → copy & garage
  W('i-cub-copy', [36, 21], [36, 30], G0, G1, 0.14, 'drywall', [
    { at: 3.6, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-copy-w', kind: 'office' } },
  ]),
  W('i-cub-garage', [36, 30], [36, 38], 0, 4.5, 0.2, 'cmu', [
    { at: 3.6, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-garage-w', kind: 'fire' } },
  ]),
  // Copy east → loading
  W('i-copy-load', [40, 21], [40, 30], G0, G1, 0.14, 'drywall', [
    { at: 6.5, width: 1.2, sill: 1.0, top: 2.2, kind: 'glass', glass: { id: 'g-copy-load', wired: true, panels: 1 } },
  ]),
  // Loading east → service corridor
  W('i-load-svc', [48, 21], [48, 30], G0, G1, 0.14, 'drywall', [
    { at: 4.4, width: 1.9, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-load-svc', kind: 'loading', double: true } },
  ]),
  // Loading south → garage (wide open rolling frame)
  W('i-load-garage', [40, 30], [48, 30], 0, 4.5, 0.2, 'cmu', [
    { at: 3.6, width: 4.2, sill: 0, top: 3.0, kind: 'passage' },
  ]),
  // Cubicles/copy south → garage north wall west part
  W('i-copy-garage', [36, 30], [40, 30], 0, 4.5, 0.2, 'cmu'),
  // Service corr south → mech
  W('i-svc-mech', [48, 30], [54, 30], G0, G1, 0.14, 'cmu', [
    { at: 4.4, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-mech', kind: 'security' } },
  ]),
  // Garage east → mech (lower) & service corr strip x[48,50] handled by garage east wall
  W('i-garage-mech', [50, 30], [50, 38], 0, 4.5, 0.2, 'cmu', [
    { at: 3.6, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-mech-garage', kind: 'security' } },
  ]),
  // Security south → main hall (solid, storage wall)
  W('i-sec-mh', [4, 20], [12, 20], G0, G1, 0.14, 'drywall'),
  // Security west wall filler x[4,6] z20? covered by exterior step wall.
  // security x0 face
  W('x-w-sec-s', [4, 20], [6, 20], 0, 3.9, 0.3, 'brick-dark', [], { exterior: true }),

  // ===== UPPER FLOOR INTERIOR =====
  // Records east wall → balcony/void
  W('i-rec-balc', [12, 6], [12, 20], U0, U1, 0.14, 'drywall', [
    { at: 2.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-records', kind: 'office' } },
    { at: 7.4, width: 2.2, sill: 0.95, top: 2.15, kind: 'glass', glass: { id: 'g-rec-void', panels: 2, breakable: true } },
  ]),
  // Balcony east → exec corridor (fire double)
  W('i-balc-corr', [26, 6], [26, 10], U0, U1, 0.14, 'drywall', [
    { at: 2.0, width: 1.9, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-balc-corr', kind: 'fire', double: true } },
  ]),
  // Exec corridor south: stairwell door + conference glass wall
  W('i-corr-s', [26, 10], [44, 10], U0, U1, 0.14, 'drywall', [
    { at: 3.0, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-stair-n1', kind: 'fire' } },
    { at: 8.9, width: 1.9, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-conf', kind: 'glass', double: true } },
    { at: 13.9, width: 6.4, sill: 0.25, top: 2.5, kind: 'glass', glass: { id: 'g-conf', panels: 4, breakable: true } },
  ]),
  // Exec corridor east → exec office
  W('i-corr-exec', [44, 6], [44, 10], U0, U1, 0.14, 'drywall', [
    { at: 2.0, width: 0.98, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-exec', kind: 'office' } },
  ]),
  // Conference east → exec office (private door)
  W('i-conf-exec', [44, 10], [44, 18], U0, U1, 0.14, 'drywall', [
    { at: 4.0, width: 0.95, sill: 0, top: DOOR_H, kind: 'door', door: { id: 'd-exec-conf', kind: 'office' } },
  ]),
  // Conference south wall (over MH — solid w/ acoustic panels)
  W('i-conf-s', [32, 18], [44, 18], U0, U1, 0.14, 'drywall'),
  W('i-exec-s', [44, 18], [54, 18], U0, U1, 0.14, 'drywall'),
  // Conference west → stairwell shaft
  W('i-conf-stair', [32, 10], [32, 18], U0, U1, 0.2, 'cmu'),
  // Records south (upper, over security south)
  W('i-rec-s', [6, 20], [12, 20], U0, U1, 0.14, 'drywall'),
  // Stairwell upper: south + east walls already; upper landing guard toward void handled in stairs.
  // Stairwell south wall upper (closes shaft from conference side? conference-stair covers x32; south face z18 upper over MH):
  W('i-stair-s1', [26, 18], [32, 18], U0, U1, 0.2, 'cmu'),
];

// ---------------------------------------------------------------------------
// Stairs
// ---------------------------------------------------------------------------
export const STAIRS: StairSpec[] = [
  // Lobby open stair: 20 risers up northward along west lobby wall (flush to x12 wall)
  { id: 'stair-lobby', x0: 12.1, z0: 10.4, x1: 13.7, z1: 16.0, dir: '-z', baseY: 0, steps: 20, rise: 0.18, mat: 'tile-lobby', rails: 'e' },
  // Central stairwell run1: east side, 12 risers up southward (0→2.16)
  { id: 'stair-c1', x0: 29.9, z0: 11.0, x1: 31.5, z1: 14.36, dir: '+z', baseY: 0, steps: 12, rise: 0.18, mat: 'concrete-sealed', rails: 'w' },
  // run2: west side, 8 risers up northward (2.16→3.6)
  { id: 'stair-c2', x0: 26.5, z0: 12.12, x1: 28.1, z1: 14.36, dir: '-z', baseY: 2.16, steps: 8, rise: 0.18, mat: 'concrete-sealed', rails: 'e' },
];

/** Mid/upper landings & balcony slabs (floor patches beyond room floors). */
export const SLABS: { id: string; rect: [number, number, number, number]; y0: number; y1: number; mat: MatId }[] = [
  { id: 'slab-stair-mid', rect: [26.5, 14.36, 31.5, 16.2], y0: 1.95, y1: 2.16, mat: 'concrete-sealed' }, // mid landing (1.95 m clear below)
  { id: 'slab-stair-top', rect: [26.5, 10.0, 31.5, 12.12], y0: 3.32, y1: 3.6, mat: 'concrete-sealed' },  // top landing
  { id: 'slab-lobbystair-top', rect: [12.1, 10.0, 13.7, 10.4], y0: 3.32, y1: 3.6, mat: 'tile-lobby' },   // stair mouth tongue
];

/** Railings: horizontal guard runs (1.06 m) at slab edges. */
export const RAILS: { id: string; a: [number, number]; b: [number, number]; y: number; kind: 'glass' | 'steel' }[] = [
  { id: 'rail-balc', a: [13.7, 10], b: [26, 10], y: 3.6, kind: 'glass' },            // balcony void edge
  { id: 'rail-swell-mid-s', a: [26.5, 16.2], b: [31.5, 16.2], y: 2.16, kind: 'steel' },  // mid landing south edge
  { id: 'rail-swell-mid-n', a: [28.1, 14.36], b: [29.9, 14.36], y: 2.16, kind: 'steel' },// mid landing north gap
  { id: 'rail-swell-top-s', a: [28.1, 12.12], b: [29.9, 12.12], y: 3.6, kind: 'steel' }, // top landing center gap
];

/** Sloped stair guards: colliders + visuals following the run. */
export const STAIR_GUARDS: { id: string; x0: number; z0: number; x1: number; z1: number; dir: '+z' | '-z'; y0: number; y1: number; kind: 'glass' | 'steel' }[] = [
  { id: 'sg-lobby', x0: 13.7, z0: 10.4, x1: 13.7, z1: 16.0, dir: '-z', y0: 0, y1: 3.6, kind: 'glass' },
  { id: 'sg-c1', x0: 29.9, z0: 11.0, x1: 29.9, z1: 14.36, dir: '+z', y0: 0, y1: 2.16, kind: 'steel' },
  { id: 'sg-c2', x0: 28.1, z0: 12.12, x1: 28.1, z1: 14.36, dir: '-z', y0: 2.16, y1: 3.6, kind: 'steel' },
];

// ---------------------------------------------------------------------------
// Gameplay zones, spawns, patrols, checkpoints
// ---------------------------------------------------------------------------
export const ZONES: ZoneSpec[] = [
  { id: 'extraction', rect: [38, 32.5, 46.5, 37.4], y: 0, name: 'Extraction Zone' },
  { id: 'hostageA', rect: [43, 13, 47, 17], y: 0, name: 'Server Room' },
  { id: 'hostageB', rect: [35, 12, 41, 16], y: 3.6, name: 'Conference Room' },
];

export const SPAWNS = {
  player: { pos: [9, 0, 2.2] as [number, number, number], yaw: Math.PI }, // facing +Z (south, toward entrance)
  hostageA: { pos: [44.6, 0, 15.8] as [number, number, number], yaw: Math.PI * 0.5, room: 'server' as RoomId },
  hostageB: { pos: [38.2, 3.6, 14.2] as [number, number, number], yaw: -Math.PI * 0.5, room: 'conference' as RoomId },
};

export const PATROLS: PatrolRoute[] = [
  { id: 'p-lobby', floorY: 0, points: [[17, 9], [23, 9], [23.5, 15], [15, 15.5], [13.5, 10]] },
  { id: 'p-ncorr', floorY: 0, points: [[28, 8], [46, 8]] },
  { id: 'p-mainhall', floorY: 0, points: [[14, 19.5], [30, 19.5], [46, 19.5]] },
  { id: 'p-cubicles', floorY: 0, points: [[22, 23], [34, 23], [34, 36], [22, 36], [22, 29.5], [33, 29.5]] },
  { id: 'p-cub-short', floorY: 0, points: [[24, 26], [32, 26], [32, 33], [24, 33]] },
  { id: 'p-itserver', floorY: 0, points: [[51, 8.5], [51, 13.5], [45, 13.5], [45, 12]] },
  { id: 'p-loading', floorY: 0, points: [[42, 23], [46, 27], [43, 33], [47, 36]] },
  { id: 'p-garage', floorY: 0, points: [[39, 32], [48, 32], [48, 36], [39, 36]] },
  { id: 'p-waiting', floorY: 0, points: [[14, 23], [18, 24], [16, 30], [14, 28]] },
  { id: 'p-upper', floorY: 3.6, points: [[28, 8], [42, 8], [42, 8.5]] },
  { id: 'p-conference', floorY: 3.6, points: [[34, 12], [42, 12], [42, 16], [34, 16]] },
  { id: 'p-balcony', floorY: 3.6, points: [[15, 8], [24, 8], [24, 9], [15, 9]] },
  { id: 'p-records', floorY: 3.6, points: [[8, 8], [10, 12], [8, 17], [10, 19]] },
  { id: 'p-service', floorY: 0, points: [[51, 18], [51, 28], [52, 33], [52, 36]] },
];

export const CHECKPOINTS: Record<string, { pos: [number, number, number]; yaw: number; pitch?: number }> = {
  spawn: { pos: [9, 0, 2.2], yaw: Math.PI },
  entrance: { pos: [9, 0, 7.4], yaw: Math.PI },
  vestibule: { pos: [9, 0, 11.5], yaw: Math.PI * 0.75 },
  security: { pos: [9, 0, 17], yaw: Math.PI * 0.5 },
  lobby: { pos: [19, 0, 13], yaw: 0.4 },
  lobbystair: { pos: [13.2, 0, 17], yaw: 0.1 },
  balcony: { pos: [19, 3.6, 8], yaw: -1.2 },
  records: { pos: [9, 3.6, 12], yaw: 0 },
  execcorr: { pos: [30, 3.6, 8], yaw: -Math.PI / 2 },
  conference: { pos: [38, 3.6, 14], yaw: Math.PI / 2 },
  exec: { pos: [49, 3.6, 12], yaw: 0.6 },
  stairwell: { pos: [29, 0, 16.5], yaw: 0 },
  stairtop: { pos: [29, 3.6, 10.6], yaw: Math.PI },
  ncorr: { pos: [30, 0, 8], yaw: -Math.PI / 2 },
  restrooms: { pos: [34, 0, 14], yaw: 0 },
  janitor: { pos: [41, 0, 13], yaw: 0 },
  itroom: { pos: [51, 0, 10], yaw: Math.PI },
  server: { pos: [45, 0, 14], yaw: 0.8 },
  mainhall: { pos: [16, 0, 19.5], yaw: -Math.PI / 2 },
  waiting: { pos: [16, 0, 23.5], yaw: Math.PI },
  breakroom: { pos: [16, 0, 29.5], yaw: Math.PI * 0.9 },
  wellness: { pos: [16, 0, 35.5], yaw: Math.PI * 0.5 },
  cubicles: { pos: [28, 0, 29.5], yaw: Math.PI * 0.5 },
  copy: { pos: [38, 0, 25.5], yaw: Math.PI },
  loading: { pos: [44, 0, 25], yaw: Math.PI },
  garage: { pos: [43, 0, 34], yaw: Math.PI },
  servicecorr: { pos: [51, 0, 23], yaw: Math.PI },
  mech: { pos: [52, 0, 34], yaw: Math.PI * 0.7 },
  courtyard: { pos: [16, 0, 3], yaw: Math.PI * 1.25 },
};

export const MAP_BOUNDS = { minX: -6, minZ: -8, maxX: 62, maxZ: 46 };

/** Rooms lookup by point (for HUD room display, audio zones, AI). */
export function roomAt(x: number, y: number, z: number): RoomId | null {
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) {
      const fy = r.floorY;
      if (y >= fy - 0.5 && y <= fy + 2.8) return r.id;
    }
  }
  return null;
}
