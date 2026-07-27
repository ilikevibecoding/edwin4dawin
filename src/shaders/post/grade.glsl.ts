import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE } from './common.glsl';

/**
 * AgX, in the same formulation three ships, split so the grade can happen in
 * the log-encoded middle of the transform.
 *
 * AgX rather than ACES because the failure mode matters more than the average
 * case: a muzzle flash, a napalm fireball or the sun clipping a wall are all
 * bright *and* saturated, and the ACES RRT skews those toward yellow/magenta
 * and posterises the shoulder. AgX rotates into a wider inset primary set
 * before the sigmoid, so saturated highlights desaturate toward white the way
 * film does instead of hue-shifting. ACES is kept behind a define for
 * comparison.
 */
export const GLSL_TONEMAP = /* glsl */ `
const mat3 LINEAR_SRGB_TO_REC2020 = mat3(
  vec3(0.6274, 0.0691, 0.0164),
  vec3(0.3293, 0.9195, 0.0880),
  vec3(0.0433, 0.0113, 0.8956)
);
const mat3 REC2020_TO_LINEAR_SRGB = mat3(
  vec3(1.6605, -0.1246, -0.0182),
  vec3(-0.5876, 1.1329, -0.1006),
  vec3(-0.0728, -0.0083, 1.1187)
);
const mat3 AGX_INSET = mat3(
  vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
  vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
  vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
);
const mat3 AGX_OUTSET = mat3(
  vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
  vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
  vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
);
const float AGX_MIN_EV = -12.47393;
const float AGX_MAX_EV = 4.026069;
/** Where 18% grey lands in the log-encoded range; the grade pivots here. */
const float AGX_MID_GREY = 0.6060606;

/** Linear scene radiance to the normalised log domain the grade works in. */
vec3 agxEncode(vec3 color) {
  color = LINEAR_SRGB_TO_REC2020 * max(color, vec3(0.0));
  color = AGX_INSET * color;
  color = log2(max(color, vec3(1e-10)));
  return clamp((color - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV), 0.0, 1.0);
}

vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 +
    0.1191 * x - 0.00232;
}

/** Log domain back to display-referred linear sRGB. */
vec3 agxDecode(vec3 x) {
  vec3 color = agxContrast(clamp(x, 0.0, 1.0));
  color = AGX_OUTSET * color;
  color = pow(max(color, vec3(0.0)), vec3(2.2));
  return clamp(REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0);
}

/** Plain log encoding over the same EV window, for the non-AgX grade path. */
vec3 logEncode(vec3 c) {
  return clamp((log2(max(c, vec3(1e-10))) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV), 0.0, 1.0);
}

vec3 logDecode(vec3 x) {
  return exp2(x * (AGX_MAX_EV - AGX_MIN_EV) + AGX_MIN_EV);
}

vec3 acesFit(vec3 v) {
  const mat3 IN_MAT = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 OUT_MAT = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602)
  );
  v = IN_MAT * (v / 0.6);
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(OUT_MAT * (a / b), 0.0, 1.0);
}
`;

export const GLSL_GRADE = /* glsl */ `
uniform vec3 uWhiteBalance;
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec3 uGammaInv;
uniform vec3 uShadowTint;
uniform vec3 uMidTint;
uniform vec3 uHighTint;
uniform float uContrast;
uniform float uSaturation;
uniform float uLutAmount;
uniform float uLutSize;
uniform sampler3D uLut;

/**
 * Trilinear 3D LUT lookup with a half-texel inset so the outermost slices are
 * not clamped away. Applied in AgX's log domain: a LUT authored against display
 * values would band in the shadows and clip anything above white.
 */
vec3 applyLut(vec3 logColor) {
  if (uLutAmount <= 0.001) return logColor;
  vec3 c = clamp(logColor, 0.0, 1.0);
  vec3 uvw = (c * (uLutSize - 1.0) + 0.5) / uLutSize;
  return mix(logColor, texture(uLut, uvw).rgb, uLutAmount);
}

/** Full grade, operating on the normalised log signal. */
vec3 gradeLog(vec3 x) {
  x = uLift + x * (uGain - uLift);
  x = pow(max(x, vec3(0.0)), uGammaInv);
  x = (x - AGX_MID_GREY) * uContrast + AGX_MID_GREY;

  float l = luma(x);
  float shadowW = 1.0 - smoothstep(0.0, 0.55, l);
  float highW = smoothstep(0.45, 1.0, l);
  float midW = max(0.0, 1.0 - shadowW - highW);
  x += uShadowTint * shadowW + uMidTint * midW + uHighTint * highW;

  // Luminance-preserving: the grey axis is untouched, so saturation cannot
  // shift exposure the way a naive per-channel power does.
  x = mix(vec3(luma(x)), x, uSaturation);

  return applyLut(clamp(x, 0.0, 1.0));
}
`;

