import * as THREE from 'three';

/**
 * Procedural texture generation.
 *
 * The project ships no photographic surface textures, so concrete, asphalt,
 * brushed metal, window grids and water ripples are synthesised on the CPU at
 * boot. Height maps are converted to normal maps with a Sobel filter, which is
 * what actually sells the surfaces under raking light.
 */

function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm(x: number, y: number, octaves = 5, seed = 1, lacunarity = 2, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(fx, fy, seed + i * 17);
    norm += amp;
    amp *= gain;
    fx *= lacunarity;
    fy *= lacunarity;
  }
  return sum / norm;
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  return { canvas, ctx };
}

function toTexture(
  canvas: HTMLCanvasElement,
  { srgb = false, repeat = 1, aniso = 4 }: { srgb?: boolean; repeat?: number; aniso?: number } = {}
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Sobel-filtered height -> tangent space normal map. */
export function heightToNormal(height: Float32Array, size: number, strength = 2.2): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / len) * 0.5 * 255 + 127;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

interface SurfaceOptions {
  size?: number;
  repeat?: number;
  seed?: number;
}

/** Poured concrete: fine aggregate, wide stains, occasional form lines. */
export function concreteSurface(opts: SurfaceOptions = {}): SurfaceMaps {
  const size = opts.size ?? 512;
  const seed = opts.seed ?? 3;
  const { canvas: colCanvas, ctx: colCtx } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: roughCtx } = makeCanvas(size);
  const col = colCtx.createImageData(size, size);
  const rough = roughCtx.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const grain = fbm(u * 190, v * 190, 3, seed);
      const aggregate = Math.pow(fbm(u * 70, v * 70, 4, seed + 5), 2.4);
      const stain = fbm(u * 5, v * 5, 4, seed + 11);
      const patch = fbm(u * 14, v * 14, 3, seed + 21);
      let h = grain * 0.35 + aggregate * 0.45 + patch * 0.2;
      // Form-work seams every ~1/3 of the tile.
      const seam = Math.min(Math.abs(((u * 3) % 1) - 0.5), Math.abs(((v * 3) % 1) - 0.5));
      if (seam > 0.47) h -= 0.35;
      height[y * size + x] = h;

      // Aggregate and stains only modulate the tone slightly: high-contrast
      // speckle at this scale reads as gravel rather than poured concrete.
      const base = 0.34 + stain * 0.05 + aggregate * 0.035;
      const tone = base * (1 - patch * 0.07);
      const i = (y * size + x) * 4;
      col.data[i] = tone * 232;
      col.data[i + 1] = tone * 236;
      col.data[i + 2] = tone * 244;
      col.data[i + 3] = 255;

      const r = 0.62 + stain * 0.22 - aggregate * 0.18;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = Math.max(0, Math.min(1, r)) * 255;
      rough.data[i + 3] = 255;
    }
  }
  colCtx.putImageData(col, 0, 0);
  roughCtx.putImageData(rough, 0, 0);
  const repeat = opts.repeat ?? 4;
  return {
    map: toTexture(colCanvas, { srgb: true, repeat }),
    normalMap: toTexture(heightToNormal(height, size, 0.55), { repeat }),
    roughnessMap: toTexture(roughCanvas, { repeat }),
  };
}

/** Wet asphalt: coarse chip, tar patches, hairline cracks, puddle-prone lows. */
export function asphaltSurface(opts: SurfaceOptions = {}): SurfaceMaps {
  const size = opts.size ?? 512;
  const seed = opts.seed ?? 17;
  const { canvas: colCanvas, ctx: colCtx } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: roughCtx } = makeCanvas(size);
  const col = colCtx.createImageData(size, size);
  const rough = roughCtx.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const chip = Math.pow(fbm(u * 150, v * 150, 4, seed), 1.6);
      const tar = fbm(u * 8, v * 8, 4, seed + 3);
      const crack = 1 - Math.abs(fbm(u * 20, v * 20, 3, seed + 9) - 0.5) * 4;
      const h = chip * 0.7 + tar * 0.3 - Math.max(0, crack - 0.86) * 2.5;
      height[y * size + x] = h;

      const wetLow = Math.pow(1 - tar, 2);
      const tone = 0.1 + chip * 0.035 + tar * 0.025;
      const i = (y * size + x) * 4;
      col.data[i] = tone * 235;
      col.data[i + 1] = tone * 240;
      col.data[i + 2] = tone * 255;
      col.data[i + 3] = 255;

      // Low spots hold water and go glassy.
      const r = 0.55 - wetLow * 0.42 + chip * 0.2;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = Math.max(0.04, Math.min(1, r)) * 255;
      rough.data[i + 3] = 255;
    }
  }
  colCtx.putImageData(col, 0, 0);
  roughCtx.putImageData(rough, 0, 0);
  const repeat = opts.repeat ?? 6;
  return {
    map: toTexture(colCanvas, { srgb: true, repeat }),
    normalMap: toTexture(heightToNormal(height, size, 0.8), { repeat }),
    roughnessMap: toTexture(roughCanvas, { repeat }),
  };
}

