// The city economy, pass 2 (rubric 15): businesses with inventories, households that buy in batches, five linked
// goods chains moved by physical shipments, one atomic transfer primitive behind every stock or credit change, the
// price rule, an honest sources / sinks ledger and the visible-state queries the UI and other builders read.
//
// Pure data and arithmetic: no THREE, no DOM, no Math.random. The host (Economy in economy.js, or the headless
// scripts) owns the clocks and calls advance(dayTime, portTime); the sim owns every business's stock and funds, the
// shipments in flight and the journal. The player's wallet is an account the host lends the sim through callbacks.
//
// Accounting boundary (see ledger.js): businesses, the player's credits and shipments are inside; offworld, the
// treasury, the households, galactic clients, the player's item inventory and the void are outside. Everything that
// crosses it is a source or a sink; everything that stays inside is an internal transfer with zero wealth change.
import { GOODS, BULK_GOODS, bulkOf, isBulk, districtMult, scarcityFactor, clampDisruption, askPrice, bidPrice, vendorBuys, goodsKey, itemCategory, MIN_OFFER } from './prices.js';
import { isOpen } from '../coruscant/purposes.js';
import { LEVELS } from '../coruscant/layout.js';
import { Journal, valueOf, OUTSIDE } from './ledger.js';
import { hash2 } from '../rng.js';
import { DAY_LENGTH_SECONDS } from '../constants.js';
import { DOORS_OPEN, ON_GROUND, AIRBORNE_INBOUND } from './arrivals.js';

// ------------------------------------------------------------------------------------------------ tuning
// Documented in docs/overhaul/economy.md; every number here is a policy, not a hidden fudge.
export const TUNING = {
  wage: 18,                 // credits per staff member per day (paid at 06:00 to the household pool)
  visitInterval: 1 / 12,    // a business / household is simulated every two game hours, in batches (never per frame)
  daysCover: 3,             // a business targets three days of its bulk inputs
  reorderAt: 0.5,           // ... and reorders when stock + inbound falls under half the target
  endowment: 0.75,          // opening stock as a fraction of target (journaled as the `endowment` source)
  courierSpeed: 6 * DAY_LENGTH_SECONDS,   // blocks per game day (6 blocks per real second)
  conveyorSpeed: 3 * DAY_LENGTH_SECONDS,  // pad-side stack -> terminal apron
  loadDelay: 1 / 48,        // half a game hour between an order and the courier leaving the supplier
  importCost: 0.7,          // the terminal pays offworld 70% of the book price per unit
  importLead: 30,           // seconds of fly leg a freighter must still have to take a load aboard
  portFee: 120,             // credits a landed freighter pays the terminal per unloading
  mealsPerResident: 1,      // meal batches per resident per day
  treatmentsPerResident: 0.1,
  domesticPerResident: 0.35,
  leisurePerResident: 0.4,
  ridesPerResident: 0.4,
  rentPerResident: 3,       // credits a day to the residential lot's business
  utilityPerResident: 0.5,  // credits a day to the utility, plus one water unit
  treatmentFee: 24,
  leisureFee: 8,
  ridePrice: 10,
  householdStart: 30,       // opening savings per resident (outside the boundary)
  treasuryStart: 60000,     // Republic budget available for allocations (outside the boundary)
  levy: 0.1,                // share of office income levied for the treasury (a logged sink)
  allocationCap: 600,       // credits of public allocation per essential business per day
  exportPrice: 0.6,         // producers sell surplus output offworld at 60% of book (export sink / export_sale source)
  exportAbove: 0.8,         // ... once stock passes 80% of target, down to 50%
  bondCap: 4000,            // credits of import bonds per day (essential cargo the terminal cannot pay for)
  wasteCollected: 200,      // units of waste a recycling plant collects from the households per day
  wasteSplit: 0.5,          // salvage per unit of waste
  batch: 60,                // businesses + households visited per advance() in the game (Infinity for headless runs)
  spikeFactor: 1.5,         // scarcity factor at which a food / medical quote is a "price spike" notice
  minBusinessFunds: 300,
  fundsPerStaff: 60,
};
export const ESSENTIAL_ROLES = new Set(['medical', 'utility', 'transit']);
const ESSENTIAL_INPUT = { medical: 'medical', utility: 'fuel', transit: 'fuel' };
const ESSENTIAL_GOODS = new Set(['medical', 'water', 'fuel']);
const FOOD_CATS = new Set(['food', 'meat', 'produce']);
export const SHIPMENT_STATES = ['ordered', 'loaded', 'in_transit', 'arrived', 'unloaded', 'delivered', 'detained', 'cancelled'];
const LIVE_STATES = new Set(['ordered', 'loaded', 'in_transit', 'arrived', 'unloaded', 'detained']);

// A point on a shipment's path at progress u in 0..1: straight in the horizontal, but the cargo keeps its starting
// height (a pad deck, a walkway) and only climbs / descends over the last 30 % of the route, so crates riding a
// conveyor or a courier are seen along the way instead of passing through the decks between two levels.
export function pathPoint(a, b, u, out = { x: 0, y: 0, z: 0 }) {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  out.x = a.x + (b.x - a.x) * t;
  out.z = a.z + (b.z - a.z) * t;
  out.y = a.y + (b.y - a.y) * (t < 0.7 ? 0 : (t - 0.7) / 0.3);
  return out;
}

const walkY = (lot) => (lot.midDoor ? LEVELS.midWalk : LEVELS.underWalk);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const round = Math.round;
const toInt = (v) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
const pairs = (m) => [...m.entries()].filter(([, v]) => v !== 0);

// ------------------------------------------------------------------------------------------------ records
export class Business {
  constructor(lot, purpose) {
    this.id = lot.id; this.lot = lot; this.purpose = purpose;
    this.name = purpose.name; this.kind = purpose.kind; this.category = purpose.category; this.district = lot.district;
    this.role = purpose.role; this.hours = purpose.hours || null; this.service = purpose.service || null;
    this.staff = purpose.staff | 0; this.income = purpose.income | 0; this.seed = lot.seed | 0;
    this.stock = new Map(); this.target = new Map(); this.reserved = new Map();
    this.capacity = purpose.capacity | 0;
    this.funds = 0;
    this.suppliers = []; this.customers = []; this.supplierOf = new Map();   // good -> lotId | 'offworld'
    this.reorderRule = [];   // [{ good, min, qty }]
    this.serviceCapability = { kind: this.service, level: 1, perDay: 0 };
    this.needs = new Set();  // bulk goods this business keeps in stock
    this.sells = purpose.sells || []; this.buys = purpose.buys || [];
    this.retailOf = new Map(); // bulk good -> [retail item keys unpacked from it]
    this.openOrders = new Map(); // good -> shipment id
    this.acc = {};           // fractional accumulators (consumption, production, wages)
    this.lastVisit = null; this.lastWageDay = -1; this.lastRestockDay = -1;
    this.flags = { overdue: 0, detained: 0, unpaidWages: false, waiting: null, held: false };
    this.uptime = { up: 0, total: 0 };
    this.stats = { sold: 0, revenue: 0, unmet: 0 };
    const d = lot.door && lot.door.out ? lot.door.out : { x: lot.x0, z: lot.z0 };
    const y = walkY(lot);
    this.pos = { x: d.x + 0.5, y, z: d.z + 0.5 };
    // loading bay: three blocks along the facade from the door (crate stacks stand here)
    const side = lot.door ? lot.door.side : 'S';
    const along = side === 'N' || side === 'S' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    this.bay = { x: d.x + along.x * 3 + 0.5, y, z: d.z + along.z * 3 + 0.5 };
  }
  stockOf(good) { return this.stock.get(good) || 0; }
  reservedOf(good) { return this.reserved.get(good) || 0; }
  available(good) { return Math.max(0, this.stockOf(good) - this.reservedOf(good)); }
  units() { let n = 0; for (const v of this.stock.values()) n += v; return n; }
  room() { return this.capacity - this.units(); }
  stockValue() { let v = 0; for (const [g, q] of this.stock) v += valueOf(g, q); return v; }
  isOpen(hour) { return isOpen(this.purpose, hour); }
  essential() { return ESSENTIAL_ROLES.has(this.role); }
  essentialInput() { return ESSENTIAL_INPUT[this.role] || null; }
  toJSON() {
    return { id: this.id, name: this.name, kind: this.kind, category: this.category, district: this.district, role: this.role, hours: this.hours, capacity: this.capacity, funds: this.funds,
      stock: Object.fromEntries(pairs(this.stock)), target: Object.fromEntries(pairs(this.target)), reserved: Object.fromEntries(pairs(this.reserved)), suppliers: this.suppliers.slice(), customers: this.customers.slice(),
      reorderRule: this.reorderRule.map((r) => ({ ...r })), serviceCapability: { ...this.serviceCapability }, staff: this.staff, pos: this.pos, bay: this.bay };
  }
}

export class Household {
  constructor(lot, purpose, size) {
    this.lotId = lot.id; this.lot = lot; this.name = purpose.name; this.district = lot.district; this.size = size; this.seed = lot.seed | 0;
    this.pos = { x: (lot.door && lot.door.out ? lot.door.out.x : lot.x0) + 0.5, y: walkY(lot), z: (lot.door && lot.door.out ? lot.door.out.z : lot.z0) + 0.5 };
    this.food = []; this.clinic = null; this.utility = null; this.domestic = null; this.leisure = null; this.transit = null;
    this.acc = { meals: 0, treat: 0, dom: 0, leis: 0, ride: 0, util: 0 };
    this.lastVisit = null; this.visits = 0;   // visits drives the rotation over the nearest shops (persisted)
    this.stats = { meals: 0, unmetMeals: 0, treatments: 0, unmetTreatments: 0, spent: 0 };
  }
}

