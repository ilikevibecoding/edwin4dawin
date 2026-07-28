/**
 * The minimap's map.
 *
 * A blank square with a triangle on it is not a minimap, so the level is
 * rasterised once at init from the navigation grid the world module publishes:
 * every cell is either navigable floor or structure, floor is shaded by its
 * height so upper walkways and roofs separate from the street, and any structure
 * cell touching floor is lightened into a one-pixel outline. That last pass is
 * what makes the result read as a floor plan rather than as noise — building
 * edges are exactly where the eye needs a line.
 *
 * Cost: one pass over the grid (roughly 58k cells for Al-Rashid Crossing) into an
 * ImageData, then a single nearest-neighbour upscale. A few milliseconds, once.
 */
import type { NavGrid } from '../../core/Contracts';

export interface RasterisedMap {
  canvas: HTMLCanvasElement;
  /** World-space rectangle the image covers. */
  originX: number;
  originZ: number;
  widthMetres: number;
  depthMetres: number;
}

/** Output pixels per grid cell. Two keeps the outlines crisp when scaled down. */
const UPSCALE = 2;

export function rasteriseNavGrid(nav: NavGrid): RasterisedMap | null {
  const { width, depth, cost, height, cellSize, originX, originZ } = nav;
  if (width <= 0 || depth <= 0 || cost.length < width * depth) return null;

  const base = document.createElement('canvas');
  base.width = width;
  base.height = depth;
  const baseCtx = base.getContext('2d');
  if (!baseCtx) return null;

  const image = baseCtx.createImageData(width, depth);
  const data = image.data;

  // Height range of the navigable surface, for the elevation shading.
  let minH = Number.POSITIVE_INFINITY;
  let maxH = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < width * depth; i++) {
    if (cost[i] <= 0) continue;
    const h = height[i];
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
  if (!Number.isFinite(minH)) {
    minH = 0;
    maxH = 1;
  }
  const span = Math.max(1, maxH - minH);

  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      const o = i * 4;
      const walkable = cost[i] > 0;

      if (walkable) {
        // 0..1 up the map's vertical extent; the street is the darkest surface
        // and each storey above it lifts a little out of the background.
        const t = (height[i] - minH) / span;
        const lift = Math.round(t * 30);
        data[o] = 40 + lift;
        data[o + 1] = 49 + lift;
        data[o + 2] = 57 + lift;
        data[o + 3] = 244;
        continue;
      }

      // Structure. Outlined where it meets navigable floor.
      let edge = false;
      if (x > 0 && cost[i - 1] > 0) edge = true;
      else if (x < width - 1 && cost[i + 1] > 0) edge = true;
      else if (z > 0 && cost[i - width] > 0) edge = true;
      else if (z < depth - 1 && cost[i + width] > 0) edge = true;

      // Structure reads darker than the ground it interrupts, so the plan is a
      // light street network cut by solid blocks rather than a field of noise.
      // The outline is neutral rather than accent-tinted: every building edge in
      // the level is thousands of pixels, and in the accent colour they drown
      // out the handful of marks — player, objective, contact — that the accent
      // is supposed to make findable.
      if (edge) {
        data[o] = 148;
        data[o + 1] = 163;
        data[o + 2] = 184;
        data[o + 3] = 255;
      } else {
        data[o] = 11;
        data[o + 1] = 14;
        data[o + 2] = 18;
        data[o + 3] = 232;
      }
    }
  }
  baseCtx.putImageData(image, 0, 0);

  const out = document.createElement('canvas');
  out.width = width * UPSCALE;
  out.height = depth * UPSCALE;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, out.width, out.height);

  // A 10 m survey grid, faint enough to read as paper rather than as content.
  const step = (10 / cellSize) * UPSCALE;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= out.width; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, out.height);
  }
  for (let y = 0; y <= out.height; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(out.width, Math.round(y) + 0.5);
  }
  ctx.stroke();

  return {
    canvas: out,
    originX,
    originZ,
    widthMetres: width * cellSize,
    depthMetres: depth * cellSize,
  };
}

/**
 * Fallback when the nav grid is unavailable: a plain graticule so the minimap
 * still shows scale and rotation instead of going blank.
 */
export function placeholderMap(halfExtent: number): RasterisedMap {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 20, 26, 0.92)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const step = size / 24;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const p = Math.round(i * step) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
    }
    ctx.stroke();
  }
  return {
    canvas,
    originX: -halfExtent,
    originZ: -halfExtent,
    widthMetres: halfExtent * 2,
    depthMetres: halfExtent * 2,
  };
}
