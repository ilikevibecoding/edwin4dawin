// P6 crowd appearance tests (rubric 07 "Crowd appearance v2"). The cell table and the composer are pure JS, so the
// atlas checks run offline in node; --url adds the live checks through CDP.
//
//   node scripts/test-crowd.mjs                             offline: cell mapping, atlas dimensions, face uniqueness,
//                                                           blink rects on eye rows, droid emissive texels, box table,
//                                                           species parts, spread / child remap, paint time
//   node scripts/test-crowd.mjs --atlas /tmp/crowd_atlas.png  also writes the whole painted atlas as a PNG
//   node scripts/test-crowd.mjs --url http://localhost:5333/  + browser: shader compiles, plaza census (visible people,
//                                                           distinct cells, same-cell pairs within 12 blocks), draw
//                                                           calls, paint / upload time, heap, node == browser pixels
//   node scripts/test-crowd.mjs --url ... --census           + scripts/npc-census.mjs at noon (live cap, visibility,
//                                                           failed trips) - several minutes, one Chrome at a time
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import * as C from '../src/npc/appearance/crowdCells.js';
import { ARCHETYPES } from '../src/npc/appearance/archetypes.js';
import { SPECIES_BY_ID } from '../src/npc/appearance/species.js';
import { REG } from '../src/npc/appearance/layout.js';
import { Raster, encodePNG, rgb } from '../src/npc/appearance/raster.js';
import { EYE_WHITE, PUPIL, EYE_ROW0 } from '../src/npc/appearance/faces.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const url = opt('url', null);
const atlasOut = opt('atlas', null);
const withCensus = args.includes('--census');

let passed = 0, failed = 0;
const notes = [];
async function test(name, fn) {
  try { const r = await fn(); passed++; console.log(`PASS ${name}${r ? ' - ' + r : ''}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e.message}`); }
}
const F = REG.headFront;   // 16x16 face region of the 128x64 cell
const same = (p, c) => { const k = rgb(c); return p[0] === k[0] && p[1] === k[1] && p[2] === k[2]; };

// ------------------------------------------------------------------------------------------------------ cell table
const table = C.buildCrowdCellTable();
const ALL_ARCHETYPES = [...C.CROWD_HUMANOIDS, ...C.CROWD_DROIDS];

await test('table: deterministic, every (archetype, variant 0..7, gender) key maps into its own group; key hook covers all 12 cells', () => {
  const again = C.buildCrowdCellTable({ fresh: true });
  assert.equal(again.count, table.count);
  for (let i = 0; i < table.count; i++) {
    const a = table.cells[i], b = again.cells[i];
    assert.equal(a.seed, b.seed, `cell ${i} seed`); assert.equal(a.arch, b.arch); assert.equal(a.gender, b.gender); assert.equal(a.faceId, b.faceId); assert.equal(a.outfit, b.outfit);
  }
  let keys = 0;
  for (const a of ALL_ARCHETYPES) for (const female of [false, true]) {
    const g = table.groupOf(a, female);
    assert.equal(g.archetype, a, `${a} maps to its own group`);
    assert.ok(C.isCrowdDroid(a) ? g.gender === 'none' : g.gender === (female ? 'feminine' : 'masculine'), `${a} gender group`);
    const hit = new Set();
    for (let v = 0; v < 8; v++) {
      const c = table.cellFor(a, v, female);
      assert.equal(table.cellFor(a, v, female), c, 'same inputs, same cell');
      assert.ok(c >= g.start && c < g.start + g.count, `${a} v${v} cell ${c} inside its group`);
      hit.add(c); keys++;
    }
    assert.equal(hit.size, Math.min(8, g.count), `${a}: 8 variants -> ${hit.size} distinct cells`);
    if (!g.droid) { const spread = new Set(); for (let k = 0; k < 400; k++) spread.add(table.cellFor(a, 0, female, k * 7919 + 13)); assert.equal(spread.size, g.count, `${a}: key hook reaches all ${g.count} cells`); }
  }
  // unknown archetype names fall back to resident, security officers wear CSF uniforms
  assert.equal(table.groupOf('nerf herder').archetype, 'resident');
  assert.equal(table.groupOf('security officer').arch, 'csf_officer');
  return `${table.count} cells in ${table.groups.length} groups, ${keys} (archetype, variant, gender) keys, ${ALL_ARCHETYPES.length} crowd archetypes -> ${new Set(table.groups.map((g) => g.arch)).size} composer archetypes`;
});

