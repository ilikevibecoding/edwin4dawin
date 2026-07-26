/**
 * Colour script and material standards. Owner: Fable 1 (art director).
 *
 * The whole building is graded on one axis: cold exterior light in the public south face,
 * neutral fluorescent through the working floors, warm pools where people actually are, and
 * desaturated darkness in the service wing relieved only by navigation lighting. Red is
 * reserved: it means danger or objective, nothing else.
 */

export const Palette = {
  // --- architecture --------------------------------------------------------
  wall: {
    warmWhite: 0xe2ded4,
    coolGrey: 0xc9ccd0,
    serviceGrey: 0x9ea3a6,
    navy: 0x1e2a3a,
    walnut: 0x6b4a30,
    restroomTile: 0xc4ccca,
    exteriorClad: 0x9aa0a4,
    exteriorAccent: 0x2c3742,
  },
  floor: {
    carpetBlue: 0x2f3a4a,
    carpetBlueFleck: 0x4d5f75,
    carpetGrey: 0x4a4d51,
    carpetGreyFleck: 0x6a6e73,
    carpetExec: 0x3a3630,
    carpetExecFleck: 0x574f45,
    vinyl: 0xb8b4a8,
    tileRestroom: 0xbcc4c2,
    tileKitchen: 0xd8d4c8,
    concrete: 0x8d8d8a,
    concreteSealed: 0x7e807f,
    terrazzo: 0xb9b5ac,
    raisedMetal: 0x6e7276,
    snow: 0xf2f6fb,
    asphalt: 0x4a4d50,
  },
  ceiling: {
    tile: 0xdedbd4,
    grid: 0xb9bcbe,
    concrete: 0x8a8b8a,
    deck: 0x5d6266,
  },
  trim: {
    baseboard: 0xd6d2c8,
    baseboardService: 0x6f7477,
    crown: 0xe6e3db,
    doorFrame: 0xd9d5cb,
    doorFrameService: 0x8a8f92,
    threshold: 0x8e8c86,
  },
  door: {
    officeWood: 0x8a6440,
    fireGrey: 0x7f8589,
    securityDark: 0x3c4247,
    restroom: 0xa3a7a1,
    serverBlue: 0x2f4152,
    loadingSteel: 0x6b7075,
    shutter: 0x8b9095,
  },
  metal: {
    steel: 0x9aa0a4,
    stainless: 0xc4c9cc,
    aluminium: 0xb0b5b9,
    galvanised: 0x9ba2a6,
    blackened: 0x2a2d30,
    brass: 0xb08d4f,
  },
  // --- lighting ------------------------------------------------------------
  light: {
    /** Overcast snow daylight - strongly blue. */
    daylight: 0xbfd8f2,
    /** Bounce off the snow field outside every south window. */
    snowBounce: 0xd6e6f7,
    /** Office troffer: neutral with a faint green cast. */
    fluorescent: 0xf0f4e8,
    /** Desk and table lamps. */
    warmLamp: 0xffcf9a,
    /** Emergency / exit lighting. */
    emergency: 0xff4b3a,
    exitSign: 0x35e07a,
    /** Server indicator glow. */
    serverBlue: 0x4fa8ff,
    serverAmber: 0xffb648,
    /** Screen glow. */
    screen: 0x9ec6ff,
    /** Service corridor navigation strips. */
    navStrip: 0xcfe0e8,
    vehicleBeacon: 0xffa023,
  },
  // --- interface -----------------------------------------------------------
  ui: {
    ink: 0xeef3f7,
    inkDim: 0x9fb0bd,
    inkFaint: 0x62727f,
    panel: 0x0d1319,
    panelSoft: 0x141c24,
    line: 0x28353f,
    accent: 0x49c7ff,
    accentDim: 0x2a7ea8,
    objective: 0xffc247,
    danger: 0xff4d4d,
    success: 0x5ce08a,
    armor: 0x4d9fff,
    health: 0xe8eef2,
    warning: 0xff8a3d,
  },
  // --- brand (original) ----------------------------------------------------
  brand: {
    /** Northstar Administrative Center corporate identity. */
    primary: 0x1b3b5c,
    secondary: 0x2f6f9e,
    star: 0xf2f6fb,
    accent: 0xf5a623,
  },
  // --- characters ----------------------------------------------------------
  hostile: {
    fatigueA: 0x2b3138,
    fatigueB: 0x3c3a2e,
    fatigueC: 0x22303a,
    vestA: 0x1c1f22,
    vestB: 0x38332a,
    vestC: 0x2a2f35,
    skinA: 0xc99a72,
    skinB: 0x8d5f3d,
    skinC: 0xe3b48c,
    skinD: 0x6b4429,
    hairA: 0x241c16,
    hairB: 0x4a3324,
    hairC: 0x171717,
    hairD: 0x7a6a52,
  },
  hostage: {
    shirtA: 0xd8dde2,
    shirtB: 0x7fa3c4,
    trousersA: 0x33383e,
    trousersB: 0x4a4034,
    cardigan: 0x8b6f5a,
  },
  operator: {
    glove: 0x24272b,
    sleeve: 0x2f3a33,
    sleeveTrim: 0x1e241f,
    skin: 0xcb9a72,
    plate: 0x1b1e21,
  },
} as const;

/** Snow-storm fog and sky. */
export const ATMOSPHERE = {
  skyTop: 0x9fb7d0,
  skyHorizon: 0xd7e2ec,
  fogColor: 0xc3d3e2,
  fogNear: 26,
  fogFar: 120,
  /** Interior fog is much lighter so rooms stay readable. */
  interiorFogDensity: 0.0045,
  exteriorFogDensity: 0.02,
  sunDir: { x: -0.32, y: 0.62, z: 0.72 },
};
