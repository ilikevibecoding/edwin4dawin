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

/**
 * Normalised log position of 18% grey inside the AgX window, which is where the
 * contrast slope below pivots.
 */
const float AGX_PIVOT = 0.6060606;

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

/**
 * Print-film contrast, applied to the log encoding before the sigmoid.
 *
 * AgX's window spans 16.5 stops from -12.47 EV to +4.03 EV. Mapping that much
 * latitude onto a display means the curve through the midtones is very shallow:
 * a surface two and a third stops under the key — ordinary open shade — comes
 * out at 0.42 sRGB, and something six stops under still reads 0.07. That is the
 * "milky, lifted, no real black anywhere" look, and it is a property of the
 * transform rather than of the lighting, which is why no amount of relighting
 * shifts it.
 *
 * Scaling the log values about a pivot is what a print stock's gamma does. It
 * steepens the midtones and pulls both ends past the window, where the existing
 * clamp turns them into genuine black and genuine white. At a slope of 1.7 the
 * effective latitude becomes just under ten stops — which is roughly what a
 * shipped frame shows — and open shade lands near 0.30 while the deepest
 * corners reach 0.02.
 *
 * Doing this in log *before* the sigmoid matters: the same move in display
 * space is a straight-line scale that subtracts a constant and clips the toe
 * into one flat plate, and it also breaks AgX's hue handling in the shoulder.
 *
 * The two halves get separate slopes, and the shoulder's is the *shallower* one
 * — a print stock holds four or five stops above grey and seven below. A single
 * slope steep enough to put the black point where shadows want it drags the
 * white point down to barely two stops over grey, which is inside the range an
 * ordinary sunlit frame occupies, so cloud tops and sunlit plaster arrive as one
 * flat plate of white instead of keeping their modelling. Splitting the slopes
 * lets the toe stay steep for contrast while the shoulder keeps enough latitude
 * to roll: a shoulder ratio near 0.7 puts the display's last few percent five
 * stops over grey rather than two and a half. The blend through the pivot is
 * smooth because a derivative step here shows up as a visible contour across a
 * sky gradient.
 */
/** Smooth maximum. Monotonic in both arguments, so it is safe to shape a
 *  transfer curve with. */
vec3 smaxv(vec3 a, vec3 b, float k) {
  vec3 h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}

/**
 * Deep-shadow roll-off, on top of the two midtone slopes.
 *
 * A single slope below the pivot spends the window's whole lower half at one
 * rate: at 1.78 the ten stops AgX holds under grey become 5.6, and everything
 * past that is off the bottom of the curve. Five stops sounds generous until it
 * is counted against a real frame — a sunlit deck sits two stops over grey, so
 * a doorway or a stairwell four stops under the deck is already at the edge, and
 * anything an occlusion term darkens further has nowhere left to go. It arrives
 * as one flat plate of black covering seven percent of the frame, which is the
 * same defect as the milky version and just at the other end.
 *
 * Real stock answers this with a toe: the density curve flattens as it
 * approaches base, so separation survives far below the point a straight line
 * would have run out. Here that is a second, shallower line tangent to the steep
 * one at the knee, some stops under the pivot; the smooth maximum of the two
 * rounds the junction. Midtone contrast is untouched because the steep branch
 * still wins everywhere above the knee — only the part of the frame that was
 * going to clip is affected, and it gains a bit over two stops of latitude.
 *
 * The maximum has to be taken on the *values*, not on the slopes. Varying a
 * slope with depth and multiplying it back in turns the curve over as soon as
 * the slope's rate of change outruns the slope itself, which would invert the
 * deepest shadows rather than roll them off.
 */
vec3 agxLogContrast(vec3 x, float toe, float shoulder, float knee, float toeSlope) {
  vec3 d = x - AGX_PIVOT;
  vec3 slope = mix(vec3(toe), vec3(shoulder), smoothstep(-0.14, 0.14, d));
  vec3 steep = d * slope;
  vec3 shallow = (d + knee) * (toe * toeSlope) - knee * toe;
  return AGX_PIVOT + smaxv(steep, shallow, 0.055);
}

