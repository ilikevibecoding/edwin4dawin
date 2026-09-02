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
    const mat = this.game.assets.createPBRMaterial(id, {
      repeat: [1 / tile, 1 / (tileV || tile)],
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
    return this.pbr('pavement_01', { normalScale: 0.9, noShadow: true }, 'plaza');
  }
  get plazaLight() {
    return this.pbr('marble_tiles', { normalScale: 0.7, tile: 2.0, noShadow: true }, 'plaza_light');
  }
  get terracotta() {
    // Brightened toward the reference's sunlit orange bands; polygonOffset keeps inlays free of z-fighting.
    return this.pbr('terracotta_floor_tiles', { color: new THREE.Color(2.1, 1.6, 1.08), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.9, noShadow: true }, 'terracotta');
  }
  get blueStone() {
    return this.pbr('marble_tiles', { color: new THREE.Color(0.3, 0.55, 1.15), tile: 1.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, roughness: 0.75, noShadow: true }, 'blue_stone');
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
  get roofTiles() {
    // The scan is a vivid new-tile orange; knock it toward the weathered brown-red of the reference.
    return this.pbr('clay_roof_tiles_02', { normalScale: 1.0, roughness: 0.9, color: new THREE.Color(0.8, 0.74, 0.7) }, 'roof_tiles');
  }
  get roofTilesOld() {
    return this.pbr('roof_07', { normalScale: 1.0 }, 'roof_tiles_old');
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
    return this.plain('iron', { color: 0x1b1b1e, roughness: 0.5, metalness: 0.85 });
  }
  get zinc() {
    return this.plain('zinc', { color: 0x777770, roughness: 0.45, metalness: 0.9 });
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
    return this.plain(
      'water',
      { color: 0x123a48, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.86, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03, reflectivity: 1, vertexColors: false, depthWrite: true, noShadow: true },
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
  get burlap() {
    const map = this.canvasTexture('burlap', makeBurlapCanvas, { repeat: [1, 1] });
    return this.plain('burlap', { map, color: 0xffffff, roughness: 1 });
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
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.lineTo(rng.range(60, S - 60), rng.range(60, S - 60));
    ctx.stroke();
  }
  for (let i = 0; i < 150; i++) {
    const r = rng.range(0, S * 0.42);
    const a = rng.range(0, Math.PI * 2);
    const x = S / 2 + Math.cos(a) * r;
    const y = S / 2 + Math.sin(a) * r;
    drawLeaf(x, y, rng.range(48, 86), rng.range(22, 40), rng.range(0, Math.PI * 2), rng.pick(shades));
  }
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

/** Awning stripes (weathered burgundy / cream). */
export function makeStripeCanvas() {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#e9dcc4' : '#8d2f2a';
    ctx.fillRect((i * S) / stripes, 0, S / stripes + 1, S);
  }
  const rng = makeRng(9);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(60,40,30,${rng.range(0.02, 0.1)})`;
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
 * Louvred shutter: one repeat = 0.4 m = 5 slats. Each slat is lit on top and shadowed underneath;
 * the base is a light grey so the vertex-color tint sets the paint colour.
 */
export function makeLouvreCanvas() {
  const S = 128;
  const c = makeCanvas(S, S);
  const ctx = c.getContext('2d');
  const rng = makeRng(21);
  const slats = 5;
  const sh = S / slats;
  for (let i = 0; i < slats; i++) {
    const y0 = i * sh;
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + sh);
    grad.addColorStop(0, '#f2f2f0');
    grad.addColorStop(0.35, '#d8d8d4');
    grad.addColorStop(0.8, '#9a9a96');
    grad.addColorStop(0.92, '#5a5a58');
    grad.addColorStop(1, '#3a3a38');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, S, sh + 1);
  }
  // Faint wood grain / paint wear speckle.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(40,30,20,${rng.range(0.03, 0.1)})`;
    ctx.fillRect(rng.range(0, S), rng.range(0, S), rng.range(1, 3), rng.range(1, 6));
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
