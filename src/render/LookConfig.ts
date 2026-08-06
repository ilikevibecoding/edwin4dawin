/**
 * Every art-direction constant lives here so the look can be tuned in one file
 * during review passes instead of hunting through the scene code.
 *
 * Reference: rain-soaked neo-noir. Cyan/steel shadows, sodium-amber practicals,
 * hard rim light, shallow focus, heavy atmospherics, deep blacks that never crush.
 */

export interface GradeConfig {
  exposure: number;
  /** Linear-space colour multipliers applied before tone mapping. */
  tint: [number, number, number];
  contrast: number;
  saturation: number;
  /** Split toning after tone mapping. */
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
  splitBalance: number;
  lift: number;
  vignette: number;
  vignetteSoftness: number;
  grain: number;
  chromaticAberration: number;
  /** Slight horizontal smear on highlights, like anamorphic glass. */
  anamorphic: number;
}

export const GRADE: Record<string, GradeConfig> = {
  // Chapter 1 — rooftop, night, downpour, neon bounce.
  noirRain: {
    exposure: 1.05,
    tint: [0.94, 1.0, 1.12],
    contrast: 1.22,
    saturation: 1.04,
    shadowTint: [0.68, 0.82, 1.0],
    highlightTint: [1.0, 0.93, 0.82],
    splitBalance: 0.34,
    lift: 0.012,
    vignette: 0.38,
    vignetteSoftness: 0.5,
    grain: 0.02,
    chromaticAberration: 0.0011,
    anamorphic: 0.28,
  },
  // Chapter 2 — domestic interior, tungsten lamps, storm outside.
  domestic: {
    exposure: 1.35,
    tint: [1.05, 0.99, 0.95],
    contrast: 1.1,
    saturation: 1.0,
    shadowTint: [0.42, 0.58, 0.95],
    highlightTint: [1.0, 0.82, 0.6],
    splitBalance: 0.5,
    lift: 0.013,
    vignette: 0.44,
    vignetteSoftness: 0.5,
    grain: 0.018,
    chromaticAberration: 0.0008,
    anamorphic: 0.2,
  },
  // Chapter 3 — plaza, riot lights, searchlights, snow-rain mix.
  uprising: {
    exposure: 1.15,
    tint: [1.0, 0.98, 1.06],
    contrast: 1.2,
    saturation: 1.08,
    shadowTint: [0.66, 0.8, 1.0],
    highlightTint: [1.0, 0.72, 0.5],
    splitBalance: 0.38,
    lift: 0.012,
    vignette: 0.4,
    vignetteSoftness: 0.48,
    grain: 0.022,
    chromaticAberration: 0.0013,
    anamorphic: 0.34,
  },
  // Android interface / mind-space: clean, cold, low grain.
  interface: {
    exposure: 1.0,
    tint: [0.9, 1.0, 1.15],
    contrast: 1.05,
    saturation: 0.8,
    shadowTint: [0.4, 0.7, 1.0],
    highlightTint: [0.85, 0.95, 1.0],
    splitBalance: 0.5,
    lift: 0.02,
    vignette: 0.35,
    vignetteSoftness: 0.6,
    grain: 0.02,
    chromaticAberration: 0.0006,
    anamorphic: 0.2,
  },
};

/** Signature palette, reused by lights, emissives and UI. */
export const PALETTE = {
  ledCalm: 0x2fa8ff,
  ledProcess: 0xffb43a,
  ledStress: 0xff3b30,
  ledDead: 0x1a1d22,
  neonCyan: 0x36e0ff,
  neonMagenta: 0xff2d8f,
  neonAmber: 0xffa032,
  neonRed: 0xff2b2b,
  neonGreen: 0x4dffa8,
  sodium: 0xffb066,
  moonlight: 0x8fb4ff,
  policeBlue: 0x2a6bff,
  policeRed: 0xff2a2a,
  skyNight: 0x0a1420,
  fogNight: 0x0d1a26,
  concrete: 0x2a2d31,
  asphalt: 0x14161a,
  ceramicWhite: 0xe8ecef,
  androidJoint: 0x22262b,
  suitCharcoal: 0x1b1e24,
} as const;

export const BLOOM = {
  // Thresholded in scene-referred linear, so the number is an exposure value,
  // not a display level: anything above roughly one stop over key blooms.
  intensity: 0.6,
  threshold: 1.3,
  smoothing: 0.5,
  radius: 0.72,
};

export const DOF = {
  /** Physical-ish aperture; larger bokeh for close-ups. */
  bokehCloseUp: 5.2,
  bokehMedium: 3.2,
  bokehWide: 1.8,
  focalLength: 0.035,
  focusRange: 0.006,
};

export const FOG = {
  // Exponential-squared fog: at 0.03 a city 150 m out is completely erased, which
  // costs the rooftop its best background. Kept low enough that the near towers
  // stay legible and the far skyline dissolves.
  rooftopDensity: 0.011,
  domesticDensity: 0.012,
  plazaDensity: 0.026,
};

export const RAIN = {
  streakLength: 0.6,
  streakWidth: 0.0075,
  fallSpeed: 22,
  windX: 2.4,
  windZ: 0.6,
  opacity: 0.46,
  lensDrops: 0.55,
};