vec3 tonemapAgX(
  vec3 color,
  float contrast,
  float shoulder,
  float toeKnee,
  float toeSlope,
  vec3 lookSlope,
  vec3 lookPower,
  float lookSat
) {
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * max(color, 0.0);
  color = AGX_INSET * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV);
  color = agxLogContrast(color, contrast, contrast * shoulder, toeKnee, toeSlope);
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
/**
 * Teal shadows, amber highlights — over a narrow range at each end.
 *
 * The ramps are the whole game here. Ending the teal at 0.62 display-linear luma
 * sounds conservative and is not: a daylight frame keeps almost everything under
 * that, so sunlit concrete 77 m out lands at 0.28 and takes the tint at 58%
 * strength. shadowTint is a 1.70x push toward blue, so 58% of it is 1.36x — and
 * the sun's own colour had given that surface a warm ratio of 1.34x. The grade
 * cancelled the lighting exactly, and measured chroma on the far field came out
 * at 1% against 26% in the scene buffer. Every warm surface in the frame arrived
 * neutral, which is the milky, washed look, and it is not fixable by raising
 * saturation afterwards because the hue information is already gone.
 *
 * Scene-side the lighting separates sun from shade perfectly well on its own — a
 * shaded wall measures B/R 1.57 against sunlit plaster at 0.53. So the grade only
 * needs to reach the part of the range where the lighting has nothing left to
 * say: the bottom stop or two, where chroma is unreliable anyway. Past that it
 * should get out of the way.
 */
vec3 splitTone(vec3 c, vec3 shadowTint, vec3 highlightTint, float balance) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float t = smoothstep(0.0, 0.18 + balance * 0.6, l);
  float h = smoothstep(0.45, 0.95, l);
  vec3 shadows = c * mix(shadowTint, vec3(1.0), t);
  return shadows * mix(vec3(1.0), highlightTint, h);
}

/**
 * Filmic contrast.
 *
 * Scaling linearly about a pivot — "(c - p) * k + p" — subtracts the constant
 * "p * (k - 1)", so every value below "p * (1 - 1/k)" lands at or under zero and
 * is clipped. At a 0.42 pivot and k = 1.05 that threshold is 0.02 in display
 * linear, which is sRGB 0.155: the entire bottom two stops of the image collapse
 * into one flat black plate with no recoverable detail. It is indistinguishable
 * from "the renderer has no shadow detail" and it survives every attempt to fix
 * the lighting, because the clip happens after everything else.
 *
 * A Hermite S-curve is pinned at both 0 and 1 by construction, so contrast can
 * be pushed hard without ever clipping the toe or the shoulder.
 */
vec3 applyContrast(vec3 c, float contrast) {
  vec3 x = clamp(c, 0.0, 1.0);
  vec3 s = x * x * (3.0 - 2.0 * x);
  float amount = clamp((contrast - 1.0) * 2.2, -1.0, 1.0);
  return clamp(mix(x, s, amount), 0.0, 1.0);
}

vec3 applySaturation(vec3 c, float s) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return max(mix(vec3(l), c, s), 0.0);
}

// Chroma falls off in the toe on every real capture medium. Applying it means
// the ambient can stay physically cool without the darkest values reading as a
// saturated colour cast.
vec3 shadowDesat(vec3 c, float amount) {
  if (amount < 0.001) return c;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = (1.0 - smoothstep(0.0, 0.22, l)) * amount;
  return max(mix(c, vec3(l), w), 0.0);
}

// Gentle toe. Scales the bottom two stops down without clipping them, so the
// frame reaches a genuine near-black while shadow detail stays recoverable
// rather than collapsing into a flat plate. Monotonic by construction.
vec3 filmToe(vec3 c, float strength) {
  if (strength < 0.001) return c;
  vec3 knee = smoothstep(vec3(0.0), vec3(0.30), c);
  return max(c * mix(vec3(1.0), knee * 0.72 + 0.28, strength), 0.0);
}

// The custom post stack bypasses three's automatic output conversion, so the
// display encode has to be explicit. Using the exact piecewise sRGB transfer
// rather than a 2.2 gamma matters in the near-black region, which is where
// most of a night scene lives.
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

/**
 * Cheap monotonic stand-in for the display transform, used where a pass needs
 * to reason about *perceived* contrast rather than radiance — sharpening,
 * edge weights, adaptation. Matches AgX closely enough in relative terms and
 * costs a divide instead of two matrix products and a polynomial.
 */
float tonemapProxy(vec3 c) {
  float l = dot(max(c, 0.0), vec3(0.2126, 0.7152, 0.0722));
  return pow(l / (l + 0.55), 0.75);
}

// Rolls only the most saturated pixels toward white, which stops neon-looking
// fringes on tracers and emissive signage without flattening the whole frame.
vec3 highlightDesat(vec3 c, float amount) {
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = (mx - mn) / max(mx, 1e-4);
  float w = smoothstep(1.8, 7.0, mx) * sat * amount;
  return mix(c, vec3(mx), w);
}
`;
