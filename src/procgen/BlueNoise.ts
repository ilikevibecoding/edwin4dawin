import * as THREE from 'three';
import { Rng } from '../core/MathUtils';

/**
 * Void-and-cluster blue noise (Ulichney 1993).
 *
 * White noise is not a substitute here: the whole point of the texture is its
 * spectral shape. Dithering, TAA jitter and SSAO sampling all rely on the
 * energy being pushed into high frequencies so the eye — and the temporal
 * accumulation buffer — can average the error away.
 */
class VoidAndCluster {
  private readonly size: number;
  private readonly total: number;
  private readonly radius: number;
  private readonly kernel: Float32Array;
  private readonly kernelWidth: number;

  private readonly pattern: Uint8Array;
  private readonly energy: Float32Array;
  /** Deterministic sub-epsilon offsets so ties break evenly rather than towards (0,0). */
  private readonly tieBreak: Float32Array;

  constructor(size: number, seed: number, sigma = 1.5) {
    this.size = size;
    this.total = size * size;
    this.radius = Math.max(2, Math.ceil(sigma * 2.8));
    this.kernelWidth = this.radius * 2 + 1;
    this.kernel = new Float32Array(this.kernelWidth * this.kernelWidth);

    const inv = 1 / (2 * sigma * sigma);
    for (let dy = -this.radius; dy <= this.radius; dy++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const d2 = dx * dx + dy * dy;
        this.kernel[(dy + this.radius) * this.kernelWidth + (dx + this.radius)] = Math.exp(-d2 * inv);
      }
    }

    this.pattern = new Uint8Array(this.total);
    this.energy = new Float32Array(this.total);
    this.tieBreak = new Float32Array(this.total);

    const rng = new Rng(seed);
    for (let i = 0; i < this.total; i++) this.tieBreak[i] = rng.next() * 1e-4;

    this.seedInitialPattern(rng);
  }

  private stamp(index: number, sign: number): void {
    const n = this.size;
    const r = this.radius;
    const kw = this.kernelWidth;
    const x0 = index % n;
    const y0 = (index - x0) / n;
    for (let dy = -r; dy <= r; dy++) {
      const y = (y0 + dy + n) % n;
      const rowBase = y * n;
      const kernelRow = (dy + r) * kw + r;
      for (let dx = -r; dx <= r; dx++) {
        const x = (x0 + dx + n) % n;
        this.energy[rowBase + x] += sign * this.kernel[kernelRow + dx];
      }
    }
  }

  private set(index: number): void {
    this.pattern[index] = 1;
    this.stamp(index, 1);
  }

  private clear(index: number): void {
    this.pattern[index] = 0;
    this.stamp(index, -1);
  }

  /** Location of the 1 with the most crowded neighbourhood. */
  private tightestCluster(): number {
    let best = -1;
    let bestEnergy = -Infinity;
    for (let i = 0; i < this.total; i++) {
      if (this.pattern[i] === 0) continue;
      const e = this.energy[i] + this.tieBreak[i];
      if (e > bestEnergy) {
        bestEnergy = e;
        best = i;
      }
    }
    return best;
  }

  /** Location of the 0 with the emptiest neighbourhood. */
  private largestVoid(): number {
    let best = -1;
    let bestEnergy = Infinity;
    for (let i = 0; i < this.total; i++) {
      if (this.pattern[i] === 1) continue;
      const e = this.energy[i] + this.tieBreak[i];
      if (e < bestEnergy) {
        bestEnergy = e;
        best = i;
      }
    }
    return best;
  }

  /**
   * Scatter a tenth of the pixels at random, then relax by repeatedly moving the
   * most crowded point into the emptiest hole until the move is a no-op.
   */
  private seedInitialPattern(rng: Rng): void {
    const ones = Math.max(1, Math.round(this.total / 10));
    let placed = 0;
    while (placed < ones) {
      const i = Math.min(this.total - 1, Math.floor(rng.next() * this.total));
      if (this.pattern[i] === 0) {
        this.set(i);
        placed++;
      }
    }

    // The ranking passes re-derive the whole ordering anyway, so this only has
    // to get the pattern out of the worst of its random clumping. Relaxing to
    // full convergence would cost several times the rest of the algorithm.
    const limit = ones;
    for (let iteration = 0; iteration < limit; iteration++) {
      const cluster = this.tightestCluster();
      this.clear(cluster);
      const hole = this.largestVoid();
      if (hole === cluster) {
        this.set(cluster);
        break;
      }
      this.set(hole);
    }
  }

  /**
   * Ranks every pixel, producing the ordered dither array. Phase one peels the
   * initial pattern apart from its tightest clusters downwards; phase two fills
   * the remaining voids upwards. Ulichney's third phase is the same operation
   * as the second for a symmetric linear filter, so it is folded in.
   */
  run(): Uint8Array {
    const initial = this.pattern.slice();
    const initialOnes = initial.reduce((sum, v) => sum + v, 0);
    const rank = new Int32Array(this.total).fill(-1);

    for (let r = initialOnes - 1; r >= 0; r--) {
      const cluster = this.tightestCluster();
      this.clear(cluster);
      rank[cluster] = r;
    }

    this.pattern.set(initial);
    this.energy.fill(0);
    for (let i = 0; i < this.total; i++) {
      if (this.pattern[i] === 1) this.stamp(i, 1);
    }

    for (let r = initialOnes; r < this.total; r++) {
      const hole = this.largestVoid();
      this.set(hole);
      rank[hole] = r;
    }

    const out = new Uint8Array(this.total);
    const scale = 255 / (this.total - 1);
    for (let i = 0; i < this.total; i++) out[i] = Math.round(rank[i] * scale);
    return out;
  }
}

/** One independent blue-noise field, 0..255, wrapping seamlessly. */
export function generateBlueNoiseChannel(size: number, seed: number, sigma = 1.5): Uint8Array {
  return new VoidAndCluster(size, seed, sigma).run();
}

const CHANNEL_SEEDS = [0x5f3759df, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

/**
 * An RGBA texture configured for blue noise but not yet filled.
 *
 * The contract exposes `blueNoise` as a non-null readonly, and the render module
 * caches the object on first sight, so the texture has to exist before `init()`
 * runs and keep its identity once filled. Mid-grey is the safe starting value:
 * a dither offset of 0.5 is a plain rounding bias rather than a visible pattern.
 */
export function createBlueNoiseTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4).fill(128);
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = 'blueNoise';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Fills each channel of `texture` with an independent blue-noise field, so a
 * shader can pull four decorrelated samples from one fetch.
 *
 * `onBatch` is awaited between channels: a single 64x64 field is tens of
 * milliseconds of scanning, and yielding lets the loading bar keep painting.
 */
export async function fillBlueNoiseTexture(
  texture: THREE.DataTexture,
  onBatch?: () => Promise<void>,
): Promise<void> {
  const image = texture.image as { width: number; height: number; data: Uint8Array };
  const size = image.width;
  const data = image.data;

  for (let channel = 0; channel < 4; channel++) {
    const field = generateBlueNoiseChannel(size, CHANNEL_SEEDS[channel]);
    for (let i = 0; i < field.length; i++) data[i * 4 + channel] = field[i];
    texture.needsUpdate = true;
    if (onBatch) await onBatch();
  }
}
