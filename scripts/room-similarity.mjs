// The four-differences rule (docs/overhaul/SPEC.md section 6, rubric 16 E16-E17).
//
//   node scripts/room-similarity.mjs [--seed 1337] [--json out.json] [--verbose] [--kind apartments]
//
// Every pair of same-kind buildings (kind = purposeFor(lot).kind) is compared on seven axes. An axis counts as a
// meaningful difference only past the threshold documented next to it; names, object ids and rotations never count
// (the graph axis reads the room graph shape, not room names). A pair passes with >= 4 differing axes including at
// least one spatial axis (graph, massing, entry, signature room) and one functional axis (staff, interactions,
// signature room). The report lists the pairs checked per kind and the closest pair per kind with every axis; the
// exit code is non-zero when any pair fails. Exported for scripts/test-programs.mjs and scripts/dossiers.mjs.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../src/blocks.js';
import { city, parseArgs } from './programs/_lib.mjs';
import { profiles, playableLots } from './programs/_profile.mjs';

const rel = (a, b) => (Math.max(a, b) ? Math.abs(a - b) / Math.max(a, b) : 0);
const symDiff = (A, Bs) => { let n = 0; for (const x of A) if (!Bs.has(x)) n++; for (const x of Bs) if (!A.has(x)) n++; return n; };
const jaccard = (A, Bs) => { let i = 0; for (const x of A) if (Bs.has(x)) i++; const u = A.size + Bs.size - i; return u ? i / u : 1; };
const l1 = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - (b[i] || 0)), 0);
const name = (id) => (BLOCKS[id] ? BLOCKS[id].name : String(id));
const GENERIC_VERBS = new Set(['talk to staff', 'use the lift', 'leave by the service door']);

