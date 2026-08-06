/**
 * Procedural material synthesis. Every surface in the game is generated at
 * runtime — there are no image assets in the repository. Each generator fills
 * albedo / normal / ORM buffers in one pass, and the normal map is derived from
 * the height channel with a wrapping Sobel filter so results tile seamlessly.
 */
import * as THREE from 'three';
import { clamp, fbm2D, gradNoise2D, lerp, smoothstep, worley2D, Rng } from './Noise';

export interface SurfaceSample {
  h: number;
  r: number;
  g: number;
  b: number;
  rough: number;
  metal: number;
  ao: number;
  er: number;
  eg: number;
  eb: number;
}

export type SurfaceFn = (u: number, v: number, out: SurfaceSample) => void;

export interface SurfaceMaps {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  /** Packed ORM: r=ao, g=roughness, b=metalness. */
  ormMap: THREE.DataTexture;
  emissiveMap?: THREE.DataTexture;
}

export interface SurfaceOptions {
  size?: number;
  normalStrength?: number;
  repeat?: number;
  emissive?: boolean;
  anisotropy?: number;
}

const surfaceCache = new Map<string, SurfaceMaps>();
const texCache = new Map<string, THREE.Texture>();
let maxAnisotropy = 4;

export function setTextureCapabilities(renderer: THREE.WebGLRenderer) {
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
}

function makeDataTexture(
  data: Uint8Array,
  size: number,
  colorSpace: THREE.ColorSpace,
  repeat: number,
  aniso: number
): THREE.DataTexture {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = colorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = Math.min(aniso, maxAnisotropy);
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

/** Derives a tangent-space normal map from a wrapped height field. */
function heightToNormal(height: Float32Array, size: number, strength: number): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => ((y + size) % size) * size + ((x + size) % size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = height[at(x - 1, y - 1)];
      const t = height[at(x, y - 1)];
      const tr = height[at(x + 1, y - 1)];
      const l = height[at(x - 1, y)];
      const r = height[at(x + 1, y)];
      const bl = height[at(x - 1, y + 1)];
      const b = height[at(x, y + 1)];
      const br = height[at(x + 1, y + 1)];
      let nx = (tl + 2 * l + bl - (tr + 2 * r + br)) * strength;
      let ny = (tl + 2 * t + tr - (bl + 2 * b + br)) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * size + x) * 4;
      out[o] = Math.round((nx * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

export function buildSurface(key: string, fn: SurfaceFn, opts: SurfaceOptions = {}): SurfaceMaps {
  const size = opts.size ?? 512;
  const cacheKey = `${key}:${size}:${opts.repeat ?? 1}`;
  const hit = surfaceCache.get(cacheKey);
  if (hit) return hit;

  const albedo = new Uint8Array(size * size * 4);
  const orm = new Uint8Array(size * size * 4);
  const emis = opts.emissive ? new Uint8Array(size * size * 4) : null;
  const height = new Float32Array(size * size);
  const s: SurfaceSample = { h: 0.5, r: 0.5, g: 0.5, b: 0.5, rough: 0.5, metal: 0, ao: 1, er: 0, eg: 0, eb: 0 };

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      s.h = 0.5;
      s.r = s.g = s.b = 0.5;
      s.rough = 0.5;
      s.metal = 0;
      s.ao = 1;
      s.er = s.eg = s.eb = 0;
      fn(x / size, v, s);
      const i = y * size + x;
      const o = i * 4;
      albedo[o] = clamp(s.r) * 255;
      albedo[o + 1] = clamp(s.g) * 255;
      albedo[o + 2] = clamp(s.b) * 255;
      albedo[o + 3] = 255;
      orm[o] = clamp(s.ao) * 255;
      orm[o + 1] = clamp(s.rough) * 255;
      orm[o + 2] = clamp(s.metal) * 255;
      orm[o + 3] = 255;
      if (emis) {
        emis[o] = clamp(s.er) * 255;
        emis[o + 1] = clamp(s.eg) * 255;
        emis[o + 2] = clamp(s.eb) * 255;
        emis[o + 3] = 255;
      }
      height[i] = s.h;
    }
  }

  const repeat = opts.repeat ?? 1;
  const aniso = opts.anisotropy ?? 8;
  const maps: SurfaceMaps = {
    map: makeDataTexture(albedo, size, THREE.SRGBColorSpace, repeat, aniso),
    normalMap: makeDataTexture(
      heightToNormal(height, size, opts.normalStrength ?? 2),
      size,
      THREE.NoColorSpace,
      repeat,
      aniso
    ),
    ormMap: makeDataTexture(orm, size, THREE.NoColorSpace, repeat, aniso),
  };
  if (emis) maps.emissiveMap = makeDataTexture(emis, size, THREE.SRGBColorSpace, repeat, aniso);
  surfaceCache.set(cacheKey, maps);
  return maps;
}

export function surfaceMaterial(
  maps: SurfaceMaps,
  params: Partial<THREE.MeshPhysicalMaterialParameters> = {}
): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.ormMap,
    metalnessMap: maps.ormMap,
    aoMap: maps.ormMap,
    roughness: 1,
    metalness: 1,
    ...params,
  });
  if (maps.emissiveMap) m.emissiveMap = maps.emissiveMap;
  return m;
}