// ------------------------------------------------------------------------------------------------ the sim
export class EconomySim {
  // opts: { layout, purposes: [{ lot, purpose }], pads, deckY, arrivals, player: { get credits, set credits }, onEvent, batch }
  constructor(opts) {
    this.layout = opts.layout; this.pads = opts.pads || []; this.deckY = opts.deckY || LEVELS.deck;
    this.arrivals = opts.arrivals || { ships: () => [], time: () => 0, shipRecord: () => null };
    this.player = opts.player || { credits: 0 };
    this.onEvent = opts.onEvent || null;
    this.batch = opts.batch || TUNING.batch;
    this.journal = new Journal();
    this.dayTime = null; this.portTime = 0; this.fullPassDue = true;
    this.businesses = []; this.byId = new Map(); this.households = []; this.householdById = new Map();
    this.shipments = new Map(); this.recentShipments = []; this.recentImports = []; this.nextShipmentId = 1;
    this.outside = { households: { funds: 0 }, treasury: { funds: TUNING.treasuryStart, allocatedToday: new Map(), bondToday: 0, day: -1 } };
    this.notices = new Map();   // district -> [{ day, t, kind, text, lotId }]
    this.modifiers = { waste: 1 };   // scripted disruptions (sim-economy.mjs): waste collection multiplier
    this.holds = new Map();     // ship index -> { shipmentId, bill, reason }
    this.stats = { day: -1, meals: 0, unmetMeals: 0, treatments: 0, delivered: 0, created: 0, imports: 0, unloads: 0, importsDelivered: 0, negativeStock: 0, wagesPaid: 0, transfers: 0, days: [] };
    this._buildBusinesses(opts.purposes);
    this._linkChains();
    this._endow();
    // W - net is a constant (the wallet credits that predate the journal); any drift is an unjournaled change
    this.baseline = this.wealth() - this.journal.net();
  }
  drift() { return this.wealth() - this.journal.net() - this.baseline; }

  // ---------------------------------------------------------------------------------------------- construction
  _buildBusinesses(list) {
    let residents = 0;
    for (const { lot, purpose } of list) {
      const b = new Business(lot, purpose);
      this.businesses.push(b); this.byId.set(b.id, b);
      if (purpose.households) {
        // residents scale with the footprint and the floors of the block (about 800 across the city)
        const floors = Math.max(1, Math.round((lot.height || 20) / 5));
        const size = Math.max(4, Math.min(40, Math.round((lot.w * lot.d * floors) / 720)));
        const h = new Household(lot, purpose, size);
        this.households.push(h); this.householdById.set(h.lotId, h);
        residents += size;
      }
    }
    this.residents = residents;
    this.outside.households.funds = TUNING.householdStart * residents;
  }

  // The five chains as a supplier graph: nearest wholesale node per bulk good, the terminal above the nodes, offworld
  // above the terminal; producers feed on their inputs' nearest source; households attach to their nearest services.
  _linkChains() {
    const B = this.businesses;
    const terminals = B.filter((b) => b.role === 'terminal');
    const portCentre = this.pads.length ? { x: this.pads.reduce((s, p) => s + p.x, 0) / this.pads.length, z: this.pads.reduce((s, p) => s + p.z, 0) / this.pads.length } : { x: 2620, z: 0 };
    this.terminal = terminals.length ? terminals.sort((a, c) => dist2(a.pos, portCentre) - dist2(c.pos, portCentre))[0] : (B.filter((b) => b.role === 'wholesale').sort((a, c) => dist2(a.pos, portCentre) - dist2(c.pos, portCentre))[0] || null);
    // who supplies which bulk good: by role, most specific first
    const suppliersOf = (good) => {
      const s = [];
      for (const b of B) {
        if (b === this.terminal) continue;
        const sup = b.purpose.supplies || [];
        if (!sup.includes(good)) continue;
        if (good === 'water' && b.role !== 'utility') continue;                 // water comes from the reclamation plant
        if (good === 'salvage' && b.kind !== 'recycling_plant') continue;        // salvage from the yards
        if (good === 'parts' && b.role === 'wholesale' && b.kind !== 'depot' && b.kind !== 'warehouse') continue;
        s.push(b);
      }
      return s;
    };
    const nearest = (from, list) => { let best = null, bd = Infinity; for (const c of list) { if (c.id === from.id) continue; const d = dist2(from.pos, c.pos); if (d < bd) { bd = d; best = c; } } return best; };
    const supplierLists = {}; for (const g of BULK_GOODS) supplierLists[g] = suppliersOf(g);
    this.supplierLists = supplierLists;
    const link = (b, good, s) => { b.supplierOf.set(good, s === 'offworld' ? 'offworld' : s.id); if (s !== 'offworld') { if (!b.suppliers.includes(s.id)) b.suppliers.push(s.id); if (!s.customers.includes(b.id)) s.customers.push(b.id); } };
    for (const b of B) {
      const p = b.purpose;
      // bulk goods this business keeps: consumed inputs, retail inputs, wholesale supplies, production inputs / outputs
      for (const [g] of p.consumes) b.needs.add(g);
      for (const e of b.sells) { const g = bulkOf(e.item); if (g) { b.needs.add(g); if (!b.retailOf.has(g)) b.retailOf.set(g, []); b.retailOf.get(g).push(e.item); } }
      for (const g of p.supplies) if (g !== 'waste') b.needs.add(g);
      for (const pr of p.produces) { b.needs.add(pr.good); if (pr.from) b.needs.add(pr.from); }
      if (b.staff > 0 && b.role !== 'housing') b.needs.add('water');   // every staffed building drinks (residents buy their own)
      // targets: consumption x days cover, retail inputs 1.5x the shelf, wholesale a round of the customers (set below)
      for (const [g, perDay] of p.consumes) b.target.set(g, Math.max(b.target.get(g) || 0, Math.ceil(perDay * TUNING.daysCover)));
      for (const [g, items] of b.retailOf) { let shelf = 0; for (const it of items) { const e = b.sells.find((s) => s.item === it); shelf += e ? e.stock | 0 : 0; } b.target.set(g, Math.max(b.target.get(g) || 0, Math.ceil(shelf * 1.5))); }
      for (const e of b.sells) if (!GOODS[e.item] || !GOODS[e.item].service) b.target.set(e.item, e.stock | 0);
      if (b.needs.has('water')) b.target.set('water', Math.max(b.target.get('water') || 0, Math.ceil(b.staff * TUNING.daysCover)));
      if (b.role === 'medical') b.target.set('medical', Math.max(b.target.get('medical') || 0, Math.ceil(b.staff * 4 * TUNING.daysCover)));   // treatments use a kit each
      for (const pr of p.produces) { if (pr.from) b.target.set(pr.from, Math.max(b.target.get(pr.from) || 0, Math.ceil((pr.perDay / (pr.ratio || 1)) * TUNING.daysCover))); b.target.set(pr.good, Math.max(b.target.get(pr.good) || 0, Math.ceil(pr.perDay * TUNING.daysCover))); }
    }
    // supplier per good for retail / service / producer businesses
    for (const b of B) {
      if (b === this.terminal) continue;
      for (const g of b.needs) {
        if (b.purpose.produces.some((pr) => pr.good === g)) continue;   // made on site (water, parts from salvage, salvage from waste)
        if (b.role === 'wholesale' || b.role === 'producer') {
          // wholesale nodes restock from the terminal, except parts, which the depots pull from the nearest foundry /
          // droid factory (salvage -> parts -> depot -> workshop) when the city has one
          if (b.purpose.supplies.includes(g)) {
            const makers = g === 'parts' && b.role === 'wholesale' ? supplierLists.parts.filter((s) => s.role === 'producer') : [];
            const m = makers.length ? nearest(b, makers) : null;
            if (m) link(b, g, m); else if (this.terminal) link(b, g, this.terminal);
            continue;
          }
        }
        const cands = supplierLists[g] ? supplierLists[g].filter((s) => s !== b) : [];
        let s = cands.length ? nearest(b, cands) : null;
        if (!s && this.terminal && this.terminal !== b && this.terminal.purpose.supplies.includes(g)) s = this.terminal;
        if (s) link(b, g, s);
      }
    }
    // wholesale targets = one round of the customers' targets; the terminal (which imports everything it stocks) is
    // sized last, from the wholesale nodes' finished targets
    const T = this.terminal;
    const sizeNode = (b) => {
      for (const g of b.needs) {
        if (b.purpose.produces.some((pr) => pr.good === g)) continue;
        if (!b.purpose.supplies.includes(g)) continue;
        let sum = 0; for (const cid of b.customers) { const c = this.byId.get(cid); if (c && c.supplierOf.get(g) === b.id) sum += c.target.get(g) || 0; }
        b.target.set(g, Math.max(b.target.get(g) || 0, b.role === 'terminal' ? Math.ceil(sum * 0.6) + 120 : Math.max(60, Math.ceil(sum * 0.8))));
      }
    };
    for (const b of B) if (b !== T && (b.role === 'wholesale' || b.role === 'producer' || b.role === 'utility')) sizeNode(b);
    if (T) sizeNode(T);
    if (T) { for (const g of T.needs) T.supplierOf.set(g, 'offworld'); T.suppliers = []; }
    // capacity: the profile is a floor; a business always has room for 1.25x its targets
    for (const b of B) { let sum = 0; for (const v of b.target.values()) sum += v; b.capacity = Math.max(b.capacity, Math.ceil(sum * 1.25)); }
    // reorder rules (documented view of the policy above)
    for (const b of B) { b.reorderRule = [...b.needs].filter((g) => b.supplierOf.has(g)).map((g) => ({ good: g, min: Math.ceil((b.target.get(g) || 0) * TUNING.reorderAt), qty: b.target.get(g) || 0, from: b.supplierOf.get(g) })); }
    // households -> nearest services
    const foods = B.filter((b) => b.role === 'food'), clinics = B.filter((b) => b.role === 'medical'), utils = B.filter((b) => b.role === 'utility'), doms = B.filter((b) => b.service === 'domestic'), leis = B.filter((b) => b.role === 'leisure'), trans = B.filter((b) => b.role === 'transit');
    for (const h of this.households) {
      const nearestN = (list, n) => list.map((b) => [dist2(h.pos, b.pos), b.id]).sort((a, c) => a[0] - c[0]).slice(0, n).map((e) => e[1]);
      h.food = nearestN(foods, 4); h.domestics = nearestN(doms, 3); h.leisures = nearestN(leis, 3);
      const pick = (list) => { const n = nearest(h, list); return n ? n.id : null; };
      h.clinic = pick(clinics); h.utility = pick(utils); h.domestic = h.domestics[0] ?? null; h.leisure = h.leisures[0] ?? null; h.transit = pick(trans);
      for (const id of [...h.food, ...h.domestics, ...h.leisures, h.clinic, h.utility, h.transit]) { const b = id != null ? this.byId.get(id) : null; if (b && !b.customers.includes(`household:${h.lotId}`)) b.customers.push(`household:${h.lotId}`); }
    }
    // service capability
    for (const b of B) {
      const cap = b.serviceCapability;
      if (b.role === 'medical') cap.perDay = b.staff * 12;
      else if (b.role === 'transit') cap.perDay = b.staff * 80;
      else if (b.role === 'utility') cap.perDay = this.residents;
      else if (b.role === 'workshop') cap.perDay = b.staff * 2;
      else if (b.role === 'food') cap.perDay = b.staff * 40;
    }
  }

