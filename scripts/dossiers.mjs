// Design dossiers (docs/overhaul/SPEC.md section 6, rubric 16 D14-D15).
//
//   node scripts/dossiers.mjs [--seed 1337] [--out docs/overhaul/dossiers] [--lot 123] [--check] [--quiet]
//
// One markdown dossier per manifested playable building (docs/overhaul/dossiers/<lotId>.md) plus index.md. Every
// dossier is produced from the same offline evidence the completion tests, the four-differences rule and the scorer
// read: the program record (programFor), the purpose (read only), the blueprint profile (scripts/programs/_profile.mjs:
// rooms, room graph, palette, staff stations, evidenced interactions, entry), the similarity report (the nearest
// sibling and the axes on which the building differs from it) and the building's rubric score. Deterministic: no
// timestamps, no randomness; --check exits non-zero when a file on disk differs from what would be written.
//
// Sections (spec 6): name and address; owner; purpose; program; staff; customers; circulation (public and service,
// with the rooms actually built); room graph as a list of edges (the program's intended graph with how each edge is
// realised, then the built graph summarised by room-function pairs, then the full per-room edge list); material
// identity; interactions per room kind (offered and evidenced); economic inputs and outputs (GOODS keys); local
// problem; connection to another location (a named building of this layout with distance and direction); what makes
// it different from its siblings (the similarity tool's nearest same-kind building, axis by axis); rubric score.
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BLOCKS } from '../src/blocks.js';
import { GOODS } from '../src/economy/prices.js';
import { roomFunction, VISITOR_JOBS } from '../src/npc/coruscant/rooms.js';
import { JOB_WORK_KINDS } from '../src/npc/coruscant/lots.js';
import { city, parseArgs } from './programs/_lib.mjs';
import { playableLots } from './programs/_profile.mjs';
import { AXIS_NAMES, AXES } from './room-similarity.mjs';
import { scoringContext, scoreLot, CATEGORIES, LABELS, WEIGHTS } from './score-buildings.mjs';

const blockName = (id) => (BLOCKS[id] ? BLOCKS[id].name : String(id));
const title = (s) => String(s || '').replace(/_/g, ' ');
const pct = (x) => `${Math.round(x * 100)}%`;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const goodLabel = (g) => (GOODS[g] ? `\`${g}\` (${GOODS[g].name || g}, ${GOODS[g].cat})` : `\`${g}\` (NOT IN GOODS - see docs/overhaul/goods-requests.md)`);

// the room kinds of this building that host a role, in W4's placement order (scripts/score-buildings.mjs hosts())
function hostRooms(role, p) {
  const kinds = new Set(p.rooms.map((r) => r.kind));
  const out = new Set();
  for (const k of JOB_WORK_KINDS[role.job] || []) if (p.staff.kinds[k] > 0) for (const r of p.rooms) if (r.works > 0) out.add(r.kind);
  for (const k of role.rooms || []) if (kinds.has(k)) out.add(k);
  for (const k of kinds) if (roomFunction(k).jobs.some((j) => j.job === role.job)) out.add(k);
  return [...out].sort();
}

// a node of the built graph named for the reader: "kitchen f2 (x,z)" or "corridor f2 (n cells)"
function nodeLabel(p, id) {
  if (id < p.rooms.length) { const r = p.rooms[id]; return `${r.kind} f${r.f} (${r.x},${r.z})`; }
  const c = p.graph.corridors[id - p.rooms.length];
  return c ? `corridor f${c.f} (${c.cells} cells)` : `corridor #${id}`;
}
const nodeKind = (p, id) => (id < p.rooms.length ? p.rooms[id].kind : 'corridor');
const nodeFloor = (p, id) => (id < p.rooms.length ? p.rooms[id].f : (p.graph.corridors[id - p.rooms.length] || { f: 0 }).f);

