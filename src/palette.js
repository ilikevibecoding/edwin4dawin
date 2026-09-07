// ---------------------------------------------------------------------------
// One cohesive art direction for the whole demo. Every module pulls colours
// from here so the four beauty shots read as the same game.
//
// Mood: East-African savanna. A high hard equatorial sun over red-ochre earth
// and straw grass, flat-topped acacias, the horizon lost in warm dust rather
// than grey air, and a golden hour that is the whole point of the game.
//
// The Pacific-Northwest keys (dirt*, bark*, leaf*, pineNeedle, fern, moss) are
// kept so nothing breaks while the vegetation and terrain rebuild against the
// savanna set below them; they are the ones to migrate off.
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

  // --- savanna: earth -------------------------------------------------------
  // Laterite. Iron-rich, so red rather than brown, and it is the colour of the
  // whole frame's bounce light: every shadowed underside in the scene picks it
  // up. The graded murram road is the same soil packed and paled by traffic.
  earth: 0x9a5a34,
  earthLight: 0xc07e4e,
  earthDark: 0x5e3520,
  murram: 0xb8825a, // the graded road surface, dust-pale on the crown
  murramDark: 0x7a5033, // ruts and the damp under the crown
  // --- savanna: grass -------------------------------------------------------
  // Dry season. Straw is the mid tone of the plain; the light end is what the
  // sun does to a seed head, the dark end is the base of a tussock and the
  // burnt patches. Green is the riverine strip and new growth after a burn.
  straw: 0xc9a458,
  strawLight: 0xe8cf8a,
  strawDark: 0x8a6a35,
  strawSeed: 0xf2dfa8, // seed heads, the rim-lit fringe at dusk
  grassGreen: 0x7c8a3c,
  grassBurnt: 0x3b2f22,
  // --- savanna: acacia -------------------------------------------------------
  acaciaLeaf: 0x5a6b2e,
  acaciaLeafSun: 0x9aa84e,
  acaciaLeafShade: 0x2c361a,
  acaciaBark: 0x6a5a48,
  acaciaBarkDark: 0x3a2f24,
  thorn: 0xd9cfb0, // the pale spines and dead twigs
  baobab: 0x8a7462,
  termite: 0xb27a4c, // mound clay, a little redder than the earth around it
  // --- savanna: campground ---------------------------------------------------
  canvas: 0x9c8f6a, // safari tent
  canvasShade: 0x5a5140,
  fire: 0xff9a2e,
  lantern: 0xffc773,

  // --- atmosphere ----------------------------------------------------------
  // Equatorial noon, high and white with a touch of warmth. The old 0xffe2c6
  // was a late-afternoon key.
  sunColor: 0xfff1de,
  sunColorLow: 0xffa858,
  skyTop: 0x3f7ac4,
  skyHorizon: 0xd8cbb4,
  // Open-country airlight. Warm and light, because the dust that scatters it
  // is the earth below it lifted into the air; what it must never be is grey.
  // The far ground goes *to* this, so it is also the colour the sky wears at the
  // horizon (sky.js keeps the two in step).
  fogColor: 0xd6bfa0,
  fogDeep: 0xc8ab88,
  haze: 0xe4cfae, // sunlit dust, brighter than the airlight
  hazeDeep: 0xb59a7c, // the far side of the sky, away from the sun
  dust: 0xd0a878, // kicked-up dust in shade
  dustLit: 0xf0d6a8, // and in the sun
  bounce: 0x9a6a44, // red-ochre bounce off the earth, into every underside
  shadowTint: 0x5a6d8c, // open-sky fill in the shadows: blue, but not cobalt
};

