// Canonical Venator-class dimensions (length 1137 m, wingspan ~548 m) matched against the user's
// reference render through a camera fitted to it (rms 3 px on 31 landmarks: nose face, ramp foot and
// top, shaft and head edges, the centre seam along the deck, roundels, wing corners; ~1770 m away, 10
// degrees to port of the bow, 4 degrees up, 14.4 degree FOV). Measured there and built here:
//  - plan: a straight arrowhead from the 44 m blunt nose to the 524 m wing corners at 0.81 L (a gentle
//    kink at 0.53 L), the deck edge silhouette back-projected onto the deck plane;
//  - the red door band is a raised slab: both halves red with a narrow dark seam, 57 m wide where it
//    leaves the flat bow deck at 0.22 L, 86 m wide and 19.5 m above the wings where it meets the block
//    at 0.56 L (its side walls carry window rows), the turret shelves continue its slope aft;
//  - the block: a 43 m plated ramp at 48 degrees from the sill to a roof 105 m over the wings, with
//    steep light "legs" under the shafts flanking it and dark sides; the two shafts 12.4 m wide with a
//    33 m gap, 43 m tall; the heads are light hammerheads 28 m wide (2.3 shaft widths), 24 m tall and
//    140 m long, overhanging the shafts on every side and by 46 m to the front, with a dark window
//    band under the top slab and a chin tapering back into the shaft; a dark sensor block, light drum
//    and mast on top over the rear half (262 m keel to mast).
// Everything is in metres; `zr` is the distance aft of the bow tip, ship forward is -Z, up +Y, origin at
// the hull centre. These functions are the single source of truth for the plan, the vertical profile,
// the deck markings and the placement of the big masses; the geometry modules read them so the
// silhouette matches from every view.
import { lin, pw, clamp } from "./venatorKit.js";

export const VENATOR = { length: 1137, width: 548, height: 262 };
export const L = VENATOR.length;
export const zBow = -L / 2;
export const Z = (zr) => zBow + zr;

// ---- palette (linear albedo multipliers on the plating map, see shipKit: the map is scaled x1.4 to a
// mean albedo of ~0.62). The reference model is one warm light grey all over (deck 135-160 sRGB where
// the low sun grazes it, the roof 177, the ramp 195, every forward face blown out to 250; the port
// faces are black only because they are in shadow) with dark paint nowhere but inside recesses and
// openings, and a deep crimson on the doors (half the deck's sRGB). So: one hull grey on the deck,
// wings, roof, block sides, shaft and head sides, legs and steps; a near-white on the surfaces the
// reference blows out (nose, shaft / head fronts, pods); the ramp between; dark only in recesses.
export const GREY_HULL = lin(0.46, 0.445, 0.385); // deck, wings, roof, block / shaft / head sides
export const GREY_DECK = GREY_HULL;
export const GREY_WING = GREY_HULL;
export const GREY_TOWER = GREY_HULL;
export const GREY_LIGHT = lin(1.02, 1.0, 0.9); // nose block, shaft / head / leg fronts, pods (just under bloom)
export const GREY_RAMP = lin(0.7, 0.675, 0.59); // the block's plated front ramp (lit, not blown out)
export const GREY_BLOCK = lin(0.3, 0.29, 0.25); // block body sides, pedestal, steps (hull grey, shaded)
export const GREY_SIDE = lin(0.36, 0.35, 0.31); // shaft, head and leg sides (hull grey, shaded)
export const GREY_FLANK = lin(0.46, 0.445, 0.4); // deck lip face, band walls, barbettes, trims, sill
export const GREY_SHELF = lin(0.33, 0.32, 0.28); // turret shelf tops (the reference's read darker)
export const GREY_LOWER = lin(0.36, 0.36, 0.37); // angled lower slab (shadowed flank 60-80 sRGB)
export const GREY_BELLY = lin(0.3, 0.3, 0.33); // belly
export const GREY_STERN = lin(0.34, 0.33, 0.32); // heat-stained stern armour
export const GREY_RECESS = lin(0.13, 0.13, 0.15); // recesses and openings (hull material)
export const DARK = 0xb4b8be; // machinery greebles on the dark texture
export const DARK_RECESS = 0x6a6e76; // hangar interiors, nozzle bells
export const DARK_TRENCH = 0x50545c; // flank trench walls and floor (dark material)
export const DARK_SEAM = 0x5a5d64; // panel-line grooves
export const RED = lin(0.115, 0.006, 0.007); // Republic crimson-maroon (door band, bow stripes, trim)
export const RED_DARK = lin(0.095, 0.005, 0.006); // shadowed red
export const INSIGNIA = 0xc9a23a; // Open Circle roundel (gold)
export const WINDOW_WARM = 0xffe2b0;
export const WINDOW_COOL = 0xd6e6ff;
export const ROW_WARM = 0xd8bc90; // long window rows stay under the bloom threshold
export const ROW_COOL = 0xb4c4e0;
export const HANGAR_WARM = 0xffd9a0;
export const HANGAR_BLUE = 0x9cc8ff;

