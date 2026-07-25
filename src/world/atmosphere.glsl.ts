/**
 * Shared sky/fog GLSL. The sky dome, the ocean (for reflections) and the
 * underwater volume all include this so a single set of uniforms defines the
 * look of the whole world at any time of day.
 */
export const ATMOSPHERE_GLSL = /* glsl */ `
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
// in a handful of steps. Marching (rather than projecting a flat sheet onto
// the dome) is what gives them silhouettes that turn as you sail past, bright
// sunlit tops over shaded bases, and the fat piled-up look of the tropics.
// Both step counts are overridable per material: the sea reflects the sky and
// the radiance probe re-renders it, and neither needs the full march.
#ifndef CLOUD_STEPS
#define CLOUD_STEPS 24
#endif
#ifndef CLOUD_LIGHT_STEPS
#define CLOUD_LIGHT_STEPS 3
#endif

#define CLOUD_BASE 900.0
#define CLOUD_TOP 3000.0
#define CLOUD_FAR 12000.0

/** Density of the cloud field at a world-space point. */
float cloudFieldDensity(vec3 p, float coverage) {
  float h = clamp((p.y - CLOUD_BASE) / (CLOUD_TOP - CLOUD_BASE), 0.0, 1.0);
  vec2 uv = p.xz * 0.00030;
  uv += vec2(uTime * 0.0021, uTime * 0.0011);
  // Wind shear: the top of a cumulus lags downwind of its base.
  uv += vec2(0.05, 0.03) * h;

  float base = fbm2(uv * 1.5);
  float detail = fbm2(uv * 5.1 + vec2(21.7, 9.1));
  float shape = base * 0.82 + detail * 0.18;

  // Flat bottoms, cauliflower tops.
  float vertical = smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.5, 1.05, h));
  // A soft threshold: a hard one turns the low step count into salt-and-pepper.
  float d = smoothstep(coverage, coverage + 0.3, shape) * vertical;
  // Erode the silhouette so edges shred instead of reading as cut paper.
  d -= detail * 0.22 * (1.0 - vertical);
  return max(d, 0.0);
}

/** Marches the slab and returns premultiplied scattered light plus coverage. */
vec4 cloudLayer(vec3 dir, vec3 origin) {
  if (dir.y < 0.012) return vec4(0.0);

  // Fair weather leaves most of the sky open; a storm fills it in.
  float coverage = mix(0.70, 0.36, clamp(uCloudCover, 0.0, 1.0));
  coverage = mix(coverage, 0.22, uStorm);

  float t0 = max((CLOUD_BASE - origin.y) / dir.y, 0.0);
  if (t0 > CLOUD_FAR) return vec4(0.0);
  float t1 = min((CLOUD_TOP - origin.y) / dir.y, CLOUD_FAR);
  float span = max(t1 - t0, 0.0);
  if (span <= 0.0) return vec4(0.0);
  float stepLen = span / float(CLOUD_STEPS);

  // Sunlight through cloud is warm and strong; the shaded side picks up the
  // sky above and a bounce off the sea below.
  vec3 sunLight = uSunColor * (1.25 - uStorm * 0.8) + uMoonColor * uNightFactor * 0.3;
  vec3 ambient = mix(uSkyHorizon, uSkyZenith, 0.45) * (0.58 - uStorm * 0.26);

  // No per-pixel jitter: with a soft density threshold the fixed step pattern
  // reads as gentle layering inside the cloud, whereas dithering the start
  // sprinkles visible static all over the sky.
  float transmittance = 1.0;
  vec3 scattered = vec3(0.0);

  for (int i = 0; i < CLOUD_STEPS; i++) {
    if (transmittance < 0.03) break;
    float t = t0 + stepLen * (float(i) + 0.5);
    vec3 p = origin + dir * t;
    float d = cloudFieldDensity(p, coverage);
    if (d <= 0.003) continue;
    d *= 1.0 - smoothstep(CLOUD_FAR * 0.34, CLOUD_FAR, t);

    float toSun = 0.0;
    for (int j = 1; j <= CLOUD_LIGHT_STEPS; j++) {
      toSun += cloudFieldDensity(p + uSunDir * (float(j) * 230.0), coverage);
    }
    float sunShadow = exp(-toSun * 1.35);
    // Powder term: the dark rim where a cloud edge is thin but unlit.
    float powder = 1.0 - exp(-d * 7.0);
    vec3 lit = ambient * (0.5 + 0.3 * powder) + sunLight * sunShadow * (0.42 + 0.58 * powder);

    float alpha = 1.0 - exp(-d * stepLen * 0.006);
    scattered += lit * alpha * transmittance;
    transmittance *= 1.0 - alpha;
  }

  return vec4(scattered, 1.0 - transmittance);
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
  // Rays that skim the horizon travel through kilometres of haze before they
  // reach any cloud, so let the atmosphere swallow them.
  float horizon = smoothstep(0.03, 0.17, dir.y);
  // Forward scattering: cloud edges near the sun glow.
  float sunDot = max(dot(dir, uSunDir), 0.0);
  vec3 rim = uSunColor * pow(sunDot, 12.0) * clouds.a * 0.35 * (1.0 - uStorm);
  return col * (1.0 - clouds.a * horizon) + (clouds.rgb + rim) * horizon;
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