/**
 * Metering downsample. Writes log2 luminance plus a centre-weighting term so a
 * bright sky at the top of frame cannot crush the street the player is in.
 */
export const LUM_DOWNSAMPLE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
in vec2 vUv;
uniform sampler2D uColor;
uniform vec2 uFootprint;
out vec4 fragColor;

void main() {
  float acc = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = clamp(vUv + vec2(float(x), float(y)) * uFootprint * 0.34, vec2(0.001), vec2(0.999));
      acc += log2(max(luma(texture(uColor, uv).rgb), 1e-4));
    }
  }
  float d = length(vUv - 0.5);
  fragColor = vec4(acc / 9.0, exp(-d * d * 2.2), 0.0, 1.0);
}
`;

/**
 * Histogram-based auto exposure in a single 1x1 pass.
 *
 * Bins the metering buffer, discards the darkest and brightest tails, and takes
 * the mean of what remains. A plain average is dominated by whichever extreme
 * has more pixels, which is why walking out of a doorway with an average-based
 * meter either blows out the sky or leaves the interior black.
 */
export const EXPOSURE_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uLum;
uniform sampler2D uPrev;
uniform vec2 uLumSize;
uniform float uDt;
uniform float uMinLogLum;
uniform float uMaxLogLum;
uniform float uKey;
uniform float uMinEV;
uniform float uMaxEV;
uniform float uSpeedUp;
uniform float uSpeedDown;
uniform float uLowPercent;
uniform float uHighPercent;
uniform float uReset;
out vec4 fragColor;

// 48 bins over the 28-stop metering window is 0.58 EV each, fine enough that
// panning across a bright wall does not step the exposure visibly.
#define BINS 48

void main() {
  float bins[BINS];
  for (int i = 0; i < BINS; i++) bins[i] = 0.0;

  float total = 0.0;
  int w = int(uLumSize.x);
  int h = int(uLumSize.y);
  float range = uMaxLogLum - uMinLogLum;
  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      vec2 s = texelFetch(uLum, ivec2(x, y), 0).rg;
      float f = clamp((s.r - uMinLogLum) / range, 0.0, 0.9999);
      int b = int(f * float(BINS));
      bins[b] += s.g;
      total += s.g;
    }
  }

  float lo = total * uLowPercent;
  float hi = total * uHighPercent;
  float acc = 0.0;
  float sum = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < BINS; i++) {
    float start = acc;
    acc += bins[i];
    float weight = max(0.0, min(acc, hi) - max(start, lo));
    float logLum = uMinLogLum + (float(i) + 0.5) / float(BINS) * range;
    sum += logLum * weight;
    wsum += weight;
  }
  float avgLogLum = wsum > 1e-5 ? sum / wsum : -2.0;

  // Exposure that would put the metered average on the target middle grey.
  float targetEV = clamp(log2(uKey) - avgLogLum, uMinEV, uMaxEV);
  float prevEV = texelFetch(uPrev, ivec2(0, 0), 0).r;
  if (uReset > 0.5) prevEV = targetEV;

  float speed = targetEV < prevEV ? uSpeedUp : uSpeedDown;
  float k = 1.0 - exp(-uDt * speed);
  float ev = mix(prevEV, targetEV, clamp(k, 0.0, 1.0));
  fragColor = vec4(ev, targetEV, avgLogLum, 1.0);
}
`;

/**
 * Tone map + grade + lens sampling.
 *
 * Everything that needs to happen while the signal is still scene-referred
 * lives here: the distortion-style chromatic aberration, the radial blur and
 * heat shimmer (they resample radiance, not display values), bloom and flare
 * accumulation, natural vignetting, then exposure, white balance, AgX and the
 * grade. Grain and sharpening deliberately come later so they operate on
 * display-referred values.
 */
export const GRADE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}
${GLSL_TONEMAP}
${GLSL_GRADE}

in vec2 vUv;

