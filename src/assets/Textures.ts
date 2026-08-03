import * as THREE from 'three';
import { Rng } from '../core/Rng';

/**
 * Every texture in the project is drawn here with the 2D canvas API. Nothing
 * is fetched from the network and nothing is derived from existing artwork.
 */

const cache = new Map<string, THREE.Texture>();

function makeCanvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable — cannot build procedural textures.');
  return { c, ctx };
}

function finish(
  canvas: HTMLCanvasElement,
  repeat: number,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Value-noise field rendered as grayscale, used for grime and roughness. */
function drawNoise(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: Rng,
  octaves: number,
  contrast: number,
  alpha: number,
): void {
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  const grids: Float32Array[] = [];
  const dims: number[] = [];
  for (let o = 0; o < octaves; o++) {
    const dim = 4 << o;
    const g = new Float32Array(dim * dim);
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    grids.push(g);
    dims.push(dim);
  }
  const sample = (g: Float32Array, dim: number, x: number, y: number): number => {
    const fx = x * dim;
    const fy = y * dim;
    const x0 = Math.floor(fx) % dim;
    const y0 = Math.floor(fy) % dim;
    const x1 = (x0 + 1) % dim;
    const y1 = (y0 + 1) % dim;
    const tx = fx - Math.floor(fx);
    const ty = fy - Math.floor(fy);
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = g[y0 * dim + x0] * (1 - sx) + g[y0 * dim + x1] * sx;
    const b = g[y1 * dim + x0] * (1 - sx) + g[y1 * dim + x1] * sx;
    return a * (1 - sy) + b * sy;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 0.5;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        v += sample(grids[o], dims[o], x / size, y / size) * amp;
        norm += amp;
        amp *= 0.55;
      }
      v /= norm;
      v = Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5));
      const i = (y * size + x) * 4;
      const prev = data[i] / 255;
      const out = prev * (1 - alpha) + v * alpha;
      data[i] = data[i + 1] = data[i + 2] = out * 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export interface PanelOptions {
  size?: number;
  base?: string;
  lineColor?: string;
  rows?: number;
  cols?: number;
  grime?: number;
  streaks?: number;
  scorch?: number;
  repeat?: number;
  seed?: string;
}

/**
 * Hull plating: an irregular grid of panels with seam lines, a few darker
 * replacement plates, vertical grime streaks and optional scorch blooms.
 */
