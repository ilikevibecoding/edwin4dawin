import * as THREE from 'three';
import { DUSK, NIGHT, OVERCAST, PALETTE, SUN } from './palette.js';
import { motePattern } from './textures/nature.js';

// ---------------------------------------------------------------------------
// Hand-written sky.
//
// three's physical Sky shader emits NaN and near-infinite pixels around the
// sun disc at some parameter combinations. Those survive into the PMREM
// environment map, and from there into every PBR material in the scene, which
// renders the whole frame black. This one is analytic, always finite, cheaper,
// and far easier to art-direct: the horizon band, the aureole, the cirrus, the
// star field and the moon's own disc are all separate dials.
// ---------------------------------------------------------------------------

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = ( modelMatrix * vec4( position, 1.0 ) ).xyz - cameraPosition;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to the far plane
}`;

const skyFragment = /* glsl */ `
uniform vec3 uZenith, uHorizon, uHaze, uGround, uSunColor, uCloudCol, uAnti;
uniform vec3 uSunDir;
uniform float uSunDisc, uGlow, uAureole, uHazeFalloff, uCloud, uExposure;
uniform float uZenithPow, uStars, uMoonDetail, uMilkyWay, uAntiGain, uWarm, uHazeAniso;
uniform vec2 uDisc;
varying vec3 vDir;

float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
float noise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ),
              mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
}
float fbm( vec2 p ) {
  float v = 0.0, a = 0.5;
  for ( int i = 0; i < 5; i ++ ) { v += a * noise( p ); p *= 2.03; a *= 0.5; }
  return v;
}

// Octahedral projection of the direction. An azimuth/elevation grid piles every
// cell on top of each other at the zenith, which is exactly where a star field
// gives itself away; this one is within about 40% of equal-area everywhere.
vec2 octEncode( vec3 d ) {
  vec3 n = d / ( abs( d.x ) + abs( d.y ) + abs( d.z ) + 1e-6 );
  vec2 o = n.xz;
  if ( n.y < 0.0 ) o = ( 1.0 - abs( n.zx ) ) * vec2( n.x >= 0.0 ? 1.0 : -1.0, n.z >= 0.0 ? 1.0 : -1.0 );
  return o;
}

// One grid of stars.
//
// Two numbers decide whether this reads as a sky or as a snowstorm, and both
// were wrong by about a factor of four on the first pass. The radius is floored
// at rather less than a pixel of the octahedral map, measured with a
// derivative: floored *above* a pixel and every star is a visible disc, which
// at 512 across is a disc the size of the moon. And the magnitude has to stay
// under the bloom threshold for all but the top of the distribution, or the
// convolution turns each one into a glowing ball and the frame fills with them.
vec3 starGrid( vec2 o, float px, float cells, float fill, float radius, float gain ) {
  vec2 p = o * cells;
  vec2 c = floor( p );
  float h1 = hash( c + 3.17 );
  float h2 = hash( c + 11.71 );
  float h3 = hash( c + 27.31 );
  float h4 = hash( c + 41.03 );
  if ( h3 > fill ) return vec3( 0.0 );
  vec2 pos = c + 0.18 + vec2( h1, h2 ) * 0.64;
  vec2 dv = p - pos;
  // Floored on the derivative so the field cannot crawl or twinkle under
  // motion, and the floor is the radius that matters: the authored radius is
  // now well under it at any capture pitch. The old 0.16 / 0.22 cell radii
  // were 1.2 and 3.6 *pixels* at 640 across — every star a soft disc, and the
  // coarse grid's discs all the same size, which is the "uniform blobs" read.
  float r = max( radius, px * cells * 0.62 );
  float q = dot( dv, dv ) / ( r * r );
  float s = exp( -q * 3.4 );
  // Magnitudes: fourth power, so the field is mostly faint with a handful
  // genuinely bright, and the bright end is bright — a first-magnitude star
  // is a point that reads at a glance, not a slightly whiter speck. The top
  // of the range stays under the night bloom threshold.
  float mag = h4 * h4 * h4 * h4;
  vec3 tint = mix( vec3( 1.0, 0.90, 0.78 ), vec3( 0.74, 0.84, 1.0 ), h1 );
  return tint * s * ( 0.05 + mag * 1.6 ) * gain;
}

// Ordered dither, a fraction of an 8-bit step, applied multiplicatively to
// the dome. The sky is the one smooth gradient in the frame, and the grade's
// film grain is weighted out of the highlights where the dusk sky sits.
float skyDither( vec2 p ) {
  return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ) - 0.5;
}

