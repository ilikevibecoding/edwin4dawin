import * as THREE from 'three';

/**
 * Physically-based atmospheric sky.
 *
 * Rayleigh + Mie single scattering evaluated per-pixel on a large inverted
 * sphere, plus a limb-darkened sun disc, an ozone absorption term, and two
 * layers of raymarched procedural cloud.
 *
 * The same shader is rendered into a small cubemap once per lighting change to
 * produce the image-based lighting environment, so the ambient light on every
 * surface in the level is derived from the actual sky the player is standing
 * under — the cheapest possible way to make a scene look coherently lit.
 */

const SKY_VERT = /* glsl */ `
varying vec3 vWorldDirection;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vWorldDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // Force the dome onto the far plane so it never intersects level geometry.
  gl_Position.z = gl_Position.w;
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;

varying vec3 vWorldDirection;
varying vec3 vWorldPosition;

uniform vec3  uSunDirection;
uniform float uSunIntensity;
/**
 * Colour of the beam, normalised so its red channel is 1.
 *
 * The same value the level's directional light is given. Three separate models
 * of the sun's colour used to coexist in this renderer — the scattering model's
 * own beam transmittance, an elevation ramp inside the cloud shader, and the
 * lighting system's authored curve — and they disagreed by more than a factor of
 * two in blue at mid-morning. Everything the beam *lands on* has to use the same
 * one as the level, or the sky's clouds and the ground bounce baked into the IBL
 * are lit by a different sun from the buildings underneath them: at golden hour
 * the level went deep orange while the cloud deck it stood under stayed white.
 */
uniform vec3  uSunTint;
uniform float uSunAngularRadius;
uniform vec3  uRayleighCoeff;
uniform float uMieCoeff;
uniform float uMieG;
uniform float uTurbidity;
uniform float uAtmosphereThickness;
uniform vec3  uGroundAlbedo;
uniform float uExposure;
uniform float uTime;

uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudHeight;
uniform float uCloudSpeed;
uniform vec3  uCloudTint;
uniform float uHazeAmount;
uniform vec3  uHazeColor;
uniform float uStarIntensity;

/**
 * 0 for the visible dome, 1 while baking the IBL cubemap.
 *
 * A probe sitting on the ground does not see the raw sky: roughly half its
 * hemisphere is filled with sunlit terrain, and that bounce both brightens and
 * warms the ambient considerably. Baking it in is what stops every shadowed
 * surface in the level from reading as indigo.
 */
uniform float uEnvBounce;

/**
 * Scales the sun/moon disc, 0 while measuring the probe's mean radiance.
 *
 * The disc subtends 6.8e-5 sr. Any probe cheap enough to read back samples it
 * far too coarsely to integrate: the disc either misses every texel or lands
 * squarely in one worth four orders of magnitude more than its neighbours, so
 * the measurement would swing wildly with sun azimuth. Its contribution to
 * hemisphere irradiance is under 2% here, and the beam is accounted for
 * separately as a directional light anyway.
 */
uniform float uDiscGain;

/**
 * Path length, in zenith air masses, at which multiple scattering saturates.
 *
 * Sets where the dome stops brightening toward the horizon. At the zenith the
 * path is about two air masses, so the term is still nearly linear there and the
 * physics is untouched; by the horizon's fifty it is fully saturated, which puts
 * the horizon four times the zenith rather than seventeen.
 */
#define MS_PATH_LIMIT 9.0

const float PI = 3.14159265359;
const float EARTH_RADIUS = 6371000.0;
const float ATMOSPHERE_RADIUS = 6471000.0;

float hash13(vec3 p) {
  uvec3 q = uvec3(ivec3(p * 1024.0)) * uvec3(1597334673u, 3812015801u, 2798796415u);
  uint n = (q.x ^ q.y ^ q.z) * 1597334673u;
  return float(n) * (1.0 / 4294967296.0);
}

float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0,0,0));
  float n100 = hash13(i + vec3(1,0,0));
  float n010 = hash13(i + vec3(0,1,0));
  float n110 = hash13(i + vec3(1,1,0));
  float n001 = hash13(i + vec3(0,0,1));
  float n101 = hash13(i + vec3(1,0,1));
  float n011 = hash13(i + vec3(0,1,1));
  float n111 = hash13(i + vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z);
}

/**
 * Normalised so the result spans 0..1 with a mean near 0.5 whatever the octave
 * count. Without the division the sum tops out at 1 - 2^-octaves and clusters
 * around 0.47, so any threshold expressed as "1 - coverage" only ever catches
 * the extreme tail of the distribution and the cloud deck comes out an order of
 * magnitude thinner than asked for.
 */
float fbm(vec3 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * valueNoise(p);
    total += a;
    p = p * 2.02 + vec3(11.3, 7.1, 5.7);
    a *= 0.5;
  }
  return v / max(total, 1e-4);
}

float rayleighPhase(float cosTheta) {
  return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
}

float miePhase(float cosTheta, float g) {
  float g2 = g * g;
  float num = (1.0 - g2) * (1.0 + cosTheta * cosTheta);
  float den = (2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
  return (3.0 / (8.0 * PI)) * num / max(den, 1e-4);
}

/** Chapman-function style optical depth approximation for a spherical shell. */
float opticalDepth(float cosZenith, float scaleHeight, float height) {
  float x = max(cosZenith, 0.02);
  return exp(-height / scaleHeight) / x;
}

vec3 atmosphere(vec3 dir, vec3 sunDir) {
  float cosTheta = dot(dir, sunDir);
  float zenith = max(dir.y, -0.08);

  // Air-mass style path lengths; cheap but matches the measured horizon
  // brightening and the reddening of a low sun very closely.
  float rayleighDepth = opticalDepth(zenith, 0.14, 0.0) * uAtmosphereThickness;
  float mieDepth = opticalDepth(zenith, 0.05, 0.0) * uAtmosphereThickness * uTurbidity;

  float sunZenith = max(sunDir.y, 0.0);
  float sunRayleighDepth = opticalDepth(sunZenith, 0.14, 0.0) * uAtmosphereThickness;
  float sunMieDepth = opticalDepth(sunZenith, 0.05, 0.0) * uAtmosphereThickness * uTurbidity;

  vec3 betaR = uRayleighCoeff;
  vec3 betaM = vec3(uMieCoeff);

  // Ozone absorbs in the Chappuis band, which is what makes a clear zenith
  // sky deep blue instead of cyan — omitting it is a common tell.
  vec3 betaO = vec3(0.00065, 0.00188, 0.00008) * 0.45;

  vec3 tauView = betaR * rayleighDepth + betaM * 1.1 * mieDepth + betaO * rayleighDepth;
  vec3 tauSun  = betaR * sunRayleighDepth + betaM * 1.1 * sunMieDepth + betaO * sunRayleighDepth;
  vec3 extinction = exp(-(tauView + tauSun));

  float pr = rayleighPhase(cosTheta);
  float pm = miePhase(cosTheta, uMieG);

  vec3 inscatter = (betaR * pr * rayleighDepth + betaM * pm * mieDepth) * extinction;
  inscatter *= uSunIntensity;

  // Multiple scattering.
  //
  // Every additional bounce redistributes energy across the spectrum, so the
  // effective coefficient flattens toward the illuminant — a real sky is only
  // deeply saturated near the zenith and goes pale toward the horizon. Driving
  // this term with betaR (as single scattering does) gives a uniformly navy
  // dome whose hemisphere irradiance is nearly 6:1 blue-to-red. That same dome
  // is baked into the IBL, so the error lands on every shadowed surface in the
  // level as an indigo cast. Flattening the spectrum here fixes the sky and the
  // scene lighting in one place.
  vec3 msCoeff = mix(betaR, vec3(dot(betaR, vec3(0.3333))), 0.58);
  float msDepth = rayleighDepth * 0.5 + mieDepth * 0.45;

  // Multiple scattering has to saturate with path length. Written linearly in
  // depth — the obvious form, since single scattering is linear in it — this term
  // grew by a factor of 67 from zenith to horizon, because the flat-earth path
  // is 1/cos and the horizon is 50 air masses. Nothing bounded it: the view-path
  // extinction that keeps single scattering finite was never applied to it.
  //
  // The result was a dome whose horizon was seventeen times its zenith, against
  // the two or three a clear sky actually shows, and multiple scattering was two
  // thirds of the radiance at every elevation. Since that term is the one whose
  // spectrum is deliberately flattened, the sky came out pale and nearly neutral
  // — B/R 1.1 measured on a capture where the zenith should be past 2 — and the
  // lower dome, which is most of what a street frame contains, read as haze. The
  // same dome is baked into the IBL, so open shade received white light and the
  // frame lost its warm/cool separation: measured on a street, shaded ground came
  // back *warmer* than sunlit ground.
  //
  // Physically the reason is simple. Light that has scattered many times has also
  // been absorbed and re-scattered many times, so the radiance approaches the
  // source rather than growing without bound. An exponential approach to a
  // limiting path length is the standard cheap stand-in and matches the linear
  // form for short paths, so the zenith — where the term is honest — is unchanged
  // while the horizon comes down by an order of magnitude.
  float msPath = MS_PATH_LIMIT * (1.0 - exp(-msDepth / MS_PATH_LIMIT));
  vec3 multiScatter = msCoeff * uSunIntensity * (0.045 + uTurbidity * 0.0105)
                    * smoothstep(-0.28, 0.30, sunDir.y);
  inscatter += multiScatter * msPath * mix(exp(-tauSun), vec3(1.0), 0.45);

  // Aerosol whitening. Haze is spectrally flat and concentrated in the lowest
  // kilometre, so the band just above the horizon desaturates and brightens
  // well before the reddening of a low sun takes over.
  //
  // At the gain this started on it was a fifth of the horizon's radiance and the
  // warmest thing in the dome, which is a dust storm rather than a clear morning
  // with dust in it. Cut to the point where it tints the band without deciding
  // its brightness — the horizon's level belongs to the scattering terms above.
  float lowBand = exp(-max(dir.y, 0.0) * 7.5);
  inscatter += uHazeColor * uSunIntensity * uMieCoeff * 2.2 * lowBand
             * smoothstep(-0.1, 0.25, sunDir.y) * exp(-tauSun * 0.6);

  // Ground bounce below the horizon. Sunlight off sand, so it carries the beam's
  // colour as well as the terrain's.
  float below = smoothstep(0.06, -0.18, dir.y);
  vec3 groundColor = uGroundAlbedo * uSunTint * uSunIntensity * 0.075 * max(sunDir.y, 0.0);
  inscatter = mix(inscatter, groundColor, below);

  // Environment-probe-only bounce terms.
  //
  // A probe standing in a street does not see a clean sky dome. Half its
  // hemisphere is sunlit ground and a large share of the rest is the facades
  // opposite — both warm, high-albedo surfaces. Baking only the sky means every
  // up-facing surface in shade receives pure Rayleigh-blue skylight, which is
  // why interior floors come out navy no matter how the grade is tuned.
  // The level it is baked at decides the frame's warm/cool separation, and it was
  // set high enough to invert it: measured on a street, the darkest quarter of the
  // frame came back *warmer* than the sunlit quarter, because half of every
  // shaded surface's fill was sand-coloured bounce. Sunlit sand really does throw
  // a lot of warm light around a desert town, but a shaded facade still has to
  // read cooler than the wall opposite it or the image stops looking lit.
  //
  // Three things were wrong with it rather than its level, and switching it out
  // entirely moved a shaded facade a third of the way across the warm/cool axis,
  // so it was most of what stopped open shade reading as skylit. The mix took
  // seventy per cent of the sky *away* in the directions it applied to, which is
  // right below the horizon line and wrong above it; it applied from twenty
  // degrees *above* the horizon downward, so it replaced sky with ground over a
  // third of the upper hemisphere that a wall integrates; and it carried the
  // terrain albedo's full saturation, when two bounces off mineral dust flatten
  // the spectrum considerably.
  if (uEnvBounce > 0.001) {
    float bounceLum = dot(uGroundAlbedo, vec3(0.2126, 0.7152, 0.0722));
    vec3 bounceHue = mix(uGroundAlbedo, vec3(bounceLum), 0.40);
    vec3 bounce = bounceHue * uSunTint * uSunIntensity * 0.070 * max(sunDir.y, 0.05);
    float downward = smoothstep(0.12, -0.5, dir.y);
    inscatter = mix(inscatter, inscatter * 0.52 + bounce, downward * uEnvBounce);
    // Facade bounce: present over the whole sphere, weighted for a town.
    inscatter += bounce * 0.085 * uEnvBounce;
  }

  return inscatter;
}

vec3 sunDisc(vec3 dir, vec3 sunDir) {
  float cosAngle = dot(dir, sunDir);
  float atmo = exp(-max(0.0, 1.0 - sunDir.y) * 2.4);

  // Aureole: forward-scattered light in the few degrees around the disc. It is
  // what makes a sun read as a source embedded in air rather than as a decal,
  // and it feeds the bloom chain far more gracefully than the disc alone.
  float ang = acos(clamp(cosAngle, -1.0, 1.0));
  float aureole = exp(-ang * 34.0) * 3.0 + exp(-ang * 8.0) * 0.16;
  vec3 warm = mix(vec3(1.0), vec3(1.0, 0.72, 0.42), 1.0 - clamp(sunDir.y * 3.0, 0.0, 1.0));
  vec3 glow = warm * uSunIntensity * aureole * (0.35 + uTurbidity * 0.10) * atmo;

  float cosRadius = cos(uSunAngularRadius);
  if (cosAngle < cosRadius) return glow;

  // Limb darkening (Hestroffer & Magnan coefficients).
  float t = clamp((cosAngle - cosRadius) / max(1.0 - cosRadius, 1e-6), 0.0, 1.0);
  float mu = sqrt(max(t, 0.0));
  vec3 u = vec3(1.0);
  vec3 a = vec3(0.397, 0.503, 0.652);
  vec3 factor = 1.0 - u * (1.0 - pow(vec3(mu), a));

  return glow + factor * uSunIntensity * 190.0 * atmo;
}

/**
 * Coverage field sample: x = signed margin above the threshold, y = thickness.
 *
 * Returning a thickness alongside the mask instead of only the mask is what
 * gives the deck any volume: both the optical depth toward the sun and the
 * in-scatter buildup need to know *how much* cloud is present, and a mask that
 * saturates at the first opaque texel makes a 2 km-deep core shade identically
 * to a wisp. That is exactly what turns a flat cloud plane into grey smears.
 *
 * The threshold is centred on the noise distribution rather than set to
 * "1 - coverage": fbm is roughly Gaussian about 0.5 with a standard deviation
 * near 0.12, so a literal "1 - coverage" cut sits several sigma into the tail
 * and produces a nearly empty sky at any sane coverage value.
 *
 * Closure switches the thickness over to the field's own spread. A broken deck
 * is thick in proportion to how far it clears its threshold, but a stratus
 * ceiling never clears one at all: at overcast coverage the threshold sits more
 * than two sigma below the mean, so the margin is large and near-constant and
 * the whole ceiling would shade as one saturated slab, while the one per cent
 * of the field still below the cut punches blue holes through it. Measuring
 * thickness against the distribution instead keeps a closed deck opaque
 * everywhere and still lets it thin and brighten in patches, which is the
 * entire visual signature of overcast.
 */
vec2 cloudSample(vec2 uv, vec3 field, float coverage, float closure) {
  float base = fbm(vec3(uv * 3.2 + field.xy, uTime * 0.006), 4);
  float threshold = 0.5 + (0.5 - coverage) * 0.44 + field.z;
  float margin = base - threshold;
  float thick = mix(clamp(margin / 0.17, 0.0, 1.0),
                    0.18 + 0.82 * smoothstep(0.18, 0.86, base), closure);
  return vec2(margin, thick);
}

/**
 * Low-frequency displacement of the coverage domain.
 *
 * Thresholding an unwarped fbm produces silhouettes whose curvature is the same
 * everywhere, which is what makes a cloud deck read as torn paper. Warping the
 * domain first bends the contours into the lobed, cauliflower outline a real deck
 * has and breaks up the banding, for the cost of two coarse noise lookups.
 *
 * The third channel is a coverage modulation. A globally constant threshold puts
 * the same amount of cloud everywhere, which is what makes a procedural deck
 * read as wallpaper; real decks clump into banks with clear lanes between them,
 * and that large-scale organisation is most of what the eye uses to judge a sky.
 *
 * The displacement amplitude has to stay well under the warp field's own
 * wavelength. The warp is sampled at 1.6 cycles per uv unit, so its features
 * span about 0.6 uv; displacing by +-0.48 of a unit makes the Jacobian of the
 * mapping fold over itself, and a folded domain smears the coverage field into
 * long filaments along the fold lines. That is what produced the streaked,
 * brush-stroke deck — it looked like perspective stretch or temporal smearing,
 * but it survived both a static camera and a static sky.
 *
 * Sampled once per pixel and reused for the whole sun march: the march offsets
 * span a few thousandths of a uv unit against fields that vary over tenths, so
 * re-evaluating them per step would cost five times as much to return the same
 * numbers.
 */
vec3 cloudField(vec2 uv) {
  float wx = fbm(vec3(uv * 1.6, uTime * 0.004), 2);
  float wy = fbm(vec3(uv * 1.6 + vec2(5.2, 1.3), uTime * 0.004), 2);
  float clump = fbm(vec3(uv * 1.1 + vec2(2.7, 8.1), uTime * 0.002), 2);
  // The coverage fbm has a standard deviation near 0.12, so a threshold swing of
  // +-0.11 is most of a sigma: enough to open genuinely clear lanes between
  // genuinely dense banks. Anything much weaker leaves the deck evenly spread,
  // which is the difference between a sky and wallpaper.
  //
  // It has to relax as the deck closes over, though. An overcast ceiling is one
  // continuous sheet; keeping the banking at full strength there punched blue
  // holes through it and the result read as cottage cheese rather than as stratus.
  float banking = mix(0.22, 0.045, smoothstep(0.62, 0.95, uCloudCoverage));
  return vec3((vec2(wx, wy) - 0.5) * 0.26, (clump - 0.5) * banking);
}

/**
 * Two-layer cloud deck: cumulus plus high cirrus.
 *
 * The deck is a flat plane rather than a volume, so the volume has to come
 * from the shading: optical depth toward the sun is accumulated with a short
 * march through the coverage field, and the result is fed through Beer's law
 * plus a powder term. That combination is what produces the bright top / dark
 * base and the silver-lined rim that make a cloud read as three-dimensional.
 * A single-tap gradient — which is what a two-sample difference amounts to —
 * only ever produces flat grey smears.
 */
vec4 clouds(vec3 dir, vec3 sunDir) {
  if (dir.y < 0.005) return vec4(0.0);

  vec2 windLow = vec2(uTime * uCloudSpeed * 0.006, uTime * uCloudSpeed * 0.0022);
  vec2 windHigh = vec2(uTime * uCloudSpeed * 0.0016, uTime * uCloudSpeed * 0.0009);

  // Cloud plane intersection, with the distance growth deliberately softened.
  //
  // A true plane puts the intersection at h/sin(elevation), and because the
  // coverage field is sampled on that plane the field inherits the same
  // anisotropy: the ratio of a shape's angular width to its angular height is
  // sin(2*elevation)/2, so a cumulus thirty degrees up is drawn two and a third
  // times wider than tall and one fifteen degrees up nearly six times. That is
  // geometrically honest and it is also why the deck read as horizontal brush
  // strokes, because a thin plane has no vertical structure to carry the
  // foreshortening the way real cloud does. Raising sin(elevation) to a fractional
  // power keeps the deck converging toward the horizon while holding the worst
  // aspect ratio near two.
  float t = uCloudHeight / pow(max(dir.y, 0.004), 0.45);
  vec3 p = dir * t;

  // Scaled so the coverage field runs through roughly eight cells between the
  // zenith and the horizon, which puts a cumulus at about ten degrees across.
  vec2 uvLow = p.xz * 0.00044 + windLow;
  vec2 uvHigh = p.xz * 0.00014 + windHigh;

  // Distance-of-field term for the projection. 1/dir.y reaches 250 at one degree
  // up, so the deck's features shrink below a pixel long before the horizon and
  // the noise aliases. Freezing the domain instead — the obvious fix — makes the
  // field a function of azimuth alone, which draws it as vertical bars; that was
  // the picket fence standing above the rooftops at dusk. Collapsing the field
  // toward its own mean is the honest answer, because a deck a hundred
  // kilometres out really is a featureless band.
  float stretch = 1.0 / max(dir.y, 0.004);
  float lod = smoothstep(16.0, 55.0, stretch);

  // Allowed above 1: the threshold shift is only 0.44 of a unit per unit of
  // coverage against a field whose standard deviation is 0.12, so a literal 1.0
  // still leaves a tenth of the sky open and an overcast ceiling needs to be
  // closed. The mixes below want the true cloud fraction, so they clamp.
  float coverage = uCloudCoverage;
  float covMean = min(coverage, 1.0);
  vec3 field = cloudField(uvLow);
  // How far the deck has closed into a continuous ceiling.
  float closure = smoothstep(0.92, 1.10, coverage);
  vec2 cs = cloudSample(uvLow, field, coverage, closure);
  float margin = cs.x;

  // Opacity saturates within a few field units of the threshold; depth keeps
  // growing well past it. Separating them is what lets a rim be translucent and
  // bright while the core two hundred metres inside it is opaque and dark.
  float cover = mix(smoothstep(-0.012, 0.070, margin), 1.0, closure);
  float depth = cs.y;

  // Erosion detail is sampled against the view direction rather than the
  // projected plane. Even at moderate elevations the plane's uv is several times
  // coarser vertically than horizontally, so a fixed frequency there erodes
  // silhouettes into horizontal combing. Angular sampling keeps the erosion the
  // same size in every direction, which is what reads as cauliflower rather than
  // as a torn edge.
  float detail = fbm(dir * 34.0 + vec3(uvLow.x * 4.0, uTime * 0.02, uvLow.y * 4.0), 3);
  // Erode the silhouette, not the interior: a cumulus is wispy at its edges and
  // solid in the middle, and eroding uniformly is what produces the mottled
  // marbled look instead of cauliflower.
  //
  // A closed ceiling has no silhouette to erode, and a thin patch of stratus is
  // still opaque, so erosion has to stand down as the deck closes or it reopens
  // the holes the closure term exists to seal.
  float rim = 1.0 - depth;
  float erode = (1.0 - lod) * (1.0 - closure);
  cover *= 1.0 - smoothstep(0.50, 0.95, detail) * 0.55 * rim * erode;
  depth *= 1.0 - smoothstep(0.42, 1.0, detail) * 0.30 * (1.0 - lod);

  // Blend to the field averages once a pixel spans many cloud widths. The
  // coverage value is the fraction of sky the threshold was chosen to fill, so
  // it is also the expectation of the cover term.
  cover = mix(cover, covMean, lod);
  depth = mix(depth, covMean * 0.55, lod);

  // Cirrus sits three times higher than the cumulus deck, so on a projected
  // plane its domain is stretched three times as hard and it thresholds into
  // the long bright wisps that read as brush strokes rather than as ice cloud.
  // Half the domain is taken from the view direction instead, which is scale-free
  // and costs nothing, and the rest fades out with the same distance term as the
  // deck below it.
  float cirrus = fbm(vec3(uvHigh * 3.0 + dir.xz * 1.6, uTime * 0.004 + dir.y * 2.0), 4);
  cirrus = smoothstep(0.55, 0.90, cirrus) * 0.22
         * smoothstep(0.02, 0.28, dir.y) * (1.0 - lod * 0.8);

  float cumulus = clamp(cover * uCloudDensity, 0.0, 1.0);
  float density = clamp(cumulus + cirrus * (1.0 - cumulus), 0.0, 1.0);
  // Fade the deck into the horizon haze. Cutting the deck off seven degrees up
  // leaves an empty pale band all the way round the frame, which reads as a seam
  // rather than as distance, so the fade starts below the horizon line and the
  // haze term above is what actually hides the base of the deck.
  density *= smoothstep(0.004, 0.075, dir.y);

  if (density <= 0.002) return vec4(0.0);

  // ---- optical depth toward the sun ----
  // Step length grows as the sun drops, because the slant path through a deck
  // of fixed thickness lengthens with 1/sin(elevation).
  //
  // The absolute length matters more than anything else in this function. The
  // coverage field is sampled at 3.2 cycles per uv unit, so one cloud is about
  // 0.31 uv across; a march that covers a couple of per cent of that samples
  // the shading point over again and the deck ends up shaded by its own
  // thickness alone, which is radially symmetric — a uniform blob with a glow
  // round the rim, lit from nowhere. Reaching a third to three quarters of a
  // cloud width is what puts the bright side toward the sun and the dark side
  // away from it, and directional shading is most of what separates cloud from
  // cotton wool. The slant clamp keeps a low sun from marching past the
  // neighbouring cloud and shadowing this one with an unrelated bank.
  float slant = 1.0 / clamp(abs(sunDir.y) + 0.38, 0.38, 1.0);
  vec2 sunStep = normalize(sunDir.xz + vec2(1e-5)) * 0.024 * slant;
  float toward = 0.0;
  for (int i = 1; i <= 4; i++) {
    toward += cloudSample(uvLow + sunStep * float(i), field, coverage, closure).y
            * (5.0 - float(i));
  }
  toward /= 10.0;
  toward = mix(toward, covMean * 0.55, lod);

  // Optical depth along the sun ray. Scaling by this sample's own depth as well
  // as the depth toward the sun is what makes the shading *relative*: a uniform
  // deck shadowed by an absolute accumulation just goes uniformly grey, which is
  // the artefact this whole pass exists to avoid.
  // Self-shadowing gain. A broken cumulus field needs a lot of it — the dark
  // base against the bright top is most of what makes a cloud read as a solid
  // object — but a closed deck needs very little, because a stratus ceiling
  // varies by well under a stop between its brightest and dullest patch and
  // shadowing it hard turns it into a blotchy sheet.
  float tauGain = mix(6.2, 2.1, smoothstep(0.62, 0.95, coverage));
  float tau = toward * depth * uCloudDensity * tauGain;

  // Beer's law only describes the unscattered beam. Once a deck is optically
  // thick, essentially every photon reaching its base has scattered many times,
  // and multiple scattering falls off as a power law rather than exponentially.
  // Using the exponential alone is why a thick overcast deck came out as a
  // high-contrast blotchy sheet: exp() spans a factor of four across the small
  // depth variation of a stratus layer, where the real thing varies by well
  // under two, and it predicts a near-black ceiling instead of the luminous grey
  // one that is the whole visual signature of overcast.
  float transmit = max(exp(-tau), 1.0 / (1.0 + tau * 1.5));

  // In-scatter buildup. Radiance a short way inside an illuminated boundary has
  // not accumulated its full multiple-scattering contribution yet, so shallow
  // cloud is dimmer than transmittance alone predicts. Applied at full strength
  // this outlines every cloud in grey, so it is deliberately shallow.
  float buildup = mix(0.72, 1.0, 1.0 - exp(-depth * 3.4));

  float cosTheta = dot(dir, sunDir);
  // Two lobes: a tight forward lobe for the silver lining, a broad one for the
  // general brightening across the sunward half of the sky.
  //
  // Both have to be bounded far more tightly than the phase function alone
  // suggests, and what sets the bound is the display transform rather than the
  // physics. A sunlit cumulus top is about three times the radiance of sunlit
  // plaster — albedo 0.85 against 0.35 — which is where a daylight frame's top
  // end comes from and is already most of the way up the shoulder. An unbounded
  // Mie peak is another twenty times that, and at 0.487 exposure it arrives
  // eight times past the white point: measured on the alley frame, 2.7% of
  // pixels sat at full white with a further 1.7% inside the shoulder's last two
  // percent, and every one of them was sky. A cloud field that clips is not a
  // bright cloud field, it is a cloud field with no modelling in it — the flat
  // white plate with an amber fringe round it is the loudest amateur tell in an
  // outdoor frame.
  //
  // Forward scattering is also a *single*-scattering effect. A deck thick enough
  // to be opaque has scrambled the beam long before it leaves, so the peak
  // belongs to the optically thin rim, which is exactly where a silver lining
  // is. Gating on depth keeps the lobe where it can be justified and takes it
  // off the cloud bodies, which is what leaves them room to be modelled.
  float thinness = 1.0 - smoothstep(0.06, 0.60, depth);
  float silver = min(miePhase(cosTheta, 0.82) * 0.55, 1.35) * (0.30 + 0.70 * thinness)
               + miePhase(cosTheta, 0.36) * 0.50;
  float sunUp = smoothstep(-0.18, 0.22, sunDir.y);

  // The beam that reaches the deck, plus the extra reddening of a slant path at
  // low sun — cloud tops are lit obliquely, so they go orange while the sun is
  // still well clear of the horizon.
  //
  // This used to be an independent elevation ramp rather than the level's own sun
  // colour, and the two disagreed by 25% in blue at mid-morning. Since a sunlit
  // cumulus top is the brightest thing in a daylight frame and around half of the
  // ambient the IBL delivers, that made the deck read as a separate white sky
  // pasted behind a warm town, and it diluted the frame's warm/cool separation at
  // the source: shade lit by neutral cloud cannot read cool.
  //
  // Taken at only part strength, because the level's sun colour is the beam
  // that arrives at the *street*, and a deck at a kilometre and a half is not
  // standing at the bottom of the same path. Most of a desert's aerosol sits in
  // the boundary layer under the cloud base, so the deck sees a sun that has
  // been through the Rayleigh column and very little of the dust.
  //
  // It is worth the two lines because the deck is around a third of the dome's
  // radiance and comfortably its brightest part, so its hue sets the ambient for
  // the whole level. Measured on the desert morning, the cloud contribution came
  // back at a blue-to-red of 0.76 against clear sky's 1.28, which dragged the
  // cosine-weighted upper irradiance to 0.91 — a surface facing a blue sky was
  // receiving warm light. Nothing in shade could then read cool, and no amount
  // of split-toning downstream puts back a separation the lighting never had.
  //
  // Faded out for a low sun, where taking it cost more than it was worth. At
  // golden hour the beam runs a long slant path through every layer, not just
  // through the one under the deck, so the deck is genuinely close to the
  // colour the street sees — and the frame wants those cloud tops orange. The
  // problem this solves is a daylight one.
  vec3 highSun = mix(uSunTint, vec3(1.0), 0.45 * smoothstep(0.05, 0.35, sunDir.y));
  vec3 sunTint = highSun * mix(vec3(1.0, 0.88, 0.74), vec3(1.0),
                               clamp(sunDir.y * 2.5, 0.0, 1.0));

  // Direct sun through the deck. A sunlit cumulus top is the brightest diffuse
  // thing in an outdoor frame by a wide margin: albedo near 0.85 against sunlit
  // plaster's 0.35, so it sits a stop and a half above the brightest ground
  // surface and is where a daylight frame's highlight range comes from. Scaled
  // to a mid grey instead, the whole image loses its top end and the deck reads
  // as painted card.
  vec3 direct = sunTint * uSunIntensity * 0.30
              * (0.55 + silver) * transmit * buildup * sunUp;

  // Sky fill from above: the top of a cloud sees the whole dome, the base sees
  // much less of it, so the ambient term is occluded by depth as well — but not
  // to zero, because the base of a deck is still lit from the sides and by the
  // same multiple scattering the transmittance term accounts for.
  //
  // Weighted against the direct term rather than set by eye: a cumulus top is a
  // near-Lambertian body of albedo 0.9, and the diffuse sky irradiance falling
  // on it at mid-morning is a fifth of the direct beam's, not the eleventh this
  // was delivering. Getting the ratio wrong is what let the sun's tint run the
  // deck's hue unopposed.
  float skyOcclusion = mix(1.0, 0.26, depth);
  vec3 skyFill = mix(vec3(0.52, 0.62, 0.82), vec3(0.72, 0.74, 0.80), 0.35)
               * uSunIntensity * 0.055 * skyOcclusion
               * (0.30 + 0.70 * smoothstep(-0.2, 0.5, sunDir.y));

  // Warm bounce off the ground into the cloud base.
  vec3 groundFill = uGroundAlbedo * uSunIntensity * 0.024 * max(sunDir.y, 0.0)
                  * smoothstep(0.5, 0.0, dir.y);

  vec3 color = uCloudTint * (direct + skyFill + groundFill);

  // Thin cirrus is optically shallow, so it stays close to the incident light
  // instead of self-shadowing.
  float thin = cirrus * (1.0 - cumulus) / max(density, 1e-4);
  color = mix(color, uCloudTint * sunTint * uSunIntensity * 0.10 * (0.5 + silver * 0.5) * sunUp,
              thin * 0.75);

  return vec4(color, density);
}

void main() {
  vec3 dir = normalize(vWorldDirection);
  vec3 sunDir = normalize(uSunDirection);

  vec3 color = atmosphere(dir, sunDir);
  color += sunDisc(dir, sunDir) * uDiscGain;

  if (uStarIntensity > 0.001 && dir.y > 0.0) {
    // Gated on the preset, not on sun elevation. The night preset drives this
    // shader with the *moon* as its light source, at 34 degrees above the
    // horizon — keying star visibility off "sunDir.y < 0" therefore hid the
    // starfield on the one preset that needs it, leaving a featureless black
    // dome over half the frame.
    float s = hash13(floor(dir * 620.0));
    float star = smoothstep(0.9968, 1.0, s);
    // Magnitude distribution from a single field. Real starfields are dominated
    // by a handful of bright points among many faint ones, and it is that
    // hierarchy — not the density — that separates stars from sensor noise. A
    // second, coarser field instead gives multi-pixel blobs that read as snow.
    float mag = star * (0.35 + 2.6 * star * star * star);
    float twinkle = 0.65 + 0.35 * sin(uTime * 3.1 + s * 90.0);
    // Atmospheric extinction toward the horizon.
    float alt = smoothstep(0.0, 0.30, dir.y);
    // Scaled by the preset's own radiance so the field tracks the exposure the
    // lighting solver picks instead of needing a matching constant here.
    color += vec3(mag) * twinkle * uStarIntensity * uSunIntensity * alt * 0.17;
  }

  vec4 cl = clouds(dir, sunDir);
  color = mix(color, cl.rgb, cl.a);

  // Horizon haze band. Confined to the last few degrees and tinted by the sun's
  // own colour, so it obscures the base of distant geometry without bleaching
  // the reddening that the scattering model already produces above it.
  float horizon = 1.0 - smoothstep(0.0, 0.14, abs(dir.y));
  float sunward = pow(max(dot(dir, normalize(vec3(sunDir.x, 0.0, sunDir.z) + 1e-5)), 0.0), 3.0);
  vec3 hazeLit = uHazeColor * uSunIntensity * 0.055
               * (0.30 + 0.70 * smoothstep(-0.12, 0.30, sunDir.y));
  color = mix(color, hazeLit, clamp(horizon * uHazeAmount * (0.35 + sunward * 0.45), 0.0, 0.85));

  gl_FragColor = vec4(max(color * uExposure, 0.0), 1.0);
}
`;

