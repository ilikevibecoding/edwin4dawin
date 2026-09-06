// W9 appearance tests. The composer paints into a pure-JS raster, so every pixel test runs offline in node:
//
//   node scripts/test-appearance.mjs                       offline suite (counts, faces, eye rules, determinism,
//                                                          colourways + wear, archetype coverage, timing, cache)
//   node scripts/test-appearance.mjs --url http://localhost:5218
//                                                          + browser parity through CDP: the same seeds hash the same
//                                                          on a real canvas, compose time in Chrome, sheets render
import assert from 'node:assert/strict';
import * as A from '../src/npc/appearance/index.js';
import { OUTFITS_BY_ID } from '../src/npc/appearance/outfits.js';
import { speciesPartNames } from '../src/npc/appearance/compose.js';
import { RNG } from '../src/rng.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const url = opt('url', null);

let passed = 0, failed = 0;
const notes = [];
async function test(name, fn) {
  try { const r = await fn(); passed++; console.log(`PASS ${name}${r ? ' - ' + r : ''}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e.message}`); }
}
const { Raster, REG, EYE_WHITE, PUPIL, SPECIES_BY_ID } = A;
const F = REG.headFront;
const same = (p, c) => { const C = A.rgb(c); return p[0] === C[0] && p[1] === C[1] && p[2] === C[2]; };

// ------------------------------------------------------------------------------------------------- catalogue counts
const REQUIRED_OUTFITS = ['senate_guard', 'senate_guard_late', 'senate_commando', 'coruscant_guard', 'coruscant_guard_officer', 'csf_patrol', 'csf_detective', 'csf_riot', 'gu_police_droid',
  'underworld_police', 'jedi_knight', 'jedi_padawan', 'jedi_master', 'temple_guard', 'senator_naboo', 'senator_alderaan', 'senator_chandrila', 'senator_corellia', 'senator_rodia', 'senator_mon_cala',
  'senate_aide', 'chancellor_staff', 'journalist', 'medic', 'patient_gown', 'pilot', 'mechanic', 'dock_worker', 'cook', 'bartender', 'vendor', 'office_worker', 'casual_tunic', 'casual_jacket', 'casual_dress',
  'casual_layered', 'casual_workwear', 'casual_sport', 'tourist', 'courier', 'undercity_jacket', 'black_sun_manager', 'pyke_contact', 'bounty_hunter', 'performer', 'child_school', 'protocol_droid', 'astromech', 'sweeper_droid'];
const REQUIRED_PARTS = ['lekku', 'montrals', 'horns', 'snout', 'antennae', 'head_tendrils', 'dome', 'tusks', 'hammerhead'];
const RUBRIC_ARCHETYPES = ['office worker', 'resident', 'senator', 'senate aide', 'guard', 'pilot', 'mechanic', 'dock worker', 'vendor', 'cook', 'bartender', 'medic', 'patient', 'tourist', 'courier',
  'protocol droid', 'astromech', 'street-sweeper droid', 'jedi', 'bounty hunter', 'journalist'];

await test('counts: >= 100 canonical faces, >= 12 alien species, >= 40 outfits with 2-4 colourways and >= 2 wear levels', () => {
  const S = A.APPEARANCE_STATS;
  assert.ok(S.faces.canonical >= 100 && S.faces.combinations > 1e6, 'faces');
  assert.ok(S.species.aliens >= 12, `aliens ${S.species.aliens}`);
  assert.ok(S.outfits.total >= 40, `outfits ${S.outfits.total}`);
  const ids = new Set();
  for (const o of A.OUTFITS) {
    assert.ok(!ids.has(o.id), `duplicate outfit id ${o.id}`); ids.add(o.id);
    assert.ok(o.colourways.length >= 2 && o.colourways.length <= 4, `${o.id}: ${o.colourways.length} colourways`);
    assert.equal(new Set(o.colourways.map((c) => c.id)).size, o.colourways.length, `${o.id}: colourway ids unique`);
    assert.ok(o.wear.length >= 2, `${o.id}: needs a wear variant (${o.wear})`);
    for (const w of o.wear) assert.ok(A.WEAR_LEVELS.includes(w), `${o.id}: wear ${w}`);
    assert.ok(typeof o.paint === 'function' && o.describe && o.name && o.faction && o.role, `${o.id}: record fields`);
  }
  for (const id of REQUIRED_OUTFITS) assert.ok(OUTFITS_BY_ID[id], `missing outfit ${id}`);
  const parts = new Set(A.SPECIES.flatMap((sp) => speciesPartNames(sp).map((n) => n.replace(/ /g, '_'))));
  for (const p of REQUIRED_PARTS) assert.ok(parts.has(p), `missing species part ${p} (have ${[...parts].join(', ')})`);
  return `${S.faces.canonical} faces (${S.faces.combinations.toExponential(2)} trait combinations), ${S.species.aliens} aliens + human + droid, ${S.outfits.total} outfits / ${S.outfits.colourways} colourways, ${S.archetypes} archetypes`;
});

