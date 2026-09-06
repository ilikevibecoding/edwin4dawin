// Far-LOD tests (rubric 13, view distance to 32 chunks):  node scripts/test-farlod.mjs [--url http://localhost:5173/]
// Offline (no browser): the tile builder on six sample tiles (frontier, coast, ocean, plateau edge, town, mountains),
// the colour table vs every surface block the builder can pick, the atlas-averaged colours, the memory estimate at
// rd 32, the near-ring skip / hysteresis logic, determinism and the incremental builder, the town far boxes and the
// Coruscant street-lattice impostors. With --url: the streaming test - the player flies 600 blocks at 20 blocks/s
// at rd 32 while the sky is hidden and the clear colour is magenta; every 100 blocks a frame is read back and any
// magenta pixel whose view ray meets the sea plane inside the covered radius counts as a hole.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { mkdirSync } from 'node:fs';

globalThis.ImageData = globalThis.ImageData || class ImageData {
  constructor(a, b, c) {
    if (typeof a === 'number') { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); }
    else { this.data = a; this.width = b; this.height = c; }
  }
};

const { initBlocks, B, BLOCKS } = await import('../src/blocks.js');
const { buildAtlas } = await import('../src/textures.js');
const { WorldGen, REGIONS } = await import('../src/worldgen.js');
const { SEA_LEVEL, TOWN_GROUND, CHUNK_SIZE } = await import('../src/constants.js');
const T = await import('../src/render/farlod/tiles.js');
const TW = await import('../src/render/farlod/town.js');
const { buildTown } = await import('../src/town/town.js');
const { getLayout, PLATEAU, LEVELS } = await import('../src/coruscant/layout.js');
const { latticeBoxes, buildSkyline } = await import('../src/coruscant/skyline.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}
async function testAsync(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

// same order as the browser: the atlas assigns the tile indices the block registry records
const atlasT0 = performance.now();
buildAtlas();
const atlasMs = performance.now() - atlasT0;
initBlocks();
T.setColorSource('table');   // tile tests below use the table; the colour test switches to the atlas
const gen = new WorldGen(1337);
const { TILE, CELL, N, GRID, VERTS_PER_TILE, INDICES_PER_TILE, TILE_BYTES, SKIRT_Y, SURFACE_DROP } = T;

// ------------------------------------------------------------------------------------------ geometry checks
function checkTile(name, tile, { minLandFrac = 0, minWaterFrac = 0, maxVoidFrac = 0 } = {}) {
  const { pos, col, nrm, idx, stats } = tile;
  assert.equal(pos.length, VERTS_PER_TILE * 3); assert.equal(col.length, VERTS_PER_TILE * 4); assert.equal(idx.length, INDICES_PER_TILE);
  for (let i = 0; i < pos.length; i++) assert.ok(Number.isFinite(pos[i]), `${name}: non-finite position at ${i}`);
  for (let i = 0; i < idx.length; i++) assert.ok(idx[i] < VERTS_PER_TILE, `${name}: index out of range`);
  // grid vertices sit on the 4-block lattice, between the skirt bottom and the world top; water rows at the sea surface
  let water = 0, land = 0;
  for (let v = 0; v < GRID * GRID; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    assert.equal((x - tile.x0) % CELL, 0); assert.equal((z - tile.z0) % CELL, 0);
    assert.ok(y >= SKIRT_Y - 1e-3 && y <= 256, `${name}: grid y ${y}`);
    const a = col[v * 4 + 3];
    if (a === 0) { water++; assert.ok(Math.abs(y - (SEA_LEVEL + 1 - SURFACE_DROP)) < 1e-3, `${name}: water vertex not at the sea surface (${y})`); }
    else land++;
    const nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
    const len = Math.hypot(nx, ny, nz);
    assert.ok(len > 120 && len < 134, `${name}: normal length ${len}`);
    assert.ok(ny > 0, `${name}: grid normal points down`);
  }
  // skirt: copies of the edge vertices at SKIRT_Y with horizontal outward normals
  for (let v = GRID * GRID; v < VERTS_PER_TILE; v++) {
    assert.ok(Math.abs(pos[v * 3 + 1] - SKIRT_Y) < 1e-3, `${name}: skirt vertex not at SKIRT_Y`);
    assert.equal(nrm[v * 3 + 1], 0);
    assert.equal(Math.abs(nrm[v * 3]) + Math.abs(nrm[v * 3 + 2]), 127);
    const x = pos[v * 3], z = pos[v * 3 + 2];
    assert.ok(x === tile.x0 || x === tile.x0 + TILE || z === tile.z0 || z === tile.z0 + TILE, `${name}: skirt vertex off the edge`);
  }
  // triangles: real ones wind upward (grid) / outward (skirt); the rest are degenerate
  let real = 0, degenerate = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (a === b || b === c || a === c) { degenerate++; continue; }
    real++;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
    const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (t < N * N * 6) {
      if (ny <= 0) throw new Error(`${name}: grid triangle ${t / 3} winds downward`);
    } else {
      const outward = nx * (ax - (tile.x0 + TILE / 2)) + nz * (az - (tile.z0 + TILE / 2));
      if (outward <= 0) throw new Error(`${name}: skirt triangle ${t / 3} winds inward`);
    }
  }
  const cells = N * N, voidFrac = stats.voidCells / cells;
  assert.ok(voidFrac <= maxVoidFrac + 1e-9, `${name}: void fraction ${voidFrac.toFixed(3)} > ${maxVoidFrac}`);
  const gridVerts = GRID * GRID;
  assert.ok(water / gridVerts >= minWaterFrac, `${name}: water fraction ${(water / gridVerts).toFixed(3)} < ${minWaterFrac}`);
  assert.ok(land / gridVerts >= minLandFrac, `${name}: land fraction ${(land / gridVerts).toFixed(3)} < ${minLandFrac}`);
  for (let i = 0; i < col.length; i++) assert.ok(col[i] >= 0 && col[i] <= 255);
  return { real, degenerate, water: water / gridVerts, land: land / gridVerts, voidFrac, minY: stats.minY, maxY: stats.maxY, ms: stats.ms };
}

function build(tx, tz) {
  const t = T.buildTile(gen, tx, tz);
  return { ...t, x0: tx * TILE, z0: tz * TILE };
}
// classify a tile by sampling its surface every 16 blocks (cheap, independent of the builder)
function classify(tx, tz) {
  let water = 0, land = 0, voids = 0, maxH = -1, plateau = 0;
  for (let x = tx * TILE; x < (tx + 1) * TILE; x += 16) for (let z = tz * TILE; z < (tz + 1) * TILE; z += 16) {
    const info = gen.heightInfo(x, z);
    const sb = T.surfaceBlockFor(gen, info, x, z);
    if (sb < 0) voids++; else if (sb === B.WATER) water++; else { land++; if (info.h > maxH) maxH = info.h; if (sb === B.SMOOTH_STONE) plateau++; }
  }
  const n = water + land + voids;
  return { water: water / n, land: land / n, voids: voids / n, maxH, plateau: plateau / n };
}

test('tile constants: 256-block tiles of 64 x 64 four-block cells, one indexed mesh each', () => {
  assert.equal(TILE, 256); assert.equal(CELL, 4); assert.equal(N, 64); assert.equal(GRID, 65);
  assert.equal(VERTS_PER_TILE, 65 * 65 + 4 * 65);
  assert.equal(INDICES_PER_TILE, 64 * 64 * 6 + 4 * 64 * 6);
  assert.equal(TILE_BYTES, VERTS_PER_TILE * 19 + INDICES_PER_TILE * 4);
  assert.ok(SKIRT_Y < SEA_LEVEL - 8, 'skirt reaches under the ocean floor');
});

// Pick the six samples from the real world: the town tile is fixed; the others are searched near the town so the
// test keeps working if the continent's noise moves a little.
const samples = {};
test('sample tiles found: frontier, coast, ocean, plateau edge, town, mountains', () => {
  samples.town = { tx: T.tileOf(-8), tz: T.tileOf(2) };            // spawn / town centre tile
  const plateauTx = T.tileOf(REGIONS.coruscant.cx - REGIONS.coruscant.half), plateauTz = T.tileOf(REGIONS.coruscant.cz);
  samples.plateauEdge = { tx: plateauTx, tz: plateauTz };            // west rim of the plateau: plating meets the ocean
  const c = classify(plateauTx, plateauTz);
  assert.ok(c.plateau > 0.05 && c.plateau < 0.95, `plateau edge tile should mix plating and terrain (plating ${c.plateau.toFixed(2)})`);
  for (let r = 1; r <= 12 && !(samples.frontier && samples.coast && samples.ocean && samples.mountains); r++) {
    for (let tx = -r; tx <= r; tx++) for (let tz = -r; tz <= r; tz++) {
      if (Math.max(Math.abs(tx), Math.abs(tz)) !== r) continue;
      if (tx >= plateauTx - 1) continue;                               // stay clear of Coruscant
      const k = classify(tx, tz);
      if (k.voids > 0) continue;
      if (!samples.ocean && k.water >= 0.99) samples.ocean = { tx, tz };
      else if (!samples.coast && k.water >= 0.2 && k.water <= 0.8) samples.coast = { tx, tz };
      else if (!samples.mountains && k.land >= 0.9 && k.maxH >= 97) samples.mountains = { tx, tz };
      else if (!samples.frontier && k.land >= 0.97 && k.maxH < 90) samples.frontier = { tx, tz };
    }
  }
  for (const k of ['frontier', 'coast', 'ocean', 'plateauEdge', 'town', 'mountains']) assert.ok(samples[k], `no ${k} sample tile found`);
  console.log('   samples', JSON.stringify(samples));
});

const built = {};
test('tile builder: valid geometry for the six sample tiles (skirts, water at sea level, upward winding)', () => {
  const rules = {
    frontier: { minLandFrac: 0.9 }, coast: { minLandFrac: 0.1, minWaterFrac: 0.1 }, ocean: { minWaterFrac: 0.95 },
    plateauEdge: { minLandFrac: 0.05 }, town: { minLandFrac: 0.7 }, mountains: { minLandFrac: 0.8 },
  };
  for (const [k, s] of Object.entries(samples)) {
    const t = build(s.tx, s.tz);
    built[k] = t;
    const r = checkTile(k, t, rules[k]);
    console.log(`   ${k.padEnd(12)} tile (${s.tx}, ${s.tz}) tris ${r.real} water ${(r.water * 100).toFixed(0)}% y ${r.minY.toFixed(1)}..${r.maxY.toFixed(1)} ${r.ms.toFixed(1)} ms`);
    if (k === 'mountains') assert.ok(r.maxY >= 97, 'mountain tile reaches the snow line');
    if (k === 'ocean') assert.ok(r.real >= N * N * 2, 'ocean tile is a full water sheet');
  }
});

test('space region: void cells are omitted (no floor drawn), skirts stop at the void', () => {
  const sp = REGIONS.space;
  const tx = T.tileOf(sp.cx), tz = T.tileOf(sp.cz);
  const t = build(tx, tz);
  assert.equal(t.stats.voidCells, N * N, 'a tile deep in space has only void cells');
  let real = 0;
  for (let i = 0; i < t.idx.length; i += 3) if (!(t.idx[i] === t.idx[i + 1] || t.idx[i + 1] === t.idx[i + 2])) real++;
  assert.equal(real, 0, 'nothing is drawn for a void tile');
  // the tile straddling the void edge draws its terrain half only
  const edge = build(tx, T.tileOf(sp.cz + sp.half));
  assert.ok(edge.stats.voidCells > 0 && edge.stats.voidCells < N * N, `edge tile mixes void and terrain (${edge.stats.voidCells})`);
});

test('colour table covers every surface block the builder can pick (table + atlas sources)', () => {
  for (const id of T.SURFACE_BLOCKS) assert.ok(T.COLOR_TABLE[id], `no table colour for ${BLOCKS[id]?.name || id}`);
  const seen = new Set();
  for (let x = -2600; x <= 3600; x += 23) for (let z = -1500; z <= 1500; z += 29) {
    const info = gen.heightInfo(x, z);
    const sb = T.surfaceBlockFor(gen, info, x, z);
    if (sb >= 0) seen.add(sb);
  }
  for (const id of seen) assert.ok(T.SURFACE_BLOCKS.includes(id) && T.COLOR_TABLE[id], `surface block ${BLOCKS[id]?.name || id} missing from the table`);
  assert.ok(seen.has(B.GRASS) && seen.has(B.WATER) && seen.has(B.SAND) && seen.has(B.SMOOTH_STONE), 'sampled grass, water, sand and plateau plating');
  console.log('   surface blocks seen:', [...seen].map((id) => BLOCKS[id].name).join(', '));
  // table colours
  T.setColorSource('table');
  assert.deepEqual(T.blockColor(B.GRASS), T.COLOR_TABLE[B.GRASS]);
  // the atlas: colours become the average of each block's top tile
  console.log(`   atlas built in ${atlasMs.toFixed(0)} ms`);
  T.setColorSource('atlas');
  const grass = T.blockColor(B.GRASS), sand = T.blockColor(B.SAND), snow = T.blockColor(B.SNOW), stone = T.blockColor(B.STONE);
  assert.ok(grass[1] > grass[0] && grass[1] > grass[2], `atlas grass is green (${grass.map(Math.round)})`);
  assert.ok(sand[0] > 150 && sand[1] > 140 && sand[2] < sand[0], `atlas sand is light warm (${sand.map(Math.round)})`);
  assert.ok(snow[0] > 200 && snow[1] > 200 && snow[2] > 200, `atlas snow is near white (${snow.map(Math.round)})`);
  assert.ok(Math.abs(stone[0] - stone[1]) < 20 && Math.abs(stone[1] - stone[2]) < 20, `atlas stone is grey (${stone.map(Math.round)})`);
  for (const id of T.SURFACE_BLOCKS) { const c = T.blockColor(id); assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 255)); }
});