  // opening stock and funds, journaled as the `endowment` source so the identity holds from an empty world
  _endow() {
    for (const b of this.businesses) {
      const funds = TUNING.minBusinessFunds + TUNING.fundsPerStaff * b.staff + (b.role === 'wholesale' ? 2500 : b.role === 'terminal' ? 8000 : b.role === 'producer' || b.role === 'utility' ? 1200 : 0);
      this._apply({ from: 'admin', to: b.id, credits: funds, reason: 'endowment' }, { payer: 'admin', payee: b.id });
      for (const [g, t] of b.target) {
        const q = Math.floor(t * TUNING.endowment);
        if (q > 0) this._apply({ from: 'admin', to: b.id, good: g, qty: q, reason: 'endowment' }, { payer: null });
      }
    }
  }

  // ---------------------------------------------------------------------------------------------- accounts
  emit(name, payload) { if (this.onEvent) this.onEvent(name, payload); }
  business(id) { return this.byId.get(id) || null; }
  household(id) { return this.householdById.get(id) || null; }
  shipment(id) { return this.shipments.get(id) || this.recentShipments.find((s) => s.id === id) || this.recentImports.find((s) => s.id === id) || null; }
  day() { return Math.floor(this.dayTime || 0); }
  hour() { const d = this.dayTime || 0; return (d - Math.floor(d)) * 24; }
  shipmentAccount(id) { return typeof id === 'string' && id.startsWith('shipment:') ? this.shipments.get(id.slice(9)) : null; }
  // funds an account can pay from (null: unbounded outside account; -1: cannot pay)
  fundsOf(acc) {
    if (typeof acc === 'number') { const b = this.byId.get(acc); return b ? b.funds : -1; }
    if (acc === 'player') return this.player.credits | 0;
    if (acc === 'households') return this.outside.households.funds;
    if (acc === 'treasury') return this.outside.treasury.funds;
    if (acc === 'offworld' || acc === 'clients' || acc === 'admin') return null;
    return -1;   // void, shipments and unknown accounts cannot pay
  }
  _addFunds(acc, d) {
    if (typeof acc === 'number') { this.byId.get(acc).funds += d; return; }
    if (acc === 'player') { this.player.credits = (this.player.credits | 0) + d; return; }
    if (acc === 'households') { this.outside.households.funds += d; return; }
    if (acc === 'treasury') { this.outside.treasury.funds += d; }
  }
  _holdsStock(acc) { return typeof acc === 'number' || (typeof acc === 'string' && acc.startsWith('shipment:')); }
  _stockOf(acc, good) {
    if (typeof acc === 'number') { const b = this.byId.get(acc); return b ? b.stockOf(good) : 0; }
    const sh = this.shipmentAccount(acc); if (sh) { const e = sh.goods.find((x) => x.good === good); return e ? e.qty : 0; }
    return Infinity;   // outside accounts have no inventory of their own
  }
  _addStock(acc, good, d) {
    if (typeof acc === 'number') { const b = this.byId.get(acc); const was = b.stockOf(good); const now = was + d; b.stock.set(good, now); if ((was === 0) !== (now === 0)) this.emit('economy:stock', { business: b.id, good, qty: now, target: b.target.get(good) || 0 }); return; }
    const sh = this.shipmentAccount(acc);
    if (sh) { const e = sh.goods.find((x) => x.good === good); if (e) e.qty += d; else sh.goods.push({ good, qty: d }); sh.goods = sh.goods.filter((x) => x.qty !== 0); sh.qty = sh.goods.reduce((s, x) => s + x.qty, 0); }
  }
  _known(acc) { return typeof acc === 'number' ? this.byId.has(acc) : acc === 'player' || OUTSIDE.has(acc) || !!this.shipmentAccount(acc); }

  // ---------------------------------------------------------------------------------------------- transfer
  // transfer({ from, to, good, qty, credits, reason, key, payer, payee, useReserved }) -> true | reason string.
  // Goods move from -> to; `credits` are paid by `payer` (default: to) to `payee` (default: from). Every check runs
  // before any change; one journal entry per applied transfer; a repeated `key` is a no-op that returns true.
  transfer(t) {
    if (!t || typeof t !== 'object') return 'bad-request';
    if (t.key != null && this.journal.has(t.key)) return true;
    const qty = t.qty == null ? 0 : t.qty, credits = t.credits == null ? 0 : t.credits;
    if (!Number.isInteger(qty) || qty < 0 || !Number.isInteger(credits) || credits < 0) return 'bad-request';
    if (qty === 0 && credits === 0) return 'bad-request';
    if (qty > 0 && (!t.good || !GOODS[t.good])) return 'bad-request';
    if (qty > 0 && (t.from === undefined || t.to === undefined || t.from === t.to)) return 'bad-request';
    const payer = t.payer !== undefined ? t.payer : t.to, payee = t.payee !== undefined ? t.payee : t.from;
    if (credits > 0 && (payer === undefined || payee === undefined || payer === payee)) return 'bad-request';
    for (const a of [t.from, t.to, payer, payee]) if (a !== undefined && a !== null && !this._known(a)) return 'bad-request';
    if (qty > 0) {
      const perm = this._permitted(t.from, t.to, t.good);
      if (perm !== true) return perm;
      const from = this._stockOf(t.from, t.good);
      if (typeof t.from === 'number' && !t.useReserved) { const b = this.byId.get(t.from); if (b.available(t.good) < qty) return b.stockOf(t.good) >= qty ? 'reserved' : 'no-stock'; }
      else if (from < qty) return 'no-stock';
      if (typeof t.to === 'number') { const b = this.byId.get(t.to); if (b.room() < qty) return 'no-capacity'; }
    }
    if (credits > 0) {
      const f = this.fundsOf(payer);
      if (f === -1) return 'no-funds';
      if (f !== null && f < credits) return 'no-funds';
      if (this.fundsOf(payee) === -1 && payee !== 'void') return 'bad-request';
    }
    this._apply(t, { payer, payee, qty, credits });
    return true;
  }
  _permitted(from, to, good) {
    const shFrom = this.shipmentAccount(from), shTo = this.shipmentAccount(to);
    if (shFrom && shFrom.state === 'detained') return 'not-permitted';
    if (shTo && !(shTo.state === 'ordered' || shTo.state === 'loaded')) return 'not-permitted';
    if (to === 'player' && isBulk(good)) return 'not-permitted';                          // bulk goods are not inventory items
    if (to === 'player' && typeof from === 'number') { const b = this.byId.get(from); if (!b.sells.some((e) => e.item === good)) return 'not-permitted'; }
    if (from === 'player' && typeof to === 'number') { const b = this.byId.get(to); const g = GOODS[good]; if (!g || g.id == null || !vendorBuys(b.buys, g.id)) return 'not-permitted'; }
    return true;
  }
  _apply(t, o) {
    const qty = o.qty !== undefined ? o.qty : (t.qty | 0), credits = o.credits !== undefined ? o.credits : (t.credits | 0);
    const payer = o.payer !== undefined ? o.payer : t.to, payee = o.payee !== undefined ? o.payee : t.from;
    let dStock = 0, dCredits = 0;
    if (qty > 0) {
      const v = valueOf(t.good, qty);
      if (this._holdsStock(t.from)) { this._addStock(t.from, t.good, -qty); dStock -= v; if (typeof t.from === 'number' && t.useReserved) { const b = this.byId.get(t.from); b.reserved.set(t.good, Math.max(0, b.reservedOf(t.good) - qty)); } }
      if (this._holdsStock(t.to)) { this._addStock(t.to, t.good, qty); dStock += v; }
    }
    if (credits > 0 && payer != null && payee != null) {
      this._addFunds(payer, -credits); this._addFunds(payee, credits);
      const inside = (a) => typeof a === 'number' || a === 'player';
      if (inside(payer)) dCredits -= credits;
      if (inside(payee)) dCredits += credits;
    }
    const e = this.journal.record({ day: this.day(), t: this.dayTime || 0, type: qty > 0 ? (credits > 0 ? 'sale' : 'move') : 'payment', from: qty > 0 ? t.from : payer, to: qty > 0 ? t.to : payee, good: t.good, qty, credits, reason: t.reason, key: t.key, dCredits, dStock });
    this.stats.transfers++;
    this.emit('economy:transfer', { id: e.id, from: e.from, to: e.to, good: e.good, qty, credits, reason: t.reason || '', flow: e.flow, dW: e.dW });
    return e;
  }
  pay(payer, payee, credits, reason, key) { return this.transfer({ from: payee, to: payer, credits, reason, key, payer, payee }); }

