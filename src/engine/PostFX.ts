/**
 * The cinematic post-processing chain.
 *
 * Inside a `postprocessing` Effect fragment shader the library provides:
 * inputBuffer, depthBuffer, resolution, texelSize, cameraNear, cameraFar,
 * aspect, time, vUv, and the helpers readDepth(uv) / getViewZ(depth).
 *
 * Note: three compiles these as GLSL ES 1.00, so `inverse()` is unavailable —
 * matrices that would need inverting are passed in as uniforms instead.
 */
import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  Effect,
  EffectAttribute,
  EffectComposer,
  EffectPass,
  KernelSize,
  NoiseEffect,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

// ---------------------------------------------------------------------------
// Film grade
// ---------------------------------------------------------------------------

const GRADE_FRAG = /* glsl */ `
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float uSaturation;
uniform float uContrast;
uniform float uTemperature;
uniform float uBleach;
uniform float uVignette;
uniform float uFade;
uniform vec3 uFadeColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = max(inputColor.rgb, vec3(0.0));
  c.r *= 1.0 + uTemperature * 0.16;
  c.b *= 1.0 - uTemperature * 0.16;
  c = c * uGain + uLift * (1.0 - c);
  c = pow(max(c, vec3(0.0)), 1.0 / max(uGamma, vec3(0.05)));
  c = max((c - 0.5) * uContrast + 0.5, vec3(0.0));

  // Split toning: cool shadows, warm highlights
  float sl = clamp(luma(c), 0.0, 1.0);
  c += uShadowTint * (1.0 - smoothstep(0.0, 0.55, sl)) * 0.16;
  c += uHighlightTint * smoothstep(0.45, 1.0, sl) * 0.14;

  if (uBleach > 0.001) {
    float lb = luma(c);
    vec3 blend = mix(vec3(lb), c, 0.35);
    c = mix(c, 1.0 - (1.0 - c) * (1.0 - blend), uBleach);
  }
  c = mix(vec3(luma(c)), c, uSaturation);

  if (uVignette > 0.001) {
    vec2 d = uv - 0.5;
    d.x *= aspect * 0.85;
    c *= 1.0 - uVignette * smoothstep(0.28, 0.78, length(d));
  }
  outputColor = vec4(mix(c, uFadeColor, clamp(uFade, 0.0, 1.0)), inputColor.a);
}
`;

export interface GradePreset {
  lift?: THREE.Vector3;
  gamma?: THREE.Vector3;
  gain?: THREE.Vector3;
  shadowTint?: THREE.Vector3;
  highlightTint?: THREE.Vector3;
  saturation?: number;
  contrast?: number;
  temperature?: number;
  bleach?: number;
  vignette?: number;
}

export class FilmGradeEffect extends Effect {
  constructor() {
    super('FilmGradeEffect', GRADE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uLift', new THREE.Uniform(new THREE.Vector3(0.012, 0.016, 0.03))],
        ['uGamma', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['uGain', new THREE.Uniform(new THREE.Vector3(1.02, 1, 1.02))],
        ['uShadowTint', new THREE.Uniform(new THREE.Vector3(0.05, 0.11, 0.2))],
        ['uHighlightTint', new THREE.Uniform(new THREE.Vector3(0.13, 0.08, 0.02))],
        ['uSaturation', new THREE.Uniform(1.06)],
        ['uContrast', new THREE.Uniform(1.1)],
        ['uTemperature', new THREE.Uniform(0)],
        ['uBleach', new THREE.Uniform(0.06)],
        ['uVignette', new THREE.Uniform(0.42)],
        ['uFade', new THREE.Uniform(0)],
        ['uFadeColor', new THREE.Uniform(new THREE.Vector3(0, 0, 0))],
      ]),
    });
  }

  private u(name: string) {
    return this.uniforms.get(name)!;
  }

  apply(p: GradePreset, blend = 1) {
    const set3 = (name: string, v?: THREE.Vector3) => {
      if (v) (this.u(name).value as THREE.Vector3).lerp(v, blend);
    };
    set3('uLift', p.lift);
    set3('uGamma', p.gamma);
    set3('uGain', p.gain);
    set3('uShadowTint', p.shadowTint);
    set3('uHighlightTint', p.highlightTint);
    const setF = (name: string, v?: number) => {
      if (v !== undefined) this.u(name).value = THREE.MathUtils.lerp(this.u(name).value as number, v, blend);
    };
    setF('uSaturation', p.saturation);
    setF('uContrast', p.contrast);
    setF('uTemperature', p.temperature);
    setF('uBleach', p.bleach);
    setF('uVignette', p.vignette);
  }

  set fade(v: number) {
    this.u('uFade').value = v;
  }
  get fade(): number {
    return this.u('uFade').value as number;
  }
  setFadeColor(c: THREE.Color) {
    (this.u('uFadeColor').value as THREE.Vector3).set(c.r, c.g, c.b);
  }
}