// ---------------------------------------------------------------------------------------------------- canonical faces
let faces = null;
await test('faces: 100 canonical faces pairwise >= 12% Hamming over the 16x16 face region (all 4950 pairs)', () => {
  const t0 = performance.now();
  faces = A.canonicalFaceSet(100);
  assert.equal(faces.length, 100, `only ${faces.length} faces found`);
  let min = Infinity, minPair = null;
  for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) {
    const d = Raster.diffCount(faces[i].raster, F[0], F[1], faces[j].raster, F[0], F[1], F[2], F[3]);
    if (d < min) { min = d; minPair = [faces[i].seed, faces[j].seed]; }
  }
  assert.ok(min >= Math.ceil(0.12 * 256), `min diff ${min} texels (pair ${minPair})`);
  assert.equal(new Set(faces.map((f) => f.id)).size, 100, 'trait ids all distinct');
  const g = {}, ag = {}, mk = {};
  for (const f of faces) { g[f.gender] = (g[f.gender] || 0) + 1; ag[f.age] = (ag[f.age] || 0) + 1; mk[f.face.marking] = (mk[f.face.marking] || 0) + 1; }
  assert.ok(Object.keys(g).length === 3 && Object.keys(ag).length >= 4, 'genders and ages covered');
  assert.ok(Object.keys(mk).length >= 4, `markings covered: ${JSON.stringify(mk)}`);
  return `min pairwise diff ${min}/256 texels (${(min / 2.56).toFixed(1)}%), ${faces.tried} seeds tried, genders ${JSON.stringify(g)}, ages ${JSON.stringify(ag)}, markings ${JSON.stringify(mk)}, ${(performance.now() - t0).toFixed(0)} ms`;
});

// ---------------------------------------------------------------------------------------------------------- eye rules
// two eyes on their own columns, each with white + iris + pupil, brow pixels above each eye, nothing eye-like in
// the bridge columns (no cyclops), the lids/lashes and markings never overwrite the eye
function checkHumanEyes(h, label) {
  const { head, raster: r, face } = h;
  assert.equal(head.eyeRects.length, 2, `${label}: two eye rects`);
  const [a, b] = head.eyeRects.slice().sort((p, q) => p[0] - q[0]);
  assert.ok(a[0] + a[2] <= b[0] - 2, `${label}: eyes separated by the bridge (${a[0] + a[2]} .. ${b[0]})`);
  assert.ok(a[0] >= F[0] + A.EYE_A_X && b[0] + b[2] <= F[0] + A.EYE_B_X + A.EYE_W, `${label}: eyes inside their columns`);
  for (const [k, e] of [['A', a], ['B', b]]) {
    let white = 0, iris = 0, pupil = 0;
    for (let y = e[1]; y < e[1] + e[3]; y++) for (let x = e[0]; x < e[0] + e[2]; x++) {
      const p = r.get(x, y);
      if (same(p, EYE_WHITE)) white++; else if (same(p, PUPIL)) pupil++; else if (same(p, face.eyeColour.c)) iris++;
    }
    assert.ok(white >= 2 && iris >= 2 && pupil >= 1, `${label} eye ${k}: white ${white} iris ${iris} pupil ${pupil}`);
    // brow: at least two non-skin pixels in rows 2-3 over the eye's columns, one of them the brow colour
    let browPx = 0, nonSkin = 0;
    for (let y = F[1] + 2; y <= F[1] + 3; y++) for (let x = e[0]; x < e[0] + e[2]; x++) { const p = r.get(x, y); if (same(p, head.browColour)) browPx++; if (!same(p, head.skin)) nonSkin++; }
    assert.ok(browPx >= 1 && nonSkin >= 2, `${label} eye ${k}: brow pixels ${browPx} (non-skin ${nonSkin}) above the eye`);
    assert.ok(e[1] > F[1] + 3, `${label} eye ${k}: eye starts below the brow rows`);
  }
  // bridge columns 7-8 on the eye rows: never white / pupil / iris
  for (let y = F[1] + 5; y <= F[1] + 8; y++) for (const bx of A.BRIDGE) { const p = r.get(F[0] + bx, y); assert.ok(!same(p, EYE_WHITE) && !same(p, PUPIL) && !same(p, face.eyeColour.c), `${label}: bridge pixel (${bx},${y - F[1]}) looks like an eye`); }
  // the eye strip for blink.js covers exactly the eye pixels
  const s = head.strip;
  assert.ok(s && head.eyePixels.length >= 10 && head.eyePixels.every((p) => p.x >= s.x && p.x < s.x + s.w && p.y >= s.y && p.y < s.y + s.h), `${label}: eye strip`);
}