uniform sampler2D uColor;
uniform sampler2D uBloom;
uniform sampler2D uStreak;
uniform sampler2D uFlare;
uniform sampler2D uDirt;
uniform sampler2D uExposure;
uniform sampler2D uDepth;

uniform vec2 uResolution;
uniform vec2 uTexel;
uniform vec2 uNearFar;
uniform float uTime;
uniform float uFrame;

uniform float uExposureOverride;
uniform float uExposureComp;

uniform float uChromatic;
uniform float uVignette;
uniform float uRadialBlur;
uniform float uHeatHaze;

uniform float uBloomStrength;
uniform float uStreakStrength;
uniform float uDirtStrength;
uniform float uFlareStrength;
uniform float uHalation;

uniform vec3 uFlashColor;
uniform float uFlashAmount;
uniform float uDamage;
uniform vec3 uDamageColor;

out vec4 fragColor;

/**
 * Heat shimmer. Two scrolling noise octaves, attenuated near the camera so the
 * weapon in frame does not wobble, which reads as a broken shader rather than
 * hot air.
 */
vec2 heatOffset(vec2 uv, float depth) {
  if (uHeatHaze <= 0.001) return vec2(0.0);
  float t = uTime * 0.9;
  float n1 = sin(uv.y * 64.0 + t * 3.1) * cos(uv.x * 41.0 - t * 2.3);
  float n2 = sin(uv.y * 121.0 - t * 5.3) * cos(uv.x * 97.0 + t * 4.1);
  float shimmer = (n1 * 0.7 + n2 * 0.3);
  float depthGate = smoothstep(1.5, 12.0, depth);
  return vec2(shimmer * 0.4, shimmer) * uHeatHaze * 0.006 * depthGate;
}

vec3 sampleSceneRadial(vec2 uv) {
  vec3 c = texture(uColor, uv).rgb;
  if (uRadialBlur <= 0.001) return c;
  vec2 dir = (uv - 0.5);
  float jitter = ign(gl_FragCoord.xy) - 0.5;
  const int TAPS = 6;
  float wsum = 1.0;
  for (int i = 1; i <= TAPS; i++) {
    float t = (float(i) + jitter) / float(TAPS);
    // Quadratic ramp: the frame centre must stay legible while sprinting.
    float amount = uRadialBlur * 0.16 * t * t;
    vec3 s = texture(uColor, clamp(uv - dir * amount, vec2(0.0), vec2(1.0))).rgb;
    float w = 1.0 - t * 0.5;
    c += s * w;
    wsum += w;
  }
  return c / wsum;
}

