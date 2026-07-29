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
  // Halogen, not LED. At 0xfff2d6 this was two per cent off white, which is
  // fine in daylight where it is only a lens colour — but at night it is the
  // colour of the pool on the trail, and a near-white pool next to blue
  // moonlight reads as snow rather than as lit dirt. It is also the only warm
  // source in the night frame and therefore the whole of its hue separation.
  headlight: 0xffdca8,
  taillight: 0xff2a12,
  markerAmber: 0xffa62b,

  // --- ground --------------------------------------------------------------
  // Damp compacted earth, not sand. At exposure 1.34 under a 7.6 sun anything
  // much above 0.55 albedo clips, and the trail was reading as pale plaster.
  dirtLight: 0x84694c,
  dirt: 0x5c4936,
  dirtDark: 0x342a21,
  dirtWet: 0x231d18,
  gravel: 0x77705f,
  clay: 0x74502f,

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
  sunColor: 0xffe2c6, // 0xffd2a1 was r:b 1.58 — it tinted every material terracotta
  sunColorLow: 0xff9d52,
  skyTop: 0x4c7fb5,
  skyHorizon: 0xc8b39a,
  // Airlight inside a forest corridor, not open-country haze. 0x97a69c measured
  // about 0.31 linear, five to seven times a shaded crown and six times the
  // ramp the foliage materials now converge to — so the terrain washed out to a
  // pale plate while the trees standing on it stayed dark, and the two read as
  // different scenes. Halved in linear, which puts a 150 m hillside just under
  // the near forest instead of well above it. Blue still under green, or nothing
  // past 100 m reads as forest however saturated the trees themselves are.
  fogColor: 0x6c776f,
  fogDeep: 0x5c7076,
  bounce: 0x5a6b48, // green bounce from the canopy floor
  shadowTint: 0x2c3d4a,
};

export const SUN = {
  // Direction the light travels *from*, in world space (normalised in sky.js).
  azimuth: 35, // degrees
  elevation: 47, // compromise: clears most of the gap, still rakes vertical panels
  intensity: 8.8,
};

// ---------------------------------------------------------------------------
// The other two hours.
//
// These are not the day palette darkened. A night image built by pulling the
// exposure down on a daylight rig reads as a grey photograph, because the two
// things that actually say "night" are hue separation — one cool source, one
// warm source, nothing in between — and a value range that is compressed into
// the bottom third without touching the floor.
//
// So: moonlight is the only ambient, it is genuinely blue, and everything the
// truck carries is tungsten. Dusk is the crossfade, and gets the largest hue
// spread of the three because the sun is under the horizon on one side of the
// frame and the earth's shadow is climbing the other.
// ---------------------------------------------------------------------------

export const NIGHT = {
  // Moonlight is sunlight off a 0.12-albedo grey rock, so it is very slightly
  // *warmer* than the sun in absolute terms. It reads blue because the eye
  // adapts to the tungsten in the frame, which is what the headlamps supply —
  // so the blue is put in deliberately rather than measured.
  moon: 0xaec6ee,
  moonLow: 0x8aa3d0,
  skyTop: 0x070d1f,
  skyHorizon: 0x18253d,
  // Air over the treeline still scatters moonlight, and that band is the only
  // thing that puts a silhouette on the far conifers.
  haze: 0x243651,
  ground: 0x04060a,
  cloud: 0x2c3a54,
  // Fog has to sit *under* the horizon band or the distance glows and the
  // silhouette goes with it.
  fog: 0x101a28,
  // Deliberately less saturated than the sky it stands for.
  //
  // The sky dome is the blue in this mode and it should stay that blue. But at
  // night the hemisphere and the environment are what actually light a low
  // albedo — a black tyre reflects almost nothing of the key, so it takes its
  // colour wholesale from the ambient. With these at the sky's own saturation
  // the tyre, the bumper, the trail and the foliage all measured within five
  // degrees of hue 220 on a night hero, which is a scene lit by one gel with no
  // materials in it. Pulling the red up in the ambient alone lets each surface
  // keep a share of its own albedo without touching the look of the sky.
  hemiSky: 0x35435c,
  bounce: 0x1a1e18,
  shadowTint: 0x283245,
  starWarm: 0xffe6c8,
  starCool: 0xc4d8ff,
  // What the truck's own lamps put back into the air and onto the dirt.
  lamp: 0xffe3b8,
  lampCool: 0xfff0d8,
};

// Dusk had a green hole in it.
//
// Measured off a frame rather than judged: a black tyre came back at hue 340
// and 0.60 saturation — a *magenta* tyre. The cause is that every source in the
// hour had its green channel below both of the others. The key was a saturated
// orange (green two fifths of red), and every ambient term that was meant to
// balance it — hemisphere, shadow tint, fog — was a blue-violet with green
// below blue as well. Red from the key, blue from the fill, no green from
// anything, and the whole frame collapses onto the red-magenta axis with the
// truck's green paint reading as rust.
//
// So the warm end is desaturated a little and the cool end is walked off violet
// towards the blue-green a forest at dusk actually reflects. The hue spread
// between key and fill is the point of this hour and it survives; what does not
// survive is both ends agreeing to have no green.
export const DUSK = {
  sun: 0xffab6e,
  sunLow: 0xff7f42,
  skyTop: 0x2b3f66,
  skyHorizon: 0xffa066,
  haze: 0xffb886,
  ground: 0x120f0d,
  cloud: 0xffbe98,
  fog: 0x4c4d54,
  hemiSky: 0x6d809c,
  bounce: 0x5a4c36,
  shadowTint: 0x435070,
};

export const FOG = {
  near: 18,
  far: 190,
  // 0.0062 put 49% haze over the trail at 130 m, which flattened the two-track
  // well before the trees needed it
  density: 0.0052,
};

export const WORLD = {
  roadWidth: 7.2,
  roadLength: 420,
  chunk: 240,
};