// ---------------------------------------------------------------------------
// Atmosphere: world-space height fog, aerial perspective, light shafts
// ---------------------------------------------------------------------------

const ATMOS_FRAG = /* glsl */ `
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uCamPos;
uniform vec3 uFogColor;
uniform vec3 uFogColorFar;
uniform float uDensity;
uniform float uHeightFalloff;
uniform float uFogBase;
uniform float uNoise;
uniform vec3 uShaftColorA;
uniform vec3 uShaftColorB;
uniform vec3 uShaftPosA;
uniform vec3 uShaftPosB;
uniform float uShaftIntensityA;
uniform float uShaftIntensityB;
uniform float uShaftDecay;

float h13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vn3(vec3 x) {
  vec3 p = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(p), h13(p + vec3(1,0,0)), f.x), mix(h13(p + vec3(0,1,0)), h13(p + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(p + vec3(0,0,1)), h13(p + vec3(1,0,1)), f.x), mix(h13(p + vec3(0,1,1)), h13(p + vec3(1,1,1)), f.x), f.y), f.z);
}
float fog3(vec3 p) {
  float s = 0.0, a = 0.55;
  for (int i = 0; i < 3; i++) { s += a * vn3(p); p = p * 2.13 + vec3(3.1, 1.7, 5.3); a *= 0.5; }
  return s;
}

vec3 worldFromDepth(vec2 uv, float depth) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 view = uInvProj * ndc;
  view /= view.w;
  return (uCamWorld * view).xyz;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  vec3 world = worldFromDepth(uv, depth);
  vec3 toPix = world - uCamPos;
  float dist = length(toPix);

  // Exponential height fog, integrated analytically along the view ray
  float hCam = uCamPos.y - uFogBase;
  float hEnd = world.y - uFogBase;
  float k = uHeightFalloff;
  float fogAmount;
  if (abs(hEnd - hCam) < 0.001) {
    fogAmount = uDensity * dist * exp(-k * max(hCam, 0.0));
  } else {
    float a = exp(-k * max(hCam, 0.0));
    float b = exp(-k * max(hEnd, 0.0));
    fogAmount = uDensity * dist * (a - b) / (k * (hEnd - hCam));
  }
  fogAmount = max(fogAmount, 0.0);

  if (uNoise > 0.001) {
    float n = fog3(world * 0.06 + vec3(time * 0.02, time * 0.01, 0.0));
    fogAmount *= mix(1.0, 0.45 + n * 1.2, uNoise);
  }

  float f = 1.0 - exp(-fogAmount);
  vec3 fogCol = mix(uFogColor, uFogColorFar, clamp(dist / 90.0, 0.0, 1.0));
  float isSky = step(0.9999, depth);
  c = mix(c, fogCol, f * (1.0 - isSky));

  #ifdef SHAFTS
  for (int i = 0; i < 2; i++) {
    vec3 lw = (i == 0) ? uShaftPosA : uShaftPosB;
    float inten = (i == 0) ? uShaftIntensityA : uShaftIntensityB;
    vec3 lcol = (i == 0) ? uShaftColorA : uShaftColorB;
    if (inten < 0.001) continue;
    vec4 lv = uView * vec4(lw, 1.0);
    if (lv.z > -0.1) continue;
    vec4 lc = uProj * lv;
    vec2 luv = (lc.xy / lc.w) * 0.5 + 0.5;
    vec2 delta = luv - uv;
    float len = length(delta);
    if (len > 1.6) continue;
    vec2 stepv = delta / 14.0;
    vec2 p = uv;
    float acc = 0.0;
    float w = 1.0;
    for (int s = 0; s < 14; s++) {
      p += stepv;
      if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) break;
      // Unoccluded where the scene behind this sample is farther than the light
      float z = -getViewZ(readDepth(p));
      acc += step(-lv.z, z + 0.35) * w;
      w *= uShaftDecay;
    }
    acc /= 14.0;
    c += lcol * acc * (1.0 / (1.0 + len * len * 5.0)) * inten;
  }
  #endif

  outputColor = vec4(c, inputColor.a);
}
`;

