import { GLSL_COMMON } from '../FullScreen';
import { TONEMAP_GLSL } from './Tonemap';

/**
 * Final HDR → display composite.
 *
 * Everything that must happen in a single pass to avoid extra full-screen
 * bandwidth: lens distortion, chromatic aberration, bloom + lens-dirt
 * combine, exposure, tonemap, grade, vignette, grain, sharpen, dither.
 *
 * Order is deliberate — physical camera effects (distortion, aberration,
 * bloom) belong in scene-referred linear light *before* the display
 * transform; perceptual/print effects (vignette, grain, dither) belong after.
 */
export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tDirt;
uniform vec2  uResolution;
uniform vec2  uTexel;
uniform float uTime;

uniform float uExposure;
uniform float uBloomStrength;
uniform float uDirtStrength;

uniform float uChromatic;       // radial CA strength, in pixels at the corner
uniform float uDistortion;      // barrel (+) / pincushion (-)
uniform float uVignette;        // 0..1
uniform float uVignetteRoundness;
uniform float uGrain;
uniform float uGrainSize;
uniform float uSharpen;
uniform float uDither;

uniform float uContrast;
uniform float uSaturation;
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform vec3  uShadowTint;
uniform vec3  uHighlightTint;
uniform float uSplitBalance;
uniform vec3  uLookSlope;
uniform vec3  uLookPower;
uniform float uLookSat;
uniform float uHighlightDesat;

// Screen-space damage/suppression feedback, driven by gameplay.
uniform float uDamageFlash;     // 0..1 red edge pulse
uniform vec3  uDamageDir;       // screen-space direction of the hit
uniform float uSuppression;     // 0..1 desaturate + tunnel
uniform float uConcussion;      // 0..1 heavy blur + ring
uniform float uFadeToBlack;

${GLSL_COMMON}
${TONEMAP_GLSL}

// Cheap 3-tap spectral CA. Sampling R/G/B at slightly different radii is
// physically what an uncorrected lens does; scaling by r^2 keeps the centre
// of the screen — where the player is aiming — perfectly sharp.
vec3 sampleSceneCA(vec2 uv, float amount) {
  vec2 center = uv - 0.5;
  float r2 = dot(center, center);
  if (amount < 0.001) return texture2D(tScene, uv).rgb;
  vec2 offset = center * r2 * amount;
  vec3 c;
  c.r = texture2D(tScene, uv - offset * 1.0).r;
  c.g = texture2D(tScene, uv).g;
  c.b = texture2D(tScene, uv + offset * 1.0).b;
  return c;
}

vec2 distortUv(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + k * r2 + k * k * 0.35 * r2 * r2);
}

void main() {
  vec2 uv = vUv;

  // Concussion warps the frame outward from the centre — reads as pressure
  // wave rather than a generic blur.
  if (uConcussion > 0.001) {
    vec2 c = uv - 0.5;
    float r = length(c);
    float wob = sin(r * 34.0 - uTime * 11.0) * 0.006 * uConcussion;
    uv += normalize(c + 1e-5) * wob;
  }

  uv = distortUv(uv, uDistortion);

  float caScale = uChromatic * (1.0 + uConcussion * 6.0 + uSuppression * 1.5);
  vec3 color = sampleSceneCA(uv, caScale);

  // ---- Bloom + lens dirt ----
  vec3 bloom = texture2D(tBloom, uv).rgb;
  vec3 dirt = texture2D(tDirt, uv).rgb;
  color += bloom * uBloomStrength;
  color += bloom * dirt * uDirtStrength;

  // ---- Exposure & display transform ----
  color *= uExposure;
  color = highlightDesat(color, uHighlightDesat);
  color = tonemapAgX(color, uLookSlope, uLookPower, uLookSat);

  // ---- Grade (display-referred) ----
  color = liftGammaGain(color, uLift, uGamma, uGain);
  color = splitTone(color, uShadowTint, uHighlightTint, uSplitBalance);
  color = applyContrast(color, uContrast, 0.42);
  color = applySaturation(color, uSaturation);

  // ---- Contrast-adaptive sharpening ----
  // Runs on the graded image so it sharpens what the eye actually sees, and
  // the local-contrast weight stops it from ringing on sky gradients.
  if (uSharpen > 0.001) {
    vec3 n = texture2D(tScene, uv + vec2(0.0, uTexel.y)).rgb;
    vec3 s = texture2D(tScene, uv - vec2(0.0, uTexel.y)).rgb;
    vec3 e = texture2D(tScene, uv + vec2(uTexel.x, 0.0)).rgb;
    vec3 w = texture2D(tScene, uv - vec2(uTexel.x, 0.0)).rgb;
    vec3 blur = (n + s + e + w) * 0.25;
    vec3 hi = texture2D(tScene, uv).rgb - blur;
    float local = obLuma(abs(hi));
    float weight = uSharpen / (1.0 + local * 6.0);
    color += hi * weight;
  }

  // ---- Suppression: desaturated tunnel vision under fire ----
  if (uSuppression > 0.001) {
    float d = distance(vUv, vec2(0.5));
    float tunnel = smoothstep(0.18, 0.62, d) * uSuppression;
    color = mix(color, vec3(obLuma(color)) * vec3(0.86, 0.9, 1.02), tunnel * 0.8);
    color *= 1.0 - tunnel * 0.35;
  }

  // ---- Directional damage indicator ----
  if (uDamageFlash > 0.001) {
    vec2 c = vUv - 0.5;
    float dirAlign = max(dot(normalize(c + 1e-5), normalize(uDamageDir.xy + 1e-5)), 0.0);
    float edge = smoothstep(0.16, 0.55, length(c));
    float pulse = uDamageFlash * edge * mix(0.35, 1.0, dirAlign * dirAlign);
    color = mix(color, vec3(0.62, 0.035, 0.02), pulse * 0.72);
  }

  // ---- Vignette ----
  // Applied while still scene-referred: a vignette is light falloff at the
  // lens, so it multiplies radiance, not display values.
  {
    vec2 c = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float d = length(c * mix(1.0, 0.78, uVignetteRoundness));
    float v = smoothstep(0.82, 0.26, d);
    color *= mix(1.0, v, uVignette);
  }

  color *= uFadeToBlack;

  // ---- Display encode ----
  color = linearToSRGB(clamp(color, 0.0, 1.0));

  // ---- Film grain ----
  // Weighted toward midtones and applied in display space: real film has
  // almost no visible grain in specular highlights or crushed blacks, and
  // uniform grain is the fastest way to make a frame look like a demo.
  if (uGrain > 0.0001) {
    vec2 gp = floor(gl_FragCoord.xy / max(uGrainSize, 1.0)) + floor(vec2(uTime * 24.0, uTime * 31.0));
    vec3 noise = hash32(gp) - 0.5;
    float l = obLuma(color);
    float response = 4.0 * l * (1.0 - l);
    color += noise * uGrain * response;
  }

  // Dither before the 8-bit write kills banding in the sky and in smoke
  // gradients, which is where it is always most visible.
  float bayer = hash12(gl_FragCoord.xy);
  color += (bayer - 0.5) * uDither;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