test('forest tint darkens under dense trees only', () => {
  assert.equal(T.forestTint({ moisture: 0 }), 1);
  assert.equal(T.forestTint({ moisture: 0.08 }), 1);
  assert.ok(T.forestTint({ moisture: 0.19 }) < 0.9 && T.forestTint({ moisture: 0.19 }) > 0.7);
  assert.ok(Math.abs(T.forestTint({ moisture: 0.5 }) - 0.68) < 1e-9);
});

test('memory: all far tiles at rd 32 (CPU + GPU copies) stay under 40 MB, Coruscant haze included', () => {
  const frontier = T.farMemoryEstimate(32, 32 * CHUNK_SIZE * 0.98);
  const coruscant = T.farMemoryEstimate(32, 32 * CHUNK_SIZE * 0.98 * 1.7);
  console.log(`   rd 32: ${frontier.tiles} tiles = ${(frontier.bytes / 1048576).toFixed(1)} MB; Coruscant haze: ${coruscant.tiles} tiles = ${(coruscant.bytes / 1048576).toFixed(1)} MB; per tile ${(frontier.perTile / 1024).toFixed(0)} KB`);
  assert.ok(frontier.bytes <= 40 * 1048576);
  assert.ok(coruscant.bytes <= 40 * 1048576);
  assert.ok(T.farMemoryEstimate(12).tiles < frontier.tiles);
});