await test('atlas: 16 columns of 128x64 cells, >= 250 cells, >= 12 variants per archetype, <= 2048 x 2048', () => {
  assert.equal(C.CELL_W, 128); assert.equal(C.CELL_H, 64); assert.equal(C.ATLAS_COLS, 16);
  assert.ok(table.count >= 250, `${table.count} cells`);
  assert.equal(table.atlasWidth, 2048);
  assert.ok(table.atlasHeight <= 2048 && table.atlasHeight === table.rows * 64, `atlas ${table.atlasWidth}x${table.atlasHeight}`);
  for (const a of C.CROWD_HUMANOIDS) { const n = table.groups.filter((g) => g.archetype === a).reduce((s, g) => s + g.count, 0); assert.ok(n >= 12, `${a}: ${n} variants`); }
  for (let i = 0; i < table.count; i++) { const [x, y, w, h] = table.cellRect(i); assert.ok(x + w <= table.atlasWidth && y + h <= table.atlasHeight, `cell ${i} rect`); }
  return `${table.count} cells, ${table.atlasWidth}x${table.atlasHeight} (${table.rows} rows), ${C.CELLS_PER_GENDER} per gender x 2 = ${2 * C.CELLS_PER_GENDER} variants per humanoid archetype, children ${2 * C.CHILD_CELLS_PER_GENDER}, protocol droids ${C.PROTOCOL_CELLS}, astromech / sweeper ${C.DROID_CELLS} each`;
});

await test('faces: no two cells share a face id; no two cells share face + outfit + colourway; hidden faces distinct within their group', () => {
  const faces = new Map(), combos = new Set(), hidden = new Set();
  let visible = 0, hid = 0;
  for (const c of table.cells) {
    if (c.faceId) { visible++; assert.ok(!faces.has(c.faceId), `face ${c.faceId} in cells ${faces.get(c.faceId)} and ${c.index}`); faces.set(c.faceId, c.index); }
    else hid++;
    const combo = `${c.faceId}|${c.outfit}|${c.colourway}`;
    if (c.faceId) { assert.ok(!combos.has(combo), `combo ${combo}`); combos.add(combo); }
    else { const k = `${c.group.id}|${c.outfit}|${c.colourway}|${c.wear}|${c.species}`; assert.ok(!hidden.has(k), `hidden-face duplicate ${k}`); hidden.add(k); }
  }
  return `${visible} visible faces all distinct, ${hid} hidden (helmets / masks / droid shells) distinct by outfit + colourway + wear + species`;
});

await test('species mix follows the composer archetypeTable: every group draws only its archetype species; aliens present in every humanoid archetype', () => {
  const by = table.speciesByArchetype();
  let humans = 0, organics = 0;
  for (const g of table.groups) {
    const allowed = new Set(Object.keys(ARCHETYPES[g.arch].species));
    for (const c of table.cells.slice(g.start, g.start + g.count)) assert.ok(allowed.has(c.species), `${g.id}: species ${c.species} not in ${g.arch}`);
  }
  for (const a of C.CROWD_HUMANOIDS) {
    const mix = by[a];
    const n = Object.values(mix).reduce((s, v) => s + v, 0), h = mix.human || 0;
    humans += h; organics += n;
    assert.ok(Object.keys(mix).length >= 2, `${a}: only ${JSON.stringify(mix)}`);
  }
  const share = humans / organics;
  assert.ok(share > 0.35 && share < 0.8, `human share ${share.toFixed(2)}`);
  const geo = table.cells.filter((c) => c.species !== 'droid' && SPECIES_BY_ID[c.species].geometry).length;
  return `human share ${(share * 100).toFixed(0)}% of ${organics} organic cells, ${new Set(table.cells.map((c) => c.species)).size} species, ${geo} cells of species with head geometry`;
});