// ---------------------------------------------------------------------------
// Surface library
// ---------------------------------------------------------------------------

/** Wet city asphalt with aggregate, cracks and puddle pooling. */
export const asphalt: SurfaceFn = (u, v, o) => {
  const grain = fbm2D(u * 34, v * 34, { octaves: 5, period: 34, seed: 11, turbulence: true });
  const aggregate = worley2D(u * 46, v * 46, 46, 7, 1);
  const pebble = smoothstep(0.06, 0.34, aggregate.f1);
  const coarse = fbm2D(u * 5, v * 5, { octaves: 4, period: 5, seed: 3 });
  const crack = 1 - smoothstep(0, 0.045, Math.abs(gradNoise2D(u * 6, v * 6, 6, 21)));
  let tone = (0.055 + grain * 0.05 + (1 - pebble) * 0.05) * lerp(0.85, 1.15, coarse);
  tone *= 1 - crack * 0.55;
  o.r = tone;
  o.g = tone;
  o.b = tone * 1.08;
  o.h = 0.5 + (pebble - 0.5) * 0.45 + grain * 0.18 - crack * 0.5;
  const basin = fbm2D(u * 2.4 + 13.7, v * 2.4 + 4.1, { octaves: 4, period: 3, seed: 55 });
  const puddle = smoothstep(0.52, 0.66, basin);
  const damp = smoothstep(0.4, 0.62, basin) * 0.7;
  o.rough = clamp(lerp(lerp(0.82, 0.55, damp), 0.06, puddle) + grain * 0.06 - crack * 0.1);
  o.ao = clamp(1 - crack * 0.5 - (1 - pebble) * 0.12);
  if (puddle > 0.01) {
    o.r = lerp(o.r, o.r * 0.55, puddle);
    o.g = lerp(o.g, o.g * 0.55, puddle);
    o.b = lerp(o.b, o.b * 0.62, puddle);
    o.h = lerp(o.h, 0.34, puddle);
  }
};

/** Poured concrete: blooms, chips and rain staining. */
export const concrete: SurfaceFn = (u, v, o) => {
  const fine = fbm2D(u * 60, v * 60, { octaves: 4, period: 60, seed: 5, turbulence: true });
  const blotch = fbm2D(u * 4, v * 4, { octaves: 5, period: 4, seed: 9 });
  const stain = fbm2D(u * 2 + 5, v * 9, { octaves: 4, period: 3, seed: 31 });
  const pit = 1 - smoothstep(0, 0.12, worley2D(u * 90, v * 90, 90, 4, 1).f1);
  let tone = 0.3 + blotch * 0.16 + fine * 0.07;
  tone *= lerp(1, 0.78, smoothstep(0.55, 0.85, stain));
  tone -= pit * 0.1;
  o.r = tone;
  o.g = tone * 0.99;
  o.b = tone * 0.97;
  o.h = 0.5 + fine * 0.2 + (blotch - 0.5) * 0.25 - pit * 0.55;
  o.rough = clamp(0.72 + fine * 0.14 - smoothstep(0.6, 0.9, blotch) * 0.1);
  o.ao = clamp(1 - pit * 0.55);
};

