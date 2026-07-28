import * as THREE from 'three';
import { FS_VERTEX } from './FullScreen';

/**
 * GPU procedural texture synthesis.
 *
 * Every surface map in the game is generated on the GPU at load time rather
 * than shipped as image data. Three reasons this is the right call here:
 *
 *  1. There are no art assets to download, so the alternative is flat colours.
 *  2. Synthesised maps are seamless by construction and can be regenerated at
 *     any resolution, so the same material looks correct on a 4 m crate and a
 *     120 m ground plane.
 *  3. Height is authored first and albedo/roughness/AO/normal are all derived
 *     from it, which keeps them physically consistent — mortar lines are
 *     simultaneously recessed, darker, rougher, and occluded, exactly as they
 *     are in reality. Independently authored maps almost never agree, and that
 *     disagreement is what makes procedural surfaces look fake.
 *
 * The forge is metric. Every bake declares how many metres one texture tile
 * covers (`tileMetres`) and how many metres of relief the 0..1 height range
 * spans (`heightMetres`). Those two numbers let the normal and AO passes work
 * in real slopes instead of arbitrary strengths, which is what stops fine
 * noise from turning into vibrating gravel: a 1 mm pit across 10 mm is a 6°
 * facet whatever the texture resolution happens to be.
 */

export interface MaterialMaps {
  map: THREE.Texture;
  /** RGB = tangent-space normal, A = the height field it was derived from. */
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  heightMap: THREE.Texture;
  dispose(): void;
}

const COMMON_GLSL = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSeed;
uniform vec2  uRepeat;
uniform float uTexel;
uniform float uTileMetres;
uniform vec4  uParams0;
uniform vec4  uParams1;
uniform vec4  uParams2;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

const float PI = 3.14159265359;

// ---- hashing ---------------------------------------------------------------
vec2 hash22(vec2 p) {
  p = mod(p, 4096.0);
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash21(vec2 p) {
  p = mod(p, 4096.0);
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// ---- tileable value / gradient noise ---------------------------------------
float vnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(mod(i + vec2(0.0, 0.0), period) + uSeed);
  float b = hash21(mod(i + vec2(1.0, 0.0), period) + uSeed);
  float c = hash21(mod(i + vec2(0.0, 1.0), period) + uSeed);
  float d = hash21(mod(i + vec2(1.0, 1.0), period) + uSeed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Smooth saturation to the open interval (-1, 1), with unit slope at the
// origin. Used to bring a noise field's rare outliers into range without the
// flat plateaus a clamp would leave, which on a height field read as suspicious
// mesas and on an albedo as posterised blotches.
float squash(float x) { return x * inversesqrt(1.0 + x * x); }

/**
 * Gradient noise with an independent period per axis.
 *
 * The anisotropic variants matter more than they look: rain streaks, mill
 * lines, wood fibre and rust runs are all stretched an order of magnitude in
 * one direction, and scaling the input of a scalar-period noise to get that
 * leaves the stretched axis wrapping at the wrong place, so the texture shows a
 * seam along one edge of every tile.
 *
 * On dynamic range, which matters here more than anything else about it: the
 * gradients are normalised and the result is scaled to a standard deviation of
 * about 0.18 either side of 0.5. Both are deliberate, and the second is the
 * fix for a defect that ran through every material in the library.
 *
 * Gradient noise is not uniformly distributed — it is sharply peaked about its
 * midpoint, and its theoretical extremes are reached only where a lattice cell
 * happens to have opposed gradients of full length. With unnormalised gradients
 * drawn from a square (mean length 0.77, and sometimes near zero) and the naive
 * 0.7071 scale that maps the *theoretical* range onto 0..1, the delivered
 * standard deviation was 0.14 — and after fbm's octave averaging, 0.09.
 *
 * Every call site in Materials.ts is written as (noise - 0.5) times some
 * amplitude, which reads as "vary this by plus or minus that". At sigma 0.09 it
 * actually varied it by a fifth of that. Concrete asked for 26 per cent tonal
 * drift and got 5; plaster asked for four millimetres of float relief and got
 * under one. That single factor is why every surface in the game measured flat
 * however much detail was authored into it, and why walls read as untextured
 * card at both one metre and ten.
 */
// Unit gradient for a lattice cell. The epsilon keeps normalize away from a
// zero-length hash, which would poison the whole tile with NaN.
vec2 cellGrad(vec2 cell, vec2 period) {
  vec2 g = hash22(mod(cell, period) + uSeed) * 2.0 - 1.0;
  return g * inversesqrt(max(dot(g, g), 1e-8));
}

float gnoise2(vec2 p, vec2 period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 ga = cellGrad(i + vec2(0.0, 0.0), period);
  vec2 gb = cellGrad(i + vec2(1.0, 0.0), period);
  vec2 gc = cellGrad(i + vec2(0.0, 1.0), period);
  vec2 gd = cellGrad(i + vec2(1.0, 1.0), period);
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float n = mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y);
  return squash(n * 1.8) * 0.5 + 0.5;
}

float gnoise(vec2 p, float period) {
  return gnoise2(p, vec2(period));
}

/**
 * Octave sum of gradient noise.
 *
 * Normalised in quadrature rather than by the linear sum of amplitudes. The
 * octaves are statistically independent, so their deviations add as a root sum
 * of squares; dividing by the linear sum therefore shrank the field by a
 * further factor of 1.6 with every extra octave, which is why a four-octave
 * fbm was flatter than the single octave it was built from.
 */
float fbm2(vec2 p, vec2 period, int octaves, float gain, float lacunarity) {
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  vec2 per = period;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    sum += (gnoise2(p, per) - 0.5) * amp;
    norm += amp * amp;
    amp *= gain;
    p *= lacunarity;
    per *= lacunarity;
  }
  return clamp(sum * inversesqrt(max(norm, 1e-5)) + 0.5, 0.0, 1.0);
}

float fbm(vec2 p, float period, int octaves, float gain, float lacunarity) {
  return fbm2(p, vec2(period), octaves, gain, lacunarity);
}

float ridged2(vec2 p, vec2 period, int octaves) {
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  vec2 per = period;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float n = 1.0 - abs(gnoise2(p, per) * 2.0 - 1.0);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

float ridged(vec2 p, float period, int octaves) {
  return ridged2(p, vec2(period), octaves);
}

// ---- tileable Worley -------------------------------------------------------
vec3 worley(vec2 p, float period, float jitter) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, period);
      vec2 o = hash22(cell + uSeed) * jitter;
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; id = hash21(cell + uSeed + 7.7); }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(f1, f2, id);
}