test('near-ring skip: tiles fully inside the meshed ring are skipped, anything reaching outside it is kept', () => {
  const farR = T.farRadiusFor(32, 32 * 16 * 0.98);
  assert.ok(farR >= 32 * 16 + 48);
  // no near ring: the player's own tile is needed
  const all = T.tilesNeeded(128, 128, farR, 0);
  assert.ok(all.some((t) => t.tx === 0 && t.tz === 0));
  assert.ok(all.every((t, i) => i === 0 || t.dNear >= all[i - 1].dNear), 'nearest first');
  // a ring of 400 blocks fully meshed around the tile centre: the player's tile (far corner 181 blocks) is skipped
  const skipped = T.tilesNeeded(128, 128, farR, 400);
  assert.ok(!skipped.some((t) => t.tx === 0 && t.tz === 0), 'tile under the player skipped inside a 400-block ring');
  assert.ok(skipped.length < all.length);
  // the invariant that matters for the seam: every skipped tile lies entirely inside (nearCull - 48)
  for (let trial = 0; trial < 200; trial++) {
    const px = (Math.sin(trial * 12.9898) * 43758.5453) % 2000, pz = (Math.cos(trial * 78.233) * 12345.678) % 2000;
    const nearCull = 100 + (trial * 37) % 400;
    const kept = new Set(T.tilesNeeded(px, pz, farR, nearCull).map((t) => t.key));
    for (const t of T.tilesNeeded(px, pz, farR, 0)) {
      if (kept.has(t.key)) continue;
      assert.ok(t.dFar < nearCull - 48, `skipped tile (${t.tx},${t.tz}) reaches ${t.dFar.toFixed(0)} blocks with a ${nearCull} ring`);
    }
  }
  // hysteresis: a tile that was just needed is not stale, only ones 64 blocks past either boundary are
  // (the centre tile's far corner is 181 blocks away: skipped once nearCull > 229, stale once nearCull > 293)
  const t = { tx: 0, tz: 0 };
  assert.ok(!T.tilesNeeded(128, 128, farR, 260).some((n) => n.tx === 0 && n.tz === 0), 'skipped at 260');
  assert.equal(T.tileStale(t, 128, 128, farR, 260), false, 'skipped but not yet stale (kept until 64 blocks deeper)');
  assert.equal(T.tileStale(t, 128, 128, farR, 320), true, 'deep inside the ring: stale');
  assert.equal(T.tileStale(t, farR + 200, 128, farR, 0), false, 'just beyond farR: kept');
  assert.equal(T.tileStale(t, farR + 400, 128, farR, 0), true, 'far beyond farR: stale');
});

