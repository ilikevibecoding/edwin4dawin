import * as THREE from 'three';
import { Blitter, createRenderTarget } from './Blitter';
import type { Sky } from './Sky';

/**
 * Reconciles an externally authored IBL probe with this module's radiance scale.
 *
 * Procgen bakes its environment map against its own sky shader and its own gain,
 * and nothing in the contract says what unit that map is in. Measured against
 * this module's sky it currently comes back about fifteen times too dim, which is
 * not a number worth hard-coding: a mirror would read as a dark hole next to the
 * sky behind it, and the moment procgen retunes its gain the constant is wrong
 * again. So the ratio is measured on the GPU instead.
 *
 * Both maps are sampled on the same latitude/longitude grid and reduced with the
 * same solid-angle weights, so the systematic error in either measurement -- the
 * grid's coarseness, the roughness the probe is sampled at -- cancels in the
 * ratio. Two small readbacks are needed, but only when the probe changes
 * identity; afterwards the scale rides the sky's own reference radiance, so a
 * moving sun costs nothing.
 */

const GRID_WIDTH = 32;
const GRID_HEIGHT = 16;
/**
 * Sampling roughness for the probe. Low enough that the convolution does not
 * redistribute much energy across the grid, high enough to avoid sampling the
 * unfiltered mip where a bright sun disc would land in one texel and swamp the
 * average.
 */
const SAMPLE_ROUGHNESS = 0.5;
/** Per-sample ceiling for the second reduction, as a multiple of the first one's mean. */
const OUTLIER_CLIP = 6;

const PROBE_FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform sampler2D envMap;
uniform float uRoughness;

#define ENVMAP_TYPE_CUBE_UV
#include <cube_uv_reflection_fragment>

