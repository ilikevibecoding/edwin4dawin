// ============================================================================
// Material library — final procedural PBR pass (Fable 3 ownership).
// Every surface is generated in code (canvas textures, see textures.js): no
// external files, no copyrighted content. API is stable for consumers:
//   getMaterial(key) -> cached THREE.Material
//   roomMaterials(style) -> { floor, ceiling, wall, floorTag }
//   clearMaterialCache()
//
// Visual bible: grounded stylized realism, mid-value readable surfaces,
// cold exterior / neutral-green interior / warm exec palette, roughness
// deliberately varied per family (carpet .95, drywall .85, laminate .55,
// painted metal .45, stainless .3, glass .05-.5). No baked lighting in
// albedo — variation comes from subtle grime, mottle and normal detail.
//
// World-space UVs: the map builder bakes architecture into world coordinates
// and restarts each box's UVs at 0, which would desynchronize tile grids and
// panel seams across wall segments. For static architectural materials we
// re-derive UVs from world position in the vertex shader (exact for the
// axis-aligned boxes the builder produces), so patterns stay continuous
// across every segment. Movable meshes (doors, props) keep standard UVs.
// ============================================================================
import * as THREE from 'three';
import { registerAsset } from './registry.js';
import {
  makeCanvasTexture, makeNormalMap, makeDataTexture,
  valueNoise, speckle, streaks, gridLines, cellFill, hairlineCracks,
  mulberry,
} from './textures.js';

let _cache = new Map();      // material key -> THREE.Material
let _texCache = new Map();   // texture family -> { map, normalMap, ... }
let _textures = [];          // every generated texture, for disposal

const FLOOR_ANISO = 4;

// ---------------------------------------------------------------------------
// world-space UV injection (static architecture only)
// ---------------------------------------------------------------------------
const WORLD_UV_KEYS = new Set([
  'wall_int', 'wall_ext', 'wall_exec', 'wall_tile_restroom', 'wall_utility',
  'ceiling', 'ceiling_service', 'ceiling_exec',
  'floor_carpet', 'floor_carpet_corridor', 'floor_tile', 'floor_tile_restroom',
  'floor_concrete', 'floor_wood', 'floor_snow', 'floor_kitchen', 'floor_garage',
  'stair', 'core',
]);

// Replaces the uv used by every texture slot with a world-position projection
// picked per-face from the dominant world normal (exact for axis-aligned
// boxes; U runs along x/z, V runs up walls). Texture .repeat still applies,
// so 1 repeat unit = 1 meter everywhere.
const WORLD_UV_CHUNK = /* glsl */`
vec3 nsrWp = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
vec3 nsrAn = abs( normalize( mat3( modelMatrix ) * normal ) );
vec2 nsrUV = ( nsrAn.y >= nsrAn.x && nsrAn.y >= nsrAn.z )
  ? nsrWp.xz
  : ( ( nsrAn.x >= nsrAn.z ) ? nsrWp.zy : nsrWp.xy );
#ifdef MAP_UV
#undef MAP_UV
#define MAP_UV nsrUV
#endif
#ifdef NORMALMAP_UV
#undef NORMALMAP_UV
#define NORMALMAP_UV nsrUV
#endif
#ifdef ROUGHNESSMAP_UV
#undef ROUGHNESSMAP_UV
#define ROUGHNESSMAP_UV nsrUV
#endif
#ifdef METALNESSMAP_UV
#undef METALNESSMAP_UV
#define METALNESSMAP_UV nsrUV
#endif
#ifdef EMISSIVEMAP_UV
#undef EMISSIVEMAP_UV
#define EMISSIVEMAP_UV nsrUV
#endif
#ifdef BUMPMAP_UV
#undef BUMPMAP_UV
#define BUMPMAP_UV nsrUV
#endif
#ifdef AOMAP_UV
#undef AOMAP_UV
#define AOMAP_UV nsrUV
#endif
#include <uv_vertex>
`;

function injectWorldUV(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', WORLD_UV_CHUNK);
  };
  mat.customProgramCacheKey = () => 'nsr_world_uv';
  return mat;
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
function T(tex) { _textures.push(tex); return tex; }

function fam(key, builder) {
  if (!_texCache.has(key)) _texCache.set(key, builder());
  return _texCache.get(key);
}

function std(opts) {
  const { normalScale, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial(rest);
  if (normalScale != null) m.normalScale.set(normalScale, normalScale);
  return m;
}

// draw symmetric height noise (raises + lowers around mid-gray)
function heightNoise(ctx, w, h, { scale = 64, octaves = 2, seed = 1, amp = 0.5 }) {
  valueNoise(ctx, w, h, { scale, octaves, seed, color: '#ffffff', alpha: amp });
  valueNoise(ctx, w, h, { scale, octaves, seed, color: '#000000', alpha: amp, invert: true });
}

function fill(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// grayscale value for roughness canvases
function gray(v) { const b = Math.round(v * 255); return `rgb(${b},${b},${b})`; }

// ---------------------------------------------------------------------------
// texture families (each built once, shared between related materials)
// ---------------------------------------------------------------------------

// -- painted drywall (roller texture). canvas covers 2 m.
function paintMaps(base, seed) {
  return fam('paint:' + base, () => {
    const S = 512, repeat = [0.5, 0.5];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, base);
      // large soft variation so walls never read flat (no hard stripes)
      valueNoise(ctx, w, h, { scale: 3, octaves: 3, alpha: 0.05, color: '#89847b', seed });
      valueNoise(ctx, w, h, { scale: 5, octaves: 2, alpha: 0.035, color: '#ffffff', seed: seed + 1 });
      // faint wide vertical roller variation
      streaks(ctx, w, h, { dir: 'v', count: 5, alpha: 0.016, light: '#ffffff', dark: '#6e6a64', seed, widthRange: [46, 100] });
      // sparse micro-scuffs low on contrast
      speckle(ctx, w, h, { count: 44, rmin: 0.6, rmax: 2.0, colors: ['#7d7972'], alpha: 0.035, seed: seed + 2 });
    }, { repeat, anisotropy: 2 }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 88, octaves: 2, seed: seed + 3, amp: 0.22 }); // roller stipple
      heightNoise(ctx, w, h, { scale: 6, octaves: 1, seed: seed + 4, amp: 0.12 });  // taped-joint waviness
    }, 0.4, { repeat, anisotropy: 2 }));
    return { map, normalMap };
  });
}