  // ---------------------------------------------------------------------------------------------- prices
  baseOf(b, good) { const e = b.sells.find((s) => s.item === good); if (e && e.price != null) return e.price; const g = GOODS[good]; return g ? g.base : null; }
  // Bounded disruption modifier of a business: overdue orders and detained inbound cargo raise its prices, a route
  // delay in the district raises them a little, oversupply (stock above 1.5x target) lowers them.
  disruptionOf(b, good) {
    let d = 0.1 * Math.min(2, b.flags.overdue) + (b.flags.detained > 0 ? 0.15 : 0);
    const n = this.notices.get(b.district);
    if (n && n.some((x) => x.kind === 'delay' && this.dayTime - x.t < 0.5)) d += 0.05;
    if (good && b.stockOf(good) > 1.5 * (b.target.get(good) || 0) && (b.target.get(good) || 0) > 0) d -= 0.1;
    return clampDisruption(d);
  }
  // quote(lotId, good) -> { buy, sell, stock, available, target, factor, disruption, base } (buy / sell null when not traded)
  quote(lotId, good) {
    const b = typeof lotId === 'number' ? this.byId.get(lotId) : lotId;
    if (!b || !GOODS[good]) return null;
    const g = GOODS[good];
    const stock = b.stockOf(good), available = b.available(good), target = b.target.get(good) || 0;
    const factor = scarcityFactor(target, available), disruption = this.disruptionOf(b, good);
    const base = this.baseOf(b, good);
    const trades = b.sells.some((e) => e.item === good) || (isBulk(good) && b.needs.has(good));
    let buy = null;
    if (trades && !g.service) buy = askPrice(base, b.district, target, available, disruption);
    else if (g.service) buy = base == null ? null : (g.service === 'ship' ? base : Math.max(1, round(base * districtMult(b.district))));
    let sell = null;
    if (!g.service && g.id != null && vendorBuys(b.buys, g.id)) {
      const pawn = b.buys.includes('any');
      const bid = bidPrice(base, b.district, target, available, disruption, pawn);
      if (bid != null && b.funds >= bid && b.room() >= 1) sell = bid;
    } else if (isBulk(good) && b.needs.has(good) && b.funds > 0 && b.room() >= 1) {
      const bid = bidPrice(base, b.district, target, available, disruption, false);
      if (bid != null && b.funds >= bid) sell = bid;
    }
    return { buy, sell, stock, available, target, factor: +factor.toFixed(4), disruption: +disruption.toFixed(4), base };
  }

  // ---------------------------------------------------------------------------------------------- stepping
  // Advance to the given clocks (dayTime in game days, portTime in port seconds). Businesses and households are
  // visited in batches when their two-hour interval is up; shipments and freighter arrivals every call.
  advance(dayTime, portTime = this.portTime) {
    if (this.dayTime === null) { this.dayTime = dayTime; this.fullPassDue = true; }
    if (this.stats.day < 0) this.stats.day = Math.floor(dayTime);
    if (dayTime < this.dayTime) dayTime = this.dayTime;   // the clock never runs backwards inside the sim
    const dayChanged = Math.floor(dayTime) > Math.floor(this.dayTime);
    this.dayTime = dayTime; this.portTime = portTime;
    if (dayChanged) { this.fullPassDue = true; this._rollDay(); }
    const budget = this.fullPassDue ? Infinity : this.batch;
    const dueB = [], dueH = [];
    for (const b of this.businesses) if (b.lastVisit === null || this.fullPassDue || dayTime - b.lastVisit >= TUNING.visitInterval) dueB.push(b);
    for (const h of this.households) if (h.lastVisit === null || this.fullPassDue || dayTime - h.lastVisit >= TUNING.visitInterval) dueH.push(h);
    if (budget !== Infinity) { dueB.sort((a, c) => (a.lastVisit || 0) - (c.lastVisit || 0)); dueH.sort((a, c) => (a.lastVisit || 0) - (c.lastVisit || 0)); }
    let n = 0;
    for (const b of dueB) { if (n >= budget) break; this._visitBusiness(b, dayTime); n++; }
    for (const h of dueH) { if (n >= budget) break; this._visitHousehold(h, dayTime); n++; }
    if (n >= dueB.length + dueH.length) this.fullPassDue = false;
    this._shipmentsPass(dayTime);
    this._importsPass(dayTime, portTime);
    this._notePrices();
    return n;
  }
  _rollDay() {
    const day = this.day();
    const T = this.outside.treasury; T.allocatedToday.clear(); T.bondToday = 0; T.day = day;
    const prev = this.stats;
    if (prev.day >= 0) {
      const j = this.journal.daySummary(prev.day);
      this.stats.days.push({ day: prev.day, meals: prev.meals, unmetMeals: prev.unmetMeals, treatments: prev.treatments, delivered: prev.delivered, created: prev.created, imports: prev.imports, unloads: prev.unloads, importsDelivered: prev.importsDelivered, wages: prev.wagesPaid, sources: j.sources, sinks: j.sinks, entries: j.entries, byCat: j.byCat, wealth: this.wealth(), households: this.outside.households.funds, treasury: this.outside.treasury.funds });
      if (this.stats.days.length > 30) this.stats.days.shift();
    }
    Object.assign(this.stats, { day, meals: 0, unmetMeals: 0, treatments: 0, delivered: 0, created: 0, imports: 0, unloads: 0, importsDelivered: 0, wagesPaid: 0 });
  }