void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  float up = clamp( h, 0.0, 1.0 );

  vec3 col = mix( uHorizon, uZenith, pow( up, uZenithPow ) );

  float c = clamp( dot( d, uSunDir ), -1.0, 1.0 );
  float cp = max( c, 0.0 );

  // thick band of scattered light sitting on the horizon. Forward-scattered,
  // so with uHazeAniso up the band is a full-strength wall on the sun's
  // side and thins to half on the far side, where the earth's shadow and the
  // Belt of Venus can show through it instead of a cream wash.
  float haze = exp( -max( h, 0.0 ) * uHazeFalloff );
  float hazeSide = smoothstep( -1.0, 1.0, c );
  col = mix( col, uHaze, haze * 0.52 * mix( 1.0, 0.5 + 0.5 * hazeSide, uHazeAniso ) );

  // Open-sky gradient across the azimuth, which a forest sky never needed.
  // The sun's half of the sky warms towards the horizon band well outside the
  // aureole, and the far half carries the earth's shadow: a rose-violet band
  // sitting on a blue-grey base. This is what makes the dusk read as a
  // gradient the eye can follow rather than a hot spot on a flat dome.
  float side = smoothstep( -1.0, 1.0, c );
  col = mix( col, uHaze, haze * side * uWarm );
  float anti = pow( max( -c, 0.0 ), 2.5 ) * haze;
  col = mix( col, uAnti, anti * uAntiGain );

  if ( uStars > 0.0 ) {
    vec2 o = octEncode( d );
    float px = length( fwidth( o ) );
    // Thinned for an open sky. Under a canopy a tenth of the dome was visible
    // and the density read as a sky; over a plain the same field is snow.
    // Thinned again after the plain: at a capture's pixel pitch every star is
    // floored to a whole pixel, so the count is what reads, not the radius.
    // Three grids: a dense faint one, a sparse one that carries the bright
    // stars, and a very fine dusting that only shows inside the Milky Way.
    vec3 sf = starGrid( o, px, 210.0, 0.06, 0.03, 0.7 )
            + starGrid( o + 7.3, px, 96.0, 0.03, 0.03, 1.2 );
    // The Milky Way is a soft band round a tilted great circle, with the dark
    // rift down its middle and a granular texture of unresolved stars. It is
    // what stops the upper sky reading as an even wash of dots.
    vec3 axis = normalize( vec3( 0.42, 0.52, -0.74 ) );
    float along = dot( d, axis );
    float band = exp( -pow( along / 0.26, 2.0 ) );
    float rift = 1.0 - 0.55 * exp( -pow( ( along + 0.04 ) / 0.07, 2.0 ) );
    float grain = fbm( o * 5.5 + 21.0 );
    float mw = band * rift * ( 0.10 + grain * grain * 0.9 );
    sf += vec3( 0.58, 0.64, 0.82 ) * mw * uMilkyWay;
    sf += starGrid( o + 3.9, px, 420.0, 0.35, 0.03, 0.45 ) * band * uMilkyWay;
    // nothing in the first few degrees over the treeline, and less of it inside
    // the moon's own glow
    sf *= smoothstep( -0.01, 0.20, h ) * ( 1.0 - haze * 0.72 );
    sf *= 1.0 - smoothstep( 0.985, 0.9998, c ) * 0.85;
    col += sf * uStars;
  }

  // aureole: wide warm bloom of forward-scattered light around the sun
  col += uSunColor * pow( cp, 6.0 ) * uAureole * ( 0.35 + haze * 0.9 );
  col += uSunColor * pow( cp, 90.0 ) * uGlow;

  // cirrus, mostly for something interesting in the metal reflections
  if ( h > 0.0 ) {
    vec2 cuv = d.xz / ( h + 0.22 );
    float cl = fbm( cuv * 1.35 + 4.0 );
    cl = smoothstep( 0.52, 0.86, cl ) * smoothstep( 0.0, 0.22, h );
    vec3 lit = mix( uCloudCol, uSunColor * 1.35, pow( cp, 2.0 ) * 0.8 );
    col = mix( col, lit * ( 0.7 + uGlow * 0.02 ), cl * uCloud );
  }

  // the disc itself, kept to a sane magnitude on purpose
  float disc = smoothstep( uDisc.x, uDisc.y, c );
  vec3 discCol = uSunColor;
  if ( uMoonDetail > 0.0 ) {
    // A moon that is a flat white circle is worse than no moon. Two terms give
    // it a body: maria, and limb darkening towards the edge of the sphere.
    vec3 ref = abs( uSunDir.y ) > 0.94 ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 1.0, 0.0 );
    vec3 tx = normalize( cross( ref, uSunDir ) + 1e-5 );
    vec3 ty = cross( uSunDir, tx );
    vec2 mp = vec2( dot( d, tx ), dot( d, ty ) ) * 250.0;
    float m = fbm( mp * 0.42 + 9.0 );
    float rr = clamp( length( mp ) / 3.4, 0.0, 1.0 );
    discCol *= mix( 1.0, 0.55 + m * 0.62, uMoonDetail );
    discCol *= mix( 1.0, 0.72, rr * rr * uMoonDetail );
  }
  col += discCol * disc * uSunDisc;

  // below the horizon the dome reads as the plain, so nothing that peeks under
  // the terrain's edge is sky-blue
  col = mix( col, uGround, smoothstep( 0.0, -0.10, h ) );

  col *= 1.0 + skyDither( gl_FragCoord.xy ) * 0.012;
  col = clamp( col * uExposure, vec3( 0.0 ), vec3( 80.0 ) );
  gl_FragColor = vec4( col, 1.0 );
}`;

// Two ways to turn a hex into a linear radiance, and the difference matters.
//
// `lin` converts twice: `new Color(hex)` already lands in linear under three's
// colour management, and `convertSRGBToLinear` on top of that darkens and
// saturates it again. The night rig was tuned against that and is kept on it.
// `rad` converts once, so the hex you read is the sRGB the sky will show at
// unit exposure, which is the only way to author a gradient by eye.
const lin = (hex, mul = 1) => new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(mul);
const rad = (hex, mul = 1) => new THREE.Color(hex).multiplyScalar(mul);

/**
 * The colour the sky shader shows at the horizon away from the sun: this is
 * what the far ground has to fog to, or the plain and the sky meet in a seam.
 */
function horizonOf(sky, k = 0.52) {
  return sky.horizon.clone().lerp(sky.haze, k);
}

// ---------------------------------------------------------------------------
// The four hours.
//
// Each entry is a complete lighting rig, not a tint on the previous one. They
// were rebuilt for open country: a forest rig is a corridor problem — get the
// key through the canopy, keep the fog under the treeline — and a savanna rig
// is the opposite one, a sky that is most of the frame and a horizon that is
// forty kilometres away.
// ---------------------------------------------------------------------------

const DAY_SKY = {
  // Equatorial noon. Deep blue overhead falling to a pale, warm, dusty band,
  // and the band reaches higher than it did over the forest because the air
  // here has soil in it.
  zenith: rad(0x1f5cbc, 0.7),
  horizon: rad(0x9cb8dc, 0.6),
  // Held under white: the band was clipping to paper at the ridge line, and a
  // dust haze is a colour, not a highlight. Then held under *cream*: measured
  // from the pride with everything past the water hole hidden, the dome's own
  // band at the horizon was 0.75 luma at hue 37 against 0.62 blue-grey five
  // degrees up — a stop brighter and a different colour, and every far plain
  // fogging toward it (as it must) came out as a yellow strip under the hills
  // wherever they stood low enough to let the horizon through. Greyer and a
  // little darker, so the band is a pale desaturated blue-grey the plain can
  // sink into, not a colour it stands out against.
  haze: rad(0xd6d0c4, 0.7),
  anti: rad(0xc9c3bc, 0.6),
  antiGain: 0.0,
  warm: 0.12,
  ground: rad(0x5a3a22, 0.35),
  sunColor: rad(0xfff0d8),
  cloudCol: rad(0xf2f0ea, 0.9),
  sunDisc: 46.0,
  envDisc: 8.0,
  glow: 5.0,
  envGlow: 3.0,
  aureole: 0.42,
  // Down from 14: the band was two degrees thick and the sky over a hill
  // crest was already the blue above it, so the crest sat on a bright seam.
  // At 9 the same haze is spread over the first eight degrees and the hills
  // stand in it rather than on it.
  hazeFalloff: 9.0,
  cloud: 0.5,
  zenithPow: 0.42,
  disc: [0.99955, 0.99988],
  stars: 0,
  milkyWay: 0,
  moonDetail: 0,
};

const DUSK_SKY = {
  zenith: rad(DUSK.skyTop, 0.62),
  horizon: rad(0xf0b478, 0.58),
  // Down from 0.9 with the sun at six degrees: the aureole now sits *in* the
  // haze band, and the two together were taking the whole sun-side sky to
  // cream. Anisotropic, so the anti-solar half keeps its rose and blue-grey.
  haze: rad(DUSK.haze, 0.8),
  hazeAniso: 1.0,
  anti: rad(DUSK.antiSun, 0.66),
  antiGain: 1.1,
  warm: 0.3,
  ground: rad(DUSK.ground, 0.9),
  sunColor: rad(DUSK.sunLow, 1.1),
  cloudCol: rad(DUSK.cloud, 0.7),
  sunDisc: 26.0,
  envDisc: 5.0,
  glow: 8.5,
  envGlow: 2.4,
  // A low sun scatters through far more air, so the aureole is most of the
  // sky rather than a ring: this is the term that makes dusk read as dusk.
  // Held back from 0.7 now that the disc is on the horizon, where the
  // `haze * 0.9` half of its own weighting is at full.
  aureole: 0.55,
  hazeFalloff: 10.0,
  cloud: 0.7,
  zenithPow: 0.5,
  disc: [0.99930, 0.99978],
  // None. With the disc still fifteen degrees up there are no stars, and the
  // few that were here read as white specks over the amber.
  stars: 0,
  milkyWay: 0,
  moonDetail: 0,
};

const NIGHT_SKY = {
  zenith: lin(NIGHT.skyTop, 1.0),
  horizon: lin(NIGHT.skyHorizon, 1.0),
  // No brighter than the horizon it sits on. At 1.15 this was the pale band
  // every critic saw: a haze term lighter than the sky above it *and* than the
  // fog the ground went to, so the hills floated on a luminous strip. Held to
  // the horizon's own value the sky darkens smoothly to the ground line and
  // the fog below (`horizonOf` this) meets it there.
  haze: lin(NIGHT.haze, 0.78),
  anti: lin(NIGHT.haze, 0.8),
  antiGain: 0.0,
  warm: 0.0,
  ground: lin(NIGHT.ground, 1.0),
  sunColor: lin(NIGHT.moon),
  cloudCol: lin(NIGHT.cloud, 0.9),
  // Small and hot rather than large and grey: the moon is a quarter of a
  // degree across and brighter than anything else in the sky.
  sunDisc: 26.0,
  envDisc: 5.0,
  glow: 2.6,
  envGlow: 1.6,
  aureole: 0.30,
  hazeFalloff: 9.0,
  cloud: 0.30,
  zenithPow: 0.55,
  disc: [0.999905, 0.999975],
  // Points now, not discs (see `starGrid`), so the count can come back up a
  // little without the field reading as snow, and the Milky Way carries the
  // sense of a dark-sky night.
  stars: 0.7,
  milkyWay: 0.85,
  moonDetail: 1.0,
};

const OVERCAST_SKY = {
  zenith: rad(OVERCAST.skyTop, 0.36),
  horizon: rad(OVERCAST.skyHorizon, 0.54),
  haze: rad(OVERCAST.haze, 0.62),
  anti: rad(OVERCAST.haze, 0.62),
  antiGain: 0.0,
  warm: 0.0,
  ground: rad(OVERCAST.ground, 0.7),
  sunColor: rad(0xe4e4e2, 0.6),
  // Darker than the sky it sits in, so the fbm deck reads as cloud bases
  // rather than vanishing into a white card.
  cloudCol: rad(OVERCAST.cloud, 0.6),
  sunDisc: 0.0,
  envDisc: 0.0,
  glow: 0.5,
  envGlow: 0.3,
  aureole: 0.25,
  hazeFalloff: 6.0,
  cloud: 1.0,
  zenithPow: 0.8,
  disc: [0.9995, 0.9999],
  stars: 0,
  milkyWay: 0,
  moonDetail: 0,
};

const MODES = {
  day: {
    key: { az: SUN.azimuth, el: SUN.elevation, color: PALETTE.sunColor, intensity: SUN.intensity },
    sky: DAY_SKY,
    // Open sky over red earth. The sky half is no longer canopy-filtered — it is
    // a real pale blue, held down because the PMREM already carries the sky —
    // and the ground half is the ochre the whole plain bounces back, which is
    // what warms every underside and shadowed flank in the frame.
    hemi: { sky: 0x93a9c2, ground: PALETTE.bounce, intensity: 0.5 },
    rim: { color: PALETTE.shadowTint, intensity: 0.38 },
    // The bounce card stays. A 58-degree sun leaves a door skin at half the
    // irradiance of the bonnet and open ground does not fill it; the card is
    // the earth doing so, so it is earth-coloured now.
    fill: { color: 0xffd9b0, intensity: 13, angle: 0.55, throw: 14, az: 252, el: 21 },
    // Density up from the palette's 0.0017: at that the plain at 500 m was
    // still half its own straw under a noon key and read as a lit band; at
    // 0.0021 (dusk's figure) it is three quarters sky by 500 m and the near
    // frames are unchanged (a tenth of a stop at 150 m).
    fog: { color: horizonOf(DAY_SKY), density: 0.0021, sunGain: 0.35, sunPow: 5.0, height: 0.016, heightMix: 1.0 },
    // A multiplier on each material's authored value, so day is a no-op.
    envIntensity: 1.0,
    shadow: { radius: 1.2, bias: -0.00012, normalBias: 0.035, intensity: 1.0 },
    // Columns of lit dust, faint. Under a canopy these were the shot; on a plain
    // at noon they are barely there, which is right.
    shafts: { color: PALETTE.dustLit, gain: 0.28, width: 1.7 },
    motes: { color: PALETTE.dustLit, opacity: 0.09, beam: 0, size: 0.8, density: 0.5, cap: 0.12 },
    beams: { gain: 0, glare: 0 },
    rays: { color: 0xffe6c0, gain: 0.0 },
    groundIndirect: 1.0,
    surfaces: { dash: 1, film: 1, glass: 1 },
  },

  dusk: {
    // Genuinely low, and lower again. Fifteen degrees was "low" against the
    // forest's 38, but it is still an hour before sunset: shadows two and a
    // half times an object's height, no disc in any frame that is not aimed
    // at it, the roof line lit from above rather than raked. At six the sun is
    // a hand's width off the horizon: a 2.5 m truck throws a 24 m shadow up
    // the road, the acacias a hundred metres up-sun lay theirs across it, the
    // disc sits in the haze band where the sky shader has its aureole, and
    // the roof and bonnet go dark while the sun-side flank lights up — which
    // is the key/fill split this hour is about. The shadow boxes are as deep
    // as the sun needs (`shadowReach`), so none of that is clipped.
    //
    // Brighter to compensate for the angle: the ground gets sin(6)/sin(15) of
    // what it did, and it is the flanks that have to hold the exposure now.
    key: { az: 296, el: 6, color: DUSK.sun, intensity: 7.0 },
    sky: DUSK_SKY,
    // The hemisphere is diffuse only, the environment is diffuse *and*
    // specular, and it is the specular half that chalks a flank.
    hemi: { sky: DUSK.hemiSky, ground: DUSK.bounce, intensity: 0.8 },
    rim: { color: DUSK.shadowTint, intensity: 0.45 },
    // Cool, and deliberately so. With the key round the far side the near flank
    // is lit by nothing but sky, and a *warm* fill under a warm key is how a
    // first pass turned every surface the same orange. The whole appeal of this
    // hour is that the two sources disagree, so the fill has the colour of the
    // half of the sky the sun is not in, from the camera-side azimuth.
    // Roughly a third of the key on a flank now (decay 1 over 13 m), so the two
    // sides of the truck are a ratio and not a tint.
    fill: { color: 0x93add4, intensity: 14, angle: 0.6, throw: 13, az: 48, el: 18 },
    // Dustier than noon, and the dust is lit: distance towards the sun goes to
    // amber, away from it to the rose of the haze band.
    fog: { color: horizonOf(DUSK_SKY, 0.35), density: 0.0021, sunGain: 0.5, sunPow: 3.0, height: 0.02, heightMix: 1.0 },
    // The chalky flank was here: dusk kept nearly the whole of the day's
    // environment while the key dropped, so the clearcoat returned more sky
    // than the paint underneath returned light. And lower again for the plain:
    // this environment is an amber dome, and at 0.62 every shadow in the frame
    // was the same amber as the key. The hemisphere above is the blue half.
    envIntensity: 0.5,
    // A wider far-map filter than noon: a six-degree sun's penumbrae are long,
    // and a hard-edged 24 m shadow reads as a paper cut-out.
    shadow: { radius: 2.0, bias: -0.00016, normalBias: 0.045, intensity: 0.82, farRadius: 2.2, farStrength: 0.92 },
    shafts: { color: 0xffa354, gain: 1.1, width: 2.4 },
    // Larger and fainter than the first pass: at 0.3 and under a pixel each,
    // the lit dust read as white specks over the sky rather than as haze.
    motes: { color: 0xffcf98, opacity: 0.16, beam: 0.5, size: 1.4, density: 0.9, cap: 0.16 },
    beams: { gain: 0.55, glare: 0.3 },
    rays: { color: 0xffb56a, gain: 1.4, spread: 1.2, reach: 0.7, decay: 0.94 },
    groundIndirect: 0.8,
    surfaces: { dash: 1.35, film: 0.6, glass: 0.65 },
  },

  night: {
    // Moonlight is a key, not an ambient: a hard source with a direction that
    // casts. Elevation is held near the sun's because the clearing over the
    // landing was cut for a 47-degree source — drop below about 40 and a 24 m
    // conifer puts the truck in shade, which is the four-iteration hole the day
    // rig spent iterations 5 to 9 in.
    //
    // Azimuth was swept on the hero framing at 60, 140, 215 and 300. It is
    // worth writing down what the sweep actually decided, because it was not
    // the truck: at 140 the moon sits behind the truck's far shoulder, which
    // rims the roof line *and* lands full on the trail beyond it, so the ruts
    // and the standing water in them come up as the brightest thing in the
    // frame. That is the shot. Sixty lit the near flank better and looked like
    // an underexposed afternoon.
    //
    // Up from 1.6, with the fill and the hemisphere pulled down under it: the
    // three of them were within a factor of two of each other, and a frame
    // whose key, fill and ambient agree is a frame with no key. The moon now
    // owns the tops and the far flank, the fill models the near flank at a
    // third of it, and the undersides get almost nothing.
    key: { az: 140, el: 43, color: NIGHT.moon, intensity: 2.1 },
    sky: NIGHT_SKY,
    // The ground half is near black. Moonlit earth bounces almost nothing, and
    // the 0x211c17 it had was what put the same value on the underside of a
    // wheel arch as on the bonnet above it.
    hemi: { sky: NIGHT.hemiSky, ground: 0x0a0907, intensity: 0.3 },
    // A cool counter-key from behind the camera. At 0.16 it did nothing at all
    // and the truck's near flank was a single flat value; this is what puts an
    // edge on the roof line and the tyre shoulders on the shadow side.
    rim: { color: NIGHT.shadowTint, intensity: 0.3 },
    // With the moon behind the truck the near flank has nothing on it, so the
    // fill is doing all of the modelling here rather than merely opening the
    // shadow — the same job the bounce card does in the day rig, and the same
    // reason it is a spot: a directional at this strength lifts the whole
    // forest and the silhouette goes with it. Azimuth 48 puts it on the
    // camera-side flank at the truck's heading, which is the rake the sweep
    // liked at moon-60 without giving up the rim.
    // Low, because a fill this close to the key's own elevation just adds a
    // second flat wash; at fourteen degrees it rakes along the door skins and
    // the flank finally has a gradient across it.
    // Down from 15: at that it matched the moon and the near flank was as
    // bright as the lit one. It is the fill for the shadow side, so it sits
    // under the key by about three to one.
    fill: { color: 0x9db5d8, intensity: 8, angle: 0.6, throw: 13, az: 48, el: 14 },
    // Thinner than the forest's 0.0082: a moonlit plain has kilometres of
    // visibility, and the fog's job here is only to put the far acacias under
    // the horizon band rather than to close the corridor.
    //
    // The colour is the sky's own horizon, not a darker navy of its own. With
    // the fog under the sky the far ground went to one value and the sky just
    // above it to a lighter one, and the join was a pale band along every
    // night horizon in the round; the ground now fogs to exactly what the dome
    // shows at elevation zero.
    fog: { color: horizonOf(NIGHT_SKY, 0.45), density: 0.0046, sunGain: 0.0, sunPow: 3.0, height: 0.02, heightMix: 1.0 },
    // Traded down against the hemisphere above. The environment is a render of
    // the night sky and is therefore as saturated as the night sky; the
    // hemisphere is a colour I can set. Same total ambient, more of it from the
    // term whose hue is under control.
    envIntensity: 0.6,
    shadow: { radius: 2.4, bias: -0.00018, normalBias: 0.05, intensity: 0.88, farRadius: 1.8, farStrength: 0.9 },
    shafts: { color: 0x9dbbe8, gain: 0.45, width: 1.4 },
    // Dust you can see across the whole frame needs a light source filling the
    // whole frame; at night there is none, so the field is thinned to a third
    // and shrunk, and what is left only shows where the lamps reach it. Before
    // this the motes read as a snowstorm of blown white specks.
    motes: { color: 0x6f83a6, opacity: 0.055, beam: 1.0, size: 0.5, density: 0.34, cap: 0.1 },
    // The lens emissive is authored for daylight (0x6f6653 at 6.5 is about
    // 1.0 linear), which is under the night bloom threshold, so the lamps
    // did not bloom and barely read from the side. The glare billboard is the
    // term in this file that can light the lens: at this gain its lens disc
    // (see beamFrag) sits over the threshold and the lamp blooms as a lamp,
    // while the beam itself is bright enough to read as a cone from the hero
    // framing.
    beams: { gain: 3.0, glare: 2.8 },
    rays: { color: 0x9dbbe8, gain: 0.0 },
    // Under the headlamps the trail's relief swings the full range of N.L in
    // the space of a few centimetres, so the lit facets clip and the ones
    // tilted away have nothing on them at all; some indirect on this one
    // surface is what puts a floor under the dark half and keeps the pool
    // reading as a textured surface rather than as noise. Down from 0.62 with
    // the rest of the ambient: the moonlit ground was reading at day value.
    groundIndirect: 0.5,
    surfaces: { dash: 2.1, film: 0.2, glass: 0.24 },
  },

  overcast: {
    // One big soft source. The key is kept — a directional with no shadow is a
    // flat wash, and even under cloud there is a brighter side to the sky — but
    // it is dim, near-white, and its shadow is wide and faint. Everything else
    // is carried by the hemisphere, which is the cloud deck.
    key: { az: SUN.azimuth, el: 62, color: OVERCAST.sun, intensity: 2.6 },
    sky: OVERCAST_SKY,
    hemi: { sky: OVERCAST.hemiSky, ground: OVERCAST.bounce, intensity: 1.45 },
    rim: { color: OVERCAST.shadowTint, intensity: 0.25 },
    fill: { color: 0xe8ecf0, intensity: 8, angle: 0.55, throw: 14, az: 252, el: 21 },
    fog: { color: horizonOf(OVERCAST_SKY), density: 0.0026, sunGain: 0.0, sunPow: 3.0, height: 0.014, heightMix: 1.0 },
    envIntensity: 1.1,
    shadow: { radius: 4.0, bias: -0.00016, normalBias: 0.05, intensity: 0.38 },
    shafts: { color: 0xffffff, gain: 0.0, width: 1.0 },
    motes: { color: 0xd8d2c8, opacity: 0.08, beam: 0, size: 1, density: 0.5, cap: 0.2 },
    beams: { gain: 0, glare: 0 },
    rays: { color: 0xffffff, gain: 0.0 },
    groundIndirect: 1.0,
    surfaces: { dash: 1.1, film: 0.85, glass: 0.85 },
  },
};

export const TIME_NAMES = Object.keys(MODES);

// ---------------------------------------------------------------------------
// Contact-hardening shadows.
//
// three ships one filter width for the whole frame: five Vogel taps at a fixed
// radius, so a tyre resting in a rut and a branch twenty metres up throw edges
// of exactly the same softness. That single fact is most of what says "real
// time" about a shadow — a penumbra grows with the distance between the blocker
// and what it lands on, and a wheel with a hard-edged shadow under it reads as
// hovering however well it is modelled.
//
// PCSS does it in two stages: average the depth of whatever is casting over a
// search disc, turn the gap between that and the receiver into a penumbra
// width, then filter at that width. It needs the raw depth back rather than a
// hardware comparison, which is why the shadow map moves to `BasicShadowMap` —
// that is the mode where three leaves the depth texture uncompared and
// point-sampled.
//
// Two numbers are baked in at install rather than passed as uniforms, because
// there is nowhere to put a uniform on three's built-in materials without
// taking over every `onBeforeCompile` in the scene:
//
//   span   = ( shadowFar - shadowNear ) / shadow box width
//            turns a normalised depth difference into a fraction of the map
//   source = tangent of the light's angular radius
//            the sun is 0.0047; this runs wider on purpose, because a
//            physically correct solar penumbra is under a texel at any distance
//            this scene contains and buys nothing for the cost.
// ---------------------------------------------------------------------------

function legacyEnv() {
  try {
    return new URLSearchParams(location.search).get('env') === 'legacy';
  } catch {
    return false;
  }
}

function flatShafts() {
  try {
    return new URLSearchParams(location.search).get('shafts') === 'flat';
  } catch {
    return false;
  }
}

/**
 * `?pcss=off` keeps three's stock five-tap filter. The filter is a shader chunk
 * chosen once at boot, so there is no runtime toggle for it and this is the
 * only way to put the two side by side.
 */
function pcssOff() {
  try {
    return new URLSearchParams(location.search).get('pcss') === 'off';
  } catch {
    return false;
  }
}

const SHADOW_NEAR = 1;
const SHADOW_FAR = 260;
const SOURCE_TAN = 0.019;

let pcssInstalled = false;

// First line of the cascade body `installCascade` splices into the shadowmap
// chunk. The PCSS installer runs after it and replaces the stock `getShadow`
// variants up to the point-light block; the cascade body sits in exactly that
// span, so without this marker to stop at, PCSS deleted `getDirShadowCascade`
// and every lit program at high and ultra failed to compile against the call
// the cascade had left in `lights_fragment_begin`.
const CASCADE_MARK = '// csc: two-cascade directional shadow (sky.js)';

function installPcss(renderer, pcss, extent) {
  if (!pcss || pcssInstalled || pcssOff()) return false;
  // The whole `getShadow` cascade — the PCF, VSM and basic variants and the
  // `#if` chain selecting between them — is replaced by one unconditional
  // function. Anchored on three's own source by walking back from the first
  // declaration to the conditional that opens it, rather than on an exact
  // string, so a whitespace change between versions does not silently drop the
  // filter. If either anchor is gone, fall back to stock rather than compile
  // something that will not link.
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  const decl = chunk.indexOf('float getShadow(');
  const head = decl < 0 ? -1 : chunk.lastIndexOf('#if defined( SHADOWMAP_TYPE_PCF )', decl);
  const point = head < 0 ? -1 : chunk.indexOf('#if NUM_POINT_LIGHT_SHADOWS > 0', decl);
  const csc = head < 0 ? -1 : chunk.indexOf(CASCADE_MARK, decl);
  const tail = csc >= 0 && csc < point ? csc : point;
  if (head < 0 || tail < 0) {
    console.warn('sky: PCSS anchors not found in shadowmap chunk, keeping stock PCF');
    return false;
  }

  const span = (SHADOW_FAR - SHADOW_NEAR) / (2 * extent);
  // The widest penumbra this filter can make, in UV: what a blocker 28 m above
  // its receiver throws. The canopy tops out at 24 m, so nothing in the scene
  // wants more, and the blocker search runs at exactly this radius — a blocker
  // further out than the filter reaches cannot change the pixel, so searching
  // wider than it is taps spent on nothing.
  const search = (28 * SOURCE_TAN) / (2 * extent);

  const body = /* glsl */ `
		float pcssNoise( vec2 p ) {
			return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 pcssDisk( int i, int n, float phi ) {
			const float golden = 2.399963229728653;
			float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
			float theta = float( i ) * golden + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			if ( inFrustum && shadowCoord.z <= 1.0 ) {
				float texel = 1.0 / shadowMapSize.x;
				float phi = pcssNoise( gl_FragCoord.xy ) * PI2;
				float zR = shadowCoord.z;

				// shadowRadius is three's PCF width in texels and is per-mode:
				// 1.5 at noon, 2.4 at night. Referenced to the noon value it is
				// a softness multiplier, which is the only part of it that still
				// means anything once the width comes from the blocker.
				const float maxR = ${search.toFixed(7)};
				float soft = clamp( shadowRadius / 1.5, 0.6, 1.8 );
				float sum = 0.0;
				float hits = 0.0;
				for ( int i = 0; i < ${pcss.blocker}; i ++ ) {
					vec2 o = pcssDisk( i, ${pcss.blocker}, phi ) * maxR;
					float d = texture2D( shadowMap, shadowCoord.xy + o ).r;
					if ( d < zR ) { sum += d; hits += 1.0; }
				}
				if ( hits > 0.5 ) {
					// hits is at least one, so this cannot divide by zero
					float blocker = sum / hits;
					float gap = max( zR - blocker, 0.0 );
					// The span moves with the hour now — a low sun needs a deep
					// box — so it is read from the cascade uniform when there is one.
					float span = ${cascadeInstalled ? 'uCascade.x > 0.0 ? uCascade.x : ' : ''}${span.toFixed(5)};
					float radius = clamp( gap * span * ${SOURCE_TAN} * soft,
						texel * 0.7, maxR );
					float lit = 0.0;
					for ( int i = 0; i < ${pcss.filter}; i ++ ) {
						vec2 o = pcssDisk( i, ${pcss.filter}, phi + 1.7 ) * radius;
						lit += step( zR, texture2D( shadowMap, shadowCoord.xy + o ).r );
					}
					shadow = lit / float( ${pcss.filter} );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	`;

  THREE.ShaderChunk.shadowmap_pars_fragment = chunk.slice(0, head) + body + '\t' + chunk.slice(tail);
  renderer.shadowMap.type = THREE.BasicShadowMap;
  pcssInstalled = true;
  return true;
}

