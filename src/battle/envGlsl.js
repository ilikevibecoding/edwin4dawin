// Shared GLSL chunks for the battle environment (Coruscant surface, sky band, moons). WebGL2 only:
// integer hashing keeps the procedural lattices stable in float32 out to thousands of cells.

// PCG hash -> [0,1) floats. Inputs are non-negative ints (callers offset before hashing).
export const GLSL_HASH = /* glsl */ `
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float hash1(ivec2 p, uint seed) {
  uint h = pcg(uint(p.x) + pcg(uint(p.y) + pcg(seed)));
  return float(h) * (1.0 / 4294967296.0);
}
vec3 hash3(ivec2 p, uint seed) {
  uint h = pcg(uint(p.x) + pcg(uint(p.y) + pcg(seed)));
  uint h2 = pcg(h);
  uint h3 = pcg(h2);
  return vec3(float(h), float(h2), float(h3)) * (1.0 / 4294967296.0);
}
float hashf(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
`;

// 2D value noise on the integer lattice (quintic-smoothed, wraps in x every N cells so it tiles
// around a longitude axis). Smooth at any magnification, unlike a bilinear texture tap, so it is
// used for the large-scale warps of the planet's district boundaries.
export const GLSL_NOISE2 = /* glsl */ `
float vnoise2(vec2 p, int N, uint seed) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  int x0 = i.x % N;
  if (x0 < 0) x0 += N;
  int x1 = (x0 + 1) % N;
  int y0 = i.y + 64;
  float a = hash1(ivec2(x0, y0), seed);
  float b = hash1(ivec2(x1, y0), seed);
  float c = hash1(ivec2(x0, y0 + 1), seed);
  float d = hash1(ivec2(x1, y0 + 1), seed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

// 3D value noise + fbm on directions (sky band, moon surfaces). Cheap, smooth, no lattice artefacts at
// the scales used here.
export const GLSL_NOISE3 = /* glsl */ `
float vnoise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hashf(i + vec3(0, 0, 0)), hashf(i + vec3(1, 0, 0)), f.x),
        mix(hashf(i + vec3(0, 1, 0)), hashf(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hashf(i + vec3(0, 0, 1)), hashf(i + vec3(1, 0, 1)), f.x),
        mix(hashf(i + vec3(0, 1, 1)), hashf(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p, int octaves) {
  float s = 0.0;
  float a = 0.5;
  float n = 0.0;
  for (int o = 0; o < 6; o++) {
    if (o >= octaves) break;
    s += vnoise3(p) * a;
    n += a;
    a *= 0.5;
    p = p * 2.03 + vec3(11.7, 5.3, 2.1);
  }
  return s / n;
}
`;

// Voronoi on a lattice that wraps in x every N cells (longitude). Returns the two nearest feature
// distances, the vectors to both feature points (cell units), the exact distance to the bisector
// between them (the cell edge; F2-F1 alone leaves bright wedges where two points sit close) and three
// per-cell random values.
export const GLSL_VORONOI = /* glsl */ `
struct Cell {
  float f1;
  float f2;
  vec2 r1;
  vec2 r2;
  float edge;
  vec2 en;
  vec3 id;
};
Cell voronoi(vec2 c, int N, uint seed) {
  ivec2 base = ivec2(floor(c));
  vec2 f = fract(c);
  Cell out_;
  out_.f1 = 8.0;
  out_.f2 = 8.0;
  out_.r1 = vec2(0.0);
  out_.r2 = vec2(0.0);
  out_.id = vec3(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      ivec2 g = ivec2(i, j);
      ivec2 cell = base + g;
      int cx = cell.x % N;
      if (cx < 0) cx += N;
      vec3 h = hash3(ivec2(cx, cell.y + 16), seed);
      vec2 r = vec2(g) + h.xy - f;
      float d = dot(r, r);
      if (d < out_.f1) {
        out_.f2 = out_.f1;
        out_.r2 = out_.r1;
        out_.f1 = d;
        out_.r1 = r;
        out_.id = hash3(ivec2(cx, cell.y + 16), seed ^ 0x9e3779b9u);
      } else if (d < out_.f2) {
        out_.f2 = d;
        out_.r2 = r;
      }
    }
  }
  vec2 e = out_.r2 - out_.r1;
  float el = max(length(e), 1e-4);
  out_.en = e / el;
  out_.edge = (out_.f2 - out_.f1) / (2.0 * el);
  out_.f1 = sqrt(out_.f1);
  out_.f2 = sqrt(out_.f2);
  return out_;
}
// Anti-aliased line of half-width hw around dist = 0; px is the pixel footprint in the same units.
// Lines thinner than a pixel widen to one pixel and dim by (hw/w)^k: k = 1 conserves energy (bright
// arteries stay visible far away, as HDR lights do), k > 1 makes a dense net of sub-pixel streets fade
// toward the ground instead of averaging into a flat wash. Fully resolved wide bands run a little
// cooler than thin lines: a 40-pixel band at the radiance a 1-pixel line needs would be a white slab.
float lineAA(float dist, float hw, float px, float k) {
  float w = max(hw, px * 0.7);
  float a = pow(hw / w, k) * mix(1.0, 0.7, smoothstep(1.5, 5.0, hw / px));
  return a * (1.0 - smoothstep(w - px * 0.75, w + px * 0.75, dist));
}
// pixel footprint of coordinate c along unit direction n, from its screen-space Jacobian
float footprint(vec2 jx, vec2 jy, vec2 n) {
  return length(vec2(dot(jx, n), dot(jy, n))) + 1e-5;
}
`;
