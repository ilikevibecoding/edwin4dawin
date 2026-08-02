/**
 * LEGO-ish colour palette.
 *
 * Values are sRGB hex, roughly matching real LEGO element colours so that
 * everything on screen reads as moulded ABS rather than generic 3-D shapes.
 */
export const COLORS = {
  white: 0xf2f3f2,
  lightBluishGray: 0xa0a5a9,
  darkBluishGray: 0x6c6e68,
  black: 0x1b2a34,
  trueBlack: 0x101418,
  red: 0xc91a09,
  darkRed: 0x720e0f,
  brightOrange: 0xf08000,
  orange: 0xd67923,
  yellow: 0xf2cd37,
  brightYellow: 0xffd700,
  tan: 0xe4cd9e,
  darkTan: 0x958a73,
  brown: 0x583927,
  reddishBrown: 0x694027,
  green: 0x237841,
  brightGreen: 0x4b9f4a,
  darkGreen: 0x184632,
  sandGreen: 0xa0bcac,
  blue: 0x0055bf,
  darkBlue: 0x0a3463,
  mediumBlue: 0x5a93db,
  brightLightBlue: 0x9fc3e9,
  sandBlue: 0x6074a1,
  darkAzure: 0x078bc9,
  purple: 0x81007b,
  darkPurple: 0x3f3691,
  magenta: 0x923978,
  lime: 0xbbe90b,
  oliveGreen: 0x9b9a5a,
  darkBrown: 0x352100,
  flatSilver: 0x898788,
  pearlGold: 0xaa7f2e,
  chromeGold: 0xdfc48e,
  chromeSilver: 0xd0d0d0,
  copper: 0xae7a59,
  // Transparent elements
  transClear: 0xfcfcfc,
  transRed: 0xc91a09,
  transNeonOrange: 0xff800d,
  transYellow: 0xf5cd2f,
  transGreen: 0x84b68d,
  transLightBlue: 0xaee9ef,
  transDarkBlue: 0x0020a0,
  transPurple: 0x8320b7,
  // Skin
  lightFlesh: 0xf6d7b3,
  mediumFlesh: 0xcc8e69,
  darkFlesh: 0x7c503a,
};

/** Materials whose surface finish differs from ordinary opaque ABS. */
export const FINISH = {
  // name -> partial THREE.MeshStandardMaterial parameters
  plastic: { roughness: 0.42, metalness: 0.0 },
  glossy: { roughness: 0.18, metalness: 0.0 },
  rubber: { roughness: 0.92, metalness: 0.0 },
  metal: { roughness: 0.3, metalness: 0.85 },
  chrome: { roughness: 0.08, metalness: 1.0 },
  gold: { roughness: 0.22, metalness: 0.95 },
  trans: { roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.55 },
  glow: { roughness: 0.5, metalness: 0.0 },
};

/** Named colour groups that come up repeatedly in the story. */
export const KIT = {
  hull: COLORS.lightBluishGray,
  hullDark: COLORS.darkBluishGray,
  imperial: COLORS.lightBluishGray,
  imperialTrim: COLORS.darkBluishGray,
  rebelHull: COLORS.white,
  rebelTrim: COLORS.red,
  sand: COLORS.tan,
  sandDark: COLORS.darkTan,
  laserRed: 0xff3322,
  laserGreen: 0x55ff44,
  laserBlue: 0x66ccff,
  saberBlue: 0x66ddff,
  saberRed: 0xff4433,
  saberGreen: 0x77ff66,
  engineBlue: 0x88ddff,
  hologram: 0x7fe8ff,
  starYellow: 0xffe066,
};

export function hexToRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