float remap(float v, float a, float b, float c, float d) {
  return c + (d - c) * clamp((v - a) / max(b - a, 1e-5), 0.0, 1.0);
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

// ---- metric helpers --------------------------------------------------------
// One uv unit is uTileMetres metres, so features are authored in metres and
// stay correct if a surface is re-tiled. Counts are rounded to integers
// because the noise primitives are only seamless on integer periods.

// Length in uv units of m metres.
float uvOf(float m) { return m / max(uTileMetres, 1e-4); }

// How many features of size m fit in one tile, rounded to keep tiling.
//
// The floor is two, not one, and that matters more than it looks. Every noise
// here wraps with mod(cell, period), so at a period of one *all four* corner
// gradients of every lattice cell resolve to the same vector and the noise
// degenerates into a smooth monotonic ramp. Asking for a feature bigger than half
// a tile therefore did not give a very low frequency — it gave a ruled gradient,
// and any field built on it came out as regular stripes. That is what put a false
// cross-hatch of vertical splits every thirty millimetres across all the timber in
// the game, and it had quietly flattened the dune band under the sand ripples and
// the y axis of every gravity streak as well.
float countOf(float m) { return max(2.0, floor(uTileMetres / max(m, 1e-4) + 0.5)); }

// Thin lines along Worley cell walls, the shape crack networks actually take.
// cellMetres is the average spacing of the network and widthMetres the crack
// width, both real-world.
float cellCracks(vec2 uv, float cellMetres, float widthMetres, float jitter) {
  float period = countOf(cellMetres);
  vec3 w = worley(uv * period, period, jitter);
  float wid = widthMetres * period / max(uTileMetres, 1e-4);
  return 1.0 - smoothstep(0.0, max(wid, 1e-4), w.y - w.x);
}

// Pushes a 0..1 field toward its extremes; k greater than 1 sharpens.
float contrast(float v, float k) {
  return clamp((v - 0.5) * k + 0.5, 0.0, 1.0);
}

// Horizontal banding — brick courses, concrete pour lifts, cladding runs.
// Returns the band's own random value in x and the metric distance to the
// nearest band edge in y, so a caller can tone the band and draw its joint
// from one call.
vec2 bands(float v, float metres) {
  float n = countOf(metres);
  float b = v * n;
  float id = hash21(vec2(mod(floor(b), n), 7.0) + uSeed);
  float e = min(fract(b), 1.0 - fract(b)) * uTileMetres / n;
  return vec2(id, e);
}

// Gravity-driven runs. Rain streaks, rust bleed and dust lines are all an order
// of magnitude taller than they are wide, and aspect is that ratio. v is up
// on every vertical face in the level, so this comes out pointing down.
float runs(vec2 uv, float widthMetres, float aspect) {
  float n = countOf(widthMetres);
  vec2 per = vec2(n, max(2.0, floor(n / max(aspect, 1.0) + 0.5)));
  return fbm2(uv * per, per, 3, 0.5, 2.0);
}

// Scattered axis-aligned rectangles: saw-cut road reinstatements, re-rendered
// wall panels, skim patches — anything whose outline was set by a straight tool
// cut rather than by a natural fracture.
//
// Worley is the usual reach for "irregular patches" and it is wrong for all of
// these. A Voronoi diagram is recognisable on sight, and using one to cover a
// third of a road in soft 1.8 m polygons does not read as roadworks; it reads as
// a hexagonal tiling, which is what it plainly looked like on every street.
//
// One rectangle per grid cell at most, placed anywhere inside it, so the result
// is scattered rather than gridded. x is the inside mask, y the metric distance
// to the nearest edge — for the cut line and its sealant — and z a value unique
// to the rectangle, so each patch can be a different batch of material.
vec3 rects(vec2 uv, vec2 cellMetres, float density, float minFrac, float maxFrac) {
  vec2 n = vec2(countOf(cellMetres.x), countOf(cellMetres.y));
  vec2 ci = mod(floor(uv * n), n);
  vec2 cf = fract(uv * n);
  vec2 size = minFrac + vec2(hash21(ci + uSeed + 11.3), hash21(ci + uSeed + 19.7))
                        * max(maxFrac - minFrac, 0.0);
  vec2 lo = (1.0 - size) * vec2(hash21(ci + uSeed + 27.1), hash21(ci + uSeed + 31.9));
  vec2 d = min(cf - lo, lo + size - cf) * (uTileMetres / n);
  float has = step(hash21(ci + uSeed + 3.7), density);
  float edge = min(d.x, d.y);
  return vec3(step(0.0, edge) * has, edge, hash21(ci + uSeed + 43.1));
}
`;

/**
 * Each material implements `surface()`, filling a `Surface` struct.
 * Height is in 0..1 and maps onto `heightMetres` of real relief; the forge
 * derives the normal map from it separately so the GLSL never has to think
 * about tangent space.
 */
const SURFACE_STRUCT = /* glsl */ `
struct Surface {
  vec3  albedo;      // linear
  float height;      // 0..1, scaled by heightMetres
  float roughness;   // 0..1
  float metalness;   // 0..1
  float ao;          // 0..1 (macro cavity, augmented by the derived AO pass)
};
`;

const OUTPUT_GLSL = /* glsl */ `
void main() {
  vec2 uv = vUv * uRepeat;
  Surface s = surface(uv);

  #if defined(OUT_ALBEDO)
    // Stored gamma-2.0 encoded. Eight bits of *linear* albedo quantises the
    // darks brutally — asphalt lives around 0.05, which is 13 codes — and the
    // banding shows up as terraced patches on the road. The square root buys
    // back roughly four bits where it matters; the material shader squares it
    // on the way back in.
    gl_FragColor = vec4(sqrt(clamp(s.albedo, 0.0, 1.0)), 1.0);
  #elif defined(OUT_ALBEDO_LINEAR)
    gl_FragColor = vec4(clamp(s.albedo, 0.0, 1.0), 1.0);
  #elif defined(OUT_HEIGHT)
    gl_FragColor = vec4(vec3(s.height), 1.0);
  #elif defined(OUT_ORM)
    // R = AO, G = roughness, B = metalness (glTF ORM convention).
    gl_FragColor = vec4(s.ao, s.roughness, s.metalness, 1.0);
  #else
    gl_FragColor = vec4(s.albedo, 1.0);
  #endif
}
`;

/**
 * Sobel height → tangent-space normal.
 *
 * `uStrength` is derived, not tuned: for a 3x3 Sobel the gradient estimate is
 * G/8 per texel, one texel is `tileMetres / size` metres across, and the
 * height range spans `heightMetres`, so a true slope needs
 * `heightMetres * size / (8 * tileMetres)`. Getting this wrong by an order of
 * magnitude — which an arbitrary strength constant does — turns millimetre
 * grain into centimetre boulders and is the single biggest cause of specular
 * boiling at grazing angles.
 *
 * Alpha carries the height field so the detail layer can modulate albedo and
 * roughness from a single fetch.
 */
const NORMAL_FROM_HEIGHT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHeight;
uniform sampler2D tBreakup;
uniform vec2  uTexel;
uniform float uStrength;

void main() {
  float tl = texture2D(tHeight, vUv + vec2(-uTexel.x, -uTexel.y)).r;
  float t  = texture2D(tHeight, vUv + vec2( 0.0,      -uTexel.y)).r;
  float tr = texture2D(tHeight, vUv + vec2( uTexel.x, -uTexel.y)).r;
  float l  = texture2D(tHeight, vUv + vec2(-uTexel.x,  0.0)).r;
  float c  = texture2D(tHeight, vUv).r;
  float r  = texture2D(tHeight, vUv + vec2( uTexel.x,  0.0)).r;
  float bl = texture2D(tHeight, vUv + vec2(-uTexel.x,  uTexel.y)).r;
  float b  = texture2D(tHeight, vUv + vec2( 0.0,       uTexel.y)).r;
  float br = texture2D(tHeight, vUv + vec2( uTexel.x,  uTexel.y)).r;

  float dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

  vec3 n = normalize(vec3(-dx * uStrength, -dy * uStrength, 1.0));
  #ifdef PACK_BREAKUP
    // The blue channel of a tangent-space normal is very nearly redundant: the
    // vector is unit length, so z can be recovered from xy. Spending eight bits
    // storing it is a waste on the one texture in the system that is sampled
    // three times per pixel, so for the shared detail layer it carries an
    // independent roughness break-up field instead.
    //
    // Independent is the point. Roughness derived from the height field can only
    // say "pits are rougher than peaks", which is true but topographic; real
    // surfaces are also patchily damp, polished, greasy or salted at scales that
    // have nothing to do with their bumps, and that decorrelated variation is
    // what stops a surface from reading as a single varnish.
    gl_FragColor = vec4(n.xy * 0.5 + 0.5, texture2D(tBreakup, vUv).g, c);
  #else
    gl_FragColor = vec4(n * 0.5 + 0.5, c);
  #endif
}
`;

/**
 * Finishing pass over the ORM map.
 *
 * Two jobs, both reading the height/normal pair:
 *
 *  - Horizon-based cavity AO. Slopes are converted to real gradients first, so
 *    the occlusion a crack casts depends on how deep it actually is rather than
 *    on the texture resolution.
 *  - Toksvig roughness widening. Mip-mapping averages normals toward flat and
 *    throws away the variance that made the surface look rough, so specular
 *    highlights bloom back to mirror-sharp at distance and shimmer. Measuring
 *    the shortfall in the averaged normal's length recovers that variance and
 *    folds it into roughness, where filtering handles it correctly.
 */
const ORM_FINALISE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHeight;
uniform sampler2D tNormal;
uniform sampler2D tORM;
uniform vec2  uTexel;
uniform float uRadius;
uniform float uStrength;
uniform float uHeightScale;
uniform float uToksvig;

void main() {
  float center = texture2D(tHeight, vUv).r;

  float occ = 0.0;
  const int DIRS = 8;
  for (int d = 0; d < DIRS; d++) {
    float a = (float(d) + 0.5) / float(DIRS) * 6.2831853;
    vec2 dir = vec2(cos(a), sin(a));
    float horizon = 0.0;
    for (int s = 1; s <= 3; s++) {
      float dist = float(s) * uRadius / 3.0;
      float h = texture2D(tHeight, vUv + dir * uTexel * dist).r;
      horizon = max(horizon, (h - center) * uHeightScale / dist);
    }
    // sin of the horizon elevation angle
    occ += horizon * inversesqrt(1.0 + horizon * horizon);
  }
  occ /= float(DIRS);

  // Five taps at 1.5 texels: enough to measure the variance one mip level
  // down, which is where the flattening starts to bite.
  vec3 sum = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
  vec2 o = uTexel * 1.5;
  sum += texture2D(tNormal, vUv + vec2( o.x,  o.y)).xyz * 2.0 - 1.0;
  sum += texture2D(tNormal, vUv + vec2(-o.x,  o.y)).xyz * 2.0 - 1.0;
  sum += texture2D(tNormal, vUv + vec2( o.x, -o.y)).xyz * 2.0 - 1.0;
  sum += texture2D(tNormal, vUv + vec2(-o.x, -o.y)).xyz * 2.0 - 1.0;
  float variance = max(0.0, 1.0 - length(sum) * 0.2);

  vec4 orm = texture2D(tORM, vUv);
  float ao = clamp(1.0 - occ * uStrength, 0.0, 1.0);
  float rough = sqrt(clamp(orm.g * orm.g + variance * uToksvig, 0.0, 1.0));
  gl_FragColor = vec4(orm.r * ao, rough, orm.b, 1.0);
}
`;

export interface ForgeOptions {
  size?: number;
  seed?: number;
  repeat?: [number, number];
  /** World metres covered by one texture tile. Drives every metric helper. */
  tileMetres?: number;
  /** Metres of relief spanned by the 0..1 height range. */
  heightMetres?: number;
  /** Fine multiplier on the derived normal slope; leave at 1 unless fighting. */
  normalStrength?: number;
  /** Cavity AO search radius in texels. */
  aoRadius?: number;
  aoStrength?: number;
  /** Weight of the normal-variance term folded into roughness. */
  toksvig?: number;
  /** Store albedo linear instead of gamma-2.0 encoded (for data textures). */
  albedoLinear?: boolean;
  /**
   * Drop the normal map's redundant z and carry the roughness channel in blue
   * instead. Only for maps sampled by hand, never for `normalMap`.
   */
  packBreakup?: boolean;
  params0?: [number, number, number, number];
  params1?: [number, number, number, number];
  params2?: [number, number, number, number];
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  colorC?: THREE.ColorRepresentation;
  anisotropy?: number;
}

export class TextureForge {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly cache = new Map<string, MaterialMaps>();

  private readonly normalMat: THREE.ShaderMaterial;
  private readonly normalPackMat: THREE.ShaderMaterial;
  private readonly ormMat: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.quad = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader: NORMAL_FROM_HEIGHT,
      uniforms: {
        tHeight: { value: null },
        tBreakup: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uStrength: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.normalPackMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader: NORMAL_FROM_HEIGHT,
      uniforms: {
        tHeight: { value: null },
        tBreakup: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uStrength: { value: 1 },
      },
      defines: { PACK_BREAKUP: '' },
      depthTest: false,
      depthWrite: false,
    });

    this.ormMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader: ORM_FINALISE,
      uniforms: {
        tHeight: { value: null },
        tNormal: { value: null },
        tORM: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRadius: { value: 6 },
        uStrength: { value: 1 },
        uHeightScale: { value: 1 },
        uToksvig: { value: 0.4 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  private renderTo(target: THREE.WebGLRenderTarget, material: THREE.Material): void {
    const prev = this.renderer.getRenderTarget();
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prev);
  }

  private makeTarget(size: number, float = false): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      format: THREE.RGBAFormat,
      type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
      generateMipmaps: true,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
    return rt;
  }

  /**
   * Bakes a full PBR set from one GLSL `surface()` body.
   * Results are cached by key; call `dispose()` on the forge to release them.
   */
  bake(key: string, surfaceGLSL: string, opts: ForgeOptions = {}): MaterialMaps {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const size = opts.size ?? 1024;
    const seed = opts.seed ?? 1;
    const repeat = opts.repeat ?? [1, 1];
    const tileMetres = opts.tileMetres ?? 1;
    const heightMetres = opts.heightMetres ?? 0.02;
    const aniso = opts.anisotropy ?? this.renderer.capabilities.getMaxAnisotropy();

    const uniforms = {
      uSeed: { value: seed },
      uRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) },
      uTexel: { value: 1 / size },
      uTileMetres: { value: tileMetres },
      uParams0: { value: new THREE.Vector4(...(opts.params0 ?? [0, 0, 0, 0])) },
      uParams1: { value: new THREE.Vector4(...(opts.params1 ?? [0, 0, 0, 0])) },
      uParams2: { value: new THREE.Vector4(...(opts.params2 ?? [0, 0, 0, 0])) },
      uColorA: { value: new THREE.Color(opts.colorA ?? 0xffffff) },
      uColorB: { value: new THREE.Color(opts.colorB ?? 0x808080) },
      uColorC: { value: new THREE.Color(opts.colorC ?? 0x404040) },
    };

    const build = (define: string): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        vertexShader: FS_VERTEX,
        fragmentShader: `${COMMON_GLSL}\n${SURFACE_STRUCT}\n${surfaceGLSL}\n${OUTPUT_GLSL}`,
        uniforms,
        defines: { [define]: '' },
        depthTest: false,
        depthWrite: false,
      });

    const albedoRT = this.makeTarget(size);
    const heightRT = this.makeTarget(size, true);
    const ormRT = this.makeTarget(size);
    const ormFinalRT = this.makeTarget(size);
    const normalRT = this.makeTarget(size);

    const matAlbedo = build(opts.albedoLinear ? 'OUT_ALBEDO_LINEAR' : 'OUT_ALBEDO');
    const matHeight = build('OUT_HEIGHT');
    const matORM = build('OUT_ORM');

    this.renderTo(albedoRT, matAlbedo);
    this.renderTo(heightRT, matHeight);
    this.renderTo(ormRT, matORM);

    // Slope conversion: one height unit is `heightMetres`, one texel is
    // `tileMetres / size`, and Sobel over-counts the gradient by 8.
    const heightScale = (heightMetres * size) / Math.max(tileMetres, 1e-4);

    const nMat = opts.packBreakup ? this.normalPackMat : this.normalMat;
    nMat.uniforms.tHeight.value = heightRT.texture;
    nMat.uniforms.tBreakup.value = ormRT.texture;
    (nMat.uniforms.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    nMat.uniforms.uStrength.value = (heightScale / 8) * (opts.normalStrength ?? 1);
    this.renderTo(normalRT, nMat);

    this.ormMat.uniforms.tHeight.value = heightRT.texture;
    this.ormMat.uniforms.tNormal.value = normalRT.texture;
    this.ormMat.uniforms.tORM.value = ormRT.texture;
    (this.ormMat.uniforms.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    this.ormMat.uniforms.uRadius.value = opts.aoRadius ?? 6;
    this.ormMat.uniforms.uStrength.value = opts.aoStrength ?? 1;
    this.ormMat.uniforms.uHeightScale.value = heightScale;
    this.ormMat.uniforms.uToksvig.value = opts.toksvig ?? 0.35;
    this.renderTo(ormFinalRT, this.ormMat);

    matAlbedo.dispose();
    matHeight.dispose();
    matORM.dispose();
    ormRT.dispose();

    const configure = (t: THREE.Texture): THREE.Texture => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      // Albedo is gamma-encoded by hand and decoded in the material shader, so
      // the sampler must stay out of the colour pipeline entirely.
      t.colorSpace = THREE.NoColorSpace;
      t.needsUpdate = true;
      return t;
    };

    const maps: MaterialMaps = {
      map: configure(albedoRT.texture),
      normalMap: configure(normalRT.texture),
      roughnessMap: configure(ormFinalRT.texture),
      aoMap: configure(ormFinalRT.texture),
      metalnessMap: configure(ormFinalRT.texture),
      heightMap: configure(heightRT.texture),
      dispose: () => {
        albedoRT.dispose();
        normalRT.dispose();
        ormFinalRT.dispose();
        heightRT.dispose();
      },
    };

    this.cache.set(key, maps);
    return maps;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
    this.normalMat.dispose();
    this.normalPackMat.dispose();
    this.ormMat.dispose();
    this.quad.geometry.dispose();
  }
}
