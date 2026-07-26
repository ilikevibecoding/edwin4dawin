import * as THREE from 'three';
import { Blitter } from '../Blitter';
import { GradingLut } from '../LookupTable';
import { GLSL_BLUENOISE, GLSL_COLOR, GLSL_COMMON, GLSL_NOISE } from '../ShaderLib';

/**
 * The uber composite: everything that can be folded into one full-screen pass,
 * is.
 *
 * Barrel distortion, radial concussion blur, chromatic aberration, RCAS
 * sharpening, bloom, lens flare, auto-exposure, ACES tonemapping, LUT grading,
 * desaturation, screen flash, vignette, film grain and the final dither all
 * happen inside a single fragment shader. Chaining them as separate
 * `ShaderPass`es would cost nine more full-screen blits for no visual gain.
 *
 * The ordering matters: tonemapping and the sRGB encode sit between the HDR
 * operations (bloom, flare, exposure) and the display-referred ones (grading,
 * flash, vignette, grain, dither), because that is where each of them is
 * actually defined.
 */

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uSource;
uniform sampler2D uExposure;      // 1x1: .x exposure, .y focus, .z average luma
uniform vec2 uTexel;
uniform vec4 uTone;               // x: exposure override (<0 auto), y: contrast, z: white point, w: sharpen
uniform vec4 uEffects;            // x: bloom, y: chromatic aberration, z: grain, w: vignette
uniform vec4 uFlash;              // rgb: colour, a: intensity
uniform vec4 uConcussion;         // x: amount, y: wobble, z: barrel, w: desaturation
uniform vec4 uSun;                // xy: sun screen uv, z: visibility, w: on-screen
uniform float uTime;

#ifdef USE_BLOOM
uniform sampler2D uBloom;
uniform vec4 uBloomTint;          // rgb: tint, a: unused
#endif

#ifdef USE_LENSFLARE
uniform sampler2D uGhost;
uniform sampler2D uStreak;
uniform vec4 uFlare;              // x: ghost, y: halo, z: streak, w: halo width
#endif

#ifdef USE_LUT
uniform sampler3D uLut;
uniform vec3 uLutParams;          // x: scale, y: offset, z: amount
#endif

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}
${GLSL_COLOR}

/**
 * Reversible range compression used only to keep the sharpen filter stable: an
 * unbounded HDR neighbourhood would let one specular highlight dominate the
 * kernel and ring visibly around it.
 */
vec3 obCompress( vec3 c ) {
  return c / ( 1.0 + obLuminance( c ) );
}

/** Exact inverse of {@link obCompress}; the floor caps the round trip near 1e4. */
vec3 obExpand( vec3 c ) {
  return c / max( 1.0 - obLuminance( c ), 1e-4 );
}

