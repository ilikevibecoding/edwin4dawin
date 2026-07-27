/**
 * Physical atmosphere core, shared by every sky shader.
 *
 * The model is Hillaire 2020 ("A Scalable and Production Ready Sky and
 * Atmosphere Rendering Technique") which is Bruneton's precomputed multiple
 * scattering restructured around three small LUTs instead of one large 4D
 * table:
 *
 *   1. transmittance  (256x64)  T(altitude, view zenith) to the top of the
 *                               atmosphere. Independent of the sun.
 *   2. multi-scatter  (32x32)   the isotropic multiple-scattering term
 *                               Psi_ms(altitude, sun zenith), summed to
 *                               infinite order as a geometric series.
 *   3. sky-view       (256x144) the actual sky radiance, parameterised by view
 *                               zenith and azimuth-relative-to-sun with a
 *                               sqrt mapping that concentrates texels at the
 *                               horizon, where the gradient is steepest.
 *
 * Media: Rayleigh (8 km scale height), a haze aerosol (~1.2 km, driven by
 * \`weather.haze\` to an Angstrom optical depth between 0.015 and 0.2), a mineral
 * dust aerosol (0.85 km, driven by \`weather.dust\`) and an ozone absorption layer
 * (tent profile centred at 25 km). Ozone is what keeps the zenith deep blue at
 * dusk instead of muddy grey, because it absorbs in the Chappuis band where
 * Rayleigh has already given up.
 *
 * Haze and dust share one scattering channel and one dual-lobe phase function,
 * so the forward spike stays out of the sky-view table and can be re-applied per
 * pixel; see \`phaseAerosol\`.
 *
 * Conventions:
 *   - Lengths in kilometres, the planet centred at the origin.
 *   - `cosTheta = dot(viewDir, sunDir)`: 1 means looking straight at the sun,
 *     which is the forward-scattering peak.
 *   - LUTs store radiance **per unit top-of-atmosphere irradiance** so the same
 *     table serves the sun and the moon (six orders of magnitude apart) without
 *     losing half-float precision; the caller multiplies by the body's
 *     irradiance.
 */
