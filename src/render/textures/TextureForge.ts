/**
 * TextureForge.ts — turns procedural field buffers into a correlated PBR texture
 * set of THREE.DataTextures (no canvas / no downloaded art).
 *
 * Pipeline per surface:
 *   generators.generateSurface() -> { albedo(linear), height, roughness,
 *     metalness, ao(baked) }
 *   this forge derives:
 *     - normalMap  : tangent-space, Sobel over the height field (OpenGL +Y)
 *     - aoMap/orm  : horizon-based AO over the height field, combined with the
 *                    baked crevice occlusion, packed as ORM (R=AO,G=Rough,B=Metal)
 *     - map        : linear albedo encoded to sRGB bytes
 *     - displacementMap : the raw height field (R8)
 *
 * All maps are correlated because they share one height/feature field. Every
 * texture tiles seamlessly (periodic noise in generators + wrapped Sobel/AO).
 */

import * as THREE from 'three';
import {
  generateSurface,
  type SurfaceKind,
  type SurfaceBuffers,
} from './generators';
import { fbm2Tile01, clamp01 } from './noise';

export type { SurfaceKind } from './generators';
export { SURFACE_KINDS } from './generators';

export interface PBRTextureSet {
  /** Albedo, SRGBColorSpace. */
  map: THREE.Texture;
  /** Tangent-space normal (OpenGL +Y), NoColorSpace. */
  normalMap: THREE.Texture;
  /** ORM: R=AO, G=Roughness, B=Metalness. Assigned to rough/metal/ao. */
  ormMap: THREE.Texture;
  /** Alias of ormMap (Three reads roughness from G). */
  roughnessMap: THREE.Texture;
  /** Alias of ormMap (Three reads AO from R). */
  aoMap: THREE.Texture;
  /** Alias of ormMap (Three reads metalness from B). */
  metalnessMap: THREE.Texture;
  /** Height field, single channel (R8). */
  displacementMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

export interface ForgeOptions {
  /** Texture resolution; default 1024, clamped to [256, 2048]. */
  size?: number;
  repeat?: [number, number];
  anisotropy?: number;
  seed?: number;
}

interface CacheEntry {
  set: PBRTextureSet;
  worldSize: number;
  normalStrength: number;
  transparent: boolean;
  textures: THREE.Texture[];
  bytes: number;
}

const DEFAULT_SIZE = 1024;

export class TextureForge {
  private renderer: THREE.WebGLRenderer;
  private maxAniso: number;
  private cache = new Map<string, CacheEntry>();
  private extras = new Map<string, THREE.Texture>();
  private _generatedMs = 0;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Cached PBR set for a surface. Repeat calls with identical opts are free. */
  get(kind: SurfaceKind, opts: ForgeOptions = {}): PBRTextureSet {
    const key = kind + '|' + this.optsKey(opts);
    const hit = this.cache.get(key);
    if (hit) return hit.set;
    const entry = this.build(kind, opts);
    this.cache.set(key, entry);
    return entry.set;
  }

  /** Fully-configured MeshStandardMaterial (or MeshPhysicalMaterial). */
  material(
    kind: SurfaceKind,
    opts: ForgeOptions & { physical?: boolean } = {}
  ): THREE.Material {
    const key = kind + '|' + this.optsKey(opts);
    const entry = this.cache.get(key) ?? this.build(kind, opts);
    if (!this.cache.has(key)) this.cache.set(key, entry);
    const set = entry.set;

    const common: THREE.MeshStandardMaterialParameters = {
      map: set.map,
      normalMap: set.normalMap,
      normalScale: new THREE.Vector2(entry.normalStrength, entry.normalStrength),
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      aoMap: set.aoMap,
      roughness: 1,
      metalness: 1,
      aoMapIntensity: 1,
      envMapIntensity: 1,
      dithering: true,
    };

    let mat: THREE.MeshStandardMaterial;
    if (opts.physical || entry.transparent) {
      const phys = new THREE.MeshPhysicalMaterial(common);
      if (entry.transparent) {
        phys.transmission = 0.92;
        phys.thickness = 0.02;
        phys.ior = 1.5;
        phys.transparent = true;
        phys.metalness = 0;
      }
      mat = phys;
    } else {
      mat = new THREE.MeshStandardMaterial(common);
    }

    mat.name = `mat_${kind}`;
    mat.userData.surface = kind;
    return mat;
  }

