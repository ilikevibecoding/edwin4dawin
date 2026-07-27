/**
 * Noise primitives for the sky: hashes, tileable 3D Perlin and Worley for the
 * cloud volumes, plus value-noise fBm for the Milky Way and the lunar surface.
 *
 * The 3D generators are **periodic**: every lattice cell index is wrapped by
 * the tile period before hashing, so a volume baked at period P tiles exactly
 * when sampled with `p * (1/P)`. Cloud shape noise has to tile — the layer is
 * tens of kilometres across and the texture is 64 voxels.
 */
export const SKY_NOISE_GLSL = /* glsl */ `
#ifndef SKY_NOISE_INCLUDED
#define SKY_NOISE_INCLUDED

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

vec2 hash23(vec3 p) {
  return hash33(p).xy;
}

/* ------------------------------ value noise ---------------------------- */

float valueNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}

float valueFbm3(vec3 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * valueNoise3(p);
    norm += amp;
    amp *= 0.5;
    p *= 2.02;
  }
  return sum / max(norm, 1e-5);
}

/* ------------------------- periodic 3D Perlin -------------------------- */

vec3 gradient3(vec3 cell, float period) {
  vec3 h = hash33(mod(cell, vec3(period)) + 0.017);
  return normalize(h * 2.0 - 1.0);
}

float perlin3(vec3 p, float period) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float n000 = dot(gradient3(i + vec3(0.0, 0.0, 0.0), period), f - vec3(0.0, 0.0, 0.0));
  float n100 = dot(gradient3(i + vec3(1.0, 0.0, 0.0), period), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(gradient3(i + vec3(0.0, 1.0, 0.0), period), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(gradient3(i + vec3(1.0, 1.0, 0.0), period), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(gradient3(i + vec3(0.0, 0.0, 1.0), period), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(gradient3(i + vec3(1.0, 0.0, 1.0), period), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(gradient3(i + vec3(0.0, 1.0, 1.0), period), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(gradient3(i + vec3(1.0, 1.0, 1.0), period), f - vec3(1.0, 1.0, 1.0));

  float v = mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
                mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
  return clamp(v * 1.15 + 0.5, 0.0, 1.0);
}

float perlinFbm3(vec3 p, float period, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  float per = period;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    sum += amp * (perlin3(p, per) * 2.0 - 1.0);
    norm += amp;
    amp *= 0.5;
    p *= 2.0;
    per *= 2.0;
  }
  return clamp(sum / max(norm, 1e-5) * 0.5 + 0.5, 0.0, 1.0);
}

/* -------------------------- periodic 3D Worley ------------------------- */

/**
 * Inverted Worley (1 - distance to the nearest feature point), which reads as
 * billowy cauliflower rather than cracks. The feature point per cell is
 * jittered over the full cell, so the 3x3x3 neighbourhood is required.
 */
float worley3(vec3 p, float period) {
  vec3 i = floor(p);
  vec3 f = p - i;
  float d = 1e9;
  for (float z = -1.0; z <= 1.0; z += 1.0) {
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      for (float x = -1.0; x <= 1.0; x += 1.0) {
        vec3 o = vec3(x, y, z);
        vec3 feature = o + hash33(mod(i + o, vec3(period)) + 0.31);
        d = min(d, dot(feature - f, feature - f));
      }
    }
  }
  return 1.0 - clamp(sqrt(d), 0.0, 1.0);
}

float worleyFbm3(vec3 p, float period) {
  float a = worley3(p, period);
  float b = worley3(p * 2.0, period * 2.0);
  float c = worley3(p * 4.0, period * 4.0);
  return a * 0.625 + b * 0.25 + c * 0.125;
}

float remap01(float v, float lo, float hi) {
  return clamp((v - lo) / max(hi - lo, 1e-5), 0.0, 1.0);
}

float remap(float v, float lo0, float hi0, float lo1, float hi1) {
  return lo1 + (v - lo0) * (hi1 - lo1) / max(hi0 - lo0, 1e-5);
}

#endif
`;
