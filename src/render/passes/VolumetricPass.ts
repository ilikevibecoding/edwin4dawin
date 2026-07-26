import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_BLUENOISE, GLSL_COMMON, GLSL_DEPTH, GLSL_NOISE, GLSL_PHASE } from '../ShaderLib';

/**
 * Raymarched sun shafts through the shadow cascades.
 *
 * Half resolution, blue-noise offset per pixel (trading banding for grain,
 * which the temporal pass then integrates away), Henyey-Greenstein phase with a
 * secondary backscatter lobe, exponential height falloff and a drifting noise
 * field so the medium is not a uniform soup. The two nearest cascades are
 * sampled directly — their `shadow.matrix` is already up to date by the time
 * post-processing runs.
 */

const MARCH_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uDepth;
uniform highp sampler2DShadow uCascade0;
uniform highp sampler2DShadow uCascade1;
uniform mat4 uCascadeMatrix0;
uniform mat4 uCascadeMatrix1;
uniform mat4 uInvView;          // camera.matrixWorld
uniform vec3 uCameraPos;
uniform vec3 uSunDirection;     // world space, towards the sun
uniform vec3 uSunColor;
uniform vec4 uFog;              // x: density, y: height falloff, z: base height, w: max distance
uniform vec4 uParams;           // x: intensity, y: phase g, z: shadow enabled, w: noise scale
uniform vec2 uWind;
uniform float uTime;
uniform vec2 uHalfTexel;

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}
${GLSL_DEPTH}
${GLSL_PHASE}

float obCascadeVisibility( vec3 worldPos ) {
  if ( uParams.z < 0.5 ) return 1.0;

  vec4 c0 = uCascadeMatrix0 * vec4( worldPos, 1.0 );
  vec3 p0 = c0.xyz / c0.w;
  if ( all( greaterThan( p0, vec3( 0.02 ) ) ) && all( lessThan( p0, vec3( 0.98 ) ) ) ) {
    return texture( uCascade0, p0 );
  }
  #if VOL_CASCADES > 1
    vec4 c1 = uCascadeMatrix1 * vec4( worldPos, 1.0 );
    vec3 p1 = c1.xyz / c1.w;
    if ( all( greaterThan( p1, vec3( 0.02 ) ) ) && all( lessThan( p1, vec3( 0.98 ) ) ) ) {
      return texture( uCascade1, p1 );
    }
  #endif
  return 1.0;
}

float obMediumDensity( vec3 p ) {
  float height = exp( -max( p.y - uFog.z, 0.0 ) * uFog.y );
  // Slow drifting billows keep the shafts from looking like a flat gradient.
  vec3 q = p * uParams.w + vec3( uWind.x, uTime * 0.02, uWind.y );
  float n = obValueNoise3( q ) * 0.6 + obValueNoise3( q * 2.7 ) * 0.4;
  return uFog.x * height * ( 0.55 + 0.9 * n );
}

