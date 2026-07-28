import * as THREE from 'three';
import { clamp, saturate, smoothstep, TAU } from '../core/MathUtils';
import type { QualityConfig } from '../core/Config';
import { FARPLANE_VERTEX } from './Blitter';
import { GLSL_COMMON, GLSL_NOISE, GLSL_PHASE } from './ShaderLib';

/**
 * Physically-based sky.
 *
 * Rayleigh + Mie single scattering (Preetham analytic model) evaluated per
 * pixel, extended with a limb-darkened sun disc, a tight secondary Mie lobe for
 * the forward halo, horizon haze, a night/dusk parameterisation with stars and
 * moon glow, and a layered raymarched cloud deck with sun self-shadowing.
 *
 * The dome is drawn as a full-screen triangle pinned to the far plane with the
 * depth test on, so it is rejected by early-Z wherever geometry already covered
 * the pixel — cheaper than an inverted sphere and never intersects the world.
 */

const RAYLEIGH_ZENITH_LENGTH = 8.4e3;
const MIE_ZENITH_LENGTH = 1.25e3;
const SUN_CUTOFF_ANGLE = 1.6110731556870734;
const SUN_STEEPNESS = 1.5;
const SUN_EE = 1000.0;

/**
 * Top-of-atmosphere solar irradiance, in this module's radiance units.
 *
 * This one number fixes the photometric scale of the whole game. It is chosen so
 * that a 20%-albedo surface facing an overhead sun reads roughly 1.3x the
 * radiance the sky shader writes for the zenith, which is the ratio a light meter
 * gives outdoors. Get it wrong and no amount of grading recovers: too low and
 * every surface sits in a black pit under a blown-out sky, which is the single
 * most common way a WebGL scene gives itself away.
 */
export const SUN_TOA_IRRADIANCE = 25.0;
/** Exponent on the transmittance; 1 is physical, lower keeps dusk playable. */
const SUN_EXTINCTION_SOFTENING = 0.6;
/** Fraction of the peak channel leaked into all three for the sun's hue. */
const MULTISCATTER_LEAK = 0.11;
/**
 * Fraction of an infinite lit plane's single bounce that survives a city's own
 * inter-shadowing. Kept identical to the procgen probe's own figure so the two
 * skies present the same hemispheric ratio to the calibration.
 */
const GROUND_BOUNCE_FRACTION = 0.55;

// Rayleigh scattering coefficients for the 680/550/450 nm primaries.
const BETA_R = new THREE.Vector3(
  5.804542996261093e-6,
  1.3562911419845635e-5,
  3.0265902468824876e-5,
);
// pi * ( 2pi / lambda )^2 for the same primaries, folded with Mie's K factor.
const MIE_PRECOMP = new THREE.Vector3(
  Math.PI * 8.5378e13 * 0.686,
  Math.PI * 1.30506e14 * 0.678,
  Math.PI * 1.94955e14 * 0.666,
);

const SKY_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
#ifndef OB_EQUIRECT
  varying vec3 vRayDir;
#endif

uniform vec3 uSunDirection;
uniform vec3 uMoonDirection;
uniform vec3 uCameraPos;
uniform float uTurbidity;
uniform float uRayleigh;
uniform float uMieCoefficient;
uniform float uMieG;
uniform float uSunScale;
uniform float uNight;
uniform vec4 uHaze;         // x: falloff, y: amount, z: luminance gain, w: unused
uniform vec4 uSkyTone;      // x: scale, y: shoulder knee, z: shoulder range, w: air-mass cap
uniform vec3 uHazeColor;
uniform vec3 uGroundColor;
uniform float uTime;
uniform vec4 uCloud;        // x: coverage, y: density, z: noise scale, w: extinction scale
uniform vec2 uWind;
uniform vec4 uCloudLod;     // x: pixel angular size, y: march jitter, z: temporal phase, w: unused
uniform vec3 uCloudSunColor;
uniform vec3 uCloudAmbient;
uniform float uStars;

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_PHASE}

const float OB_PI = 3.141592653589793;
const vec3 OB_UP = vec3( 0.0, 1.0, 0.0 );
const float OB_RAYLEIGH_ZENITH = ${RAYLEIGH_ZENITH_LENGTH.toFixed(1)};
const float OB_MIE_ZENITH = ${MIE_ZENITH_LENGTH.toFixed(2)};
const vec3 OB_BETA_R = vec3( 5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5 );
const vec3 OB_MIE_PRECOMP = vec3( 1.840035e14, 2.780039e14, 4.079480e14 );
const float OB_SUN_ANGULAR_COS = 0.9998;

float obSunEnergy( float cosZenith ) {
  float zenith = acos( clamp( cosZenith, -1.0, 1.0 ) );
  return ${SUN_EE.toFixed(1)} * max( 0.0, 1.0 - exp( -( ( ${SUN_CUTOFF_ANGLE.toFixed(6)} - zenith ) / ${SUN_STEEPNESS.toFixed(1)} ) ) );
}

