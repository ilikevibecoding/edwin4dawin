// Rubric 14 (docs/rubrics/14_dialog_cast.md): persistent people, thirty distinct lines each, the thirteen-anchor cast,
// speech + subtitles.   node scripts/test-cast.mjs                       offline rows (registry, banks, selection, voice)
//                       node scripts/test-cast.mjs --url http://localhost:5321 [--shots /tmp/cast-shots]   + the CDP rows
// Offline: the registry over the real layout (A1-A6, A8), every bank's distribution / shape / distinctness / overlap /
// reachability / state guards (B1-B9, B11), the cast's bindings and cross-references (C1, C2, C4, C6), deterministic
// voices (D1), no Math.random (E2), save defaults (E3). CDP: the anchors spawn as full models at their scheduled lot,
// right-click talk with options and history, subtitles, the unvoiced manifest, the Dialogue section, persistence.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { getLayout } from '../src/coruscant/layout.js';
import { buildPool, activityAt } from '../src/npc/coruscant/census.js';
import { LotCache } from '../src/npc/coruscant/lots.js';
import { initBlocks } from '../src/blocks.js';
import { CastRegistry, STATES, PORT } from '../src/npc/cast/persistent.js';
import { ANCHORS, ANCHOR_IDS } from '../src/npc/cast/roster.js';
import { DialogAPI, eligible, VOICE_RADIUS, TALK_QUIET_RADIUS } from '../src/npc/dialog/api.js';
import { CATEGORIES, MIN_DIST, LIVE_TOKENS } from '../src/npc/dialog/bank.js';
import { CAST_LINES } from '../src/npc/dialog/castLines.js';
import { SpeechOutput } from '../src/npc/dialog/voice.js';
import { HISTORY } from '../src/npc/dialog/dialog.js';

const opt = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const base = opt('--url', null);
const shots = opt('--shots', '/tmp/cast-shots');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e.message}`); }
}
async function testAsync(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack ? e.stack.split('\n').slice(0, 3).join('\n   ') : e.message}`); }
}
const FILM_QUOTES = ['i have a bad feeling', 'may the force be with you', 'these are not the droids', 'do or do not', 'i am your father', 'it\'s a trap', 'hello there', 'i have the high ground', 'the force will be with you', 'help me obi-wan', 'never tell me the odds', 'i find your lack of faith', 'this is the way', 'i know', 'chewie, we\'re home', 'let the wookiee win', 'i\'ve got a bad feeling', 'it\'s over anakin', 'somehow palpatine returned'];

// ------------------------------------------------------------------------------------------------ offline: registry
initBlocks && initBlocks();
const layout = getLayout();
const pool = buildPool(layout);
const lots = new LotCache(layout, 64);
const t0 = performance.now();
const reg = new CastRegistry(layout, pool, lots, {});
const people = reg.list();
const anchors = ANCHOR_IDS.map((id) => reg.anchors.get(id));
console.log(`registry: ${reg.stats.anchors} anchors + ${reg.stats.staff} staff in ${reg.stats.lotsStaffed} lots, ${reg.stats.relationships} relationships, built in ${(performance.now() - t0).toFixed(0)} ms`);

test('A1 persistent staff: owner + key role per purposed lot, 600-1000 people, stable ids', () => {
  assert.equal(reg.stats.anchors, 13);
  assert.ok(reg.stats.staff >= 600 && reg.stats.staff <= 1000, `staff ${reg.stats.staff}`);
  for (const pp of people) assert.ok(/^cast:[a-z0-9_]+$/.test(pp.id) || /^lot:\d+:[a-z_]+:\d+$/.test(pp.id), pp.id);
  assert.equal(new Set(people.map((p) => p.id)).size, people.length, 'ids unique');
  // every purposed lot with a resident worker role has a persistent owner or key person
  let staffable = 0, staffed = 0;
  for (const { lot, purpose } of pool.purposed) {
    const workers = (pool.byLot.get(lot.id) || []).filter((p) => p.work === lot.id && !p.street && !p.roomStaff && !p.visitor);
    if (!workers.length) continue;
    staffable++;
    if (reg.lotRoles.has(lot.id)) staffed++;
  }
  assert.ok(staffed >= staffable * 0.98, `${staffed}/${staffable} staffable lots have persistent staff`);
  console.log(`   ${people.length} persistent people; ${staffed}/${staffable} lots with workers have an owner/key person`);
});

test('A2 every persistent person carries identity, places, schedule, state, needs, relationships, knowledge, disposition, history', () => {
  for (const pp of people) {
    assert.ok(pp.name && typeof pp.seed === 'number', pp.id);
    assert.ok(pp.lot && pp.lot.work != null && pp.lot.home != null, `${pp.id}: home ${pp.lot.home} work ${pp.lot.work}`);
    assert.ok(pp.workName && pp.homeName, pp.id);
    assert.ok(typeof activityAt(pp.person, 12).act === 'string', pp.id);
    assert.ok(Array.isArray(pp.states) && pp.states.length >= 6, pp.id);
    assert.ok(Array.isArray(pp.needs) && pp.needs.length >= 3, pp.id);
    assert.ok(Array.isArray(pp.relationships), pp.id);
    assert.ok(pp.knows && (pp.knows.district || pp.knows.port) && Array.isArray(pp.knows.broadcasts), pp.id);
    for (const k of ['warmth', 'patience', 'suspicion', 'humour']) assert.ok(pp.disposition[k] >= 0 && pp.disposition[k] <= 1, `${pp.id} ${k}`);
    assert.ok(pp.disposition.personality, pp.id);
    assert.deepEqual(Object.keys(pp.history).sort(), ['asked', 'favours', 'firstMet', 'jobs', 'lastTalkAt', 'offences', 'talks'], pp.id);
    if (pp.room) assert.ok(pp.room.kind && lots.get(pp.room.lot).meta.rooms[pp.room.index].kind === pp.room.kind, `${pp.id}: room ${pp.room.kind} not in the blueprint`);
  }
  const withRel = people.filter((p) => p.relationships.length).length;
  assert.ok(withRel >= people.length * 0.9, `${withRel}/${people.length} have a relationship`);
  console.log(`   ${withRel}/${people.length} with relationships, ${people.filter((p) => p.room).length} bound to a room, ${people.filter((p) => p.family).length} with family`);
});

test('A3 one behaviour state at a time, from the spec list, appropriate to the role (24 h x everyone)', () => {
  const seen = {};
  for (const pp of people) for (let h = 0; h < 24; h += 1) {
    const s = reg.stateOf(pp, h + 0.5);
    assert.ok(STATES.includes(s), `${pp.id} @${h}: ${s}`);
    assert.ok(pp.states.includes(s), `${pp.id} @${h}: ${s} not allowed for a ${pp.job}`);
    seen[s] = (seen[s] || 0) + 1;
  }
  for (const s of ['working', 'eating', 'resting', 'sleeping']) assert.ok(seen[s] > 0, s);
  // a fleeing / recovering person: the runtime marks the flight, the state follows for 120 s while they are live
  const pp = reg.anchors.get('tavi_renn'); reg.now = 1000;
  const scheduled = reg.stateOf(pp, 12);
  reg.onFled(pp);
  assert.equal(reg.stateOf(pp, 12), scheduled, 'no live citizen: the schedule wins');
  const citizen = { dead: false, panic: false, talkingT: 0, state: 'at', act: 'work', legs: false, pos: { x: 0, y: 0, z: 0 } };
  reg.pop = { liveByPerson: new Map([[pp.person.id, citizen]]), talkBox: { npc: null }, player: { pos: { x: 500, y: 0, z: 500 } } };
  assert.equal(reg.stateOf(pp, 12), pp.states.includes('recovering') ? 'recovering' : 'resting', 'live and just fled: recovering');
  citizen.panic = true; assert.equal(reg.stateOf(pp, 12), pp.states.includes('fleeing') ? 'fleeing' : 'commuting'); citizen.panic = false;
  reg.now = 2000; assert.equal(reg.stateOf(pp, 12), 'working', '120 s later: back to work');
  citizen.state = 'walk'; assert.equal(reg.stateOf(pp, 12), 'commuting');
  reg.pop = null; pp.fledAt = -Infinity;
  console.log('   states seen: ' + Object.entries(seen).map(([k, v]) => `${k}=${v}`).join(' '));
});