void main() {
  float depth = texture2D( uDepth, vUv ).x;
  vec3 viewPos = obViewPosition( vUv, depth );

  // World-space ray from the eye to the first opaque surface (or the fog wall).
  vec4 worldEnd = uInvView * vec4( viewPos, 1.0 );
  vec3 rayEnd = worldEnd.xyz;
  vec3 toEnd = rayEnd - uCameraPos;
  float rayLength = length( toEnd );
  vec3 rayDir = rayLength > 1e-5 ? toEnd / rayLength : vec3( 0.0, 0.0, -1.0 );
  float marchLength = min( rayLength, uFog.w );

  float cosTheta = dot( rayDir, uSunDirection );
  float phase = obDualPhase( cosTheta, uParams.y, -0.28, 0.8 );

  vec2 pixel = vUv / uHalfTexel;
  float jitter = obBlueNoise1( pixel );

  float stepLen = marchLength / float( VOL_STEPS );
  vec3 accum = vec3( 0.0 );
  float transmittance = 1.0;

  for ( int i = 0; i < VOL_STEPS; i ++ ) {
    float t = ( float( i ) + jitter ) * stepLen;
    if ( t > marchLength ) break;
    vec3 p = uCameraPos + rayDir * t;

    float density = obMediumDensity( p );
    if ( density < 1e-5 ) continue;

    float visibility = obCascadeVisibility( p );
    float sigma = density * stepLen;
    vec3 inscatter = uSunColor * ( visibility * phase );
    // Energy-conserving accumulation instead of a naive additive sum.
    accum += transmittance * inscatter * ( 1.0 - exp( -sigma ) );
    transmittance *= exp( -sigma * 0.35 );
    if ( transmittance < 0.02 ) break;
  }

  gl_FragColor = vec4( accum * uParams.x, obLinear01( depth ) );
}
`;

const TEMPORAL_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform sampler2D uVelocity;
uniform float uBlend;
uniform float uHasHistory;

${GLSL_COMMON}

void main() {
  vec4 current = texture2D( uCurrent, vUv );
  if ( uHasHistory < 0.5 ) {
    gl_FragColor = current;
    return;
  }

  vec2 velocity = texture2D( uVelocity, vUv ).xy;
  vec2 prevUv = vUv - velocity;
  if ( any( lessThan( prevUv, vec2( 0.0 ) ) ) || any( greaterThan( prevUv, vec2( 1.0 ) ) ) ) {
    gl_FragColor = current;
    return;
  }

  vec4 history = texture2D( uHistory, prevUv );
  // Depth stored in alpha doubles as the disocclusion test.
  float reject = saturate( abs( history.a - current.a ) * 220.0 );
  float blend = mix( uBlend, 0.0, reject );
  gl_FragColor = vec4( mix( current.rgb, history.rgb, blend ), current.a );
}
`;

export class VolumetricPass {
  private march: THREE.WebGLRenderTarget;
  private history: THREE.WebGLRenderTarget;
  private output: THREE.WebGLRenderTarget;
  private readonly marchMaterial: THREE.ShaderMaterial;
  private readonly temporalMaterial: THREE.ShaderMaterial;
  private readonly marchUniforms: Record<string, THREE.IUniform>;
  private readonly temporalUniforms: Record<string, THREE.IUniform>;
  private hasHistory = false;
  private steps: number;
  private cascadeSamples = 2;

  constructor(width: number, height: number, steps: number) {
    this.steps = steps;
    const w = Math.max(1, width >> 1);
    const h = Math.max(1, height >> 1);
    this.march = createRenderTarget(w, h, { name: 'volumetric' });
    this.history = createRenderTarget(w, h, { name: 'volumetricHistory' });
    this.output = createRenderTarget(w, h, { name: 'volumetricResolved' });

    this.marchUniforms = {
      uDepth: { value: null },
      uCascade0: { value: null },
      uCascade1: { value: null },
      uCascadeMatrix0: { value: new THREE.Matrix4() },
      uCascadeMatrix1: { value: new THREE.Matrix4() },
      uInvView: { value: new THREE.Matrix4() },
      uCameraPos: { value: new THREE.Vector3() },
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uFog: { value: new THREE.Vector4(0.014, 0.055, 0, 90) },
      uParams: { value: new THREE.Vector4(1, 0.72, 1, 0.035) },
      uWind: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uHalfTexel: { value: new THREE.Vector2() },
      uProjParams: { value: new THREE.Vector4(0.05, 1600, 0, 0) },
      uInvProjection: { value: new THREE.Matrix4() },
      uProjection: { value: new THREE.Matrix4() },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };
    this.marchMaterial = Blitter.material(MARCH_FRAGMENT, this.marchUniforms, this.defines());

    this.temporalUniforms = {
      uCurrent: { value: null },
      uHistory: { value: null },
      uVelocity: { value: null },
      uBlend: { value: 0.88 },
      uHasHistory: { value: 0 },
    };
    this.temporalMaterial = Blitter.material(TEMPORAL_FRAGMENT, this.temporalUniforms);
  }

