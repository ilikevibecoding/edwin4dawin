import * as THREE from 'three';
import { clamp, saturate } from '../core/MathUtils';

/**
 * Procedurally generated colour-grading LUT.
 *
 * A 3D texture rather than an analytic chain in the composite shader: the whole
 * grade — lift/gamma/gain, per-channel curves, contrast, saturation and the
 * split-tone — collapses into a single trilinear fetch, so the look can get as
 * elaborate as the art direction wants without costing anything at runtime.
 *
 * The table maps display-referred sRGB to display-referred sRGB, which is where
 * lift/gamma/gain are defined, so the composite pass tonemaps and encodes
 * *before* it samples.
 */

export interface GradeParams {
  /** Added to the shadows, per channel. Cool values here read as "night vision". */
  lift: THREE.Vector3;
  /** Multiplies the highlights, per channel. */
  gain: THREE.Vector3;
  /** Per-channel gamma; > 1 lifts midtones. */
  gamma: THREE.Vector3;
  /** S-curve strength around {@link pivot}. */
  contrast: number;
  pivot: number;
  saturation: number;
  /** Colour pushed into the shadows by the split-tone. */
  shadowTint: THREE.Color;
  /** Colour pushed into the highlights by the split-tone. */
  highlightTint: THREE.Color;
  /** 0..1 strength of the split-tone. */
  splitStrength: number;
  /** 0..1 balance point between the shadow and highlight halves. */
  splitBalance: number;
  /** Channel crosstalk; a little bleed is what stops digital grades looking harsh. */
  crosstalk: number;
}

/**
 * The house look: deep teal-leaning shadows, a warm highlight roll-off, mild
 * S-curve and just enough desaturation in the deepest blacks that they read as
 * black rather than as coloured mud.
 */
export const DEFAULT_GRADE: GradeParams = {
  lift: /* @__PURE__ */ new THREE.Vector3(0.0, 0.008, 0.021),
  gain: /* @__PURE__ */ new THREE.Vector3(1.055, 1.006, 0.958),
  gamma: /* @__PURE__ */ new THREE.Vector3(1.0, 0.995, 1.02),
  contrast: 1.14,
  pivot: 0.435,
  saturation: 1.07,
  shadowTint: /* @__PURE__ */ new THREE.Color(0.16, 0.46, 0.56),
  highlightTint: /* @__PURE__ */ new THREE.Color(1.0, 0.8, 0.53),
  splitStrength: 0.11,
  splitBalance: 0.46,
  crosstalk: 0.045,
};

const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

export class GradingLut {
  readonly texture: THREE.Data3DTexture;
  readonly size: number;
  private readonly data: Uint8Array;
  private params: GradeParams;

  constructor(size = 32, params: GradeParams = DEFAULT_GRADE) {
    this.size = size;
    this.params = { ...params };
    this.data = new Uint8Array(size * size * size * 4);

    this.texture = new THREE.Data3DTexture(this.data, size, size, size);
    this.texture.format = THREE.RGBAFormat;
    this.texture.type = THREE.UnsignedByteType;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.wrapR = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.unpackAlignment = 1;
    this.texture.name = 'gradeLut';

    this.rebuild();
  }

  /** Scale factor and offset that map a 0..1 colour onto texel centres. */
  get scale(): number {
    return (this.size - 1) / this.size;
  }

  get offset(): number {
    return 0.5 / this.size;
  }

  setParams(params: Partial<GradeParams>): void {
    this.params = { ...this.params, ...params };
    this.rebuild();
  }

