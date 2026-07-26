import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_COLOR, GLSL_COMMON, GLSL_DEPTH } from '../ShaderLib';

/**
 * Auto-exposure and auto-focus, entirely on the GPU.
 *
 * A 64x64 log-luminance reduction with hardware mipmaps gives the scene average
 * for free, and a 1x1 ping-pong target carries the adapted state across frames.
 * Nothing is ever read back to the CPU, so there is no pipeline stall.
 *
 * The same 1x1 target smooths the centre-of-screen depth in its green channel,
 * which is what depth of field uses when no scope has forced a focus distance.
 */

const LUMA_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;

${GLSL_COMMON}
${GLSL_COLOR}

void main() {
  vec3 c = texture2D( uSource, vUv ).rgb;
  float luma = max( obLuminance( c ), 1e-4 );
  // Centre weighting: what the player is aiming at should drive the exposure
  // more than the sky in the top corner.
  vec2 d = vUv - 0.5;
  float weight = exp( -dot( d, d ) * 2.2 );
  gl_FragColor = vec4( log( luma ) * weight, weight, 0.0, 1.0 );
}
`;

const ADAPT_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uLuma;
uniform sampler2D uPrevious;
uniform sampler2D uDepth;
uniform vec4 uParams;      // x: dt, y: rate up, z: rate down, w: has history
uniform vec4 uRange;       // x: min ev, y: max ev, z: key, w: manual override (<0 = auto)
uniform float uLumaLod;
uniform vec4 uFocus;       // x: manual focus (m, <0 = auto), y: focus rate, z: near, w: far

${GLSL_COMMON}
${GLSL_COLOR}
${GLSL_DEPTH}

void main() {
  vec4 reduced = textureLod( uLuma, vec2( 0.5 ), uLumaLod );
  float avgLog = reduced.x / max( reduced.y, 1e-4 );
  float avgLuma = clamp( exp( avgLog ), 0.0008, 60.0 );

  float target = uRange.z / avgLuma;
  target = clamp( target, uRange.x, uRange.y );
  if ( uRange.w > 0.0 ) target = uRange.w;

  float previous = uParams.w > 0.5 ? texture2D( uPrevious, vec2( 0.5 ) ).x : target;
  previous = previous > 0.0 ? previous : target;
  // Fast when the scene brightens (stepping outdoors), slow when it darkens —
  // the same asymmetry the human eye has.
  float rate = target < previous ? uParams.y : uParams.z;
  float exposure = mix( previous, target, saturate( 1.0 - exp( -rate * uParams.x ) ) );

  float centerDepth = texture2D( uDepth, vec2( 0.5 ) ).x;
  float focusDistance = centerDepth >= 1.0 ? uFocus.w : -obViewZ( centerDepth );
  if ( uFocus.x > 0.0 ) focusDistance = uFocus.x;
  float prevFocus = uParams.w > 0.5 ? texture2D( uPrevious, vec2( 0.5 ) ).y : focusDistance;
  if ( prevFocus <= 0.0 ) prevFocus = focusDistance;
  float focus = mix( prevFocus, focusDistance, saturate( 1.0 - exp( -uFocus.y * uParams.x ) ) );

  gl_FragColor = vec4( exposure, focus, avgLuma, 1.0 );
}
`;

export class ExposurePass {
  private readonly luma: THREE.WebGLRenderTarget;
  private current: THREE.WebGLRenderTarget;
  private previous: THREE.WebGLRenderTarget;
  private readonly lumaMaterial: THREE.ShaderMaterial;
  private readonly adaptMaterial: THREE.ShaderMaterial;
  private readonly lumaUniforms: Record<string, THREE.IUniform>;
  private readonly adaptUniforms: Record<string, THREE.IUniform>;
  private hasHistory = false;

  /** Manual exposure override; <= 0 means automatic. */
  manualExposure = -1;
  /** Manual focus distance in metres; <= 0 means automatic. */
  manualFocus = -1;

  private static readonly SIZE = 64;

  constructor() {
    const size = ExposurePass.SIZE;
    this.luma = createRenderTarget(size, size, {
      type: THREE.HalfFloatType,
      filter: THREE.LinearFilter,
      mips: true,
      name: 'luminance',
    });
    // Half float keeps the 1x1 state target working on drivers without
    // EXT_color_buffer_float; the values it carries are all small.
    this.current = createRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      filter: THREE.NearestFilter,
      name: 'exposure',
    });
    this.previous = createRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      filter: THREE.NearestFilter,
      name: 'exposurePrev',
    });

    this.lumaUniforms = { uSource: { value: null } };
    this.lumaMaterial = Blitter.material(LUMA_FRAGMENT, this.lumaUniforms);

    this.adaptUniforms = {
      uLuma: { value: this.luma.texture },
      uPrevious: { value: null },
      uDepth: { value: null },
      uParams: { value: new THREE.Vector4(0.016, 3.2, 1.1, 0) },
      uRange: { value: new THREE.Vector4(0.12, 6.0, 0.22, -1) },
      uLumaLod: { value: Math.log2(size) },
      uFocus: { value: new THREE.Vector4(-1, 4.5, 0.05, 1600) },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
    };
    this.adaptMaterial = Blitter.material(ADAPT_FRAGMENT, this.adaptUniforms);
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    source: THREE.Texture,
    depth: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    dt: number,
  ): void {
    this.lumaUniforms.uSource.value = source;
    blitter.blit(renderer, this.lumaMaterial, this.luma);

    const u = this.adaptUniforms;
    u.uPrevious.value = this.previous.texture;
    u.uDepth.value = depth;
    (u.uParams.value as THREE.Vector4).set(
      Math.min(dt, 0.1),
      3.4,
      1.05,
      this.hasHistory ? 1 : 0,
    );
    (u.uRange.value as THREE.Vector4).set(0.15, 5.5, 0.2, this.manualExposure);
    (u.uFocus.value as THREE.Vector4).set(this.manualFocus, 4.5, camera.near, camera.far);
    (u.uProjParams.value as THREE.Vector4).set(camera.near, camera.far, 0, 0);
    (u.uInvProjection.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uProjection.value as THREE.Matrix4).copy(camera.projectionMatrix);

    blitter.blit(renderer, this.adaptMaterial, this.current);

    const tmp = this.previous;
    this.previous = this.current;
    this.current = tmp;
    this.hasHistory = true;
  }

  /** R: exposure multiplier, G: focus distance, B: average luminance. */
  get texture(): THREE.Texture {
    return this.previous.texture;
  }

  reset(): void {
    this.hasHistory = false;
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.luma, this.current, this.previous];
  }

  dispose(): void {
    this.luma.dispose();
    this.current.dispose();
    this.previous.dispose();
    this.lumaMaterial.dispose();
    this.adaptMaterial.dispose();
  }
}
