// The building rubric scorer (docs/overhaul/SPEC.md section 17, rubric 16 F18-F21).
//
//   node scripts/score-buildings.mjs [--seed 1337] [--out docs/overhaul/scores] [--lot 123] [--verbose] [--no-write]
//
// Every manifested playable building (towers and landmarks) is rated 0-5 in the ten categories of spec 17 with its
// frozen weights, from automated evidence only: the blueprint profile (scripts/programs/_profile.mjs), the program
// record, the purpose (read only), W4's room functions and dialog banks (read only), the economy's GOODS table
// (read only), the four-differences report and a fresh timed rebuild. Each category is a list of checks documented
// where it is computed; the rating is the number of checks met (five checks per category; technical has four and
// maps 0-4 to 0/2/3/4/5). Object counts alone never earn points: every check asks whether something works
// (reachable, lit, evidenced, valid, deterministic), not how much of it there is.
//
// Hard failures (spec 17) score 0 overall whatever the categories say: no furnished interior, broken traversal
// (fewer than half the rooms reachable from the public entry), a fake transaction (a `sells` item, program input
// or output with no GOODS entry).
//
// Thresholds: ordinary buildings need >= 85 with no category below 3 and >= 4 in floor plan, interactions and NPC
// behaviour; the Senate, the passenger port and the Jedi precinct need >= 90 with no category below 4.
//
// District ambience is not implemented in src/audio.js (the frontier-town ambience is the only one), so the
// "district ambience" check of lighting and sound fails for every building and the category is capped at 4/5;
// spec 17 says missing audio stays explicitly incomplete rather than being averaged away, so the report says so.
//
// Exports scoreLot/scoreAll for scripts/test-programs.mjs and scripts/dossiers.mjs.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GOODS } from '../src/economy/prices.js';
import { roomFunction, JOB_ARCHETYPE, VISITOR_JOBS } from '../src/npc/coruscant/rooms.js';
import { JOB_WORK_KINDS } from '../src/npc/coruscant/lots.js';
import { JOB_LINES, TIME_LINES, GOSSIP } from '../src/npc/dialog/lines.js';
import { buildBlueprint } from '../src/coruscant/buildings.js';
import { ROOMS } from '../src/coruscant/rooms/index.js';
import { programRoom, ADAPTATION_BY_KIND } from '../src/coruscant/rooms/programs.js';
import { ownerOf } from '../src/coruscant/programs/index.js';
import { city, parseArgs, blueprintFor } from './programs/_lib.mjs';
import { profiles, playableLots } from './programs/_profile.mjs';
import { similarityReport, GENERIC_VERBS, AXIS_NAMES } from './room-similarity.mjs';

export const WEIGHTS = { identity: 12, plan: 18, interior: 12, interactions: 10, npc: 12, economy: 10, story: 8, light: 8, access: 6, technical: 4 };
export const LABELS = { identity: 'Identity and exterior architecture', plan: 'Floor plan and room purpose', interior: 'Interior specificity and materials', interactions: 'Working interactions', npc: 'NPC purpose and behaviour', economy: 'Economic and city integration', story: 'Story and discoverability', light: 'Lighting and sound', access: 'Access and navigation', technical: 'Technical integrity' };
export const CATEGORIES = Object.keys(WEIGHTS);
export const SPECIAL_PROGRAMS = new Set(['senate', 'jedi_temple', 'passenger_terminal']);
export const THRESHOLDS = { ordinary: { total: 85, minCategory: 3, minKey: 4, keys: ['plan', 'interactions', 'npc'] }, special: { total: 90, minCategory: 4, minKey: 4, keys: [] } };
// warm build budgets: the towers suite's 25 ms per tower, the landmark harness's 60 ms per landmark
export const BUDGET_MS = { tower: 25, landmark: 60 };
export const DISTRICT_AMBIENCE_IMPLEMENTED = false;

