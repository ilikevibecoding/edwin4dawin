// Arquitens-class light cruiser — dimensions, plan/height profiles and palette shared by the geometry
// modules. All profile functions take `zr` = metres aft of the prong tips (0 at the bow, 325 at the
// nacelle nozzles) and return metres. Heights are relative to the ledge datum (the base of the flank
// wall, where the red stripe band meets the belly, y = 0); `Y0` shifts the whole ship so the origin sits
// near the hull's mid-height. Ship forward is -Z: model z = zr - L / 2.
//
// Reference proportions (fan ortho + show stills, metres): kite hull 325 long, 125 wide at the deck
// shoulders (zr ~ 185), 139 over the nacelles; fork gap 9 m, closed at zr ~ 62; bridge head 28 wide,
// 12 tall, its top 48 m above the keel line; nacelles r 12.5 at x ±57.5 hanging a little below the keel.
import { lin, pw } from "./venatorKit.js";

export const ARQUITENS = { length: 325, width: 140, height: 58 };
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
      [0, 14],
      [100, 42],
      [108, 47],
      [124, 47.5],
      [182, 62.5],
      [190, 60],
      [230, 26],
      [238, 24],
      [272, 21],
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
export const SLOT_X = 4.5; // inner walls of the prongs (the fork is 9 m wide)
// raised central spine on the deck: 14 m wide with red shoulders, a light 5 m ridge along its crest
// and a dark groove along its base
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
      [0, 6],
      [60, 8.5],
      [105, 10],
      [185, 12],
      [232, 11],
      [272, 2],
    ],
    zr,
  );
// deck height at the spine base (the deck is a shallow pyramid ~4 m higher at the centreline; it
// flattens onto the aft body's deck where the main loft hands over at zr 232)
export const deckC = (zr) =>
  pw(
    [
      [103, 10.8],
      [130, 12],
      [185, 13.6],
      [205, 13.6],
      [232, 12.2],
    ],
    zr,
  );
// spine raise above the deck: nothing forward of the red wedge block whose ramped front (zr 112–126)
// is the spine's terminus, then a constant step up to the superstructure block
export const spineUp = (zr) =>
  pw(
    [
      [112, 0],
      [126, 2],
      [232, 2],
    ],
    zr,
  );
// keel depth of the main hull below the datum: the belly deepens gently aft (the ortho's keel line is
// straight while the deck climbs to the bridge), 15.5 m under the shoulders
export const keel = (zr) =>
  pw(
    [
      [103, 9.6],
      [150, 13],
      [185, 15.5],
      [230, 15.5],
      [240, 13],
      [250, 10.5],
      [262, 8.2],
      [272, 7.5],
    ],
    zr,
  );
// bottom of a prong (at its inner wall; meets the main hull's V at the junction)
export const keelP = (zr) =>
  pw(
    [
      [0, 4.5],
      [60, 8],
      [107, 9.6],
    ],
    zr,
  );

// ---- aft superstructure, bridge, nacelles -----------------------------------------------------------
// the spine runs into a low pedestal under the bridge neck (zr 196–215); right behind the head the
// hull steps up into the ramp block's crest (zr 221) and then runs down a long ramp to the transom
export const BLOCK = { z0: 196, z1: 232, top: 19.5, crest: 23.5, crestZ: 221 };
export const blockHalfW = (zr) =>
  pw(
    [
      [196, 8],
      [215, 8],
      [221, 12],
      [232, 20],
      [272, 17],
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
// raised deck rails 6 m inboard of the chamfer stripe, growing from low kerbs at the shoulders to
// ridges beside the bridge
export const RAIL = { z0: 118, z1: 226, inset: 6, foot: 5, crest: 2.7 };
export const railH = (zr) =>
  pw(
    [
      [118, 1.2],
      [226, 3.6],
    ],
    zr,
  );
// T-shaped bridge: a narrow boxy neck and the wide 28 m head with a window band across the front and a
// lipped cap plate (the show's cab reads as a box about 2.3 : 1 wide : tall)
export const NECK = { z0: 200, z1: 212, halfW: 5, y0: 19.5, y1: 22.5 };
export const HEAD = {
  z0: 197,
  z1: 217,
  halfW: 14,
  y0: 22.5,
  y1: 34,
  lip: 0.8,
};
// swept delta struts on the lower flank wall from the waist out to the outer nacelles' upper inner
// quadrant (plan, starboard); y range [y0, y1] on the ledge datum
export const WING = {
  pts: [
    [14, 250],
    [24.5, 236],
    [52, 262],
    [52, 276],
    [14, 276],
  ],
  y0: 0.2,
  y1: 5,
  halfH: 2.4,
};
export const NACELLE = {
  z0: 268,
  z1: 325,
  y: -4,
  outer: { x: 57.5, r: 12.5 },
  centre: { x: 0, r: 12 },
  nozzleR: 10.5,
  ringZ: [277, 283.5],
  domeLen: 10,
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
