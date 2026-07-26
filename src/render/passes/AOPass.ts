import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import {
  GLSL_BLUENOISE,
  GLSL_COMMON,
  GLSL_DEPTH,
  GLSL_NOISE,
  GLSL_NORMAL_FROM_DEPTH,
} from '../ShaderLib';

/**
 * Ground-truth-style ambient occlusion (GTAO) plus screen-space contact
 * shadows, at half resolution with a depth-aware denoise.
 *
 * GTAO integrates the visible arc between the two horizon angles of each slice
 * against the projected normal, which is what makes it read as real cosine
 * occlusion instead of the flat grey haze a distance-comparison SSAO produces.
 *
 * Contact shadows ride along in the green channel: they need the same depth
 * taps and the same blue-noise offset, so folding them in here costs almost
 * nothing and needs no registry of characters — every object gets grounded,
 * including debris and ragdolls the lighting module never hears about.
 */

const AO_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uTexel;          // 1 / full-resolution size
uniform vec2 uHalfTexel;      // 1 / half-resolution size
uniform vec4 uAOParams;       // x: world radius, y: intensity, z: proj scale, w: thickness
uniform vec2 uAOBias;         // x: constant tangent-plane bias (m), y: per-metre term
uniform vec4 uContact;        // x: length (m), y: strength, z: thickness, w: enabled
uniform vec3 uSunViewDir;     // sun direction in view space
uniform float uFarClip;

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}
${GLSL_DEPTH}
${GLSL_NORMAL_FROM_DEPTH}

const float OB_PI = 3.141592653589793;
const float OB_HALF_PI = 1.5707963267948966;

float obHorizonFalloff( float distSq, float radiusSq ) {
  return saturate( 1.0 - distSq / radiusSq );
}

/** March one half-slice and return the largest horizon cosine found. */
float obSearchHorizon( vec2 uv, vec2 dir, vec3 centerView, vec3 normal, vec3 viewDir, float radiusPixels, float noise, float radiusSq, float bias ) {
  float best = -1.0;
  for ( int i = 0; i < AO_STEPS; i ++ ) {
    float s = ( float( i ) + noise ) / float( AO_STEPS );
    // Quadratic spacing keeps taps dense near the receiver where it matters.
    float px = max( s * s * radiusPixels, 1.5 );
    vec2 sampleUv = uv + dir * px * uTexel;
    if ( any( lessThan( sampleUv, vec2( 0.0 ) ) ) || any( greaterThan( sampleUv, vec2( 1.0 ) ) ) ) break;

    float d = texture2D( uDepth, sampleUv ).x;
    if ( d >= 1.0 ) continue;
    vec3 sampleView = obViewPosition( sampleUv, d );
    vec3 delta = sampleView - centerView;
    float lenSq = dot( delta, delta );
    if ( lenSq < 1e-8 ) continue;
    float len = sqrt( lenSq );
    float cosH = dot( delta / len, viewDir );
    // Only what stands above the receiver's own tangent plane can occlude it. A
    // coplanar sample differs from the plane by no more than the depth buffer's
    // quantisation step, and admitting those stripes every flat surface with
    // bands wherever that step lands -- the classic depth-derived AO tell.
    float above = smoothstep( 0.0, bias, dot( delta, normal ) );
    // Thin-object rejection: a foreground sliver should not occlude the world.
    float falloff = obHorizonFalloff( lenSq, radiusSq ) * above;
    best = max( best, mix( -1.0, cosH, falloff ) );
  }
  return best;
}

float obContactShadow( vec2 uv, vec3 centerView, vec3 normal, vec2 noise ) {
  if ( uContact.w < 0.5 ) return 1.0;
  if ( dot( normal, uSunViewDir ) <= 0.02 ) return 1.0;

  vec3 origin = centerView + normal * ( 0.012 + abs( centerView.z ) * 0.0016 );
  float stride = uContact.x / float( CONTACT_STEPS );
  float occ = 0.0;
  for ( int i = 0; i < CONTACT_STEPS; i ++ ) {
    float t = ( float( i ) + noise.y ) * stride;
    vec3 p = origin + uSunViewDir * t;
    vec2 suv = obProjectToUv( p );
    if ( any( lessThan( suv, vec2( 0.0 ) ) ) || any( greaterThan( suv, vec2( 1.0 ) ) ) ) break;
    float d = texture2D( uDepth, suv ).x;
    if ( d >= 1.0 ) continue;
    float sceneZ = obViewZ( d );
    float diff = sceneZ - p.z;
    // Positive diff means the scene sits in front of the ray at this step.
    if ( diff > 0.008 && diff < uContact.z ) {
      occ = max( occ, saturate( 1.0 - t / uContact.x ) );
    }
  }
  return 1.0 - occ * uContact.y;
}