vec3 obSampleScene( vec2 uv ) {
  return texture2D( uSource, uv ).rgb;
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float radius2 = dot( centered, centered );

#ifdef USE_CONCUSSION
  // Barrel distortion plus a slow, low-frequency wobble. Together they read as
  // an inner-ear problem rather than as a broken shader.
  float wobbleA = sin( uConcussion.y * 1.7 ) * 0.5 + sin( uConcussion.y * 0.63 ) * 0.5;
  float wobbleB = cos( uConcussion.y * 1.31 ) * 0.5 + cos( uConcussion.y * 0.47 ) * 0.5;
  uv += vec2( wobbleA, wobbleB ) * uConcussion.x * 0.012;
  uv = 0.5 + ( uv - 0.5 ) * ( 1.0 + uConcussion.z * radius2 );
  centered = uv - 0.5;
  radius2 = dot( centered, centered );
#endif

  vec3 base = obSampleScene( uv );
  vec3 color = base;

#ifdef USE_SHARPEN
  {
    // RCAS. The lobe strength is bounded by the local range so the filter can
    // never push a pixel outside the neighbourhood it was derived from, and it is
    // shared across the three channels: a per-channel lobe moves each channel a
    // different distance and fringes every high-contrast edge with colour.
    vec3 e = obCompress( color );
    vec3 b = obCompress( obSampleScene( uv + vec2( 0.0, -uTexel.y ) ) );
    vec3 d = obCompress( obSampleScene( uv + vec2( -uTexel.x, 0.0 ) ) );
    vec3 f = obCompress( obSampleScene( uv + vec2( uTexel.x, 0.0 ) ) );
    vec3 h = obCompress( obSampleScene( uv + vec2( 0.0, uTexel.y ) ) );

    vec3 mn = min( min( min( b, d ), min( f, h ) ), e );
    vec3 mx = max( max( max( b, d ), max( f, h ) ), e );
    // Negative-lobe unsharp mask. hitMin keeps the result above 0, hitMax keeps it
    // below 1; taking the max of the two per channel and then across channels is
    // what makes the whole filter overshoot-free.
    vec3 hitMin = mn / ( 4.0 * mx + 1e-5 );
    vec3 hitMax = ( 1.0 - mx ) / ( 4.0 * mn - 4.0 - 1e-5 );
    vec3 lobes = max( -hitMin, hitMax );
    float lobe = max( lobes.r, max( lobes.g, lobes.b ) );
    // Past -0.25 the 1/(1+4*lobe) normalisation divides by zero and then by a
    // negative, which is what turns one bright pixel into a saturated speckle.
    lobe = clamp( lobe * saturate( uTone.w ), -0.1875, 0.0 );
    vec3 sharp = ( ( b + d + f + h ) * lobe + e ) / ( 4.0 * lobe + 1.0 );
    color = obExpand( saturate( sharp ) );
  }
#endif

#ifdef USE_CA
  // Radial transverse aberration: zero at the optical centre, growing with the
  // square of the radius so the middle of the screen stays perfectly crisp. Added
  // as a per-channel delta after the sharpen, because offsetting the centre tap
  // before it would leave the filter's cross straddling three different grids.
  {
    vec2 caOffset = centered * uEffects.y * radius2;
    color.r += obSampleScene( uv + caOffset ).r - base.r;
    color.b += obSampleScene( uv - caOffset ).b - base.b;
  }
#endif

#ifdef USE_CONCUSSION
  {
    // Radial blur toward the screen centre, strongest at the edges.
    float strength = uConcussion.x * saturate( radius2 * 5.0 );
    if ( strength > 0.001 ) {
      vec3 sum = color;
      float wsum = 1.0;
      for ( int i = 1; i <= 6; i ++ ) {
        float t = float( i ) / 6.0;
        float w = 1.0 - t * 0.7;
        vec2 suv = uv - centered * t * strength * 0.09;
        sum += obSampleScene( suv ) * w;
        wsum += w;
      }
      color = sum / wsum;
    }
  }
#endif

#ifdef USE_BLOOM
  {
    vec3 bloom = texture2D( uBloom, uv ).rgb * uBloomTint.rgb;
    // Lerp rather than add: energy is conserved, so bright areas glow instead of
    // the whole frame lifting toward white.
    float k = uEffects.x;
    color = mix( color, bloom, saturate( k ) );
  }
#endif

#ifdef USE_LENSFLARE
  {
    vec3 flare = vec3( 0.0 );

    // Ghosts: the bright pass reflected through the optical centre at a few
    // scales, each with its own dispersion tint.
    const vec3 tint0 = vec3( 0.85, 0.95, 1.15 );
    const vec3 tint1 = vec3( 1.15, 0.90, 0.75 );
    const vec3 tint2 = vec3( 0.75, 1.05, 1.10 );
    flare += texture2D( uGhost, 0.5 - centered * 0.45 ).rgb * tint0 * 0.60;
    flare += texture2D( uGhost, 0.5 - centered * 1.85 ).rgb * tint1 * 0.32;
    flare += texture2D( uGhost, 0.5 - centered * 3.60 ).rgb * tint2 * 0.16;
    flare *= uFlare.x;

    // Halo: a ring sampled at a fixed radial offset, weighted toward the centre.
    vec2 haloDir = normalize( -centered + 1e-5 ) * uFlare.w;
    float haloWeight = pow( 1.0 - saturate( length( centered ) / 0.70711 ), 4.0 );
    flare += texture2D( uGhost, uv + haloDir ).rgb * ( uFlare.y * haloWeight );

    // Anamorphic streak, gated on the CPU-side sun occlusion test so it does not
    // fire when the sun is behind a wall.
    float sunFacing = uSun.w * uSun.z;
    flare += texture2D( uStreak, uv ).rgb * ( uFlare.z * sunFacing );

    color += max( flare, vec3( 0.0 ) );
  }
#endif

  // --- exposure -------------------------------------------------------------
  float exposure = uTone.x > 0.0 ? uTone.x : texture2D( uExposure, vec2( 0.5 ) ).x;
  color *= max( exposure, 1e-3 );
  color /= max( uTone.z, 1e-3 );

  // --- tonemap + transfer ---------------------------------------------------
  color = obACESFitted( color );
  color = obLinearToSRGB( color );

  // --- grading --------------------------------------------------------------
#ifdef USE_LUT
  {
    vec3 lutCoord = saturate( color ) * uLutParams.x + uLutParams.y;
    vec3 graded = texture( uLut, lutCoord ).rgb;
    color = mix( color, graded, uLutParams.z );
  }
#endif

  if ( uConcussion.w > 0.0 ) {
    float grey = obLuminance( color );
    color = mix( color, vec3( grey ), uConcussion.w );
  }

  // --- flash ----------------------------------------------------------------
  if ( uFlash.a > 0.0 ) {
    // Screen blend so a full-strength flash saturates to the flash colour
    // instead of overflowing and clipping to pure white.
    vec3 f = uFlash.rgb * uFlash.a;
    color = 1.0 - ( 1.0 - color ) * ( 1.0 - saturate( f ) );
    color += max( f - 1.0, 0.0 );
  }

  // --- vignette -------------------------------------------------------------
#ifdef USE_VIGNETTE
  {
    // Natural-illumination falloff, deliberately weak — strong vignettes read as
    // a filter, not as a lens.
    float v = 1.0 - uEffects.w * saturate( radius2 * 1.55 );
    color *= mix( 1.0, v * v, 1.0 );
  }
#endif

  // --- grain ----------------------------------------------------------------
#ifdef USE_GRAIN
  {
    vec2 pixel = vUv / uTexel;
    float n = obBlueNoise1( pixel + vec2( uTime * 97.0, uTime * 61.0 ) ) - 0.5;
    float luma = obLuminance( color );
    // Real film grain lives in the shadows and mid-tones; the highlights are
    // where the emulsion saturates and the grain disappears.
    float response = ( 1.0 - saturate( luma * 1.35 ) ) * 0.75 + 0.25;
    color += n * uEffects.z * response;
  }
#endif

  // --- dither ---------------------------------------------------------------
  // One LSB of triangular noise removes 8-bit banding in the sky gradient, which
  // is the single most visible artefact left after everything above.
  vec2 ditherPixel = vUv / uTexel;
  vec2 d2 = obBlueNoise2( ditherPixel + 31.7 );
  float dither = ( d2.x + d2.y - 1.0 ) / 255.0;
  color += dither;

  gl_FragColor = vec4( max( color, vec3( 0.0 ) ), 1.0 );
}
`;

export interface CompositeFeatures {
  bloom: boolean;
  lensFlare: boolean;
  chromaticAberration: boolean;
  filmGrain: boolean;
  vignette: boolean;
  colorGrading: boolean;
  sharpen: boolean;
  concussion: boolean;
}

export interface CompositeInputs {
  source: THREE.Texture;
  exposure: THREE.Texture;
  bloom: THREE.Texture | null;
  ghost: THREE.Texture | null;
  streak: THREE.Texture | null;
  blueNoise: THREE.Texture | null;
  noiseSize: number;
}

export class CompositePass {
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly lut: GradingLut;
  private signature = '';

  /** Manual exposure override in linear multiplier form; <= 0 means automatic. */
  manualExposure = -1;
  /** Global grade strength, so a photo mode or a menu can dial the look back. */
  gradeAmount = 1;
  bloomIntensity = 0.045;
  chromaticAberration = 0.0016;
  grainAmount = 0.016;
  vignetteAmount = 0.34;
  /** Scales RCAS's already range-limited lobe; 1 is full strength. */
  sharpenAmount = 0.85;
  whitePoint = 1;

  constructor() {
    this.lut = new GradingLut(32);
    this.uniforms = {
      uSource: { value: null },
      uExposure: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uTone: { value: new THREE.Vector4(-1, 1, 1, 0.85) },
      uEffects: { value: new THREE.Vector4(0.045, 0.0016, 0.016, 0.34) },
      uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
      uConcussion: { value: new THREE.Vector4(0, 0, 0, 0) },
      uSun: { value: new THREE.Vector4(0.5, 0.5, 1, 0) },
      uTime: { value: 0 },
      uBloom: { value: null },
      uBloomTint: { value: new THREE.Vector4(1.0, 0.96, 0.88, 0) },
      uGhost: { value: null },
      uStreak: { value: null },
      uFlare: { value: new THREE.Vector4(0.05, 0.045, 0.11, 0.42) },
      uLut: { value: this.lut.texture },
      uLutParams: { value: new THREE.Vector3(this.lut.scale, this.lut.offset, 1) },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms);
  }

  /** Recompile only when the enabled feature set actually changes. */
  setFeatures(features: CompositeFeatures): void {
    const signature = [
      features.bloom,
      features.lensFlare,
      features.chromaticAberration,
      features.filmGrain,
      features.vignette,
      features.colorGrading,
      features.sharpen,
      features.concussion,
    ]
      .map((f) => (f ? '1' : '0'))
      .join('');
    if (signature === this.signature) return;
    this.signature = signature;

    const defines: Record<string, number> = {};
    if (features.bloom) defines.USE_BLOOM = 1;
    if (features.lensFlare) defines.USE_LENSFLARE = 1;
    if (features.chromaticAberration) defines.USE_CA = 1;
    if (features.filmGrain) defines.USE_GRAIN = 1;
    if (features.vignette) defines.USE_VIGNETTE = 1;
    if (features.colorGrading) defines.USE_LUT = 1;
    if (features.sharpen) defines.USE_SHARPEN = 1;
    if (features.concussion) defines.USE_CONCUSSION = 1;
    this.material.defines = defines;
    this.material.needsUpdate = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    target: THREE.WebGLRenderTarget | null,
    inputs: CompositeInputs,
    width: number,
    height: number,
    frame: number,
    time: number,
    flash: THREE.Vector4,
    concussion: THREE.Vector4,
    sun: THREE.Vector4,
  ): void {
    const u = this.uniforms;
    u.uSource.value = inputs.source;
    u.uExposure.value = inputs.exposure;
    u.uBloom.value = inputs.bloom;
    u.uGhost.value = inputs.ghost ?? inputs.bloom;
    u.uStreak.value = inputs.streak ?? inputs.bloom;
    (u.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (u.uTone.value as THREE.Vector4).set(
      this.manualExposure,
      1,
      this.whitePoint,
      this.sharpenAmount,
    );
    (u.uEffects.value as THREE.Vector4).set(
      this.bloomIntensity,
      this.chromaticAberration,
      this.grainAmount,
      this.vignetteAmount,
    );
    (u.uFlash.value as THREE.Vector4).copy(flash);
    (u.uConcussion.value as THREE.Vector4).copy(concussion);
    (u.uSun.value as THREE.Vector4).copy(sun);
    u.uTime.value = time;
    (u.uLutParams.value as THREE.Vector3).set(this.lut.scale, this.lut.offset, this.gradeAmount);
    u.uBlueNoise.value = inputs.blueNoise;
    (u.uNoiseParams.value as THREE.Vector4).set(
      1 / Math.max(1, inputs.noiseSize),
      frame % 64,
      inputs.blueNoise ? 1 : 0,
      (frame * 0.618033988749895) % 1,
    );

    blitter.blit(renderer, this.material, target);
  }

  get lutTexture(): THREE.Data3DTexture {
    return this.lut.texture;
  }

  dispose(): void {
    this.material.dispose();
    this.lut.dispose();
  }
}