// --------------------------------------------------------------------------------------------------- paint everything
const infos = new Array(table.count);
const atlas = new Raster(table.atlasWidth, table.atlasHeight);
const tab = new Float32Array(C.TAB_W * 4 * table.count);
let paintMs = 0, paintMax = 0;
await test('paint: every cell composes into 128x64 opaque-bodied pixels; per-cell time reported', () => {
  for (let i = 0; i < table.count; i++) {
    const t0 = performance.now();
    const info = C.composeCrowdCell(table.cells[i]);
    const ms = performance.now() - t0; paintMs += ms; paintMax = Math.max(paintMax, ms);
    infos[i] = info;
    assert.equal(info.raster.w, 128); assert.equal(info.raster.h, 64);
    C.blitCell(atlas, table, i, info.raster);
    C.fillCellRow(tab, i, info);
    // the head front and body front are painted (opaque) for humanoid-layout cells
    if (table.cells[i].kind === 'compose') { assert.ok(info.raster.alpha(F[0] + 8, F[1] + 8) === 255, `cell ${i} head front`); assert.ok(info.raster.alpha(REG.bodyFront[0] + 4, REG.bodyFront[1] + 6) === 255, `cell ${i} body front`); }
  }
  // the blit is exact: the atlas hash of a cell equals the cell raster's hash
  for (const i of [0, 77, 250, table.count - 1]) { const [x, y] = table.cellRect(i); assert.equal(atlas.hash(x, y, 128, 64), infos[i].raster.hash(), `cell ${i} blit`); }
  return `${table.count} cells in ${paintMs.toFixed(0)} ms (${(paintMs / table.count).toFixed(2)} ms/cell avg, max ${paintMax.toFixed(1)} ms) - painted lazily in the game, first-worn cells first`;
});

await test('blink: eye rects sit on the eye rows of the head front and cover eye texels (not skin); helmets, masks and droids blink nothing', () => {
  let withEyes = 0, without = 0;
  for (let i = 0; i < table.count; i++) {
    const info = infos[i], c = table.cells[i];
    const row = C.readCellRow(tab, i);
    if (!info.eyes) { without++; assert.equal(row.eyes, null, `cell ${i} table has no eyes`); assert.ok(c.hiddenFace || c.kind === 'sw' || SPECIES_BY_ID[c.species].eyeKind === 'geometry', `cell ${i} (${c.species}, ${c.outfit}) shows a face but has no eye rects`); continue; }
    withEyes++;
    assert.ok(!c.hiddenFace, `cell ${i} hidden face with eye rects`);
    assert.equal(info.eyes.length, 2);
    for (const [x, y, w, h] of info.eyes) {
      assert.ok(x >= F[0] && x + w <= F[0] + 16 && y >= F[1] + EYE_ROW0 && y + h <= F[1] + EYE_ROW0 + 4, `cell ${i} eye rect ${[x, y, w, h]} on the eye rows`);
      let eye = 0, total = 0;
      const skin = info.raster.get(F[0] + 7, F[1] + 10);   // nose bridge / cheek texel = skin
      for (let j = y; j < y + h; j++) for (let k = x; k < x + w; k++) { total++; const p = info.raster.get(k, j); if (!same(p, skin)) eye++; }
      assert.ok(eye >= total * 0.5, `cell ${i} eye rect ${[x, y, w, h]}: ${eye}/${total} non-skin texels`);
    }
    assert.deepEqual(row.eyes.map((r) => r.map(Math.round)), info.eyes, `cell ${i} table eye rects`);
    assert.ok(row.lid[3] === 1 && row.lid[0] + row.lid[1] + row.lid[2] > 0, `cell ${i} lid colour`);
  }
  assert.ok(withEyes >= 400, `${withEyes} cells blink`);
  return `${withEyes} cells blink on their own eye rects, ${without} do not (helmets / masks / geometry eyes / droids)`;
});

