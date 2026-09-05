// Material classes for the HD tile refiner and the material atlas (roughness / metalness / emissive).
// Every tile name maps to a class plus tuning parameters; unknown names fall back to keyword rules and,
// failing that, to plain stone (flagged `fallback: true` so tooling can list them).

// Per-class defaults. Parameters used by the refiner (src/render/hdTiles.js):
//   grooveSign  -1: grooves are the DARK texels of the tile, +1: the LIGHT texels (brick mortar); 0: no grooves
//   grooveT     luminance distance from the tile median (0..255) above which a texel counts as a groove
//   bevel       colour strength of the 1-texel highlight/shadow on face texels bordering a groove (0 = off)
//   bevelAlpha  treat transparent neighbours as grooves (glass frames, iron bars, leaves)
//   dots        isolated single texels that differ strongly from their four neighbours become domes (rivets, pebbles)
//   blobs       every texel far from the median luminance becomes a dome (gravel)
//   smooth      bilinear (rounded) base height instead of stepped
//   grain       'h' | 'v' | 'rings' wood grain direction; 'r' random straw
//   hl          how much the painted brightness feeds the base height (dark = low)
//   nearMedian  restrict the class detail to texels close to the tile's median colour (wood with books, etc.)
//   emit        { lo, hi, sat }: per-texel emissive mask from luminance (smoothstep lo..hi) gated by saturation
//   blend       colour tolerance (mean abs RGB, 0..255) for the edge-aware upsample: neighbouring base texels of the
//               same structure within this distance are interpolated smoothly (no 4x4 grid); 0 = crisp nearest
//   bake        strength of the shading baked from the base relief into the colour (rounded stones, ribs)
//   round       chamfer the convex corners of face blocks against grooves (cobble stones); dots are always rounded
//   roundAlpha  holes eat the corner texel of neighbouring face blocks (leaf clusters)
export const CLASS_DEFAULTS = {
  wood: { roughness: 0.72, metalness: 0, emissive: 0, relief: 0.6, grooveSign: -1, grooveT: 20, bevel: 0.16, grain: 'h', hl: 0.35, nearMedian: true, blend: 26, bake: 0 },
  stone: { roughness: 0.86, metalness: 0, emissive: 0, relief: 0.7, grooveSign: -1, grooveT: 36, bevel: 0.05, hl: 0.5, blend: 64, bake: 0 },
  brick: { roughness: 0.82, metalness: 0, emissive: 0, relief: 0.75, grooveSign: 1, grooveT: 18, bevel: 0.14, hl: 0.2, blend: 34, bake: 0 },
  cobble: { roughness: 0.84, metalness: 0, emissive: 0, relief: 0.9, grooveSign: -1, grooveT: 22, bevel: 0.05, hl: 0.3, smooth: true, blend: 40, bake: 0.22, round: true },
  dirt: { roughness: 0.94, metalness: 0, emissive: 0, relief: 0.4, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0.3, dots: true, smooth: true, blend: 40, bake: 0.12 },
  sand: { roughness: 0.9, metalness: 0, emissive: 0, relief: 0.25, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0.2, dots: true, smooth: true, blend: 30, bake: 0.08 },
  gravel: { roughness: 0.88, metalness: 0, emissive: 0, relief: 0.65, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0.2, blobs: true, blobT: 12, smooth: true, blend: 30, bake: 0.18, round: true },
  plaster: { roughness: 0.76, metalness: 0, emissive: 0, relief: 0.3, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0.15, blend: 40, bake: 0 },
  metal: { roughness: 0.42, metalness: 0.85, emissive: 0, relief: 0.5, grooveSign: -1, grooveT: 16, bevel: 0.18, hl: 0.2, dots: true, nearMedian: true, blend: 22, bake: 0 },
  chrome: { roughness: 0.12, metalness: 1, emissive: 0, relief: 0.3, grooveSign: -1, grooveT: 16, bevel: 0.14, hl: 0.15, blend: 30, bake: 0 },
  panel: { roughness: 0.5, metalness: 0.55, emissive: 0, relief: 0.5, grooveSign: -1, grooveT: 12, bevel: 0.2, hl: 0.25, dots: true, blend: 16, bake: 0 },
  glass: { roughness: 0.08, metalness: 0, emissive: 0, relief: 0.25, grooveSign: 0, grooveT: 0, bevel: 0.12, bevelAlpha: true, hl: 0, blend: 0, bake: 0 },
  fabric: { roughness: 0.95, metalness: 0, emissive: 0, relief: 0.35, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0.1, smooth: true, blend: 36, bake: 0 },
  foliage: { roughness: 0.7, metalness: 0, emissive: 0, relief: 0.6, grooveSign: 0, grooveT: 0, bevel: 0.08, bevelAlpha: true, hl: 0.25, style: 'leaves', smooth: true, blend: 110, bake: 0.1 },
  liquid: { roughness: 0.1, metalness: 0, emissive: 0, relief: 0.15, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0, smooth: true, blend: 60, bake: 0 },
  glow: { roughness: 0.4, metalness: 0.1, emissive: 1, relief: 0.35, grooveSign: -1, grooveT: 40, bevel: 0.12, hl: 0.15, emit: { lo: 110, hi: 180, sat: 0 }, blend: 24, bake: 0 },
  ore: { roughness: 0.82, metalness: 0, emissive: 0, relief: 0.8, grooveSign: -1, grooveT: 18, bevel: 0.05, hl: 0.5, nuggetMetal: 0, blend: 64, bake: 0 },
  organic: { roughness: 0.8, metalness: 0, emissive: 0, relief: 0.6, grooveSign: -1, grooveT: 22, bevel: 0.06, hl: 0.3, smooth: true, grain: 'v', blend: 30, bake: 0.2 },
  plain: { roughness: 0.9, metalness: 0, emissive: 0, relief: 0, grooveSign: 0, grooveT: 0, bevel: 0, hl: 0, blend: 0, bake: 0 },
};