// The seven axes. Each returns { differs, distance, a, b, why } - `why` names the measure that crossed its threshold.
export const AXES = {
  // spatial: room graph shape - node/edge counts, degree histogram, and the set of room functions
  graph: {
    spatial: true,
    fn(p, q) {
      const kinds = (x) => new Set(x.rooms.map((r) => r.kind));
      const dn = rel(p.graph.nodes, q.graph.nodes), de = rel(p.graph.edges, q.graph.edges), dh = l1(p.graph.degHist, q.graph.degHist), jk = jaccard(kinds(p), kinds(q));
      const why = [];
      if (dn >= 0.15) why.push(`node count ${p.graph.nodes} vs ${q.graph.nodes}`);
      if (de >= 0.15) why.push(`edge count ${p.graph.edges} vs ${q.graph.edges}`);
      if (dh >= 0.25) why.push(`degree histogram L1 ${dh.toFixed(2)}`);
      if (jk <= 0.6) why.push(`room functions Jaccard ${jk.toFixed(2)}`);
      return { differs: why.length > 0, distance: Math.max(dn, de, dh, 1 - jk), a: `${p.graph.nodes} nodes / ${p.graph.edges} edges, deg [${p.graph.degHist.join(' ')}]`, b: `${q.graph.nodes} nodes / ${q.graph.edges} edges, deg [${q.graph.degHist.join(' ')}]`, why };
    },
  },
  // material identity: at least two of the six blocks that carry the building's palette differ
  palette: {
    fn(p, q) {
      const A = new Set(p.palette), Bs = new Set(q.palette), sd = symDiff(A, Bs);
      return { differs: sd >= 4, distance: sd / 12, a: p.palette.map(name).join(', '), b: q.palette.map(name).join(', '), why: sd >= 4 ? [`${sd / 2} of 6 identity blocks differ`] : [] };
    },
  },
  // spatial and functional: the signature room - its kind, its floor, or its floor area (>= 30 %)
  signature: {
    spatial: true, functional: true,
    fn(p, q) {
      const a = p.signature, b = q.signature;
      if (!a || !b) return { differs: !!a !== !!b, distance: a || b ? 1 : 0, a: a ? a.kind : 'none', b: b ? b.kind : 'none', why: a || b ? ['one has no signature room'] : [] };
      const why = [];
      if (a.kind !== b.kind) why.push(`kind ${a.kind} vs ${b.kind}`);
      if (a.f !== b.f) why.push(`floor ${a.f} vs ${b.f}`);
      if (rel(a.area, b.area) >= 0.3) why.push(`floor area ${a.area} vs ${b.area}`);
      return { differs: why.length > 0, distance: Math.max(a.kind !== b.kind ? 1 : 0, a.f !== b.f ? 0.5 : 0, rel(a.area, b.area)), a: `${a.kind} f${a.f} ${a.area} cells`, b: `${b.kind} f${b.f} ${b.area} cells`, why };
    },
  },
  // functional: the staffed stations - at least two work kinds differ, or the head count differs by >= 25 %
  staff: {
    functional: true,
    fn(p, q) {
      const A = new Set(Object.keys(p.staff.kinds)), Bs = new Set(Object.keys(q.staff.kinds)), sd = symDiff(A, Bs), dt = rel(p.staff.total, q.staff.total);
      const why = [];
      if (sd >= 2) why.push(`${sd} work kinds differ`);
      if (dt >= 0.25) why.push(`stations ${p.staff.total} vs ${q.staff.total}`);
      return { differs: why.length > 0, distance: Math.max(Math.min(1, sd / 6), dt), a: `${p.staff.total} stations: ${[...A].sort().join(', ')}`, b: `${q.staff.total} stations: ${[...Bs].sort().join(', ')}`, why };
    },
  },
  // functional: the player interactions evidenced in the rooms - two verbs differ (something you can do here and
  // not there), or the mix of interactions across the building differs (total-variation distance of the verb
  // distribution >= 0.15: at least 15 % of what the building offers is a different activity)
  interactions: {
    functional: true,
    fn(p, q) {
      // the verbs a room offers and evidences (profile.rooms[].verbs); talking to whoever works there is not an activity
      const vs = (x) => new Set([...x.verbs].filter((v) => !GENERIC_VERBS.has(v)));
      const A = vs(p), Bs = vs(q), sd = symDiff(A, Bs);
      const verbs = [...new Set([...A, ...Bs])];
      const dist = (x) => { const tot = verbs.reduce((s, v) => s + (x.interactions[v] || 0), 0) || 1; return verbs.map((v) => (x.interactions[v] || 0) / tot); };
      const tv = 0.5 * l1(dist(p), dist(q));
      const why = [];
      if (sd >= 2) why.push(`${sd} verbs differ`);
      if (tv >= 0.15) why.push(`interaction mix TV ${tv.toFixed(2)}`);
      const top = (x) => Object.entries(x.interactions).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, n]) => `${v} x${n}`).join(', ');
      return { differs: why.length > 0, distance: Math.max(Math.min(1, sd / 6), Math.min(1, tv * 3)), a: `${A.size} verbs; ${top(p)}`, b: `${Bs.size} verbs; ${top(q)}`, why };
    },
  },
  // spatial: floor count and massing - family, >= 2 floors, footprint area >= 20 %, height >= 15 %
  massing: {
    spatial: true,
    fn(p, q) {
      const why = [];
      if (p.family !== q.family) why.push(`family ${p.family} vs ${q.family}`);
      if (Math.abs(p.floors - q.floors) >= 2) why.push(`floors ${p.floors} vs ${q.floors}`);
      if (rel(p.area, q.area) >= 0.2) why.push(`footprint ${p.w}x${p.d} vs ${q.w}x${q.d}`);
      if (rel(p.height, q.height) >= 0.15) why.push(`height ${p.height} vs ${q.height}`);
      return { differs: why.length > 0, distance: Math.max(p.family !== q.family ? 1 : 0, Math.min(1, Math.abs(p.floors - q.floors) / 4), rel(p.area, q.area), rel(p.height, q.height)), a: `${p.family}, ${p.floors} floors, ${p.w}x${p.d}x${p.height}`, b: `${q.family}, ${q.floors} floors, ${q.w}x${q.d}x${q.height}`, why };
    },
  },
  // spatial: the entry arrangement - door side, door count, service door, mid-level door, lobby kind or area (>= 30 %), lifts
  entry: {
    spatial: true,
    fn(p, q) {
      const a = p.entry, b = q.entry, why = [];
      if (a.side !== b.side) why.push(`door side ${a.side} vs ${b.side}`);
      if (a.doors !== b.doors) why.push(`doors ${a.doors} vs ${b.doors}`);
      if (a.serviceDoor !== b.serviceDoor) why.push(`service door ${a.serviceDoor} vs ${b.serviceDoor}`);
      if (a.midDoor !== b.midDoor) why.push(`mid-level door ${a.midDoor} vs ${b.midDoor}`);
      if ((a.lobby ? a.lobby.kind : '') !== (b.lobby ? b.lobby.kind : '')) why.push(`lobby ${a.lobby ? a.lobby.kind : 'none'} vs ${b.lobby ? b.lobby.kind : 'none'}`);
      else if (a.lobby && b.lobby && rel(a.lobby.area, b.lobby.area) >= 0.3) why.push(`lobby area ${a.lobby.area} vs ${b.lobby.area}`);
      if (a.lifts !== b.lifts) why.push(`lifts ${a.lifts} vs ${b.lifts}`);
      const desc = (e) => `door ${e.side}, ${e.doors} door(s)${e.serviceDoor ? ' + service' : ''}${e.midDoor ? ' + mid-level' : ''}, lobby ${e.lobby ? `${e.lobby.kind} ${e.lobby.w}x${e.lobby.d}` : 'none'}, ${e.lifts} lift(s)`;
      return { differs: why.length > 0, distance: Math.min(1, why.length / 3), a: desc(a), b: desc(b), why };
    },
  },
};
export const AXIS_NAMES = Object.keys(AXES);
export const MIN_DIFFERENCES = 4;

