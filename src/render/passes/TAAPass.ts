import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_COLOR, GLSL_COMMON } from '../ShaderLib';

/**
 * Temporal anti-aliasing.
 *
 * Halton(2,3) sub-pixel jitter on the projection matrix, history reprojected
 * through the velocity buffer with a closest-depth velocity dilation, YCoCg
 * neighbourhood clamping plus variance clipping to kill ghosting, and a
 * luminance-weighted feedback factor. Sharpening is deliberately *not* done
 * here: the composite pass already reads a 3x3 neighbourhood, so RCAS rides
 * along there for free instead of costing another blit.
 */

const HALTON_SAMPLES = 16;

function halton(index: number, base: number): number {
  let result = 0;
  let f = 1;
  let i = index;
  while (i > 0) {
    f /= base;
    result += f * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform sampler2D uVelocity;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec4 uParams;      // x: feedback, y: has history, z: variance gamma, w: velocity scale

${GLSL_COMMON}
${GLSL_COLOR}

/**
 * Pick the velocity of the neighbour closest to the camera. Using the centre
 * pixel's own velocity leaves a one-pixel halo of stale history along every
 * silhouette, which is the classic TAA edge shimmer.
 */
vec2 obDilatedVelocity( vec2 uv ) {
  float bestDepth = 1.0;
  vec2 bestOffset = vec2( 0.0 );
  for ( int y = -1; y <= 1; y ++ ) {
    for ( int x = -1; x <= 1; x ++ ) {
      vec2 o = vec2( float( x ), float( y ) ) * uTexel;
      float d = texture2D( uDepth, uv + o ).x;
      if ( d < bestDepth ) {
        bestDepth = d;
        bestOffset = o;
      }
    }
  }
  return texture2D( uVelocity, uv + bestOffset ).xy;
}

void main() {
  vec4 centerSample = texture2D( uCurrent, vUv );
  vec3 current = centerSample.rgb;
  float coverage = centerSample.a;

  if ( uParams.y < 0.5 ) {
    gl_FragColor = vec4( current, coverage );
    return;
  }

  // Neighbourhood statistics in YCoCg: chroma is where ghosting is visible, and
  // an AABB in YCoCg is a much tighter bound than one in RGB.
  vec3 m1 = vec3( 0.0 );
  vec3 m2 = vec3( 0.0 );
  vec3 minC = vec3( 1e6 );
  vec3 maxC = vec3( -1e6 );
  for ( int y = -1; y <= 1; y ++ ) {
    for ( int x = -1; x <= 1; x ++ ) {
      vec3 c = obRGBToYCoCg( texture2D( uCurrent, vUv + vec2( float( x ), float( y ) ) * uTexel ).rgb );
      m1 += c;
      m2 += c * c;
      minC = min( minC, c );
      maxC = max( maxC, c );
    }
  }
  vec3 mean = m1 / 9.0;
  vec3 sigma = sqrt( max( m2 / 9.0 - mean * mean, vec3( 0.0 ) ) );
  vec3 lo = max( mean - uParams.z * sigma, minC );
  vec3 hi = min( mean + uParams.z * sigma, maxC );

  vec2 velocity = obDilatedVelocity( vUv ) * uParams.w;
  vec2 prevUv = vUv - velocity;

  float offScreen = any( lessThan( prevUv, vec2( 0.0 ) ) ) || any( greaterThan( prevUv, vec2( 1.0 ) ) )
    ? 1.0 : 0.0;

  vec3 history = obRGBToYCoCg( texture2D( uHistory, prevUv ).rgb );

  // Clip rather than clamp: move the history towards the current colour along
  // the line between them so hue is preserved instead of channel-clipped.
  vec3 center = 0.5 * ( hi + lo );
  vec3 extent = 0.5 * ( hi - lo ) + 1e-5;
  vec3 offset = history - center;
  vec3 unit = abs( offset / extent );
  float maxUnit = max( unit.x, max( unit.y, unit.z ) );
  if ( maxUnit > 1.0 ) history = center + offset / maxUnit;

  vec3 currentYCoCg = obRGBToYCoCg( current );
  float lumaDiff = abs( currentYCoCg.x - history.x ) / max( max( currentYCoCg.x, history.x ), 0.2 );
  float feedback = uParams.x * ( 1.0 - saturate( lumaDiff * 1.4 ) );
  feedback *= 1.0 - saturate( length( velocity ) * 45.0 ) * 0.35;
  feedback = mix( feedback, 0.0, offScreen );

  vec3 resolved = obYCoCgToRGB( mix( currentYCoCg, history, feedback ) );
  gl_FragColor = vec4( max( resolved, vec3( 0.0 ) ), coverage );
}
`;

export class TAAPass {
  private history: THREE.WebGLRenderTarget;
  private output: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private hasHistory = false;
  private sampleIndex = 0;

  private readonly jitter = new THREE.Vector2();
  private readonly offsets: Array<[number, number]> = [];

  constructor(width: number, height: number) {
    this.history = createRenderTarget(width, height, { name: 'taaHistory' });
    this.output = createRenderTarget(width, height, { name: 'taaOutput' });
    this.uniforms = {
      uCurrent: { value: null },
      uHistory: { value: null },
      uVelocity: { value: null },
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uParams: { value: new THREE.Vector4(0.9, 0, 1.25, 1) },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms);

    for (let i = 1; i <= HALTON_SAMPLES; i++) {
      this.offsets.push([halton(i, 2) - 0.5, halton(i, 3) - 0.5]);
    }
  }

  /**
   * Offset the projection matrix by this frame's sub-pixel sample. Returns the
   * jitter in pixels so the caller can undo it after rendering.
   */
  applyJitter(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    enabled: boolean,
  ): THREE.Vector2 {
    if (!enabled) {
      this.jitter.set(0, 0);
      return this.jitter;
    }
    const [ox, oy] = this.offsets[this.sampleIndex % this.offsets.length];
    this.sampleIndex++;
    this.jitter.set(ox, oy);
    const e = camera.projectionMatrix.elements;
    e[8] += (ox * 2) / width;
    e[9] += (oy * 2) / height;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    return this.jitter;
  }

  /** Restore the un-jittered projection so gameplay maths is unaffected. */
  removeJitter(camera: THREE.PerspectiveCamera, width: number, height: number): void {
    if (this.jitter.x === 0 && this.jitter.y === 0) return;
    const e = camera.projectionMatrix.elements;
    e[8] -= (this.jitter.x * 2) / width;
    e[9] -= (this.jitter.y * 2) / height;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    this.jitter.set(0, 0);
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    current: THREE.Texture,
    velocity: THREE.Texture,
    depth: THREE.Texture,
    width: number,
    height: number,
    feedback: number,
  ): THREE.Texture {
    const u = this.uniforms;
    u.uCurrent.value = current;
    u.uHistory.value = this.history.texture;
    u.uVelocity.value = velocity;
    u.uDepth.value = depth;
    (u.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (u.uParams.value as THREE.Vector4).set(feedback, this.hasHistory ? 1 : 0, 1.3, 1);

    blitter.blit(renderer, this.material, this.output);

    const tmp = this.history;
    this.history = this.output;
    this.output = tmp;
    this.hasHistory = true;
    return this.history.texture;
  }

  reset(): void {
    this.hasHistory = false;
    this.sampleIndex = 0;
  }

  setSize(width: number, height: number): void {
    this.history.setSize(width, height);
    this.output.setSize(width, height);
    this.hasHistory = false;
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.history, this.output];
  }

  dispose(): void {
    this.history.dispose();
    this.output.dispose();
    this.material.dispose();
  }
}