// ---- plan view: a straight arrowhead from the 44 m nose to the 524 m wing corners at 0.81 L, the
// taper steepening a little behind 0.53 L, then a slight taper to the stern
export const CORNER_ZR = 925;
export const halfW = (zr) =>
  pw(
    [
      [0, 22],
      [600, 150],
      [CORNER_ZR, 262],
      [L, 240],
    ],
    zr,
  );

// ---- side view: a thin hull; the nose block is 18 m tall, the wing-level deck rises from +30 at the
// nose to the flat +45 deck by 0.22 L, the keel drops to -30 at the stern (75 m thick there)
export const yTop = (zr) =>
  pw(
    [
      [0, 30],
      [90, 35],
      [250, 45],
      [L, 45],
    ],
    zr,
  );
export const yBot = (zr) =>
  pw(
    [
      [0, 2],
      [90, -3],
      [300, -12],
      [600, -18],
      [CORNER_ZR, -28],
      [L, -30],
    ],
    zr,
  );
export const DECK_Y = 45;
export const up = (h) => DECK_Y + h;

// ---- nose: a single blunt light block (the reference bow has no notch) carrying two triplets of round
// emitters; the deck slab above it is set back a little; the hull loft starts behind it at z1
export const NOSE = {
  hx: 22,
  y0: 2,
  y1: 20,
  z1: 10,
  cans: [6, 11, 16],
  canX: 17,
  canR: 2.4,
};

// ---- dorsal deck layout. The red door band is a raised slab down the centre: its half-width grows
// linearly from 20 m at the nose to 43 m at the block's foot (0.56 L); on the bow deck (zr 20-250) the
// red lies flat as one wedge down to the nose block; from 0.22 L the band rises on vertical side walls
// to 19.5 m over the wings at the sill. Both halves are red up to a 1.5 m grey lip along the walls and
// a hairline dark seam down the middle. The wings outboard stay at deck level.
export const DOOR_Z0 = 250; // the band leaves the flat bow deck here
export const DOOR_Z1 = 640; // 0.56 L: the sill at the block's foot
export const BAND_H = 19.5; // band top over the wings at the sill
export const LIP = 1.5; // grey lip along the band's outer edges
export const bandHalf = (zr) => 19.3 + 0.037 * zr; // 28.5 at 0.22 L, 43 at the sill
export const bandRise = (zr) => (BAND_H * (zr - DOOR_Z0)) / (DOOR_Z1 - DOOR_Z0);
export const bandH = (zr) => clamp(bandRise(zr), 0, BAND_H);
export const bandTop = (zr) => yTop(zr) + bandH(zr);
export const SILL_Y = up(BAND_H); // the band top where it meets the block
export const WEDGE_Z0 = 20; // bow stripes start over the nose block ...
export const WEDGE_Z1 = DOOR_Z0; // ... and run straight into the band
export const doorEdge = bandHalf; // foot of the band's side wall
export const redOuter = (zr) => bandHalf(zr) - LIP;
// the two red halves meet at the seam all the way to the nose (the reference's bow wedge is one red
// field with a hairline down the middle; no grey between the stripes)
export const centreHalf = () => SEAM_HALF + 0.05;
export const inDoors = (zr) => zr > DOOR_Z0 + 0.005 && zr < DOOR_Z1 + 0.005;
export const inWedge = (zr) => zr > WEDGE_Z0 + 0.005 && zr < WEDGE_Z1 + 0.005;
// deck height at (x, zr): the raised band inside the door zone, the wing level elsewhere
export function deckY(x, zr) {
  if (inDoors(zr) && Math.abs(x) < bandHalf(zr)) return bandTop(zr);
  return yTop(zr);
}
// closed variant: a thin dark seam between the halves (a hairline in the reference)
export const SEAM_HALF = 0.6;
export const SEAM_DEPTH = 1.5;
// open variant: the doors part over a lit bay this wide (clamped inside the band) / deep
export const BAY_HALF = 24;
export const BAY_DEPTH = 50;
export const bayHalf = (zr) => Math.min(BAY_HALF, redOuter(zr) - 7);
// inner edge of the red door strip (closed doors); the open variant clamps it outside the bay
export const redInner = (zr, open = false) =>
  Math.max(centreHalf(zr), open ? bayHalf(zr) + 3 : 0);
