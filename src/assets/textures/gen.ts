import * as THREE from 'three';
import { fbm2, hash2 } from '../../core/rng';

/**
 * Procedural texture toolkit (Fable 3). All game textures are generated here at
 * load time — no binary assets, guaranteed original.
 */

export function makeCanvas(size: number, h?: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = h ?? size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return { canvas, ctx };
}

export interface TexOpts {
  srgb?: boolean;
  repeat?: boolean;
  aniso?: number;
}

export function toTexture(canvas: HTMLCanvasElement, opts: TexOpts = {}): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.anisotropy = opts.aniso ?? 4;
  tex.needsUpdate = true;
  return tex;
}

/** Linear (non-color) data texture, e.g. roughness/normal. */
export function toDataTexture(canvas: HTMLCanvasElement, opts: TexOpts = {}): THREE.CanvasTexture {
  return toTexture(canvas, { ...opts, srgb: false });
}

export type RGB = [number, number, number];

export const rgb = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Per-pixel field fill: computes value 0..1 per pixel via fn, maps through
 * color ramp [c0, c1].
 */
export function fieldFill(
  ctx: CanvasRenderingContext2D, size: number,
  fn: (x: number, y: number) => number, c0: RGB, c1: RGB,
): void {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, fn(x / size, y / size)));
      const i = (y * size + x) * 4;
      d[i] = c0[0] + (c1[0] - c0[0]) * v;
      d[i + 1] = c0[1] + (c1[1] - c0[1]) * v;
      d[i + 2] = c0[2] + (c1[2] - c0[2]) * v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Tileable fbm noise in [0,1] with domain wrapping (period p). */
export function tileFbm(x: number, y: number, p: number, octaves = 4, salt = 0): number {
  // sample 4 corners of wrapped domain and bilinear-blend for seamlessness
  const s = salt * 131.7;
  const a = fbm2(x * p + s, y * p + s, octaves);
  const b = fbm2((x - 1) * p + s, y * p + s, octaves);
  const c = fbm2(x * p + s, (y - 1) * p + s, octaves);
  const d = fbm2((x - 1) * p + s, (y - 1) * p + s, octaves);
  const u = x, v = y;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/** Add sparse speckles (dirt/aggregate). */
export function speckle(
  ctx: CanvasRenderingContext2D, size: number, count: number,
  color: string, minR: number, maxR: number, alpha = 0.5, salt = 1,
): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = hash2(i, salt) * size;
    const y = hash2(i, salt + 99) * size;
    const r = minR + hash2(i, salt + 7) * (maxR - minR);
    ctx.globalAlpha = alpha * (0.4 + 0.6 * hash2(i, salt + 13));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Horizontal/vertical streaks (brushed metal, wood grain base). */
export function streaks(
  ctx: CanvasRenderingContext2D, size: number, count: number,
  color: string, horizontal: boolean, alphaMax = 0.1, salt = 2,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const p = hash2(i, salt) * size;
    ctx.globalAlpha = alphaMax * hash2(i, salt + 3);
    ctx.lineWidth = 0.5 + hash2(i, salt + 5) * 1.5;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
    } else {
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Grid of grout lines (tiles). Returns nothing; draws lines. */
export function grout(
  ctx: CanvasRenderingContext2D, size: number, cells: number,
  color: string, width: number, jitter = 0,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const step = size / cells;
  for (let i = 0; i <= cells; i++) {
    const o = jitter ? (hash2(i, 31) - 0.5) * jitter : 0;
    ctx.beginPath();
    ctx.moveTo(i * step + o, 0);
    ctx.lineTo(i * step + o, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step + o);
    ctx.lineTo(size, i * step + o);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sobel normal map from a grayscale height canvas. Wraps for tileability. */
export function normalFromHeight(height: HTMLCanvasElement, strength = 1): HTMLCanvasElement {
  const size = height.width;
  const hctx = height.getContext('2d', { willReadFrequently: true })!;
  const src = hctx.getImageData(0, 0, size, height.height).data;
  const { canvas, ctx } = makeCanvas(size, height.height);
  const out = ctx.createImageData(size, height.height);
  const d = out.data;
  const hgt = height.height;
  const get = (x: number, y: number): number => {
    x = ((x % size) + size) % size;
    y = ((y % hgt) + hgt) % hgt;
    return src[(y * size + x) * 4] / 255;
  };
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < size; x++) {
      const tl = get(x - 1, y - 1), t = get(x, y - 1), tr = get(x + 1, y - 1);
      const l = get(x - 1, y), r = get(x + 1, y);
      const bl = get(x - 1, y + 1), b = get(x, y + 1), br = get(x + 1, y + 1);
      const dx = (tr + 2 * r + br - tl - 2 * l - bl) * strength;
      const dy = (bl + 2 * b + br - tl - 2 * t - tr) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      d[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((dy / len) * 0.5 + 0.5) * 255; // three expects +Y up normal maps (OpenGL)... flipped in builder if needed
      d[i + 2] = (1 / len) * 0.5 + 0.5 > 1 ? 255 : ((1 / len) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Simple grayscale canvas from field fn. */
export function heightCanvas(size: number, fn: (x: number, y: number) => number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  fieldFill(ctx, size, fn, [0, 0, 0], [255, 255, 255]);
  return canvas;
}

/** Rounded rect path helper. */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