/** Brushed / panelled metal for android chassis, HVAC units and railings. */
export function metalSurface(opts: SurfaceOptions & { panel?: number } = {}): SurfaceMaps {
  const size = opts.size ?? 512;
  const seed = opts.seed ?? 41;
  const panel = opts.panel ?? 6;
  const { canvas: colCanvas, ctx: colCtx } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: roughCtx } = makeCanvas(size);
  const col = colCtx.createImageData(size, size);
  const rough = roughCtx.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const brush = fbm(u * 420, v * 12, 3, seed);
      const dirt = fbm(u * 9, v * 9, 4, seed + 7);
      const gu = Math.abs(((u * panel) % 1) - 0.5);
      const gv = Math.abs(((v * panel) % 1) - 0.5);
      const seam = Math.max(gu, gv) > 0.47 ? 1 : 0;
      const rivet = hash2(Math.floor(u * panel), Math.floor(v * panel), seed) > 0.7 ? 1 : 0;
      height[y * size + x] = brush * 0.25 + dirt * 0.15 - seam * 0.7 + rivet * 0.05;

      const tone = 0.38 + brush * 0.16 - dirt * 0.12 - seam * 0.2;
      const i = (y * size + x) * 4;
      col.data[i] = tone * 232;
      col.data[i + 1] = tone * 238;
      col.data[i + 2] = tone * 248;
      col.data[i + 3] = 255;

      const r = 0.3 + dirt * 0.35 + brush * 0.12 + seam * 0.2;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = Math.max(0.05, Math.min(1, r)) * 255;
      rough.data[i + 3] = 255;
    }
  }
  colCtx.putImageData(col, 0, 0);
  roughCtx.putImageData(rough, 0, 0);
  const repeat = opts.repeat ?? 2;
  return {
    map: toTexture(colCanvas, { srgb: true, repeat }),
    normalMap: toTexture(heightToNormal(height, size, 0.9), { repeat }),
    roughnessMap: toTexture(roughCanvas, { repeat }),
  };
}

/**
 * Skyscraper facade: an emissive window grid. Windows are individually lit with
 * warm interior or cold office light and a few are dark, which is what makes a
 * distant skyline read as inhabited rather than as a texture.
 */
export function facadeMaps(
  size = 512,
  seed = 5,
  opts: { litChance?: number; cols?: number; rows?: number } = {}
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const cols = opts.cols ?? 28;
  const rows = opts.rows ?? 44;
  const litChance = opts.litChance ?? 0.3;
  const { canvas: colCanvas, ctx: colCtx } = makeCanvas(size);
  const { canvas: emCanvas, ctx: emCtx } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: roughCtx } = makeCanvas(size);

  colCtx.fillStyle = '#15181d';
  colCtx.fillRect(0, 0, size, size);
  emCtx.fillStyle = '#000000';
  emCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#8a8a8a';
  roughCtx.fillRect(0, 0, size, size);

  const cw = size / cols;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * rh;
      const pad = Math.max(1, cw * 0.16);
      const w = cw - pad * 2;
      const h = rh - pad * 2;
      // Concrete spandrel between windows.
      colCtx.fillStyle = `rgb(${28 + hash2(c, r, seed) * 12},${30 + hash2(c, r, seed + 1) * 12},${34 + hash2(c, r, seed + 2) * 14})`;
      colCtx.fillRect(x, y, cw, rh);
      const lit = hash2(c, r, seed + 99) < litChance;
      const glassTone = 12 + hash2(c, r, seed + 4) * 10;
      colCtx.fillStyle = `rgb(${glassTone},${glassTone + 3},${glassTone + 8})`;
      colCtx.fillRect(x + pad, y + pad, w, h);
      roughCtx.fillStyle = '#2a2a2a';
      roughCtx.fillRect(x + pad, y + pad, w, h);
      if (lit) {
        const warm = hash2(c, r, seed + 7) < 0.62;
        // Most lit windows are dim; only a few are bright, which keeps a
        // skyline from turning into a wall of blown-out dots under bloom.
        const bright = 0.12 + Math.pow(hash2(c, r, seed + 8), 2.2) * 0.7;
        const col = warm
          ? `rgba(${255 * bright},${196 * bright},${132 * bright},1)`
          : `rgba(${168 * bright},${212 * bright},${255 * bright},1)`;
        emCtx.fillStyle = col;
        emCtx.fillRect(x + pad, y + pad, w, h);
        // Interior falloff so the pane is not a flat rectangle.
        const g = emCtx.createLinearGradient(x, y + pad, x, y + pad + h);
        g.addColorStop(0, 'rgba(0,0,0,0.45)');
        g.addColorStop(0.5, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.3)');
        emCtx.fillStyle = g;
        emCtx.fillRect(x + pad, y + pad, w, h);
      }
    }
  }
  return {
    map: toTexture(colCanvas, { srgb: true, repeat: 1 }),
    emissiveMap: toTexture(emCanvas, { srgb: true, repeat: 1 }),
    roughnessMap: toTexture(roughCanvas, { repeat: 1 }),
  };
}