void main() {
  float lon = ( vUv.x - 0.25 ) * 6.283185307179586;
  float lat = ( vUv.y - 0.5 ) * 3.141592653589793;
  float cosLat = cos( lat );
  vec3 dir = vec3( cosLat * cos( lon ), sin( lat ), cosLat * sin( lon ) );
  gl_FragColor = vec4( textureCubeUV( envMap, dir, uRoughness ).rgb, 1.0 );
}
`;

/** Decode one IEEE 754 binary16 as stored by a half-float readback. */
function halfToFloat(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits & 0x7c00) >> 10;
  const fraction = bits & 0x03ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

export class EnvironmentCalibration {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly probeMaterial: THREE.ShaderMaterial;
  private readonly probeUniforms: Record<string, THREE.IUniform>;
  private readonly readback = new Uint16Array(GRID_WIDTH * GRID_HEIGHT * 4);
  /** cos(latitude) solid-angle weight per row, normalised to sum to one. */
  private readonly weights = new Float32Array(GRID_HEIGHT);

  private calibratedMap: THREE.Texture | null = null;
  private ratio = 1;
  private referenceAtCalibration = 1;

  constructor() {
    this.target = createRenderTarget(GRID_WIDTH, GRID_HEIGHT, {
      type: THREE.HalfFloatType,
      filter: THREE.NearestFilter,
      name: 'iblCalibration',
    });

    this.probeUniforms = {
      envMap: { value: null },
      uRoughness: { value: SAMPLE_ROUGHNESS },
    };
    this.probeMaterial = Blitter.material(PROBE_FRAGMENT, this.probeUniforms);
    this.probeMaterial.name = 'IblCalibrationProbe';

    let total = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const lat = ((y + 0.5) / GRID_HEIGHT - 0.5) * Math.PI;
      const w = Math.cos(lat);
      this.weights[y] = w;
      total += w;
    }
    for (let y = 0; y < GRID_HEIGHT; y++) this.weights[y] /= total * GRID_WIDTH;
  }

  /**
   * Multiplier for `scene.environmentIntensity`. Tracks the sky's brightness
   * between calibrations so a day/night cycle needs no further readbacks.
   */
  scaleFor(referenceRadiance: number): number {
    if (this.calibratedMap === null) return 1;
    const drift = referenceRadiance / Math.max(this.referenceAtCalibration, 1e-4);
    return THREE.MathUtils.clamp(this.ratio * drift, 0.02, 60);
  }

  /** True once a probe has been measured; before that `scaleFor` returns 1. */
  get calibrated(): boolean {
    return this.calibratedMap !== null;
  }

  /**
   * Measure `map` against the sky, if it is a CubeUV probe we have not already
   * measured. Returns true when a new ratio was established.
   */
  calibrate(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    sky: Sky,
    map: THREE.Texture | null,
  ): boolean {
    if (map === this.calibratedMap) return false;
    if (map === null) {
      this.calibratedMap = null;
      this.ratio = 1;
      this.referenceAtCalibration = 1;
      return false;
    }
    // Only a PMREM carries the CubeUV layout the probe shader indexes; anything
    // else is left at unit scale rather than measured against the wrong lookup.
    const height = (map.image as { height?: number } | undefined)?.height ?? 0;
    if (map.mapping !== THREE.CubeUVReflectionMapping || height <= 0) return false;

    const skyMean = this.measureSky(renderer, blitter, sky);
    const mapMean = this.measureProbe(renderer, blitter, map, height);
    if (!(skyMean > 0) || !(mapMean > 0)) return false;

    this.calibratedMap = map;
    this.ratio = skyMean / mapMean;
    this.referenceAtCalibration = Math.max(sky.state.referenceRadiance, 1e-4);
    return true;
  }

  /** Force the next `calibrate` call to re-measure the same probe. */
  invalidate(): void {
    this.calibratedMap = null;
  }

  private measureSky(renderer: THREE.WebGLRenderer, blitter: Blitter, sky: Sky): number {
    blitter.blit(renderer, sky.captureMaterial, this.target);
    return this.reduce(renderer);
  }

  private measureProbe(
    renderer: THREE.WebGLRenderer,
    blitter: Blitter,
    map: THREE.Texture,
    height: number,
  ): number {
    // Mirrors WebGLProgram.generateCubeUVSize; the chunk indexes the atlas with
    // these three numbers and reads the wrong mip without them.
    const maxMip = Math.log2(height) - 2;
    const texelHeight = 1 / height;
    const texelWidth = 1 / (3 * Math.max(2 ** maxMip, 7 * 16));
    const defines = this.probeMaterial.defines as Record<string, string>;
    // The chunk feeds this straight to exp2(), which has no integer overload, so
    // the mip count has to reach the shader as a float literal.
    const wanted = maxMip.toFixed(1);
    if (defines.CUBEUV_MAX_MIP !== wanted) {
      defines.CUBEUV_MAX_MIP = wanted;
      defines.CUBEUV_TEXEL_WIDTH = `${texelWidth}`;
      defines.CUBEUV_TEXEL_HEIGHT = `${texelHeight}`;
      this.probeMaterial.needsUpdate = true;
    }
    this.probeUniforms.envMap.value = map;
    blitter.blit(renderer, this.probeMaterial, this.target);
    return this.reduce(renderer);
  }

  /**
   * Solid-angle weighted mean luminance of the grid. The readback stalls the
   * pipeline, which is why the caller only reaches here on a probe change.
   */
  private reduce(renderer: THREE.WebGLRenderer): number {
    const buffer = this.readback;
    renderer.readRenderTargetPixels(this.target, 0, 0, GRID_WIDTH, GRID_HEIGHT, buffer);
    renderer.setRenderTarget(null);

    const raw = this.weightedMean(Infinity);
    if (!(raw > 0)) return raw;
    // Point-sampling a 32x16 grid means the sun disc either lands in a cell or
    // misses, and it is three orders of magnitude above the sky: a hit multiplies
    // the answer by ten and the whole IBL with it, so the same probe calibrates
    // differently depending on where the sun happens to fall between two texels.
    // Clipping both measurements at the same multiple of their own mean removes
    // that aliasing while leaving the diffuse comparison, which is what the ratio
    // is for, untouched.
    return this.weightedMean(raw * OUTLIER_CLIP);
  }

  private weightedMean(ceiling: number): number {
    const buffer = this.readback;
    let mean = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const weight = this.weights[y];
      let row = 0;
      for (let x = 0; x < GRID_WIDTH; x++) {
        const i = (y * GRID_WIDTH + x) * 4;
        const r = halfToFloat(buffer[i]);
        const g = halfToFloat(buffer[i + 1]);
        const b = halfToFloat(buffer[i + 2]);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (Number.isFinite(luma) && luma > 0) row += Math.min(luma, ceiling);
      }
      mean += row * weight;
    }
    return mean;
  }

  memoryBytes(): number {
    return GRID_WIDTH * GRID_HEIGHT * 8;
  }

  dispose(): void {
    this.target.dispose();
    this.probeMaterial.dispose();
  }
}
