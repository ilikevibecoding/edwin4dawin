// Arquitens-class light cruiser — dimensions, plan/height profiles and palette shared by the geometry
// modules. All profile functions take `zr` = metres aft of the prong tips (0 at the bow, 325 at the
// nacelle nozzles) and return metres. Heights are relative to the ledge datum (the base of the flank
// wall, where the red stripe band meets the belly, y = 0); `Y0` shifts the whole ship so the origin sits
// near the hull's mid-height. Ship forward is -Z: model z = zr - L / 2.
//
// Reference proportions (fan ortho + show stills, metres): kite hull 325 long, 125 wide at the deck
// shoulders (zr ~ 185), 142 over the nacelles; fork gap 11 m, a trench 7 m deep from the tips to the
// red wedge at zr ~ 100; hull 33 m deep at the shoulders (keel 12.5 under the ledge, wall 11.5, deck
// pyramid and spine 9 more); bridge head 28 wide, 10 tall, 22 long, its top 49.5 m above the keel line
// on a 4 m neck over the 23 m block; nacelles r 13 at x ±57.5 with their centres 8.5 m above the keel.
import { lin, pw } from "./venatorKit.js";

export const ARQUITENS = { length: 325, width: 142, height: 53 };
export const L = ARQUITENS.length;
export const Z = (zr) => zr - L / 2;
export const Y0 = -6;

// ---- plan (half-widths) -------------------------------------------------------------------------
// outer edge of the hull: a straight kite wedge from the blunt prong tips to the shoulders at ~57 %
// of the length, a small jog where the deck begins (zr ~ 105, the shoulder turret platforms), then
// the swept aft edge down to the waist and the narrow aft body that carries the centre nacelle
export const wOut = (zr) =>
  pw(
    [
      [0, 13],
      [100, 42],
      [108, 47],
      [124, 47.5],
      [182, 62.5],
      [190, 60],
      [230, 29],
      [240, 21.5],
      [272, 17.5],
    ],
    zr,
  );
export const ledgeW = (zr) =>
  pw(
    [
      [0, 1.6],
      [105, 2.6],
      [232, 3],
      [272, 2.5],
    ],
    zr,
  );
export const wallX = (zr) => wOut(zr) - ledgeW(zr);
export const SLOT_X = 5.5; // inner walls of the prongs (the fork is 11 m wide)
// the trench between the prongs: open through at the tips, then a dark floor 7 m below the prong
// tops running aft to the crotch ramp under the red wedge (zr 88–103)
export const TRENCH = { z0: 12, depth: 7, rampZ0: 88, rampZ1: 98 };
export const floorY = (zr) => wallTop(zr) - TRENCH.depth;
// raised central spine on the deck: 14 m wide with sloped red flanks, a light 5 m ridge along its
// crest and a dark groove along its base
export const SPINE_X = 7;
export const RIDGE_X = 2.6;
export const RIDGE_H = 0.8;
export const GROOVE_W = 2.2;

// ---- heights (ledge datum) -----------------------------------------------------------------------
// top of the flank wall (= prong tops forward): the show's wall band is a near-constant 10–12 m aft of
// the fork, lower on the thin prong tips; it falls away over the aft body to the small transom
export const wallTop = (zr) =>
  pw(
    [
      [0, 5.5],
      [60, 8.5],
      [105, 10],
      [185, 11.5],
      [232, 11],
      [272, 2],
    ],
    zr,
  );
// deck height at the spine base (the deck is a low pyramid ~4 m higher at the centreline than at the
// wall chamfer; it flattens onto the aft body's deck where the main loft hands over at zr 232)
export const deckC = (zr) =>
  pw(
    [
      [103, 11.3],
      [130, 12.8],
      [185, 15.5],
      [205, 15.5],
      [232, 12.2],
    ],
    zr,
  );
// spine raise above the deck: nothing forward of the red wedge block (zr 100–131) that is the
// spine's terminus, rising inside it to a 3 m step that grows to 4.5 m at the superstructure block
export const spineUp = (zr) =>
  pw(
    [
      [112, 0],
      [128, 3],
      [196, 4.5],
      [232, 4.5],
    ],
    zr,
  );
// keel depth of the main hull below the datum: the belly deepens gently aft (the ortho's keel line is
// straight while the deck climbs to the bridge), 12.5 m under the shoulders
export const keel = (zr) =>
  pw(
    [
      [103, 9.2],
      [150, 11.5],
      [185, 12.5],
      [230, 12.5],
      [240, 11],
      [250, 9.5],
      [262, 8],
      [272, 7.5],
    ],
    zr,
  );