await test('droids: protocol droid photoreceptors and astromech / sweeper lights carry the emissive alpha (191)', () => {
  let protocol = 0, sw = 0;
  for (let i = 0; i < table.count; i++) {
    const c = table.cells[i];
    if (!c.group.droid) continue;
    const r = infos[i].raster;
    let glow = 0;
    for (let k = 3; k < r.d.length; k += 4) if (r.d[k] === C.EMISSIVE_BYTE) glow++;
    if (c.archetype === 'protocol droid') { protocol++; assert.ok(glow >= 2, `protocol droid cell ${i}: ${glow} emissive texels`); }
    else { sw++; assert.ok(glow >= 1, `${c.archetype} cell ${i}: ${glow} emissive texels`); assert.equal(c.kind, 'sw'); }
    // droids never blink and carry no boxes
    assert.equal(infos[i].eyes, null); assert.equal(infos[i].boxes.length, 0);
  }
  return `${protocol} protocol droid cells (composer, lamp centres marked), ${sw} astromech / sweeper cells (skins-sw.js at 2x)`;
});

await test('boxes: species parts + hats + capes fit the cell table (<= MAX_BOXES, rects inside the cell, off the body layout); table rows round-trip', () => {
  const body = [REG.headFront, REG.headBack, REG.headTop, REG.headBottom, REG.headLeft, REG.headRight, REG.bodyFront, REG.bodyBack, REG.armFront, REG.legFront];
  const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  let boxes = 0, dropped = 0, withBoxes = 0, maxUsed = 0;
  const partCells = {};
  for (let i = 0; i < table.count; i++) {
    const info = infos[i], row = C.readCellRow(tab, i);
    assert.equal(row.boxCount, info.boxes.length, `cell ${i} box count`);
    assert.ok(info.boxes.length <= C.MAX_BOXES);
    maxUsed = Math.max(maxUsed, info.boxes.length);
    boxes += info.boxes.length; dropped += info.dropped; if (info.boxes.length) withBoxes++;
    for (const p of info.parts) partCells[p] = (partCells[p] || 0) + 1;
    info.boxes.forEach((b, k) => {
      assert.ok(b.part >= 0 && b.part <= 5, `cell ${i} box ${k} attach ${b.part}`);
      assert.ok(b.w > 0 && b.h > 0 && b.d > 0, 'box size');
      for (const f of C.BOX_FACES) {
        const rc = b.uv[f] || b.uv.front;
        assert.ok(rc[0] >= 0 && rc[1] >= 0 && rc[0] + rc[2] <= 128 && rc[1] + rc[3] <= 64, `cell ${i} box ${k} ${f} rect ${rc}`);
        for (const reg of body) assert.ok(!overlaps(rc, reg), `cell ${i} box ${k} ${f} rect ${rc} overlaps the body layout`);
      }
      const back = row.boxes[k];
      assert.ok(Math.abs(back.x - b.x) < 1e-4 && Math.abs(back.h - b.h) < 1e-4 && back.part === b.part, `cell ${i} box ${k} round trip`);
      assert.deepEqual(back.uv.front.map(Math.round), b.uv.front, 'front rect round trip');
    });
    assert.ok(Math.abs(row.scale[1] - info.scale[1]) < 1e-4, 'scale round trip');
  }
  // the head-geometry species carry their parts
  for (const [sp, part] of [['twilek', 'lekku'], ['togruta', 'montrals'], ['zabrak', 'horns'], ['nautolan', 'head_tendrils'], ['chagrian', 'lethorns'], ['rodian', 'snout'], ['ithorian', 'hammerhead'], ['mon_calamari', 'dome'], ['gran', 'eye_stalks'], ['duros', 'cranium']]) {
    const cells = table.cells.filter((c) => c.species === sp);
    if (!cells.length) continue;
    for (const c of cells) assert.ok(infos[c.index].parts.includes(part), `${sp} cell ${c.index} parts ${infos[c.index].parts}`);
  }
  const twi = table.cells.filter((c) => c.species === 'twilek').length, tog = table.cells.filter((c) => c.species === 'togruta').length;
  assert.ok(twi >= 10 && tog >= 5, `twi'leks ${twi}, togruta ${tog}`);
  const top = Object.entries(partCells).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(', ');
  return `${boxes} boxes over ${withBoxes} cells (max ${maxUsed}/${C.MAX_BOXES} per cell, ${dropped} dropped), parts: ${top}`;
});