export interface SkyPreset {
  name: string;
  /** Sun elevation in degrees above the horizon. */
  elevation: number;
  /** Sun azimuth in degrees, 0 = +Z. */
  azimuth: number;
  turbidity: number;
  rayleigh: THREE.Vector3;
  mieCoeff: number;
  mieG: number;
  sunIntensity: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudTint: THREE.Color;
  hazeAmount: number;
  hazeColor: THREE.Color;
  groundAlbedo: THREE.Color;
  starIntensity: number;
}

export const SKY_PRESETS: Record<string, SkyPreset> = {
  /** Hard mid-morning desert light: long shadows, deep blue zenith. */
  desertMorning: {
    name: 'desertMorning',
    elevation: 26,
    azimuth: 33,
    turbidity: 3.4,
    rayleigh: new THREE.Vector3(0.0058, 0.0135, 0.0331),
    mieCoeff: 0.0042,
    mieG: 0.78,
    sunIntensity: 22,
    cloudCoverage: 0.34,
    cloudDensity: 0.92,
    cloudTint: new THREE.Color(1.0, 0.98, 0.95),
    hazeAmount: 0.44,
    hazeColor: new THREE.Color(0.86, 0.78, 0.66),
    groundAlbedo: new THREE.Color(0.42, 0.34, 0.24),
    starIntensity: 0,
  },
  /** Overcast urban: soft wraparound light, muted palette. */
  overcast: {
    name: 'overcast',
    elevation: 42,
    azimuth: 210,
    turbidity: 8.5,
    rayleigh: new THREE.Vector3(0.0058, 0.0135, 0.0331),
    mieCoeff: 0.019,
    mieG: 0.62,
    sunIntensity: 9,
    cloudCoverage: 1.12,
    cloudDensity: 1.0,
    cloudTint: new THREE.Color(0.86, 0.88, 0.92),
    hazeAmount: 0.85,
    hazeColor: new THREE.Color(0.7, 0.73, 0.78),
    groundAlbedo: new THREE.Color(0.22, 0.22, 0.23),
    starIntensity: 0,
  },
  /** Golden hour: the classic COD campaign key art look. */
  goldenHour: {
    name: 'goldenHour',
    elevation: 7.5,
    azimuth: 285,
    turbidity: 4.6,
    rayleigh: new THREE.Vector3(0.0062, 0.0142, 0.0348),
    mieCoeff: 0.0072,
    mieG: 0.82,
    sunIntensity: 23,
    cloudCoverage: 0.52,
    cloudDensity: 1.0,
    cloudTint: new THREE.Color(1.0, 0.9, 0.78),
    hazeAmount: 0.9,
    hazeColor: new THREE.Color(1.0, 0.72, 0.44),
    groundAlbedo: new THREE.Color(0.35, 0.28, 0.2),
    starIntensity: 0,
  },
  /** Night raid with moonlight standing in for the sun. */
  night: {
    name: 'night',
    elevation: 34,
    azimuth: 62,
    turbidity: 2.2,
    rayleigh: new THREE.Vector3(0.0068, 0.0148, 0.0362),
    mieCoeff: 0.0026,
    mieG: 0.7,
    sunIntensity: 0.42,
    cloudCoverage: 0.35,
    cloudDensity: 0.55,
    // Far below the moon's own colour, and deliberately so. The ambient solver
    // scales the whole dome up by three and a half to get a workable amount of
    // fill out of a sky whose measured radiance is a hundredth of the morning's,
    // and the cloud deck rides that scale too — which put moonlit cloud tops two
    // stops over the sunlit key surface and made them read as paper cut-outs
    // pinned to the sky.
    cloudTint: new THREE.Color(0.19, 0.23, 0.33),
    hazeAmount: 0.4,
    hazeColor: new THREE.Color(0.2, 0.26, 0.4),
    groundAlbedo: new THREE.Color(0.1, 0.11, 0.14),
    starIntensity: 1,
  },
};

