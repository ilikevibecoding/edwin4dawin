import * as THREE from 'three';
import { freshRng, Rng } from '../core/Random';
import { protectResource } from '../core/dispose';

/**
 * Procedural texture factory.
 *
 * Everything here is drawn into an offscreen canvas at load time — the project
 * ships no image files. Textures are memoised by key so repeated asset
 * constructors share a single upload.
 */

const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false })!;
  return { c, g };
}

function finish(
  key: string,
  canvas: HTMLCanvasElement,
  opts: { repeat?: [number, number]; srgb?: boolean } = {},
): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.name = key;
  protectResource(tex);
  cache.set(key, tex);
  return tex;
}

function memo(key: string, build: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  return build();
}

/** Set the anisotropy of every cached texture (called when quality changes). */
export function setTextureAnisotropy(value: number): void {
  for (const tex of cache.values()) {
    tex.anisotropy = value;
    tex.needsUpdate = true;
  }
}

export function disposeTextureCache(): void {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}

// ---------------------------------------------------------------------------
// Hull surfaces
// ---------------------------------------------------------------------------

interface HullOptions {
  size?: number;
  base: string;
  panelContrast: number;
  lineColor: string;
  grime: number;
  scorch: number;
  seed: string;
  stripes?: string | null;
  /** Height of the plate relief in the companion normal map. */
  relief?: number;
}

/** One plate of the recursive subdivision, with the detail chosen for it. */
interface Plate {
  x: number;
  y: number;
  w: number;
  h: number;
  /** -1..1 thickness offset relative to its neighbours. */
  lift: number;
  inset: boolean;
  rivets: boolean;
}

function splitPlates(size: number, rng: Rng): Plate[] {
  const rects: Array<[number, number, number, number]> = [[0, 0, size, size]];
  const minCell = size / 22;
  for (let pass = 0; pass < 5; pass++) {
    const next: Array<[number, number, number, number]> = [];
    for (const [x, y, w, h] of rects) {
      if ((w < minCell * 2 && h < minCell * 2) || rng.bool(0.16)) {
        next.push([x, y, w, h]);
        continue;
      }
      if (w >= h) {
        const cut = Math.round(w * rng.range(0.32, 0.68));
        next.push([x, y, cut, h], [x + cut, y, w - cut, h]);
      } else {
        const cut = Math.round(h * rng.range(0.32, 0.68));
        next.push([x, y, w, cut], [x, y + cut, w, h - cut]);
      }
    }
    rects.length = 0;
    rects.push(...next);
  }
  return rects.map(([x, y, w, h]) => ({
    x,
    y,
    w,
    h,
    lift: rng.spread(1),
    inset: w > minCell * 2 && h > minCell * 2 && rng.bool(0.3),
    rivets: rng.bool(0.34),
  }));
}

