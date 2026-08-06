// Sky, sun/moon, cloud layer, lighting rig and time-of-day control.
// The sky is a single analytic scattering shader with a procedural star dome and
// a two-level FBM cloud deck; the PBR environment is baked from it whenever the
// light changes, so metal on the launchers always reflects the correct sky.
//
// The dome writes *linear* radiance into the HDR composer buffer and is
// deliberately not tone mapped here — the ACES curve in OutputPass does that
// once, for the sky and the lit scene together. The same values feed
// PMREMGenerator, which bakes with tone mapping disabled, so the environment
// probe and the visible sky agree.

import * as THREE from 'three';
import { TOD, WORLD } from './config.js';
import { atmosphere, updateAtmosphere } from './util/materials.js';
import { starfieldTexture } from './util/textures.js';
import { GLSL_NOISE } from './util/noise.js';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize( position );
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z = gl_Position.w * 0.9999999;
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;

uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uTurbidity;
uniform float uRayleigh;
uniform float uMieCoefficient;
uniform float uMieG;
uniform float uNight;
uniform float uStarIntensity;
uniform float uCloudCoverage;
uniform float uCloudTime;
uniform float uCloudScale;
uniform float uCloudLayers;
uniform vec3 uCloudSun;
uniform vec3 uCloudAmb;
uniform vec2 uWind;
uniform float uExposure;
uniform sampler2D uStars;
uniform float uGroundGlow;
uniform vec3 uGroundGlowColor;
uniform vec3 uBelowTint;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform vec3 uHorizonTint;
uniform float uHorizonStrength;
uniform float uHorizonFalloff;
uniform vec3 uZenithTint;
uniform float uZenithStrength;
uniform vec3 uBeltTint;
uniform float uBeltStrength;
uniform float uGlow;
uniform float uSunDiscBright;
uniform float uKnee;
uniform float uAirglow;
uniform float uMoonlight;
uniform float uMoonDisc;

const float PI = 3.141592653589793;
const vec3 UP = vec3( 0.0, 1.0, 0.0 );

// Preetham-style analytic scattering constants.
const vec3 LAMBDA = vec3( 680E-9, 550E-9, 450E-9 );
const vec3 TOTAL_RAYLEIGH = vec3( 5.804542996E-6, 1.3562911E-5, 3.0265902E-5 );
const float V = 4.0;
const vec3 MIE_K = vec3( 0.686, 0.678, 0.666 );
const float RAYLEIGH_ZENITH = 8.4E3;
const float MIE_ZENITH = 1.25E3;
const float SUN_ANGULAR_RADIUS = 0.0093;
const float MOON_ANGULAR_RADIUS = 0.0125;

${GLSL_NOISE}

vec3 totalMie( float T ) {
  float c = ( 0.2 * T ) * 10E-18;
  return 0.434 * c * PI * pow( ( 2.0 * PI ) / LAMBDA, vec3( V - 2.0 ) ) * MIE_K;
}

float rayleighPhase( float cosTheta ) {
  return ( 3.0 / ( 16.0 * PI ) ) * ( 1.0 + pow( cosTheta, 2.0 ) );
}

float hgPhase( float cosTheta, float g ) {
  float g2 = pow( g, 2.0 );
  float inv = 1.0 / max( 1e-4, pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 ) );
  return ( 1.0 / ( 4.0 * PI ) ) * ( ( 1.0 - g2 ) * inv );
}

/**
 * Crisp point stars on a cube-face cell grid. The dome texture is only 2k
 * across, so its drawn stars magnify into soft blobs at any reasonable field of
 * view; these stay a couple of pixels wide and antialias against the pixel
 * footprint instead. One cell lookup per pixel — the star always sits inside
 * its own cell, so no neighbourhood search is needed.
 */
