// Program -> host mapping (rubric 16 A3, A4). Three routes, in priority order: a landmark family named by a program,
// a lot assigned deterministically from the layout (programs without a natural purpose kind: the criminal-front
// freight brokerage), and the lot's purpose kind (purposeFor is read only; the CATALOGUE there is another builder's).
// Everything is a pure function of the layout: no Math.random.
import { PROGRAMS } from './catalogue.js';
import { purposeFor } from '../purposes.js';

export const KIND_TO_PROGRAM = {};
export const FAMILY_TO_PROGRAM = {};
for (const p of PROGRAMS) {
  for (const k of p.hosts.kinds) KIND_TO_PROGRAM[k] = p.id;
  for (const f of p.hosts.families) FAMILY_TO_PROGRAM[f] = p.id;
}

// Office-category purpose kinds a freight brokerage can plausibly trade behind
const BROKERAGE_KINDS = ['office', 'insurance', 'trade_house', 'law_office', 'tech_firm', 'advertising_agency', 'holonet_office', 'licensing_office'];
const BROKERAGE_HOSTS = 2;

const ASSIGNED = new WeakMap();
// lots that host a program by assignment rather than by purpose kind: Map lotId -> programId
export function assignedHosts(layout) {
  let m = ASSIGNED.get(layout);
  if (m) return m;
  m = new Map();
  // the brokerage sits on the spaceport / industrial edge: the industrial-sector office tower nearest the spaceport
  // centre, and the trade house nearest the spaceport (a trading house is what a freight brokerage calls itself)
  const port = layout.districts.find((d) => d.kind === 'spaceport');
  const cx = port ? (port.x0 + port.x1) / 2 : 2600, cz = port ? (port.z0 + port.z1) / 2 : 0;
  const byDist = (lots) => lots.map((l) => ({ l, d: Math.hypot((l.x0 + l.x1) / 2 - cx, (l.z0 + l.z1) / 2 - cz) })).sort((a, b) => a.d - b.d || a.l.id - b.l.id).map((c) => c.l);
  const towers = layout.lots.filter((l) => l.kind === 'tower');
  const industrial = byDist(towers.filter((l) => (l.district === 'industrial' || l.district === 'spaceport') && BROKERAGE_KINDS.includes(purposeFor(l, layout).kind)));
  const tradeHouses = byDist(towers.filter((l) => purposeFor(l, layout).kind === 'trade_house'));
  const picks = [];
  if (industrial.length) picks.push(industrial[0]);
  for (const l of tradeHouses) { if (picks.length >= BROKERAGE_HOSTS) break; if (!picks.includes(l)) picks.push(l); }
  for (const l of industrial) { if (picks.length >= BROKERAGE_HOSTS) break; if (!picks.includes(l)) picks.push(l); }
  for (const l of picks) m.set(l.id, 'criminal_front');
  ASSIGNED.set(layout, m);
  return m;
}

export function programIdFor(lot, purpose, layout) {
  if (!lot || (lot.kind !== 'tower' && lot.kind !== 'landmark')) return null;
  if (lot.kind === 'landmark' && FAMILY_TO_PROGRAM[lot.family]) return FAMILY_TO_PROGRAM[lot.family];
  if (layout) { const a = assignedHosts(layout).get(lot.id); if (a) return a; }
  const kind = purpose ? purpose.kind : (layout ? purposeFor(lot, layout).kind : null);
  return (kind && KIND_TO_PROGRAM[kind]) || null;
}

// every host lot of a program in this layout (towers and landmarks), in lot-id order
export function hostsOf(programId, layout) {
  const out = [];
  for (const l of layout.lots) {
    if (l.kind !== 'tower' && l.kind !== 'landmark') continue;
    if (programIdFor(l, null, layout) === programId) out.push(l);
  }
  return out;
}

// { programId: [lot, ...] } for the whole layout
export function hostTable(layout) {
  const t = Object.fromEntries(PROGRAMS.map((p) => [p.id, []]));
  for (const l of layout.lots) {
    if (l.kind !== 'tower' && l.kind !== 'landmark') continue;
    const id = programIdFor(l, null, layout);
    if (id) t[id].push(l);
  }
  return t;
}