function drawPanels(
  g: CanvasRenderingContext2D,
  size: number,
  rng: Rng,
  o: HullOptions,
  plates: Plate[],
): void {
  g.fillStyle = o.base;
  g.fillRect(0, 0, size, size);

  for (const p of plates) {
    const shade = p.lift * o.panelContrast;
    g.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${Math.abs(shade)})`;
    g.fillRect(p.x, p.y, p.w, p.h);
    g.strokeStyle = o.lineColor;
    g.lineWidth = rng.bool(0.25) ? 2 : 1;
    g.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    // Occasional inset detail so panels do not read as flat rectangles.
    if (p.inset) {
      g.strokeStyle = `rgba(0,0,0,${0.16 + rng.next() * 0.12})`;
      g.strokeRect(p.x + p.w * 0.2, p.y + p.h * 0.2, p.w * 0.6, p.h * 0.6);
    }
  }
}

/**
 * Height field matching the plating, from which the normal map is derived.
 *
 * Without this the hull is a flat shell with plate boundaries painted on: at
 * grazing angles the light slides across it with nothing to catch, and the
 * ship reads as a printed cardboard silhouette rather than armour.
 */
function drawPlateHeight(
  g: CanvasRenderingContext2D,
  size: number,
  rng: Rng,
  plates: Plate[],
): void {
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  for (const p of plates) {
    const level = 128 + Math.round(p.lift * 16);
    g.fillStyle = `rgb(${level},${level},${level})`;
    g.fillRect(p.x, p.y, p.w, p.h);
    // Recessed seam plus a chamfer catching light on the near lip.
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(0,0,0,0.72)';
    g.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, p.h - 3);
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,0.36)';
    g.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
    if (p.inset) {
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.strokeRect(p.x + p.w * 0.2, p.y + p.h * 0.2, p.w * 0.6, p.h * 0.6);
    }
    if (p.rivets && p.w > 24 && p.h > 24) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      const step = Math.max(9, Math.min(p.w, p.h) / 6);
      for (let x = p.x + step; x < p.x + p.w - step * 0.5; x += step) {
        for (const y of [p.y + step * 0.55, p.y + p.h - step * 0.55]) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  // Shallow long-wavelength waviness so large flat runs still shift tone.
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const r = rng.range(size * 0.06, size * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.07)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

/** Sobel a greyscale height canvas into a tangent-space normal map. */
function normalFromHeight(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const size = src.width;
  const data = src.getContext('2d')!.getImageData(0, 0, size, size).data;
  const { c, g } = makeCanvas(size, size);
  const img = g.createImageData(size, size);
  const at = (x: number, y: number): number =>
    data[((((y % size) + size) % size) * size + (((x % size) + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 3x3 Sobel: a two-tap difference on a hard-edged height field aliases
      // into stair-stepped normals along every diagonal plate seam.
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) -
          at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) *
        0.25 *
        strength;
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) -
          at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) *
        0.25 *
        strength;
      // Canvas rows run opposite to V, so the V slope is +dy.
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function drawGrime(g: CanvasRenderingContext2D, size: number, rng: Rng, amount: number): void {
  const streaks = Math.round(120 * amount);
  for (let i = 0; i < streaks; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const len = rng.range(size * 0.02, size * 0.24);
    const wid = rng.range(1, 7);
    const a = rng.range(0.02, 0.1) * amount;
    const grad = g.createLinearGradient(x, y, x, y + len);
    grad.addColorStop(0, `rgba(30,26,22,${a})`);
    grad.addColorStop(1, 'rgba(30,26,22,0)');
    g.fillStyle = grad;
    g.fillRect(x, y, wid, len);
  }
  // Broad soft blotches.
  for (let i = 0; i < Math.round(40 * amount); i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const r = rng.range(size * 0.02, size * 0.14);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(60,52,44,${rng.range(0.03, 0.09) * amount})`);
    grad.addColorStop(1, 'rgba(60,52,44,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

function drawScorch(g: CanvasRenderingContext2D, size: number, rng: Rng, amount: number): void {
  for (let i = 0; i < Math.round(18 * amount); i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const r = rng.range(size * 0.01, size * 0.06);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(14,12,11,${rng.range(0.4, 0.8)})`);
    grad.addColorStop(0.5, `rgba(30,22,18,${rng.range(0.15, 0.35)})`);
    grad.addColorStop(1, 'rgba(30,22,18,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * Build a hull albedo and its matching normal map from one plate layout, so the
 * painted seams and the modelled relief always line up.
 */
function buildHull(key: string, o: HullOptions): void {
  const size = o.size ?? 1024;
  const rng = freshRng(o.seed);
  const plates = splitPlates(size, rng.fork('plates'));

  const albedo = makeCanvas(size, size);
  drawPanels(albedo.g, size, rng, o, plates);
  if (o.stripes) {
    albedo.g.fillStyle = o.stripes;
    const bands = rng.int(2, 4);
    for (let i = 0; i < bands; i++) {
      const y = rng.next() * size;
      albedo.g.fillRect(0, y, size, rng.range(size * 0.012, size * 0.03));
    }
  }
  drawGrime(albedo.g, size, rng, o.grime);
  if (o.scorch > 0) drawScorch(albedo.g, size, rng, o.scorch);
  finish(key, albedo.c);

  const height = makeCanvas(size, size);
  drawPlateHeight(height.g, size, rng.fork('height'), plates);
  finish(`${key}:normal`, normalFromHeight(height.c, o.relief ?? 3.2), { srgb: false });
}

function hullTexture(key: string, o: HullOptions): THREE.Texture {
  return memo(key, () => {
    buildHull(key, o);
    return cache.get(key)!;
  });
}

function hullNormal(key: string, o: HullOptions): THREE.Texture {
  return memo(`${key}:normal`, () => {
    buildHull(key, o);
    return cache.get(`${key}:normal`)!;
  });
}

const REBEL_HULL: HullOptions = {
  base: '#d9d7cf',
  panelContrast: 0.09,
  lineColor: 'rgba(70,68,62,0.5)',
  grime: 1.15,
  scorch: 0.7,
  seed: 'rebel-hull',
  relief: 3.6,
};

const IMPERIAL_HULL: HullOptions = {
  base: '#9aa1a7',
  panelContrast: 0.075,
  lineColor: 'rgba(38,42,46,0.55)',
  grime: 0.45,
  scorch: 0.12,
  seed: 'imperial-hull',
  relief: 4.2,
};

const CORRIDOR_WALL: HullOptions = {
  size: 768,
  base: '#d5d4cd',
  panelContrast: 0.075,
  lineColor: 'rgba(120,120,116,0.45)',
  grime: 0.55,
  scorch: 0.35,
  seed: 'corridor-wall',
  relief: 2.4,
};

/** Weathered off-white plating for the Rebel blockade runner. */
export const rebelHullMap = (): THREE.Texture => hullTexture('rebelHull', REBEL_HULL);
export const rebelHullNormalMap = (): THREE.Texture => hullNormal('rebelHull', REBEL_HULL);

/** Cold, near-monochrome plating for Imperial exteriors. */
export const imperialHullMap = (): THREE.Texture => hullTexture('imperialHull', IMPERIAL_HULL);
export const imperialHullNormalMap = (): THREE.Texture => hullNormal('imperialHull', IMPERIAL_HULL);

/** Clean interior wall plating for the corridor set. */
export const corridorWallMap = (): THREE.Texture => hullTexture('corridorWall', CORRIDOR_WALL);
export const corridorWallNormalMap = (): THREE.Texture => hullNormal('corridorWall', CORRIDOR_WALL);

/** Grey deck plating. */
export const deckPlateMap = (): THREE.Texture =>
  memo('deckPlate', () => {
    const size = 512;
    const rng = freshRng('deck-plate');
    const { c, g } = makeCanvas(size, size);
    g.fillStyle = '#8e8f8b';
    g.fillRect(0, 0, size, size);
    const cells = 8;
    const step = size / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const shade = rng.spread(0.05);
        g.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${Math.abs(shade)})`;
        g.fillRect(x * step, y * step, step, step);
        g.strokeStyle = 'rgba(45,46,44,0.6)';
        g.lineWidth = 2;
        g.strokeRect(x * step + 1, y * step + 1, step - 2, step - 2);
        // Anti-slip dimples.
        g.fillStyle = 'rgba(60,62,60,0.28)';
        for (let d = 0; d < 5; d++) {
          const dx = x * step + step * (0.22 + 0.14 * d);
          const dy = y * step + step * (0.3 + rng.spread(0.05));
          g.beginPath();
          g.arc(dx, dy, step * 0.035, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    drawGrime(g, size, rng, 0.7);
    return finish('deckPlate', c);
  });

/** Roughness/AO-ish greyscale companion used for micro variation. */
export const microRoughnessMap = (): THREE.Texture =>
  memo('microRough', () => {
    const size = 512;
    const rng = freshRng('micro-rough');
    const { c, g } = makeCanvas(size, size);
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 150 + Math.round(rng.gaussian() * 26);
      const cl = v < 0 ? 0 : v > 255 ? 255 : v;
      img.data[i * 4 + 0] = cl;
      img.data[i * 4 + 1] = cl;
      img.data[i * 4 + 2] = cl;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return finish('microRough', c, { srgb: false });
  });

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/** Soft round falloff used by smoke, glows and dust. */
export const softDiscMap = (): THREE.Texture =>
  memo('softDisc', () => {
    const size = 128;
    const { c, g } = makeCanvas(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.14)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return finish('softDisc', c);
  });

/**
 * Contact-shadow falloff: a much denser core than `softDiscMap` so a figure
 * standing on the deck gets a readable grounding patch rather than a haze.
 */
export const contactShadowMap = (): THREE.Texture =>
  memo('contactShadow', () => {
    const size = 128;
    const { c, g } = makeCanvas(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.86)');
    grad.addColorStop(0.72, 'rgba(255,255,255,0.4)');
    grad.addColorStop(0.9, 'rgba(255,255,255,0.09)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return finish('contactShadow', c);
  });

/** Turbulent puff used for smoke billboards. */
export const smokePuffMap = (): THREE.Texture =>
  memo('smokePuff', () => {
    const size = 192;
    const rng = freshRng('smoke-puff');
    const { c, g } = makeCanvas(size, size);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const a = rng.next() * Math.PI * 2;
      const rad = Math.pow(rng.next(), 0.7) * size * 0.3;
      const x = size / 2 + Math.cos(a) * rad;
      const y = size / 2 + Math.sin(a) * rad;
      const r = rng.range(size * 0.1, size * 0.26);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Vignette the edges so tiles never show a hard square.
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    mask.addColorStop(0, 'rgba(255,255,255,1)');
    mask.addColorStop(0.72, 'rgba(255,255,255,0.85)');
    mask.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, size, size);
    return finish('smokePuff', c);
  });

/** Four-point star flare for engines and distant suns. */
export const flareMap = (): THREE.Texture =>
  memo('flare', () => {
    const size = 256;
    const { c, g } = makeCanvas(size, size);
    const cx = size / 2;
    const core = g.createRadialGradient(cx, cx, 0, cx, cx, size * 0.34);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    core.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = 'lighter';
    for (const angle of [0, Math.PI / 2]) {
      g.save();
      g.translate(cx, cx);
      g.rotate(angle);
      const spike = g.createLinearGradient(-size / 2, 0, size / 2, 0);
      spike.addColorStop(0, 'rgba(255,255,255,0)');
      spike.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      spike.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = spike;
      g.fillRect(-size / 2, -size * 0.012, size, size * 0.024);
      g.restore();
    }
    return finish('flare', c);
  });

/** Small bright dot with a tiny halo — star points. */
/** Irregular soot bloom with a feathered edge, used as a wall decal. */
export const scorchMarkMap = (): THREE.Texture =>
  memo('scorchMark', () => {
    const size = 128;
    const rng = freshRng('scorch-mark');
    const { c, g } = makeCanvas(size, size);
    g.clearRect(0, 0, size, size);
    g.globalCompositeOperation = 'lighter';
    // A cluster of soft lobes so the outline is never a clean circle.
    for (let i = 0; i < 22; i++) {
      const a = rng.next() * Math.PI * 2;
      const rad = Math.pow(rng.next(), 0.6) * size * 0.2;
      const x = size / 2 + Math.cos(a) * rad;
      const y = size / 2 + Math.sin(a) * rad;
      const r = rng.range(size * 0.1, size * 0.24);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.24)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.09)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Hard-edged core where the bolt actually struck.
    const core = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.16);
    core.addColorStop(0, 'rgba(255,255,255,0.75)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, size, size);
    // Clip anything reaching the border so tiles never show a seam.
    g.globalCompositeOperation = 'destination-in';
    const vign = g.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
    vign.addColorStop(0, 'rgba(255,255,255,1)');
    vign.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = vign;
    g.fillRect(0, 0, size, size);
    return finish('scorchMark', c);
  });

/**
 * Wispy cloud for distant nebulae. A plain radial gradient blown up to tens of
 * thousands of units reads as a lens smudge; this is a cluster of offset
 * blotches with a soft global falloff, so it breaks up into structure.
 */
export const nebulaMap = (): THREE.Texture =>
  memo('nebula', () => {
    const size = 256;
    const { c, g } = makeCanvas(size, size);
    const rng = freshRng('nebula-cloud');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rad = Math.pow(rng.next(), 0.6) * 0.42;
      const x = size * (0.5 + Math.cos(a) * rad * rng.range(0.7, 1.35));
      const y = size * (0.5 + Math.sin(a) * rad * rng.range(0.5, 1.0));
      const r = size * rng.range(0.035, 0.14);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const alpha = rng.range(0.03, 0.1);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.35})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Global falloff so the cloud never shows a hard tile edge.
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    fade.addColorStop(0, 'rgba(255,255,255,1)');
    fade.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    fade.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, size, size);
    return finish('nebula', c);
  });

