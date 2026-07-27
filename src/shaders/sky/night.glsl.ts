/**
 * Night sky: star field, moon and the baked Milky Way.
 *
 * Stars are evaluated procedurally per pixel so they stay sub-pixel sharp and
 * can scintillate individually. They live in **celestial** space: the shader
 * rotates the view direction by a frame that turns 15 degrees an hour about a
 * pole tilted by the map's latitude, so the whole sky wheels around Polaris
 * over the night and is perfectly stable against camera motion.
 *
 * The Milky Way is a diffuse, low-frequency field, so it is baked once into a
 * small celestial-space cubemap instead of costing a fBm per pixel per frame.
 *
 * Everything here is multiplied by atmospheric transmittance by the caller, so
 * stars redden and disappear as they approach the horizon.
 */
export const NIGHT_GLSL = /* glsl */ `
#ifndef SKY_NIGHT_INCLUDED
#define SKY_NIGHT_INCLUDED

uniform mat3 uCelestialFrame;
uniform mat3 uGalacticFrame;
uniform samplerCube uNightCube;
uniform float uNightCubeScale;
uniform float uStarBrightness;
uniform float uStarTwinkle;
uniform float uTime;
/** Radians subtended by one screen pixel; sizes the star cores. */
uniform float uPixelAngle;
uniform float uMoonAngRadius;
uniform float uMoonBrightness;

/* --------------------------- cube face grid ---------------------------- */

vec2 cubeFaceUv(vec3 d, out float face) {
  vec3 a = abs(d);
  if (a.x >= a.y && a.x >= a.z) {
    face = d.x > 0.0 ? 0.0 : 1.0;
    return vec2(d.y, d.z) / a.x;
  }
  if (a.y >= a.z) {
    face = d.y > 0.0 ? 2.0 : 3.0;
    return vec2(d.x, d.z) / a.y;
  }
  face = d.z > 0.0 ? 4.0 : 5.0;
  return vec2(d.x, d.y) / a.z;
}

vec3 cubeFaceDir(float face, vec2 uv) {
  if (face < 0.5) return vec3(1.0, uv.x, uv.y);
  if (face < 1.5) return vec3(-1.0, uv.x, uv.y);
  if (face < 2.5) return vec3(uv.x, 1.0, uv.y);
  if (face < 3.5) return vec3(uv.x, -1.0, uv.y);
  if (face < 4.5) return vec3(uv.x, uv.y, 1.0);
  return vec3(uv.x, uv.y, -1.0);
}

/** Planck's law sampled at 600/540/460 nm, normalised to unit luminance. */
vec3 blackbodyRGB(float kelvin) {
  vec3 lambda = vec3(600e-9, 540e-9, 460e-9);
  vec3 e = exp(vec3(0.0143877696) / (lambda * kelvin)) - 1.0;
  vec3 v = 1.0 / (pow(lambda, vec3(5.0)) * max(e, vec3(1e-9)));
  v /= max(dot(v, vec3(0.2126, 0.7152, 0.0722)), 1e-30);
  return clamp(v, vec3(0.0), vec3(4.0));
}

/* ------------------------------- stars --------------------------------- */

/**
 * One star per occupied grid cell on a cube-face lattice. Magnitudes follow a
 * power law (each magnitude step is ~4x as many stars), and colour temperature
 * is drawn from a distribution weighted toward the cool end, which is what
 * gives a real star field its scatter of amber points among the white ones.
 */
vec3 starLayer(vec3 cd, float cells, float occupancy, float fluxScale,
               float seed, float twinkleAmp) {
  float face;
  vec2 uv = cubeFaceUv(cd, face);
  vec2 grid = (uv * 0.5 + 0.5) * cells;
  vec2 cell = floor(grid);

  vec3 h = hash33(vec3(cell, face * 19.0 + seed));
  if (h.z > occupancy) return vec3(0.0);

  /* Keep the star in the middle half of its cell so its halo cannot cross a
     cell boundary, which lets us look up exactly one cell. */
  vec2 sp = (cell + 0.25 + h.xy * 0.5) / cells * 2.0 - 1.0;
  vec3 sdir = normalize(cubeFaceDir(face, sp));

  float cosA = dot(cd, sdir);
  float ang = sqrt(max(2.0 - 2.0 * cosA, 0.0));

  vec3 h2 = hash33(vec3(cell + 7.3, face * 5.0 + seed + 1.7));
  float mag = max(h2.x, 2.0e-3);
  float flux = pow(mag, -0.6667) * fluxScale;
  /* Sub-pixel core. A star is a point source, so everything it occupies on
     screen is the instrument's point spread function, and how far out that
     function stays above the sky decides the size of the dot: a Gaussian one
     pixel wide at its 1/e radius is already four pixels across by the time it
     falls under a sky a hundred times fainter, the bloom in the post chain adds
     two more, and the result is a sky full of lens bokeh. Two thirds of a pixel
     leaves the brightest stars at two or three pixels and everything else at
     one, which is what a photograph of a star field looks like. */
  float core = max(uPixelAngle * 0.62, 8.0e-5);
  float x = ang / core;
  if (x > 9.0) return vec3(0.0);

  float profile = exp(-x * x) + 0.02 * smoothstep(10.0, 40.0, flux) / (1.0 + x * x * 3.0);

  /* Temperature correlated with brightness, because the correlation is real and
     it is what a star field looks like: hot stars are enormously more luminous,
     so the bright ones are blue-white Rigels and Vegas and the amber ones are
     the handful of red giants — Betelgeuse, Antares, Aldebaran. Draw temperature
     flat and skewed cool instead and the sky fills with orange points of equal
     brightness, which reads as confetti. */
  float hot = pow(h2.y, 0.7) * 0.72 + smoothstep(1.5, 12.0, flux) * 0.28;
  float kelvin = 3200.0 + 9900.0 * hot;
  vec3 tint = blackbodyRGB(kelvin);

  /* Scintillation: two beating tones plus counter-phase red/blue, which is
     what makes low stars flash colour. */
  float ph = h.x * 61.0 + h.y * 37.0;
  float t = uTime;
  float amp = twinkleAmp * uStarTwinkle;
  float tw = 1.0 + amp * (sin(t * 6.1 + ph) * 0.55 + sin(t * 9.73 + ph * 1.7) * 0.45);
  float ch = amp * 0.35 * sin(t * 8.3 + ph * 2.3);
  tint *= vec3(1.0 + ch, 1.0, 1.0 - ch);

  return tint * (flux * profile * max(tw, 0.0));
}

/**
 * Two layers: the naked-eye sky, and a much fainter one standing in for the
 * unresolved background.
 *
 * The counts are the whole difference between a star field and a rash of dots.
 * Six thousand stars are visible to a dark-adapted eye over the entire sphere,
 * so the resolved layer gets a lattice coarse enough to hold about that many —
 * a hundred cells to a face is twenty times too many, and the sky then looks
 * like a scatter plot no matter how small each point is drawn.
 */
vec3 starField(vec3 worldDir, float horizonFade) {
  vec3 cd = uCelestialFrame * worldDir;
  float twinkleAmp = mix(0.42, 0.1, horizonFade);
  vec3 sum = starLayer(cd, 34.0, 0.62, 1.0, 0.0, twinkleAmp);
  /* The faint layer is what separates a moonlit sky, where a few dozen stars cut
     through, from a moonless one, where the field is dense enough to read as a
     texture. Its flux stays far under the resolved layer's so it cannot compete
     with the moon when there is one. */
  sum += starLayer(cd, 128.0, 0.4, 0.045, 91.0, twinkleAmp);
  return sum * uStarBrightness;
}

/* ----------------------------- Milky Way ------------------------------- */

/**
 * Evaluated only by the cubemap bake. A band whose width and colour vary with
 * galactic longitude, split by dust lanes and brightened by the bulge toward
 * the galactic centre.
 */
vec3 milkyWay(vec3 cd) {
  vec3 g = uGalacticFrame * cd;
  float b = asin(clamp(g.y, -1.0, 1.0));
  float l = atan(g.z, g.x);

  float centreness = cos(l) * 0.5 + 0.5;
  float width = mix(0.05, 0.17, centreness);

  float clump = valueFbm3(cd * 6.5 + 11.3, 5);
  float fine = valueFbm3(cd * 21.0 + 3.1, 4);
  float dust = valueFbm3(cd * 12.0 - 5.7, 4);

  float band = exp(-sqr(b / width));
  float glow = band * (0.35 + 0.9 * clump * clump);

  /* The Great Rift: dust hugging the midplane, darkest toward the centre. */
  float lanes = smoothstep(0.42, 0.78, dust) * exp(-sqr(b / (width * 0.85)));
  glow *= 1.0 - 0.8 * lanes * mix(0.5, 1.0, centreness);

  float bulge = 1.5 * exp(-sqr(b / 0.085)) * exp(-sqr(l / 0.5));
  float intensity = (glow + bulge * 0.55) * (0.65 + 0.7 * fine);

  /* Pale, and only slightly warmer toward Sagittarius. Interstellar dust does
     redden the inner galaxy, but integrated galactic light is close to solar,
     and the band as a camera records it is a cream white rather than an amber.
     The centre is also the half of the band anyone points a lens at, so any
     excess here colours the whole frame — and it survives the grade amplified,
     since a warm shadow tint acts hardest on exactly this range. */
  vec3 cool = vec3(0.74, 0.83, 1.0);
  vec3 warm = vec3(1.0, 0.93, 0.84);
  vec3 tint = mix(cool, warm, clamp(centreness * 0.55 + bulge * 0.3, 0.0, 1.0));

  /* Unresolved stellar background away from the plane. */
  float halo = 0.045 * exp(-sqr(b / 0.55));
  return tint * intensity + vec3(0.75, 0.82, 1.0) * halo;
}

vec3 galacticGlow(vec3 worldDir) {
  vec3 cd = uCelestialFrame * worldDir;
  return textureCube(uNightCube, cd).rgb * uNightCubeScale;
}

/* -------------------------------- moon --------------------------------- */

/** Maria, highlands and crater ejecta, from value fBm on the surface normal. */
float lunarAlbedo(vec3 n) {
  float m = valueFbm3(n * 3.1 + 4.0, 4);
  float maria = smoothstep(0.50, 0.63, m);
  float alb = mix(0.135, 0.062, maria);
  float craters = valueFbm3(n * 17.0 + 1.7, 3);
  alb *= 1.0 + 0.42 * (craters - 0.5);
  float rays = valueFbm3(n * 6.0 - 9.0, 2);
  alb *= 1.0 + 0.25 * smoothstep(0.68, 0.85, rays);
  return alb;
}

/**
 * The lunar disk. Lommel-Seeliger rather than Lambert: the regolith is
 * retroreflective, so a full moon is flat and evenly bright right out to the
 * limb instead of falling off like a shaded ball. Earthshine keeps the unlit
 * side from being a hole in the sky.
 */
vec3 moonDisk(vec3 dir, vec3 moonDir, vec3 sunDir, vec3 irradiance) {
  float cosA = dot(dir, moonDir);
  float ang = sqrt(max(2.0 - 2.0 * cosA, 0.0));
  if (ang > uMoonAngRadius * 1.6) return vec3(0.0);

  vec3 ref = abs(moonDir.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(ref, moonDir));
  vec3 up = cross(moonDir, right);

  vec2 p = vec2(dot(dir, right), dot(dir, up)) / uMoonAngRadius;
  float rr = length(p);
  float aa = max(uPixelAngle / uMoonAngRadius, 1e-3);
  float disk = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rr);
  if (disk <= 0.0) return vec3(0.0);

  float z = sqrt(max(1.0 - min(rr, 1.0) * min(rr, 1.0), 0.0));
  vec3 n = normalize(right * p.x + up * p.y - moonDir * z);

  float mu0 = dot(n, sunDir);
  float mu = dot(n, -moonDir);
  float lit = max(mu0, 0.0) / max(max(mu0, 0.0) + max(mu, 0.05), 1e-3);
  /* Soften the terminator by roughly one pixel of arc. */
  lit *= smoothstep(-0.06, 0.06, mu0);

  float albedo = lunarAlbedo(n);
  /* Earthshine: a blue-grey wash on the dark limb from Earth's own albedo. */
  vec3 earthshine = vec3(0.55, 0.68, 1.0) * 0.018 * (1.0 - smoothstep(-0.15, 0.25, mu0));

  return (vec3(lit) + earthshine) * albedo * irradiance * uMoonBrightness * disk;
}

#endif
`;