export const ATMOSPHERE_GLSL = /* glsl */ `
#ifndef SKY_ATMOSPHERE_INCLUDED
#define SKY_ATMOSPHERE_INCLUDED

#define PI 3.141592653589793
#define ISO_PHASE 0.0795774715459477

#define PLANET_R 6360.0
#define ATMOS_R 6460.0
#define RAYLEIGH_H 8.0
/* Nudged below the surface so ground samples do not shadow themselves. */
#define SHADOW_R 6359.99

const vec3 RAYLEIGH_SCATTER = vec3(0.005802, 0.013558, 0.033100);
const vec3 OZONE_EXTINCT = vec3(0.000650, 0.001881, 0.000085);

uniform vec3 uSunDir;
uniform vec3 uMoonDir;
/** Top-of-atmosphere irradiance in engine units (1 unit = 1 klux / 1 kilonit). */
uniform vec3 uSunIrradiance;
uniform vec3 uMoonIrradiance;

uniform vec3 uMieScatter;
uniform vec3 uMieExtinct;
uniform float uMieHeight;
uniform vec3 uDustScatter;
uniform vec3 uDustExtinct;
uniform float uDustHeight;
/** Dual-lobe aerosol phase: narrow forward g, broad tail g, forward weight. */
uniform float uAerosolG1;
uniform float uAerosolG2;
uniform float uAerosolLobe;
uniform vec3 uGroundAlbedo;
/** Camera altitude above mean sea level, kilometres. */
uniform float uCamHeightKm;

uniform sampler2D uTransLut;
uniform sampler2D uMultiLut;
uniform vec2 uTransLutSize;
uniform float uMultiLutSize;

/* ------------------------------ helpers -------------------------------- */

float sqr(float x) { return x * x; }

/** Nearest positive intersection of a ray with a sphere at the origin, else -1. */
float raySphere(vec3 o, vec3 d, float r) {
  float b = dot(o, d);
  float c = dot(o, o) - r * r;
  if (c > 0.0 && b > 0.0) return -1.0;
  float disc = b * b - c;
  if (disc < 0.0) return -1.0;
  float s = sqrt(disc);
  float t0 = -b - s;
  float t1 = -b + s;
  if (t1 < 0.0) return -1.0;
  return t0 < 0.0 ? t1 : t0;
}

float phaseRayleigh(float c) {
  return (3.0 / (16.0 * PI)) * (1.0 + c * c);
}

/** Henyey-Greenstein. g > 0 peaks toward cosTheta = 1 (looking at the sun). */
float phaseHG(float c, float g) {
  float g2 = g * g;
  float d = max(1.0 + g2 - 2.0 * g * c, 1e-4);
  return (1.0 - g2) / (4.0 * PI * d * sqrt(d));
}

/**
 * Aerosol phase: two Henyey-Greenstein lobes, a narrow forward one and a
 * near-isotropic tail.
 *
 * A single lobe cannot describe a real aerosol at all. Mie theory for
 * micron-scale particles gives a diffraction spike tens of steradians tall
 * inside a few degrees of the sun and a nearly flat tail of a few hundredths
 * everywhere else; one HG fitted to the spike smears grey light over the whole
 * sky and one fitted to the tail has no aureole. Both failures are visible: the
 * first is why an atmosphere at an honest aerosol load turns the zenith the
 * colour of dishwater, the second is why a low sun ends up a bare disc on a
 * clean gradient. Two lobes get P(0) about 15 and P(30 deg) about 0.1, which is
 * a bright tight aureole over a zenith that stays blue.
 */
float phaseAerosol(float c) {
  return mix(phaseHG(c, uAerosolG2), phaseHG(c, uAerosolG1), uAerosolLobe);
}

/* Texel-centre remaps so a LUT edge lands exactly on the parameter extreme. */
float unitToTexCoord(float x, float size) {
  return 0.5 / size + x * (1.0 - 1.0 / size);
}
float texCoordToUnit(float u, float size) {
  return (u - 0.5 / size) / (1.0 - 1.0 / size);
}
float unitToSubUv(float u, float size) {
  return (u + 0.5 / size) * (size / (size + 1.0));
}
float subUvToUnit(float u, float size) {
  return (u - 0.5 / size) * (size / (size - 1.0));
}

/* ------------------------------- medium -------------------------------- */

struct Medium {
  vec3 scatterRay;
  /** Haze aerosol plus mineral dust: one medium, one phase function. */
  vec3 scatterAerosol;
  vec3 scatterTotal;
  vec3 extinction;
};

Medium sampleMedium(float radius) {
  float h = max(radius - PLANET_R, 0.0);
  float dR = exp(-h / RAYLEIGH_H);
  float dM = exp(-h / uMieHeight);
  float dD = exp(-h / uDustHeight);
  /* Ozone: linear tent, zero below 10 km and above 40 km. */
  float dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);

  Medium m;
  m.scatterRay = RAYLEIGH_SCATTER * dR;
  m.scatterAerosol = uMieScatter * dM + uDustScatter * dD;
  m.scatterTotal = m.scatterRay + m.scatterAerosol;
  m.extinction = m.scatterRay + uMieExtinct * dM + uDustExtinct * dD + OZONE_EXTINCT * dO;
  /* Guard the divide in the analytic segment integral. */
  m.extinction = max(m.extinction, vec3(1e-9));
  return m;
}

/* -------------------------- transmittance LUT -------------------------- */

/**
 * Bruneton's (r, mu) mapping: x_mu is the distance to the top of the
 * atmosphere normalised against its range at this altitude, which keeps texels
 * dense along grazing rays where optical depth explodes.
 */
vec2 transmittanceLutUv(float r, float mu) {
  float H = sqrt(max(ATMOS_R * ATMOS_R - PLANET_R * PLANET_R, 0.0));
  float rho = sqrt(max(r * r - PLANET_R * PLANET_R, 0.0));
  float disc = r * r * (mu * mu - 1.0) + ATMOS_R * ATMOS_R;
  float d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
  float dMin = ATMOS_R - r;
  float dMax = rho + H;
  float xMu = (d - dMin) / max(dMax - dMin, 1e-6);
  float xR = rho / max(H, 1e-6);
  return vec2(unitToTexCoord(clamp(xMu, 0.0, 1.0), uTransLutSize.x),
              unitToTexCoord(clamp(xR, 0.0, 1.0), uTransLutSize.y));
}

void transmittanceLutParams(vec2 uv, out float r, out float mu) {
  float xMu = texCoordToUnit(uv.x, uTransLutSize.x);
  float xR = texCoordToUnit(uv.y, uTransLutSize.y);
  float H = sqrt(max(ATMOS_R * ATMOS_R - PLANET_R * PLANET_R, 0.0));
  float rho = H * clamp(xR, 0.0, 1.0);
  r = sqrt(rho * rho + PLANET_R * PLANET_R);
  float dMin = ATMOS_R - r;
  float dMax = rho + H;
  float d = dMin + clamp(xMu, 0.0, 1.0) * (dMax - dMin);
  mu = d == 0.0 ? 1.0 : clamp((H * H - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
}

/** Transmittance from a point at radius r toward the sun (or space). */
vec3 transmittanceToSpace(float r, float mu) {
  return texture2D(uTransLut, transmittanceLutUv(r, mu)).rgb;
}

/* --------------------------- multi-scatter LUT ------------------------- */

vec3 multiScatter(float r, float muSun) {
  vec2 uv = vec2(
    unitToTexCoord(clamp(muSun * 0.5 + 0.5, 0.0, 1.0), uMultiLutSize),
    unitToTexCoord(clamp((r - PLANET_R) / (ATMOS_R - PLANET_R), 0.0, 1.0), uMultiLutSize));
  return texture2D(uMultiLut, uv).rgb;
}

/* ---------------------------- main raymarch ---------------------------- */

/**
 * In-scattered radiance along a ray, per unit top-of-atmosphere irradiance.
 *
 * The aerosol single-scattering term comes back separately with its phase
 * function factored out (\`lumMie\`) so a caller sampling a LUT can re-apply the
 * exact value for the pixel's angle. Baking a forward lobe into a 256x144 table
 * smears the sun's aureole into a flat blob; keeping it out leaves it razor
 * sharp for free, and it is the only reason a two-degree-wide diffraction spike
 * can survive a table that coarse.
 */
struct Scatter {
  vec3 lum;
  vec3 lumMie;
  vec3 transmittance;
};

Scatter integrateScatter(
  vec3 pos, vec3 dir, vec3 sunDir, float sampleCount, float maxDistance,
  bool withGround, bool withMultiScatter, float jitter
) {
  Scatter res;
  res.lum = vec3(0.0);
  res.lumMie = vec3(0.0);
  res.transmittance = vec3(1.0);

  float tGround = raySphere(pos, dir, PLANET_R);
  float tTop = raySphere(pos, dir, ATMOS_R);
  float tMax;
  if (tGround < 0.0) {
    if (tTop < 0.0) return res;
    tMax = tTop;
  } else {
    tMax = tTop > 0.0 ? min(tTop, tGround) : tGround;
  }
  tMax = min(tMax, maxDistance);
  if (tMax <= 0.0) return res;

  float cosTheta = dot(dir, sunDir);
  float phaseR = phaseRayleigh(cosTheta);

  vec3 lum = vec3(0.0);
  vec3 lumMie = vec3(0.0);
  vec3 throughput = vec3(1.0);
  float t = 0.0;

  for (float i = 0.0; i < sampleCount; i += 1.0) {
    float tNew = tMax * (i + jitter) / sampleCount;
    float dt = tNew - t;
    t = tNew;
    if (dt <= 0.0) continue;

    vec3 p = pos + dir * t;
    float r = length(p);
    vec3 up = p / r;
    float muSun = dot(up, sunDir);

    Medium m = sampleMedium(r);
    vec3 segT = exp(-m.extinction * dt);
    vec3 sunT = transmittanceToSpace(r, muSun);
    /* Planet shadow: below the terminator the sun is geometrically blocked. */
    float shadow = raySphere(p, sunDir, SHADOW_R) >= 0.0 ? 0.0 : 1.0;

    vec3 ms = withMultiScatter ? multiScatter(r, muSun) : vec3(0.0);

    vec3 s0 = shadow * sunT * m.scatterRay * phaseR + ms * m.scatterTotal;
    vec3 s1 = shadow * sunT * m.scatterAerosol;

    /* Analytic in-segment integral; constant source over the step. */
    vec3 inv = 1.0 / m.extinction;
    lum += throughput * (s0 - s0 * segT) * inv;
    lumMie += throughput * (s1 - s1 * segT) * inv;
    throughput *= segT;

    if (throughput.r + throughput.g + throughput.b < 1e-5) break;
  }

  if (withGround && tGround > 0.0 && tGround <= maxDistance) {
    vec3 p = pos + dir * tGround;
    float r = length(p);
    vec3 up = p / r;
    float nDotL = max(dot(up, sunDir), 0.0);
    vec3 sunT = transmittanceToSpace(r, dot(up, sunDir));
    lum += throughput * sunT * nDotL * uGroundAlbedo / PI;
  }

  res.lum = lum;
  res.lumMie = lumMie;
  res.transmittance = throughput;
  return res;
}

/* --------------------------- sky-view LUT ------------------------------ */

void skyViewLutUv(bool hitsGround, float viewZenithCos, float lightViewCos,
                  float r, vec2 lutSize, out vec2 uv) {
  float horizon = sqrt(max(r * r - PLANET_R * PLANET_R, 0.0));
  float cosBeta = horizon / r;
  float beta = acos(clamp(cosBeta, -1.0, 1.0));
  float zenithHorizon = PI - beta;
  float theta = acos(clamp(viewZenithCos, -1.0, 1.0));

  if (!hitsGround) {
    float c = 1.0 - theta / max(zenithHorizon, 1e-5);
    uv.y = (1.0 - sqrt(max(c, 0.0))) * 0.5;
  } else {
    float c = (theta - zenithHorizon) / max(beta, 1e-5);
    uv.y = sqrt(max(c, 0.0)) * 0.5 + 0.5;
  }
  uv.x = sqrt(max(-lightViewCos * 0.5 + 0.5, 0.0));
  uv = vec2(unitToSubUv(uv.x, lutSize.x), unitToSubUv(uv.y, lutSize.y));
}

void skyViewLutParams(vec2 uv, float r, vec2 lutSize,
                      out float viewZenithCos, out float lightViewCos) {
  uv = vec2(subUvToUnit(uv.x, lutSize.x), subUvToUnit(uv.y, lutSize.y));
  float horizon = sqrt(max(r * r - PLANET_R * PLANET_R, 0.0));
  float cosBeta = horizon / r;
  float beta = acos(clamp(cosBeta, -1.0, 1.0));
  float zenithHorizon = PI - beta;

  if (uv.y < 0.5) {
    float c = 1.0 - 2.0 * uv.y;
    c = 1.0 - c * c;
    viewZenithCos = cos(zenithHorizon * c);
  } else {
    float c = uv.y * 2.0 - 1.0;
    viewZenithCos = cos(zenithHorizon + beta * c * c);
  }
  float cx = uv.x * uv.x;
  lightViewCos = -(cx * 2.0 - 1.0);
}

/**
 * Samples a baked sky-view pair for a world direction. \`lum\` and \`mie\` are the
 * two attachments written by the bake; the aerosol phase is applied here.
 */
vec3 sampleSkyView(sampler2D lumLut, sampler2D mieLut, vec2 lutSize,
                   vec3 pos, vec3 dir, vec3 sunDir) {
  float r = length(pos);
  vec3 up = pos / r;
  float viewZenithCos = dot(dir, up);
  vec3 side = normalize(cross(up, dir));
  vec3 fwd = normalize(cross(side, up));
  vec2 onPlane = vec2(dot(sunDir, fwd), dot(sunDir, side));
  float len = length(onPlane);
  float lightViewCos = len > 1e-6 ? onPlane.x / len : 1.0;
  bool hitsGround = raySphere(pos, dir, PLANET_R) >= 0.0;

  vec2 uv;
  skyViewLutUv(hitsGround, viewZenithCos, lightViewCos, r, lutSize, uv);
  vec3 lum = texture2D(lumLut, uv).rgb;
  vec3 mie = texture2D(mieLut, uv).rgb;
  return lum + mie * phaseAerosol(dot(dir, sunDir));
}

/** Planet-space position of the camera; the world is a tangent plane at the pole. */
vec3 cameraPlanetPos() {
  return vec3(0.0, PLANET_R + max(uCamHeightKm, 0.0005), 0.0);
}

#endif
`;