await test('eye rules: every canonical face + 400 random human faces (all genders / ages) + clone template', () => {
  let n = 0;
  for (const f of faces) { checkHumanEyes({ head: A.paintHeadOnly(f.seed, { gender: f.gender, age: f.age }).head, raster: f.raster, face: f.face }, `canonical ${f.seed}`); n++; }
  for (let seed = 1; seed <= 400; seed++) {
    const gender = A.GENDERS[seed % 3], age = [...A.AGES, 'child'][seed % 5];
    checkHumanEyes(A.paintHeadOnly(seed * 31 + 7, { gender, age }), `human ${seed} ${gender} ${age}`); n++;
  }
  for (let seed = 1; seed <= 40; seed++) { checkHumanEyes(A.paintHeadOnly(seed, { gender: 'masculine', age: 'adult', clone: true }), `clone ${seed}`); n++; }
  return `${n} faces checked`;
});

await test('eye rules: human-eyed aliens keep two separated eyes; large-dark species have two dark eyes; geometry-eyed species carry eye parts', () => {
  let n = 0;
  for (const sp of A.ORGANIC_SPECIES) {
    for (let seed = 1; seed <= 25; seed++) {
      const h = A.paintHeadOnly(seed * 17, { gender: A.GENDERS[seed % 3], age: 'adult', species: sp.id });
      const label = `${sp.id} ${seed}`;
      if (sp.eyeKind === 'human') checkHumanEyes(h, label);
      else if (sp.eyeKind === 'large_dark' || sp.eyeKind === 'small_dark') {
        assert.equal(h.head.eyeRects.length, 2, `${label}: two eye rects`);
        const [a, b] = h.head.eyeRects.slice().sort((p, q) => p[0] - q[0]);
        assert.ok(a[0] + a[2] <= b[0] - 2, `${label}: separated`);
        for (const e of [a, b]) { let dark = 0; for (let y = e[1]; y < e[1] + e[3]; y++) for (let x = e[0]; x < e[0] + e[2]; x++) if (!same(h.raster.get(x, y), h.head.skin)) dark++; assert.ok(dark >= e[2] * e[3] * 0.8, `${label}: eye filled (${dark})`); }
      } else if (sp.eyeKind === 'geometry') {
        const app = A.composeUncached(seed, { species: sp.id, archetype: 'resident' });
        const eyes = app.geometry.filter((g) => g.kind === 'eyes' || g.kind === 'hammerhead');
        assert.ok(eyes.length >= 1 && eyes[0].boxes.length >= 2, `${label}: eye geometry`);
        const eyeBoxes = eyes[0].kind === 'hammerhead' ? eyes[0].boxes.filter((bx) => Math.abs(bx.x) > 2) : eyes[0].boxes; // the Ithorian eyes sit at the ends of the head slab
        assert.ok(eyeBoxes.length >= 2, `${label}: two eye boxes`);
        const xs = eyeBoxes.map((bx) => bx.x).sort((p, q) => p - q);
        for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 1.5, `${label}: eye parts separated`);
      }
      n++;
    }
  }
  return `${n} alien heads checked over ${A.ORGANIC_SPECIES.length} species`;
});