// bottom of a prong (at its inner wall; meets the main hull's V at the junction)
export const keelP = (zr) =>
  pw(
    [
      [0, 4],
      [60, 7.5],
      [107, 9.2],
    ],
    zr,
  );

// ---- aft superstructure, bridge, nacelles -----------------------------------------------------------
// the spine runs into a low pedestal under the bridge neck (zr 196–215); right behind the head the
// hull steps up into the ramp block's crest (zr 221) and then runs down a long ramp to the transom
export const BLOCK = { z0: 196, z1: 232, top: 23, crest: 26.5, crestZ: 221 };
export const blockHalfW = (zr) =>
  pw(
    [
      [196, 8],
      [215, 8],
      [221, 11],
      [232, 15],
      [272, 13],
    ],
    zr,
  );
export const blockTop = (zr) =>
  pw(
    [
      [BLOCK.z0, deckC(BLOCK.z0) + spineUp(BLOCK.z0) + 0.4],
      [200, BLOCK.top],
      [215, BLOCK.top],
      [BLOCK.crestZ, BLOCK.crest],
      [272, 4],
    ],
    zr,
  );
export const RAMP_TOP = blockTop;
// raised deck rails: straight 8 m wide ridges with a light crest and red flanks running from the
// shoulders (right inboard of the chamfer where the deck begins) aft and inward into the flanks of
// the superstructure block, growing taller as they go; `xOut` is the outer foot's plan line
export const RAIL = {
  z0: 112,
  z1: 230,
  foot: 9,
  crest: 3,
  xOut: [
    [112, 39.5],
    [230, 22.5],
  ],
};
export const railH = (zr) =>
  pw(
    [
      [112, 2.4],
      [230, 4.4],
    ],
    zr,
  );
// T-shaped bridge: a boxy 12 m neck and the wide flat 28 m head (10 m tall, 22 long; the ortho draws
// it 30 x 8.5, the show still a little taller) with a window band across the front and a lipped cap
export const NECK = { z0: 199, z1: 215, halfW: 6, y0: 23, y1: 27 };
export const HEAD = {
  z0: 196,
  z1: 218,
  halfW: 14,
  y0: 27,
  y1: 37,
  lip: 0.8,
};
// swept delta struts on the lower flank wall from the waist out to the outer nacelles' upper inner
// quadrant (plan, starboard); y range [y0, y1] on the ledge datum
export const WING = {
  pts: [
    [16, 250],
    [21, 240],
    [52, 262],
    [52, 274],
    [16, 272],
  ],
  y0: 0.2,
  y1: 5,
  halfH: 2.4,
};
export const NACELLE = {
  z0: 268,
  z1: 325,
  y: -4,
  outer: { x: 57.5, r: 13 },
  centre: { x: 0, r: 12.5 },
  nozzleR: 10.5,
  ringZ: [279, 286.5],
  domeLen: 12,
  nozzleZ: 316,
};
export const BAR = { x: 46, y: -4, halfH: 3.5, z0: 292, z1: 304 };

// ---- palette. Vertex tints on the shared plating map (albedo ~0.62 after the material's x1.4), given
// in linear so a tint of 0.8 lands on a light warm grey-white under the sun. The Arquitens is whiter
// and cooler than the Venator's cream, with a dark neutral belly (Coruscant's warm fill would turn a
// neutral belly brown, so it leans slightly blue) and deep wine-red Republic stripes.
export const PAL = {
  deck: lin(0.8, 0.775, 0.72),
  wall: lin(0.7, 0.69, 0.655),
  ledge: lin(0.64, 0.63, 0.6),
  belly: lin(0.37, 0.38, 0.42),
  inner: lin(0.46, 0.46, 0.47),
  nacelle: lin(0.74, 0.725, 0.68),
  block: lin(0.76, 0.74, 0.69),
  transom: lin(0.3, 0.3, 0.32),
  red: 0x74222a,
  redDark: 0x5a1a20,
  yellow: 0xd8b04a,
  dark: 0xb4b8be, // machinery greebles (dark texture x light tint = readable dark grey)
  recess: 0x8a8e96, // gun bays, trench floor
  seam: 0x62656c, // panel-line grooves
  windowWarm: 0xffe2b0,
  windowCool: 0xd6e6ff,
  rowWarm: 0xd8bc90,
};
// coarse plating: the show's hull is big clean panels, so one tile of the shared map spans ~11 m
export const HULL_TEXEL = [1 / 11, 1 / 14, 1 / 18];