void main() {
  float depth = texture2D( uDepth, vUv ).x;
  if ( depth >= 1.0 ) {
    gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );
    return;
  }

  vec3 centerView = obViewPosition( vUv, depth );
  vec3 normal = obNormalFromDepth( uDepth, vUv, uTexel, centerView );
  vec3 viewDir = normalize( -centerView );

  vec2 pixel = vUv / uHalfTexel;
  vec2 noise = obBlueNoise2( pixel );

  float wantedPixels = uAOParams.x * uAOParams.z / max( -centerView.z, 0.05 );
  float radiusPixels = clamp( wantedPixels, 4.0, 110.0 );
  float radiusSq = uAOParams.x * uAOParams.x * uAOParams.w;
  // Depth precision falls off with the square of the distance; the bias has to
  // follow it or near geometry loses its contact darkening to an oversized
  // tolerance while far geometry keeps banding.
  float bias = uAOBias.x + uAOBias.y * abs( centerView.z );

  float visibility = 0.0;
  for ( int slice = 0; slice < AO_SLICES; slice ++ ) {
    float phi = ( float( slice ) + noise.x ) * OB_PI / float( AO_SLICES );
    vec2 dir = vec2( cos( phi ), sin( phi ) );
    vec3 sliceDir = vec3( dir, 0.0 );

    float c1 = obSearchHorizon( vUv, dir, centerView, normal, viewDir, radiusPixels, noise.y, radiusSq, bias );
    float c2 = obSearchHorizon( vUv, -dir, centerView, normal, viewDir, radiusPixels, noise.y, radiusSq, bias );

    // Project the normal into the slice plane, then integrate the visible arc.
    vec3 planeNormal = normalize( cross( sliceDir, viewDir ) );
    vec3 projNormal = normal - planeNormal * dot( normal, planeNormal );
    float projLen = length( projNormal );
    if ( projLen < 1e-4 ) continue;
    vec3 pn = projNormal / projLen;

    float cosN = clamp( dot( pn, viewDir ), -1.0, 1.0 );
    float n = -sign( dot( pn, sliceDir ) ) * acos( cosN );

    float h1 = -acos( clamp( c1, -1.0, 1.0 ) );
    float h2 = acos( clamp( c2, -1.0, 1.0 ) );
    h1 = n + max( h1 - n, -OB_HALF_PI );
    h2 = n + min( h2 - n, OB_HALF_PI );

    float sinN = sin( n );
    float arc =
      ( h1 * 2.0 * sinN - cos( n - 2.0 * h1 ) + cosN ) +
      ( h2 * 2.0 * sinN - cos( n - 2.0 * h2 ) + cosN );
    visibility += projLen * 0.25 * arc;
  }
  visibility /= float( AO_SLICES );

  float ao = saturate( pow( saturate( visibility ), uAOParams.y ) );
  // Fade on the search radius in pixels rather than on a world distance: once the
  // radius covers only a few texels there is no neighbourhood left to integrate
  // and every tap is quantisation noise. Being resolution-relative, this also
  // keeps the fade distance from moving when the render scale changes.
  float fade = smoothstep( 4.0, 11.0, wantedPixels );
  ao = mix( 1.0, ao, fade );

  float contact = obContactShadow( vUv, centerView, normal, noise );

  gl_FragColor = vec4( ao, contact, 0.0, obLinear01( depth ) );
}
`;

const DENOISE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uDirection;

${GLSL_COMMON}

/**
 * Separable bilateral blur. The depth stored in alpha gates the kernel so the
 * AO does not bleed across silhouettes, and alpha itself is passed through
 * untouched so the upsample keeps a valid depth reference.
 */
void main() {
  vec4 center = texture2D( uSource, vUv );
  vec2 sum = center.rg;
  float wsum = 1.0;

  for ( int i = 1; i <= 3; i ++ ) {
    float o = float( i );
    float weight = exp( -0.5 * o * o / 2.25 );
    for ( int s = 0; s < 2; s ++ ) {
      vec2 off = uDirection * uTexel * o * ( s == 0 ? 1.0 : -1.0 );
      vec4 tap = texture2D( uSource, vUv + off );
      float dw = weight / ( 1.0 + abs( tap.a - center.a ) * 140.0 );
      sum += tap.rg * dw;
      wsum += dw;
    }
  }

  gl_FragColor = vec4( sum / wsum, center.b, center.a );
}
`;

export interface AOQuality {
  slices: number;
  steps: number;
  contactSteps: number;
}

