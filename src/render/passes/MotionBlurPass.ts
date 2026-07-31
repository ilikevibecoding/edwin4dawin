import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_BLUENOISE, GLSL_COMMON, GLSL_NOISE } from '../ShaderLib';

/**
 * Velocity-buffer motion blur with tile-max / neighbour-max dilation.
 *
 * Dilation is what lets a fast object smear *outside* its own silhouette; a
 * naive per-pixel gather can only blur inwards and produces the hard-edged
 * "sliding decal" look. The viewmodel is excluded via the coverage mask the
 * resolve pass wrote into alpha, so the weapon stays readable while the world
 * streaks past it.
 */

const TILE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;      // source texel size

${GLSL_COMMON}

void main() {
  vec2 best = vec2( 0.0 );
  float bestLen = 0.0;
  for ( int y = 0; y < 4; y ++ ) {
    for ( int x = 0; x < 4; x ++ ) {
      vec2 o = ( vec2( float( x ), float( y ) ) - 1.5 ) * uTexel;
      vec2 v = texture2D( uSource, vUv + o ).xy;
      float len = dot( v, v );
      if ( len > bestLen ) {
        bestLen = len;
        best = v;
      }
    }
  }
  gl_FragColor = vec4( best, 0.0, 1.0 );
}
`;

const NEIGHBOUR_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;

${GLSL_COMMON}

void main() {
  vec2 best = vec2( 0.0 );
  float bestLen = 0.0;
  for ( int y = -1; y <= 1; y ++ ) {
    for ( int x = -1; x <= 1; x ++ ) {
      vec2 v = texture2D( uSource, vUv + vec2( float( x ), float( y ) ) * uTexel ).xy;
      float len = dot( v, v );
      if ( len > bestLen ) {
        bestLen = len;
        best = v;
      }
    }
  }
  gl_FragColor = vec4( best, 0.0, 1.0 );
}
`;

const BLUR_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uVelocity;
uniform sampler2D uTileMax;
uniform vec2 uTexel;
uniform vec4 uParams;      // x: strength, y: max radius px, z: viewmodel damp, w: unused

${GLSL_COMMON}
${GLSL_NOISE}
${GLSL_BLUENOISE}