// -- exterior facade: dark blue-gray composite panels, seams every 1.2 m.
function facadeMaps() {
  return fam('facade', () => {
    const S = 512, M = 2.4, repeat = [1 / M, 1 / M]; // 2x2 panels of 1.2 m
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: 2, rows: 2, base: '#48525c', delta: 7, seed: 31 });
      valueNoise(ctx, w, h, { scale: 6, octaves: 2, alpha: 0.045, color: '#313a43', seed: 32 });
      valueNoise(ctx, w, h, { scale: 90, octaves: 1, alpha: 0.035, color: '#8b98a4', seed: 33 });
      // weathering: faint vertical wash
      streaks(ctx, w, h, { dir: 'v', count: 12, alpha: 0.03, light: '#93a0ac', dark: '#2f3841', seed: 34, widthRange: [10, 30], wobble: 3 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 2.5, color: '#272e35', alpha: 0.8 });
    }, { repeat, anisotropy: 4 }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 5, color: '#000000', alpha: 0.85 });
      heightNoise(ctx, w, h, { scale: 5, octaves: 1, seed: 35, amp: 0.12 }); // slight panel bow
    }, 0.6, { repeat, anisotropy: 4 }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      // matte painted composite: narrow roughness range, no sparkle glints
      cellFill(ctx, w, h, { cols: 2, rows: 2, base: gray(0.7), delta: 8, seed: 36 });
      valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.06, color: '#ffffff', seed: 37 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 5, color: gray(0.88), alpha: 1 });
    }, { repeat }));
    return { map, normalMap, roughnessMap };
  });
}

// -- acoustic ceiling tile, 0.6 m grid. canvas covers 1.2 m (2x2 tiles).
function ceilingMaps() {
  return fam('ceiling', () => {
    const S = 512, repeat = [1 / 1.2, 1 / 1.2];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: 2, rows: 2, base: '#ecece9', delta: 4, seed: 41 });
      // fissured mineral-fiber speckle
      speckle(ctx, w, h, { count: 1100, rmin: 0.4, rmax: 1.5, colors: ['#c4c7c4', '#d5d8d4'], alpha: 0.4, seed: 42, squashY: 0.55 });
      speckle(ctx, w, h, { count: 260, rmin: 0.5, rmax: 2.4, colors: ['#b2b6b2'], alpha: 0.26, seed: 43, squashY: 0.4 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 3.5, color: '#c0c4c2', alpha: 0.95 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 1.4, color: '#94999a', alpha: 0.9 });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 6, color: '#000000', alpha: 0.8 });
      heightNoise(ctx, w, h, { scale: 140, octaves: 1, seed: 44, amp: 0.2 });
    }, 0.8, { repeat }));
    return { map, normalMap };
  });
}

// -- carpet tile 0.5 m grid, heather texture. canvas covers 1 m (2x2 tiles).
//    Drawn neutral and tinted per material (blue-gray office / green corridor).
function carpetMaps() {
  return fam('carpet', () => {
    const S = 512, repeat = [1, 1];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: 2, rows: 2, base: '#a8a8a8', delta: 4, seed: 51 });
      // heather: two fine noise passes + coarse tuft clumps
      valueNoise(ctx, w, h, { scale: 128, octaves: 2, alpha: 0.26, color: '#5c5c5c', seed: 52 });
      valueNoise(ctx, w, h, { scale: 96, octaves: 2, alpha: 0.2, color: '#e8e8e8', seed: 53 });
      valueNoise(ctx, w, h, { scale: 14, octaves: 2, alpha: 0.06, color: '#4a4a4a', seed: 54 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 1.6, color: '#3f3f3f', alpha: 0.3 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 150, octaves: 2, seed: 55, amp: 0.4 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 2, color: '#2a2a2a', alpha: 0.5 });
    }, 0.5, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap };
  });
}

