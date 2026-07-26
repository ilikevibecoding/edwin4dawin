import * as THREE from 'three';
import { Blitter } from '../Blitter';
import { GLSL_COLOR, GLSL_COMMON, GLSL_DEPTH } from '../ShaderLib';

/**
 * Full-screen view of one intermediate buffer, selected with `?debugPass=`.
 *
 * Each buffer needs a different mapping to be legible — velocity is a signed
 * two-channel field, AO packs two masks plus depth, bloom is HDR — so the mode
 * is a define rather than a uniform and the shader recompiles only when the
 * URL-selected buffer changes.
 */

export type DebugPassName =
  | 'none'
  | 'scene'
  | 'viewmodel'
  | 'ao'
  | 'contact'
  | 'ssr'
  | 'velocity'
  | 'bloom'
  | 'ghost'
  | 'streak'
  | 'volumetric'
  | 'depth'
  | 'normals'
  | 'resolve'
  | 'exposure';

const DEBUG_MODES: Record<DebugPassName, number> = {
  none: 0,
  scene: 1,
  viewmodel: 2,
  ao: 3,
  contact: 4,
  ssr: 5,
  velocity: 6,
  bloom: 7,
  ghost: 8,
  streak: 9,
  volumetric: 10,
  depth: 11,
  normals: 12,
  resolve: 13,
  exposure: 14,
};

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec4 uScale;     // x: multiplier, y: exposure readback, z: unused, w: unused

${GLSL_COMMON}
${GLSL_COLOR}
${GLSL_DEPTH}

vec3 obNormalDebug( vec2 uv ) {
  float d = texture2D( uDepth, uv ).x;
  if ( d >= 1.0 ) return vec3( 0.0 );
  vec3 c = obViewPosition( uv, d );
  vec3 px = obViewPosition( uv + vec2( uTexel.x, 0.0 ), texture2D( uDepth, uv + vec2( uTexel.x, 0.0 ) ).x );
  vec3 py = obViewPosition( uv + vec2( 0.0, uTexel.y ), texture2D( uDepth, uv + vec2( 0.0, uTexel.y ) ).x );
  vec3 n = normalize( cross( px - c, py - c ) );
  return n * 0.5 + 0.5;
}

void main() {
  vec4 s = texture2D( uSource, vUv );
  vec3 outColor;

#if DEBUG_MODE == 3
  outColor = vec3( saturate( s.r ) );
#elif DEBUG_MODE == 4
  outColor = vec3( saturate( s.g ) );
#elif DEBUG_MODE == 6
  // Signed velocity, amplified so a walking pace is actually visible.
  vec2 v = s.xy * 40.0;
  outColor = vec3( 0.5 + v.x, 0.5 + v.y, 0.5 );
#elif DEBUG_MODE == 11
  float linear = obLinear01( texture2D( uDepth, vUv ).x );
  // Cube-root the range so both a doorway and a skyline read at once.
  outColor = vec3( pow( linear, 0.3333 ) );
#elif DEBUG_MODE == 12
  outColor = obNormalDebug( vUv );
#elif DEBUG_MODE == 14
  // The 1x1 exposure state, printed as three horizontal bars.
  vec4 state = texture2D( uSource, vec2( 0.5 ) );
  float band = floor( vUv.y * 3.0 );
  float value = band < 1.0 ? state.x * 0.25 : ( band < 2.0 ? state.y * 0.02 : state.z );
  outColor = vec3( step( vUv.x, saturate( value ) ) );
#else
  outColor = s.rgb * uScale.x;
#endif

  gl_FragColor = vec4( obLinearToSRGB( max( outColor, vec3( 0.0 ) ) ), 1.0 );
}
`;

export function parseDebugPass(search: string): DebugPassName {
  let name: string | null = null;
  try {
    name = new URLSearchParams(search).get('debugPass');
  } catch {
    return 'none';
  }
  if (!name) return 'none';
  const key = name.toLowerCase();
  return key in DEBUG_MODES ? (key as DebugPassName) : 'none';
}

export class DebugViewPass {
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private mode: DebugPassName = 'none';

  constructor() {
    this.uniforms = {
      uSource: { value: null },
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uScale: { value: new THREE.Vector4(1, 1, 0, 0) },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms, { DEBUG_MODE: 0 });
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    mode: DebugPassName,
    source: THREE.Texture,
    depth: THREE.Texture | null,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    scale: number,
  ): void {
    if (mode !== this.mode) {
      this.mode = mode;
      this.material.defines = { DEBUG_MODE: DEBUG_MODES[mode] };
      this.material.needsUpdate = true;
    }
    const u = this.uniforms;
    u.uSource.value = source;
    u.uDepth.value = depth;
    (u.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (u.uScale.value as THREE.Vector4).set(scale, 0, 0, 0);
    (u.uProjParams.value as THREE.Vector4).set(camera.near, camera.far, 0, 0);
    (u.uInvProjection.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uProjection.value as THREE.Matrix4).copy(camera.projectionMatrix);
    blitter.blit(renderer, this.material, null);
  }

  dispose(): void {
    this.material.dispose();
  }
}
