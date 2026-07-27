/**
 * generators.ts — procedural PBR field generators for every SurfaceKind.
 *
 * Each generator fills a set of full-resolution typed-array fields that all
 * derive from a SHARED underlying height/feature field, which is the key to
 * correlated maps (a crack is darker in albedo, deeper in the normal, occluded
 * in AO and rougher — because they all read the same masks). TextureForge then
 * turns `height` into a tangent-space normal map (Sobel) and a horizon-based AO
 * map, and packs roughness/metalness/AO into an ORM texture.
 *
 * Conventions:
 *  - Colours are stored LINEAR (compositing happens in linear light; the forge
 *    encodes to sRGB bytes at the end).
 *  - Coordinates are tile-space [0,1); all noise uses the seamlessly tileable
 *    variants so every texture wraps without seams.
 */

import {
  clamp01,
  lerp,
  smoothstep,
  hash1,
  hash2,
  fbm2Tile,
  fbm2Tile01,
  fbm2TileAniso,
  ridged2Tile,
  worley2Tile,
  domainWarp2Tile,
} from './noise';

// ---------------------------------------------------------------------------
// Surface catalogue
// ---------------------------------------------------------------------------

export type SurfaceKind =
  | 'concrete_cast'
  | 'concrete_rough'
  | 'asphalt'
  | 'sand_dune'
  | 'sand_gravel'
  | 'brick_clay'
  | 'plaster_painted'
  | 'metal_painted'
  | 'metal_rusted'
  | 'metal_brushed'
  | 'gun_metal'
  | 'gun_polymer'
  | 'wood_plank'
  | 'fabric_camo'
  | 'tile_ceramic'
  | 'dirt_ground'
  | 'corrugated_metal'
  | 'sandbag'
  | 'glass_dirty'
  | 'rubble';

export const SURFACE_KINDS: readonly SurfaceKind[] = [
  'concrete_cast',
  'concrete_rough',
  'asphalt',
  'sand_dune',
  'sand_gravel',
  'brick_clay',
  'plaster_painted',
  'metal_painted',
  'metal_rusted',
  'metal_brushed',
  'gun_metal',
  'gun_polymer',
  'wood_plank',
  'fabric_camo',
  'tile_ceramic',
  'dirt_ground',
  'corrugated_metal',
  'sandbag',
  'glass_dirty',
  'rubble',
];

// ---------------------------------------------------------------------------
// Buffer container
// ---------------------------------------------------------------------------

export interface SurfaceBuffers {
  size: number;
  /** Linear RGB, length size*size*3. */
  albedo: Float32Array;
  /** Height field [0,1] — source of the normal & displacement maps. */
  height: Float32Array;
  /** Roughness [0,1]. */
  roughness: Float32Array;
  /** Metalness [0,1]. */
  metalness: Float32Array;
  /** Extra baked occlusion multiplier [0,1] (crevice dirt, grout, etc.). */
  ao: Float32Array;
  /** Optional linear-RGB emissive, length size*size*3. */
  emissive?: Float32Array;
  /**
   * Physical peak-to-peak relief in METRES corresponding to a height delta of
   * 1.0. The forge turns this into a geometrically-correct tangent-space normal
   * using the real texel spacing (worldSize / size), so normal strength is
   * independent of texture resolution and reads as physical relief, not
   * sculpture. Real painted plaster ≈ 0.001–0.003 m; brick mortar ≈ 0.012 m.
   */
  heightScaleM: number;
  /** How strongly the computed horizon AO is applied (0..1). */
  aoStrength: number;
  /** Real-world metres represented by one tile (drives MaterialLibrary repeat). */
  worldSize: number;
  /** True when the material should be treated as transparent (glass). */
  transparent?: boolean;
}

function makeBuffers(size: number): SurfaceBuffers {
  const n = size * size;
  const albedo = new Float32Array(n * 3);
  const height = new Float32Array(n);
  const roughness = new Float32Array(n);
  const metalness = new Float32Array(n);
  const ao = new Float32Array(n);
  height.fill(0.5);
  roughness.fill(0.8);
  ao.fill(1);
  return {
    size,
    albedo,
    height,
    roughness,
    metalness,
    ao,
    heightScaleM: 0.004,
    aoStrength: 1,
    worldSize: 2,
  };
}

// ---------------------------------------------------------------------------
// Colour helpers (sRGB <-> linear); palettes are authored in sRGB hex.
// ---------------------------------------------------------------------------

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

type RGB = [number, number, number];

