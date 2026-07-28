import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import type { SurfaceKind } from '../core/Events';
import type { IMaterialLibrary, MaterialName, TextureSet } from '../core/Interfaces';
import { TextureBaker, type ResolveParams } from './TextureBaker';
import { DETAIL_SURF } from '../shaders/material/bake.glsl';
import { MASONRY_SHADERS } from '../shaders/material/masonry.glsl';
import { GROUND_SHADERS } from '../shaders/material/ground.glsl';
import { METAL_SHADERS } from '../shaders/material/metal.glsl';
import { WOOD_SHADERS } from '../shaders/material/wood.glsl';
import { SOFT_SHADERS } from '../shaders/material/soft.glsl';
import { MISC_SHADERS } from '../shaders/material/misc.glsl';
import {
  patchSurfaceShader,
  type PatchOptions,
  type MacroOptions,
  type WeatherOptions,
} from './ShaderPatch';

/* ---------------------------- definitions ------------------------------ */

interface MaterialOptions {
  physical?: boolean;
  transparent?: boolean;
  opacity?: number;
  ior?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  anisotropy?: number;
  sheen?: number;
  sheenColor?: number;
  alphaTest?: number;
  side?: THREE.Side;
  normalScale?: number;
  aoMapIntensity?: number;
  envMapIntensity?: number;
  specularIntensity?: number;
  depthWrite?: boolean;
  /** Blend the shared detail normal at this tiling multiple. */
  detail?: number;
  detailStrength?: number;
  /** Animate two scrolling normal layers (water). */
  animated?: boolean;
}

interface MaterialDef {
  glsl: string;
  surface: SurfaceKind;
  /** Metres of world covered by one tile of the texture set. */
  tile: number;
  seed: number;
  /** Bake resolution as a fraction of quality.textureResolution. */
  scale: number;
  /** Emit a height map so the surface can take parallax occlusion mapping. */
  height: boolean;
  /** Parallax amplitude multiplier on top of the physical height scale. */
  pom?: number;
  resolve: ResolveParams;
  mat?: MaterialOptions;
  /**
   * World-space value drift, which is what stops a tiling texture reading as
   * wallpaper. Anything used across a large surface wants this.
   */
  macro?: MacroOptions;
  /**
   * Sun bleaching and splash-back keyed to real height above the pavement.
   * Only for materials that appear on standing walls.
   */
  weather?: WeatherOptions;
  /** Lower bakes earlier; the world needs the low numbers first. */
  priority: number;
}

const SHADERS: Record<string, string> = {
  ...MASONRY_SHADERS,
  ...GROUND_SHADERS,
  ...METAL_SHADERS,
  ...WOOD_SHADERS,
  ...SOFT_SHADERS,
  ...MISC_SHADERS,
};

/**
 * Sun bleaching and splash-back for a standing wall, in real metres above the
 * pavement. This is where the vertical weathering that used to be baked against
 * uv.y now lives. Baked into the tile it repeated every 2.4 m and put a hard
 * step at every tile boundary; here it runs once up the actual building, so a
 * six-metre facade reads as tall instead of as three stacked copies of itself.
 *
 * The ranges are deliberately coarse. The town is not built on a flat plane, so
 * the pavement is not exactly at y = 0 everywhere, and the macro field wobbles
 * the tide line by well over half a metre anyway.
 */
const WALL_WEATHER: WeatherOptions = {
  groundY: 0,
  soilHeight: 1.2,
  soilStrength: 0.32,
  soilTint: [0.66, 0.62, 0.55],
  bleachFrom: 2.5,
  bleachTo: 7.5,
  bleachStrength: 0.55,
  bleachTint: [1.17, 1.15, 1.09],
};

/**
 * Value drift larger than the tile, for a material used across whole facades.
 * The size matters: the point is to beat the tile, so the feature has to be
 * bigger than one. At the tile size or below it just adds another layer of
 * mottling and makes the wall look like camouflage without hiding anything.
 */
const WALL_MACRO: MacroOptions = { strength: 0.09, roughness: 0.05, metres: 8 };
/** Ground runs to much larger continuous areas, so its drift is coarser. */
const GROUND_MACRO: MacroOptions = { strength: 0.11, roughness: 0.04, metres: 13 };

/**
 * Per-material configuration. `resolve` drives the shared resolve pass: how
 * deep the relief is, how strongly cavities occlude, and what shows through
 * when convex detail wears.
 */
