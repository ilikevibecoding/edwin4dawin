import * as THREE from 'three';
import { Blitter } from '../Blitter';
import { GLSL_BILATERAL_UPSAMPLE, GLSL_COMMON, GLSL_COLOR, GLSL_DEPTH } from '../ShaderLib';

/**
 * Single blit that folds every screen-space buffer back onto the HDR scene and
 * composites the first-person viewmodel on top.
 *
 * The viewmodel is rendered into its own HDR target with its own depth, so it is
 * never clipped by world geometry, and it deliberately skips world AO, SSR and
 * volumetrics — those were computed against the world depth buffer and would be
 * wrong on a weapon that lives in a different projection. Its coverage is
 * written to alpha so motion blur and depth of field can back off over it.
 */

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uScene;
uniform sampler2D uViewmodel;
uniform sampler2D uDepth;
uniform vec2 uHalfTexel;
uniform vec4 uStrength;      // x: ao, y: contact, z: ssr, w: volumetric

#ifdef USE_AO
uniform sampler2D uAO;
#endif
#ifdef USE_SSR
uniform sampler2D uSSR;
#endif
#ifdef USE_VOLUMETRIC
uniform sampler2D uVolumetric;
#endif

${GLSL_COMMON}
${GLSL_COLOR}
${GLSL_DEPTH}
${GLSL_BILATERAL_UPSAMPLE}

/**
 * Jimenez's multi-bounce approximation. Plain AO multiplication turns shadows
 * into flat grey; letting the surface colour bounce keeps them deep and
 * saturated, which is the look modern shooters go for.
 */
vec3 obMultiBounce( float visibility, vec3 albedo ) {
  vec3 a = 2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c = 2.7552 * albedo + 0.6903;
  float x = visibility;
  return clamp( x * ( ( a * x + b ) * x + c ), vec3( x ), vec3( 1.0 ) );
}

void main() {
  vec3 color = texture2D( uScene, vUv ).rgb;
  float rawDepth = texture2D( uDepth, vUv ).x;
  float linearZ = obLinear01( rawDepth );

#if defined( USE_AO ) || defined( USE_SSR ) || defined( USE_VOLUMETRIC )
  bool isSky = rawDepth >= 1.0;
#endif

#ifdef USE_AO
  if ( ! isSky ) {
    vec3 ao = obBilateralUpsample( uAO, vUv, uHalfTexel, linearZ );
    float occlusion = mix( 1.0, saturate( ao.r ), uStrength.x );
    float albedoGuess = saturate( obLuminance( color ) * 1.6 );
    vec3 tint = obMultiBounce( occlusion, mix( vec3( 0.35 ), saturate( color / ( 1.0 + obLuminance( color ) ) ), albedoGuess ) );
    color *= tint;
    color *= mix( 1.0, saturate( ao.g ), uStrength.y );
  }
#endif

#ifdef USE_SSR
  if ( ! isSky ) {
    vec3 ssr = obBilateralUpsample( uSSR, vUv, uHalfTexel, linearZ );
    color += ssr * uStrength.z;
  }
#endif

#ifdef USE_VOLUMETRIC
  vec3 fogLight = obBilateralUpsample( uVolumetric, vUv, uHalfTexel, linearZ );
  color += fogLight * uStrength.w;
#endif

  vec4 view = texture2D( uViewmodel, vUv );
  float coverage = saturate( view.a );
  color = mix( color, view.rgb, coverage );

  gl_FragColor = vec4( max( color, vec3( 0.0 ) ), coverage );
}
`;

export interface ResolveInputs {
  scene: THREE.Texture;
  viewmodel: THREE.Texture;
  depth: THREE.Texture;
  ao: THREE.Texture | null;
  ssr: THREE.Texture | null;
  volumetric: THREE.Texture | null;
}

export class ResolvePass {
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private signature = '';

  constructor() {
    this.uniforms = {
      uScene: { value: null },
      uViewmodel: { value: null },
      uDepth: { value: null },
      uAO: { value: null },
      uSSR: { value: null },
      uVolumetric: { value: null },
      uHalfTexel: { value: new THREE.Vector2() },
      uStrength: { value: new THREE.Vector4(1, 1, 1, 1) },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
    };
    this.material = Blitter.material(FRAGMENT, this.uniforms);
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    target: THREE.WebGLRenderTarget,
    inputs: ResolveInputs,
    camera: THREE.PerspectiveCamera,
    halfWidth: number,
    halfHeight: number,
    strength: THREE.Vector4,
  ): void {
    const signature = `${inputs.ao ? 1 : 0}${inputs.ssr ? 1 : 0}${inputs.volumetric ? 1 : 0}`;
    if (signature !== this.signature) {
      this.signature = signature;
      const defines: Record<string, number> = {};
      if (inputs.ao) defines.USE_AO = 1;
      if (inputs.ssr) defines.USE_SSR = 1;
      if (inputs.volumetric) defines.USE_VOLUMETRIC = 1;
      this.material.defines = defines;
      this.material.needsUpdate = true;
    }

    const u = this.uniforms;
    u.uScene.value = inputs.scene;
    u.uViewmodel.value = inputs.viewmodel;
    u.uDepth.value = inputs.depth;
    u.uAO.value = inputs.ao;
    u.uSSR.value = inputs.ssr;
    u.uVolumetric.value = inputs.volumetric;
    (u.uHalfTexel.value as THREE.Vector2).set(1 / halfWidth, 1 / halfHeight);
    (u.uStrength.value as THREE.Vector4).copy(strength);
    (u.uProjParams.value as THREE.Vector4).set(camera.near, camera.far, 0, 0);
    (u.uInvProjection.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uProjection.value as THREE.Matrix4).copy(camera.projectionMatrix);

    blitter.blit(renderer, this.material, target);
  }

  dispose(): void {
    this.material.dispose();
  }
}