// -- porcelain lobby tile 0.8 m, thin grout. hero floor: 1024 over 1.6 m.
function porcelainMaps() {
  return fam('porcelain', () => {
    const S = 1024, repeat = [1 / 1.6, 1 / 1.6];
    const groutC = '#968f84';
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: 2, rows: 2, base: '#beb7aa', delta: 6, seed: 61 });
      // soft stone mottle
      valueNoise(ctx, w, h, { scale: 6, octaves: 3, alpha: 0.11, color: '#8c8174', seed: 62 });
      valueNoise(ctx, w, h, { scale: 18, octaves: 2, alpha: 0.06, color: '#ece8e0', seed: 63 });
      valueNoise(ctx, w, h, { scale: 46, octaves: 2, alpha: 0.05, color: '#7f7986', seed: 64 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 4, color: groutC, alpha: 1 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 6, color: '#000000', alpha: 0.75 });
      heightNoise(ctx, w, h, { scale: 30, octaves: 1, seed: 65, amp: 0.05 });
    }, 0.7, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      // lobby-grade polish: low roughness so the floor picks up reflections
      fill(ctx, w, h, gray(0.24));
      valueNoise(ctx, w, h, { scale: 20, octaves: 2, alpha: 0.14, color: '#ffffff', seed: 66 });
      gridLines(ctx, w, h, { cols: 2, rows: 2, lineW: 6, color: gray(0.7), alpha: 1 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- small ceramic tiles (restroom floor 0.3 m / wall 0.2 m)
function ceramicTileMaps(key, { cells, tileC, groutC, roughTile, roughGrout, sizeM, seed }) {
  return fam(key, () => {
    const S = 512, repeat = [1 / sizeM, 1 / sizeM];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: cells, rows: cells, base: tileC, delta: 4, seed });
      valueNoise(ctx, w, h, { scale: 30, octaves: 2, alpha: 0.03, color: '#8f948f', seed: seed + 1 });
      gridLines(ctx, w, h, { cols: cells, rows: cells, lineW: 3, color: groutC, alpha: 1 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      gridLines(ctx, w, h, { cols: cells, rows: cells, lineW: 4, color: '#000000', alpha: 0.8 });
    }, 0.65, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(roughTile));
      valueNoise(ctx, w, h, { scale: 40, octaves: 1, alpha: 0.08, color: '#ffffff', seed: seed + 2 });
      gridLines(ctx, w, h, { cols: cells, rows: cells, lineW: 4, color: gray(roughGrout), alpha: 1 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- sealed concrete. canvas covers 3 m. shared by floors / stairs / core.
function concreteMaps() {
  return fam('concrete', () => {
    const S = 512, repeat = [1 / 3, 1 / 3];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#9a9893');
      valueNoise(ctx, w, h, { scale: 5, octaves: 3, alpha: 0.13, color: '#6d6a64', seed: 71 });
      valueNoise(ctx, w, h, { scale: 11, octaves: 3, alpha: 0.08, color: '#bcbab4', seed: 72 });
      valueNoise(ctx, w, h, { scale: 80, octaves: 2, alpha: 0.06, color: '#66635e', seed: 73 });
      speckle(ctx, w, h, { count: 420, rmin: 0.4, rmax: 1.3, colors: ['#82807a', '#aeaca6', '#6a675f'], alpha: 0.24, seed: 74 });
      hairlineCracks(ctx, w, h, { count: 2, color: '#5a5751', alpha: 0.18, seed: 75, segments: 16 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 6, octaves: 2, seed: 76, amp: 0.22 });
      heightNoise(ctx, w, h, { scale: 90, octaves: 1, seed: 77, amp: 0.12 });
      hairlineCracks(ctx, w, h, { count: 2, color: '#383838', alpha: 0.4, seed: 75, segments: 16 });
    }, 0.55, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.68));
      valueNoise(ctx, w, h, { scale: 7, octaves: 2, alpha: 0.16, color: '#ffffff', seed: 78 });
      valueNoise(ctx, w, h, { scale: 5, octaves: 2, alpha: 0.18, color: gray(0.42), seed: 79 }); // sealed sheen patches
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- garage slab: concrete + tire-wear lanes + oil. canvas covers 3 m.
function garageMaps() {
  return fam('garage', () => {
    const S = 512, repeat = [1 / 3, 1 / 3];
    const lane = (ctx, w, h, cy, half, alpha, color) => {
      const g = ctx.createLinearGradient(0, cy - half, 0, cy + half);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, cy - half, w, half * 2);
      ctx.restore();
    };
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#8e8c87');
      valueNoise(ctx, w, h, { scale: 5, octaves: 3, alpha: 0.1, color: '#6a6762', seed: 81 });
      valueNoise(ctx, w, h, { scale: 12, octaves: 3, alpha: 0.06, color: '#aeaca6', seed: 82 });
      speckle(ctx, w, h, { count: 380, rmin: 0.4, rmax: 1.3, colors: ['#7b7872', '#a09e98'], alpha: 0.2, seed: 83 });
      // tire-polished lanes (car track ~1.5 m apart), kept soft
      lane(ctx, w, h, h * 0.25, 52, 0.3, 'rgba(40,38,34,0.4)');
      lane(ctx, w, h, h * 0.75, 52, 0.3, 'rgba(40,38,34,0.4)');
      // oil drips / stains
      speckle(ctx, w, h, { count: 20, rmin: 2, rmax: 8, colors: ['#3a3730', '#302e29'], alpha: 0.12, seed: 84, squashY: 0.6 });
      hairlineCracks(ctx, w, h, { count: 2, color: '#4e4b46', alpha: 0.28, seed: 85 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 6, octaves: 2, seed: 86, amp: 0.2 });
      heightNoise(ctx, w, h, { scale: 90, octaves: 1, seed: 87, amp: 0.1 });
    }, 0.5, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.66));
      valueNoise(ctx, w, h, { scale: 7, octaves: 2, alpha: 0.12, color: '#ffffff', seed: 88 });
      lane(ctx, w, h, h * 0.25, 52, 0.4, gray(0.48));
      lane(ctx, w, h, h * 0.75, 52, 0.4, gray(0.48));
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- painted concrete block (utility walls). canvas covers 1.6 m: 4x8 blocks.
function blockMaps() {
  return fam('block', () => {
    const S = 512, repeat = [1 / 1.6, 1 / 1.6];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      cellFill(ctx, w, h, { cols: 4, rows: 8, base: '#bfc1b9', delta: 5, seed: 91 });
      valueNoise(ctx, w, h, { scale: 70, octaves: 2, alpha: 0.07, color: '#8f9189', seed: 92 });
      valueNoise(ctx, w, h, { scale: 6, octaves: 2, alpha: 0.04, color: '#84867e', seed: 93 });
      gridLines(ctx, w, h, { cols: 4, rows: 8, lineW: 3, color: '#a2a49c', alpha: 1 });
      gridLines(ctx, w, h, { cols: 4, rows: 8, lineW: 1, color: '#8b8d85', alpha: 0.9 });
    }, { repeat, anisotropy: 2 }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      gridLines(ctx, w, h, { cols: 4, rows: 8, lineW: 4, color: '#000000', alpha: 0.85 });
      heightNoise(ctx, w, h, { scale: 100, octaves: 2, seed: 94, amp: 0.25 });
    }, 0.7, { repeat, anisotropy: 2 }));
    return { map, normalMap };
  });
}

// -- walnut engineered plank floor 0.12 x 1.2 m. hero: 1024 over 1.2 m.
function woodFloorMaps() {
  return fam('woodfloor', () => {
    const S = 1024, repeat = [1 / 1.2, 1 / 1.2];
    const rows = 10;
    const rowH = S / rows;
    const rnd = mulberry(101);
    const rowTones = [], rowJoints = [];
    for (let j = 0; j < rows; j++) { rowTones.push((rnd() * 2 - 1)); rowJoints.push(rnd()); }
    const drawPlanks = (ctx, w, h, forHeight) => {
      for (let j = 0; j < rows; j++) {
        const y = j * rowH;
        if (!forHeight) {
          const t = rowTones[j];
          const r = Math.round(104 + t * 16), g = Math.round(76 + t * 13), b = Math.round(52 + t * 10);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(0, y, w, rowH + 1);
          // grain within this plank row
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y, w, rowH);
          ctx.clip();
          streaks(ctx, w, h, { dir: 'h', count: 26, alpha: 0.12, light: '#8a6a48', dark: '#3f2d1e', seed: 300 + j, widthRange: [0.8, 2.4], wobble: 3 });
          streaks(ctx, w, h, { dir: 'h', count: 7, alpha: 0.08, light: '#a8825c', dark: '#57402c', seed: 340 + j, widthRange: [3, 7], wobble: 5 });
          ctx.restore();
        }
        // plank gap below row + staggered end joint
        ctx.fillStyle = forHeight ? '#000000' : 'rgba(30,21,14,0.85)';
        ctx.globalAlpha = forHeight ? 0.75 : 0.8;
        ctx.fillRect(0, y + rowH - 1.2, w, 2.4);
        const jx = Math.floor(rowJoints[j] * w);
        ctx.fillRect(jx - 1, y, 2.2, rowH);
        ctx.globalAlpha = 1;
      }
    };
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      drawPlanks(ctx, w, h, false);
      valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.05, color: '#2e2118', seed: 102 });
      valueNoise(ctx, w, h, { scale: 16, octaves: 2, alpha: 0.04, color: '#c89868', seed: 103 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      drawPlanks(ctx, w, h, true);
      heightNoise(ctx, w, h, { scale: 120, octaves: 1, seed: 104, amp: 0.06 });
    }, 0.65, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.55));
      for (let j = 0; j < rows; j++) {
        ctx.fillStyle = gray(0.55 + rowTones[j] * 0.04);
        ctx.fillRect(0, j * rowH, w, rowH + 1);
      }
      valueNoise(ctx, w, h, { scale: 12, octaves: 2, alpha: 0.06, color: '#ffffff', seed: 105 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- generic light veneer grain for props (tinted per material)
function woodGrainMaps() {
  return fam('woodgrain', () => {
    const S = 256, repeat = [2, 2]; // 0.5 m
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#e9e0cf');
      streaks(ctx, w, h, { dir: 'h', count: 46, alpha: 0.12, light: '#f6efe1', dark: '#b09a78', seed: 111, widthRange: [0.8, 2.6], wobble: 2.5 });
      streaks(ctx, w, h, { dir: 'h', count: 10, alpha: 0.08, light: '#f8f2e6', dark: '#9c8666', seed: 112, widthRange: [3, 7], wobble: 4 });
      valueNoise(ctx, w, h, { scale: 12, octaves: 2, alpha: 0.045, color: '#a58e6c', seed: 113 });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      streaks(ctx, w, h, { dir: 'h', count: 40, alpha: 0.3, light: '#a0a0a0', dark: '#606060', seed: 114, widthRange: [1, 2], wobble: 2.5 });
    }, 0.22, { repeat }));
    return { map, normalMap };
  });
}