/** Painted steel panelling with recessed seams — sci-fi interiors. */
export function panelMetal(cols = 4, rows = 3, tint: [number, number, number] = [0.5, 0.53, 0.58]): SurfaceFn {
  return (u, v, o) => {
    const gx = u * cols;
    const gy = v * rows;
    const fx = gx - Math.floor(gx);
    const fy = gy - Math.floor(gy);
    const edge = Math.min(Math.min(fx, 1 - fx) * cols, Math.min(fy, 1 - fy) * rows);
    const seam = 1 - smoothstep(0, 0.06, edge);
    const cellVar = ((Math.floor(gx) * 31 + Math.floor(gy) * 17) * 2654435761) % 1000 / 1000;
    const brush = fbm2D(u * 200, v * 12, { octaves: 3, period: 12, seed: 44, turbulence: true });
    const grime = fbm2D(u * 6, v * 6, { octaves: 5, period: 6, seed: 71 });
    const scratch = 1 - smoothstep(0, 0.04, Math.abs(gradNoise2D(u * 140, v * 30, 30, 88)));
    const shade = lerp(0.92, 1.06, cellVar) * lerp(0.9, 1.05, grime);
    o.r = lerp(tint[0] * shade + brush * 0.02, 0.62, scratch * 0.4);
    o.g = lerp(tint[1] * shade + brush * 0.02, 0.63, scratch * 0.4);
    o.b = lerp(tint[2] * shade + brush * 0.02, 0.65, scratch * 0.4);
    o.r = lerp(o.r, o.r * 0.35, seam);
    o.g = lerp(o.g, o.g * 0.35, seam);
    o.b = lerp(o.b, o.b * 0.36, seam);
    o.h = 0.55 - seam * 0.5 + brush * 0.05 + scratch * 0.08;
    o.rough = clamp(0.34 + grime * 0.26 + brush * 0.1 - scratch * 0.15 + seam * 0.2);
    o.metal = lerp(0.85, 0.35, grime * 0.5);
    o.ao = clamp(1 - seam * 0.55 - grime * 0.1);
  };
}

export const brushedMetal: SurfaceFn = (u, v, o) => {
  const brush = fbm2D(u * 320, v * 8, { octaves: 4, period: 8, seed: 12, turbulence: true });
  const macro = fbm2D(u * 5, v * 5, { octaves: 3, period: 5, seed: 90 });
  const tone = 0.56 + brush * 0.1 + macro * 0.05;
  o.r = tone;
  o.g = tone * 1.005;
  o.b = tone * 1.03;
  o.h = 0.5 + brush * 0.35;
  o.rough = clamp(0.18 + brush * 0.22 + macro * 0.06);
  o.metal = 0.96;
};

export const rustedMetal: SurfaceFn = (u, v, o) => {
  const rust = smoothstep(0.42, 0.72, fbm2D(u * 5, v * 5, { octaves: 6, period: 5, seed: 17 }));
  const flake = fbm2D(u * 40, v * 40, { octaves: 4, period: 40, seed: 23, turbulence: true });
  const paint = 0.24 + fbm2D(u * 8, v * 8, { octaves: 3, period: 8, seed: 61 }) * 0.1;
  o.r = lerp(paint * 0.55, 0.34 + flake * 0.22, rust);
  o.g = lerp(paint * 0.62, 0.15 + flake * 0.11, rust);
  o.b = lerp(paint * 0.66, 0.07 + flake * 0.05, rust);
  o.h = 0.5 + flake * 0.3 * rust - rust * 0.15;
  o.rough = clamp(lerp(0.42, 0.88, rust) + flake * 0.08);
  o.metal = lerp(0.8, 0.12, rust);
  o.ao = clamp(1 - rust * 0.22 - flake * 0.1);
};