// Explicit classification of every painted tile. `detail` overrides which class refiner paints the surface
// detail when it differs from the lighting class (e.g. magma: lit like glow, textured like stone).
const TILE_MATERIALS = {
  missing: { cls: 'plain' },
  grass_top: { cls: 'foliage', style: 'blades', relief: 0.45 },
  grass_side: { cls: 'dirt' },
  dirt: { cls: 'dirt' },
  stone: { cls: 'stone' },
  cobblestone: { cls: 'cobble' },
  sand: { cls: 'sand' },
  gravel: { cls: 'gravel' },
  bedrock: { cls: 'stone', relief: 0.9, roughness: 0.92 },
  oak_log: { cls: 'wood', grain: 'v', bark: true, roughness: 0.85, relief: 0.8, blend: 50 },
  oak_log_top: { cls: 'wood', grain: 'rings' },
  oak_leaves: { cls: 'foliage', roundAlpha: true },
  oak_planks: { cls: 'wood' },
  glass: { cls: 'glass' },
  bricks: { cls: 'brick' },
  water: { cls: 'liquid' },
  tall_grass: { cls: 'foliage', style: 'blades' },
  dandelion: { cls: 'foliage', style: 'flower' },
  poppy: { cls: 'foliage', style: 'flower' },
  spruce_log: { cls: 'wood', grain: 'v', bark: true, roughness: 0.85, relief: 0.8, blend: 50 },
  spruce_log_top: { cls: 'wood', grain: 'rings' },
  spruce_planks: { cls: 'wood' },
  spruce_leaves: { cls: 'foliage', roundAlpha: true },
  birch_log: { cls: 'wood', grain: 'v', bark: true, roughness: 0.7, relief: 0.5, blend: 50 },
  birch_log_top: { cls: 'wood', grain: 'rings' },
  birch_leaves: { cls: 'foliage', roundAlpha: true },
  dirt_path_top: { cls: 'dirt', relief: 0.3 },
  dirt_path_side: { cls: 'dirt' },
  mud: { cls: 'dirt', roughness: 0.55, relief: 0.35 },
  stone_bricks: { cls: 'stone', bevel: 0.14, grooveT: 22, relief: 0.8 },
  sandstone_top: { cls: 'stone', relief: 0.35, roughness: 0.88 },
  sandstone_side: { cls: 'stone', relief: 0.45, grooveT: 12, bevel: 0.08, roughness: 0.88 },
  lantern: { cls: 'glow', emit: { lo: 150, hi: 210, sat: 0 }, detail: 'metal' },
  torch: { cls: 'glow', emit: { lo: 150, hi: 200, sat: 0 }, detail: 'wood', grain: 'v', bevelAlpha: true },
  rail: { cls: 'metal', metalSat: true, grain: 'v', bevelAlpha: true, roughness: 0.5 },
  barrel_side: { cls: 'wood', grain: 'v', metalSat: true },
  barrel_top: { cls: 'wood', grain: 'h' },
  crate: { cls: 'wood' },
  hay_side: { cls: 'organic', style: 'straw', grain: 'v', roughness: 0.9 },
  hay_top: { cls: 'organic', style: 'straw', grain: 'r', roughness: 0.9 },
  shelf: { cls: 'wood' },
  bookshelf: { cls: 'wood' },
  iron_bars: { cls: 'metal', bevelAlpha: true },
  oak_door_top: { cls: 'wood' },
  oak_door_bottom: { cls: 'wood' },
  saloon_door: { cls: 'wood', bevelAlpha: true },
  sign: { cls: 'wood' },
  bed_head_top: { cls: 'fabric' },
  bed_foot_top: { cls: 'fabric' },
  bed_side: { cls: 'fabric' },
  bed_end_head: { cls: 'fabric' },
  wool_white: { cls: 'fabric' },
  wool_red: { cls: 'fabric' },
  wool_blue: { cls: 'fabric' },
  wool_green: { cls: 'fabric' },
  cactus_side: { cls: 'foliage', style: 'ridges', roughness: 0.6, relief: 0.7 },
  cactus_top: { cls: 'foliage', style: 'ridges', roughness: 0.6 },
  dead_bush: { cls: 'wood', grain: 'v', bevelAlpha: true, nearMedian: false },
  wheat: { cls: 'foliage', style: 'blades' },
  wheat_stage0: { cls: 'foliage', style: 'blades', relief: 0.4 },
  wheat_stage1: { cls: 'foliage', style: 'blades', relief: 0.5 },
  // flat item icons (hotbar / drops): soft organic shading, no seams or bevels that would read as blocks
  item_apple: { cls: 'organic', relief: 0.45, bake: 0.1, grooveT: 0 },
  item_bread: { cls: 'organic', relief: 0.5, bake: 0.12, grooveT: 0 },
  item_seeds: { cls: 'foliage', style: 'blades', relief: 0.3 },
  item_wheat: { cls: 'foliage', style: 'blades', relief: 0.4 },
  item_beef_raw: { cls: 'organic', relief: 0.4, bake: 0.08, grooveT: 0 },
  item_beef_cooked: { cls: 'organic', relief: 0.45, bake: 0.12, grooveT: 0 },
  item_porkchop_raw: { cls: 'organic', relief: 0.4, bake: 0.08, grooveT: 0 },
  item_porkchop_cooked: { cls: 'organic', relief: 0.45, bake: 0.12, grooveT: 0 },
  item_chicken_raw: { cls: 'organic', relief: 0.4, bake: 0.08, grooveT: 0 },
  item_chicken_cooked: { cls: 'organic', relief: 0.45, bake: 0.12, grooveT: 0 },
  item_leather: { cls: 'fabric', relief: 0.3 },
  item_bone: { cls: 'plaster', relief: 0.3, roughness: 0.6 },
  item_feather: { cls: 'fabric', relief: 0.2, roughness: 0.8 },
  item_stick: { cls: 'wood', grain: 'v', relief: 0.5, nearMedian: false },
  piano_side: { cls: 'panel', roughness: 0.22, metalness: 0.15, relief: 0.25 },
  piano_top: { cls: 'panel', roughness: 0.22, metalness: 0.15, relief: 0.25 },
  piano_front: { cls: 'panel', roughness: 0.22, metalness: 0.15, relief: 0.25 },
  furnace_side: { cls: 'cobble' },
  furnace_front: { cls: 'cobble', emissive: 0.9, emit: { lo: 140, hi: 200, sat: 0.3 } },
  anvil: { cls: 'metal', roughness: 0.62, metalness: 0.8 },
  anvil_top: { cls: 'metal', roughness: 0.55, metalness: 0.8 },
  iron_block: { cls: 'metal', roughness: 0.35, metalness: 0.95 },
  gold_block: { cls: 'metal', roughness: 0.3, metalness: 1 },
  chest_side: { cls: 'wood' },
  chest_front: { cls: 'wood' },
  chest_top: { cls: 'wood' },
  gravestone: { cls: 'stone', bevelAlpha: true, bevel: 0.1 },
  coarse_dirt: { cls: 'dirt' },
  farmland: { cls: 'dirt', grooveSign: -1, grooveT: 14, relief: 0.6 },
  smooth_stone: { cls: 'stone', relief: 0.3, roughness: 0.7 },
  plaster: { cls: 'plaster' },
  white_planks: { cls: 'wood' },
  stripped_oak: { cls: 'wood', grain: 'v' },
  snow: { cls: 'plaster', roughness: 0.6, relief: 0.25, sparkle: true },
  coal_ore: { cls: 'ore', nuggetMetal: 0 },
  iron_ore: { cls: 'ore', nuggetMetal: 0.55 },
  gold_ore: { cls: 'ore', nuggetMetal: 0.8 },
  pumpkin_side: { cls: 'organic', style: 'ribs', grain: 'v', roughness: 0.55 },
  pumpkin_top: { cls: 'organic', style: 'ribs', grain: 'v', roughness: 0.55 },
  trough: { cls: 'wood' },
  scorched_stone: { cls: 'stone', emissive: 0.5, emit: { lo: 70, hi: 130, sat: 0.5 } },
  ash: { cls: 'dirt', relief: 0.3 },
  magma: { cls: 'glow', detail: 'stone', emit: { lo: 100, hi: 170, sat: 0.4 }, roughness: 0.8, metalness: 0, relief: 0.6 },
  charred_planks: { cls: 'wood', roughness: 0.9 },
  durasteel: { cls: 'metal' },
  durasteel_dark: { cls: 'metal' },
  panel_black: { cls: 'panel' },
  panel_red: { cls: 'panel' },
  panel_stripe: { cls: 'panel' },
  glow_panel: { cls: 'glow', detail: 'panel', emit: { lo: 212, hi: 236, sat: 0 } },
  glow_panel_blue: { cls: 'glow', detail: 'panel', emit: { lo: 125, hi: 160, sat: 0 } },
  holo_sign: { cls: 'glow', detail: 'panel', emit: { lo: 70, hi: 140, sat: 0 }, roughness: 0.3, metalness: 0.4 },
  neon_pink: { cls: 'glow', detail: 'panel', emit: { lo: 120, hi: 200, sat: 0 }, roughness: 0.2, metalness: 0.3 },
  neon_green: { cls: 'glow', detail: 'panel', emit: { lo: 120, hi: 200, sat: 0 }, roughness: 0.2, metalness: 0.3 },
  console_top: { cls: 'panel', emissive: 1, emit: { lo: 120, hi: 200, sat: 0.3 }, roughness: 0.35 },
  console_side: { cls: 'panel', emissive: 1, emit: { lo: 120, hi: 200, sat: 0.3 } },
  vent: { cls: 'panel', grooveT: 20 },
  deck_plate: { cls: 'metal', roughness: 0.55 },
  steel_glass: { cls: 'glass', roughness: 0.06 },
  chrome: { cls: 'chrome' },
  window_lit: { cls: 'glass', emissive: 1, emit: { lo: 150, hi: 200, sat: 0 }, roughness: 0.1 },
  window_dark: { cls: 'glass', roughness: 0.1 },
  city_lamp: { cls: 'glow', detail: 'panel', emit: { lo: 200, hi: 235, sat: 0 } },
  hull_plate: { cls: 'metal', roughness: 0.5 },
  hull_trench: { cls: 'panel', emissive: 1, emit: { lo: 150, hi: 200, sat: 0.3 } },
};