test('A4 relationships are bidirectional and grounded; the cast\'s edges resolve to real people', () => {
  let edges = 0;
  for (const pp of people) for (const r of pp.relationships) {
    const other = reg.get(r.id);
    assert.ok(other, `${pp.id} -> ${r.id} missing`);
    assert.ok(other.relationships.some((b) => b.id === pp.id), `${pp.id} -> ${r.id} has no reverse`);
    assert.ok(r.kind && r.label && r.name === other.name, `${pp.id} -> ${r.id}: ${JSON.stringify(r)}`);
    edges++;
    if (r.kind === 'coworker') assert.equal(other.lot.work, pp.lot.work, `${pp.id} coworker ${r.id} works elsewhere`);
    if (r.kind === 'neighbour') assert.equal(other.lot.home, pp.lot.home, `${pp.id} neighbour ${r.id} lives elsewhere`);
  }
  for (const a of anchors) {
    assert.ok(a.relationships.length >= 3, `${a.castId} has ${a.relationships.length} relationships`);
    for (const spec of a.relSpecs) if (typeof spec.to === 'string') assert.ok(a.relationships.some((r) => r.id === 'cast:' + spec.to), `${a.castId} -> ${spec.to} missing`);
  }
  const kinds = {};
  for (const pp of people) for (const r of pp.relationships) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  for (const k of ['coworker', 'supplier', 'customer', 'neighbour', 'family']) assert.ok(kinds[k] > 0, k);
  console.log(`   ${edges} directed edges: ` + Object.entries(kinds).map(([k, v]) => `${k}=${v}`).join(' '));
});

// a fake game whose economy records which businesses were asked about, plus one Senate result on the bus
function fakeGame(opts = {}) {
  const asked = [];
  return {
    asked,
    economy: { business: (id) => { asked.push(id); return opts.business ? opts.business(id) : null; }, shipments: () => opts.shipments || [] },
    events: { recent: () => opts.events || [], emit: () => {} },
    senate: opts.senate || null, shipTraffic: opts.shipTraffic || null, disasters: opts.disasters || null,
  };
}

test('A5 knowledge limits: own business only, broadcasts only through the broadcast list', () => {
  const g = fakeGame({ events: [{ name: 'senate:result', args: [{ scenario: { name: 'the port levy' }, outcome: 'passed' }] }] });
  const api = new DialogAPI(g, reg, null);
  const seli = reg.anchors.get('seli_noor');
  api.context(seli);
  assert.ok(g.asked.every((id) => id === seli.lot.work), `the cook asked about lots ${JSON.stringify([...new Set(g.asked)])}`);
  assert.equal(api.context(seli).senate, 'passed', 'the cook hears the Senate broadcast');
  const d4 = reg.anchors.get('d4lt');
  assert.equal(api.context(d4).senate, null, 'the plant droid has no senate broadcast');
  assert.equal(api.context(d4).senateSitting, false);
  const ilen = reg.anchors.get('ilen_rook');
  const g2 = fakeGame({ senate: { state: 'session', current: { name: 'the port levy' } } });
  const api2 = new DialogAPI(g2, reg, null);
  assert.equal(api2.context(ilen).senateSitting, true, 'the clerk knows the chamber sits');
  assert.equal(api2.context(seli).senateSitting, false, 'the cook does not');
});

test('A6 / E3 interaction history round-trips through serialize()/restore(); defaults for empty and bad saves', () => {
  const r2 = new CastRegistry(layout, buildPool(layout), lots, {});
  const vela = r2.anchors.get('vela_marr'), staff = r2.list((p) => p.kind === 'staff')[3];
  r2.now = 300; r2.recordTalk(vela); r2.recordTalk(vela, 'work'); r2.recordJob('cast:vela_marr'); r2.recordFavour(staff); r2.recordOffence(staff.id);
  const data = r2.serialize();
  assert.deepEqual(Object.keys(data).sort(), ['history', 'seed', 'v']);
  assert.equal(Object.keys(data.history).length, 2, 'only touched people are written');
  const r3 = new CastRegistry(layout, buildPool(layout), lots, {});
  assert.equal(r3.restore(JSON.parse(JSON.stringify(data))), true);
  assert.deepEqual(r3.anchors.get('vela_marr').history, vela.history);
  assert.deepEqual(r3.get(staff.id).history, staff.history);
  assert.equal(r3.get(staff.id).history.favours, 1); assert.equal(r3.get(staff.id).history.offences, 1);
  const r4 = new CastRegistry(layout, buildPool(layout), lots, {});
  assert.equal(r4.restore(null), false); assert.equal(r4.restore({}), false); assert.equal(r4.restore({ history: 'x' }), false);
  assert.equal(r4.restore({ v: 1, history: {} }), true);
  assert.equal(r4.anchors.get('vela_marr').history.talks, 0, 'defaults');
  assert.equal(r4.restore({ v: 1, history: { 'cast:brin_tal': { talks: -4, jobs: 'x', firstMet: 'bad' } } }), true);
  assert.deepEqual(r4.anchors.get('brin_tal').history, { firstMet: null, talks: 0, jobs: 0, favours: 0, offences: 0, lastTalkAt: null, asked: {} }, 'sanitised');
});

test('A8 every anchor has a real place for every hour of the day (reconciles off-screen)', () => {
  for (const a of anchors) {
    const acts = new Set();
    for (let h = 0; h < 24; h += 0.5) {
      const act = activityAt(a.person, h);
      acts.add(act.act);
      assert.ok(act.lot === PORT || (Number.isInteger(act.lot) && layout.lots[act.lot]), `${a.castId} @${h}: lot ${act.lot}`);
      assert.ok(reg.positionOf(a, h), `${a.castId} @${h}: no position`);
    }
    assert.ok(acts.has('work') && (acts.has('sleep') || acts.has('home')), `${a.castId}: ${[...acts]}`);
  }
  const near = reg.nearby({ x: 2646, z: 0 }, 60);
  assert.ok(near.some((n) => n.id === 'cast:vela_marr'), 'the dockmaster is near the port at noon');
  assert.ok(near.every((n) => typeof n.dist === 'number' && n.state), JSON.stringify(near[0]));
});

// ------------------------------------------------------------------------------------------------ offline: banks
const api = new DialogAPI(fakeGame(), reg, null);
const banks = new Map();
const tb = performance.now();
for (const pp of people) banks.set(pp.id, api.bankFor(pp));
const allLines = [...banks.values()].flat();
console.log(`banks: ${banks.size} people, ${allLines.length} lines, composed in ${(performance.now() - tb).toFixed(0)} ms`);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

test('B1 >= 30 lines per person with the minimum distribution; anchors >= 40', () => {
  let min = Infinity, castMin = Infinity;
  for (const pp of people) {
    const bank = banks.get(pp.id);
    const per = {};
    for (const l of bank) per[l.cat] = (per[l.cat] || 0) + 1;
    for (const c of CATEGORIES) assert.ok((per[c] || 0) >= MIN_DIST[c], `${pp.id}: ${c} ${per[c] || 0} < ${MIN_DIST[c]}`);
    assert.ok(bank.length >= 30, `${pp.id}: ${bank.length} lines`);
    if (pp.kind === 'cast') { assert.ok(bank.length >= 40, `${pp.id}: ${bank.length} lines`); castMin = Math.min(castMin, bank.length); }
    else min = Math.min(min, bank.length);
  }
  console.log(`   staff banks >= ${min} lines, cast banks >= ${castMin} lines`);
});

