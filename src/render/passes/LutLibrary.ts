import * as THREE from 'three';

/**
 * Procedural 3D colour LUTs.
 *
 * Authored in code because the project ships no binary assets, and evaluated in
 * AgX's log domain rather than on display values: a display-referred LUT has
 * nowhere to put anything above white and quantises the shadows, which is
 * exactly where a film-style grade does most of its work.
 */

export type LutName = 'neutral' | 'desert' | 'night' | 'urban';

/** Where 18% grey sits in the normalised log domain. Must match grade.glsl. */
const MID = 0.6060606;
const SIZE = 32;

const LUMA_R = 0.2126729;
const LUMA_G = 0.7151522;
const LUMA_B = 0.072175;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function luma(c: Rgb): number {
  return c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function contrast(c: Rgb, amount: number, pivot = MID): void {
  c.r = (c.r - pivot) * amount + pivot;
  c.g = (c.g - pivot) * amount + pivot;
  c.b = (c.b - pivot) * amount + pivot;
}

/** Signed offsets applied by luminance band; the classic three-way grade. */
function splitTone(c: Rgb, shadow: Rgb, mid: Rgb, high: Rgb): void {
  const l = luma(c);
  const s = 1 - smoothstep(0.0, 0.6, l);
  const h = smoothstep(0.5, 1.0, l);
  const m = Math.max(0, 1 - s - h);
  c.r += shadow.r * s + mid.r * m + high.r * h;
  c.g += shadow.g * s + mid.g * m + high.g * h;
  c.b += shadow.b * s + mid.b * m + high.b * h;
}

function saturation(c: Rgb, amount: number): void {
  const l = luma(c);
  c.r = l + (c.r - l) * amount;
  c.g = l + (c.g - l) * amount;
  c.b = l + (c.b - l) * amount;
}

/**
 * Selective saturation around a hue. Used to keep skin and rust alive while the
 * rest of the frame desaturates, which is what stops a "desaturated" grade from
 * reading as grey mush.
 */
function boostHue(c: Rgb, targetHue: number, width: number, amount: number): void {
  const max = Math.max(c.r, Math.max(c.g, c.b));
  const min = Math.min(c.r, Math.min(c.g, c.b));
  const chroma = max - min;
  if (chroma < 1e-4) return;
  let hue: number;
  if (max === c.r) hue = ((c.g - c.b) / chroma) % 6;
  else if (max === c.g) hue = (c.b - c.r) / chroma + 2;
  else hue = (c.r - c.g) / chroma + 4;
  if (hue < 0) hue += 6;
  let d = Math.abs(hue - targetHue);
  if (d > 3) d = 6 - d;
  const w = 1 - smoothstep(0, width, d);
  if (w <= 0) return;
  saturation(c, 1 + amount * w);
}

function liftGammaGain(c: Rgb, lift: number, gamma: number, gain: number): void {
  const apply = (v: number) => {
    let x = lift + v * (gain - lift);
    x = Math.pow(Math.max(x, 0), gamma);
    return x;
  };
  c.r = apply(c.r);
  c.g = apply(c.g);
  c.b = apply(c.b);
}

type LookFn = (c: Rgb) => void;

const LOOKS: Record<LutName, LookFn | null> = {
  neutral: null,

  /**
   * The signature modern-military look: hot, desaturated, teal in the shadows,
   * warm in the highlights, with the orange band held back from going grey so
   * sand and rust still read as materials.
   */
  desert: (c) => {
    splitTone(
      c,
      { r: -0.026, g: 0.002, b: 0.034 },
      { r: 0.008, g: 0.002, b: -0.008 },
      { r: 0.028, g: 0.01, b: -0.032 },
    );
    saturation(c, 0.88);
    // Narrow, and only enough to keep sand and rust reading as materials. A wide
    // band at half again the chroma catches everything the warm key touches, and
    // since that is most of a desert frame the "selective" boost stops being
    // selective: the whole image converges on one orange. Contrast is left to
    // the grade, which has the pivot and the toe, so there is one place to tune
    // it rather than two that compound.
    boostHue(c, 0.55, 0.85, 0.3);
    liftGammaGain(c, 0.0, 0.995, 0.996);
  },

  /**
   * Night ops: cool moonlight, sodium-vapour highlights, and shadows lifted
   * just enough that black stays readable on a bad monitor.
   */
  night: (c) => {
    contrast(c, 1.12);
    splitTone(
      c,
      { r: -0.012, g: 0.004, b: 0.042 },
      { r: -0.014, g: -0.002, b: 0.026 },
      { r: 0.05, g: 0.018, b: -0.036 },
    );
    saturation(c, 0.78);
    boostHue(c, 4.2, 1.6, 0.35);
    liftGammaGain(c, 0.022, 1.03, 0.98);
  },

  /**
   * Overcast urban: bleached, high contrast, cold green shadows. Reads as
   * eastern-european winter rather than desert.
   */
  urban: (c) => {
    contrast(c, 1.14);
    splitTone(
      c,
      { r: -0.014, g: 0.008, b: 0.014 },
      { r: -0.004, g: 0.0, b: 0.004 },
      { r: 0.012, g: 0.014, b: -0.006 },
    );
    saturation(c, 0.72);
    liftGammaGain(c, 0.004, 1.01, 0.99);
  },
};

export class LutLibrary {
  readonly size = SIZE;
  private cache = new Map<LutName, THREE.Data3DTexture>();
  private identityTexture: THREE.Data3DTexture | null = null;

  get(name: LutName): THREE.Data3DTexture {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const tex = this.build(name);
    this.cache.set(name, tex);
    return tex;
  }

  /** Identity LUT, so the shader can keep one sampler bound unconditionally. */
  get identity(): THREE.Data3DTexture {
    if (!this.identityTexture) this.identityTexture = this.build('neutral');
    return this.identityTexture;
  }

  private build(name: LutName): THREE.Data3DTexture {
    const n = SIZE;
    const data = new Uint16Array(n * n * n * 4);
    const look = LOOKS[name];
    const c: Rgb = { r: 0, g: 0, b: 0 };
    let i = 0;
    for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          c.r = x / (n - 1);
          c.g = y / (n - 1);
          c.b = z / (n - 1);
          look?.(c);
          data[i++] = THREE.DataUtils.toHalfFloat(Math.min(1, Math.max(0, c.r)));
          data[i++] = THREE.DataUtils.toHalfFloat(Math.min(1, Math.max(0, c.g)));
          data[i++] = THREE.DataUtils.toHalfFloat(Math.min(1, Math.max(0, c.b)));
          data[i++] = THREE.DataUtils.toHalfFloat(1);
        }
      }
    }
    const tex = new THREE.Data3DTexture(data, n, n, n);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.HalfFloatType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.wrapR = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    tex.name = `lut_${name}`;
    return tex;
  }

  dispose(): void {
    for (const t of this.cache.values()) t.dispose();
    this.cache.clear();
    this.identityTexture?.dispose();
    this.identityTexture = null;
  }
}

