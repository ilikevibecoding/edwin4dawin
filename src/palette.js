// ---------------------------------------------------------------------------
// One cohesive art direction for the whole demo. Every module pulls colours
// from here so the four beauty shots read as the same game.
//
// Mood: late golden hour, damp Pacific-Northwest logging trail. Warm low sun
// raking through cool blue-green shade, a single saturated body colour on the
// truck, everything else desaturated earth.
// ---------------------------------------------------------------------------

export const PALETTE = {
  // --- vehicle -------------------------------------------------------------
  bodyPaint: 0x1d5344, // deep pine green with a teal lean
  bodyPaintDark: 0x0f2a23,
  accent: 0xd4671f, // faded orange — decals, recovery gear, light housings
  accentDim: 0x8a3f14,
  trim: 0x1a1c1e, // satin black plastic cladding
  trimWorn: 0x33373a,
  chrome: 0xc9ced2,
  steel: 0x8b9095,
  steelDark: 0x4a4f54,
  rubber: 0x1b1c1d,
  rubberDust: 0x5d5245,
  glass: 0x0d1417,
  interiorFabric: 0x3a3630,
  interiorPlastic: 0x232527,
  headlight: 0xfff2d6,
  taillight: 0xff2a12,
  markerAmber: 0xffa62b,

  // --- ground --------------------------------------------------------------
  dirtLight: 0x9a7d5d,
  dirt: 0x6f5942,
  dirtDark: 0x40342a,
  dirtWet: 0x2d2620,
  gravel: 0x8d8579,
  clay: 0x8a5f3d,

  // --- flora ---------------------------------------------------------------
  barkLight: 0x6b5a49,
  bark: 0x4a3e34,
  barkDark: 0x2a231e,
  leafSun: 0x87a545,
  leaf: 0x4c6b30,
  leafShade: 0x24361c,
  pineNeedle: 0x35502e,
  grass: 0x6d7c3c,
  grassDry: 0xa3934f,
  fern: 0x53743a,
  moss: 0x5c7038,

  // --- atmosphere ----------------------------------------------------------
  sunColor: 0xffd2a1,
  sunColorLow: 0xff9d52,
  skyTop: 0x4c7fb5,
  skyHorizon: 0xc8b39a,
  fogColor: 0xa4b6b8,
  fogDeep: 0x5c7076,
  bounce: 0x5a6b48, // green bounce from the canopy floor
  shadowTint: 0x2c3d4a,
};

export const SUN = {
  // Direction the light travels *from*, in world space (normalised in sky.js).
  azimuth: 35, // degrees
  elevation: 61, // clear of the tree line: at 52 the canopy edge still shaded the subject
  intensity: 7.6,
};

export const FOG = {
  near: 18,
  far: 190,
  density: 0.0062,
};

export const WORLD = {
  roadWidth: 7.2,
  roadLength: 420,
  chunk: 240,
};