// -------------------------------------------------------------------------------------------------------- determinism
await test('determinism: same seed + options -> same id, description, pixels, geometry; different seeds differ', () => {
  const opts = [{ archetype: 'senate_guard' }, { archetype: 'senator', district: 'senate' }, { archetype: 'resident', district: 'undercity' }, { archetype: 'astromech' }, { faction: 'jedi' }, { archetype: 'coruscant_guard', rank: 'officer' }];
  const hashes = new Set(), faceHashes = new Set();
  let faced = 0;
  for (let seed = 1; seed <= 30; seed++) for (const o of opts) {
    const a = A.composeUncached(seed, o), b = A.composeUncached(seed, o);
    assert.equal(a.id, b.id); assert.equal(a.description, b.description);
    assert.equal(a.raster.hash(), b.raster.hash(), `pixels differ for ${a.id}`);
    assert.equal(JSON.stringify(a.geometry), JSON.stringify(b.geometry), `geometry differs for ${a.id}`);
    assert.deepEqual(a.model, b.model);
    hashes.add(a.raster.hash());
    if (a.eyes) { faced++; faceHashes.add(a.raster.hash()); } // a visible face makes every person unique
  }
  assert.equal(faceHashes.size, faced, 'every bare-headed appearance is unique');
  assert.ok(hashes.size >= 30 * opts.length * 0.8, `distinct skins ${hashes.size} (anonymous masks / clean armour may repeat)`);
  // the choice step is stable across the cache and across describeAppearance(id)
  for (let seed = 1; seed <= 60; seed++) {
    const arch = Object.keys(A.ARCHETYPES)[seed % Object.keys(A.ARCHETYPES).length];
    const app = A.composeUncached(seed, { archetype: arch });
    assert.equal(A.describeAppearance(app.id), app.description, `describeAppearance(id) for ${app.id}`);
    const p = A.parseAppearanceId(app.id);
    assert.equal(p.outfit, app.outfit.id); assert.equal(p.species, app.species);
  }
  return `${hashes.size} distinct skins from ${30 * opts.length} compositions; describeAppearance(id) round-trips`;
});

// ------------------------------------------------------------------------------------------------ colourways + wear
await test('colourways + wear: every outfit paints every colourway distinctly and every wear level as scattered texture detail', () => {
  let cw = 0, wl = 0;
  for (const o of A.OUTFITS) {
    const arch = Object.keys(A.ARCHETYPES).find((a) => A.ARCHETYPES[a].outfits[o.id]) || 'resident';
    const base = { archetype: arch, outfit: o.id, wear: o.wear[0] };
    const seen = new Set();
    for (const c of o.colourways) {
      const app = A.composeUncached(11, { ...base, colourway: c.id });
      assert.equal(app.outfit.id, o.id, `${o.id}: outfit honoured`); assert.equal(app.outfit.colourway, c.id, `${o.id}: colourway ${c.id} honoured`);
      const h = app.raster.hash(); assert.ok(!seen.has(h), `${o.id}: colourway ${c.id} paints the same as another`); seen.add(h); cw++;
    }
    const clean = A.composeUncached(11, { ...base, colourway: o.colourways[0].id, wear: o.wear[0] });
    for (const w of o.wear.slice(1)) {
      const worn = A.composeUncached(11, { ...base, colourway: o.colourways[0].id, wear: w });
      assert.equal(worn.outfit.wear, w);
      const d = Raster.diffCount(clean.raster, 0, 0, worn.raster, 0, 0, clean.raster.w, clean.raster.h, 4);
      const body = 8 * 24 * 2 * 4; // rough count of body texels that wear can touch
      assert.ok(d >= 12, `${o.id}: wear ${w} changes only ${d} texels`);
      assert.ok(d <= body, `${o.id}: wear ${w} repaints ${d} texels - that is a colour swap, not detail`);
      wl++;
    }
  }
  return `${cw} colourways and ${wl} wear variants painted and distinct`;
});

