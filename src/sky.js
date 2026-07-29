import * as THREE from 'three';
import { DUSK, FOG, NIGHT, PALETTE, SUN } from './palette.js';
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
uniform vec3 uZenith, uHorizon, uHaze, uGround, uSunColor, uCloudCol;
uniform vec3 uSunDir;
uniform float uSunDisc, uGlow, uAureole, uHazeFalloff, uCloud, uExposure;
uniform float uZenithPow, uStars, uMoonDetail, uMilkyWay;
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
  // still floored on the derivative so the field cannot crawl or twinkle under
  // motion, just floored tight enough that a star stays a point of light
  float r = max( radius, px * cells * 0.62 );
  float q = dot( dv, dv ) / ( r * r );
  float s = exp( -q * 3.4 );
  // magnitudes: cubed so the field is mostly faint with a few genuinely bright
  float mag = h4 * h4 * h4;
  vec3 tint = mix( vec3( 1.0, 0.90, 0.78 ), vec3( 0.74, 0.84, 1.0 ), h1 );
  return tint * s * ( 0.035 + mag * 0.40 ) * gain;
}

void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  float up = clamp( h, 0.0, 1.0 );

  vec3 col = mix( uHorizon, uZenith, pow( up, uZenithPow ) );

  // thick band of scattered light sitting on the horizon
  float haze = exp( -max( h, 0.0 ) * uHazeFalloff );
  col = mix( col, uHaze, haze * 0.52 );

  float c = clamp( dot( d, uSunDir ), -1.0, 1.0 );
  float cp = max( c, 0.0 );

  if ( uStars > 0.0 ) {
    vec2 o = octEncode( d );
    float px = length( fwidth( o ) );
    vec3 sf = starGrid( o, px, 210.0, 0.26, 0.16, 1.0 )
            + starGrid( o + 7.3, px, 96.0, 0.11, 0.22, 1.55 );
    // The Milky Way is a soft band round a tilted great circle. It is what stops
    // the upper sky reading as an even wash of dots.
    vec3 axis = normalize( vec3( 0.42, 0.52, -0.74 ) );
    float band = exp( -pow( dot( d, axis ) / 0.30, 2.0 ) );
    float mw = band * ( 0.16 + fbm( o * 5.5 + 21.0 ) * 0.62 );
    sf += vec3( 0.52, 0.60, 0.82 ) * mw * uMilkyWay;
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

  // below the horizon the environment should read as dark forest floor
  col = mix( col, uGround, smoothstep( 0.0, -0.10, h ) );

  col = clamp( col * uExposure, vec3( 0.0 ), vec3( 80.0 ) );
  gl_FragColor = vec4( col, 1.0 );
}`;

const lin = (hex, mul = 1) => new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(mul);

// ---------------------------------------------------------------------------
// The three hours.
//
// Each entry is a complete lighting rig, not a tint on the previous one. The
// day rig is the one twelve iterations landed on and is reproduced exactly;
// the other two are built from their own key/fill ratio.
// ---------------------------------------------------------------------------

const MODES = {
  day: {
    key: { az: SUN.azimuth, el: SUN.elevation, color: PALETTE.sunColor, intensity: SUN.intensity },
    sky: {
      zenith: lin(0x1d5aa2, 1.7),
      horizon: lin(0xbcc4c2, 1.4),
      // Was 0xecd0a4, a saturated warm tan. Six tenths of that over a blue
      // zenith mixes to grey-lavender, which is what the sky above the treeline
      // has been reading as — an overcast colour under a hard sun.
      haze: lin(0xe6dcc8, 1.62),
      ground: lin(0x1c231b, 0.6),
      sunColor: lin(PALETTE.sunColorLow),
      cloudCol: lin(0xd9dbe6),
      sunDisc: 46.0,
      envDisc: 8.0,
      glow: 5.5,
      envGlow: 3.2,
      aureole: 0.55,
      // the haze band has to stay near the horizon; at 8.5 it reached far enough
      // up that most of the visible sky was pale warm grey rather than blue
      hazeFalloff: 15.0,
      cloud: 0.7,
      zenithPow: 0.42,
      disc: [0.99955, 0.99988],
      stars: 0,
      milkyWay: 0,
      moonDetail: 0,
    },
    hemi: { sky: 0x68827d, ground: PALETTE.bounce, intensity: 0.42 },
    rim: { color: PALETTE.shadowTint, intensity: 0.45 },
    fill: { color: PALETTE.sunColor, intensity: 16, angle: 0.55, throw: 14, az: 252, el: 21 },
    fog: { color: PALETTE.fogColor, density: FOG.density },
    envIntensity: 0.98,
    shadow: { radius: 1.5, bias: -0.00012, normalBias: 0.035, intensity: 1.0 },
    shafts: { color: PALETTE.sunColorLow, gain: 1.0 },
    motes: { color: 0xffe8cc, opacity: 0.3, beam: 0, size: 1, density: 1, cap: 0.3 },
    beams: { gain: 0, glare: 0 },
    lamps: { gain: 0 },
    groundIndirect: 1.0,
    surfaces: { dash: 1, film: 1, glass: 1 },
  },

  dusk: {
    // A sun genuinely on the horizon cannot reach the truck: a 24 m conifer at
    // the edge of a 25 m clearing throws a 200 m shadow at 6 degrees, so the
    // whole corridor is in shade and there is no key at all. Twenty-four is the
    // lowest elevation that still lands on the flanks, and the shadow term is
    // held back from full so the canopy dapple cannot take it away either.
    // Thirty-three, not twenty-four. Twenty-four is the honest elevation for
    // this sky but a 24 m conifer at the edge of the clearing shades the whole
    // corridor at that angle, so the key never lands on the truck and the hour
    // reads only in the backdrop. The sky's own dusk comes from the aureole and
    // the horizon band rather than from where the disc is, so it survives being
    // lifted far enough to clear the canopy.
    key: { az: 296, el: 38, color: DUSK.sun, intensity: 7.2 },
    sky: {
      zenith: lin(DUSK.skyTop, 1.05),
      horizon: lin(DUSK.skyHorizon, 1.25),
      haze: lin(DUSK.haze, 1.55),
      ground: lin(DUSK.ground, 0.9),
      sunColor: lin(DUSK.sunLow),
      cloudCol: lin(DUSK.cloud, 0.75),
      sunDisc: 30.0,
      envDisc: 6.0,
      glow: 7.5,
      envGlow: 2.6,
      // A low sun scatters through far more air, so the aureole is most of the
      // sky rather than a ring: this is the term that makes dusk read as dusk.
      // It is also what the PMREM integrates, and at 1.35 the environment was a
      // uniformly orange dome that put the same wash on every surface in the
      // scene — which is a different thing from a warm sky behind a subject.
      aureole: 1.05,
      hazeFalloff: 6.5,
      cloud: 0.85,
      zenithPow: 0.60,
      disc: [0.99948, 0.99985],
      stars: 0.22,
      milkyWay: 0,
      moonDetail: 0,
    },
    hemi: { sky: DUSK.hemiSky, ground: DUSK.bounce, intensity: 0.72 },
    rim: { color: DUSK.shadowTint, intensity: 0.5 },
    // Cool, and deliberately so. With the key under the horizon on the far side
    // the near flank is lit by nothing but sky, and a *warm* fill under a warm
    // key is how the first pass turned every surface in the frame the same
    // orange — the truck's green paint came back brown. The whole appeal of
    // this hour is that the two sources disagree, so the fill is given the
    // colour of the half of the sky the sun is not in.
    // Forty-eight, the azimuth the night sweep found, not the day rig's 252.
    // The day fill sits opposite a key that already lands on the doors, so it
    // only has to open the shadow; here the key is round the far side and the
    // fill is the only thing on the camera-side flank at all. At 252 it was
    // behind that flank and doubling its intensity changed the door skin by
    // less than a value of 255 — a light on the wrong side of a surface is not
    // a dim light, it is no light.
    fill: { color: 0xa9bcd8, intensity: 30, angle: 0.6, throw: 13, az: 48, el: 18 },
    fog: { color: DUSK.fog, density: 0.0072 },
    envIntensity: 0.95,
    shadow: { radius: 2.1, bias: -0.00016, normalBias: 0.045, intensity: 0.72 },
    shafts: { color: 0xff9a4e, gain: 1.5 },
    motes: { color: 0xffd0a0, opacity: 0.26, beam: 0.5, size: 0.85, density: 0.8, cap: 0.24 },
    beams: { gain: 0.6, glare: 0.35 },
    lamps: { gain: 0.16 },
    groundIndirect: 0.78,
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
    key: { az: 140, el: 43, color: NIGHT.moon, intensity: 2.1 },
    sky: {
      zenith: lin(NIGHT.skyTop, 1.0),
      horizon: lin(NIGHT.skyHorizon, 1.0),
      haze: lin(NIGHT.haze, 1.15),
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
      stars: 1.0,
      milkyWay: 0.5,
      moonDetail: 1.0,
    },
    hemi: { sky: NIGHT.hemiSky, ground: NIGHT.bounce, intensity: 0.32 },
    // A cool counter-key from behind the camera. At 0.16 it did nothing at all
    // and the truck's near flank was a single flat value; this is what puts an
    // edge on the roof line and the tyre shoulders on the shadow side.
    rim: { color: NIGHT.shadowTint, intensity: 0.34 },
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
    fill: { color: 0x9db5d8, intensity: 15, angle: 0.6, throw: 13, az: 48, el: 14 },
    fog: { color: NIGHT.fog, density: 0.0082 },
    envIntensity: 1.0,
    shadow: { radius: 2.4, bias: -0.00018, normalBias: 0.05, intensity: 0.88 },
    shafts: { color: 0x9dbbe8, gain: 0.55 },
    // Dust you can see across the whole frame needs a light source filling the
    // whole frame; at night there is none, so the field is thinned to a third
    // and shrunk, and what is left only shows where the lamps reach it. Before
    // this the motes read as a snowstorm of blown white specks.
    motes: { color: 0x6f83a6, opacity: 0.055, beam: 1.0, size: 0.5, density: 0.34, cap: 0.1 },
    beams: { gain: 2.1, glare: 1.0 },
    lamps: { gain: 0.52 },
    groundIndirect: 0.5,
    surfaces: { dash: 2.1, film: 0.2, glass: 0.24 },
  },
};

export const TIME_NAMES = Object.keys(MODES);

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

/** Sample the sky shader on the CPU for a rough horizon colour. */
export function horizonColor() {
  return new THREE.Color(0xbfd0d6);
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
const HUE_DUSK = 0xffab74;
const HUE_DUSK_COOL = 0x8592b4;

// `hue` recolours while keeping the base's own lightness, so materials that
// deliberately differ in strength keep differing.
const RETUNE = {
  // --- vehicle: graded analytic reflection --------------------------------
  uBwSky: { dusk: { hue: HUE_DUSK_COOL, mul: 0.85 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.30 } },
  uBwRim: { dusk: { hue: HUE_DUSK, sat: 0.75, mul: 0.75 }, night: { hue: HUE_NIGHT, mul: 0.58 } },
  uBwGround: { dusk: { mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.5, mul: 0.4 } },
  uBwWall: { dusk: { mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.5, mul: 0.4 } },
  uBwStrength: { dusk: { mul: 1.0 }, night: { mul: 1.0 } },
  uBwAmbient: { dusk: { mul: 0.85 }, night: { mul: 0.42 } },

  // --- vehicle: cabin inter-reflection ------------------------------------
  uCbGain: { dusk: { mul: 0.6 }, night: { mul: 0.3 } },
  uCbFloor: { dusk: { mul: 0.6 }, night: { mul: 0.3 } },
  uCbSpec: { dusk: { mul: 0.8 }, night: { mul: 0.5 } },
  uCbColor: { dusk: { hue: 0xffb98a, sat: 0.7 }, night: { hue: 0xffd9a8, sat: 0.55 } },

  // --- cabin daylight model ------------------------------------------------
  // Nothing comes through the screen at night, so the cab is lit by the dash
  // and by whatever the headlamps throw back off the trail. Gains collapse and
  // the aperture colours go cool, which is what leaves the instrument backlight
  // as the only warm thing in the frame.
  uClGain: { dusk: { mul: 0.5 }, night: { mul: 0.17 } },
  uClSide: { dusk: { mul: 0.5 }, night: { mul: 0.15 } },
  uClUp: { dusk: { mul: 0.55 }, night: { mul: 0.2 } },
  uClSun: { dusk: { mul: 0.55 }, night: { mul: 0.08 } },
  uClFill: { dusk: { mul: 0.6 }, night: { mul: 0.28 } },
  uClSpec: { dusk: { mul: 0.8 }, night: { mul: 0.45 } },
  uClColor: { dusk: { hue: 0xffb173, sat: 0.85 }, night: { hue: HUE_NIGHT, sat: 0.8 } },
  uClSideColor: { dusk: { hue: 0xa08098, sat: 0.7 }, night: { hue: HUE_NIGHT_DEEP, sat: 0.7 } },
  uClSunColor: { dusk: { hue: HUE_DUSK }, night: { hue: HUE_NIGHT, sat: 0.7 } },

  // --- forest --------------------------------------------------------------
  uSunTint: { dusk: { hue: HUE_DUSK, sat: 0.8, mul: 0.95 }, night: { hue: HUE_NIGHT, mul: 0.3 } },
  uDirect: { dusk: { mul: 0.9 }, night: { mul: 0.55 } },
  uSky: { dusk: { hue: HUE_DUSK_COOL, mul: 1.0 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.3 } },
  uGnd: { dusk: { hue: 0xa2734d, sat: 0.7, mul: 0.8 }, night: { hue: 0x35404a, mul: 0.24 } },
  uRim: { dusk: { hue: HUE_DUSK, mul: 1.3 }, night: { hue: HUE_NIGHT, mul: 0.3 } },
  uHazeCol: { dusk: { hue: 0xc47a54, mul: 0.9 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.42 } },
  uHazeCol2: { dusk: { hue: 0xd28a5e, mul: 0.9 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.42 } },

  // --- puddles and airborne dust ------------------------------------------
  uSunCol: { dusk: { hue: HUE_DUSK, mul: 0.95 }, night: { hue: HUE_NIGHT, mul: 0.14 } },
  uShadeCol: { dusk: { hue: 0x9a6a4a, mul: 0.8 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.35 } },
  uSkyTop: { dusk: { hue: HUE_DUSK_COOL, mul: 0.75 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.13 } },
  uSkyLow: { dusk: { hue: HUE_DUSK, mul: 0.85 }, night: { hue: HUE_NIGHT_DEEP, mul: 0.2 } },
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

export function createSky(scene, renderer, { shadowMapSize = 2048, envSamples = 0.04, timeOfDay = 'day' } = {}) {
  let modeName = MODES[timeOfDay] ? timeOfDay : 'day';
  currentMode = modeName;
  let cfg = modeOf(modeName);
  const sunDir = dirFrom(cfg.key.az, cfg.key.el);

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
  // a dark green ground disc so the underside of the truck reflects forest,
  // not blue sky — this is what keeps the chrome from looking like a studio
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x2b3323, side: THREE.BackSide });
  const groundDisc = new THREE.Mesh(
    new THREE.SphereGeometry(400, 24, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    groundMat,
  );
  envScene.add(groundDisc);
  // a few dark trunks around the horizon give metals something to break up on
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x18211a, side: THREE.DoubleSide });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.sin(i) * 0.1;
    const r = 120 + Math.sin(i * 3.1) * 30;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18 + (i % 3) * 8, 130), trunkMat);
    m.position.set(Math.cos(a) * r, 40, Math.sin(a) * r);
    m.lookAt(0, 40, 0);
    envScene.add(m);
  }

  let envRT = pmrem.fromScene(envScene, envSamples);
  let env = envRT.texture;
  scene.environment = env;
  // The art fill is a spot now, so the ground past its throw has only sun and
  // sky to model the ruts with. Sky it is.
  scene.environmentIntensity = cfg.envIntensity;

  // --- fog -----------------------------------------------------------------
  scene.fog = new THREE.FogExp2(cfg.fog.color, cfg.fog.density);

  // --- lights --------------------------------------------------------------
  const sun = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  const s = 22;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.blurSamples = 12;
  scene.add(sun);
  scene.add(sun.target);

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

  const beams = createHeadlightBeams();
  scene.add(beams.group);
  publishBeamState(beams.state);

  applyShadow(cfg);

  function applyShadow(c) {
    sun.shadow.radius = c.shadow.radius;
    sun.shadow.bias = c.shadow.bias;
    sun.shadow.normalBias = c.shadow.normalBias;
    if ('intensity' in sun.shadow) sun.shadow.intensity = c.shadow.intensity;
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
      const spec = rule[name];
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
    groundMat.color.set(modeName === 'night' ? 0x0a0f0b : modeName === 'dusk' ? 0x241d18 : 0x2b3323);
    trunkMat.color.set(modeName === 'night' ? 0x05080a : modeName === 'dusk' ? 0x140f10 : 0x18211a);
    const next = pmrem.fromScene(envScene, envSamples);
    const old = envRT;
    envRT = next;
    env = next.texture;
    scene.environment = env;
    if (old) old.dispose();
  }

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
      beams.update(camera, modeName);
    },
    /** Keep the shadow frustum tight around whatever we are looking at. */
    follow(target) {
      fill.target.position.copy(target);
      fill.position.copy(target).addScaledVector(fillDir, fillThrow);
      sun.target.position.copy(target);
      sun.position.copy(target).addScaledVector(sunDir, 110);
      sun.shadow.camera.updateProjectionMatrix();
    },
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
      sun.position.copy(sun.target.position).addScaledVector(sunDir, 110);
      applyShadow(cfg);

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
// ---------------------------------------------------------------------------

// Rigs created after the sky that also have to move when the hour does. They
// are built by main.js from separate factory calls, so this is how the sky
// reaches them without a change to the call site.
const registry = new Set();

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
  gl_FragColor = vec4( uColor * density * uIntensity, density * uIntensity );
}`;