  /**
   * High-frequency tangent-space detail normal (RepeatWrapping, tileable) used
   * to break up tiling up close. Multiply/overlay in a shader or assign as a
   * second normal contribution.
   */
  detailNormal(size = 512, seed = 1337): THREE.Texture {
    const key = `detailNormal|${size}|${seed}`;
    const cached = this.extras.get(key);
    if (cached) return cached;
    const n = size * size;
    const height = new Float32Array(n);
    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size;
        height[y * size + x] =
          fbm2Tile01(u, v, 64, 4, 2, 0.5, seed) * 0.6 + fbm2Tile01(u, v, 160, 2, 2, 0.5, seed + 5) * 0.4;
      }
    }
    const data = this.heightToNormalBytes(height, size, 0.6);
    const tex = this.makeTexture(data, size, 4, THREE.NoColorSpace, `detailNormal`);
    this.extras.set(key, tex);
    return tex;
  }

  /**
   * Large-scale luminance variation map (low frequency) for the shader to
   * multiply into albedo at distance, hiding tile repetition.
   */
  macroVariation(size = 256, seed = 4242): THREE.Texture {
    const key = `macroVariation|${size}|${seed}`;
    const cached = this.extras.get(key);
    if (cached) return cached;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size;
        const m =
          fbm2Tile01(u, v, 2, 4, 2, 0.5, seed) * 0.7 + fbm2Tile01(u, v, 5, 3, 2, 0.5, seed + 3) * 0.3;
        const g = Math.round(clamp01(0.45 + (m - 0.5) * 0.9) * 255);
        const i = (y * size + x) * 4;
        data[i] = g;
        data[i + 1] = g;
        data[i + 2] = g;
        data[i + 3] = 255;
      }
    }
    const tex = this.makeTexture(data, size, 4, THREE.NoColorSpace, `macroVariation`);
    this.extras.set(key, tex);
    return tex;
  }

  get stats(): { textures: number; bytes: number; generatedMs: number } {
    let textures = 0;
    let bytes = 0;
    for (const e of this.cache.values()) {
      textures += e.textures.length;
      bytes += e.bytes;
    }
    for (const t of this.extras.values()) {
      textures += 1;
      const img = t.image as { width: number; height: number };
      bytes += img.width * img.height * 4;
    }
    return {
      textures,
      bytes,
      generatedMs: Math.round(this._generatedMs * 100) / 100,
    };
  }

  dispose(): void {
    for (const e of this.cache.values()) for (const t of e.textures) t.dispose();
    for (const t of this.extras.values()) t.dispose();
    this.cache.clear();
    this.extras.clear();
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  private optsKey(opts: ForgeOptions & { physical?: boolean }): string {
    const size = this.clampSize(opts.size ?? DEFAULT_SIZE);
    return JSON.stringify({
      size,
      seed: opts.seed ?? 0,
      repeat: opts.repeat ?? null,
      aniso: opts.anisotropy ?? null,
      physical: (opts as { physical?: boolean }).physical ?? false,
    });
  }

  private clampSize(s: number): number {
    return Math.max(256, Math.min(2048, Math.round(s)));
  }

  private build(kind: SurfaceKind, opts: ForgeOptions): CacheEntry {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const size = this.clampSize(opts.size ?? DEFAULT_SIZE);
    const seed = (opts.seed ?? 0) | 0;
    const aniso = Math.min(this.maxAniso, opts.anisotropy ?? this.maxAniso);

    const b = generateSurface(kind, size, seed);

    // --- albedo (linear -> sRGB bytes via LUT, avoids per-pixel pow) ---
    const albedoBytes = new Uint8ClampedArray(size * size * 4);
    const lut = SRGB_LUT;
    const lutMax = SRGB_LUT_SIZE - 1;
    for (let i = 0; i < size * size; i++) {
      const j = i * 3;
      let r = b.albedo[j];
      let g = b.albedo[j + 1];
      let bl = b.albedo[j + 2];
      r = r < 0 ? 0 : r > 1 ? 1 : r;
      g = g < 0 ? 0 : g > 1 ? 1 : g;
      bl = bl < 0 ? 0 : bl > 1 ? 1 : bl;
      albedoBytes[i * 4] = lut[(r * lutMax) | 0];
      albedoBytes[i * 4 + 1] = lut[(g * lutMax) | 0];
      albedoBytes[i * 4 + 2] = lut[(bl * lutMax) | 0];
      albedoBytes[i * 4 + 3] = 255;
    }

    // --- normal from height ---
    const normalBytes = this.heightToNormalBytes(b.height, size, b.normalStrength);

    // --- horizon AO + ORM packing ---
    const ao = this.horizonAO(b.height, size, b.normalStrength, b.aoStrength);
    const ormBytes = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const combinedAO = clamp01(ao[i] * b.ao[i]);
      ormBytes[i * 4] = Math.round(combinedAO * 255);
      ormBytes[i * 4 + 1] = Math.round(clamp01(b.roughness[i]) * 255);
      ormBytes[i * 4 + 2] = Math.round(clamp01(b.metalness[i]) * 255);
      ormBytes[i * 4 + 3] = 255;
    }

    // --- displacement (R8) ---
    const dispBytes = new Uint8Array(size * size);
    for (let i = 0; i < size * size; i++) dispBytes[i] = Math.round(clamp01(b.height[i]) * 255);

    const repeat = opts.repeat;
    const map = this.makeTexture(albedoBytes, size, 4, THREE.SRGBColorSpace, `${kind}_albedo`, aniso, repeat);
    const normalMap = this.makeTexture(normalBytes, size, 4, THREE.NoColorSpace, `${kind}_normal`, aniso, repeat);
    const ormMap = this.makeTexture(ormBytes, size, 4, THREE.NoColorSpace, `${kind}_orm`, aniso, repeat);
    const displacementMap = this.makeRedTexture(dispBytes, size, `${kind}_disp`, aniso, repeat);

    const textures = [map, normalMap, ormMap, displacementMap];
    for (const t of textures) {
      t.userData.surface = kind;
    }
    const bytes = size * size * (4 + 4 + 4 + 1);

    const set: PBRTextureSet = {
      map,
      normalMap,
      ormMap,
      roughnessMap: ormMap,
      aoMap: ormMap,
      metalnessMap: ormMap,
      displacementMap,
    };

    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._generatedMs += t1 - t0;

    return {
      set,
      worldSize: b.worldSize,
      normalStrength: normalStrengthToScale(b),
      transparent: !!b.transparent,
      textures,
      bytes,
    };
  }

  /** Metres of surface represented by one tile of `kind` (drives repeat). */
  worldSizeOf(kind: SurfaceKind, opts: ForgeOptions = {}): number {
    const key = kind + '|' + this.optsKey(opts);
    const entry = this.cache.get(key) ?? this.build(kind, opts);
    if (!this.cache.has(key)) this.cache.set(key, entry);
    return entry.worldSize;
  }

  // -------------------------------------------------------------------------
  // Height -> normal (Sobel, wrapped for tiling)
  // -------------------------------------------------------------------------

  private heightToNormalBytes(height: Float32Array, size: number, strength: number): Uint8ClampedArray {
    const out = new Uint8ClampedArray(size * size * 4);
    const scale = strength * size * 0.06;
    for (let y = 0; y < size; y++) {
      const yn = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xn = (x - 1 + size) % size;
        const xp = (x + 1) % size;
        const h00 = height[yn * size + xn];
        const h10 = height[yn * size + x];
        const h20 = height[yn * size + xp];
        const h01 = height[y * size + xn];
        const h21 = height[y * size + xp];
        const h02 = height[yp * size + xn];
        const h12 = height[yp * size + x];
        const h22 = height[yp * size + xp];
        // Sobel gradients
        const gx = h00 + 2 * h01 + h02 - (h20 + 2 * h21 + h22);
        const gy = h00 + 2 * h10 + h20 - (h02 + 2 * h12 + h22);
        let nx = gx * scale;
        let ny = gy * scale;
        let nz = 1;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        nx *= inv;
        ny *= inv;
        nz *= inv;
        const i = (y * size + x) * 4;
        out[i] = Math.round((nx * 0.5 + 0.5) * 255);
        out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        out[i + 3] = 255;
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Horizon-based AO over the height field (half-res, bilinear upsample)
  // -------------------------------------------------------------------------

  private horizonAO(
    height: Float32Array,
    size: number,
    normalStrength: number,
    aoStrength: number
  ): Float32Array {
    // Quarter-res AO: occlusion is low-frequency, so this is visually identical
    // to full-res but ~16x cheaper.
    const lo = Math.max(96, size >> 2);
    const hs = new Float32Array(lo * lo);
    const ratio = size / lo;
    for (let y = 0; y < lo; y++) {
      const sy = Math.min(size - 1, (y * ratio) | 0);
      for (let x = 0; x < lo; x++) {
        const sx = Math.min(size - 1, (x * ratio) | 0);
        hs[y * lo + x] = height[sy * size + sx];
      }
    }

    const DIRS = 8;
    const STEPS = 6;
    const radius = Math.max(3, (lo * 0.06) | 0);
    const relief = 0.11 * normalStrength;
    // Precompute integer sample offsets and horizontal distances (in tile units).
    const offX = new Int32Array(DIRS * STEPS);
    const offY = new Int32Array(DIRS * STEPS);
    const invDist = new Float32Array(DIRS * STEPS);
    for (let d = 0; d < DIRS; d++) {
      const a = (d / DIRS) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let s = 1; s <= STEPS; s++) {
        const dist = (s / STEPS) * radius;
        const k = d * STEPS + (s - 1);
        offX[k] = Math.round(ca * dist);
        offY[k] = Math.round(sa * dist);
        invDist[k] = 1 / (dist / lo);
      }
    }

    const aoLo = new Float32Array(lo * lo);
    for (let y = 0; y < lo; y++) {
      for (let x = 0; x < lo; x++) {
        const h0 = hs[y * lo + x];
        let occ = 0;
        for (let d = 0; d < DIRS; d++) {
          let maxSlope = 0;
          const base = d * STEPS;
          for (let s = 0; s < STEPS; s++) {
            const k = base + s;
            const wx = (x + offX[k] + lo * 4) % lo;
            const wy = (y + offY[k] + lo * 4) % lo;
            const slope = (hs[wy * lo + wx] - h0) * relief * invDist[k];
            if (slope > maxSlope) maxSlope = slope;
          }
          occ += maxSlope / Math.sqrt(1 + maxSlope * maxSlope); // sin(atan(slope))
        }
        const ao = 1 - (occ / DIRS) * aoStrength;
        aoLo[y * lo + x] = ao < 0 ? 0 : ao;
      }
    }

    // Bilinear upsample to full res
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * lo - 0.5;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const y0w = ((y0 % lo) + lo) % lo;
      const y1w = ((y0 + 1) % lo + lo) % lo;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * lo - 0.5;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const x0w = ((x0 % lo) + lo) % lo;
        const x1w = ((x0 + 1) % lo + lo) % lo;
        const a = aoLo[y0w * lo + x0w];
        const bb = aoLo[y0w * lo + x1w];
        const c = aoLo[y1w * lo + x0w];
        const dd = aoLo[y1w * lo + x1w];
        const top = a + (bb - a) * tx;
        const bot = c + (dd - c) * tx;
        let v = top + (bot - top) * ty;
        // gentle contrast
        v = v * v * (3 - 2 * v);
        out[y * size + x] = v;
      }
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Texture construction
  // -------------------------------------------------------------------------

  private makeTexture(
    data: Uint8ClampedArray | Uint8Array,
    size: number,
    _channels: number,
    colorSpace: THREE.ColorSpace,
    name: string,
    aniso = 1,
    repeat?: [number, number]
  ): THREE.Texture {
    const buf = data instanceof Uint8ClampedArray ? new Uint8Array(data.buffer) : data;
    const tex = new THREE.DataTexture(buf, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = colorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = aniso;
    tex.name = name;
    if (repeat) tex.repeat.set(repeat[0], repeat[1]);
    tex.needsUpdate = true;
    return tex;
  }

  private makeRedTexture(
    data: Uint8Array,
    size: number,
    name: string,
    aniso = 1,
    repeat?: [number, number]
  ): THREE.Texture {
    const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = aniso;
    tex.name = name;
    if (repeat) tex.repeat.set(repeat[0], repeat[1]);
    tex.needsUpdate = true;
    return tex;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function linearToSrgb(c: number): number {
  const x = c < 0 ? 0 : c > 1 ? 1 : c;
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

// Precomputed linear→sRGB byte LUT (pure constant) to keep albedo encoding fast.
const SRGB_LUT_SIZE = 4096;
const SRGB_LUT: Uint8ClampedArray = (() => {
  const lut = new Uint8ClampedArray(SRGB_LUT_SIZE);
  for (let i = 0; i < SRGB_LUT_SIZE; i++) {
    lut[i] = Math.round(linearToSrgb(i / (SRGB_LUT_SIZE - 1)) * 255);
  }
  return lut;
})();

/** normalScale to apply on the material — heavier relief ⇒ stronger scale. */
function normalStrengthToScale(b: SurfaceBuffers): number {
  return Math.max(0.4, Math.min(2.0, b.normalStrength * 0.7));
}