export class AOPass {
  target: THREE.WebGLRenderTarget;
  private scratch: THREE.WebGLRenderTarget;
  private aoMaterial: THREE.ShaderMaterial;
  private readonly denoiseMaterial: THREE.ShaderMaterial;
  private readonly aoUniforms: Record<string, THREE.IUniform>;
  private readonly denoiseUniforms: Record<string, THREE.IUniform>;
  private quality: AOQuality;

  constructor(width: number, height: number, quality: AOQuality) {
    this.quality = quality;
    const w = Math.max(1, width >> 1);
    const h = Math.max(1, height >> 1);
    this.target = createRenderTarget(w, h, { name: 'ao' });
    this.scratch = createRenderTarget(w, h, { name: 'aoBlur' });

    this.aoUniforms = {
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uHalfTexel: { value: new THREE.Vector2() },
      uAOParams: { value: new THREE.Vector4(1.1, 1.35, 500, 1.0) },
      uAOBias: { value: new THREE.Vector2(0.02, 0.004) },
      uContact: { value: new THREE.Vector4(0.55, 0.85, 0.35, 0) },
      uSunViewDir: { value: new THREE.Vector3(0, 1, 0) },
      uFarClip: { value: 1600 },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };
    this.aoMaterial = Blitter.material(AO_FRAGMENT, this.aoUniforms, this.defines());

    this.denoiseUniforms = {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uDirection: { value: new THREE.Vector2(1, 0) },
    };
    this.denoiseMaterial = Blitter.material(DENOISE_FRAGMENT, this.denoiseUniforms);
  }

  private defines(): Record<string, number> {
    return {
      AO_SLICES: this.quality.slices,
      AO_STEPS: this.quality.steps,
      CONTACT_STEPS: this.quality.contactSteps,
    };
  }

  setQuality(quality: AOQuality): void {
    this.quality = quality;
    this.aoMaterial.defines = this.defines();
    this.aoMaterial.needsUpdate = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    depth: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    fullWidth: number,
    fullHeight: number,
    sunViewDir: THREE.Vector3,
    blueNoise: THREE.Texture | null,
    noiseSize: number,
    frame: number,
    contactShadows: boolean,
    radius: number,
    intensity: number,
  ): void {
    const u = this.aoUniforms;
    u.uDepth.value = depth;
    (u.uTexel.value as THREE.Vector2).set(1 / fullWidth, 1 / fullHeight);
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.target.width, 1 / this.target.height);
    // Pixels per world unit at one metre; used to size the search in screen space.
    const projScale = (0.5 * fullHeight) / Math.tan((camera.fov * Math.PI) / 360);
    (u.uAOParams.value as THREE.Vector4).set(radius, intensity, projScale, 1.0);
    (u.uContact.value as THREE.Vector4).set(0.6, 0.8, 0.4, contactShadows ? 1 : 0);
    (u.uSunViewDir.value as THREE.Vector3).copy(sunViewDir);
    u.uFarClip.value = camera.far;
    (u.uProjParams.value as THREE.Vector4).set(camera.near, camera.far, 0, 0);
    (u.uInvProjection.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uProjection.value as THREE.Matrix4).copy(camera.projectionMatrix);
    u.uBlueNoise.value = blueNoise;
    (u.uNoiseParams.value as THREE.Vector4).set(
      1 / Math.max(1, noiseSize),
      frame % 64,
      blueNoise ? 1 : 0,
      (frame * 0.618033988749895) % 1,
    );

    blitter.blit(renderer, this.aoMaterial, this.scratch);

    const du = this.denoiseUniforms;
    (du.uTexel.value as THREE.Vector2).set(1 / this.target.width, 1 / this.target.height);
    du.uSource.value = this.scratch.texture;
    (du.uDirection.value as THREE.Vector2).set(1, 0);
    blitter.blit(renderer, this.denoiseMaterial, this.target);

    du.uSource.value = this.target.texture;
    (du.uDirection.value as THREE.Vector2).set(0, 1);
    blitter.blit(renderer, this.denoiseMaterial, this.scratch);

    // The vertical pass landed in `scratch`; swap so `target` is always current.
    const tmp = this.target;
    this.target = this.scratch;
    this.scratch = tmp;
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, width >> 1);
    const h = Math.max(1, height >> 1);
    this.target.setSize(w, h);
    this.scratch.setSize(w, h);
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.target, this.scratch];
  }

  dispose(): void {
    this.target.dispose();
    this.scratch.dispose();
    this.aoMaterial.dispose();
    this.denoiseMaterial.dispose();
  }
}