test('determinism and the incremental builder: many small steps give the same tile as one pass', () => {
  const s = samples.coast;
  const a = T.buildTile(gen, s.tx, s.tz), b = T.buildTile(gen, s.tx, s.tz);
  assert.deepEqual(a.pos, b.pos); assert.deepEqual(a.col, b.col); assert.deepEqual(a.idx, b.idx);
  const target = T.allocTileTarget();
  const inc = new T.TileBuilder(gen, s.tx, s.tz, target);
  let steps = 0;
  while (!inc.step(0.05)) steps++;
  assert.ok(steps >= 3, `budgeted steps split the work (${steps} steps)`);
  assert.deepEqual(target.pos, a.pos); assert.deepEqual(target.col, a.col); assert.deepEqual(target.idx, a.idx);
  // builders do not bloat the generator's column cache (the near ring's cache stays for the chunks)
  const before = gen.heightCache.size;
  T.buildTile(gen, s.tx + 3, s.tz + 3);
  assert.ok(gen.heightCache.size <= before + 4, `height cache grew by ${gen.heightCache.size - before}`);
});

test('town far boxes: one coloured box per building footprint, merged into one geometry', () => {
  const store = buildTown();
  const boxes = TW.townBoxes(store);
  assert.ok(boxes.length >= 10, `town has ${boxes.length} boxes`);
  assert.ok(boxes.length <= store.buildings.length);
  for (const b of boxes) {
    assert.ok(b.x1 > b.x0 + 1 && b.z1 > b.z0 + 1 && b.y1 > b.y0 + 2, `${b.name}: degenerate box`);
    assert.ok(b.x0 >= store.x0 && b.x1 <= store.x0 + store.w && b.z0 >= store.z0 && b.z1 <= store.z0 + store.d, `${b.name}: outside the town`);
    assert.ok(b.y0 >= TOWN_GROUND - 2 && b.y1 <= TOWN_GROUND + 40, `${b.name}: height ${b.y0}..${b.y1}`);
    for (const c of [...b.wall, ...b.roof]) assert.ok(c >= 0 && c <= 255);
  }
  const g = TW.boxGeometry(boxes);
  assert.equal(g.pos.length, boxes.length * TW.VERTS_PER_BOX * 3);
  assert.equal(g.idx.length, boxes.length * TW.INDICES_PER_BOX);
  for (let i = 0; i < g.idx.length; i++) assert.ok(g.idx[i] < boxes.length * TW.VERTS_PER_BOX);
  // faces wind outward: each triangle's normal agrees with its vertices' stored normal
  for (let t = 0; t < g.idx.length; t += 3) {
    const a = g.idx[t], b = g.idx[t + 1], c = g.idx[t + 2];
    const ux = g.pos[b * 3] - g.pos[a * 3], uy = g.pos[b * 3 + 1] - g.pos[a * 3 + 1], uz = g.pos[b * 3 + 2] - g.pos[a * 3 + 2];
    const vx = g.pos[c * 3] - g.pos[a * 3], vy = g.pos[c * 3 + 1] - g.pos[a * 3 + 1], vz = g.pos[c * 3 + 2] - g.pos[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    assert.ok(nx * g.nrm[a * 3] + ny * g.nrm[a * 3 + 1] + nz * g.nrm[a * 3 + 2] > 0, `box face ${t / 3} winds inward`);
  }
  const heights = boxes.map((b) => (b.y1 - b.y0).toFixed(0));
  console.log(`   ${boxes.length} boxes, heights ${Math.min(...heights)}..${Math.max(...heights)}, e.g. ${boxes.slice(0, 3).map((b) => b.name).join(', ')}`);
});

test('Coruscant street lattice: deck slabs (<= 64-block pieces) and skybridge tubes join the skyline impostors', () => {
  const layout = getLayout(1337);
  const boxes = latticeBoxes(layout);
  const decks = boxes.filter((b) => b.id < 2000), bridges = boxes.filter((b) => b.id >= 2000);
  const mids = layout.boulevards.filter((s) => s.level === 'mid');
  assert.ok(decks.length >= mids.length, 'at least one piece per mid-level deck segment');
  assert.equal(bridges.length, layout.bridges.length);
  for (const d of decks) {
    assert.ok(d.x1 - d.x0 <= 64 + 1e-6 && d.z1 - d.z0 <= 64 + 1e-6, 'deck piece <= 64 blocks');
    assert.ok(d.y0 > LEVELS.deck - 1 && d.y1 < LEVELS.deck + 1, 'slab inset inside the deck blocks (y 94..96)');
    assert.ok(d.x0 >= PLATEAU.x0 && d.x1 <= PLATEAU.x1 && d.z0 >= PLATEAU.z0 && d.z1 <= PLATEAU.z1, 'on the plateau');
    assert.ok(d.deck && d.tint);
  }
  for (const b of bridges) {
    const br = layout.bridges[b.id - 2000];
    assert.ok(b.y0 > br.y && b.y1 < br.y + 4, 'tube inset inside plate..roof');
    assert.ok(b.x0 > br.x0 && b.x1 < br.x1 && b.z0 > br.z0 && b.z1 < br.z1);
  }
  // the mesh builds with the lattice in a distinct seed class (>= 4) so the shader skips its window lattice
  const mesh = buildSkyline(layout);
  const seeds = mesh.geometry.attributes.aSeed.array;
  let deckVerts = 0; for (const s of seeds) if (s >= 4) deckVerts++;
  assert.equal(deckVerts, boxes.length * 24);
  assert.ok(mesh.geometry.index.count / 3 < 120000, 'skyline stays one modest draw call');
  console.log(`   ${decks.length} deck pieces from ${mids.length} segments, ${bridges.length} bridges, skyline ${mesh.geometry.index.count / 3} tris`);
});

// ------------------------------------------------------------------------------------------ streaming (browser)
const urlArg = process.argv.indexOf('--url');
if (urlArg > 0) {
  const base = process.argv[urlArg + 1];
  const outDir = '/tmp/w7-shots';
  mkdirSync(outDir, { recursive: true });
  const { launchPage } = await import('./cdp.mjs');
  await testAsync('streaming: 600 blocks at 20 blocks/s (rd 32, Light) never shows a hole between the near ring and the far layer', async () => {
    const page = await launchPage(base + '?x=-8&z=2&y=150&yaw=-90&pitch=-24&fly=1&time=0.45&quality=light&rd=32', { width: 1280, height: 720 });
    try {
      await page.waitForGame(180000);
      await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
      await page.sleep(3000);
      // magenta backdrop: hide the sky dome and pin the clear colour so any uncovered pixel is unmistakable
      await page.evaluate(`game.__w7 = { last: performance.now(), x0: game.player.pos.x, scc: game.renderer.setClearColor }; game.sky.dome.visible = false; game.renderer.setClearColor(0xff00ff); game.renderer.setClearColor = () => {}; "ok"`);
      // in-page flight driver (wall-clock 20 blocks/s eastward, independent of the frame rate)
      await page.evaluate(`game.__w7.timer = setInterval(() => { const now = performance.now(); const dt = (now - game.__w7.last) / 1000; game.__w7.last = now; game.player.pos.x += 20 * dt; }, 25); "ok"`);
      const analyse = `(() => {
        const g = game, cam = g.camera, V3 = cam.position.constructor;
        const rb = g.pipeline.readback(); const w = rb.width, h = rb.height, d = rb.data;
        const seaY = ${SEA_LEVEL} + 0.5, R = g.sky.fogFar * 0.8;
        let holes = 0, checked = 0, magenta = 0, seam = 0, seamChecked = 0; const step = 3, dir = new V3(), near = g.terrain.nearRadius * 16;
        for (let py = 0; py < h; py += step) for (let px = 0; px < w; px += step) {
          const i = (py * w + px) * 4; const mag = d[i] > 170 && d[i + 1] < 100 && d[i + 2] > 170;
          if (mag) magenta++;
          dir.set(px / w * 2 - 1, py / h * 2 - 1, 0.5).unproject(cam).sub(cam.position).normalize();
          if (dir.y >= -1e-4) continue;
          const t = (cam.position.y - seaY) / -dir.y, hd = Math.hypot(dir.x * t, dir.z * t);
          if (hd > R) continue;
          checked++; if (mag) holes++;
          if (hd > near * 0.6 && hd < near * 1.4) { seamChecked++; if (mag) seam++; }
        }
        return { holes, checked, magenta, seam, seamChecked, x: Math.round(g.player.pos.x), far: g.farLod.stats, chunks: g.terrain.stats.chunks, meshed: g.terrain.stats.meshed, nearCull: Math.round(g.terrain.nearCullRadius(g.player.pos.x, g.player.pos.z)) };
      })()`;
      const results = [];
      const x0 = await page.evaluate('game.__w7.x0');
      for (let mark = 100; mark <= 600; mark += 100) {
        const deadline = Date.now() + 40000;
        while (Date.now() < deadline) {
          const x = await page.evaluate('game.player.pos.x');
          if (x - x0 >= mark) break;
          await page.sleep(150);
        }
        const r = await page.evaluate(`JSON.stringify(${analyse})`);
        const o = JSON.parse(r);
        results.push(o);
        console.log(`   +${mark} blocks (x ${o.x}): holes ${o.holes}/${o.checked} rays, seam band ${o.seam}/${o.seamChecked}, magenta total ${o.magenta}, chunks ${o.chunks} meshed ${o.meshed}, nearCull ${o.nearCull}, far tiles ${o.far.tiles} queued ${o.far.queued} (${(o.far.bytes / 1048576).toFixed(1)} MB)`);
      }
      await page.evaluate('clearInterval(game.__w7.timer); "ok"');
      await page.screenshot(`${outDir}/stream_600_magenta.png`);
      await page.evaluate('game.sky.dome.visible = true; game.renderer.setClearColor = game.__w7.scc; "ok"');
      await page.sleep(1500);
      await page.screenshot(`${outDir}/stream_600.png`);
      assert.equal(page.exceptions.length, 0, 'no exceptions: ' + page.exceptions.slice(0, 3).join(' | '));
      const worst = Math.max(...results.map((r) => r.holes));
      const worstFrac = Math.max(...results.map((r) => r.holes / Math.max(1, r.checked)));
      assert.ok(results.every((r) => r.checked > 1000), 'the frame has ground where terrain should be');
      assert.ok(worstFrac <= 0.002, `holes: worst frame ${worst} magenta rays (${(worstFrac * 100).toFixed(2)}%) below the horizon inside the covered radius`);
      assert.ok(results.every((r) => r.seam === 0), 'no magenta in the seam band (0.6..1.4 x near radius)');
    } finally { page.close(); }
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