vec3 pointStars( vec3 dir, float t ) {
  vec3 a = abs( dir );
  vec2 uv;
  float face;
  if ( a.x >= a.y && a.x >= a.z ) { uv = dir.zy / a.x; face = dir.x > 0.0 ? 0.0 : 1.0; }
  else if ( a.y >= a.z ) { uv = dir.xz / a.y; face = dir.y > 0.0 ? 2.0 : 3.0; }
  else { uv = dir.xy / a.z; face = dir.z > 0.0 ? 4.0 : 5.0; }

  vec2 g = uv * 27.0 + face * 53.0;
  vec2 gi = floor( g );
  float h = hash12( gi );
  if ( h < 0.52 ) return vec3( 0.0 );

  vec2 gf = g - gi;
  vec2 sp = vec2( hash12( gi + 17.3 ), hash12( gi + 41.7 ) ) * 0.64 + 0.18;
  float mag = hash12( gi + 5.1 );
  float amp = pow( mag, 3.4 );
  float rad = 0.010 + 0.030 * amp;
  float px = max( fwidth( g.x ), fwidth( g.y ) ) * 0.6 + 1e-5;
  float d = length( gf - sp );
  // Spread to the pixel footprint when the star is sub-pixel and pay back the
  // peak, so wide shots dim smoothly rather than crawling with aliasing.
  float w = max( rad, px );
  float s = ( 1.0 - smoothstep( 0.0, w, d ) ) * ( rad * rad ) / ( w * w );
  s += exp( -d / ( rad * 3.0 ) ) * amp * 0.10;
  float tw = 0.72 + 0.28 * sin( t * 2.6 + mag * 63.0 );
  vec3 tint = mix( vec3( 0.72, 0.80, 1.00 ), vec3( 1.00, 0.86, 0.70 ), hash12( gi + 91.2 ) );
  return tint * s * ( 0.25 + 3.2 * amp ) * tw;
}

/** Full-detail cloud field: two octave sets so edges stay crisp. */
float cloudField( vec2 p, float t, float cov ) {
  vec2 q = p + uWind * t;
  float base = fbm3g( vec3( q, t * 0.03 ), 4 ) * 0.5 + 0.5;
  float det = fbm3g( vec3( q * 3.3 + 19.0, t * 0.08 ), 3 ) * 0.5 + 0.5;
  float d = base * 0.74 + det * 0.26;
  return smoothstep( 1.0 - cov, 1.0 - cov * 0.30, d );
}

/** Cheap field used only for the light-march taps. */
float cloudBulk( vec2 p, float t, float cov ) {
  float base = fbm3g( vec3( p + uWind * t, t * 0.03 ), 3 ) * 0.5 + 0.5;
  return smoothstep( 1.0 - cov, 1.0 - cov * 0.30, base );
}

