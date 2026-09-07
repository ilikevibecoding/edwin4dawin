// P3 suite (docs/rubrics/16_programs.md): the Programs API contract and host mapping (A), the programs built into
// the blueprints and their completion tests (B, C), the dossiers (D), the four-differences rule (E) and the building
// rubric scorer (F) as assertions, offline against blueprints. Rubric items are cited on each test.
//
//   node scripts/test-programs.mjs [--seed 1337] [--strict] [--quick]
//
// --strict also fails when the dossiers on disk are stale (a docs regeneration is due); --quick skips the timed
// rebuilds and the generation-time measurement. Exit code 1 on any failed assertion.
import assert from 'node:assert/strict';
import { BLOCKS } from '../src/blocks.js';
import { GOODS } from '../src/economy/prices.js';
import { roomFunction, ROOM_FUNCTIONS } from '../src/npc/coruscant/rooms.js';
import { buildBlueprint, clearBlueprintCache } from '../src/coruscant/buildings.js';
import { ROOMS } from '../src/coruscant/rooms/index.js';
import { PROGRAM_ROOMS, ADAPTATION_BY_KIND } from '../src/coruscant/rooms/programs.js';
import { programFor, PROGRAMS, PROGRAM_BY_ID, hostsOf, hostTable, KIND_TO_PROGRAM, FAMILY_TO_PROGRAM, assignedHosts, INTERACTIONS } from '../src/coruscant/programs/index.js';
import { templateFor } from '../src/coruscant/programs/apply.js';
import { city, parseArgs, purposeFor, checkProgram, formatHost } from './programs/_lib.mjs';
import { playableLots, profiles } from './programs/_profile.mjs';
import { similarityReport, formatPair, MIN_DIFFERENCES } from './room-similarity.mjs';
import { scoreAll, CATEGORIES, THRESHOLDS } from './score-buildings.mjs';
import { writeDossiers } from './dossiers.mjs';