test('B2 line shape { id, speaker, text, delivery, trigger, priority, cooldown, refs, audio }; ids unique and stable', () => {
  const ids = new Set();
  for (const l of allLines) {
    for (const k of ['id', 'speaker', 'text', 'delivery', 'trigger', 'priority', 'cooldown', 'refs', 'audio']) assert.ok(l[k] !== undefined && l[k] !== null, `${l.id}: missing ${k}`);
    assert.ok(!ids.has(l.id), `duplicate id ${l.id}`); ids.add(l.id);
    assert.ok(l.id.startsWith(l.speaker + '#'), l.id);
    assert.ok(CATEGORIES.includes(l.cat) && (CATEGORIES.includes(l.trigger) || l.trigger === 'interrupt'), l.id);
    assert.ok(l.priority >= 1 && l.cooldown >= 10, l.id);
    assert.ok(typeof l.audio.voiced === 'boolean' && l.audio.key === l.id, l.id);
    assert.ok(l.text.length >= 20 && l.text.length <= 220, `${l.id}: ${l.text.length} chars`);
  }
  // stable across runs: a second API over a second registry composes the same ids and texts
  const api2 = new DialogAPI(fakeGame(), new CastRegistry(layout, buildPool(layout), lots, {}), null);
  for (const id of ['cast:vela_marr', 'cast:d4lt', people[40].id, people[400].id]) {
    const a = banks.get(id), b = api2.bankFor(id);
    assert.deepEqual(b.map((l) => l.id + '|' + l.text), a.map((l) => l.id + '|' + l.text), id);
  }
});

// bag distance (a lower bound of Levenshtein) prunes the pairs that are obviously far apart
function bagDistance(a, b) {
  const m = new Map();
  for (const ch of a) m.set(ch, (m.get(ch) || 0) + 1);
  let onlyA = 0, onlyB = 0;
  for (const ch of b) { const c = m.get(ch) || 0; if (c > 0) m.set(ch, c - 1); else onlyB++; }
  for (const v of m.values()) onlyA += v;
  return Math.max(onlyA, onlyB);
}
function levenshtein(a, b) {
  if (a === b) return 0;
  const n = a.length, m = b.length;
  let prev = new Array(m + 1), cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) { const cost = ca === b.charCodeAt(j - 1) ? 0 : 1; cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost); }
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}
test('B3 within one person every pair of lines is distinct (normalised Levenshtein >= 0.35)', () => {
  let worst = 1, worstPair = null, pairs = 0, computed = 0;
  for (const [id, bank] of banks) {
    const texts = bank.map((l) => norm(l.text));
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      pairs++;
      const a = texts[i], b = texts[j], L = Math.max(a.length, b.length);
      if (bagDistance(a, b) / L >= 0.35) continue;
      computed++;
      const d = levenshtein(a, b) / L;
      if (d < worst) { worst = d; worstPair = [bank[i].id, bank[j].id]; }
      assert.ok(d >= 0.35, `${id}: ${d.toFixed(2)} between\n     ${bank[i].text}\n     ${bank[j].text}`);
    }
  }
  console.log(`   ${pairs} pairs (${computed} needed the full distance), closest ${worst.toFixed(3)} ${JSON.stringify(worstPair)}`);
});

test('B4 >= 50% of each person\'s lines appear verbatim in nobody else\'s bank', () => {
  const owners = new Map();
  for (const [id, bank] of banks) for (const l of bank) { const t = norm(l.text); if (!owners.has(t)) owners.set(t, new Set()); owners.get(t).add(id); }
  let worst = 1, worstId = null;
  for (const [id, bank] of banks) {
    const unique = bank.filter((l) => owners.get(norm(l.text)).size === 1).length;
    const share = unique / bank.length;
    if (share < worst) { worst = share; worstId = id; }
    assert.ok(share >= 0.5, `${id}: ${unique}/${bank.length} unique`);
  }
  console.log(`   least unique bank ${worstId}: ${(worst * 100).toFixed(0)}% of its lines appear nowhere else`);
});

test('B5 greetings tell a first meeting, a return and a completed job apart', () => {
  for (const pp of [reg.anchors.get('vela_marr'), reg.anchors.get('koro_den'), people[60], people[500]]) {
    const bank = banks.get(pp.id);
    const greet = bank.filter((l) => l.trigger === 'greet');
    const first = greet.filter((l) => eligible(l, { talks: 0, jobsDone: 0, period: 'noon', standing: 'neutral', offences: 0, open: true, events: [] }));
    const back = greet.filter((l) => eligible(l, { talks: 3, jobsDone: 0, period: 'noon', standing: 'neutral', offences: 0, open: true, events: [] }));
    const after = greet.filter((l) => eligible(l, { talks: 3, jobsDone: 1, period: 'noon', standing: 'trusted', offences: 0, open: true, events: [] }));
    assert.ok(first.some((l) => l.when && l.when.met === 'first'), `${pp.id}: no first-meeting greeting`);
    assert.ok(back.some((l) => l.when && l.when.met === 'returning'), `${pp.id}: no returning greeting`);
    assert.ok(after.some((l) => l.when && l.when.met === 'afterJob'), `${pp.id}: no after-job greeting`);
    assert.ok(!back.some((l) => l.when && l.when.met === 'first'), `${pp.id}: a first-meeting line for a returning visitor`);
    assert.ok(!first.some((l) => l.when && l.when.met === 'afterJob'), `${pp.id}: an after-job line at first meeting`);
  }
});

test('B6 work lines are filled with real names and job vocabulary; no unfilled static slots', () => {
  let named = 0, work = 0;
  for (const pp of people) {
    const bank = banks.get(pp.id);
    for (const l of bank) {
      const left = (l.text.match(/\{(\w+)\}/g) || []).map((m) => m.slice(1, -1));
      for (const k of left) assert.ok(LIVE_TOKENS.has(k), `${l.id}: unfilled {${k}} in: ${l.text}`);
      if (l.cat === 'work') { work++; if (l.text.includes(pp.workName) || (pp.lot.work === PORT && /Westport|deck|pad/.test(l.text))) named++; }
    }
  }
  assert.ok(named / work >= 0.5, `${named}/${work} work lines name the workplace`);
  console.log(`   ${named}/${work} work lines name the workplace`);
});