void main() {
  vec4 center = texture2D( uSource, vUv );
  vec2 tileVelocity = texture2D( uTileMax, vUv ).xy;

  float pixels = length( tileVelocity / uTexel );
  if ( pixels < 1.25 ) {
    gl_FragColor = center;
    return;
  }

  // The gun should not smear even while the world does.
  float damp = mix( 1.0, uParams.z, saturate( center.a ) );
  vec2 dir = tileVelocity * uParams.x * damp;
  float maxLen = uParams.y * length( uTexel );
  float len = length( dir );
  if ( len > maxLen ) dir *= maxLen / len;

  vec2 pixel = vUv / uTexel;
  float jitter = obBlueNoise1( pixel ) - 0.5;

  vec3 sum = center.rgb;
  float weight = 1.0;
  vec2 centerVelocity = texture2D( uVelocity, vUv ).xy;
  float centerLen = length( centerVelocity ) + 1e-6;

  for ( int i = 1; i <= MB_SAMPLES; i ++ ) {
    float t = ( float( i ) + jitter ) / float( MB_SAMPLES + 1 ) - 0.5;
    vec2 offset = dir * t;

    for ( int s = 0; s < 2; s ++ ) {
      vec2 uv = vUv + ( s == 0 ? offset : -offset );
      if ( any( lessThan( uv, vec2( 0.0 ) ) ) || any( greaterThan( uv, vec2( 1.0 ) ) ) ) continue;
      vec4 tap = texture2D( uSource, uv );
      vec2 tapVelocity = texture2D( uVelocity, uv ).xy;
      // A tap contributes when either it is moving along the blur direction or
      // the centre pixel is; that is the McGuire foreground/background rule in
      // its cheapest useful form.
      float alignment = saturate( dot( normalize( tapVelocity + 1e-6 ), dir / max( length( dir ), 1e-6 ) ) );
      float tapWeight = max( alignment, saturate( centerLen / ( length( tapVelocity ) + 1e-6 ) ) );
      tapWeight *= 1.0 - abs( t ) * 0.65;
      tapWeight *= mix( 1.0, uParams.z, saturate( tap.a ) );
      sum += tap.rgb * tapWeight;
      weight += tapWeight;
    }
  }

  gl_FragColor = vec4( sum / weight, center.a );
}
`;

export class MotionBlurPass {
  output: THREE.WebGLRenderTarget;
  private tileA: THREE.WebGLRenderTarget;
  private tileB: THREE.WebGLRenderTarget;
  private tileC: THREE.WebGLRenderTarget;

  private readonly tileMaterial: THREE.ShaderMaterial;
  private readonly neighbourMaterial: THREE.ShaderMaterial;
  private readonly blurMaterial: THREE.ShaderMaterial;
  private readonly tileUniforms: Record<string, THREE.IUniform>;
  private readonly neighbourUniforms: Record<string, THREE.IUniform>;
  private readonly blurUniforms: Record<string, THREE.IUniform>;
  private samples: number;

  constructor(width: number, height: number, samples: number) {
    this.samples = Math.max(2, samples >> 1);
    this.output = createRenderTarget(width, height, { name: 'motionBlur' });
    this.tileA = createRenderTarget(1, 1, { name: 'mbTile4' });
    this.tileB = createRenderTarget(1, 1, { name: 'mbTile16' });
    this.tileC = createRenderTarget(1, 1, { name: 'mbTileMax' });

    this.tileUniforms = { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } };
    this.neighbourUniforms = { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } };
    this.blurUniforms = {
      uSource: { value: null },
      uVelocity: { value: null },
      uTileMax: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uParams: { value: new THREE.Vector4(1, 64, 0.22, 0) },
      uBlueNoise: { value: null },
      uNoiseParams: { value: new THREE.Vector4(1 / 64, 0, 0, 0) },
    };

    this.tileMaterial = Blitter.material(TILE_FRAGMENT, this.tileUniforms);
    this.neighbourMaterial = Blitter.material(NEIGHBOUR_FRAGMENT, this.neighbourUniforms);
    this.blurMaterial = Blitter.material(BLUR_FRAGMENT, this.blurUniforms, {
      MB_SAMPLES: this.samples,
    });
    this.setSize(width, height);
  }

  setQuality(samples: number): void {
    this.samples = Math.max(2, samples >> 1);
    this.blurMaterial.defines = { MB_SAMPLES: this.samples };
    this.blurMaterial.needsUpdate = true;
  }

  setSize(width: number, height: number): void {
    this.output.setSize(width, height);
    this.tileA.setSize(Math.max(1, width >> 2), Math.max(1, height >> 2));
    this.tileB.setSize(Math.max(1, width >> 4), Math.max(1, height >> 4));
    this.tileC.setSize(Math.max(1, width >> 4), Math.max(1, height >> 4));
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    source: THREE.Texture,
    velocity: THREE.Texture,
    width: number,
    height: number,
    strength: number,
    blueNoise: THREE.Texture | null,
    noiseSize: number,
    frame: number,
  ): THREE.Texture {
    this.tileUniforms.uSource.value = velocity;
    (this.tileUniforms.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    blitter.blit(renderer, this.tileMaterial, this.tileA);

    this.tileUniforms.uSource.value = this.tileA.texture;
    (this.tileUniforms.uTexel.value as THREE.Vector2).set(1 / this.tileA.width, 1 / this.tileA.height);
    blitter.blit(renderer, this.tileMaterial, this.tileB);

    this.neighbourUniforms.uSource.value = this.tileB.texture;
    (this.neighbourUniforms.uTexel.value as THREE.Vector2).set(
      1 / this.tileB.width,
      1 / this.tileB.height,
    );
    blitter.blit(renderer, this.neighbourMaterial, this.tileC);

    const u = this.blurUniforms;
    u.uSource.value = source;
    u.uVelocity.value = velocity;
    u.uTileMax.value = this.tileC.texture;
    (u.uTexel.value as THREE.Vector2).set(1 / width, 1 / height);
    (u.uParams.value as THREE.Vector4).set(strength, 72, 0.2, 0);
    u.uBlueNoise.value = blueNoise;
    (u.uNoiseParams.value as THREE.Vector4).set(
      1 / Math.max(1, noiseSize),
      frame % 64,
      blueNoise ? 1 : 0,
      (frame * 0.618033988749895) % 1,
    );
    blitter.blit(renderer, this.blurMaterial, this.output);
    return this.output.texture;
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [this.output, this.tileA, this.tileB, this.tileC];
  }

  dispose(): void {
    this.output.dispose();
    this.tileA.dispose();
    this.tileB.dispose();
    this.tileC.dispose();
    this.tileMaterial.dispose();
    this.neighbourMaterial.dispose();
    this.blurMaterial.dispose();
  }
}
