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

/** Wind-driven cloud sheet projected onto the dome. */
float cloudDensity(vec3 dir) {
  if (dir.y < 0.005) return 0.0;
  vec2 uv = dir.xz / (dir.y + 0.12) * 0.55;
  vec2 drift = vec2(uTime * 0.0055, uTime * 0.0028);
  float base = fbm2(uv * 0.6 + drift);
  float detail = fbm2(uv * 2.2 - drift * 2.4);
  float d = base * 0.75 + detail * 0.25;
  float cover = mix(0.62, 0.14, uCloudCover);
  float density = smoothstep(cover, cover + 0.26, d);
  return density * smoothstep(0.0, 0.14, dir.y);
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

/** Adds the cloud sheet over a sky colour. */
vec3 applyClouds(vec3 col, vec3 dir) {
  float clouds = cloudDensity(dir);
  if (clouds < 0.001) return col;
  float sunDot = max(dot(dir, uSunDir), 0.0);
  vec3 cloudLit = mix(uSkyHorizon * 1.1, uSunColor, 0.42 + 0.35 * pow(sunDot, 3.0));
  vec3 cloudShade = mix(uSkyHorizon * 0.55, uSkyZenith * 0.7, 0.5);
  vec3 cloudCol = mix(cloudShade, cloudLit, 0.35 + 0.65 * pow(clamp(dir.y, 0.0, 1.0), 0.4));
  cloudCol = mix(cloudCol, cloudCol * 0.42, uStorm);
  return mix(col, cloudCol, clouds * (0.72 + 0.28 * uStorm));
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