export interface AtmosphereParams {
  fogColor?: THREE.Color;
  fogColorFar?: THREE.Color;
  density?: number;
  heightFalloff?: number;
  fogBase?: number;
  noise?: number;
}

export class AtmosphereEffect extends Effect {
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera, shafts = true) {
    const defines = new Map<string, string>();
    if (shafts) defines.set('SHAFTS', '1');
    super('AtmosphereEffect', ATMOS_FRAG, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      defines,
      uniforms: new Map<string, THREE.Uniform>([
        ['uInvProj', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['uView', new THREE.Uniform(new THREE.Matrix4())],
        ['uProj', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamPos', new THREE.Uniform(new THREE.Vector3())],
        ['uFogColor', new THREE.Uniform(new THREE.Vector3(0.05, 0.06, 0.09))],
        ['uFogColorFar', new THREE.Uniform(new THREE.Vector3(0.1, 0.09, 0.13))],
        ['uDensity', new THREE.Uniform(0.02)],
        ['uHeightFalloff', new THREE.Uniform(0.12)],
        ['uFogBase', new THREE.Uniform(0)],
        ['uNoise', new THREE.Uniform(0.5)],
        ['uShaftColorA', new THREE.Uniform(new THREE.Vector3(0.5, 0.65, 1))],
        ['uShaftColorB', new THREE.Uniform(new THREE.Vector3(1, 0.5, 0.2))],
        ['uShaftPosA', new THREE.Uniform(new THREE.Vector3(0, 6, 0))],
        ['uShaftPosB', new THREE.Uniform(new THREE.Vector3(0, 6, 0))],
        ['uShaftIntensityA', new THREE.Uniform(0)],
        ['uShaftIntensityB', new THREE.Uniform(0)],
        ['uShaftDecay', new THREE.Uniform(0.93)],
      ]),
    });
    this.camera = camera;
  }

  setCamera(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  apply(p: AtmosphereParams) {
    const v3 = (k: string, c?: THREE.Color) => {
      if (c) (this.uniforms.get(k)!.value as THREE.Vector3).set(c.r, c.g, c.b);
    };
    v3('uFogColor', p.fogColor);
    v3('uFogColorFar', p.fogColorFar);
    if (p.density !== undefined) this.uniforms.get('uDensity')!.value = p.density;
    if (p.heightFalloff !== undefined) this.uniforms.get('uHeightFalloff')!.value = p.heightFalloff;
    if (p.fogBase !== undefined) this.uniforms.get('uFogBase')!.value = p.fogBase;
    if (p.noise !== undefined) this.uniforms.get('uNoise')!.value = p.noise;
  }

  setShaft(index: 0 | 1, position: THREE.Vector3, color: THREE.Color, intensity: number) {
    (this.uniforms.get(index === 0 ? 'uShaftPosA' : 'uShaftPosB')!.value as THREE.Vector3).copy(position);
    (this.uniforms.get(index === 0 ? 'uShaftColorA' : 'uShaftColorB')!.value as THREE.Vector3).set(
      color.r,
      color.g,
      color.b
    );
    this.uniforms.get(index === 0 ? 'uShaftIntensityA' : 'uShaftIntensityB')!.value = intensity;
  }

  update() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    (this.uniforms.get('uInvProj')!.value as THREE.Matrix4).copy(cam.projectionMatrixInverse);
    (this.uniforms.get('uCamWorld')!.value as THREE.Matrix4).copy(cam.matrixWorld);
    (this.uniforms.get('uView')!.value as THREE.Matrix4).copy(cam.matrixWorldInverse);
    (this.uniforms.get('uProj')!.value as THREE.Matrix4).copy(cam.projectionMatrix);
    (this.uniforms.get('uCamPos')!.value as THREE.Vector3).setFromMatrixPosition(cam.matrixWorld);
  }
}

