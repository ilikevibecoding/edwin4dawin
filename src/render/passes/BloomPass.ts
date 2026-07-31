import * as THREE from 'three';
import { Blitter, createRenderTarget } from '../Blitter';
import { GLSL_COLOR, GLSL_COMMON } from '../ShaderLib';

/**
 * Energy-conserving bloom: soft-knee bright pass, a six-mip progressive
 * downsample with the 13-tap Call of Duty filter, then a tent-filtered
 * upsample that adds each mip back into the one above it.
 *
 * Every mip is half the size of the previous one, so the whole chain costs about
 * a third of one half-resolution blit. The result is a wide, low-intensity glow
 * rather than the blown-out white halo a single big gaussian gives.
 */

const MAX_MIPS = 6;

/**
 * Ceiling on a single exposed sample entering the chain.
 *
 * It exists to stop one stray specular pixel from becoming a blob, and at the
 * few dozen it started at it did that by also throwing away almost all of the
 * sun: the disc sits three orders of magnitude above middle grey, so clamping it
 * to fifty removes 97% of the only source in the frame whose glare the eye
 * actually expects to see. High enough to keep the sun, the prefilter and the
 * energy-preserving downsample chain are what handle the fireflies — a lone
 * bright texel is spread across a mip and arrives back a thousand times dimmer,
 * whereas the sun covers thousands of texels and arrives back as a halo.
 */
const BRIGHT_CLAMP = 900;

const BRIGHT_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uExposure;   // 1x1, .x is the adapted linear exposure
uniform vec4 uParams;    // x: threshold, y: knee, z: clamp, w: exposure override (<0 auto)
uniform vec2 uTexel;

${GLSL_COMMON}
${GLSL_COLOR}

void main() {
  // 4-tap box prefilter halves the chance of a single bright pixel becoming a
  // flickering firefly once the chain starts downsampling.
  vec3 c = texture2D( uSource, vUv + uTexel * vec2( -0.5, -0.5 ) ).rgb;
  c += texture2D( uSource, vUv + uTexel * vec2( 0.5, -0.5 ) ).rgb;
  c += texture2D( uSource, vUv + uTexel * vec2( -0.5, 0.5 ) ).rgb;
  c += texture2D( uSource, vUv + uTexel * vec2( 0.5, 0.5 ) ).rgb;
  c *= 0.25;

  // The threshold has to be relative to whatever the auto-exposure has adapted
  // to, not an absolute radiance. A fixed cutoff means every sunlit surface
  // blooms outdoors and nothing blooms indoors, and it makes the whole look
  // change the moment the sky model is retuned.
  float exposure = uParams.w > 0.0 ? uParams.w : texture2D( uExposure, vec2( 0.5 ) ).x;
  exposure = max( exposure, 1e-3 );
  vec3 exposed = min( c * exposure, vec3( uParams.z ) );

  float brightness = max( exposed.r, max( exposed.g, exposed.b ) );
  float knee = uParams.y;
  float soft = clamp( brightness - uParams.x + knee, 0.0, 2.0 * knee );
  soft = soft * soft / ( 4.0 * knee + 1e-5 );
  float contribution = max( soft, brightness - uParams.x ) / max( brightness, 1e-5 );

  // Back to scene-referred radiance: the composite mixes bloom in before it
  // applies exposure, so the chain has to stay in the source's space.
  gl_FragColor = vec4( exposed * ( contribution / exposure ), 1.0 );
}
`;

const DOWNSAMPLE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;      // texel size of the *source*

${GLSL_COMMON}

void main() {
  vec2 t = uTexel;

  vec3 a = texture2D( uSource, vUv + vec2( -2.0, 2.0 ) * t ).rgb;
  vec3 b = texture2D( uSource, vUv + vec2( 0.0, 2.0 ) * t ).rgb;
  vec3 c = texture2D( uSource, vUv + vec2( 2.0, 2.0 ) * t ).rgb;
  vec3 d = texture2D( uSource, vUv + vec2( -2.0, 0.0 ) * t ).rgb;
  vec3 e = texture2D( uSource, vUv ).rgb;
  vec3 f = texture2D( uSource, vUv + vec2( 2.0, 0.0 ) * t ).rgb;
  vec3 g = texture2D( uSource, vUv + vec2( -2.0, -2.0 ) * t ).rgb;
  vec3 h = texture2D( uSource, vUv + vec2( 0.0, -2.0 ) * t ).rgb;
  vec3 i = texture2D( uSource, vUv + vec2( 2.0, -2.0 ) * t ).rgb;
  vec3 j = texture2D( uSource, vUv + vec2( -1.0, 1.0 ) * t ).rgb;
  vec3 k = texture2D( uSource, vUv + vec2( 1.0, 1.0 ) * t ).rgb;
  vec3 l = texture2D( uSource, vUv + vec2( -1.0, -1.0 ) * t ).rgb;
  vec3 m = texture2D( uSource, vUv + vec2( 1.0, -1.0 ) * t ).rgb;

  vec3 result = e * 0.125;
  result += ( a + c + g + i ) * 0.03125;
  result += ( b + d + f + h ) * 0.0625;
  result += ( j + k + l + m ) * 0.125;

  gl_FragColor = vec4( result, 1.0 );
}
`;