  _visitBusiness(b, now) {
    const elapsed = b.lastVisit === null ? 0 : Math.min(1, now - b.lastVisit);
    b.lastVisit = now;
    const day = Math.floor(now), hour = (now - day) * 24;
    const open = b.isOpen(hour);
    const p = b.purpose;
    // essential-service uptime: can it serve right now?
    if (b.essential()) { const inp = b.essentialInput(); const up = b.stockOf(inp) > 0 ? 1 : 0; b.uptime.up += elapsed * up; b.uptime.total += elapsed; }
    if (elapsed > 0) {
      // office income from galactic clients, levied for the treasury
      if (b.income > 0 && b.staff > 0) {
        b.acc.income = (b.acc.income || 0) + b.income * b.staff * elapsed;
        const cr = Math.floor(b.acc.income);
        if (cr > 0) { b.acc.income -= cr; this.pay('clients', b.id, cr, 'income'); const levy = Math.floor(cr * TUNING.levy); if (levy > 0) this.pay(b.id, 'treasury', levy, 'levy'); }
      }
      // inputs consumed while open (or around the clock without hours)
      const openFrac = b.hours ? Math.min(1, ((b.hours[1] - b.hours[0] + 24) % 24 || 24) / 24) : 1;
      for (const [g, perDay] of p.consumes) this._consume(b, g, perDay * elapsed * Math.max(openFrac, 0.5), g === 'parts' || g === 'fuel' ? 'maintenance' : 'consumption');
      if (b.needs.has('water') && b.role !== 'housing' && b.staff > 0) this._consume(b, 'water', b.staff * elapsed, 'consumption');
      // on-site production (salvage -> parts, waste -> salvage, water reclaimed), surplus exported offworld
      for (const pr of p.produces) { this._produce(b, pr, elapsed); if (b.role === 'producer') this._export(b, pr.good); }
      if (b.kind === 'recycling_plant') { b.acc.waste = (b.acc.waste || 0) + TUNING.wasteCollected * this.modifiers.waste * elapsed; const w = Math.floor(b.acc.waste); if (w > 0 && b.room() >= w) { b.acc.waste -= w; if (this.transfer({ from: 'households', to: b.id, good: 'waste', qty: w, reason: 'waste' }) === true) b.acc.wasteTotal = (b.acc.wasteTotal || 0) + w; } }
    }
    // wages once a day at 06:00 or later
    if (day > b.lastWageDay && hour >= 6 && b.staff > 0) {
      const w = b.staff * TUNING.wage;
      if (b.funds >= w) { this.pay(b.id, 'households', w, 'wages'); b.flags.unpaidWages = false; this.stats.wagesPaid += w; }
      else if (b.essential() && this._allocate(b, w - b.funds, 'allocation:wages')) { this.pay(b.id, 'households', w, 'wages'); b.flags.unpaidWages = false; this.stats.wagesPaid += w; }
      else b.flags.unpaidWages = true;
      b.lastWageDay = day;
    }
    // shelves: unpack retail items from bulk (half-empty shelf or once a day)
    this._restockShelves(b, day);
    // reorder bulk inputs that fell under the threshold
    this._reorder(b, now);
    // service level of utilities / transit follows fuel and maintenance stock
    if (b.role === 'utility' || b.role === 'transit') {
      const ratio = (g) => { const t = b.target.get(g) || 0; return t > 0 ? Math.min(1, b.stockOf(g) / t) : 1; };
      const lvl = Math.max(0, Math.min(1, 0.6 * Math.min(1, ratio('fuel') * 2) + 0.4 * Math.min(1, ratio('parts') * 2)));
      const was = b.serviceCapability.level;
      b.serviceCapability.level = +lvl.toFixed(3);
      if (was >= 0.5 && lvl < 0.5) this._notice(b.district, 'outage', `${b.name}: service reduced (${b.role === 'utility' ? 'power' : 'transit'} at ${Math.round(lvl * 100)}%)`, b.id);
    }
  }
  _consume(b, good, amount, reason) {
    if (!(amount > 0)) return;
    b.acc[good] = (b.acc[good] || 0) + amount;
    const n = Math.min(Math.floor(b.acc[good]), b.available(good));
    if (n <= 0) return;
    b.acc[good] -= n;
    this.transfer({ from: b.id, to: 'void', good, qty: n, reason });
  }
  _produce(b, pr, elapsed) {
    const key = `prod:${pr.good}`;
    b.acc[key] = (b.acc[key] || 0) + pr.perDay * elapsed;
    let out = Math.floor(b.acc[key]);
    if (out <= 0) return;
    const room = Math.max(0, (b.target.get(pr.good) || 0) - b.stockOf(pr.good));
    out = Math.min(out, room, b.room());
    if (pr.from) { const inPer = 1 / (pr.ratio || 1); out = Math.min(out, Math.floor(b.available(pr.from) / inPer)); if (out <= 0) { b.acc[key] = Math.min(b.acc[key], 4); return; } const used = Math.round(out * inPer); this.transfer({ from: b.id, to: 'void', good: pr.from, qty: used, reason: 'processing' }); }
    if (out <= 0) { b.acc[key] = Math.min(b.acc[key], 4); return; }
    b.acc[key] -= out;
    this.transfer({ from: 'void', to: b.id, good: pr.good, qty: out, reason: 'production' });
  }
  // a producer sells output above 80% of its target offworld, down to 50% (export sink, export_sale source)
  _export(b, good) {
    const target = b.target.get(good) || 0;
    if (target <= 0 || b.available(good) <= target * TUNING.exportAbove) return;
    const qty = Math.floor(b.available(good) - target * 0.5);
    const unit = Math.max(1, Math.round((GOODS[good].base || 1) * TUNING.exportPrice));
    if (qty > 0) this.transfer({ from: b.id, to: 'offworld', good, qty, credits: unit * qty, reason: 'export' });
  }
  _restockShelves(b, day) {
    const daily = day > b.lastRestockDay;
    for (const e of b.sells) {
      const g = GOODS[e.item]; if (!g || g.service) continue;
      const bulk = bulkOf(e.item); if (!bulk) continue;
      const target = e.stock | 0, have = b.stockOf(e.item);
      if (!(daily || have < target / 2) || have >= target) continue;
      const n = Math.min(target - have, b.available(bulk));
      if (n <= 0) continue;
      // two moves through the void keep the journal one-good-per-entry: bulk out (processing), item in (production);
      // the value difference between the two legs is the shop's value added (or loss), posted honestly
      this.transfer({ from: b.id, to: 'void', good: bulk, qty: n, reason: 'processing' });
      this.transfer({ from: 'void', to: b.id, good: e.item, qty: n, reason: 'production' });
    }
    if (daily) b.lastRestockDay = day;
  }
  // goods on their way to b: the cargo once loaded, the order before (a detained shipment no longer counts)
  inboundOf(b, good) { let n = 0; for (const sh of this.shipments.values()) if (sh.to === b.id && LIVE_STATES.has(sh.state) && sh.state !== 'detained') for (const e of (sh.loadedAt != null ? sh.goods : sh.order)) if (e.good === good) n += e.qty; return n; }
  _reorder(b, now) {
    for (const rule of b.reorderRule) {
      const g = rule.good, target = b.target.get(g) || 0;
      if (target <= 0) continue;
      const have = b.stockOf(g) + this.inboundOf(b, g);
      if (have >= rule.min) continue;
      if (b.openOrders.has(g)) { const sh = this.shipments.get(b.openOrders.get(g)); if (sh && sh.state !== 'delivered' && sh.state !== 'cancelled') continue; b.openOrders.delete(g); }
      const want = target - have;
      if (rule.from === 'offworld') { this._orderImport(b, g, want, now); continue; }
      let S = this.byId.get(rule.from);
      if (!S) continue;
      if (S.available(g) < 1) {
        // the usual supplier is empty: the next-nearest one that has the good takes the order (the terminal last)
        const alts = (this.supplierLists[g] || []).filter((x) => x !== b && x !== S && x.available(g) >= 1).sort((x, y) => dist2(b.pos, x.pos) - dist2(b.pos, y.pos));
        const alt = alts[0] || (this.terminal && this.terminal !== b && this.terminal !== S && this.terminal.available(g) >= 1 ? this.terminal : null);
        if (!alt) { b.flags.waiting = g; b.flags.overdue = Math.min(3, b.flags.overdue + 1); this._notice(b.district, 'shortage', `${S.name} is out of ${GOODS[g].label || g}; ${b.name} is waiting`, b.id); continue; }
        S = alt;
      }
      const avail = S.available(g);
      let qty = Math.min(want, avail, Math.max(0, b.room() - this._inboundTotal(b)));
      if (qty < 1) continue;
      const unit = this.quote(S, g).buy || GOODS[g].base;
      let cost = unit * qty;
      if (b.funds < cost && b.essential() && (ESSENTIAL_GOODS.has(g) || g === b.essentialInput())) this._allocate(b, cost - b.funds, `allocation:${g}`);
      if (b.funds < cost) { qty = Math.floor(b.funds / unit); cost = unit * qty; }
      if (qty < 1) { b.flags.overdue = Math.min(3, b.flags.overdue + 1); continue; }
      const sh = this._createShipment({ from: S.id, to: b.id, order: [{ good: g, qty }], carrier: { kind: 'courier', id: null }, cost, now });
      S.reserved.set(g, S.reservedOf(g) + qty);
      b.openOrders.set(g, sh.id);
      b.flags.waiting = null;
      if (b.flags.overdue > 0) b.flags.overdue--;
    }
  }
  _inboundTotal(b) { let n = 0; for (const sh of this.shipments.values()) if (sh.to === b.id && LIVE_STATES.has(sh.state)) n += sh.loadedAt != null ? sh.qty : sh.order.reduce((s, e) => s + e.qty, 0); return n; }
  _orderImport(b, g, want, now) {
    // one open import order per terminal collects goods until a freighter takes it aboard
    let sh = null;
    for (const s of this.shipments.values()) if (s.to === b.id && s.from === 'offworld' && s.state === 'ordered') { sh = s; break; }
    if (!sh) sh = this._createShipment({ from: 'offworld', to: b.id, order: [], carrier: { kind: 'ship', id: null }, cost: 0, now });
    const e = sh.order.find((x) => x.good === g);
    if (e) e.qty = Math.max(e.qty, want); else sh.order.push({ good: g, qty: want });
    b.openOrders.set(g, sh.id);
  }
  // public allocation for an essential business (bounded per day, logged as the `allocation` source)
  _allocate(b, amount, reason) {
    const T = this.outside.treasury;
    const used = T.allocatedToday.get(b.id) || 0;
    const cr = Math.min(Math.ceil(amount), TUNING.allocationCap - used, T.funds);
    if (cr <= 0) return false;
    if (this.pay('treasury', b.id, cr, reason) !== true) return false;
    T.allocatedToday.set(b.id, used + cr);
    return b.funds >= amount;
  }