export const SUN = {
  // Direction the light travels *from*, in world space (normalised in sky.js).
  azimuth: 35, // degrees
  // Equatorial. High enough that shadows pool under things rather than
  // stretching from them, low enough that a vertical panel still reads. The
  // 47 this replaces was a compromise with a conifer canopy that is gone.
  elevation: 58,
  // 9.4 -> 7.9, traded against the day hemisphere (sky.js MODES.day.hemi,
  // 0.5 -> 2.5). Measured on the camp's mess framing: sunlit dirt is
  // 0.068 display luma per unit of key and 0.064 per unit of hemisphere, so
  // the pair holds the sunlit ground within four per cent of where it was
  // while the shade under the awning goes from 0.065 to 0.14. forest.js reads
  // this for its key reference, so the crowns follow the change for free.
  intensity: 7.9,
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
  // Read as the sRGB the dome shows at unit exposure now (sky.js converts
  // these once, like the other hours; it used to convert them twice and the
  // dome rendered black under the grade's grey lift). Blue-black overhead,
  // a deeper blue at the horizon where the air is thickest; the ground is
  // meant to sit *under* the horizon band, not on it.
  //
  // Measured on the hero at 0x0a1330 / 0x1d2c4c: zenith 0.081 display luma
  // (13/20/48), horizon band 0.114 (18/29/63) — blue, but a twilight blue,
  // and with the lamps' bloom veil on top of it a grey-blue. Forty per cent
  // darker in linear puts the zenith at 0.06 and the band under 0.09, which
  // is still a colour and no longer a lit sky.
  //
  // Round 6 (lighting r7): a quarter less saturated at the same hue, with
  // the dome's multipliers rescaled so the luma of each is what it was
  // (sky.js NIGHT_SKY: horizon 2.0 -> 1.437, haze 1.44 -> 1.113, zenith 1.0
  // -> 0.706). The round-5 critics measured the night sky at saturation
  // 0.67 – 0.70 display against a 0.45 – 0.55 ask; the grade's dark tint
  // adds about 0.12 to whatever the dome is authored at (a fifth off read
  // 0.60 – 0.62 on screen from 0.49 – 0.47 here), so 0.43 – 0.41 is what
  // puts every night sky box under the 0.6 line.
  skyTop: 0x0e1428,
  skyHorizon: 0x212a3a,
  // Air over the plain still scatters moonlight, and that band is the only
  // thing that puts a silhouette on the far acacias.
  haze: 0x2c374b,
  ground: 0x04060a,
  cloud: 0x2c3a54,
  // Fog has to sit *under* the horizon band or the distance glows and the
  // silhouette goes with it. A shade warmer than the forest's: the dust is
  // still in the air at night and it is still ochre.
  fog: 0x141a26,
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
  // Was a green-grey canopy floor. The ground is pale earth and straw now, and
  // what it bounces up under a blue moon is a dull warm grey.
  bounce: 0x211c17,
  shadowTint: 0x283245,
  starWarm: 0xffe6c8,
  starCool: 0xc4d8ff,
  // What the truck's own lamps put back into the air and onto the dirt.
  lamp: 0xffe3b8,
  lampCool: 0xfff0d8,
  // The campground's fire and lanterns. Listed here so the grade knows what it
  // must not crush and so the campground can light with the same tungsten.
  fire: 0xff8a26,
  fireCore: 0xffd08a,
  lantern: 0xffc773,
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
//
// Savanna golden hour. The sun is genuinely low now — there is no canopy to
// clear — so the key is oranger and the sky runs amber at the horizon through
// rose to a violet-blue zenith, with the earth's shadow climbing the far side.
// The fog is the one term that changes character most: forest dusk fogged to a
// neutral grey because the air under a canopy is unlit; here the dust is in
// full sun until the disc is gone, so distance goes to lit amber.
export const DUSK = {
  sun: 0xffa458,
  sunLow: 0xff742c,
  skyTop: 0x2e4c84,
  skyHorizon: 0xffb066,
  haze: 0xffc079,
  // The Belt of Venus: the rose-violet band on the anti-solar horizon, over the
  // blue-grey of the earth's own shadow. Sky only — it is never fed to a
  // material, which is where a violet with green at the bottom did its damage.
  antiSun: 0xb48ca2,
  ground: 0x1a120c,
  cloud: 0xffc9a0,
  fog: 0xa8845e,
  hemiSky: 0x7a86a6,
  bounce: 0x7a5232,
  shadowTint: 0x4a5a82,
};

// Overcast. Soft, flat, silver: one big source overhead, nothing warm in it,
// the savanna colours desaturated but not grey — straw under cloud is a pale
// khaki, not a monochrome. The shadow terms are all close to the key so there
// is almost no hue separation, which is the point of the mode.
export const OVERCAST = {
  sun: 0xe6e8ea,
  skyTop: 0x9aa1a8,
  skyHorizon: 0xcbc8c1,
  haze: 0xd5cfc4,
  ground: 0x2a2622,
  cloud: 0xb8bbbf,
  fog: 0xbfb9ae,
  hemiSky: 0xb5bac0,
  bounce: 0x74604c,
  shadowTint: 0x7a828c,
};

export const FOG = {
  near: 18,
  // Atmospheric perspective over kilometres, not a corridor. At 0.0052 the old
  // forest fog put half the frame in haze at 130 m; this puts a tenth on the
  // far treeline at 200 m and does not own the distance until 600.
  far: 900,
  density: 0.0017,
};

export const WORLD = {
  roadWidth: 7.2,
  roadLength: 420,
  chunk: 240,
};
