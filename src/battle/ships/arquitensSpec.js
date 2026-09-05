// Arquitens-class light cruiser — dimensions, plan/height profiles and palette shared by the geometry
// modules. All profile functions take `zr` = metres aft of the prong tips (0 at the bow, 325 at the
// nacelle nozzles) and return metres. Heights are relative to the ledge datum (the broad horizontal
// step at the base of the flank wall, y = 0); `Y0` shifts the whole ship so the origin sits near the
// hull's mid-height. Ship forward is -Z: model z = zr - L / 2.
import { lin, pw } from "./venatorKit.js";

export const ARQUITENS = { length: 325, width: 142, height: 60 };
export const L = ARQUITENS.length;
export const Z = (zr) => zr - L / 2;
export const Y0 = -6;

// ---- plan (half-widths) -------------------------------------------------------------------------
// outer edge of the ledge: a straight kite wedge from the blunt prong tips to the shoulders at ~56 %
// of the length, a small jog where the deck rail starts (zr ~ 105), then the swept aft edge down to
// the waist and the narrow aft body that carries the centre nacelle
export const wOut = (zr) =>
  pw(
    [
      [0, 13],
      [100, 41],
      [108, 47],
      [182, 63.5],
      [190, 61.5],
      [230, 27],
      [272, 21],
    ],
    zr,
  );
export const ledgeW = (zr) =>
  pw(
    [
      [0, 2],
      [105, 5.5],
      [232, 6.5],
      [272, 5],
    ],
    zr,
  );
export const wallX = (zr) => wOut(zr) - ledgeW(zr);
export const SLOT_X = 6.5; // inner walls of the prongs (the fork is 13 m wide)
// raised central spine on the deck: 14 m wide with red shoulders, a light 5 m ridge along its crest
// and a dark groove along its base
export const SPINE_X = 7;
export const RIDGE_X = 2.6;
export const RIDGE_H = 0.8;
export const GROOVE_W = 2.2;

// ---- heights (ledge datum) -----------------------------------------------------------------------
// top of the flank wall (= prong tops forward): low at the tips, rising toward the bridge and falling
// away over the aft body to the small transom
export const wallTop = (zr) =>
  pw(
    [
      [0, 5.5],
      [60, 8.5],
      [105, 10.5],
      [200, 12.5],
      [232, 11.5],
      [272, 1],
    ],
    zr,
  );
// deck height at the spine base (the deck is a shallow pyramid: higher at the centreline; it flattens
// onto the aft body's deck where the main loft hands over at zr 232)
export const deckC = (zr) =>
  pw(
    [
      [103, 11.1],
      [130, 15],
      [200, 20],
      [220, 17.5],
      [232, 12.8],
    ],
    zr,
  );
// spine raise above the deck: nothing forward of the red wedge block whose ramped front (zr 112–126)
// is the spine's terminus, then a constant step up to the superstructure block
export const spineUp = (zr) =>
  pw(
    [
      [112, 0],
      [126, 2.4],
      [232, 2.4],
    ],
    zr,
  );
// keel depth of the main hull below the datum
export const keel = (zr) =>
  pw(
    [
      [103, 15],
      [150, 19.5],
      [180, 21.5],
      [232, 21],
      [255, 17],
      [272, 9],
    ],
    zr,
  );
// bottom of a prong (at its inner wall; meets the main hull's V at the junction)
export const keelP = (zr) =>
  pw(
    [
      [0, 4.5],
      [60, 9.5],
      [107, 13.3],
    ],
    zr,
  );

// ---- aft superstructure, bridge, nacelles -----------------------------------------------------------
// the spine runs into a 16 m pedestal under the bridge neck (zr 204–220) that flares to the aft body's
// width by zr 232, where the long ramp down to the transom begins
export const BLOCK = { z0: 204, z1: 232, top: 24.5 };
export const blockHalfW = (zr) =>
  pw(
    [
      [204, 8],
      [220, 8],
      [232, 20],
      [272, 17],
    ],
    zr,
  );
export const RAMP_TOP = (zr) =>
  pw(
    [
      [232, 24.5],
      [272, 7],
    ],
    zr,
  );
// raised deck rails 6 m inboard of the chamfer stripe, growing from low kerbs at the shoulders to tall
// ridges beside the bridge
export const RAIL = { z0: 118, z1: 226, inset: 6, foot: 5, crest: 2.7 };
export const railH = (zr) =>
  pw(
    [
      [118, 1.4],
      [226, 4.4],
    ],
    zr,
  );
// T-shaped bridge: a narrow boxy neck and the wide 25 m head with a vertical window band across the
// front and a lipped cap plate (the show's cab reads as a box about 2.5 : 1 wide : tall)
export const NECK = { z0: 199, z1: 211.5, halfW: 4.8, y0: 24.5, y1: 31.5 };
export const HEAD = {
  z0: 196,
  z1: 214,
  halfW: 12.5,
  y0: 31.5,
  y1: 40.5,
  lip: 0.8,
};
// swept delta wings at the ledge level from the waist out to the outer nacelles (plan, starboard)
export const WING = {
  pts: [
    [12, 246],
    [26.5, 231],
    [45.5, 274],
    [45.5, 294],
    [12, 294],
  ],
  halfH: 3,
};
export const NACELLE = {
  z0: 272,
  z1: 325,
  y: -2.5,
  outer: { x: 57, r: 14 },
  centre: { x: 0, r: 13 },
  nozzleR: 11.5,
  ringZ: [281, 288],
  domeLen: 11,
  nozzleZ: 316,
};
export const BAR = { x: 46, y: -2.5, halfH: 4, z0: 292, z1: 304 };

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
