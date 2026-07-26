/**
 * MaterialLibrary.ts — ready-to-use, correctly-tuned THREE materials for the
 * level builder and weapon/prop artists, plus procedural decal materials.
 *
 * Every material is lazily built and cached. Textures come from a shared
 * TextureForge, so repeated requests are free. Real-world scale is expressed by
 * each surface's baked `worldSize` (metres per tile); materials are configured
 * for METRE-based UVs (repeat = 1 / worldSize), i.e. a brick wall unwrapped in
 * world units shows ~2 m of brick per tile automatically.
 */

import * as THREE from 'three';
import { TextureForge, type SurfaceKind, type ForgeOptions } from './TextureForge';
import { fbm2Tile01, ridged2Tile, clamp01, smoothstep } from './noise';

export type DecalKind = 'bullet_hole' | 'bullet_hole_metal' | 'scorch';

interface Tuning {
  normalScale: number;
  aoMapIntensity: number;
  envMapIntensity: number;
  /** Multipliers applied on top of the ORM map values. */
  roughness: number;
  metalness: number;
  physical?: boolean;
}

const DEFAULT_TUNING: Tuning = {
  normalScale: 1,
  aoMapIntensity: 1,
  envMapIntensity: 1,
  roughness: 1,
  metalness: 1,
};

const TUNING: Partial<Record<SurfaceKind, Partial<Tuning>>> = {
  concrete_cast: { normalScale: 1.0, aoMapIntensity: 1.0, envMapIntensity: 0.7 },
  concrete_rough: { normalScale: 1.2, aoMapIntensity: 1.1, envMapIntensity: 0.6 },
  asphalt: { normalScale: 0.9, aoMapIntensity: 0.9, envMapIntensity: 0.5 },
  sand_dune: { normalScale: 0.8, aoMapIntensity: 0.7, envMapIntensity: 0.5 },
  sand_gravel: { normalScale: 1.3, aoMapIntensity: 1.1, envMapIntensity: 0.5 },
  brick_clay: { normalScale: 1.2, aoMapIntensity: 1.1, envMapIntensity: 0.6 },
  plaster_painted: { normalScale: 1.0, aoMapIntensity: 1.0, envMapIntensity: 0.7 },
  metal_painted: { normalScale: 0.9, aoMapIntensity: 0.8, envMapIntensity: 1.1 },
  metal_rusted: { normalScale: 1.2, aoMapIntensity: 1.0, envMapIntensity: 0.9 },
  metal_brushed: { normalScale: 0.6, aoMapIntensity: 0.5, envMapIntensity: 1.3 },
  gun_metal: { normalScale: 0.7, aoMapIntensity: 0.6, envMapIntensity: 1.25 },
  gun_polymer: { normalScale: 0.9, aoMapIntensity: 0.7, envMapIntensity: 1.0 },
  wood_plank: { normalScale: 1.0, aoMapIntensity: 0.9, envMapIntensity: 0.6 },
  fabric_camo: { normalScale: 0.7, aoMapIntensity: 0.5, envMapIntensity: 0.4 },
  tile_ceramic: { normalScale: 1.1, aoMapIntensity: 1.0, envMapIntensity: 1.2 },
  dirt_ground: { normalScale: 1.1, aoMapIntensity: 1.0, envMapIntensity: 0.5 },
  corrugated_metal: { normalScale: 1.3, aoMapIntensity: 0.9, envMapIntensity: 1.0 },
  sandbag: { normalScale: 1.1, aoMapIntensity: 0.9, envMapIntensity: 0.4 },
  glass_dirty: { normalScale: 0.6, aoMapIntensity: 0.3, envMapIntensity: 1.3, physical: true },
  rubble: { normalScale: 1.3, aoMapIntensity: 1.1, envMapIntensity: 0.6 },
};

/** Semantic aliases so the level builder can ask for intent, not surface names. */
const ALIASES: Record<string, SurfaceKind> = {
  wall_concrete: 'concrete_cast',
  wall_concrete_old: 'concrete_rough',
  wall_brick: 'brick_clay',
  wall_plaster: 'plaster_painted',
  road: 'asphalt',
  ground_sand: 'sand_dune',
  ground_gravel: 'sand_gravel',
  ground_dirt: 'dirt_ground',
  floor_tile: 'tile_ceramic',
  roof_metal: 'corrugated_metal',
  crate_wood: 'wood_plank',
  barrier_sandbag: 'sandbag',
  window: 'glass_dirty',
  debris: 'rubble',
};