  private rebuild(): void {
    const n = this.size;
    const p = this.params;
    const inv = 1 / (n - 1);
    const invGamma = [1 / Math.max(p.gamma.x, 1e-3), 1 / Math.max(p.gamma.y, 1e-3), 1 / Math.max(p.gamma.z, 1e-3)];
    const rgb = [0, 0, 0];
    let write = 0;

    for (let b = 0; b < n; b++) {
      for (let g = 0; g < n; g++) {
        for (let r = 0; r < n; r++) {
          rgb[0] = r * inv;
          rgb[1] = g * inv;
          rgb[2] = b * inv;

          // --- lift / gain / gamma, the classic three-way grade ---------------
          const lift = [p.lift.x, p.lift.y, p.lift.z];
          const gain = [p.gain.x, p.gain.y, p.gain.z];
          for (let c = 0; c < 3; c++) {
            let v = lift[c] + rgb[c] * (1 - lift[c]);
            v *= gain[c];
            rgb[c] = Math.pow(Math.max(v, 0), invGamma[c]);
          }

          // --- filmic S-curve about the pivot --------------------------------
          for (let c = 0; c < 3; c++) {
            rgb[c] = sCurve(rgb[c], p.contrast, p.pivot);
          }

          // --- saturation, measured against Rec.709 luma ---------------------
          const luma = rgb[0] * LUMA_R + rgb[1] * LUMA_G + rgb[2] * LUMA_B;
          for (let c = 0; c < 3; c++) {
            rgb[c] = luma + (rgb[c] - luma) * p.saturation;
          }

          // --- split-tone ---------------------------------------------------
          // Two smooth weights that never sum above one, so the mid-tones keep
          // their neutrality and only the extremes pick up the tint.
          const shadowWeight = Math.pow(1 - saturate(luma / Math.max(p.splitBalance, 1e-3)), 2);
          const highlightWeight = Math.pow(
            saturate((luma - p.splitBalance) / Math.max(1 - p.splitBalance, 1e-3)),
            2,
          );
          const st = p.shadowTint;
          const ht = p.highlightTint;
          const tint = [
            st.r * shadowWeight + ht.r * highlightWeight,
            st.g * shadowWeight + ht.g * highlightWeight,
            st.b * shadowWeight + ht.b * highlightWeight,
          ];
          const tintWeight = (shadowWeight + highlightWeight) * p.splitStrength;
          for (let c = 0; c < 3; c++) {
            // Soft-light style blend: tints without shifting overall exposure.
            const blend = softLight(rgb[c], tint[c]);
            rgb[c] = rgb[c] + (blend - rgb[c]) * tintWeight;
          }

          // --- crosstalk ----------------------------------------------------
          if (p.crosstalk > 0) {
            const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
            for (let c = 0; c < 3; c++) rgb[c] += (mean - rgb[c]) * p.crosstalk * saturate(mean * 2.2);
          }

          // Deep blacks lose their chroma; coloured noise floors look like a bug.
          const finalLuma = rgb[0] * LUMA_R + rgb[1] * LUMA_G + rgb[2] * LUMA_B;
          const desat = Math.pow(1 - saturate(finalLuma * 7), 3) * 0.6;
          for (let c = 0; c < 3; c++) rgb[c] += (finalLuma - rgb[c]) * desat;

          this.data[write++] = Math.round(clamp(rgb[0], 0, 1) * 255);
          this.data[write++] = Math.round(clamp(rgb[1], 0, 1) * 255);
          this.data[write++] = Math.round(clamp(rgb[2], 0, 1) * 255);
          this.data[write++] = 255;
        }
      }
    }

    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

function sCurve(x: number, contrast: number, pivot: number): number {
  const v = Math.max(x, 0);
  if (contrast === 1) return v;
  // Power about the pivot keeps the pivot fixed while steepening either side.
  const shaped = Math.pow(v / Math.max(pivot, 1e-3), contrast) * pivot;
  // Blend back toward linear in the highlights so the top does not clip early.
  const roll = saturate((v - pivot) / Math.max(1 - pivot, 1e-3));
  return shaped * (1 - roll * 0.35) + v * roll * 0.35;
}

function softLight(base: number, blend: number): number {
  return blend <= 0.5
    ? 2 * base * blend + base * base * (1 - 2 * blend)
    : 2 * base * (1 - blend) + Math.sqrt(Math.max(base, 0)) * (2 * blend - 1);
}