const DEFS: Record<MaterialName, MaterialDef> = {
  concrete: {
    glsl: SHADERS.concrete,
    surface: 'concrete',
    tile: 2.4,
    seed: 3,
    scale: 1,
    height: true,
    pom: 1.6,
    priority: 0,
    resolve: {
      heightScale: 0.009,
      ao: 1.1,
      curv: 1.4,
      cavityRough: 0.1,
      cavityGrime: 0.4,
      cavityTint: [0.5, 0.49, 0.47],
      wear: 0.22,
      wearColor: [0.44, 0.43, 0.41],
      wearRough: -0.05,
      roughFloor: 0.35,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.35 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  concrete_painted: {
    glsl: SHADERS.concrete_painted,
    surface: 'concrete',
    tile: 2.4,
    seed: 8,
    scale: 1,
    height: true,
    pom: 1.2,
    priority: 2,
    resolve: {
      heightScale: 0.008,
      ao: 1,
      curv: 1.3,
      cavityRough: 0.14,
      cavityGrime: 0.45,
      cavityTint: [0.45, 0.45, 0.44],
      wear: 0.3,
      wearColor: [0.42, 0.42, 0.40],
      wearRough: 0.12,
      roughFloor: 0.22,
    },
    mat: { normalScale: 0.9, detail: 9, detailStrength: 0.3 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  concrete_damaged: {
    glsl: SHADERS.concrete_damaged,
    surface: 'concrete',
    tile: 2.4,
    seed: 17,
    scale: 1,
    height: true,
    pom: 2.2,
    priority: 3,
    resolve: {
      heightScale: 0.016,
      ao: 1.25,
      curv: 1.3,
      cavityRough: 0.12,
      cavityGrime: 0.45,
      cavityTint: [0.46, 0.44, 0.41],
      wear: 0.28,
      wearColor: [0.5, 0.48, 0.45],
      wearRough: -0.04,
      wearMetal: 0.1,
      roughFloor: 0.35,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.35 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  plaster: {
    glsl: SHADERS.plaster,
    surface: 'plaster',
    tile: 2.4,
    seed: 7,
    scale: 0.5,
    height: false,
    priority: 6,
    resolve: {
      heightScale: 0.008,
      ao: 0.9,
      curv: 1.6,
      cavityRough: 0.1,
      cavityGrime: 0.35,
      cavityTint: [0.5, 0.48, 0.45],
      wear: 0.16,
      wearColor: [0.7, 0.69, 0.66],
      wearRough: -0.06,
      roughFloor: 0.35,
    },
    mat: { normalScale: 1.1, detail: 10, detailStrength: 0.28 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  brick: {
    glsl: SHADERS.brick,
    surface: 'concrete',
    tile: 2.0,
    seed: 5,
    scale: 1,
    height: true,
    pom: 2.4,
    priority: 1,
    resolve: {
      heightScale: 0.012,
      ao: 1.3,
      curv: 1.1,
      cavityRough: 0.1,
      cavityGrime: 0.5,
      cavityTint: [0.44, 0.42, 0.40],
      wear: 0.3,
      wearColor: [0.55, 0.42, 0.35],
      wearRough: -0.05,
      roughFloor: 0.4,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.3 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  stucco_sand: {
    glsl: SHADERS.stucco_sand,
    surface: 'plaster',
    tile: 2.4,
    seed: 11,
    scale: 0.5,
    height: false,
    priority: 7,
    resolve: {
      heightScale: 0.005,
      ao: 1.1,
      curv: 1.5,
      cavityRough: 0.08,
      cavityGrime: 0.4,
      cavityTint: [0.5, 0.47, 0.43],
      wear: 0.2,
      wearColor: [0.68, 0.65, 0.6],
      wearRough: -0.04,
      roughFloor: 0.45,
    },
    mat: { normalScale: 1, detail: 11, detailStrength: 0.32 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  stucco_ochre: {
    glsl: SHADERS.stucco_ochre,
    surface: 'plaster',
    tile: 2.4,
    seed: 61,
    scale: 1,
    height: true,
    pom: 1.8,
    priority: 5,
    resolve: {
      heightScale: 0.008,
      ao: 1.15,
      curv: 1.3,
      cavityRough: 0.1,
      cavityGrime: 0.45,
      cavityTint: [0.48, 0.45, 0.4],
      wear: 0.22,
      wearColor: [0.7, 0.63, 0.5],
      wearRough: -0.04,
      roughFloor: 0.4,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.3 },
    macro: WALL_MACRO,
    weather: WALL_WEATHER,
  },
  asphalt: {
    glsl: SHADERS.asphalt,
    surface: 'concrete',
    tile: 3.2,
    seed: 23,
    scale: 1,
    height: true,
    pom: 1.6,
    priority: 4,
    resolve: {
      heightScale: 0.007,
      ao: 1.2,
      curv: 1.5,
      cavityRough: 0.1,
      cavityGrime: 0.3,
      cavityTint: [0.55, 0.55, 0.55],
      wear: 0.2,
      wearColor: [0.32, 0.31, 0.3],
      wearRough: -0.18,
      roughFloor: 0.2,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.35 },
    macro: GROUND_MACRO,
  },
  sand: {
    glsl: SHADERS.sand,
    surface: 'sand',
    tile: 2.0,
    seed: 29,
    scale: 0.5,
    height: true,
    pom: 1.4,
    priority: 9,
    resolve: {
      heightScale: 0.021,
      ao: 1,
      curv: 1.2,
      cavityRough: 0.05,
      // Sand troughs do not collect grime the way a crack in concrete does, and a
      // curvature darkening here just draws a line down every ripple.
      cavityGrime: 0.1,
      cavityTint: [0.6, 0.56, 0.5],
      wear: 0.1,
      wearColor: [0.75, 0.7, 0.6],
      wearRough: 0,
      roughFloor: 0.55,
    },
    mat: { normalScale: 1.05, detail: 12, detailStrength: 0.4 },
    macro: GROUND_MACRO,
  },
  gravel: {
    glsl: SHADERS.gravel,
    surface: 'dirt',
    tile: 1.6,
    seed: 31,
    scale: 1,
    height: true,
    pom: 2.6,
    priority: 8,
    resolve: {
      heightScale: 0.026,
      ao: 1.5,
      curv: 0.9,
      cavityRough: 0.12,
      cavityGrime: 0.5,
      cavityTint: [0.5, 0.48, 0.44],
      wear: 0.16,
      wearColor: [0.6, 0.58, 0.55],
      wearRough: -0.12,
      roughFloor: 0.3,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.35 },
    macro: GROUND_MACRO,
  },
  dirt: {
    glsl: SHADERS.dirt,
    surface: 'dirt',
    tile: 2.4,
    seed: 37,
    scale: 1,
    height: true,
    pom: 2,
    priority: 10,
    resolve: {
      heightScale: 0.014,
      ao: 1.3,
      curv: 1.1,
      cavityRough: 0.08,
      cavityGrime: 0.4,
      cavityTint: [0.5, 0.45, 0.4],
      wear: 0.18,
      wearColor: [0.45, 0.38, 0.3],
      wearRough: -0.05,
      roughFloor: 0.45,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.4 },
    macro: GROUND_MACRO,
  },
  rubble: {
    glsl: SHADERS.rubble,
    surface: 'concrete',
    tile: 2.0,
    seed: 41,
    scale: 1,
    height: true,
    pom: 2.8,
    priority: 11,
    resolve: {
      // Fragments sit at their own levels across most of this range, and at 30 mm
      // the steps between neighbours were too shallow to read as a pile rather
      // than as a cracked slab.
      heightScale: 0.045,
      ao: 1.6,
      curv: 0.9,
      cavityRough: 0.1,
      cavityGrime: 0.5,
      cavityTint: [0.52, 0.5, 0.47],
      wear: 0.3,
      wearColor: [0.62, 0.6, 0.57],
      wearRough: -0.08,
      roughFloor: 0.4,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.35 },
    macro: GROUND_MACRO,
  },
  metal_painted: {
    glsl: SHADERS.metal_painted,
    surface: 'metal',
    tile: 1.6,
    seed: 43,
    scale: 1,
    height: false,
    priority: 12,
    resolve: {
      heightScale: 0.003,
      ao: 0.9,
      curv: 1.8,
      cavityRough: 0.14,
      cavityGrime: 0.4,
      cavityTint: [0.5, 0.47, 0.44],
      wear: 0.45,
      wearColor: [0.62, 0.63, 0.65],
      wearRough: -0.22,
      wearMetal: 0.7,
      roughFloor: 0.14,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.25, envMapIntensity: 1.1 },
    macro: { strength: 0.08, roughness: 0.04, metres: 4 },
  },
  metal_rusted: {
    glsl: SHADERS.metal_rusted,
    surface: 'metal',
    tile: 1.6,
    seed: 47,
    scale: 1,
    height: true,
    pom: 1.8,
    priority: 13,
    resolve: {
      heightScale: 0.006,
      ao: 1.3,
      curv: 1.5,
      cavityRough: 0.1,
      cavityGrime: 0.45,
      cavityTint: [0.45, 0.38, 0.32],
      wear: 0.3,
      wearColor: [0.5, 0.34, 0.2],
      wearRough: -0.1,
      wearMetal: 0.2,
      roughFloor: 0.2,
    },
    mat: { normalScale: 1.1, detail: 9, detailStrength: 0.3, envMapIntensity: 1 },
    macro: { strength: 0.1, roughness: 0.05, metres: 4 },
  },
  metal_corrugated: {
    glsl: SHADERS.metal_corrugated,
    surface: 'metal',
    tile: 2.4,
    seed: 53,
    scale: 1,
    height: true,
    pom: 1.2,
    priority: 14,
    resolve: {
      heightScale: 0.022,
      ao: 1.1,
      curv: 1.2,
      cavityRough: 0.16,
      cavityGrime: 0.5,
      cavityTint: [0.48, 0.42, 0.36],
      wear: 0.35,
      wearColor: [0.66, 0.67, 0.68],
      wearRough: -0.16,
      wearMetal: 0.35,
      roughFloor: 0.16,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.22, envMapIntensity: 1.1 },
    macro: { strength: 0.09, roughness: 0.05, metres: 5 },
  },
  metal_brushed: {
    glsl: SHADERS.metal_brushed,
    surface: 'metal',
    tile: 0.8,
    seed: 59,
    scale: 0.5,
    height: false,
    priority: 18,
    resolve: {
      heightScale: 0.0009,
      normalBoost: 1.4,
      ao: 0.5,
      curv: 2.5,
      cavityRough: 0.05,
      cavityGrime: 0.15,
      cavityTint: [0.6, 0.6, 0.6],
      wear: 0.2,
      wearColor: [0.78, 0.78, 0.79],
      wearRough: -0.06,
      wearMetal: 0.1,
      roughFloor: 0.22,
    },
    mat: {
      physical: true,
      anisotropy: 0.55,
      normalScale: 1,
      detail: 6,
      detailStrength: 0.15,
      envMapIntensity: 1.2,
      aoMapIntensity: 0.6,
    },
  },
  steel_plate: {
    glsl: SHADERS.steel_plate,
    surface: 'metal',
    tile: 1.2,
    seed: 67,
    scale: 1,
    height: true,
    pom: 1.6,
    priority: 15,
    resolve: {
      heightScale: 0.011,
      ao: 1.2,
      curv: 1.3,
      cavityRough: 0.14,
      cavityGrime: 0.45,
      cavityTint: [0.45, 0.44, 0.42],
      wear: 0.4,
      wearColor: [0.7, 0.71, 0.72],
      wearRough: -0.2,
      wearMetal: 0.4,
      roughFloor: 0.12,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.25, envMapIntensity: 1.1 },
  },
  wood_planks: {
    glsl: SHADERS.wood_planks,
    surface: 'wood',
    tile: 2.4,
    seed: 71,
    scale: 1,
    height: true,
    pom: 2,
    priority: 16,
    resolve: {
      heightScale: 0.009,
      ao: 1.2,
      curv: 1.3,
      cavityRough: 0.12,
      cavityGrime: 0.5,
      cavityTint: [0.42, 0.35, 0.28],
      wear: 0.25,
      wearColor: [0.6, 0.5, 0.38],
      wearRough: -0.12,
      roughFloor: 0.3,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.3 },
    macro: { strength: 0.09, roughness: 0.04, metres: 4 },
  },
  wood_crate: {
    glsl: SHADERS.wood_crate,
    surface: 'wood',
    tile: 1.2,
    seed: 73,
    scale: 0.5,
    height: true,
    pom: 1.6,
    priority: 19,
    resolve: {
      heightScale: 0.008,
      ao: 1.2,
      curv: 1.3,
      cavityRough: 0.12,
      cavityGrime: 0.45,
      cavityTint: [0.48, 0.4, 0.3],
      wear: 0.28,
      wearColor: [0.68, 0.58, 0.44],
      wearRough: -0.1,
      roughFloor: 0.32,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.3 },
  },
  wood_door: {
    glsl: SHADERS.wood_door,
    surface: 'wood',
    tile: 1.0,
    seed: 79,
    scale: 0.5,
    height: false,
    priority: 20,
    resolve: {
      // A panel is recessed the best part of a centimetre behind its stiles, and
      // at 4 mm of total range the whole stile-and-rail structure disappeared.
      heightScale: 0.012,
      ao: 1,
      // Curvature and wear both had to come down when the height range tripled:
      // the bead is a sharp ridge, so the edge-wear lightening tripled with it
      // and stripped the mouldings back to bare timber on its own.
      curv: 1.1,
      cavityRough: 0.12,
      cavityGrime: 0.45,
      cavityTint: [0.45, 0.4, 0.34],
      wear: 0.2,
      wearColor: [0.55, 0.45, 0.33],
      wearRough: 0.1,
      roughFloor: 0.2,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.28 },
  },
  fabric_canvas: {
    glsl: SHADERS.fabric_canvas,
    surface: 'fabric',
    tile: 0.9,
    seed: 83,
    scale: 0.5,
    height: false,
    priority: 21,
    resolve: {
      heightScale: 0.006,
      normalBoost: 1.2,
      ao: 1.1,
      curv: 1.4,
      cavityRough: 0.06,
      cavityGrime: 0.4,
      cavityTint: [0.5, 0.48, 0.42],
      wear: 0.12,
      wearColor: [0.5, 0.48, 0.4],
      wearRough: -0.04,
      roughFloor: 0.6,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.3, envMapIntensity: 0.7 },
  },
  fabric_carpet: {
    glsl: SHADERS.fabric_carpet,
    surface: 'fabric',
    tile: 1.6,
    seed: 89,
    scale: 0.5,
    height: false,
    priority: 22,
    resolve: {
      heightScale: 0.008,
      normalBoost: 1.1,
      ao: 1.4,
      curv: 1.2,
      cavityRough: 0.05,
      cavityGrime: 0.45,
      cavityTint: [0.45, 0.42, 0.38],
      wear: 0.14,
      wearColor: [0.42, 0.38, 0.34],
      wearRough: -0.05,
      roughFloor: 0.6,
    },
    mat: { normalScale: 1, detail: 9, detailStrength: 0.35, envMapIntensity: 0.6 },
  },
  sandbag: {
    glsl: SHADERS.sandbag,
    surface: 'fabric',
    // Two bags across by three staggered courses, so the tile is a patch of
    // revetment rather than a single bag.
    tile: 1.1,
    seed: 97,
    scale: 0.5,
    height: true,
    pom: 1.2,
    priority: 17,
    resolve: {
      heightScale: 0.035,
      ao: 1.3,
      curv: 1,
      cavityRough: 0.08,
      cavityGrime: 0.5,
      cavityTint: [0.48, 0.44, 0.36],
      wear: 0.16,
      wearColor: [0.58, 0.53, 0.42],
      wearRough: -0.04,
      roughFloor: 0.6,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.3, envMapIntensity: 0.7 },
  },
  glass: {
    glsl: SHADERS.glass,
    surface: 'glass',
    tile: 1.6,
    seed: 101,
    scale: 0.5,
    height: false,
    priority: 23,
    resolve: {
      heightScale: 0.0012,
      ao: 0.35,
      curv: 2,
      cavityRough: 0.03,
      cavityGrime: 0.1,
      cavityTint: [0.7, 0.7, 0.7],
      wear: 0,
      wearRough: 0,
      roughFloor: 0.015,
    },
    mat: {
      physical: true,
      transparent: true,
      opacity: 1,
      ior: 1.52,
      normalScale: 0.7,
      envMapIntensity: 1.4,
      specularIntensity: 1,
      aoMapIntensity: 0.3,
      depthWrite: false,
    },
  },
  glass_broken: {
    glsl: SHADERS.glass_broken,
    surface: 'glass',
    tile: 1.6,
    seed: 103,
    scale: 1,
    height: false,
    priority: 24,
    resolve: {
      heightScale: 0.004,
      ao: 0.6,
      curv: 2.2,
      cavityRough: 0.06,
      cavityGrime: 0.2,
      cavityTint: [0.75, 0.76, 0.78],
      wear: 0.25,
      wearColor: [0.85, 0.88, 0.9],
      wearRough: -0.02,
      roughFloor: 0.02,
    },
    mat: {
      physical: true,
      transparent: true,
      opacity: 1,
      ior: 1.52,
      normalScale: 1,
      envMapIntensity: 1.4,
      aoMapIntensity: 0.4,
      depthWrite: false,
    },
  },
  rubber: {
    glsl: SHADERS.rubber,
    surface: 'rubber',
    tile: 0.8,
    seed: 107,
    scale: 0.5,
    height: false,
    priority: 25,
    resolve: {
      heightScale: 0.003,
      ao: 0.9,
      curv: 1.6,
      cavityRough: 0.06,
      cavityGrime: 0.3,
      cavityTint: [0.6, 0.6, 0.6],
      wear: 0.2,
      wearColor: [0.16, 0.16, 0.17],
      wearRough: -0.12,
      roughFloor: 0.4,
    },
    mat: { normalScale: 1, detail: 10, detailStrength: 0.3, envMapIntensity: 0.8 },
  },
  plastic: {
    glsl: SHADERS.plastic,
    surface: 'plaster',
    tile: 0.8,
    seed: 109,
    scale: 0.5,
    height: false,
    priority: 26,
    resolve: {
      heightScale: 0.0018,
      ao: 0.7,
      curv: 2,
      cavityRough: 0.08,
      cavityGrime: 0.25,
      cavityTint: [0.55, 0.55, 0.56],
      wear: 0.25,
      wearColor: [0.52, 0.54, 0.56],
      wearRough: -0.15,
      roughFloor: 0.12,
    },
    mat: {
      physical: true,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
      normalScale: 0.9,
      detail: 9,
      detailStrength: 0.25,
      envMapIntensity: 1.1,
    },
  },
  ceramic_tile: {
    glsl: SHADERS.ceramic_tile,
    surface: 'plaster',
    tile: 1.6,
    seed: 113,
    scale: 1,
    height: true,
    pom: 1.4,
    priority: 27,
    resolve: {
      heightScale: 0.0045,
      ao: 1.2,
      curv: 1.4,
      cavityRough: 0.2,
      cavityGrime: 0.5,
      cavityTint: [0.42, 0.4, 0.38],
      wear: 0.2,
      wearColor: [0.72, 0.72, 0.7],
      wearRough: -0.05,
      roughFloor: 0.05,
    },
    mat: {
      physical: true,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      normalScale: 1,
      detail: 10,
      detailStrength: 0.2,
      envMapIntensity: 1.2,
    },
  },
  foliage: {
    glsl: SHADERS.foliage,
    surface: 'foliage',
    tile: 0.7,
    seed: 127,
    scale: 0.5,
    height: false,
    priority: 28,
    resolve: {
      heightScale: 0.008,
      ao: 0.9,
      curv: 1.4,
      cavityRough: 0.06,
      cavityGrime: 0.3,
      cavityTint: [0.55, 0.55, 0.5],
      wear: 0.12,
      wearColor: [0.5, 0.55, 0.3],
      wearRough: -0.06,
      roughFloor: 0.32,
    },
    mat: {
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      normalScale: 0.8,
      sheen: 0.4,
      sheenColor: 0x6f8f3a,
      physical: true,
      envMapIntensity: 0.9,
    },
  },
  bark: {
    glsl: SHADERS.bark,
    surface: 'wood',
    tile: 1.2,
    seed: 131,
    scale: 0.5,
    height: true,
    pom: 2.4,
    priority: 29,
    resolve: {
      heightScale: 0.028,
      ao: 1.5,
      curv: 1,
      cavityRough: 0.08,
      cavityGrime: 0.5,
      cavityTint: [0.42, 0.38, 0.32],
      wear: 0.25,
      wearColor: [0.44, 0.4, 0.34],
      wearRough: -0.06,
      roughFloor: 0.45,
    },
    mat: { normalScale: 1, detail: 8, detailStrength: 0.35 },
  },
  gun_metal: {
    glsl: SHADERS.gun_metal,
    surface: 'metal',
    tile: 0.3,
    // Full resolution: this is a viewmodel surface seen at 200 mm, and at half it
    // had 1.2 mm texels, which cannot carry a machining mark at all.
    seed: 137,
    scale: 1,
    height: false,
    priority: 30,
    resolve: {
      heightScale: 0.0016,
      normalBoost: 1.2,
      ao: 0.7,
      curv: 2.2,
      cavityRough: 0.08,
      cavityGrime: 0.3,
      cavityTint: [0.5, 0.5, 0.52],
      wear: 0.32,
      wearColor: [0.62, 0.63, 0.66],
      wearRough: -0.28,
      wearMetal: 0.3,
      roughFloor: 0.1,
    },
    mat: { normalScale: 1, detail: 6, detailStrength: 0.2, envMapIntensity: 1.2 },
  },
  gun_polymer: {
    glsl: SHADERS.gun_polymer,
    surface: 'rubber',
    tile: 0.3,
    seed: 139,
    scale: 0.5,
    height: false,
    priority: 31,
    resolve: {
      heightScale: 0.0035,
      ao: 0.9,
      curv: 1.8,
      cavityRough: 0.05,
      cavityGrime: 0.25,
      cavityTint: [0.5, 0.5, 0.5],
      wear: 0.3,
      wearColor: [0.2, 0.2, 0.21],
      wearRough: -0.2,
      roughFloor: 0.25,
    },
    mat: { normalScale: 1, detail: 7, detailStrength: 0.25, envMapIntensity: 0.9 },
  },
  water: {
    glsl: SHADERS.water,
    surface: 'water',
    tile: 6.0,
    seed: 149,
    scale: 0.5,
    height: false,
    priority: 32,
    resolve: {
      heightScale: 0.011,
      ao: 0.2,
      curv: 1,
      cavityRough: 0.02,
      cavityGrime: 0.1,
      cavityTint: [0.8, 0.8, 0.8],
      wear: 0,
      roughFloor: 0.02,
    },
    mat: {
      physical: true,
      transparent: true,
      opacity: 0.86,
      ior: 1.33,
      normalScale: 1,
      envMapIntensity: 1.4,
      aoMapIntensity: 0.2,
      animated: true,
      depthWrite: false,
    },
  },
};

const NAMES = Object.keys(DEFS) as MaterialName[];

/* ---------------------------- the system ------------------------------ */

export default class MaterialLibrary implements System, IMaterialLibrary {
  readonly key = 'materials';
  readonly order = 5;

  white!: THREE.Texture;
  flatNormal!: THREE.Texture;
  /** Shared high-frequency normal, tiled far denser than the base maps. */
  detailNormal!: THREE.Texture;

  private ctx!: GameContext;
  private baker!: TextureBaker;
  private sets = new Map<MaterialName, TextureSet>();
  private materials = new Map<MaterialName, THREE.Material>();
  private clones: THREE.Material[] = [];
  private baseResolution = 1024;
  private waveTime = { value: 0 };
  private animated: THREE.Material[] = [];
  private missing?: THREE.MeshStandardMaterial;

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.white = makeSolidTexture(255, 255, 255);
    this.flatNormal = makeSolidTexture(128, 128, 255);

    this.baseResolution = this.pickResolution(ctx);
    this.baker = new TextureBaker(ctx.renderer, ctx.quality.anisotropy);

    const t0 = performance.now();
    this.detailNormal = this.baker.bake({
      glsl: DETAIL_SURF,
      resolution: Math.min(512, this.baseResolution),
      seed: 1,
      height: false,
      params: { heightScale: 0.02, ao: 0, curv: 1 },
    }).normalMap;

    // Bake in priority order so anything the level generator asks for during
    // its own init is already resident. A budget guards against pathological
    // machines: whatever is left over bakes lazily on first use.
    const budget = 20000;
    const order = [...NAMES].sort((a, b) => DEFS[a].priority - DEFS[b].priority);
    let done = 0;
    for (const name of order) {
      if (performance.now() - t0 > budget) {
        console.warn(`[materials] bake budget reached; ${order.length - done} left for lazy bake`);
        break;
      }
      this.ensure(name);
      done++;
      ctx.events.emit('loading:progress', {
        progress: done / order.length,
        label: `materials · ${name}`,
      });
    }

    console.log(
      `[materials] ${done}/${order.length} baked at ${this.baseResolution}px in ` +
        `${Math.round(performance.now() - t0)}ms ` +
        `(${(this.baker.bytesSpent / 1048576).toFixed(0)} MB)`,
    );

    if (new URLSearchParams(location.search).get('showcase') === 'materials') {
      const { installMaterialShowcase } = await import('./MaterialShowcase');
      installMaterialShowcase(ctx, this);
    }
    if (new URLSearchParams(location.search).get('matprobe') === '1') {
      await this.installProbe();
    }
  }

  /**
   * Exposes the measurement harness on the window so a headless run can dump
   * albedo contrast, seam ratios and band energy for every material.
   */
  private async installProbe(): Promise<void> {
    const { MaterialProbe, formatStats } = await import('./MaterialProbe');
    const probe = new MaterialProbe(this.ctx!.renderer);
    (window as unknown as Record<string, unknown>).__MATPROBE__ = {
      measure: (name: MaterialName) =>
        probe.measure(name, this.textures(name), this.tileSize(name)),
      sweep: (names?: MaterialName[]) =>
        (names ?? NAMES).map((n) => probe.measure(n, this.textures(n), this.tileSize(n))),
      raw: (name: MaterialName, key: keyof TextureSet = 'map') => {
        const tex = this.textures(name)[key] as THREE.Texture;
        const res = (tex.image as { width: number }).width;
        return probe.read(tex, res);
      },
      format: formatStats,
    };
    console.log('[materials] probe ready on window.__MATPROBE__');
  }

  private pickResolution(ctx: GameContext): number {
    const override = Number(new URLSearchParams(location.search).get('matres'));
    if (Number.isFinite(override) && override >= 64) return override;

    let res = ctx.quality.textureResolution;
    // Software rasterisers (headless capture) pay for every fragment on the
    // CPU; a full-resolution bake would take a minute. Halve it and keep the
    // art identical.
    const gl = ctx.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '').toLowerCase();
    if (/swiftshader|llvmpipe|softwarerasterizer|mesa offscreen/.test(name)) {
      res = Math.min(res, 512);
    }
    return res;
  }

  /* ----------------------------- baking ------------------------------- */

  private ensure(name: MaterialName): TextureSet {
    const cached = this.sets.get(name);
    if (cached) return cached;

    const def = DEFS[name];
    const res = Math.max(128, Math.round(this.baseResolution * def.scale));
    const baked = this.baker.bake({
      glsl: def.glsl ?? FALLBACK_SURF,
      resolution: res,
      seed: def.seed,
      height: def.height && this.ctx.quality.parallaxSteps > 0,
      params: def.resolve,
    });
    const set: TextureSet = {
      map: baked.map,
      normalMap: baked.normalMap,
      armMap: baked.armMap,
      heightMap: baked.heightMap,
    };
    for (const t of [set.map, set.normalMap, set.armMap, set.heightMap]) {
      if (t) t.name = `${name}:${t === set.map ? 'albedo' : t === set.normalMap ? 'normal' : t === set.armMap ? 'arm' : 'height'}`;
    }
    this.sets.set(name, set);
    return set;
  }

  private build(name: MaterialName): THREE.Material {
    const def = DEFS[name];
    const set = this.ensure(name);
    const o = def.mat ?? {};

    const params: THREE.MeshPhysicalMaterialParameters = {
      map: set.map,
      normalMap: set.normalMap,
      aoMap: set.armMap,
      roughnessMap: set.armMap,
      metalnessMap: set.armMap,
      // The maps carry the variation; the scalars must not flatten it.
      color: 0xffffff,
      roughness: 1,
      metalness: 1,
      normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1),
      aoMapIntensity: o.aoMapIntensity ?? 1,
      envMapIntensity: o.envMapIntensity ?? 1,
      dithering: true,
      name,
    };
    if (o.transparent) params.transparent = true;
    if (o.opacity !== undefined) params.opacity = o.opacity;
    if (o.alphaTest !== undefined) params.alphaTest = o.alphaTest;
    if (o.side !== undefined) params.side = o.side;
    if (o.depthWrite !== undefined) params.depthWrite = o.depthWrite;

    let mat: THREE.MeshStandardMaterial;
    if (o.physical) {
      const phys = new THREE.MeshPhysicalMaterial(params);
      if (o.ior !== undefined) phys.ior = o.ior;
      if (o.clearcoat !== undefined) phys.clearcoat = o.clearcoat;
      if (o.clearcoatRoughness !== undefined) phys.clearcoatRoughness = o.clearcoatRoughness;
      if (o.anisotropy !== undefined) phys.anisotropy = o.anisotropy;
      if (o.sheen !== undefined) phys.sheen = o.sheen;
      if (o.sheenColor !== undefined) phys.sheenColor = new THREE.Color(o.sheenColor);
      if (o.specularIntensity !== undefined) phys.specularIntensity = o.specularIntensity;
      mat = phys;
    } else {
      mat = new THREE.MeshStandardMaterial(params);
    }

    this.patch(mat, name);
    return mat;
  }

  /** Applies parallax occlusion mapping, detail normals and uv tiling. */
  private patch(mat: THREE.MeshStandardMaterial, name: MaterialName, tile?: THREE.Vector2): void {
    const def = DEFS[name];
    const o = def.mat ?? {};
    const q = this.ctx.quality;
    const set = this.sets.get(name);
    const opts: PatchOptions = {};

    if (tile) opts.tile = tile;
    if (q.detailNormals && o.detail && this.detailNormal) {
      opts.detailMap = this.detailNormal;
      opts.detailScale = o.detail;
      opts.detailStrength = o.detailStrength ?? 0.3;
    }
    if (q.parallaxSteps > 0 && set?.heightMap) {
      opts.heightMap = set.heightMap;
      opts.parallaxSteps = q.parallaxSteps;
      // Physical amplitude, exaggerated a little for readability at gameplay
      // distance. Height is stored 0..1 across `heightScale * tile` metres.
      opts.parallaxScale = def.resolve.heightScale * (def.pom ?? 1.5);
    }
    if (o.animated) {
      opts.wave = this.waveTime;
      this.animated.push(mat);
    }
    if (def.macro) opts.macro = def.macro;
    if (def.weather) opts.weather = def.weather;
    patchSurfaceShader(mat, opts);
  }

  /* ------------------------------- API -------------------------------- */

  get(name: MaterialName): THREE.Material {
    let mat = this.materials.get(name);
    if (!mat) {
      try {
        mat = this.build(name);
      } catch (err) {
        console.error(`[materials] failed to build "${name}":`, err);
        mat = this.fallback();
      }
      this.materials.set(name, mat);
    }
    return mat;
  }

  clone(name: MaterialName): THREE.Material {
    const mat = this.get(name).clone();
    // onBeforeCompile survives the clone; the uniforms it installs do not, so
    // re-apply the patch against the clone's own shader.
    this.patch(mat as THREE.MeshStandardMaterial, name);
    this.clones.push(mat);
    return mat;
  }

  textures(name: MaterialName): TextureSet {
    return this.ensure(name);
  }

  surfaceOf(name: MaterialName): SurfaceKind {
    return DEFS[name]?.surface ?? 'concrete';
  }

  tiled(name: MaterialName, repeatX: number, repeatY = repeatX): THREE.Material {
    const mat = this.get(name).clone() as THREE.MeshStandardMaterial;
    this.patch(mat, name, new THREE.Vector2(repeatX, repeatY));
    this.clones.push(mat);
    return mat;
  }

  /** Metres of world one tile of this material's maps should cover. */
  tileSize(name: MaterialName): number {
    return DEFS[name]?.tile ?? 2;
  }

  /** Every material name the library can produce. */
  get names(): readonly MaterialName[] {
    return NAMES;
  }

  /** Convenience for callers that know a real-world size: metres to repeats. */
  forSize(name: MaterialName, widthMeters: number, heightMeters = widthMeters): THREE.Material {
    const t = this.tileSize(name);
    return this.tiled(name, widthMeters / t, heightMeters / t);
  }

  private fallback(): THREE.MeshStandardMaterial {
    if (!this.missing) {
      this.missing = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 });
    }
    return this.missing;
  }

  /* ---------------------------- lifecycle ----------------------------- */

  update(dt: number): void {
    if (this.animated.length > 0) this.waveTime.value += dt;
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    for (const set of this.sets.values()) {
      for (const t of [set.map, set.normalMap, set.armMap, set.heightMap]) {
        if (t) {
          t.anisotropy = quality.anisotropy;
          t.needsUpdate = false;
        }
      }
    }
    // Detail normals and parallax are compile-time features; re-patching forces
    // a program rebuild with the new feature set.
    for (const [name, mat] of this.materials) {
      this.patch(mat as THREE.MeshStandardMaterial, name);
      mat.needsUpdate = true;
    }
    void ctx;
  }

  dispose(): void {
    for (const mat of this.materials.values()) mat.dispose();
    for (const mat of this.clones) mat.dispose();
    this.materials.clear();
    this.clones.length = 0;
    this.sets.clear();
    this.white.dispose();
    this.flatNormal.dispose();
    this.baker?.dispose();
  }
}

/* ----------------------------- utilities ------------------------------ */

function makeSolidTexture(r: number, g: number, b: number): THREE.Texture {
  const tex = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Used when a material's shader is missing so the game still boots. */
const FALLBACK_SURF = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  float n = pfbm01(uv, vec2(20.0), 4, 0.5, 1.0);
  s.albedo = mix(S(0.35, 0.35, 0.36), S(0.55, 0.55, 0.56), n);
  s.height = 0.5 + (n - 0.5) * 0.3;
  s.rough = 0.75 + n * 0.15;
}
`;
