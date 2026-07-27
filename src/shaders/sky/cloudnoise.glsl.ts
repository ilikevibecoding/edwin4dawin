/**
 * Bake passes for the cloud volumes.
 *
 * `shape` is the classic Horizon/Nubis layout: R holds Perlin-Worley (Perlin
 * dilated by inverted Worley, which gives billowy cauliflower with fBm
 * variation) and GBA hold inverted Worley at 1x/2x/4x so the raymarch can build
 * a low-frequency fBm from one fetch. `detail` is a smaller volume of Worley
 * fBm used only to erode cloud edges.
 *
 * Both volumes are periodic, so they tile seamlessly across a cloud layer tens
 * of kilometres wide. They are baked once, one depth slice per draw.
 *
 * **Every frequency here has to fit the volume.** A Worley lattice at 16 times
 * the tile period in a 64-cube leaves one texel per cell, which is not a noise
 * field — it is white noise, and trilinear filtering of white noise is a lattice
 * of bilinear patches whose iso-surfaces are flat and axis-aligned. Used to
 * erode a cloud edge that shows up as a *rectangle*: a straight vertical side, a
 * straight top, a right-angled corner, in world space, which is why it reads as
 * screen-axis-aligned whenever the camera happens to look down a world axis.
 * Eight texels per cell is the floor, sixteen is comfortable, and `budgetFor`
 * sizes the volumes so the ladders below stay inside that.
 */

export const CLOUD_SHAPE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSliceZ;
uniform float uPeriod;

void main() {
  vec3 p = vec3(vUv, uSliceZ) * uPeriod;

  /* Four octaves of Worley, shared between the four channels. Building each
     channel's fBm from its own calls would triple the cost of the bake for
     bit-identical output. */
  float w1 = worley3(p, uPeriod);
  float w2 = worley3(p * 2.0, uPeriod * 2.0);
  float w4 = worley3(p * 4.0, uPeriod * 4.0);
  float w8 = worley3(p * 8.0, uPeriod * 8.0);

  float perlin = perlinFbm3(p, uPeriod, 3);
  float lowWorley = w1 * 0.625 + w2 * 0.25 + w4 * 0.125;
  /* Perlin dilated by inverted Worley: billowy cauliflower with fBm variation. */
  float pw = remap(perlin, 0.0, 1.0, lowWorley, 1.0);

  gl_FragColor = vec4(
    pw,
    lowWorley,
    w2 * 0.625 + w4 * 0.25 + w8 * 0.125,
    w4 * 0.7 + w8 * 0.3);
}
`;

export const CLOUD_DETAIL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSliceZ;
uniform float uPeriod;

void main() {
  vec3 p = vec3(vUv, uSliceZ) * uPeriod;
  float w1 = worley3(p, uPeriod);
  float w2 = worley3(p * 2.0, uPeriod * 2.0);
  float w4 = worley3(p * 4.0, uPeriod * 4.0);
  gl_FragColor = vec4(
    w1 * 0.68 + w2 * 0.32,
    w2 * 0.68 + w4 * 0.32,
    w4,
    1.0);
}
`;

/**
 * Weather map. R is coverage, G is cloud type (0 flat, 1 towering), B is a
 * second coverage octave scrolled at a different rate so the field *evolves*
 * rather than merely translating, A is precipitation (used to darken bases).
 *
 * The map is repeat-wrapped over 80 km of world, so it has to tile — and every
 * frequency here is therefore an **integer** number of tiles. `perlin3` wraps
 * its lattice with `mod(cell, period)`, which only lines up when the period is a
 * whole number of cells; a fractional period silently produces a field that does
 * not tile, and the seam then lands on the world axis planes. Those planes pass
 * through the camera, so they project to a dead-straight vertical line with
 * dense cloud on one side and clear sky on the other. It is unmistakable once
 * seen and invisible in any single-tile preview.
 *
 * Read back to the CPU once so the sun-occlusion scalar the lighting rig
 * consumes can be evaluated without a GPU round trip.
 */
export const WEATHER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uPeriod;
uniform float uWeatherSeed;

/**
 * Algebraic sigmoid about \`centre\`. Fills [0,1] without ever reaching either end,
 * so the field has no plateaus in it — see the note at the coverage channel.
 */
float stretch(float x, float centre, float slope) {
  float t = (x - centre) * slope;
  return 0.5 + 0.5 * (t / (1.0 + abs(t)));
}

void main() {
  float pWarp = max(floor(uPeriod / 3.0), 1.0);
  float pCover = max(floor(uPeriod), 1.0);
  float pType = max(floor(uPeriod / 2.0), 1.0);
  float pFine = max(floor(uPeriod * 2.0), 1.0);
  float pPrecip = max(floor(uPeriod * 2.0 / 3.0), 1.0);

  /* Domain warp so cell clusters organise into fronts and clear lanes rather
     than an even spatter of blobs. Periodic in tile units, so warping cannot
     break the tiling of what it warps. */
  float wx = perlinFbm3(vec3(vUv * pWarp, uWeatherSeed) + 3.1, pWarp, 3);
  float wy = perlinFbm3(vec3(vUv * pWarp, uWeatherSeed) + 17.7, pWarp, 3);
  vec2 q = vUv + vec2(wx - 0.5, wy - 0.5) * 0.42;

  /* Stretch the field to fill the range without ever *clipping* it.
     
     Perlin fBm occupies about a tenth of [0,1] either side of its mean, so it has
     to be stretched or the coverage threshold downstream lands on a knife edge.
     The obvious stretch is a scale and a clamp, and the clamp is a disaster: it
     turns the whole upper tail into plateaus of exactly 1.0, and a plateau in a
     field that is a function of x and z alone is a cloud with no variation in it
     and a hard-edged boundary — a slab with vertical sides, a flat top, and right
     angles where the plateau ends. It is the single largest reason a distant
     cumulus field reads as a row of grey boxes.
     
     An algebraic sigmoid has the same effect on the middle of the distribution
     and approaches its limits without reaching them, so the gradient is nowhere
     zero and nowhere infinite, and the boundary is decided by the 3D shape volume
     instead of by a 2D contour. */
  float coverage = stretch(perlinFbm3(vec3(q * pCover, uWeatherSeed), pCover, 4), 0.47, 4.2);
  /* Type and height get the same treatment and for the same reason: left raw they
     span 0.38 to 0.62, the cloud type never leaves the middle of its range, and
     every cell in the sky is the same cell. */
  float type = stretch(perlinFbm3(vec3(q * pType, uWeatherSeed) + 41.0, pType, 3), 0.5, 3.4);
  float second = stretch(perlinFbm3(vec3(q * pFine, uWeatherSeed) + 9.3, pFine, 4), 0.48, 3.8);
  float precip = stretch(perlinFbm3(vec3(q * pPrecip, uWeatherSeed) + 71.0, pPrecip, 3), 0.5, 3.0);

  gl_FragColor = vec4(coverage, type, second, precip);
}
`;
