import * as THREE from 'three';
import { settings } from '../core/settings.js';

// ---------------------------------------------------------------------------
// Procedural texture factory.
//
// All art in Northstar Rescue is generated at load time into offscreen
// canvases: there are no binary image files to go missing, and every map is
// authored from the same seeded noise so results are reproducible.
//
// Authoring rules (from the visual bible):
//  * base colour holds NO baked lighting - only pigment, wear and dirt.
//  * height is authored first, normal + AO are derived from it.
//  * roughness is authored as a real material property, never a copy of albedo.
// ---------------------------------------------------------------------------

const cache = new Map();
let generatedBytes = 0;
let generatedCount = 0;

export function textureStats() {
  return { count: generatedCount, megabytes: +(generatedBytes / 1048576).toFixed(2), cached: cache.size };
}

export function clearTextureCache() {
  for (const entry of cache.values()) {
    for (const tex of Object.values(entry)) tex?.dispose?.();
  }
  cache.clear();
  generatedBytes = 0;
  generatedCount = 0;
}

function scaledSize(size) {
  const s = Math.max(32, Math.round(size * settings.quality.textureScale));
  // keep power of two
  return 1 << Math.round(Math.log2(s));
}

export function makeCanvas(size) {
  const c =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(size, size)
      : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  return { canvas: c, ctx, size };
}

function finalizeTexture(canvas, { srgb = false, repeat = 1, aniso = 8, flipY = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = Math.min(aniso, settings.quality.anisotropy);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = flipY;
  tex.needsUpdate = true;
  generatedCount++;
  generatedBytes += canvas.width * canvas.height * 4 * 1.33;
  return tex;
}

/**
 * Derive a tangent-space normal map from a height field.
 * @param {Float32Array} height  size*size heights in [0,1]
 */
export function normalFromHeight(height, size, strength = 2.0) {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // normalize (-dx, -dy, 1)
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      d[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Cheap cavity/AO approximation from a height field (local mean difference). */
export function aoFromHeight(height, size, radius = 3, strength = 1.0) {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let n = 0;
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (ox === 0 && oy === 0) continue;
          sum += at(x + ox, y + oy);
          n++;
        }
      }
      const mean = sum / n;
      const h = at(x, y);
      const occl = Math.max(0, Math.min(1, 1 - (mean - h) * 6 * strength));
      const v = Math.round(occl * 255);
      const i = (y * size + x) * 4;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Build a grayscale texture canvas from a Float32Array field in [0,1]. */
export function grayFromField(field, size) {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.max(0, Math.min(1, field[i])) * 255);
    d[i * 4] = v;
    d[i * 4 + 1] = v;
    d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * The main entry point used by material families.
 *
 * @param {string} key     cache key
 * @param {number} size    authored resolution before quality scaling
 * @param {(api:TexPainter)=>void} paint  painting callback
 * @param {object} opts
 * @returns {{map:THREE.Texture, normalMap?:THREE.Texture, roughnessMap?:THREE.Texture,
 *            aoMap?:THREE.Texture, emissiveMap?:THREE.Texture, alphaMap?:THREE.Texture}}
 */
export function generateTextureSet(key, size, paint, opts = {}) {
  const cacheKey = `${key}@${size}@${settings.quality.textureScale}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const S = scaledSize(size);
  const albedo = makeCanvas(S);
  const height = new Float32Array(S * S);
  const rough = new Float32Array(S * S).fill(opts.baseRoughness ?? 0.7);
  const emissive = opts.emissive ? makeCanvas(S) : null;
  const alpha = opts.alpha ? makeCanvas(S) : null;
  if (emissive) {
    emissive.ctx.fillStyle = '#000';
    emissive.ctx.fillRect(0, 0, S, S);
  }
  if (alpha) {
    alpha.ctx.fillStyle = '#fff';
    alpha.ctx.fillRect(0, 0, S, S);
  }

  const api = {
    size: S,
    scale: S / size,
    ctx: albedo.ctx,
    canvas: albedo.canvas,
    height,
    rough,
    emissiveCtx: emissive?.ctx,
    alphaCtx: alpha?.ctx,
    /** Set height+roughness per pixel with a callback over normalized uv. */
    field(fn) {
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const i = y * S + x;
          fn(x / S, y / S, i, x, y);
        }
      }
    },
    px(x, y) {
      return (((y % S) + S) % S) * S + (((x % S) + S) % S);
    },
  };

  paint(api);

  const result = {
    map: finalizeTexture(albedo.canvas, { srgb: true, repeat: opts.repeat ?? 1 }),
  };
  if (opts.normal !== false) {
    result.normalMap = finalizeTexture(normalFromHeight(height, S, opts.normalStrength ?? 2), {
      repeat: opts.repeat ?? 1,
    });
    result.normalScale = opts.normalScale ?? 1;
  }
  if (opts.roughness !== false) {
    result.roughnessMap = finalizeTexture(grayFromField(rough, S), { repeat: opts.repeat ?? 1 });
  }
  if (opts.ao !== false) {
    result.aoMap = finalizeTexture(aoFromHeight(height, S, opts.aoRadius ?? 3, opts.aoStrength ?? 1), {
      repeat: opts.repeat ?? 1,
    });
  }
  if (emissive) result.emissiveMap = finalizeTexture(emissive.canvas, { srgb: true, repeat: opts.repeat ?? 1 });
  if (alpha) result.alphaMap = finalizeTexture(alpha.canvas, { repeat: opts.repeat ?? 1 });

  cache.set(cacheKey, result);
  return result;
}

/** A simple sRGB canvas texture (signs, screens, decals, UI atlases). */
export function generateImageTexture(key, width, height, paint, opts = {}) {
  const cacheKey = `img:${key}@${width}x${height}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey).map;
  const c =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  paint(ctx, width, height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = opts.wrap ?? THREE.ClampToEdgeWrapping;
  tex.wrapT = opts.wrap ?? THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.min(8, settings.quality.anisotropy);
  tex.minFilter = opts.minFilter ?? THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = opts.mipmaps !== false;
  tex.needsUpdate = true;
  generatedCount++;
  generatedBytes += width * height * 4 * 1.33;
  cache.set(cacheKey, { map: tex });
  return tex;
}

// --- small painting helpers shared by the material families ----------------

export function fillNoise(ctx, size, rnd, amount = 0.04) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 255 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw text that stays legible after mipmapping. */
export function drawLabel(ctx, text, x, y, { font, color = '#111', align = 'left', baseline = 'top', maxWidth } = {}) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}