export const starPointMap = (): THREE.Texture =>
  memo('starPoint', () => {
    const size = 64;
    const { c, g } = makeCanvas(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.16)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return finish('starPoint', c);
  });

// ---------------------------------------------------------------------------
// Screens & readouts
// ---------------------------------------------------------------------------

/** Fake instrumentation: bar graphs, glyph rows and a scan grid. */
export function consoleScreenMap(variant: number, tint: 'amber' | 'blue' | 'red' = 'amber'): THREE.Texture {
  const key = `consoleScreen:${variant}:${tint}`;
  return memo(key, () => {
    const w = 256;
    const h = 128;
    const rng = freshRng(key);
    const { c, g } = makeCanvas(w, h);
    const fg = tint === 'amber' ? '#ffb648' : tint === 'blue' ? '#7fd4ff' : '#ff6a5a';
    g.fillStyle = '#06090e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 8) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, h);
      g.stroke();
    }
    for (let y = 0; y < h; y += 8) {
      g.beginPath();
      g.moveTo(0, y + 0.5);
      g.lineTo(w, y + 0.5);
      g.stroke();
    }
    g.fillStyle = fg;
    // Glyph rows: short dashes reading as an unfamiliar alphabet.
    for (let row = 0; row < 5; row++) {
      const y = 10 + row * 12;
      let x = 8;
      while (x < w * 0.55) {
        const glyph = rng.range(3, 9);
        if (rng.bool(0.8)) g.fillRect(x, y, glyph, 4);
        x += glyph + 4;
      }
    }
    // Bar graph.
    for (let i = 0; i < 12; i++) {
      const bh = rng.range(6, 44);
      g.globalAlpha = 0.5 + rng.next() * 0.5;
      g.fillRect(w * 0.6 + i * 8, h - 14 - bh, 5, bh);
    }
    g.globalAlpha = 1;
    // Sweep line.
    g.strokeStyle = fg;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w * 0.78, h * 0.3, 22, 0, Math.PI * 1.4);
    g.stroke();
    return finish(key, c);
  });
}

