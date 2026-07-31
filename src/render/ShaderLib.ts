/**
 * GLSL fragments shared by the post stack.
 *
 * Every pass material is a `ShaderMaterial`, which three compiles as
 * `#version 300 es` with `varying`/`texture2D`/`gl_FragColor` aliased, so these
 * snippets may freely use GLSL ES 3 builtins (`texture`, `textureLod`,
 * `sampler2DShadow`, …) while still declaring inputs the GLSL1 way.
 */

/**
 * Constants and helpers three only provides to its own materials through the
 * `common` chunk, which custom `ShaderMaterial`s do not include.
 */
export const GLSL_COMMON = /* glsl */ `
#ifndef OB_COMMON
#define OB_COMMON
const float OB_TAU = 6.283185307179586;
float saturate( float x ) { return clamp( x, 0.0, 1.0 ); }
vec2 saturate( vec2 x ) { return clamp( x, 0.0, 1.0 ); }
vec3 saturate( vec3 x ) { return clamp( x, 0.0, 1.0 ); }
vec4 saturate( vec4 x ) { return clamp( x, 0.0, 1.0 ); }
float obSqr( float x ) { return x * x; }
/** smoothstep with the edges in either order — GLSL's is undefined if e0 >= e1. */
float obRamp( float e0, float e1, float x ) {
  return e0 < e1 ? smoothstep( e0, e1, x ) : 1.0 - smoothstep( e1, e0, x );
}
#endif
`;

/** Depth <-> position helpers. All of them expect a hyperbolic depth in [0,1]. */
export const GLSL_DEPTH = /* glsl */ `
uniform vec4 uProjParams;      // x: near, y: far, z: 1/near - 1/far scratch, w: unused
uniform mat4 uInvProjection;
uniform mat4 uProjection;

float obViewZ( float rawDepth ) {
  // Hyperbolic depth -> negative view-space Z (right-handed, looking down -Z).
  float ndc = rawDepth * 2.0 - 1.0;
  return ( 2.0 * uProjParams.x * uProjParams.y ) /
         ( ndc * ( uProjParams.y - uProjParams.x ) - ( uProjParams.y + uProjParams.x ) );
}

float obLinear01( float rawDepth ) {
  return clamp( -obViewZ( rawDepth ) / uProjParams.y, 0.0, 1.0 );
}

vec3 obViewPosition( vec2 uv, float rawDepth ) {
  vec4 clip = vec4( uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0 );
  vec4 view = uInvProjection * clip;
  return view.xyz / view.w;
}

vec2 obProjectToUv( vec3 viewPos ) {
  vec4 clip = uProjection * vec4( viewPos, 1.0 );
  return ( clip.xy / clip.w ) * 0.5 + 0.5;
}
`;

/**
 * Normal reconstruction from depth. The four-tap "best fit" variant picks the
 * closest horizontal and vertical neighbour so silhouettes do not produce the
 * smeared normals a naive `dFdx/dFdy` cross gives.
 */
export const GLSL_NORMAL_FROM_DEPTH = /* glsl */ `
vec3 obNormalFromDepth( sampler2D depthTex, vec2 uv, vec2 texel, vec3 centerView ) {
  float dl = texture2D( depthTex, uv - vec2( texel.x, 0.0 ) ).x;
  float dr = texture2D( depthTex, uv + vec2( texel.x, 0.0 ) ).x;
  float dd = texture2D( depthTex, uv - vec2( 0.0, texel.y ) ).x;
  float du = texture2D( depthTex, uv + vec2( 0.0, texel.y ) ).x;

  vec3 pl = obViewPosition( uv - vec2( texel.x, 0.0 ), dl );
  vec3 pr = obViewPosition( uv + vec2( texel.x, 0.0 ), dr );
  vec3 pd = obViewPosition( uv - vec2( 0.0, texel.y ), dd );
  vec3 pu = obViewPosition( uv + vec2( 0.0, texel.y ), du );

  vec3 dx = abs( pl.z - centerView.z ) < abs( pr.z - centerView.z )
    ? centerView - pl : pr - centerView;
  vec3 dy = abs( pd.z - centerView.z ) < abs( pu.z - centerView.z )
    ? centerView - pd : pu - centerView;

  vec3 n = cross( dx, dy );
  float len = length( n );
  return len > 1e-8 ? n / len : vec3( 0.0, 0.0, 1.0 );
}
`;

