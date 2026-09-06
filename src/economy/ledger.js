// Sources-and-sinks ledger (rubric 15 #10): every stock or credit change in the city economy is one journal entry,
// and every entry is classified against the accounting boundary. Inside the boundary: businesses (funds + stock), the
// player's wallet (credits only - the item inventory is fed by the world, so it stays outside) and shipments in
// flight (cargo). Outside: offworld (imports / exports), the Republic treasury (allocations / levies), the households
// (wages out, spending in), the player's item inventory (retail sales out, purchases in), galactic clients (office
// income) and the void (consumed / disposed goods, on-site processing).
//
// An entry carries the boundary's signed wealth change split in two legs: dCredits (credits that crossed the boundary)
// and dStock (stock value that crossed it, at base prices). Each leg is posted to a source category (> 0) or a sink
// category (< 0) named by the transfer's reason, so a household meal batch is `household` spending in and
// `consumption` out. The honesty check is one identity that scripts/sim-economy.mjs and scripts/test-economy.mjs
// assert to the credit over multi-day runs:
//     sum(sources) - sum(sinks) == W(end) - W(start),   W = credits + stock x base price inside the boundary
// Nothing may change stock or funds without passing through Journal.record(), so a state-derived W that drifts
// from the journal's running sum is the proof that something spawned or vanished silently.
import { GOODS } from './prices.js';

export const OUTSIDE = new Set(['offworld', 'treasury', 'households', 'inventory', 'clients', 'void', 'admin']);
export const isInside = (account) => typeof account === 'number' || account === 'player' || (typeof account === 'string' && account.startsWith('shipment:'));
export const valueOf = (good, qty) => { const g = GOODS[good]; return g ? (g.base | 0) * (qty | 0) : 0; };

// Ledger categories (the labels the admin panel and the docs use). A reason names the category of its credit leg and
// of its goods leg; a leg whose category is missing lands in 'other' so nothing is ever hidden.
export const SOURCE_CATEGORIES = ['import', 'allocation', 'household', 'fees', 'clients', 'from_player', 'production', 'waste_collection', 'endowment', 'admin', 'export_sale', 'jobs', 'other'];
export const SINK_CATEGORIES = ['consumption', 'wages', 'maintenance', 'disposal', 'export', 'import_payment', 'retail', 'levy', 'creative', 'processing', 'other'];
const CATEGORY_OF = {
  // reason: [credits leg category, goods leg category]
  meals: ['household', 'consumption'], treatment: ['household', 'consumption'], domestic: ['household', 'consumption'], utility: ['household', 'consumption'],
  leisure: ['household', null], transit: ['household', null], rent: ['household', null], household: ['household', 'consumption'],
  wages: ['wages', null], income: ['clients', null], clients: ['clients', null], levy: ['levy', null], allocation: ['allocation', null], bond: ['allocation', null],
  import: [null, 'import'], 'import bill': ['import_payment', null], 'port fee': ['fees', null], fees: ['fees', null], fare: ['fees', null],
  consumption: [null, 'consumption'], eaten: [null, 'consumption'], maintenance: [null, 'maintenance'], repair: [null, 'maintenance'], disposal: [null, 'disposal'],
  processing: [null, 'processing'], production: [null, 'production'], waste: [null, 'waste_collection'],
  'player buy': [null, 'retail'], retail: [null, 'retail'], 'player sale': [null, 'from_player'], from_player: [null, 'from_player'], creative: [null, 'creative'],
  service: ['fees', null], export: ['export_sale', 'export'], endowment: ['endowment', 'endowment'], grant: ['admin', 'admin'], admin: ['admin', 'admin'], job: ['jobs', null], ride: ['household', null],
};
export function categoriesOf(reason) {
  const r = String(reason || '');
  const c = CATEGORY_OF[r] || CATEGORY_OF[r.split(':')[0]] || [null, null];
  return { credits: c[0] || 'other', goods: c[1] || 'other' };
}