// how an edge of the program's intended room graph is realised in the built plan: a direct doorway between rooms of
// the two kinds, a shared corridor or lobby, both kinds present but not adjacent, or a kind that was not built
function realised(p, a, b) {
  const rooms = p.rooms;
  const A = new Set(), Bs = new Set();
  rooms.forEach((r, i) => { if (r.kind === a) A.add(i); if (r.kind === b) Bs.add(i); });
  if (!A.size || !Bs.size) return `not built here (${[!A.size ? a : null, !Bs.size ? b : null].filter(Boolean).join(' and ')} missing)`;
  const adj = new Map();
  for (const [x, y] of p.graph.edgeList) { if (!adj.has(x)) adj.set(x, new Set()); if (!adj.has(y)) adj.set(y, new Set()); adj.get(x).add(y); adj.get(y).add(x); }
  for (const i of A) for (const j of Bs) if (adj.get(i) && adj.get(i).has(j)) return 'direct doorway';
  for (const i of A) for (const j of Bs) { const ni = adj.get(i), nj = adj.get(j); if (!ni || !nj) continue; for (const n of ni) if (nj.has(n)) return `through ${nodeKind(p, n) === 'corridor' ? 'the corridor' : `the ${title(nodeKind(p, n))}`}`; }
  return 'both present, not adjacent (reached along the circulation)';
}

