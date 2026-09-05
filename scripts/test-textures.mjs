// Node tests for the HD tile pipeline (no browser):  node scripts/test-textures.mjs
// Runs every painter at 16px and the refiner at 64px against a minimal ImageData polyfill and checks the rules
// the refiner promises: every tile refines, 4x4 blocks average back to their base texel, determinism, normal map
// conventions, mip chain collapse, full material classification, dynamic (sign) tiles refined like the rest.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

globalThis.ImageData = class ImageData {
  constructor(a, b, c) {
    if (typeof a === 'number') { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); }
    else { this.data = a; this.width = b; this.height = c; }
  }
};

const T = await import('../src/textures.js');
const H = await import('../src/render/hdTiles.js');
const Mt = await import('../src/render/materials.js');
const MM = await import('../src/render/materialMaps.js');
const { BASE_PX, TILE_PX, HD_SCALE, ATLAS_TILES } = await import('../src/constants.js');

const B = BASE_PX, S = TILE_PX, K = HD_SCALE, N = S * S;
const NAMES = [...T.TILE_NAMES, ...Array.from({ length: 10 }, (_, i) => 'destroy_' + i)];

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

test('constants: 16px painters, 64px tiles, 1024px atlases', () => {
  assert.equal(B, 16); assert.equal(K, 4); assert.equal(S, 64); assert.equal(ATLAS_TILES * S, 1024);
});

const bases = new Map();
const refined = new Map();
test(`every tile refines (${NAMES.length} painters incl. destroy stages): 64x64 colour, 4096 heights, RGBA material`, () => {
  for (const name of NAMES) {
    const base = T.paintBaseTile(name);
    assert.equal(base.width, B); assert.equal(base.data.length, B * B * 4, name);
    const r = H.refineTile(base, name);
    assert.equal(r.color.width, S, name); assert.equal(r.color.height, S, name);
    assert.equal(r.color.data.length, N * 4, name);
    assert.equal(r.height.length, N, name);
    assert.equal(r.material.length, N * 4, name);
    for (let i = 0; i < N; i++) assert.ok(Number.isFinite(r.height[i]), `${name}: height[${i}] is ${r.height[i]}`);
    for (let i = 0; i < N; i++) assert.equal(r.material[i * 4 + 3], 255, `${name}: material alpha`);
    bases.set(name, base); refined.set(name, r);
  }
});

test('alpha is inherited from the base texel (no new holes, no filled holes)', () => {
  for (const name of NAMES) {
    const d = bases.get(name).data, o = refined.get(name).color.data;
    for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
      const a = d[(by * B + bx) * 4 + 3];
      let same = 0;
      for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) if (o[((by * K + fy) * S + bx * K + fx) * 4 + 3] === a) same++;
      // silhouette rounding may cut the 4 corner texels of an opaque block next to holes; transparent blocks stay exact
      assert.ok(a >= 128 ? same >= 12 : same === 16, `${name} block (${bx},${by}) alpha ${a}: ${same}/16 texels keep it`);
    }
  }
});

test('layout preservation: every opaque 4x4 block averages back to its base texel (mean <= 0.5, max <= 3 / 255)', () => {
  let worst = ['', 0];
  for (const name of NAMES) {
    const e = H.blockMeanError(bases.get(name), refined.get(name).color);
    if (e.max > worst[1]) worst = [name, e.max];
    assert.ok(e.mean <= 0.5, `${name}: mean block error ${e.mean.toFixed(3)}`);
    assert.ok(e.max <= 3, `${name}: max block error ${e.max.toFixed(3)}`);
  }
  console.log(`   worst block error: ${worst[0]} ${worst[1].toFixed(3)}`);
});

test('refinement adds detail (HD tile is not a plain nearest-neighbour upsample)', () => {
  for (const name of NAMES) {
    if (Mt.classify(name).cls === 'plain') continue;
    const d = bases.get(name).data, o = refined.get(name).color.data;
    let diff = 0, opaque = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const bi = ((y >> 2) * B + (x >> 2)) * 4, i = (y * S + x) * 4;
      if (d[bi + 3] < 128) continue;
      opaque++;
      diff += Math.abs(o[i] - d[bi]) + Math.abs(o[i + 1] - d[bi + 1]) + Math.abs(o[i + 2] - d[bi + 2]);
    }
    if (opaque) assert.ok(diff / (opaque * 3) > 0.5, `${name}: mean texel deviation from base only ${(diff / (opaque * 3)).toFixed(2)}`);
  }
});

