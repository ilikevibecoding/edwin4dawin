// Block registry: ids, shapes, textures, physics/light properties.
import { TILES } from './textures.js';

export const SHAPE = {
  CUBE: 0, CROSS: 1, SLAB: 2, SLAB_TOP: 3, POST: 4, FENCE: 5, LANTERN: 6, TORCH: 7, RAIL: 8,
  PANE: 9, DOOR: 10, SALOON_DOOR: 11, WALL_SIGN: 12, BED: 13, ANVIL: 14, CHEST: 15, GRAVESTONE: 16,
  CACTUS: 17, TROUGH: 18, FARMLAND: 19, LIQUID: 20, TABLE: 21,
};

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLESTONE: 4, SAND: 5, GRAVEL: 6, OAK_LOG: 7, OAK_LEAVES: 8,
  OAK_PLANKS: 9, GLASS: 10, BRICKS: 11, WATER: 12, BEDROCK: 13, TALL_GRASS: 14, DANDELION: 15, POPPY: 16,
  SPRUCE_LOG: 17, SPRUCE_PLANKS: 18, SPRUCE_LEAVES: 19, BIRCH_LOG: 20, BIRCH_LEAVES: 21, DIRT_PATH: 22,
  MUD: 23, STONE_BRICKS: 24, SANDSTONE: 25, OAK_SLAB: 26, OAK_SLAB_TOP: 27, SPRUCE_SLAB: 28, SPRUCE_SLAB_TOP: 29,
  COBBLE_SLAB: 30, STONE_BRICK_SLAB: 31, OAK_FENCE: 32, SPRUCE_FENCE: 33, WHITE_FENCE: 34, LANTERN: 35, RAIL: 36,
  BARREL: 37, CRATE: 38, HAY_BALE: 39, SHELF: 40, IRON_BARS: 41, OAK_DOOR: 42, SALOON_DOOR: 43, WALL_SIGN: 44,
  BED_HEAD: 45, BED_FOOT: 46, WHITE_WOOL: 47, RED_WOOL: 48, BLUE_WOOL: 49, GREEN_WOOL: 50, CACTUS: 51, DEAD_BUSH: 52,
  TORCH: 53, BOOKSHELF: 54, STRIPPED_OAK: 55, COARSE_DIRT: 56, PIANO: 57, FURNACE: 58, ANVIL: 59, CHEST: 60,
  SMOOTH_STONE: 61, COAL_ORE: 62, IRON_ORE: 63, GOLD_ORE: 64, WHEAT: 65, FARMLAND: 66, GRAVESTONE: 67,
  GOLD_BLOCK: 68, IRON_BLOCK: 69, PLASTER: 70, WHITE_PLANKS: 71, SNOW: 72, PUMPKIN: 73, TROUGH: 74, TABLE: 75,
  STONE_BRICK_SLAB_TOP: 76, SPRUCE_DOOR: 77,
  SCORCHED_STONE: 78, ASH: 79, MAGMA: 80, CHARRED_PLANKS: 81,
  // Star Wars palette (Coruscant, Death Star, spaceport, vehicles)
  DURASTEEL: 82, DURASTEEL_DARK: 83, PANEL_BLACK: 84, PANEL_RED: 85, GLOW_PANEL: 86, GLOW_PANEL_BLUE: 87,
  HOLO_SIGN: 88, CONSOLE: 89, VENT: 90, DECK_PLATE: 91, STEEL_GLASS: 92, CHROME: 93, WINDOW_LIT: 94, WINDOW_DARK: 95,
  CITY_LAMP: 96, PANEL_STRIPE: 97, HULL_PLATE: 98, HULL_TRENCH: 99,
  // gameplay states (ids from 100 upward; existing ids are never renumbered)
  OAK_DOOR_TOP: 100, OAK_DOOR_OPEN: 101, SPRUCE_DOOR_TOP: 102, SPRUCE_DOOR_OPEN: 103,
  WHEAT_0: 104, WHEAT_1: 105,
  // undercity neon (ids 106+)
  NEON_PINK: 106, NEON_GREEN: 107,
  // Coruscant architecture v2 (docs/rubrics/18_architecture_v2.md): smooth panel fields, seams and trim, the
  // 500-Republica bronze and the residential sand accent, horizontal light strips for ring ledges, and continuous
  // glazing bands / tall slits that replace the small-square window grids on every tower facade (ids 108+)
  PANEL_LIGHT: 108, PANEL_GREY: 109, TRIM_DARK: 110, PANEL_BRONZE: 111, PANEL_SAND: 112,
  LIGHT_STRIP: 113, LIGHT_STRIP_WARM: 114, WINDOW_BAND_LIT: 115, WINDOW_BAND_DARK: 116, WINDOW_SLIT_LIT: 117, WINDOW_SLIT_DARK: 118,
  PANEL_SEAM: 119,
};