/** Woven fabric for uniforms and coats: weave, nap variation, subtle wear. */
export function fabricSurface(
  opts: SurfaceOptions & { tint?: [number, number, number]; weave?: number; sheen?: number } = {}
): SurfaceMaps {
  const size = opts.size ?? 512;
  const seed = opts.seed ?? 91;
  const tint = opts.tint ?? [0.1, 0.11, 0.135];
  const weave = opts.weave ?? 180;
  const { canvas: colCanvas, ctx: colCtx } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: roughCtx } = makeCanvas(size);
  const col = colCtx.createImageData(size, size);
  const rough = roughCtx.createImageData(size, size);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Interleaved warp and weft.
      const warp = Math.sin(u * weave * Math.PI * 2) * 0.5 + 0.5;
      const weft = Math.sin(v * weave * Math.PI * 2) * 0.5 + 0.5;
      const cell = ((Math.floor(u * weave) + Math.floor(v * weave)) % 2 === 0 ? warp : weft) * 0.6;
      const nap = fbm(u * 40, v * 40, 3, seed);
      const wear = fbm(u * 6, v * 6, 4, seed + 13);
      height[y * size + x] = cell * 0.5 + nap * 0.3 + wear * 0.2;

      const shade = 0.72 + cell * 0.28 + nap * 0.14 - wear * 0.1;
      const i = (y * size + x) * 4;
      col.data[i] = Math.min(255, tint[0] * 255 * shade * 1.35);
      col.data[i + 1] = Math.min(255, tint[1] * 255 * shade * 1.35);
      col.data[i + 2] = Math.min(255, tint[2] * 255 * shade * 1.35);
      col.data[i + 3] = 255;

      const r = 0.78 - cell * 0.14 + wear * 0.1;
      rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = Math.max(0.1, Math.min(1, r)) * 255;
      rough.data[i + 3] = 255;
    }
  }
  colCtx.putImageData(col, 0, 0);
  roughCtx.putImageData(rough, 0, 0);
  const repeat = opts.repeat ?? 3;
  return {
    map: toTexture(colCanvas, { srgb: true, repeat }),
    normalMap: toTexture(heightToNormal(height, size, 1.1), { repeat }),
    roughnessMap: toTexture(roughCanvas, { repeat }),
  };
}

/**
 * Tiling ripple normal map for rain-struck water.
 *
 * High frequency on purpose: at the scale a camera sees a wet street, agitation
 * is a fine chop. Larger features read as gravel scattered over the ground once
 * the surface is glossy enough to catch the sky in every bump.
 */
export function rippleNormal(size = 256, seed = 61): THREE.CanvasTexture {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h =
        fbm(u * 68, v * 68, 3, seed) * 0.5 +
        fbm(u * 150, v * 150, 2, seed + 9) * 0.35 +
        fbm(u * 300, v * 300, 1, seed + 17) * 0.15;
      height[y * size + x] = h;
    }
  }
  return toTexture(heightToNormal(height, size, 0.5), { repeat: 1 });
}

/** Soft radial sprite used for splashes, dust, sparks and light glows. */
export function radialSprite(size = 64, hardness = 0.35, color = '#ffffff'): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(hardness, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Vertical light-shaft gradient for volumetric cones. */
export function shaftGradient(size = 64): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Text/sign texture for neon and holographic advertising. */
export function signTexture(
  lines: string[],
  opts: { w?: number; h?: number; color?: string; font?: string; align?: CanvasTextAlign; vertical?: boolean } = {}
): THREE.CanvasTexture {
  const w = opts.w ?? 512;
  const h = opts.h ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.clearRect(0, 0, w, h);
  const color = opts.color ?? '#7ef7ff';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = h * 0.09;
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = 'middle';
  if (opts.vertical) {
    const fontSize = Math.min(h / (lines.length * 1.35), w * 0.7);
    ctx.font = opts.font ?? `700 ${fontSize}px "Rajdhani", "Arial Narrow", sans-serif`;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, (h / lines.length) * (i + 0.5));
    });
  } else {
    const fontSize = Math.min((h / lines.length) * 0.72, w / (Math.max(...lines.map((l) => l.length)) * 0.62));
    ctx.font = opts.font ?? `700 ${fontSize}px "Rajdhani", "Arial Narrow", sans-serif`;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, (h / lines.length) * (i + 0.5));
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
