import * as THREE from 'three';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx };
}

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash(xi * 13.1 + yi * 47.3);
  const n10 = hash((xi + 1) * 13.1 + yi * 47.3);
  const n01 = hash(xi * 13.1 + (yi + 1) * 47.3);
  const n11 = hash((xi + 1) * 13.1 + (yi + 1) * 47.3);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

function fbm(x, y, oct = 5) {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    a += noise2(x * f, y * f) * amp;
    f *= 2.05;
    amp *= 0.5;
  }
  return a;
}

function tex(key, size, draw, { wrap = THREE.RepeatWrapping, colorSpace = THREE.NoColorSpace, anisotropy = 8 } = {}) {
  if (cache.has(key)) return cache.get(key);
  const { c, ctx } = canvas(size);
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = wrap;
  t.colorSpace = colorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

function put(ctx, size, fn) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a = 255] = fn(x / size, y / size, x, y);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function paintAlbedo() {
  return tex(
    'paintA',
    1024,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const flake = fbm(u * 140, v * 140, 2);
        const orange = fbm(u * 5 + 2, v * 5, 4);
        const dirt = Math.max(0, fbm(u * 2.4, v * 11, 4) - 0.64) * 2.6;
        const chip = hash(u * 880 + v * 311) > 0.996 ? 0.55 : 0;
        const edge = Math.pow(Math.abs(u - 0.5) * 2, 3) * 0.1;
        const r = 172 + flake * 42 + orange * 16 - dirt * 55 - edge * 36 - chip * 40;
        const g = 100 + flake * 20 + orange * 8 - dirt * 42 - edge * 18 - chip * 20;
        const b = 46 + flake * 8 - dirt * 16;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function paintRough() {
  return tex('paintR', 1024, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const orange = fbm(u * 18, v * 18, 4);
      const dirt = Math.max(0, fbm(u * 4, v * 16, 3) - 0.58);
      const chips = hash(u * 400 + v * 211) > 0.992 ? 0.45 : 0;
      const g = 48 + orange * 70 + dirt * 140 + chips * 180;
      return [g, g, g];
    });
  });
}

export function paintNormal() {
  return tex('paintN', 512, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const hL = fbm(u * 40 - 0.01, v * 40, 3);
      const hR = fbm(u * 40 + 0.01, v * 40, 3);
      const hD = fbm(u * 40, v * 40 - 0.01, 3);
      const hU = fbm(u * 40, v * 40 + 0.01, 3);
      return [128 + (hL - hR) * 380, 128 + (hD - hU) * 380, 255];
    });
  });
}

export function metalAlbedo() {
  return tex(
    'metalA',
    512,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const brush = Math.sin(v * 220 + fbm(u * 8, v * 8, 2) * 4) * 0.08;
        const rust = Math.max(0, fbm(u * 7, v * 5, 4) - 0.68) * 2;
        const r = 110 + brush * 80 + rust * 70;
        const g = 108 + brush * 80 + rust * 20;
        const b = 102 + brush * 70 - rust * 20;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function metalRough() {
  return tex('metalR', 512, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const g = 70 + fbm(u * 12, v * 12, 4) * 110;
      return [g, g, g];
    });
  });
}

export function rubberAlbedo() {
  return tex(
    'rubA',
    512,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const n = fbm(u * 20, v * 20, 4);
        const g = 28 + n * 22;
        return [g, g * 0.95, g * 0.88];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function tireAlbedo() {
  return tex(
    'tireA',
    1024,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        // v wraps around the tread; u is across the width.
        const blocks = Math.abs(Math.sin(v * Math.PI * 32 + Math.sin(u * 22) * 0.8));
        const stagger = Math.abs(Math.sin(v * Math.PI * 16 + u * 9));
        const grooves = blocks < 0.2 || stagger < 0.08 ? 0.32 : 1;
        const siping = 0.9 + 0.1 * Math.sin(u * 90);
        const letterBand = v > 0.8 && v < 0.93;
        const glyph = Math.abs(Math.sin(u * Math.PI * 14 + 0.4));
        const letter = letterBand && glyph > 0.62 ? 1.55 : 1;
        const n = fbm(u * 30, v * 30, 3);
        const base = 22 + n * 16;
        const c = base * grooves * siping * letter;
        return [c, c * 0.96, c * 0.9];
      });
    },
    { colorSpace: THREE.SRGBColorSpace, wrap: THREE.RepeatWrapping },
  );
}