/** Interior plaster wall — subtle, keeps rooms from looking like plastic. */
export function plaster(tint: [number, number, number] = [0.62, 0.6, 0.58]): SurfaceFn {
  return (u, v, o) => {
    const roll = fbm2D(u * 90, v * 90, { octaves: 4, period: 90, seed: 41, turbulence: true });
    const wide = fbm2D(u * 3, v * 3, { octaves: 4, period: 3, seed: 8 });
    const scuff = smoothstep(0.62, 0.9, fbm2D(u * 7 + 2, v * 7, { octaves: 4, period: 7, seed: 66 }));
    const shade = lerp(0.94, 1.05, wide) * lerp(1, 0.9, scuff);
    o.r = tint[0] * shade;
    o.g = tint[1] * shade;
    o.b = tint[2] * shade;
    o.h = 0.5 + roll * 0.14 + (wide - 0.5) * 0.1;
    o.rough = clamp(0.78 + roll * 0.12 - scuff * 0.05);
    o.ao = clamp(1 - scuff * 0.12);
  };
}

export const woodFloor: SurfaceFn = (u, v, o) => {
  const py = v * 6;
  const plankIdx = Math.floor(py);
  const fy = py - plankIdx;
  const px = u * 2 + ((plankIdx * 7919) % 1000) / 1000;
  const fx = px - Math.floor(px);
  const seam = Math.max(1 - smoothstep(0, 0.035, Math.min(fy, 1 - fy)), 1 - smoothstep(0, 0.012, Math.min(fx, 1 - fx)));
  const grain = fbm2D(u * 120, v * 14 + plankIdx * 3.3, { octaves: 4, period: 14, seed: 51, turbulence: true });
  const ring = Math.abs(Math.sin((v * 60 + grain * 8 + plankIdx * 2.1) * 1.7));
  const vari = ((plankIdx * 31 + Math.floor(px) * 17) % 100) / 100;
  const tone = (0.16 + grain * 0.1 + ring * 0.05) * lerp(0.9, 1.12, vari);
  o.r = tone * 1.25;
  o.g = tone * 0.86;
  o.b = tone * 0.6;
  o.h = 0.55 + grain * 0.16 - seam * 0.55;
  o.rough = clamp(0.35 + grain * 0.16 + seam * 0.25);
  o.ao = clamp(1 - seam * 0.6);
};

/** Woven fabric. The weave frequency must stay low or the normal map aliases. */
export function fabric(tint: [number, number, number] = [0.28, 0.3, 0.34], weave = 64): SurfaceFn {
  return (u, v, o) => {
    const wu = Math.sin(u * weave * Math.PI) * 0.5 + 0.5;
    const wv = Math.sin(v * weave * Math.PI) * 0.5 + 0.5;
    const thread = Math.max(wu, wv) * 0.5 + Math.min(wu, wv) * 0.25;
    const fuzz = fbm2D(u * 260, v * 260, { octaves: 3, period: 260, seed: 77, turbulence: true });
    const macro = fbm2D(u * 5, v * 5, { octaves: 4, period: 5, seed: 19 });
    const shade = lerp(0.86, 1.1, macro) * lerp(0.9, 1.05, thread);
    o.r = tint[0] * shade;
    o.g = tint[1] * shade;
    o.b = tint[2] * shade;
    o.h = 0.5 + (thread - 0.4) * 0.3 + fuzz * 0.12;
    o.rough = clamp(0.86 + fuzz * 0.1 - thread * 0.06);
    o.ao = clamp(0.92 - (1 - thread) * 0.15);
  };
}