void main() {
  float rawDepth = texture(uDepth, vUv).r;
  float depth = linearizeDepth(rawDepth, uNearFar.x, uNearFar.y);

  vec2 uv = vUv + heatOffset(vUv, depth);
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);

  vec3 hdr;
  if (uChromatic > 0.001) {
    // Lateral chromatic aberration behaves like a per-channel focal length
    // difference, so it must be a radial scale about the optical centre. A flat
    // RGB pixel offset gives every edge a coloured fringe on the same side,
    // including dead centre, which no lens does.
    float k = uChromatic * 0.0035 * (0.25 + r2 * 3.0);
    vec2 uvR = 0.5 + centered * (1.0 + k);
    vec2 uvB = 0.5 + centered * (1.0 - k);
    hdr = vec3(
      sampleSceneRadial(clamp(uvR, vec2(0.0), vec2(1.0))).r,
      sampleSceneRadial(uv).g,
      sampleSceneRadial(clamp(uvB, vec2(0.0), vec2(1.0))).b
    );
  } else {
    hdr = sampleSceneRadial(uv);
  }

  /* ------------------------- bloom and lens ------------------------------ */

  vec3 bloom = texture(uBloom, uv).rgb;
  float dirt = 1.0;
  if (uDirtStrength > 0.001) {
    dirt = 1.0 + texture(uDirt, uv).r * uDirtStrength * 6.0;
  }

  if (uBloomStrength > 0.0001) {
    // Energy conserving: a lerp cannot add light, so raising the strength
    // spreads the highlight instead of lifting the whole frame into haze.
    hdr = mix(hdr, bloom * dirt, clamp(uBloomStrength * dirt, 0.0, 0.9));
  }

  if (uStreakStrength > 0.001) {
    hdr += texture(uStreak, uv).rgb * uStreakStrength * dirt;
  }

  if (uFlareStrength > 0.001) {
    // Ghosts: images of the aperture formed between element surfaces, so each one
    // is the flare source reflected through the optical centre at a different
    // scale. Driven by the flare buffer, which only holds compact sources far
    // above white — a ghost of the whole sky is the fastest way to fog a frame.
    //
    // Two rules keep these readable rather than alien. Tints stay close to white,
    // because a strongly hue-shifted copy of the sun reads as a broken shader
    // rather than an optic; and each ghost is masked by how far off-axis it lands,
    // since a real ghost is a small aperture image near the axis, not a
    // full-frame wash.
    vec3 ghosts = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      const vec3 scales = vec3(-0.42, 0.72, -1.15);
      const vec3 weights = vec3(0.5, 0.32, 0.18);
      vec3 tints[3] = vec3[3](
        vec3(0.78, 0.86, 1.0),
        vec3(1.0, 0.88, 0.72),
        vec3(0.82, 1.0, 0.92)
      );
      vec2 gUv = 0.5 + centered * scales[i];
      float offAxis = smoothstep(0.72, 0.16, length(gUv - 0.5) * 2.0);
      ghosts += texture(uFlare, clamp(gUv, vec2(0.0), vec2(1.0))).rgb *
        tints[i] * weights[i] * offAxis;
    }
    // Halo: the source smeared radially about the axis, mirrored, which is what
    // makes a light behind the player still register at the frame edge.
    vec2 halo = 0.5 - centered * (1.0 + 0.22 / max(length(centered), 0.05));
    ghosts += texture(uFlare, clamp(halo, vec2(0.0), vec2(1.0))).rgb *
      vec3(0.9, 0.92, 1.0) * 0.22;
    hdr += ghosts * uFlareStrength * dirt;
  }

  if (uHalation > 0.001) {
    // Halation is a red-biased bleed around highlights, from light scattering
    // back off the film base. Quadratic in the bloom's own brightness, so it
    // warms hot edges and leaves everything else alone.
    vec3 h = texture(uBloom, uv).rgb;
    hdr += h * vec3(1.0, 0.32, 0.12) * uHalation * luma(h) * 2.0;
  }

  if (uFlashAmount > 0.001) {
    // Injected as radiance so AgX rolls it off to white and desaturates it,
    // rather than pasting a flat white quad over the frame.
    hdr += uFlashColor * uFlashAmount * uFlashAmount * 14.0;
  }

  /* --------------------- natural lens falloff ---------------------------- */

  if (uVignette > 0.001) {
    // cos^4 falloff about the optical axis: the actual lens law, applied to
    // radiance so highlights roll off through the tone curve instead of being
    // dimmed after it.
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 v = centered * vec2(aspect, 1.0);
    float cosTheta = inversesqrt(1.0 + dot(v, v) * 2.4);
    float falloff = pow(cosTheta, 4.0);
    hdr *= mix(1.0, falloff, uVignette);
  }

  /* ------------------------- exposure ----------------------------------- */

  float ev = texelFetch(uExposure, ivec2(0, 0), 0).r;
  float exposure = uExposureOverride > 0.0 ? uExposureOverride : exp2(ev + uExposureComp);
  hdr *= exposure;

  hdr *= uWhiteBalance;

  /* ------------------------ tone map + grade ----------------------------- */

  #ifdef TONEMAP_ACES
    vec3 display = acesFit(logDecode(gradeLog(logEncode(hdr))));
  #else
    vec3 display = agxDecode(gradeLog(agxEncode(hdr)));
  #endif

  /* ------------------------ display-referred ----------------------------- */

  if (uDamage > 0.001) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 v = centered * vec2(aspect, 1.0);
    float edge = smoothstep(0.16, 0.62, length(v));
    float bleed = uDamage * (0.35 + 0.65 * edge);
    display = mix(display, vec3(luma(display)), uDamage * 0.55);
    display = mix(display, uDamageColor * (0.25 + luma(display)), bleed * 0.75);
  }

  if (uFlashAmount > 0.35) {
    display = mix(display, vec3(1.0), smoothstep(0.35, 0.95, uFlashAmount));
  }

  fragColor = vec4(display, 1.0);
}
`;

/** Uniform declarations for `TONEMAP_ACES`; kept beside the shader it toggles. */
export const GRADE_DEFINES_ACES = { TONEMAP_ACES: 1 } as const;
