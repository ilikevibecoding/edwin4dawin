// Canonical Venator-class dimensions, derived from the reference stills and the DK cutaway (length 1137 m,
// wingspan 548 m, height 268 m). Everything is in metres; `zr` is the distance aft of the bow tip, ship
// forward is -Z, up +Y, origin at the hull centre. The functions here are the single source of truth for
// the hull plan, the vertical profile, the deck markings and the placement of the big masses; the
// geometry modules read them so the silhouette matches from the top, side and front.
import { lin, pw } from "./venatorKit.js";

export const VENATOR = { length: 1137, width: 548, height: 268 };
export const L = VENATOR.length;
export const zBow = -L / 2;
export const Z = (zr) => zBow + zr;

// ---- palette (linear albedo multipliers on the plating map, see shipKit: 0.9 ~ light grey-white,
// 0.35 ~ dark grey). The hull is a light neutral grey (the reference render's sunlit deck reads ~175
// sRGB), the tower and block sides a very dark cool grey, the lower hull dark, nothing cream.
export const GREY_DECK = lin(0.34, 0.345, 0.36); // dorsal deck, doors, tower fronts, bridge heads
export const GREY_WING = lin(0.3, 0.305, 0.32); // shoulder wings, terraces
export const GREY_TOWER = lin(0.27, 0.275, 0.29); // terrace walls, step blocks
export const GREY_SIDE = lin(0.07, 0.074, 0.098); // block and shaft sides (near-black blue-grey)
export const GREY_FLANK = lin(0.23, 0.235, 0.25); // deck lip, lower lip faces
export const GREY_LOWER = lin(0.15, 0.155, 0.185); // angled lower hull
export const GREY_BELLY = lin(0.14, 0.145, 0.17); // belly
export const GREY_STERN = lin(0.17, 0.165, 0.16); // heat-stained stern armour
export const DARK = 0xb4b8be; // machinery greebles on the dark texture
export const DARK_RECESS = 0x6a6e76; // hangar interiors, nozzle bells
export const DARK_TRENCH = 0x4c505a; // flank trench walls and floor
export const DARK_SEAM = 0x62656c; // panel-line grooves
export const RED = 0x5c0e12; // Republic crimson, deep (door strips, bow wedge, shoulder stripes)
export const RED_DARK = 0x460a0e; // shadowed red (door front steps)
export const INSIGNIA = 0xb8963f; // Open Circle emblem (muted gold)
export const WINDOW_WARM = 0xffe2b0;
export const WINDOW_COOL = 0xd6e6ff;
export const ROW_WARM = 0xd8bc90; // long window rows stay under the bloom threshold
export const ROW_COOL = 0xb4c4e0;
export const HANGAR_WARM = 0xffd9a0;
export const HANGAR_BLUE = 0x9cc8ff;

// ---- plan view: straight arrowhead taper to the shoulders, near-parallel flanks aft, slight stern taper
export const halfW = (zr) =>
  zr <= 830
    ? 70 + 204 * (zr / 830)
    : zr <= 1040
      ? 274
      : 274 - 30 * ((zr - 1040) / 97);

// ---- side view: flat deck aft of zr 300 dipping toward the prong tips; the keel is a shallow wedge
// (hull 94 m thick at the stern; the tower structure above the deck is twice that, as in the stills)
export const yTop = (zr) =>
  pw(
    [
      [0, 24],
      [96, 32],
      [300, 40],
      [L, 40],
    ],
    zr,
  );
export const yBot = (zr) =>
  pw(
    [
      [0, -8],
      [96, -20],
      [300, -34],
      [700, -48],
      [1000, -54],
      [L, -54],
    ],
    zr,
  );
export const DECK_Y = 40;

// ---- bow: two chunky prongs either side of a short notch
export const NOTCH_HALF = 18;
export const NOTCH_DEPTH = 92;
export const PRONG_END = 96; // where the prongs merge into the wedge

// ---- dorsal deck layout. Wing = the grey strip between the door edge and the deck edge (constant, so
// the red strips converge toward the nose as the deck narrows). Each door half is red over its outer
// ~85 % with a grey margin inboard; together with the centre strip that gives the grey middle band.
export const WING = 58;
export const CENTRE_HALF = 24; // grey centre strip between the door halves
export const DOOR_INNER = 0.15; // grey fraction of each door half, inboard side
export const DOOR_Z0 = 275;
export const DOOR_Z1 = 800;
export const DOOR_H = 2; // doors stand a little proud of the wings
export const WEDGE_Z0 = 106; // bow wedge red panels
export const WEDGE_Z1 = 247;
export const WEDGE_BORDER = 30; // grey border outside the wedge red
export const doorEdge = (zr) => halfW(zr) - WING; // outer edge of the door halves / red strips
export const inDoors = (zr) => zr > DOOR_Z0 + 0.005 && zr < DOOR_Z1 + 0.005;
// inner edge of the red door strip (closed doors); the open variant clamps it outside the bay
export const redInner = (zr, open = false) =>
  Math.max(
    CENTRE_HALF + DOOR_INNER * (doorEdge(zr) - CENTRE_HALF),
    open ? BAY_HALF + 3 : 0,
  );

