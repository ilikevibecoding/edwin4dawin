import * as THREE from 'three';
import { Effect } from 'postprocessing';

/**
 * Final HDR -> display transform and creative grade, fused into one shader.
 *
 * Order matters and mirrors a film pipeline:
 *   exposure -> bloom-safe HDR -> tonemap (AgX or ACES) -> log-space grade
 *   -> split tone -> saturation/contrast -> vignette -> grain -> dither
 *
 * AgX is the default because it desaturates highlights gracefully instead of
 * clipping them to white, which is what keeps muzzle flashes and explosions
 * from turning into flat blobs.
 */
const fragment = /* glsl */ `
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform vec3  uShadowTint;
uniform vec3  uHighlightTint;
uniform float uSplitBalance;
uniform float uVignette;
uniform float uVignetteRoundness;
uniform float uVignetteSmooth;
uniform float uGrain;
uniform float uGrainSize;
uniform float uTime;
uniform float uTemperature;
uniform float uTintGM;
uniform float uHealthPulse;
uniform vec3  uDamageTint;
uniform float uFlashWhite;
uniform float uToneMode;

const mat3 AGX_IN = mat3(
  0.8566271533, 0.1373190613, 0.1118982129,
  0.0951212405, 0.7612419251, 0.0767994186,
  0.0482516061, 0.1014390136, 0.8113023684
);
const mat3 AGX_OUT = mat3(
   1.1271005818, -0.1413297163, -0.1413297163,
  -0.1106066791,  1.1578237022, -0.1106066791,
  -0.0164939043, -0.0164939043,  1.2519364065
);

vec3 agxDefaultContrastApprox(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return  15.5     * x4 * x2
        - 40.14    * x4 * x
        + 31.96    * x4
        -  6.868   * x2 * x
        +  0.4298  * x2
        +  0.1191  * x
        -  0.00232;
}

vec3 tonemapAgX(vec3 color) {
  const float minEv = -12.47393;
  const float maxEv = 4.026069;
  color = AGX_IN * color;
  color = clamp(log2(max(color, 1e-10)), minEv, maxEv);
  color = (color - minEv) / (maxEv - minEv);
  color = agxDefaultContrastApprox(color);
  color = AGX_OUT * color;
  return clamp(color, 0.0, 1.0);
}

// Narkowicz ACES fit - punchier, higher contrast than AgX.
vec3 tonemapACES(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// White balance in a rough LMS space.
vec3 whiteBalance(vec3 c, float temp, float tint) {
  float t1 = temp * 0.1;
  float t2 = tint * 0.1;
  vec3 lms = vec3(
    dot(c, vec3(0.390405, 0.549941, 0.008902)),
    dot(c, vec3(0.070841, 0.963172, 0.001364)),
    dot(c, vec3(0.023100, 0.128021, 0.936245))
  );
  lms *= vec3(1.0 + t1, 1.0 + t2 * 0.5, 1.0 - t1);
  return vec3(
    dot(lms, vec3( 2.858430, -1.628060,  0.024064)),
    dot(lms, vec3(-0.210371,  1.158380, -0.000324)),
    dot(lms, vec3(-0.041800, -0.118250,  1.068668))
  );
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Interleaved gradient noise: cheap, temporally stable ordered dither.
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = max(inputColor.rgb, 0.0);

  c *= uExposure;
  c = max(whiteBalance(c, uTemperature, uTintGM), 0.0);

  // Screen-wide white flash (flashbangs, nearby explosions) added pre-tonemap
  // so it blooms and rolls off naturally instead of clipping.
  c += vec3(uFlashWhite);

  vec3 mapped = uToneMode < 0.5 ? tonemapAgX(c) : tonemapACES(c);

  // Lift / gamma / gain in display space.
  mapped = clamp(mapped, 0.0, 1.0);
  mapped = uLift + mapped * (uGain - uLift);
  mapped = pow(max(mapped, 1e-5), 1.0 / max(uGamma, vec3(1e-3)));

  // Split toning: cool the shadows, warm the highlights.
  float l = luma(mapped);
  float shadowW = 1.0 - smoothstep(0.0, uSplitBalance, l);
  float highW = smoothstep(uSplitBalance, 1.0, l);
  mapped += uShadowTint * shadowW * 0.5;
  mapped += uHighlightTint * highW * 0.5;

  // Contrast about mid-grey, then saturation.
  mapped = (mapped - 0.5) * uContrast + 0.5;
  float gl = luma(mapped);
  mapped = mix(vec3(gl), mapped, uSaturation);

  // Low-health desaturation and red bleed.
  if (uHealthPulse > 0.001) {
    float g = luma(mapped);
    vec3 hurt = mix(vec3(g), mapped, 0.35) * uDamageTint;
    float edge = smoothstep(0.15, 0.95, length(uv - 0.5) * 1.7);
    mapped = mix(mapped, hurt, uHealthPulse * (0.35 + 0.65 * edge));
  }

  // Natural vignette with adjustable roundness.
  vec2 vd = (uv - 0.5) * vec2(mix(1.0, 1.7778, 1.0 - uVignetteRoundness), 1.0);
  float vig = 1.0 - smoothstep(uVignetteSmooth, 1.0, length(vd) * 1.414 * uVignette);
  mapped *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0) > 0.0 ? 1.0 : 0.0);

  // Film grain: scaled by 1-luma so highlights stay clean, like real stock.
  if (uGrain > 0.0001) {
    vec2 gp = uv * uGrainSize;
    float n = hash12(gp + fract(uTime) * 137.31) - 0.5;
    float response = mix(1.0, 0.25, smoothstep(0.4, 1.0, luma(mapped)));
    mapped += n * uGrain * response;
  }

  // 8-bit dither to kill banding in dark gradients.
  mapped += (ign(gl_FragCoord.xy) - 0.5) / 255.0;

  outputColor = vec4(clamp(mapped, 0.0, 1.0), inputColor.a);
}
`;

