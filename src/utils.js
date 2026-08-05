// utils.js — seeded RNG, math helpers, procedural canvas textures shared by all modules.
import * as THREE from 'three';

// ---------------------------------------------------------------- RNG
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.f = mulberry32(seed); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length) % arr.length]; }
  sign() { return this.f() < 0.5 ? -1 : 1; }
  gauss() { // Box-Muller
    const u = Math.max(this.f(), 1e-9), v = this.f();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

const params = new URLSearchParams(location.search);
export const SEED = parseInt(params.get('seed') || '20260805', 10);
export const TEST_MODE = params.get('test') === '1';
export const rngGame = new RNG(SEED);          // gameplay-critical randomness (deterministic)
export const rngFx = new RNG(SEED ^ 0x9e3779b9); // visual-only randomness

// ---------------------------------------------------------------- math
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const remap = (v, a, b, c, d) => c + (d - c) * clamp((v - a) / (b - a), 0, 1);
// frame-rate independent exponential damping
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
export const DEG = Math.PI / 180;

export function v3(x = 0, y = 0, z = 0) { return new THREE.Vector3(x, y, z); }

// ---------------------------------------------------------------- 2D value noise for canvas textures
const permSeed = mulberry32(1337);
const PERM = new Uint8Array(512);
for (let i = 0; i < 512; i++) PERM[i] = Math.floor(permSeed() * 256);
function hash2(x, y) { return PERM[(PERM[x & 255] + y) & 255] / 255; }
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, oct = 4, lac = 2.02, gain = 0.5) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f);
    norm += amp; amp *= gain; f *= lac;
  }
  return sum / norm;
}

// ---------------------------------------------------------------- canvas texture factory
export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
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

// speckle + fbm grunge, tileable enough for grime overlays
export function grungeTexture(size = 512) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm(x * 0.02, y * 0.02, 5);
        const s = vnoise(x * 0.45, y * 0.45);
        let v = 233 + (n - 0.5) * 44 + (s - 0.5) * 20;
        v = clamp(v, 150, 255);
        const i = (y * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // streaks
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#3a352c';
    for (let i = 0; i < 60; i++) {
      const x = (i * 97.3) % w, y0 = (i * 61.7) % h;
      ctx.fillRect(x, y0, 1 + (i % 3), 22 + (i * 13) % 90);
    }
    ctx.globalAlpha = 1;
  }, { repeat: [1, 1] });
}

export function concreteTexture(size = 512, base = [128, 127, 122]) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm(x * 0.03, y * 0.03, 5);
        const sp = vnoise(x * 0.9, y * 0.9);
        const v = (n - 0.5) * 34 + (sp - 0.5) * 20;
        const i = (y * w + x) * 4;
        img.data[i] = clamp(base[0] + v, 0, 255);
        img.data[i + 1] = clamp(base[1] + v, 0, 255);
        img.data[i + 2] = clamp(base[2] + v, 0, 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // hairline cracks
    ctx.strokeStyle = 'rgba(60,58,52,0.5)';
    ctx.lineWidth = 1;
    const r = mulberry32(77);
    for (let c = 0; c < 10; c++) {
      ctx.beginPath();
      let x = r() * w, y = r() * h;
      ctx.moveTo(x, y);
      for (let s = 0; s < 8; s++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // stains
    for (let s = 0; s < 8; s++) {
      const x = r() * w, y = r() * h, rad = 14 + r() * 46;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, 'rgba(46,42,36,0.28)');
      g.addColorStop(1, 'rgba(46,42,36,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, { repeat: [1, 1] });
}

export function asphaltTexture(size = 512) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm(x * 0.05, y * 0.05, 4);
        const sp = vnoise(x * 1.3, y * 1.3);
        const v = 88 + (n - 0.5) * 30 + sp * 24;
        const i = (y * w + x) * 4;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v + 3;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: [1, 1] });
}

export function sandTexture(size = 512) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm(x * 0.02, y * 0.02, 5);
        const rip = Math.sin((x + vnoise(x * 0.05, y * 0.05) * 60) * 0.11) * 0.5 + 0.5;
        const sp = vnoise(x * 0.8, y * 0.8);
        const i = (y * w + x) * 4;
        const r = 152 + (n - 0.5) * 46 + rip * 9 + (sp - 0.5) * 16;
        img.data[i] = clamp(r, 0, 255);
        img.data[i + 1] = clamp(r * 0.82, 0, 255);
        img.data[i + 2] = clamp(r * 0.60, 0, 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: [1, 1] });
}