export function createLightShafts(sunDir, { count = 14, area = 60, origin = new THREE.Vector3() } = {}) {
  const group = new THREE.Group();
  group.name = 'shafts';
  const dir = sunDir.clone().normalize();
  const uniformsList = [];
  const baseIntensity = [];
  const bases = [];

  for (let i = 0; i < count; i++) {
    const len = 26 + Math.random() * 22;
    const wide = 1.4 + Math.random() * 3.4;
    const geo = new THREE.PlaneGeometry(wide, len, 1, 1);
    const strength = 0.16 + Math.random() * 0.16;
    const mat = new THREE.ShaderMaterial({
      vertexShader: shaftVert,
      fragmentShader: shaftFrag,
      uniforms: {
        uColor: { value: new THREE.Color(modeOf(currentMode).shafts.color) },
        uIntensity: { value: strength * modeOf(currentMode).shafts.gain },
        uTime: { value: 0 },
        uSeed: { value: Math.random() * 20 },
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
      for (let i = 0; i < uniformsList.length; i++) {
        uniformsList[i].uColor.value.set(c.shafts.color);
        uniformsList[i].uIntensity.value = baseIntensity[i] * c.shafts.gain;
      }
    },
    update(t, camera, center = camera.position) {
      for (const u of uniformsList) u.uTime.value = t;
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
varying float vRad;
varying float vGlare;
varying vec3 vWorld;
void main() {
  vAlong = aAlong;
  vGlare = aGlare;
  vRad = length( position.xy );
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
uniform float uGroundY;
uniform float uTime;
uniform float uInside;
uniform vec3 uDir;
varying float vAlong;
varying float vRad;
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
  float r = clamp( 1.0 - vRad, 0.0, 1.0 );

  if ( vGlare > 0.5 ) {
    // the lamp seen head-on: a tight core with a wide veiling halo
    float core = pow( r, 7.0 );
    float halo = pow( r, 2.2 );
    // A glare billboard is a fixed size in metres, so walking the camera up to
    // the lamp scales it across the whole frame. Falling off with distance
    // keeps it the size of a lamp instead of the size of the shot.
    float dcg = length( vWorld - cameraPosition );
    float near = smoothstep( 2.0, 7.0, dcg );
    float a = ( core * 1.5 + halo * 0.22 ) * uGlareGain * mix( 0.18, 1.0, near );
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
  // view down the beam axis crosses every one of them at once — twenty slices
  // of scatter stacked into a single pixel. Physically that *is* brighter, but
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

function beamGeometry() {
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

function createHeadlightBeams() {
  const group = new THREE.Group();
  group.name = 'headlightBeams';
  group.frustumCulled = false;
  const geo = beamGeometry();
  const meshes = [];
  const throwLights = [];
  let lamps = null;
  let searched = 0;
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _a = new THREE.Vector3();
  const _c = new THREE.Vector3();

  // Throw lamps.
  //
  // The truck's own spots are set for a daylight running-lamp read and are two
  // orders of magnitude short of lighting a trail: at 22 candela with an
  // inverse-1.4 falloff the pool ten metres out lands *under* the moonlight,
  // which is the one thing a night frame cannot have. These sit a metre in
  // front of each lamp, so the pool is trail rather than a blown brush bar, and
  // they run a near-linear falloff because inverse-square across three to
  // twenty metres is an eighty-fold range and no exposure holds both ends.
  //
  // They are created here rather than switched on later so the scene's light
  // count never changes after the first frame — three keys its program cache on
  // that, and a mode switch that recompiles every material in the scene under a
  // software rasteriser is a thirty-second stall.
  for (let i = 0; i < 3; i++) {
    const l = new THREE.SpotLight(0xffe3b8, 0, 70, 0.42, 0.62, 1.0);
    l.visible = false;
    l.castShadow = false;
    group.add(l, l.target);
    throwLights.push(l);
  }

  function makeBeam() {
    const mat = new THREE.ShaderMaterial({
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
        const thrower = throwLights[i];
        if (thrower) thrower.visible = on;
        if (!on) continue;
        lit = true;
        light.getWorldPosition(_p);
        light.target.getWorldPosition(_t);
        _d.copy(_t).sub(_p);
        if (_d.lengthSq() < 1e-6) continue;
        _d.normalize();
        if (thrower) {
          // Aimed at the trail rather than along the lamp's own axis. The
          // vehicle aims its spots nearly level, which puts the hot centre of
          // the cone on tree trunks ten metres out — they blow to white while
          // the dirt underneath, taking the same light at eight degrees of
          // incidence, stays at a tenth of the value. Tipping the axis down
          // onto the ground and letting the penumbra carry the trees is the
          // whole difference between a lit trail and a lit forest.
          _a.copy(_d);
          _a.y = Math.min(_a.y, -0.13);
          _a.normalize();
          thrower.position.copy(_p).addScaledVector(_d, 1.2);
          thrower.target.position.copy(thrower.position).addScaledVector(_a, 20);
          thrower.color.copy(light.color);
          thrower.angle = Math.min(light.angle * 0.85, 1.0);
          thrower.penumbra = 0.7;
          // Nearly no distance falloff, and the range shaped by the cutoff
          // instead.
          //
          // Inverse square across a trail that runs from two metres to twenty
          // is a hundred-fold range and no exposure holds both ends: either the
          // fern by the brush bar is paper white or the trail ten metres out is
          // under the moonlight. Standing the source off past the bumper fixes
          // the near end and loses the pool out of any frame shot from in front
          // of the truck. A decay of a third with three's quartic cutoff gives
          // an even wash over the whole useful throw and rolls off to nothing
          // at the far edge, which is what a headlamp on a trail looks like and
          // what an inverse-square point source never does.
          thrower.decay = 0.35;
          thrower.distance = 32;
          thrower.intensity = light.intensity * cfg.lamps.gain;
        }
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
        u.uIntensity.value = ((0.5 * light.intensity) / 22) * cfg.beams.gain * (2.0 / SLICES);
        u.uGlareGain.value = cfg.beams.glare * 0.32;
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
        const inside = insideSpan * (1 - THREE.MathUtils.smoothstep(lateral, span * 0.7, span * 2.0));
        u.uInside.value = THREE.MathUtils.lerp(1, 0.16, inside);
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