export const BLOCKS = new Array(256);

// Two-block doors: the closed state is a pair of ids (bottom / top half) so each half carries its own texture;
// the open state uses one id for both halves. `doorSet(id)` returns the set an id belongs to.
export const DOOR_SETS = {
  oak: { bottom: B.OAK_DOOR, top: B.OAK_DOOR_TOP, open: B.OAK_DOOR_OPEN, item: B.OAK_DOOR },
  spruce: { bottom: B.SPRUCE_DOOR, top: B.SPRUCE_DOOR_TOP, open: B.SPRUCE_DOOR_OPEN, item: B.OAK_DOOR },
};
export const doorSet = (id) => { const d = BLOCKS[id]; return d && d.door ? DOOR_SETS[d.door] : null; };
export const isDoor = (id) => !!(BLOCKS[id] && BLOCKS[id].door);

// Wheat growth: sprout -> half grown -> mature (B.WHEAT)
export const WHEAT_STAGES = [B.WHEAT_0, B.WHEAT_1, B.WHEAT];

// Closed doors collide as a thin panel across the doorway. The panel's axis follows the wall (same rule the
// mesher uses for panes): solid neighbours along x => the panel spans x and is thin in z.
const DOOR_PANEL_Z = [[0, 0, 0.4375, 1, 1, 0.5625]];
const DOOR_PANEL_X = [[0.4375, 0, 0, 0.5625, 1, 1]];
export function doorPanelBoxes(world, x, y, z) {
  const solid = (bx, bz) => BLOCKS[world.getBlock(bx, y, bz)].solid;
  const alongX = solid(x + 1, z) || solid(x - 1, z), alongZ = solid(x, z + 1) || solid(x, z - 1);
  return alongX && !alongZ ? DOOR_PANEL_Z : DOOR_PANEL_X;
}

const T = (name) => TILES[name] ?? 0;
const same = (n) => [T(n), T(n), T(n), T(n), T(n), T(n)];
const column = (side, top, bottom = top) => [T(side), T(side), T(top), T(bottom), T(side), T(side)];
const CUBE_BOX = [[0, 0, 0, 1, 1, 1]];

function def(id, name, opts) {
  const b = {
    id, name,
    displayName: opts.displayName || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    shape: opts.shape ?? SHAPE.CUBE,
    tex: opts.tex || same('missing'),
    solid: opts.solid ?? true,          // has collision
    opaque: opts.opaque ?? true,        // full cube blocking light + culling neighbor faces
    cutout: opts.cutout ?? false,       // alpha tested
    lightOpacity: opts.lightOpacity ?? 0,
    emit: opts.emit ?? 0,
    hardness: opts.hardness ?? 1,
    sound: opts.sound || 'stone',
    boxes: opts.boxes || (opts.solid === false ? [] : CUBE_BOX),
    replaceable: opts.replaceable ?? false,
    item: opts.item ?? true,             // shows in inventory palette
    icon: opts.icon || 'cube',           // 'cube' | 'flat' | 'slab'
    drop: opts.drop ?? id,               // block id received when broken (0 = nothing)
    tint: opts.tint || null,
    door: opts.door || null,             // door set name ('oak' | 'spruce') for two-block toggle doors
    doorOpen: opts.doorOpen ?? false,    // open state of a door block (no collision, passage free)
    doorTop: opts.doorTop ?? false,      // upper half of a closed door
    boxesAt: opts.boxesAt || null,       // (world, x, y, z) => boxes: collision that depends on the neighbours
    blockEntity: opts.blockEntity || null, // 'chest': the cell carries a block entity (world.blockEntities)
    growth: opts.growth ?? -1,           // crop stage index (WHEAT_STAGES), -1 for non-crops
  };
  if (b.shape !== SHAPE.CUBE) b.opaque = false;
  BLOCKS[id] = b;
  return b;
}