const hashBlocks = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
const share = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : 0);
const pct = (x) => `${Math.round(x * 100)}%`;
const check = (ok, text) => ({ ok: !!ok, text });
const rate = (checks) => checks.filter((c) => c.ok).length;
const knownKind = (k) => !!(ROOMS[k] || programRoom(k) || ADAPTATION_BY_KIND[k] || !roomFunction(k).inferred || roomFunction(k).base !== 'lounge' || k === 'lounge');
// the lines an NPC of `job` can say: its archetype's job bank, the time-of-day bank and the district gossip
const eligibleLines = (job, district) => (JOB_LINES[JOB_ARCHETYPE[job] || 'resident'] || []).length + Object.values(TIME_LINES).reduce((s, l) => s + l.length, 0) / Object.keys(TIME_LINES).length + ((GOSSIP[district] || []).length);

/**
 * Context shared by every building of the layout: the district palettes, who sells and buys what, the similarity
 * report (nearest sibling per building) and the manifest's stable ids when present.
 */
export function scoringContext(layout, o = {}) {
  const profs = profiles(layout, o.onProgress);
  const sim = o.similarity || similarityReport(layout);
  const districtPalette = new Map();
  for (const p of profs.values()) {
    if (!districtPalette.has(p.district)) districtPalette.set(p.district, new Map());
    const m = districtPalette.get(p.district);
    for (const b of p.palette) m.set(b, (m.get(b) || 0) + 1);
  }
  for (const [d, m] of districtPalette) districtPalette.set(d, new Set([...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 6).map((e) => e[0])));
  const sellers = new Map(), buyers = new Map();   // good -> Set(lotId), category -> Set(lotId)
  for (const p of profs.values()) {
    if (!p.purpose) continue;
    for (const s of p.purpose.sells) { if (!sellers.has(s.item)) sellers.set(s.item, new Set()); sellers.get(s.item).add(p.id); }
    for (const c of p.purpose.buys) { if (!buyers.has(c)) buyers.set(c, new Set()); buyers.get(c).add(p.id); }
  }
  let manifestIds = null;
  const mf = o.manifest || 'docs/overhaul/manifest.json';
  // manifest ids are "lot:<id>" (scripts/manifest.mjs)
  if (existsSync(mf)) { try { const j = JSON.parse(readFileSync(mf, 'utf8')); manifestIds = new Set((j.buildings || []).map((b) => parseInt(String(b.id).replace(/^lot:/, ''), 10))); } catch { manifestIds = null; } }
  return { layout, profs, sim, districtPalette, sellers, buyers, manifestIds };
}

// fresh uncached build: warm timing and determinism against the cached blueprint
function rebuild(lot, layout) {
  const cached = blueprintFor(lot, layout);
  const t0 = performance.now();
  const fresh = buildBlueprint(lot, layout);
  const ms = performance.now() - t0;
  return { ms, deterministic: hashBlocks(cached.blocks) === hashBlocks(fresh.blocks) && cached.meta.rooms.length === fresh.meta.rooms.length };
}