export function compare(p, q) {
  const axes = {};
  let differences = 0, spatial = 0, functional = 0, distance = 0;
  for (const k of AXIS_NAMES) {
    const r = AXES[k].fn(p, q);
    axes[k] = r;
    if (r.differs) { differences++; if (AXES[k].spatial) spatial++; if (AXES[k].functional) functional++; }
    distance += r.distance;
  }
  return { differences, spatial, functional, distance, axes, ok: differences >= MIN_DIFFERENCES && spatial >= 1 && functional >= 1 };
}

/**
 * The whole layout: pairs per kind, closest pair per kind, failing pairs, and each building's nearest sibling with
 * the axes on which it differs (the dossier's "what makes it different from its siblings").
 */
export function similarityReport(layout, o = {}) {
  const profs = profiles(layout, o.onProgress);
  const lots = playableLots(layout);
  const byKind = new Map();
  for (const lot of lots) { const p = profs.get(lot.id); const k = p.purpose ? p.purpose.kind : `family:${p.family}`; if (o.kind && k !== o.kind) continue; if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(p); }
  const kinds = [], failing = [], nearest = new Map();
  const histogram = [0, 0, 0, 0, 0, 0, 0, 0];   // pairs by number of differing axes
  const axisRate = Object.fromEntries(AXIS_NAMES.map((k) => [k, 0]));
  let pairs = 0;
  for (const [kind, ps] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    let closest = null, n = 0;
    const fails = [];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const c = compare(ps[i], ps[j]);
      n++;
      histogram[c.differences]++;
      for (const k of AXIS_NAMES) if (c.axes[k].differs) axisRate[k]++;
      const rec = { a: ps[i].id, b: ps[j].id, ...c };
      if (!closest || c.differences < closest.differences || (c.differences === closest.differences && c.distance < closest.distance)) closest = rec;
      if (!c.ok) fails.push(rec);
      for (const [me, other] of [[ps[i], ps[j]], [ps[j], ps[i]]]) {
        const cur = nearest.get(me.id);
        if (!cur || c.differences < cur.differences || (c.differences === cur.differences && c.distance < cur.distance)) nearest.set(me.id, { sibling: other.id, siblingName: other.sign, differences: c.differences, distance: c.distance, axes: c.axes, ok: c.ok });
      }
    }
    pairs += n;
    failing.push(...fails.map((f) => ({ kind, ...f })));
    kinds.push({ kind, buildings: ps.length, pairs: n, failing: fails.length, closest });
  }
  for (const [kind, ps] of byKind) if (ps.length === 1) nearest.set(ps[0].id, null);
  for (const k of AXIS_NAMES) axisRate[k] = pairs ? +(axisRate[k] / pairs).toFixed(3) : 0;
  return { kinds, pairs, failing, ok: failing.length === 0, nearest, buildings: lots.length, histogram, axisRate };
}