export function initBlocks() {
  def(B.AIR, 'air', { solid: false, opaque: false, item: false, replaceable: true, boxes: [] });
  def(B.GRASS, 'grass_block', { tex: column('grass_side', 'grass_top', 'dirt'), sound: 'grass', hardness: 0.6, drop: B.DIRT });
  def(B.DIRT, 'dirt', { tex: same('dirt'), sound: 'gravel', hardness: 0.5 });
  def(B.COARSE_DIRT, 'coarse_dirt', { tex: same('coarse_dirt'), sound: 'gravel', hardness: 0.5 });
  def(B.STONE, 'stone', { tex: same('stone'), hardness: 1.5, drop: B.COBBLESTONE });
  def(B.COBBLESTONE, 'cobblestone', { tex: same('cobblestone'), hardness: 1.6 });
  def(B.SMOOTH_STONE, 'smooth_stone', { tex: same('smooth_stone'), hardness: 1.5 });
  def(B.STONE_BRICKS, 'stone_bricks', { tex: same('stone_bricks'), hardness: 1.5 });
  def(B.SAND, 'sand', { tex: same('sand'), sound: 'sand', hardness: 0.5 });
  def(B.GRAVEL, 'gravel', { tex: same('gravel'), sound: 'gravel', hardness: 0.6 });
  def(B.SANDSTONE, 'sandstone', { tex: column('sandstone_side', 'sandstone_top'), hardness: 0.8 });
  def(B.BEDROCK, 'bedrock', { tex: same('bedrock'), hardness: Infinity, item: false });
  def(B.SNOW, 'snow_block', { tex: same('snow'), sound: 'snow', hardness: 0.3 });
  def(B.OAK_LOG, 'oak_log', { tex: column('oak_log', 'oak_log_top'), sound: 'wood', hardness: 1.2 });
  def(B.SPRUCE_LOG, 'spruce_log', { tex: column('spruce_log', 'spruce_log_top'), sound: 'wood', hardness: 1.2 });
  def(B.BIRCH_LOG, 'birch_log', { tex: column('birch_log', 'birch_log_top'), sound: 'wood', hardness: 1.2 });
  def(B.STRIPPED_OAK, 'stripped_oak_log', { tex: column('stripped_oak', 'oak_log_top'), sound: 'wood', hardness: 1.2 });
  def(B.OAK_LEAVES, 'oak_leaves', { tex: same('oak_leaves'), opaque: false, cutout: true, lightOpacity: 1, sound: 'grass', hardness: 0.25 });
  def(B.SPRUCE_LEAVES, 'spruce_leaves', { tex: same('spruce_leaves'), opaque: false, cutout: true, lightOpacity: 1, sound: 'grass', hardness: 0.25 });
  def(B.BIRCH_LEAVES, 'birch_leaves', { tex: same('birch_leaves'), opaque: false, cutout: true, lightOpacity: 1, sound: 'grass', hardness: 0.25 });
  def(B.OAK_PLANKS, 'oak_planks', { tex: same('oak_planks'), sound: 'wood', hardness: 1.0 });
  def(B.SPRUCE_PLANKS, 'spruce_planks', { tex: same('spruce_planks'), sound: 'wood', hardness: 1.0 });
  def(B.WHITE_PLANKS, 'white_planks', { displayName: 'Whitewashed Planks', tex: same('white_planks'), sound: 'wood', hardness: 1.0 });
  def(B.GLASS, 'glass', { tex: same('glass'), opaque: false, cutout: true, sound: 'glass', hardness: 0.3, drop: 0 });
  def(B.BRICKS, 'bricks', { tex: same('bricks'), hardness: 1.6 });
  def(B.PLASTER, 'plaster', { tex: same('plaster'), hardness: 1.0 });
  def(B.WATER, 'water', { shape: SHAPE.LIQUID, tex: same('water'), solid: false, opaque: false, lightOpacity: 1, replaceable: true, item: false, hardness: Infinity, boxes: [] });
  def(B.TALL_GRASS, 'grass', { displayName: 'Grass', shape: SHAPE.CROSS, tex: same('tall_grass'), solid: false, cutout: true, replaceable: true, icon: 'flat', hardness: 0.05, sound: 'grass', drop: 0, boxes: [] });
  def(B.DANDELION, 'dandelion', { shape: SHAPE.CROSS, tex: same('dandelion'), solid: false, cutout: true, icon: 'flat', hardness: 0.05, sound: 'grass', boxes: [] });
  def(B.POPPY, 'poppy', { shape: SHAPE.CROSS, tex: same('poppy'), solid: false, cutout: true, icon: 'flat', hardness: 0.05, sound: 'grass', boxes: [] });
  def(B.DEAD_BUSH, 'dead_bush', { shape: SHAPE.CROSS, tex: same('dead_bush'), solid: false, cutout: true, icon: 'flat', hardness: 0.05, sound: 'grass', boxes: [] });
  // wheat crop: drops are handled by the game (mature: wheat + seeds, young: a seed); growing crops carry a
  // 'crop' block entity holding the growth timer
  const crop = (tile, growth) => ({ displayName: 'Wheat Crops', shape: SHAPE.CROSS, tex: same(tile), solid: false, cutout: true, icon: 'flat', hardness: 0.05, sound: 'grass', boxes: [], item: false, drop: 0, growth, blockEntity: 'crop' });
  def(B.WHEAT, 'wheat', crop('wheat', 2));
  def(B.WHEAT_0, 'wheat_seedling', crop('wheat_stage0', 0));
  def(B.WHEAT_1, 'wheat_young', crop('wheat_stage1', 1));
  def(B.DIRT_PATH, 'dirt_path', { tex: column('dirt_path_side', 'dirt_path_top', 'dirt'), sound: 'grass', hardness: 0.6 });
  def(B.MUD, 'mud', { tex: same('mud'), sound: 'gravel', hardness: 0.5 });
  def(B.FARMLAND, 'farmland', { tex: column('dirt', 'farmland', 'dirt'), sound: 'gravel', hardness: 0.6, drop: B.DIRT });
  def(B.OAK_SLAB, 'oak_slab', { shape: SHAPE.SLAB, tex: same('oak_planks'), sound: 'wood', hardness: 1.0, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(B.OAK_SLAB_TOP, 'oak_slab_top', { displayName: 'Oak Slab (Top)', shape: SHAPE.SLAB_TOP, tex: same('oak_planks'), sound: 'wood', hardness: 1.0, icon: 'slab', boxes: [[0, 0.5, 0, 1, 1, 1]], item: false, drop: B.OAK_SLAB });
  def(B.SPRUCE_SLAB, 'spruce_slab', { shape: SHAPE.SLAB, tex: same('spruce_planks'), sound: 'wood', hardness: 1.0, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(B.SPRUCE_SLAB_TOP, 'spruce_slab_top', { displayName: 'Spruce Slab (Top)', shape: SHAPE.SLAB_TOP, tex: same('spruce_planks'), sound: 'wood', hardness: 1.0, icon: 'slab', boxes: [[0, 0.5, 0, 1, 1, 1]], item: false, drop: B.SPRUCE_SLAB });
  def(B.COBBLE_SLAB, 'cobblestone_slab', { shape: SHAPE.SLAB, tex: same('cobblestone'), hardness: 1.6, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(B.STONE_BRICK_SLAB, 'stone_brick_slab', { shape: SHAPE.SLAB, tex: same('stone_bricks'), hardness: 1.5, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(B.STONE_BRICK_SLAB_TOP, 'stone_brick_slab_top', { displayName: 'Stone Brick Slab (Top)', shape: SHAPE.SLAB_TOP, tex: same('stone_bricks'), hardness: 1.5, icon: 'slab', boxes: [[0, 0.5, 0, 1, 1, 1]], item: false, drop: B.STONE_BRICK_SLAB });
  def(B.OAK_FENCE, 'oak_fence', { shape: SHAPE.FENCE, tex: same('oak_planks'), sound: 'wood', hardness: 1.0, icon: 'flat', boxes: [[0.375, 0, 0.375, 0.625, 1.5, 0.625]] });
  def(B.SPRUCE_FENCE, 'spruce_fence', { shape: SHAPE.FENCE, tex: same('spruce_planks'), sound: 'wood', hardness: 1.0, icon: 'flat', boxes: [[0.375, 0, 0.375, 0.625, 1.5, 0.625]] });
  def(B.WHITE_FENCE, 'white_fence', { displayName: 'Picket Fence', shape: SHAPE.FENCE, tex: same('white_planks'), sound: 'wood', hardness: 1.0, icon: 'flat', boxes: [[0.375, 0, 0.375, 0.625, 1.5, 0.625]] });
  def(B.LANTERN, 'lantern', { shape: SHAPE.LANTERN, tex: same('lantern'), solid: false, emit: 15, sound: 'metal', hardness: 0.4, icon: 'flat', boxes: [] });
  def(B.TORCH, 'torch', { shape: SHAPE.TORCH, tex: same('torch'), solid: false, emit: 14, sound: 'wood', hardness: 0.05, icon: 'flat', boxes: [] });
  def(B.RAIL, 'rail', { shape: SHAPE.RAIL, tex: same('rail'), solid: false, cutout: true, sound: 'metal', hardness: 0.5, icon: 'flat', boxes: [] });
  def(B.BARREL, 'barrel', { tex: column('barrel_side', 'barrel_top'), sound: 'wood', hardness: 1.0 });
  def(B.CRATE, 'crate', { tex: same('crate'), sound: 'wood', hardness: 1.0 });
  def(B.HAY_BALE, 'hay_bale', { tex: column('hay_side', 'hay_top'), sound: 'grass', hardness: 0.5 });
  def(B.SHELF, 'shelf', { displayName: 'Bottle Shelf', tex: [T('shelf'), T('shelf'), T('spruce_planks'), T('spruce_planks'), T('shelf'), T('shelf')], sound: 'wood', hardness: 1.0 });
  def(B.BOOKSHELF, 'bookshelf', { tex: [T('bookshelf'), T('bookshelf'), T('oak_planks'), T('oak_planks'), T('bookshelf'), T('bookshelf')], sound: 'wood', hardness: 1.0 });
  def(B.IRON_BARS, 'iron_bars', { shape: SHAPE.PANE, tex: same('iron_bars'), cutout: true, sound: 'metal', hardness: 1.5, icon: 'flat', boxes: [[0.4375, 0, 0, 0.5625, 1, 1]] });
  // Doors. Closed halves are rendered by the mesher's PANE case (a thin panel across the doorway, textured per
  // half), the open state by its DOOR case (panel along the passage at the hinge edge). Closed doors are solid
  // (selection = full cell; collision = the panel, see doorPanelBoxes); open doors have no collision.
  const door = (kind, tile, extra = {}) => ({ tex: same(tile), cutout: true, sound: 'wood', hardness: 1.0, icon: 'flat', door: kind, drop: B.OAK_DOOR, ...extra });
  def(B.OAK_DOOR, 'oak_door', door('oak', 'oak_door_bottom', { shape: SHAPE.PANE, boxes: CUBE_BOX, boxesAt: doorPanelBoxes }));
  def(B.OAK_DOOR_TOP, 'oak_door_top', door('oak', 'oak_door_top', { displayName: 'Oak Door', shape: SHAPE.PANE, boxes: CUBE_BOX, boxesAt: doorPanelBoxes, doorTop: true, item: false }));
  def(B.OAK_DOOR_OPEN, 'oak_door_open', door('oak', 'oak_door_bottom', { displayName: 'Oak Door', shape: SHAPE.DOOR, solid: false, boxes: [], doorOpen: true, item: false }));
  def(B.SPRUCE_DOOR, 'spruce_door', door('spruce', 'oak_door_bottom', { shape: SHAPE.PANE, boxes: CUBE_BOX, boxesAt: doorPanelBoxes, item: false }));
  def(B.SPRUCE_DOOR_TOP, 'spruce_door_top', door('spruce', 'oak_door_top', { displayName: 'Spruce Door', shape: SHAPE.PANE, boxes: CUBE_BOX, boxesAt: doorPanelBoxes, doorTop: true, item: false }));
  def(B.SPRUCE_DOOR_OPEN, 'spruce_door_open', door('spruce', 'oak_door_bottom', { displayName: 'Spruce Door', shape: SHAPE.DOOR, solid: false, boxes: [], doorOpen: true, item: false }));
  def(B.SALOON_DOOR, 'saloon_door', { shape: SHAPE.SALOON_DOOR, tex: same('saloon_door'), solid: false, cutout: true, sound: 'wood', hardness: 0.8, icon: 'flat', boxes: [] });
  def(B.WALL_SIGN, 'sign', { shape: SHAPE.WALL_SIGN, tex: same('sign'), solid: false, sound: 'wood', hardness: 0.5, icon: 'flat', boxes: [] });
  def(B.BED_HEAD, 'bed', { shape: SHAPE.BED, tex: [T('bed_side'), T('bed_side'), T('bed_head_top'), T('oak_planks'), T('bed_end_head'), T('bed_end_head')], sound: 'wood', hardness: 0.6, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5625, 1]] });
  def(B.BED_FOOT, 'bed_foot', { shape: SHAPE.BED, tex: [T('bed_side'), T('bed_side'), T('bed_foot_top'), T('oak_planks'), T('bed_side'), T('bed_side')], sound: 'wood', hardness: 0.6, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5625, 1]], item: false, drop: B.BED_HEAD });
  def(B.WHITE_WOOL, 'white_wool', { tex: same('wool_white'), sound: 'cloth', hardness: 0.6 });
  def(B.RED_WOOL, 'red_wool', { tex: same('wool_red'), sound: 'cloth', hardness: 0.6 });
  def(B.BLUE_WOOL, 'blue_wool', { tex: same('wool_blue'), sound: 'cloth', hardness: 0.6 });
  def(B.GREEN_WOOL, 'green_wool', { tex: same('wool_green'), sound: 'cloth', hardness: 0.6 });
  def(B.CACTUS, 'cactus', { shape: SHAPE.CACTUS, tex: column('cactus_side', 'cactus_top'), cutout: false, sound: 'cloth', hardness: 0.4, boxes: [[0.0625, 0, 0.0625, 0.9375, 1, 0.9375]] });
  def(B.PIANO, 'piano', { tex: [T('piano_side'), T('piano_side'), T('piano_top'), T('piano_side'), T('piano_front'), T('piano_side')], sound: 'wood', hardness: 1.2 });
  def(B.FURNACE, 'furnace', { tex: [T('furnace_side'), T('furnace_side'), T('furnace_side'), T('furnace_side'), T('furnace_front'), T('furnace_side')], emit: 13, hardness: 2.0 });
  def(B.ANVIL, 'anvil', { shape: SHAPE.ANVIL, tex: column('anvil', 'anvil_top'), sound: 'metal', hardness: 2.5, icon: 'slab', boxes: [[0.125, 0, 0.125, 0.875, 1, 0.875]] });
  def(B.CHEST, 'chest', { shape: SHAPE.CHEST, tex: [T('chest_side'), T('chest_side'), T('chest_top'), T('chest_top'), T('chest_front'), T('chest_side')], sound: 'wood', hardness: 1.2, boxes: [[0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375]], blockEntity: 'chest' });
  def(B.COAL_ORE, 'coal_ore', { tex: same('coal_ore'), hardness: 2.0 });
  def(B.IRON_ORE, 'iron_ore', { tex: same('iron_ore'), hardness: 2.0 });
  def(B.GOLD_ORE, 'gold_ore', { tex: same('gold_ore'), hardness: 2.0 });
  def(B.GRAVESTONE, 'gravestone', { shape: SHAPE.GRAVESTONE, tex: same('gravestone'), cutout: true, hardness: 1.5, icon: 'flat', boxes: [[0.125, 0, 0.375, 0.875, 0.75, 0.625]] });
  def(B.GOLD_BLOCK, 'gold_block', { tex: same('gold_block'), sound: 'metal', hardness: 2.0 });
  def(B.IRON_BLOCK, 'iron_block', { tex: same('iron_block'), sound: 'metal', hardness: 2.0 });
  def(B.PUMPKIN, 'pumpkin', { tex: column('pumpkin_side', 'pumpkin_top'), sound: 'wood', hardness: 0.6 });
  def(B.TROUGH, 'trough', { displayName: 'Water Trough', shape: SHAPE.TROUGH, tex: column('spruce_planks', 'trough', 'spruce_planks'), sound: 'wood', hardness: 1.0, icon: 'slab', boxes: [[0, 0, 0, 1, 0.5, 1]] });
  def(B.TABLE, 'table', { shape: SHAPE.TABLE, tex: same('spruce_planks'), sound: 'wood', hardness: 1.0, boxes: [[0, 0.75, 0, 1, 1, 1], [0.375, 0, 0.375, 0.625, 0.75, 0.625]] });
  // disaster aftermath blocks
  def(B.SCORCHED_STONE, 'scorched_stone', { tex: same('scorched_stone'), hardness: 1.5, drop: B.COBBLESTONE });
  def(B.ASH, 'ash', { tex: same('ash'), sound: 'sand', hardness: 0.4 });
  def(B.MAGMA, 'magma_block', { tex: same('magma'), emit: 13, hardness: 1.5 });
  def(B.CHARRED_PLANKS, 'charred_planks', { tex: same('charred_planks'), sound: 'wood', hardness: 0.6 });
  // --- Star Wars palette
  def(B.DURASTEEL, 'durasteel', { tex: same('durasteel'), sound: 'metal', hardness: 3.0 });
  def(B.DURASTEEL_DARK, 'dark_durasteel', { tex: same('durasteel_dark'), sound: 'metal', hardness: 3.0 });
  def(B.PANEL_BLACK, 'black_panel', { tex: same('panel_black'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_RED, 'red_panel', { tex: same('panel_red'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_STRIPE, 'striped_panel', { tex: column('panel_stripe', 'durasteel_dark'), sound: 'metal', hardness: 2.0 });
  def(B.GLOW_PANEL, 'glow_panel', { tex: same('glow_panel'), emit: 15, sound: 'glass', hardness: 0.5 });
  def(B.GLOW_PANEL_BLUE, 'blue_glow_panel', { tex: same('glow_panel_blue'), emit: 14, sound: 'glass', hardness: 0.5 });
  def(B.HOLO_SIGN, 'holo_sign', { tex: same('holo_sign'), emit: 12, sound: 'glass', hardness: 0.5 });
  def(B.CONSOLE, 'console', { tex: [T('console_side'), T('console_side'), T('console_top'), T('durasteel_dark'), T('console_side'), T('console_side')], emit: 6, sound: 'metal', hardness: 2.0 });
  def(B.VENT, 'vent_grate', { tex: same('vent'), sound: 'metal', hardness: 1.5 });
  def(B.DECK_PLATE, 'deck_plate', { tex: same('deck_plate'), sound: 'metal', hardness: 2.5 });
  def(B.STEEL_GLASS, 'tinted_glass', { tex: same('steel_glass'), opaque: false, cutout: true, sound: 'glass', hardness: 0.4, drop: 0 });
  def(B.CHROME, 'chrome', { tex: same('chrome'), sound: 'metal', hardness: 3.0 });
  def(B.WINDOW_LIT, 'lit_window', { tex: same('window_lit'), emit: 9, sound: 'glass', hardness: 0.5 });
  def(B.WINDOW_DARK, 'dark_window', { tex: same('window_dark'), sound: 'glass', hardness: 0.5 });
  def(B.CITY_LAMP, 'city_lamp', { tex: same('city_lamp'), emit: 15, sound: 'metal', hardness: 0.5 });
  def(B.HULL_PLATE, 'hull_plate', { tex: same('hull_plate'), sound: 'metal', hardness: 4.0 });
  def(B.HULL_TRENCH, 'hull_trench', { tex: same('hull_trench'), sound: 'metal', hardness: 4.0 });
  def(B.NEON_PINK, 'neon_pink', { tex: same('neon_pink'), emit: 14, sound: 'glass', hardness: 0.4 });
  def(B.NEON_GREEN, 'neon_green', { tex: same('neon_green'), emit: 14, sound: 'glass', hardness: 0.4 });
  // --- Coruscant architecture v2: panel fields, trim, light strips, glazing bands and slits
  def(B.PANEL_LIGHT, 'light_panel', { tex: same('panel_light'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_GREY, 'grey_panel', { tex: same('panel_grey'), sound: 'metal', hardness: 2.0 });
  def(B.TRIM_DARK, 'dark_trim', { tex: same('trim_dark'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_BRONZE, 'bronze_panel', { tex: same('panel_bronze'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_SAND, 'sand_panel', { tex: same('panel_sand'), sound: 'metal', hardness: 2.0 });
  def(B.PANEL_SEAM, 'seam_panel', { tex: same('panel_seam'), sound: 'metal', hardness: 2.0 });
  def(B.LIGHT_STRIP, 'light_strip', { tex: same('light_strip'), emit: 12, sound: 'glass', hardness: 0.5 });
  def(B.LIGHT_STRIP_WARM, 'warm_light_strip', { tex: same('light_strip_warm'), emit: 12, sound: 'glass', hardness: 0.5 });
  def(B.WINDOW_BAND_LIT, 'lit_window_band', { tex: same('window_band_lit'), emit: 9, sound: 'glass', hardness: 0.5 });
  def(B.WINDOW_BAND_DARK, 'dark_window_band', { tex: same('window_band_dark'), sound: 'glass', hardness: 0.5 });
  def(B.WINDOW_SLIT_LIT, 'lit_slit', { tex: same('window_slit_lit'), emit: 9, sound: 'glass', hardness: 0.5 });
  def(B.WINDOW_SLIT_DARK, 'dark_slit', { tex: same('window_slit_dark'), sound: 'glass', hardness: 0.5 });

  for (let i = 0; i < 256; i++) if (!BLOCKS[i]) BLOCKS[i] = BLOCKS[B.AIR];
}

// Non-block items (ids >= 1000, see items.js) share the inventory id space with blocks. Each gets a block-like
// entry in BLOCKS so the renderers that draw held/dropped stacks (hand, item drops, HUD icons) work unchanged:
// a flat icon quad using the item's tile. Items never appear in the world (chunk data is 8-bit).
export const ITEM_ID_BASE = 1000;
export const isItemId = (id) => id >= ITEM_ID_BASE;
export function registerItemDef(id, name, displayName, tile) {
  const b = def(id, name, { displayName, shape: SHAPE.CROSS, tex: same(tile), solid: false, opaque: false, cutout: true, icon: 'flat', boxes: [], item: false, drop: 0, hardness: 0, sound: 'cloth' });
  b.isItem = true;
  return b;
}

export const isOpaque = (id) => BLOCKS[id].opaque;
export const isSolid = (id) => BLOCKS[id].solid;

// Hotbar / creative palette order
export const PALETTE = [
  B.GRASS, B.DIRT, B.STONE, B.COBBLESTONE, B.SAND, B.GRAVEL, B.OAK_LOG, B.OAK_PLANKS, B.GLASS,
  B.BRICKS, B.STONE_BRICKS, B.SMOOTH_STONE, B.SANDSTONE, B.SPRUCE_LOG, B.SPRUCE_PLANKS, B.WHITE_PLANKS, B.STRIPPED_OAK, B.BIRCH_LOG,
  B.OAK_LEAVES, B.SPRUCE_LEAVES, B.BIRCH_LEAVES, B.OAK_SLAB, B.SPRUCE_SLAB, B.COBBLE_SLAB, B.STONE_BRICK_SLAB, B.OAK_FENCE, B.SPRUCE_FENCE,
  B.WHITE_FENCE, B.LANTERN, B.TORCH, B.RAIL, B.BARREL, B.CRATE, B.HAY_BALE, B.SHELF, B.BOOKSHELF,
  B.IRON_BARS, B.OAK_DOOR, B.SALOON_DOOR, B.WALL_SIGN, B.BED_HEAD, B.TABLE, B.CHEST, B.ANVIL, B.FURNACE,
  B.PIANO, B.WHITE_WOOL, B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.PLASTER, B.DIRT_PATH, B.MUD, B.COARSE_DIRT,
  B.FARMLAND, B.CACTUS, B.DEAD_BUSH, B.TALL_GRASS, B.DANDELION, B.POPPY, B.PUMPKIN, B.TROUGH, B.GRAVESTONE,
  B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.GOLD_BLOCK, B.IRON_BLOCK, B.SNOW, B.SCORCHED_STONE, B.ASH, B.MAGMA, B.CHARRED_PLANKS,
  B.DURASTEEL, B.DURASTEEL_DARK, B.PANEL_BLACK, B.PANEL_RED, B.PANEL_STRIPE, B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.HOLO_SIGN, B.CONSOLE,
  B.VENT, B.DECK_PLATE, B.STEEL_GLASS, B.CHROME, B.WINDOW_LIT, B.WINDOW_DARK, B.CITY_LAMP, B.HULL_PLATE, B.HULL_TRENCH,
  B.NEON_PINK, B.NEON_GREEN,
  B.PANEL_LIGHT, B.PANEL_GREY, B.TRIM_DARK, B.PANEL_BRONZE, B.PANEL_SAND, B.PANEL_SEAM, B.LIGHT_STRIP, B.LIGHT_STRIP_WARM,
  B.WINDOW_BAND_LIT, B.WINDOW_BAND_DARK, B.WINDOW_SLIT_LIT, B.WINDOW_SLIT_DARK,
];
