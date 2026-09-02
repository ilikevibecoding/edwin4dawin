import * as THREE from 'three';
import { makeRng } from './util.js';

/**
 * Physical size (meters) covered by one repeat of each Poly Haven set. Geometry carries meter UVs
 * (see geo.js) so repeat = 1 / tile. Values were eyeballed from the diffuse maps: stone blocks
 * 0.3–0.5 m, plaza slabs 0.6–0.7 m, cobbles ~0.12 m, roof tile columns ~0.2 m.
 */
export const TILE = {
  pavement_01: 3.8,
  marble_tiles: 1.6,
  cobblestone_floor_08: 1.7,
  patterned_cobblestone_02: 2.2,
  terracotta_floor_tiles: 1.0,
  brick_villa_floor: 1.0,
  painted_plaster_wall: 2.6,
  plaster_stone_wall_01: 2.6,
  beige_wall_001: 2.2,
  beige_wall_002: 2.2,
  plastered_wall_02: 2.2,
  white_plaster_rough_02: 2.2,
  clay_plaster: 2.2,
  medieval_blocks_03: 2.4,
  sandstone_blocks_05: 2.2,
  rustic_stone_wall: 2.2,
  red_brick_plaster_patch_02: 1.6,
  clay_roof_tiles_02: 2.0,
  roof_07: 1.6,
  wood_planks_grey: 1.0,
  wood_plank_wall: 1.0,
  painted_metal_shutter: 1.0,
  metal_plate_02: 1.0,
  green_metal_rust: 1.0,
  gravel_floor_02: 1.2,
  dirt_floor: 1.5,
};

/** Width / height of non-square texture sets (everything else is square). */
const TEX_ASPECT = { beige_wall_002: 4 };

/** Chipped-plaster brick decal size (m); all patches share one material so they must share one size. */
export const PATCH_SIZE = [1.5, 1.1];

/**
 * Material library: caches materials by name so batching merges as much geometry as possible.
 * All textured materials use vertexColors so per-building tints and grime gradients cost no extra
 * draw calls.
 */
export class MaterialLib {
  constructor(game) {
    this.game = game;
    this._cache = new Map();
    this.all = [];
    this._canvasTex = new Map();
  }

  /** PBR material from a Poly Haven set, tiled at its physical size (optionally overridden). */
  pbr(id, opts = {}, key = null) {
    const k = key || `${id}|${JSON.stringify(opts)}`;
    if (this._cache.has(k)) return this._cache.get(k);
    const { tile = TILE[id] || 2, tileV = null, rotation = 0, vertexColors = true, noShadow = false, ...rest } = opts;
    // Non-square scans (beige_wall_002 is 4:1) would be squashed by a uniform repeat; keep texels square.
    const aspect = TEX_ASPECT[id] || 1;
    const mat = this.game.assets.createPBRMaterial(id, {
      repeat: [1 / tile, aspect / (tileV || tile)],
      rotation,
      vertexColors,
      roughness: 1,
      ...rest,
    });
    mat.name = k;
    if (noShadow) mat.userData.noShadow = true; // Batcher: merged mesh gets castShadow = false
    this._cache.set(k, mat);
    this.all.push(mat);
    return mat;
  }

  /** Untextured / canvas-textured material (cached by name). */
  plain(name, opts = {}, physical = false) {
    if (this._cache.has(name)) return this._cache.get(name);
    const { noShadow = false, ...rest } = opts;
    const Mat = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const mat = new Mat({ vertexColors: true, roughness: 0.8, metalness: 0, ...rest });
    mat.name = name;
    if (noShadow) mat.userData.noShadow = true;
    this._cache.set(name, mat);
    this.all.push(mat);
    return mat;
  }

  get(name) {
    return this._cache.get(name);
  }

  /** Wait for all texture sets to be loaded so first frame / screenshots are fully textured. */
  async ready() {
    await Promise.all(this.all.map((m) => m.userData?.ready).filter(Boolean));
  }

  canvasTexture(name, make, opts = {}) {
    if (this._canvasTex.has(name)) return this._canvasTex.get(name);
    const canvas = make();
    const tex = this.game.assets.canvasTexture(canvas, opts);
    tex.name = name;
    this._canvasTex.set(name, tex);
    return tex;
  }

  // ---------------------------------------------------------------------------------------------
  // Preset materials used throughout the level.