const UPSAMPLE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;      // texel size of the *source* (smaller mip)
uniform float uScatter;

${GLSL_COMMON}

void main() {
  vec2 t = uTexel;
  vec3 result = texture2D( uSource, vUv + vec2( -1.0, 1.0 ) * t ).rgb * 1.0;
  result += texture2D( uSource, vUv + vec2( 0.0, 1.0 ) * t ).rgb * 2.0;
  result += texture2D( uSource, vUv + vec2( 1.0, 1.0 ) * t ).rgb * 1.0;
  result += texture2D( uSource, vUv + vec2( -1.0, 0.0 ) * t ).rgb * 2.0;
  result += texture2D( uSource, vUv ).rgb * 4.0;
  result += texture2D( uSource, vUv + vec2( 1.0, 0.0 ) * t ).rgb * 2.0;
  result += texture2D( uSource, vUv + vec2( -1.0, -1.0 ) * t ).rgb * 1.0;
  result += texture2D( uSource, vUv + vec2( 0.0, -1.0 ) * t ).rgb * 2.0;
  result += texture2D( uSource, vUv + vec2( 1.0, -1.0 ) * t ).rgb * 1.0;
  gl_FragColor = vec4( result * ( uScatter / 16.0 ), 1.0 );
}
`;

const STREAK_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uStretch;

${GLSL_COMMON}

/** Horizontal-only gaussian: the classic anamorphic squeeze. */
void main() {
  vec3 sum = texture2D( uSource, vUv ).rgb * 0.227027;
  const float w1 = 0.1945946;
  const float w2 = 0.1216216;
  const float w3 = 0.054054;
  const float w4 = 0.016216;
  float s = uTexel.x * uStretch;
  sum += ( texture2D( uSource, vUv + vec2( s, 0.0 ) ).rgb + texture2D( uSource, vUv - vec2( s, 0.0 ) ).rgb ) * w1;
  sum += ( texture2D( uSource, vUv + vec2( s * 2.0, 0.0 ) ).rgb + texture2D( uSource, vUv - vec2( s * 2.0, 0.0 ) ).rgb ) * w2;
  sum += ( texture2D( uSource, vUv + vec2( s * 3.0, 0.0 ) ).rgb + texture2D( uSource, vUv - vec2( s * 3.0, 0.0 ) ).rgb ) * w3;
  sum += ( texture2D( uSource, vUv + vec2( s * 4.0, 0.0 ) ).rgb + texture2D( uSource, vUv - vec2( s * 4.0, 0.0 ) ).rgb ) * w4;
  gl_FragColor = vec4( sum, 1.0 );
}
`;

export class BloomPass {
  private mips: THREE.WebGLRenderTarget[] = [];
  private streakA: THREE.WebGLRenderTarget;
  private streakB: THREE.WebGLRenderTarget;

  private readonly brightMaterial: THREE.ShaderMaterial;
  private readonly downMaterial: THREE.ShaderMaterial;
  private readonly upMaterial: THREE.ShaderMaterial;
  private readonly streakMaterial: THREE.ShaderMaterial;

  private readonly brightUniforms: Record<string, THREE.IUniform>;
  private readonly downUniforms: Record<string, THREE.IUniform>;
  private readonly upUniforms: Record<string, THREE.IUniform>;
  private readonly streakUniforms: Record<string, THREE.IUniform>;

  private mipCount = MAX_MIPS;
  private wantedMips = MAX_MIPS;
  private sourceWidth = 1;
  private sourceHeight = 1;

  constructor(width: number, height: number, mips = MAX_MIPS) {
    this.wantedMips = Math.max(2, Math.min(MAX_MIPS, mips));
    this.brightUniforms = {
      uSource: { value: null },
      uExposure: { value: null },
      uParams: { value: new THREE.Vector4(1.05, 0.55, BRIGHT_CLAMP, -1) },
      uTexel: { value: new THREE.Vector2() },
    };
    this.downUniforms = { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } };
    this.upUniforms = {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uScatter: { value: 1.0 },
    };
    this.streakUniforms = {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uStretch: { value: 8 },
    };

    this.brightMaterial = Blitter.material(BRIGHT_FRAGMENT, this.brightUniforms);
    this.downMaterial = Blitter.material(DOWNSAMPLE_FRAGMENT, this.downUniforms);
    this.upMaterial = Blitter.material(UPSAMPLE_FRAGMENT, this.upUniforms);
    this.upMaterial.blending = THREE.AdditiveBlending;
    this.streakMaterial = Blitter.material(STREAK_FRAGMENT, this.streakUniforms);