export function tireNormal() {
  return tex('tireN', 1024, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const blocks = Math.abs(Math.sin(v * Math.PI * 28 + Math.sin(u * 18) * 0.6));
      const h = blocks < 0.22 ? 0.15 : 0.85 + fbm(u * 40, v * 40, 2) * 0.1;
      const hL = Math.abs(Math.sin((v - 0.004) * Math.PI * 28 + Math.sin(u * 18) * 0.6)) < 0.22 ? 0.15 : 0.85;
      const hD = Math.abs(Math.sin(v * Math.PI * 28 + Math.sin((u - 0.004) * 18) * 0.6)) < 0.22 ? 0.15 : 0.85;
      return [128 + (hL - h) * 900, 128 + (hD - h) * 900, 255];
    });
  });
}

export function fabricAlbedo() {
  return tex(
    'fabA',
    512,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const weave = ((Math.floor(u * 80) + Math.floor(v * 80)) % 2) * 8;
        const n = fbm(u * 10, v * 10, 3);
        const r = 58 + weave + n * 18;
        const g = 50 + weave + n * 12;
        const b = 40 + weave * 0.6;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function dirtAlbedo() {
  return tex(
    'dirtA',
    1024,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const n = fbm(u * 8, v * 8, 5);
        const peb = hash(u * 180 + v * 93);
        const rut = Math.exp(-Math.pow((u - 0.28) * 14, 2)) + Math.exp(-Math.pow((u - 0.72) * 14, 2));
        const wet = Math.max(0, fbm(u * 3 + 4, v * 3, 3) - 0.62) * (1 - rut * 0.4);
        const r = 108 + n * 40 - rut * 28 - wet * 50 + (peb > 0.97 ? 30 : 0);
        const g = 72 + n * 22 - rut * 18 - wet * 30 + (peb > 0.97 ? 22 : 0);
        const b = 40 + n * 10 - rut * 10 - wet * 12;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function dirtNormal() {
  return tex('dirtN', 1024, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const h = fbm(u * 16, v * 16, 4);
      const rut = Math.exp(-Math.pow((u - 0.28) * 14, 2)) + Math.exp(-Math.pow((u - 0.72) * 14, 2));
      const hh = h - rut * 0.35;
      const hL = fbm(u * 16 - 0.01, v * 16, 4);
      const hD = fbm(u * 16, v * 16 - 0.01, 4);
      return [128 + (hL - hh) * 500, 128 + (hD - hh) * 500, 255];
    });
  });
}

export function dirtRough() {
  return tex('dirtR', 512, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const wet = Math.max(0, fbm(u * 3 + 4, v * 3, 3) - 0.62);
      const g = 210 - wet * 160 + fbm(u * 10, v * 10, 3) * 30;
      return [g, g, g];
    });
  });
}

export function grassAlbedo() {
  return tex(
    'grassA',
    512,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const n = fbm(u * 14, v * 14, 4);
        const blade = Math.abs(Math.sin(u * 90 + n * 6));
        const r = 48 + n * 30 + blade * 10;
        const g = 68 + n * 40 + blade * 18;
        const b = 28 + n * 12;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function barkAlbedo() {
  return tex(
    'barkA',
    512,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const ridges = fbm(u * 18, v * 3, 4);
        const crack = Math.abs(Math.sin(u * 40 + ridges * 8));
        const r = 62 + ridges * 40 - crack * 10;
        const g = 42 + ridges * 22;
        const b = 28 + ridges * 10;
        return [r, g, b];
      });
    },
    { colorSpace: THREE.SRGBColorSpace },
  );
}

export function leafAlbedo() {
  return tex(
    'leafA',
    256,
    (ctx, s) => {
      put(ctx, s, (u, v) => {
        const dx = u - 0.5;
        const dy = v - 0.55;
        const leaf = dx * dx * 2.2 + dy * dy * 1.1;
        const a = leaf < 0.18 ? 255 : 0;
        const vein = 1 - Math.abs(dx) * 1.4;
        const n = fbm(u * 10, v * 10, 3);
        const r = 36 + n * 20;
        const g = 72 + n * 40 + vein * 18;
        const b = 28 + n * 10;
        return [r, g, b, a];
      });
    },
    { colorSpace: THREE.SRGBColorSpace, wrap: THREE.ClampToEdgeWrapping },
  );
}

export function leafAlpha() {
  return tex('leafMask', 256, (ctx, s) => {
    put(ctx, s, (u, v) => {
      const dx = u - 0.5;
      const dy = v - 0.55;
      const leaf = dx * dx * 2.2 + dy * dy * 1.1;
      const g = leaf < 0.18 ? 255 : 0;
      return [g, g, g, 255];
    });
  });
}

export function envCanvas() {
  // Cheap but finite environment: warm sky, green ground, sun blob.
  const { c, ctx } = canvas(256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#6a88a8');
  g.addColorStop(0.48, '#e8c090');
  g.addColorStop(0.52, '#5a4a30');
  g.addColorStop(1, '#2a2418');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffe8b8';
  ctx.beginPath();
  ctx.arc(190, 70, 18, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