export function dossierFor(lot, ctx, o = {}) {
  const p = ctx.profs.get(lot.id);
  const prog = p.programInfo;
  const rec = p.programRecord;
  const purpose = p.purpose;
  const near = ctx.sim.nearest.get(lot.id);
  const score = o.score || scoreLot(p, ctx, { rebuild: false });
  const L = [];
  const h = (t) => L.push('', `## ${t}`, '');
  const roles = purpose ? purpose.roles : [];
  const staffRoles = roles.filter((r) => !VISITOR_JOBS.has(r.job));
  const visitorRoles = roles.filter((r) => VISITOR_JOBS.has(r.job));
  const kinds = new Set(p.rooms.map((r) => r.kind));
  const built = new Set(rec ? rec.rooms.map((r) => r.kind) : []);
  const satisfied = new Map(rec ? rec.satisfied.map((s) => [s.kind, s.by]) : []);
  // circulation tokens that are not rooms: the street, the doors, the lift shafts and the stairs
  const present = (k) => kinds.has(k) || built.has(k) || satisfied.has(k) || k === 'street' || k === 'entry' || k === 'service_entry' || (/^lifts?$/.test(k) && p.entry.lifts > 0) || (/^stairs?$/.test(k) && p.rooms.some((r) => /stair/.test(r.kind)));

  L.push(`# ${p.sign || p.name}`, '', `Lot ${lot.id} (manifest id \`lot:${lot.id}\`) - ${prog ? `${prog.name} (\`${prog.id}\`, variant ${prog.variant}${rec ? `, ${rec.compact ? 'compact' : 'extended'}` : ''})` : 'no program'} - ${p.kind} of the ${p.family} family - ${cap(lot.district)} district`);

  h('Name and address');
  L.push(`- Name on the sign: **${p.sign || '(none)'}**${p.name && p.name !== p.sign ? ` (blueprint name: ${p.name})` : ''}`);
  L.push(`- Address: ${prog ? prog.address : `Lot ${lot.id}, ${lot.district}`}`);
  L.push(`- Massing: ${p.family}, ${p.floors} floor${p.floors === 1 ? '' : 's'}, ${p.w} x ${p.d} footprint, ${p.height} blocks high, entry from the ${p.entry.side} side (${p.entry.doors} door${p.entry.doors === 1 ? '' : 's'}${p.entry.serviceDoor ? ', one of them the service door' : ''}${p.entry.midDoor ? ', a mid-level door' : ''}), ${p.entry.lifts} lift${p.entry.lifts === 1 ? '' : 's'}`);
  L.push(`- Rooms: ${p.rooms.length} (${p.rooms.filter((r) => !r.circulation).length} occupied, ${p.rooms.filter((r) => r.circulation).length} circulation), ${kinds.size} room functions`);

  h('Owner');
  L.push(prog ? `**${prog.owner.name}**, ${prog.owner.title}. The name is drawn from the lot seed with \`src/npc/coruscant/names.js\`, so it is the same on every visit.` : 'No owner (no program).');

  h('Purpose');
  if (purpose) {
    L.push(`- Kind: \`${purpose.kind}\` (${purpose.category})`);
    L.push(`- Hours: ${purpose.hours ? `${purpose.hours[0]}:00-${purpose.hours[1]}:00` : 'always open'}`);
    if (prog && prog.purpose && prog.purpose.greeting) L.push(`- Greeting at the door: "${prog.purpose.greeting}"`);
    if (purpose.sells.length) L.push(`- On sale: ${purpose.sells.map((s) => `${s.item} at ${s.price}`).join(', ')}`);
    if (purpose.buys.length) L.push(`- Buys: ${purpose.buys.join(', ')}`);
  } else L.push('No purpose record.');

  h('Program');
  if (prog) {
    L.push(`${prog.name} (\`${prog.id}\`${prog.special ? ', special threshold 90' : ''}${prog.generic ? ', generic program' : ''}). Rooms the program asks for, with their function and what stands here:`, '');
    L.push('| Room | Function | Here |', '|---|---|---|');
    for (const r of prog.rooms) {
      const b = rec && rec.rooms.find((x) => x.kind === r.kind);
      const s = satisfied.get(r.kind);
      const state = b ? `built on floor ${b.floor}${b.signature ? ', signature room' : ''}${b.serviceDoor ? ', service door' : ''}${b.streetDoor ? ', own street door' : ''}` : s ? `the module's ${title(s)}` : rec && rec.missing.includes(r.kind) ? 'MISSING' : r.core ? 'not required (compact host)' : 'extended set, not on this host';
      L.push(`| \`${r.kind}\`${r.signature ? ' (signature)' : ''}${r.service ? ' (back of house)' : ''} | ${r.function} | ${state} |`);
    }
    if (rec && rec.adaptations && rec.adaptations.length) L.push('', `Adaptation rooms of this host (what this building has that its siblings need not): ${rec.adaptations.map((a) => `\`${a.kind}\`${a.floor !== undefined ? ` on floor ${a.floor}` : ''}`).join(', ')}.`);
  } else L.push('None.');

  h('Staff');
  if (staffRoles.length) {
    L.push('| Role | Count | Works in |', '|---|---:|---|');
    for (const r of staffRoles) { const hr = hostRooms(r, p); L.push(`| ${r.job} | ${r.count} | ${hr.length ? hr.map((k) => `\`${k}\``).join(', ') : 'no room hosts this role'} |`); }
    L.push('', `${p.staff.total} work stations in the blueprint: ${Object.entries(p.staff.kinds).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, n]) => `${k} x${n}`).join(', ') || 'none'}.`);
  } else L.push('No staff roles (the purpose lists visitors only).');

  h('Customers');
  L.push(prog ? cap(prog.customers) + '.' : 'Not described.');
  if (visitorRoles.length) L.push('', `Visitors the purpose brings: ${visitorRoles.map((r) => `${r.count} ${r.job}${r.count === 1 ? '' : 's'} (${r.rooms.join(', ')})`).join('; ')}. ${p.spots} idle spots${p.beds ? `, ${p.beds} beds` : ''}.`);

  h('Circulation');
  if (prog) {
    const route = (names) => names.map((k) => `${k}${present(k) ? '' : ' (not here)'}`).join(' -> ');
    L.push(`- Public: ${route(prog.circulation.public)}`);
    if (prog.circulation.service) L.push(`- Service: ${route(prog.circulation.service)}${rec && rec.serviceDoor ? ` - service door cut at (${rec.serviceDoor.x}, ${rec.serviceDoor.z})` : rec ? ' - no separate service door on this shell' : ''}`);
    if (prog.circulation.staff) L.push(`- Staff: ${route(prog.circulation.staff)}`);
    if (rec && rec.streetDoor) L.push(`- The ${title(rec.streetDoor.room)} has its own street door on the ${rec.streetDoor.side} side, beside the lobby.`);
  }
  L.push(`- Built: ${pct(p.reachShare)} of rooms reachable on foot from the public entry, ${p.floors <= 1 ? 'one floor' : `${p.entry.lifts} lift(s) spanning ${pct(p.entry.liftSpan)} of the height, ${p.rooms.filter((r) => /stair/.test(r.kind)).length} stair rooms`}, circulation ${pct(p.graph.corridorShare)} of the floor area, ${p.graph.deadEnds} dead-end room${p.graph.deadEnds === 1 ? '' : 's'} (${pct(p.graph.deadEndRatio)} of occupied rooms)`);

  h('Room graph');
  if (prog && prog.roomGraph.length) {
    L.push('The program\'s intended graph and how each edge is realised in this blueprint:', '');
    for (const [a, b] of prog.roomGraph) L.push(`- ${a} - ${b}: ${realised(p, a, b)}`);
    L.push('');
  }
  L.push(`Built graph: ${p.graph.nodes} nodes (${p.graph.roomNodes} rooms, ${p.graph.corridorNodes} corridor components), ${p.graph.edges} edges, ${p.graph.components} component${p.graph.components === 1 ? '' : 's'}, ${p.graph.isolatedRooms} room${p.graph.isolatedRooms === 1 ? '' : 's'} without a doorway. Degree histogram (share of rooms with 0, 1, 2, 3, 4+ doorways): ${p.graph.degHist.join(' / ')}.`, '');
  // by function pair with multiplicity, then every edge
  const pairs = new Map();
  for (const [a, b] of p.graph.edgeList) { const ka = nodeKind(p, a), kb = nodeKind(p, b); const key = ka < kb ? `${ka} - ${kb}` : `${kb} - ${ka}`; pairs.set(key, (pairs.get(key) || 0) + 1); }
  L.push('Edges by room function:', '');
  for (const [k, n] of [...pairs.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) L.push(`- ${k} x${n}`);
  const edges = p.graph.edgeList.slice().sort((e, f) => nodeFloor(p, e[0]) - nodeFloor(p, f[0]) || e[0] - f[0] || e[1] - f[1]);
  L.push('', '<details><summary>Every edge (room f&lt;floor&gt; (x,z) - room)</summary>', '');
  for (const [a, b] of edges) L.push(`- ${nodeLabel(p, a)} - ${nodeLabel(p, b)}`);
  L.push('', '</details>');

  h('Material identity');
  if (prog) L.push(`Program palette (${prog.id}, ${lot.district} district): ${Object.entries(prog.materials).map(([k, v]) => `${k} ${v || 'none'}`).join(', ')}.`, '');
  L.push(`The six blocks that carry the built identity (by count, structure and facade only): ${p.palette.map(blockName).join(', ')}. ${p.emissiveKinds} kinds of light.`);

  h('Interactions');
  L.push('| Room | Offered by the program | Evidenced in the blueprint |', '|---|---|---|');
  const byKind = new Map();
  for (const r of p.rooms) { if (!byKind.has(r.kind)) byKind.set(r.kind, { offered: new Set(), evidenced: new Set(), n: 0 }); const e = byKind.get(r.kind); r.offered.forEach((v) => e.offered.add(v)); r.verbs.forEach((v) => e.evidenced.add(v)); e.n++; }
  for (const [k, e] of [...byKind.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) L.push(`| \`${k}\`${e.n > 1 ? ` x${e.n}` : ''} | ${[...e.offered].join(', ') || '-'} | ${[...e.evidenced].join(', ') || '-'} |`);
  L.push('', `Distinct activities in the building: ${Object.keys(p.interactions).sort().join(', ') || 'none'}.`);

  h('Economic inputs and outputs');
  if (prog) {
    L.push(`- Inputs: ${prog.inputs.length ? prog.inputs.map(goodLabel).join(', ') : 'none'}`);
    L.push(`- Outputs: ${prog.outputs.length ? prog.outputs.map(goodLabel).join(', ') : 'none (a service consumed on the spot)'}`);
    if (purpose && purpose.buys.length) L.push(`- Buys (purpose): ${purpose.buys.join(', ')}`);
    if (prog.wants.length) L.push(`- Wants the economy has no good for (docs/overhaul/goods-requests.md): ${prog.wants.map((w) => `\`${w}\``).join(', ')}`);
    const supplied = prog.inputs.filter((g) => ctx.sellers.has(g) && [...ctx.sellers.get(g)].some((id) => id !== lot.id));
    if (prog.inputs.length) L.push(`- Suppliers in the city: ${supplied.length ? supplied.map((g) => `${g} from ${[...ctx.sellers.get(g)].filter((id) => id !== lot.id).length} building(s)`).join(', ') : 'none sells these inputs (the wholesale delivery is off-map)'}`);
  } else L.push('None.');

  h('Local problem');
  L.push(prog && prog.story && prog.story.problem ? cap(prog.story.problem) + '.' : (purpose && purpose.greeting ? `Nothing beyond the greeting: "${purpose.greeting}"` : 'None recorded.'));
  if (prog && prog.story && prog.story.resolutions) L.push('', `How it could resolve: ${prog.story.resolutions.join('; ')}.`);

  h('Connection to another location');
  if (prog && prog.story && prog.story.place) {
    const pl = prog.story.place;
    L.push(`${cap(prog.story.connection)}. [${pl.name}](${pl.lotId}.md) is a ${title(pl.kind)} in the ${pl.district} district, ${pl.blocks} block${pl.blocks === 1 ? '' : 's'} to the ${pl.direction}.`);
  } else L.push(prog && prog.story ? cap(prog.story.connection) + '.' : 'None recorded.');

  h('What makes it different from its siblings');
  if (!near) L.push(`The only \`${purpose ? purpose.kind : p.family}\` in this layout; no sibling to compare.`);
  else {
    L.push(`Nearest same-kind building: [${near.siblingName} (lot ${near.sibling})](${near.sibling}.md). The pair differs on ${near.differences}/7 axes${near.ok ? '' : ' - BELOW the four-differences rule'}:`, '');
    for (const k of AXIS_NAMES) { const r = near.axes[k]; L.push(`- ${r.differs ? '**' : ''}${k}${r.differs ? '**' : ''}${AXES[k].spatial ? ' (spatial)' : ''}${AXES[k].functional ? ' (functional)' : ''}: ${r.differs ? r.why.join('; ') : 'same'} - here ${r.a}; there ${r.b}`); }
  }
  if (p.signature) L.push('', `Signature room: \`${p.signature.kind}\` on floor ${p.signature.f}, ${p.signature.area} floor cells${p.signature.program ? ' (program-specific)' : ' (largest occupied room)'}.`);

  h('Rubric score');
  L.push(`**${score.total}/100** (threshold ${score.threshold}${score.pass ? ', passes' : ', BELOW THRESHOLD'})${score.hard.length ? ` - HARD FAILURE: ${score.hard.join('; ')}` : ''}`, '');
  L.push('| Category | Weight | Rating | Failed checks |', '|---|---:|---:|---|');
  for (const k of CATEGORIES) L.push(`| ${LABELS[k]} | ${WEIGHTS[k]} | ${score.ratings[k]}/5 | ${score.checks[k].filter((c) => !c.ok).map((c) => c.text).join('; ') || '-'} |`);
  L.push('');
  return L.join('\n');
}