/**
 * Von Kries white balance. Returns per-channel linear gains for a temperature
 * shift in [-1, 1] (negative = cooler) and a green/magenta tint, computed on
 * the CPU so the shader cost is a single multiply.
 */
export function whiteBalanceGains(temperature: number, tint: number, out: THREE.Vector3): void {
  const t1 = temperature * 0.05;
  const t2 = tint * 0.05;

  // Planckian locus approximation in CIE xy around D65.
  const x = 0.31271 - t1 * (t1 < 0 ? 0.1 : 0.05);
  const y = 2.87 * x - 3 * x * x - 0.27509507 + t2;

  const yScale = 1;
  const X = (x * yScale) / y;
  const Z = ((1 - x - y) * yScale) / y;

  // CIECAT02-ish LMS response of the target white versus D65.
  const l = 0.7328 * X + 0.4296 * yScale - 0.1624 * Z;
  const m = -0.7036 * X + 1.6975 * yScale + 0.0061 * Z;
  const s = 0.003 * X + 0.0136 * yScale + 0.9834 * Z;

  const d65 = { l: 0.949237, m: 1.03542, s: 1.08728 };
  out.set(d65.l / l, d65.m / m, d65.s / s);
  // Normalise so white balance never changes overall exposure.
  const norm = out.x * LUMA_R + out.y * LUMA_G + out.z * LUMA_B;
  if (norm > 1e-4) out.divideScalar(norm);
}
