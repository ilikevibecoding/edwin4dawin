/**
 * VISUAL BIBLE — Northstar Rescue
 * Owner: Fable 1 (art direction). Consumed by every art and UI module.
 *
 * Target: grounded stylized realism. Silhouettes stay readable and slightly
 * simplified; materials, scale and light response stay believable.
 *
 * COLOR SCRIPT
 *   The map reads as four light temperatures fighting for the same building:
 *     1. Cold storm daylight bouncing off snow  (windows, lobby, courtyard)
 *     2. Slightly green commercial fluorescent  (open plan, corridors)
 *     3. Warm tungsten desk / floor lamps       (occupied, human spaces)
 *     4. Sodium-amber emergency + red exit      (service spine, stairs)
 *   Red is reserved. It only appears as danger, objective or emergency data.
 *
 * SHAPE LANGUAGE
 *   Architecture: long horizontals, 100mm mullion grid, chamfered 8mm edges.
 *   Furniture: soft rectangles, 20-40mm radii, visible panel seams.
 *   Hostiles: heavy vertical torso block, angular plate carrier, narrow head.
 *   Friendlies/hostages: rounded, softer, lighter values.
 *
 * SCALE STANDARD
 *   1 world unit = 1 metre. Eye height 1.68 m standing, 1.06 m crouched.
 *   Door clear height 2.10 m, corridor width 3.00 m, ceiling 3.20 m.
 */

export const UNITS = {
  metre: 1,
  eyeHeightStand: 1.68,
  eyeHeightCrouch: 1.06,
  playerRadius: 0.34,
  playerHeightStand: 1.83,
  playerHeightCrouch: 1.22,
  stepHeight: 0.32,
  doorWidth: 0.94,
  doorHeight: 2.1,
  doorThickness: 0.045,
  wallThickness: 0.16,
  partitionThickness: 0.11,
  ceilingHeight: 3.2,
  corridorCeiling: 3.0,
  floorThickness: 0.35,
  storeyHeight: 4.2,
  ceilingTile: 0.6,
  mullion: 0.06,
  baseboard: 0.11,
  bevel: 0.008,
};

/** Named colours in linear-ish sRGB hex. */
export const C = {
  // Snow & sky
  snowLit: 0xe9f2fb,
  snowShadow: 0xa8c2dc,
  snowDeep: 0x8fa9c6,
  skyZenith: 0x5d7794,
  skyHorizon: 0xb9c9d8,
  stormGrey: 0x8c9bab,
  iceBlue: 0xbcd8ea,

  // Cold daylight
  daylightCold: 0xb8d4f0,
  windowBounce: 0x9fc4e6,

  // Fluorescent
  fluoro: 0xd9f0e6,
  fluoroCool: 0xcfe6ef,
  fluoroTube: 0xeafff6,

  // Warm practicals
  tungsten: 0xffc98a,
  tungstenDeep: 0xff9c4a,
  screenGlow: 0x7fd4ff,
  serverLed: 0x53ffb0,
  serverLedAmber: 0xffb44a,

  // Emergency
  emergencyAmber: 0xffa32e,
  exitGreen: 0x35e07f,
  dangerRed: 0xff3b30,
  dangerRedDeep: 0xa41d18,

  // Architecture
  drywallWarm: 0xd8d2c8,
  drywallCool: 0xcfd3d6,
  drywallAccent: 0x2f3c48,
  plaster: 0xdedad2,
  ceilingTileColor: 0xe4e2dc,
  carpetSlate: 0x4a5259,
  carpetTeal: 0x35545c,
  carpetWarm: 0x6b6156,
  vinylGrey: 0x9a9c9a,
  ceramicTile: 0xdcded9,
  concrete: 0x8e8f8b,
  concreteDark: 0x5c5e5c,
  woodVeneer: 0x8a5f38,
  woodDark: 0x4a3220,
  laminateGrey: 0xb9b4ab,

  // Metals
  paintedMetal: 0x7f858a,
  brushedAlu: 0xb4b8bb,
  steel: 0x9aa0a5,
  blackAnodised: 0x2a2d31,
  gunmetal: 0x3a3f45,

  // Fabrics / plastics
  chairFabric: 0x3b444d,
  chairFabricAlt: 0x54473f,
  upholsteryTan: 0x9d7c5c,
  plasticWhite: 0xe7e5e0,
  plasticDark: 0x33373b,
  rubber: 0x232629,

  // Brand — Northstar Administrative Center
  brandNavy: 0x0e1b2a,
  brandBlue: 0x1f6fb2,
  brandCyan: 0x7fd4ff,
  brandIce: 0xd6ecfa,
  brandGold: 0xd9a441,

  // Character
  hostileJacketA: 0x2f3a33,
  hostileJacketB: 0x39332c,
  hostileJacketC: 0x2b3038,
  hostilePlate: 0x24282c,
  hostileGlove: 0x1a1c1f,
  skinA: 0xc9a07c,
  skinB: 0x8a5f42,
  skinC: 0xe0b69a,
  skinD: 0x6a452f,
  hostageShirt: 0xd7dbe0,
  hostageShirtB: 0xb9c6d4,
  hostageTrouser: 0x39414a,
  operatorFatigue: 0x2c3540,
};

