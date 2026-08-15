import * as THREE from 'three';
import { fbm, hash2, mulberry32 } from './seed.js';

const cache = new Map();

function canvas2d(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx };
}

function toTexture(canvas, { wrap = THREE.RepeatWrapping, anisotropy = 8, colorSpace = THREE.SRGBColorSpace } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = wrap;
  tex.anisotropy = anisotropy;
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

function pixelNoise(ctx, size, rand, alpha = 18) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * alpha;
    d[i] = clampByte(d[i] + n);
    d[i + 1] = clampByte(d[i + 1] + n);
    d[i + 2] = clampByte(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function paintBase(ctx, size, color, variation, seed) {
  const rgb = hexToRgb(color);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm(x / size * 6, y / size * 6, seed, 5);
      const m = fbm(x / size * 18, y / size * 18, seed + 3, 3);
      const t = (n - 0.5) * variation + (m - 0.5) * variation * 0.35;
      d[i] = clampByte(rgb.r + t * 40);
      d[i + 1] = clampByte(rgb.g + t * 36);
      d[i + 2] = clampByte(rgb.b + t * 30);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function addBlotches(ctx, size, color, count, seed, alpha = 0.18) {
  const rand = mulberry32(seed);
  const rgb = hexToRgb(color);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (0.04 + rand() * 0.18) * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
    g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function addScratches(ctx, size, seed, count, color = 'rgba(20,18,16,0.22)') {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.15 + rand() * 0.45;
    ctx.lineWidth = 0.4 + rand() * 1.4;
    const x = rand() * size;
    const y = rand() * size;
    const len = 8 + rand() * 70;
    const ang = rand() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function addChips(ctx, size, seed, count, reveal) {
  const rand = mulberry32(seed);
  const rgb = hexToRgb(reveal);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1.2 + rand() * 5;
    const h = 0.8 + rand() * 3.2;
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.55 + rand() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function addStreaks(ctx, size, seed, color, count) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.08 + rand() * 0.18;
    ctx.lineWidth = 1 + rand() * 3;
    const x = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 8 - 4, size * 0.4, x + rand() * 10 - 5, size * 0.7, x + rand() * 6 - 3, size);
    ctx.stroke();
  }
  ctx.restore();
}

export function heightToNormal(heightCanvas, strength = 1.4) {
  const size = heightCanvas.width;
  const hctx = heightCanvas.getContext('2d', { willReadFrequently: true });
  const src = hctx.getImageData(0, 0, size, size).data;
  const { canvas, ctx } = canvas2d(size);
  const out = ctx.createImageData(size, size);
  const d = out.data;
  const sample = (x, y) => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return src[(yy * size + xx) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      d[i] = clampByte((nx * inv * 0.5 + 0.5) * 255);
      d[i + 1] = clampByte((ny * inv * 0.5 + 0.5) * 255);
      d[i + 2] = clampByte((nz * inv * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

function makeHeight(size, seed, scale = 10, amp = 1) {
  const { canvas, ctx } = canvas2d(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / size * scale, y / size * scale, seed, 5);
      const v = clampByte(128 + (n - 0.5) * 90 * amp);
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function roughnessFromAlbedo(albedoCanvas, base = 0.62, contrast = 0.35) {
  const size = albedoCanvas.width;
  const actx = albedoCanvas.getContext('2d', { willReadFrequently: true });
  const src = actx.getImageData(0, 0, size, size).data;
  const { canvas, ctx } = canvas2d(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0, j = 0; i < src.length; i += 4, j += 4) {
    const lum = (src[i] * 0.3 + src[i + 1] * 0.5 + src[i + 2] * 0.2) / 255;
    const r = clampByte((base + (0.5 - lum) * contrast) * 255);
    d[j] = d[j + 1] = d[j + 2] = r;
    d[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function createPBRMaps(name, spec) {
  if (cache.has(name)) return cache.get(name);
  const size = spec.size ?? 512;
  const seed = spec.seed ?? 1;
  const { canvas, ctx } = canvas2d(size);
  paintBase(ctx, size, spec.color, spec.variation ?? 0.55, seed);
  if (spec.blotches) addBlotches(ctx, size, spec.blotchColor ?? '#2a241c', spec.blotches, seed + 9, spec.blotchAlpha ?? 0.16);
  if (spec.streaks) addStreaks(ctx, size, seed + 17, spec.streakColor ?? 'rgba(30,24,18,0.2)', spec.streaks);
  if (spec.scratches) addScratches(ctx, size, seed + 21, spec.scratches, spec.scratchColor);
  if (spec.chips) addChips(ctx, size, seed + 27, spec.chips, spec.chipColor ?? '#6a5340');
  const rand = mulberry32(seed + 33);
  pixelNoise(ctx, size, rand, spec.pixel ?? 14);

  const height = spec.heightCanvas ?? makeHeight(size, seed + 40, spec.heightScale ?? 12, spec.heightAmp ?? 1);
  if (spec.overlayHeight) {
    const hctx = height.getContext('2d');
    hctx.globalAlpha = 0.35;
    hctx.drawImage(canvas, 0, 0);
  }
  const normal = heightToNormal(height, spec.normalStrength ?? 1.3);
  const rough = roughnessFromAlbedo(canvas, spec.roughness ?? 0.62, spec.roughContrast ?? 0.32);

  const maps = {
    map: toTexture(canvas),
    roughnessMap: toTexture(rough, { colorSpace: THREE.NoColorSpace }),
    normalMap: toTexture(normal, { colorSpace: THREE.NoColorSpace }),
    aoMap: toTexture(makeAO(size, seed + 70, spec.ao ?? 0.22), { colorSpace: THREE.NoColorSpace }),
  };
  cache.set(name, maps);
  return maps;
}

function makeAO(size, seed, amount) {
  const { canvas, ctx } = canvas2d(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / size * 4, y / size * 4, seed, 4);
      const v = clampByte((0.72 + n * 0.28 - amount * (1 - n)) * 255);
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function createLabelTexture(draw, size = 256) {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = '#c4b79a';
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size);
  return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
}

export function createScreenTexture(draw, size = 512) {
  const { canvas, ctx } = canvas2d(size);
  draw(ctx, size, 0);
  const tex = toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  tex.userData.canvas = canvas;
  tex.userData.ctx = ctx;
  tex.userData.draw = draw;
  tex.userData.size = size;
  return tex;
}

export function updateScreenTexture(tex, time) {
  const { ctx, canvas, draw, size } = tex.userData;
  if (!draw) return;
  draw(ctx, size, time);
  tex.needsUpdate = true;
}

export function createGaugeFace(label, value = 0.42, units = 'BAR') {
  return createLabelTexture((ctx, s) => {
    ctx.fillStyle = '#d8d2c4';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2c28';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.translate(s / 2, s / 2);
    ctx.strokeStyle = '#1c1c1a';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + i * (Math.PI * 1.5 / 10);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34);
      ctx.lineTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42);
      ctx.stroke();
    }
    ctx.fillStyle = '#222';
    ctx.font = `600 ${s * 0.08}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, s * 0.16);
    ctx.font = `${s * 0.055}px sans-serif`;
    ctx.fillText(units, 0, s * 0.24);
    const a = Math.PI * 0.75 + value * Math.PI * 1.5;
    ctx.strokeStyle = '#8a1e18';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }, 256);
}

export function createWarningPlate(text, color = '#c4a032') {
  return createLabelTexture((ctx, s) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(8, 8, s - 16, s - 16);
    ctx.fillStyle = color;
    ctx.fillRect(14, 14, s - 28, s - 28);
    ctx.fillStyle = '#1a120c';
    ctx.font = `700 ${s * 0.13}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, s / 2, s / 2 + (i - (lines.length - 1) / 2) * s * 0.16);
    });
  }, 256);
}

export function createStencil(text, bg = '#8d826c', fg = '#1c1a16') {
  return createLabelTexture((ctx, s) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = fg;
    ctx.font = `700 ${s * 0.16}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, s / 2, s / 2 + (i - (lines.length - 1) / 2) * s * 0.2);
    });
  }, 256);
}

export function createWeave(colorA, colorB, size = 256, seed = 4) {
  const { canvas, ctx } = canvas2d(size);
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = Math.sin(x * 0.7) * 0.5 + 0.5;
      const wy = Math.sin(y * 0.7) * 0.5 + 0.5;
      const n = fbm(x / 40, y / 40, seed, 3);
      const t = ((x ^ y) & 3) === 0 ? 0.15 : 0;
      const k = mix(wx, wy, 0.5) * 0.35 + n * 0.5 + t;
      const i = (y * size + x) * 4;
      d[i] = clampByte(mix(a.r, b.r, k));
      d[i + 1] = clampByte(mix(a.g, b.g, k));
      d[i + 2] = clampByte(mix(a.b, b.b, k));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const height = makeHeight(size, seed + 2, 28, 0.55);
  return {
    map: toTexture(canvas),
    roughnessMap: toTexture(roughnessFromAlbedo(canvas, 0.86, 0.12), { colorSpace: THREE.NoColorSpace }),
    normalMap: toTexture(heightToNormal(height, 0.7), { colorSpace: THREE.NoColorSpace }),
  };
}

export function createDiamondPlate(size = 512, seed = 11) {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = '#2a2c2e';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3a3d40';
  const step = 28;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      ctx.save();
      ctx.translate(x + 8, y + 10);
      ctx.rotate(-0.6);
      ctx.fillRect(0, 0, 16, 5);
      ctx.restore();
    }
  }
  addScratches(ctx, size, seed, 40, 'rgba(0,0,0,0.25)');
  addBlotches(ctx, size, '#1a140e', 18, seed, 0.2);
  const height = makeHeight(size, seed, 20, 0.4);
  const hctx = height.getContext('2d');
  hctx.globalCompositeOperation = 'lighter';
  hctx.drawImage(canvas, 0, 0);
  return {
    map: toTexture(canvas),
    roughnessMap: toTexture(roughnessFromAlbedo(canvas, 0.72, 0.2), { colorSpace: THREE.NoColorSpace }),
    normalMap: toTexture(heightToNormal(height, 2.1), { colorSpace: THREE.NoColorSpace }),
  };
}

export function createCondensationMap(size = 512, seed = 90) {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const drop = hash2(Math.floor(x / 3), Math.floor(y / 3), seed);
      const n = fbm(x / 80, y / 80, seed, 4);
      const edge = Math.max(0, 1 - Math.hypot((x / size - 0.5) * 1.6, (y / size - 0.15) * 1.1));
      const v = drop > 0.97 ? 220 : 90 + n * 50 + edge * 40;
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = clampByte(v);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, { colorSpace: THREE.NoColorSpace, wrap: THREE.ClampToEdgeWrapping });
}

export function clearTextureCache() {
  cache.clear();
}
