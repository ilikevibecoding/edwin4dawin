// Procedural canvas textures + tiny noise library. No external assets anywhere.
import * as THREE from 'three';
import { mulberry32 } from './rng.js';

// ---------------------------------------------------------------- noise ----
const permRand = mulberry32(20260805);
const PERM = new Uint8Array(512);
{
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(permRand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function grad2(h, x, y) {
  switch (h & 3) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    default: return -x - y;
  }
}
/** Perlin-style 2D noise in [-1, 1] */
export function noise2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const aa = PERM[PERM[X] + Y], ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y], bb = PERM[PERM[X + 1] + Y + 1];
  const l1 = grad2(aa, x, y) * (1 - u) + grad2(ba, x - 1, y) * u;
  const l2 = grad2(ab, x, y - 1) * (1 - u) + grad2(bb, x - 1, y - 1) * u;
  return (l1 * (1 - v) + l2 * v) * 1.42;
}
/** fractal Brownian motion, [-1, 1]-ish */
export function fbm2(x, y, oct = 4, lac = 2.02, gain = 0.5) {
  let a = 0.5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x * f, y * f);
    norm += a; a *= gain; f *= lac;
  }
  return s / norm;
}
/** ridged fbm in [0, 1] — mountain profiles */
export function ridged2(x, y, oct = 4) {
  let a = 0.55, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += a * (1 - Math.abs(noise2(x * f, y * f)));
    norm += a; a *= 0.5; f *= 2.13;
  }
  return s / norm;
}

// ------------------------------------------------------------- helpers ----
export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return c;
}
export function canvasTexture(w, h, draw, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const tex = new THREE.CanvasTexture(makeCanvas(w, h, draw));
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}
function speckle(g, w, h, n, rgba, sizeMin = 1, sizeMax = 2.4, rnd = Math.random) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rgba(rnd);
    const s = sizeMin + rnd() * (sizeMax - sizeMin);
    g.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// ------------------------------------------------------------ textures ----
export function concreteTexture(repeat = [4, 4]) {
  return cached('concrete' + repeat, () => canvasTexture(512, 512, (g, w, h) => {
    const rnd = mulberry32(11);
    g.fillStyle = '#787670'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = fbm2(x * 0.02, y * 0.02, 4) * 0.5 + fbm2(x * 0.11, y * 0.13, 2) * 0.22;
        const v = 116 + n * 30;
        g.fillStyle = `rgb(${v | 0},${(v - 3) | 0},${(v - 8) | 0})`;
        g.fillRect(x, y, 2, 2);
      }
    }
    speckle(g, w, h, 900, r => `rgba(60,58,52,${0.05 + r() * 0.12})`, 1, 3, rnd);
    speckle(g, w, h, 500, r => `rgba(210,205,196,${0.04 + r() * 0.08})`, 1, 2, rnd);
    // expansion joints
    g.strokeStyle = 'rgba(52,50,46,0.55)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo((w / 2) * i, 0); g.lineTo((w / 2) * i, h); g.stroke();
      g.beginPath(); g.moveTo(0, (h / 2) * i); g.lineTo(w, (h / 2) * i); g.stroke();
    }
    // faint stains
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w, y = rnd() * h, r = 18 + rnd() * 60;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, `rgba(58,54,46,${0.05 + rnd() * 0.1})`);
      gr.addColorStop(1, 'rgba(58,54,46,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }, { repeat }));
}

export function asphaltTexture(repeat = [6, 6]) {
  return cached('asphalt' + repeat, () => canvasTexture(512, 512, (g, w, h) => {
    const rnd = mulberry32(21);
    g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = fbm2(x * 0.045, y * 0.045, 3);
        const v = 66 + n * 16;
        g.fillStyle = `rgb(${v | 0},${v | 0},${(v + 2) | 0})`;
        g.fillRect(x, y, 2, 2);
      }
    }
    speckle(g, w, h, 2600, r => `rgba(28,28,30,${0.12 + r() * 0.2})`, 1, 2.2, rnd);
    speckle(g, w, h, 900, r => `rgba(150,148,150,${0.05 + r() * 0.1})`, 1, 1.6, rnd);
    // patch seams / cracks
    g.strokeStyle = 'rgba(30,30,32,0.5)'; g.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      let x = rnd() * w, y = rnd() * h;
      g.moveTo(x, y);
      for (let s = 0; s < 8; s++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
  }, { repeat }));
}

export function sandTexture(repeat = [40, 40]) {
  return cached('sand' + repeat, () => canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#a3906f'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = fbm2(x * 0.03, y * 0.03, 4) * 0.5 + noise2(x * 0.2, y * 0.2) * 0.14;
        g.fillStyle = `rgb(${(163 + n * 30) | 0},${(144 + n * 26) | 0},${(111 + n * 22) | 0})`;
        g.fillRect(x, y, 2, 2);
      }
    }
    speckle(g, w, h, 1500, r => `rgba(96,84,62,${0.06 + r() * 0.1})`, 1, 2, mulberry32(31));
  }, { repeat }));
}