// claims about checkable state (a shortage, a shipment, a vote, a disaster); "on your way out of Bacta & Sundries" is a lot name, not a claim
const CLAIMS = /\b((we are|we're|i am|i'm|is|are|been|ran|run|running|clean|fresh) out of (stock|bacta|stew|relays|parts|supplies|goods|everything)|shipment is late|late shipment|delivery is late|nothing left to sell|the vote (passed|failed|carried)|the proposal (passed|failed)|(passed|failed) in the chamber|is flooding|flood(ed|ing) the|the tornado|beam is)\b/i;
test('B7 state claims are guarded: shortage / shipment / Senate / disaster lines need the state; rumours are marked', () => {
  const guardKeys = ['stock', 'waiting', 'shipment', 'senate', 'senateSitting', 'disaster', 'recovering', 'event', 'shipOnPad', 'ownShip'];
  let guarded = 0;
  for (const l of allLines) {
    if (!CLAIMS.test(l.text)) continue;
    const ok = (l.when && guardKeys.some((k) => l.when[k] !== undefined)) || l.rumor;
    assert.ok(ok, `${l.id} claims state without a guard: ${l.text}`);
    guarded++;
  }
  // the guards hold: a shortage line is ineligible with stock fine, a Senate line without a result
  const ctxFine = { talks: 1, jobsDone: 0, period: 'noon', stock: 'ok', waiting: false, shipment: null, senate: null, senateSitting: false, disaster: null, recovering: false, standing: 'neutral', offences: 0, open: true, events: [], shipOnPad: false, ownShip: 'onPad', job: 'none', quiet: true, trainsOk: true, act: 'work' };
  let shortage = 0, senate = 0;
  for (const l of allLines) {
    if (l.when && (l.when.stock === 'out' || l.when.stock === 'low' || l.when.waiting === true)) { shortage++; assert.equal(eligible(l, ctxFine), false, `${l.id} eligible with stock ok`); assert.equal(eligible(l, { ...ctxFine, stock: l.when.stock || 'out', waiting: true }), true, `${l.id} not eligible when the shortage is real`); }
    if (l.when && l.when.senate) { senate++; assert.equal(eligible(l, ctxFine), false, `${l.id} eligible without a Senate result`); assert.equal(eligible(l, { ...ctxFine, senate: l.when.senate }), true, l.id); }
    if (l.when && l.when.disaster === true) assert.equal(eligible(l, ctxFine), false, `${l.id} eligible without a disaster`);
    if (l.rumor) assert.ok(/hear|heard|say|says|said|told me|\bword\b.{0,24}\bis\b|rumour|rumor|apparently|they tell me|the story|supposedly|talk is|there is talk|talk that|so I'm told|so they say|goes the/i.test(l.text), `${l.id} rumour without hedging: ${l.text}`);
  }
  assert.ok(shortage > 500 && senate > 500, `shortage ${shortage} senate ${senate}`);
  console.log(`   ${guarded} explicit claims guarded, ${shortage} shortage lines, ${senate} Senate lines, ${allLines.filter((l) => l.rumor).length} rumours`);
});

// a context that satisfies `when` within the person's knowledge, or null when the conditions contradict each other
function reachCtx(pp, w) {
  const c = { talks: 1, jobsDone: 0, period: 'noon', stock: 'ok', waiting: false, shipment: null, senate: null, senateSitting: false, disaster: null, recovering: false, standing: 'neutral', offences: 0, open: true, events: [], shipOnPad: false, ownShip: null, job: 'none', quiet: true, trainsOk: true, poke: false, act: 'work' };
  if (!w) return c;
  const knows = pp.knows, bc = knows.broadcasts || [];
  const hasBusiness = knows.business != null || (pp.lot.work !== PORT && reg.purposeOf.has(pp.lot.work));
  for (const [k, v] of Object.entries(w)) {
    switch (k) {
      case 'met': if (v === 'first') { c.talks = 0; c.jobsDone = 0; } else if (v === 'returning') c.talks = 2; else c.jobsDone = Math.max(1, c.jobsDone); break;
      case 'period': c.period = v[0]; break;
      case 'stock': if (!hasBusiness) return null; c.stock = v; if (v === 'out') c.waiting = true; break;
      case 'waiting': if (v && !hasBusiness) return null; c.waiting = v; break;
      case 'shipment': if (!hasBusiness) return null; c.shipment = v; break;
      case 'senate': if (!bc.includes('senate:result')) return null; c.senate = v; c.quiet = false; break;
      case 'senateSitting': if (v && !knows.senate) return null; c.senateSitting = v; if (v) c.quiet = false; break;
      case 'disaster': if (v && !bc.includes('disaster')) return null; c.disaster = v ? 'flood' : null; if (v) { c.quiet = false; c.trainsOk = false; } break;
      case 'recovering': if (v && !bc.includes('disaster')) return null; c.recovering = v; if (v) c.quiet = false; break;
      case 'standing': c.standing = Array.isArray(v) ? v[0] : v; if (c.standing === 'suspect') c.offences = Math.max(1, c.offences); if (c.standing === 'trusted') c.jobsDone = Math.max(2, c.jobsDone); break;
      case 'offences': c.offences = v === '>1' ? 2 : v === '>0' ? 1 : typeof v === 'number' ? v : 0; if (c.offences > 0 && c.standing === 'neutral') c.standing = 'suspect'; break;
      case 'jobsDone': c.jobsDone = /^>/.test(String(v)) ? +String(v).replace(/[^\d]/g, '') + 1 : +String(v).replace(/[^\d]/g, ''); break;
      case 'job': c.job = v; break;
      case 'open': c.open = v; break;
      case 'shipOnPad': if (!(pp.district === 'spaceport' || knows.port)) return null; c.shipOnPad = v; break;
      case 'ownShip': if (!pp.ship) return null; c.ownShip = v; break;
      case 'event': if (!(knows.district || pp.district === 'spaceport')) return null; c.events = [v]; c.quiet = false; break;
      case 'quiet': c.quiet = v; if (!v && !c.events.length && !c.senate) c.events = ['event:x']; break;
      case 'trainsOk': c.trainsOk = v; break;
      case 'poke': c.poke = v; break;
      case 'act': c.act = v; break;
      case 'role': break;
      default: return null;
    }
  }
  // the derived facts stay consistent with the scenario
  if (c.stock === 'ok' && c.waiting === false && c.shipment === null) c.stock = w.stock || 'ok';
  return c;
}
test('B8 every line is reachable: a consistent scenario within the person\'s knowledge makes it eligible', () => {
  let n = 0;
  for (const pp of people) for (const l of banks.get(pp.id)) {
    const c = reachCtx(pp, l.when);
    assert.ok(c, `${l.id}: conditions ${JSON.stringify(l.when)} cannot hold for ${pp.job} (${JSON.stringify(pp.knows)})`);
    assert.ok(eligible(l, c), `${l.id}: not eligible in its own scenario ${JSON.stringify(l.when)} -> ${JSON.stringify(c)}`);
    n++;
  }
  console.log(`   ${n} lines reachable`);
});

test('B9 selection: eligibility, no repeat within the last 5, cooldowns, priority, deterministic', () => {
  const mk = () => new DialogAPI(fakeGame(), new CastRegistry(layout, buildPool(layout), lots, {}), null);
  const a1 = mk(), a2 = mk();
  const seq = (a, id, n, partial) => { const out = []; for (let i = 0; i < n; i++) { a.update(i * 3); const l = a.lineFor(id, partial); assert.ok(l, `${id}: no line at step ${i}`); a.say(id, l, { bubble: false }); out.push(l.id); } return out; };
  const s1 = seq(a1, 'cast:seli_noor', 40, { cats: ['work', 'personal', 'event', 'trust', 'task'] }), s2 = seq(a2, 'cast:seli_noor', 40, { cats: ['work', 'personal', 'event', 'trust', 'task'] });
  assert.deepEqual(s1, s2, 'deterministic');
  for (let i = 0; i < s1.length; i++) for (let j = Math.max(0, i - HISTORY); j < i; j++) assert.notEqual(s1[i], s1[j], `repeat within ${HISTORY} at ${i}`);
  assert.ok(new Set(s1).size >= 15, `only ${new Set(s1).size} distinct lines in 40 picks`);
  // eligibility: nothing a first-time visitor should not hear, nothing with unmet state
  const a3 = mk();
  for (let i = 0; i < 20; i++) { const l = a3.lineFor('cast:tessa_venn', { ambient: true }); assert.ok(!(l.when && (l.when.met || l.when.stock === 'out' || l.when.senate || l.when.disaster)), `${l.id} ${JSON.stringify(l.when)}`); a3.say('cast:tessa_venn', l, { bubble: false }); }
  // cooldown: a line just said is not picked again while alternatives exist
  const a4 = mk(); a4.update(0);
  const g0 = a4.lineFor('cast:vela_marr', { trigger: 'greet' }); a4.say('cast:vela_marr', g0, { bubble: false });
  a4.update(30);
  const g1 = a4.lineFor('cast:vela_marr', { trigger: 'greet' });
  assert.notEqual(g1.id, g0.id, 'cooldown / recent');
  // priority: with a Senate result on the bus, the event line (priority 4) beats work (2) and personal (1)
  const g = fakeGame({ events: [{ name: 'senate:result', args: [{ scenario: { name: 'the port levy' }, outcome: 'failed' }] }] });
  const a5 = new DialogAPI(g, reg, null);
  const l5 = a5.lineFor('cast:ilen_rook', { cats: ['work', 'personal', 'event'] });
  assert.equal(l5.cat, 'event', `${l5.id}`); assert.equal(l5.when && l5.when.senate, 'failed', l5.id);
  const rendered = a5.render('cast:ilen_rook', l5);
  assert.ok(!/\{\w+\}/.test(rendered) && rendered.includes('port levy') === l5.text.includes('{senateScenario}'), rendered);
});

test('B10 local audio budget: one voice within 24 blocks; an open talk box silences chatter within 16', () => {
  const live = new Map();
  const pop = { liveByPerson: live, hour: 12, talkBox: { npc: null }, bubbles: { say() {} }, time: 0, player: { pos: { x: 0, y: 0, z: 0 } } };
  const r = new CastRegistry(layout, buildPool(layout), lots, { pop });
  const a = new DialogAPI(fakeGame(), r, pop);
  // pretend a speech engine with one voice exists (Node has neither)
  const utterances = [];
  a.speech.synth = { speak(u) { utterances.push(u); }, cancel() {}, getVoices: () => [] }; a.speech.voices = [{ name: 'Test Voice', lang: 'en-GB' }];
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; this.voice = null; this.pitch = 1; this.rate = 1; this.volume = 1; } };
  try {
  const p1 = r.anchors.get('seli_noor'), p2 = r.anchors.get('d4lt'), p3 = r.anchors.get('vela_marr');
  const npcOf = (pp, x, z) => { const n = { id: pp.personId, person: pp.person, pos: { x, y: 61, z }, dead: false, talkingT: 0 }; live.set(pp.personId, n); return n; };
  const n1 = npcOf(p1, 0, 0), n2 = npcOf(p2, 10, 0), n3 = npcOf(p3, 100, 0);
  a.update(0);
  const s1 = a.say(p1, a.lineFor(p1, { ambient: true }), { npc: n1, ambient: true });
  assert.equal(s1.voiced, true, 'first speaker voiced');
  const s2 = a.say(p2, a.lineFor(p2, { ambient: true }), { npc: n2, ambient: true });
  assert.equal(s2.voiced, false, 'a second voice within 24 blocks is text-only'); assert.equal(s2.budgeted, true);
  const s3 = a.say(p3, a.lineFor(p3, { ambient: true }), { npc: n3, ambient: true });
  assert.equal(s3.voiced, true, '100 blocks away: its own voice');
  const s4 = a.say(p2, a.lineFor(p2, { ambient: true }), { npc: n2, important: true });
  assert.equal(s4.voiced, true, 'a talk-box line is always voiced');
  a.update(60);
  const s6 = a.say(p2, a.lineFor(p2, { ambient: true }), { npc: n2, ambient: true });
  assert.equal(s6.voiced, true, 'budget frees when the first line ends');
  assert.equal(a.speech.spoken, 4); assert.equal(a.unvoiced.length, 0);
  assert.equal(utterances.length, 4, 'four utterances reached the engine');
  const u0 = utterances[0], vp = a.speech.voiceParams(p1);
  assert.ok(u0.text === s1.text && u0.pitch === vp.pitch && u0.rate === vp.rate && u0.volume === a.settings.volume && u0.voice.name === 'Test Voice', JSON.stringify({ u0, vp }));
  assert.ok(utterances[2].pitch !== u0.pitch || utterances[2].rate !== u0.rate, 'two speakers, two voices');
  // the subtitle of a voiced line outlives the text estimate until the engine says the utterance ended
  const last = utterances[3], cur = a.speech.current, nowS = () => performance.now() / 1000;
  assert.ok(cur && cur.text === last.text && cur.until > nowS() + s6.duration + 3, `subtitle waits for the engine: ${JSON.stringify(cur)}`);
  assert.equal(typeof last.onend, 'function'); last.onend();
  assert.ok(cur.until <= nowS() + 0.41 && cur.until > nowS(), 'the subtitle winds down 0.4 s after the utterance ends');
  pop.talkBox.npc = n1;
  assert.equal(a.allowChatter(n2), false, 'talk box 10 blocks away silences chatter');
  assert.equal(a.allowChatter(n3), true, 'talk box 100 blocks away does not');
  assert.equal(a.allowChatter(n1), false, 'the person in the talk box does not chatter: their lines come through the box');
  pop.talkBox.npc = null; assert.equal(a.allowChatter(n1), true, 'box closed: chatter again');
  assert.equal(VOICE_RADIUS, 24); assert.equal(TALK_QUIET_RADIUS, 16);
  // voice off: text only, nothing reaches the engine, nothing in the manifest either (it was a choice, not a gap)
  a.speech.setSetting('voice', false); a.update(120);
  const s5 = a.say(p1, a.lineFor(p1, { ambient: true }), { npc: n1, ambient: true });
  assert.equal(s5.voiced, false); assert.equal(utterances.length, 4); assert.equal(a.unvoiced.length, 0); assert.equal(a.speech.report().textOnly, true);
  } finally { delete globalThis.SpeechSynthesisUtterance; }
});