  _visitHousehold(h, now) {
    const elapsed = h.lastVisit === null ? 0 : Math.min(1, now - h.lastVisit);
    h.lastVisit = now;
    if (elapsed <= 0) return;
    h.visits = (h.visits || 0) + 1;
    // the household rotates through its nearest shops so every one of them sees custom
    const rot = (list) => (list.length ? list.slice(h.visits % list.length).concat(list.slice(0, h.visits % list.length)) : list);
    const day = Math.floor(now), hour = (now - day) * 24;
    const mood = 0.8 + 0.4 * hash2(h.seed, day, 77);   // daily variation of demand, deterministic per lot and day
    const pool = this.outside.households;
    const share = h.size / Math.max(1, this.residents);
    // rent to the residential block and the utility bill
    h.acc.rent = (h.acc.rent || 0) + TUNING.rentPerResident * h.size * elapsed;
    const rent = Math.floor(h.acc.rent); if (rent > 0 && pool.funds >= rent) { h.acc.rent -= rent; this.pay('households', h.lotId, rent, 'rent'); }
    const util = h.utility != null ? this.byId.get(h.utility) : null;
    if (util) {
      h.acc.util += h.size * elapsed;
      const n = Math.floor(h.acc.util);
      if (n > 0) {
        const got = Math.min(n, util.available('water'));
        const fee = Math.round(TUNING.utilityPerResident * n * util.serviceCapability.level);
        if (got > 0 && pool.funds >= fee) { h.acc.util -= n; this.transfer({ from: util.id, to: 'households', good: 'water', qty: got, credits: fee, reason: 'utility' }); }
        else if (got <= 0) { h.acc.util = Math.min(h.acc.util, h.size); }
      }
    }
    // meals in one daily batch (bought when a nearby food business is open and stocked)
    h.acc.meals += TUNING.mealsPerResident * h.size * elapsed * mood;
    let meals = Math.floor(h.acc.meals);
    if (meals > 0) {
      let bought = 0;
      for (const fid of rot(h.food)) {
        const f = this.byId.get(fid); if (!f || !f.isOpen(hour)) continue;
        bought += this._buyMeals(f, meals - bought, h);
        if (bought >= meals) break;
      }
      if (bought > 0) { h.acc.meals -= bought; this.stats.meals += bought; h.stats.meals += bought; }
      if (bought < meals) {
        const anyOpen = h.food.some((fid) => { const f = this.byId.get(fid); return f && f.isOpen(hour); });
        if (anyOpen) { const unmet = meals - bought; this.stats.unmetMeals += unmet; h.stats.unmetMeals += unmet; h.acc.meals -= unmet; const f = this.byId.get(h.food[0]); if (f) { f.stats.unmet += unmet; this._notice(h.district, 'shortage', `${f.name} has nothing to eat on the shelves; ${h.name} went without`, f.id); } }
        else h.acc.meals = Math.min(h.acc.meals, h.size * 1.5);   // wait for opening, but do not pile up past a day and a half
      }
    }
    // treatments at the nearest clinic (one medical kit each)
    const clinic = h.clinic != null ? this.byId.get(h.clinic) : null;
    if (clinic) {
      h.acc.treat += TUNING.treatmentsPerResident * h.size * elapsed * mood;
      const n = Math.floor(h.acc.treat);
      if (n > 0 && clinic.isOpen(hour)) {
        const got = Math.min(n, clinic.available('medical'));
        const fee = TUNING.treatmentFee * got;
        if (got > 0 && pool.funds >= fee) { h.acc.treat -= got; this.transfer({ from: clinic.id, to: 'households', good: 'medical', qty: got, credits: fee, reason: 'treatment' }); this.stats.treatments += got; h.stats.treatments += got; }
        if (got < n) { h.stats.unmetTreatments += n - got; h.acc.treat -= n - got; clinic.stats.unmet += n - got; this._notice(h.district, 'shortage', `${clinic.name} has no medical supplies for ${h.name}`, clinic.id); }
      }
    }
    // domestic goods every few days, from the nearest general store / tailor / ...
    const dom = h.domestics && h.domestics.length ? this.byId.get(rot(h.domestics)[0]) : null;
    if (dom) {
      h.acc.dom += TUNING.domesticPerResident * h.size * elapsed * mood;
      const n = Math.floor(h.acc.dom);
      if (n > 0 && dom.isOpen(hour)) { const got = this._buyRetail(dom, n, (e) => !FOOD_CATS.has(GOODS[e.item].cat)); h.acc.dom -= n; if (got > 0) h.stats.spent += got; }
    }
    // leisure and rides: paid services (credits only)
    const leis = h.leisures && h.leisures.length ? this.byId.get(rot(h.leisures).find((id) => { const x = this.byId.get(id); return x && x.isOpen(hour); }) ?? rot(h.leisures)[0]) : null;
    if (leis) { h.acc.leis += TUNING.leisurePerResident * h.size * elapsed * mood; const n = Math.floor(h.acc.leis); if (n > 0 && leis.isOpen(hour)) { const fee = TUNING.leisureFee * n; if (pool.funds >= fee) { h.acc.leis -= n; this.pay('households', leis.id, fee, 'leisure'); } else h.acc.leis -= n; } }
    const tr = h.transit != null ? this.byId.get(h.transit) : null;
    if (tr) { h.acc.ride += TUNING.ridesPerResident * h.size * elapsed; const n = Math.floor(h.acc.ride); if (n > 0) { const fee = Math.round(TUNING.ridePrice * n * tr.serviceCapability.level); h.acc.ride -= n; if (fee > 0 && pool.funds >= fee) this.pay('households', tr.id, fee, 'transit'); } }
    // savings above two days of spending go into extra leisure / domestic purchases (keeps the loop closed)
    const surplus = pool.funds * share - h.size * 40;
    if (surplus > 20 && leis && leis.isOpen(hour)) { const fee = Math.min(Math.floor(surplus * 0.5), h.size * 20); if (fee > 0) this.pay('households', leis.id, fee, 'leisure'); }
  }
  // cheapest meals first; batch priced at the quote before the batch (households buy in batches, not per person)
  _buyMeals(f, want, h) {
    let bought = 0;
    const pool = this.outside.households;
    const items = f.sells.filter((e) => GOODS[e.item] && FOOD_CATS.has(GOODS[e.item].cat) && f.available(e.item) > 0);
    items.sort((a, c) => (this.quote(f, a.item).buy || 1e9) - (this.quote(f, c.item).buy || 1e9));
    for (const e of items) {
      if (bought >= want) break;
      const q = this.quote(f, e.item);
      if (q.factor >= TUNING.spikeFactor) this._notice(f.district, 'spike', `Prices up at ${f.name}: ${GOODS[e.item].label || e.item} x${q.factor.toFixed(2)}`, f.id);
      const n = Math.min(want - bought, f.available(e.item), Math.floor(pool.funds / Math.max(1, q.buy)));
      if (n <= 0) continue;
      if (this.transfer({ from: f.id, to: 'households', good: e.item, qty: n, credits: q.buy * n, reason: 'meals' }) === true) { bought += n; f.stats.sold += n; f.stats.revenue += q.buy * n; h.stats.spent += q.buy * n; }
    }
    return bought;
  }
  _buyRetail(b, want, filter) {
    const pool = this.outside.households;
    let spent = 0, bought = 0;
    for (const e of b.sells) {
      if (bought >= want) break;
      const g = GOODS[e.item]; if (!g || g.service || !filter(e) || b.available(e.item) <= 0) continue;
      const q = this.quote(b, e.item);
      const n = Math.min(want - bought, b.available(e.item), 3, Math.floor(pool.funds / Math.max(1, q.buy)));
      if (n <= 0) continue;
      if (this.transfer({ from: b.id, to: 'households', good: e.item, qty: n, credits: q.buy * n, reason: 'domestic' }) === true) { bought += n; spent += q.buy * n; b.stats.sold += n; b.stats.revenue += q.buy * n; }
    }
    return spent;
  }

