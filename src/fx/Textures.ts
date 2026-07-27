import * as THREE from 'three';
import { TextureBaker } from '../procgen/TextureBaker';
import { FX_TEXTURE_FRAGMENT, TEX_KIND } from './shaders/TextureShader';

export interface AtlasInfo {
  texture: THREE.Texture;
  cols: number;
  rows: number;
}

/**
 * Index of every cell in the glow atlas. All additive shapes share one texture
 * so muzzle flashes, shock rings, embers and lens streaks all draw in a single
 * batch.
 */
export const GLOW = {
  SOFT: 0,
  STAR_A: 1,
  STAR_B: 2,
  STAR_C: 3,
  STAR_D: 4,
  STAR_E: 5,
  GAS_CONE: 6,
  HOT_CORE: 7,
  SHOCK_RING: 8,
  LENS_STREAK: 9,
  EMBER: 10,
  SPLASH: 11,
  HAZE: 12,
  RIPPLE_RING: 13,
  SMOKE_RING: 14,
  BURST_STAR: 15,
} as const;

/** Index of every cell in the decal atlas. */
export const DECAL_CELL = {
  CONCRETE_A: 0,
  CONCRETE_B: 1,
  BRICK: 2,
  PLASTER: 3,
  METAL_A: 4,
  METAL_B: 5,
  WOOD_A: 6,
  WOOD_B: 7,
  GLASS_A: 8,
  GLASS_B: 9,
  DIVOT_DIRT: 10,
  DIVOT_GRAVEL: 11,
  BLOOD_A: 12,
  BLOOD_B: 13,
  BLOOD_POOL: 14,
  CRATER: 15,
} as const;

/** Index of every cell in the debris-chip atlas. */
export const CHIP = {
  CHIP: 0,
  LEAF: 1,
  GLASS: 2,
  DROPLET: 3,
} as const;

/** Index of every cell in the blood atlas. */
export const BLOOD = {
  DROP: 0,
  MIST: 1,
  STRAND: 2,
  GOUT: 3,
} as const;

const MODE_SINGLE = 0;
const MODE_SEQUENCE = 1;
const MODE_FLIPBOOK = 2;
const MODE_VARIANTS = 3;

/**
 * Bakes the whole FX sprite library on the GPU at boot.
 *
 * Every bake reuses one fragment program, so the twenty-odd textures cost a
 * single shader link plus twenty full-screen quads at 256-1024 px — a couple of
 * milliseconds of real GPU work.
 */
export class FXTextures {
  private baker: TextureBaker | null = null;

  glow!: AtlasInfo;
  smokeFlip!: AtlasInfo;
  fireFlip!: AtlasInfo;
  fireballFlip!: AtlasInfo;
  puff!: AtlasInfo;
  chip!: AtlasInfo;
  blood!: AtlasInfo;
  decal!: AtlasInfo;
  spark!: THREE.Texture;

  private bytes = 0;

  bake(renderer: THREE.WebGLRenderer, resolution: number, anisotropy: number): void {
    const baker = new TextureBaker(renderer, anisotropy);
    this.baker = baker;

    // Sprite detail lives in the low frequencies, so half the material texture
    // budget is plenty and keeps the whole library inside a couple of MB.
    const big = Math.max(256, Math.min(1024, resolution));
    const mid = Math.max(128, big >> 1);

    this.glow = this.atlas(baker, 'fx:glow', TEX_KIND.GLOW_SOFT, MODE_SEQUENCE, 4, 4, big);
    this.decal = this.atlas(baker, 'fx:decal', TEX_KIND.HOLE_CONCRETE_A, MODE_SEQUENCE, 4, 4, big);
    this.smokeFlip = this.atlas(baker, 'fx:smoke', TEX_KIND.SMOKE_FLIP, MODE_FLIPBOOK, 4, 4, big);
    this.fireFlip = this.atlas(baker, 'fx:fire', TEX_KIND.FIRE_FLIP, MODE_FLIPBOOK, 4, 4, big);
    this.fireballFlip = this.atlas(
      baker,
      'fx:fireball',
      TEX_KIND.FIREBALL_FLIP,
      MODE_FLIPBOOK,
      4,
      4,
      big,
    );
    this.puff = this.atlas(baker, 'fx:puff', TEX_KIND.SMOKE_PUFF, MODE_VARIANTS, 2, 2, big);
    this.chip = this.atlas(baker, 'fx:chip', TEX_KIND.CHIP, MODE_SEQUENCE, 2, 2, mid);
    this.blood = this.atlas(baker, 'fx:blood', TEX_KIND.BLOOD_DROP, MODE_SEQUENCE, 2, 2, mid);
    this.spark = this.single(baker, 'fx:spark', TEX_KIND.SPARK_STREAK, mid);
  }

  get textureBytes(): number {
    return this.bytes;
  }

  private single(baker: TextureBaker, name: string, kind: number, size: number): THREE.Texture {
    const texture = baker.bake(
      FX_TEXTURE_FRAGMENT,
      {
        uKind: { value: kind },
        uMode: { value: MODE_SINGLE },
        uGrid: { value: new THREE.Vector2(1, 1) },
        uEdgeFade: { value: 2.5 / size },
      },
      size,
      {
        name,
        wrap: THREE.ClampToEdgeWrapping,
        colorSpace: THREE.NoColorSpace,
        generateMipmaps: true,
      },
    );
    this.bytes += size * size * 4 * 1.34;
    return texture;
  }

  private atlas(
    baker: TextureBaker,
    name: string,
    kind: number,
    mode: number,
    cols: number,
    rows: number,
    size: number,
  ): AtlasInfo {
    const texture = baker.bake(
      FX_TEXTURE_FRAGMENT,
      {
        uKind: { value: kind },
        uMode: { value: mode },
        uGrid: { value: new THREE.Vector2(cols, rows) },
        // Fade over ~2 texels of the cell, enough to stop mip bleed without
        // visibly clipping the sprite.
        uEdgeFade: { value: (2.5 * cols) / size },
      },
      size,
      {
        name,
        wrap: THREE.ClampToEdgeWrapping,
        colorSpace: THREE.NoColorSpace,
        generateMipmaps: true,
      },
    );
    this.bytes += size * size * 4 * 1.34;
    return { texture, cols, rows };
  }

  dispose(): void {
    this.baker?.dispose();
    this.baker = null;
    this.bytes = 0;
  }
}

/** Writes the offset/scale of atlas cell `index` into `out` as (ox, oy, sx, sy). */
export function atlasCell(atlas: AtlasInfo, index: number, out: THREE.Vector4): THREE.Vector4 {
  const total = atlas.cols * atlas.rows;
  const i = ((index % total) + total) % total;
  const col = i % atlas.cols;
  const row = Math.floor(i / atlas.cols);
  return out.set(col / atlas.cols, row / atlas.rows, 1 / atlas.cols, 1 / atlas.rows);
}