test('determinism: refining twice (fresh RNG from the tile name) gives byte-identical colour, height and material', () => {
  for (const name of NAMES) {
    const a = refined.get(name), b = H.refineTile(bases.get(name), name);
    assert.deepEqual(Array.from(b.color.data), Array.from(a.color.data), `${name}: colour differs`);
    assert.deepEqual(Array.from(b.height), Array.from(a.height), `${name}: height differs`);
    assert.deepEqual(Array.from(b.material), Array.from(a.material), `${name}: material differs`);
  }
  // a different name with the same pixels gives a different seed -> different detail
  const s1 = H.refineTile(bases.get('stone'), 'stone'), s2 = H.refineTile(bases.get('stone'), 'stone_x');
  assert.notDeepEqual(Array.from(s1.color.data), Array.from(s2.color.data));
});

test('normal map: flat height -> (128,128,255); OpenGL convention (R = +u right, G = toward the tile top)', () => {
  const flat = H.normalFromHeight(new Float32Array(N), 1);
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < N; i++) { r += flat[i * 4]; g += flat[i * 4 + 1]; b += flat[i * 4 + 2]; assert.equal(flat[i * 4 + 3], 255); }
  assert.equal(r / N, 128); assert.equal(g / N, 128); assert.ok(b / N >= 254.5, `blue mean ${b / N}`);
  // slope rising toward +x: the normal leans to -x (R < 128); rising toward the bottom row: normal leans to the
  // top of the canvas (G > 128). Interior texels only (the height wraps at the tile border).
  const rampX = new Float32Array(N), rampY = new Float32Array(N);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { rampX[y * S + x] = x * 0.2; rampY[y * S + x] = y * 0.2; }
  const nx = H.normalFromHeight(rampX, 1), ny = H.normalFromHeight(rampY, 1);
  const i = (20 * S + 20) * 4;
  assert.ok(nx[i] < 110 && Math.abs(nx[i + 1] - 128) <= 1, `x ramp normal ${nx[i]},${nx[i + 1]},${nx[i + 2]}`);
  assert.ok(ny[i + 1] > 146 && Math.abs(ny[i] - 128) <= 1, `y ramp normal ${ny[i]},${ny[i + 1]},${ny[i + 2]}`);
  // every refined tile's normal is unit length and mostly "out"
  for (const name of NAMES) {
    const M = Mt.classify(name), n = H.normalFromHeight(refined.get(name).height, M.relief);
    let bsum = 0;
    for (let k = 0; k < N; k++) {
      const vx = n[k * 4] / 127.5 - 1, vy = n[k * 4 + 1] / 127.5 - 1, vz = n[k * 4 + 2] / 127.5 - 1;
      const len = Math.hypot(vx, vy, vz);
      assert.ok(Math.abs(len - 1) < 0.03, `${name}: normal length ${len.toFixed(3)}`);
      bsum += n[k * 4 + 2];
    }
    assert.ok(bsum / N > 200, `${name}: mean blue ${(bsum / N).toFixed(1)} (normals too steep)`);
  }
});