export function indexFor(rows) {
  const L = ['# Building dossiers', '', `${rows.length} dossiers, one per manifested playable building (seed ${rows[0] ? rows[0].seed : 1337}), written by \`scripts/dossiers.mjs\` from the blueprint profile, the program record, the similarity report and the rubric score. Regenerate with \`node scripts/dossiers.mjs\`; \`--check\` verifies the files on disk are current.`, ''];
  const byDistrict = new Map();
  for (const r of rows) { if (!byDistrict.has(r.district)) byDistrict.set(r.district, []); byDistrict.get(r.district).push(r); }
  L.push('| District | Buildings | Programs | Mean score |', '|---|---:|---:|---:|');
  for (const [d, rs] of [...byDistrict.entries()].sort((a, b) => b[1].length - a[1].length)) L.push(`| ${d} | ${rs.length} | ${new Set(rs.map((r) => r.program)).size} | ${(rs.reduce((s, r) => s + r.total, 0) / rs.length).toFixed(1)} |`);
  L.push('', '| Lot | Name | Purpose | District | Program | Owner | Floors | Rooms | Nearest sibling | Score |', '|---:|---|---|---|---|---|---:|---:|---|---:|');
  for (const r of rows) L.push(`| ${r.id} | [${r.sign}](${r.id}.md) | ${r.purposeKind} | ${r.district} | ${r.program} | ${r.owner} | ${r.floors} | ${r.rooms} | ${r.nearest ? `[lot ${r.nearest.sibling}](${r.nearest.sibling}.md), ${r.nearest.differences}/7 axes` : 'only one of its kind'} | ${r.total}${r.pass ? '' : ' (below)'} |`);
  return L.join('\n') + '\n';
}