export function tiles(count = 8, tint: [number, number, number] = [0.72, 0.73, 0.72]): SurfaceFn {
  return (u, v, o) => {
    const gx = u * count;
    const gy = v * count;
    const fx = gx - Math.floor(gx);
    const fy = gy - Math.floor(gy);
    const d = Math.min(Math.min(fx, 1 - fx), Math.min(fy, 1 - fy)) * count;
    const grout = 1 - smoothstep(0.02, 0.09, d);
    const vari = (((Math.floor(gx) * 131 + Math.floor(gy) * 71) * 2654435761) % 1000) / 1000;
    const speck = fbm2D(u * 200, v * 200, { octaves: 3, period: 200, seed: 27, turbulence: true });
    const dirt = fbm2D(u * 6, v * 6, { octaves: 4, period: 6, seed: 93 });
    const shade = lerp(0.95, 1.04, vari) * lerp(1, 0.9, smoothstep(0.5, 0.85, dirt));
    const groutTone = 0.3 + dirt * 0.12;
    o.r = lerp(tint[0] * shade + speck * 0.03, groutTone, grout);
    o.g = lerp(tint[1] * shade + speck * 0.03, groutTone, grout);
    o.b = lerp(tint[2] * shade + speck * 0.03, groutTone * 0.98, grout);
    o.h = 0.6 - grout * 0.6 + speck * 0.04;
    o.rough = clamp(lerp(0.16 + speck * 0.1 + dirt * 0.1, 0.85, grout));
    o.ao = clamp(1 - grout * 0.5);
  };
}

export const brick: SurfaceFn = (u, v, o) => {
  const ry = v * 14;
  const row = Math.floor(ry);
  const fy = ry - row;
  const rx = u * 7 + (row % 2 === 0 ? 0 : 0.5);
  const col = Math.floor(rx);
  const fx = rx - col;
  const mortar = Math.max(1 - smoothstep(0, 0.09, Math.min(fy, 1 - fy)), 1 - smoothstep(0, 0.045, Math.min(fx, 1 - fx)));
  const vari = (((col * 137 + row * 53) * 2654435761) % 1000) / 1000;
  const grain = fbm2D(u * 90, v * 90, { octaves: 4, period: 90, seed: 15, turbulence: true });
  const wet = smoothstep(0.55, 0.85, fbm2D(u * 3, v * 4, { octaves: 4, period: 4, seed: 62 }));
  const brickR = lerp(0.17, 0.29, vari) * lerp(0.85, 1.1, grain);
  const m = 0.3 + grain * 0.12;
  o.r = lerp(brickR, m, mortar) * lerp(1, 0.7, wet);
  o.g = lerp(brickR * lerp(0.5, 0.62, vari), m * 0.99, mortar) * lerp(1, 0.72, wet);
  o.b = lerp(brickR * lerp(0.42, 0.52, vari), m * 0.95, mortar) * lerp(1, 0.78, wet);
  o.h = 0.6 - mortar * 0.55 + grain * 0.18;
  o.rough = clamp(lerp(0.78 + grain * 0.1, 0.86, mortar) - wet * 0.25);
  o.ao = clamp(1 - mortar * 0.5 - wet * 0.08);
};

/**
 * Skin. Pores must stay shallow — deep dimples read as orange peel, not skin.
 */
export function skinSurface(base: [number, number, number] = [0.78, 0.58, 0.5], android = false): SurfaceFn {
  return (u, v, o) => {
    const pore = 1 - smoothstep(0, 0.3, worley2D(u * 220, v * 220, 220, 33, 1).f1);
    const micro = fbm2D(u * 420, v * 420, { octaves: 3, period: 420, seed: 5, turbulence: true });
    const blotch = fbm2D(u * 9, v * 9, { octaves: 4, period: 9, seed: 71 });
    const freckle = smoothstep(0.72, 0.86, fbm2D(u * 60, v * 60, { octaves: 3, period: 60, seed: 101 }));
    const redness = smoothstep(0.35, 0.62, blotch) * 0.5 + freckle * 0.35;
    let r = base[0] * lerp(0.95, 1.06, blotch);
    let g = base[1] * lerp(0.97, 1.03, blotch);
    let b = base[2] * lerp(0.97, 1.02, blotch);
    r = lerp(r, r * 1.1, redness);
    g = lerp(g, g * 0.9, redness);
    b = lerp(b, b * 0.88, redness);
    if (android) {
      // Androids read as flawless: suppress blemish variation
      r = lerp(r, base[0], 0.6);
      g = lerp(g, base[1], 0.6);
      b = lerp(b, base[2], 0.6);
    }
    o.r = r - pore * 0.02;
    o.g = g - pore * 0.02;
    o.b = b - pore * 0.017;
    o.h = 0.5 - pore * 0.12 + micro * 0.1;
    o.rough = clamp((android ? 0.42 : 0.5) + micro * 0.1 + pore * 0.12 - smoothstep(0.5, 0.9, blotch) * 0.08);
    o.ao = clamp(1 - pore * 0.25);
  };
}

