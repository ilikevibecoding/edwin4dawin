// Lucrehulk-class battleship / Droid Control Ship — dimensions derived from the reference stills and
// the shared palette. Ship forward is -Z, up +Y, origin at the ring centre; ring angles `th` run from
// the bow (-Z, th = 0) toward starboard (+X), so the stern is th = PI and the bow gap straddles th = 0.
import { D2R, col } from "./lucrehulkGeo.js";

export const LUCREHULK = {
  diameter: 3170,
  rOut: 1585, // outer ring radius
  rIn: 870, // inner wall radius (hole ≈ 0.55 × outer diameter, arms ≈ 715 m wide)
  halfH: 135, // ring half thickness (270 m between the top and bottom decks, ≈ 0.085 D)
  wallY: 84, // outer wall half height (the rounded shoulders take the rest)
  bevelR: 1500, // radius where the top deck breaks into the outer shoulder
  bandR: 1400, // outer deck band (bevelR .. bandR) sits a step above the main deck
  rimR: 975, // inner rim band: rIn .. rimR, raised `rimLift`
  rimLift: 18,
  gap: 28 * D2R, // half angle of the bow gap (56° open at the bow)
  tipArc: 24 * D2R, // raised tip roof plates cover the last 24° of each arm
  sphereR: 366, // core ship sphere (≈ 730 m across, 0.23 D, centred in the ring)
  height: 1000, // sphere bottom to spire tops
  strip: 44, // half height of the dark recessed docking band on the outer wall
};

// vertex tints over the shared plating (albedo ≈ 0.62 before tint) / machinery textures
export const PAL = {
  grey: col(0xc6c4bd), // pale warm grey hull
  greyLt: col(0xd4d2cb),
  greyDk: col(0xacaaa4),
  greyShade: col(0x99978f), // belly / recess plating
  wall: col(0xb5b3ad), // outer wall plating
  band: 0x5d6066, // dark machinery bands (outer wall strip, inner wall)
  bandDk: 0x3d4045,
  seam: 0x707378, // deck seams
  recess: 0x2c2e32,
  indigo: 0x3f4574, // Separatist blue-violet panels
  indigoDk: 0x333861,
  mark: 0xdedfe6, // insignia
  window: 0xffe3b6,
  windowCool: 0xc4e2ff,
  hangar: 0x9ed2ff,
  hangarWarm: 0xffd9a8,
  glow: 0xbfe2ff,
  nozzle: col(0x4a4c52),
  nozzleDk: col(0x2a2c30),
};