export interface MaterialLibraryOptions {
  /** Base texture resolution for library materials. */
  size?: number;
  seed?: number;
  /** Optional shared environment map applied to all materials. */
  envMap?: THREE.Texture | null;
}

export class MaterialLibrary {
  readonly forge: TextureForge;
  private size: number;
  private seed: number;
  private envMap: THREE.Texture | null;
  private maxAniso: number;
  private cache = new Map<string, THREE.Material>();
  private decals = new Map<DecalKind, THREE.Material>();
  private decalTextures: THREE.Texture[] = [];

  constructor(renderer: THREE.WebGLRenderer, opts: MaterialLibraryOptions = {}) {
    this.forge = new TextureForge(renderer);
    this.size = opts.size ?? 1024;
    this.seed = opts.seed ?? 1;
    this.envMap = opts.envMap ?? null;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
  }

  /** Resolve either a SurfaceKind or a semantic alias to a SurfaceKind. */
  private resolve(name: SurfaceKind | keyof typeof ALIASES): SurfaceKind {
    return (ALIASES as Record<string, SurfaceKind>)[name as string] ?? (name as SurfaceKind);
  }

  /** A tuned, cached material keyed by surface kind or semantic alias. */
  get(name: SurfaceKind | keyof typeof ALIASES, override?: Partial<ForgeOptions>): THREE.Material {
    const kind = this.resolve(name);
    const seed = override?.seed ?? this.seed;
    const size = override?.size ?? this.size;
    const cacheKey = `${kind}|${size}|${seed}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const tuning = { ...DEFAULT_TUNING, ...(TUNING[kind] ?? {}) };
    const opts: ForgeOptions & { physical?: boolean } = { size, seed, physical: tuning.physical };
    const mat = this.forge.material(kind, opts) as THREE.MeshStandardMaterial;

    // Real-world scale: one tile spans `worldSize` metres → repeat = 1/worldSize
    // for metre-based UVs. Applied to the (kind-unique) shared textures once.
    const worldSize = this.forge.worldSizeOf(kind, opts);
    const rep = 1 / worldSize;
    for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.aoMap, mat.metalnessMap]) {
      if (t) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep, rep);
        t.needsUpdate = true;
      }
    }

    mat.normalScale.set(tuning.normalScale, tuning.normalScale);
    mat.aoMapIntensity = tuning.aoMapIntensity;
    mat.envMapIntensity = tuning.envMapIntensity;
    mat.roughness = tuning.roughness;
    mat.metalness = tuning.metalness;
    if (this.envMap) mat.envMap = this.envMap;
    mat.userData.worldSize = worldSize;

    this.cache.set(cacheKey, mat);
    return mat;
  }

  /** Metres of surface represented by one texture tile for `name`. */
  worldSizeOf(name: SurfaceKind | keyof typeof ALIASES): number {
    return this.forge.worldSizeOf(this.resolve(name), { size: this.size, seed: this.seed });
  }

  /**
   * Transparent decal material (bullet holes, scorch marks). Uses polygonOffset
   * so the decal renders cleanly on top of the surface it is placed on.
   */
  decalMaterial(kind: DecalKind): THREE.Material {
    const cached = this.decals.get(kind);
    if (cached) return cached;

    const { map, normalMap } = this.buildDecalTextures(kind);
    const mat = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(1, 1),
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      roughness: kind === 'scorch' ? 0.95 : 0.8,
      metalness: kind === 'bullet_hole_metal' ? 0.6 : 0,
      side: THREE.DoubleSide,
    });
    mat.name = `decal_${kind}`;
    mat.userData.decal = kind;
    if (this.envMap) mat.envMap = this.envMap;
    this.decals.set(kind, mat);
    return mat;
  }

  /**
   * No-op hint stub: other systems can flag that a material should be rendered
   * with world-space triplanar projection (avoids UV stretching on procedural
   * geometry). Records the intent in userData; actual triplanar shading is the
   * consumer's responsibility.
   */
  applyTriplanarHint(mat: THREE.Material, scale = 1): THREE.Material {
    mat.userData.triplanar = true;
    mat.userData.triplanarScale = scale;
    return mat;
  }

  get stats(): { textures: number; bytes: number; generatedMs: number } {
    return this.forge.stats;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    for (const m of this.decals.values()) m.dispose();
    for (const t of this.decalTextures) t.dispose();
    this.cache.clear();
    this.decals.clear();
    this.decalTextures.length = 0;
    this.forge.dispose();
  }

  // -------------------------------------------------------------------------
  // Decal texture generation (small, procedural, with alpha coverage)
  // -------------------------------------------------------------------------

  private buildDecalTextures(kind: DecalKind): { map: THREE.Texture; normalMap: THREE.Texture } {
    const size = 256;
    const rgba = new Uint8Array(size * size * 4);
    const height = new Float32Array(size * size);
    const seed = kind === 'scorch' ? 91 : kind === 'bullet_hole_metal' ? 71 : 51;

    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size;
        const i = y * size + x;
        const dx = u - 0.5;
        const dy = v - 0.5;
        const r = Math.hypot(dx, dy) * 2; // 0 at centre, 1 at edge-mid

        let alpha = 0;
        let cr = 0;
        let cg = 0;
        let cb = 0;
        let h = 0.5;

        if (kind === 'scorch') {
          const n = fbm2Tile01(u, v, 4, 5, 2, 0.55, seed);
          const soot = smoothstep(0.85, 0.15, r) * (0.6 + 0.4 * n);
          alpha = clamp01(soot);
          const c = 0.02 + n * 0.02;
          cr = c * 1.0;
          cg = c * 0.9;
          cb = c * 0.85;
          h = 0.5;
        } else {
          // bullet hole: dark crater + radial cracks + raised rim
          const crack = ridged2Tile(u, v, 6, 4, 2, 0.5, seed);
          const radialCrack = smoothstep(0.62, 0.9, crack) * smoothstep(0.6, 0.2, r);
          const crater = smoothstep(0.16, 0.02, r);
          const rim = smoothstep(0.22, 0.16, r) * smoothstep(0.1, 0.16, r);
          const dust = smoothstep(0.75, 0.2, r) * (0.4 + 0.6 * fbm2Tile01(u, v, 8, 4, 2, 0.5, seed + 2));
          alpha = clamp01(crater + radialCrack * 0.9 + rim * 0.5 + dust * 0.5);
          if (kind === 'bullet_hole_metal') {
            // brighter torn metal rim
            const metal = rim * 0.8;
            cr = 0.02 + metal * 0.35;
            cg = 0.02 + metal * 0.36;
            cb = 0.02 + metal * 0.38;
          } else {
            cr = 0.015 + dust * 0.06;
            cg = 0.014 + dust * 0.055;
            cb = 0.012 + dust * 0.05;
          }
          h = 0.5 - crater * 0.5 + rim * 0.25 - radialCrack * 0.2;
        }

        height[i] = h;
        rgba[i * 4] = Math.round(linearToSrgb(cr) * 255);
        rgba[i * 4 + 1] = Math.round(linearToSrgb(cg) * 255);
        rgba[i * 4 + 2] = Math.round(linearToSrgb(cb) * 255);
        rgba[i * 4 + 3] = Math.round(alpha * 255);
      }
    }

    const map = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = this.maxAniso;
    map.name = `decal_${kind}_map`;
    map.needsUpdate = true;

    const normalMap = this.decalNormal(height, size, kind);
    this.decalTextures.push(map, normalMap);
    return { map, normalMap };
  }

  private decalNormal(height: Float32Array, size: number, kind: DecalKind): THREE.Texture {
    const out = new Uint8Array(size * size * 4);
    const scale = size * 0.08;
    const w = (x: number, y: number) => height[((y % size) + size) % size * size + (((x % size) + size) % size)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = w(x - 1, y) - w(x + 1, y);
        const gy = w(x, y - 1) - w(x, y + 1);
        let nx = gx * scale;
        let ny = gy * scale;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        nx *= inv;
        ny *= inv;
        const nz = inv;
        const i = (y * size + x) * 4;
        out[i] = Math.round((nx * 0.5 + 0.5) * 255);
        out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        out[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(out, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.name = `decal_${kind}_normal`;
    tex.needsUpdate = true;
    return tex;
  }
}

function linearToSrgb(c: number): number {
  const x = c < 0 ? 0 : c > 1 ? 1 : c;
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}