// ---------------------------------------------------------------------------
// Two shadow cascades.
//
// The sun's shadow box is +/-22 m around the truck, and it follows the truck.
// That is the right box for the thing PCSS exists for — the tyre in its rut,
// the bumper over the dirt — and it is the wrong box for everything else in
// the game: the camp is forty metres across and thirty off the road, the pride
// lies twenty-six metres from the verge, and the acacias line the corridor.
// All of it was shadowless whenever the truck was more than ~22 m away, which
// every critic saw before they saw anything else.
//
// So there are two maps now. The near one is unchanged: tight, PCSS-filtered,
// centred on the truck. The far one is a second `DirectionalLight` at zero
// intensity whose only job is to own a shadow map: +/-130 m, snapped to its
// own texel grid so the world's shadows do not crawl as the truck drives, and
// filtered with a plain five-tap disc — at 13 cm a texel a penumbra is not
// something this map can resolve, so it does not try.
//
// The two are combined in the shader, not by three: the lighting loop's call
// for directional light 0 is redirected to `getDirShadowCascade`, which takes
// the near result inside the near box, fades it into the far result over the
// last 6 % of the box, and answers 1.0 for light 1 so the carrier light costs
// a branch and nothing else. Doing it this way keeps a single key light in the
// BRDF — an intensity split between two lights would have given the camp a
// half-strength shadow — and keeps three's own shadow pass rendering the far
// map, which is what makes alpha-tested canopies and skinned lions cast
// correctly in it for free.
//
// The one uniform the filter needs at runtime rides on `ShaderLib`, the same
// way the haze fog does: a typed array that `cloneUniforms` copies by
// reference, so one write reaches every program. Zero reads as "use the baked
// constant" for any ShaderMaterial that includes the chunk without it.
// ---------------------------------------------------------------------------

const CASCADE = {
  // x: PCSS span for the near map ( depth range / box width ), which moves
  //    with the hour now that a low sun needs a deep box
  // y: far map filter radius in texels
  // z: far cascade strength, so the world's shadow can be a shade lighter
  //    than the truck's (the far map has no penumbra and reads harder)
  // w: unused
  params: new Float32Array([0, 1.5, 1, 0]),
};

let cascadeInstalled = false;

/** `?farshadow=off` builds without the far cascade, for A/B and cost. */
function farShadowMode() {
  try {
    return new URLSearchParams(location.search).get('farshadow') || 'live';
  } catch {
    return 'live';
  }
}

function installCascade(pcss, extent) {
  if (cascadeInstalled) return true;
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  const decl = chunk.indexOf('float getShadow(');
  const tail = decl < 0 ? -1 : chunk.indexOf('#if NUM_POINT_LIGHT_SHADOWS > 0', decl);
  const loop = THREE.ShaderChunk.lights_fragment_begin;
  const call =
    'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
  if (decl < 0 || tail < 0 || loop.indexOf(call) < 0) {
    console.warn('sky: cascade anchors not found, keeping the single shadow box');
    return false;
  }

  for (const key of Object.keys(THREE.ShaderLib)) {
    const u = THREE.ShaderLib[key].uniforms;
    if (!u || !u.directionalShadowMap) continue;
    u.uCascade = { value: CASCADE.params };
  }

  const structDecl = 'uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];';
  if (chunk.indexOf(structDecl) < 0) {
    console.warn('sky: cascade uniform anchor not found, keeping the single shadow box');
    return false;
  }

  const span = (SHADOW_FAR - SHADOW_NEAR) / (2 * extent);
  const body = /* glsl */ `
	${CASCADE_MARK}
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			#define CSC_SAMPLER sampler2DShadow
		#else
			#define CSC_SAMPLER sampler2D
		#endif
		float cscNoise( vec2 p ) {
			return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 cscDisk( int i, int n, float phi ) {
			const float golden = 2.399963229728653;
			float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
			float theta = float( i ) * golden + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
		#if NUM_DIR_LIGHT_SHADOWS > 1
		// The world's shadow: five taps on a rotated disc over the wide map.
		float cscFar( vec4 coord, vec2 mapSize, float bias ) {
			coord.xyz /= coord.w;
			coord.z += bias;
			if ( coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0 ) return 1.0;
			float r = ( uCascade.y > 0.0 ? uCascade.y : 1.5 ) / mapSize.x;
			float phi = cscNoise( gl_FragCoord.xy ) * PI2;
			float lit = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 o = cscDisk( i, 5, phi ) * r;
				#if defined( SHADOWMAP_TYPE_PCF )
					lit += texture( directionalShadowMap[ 1 ], vec3( coord.xy + o, coord.z ) );
				#else
					lit += step( coord.z, texture2D( directionalShadowMap[ 1 ], coord.xy + o ).r );
				#endif
			}
			return lit * 0.2;
		}
		#endif
		float getDirShadowCascade( int idx, CSC_SAMPLER shadowMap, DirectionalLightShadow s, vec4 coord ) {
			// light 1 is the far map's carrier: black, and never shadowed itself
			if ( idx != 0 ) return 1.0;
			float near = getShadow( shadowMap, s.shadowMapSize, s.shadowIntensity, s.shadowBias, s.shadowRadius, coord );
			#if NUM_DIR_LIGHT_SHADOWS > 1
				vec3 p = coord.xyz / coord.w;
				vec2 e = min( p.xy, 1.0 - p.xy );
				float inside = smoothstep( 0.0, 0.06, min( e.x, e.y ) ) * ( 1.0 - step( 1.0, p.z ) );
				if ( inside < 1.0 ) {
					DirectionalLightShadow f = directionalLightShadows[ 1 ];
					float far = cscFar( vDirectionalShadowCoord[ 1 ], f.shadowMapSize, f.shadowBias );
					far = mix( 1.0, far, s.shadowIntensity * ( uCascade.z > 0.0 ? uCascade.z : 1.0 ) );
					near = mix( far, near, inside );
				}
			#endif
			return near;
		}
	#endif
`;
  THREE.ShaderChunk.shadowmap_pars_fragment = (chunk.slice(0, tail) + body + '\t' + chunk.slice(tail)).replace(
    structDecl,
    `${structDecl}\n\t\tuniform vec4 uCascade;`,
  );
  THREE.ShaderChunk.lights_fragment_begin = loop.replace(
    call,
    'getDirShadowCascade( UNROLLED_LOOP_INDEX, directionalShadowMap[ i ], directionalLightShadow, vDirectionalShadowCoord[ i ] )',
  );
  CASCADE.params[0] = span;
  cascadeInstalled = true;
  return true;
}

let currentMode = 'day';

function modeOf(name) {
  return MODES[name] || MODES.day;
}

function dirFrom(az, el) {
  return new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - el),
    THREE.MathUtils.degToRad(az),
  );
}