export function formatPair(rec, verbose = false) {
  const lines = [`    lots ${rec.a} and ${rec.b}: ${rec.differences}/7 axes differ (${rec.spatial} spatial, ${rec.functional} functional) ${rec.ok ? 'OK' : 'FAIL'}`];
  for (const k of AXIS_NAMES) {
    const r = rec.axes[k];
    lines.push(`      ${r.differs ? '*' : ' '} ${k.padEnd(13)} ${r.differs ? r.why.join('; ') : 'same'}`);
    if (verbose || !r.differs) { lines.push(`                      a: ${r.a}`); lines.push(`                      b: ${r.b}`); }
  }
  return lines.join('\n');
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const layout = city(parseInt(a.seed || '1337', 10));
  const t0 = performance.now();
  const rep = similarityReport(layout, { kind: a.kind || null, onProgress: a.verbose ? (i, n) => { if (i % 50 === 0 || i === n) process.stderr.write(`  profiled ${i}/${n}\n`); } : null });
  const ms = performance.now() - t0;
  console.log(`four-differences rule: ${rep.buildings} buildings, ${rep.kinds.length} kinds, ${rep.pairs} same-kind pairs checked, ${rep.failing.length} failing  [${(ms / 1000).toFixed(1)} s]`);
  console.log(`  pairs by differing axes: ${rep.histogram.map((n, i) => `${i}:${n}`).join('  ')}`);
  console.log(`  share of pairs differing per axis: ${AXIS_NAMES.map((k) => `${k} ${(rep.axisRate[k] * 100).toFixed(0)}%`).join(', ')}`);
  for (const k of rep.kinds) {
    if (k.pairs === 0) { console.log(`  ${k.kind.padEnd(20)} ${String(k.buildings).padStart(3)} building(s), no pair`); continue; }
    console.log(`  ${k.kind.padEnd(20)} ${String(k.buildings).padStart(3)} buildings, ${String(k.pairs).padStart(4)} pairs, ${k.failing} failing; closest pair:`);
    console.log(formatPair(k.closest, !!a.verbose));
  }
  if (rep.failing.length) {
    console.log(`\nFAILING PAIRS (${rep.failing.length}):`);
    for (const f of rep.failing.slice(0, 40)) console.log(`  ${f.kind}\n${formatPair(f, true)}`);
  }
  if (a.json) writeFileSync(String(a.json), JSON.stringify({ ...rep, nearest: [...rep.nearest.entries()] }, (k, v) => (v instanceof Set ? [...v] : v), 1));
  console.log(rep.ok ? '\nPASS every same-kind pair differs on at least four axes (one spatial, one functional)' : `\nFAIL ${rep.failing.length} pair(s) below four differences`);
  process.exit(rep.ok ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