export const hairStrands: SurfaceFn = (u, v, o) => {
  const strand = Math.abs(gradNoise2D(u * 90, v * 4, 90, 3));
  const fine = fbm2D(u * 300, v * 6, { octaves: 3, period: 300, seed: 8, turbulence: true });
  const shade = 0.35 + strand * 0.5 + fine * 0.2;
  o.r = 0.06 * shade;
  o.g = 0.045 * shade;
  o.b = 0.04 * shade;
  o.h = 0.5 + strand * 0.4;
  o.rough = clamp(0.34 + fine * 0.2);
  o.ao = clamp(0.85 + strand * 0.15);
};

/** Perforated acoustic panel — interrogation room walls. */
export const acousticPanel: SurfaceFn = (u, v, o) => {
  const n = 44;
  const fx = u * n - Math.floor(u * n) - 0.5;
  const fy = v * n - Math.floor(v * n) - 0.5;
  const hole = 1 - smoothstep(0.16, 0.24, Math.hypot(fx, fy));
  const grime = fbm2D(u * 6, v * 6, { octaves: 4, period: 6, seed: 12 });
  const tone = (0.55 + grime * 0.1) * lerp(1, 0.55, hole);
  o.r = tone;
  o.g = tone;
  o.b = tone * 1.02;
  o.h = 0.6 - hole * 0.6;
  o.rough = clamp(0.6 + grime * 0.2 + hole * 0.2);
  o.metal = lerp(0.15, 0, hole);
  o.ao = clamp(1 - hole * 0.7);
};

export const grimyGlass: SurfaceFn = (u, v, o) => {
  const streak = fbm2D(u * 6, v * 40, { octaves: 4, period: 6, seed: 43, turbulence: true });
  const dust = fbm2D(u * 20, v * 20, { octaves: 3, period: 20, seed: 88 });
  o.r = 0.9;
  o.g = 0.92;
  o.b = 0.95;
  o.h = 0.5 + streak * 0.1;
  o.rough = clamp(0.02 + streak * 0.16 + dust * 0.08);
};

// ---------------------------------------------------------------------------
// Canvas-based textures (signage, screens, posters — anything with glyphs)
// ---------------------------------------------------------------------------

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function canvasTexture(c: HTMLCanvasElement, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colorSpace;
  t.anisotropy = Math.min(8, maxAnisotropy);
  t.needsUpdate = true;
  return t;
}