    this.streakA = createRenderTarget(1, 1, { name: 'bloomStreakA' });
    this.streakB = createRenderTarget(1, 1, { name: 'bloomStreakB' });
    this.setSize(width, height);
  }

  /**
   * Each mip costs two blits (one down, one up), so the chain length is the whole
   * cost of bloom. Trimming it shortens the glow's reach rather than dimming it.
   */
  setQuality(mips: number): void {
    const next = Math.max(2, Math.min(MAX_MIPS, mips));
    if (next === this.wantedMips) return;
    this.wantedMips = next;
    this.setSize(this.sourceWidth, this.sourceHeight);
  }

  setSize(width: number, height: number): void {
    this.sourceWidth = width;
    this.sourceHeight = height;
    let w = Math.max(1, width >> 1);
    let h = Math.max(1, height >> 1);
    const wanted: Array<[number, number]> = [];
    for (let i = 0; i < this.wantedMips; i++) {
      wanted.push([w, h]);
      if (w <= 2 || h <= 2) break;
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }
    this.mipCount = wanted.length;

    while (this.mips.length < wanted.length) {
      this.mips.push(createRenderTarget(1, 1, { name: `bloomMip${this.mips.length}` }));
    }
    for (let i = 0; i < wanted.length; i++) {
      this.mips[i].setSize(wanted[i][0], wanted[i][1]);
    }
    // Extra targets from a larger previous resolution stay allocated but unused;
    // shrink them to 1x1 so they cost nothing.
    for (let i = wanted.length; i < this.mips.length; i++) this.mips[i].setSize(1, 1);

    const streakIndex = Math.min(2, this.mipCount - 1);
    this.streakA.setSize(this.mips[streakIndex].width, this.mips[streakIndex].height);
    this.streakB.setSize(this.mips[streakIndex].width, this.mips[streakIndex].height);
  }

  render(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    source: THREE.Texture,
    exposure: THREE.Texture,
    sourceWidth: number,
    sourceHeight: number,
    threshold: number,
    scatter: number,
    withStreak: boolean,
    manualExposure: number,
  ): void {
    const bu = this.brightUniforms;
    bu.uSource.value = source;
    bu.uExposure.value = exposure;
    (bu.uParams.value as THREE.Vector4).set(
      threshold,
      threshold * 0.5 + 0.02,
      BRIGHT_CLAMP,
      manualExposure,
    );
    (bu.uTexel.value as THREE.Vector2).set(1 / sourceWidth, 1 / sourceHeight);
    blitter.blit(renderer, this.brightMaterial, this.mips[0]);

    for (let i = 1; i < this.mipCount; i++) {
      const src = this.mips[i - 1];
      this.downUniforms.uSource.value = src.texture;
      (this.downUniforms.uTexel.value as THREE.Vector2).set(1 / src.width, 1 / src.height);
      blitter.blit(renderer, this.downMaterial, this.mips[i]);
    }

    this.upUniforms.uScatter.value = scatter;
    for (let i = this.mipCount - 1; i > 0; i--) {
      const src = this.mips[i];
      this.upUniforms.uSource.value = src.texture;
      (this.upUniforms.uTexel.value as THREE.Vector2).set(1 / src.width, 1 / src.height);
      // Additive: each mip is folded into the next larger one in place.
      blitter.blit(renderer, this.upMaterial, this.mips[i - 1]);
    }

    if (withStreak) {
      const streakIndex = Math.min(2, this.mipCount - 1);
      const src = this.mips[streakIndex];
      this.streakUniforms.uSource.value = src.texture;
      (this.streakUniforms.uTexel.value as THREE.Vector2).set(1 / src.width, 1 / src.height);
      this.streakUniforms.uStretch.value = 6;
      blitter.blit(renderer, this.streakMaterial, this.streakA);

      this.streakUniforms.uSource.value = this.streakA.texture;
      (this.streakUniforms.uTexel.value as THREE.Vector2).set(
        1 / this.streakA.width,
        1 / this.streakA.height,
      );
      this.streakUniforms.uStretch.value = 22;
      blitter.blit(renderer, this.streakMaterial, this.streakB);
    }
  }

  /** Half-resolution bloom, with every mip already folded in. */
  get texture(): THREE.Texture {
    return this.mips[0].texture;
  }

  /** A coarse mip, used by the composite pass to build lens ghosts and halos. */
  get ghostTexture(): THREE.Texture {
    return this.mips[Math.min(3, this.mipCount - 1)].texture;
  }

  get streakTexture(): THREE.Texture {
    return this.streakB.texture;
  }

  get targets(): readonly THREE.WebGLRenderTarget[] {
    return [...this.mips, this.streakA, this.streakB];
  }

  dispose(): void {
    for (const m of this.mips) m.dispose();
    this.mips.length = 0;
    this.streakA.dispose();
    this.streakB.dispose();
    this.brightMaterial.dispose();
    this.downMaterial.dispose();
    this.upMaterial.dispose();
    this.streakMaterial.dispose();
  }
}