test('B11 no film quotes in any bank', () => {
  // a two-word quote ("I know", "Hello there") is only the quote when it is the whole sentence
  const short = FILM_QUOTES.filter((q) => q.split(' ').length <= 2), long = FILM_QUOTES.filter((q) => q.split(' ').length > 2);
  for (const l of allLines) {
    const low = norm(l.text);
    for (const q of long) assert.ok(!low.includes(norm(q)), `${l.id}: "${q}" in: ${l.text}`);
    const sentences = l.text.split(/[.!?;:]+/).map(norm).filter(Boolean);
    for (const q of short) assert.ok(!sentences.includes(norm(q)), `${l.id}: "${q}" in: ${l.text}`);
  }
});

// ------------------------------------------------------------------------------------------------ offline: the cast
test('C1 / C2 the thirteen anchors with the spec\'s roles, bound to real lots / rooms / the ship', () => {
  const kindOf = (lotId) => (lotId === PORT ? 'port' : (reg.purposeOf.get(lotId) || {}).kind || layout.lots[lotId].kind);
  const familyOf = (lotId) => (lotId === PORT ? null : layout.lots[lotId].family);
  const want = { vela_marr: 'port', brin_tal: 'port', tessa_venn: 'repair_shop', d4lt: 'power_plant', seli_noor: 'diner', nera_vos: 'clinic', tavi_renn: 'transit_station', koro_den: 'recycling_plant', mira_sol: 'apartments', ral_drenn: 'depot' };
  for (const [id, kind] of Object.entries(want)) assert.equal(kindOf(reg.anchors.get(id).lot.work), kind, id);
  for (const id of ['ilen_rook', 'asha_merin', 'seran_vale']) assert.equal(familyOf(reg.anchors.get(id).lot.work), 'senate', id);
  assert.equal(familyOf(reg.anchors.get('seran_vale').lot.home), 'temple', 'Seran lives at the Temple');
  assert.equal(reg.anchors.get('asha_merin').delegation, 0);
  assert.equal(reg.anchors.get('vela_marr').spot, 'control');
  assert.deepEqual(reg.anchors.get('brin_tal').ship, { model: 'light_freighter', pad: 7, padNumber: 8 });
  assert.equal(reg.anchors.get('d4lt').droid, true); assert.equal(reg.anchors.get('d4lt').person.droid, true);
  assert.equal(reg.anchors.get('mira_sol').lot.work, reg.anchors.get('tavi_renn').lot.home, 'Mira keeps the garden of Tavi\'s block');
  assert.equal(reg.anchors.get('koro_den').lot.meal, reg.anchors.get('seli_noor').lot.work, 'Koro eats at Seli\'s');
  for (const a of anchors) {
    assert.equal(a.person.cast, a.castId); assert.equal(a.person.name, a.name);
    if (a.lot.work !== PORT) { assert.ok(a.room, `${a.castId} has no room`); assert.equal(lots.get(a.lot.work).meta.rooms[a.room.index].kind, a.room.kind, a.castId); }
    for (const [k, v] of Object.entries(ANCHORS.find((x) => x.id === a.castId).appearance)) if (k !== 'archetype') assert.equal(a.appearance[k], v, `${a.castId} ${k}`);
  }
  console.log('   ' + anchors.map((a) => `${a.castId}@${a.workName}${a.room ? '/' + a.room.kind : ''}`).join(', '));
});

test('C4 schedules: one activity per hour, W4\'s clock; Seran Vale alternates Temple and Senate', () => {
  const seran = reg.anchors.get('seran_vale');
  const temple = seran.lot.home, senate = seran.lot.work;
  const lotsSeen = new Set();
  for (let h = 0; h < 24; h += 0.25) lotsSeen.add(activityAt(seran.person, h).lot);
  assert.ok(lotsSeen.has(temple) && lotsSeen.has(senate), `Seran: ${[...lotsSeen]}`);
  for (const a of anchors) {
    let changes = 0, prev = null;
    for (let h = 0; h < 24; h += 0.25) { const act = activityAt(a.person, h); const key = act.act + ':' + act.lot; if (key !== prev) { changes++; prev = key; } }
    assert.ok(changes >= 3 && changes <= 10, `${a.castId}: ${changes} activity changes a day`);
  }
});