function makeSkyMaterial(cfg, sunDir) {
  return new THREE.ShaderMaterial({
    name: 'ProceduralSky',
    uniforms: {
      uZenith: { value: cfg.zenith.clone() },
      uHorizon: { value: cfg.horizon.clone() },
      uHaze: { value: cfg.haze.clone() },
      uGround: { value: cfg.ground.clone() },
      uSunColor: { value: cfg.sunColor.clone() },
      uCloudCol: { value: cfg.cloudCol.clone() },
      uAnti: { value: cfg.anti.clone() },
      uAntiGain: { value: cfg.antiGain },
      uWarm: { value: cfg.warm },
      uHazeAniso: { value: cfg.hazeAniso ?? 0 },
      uSunDir: { value: sunDir.clone() },
      uSunDisc: { value: cfg.sunDisc },
      uGlow: { value: cfg.glow },
      uAureole: { value: cfg.aureole },
      uHazeFalloff: { value: cfg.hazeFalloff },
      uCloud: { value: cfg.cloud },
      uZenithPow: { value: cfg.zenithPow },
      uStars: { value: cfg.stars },
      uMilkyWay: { value: cfg.milkyWay },
      uMoonDetail: { value: cfg.moonDetail },
      uDisc: { value: new THREE.Vector2(cfg.disc[0], cfg.disc[1]) },
      uExposure: { value: 1.0 },
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
}

function applySkyUniforms(material, cfg, sunDir, { env = false } = {}) {
  const u = material.uniforms;
  u.uZenith.value.copy(cfg.zenith);
  u.uHorizon.value.copy(cfg.horizon);
  u.uHaze.value.copy(cfg.haze);
  u.uGround.value.copy(cfg.ground);
  u.uSunColor.value.copy(cfg.sunColor);
  u.uCloudCol.value.copy(cfg.cloudCol);
  u.uAnti.value.copy(cfg.anti);
  u.uAntiGain.value = cfg.antiGain;
  u.uWarm.value = cfg.warm;
  u.uHazeAniso.value = cfg.hazeAniso ?? 0;
  u.uSunDir.value.copy(sunDir);
  u.uSunDisc.value = env ? cfg.envDisc : cfg.sunDisc;
  u.uGlow.value = env ? cfg.envGlow : cfg.glow;
  u.uAureole.value = cfg.aureole;
  u.uHazeFalloff.value = cfg.hazeFalloff;
  u.uCloud.value = cfg.cloud;
  u.uZenithPow.value = cfg.zenithPow;
  // Stars in the environment map are noise in the PMREM mips and nothing else,
  // and a hard moon disc in there fireflies the low roughness levels.
  u.uStars.value = env ? 0 : cfg.stars;
  u.uMilkyWay.value = env ? 0 : cfg.milkyWay;
  u.uMoonDetail.value = env ? 0 : cfg.moonDetail;
  u.uDisc.value.set(cfg.disc[0], cfg.disc[1]);
}

/** The sky's own horizon colour for the current hour, in linear. */
export function horizonColor(mode = currentMode) {
  return horizonOf(modeOf(mode).sky);
}

// ---------------------------------------------------------------------------
// Atmospheric perspective.
//
// three's fog is a single colour at a single density over the whole volume,
// which is a corridor's fog. A plain wants two more things from it: the dust
// is a *layer*, densest at the ground and thinning with height, so a hilltop
// forty metres up sits in clearer air than the road under it; and the dust is
// *lit*, so the same distance goes to amber towards the sun and to the rose of
// the horizon band away from it. Both are added to three's own fog chunk so
// every built-in material in the scene — the terrain, the campground, the
// fleet, the roadside — picks them up without any of those files changing.
//
// The uniforms ride on `ShaderLib` as typed arrays. `cloneUniforms` copies a
// typed array by reference where it would clone a Vector or Color, so the one
// array here is the value every material's program reads, and updating it in
// place updates the whole scene for the cost of writing four floats. A
// ShaderMaterial that includes the fog chunks without these uniforms gets GLSL's
// zero defaults, and every term below is written so that zero is stock fog.
// ---------------------------------------------------------------------------

const HAZE = {
  // rgb: colour of sunlit dust; w: how far towards it the fog goes at the sun.
  // Only read by a material that has the fog chunk but not the sky terms
  // below (a ShaderMaterial merging UniformsLib.fog by hand); everything on
  // ShaderLib converges on the dome instead.
  sun: new Float32Array([0, 0, 0, 0]),
  // xyz: sun direction in *view* space; w: the lobe's exponent
  dir: new Float32Array([0, 0, 1, 1]),
  // x: 1 / scale height of the layer; y: how much of the layer to use;
  // z: world y the layer is referenced to (the road under the truck);
  // w: the camera's far plane, where the ground has to have gone to sky
  params: new Float32Array([0, 0, 0, 0]),
  // The sky dome's gradient, so the fog can evaluate the dome at the ray:
  //   hor:  horizon.rgb, zenithPow      zen:  zenith.rgb, hazeFalloff
  //   haze: haze.rgb, hazeAniso         anti: anti.rgb, antiGain
  //   sun:  sunColor.rgb * aureole, warm
  //   sdir: sun direction in *world* space, 1.0 when these are live
  skyHor: new Float32Array([0, 0, 0, 1]),
  skyZen: new Float32Array([0, 0, 0, 1]),
  skyHaze: new Float32Array([0, 0, 0, 0]),
  skyAnti: new Float32Array([0, 0, 0, 0]),
  skySun: new Float32Array([0, 0, 0, 0]),
  skyDir: new Float32Array([0, 1, 0, 0]),
};

let hazeInstalled = false;

function installHazeFog() {
  if (hazeInstalled) return;
  hazeInstalled = true;

  for (const key of Object.keys(THREE.ShaderLib)) {
    const u = THREE.ShaderLib[key].uniforms;
    if (!u || !u.fogColor) continue;
    u.uHazeSun = { value: HAZE.sun };
    u.uHazeDir = { value: HAZE.dir };
    u.uHazeParams = { value: HAZE.params };
    u.uSkyHor = { value: HAZE.skyHor };
    u.uSkyZen = { value: HAZE.skyZen };
    u.uSkyHaze = { value: HAZE.skyHaze };
    u.uSkyAnti = { value: HAZE.skyAnti };
    u.uSkySun = { value: HAZE.skySun };
    u.uSkyDir = { value: HAZE.skyDir };
  }

  THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogView;
#endif`;
  THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogView = mvPosition.xyz;
#endif`;
  THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	uniform vec4 uHazeSun;
	uniform vec4 uHazeDir;
	uniform vec4 uHazeParams;
	uniform vec4 uSkyHor, uSkyZen, uSkyHaze, uSkyAnti, uSkySun, uSkyDir;
	varying float vFogDepth;
	varying vec3 vFogView;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
  // Every guard here is against a NaN, because one NaN pixel is a black frame
  // once bloom has spread it: the direction is divided by a floored length, the
  // layer integral is taken in closed form with its own removable singularity
  // handled, the exponent is clamped so exp() cannot overflow to inf (and inf
  // times the zero it is then multiplied by is NaN), and the sun lobe's pow()
  // never sees a zero base against a zero exponent.
  THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
	float hzDist = length( vFogView );
	vec3 hzDir = vFogView / max( hzDist, 1e-4 );
	// column 1 of the view matrix is world up expressed in view space, so this
	// is the ray's world-space vertical component
	float hzRayY = dot( hzDir, viewMatrix[ 1 ].xyz );
	float hzB = uHazeParams.x;
	float hzT = clamp( hzRayY * hzB * hzDist, -20.0, 60.0 );
	float hzInt = abs( hzT ) > 1e-3 ? ( 1.0 - exp( -hzT ) ) / hzT : 1.0 - 0.5 * hzT;
	float hzLayer = exp( -clamp( ( cameraPosition.y - uHazeParams.z ) * hzB, -6.0, 20.0 ) ) * hzInt;
	float hzDens = mix( 1.0, clamp( hzLayer, 0.0, 40.0 ), uHazeParams.y );
	#ifdef FOG_EXP2
		float hzK = fogDensity * hzDens * hzDist;
		float fogFactor = 1.0 - exp( - hzK * hzK );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth * hzDens );
	#endif
	// The far plane cuts the plain off at a hard line unless the air has taken
	// it first. Whatever the density, the last stretch before the far plane goes
	// to sky. (An unpatched material reads w = 0 and gets no wall at all.)
	// The plain gets there first: a ray at or under the horizon is looking
	// along the dust layer at the ground, and what it reaches at 400 m is the
	// far plane's own cut a few hundred metres on, so it is taken to sky from
	// 0.42 of the far plane; a ray two degrees up is over the layer, looking at
	// a crest or a crown that stands clear of the plain, and keeps the wall at
	// 0.55. Measured before this from the pride into the sun: the straw flat at
	// 450-650 m was half its own lit colour and rendered as a yellow strip
	// under hills that were already blue-grey.
	float hzFar = uHazeParams.w > 1.0 ? uHazeParams.w : 1e9;
	float hzWall = mix( 0.42, 0.55, smoothstep( 0.0, 0.035, hzRayY ) );
	fogFactor = max( fogFactor, smoothstep( hzFar * hzWall, hzFar * ( hzWall + 0.37 ), hzDist ) );
	// The airlight is the sky in the ray's own direction — not a fog colour,
	// and not a lit-dust colour lifted towards the sun. Both of those were one
	// value along the whole horizon and both were brighter than the dome
	// renders at one to seven degrees, so every view into the sun had the far
	// plain fogging to a cream strip standing against a darker sky: a horizon
	// band, the same defect as the ridge cards. This is the dome's own gradient
	// (horizon, zenith, haze band with its anisotropy, warm side, earth shadow,
	// aureole — everything but the disc, the clouds and the stars) evaluated at
	// the ray, so the plain, the skirt and the treeline all fog to the pixel
	// the sky would have put there. A ray to the ground is taken at the
	// horizon: that is the sky it stands against. Reads the stock fog colour
	// with the sun lobe when the sky terms are not on the material.
	vec3 hzCol;
	if ( uSkyDir.w > 0.5 ) {
		vec3 hzW = vec3( dot( hzDir, viewMatrix[ 0 ].xyz ), max( hzRayY, 0.0 ), dot( hzDir, viewMatrix[ 2 ].xyz ) );
		hzW /= max( length( hzW ), 1e-4 );
		float skyH = hzW.y;
		float skyC = clamp( dot( hzW, uSkyDir.xyz ), -1.0, 1.0 );
		float skyHaze = exp( -skyH * uSkyZen.w );
		float skySide = smoothstep( -1.0, 1.0, skyC );
		vec3 sky = mix( uSkyHor.rgb, uSkyZen.rgb, pow( skyH, uSkyHor.w ) );
		sky = mix( sky, uSkyHaze.rgb, skyHaze * 0.52 * mix( 1.0, 0.5 + 0.5 * skySide, uSkyHaze.w ) );
		sky = mix( sky, uSkyHaze.rgb, skyHaze * skySide * uSkySun.w );
		sky = mix( sky, uSkyAnti.rgb, pow( max( -skyC, 0.0 ), 2.5 ) * skyHaze * uSkyAnti.w );
		sky += uSkySun.rgb * pow( max( skyC, 0.0 ), 6.0 ) * ( 0.35 + skyHaze * 0.9 );
		// three applies fog after tone mapping and the output transfer, so the
		// blend is in display space and the target has to be the *displayed*
		// sky: the same tone curve and OETF the dome went through, or a linear
		// radiance is read as a display value and the plain fogs a stop dark.
		#if defined( TONE_MAPPING )
			sky = toneMapping( sky );
		#endif
		hzCol = linearToOutputTexel( vec4( sky, 1.0 ) ).rgb;
	} else {
		float hzSun = pow( max( dot( hzDir, uHazeDir.xyz ), 0.0 ), max( uHazeDir.w, 1.0 ) );
		hzCol = mix( fogColor, uHazeSun.rgb, hzSun * uHazeSun.w );
	}
	gl_FragColor.rgb = mix( gl_FragColor.rgb, hzCol, fogFactor );
#endif`;
}

const _hzQ = new THREE.Quaternion();
const _hzV = new THREE.Vector3();
const _hzC = new THREE.Color();

function applyHaze(cfg, sunDir) {
  const f = cfg.fog;
  const c = _hzV.set(0, 0, 0);
  if (f.sunGain > 0) {
    // Fallback only (see HAZE.sun): the lit dust as the haze colour lifted.
    const s = cfg.sky.haze;
    c.set(s.r, s.g, s.b).multiplyScalar(1.35);
  }
  HAZE.sun[0] = c.x;
  HAZE.sun[1] = c.y;
  HAZE.sun[2] = c.z;
  HAZE.sun[3] = f.sunGain ?? 0;
  HAZE.dir[3] = f.sunPow ?? 3;
  HAZE.params[0] = f.height ?? 0;
  HAZE.params[1] = f.heightMix ?? 0;

  // The dome's gradient, exactly as `skyFragment` has it, for the fog to
  // evaluate at the ray. Written once per hour; the dome reads the same
  // config, so the two cannot drift apart.
  const k = cfg.sky;
  const put = (arr, col, w) => {
    arr[0] = col.r;
    arr[1] = col.g;
    arr[2] = col.b;
    arr[3] = w;
  };
  put(HAZE.skyHor, k.horizon, k.zenithPow);
  put(HAZE.skyZen, k.zenith, k.hazeFalloff);
  put(HAZE.skyHaze, k.haze, k.hazeAniso ?? 0);
  put(HAZE.skyAnti, k.anti, k.antiGain);
  put(HAZE.skySun, _hzC.copy(k.sunColor).multiplyScalar(k.aureole), k.warm);
  HAZE.skyDir[0] = sunDir.x;
  HAZE.skyDir[1] = sunDir.y;
  HAZE.skyDir[2] = sunDir.z;
  HAZE.skyDir[3] = skyFogOff() ? 0 : 1;
}

/** `?skyfog=off` fogs to the flat colour plus sun lobe instead, for the A/B. */
function skyFogOff() {
  try {
    return new URLSearchParams(location.search).get('skyfog') === 'off';
  } catch {
    return false;
  }
}

/** Per frame: the sun in view space, and the ground level the layer sits on. */
function updateHaze(camera, sunDir, groundY) {
  camera.getWorldQuaternion(_hzQ).invert();
  _hzV.copy(sunDir).applyQuaternion(_hzQ);
  HAZE.dir[0] = _hzV.x;
  HAZE.dir[1] = _hzV.y;
  HAZE.dir[2] = _hzV.z;
  HAZE.params[2] = groundY;
  HAZE.params[3] = camera.far || 0;
}

// ---------------------------------------------------------------------------
// Atmosphere: sky dome, the key light, canopy fill, exponential fog, and the
// volumetric shafts + dust that sell "forest". The sky is also the PMREM
// source, so every metal on the truck reflects the actual environment rather
// than a grey box.
// ---------------------------------------------------------------------------

export function sunDirection(mode = currentMode) {
  const k = modeOf(mode).key;
  return dirFrom(k.az, k.el);
}

/** The crepuscular-ray settings for an hour, read by the post chain. */
export function raysOf(mode = currentMode) {
  return modeOf(mode).rays || { color: 0xffffff, gain: 0 };
}

// ---------------------------------------------------------------------------
// Retuning everything that is *not* a light.
//
// Half the lighting in this scene lives in analytic shader terms rather than in
// three's light list: the truck's graded brightwork reflection, the cabin
// bounce and its daylight model, the foliage's own sky/ground wrap, the puddle
// mirrors, the dust plume's key. Every one of those was authored against a warm
// afternoon and every one of them has to move, or night is a dark scene with
// daylight painted on the surfaces.
//
// They are all reachable at runtime: three's `onBeforeCompile` users in this
// project keep their uniform bag on `material.userData`, so the whole set can be
// found by walking the scene graph. Base values are captured on first sight, so
// day is always an exact restore rather than an inverse of the night maths.
// ---------------------------------------------------------------------------

const HUE_NIGHT = 0x7ea2dc;
const HUE_NIGHT_DEEP = 0x3d5c8c;
const HUE_DUSK = 0xffa862;
const HUE_DUSK_COOL = 0x8590b8;
// Overcast has one hue: the cloud deck. Every term that was a sun or a sky
// converges on it, and the ratios between them flatten.
const HUE_GREY = 0xc4c8cc;
const HUE_GREY_DEEP = 0x8a9098;

// `hue` recolours while keeping the base's own lightness, so materials that
// deliberately differ in strength keep differing.
const RETUNE = {
  // --- vehicle: graded analytic reflection --------------------------------
  uBwSky: {
    dusk: { hue: HUE_DUSK_COOL, mul: 0.85 },
    night: { hue: HUE_NIGHT_DEEP, mul: 0.30 },
    overcast: { hue: HUE_GREY, sat: 0.9, mul: 1.05 },
  },
  uBwRim: {
    dusk: { hue: HUE_DUSK, sat: 0.75, mul: 0.75 },
    night: { hue: HUE_NIGHT, mul: 0.58 },
    overcast: { hue: HUE_GREY, sat: 0.9, mul: 0.5 },
  },
  uBwGround: { dusk: { mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.5, mul: 0.4 }, overcast: { sat: 0.6, hue: 0x8a7e70, mul: 0.9 } },
  uBwWall: { dusk: { mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.5, mul: 0.4 }, overcast: { sat: 0.6, hue: 0x8a7e70, mul: 0.9 } },
  uBwStrength: { dusk: { mul: 1.0 }, night: { mul: 1.0 }, overcast: { mul: 0.9 } },
  uBwAmbient: { dusk: { mul: 0.85 }, night: { mul: 0.42 }, overcast: { mul: 1.1 } },

  // --- vehicle: cabin inter-reflection ------------------------------------
  uCbGain: { dusk: { mul: 0.6 }, night: { mul: 0.3 }, overcast: { mul: 0.85 } },
  uCbFloor: { dusk: { mul: 0.6 }, night: { mul: 0.3 }, overcast: { mul: 0.85 } },
  uCbSpec: { dusk: { mul: 0.8 }, night: { mul: 0.5 }, overcast: { mul: 0.7 } },
  uCbColor: { dusk: { hue: 0xffb98a, sat: 0.7 }, night: { hue: 0xffd9a8, sat: 0.55 }, overcast: { hue: HUE_GREY, sat: 0.7 } },

  // --- cabin daylight model ------------------------------------------------
  // Nothing comes through the screen at night, so the cab is lit by the dash
  // and by whatever the headlamps throw back off the trail. Gains collapse and
  // the aperture colours go cool, which is what leaves the instrument backlight
  // as the only warm thing in the frame.
  uClGain: { dusk: { mul: 0.5 }, night: { mul: 0.17 }, overcast: { mul: 0.8 } },
  uClSide: { dusk: { mul: 0.5 }, night: { mul: 0.15 }, overcast: { mul: 0.8 } },
  uClUp: { dusk: { mul: 0.55 }, night: { mul: 0.2 }, overcast: { mul: 1.0 } },
  uClSun: { dusk: { mul: 0.55 }, night: { mul: 0.08 }, overcast: { mul: 0.25 } },
  uClFill: { dusk: { mul: 0.6 }, night: { mul: 0.28 }, overcast: { mul: 0.9 } },
  uClSpec: { dusk: { mul: 0.8 }, night: { mul: 0.45 }, overcast: { mul: 0.7 } },
  uClColor: { dusk: { hue: 0xffb173, sat: 0.85 }, night: { hue: HUE_NIGHT, sat: 0.8 }, overcast: { hue: HUE_GREY, sat: 0.8 } },
  uClSideColor: { dusk: { hue: 0xa08098, sat: 0.7 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.7 }, overcast: { hue: HUE_GREY_DEEP, sat: 0.7 } },
  uClSunColor: { dusk: { hue: HUE_DUSK }, night: { hue: HUE_NIGHT, sat: 0.7 }, overcast: { hue: HUE_GREY, sat: 0.8 } },

  // --- vegetation ----------------------------------------------------------
  uSunTint: {
    dusk: { hue: HUE_DUSK, sat: 0.8, mul: 0.95 },
    night: { hue: HUE_NIGHT, mul: 0.3 },
    overcast: { hue: HUE_GREY, sat: 0.9, mul: 0.45 },
  },
  uDirect: { dusk: { mul: 0.9 }, night: { mul: 0.55 }, overcast: { mul: 0.45 } },
  uSky: { dusk: { hue: HUE_DUSK_COOL, mul: 1.0 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.3 }, overcast: { hue: HUE_GREY, sat: 0.9, mul: 1.5 } },
  uGnd: { dusk: { hue: 0xa2734d, sat: 0.7, mul: 0.8 }, night: { hue: 0x35404a, mul: 0.24 }, overcast: { sat: 0.5, hue: 0x8a7e70, mul: 1.0 } },
  uRim: { dusk: { hue: HUE_DUSK, mul: 1.4 }, night: { hue: HUE_NIGHT, mul: 0.3 }, overcast: { hue: HUE_GREY, mul: 0.4 } },
  // The far trees fog to the same lit dust the terrain does.
  uHazeCol: { dusk: { hue: 0xc98a5a, mul: 1.1 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.42 }, overcast: { hue: 0xb8b2a8, sat: 0.9, mul: 1.6 } },
  uHazeCol2: { dusk: { hue: 0xd89a66, mul: 1.1 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.42 }, overcast: { hue: 0xbfb9ae, sat: 0.9, mul: 1.6 } },

  // --- puddles and airborne dust ------------------------------------------
  uSunCol: { dusk: { hue: HUE_DUSK, mul: 0.95 }, night: { hue: HUE_NIGHT, mul: 0.14 }, overcast: { hue: HUE_GREY, sat: 0.9, mul: 0.45 } },
  uShadeCol: { dusk: { hue: 0x9a6a4a, mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.35 }, overcast: { hue: HUE_GREY_DEEP, sat: 0.8, mul: 1.2 } },
  uSkyTop: { dusk: { hue: HUE_DUSK_COOL, mul: 0.75 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.13 }, overcast: { hue: HUE_GREY_DEEP, sat: 0.9, mul: 1.2 } },
  uSkyLow: { dusk: { hue: HUE_DUSK, mul: 0.85 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.2 }, overcast: { hue: HUE_GREY, sat: 0.9, mul: 1.1 } },
};

const _hslA = { h: 0, s: 0, l: 0 };
const _hslB = { h: 0, s: 0, l: 0 };
const _tmpCol = new THREE.Color();

function shiftColor(out, base, spec) {
  out.copy(base);
  if (spec.hue !== undefined) {
    base.getHSL(_hslA);
    _tmpCol.set(spec.hue).getHSL(_hslB);
    const sat = spec.sat === undefined ? 1 : spec.sat;
    out.setHSL(_hslB.h, THREE.MathUtils.lerp(_hslA.s, _hslB.s, sat), _hslA.l);
  }
  if (spec.mul !== undefined) out.multiplyScalar(spec.mul);
}

/**
 * Every uniform bag hanging off a material: the ShaderMaterial's own, plus the
 * `onBeforeCompile` bags this project keeps on `userData`.
 */
function uniformBags(mat, out) {
  if (mat.uniforms) out.push(mat.uniforms);
  const ud = mat.userData;
  if (!ud) return out;
  for (const key of Object.keys(ud)) {
    const bag = ud[key];
    if (!bag || typeof bag !== 'object' || Array.isArray(bag) || bag.isColor || bag.isTexture) continue;
    for (const k of Object.keys(bag)) {
      const slot = bag[k];
      if (slot && typeof slot === 'object' && 'value' in slot) {
        out.push(bag);
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Quality tiers.
//
// `fast` is what the software-rendered capture harness runs and has to stay
// cheap; `high` is a laptop at 60; `ultra` is where the budget of a discrete
// card actually goes.
//
// `extent` is the half-width of the sun's orthographic shadow box, so the map
// covers 2 x extent metres. Today that is +/-22 m at 2048, or 21.5 mm a texel,
// and 22 m from the truck is roughly where the near treeline starts — nothing
// past the first row of trunks has ever cast. `high` keeps exactly that.
//
// Ultra spends its four times the texels on both: +/-34 m is 55 per cent more
// reach *and* 16.6 mm a texel, a third sharper than today. Spending all of it
// on reach instead (+/-44 m at the same texel size) puts the far treeline in
// but leaves the wheel contact no crisper, and the contact is what a PCSS
// filter has to have to harden against.
// ---------------------------------------------------------------------------
//
// `farExtent` is the half-width of the second, world cascade. +/-130 m holds
// the whole camp with the truck parked on the road beside it, the pride from
// the road with forty metres to spare, and two rows of acacias either side of
// the corridor. `farSize` is its map: 2048 is 12.7 cm a texel, 4096 is 6.3.
//
// `farCadence` is how many frames the far map lives before it is re-rendered.
// The pass draws every caster within 260 m — measured at +209 draw calls and
// +0.9 M triangles a frame on the camp's mess framing — and what it draws is
// scenery that does not move plus animals that move slowly, so at 2 the
// world's shadows update at half rate and the pass costs half. The matrix and
// the map are always a consistent pair (three updates both in the same
// render), so a held frame is a correct frame, just one the truck has driven
// a few centimetres past. Ultra pays for every frame.
const SKY_TIERS = {
  fast: { shadowExtent: 22, farExtent: 130, farSize: 2048, farCadence: 2, envSize: 256, pcss: null, beamSlices: 12 },
  high: { shadowExtent: 22, farExtent: 130, farSize: 2048, farCadence: 2, envSize: 512, pcss: { blocker: 8, filter: 12 }, beamSlices: 20 },
  ultra: { shadowExtent: 34, farExtent: 130, farSize: 4096, farCadence: 1, envSize: 1024, pcss: { blocker: 16, filter: 28 }, beamSlices: 44 },
};

/**
 * How deep the shadow box has to be for this sun.
 *
 * The ortho box is +/-extent in light space, so at a low elevation its
 * footprint on the ground is a strip `extent / sin(el)` long along the sun's
 * azimuth, and the tallest caster up-sun of that strip throws a shadow
 * `h / tan(el)` long into it. At 58 degrees both are a few tens of metres and
 * the old fixed 260 m range covered them; at 6 degrees the near box alone
 * wants two hundred metres up-sun, which is what a golden-hour shadow across
 * the road *is*. Capped, because past 400 m the depth precision is being spent
 * on trees the fog has already taken.
 */
function shadowReach(el, extent, tallest = 26) {
  const rad = THREE.MathUtils.degToRad(Math.max(el, 3));
  const ground = extent / Math.sin(rad);
  const caster = tallest / Math.tan(rad);
  const dist = THREE.MathUtils.clamp(Math.max(ground, caster) + 40, 110, 400);
  return { dist, far: dist * 2 };
}

// ---------------------------------------------------------------------------
// What the far cascade draws.
//
// The far map is 12.7 cm a texel at fast and high. Nothing under about a texel
// across registers in it as more than a flicker, and the pass was drawing all
// of it: every scrub bucket, every stone cluster, the camp's rope and wire,
// the tarp, the signs, and the truck as a hundred separate trim meshes — 307
// draw calls and a million triangles on the frames that render the map, for
// a map whose useful content is trees, rock, structures, vehicles and animals.
//
// The cut is made once per object, by size, and recorded as a layer. Three's
// shadow pass tests `object.layers` against the *viewing* camera, not the
// shadow camera (WebGLShadowMap.renderObject), and it renders every light's
// map in the one pass, so a layer on the far light alone cannot cull anything
// — measured: 305 far-pass draw calls with and without one. So the far map is
// rendered in its own pass: `renderFarMap` renders the scene once more into a
// 2x2 target through a camera that is on `FAR_LAYER` only and is parked a
// hundred kilometres under the world, so the beauty half of that render
// frustum-culls to nothing and the shadow half draws exactly the far light
// (also on the layer) with exactly the tagged casters. Objects keep layer 0,
// so the main camera and the near map are untouched, and the far light keeps
// layer 0 so the main pass still lists it and uploads its map and matrix.
// Size is the object's *own* geometry under its world scale, not its instance
// spread — a field of two hundred pebbles has an eighty-metre bounding box
// and a thirty-centimetre pebble. A skinned mesh is an animal and is always
// in.
// The truck's cut is by height alone: at 1.2 m it keeps the body shells and
// the canvas, which is the silhouette a long dusk shadow up the road is made
// of, and drops the trim, the tyres and the running gear, whose contact
// shadows are the near map's whole job. The names are the ground cover and
// the thin stuff that no size rule catches: a wire is fifty metres wide.
// ---------------------------------------------------------------------------
const FAR_LAYER = 21;
const FAR_SKIP = /grass|scrub|forb|litter|wire|rope|decal|stone|wear|badge|ash|beacon/i;
const _fbS = new THREE.Vector3();

function farCasterOf(o) {
  if (!o.isMesh || !o.castShadow) return false;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (FAR_SKIP.test(o.name) || (m && FAR_SKIP.test(m.name || ''))) return false;
  if (o.isSkinnedMesh) return true;
  const g = o.geometry;
  if (!g) return false;
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox;
  if (!bb || !Number.isFinite(bb.min.x) || !Number.isFinite(bb.max.x)) return false;
  o.getWorldScale(_fbS);
  const h = (bb.max.y - bb.min.y) * Math.abs(_fbS.y);
  const w = Math.max((bb.max.x - bb.min.x) * Math.abs(_fbS.x), (bb.max.z - bb.min.z) * Math.abs(_fbS.z));
  return o.isInstancedMesh ? h >= 0.8 || w >= 2 : h >= 1.2;
}

/** `?farcull=off` lets the far map draw every caster again, for the A/B. */
function farCullOff() {
  try {
    return new URLSearchParams(location.search).get('farcull') === 'off';
  } catch {
    return false;
  }
}

/** `?shadowextent=60` widens the single near box instead, for the A/B. */
function extentOverride(base) {
  try {
    const v = Number(new URLSearchParams(location.search).get('shadowextent'));
    return v > 4 && v < 400 ? v : base;
  } catch {
    return base;
  }
}

export function createSky(
  scene,
  renderer,
  { shadowMapSize = 2048, envSamples = 512, timeOfDay = 'day', quality = 'high' } = {},
) {
  const tier = SKY_TIERS[quality] || SKY_TIERS.high;
  let modeName = MODES[timeOfDay] ? timeOfDay : 'day';
  currentMode = modeName;
  let cfg = modeOf(modeName);
  const sunDir = dirFrom(cfg.key.az, cfg.key.el);

  const nearExtent = extentOverride(tier.shadowExtent);
  const farMode = farShadowMode();
  const cascade = farMode !== 'off' && installCascade(tier.pcss, nearExtent);
  const softShadows = installPcss(renderer, tier.pcss, nearExtent);
  // Before any material compiles: this is the first thing boot builds.
  installHazeFog();
  applyHaze(cfg, sunDir);

  // PMREM resolution, not a blur radius.
  //
  // `fromScene`'s second argument is sigma — a pre-blur in *radians* — and the
  // tier table hands this 256, 512 or 1024. Three clamps that to twenty taps
  // and warns, and what comes back is the sky convolved into an even dome: the
  // aureole, the horizon band and the trunk cards that give metal something to
  // break up on were all being averaged away before a single material saw them.
  // The size the tier means belongs in `options.size`, where 1024 buys four
  // times the angular resolution in every reflection in the scene.
  const envSize = envSamples >= 16 ? Math.round(envSamples) : tier.envSize;
  // and no pre-blur at all: PMREM's own roughness convolution is the blur, and
  // a sigma on top of it only costs a pass and clips against three's 20-tap cap.
  const envSigma = envSamples > 0 && envSamples < 16 ? envSamples : 0;
  // `fromScene`'s far plane defaults to 100 and the dome this renders is at
  // 500, the ground disc at 400 and the trunk cards at 120-150 — so every
  // single thing in the environment scene has been outside the cube camera's
  // far plane and the map has been the clear colour. `?env=legacy` reproduces
  // that, for A/B against everything the scene was tuned under.
  const envFar = legacyEnv() ? 100 : 1000;

  const skyMaterial = makeSkyMaterial(cfg.sky, sunDir);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), skyMaterial);
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.scale.setScalar(500);
  scene.add(sky);

  // --- image based lighting ------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envSkyMaterial = makeSkyMaterial(cfg.sky, sunDir);
  // the environment does not need a hard sun disc; the directional light is
  // already carrying that energy and a hot disc just fireflies the PMREM mips
  applySkyUniforms(envSkyMaterial, cfg.sky, sunDir, { env: true });
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), envSkyMaterial);
  envScene.add(envSky);

  // The environment is a savanna.
  //
  // Every material's ambient and reflection response reads from this scene, so
  // what is under the horizon here is what the underside of the truck, the
  // shadow side of a tyre and the lower half of a chrome bumper all think the
  // world is. It was a dark green forest floor ringed with trunks; it is a lit
  // straw plain now, with a ring of flat-topped acacia silhouettes standing on
  // the horizon so a reflection has a skyline to break on, and a warm dark band
  // just under the horizon where the plain runs out into haze.
  const envGround = { day: 0xa8874e, dusk: 0x3a2416, night: 0x07080a, overcast: 0x6e665a };
  const envGroundNear = { day: 0x7e5a36, dusk: 0x22150d, night: 0x040507, overcast: 0x4a4540 };
  const envTree = { day: 0x2b2a1c, dusk: 0x140d09, night: 0x040507, overcast: 0x3d3d38 };
  const groundMat = new THREE.MeshBasicMaterial({ color: envGround.day, side: THREE.BackSide });
  const groundDisc = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    groundMat,
  );
  envScene.add(groundDisc);
  // The nearer ground, darker: what a bumper sees straight down is earth in
  // the truck's own shadow, not the lit plain out at the horizon.
  const groundNearMat = new THREE.MeshBasicMaterial({ color: envGroundNear.day, side: THREE.BackSide });
  const groundNear = new THREE.Mesh(
    new THREE.SphereGeometry(390, 24, 8, 0, Math.PI * 2, Math.PI * 0.68, Math.PI * 0.32),
    groundNearMat,
  );
  envScene.add(groundNear);
  const treeMat = new THREE.MeshBasicMaterial({ color: envTree.day, side: THREE.DoubleSide });
  const crownGeo = new THREE.CircleGeometry(1, 14);
  const trunkGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.sin(i * 2.3) * 0.13;
    const r = 130 + ((i * 37) % 11) * 12;
    const h = 7 + ((i * 13) % 7) * 0.9;
    const w = h * (1.3 + ((i * 7) % 5) * 0.22);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // umbrella crown: a wide ellipse, flat on top, sitting on a thin trunk
    const crown = new THREE.Mesh(crownGeo, treeMat);
    crown.scale.set(w * 0.5, h * 0.17, 1);
    crown.position.set(x, h * 0.86, z);
    crown.lookAt(0, h * 0.86, 0);
    envScene.add(crown);
    const trunk = new THREE.Mesh(trunkGeo, treeMat);
    trunk.scale.set(0.35 + h * 0.02, h * 0.8, 1);
    trunk.position.set(x, h * 0.4, z);
    trunk.lookAt(0, h * 0.4, 0);
    envScene.add(trunk);
  }
  // a couple of distant koppies, so one side of the horizon is not the other
  for (let i = 0; i < 3; i++) {
    const a = 0.9 + i * 2.1;
    const kop = new THREE.Mesh(crownGeo, treeMat);
    kop.scale.set(90 + i * 40, 9 + i * 3, 1);
    kop.position.set(Math.cos(a) * 320, 2, Math.sin(a) * 320);
    kop.lookAt(0, 2, 0);
    envScene.add(kop);
  }

  let envRT = pmrem.fromScene(envScene, envSigma, 0.1, envFar, { size: envSize });
  let env = envRT.texture;
  scene.environment = env;
  // The art fill is a spot now, so the ground past its throw has only sun and
  // sky to model the ruts with. Sky it is.
  scene.environmentIntensity = cfg.envIntensity;

  // --- fog -----------------------------------------------------------------
  scene.fog = new THREE.FogExp2(cfg.fog.color, cfg.fog.density);

  // --- lights --------------------------------------------------------------
  const sun = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
  sun.name = 'sun';
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = SHADOW_NEAR;
  sun.shadow.camera.far = SHADOW_FAR;
  const s = nearExtent;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.blurSamples = 12;
  // Depth bias is measured in texels, and a texel is now a different size.
  const texelScale = (s / 22) * (2048 / shadowMapSize);
  scene.add(sun);
  scene.add(sun.target);
  sunShadowRef = softShadows ? sun.shadow : null;

  // The far cascade's carrier. Added directly after the sun so three's
  // shadow-casting-first sort leaves it at index 1, which is the slot the
  // shader reads it from. Black: it lights nothing, it only renders a map.
  const fs = tier.farExtent;
  const shadowMapFarSize = tier.farSize;
  const sunFar = cascade ? new THREE.DirectionalLight(0x000000, 0) : null;
  const farTexel = (2 * fs) / shadowMapFarSize;
  if (sunFar) {
    sunFar.name = 'sunFar';
    sunFar.castShadow = true;
    sunFar.shadow.mapSize.set(shadowMapFarSize, shadowMapFarSize);
    sunFar.shadow.camera.left = -fs;
    sunFar.shadow.camera.right = fs;
    sunFar.shadow.camera.top = fs;
    sunFar.shadow.camera.bottom = -fs;
    sunFar.shadow.camera.near = SHADOW_NEAR;
    sunFar.shadow.camera.far = 600;
    // Rendered on request, never automatically: `followFar` decides when.
    // `static` renders the map once per re-centre rather than on the cadence:
    // the fixed scenery is baked, the animals lag until the next refresh.
    sunFar.shadow.autoUpdate = false;
    sunFar.shadow.needsUpdate = true;
    scene.add(sunFar);
    scene.add(sunFar.target);
  }
  // The far map's own render (see FAR_LAYER). Null with `?farcull=off`, when
  // the map is rendered by the main pass with every caster in it, as before.
  const farPre =
    sunFar && !farCullOff()
      ? {
          cam: new THREE.PerspectiveCamera(1, 1, 0.1, 0.2),
          rt: new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, stencilBuffer: false }),
        }
      : null;
  if (farPre) {
    farPre.cam.layers.set(FAR_LAYER);
    farPre.cam.position.set(0, -1e5, 0);
    farPre.cam.lookAt(0, -1e5 - 1, 0);
    farPre.cam.updateMatrixWorld();
    sunFar.layers.enable(FAR_LAYER);
  }
  function renderFarMap() {
    const prevTarget = renderer.getRenderTarget();
    const prevAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = true;
    renderer.setRenderTarget(farPre.rt);
    renderer.render(scene, farPre.cam);
    // `info` resets per render, so what it holds now is this pass alone; the
    // frame's own counters will not include it, and the stats tools read
    // these instead.
    farState.passCalls = renderer.info.render.calls;
    farState.passTris = renderer.info.render.triangles;
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.autoUpdate = prevAuto;
  }
  // Tag what the far map may draw (see FAR_LAYER). Every object is classified
  // once; the pass is repeated on a slow cadence for what arrives later — the
  // pride spawns and re-tiers after boot, the fleet is parked after the camp.
  const farList = [];
  function tagFarCasters() {
    if (!sunFar) return;
    farList.length = 0;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.__farTag) {
        o.userData.__farTag = true;
        o.userData.__farCast = farCasterOf(o);
      }
      if (o.userData.__farCast) farList.push(o);
    });
  }
  // A caster whose shadow cannot leave the near box has nothing to add to the
  // far map: the near map already has it, at six times the resolution. At a
  // noon sun that is the whole truck — seventeen shells and a quarter of a
  // million triangles casting a shadow a metre and a half long, in a box that
  // reaches twenty-two — and at dusk, when the same truck throws twenty metres
  // up the road, it is back in. Instanced fields are always in: their bounds
  // are the field's.
  const _fbC = new THREE.Vector3();
  function cullFarByReach(centre) {
    const el = Math.max(Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1)), 0.05);
    const reachK = 2 / Math.tan(el);
    const inner = nearExtent * 0.9;
    for (const o of farList) {
      if (o.isInstancedMesh || o.isSkinnedMesh || !o.geometry) {
        o.layers.enable(FAR_LAYER);
        continue;
      }
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const bs = g.boundingSphere;
      o.getWorldScale(_fbS);
      const r = bs.radius * Math.max(Math.abs(_fbS.x), Math.abs(_fbS.y), Math.abs(_fbS.z));
      _fbC.copy(bs.center).applyMatrix4(o.matrixWorld);
      const stays = _fbC.distanceTo(centre) + r + r * reachK < inner;
      if (stays) o.layers.disable(FAR_LAYER);
      else o.layers.enable(FAR_LAYER);
    }
  }
  const farCadence = farMode === 'static' ? 0 : farMode === 'every' ? 1 : tier.farCadence;
  const farState = { centre: new THREE.Vector3(NaN, NaN, NaN), dist: 300, mode: '', frame: 0, passCalls: 0, passTris: 0 };
  const _fr = new THREE.Vector3();
  const _fu = new THREE.Vector3();
  const _fc = new THREE.Vector3();
  let nearDist = 110;

  // Sky fill from above, warm bounce from the litter below.
  //
  // The sky half is a canopy-filtered skylight, not PALETTE.skyTop. Open zenith
  // blue measures 0.32 saturation and almost none of it reaches a forest floor
  // undiluted — feeding it in raw put a cobalt cast on every shadowed surface in
  // the scene, and the PMREM environment is already carrying the real sky's
  // colour, so this was double-counting it as well. Same luminance (0.20 linear),
  // a tenth the chroma, with green fractionally over blue.
  const hemi = new THREE.HemisphereLight(cfg.hemi.sky, cfg.hemi.ground, cfg.hemi.intensity);
  scene.add(hemi);

  // a cool rim from the opposite side keeps the shadow side from going dead
  const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity);
  rim.position.set(-sunDir.x * 60, 30, -sunDir.z * 60);
  scene.add(rim);

  // Art-directed fill.
  //
  // There is a hard conflict between canopy clearance and side modelling: a low
  // sun rakes the flanks beautifully but a 24 m tree needs about 40 m of
  // clearance before it stops shading the road, and a sun high enough to clear
  // the canopy arrives from almost straight above, which leaves every vertical
  // panel flat. Car photography solves this with a bounce card rather than by
  // moving the sun, so this is a low, warm light that models the flanks.
  //
  // It is a spot with a cutoff rather than a directional, because a directional
  // fill lights the entire forest as well and that is what was flattening every
  // wide shot: no shadow anywhere had any contrast left. A card only throws a
  // few metres, so this one does too.
  const fillDir = dirFrom(cfg.fill.az, cfg.fill.el);
  let fillThrow = cfg.fill.throw;
  // 26 was measured too hot: the close views came back with the tyres and the
  // arch washed to pale grey and the frame clipping at 0.99.
  const fill = new THREE.SpotLight(cfg.fill.color, cfg.fill.intensity, 42, cfg.fill.angle, 1.0, 1.0);
  fill.position.copy(fillDir).multiplyScalar(fillThrow);
  fill.castShadow = false;
  scene.add(fill);
  scene.add(fill.target);

  // A beam is a stack of billboards standing in for a scattering integral, so
  // slice count *is* its quality: at 12 the discs read individually where the
  // cone is widest, and every extra slice both smooths that and refines the
  // dust noise sampled through it. The per-slice intensity divides by the
  // count, so the integrated brightness of the beam does not move with the tier.
  const beams = createHeadlightBeams(tier.beamSlices);
  scene.add(beams.group);
  publishBeamState(beams.state);

  applyShadow(cfg);
  followFar(sun.target.position);

  function applyShadow(c) {
    sun.shadow.radius = c.shadow.radius;
    // The box is as deep as the hour's sun needs, and the depth bias is a
    // fraction of that depth, so it is rescaled to stay the same few
    // centimetres of world whatever the range.
    const reach = shadowReach(c.key.el, s);
    nearDist = reach.dist;
    sun.shadow.camera.far = reach.far;
    sun.shadow.camera.updateProjectionMatrix();
    const rangeK = (SHADOW_FAR - SHADOW_NEAR) / (reach.far - SHADOW_NEAR);
    CASCADE.params[0] = (reach.far - SHADOW_NEAR) / (2 * s);
    // Both biases are a defence against a receiver self-shadowing across the
    // width of one shadow texel, so both scale with how much world a texel
    // covers. PCSS filters over a variable radius rather than a fixed five
    // taps, so it needs a little more of the depth bias than the stock filter
    // does — a penumbra that reaches twenty texels reaches twenty texels of
    // slope error with it.
    sun.shadow.bias = c.shadow.bias * texelScale * (softShadows ? 1.6 : 1) * rangeK;
    sun.shadow.normalBias = c.shadow.normalBias * texelScale;
    if ('intensity' in sun.shadow) sun.shadow.intensity = c.shadow.intensity;

    if (sunFar) {
      const farReach = shadowReach(c.key.el, fs);
      farState.dist = farReach.dist;
      sunFar.shadow.camera.far = farReach.far;
      sunFar.shadow.camera.updateProjectionMatrix();
      // A texel of the far map is six times the near one's, so the biases are
      // six times as well — but only the depth bias in full. The normal bias
      // pushes the lookup along the receiver's normal, and at 12.7 cm a texel
      // the full ratio lifts a tent's shadow off its own guy-ropes.
      const farTexelScale = (farTexel / (44 / 2048));
      const farRangeK = (SHADOW_FAR - SHADOW_NEAR) / (farReach.far - SHADOW_NEAR);
      sunFar.shadow.bias = c.shadow.bias * farTexelScale * farRangeK;
      sunFar.shadow.normalBias = c.shadow.normalBias * farTexelScale * 0.6;
      sunFar.shadow.radius = c.shadow.radius;
      CASCADE.params[1] = c.shadow.farRadius ?? 1.5;
      CASCADE.params[2] = c.shadow.farStrength ?? 1.0;
      farState.mode = '';
    }
  }

  /**
   * Centre the far box on the truck, snapped to the map's own texel grid in
   * light space. Without the snap every texel edge in the map moves a fraction
   * of a texel per frame as the truck drives, and every static shadow in the
   * world crawls with it.
   */
  function followFar(target) {
    if (!sunFar) return;
    _fr.set(0, 1, 0).cross(sunDir).normalize();
    _fu.copy(sunDir).cross(_fr);
    const x = target.dot(_fr);
    const y = target.dot(_fu);
    const sx = Math.round(x / farTexel) * farTexel;
    const sy = Math.round(y / farTexel) * farTexel;
    _fc.copy(target).addScaledVector(_fr, sx - x).addScaledVector(_fu, sy - y);
    farState.frame++;
    // A fresh map: the first frame, the hour changing, or the truck having
    // been teleported (the capture tools park it beside the camp or the pride
    // in one step; at road speed it moves fourteen centimetres a frame).
    const fresh = !Number.isFinite(farState.centre.x) || farState.mode !== modeName || farState.centre.distanceTo(_fc) > 3;
    if (farCadence === 0) {
      // static: re-bake when the truck has used up a third of the margin, or
      // the hour has changed under it
      const moved = fresh || farState.centre.distanceTo(_fc) > fs * 0.35;
      if (!moved) return;
    } else if (!fresh && farState.frame % farCadence !== 0) {
      // holding this frame: the light stays where the map was rendered from
      return;
    }
    farState.mode = modeName;
    sunFar.shadow.needsUpdate = true;
    farState.centre.copy(_fc);
    sunFar.target.position.copy(_fc);
    sunFar.position.copy(_fc).addScaledVector(sunDir, farState.dist);
    if (farPre) {
      // what arrived since the last tag pass casts from this map on
      tagFarCasters();
      cullFarByReach(_fc);
      sunFar.target.updateMatrixWorld();
      sunFar.updateMatrixWorld();
      renderFarMap();
    }
  }

  // --- scene-wide retune ---------------------------------------------------
  const baseValues = new WeakMap();
  const bagScratch = [];
  let attached = false;

  function baseFor(slot, key) {
    let store = baseValues.get(slot);
    if (store === undefined) {
      const v = slot.value;
      store = v && v.isColor ? v.clone() : v;
      baseValues.set(slot, store);
    }
    return store;
  }

  function retuneBag(bag, name, dir) {
    for (const key of Object.keys(bag)) {
      const slot = bag[key];
      if (!slot || typeof slot !== 'object' || !('value' in slot)) continue;

      if (key === 'uSunDir' && slot.value && slot.value.isVector3) {
        slot.value.copy(dir);
        continue;
      }
      if (key === 'uSunStep' && slot.value && slot.value.isVector2) {
        // lateral step per unit of relief height when marching toward the key;
        // a key near the horizon would otherwise march to infinity
        const y = Math.max(dir.y, 0.3);
        slot.value.set(dir.x / y, dir.z / y);
        continue;
      }
      if (key === 'uFog' && slot.value && slot.value.isColor) {
        slot.value.set(modeOf(name).fog.color);
        continue;
      }
      if (key === 'uFogDensity' && typeof slot.value === 'number') {
        slot.value = modeOf(name).fog.density;
        continue;
      }

      const rule = RETUNE[key];
      if (!rule) continue;
      const base = baseFor(slot, key);
      let spec = rule[name];
      // A foliage bag that carries `uHemiRef` measures the hemisphere and key
      // luma itself and scales its own sky and ground terms by them, so the
      // table's night multiplier on top of that dimmed the tufts twice. Those
      // bags take the hour's hue and none of its magnitude; the bark shader,
      // which has the same two names and no meter, keeps the table as is.
      if (spec && spec.mul !== undefined && bag.uHemiRef && (key === 'uSky' || key === 'uGnd')) {
        spec = { hue: spec.hue, sat: spec.sat, mul: 1.0 };
      }
      if (base && base.isColor) {
        if (!spec) slot.value.copy(base);
        else shiftColor(slot.value, base, spec);
      } else if (typeof base === 'number') {
        slot.value = spec && spec.mul !== undefined ? base * spec.mul : base;
      }
    }
  }

  /**
   * Scale the trail's indirect diffuse.
   *
   * The terrain shader adds a hard-coded `albedo * 0.5` bounce term on top of
   * three's own indirect, which is right for a canopy floor at noon and is a
   * lit grey band across the middle of a night frame — it does not care how
   * much light is in the scene, so no amount of pulling the hemisphere and the
   * environment down can reach it. This is the only surface in the scene with
   * that problem and it is also the largest one, so it gets a dial. Day sits at
   * 1.0, which compiles to a multiply by one and changes nothing.
   */
  function patchGroundIndirect(mat) {
    if (mat.userData.__todIndirect) return;
    const u = { value: 1.0 };
    mat.userData.__todIndirect = u;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, r) => {
      if (prev) prev(shader, r);
      shader.uniforms.uTodIndirect = u;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTodIndirect;')
        .replace(
          '#include <opaque_fragment>',
          `reflectedLight.indirectDiffuse *= uTodIndirect;
          reflectedLight.indirectSpecular *= uTodIndirect;
          #include <opaque_fragment>`,
        );
    };
    const prevKey = mat.customProgramCacheKey;
    mat.customProgramCacheKey = () => `${prevKey ? prevKey.call(mat) : mat.uuid}|tod`;
    mat.needsUpdate = true;
  }

  /** Scale a plain material property against its first-seen value. */
  function scaleProp(mat, key, k) {
    const store = mat.userData.__todBase || (mat.userData.__todBase = {});
    if (store[key] === undefined) store[key] = mat[key];
    mat[key] = store[key] * k;
  }

  function walkScene(name, dir) {
    const seen = new Set();
    const target = modeOf(name);
    scene.traverse((o) => {
      const m = o.material;
      if (!m) return;
      const list = Array.isArray(m) ? m : [m];
      for (const mat of list) {
        if (!mat || seen.has(mat)) continue;
        seen.add(mat);
        if (mat === skyMaterial) continue;
        if ('envMap' in mat && mat.envMap !== env) {
          mat.envMap = env;
          mat.needsUpdate = true;
        }
        // Scale the reflected environment on the material, not just on the
        // scene.
        //
        // `scene.environmentIntensity` reaches exactly the materials that have
        // no `envMap` of their own, and in this project almost nothing is in
        // that set — the vehicle and the forest both assign an explicit map, so
        // they read `envMapIntensity` and ignore the scene's. Setting only the
        // scene value meant the mode's environment dial was quietly a no-op on
        // every surface it was aimed at: dusk's env came down 25 per cent on
        // paper and the paint's clearcoat never noticed.
        if (mat.envMapIntensity !== undefined && mat.envMap) {
          scaleProp(mat, 'envMapIntensity', target.envIntensity);
        }
        if (mat.userData && mat.userData.uniforms && mat.userData.uniforms.uReliefAmt) {
          patchGroundIndirect(mat);
          mat.userData.__todIndirect.value = target.groundIndirect;
        }
        // The instrument backlight is the only warm source left in the cab, so
        // it has to carry the whole read of the interior at night.
        if (mat.name === 'cabinPanel' && mat.emissiveIntensity !== undefined) {
          scaleProp(mat, 'emissiveIntensity', target.surfaces.dash);
        }
        // Two unlit veils over the windscreen.
        //
        // The haze film is a MeshBasicMaterial, so it is not lit by anything and
        // renders at its authored afternoon brightness in the dark; the glass
        // itself carries a white emissive for the same reason. Together they put
        // a milky grey sheet across the whole screen in the one view that is
        // mostly screen, and no amount of pulling the actual lights down can
        // touch either of them. They are dimmed here rather than in the vehicle
        // module because how bright a veil reads is a function of the hour, not
        // of the windscreen.
        if (/screenFilm|screenHaze/i.test(o.name) && mat.opacity !== undefined) {
          scaleProp(mat, 'opacity', target.surfaces.film);
        }
        if (mat.name === 'glass' && mat.emissiveIntensity !== undefined) {
          scaleProp(mat, 'emissiveIntensity', target.surfaces.glass);
        }
        bagScratch.length = 0;
        for (const bag of uniformBags(mat, bagScratch)) retuneBag(bag, name, dir);
      }
    });
  }

  function regenerateEnv() {
    applySkyUniforms(envSkyMaterial, cfg.sky, sunDir, { env: true });
    groundMat.color.set(envGround[modeName] ?? envGround.day);
    groundNearMat.color.set(envGroundNear[modeName] ?? envGroundNear.day);
    treeMat.color.set(envTree[modeName] ?? envTree.day);
    const next = pmrem.fromScene(envScene, envSigma, 0.1, envFar, { size: envSize });
    const old = envRT;
    envRT = next;
    env = next.texture;
    scene.environment = env;
    if (old) old.dispose();
  }

  let groundY = 0;

  const rig = {
    sky,
    skyMaterial,
    sun,
    hemi,
    rim,
    fill,
    beams,
    env,
    sunDir,
    pmrem,
    envScene,
    get envTarget() {
      return envRT;
    },
    get timeOfDay() {
      return modeName;
    },
    /** The dome is pinned to the far plane, so it just has to stay centred. */
    updateSky(camera) {
      sky.position.copy(camera.position);
      // Everything downstream of the sky is built after it, so the first frame
      // is the earliest point at which the rest of the scene can be retuned.
      if (!attached) {
        attached = true;
        walkScene(modeName, sunDir);
      }
      updateHaze(camera, sunDir, groundY);
      beams.update(camera, modeName);
    },
    /** Keep the shadow frustum tight around whatever we are looking at. */
    follow(target) {
      groundY = target.y;
      fill.target.position.copy(target);
      fill.position.copy(target).addScaledVector(fillDir, fillThrow);
      sun.target.position.copy(target);
      sun.position.copy(target).addScaledVector(sunDir, nearDist);
      followFar(target);
    },
    /** The far cascade's light, or null when it was built without one. */
    sunFar,
    /** Draw calls and triangles of the last far-map render (its own pass). */
    farPass: () => ({ calls: farState.passCalls, tris: farState.passTris }),
    /**
     * Move the whole rig to another hour. Sky, key, fill, fog, environment and
     * every analytic lighting term in the scene, in that order — the
     * environment has to be regenerated *and* re-applied by hand, because the
     * materials in this project hold an explicit `envMap` rather than leaning
     * on `scene.environment`.
     */
    setTimeOfDay(name, { scene: target = scene } = {}) {
      if (!MODES[name]) return modeName;
      modeName = name;
      currentMode = name;
      cfg = modeOf(name);

      sunDir.copy(dirFrom(cfg.key.az, cfg.key.el));
      applySkyUniforms(skyMaterial, cfg.sky, sunDir);

      sun.color.set(cfg.key.color);
      sun.intensity = cfg.key.intensity;
      applyShadow(cfg);
      sun.position.copy(sun.target.position).addScaledVector(sunDir, nearDist);
      followFar(sun.target.position);

      hemi.color.set(cfg.hemi.sky);
      hemi.groundColor.set(cfg.hemi.ground);
      hemi.intensity = cfg.hemi.intensity;

      rim.color.set(cfg.rim.color);
      rim.intensity = cfg.rim.intensity;
      rim.position.set(-sunDir.x * 60, 30, -sunDir.z * 60);

      fillDir.copy(dirFrom(cfg.fill.az, cfg.fill.el));
      fillThrow = cfg.fill.throw;
      fill.color.set(cfg.fill.color);
      fill.intensity = cfg.fill.intensity;
      fill.angle = cfg.fill.angle;
      fill.position.copy(fill.target.position).addScaledVector(fillDir, fillThrow);

      if (target.fog) {
        target.fog.color.set(cfg.fog.color);
        target.fog.density = cfg.fog.density;
      }
      applyHaze(cfg, sunDir);
      target.environmentIntensity = cfg.envIntensity;

      regenerateEnv();
      rig.env = env;
      attached = true;
      walkScene(name, sunDir);
      for (const r of registry) r.setTimeOfDay(name);
      return modeName;
    },
  };

  return rig;
}