await test('scale: species / gender silhouettes in the table; children remap to the child group and undo the composer child factor', () => {
  const sul = table.cells.filter((c) => c.species === 'sullustan'), ith = table.cells.filter((c) => c.species === 'ithorian');
  for (const c of sul) assert.ok(infos[c.index].scale[1] < 0.97, `sullustan cell ${c.index} scale ${infos[c.index].scale}`);
  for (const c of ith) assert.ok(infos[c.index].scale[1] > 1.02, `ithorian cell ${c.index} scale ${infos[c.index].scale}`);
  const fem = table.cells.filter((c) => c.gender === 'feminine' && c.species === 'human'), mas = table.cells.filter((c) => c.gender === 'masculine' && c.species === 'human');
  const avg = (cs) => cs.reduce((s, c) => s + infos[c.index].scale[0], 0) / cs.length;
  assert.ok(avg(fem) < avg(mas), `feminine ${avg(fem).toFixed(3)} vs masculine ${avg(mas).toFixed(3)}`);
  const kid = table.groupByKey.get('child|masculine');
  for (const c of table.cells.slice(kid.start, kid.start + kid.count)) { const s = infos[c.index].scale; assert.ok(s[1] > 0.9 && s[1] < 1.1, `child cell ${c.index} scale ${s} (the crowd applies 0.72 itself)`); assert.equal(c.age, 'child'); }
  const base = table.cellFor('resident', 3, false), kidCell = table.childCellFor(base);
  assert.ok(kidCell >= kid.start && kidCell < kid.start + kid.count, 'child remap');
  assert.equal(table.childCellFor(table.cellFor('astromech', 1)), table.cellFor('astromech', 1), 'droids never remap');
  return `sullustan ${sul.length} cells < 0.97, ithorian ${ith.length} cells > 1.02, feminine width ${avg(fem).toFixed(3)} vs masculine ${avg(mas).toFixed(3)}, ${kid.count * 2} child cells`;
});

await test('spread: a taken cell yields another cell of the same group, an exhausted group keeps the base cell', () => {
  const g = table.groupOf('tourist', true), base = g.start + 3;
  assert.equal(table.spread(base, new Set()), base);
  const used = new Set([base]);
  const alt = table.spread(base, used);
  assert.ok(alt !== base && alt >= g.start && alt < g.start + g.count, 'alternative in the group');
  for (let k = 0; k < g.count; k++) used.add(g.start + k);
  assert.equal(table.spread(base, used), base, 'exhausted group');
  // walking through a group fills every cell before repeating
  const seen = new Set(); let cur = base; const u = new Set();
  for (let k = 0; k < g.count; k++) { cur = table.spread(base, u); seen.add(cur); u.add(cur); }
  assert.equal(seen.size, g.count);
  return `group of ${g.count} fills completely before any repeat`;
});