// -- office door veneer: vertical grain, mid warm tone. 1 x 2 m canvas.
function doorVeneerMaps() {
  return fam('doorveneer', () => {
    const repeat = [1, 0.5];
    const map = T(makeCanvasTexture(256, 512, (ctx, w, h) => {
      fill(ctx, w, h, '#8d6238');
      streaks(ctx, w, h, { dir: 'v', count: 64, alpha: 0.13, light: '#b58756', dark: '#54371e', seed: 121, widthRange: [0.8, 2.8], wobble: 3 });
      streaks(ctx, w, h, { dir: 'v', count: 14, alpha: 0.08, light: '#c09258', dark: '#634324', seed: 122, widthRange: [4, 9], wobble: 5 });
      valueNoise(ctx, w, h, { scale: 6, octaves: 2, alpha: 0.06, color: '#46301c', seed: 123 });
    }, { repeat }));
    const normalMap = T(makeNormalMap(256, 512, (ctx, w, h) => {
      streaks(ctx, w, h, { dir: 'v', count: 50, alpha: 0.3, light: '#9c9c9c', dark: '#636363', seed: 124, widthRange: [1, 2.2], wobble: 3 });
    }, 0.2, { repeat }));
    return { map, normalMap };
  });
}

// -- bright snow: undulation + sparkle. canvas covers 3 m.
function snowMaps() {
  return fam('snow', () => {
    const S = 512, repeat = [1 / 3, 1 / 3];
    const sparkleParams = { count: 320, rmin: 0.4, rmax: 1.0, alpha: 0.85, seed: 131 };
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#e9eef5');
      valueNoise(ctx, w, h, { scale: 4, octaves: 3, alpha: 0.22, color: '#8ea6c6', seed: 132, contrast: 1.4 });
      // sparse deeper drift shadows that survive outdoor tone mapping
      valueNoise(ctx, w, h, { scale: 7, octaves: 2, alpha: 0.16, color: '#7f97b8', seed: 136, contrast: 1.9 });
      valueNoise(ctx, w, h, { scale: 30, octaves: 2, alpha: 0.08, color: '#c6d6ea', seed: 133 });
      speckle(ctx, w, h, { ...sparkleParams, colors: ['#ffffff'] });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 5, octaves: 3, seed: 132, amp: 0.8 });
      heightNoise(ctx, w, h, { scale: 60, octaves: 2, seed: 134, amp: 0.22 });
    }, 1.0, { repeat, anisotropy: FLOOR_ANISO }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.9));
      valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.08, color: gray(0.7), seed: 135 });
      speckle(ctx, w, h, { ...sparkleParams, colors: [gray(0.28)] }); // sparkle glints
    }, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap, roughnessMap };
  });
}

// -- kitchen vinyl with fleck. canvas covers 1 m.
function vinylMaps() {
  return fam('vinyl', () => {
    const S = 256, repeat = [1, 1];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#c8c3b7');
      valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.05, color: '#a49e90', seed: 141 });
      speckle(ctx, w, h, { count: 520, rmin: 0.4, rmax: 2.0, colors: ['#a89f8e', '#bcb5a4', '#948d7e', '#ddd8cc'], alpha: 0.55, seed: 142 });
      speckle(ctx, w, h, { count: 90, rmin: 0.5, rmax: 1.4, colors: ['#7f7a6e'], alpha: 0.4, seed: 143 });
    }, { repeat, anisotropy: FLOOR_ANISO }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 60, octaves: 1, seed: 144, amp: 0.1 });
    }, 0.2, { repeat, anisotropy: FLOOR_ANISO }));
    return { map, normalMap };
  });
}

// -- laminate (props): faint even grain, tinted per material.
function laminateMaps() {
  return fam('laminate', () => {
    const S = 256, repeat = [2, 2];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#f0f0ee');
      valueNoise(ctx, w, h, { scale: 40, octaves: 2, alpha: 0.035, color: '#c9c9c4', seed: 151 });
      streaks(ctx, w, h, { dir: 'h', count: 24, alpha: 0.03, light: '#ffffff', dark: '#c2c2bc', seed: 152, widthRange: [1, 3] });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 90, octaves: 1, seed: 153, amp: 0.08 });
    }, 0.15, { repeat }));
    return { map, normalMap };
  });
}

// -- brushed metal streaks (also tinted for stainless).
function brushedMaps() {
  return fam('brushed', () => {
    const S = 256, repeat = [2, 2];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#b7bbbf');
      streaks(ctx, w, h, { dir: 'h', count: 240, alpha: 0.09, light: '#e9ecef', dark: '#84898e', seed: 161, widthRange: [0.6, 1.6] });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      streaks(ctx, w, h, { dir: 'h', count: 200, alpha: 0.4, light: '#9a9a9a', dark: '#666666', seed: 162, widthRange: [0.6, 1.4] });
    }, 0.18, { repeat }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.36));
      streaks(ctx, w, h, { dir: 'h', count: 220, alpha: 0.3, light: gray(0.55), dark: gray(0.22), seed: 163, widthRange: [0.6, 1.6] });
    }, { repeat }));
    return { map, normalMap, roughnessMap };
  });
}

