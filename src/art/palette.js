// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — COLOR SCRIPT  (owner: fable1, art director)
// ---------------------------------------------------------------------------
// Grounded stylized realism. The map reads through five lighting zones; every
// material and light in the game must resolve to one of these families so the
// scene stays cohesive. Colours are authored in linear-friendly sRGB hex.
//
// ZONE A  Exterior / window-adjacent : cold blue daylight + snow bounce
// ZONE B  Open office                : neutral-green fluorescent
// ZONE C  Occupied / executive       : warm tungsten desk lamps
// ZONE D  Service + back of house    : dim, low-saturation, navigation lighting
// ZONE E  Danger / objective accents : restrained red + amber, used sparingly
// ---------------------------------------------------------------------------

export const PALETTE = {
  // --- light colours -------------------------------------------------------
  daylightCold: 0xa8c8e8,
  daylightKey: 0xcfe2f7,
  snowBounce: 0x9fc4e6,
  skyZenith: 0x5b7fa6,
  skyHorizon: 0xb9cad8,
  fogSnow: 0x8fa8bf,

  fluorescent: 0xe8f2e6,
  fluorescentCool: 0xdcebf0,
  fluorescentTired: 0xd8e6c8, // slightly green, aging tubes

  tungsten: 0xffc98a,
  deskLamp: 0xffb765,
  screenGlow: 0x7fb4d8,
  screenGlowWarm: 0xd8c090,

  emergency: 0xff4a3a,
  exitGreen: 0x36d17a,
  serverBlue: 0x2f8fd6,
  serverAmber: 0xffa42b,
  hazardAmber: 0xf0a020,

  // --- surface base colours ------------------------------------------------
  drywallWarm: 0xd9d3c8,
  drywallCool: 0xc9cfd4,
  drywallAccent: 0x39505f, // Northstar corporate deep teal
  plaster: 0xcfc9bd,
  ceilingTile: 0xe2e0d8,
  ceilingTileStained: 0xc4b89c,
  carpetMain: 0x4a5560,
  carpetAccent: 0x2f3a45,
  carpetExec: 0x53483f,
  vinylFloor: 0xb3b0a6,
  ceramicTile: 0xd6d8d4,
  concrete: 0x8e8f8b,
  concreteSealed: 0x76787a,
  woodVeneer: 0x8a5f3c,
  woodDark: 0x4d3624,
  laminate: 0xa89880,
  paintedMetal: 0x59606a,
  brushedMetal: 0x9aa0a6,
  stainless: 0xb6bcc2,
  aluminum: 0xa9aeb3,
  hardPlastic: 0x2d3238,
  softPlastic: 0x3a4048,
  fabricChair: 0x2f3742,
  fabricPanel: 0x6c7683,
  leather: 0x2a231e,
  paper: 0xf2efe6,
  cardboard: 0xb08b5e,
  rubber: 0x22262a,
  snow: 0xeef4fa,
  ice: 0xc6dced,
  dirt: 0x53483c,
  soot: 0x1a1a1c,

  // --- brand ---------------------------------------------------------------
  brandDeep: 0x0e2233,
  brandTeal: 0x1d6f8c,
  brandIce: 0x7fd4e8,
  brandSand: 0xd8c9a8,
  brandRed: 0xc63b2f,

  // --- UI ------------------------------------------------------------------
  uiInk: 0xe8eef4,
  uiInkDim: 0x8c9aa8,
  uiPanel: 0x0d1620,
  uiPanelHi: 0x16242f,
  uiAccent: 0x4fd0e8,
  uiWarn: 0xffb03a,
  uiDanger: 0xff4d43,
  uiGood: 0x4fe08a,
};

/** Lighting zones: used by map/build.js and the QA lighting-scenario switcher. */
export const ZONES = {
  exterior: { key: PALETTE.daylightCold, fill: PALETTE.snowBounce, intensity: 2.4, ambient: 0.55 },
  office: { key: PALETTE.fluorescent, fill: PALETTE.fluorescentCool, intensity: 1.0, ambient: 0.30 },
  executive: { key: PALETTE.tungsten, fill: PALETTE.deskLamp, intensity: 0.85, ambient: 0.22 },
  service: { key: PALETTE.fluorescentTired, fill: PALETTE.emergency, intensity: 0.55, ambient: 0.16 },
  server: { key: PALETTE.serverBlue, fill: PALETTE.serverAmber, intensity: 0.7, ambient: 0.18 },
};

/** Shape language rules the whole team follows. */
export const SHAPE_LANGUAGE = {
  // Architecture: rectilinear, 100mm wall thickness, 3mm chamfers on all
  // player-height edges. Nothing gets a razor edge.
  edgeBevel: 0.004,
  wallThickness: 0.1,
  partitionThickness: 0.06,
  ceilingHeight: 3.0,
  serviceCeilingHeight: 2.6,
  doorWidth: 0.95,
  doorHeight: 2.1,
  doorThickness: 0.045,
  windowSill: 0.85,
  windowHead: 2.45,
  deskHeight: 0.735,
  counterHeight: 0.92,
  chairSeatHeight: 0.45,
  humanEyeHeight: 1.68,
  humanCrouchEye: 1.02,
  humanShoulder: 1.42,
  humanWidth: 0.52,
};

export function hexToRgb(hex) {
  return { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
}

export function css(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Multiply a hex colour by a scalar, clamped. Handy for wear variation. */
export function shade(hex, factor) {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * factor)));
  return (r << 16) | (g << 8) | b;
}

export function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// ---------------------------------------------------------------------------
// 2D cartography ink (owner: fable1, additive).
// Colours for the HUD minimap and the briefing floor plan. Derived from the
// UI family above so the 2D map reads as part of the same interface.
// ---------------------------------------------------------------------------

export const MAP_INK = {
  paper: 0x0a141c,        // map field — one step above uiPanel
  paperLine: 0x13212c,    // faint survey grid
  wall: 0x8fb4c9,         // structural line work
  wallDim: 0x3f5666,      // secondary line work / upper-floor ghost
  glass: 0x4fd0e8,        // glazing == uiAccent
  door: 0xb9d2e0,         // door-leaf ticks
  stair: 0x5a7486,        // stair treads
  label: 0x7e93a3,        // room labels
  player: 0x4fd0e8,       // the operator arrow == uiAccent
  objective: 0xffb03a,    // objective diamonds == uiWarn
  hostage: 0xffb03a,      // hostage markers == uiWarn
  extraction: 0x4fe08a,   // extraction bracket == uiGood
  danger: 0xff4d43,       // hostile / failed == uiDanger
};

/**
 * Minimap zone fills — darkened translations of the ZONES lighting script so
 * a glance at the map recalls how each space is lit in 3D.
 */
export const MAP_ZONE_FILLS = {
  exterior: 0x10202f,   // cold blue daylight, snow
  office: 0x14242a,     // neutral-green fluorescent
  executive: 0x231d15,  // warm tungsten
  service: 0x161a1c,    // dim back of house
  server: 0x0e1c2a,     // server-room blue
};
