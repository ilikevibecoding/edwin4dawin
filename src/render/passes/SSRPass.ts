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
 * Screen-space reflections, half resolution, fixed-step march with a binary
 * refinement.
 *
 * There is no G-buffer to read roughness from — writing one would mean patching
 * the alpha output of every material in the game, which is not a safe thing to
 * do to code owned by other modules. Instead reflections are gated to
 * upward-facing surfaces with a Fresnel and a distance term, which is exactly
 * the wet-asphalt/polished-floor case that reads as expensive, and anything the
 * march misses falls back to the IBL that is already lighting the surface.
 */

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uDepth;
uniform sampler2D uColor;
uniform vec2 uTexel;
uniform vec2 uHalfTexel;
uniform vec3 uUpView;         // world up, in view space
uniform vec4 uParams;         // x: intensity, y: max distance, z: thickness, w: roughness
uniform float uFarClip;

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}
${GLSL_DEPTH}
${GLSL_NORMAL_FROM_DEPTH}

void main() {
  float depth = texture2D( uDepth, vUv ).x;
  if ( depth >= 1.0 ) {
    gl_FragColor = vec4( 0.0 );
    return;
  }

  vec3 origin = obViewPosition( vUv, depth );
  vec3 normal = obNormalFromDepth( uDepth, vUv, uTexel, origin );

  // Only near-horizontal, upward-facing surfaces reflect. Everything else is
  // left to the environment probe.
  float upness = saturate( ( dot( normal, uUpView ) - 0.55 ) / 0.4 );
  if ( upness <= 0.001 ) {
    gl_FragColor = vec4( 0.0 );
    return;
  }

  vec3 viewDir = normalize( origin );
  vec2 pixel = vUv / uHalfTexel;
  vec2 noise = obBlueNoise2( pixel );

  // Roughness-aware jitter: perturb the reflected ray inside a small cone so
  // the result reads as a rough reflection once the bilateral upsample blurs it.
  vec3 jitter = vec3( noise.x - 0.5, noise.y - 0.5, obIGN( pixel + 11.0 ) - 0.5 );
  vec3 n = normalize( normal + jitter * uParams.w );
  vec3 rayDir = normalize( reflect( viewDir, n ) );
  if ( dot( rayDir, normal ) <= 0.0 ) {
    gl_FragColor = vec4( 0.0 );
    return;
  }

  float maxDist = uParams.y;
  float stepLen = maxDist / float( SSR_STEPS );
  vec3 pos = origin + normal * 0.02 + rayDir * stepLen * ( 0.5 + noise.x * 0.5 );

  bool hit = false;
  vec2 hitUv = vec2( 0.0 );
  float hitDelta = 0.0;

  for ( int i = 0; i < SSR_STEPS; i ++ ) {
    pos += rayDir * stepLen;
    if ( pos.z > -0.05 ) break;

    vec2 uv = obProjectToUv( pos );
    if ( any( lessThan( uv, vec2( 0.0 ) ) ) || any( greaterThan( uv, vec2( 1.0 ) ) ) ) break;

    float sceneDepth = texture2D( uDepth, uv ).x;
    if ( sceneDepth >= 1.0 ) continue;
    float sceneZ = obViewZ( sceneDepth );
    float delta = sceneZ - pos.z;

    if ( delta > 0.0 && delta < uParams.z + stepLen ) {
      // Binary refinement halves the step until the intersection is tight.
      vec3 lo = pos - rayDir * stepLen;
      vec3 hi = pos;
      for ( int r = 0; r < 5; r ++ ) {
        vec3 mid = ( lo + hi ) * 0.5;
        vec2 muv = obProjectToUv( mid );
        float md = texture2D( uDepth, muv ).x;
        float mz = obViewZ( md );
        if ( mz - mid.z > 0.0 ) hi = mid; else lo = mid;
      }
      pos = hi;
      hitUv = obProjectToUv( pos );
      hitDelta = delta;
      hit = true;
      break;
    }
  }

  if ( ! hit ) {
    gl_FragColor = vec4( 0.0 );
    return;
  }

  vec3 reflected = texture2D( uColor, hitUv ).rgb;

  // Fades: screen border, ray length, grazing rays pointing back at the camera,
  // and thickness confidence.
  vec2 border = abs( hitUv * 2.0 - 1.0 );
  float edgeFade = saturate( ( 1.0 - max( border.x, border.y ) ) * 6.0 );
  float lengthFade = 1.0 - saturate( length( pos - origin ) / maxDist );
  float backFade = saturate( 1.0 - rayDir.z * -1.0 );
  float thicknessFade = saturate( 1.0 - hitDelta / ( uParams.z + 1e-4 ) );
  float distanceFade = 1.0 - smoothstep( uFarClip * 0.06, uFarClip * 0.2, -origin.z );

  // Schlick Fresnel with a dielectric F0 — reflections belong at glancing angles.
  float cosTheta = saturate( dot( -viewDir, normal ) );
  float fresnel = 0.04 + 0.96 * pow( 1.0 - cosTheta, 5.0 );

  float weight = upness * edgeFade * lengthFade * backFade * thicknessFade *
    distanceFade * fresnel * uParams.x;

  gl_FragColor = vec4( reflected * weight, obLinear01( depth ) );
}
`;

export class SSRPass {
  target: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private steps: number;

  constructor(width: number, height: number, steps: number) {
    this.steps = steps;
    this.target = createRenderTarget(Math.max(1, width >> 1), Math.max(1, height >> 1), {
      name: 'ssr',
    });
    this.uniforms = {
      uDepth: { value: null },
      uColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uHalfTexel: { value: new THREE.Vector2() },
      uUpView: { value: new THREE.Vector3(0, 1, 0) },
      uParams: { value: new THREE.Vector4(0.85, 14, 0.6, 0.14) },
      uFarClip: { value: 1600 },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms, { SSR_STEPS: this.steps });
  }

  setQuality(steps: number): void {
    this.steps = Math.max(4, steps);
    this.material.defines = { SSR_STEPS: this.steps };
    this.material.needsUpdate = true;
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    depth: THREE.Texture,
    color: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    fullWidth: number,
    fullHeight: number,
    upView: THREE.Vector3,
    blueNoise: THREE.Texture | null,
    noiseSize: number,
    frame: number,
    intensity: number,
  ): void {
    const u = this.uniforms;
    u.uDepth.value = depth;
    u.uColor.value = color;
    (u.uTexel.value as THREE.Vector2).set(1 / fullWidth, 1 / fullHeight);
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.target.width, 1 / this.target.height);
    (u.uUpView.value as THREE.Vector3).copy(upView);
    (u.uParams.value as THREE.Vector4).set(intensity, 16, 0.7, 0.16);
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
    blitter.blit(renderer, this.material, this.target);
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  setSize(width: number, height: number): void {
    this.target.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1));
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
  }
}
