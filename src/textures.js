import * as THREE from 'three';
import { fbm2, hash2, createRng } from './seed.js';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx };
}

function toTexture(c, { wrap = THREE.RepeatWrapping, repeat = 2, colorSpace = THREE.SRGBColorSpace } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = wrap;
  t.repeat.set(repeat, repeat);
  t.colorSpace = colorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function heightToNormal(heightData, size, strength = 1.6) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const get = (x, y) => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return heightData[yi * size + xi];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (get(x + 1, y) - get(x - 1, y)) * strength;
      const dy = (get(x, y + 1) - get(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = (nx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { colorSpace: THREE.NoColorSpace, repeat: 2 });
}

function fillBase(ctx, size, r, g, b) {
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
}

export function makeMaps(name, size, seed, paint) {
  const key = `${name}:${size}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const { c: albedoC, ctx: a } = canvas(size);
  const { c: roughC, ctx: r } = canvas(size);
  const height = new Float32Array(size * size);
  const albedo = a.createImageData(size, size);
  const rough = r.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const sample = paint(u, v, x, y);
      const i = (y * size + x) * 4;
      albedo.data[i] = sample.r;
      albedo.data[i + 1] = sample.g;
      albedo.data[i + 2] = sample.b;
      albedo.data[i + 3] = 255;
      const rk = sample.rough * 255;
      rough.data[i] = rk;
      rough.data[i + 1] = rk;
      rough.data[i + 2] = rk;
      rough.data[i + 3] = 255;
      height[y * size + x] = sample.h;
    }
  }
  a.putImageData(albedo, 0, 0);
  r.putImageData(rough, 0, 0);
  const maps = {
    map: toTexture(albedoC, { repeat: paint.repeat ?? 2 }),
    roughnessMap: toTexture(roughC, { colorSpace: THREE.NoColorSpace, repeat: paint.repeat ?? 2 }),
    normalMap: heightToNormal(height, size, paint.normalStrength ?? 1.4),
    bumpMap: toTexture(roughC, { colorSpace: THREE.NoColorSpace, repeat: paint.repeat ?? 2 }),
  };
  cache.set(key, maps);
  return maps;
}

export function paintedSteelMaps(seed = 1, size = 512) {
  return makeMaps('painted', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 8, v * 8, seed, 5);
    const n2 = fbm2(u * 28, v * 28, seed + 3, 3);
    const dirt = fbm2(u * 4 + 2, v * 6, seed + 9, 4);
    const scratch = Math.pow(fbm2(u * 40, v * 3, seed + 11, 2), 8);
    const edgeChip = Math.pow(fbm2(u * 18, v * 18, seed + 21, 3), 10);
    const wear = Math.max(0, dirt - 0.58) * 1.6;
    let r = 188 + n * 18 - wear * 40 - scratch * 50;
    let g = 182 + n * 14 - wear * 36 - scratch * 40;
    let b = 166 + n * 10 - wear * 28 - scratch * 30;
    r -= edgeChip * 35;
    g -= edgeChip * 20;
    b -= edgeChip * 10;
    const rough = 0.42 + n2 * 0.22 + wear * 0.25 + scratch * 0.3;
    const h = n * 0.35 + n2 * 0.12 - scratch * 0.4 - edgeChip * 0.5;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h };
  }, { repeat: 3, normalStrength: 1.2 }));
}

export function hullGreenMaps(seed = 2, size = 512) {
  return makeMaps('hullgreen', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 7, v * 7, seed, 5);
    const dirt = fbm2(u * 3, v * 5, seed + 4, 4);
    const scratch = Math.pow(fbm2(u * 50, v * 2.4, seed + 8, 2), 9);
    const hand = Math.pow(Math.abs(Math.sin(v * Math.PI * 2)), 3) * fbm2(u * 6, v * 6, seed + 14, 3);
    let r = 108 + n * 14 - dirt * 18 - scratch * 30;
    let g = 120 + n * 12 - dirt * 14 - scratch * 20;
    let b = 102 + n * 10 - dirt * 16;
    r += hand * 10;
    g += hand * 6;
    const rough = 0.48 + n * 0.18 + scratch * 0.25 + dirt * 0.1;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: n * 0.3 - scratch * 0.45 };
  }, { repeat: 2.5, normalStrength: 1.15 }));
}

export function chippedPaintMaps(seed = 3, size = 512) {
  return makeMaps('chipped', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 10, v * 10, seed, 5);
    const chip = fbm2(u * 16, v * 16, seed + 7, 4);
    const exposed = chip > 0.62 ? 1 : 0;
    const rust = Math.max(0, fbm2(u * 12, v * 12, seed + 19, 3) - 0.55) * exposed;
    let r = 160 + n * 16;
    let g = 156 + n * 12;
    let b = 142 + n * 10;
    if (exposed) {
      r = 92 + rust * 70;
      g = 78 + rust * 20;
      b = 68;
    }
    const rough = exposed ? 0.72 + rust * 0.15 : 0.4 + n * 0.15;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: n * 0.25 - exposed * 0.55 };
  }, { repeat: 2, normalStrength: 1.8 }));
}

export function brushedMetalMaps(seed = 4, size = 512) {
  return makeMaps('brushed', size, seed, Object.assign((u, v) => {
    const grain = fbm2(u * 90, v * 4, seed, 3);
    const n = fbm2(u * 6, v * 6, seed + 2, 3);
    const r = 118 + grain * 28 + n * 8;
    const g = 122 + grain * 26 + n * 8;
    const b = 128 + grain * 22 + n * 6;
    const rough = 0.22 + grain * 0.18 + n * 0.06;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: grain * 0.22 };
  }, { repeat: 2, normalStrength: 2.2 }));
}

export function oilyMachineMaps(seed = 5, size = 512) {
  return makeMaps('oily', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 5, v * 5, seed, 5);
    const drip = Math.pow(fbm2(u * 3, v * 14, seed + 6, 3), 2);
    const stain = fbm2(u * 8, v * 3, seed + 12, 3);
    let r = 46 + n * 16 + drip * 18;
    let g = 48 + n * 14 + drip * 10;
    let b = 52 + n * 12;
    r -= stain * 8;
    const rough = 0.28 + n * 0.2 - drip * 0.18 + stain * 0.12;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: n * 0.2 + drip * 0.15 };
  }, { repeat: 1.6, normalStrength: 1.1 }));
}

export function rubberMaps(seed = 6, size = 512) {
  return makeMaps('rubber', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 18, v * 18, seed, 4);
    const tread = Math.abs(Math.sin(u * Math.PI * 28)) * 0.35 + Math.abs(Math.sin(v * Math.PI * 28)) * 0.15;
    const wear = fbm2(u * 3, v * 8, seed + 5, 3);
    const r = 28 + n * 10 + wear * 14;
    const g = 28 + n * 8 + wear * 10;
    const b = 30 + n * 8 + wear * 8;
    const rough = 0.82 - tread * 0.08 - wear * 0.12 + n * 0.08;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: n * 0.25 + tread * 0.45 };
  }, { repeat: 4, normalStrength: 2.4 }));
}

export function fabricMaps(seed = 7, size = 512) {
  return makeMaps('fabric', size, seed, Object.assign((u, v) => {
    const weave = (Math.sin(u * Math.PI * 80) * 0.5 + 0.5) * 0.25 + (Math.sin(v * Math.PI * 80) * 0.5 + 0.5) * 0.25;
    const n = fbm2(u * 6, v * 6, seed, 4);
    const fold = fbm2(u * 2.2, v * 3.4, seed + 9, 3);
    const r = 62 + n * 18 + weave * 20 + fold * 16;
    const g = 70 + n * 14 + weave * 12 + fold * 10;
    const b = 78 + n * 16 + weave * 10;
    const rough = 0.78 + weave * 0.1 - fold * 0.08;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: weave * 0.35 + fold * 0.55 + n * 0.15 };
  }, { repeat: 1.4, normalStrength: 1.6 }));
}

export function blanketMaps(seed = 8, size = 512) {
  return makeMaps('blanket', size, seed, Object.assign((u, v) => {
    const weave = Math.abs(Math.sin(u * 90)) * 0.2 + Math.abs(Math.sin(v * 90)) * 0.2;
    const n = fbm2(u * 4, v * 5, seed, 4);
    const r = 48 + n * 14 + weave * 10;
    const g = 58 + n * 12 + weave * 8;
    const b = 72 + n * 16 + weave * 8;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(0.86 + n * 0.06), h: weave * 0.3 + n * 0.4 };
  }, { repeat: 1.2, normalStrength: 1.3 }));
}

export function plasticMaps(seed = 9, size = 256) {
  return makeMaps('plastic', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 10, v * 10, seed, 3);
    const r = 36 + n * 10;
    const g = 40 + n * 8;
    const b = 42 + n * 8;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(0.38 + n * 0.12), h: n * 0.15 };
  }, { repeat: 1, normalStrength: 0.7 }));
}

export function pipePaintMaps(seed = 10, size = 256) {
  return makeMaps('pipe', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 8, v * 8, seed, 4);
    const rust = Math.max(0, fbm2(u * 14, v * 6, seed + 4, 3) - 0.62);
    const r = 86 + n * 12 + rust * 50;
    const g = 92 + n * 10 - rust * 20;
    const b = 88 + n * 8 - rust * 25;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(0.46 + rust * 0.3 + n * 0.1), h: n * 0.2 - rust * 0.2 };
  }, { repeat: 2, normalStrength: 1.1 }));
}

export function rustGrimeMaps(seed = 11, size = 256) {
  return makeMaps('rust', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 7, v * 7, seed, 5);
    const r = 110 + n * 40;
    const g = 62 + n * 16;
    const b = 40 + n * 10;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(0.86 + n * 0.08), h: n * 0.55 };
  }, { repeat: 2, normalStrength: 2.0 }));
}

export function wetMaps(seed = 12, size = 256) {
  return makeMaps('wet', size, seed, Object.assign((u, v) => {
    const n = fbm2(u * 9, v * 9, seed, 4);
    const drop = Math.pow(fbm2(u * 20, v * 20, seed + 3, 2), 6);
    const r = 150 + n * 10;
    const g = 154 + n * 8;
    const b = 148 + n * 8;
    const rough = 0.12 + n * 0.1 - drop * 0.08;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: clamp01(rough), h: n * 0.1 + drop * 0.35 };
  }, { repeat: 1.5, normalStrength: 0.9 }));
}

export function grateMaps(seed = 13, size = 512) {
  return makeMaps('grate', size, seed, Object.assign((u, v) => {
    const gx = Math.abs(((u * 16) % 1) - 0.5);
    const gy = Math.abs(((v * 16) % 1) - 0.5);
    const bar = gx < 0.08 || gy < 0.08 ? 1 : 0;
    const n = fbm2(u * 8, v * 8, seed, 3);
    const r = bar ? 52 + n * 10 : 18 + n * 6;
    const g = bar ? 50 + n * 8 : 16 + n * 5;
    const b = bar ? 46 + n * 6 : 14 + n * 4;
    return { r: clamp(r), g: clamp(g), b: clamp(b), rough: bar ? 0.55 : 0.9, h: bar ? 0.4 : -0.6 };
  }, { repeat: 2, normalStrength: 3.2 }));
}

export function condensationOverlay(seed = 14, size = 256) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n = fbm2(u * 10, v * 10, seed, 4);
      const streak = Math.pow(fbm2(u * 4, v * 18, seed + 2, 3), 2);
      const edge = Math.pow(Math.max(u, 1 - u, v, 1 - v) * 1.15, 2.4);
      const a = clamp((n * 0.35 + streak * 0.45 + edge * 0.7) * 180);
      const i = (y * size + x) * 4;
      img.data[i] = 200;
      img.data[i + 1] = 210;
      img.data[i + 2] = 215;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = toTexture(c, { wrap: THREE.ClampToEdgeWrapping, repeat: 1 });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeLabelTexture(text, { w = 256, h = 96, bg = '#6a4a1e', fg = '#e8d9a0', sub = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d8c078';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = fg;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
  if (sub) {
    ctx.font = '14px sans-serif';
    ctx.fillText(sub, w / 2, h * 0.7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeGaugeFace(seed, label = 'PSI', max = 300) {
  const rng = createRng(seed);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d8d2c4';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a28';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.translate(128, 128);
  ctx.fillStyle = '#1c1c1a';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 36);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.strokeStyle = i >= 8 ? '#8a2a22' : '#1a1a18';
    ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 78, Math.sin(a) * 78);
    ctx.lineTo(Math.cos(a) * 100, Math.sin(a) * 100);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = '#1a1a18';
      ctx.font = '12px sans-serif';
      ctx.fillText(String((max / 10) * i), Math.cos(a) * 62, Math.sin(a) * 62 + 4);
    }
  }
  ctx.fillStyle = '#333';
  ctx.font = '10px sans-serif';
  ctx.fillText('DSV-A', 0, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.needle = rng.range(0.25, 0.7);
  return t;
}

export function makeDisplay(kind, time = 0, extra = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#06110c';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#1c3a28';
  ctx.strokeRect(1, 1, 510, 318);

  if (kind === 'sonar') {
    ctx.fillStyle = '#07140f';
    ctx.fillRect(0, 0, 512, 320);
    ctx.save();
    ctx.translate(200, 160);
    ctx.strokeStyle = '#1a5a38';
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, i * 32, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-140, 0);
    ctx.lineTo(140, 0);
    ctx.moveTo(0, -140);
    ctx.lineTo(0, 140);
    ctx.stroke();
    const sweep = extra.sweep ?? (time * 0.7) % (Math.PI * 2);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 130);
    grd.addColorStop(0, 'rgba(80,255,140,0.15)');
    grd.addColorStop(1, 'rgba(80,255,140,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 128, sweep - 0.35, sweep);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7dff9a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweep) * 128, Math.sin(sweep) * 128);
    ctx.stroke();
    if (extra.ping) {
      const pr = (extra.ping * 128) % 128;
      ctx.strokeStyle = `rgba(140,255,180,${1 - extra.ping})`;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#8fe8a8';
    ctx.font = '12px monospace';
    ctx.fillText('ACTIVE SONAR  FWD ARRAY', 360, 28);
    ctx.fillText('RNG  4.0 km', 360, 52);
    ctx.fillText('FRQ  7.2 kHz', 360, 74);
    ctx.fillText(extra.contact || 'CONTACT  NONE', 360, 96);
    ctx.fillText(`HDG  ${extra.hdg ?? '247'}°`, 360, 118);
    ctx.fillText(`DPTH ${extra.depth ?? '412'} m`, 360, 140);
    ctx.fillStyle = '#3a6a48';
    ctx.fillText('MODE  CRUISE', 360, 180);
    ctx.fillText('SRC  KEEL-2', 360, 202);
  } else if (kind === 'nav') {
    ctx.fillStyle = '#08140f';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#245a3a';
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 320);
      ctx.stroke();
    }
    for (let y = 0; y < 320; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6fd4a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 240);
    ctx.bezierCurveTo(140, 200, 220, 260, 320, 180);
    ctx.bezierCurveTo(380, 140, 430, 160, 490, 120);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(260 + Math.sin(time * 0.15) * 8, 188, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ae8b0';
    ctx.font = '13px monospace';
    ctx.fillText('NAV PLOT  RIDGE-07', 16, 22);
    ctx.fillText('WP-3  14.2 nm', 16, 42);
    ctx.fillText('SOG   4.6 kt', 380, 22);
    ctx.fillText('COG   247°', 380, 42);
  } else if (kind === 'depth') {
    ctx.fillStyle = '#0a120c';
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = '#2a5a38';
    ctx.beginPath();
    ctx.moveTo(40, 280);
    ctx.lineTo(40, 30);
    ctx.lineTo(490, 30);
    ctx.stroke();
    ctx.strokeStyle = '#7dff9a';
    ctx.beginPath();
    ctx.moveTo(40, 80);
    for (let i = 0; i < 28; i++) {
      const x = 40 + i * 16;
      const y = 90 + Math.sin(i * 0.45 + time * 0.4) * 18 + i * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#c8e8c0';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('412.4 m', 60, 50);
    ctx.font = '13px monospace';
    ctx.fillText('KEEL DEPTH', 60, 72);
    ctx.fillText('RATE  +0.2 m/min', 280, 50);
    ctx.fillText('CEILING  38 m', 280, 72);
  } else if (kind === 'status') {
    ctx.fillStyle = '#0b100d';
    ctx.fillRect(0, 0, 512, 320);
    const rows = extra.rows || [
      ['HULL', 'NOMINAL', '#7dff9a'],
      ['BALLAST', 'TRIMMED', '#7dff9a'],
      ['PROP', extra.silent ? 'SILENT' : 'AHEAD 1/3', extra.silent ? '#ffb347' : '#7dff9a'],
      ['BUS A', '392 V', '#7dff9a'],
      ['BUS B', '391 V', '#7dff9a'],
      ['O2', '20.7 %', '#7dff9a'],
      ['CO2', '0.11 %', '#c8e090'],
      ['CABIN', '19.4 °C', '#9ad0c0'],
    ];
    ctx.font = '16px monospace';
    rows.forEach((row, i) => {
      ctx.fillStyle = '#6a8a72';
      ctx.fillText(row[0], 24, 36 + i * 34);
      ctx.fillStyle = row[2];
      ctx.fillText(row[1], 200, 36 + i * 34);
    });
  } else if (kind === 'heading') {
    ctx.fillStyle = '#08110e';
    ctx.fillRect(0, 0, 512, 320);
    ctx.save();
    ctx.translate(256, 168);
    ctx.strokeStyle = '#2a6a44';
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-((extra.hdg ?? 247) * Math.PI) / 180);
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.lineTo(10, 20);
    ctx.lineTo(0, 8);
    ctx.lineTo(-10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#b8e0c0';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${extra.hdg ?? 247}°`, 256, 36);
    ctx.font = '12px monospace';
    ctx.fillText('GYRO HEADING', 256, 56);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { texture: t, canvas: c, ctx };
}

export function makeNavChart() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9b98a';
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = '#7a6840';
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 32, 0);
    ctx.lineTo(i * 32, 384);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 24);
    ctx.lineTo(512, i * 24);
    ctx.stroke();
  }
  ctx.strokeStyle = '#3a4a38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 300);
  ctx.bezierCurveTo(80, 220, 160, 340, 260, 200);
  ctx.bezierCurveTo(340, 110, 400, 180, 500, 90);
  ctx.stroke();
  ctx.fillStyle = '#5a3020';
  ctx.font = 'bold 18px serif';
  ctx.fillText('RIDGE 07  —  SURVEY TRACK', 24, 28);
  ctx.font = '12px serif';
  ctx.fillText('DSV ABSS-2   CHART 4-19   CONFIDENTIAL', 24, 50);
  ctx.fillStyle = '#8a2020';
  ctx.beginPath();
  ctx.arc(268, 214, 5, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeStencil(text, color = '#c4a24a') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.72;
  ctx.fillText(text, 256, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function makeCaustic(seed = 20, size = 256) {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const a = Math.sin((u * 14 + fbm2(u * 3, v * 3, seed, 3)) * Math.PI * 2);
      const b = Math.sin((v * 11 + fbm2(u * 4, v * 2, seed + 2, 3)) * Math.PI * 2);
      const k = Math.pow(Math.max(0, a * b), 2);
      const i = (y * size + x) * 4;
      const vcol = 40 + k * 200;
      img.data[i] = vcol * 0.5;
      img.data[i + 1] = vcol * 0.85;
      img.data[i + 2] = vcol;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: 3, colorSpace: THREE.SRGBColorSpace });
}

export { hash2 };