// ------------------------------------------------------------------------------------------------ archetype coverage
await test('archetype coverage: every archetype, alias, rubric-07 name and spec-14 faction composes; picks stay inside the table', () => {
  const table = Object.fromEntries(A.archetypeTable().map((r) => [r.archetype, r]));
  let painted = 0;
  for (const [id, arch] of Object.entries(A.ARCHETYPES)) {
    const species = new Set(), outfits = new Set(), wears = new Set();
    for (let seed = 1; seed <= 400; seed++) {
      const ch = A.chooseAppearance(seed * 13 + 1, { archetype: id, district: A.DISTRICTS[seed % A.DISTRICTS.length] });
      assert.ok(table[id].species.includes(ch.species), `${id}: species ${ch.species} not in the table`);
      const allowed = table[id].outfits.includes(ch.outfit.id);
      assert.ok(allowed || A.SPECIES_BY_ID[ch.species].droid === false, `${id}: outfit ${ch.outfit.id} not in the table`);
      assert.ok(A.outfitFitsSpecies(ch.outfit, ch.sp), `${id}: ${ch.outfit.id} does not fit ${ch.species} (headgear ${ch.outfit.headgear})`);
      if (arch.clone) assert.ok(ch.species === 'human' && ch.gender === 'masculine' && ch.age === 'adult', `${id}: clones are adult human men`);
      if (arch.child) assert.equal(ch.age, 'child');
      species.add(ch.species); outfits.add(ch.outfit.id); wears.add(ch.wear);
      if (seed <= 12) { const app = A.composeUncached(seed, { archetype: id }); assert.ok(app.skin && app.description.length > 10 && app.model && app.tags.length, `${id}: appearance object`); painted++; }
    }
    for (const o of table[id].outfits) assert.ok(outfits.has(o), `${id}: outfit ${o} never chosen in 400 seeds`);
    assert.ok(species.size >= Math.min(3, table[id].species.length), `${id}: species variety ${species.size}`);
  }
  const rng = new RNG(5);
  for (const name of RUBRIC_ARCHETYPES) { const r = A.resolveArchetype(name, rng); assert.ok(A.ARCHETYPES[r], `${name} -> ${r}`); assert.ok(name === 'resident' || r !== 'resident' || name === 'resident', `${name} resolved to the fallback`); }
  for (const alias of Object.keys(A.ARCHETYPE_ALIASES)) for (const t of A.ARCHETYPE_ALIASES[alias]) assert.ok(A.ARCHETYPES[t] || A.ARCHETYPE_ALIASES[t], `alias ${alias} -> ${t}`);
  for (const [f, list] of Object.entries(A.FACTION_ARCHETYPES)) { for (const t of list) assert.ok(A.ARCHETYPES[t], `faction ${f} -> ${t}`); const app = A.composeUncached(3, { faction: f }); assert.ok(list.includes(app.archetype), `faction ${f} composes ${app.archetype}`); }
  // rank pins
  assert.equal(A.chooseAppearance(4, { archetype: 'coruscant_guard', rank: 'officer' }).outfit.id, 'coruscant_guard_officer');
  assert.equal(A.chooseAppearance(4, { archetype: 'jedi', rank: 'padawan' }).outfit.id, 'jedi_padawan');
  assert.equal(A.chooseAppearance(4, { archetype: 'senate_guard', rank: 'commando' }).outfit.id, 'senate_commando');
  // headgear compatibility: a Togruta never gets a full helmet, a Rodian never a Coruscant Guard suit
  for (let seed = 1; seed <= 60; seed++) {
    const t = A.chooseAppearance(seed, { archetype: 'csf_officer', species: 'togruta' }); assert.ok(!['helmet', 'cap'].includes(t.outfit.headgear), `togruta got ${t.outfit.id}`);
    const c = A.chooseAppearance(seed, { archetype: 'coruscant_guard', species: 'rodian' }); assert.equal(c.species, 'human', 'Coruscant Guard clones are human');
  }
  return `${Object.keys(A.ARCHETYPES).length} archetypes x 400 seeds checked, ${painted} painted, ${RUBRIC_ARCHETYPES.length} rubric names + ${Object.keys(A.FACTION_ARCHETYPES).length} factions resolve`;
});

