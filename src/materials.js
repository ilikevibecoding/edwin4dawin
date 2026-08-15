import {
  CanvasTexture,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { SEED, mulberry32, PALETTE } from './seed.js';

const cache = new Map();
let wearMode = 'used';

export function setWearMode(mode) {
  wearMode = mode === 'clean' ? 'clean' : 'used';
}

export function getWearMode() {
  return wearMode;
}

function noise2(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.013) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x, y, seed, oct = 5) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise2(x * f, y * f, seed + i * 19);
    a *= 0.5;
    f *= 2.03;
  }
  return v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function canvasTex(canvas, srgb = false, repeat = 2) {
  const t = new CanvasTexture(canvas);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function heightToNormal(height, size, strength = 2.4) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const get = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = get(x + 1, y) - get(x - 1, y);
      const dy = get(x, y + 1) - get(x, y - 1);
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function writeMaps(size, paint) {
  const albedoC = makeCanvas(size);
  const roughC = makeCanvas(size);
  const height = new Float32Array(size * size);
  const aCtx = albedoC.getContext('2d');
  const rCtx = roughC.getContext('2d');
  const aImg = aCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const ad = aImg.data;
  const rd = rImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const sample = paint(u, v, x, y);
      const i = (y * size + x) * 4;
      ad[i] = sample.r;
      ad[i + 1] = sample.g;
      ad[i + 2] = sample.b;
      ad[i + 3] = 255;
      const rough = clamp01(sample.rough);
      rd[i] = rd[i + 1] = rd[i + 2] = rough * 255;
      rd[i + 3] = 255;
      height[y * size + x] = sample.h;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  return { albedoC, roughC, height };
}

function usedAmt() {
  return wearMode === 'clean' ? 0.28 : 1;
}

function paintedSteelMaps(tint, seed) {
  const size = 512;
  const u = usedAmt();
  const maps = writeMaps(size, (x, y) => {
    const n = fbm(x * 7, y * 7, seed, 5);
    const fine = fbm(x * 38, y * 38, seed + 3, 3);
    const scratch = Math.pow(fbm(x * 22, y * 2.2, seed + 8, 3), 8);
    const edge = Math.pow(Math.abs(Math.sin(x * Math.PI * 4) * Math.sin(y * Math.PI * 3)), 0.35);
    const dirt = Math.pow(fbm(x * 3.2, y * 3.5, seed + 11, 4), 1.6);
    const chip = n > 0.78 && fine > 0.62 ? 1 : 0;
    const wear = clamp01(scratch * 0.9 + chip * 0.7) * u;
    const grime = dirt * 0.22 * u * (1.1 - edge);
    const r = tint.r * 255 * (0.86 + n * 0.12 - wear * 0.28 - grime * 0.25);
    const g = tint.g * 255 * (0.86 + n * 0.1 - wear * 0.22 - grime * 0.22);
    const b = tint.b * 255 * (0.84 + n * 0.1 - wear * 0.16 - grime * 0.18);
    const metalShow = wear * 40;
    return {
      r: clamp01((r + metalShow) / 255) * 255,
      g: clamp01((g + metalShow * 0.95) / 255) * 255,
      b: clamp01((b + metalShow * 0.9) / 255) * 255,
      rough: 0.52 + n * 0.18 + grime * 0.22 - wear * 0.2 + fine * 0.05,
      h: n * 0.55 + fine * 0.18 - wear * 0.25 + (1 - edge) * 0.08,
    };
  });
  return maps;
}

function metalMaps(seed, oily = false) {
  const size = 512;
  const u = usedAmt();
  return writeMaps(size, (x, y) => {
    const brush = Math.sin((x * 180 + fbm(x * 4, y * 40, seed, 2) * 8) * Math.PI);
    const n = fbm(x * 10, y * 10, seed, 4);
    const oil = oily ? Math.pow(fbm(x * 2.4, y * 3.1, seed + 4, 4), 1.4) : 0;
    const stain = Math.pow(fbm(x * 5, y * 1.4, seed + 6, 3), 2.2) * u;
    const base = oily ? 38 : 118;
    const r = base + brush * 14 + n * 18 - stain * 22 - oil * 10;
    const g = base + 2 + brush * 14 + n * 16 - stain * 18 - oil * 6;
    const b = base + 6 + brush * 12 + n * 14 - stain * 12;
    return {
      r: clamp01(r / 255) * 255,
      g: clamp01(g / 255) * 255,
      b: clamp01(b / 255) * 255,
      rough: oily ? 0.22 + n * 0.2 + oil * 0.18 + stain * 0.12 : 0.28 + n * 0.16 - Math.abs(brush) * 0.08,
      h: brush * 0.12 + n * 0.3 + oil * 0.1,
    };
  });
}

function rubberMaps(seed) {
  const size = 512;
  return writeMaps(size, (x, y) => {
    const tread = Math.abs(Math.sin(x * Math.PI * 28)) * 0.35 + Math.abs(Math.sin(y * Math.PI * 10)) * 0.2;
    const n = fbm(x * 12, y * 12, seed, 4);
    const traffic = Math.pow(1 - Math.abs(x - 0.5) * 1.6, 2) * 0.35 * usedAmt();
    const r = 28 + n * 10 + tread * 8 + traffic * 18;
    const g = 26 + n * 8 + tread * 6 + traffic * 14;
    const b = 24 + n * 7 + tread * 5 + traffic * 10;
    return {
      r, g, b,
      rough: 0.86 + n * 0.08 - traffic * 0.12 + tread * 0.04,
      h: tread * 0.7 + n * 0.2 - traffic * 0.15,
    };
  });
}

function fabricMaps(seed, tint) {
  const size = 512;
  return writeMaps(size, (x, y) => {
    const weave = (Math.sin(x * Math.PI * 90) * Math.sin(y * Math.PI * 70)) * 0.5 + 0.5;
    const fold = fbm(x * 3.5, y * 2.2, seed, 4);
    const n = fbm(x * 18, y * 18, seed + 2, 3);
    const lint = fbm(x * 40, y * 40, seed + 5, 2);
    const r = tint.r * 255 * (0.72 + fold * 0.22 + weave * 0.08 - lint * 0.04);
    const g = tint.g * 255 * (0.72 + fold * 0.2 + weave * 0.07);
    const b = tint.b * 255 * (0.7 + fold * 0.18 + weave * 0.06);
    return {
      r: clamp01(r / 255) * 255,
      g: clamp01(g / 255) * 255,
      b: clamp01(b / 255) * 255,
      rough: 0.9 + n * 0.06 - fold * 0.04,
      h: fold * 0.7 + weave * 0.25 + n * 0.1,
    };
  });
}

function rustGrimeMaps(seed) {
  const size = 256;
  return writeMaps(size, (x, y) => {
    const blot = Math.pow(fbm(x * 4, y * 5, seed, 5), 1.8);
    const streak = Math.pow(fbm(x * 2, y * 9, seed + 3, 3), 2.4);
    const t = clamp01(blot * 0.7 + streak * 0.55);
    return {
      r: 70 + t * 90,
      g: 38 + t * 28,
      b: 24 + t * 10,
      rough: 0.7 + t * 0.22,
      h: t * 0.4,
    };
  });
}

function toColor(hex) {
  return new Color(hex);
}

function mapsToTextures(maps, repeat, srgbAlbedo = true) {
  const map = canvasTex(maps.albedoC, srgbAlbedo, repeat);
  const roughnessMap = canvasTex(maps.roughC, false, repeat);
  const normalMap = canvasTex(heightToNormal(maps.height, maps.albedoC.width, 3.1), false, repeat);
  return { map, roughnessMap, normalMap };
}

function cached(key, factory) {
  if (cache.has(key)) return cache.get(key);
  const value = factory();
  cache.set(key, value);
  return value;
}

function std(opts) {
  return new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.1,
    envMapIntensity: 0.85,
    ...opts,
  });
}