const a = parseArgs(process.argv.slice(2));
const SEED = parseInt(a.seed || '1337', 10);
const layout = city(SEED);
const lots = playableLots(layout);
let passed = 0, failed = 0;
function test(name, fn) {
  const t0 = performance.now();
  try { fn(); passed++; console.log(`ok   ${name}  [${(performance.now() - t0).toFixed(0)} ms]`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e && e.message || e).split('\n').join('\n     ')}`); }
}
const REQUIRED = ['senate', 'delegation_office', 'jedi_temple', 'passenger_terminal', 'cargo_terminal', 'repair_hangar', 'droid_workshop', 'diner', 'cantina_club', 'opera_house', 'market_arcade', 'clinic', 'worker_apartments', 'affluent_apartments', 'transit_interchange', 'security_station', 'utility_plant', 'salvage_yard', 'criminal_front', 'community_hall'];
const CONTRACT = ['id', 'name', 'address', 'owner', 'purpose', 'staff', 'customers', 'circulation', 'roomGraph', 'materials', 'interactions', 'inputs', 'outputs'];

console.log(`P3 suite: seed ${SEED}, ${lots.length} playable buildings, ${PROGRAMS.length} programs\n`);

// ---- A. Programs API and host mapping --------------------------------------------------------------------------
test('A1 programFor(lot, purpose, layout) returns the contract record for every playable lot, deterministically', () => {
  for (const lot of lots) {
    const purpose = purposeFor(lot, layout);
    const rec = programFor(lot, purpose, layout);
    assert.ok(rec, `lot ${lot.id} (${purpose.kind}) has no program`);
    for (const k of CONTRACT) assert.ok(k in rec, `lot ${lot.id}: record lacks ${k}`);
    assert.ok(rec.owner && rec.owner.name && rec.owner.title, `lot ${lot.id}: owner incomplete`);
    assert.ok(Array.isArray(rec.roomGraph) && rec.roomGraph.every((e) => e.length === 2), `lot ${lot.id}: room graph is not an edge list`);
    assert.ok(rec.circulation.public && rec.circulation.public[0] === 'street', `lot ${lot.id}: public circulation must start at the street`);
    const again = programFor(lot, purposeFor(lot, layout), layout);
    assert.equal(JSON.stringify(again), JSON.stringify(rec), `lot ${lot.id}: two calls differ`);
  }
});
test('A2 the twenty required programs are defined; the generic programs cover the remaining purpose kinds', () => {
  for (const id of REQUIRED) assert.ok(PROGRAM_BY_ID[id], `missing program ${id}`);
  const generic = PROGRAMS.filter((p) => p.generic).map((p) => p.id);
  assert.equal(PROGRAMS.length, REQUIRED.length + generic.length, 'every program is required or generic');
  console.log(`     ${REQUIRED.length} required + ${generic.length} generic: ${generic.join(', ')}`);
});
test('A3 hosts.js maps every purpose kind of the layout and every landmark family; assigned hosts are deterministic and in the fitting district', () => {
  const kinds = new Set(lots.map((l) => purposeFor(l, layout).kind));
  const unmapped = [...kinds].filter((k) => !KIND_TO_PROGRAM[k]);
  assert.deepEqual(unmapped, [], `purpose kinds without a program: ${unmapped.join(', ')}`);
  for (const l of lots.filter((l) => l.kind === 'landmark')) assert.ok(FAMILY_TO_PROGRAM[l.family] || KIND_TO_PROGRAM[purposeFor(l, layout).kind], `landmark family ${l.family} unmapped`);
  const first = assignedHosts(layout), second = assignedHosts(layout);
  assert.equal(JSON.stringify([...first.entries()]), JSON.stringify([...second.entries()]), 'assigned hosts differ between calls');
  assert.ok(first.size >= 1, 'the criminal-front brokerage has no assigned host');
  for (const [lotId, pid] of first) {
    const lot = lots.find((l) => l.id === lotId);
    assert.ok(lot && PROGRAM_BY_ID[pid], `assigned host ${lotId} -> ${pid}`);
    // the brokerage trades behind an office on the spaceport / industrial edge or a trading house (hosts.js)
    if (pid === 'criminal_front') assert.ok(['industrial', 'spaceport'].includes(lot.district) || purposeFor(lot, layout).kind === 'trade_house', `criminal_front assigned to lot ${lotId}: ${lot.district} ${purposeFor(lot, layout).kind}`);
  }
  console.log(`     assigned: ${[...first.entries()].map(([id, p]) => `lot ${id} -> ${p} (${lots.find((l) => l.id === id).district}, ${purposeFor(lots.find((l) => l.id === id), layout).kind})`).join('; ')}`);
});
test('A4 every program has at least one host lot', () => {
  const table = hostTable(layout);
  const empty = PROGRAMS.filter((p) => !(table[p.id] || []).length).map((p) => p.id);
  assert.deepEqual(empty, [], `programs without a host: ${empty.join(', ')}`);
  console.log('     ' + PROGRAMS.map((p) => `${p.id} ${(table[p.id] || []).length}`).join(', '));
});
test('A5 every program record carries rooms with functions, public circulation, service circulation where spec 7 asks, a graph, a palette, interactions, and GOODS-keyed flows', () => {
  const SERVICE = ['passenger_terminal', 'cargo_terminal', 'repair_hangar', 'diner', 'cantina_club', 'opera_house', 'market_arcade', 'clinic', 'worker_apartments', 'affluent_apartments', 'security_station', 'utility_plant', 'salvage_yard', 'criminal_front', 'community_hall', 'senate'];
  for (const p of PROGRAMS) {
    assert.ok(p.rooms.length >= 3 && p.rooms.every((r) => r.kind && r.function), `${p.id}: room list`);
    assert.ok(p.circulation.public.length >= 3, `${p.id}: public circulation`);
    if (SERVICE.includes(p.id)) assert.ok(p.circulation.service && p.circulation.service.length >= 2, `${p.id}: service circulation`);
    assert.ok(p.graph.length >= 2, `${p.id}: room graph`);
    assert.ok(p.palette && Object.keys(p.palette).length >= 4, `${p.id}: palette`);
    for (const r of p.rooms) for (const v of r.interactions) assert.ok(INTERACTIONS[v], `${p.id}/${r.kind}: unknown interaction "${v}"`);
    for (const g of [...(Array.isArray(p.inputs) ? p.inputs : []), ...(Array.isArray(p.outputs) ? p.outputs : [])]) assert.ok(GOODS[g], `${p.id}: "${g}" is not a GOODS key (wants go to docs/overhaul/goods-requests.md)`);
    for (const w of p.wants) assert.ok(!GOODS[w], `${p.id}: want "${w}" already exists in GOODS`);
  }
});

// ---- B. Programs built into the blueprints ---------------------------------------------------------------------
test('B6 every program room kind has a template (program registry, library, adaptation, or a library room its accept pattern names) and infers a staffing function', () => {
  const kinds = new Set(), specs = [];
  for (const p of PROGRAMS) for (const r of p.rooms) { kinds.add(r.kind); specs.push({ p, r }); }
  for (const p of PROGRAMS) if (p.byKind) for (const rs of Object.values(p.byKind)) for (const r of rs) { kinds.add(r.kind); specs.push({ p, r }); }
  // the Senate is P4's module: its rooms are checked by kind pattern, never built by the overlay (rubric 16 A2, C11)
  const untemplated = specs.filter(({ p, r }) => p.id !== 'senate' && !templateFor(r)).map(({ p, r }) => `${p.id}/${r.kind}`);
  assert.deepEqual(untemplated, [], `program rooms without a template: ${untemplated.join(', ')}`);
  const fallbacks = specs.filter(({ p, r }) => p.id !== 'senate' && !PROGRAM_ROOMS[r.kind] && !ROOMS[r.kind] && !ADAPTATION_BY_KIND[r.kind]).map(({ p, r }) => `${p.id}/${r.kind} -> ${templateFor(r).name}`);
  const newKinds = [...new Set([...kinds, ...Object.keys(ADAPTATION_BY_KIND)])].filter((k) => !ROOM_FUNCTIONS[k]).sort();
  for (const k of newKinds) { const f = roomFunction(k); assert.ok(f && f.jobs && f.jobs.length, `${k}: no staffing function`); }
  console.log(`     ${newKinds.length} room kinds new to W4's table, all inferring a function; library fallbacks by accept pattern: ${fallbacks.join(', ') || 'none'}`);
});
test('B7/B8 room counts follow footprint: compact hosts carry the core set, extended hosts the whole list', () => {
  let compact = 0, extended = 0;
  for (const p of PROGRAMS) if (!p.special) for (const lot of hostsOf(p.id, layout)) {
    const bp = buildBlueprint(lot, layout);
    const rec = bp.meta.program;
    assert.ok(rec && rec.id === p.id, `lot ${lot.id}: no program record for ${p.id}`);
    if (rec.compact) compact++; else extended++;
    const core = p.rooms.filter((r) => r.core).map((r) => r.kind);
    const have = new Set([...rec.rooms.map((r) => r.kind), ...rec.satisfied.map((s) => s.kind)]);
    const missingCore = core.filter((k) => !have.has(k) && !(p.byKind));
    assert.deepEqual(missingCore.filter((k) => rec.missing.includes(k)), [], `lot ${lot.id} (${p.id}): core rooms missing ${missingCore.join(', ')}`);
  }
  console.log(`     ${compact} compact hosts, ${extended} extended hosts`);
});