// -- galvanized roller shutter: horizontal ribs every 0.12 m. canvas 0.48 m.
function shutterMaps() {
  return fam('shutter', () => {
    const S = 256, repeat = [1 / 0.48, 1 / 0.48];
    const ribs = 4;
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#b0b4b6');
      // galvanized spangle mottle
      valueNoise(ctx, w, h, { scale: 26, octaves: 2, alpha: 0.08, color: '#8b9094', seed: 171 });
      valueNoise(ctx, w, h, { scale: 40, octaves: 1, alpha: 0.06, color: '#d5d9db', seed: 172 });
      // rib shading hint (kept subtle; normals do the work)
      for (let i = 0; i < ribs; i++) {
        const y = (i + 0.5) * (h / ribs);
        ctx.fillStyle = 'rgba(70,76,80,0.16)';
        ctx.fillRect(0, y - 2, w, 4);
      }
      streaks(ctx, w, h, { dir: 'v', count: 12, alpha: 0.05, light: '#d8dcde', dark: '#7e8488', seed: 173, widthRange: [6, 18] });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      // rounded ribs via vertical sine height
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        const t = (y / h) * ribs * Math.PI * 2;
        const v = Math.round(128 + Math.sin(t) * 70);
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }, 0.8, { repeat }));
    return { map, normalMap };
  });
}

// -- rack-unit perforated metal (server fronts).
function serverMaps() {
  return fam('server', () => {
    const S = 256, repeat = [1 / 0.6, 1 / 0.6];
    const unitH = 64;
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#23262b');
      valueNoise(ctx, w, h, { scale: 30, octaves: 1, alpha: 0.05, color: '#3c4046', seed: 181 });
      for (let u = 0; u < h / unitH; u++) {
        const y0 = u * unitH;
        // unit seam
        ctx.fillStyle = 'rgba(90,96,104,0.5)';
        ctx.fillRect(0, y0, w, 1.5);
        ctx.fillStyle = 'rgba(8,9,11,0.8)';
        ctx.fillRect(0, y0 + 2, w, 1);
        // perforation field
        ctx.fillStyle = 'rgba(9,10,12,0.85)';
        for (let py = y0 + 14; py < y0 + 52; py += 6) {
          const off = ((py - y0 - 14) / 6) % 2 ? 3 : 0;
          for (let px = off; px < w; px += 6) {
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      for (let u = 0; u < h / unitH; u++) {
        const y0 = u * unitH;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, y0 + 1, w, 2.5);
        for (let py = y0 + 14; py < y0 + 52; py += 6) {
          const off = ((py - y0 - 14) / 6) % 2 ? 3 : 0;
          for (let px = off; px < w; px += 6) {
            ctx.beginPath();
            ctx.arc(px, py, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }, 0.6, { repeat }));
    return { map, normalMap };
  });
}

// -- woven office fabric (tinted per material).
function fabricMaps() {
  return fam('fabric', () => {
    const S = 256, repeat = [1 / 0.4, 1 / 0.4];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#b4b4b4');
      streaks(ctx, w, h, { dir: 'h', count: 200, alpha: 0.1, light: '#d2d2d2', dark: '#8e8e8e', seed: 191, widthRange: [0.8, 1.4] });
      streaks(ctx, w, h, { dir: 'v', count: 200, alpha: 0.1, light: '#cccccc', dark: '#909090', seed: 192, widthRange: [0.8, 1.4] });
      valueNoise(ctx, w, h, { scale: 40, octaves: 2, alpha: 0.1, color: '#7c7c7c', seed: 193 });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      streaks(ctx, w, h, { dir: 'h', count: 160, alpha: 0.35, light: '#9e9e9e', dark: '#5e5e5e', seed: 194, widthRange: [0.8, 1.4] });
      streaks(ctx, w, h, { dir: 'v', count: 160, alpha: 0.35, light: '#9e9e9e', dark: '#5e5e5e', seed: 195, widthRange: [0.8, 1.4] });
    }, 0.35, { repeat }));
    return { map, normalMap };
  });
}

// -- black leather grain.
function leatherMaps() {
  return fam('leather', () => {
    const S = 256, repeat = [1 / 0.4, 1 / 0.4];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#2b2b2f');
      valueNoise(ctx, w, h, { scale: 44, octaves: 2, alpha: 0.16, color: '#141416', seed: 201 });
      valueNoise(ctx, w, h, { scale: 44, octaves: 2, alpha: 0.1, color: '#4a4a50', seed: 202 });
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 48, octaves: 2, seed: 203, amp: 0.35 });
      heightNoise(ctx, w, h, { scale: 110, octaves: 1, seed: 204, amp: 0.12 });
    }, 0.4, { repeat }));
    return { map, normalMap };
  });
}

// -- cardboard with flute hint, tape line and abstract print marks.
function cardboardMaps() {
  return fam('cardboard', () => {
    const S = 256, repeat = [2, 2];
    const map = T(makeCanvasTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, '#b9945f');
      valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.07, color: '#8f6f42', seed: 211 });
      valueNoise(ctx, w, h, { scale: 30, octaves: 1, alpha: 0.05, color: '#d8b988', seed: 212 });
      // corrugation flutes
      streaks(ctx, w, h, { dir: 'v', count: 90, alpha: 0.05, light: '#cfae7d', dark: '#94744a', seed: 213, widthRange: [1, 2] });
      // packing tape band (slightly lighter + glossier)
      ctx.fillStyle = 'rgba(226,216,186,0.4)';
      ctx.fillRect(0, h * 0.3, w, 20);
      ctx.fillStyle = 'rgba(120,96,60,0.35)';
      ctx.fillRect(0, h * 0.3 - 1, w, 1.6);
      ctx.fillRect(0, h * 0.3 + 20, w, 1.6);
      // abstract print hints (no readable text)
      ctx.fillStyle = 'rgba(74,56,36,0.4)';
      ctx.fillRect(w * 0.62, h * 0.62, 44, 5);
      ctx.fillRect(w * 0.62, h * 0.68, 30, 4);
      ctx.strokeStyle = 'rgba(74,56,36,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.15, h * 0.6, 26, 18);
    }, { repeat }));
    const normalMap = T(makeNormalMap(S, S, (ctx, w, h) => {
      streaks(ctx, w, h, { dir: 'v', count: 80, alpha: 0.25, light: '#909090', dark: '#6e6e6e', seed: 214, widthRange: [1, 2] });
      heightNoise(ctx, w, h, { scale: 20, octaves: 2, seed: 215, amp: 0.1 });
    }, 0.25, { repeat }));
    const roughnessMap = T(makeDataTexture(S, S, (ctx, w, h) => {
      fill(ctx, w, h, gray(0.88));
      ctx.fillStyle = gray(0.42);
      ctx.fillRect(0, h * 0.3, w, 20);
    }, { repeat }));
    return { map, normalMap, roughnessMap };
  });
}