function phys(opts) {
  return new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.1,
    envMapIntensity: 0.9,
    ...opts,
  });
}

export function createMaterials() {
  return cached(`mats:${wearMode}:${SEED}`, () => {
    const hullTint = toColor(PALETTE.hull);
    const greenTint = toColor(PALETTE.hullGreen);
    const fabricTint = toColor(PALETTE.fabric);
    const hullMaps = mapsToTextures(paintedSteelMaps(hullTint, SEED), 2.4);
    const greenMaps = mapsToTextures(paintedSteelMaps(greenTint, SEED + 17), 2.1);
    const chipMaps = mapsToTextures(paintedSteelMaps(toColor(0x8a8474), SEED + 31), 1.8);
    const brushMaps = mapsToTextures(metalMaps(SEED + 41, false), 1.6);
    const oilyMaps = mapsToTextures(metalMaps(SEED + 53, true), 1.4);
    const rubberT = mapsToTextures(rubberMaps(SEED + 67), 3.2);
    const fabricT = mapsToTextures(fabricMaps(SEED + 71, fabricTint), 1.8);
    const rustT = mapsToTextures(rustGrimeMaps(SEED + 83), 1.2);
    const pipeMaps = mapsToTextures(paintedSteelMaps(toColor(0x6d7468), SEED + 91), 1.5);
    const deckMaps = mapsToTextures(rubberMaps(SEED + 101), 2.6);

    const hull = std({
      ...hullMaps,
      color: 0xe7e3d6,
      roughness: 0.62,
      metalness: 0.08,
      normalScale: { x: 0.55, y: 0.55 },
    });

    const hullGreen = std({
      ...greenMaps,
      color: 0xc5cbb6,
      roughness: 0.64,
      metalness: 0.1,
      normalScale: { x: 0.5, y: 0.5 },
    });

    const chipped = std({
      ...chipMaps,
      color: 0xd4cfc0,
      roughness: 0.58,
      metalness: 0.16,
      normalScale: { x: 0.7, y: 0.7 },
    });

    const brushed = std({
      ...brushMaps,
      color: 0xc5c8cc,
      roughness: 0.32,
      metalness: 0.86,
      envMapIntensity: 1.15,
      normalScale: { x: 0.45, y: 0.45 },
    });

    const oily = phys({
      ...oilyMaps,
      color: 0x8a8d92,
      roughness: 0.28,
      metalness: 0.88,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      envMapIntensity: 1.05,
      normalScale: { x: 0.4, y: 0.4 },
    });

    const rubber = std({
      ...rubberT,
      color: 0x4a4846,
      roughness: 0.92,
      metalness: 0.0,
      normalScale: { x: 1.1, y: 1.1 },
    });

    const fabric = std({
      ...fabricT,
      color: 0xb7aa96,
      roughness: 0.94,
      metalness: 0.0,
      normalScale: { x: 1.4, y: 1.4 },
    });

    const leather = std({
      ...fabricT,
      color: 0x6a5346,
      roughness: 0.72,
      metalness: 0.04,
      normalScale: { x: 0.8, y: 0.8 },
    });

    const plastic = std({
      color: 0x3a403e,
      roughness: 0.42,
      metalness: 0.05,
      map: chipMaps.map,
      roughnessMap: chipMaps.roughnessMap,
    });

    const bakelite = std({
      color: 0x4a382c,
      roughness: 0.38,
      metalness: 0.02,
    });

    const glass = phys({
      color: 0xb7c8cc,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.22,
      envMapIntensity: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      thickness: 0.12,
      ior: 1.48,
      attenuationColor: 0x7aa0a8,
      attenuationDistance: 0.6,
    });

    const glassThick = phys({
      color: 0x9bb0b6,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      envMapIntensity: 1.25,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });

    const wet = phys({
      ...hullMaps,
      color: 0xcfd4d2,
      roughness: 0.22,
      metalness: 0.12,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      normalScale: { x: 0.35, y: 0.35 },
    });

    const rust = std({
      ...rustT,
      color: 0xb56a3c,
      roughness: 0.82,
      metalness: 0.18,
      normalScale: { x: 0.9, y: 0.9 },
    });

    const pipe = std({
      ...pipeMaps,
      color: 0xb7bbae,
      roughness: 0.55,
      metalness: 0.22,
      normalScale: { x: 0.45, y: 0.45 },
    });

    const pipeBlue = std({
      ...pipeMaps,
      color: 0x7d8b96,
      roughness: 0.5,
      metalness: 0.28,
    });

    const pipeOrange = std({
      ...pipeMaps,
      color: 0xb57a48,
      roughness: 0.52,
      metalness: 0.2,
    });

    const deck = std({
      ...deckMaps,
      color: 0x3d3934,
      roughness: 0.88,
      metalness: 0.04,
      normalScale: { x: 1.2, y: 1.2 },
    });

    const grate = std({
      ...brushMaps,
      color: 0x5a5854,
      roughness: 0.48,
      metalness: 0.7,
    });

    const emissiveGreen = std({
      color: 0x102214,
      emissive: PALETTE.instrumentGreen,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.1,
    });

    const emissiveAmber = std({
      color: 0x1a1208,
      emissive: PALETTE.instrumentAmber,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.1,
    });

    const emissiveCyan = std({
      color: 0x081418,
      emissive: PALETTE.instrumentCyan,
      emissiveIntensity: 0.4,
      roughness: 0.32,
      metalness: 0.1,
    });

    const blackout = std({
      color: 0x08090a,
      roughness: 0.95,
      metalness: 0,
    });

    const foam = std({
      color: 0xc8c2b0,
      roughness: 0.9,
      metalness: 0,
    });

    const ceramic = std({
      color: 0xd8d4cc,
      roughness: 0.28,
      metalness: 0.0,
    });

    return {
      hull,
      hullGreen,
      chipped,
      brushed,
      oily,
      rubber,
      fabric,
      leather,
      plastic,
      bakelite,
      glass,
      glassThick,
      wet,
      rust,
      pipe,
      pipeBlue,
      pipeOrange,
      deck,
      grate,
      emissiveGreen,
      emissiveAmber,
      emissiveCyan,
      blackout,
      foam,
      ceramic,
    };
  });
}

export function makeLabelTexture(text, opts = {}) {
  const {
    w = 256,
    h = 128,
    bg = '#8a7a3a',
    fg = '#1a160c',
    border = '#1a160c',
    sub = '',
  } = opts;
  const key = `label:${text}:${sub}:${w}:${h}:${bg}`;
  return cached(key, () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = fg;
    ctx.font = `700 ${Math.floor(h * 0.28)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w * 0.5, sub ? h * 0.4 : h * 0.5);
    if (sub) {
      ctx.font = `600 ${Math.floor(h * 0.16)}px sans-serif`;
      ctx.fillText(sub, w * 0.5, h * 0.68);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

export function makeStencilTexture(text) {
  return cached(`stencil:${text}`, () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = '#c4b56a';
    ctx.font = '700 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

export function applyEnvMap(materials, envMap, intensity = 0.9) {
  for (const mat of Object.values(materials)) {
    if (mat && mat.isMaterial) {
      mat.envMap = envMap;
      mat.envMapIntensity = intensity * (mat.envMapIntensity || 1);
      mat.needsUpdate = true;
    }
  }
}

export function cloneMat(mat, overrides = {}) {
  const m = mat.clone();
  Object.assign(m, overrides);
  return m;
}