float obRayleighPhase( float cosTheta ) {
  return ( 3.0 / ( 16.0 * OB_PI ) ) * ( 1.0 + cosTheta * cosTheta );
}

float obSkyLuma( vec3 c ) {
  return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
}

/**
 * Linear below the knee, saturating above it. Preetham models single scattering
 * only, so nothing redistributes the energy its horizon term accumulates and the
 * raw model runs an order of magnitude brighter at the horizon than at the
 * zenith. A plain power curve would fix that ratio but would also lift the dusk
 * sky into flat grey; rolling off only the top end leaves the low end alone.
 */
float obShoulder( float x ) {
  float knee = uSkyTone.y;
  if ( x <= knee ) return x;
  float e = x - knee;
  return knee + e / ( 1.0 + e / max( uSkyTone.z, 1e-3 ) );
}

// --- clouds -----------------------------------------------------------------

#if CLOUD_STEPS > 0

const float OB_CLOUD_BOTTOM = 1400.0;
const float OB_CLOUD_TOP = 3300.0;
const float OB_CLOUD_SLAB = OB_CLOUD_TOP - OB_CLOUD_BOTTOM;
const float OB_CLOUD_SIGMA = 0.0024;
// Artistic planet radius. The true 6371 km puts the horizon shell 140 km out,
// far past where value noise holds any structure; this keeps the deck curving
// down to meet the horizon while the sample range stays inside the band the
// noise can actually resolve.
const float OB_CLOUD_CURVE = 120000.0;

/** Distance from a surface-level origin to the shell at altitude h. */
float obShellHit( float rdy, float h ) {
  float b = OB_CLOUD_CURVE * rdy;
  return sqrt( b * b + h * ( 2.0 * OB_CLOUD_CURVE + h ) ) - b;
}

/**
 * Size of one cloud sample in noise-domain units. Two limits apply and both
 * matter:
 *
 * - across the screen, the sample's footprint grows without bound as the ray
 *   flattens toward the horizon, and ignoring it gives the concentric moire that
 *   marks out a cheap cloud shader;
 * - along the ray, the march step near the horizon is several times the finest
 *   noise cell, and ignoring that gives step contours the per-pixel dither can
 *   only turn into dots.
 *
 * The screen term gets the harsher coefficient because it is point sampled,
 * whereas stepping through the medium already averages along the ray.
 */
float obFootprint( float fpScreen, float fpRay ) {
  return fpScreen * 1.6 + fpRay * 0.8;
}

float obCloudFbm( vec2 p, float fpScreen, float fpRay ) {
  // Light domain warp so the deck reads as billowing cells, not soap film.
  p += vec2( obValueNoise( p * 0.31 ), obValueNoise( p * 0.31 + 7.3 ) ) * 0.7;
  float limit = obFootprint( fpScreen, fpRay );
  float amp = 0.5;
  float freq = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  for ( int i = 0; i < CLOUD_OCTAVES; i ++ ) {
    float band = saturate( 1.0 - limit * freq );
    // An octave the footprint cannot resolve has to contribute its mean rather
    // than drop out of the normalisation: dropping it leaves whichever octaves
    // survive at full contrast, so toward the horizon -- where the march step
    // runs to kilometres and only the base octave is left -- the field never
    // converges and aliases into arcs and hatching instead.
    sum += amp * ( band > 0.004 ? mix( 0.5, obValueNoise( p ), band ) : 0.5 );
    norm += amp;
    amp *= 0.53;
    freq *= 2.07;
    p = p * 2.07 + vec2( 1.7, -3.1 );
  }
  // A handful of value-noise octaves only spans the middle of 0..1, so the mean
  // is stretched out around 0.5; that is what turns wisps into cumulus while
  // leaving a fully band-limited sample sitting exactly on the mean.
  return saturate( ( sum / norm - 0.5 ) * 1.75 + 0.5 );
}

/** h is the normalised height through the slab, 0 at the base, 1 at the top. */
float obCloudDensity( vec3 pos, float h, float fpScreen, float fpRay ) {
  // Wind shear tilts the deck with altitude, which stops the march from reading
  // as a stack of identical sheets without needing a third noise dimension.
  vec2 uv = ( pos.xz + vec2( h * 620.0, h * -260.0 ) ) * uCloud.z + uWind;
  float n = obCloudFbm( uv, fpScreen, fpRay );
  // Coverage 0.5 puts the noise mean exactly on the cloud/clear boundary, so a
  // band-limited distant sample converges to a plausible density rather than to
  // an arbitrary one.
  float threshold = 1.0 - uCloud.x;
  float d = smoothstep( threshold - 0.16, threshold + 0.16, n );
  // Smoothing a thresholded field raises its mean, because the holes fill in
  // faster than the cores thin out. Without this the coarse tiers and the far
  // field read as solid overcast at a coverage the fine ones show as scattered.
  float detail = saturate( 1.0 - obFootprint( fpScreen, fpRay ) );
  d *= mix( 0.5, 1.0, detail );
  // Rounded base, eroded anvil top.
  return d * smoothstep( 0.0, 0.22, h ) * ( 1.0 - smoothstep( 0.60, 1.02, h ) );
}