// --------------------------------------------------------------------------------------------- geometry + blink info
await test('geometry records: uv rects inside the free area of the skin, all six faces mapped, parts protrude from their attach part, no allocation failures', () => {
  const inFree = (r) => A.FREE_RECTS.some(([x, y, w, h]) => r[0] >= x && r[1] >= y && r[0] + r[2] <= x + w && r[1] + r[3] <= y + h);
  const PART_SIZE = { head: [8, 8, 8, 4], body: [8, 12, 4, 0], rightArm: [4, 12, 4, -4], leftArm: [4, 12, 4, -4], rightLeg: [4, 12, 4, -6], leftLeg: [4, 12, 4, -6] };
  let boxes = 0, apps = 0;
  const archs = Object.keys(A.ARCHETYPES);
  for (let seed = 1; seed <= 300; seed++) {
    const app = A.composeUncached(seed, { archetype: archs[seed % archs.length] });
    apps++;
    assert.equal(app.alloc.failed, 0, `${app.id}: ${app.alloc.failed} uv allocations failed`);
    for (const rec of app.geometry) {
      assert.ok(rec.kind && rec.attach && Array.isArray(rec.boxes) && rec.boxes.length, `${app.id}: record ${rec.kind}`);
      const P = PART_SIZE[rec.attach]; assert.ok(P, `${app.id}: attach ${rec.attach}`);
      for (const b of rec.boxes) {
        boxes++;
        for (const f of ['front', 'back', 'left', 'right', 'top', 'bottom']) { const r = b.uv[f]; assert.ok(r && r[2] >= 1 && r[3] >= 1, `${app.id}: ${rec.kind} uv ${f}`); assert.ok(inFree(r) || (app.model.kind === 'boxes'), `${app.id}: ${rec.kind} uv ${f} ${r} outside the free area`); }
        assert.ok(typeof b.paint === 'undefined' && typeof b.colour === 'string', `${app.id}: ${rec.kind} box is plain data`);
        // protrudes: some extent of the box lies outside the attach part's box (part centre at y offset P[3])
        const cx = P[0] / 2, cy = P[3], cz = P[2] / 2;
        const inside = Math.abs(b.x) + b.w / 2 <= cx + 1e-6 && b.y - b.h / 2 >= cy - P[1] / 2 - 1e-6 && b.y + b.h / 2 <= cy + P[1] / 2 + 1e-6 && Math.abs(b.z) + b.d / 2 <= cz + 1e-6;
        assert.ok(!inside, `${app.id}: ${rec.kind} box ${JSON.stringify([b.x, b.y, b.z, b.w, b.h, b.d])} is hidden inside the ${rec.attach}`);
      }
    }
    for (const ov of app.overlays) assert.ok(ov.uv && ov.uv.front && ov.colour, `${app.id}: overlay uv`);
    if (app.model.kind === 'boxes') { assert.ok(app.model.parts.length >= 3, `${app.id}: droid parts`); for (const p of app.model.parts) assert.ok(p.uv && p.uv.front && p.w > 0 && p.h > 0 && p.d > 0 && p.name, `${app.id}: droid part ${p.name}`); }
  }
  return `${apps} appearances, ${boxes} geometry boxes checked`;
});

await test('blink info: bare-headed organics expose the eye strip for blink.js; helmets / masks / droids do not', () => {
  let withEyes = 0, without = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const app = A.composeUncached(seed, { archetype: Object.keys(A.ARCHETYPES)[seed % Object.keys(A.ARCHETYPES).length] });
    const covered = ['helmet', 'mask', 'open_helmet', 'droid'].includes(app.outfit.headgear) || app.species === 'droid' || A.SPECIES_BY_ID[app.species].eyeKind === 'geometry';
    if (covered) { assert.equal(app.eyes, null, `${app.id}: eyes should be hidden`); without++; continue; }
    assert.ok(app.eyes && app.eyes.pixels.length >= 4 && app.eyes.image && app.eyes.image.width === app.eyes.w && app.eyes.image.height === app.eyes.h, `${app.id}: eye strip`);
    assert.equal(app.canvas, app.skin, 'app.canvas alias for attachBlink');
    for (const p of app.eyes.pixels) assert.ok(p.x >= app.eyes.x && p.x < app.eyes.x + app.eyes.w && p.y >= app.eyes.y && p.y < app.eyes.y + app.eyes.h);
    withEyes++;
  }
  return `${withEyes} with eye strips, ${without} covered`;
});