test('mip chain: 7 levels per tile, the 16px level collapses to the base tile (opaque blocks within 4 / 255)', () => {
  for (const name of NAMES) {
    const base = bases.get(name), maps = H.buildTileMaps(base, name);
    assert.equal(maps.mips.color.length, 7, name); assert.equal(maps.mips.normal.length, 7, name); assert.equal(maps.mips.material.length, 7, name);
    assert.equal(maps.mips.color[6].size, 1, name);
    const l16 = maps.mips.color[2];
    assert.equal(l16.size, B, name);
    const d = base.data;
    for (let bi = 0; bi < B * B; bi++) {
      if (d[bi * 4 + 3] < 128) { assert.ok(l16.data[bi * 4 + 3] < 128, `${name}: mip 16 texel ${bi} became opaque`); continue; }
      // blocks whose HD texels all kept the base alpha (no silhouette cut) must match the base colour
      let cut = false;
      const o = maps.color, bx = bi % B, by = (bi - bx) / B;
      for (let fy = 0; fy < K && !cut; fy++) for (let fx = 0; fx < K; fx++) if (o[((by * K + fy) * S + bx * K + fx) * 4 + 3] !== d[bi * 4 + 3]) { cut = true; break; }
      if (cut) continue;
      for (let c = 0; c < 3; c++) assert.ok(Math.abs(l16.data[bi * 4 + c] - d[bi * 4 + c]) <= 4, `${name}: mip 16 texel ${bi} channel ${c}: ${l16.data[bi * 4 + c]} vs base ${d[bi * 4 + c]}`);
    }
    // normal mips stay unit length and flat-ish at the top
    const top = maps.mips.normal[6].data;
    assert.ok(top[2] > 200, `${name}: top normal mip blue ${top[2]}`);
  }
});

test('material classification covers every tile explicitly; classes and parameters are valid', () => {
  const fallback = [], keyword = [];
  for (const name of NAMES) {
    const m = Mt.classify(name);
    assert.ok(Mt.MATERIAL_CLASSES.includes(m.cls), `${name}: unknown class ${m.cls}`);
    assert.ok(Mt.MATERIAL_CLASSES.includes(m.detail), `${name}: unknown detail class ${m.detail}`);
    for (const k of ['roughness', 'metalness', 'emissive', 'relief']) assert.ok(m[k] >= 0 && m[k] <= 1, `${name}: ${k} = ${m[k]}`);
    if (m.fallback) fallback.push(name);
    else if (!m.explicit) keyword.push(name);
  }
  assert.deepEqual(fallback, [], 'tiles left on the fallback class');
  assert.deepEqual(keyword.filter((n) => !n.startsWith('destroy_')), [], 'painted tiles classified only by keyword');
  // dynamic names go through the keyword rules, never the fallback
  for (const [n, cls] of [['sign:HOTEL:2', 'wood'], ['destroy_3', 'plain'], ['neon_sign', 'glow'], ['granite', 'stone'], ['copper_ore', 'ore']]) {
    const m = Mt.classify(n); assert.equal(m.cls, cls, n); assert.equal(m.fallback, false, n);
  }
  assert.equal(Mt.classify('completely_unknown_thing').fallback, true);
  // every explicit table entry is a painted tile (no stale names)
  for (const n of Mt.EXPLICIT_TILE_NAMES) assert.ok(T.TILE_NAMES.includes(n), `material table entry ${n} is not a painted tile`);
});

test('material semantics: emissive, metal and glass tiles carry the right parameters and material-atlas channels', () => {
  const emissive = ['torch', 'lantern', 'glow_panel', 'glow_panel_blue', 'city_lamp', 'holo_sign', 'window_lit', 'magma', 'furnace_front', 'console_top'];
  for (const n of emissive) {
    assert.ok(Mt.classify(n).emissive > 0, `${n} should be emissive`);
    const mat = refined.get(n).material;
    let mx = 0; for (let i = 0; i < N; i++) mx = Math.max(mx, mat[i * 4 + 2]);
    assert.ok(mx >= 200, `${n}: brightest emissive texel ${mx}`);
  }
  for (const n of ['stone', 'oak_planks', 'dirt', 'bricks', 'wool_red', 'glass']) {
    const mat = refined.get(n).material;
    for (let i = 0; i < N; i++) assert.equal(mat[i * 4 + 2], 0, `${n}: texel ${i} emissive`);
  }
  for (const n of ['durasteel', 'durasteel_dark', 'chrome', 'hull_plate', 'iron_block', 'deck_plate', 'rail', 'anvil', 'gold_block']) {
    assert.ok(Mt.classify(n).metalness >= 0.5, `${n} should be metallic`);
  }
  assert.equal(Mt.classify('chrome').roughness <= 0.15, true);
  for (const n of ['glass', 'steel_glass', 'window_dark']) {
    const m = Mt.classify(n); assert.ok(m.roughness <= 0.15 && m.metalness === 0, `${n}: rough ${m.roughness} metal ${m.metalness}`);
  }
  for (const n of ['stone', 'dirt', 'oak_planks', 'wool_white', 'bricks', 'sand']) assert.equal(Mt.classify(n).metalness, 0, n);
  // material atlas channels: R roughness, G metalness
  const dura = refined.get('durasteel').material, stone = refined.get('stone').material;
  assert.ok(dura[1] > 200 && stone[1] === 0, `metalness channel: durasteel ${dura[1]}, stone ${stone[1]}`);
  assert.ok(stone[0] > dura[0], `roughness channel: stone ${stone[0]} > durasteel ${dura[0]}`);
});