/** Neon sign, used as an emissive plane. */
export function neonSignTexture(
  text: string,
  color: string,
  opts: { vertical?: boolean; w?: number; h?: number; font?: string; sub?: string } = {}
): THREE.Texture {
  const key = `neon:${text}:${color}:${JSON.stringify(opts)}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const vertical = opts.vertical ?? false;
  const w = opts.w ?? (vertical ? 256 : 1024);
  const h = opts.h ?? (vertical ? 1024 : 256);
  const { c, g } = canvas2d(w, h);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);

  const draw = (fill: string, blur: number) => {
    g.save();
    g.translate(w / 2, h / 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.fillStyle = fill;
    if (vertical) {
      const cell = h / (text.length + 0.5);
      g.font = `700 ${Math.min(cell * 0.8, w * 0.7)}px ${opts.font ?? 'Impact, "Arial Black", sans-serif'}`;
      for (let i = 0; i < text.length; i++) g.fillText(text[i], 0, -h / 2 + cell * (i + 0.75));
    } else {
      const fs = Math.min(h * (opts.sub ? 0.44 : 0.6), (w * 1.7) / Math.max(6, text.length));
      g.font = `700 ${fs}px ${opts.font ?? 'Impact, "Arial Black", sans-serif'}`;
      g.fillText(text, 0, opts.sub ? -h * 0.12 : 0);
      if (opts.sub) {
        g.font = `500 ${fs * 0.4}px "Helvetica Neue", Arial, sans-serif`;
        g.fillText(opts.sub, 0, h * 0.26);
      }
    }
    g.restore();
  };
  draw(color, 48);
  draw(color, 22);
  draw('#ffffff', 8);
  const t = canvasTexture(c);
  texCache.set(key, t);
  return t;
}

/** Glowing monitor / interface screen. */
export function screenTexture(
  lines: { text: string; size?: number; color?: string; align?: CanvasTextAlign }[],
  opts: { w?: number; h?: number; bg?: string; grid?: boolean; scan?: boolean } = {}
): THREE.Texture {
  const w = opts.w ?? 512;
  const h = opts.h ?? 512;
  const { c, g } = canvas2d(w, h);
  g.fillStyle = opts.bg ?? '#020a12';
  g.fillRect(0, 0, w, h);
  if (opts.grid) {
    g.strokeStyle = 'rgba(60,180,255,0.13)';
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }
  let y = h * 0.12;
  for (const l of lines) {
    const size = l.size ?? 26;
    g.font = `500 ${size}px "SF Mono", Consolas, monospace`;
    g.fillStyle = l.color ?? '#7fd6ff';
    g.shadowColor = l.color ?? '#7fd6ff';
    g.shadowBlur = 12;
    g.textAlign = l.align ?? 'left';
    g.fillText(l.text, l.align === 'center' ? w / 2 : w * 0.08, y);
    y += size * 1.6;
  }
  if (opts.scan) {
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,0.16)';
    for (let sy = 0; sy < h; sy += 3) g.fillRect(0, sy, w, 1);
  }
  return canvasTexture(c);
}

export function posterTexture(title: string, subtitle: string, palette: [string, string]): THREE.Texture {
  const w = 512;
  const h = 768;
  const { c, g } = canvas2d(w, h);
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, palette[0]);
  grad.addColorStop(1, palette[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.beginPath();
  g.ellipse(w / 2, h * 0.32, w * 0.14, h * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(w / 2 - w * 0.16, h * 0.42, w * 0.32, h * 0.3);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = `700 ${w * 0.14}px Impact, "Arial Black", sans-serif`;
  g.fillText(title, w / 2, h * 0.85);
  g.font = `500 ${w * 0.05}px "Helvetica Neue", Arial, sans-serif`;
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fillText(subtitle, w / 2, h * 0.92);
  return canvasTexture(c);
}

/** Radial soft falloff for glows, puddle masks and splashes. */
export function radialAlphaTexture(power = 2, size = 128): THREE.Texture {
  const key = `radial:${power}:${size}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / (size - 1)) * 2 - 1;
      const dy = (y / (size - 1)) * 2 - 1;
      const a = Math.pow(clamp(1 - Math.hypot(dx, dy)), power);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a * 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
}

/** Elongated streak used for rain drops. */
export function rainDropTexture(size = 64): THREE.Texture {
  const key = `raindrop:${size}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = ((x + 0.5) / size) * 2 - 1;
      const dy = ((y + 0.5) / size) * 2 - 1;
      const r = Math.hypot(dx * 3.2, dy * 0.85);
      const a = Math.pow(clamp(1 - r), 1.6) * (0.55 + 0.45 * clamp(1 - Math.abs(dy)));
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = a * 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
}

export function disposeTextureCaches() {
  for (const m of surfaceCache.values()) {
    m.map.dispose();
    m.normalMap.dispose();
    m.ormMap.dispose();
    m.emissiveMap?.dispose();
  }
  surfaceCache.clear();
  for (const t of texCache.values()) t.dispose();
  texCache.clear();
}

export { Rng };
