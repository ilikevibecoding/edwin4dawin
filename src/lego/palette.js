// Official-ish LEGO colour palette, sRGB hex.
// Names follow LEGO / BrickLink conventions so builders read like real part lists.
export const C = {
  // neutrals
  white: 0xf4f4f4,
  veryLightGray: 0xe4e4dc,
  lightBluishGray: 0xa0a5a9,
  darkBluishGray: 0x6c6e68,
  darkGray: 0x545955,
  black: 0x1b2a34,
  trueBlack: 0x0d1216,

  // earth
  reddishBrown: 0x694028,
  darkBrown: 0x352100,
  brown: 0x8c5c3b,
  tan: 0xe4cd9e,
  darkTan: 0xb0a06f,
  nougat: 0xd09168,
  mediumNougat: 0xaa7d55,

  // warm
  red: 0xc91a09,
  darkRed: 0x720e0f,
  orange: 0xfe8a18,
  darkOrange: 0xa95500,
  yellow: 0xf2cd37,
  brightLightYellow: 0xffe371,
  brightLightOrange: 0xf8bb3d,
  coral: 0xff698f,
  magenta: 0x923978,

  // cool
  blue: 0x0055bf,
  darkBlue: 0x0a3463,
  mediumBlue: 0x5a93db,
  brightLightBlue: 0x9fc3e9,
  sandBlue: 0x6074a1,
  darkAzure: 0x078bc9,
  mediumAzure: 0x36aebf,
  green: 0x237841,
  brightGreen: 0x4b9f4a,
  darkGreen: 0x184632,
  sandGreen: 0xa0bcac,
  oliveGreen: 0x9b9a5a,
  darkTurquoise: 0x008f9b,
  lime: 0xbbe90b,
  purple: 0x81007b,

  // metallics
  metallicSilver: 0xa5a9b4,
  flatSilver: 0x898788,
  pearlGold: 0xdcbe61,
  chromeSilver: 0xd0d3d8,
  copper: 0xae7a59,
  pearlDarkGray: 0x575857,
  titanium: 0x3e3c39,

  // transparents
  transClear: 0xfcfcfc,
  transRed: 0xc91a09,
  transNeonOrange: 0xff5f39,
  transYellow: 0xf5cd2f,
  transGreen: 0x84b68d,
  transBrightGreen: 0xd9e4a7,
  transLightBlue: 0xaee9ef,
  transDarkBlue: 0x0020a0,
  transPurple: 0x8320b7,
  transBlack: 0x635f52,
};

// Material "finish" families understood by materials.js
export const FINISH = {
  SOLID: 'solid',
  TRANS: 'trans',
  METAL: 'metal',
  RUBBER: 'rubber',
  GLOW: 'glow',
  CHROME: 'chrome',
};

// Colours that are transparent parts by default.
export const TRANS_COLORS = new Set([
  C.transClear, C.transRed, C.transNeonOrange, C.transYellow, C.transGreen,
  C.transBrightGreen, C.transLightBlue, C.transDarkBlue, C.transPurple, C.transBlack,
]);

export const METAL_COLORS = new Set([
  C.metallicSilver, C.flatSilver, C.pearlGold, C.chromeSilver, C.copper,
  C.pearlDarkGray, C.titanium,
]);

export function defaultFinish(color) {
  if (TRANS_COLORS.has(color)) return FINISH.TRANS;
  if (METAL_COLORS.has(color)) return FINISH.METAL;
  return FINISH.SOLID;
}