// -- generic fine plastic / paint micro-normal (shared by small prop mats)
function microNormal() {
  return fam('micro', () => {
    const normalMap = T(makeNormalMap(128, 128, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 44, octaves: 2, seed: 221, amp: 0.3 });
    }, 0.16, { repeat: [4, 4] }));
    return { normalMap };
  });
}

// -- orange-peel paint normal for painted steel doors
function orangePeel() {
  return fam('orangepeel', () => {
    const normalMap = T(makeNormalMap(256, 256, (ctx, w, h) => {
      heightNoise(ctx, w, h, { scale: 70, octaves: 2, seed: 231, amp: 0.4 });
    }, 0.3, { repeat: [2, 2] }));
    return { normalMap };
  });
}

// -- paper: soft fiber
function paperMaps() {
  return fam('paper', () => {
    const map = T(makeCanvasTexture(128, 128, (ctx, w, h) => {
      fill(ctx, w, h, '#f3f1ea');
      valueNoise(ctx, w, h, { scale: 34, octaves: 2, alpha: 0.035, color: '#c9c4b4', seed: 241 });
    }, { repeat: [4, 4] }));
    return { map };
  });
}

// -- subtle emissive screen gradient (pale UI glow, no readable content)
function screenEmissive() {
  return fam('screenglow', () => {
    const emissiveMap = T(makeCanvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#cfe6ff');
      g.addColorStop(0.55, '#a9c8e8');
      g.addColorStop(1, '#7c9cc0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // faint UI blocks
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(w * 0.08, h * 0.1, w * 0.5, h * 0.1);
      ctx.fillRect(w * 0.08, h * 0.28, w * 0.34, h * 0.06);
      ctx.fillStyle = 'rgba(30,60,100,0.25)';
      ctx.fillRect(w * 0.08, h * 0.44, w * 0.84, h * 0.42);
      ctx.fillStyle = 'rgba(190,230,255,0.5)';
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.12, h * (0.5 + i * 0.07), w * (0.3 + (i % 3) * 0.14), 2);
    }, { repeat: [1, 1] }));
    return { emissiveMap };
  });
}

// ---------------------------------------------------------------------------
// material creators
// ---------------------------------------------------------------------------
function paintWall(base, seed, { rough = 0.85, normalScale = 1 } = {}) {
  const { map, normalMap } = paintMaps(base, seed);
  return std({ map, normalMap, normalScale, roughness: rough, metalness: 0.0, dithering: true });
}

