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
 *
 * The same grid also gives the two maps' *shapes*, which matters as much as
 * their scale: matching total energy across a probe whose sky and ground halves
 * are equally bright hands the scene an ambient with no up-down gradient at all,
 * and a scene lit from every direction at once has no dark undersides. See
 * {@link upperIrradiance}.
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
/**
 * Share of the probe's contribution re-issued as a sky-only hemisphere term.
 *
 * Half is as far as this can usefully go: the probe is also what supplies the
 * specular environment, and a hemisphere light contributes nothing to it, so
 * taking more would leave every reflective surface darker than the diffuse
 * shading around it.
 */
const DIRECTIONAL_SHARE = 0.45;

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
  /**
   * cos(lat)*sin(lat) over the upper half only, normalised so that pi times the
   * weighted sum is the irradiance an up-facing surface collects.
   */
  private readonly cosineWeights = new Float32Array(GRID_HEIGHT);

  private calibratedMap: THREE.Texture | null = null;
  private ratio = 1;
  private referenceAtCalibration = 1;
  private lastUpper = 0;
  private probeUpper = 0;
  private skyUpper = 0;

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
    let cosTotal = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const lat = ((y + 0.5) / GRID_HEIGHT - 0.5) * Math.PI;
      const w = Math.cos(lat);
      this.weights[y] = w;
      total += w;
      const c = lat > 0 ? w * Math.sin(lat) : 0;
      this.cosineWeights[y] = c;
      cosTotal += c;
    }
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.weights[y] /= total * GRID_WIDTH;
      this.cosineWeights[y] /= Math.max(cosTotal, 1e-6) * GRID_WIDTH;
    }
  }

  /**
   * Multiplier for `scene.environmentIntensity`. Tracks the sky's brightness
   * between calibrations so a day/night cycle needs no further readbacks.
   *
   * {@link DIRECTIONAL_SHARE} of the probe is held back here and re-issued by
   * the lighting rig as a sky-only hemisphere term, so the caller must add
   * {@link skyFillFor} or the scene loses that much ambient outright.
   */
  scaleFor(referenceRadiance: number): number {
    if (this.calibratedMap === null) return 1;
    return THREE.MathUtils.clamp(
      this.ratio * this.drift(referenceRadiance) * (1 - DIRECTIONAL_SHARE),
      0.02,
      60,
    );
  }

  /**
   * Irradiance an up-facing surface should receive from the sky-only fill that
   * stands in for the share of the probe {@link scaleFor} withheld.
   *
   * The probe procgen hands over is close to isotropic — its ground half
   * measures about as bright as its sky half, where the atmosphere model says
   * the sky should be some two and a half times the bounce. Scaling an isotropic
   * probe to the right total energy still lights every direction equally, and a
   * surface that receives as much from below as from above has no reason to go
   * dark under an awning or inside a wheel arch. Moving part of the probe's
   * contribution into a hemisphere light leaves roofs and roads exactly where
   * they were while taking a stop off the undersides, which is where the
   * contrast a sunlit street is supposed to have actually lives.
   */
  skyFillFor(referenceRadiance: number): number {
    if (this.calibratedMap === null) return 0;
    const scaled = this.probeUpper * this.ratio * this.drift(referenceRadiance);
    // A probe measured as brighter above than the sky itself would hand back
    // more fill than the atmosphere ever emits; the sky's own upper hemisphere
    // is the ceiling.
    const ceiling = this.skyUpper * this.drift(referenceRadiance);
    return Math.PI * DIRECTIONAL_SHARE * Math.min(scaled, ceiling);
  }

  private drift(referenceRadiance: number): number {
    return referenceRadiance / Math.max(this.referenceAtCalibration, 1e-4);
  }

  /** True once a probe has been measured; before that `scaleFor` returns 1. */
  get calibrated(): boolean {
    return this.calibratedMap !== null;
  }

  /** Sky-to-ground radiance ratio of the measured probe; 1 is fully isotropic. */
  get probeDirectionality(): number {
    return this.probeUpper > 0 && this.skyUpper > 0 ? this.probeUpper / this.skyUpper : 0;
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
    const skyUpper = this.lastUpper;
    const mapMean = this.measureProbe(renderer, blitter, map, height);
    if (!(skyMean > 0) || !(mapMean > 0)) return false;

    this.calibratedMap = map;
    this.ratio = skyMean / mapMean;
    this.probeUpper = this.lastUpper;
    this.skyUpper = skyUpper;
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
   *
   * Also leaves the cosine-weighted upper-hemisphere mean in {@link lastUpper}
   * for whichever measurement ran last, since it comes off the same readback.
   */
  private reduce(renderer: THREE.WebGLRenderer): number {
    const buffer = this.readback;
    renderer.readRenderTargetPixels(this.target, 0, 0, GRID_WIDTH, GRID_HEIGHT, buffer);
    renderer.setRenderTarget(null);

    const raw = this.weightedMean(Infinity, this.weights);
    if (!(raw > 0)) {
      this.lastUpper = 0;
      return raw;
    }
    // Point-sampling a 32x16 grid means the sun disc either lands in a cell or
    // misses, and it is three orders of magnitude above the sky: a hit multiplies
    // the answer by ten and the whole IBL with it, so the same probe calibrates
    // differently depending on where the sun happens to fall between two texels.
    // Clipping both measurements at the same multiple of their own mean removes
    // that aliasing while leaving the diffuse comparison, which is what the ratio
    // is for, untouched.
    const ceiling = raw * OUTLIER_CLIP;
    this.lastUpper = this.weightedMean(ceiling, this.cosineWeights);
    return this.weightedMean(ceiling, this.weights);
  }

  private weightedMean(ceiling: number, weights: Float32Array): number {
    const buffer = this.readback;
    let mean = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const weight = weights[y];
      if (weight === 0) continue;
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