  // ---------------------------------------------------------------------------------------------- shipments
  // `order` is what was requested; `goods` is the cargo actually aboard (empty until loaded), which is what counts
  // as wealth in flight and what gets delivered
  _createShipment({ from, to, order, carrier, cost, now }) {
    const id = `S-${this.nextShipmentId++}`;
    const F = typeof from === 'number' ? this.byId.get(from) : null, T = this.byId.get(to);
    const a = F ? F.bay : null, z = T ? T.bay : null;
    const sh = { id, order: order.map((g) => ({ ...g })), goods: [], qty: 0, from, to, state: 'ordered', carrier: { ...carrier }, cost, bill: 0, paid: false, held: false, detained: null, prevState: null,
      orderedAt: now, loadAt: now + TUNING.loadDelay, loadedAt: null, eta: null, deliveredAt: null, position: a ? { ...a } : (z ? { ...z } : { x: 0, y: 0, z: 0 }), path: a && z ? { a, b: z } : null, history: [['ordered', now]] };
    this.shipments.set(id, sh);
    this.stats.created++;
    if (from === 'offworld') this.stats.imports++;
    this.emit('economy:shipment', this._shipmentEvent(sh));
    return sh;
  }
  // goods of a shipment as the world sees them: the manifest once loaded (kept after delivery), the order before
  _goodsOf(sh) { return (sh.manifest && sh.manifest.length ? sh.manifest : (sh.loadedAt != null ? sh.goods : sh.order)).map((g) => ({ ...g })); }
  _shipmentEvent(sh) { return { id: sh.id, state: sh.state, from: sh.from, to: sh.to, goods: this._goodsOf(sh), carrier: { ...sh.carrier }, held: sh.held, detained: sh.detained }; }
  _setState(sh, state, now) {
    if (sh.state === state) return;
    sh.state = state;
    sh.history.push([state, now]);
    if (sh.history.length > 12) sh.history.shift();
    if (state === 'delivered' || state === 'cancelled') {
      this.shipments.delete(sh.id);
      this.recentShipments.push(sh); if (this.recentShipments.length > 40) this.recentShipments.shift();
      if (sh.from === 'offworld') { this.recentImports.push(sh); if (this.recentImports.length > 12) this.recentImports.shift(); if (state === 'delivered') this.stats.importsDelivered++; }
      const T = this.byId.get(sh.to); if (T) for (const [g, id] of T.openOrders) if (id === sh.id) T.openOrders.delete(g);
      if (state === 'delivered') { this.stats.delivered++; sh.deliveredAt = now; }
    }
    this.emit('economy:shipment', this._shipmentEvent(sh));
  }
  _lerpPos(sh, u) { pathPoint(sh.path.a, sh.path.b, u, sh.position); }
  _shipmentsPass(now) {
    for (const sh of [...this.shipments.values()]) {
      if (sh.state === 'detained' || sh.from === 'offworld') continue;
      const S = this.byId.get(sh.from), T = this.byId.get(sh.to);
      if (!S || !T) { this._cancel(sh, now); continue; }
      if (sh.state === 'ordered' && now >= sh.loadAt) {
        // the courier loads: goods leave the supplier's reserved stock, the receiver pays the supplier
        const e = sh.order[0];
        const r = this.transfer({ from: S.id, to: `shipment:${sh.id}`, good: e.good, qty: e.qty, credits: sh.cost, payer: T.id, payee: S.id, reason: 'wholesale', useReserved: true });
        if (r !== true) { this._cancel(sh, now); continue; }
        sh.loadedAt = now; sh.manifest = sh.goods.map((g) => ({ ...g }));
        const d = dist2(S.bay, T.bay) + Math.abs(S.bay.y - T.bay.y);
        sh.eta = now + Math.max(1 / 96, d / TUNING.courierSpeed);
        this._setState(sh, 'loaded', now);
        continue;
      }
      if (sh.state === 'loaded') { this._setState(sh, 'in_transit', now); }
      if (sh.state === 'in_transit') {
        const u = Math.min(1, (now - sh.loadedAt) / Math.max(1e-6, sh.eta - sh.loadedAt));
        this._lerpPos(sh, u);
        if (now >= sh.eta) this._setState(sh, 'arrived', now);
      }
      if (sh.state === 'arrived') {
        this._lerpPos(sh, 1);
        const e = sh.goods[0];
        const r = this.transfer({ from: `shipment:${sh.id}`, to: T.id, good: e.good, qty: e.qty, reason: 'delivery' });
        if (r === true) { this._setState(sh, 'unloaded', now); this._setState(sh, 'delivered', now); if (T.flags.overdue > 0) T.flags.overdue--; if (T.flags.waiting === e.good) T.flags.waiting = null; }
        else if (now - sh.eta > 0.25 && !sh.stalled) { sh.stalled = true; this._notice(T.district, 'delay', `Shipment ${sh.id} to ${T.name} cannot unload (${r})`, T.id); }
      }
    }
  }
  _cancel(sh, now) {
    // an order that can no longer be filled releases its reservation; nothing has moved so nothing is journaled
    const S = this.byId.get(sh.from);
    if (S && sh.state === 'ordered') for (const e of sh.order) S.reserved.set(e.good, Math.max(0, S.reservedOf(e.good) - e.qty));
    this._setState(sh, 'cancelled', now);
  }
  // Imports ride real freighters: bound when a cargo ship still has a fly leg ahead, loaded as the `import` source,
  // arrived at touchdown, unloaded (and paid for) while the doors are open on the pad, then a conveyor leg to the
  // terminal's apron. The ship's phase is the state machine's clock - no phase change, no transition.
  _importsPass(now, t) {
    const ships = this.arrivals.ships();
    const T = this.terminal;
    if (!T) return;
    const boundTo = new Map(); for (const sh of this.shipments.values()) if (sh.from === 'offworld' && sh.carrier.kind === 'ship' && sh.carrier.id != null && sh.state !== 'unloaded') boundTo.set(sh.carrier.id, sh);
    for (const C of ships) {
      const phase = C.phaseAt(t);
      let sh = boundTo.get(C.index) || null;
      if (!sh) {
        if (phase !== 'fly') continue;
        const rem = C.flyRemaining(t);
        if (rem === null || rem < TUNING.importLead) continue;
        const pending = [...this.shipments.values()].filter((s) => s.from === 'offworld' && s.state === 'ordered' && s.carrier.id == null && s.order.length > 0).sort((a, b) => a.orderedAt - b.orderedAt);
        if (!pending.length) continue;
        sh = pending[0];
        // scale the order to the hold
        const total = sh.order.reduce((s, e) => s + e.qty, 0);
        if (total > C.holdUnits) { const k = C.holdUnits / total; for (const e of sh.order) e.qty = Math.max(1, Math.floor(e.qty * k)); }
        sh.carrier = { kind: 'ship', id: C.index, name: C.name, pad: C.pad };
        let bill = 0;
        for (const e of sh.order) { if (this.transfer({ from: 'offworld', to: `shipment:${sh.id}`, good: e.good, qty: e.qty, reason: 'import' }) === true) bill += Math.round(valueOf(e.good, e.qty) * TUNING.importCost); }
        sh.bill = bill; sh.loadedAt = now; sh.manifest = sh.goods.map((g) => ({ ...g })); sh.eta = now + (C.nextPhase('touchdown', t) - t) / DAY_LENGTH_SECONDS;
        this._setState(sh, 'loaded', now);
        this._setState(sh, 'in_transit', now);
        boundTo.set(C.index, sh);
        continue;
      }
      if (sh.state === 'detained') continue;
      const pose = C.poseAt(t, { x: 0, y: 0, z: 0, yaw: 0 });
      sh.position.x = pose.x; sh.position.y = pose.y + 2; sh.position.z = pose.z;
      if (AIRBORNE_INBOUND.has(phase) || phase === 'departure' || phase === 'climb') {
        if (sh.state !== 'in_transit') { this._setState(sh, 'in_transit', now); if (sh.held) this._notice(T.district, 'held', `${C.name} left with unpaid cargo aboard (${sh.id})`, T.id); }
        if (phase === 'fly') sh.eta = now + Math.max(0, (C.nextPhase('touchdown', t) - t)) / DAY_LENGTH_SECONDS;
      } else if (ON_GROUND.has(phase)) {
        if (sh.state === 'in_transit') this._setState(sh, 'arrived', now);
        if (sh.state === 'arrived' && DOORS_OPEN.has(phase)) this._tryUnload(sh, C, now, t);
      }
    }
    // unloaded cargo rides the conveyor to the terminal
    for (const sh of [...this.shipments.values()]) {
      if (sh.from !== 'offworld' || sh.state !== 'unloaded') continue;
      const u = Math.min(1, (now - sh.unloadedAt) / Math.max(1e-6, sh.eta - sh.unloadedAt));
      this._lerpPos(sh, u);
      if (now < sh.eta) continue;
      let all = true;
      for (const e of sh.goods.slice()) { const r = this.transfer({ from: `shipment:${sh.id}`, to: T.id, good: e.good, qty: e.qty, reason: 'delivery' }); if (r !== true) all = false; }
      if (all) { this._setState(sh, 'delivered', now); for (const g of [...T.openOrders.keys()]) if (T.openOrders.get(g) === sh.id) T.openOrders.delete(g); }
      else if (!sh.stalled) { sh.stalled = true; this._notice(T.district, 'delay', `${T.name} has no room for shipment ${sh.id}`, T.id); }
    }
    // imports waiting too long for a freighter are a route delay
    for (const sh of this.shipments.values()) if (sh.from === 'offworld' && sh.state === 'ordered' && now - sh.orderedAt > 0.4 && !sh.stalled) { sh.stalled = true; this._notice(T.district, 'delay', `Imports delayed: ${sh.id} (${sh.order.map((g) => GOODS[g.good].label || g.good).join(', ')}) waits for a freighter`, T.id); }
  }
  _tryUnload(sh, C, now, t) {
    const T = this.terminal;
    if (sh.bill > 0 && !sh.paid) {
      let r = this.pay(T.id, 'offworld', sh.bill, 'import bill', `bill:${sh.id}`);
      if (r !== true && sh.goods.some((e) => ESSENTIAL_GOODS.has(e.good))) {
        // stabiliser: a bounded, logged import bond for essential cargo the terminal cannot pay for
        const Tr = this.outside.treasury, short = sh.bill - T.funds, bond = Math.min(short, TUNING.bondCap - Tr.bondToday, Tr.funds);
        if (bond > 0 && this.pay('treasury', T.id, bond, 'bond', `bond:${sh.id}`) === true) { Tr.bondToday += bond; r = this.pay(T.id, 'offworld', sh.bill, 'import bill', `bill:${sh.id}`); }
      }
      if (r !== true) {
        if (!sh.held) { sh.held = true; this.holds.set(C.index, { shipmentId: sh.id, bill: sh.bill, reason: 'unpaid import bill', since: now }); this._notice(T.district, 'held', `${C.name} held on Pad ${C.pad + 1}: ${T.name} cannot pay the ${sh.bill} cr bill for ${sh.id}`, T.id); this.emit('economy:shipment', this._shipmentEvent(sh)); }
        return;
      }
      sh.paid = true;
    }
    if (sh.held) { sh.held = false; this.holds.delete(C.index); }
    this.pay('offworld', T.id, TUNING.portFee, 'port fee');
    // crates come off onto the pad-side stack (the side facing the terminal) and the conveyor takes them there
    const side = T.bay.x >= C.padPos.x ? 1 : -1;
    const stack = { x: C.padPos.x + side * 14, y: C.deckY, z: C.padPos.z };
    sh.path = { a: stack, b: { ...T.bay } };
    sh.position = { ...stack };
    sh.carrier = { kind: 'conveyor', id: C.pad, ship: C.index, name: C.name };
    sh.unloadedAt = now;
    this.stats.unloads++;
    sh.eta = now + Math.max(1 / 96, (dist2(stack, T.bay) + Math.abs(stack.y - T.bay.y)) / TUNING.conveyorSpeed);
    this._setState(sh, 'unloaded', now);
  }
  // detain / release for later builders (customs inspections, surprises): a detained shipment does not move or unload
  detain(id, reason = 'customs inspection') {
    const sh = this.shipments.get(id);
    if (!sh || sh.state === 'detained') return false;
    sh.prevState = sh.state; sh.detained = reason;
    const T = this.byId.get(sh.to); if (T) T.flags.detained++;
    this._setState(sh, 'detained', this.dayTime || 0);
    this._notice(T ? T.district : 'market', 'detained', `Shipment ${sh.id} detained: ${reason}`, sh.to);
    return true;
  }
  release(id) {
    const sh = this.shipments.get(id);
    if (!sh || sh.state !== 'detained') return false;
    const T = this.byId.get(sh.to); if (T) T.flags.detained = Math.max(0, T.flags.detained - 1);
    const back = sh.prevState || 'in_transit';
    sh.detained = null; sh.prevState = null;
    if (sh.eta != null && sh.loadedAt != null && back === 'in_transit') { const held = (this.dayTime || 0) - sh.history[sh.history.length - 1][1]; sh.eta += held; sh.loadedAt += held; }
    this._setState(sh, back, this.dayTime || 0);
    return true;
  }
  // live shipment records (plus the last few delivered ones when `includeRecent`)
  list(includeRecent = false) { const out = [...this.shipments.values()].map((s) => this._publicShipment(s)); if (includeRecent) for (const s of this.recentShipments.slice(-10)) out.push(this._publicShipment(s)); return out; }
  _publicShipment(s) { return { id: s.id, goods: this._goodsOf(s), order: s.order.map((g) => ({ ...g })), cargo: s.goods.map((g) => ({ ...g })), qty: s.qty, from: s.from, to: s.to, state: s.state, carrier: { ...s.carrier }, position: { ...s.position }, eta: s.eta, orderedAt: s.orderedAt, loadedAt: s.loadedAt, bill: s.bill, paid: s.paid, held: s.held, detained: s.detained, history: s.history.slice() }; }

