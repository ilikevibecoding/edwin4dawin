/**
 * SVG -> THREE.Texture pipeline.
 *
 * Every printed detail in this film (minifig faces, helmet decals, torso
 * prints, control panels, insignia, the opening crawl) is authored as an SVG
 * string here, rasterised into a canvas and used as a texture map. That keeps
 * the whole production procedural: no binary art assets anywhere.
 */
import * as THREE from 'three';

const pending = new Set();
const cache = new Map();

/**
 * Rasterise an SVG string to a texture.
 * @param {string} svg full <svg>...</svg> markup
 * @param {object} [o] {w, h, key, flipY}
 * @returns {THREE.Texture} usable immediately, fills in when decoded
 */
export function svgTexture(svg, o = {}) {
  const key = o.key || svg;
  if (cache.has(key)) return cache.get(key);

  const w = o.w || 512;
  const h = o.h || w;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  if (o.flipY === false) tex.flipY = false;
  cache.set(key, tex);

  const img = new Image();
  const p = new Promise((resolve) => {
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      tex.needsUpdate = true;
      resolve();
    };
    img.onerror = (e) => { console.warn('svg decode failed', e); resolve(); };
  });
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  pending.add(p);
  p.then(() => pending.delete(p));
  return tex;
}

/** Resolves once every SVG requested so far has been rasterised. */
export async function texturesReady() {
  // textures can queue more textures, so drain repeatedly
  for (let i = 0; i < 8 && pending.size; i++) {
    await Promise.all([...pending]);
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Wrap raw markup in an <svg> root of the given viewBox. */
export function svg(vb, body, o = {}) {
  const [x, y, w, h] = vb;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${o.w || w}" height="${o.h || h}">${body}</svg>`;
}

/**
 * Draw text into a texture (subtitles, crawl, title cards).
 * Uses canvas text so we get real font metrics + wrapping.
 */
export function textTexture(lines, o = {}) {
  const w = o.w || 1024;
  const h = o.h || 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h); }
  const size = o.size || 64;
  ctx.font = `${o.weight || 700} ${size}px ${o.font || 'Helvetica, Arial, sans-serif'}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#ffe81f';
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = o.lineHeight || size * 1.25;
  const total = arr.length * lh;
  const x = o.align === 'left' ? 20 : o.align === 'right' ? w - 20 : w / 2;
  arr.forEach((t, i) => {
    const y = h / 2 - total / 2 + lh / 2 + i * lh;
    if (o.stroke) {
      ctx.lineWidth = o.strokeWidth || 6;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(t, x, y);
    }
    ctx.fillText(t, x, y);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