export function scoreLot(p, ctx, o = {}) {
  const lot = ctx.layout.lots.find((l) => l.id === p.id);
  const prog = p.programInfo || null;   // the per-lot program record (programFor): rooms, flows and story resolved for this lot
  const rec = p.programRecord;
  const purpose = p.purpose;
  const occupied = p.rooms.filter((r) => !r.circulation);
  const near = ctx.sim.nearest.get(p.id);   // null: the only building of its kind
  const nearOk = !near || near.ok;
  const verbs = [...p.verbs].filter((v) => !GENERIC_VERBS.has(v));
  const kinds = new Set(p.rooms.map((r) => r.kind));
  const special = SPECIAL_PROGRAMS.has(p.program);
  const isLandmark = p.kind === 'landmark';
  const programBuilt = !!(rec && (rec.rooms.length + rec.satisfied.length) > 0);
  const roles = purpose ? purpose.roles : [];
  const staffRoles = roles.filter((r) => !VISITOR_JOBS.has(r.job));
  const visitorRoles = roles.filter((r) => VISITOR_JOBS.has(r.job));
  const cat = {};

  // 1. identity: the sign, the program's material identity built into its rooms, a palette that belongs to the
  //    district (>= 2 of the six identity blocks are among the district's six), a room mix a visitor can read the
  //    function from (the signature room is program- or landmark-specific, not a generic library room), and a
  //    building told apart from its nearest sibling on >= 5 axes (or the only one of its kind / a landmark)
  const dpal = ctx.districtPalette.get(p.district) || new Set();
  cat.identity = [
    check(p.sign, `sign name "${p.sign || ''}"`),
    check(programBuilt, rec ? `program ${p.program}: ${rec.rooms.length} rooms built, ${rec.satisfied.length} satisfied by the module` : 'no building program'),
    check(p.palette.filter((b) => dpal.has(b)).length >= 2, `${p.palette.filter((b) => dpal.has(b)).length}/6 identity blocks shared with the ${p.district} district palette`),
    check(p.signature && p.signature.program, p.signature ? `signature room ${p.signature.kind}${p.signature.program ? ' (program-specific)' : ' (generic library room)'}` : 'no signature room'),
    check(isLandmark || !near || near.differences >= 5, near ? `nearest sibling lot ${near.sibling} differs on ${near.differences}/7 axes` : 'the only building of its kind'),
  ];
  // 2. floor plan: one connected graph with no room without a door, circulation neither missing nor dominant
  //    (5-60 % of the floor area), every room a known function, the program complete (or, without a program, at
  //    least four room functions), and no copied occupied layout (nearest sibling passes the four-differences rule)
  cat.plan = [
    check(p.graph.connected && p.graph.isolatedRooms === 0, `${p.graph.components} graph component(s), ${p.graph.isolatedRooms} room(s) without a doorway`),
    check(p.graph.corridorShare >= 0.05 && p.graph.corridorShare <= 0.6, `circulation ${pct(p.graph.corridorShare)} of the floor area`),
    check(share(p.rooms, (r) => knownKind(r.kind)) >= 0.95, `${pct(share(p.rooms, (r) => knownKind(r.kind)))} of rooms have a known function`),
    check(rec ? rec.missing.length === 0 : kinds.size >= 4, rec ? (rec.missing.length ? `program rooms missing: ${rec.missing.join(', ')}` : `program complete (${rec.compact ? 'compact' : 'extended'})`) : `${kinds.size} room functions, no program`),
    check(nearOk, near ? `${near.differences}/7 differences from lot ${near.sibling}${near.ok ? '' : ' (below four)'}` : 'no sibling'),
  ];
  // 3. interior: rooms furnished to the landmark bar (>= 80 %), furniture variety (>= 4 block kinds per room on
  //    average), believable storage in >= 30 % of occupied rooms, function-specific equipment in the signature
  //    room, a household / workplace identity of its own (an adaptation room, or a hand-built landmark)
  cat.interior = [
    check(p.denseShare >= 0.8, `${pct(p.denseShare)} of rooms at the density bar`),
    check(p.varietyMean >= 4, `${p.varietyMean} furniture kinds per room`),
    check(share(occupied, (r) => r.storage) >= 0.3, `${pct(share(occupied, (r) => r.storage))} of occupied rooms have storage`),
    check(p.signature && p.signature.program, p.signature ? `${p.signature.kind} furnished to its program` : 'no signature room'),
    check(isLandmark || (rec && rec.adaptations && rec.adaptations.length > 0), rec && rec.adaptations && rec.adaptations.length ? `adaptations: ${rec.adaptations.map((a) => a.kind).join(', ')}` : (isLandmark ? 'hand-built landmark' : 'no adaptation room')),
  ];
  // 4. interactions: >= 3 and >= 6 distinct evidenced activities (talking to staff and the lift excluded), every
  //    served program room with an evidenced interaction (without a program: half the occupied rooms), interactions
  //    spread through the building (>= 60 % of occupied rooms), and an advertised transaction that is real (every
  //    `sells` item is a GOODS entry; a building that sells nothing needs >= 4 activities instead)
  const progRooms = rec ? rec.rooms.map((r) => p.rooms.find((s) => s.x === r.x && s.y === r.y && s.z === r.z)).filter(Boolean) : [];
  const servedOk = rec ? progRooms.every((r) => r.verbs.some((v) => !GENERIC_VERBS.has(v)) || r.verbs.length > 0) : share(occupied, (r) => r.verbs.length > 0) >= 0.5;
  const sells = purpose ? purpose.sells : [];
  const fakeSells = sells.filter((s) => !GOODS[s.item]);
  cat.interactions = [
    check(verbs.length >= 3, `${verbs.length} activities: ${verbs.slice(0, 8).join(', ')}${verbs.length > 8 ? ', ...' : ''}`),
    check(verbs.length >= 6, `${verbs.length} >= 6 activities`),
    check(servedOk, rec ? `${progRooms.filter((r) => r.verbs.length > 0).length}/${progRooms.length} program rooms with an evidenced interaction` : `${pct(share(occupied, (r) => r.verbs.length > 0))} of occupied rooms with an interaction`),
    check(share(occupied, (r) => r.verbs.length > 0) >= 0.6, `${pct(share(occupied, (r) => r.verbs.length > 0))} of occupied rooms offer something to do`),
    check(sells.length ? fakeSells.length === 0 : verbs.length >= 4, sells.length ? `${sells.length} advertised goods, ${fakeSells.length} without a GOODS entry` : 'sells nothing; judged on activities'),
  ];
  // 5. NPC behaviour: every staff role of the purpose has a room that hosts it (W4's room functions or the role's own
  //    room list), work stations for the head count, idle spots for the visitors, beds where residents live, and
  //    >= 30 eligible unique lines for every role (job bank + time bank + district gossip) plus opening hours
  // W4's placement order (src/npc/coruscant/lots.js candidates): the job's work-record kinds, then a room whose function
  // lists the job; visitors take the role's own room list
  const hosts = (role) => (JOB_WORK_KINDS[role.job] || []).some((k) => p.staff.kinds[k] > 0) || role.rooms.some((k) => kinds.has(k)) || [...kinds].some((k) => roomFunction(k).jobs.some((j) => j.job === role.job));
  const covered = staffRoles.filter(hosts);
  const heads = staffRoles.reduce((s, r) => s + r.count, 0);
  const visitors = visitorRoles.reduce((s, r) => s + r.count, 0);
  const wantsBeds = roles.some((r) => ['resident', 'lodger', 'guest', 'patient'].includes(r.job));
  const lines = roles.map((r) => eligibleLines(r.job, p.district));
  cat.npc = [
    check(staffRoles.length > 0 && covered.length === staffRoles.length, `${covered.length}/${staffRoles.length} staff roles have a room that hosts them${staffRoles.length - covered.length ? ` (missing ${staffRoles.filter((r) => !hosts(r)).map((r) => r.job).join(', ')})` : ''}`),
    check(p.staff.total >= heads && p.staff.total > 0, `${p.staff.total} work stations for ${heads} staff`),
    check(p.spots >= Math.max(4, visitors), `${p.spots} idle spots for ${visitors} visitors / residents`),
    check(!wantsBeds || p.beds > 0, wantsBeds ? `${p.beds} beds for the residents / patients` : 'no resident roles'),
    check(roles.length > 0 && lines.every((n) => n >= 30) && purpose && purpose.hours, `${roles.length} roles, ${Math.min(...lines, 99)}+ eligible lines each, hours ${purpose && purpose.hours ? purpose.hours.join('-') : 'none'}`),
  ];
  // 6. economy: every good the building trades exists (GOODS), at least one dependency (inputs or buys), a supplier
  //    in the city for an input, a customer for an output (a buyer of its category, or a service consumed on the
  //    spot), and a documented external consequence (the program's connection to another location)
  const inputs = prog ? prog.inputs : [];
  const outputs = prog ? prog.outputs : [];
  const buys = purpose ? purpose.buys : [];
  const badGoods = [...inputs, ...outputs].filter((g) => !GOODS[g]).concat(fakeSells.map((s) => s.item));
  const goodsCat = (g) => (GOODS[g] ? GOODS[g].cat : null);
  const supplied = inputs.filter((g) => ctx.sellers.has(g) && [...ctx.sellers.get(g)].some((id) => id !== p.id)).concat(buys.filter((c) => c === 'any' || [...ctx.sellers.keys()].some((g) => goodsCat(g) === c)));
  const outGoods = [...new Set([...outputs, ...sells.map((s) => s.item)])];
  const customers = outGoods.filter((g) => goodsCat(g) === 'service' || [...ctx.buyers.keys()].some((c) => c === 'any' || c === goodsCat(g)));
  cat.economy = [
    check(badGoods.length === 0, badGoods.length ? `goods without a GOODS entry: ${badGoods.join(', ')}` : `${inputs.length + outputs.length + sells.length} traded goods, all in GOODS`),
    check(inputs.length + buys.length > 0, `dependencies: ${[...inputs, ...buys].join(', ') || 'none'}`),
    check(supplied.length > 0, supplied.length ? `supplied in the city: ${supplied.slice(0, 4).join(', ')}` : 'no supplier in the city'),
    check(customers.length > 0, customers.length ? `customers for: ${customers.slice(0, 4).join(', ')}` : 'no customer for its outputs'),
    check(prog && prog.story && prog.story.place, prog && prog.story && prog.story.place ? `connected to ${prog.story.place.name} (lot ${prog.story.place.lotId}, ${prog.story.place.blocks} blocks ${prog.story.place.direction})` : 'no other location this building depends on'),
  ];
  // 7. story: an owner, a sign, a local problem (or the purpose's greeting line), a connection to another location,
  //    and a detail to discover (a program-specific signature room or an adaptation room)
  const owner = lot ? ownerOf(lot, prog) : null;
  cat.story = [
    check(owner && owner.name, owner ? `owner ${owner.name}, ${owner.title}` : 'no owner'),
    check(p.sign, `sign "${p.sign || ''}"`),
    check((prog && prog.story && prog.story.problem) || (purpose && purpose.greeting) || isLandmark, prog && prog.story ? `problem: ${prog.story.problem}` : 'greeting line only'),
    check(prog && prog.story && prog.story.place, prog && prog.story && prog.story.place ? `connection: ${prog.story.connection}` : 'no connection to another location'),
    check((p.signature && p.signature.program) || (rec && rec.adaptations && rec.adaptations.length), 'a room to discover (signature or adaptation)'),
  ];
  // 8. lighting and sound: >= 90 % and 100 % of rooms lit, >= 2 kinds of light (purposeful, not one panel everywhere),
  //    plausible sound sources in >= 30 % of occupied rooms, and a district ambience layer (not implemented: capped)
  cat.light = [
    check(p.litShare >= 0.9, `${pct(p.litShare)} of rooms lit`),
    check(p.litShare >= 1, `${pct(p.litShare)} lit`),
    check(p.emissiveKinds >= 2, `${p.emissiveKinds} kinds of light`),
    check(share(occupied, (r) => r.sound) >= 0.3, `${pct(share(occupied, (r) => r.sound))} of occupied rooms have a sound source`),
    check(DISTRICT_AMBIENCE_IMPLEMENTED, 'district ambience not implemented (src/audio.js)'),
  ];
  // 9. access: >= 90 % and 100 % of rooms reachable from the street, a vertical route spanning the floors, doors
  //    that lead in (the flood fill enters), and every program room reachable
  cat.access = [
    check(p.reachShare >= 0.9, `${pct(p.reachShare)} of rooms reachable from the entry`),
    check(p.reachShare >= 1, `${pct(p.reachShare)} reachable`),
    check(p.floors <= 2 || p.entry.liftSpan >= 0.9 || p.rooms.filter((r) => /stair/.test(r.kind)).length >= p.floors - 1, `${p.entry.lifts} lift(s) spanning ${pct(p.entry.liftSpan)} of the height, ${p.floors} floors`),
    check(p.entry.doors >= 1 && p.reachCount > 0, `${p.entry.doors} door(s), ${p.reachCount} standing cells reached`),
    check(progRooms.every((r) => r.reach) && p.graph.isolatedRooms === 0, `${progRooms.filter((r) => r.reach).length}/${progRooms.length} program rooms reachable`),
  ];
  // 10. technical: no floating blocks, a deterministic rebuild, the warm build within budget, a stable id in the manifest
  const rb = o.rebuild ? rebuild(lot, ctx.layout) : { ms: 0, deterministic: true, skipped: true };
  const budget = BUDGET_MS[p.kind] || BUDGET_MS.tower;
  const tech = [
    check(p.floating === 0, `${p.floating} floating blocks`),
    check(rb.deterministic, rb.skipped ? 'rebuild skipped' : `rebuild ${rb.deterministic ? 'identical' : 'DIFFERS'}`),
    check(rb.skipped || rb.ms <= budget, rb.skipped ? 'timing skipped' : `warm build ${rb.ms.toFixed(1)} ms (budget ${budget})`),
    check(ctx.manifestIds ? ctx.manifestIds.has(p.id) : p.id != null, ctx.manifestIds ? `lot ${p.id} ${ctx.manifestIds.has(p.id) ? 'in' : 'NOT in'} the manifest` : `lot id ${p.id}`),
  ];
  cat.technical = tech;

  const ratings = {};
  for (const k of CATEGORIES) ratings[k] = k === 'technical' ? [0, 2, 3, 4, 5][rate(cat[k])] : rate(cat[k]);
  // hard failures
  const hard = [];
  if (p.rooms.length === 0 || p.denseShare === 0) hard.push('no furnished interior');
  if (p.reachShare < 0.5) hard.push(`broken traversal (${pct(p.reachShare)} of rooms reachable)`);
  if (badGoods.length) hard.push(`fake transaction (${badGoods.join(', ')})`);
  let total = 0;
  for (const k of CATEGORIES) total += WEIGHTS[k] * ratings[k] / 5;
  total = +total.toFixed(1);
  const th = special ? THRESHOLDS.special : THRESHOLDS.ordinary;
  const failing = [];
  for (const k of CATEGORIES) {
    const min = th.keys.includes(k) ? th.minKey : th.minCategory;
    if (ratings[k] < min) failing.push({ category: k, rating: ratings[k], min, reasons: cat[k].filter((c) => !c.ok).map((c) => c.text) });
  }
  const pass = hard.length === 0 && total >= th.total && failing.length === 0;
  return { id: p.id, name: p.name, sign: p.sign, district: p.district, kind: p.kind, family: p.family, purposeKind: purpose ? purpose.kind : null, program: p.program, special, threshold: th.total, total: hard.length ? 0 : total, rawTotal: total, ratings, checks: cat, hard, failing, pass, genMs: rb.skipped ? null : +rb.ms.toFixed(1), deterministic: rb.deterministic, nearest: near ? { sibling: near.sibling, differences: near.differences } : null };
}