export function panelTexture(opts: PanelOptions = {}): THREE.CanvasTexture {
  const key = `panel:${JSON.stringify(opts)}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;

  const size = opts.size ?? 512;
  const rng = new Rng(opts.seed ?? 'panel');
  const { c, ctx } = makeCanvas(size);

  ctx.fillStyle = opts.base ?? '#c9cbc7';
  ctx.fillRect(0, 0, size, size);

  const cols = opts.cols ?? 8;
  const rows = opts.rows ?? 8;
  const cw = size / cols;
  const rh = size / rows;

  // Panel tone variation.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const shade = rng.range(-14, 10);
      const wide = rng.bool(0.12) && x < cols - 1 ? 2 : 1;
      ctx.fillStyle = `rgba(${shade < 0 ? 0 : 255},${shade < 0 ? 0 : 255},${shade < 0 ? 0 : 255},${Math.abs(shade) / 255})`;
      ctx.fillRect(x * cw, y * rh, cw * wide, rh);
    }
  }

  // Seam lines.
  ctx.strokeStyle = opts.lineColor ?? 'rgba(40,44,50,0.55)';
  ctx.lineWidth = Math.max(1, size / 512);
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x * cw) + 0.5, 0);
    ctx.lineTo(Math.round(x * cw) + 0.5, size);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y * rh) + 0.5);
    ctx.lineTo(size, Math.round(y * rh) + 0.5);
    ctx.stroke();
  }

  // Rivet dots and small hatches.
  ctx.fillStyle = 'rgba(60,66,74,0.35)';
  for (let i = 0; i < cols * rows * 1.5; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(70,76,86,${rng.range(0.1, 0.3)})`;
    const w = rng.range(cw * 0.2, cw * 0.7);
    const h = rng.range(rh * 0.12, rh * 0.35);
    ctx.fillRect(rng.range(0, size - w), rng.range(0, size - h), w, h);
  }

  // Vertical grime streaks below panel seams.
  const streaks = opts.streaks ?? 26;
  for (let i = 0; i < streaks; i++) {
    const x = Math.floor(rng.range(0, cols)) * cw + rng.range(2, cw - 2);
    const y = Math.floor(rng.range(0, rows)) * rh;
    const len = rng.range(rh * 0.6, rh * 3.2);
    const grad = ctx.createLinearGradient(0, y, 0, y + len);
    const a = rng.range(0.05, 0.22);
    grad.addColorStop(0, `rgba(48,44,40,${a})`);
    grad.addColorStop(1, 'rgba(48,44,40,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, rng.range(1.5, 5), len);
  }

  // Scorch blooms.
  const scorch = opts.scorch ?? 0;
  for (let i = 0; i < scorch; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const r = rng.range(size * 0.02, size * 0.07);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(24,20,18,0.72)');
    grad.addColorStop(0.5, 'rgba(40,32,28,0.34)');
    grad.addColorStop(1, 'rgba(40,32,28,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grime overlay.
  if ((opts.grime ?? 0.16) > 0) {
    const { c: nc, ctx: nctx } = makeCanvas(size);
    nctx.fillStyle = '#808080';
    nctx.fillRect(0, 0, size, size);
    drawNoise(nctx, size, rng.fork('grime'), 5, 1.5, 1);
    ctx.globalAlpha = opts.grime ?? 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(nc, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  const tex = finish(c, opts.repeat ?? 1, THREE.SRGBColorSpace);
  cache.set(key, tex);
  return tex;
}

export interface PlatingOptions {
  seed: string;
  /** Mid-tone of the plating in CSS notation. */
  base: string;
  /** Peak-to-peak albedo variation between neighbouring plates, 0..1. */
  variation?: number;
  /** Depth of the seams in normal-map terms, 0..1. */
  relief?: number;
  /** Number of large plates across the tile. */
  majorCols?: number;
  majorRows?: number;
  /** Extra scattered raised boxes per tile. */
  fittings?: number;
  grime?: number;
  streaks?: number;
  size?: number;
}

export interface PlatingSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const platingCache = new Map<string, PlatingSet>();

/**
 * Hull plating drawn once as a height field and once as albedo, then turned
 * into a matching normal map.
 *
 * Small surface detail is far more convincing painted into a normal map than
 * modelled: a thousand instanced boxes read as litter floating over the hull
 * the moment the camera gets close, whereas seams and recessed plates catch
 * the key light exactly like real panel work.
 */
export function platingTextures(opts: PlatingOptions): PlatingSet {
  const key = `plating:${JSON.stringify(opts)}`;
  const hit = platingCache.get(key);
  if (hit) return hit;

  const size = opts.size ?? 512;
  const majorCols = opts.majorCols ?? 6;
  const majorRows = opts.majorRows ?? 6;
  const variation = opts.variation ?? 0.1;
  const relief = opts.relief ?? 0.5;
  const rng = new Rng(`plating:${opts.seed}`);

  const height = makeCanvas(size);
  const albedo = makeCanvas(size);
  const rough = makeCanvas(size);

  height.ctx.fillStyle = '#808080';
  height.ctx.fillRect(0, 0, size, size);
  albedo.ctx.fillStyle = opts.base;
  albedo.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#9a9a9a';
  rough.ctx.fillRect(0, 0, size, size);

  /** Draw one plate into all three channels, wrapping at the tile edge. */
  const plate = (x: number, y: number, w: number, h: number, lift: number, tone: number): void => {
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox;
        const py = y + oy;
        if (px > size || py > size || px + w < 0 || py + h < 0) continue;
        const level = Math.round(128 + lift * 127);
        height.ctx.fillStyle = `rgb(${level},${level},${level})`;
        height.ctx.fillRect(px, py, w, h);
        // Seam groove around the plate.
        height.ctx.strokeStyle = `rgba(0,0,0,${0.55 * relief + 0.2})`;
        height.ctx.lineWidth = Math.max(1, size / 340);
        height.ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);

        const t = Math.round(Math.abs(tone) * 255);
        albedo.ctx.fillStyle = `rgba(${tone > 0 ? 255 : 0},${tone > 0 ? 255 : 0},${tone > 0 ? 255 : 0},${(t / 255) * variation})`;
        albedo.ctx.fillRect(px, py, w, h);

        const rv = Math.round(154 + tone * 60);
        rough.ctx.fillStyle = `rgb(${rv},${rv},${rv})`;
        rough.ctx.fillRect(px, py, w, h);
      }
    }
  };

  // Large plates on a jittered grid: the dominant read at a distance.
  const cw = size / majorCols;
  const rh = size / majorRows;
  for (let gy = 0; gy < majorRows; gy++) {
    for (let gx = 0; gx < majorCols; gx++) {
      const wide = rng.bool(0.16) ? 2 : 1;
      const tall = rng.bool(0.1) ? 2 : 1;
      plate(
        gx * cw,
        gy * rh,
        cw * wide,
        rh * tall,
        rng.range(-0.08, 0.1) * relief,
        rng.range(-1, 1),
      );
    }
  }

  // Medium sub-plates: break up the grid without adding new silhouettes.
  for (let i = 0; i < majorCols * majorRows * 2.2; i++) {
    const w = rng.range(cw * 0.22, cw * 0.85);
    const h = rng.range(rh * 0.18, rh * 0.6);
    plate(
      Math.round(rng.range(0, majorCols) * cw + rng.range(0, cw - w)),
      Math.round(rng.range(0, majorRows) * rh + rng.range(0, rh - h)),
      Math.round(w),
      Math.round(h),
      rng.range(-0.05, 0.18) * relief,
      rng.range(-1, 1) * 0.7,
    );
  }

  // Raised fittings: vents, housings, hatches. These sit clearly proud.
  for (let i = 0; i < (opts.fittings ?? 18); i++) {
    const w = rng.range(size * 0.012, size * 0.05);
    const h = w * rng.range(0.4, 2.4);
    plate(
      Math.round(rng.range(0, size)),
      Math.round(rng.range(0, size)),
      Math.round(w),
      Math.round(h),
      rng.range(0.3, 0.75) * relief,
      rng.range(-1, -0.2),
    );
  }

  // Long service ducts running with the hull axis.
  for (let i = 0; i < 5; i++) {
    const x = Math.round(rng.range(0, size));
    const w = Math.round(rng.range(size * 0.008, size * 0.02));
    plate(x, -size, w, size * 3, rng.range(0.2, 0.5) * relief, -0.5);
  }

  // Rivet lines along the major seams.
  height.ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < majorCols * majorRows * 5; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const d = Math.max(1.5, size / 300);
    height.ctx.fillRect(x, y, d, d);
  }

  // Grime and streaking go into albedo and roughness only: dirt is not relief.
  const grimeAmt = opts.grime ?? 0.16;
  if (grimeAmt > 0) {
    const n = makeCanvas(size);
    n.ctx.fillStyle = '#808080';
    n.ctx.fillRect(0, 0, size, size);
    drawNoise(n.ctx, size, rng.fork('grime'), 5, 1.5, 1);
    albedo.ctx.globalAlpha = grimeAmt;
    albedo.ctx.globalCompositeOperation = 'overlay';
    albedo.ctx.drawImage(n.c, 0, 0);
    albedo.ctx.globalAlpha = 0.5;
    rough.ctx.drawImage(n.c, 0, 0);
    albedo.ctx.globalAlpha = 1;
    albedo.ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < (opts.streaks ?? 18); i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const len = rng.range(size * 0.06, size * 0.3);
    const grad = albedo.ctx.createLinearGradient(0, y, 0, y + len);
    const a = rng.range(0.05, 0.2);
    grad.addColorStop(0, `rgba(46,42,38,${a})`);
    grad.addColorStop(1, 'rgba(46,42,38,0)');
    albedo.ctx.fillStyle = grad;
    albedo.ctx.fillRect(x, y, rng.range(1.5, 5), len);
  }

  // Soften the height field before differentiating it. Sobel over hard
  // one-pixel seams produces spiky normals that shimmer badly once the hull
  // is a few hundred units away.
  const smooth = makeCanvas(size);
  smooth.ctx.filter = 'blur(1.1px)';
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) smooth.ctx.drawImage(height.c, ox, oy);
  }
  smooth.ctx.filter = 'none';

  const set: PlatingSet = {
    map: finish(albedo.c, 1, THREE.SRGBColorSpace),
    normalMap: finish(normalFromHeight(smooth.c, size, 1.5 * relief), 1),
    roughnessMap: finish(rough.c, 1),
  };
  platingCache.set(key, set);
  return set;
}