  // ---------------------------------------------------------------------------------------------- visible state
  _notice(district, kind, text, lotId) {
    let list = this.notices.get(district);
    if (!list) { list = []; this.notices.set(district, list); }
    const last = list[list.length - 1];
    if (last && last.text === text && this.dayTime - last.t < 0.5) return;
    list.push({ day: this.day(), t: this.dayTime || 0, kind, text, lotId });
    if (list.length > 8) list.shift();
    this.emit('economy:notice', { district, kind, text, lotId });
  }
  noticeFor(district) {
    const list = (this.notices.get(district) || []).slice(-3).reverse();
    return { district, items: list.map((n) => ({ ...n })), text: list.length ? list.map((n) => n.text).join('\n') : `${district}: no disruptions reported` };
  }
  _notePrices() { /* spikes are noticed when households meet them (see _buyMeals) */ }
  // menu of a food business: items on and off the menu by stock
  menuFor(lotId) {
    const b = typeof lotId === 'number' ? this.byId.get(lotId) : lotId;
    if (!b) return null;
    const items = b.sells.filter((e) => GOODS[e.item] && !GOODS[e.item].service).map((e) => { const q = this.quote(b, e.item); return { item: e.item, label: GOODS[e.item].label || e.item, stock: q.stock, price: q.buy, on: q.available > 0, low: q.available > 0 && q.available <= Math.max(2, (e.stock | 0) * 0.25) }; });
    const on = items.filter((i) => i.on), off = items.filter((i) => !i.on);
    return { business: b.id, name: b.name, items, on: on.map((i) => i.item), off: off.map((i) => i.item), text: on.length ? `${b.name}: ${on.map((i) => `${i.label} ${i.price} cr${i.low ? ' (last few)' : ''}`).join(', ')}${off.length ? ` - off the menu: ${off.map((i) => i.label).join(', ')}` : ''}` : `${b.name}: nothing on the menu today` };
  }
  // what a workshop / shop waits for: the good it lacks and the shipment bringing it (if any)
  waitingFor(lotId) {
    const b = this.byId.get(lotId);
    if (!b) return null;
    for (const rule of b.reorderRule) {
      const g = rule.good;
      if (b.stockOf(g) > 0) continue;
      const shId = b.openOrders.get(g);
      const sh = shId ? this.shipments.get(shId) : null;
      return { business: b.id, good: g, label: GOODS[g].label || g, shipment: sh ? sh.id : null, state: sh ? sh.state : 'unordered', eta: sh ? sh.eta : null, text: sh ? `${b.name} is waiting for ${GOODS[g].label || g} (shipment ${sh.id}, ${sh.state.replace('_', ' ')})` : `${b.name} is out of ${GOODS[g].label || g} and has no supplier to call` };
    }
    return null;
  }
  holdFor(shipIndex) { const h = this.holds.get(shipIndex); return h ? { ...h } : null; }
  repairBerths() {
    const shops = this.businesses.filter((b) => b.role === 'workshop');
    const available = shops.filter((b) => b.stockOf('parts') > 0);
    return { total: shops.length, available: available.length, waiting: shops.filter((b) => b.stockOf('parts') <= 0).map((b) => this.waitingFor(b.id)).filter(Boolean) };
  }
  serviceLevel(lotId) { const b = this.byId.get(lotId); return b ? b.serviceCapability.level : null; }
  uptime() {
    const out = {};
    for (const b of this.businesses) if (b.essential() && b.uptime.total > 0) { const k = b.role; out[k] = out[k] || { up: 0, total: 0 }; out[k].up += b.uptime.up; out[k].total += b.uptime.total; }
    const all = { up: 0, total: 0 };
    for (const k in out) { all.up += out[k].up; all.total += out[k].total; out[k] = +(out[k].up / out[k].total).toFixed(4); }
    return { ...out, all: all.total > 0 ? +(all.up / all.total).toFixed(4) : 1 };
  }
  // W: wealth inside the boundary (integer credits)
  wealth() {
    let w = this.player.credits | 0;
    for (const b of this.businesses) w += b.funds + b.stockValue();
    for (const sh of this.shipments.values()) for (const e of sh.goods) w += valueOf(e.good, e.qty);
    return w;
  }
  negativeStock() { let n = 0; for (const b of this.businesses) for (const v of b.stock.values()) if (v < 0) n++; for (const sh of this.shipments.values()) for (const e of sh.goods) if (e.qty < 0) n++; if (this.player.credits < 0) n++; for (const b of this.businesses) if (b.funds < 0) n++; return n; }
  summary() {
    const live = [...this.shipments.values()];
    const byState = {}; for (const s of live) byState[s.state] = (byState[s.state] || 0) + 1;
    let funds = 0, stockValue = 0; for (const b of this.businesses) { funds += b.funds; stockValue += b.stockValue(); }
    return { day: this.day(), hour: +this.hour().toFixed(2), businesses: this.businesses.length, households: this.households.length, residents: this.residents, funds, stockValue, player: this.player.credits | 0, wealth: this.wealth(), shipments: live.length, byState, delivered: this.recentShipments.length, ledger: { sources: this.journal.totals.sources, sinks: this.journal.totals.sinks, sourceSum: this.journal.totals.sourceSum, sinkSum: this.journal.totals.sinkSum, net: this.journal.net(), entries: this.journal.totals.entries }, households_pool: this.outside.households.funds, treasury: this.outside.treasury.funds, uptime: this.uptime(), holds: [...this.holds.entries()] };
  }

  // ---------------------------------------------------------------------------------------------- save
  serialize() {
    return {
      v: 2, dayTime: this.dayTime, portTime: this.portTime, nextShipmentId: this.nextShipmentId, residents: this.residents, baseline: this.baseline,
      businesses: this.businesses.map((b) => [b.id, b.funds, pairs(b.stock), b.lastVisit, b.lastWageDay, b.lastRestockDay, b.acc, b.flags, [+b.uptime.up.toFixed(4), +b.uptime.total.toFixed(4)], b.serviceCapability.level, [...b.openOrders.entries()]]),
      households: { funds: this.outside.households.funds, lots: this.households.map((h) => [h.lotId, h.acc, h.lastVisit, h.stats, h.visits | 0]) },
      treasury: { funds: this.outside.treasury.funds, bondToday: this.outside.treasury.bondToday, day: this.outside.treasury.day, allocatedToday: [...this.outside.treasury.allocatedToday.entries()] },
      shipments: [...this.shipments.values()], recentShipments: this.recentShipments.slice(-12), recentImports: this.recentImports.slice(-6), holds: [...this.holds.entries()],
      notices: [...this.notices.entries()], stats: { ...this.stats, days: this.stats.days.slice(-14) }, journal: this.journal.serialize(),
    };
  }
  // Restores a v2 state over the freshly built businesses (ids and goods validated against the current layout and
  // catalogue; anything unknown is skipped). Reservations are rebuilt from the open orders.
  restore(data) {
    if (!data || data.v !== 2) return false;
    this.dayTime = typeof data.dayTime === 'number' ? data.dayTime : null; this.portTime = data.portTime || 0;
    this.nextShipmentId = Math.max(1, data.nextShipmentId | 0);
    for (const b of this.businesses) { b.stock.clear(); b.reserved.clear(); b.funds = 0; b.openOrders.clear(); }
    if (Array.isArray(data.businesses)) for (const row of data.businesses) {
      const b = this.byId.get(row[0]); if (!b) continue;
      b.funds = toInt(row[1]);
      if (Array.isArray(row[2])) for (const [g, q] of row[2]) if (GOODS[g]) b.stock.set(g, toInt(q));
      b.lastVisit = typeof row[3] === 'number' ? row[3] : null; b.lastWageDay = row[4] | 0; b.lastRestockDay = row[5] | 0;
      b.acc = row[6] && typeof row[6] === 'object' ? row[6] : {}; b.flags = { overdue: 0, detained: 0, unpaidWages: false, waiting: null, held: false, ...(row[7] || {}) };
      if (Array.isArray(row[8])) b.uptime = { up: +row[8][0] || 0, total: +row[8][1] || 0 };
      if (typeof row[9] === 'number') b.serviceCapability.level = row[9];
      if (Array.isArray(row[10])) b.openOrders = new Map(row[10]);
    }
    if (data.households) { this.outside.households.funds = toInt(data.households.funds); if (Array.isArray(data.households.lots)) for (const row of data.households.lots) { const h = this.householdById.get(row[0]); if (!h) continue; h.acc = { meals: 0, treat: 0, dom: 0, leis: 0, ride: 0, util: 0, ...(row[1] || {}) }; h.lastVisit = typeof row[2] === 'number' ? row[2] : null; if (row[3]) h.stats = { ...h.stats, ...row[3] }; h.visits = row[4] | 0; } }
    if (data.treasury) { const T = this.outside.treasury; T.funds = toInt(data.treasury.funds); T.bondToday = toInt(data.treasury.bondToday); T.day = data.treasury.day | 0; T.allocatedToday = new Map(Array.isArray(data.treasury.allocatedToday) ? data.treasury.allocatedToday : []); }
    this.shipments.clear();
    if (Array.isArray(data.shipments)) for (const s of data.shipments) {
      if (!s || typeof s.id !== 'string' || !LIVE_STATES.has(s.state)) continue;
      if (!(s.from === 'offworld' || this.byId.has(s.from)) || !this.byId.has(s.to)) continue;
      const clean = (l) => (Array.isArray(l) ? l.filter((g) => g && GOODS[g.good]).map((g) => ({ good: g.good, qty: toInt(g.qty) })) : []);
      const goods = clean(s.goods), order = clean(s.order);
      this.shipments.set(s.id, { ...s, goods, order, qty: goods.reduce((a, g) => a + g.qty, 0), carrier: s.carrier || { kind: 'courier', id: null }, position: s.position || { x: 0, y: 0, z: 0 }, history: Array.isArray(s.history) ? s.history : [[s.state, this.dayTime || 0]] });
    }
    this.recentShipments = Array.isArray(data.recentShipments) ? data.recentShipments.filter((s) => s && s.id) : [];
    this.recentImports = Array.isArray(data.recentImports) ? data.recentImports.filter((s) => s && s.id) : [];
    this.holds = new Map(Array.isArray(data.holds) ? data.holds : []);
    this.notices = new Map(Array.isArray(data.notices) ? data.notices : []);
    if (data.stats) this.stats = { ...this.stats, ...data.stats, days: Array.isArray(data.stats.days) ? data.stats.days : [] };
    this.journal.restore(data.journal);
    // reservations: every courier order still waiting to load holds its goods at the supplier
    for (const sh of this.shipments.values()) if (sh.state === 'ordered' && typeof sh.from === 'number') { const S = this.byId.get(sh.from); for (const e of sh.order) S.reserved.set(e.good, S.reservedOf(e.good) + e.qty); }
    for (const b of this.businesses) for (const [g, id] of [...b.openOrders]) if (!this.shipments.has(id)) b.openOrders.delete(g);
    this.fullPassDue = false;
    this.baseline = typeof data.baseline === 'number' ? data.baseline : this.wealth() - this.journal.net();
    return true;
  }
}