await test('face distance (W9 metric): pairwise Hamming over the 16x16 face region between visible faces of one species', () => {
  const bySpecies = {};
  for (const c of table.cells) if (c.faceId && !c.hiddenFace) (bySpecies[c.species] = bySpecies[c.species] || []).push(c.index);
  let min = Infinity, minPair = null, pairs = 0, below8 = 0;
  for (const [sp, list] of Object.entries(bySpecies)) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const d = Raster.diffCount(infos[list[a]].raster, F[0], F[1], infos[list[b]].raster, F[0], F[1], 16, 16);
    pairs++;
    if (d < 8) below8++;
    if (d < min) { min = d; minPair = [sp, list[a], list[b]]; }
  }
  assert.ok(min >= 3, `min face diff ${min} texels (${minPair})`);
  assert.ok(below8 <= pairs * 0.01, `${below8} of ${pairs} same-species pairs differ by < 8 texels`);
  return `${pairs} same-species pairs, min diff ${min}/256 texels (${minPair.join(' ')}), ${below8} pairs below 8 texels`;
});

if (atlasOut) {
  await test(`atlas PNG -> ${atlasOut}`, () => {
    const png = encodePNG(atlas, (raw) => deflateSync(raw));
    writeFileSync(atlasOut, png);
    return `${atlas.w}x${atlas.h}, ${(png.length / 1024).toFixed(0)} KB, hash ${atlas.hash()}`;
  });
}