test('C6 the cast\'s lines name each other and the shared state', () => {
  const names = Object.fromEntries(ANCHORS.map((a) => [a.id, a.name.replace(/^Dr /, '')]));
  const mentions = {};
  for (const a of anchors) {
    const rows = CAST_LINES[a.castId];
    assert.ok(rows && rows.length >= 40, `${a.castId}: ${rows ? rows.length : 0} handwritten lines`);
    const text = rows.map((r) => r[1]).join('\n');
    const others = ANCHOR_IDS.filter((id) => id !== a.castId && text.includes(names[id]));
    assert.ok(others.length >= 2, `${a.castId} names only ${others}`);
    mentions[a.castId] = others.length;
  }
  const shared = { vela_marr: /customs/i, brin_tal: /bill|coolant/i, tessa_venn: /bill|plant (part|relay)/i, d4lt: /7-Besh|authoris/i, seli_noor: /regular/i, nera_vos: /bacta|customs/i, ilen_rook: /committee/i, asha_merin: /proposal|bill/i, seran_vale: /manifest|diverted|disruption|relay/i, tavi_renn: /lift|train/i, koro_den: /gang|gate/i, mira_sol: /planter|lift|notice/i, ral_drenn: /respectable/i };
  for (const [id, re] of Object.entries(shared)) assert.ok(re.test(CAST_LINES[id].map((r) => r[1]).join('\n')), `${id}: no ${re}`);
  const bank = banks.get('cast:seli_noor');
  assert.ok(bank.some((l) => l.refs.cast && l.refs.cast.includes('d4lt')), 'Seli\'s lines carry refs.cast for D4-LT');
  console.log('   cross-references per anchor: ' + Object.entries(mentions).map(([k, v]) => `${k}=${v}`).join(' '));
});

// ------------------------------------------------------------------------------------------------ offline: voice
test('D1 deterministic per-person voice parameters; droids clipped', () => {
  const s1 = new SpeechOutput(null), s2 = new SpeechOutput(null);
  for (const pp of [...anchors, people[100], people[300], people[700]]) {
    const a = s1.voiceParams(pp), b = s2.voiceParams(pp);
    assert.deepEqual(a, b, pp.id);
    assert.ok(a.pitch >= 0.5 && a.pitch <= 2 && a.rate >= 0.6 && a.rate <= 1.6, `${pp.id}: ${JSON.stringify(a)}`);
    assert.equal(a.droid, !!pp.droid, pp.id);
  }
  const d4 = s1.voiceParams(reg.anchors.get('d4lt')), vela = s1.voiceParams(reg.anchors.get('vela_marr'));
  assert.ok(d4.pitch >= 1.4 && d4.rate >= 1.1, 'droid: high and quick');
  assert.notDeepEqual(s1.voiceParams(people[100]), s1.voiceParams(people[101]), 'two people, two voices');
  assert.equal(vela.pitch, 1.04, 'Vela\'s voice is a fixed point of the seed (human range from her seed + the female offset): a change here changes every voice in the city');
  const r = s1.report();
  assert.equal(r.textOnly, true); assert.equal(r.speechApi, false);
  s1.say(reg.anchors.get('vela_marr'), 'Test line.', { lineId: 'x#greet0' });
  assert.equal(s1.unvoiced.length, 1); assert.equal(s1.unvoiced[0].reason, 'no-speech-api'); assert.equal(s1.shown, 1);
  assert.equal(s1.setSetting('volume', 2), true); assert.equal(s1.settings.volume, 1);
  assert.equal(s1.setSetting('nonsense', 1), false);
});

test('E2 no Math.random in the cast / dialog modules', () => {
  for (const dir of ['src/npc/cast', 'src/npc/dialog']) for (const f of readdirSync(new URL('../' + dir, import.meta.url))) {
    const src = readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');   // comments may mention it
    assert.ok(!/Math\.random/.test(src), `${dir}/${f} uses Math.random`);
  }
});