const CREATORS = {
  // ------------------------------------------------------------ architecture
  wall_int: () => paintWall('#c3bfb8', 21),
  wall_exec: () => paintWall('#d2c7b0', 24, { rough: 0.8 }),
  ceiling_exec: () => paintWall('#e7e9ea', 27, { rough: 0.82, normalScale: 0.4 }),
  column: () => paintWall('#cdcfd0', 29, { rough: 0.6, normalScale: 0.5 }),

  wall_ext: () => {
    const { map, normalMap, roughnessMap } = facadeMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.05, dithering: true });
  },

  ceiling: () => {
    const { map, normalMap } = ceilingMaps();
    return std({ map, normalMap, roughness: 0.92, metalness: 0.0, dithering: true });
  },

  ceiling_service: () => std({
    color: 0x5b6570,
    map: fam('svc_noise', () => ({
      map: T(makeCanvasTexture(256, 256, (ctx, w, h) => {
        fill(ctx, w, h, '#ffffff');
        valueNoise(ctx, w, h, { scale: 8, octaves: 2, alpha: 0.14, color: '#606870', seed: 251 });
      }, { repeat: [0.5, 0.5] })),
    })).map,
    normalMap: microNormal().normalMap,
    roughness: 0.92, metalness: 0.05, dithering: true,
  }),

  wall_tile_restroom: () => {
    const { map, normalMap, roughnessMap } = ceramicTileMaps('wtile', {
      cells: 6, tileC: '#eceeee', groutC: '#c6c9c6', roughTile: 0.16, roughGrout: 0.55, sizeM: 1.2, seed: 261,
    });
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },

  wall_utility: () => {
    const { map, normalMap } = blockMaps();
    return std({ map, normalMap, roughness: 0.8, metalness: 0.0, dithering: true });
  },

  wall_glassframe: () => std({ color: 0x2c3036, roughness: 0.5, metalness: 0.6 }),

  // ------------------------------------------------------------------ floors
  floor_carpet: () => {
    const { map, normalMap } = carpetMaps();
    return std({ color: 0x778290, map, normalMap, roughness: 0.95, metalness: 0.0 });
  },
  floor_carpet_corridor: () => {
    const { map, normalMap } = carpetMaps();
    return std({ color: 0x646b60, map, normalMap, roughness: 0.95, metalness: 0.0 });
  },
  floor_tile: () => {
    const { map, normalMap, roughnessMap } = porcelainMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.9 });
  },
  floor_tile_restroom: () => {
    const { map, normalMap, roughnessMap } = ceramicTileMaps('ftile', {
      cells: 4, tileC: '#c9cac6', groutC: '#a8a9a4', roughTile: 0.42, roughGrout: 0.7, sizeM: 1.2, seed: 262,
    });
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  floor_concrete: () => {
    const { map, normalMap, roughnessMap } = concreteMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  floor_garage: () => {
    const { map, normalMap, roughnessMap } = garageMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  floor_wood: () => {
    const { map, normalMap, roughnessMap } = woodFloorMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  floor_snow: () => {
    const { map, normalMap, roughnessMap } = snowMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  floor_kitchen: () => {
    const { map, normalMap } = vinylMaps();
    return std({ map, normalMap, roughness: 0.5, metalness: 0.0 });
  },
  stair: () => {
    const { map, normalMap, roughnessMap } = concreteMaps();
    return std({ color: 0xc2c2c2, map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  core: () => {
    const { map, normalMap, roughnessMap } = concreteMaps();
    return std({ color: 0xcbccd0, map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0, dithering: true });
  },

  // --------------------------------------------------------- doors / frames
  door: () => {
    const { map, normalMap } = doorVeneerMaps();
    return std({ map, normalMap, roughness: 0.48, metalness: 0.0 });
  },
  door_fire: () => std({
    color: 0x7e3a32, normalMap: orangePeel().normalMap,
    roughness: 0.5, metalness: 0.25,
  }),
  door_security: () => {
    const { normalMap } = brushedMaps();
    return std({ color: 0x44506a, normalMap, normalScale: 0.4, roughness: 0.45, metalness: 0.35 });
  },
  door_glass: () => std({ color: 0xaeb4b8, roughness: 0.4, metalness: 0.7 }),
  shutter: () => {
    const { map, normalMap } = shutterMaps();
    return std({ map, normalMap, roughness: 0.55, metalness: 0.6 });
  },
  frame: () => std({ color: 0x413e3a, normalMap: microNormal().normalMap, roughness: 0.5, metalness: 0.2 }),
  railing: () => std({ color: 0x33363a, roughness: 0.4, metalness: 0.8 }),
  trim: () => std({ color: 0x64686c, roughness: 0.6, metalness: 0.1 }),
  baseboard: () => std({ color: 0x49423c, roughness: 0.6, metalness: 0.05 }),

  // ------------------------------------------------------------------- glass
  glass: () => new THREE.MeshPhysicalMaterial({
    color: 0xd6ecf4, transparent: true, opacity: 0.16, roughness: 0.06,
    metalness: 0.0, side: THREE.DoubleSide, depthWrite: false,
    envMapIntensity: 1.2,
  }),
  glass_frosted: () => new THREE.MeshPhysicalMaterial({
    color: 0xe4ebee, transparent: true, opacity: 0.55, roughness: 0.5,
    metalness: 0.0, side: THREE.DoubleSide, depthWrite: false,
  }),
  glass_tinted: () => new THREE.MeshPhysicalMaterial({
    color: 0x33414f, transparent: true, opacity: 0.42, roughness: 0.08,
    metalness: 0.0, side: THREE.DoubleSide, depthWrite: false,
    envMapIntensity: 1.2,
  }),

  // ------------------------------------------------------------- prop woods
  wood_desk: () => {
    const { map, normalMap } = woodGrainMaps();
    return std({ color: 0xcaa273, map, normalMap, roughness: 0.55, metalness: 0.0 });
  },
  wood_dark: () => {
    const { map, normalMap } = woodGrainMaps();
    return std({ color: 0x6f4e34, map, normalMap, roughness: 0.5, metalness: 0.0 });
  },
  laminate_white: () => {
    const { map, normalMap } = laminateMaps();
    return std({ color: 0xe9e7e2, map, normalMap, roughness: 0.55, metalness: 0.0 });
  },
  laminate_gray: () => {
    const { map, normalMap } = laminateMaps();
    return std({ color: 0x9fa3a6, map, normalMap, roughness: 0.55, metalness: 0.0 });
  },

  // ------------------------------------------------------------ prop metals
  metal_dark: () => std({ color: 0x24262a, normalMap: microNormal().normalMap, roughness: 0.45, metalness: 0.4 }),
  metal_blue: () => std({ color: 0x4d5a70, normalMap: microNormal().normalMap, roughness: 0.45, metalness: 0.35 }),
  metal_beige: () => std({ color: 0xc5bda9, normalMap: microNormal().normalMap, roughness: 0.5, metalness: 0.3 }),
  metal_brushed: () => {
    const { map, normalMap, roughnessMap } = brushedMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.85 });
  },
  stainless: () => {
    const { map, normalMap, roughnessMap } = brushedMaps();
    return std({ color: 0xe2e6ea, map, normalMap, roughnessMap, roughness: 0.85, metalness: 0.92 });
  },
  chrome: () => std({ color: 0xe4e8ec, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.4 }),
  brass: () => std({ color: 0xc9a55a, roughness: 0.32, metalness: 1.0 }),
  server_dark: () => {
    const { map, normalMap } = serverMaps();
    return std({ map, normalMap, roughness: 0.5, metalness: 0.55 });
  },

  // ---------------------------------------------------------- prop plastics
  plastic_black: () => std({ color: 0x1f2124, normalMap: microNormal().normalMap, roughness: 0.5, metalness: 0.0 }),
  plastic_gray: () => std({ color: 0x8d9094, normalMap: microNormal().normalMap, roughness: 0.6, metalness: 0.0 }),
  plastic_beige: () => {
    // aged electronics: slight yellowing unevenness
    const map = fam('beigeplastic', () => ({
      map: T(makeCanvasTexture(128, 128, (ctx, w, h) => {
        fill(ctx, w, h, '#d3c9ae');
        valueNoise(ctx, w, h, { scale: 5, octaves: 2, alpha: 0.07, color: '#b09f78', seed: 271 });
      }, { repeat: [3, 3] })),
    })).map;
    return std({ map, normalMap: microNormal().normalMap, roughness: 0.65, metalness: 0.0 });
  },
  plastic_white: () => std({ color: 0xe8e8e5, normalMap: microNormal().normalMap, roughness: 0.5, metalness: 0.0 }),
  rubber: () => std({ color: 0x232526, normalMap: microNormal().normalMap, normalScale: 1.6, roughness: 0.95, metalness: 0.0 }),

  // ------------------------------------------------------------ soft goods
  fabric_gray: () => {
    const { map, normalMap } = fabricMaps();
    return std({ color: 0x74787c, map, normalMap, roughness: 0.96, metalness: 0.0 });
  },
  fabric_blue: () => {
    const { map, normalMap } = fabricMaps();
    return std({ color: 0x465872, map, normalMap, roughness: 0.96, metalness: 0.0 });
  },
  leather_black: () => {
    const { map, normalMap } = leatherMaps();
    return std({ map, normalMap, roughness: 0.55, metalness: 0.0 });
  },

  // ---------------------------------------------------------- paper & misc
  cardboard: () => {
    const { map, normalMap, roughnessMap } = cardboardMaps();
    return std({ map, normalMap, roughnessMap, roughness: 1.0, metalness: 0.0 });
  },
  paper: () => std({ map: paperMaps().map, roughness: 0.92, metalness: 0.0 }),
  ceramic: () => std({ color: 0xf4f5f4, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.2 }),
  snowpile: () => {
    const { map, normalMap, roughnessMap } = snowMaps();
    return std({ color: 0xffffff, map, normalMap, roughnessMap, roughness: 0.95, metalness: 0.0 });
  },

  // -------------------------------------------------------------- emissive
  screen_glow: () => std({
    color: 0x0a0d12, emissive: 0xbfe0ff, emissiveIntensity: 1.2,
    emissiveMap: screenEmissive().emissiveMap,
    roughness: 0.25, metalness: 0.0,
  }),
  screen_off: () => std({ color: 0x11151b, roughness: 0.15, metalness: 0.2, envMapIntensity: 1.3 }),
  led_red: () => std({ color: 0x2a0a08, emissive: 0xff2418, emissiveIntensity: 1.4, roughness: 0.4 }),
  led_green: () => std({ color: 0x08200e, emissive: 0x3dff64, emissiveIntensity: 1.6, roughness: 0.4 }),
  exit_sign: () => std({ color: 0x0d1a12, emissive: 0xccffdd, emissiveIntensity: 1.8, roughness: 0.35 }),
  light_panel: () => std({ color: 0xf5f2ea, emissive: 0xfff1da, emissiveIntensity: 1.6, roughness: 0.6 }),
};

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------
export function getMaterial(key) {
  if (_cache.has(key)) return _cache.get(key);
  const mat = createMaterial(key);
  _cache.set(key, mat);
  return mat;
}

function createMaterial(key, { worldUV = true } = {}) {
  const make = CREATORS[key];
  let mat;
  if (make) {
    mat = make();
  } else {
    console.warn('[materials] unknown material key:', key);
    mat = std({ color: 0xb8b0a6, roughness: 0.8, metalness: 0.0 });
  }
  if (worldUV && WORLD_UV_KEYS.has(key)) injectWorldUV(mat);
  mat.name = 'mat_' + key;
  return mat;
}

// Gallery/sample variant without the world-UV projection (samples are
// spheres/cubes at arbitrary positions, so they need regular UVs).
function sampleMaterial(key) {
  const cacheKey = key + '@sample';
  if (!_cache.has(cacheKey)) _cache.set(cacheKey, createMaterial(key, { worldUV: false }));
  return _cache.get(cacheKey);
}

// room style -> material keys + footstep tag
export function roomMaterials(style) {
  switch (style) {
    case 'exterior': return { floor: 'floor_snow', ceiling: null, wall: 'wall_ext', floorTag: 'snow' };
    case 'lobby': return { floor: 'floor_tile', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'tile' };
    case 'office': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'conference': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'exec': return { floor: 'floor_wood', ceiling: 'ceiling_exec', wall: 'wall_exec', floorTag: 'wood' };
    case 'kitchen': return { floor: 'floor_kitchen', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'tile' };
    case 'restroom': return { floor: 'floor_tile_restroom', ceiling: 'ceiling', wall: 'wall_tile_restroom', floorTag: 'tile' };
    case 'archive': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'server': return { floor: 'floor_tile', ceiling: 'ceiling_service', wall: 'wall_int', floorTag: 'tile' };
    case 'security': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'corridor': return { floor: 'floor_carpet_corridor', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'service': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_utility', floorTag: 'concrete' };
    case 'garage': return { floor: 'floor_garage', ceiling: 'ceiling_service', wall: 'wall_ext', floorTag: 'concrete' };
    case 'utility': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_utility', floorTag: 'concrete' };
    case 'stairwell': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_utility', floorTag: 'concrete' };
    default: return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
  }
}

export function clearMaterialCache() {
  for (const m of _cache.values()) m.dispose?.();
  _cache.clear();
  for (const t of _textures) t.dispose?.();
  _textures = [];
  _texCache.clear();
}

// ---------------------------------------------------------------------------
// asset registry: one entry per material family. build() returns a sample
// sphere + cube pair for the QA gallery.
// ---------------------------------------------------------------------------
function registerFamily(id, name, keys) {
  registerAsset({
    id, name,
    category: 'material', agent: 'fable3', status: 'built',
    files: 'src/assets/materials.js',
    keys,
    build() {
      const g = new THREE.Group();
      const matA = sampleMaterial(keys[0]);
      const matB = sampleMaterial(keys[Math.min(1, keys.length - 1)]);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), matA);
      sphere.position.set(-0.5, 0.44, 0);
      const cubeGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
      // meter-scale UVs on the cube so tiling materials read true to scale
      const uv = cubeGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.62, uv.getY(i) * 0.62);
      const cube = new THREE.Mesh(cubeGeo, matB);
      cube.position.set(0.5, 0.31, 0);
      cube.rotation.y = 0.5;
      for (const m of [sphere, cube]) { m.castShadow = true; m.receiveShadow = true; }
      g.add(sphere, cube);
      return g;
    },
  });
}

registerFamily('mat_drywall_paint', 'Painted Drywall Family', ['wall_int', 'wall_exec', 'ceiling_exec', 'column']);
registerFamily('mat_facade_panel', 'Exterior Facade Panels', ['wall_ext']);
registerFamily('mat_acoustic_ceiling', 'Acoustic Ceiling Tile', ['ceiling', 'ceiling_service']);
registerFamily('mat_carpet_blue', 'Commercial Carpet Tile', ['floor_carpet', 'floor_carpet_corridor']);
registerFamily('mat_porcelain_tile', 'Porcelain & Ceramic Tile', ['floor_tile', 'floor_tile_restroom', 'wall_tile_restroom']);
registerFamily('mat_concrete', 'Sealed Concrete & Block', ['floor_concrete', 'floor_garage', 'stair', 'core', 'wall_utility']);
registerFamily('mat_wood', 'Wood Veneer & Plank', ['floor_wood', 'door', 'wood_desk', 'wood_dark']);
registerFamily('mat_snow', 'Snow', ['floor_snow', 'snowpile']);
registerFamily('mat_vinyl_laminate', 'Vinyl & Laminate', ['floor_kitchen', 'laminate_white', 'laminate_gray']);
registerFamily('mat_painted_metal', 'Painted Metal', ['door_fire', 'door_security', 'shutter', 'frame', 'railing', 'metal_dark', 'metal_blue', 'metal_beige', 'door_glass', 'wall_glassframe', 'trim', 'baseboard']);
registerFamily('mat_bare_metal', 'Brushed / Bare Metal', ['metal_brushed', 'stainless', 'chrome', 'brass', 'server_dark']);
registerFamily('mat_glass', 'Architectural Glass', ['glass', 'glass_frosted', 'glass_tinted', 'screen_off']);
registerFamily('mat_plastic_rubber', 'Plastics & Rubber', ['plastic_black', 'plastic_gray', 'plastic_beige', 'plastic_white', 'rubber']);
registerFamily('mat_upholstery', 'Upholstery & Leather', ['fabric_gray', 'fabric_blue', 'leather_black']);
registerFamily('mat_paper_goods', 'Paper, Cardboard & Ceramic', ['paper', 'cardboard', 'ceramic']);
registerFamily('mat_emissive_set', 'Emissive Set', ['screen_glow', 'led_red', 'led_green', 'exit_sign', 'light_panel']);