  private defines(): Record<string, number> {
    return { VOL_STEPS: Math.max(4, this.steps), VOL_CASCADES: this.cascadeSamples };
  }

  setQuality(steps: number, cascadeCount: number): void {
    this.steps = steps;
    this.cascadeSamples = Math.min(2, Math.max(1, cascadeCount));
    this.marchMaterial.defines = this.defines();
    this.marchMaterial.needsUpdate = true;
    this.hasHistory = false;
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    depth: THREE.Texture,
    velocity: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    cascades: readonly THREE.DirectionalLight[],
    sunDirection: THREE.Vector3,
    sunColor: THREE.Color,
    sunIntensity: number,
    fogDensity: number,
    wind: THREE.Vector2,
    time: number,
    blueNoise: THREE.Texture | null,
    noiseSize: number,
    frame: number,
  ): void {
    const u = this.marchUniforms;
    u.uDepth.value = depth;
    (u.uInvView.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.uCameraPos.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    (u.uSunDirection.value as THREE.Vector3).copy(sunDirection);
    // The sun arrives as an irradiance; the march accumulates radiance. Dividing
    // by pi converts between them, so the shafts track the time of day out of the
    // same number the surfaces do instead of needing their own curve.
    (u.uSunColor.value as THREE.Color)
      .copy(sunColor)
      .multiplyScalar(sunIntensity / Math.PI);
    (u.uProjParams.value as THREE.Vector4).set(camera.near, camera.far, 0, 0);
    (u.uInvProjection.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uProjection.value as THREE.Matrix4).copy(camera.projectionMatrix);
    (u.uHalfTexel.value as THREE.Vector2).set(1 / this.march.width, 1 / this.march.height);
    (u.uWind.value as THREE.Vector2).copy(wind);
    u.uTime.value = time;
    u.uBlueNoise.value = blueNoise;
    (u.uNoiseParams.value as THREE.Vector4).set(
      1 / Math.max(1, noiseSize),
      frame % 64,
      blueNoise ? 1 : 0,
      (frame * 0.618033988749895) % 1,
    );

    const shadow0 = cascades[0]?.shadow;
    const shadow1 = cascades[Math.min(1, cascades.length - 1)]?.shadow;
    const map0 = shadow0?.map?.depthTexture ?? null;
    const map1 = shadow1?.map?.depthTexture ?? null;
    u.uCascade0.value = map0;
    u.uCascade1.value = map1 ?? map0;
    if (shadow0) (u.uCascadeMatrix0.value as THREE.Matrix4).copy(shadow0.matrix);
    if (shadow1) (u.uCascadeMatrix1.value as THREE.Matrix4).copy(shadow1.matrix);
    (u.uParams.value as THREE.Vector4).set(1.0, 0.74, map0 ? 1 : 0, 0.03);
    (u.uFog.value as THREE.Vector4).set(fogDensity, 0.06, 0, Math.min(camera.far, 130));

    blitter.blit(renderer, this.marchMaterial, this.march);

    const t = this.temporalUniforms;
    t.uCurrent.value = this.march.texture;
    t.uHistory.value = this.history.texture;
    t.uVelocity.value = velocity;
    t.uHasHistory.value = this.hasHistory ? 1 : 0;
    blitter.blit(renderer, this.temporalMaterial, this.output);

    // Ping-pong: this frame's resolve becomes next frame's history.
    const tmp = this.history;
    this.history = this.output;
    this.output = tmp;
    this.hasHistory = true;
  }

  /** The resolved buffer produced by the last {@link render}. */
  get texture(): THREE.Texture {
    return this.history.texture;
  }

  setSize(width: number, height: number): void {
    const w = Math.max(1, width >> 1);
    const h = Math.max(1, height >> 1);
    this.march.setSize(w, h);
    this.history.setSize(w, h);
    this.output.setSize(w, h);
    this.hasHistory = false;
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.march, this.history, this.output];
  }

  dispose(): void {
    this.march.dispose();
    this.history.dispose();
    this.output.dispose();
    this.marchMaterial.dispose();
    this.temporalMaterial.dispose();
  }
}