export function scoreAll(layout, o = {}) {
  const ctx = scoringContext(layout, o);
  const lots = playableLots(layout);
  const buildings = lots.map((lot, i) => { const s = scoreLot(ctx.profs.get(lot.id), ctx, { rebuild: o.rebuild !== false }); if (o.onProgress) o.onProgress(i + 1, lots.length); return s; });
  const ordinary = buildings.filter((b) => !b.special), specials = buildings.filter((b) => b.special);
  const mean = (arr, f) => (arr.length ? arr.reduce((s, b) => s + f(b), 0) / arr.length : 0);
  const group = (key) => {
    const m = new Map();
    for (const b of buildings) { const k = key(b) || 'none'; if (!m.has(k)) m.set(k, []); m.get(k).push(b); }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1)).map(([k, bs]) => ({ key: k, n: bs.length, mean: +mean(bs, (b) => b.total).toFixed(1), pass: bs.filter((b) => b.pass).length, passShare: +(bs.filter((b) => b.pass).length / bs.length).toFixed(3), below: bs.filter((b) => !b.pass).map((b) => b.id) }));
  };
  const hist = {};
  for (const b of buildings) { const bin = b.total >= 95 ? '95-100' : b.total >= 90 ? '90-94' : b.total >= 85 ? '85-89' : b.total >= 80 ? '80-84' : b.total >= 70 ? '70-79' : b.total >= 50 ? '50-69' : '0-49'; hist[bin] = (hist[bin] || 0) + 1; }
  const categoryMeans = Object.fromEntries(CATEGORIES.map((k) => [k, +mean(buildings, (b) => b.ratings[k]).toFixed(2)]));
  const failedChecks = {};
  for (const b of buildings) for (const k of CATEGORIES) for (const c of b.checks[k]) if (!c.ok) { const key = `${k}: ${c.text.replace(/[\d.]+%?/g, '#').slice(0, 60)}`; failedChecks[key] = (failedChecks[key] || 0) + 1; }
  const summary = {
    buildings: buildings.length, ordinary: ordinary.length, special: specials.length,
    mean: +mean(buildings, (b) => b.total).toFixed(1), meanOrdinary: +mean(ordinary, (b) => b.total).toFixed(1),
    ordinaryAt85: ordinary.filter((b) => b.pass).length, ordinaryShare: +(ordinary.length ? ordinary.filter((b) => b.pass).length / ordinary.length : 0).toFixed(3),
    specialAt90: specials.filter((b) => b.pass).length, hardFailures: buildings.filter((b) => b.hard.length).length,
    histogram: hist, categoryMeans, byDistrict: group((b) => b.district), byProgram: group((b) => b.program), byPurpose: group((b) => b.purposeKind),
    failedChecks: Object.entries(failedChecks).sort((a, b) => b[1] - a[1]).slice(0, 25),
    genMs: { mean: +mean(buildings.filter((b) => b.genMs != null), (b) => b.genMs).toFixed(2), max: Math.max(0, ...buildings.map((b) => b.genMs || 0)), overBudget: buildings.filter((b) => b.genMs != null && b.genMs > (BUDGET_MS[b.kind] || 25)).map((b) => `${b.id}:${b.genMs}`) },
    nondeterministic: buildings.filter((b) => !b.deterministic).map((b) => b.id),
    districtAmbience: DISTRICT_AMBIENCE_IMPLEMENTED,
  };
  return { seed: o.seed ?? layout.seed ?? 1337, weights: WEIGHTS, thresholds: THRESHOLDS, summary, buildings };
}