  /** Ground */
  get plaza() {
    // Stronger normal so the slab joints still read at eye height; grout is the main close-range cue.
    return this.pbr('pavement_01', { normalScale: 1.35, noShadow: true }, 'plaza');
  }
  get plazaLight() {
    return this.pbr('marble_tiles', { normalScale: 0.8, tile: 2.0, noShadow: true }, 'plaza_light');
  }
  get terracotta() {
    // Reference bands are rows of brick pavers in a muted salmon-terracotta (sunlit ≈ sRGB 191,138,112),
    // not saturated red mosaic: brick paving scan, lifted and desaturated toward that. polygonOffset keeps
    // the layered inlays free of z-fighting.
    return this.pbr('brick_villa_floor', { color: new THREE.Color(3.6, 3.0, 3.7), tile: 1.1, normalScale: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.92, noShadow: true }, 'terracotta');
  }
  get blueStone() {
    // Slate blue-grey (reference ≈ sRGB 99,132,151), not sky blue.
    return this.pbr('marble_tiles', { color: new THREE.Color(0.17, 0.4, 0.74), tile: 1.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.8, noShadow: true }, 'blue_stone');
  }
  get wetStain() {
    // Damp/dark patch decal for gutters, drains and fountain splash: darker and less brown than groundGrime,
    // with a touch of gloss so it reads as moisture rather than soot.
    const alphaMap = this.canvasTexture('blotch_alpha', makeBlotchCanvas, { srgb: false, repeat: [1, 1] });
    return this.plain('wet_stain', {
      color: 0x1a1c1e,
      alphaMap,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      vertexColors: false,
      noShadow: true,
    });
  }
  get leafLitter() {
    const map = this.canvasTexture('leaf_litter', makeLitterCanvas);
    return this.plain('leaf_litter', { map, color: 0xffffff, roughness: 0.9, alphaTest: 0.5, vertexColors: false, noShadow: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  get groundMottle() {
    // Whole-plaza tonal variation: a single low-frequency noise sheet laid over the slabs so the paving is
    // not one even tone from curb to curb (the reference slabs drift between dusty and darker patches).
    const alphaMap = this.canvasTexture('mottle_alpha', makeMottleCanvas, { srgb: false, repeat: [1, 1] });
    return this.plain('ground_mottle', {
      color: 0x2b2824,
      alphaMap,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexColors: false,
      noShadow: true,
    });
  }
  get groundGrime() {
    // Soft dark blotches layered on the paving: wear around the fountain, under trees, at street mouths.
    const alphaMap = this.canvasTexture('blotch_alpha', makeBlotchCanvas, { srgb: false, repeat: [1, 1] });
    return this.plain('ground_grime', {
      color: 0x2a251f,
      alphaMap,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      vertexColors: false,
      noShadow: true,
    });
  }
  get darkSlate() {
    return this.pbr('pavement_01', { color: new THREE.Color(0.32, 0.34, 0.38), tile: 2.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, noShadow: true }, 'dark_slate');
  }
  get cobbles() {
    return this.pbr('cobblestone_floor_08', { normalScale: 1.0, noShadow: true }, 'cobbles');
  }
  get sidewalk() {
    return this.pbr('patterned_cobblestone_02', { normalScale: 0.8, noShadow: true }, 'sidewalk');
  }
  get curb() {
    return this.pbr('sandstone_blocks_05', { tile: 1.6, color: new THREE.Color(0.85, 0.84, 0.8) }, 'curb');
  }
  get gravel() {
    return this.pbr('gravel_floor_02', { noShadow: true }, 'gravel');
  }
  get dirt() {
    return this.pbr('dirt_floor', { noShadow: true }, 'dirt');
  }

  /** Walls */
  wall(id) {
    return this.pbr(id, { normalScale: 0.8 }, `wall:${id}`);
  }
  get stoneBlocks() {
    return this.pbr('medieval_blocks_03', { normalScale: 1.0 }, 'stone_blocks');
  }
  get sandstone() {
    return this.pbr('sandstone_blocks_05', { normalScale: 0.9 }, 'sandstone');
  }
  get rusticStone() {
    return this.pbr('rustic_stone_wall', { normalScale: 1.0 }, 'rustic_stone');
  }
  get trimStone() {
    // Smooth dressed stone for sills, lintels, cornices, copings.
    return this.pbr('sandstone_blocks_05', { tile: 3.5, normalScale: 0.35, roughness: 0.85 }, 'trim_stone');
  }
  get brickPatch() {
    // Chipped plaster revealing brick: decal plane with 0..1 UVs, alpha = ragged blob. The brick map repeat
    // is set for the PATCH_SIZE decal so bricks stay ~8 × 20 cm.
    const alphaMap = this.canvasTexture('patch_alpha', makePatchCanvas, { srgb: false, repeat: [1, 1] });
    return this.pbr(
      'red_brick_plaster_patch_02',
      { tile: TILE.red_brick_plaster_patch_02 / PATCH_SIZE[0], tileV: TILE.red_brick_plaster_patch_02 / PATCH_SIZE[1], normalScale: 1.0, roughness: 0.95, color: new THREE.Color(0.9, 0.86, 0.82), alphaMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, vertexColors: false, noShadow: true },
      'brick_patch',
    );
  }
  get roofTiles() {
    // The scan is a vivid new-tile orange; the reference roofs are darker, dustier brown-red. Pull the
    // saturation down (blue > red multiplier) and the value down.
    return this.pbr('clay_roof_tiles_02', { normalScale: 1.1, roughness: 0.92, color: new THREE.Color(0.66, 0.62, 0.66) }, 'roof_tiles');
  }
  get roofTilesOld() {
    // roof_07 (lichen-grey northern tile) read as tar paper from the balconies, whatever the tint. Use the
    // clay scan again but lighter and pinker: sun-faded terracotta, distinct from the darker roofTiles.
    return this.pbr('clay_roof_tiles_02', { normalScale: 1.0, roughness: 0.95, color: new THREE.Color(0.98, 0.84, 0.76) }, 'roof_tiles_old');
  }
  get woodGrey() {
    return this.pbr('wood_planks_grey', { normalScale: 0.8, roughness: 0.85 }, 'wood_grey');
  }
  get woodBrown() {
    // The scan averages sRGB (66,51,44) ≈ 0.04 linear — near black once tinted. Lift it so the
    // 0.4–0.6 vertex tints used for doors/balconies land on a medium brown instead of a void.
    return this.pbr('wood_plank_wall', { normalScale: 0.8, roughness: 0.75, color: new THREE.Color(3.4, 3.2, 3.0) }, 'wood_brown');
  }
  get paintedMetal() {
    return this.pbr('painted_metal_shutter', { roughness: 0.6, metalness: 0.2, normalScale: 0.9 }, 'painted_metal');
  }
  get steel() {
    return this.pbr('metal_plate_02', { roughness: 0.55, metalness: 0.8, physical: true }, 'steel');
  }
  get greenMetal() {
    return this.pbr('green_metal_rust', { roughness: 0.65, metalness: 0.3 }, 'green_metal');
  }

  /** Solid-color / special */
  get iron() {
    // Painted wrought iron: mostly dielectric so thin bars do not mirror the sky as bright violet streaks.
    return this.plain('iron', { color: 0x1c1c1f, roughness: 0.62, metalness: 0.45 });
  }
  get zinc() {
    // Drainpipes / gutters: dull weathered grey rather than polished chrome.
    return this.plain('zinc', { color: 0x4d4f4c, roughness: 0.6, metalness: 0.55 });
  }
  get bronzeDark() {
    // Statue bronze: dark, slightly greened, with the scan's own normal/ARM maps applied by the caller.
    const map = this.canvasTexture('patina', makePatinaCanvas, { repeat: [3, 3] });
    return this.plain('bronze_dark', { map, color: 0xcfc2ac, roughness: 0.46, metalness: 0.78, vertexColors: false, envMapIntensity: 1.1 });
  }
  get waterStream() {
    return this.plain('water_stream', { color: 0xdfeef5, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.45, depthWrite: false, vertexColors: false, noShadow: true, side: THREE.DoubleSide }, true);
  }
  get glass() {
    // Semi-transparent so the dim `interior` backing plane shows through under the sky reflection;
    // depthWrite stays on so nothing behind the facade leaks through at grazing angles.
    return this.plain(
      'glass',
      { color: 0x16222c, roughness: 0.05, metalness: 0.0, envMapIntensity: 2.0, clearcoat: 1, clearcoatRoughness: 0.04, reflectivity: 0.95, transparent: true, opacity: 0.58, vertexColors: false, noShadow: true },
      true,
    );
  }
  get interior() {
    // Backing plane behind window glass: a dim room with a few warm lit patches (shelves, lamps) so
    // big shop windows never read as black voids. Meter UVs → one repeat every 2.4 m.
    const map = this.canvasTexture('interior', makeInteriorCanvas, { repeat: [1 / 2.4, 1 / 2.4] });
    return this.plain('interior', { map, color: 0xffffff, roughness: 1, vertexColors: false, noShadow: true, emissive: new THREE.Color(0.7, 0.58, 0.44), emissiveMap: map, emissiveIntensity: 1.1 });
  }
  get water() {
    // Deep teal, near-mirror: the sky reflection is what sells still water; the basin tiles show through faintly.
    return this.plain(
      'water',
      { color: 0x0b2a36, roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.8, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 1, vertexColors: false, depthWrite: true, noShadow: true },
      true,
    );
  }
  get sea() {
    return this.plain('sea', { color: 0x1d5a7c, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.3, clearcoat: 0.6, clearcoatRoughness: 0.15, vertexColors: false, noShadow: true }, true);
  }
  get bronze() {
    const map = this.canvasTexture('patina', makePatinaCanvas);
    return this.plain('bronze', { map, color: 0xffffff, roughness: 0.5, metalness: 0.78, vertexColors: false, envMapIntensity: 1.2 });
  }
  get paint() {
    // Painted wood / metal (frames, doors, rails) — tint via vertex colors over a subtle grain.
    // Frames and doors sit inside recesses, so their shadows are never visible: skip them in the cascades.
    // wood_planks_grey averages ≈ 0.065 linear; ×2.8 puts the "white" frame tints (~1.7) near 0.3.
    return this.pbr('wood_planks_grey', { tile: 0.6, normalScale: 0.5, roughness: 0.7, noShadow: true, color: new THREE.Color(2.8, 2.8, 2.8) }, 'paint');
  }
  get shutter() {
    // Louvred shutter leaf: slats are painted into the texture (highlight/shadow per slat, 8 cm pitch)
    // instead of modelled — 12 triangles per leaf instead of ~80, and they read better at distance.
    const map = this.canvasTexture('louvre', makeLouvreCanvas, { repeat: [2.5, 2.5] });
    return this.plain('shutter', { map, color: 0xffffff, roughness: 0.65 });
  }
  get canvasStripe() {
    const map = this.canvasTexture('awning_stripe', makeStripeCanvas, { repeat: [1, 1] });
    return this.plain('awning', { map, color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  }
  get canvasPlain() {
    // Sun-bleached cream canvas (parasols): a fine, low-contrast weave so it reads as cotton duck, not sacking.
    const map = this.canvasTexture('canvas_weave', makeCanvasWeaveCanvas, { repeat: [5, 5] });
    return this.plain('canvas_plain', { map, color: 0xffffff, roughness: 0.92, side: THREE.DoubleSide });
  }
  get burlap() {
    // Sandbags are an InstancedMesh of a bare SphereGeometry (no color attribute): with vertexColors on, the
    // missing attribute reads as black. Per-bag variation comes from instanceColor instead.
    const map = this.canvasTexture('burlap', makeBurlapCanvas, { repeat: [1, 1] });
    return this.plain('burlap', { map, color: 0xffffff, roughness: 1, vertexColors: false });
  }
  get shrubLeaf() {
    const map = this.canvasTexture('shrub_cards', makeShrubCanvas);
    return this.plain('shrub_leaf', { map, color: 0xffffff, roughness: 0.9, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: false });
  }
  get signCafe() {
    const map = this.canvasTexture('sign_cafe', makeCafeSignCanvas);
    return this.plain('sign_cafe', { map, color: 0xffffff, roughness: 0.55, vertexColors: false, noShadow: true });
  }
  get streetPlaque() {
    const map = this.canvasTexture('street_plaque', makePlaqueCanvas);
    return this.plain('street_plaque', { map, color: 0xffffff, roughness: 0.4, vertexColors: false, noShadow: true });
  }
  get concrete() {
    return this.pbr('white_plaster_rough_02', { tile: 1.6, color: new THREE.Color(0.72, 0.7, 0.66), roughness: 0.95 }, 'concrete');
  }
  get grime() {
    const alphaMap = this.canvasTexture('grime_alpha', makeGrimeCanvas, { srgb: false, repeat: [1, 1] });
    return this.plain('grime', {
      color: 0x241f1a,
      alphaMap,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexColors: false,
      noShadow: true,
    });
  }
  get leaf() {
    const map = this.canvasTexture('leaf_cards', makeLeafCanvas);
    return this.plain('leaf', { map, color: 0xffffff, roughness: 0.85, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: false });
  }
  get ivy() {
    const map = this.canvasTexture('ivy_cards', makeIvyCanvas);
    return this.plain('ivy', { map, color: 0xffffff, roughness: 0.9, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: false });
  }
  get bark() {
    const map = this.canvasTexture('bark', makeBarkCanvas, { repeat: [1, 1] });
    return this.plain('bark', { map, color: 0xffffff, roughness: 0.95 });
  }
  get bulb() {
    return this.plain('bulb', { color: 0xfff2d8, emissive: new THREE.Color(1.6, 1.25, 0.85), emissiveIntensity: 1.6, roughness: 0.3, vertexColors: false, noShadow: true });
  }
  get lampGlass() {
    return this.plain('lamp_glass', { color: 0xfff1d0, emissive: new THREE.Color(0.9, 0.7, 0.4), emissiveIntensity: 0.5, roughness: 0.3, vertexColors: false, transparent: true, opacity: 0.85, noShadow: true });
  }
  get distant() {
    return this.plain('distant', { color: 0xffffff, roughness: 0.95, noShadow: true });
  }
  get hill() {
    return this.plain('hill', { color: 0x6b7565, roughness: 1, vertexColors: false, noShadow: true });
  }
}

// -------------------------------------------------------------------------------------------------
// Procedural canvas textures

function noise2(rng, w, h, octaves = 4) {
  // Cheap value-noise field in [0,1] used for grime/patina/burlap variation.
  const field = new Float32Array(w * h);
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o;
    const grid = new Float32Array((cells + 1) * (cells + 1));
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    const amp = 1 / (1 << o);
    for (let y = 0; y < h; y++) {
      const gy = (y / h) * cells;
      const y0 = Math.floor(gy);
      const ty = gy - y0;
      for (let x = 0; x < w; x++) {
        const gx = (x / w) * cells;
        const x0 = Math.floor(gx);
        const tx = gx - x0;
        const a = grid[y0 * (cells + 1) + x0];
        const b = grid[y0 * (cells + 1) + Math.min(x0 + 1, cells)];
        const c = grid[Math.min(y0 + 1, cells) * (cells + 1) + x0];
        const d = grid[Math.min(y0 + 1, cells) * (cells + 1) + Math.min(x0 + 1, cells)];
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const v = (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
        field[y * w + x] += v * amp;
      }
    }
  }
  let max = 0;
  for (let o = 0; o < octaves; o++) max += 1 / (1 << o);
  for (let i = 0; i < field.length; i++) field[i] /= max;
  return field;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Leaf cluster card: several overlapping leaves on transparent background (alpha-tested). */
export function makeLeafCanvas() {
  const S = 512;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(77);
  ctx.clearRect(0, 0, S, S);
  const shades = ['#3f6a2a', '#4d7c31', '#5f8f3b', '#35591f', '#6c9a44', '#456f2c'];
  const drawLeaf = (x, y, len, wid, rot, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.bezierCurveTo(wid / 2, -len / 4, wid / 2, len / 4, 0, len / 2);
    ctx.bezierCurveTo(-wid / 2, len / 4, -wid / 2, -len / 4, 0, -len / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,10,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.lineTo(0, len / 2);
    ctx.stroke();
    ctx.restore();
  };
  // Twigs
  ctx.strokeStyle = '#4a3a26';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.lineTo(rng.range(50, S - 50), rng.range(50, S - 50));
    ctx.stroke();
  }
  // A 1.3–2 m card carries ~400 leaves of 8–14 cm (plane-tree scale); the old 8 huge leaves per card read
  // as cardboard cut-outs from under the tree. Darker shades toward the card centre fake self-shadowing.
  for (let i = 0; i < 420; i++) {
    const r = Math.pow(rng(), 0.7) * S * 0.46;
    const a = rng.range(0, Math.PI * 2);
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    const shade = rng.pick(shades);
    const inner = r < S * 0.2 && rng.chance(0.5);
    drawLeaf(x, y, rng.range(26, 46), rng.range(14, 24), rng.range(0, Math.PI * 2), inner ? '#2d4a1e' : shade);
  }
  return c;
}

/** Shrub cards: small dense oval leaves (box / laurel), lighter tips, dark interior. */
export function makeShrubCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(4242);
  ctx.clearRect(0, 0, S, S);
  const shades = ['#2f5a22', '#3b6a2a', '#4a7d33', '#57893a', '#28481c', '#6a9a44'];
  for (let i = 0; i < 520; i++) {
    const r = Math.pow(rng(), 0.6) * S * 0.47;
    const a = rng.range(0, Math.PI * 2);
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    const len = rng.range(9, 16);
    const wid = rng.range(5, 9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(0, Math.PI * 2));
    // Interior leaves darker (in shadow), rim leaves brighter.
    ctx.fillStyle = r < S * 0.25 ? rng.pick(shades.slice(0, 3)) : rng.pick(shades.slice(2));
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return c;
}

/** Ground leaf litter card: a scatter of dry brown/ochre leaves on transparent background. */
export function makeLitterCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(808);
  ctx.clearRect(0, 0, S, S);
  const shades = ['#8a6a3a', '#a07a40', '#6f5430', '#b08a4c', '#7a5a2c', '#9c7038'];
  for (let i = 0; i < 46; i++) {
    const r = Math.pow(rng(), 0.55) * S * 0.44;
    const a = rng.range(0, Math.PI * 2);
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    const len = rng.range(14, 26);
    const wid = rng.range(8, 16);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(0, Math.PI * 2));
    ctx.fillStyle = rng.pick(shades);
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.bezierCurveTo(wid / 2, -len / 4, wid / 2, len / 4, 0, len / 2);
    ctx.bezierCurveTo(-wid / 2, len / 4, -wid / 2, -len / 4, 0, -len / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,10,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.lineTo(0, len / 2);
    ctx.stroke();
    ctx.restore();
  }
  return c;
}

/** Ragged blob alpha for chipped-plaster patches: hard-edged, irregular, fully opaque inside. */
export function makePatchCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(606);
  const n = noise2(rng, S, S, 4);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2);
      const dy = (y - S / 2) / (S / 2);
      const ang = Math.atan2(dy, dx);
      // Lumpy radius: 3 lobes + noise, so the outline is never an ellipse.
      const rad = 0.62 + 0.14 * Math.sin(ang * 3 + 1.2) + 0.1 * Math.sin(ang * 5 - 0.6) + (n[y * S + x] - 0.5) * 0.5;
      const r = Math.hypot(dx, dy);
      const a = r < rad ? 1 : 0;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Café fascia sign: dark green board, gold serif lettering, thin gold border. 4:1. */
export function makeCafeSignCanvas() {
  const W = 1024;
  const H = 256;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f3a2c';
  ctx.fillRect(0, 0, W, H);
  const rng = makeRng(77);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rng.range(0.03, 0.12)})`;
    ctx.fillRect(rng.range(0, W), rng.range(0, H), rng.range(1, 6), rng.range(1, 3));
  }
  ctx.strokeStyle = '#c9a54a';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.fillStyle = '#d8b455';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 118px Georgia, "Times New Roman", serif';
  ctx.fillText('CAFÉ  DEL  PUERTO', W / 2, H / 2 - 14);
  ctx.font = 'italic 44px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#b89a48';
  ctx.fillText('bar · tapas · helados', W / 2, H / 2 + 74);
  return c;
}

/** Enamel street-name plaque (blue field, white border + text). 2:1. */
export function makePlaqueCanvas() {
  const W = 512;
  const H = 256;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e9ebe6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d3f7a';
  ctx.fillRect(14, 14, W - 28, H - 28);
  ctx.fillStyle = '#f2f3ee';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 74px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('PLAZA  MAYOR', W / 2, H / 2 - 22);
  ctx.font = '40px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('— del Puerto —', W / 2, H / 2 + 52);
  return c;
}

/** Dense ivy patch card: small heart-shaped leaves, dark greens, soft edge falloff. */
export function makeIvyCanvas() {
  const S = 512;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(913);
  ctx.clearRect(0, 0, S, S);
  const shades = ['#2f5222', '#3a6329', '#2a4a1e', '#447033', '#355c27'];
  for (let i = 0; i < 420; i++) {
    const r = Math.pow(rng(), 0.6) * S * 0.46;
    const a = rng.range(0, Math.PI * 2);
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r * 1.05;
    const s = rng.range(14, 30);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(0, Math.PI * 2));
    ctx.fillStyle = rng.pick(shades);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.bezierCurveTo(s * 0.9, 0, s * 0.6, -s * 0.8, 0, -s * 0.3);
    ctx.bezierCurveTo(-s * 0.6, -s * 0.8, -s * 0.9, 0, 0, s * 0.6);
    ctx.fill();
    ctx.restore();
  }
  return c;
}

/** Bark: vertical fibrous streaks in brown/grey. */
export function makeBarkCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(31);
  const n = noise2(rng, S, S, 4);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = n[y * S + x];
      const streak = 0.5 + 0.5 * Math.sin(x * 0.9 + v * 6);
      const t = v * 0.6 + streak * 0.4;
      const i = (y * S + x) * 4;
      img.data[i] = 70 + t * 60;
      img.data[i + 1] = 58 + t * 45;
      img.data[i + 2] = 45 + t * 32;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Bronze patina: dark bronze with verdigris streaks. */
export function makePatinaCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(5);
  const n = noise2(rng, S, S, 5);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = n[y * S + x];
      const green = Math.max(0, (v - 0.55) * 2.2);
      const i = (y * S + x) * 4;
      const br = [78, 66, 50];
      const vg = [88, 130, 108];
      img.data[i] = br[0] * (1 - green) + vg[0] * green;
      img.data[i + 1] = br[1] * (1 - green) + vg[1] * green;
      img.data[i + 2] = br[2] * (1 - green) + vg[2] * green;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Awning stripes: sun-faded burgundy / unbleached canvas, with weave noise and dust so it is not a candy stripe. */
export function makeStripeCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#d9cdb4' : '#7d3a34';
    ctx.fillRect((i * S) / stripes, 0, S / stripes + 1, S);
  }
  const rng = makeRng(9);
  // Weave: fine horizontal + vertical thread lines.
  for (let y = 0; y < S; y += 2) {
    ctx.fillStyle = `rgba(30,20,15,${rng.range(0.03, 0.08)})`;
    ctx.fillRect(0, y, S, 1);
  }
  for (let x = 0; x < S; x += 2) {
    ctx.fillStyle = `rgba(255,250,240,${rng.range(0.02, 0.06)})`;
    ctx.fillRect(x, 0, 1, S);
  }
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(60,40,30,${rng.range(0.02, 0.09)})`;
    ctx.fillRect(rng.range(0, S), rng.range(0, S), rng.range(1, 4), rng.range(1, 4));
  }
  return c;
}

/** Burlap for sandbags. */
export function makeBurlapCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(21);
  const n = noise2(rng, S, S, 3);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const weave = 0.5 + 0.25 * Math.sin(x * 1.6) + 0.25 * Math.sin(y * 1.6);
      const t = n[y * S + x] * 0.5 + weave * 0.5;
      const i = (y * S + x) * 4;
      img.data[i] = 120 + t * 55;
      img.data[i + 1] = 105 + t * 48;
      img.data[i + 2] = 72 + t * 36;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Low-frequency mottle alpha for the whole-plaza tonal variation sheet (one 512² texture over ~50 m). */
export function makeMottleCanvas() {
  const S = 512;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(31);
  const n = noise2(rng, S, S, 6);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = n[y * S + x];
      // Only the darker half of the field shows, so about half the plaza keeps the clean slab tone.
      const a = Math.max(0, Math.min(1, (v - 0.46) * 2.4)) * (0.6 + 0.4 * v);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(a * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Light cotton-duck weave for parasol canvas: near-white with a faint thread grid and soft blotching. */
export function makeCanvasWeaveCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(23);
  const n = noise2(rng, S, S, 3);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const weave = 0.5 + 0.25 * Math.sin(x * 1.6) + 0.25 * Math.sin(y * 1.6);
      const t = n[y * S + x] * 0.6 + weave * 0.4;
      const i = (y * S + x) * 4;
      // kept below ~0.6 linear so a sunlit canopy still shows its weave instead of clipping to flat white
      img.data[i] = 186 + t * 28;
      img.data[i + 1] = 178 + t * 28;
      img.data[i + 2] = 160 + t * 28;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Grime alpha: opaque at the bottom fading out toward the top, with noisy edge. */
export function makeGrimeCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(3);
  const n = noise2(rng, S, S, 4);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    const t = 1 - y / S; // canvas y=0 is the top → uv v=1 (flipY) ... we treat row 0 as top of the decal
    for (let x = 0; x < S; x++) {
      const v = n[y * S + x];
      const a = Math.max(0, Math.min(1, (1 - t) * 1.35 - 0.35 + (v - 0.5) * 0.9));
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(a * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Louvred shutter: one repeat = 0.4 m = 9 slats (≈ 4.5 cm pitch, real louvre scale). Each slat has a
 * narrow highlight on its top edge, a gentle falloff and a thin shadow line beneath; the base is a light
 * grey so the vertex-color tint sets the paint colour. Subtle vertical stile shading at the card edges.
 */
export function makeLouvreCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(21);
  const slats = 9;
  const sh = S / slats;
  for (let i = 0; i < slats; i++) {
    const y0 = i * sh;
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + sh);
    grad.addColorStop(0, '#e6e6e2');
    grad.addColorStop(0.12, '#d2d2ce');
    grad.addColorStop(0.7, '#b4b4b0');
    grad.addColorStop(0.9, '#8e8e8a');
    grad.addColorStop(1, '#5c5c5a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, S, sh + 1);
  }
  // Paint wear / dust speckle and faint vertical grain.
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(40,30,20,${rng.range(0.02, 0.07)})`;
    ctx.fillRect(rng.range(0, S), rng.range(0, S), rng.range(1, 2), rng.range(2, 9));
  }
  return c;
}

/**
 * Dim room interior seen through window glass: near-black warm base with a shelf line, a couple of
 * soft lamp glows and faint rectangles (pictures / cabinets). Doubles as the emissive map so the
 * lit patches glow faintly while the rest stays dark. One repeat = 2.4 m.
 */
export function makeInteriorCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(31);
  // Low albedo overall: sunlight reaches this plane through the opening, so anything brighter than
  // ~0.15 reads as a floodlit room. The lamp glows come from emissive, not albedo.
  ctx.fillStyle = '#17120f';
  ctx.fillRect(0, 0, S, S);
  const wall = ctx.createLinearGradient(0, 0, 0, S);
  wall.addColorStop(0, 'rgba(70,58,46,0.5)');
  wall.addColorStop(0.55, 'rgba(46,38,30,0.35)');
  wall.addColorStop(1, 'rgba(8,6,4,0.7)');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, S, S);
  // Dado line, dark floor band and a few muted furniture silhouettes (cabinets, pictures).
  ctx.fillStyle = 'rgba(96,78,58,0.55)';
  ctx.fillRect(0, S * 0.58, S, 3);
  ctx.fillStyle = 'rgba(28,20,14,0.9)';
  ctx.fillRect(0, S * 0.7, S, S * 0.3);
  for (let i = 0; i < 5; i++) {
    const w = rng.range(18, 46);
    const h = rng.range(14, 40);
    const x = rng.range(4, S - w - 4);
    const y = rng.range(S * 0.1, S * 0.5);
    ctx.fillStyle = `rgba(${Math.round(rng.range(50, 80))},${Math.round(rng.range(40, 62))},${Math.round(rng.range(28, 46))},0.75)`;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(10,7,5,0.6)';
    ctx.fillRect(x, y + h - 3, w, 3);
  }
  // Two soft warm lamp glows.
  for (let i = 0; i < 2; i++) {
    const x = S * (0.25 + 0.5 * i) + rng.range(-20, 20);
    const y = S * rng.range(0.2, 0.36);
    const r = rng.range(20, 30);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(235,200,150,0.9)');
    g.addColorStop(0.35, 'rgba(180,135,85,0.5)');
    g.addColorStop(1, 'rgba(90,60,35,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return c;
}

/** Radial grime blotch alpha (soft noisy blob) for ground wear decals. */
export function makeBlotchCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(11);
  const n = noise2(rng, S, S, 5);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - S / 2) / (S / 2);
      const dy = (y - S / 2) / (S / 2);
      const r = Math.hypot(dx, dy);
      const v = n[y * S + x];
      const a = Math.max(0, Math.min(1, (1 - r * 1.15) * 1.4 + (v - 0.5) * 1.3)) * (0.55 + 0.45 * v);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(a * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