// ---------------------------------------------------------------------------
// Volumetric-looking sun shafts. Additive quads aligned to the sun direction,
// faded by view angle so they never read as flat cards.
//
// The cards are gated by the sun's own shadow map, which is what turns them
// from atmosphere into light: a shaft is a column of air lit through a gap in
// the canopy, so it should exist where the canopy has a gap and nowhere else.
// Because each card is aligned *along* the sun direction, every point on it
// projects to nearly the same place in the shadow map — so one lookup answers
// "is this column lit" for the whole length, and the cost is a handful of taps
// over the card's own fill rather than a march.
//
// Gated rather than cut: a shadowed column drops to a quarter rather than
// vanishing, so the haze the wide shots are built on survives and what the
// gate adds is the structure — a shaft that breaks where a branch crosses it,
// and one that lands on the trail where the gap above it is real.
// ---------------------------------------------------------------------------

// Rigs created after the sky that also have to move when the hour does. They
// are built by main.js from separate factory calls, so this is how the sky
// reaches them without a change to the call site.
const registry = new Set();

// The sun's shadow, published for the shaft field. Only set when the map is a
// plain depth texture: three binds it as a `sampler2DShadow` with a comparison
// attached under the stock PCF filter, and sampling that as a `sampler2D` does
// not link. PCSS is what moves it to raw depth, so shadowed shafts ride on the
// same tiers PCSS does.
let sunShadowRef = null;

const shaftVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const shaftFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vWorld;

#ifdef SHAFT_SHADOW
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowGate;
uniform float uShadowSoft;

// Nine taps on a Vogel disc. The radius is half a metre of world rather than a
// texel or two: this is gating a column of lit air, not resolving the edge of
// a leaf, and a shaft with a shadow-map-sharp edge cut through it is the one
// way this could look worse than the flat card it replaces.
const vec2 SHAFT_TAPS[ 9 ] = vec2[ 9 ](
  vec2( 0.000, 0.000 ), vec2( -0.253, 0.216 ), vec2( 0.100, -0.451 ),
  vec2( 0.256, 0.502 ), vec2( -0.649, -0.180 ), vec2( 0.667, -0.371 ),
  vec2( -0.256, 0.784 ), vec2( -0.404, -0.749 ), vec2( 0.891, 0.229 )
);

float shaftLit() {
  vec4 sc = uShadowMatrix * vec4( vWorld, 1.0 );
  // Directional shadows come back with w = 1; the guard is for the divide, not
  // for this light.
  vec3 sp = sc.xyz / max( abs( sc.w ), 1e-4 );
  // Outside the shadow box there is no information, so the honest answer is
  // lit — the alternative is a hard edge at the frustum wall.
  if ( sp.x <= 0.0 || sp.x >= 1.0 || sp.y <= 0.0 || sp.y >= 1.0 || sp.z >= 1.0 ) return 1.0;
  float z = sp.z - 0.0025;
  float acc = 0.0;
  for ( int i = 0; i < 9; i ++ ) {
    acc += step( z, texture2D( uShadowMap, sp.xy + SHAFT_TAPS[ i ] * uShadowSoft ).r );
  }
  // fade the gate out at the edge of the box so a card crossing the wall does
  // not step
  vec2 e = min( sp.xy, 1.0 - sp.xy );
  float inside = smoothstep( 0.0, 0.06, min( e.x, e.y ) );
  return mix( 1.0, acc * ( 1.0 / 9.0 ), uShadowGate * inside );
}
#endif