// Keyword rules for names that are not in the table (dynamic tiles, tiles added by other builders).
const KEYWORD_RULES = [
  [/^destroy_/, { cls: 'plain' }],
  [/^sign:/, { cls: 'wood' }],
  [/glow|lamp|lantern|torch|holo|magma|_lit\b|_lit_|fire|lava|neon|beacon/, { cls: 'glow' }],
  [/window/, { cls: 'glass' }],
  [/glass/, { cls: 'glass' }],
  [/ore\b|_ore/, { cls: 'ore' }],
  [/chrome|mirror/, { cls: 'chrome' }],
  [/durasteel|iron|steel|deck|hull|rail|anvil|vent|metal|plating|grate|pipe/, { cls: 'metal' }],
  [/panel|console|screen|piano|plastic/, { cls: 'panel' }],
  [/leaves|grass_top|tall_grass|dandelion|poppy|flower|bush|wheat|cactus|fern|vine|sapling|crop/, { cls: 'foliage' }],
  [/wool|bed_|carpet|cloth|banner|curtain|fabric|awning|tent/, { cls: 'fabric' }],
  [/water|liquid/, { cls: 'liquid' }],
  [/brick/, { cls: 'brick' }],
  [/cobble/, { cls: 'cobble' }],
  [/gravel/, { cls: 'gravel' }],
  [/sand|snow/, { cls: 'sand' }],
  [/dirt|mud|farmland|path|soil|ash|grass_side/, { cls: 'dirt' }],
  [/plaster|stucco|concrete|adobe/, { cls: 'plaster' }],
  [/pumpkin|hay|melon|straw|meat|leather/, { cls: 'organic' }],
  [/plank|log|oak|spruce|birch|wood|door|chest|barrel|crate|shelf|sign|fence|trough|table|chair|stripped|bark|beam/, { cls: 'wood' }],
  [/stone|rock|bedrock|granite|basalt|slate|marble|grave|obsidian/, { cls: 'stone' }],
];

