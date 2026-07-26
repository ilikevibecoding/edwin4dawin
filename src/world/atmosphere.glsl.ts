/**
 * Shared sky/fog GLSL. The sky dome, the ocean (for reflections) and the
 * underwater volume all include this so a single set of uniforms defines the
 * look of the whole world at any time of day.
 */
import { NOISE3D_GLSL } from './noise3d';

export const ATMOSPHERE_GLSL = /* glsl */ `
${NOISE3D_GLSL}
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uNightFactor;
uniform float uStorm;
uniform float uCloudCover;
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p);
    p = p * 2.03 + vec2(17.3, 5.7);
    amp *= 0.5;
  }
  return sum;
}

/** Two-octave variant for per-pixel effects where detail matters less than cost. */
float fbm2Cheap(vec2 p) {
  return valueNoise(p) * 0.62 + valueNoise(p * 2.07 + vec2(13.1, 7.9)) * 0.31;
}

/** Layered starfield; only visible once the sun is down. */
vec3 starField(vec3 dir) {
  if (uNightFactor < 0.02 || dir.y < 0.0) return vec3(0.0);
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 260.0 : 460.0;
    vec2 uv = dir.xz / max(0.12, dir.y + 0.35) * scale + float(layer) * 31.7;
    vec2 cell = floor(uv);
    float h = hash21(cell);
    if (h > 0.9955) {
      vec2 centre = cell + vec2(hash21(cell + 3.1), hash21(cell + 7.7));
      float d = length(uv - centre);
      float twinkle = 0.65 + 0.35 * sin(uTime * (1.4 + h * 6.0) + h * 40.0);
      float star = smoothstep(0.55, 0.0, d) * twinkle;
      vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash21(cell + 11.3));
      col += star * tint * (layer == 0 ? 1.0 : 0.55);
    }
  }
  return col * uNightFactor * smoothstep(0.0, 0.28, dir.y) * (1.0 - uCloudCover * 0.75);
}

// ---------------------------------------------------------------- clouds
// Trade-wind cumulus live in a slab of air a kilometre up and are raymarched
// through a 3D noise field. Marching a genuine volume (rather than extruding a
// 2D pattern, or projecting a sheet onto the dome) is what gives them
// silhouettes that turn as you sail past, bright sunlit tops over shaded
// bases, and the fat piled-up look of the tropics.
//
// Every density sample is a handful of bilinear fetches into the packed noise
// texture, so the whole thing costs texture bandwidth rather than ALU. Both
// step counts are overridable per material: the sea reflects the sky and the
// radiance probe re-renders it, and neither needs the full march.
#ifndef CLOUD_STEPS
#define CLOUD_STEPS 28
#endif
#ifndef CLOUD_LIGHT_STEPS
#define CLOUD_LIGHT_STEPS 4
#endif

#define CLOUD_BASE 850.0
#define CLOUD_TOP 2650.0
#define CLOUD_FAR 26000.0
/** One noise cell per ~900m, which is about the width of a fair-weather puff. */
#define CLOUD_SCALE 0.00112

/** Rounded base, billowing middle, anvil rolling off under the inversion. */
float cloudProfile(float h) {
  return smoothstep(0.0, 0.18, h) * (1.0 - smoothstep(0.38, 1.0, h));
}

/** Fair weather leaves most of the sky open; a storm fills it in. */
float cloudCoverage() {
  return mix(mix(0.68, 0.50, clamp(uCloudCover, 0.0, 1.0)), 0.30, uStorm);
}

/**
 * Density of the cloud field at a world-space point, 0..1.
 *
 * The detail flag buys an extra erosion octave that shreds the silhouette; the
 * light march and the ground shadow lookup skip it, as neither can see it.
 */
float cloudDensity(vec3 p, float coverage, bool detail) {
  float h = clamp((p.y - CLOUD_BASE) * (1.0 / (CLOUD_TOP - CLOUD_BASE)), 0.0, 1.0);

  vec3 q = p * CLOUD_SCALE;
  q.xz += uTime * vec2(0.0026, 0.0013);
  // Wind shear: the top of a cumulus lags downwind of its base.
  q.xz += h * 0.14;

  // A very stretched sample opens up lanes of clear sky between cloud streets.
  float weather = noise3(vec3(p.x, 0.0, p.z) * 0.000075 + vec3(uTime * 0.0006, 4.3, 0.0));
  float cover = coverage + (0.5 - weather) * 0.26;

  float d = smoothstep(cover, cover + 0.22, fbm3(q) * cloudProfile(h));
  if (d <= 0.002) return 0.0;
  if (detail) {
    // Bite into the boundary only: cores stay solid, rims turn to rag.
    d *= 1.0 - (1.0 - d) * fbm3Cheap(q * 6.3 + vec3(31.0, 17.0, 7.0)) * 0.9;
  }
  return d;
}

/**
 * How much sun reaches a world-space point through the cloud deck, as a
 * multiplier. Drifting cloud shadows are half of what makes a sea look like a
 * real sea rather than a lit surface.
 */
float cloudShadow(vec3 worldPos) {
  if (uSunDir.y < 0.06) return 1.0;
  // Where the ray to the sun crosses the fat part of the cloud slab.
  float slab = mix(CLOUD_BASE, CLOUD_TOP, 0.32);
  float t = (slab - worldPos.y) / uSunDir.y;
  vec3 p = worldPos + uSunDir * t;
  float d = cloudDensity(vec3(p.x, slab, p.z), cloudCoverage(), false);
  return 1.0 - clamp(d * 1.9, 0.0, 0.7);
}

/** Henyey-Greenstein phase: cloud edges facing the sun blaze, backs go flat. */
float cloudPhase(float cosTheta, float g) {
  float gg = g * g;
  return (1.0 - gg) / (12.566371 * pow(1.0 + gg - 2.0 * g * cosTheta, 1.5));
}

/** Marches the slab and returns premultiplied scattered light plus coverage. */
vec4 cloudLayer(vec3 dir, vec3 origin) {
  if (dir.y < 0.008) return vec4(0.0);

  float coverage = cloudCoverage();

  float t0 = max((CLOUD_BASE - origin.y) / dir.y, 0.0);
  if (t0 > CLOUD_FAR) return vec4(0.0);
  // Grazing rays run for tens of kilometres through the slab; cap the marched
  // span so the step length stays short enough to resolve individual puffs and
  // let haze deal with whatever lies beyond.
  float t1 = min(min((CLOUD_TOP - origin.y) / dir.y, t0 + 4600.0), CLOUD_FAR * 1.3);
  float span = max(t1 - t0, 0.0);
  if (span <= 0.0) return vec4(0.0);
  float stepLen = span / float(CLOUD_STEPS);

  // Sunlight through cloud is warm and strong; the shaded side picks up the
  // sky above and a bounce off the sea below.
  vec3 sunLight = uSunColor * (2.1 - uStorm * 1.5) + uMoonColor * uNightFactor * 0.35;
  vec3 skyTop = mix(uSkyHorizon, uSkyZenith, 0.6) * (0.85 - uStorm * 0.4);
  vec3 skyBase = mix(uSkyGround, uSkyHorizon, 0.5) * (0.30 - uStorm * 0.14);

  float cosSun = dot(dir, uSunDir);
  // Two lobes: a strong forward one for the silver lining, a broad one so the
  // rest of the cloud is not simply flat.
  float phase = mix(cloudPhase(cosSun, 0.76), cloudPhase(cosSun, -0.12), 0.42) * 9.0;

  // White-noise the start of the march. Anything with structure to it -
  // interleaved gradient noise in particular - turns the step boundaries into
  // ruled lines across every cloud edge instead of hiding them.
  float jitter = hash21(gl_FragCoord.xy + vec2(0.13, 0.71));

  float transmittance = 1.0;
  vec3 scattered = vec3(0.0);
  float depthSum = 0.0;
  float depthWeight = 0.0;

  for (int i = 0; i < CLOUD_STEPS; i++) {
    if (transmittance < 0.02) break;
    float t = t0 + stepLen * (float(i) + jitter);
    vec3 p = origin + dir * t;
    float d = cloudDensity(p, coverage, true);
    if (d <= 0.002) continue;
    d *= 1.0 - smoothstep(CLOUD_FAR * 0.4, CLOUD_FAR * 1.25, t);

    // March a short way towards the sun to find how deep inside the cloud we
    // are. Steps lengthen as they go so a few of them still reach daylight.
    float toSun = 0.0;
    float lightStep = 130.0;
    for (int j = 1; j <= CLOUD_LIGHT_STEPS; j++) {
      float ls = lightStep * float(j);
      toSun += cloudDensity(p + uSunDir * ls, coverage, false) * ls;
    }
    float sunShadow = exp(-toSun * 0.0055);
    // Powder: thin, unlit rims read dark even though little is blocking them.
    float powder = 1.0 - exp(-d * 9.0);
    float height = clamp((p.y - CLOUD_BASE) / (CLOUD_TOP - CLOUD_BASE), 0.0, 1.0);

    // Sky light has to fight its way in too, so dense cores go grey-blue while
    // the ragged edges stay bright. Without this everything reads as one flat
    // white mass no matter how well the sun march behaves.
    float ao = exp(-d * 1.8);
    vec3 lit = mix(skyBase, skyTop, height) * (0.28 + 0.72 * ao)
      + sunLight * sunShadow * phase * (0.3 + 0.7 * powder);

    float alpha = 1.0 - exp(-d * stepLen * 0.0085);
    scattered += lit * alpha * transmittance;
    depthSum += t * alpha * transmittance;
    depthWeight += alpha * transmittance;
    transmittance *= 1.0 - alpha;
  }

  float alpha = 1.0 - transmittance;
  if (alpha < 0.002) return vec4(0.0);

  // Kilometres of air between here and a distant cloud bank drain its contrast.
  float depth = depthSum / max(depthWeight, 0.0001);
  float haze = 1.0 - exp(-pow(uFogDensity * depth * 0.16, 2.0));
  scattered = mix(scattered, uFogColor * alpha * 1.15, clamp(haze, 0.0, 0.9));

  return vec4(scattered, alpha);
}

/** Gradient + sun/moon scattering. Cheap: no clouds, no stars. */
vec3 atmosphereBase(vec3 dir, float sunDiskStrength) {
  float up = dir.y;
  float t = pow(clamp(up, 0.0, 1.0), 0.46);
  vec3 col = mix(uSkyHorizon, uSkyZenith, t);
  // Below the horizon fades into the deep-sea colour so the dome never clips.
  col = mix(col, uSkyGround, smoothstep(0.0, -0.22, up));

  float sunDot = max(dot(dir, uSunDir), 0.0);
  // Wide forward scatter, tight glow, then the disk itself.
  col += uSunColor * pow(sunDot, 4.0) * 0.14 * (1.0 - uStorm * 0.7);
  col += uSunColor * pow(sunDot, 64.0) * 0.5 * (1.0 - uStorm * 0.75);
  float disk = smoothstep(0.99965, 0.99992, sunDot);
  col += uSunColor * disk * 12.0 * sunDiskStrength * (1.0 - uStorm * 0.9);

  float moonDot = max(dot(dir, uMoonDir), 0.0);
  col += uMoonColor * pow(moonDot, 220.0) * 0.5 * uNightFactor;
  float moonDisk = smoothstep(0.99975, 0.99994, moonDot);
  col += uMoonColor * moonDisk * 5.0 * sunDiskStrength * uNightFactor;

  return col;
}

/** Composites the cloud slab over a sky colour, seen from a given origin. */
vec3 applyCloudsFrom(vec3 col, vec3 dir, vec3 origin) {
  vec4 clouds = cloudLayer(dir, origin);
  if (clouds.a < 0.002) return col;
  // The last degree above the horizon is all haze; don't stack cloud on it.
  float horizon = smoothstep(0.005, 0.045, dir.y);
  return col * (1.0 - clouds.a * horizon) + clouds.rgb * horizon;
}

vec3 applyClouds(vec3 col, vec3 dir) {
  return applyCloudsFrom(col, dir, cameraPosition);
}

/** The full sky: gradient, sun, moon, stars and clouds. Used by the dome. */
vec3 atmosphere(vec3 dir, float sunDiskStrength) {
  vec3 col = atmosphereBase(dir, sunDiskStrength) + starField(dir);
  return applyClouds(col, dir);
}

/** Exponential-squared distance fog tinted by the sky in the view direction. */
vec3 applyAtmosphericFog(vec3 color, float dist, vec3 viewDir) {
  float d = uFogDensity * dist;
  float f = 1.0 - exp(-d * d);
  if (f < 0.002) return color;
  vec3 haze = mix(uFogColor, atmosphereBase(normalize(viewDir + vec3(0.0, 0.02, 0.0)), 0.0), 0.35);
  return mix(color, haze, clamp(f, 0.0, 1.0));
}
`;