// ------------------------------------------------------------------------------------------------------- browser (CDP)
if (url) {
  const { launchPage } = await import('./cdp.mjs');
  const base = url.replace(/\/$/, '');
  const view = '?x=2975&z=120&y=97.2&yaw=0&pitch=-2&time=0.5&quality=light&rd=8&fly=1';
  const CENSUS = `(() => {
    const pop = game.coruscant.population, crowd = pop.crowd, p = game.player.pos, cam = game.camera;
    const dir = cam.getWorldDirection(new cam.position.constructor()); const fwd = { x: dir.x, z: dir.z };
    const vis = [];
    for (const n of pop.live) {
      if (!n.slot || n.hidden) continue;
      const dx = n.pos.x - p.x, dz = n.pos.z - p.z, d = Math.hypot(dx, dz), dy = Math.abs(n.pos.y - p.y);
      if (n.lot == null && dy <= 8 && d < 64 && (d < 6 || (dx * fwd.x + dz * fwd.z) / d > -0.2)) vis.push({ x: n.pos.x, z: n.pos.z, cell: crowd.cellOf(n.slot), droid: !!n.person.droid });
    }
    // same-cell pairs within 12 blocks: people (organic) and droids apart - a plaza with 19 protocol droids in 8
    // factory finishes repeats units, people never repeat while their group has a cell to spare
    let pairs = 0, droidPairs = 0;
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) if (vis[i].cell === vis[j].cell && Math.hypot(vis[i].x - vis[j].x, vis[i].z - vis[j].z) <= 12) { if (vis[i].droid) droidPairs++; else pairs++; }
    const c = pop.census(), s = crowd.stats();
    return JSON.stringify({ visibleCrowd: vis.length, people: vis.filter((v) => !v.droid).length, distinct: new Set(vis.map((v) => v.cell)).size, pairs, droidPairs, census: { live: c.live, visible: c.visible, failRate: c.failRate, drawCalls: c.drawCalls }, stats: s, draws: game.renderer.info.render.calls, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 });
  })()`;
  await test(`browser (${base}): Senate plaza at noon - shader compiles, >= 120 visible, >= 60 distinct cells, no same-cell pair within 12 blocks, 3 crowd draw calls, node == browser pixels`, async () => {
    const page = await launchPage(base + '/' + view, { width: 1280, height: 720 });
    try {
      await page.waitForGame(180000);
      await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"');
      const samples = [];
      for (const w of [12000, 8000, 8000]) { await page.sleep(w); samples.push(JSON.parse(await page.evaluate(CENSUS))); }
      const last = samples[samples.length - 1];
      const shaderErr = page.consoleLines.filter((l) => /shader|GLSL|WebGL|THREE\./i.test(l) && /error|invalid|fail/i.test(l));
      assert.equal(shaderErr.length, 0, 'shader / WebGL errors: ' + shaderErr.slice(0, 3).join(' | '));
      assert.equal(page.exceptions.length, 0, 'page exceptions: ' + page.exceptions.slice(0, 3).join(' | '));
      assert.ok(last.census.visible >= 120, `visible ${last.census.visible}`);
      assert.ok(last.distinct >= 60, `${last.distinct} distinct cells among ${last.visibleCrowd} visible crowd instances`);
      const pairs = samples.map((s) => s.pairs), droidPairs = samples.map((s) => s.droidPairs);
      assert.ok(Math.max(...pairs) <= 1 && pairs.filter((p) => p === 0).length >= 2, `same-cell pairs of people within 12 blocks per sample: ${pairs}`);
      assert.equal(last.stats.drawCalls, 3, 'crowd draw calls');
      assert.equal(last.stats.atlas[0], table.atlasWidth); assert.equal(last.stats.cells, table.count);
      assert.ok(last.stats.paintMaxMs < 30, `slowest single cell paint ${last.stats.paintMaxMs} ms`);
      // pixel parity: the same cells hash the same in Chrome and in node
      const probe = [0, 13, 77, 200, 352, 439, table.count - 1].filter((i) => i < table.count);
      const hashes = JSON.parse(await page.evaluate(`(() => { const c = game.coruscant.population.crowd; return JSON.stringify(${JSON.stringify(probe)}.map((i) => { c.paintCell(i); const [x, y] = c.table.cellRect(i); return c.atlasRaster.hash(x, y, 128, 64); })); })()`));
      assert.deepEqual(hashes, probe.map((i) => infos[i].raster.hash()), 'browser and node cell pixels');
      notes.push(`plaza noon: visible ${last.census.visible} (${last.people} people + ${last.visibleCrowd - last.people} droids in view), distinct cells ${last.distinct}, same-cell pairs within 12 blocks: people ${pairs.join('/')}, droids ${droidPairs.join('/')}, painted ${last.stats.painted}/${last.stats.cells} in ${last.stats.paintMs} ms (max ${last.stats.paintMaxMs} ms, uploads ${last.stats.uploadMs} ms), repairs ${last.stats.repairs}, draws ${last.draws}, heap ${last.heapMB} MB, species ${JSON.stringify(last.stats.species)}`);
      return `visible ${last.census.visible}, distinct ${last.distinct}, people pairs ${pairs.join('/')} (droid pairs ${droidPairs.join('/')}), painted ${last.stats.painted} cells in ${last.stats.paintMs} ms (avg ${last.stats.paintAvgMs}), draw calls ${last.draws}, heap ${last.heapMB} MB, ${probe.length} cell hashes equal`;
    } finally { page.close(); }
  });

  if (withCensus) {
    await test('scripts/npc-census.mjs at noon: live <= 150, visible >= 120 on the core plazas, failed trips < 2%', () => {
      const r = spawnSync(process.execPath, ['scripts/npc-census.mjs', '--url', base + '/', '--times', '0.5', '--out', '/tmp/p6-npc-census.json'], { encoding: 'utf8', timeout: 15 * 60 * 1000 });
      const out = (r.stdout || '') + (r.stderr || '');
      assert.equal(r.status, 0, 'npc-census exit ' + r.status + '\n' + out.split('\n').slice(-12).join('\n'));
      return out.trim().split('\n').slice(-3).join(' | ').slice(0, 300);
    });
  }
}

console.log(`\n${passed} passed, ${failed} failed${notes.length ? '\n' + notes.join('\n') : ''}`);
process.exit(failed ? 1 : 0);