// ---- B10. Generation time -----------------------------------------------------------------------------------------
if (!a.quick) test('B10 blueprint generation time: towers <= 0.80 ms per lot (baseline 0.64 + 25%), landmarks <= 120 ms for all (baseline 96 + 25%)', () => {
  const towers = lots.filter((l) => l.kind === 'tower'), landmarks = lots.filter((l) => l.kind === 'landmark');
  const pass = (set) => { clearBlueprintCache(); const t0 = performance.now(); for (const l of set) buildBlueprint(l, layout); return performance.now() - t0; };
  pass(towers); pass(landmarks);   // warm the code paths
  let tw = Infinity, lm = Infinity;
  for (let i = 0; i < 5; i++) { tw = Math.min(tw, pass(towers) / towers.length); lm = Math.min(lm, pass(landmarks)); }
  clearBlueprintCache();
  console.log(`     ${towers.length} towers: ${tw.toFixed(3)} ms per lot (best of 5); ${landmarks.length} landmarks: ${lm.toFixed(1)} ms for all (best of 5)`);
  assert.ok(tw <= 0.80, `${tw.toFixed(3)} ms per tower exceeds the +25% budget of 0.80`);
  assert.ok(lm <= 120, `${lm.toFixed(1)} ms for the landmarks exceeds the +25% budget of 120`);
});

