// LEGO colour palette, approximating the real element colours.
// Keys follow common LEGO naming so builds read like a parts list.

export const C = {
  // Neutrals
  white: 0xf2f3f2,
  lightBluishGray: 0xa0a5a9,
  darkBluishGray: 0x6c6e68,
  black: 0x1b2a34,
  veryLightGray: 0xe6e3da,

  // Reds / oranges / yellows
  red: 0xc91a09,
  darkRed: 0x720e0f,
  orange: 0xfe8a18,
  darkOrange: 0xa95500,
  yellow: 0xf2cd37,
  brightLightOrange: 0xf8bb3d,
  tan: 0xe4cd9e,
  darkTan: 0x958a73,

  // Browns
  reddishBrown: 0x582a12,
  brown: 0x7c503a,
  darkBrown: 0x352100,

  // Greens
  green: 0x237841,
  brightGreen: 0x4b9f4a,
  darkGreen: 0x184632,
  oliveGreen: 0x9b9a5a,
  sandGreen: 0xa0bcac,
  lime: 0xbbe90b,

  // Blues
  blue: 0x0055bf,
  darkBlue: 0x0a3463,
  mediumBlue: 0x5a93db,
  lightBlue: 0xb4d2e3,
  sandBlue: 0x6074a1,
  darkAzure: 0x078bc9,

  // Purples / magentas
  purple: 0x81007b,
  darkPurple: 0x3f3691,
  magenta: 0x923978,

  // Metallics
  chromeSilver: 0xe0e0e0,
  flatSilver: 0x898788,
  pearlGold: 0xaa7f2e,
  gold: 0xd4af37,
  copper: 0xb46a00,
  gunmetal: 0x484d48,

  // Transparent elements
  transClear: 0xfcfcfc,
  transRed: 0xc91a09,
  transGreen: 0x84b68d,
  transBlue: 0x0020a0,
  transLightBlue: 0xaee9ef,
  transYellow: 0xf5cd2f,
  transOrange: 0xf08f1c,
  transNeonGreen: 0xd9e4a7,
  transPurple: 0x8320b7,
  transBlack: 0x635f52,
};

// Faction / set-specific shorthands used across the build.
export const SW = {
  // Imperial
  stormtrooperWhite: C.white,
  imperialGray: C.lightBluishGray,
  imperialDarkGray: C.darkBluishGray,
  vaderBlack: 0x1a1a1a,
  hullGray: 0xb6bcc0,
  hullGrayDark: 0x8b9296,
  hullPanel: 0x9aa1a6,

  // Rebel
  rebelTan: C.tan,
  rebelRed: C.red,
  rebelOrange: 0xd4762c,
  corellianRed: 0xa32c1f,

  // Droids
  r2Blue: 0x2d6fb5,
  r2White: 0xe8ecef,
  r2Silver: 0xc7ccd0,
  protocolGold: 0xd7a534,
  protocolGoldDark: 0xa87c1e,

  // Tatooine
  sand: 0xdcc38f,
  sandDark: 0xc0a473,
  sandRock: 0xa08a63,
  duneShadow: 0xb59a6c,

  // Energy
  blasterRed: 0xff2a10,
  blasterGreen: 0x39ff62,
  saberBlue: 0x54b9ff,
  saberRed: 0xff3b30,
  engineBlue: 0x7fd4ff,
  engineCyan: 0xa9ecff,
  sunOrange: 0xffb257,
  sunWhite: 0xfff0d0,
};

export function hexToRgb(hex) {
  return { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
}