float hash( vec2 p ){ return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float noise( vec2 p ){
  vec2 i = floor( p ); vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), u.x ),
              mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}

void main() {
  // soft along the width, fading out along the length
  float edge = smoothstep( 0.0, 0.34, vUv.x ) * smoothstep( 1.0, 0.66, vUv.x );
  float along = smoothstep( 0.0, 0.22, vUv.y ) * smoothstep( 1.0, 0.35, vUv.y );
  float n = noise( vec2( vUv.x * 5.0 + uSeed, vUv.y * 2.2 - uTime * 0.05 ) );
  float n2 = noise( vec2( vUv.x * 13.0 - uSeed, vUv.y * 5.0 - uTime * 0.09 ) );
  float density = edge * along * ( 0.55 + n * 0.5 ) * ( 0.7 + n2 * 0.45 );
  // distance falloff so shafts do not pile up in the far fog
  float d = length( vWorld - cameraPosition );
  density *= smoothstep( 90.0, 26.0, d ) * smoothstep( 1.5, 6.0, d );
  #ifdef SHAFT_SHADOW
    density *= shaftLit();
  #endif
  gl_FragColor = vec4( uColor * density * uIntensity, density * uIntensity );
}`;

export function createLightShafts(sunDir, { count = 14, area = 60, origin = new THREE.Vector3() } = {}) {
  const group = new THREE.Group();
  group.name = 'shafts';
  const dir = sunDir.clone().normalize();
  const uniformsList = [];
  const baseIntensity = [];
  const bases = [];
  // `?shafts=flat` puts the field back on the ungated shader, for A/B.
  const shadowed = sunShadowRef !== null && !flatShafts();
  // The gate is not compensated for, and a first pass that scaled the field up
  // by 1.5 to hold the average was wrong for a reason worth recording: gating
  // does not thin the field evenly, it *moves* it. The clearing over the
  // landing is the one real gap in this canopy, so every shaft that survives
  // the gate lands inside it — and the scale on top of that piled twenty-two
  // of them into a single orange mass.

  // Wider and longer than the canopy shafts they replace, and fainter per
  // metre: on a plain a lit column of dust is tens of metres across and the
  // structure comes from the acacias and the truck breaking it, not from gaps
  // in a canopy. The mode's `width` scales them again on top of this.
  for (let i = 0; i < count; i++) {
    const len = 34 + Math.random() * 30;
    const wide = 2.6 + Math.random() * 5.0;
    const geo = new THREE.PlaneGeometry(wide, len, 1, 1);
    const strength = 0.11 + Math.random() * 0.12;
    const mat = new THREE.ShaderMaterial({
      name: 'sunShaft',
      vertexShader: shaftVert,
      fragmentShader: shaftFrag,
      defines: shadowed ? { SHAFT_SHADOW: '' } : {},
      uniforms: {
        uColor: { value: new THREE.Color(modeOf(currentMode).shafts.color) },
        uIntensity: { value: strength * modeOf(currentMode).shafts.gain },
        uTime: { value: 0 },
        uSeed: { value: Math.random() * 20 },
        uShadowMap: { value: null },
        uShadowMatrix: { value: new THREE.Matrix4() },
        uShadowGate: { value: 0.75 },
        uShadowSoft: { value: 0.01 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    uniformsList.push(mat.uniforms);
    baseIntensity.push(strength);
    const m = new THREE.Mesh(geo, mat);
    const ox = origin.x + (Math.random() - 0.5) * area;
    const oz = origin.z + (Math.random() - 0.5) * area;
    const top = origin.y + 16 + Math.random() * 6;
    m.position.set(ox, top - len * 0.5 * Math.abs(dir.y) - 2, oz);
    bases.push(m.position.clone());
    // align the quad's +Y with the incoming sun direction
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.quaternion.copy(q);
    m.renderOrder = 5;
    group.add(m);
  }

  // Wrap an offset into [-a/2, a/2). The shaft field tiles, so it reads as
  // world-anchored while always having members near the camera — otherwise the
  // shafts sit forever at the world origin and are simply never on screen.
  const wrap = (d, a) => {
    const m = ((d + a * 0.5) % a + a) % a;
    return m - a * 0.5;
  };

  const rig = {
    group,
    setTimeOfDay(name) {
      const c = modeOf(name);
      dir.copy(sunDirection(name));
      group.visible = c.shafts.gain > 0.001;
      const width = c.shafts.width ?? 1;
      for (let i = 0; i < uniformsList.length; i++) {
        uniformsList[i].uColor.value.set(c.shafts.color);
        uniformsList[i].uIntensity.value = baseIntensity[i] * c.shafts.gain;
        group.children[i].scale.x = width;
      }
    },
    update(t, camera, center = camera.position) {
      // The map is allocated on the first shadow render, so it cannot be bound
      // when the material is built.
      const sh = shadowed ? sunShadowRef : null;
      const map = sh && sh.map ? sh.map.depthTexture || sh.map.texture : null;
      // Half a metre of softening, expressed in the shadow map's UV — so it is
      // the same half metre whatever box the tier put the map over.
      const soft = sh ? 0.5 / Math.max(2 * sh.camera.right, 1) : 0;
      for (const u of uniformsList) {
        u.uTime.value = t;
        if (!sh) continue;
        u.uShadowMap.value = map;
        u.uShadowMatrix.value.copy(sh.matrix);
        u.uShadowSoft.value = soft;
      }
      for (let i = 0; i < group.children.length; i++) {
        const child = group.children[i];
        const b = bases[i];
        child.position.x = center.x + wrap(b.x - center.x, area);
        child.position.z = center.z + wrap(b.z - center.z, area);
        child.position.y = center.y + b.y;
      }
      // billboard each shaft about the sun axis so it always faces the camera
      for (const child of group.children) {
        const toCam = camera.position.clone().sub(child.position);
        const proj = toCam.clone().addScaledVector(dir, -toCam.dot(dir));
        if (proj.lengthSq() < 1e-4) continue;
        proj.normalize();
        const normal = proj;
        const up = dir.clone();
        const right = new THREE.Vector3().crossVectors(up, normal).normalize();
        const m = new THREE.Matrix4().makeBasis(right, up, normal);
        child.quaternion.setFromRotationMatrix(m);
      }
    },
  };
  rig.setTimeOfDay(currentMode);
  registry.add(rig);
  return rig;
}

// ---------------------------------------------------------------------------
// Headlamp beams.
//
// A cone mesh is the obvious thing and it is wrong twice over: a ray straight
// down the axis misses the shell entirely, so the middle of the beam is hollow,
// and the shell cuts the ground in a hard ellipse. A stack of camera-facing
// discs threaded along the beam axis has neither problem — from the side the
// discs union into a cone, from behind they stack into a glow, and because they
// are billboards the density can be faded per fragment by height above the
// trail so nothing ever intersects it.
//
// The lamps are read out of the truck rather than configured here: position,
// aim, cone angle and on/off all come off the actual SpotLights, so this tracks
// whatever the vehicle module does with them.
// ---------------------------------------------------------------------------

/** Slices per beam when nothing says otherwise; the tier sets the real one. */
const SLICES = 20;

const beamVert = /* glsl */ `
attribute float aAlong;
attribute float aGlare;
uniform vec3 uOrigin;
uniform vec3 uDir;
uniform float uLength;
uniform float uNearR;
uniform float uFarR;
uniform float uGlareR;
varying float vAlong;
varying vec2 vQuad;
varying float vGlare;
varying vec3 vWorld;
void main() {
  vAlong = aAlong;
  vGlare = aGlare;
  // The quad coordinate, not its length: every corner of a quad is the same
  // distance from its centre, so a length taken here interpolated to a
  // constant sqrt(2) across the whole slice and the radial profile below
  // evaluated to zero everywhere. Neither the cone nor the glare had ever
  // drawn a pixel; the "beam" in every night frame was the spotlight's pool.
  vQuad = position.xy;
  float r = mix( uNearR, uFarR, aAlong );
  vec3 centre = uOrigin + uDir * ( aAlong * uLength );
  if ( aGlare > 0.5 ) {
    r = uGlareR;
    centre = uOrigin + uDir * 0.05;
  }
  vec3 right = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
  vec3 upv = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
  vec3 wp = centre + right * position.x * r + upv * position.y * r;
  vWorld = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4( wp, 1.0 );
}`;

const beamFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uGlareGain;
uniform float uGlareR;
uniform vec3 uOrigin;
uniform float uGroundY;
uniform float uTime;
uniform float uInside;
uniform vec3 uDir;
varying float vAlong;
varying vec2 vQuad;
varying float vGlare;
varying vec3 vWorld;

float hash31( vec3 p ) {
  p = fract( p * 0.3183099 + vec3( 0.71, 0.113, 0.419 ) );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float vnoise( vec3 p ) {
  vec3 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float n000 = hash31( i ), n100 = hash31( i + vec3( 1, 0, 0 ) );
  float n010 = hash31( i + vec3( 0, 1, 0 ) ), n110 = hash31( i + vec3( 1, 1, 0 ) );
  float n001 = hash31( i + vec3( 0, 0, 1 ) ), n101 = hash31( i + vec3( 1, 0, 1 ) );
  float n011 = hash31( i + vec3( 0, 1, 1 ) ), n111 = hash31( i + vec3( 1, 1, 1 ) );
  return mix( mix( mix( n000, n100, f.x ), mix( n010, n110, f.x ), f.y ),
              mix( mix( n001, n101, f.x ), mix( n011, n111, f.x ), f.y ), f.z );
}

void main() {
  float vRad = length( vQuad );
  float r = clamp( 1.0 - vRad, 0.0, 1.0 );

  if ( vGlare > 0.5 ) {
    // The lamp seen head-on: the lens as a lit disc, a hot core on it, and a
    // wide veiling halo. The disc is sized in metres to the lamp it sits on.
    // A core alone was a two-pixel speck — pow( r, 7 ) on a 0.8 m quad is
    // eight centimetres across, and the spotlight it is centred on sits a few
    // centimetres off the lens centre, so the speck read as a stray highlight
    // on a dark lens rather than as the lens lit. The disc covers the lens
    // whatever the offset, and it is the disc that carries the lamp over the
    // bloom threshold as a lamp-sized patch rather than a point.
    float lensR = 0.11 / uGlareR;
    float lens = smoothstep( lensR * 1.6, lensR * 0.7, vRad );
    float core = pow( r, 7.0 );
    float halo = pow( r, 2.2 );
    // A glare billboard is a fixed size in metres, so walking the camera up to
    // the lamp scales it across the whole frame. Falling off with distance
    // keeps it the size of a lamp instead of the size of the shot.
    float dcg = length( vWorld - cameraPosition );
    float near = smoothstep( 2.0, 7.0, dcg );
    // and a lamp is brightest looked into: from the flank it is a lit lens,
    // from head-on it is a glare
    float cosv = dot( normalize( cameraPosition - uOrigin ), uDir );
    float aim = mix( 0.25, 1.0, smoothstep( 0.0, 0.9, cosv ) );
    float a = ( lens * 1.4 + core * 0.8 + halo * 0.22 ) * uGlareGain * aim * mix( 0.18, 1.0, near );
    gl_FragColor = vec4( uColor * a, a );
    return;
  }

  // Soft-shouldered disc. A gaussian alone leaves a visible ring where the
  // slices overlap; this holds a flat-ish core and rolls off over the outer
  // third, which is what a real beam's cross-section does anyway.
  float f = r * r * ( 0.42 + 0.58 * r );

  // fade in off the lens, out into the fog long before the beam reaches ground
  float along = smoothstep( 0.0, 0.10, vAlong ) * smoothstep( 1.0, 0.42, vAlong );

  // Dust and drift inside the beam. Sampled in world space so it stays put in
  // the air rather than swimming with the truck.
  float dust = vnoise( vWorld * 0.75 + vec3( 0.0, uTime * 0.09, uTime * 0.05 ) );
  float dust2 = vnoise( vWorld * 2.4 - vec3( uTime * 0.13, 0.0, 0.0 ) );
  float density = f * along * ( 0.62 + dust * 0.62 ) * ( 0.78 + dust2 * 0.34 );

  // The one thing a billboard stack still has to be told: do not paint over the
  // trail. Below a foot off the deck the beam is the pool, not the shaft.
  density *= smoothstep( uGroundY - 0.05, uGroundY + 0.75, vWorld.y );

  // and do not swallow the lens
  vec3 toFrag = vWorld - cameraPosition;
  float dcam = length( toFrag );
  density *= smoothstep( 0.35, 1.6, dcam );

  // A stack of discs integrates whatever path the eye takes through it, and a
  // view down the beam axis crosses every one of them at once — the whole
  // stack of scatter in a single pixel. Physically that *is* brighter, but
  // by a factor that whites the frame out rather than one anybody would read as
  // a beam, so the axial case is held back hard.
  float ax = abs( dot( toFrag / max( dcam, 1e-4 ), uDir ) );
  density *= mix( 1.0, 0.14, ax * ax );
  // and when the lens is actually inside the cone there is no beam to look at
  // at all, only glare
  density *= uInside;

  float a = density * uIntensity;
  gl_FragColor = vec4( uColor * a, a );
}`;

