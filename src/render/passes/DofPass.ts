import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_BLUENOISE, GLSL_COMMON, GLSL_DEPTH, GLSL_NOISE } from '../ShaderLib';

/**
 * Bokeh depth of field with a hexagonal aperture.
 *
 * Signed circle of confusion so near and far blur behave differently, a
 * golden-angle gather snapped onto a hexagon so out-of-focus highlights take on
 * the shape of a real iris, and a CoC comparison per tap so a sharp foreground
 * never picks up colour from the blurred background behind it.
 *
 * Kept deliberately weak for gameplay; the scope path multiplies the aperture up
 * so a sniper sight actually reads as a long lens.
 */

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uSource;
uniform sampler2D uDepth;
uniform sampler2D uExposure;   // .y carries the smoothed focus distance
uniform vec2 uTexel;
uniform vec4 uParams;          // x: aperture, y: max radius px, z: focus override, w: viewmodel blur
uniform vec4 uRange;           // x: near blur scale, y: far blur scale, z: focal length, w: unused

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}
${GLSL_DEPTH}

const float OB_GOLDEN = 2.399963229728653;

/** Signed CoC in pixels: negative in front of the focal plane, positive behind. */
float obCoc( float distance, float focus ) {
  float focal = uRange.z;
  float denom = max( distance * ( focus - focal ), 1e-4 );
  float coc = uParams.x * focal * ( distance - focus ) / denom;
  coc *= distance < focus ? uRange.x : uRange.y;
  return clamp( coc * uParams.y, -uParams.y, uParams.y );
}

/** Squeeze a unit-disc sample onto a hexagon — the aperture blade shape. */
vec2 obHexagonal( vec2 p ) {
  float angle = atan( p.y, p.x );
  float r = length( p );
  float sector = 3.141592653589793 / 3.0;
  float snapped = cos( sector * 0.5 ) / max( cos( mod( angle, sector ) - sector * 0.5 ), 1e-3 );
  return normalize( p + 1e-6 ) * r * snapped;
}

void main() {
  vec4 center = texture2D( uSource, vUv );
  float rawDepth = texture2D( uDepth, vUv ).x;
  float focus = uParams.z > 0.0 ? uParams.z : texture2D( uExposure, vec2( 0.5 ) ).y;
  focus = max( focus, 0.25 );

  float distance = rawDepth >= 1.0 ? uProjParams.y : -obViewZ( rawDepth );
  float coc = obCoc( distance, focus );
  // The weapon stays sharp unless a scope explicitly asks for a shallow depth.
  coc *= mix( 1.0, uParams.w, saturate( center.a ) );

  float radius = abs( coc );
  if ( radius < 1.0 ) {
    gl_FragColor = center;
    return;
  }

  vec2 pixel = vUv / uTexel;
  float phase = obBlueNoise1( pixel ) * 6.283185307;

  vec3 sum = center.rgb;
  float weight = 1.0;

  for ( int i = 0; i < DOF_TAPS; i ++ ) {
    float fi = float( i ) + 0.5;
    float r = sqrt( fi / float( DOF_TAPS ) );
    float theta = fi * OB_GOLDEN + phase;
    vec2 disc = obHexagonal( vec2( cos( theta ), sin( theta ) ) * r );
    vec2 uv = vUv + disc * radius * uTexel;
    if ( any( lessThan( uv, vec2( 0.0 ) ) ) || any( greaterThan( uv, vec2( 1.0 ) ) ) ) continue;

    vec4 tap = texture2D( uSource, uv );
    float tapDepth = texture2D( uDepth, uv ).x;
    float tapDistance = tapDepth >= 1.0 ? uProjParams.y : -obViewZ( tapDepth );
    float tapCoc = obCoc( tapDistance, focus );

    // Only accept a tap whose own blur radius reaches this pixel, which stops
    // sharp foregrounds from being contaminated by the background.
    float reach = saturate( ( abs( tapCoc ) - r * radius ) * 0.5 + 0.5 );
    float sameSide = tapCoc * coc >= 0.0 ? 1.0 : 0.35;
    float w = reach * sameSide;
    sum += tap.rgb * w;
    weight += w;
  }

  gl_FragColor = vec4( sum / weight, center.a );
}
`;

export class DofPass {
  output: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private taps: number;

  /** Focus override in metres, or null for auto-focus on the screen centre. */
  focusDistance: number | null = null;
  /** 0 = subtle gameplay depth of field, 1 = full scoped aperture. */
  scopeAmount = 0;

  constructor(width: number, height: number, taps: number) {
    this.taps = taps;
    this.output = createRenderTarget(width, height, { name: 'dof' });
    this.uniforms = {
      uSource: { value: null },
      uDepth: { value: null },
      uExposure: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uParams: { value: new THREE.Vector4(0.06, 18, -1, 0.15) },
      uRange: { value: new THREE.Vector4(1.35, 1.0, 0.05, 0) },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms, { DOF_TAPS: taps });
  }

  setQuality(taps: number): void {
    this.taps = Math.max(6, taps);
    this.material.defines = { DOF_TAPS: this.taps };
    this.material.needsUpdate = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    source: THREE.Texture,
    depth: THREE.Texture,
    exposure: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    blueNoise: THREE.Texture | null,
    noiseSize: number,
    frame: number,
  ): THREE.Texture {
    const u = this.uniforms;
    u.uSource.value = source;
    u.uDepth.value = depth;
    u.uExposure.value = exposure;
    (u.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    const aperture = 0.045 + this.scopeAmount * 0.5;
    const maxRadius = 8 + this.scopeAmount * 26;
    (u.uParams.value as THREE.Vector4).set(
      aperture,
      maxRadius,
      this.focusDistance ?? -1,
      0.1 + this.scopeAmount * 0.5,
    );
    (u.uRange.value as THREE.Vector4).set(1.4, 1.0, 0.05 + this.scopeAmount * 0.09, 0);
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
    blitter.blit(renderer, this.material, this.output);
    return this.output.texture;
  }

  setSize(width: number, height: number): void {
    this.output.setSize(width, height);
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.output];
  }

  dispose(): void {
    this.output.dispose();
    this.material.dispose();
  }
}