/** Window strip for bridge / cockpit bands. */
export const windowStripMap = (): THREE.Texture =>
  memo('windowStrip', () => {
    const w = 512;
    const h = 64;
    const rng = freshRng('window-strip');
    const { c, g } = makeCanvas(w, h);
    g.fillStyle = '#0b0f14';
    g.fillRect(0, 0, w, h);
    for (let x = 4; x < w - 4; x += 12) {
      const lit = rng.bool(0.62);
      g.fillStyle = lit ? `rgba(190,225,255,${rng.range(0.55, 1)})` : 'rgba(24,30,38,1)';
      g.fillRect(x, h * 0.28, 7, h * 0.44);
    }
    return finish('windowStrip', c, { srgb: true });
  });

/** Rows of tiny lit ports for hull windows. */
export const hullWindowsMap = (): THREE.Texture =>
  memo('hullWindows', () => {
    const w = 512;
    const h = 512;
    const rng = freshRng('hull-windows');
    const { c, g } = makeCanvas(w, h);
    g.fillStyle = '#000000';
    g.fillRect(0, 0, w, h);
    // Few, large, strongly banded windows. Dense small squares turn into
    // coloured static once the tower is more than a few hundred metres away.
    const rows = 6;
    for (let row = 0; row < rows; row++) {
      const y = 26 + row * 80;
      for (let x = 18; x < w - 26; x += 46) {
        if (!rng.bool(0.55)) continue;
        const a = rng.range(0.45, 1);
        g.fillStyle = `rgba(212,230,255,${a})`;
        g.fillRect(x, y, 30, 16);
      }
    }
    return finish('hullWindows', c);
  });