// --------------------------------------------------------------------------------------------------------- performance
await test('performance: composeUncached mean <= 2 ms (node, pure-JS raster), cache hit is ~free', () => {
  const archs = Object.keys(A.ARCHETYPES);
  for (let i = 0; i < 60; i++) A.composeUncached(1000 + i, { archetype: archs[i % archs.length] });
  const N = 400, times = [];
  const t0 = performance.now();
  for (let i = 0; i < N; i++) { const t = performance.now(); A.composeUncached(5000 + i, { archetype: archs[i % archs.length] }); times.push(performance.now() - t); }
  const total = performance.now() - t0, mean = total / N;
  times.sort((a, b) => a - b);
  const p95 = times[Math.floor(N * 0.95)], max = times[N - 1];
  assert.ok(mean <= 2, `mean ${mean.toFixed(3)} ms`);
  A.appearanceCache.clear();
  A.composeAppearance(77, { archetype: 'senator' });
  const t1 = performance.now(); for (let i = 0; i < 1000; i++) A.composeAppearance(77, { archetype: 'senator' }); const hit = (performance.now() - t1) / 1000;
  notes.push(`compose mean ${mean.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms, max ${max.toFixed(3)} ms; cache hit ${hit.toFixed(4)} ms`);
  return `mean ${mean.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms, max ${max.toFixed(2)} ms over ${N}; cache hit ${hit.toFixed(4)} ms`;
});

await test('cache: LRU of 512 appearances, same seed returns the same object, oldest evicted, touched entries survive', () => {
  A.appearanceCache.clear();
  const a = A.composeAppearance(1, { archetype: 'vendor' }), b = A.composeAppearance(1, { archetype: 'vendor' });
  assert.equal(a, b, 'same object back');
  assert.equal(A.CACHE_CAPACITY, 512);
  for (let s = 2; s <= 300; s++) A.composeAppearance(s, { archetype: 'vendor' });
  A.composeAppearance(1, { archetype: 'vendor' }); // touch the first one
  for (let s = 301; s <= 700; s++) A.composeAppearance(s, { archetype: 'vendor' });
  assert.equal(A.appearanceCache.size, 512);
  assert.ok(A.appearanceCache.has(a.id), 'touched entry survives');
  assert.ok(!A.appearanceCache.has(A.chooseAppearance(2, { archetype: 'vendor' }).id), 'oldest untouched entry evicted');
  assert.ok(A.appearanceCache.has(A.chooseAppearance(700, { archetype: 'vendor' }).id));
  const S = A.APPEARANCE_STATS.texture;
  assert.ok(S.bytesPerSkin === 128 * 64 * 4 && S.cacheBytesMax <= 20 * 1024 * 1024, `texture budget ${S.cacheBytesMax}`);
  return `size ${A.appearanceCache.size}, evictions ${A.appearanceCache.evictions}, ${S.bytesPerSkin} B/skin, cap ${(S.cacheBytesMax / 1048576).toFixed(1)} MB`;
});

