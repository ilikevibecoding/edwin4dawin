/**
 * Display transforms and colour grading operators.
 *
 * AgX is the default. Compared with ACES it keeps far more hue fidelity in
 * over-exposed regions — muzzle flashes and explosion cores desaturate toward
 * white along a perceptually smooth path instead of skewing to a flat
 * yellow-white, which is the single biggest "does this read as modern" tell in
 * a shooter full of bright emissive VFX.
 */
export const TONEMAP_GLSL = /* glsl */ `

// ---------------------------------------------------------------- AgX -------
// Rec.2020 working space keeps saturated emissives inside gamut through the
// log encode; sRGB primaries clip them and produce hue twists.

const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
   1.6605, -0.1246, -0.0182,
  -0.5876,  1.1329, -0.1006,
  -0.0728, -0.0083,  1.1187
);

const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
   0.6274, 0.0691, 0.0164,
   0.3293, 0.9195, 0.0880,
   0.0433, 0.0113, 0.8956
);

const mat3 AGX_INSET = mat3(
  0.8566271533, 0.1373189729, 0.1118982130,
  0.0951212405, 0.7612419906, 0.0767994186,
  0.0482516061, 0.1014390365, 0.8113023684
);

const mat3 AGX_OUTSET = mat3(
   1.1271005818, -0.1413297635, -0.1413297635,
  -0.1106066431,  1.1578237022, -0.1106066431,
  -0.0164939387, -0.0164939387,  1.2519364066
);

const float AGX_MIN_EV = -12.47393;
const float AGX_MAX_EV = 4.026069;

vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5   * x4 * x2
         - 40.14  * x4 * x
         + 31.96  * x4
         - 6.868  * x2 * x
         + 0.4298 * x2
         + 0.1191 * x
         - 0.00232;
}

// Per-channel power/saturation trim applied inside the log domain, which is
// where it behaves like a film print light rather than a blunt saturate().
vec3 agxLook(vec3 c, vec3 slope, vec3 power, float sat) {
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = pow(max(c * slope, 0.0), power);
  return max(luma + sat * (c - luma), 0.0);
}

vec3 tonemapAgX(vec3 color, vec3 lookSlope, vec3 lookPower, float lookSat) {
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * max(color, 0.0);
  color = AGX_INSET * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV);
  color = clamp(color, 0.0, 1.0);
  color = agxContrast(color);
  color = agxLook(color, lookSlope, lookPower, lookSat);
  color = AGX_OUTSET * color;
  color = pow(max(color, 0.0), vec3(2.2));
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
  return clamp(color, 0.0, 1.0);
}

// --------------------------------------------------------------- ACES -------
// Stephen Hill's fit. Kept as an alternate look for the "vivid" preset.

const mat3 ACES_INPUT = mat3(
  0.59719, 0.07600, 0.02840,
  0.35458, 0.90834, 0.13383,
  0.04823, 0.01566, 0.83777
);
const mat3 ACES_OUTPUT = mat3(
   1.60475, -0.10208, -0.00327,
  -0.53108,  1.10813, -0.07276,
  -0.07367, -0.00605,  1.07602
);

vec3 rrtOdtFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}

vec3 tonemapACES(vec3 color) {
  color = ACES_INPUT * max(color, 0.0);
  color = rrtOdtFit(color);
  color = ACES_OUTPUT * color;
  return clamp(color, 0.0, 1.0);
}

// ------------------------------------------------------------ Grading -------

vec3 liftGammaGain(vec3 c, vec3 lift, vec3 gamma, vec3 gain) {
  c = c * gain + lift * (1.0 - c);
  return pow(max(c, 0.0), 1.0 / max(gamma, 1e-3));
}

// Teal shadows / amber highlights. Restrained values here read as "graded";
// pushed hard it reads as an Instagram filter, so the balance term keeps the
// midtones neutral.
vec3 splitTone(vec3 c, vec3 shadowTint, vec3 highlightTint, float balance) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float t = smoothstep(0.0, 0.5 + balance * 0.5, l);
  vec3 shadows = c * mix(shadowTint, vec3(1.0), t);
  return shadows * mix(vec3(1.0), highlightTint, t * t);
}

vec3 applyContrast(vec3 c, float contrast, float pivot) {
  return max((c - pivot) * contrast + pivot, 0.0);
}

vec3 applySaturation(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return max(mix(vec3(l), c, s), 0.0);
}

// The custom post stack bypasses three's automatic output conversion, so the
// display encode has to be explicit. Using the exact piecewise sRGB transfer
// rather than a 2.2 gamma matters in the near-black region, which is where
// most of a night scene lives.
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// Rolls only the most saturated pixels toward white, which stops neon-looking
// fringes on tracers and emissive signage without flattening the whole frame.
vec3 highlightDesat(vec3 c, float amount) {
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = (mx - mn) / max(mx, 1e-4);
  float w = smoothstep(0.85, 2.0, mx) * sat * amount;
  return mix(c, vec3(mx), w);
}
`;