export function writeDossiers(layout, o = {}) {
  const out = o.out || 'docs/overhaul/dossiers';
  const ctx = scoringContext(layout, o);
  const lots = playableLots(layout).filter((l) => o.lot === undefined || l.id === o.lot);
  const rows = [];
  const files = new Map();
  for (const lot of lots) {
    const p = ctx.profs.get(lot.id);
    const score = scoreLot(p, ctx, { rebuild: false });
    files.set(`${lot.id}.md`, dossierFor(lot, ctx, { score }));
    const near = ctx.sim.nearest.get(lot.id);
    rows.push({ seed: layout.seed ?? o.seed ?? 1337, id: lot.id, sign: p.sign || p.name, purposeKind: p.purpose ? p.purpose.kind : p.family, district: lot.district, program: p.program || 'none', owner: p.programInfo ? p.programInfo.owner.name : '-', floors: p.floors, rooms: p.rooms.length, nearest: near ? { sibling: near.sibling, differences: near.differences } : null, total: score.total, pass: score.pass });
  }
  if (o.lot === undefined) files.set('index.md', indexFor(rows));
  let changed = 0, written = 0;
  if (!o.check) mkdirSync(out, { recursive: true });
  for (const [name, text] of files) {
    const path = `${out}/${name}`;
    const same = existsSync(path) && readFileSync(path, 'utf8') === text;
    if (same) continue;
    changed++;
    if (!o.check) { writeFileSync(path, text); written++; }
  }
  // stale dossiers of lots that no longer exist (a layout change) are reported, never silently kept
  const stale = o.lot === undefined && existsSync(out) ? readdirSync(out).filter((f) => /^\d+\.md$/.test(f) && !files.has(f)) : [];
  return { out, count: files.size, changed, written, stale, rows };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const layout = city(parseInt(a.seed || '1337', 10));
  const t0 = performance.now();
  const r = writeDossiers(layout, { out: a.out, lot: a.lot !== undefined ? parseInt(a.lot, 10) : undefined, check: !!a.check, seed: parseInt(a.seed || '1337', 10) });
  const ms = performance.now() - t0;
  if (a.lot !== undefined && !a.quiet) { console.log(readFileSync(`${r.out}/${a.lot}.md`, 'utf8')); }
  console.log(`dossiers: ${r.count} file(s) in ${r.out}, ${a.check ? `${r.changed} would change` : `${r.written} written, ${r.count - r.written} unchanged`}${r.stale.length ? `, ${r.stale.length} stale: ${r.stale.slice(0, 5).join(', ')}` : ''}  [${(ms / 1000).toFixed(1)} s]`);
  process.exit(a.check && (r.changed || r.stale.length) ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