// open variant: the doors part over a lit bay this wide/deep
export const BAY_HALF = 54;
export const BAY_DEPTH = 58;
// closed variant: a narrow dark seam between the halves
export const SEAM_HALF = 3;
export const SEAM_DEPTH = 3;

// ---- flank steps (relative to the local hull thickness so the bow stays a clean wedge)
export function flankSteps(zr) {
  const yt = yTop(zr);
  const yb = yBot(zr);
  const T = yt - yb;
  const lipH = Math.min(7, 0.08 * T);
  const trenchH = Math.min(32, 0.36 * T);
  const lowLipH = Math.min(6, 0.07 * T);
  const recess = Math.min(16, 0.18 * T);
  const yLipBot = yt - lipH;
  const yTrBot = yLipBot - trenchH;
  const yLowBot = yTrBot - lowLipH;
  return {
    yt,
    yb,
    T,
    lipH,
    trenchH,
    lowLipH,
    recess,
    yLipBot,
    yTrBot,
    yLowBot,
  };
}
export const bellyHalf = (zr) => halfW(zr) * 0.52;

// ---- ventral hangar: a long lit slot under the bow
export const VENT_Z0 = 118;
export const VENT_Z1 = 335;
export const VENT_HALF = 34;
export const VENT_DEPTH = 22;
export const inVent = (zr) => zr > VENT_Z0 + 0.005 && zr < VENT_Z1 + 0.005;

// ---- shoulders: raised wing plates with the red stripes, heavy turret row along the door edge
export const SHOULDER_Z0 = 690;
export const SHOULDER_Z1 = 826;
export const TURRET_ZR = [292, 445, 600, 755];
export const turretX = (zr) => doorEdge(zr) + 14; // barbettes straddle the red strip's outer edge
export const SHOULDER_X0 = (zr) => doorEdge(zr) + 34; // shoulder plate: outboard of the turret row
export const SHOULDER_X1 = (zr) => halfW(zr) + 3; // ...overhanging the deck edge a little

// ---- rear superstructure (zr) and the twin towers
// Heights are metres above the deck through up(); TOWER_SCALE stretches the whole tower stack. The
// data-file height (268 m) matches the Clone Wars model (heads ~160 m above the deck); the user's
// reference render has them ~250 m up. At scale 1 the heads top out 232 m above the deck (y 272,
// 326 m keel to head, 340 m to the sensor blocks) - between the two, biased toward the reference render.
// Measured in the reference render, against the 548 m deck: block base ~140 m wide narrowing to the two
// shafts (~40 m each, ~26 m gap), block height ~= shaft height, heads ~2x the shaft depth, projecting
// forward; the block front slopes ~65 degrees and the shafts continue it a little steeper.
export const TOWER_SCALE = 1;
export const up = (h) => DECK_Y + h * TOWER_SCALE;
export const BLOCK = {
  t1: { z0: 806, z1: 1126, y1: up(16), inset: 88 }, // lower terrace, |x| <= halfW - inset
  t2: { z0: 878, z1: 1108, y1: up(38), hx: 124 }, // upper terrace
  // the sloped-front block joining the towers: foot at the deck just aft of the doors, top level with
  // the shaft feet; front slope ~65 degrees, sides leaning in slightly (they continue into the shafts)
  base: { z0: 812, z1: 972, zTop0: 864, y1: up(112), hx0: 74, hx1: 54 },
  // stepped superstructure behind the towers, down toward the stern
  steps: [
    { z0: 972, z1: 1030, y1: up(86), hx: 62 },
    { z0: 1030, z1: 1085, y1: up(60), hx: 82 },
  ],
};
export const TOWER = {
  x: 33, // shaft centres at +-x
  z0: 894, // shaft base centre (zr): front flush with the block's top front edge
  lean: 27, // aft shift of the shaft centre over its height (~74 degree front)
  y0: up(112),
  y1: up(206), // shaft top
  hx0: 20,
  hz0: 30, // half sizes at the base
  hx1: 17,
  hz1: 26, // half sizes at the top
  headY0: up(206),
  headY1: up(232),
  headHx: 30, // heads 1.5x the shaft width, 6 m apart (the reference heads nearly touch)
  headHz: 50, // T-head half sizes (front rounded), the head runs 100 m fore-aft
  headZ: 897, // head centre (zr): rear flush with the shaft top, nose 48 m ahead of it
  sensorY1: up(246),
};

// ---- stern engine bank: [x, y, r] four mains, two medium outboard, four small above
export const ENGINES = [
  [-124, -14, 27],
  [-42, -14, 27],
  [42, -14, 27],
  [124, -14, 27],
  [-196, -10, 16],
  [196, -10, 16],
  [-92, 22, 9],
  [-31, 22, 9],
  [31, 22, 9],
  [92, 22, 9],
];
export const STERN_ZR = L;

// ---- ventral bays (zr0, zr1, x0, x1): recessed dark machinery bays under the mid hull
export const BELLY_BAYS = [
  [520, 640, 34, 92],
  [720, 850, 52, 120],
];

// soot and heat toward the stern: darker and warmer past zr 900
export function sootAt(z) {
  const k = Math.min(1, Math.max(0, (z - Z(900)) / (Z(L) - Z(900))));
  const kk = k * k;
  return [1 - 0.3 * kk, 1 - 0.34 * kk, 1 - 0.4 * kk];
}