vec4 obClouds( vec3 rd, float cosTheta ) {
  float fade = smoothstep( -0.004, 0.07, rd.y );
  if ( fade <= 0.0 ) return vec4( 0.0, 0.0, 0.0, 1.0 );

  float t0 = obShellHit( rd.y, OB_CLOUD_BOTTOM );
  float t1 = obShellHit( rd.y, OB_CLOUD_TOP );
  float span = t1 - t0;
  float stepLen = span / float( CLOUD_STEPS );
  float sigma = uCloud.y * uCloud.w * OB_CLOUD_SIGMA;
  float sunStep = OB_CLOUD_SLAB / float( max( CLOUD_SHADOW_STEPS, 1 ) );

  // Offsetting the march per pixel trades the handful of visible step bands for
  // grain. The offset also cycles per frame on the golden ratio: a purely spatial
  // dither survives temporal accumulation and shows up as fixed diagonal hatching
  // once the sharpen and aberration passes get hold of it.
  float jitter = fract( obIGN( gl_FragCoord.xy ) + uCloudLod.z ) * uCloudLod.y;

  // Forward lobe for the silver lining. Scaled so a sunlit top sits a little
  // above the sky behind it instead of ten times over it.
  float phase = mix( 0.55, obHenyeyGreenstein( cosTheta, 0.68 ) * 2.2, 0.45 );

  float fpRay = stepLen * uCloud.z;
  float fpSun = sunStep * uCloud.z;

  vec3 acc = vec3( 0.0 );
  float transmittance = 1.0;

  for ( int i = 0; i < CLOUD_STEPS; i ++ ) {
    float f = ( float( i ) + jitter ) / float( CLOUD_STEPS );
    float t = t0 + f * span;
    vec3 p = uCameraPos + rd * t;
    float fpScreen = t * uCloudLod.x * uCloud.z;

    float density = obCloudDensity( p, f, fpScreen, fpRay );
    if ( density <= 0.003 ) continue;

    float shadow = 1.0;
    #if CLOUD_SHADOW_STEPS > 0
      float occ = 0.0;
      for ( int s = 0; s < CLOUD_SHADOW_STEPS; s ++ ) {
        float sd = ( float( s ) + 0.5 ) * sunStep;
        float sh = f + uSunDirection.y * sd / OB_CLOUD_SLAB;
        if ( sh > 1.02 ) break;
        occ += obCloudDensity( p + uSunDirection * sd, max( sh, 0.0 ), fpScreen, fpSun ) * sunStep;
      }
      shadow = exp( -occ * sigma * 1.7 );
    #endif

    float extinction = exp( -density * stepLen * sigma );
    vec3 scatter = uCloudSunColor * ( phase * shadow ) + uCloudAmbient * ( 0.30 + 0.70 * f );
    acc += transmittance * ( 1.0 - extinction ) * scatter;
    transmittance *= extinction;
    if ( transmittance < 0.008 ) break;
  }

  acc *= fade;
  // Premultiplied. Alpha carries transmittance so the caller composites as
  // sky * T + inscatter, which is what radiative transfer actually gives; the
  // usual lerp against a non-premultiplied colour double-dims the deck.
  return vec4( acc, mix( 1.0, transmittance, fade ) );
}

#endif

// --- night ------------------------------------------------------------------

vec3 obNightSky( vec3 rd ) {
  vec3 col = mix( vec3( 0.004, 0.007, 0.016 ), vec3( 0.010, 0.015, 0.034 ), saturate( rd.y ) );

  // Point stars on a quantised direction grid, with a slow scintillation.
  vec3 sd = rd * 340.0;
  vec3 cell = floor( sd );
  vec3 frac = fract( sd ) - 0.5;
  float h = obHash13( cell );
  float present = step( 0.9955, h );
  float radial = saturate( 1.0 - length( frac ) * 2.6 );
  float twinkle = 0.55 + 0.45 * sin( uTime * 2.7 + h * 240.0 );
  float star = present * pow( radial, 3.0 ) * twinkle;
  float band = smoothstep( 0.0, 0.35, rd.y );
  col += vec3( 0.85, 0.9, 1.0 ) * star * 6.0 * band * uStars;

  // Moon glow — a soft disc plus a wide halo, no texture required.
  float md = dot( rd, uMoonDirection );
  float disc = smoothstep( 0.99955, 0.99975, md );
  float halo = pow( saturate( md ), 220.0 ) * 0.35 + pow( saturate( md ), 12.0 ) * 0.02;
  col += vec3( 0.62, 0.68, 0.82 ) * ( disc * 3.2 + halo );
  return col;
}