function hexLin(hex: number): RGB {
  return [
    srgbToLinear(((hex >> 16) & 255) / 255),
    srgbToLinear(((hex >> 8) & 255) / 255),
    srgbToLinear((hex & 255) / 255),
  ];
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function setA(alb: Float32Array, i: number, r: number, g: number, b: number): void {
  const j = i * 3;
  alb[j] = r;
  alb[j + 1] = g;
  alb[j + 2] = b;
}

/** Warm/cool cast: positive `w` warms (more red, less blue). */
function castRGB(r: number, g: number, b: number, w: number): RGB {
  return [r * (1 + 0.14 * w), g * (1 + 0.03 * w), b * (1 - 0.14 * w)];
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function generateSurface(kind: SurfaceKind, size: number, seed: number): SurfaceBuffers {
  switch (kind) {
    case 'concrete_cast':
      return genConcreteCast(size, seed);
    case 'concrete_rough':
      return genConcreteRough(size, seed);
    case 'asphalt':
      return genAsphalt(size, seed);
    case 'sand_dune':
      return genSandDune(size, seed);
    case 'sand_gravel':
      return genSandGravel(size, seed);
    case 'brick_clay':
      return genBrickClay(size, seed);
    case 'plaster_painted':
      return genPlasterPainted(size, seed);
    case 'metal_painted':
      return genMetalPainted(size, seed);
    case 'metal_rusted':
      return genMetalRusted(size, seed);
    case 'metal_brushed':
      return genMetalBrushed(size, seed);
    case 'gun_metal':
      return genGunMetal(size, seed);
    case 'gun_polymer':
      return genGunPolymer(size, seed);
    case 'wood_plank':
      return genWoodPlank(size, seed);
    case 'fabric_camo':
      return genFabricCamo(size, seed);
    case 'tile_ceramic':
      return genTileCeramic(size, seed);
    case 'dirt_ground':
      return genDirtGround(size, seed);
    case 'corrugated_metal':
      return genCorrugatedMetal(size, seed);
    case 'sandbag':
      return genSandbag(size, seed);
    case 'glass_dirty':
      return genGlassDirty(size, seed);
    case 'rubble':
      return genRubble(size, seed);
  }
}

// ---------------------------------------------------------------------------
// 1. concrete_cast
// ---------------------------------------------------------------------------

function genConcreteCast(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  // Poured concrete: broad tonal zones + a few features, low relief. Form-board
  // seams read as subtle horizontal banding, not deep grooves.
  b.heightScaleM = 0.004;
  b.aoStrength = 0.7;
  b.worldSize = 3;
  const base = hexLin(0x928f89);
  const boards = 4; // ~0.75m form-boards across a 3m tile — fewer, calmer bands
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 2, 0.05, seed + 11);
      const macro = fbm2Tile(w[0], w[1], 2, 3, 2, 0.5, seed + 1);
      const meso = fbm2Tile(u, v, 6, 3, 2, 0.5, seed + 2);
      const micro = fbm2Tile(u, v, 32, 2, 2, 0.5, seed + 3);

      // Form-board banding: a gentle tonal step at each board line, with only a
      // very shallow seam groove.
      const bf = v * boards;
      const seam = 1 - smoothstep(0.0, 0.02, Math.abs(bf - Math.round(bf)));
      const boardTone = (hash1(Math.floor(bf), seed + 4) - 0.5) * 0.05;

      // Air bubbles — rare, tiny.
      const wc = worley2Tile(u, v, 26, seed + 5);
      const bubble = hash1(wc.id ^ 0x55, seed + 6) < 0.12 ? 1 - smoothstep(0.0, 0.07, wc.f1) : 0;

      // Hairline cracks confined to a sparse region.
      const crackRegion = smoothstep(0.54, 0.7, fbm2Tile01(w[0], w[1], 3, 3, 2, 0.5, seed + 13));
      const crack = smoothstep(0.87, 0.96, ridged2Tile(w[0], w[1], 4, 3, 2, 0.55, seed + 7)) * crackRegion;

      // Water staining — vertical, subtle.
      const streak = fbm2TileAniso(u, v, 4, 2, 3, 2, 0.5, seed + 8) * 0.5 + 0.5;
      const stain = smoothstep(0.62, 0.88, streak) * 0.4;

      const h =
        0.55 + macro * 0.04 + meso * 0.025 + micro * 0.012 - seam * 0.05 - bubble * 0.14 - crack * 0.22;
      b.height[i] = clamp01(h);

      const val = macro * 0.13 + meso * 0.05 + micro * 0.015 + boardTone;
      let c = castRGB(base[0], base[1], base[2], macro * 0.5);
      let r = c[0] * (1 + val);
      let g = c[1] * (1 + val * 0.95);
      let bl = c[2] * (1 + val * 0.9);
      const dark = 1 - crack * 0.4 - bubble * 0.45 - seam * 0.06;
      r *= dark;
      g *= dark;
      bl *= dark;
      r = lerp(r, r * 0.74, stain);
      g = lerp(g, g * 0.76, stain);
      bl = lerp(bl, bl * 0.82, stain);
      setA(b.albedo, i, r, g, bl);

      b.ao[i] = clamp01(1 - seam * 0.15 - bubble * 0.5 - crack * 0.4 - stain * 0.08);
      // Roughness from an INDEPENDENT low/mid-freq basis (not a tinted albedo
      // copy) so broad polished/worn/damp zones create a travelling highlight.
      const rvar = fbm2Tile01(u + 0.37, v + 0.19, 5, 4, 2, 0.5, seed + 21);
      const worn = smoothstep(0.4, 0.7, rvar);
      b.roughness[i] = clamp01(
        lerp(0.92, 0.4, worn) - stain * 0.24 + crack * 0.05 + bubble * 0.08 + micro * 0.03
      );
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 2. concrete_rough — spalled, exposed aggregate, rebar rust, moss
// ---------------------------------------------------------------------------

function genConcreteRough(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.014;
  b.aoStrength = 1.0;
  b.worldSize = 2.5;
  const base = hexLin(0x86837c);
  const aggreg = hexLin(0x9a938a);
  const rust = hexLin(0x7a4b2c);
  const moss = hexLin(0x4c5433);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 3, 0.08, seed + 11);
      const macro = fbm2Tile(w[0], w[1], 2, 4, 2, 0.5, seed + 1);
      const meso = fbm2Tile(u, v, 8, 4, 2, 0.5, seed + 2);
      const micro = fbm2Tile(u, v, 30, 2, 2, 0.5, seed + 3);

      // Large spalled patches where the surface has broken away.
      const spallField = fbm2Tile01(w[0], w[1], 4, 4, 2, 0.55, seed + 4);
      const spall = smoothstep(0.42, 0.32, spallField); // low field ⇒ spalled

      // Exposed aggregate stones inside spalled zones.
      const agg = worley2Tile(u, v, 46, seed + 5);
      const stone = (1 - smoothstep(0.0, 0.22, agg.f1)) * spall;

      const crack = smoothstep(0.68, 0.88, ridged2Tile(w[0], w[1], 6, 4, 2, 0.55, seed + 7));

      // Rebar rust: drips downward from a few horizontal source bands.
      const srcBand = fbm2TileAniso(u, v, 3, 1, 3, 2, 0.5, seed + 8) * 0.5 + 0.5;
      const drip = fbm2TileAniso(u, v, 7, 2, 4, 2, 0.5, seed + 9) * 0.5 + 0.5;
      const rustMask =
        smoothstep(0.62, 0.85, srcBand) * smoothstep(0.45, 0.8, drip) * smoothstep(0.1, 0.6, v);

      // Moss in crevices (low height, damp).
      const mossMask = smoothstep(0.4, 0.15, spallField) * smoothstep(0.4, 0.7, fbm2Tile01(u, v, 6, 3, 2, 0.5, seed + 12));

      const h =
        0.6 + macro * 0.06 + meso * 0.05 + micro * 0.025 - spall * 0.2 + stone * 0.12 - crack * 0.3;
      b.height[i] = clamp01(h);

      const val = macro * 0.14 + meso * 0.08 + micro * 0.04;
      let c = mixRGB(base, aggreg, stone);
      let r = c[0] * (1 + val);
      let g = c[1] * (1 + val * 0.95);
      let bl = c[2] * (1 + val * 0.88);
      // spalled interior is a touch darker & warmer (fresh concrete dust)
      const sd = 1 - spall * 0.12;
      r *= sd;
      g *= sd;
      bl *= sd;
      c = [r, g, bl];
      c = mixRGB(c, rust, clamp01(rustMask));
      c = mixRGB(c, moss, clamp01(mossMask * 0.8));
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - spall * 0.4 - crack * 0.5 - mossMask * 0.2);
      const rvar = fbm2Tile01(u + 0.53, v + 0.11, 6, 4, 2, 0.5, seed + 21);
      const worn = smoothstep(0.4, 0.72, rvar);
      b.roughness[i] = clamp01(
        lerp(0.94, 0.48, worn) + spall * 0.08 + crack * 0.06 - stone * 0.16 + rustMask * 0.05 + mossMask * 0.1
      );
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 3. asphalt — aggregate in bitumen, polished tyre tracks, tar cracks, oil
// ---------------------------------------------------------------------------

function genAsphalt(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  // Asphalt is nearly flat at a few metres: aggregate is embedded in bitumen,
  // so almost all its "texture" lives in albedo/roughness, not in the normal.
  b.heightScaleM = 0.0012;
  b.aoStrength = 0.4;
  b.worldSize = 3;
  const bitumen = hexLin(0x272728);
  const bitumen2 = hexLin(0x323234); // repair-patch tone
  const stoneLo = hexLin(0x3b3936);
  const stoneHi = hexLin(0x524d47);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const macro = fbm2Tile(u, v, 2, 3, 2, 0.5, seed + 1);
      const micro = fbm2Tile(u, v, 40, 2, 2, 0.5, seed + 3);

      // Aggregate shows mostly as faint albedo/roughness speckle, only a whisper
      // of height — it is embedded, not sitting proud.
      const a1 = worley2Tile(u, v, 72, seed + 5);
      const aggregate = 1 - smoothstep(0.2, 0.5, a1.f1);
      const stoneShade = hash1(a1.id, seed + 7);

      // Repair patches: large regions of slightly different tone/roughness.
      const patch = smoothstep(0.58, 0.66, fbm2Tile01(u, v, 3, 3, 2, 0.55, seed + 11));

      // Tyre-polished wheel paths — two lanes, lower roughness, slightly darker.
      const lane = Math.abs(((u * 2) % 1) - 0.5);
      const polish = smoothstep(0.32, 0.12, lane) * (0.65 + 0.35 * (fbm2Tile(u, v, 4, 3, 2, 0.5, seed + 8) * 0.5 + 0.5));

      // Longitudinal cracks with tar sealant (run along the road = v axis).
      const crack = smoothstep(0.8, 0.93, ridged2Tile(u * 0.4, v, 3, 4, 2, 0.55, seed + 9));

      // Oil staining — dark, slightly glossy blotches.
      const oil = smoothstep(0.72, 0.88, fbm2Tile01(u, v, 5, 4, 2, 0.6, seed + 10));

      const h =
        0.5 + macro * 0.03 + micro * 0.02 + aggregate * 0.06 - crack * 0.12;
      b.height[i] = clamp01(h);

      // base bitumen, faintly lighter where a repair patch sits
      let c = mixRGB(bitumen, bitumen2, patch * 0.7);
      // aggregate: subtle grey fleck (albedo only)
      c = mixRGB(c, mixRGB(stoneLo, stoneHi, stoneShade), aggregate * 0.22);
      const val = 1 + macro * 0.06 + micro * 0.03;
      let r = c[0] * val;
      let g = c[1] * val;
      let bl = c[2] * val;
      // tar sealant in cracks: near-black, glossy
      r = lerp(r, bitumen[0] * 0.6, crack);
      g = lerp(g, bitumen[1] * 0.6, crack);
      bl = lerp(bl, bitumen[2] * 0.6, crack);
      // polished paths slightly darker (rubber sheen)
      const pk = 1 - polish * 0.12;
      r *= pk;
      g *= pk;
      bl *= pk;
      // oil darkens
      r = lerp(r, r * 0.7, oil);
      g = lerp(g, g * 0.68, oil);
      bl = lerp(bl, bl * 0.72, oil);
      setA(b.albedo, i, r, g, bl);

      b.ao[i] = clamp01(1 - crack * 0.12 - aggregate * 0.05);
      // Wide roughness swing so a specular band travels across the road: rough
      // weathered shoulder (~0.9) vs. tyre-polished wheel paths / oil (~0.32).
      const rvar = fbm2Tile01(u + 0.21, v + 0.63, 4, 3, 2, 0.5, seed + 21);
      let rough = lerp(0.8, 0.95, smoothstep(0.35, 0.7, rvar));
      rough = lerp(rough, 0.36, polish);
      rough = lerp(rough, 0.38, oil);
      rough = lerp(rough, 0.42, crack);
      b.roughness[i] = clamp01(rough + micro * 0.02 - patch * 0.05 - aggregate * 0.03);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 4. sand_dune — wind-rippled fine sand, sparse pebbles
// ---------------------------------------------------------------------------

function genSandDune(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.025;
  b.aoStrength = 0.6;
  b.worldSize = 2.5;
  const sandLo = hexLin(0xb59b6e);
  const sandHi = hexLin(0xd8c290);
  const pebble = hexLin(0x8c7b5c);
  const ripples = 13; // primary wind ripples (integer ⇒ tiles)
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // Two superimposed ripple sets at different frequencies/orientations plus
      // a strong phase warp, so the pattern never reads as a clean repeat.
      const w = domainWarp2Tile(u, v, 3, 0.05, seed + 11);
      const phase = fbm2Tile(w[0], w[1], 4, 3, 2, 0.5, seed + 1) * 1.4;
      const ripple = Math.sin((w[1] * ripples + phase) * Math.PI * 2);
      const rip = Math.sign(ripple) * Math.pow(Math.abs(ripple), 0.7);
      const ripple2 = Math.sin(((w[0] * 0.4 + w[1]) * 8 + phase * 0.7) * Math.PI * 2);
      const rip2 = ripple2 * 0.4;

      // Mid-scale dune undulation carries more energy than the macro tone now.
      const mid = fbm2Tile(u, v, 6, 3, 2, 0.5, seed + 4);
      const grain = fbm2Tile(u, v, 40, 2, 2, 0.5, seed + 3);
      // Deliberately LOW-contrast macro tone (this is what made tiling obvious).
      const macro = fbm2Tile(w[0], w[1], 2, 2, 2, 0.5, seed + 2);

      // Sparse small pebbles.
      const pc = worley2Tile(u, v, 30, seed + 5);
      const isPeb = hash1(pc.id, seed + 6) < 0.06;
      const peb = isPeb ? 1 - smoothstep(0.0, 0.16, pc.f1) : 0;

      const h = 0.5 + rip * 0.11 + rip2 * 0.05 + mid * 0.05 + grain * 0.02 + peb * 0.12;
      b.height[i] = clamp01(h);

      const val = macro * 0.06 + rip * 0.07 + rip2 * 0.03 + mid * 0.05 + grain * 0.05;
      let c = mixRGB(sandLo, sandHi, clamp01(0.5 + val));
      c = mixRGB(c, pebble, peb);
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - Math.max(0, -rip) * 0.12);
      // Loose sand is matte; wind-packed / damp patches take a low sheen.
      const rvar = fbm2Tile01(u + 0.6, v + 0.3, 4, 3, 2, 0.5, seed + 21);
      b.roughness[i] = clamp01(lerp(0.92, 0.72, smoothstep(0.45, 0.78, rvar)) + grain * 0.04 - peb * 0.3);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 5. sand_gravel — coarse gravel / rubble mix
// ---------------------------------------------------------------------------

function genSandGravel(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.03;
  b.aoStrength = 1.0;
  b.worldSize = 2;
  const dust = hexLin(0xa2906c);
  const palette: RGB[] = [
    hexLin(0x8f8577),
    hexLin(0x6f6455),
    hexLin(0xa89a82),
    hexLin(0x5c5346),
    hexLin(0x9b8f79),
  ];
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 6, 0.03, seed + 11);
      // Two gravel scales.
      const big = worley2Tile(w[0], w[1], 26, seed + 1);
      const small = worley2Tile(u, v, 60, seed + 2);
      const bigDome = 1 - smoothstep(0.0, 0.5, big.f1);
      const smallDome = 1 - smoothstep(0.0, 0.42, small.f1);
      const grain = fbm2Tile(u, v, 44, 2, 2, 0.5, seed + 3);

      const useSmall = smallDome > bigDome * 0.9;
      const dome = Math.max(bigDome, smallDome);
      const id = useSmall ? small.id : big.id;
      const pick = palette[id % palette.length];
      const shade = 0.85 + hash1(id, seed + 7) * 0.3;

      const h = 0.4 + dome * 0.4 + grain * 0.03;
      b.height[i] = clamp01(h);

      const dustMask = smoothstep(0.5, 0.15, dome);
      let c = mixRGB(
        [pick[0] * shade, pick[1] * shade, pick[2] * shade],
        dust,
        dustMask
      );
      const val = 1 + grain * 0.06;
      setA(b.albedo, i, c[0] * val, c[1] * val, c[2] * val);

      b.ao[i] = clamp01(0.55 + dome * 0.45);
      // Smooth polished pebble faces (dome high) drop toward ~0.55 against the
      // rough sandy fill (~0.9).
      b.roughness[i] = clamp01(0.9 - dome * 0.34 + grain * 0.05);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 6. brick_clay — running bond, per-brick colour, recessed mortar, chips
// ---------------------------------------------------------------------------

function genBrickClay(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.013;
  b.aoStrength = 0.85;
  b.worldSize = 2;
  const bricksX = 5; // ~0.4m bricks across a 2m tile (reads clearly)
  const bricksY = 15; // running bond, ~3:1 aspect incl. mortar
  const mortarCol = hexLin(0xa39a8c);
  const brickPal: RGB[] = [
    hexLin(0xa15a3c),
    hexLin(0xb56a44),
    hexLin(0x8f4a30),
    hexLin(0xbd7452),
    hexLin(0x7f4230),
    hexLin(0xa85e3e),
  ];
  const efflor = hexLin(0xcfcabe);
  const mw = 0.055; // mortar half-width fraction of a brick cell
  const mh = 0.11;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const row = Math.floor(v * bricksY);
      const offset = (row & 1) * 0.5;
      const colF = u * bricksX + offset;
      const col = Math.floor(colF);
      const cu = colF - col;
      const cv = v * bricksY - row;
      const brickId = (col * 73 + row * 131) | 0;

      // irregular mortar edges via noise-perturbed distance to cell border.
      const edgeN = fbm2Tile(u, v, 40, 2, 2, 0.5, seed + 20) * 0.02;
      const dU = Math.min(cu, 1 - cu) - edgeN;
      const dV = Math.min(cv, 1 - cv) - edgeN;
      const inMortarU = smoothstep(mw + 0.015, mw - 0.015, dU);
      const inMortarV = smoothstep(mh + 0.02, mh - 0.02, dV);
      const mortar = Math.max(inMortarU, inMortarV);

      // brick face surface
      const face = fbm2Tile(u, v, 24, 3, 2, 0.5, seed + 2);
      const brickTone = hash1(brickId, seed + 4);
      const pick = brickPal[Math.floor(brickTone * brickPal.length) % brickPal.length];
      const brickVal = (hash2(col, row, seed + 5) - 0.5) * 0.18;

      // chipped corners (expose lighter body)
      const cornerDist = Math.hypot(Math.min(cu, 1 - cu), Math.min(cv, 1 - cv));
      const chipNoise = fbm2Tile01(u, v, 18, 3, 2, 0.5, seed + 6);
      const chip = smoothstep(0.1, 0.03, cornerDist) * smoothstep(0.55, 0.72, chipNoise) * (1 - mortar);

      // efflorescence (whitish bloom), sparse
      const effMask = smoothstep(0.66, 0.85, fbm2Tile01(u, v, 6, 3, 2, 0.5, seed + 7));

      // mortar coarse texture
      const mortarTex = fbm2Tile(u, v, 70, 2, 2, 0.5, seed + 8);

      const brickH = 0.72 + face * 0.04 - chip * 0.14;
      const mortarH = 0.5 + mortarTex * 0.05;
      const h = lerp(brickH, mortarH, mortar);
      b.height[i] = clamp01(h);

      let c: RGB = [
        pick[0] * (1 + brickVal + face * 0.1),
        pick[1] * (1 + brickVal + face * 0.08),
        pick[2] * (1 + brickVal + face * 0.06),
      ];
      // chip exposes lighter, desaturated body
      c = mixRGB(c, [c[0] * 1.35 + 0.02, c[1] * 1.28 + 0.02, c[2] * 1.2 + 0.02], chip * 0.7);
      // mortar
      c = mixRGB(
        c,
        [mortarCol[0] * (1 + mortarTex * 0.12), mortarCol[1] * (1 + mortarTex * 0.12), mortarCol[2] * (1 + mortarTex * 0.12)],
        mortar
      );
      // efflorescence bloom on brick faces
      c = mixRGB(c, efflor, clamp01(effMask * (1 - mortar) * 0.45));
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - mortar * 0.45 - chip * 0.2);
      const rvar = fbm2Tile01(u + 0.31, v + 0.62, 5, 3, 2, 0.5, seed + 21);
      const faceR = lerp(0.5, 0.74, smoothstep(0.4, 0.72, rvar));
      b.roughness[i] = clamp01(lerp(faceR + face * 0.05, 0.92 + mortarTex * 0.04, mortar) + chip * 0.08 + effMask * 0.05);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 7. plaster_painted — paint over plaster over brick (3 strata) + bullet pocks
// ---------------------------------------------------------------------------

function genPlasterPainted(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  // Painted stucco is very flat: ~0.5–2 mm of relief. heightScaleM 0.0025 m for
  // the full 0..1 range keeps even the peel steps to ~0.5 mm.
  b.heightScaleM = 0.0025;
  b.aoStrength = 0.6;
  b.worldSize = 2.5;
  const paint = hexLin(0xccc3ac); // sun-bleached pale (warm off-white)
  const plasterCol = hexLin(0xc0b79e); // grey-beige plaster body (close to paint)
  const brickCol = hexLin(0x9c6b54); // dusty, muted brick
  const dirtCol = hexLin(0x6a5f4b);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // (a) very fine sand-grain stipple
      const stip = fbm2Tile01(u, v, 80, 2, 2, 0.5, seed + 2);
      // (b) faint trowel/float swirls at ~30 cm scale (worldSize 2.5 m → ~8 cyc)
      const sw = domainWarp2Tile(u, v, 4, 0.09, seed + 11);
      const swirl = fbm2Tile(sw[0], sw[1], 6, 3, 2, 0.5, seed + 3);
      // (c) sparse, sharp-edged peeling patches (~10% coverage), with coverage
      // itself modulated by a lower-frequency field so some areas are clean and
      // others weathered (less obvious tiling than uniform blobs).
      const pw = domainWarp2Tile(u, v, 4, 0.06, seed + 12);
      const peelBias = fbm2Tile01(u, v, 2, 2, 2, 0.5, seed + 14) * 0.1;
      const peelField = fbm2Tile01(pw[0], pw[1], 5, 4, 2, 0.55, seed + 4) + peelBias;
      const peel = smoothstep(0.66, 0.71, peelField);
      const brickDeep = smoothstep(0.86, 0.9, peelField);
      // faint brick lattice for the deep spots
      const brow = Math.floor(v * 24);
      const bcol = Math.floor(u * 8 + (brow & 1) * 0.5);
      const bmU = (u * 8 + (brow & 1) * 0.5) % 1;
      const bmV = (v * 24) % 1;
      const bmMort = Math.max(
        smoothstep(0.09, 0.03, Math.min(bmU, 1 - bmU)),
        smoothstep(0.16, 0.06, Math.min(bmV, 1 - bmV))
      );
      const brickShade = 1 + (hash2(bcol, brow, seed + 5) - 0.5) * 0.2;
      // (f) hairline cracks, confined to a sparse crack region
      const crackRegion = smoothstep(0.55, 0.7, fbm2Tile01(u, v, 3, 3, 2, 0.5, seed + 13));
      const crack = smoothstep(0.86, 0.96, ridged2Tile(u, v, 5, 4, 2, 0.55, seed + 7)) * crackRegion;
      // (d) vertical water staining (streaks run down, seamlessly)
      const streak = fbm2TileAniso(u, v, 6, 2, 4, 2, 0.5, seed + 8) * 0.5 + 0.5;
      const stain = smoothstep(0.66, 0.9, streak) * 0.3;
      // (e) grime accumulation in low/peeled/cracked areas (tiling-safe surrogate
      // for base-of-wall dirt, which the level applies in world space)
      const grime = clamp01(peel * 0.3 + crack * 0.5 + stain * 0.6);

      let h =
        0.62 +
        swirl * 0.06 +
        (stip - 0.5) * 0.06 -
        peel * 0.22 -
        brickDeep * (0.1 + bmMort * 0.12) -
        crack * 0.3;
      b.height[i] = clamp01(h);

      // albedo: uniform paint base with subtle hue + value variation
      let c = castRGB(paint[0], paint[1], paint[2], swirl * 0.35);
      const val = 1 + swirl * 0.05 + (stip - 0.5) * 0.03;
      c = [c[0] * val, c[1] * val, c[2] * val];
      // peel → grey plaster (subtle); deep peel → dusty brick with mortar
      c = mixRGB(c, [plasterCol[0] * (1 + (stip - 0.5) * 0.04), plasterCol[1] * (1 + (stip - 0.5) * 0.04), plasterCol[2] * (1 + (stip - 0.5) * 0.04)], peel * 0.85);
      const brickTone = mixRGB([brickCol[0] * brickShade, brickCol[1] * brickShade, brickCol[2] * brickShade], plasterCol, bmMort * 0.6);
      c = mixRGB(c, brickTone, brickDeep * 0.75);
      // water stain: slightly darker/cooler
      c = [lerp(c[0], c[0] * 0.82, stain), lerp(c[1], c[1] * 0.83, stain), lerp(c[2], c[2] * 0.86, stain)];
      // grime tint
      c = mixRGB(c, dirtCol, grime * 0.4);
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - peel * 0.15 - crack * 0.4 - brickDeep * bmMort * 0.35 - grime * 0.1);
      // Painted stucco keeps a soft eggshell sheen (~0.5), exposed plaster/brick
      // is matte-rough (~0.9); an independent field varies the sheen wall-to-wall.
      const rvar = fbm2Tile01(u + 0.44, v + 0.72, 4, 3, 2, 0.5, seed + 21);
      const paintGloss = lerp(0.46, 0.62, smoothstep(0.4, 0.72, rvar));
      b.roughness[i] = clamp01(
        lerp(paintGloss, 0.9, peel * 0.9) + brickDeep * 0.05 + crack * 0.08 - stain * 0.05
      );
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 8. metal_painted — painted steel, chipping to primer/metal, drip rust
// ---------------------------------------------------------------------------

function genMetalPainted(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.003;
  b.aoStrength = 0.8;
  b.worldSize = 1.5;
  const paint = hexLin(0x37503f); // olive drab
  const primer = hexLin(0x7a5240);
  const metal = hexLin(0x8a8c90);
  const rust = hexLin(0x6f4126);
  const bolts = 4;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // thin directional scratches (run horizontally along the panel); sparse
      const scratch = fbm2TileAniso(u, v, 2, 90, 2, 2, 0.5, seed + 3);
      const scr = smoothstep(0.72, 0.95, Math.abs(scratch));

      const wear = fbm2Tile01(u, v, 4, 4, 2, 0.55, seed + 1);
      const fine = fbm2Tile01(u, v, 40, 2, 2, 0.5, seed + 2);
      const paintMottle = fbm2Tile(u, v, 7, 3, 2, 0.5, seed + 12);

      // bolts on a grid
      const bu = u * bolts;
      const bv = v * bolts;
      const bd = Math.hypot(bu - Math.floor(bu) - 0.5, bv - Math.floor(bv) - 0.5);
      const bolt = smoothstep(0.12, 0.08, bd);
      const boltId = Math.floor(bu) * 17 + Math.floor(bv) * 31;

      // paint chips only at strong wear zones, scratch cores and bolt rims
      const chipBase = smoothstep(0.74, 0.86, wear);
      const chip = clamp01(chipBase + scr * 0.35 + smoothstep(0.14, 0.1, bd) * 0.5);
      const primerMask = smoothstep(0.25, 0.55, chip) * (1 - smoothstep(0.75, 0.95, chip));
      const metalMask = smoothstep(0.8, 0.95, chip);

      // rust drips downward from bolts & chips
      const dripField = fbm2TileAniso(u, v, 6, 2, 4, 2, 0.5, seed + 8) * 0.5 + 0.5;
      const boltRust = hash1(boltId, seed + 9) < 0.45 ? smoothstep(0.55, 0.95, bv - Math.floor(bv)) * smoothstep(0.28, 0.12, bd) : 0;
      const rustMask = clamp01(
        smoothstep(0.72, 0.9, dripField) * smoothstep(0.7, 0.88, wear) * 0.7 + boltRust * 0.7
      );

      const h =
        0.62 + fine * 0.015 - scr * 0.02 + bolt * 0.14 - chip * 0.02;
      b.height[i] = clamp01(h);

      let c: RGB = [paint[0] * (1 + paintMottle * 0.12), paint[1] * (1 + paintMottle * 0.1), paint[2] * (1 + paintMottle * 0.1)];
      c = mixRGB(c, primer, primerMask);
      c = mixRGB(c, metal, metalMask);
      c = mixRGB(c, rust, rustMask * 0.85);
      const val = 1 - scr * 0.06;
      c = [c[0] * val, c[1] * val, c[2] * val];
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - bolt * 0.12 - rustMask * 0.08);
      // Semi-gloss enamel paint (~0.38–0.5), bare worn metal smooth & reflective
      // (~0.28), rust matte-rough (~0.95). Independent field varies paint sheen.
      const rvar = fbm2Tile01(u + 0.29, v + 0.51, 5, 3, 2, 0.5, seed + 21);
      const paintR = lerp(0.36, 0.5, smoothstep(0.4, 0.7, rvar));
      b.roughness[i] = clamp01(
        lerp(paintR, 0.28, metalMask) + primerMask * 0.25 + rustMask * 0.5 + scr * 0.05 - bolt * 0.04
      );
      b.metalness[i] = clamp01(metalMask * 0.92 - rustMask * 0.7);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 9. metal_rusted — heavy corrosion, pitting, scale flaking
// ---------------------------------------------------------------------------

function genMetalRusted(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.012;
  b.aoStrength = 1.0;
  b.worldSize = 1.5;
  const rustDark = hexLin(0x4a2a18);
  const rustMid = hexLin(0x8a4b28);
  const rustLite = hexLin(0xb0713d);
  const metal = hexLin(0x6b6660);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 4, 0.06, seed + 11);
      const macro = fbm2Tile01(w[0], w[1], 3, 5, 2, 0.55, seed + 1);
      const mid = fbm2Tile01(u, v, 12, 4, 2, 0.5, seed + 2);
      const micro = fbm2Tile01(u, v, 50, 3, 2, 0.5, seed + 3);

      // scale flaking: worley cells raised into plates that break at edges
      const flake = worley2Tile(w[0], w[1], 20, seed + 4);
      const plate = smoothstep(0.05, 0.3, flake.f2 - flake.f1); // interior=1, edges=0
      const plateH = plate * (0.4 + hash1(flake.id, seed + 5) * 0.6);

      // deep pitting
      const pit = worley2Tile(u, v, 40, seed + 6);
      const pitMask = (1 - smoothstep(0.0, 0.18, pit.f1)) * (hash1(pit.id, seed + 7) < 0.4 ? 1 : 0);

      // small amount of dark, slightly shinier bare metal in worn high spots
      const metalMask = smoothstep(0.82, 0.93, macro) * (1 - pitMask);

      const rustBlend = clamp01(macro * 0.55 + mid * 0.32 + micro * 0.13);
      let c = mixRGB(rustDark, rustMid, smoothstep(0.2, 0.55, rustBlend));
      c = mixRGB(c, rustLite, smoothstep(0.55, 0.88, rustBlend));
      c = mixRGB(c, metal, metalMask * 0.7);

      const h = 0.5 + plateH * 0.14 + micro * 0.03 + mid * 0.04 - pitMask * 0.3;
      b.height[i] = clamp01(h);
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - pitMask * 0.6 - (1 - plate) * 0.15);
      // Corroded iron is rough (~0.85–0.98); worn high-spots expose smoother,
      // more reflective bare metal (~0.4) so grazing light catches the edges.
      b.roughness[i] = clamp01(lerp(0.88 + macro * 0.1, 0.4, metalMask) + pitMask * 0.06 - mid * 0.05);
      b.metalness[i] = clamp01(metalMask * 0.6);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 10. metal_brushed — anisotropic brushed steel, fingerprints
// ---------------------------------------------------------------------------

function genMetalBrushed(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.0006;
  b.aoStrength = 0.4;
  b.worldSize = 1;
  const steel = hexLin(0xb9bcc0);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // horizontal brushing: fine variation ACROSS the grain (y), smooth ALONG it (x).
      // Kept below Nyquist (single octave) to avoid moiré aliasing.
      const brush = fbm2TileAniso(u, v, 2, 96, 1, 2, 0.6, seed + 1);
      const brush2 = fbm2TileAniso(u, v, 3, 44, 1, 2, 0.6, seed + 2);
      const macro = fbm2Tile01(u, v, 3, 3, 2, 0.5, seed + 3);

      // occasional deeper drag scratches, also horizontal
      const deep = smoothstep(0.86, 0.98, Math.abs(fbm2TileAniso(u, v, 1, 120, 1, 2, 0.5, seed + 4)));

      // greasy fingerprint smudges (soft, low frequency)
      const fp = worley2Tile(u, v, 5, seed + 5);
      const finger =
        hash1(fp.id, seed + 6) < 0.3
          ? smoothstep(0.32, 0.08, fp.f1) * (0.5 + 0.5 * fbm2Tile01(u, v, 24, 2, 2, 0.5, seed + 7))
          : 0;

      const h = 0.5 + brush * 0.02 + brush2 * 0.012 - deep * 0.04;
      b.height[i] = clamp01(h);

      const val = 1 + macro * 0.04 + brush * 0.05;
      let r = steel[0] * val;
      let g = steel[1] * val;
      let bl = steel[2] * val;
      r *= 1 - finger * 0.07;
      g *= 1 - finger * 0.07;
      bl *= 1 - finger * 0.09;
      setA(b.albedo, i, r, g, bl);

      b.ao[i] = 1;
      // anisotropic feel approximated: roughness modulated along the brush grain
      b.roughness[i] = clamp01(0.2 + Math.abs(brush) * 0.14 + macro * 0.04 + finger * 0.3 + deep * 0.12);
      b.metalness[i] = 1;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 11. gun_metal — parkerized phosphate finish, fine grain, edge wear
// ---------------------------------------------------------------------------

function genGunMetal(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.0005;
  b.aoStrength = 0.5;
  b.worldSize = 0.3;
  const park = hexLin(0x2a2c2e); // dark grey-black phosphate
  const worn = hexLin(0x6a6c70); // exposed steel
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // fine phosphate grain (kept below Nyquist to avoid sparkle)
      const grain = fbm2Tile01(u, v, 64, 3, 2, 0.5, seed + 1);
      const micro = worley2Tile(u, v, 100, seed + 2).f1;
      // wear pattern (edges / high-contact zones)
      const wear = fbm2Tile01(u, v, 6, 4, 2, 0.55, seed + 3);
      const scratch = smoothstep(0.72, 0.92, Math.abs(fbm2TileAniso(u, v, 90, 6, 1, 2, 0.5, seed + 4)));
      const wornMask = clamp01(smoothstep(0.68, 0.82, wear) + scratch * 0.5);

      const h = 0.5 + (grain - 0.5) * 0.05 + (0.5 - micro) * 0.04;
      b.height[i] = clamp01(h);

      let c = mixRGB(park, worn, wornMask);
      const val = 1 + (grain - 0.5) * 0.12;
      setA(b.albedo, i, c[0] * val, c[1] * val, c[2] * val);

      b.ao[i] = 1;
      // Matte parkerized phosphate (~0.6) vs. smooth reflective worn steel (~0.22).
      b.roughness[i] = clamp01(lerp(0.62, 0.22, wornMask) + (grain - 0.5) * 0.1);
      b.metalness[i] = clamp01(0.85 + wornMask * 0.15);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 12. gun_polymer — moulded polymer, stipple/checkering, mould seam
// ---------------------------------------------------------------------------

function genGunPolymer(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.0015;
  b.aoStrength = 0.7;
  b.worldSize = 0.3;
  const poly = hexLin(0x26282b);
  const check = 16; // checkering diamonds across the tile
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // checkering region on the left half, stipple on the right
      const region = smoothstep(0.46, 0.5, fbm2Tile01(u, v, 3, 2, 2, 0.5, seed + 5));

      // diamond checkering (two rotated square waves)
      const a = (u + v) * check;
      const bb = (u - v) * check;
      const diamond =
        (0.5 + 0.5 * Math.cos(a * Math.PI * 2)) * (0.5 + 0.5 * Math.cos(bb * Math.PI * 2));
      const checker = Math.pow(diamond, 0.6);

      // fine stipple (dense bumps)
      const stip = worley2Tile(u, v, 54, seed + 1);
      const stipple = 1 - smoothstep(0.0, 0.5, stip.f1);

      const micro = fbm2Tile01(u, v, 40, 2, 2, 0.5, seed + 2);

      // vertical mould seam line
      const seam = smoothstep(0.006, 0.0, Math.abs(u - 0.5));

      const relief = lerp(stipple, checker, region);
      const h = 0.5 + relief * 0.14 + (micro - 0.5) * 0.02 + seam * 0.05;
      b.height[i] = clamp01(h);

      const val = 1 + (micro - 0.5) * 0.08 + relief * 0.06;
      setA(b.albedo, i, poly[0] * val, poly[1] * val, poly[2] * val);

      b.ao[i] = clamp01(1 - (1 - relief) * 0.2);
      b.roughness[i] = clamp01(0.46 - relief * 0.05 + (micro - 0.5) * 0.05);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 13. wood_plank — weathered timber, grain, knots, splits, nails
// ---------------------------------------------------------------------------

function genWoodPlank(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.007;
  b.aoStrength = 0.9;
  b.worldSize = 2;
  const planks = 5;
  const woodLo = hexLin(0x5c4a34);
  const woodHi = hexLin(0x8a7350);
  const woodGrey = hexLin(0x8d857a);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const pf = v * planks;
      const plank = Math.floor(pf);
      const pv = pf - plank;
      const plankShift = hash1(plank, seed + 10);
      const gap = smoothstep(0.04, 0.01, Math.min(pv, 1 - pv));

      // grain: rings running along the plank (u axis), warped
      const w = domainWarp2Tile(u + plankShift, v, 8, 0.02, seed + 1);
      const ring = fbm2TileAniso(w[0], w[1], 4, 30, 2, 2, 0.5, seed + 2);
      const grain = 0.5 + 0.5 * Math.sin((ring * 6 + w[0] * 8) * Math.PI);
      const fine = fbm2TileAniso(u, v, 110, 6, 1, 2, 0.5, seed + 3);

      // knots
      const kn = worley2Tile(u + plankShift * 3.7, v, 6, seed + 4);
      const isKnot = hash1(kn.id, seed + 5) < 0.12;
      const knot = isKnot ? smoothstep(0.18, 0.0, kn.f1) : 0;

      // splits along grain
      const split = smoothstep(0.82, 0.95, ridged2Tile(w[0], w[1] * 0.3 + 0.0, 4, 3, 2, 0.5, seed + 6));

      // nails near plank ends
      const nailU = Math.abs(u - 0.5);
      const nail = (nailU > 0.4 ? smoothstep(0.03, 0.0, Math.hypot((u % 0.25) - 0.125, pv - 0.3)) : 0);

      const grey = smoothstep(0.4, 0.7, fbm2Tile01(u, v, 3, 3, 2, 0.5, seed + 7)); // weathering
      const plankTone = (plankShift - 0.5) * 0.2;

      const h =
        0.62 + (grain - 0.5) * 0.05 + fine * 0.02 - gap * 0.4 - knot * 0.1 - split * 0.18 - nail * 0.3;
      b.height[i] = clamp01(h);

      let c = mixRGB(woodLo, woodHi, grain);
      c = [c[0] * (1 + plankTone), c[1] * (1 + plankTone), c[2] * (1 + plankTone)];
      c = mixRGB(c, woodGrey, grey * 0.55);
      // knot darker
      c = mixRGB(c, [c[0] * 0.4, c[1] * 0.35, c[2] * 0.3], knot);
      // gaps & splits darker
      const dk = 1 - gap * 0.6 - split * 0.5;
      c = [c[0] * dk, c[1] * dk, c[2] * dk];
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - gap * 0.6 - split * 0.4 - knot * 0.2 - nail * 0.3);
      const rvar = fbm2Tile01(u + 0.27, v + 0.44, 5, 3, 2, 0.5, seed + 21);
      b.roughness[i] = clamp01(lerp(0.55, 0.9, smoothstep(0.35, 0.72, rvar)) + split * 0.06 + grey * 0.06 - (grain - 0.5) * 0.05);
      b.metalness[i] = clamp01(nail * 0.8);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 14. fabric_camo — multicam-style pattern + ripstop weave normal
// ---------------------------------------------------------------------------

function genFabricCamo(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.0012;
  b.aoStrength = 0.4;
  b.worldSize = 1.4;
  // multicam-ish palette (light tan dominant)
  const tan = hexLin(0xc3b389);
  const paleGreen = hexLin(0xa7a377);
  const brown = hexLin(0x8a6f48);
  const darkBrown = hexLin(0x5a482f);
  const green = hexLin(0x717a52);
  const pale = hexLin(0xd7cca6);
  const grid = 40; // ripstop grid across tile
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // warped masks at multicam organic scale (large, soft blobs)
      const w1 = domainWarp2Tile(u, v, 2, 0.14, seed + 11);
      const base = fbm2Tile01(w1[0], w1[1], 2, 4, 2, 0.55, seed + 1);
      const w2 = domainWarp2Tile(u, v, 3, 0.12, seed + 12);
      const blob = fbm2Tile01(w2[0], w2[1], 3, 4, 2, 0.55, seed + 2);
      const spot = fbm2Tile01(u + 0.3, v, 5, 4, 2, 0.55, seed + 3);

      // layer the palette (multicam: tan/green base, brown blobs, dark & pale specks)
      let c = mixRGB(tan, paleGreen, smoothstep(0.42, 0.62, base));
      c = mixRGB(c, green, smoothstep(0.64, 0.8, base));
      c = mixRGB(c, brown, smoothstep(0.55, 0.7, blob));
      c = mixRGB(c, darkBrown, smoothstep(0.76, 0.88, blob));
      c = mixRGB(c, pale, smoothstep(0.8, 0.92, spot) * 0.8);
      c = mixRGB(c, darkBrown, smoothstep(0.88, 0.96, 1 - spot) * 0.4);

      // ripstop grid: thicker reinforcement threads on a grid + plain weave
      const gu = (u * grid) % 1;
      const gv = (v * grid) % 1;
      const ripU = smoothstep(0.12, 0.0, Math.min(gu, 1 - gu));
      const ripV = smoothstep(0.12, 0.0, Math.min(gv, 1 - gv));
      const weave = 0.5 + 0.5 * Math.cos(u * grid * 4 * Math.PI) * (((Math.floor(v * grid * 2) & 1) ? 1 : -1));
      const weaveV = 0.5 + 0.5 * Math.cos(v * grid * 4 * Math.PI) * (((Math.floor(u * grid * 2) & 1) ? 1 : -1));
      const microThread = (weave + weaveV) * 0.5;

      const h = 0.5 + (ripU + ripV) * 0.06 + (microThread - 0.5) * 0.06;
      b.height[i] = clamp01(h);

      // subtle shading from weave so cloth isn't flat
      const shade = 1 + (microThread - 0.5) * 0.1 + (ripU + ripV) * 0.03;
      setA(b.albedo, i, c[0] * shade, c[1] * shade, c[2] * shade);

      b.ao[i] = clamp01(1 - (1 - microThread) * 0.12);
      // Worn/compacted fabric picks up a slight fibre sheen; deep weave stays matte.
      const rvar = fbm2Tile01(u + 0.19, v + 0.83, 5, 3, 2, 0.5, seed + 21);
      const sheen = smoothstep(0.5, 0.8, rvar);
      b.roughness[i] = clamp01(lerp(0.9, 0.58, sheen) - (ripU + ripV) * 0.04 + (microThread - 0.5) * 0.03);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 15. tile_ceramic — glazed tile, grout, chips, high specular
// ---------------------------------------------------------------------------

function genTileCeramic(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.007;
  b.aoStrength = 1.0;
  b.worldSize = 1.2;
  const tiles = 5;
  const grout = hexLin(0x8f877a);
  const palette: RGB[] = [
    hexLin(0xd8d2c6),
    hexLin(0xc9cdd0),
    hexLin(0xccd6d2),
    hexLin(0xd6ccc0),
  ];
  const gw = 0.05;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const tu = u * tiles;
      const tv = v * tiles;
      const cu = tu - Math.floor(tu);
      const cv = tv - Math.floor(tv);
      const tileId = Math.floor(tu) * 31 + Math.floor(tv) * 57;
      const dU = Math.min(cu, 1 - cu);
      const dV = Math.min(cv, 1 - cv);
      const groutMask = clamp01(smoothstep(gw, gw - 0.02, dU) + smoothstep(gw, gw - 0.02, dV));

      const groutTex = fbm2Tile01(u, v, 48, 2, 2, 0.5, seed + 2);
      // gentle glaze waviness across each tile
      const glaze = fbm2Tile(u, v, 8, 3, 2, 0.5, seed + 3);
      // chips at tile edges
      const edge = Math.min(dU, dV);
      const chip = smoothstep(0.09, 0.05, edge) * smoothstep(0.55, 0.72, fbm2Tile01(u, v, 24, 3, 2, 0.5, seed + 4)) * (1 - groutMask);

      const pick = palette[Math.abs(tileId) % palette.length];
      const tint = 1 + (hash1(tileId, seed + 5) - 0.5) * 0.08;

      const tileH = 0.72 + glaze * 0.02;
      const groutH = 0.45 + groutTex * 0.05;
      const h = lerp(tileH, groutH, groutMask) - chip * 0.12;
      b.height[i] = clamp01(h);

      let c: RGB = [pick[0] * tint, pick[1] * tint, pick[2] * tint];
      c = mixRGB(c, [grout[0] * (1 + groutTex * 0.15), grout[1] * (1 + groutTex * 0.15), grout[2] * (1 + groutTex * 0.15)], groutMask);
      // chip exposes matte lighter body
      c = mixRGB(c, [0.75, 0.72, 0.68], chip * 0.6);
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - groutMask * 0.5 - chip * 0.2);
      b.roughness[i] = clamp01(lerp(0.08, 0.9, groutMask) + chip * 0.7 + Math.abs(glaze) * 0.02);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 16. dirt_ground — packed dirt, stones, mud cracks, tyre ruts
// ---------------------------------------------------------------------------

function genDirtGround(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.025;
  b.aoStrength = 0.9;
  b.worldSize = 3;
  const dirtLo = hexLin(0x4d3d29);
  const dirtHi = hexLin(0x77603f);
  const stone = hexLin(0x8a8171);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 4, 0.05, seed + 11);
      const macro = fbm2Tile01(w[0], w[1], 3, 4, 2, 0.55, seed + 1);
      const micro = fbm2Tile01(u, v, 40, 3, 2, 0.5, seed + 2);

      // dried mud cracks (worley edges)
      const mc = worley2Tile(w[0], w[1], 12, seed + 3);
      const crack = smoothstep(0.06, 0.0, mc.f2 - mc.f1);

      // embedded small stones
      const st = worley2Tile(u, v, 55, seed + 4);
      const isStone = hash1(st.id, seed + 5) < 0.18;
      const stoneMask = isStone ? 1 - smoothstep(0.0, 0.2, st.f1) : 0;

      // tyre ruts — two broad shallow depressions with a faint tread ripple
      const lane = Math.abs(((u * 2 + 0.25) % 1) - 0.5);
      const rut = smoothstep(0.3, 0.12, lane);
      const tread = 0.5 + 0.5 * Math.sin(v * 16 * Math.PI);

      const h =
        0.55 + macro * 0.06 + micro * 0.02 + stoneMask * 0.12 - crack * 0.18 - rut * 0.06 + (tread - 0.5) * 0.015 * rut;
      b.height[i] = clamp01(h);

      let c = mixRGB(dirtLo, dirtHi, macro * 0.7 + micro * 0.3);
      c = mixRGB(c, stone, stoneMask * (0.6 + hash1(st.id, seed + 6) * 0.4));
      const dk = 1 - crack * 0.5 - rut * 0.15;
      setA(b.albedo, i, c[0] * dk, c[1] * dk, c[2] * dk);

      b.ao[i] = clamp01(1 - crack * 0.55 - rut * 0.15);
      // Dry loose dirt is matte (~0.9); damp/compacted patches take a low-gloss
      // sheen (~0.6) and embedded stones are smoother.
      const rvar = fbm2Tile01(u + 0.42, v + 0.16, 5, 3, 2, 0.5, seed + 21);
      b.roughness[i] = clamp01(lerp(0.92, 0.6, smoothstep(0.5, 0.8, rvar)) - stoneMask * 0.2 + crack * 0.05);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 17. corrugated_metal — sinusoidal roofing, rust, dents
// ---------------------------------------------------------------------------

function genCorrugatedMetal(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.05;
  b.aoStrength = 0.9;
  b.worldSize = 2;
  const galv = hexLin(0x949899);
  const galv2 = hexLin(0x7f8688);
  const rust = hexLin(0x7a4326);
  const corr = 10; // corrugations across the tile
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const wave = 0.5 + 0.5 * Math.sin(u * corr * Math.PI * 2);
      const macro = fbm2Tile01(u, v, 4, 4, 2, 0.5, seed + 1);
      const micro = fbm2Tile01(u, v, 36, 2, 2, 0.5, seed + 2);

      // dents (low-freq denting)
      const dent = fbm2Tile(u, v, 8, 3, 2, 0.5, seed + 3) * 0.5;

      // rust streaks running down (v), stronger in valleys
      const valley = 1 - wave;
      const streak = fbm2TileAniso(u, v, 10, 2, 4, 2, 0.5, seed + 4) * 0.5 + 0.5;
      const rustMask = clamp01(smoothstep(0.55, 0.85, streak) * (0.4 + valley * 0.6) * smoothstep(0.35, 0.75, macro));

      const h = 0.5 + (wave - 0.5) * 0.5 + dent * 0.06 + micro * 0.01;
      b.height[i] = clamp01(h);

      let c = mixRGB(galv2, galv, wave);
      c = mixRGB(c, rust, rustMask * 0.85);
      const val = 1 + macro * 0.06;
      setA(b.albedo, i, c[0] * val, c[1] * val, c[2] * val);

      b.ao[i] = clamp01(1 - valley * 0.2 - rustMask * 0.1);
      // Painted galvanised sheet keeps a semi-gloss (~0.32); rust is matte-rough.
      b.roughness[i] = clamp01(0.32 + macro * 0.1 + rustMask * 0.52 + micro * 0.04);
      b.metalness[i] = clamp01(0.9 - rustMask * 0.75);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 18. sandbag — hessian burlap weave, bag bulge
// ---------------------------------------------------------------------------

function genSandbag(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.02;
  b.aoStrength = 0.85;
  b.worldSize = 0.5;
  const burlapLo = hexLin(0x8a7550);
  const burlapHi = hexLin(0xb49c6e);
  const threads = 26; // burlap threads across the tile
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // plain weave: over/under alternates per crossing
      const tu = u * threads;
      const tv = v * threads;
      const su = 0.5 + 0.5 * Math.cos(tu * Math.PI * 2);
      const sv = 0.5 + 0.5 * Math.cos(tv * Math.PI * 2);
      const parity = (Math.floor(tu) + Math.floor(tv)) & 1;
      const top = parity ? su : sv;
      const bot = parity ? sv : su;
      const weaveH = top * 0.8 + bot * 0.2;

      // fibre fuzz
      const fuzz = fbm2Tile01(u, v, 90, 2, 2, 0.5, seed + 2);
      // bag bulge (low freq) — big soft lumps
      const bulge = fbm2Tile(u, v, 3, 3, 2, 0.5, seed + 1) * 0.5 + 0.5;
      // dusty staining
      const dust = fbm2Tile01(u, v, 6, 3, 2, 0.5, seed + 3);

      const h = 0.35 + weaveH * 0.25 + (bulge - 0.5) * 0.2 + (fuzz - 0.5) * 0.03;
      b.height[i] = clamp01(h);

      let c = mixRGB(burlapLo, burlapHi, clamp01(weaveH * 0.7 + bulge * 0.3));
      const dk = 1 - dust * 0.12;
      c = [c[0] * dk, c[1] * dk, c[2] * dk];
      // thread shading
      const shade = 1 + (weaveH - 0.5) * 0.25;
      setA(b.albedo, i, c[0] * shade, c[1] * shade, c[2] * shade);

      b.ao[i] = clamp01(0.7 + weaveH * 0.3 - (1 - bulge) * 0.1);
      // Burlap is matte, but wear-polished high threads catch a faint sheen.
      const rvar = fbm2Tile01(u + 0.71, v + 0.28, 5, 3, 2, 0.5, seed + 21);
      b.roughness[i] = clamp01(lerp(0.92, 0.66, smoothstep(0.55, 0.82, rvar)) + fuzz * 0.04 - weaveH * 0.05);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 19. glass_dirty — mostly transparent; grime/streak/crack maps
// ---------------------------------------------------------------------------

function genGlassDirty(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  b.heightScaleM = 0.0008;
  b.aoStrength = 0.3;
  b.worldSize = 1.5;
  b.transparent = true;
  const glassTint = hexLin(0xaeb8b4);
  const grimeCol = hexLin(0x6a6558);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      // dried run streaks (vertical) + edge grime accumulation
      const streak = fbm2TileAniso(u, v, 8, 2, 4, 2, 0.5, seed + 1) * 0.5 + 0.5;
      const grimeField = fbm2Tile01(u, v, 4, 4, 2, 0.55, seed + 2);
      const edgeGrime = smoothstep(0.35, 0.0, Math.min(u, 1 - u)) + smoothstep(0.35, 0.0, Math.min(v, 1 - v));
      const grime = clamp01(smoothstep(0.55, 0.8, streak) * 0.5 + smoothstep(0.6, 0.85, grimeField) * 0.7 + edgeGrime * 0.4);

      // cracks (shattered) — rare, sharp
      const crack = smoothstep(0.9, 0.97, ridged2Tile(u, v, 5, 5, 2, 0.6, seed + 3));
      const fine = fbm2Tile01(u, v, 40, 2, 2, 0.5, seed + 4);

      const h = 0.5 + (fine - 0.5) * 0.02 + grime * 0.02 - crack * 0.4;
      b.height[i] = clamp01(h);

      // albedo mostly the grime; clean glass is near-black albedo (spec handled by material)
      let c = mixRGB([0.02, 0.02, 0.022], grimeCol, grime);
      c = mixRGB(c, glassTint, 0.15);
      setA(b.albedo, i, c[0], c[1], c[2]);

      b.ao[i] = clamp01(1 - crack * 0.4);
      // clean glass very smooth; grime raises roughness
      b.roughness[i] = clamp01(0.05 + grime * 0.55 + crack * 0.3);
      b.metalness[i] = 0;
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// 20. rubble — broken concrete chunks & dust (ground scatter)
// ---------------------------------------------------------------------------

function genRubble(size: number, seed: number): SurfaceBuffers {
  const b = makeBuffers(size);
  // Deep, but not so deep the crevices crush to black on the ground.
  b.heightScaleM = 0.045;
  b.aoStrength = 0.7;
  b.worldSize = 3;
  const concrete = hexLin(0xb4b0a3);
  const concrete2 = hexLin(0x96917f);
  const dust = hexLin(0xb2a996);
  const rebar = hexLin(0x6a4a30);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const i = y * size + x;

      const w = domainWarp2Tile(u, v, 4, 0.04, seed + 11);
      // chunks: worley cells at randomised heights
      const c1 = worley2Tile(w[0], w[1], 7, seed + 1);
      const c2 = worley2Tile(w[0], w[1], 14, seed + 2);
      const chunkLevel = hash1(c1.id, seed + 3);
      const chunkLevel2 = hash1(c2.id, seed + 4);
      // pick the higher of two chunk scales (stacked rubble)
      const dome1 = (1 - smoothstep(0.0, 0.6, c1.f1)) * (0.4 + chunkLevel * 0.6);
      const dome2 = (1 - smoothstep(0.0, 0.5, c2.f1)) * (0.3 + chunkLevel2 * 0.5);
      const useSmall = dome2 > dome1;
      const dome = Math.max(dome1, dome2);
      const id = useSmall ? c2.id : c1.id;
      const edge = useSmall ? c2.f2 - c2.f1 : c1.f2 - c1.f1;

      const face = fbm2Tile01(u, v, 18, 3, 2, 0.5, seed + 5);
      const crack = smoothstep(0.72, 0.9, ridged2Tile(w[0], w[1], 6, 3, 2, 0.5, seed + 6));
      const dustMask = smoothstep(0.45, 0.1, dome);
      // occasional exposed rebar in low areas
      const rebarMask = (hash1(id, seed + 7) < 0.08 && dome < 0.3) ? smoothstep(0.02, 0.0, Math.abs(((u * 40) % 1) - 0.5)) : 0;

      const h = 0.3 + dome * 0.5 + face * 0.03 - crack * 0.15 - smoothstep(0.15, 0.0, edge) * 0.15;
      b.height[i] = clamp01(h);

      // Per-chunk tonal variation, kept well clear of black so chunks read as
      // broken concrete, not holes.
      const shade = 0.82 + hash1(id, seed + 8) * 0.4;
      let c = mixRGB(concrete2, concrete, face);
      c = [c[0] * shade, c[1] * shade, c[2] * shade];
      c = mixRGB(c, dust, dustMask * 0.6);
      c = mixRGB(c, rebar, rebarMask);
      const dk = 1 - crack * 0.3;
      setA(b.albedo, i, c[0] * dk, c[1] * dk, c[2] * dk);

      // Raised AO floor so crevices stay legible as concrete.
      b.ao[i] = clamp01(0.66 + dome * 0.34 - crack * 0.22 - smoothstep(0.15, 0.0, edge) * 0.22);
      const rvar = fbm2Tile01(u + 0.5, v + 0.5, 5, 3, 2, 0.5, seed + 21);
      b.roughness[i] = clamp01(lerp(0.9, 0.52, smoothstep(0.5, 0.82, rvar)) + crack * 0.05 + dustMask * 0.05 - dome * 0.05);
      b.metalness[i] = clamp01(rebarMask * 0.7);
    }
  }
  return b;
}