// ---------------------------------------------------------------------------
// Lens rain: droplets and run-off on the camera's front element
// ---------------------------------------------------------------------------

const LENS_RAIN_FRAG = /* glsl */ `
uniform float uIntensity;
uniform float uSpeed;

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 dropLayer(vec2 uv, float t, float scale) {
  vec2 st = uv * scale;
  vec2 id = floor(st);
  vec2 f = fract(st) - 0.5;
  vec3 acc = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cid = id + o;
      float r1 = h21(cid);
      float r2 = h21(cid + 17.3);
      float r3 = h21(cid + 91.7);
      float life = fract(t * (0.25 + r2 * 0.5) + r1);
      vec2 p = f - o - vec2((r3 - 0.5) * 0.5, -(life - 0.5) * 1.6);
      float rad = 0.06 + r1 * 0.13;
      float trail = smoothstep(rad * 3.5, 0.0, abs(p.x) * 3.0) *
                    smoothstep(0.0, 0.5, p.y) * smoothstep(0.6, 0.1, p.y) * 0.35;
      float drop = smoothstep(rad, rad * 0.25, length(vec2(p.x, p.y * 1.25)));
      float a = (drop + trail) * smoothstep(1.0, 0.75, life) * smoothstep(0.0, 0.08, life);
      acc += vec3(normalize(p + 1e-5) * drop * rad * 1.4, a);
    }
  }
  return acc;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uIntensity < 0.001) { outputColor = inputColor; return; }
  vec2 auv = uv;
  auv.x *= aspect;
  float t = time * uSpeed;
  vec3 l1 = dropLayer(auv, t, 7.0);
  vec3 l2 = dropLayer(auv + vec2(3.7, 1.3), t * 1.35, 12.0);
  vec2 refr = (l1.xy * 0.8 + l2.xy * 0.5) * uIntensity;
  float mask = clamp((l1.z + l2.z * 0.7) * uIntensity, 0.0, 1.0);
  vec3 c = texture2D(inputBuffer, clamp(uv - refr * 0.6, vec2(0.001), vec2(0.999))).rgb;
  // Drops act as tiny lenses: slightly brighter, slightly desaturated
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, mix(c, vec3(l), 0.15) * 1.18, mask * 0.8);
  outputColor = vec4(mix(inputColor.rgb, c, clamp(mask * 2.2, 0.0, 1.0)), inputColor.a);
}
`;

export class LensRainEffect extends Effect {
  constructor() {
    super('LensRainEffect', LENS_RAIN_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uIntensity', new THREE.Uniform(0)],
        ['uSpeed', new THREE.Uniform(0.35)],
      ]),
    });
  }
  set intensity(v: number) {
    this.uniforms.get('uIntensity')!.value = v;
  }
  get intensity(): number {
    return this.uniforms.get('uIntensity')!.value as number;
  }
}

// ---------------------------------------------------------------------------
// Scan vision: the android analysis overlay
// ---------------------------------------------------------------------------

const SCAN_FRAG = /* glsl */ `
uniform float uAmount;
uniform float uSweep;
uniform vec3 uTint;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uAmount < 0.001) { outputColor = inputColor; return; }
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));

  // Depth discontinuity outline
  float d0 = readDepth(uv);
  float z0 = -getViewZ(d0);
  vec2 o = texelSize * 1.4;
  float zl = -getViewZ(readDepth(uv - vec2(o.x, 0.0)));
  float zr = -getViewZ(readDepth(uv + vec2(o.x, 0.0)));
  float zu = -getViewZ(readDepth(uv - vec2(0.0, o.y)));
  float zd = -getViewZ(readDepth(uv + vec2(0.0, o.y)));
  float e = max(max(abs(zl - z0), abs(zr - z0)), max(abs(zu - z0), abs(zd - z0)));
  float edge = smoothstep(0.05, 0.45, e / max(z0 * 0.22, 0.05));

  vec3 scanned = mix(vec3(l), uTint * (0.35 + l * 1.25), 0.72);
  scanned += uTint * edge * 1.6;
  scanned += uTint * smoothstep(0.045, 0.0, abs(uv.y - fract(uSweep))) * 1.1;
  scanned += uTint * (step(0.965, fract(uv.x * 90.0)) + step(0.965, fract(uv.y * 52.0))) * 0.06;
  scanned *= 1.0 - 0.05 * step(0.5, fract(uv.y * resolution.y * 0.25));

  float isSky = step(0.9999, d0);
  scanned = mix(scanned, mix(vec3(l), uTint * 0.35, 0.8), isSky);
  outputColor = vec4(mix(c, scanned, uAmount), inputColor.a);
}
`;