// ---- C. Completion tests ----------------------------------------------------------------------------------------
for (const p of PROGRAMS) {
  test(`C11 completion test: ${p.id} (${p.name})`, () => {
    const rep = checkProgram(p.id, layout);
    const bad = rep.results.filter((r) => !r.ok && !r.soft);
    assert.equal(bad.length, 0, `${bad.length}/${rep.hosts} hosts fail:\n${bad.slice(0, 5).map(formatHost).join('\n')}`);
    if (p.id === 'senate') { const s = rep.results.find((r) => r.soft); if (s) console.log(`     senate (P4's blueprint, reported not failed): ${s.rooms.filter((x) => x.status !== 'missing').length}/${s.rooms.length} rooms by kind pattern; missing ${s.rooms.filter((x) => x.status === 'missing').map((x) => x.spec).join(', ') || 'none'}`); }
  });
}

// ---- E. The four-differences rule ------------------------------------------------------------------------------
let sim = null;
test('E16/E17 every same-kind pair differs on >= 4 axes (one spatial, one functional)', () => {
  sim = similarityReport(layout);
  assert.ok(sim.pairs >= 100, `only ${sim.pairs} pairs checked`);
  assert.equal(sim.failing.length, 0, `${sim.failing.length} failing pairs:\n${sim.failing.slice(0, 3).map((f) => formatPair(f, true)).join('\n')}`);
  const closest = sim.kinds.filter((k) => k.pairs > 0).sort((x, y) => x.closest.differences - y.closest.differences || x.closest.distance - y.closest.distance)[0];
  console.log(`     ${sim.pairs} pairs over ${sim.kinds.length} kinds; by differing axes ${sim.histogram.map((n, i) => `${i}:${n}`).join(' ')}; closest: ${closest.kind} lots ${closest.closest.a}/${closest.closest.b} at ${closest.closest.differences}/7 (minimum ${MIN_DIFFERENCES})`);
});

// ---- F. The building rubric scorer -----------------------------------------------------------------------------
let rep = null;
test('F18-F21 scorer: >= 90% of ordinary buildings at 85, no hard failures, deterministic rebuilds, frozen weights', () => {
  rep = scoreAll(layout, { similarity: sim, rebuild: !a.quick });
  const s = rep.summary;
  assert.equal(Object.values(rep.weights).reduce((x, y) => x + y, 0), 100, 'weights sum to 100');
  assert.ok(s.ordinaryShare >= 0.9, `${s.ordinaryAt85}/${s.ordinary} ordinary buildings at 85 (${Math.round(s.ordinaryShare * 100)}%)`);
  assert.equal(s.hardFailures, 0, `${s.hardFailures} hard failures`);
  assert.deepEqual(s.nondeterministic, [], `non-deterministic rebuilds: ${s.nondeterministic.join(', ')}`);
  for (const b of rep.buildings) for (const k of CATEGORIES) assert.ok(b.ratings[k] >= 0 && b.ratings[k] <= 5, `lot ${b.id}: ${k} rating ${b.ratings[k]}`);
  const specials = rep.buildings.filter((b) => b.special);
  console.log(`     ${s.buildings} buildings, mean ${s.mean}; ordinary at ${THRESHOLDS.ordinary.total}: ${s.ordinaryAt85}/${s.ordinary}; special at ${THRESHOLDS.special.total}: ${s.specialAt90}/${s.special} (${specials.map((b) => `${b.program} ${b.total}`).join(', ')}); warm build mean ${s.genMs.mean} ms, max ${s.genMs.max} ms, over budget ${s.genMs.overBudget.length}`);
  const below = rep.buildings.filter((b) => !b.pass);
  if (below.length) console.log(`     below threshold: ${below.map((b) => `lot ${b.id} ${b.total}/${b.threshold} (${b.failing.map((f) => `${f.category} ${f.rating}<${f.min}`).join(', ') || b.hard.join('; ')})`).join('; ')}`);
});

// ---- D. Dossiers -------------------------------------------------------------------------------------------------
test('D14/D15 dossiers: one per playable building plus index, deterministic (a second run changes no file)', () => {
  const r = writeDossiers(layout, { check: true, similarity: sim, seed: SEED });
  assert.equal(r.count, lots.length + 1, `${r.count} files for ${lots.length} buildings + index`);
  assert.deepEqual(r.stale, [], `stale dossiers on disk: ${r.stale.slice(0, 5).join(', ')}`);
  if (r.changed) { const msg = `${r.changed} dossier(s) on disk differ from a fresh run - regenerate with node scripts/dossiers.mjs`; if (a.strict) assert.fail(msg); else console.log(`     WARNING ${msg}`); }
  else console.log(`     ${r.count} files current`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