export function metalTexture(base = '#6f7570', seed = 41) {
  return cached('metal' + base + seed, () => canvasTexture(256, 256, (g, w, h) => {
    const rnd = mulberry32(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = fbm2(x * 0.05 + seed, y * 0.05, 3) * 10;
        g.fillStyle = `rgba(${n > 0 ? 255 : 0},${n > 0 ? 255 : 0},${n > 0 ? 255 : 0},${Math.abs(n) * 0.012})`;
        g.fillRect(x, y, 2, 2);
      }
    }
    // brushed streaks + scratches
    g.globalAlpha = 0.06;
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = rnd() < 0.5 ? '#ffffff' : '#20241f';
      g.lineWidth = 0.8 + rnd() * 1.4;
      const y = rnd() * h;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 8); g.stroke();
    }
    g.globalAlpha = 1;
  }));
}

/** olive-drab military panel texture with rivet lines + wear */
export function panelTexture({ base = '#5c6350', seed = 7, rivets = true, label = null } = {}) {
  return canvasTexture(512, 512, (g, w, h) => {
    const rnd = mulberry32(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const n = fbm2(x * 0.02 + seed * 3, y * 0.02, 4) * 12 + noise2(x * 0.14, y * 0.14) * 5;
        g.fillStyle = `rgba(${n > 0 ? 255 : 10},${n > 0 ? 255 : 12},${n > 0 ? 240 : 8},${Math.abs(n) * 0.010})`;
        g.fillRect(x, y, 2, 2);
      }
    }
    // panel seams
    g.strokeStyle = 'rgba(20,24,18,0.55)'; g.lineWidth = 2.5;
    const cols = 2 + (seed % 3), rows = 2 + ((seed * 7) % 3);
    for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo((w / cols) * i, 0); g.lineTo((w / cols) * i, h); g.stroke(); }
    for (let i = 1; i < rows; i++) { g.beginPath(); g.moveTo(0, (h / rows) * i); g.lineTo(w, (h / rows) * i); g.stroke(); }
    if (rivets) {
      g.fillStyle = 'rgba(28,32,26,0.7)';
      for (let i = 1; i < cols; i++) for (let y = 12; y < h; y += 26) {
        g.beginPath(); g.arc((w / cols) * i + 6, y, 2.2, 0, 7); g.fill();
      }
      for (let i = 1; i < rows; i++) for (let x = 12; x < w; x += 26) {
        g.beginPath(); g.arc(x, (h / rows) * i + 6, 2.2, 0, 7); g.fill();
      }
    }
    // wear on edges
    g.globalAlpha = 0.18;
    for (let i = 0; i < 30; i++) {
      g.fillStyle = rnd() < 0.6 ? '#2c2f28' : '#9aa08c';
      g.fillRect(rnd() * w, rnd() < 0.5 ? rnd() * 8 : h - rnd() * 8, 4 + rnd() * 20, 2 + rnd() * 3);
    }
    g.globalAlpha = 1;
    if (label) {
      g.font = 'bold 44px "Arial Narrow", Arial, sans-serif';
      g.fillStyle = 'rgba(230,228,214,0.82)';
      g.textAlign = 'center';
      g.fillText(label, w / 2, h / 2 + 14);
    }
  });
}

export function hazardStripesTexture(repeat = [3, 1]) {
  return cached('hazard' + repeat, () => canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#d9b13b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c1c1e';
    for (let x = -h; x < w + h; x += 42) {
      g.beginPath();
      g.moveTo(x, h); g.lineTo(x + 21, h); g.lineTo(x + 21 + h, 0); g.lineTo(x + h, 0);
      g.closePath(); g.fill();
    }
    // grime
    speckle(g, w, h, 260, r => `rgba(40,36,30,${0.08 + r() * 0.16})`, 1, 3, mulberry32(3));
  }, { repeat }));
}

export function chainlinkTexture() {
  return cached('chainlink', () => {
    const tex = canvasTexture(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(148,155,158,0.95)';
      g.lineWidth = 2.4;
      const s = 16;
      for (let x = -s; x <= w + s; x += s) {
        g.beginPath(); g.moveTo(x, -4); g.lineTo(x + s * 2, h + 4); g.stroke();
        g.beginPath(); g.moveTo(x + s * 2, -4); g.lineTo(x, h + 4); g.stroke();
      }
    }, { srgb: true });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/** soft round particle sprite (white core → transparent) */
export function puffSprite() {
  return cached('puff', () => canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // lumpy alpha for smoke character
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % w, y = (i / 4 / w) | 0;
      const n = 0.72 + 0.38 * fbm2(x * 0.05, y * 0.05, 3);
      img.data[i + 3] = Math.min(255, img.data[i + 3] * n);
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false }));
}