/** Hash / value noise used by clouds, grain and dithering fallbacks. */
export const GLSL_NOISE = /* glsl */ `
float obHash12( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}

float obHash13( vec3 p ) {
  p = fract( p * 0.1031 );
  p += dot( p, p.zyx + 31.32 );
  return fract( ( p.x + p.y ) * p.z );
}

vec2 obHash22( vec2 p ) {
  vec3 p3 = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.xx + p3.yz ) * p3.zy );
}

float obValueNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  float a = obHash12( i );
  float b = obHash12( i + vec2( 1.0, 0.0 ) );
  float c = obHash12( i + vec2( 0.0, 1.0 ) );
  float d = obHash12( i + vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y );
}

float obValueNoise3( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  vec3 u = f * f * ( 3.0 - 2.0 * f );
  float n000 = obHash13( i );
  float n100 = obHash13( i + vec3( 1.0, 0.0, 0.0 ) );
  float n010 = obHash13( i + vec3( 0.0, 1.0, 0.0 ) );
  float n110 = obHash13( i + vec3( 1.0, 1.0, 0.0 ) );
  float n001 = obHash13( i + vec3( 0.0, 0.0, 1.0 ) );
  float n101 = obHash13( i + vec3( 1.0, 0.0, 1.0 ) );
  float n011 = obHash13( i + vec3( 0.0, 1.0, 1.0 ) );
  float n111 = obHash13( i + vec3( 1.0, 1.0, 1.0 ) );
  return mix(
    mix( mix( n000, n100, u.x ), mix( n010, n110, u.x ), u.y ),
    mix( mix( n001, n101, u.x ), mix( n011, n111, u.x ), u.y ),
    u.z );
}

/** Interleaved gradient noise — the cheapest decent per-pixel dither. */
float obIGN( vec2 pixel ) {
  return fract( 52.9829189 * fract( dot( pixel, vec2( 0.06711056, 0.00583715 ) ) ) );
}
`;

/**
 * Blue-noise lookup. Falls back to interleaved gradient noise when procgen has
 * not published its texture yet, so every pass stays well-behaved on frame one.
 */
export const GLSL_BLUENOISE = /* glsl */ `
uniform sampler2D uBlueNoise;
uniform vec4 uNoiseParams;   // x: 1/noiseSize, y: frame index, z: has-texture, w: golden phase

vec2 obBlueNoise2( vec2 pixel ) {
  if ( uNoiseParams.z < 0.5 ) {
    float a = obIGN( pixel + uNoiseParams.w * 64.0 );
    float b = obIGN( pixel.yx + 17.0 + uNoiseParams.w * 91.0 );
    return vec2( a, b );
  }
  vec2 uv = ( pixel + 0.5 ) * uNoiseParams.x;
  vec2 n = texture2D( uBlueNoise, uv ).xy;
  // Golden-ratio animation keeps the spectrum blue over time as well as space.
  return fract( n + uNoiseParams.y * vec2( 0.7548776662, 0.5698402909 ) );
}

float obBlueNoise1( vec2 pixel ) {
  return obBlueNoise2( pixel ).x;
}
`;

/** 16-point poisson disk. Even coverage, no visible lattice. */
export const GLSL_POISSON16 = /* glsl */ `
const vec2 OB_POISSON16[ 16 ] = vec2[ 16 ](
  vec2( -0.94201624, -0.39906216 ), vec2(  0.94558609, -0.76890725 ),
  vec2( -0.09418410, -0.92938870 ), vec2(  0.34495938,  0.29387760 ),
  vec2( -0.91588581,  0.45771432 ), vec2( -0.81544232, -0.87912464 ),
  vec2( -0.38277543,  0.27676845 ), vec2(  0.97484398,  0.75648379 ),
  vec2(  0.44323325, -0.97511554 ), vec2(  0.53742981, -0.47373420 ),
  vec2( -0.26496911, -0.41893023 ), vec2(  0.79197514,  0.19090188 ),
  vec2( -0.24188840,  0.99706507 ), vec2( -0.81409955,  0.91437590 ),
  vec2(  0.19984126,  0.78641367 ), vec2(  0.14383161, -0.14100790 )
);
`;