export class Journal {
  constructor({ history = 400, keys = 600 } = {}) {
    this.seq = 0;
    this.entries = [];           // ring of the most recent entries (admin panel, tests)
    this.historySize = history;
    this.applied = new Map();    // idempotency keys of applied keyed transactions -> seq (bounded, persisted)
    this.keysSize = keys;
    this.totals = { sources: {}, sinks: {}, sourceSum: 0, sinkSum: 0, internal: 0, entries: 0 };
    this.days = new Map();       // day -> { sources, sinks, entries, byCat }
  }
  has(key) { return key != null && this.applied.has(key); }
  _post(cat, v, day) {
    const T = this.totals;
    if (v > 0) { T.sources[cat] = (T.sources[cat] || 0) + v; T.sourceSum += v; day.sources += v; }
    else if (v < 0) { T.sinks[cat] = (T.sinks[cat] || 0) - v; T.sinkSum -= v; day.sinks -= v; }
    if (v !== 0) day.byCat[cat] = (day.byCat[cat] || 0) + v;
  }
  // Records one applied transfer. `dCredits` / `dStock` are the boundary's signed changes (computed by the caller from
  // the accounts involved); returns the entry.
  record({ day, t, type, from, to, good, qty, credits, reason, key, dCredits, dStock }) {
    const dC = dCredits | 0, dS = dStock | 0, dW = dC + dS;
    const flow = dW > 0 ? 'source' : dW < 0 ? 'sink' : 'internal';
    const e = { id: ++this.seq, day: day | 0, t, type, from, to, good: good || null, qty: qty | 0, credits: credits | 0, reason: reason || '', flow, dW, dCredits: dC, dStock: dS };
    this.entries.push(e);
    if (this.entries.length > this.historySize) this.entries.splice(0, this.entries.length - this.historySize);
    let d = this.days.get(e.day);
    if (!d) { d = { day: e.day, sources: 0, sinks: 0, entries: 0, byCat: {} }; this.days.set(e.day, d); if (this.days.size > 60) this.days.delete(this.days.keys().next().value); }
    d.entries++;
    this.totals.entries++;
    if (dC === 0 && dS === 0) this.totals.internal++;
    else { const cats = categoriesOf(reason); this._post(cats.credits, dC, d); this._post(cats.goods, dS, d); }
    if (key != null) {
      this.applied.set(key, e.id);
      if (this.applied.size > this.keysSize) this.applied.delete(this.applied.keys().next().value);
    }
    return e;
  }
  // sum(sources) - sum(sinks): what the boundary's wealth must have changed by since the journal started
  net() { return this.totals.sourceSum - this.totals.sinkSum; }
  recent(n = 50, filter = null) { const out = filter ? this.entries.filter(filter) : this.entries; return out.slice(-n); }
  daySummary(day) { return this.days.get(day) || { day, sources: 0, sinks: 0, entries: 0, byCat: {} }; }
  serialize() {
    return { seq: this.seq, totals: this.totals, applied: [...this.applied.entries()].slice(-this.keysSize), days: [...this.days.values()].slice(-14), recent: this.entries.slice(-80) };
  }
  restore(data) {
    if (!data || typeof data !== 'object') return;
    this.seq = data.seq | 0;
    if (data.totals && typeof data.totals === 'object') this.totals = { sources: {}, sinks: {}, sourceSum: 0, sinkSum: 0, internal: 0, entries: 0, ...data.totals, sources: { ...(data.totals.sources || {}) }, sinks: { ...(data.totals.sinks || {}) } };
    this.applied = new Map(Array.isArray(data.applied) ? data.applied.filter((e) => Array.isArray(e) && e.length === 2) : []);
    this.days = new Map(Array.isArray(data.days) ? data.days.filter((d) => d && typeof d.day === 'number').map((d) => [d.day, d]) : []);
    this.entries = Array.isArray(data.recent) ? data.recent.filter((e) => e && typeof e.id === 'number') : [];
  }
}