const cache = new Map();

// Every material object has exactly these keys in this order (one hidden class for the refiner's hot loops).
const MATERIAL_KEYS = ['name', 'cls', 'detail', 'roughness', 'metalness', 'emissive', 'relief', 'grooveSign', 'grooveT', 'bevel', 'bevelAlpha',
  'dots', 'blobs', 'blobT', 'smooth', 'grain', 'hl', 'nearMedian', 'emit', 'style', 'bark', 'metalSat', 'sparkle', 'chips', 'cracks',
  'nuggetMetal', 'domeAmp', 'detailScale', 'blend', 'bake', 'round', 'roundAlpha', 'explicit', 'fallback'];

// Returns the full material description of a tile: class defaults merged with per-tile overrides.
// `explicit` is true when the name is in the table, `fallback` when even the keyword rules did not match.
export function classify(name) {
  let m = cache.get(name);
  if (m) return m;
  let entry = TILE_MATERIALS[name];
  const explicit = !!entry;
  let fallback = false;
  if (!entry) {
    for (const [re, e] of KEYWORD_RULES) { if (re.test(name)) { entry = e; break; } }
    if (!entry) { entry = { cls: 'stone' }; fallback = true; }
  }
  const def = CLASS_DEFAULTS[entry.cls] || CLASS_DEFAULTS.stone;
  const merged = Object.assign({}, def, entry, { name, explicit, fallback });
  if (!merged.detail) merged.detail = merged.cls;
  if (merged.emit && merged.emissive === 0 && CLASS_DEFAULTS[merged.cls].emissive === 0) merged.emissive = 1;
  m = {};
  for (const k of MATERIAL_KEYS) m[k] = merged[k] === undefined ? null : merged[k];
  cache.set(name, m);
  return m;
}

export const MATERIAL_CLASSES = Object.keys(CLASS_DEFAULTS);
export const EXPLICIT_TILE_NAMES = Object.keys(TILE_MATERIALS);

// One line per tile for the debug table (scripts/material-table.mjs and the tile sheet).
export function describe(name) {
  const m = classify(name);
  const flag = m.explicit ? '' : (m.fallback ? '  <-- FALLBACK' : '  (keyword)');
  return `${name.padEnd(20)} ${m.cls.padEnd(8)} rough ${m.roughness.toFixed(2)} metal ${m.metalness.toFixed(2)} emis ${m.emissive.toFixed(2)} relief ${m.relief.toFixed(2)}${m.detail !== m.cls ? ' detail=' + m.detail : ''}${m.grain ? ' grain=' + m.grain : ''}${m.style ? ' style=' + m.style : ''}${flag}`;
}