export class ScanVisionEffect extends Effect {
  constructor() {
    super('ScanVisionEffect', SCAN_FRAG, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uAmount', new THREE.Uniform(0)],
        ['uSweep', new THREE.Uniform(0)],
        ['uTint', new THREE.Uniform(new THREE.Vector3(0.25, 0.68, 1))],
      ]),
    });
  }
  set amount(v: number) {
    this.uniforms.get('uAmount')!.value = v;
  }
  get amount(): number {
    return this.uniforms.get('uAmount')!.value as number;
  }
  advance(dt: number) {
    const u = this.uniforms.get('uSweep')!;
    u.value = ((u.value as number) + dt * 0.45) % 1;
  }
}

// ---------------------------------------------------------------------------
// Deviancy glitch
// ---------------------------------------------------------------------------

const GLITCH_FRAG = /* glsl */ `
uniform float uAmount;
uniform float uSeed;
float h11(float p) { return fract(sin(p * 78.233) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uAmount < 0.001) { outputColor = inputColor; return; }
  float a = uAmount;
  float band = floor(uv.y * 28.0);
  float r = h11(band + uSeed * 13.0);
  vec2 suv = vec2(clamp(uv.x + (r - 0.5) * 0.09 * a * step(0.72, r), 0.001, 0.999), uv.y);
  float ca = 0.006 * a;
  vec3 c;
  c.r = texture2D(inputBuffer, clamp(suv + vec2(ca, 0.0), vec2(0.001), vec2(0.999))).r;
  c.g = texture2D(inputBuffer, suv).g;
  c.b = texture2D(inputBuffer, clamp(suv - vec2(ca, 0.0), vec2(0.001), vec2(0.999))).b;
  c *= 1.0 - step(0.985, h11(band * 3.1 + uSeed * 7.0)) * a * 0.7;
  c += vec3(0.9, 0.06, 0.09) * a * 0.12 * step(0.5, h11(uSeed * 3.0));
  outputColor = vec4(mix(inputColor.rgb, c, clamp(a * 1.6, 0.0, 1.0)), inputColor.a);
}
`;

export class GlitchEffect extends Effect {
  constructor() {
    super('DeviancyGlitchEffect', GLITCH_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uAmount', new THREE.Uniform(0)],
        ['uSeed', new THREE.Uniform(0)],
      ]),
    });
  }
  set amount(v: number) {
    this.uniforms.get('uAmount')!.value = v;
  }
  get amount(): number {
    return this.uniforms.get('uAmount')!.value as number;
  }
  update() {
    if ((this.uniforms.get('uAmount')!.value as number) > 0.001) {
      this.uniforms.get('uSeed')!.value = Math.random() * 100;
    }
  }
}

// ---------------------------------------------------------------------------
// Letterbox
// ---------------------------------------------------------------------------

const LETTERBOX_FRAG = /* glsl */ `
uniform float uAmount;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float bar = 0.115 * uAmount;
  float m = step(bar, uv.y) * step(uv.y, 1.0 - bar);
  float soft = smoothstep(bar - 0.004, bar + 0.002, uv.y) * smoothstep(1.0 - bar + 0.004, 1.0 - bar - 0.002, uv.y);
  outputColor = vec4(inputColor.rgb * max(m, 0.0) * soft, inputColor.a);
}
`;

export class LetterboxEffect extends Effect {
  constructor() {
    super('LetterboxEffect', LETTERBOX_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([['uAmount', new THREE.Uniform(0)]]),
    });
  }
  set amount(v: number) {
    this.uniforms.get('uAmount')!.value = v;
  }
  get amount(): number {
    return this.uniforms.get('uAmount')!.value as number;
  }
}