export type ToneMode = 'agx' | 'aces';

export interface GradeParams {
  exposure: number;
  contrast: number;
  saturation: number;
  lift: THREE.Color;
  gamma: THREE.Color;
  gain: THREE.Color;
  shadowTint: THREE.Color;
  highlightTint: THREE.Color;
  splitBalance: number;
  vignette: number;
  grain: number;
  temperature: number;
  tint: number;
  tone: ToneMode;
}

export class FilmGradeEffect extends Effect {
  constructor(params: Partial<GradeParams> = {}) {
    super('FilmGradeEffect', fragment, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uExposure', new THREE.Uniform(params.exposure ?? 1.0)],
        ['uContrast', new THREE.Uniform(params.contrast ?? 1.045)],
        ['uSaturation', new THREE.Uniform(params.saturation ?? 1.06)],
        ['uLift', new THREE.Uniform(params.lift?.clone() ?? new THREE.Color(0.016, 0.019, 0.028))],
        ['uGamma', new THREE.Uniform(params.gamma?.clone() ?? new THREE.Color(1.0, 1.0, 1.0))],
        ['uGain', new THREE.Uniform(params.gain?.clone() ?? new THREE.Color(1.0, 0.995, 0.985))],
        [
          'uShadowTint',
          new THREE.Uniform(params.shadowTint?.clone() ?? new THREE.Color(-0.012, 0.002, 0.03)),
        ],
        [
          'uHighlightTint',
          new THREE.Uniform(params.highlightTint?.clone() ?? new THREE.Color(0.028, 0.012, -0.014)),
        ],
        ['uSplitBalance', new THREE.Uniform(params.splitBalance ?? 0.5)],
        ['uVignette', new THREE.Uniform(params.vignette ?? 0.62)],
        ['uVignetteRoundness', new THREE.Uniform(0.7)],
        ['uVignetteSmooth', new THREE.Uniform(0.35)],
        ['uGrain', new THREE.Uniform(params.grain ?? 0.028)],
        ['uGrainSize', new THREE.Uniform(1100)],
        ['uTime', new THREE.Uniform(0)],
        ['uTemperature', new THREE.Uniform(params.temperature ?? 0.06)],
        ['uTintGM', new THREE.Uniform(params.tint ?? -0.02)],
        ['uHealthPulse', new THREE.Uniform(0)],
        ['uDamageTint', new THREE.Uniform(new THREE.Color(1.0, 0.32, 0.28))],
        ['uFlashWhite', new THREE.Uniform(0)],
        ['uToneMode', new THREE.Uniform(params.tone === 'agx' ? 0 : 1)],
      ]),
    });
  }

  private u(name: string) {
    return this.uniforms.get(name)!;
  }

  set exposure(v: number) {
    this.u('uExposure').value = v;
  }
  get exposure(): number {
    return this.u('uExposure').value as number;
  }

  set grain(v: number) {
    this.u('uGrain').value = v;
  }
  set vignette(v: number) {
    this.u('uVignette').value = v;
  }
  set contrast(v: number) {
    this.u('uContrast').value = v;
  }
  set saturation(v: number) {
    this.u('uSaturation').value = v;
  }
  set healthPulse(v: number) {
    this.u('uHealthPulse').value = v;
  }
  set flashWhite(v: number) {
    this.u('uFlashWhite').value = v;
  }
  get flashWhite(): number {
    return this.u('uFlashWhite').value as number;
  }
  set toneMode(m: ToneMode) {
    this.u('uToneMode').value = m === 'aces' ? 1 : 0;
  }

  applyPreset(p: Partial<GradeParams>) {
    if (p.exposure !== undefined) this.u('uExposure').value = p.exposure;
    if (p.contrast !== undefined) this.u('uContrast').value = p.contrast;
    if (p.saturation !== undefined) this.u('uSaturation').value = p.saturation;
    if (p.lift) (this.u('uLift').value as THREE.Color).copy(p.lift);
    if (p.gamma) (this.u('uGamma').value as THREE.Color).copy(p.gamma);
    if (p.gain) (this.u('uGain').value as THREE.Color).copy(p.gain);
    if (p.shadowTint) (this.u('uShadowTint').value as THREE.Color).copy(p.shadowTint);
    if (p.highlightTint) (this.u('uHighlightTint').value as THREE.Color).copy(p.highlightTint);
    if (p.splitBalance !== undefined) this.u('uSplitBalance').value = p.splitBalance;
    if (p.vignette !== undefined) this.u('uVignette').value = p.vignette;
    if (p.grain !== undefined) this.u('uGrain').value = p.grain;
    if (p.temperature !== undefined) this.u('uTemperature').value = p.temperature;
    if (p.tint !== undefined) this.u('uTintGM').value = p.tint;
    if (p.tone) this.toneMode = p.tone;
  }

  update(_r: THREE.WebGLRenderer, _i: THREE.WebGLRenderTarget, dt: number) {
    this.u('uTime').value = ((this.u('uTime').value as number) + dt) % 1000;
    // Flash decays on its own so callers only need to poke it once.
    const f = this.u('uFlashWhite').value as number;
    if (f > 0.0001) this.u('uFlashWhite').value = Math.max(0, f - f * Math.min(1, dt * 3.2) - dt * 0.05);
  }
}
