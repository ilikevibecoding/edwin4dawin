/**
 * GLSL noise library shared by every texture generator.
 *
 * Tileability is a hard requirement: a visible seam on a wall that repeats
 * across a whole building reads as amateur instantly. Every lattice function
 * therefore takes an explicit `period` and wraps its lattice coordinates
 * through it, so the result is exactly periodic whenever the period is
 * integral. fBm doubles frequency *and* period per octave, which keeps the
 * whole stack periodic as long as lacunarity is 2.
 *
 * Convention for the hash family: `hashNM` takes an M-component input and
 * returns an N-component result, all in [0,1).
 */
export const NOISE_GLSL = /* glsl */ `
#ifndef PROCGEN_NOISE
#define PROCGEN_NOISE

#define PI 3.141592653589793
#define TAU 6.283185307179586

// ---------------------------------------------------------------------------
// Hashing. Sine-free so results are identical across GPU vendors.
// ---------------------------------------------------------------------------

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(p.xyx * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash21(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 hash23(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec3 hash32(vec2 p) {
  vec3 p3 = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// ---------------------------------------------------------------------------
// Lattice helpers
// ---------------------------------------------------------------------------

vec2 wrap2(vec2 i, vec2 period) { return mod(i, period); }
vec3 wrap3(vec3 i, vec3 period) { return mod(i, period); }

// Quintic interpolant: C2 continuous, so derived normals have no lattice creases.
vec2 quintic2(vec2 f) { return f * f * f * (f * (f * 6.0 - 15.0) + 10.0); }
vec3 quintic3(vec3 f) { return f * f * f * (f * (f * 6.0 - 15.0) + 10.0); }

// ---------------------------------------------------------------------------
// Value noise
// ---------------------------------------------------------------------------

float valueNoise2(vec2 p, vec2 period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = quintic2(f);
  vec2 i0 = wrap2(i, period);
  vec2 i1 = wrap2(i + 1.0, period);
  float a = hash12(i0);
  float b = hash12(vec2(i1.x, i0.y));
  float c = hash12(vec2(i0.x, i1.y));
  float d = hash12(i1);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float valueNoise2(vec2 p) { return valueNoise2(p, vec2(65536.0)); }

float valueNoise3(vec3 p, vec3 period) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = quintic3(f);
  vec3 i0 = wrap3(i, period);
  vec3 i1 = wrap3(i + 1.0, period);
  float a = hash13(vec3(i0.x, i0.y, i0.z));
  float b = hash13(vec3(i1.x, i0.y, i0.z));
  float c = hash13(vec3(i0.x, i1.y, i0.z));
  float d = hash13(vec3(i1.x, i1.y, i0.z));
  float e = hash13(vec3(i0.x, i0.y, i1.z));
  float g = hash13(vec3(i1.x, i0.y, i1.z));
  float h = hash13(vec3(i0.x, i1.y, i1.z));
  float k = hash13(vec3(i1.x, i1.y, i1.z));
  return mix(
    mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
    mix(mix(e, g, u.x), mix(h, k, u.x), u.y),
    u.z);
}

float valueNoise3(vec3 p) { return valueNoise3(p, vec3(65536.0)); }

// ---------------------------------------------------------------------------
// Gradient (Perlin) noise, roughly [-1, 1]
// ---------------------------------------------------------------------------

vec2 gradient2(vec2 cell) {
  float a = hash12(cell + 0.37) * TAU;
  return vec2(cos(a), sin(a));
}

vec3 gradient3(vec3 cell) {
  vec3 h = hash33(cell + 0.19);
  float z = h.x * 2.0 - 1.0;
  float a = h.y * TAU;
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(a), r * sin(a), z);
}

float perlin2(vec2 p, vec2 period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 i0 = wrap2(i, period);
  vec2 i1 = wrap2(i + 1.0, period);
  float a = dot(gradient2(i0), f);
  float b = dot(gradient2(vec2(i1.x, i0.y)), f - vec2(1.0, 0.0));
  float c = dot(gradient2(vec2(i0.x, i1.y)), f - vec2(0.0, 1.0));
  float d = dot(gradient2(i1), f - vec2(1.0, 1.0));
  vec2 u = quintic2(f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4142136;
}

float perlin2(vec2 p) { return perlin2(p, vec2(65536.0)); }

float perlin3(vec3 p, vec3 period) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 i0 = wrap3(i, period);
  vec3 i1 = wrap3(i + 1.0, period);
  float n000 = dot(gradient3(vec3(i0.x, i0.y, i0.z)), f - vec3(0.0, 0.0, 0.0));
  float n100 = dot(gradient3(vec3(i1.x, i0.y, i0.z)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(gradient3(vec3(i0.x, i1.y, i0.z)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(gradient3(vec3(i1.x, i1.y, i0.z)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(gradient3(vec3(i0.x, i0.y, i1.z)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(gradient3(vec3(i1.x, i0.y, i1.z)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(gradient3(vec3(i0.x, i1.y, i1.z)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(gradient3(vec3(i1.x, i1.y, i1.z)), f - vec3(1.0, 1.0, 1.0));
  vec3 u = quintic3(f);
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z) * 1.1547;
}

float perlin3(vec3 p) { return perlin3(p, vec3(65536.0)); }

// ---------------------------------------------------------------------------
// Simplex noise 3D. Not periodic; used for volumetric-feeling detail where the
// third axis carries a per-material seed rather than a tiling coordinate.
// ---------------------------------------------------------------------------

vec4 simplexPermute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float simplex3(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 pp = simplexPermute(simplexPermute(simplexPermute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = pp - 49.0 * floor(pp * ns.z * ns.z);

  vec4 xx = floor(j * ns.z);
  vec4 yy = floor(j - 7.0 * xx);

  vec4 xh = xx * ns.x + ns.yyyy;
  vec4 yh = yy * ns.x + ns.yyyy;
  vec4 hh = 1.0 - abs(xh) - abs(yh);

  vec4 b0 = vec4(xh.xy, yh.xy);
  vec4 b1 = vec4(xh.zw, yh.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(hh, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, hh.x);
  vec3 p1 = vec3(a0.zw, hh.y);
  vec3 p2 = vec3(a1.xy, hh.z);
  vec3 p3 = vec3(a1.zw, hh.w);

  vec4 norm = 1.79284291400159 - 0.85373472095314 *
    vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ---------------------------------------------------------------------------
// Fractal stacks
// ---------------------------------------------------------------------------

float fbm2(vec2 p, vec2 period, int octaves, float lacunarity, float gain) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec2 fp = p;
  vec2 per = period;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    sum += amp * perlin2(fp, per);
    norm += amp;
    amp *= gain;
    fp *= lacunarity;
    per *= lacunarity;
  }
  return sum / max(norm, 1e-5);
}

float fbm2(vec2 p, vec2 period, int octaves) { return fbm2(p, period, octaves, 2.0, 0.5); }

/** fBm remapped to [0,1]. */
float fbm2n(vec2 p, vec2 period, int octaves) {
  return fbm2(p, period, octaves, 2.0, 0.5) * 0.5 + 0.5;
}

float fbmValue2(vec2 p, vec2 period, int octaves, float gain) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec2 fp = p;
  vec2 per = period;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    sum += amp * valueNoise2(fp, per);
    norm += amp;
    amp *= gain;
    fp *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

float fbmValue2(vec2 p, vec2 period, int octaves) { return fbmValue2(p, period, octaves, 0.5); }

float fbm3(vec3 p, vec3 period, int octaves, float gain) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec3 fp = p;
  vec3 per = period;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    sum += amp * perlin3(fp, per);
    norm += amp;
    amp *= gain;
    fp *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

float fbm3(vec3 p, vec3 period, int octaves) { return fbm3(p, period, octaves, 0.5); }

/** Ridged multifractal in [0,1]. Sharp crests: cracks, rock, rust fronts. */
float ridged2(vec2 p, vec2 period, int octaves, float gain, float sharpness) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec2 fp = p;
  vec2 per = period;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    float n = 1.0 - abs(perlin2(fp, per));
    n = pow(clamp(n, 0.0, 1.0), sharpness);
    sum += amp * n;
    norm += amp;
    amp *= gain;
    fp *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

float ridged2(vec2 p, vec2 period, int octaves) { return ridged2(p, period, octaves, 0.5, 2.0); }

/** Turbulence: absolute-value fBm in [0,1]. Billowy, good for grime and smoke. */
float turbulence2(vec2 p, vec2 period, int octaves) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec2 fp = p;
  vec2 per = period;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    sum += amp * abs(perlin2(fp, per));
    norm += amp;
    amp *= 0.5;
    fp *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

float turbulence3(vec3 p, int octaves) {
  float sum = 0.0;
  float norm = 0.0;
  float amp = 1.0;
  vec3 fp = p;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    sum += amp * abs(simplex3(fp));
    norm += amp;
    amp *= 0.5;
    fp *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

// ---------------------------------------------------------------------------
// Worley / Voronoi
// ---------------------------------------------------------------------------

/**
 * Cellular noise. Returns (F1, F2, cellId) where F1/F2 are the distances to the
 * closest and second-closest feature points and cellId is a stable [0,1) hash
 * of the owning cell — the handle for per-cell colour and height variation.
 */
vec3 worley2(vec2 p, vec2 period, float jitter) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = wrap2(ip + g, period);
      vec2 o = hash22(cell);
      vec2 r = g + mix(vec2(0.5), o, jitter) - fp;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash12(cell + 7.13);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}

vec3 worley2(vec2 p, vec2 period) { return worley2(p, period, 1.0); }

/**
 * Voronoi with an explicit edge distance. Returns
 * (cellId, F1, edgeDistance, cellCentreOffsetLength) — the edge distance is a
 * proper distance-to-border rather than F2-F1, so grout lines stay even width.
 */
vec4 voronoi2(vec2 p, vec2 period, float jitter) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);

  vec2 bestOffset = vec2(0.0);
  vec2 bestCell = vec2(0.0);
  float f1 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = wrap2(ip + g, period);
      vec2 r = g + mix(vec2(0.5), hash22(cell), jitter) - fp;
      float d = dot(r, r);
      if (d < f1) {
        f1 = d;
        bestOffset = r;
        bestCell = cell;
      }
    }
  }

  float edge = 8.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = wrap2(ip + g, period);
      vec2 r = g + mix(vec2(0.5), hash22(cell), jitter) - fp;
      vec2 d = r - bestOffset;
      float len = length(d);
      if (len > 1e-4) {
        edge = min(edge, 0.5 * dot(bestOffset + r, d / len));
      }
    }
  }

  return vec4(hash12(bestCell + 7.13), sqrt(f1), edge, length(bestOffset));
}

vec4 voronoi2(vec2 p, vec2 period) { return voronoi2(p, period, 1.0); }

// ---------------------------------------------------------------------------
// Domain warping, flow and curl
// ---------------------------------------------------------------------------

/** Offsetting a periodic field by a constant keeps it periodic, so this tiles. */
vec2 warp2(vec2 p, vec2 period, float amount, int octaves) {
  float wx = fbm2(p + vec2(11.7, 3.1), period, octaves);
  float wy = fbm2(p + vec2(-5.3, 19.4), period, octaves);
  return p + amount * vec2(wx, wy);
}

vec2 warp2(vec2 p, vec2 period, float amount) { return warp2(p, period, amount, 3); }

/** Divergence-free 2D flow: the gradient of an fBm potential, rotated 90 degrees. */
vec2 curl2(vec2 p, vec2 period, float eps) {
  float a = fbm2(p + vec2(eps, 0.0), period, 4);
  float b = fbm2(p - vec2(eps, 0.0), period, 4);
  float c = fbm2(p + vec2(0.0, eps), period, 4);
  float d = fbm2(p - vec2(0.0, eps), period, 4);
  float dx = (a - b) / (2.0 * eps);
  float dy = (c - d) / (2.0 * eps);
  return vec2(dy, -dx);
}

vec2 curl2(vec2 p, vec2 period) { return curl2(p, period, 0.02); }

vec3 curlPotential3(vec3 p) {
  return vec3(
    simplex3(p),
    simplex3(p + vec3(31.7, 47.3, 19.1)),
    simplex3(p + vec3(-13.1, 7.7, 61.3)));
}

vec3 curl3(vec3 p, float eps) {
  vec3 dx = vec3(eps, 0.0, 0.0);
  vec3 dy = vec3(0.0, eps, 0.0);
  vec3 dz = vec3(0.0, 0.0, eps);
  vec3 px0 = curlPotential3(p - dx);
  vec3 px1 = curlPotential3(p + dx);
  vec3 py0 = curlPotential3(p - dy);
  vec3 py1 = curlPotential3(p + dy);
  vec3 pz0 = curlPotential3(p - dz);
  vec3 pz1 = curlPotential3(p + dz);
  return vec3(
    (py1.z - py0.z) - (pz1.y - pz0.y),
    (pz1.x - pz0.x) - (px1.z - px0.z),
    (px1.y - px0.y) - (py1.x - py0.x)) / (2.0 * eps);
}

vec3 curl3(vec3 p) { return curl3(p, 0.05); }

#endif
`;