export const ROUNDEL_ZR = 478; // 0.42 L, on the wings 48 m outboard of the band
export const roundelX = () => 85;

// ---- flank steps (relative to the local hull thickness so the bow stays a clean wedge): one deck lip,
// a dark recessed machinery trench directly under it, then the lower slab leaning in to the belly
export function flankSteps(zr) {
  const yt = yTop(zr);
  const yb = yBot(zr);
  const T = yt - yb;
  const lipH = Math.min(4, 0.09 * T);
  const trenchH = Math.min(14, 0.26 * T);
  const recess = Math.min(11, 0.2 * T);
  const yLipBot = yt - lipH;
  const yTrBot = yLipBot - trenchH;
  return { yt, yb, T, lipH, trenchH, recess, yLipBot, yTrBot };
}
export const bellyHalf = (zr) => halfW(zr) * 0.5;

// ---- ventral hangar: a long lit slot under the bow
export const VENT_Z0 = 110;
export const VENT_Z1 = 330;
export const VENT_HALF = 26;
export const VENT_DEPTH = 14;
export const inVent = (zr) => zr > VENT_Z0 + 0.005 && zr < VENT_Z1 + 0.005;

// ---- rear superstructure (zr) and the twin towers. Heights are absolute y (wing deck +45).
// Turret shelves: one per side from 0.51 L (a front step) to the block's rear at 0.83 L, from the
// block's foot out to x 98, their tops continuing the band's slope 3 m below it (the band's wall shows
// as a dark step beside the red); the four heavy turrets per side stand on them at x +-85.
// The block: a 43 m wide plated ramp rising at 48 degrees from the sill to a 39 m wide roof 105 m over
// the wings at 0.63 L, its body's sides shaded; under each shaft a steep light "leg" runs from the
// roof down to the shelf, flaring outboard, so the shaft lines continue to the deck with the body's
// dark side showing as a triangle between leg and ramp. Shafts 12.4 m wide, 90 m deep, 43 m tall,
// centred at +-22.5 (a 33 m gap), standing on the roof. Heads: light hammerheads 28 m wide, 24 m tall,
// 140 m long overhanging the shafts (46 m to the front) with a dark window band and a chin; a low bridge
// deck between the shafts; a dark sensor block, light drum and mast on each head (262 m keel to mast).
// Behind the shafts the block steps down aft in terraces (AFT) to the stern hangar; the shelves slope
// down to the deck behind the block.
export const PLATFORM = {
  z0: 580, // front step
  z1: 940, // the shelf top ends here ...
  tail: 48, // ... and slopes down to the wing deck over this length (the aft shoulders)
  xIn: 21, // inner edge, buried in the band / the block's foot
  xOut: 98,
  drop: 3, // shelf top below the band's top line
};
// shelf top height (absolute y) at zr: the band's slope continued aft
export const platY = (zr) => yTop(zr) + bandRise(zr) - PLATFORM.drop;
export const BLOCK = {
  base: {
    z0: 640, // sill front
    zFoot: 642, // ramp foot
    zTop0: 718, // roof front edge
    z1: 896, // back at the top: the aft terraces start right behind the shafts
    z1Foot: 905, // back at the foot (buried in the aft body)
    yFoot: SILL_Y, // the ramp starts on the band's top
    y1: up(105), // roof
    hxSill: 26.5,
    hxFoot: 21.7,
    hx1: 19.5,
  },
  // steep light legs under the shafts: plan at the roof (the shaft's footprint) and at the shelf
  legs: {
    xInTop: 16.3,
    xOutTop: 28.7,
    zTop: 792,
    xInFoot: 20,
    xOutFoot: 40,
    zFoot: 835,
    z1Foot: 940, // the rear face leans forward from the shelf ...
    z1Top: 900, // ... to the roof, an aft shoulder beside the terraces
  },
  // low light bridge deck joining the shafts behind their fronts, seen through the gap between them,
  // with a dark hood on top (the sky shows through the rest of the gap)
  bridge: { z0: 812, z1: 850, y1: up(118), hx: 15.5, hoodH: 7 },
};
// aft body behind the shafts: one loft of [zr, top half-width, top y] sections — three sloped risers with
// short flat treads between (36 degree risers, 28 degrees overall, widening as it descends) down to a stern shelf, then the aft
// foot face carrying the dark stern hangar mouth above the engine bank; the wing deck runs on to the
// stern behind it
export const AFT = {
  sections: [
    [896, 19.5, up(105)],
    [930, 23, up(80)],
    [948, 25, up(80)],
    [982, 30, up(56)],
    [1000, 32, up(56)],
    [1034, 37, up(32)],
    [1085, 40, up(32)],
  ],
  batter: 0.3, // the side walls lean out toward the deck this much per metre of height (sloped shoulders)
  hangar: { hx: 28, y0: up(1.5), y1: up(25), depth: 30 },
};
export const TOWER = {
  x: 22.5, // shaft centres at +-x
  hx: 6.2, // shaft half-width (12.4 m)
  depth: 90, // shaft depth (z)
  zFront: 792, // shaft front face at the foot
  lean: 2, // aft shift of the shaft over its height
  y0: BLOCK.base.y1, // on the roof
  y1: up(148), // shaft top = head underside
  headX: 28, // head centres at +-x
  headHx: 14.2, // 28.4 m wide: a 27.6 m gap between the heads
  headY0: up(148), // head underside at the shaft top
  headY1: up(172), // top of the slab
  frontZ0: 746, // the head's front face, 46 m ahead of the shaft
  headZ1: 886, // its rear, 4 m behind the shaft
  visorY0: up(160), // the bevelled top slab runs from here up to headY1 ...
  band: 3.4, // ... over a dark recessed window band this tall along the front and around the corners
  bandDepth: 36, // how far the band wraps back along the sides
  chinHx: 9.5, // below the band a light chin, full width for chinLip, tapers to this half-width ...
  chinLip: 5, // ... on the shaft (the reference's jaw: square shoulders, then the rounded underside)
  chinDrop: 8, // at the front the chin hangs this far below the shaft top, sloping up to it
  sensor: { hx: 11.5, z0: 790, z1: 856, y1: up(178) }, // dark sensor block over the rear half
  drumR: 7, // light shallow drum on the sensor block
  drumZ: 812,
  mastY1: up(187), // overall height 262 m from the keel (-30)
};

// ---- shoulder stripes: four red stripes along the wings' aft outer corners (fore-aft, spaced across)
export const SHOULDER = {
  z0: 960,
  z1: 1020,
  inset: 12,
  pitch: 18.6,
  w: 9,
  n: 4,
};
// heavy turret row on the shelves
export const TURRET_ZR = [600, 690, 780, 870];
export const TURRET_R = 10;
export const TURRET_X = 85;
export const turretX = () => TURRET_X;

// ---- stern engine bank: [x, y, r] four mains, two medium outboard, four small above
export const ENGINES = [
  [-118, -4, 23],
  [-40, -4, 23],
  [40, -4, 23],
  [118, -4, 23],
  [-186, 0, 14],
  [186, 0, 14],
  [-88, 30, 8],
  [-30, 30, 8],
  [30, 30, 8],
  [88, 30, 8],
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
  return [1 - 0.22 * kk, 1 - 0.26 * kk, 1 - 0.3 * kk];
}