void main() {
  #ifdef OB_EQUIRECT
    // The equirect bake covers the whole sphere, and the latitude/longitude
    // mapping is not affine: taking the direction at the corners of a fullscreen
    // triangle and letting the rasteriser interpolate it collapses every pixel
    // onto one direction, so it has to be evaluated per fragment.
    float lon = ( vUv.x - 0.25 ) * ( 2.0 * OB_PI );
    float lat = ( vUv.y - 0.5 ) * OB_PI;
    float cosLat = cos( lat );
    vec3 rd = vec3( cosLat * cos( lon ), sin( lat ), cosLat * sin( lon ) );
  #else
    vec3 rd = normalize( vRayDir );
  #endif
  vec3 sunDir = uSunDirection;

  float cosZenithView = dot( OB_UP, rd );
  float zenithAngle = acos( max( 0.0, cosZenithView ) );
  float denom = cos( zenithAngle ) +
    0.15 * pow( max( 93.885 - degrees( zenithAngle ), 1e-3 ), -1.253 );
  float inverse = 1.0 / max( denom, 1e-4 );
  // Preetham's air-mass fit reaches ~36 at the horizon, where the transmittance
  // of every channel has collapsed to zero and the scattering integral loses all
  // spectral variation — a white stripe. The soft cap keeps a blue gradient in
  // the last few degrees, and being second order it leaves the zenith untouched
  // rather than creasing the sky partway up.
  float cap = uSkyTone.w;
  inverse = inverse * cap * inversesqrt( inverse * inverse + cap * cap );

  vec3 betaR = OB_BETA_R * uRayleigh;
  float c = ( 0.2 * uTurbidity ) * 1e-17;
  vec3 betaM = 0.434 * c * OB_MIE_PRECOMP * uMieCoefficient;

  float sR = OB_RAYLEIGH_ZENITH * inverse;
  float sM = OB_MIE_ZENITH * inverse;
  vec3 Fex = exp( -( betaR * sR + betaM * sM ) );

  float cosTheta = dot( rd, sunDir );
  vec3 betaRTheta = betaR * obRayleighPhase( cosTheta );
  // Two Mie lobes: the broad one from turbidity plus a tight forward halo.
  float mieBroad = obHenyeyGreenstein( cosTheta, uMieG );
  float mieTight = obHenyeyGreenstein( cosTheta, 0.965 ) * 0.35;
  vec3 betaMTheta = betaM * ( mieBroad + mieTight );

  float sunE = obSunEnergy( dot( sunDir, OB_UP ) );
  vec3 scatterRatio = ( betaRTheta + betaMTheta ) / ( betaR + betaM );
  // Preetham's own formulation is linear here; the exponent is an art-directed
  // contrast boost, and at three's stock 1.5 it drives the horizon to five times
  // the zenith's luminance and strips its colour. 1.25 lands on the 3:1 a real
  // midday sky measures while keeping the contrast near the sun.
  vec3 Lin = pow( sunE * scatterRatio * ( 1.0 - Fex ), vec3( 1.25 ) );
  float sunLow = saturate( pow( 1.0 - dot( OB_UP, sunDir ), 5.0 ) );
  Lin *= mix( vec3( 1.0 ), pow( sunE * scatterRatio * Fex, vec3( 0.5 ) ), sunLow );

  vec3 inscatter = ( Lin + vec3( 0.06 ) * Fex ) * uSkyTone.x;
  float lum = max( obSkyLuma( inscatter ), 1e-6 );
  inscatter *= obShoulder( lum ) / lum;

  // Aerial perspective. Only the chromaticity moves: a haze colour with its own
  // fixed brightness has no relationship to the local sky radiance and paints a
  // hard stripe wherever the two disagree, so the tint is rescaled to the
  // luminance it is replacing and given a small forward-scattering gain.
  float hazeMix = saturate( exp( -max( rd.y, 0.0 ) * uHaze.x ) * uHaze.y );
  float hazeLum = max( obSkyLuma( uHazeColor ), 1e-4 );
  vec3 haze = uHazeColor * ( obSkyLuma( inscatter ) * uHaze.z / hazeLum );
  inscatter = mix( inscatter, haze, hazeMix );

  // Sun disc with the standard u/v limb-darkening coefficients. Added after the
  // shoulder so the disc keeps the several-thousand-nit peak the bloom and the
  // auto-exposure need to see.
  float discEdge = smoothstep( OB_SUN_ANGULAR_COS - 0.00015, OB_SUN_ANGULAR_COS + 0.00015, cosTheta );
  float rNorm = saturate( sqrt( max( 1.0 - cosTheta, 0.0 ) / max( 1.0 - OB_SUN_ANGULAR_COS, 1e-6 ) ) );
  float mu = sqrt( max( 1.0 - rNorm * rNorm, 0.0 ) );
  float limb = 1.0 - 0.47 * ( 1.0 - mu ) - 0.23 * ( 1.0 - mu ) * ( 1.0 - mu );

  // Aureole. Three lobes: a glare core that clips for a couple of degrees past
  // the limb, a halo out to about ten, and a broad wash beyond. A single Mie lobe
  // cannot cover that range, and without it the disc is a sticker on a sky barely
  // brighter beside it than at the zenith -- whereas a real low sun is
  // unlookable-at and takes a large piece of the frame with it.
  //
  // The magnitudes are set by where they have to land after tonemapping rather
  // than by radiometry: the ACES shoulder needs roughly ten times middle grey
  // before it returns pure white, so a core that reads as glare has to be some
  // thousands of times the zenith radiance, not the handful that the Mie phase
  // function alone gives at these angles. This is also what gives the bright pass
  // something to find -- the disc on its own is a few hundred pixels and blooms
  // into nothing.
  // The exponents set how far each lobe reaches and the coefficients how hard it
  // clips. Reach is the expensive half: widening the core until it clipped over
  // twenty degrees did read as glare, but it also washed the distant dunes flat
  // and cost the ground most of a stop. Intense and tight carries the same
  // impression for a fraction of the frame.
  float aureoleCos = saturate( cosTheta );
  float aureole =
    pow( aureoleCos, 1200.0 ) * 6000.0 +
    pow( aureoleCos, 160.0 ) * 800.0 +
    pow( aureoleCos, 26.0 ) * 100.0;
  vec3 sky = inscatter + sunE * uSkyTone.x * Fex * ( 9000.0 * discEdge * limb + aureole * ( 1.0 - uNight ) );

  // Below the horizon, the sunlit ground bounce. Nothing in the level lets the
  // player see it directly, but it is half of what the IBL probe integrates.
  sky = mix( sky, uGroundColor, obRamp( 0.0, -0.09, rd.y ) );
  sky = mix( sky, obNightSky( rd ), uNight );

  #if CLOUD_STEPS > 0
    vec4 clouds = obClouds( rd, cosTheta );
    sky = sky * clouds.a + clouds.rgb;
  #endif

  gl_FragColor = vec4( max( sky * uSunScale, vec3( 0.0 ) ), 1.0 );
}
`;

const EQUIRECT_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

/** Values the lighting rig and the fog pull out of the sky each frame. */
export interface SkyLightingState {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  skyColor: THREE.Color;
  horizonColor: THREE.Color;
  groundColor: THREE.Color;
  /** 0 = full day, 1 = full night. */
  night: number;
  /** 0 at noon, 1 when the sun sits on the horizon. */
  duskAmount: number;
  /**
   * Approximate mean radiance of the upper hemisphere, in the same units the sky
   * shader writes to the HDR buffer. Everything the lighting rig hands to three
   * as an irradiance is derived from this, which is what keeps surfaces, the
   * visible sky and the IBL on one scale.
   */
  referenceRadiance: number;
  /**
   * Luminance of the atmospheric transmittance along the sun ray, 0..1. Drives
   * the directional light's magnitude, so the sunset falloff comes out of the
   * same scattering model that reddens it.
   */
  sunTransmittance: number;
}

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly state: SkyLightingState = {
    sunDirection: new THREE.Vector3(0.42, 0.62, 0.66).normalize(),
    sunColor: new THREE.Color(1, 0.96, 0.9),
    sunIntensity: SUN_TOA_IRRADIANCE * 0.85,
    skyColor: new THREE.Color(0.35, 0.5, 0.78),
    horizonColor: new THREE.Color(0.72, 0.76, 0.82),
    groundColor: new THREE.Color(0.30, 0.255, 0.185),
    night: 0,
    duskAmount: 0,
    referenceRadiance: 1.2,
    sunTransmittance: 0.8,
  };

  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly equirectMaterial: THREE.ShaderMaterial;
  private timeOfDay = 0.42;
  private cloudDrift = new THREE.Vector2(0, 0);
  private envDirty = true;
  private temporalJitter = true;

  private readonly scratchV = new THREE.Vector3();
  private readonly scratchC = new THREE.Color();

  constructor(config?: QualityConfig) {
    this.uniforms = {
      uInvViewProjection: { value: new THREE.Matrix4() },
      uCameraPos: { value: new THREE.Vector3() },
      uSunDirection: { value: this.state.sunDirection.clone() },
      uMoonDirection: { value: new THREE.Vector3(-0.4, 0.6, -0.7).normalize() },
      uTurbidity: { value: 3.4 },
      uRayleigh: { value: 1.9 },
      uMieCoefficient: { value: 0.0042 },
      uMieG: { value: 0.79 },
      uSunScale: { value: 1.0 },
      uNight: { value: 0 },
      uHaze: { value: new THREE.Vector4(9.0, 0.34, 1.12, 0) },
      uSkyTone: { value: new THREE.Vector4(0.04, 1.6, 3.4, 5.5) },
      uHazeColor: { value: new THREE.Color(0.68, 0.72, 0.78) },
      uGroundColor: { value: new THREE.Color(0.62, 0.53, 0.38) },
      uTime: { value: 0 },
      uCloud: { value: new THREE.Vector4(0.52, 1.0, 0.00035, 1.0) },
      uWind: { value: new THREE.Vector2() },
      uCloudLod: { value: new THREE.Vector4(0.0026, 0.85, 0, 0) },
      uCloudSunColor: { value: new THREE.Color(1, 0.97, 0.92) },
      uCloudAmbient: { value: new THREE.Color(0.35, 0.44, 0.62) },
      uStars: { value: 1 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: FARPLANE_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      defines: Sky.definesFor(config),
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NoBlending,
      toneMapped: false,
      fog: false,
    });
    this.material.name = 'SkyAtmosphere';

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'Sky';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // Drawn after every other opaque object so early-Z rejects covered pixels.
    this.mesh.renderOrder = 1000;

    this.equirectMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: EQUIRECT_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      defines: { ...Sky.definesFor(config), OB_EQUIRECT: 1 },
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NoBlending,
      toneMapped: false,
      fog: false,
    });
    this.equirectMaterial.name = 'SkyEquirect';

    this.setTimeOfDay(this.timeOfDay);
  }

  private static definesFor(config?: QualityConfig): Record<string, number> {
    switch (config?.tier ?? 'high') {
      // Step count is what caps the resolvable detail: the octave band limit
      // trims anything the march is too coarse to integrate, so raising octaves
      // without raising steps buys nothing.
      case 'ultra':
        return { CLOUD_STEPS: 16, CLOUD_OCTAVES: 5, CLOUD_SHADOW_STEPS: 4 };
      case 'high':
        return { CLOUD_STEPS: 12, CLOUD_OCTAVES: 5, CLOUD_SHADOW_STEPS: 3 };
      case 'medium':
        return { CLOUD_STEPS: 8, CLOUD_OCTAVES: 4, CLOUD_SHADOW_STEPS: 2 };
      // The shadow march cannot go to zero the way the others scale down: with no
      // sun occlusion at all the deck takes the full sun term everywhere and
      // turns into a flat sheet three times brighter than the same sky at ultra.
      // One step spans the whole slab, which is enough for the base-to-top
      // gradient.
      default:
        return { CLOUD_STEPS: 6, CLOUD_OCTAVES: 4, CLOUD_SHADOW_STEPS: 1 };
    }
  }

  /**
   * Amplitude of the per-pixel march offset. A tier with a temporal resolve can
   * afford a full step of it because the resolve integrates it away; the low tier
   * has nothing downstream to do that, and the offset pattern is a gradient noise
   * with pronounced diagonal structure, so at full amplitude the step contours
   * are merely traded for visible hatching. A fraction of a step is the useful
   * part of the trade: enough displacement to soften the contours, not enough
   * contrast between neighbours for the pattern itself to read.
   */
  private static jitterFor(config?: QualityConfig): number {
    return (config?.tier ?? 'high') === 'low' ? 0.3 : 0.85;
  }

  /**
   * Whether the march offset may cycle per frame. Rotating it is what lets a
   * temporal resolve integrate the dither away completely; with nothing to
   * integrate it, the same rotation is full-screen crawling noise instead.
   */
  private static temporalJitterFor(config?: QualityConfig): boolean {
    return (config?.tier ?? 'high') !== 'low';
  }

  /** Material used to bake an equirectangular capture for the fallback IBL. */
  get captureMaterial(): THREE.ShaderMaterial {
    return this.equirectMaterial;
  }

  get needsEnvironmentRebuild(): boolean {
    return this.envDirty;
  }

  markEnvironmentClean(): void {
    this.envDirty = false;
  }

  onQualityChanged(config: QualityConfig): void {
    const defines = Sky.definesFor(config);
    this.material.defines = defines;
    this.material.needsUpdate = true;
    this.equirectMaterial.defines = { ...defines, OB_EQUIRECT: 1 };
    this.equirectMaterial.needsUpdate = true;
    (this.uniforms.uCloudLod.value as THREE.Vector4).y = Sky.jitterFor(config);
    this.temporalJitter = Sky.temporalJitterFor(config);
  }

  /**
   * `t` runs 0..1 across a full day: 0 midnight, 0.25 sunrise, 0.5 noon,
   * 0.75 sunset. The sun tracks a tilted arc so it never rises due east.
   */
  setTimeOfDay(t: number): void {
    this.timeOfDay = t - Math.floor(t);
    const angle = (this.timeOfDay - 0.25) * TAU;
    const tilt = 0.34;
    const dir = this.scratchV.set(
      Math.cos(angle) * Math.cos(tilt) * 0.55 + Math.sin(tilt) * 0.35,
      Math.sin(angle),
      Math.cos(angle) * 0.78,
    );
    this.setSunDirection(dir);
  }

  get currentTimeOfDay(): number {
    return this.timeOfDay;
  }

  /** Accumulated cloud drift, shared with the volumetric medium so both agree. */
  get windOffset(): THREE.Vector2 {
    return this.cloudDrift;
  }

  setSunDirection(v: THREE.Vector3): void {
    const dir = this.state.sunDirection.copy(v).normalize();
    (this.uniforms.uSunDirection.value as THREE.Vector3).copy(dir);
    // The moon sits roughly opposite the sun so nights are never pitch black.
    (this.uniforms.uMoonDirection.value as THREE.Vector3)
      .set(-dir.x * 0.9 + 0.2, Math.abs(dir.y) * 0.55 + 0.35, -dir.z * 0.9 - 0.15)
      .normalize();
    this.recomputeLighting();
    this.envDirty = true;
  }

  /**
   * Coverage 0..1 and a density multiplier for the deck. `opacity` scales the
   * extinction coefficient rather than compositing over the result, so a thin
   * deck stays translucent instead of turning into a flat wash.
   */
  setClouds(coverage: number, density = 1.0, scale = 0.00035, opacity = 1.0): void {
    const c = this.uniforms.uCloud.value as THREE.Vector4;
    c.set(saturate(coverage), Math.max(0, density), scale, clamp(opacity, 0, 2));
    this.envDirty = true;
  }

  setWeather(turbidity: number, rayleigh: number, mie: number): void {
    this.uniforms.uTurbidity.value = clamp(turbidity, 1, 20);
    this.uniforms.uRayleigh.value = clamp(rayleigh, 0, 6);
    this.uniforms.uMieCoefficient.value = clamp(mie, 0, 0.1);
    this.recomputeLighting();
    this.envDirty = true;
  }

  update(
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    height: number,
    frame: number,
  ): void {
    this.uniforms.uTime.value = elapsed;
    // Slow drift, in cloud-space units, so the deck is never static.
    this.cloudDrift.x += dt * 0.0085;
    this.cloudDrift.y += dt * 0.0031;
    (this.uniforms.uWind.value as THREE.Vector2).copy(this.cloudDrift);

    const lod = this.uniforms.uCloudLod.value as THREE.Vector4;
    // Angular size of one pixel, which the cloud march turns into a noise-space
    // footprint to decide how many octaves it is allowed to sample.
    lod.x = (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(height, 1);
    lod.z = this.temporalJitter ? (frame * 0.618033988749895) % 1 : 0;

    const m = this.uniforms.uInvViewProjection.value as THREE.Matrix4;
    m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    (this.uniforms.uCameraPos.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
  }

  /**
   * Evaluate the same scattering model on the CPU for the sun colour, the sky
   * fill colour and the fog tint. Cheap enough to run whenever the sun moves.
   */
  private recomputeLighting(): void {
    const dir = this.state.sunDirection;
    const cosSunZenith = clamp(dir.y, -1, 1);
    const turbidity = this.uniforms.uTurbidity.value as number;
    const rayleigh = this.uniforms.uRayleigh.value as number;
    const mieCoefficient = this.uniforms.uMieCoefficient.value as number;

    const sunE = sunEnergy(cosSunZenith);
    const betaR = this.scratchV.copy(BETA_R).multiplyScalar(rayleigh);
    const cMie = 0.2 * turbidity * 1e-17;
    const betaMx = 0.434 * cMie * MIE_PRECOMP.x * mieCoefficient;
    const betaMy = 0.434 * cMie * MIE_PRECOMP.y * mieCoefficient;
    const betaMz = 0.434 * cMie * MIE_PRECOMP.z * mieCoefficient;

    // Clamped just above the horizon: Preetham's fit has a pole at 93.885 degrees
    // and past it the optical depth collapses instead of growing, which would
    // hand back a white sun exactly when it should be deepest red.
    const inv = opticalDepthFactor(Math.max(cosSunZenith, -0.03));
    const sR = RAYLEIGH_ZENITH_LENGTH * inv;
    const sM = MIE_ZENITH_LENGTH * inv;
    const fx = Math.exp(-(betaR.x * sR + betaMx * sM));
    const fy = Math.exp(-(betaR.y * sR + betaMy * sM));
    const fz = Math.exp(-(betaR.z * sR + betaMz * sM));

    // Single scattering strips the last of the blue long before the sun reaches
    // the horizon and hands back an unusable pure red. Leaking a fraction of the
    // peak channel into all three stands in for the multiple scattering the
    // analytic model drops, which is what makes a real low sun orange.
    const peak = Math.max(fx, fy, fz, 1e-6);
    const leak = peak * MULTISCATTER_LEAK;
    const tint = Math.max(fx + leak, 1e-6);
    this.state.sunColor.setRGB(1, (fy + leak) / tint, (fz + leak) / tint);
    this.state.sunTransmittance = saturate(0.2126 * fx + 0.7152 * fy + 0.0722 * fz);

    const above = saturate(dir.y);
    const night = 1 - smoothstep(-0.12, 0.06, dir.y);
    // Past sunset the directional light is the moon, and moonlight reads cool —
    // the eye's shifted scotopic response, not the moon's actual near-grey albedo.
    this.state.sunColor.lerp(this.scratchC.setRGB(0.62, 0.72, 1.0), night);
    this.state.night = night;
    this.state.duskAmount = 1 - smoothstep(0.02, 0.36, dir.y);

    // Irradiance straight off the transmittance, so the sunset falloff and the
    // reddening come from one model instead of two curves that have to be kept
    // in agreement. The exponent softens it: the true 120:1 zenith-to-horizon
    // collapse leaves nothing but silhouettes for the last few degrees, and
    // shooters are played in that light.
    const dayIntensity =
      SUN_TOA_IRRADIANCE * Math.pow(this.state.sunTransmittance, SUN_EXTINCTION_SOFTENING);
    const moonIntensity = SUN_TOA_IRRADIANCE * 0.004;
    this.state.sunIntensity = dayIntensity * (1 - night) + moonIntensity * night;
    this.uniforms.uNight.value = night;
    this.uniforms.uStars.value = night;

    // Zenith and horizon radiance approximations for fog and the sky fill.
    const zenithBoost = 0.55 + 0.45 * above;
    this.state.skyColor
      .setRGB(0.20 * zenithBoost, 0.34 * zenithBoost, 0.66 * zenithBoost)
      .lerp(this.scratchC.setRGB(0.012, 0.018, 0.042), night);

    const duskWarm = this.state.duskAmount * (1 - night);
    this.state.horizonColor
      .setRGB(0.60, 0.66, 0.74)
      .lerp(this.scratchC.setRGB(0.95, 0.55, 0.30), duskWarm * 0.85)
      .lerp(this.scratchC.setRGB(0.02, 0.026, 0.05), night)
      .multiplyScalar(0.35 + 0.65 * saturate(sunE / SUN_EE + night * 0.4));

    // A diffuse albedo, not a colour: the bounce radiance below is derived from
    // it, and the lighting rig normalises it for the fallback hemisphere fill.
    this.state.groundColor
      .setRGB(0.30, 0.255, 0.185)
      .lerp(this.scratchC.setRGB(0.05, 0.052, 0.06), night);

    // Approximate post-shoulder zenith radiance. Every CPU-authored colour the
    // shader uses as an absolute value is scaled by it, which is what keeps the
    // ground bounce and the cloud lighting inside the same range as the sky
    // instead of each drifting off into its own.
    const reference = 0.03 + 1.85 * Math.pow(above, 0.5) * (1 - night) + 0.05 * night;
    this.state.referenceRadiance = reference;

    // Only the hue of the haze reaches the shader; its brightness is taken from
    // the sky it replaces, so nothing here can produce a band.
    (this.uniforms.uHazeColor.value as THREE.Color).copy(this.state.horizonColor);

    // Lambertian bounce off the ground plane, on the same radiance scale as the
    // sky above it. This half of the sphere is what fills shadows and lights
    // interiors, and the IBL calibration measures the whole sphere — so a ground
    // term picked to look inoffensive on a distant dune silently sets how cold
    // and how dark every shadow in the game is. Deriving it from the same
    // irradiance the sun delivers is what keeps the two hemispheres in a
    // defensible ratio as the sun moves.
    const groundIrradiance = this.state.sunIntensity * above + Math.PI * 1.4 * reference;
    (this.uniforms.uGroundColor.value as THREE.Color)
      .copy(this.state.groundColor)
      .multiplyScalar((GROUND_BOUNCE_FRACTION / Math.PI) * groundIrradiance);
    const haze = this.uniforms.uHaze.value as THREE.Vector4;
    haze.set(9.0, 0.34 + 0.34 * this.state.duskAmount, 1.1 + 0.25 * this.state.duskAmount, 0);

    // Cloud tops stay in direct sun after the ground has lost it, which is what
    // makes a dusk deck glow. The multiplier is kept moderate all the same: past
    // roughly four times the sky behind them the march's step contours start to
    // show through, and no step count fixes contrast that high.
    (this.uniforms.uCloudSunColor.value as THREE.Color)
      .copy(this.state.sunColor)
      .multiplyScalar(reference * 3.8 * (1 - night) + reference * 0.35 * night);
    (this.uniforms.uCloudAmbient.value as THREE.Color)
      .copy(this.state.skyColor)
      .multiplyScalar((reference * 1.1) / Math.max(luminance(this.state.skyColor), 1e-3));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.equirectMaterial.dispose();
  }
}

function sunEnergy(cosZenith: number): number {
  const zenith = Math.acos(clamp(cosZenith, -1, 1));
  return SUN_EE * Math.max(0, 1 - Math.exp(-((SUN_CUTOFF_ANGLE - zenith) / SUN_STEEPNESS)));
}

function luminance(c: THREE.Color): number {
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

function opticalDepthFactor(cosZenith: number): number {
  const zenith = Math.acos(clamp(cosZenith, -1, 1));
  const deg = (zenith * 180) / Math.PI;
  const denom = Math.cos(zenith) + 0.15 * Math.pow(Math.max(93.885 - deg, 1e-3), -1.253);
  return 1 / Math.max(denom, 1e-4);
}