test('atlas build in node: three 1024px atlases with 7 mip levels, material-map hook called, sign tiles refined as wood', () => {
  const t0 = performance.now();
  const tex = T.buildAtlas();
  const ms = performance.now() - t0;
  assert.equal(T.atlasTexture, tex);
  for (const a of [T.atlasTexture, T.atlasNormalTexture, T.atlasMaterialTexture]) {
    assert.equal(a.image.width, ATLAS_TILES * S); assert.equal(a.image.height, ATLAS_TILES * S);
    assert.equal(a.mipmaps.length, 7); assert.equal(a.generateMipmaps, false); assert.equal(a.flipY, false);
  }
  const maps = MM.getMaterialMaps();
  assert.equal(maps.normal, T.atlasNormalTexture); assert.equal(maps.material, T.atlasMaterialTexture);
  assert.equal(T.tileCount(), NAMES.length);
  assert.equal(T.atlasBuildStats.tiles, NAMES.length);
  // tile 4 (stone) sits at atlas column 4: the atlas level 0 holds its refined colour, level 2 its base colour
  const idx = T.TILES.stone, uv = T.tileUV(idx);
  assert.deepEqual(uv, [(idx % ATLAS_TILES) / ATLAS_TILES, Math.floor(idx / ATLAS_TILES) / ATLAS_TILES, 1 / ATLAS_TILES]);
  const lvl0 = T.atlasTexture.mipmaps[0].data, hd = T.tilePixels(idx);
  const ox = (idx % ATLAS_TILES) * S, oy = Math.floor(idx / ATLAS_TILES) * S;
  for (let y = 0; y < S; y += 7) for (let x = 0; x < S; x += 5) for (let c = 0; c < 4; c++) assert.equal(lvl0[((oy + y) * 1024 + ox + x) * 4 + c], hd[(y * S + x) * 4 + c]);
  const lvl2 = T.atlasTexture.mipmaps[2], base = T.tileBasePixels(idx);
  assert.equal(lvl2.width, 256);
  for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) for (let c = 0; c < 3; c++) {
    const a = lvl2.data[((Math.floor(idx / ATLAS_TILES) * B + y) * 256 + (idx % ATLAS_TILES) * B + x) * 4 + c], b = base[(y * B + x) * 4 + c];
    assert.ok(Math.abs(a - b) <= 4, `stone atlas mip 2 (${x},${y}) channel ${c}: ${a} vs ${b}`);
  }
  // dynamic tiles: sign tiles are refined through the same pipeline (wood class)
  const signs = T.addSignTiles('HOTEL', 2);
  assert.equal(signs.length, 2);
  T.finalizeAtlas();
  const sm = T.tileMaps(signs[0]);
  assert.equal(sm.cls, 'wood'); assert.equal(T.tileName(signs[0]), 'sign:HOTEL:2');
  assert.equal(T.atlasBuildStats.builds, 2); assert.equal(T.atlasBuildStats.tiles, NAMES.length + 2);
  const sb = { width: B, height: B, data: T.tileBasePixels(signs[0]) };
  const e = H.blockMeanError(sb, sm.color);
  assert.ok(e.max <= 3, `sign tile block error ${e.max}`);
  console.log(`   buildAtlas() in node: ${ms.toFixed(1)} ms for ${NAMES.length} tiles (cold JIT, no canvas upload)`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