// ---------------------------------------------------------------------------
// The full chain
// ---------------------------------------------------------------------------

export interface PostFXHandles {
  composer: EffectComposer;
  grade: FilmGradeEffect;
  atmosphere: AtmosphereEffect;
  lensRain: LensRainEffect;
  scan: ScanVisionEffect;
  glitch: GlitchEffect;
  letterbox: LetterboxEffect;
  bloom: BloomEffect;
  dof: DepthOfFieldEffect;
  ssao: SSAOEffect | null;
  setSize: (w: number, h: number) => void;
  setCamera: (camera: THREE.PerspectiveCamera) => void;
  render: (dt: number) => void;
  dispose: () => void;
}

export function buildPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  tier: QualityTier
): PostFXHandles {
  const highEnd = tier === 'high' || tier === 'ultra';
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: tier === 'ultra' ? 4 : 0,
  });
  composer.addPass(new RenderPass(scene, camera));

  let ssao: SSAOEffect | null = null;
  if (tier !== 'low') {
    const normalPass = new NormalPass(scene, camera);
    composer.addPass(normalPass);
    ssao = new SSAOEffect(camera, normalPass.texture, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: tier === 'ultra' ? 24 : 14,
      rings: 6,
      luminanceInfluence: 0.6,
      radius: 0.13,
      intensity: 2.1,
      bias: 0.03,
      resolutionScale: tier === 'ultra' ? 1 : 0.5,
      worldDistanceThreshold: 22,
      worldDistanceFalloff: 6,
      worldProximityThreshold: 0.4,
      worldProximityFalloff: 0.15,
    });
    composer.addPass(new EffectPass(camera, ssao));
  }

  const atmosphere = new AtmosphereEffect(camera, highEnd);
  composer.addPass(new EffectPass(camera, atmosphere));

  const dof = new DepthOfFieldEffect(camera, {
    focusDistance: 4,
    focusRange: 1.6,
    bokehScale: highEnd ? 4.5 : 2.5,
    resolutionScale: tier === 'ultra' ? 0.75 : 0.5,
  });
  composer.addPass(new EffectPass(camera, dof));

  const bloom = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    luminanceThreshold: 0.62,
    luminanceSmoothing: 0.32,
    intensity: 1.5,
    radius: 0.72,
    levels: highEnd ? 8 : 6,
    mipmapBlur: true,
    kernelSize: KernelSize.LARGE,
  });
  composer.addPass(new EffectPass(camera, bloom));

  const toneMapping = new ToneMappingEffect({
    mode: ToneMappingMode.AGX,
    resolution: 256,
    whitePoint: 4,
    middleGrey: 0.6,
    adaptive: false,
  });
  const grade = new FilmGradeEffect();
  const lensRain = new LensRainEffect();
  const scan = new ScanVisionEffect();
  const glitch = new GlitchEffect();
  const letterbox = new LetterboxEffect();
  const chroma = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0006, 0.0007),
    radialModulation: true,
    modulationOffset: 0.35,
  });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.42 });
  const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
  noise.blendMode.opacity.value = 0.055;

  composer.addPass(new EffectPass(camera, scan, toneMapping, grade, chroma, lensRain, glitch, vignette, noise));
  if (tier !== 'low') {
    composer.addPass(
      new EffectPass(camera, new SMAAEffect({ preset: tier === 'ultra' ? SMAAPreset.ULTRA : SMAAPreset.HIGH }))
    );
  }
  composer.addPass(new EffectPass(camera, letterbox));

  return {
    composer,
    grade,
    atmosphere,
    lensRain,
    scan,
    glitch,
    letterbox,
    bloom,
    dof,
    ssao,
    setSize: (w, h) => composer.setSize(w, h),
    setCamera: (cam) => {
      atmosphere.setCamera(cam);
      for (const pass of composer.passes) {
        (pass as unknown as { mainCamera?: THREE.Camera }).mainCamera = cam;
      }
    },
    render: (dt: number) => {
      atmosphere.update();
      scan.advance(dt);
      glitch.update();
      composer.render(dt);
    },
    dispose: () => composer.dispose(),
  };
}