function beamGeometry(SLICES) {
  const quads = SLICES + 1;
  const pos = new Float32Array(quads * 4 * 3);
  const along = new Float32Array(quads * 4);
  const glare = new Float32Array(quads * 4);
  const idx = new Uint16Array(quads * 6);
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let q = 0; q < quads; q++) {
    const isGlare = q === SLICES;
    // Slices are packed towards the lamp: a cone's near end is small and bright
    // and needs the density, the far end is wide and dim and does not.
    const t = isGlare ? 0 : Math.pow((q + 0.5) / SLICES, 1.35);
    for (let c = 0; c < 4; c++) {
      const i = q * 4 + c;
      pos[i * 3] = corners[c][0];
      pos[i * 3 + 1] = corners[c][1];
      pos[i * 3 + 2] = 0;
      along[i] = t;
      glare[i] = isGlare ? 1 : 0;
    }
    const b = q * 4;
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], q * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  g.setAttribute('aGlare', new THREE.BufferAttribute(glare, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

function createHeadlightBeams(slices = SLICES) {
  const group = new THREE.Group();
  group.name = 'headlightBeams';
  group.frustumCulled = false;
  const geo = beamGeometry(slices);
  const meshes = [];
  let lamps = null;
  let searched = 0;
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _c = new THREE.Vector3();

  // This rig used to carry three "throw" spotlights of its own, standing in
  // front of the truck's lamps, because the truck's lamps were set for a
  // daylight running-lamp read and put less light on the trail at ten metres
  // than the moon did. The vehicle module now runs them at a shallow decay with
  // the distance cutoff doing the far end, which is what a headlamp on a trail
  // actually looks like, so the stand-ins are gone: three fewer lights in the
  // scene, one fewer shader permutation, and the pool is thrown from the actual
  // lamp position rather than from a metre in front of it.

  function makeBeam() {
    const mat = new THREE.ShaderMaterial({
      name: 'headlightBeam',
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      uniforms: {
        uOrigin: { value: new THREE.Vector3() },
        uDir: { value: new THREE.Vector3(0, 0, 1) },
        uLength: { value: 20 },
        uNearR: { value: 0.16 },
        uFarR: { value: 3.4 },
        uGlareR: { value: 0.5 },
        uColor: { value: new THREE.Color(NIGHT.lamp) },
        uIntensity: { value: 0 },
        uGlareGain: { value: 0 },
        uGroundY: { value: 0 },
        uInside: { value: 1 },
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 7;
    group.add(m);
    meshes.push(m);
    return m;
  }

  function findLamps() {
    const scene = group.parent;
    if (!scene) return null;
    const truck = scene.getObjectByName('truck');
    if (!truck) return null;
    const found = [];
    truck.traverse((o) => {
      if (o.isSpotLight) found.push(o);
    });
    return found.length ? found : null;
  }

  return {
    group,
    /** Shared with the dust motes so they light up inside the beam. */
    state: { pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), cos: 0.9, gain: 0 },
    update(camera, modeName) {
      const cfg = modeOf(modeName);
      if (!lamps && searched < 240) {
        searched++;
        lamps = findLamps();
      }
      if (!lamps) {
        group.visible = false;
        return;
      }
      group.visible = true;
      while (meshes.length < lamps.length) makeBeam();
      const t = performance.now() * 0.001;
      let lit = false;
      let strongest = 0;
      for (let i = 0; i < lamps.length; i++) {
        const light = lamps[i];
        const mesh = meshes[i];
        const on = light.intensity > 0.001 && cfg.beams.gain > 0.001;
        mesh.visible = on;
        if (!on) continue;
        lit = true;
        light.getWorldPosition(_p);
        light.target.getWorldPosition(_t);
        _d.copy(_t).sub(_p);
        if (_d.lengthSq() < 1e-6) continue;
        _d.normalize();
        const u = mesh.material.uniforms;
        u.uOrigin.value.copy(_p);
        u.uDir.value.copy(_d);
        // Only the useful part of the throw carries visible scatter; past that
        // the beam is dimmer than the fog it is lighting.
        const len = Math.min(light.distance * 0.46, 24);
        u.uLength.value = len;
        // the penumbra means the outer cone is dim, so the visible beam is
        // narrower than the light's own aperture
        u.uFarR.value = Math.tan(light.angle * 0.62) * len;
        u.uNearR.value = 0.14;
        u.uGlareR.value = 0.34 + cfg.beams.glare * 0.2;
        u.uColor.value.set(light.color);
        // Scatter scales with the lamp's own irradiance, referenced to the
        // headlamps' 13 so the roof bar reads as the brighter of the two.
        u.uIntensity.value = ((0.5 * light.intensity) / 13) * cfg.beams.gain * (2.0 / slices);
        // The roof bar is a metre of small LEDs, not one lens, and its lamp
        // is a single point: a lens-sized glare disc on it read as a flood
        // lamp ball above the cab. The bar is the cool light in the rig.
        const led = light.color.b > light.color.r;
        u.uGlareGain.value = cfg.beams.glare * 0.32 * (led ? 0.3 : 1);
        u.uGroundY.value = group.parent ? beamGroundY(group.parent) : 0;
        u.uTime.value = t;
        // How much of the beam the lens is standing in. Inside the cone every
        // slice is between the eye and the far end and the stack integrates to
        // white; outside it, the same stack is the beam and should be at full.
        // (This read backwards for two iterations: three's smoothstep returns 0
        // below its low edge, so passing the edges high-then-low inverts it
        // rather than reversing it, and the beam was suppressed from the one
        // angle that wanted it and blown from the one that did not.)
        _c.copy(camera.position).sub(_p);
        const axial = _c.dot(_d);
        const lateral = Math.sqrt(Math.max(_c.lengthSq() - axial * axial, 0));
        const coneR = u.uNearR.value + THREE.MathUtils.clamp(axial / len, 0, 1) * (u.uFarR.value - u.uNearR.value);
        // behind the lamp counts too — that is the driver's seat, and from there
        // the eye looks down the entire length of the beam at once
        const insideSpan = axial > -3.2 && axial < len * 1.25 ? 1 : 0;
        const span = Math.max(coneR, axial < 0 ? 0.9 : coneR);
        // Tighter than it was, and it no longer suppresses all the way down.
        // The `front` view has been stood off to nine metres, which puts the
        // lens near the edge of the cone rather than down the middle of it, and
        // a truck coming at you at night does have beams flaring past the
        // camera — the thing to avoid is the whole slice stack integrating in
        // one pixel, not the beam itself.
        const inside = insideSpan * (1 - THREE.MathUtils.smoothstep(lateral, span * 0.45, span * 1.2));
        u.uInside.value = THREE.MathUtils.lerp(1, 0.3, inside);
        if (light.intensity > strongest) {
          strongest = light.intensity;
          this.state.pos.copy(_p);
          this.state.dir.copy(_d);
          this.state.cos = Math.cos(light.angle * 0.8);
        }
      }
      this.state.gain = lit ? cfg.motes.beam : 0;
      group.visible = lit;
    },
  };
}

let _truckRef = null;
function beamGroundY(scene) {
  if (!_truckRef || !_truckRef.parent) _truckRef = scene.getObjectByName('truck') || null;
  return _truckRef ? _truckRef.position.y : 0;
}

/** Floating dust / pollen caught in the light. */
export function createDustMotes({ count = 900, area = 46, height = 9, origin = new THREE.Vector3() } = {}) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x + (Math.random() - 0.5) * area;
    positions[i * 3 + 1] = origin.y + Math.random() * height;
    positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * area;
    scales[i] = 0.02 + Math.random() * 0.055;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uArea: { value: area },
      uMap: { value: motePattern() },
      uColor: { value: new THREE.Color(modeOf(currentMode).motes.color) },
      uOpacity: { value: modeOf(currentMode).motes.opacity },
      uBeamPos: { value: new THREE.Vector3() },
      uBeamDir: { value: new THREE.Vector3(0, 0, 1) },
      uBeamCos: { value: 0.9 },
      uBeamGain: { value: 0 },
      uBeamCol: { value: new THREE.Color(NIGHT.lamp) },
      uSizeK: { value: 1 },
      uDensity: { value: 1 },
      uCap: { value: 0.3 },
    },
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      uniform vec3 uCenter;
      uniform float uArea;
      uniform vec3 uBeamPos, uBeamDir;
      uniform float uBeamCos, uBeamGain, uSizeK, uDensity;
      varying float vFade;
      varying float vBeam;
      void main() {
        vec3 p = position;
        // tile the mote field around the camera; a fixed field at the world
        // origin is never anywhere near the truck
        p.x = uCenter.x + mod( p.x - uCenter.x + uArea * 0.5, uArea ) - uArea * 0.5;
        p.z = uCenter.z + mod( p.z - uCenter.z + uArea * 0.5, uArea ) - uArea * 0.5;
        p.y += uCenter.y;
        p.x += sin( uTime * 0.22 + aPhase ) * 0.6;
        p.y += sin( uTime * 0.16 + aPhase * 1.7 ) * 0.35;
        p.z += cos( uTime * 0.19 + aPhase * 0.8 ) * 0.6;
        // A mote inside the headlamp cone is the brightest thing in the air at
        // night; outside it there is nothing to see it by.
        vec3 rel = p - uBeamPos;
        float rl = length( rel ) + 1e-4;
        float axial = dot( rel, uBeamDir ) / rl;
        vBeam = uBeamGain * smoothstep( uBeamCos, mix( uBeamCos, 1.0, 0.45 ), axial )
              * smoothstep( 30.0, 6.0, rl ) * smoothstep( 1.5, 4.5, rl );
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        float d = -mv.z;
        // A mote close to the lens covers a lot of pixels and additive blending
        // turns it into a bright disc that reads as dirt on the lens, so the
        // near end fades out well before it can and the size is capped anyway.
        vFade = smoothstep( 46.0, 12.0, d ) * smoothstep( 1.4, 5.0, d );
        // Thinning the field is a vertex-stage decision so the thinned motes
        // cost nothing: fract of the phase is a stable per-mote hash.
        vFade *= step( fract( aPhase * 0.1591549 ), uDensity );
        gl_PointSize = min( aScale * 620.0 * uSizeK / max( d, 0.1 ), 9.0 * uSizeK );
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor, uBeamCol;
      uniform float uOpacity, uCap;
      varying float vFade;
      varying float vBeam;
      void main() {
        vec4 t = texture2D( uMap, gl_PointCoord );
        // Capped. Additive points are the one thing in this scene that can
        // stack into a solid white field, and a mote lit by the headlamps is
        // still a speck of dust, not a spark.
        float a = min( t.a * vFade * uOpacity * ( 1.0 + vBeam * 1.3 ), uCap );
        if ( a < 0.004 ) discard;
        vec3 c = mix( uColor, uBeamCol, clamp( vBeam, 0.0, 1.0 ) );
        gl_FragColor = vec4( c * t.rgb, a );
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  let beamState = null;
  const rig = {
    points,
    /** Hand the motes the live headlamp cone so they can light up inside it. */
    bindBeams(state) {
      beamState = state;
    },
    setTimeOfDay(name) {
      const c = modeOf(name);
      mat.uniforms.uColor.value.set(c.motes.color);
      mat.uniforms.uOpacity.value = c.motes.opacity;
      mat.uniforms.uSizeK.value = c.motes.size ?? 1;
      mat.uniforms.uDensity.value = c.motes.density ?? 1;
      mat.uniforms.uCap.value = c.motes.cap ?? 0.3;
    },
    update(t, center) {
      mat.uniforms.uTime.value = t;
      if (center) mat.uniforms.uCenter.value.copy(center);
      if (beamState) {
        mat.uniforms.uBeamPos.value.copy(beamState.pos);
        mat.uniforms.uBeamDir.value.copy(beamState.dir);
        mat.uniforms.uBeamCos.value = beamState.cos;
        mat.uniforms.uBeamGain.value = beamState.gain;
      }
    },
  };
  rig.setTimeOfDay(currentMode);
  registry.add(rig);
  moteRigs.add(rig);
  for (const s of beamStates) rig.bindBeams(s);
  return rig;
}

// The mote field and the beam rig are built by different call sites, so they
// are introduced to each other here rather than in main.js.
const moteRigs = new Set();
const beamStates = new Set();

export function publishBeamState(state) {
  beamStates.add(state);
  for (const r of moteRigs) r.bindBeams(state);
}