/** Colour space helpers: ACES tonemap, sRGB transfer, YCoCg for TAA clamping. */
export const GLSL_COLOR = /* glsl */ `
float obLuminance( vec3 c ) {
  return dot( c, vec3( 0.2125, 0.7154, 0.0721 ) );
}

vec3 obRGBToYCoCg( vec3 c ) {
  return vec3(
    0.25 * c.r + 0.5 * c.g + 0.25 * c.b,
    0.5 * c.r - 0.5 * c.b,
    -0.25 * c.r + 0.5 * c.g - 0.25 * c.b );
}

vec3 obYCoCgToRGB( vec3 c ) {
  float t = c.x - c.z;
  return vec3( t + c.y, c.x + c.z, t - c.y );
}

vec3 obLinearToSRGB( vec3 c ) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow( max( c, vec3( 1e-5 ) ), vec3( 1.0 / 2.4 ) ) - 0.055;
  return mix( lo, hi, step( vec3( 0.0031308 ), c ) );
}

vec3 obSRGBToLinear( vec3 c ) {
  vec3 lo = c / 12.92;
  vec3 hi = pow( ( max( c, vec3( 0.0 ) ) + 0.055 ) / 1.055, vec3( 2.4 ) );
  return mix( lo, hi, step( vec3( 0.04045 ), c ) );
}

// Stephen Hill's fit of the ACES RRT + ODT, in sRGB primaries.
const mat3 OB_ACES_IN = mat3(
  0.59719, 0.07600, 0.02840,
  0.35458, 0.90834, 0.13383,
  0.04823, 0.01566, 0.83777 );
const mat3 OB_ACES_OUT = mat3(
   1.60475, -0.10208, -0.00327,
  -0.53108,  1.10813, -0.07276,
  -0.07367, -0.00605,  1.07602 );

vec3 obACESFitted( vec3 color ) {
  color = OB_ACES_IN * color;
  vec3 a = color * ( color + 0.0245786 ) - 0.000090537;
  vec3 b = color * ( 0.983729 * color + 0.4329510 ) + 0.238081;
  color = a / b;
  color = OB_ACES_OUT * color;
  return clamp( color, 0.0, 1.0 );
}
`;

/** Henyey-Greenstein phase function plus its cheap Schlick approximation. */
export const GLSL_PHASE = /* glsl */ `
float obHenyeyGreenstein( float cosTheta, float g ) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTheta;
  return ( 1.0 - g2 ) / ( 4.0 * 3.14159265 * pow( max( denom, 1e-4 ), 1.5 ) );
}

/** Two-lobe phase: a strong forward lobe for god rays plus an ambient lobe. */
float obDualPhase( float cosTheta, float gFwd, float gBack, float blend ) {
  return mix( obHenyeyGreenstein( cosTheta, gBack ),
              obHenyeyGreenstein( cosTheta, gFwd ), blend );
}
`;

/**
 * Depth-aware upsample of a half-resolution buffer. Half-res passes stash their
 * own normalised linear depth in `.a`, so the upsample needs no second texture
 * fetch and cannot drift out of sync with the buffer it is filtering.
 */
export const GLSL_BILATERAL_UPSAMPLE = /* glsl */ `
vec3 obBilateralUpsample( sampler2D lowTex, vec2 uv, vec2 lowTexel, float centerZ ) {
  vec3 sum = vec3( 0.0 );
  float wsum = 0.0;
  for ( int i = 0; i < 4; i ++ ) {
    vec2 o = vec2( float( i & 1 ) * 2.0 - 1.0, float( ( i >> 1 ) & 1 ) * 2.0 - 1.0 ) * lowTexel * 0.5;
    vec4 s = texture2D( lowTex, uv + o );
    float w = 1.0 / ( 1e-4 + abs( s.a - centerZ ) * 96.0 );
    sum += s.rgb * w;
    wsum += w;
  }
  return sum / max( wsum, 1e-5 );
}
`;