export function formatScores(rep) {
  const s = rep.summary;
  const L = [];
  L.push('# Building rubric scores', '', `Spec 17 weights, ten categories rated 0-5 from automated evidence (\`scripts/score-buildings.mjs\`), seed ${rep.seed}.`, '');
  L.push(`- Buildings scored: **${s.buildings}** (${s.ordinary} ordinary, ${s.special} special: Senate, passenger port, Jedi precinct)`);
  L.push(`- Mean score: **${s.mean}** (ordinary ${s.meanOrdinary})`);
  L.push(`- Ordinary buildings at the 85 threshold (no category below 3, floor plan / interactions / NPC >= 4): **${s.ordinaryAt85}/${s.ordinary} (${pct(s.ordinaryShare)})**`);
  L.push(`- Special buildings at the 90 threshold (no category below 4): **${s.specialAt90}/${s.special}**`);
  L.push(`- Hard failures: **${s.hardFailures}**; non-deterministic rebuilds: ${s.nondeterministic.length}; warm builds over budget: ${s.genMs.overBudget.length} (mean ${s.genMs.mean} ms, max ${s.genMs.max} ms)`);
  L.push(`- Lighting and sound is capped at 4/5 for every building: district ambience is not implemented (\`src/audio.js\` carries only the frontier-town ambience). Required audio is listed here as incomplete, not averaged away.`, '');
  L.push('## Distribution', '', '| Score | Buildings |', '|---|---:|');
  for (const bin of ['95-100', '90-94', '85-89', '80-84', '70-79', '50-69', '0-49']) L.push(`| ${bin} | ${s.histogram[bin] || 0} |`);
  L.push('', '## Category means (0-5)', '', '| Category | Weight | Mean |', '|---|---:|---:|');
  for (const k of CATEGORIES) L.push(`| ${LABELS[k]} | ${WEIGHTS[k]} | ${s.categoryMeans[k]} |`);
  const table = (title, rows) => { L.push('', `## ${title}`, '', '| ' + title.split(' ')[1] + ' | Buildings | Mean | At threshold | Share |', '|---|---:|---:|---:|---:|'); for (const r of rows) L.push(`| ${r.key} | ${r.n} | ${r.mean} | ${r.pass} | ${pct(r.passShare)} |`); };
  table('Per district', s.byDistrict);
  table('Per program', s.byProgram);
  L.push('', '## Most frequent failed checks', '', '| Check | Buildings |', '|---|---:|');
  for (const [k, n] of s.failedChecks) L.push(`| ${k} | ${n} |`);
  const below = rep.buildings.filter((b) => !b.pass).sort((a, b) => a.total - b.total || a.id - b.id);
  L.push('', `## Below threshold (${below.length})`, '');
  if (!below.length) L.push('none');
  for (const b of below) {
    L.push(`### Lot ${b.id} - ${b.sign || b.name} (${b.purposeKind || b.family}, ${b.district}${b.program ? `, program ${b.program}` : ''}) - ${b.total}/${b.threshold}`);
    if (b.hard.length) L.push(`- HARD FAILURE: ${b.hard.join('; ')}`);
    for (const f of b.failing) L.push(`- ${LABELS[f.category]} ${f.rating}/5 (needs ${f.min}): ${f.reasons.join('; ')}`);
    if (!b.failing.length && !b.hard.length) L.push(`- total below ${b.threshold}: ${CATEGORIES.filter((k) => b.ratings[k] < 5).map((k) => `${k} ${b.ratings[k]}`).join(', ')}`);
    L.push('');
  }
  L.push('## Every building', '', '| Lot | Name | Purpose | District | Program | ' + CATEGORIES.map((k) => k.slice(0, 5)).join(' | ') + ' | Total | Pass |', '|---:|---|---|---|---|' + CATEGORIES.map(() => '---:').join('|') + '|---:|---|');
  for (const b of rep.buildings) L.push(`| ${b.id} | ${b.sign || b.name} | ${b.purposeKind || ''} | ${b.district} | ${b.program || ''} | ${CATEGORIES.map((k) => b.ratings[k]).join(' | ')} | ${b.total} | ${b.pass ? 'yes' : (b.hard.length ? 'HARD' : 'no')} |`);
  return L.join('\n') + '\n';
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const layout = city(parseInt(a.seed || '1337', 10));
  const t0 = performance.now();
  if (a.lot !== undefined) {
    const ctx = scoringContext(layout);
    const p = ctx.profs.get(parseInt(a.lot, 10));
    if (!p) { console.error(`no playable lot ${a.lot}`); process.exit(2); }
    const s = scoreLot(p, ctx, { rebuild: true });
    console.log(`lot ${s.id} "${s.sign}" ${s.purposeKind || s.family} ${s.district} program ${s.program || 'none'}: ${s.total}/${s.threshold} ${s.pass ? 'PASS' : 'FAIL'}${s.hard.length ? ' HARD: ' + s.hard.join('; ') : ''}`);
    for (const k of CATEGORIES) { console.log(`  ${LABELS[k].padEnd(36)} ${s.ratings[k]}/5  (weight ${WEIGHTS[k]})`); for (const c of s.checks[k]) console.log(`      ${c.ok ? '+' : '-'} ${c.text}`); }
    process.exit(s.pass ? 0 : 1);
  }
  const rep = scoreAll(layout, { seed: parseInt(a.seed || "1337", 10), rebuild: !a["no-rebuild"], onProgress: a.verbose ? (i, n) => { if (i % 50 === 0 || i === n) process.stderr.write(`  scored ${i}/${n}\n`); } : null });
  const ms = performance.now() - t0;
  const s = rep.summary;
  console.log(`building rubric: ${s.buildings} buildings, mean ${s.mean}, ordinary at 85: ${s.ordinaryAt85}/${s.ordinary} (${pct(s.ordinaryShare)}), special at 90: ${s.specialAt90}/${s.special}, hard failures ${s.hardFailures}  [${(ms / 1000).toFixed(1)} s]`);
  console.log(`  histogram: ${Object.entries(s.histogram).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`  category means: ${CATEGORIES.map((k) => `${k} ${s.categoryMeans[k]}`).join(', ')}`);
  console.log(`  warm build: mean ${s.genMs.mean} ms, max ${s.genMs.max} ms, over budget ${s.genMs.overBudget.length}; non-deterministic ${s.nondeterministic.length}`);
  console.log('  failed checks:'); for (const [k, n] of s.failedChecks.slice(0, 15)) console.log(`    ${String(n).padStart(4)}  ${k}`);
  const below = rep.buildings.filter((b) => !b.pass);
  if (below.length) { console.log(`  below threshold (${below.length}):`); for (const b of below.slice(0, a.verbose ? 500 : 30)) console.log(`    lot ${String(b.id).padStart(3)} ${String(b.total).padStart(5)}/${b.threshold} ${(b.purposeKind || b.family).padEnd(18)} ${b.district.padEnd(13)} ${b.hard.length ? 'HARD ' + b.hard.join('; ') : b.failing.map((f) => `${f.category} ${f.rating}<${f.min}`).join(', ')}`); }
  if (!a['no-write']) {
    const out = a.out || 'docs/overhaul/scores';
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/scores.json`, JSON.stringify(rep, null, 1));
    writeFileSync(`${out}/scores.md`, formatScores(rep));
    console.log(`  wrote ${out}/scores.json and ${out}/scores.md`);
  }
  process.exit(s.ordinaryShare >= 0.9 && s.hardFailures === 0 ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