// ------------------------------------------------------------------------------------------------ CDP rows
if (base) {
  const { launchPage } = await import('./cdp.mjs');
  mkdirSync(shots, { recursive: true });
  // in front of Seli Noor's diner in the Works (her lobby atrium is on the ground floor)
  const seli = reg.anchors.get('seli_noor');
  const lot = layout.lots[seli.lot.work];
  const door = lots.get(lot.id).entrances()[0];
  const startUrl = `${base}/?x=${door.out.x + 4}&z=${door.out.z}&y=${door.out.y}&yaw=1.5708&time=0.5&fresh=1&mode=creative&quality=light&rd=4`;
  console.log(`launching ${startUrl}`);
  const profile = `/tmp/chrome-cast-${process.pid}`;
  let page = await launchPage(startUrl, { profile });
  const ev = (js) => page.evaluate(js);
  const evj = async (js) => JSON.parse(await ev(`(async () => { const r = await (${js}); return JSON.stringify(r === undefined ? null : r); })()`));
  const HELPERS = `window.__t = {
    frame: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    frames: async (n) => { for (let i = 0; i < n; i++) await window.__t.frame(); },
    play() { game.input.locked = true; if (game.hud.screen) game.hud.screen = null; },
    async click(button) { window.__t.play(); await window.__t.frame(); game.input.mouseClicked[button] = true; game.input.mouseDown[button] = true; await window.__t.frame(); game.input.mouseDown[button] = false; await window.__t.frame(); },
    aimAt(x, y, z) { const p = game.player, eye = p.eyePos(1, new (game.camera.position.constructor)()); const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
    key(code, key) { document.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true })); },
    sub() { const el = document.getElementById('npc-subtitles'); return el ? { shown: el.style.display !== 'none', name: el.querySelector('#npc-subtitles-name').textContent, text: el.querySelector('#npc-subtitles-text').textContent, mode: el.querySelector('#npc-subtitles-mode').textContent, bottom: el.style.bottom, top: Math.round(el.getBoundingClientRect().top), boxTop: (() => { const b = document.getElementById('npc-talk'); return b && !b.hidden ? Math.round(b.getBoundingClientRect().top) : null; })() } : null; },
    // a software-rendered frame takes seconds here: keep the current subtitle up so the screenshots show it
    pin() { const c = game.dialog.speech.current; if (c) c.until += 120; },
    // the npc:talk event of a line by its text (ambient chatter from others may follow it on the bus)
    said(text) { const e = game.events.recent('npc:talk', 30).reverse().find((e) => e.args[0].text === text); return e ? { ...e.args[0], seq: e.seq } : null; },
    talk() { const r = document.getElementById('npc-talk'); return r ? { hidden: r.hidden, name: r.querySelector('.nt-name').textContent, role: r.querySelector('.nt-role').textContent, line: r.querySelector('.nt-line').textContent, opts: [...r.querySelectorAll('button')].map((b) => b.textContent.slice(1)) } : null; },
    // stand next to a live citizen with a clear line to their chest and aim at them
    approach(castId) {
      const n = game.coruscant.population.live.find((n) => n.person.cast === castId); if (!n) return null;
      const w = game.world, solid = (x, y, z) => w.getBlockDef(x, y, z).solid, h = n.box.y1 - n.box.y0;
      for (let k = 0; k < 16; k++) for (const r of [1.6, 2.2, 2.8]) {
        const ang = k * Math.PI / 8, tx = n.pos.x + Math.sin(ang) * r, tz = n.pos.z + Math.cos(ang) * r, cx = Math.floor(tx), cz = Math.floor(tz), cy = Math.round(n.pos.y);
        if (solid(cx, cy, cz) || solid(cx, cy + 1, cz) || !solid(cx, cy - 1, cz)) continue;
        const ex = tx, ey = cy + 1.62, ez = tz, dx = n.pos.x - ex, dy = n.pos.y + h * 0.6 - ey, dz = n.pos.z - ez, d = Math.hypot(dx, dy, dz);
        let clear = true;
        for (let t = 0.1; t < d - 0.25; t += 0.1) if (solid(Math.floor(ex + dx / d * t), Math.floor(ey + dy / d * t), Math.floor(ez + dz / d * t))) { clear = false; break; }
        if (!clear) continue;
        game.player.flying = false; game.player.teleport(tx, cy, tz); window.__t.play(); window.__t.aimAt(n.pos.x, n.pos.y + h * 0.6, n.pos.z);
        return { x: n.pos.x, y: n.pos.y, z: n.pos.z, state: n.state, actor: !!n.actor, slot: n.slot, me: { x: tx, y: cy, z: tz } };
      }
      return { x: n.pos.x, y: n.pos.y, z: n.pos.z, state: n.state, actor: !!n.actor, slot: n.slot, me: null };
    },
  }; true`;
  // right-click the anchor and make sure it is them who answered (a crowd visitor can step into the ray in a busy
  // lobby: their generic talk box opens instead - close it and try again)
  const talkTo = async (castId, name, tries = 4) => {
    for (let i = 0; i < tries; i++) {
      const ap = await evj(`window.__t.approach('${castId}')`);
      assert.ok(ap && ap.me, `a standing cell with a clear line to ${name}: ${JSON.stringify(ap)}`);
      await ev('window.__t.frames(1)');
      await ev('window.__t.click(2)');
      const t = await evj('window.__t.talk()');
      if (t && !t.hidden && t.name === name) return { ap, t };
      console.log(`   (the ray hit ${t && !t.hidden ? t.name : 'nobody'} instead of ${name}; retrying)`);
      if (t && !t.hidden) { await ev(`window.__t.key('Escape', 'Escape')`); await ev('window.__t.frames(2)'); }
      await ev(`game.coruscant.population.live.find((n) => n.person.cast === '${castId}').talkCooldown = 0; true`);
    }
    throw new Error(`could not open a conversation with ${name} in ${tries} tries`);
  };
  const boot = async () => {
    await page.waitForGame(180000);
    await ev(HELPERS);
    for (let i = 0; i < 80; i++) { if (await ev('!!(game.coruscant && game.coruscant.population && game.cast && game.dialog)')) break; await page.sleep(500); }
    for (let i = 0; i < 60; i++) { const c = await evj('game.coruscant.population.census().cast'); if (c && c.live.some((l) => l.id === 'seli_noor')) return c; await page.sleep(500); }
    throw new Error('Seli Noor did not spawn within 30 s: ' + JSON.stringify(await evj('game.coruscant.population.census().cast')));
  };
  try {
    const census = await boot();
    console.log(`   cast live: ${census.live.map((l) => `${l.id}@${l.x},${l.y},${l.z} ${l.state}`).join('; ')}`);

    await testAsync('A7 / C3 game.cast + game.dialog API; the live anchors are full models at their scheduled lot, never crowd slots', async () => {
      const r = await evj(`(() => { const c = game.cast, d = game.dialog; const seli = c.get('cast:seli_noor'); const pos = game.player.pos;
        const live = game.coruscant.population.live.filter((n) => n.person.cast).map((n) => ({ id: n.person.cast, slot: n.slot, actor: !!n.actor, inScene: !!(n.actor && n.actor.root.parent === game.scene), visible: !!(n.actor && n.actor.root.visible), kind: n.actor && n.actor.model.kind, parts: n.actor ? n.actor.root.children.length : 0, lot: n.lot, act: n.act, work: c.forPerson(n.person).lot.work }));
        return { get: !!seli && seli.name === 'Seli Noor' && seli.lot.work === ${seli.lot.work}, getShort: c.get('seli_noor') === seli || !!d.resolve('seli_noor'), list: c.list().length, listAnchors: c.list((p) => p.kind === 'cast').length, nearby: c.nearby(pos, 40).slice(0, 3), unvoiced: Array.isArray(d.unvoiced), report: d.audioReport(), live, actors: game.coruscant.cast.actors.stats }; })()`);
      assert.ok(r.get && r.getShort, 'game.cast.get');
      assert.ok(r.list >= 613 && r.listAnchors === 13, `list ${r.list}/${r.listAnchors}`);
      assert.ok(r.nearby.length >= 1 && r.nearby[0].dist < 40, JSON.stringify(r.nearby));
      assert.ok(r.unvoiced && typeof r.report.textOnly === 'boolean');
      assert.ok(r.live.length >= 1, 'a live anchor');
      for (const n of r.live) { assert.equal(n.slot, null, `${n.id} holds a crowd slot`); assert.ok(n.actor && n.inScene, `${n.id} has no model in the scene`); assert.ok(n.parts >= 3, `${n.id} model parts ${n.parts}`); }
      const s = r.live.find((n) => n.id === 'seli_noor');
      assert.equal(s.lot, s.work, 'Seli is at her diner at noon'); assert.equal(s.act, 'work'); assert.equal(s.kind, 'humanoid');
      assert.equal(r.actors.live, r.live.length);
      console.log(`   ${r.list} persistent people, nearby: ${r.nearby.map((n) => `${n.id} ${n.dist}`).join(', ')}; live models: ${r.live.map((n) => `${n.id} (${n.kind}, ${n.parts} parts)`).join(', ')}`);
    });

    let first = null;
    await testAsync('C5 / B12 / D2 / D4 right-click talk: greeting, 3 options, replies from other categories, subtitles, unvoiced manifest', async () => {
      const { t: t1 } = await talkTo('seli_noor', 'Seli Noor');
      const s1 = await evj('window.__t.sub()');
      await ev('window.__t.pin()'); await ev('window.__t.frames(2)');
      assert.equal(t1.hidden, false, 'talk box open'); assert.equal(t1.name, 'Seli Noor'); assert.ok(/diner owner/i.test(t1.role), t1.role);
      assert.ok(t1.line.length > 20 && t1.opts.length === 3, JSON.stringify(t1));
      assert.ok(s1.shown && s1.name === 'Seli Noor:' && s1.text === t1.line, `subtitle ${JSON.stringify(s1)}`);
      assert.ok(/text only/.test(s1.mode), 'headless: the overlay says text only');
      assert.ok(s1.boxTop != null && s1.top < s1.boxTop && s1.bottom.startsWith('calc(18%'), `the subtitle sits above the talk box: ${JSON.stringify(s1)}`);
      const ev1 = await evj(`window.__t.said(${JSON.stringify(t1.line)})`);
      assert.ok(ev1 && ev1.npc === 'cast:seli_noor' && ev1.lineId.startsWith('cast:seli_noor#greet') && ev1.voiced === false, JSON.stringify(ev1));
      first = t1.line;
      await page.screenshot(`${shots}/cast_seli_talk.png`);
      await ev(`window.__t.key('Digit1', '1')`);
      const t2 = await evj('window.__t.talk()'), s2 = await evj('window.__t.sub()');
      await ev('window.__t.pin()'); await ev('window.__t.frames(2)');
      assert.ok(!t2.hidden && t2.line !== t1.line && t2.line.length > 20, JSON.stringify(t2));
      assert.equal(s2.text, t2.line, 'subtitle follows the reply');
      const ev2 = await evj(`window.__t.said(${JSON.stringify(t2.line)})`);
      assert.ok(ev2 && ev2.lineId.includes('#work'), `reply 1 is a work line: ${JSON.stringify(ev2)}`);
      await page.screenshot(`${shots}/cast_seli_reply.png`);
      await ev(`window.__t.key('Digit2', '2')`);
      const t3 = await evj('window.__t.talk()');
      const ev3 = await evj(`window.__t.said(${JSON.stringify(t3.line)})`);
      assert.ok(ev3 && /#(task|personal|event)/.test(ev3.lineId), `reply 2 is another category: ${JSON.stringify(ev3)}`);
      await ev('window.__t.frames(2)');
      await ev(`window.__t.key('Escape', 'Escape')`);
      const t4 = await evj('window.__t.talk()'), s4 = await evj('window.__t.sub()');
      assert.equal(t4.hidden, true, 'closed');
      assert.equal(s4.bottom, '17%', 'no talk box: the subtitle is back at its usual height');
      assert.ok(s4.shown && s4.text.length > 5, 'the farewell is subtitled');
      const ev4 = await evj(`window.__t.said(${JSON.stringify(s4.text)})`);
      assert.ok(ev4 && ev4.npc === 'cast:seli_noor' && ev4.lineId.includes('#farewell'), `a farewell on leaving: ${JSON.stringify(ev4)}`);
      const h = await evj(`game.cast.get('cast:seli_noor').history`);
      assert.equal(h.talks, 1); assert.ok(h.firstMet && h.firstMet.hour > 0, JSON.stringify(h)); assert.equal(h.asked.work, 1);
      const rep = await evj('game.dialog.audioReport()');
      assert.equal(rep.textOnly, true); assert.ok(rep.unvoiced >= 4 && rep.spoken === 0 && rep.subtitlesShown >= 4, JSON.stringify(rep));
      const un = await evj('game.dialog.unvoiced.slice(-4)');
      assert.ok(un.every((u) => u.speaker === 'cast:seli_noor' && u.id && u.text && u.reason === 'no-voices'), JSON.stringify(un));
      const ids = await evj(`game.dialog.bankFor('cast:seli_noor').map((l) => l.id)`);
      assert.ok(un.every((u) => ids.includes(u.id)), 'unvoiced entries reference bank line ids');
      console.log(`   "${t1.line}" -> "${t2.line}" -> ... -> "${s4.text}"`);
    });

    await testAsync('A6 (live) a second talk is a returning greeting, the history persists in storage', async () => {
      await ev(`game.coruscant.population.live.find((n) => n.person.cast === 'seli_noor').talkCooldown = 0`);
      const { t } = await talkTo('seli_noor', 'Seli Noor');
      assert.notEqual(t.line, first, 'a different greeting the second time');
      const ev1 = await evj(`window.__t.said(${JSON.stringify(t.line)})`);
      assert.ok(ev1 && ev1.npc === 'cast:seli_noor', JSON.stringify(ev1));
      const line = await evj(`game.dialog.bankFor('cast:seli_noor').find((l) => l.id === ${JSON.stringify(ev1.lineId)})`);
      assert.ok(line && line.trigger === 'greet' && !(line.when && line.when.met === 'first'), `not a first-meeting line: ${JSON.stringify(line && line.when)}`);
      // the person in the talk box does not chatter: after a while no ambient line of hers follows the greeting
      await ev('window.__t.frames(3)');
      const hers = await evj(`game.events.recent('npc:talk', 50).filter((e) => e.seq > ${ev1.seq} && e.args[0].npc === 'cast:seli_noor' && e.args[0].ambient).map((e) => e.args[0].lineId)`);
      assert.equal(hers.length, 0, `ambient lines from the person in the box: ${JSON.stringify(hers)}`);
      assert.equal(await evj(`game.coruscant.population.talkBox.npc && game.coruscant.population.talkBox.npc.person.cast`), 'seli_noor', 'still in the box');
      await ev(`window.__t.key('Escape', 'Escape')`); await ev('window.__t.frames(2)');
      await page.sleep(2000);   // the registry persists 1.5 s after a change
      const saved = await evj(`JSON.parse(localStorage.getItem('frontier-craft:cast:' + game.cast.seed) || 'null')`);
      assert.ok(saved && saved.history['cast:seli_noor'] && saved.history['cast:seli_noor'].talks === 2, JSON.stringify(saved));
    });

    await testAsync('D3 admin panel Dialogue section: subtitles / voice toggles and the volume slider write localStorage', async () => {
      const r = await evj(`(() => { game.adminPanel && game.adminPanel.open && game.adminPanel.open(); const q = (id) => document.getElementById(id);
        const sec = q('ap-dialogue'); if (!sec) return { sec: false };
        const before = JSON.stringify(game.dialog.settings);
        q('ap-dlg-voice-off').click(); q('ap-dlg-subtitles-off').click();
        const vol = q('ap-dlg-volume'); vol.value = '0.35'; vol.dispatchEvent(new Event('input', { bubbles: true }));
        const stored = JSON.parse(localStorage.getItem('frontier-craft:dialogue'));
        const status = q('ap-dlg-status').textContent;
        const checked = { voiceOff: q('ap-dlg-voice-off').getAttribute('aria-checked'), subOff: q('ap-dlg-subtitles-off').getAttribute('aria-checked') };
        q('ap-dlg-subtitles-on').click();
        return { sec: true, before, stored, status, checked, after: JSON.stringify(game.dialog.settings), title: sec.querySelector('h3').textContent }; })()`);
      assert.ok(r.sec, '#ap-dialogue exists'); assert.equal(r.title, 'Dialogue');
      assert.deepEqual(r.stored, { subtitles: false, volume: 0.35, voice: false }, JSON.stringify(r.stored));
      assert.deepEqual(r.checked, { voiceOff: 'true', subOff: 'true' });
      assert.ok(/text only|voice off/.test(r.status) && /cast: 13 anchors/.test(r.status), r.status);
      assert.equal(JSON.parse(r.after).subtitles, true, 'subtitles back on');
      await page.screenshot(`${shots}/cast_admin_dialogue.png`);
      await ev('game.adminPanel && game.adminPanel.close && game.adminPanel.close(); true');
    });

    await testAsync('A6 / D3 (reload) history and settings survive a reload; a fresh start clears the history', async () => {
      const again = startUrl.replace('&fresh=1', '');
      await ev(`location.href = ${JSON.stringify(again)}; true`);
      await page.sleep(1500);
      const c = await boot();
      const r = await evj(`({ talks: game.cast.get('cast:seli_noor').history.talks, settings: game.dialog.settings, live: game.coruscant.population.live.filter((n) => n.person.cast).length })`);
      assert.equal(r.talks, 2, 'history restored from storage'); assert.equal(r.settings.voice, false); assert.equal(r.settings.volume, 0.35);
      assert.ok(c.live.some((l) => l.id === 'seli_noor'), 'Seli is back at the diner');
      await ev(`game.dialog.speech.setSetting('voice', true); game.dialog.speech.setSetting('volume', 0.8); true`);
      await ev(`location.href = ${JSON.stringify(startUrl)}; true`);
      await page.sleep(1500);
      await boot();
      assert.equal(await evj(`game.cast.get('cast:seli_noor').history.talks`), 0, '?fresh=1 starts with an empty history');
    });

    await testAsync('A8 / C3 (live) the dockmaster works the control desk and the captain has her own pad; models animate and are not recycled', async () => {
      await ev(`game.player.flying = true; game.player.teleport(2640, 97, -6); game.player.yaw = -1.5708; true`);
      let c = null;
      for (let i = 0; i < 50; i++) { c = await evj('game.coruscant.population.census().cast'); if (c.live.some((l) => l.id === 'vela_marr') && c.live.some((l) => l.id === 'brin_tal')) break; await page.sleep(500); }
      const vela = c.live.find((l) => l.id === 'vela_marr'), brin = c.live.find((l) => l.id === 'brin_tal');
      assert.ok(vela && brin, JSON.stringify(c.live));
      assert.ok(Math.abs(vela.x - 2647.5) < 1.1 && Math.abs(Math.abs(vela.z) - 19.5) < 1.1 && vela.y === 97, `Vela at the control desk: ${JSON.stringify(vela)}`);
      assert.ok(brin.y === 97 && brin.x > 2590 && brin.x < 2700, `Brin on the deck: ${JSON.stringify(brin)}`);
      const ship = await evj(`(() => { const t = game.shipTraffic; if (!t) return null; const s = t.ships.find((s) => s.pad === 7); return s ? { model: s.model || (s.def && s.def.id) || null, phase: s.phase } : null; })()`);
      console.log(`   Vela ${JSON.stringify(vela)}; Brin ${JSON.stringify(brin)}; pad 8 ship ${JSON.stringify(ship)}`);
      // animation: the pose changes over frames while the model stays the same object
      const anim = await evj(`(async () => { const n = game.coruscant.population.live.find((n) => n.person.cast === 'vela_marr'); const m = n.actor.model; const a0 = m.rightArm.rotation.x; const root0 = n.actor.root.uuid; await window.__t.frames(12); return { moved: Math.abs(m.rightArm.rotation.x - a0) > 1e-4, sameRoot: n.actor.root.uuid === root0, mode: n.mode, spawnedAt: n.spawnedAt, tick: game.coruscant.population.tickCount }; })()`);
      assert.ok(anim.moved, `typing arms move: ${JSON.stringify(anim)}`); assert.ok(anim.sameRoot);
      await ev(`window.__t.approach('vela_marr'); game.player.teleport(2644, 97, -17); window.__t.aimAt(2647.5, 98.2, -19.5); true`);
      await ev('window.__t.frames(3)');
      await page.screenshot(`${shots}/cast_vela_control_desk.png`);
      // draw calls: one model per anchor, a handful of meshes each
      const draws = await evj(`({ calls: game.renderer.info.render.calls, live: game.coruscant.population.live.length, crowd: game.coruscant.population.crowd.drawCalls })`);
      console.log(`   renderer draw calls ${draws.calls} (crowd ${draws.crowd}), live ${draws.live}`);
    });
  } catch (e) { failed++; console.log('FAIL CDP session\n   ' + e.message); }
  if (page) { const errs = page.exceptions.slice(0, 5); if (errs.length) console.log('page exceptions:', errs); page.close(); }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