/** Sobel a grayscale height canvas into a tangent-space normal map. */
function normalFromHeight(src: HTMLCanvasElement, size: number, strength: number): HTMLCanvasElement {
  const sctx = src.getContext('2d');
  if (!sctx) throw new Error('2D canvas context unavailable');
  const h = sctx.getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const img = out.ctx.createImageData(size, size);
  const at = (x: number, y: number): number => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return h[(yy * size + xx) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      // Canvas rows run downward while UV v runs upward once the texture is
      // flipped, so the vertical gradient is negated to keep bumps convex.
      let nx = dx * strength;
      let ny = -dy * strength;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const nz = 1 / len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  out.ctx.putImageData(img, 0, 0);
  return out.c;
}

export function clearPlatingCache(): void {
  platingCache.forEach((set) => {
    set.map.dispose();
    set.normalMap.dispose();
    set.roughnessMap.dispose();
  });
  platingCache.clear();
}

/** Grayscale roughness/variation map. */
export function noiseTexture(seed: string, size = 256, octaves = 5, contrast = 1.6): THREE.CanvasTexture {
  const key = `noise:${seed}:${size}:${octaves}:${contrast}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  drawNoise(ctx, size, new Rng(seed), octaves, contrast, 1);
  const tex = finish(c, 1);
  cache.set(key, tex);
  return tex;
}

/** Soft radial falloff used by sprites: glows, sparks, smoke cores. */
export function radialTexture(
  seed: string,
  inner = 'rgba(255,255,255,1)',
  outer = 'rgba(255,255,255,0)',
  power = 1,
): THREE.CanvasTexture {
  const key = `radial:${seed}:${inner}:${outer}:${power}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const size = 128;
  const { c, ctx } = makeCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    grad.addColorStop(t, i === 0 ? inner : i === steps ? outer : mixColor(inner, outer, Math.pow(t, power)));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

function parseRgba(s: string): [number, number, number, number] {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 255, 255, 1];
  const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
  return [parts[0] ?? 255, parts[1] ?? 255, parts[2] ?? 255, parts[3] ?? 1];
}

function mixColor(a: string, b: string, t: number): string {
  const ca = parseRgba(a);
  const cb = parseRgba(b);
  const out = ca.map((v, i) => v + (cb[i] - v) * t);
  return `rgba(${Math.round(out[0])},${Math.round(out[1])},${Math.round(out[2])},${out[3].toFixed(3)})`;
}

/** Puffy smoke sprite: overlapping soft blobs so plumes do not look like discs. */
export function smokeTexture(seed = 'smoke'): THREE.CanvasTexture {
  const key = `smoke:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const size = 128;
  const { c, ctx } = makeCanvas(size);
  const rng = new Rng(seed);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 16; i++) {
    const r = rng.range(size * 0.1, size * 0.3);
    const x = size / 2 + rng.spread(size * 0.18);
    const y = size / 2 + rng.spread(size * 0.18);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = rng.range(0.08, 0.2);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fade the border so tiles never show a hard edge.
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.5);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Star sprite with a faint four-point diffraction cross. */
export function starTexture(): THREE.CanvasTexture {
  const key = 'starSprite';
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const size = 64;
  const { c, ctx } = makeCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // A wide bright core: at three or four pixels across, a narrow core would
  // average away to nothing under texture filtering.
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.94)');
  grad.addColorStop(0.5, 'rgba(226,236,255,0.42)');
  grad.addColorStop(0.72, 'rgba(200,216,255,0.1)');
  grad.addColorStop(1, 'rgba(180,200,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.11)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size / 2, 4);
  ctx.lineTo(size / 2, size - 4);
  ctx.moveTo(4, size / 2);
  ctx.lineTo(size - 4, size / 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Text drawn to a transparent canvas — used for the prologue and readouts. */
export function textTexture(
  lines: string[],
  opts: {
    width?: number;
    height?: number;
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    lineHeight?: number;
    letterSpacing?: string;
    glow?: number;
  } = {},
): THREE.CanvasTexture {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 256;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.clearRect(0, 0, width, height);
  ctx.font = opts.font ?? '600 58px "Trebuchet MS", "Gill Sans", sans-serif';
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      opts.letterSpacing ?? '2px';
  }
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  const lh = opts.lineHeight ?? 72;
  const total = lines.length * lh;
  const x = opts.align === 'left' ? 24 : width / 2;
  const color = opts.color ?? '#f0cf82';
  if (opts.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = opts.glow;
  }
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, height / 2 - total / 2 + lh / 2 + i * lh, width - 48);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Illuminated console face: readout blocks, bars and status pips. */
export function consoleTexture(seed: string, tint: 'amber' | 'ice' | 'red' = 'ice'): THREE.CanvasTexture {
  const key = `console:${seed}:${tint}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  const rng = new Rng(`console:${seed}`);
  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(0, 0, size, size);
  const palette =
    tint === 'amber'
      ? ['#ffb648', '#ff8a2a', '#ffd89a']
      : tint === 'red'
        ? ['#ff5a48', '#ff8f7c', '#c22a1c']
        : ['#8fd3ff', '#d8f0ff', '#4aa6e8'];
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = rng.pick(palette);
    ctx.globalAlpha = rng.range(0.35, 1);
    const w = rng.range(6, 44);
    const h = rng.range(3, 9);
    ctx.fillRect(rng.range(8, size - w - 8), rng.range(8, size - h - 8), w, h);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = 'rgba(120,160,200,0.22)';
    ctx.strokeRect(rng.range(6, size - 60), rng.range(6, size - 40), rng.range(30, 62), rng.range(18, 36));
  }
  const tex = finish(c, 1, THREE.SRGBColorSpace);
  cache.set(key, tex);
  return tex;
}

export function clearTextureCache(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
  clearPlatingCache();
}