void main() {
  vec3 dir = normalize( vDir );
  // Keep the scattering model stable when the sun sits below the horizon.
  vec3 sunPos = uSunDir;
  float sunE = sunPos.y;
  vec3 sunN = normalize( sunPos );
  vec3 moonN = normalize( uMoonDir );
  vec3 sunClamped = normalize( vec3( sunPos.x, max( sunPos.y, 0.02 ), sunPos.z ) );

  float sunfade = 1.0 - clamp( 1.0 - exp( ( sunE * 6.0 ) ), 0.0, 1.0 );
  float rayleighCoef = uRayleigh - ( 1.0 - sunfade );
  vec3 betaR = TOTAL_RAYLEIGH * max( 0.0, rayleighCoef );
  vec3 betaM = totalMie( uTurbidity ) * uMieCoefficient;

  float zenithAngle = acos( max( 0.0, dot( UP, dir ) ) );
  float inv = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / PI ), -1.253 ) );
  float sR = RAYLEIGH_ZENITH * inv;
  float sM = MIE_ZENITH * inv;
  vec3 Fex = exp( -( betaR * sR + betaM * sM ) );

  float cosTheta = dot( dir, sunClamped );
  vec3 betaRTheta = betaR * rayleighPhase( cosTheta * 0.5 + 0.5 );
  vec3 betaMTheta = betaM * hgPhase( cosTheta, uMieG );

  float sunIntensity = 1000.0 * max( 0.0, 1.0 - exp( -( ( PI * 0.5 - acos( sunE ) ) / 1.5 ) ) );
  vec3 Lin = pow( sunIntensity * ( ( betaRTheta + betaMTheta ) / ( betaR + betaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
  Lin *= mix( vec3( 1.0 ), pow( sunIntensity * ( ( betaRTheta + betaMTheta ) / ( betaR + betaM ) ) * Fex, vec3( 0.5 ) ),
              clamp( pow( 1.0 - dot( UP, sunClamped ), 5.0 ), 0.0, 1.0 ) );

  // Preetham's raw horizon/zenith ratio is thousands to one at a low sun, which
  // clips to white long before any colour shows. Compress it hue-preservingly:
  // luminance L becomes L^knee, so the gradient survives the tone mapper.
  float lum = max( dot( Lin, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-5 );
  Lin *= pow( lum, uKnee - 1.0 );

  // ---- sun disc and aureole (deliberately left uncompressed) -----------
  float sunCos = dot( dir, sunN );
  float sunAng = acos( clamp( sunCos, -1.0, 1.0 ) );
  float above = clamp( sunE * 9.0 + 0.12, 0.0, 1.0 );
  float rDisc = clamp( sunAng / SUN_ANGULAR_RADIUS, 0.0, 1.0 );
  float disc = smoothstep( SUN_ANGULAR_RADIUS, SUN_ANGULAR_RADIUS * 0.88, sunAng );
  // Limb darkening keeps the disc from reading as a flat sticker.
  float limb = pow( max( 0.0, 1.0 - rDisc * rDisc ), 0.32 );
  vec3 L0 = Fex * 0.02;
  L0 += uSunDiscBright * Fex * disc * ( 0.42 + 0.58 * limb ) * above;
  // Three-lobe forward glow: tight aureole, mid halo, broad sky wash.
  float aureole = pow( max( 0.0, sunCos ), 1400.0 ) * 900.0
                + pow( max( 0.0, sunCos ), 120.0 ) * 42.0
                + pow( max( 0.0, sunCos ), 14.0 ) * 3.4;
  L0 += Fex * aureole * uGlow * above;

  vec3 sky = Lin * uExposure + L0;

  // ---- horizon / zenith grading ---------------------------------------
  float up = max( dir.y, 0.0 );
  vec2 dh = normalize( dir.xz + 1e-5 );
  vec2 sh = normalize( sunClamped.xz + 1e-5 );
  float toward = dot( dh, sh ) * 0.5 + 0.5;
  // Warm band hugging the horizon, strongest on the sun side.
  sky += uHorizonTint * uHorizonStrength * pow( 1.0 - up, uHorizonFalloff ) *
         ( 0.16 + 0.84 * pow( toward, 1.5 ) ) * above;
  sky += uZenithTint * uZenithStrength * pow( up, 0.75 );
  // Anti-twilight arch: a pink shelf on the shadow side just above the rim.
  float belt = smoothstep( 0.01, 0.09, dir.y ) * ( 1.0 - smoothstep( 0.09, 0.32, dir.y ) );
  sky += uBeltTint * uBeltStrength * belt * ( 1.0 - toward ) * above;

  // ---- night sky -------------------------------------------------------
  if ( uNight > 0.001 ) {
    vec3 nightSky = mix( vec3( 0.0046, 0.0072, 0.0148 ), vec3( 0.0013, 0.0022, 0.0054 ), smoothstep( -0.05, 0.65, dir.y ) );
    // Faint airglow band sitting a few degrees above the rim.
    float ag = exp( -pow( ( dir.y - 0.030 ) / 0.070, 2.0 ) ) * smoothstep( -0.03, 0.02, dir.y );
    nightSky += vec3( 0.011, 0.022, 0.018 ) * uAirglow * ag;
    // Moonlight scattered through the air: cool, broad, brightest near the moon.
    float mu = dot( dir, moonN );
    float mAng = acos( clamp( mu, -1.0, 1.0 ) );
    nightSky += vec3( 0.055, 0.070, 0.115 ) * uMoonlight *
                ( pow( max( 0.0, mu ), 3.0 ) * 0.55 + 0.10 ) * smoothstep( -0.12, 0.35, dir.y );

    // Moon disc: limb darkening, maria and a real terminator from the sun.
    float mDisc = smoothstep( MOON_ANGULAR_RADIUS, MOON_ANGULAR_RADIUS * 0.94, mAng );
    if ( mDisc > 0.0 ) {
      vec3 t1 = normalize( cross( moonN, UP ) );
      vec3 t2 = cross( moonN, t1 );
      vec3 rel = dir - moonN * mu;
      vec2 pd = vec2( dot( rel, t1 ), dot( rel, t2 ) ) / MOON_ANGULAR_RADIUS;
      float rr = clamp( dot( pd, pd ), 0.0, 1.0 );
      vec3 nrmW = normalize( -moonN * sqrt( max( 0.0, 1.0 - rr ) ) + t1 * pd.x + t2 * pd.y );
      float ndl = clamp( dot( nrmW, sunN ), 0.0, 1.0 );
      float maria = fbm3g( dir * 260.0, 4 ) * 0.5 + 0.5;
      vec3 surf = mix( vec3( 0.52, 0.55, 0.62 ), vec3( 0.94, 0.94, 0.97 ), smoothstep( 0.34, 0.74, maria ) );
      // Opposition-style flat response plus a little earthshine on the dark limb.
      float lit = pow( ndl, 0.45 ) * ( 0.55 + 0.45 * sqrt( max( 0.0, 1.0 - rr ) ) ) + 0.035;
      nightSky += surf * lit * mDisc * uMoonlight * uMoonDisc;
    }
    // Corona around the disc.
    nightSky += vec3( 0.58, 0.66, 0.88 ) * uMoonlight * ( exp( -mAng * 26.0 ) * 0.32 + exp( -mAng * 5.0 ) * 0.030 );
    sky = mix( sky, nightSky, uNight );
  }

  // ---- stars ------------------------------------------------------------
  if ( uStarIntensity > 0.001 ) {
    vec2 suv = vec2( atan( dir.z, dir.x ) / ( 2.0 * PI ) + 0.5, acos( clamp( dir.y, -1.0, 1.0 ) ) / PI );
    // Squash the dome map down to its nebulosity. Its drawn point sources are
    // a few texels wide and would magnify into blobs, so a soft knee flattens
    // them toward the Milky Way band without giving them a hard-edged plateau.
    vec3 st = texture2D( uStars, suv ).rgb;
    vec3 neb = st * ( 0.9 / ( 1.0 + 38.0 * max( st.r, max( st.g, st.b ) ) ) );
    vec3 stars = neb + pointStars( dir, uCloudTime );
    // Extinction thickens fast in the last few degrees, as it does for real.
    float ext = exp( -0.32 / max( dir.y + 0.055, 0.04 ) ) * 2.6;
    stars *= uStarIntensity * clamp( ext, 0.0, 1.0 ) * smoothstep( -0.02, 0.10, dir.y );
    sky += stars * 0.32;
  }

  // ---- cloud decks ------------------------------------------------------
  if ( uCloudCoverage > 0.001 && dir.y > 0.010 ) {
    float invY = 1.0 / max( dir.y, 0.030 );
    vec3 keyDir = normalize( mix( sunClamped, moonN, uNight ) );
    float cosKey = dot( dir, keyDir );
    float phase = min( hgPhase( cosKey, 0.72 ) * 2.0, 2.4 );
    vec2 sdir = normalize( keyDir.xz + 1e-4 );
    float horizonFade = smoothstep( 0.012, 0.11, dir.y );
    // Grazing rays smear the projection, so let coverage thin out down there.
    float thin = mix( 0.45, 1.0, smoothstep( 0.03, 0.30, dir.y ) );

    // High cirrus first — it sits behind the main deck.
    if ( uCloudLayers > 1.5 ) {
      vec2 cuv = dir.xz * ( uCloudScale * 2.35 * invY ) + vec2( 41.0, 17.0 );
      float d = cloudField( cuv, uCloudTime * 1.7, uCloudCoverage * 0.62 );
      if ( d > 0.002 ) {
        float shd = cloudBulk( cuv + sdir * 0.22, uCloudTime * 1.7, uCloudCoverage * 0.62 );
        float trans = exp( -shd * 0.65 );
        vec3 col = uCloudSun * ( 0.55 + 0.45 * trans ) + uCloudAmb * 0.6;
        col += uCloudSun * phase * ( 1.0 - d ) * 0.30;
        sky = mix( sky, col, clamp( d * horizonFade * thin * 0.48, 0.0, 1.0 ) );
      }
    }

    vec2 cuv = dir.xz * ( uCloudScale * invY );
    float d = cloudField( cuv, uCloudTime, uCloudCoverage );
    if ( d > 0.002 ) {
      // Three-tap march toward the key light approximates self-shadowing.
      float shd = cloudBulk( cuv + sdir * 0.11, uCloudTime, uCloudCoverage )
                + cloudBulk( cuv + sdir * 0.28, uCloudTime, uCloudCoverage ) * 0.68
                + cloudBulk( cuv + sdir * 0.60, uCloudTime, uCloudCoverage ) * 0.36;
      float trans = exp( -shd * 1.45 );
      // Powder term keeps thin wisps from reading as flat grey cut-outs.
      float powder = 1.0 - exp( -d * 4.5 );
      vec3 col = uCloudSun * trans * ( 0.30 + 0.70 * powder ) + uCloudAmb * ( 0.32 + 0.68 * ( 1.0 - d ) );
      // Silver lining: forward scattering through the thin edge facing the sun.
      col += uCloudSun * phase * ( 1.0 - d ) * ( 0.35 + 0.65 * trans ) * 0.45;
      sky = mix( sky, col, clamp( d * horizonFade * thin * 0.97, 0.0, 1.0 ) );
    }
  }

  // ---- ground haze + base light dome ----------------------------------
  float below = smoothstep( 0.045, -0.14, dir.y );
  sky = mix( sky, uBelowTint, below * 0.85 );
  sky += uGroundGlowColor * uGroundGlow * pow( clamp( 1.0 - abs( dir.y ) * 3.2, 0.0, 1.0 ), 2.0 );
  // Flash inscatter is weighted to the lower sky: light from an air-burst
  // reaches the eye through the thick air near the horizon, and keeping the
  // zenith mostly clear means the stars survive the brightest frame.
  sky += uFlashColor * uFlash * ( 0.22 + 0.78 * pow( 1.0 - clamp( dir.y, 0.0, 1.0 ), 2.5 ) );

  gl_FragColor = vec4( max( sky, vec3( 0.0 ) ), 1.0 );
}
`;

/**
 * Per-preset sky/cloud/lighting look. Kept next to the shader rather than in
 * config so the numbers that only the dome reads stay with the dome.
 */
const LOOK = {
  day: {
    rayleigh: 1.75,
    mie: 0.0042,
    mieG: 0.78,
    knee: 0.74,
    glow: 0.020,
    sunDisc: 320,
    horizonTint: 0xe6e4d6,
    horizonStrength: 0.20,
    horizonFalloff: 4.0,
    zenithTint: 0x1e5ad2,
    zenithStrength: 0.07,
    beltTint: 0x000000,
    beltStrength: 0,
    cloudCoverage: 0.46,
    cloudScale: 1.00,
    cloudSun: 0xfff6e8,
    cloudSunGain: 2.10,
    cloudAmb: 0x9dbadd,
    cloudAmbGain: 0.40,
    airglow: 0,
    moonlight: 0,
    moonDisc: 0,
    wind: [0.0135, 0.0062],
    groundGlow: 0,
    groundGlowColor: 0x9fb3cb,
    belowTint: 0xb4c4d6,
    belowGain: 1.5,
    fillColor: 0x9dc0f0,
    fillIntensity: 0.18,
    fillDir: [-0.35, 0.62, -0.42],
    bounceIntensity: 0.24,
    atmHeight: 1900,
    shadowBias: -0.0005,
    shadowNormalBias: 0.28,
  },
  sunset: {
    rayleigh: 3.1,
    mie: 0.0135,
    mieG: 0.865,
    knee: 0.42,
    glow: 0.035,
    sunDisc: 500,
    horizonTint: 0xff7a2e,
    horizonStrength: 1.90,
    horizonFalloff: 2.4,
    zenithTint: 0x26398c,
    zenithStrength: 0.06,
    beltTint: 0xc07ac0,
    beltStrength: 0.12,
    cloudCoverage: 0.52,
    cloudScale: 1.15,
    cloudSun: 0xffab5c,
    cloudSunGain: 3.20,
    cloudAmb: 0x4a5a8c,
    cloudAmbGain: 0.26,
    airglow: 0,
    moonlight: 0,
    moonDisc: 0,
    wind: [0.0150, 0.0070],
    groundGlow: 0,
    groundGlowColor: 0x9c5a34,
    belowTint: 0x8a4a28,
    belowGain: 0.9,
    fillColor: 0x5f79c8,
    fillIntensity: 0.42,
    fillDir: [0.42, 0.55, -0.30],
    bounceIntensity: 0.30,
    atmHeight: 1500,
    shadowBias: -0.0006,
    shadowNormalBias: 0.34,
  },
  night: {
    rayleigh: 1.4,
    mie: 0.0040,
    mieG: 0.76,
    knee: 0.60,
    glow: 0.02,
    sunDisc: 0,
    horizonTint: 0x1a2438,
    horizonStrength: 0.0,
    horizonFalloff: 6.0,
    zenithTint: 0x000000,
    zenithStrength: 0,
    beltTint: 0x000000,
    beltStrength: 0,
    cloudCoverage: 0.30,
    cloudScale: 0.95,
    cloudSun: 0x9db4e6,
    cloudSunGain: 0.14,
    cloudAmb: 0x1a2440,
    cloudAmbGain: 0.06,
    airglow: 0.85,
    moonlight: 1.0,
    moonDisc: 3.4,
    wind: [0.0100, 0.0046],
    groundGlow: 0.085,
    groundGlowColor: 0x35507a,
    belowTint: 0x0e1622,
    belowGain: 1.0,
    fillColor: 0x2e4a86,
    fillIntensity: 0.10,
    fillDir: [-0.4, 0.7, 0.35],
    bounceIntensity: 0.05,
    atmHeight: 2400,
    shadowBias: -0.0007,
    shadowNormalBias: 0.42,
  },
};

export class Weather {
  constructor(renderer, scene, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.quality = quality;
    this.time = 0;
    this.todId = 'day';
    this.tod = TOD.day;
    this.look = LOOK.day;
    this.sunDir = new THREE.Vector3(0.4, 0.7, 0.55).normalize();
    this.moonDir = new THREE.Vector3(-0.4, 0.5, -0.6).normalize();
    this.wind = new THREE.Vector3(1.6, 0, 0.6);
    this.flash = 0;
    this.flashEnv = 0;
    this.flashColor = new THREE.Color(1, 0.86, 0.7);

    this.uniforms = {
      uSunDir: { value: this.sunDir },
      uMoonDir: { value: this.moonDir },
      uTurbidity: { value: 2.6 },
      uRayleigh: { value: 1.75 },
      uMieCoefficient: { value: 0.0042 },
      uMieG: { value: 0.78 },
      uNight: { value: 0 },
      uStarIntensity: { value: 0 },
      uCloudCoverage: { value: quality.clouds > 0 ? 0.4 : 0 },
      uCloudTime: { value: 0 },
      uCloudScale: { value: 0.52 },
      uCloudLayers: { value: Math.min(2, quality.clouds) },
      uCloudSun: { value: new THREE.Color(0xfff6e8) },
      uCloudAmb: { value: new THREE.Color(0x9dbadd) },
      uWind: { value: new THREE.Vector2(0.0135, 0.0062) },
      uExposure: { value: 0.8 },
      uStars: { value: starfieldTexture(2048) },
      uGroundGlow: { value: 0 },
      uGroundGlowColor: { value: new THREE.Color(0x9fb3cb) },
      uBelowTint: { value: new THREE.Color(0xb4c4d6) },
      uFlash: { value: 0 },
      uFlashColor: { value: this.flashColor },
      uHorizonTint: { value: new THREE.Color(0xe6e4d6) },
      uHorizonStrength: { value: 0.3 },
      uHorizonFalloff: { value: 4.0 },
      uZenithTint: { value: new THREE.Color(0x1e5ad2) },
      uZenithStrength: { value: 0.07 },
      uBeltTint: { value: new THREE.Color(0x000000) },
      uBeltStrength: { value: 0 },
      uGlow: { value: 0.045 },
      uSunDiscBright: { value: 520 },
      uKnee: { value: 0.74 },
      uAirglow: { value: 0 },
      uMoonlight: { value: 0 },
      uMoonDisc: { value: 0 },
    };

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    this.sky.scale.setScalar(WORLD.cameraFar * 0.42);
    scene.add(this.sky);

    // ---- lighting rig ------------------------------------------------
    this.sun = new THREE.DirectionalLight(0xfff3df, 3.4);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.setScalar(quality.shadowMapSize);
    s.camera.near = 1;
    s.camera.far = 900;
    const ext = 260;
    s.camera.left = -ext;
    s.camera.right = ext;
    s.camera.top = ext;
    s.camera.bottom = -ext;
    s.bias = -0.0005;
    s.normalBias = 0.28;
    s.blurSamples = 12;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x9fb6d6, 0x8a6e50, 0.55);
    scene.add(this.hemi);
    this.hemiBase = new THREE.Color(0x9fb6d6);
    this.hemiIntensityBase = 0.55;

    // Warm bounce from the sunlit pad keeps vehicle undersides from going flat.
    this.bounce = new THREE.DirectionalLight(0x8a6e50, 0.32);
    this.bounce.position.set(0, -1, 0.2);
    scene.add(this.bounce);

    // Cool sky-side fill opposite the key. Cheap way to keep shadowed faces
    // reading as shadow rather than as black, without lifting the whole frame.
    this.fill = new THREE.DirectionalLight(0x9dc0f0, 0.3);
    this.fillOffset = new THREE.Vector3(-140, 250, -170);
    this.fill.position.copy(this.fillOffset);
    scene.add(this.fill);
    scene.add(this.fill.target);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envRT = null;
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(this.sky.geometry, this.skyMat);
    this.envSky.scale.setScalar(100);
    this.envScene.add(this.envSky);

    this.atmColorBase = new THREE.Color(0x9fb3cb);
    this.envIntensityBase = 0.5;

    this.setTimeOfDay('day');
  }

  setTimeOfDay(id) {
    const tod = TOD[id] || TOD.day;
    const look = LOOK[id] || LOOK.day;
    this.todId = id;
    this.tod = tod;
    this.look = look;
    const elev = tod.sunElev;
    const az = tod.sunAzim;
    this.sunDir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)).normalize();
    // Park the moon roughly opposite the sun so the disc reads as a bright
    // gibbous rather than a thin crescent — it is the night key light.
    const mAz = az + Math.PI * 0.86;
    const mEl = 0.62;
    this.moonDir.set(Math.cos(mEl) * Math.cos(mAz), Math.sin(mEl), Math.cos(mEl) * Math.sin(mAz)).normalize();

    const u = this.uniforms;
    u.uTurbidity.value = tod.turbidity;
    u.uRayleigh.value = look.rayleigh;
    u.uMieCoefficient.value = look.mie;
    u.uMieG.value = look.mieG;
    u.uNight.value = THREE.MathUtils.clamp(-elev * 3.6 + 0.05, 0, 1);
    u.uStarIntensity.value = tod.starIntensity;
    u.uExposure.value = tod.skyExposure !== undefined ? tod.skyExposure : 0.03;
    u.uKnee.value = look.knee;
    u.uCloudCoverage.value = this.quality.clouds > 0 ? look.cloudCoverage : 0;
    u.uCloudScale.value = look.cloudScale;
    u.uCloudLayers.value = Math.min(2, this.quality.clouds);
    u.uCloudSun.value.setHex(look.cloudSun).multiplyScalar(look.cloudSunGain);
    u.uCloudAmb.value.setHex(look.cloudAmb).multiplyScalar(look.cloudAmbGain);
    u.uWind.value.set(look.wind[0], look.wind[1]);
    u.uHorizonTint.value.setHex(look.horizonTint);
    u.uHorizonStrength.value = look.horizonStrength;
    u.uHorizonFalloff.value = look.horizonFalloff;
    u.uZenithTint.value.setHex(look.zenithTint);
    u.uZenithStrength.value = look.zenithStrength;
    u.uBeltTint.value.setHex(look.beltTint);
    u.uBeltStrength.value = look.beltStrength;
    u.uGlow.value = look.glow;
    u.uSunDiscBright.value = look.sunDisc;
    u.uAirglow.value = look.airglow;
    u.uMoonlight.value = look.moonlight;
    u.uMoonDisc.value = look.moonDisc;
    u.uGroundGlow.value = look.groundGlow;
    u.uGroundGlowColor.value.setHex(look.groundGlowColor);
    u.uBelowTint.value.setHex(look.belowTint).multiplyScalar(look.belowGain);

    const night = elev < 0;
    const keyDir = night ? this.moonDir : this.sunDir;

    this.sun.color.setHex(tod.sunColor);
    this.sun.intensity = tod.sunIntensity;
    const sh = this.sun.shadow;
    sh.bias = look.shadowBias;
    sh.normalBias = look.shadowNormalBias;
    this.sun.position.copy(keyDir).multiplyScalar(420);

    this.hemiBase.setHex(tod.ambient);
    this.hemiIntensityBase = tod.ambientIntensity;
    this.hemi.color.copy(this.hemiBase);
    this.hemi.groundColor.setHex(tod.groundBounce);
    this.hemi.intensity = this.hemiIntensityBase;

    this.bounce.color.setHex(tod.groundBounce);
    this.bounce.intensity = look.bounceIntensity;

    this.fill.color.setHex(look.fillColor);
    this.fill.intensity = look.fillIntensity;
    this.fillOffset.set(look.fillDir[0], look.fillDir[1], look.fillDir[2]).normalize().multiplyScalar(400);
    this.fill.position.copy(this.fillOffset);

    this.scene.fog = new THREE.FogExp2(tod.fogColor, tod.fogDensity);
    updateAtmosphere(tod, keyDir);
    atmosphere.uAtmHeight.value = look.atmHeight;
    this.atmColorBase.setHex(tod.fogColor);

    this.flash = 0;
    this.flashEnv = 0;
    this.uniforms.uFlash.value = 0;
    this.envIntensityBase = tod.envIntensity !== undefined ? tod.envIntensity : 0.5;
    this.bakeEnvironment();
  }

  bakeEnvironment() {
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0.04, 1, 1000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = this.envIntensityBase;
  }

  /**
   * Bright transient light from a launch or an intercept. As well as lifting
   * the sky it briefly drives the ambient, the environment probe and the
   * aerial-perspective inscatter, so a big kill genuinely lights the valley.
   */
  addFlash(amount, color) {
    this.flash = Math.min(1.8, this.flash + amount);
    this.flashEnv = Math.min(1.5, this.flashEnv + amount * 1.15);
    if (color) this.flashColor.copy(color);
  }

  update(dt, camera) {
    this.time += dt;
    this.uniforms.uCloudTime.value = this.time;
    this.sky.position.copy(camera.position);

    // Two decays: a fast one for the sky term and a slightly slower, smoothly
    // damped one for the environment response so the lift does not pop off.
    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.uniforms.uFlash.value = this.flash * this.flashSkyGain();
    if (this.flashEnv > 1e-4) {
      this.flashEnv *= Math.exp(-dt * 5.2);
      if (this.flashEnv < 1e-4) this.flashEnv = 0;
      this.applyFlashResponse(this.flashEnv);
    } else if (this.flashApplied) {
      this.applyFlashResponse(0);
    }

    // Follow the camera so the shadow cascade always covers the play area.
    const t = this.sun.target;
    t.position.set(camera.position.x, 0, camera.position.z);
    const dir = this.tod.sunElev < 0 ? this.moonDir : this.sunDir;
    this.sun.position.copy(t.position).addScaledVector(dir, 420);
    this.fill.target.position.copy(t.position);
    this.fill.position.copy(t.position).add(this.fillOffset);
  }

  /** Night reads much darker, so the same flash should lift the sky further. */
  flashSkyGain() {
    return this.todId === 'night' ? 0.105 : 0.075;
  }

  applyFlashResponse(f) {
    this.flashApplied = f > 0;
    const night = this.todId === 'night';
    this.hemi.intensity = this.hemiIntensityBase + f * (night ? 0.7 : 0.5);
    this.hemi.color.copy(this.hemiBase).lerp(this.flashColor, Math.min(0.8, f * 0.75));
    this.scene.environmentIntensity = this.envIntensityBase * (1 + f * (night ? 1.9 : 1.0));
    atmosphere.uAtmColor.value.copy(this.atmColorBase).lerp(this.flashColor, Math.min(0.3, f * 0.24));
  }

  dispose() {
    if (this.envRT) this.envRT.dispose();
    this.pmrem.dispose();
    this.skyMat.dispose();
    this.sky.geometry.dispose();
  }
}
