/**
 * "Al-Rashid Crossing" — the map plan.
 *
 * Everything downstream reads its coordinates from here so the layout can be
 * reasoned about in one place. The map is a classic three-lane design turned so
 * the lanes run north–south along Z, which matters for more than symmetry: the
 * signature light is a six-degree sun sitting almost due west, so lanes running
 * north–south are raked across their width. One side of every street burns
 * ochre, the other falls into cool shadow, and the two east–west cross streets
 * become shafts of gold aimed straight out to sea.
 *
 *                         NORTH  (-Z, the town gate)
 *      x -47      -34    -26     -8      +8      +22   +28        +50
 *   z  ├─────┬──────┬──────┬──────┬───────┬───────┬──────┬─────────┤
 *  -70 │ ░░░░ rubble barricade ░░░░ TOWN GATE ░░░░ collapsed block │
 *  -62 ├─────┼──────┼──────┼──────┼───────┼───────┼──────┼─────────┤
 *      │ sea │ west │ SOUK │ west │MARKET │ east  │ALLEY │ boundary│
 *      │wall │ shops│ARCADE│ block│STREET │ block │      │  blocks │
 *  -24 ├─────┴──────┴──────┴──────┴───────┴───────┴──────┴─────────┤
 *  -16 │  ◄──────────────── CROSS STREET A ─────────────────────►  │
 *      ├─────┬──────┬──────┬──────┬───────┬───────┬──────┬─────────┤
 *      │ sea │ west │ SOUK │ café │MARKET │ east  │ALLEY │  VILLA  │
 *      │wall │ shops│ARCADE│ block│ fount.│ block │      │ compound│
 *  +16 ├─────┴──────┴──────┴──────┴───────┴───────┴──────┴─────────┤
 *  +24 │  ◄──────────────── CROSS STREET B ─────────────────────►  │
 *      ├─────┬──────┬──────┬──────┬───────┬───────┬──────┬─────────┤
 *      │ sea │ west │ SOUK │ west │MARKET │garage │ALLEY │courtyard│
 *      │wall │ shops│ARCADE│ block│  bus  │ block │      │         │
 *  +62 ├─────┴──────┴──────┴──────┴───────┴───────┴──────┴─────────┤
 *  +70 │ ░░░░░ rubble barricade / collapsed apartments ░░░░░░░░░░░ │
 *      └───────────────────────────────────────────────────────────┘
 *                        SOUTH  (+Z, enemy approach)
 */

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 });

export const rectCenterX = (r: Rect): number => (r.x0 + r.x1) * 0.5;
export const rectCenterZ = (r: Rect): number => (r.z0 + r.z1) * 0.5;
export const rectWidth = (r: Rect): number => r.x1 - r.x0;
export const rectDepth = (r: Rect): number => r.z1 - r.z0;

export function rectContains(r: Rect, x: number, z: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
}

/** Deterministic seed for the whole level. */
export const WORLD_SEED = 0x5ea51de;

/* ------------------------------- extents -------------------------------- */

export const MAP = {
  /** Playable extents; outside this the player meets rubble, wall or water. */
  minX: -46,
  maxX: 50,
  minZ: -66,
  maxZ: 66,
  /** Where the collision shell and the boundary skyline live. */
  outerMinX: -80,
  outerMaxX: 78,
  outerMinZ: -92,
  outerMaxZ: 92,
} as const;

/* -------------------------------- lanes --------------------------------- */

/** Sea wall coping runs along this line; water is west of it. */
export const SEA_WALL_X = -46.6;
export const SEA_LEVEL = -2.9;
/** Promenade between the sea wall and the first row of shops. */
export const CORNICHE = rect(-46.4, -66, -40, 66);

/** Left lane: the covered souk. Eight metres wide, roofed for most of its run. */
export const SOUK = rect(-34, -60, -26, 58);
export const SOUK_CENTER_X = -30;

/** Centre lane: the market street. */
export const MARKET = rect(-8, -62, 8, 62);
export const MARKET_CENTER_X = 0;
/** Carriageway; kerbs and pavement sit outside it. */
export const ROAD = rect(-5.6, -62, 5.6, 62);

/** Right lane: the alley that serves the walled compound. */
export const ALLEY = rect(22, -52, 28, 56);
export const ALLEY_CENTER_X = 25;

/* ---------------------------- cross streets ------------------------------ */

export const CROSS_A = rect(-46, -24, 50, -16);
export const CROSS_B = rect(-46, 16, 50, 24);
export const CROSS_A_CENTER_Z = -20;
export const CROSS_B_CENTER_Z = 20;

/* -------------------------------- blocks --------------------------------- */

/** Single-storey shop row backing onto the corniche. */
export const WEST_SHOPS = rect(-40, -60, -34, 58);
/** Deep block between the souk and the market street. */
export const WEST_BLOCK = rect(-26, -60, -8, 60);
/** Block between the market street and the alley. */
export const EAST_BLOCK = rect(8, -58, 22, 58);

/* ------------------------------- compound -------------------------------- */

export const COMPOUND = rect(28, -16, 49, 26);
export const COMPOUND_WALL = 0.5;
export const VILLA = rect(32.5, -12, 46.5, 5);
export const COURTYARD = rect(28.5, 5.5, 48.5, 25.5);
/** Gate in the compound's west wall. */
export const COMPOUND_GATE_Z = 15.5;

/* ------------------------- named interior spaces -------------------------- */

/** Two-storey corner café fronting the market street's west side. */
export const CAFE = rect(-20, -13, -8, 1);
/** Bombed-out apartment block on the market street's east side. */
export const APARTMENT = rect(8, -38, 21, -25);
/** Workshop with a roller door onto the market street. */
export const GARAGE = rect(8, 29, 21, 44);
/** Small shop opening off the souk arcade. */
export const SOUK_SHOP = rect(-40, -5, -34, 6);

/* ------------------------------ landmarks -------------------------------- */

export const FOUNTAIN = { x: 0, z: 3, radius: 3.1 };
export const GATE_Z = -61;
export const BUS = { x: 1.6, z: 38, yaw: 0.14 };
export const TECHNICAL = { x: -1.8, z: -33, yaw: -0.35 };

/* --------------------------- storey heights ------------------------------- */

export const STOREY = 3.35;
export const PARAPET_H = 0.95;
export const KERB_H = 0.16;

/* ------------------------------ cell grid --------------------------------- */

/**
 * Merge cells. Coarse on purpose. At 140 m across almost every cell is inside
 * the view frustum from anywhere a player can stand, so a fine grid buys very
 * little culling and costs a draw call per material per cell — which is the
 * budget the whole level has to fit inside. The grid exists mainly to give
 * level-of-detail and interior culling something to switch.
 */
export const CELL_SIZE = 80;

export function cellFor(x: number, z: number): string {
  return `c${Math.floor((x - MAP.outerMinX) / CELL_SIZE)}_${Math.floor(
    (z - MAP.outerMinZ) / CELL_SIZE,
  )}`;
}