export function sunDirectionFrom(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  ).normalize();
}

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly sunDirection = new THREE.Vector3(0, 1, 0);
  private preset: SkyPreset;

  constructor(preset: SkyPreset = SKY_PRESETS.desertMorning) {
    this.preset = preset;
    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunIntensity: { value: preset.sunIntensity },
        uSunTint: { value: new THREE.Vector3(1, 1, 1) },
        uSunAngularRadius: { value: THREE.MathUtils.degToRad(0.29) },
        uRayleighCoeff: { value: preset.rayleigh.clone() },
        uMieCoeff: { value: preset.mieCoeff },
        uMieG: { value: preset.mieG },
        uTurbidity: { value: preset.turbidity },
        uAtmosphereThickness: { value: 1.0 },
        uGroundAlbedo: {
          value: new THREE.Vector3(
            preset.groundAlbedo.r, preset.groundAlbedo.g, preset.groundAlbedo.b,
          ),
        },
        uExposure: { value: 1 },
        uTime: { value: 0 },
        uCloudCoverage: { value: preset.cloudCoverage },
        uCloudDensity: { value: preset.cloudDensity },
        uCloudHeight: { value: 2600 },
        uCloudSpeed: { value: 1 },
        uCloudTint: { value: new THREE.Vector3(preset.cloudTint.r, preset.cloudTint.g, preset.cloudTint.b) },
        uHazeAmount: { value: preset.hazeAmount },
        uHazeColor: { value: new THREE.Vector3(preset.hazeColor.r, preset.hazeColor.g, preset.hazeColor.b) },
        uStarIntensity: { value: preset.starIntensity },
        uEnvBounce: { value: 0 },
        uDiscGain: { value: 1 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });

    const geo = new THREE.SphereGeometry(1, 48, 32);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(2000);
    this.mesh.matrixAutoUpdate = true;

    this.applyPreset(preset);
  }

  applyPreset(preset: SkyPreset): void {
    this.preset = preset;
    const u = this.material.uniforms;
    this.sunDirection.copy(sunDirectionFrom(preset.elevation, preset.azimuth));
    (u.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
    u.uSunIntensity.value = preset.sunIntensity;
    (u.uRayleighCoeff.value as THREE.Vector3).copy(preset.rayleigh);
    u.uMieCoeff.value = preset.mieCoeff;
    u.uMieG.value = preset.mieG;
    u.uTurbidity.value = preset.turbidity;
    u.uCloudCoverage.value = preset.cloudCoverage;
    u.uCloudDensity.value = preset.cloudDensity;
    (u.uCloudTint.value as THREE.Vector3).set(preset.cloudTint.r, preset.cloudTint.g, preset.cloudTint.b);
    u.uHazeAmount.value = preset.hazeAmount;
    (u.uHazeColor.value as THREE.Vector3).set(preset.hazeColor.r, preset.hazeColor.g, preset.hazeColor.b);
    (u.uGroundAlbedo.value as THREE.Vector3).set(
      preset.groundAlbedo.r, preset.groundAlbedo.g, preset.groundAlbedo.b,
    );
    u.uStarIntensity.value = preset.starIntensity;
  }

  get current(): SkyPreset {
    return this.preset;
  }

  /**
   * Scales the dome's absolute radiance.
   *
   * The alternative — leaving the dome alone and scaling only the IBL — makes
   * the sky you *see* a different sky from the one that lights the level. On
   * overcast that shows up immediately: the deck has to be the brightest thing
   * in the frame, because a diffuse dome of radiance L delivers PI*L of
   * irradiance and a 0.35-albedo ground can only return 0.35*L of it. Scaling
   * both from one number keeps that relationship intact by construction.
   */
  setRadianceScale(scale: number): void {
    this.material.uniforms.uExposure.value = scale;
  }

  /**
   * Hands the dome the same beam colour the level's directional light uses.
   *
   * Normalised to red so it only ever redistributes the beam's spectrum; its
   * level stays with `uSunIntensity`, which the preset owns.
   */
  setSunTint(color: THREE.Color): void {
    const peak = Math.max(color.r, color.g, color.b, 1e-4);
    (this.material.uniforms.uSunTint.value as THREE.Vector3).set(
      color.r / peak,
      color.g / peak,
      color.b / peak,
    );
  }

  setSunAngles(elevationDeg: number, azimuthDeg: number): void {
    this.sunDirection.copy(sunDirectionFrom(elevationDeg, azimuthDeg));
    (this.material.uniforms.uSunDirection.value as THREE.Vector3).copy(this.sunDirection);
  }

  update(elapsed: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uTime.value = elapsed;
    this.mesh.position.copy(cameraPosition);
  }

  /**
   * Renders the sky into a cubemap and PMREM-filters it into an environment
   * map. Called on load and whenever the sun moves appreciably — it is far too
   * expensive to run every frame, and the sky changes slowly enough that it
   * does not need to.
   */
  generateEnvironment(renderer: THREE.WebGLRenderer, size = 256): THREE.Texture {
    const cubeRT = this.renderProbe(renderer, size);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const env = pmrem.fromCubemap(cubeRT.texture);
    pmrem.dispose();
    cubeRT.dispose();

    env.texture.name = 'skyEnvironment';
    return env.texture;
  }

  /**
   * Irradiance the environment delivers to an up-facing surface, divided by PI.
   *
   * This sky's absolute radiance spans more than two orders of magnitude
   * between mid-morning and moonlight, so no downstream level — ambient
   * intensity, exposure, aerial perspective — can be authored as a constant
   * without being wrong on three presets out of four. Measuring the probe once
   * per lighting change lets all of them be authored as *ratios* instead, which
   * is what makes every time of day meter to the same place on the tone curve.
   *
   * The quantity has to be the cosine-weighted upper-hemisphere mean rather than
   * a plain solid-angle mean over the sphere, even though the two agree for a
   * uniform dome, because the caller solves the dome's *level* from it. A plain
   * mean makes that solve depend on how the dome's energy is distributed in
   * elevation: it counts a horizon texel — which grazes an up-facing surface and
   * lights it barely at all — as heavily as one overhead, and it counts the
   * probe's below-horizon bounce, which lights nothing facing up. Reshaping the
   * dome then moves the ambient level even when the light arriving at the ground
   * has not changed. Cutting the horizon glow by a factor of five brightened the
   * zenith and the cloud tops by a fifth for exactly that reason.
   *
   * Dividing by PI expresses it as the radiance of the uniform dome that would
   * deliver the same irradiance, which is the form the level solve wants and is
   * why the two definitions coincide for a uniform sky.
   *
   * Synchronous readback, so this only ever runs alongside the (far more
   * expensive) environment bake it accompanies, never on a normal frame.
   */
  measureRadiance(renderer: THREE.WebGLRenderer, size = 16): THREE.Color {
    const fallback = new THREE.Color(0.35, 0.42, 0.58);
    // Always measured at unit scale so the caller can solve for the scale it
    // wants without the previous solution feeding back into the measurement.
    const prevScale = this.material.uniforms.uExposure.value as number;
    this.material.uniforms.uExposure.value = 1;
    const rt = this.renderProbe(renderer, size, 0);
    this.material.uniforms.uExposure.value = prevScale;
    const buf = new Uint16Array(size * size * 4);
    let r = 0;
    let g = 0;
    let b = 0;
    let wsum = 0;
    try {
      for (let face = 0; face < 6; face++) {
        renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf, face);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const u = ((x + 0.5) / size) * 2 - 1;
            const v = ((y + 0.5) / size) * 2 - 1;
            // Cube texels subtend very different solid angles — a face corner
            // is nearly five times smaller than its centre — so an unweighted
            // mean over-counts the corners and skews the result cool.
            const inv = 1 / Math.sqrt(1 + u * u + v * v);
            const solidAngle = inv * inv * inv;
            // Height of the texel's direction. Readback rows run bottom-up from
            // the framebuffer, which is the face's t = 0 edge, and the cube
            // convention puts t = 0 at the top of the face — so v = -1 is up.
            // The two pole faces are +1 and -1 outright.
            const up = face === 2 ? inv : face === 3 ? -inv : -v * inv;
            if (up <= 0) continue;
            const w = solidAngle * up;
            const i = (y * size + x) * 4;
            r += THREE.DataUtils.fromHalfFloat(buf[i]) * w;
            g += THREE.DataUtils.fromHalfFloat(buf[i + 1]) * w;
            b += THREE.DataUtils.fromHalfFloat(buf[i + 2]) * w;
            wsum += w;
          }
        }
      }
    } catch {
      rt.dispose();
      return fallback;
    }
    rt.dispose();
    if (!(wsum > 0) || !Number.isFinite(r + g + b)) return fallback;
    const mean = new THREE.Color(r / wsum, g / wsum, b / wsum);
    return mean.r + mean.g + mean.b > 1e-6 ? mean : fallback;
  }

  /** Renders the six faces of the sky dome as seen from the player. */
  private renderProbe(
    renderer: THREE.WebGLRenderer,
    size: number,
    discGain = 1,
  ): THREE.WebGLCubeRenderTarget {
    const cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT);

    const scene = new THREE.Scene();
    const clone = new THREE.Mesh(this.mesh.geometry, this.material);
    clone.frustumCulled = false;
    clone.scale.setScalar(5);
    scene.add(clone);

    const prevTarget = renderer.getRenderTarget();
    // CubeCamera renders six faces in sequence and relies on the renderer
    // clearing depth between them; the pipeline otherwise runs with
    // autoClear disabled.
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = true;
    this.material.uniforms.uEnvBounce.value = 1;
    this.material.uniforms.uDiscGain.value = discGain;
    cubeCamera.update(renderer, scene);
    this.material.uniforms.uEnvBounce.value = 0;
    this.material.uniforms.uDiscGain.value = 1;
    renderer.autoClear = prevAutoClear;
    renderer.setRenderTarget(prevTarget);
    return cubeRT;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