export function camoTexture(size = 512, colors = ['#4a5240', '#3a4234', '#5b6149', '#31382e']) {
  return canvasTexture(size, size, (ctx, w, h) => {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, w, h);
    const r = mulberry32(4242);
    for (let layer = 1; layer < colors.length; layer++) {
      ctx.fillStyle = colors[layer];
      for (let b = 0; b < 26; b++) {
        ctx.beginPath();
        const cx = r() * w, cy = r() * h;
        ctx.moveTo(cx, cy);
        let a = 0;
        for (let p = 0; p < 9; p++) {
          a += 0.7 + r() * 0.6;
          const rad = 18 + r() * 52;
          ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.7);
        }
        ctx.closePath(); ctx.fill();
      }
    }
    // grime pass
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const x = (i / 4) % w, y = Math.floor(i / 4 / w);
      const n = (fbm(x * 0.04, y * 0.04, 4) - 0.5) * 26;
      img.data[i] = clamp(img.data[i] + n, 0, 255);
      img.data[i + 1] = clamp(img.data[i + 1] + n, 0, 255);
      img.data[i + 2] = clamp(img.data[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: [1, 1] });
}

export function hazardTexture(w = 256, h = 64) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#c8a01e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#151310';
    for (let x = -h; x < w + h; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.lineTo(x + h + 16, 0); ctx.lineTo(x + 16, h);
      ctx.closePath(); ctx.fill();
    }
    // wear
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = '#6b6257';
      ctx.fillRect((i * 53) % w, (i * 29) % h, 3, 2);
    }
    ctx.globalAlpha = 1;
  }, { repeat: [4, 1] });
}

export function chainlinkTexture(size = 128) {
  const tex = canvasTexture(size, size, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(74,78,82,0.95)';
    ctx.lineWidth = 1.2;
    const s = 16;
    for (let y = -s; y < h + s; y += s) {
      for (let x = -s; x < w + s; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s / 2, y); ctx.lineTo(x + s, y + s / 2); ctx.lineTo(x + s / 2, y + s);
        ctx.closePath(); ctx.stroke();
      }
    }
  }, { srgb: true });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// stenciled military text decal
export function stencilTexture(text, { w = 256, h = 64, color = '#d8d2c0', size = 30, sub = null } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = sub ? 'bottom' : 'middle';
    ctx.globalAlpha = 0.92;
    ctx.fillText(text, w / 2, sub ? h / 2 + 6 : h / 2);
    if (sub) {
      ctx.font = `400 ${Math.floor(size * 0.44)}px monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(sub, w / 2, h / 2 + 8);
    }
    // spray wear
    ctx.globalCompositeOperation = 'destination-out';
    const r = mulberry32(text.length * 131 + 7);
    for (let i = 0; i < 220; i++) {
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, r() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  });
}

// soft round particle sprite
export function softCircleTexture(size = 64, inner = 0.0, rgb = [255, 255, 255]) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, size * inner, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    g.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.45)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { srgb: false });
}

// puffy smoke sprite with fbm irregularity
export function smokeTexture(size = 128) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x * 0.08 + 31, y * 0.08 + 17, 4);
        let a = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.55);
        const i = (y * w + x) * 4;
        const v = 235 + (n - 0.5) * 30;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
        img.data[i + 3] = clamp(a * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}

export function scorchTexture(size = 256) {
  return canvasTexture(size, size, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x * 0.06, y * 0.06, 4);
        const a = smoothstep(1.0, 0.15, d + (n - 0.5) * 0.7) * (0.72 + n * 0.28);
        const i = (y * w + x) * 4;
        img.data[i] = 16 + n * 14; img.data[i + 1] = 13 + n * 11; img.data[i + 2] = 11 + n * 9;
        img.data[i + 3] = clamp(a * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}

// cloud billboard texture
export function cloudTexture(size = 256, seed = 5) {
  const r = mulberry32(seed);
  const ox = r() * 100, oy = r() * 100;
  return canvasTexture(size, size, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx, dy = (y - cy) / cy * 1.7;
        const d = Math.sqrt(dx * dx + dy * dy);
        const n = fbm(x * 0.025 + ox, y * 0.05 + oy, 5);
        let a = smoothstep(1.0, 0.3, d + (n - 0.42) * 1.1);
        a *= 0.5 + n * 0.6;
        const i = (y * w + x) * 4;
        const v = 225 + n * 30;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v + 4;
        img.data[i + 3] = clamp(a * 220, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}

// ---------------------------------------------------------------- geometry helpers
// Vertex tint: treat the hex palette as the *displayed* color. Color.setHex converts
// sRGB→linear; combined with the multiplicative grunge map that rendered near-black,
// so we convert back and let the map/lighting provide the darkening.
export function tintGeometry(geo, color) {
  const c = new THREE.Color(color).convertLinearToSRGB();
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// catenary-ish cable between two points
export function cableCurve(a, b, sag = 0.35, segments = 12) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}

// format helpers for HUD
export const fmtKm = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
export const fmtAlt = (m) => Math.round(m / 10) * 10 + ' m';
