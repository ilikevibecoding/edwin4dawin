import * as THREE from 'three';
import { Effect } from 'postprocessing';
import type { GradeConfig } from '../LookConfig';

/**
 * Display-referred film pass: contrast, saturation, split toning, vignette,
 * grain, chromatic aberration, anamorphic highlight smear and (optionally)
 * water on the lens.
 *
 * All of it is one non-convolution effect on purpose — the software rasteriser
 * used for capture charges per fullscreen pass, so merging saves real time.
 */

const FRAG = /* glsl */ `
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uShadowTint;
uniform vec3 uHighlightTint;
uniform float uSplitBalance;
uniform float uLift;
uniform float uVignette;
uniform float uVignetteSoftness;
uniform float uGrain;
uniform float uCA;
uniform float uAnamorphic;
uniform float uTime;
uniform float uRain;
uniform float uScanline;
uniform float uDesaturateEdges;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Cheap value noise for lens water.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);

  // Lens water: drifting droplets refract the frame slightly.
  vec2 duv = uv;
  float wet = 0.0;
  if (uRain > 0.001) {
    vec2 dp = uv * vec2(9.0, 5.0);
    dp.y += uTime * 0.06;
    float drops = vnoise(dp * 2.3);
    float streak = vnoise(vec2(uv.x * 26.0, uv.y * 3.0 - uTime * 0.55));
    float mask = smoothstep(0.62, 0.95, drops) + smoothstep(0.78, 1.0, streak) * 0.55;
    wet = mask * uRain;
    vec2 grad = vec2(
      vnoise(dp * 2.3 + vec2(0.02, 0.0)) - drops,
      vnoise(dp * 2.3 + vec2(0.0, 0.02)) - drops
    );
    duv += grad * wet * 0.06;
  }

  // Chromatic aberration grows toward the edges like a real lens.
  float caAmount = uCA * (0.35 + r2 * 2.2);
  vec2 dir = normalize(centered + 1e-6);
  vec3 col;
  col.r = texture2D(inputBuffer, duv + dir * caAmount).r;
  col.g = texture2D(inputBuffer, duv).g;
  col.b = texture2D(inputBuffer, duv - dir * caAmount).b;

  // Anamorphic smear: a few horizontal taps on the brightest parts only.
  if (uAnamorphic > 0.001) {
    vec3 smear = vec3(0.0);
    float w = 0.0;
    for (int i = 1; i <= 4; i++) {
      float o = float(i) * 2.5 * texelSize.x * (1.0 + uAnamorphic * 3.0);
      vec3 a = texture2D(inputBuffer, duv + vec2(o, 0.0)).rgb;
      vec3 b = texture2D(inputBuffer, duv - vec2(o, 0.0)).rgb;
      float k = 1.0 / float(i);
      smear += (a + b) * k;
      w += 2.0 * k;
    }
    smear /= max(w, 1e-4);
    float lum = dot(smear, vec3(0.2126, 0.7152, 0.0722));
    col += smear * smoothstep(0.55, 1.0, lum) * uAnamorphic * 0.5;
  }

  // Contrast around mid grey, then saturation.
  col = (col - 0.5) * uContrast + 0.5;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, uSaturation);

  // Split tone: cool shadows, warm highlights.
  float t = smoothstep(0.0, 1.0, pow(clamp(lum, 0.0, 1.0), uSplitBalance * 2.0));
  vec3 tone = mix(uShadowTint, uHighlightTint, t);
  col *= mix(vec3(1.0), tone, 0.34);

  // Milk the blacks a touch so shadows keep detail.
  col += uLift * (1.0 - t);

  // Edge desaturation reads as cheap lens falloff.
  col = mix(col, vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), r2 * uDesaturateEdges);

  // Lens water brightens and blooms where it pools.
  col += wet * vec3(0.05, 0.07, 0.1);

  // Vignette.
  float vig = 1.0 - uVignette * pow(smoothstep(uVignetteSoftness, 1.0, r2 * 2.0), 1.4);
  col *= vig;

  if (uScanline > 0.001) {
    float s = sin(uv.y * 1400.0) * 0.5 + 0.5;
    col *= 1.0 - uScanline * 0.25 * s;
  }

  // Animated grain, slightly stronger in the shadows like real film.
  float g = hash21(uv * vec2(1024.0, 768.0) + fract(uTime) * 91.7) - 0.5;
  col += g * uGrain * (1.25 - 0.75 * clamp(lum, 0.0, 1.0));

  outputColor = vec4(max(col, 0.0), inputColor.a);
}
`;

export class FilmEffect extends Effect {
  constructor(grade: GradeConfig) {
    super('FilmEffect', FRAG, {
      uniforms: new Map<string, THREE.Uniform<unknown>>([
        ['uContrast', new THREE.Uniform(grade.contrast)],
        ['uSaturation', new THREE.Uniform(grade.saturation)],
        ['uShadowTint', new THREE.Uniform(new THREE.Vector3(...grade.shadowTint))],
        ['uHighlightTint', new THREE.Uniform(new THREE.Vector3(...grade.highlightTint))],
        ['uSplitBalance', new THREE.Uniform(grade.splitBalance)],
        ['uLift', new THREE.Uniform(grade.lift)],
        ['uVignette', new THREE.Uniform(grade.vignette)],
        ['uVignetteSoftness', new THREE.Uniform(grade.vignetteSoftness)],
        ['uGrain', new THREE.Uniform(grade.grain)],
        ['uCA', new THREE.Uniform(grade.chromaticAberration)],
        ['uAnamorphic', new THREE.Uniform(grade.anamorphic)],
        ['uTime', new THREE.Uniform(0)],
        ['uRain', new THREE.Uniform(0)],
        ['uScanline', new THREE.Uniform(0)],
        ['uDesaturateEdges', new THREE.Uniform(0.18)],
      ]),
    });
  }

  private u(name: string): THREE.Uniform<unknown> {
    return this.uniforms.get(name) as THREE.Uniform<unknown>;
  }

  applyGrade(g: GradeConfig): void {
    (this.u('uContrast') as THREE.Uniform<number>).value = g.contrast;
    (this.u('uSaturation') as THREE.Uniform<number>).value = g.saturation;
    (this.u('uShadowTint') as THREE.Uniform<THREE.Vector3>).value.set(...g.shadowTint);
    (this.u('uHighlightTint') as THREE.Uniform<THREE.Vector3>).value.set(...g.highlightTint);
    (this.u('uSplitBalance') as THREE.Uniform<number>).value = g.splitBalance;
    (this.u('uLift') as THREE.Uniform<number>).value = g.lift;
    (this.u('uVignette') as THREE.Uniform<number>).value = g.vignette;
    (this.u('uVignetteSoftness') as THREE.Uniform<number>).value = g.vignetteSoftness;
    (this.u('uGrain') as THREE.Uniform<number>).value = g.grain;
    (this.u('uCA') as THREE.Uniform<number>).value = g.chromaticAberration;
    (this.u('uAnamorphic') as THREE.Uniform<number>).value = g.anamorphic;
  }

  set time(v: number) {
    (this.u('uTime') as THREE.Uniform<number>).value = v;
  }

  /** 0 = dry lens, 1 = shooting through a downpour. */
  set lensRain(v: number) {
    (this.u('uRain') as THREE.Uniform<number>).value = v;
  }

  set scanline(v: number) {
    (this.u('uScanline') as THREE.Uniform<number>).value = v;
  }
}