/** UI palette (Fable 1). Also mirrored in src/ui/styles.css custom properties. */
export const UI = {
  bg: '#080d14',
  bgPanel: 'rgba(11, 20, 32, 0.88)',
  bgPanelSolid: '#0b1420',
  stroke: 'rgba(127, 212, 255, 0.28)',
  strokeStrong: 'rgba(127, 212, 255, 0.65)',
  text: '#e6f1fa',
  textDim: '#93a7b8',
  textFaint: '#5d7186',
  accent: '#7fd4ff',
  accentDeep: '#1f6fb2',
  gold: '#d9a441',
  danger: '#ff4438',
  success: '#35e07f',
  warn: '#ffa32e',
  fontDisplay: '"Northstar Display", "Rajdhani", "Bahnschrift", "DIN Alternate", "Segoe UI Semibold", system-ui, sans-serif',
  fontUi: '"Northstar UI", "Inter", "Segoe UI", Roboto, system-ui, sans-serif',
  fontMono: '"Northstar Mono", "JetBrains Mono", "Consolas", ui-monospace, monospace',
};

/** Material standard: canonical roughness / metalness ranges per family. */
export const MATERIAL_STANDARD = {
  paintedDrywall: { rough: [0.82, 0.94], metal: 0.0 },
  plaster: { rough: [0.88, 0.97], metal: 0.0 },
  acousticTile: { rough: [0.93, 0.99], metal: 0.0 },
  carpet: { rough: [0.9, 0.99], metal: 0.0 },
  vinyl: { rough: [0.4, 0.62], metal: 0.0 },
  ceramic: { rough: [0.18, 0.4], metal: 0.0 },
  concrete: { rough: [0.72, 0.92], metal: 0.0 },
  paintedMetal: { rough: [0.42, 0.62], metal: 0.65 },
  brushedMetal: { rough: [0.26, 0.42], metal: 0.9 },
  stainless: { rough: [0.16, 0.3], metal: 1.0 },
  aluminium: { rough: [0.22, 0.38], metal: 0.95 },
  woodVeneer: { rough: [0.34, 0.55], metal: 0.0 },
  laminate: { rough: [0.28, 0.45], metal: 0.0 },
  clearGlass: { rough: [0.02, 0.06], metal: 0.0 },
  frostedGlass: { rough: [0.45, 0.62], metal: 0.0 },
  rubber: { rough: [0.85, 0.96], metal: 0.0 },
  hardPlastic: { rough: [0.3, 0.5], metal: 0.0 },
  softPlastic: { rough: [0.6, 0.8], metal: 0.0 },
  fabric: { rough: [0.85, 0.98], metal: 0.0 },
  leather: { rough: [0.42, 0.66], metal: 0.0 },
  paper: { rough: [0.78, 0.92], metal: 0.0 },
  electronics: { rough: [0.28, 0.55], metal: 0.15 },
  snow: { rough: [0.62, 0.85], metal: 0.0 },
  ice: { rough: [0.1, 0.28], metal: 0.0 },
  wet: { rough: [0.08, 0.25], metal: 0.0 },
  dirt: { rough: [0.85, 0.98], metal: 0.0 },
  soot: { rough: [0.9, 1.0], metal: 0.0 },
};

/** Lighting plan constants shared by the level builder and the QA light-scenario switcher. */
export const LIGHT_PLAN = {
  sunColor: C.daylightCold,
  sunIntensity: 2.05,
  sunDirection: [-0.42, -0.72, 0.55],
  skyColor: C.skyHorizon,
  groundColor: 0x5a6570,
  ambientColor: 0x8fa6bd,
  ambientIntensity: 0.55,
  hemiIntensity: 1.25,
  fogColor: 0x9fb4c8,
  fogNear: 26,
  fogFar: 165,
  interiorFogDensity: 0.0065,
  exposure: 1.14,
  bloomStrength: 0.24,
  bloomThreshold: 0.86,
  bloomRadius: 0.5,
  vignette: 0.3,
  fluoroIntensity: 5.6,
  tungstenIntensity: 4.2,
  emergencyIntensity: 2.2,
};

export function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function rgbCss(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

/** Multiply/shift a hex colour, used for wear variants and LOD tinting. */
export function shade(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (cl(r * factor) << 16) | (cl(g * factor) << 8) | cl(b * factor);
}

export function mixHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return (m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb);
}