/** hard bright flare sprite for engines / flashes */
export function flareSprite() {
  return cached('flare', () => canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,244,214,0.95)');
    gr.addColorStop(0.35, 'rgba(255,196,120,0.42)');
    gr.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // cross streaks
    g.globalCompositeOperation = 'lighter';
    const streak = g.createLinearGradient(0, h / 2, w, h / 2);
    streak.addColorStop(0, 'rgba(255,220,180,0)');
    streak.addColorStop(0.5, 'rgba(255,235,205,0.6)');
    streak.addColorStop(1, 'rgba(255,220,180,0)');
    g.fillStyle = streak; g.fillRect(0, h / 2 - 3, w, 6);
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 2); g.translate(-w / 2, -h / 2);
    g.fillRect(0, h / 2 - 2, w, 4); g.restore();
  }, { srgb: false }));
}

export function scorchTexture() {
  return cached('scorch', () => canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(12,10,8,0.92)');
    gr.addColorStop(0.45, 'rgba(20,16,12,0.72)');
    gr.addColorStop(0.8, 'rgba(30,24,18,0.28)');
    gr.addColorStop(1, 'rgba(30,24,18,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % w, y = (i / 4 / w) | 0;
      const a = Math.atan2(y - h / 2, x - w / 2);
      const n = 0.66 + 0.5 * fbm2(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, 3) + 0.2 * noise2(x * 0.08, y * 0.08);
      img.data[i + 3] = Math.max(0, Math.min(255, img.data[i + 3] * n));
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false }));
}

export function cloudSprite(seed = 5) {
  return cached('cloud' + seed, () => canvasTexture(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const rnd = mulberry32(seed);
    for (let i = 0; i < 26; i++) {
      const x = w * (0.24 + rnd() * 0.52), y = h * (0.34 + rnd() * 0.32);
      const r = 10 + rnd() * 22;
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      const a = 0.10 + rnd() * 0.13;
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }, { srgb: false }));
}

/** lengthwise smoke-streak strip for ribbon trails: soft cross-profile ×
 *  wispy noise. Sampled with u = along trail (repeat), v = across (clamp). */
export function trailNoiseTexture() {
  return cached('trailnoise', () => {
    const tex = canvasTexture(256, 64, (g, w, h) => {
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        const cross = Math.pow(Math.sin((y / (h - 1)) * Math.PI), 1.15);
        for (let x = 0; x < w; x++) {
          const streak = 0.62 + 0.38 * fbm2(x * 0.035, y * 0.16, 3);
          const wisp = 0.85 + 0.3 * noise2(x * 0.12 + 40, y * 0.05);
          const v = Math.max(0, Math.min(1, cross * streak * wisp));
          const i = (y * w + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = v * 255;
        }
      }
      g.putImageData(img, 0, 0);
    }, { srgb: false });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/** small text decal texture (stencil style) */
export function stencilTexture(text, { color = '#e8e4d8', bg = null, w = 256, h = 64, size = 34 } = {}) {
  return canvasTexture(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
    g.font = `bold ${size}px "Courier New", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

/** helipad-style circle-H marking */
export function padMarkingTexture() {
  return cached('padmark', () => canvasTexture(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(226,220,200,0.85)'; g.lineWidth = 16;
    g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 30, 0, 7); g.stroke();
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(w / 2 - 60, h / 2 - 80); g.lineTo(w / 2 - 60, h / 2 + 80);
    g.moveTo(w / 2 + 60, h / 2 - 80); g.lineTo(w / 2 + 60, h / 2 + 80);
    g.moveTo(w / 2 - 60, h / 2); g.lineTo(w / 2 + 60, h / 2);
    g.stroke();
    // wear
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % w, y = (i / 4 / w) | 0;
      const n = 0.55 + 0.55 * fbm2(x * 0.03, y * 0.03, 3);
      img.data[i + 3] = Math.max(0, Math.min(255, img.data[i + 3] * n));
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false }));
}

export function camoNetTexture() {
  return cached('camonet', () => {
    const tex = canvasTexture(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const rnd = mulberry32(77);
      for (let i = 0; i < 340; i++) {
        const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 12;
        g.fillStyle = ['#4b5340', '#5d6549', '#3c4436', '#6b7355'][(rnd() * 4) | 0] + '';
        g.globalAlpha = 0.5 + rnd() * 0.4;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      // net holes
      const img = g.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const x = (i / 4) % w, y = (i / 4 / w) | 0;
        if ((x % 14 < 3) || (y % 14 < 3)) img.data[i + 3] *= 0.15;
      }
      g.putImageData(img, 0, 0);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}