await test('describeAppearance: readable sentences with species, age, gender, face and outfit', () => {
  const d1 = A.describeAppearance(A.composeUncached(7, { archetype: 'senate_guard' }).id);
  assert.match(d1, /Senate Guard/);
  const d2 = A.composeUncached(11, { archetype: 'coruscant_guard' }).description;
  assert.match(d2, /clone/); assert.match(d2, /scarlet/);
  const d3 = A.composeUncached(3, { species: 'twilek', archetype: 'senator' }).description;
  assert.match(d3, /Twi'lek/); assert.match(d3, /lekku/);
  const d4 = A.composeUncached(5, { archetype: 'astromech' }).description;
  assert.match(d4, /astromech/);
  return `${d1.slice(0, 90)}...`;
});

// ----------------------------------------------------------------------------------------------- browser parity (CDP)
if (url) {
  const { launchPage } = await import('./cdp.mjs');
  const seeds = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
  const archs = ['senate_guard', 'coruscant_guard', 'senator', 'resident', 'pilot', 'protocol_droid', 'astromech', 'jedi', 'csf_officer', 'undercity_resident', 'child', 'bounty_hunter'];
  const local = seeds.map((s, i) => A.composeUncached(s, { archetype: archs[i] }).raster.hash());
  await test(`browser (${url}): sheet page mounts; same seeds hash the same on a real canvas as in node`, async () => {
    const page = await launchPage(`${url.replace(/\/$/, '')}/src/npc/appearance/sheet.html?sheet=eyes`, { width: 1200, height: 700 });
    try {
      let ready = false;
      for (let i = 0; i < 100 && !ready; i++) { ready = await page.evaluate('!!(window.__sheet && window.__sheet.kind)').catch(() => false); if (!ready) await page.sleep(200); }
      assert.ok(ready, 'sheet page mounted: ' + page.exceptions.join(' | '));
      const res = JSON.parse(await page.evaluate(`(async () => {
        const A = await import('/src/npc/appearance/index.js');
        const seeds = ${JSON.stringify(seeds)}, archs = ${JSON.stringify(archs)};
        const hashes = seeds.map((s, i) => A.composeUncached(s, { archetype: archs[i] }).raster.hash());
        // real canvas pixels == raster pixels
        let canvasMismatch = 0;
        for (let i = 0; i < 4; i++) { const app = A.composeUncached(seeds[i], { archetype: archs[i] }); const img = app.skin.getContext('2d').getImageData(0, 0, app.skin.width, app.skin.height).data; for (let k = 0; k < img.length; k += 4) if (img[k + 3] && (img[k] !== app.raster.d[k] || img[k + 1] !== app.raster.d[k + 1] || img[k + 2] !== app.raster.d[k + 2])) canvasMismatch++; }
        for (let i = 0; i < 40; i++) A.composeUncached(900 + i, { archetype: archs[i % archs.length] });
        const N = 300, t0 = performance.now();
        for (let i = 0; i < N; i++) A.composeUncached(3000 + i, { archetype: archs[i % archs.length] });
        const mean = (performance.now() - t0) / N;
        const dom = A.hasDomCanvas() && A.composeUncached(1, {}).skin instanceof HTMLCanvasElement;
        return JSON.stringify({ hashes, canvasMismatch, mean, dom, stats: A.APPEARANCE_STATS.outfits.total });
      })()`));
      assert.deepEqual(res.hashes, local, 'browser and node pixel hashes');
      assert.equal(res.canvasMismatch, 0, 'canvas pixels equal the raster');
      assert.ok(res.dom, 'real HTMLCanvasElement used in the browser');
      assert.ok(res.mean <= 2, `browser compose mean ${res.mean.toFixed(3)} ms`);
      notes.push(`browser compose mean ${res.mean.toFixed(3)} ms`);
      const sheets = JSON.parse(await page.evaluate(`JSON.stringify(['faces', 'species', 'outfits'].map((k) => { const o = window.__renderSheet(k, {}); return [k, o.width, o.height, Math.round(o.ms)]; }))`));
      for (const [k, w, h] of sheets) assert.ok(w > 800 && h > 300, `${k} sheet ${w}x${h}`);
      assert.equal(page.exceptions.length, 0, 'page exceptions: ' + page.exceptions.join(' | '));
      return `${seeds.length} hashes equal, canvas == raster, browser compose mean ${res.mean.toFixed(3)} ms, sheets ${sheets.map((s) => `${s[0]} ${s[1]}x${s[2]} ${s[3]}ms`).join(', ')}`;
    } finally { page.close(); }
  });
}

console.log(`\n${passed} passed, ${failed} failed${notes.length ? '\n' + notes.join('\n') : ''}`);
process.exit(failed ? 1 : 0);
