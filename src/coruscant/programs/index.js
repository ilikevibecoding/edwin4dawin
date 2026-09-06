// Programs API (docs/ROUND6_PLAN.md shared contract, rubric 16 A1):
//   programFor(lot, purpose, layout) -> { id, name, address, owner, purpose, staff, customers, circulation, roomGraph,
//                                          materials, interactions, inputs, outputs, ... } | null
// Pure and deterministic: the record is a function of the lot (seed, district, kind), the purpose (read only) and
// the layout. The blueprint side (rooms actually built) is programs/apply.js; the completion tests, dossiers,
// similarity tool and scorer under scripts/ consume both.
import { B } from '../../blocks.js';
import { RNG } from '../../rng.js';
import { personName } from '../../npc/coruscant/names.js';
import { purposeFor } from '../purposes.js';
import { PROGRAMS, PROGRAM_BY_ID, INTERACTIONS, EXTENDED_MIN_ROOMS } from './catalogue.js';
import { programIdFor, hostsOf, hostTable, assignedHosts, KIND_TO_PROGRAM, FAMILY_TO_PROGRAM } from './hosts.js';

export { PROGRAMS, PROGRAM_BY_ID, INTERACTIONS, EXTENDED_MIN_ROOMS, programIdFor, hostsOf, hostTable, assignedHosts, KIND_TO_PROGRAM, FAMILY_TO_PROGRAM };

const DISTRICT_LABEL = { senate: 'Senate District', financial: 'Financial District', residential: 'Residential Terraces', entertainment: 'Entertainment District', market: 'Market Quarter', industrial: 'Industrial Sector', spaceport: 'Spaceport Approach' };

// palette names -> block ids, with the program's per-district overrides (material identity consistent with the district)
export function materialsFor(program, district) {
  const names = { ...program.palette, ...((program.districtPalette && program.districtPalette[district]) || {}) };
  const ids = {}; for (const k of Object.keys(names)) ids[k] = names[k] ? B[names[k]] : null;
  return { names, ids };
}

export function addressOf(lot) {
  const lvl = lot.x0 !== undefined ? Math.round(((lot.x0 + lot.x1) / 2) / 100) : 0;
  return `Lot ${lot.id}, Block ${lot.block ?? '?'}, ${DISTRICT_LABEL[lot.district] || lot.district}, grid ${Math.round((lot.x0 + lot.x1) / 2)}/${Math.round((lot.z0 + lot.z1) / 2)}, sector ${lvl}`;
}

// deterministic owner: a person name from the lot seed, using W4's generator read only
export function ownerOf(lot, program) {
  const rng = new RNG((lot.seed ^ 0x9e3779b9) >>> 0);
  const female = rng.chance(0.5);
  return { name: personName(rng, female, null), title: program ? program.ownerTitle : 'Proprietor', female };
}

// lot-seeded variant index (0..n-1) - a variation axis the templates and the room selection read
export const variantOf = (lot, n = 3) => new RNG((lot.seed ^ 0x2545f491) >>> 0).int(0, n - 1);

// purpose kind -> playable lots of that kind, once per layout
const KIND_INDEX = new WeakMap();
function lotsByKind(layout) {
  let m = KIND_INDEX.get(layout);
  if (m) return m;
  m = new Map();
  if (Array.isArray(layout.lots)) for (const l of layout.lots) {
    if (l.kind !== 'tower' && l.kind !== 'landmark') continue;
    const k = purposeFor(l, layout).kind;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(l);
  }
  KIND_INDEX.set(layout, m);
  return m;
}

const DIR = (dx, dz) => (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'));

/**
 * The story of one building: the local problem (the program's pool, picked by the lot variant) and the connection to
 * another location - the program's words plus the nearest building of the kinds it connects to, named, with the
 * distance in blocks and the direction, so the dossier points at a place that exists in this layout.
 */
export function storyFor(lot, prog, variant, layout) {
  const st = prog.story || {};
  const pool = st.problems && st.problems.length ? st.problems : [st.problem];
  const problem = pool[variant % pool.length];
  let place = null;
  if (layout && st.connectsTo && Array.isArray(layout.lots)) {
    const idx = lotsByKind(layout);
    const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
    let best = null;
    for (const k of st.connectsTo) for (const o of idx.get(k) || []) {
      if (o.id === lot.id) continue;
      const d = Math.hypot((o.x0 + o.x1) / 2 - cx, (o.z0 + o.z1) / 2 - cz);
      if (!best || d < best.d) best = { o, d, k };
    }
    if (best) {
      const op = purposeFor(best.o, layout);
      place = { lotId: best.o.id, name: op.name, kind: best.k, district: best.o.district, blocks: Math.max(1, Math.round(best.d / 40)), direction: DIR((best.o.x0 + best.o.x1) / 2 - cx, (best.o.z0 + best.o.z1) / 2 - cz) };
    }
  }
  const connection = place ? `${st.connection}: ${place.name} (lot ${place.lotId}, ${place.blocks} block${place.blocks === 1 ? '' : 's'} ${place.direction})` : st.connection;
  return { problem, connection, place, resolutions: st.resolutions || null, connectsTo: st.connectsTo || [] };
}

export function programFor(lot, purpose = null, layout = null) {
  if (!lot) return null;
  const p = purpose || (layout ? purposeFor(lot, layout) : null);
  const id = programIdFor(lot, p, layout);
  if (!id) return null;
  const prog = PROGRAM_BY_ID[id];
  const mats = materialsFor(prog, lot.district);
  const owner = ownerOf(lot, prog);
  const variant = variantOf(lot);
  // programs with several households / featured rooms: the variant chooses which one is the signature room
  const featured = prog.featured ? prog.featured[variant % prog.featured.length] : null;
  // the trades of a purpose kind that need a room the program's list has not got (a bakery's ovens) are appended
  const base = prog.byKind && p && prog.byKind[p.kind] ? prog.rooms.concat(prog.byKind[p.kind]) : prog.rooms;
  const rooms = featured ? base.map((r) => ({ ...r, signature: r.kind === featured })) : base;
  const interactions = {};
  for (const r of rooms) interactions[r.kind] = r.interactions.slice();
  // a shop's flows are the goods its purpose advertises
  const sold = p && p.sells ? p.sells.map((s) => s.item) : [];
  const inputs = prog.inputs === 'sells' ? sold.slice() : prog.inputs.slice();
  const outputs = prog.outputs === 'sells' ? sold.slice() : prog.outputs.slice();
  return {
    id, name: prog.name, special: !!prog.special, generic: !!prog.generic,
    address: addressOf(lot), owner,
    purpose: p ? { kind: p.kind, category: p.category, name: p.name, hours: p.hours, greeting: p.greeting } : null,
    staff: p ? p.roles.filter((r) => r.job !== 'patron' && r.job !== 'resident' && r.job !== 'visitor').map((r) => ({ job: r.job, count: r.count, rooms: r.rooms })) : [],
    customers: prog.customers,
    circulation: prog.circulation,
    roomGraph: prog.graph.map(([a, b]) => [a, b]),
    rooms, featured,
    materials: mats.names, materialIds: mats.ids,
    interactions,
    inputs, outputs, wants: prog.wants.slice(),
    story: storyFor(lot, prog, variant, layout), schedule: prog.schedule || null,
    variant,
  };
}

export const programOf = (id) => PROGRAM_BY_ID[id] || null;
