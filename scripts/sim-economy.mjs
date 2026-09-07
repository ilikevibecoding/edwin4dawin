// Multi-day headless run of the city economy (rubric 15 #16, #19):
//   node scripts/sim-economy.mjs [--days 7] [--seed 1337] [--step 96] [--json out.json] [--quiet] [--no-disruptions]
// Runs the real layout, purposes and freighter schedule (src/economy/sim.js + src/economy/arrivals.js, no rendering)
// for N game days, injects the scripted disruptions of the spec (a closed freighter route, a detained medical
// shipment, a salvage shortfall) and reports:
//   conservation      sum(sources) - sum(sinks) == W(end) - W(start), to the credit, every step
//   negative stock    count of negative stock / funds observations (must be 0)
//   price bounds      every quote's factor in [0.75, 1.75], disruption in [-0.25, 0.35], buy >= 1
//   uptime            essential-service uptime (medical / utility / transit) over the run
//   shipments         created / delivered (%), import landings, chains exercised
//   per-day summary   meals, treatments, deliveries, sources, sinks, wealth, household pool, treasury
//   determinism       two runs with the same seed produce the same journal hash
// Exit code 1 when an acceptance check fails.
import { writeFileSync } from 'node:fs';
import { getLayout } from '../src/coruscant/layout.js';
import { allPurposes } from '../src/coruscant/purposes.js';
import { SPACEPORT, DECK_Y } from '../src/coruscant/spaceport.js';
import { EconomySim, TUNING, ESSENTIAL_ROLES } from '../src/economy/sim.js';
import { offlineArrivals } from '../src/economy/arrivals.js';
import { FACTOR_MIN, FACTOR_MAX, DISRUPTION_MIN, DISRUPTION_MAX, GOODS } from '../src/economy/prices.js';
import { DAY_LENGTH_SECONDS } from '../src/constants.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);
const DAYS = Math.max(1, parseInt(opt('--days', '7'), 10));
const SEED = parseInt(opt('--seed', '1337'), 10);
const STEPS = Math.max(24, parseInt(opt('--step', '96'), 10));   // steps per game day (96 = every 15 game minutes)
const QUIET = has('--quiet');
const DISRUPT = !has('--no-disruptions');
const out = opt('--json', null);
const log = (...a) => { if (!QUIET) console.log(...a); };

// FNV-1a over the journal stream (determinism check across runs)
function hasher() { let h = 0x811c9dc5; return { add(str) { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } }, get() { return h.toString(16).padStart(8, '0'); } }; }

// Scripted disruptions (deterministic by day): day 2 06:00-18:00 the bulk freighter's route is closed (its ship is not
// offered to the economy), day 3 the first live shipment carrying medical supplies is detained for 12 hours, day 4 the
// recycling yards collect half their waste (salvage shortfall).
function scriptFor(sim, arrivals) {
  const cargo = arrivals.ships();
  const closed = cargo.length ? cargo[0] : null;
  const live = { routeClosed: false, detained: null, detainedAt: null, shortfall: false, events: [] };
  const provider = { ships: () => (live.routeClosed && closed ? cargo.filter((c) => c !== closed) : cargo), time: () => arrivals.time(), shipRecord: (i) => arrivals.shipRecord(i) };
  const step = (day, hour) => {
    const on = DISRUPT;
    const rc = on && day === 2 && hour >= 6 && hour < 18;
    if (rc !== live.routeClosed) { live.routeClosed = rc; live.events.push([day, hour, rc ? `route closed: ${closed ? closed.name : '-'}` : 'route reopened']); }
    if (on && day === 3 && !live.detained && live.detainedAt === null) {
      const sh = [...sim.shipments.values()].find((s) => s.state !== 'ordered' && s.state !== 'detained' && s.goods.some((g) => g.good === 'medical'));
      if (sh && sim.detain(sh.id, 'customs inspection (scripted)')) { live.detained = sh.id; live.detainedAt = day + hour / 24; live.events.push([day, hour, `detained ${sh.id} (${sh.goods.map((g) => `${g.qty} ${g.good}`).join(', ')}) to #${sh.to}`]); }
    }
    if (live.detained && sim.dayTime - live.detainedAt >= 0.5) { sim.release(live.detained); live.events.push([day, hour, `released ${live.detained}`]); live.detained = null; }
    const sf = on && day === 4;
    if (sf !== live.shortfall) { live.shortfall = sf; sim.modifiers.waste = sf ? 0.5 : 1; live.events.push([day, hour, sf ? 'salvage shortfall: waste collection halved' : 'waste collection restored']); }
  };
  return { provider, step, live };
}

function run(seed, days) {
  const layout = getLayout(seed);
  const purposes = allPurposes(layout);
  const arrivals = offlineArrivals(SPACEPORT.pads, DECK_Y, layout);
  const player = { credits: 250 };
  const H = hasher();
  const shipmentEvents = [];
  let sim = null;
  const script = { provider: arrivals, step: () => {}, live: { events: [] } };
  const onEvent = (name, p) => {
    if (name === 'economy:transfer') H.add(`${p.from}|${p.to}|${p.good}|${p.qty}|${p.credits}|${p.reason}|${p.dW};`);
    else if (name === 'economy:shipment') shipmentEvents.push(p);
  };
  sim = new EconomySim({ layout, purposes, pads: SPACEPORT.pads, deckY: DECK_Y, arrivals: script.provider, player, batch: Infinity, onEvent });
  const sc = scriptFor(sim, arrivals);
  sim.arrivals = sc.provider;
  const W0 = sim.wealth(), net0 = sim.journal.net();
  const report = { seed, days, steps: STEPS, businesses: sim.businesses.length, households: sim.households.length, residents: sim.residents, terminal: sim.terminal ? sim.terminal.name : null, cargoShips: arrivals.ships().map((c) => c.name),
    conservation: { ok: true, worstDrift: 0, checks: 0 }, negativeStock: 0, prices: { ok: true, samples: 0, factorMin: Infinity, factorMax: -Infinity, disruptionMin: Infinity, disruptionMax: -Infinity, buyMin: Infinity, violations: 0 },
    days: [], disruptions: [], chains: {}, uptime: null, shipments: null, ms: 0, hash: null, W0, net0 };
  const t0 = performance.now();
  let dayTime = 0.25;   // start at 06:00 of day 0
  const step = 1 / STEPS;
  const total = days * STEPS;
  const bulkGoods = ['staples', 'water', 'fuel', 'parts', 'components', 'medical', 'textiles', 'salvage'];
  for (let i = 0; i < total; i++) {
    dayTime += step;
    const day = Math.floor(dayTime), hour = (dayTime - day) * 24;
    sc.step(day, hour);
    const portTime = (dayTime - 0.25) * DAY_LENGTH_SECONDS;
    arrivals.set(portTime);
    sim.advance(dayTime, portTime);
    // honesty: the identity holds after every step, negative stock never appears
    const drift = (sim.wealth() - W0) - (sim.journal.net() - net0);
    report.conservation.checks++;
    if (drift !== 0) { report.conservation.ok = false; report.conservation.worstDrift = Math.max(report.conservation.worstDrift, Math.abs(drift)); }
    report.negativeStock += sim.negativeStock();
    // price bounds: sample every quote of every business once an hour
    if (i % Math.max(1, Math.round(STEPS / 24)) === 0) {
      const P = report.prices;
      for (const b of sim.businesses) {
        const goods = new Set([...b.sells.filter((e) => GOODS[e.item] && !GOODS[e.item].service).map((e) => e.item), ...bulkGoods.filter((g) => b.needs.has(g))]);
        for (const g of goods) {
          const q = sim.quote(b, g); if (!q || q.buy == null) continue;
          P.samples++;
          P.factorMin = Math.min(P.factorMin, q.factor); P.factorMax = Math.max(P.factorMax, q.factor);
          P.disruptionMin = Math.min(P.disruptionMin, q.disruption); P.disruptionMax = Math.max(P.disruptionMax, q.disruption);
          P.buyMin = Math.min(P.buyMin, q.buy);
          if (q.factor < FACTOR_MIN - 1e-9 || q.factor > FACTOR_MAX + 1e-9 || q.disruption < DISRUPTION_MIN - 1e-9 || q.disruption > DISRUPTION_MAX + 1e-9 || q.buy < 1) { P.violations++; P.ok = false; }
        }
      }
    }
  }
  // final day summary (the sim rolls a day's stats at midnight; the last partial day is added here)
  sim._rollDay();
  report.ms = performance.now() - t0;
  report.hash = H.get();
  report.disruptions = sc.live.events;
  report.days = sim.stats.days.map((d) => ({ ...d }));
  report.uptime = sim.uptime();
  const delivered = shipmentEvents.filter((e) => e.state === 'delivered').length, created = sim.nextShipmentId - 1, cancelled = shipmentEvents.filter((e) => e.state === 'cancelled').length;
  const detained = shipmentEvents.filter((e) => e.state === 'detained').length;
  report.shipments = { created, delivered, cancelled, detained, deliveredPct: created ? +(100 * delivered / created).toFixed(1) : 0, live: sim.shipments.size, imports: { created: shipmentEvents.filter((e) => e.from === 'offworld' && e.state === 'loaded').length, unloaded: shipmentEvents.filter((e) => e.from === 'offworld' && e.state === 'unloaded').length, delivered: shipmentEvents.filter((e) => e.from === 'offworld' && e.state === 'delivered').length }, holds: [...sim.holds.entries()] };
  // the five chains: at least one delivered shipment on each link and downstream consumption (journal categories)
  const del = shipmentEvents.filter((e) => e.state === 'delivered');
  const kindOf = (id) => (typeof id === 'number' && sim.business(id) ? sim.business(id).kind : String(id));
  const roleOf = (id) => (typeof id === 'number' && sim.business(id) ? sim.business(id).role : String(id));
  const linkCount = (pred) => del.filter((e) => pred(e)).length;
  const T = sim.journal.totals;
  report.chains = {
    staples: { offworldToTerminal: linkCount((e) => e.from === 'offworld' && e.goods.some((g) => g.good === 'staples')), terminalToWholesale: linkCount((e) => roleOf(e.from) === 'terminal' && roleOf(e.to) === 'wholesale' && e.goods.some((g) => g.good === 'staples')), wholesaleToFood: linkCount((e) => roleOf(e.from) === 'wholesale' && roleOf(e.to) === 'food' && e.goods.some((g) => g.good === 'staples')), mealsEaten: report.days.reduce((s, d) => s + (d.meals || 0), 0) },
    parts: { toWorkshops: linkCount((e) => roleOf(e.to) === 'workshop' && e.goods.some((g) => g.good === 'parts')), maintenanceValue: T.sinks.maintenance || 0, repairBerths: sim.repairBerths() },
    medical: { toClinics: linkCount((e) => roleOf(e.to) === 'medical' && e.goods.some((g) => g.good === 'medical')), treatments: report.days.reduce((s, d) => s + (d.treatments || 0), 0) },
    salvage: { wasteCollected: sim.businesses.filter((b) => b.kind === 'recycling_plant').reduce((s, b) => s + (b.acc.wasteTotal || 0), 0), salvageToProducers: linkCount((e) => kindOf(e.from) === 'recycling_plant' && e.goods.some((g) => g.good === 'salvage')), productionValue: T.sources.production || 0 },
    publicFunds: { allocations: T.sources.allocation || 0, levies: T.sinks.levy || 0, serviceLevels: sim.businesses.filter((b) => b.role === 'utility' || b.role === 'transit').map((b) => [b.name, b.serviceCapability.level]) },
  };
  report.ledger = { sources: T.sources, sinks: T.sinks, sourceSum: T.sourceSum, sinkSum: T.sinkSum, net: sim.journal.net(), entries: T.entries, internal: T.internal };
  report.W = sim.wealth(); report.pool = sim.outside.households.funds; report.treasury = sim.outside.treasury.funds;
  report.unpaidWages = sim.businesses.filter((b) => b.flags.unpaidWages).length;
  report.notices = [...sim.notices.entries()].map(([d, l]) => [d, l.length, l[l.length - 1] ? l[l.length - 1].text : '']);
  return { sim, report };
}

const { sim, report } = run(SEED, DAYS);
const second = has('--no-determinism') ? null : run(SEED, DAYS).report;
report.determinism = second ? { ok: second.hash === report.hash, hash: report.hash, second: second.hash } : null;

// ------------------------------------------------------------------------------------------------ report
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
log(`== sim-economy: ${DAYS} days, seed ${SEED}, ${STEPS} steps/day, ${report.businesses} businesses, ${report.households} households (${report.residents} residents), terminal ${report.terminal}, cargo ships ${report.cargoShips.join(' / ')} ==`);
log(`run time ${report.ms.toFixed(0)} ms${second ? ` (x2 for the determinism check)` : ''}`);
log('');
log('day  meals(unmet)  treat  shipments del/new  imports new/unld/del  wages    sources    sinks      W          pool     treasury');
for (const d of report.days) log(`${String(d.day).padStart(3)}  ${String(d.meals).padStart(5)}(${String(d.unmetMeals).padStart(3)})  ${String(d.treatments).padStart(5)}  ${String(d.delivered).padStart(7)}/${String(d.created).padEnd(4)}      ${String(d.imports).padStart(3)}/${String(d.unloads).padStart(3)}/${String(d.importsDelivered).padStart(3)}      ${fmt(d.wages).padStart(6)}   ${fmt(d.sources).padStart(8)}   ${fmt(d.sinks).padStart(8)}   ${fmt(d.wealth).padStart(9)}  ${fmt(d.households).padStart(7)}  ${fmt(d.treasury).padStart(8)}`);
log('');
log(`conservation: ${report.conservation.ok ? 'OK' : 'BROKEN'} (${report.conservation.checks} checks, worst drift ${report.conservation.worstDrift} cr)  W0 ${fmt(report.W0)} -> W ${fmt(report.W)} ; sum(sources) ${fmt(report.ledger.sourceSum)} - sum(sinks) ${fmt(report.ledger.sinkSum)} = ${fmt(report.ledger.net)} over ${fmt(report.ledger.entries)} entries (${fmt(report.ledger.internal)} internal)`);
log(`  sources: ${Object.entries(report.ledger.sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
log(`  sinks:   ${Object.entries(report.ledger.sinks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
log(`negative stock observations: ${report.negativeStock}`);
const P = report.prices;
log(`price bounds: ${P.ok ? 'OK' : 'VIOLATED'} over ${fmt(P.samples)} quotes - factor ${P.factorMin.toFixed(3)}..${P.factorMax.toFixed(3)} (rule ${FACTOR_MIN}..${FACTOR_MAX}), disruption ${P.disruptionMin.toFixed(3)}..${P.disruptionMax.toFixed(3)} (rule ${DISRUPTION_MIN}..${DISRUPTION_MAX}), lowest ask ${P.buyMin} cr, violations ${P.violations}`);
const U = report.uptime;
log(`essential-service uptime: medical ${(100 * (U.medical ?? 1)).toFixed(1)}%  utility ${(100 * (U.utility ?? 1)).toFixed(1)}%  transit ${(100 * (U.transit ?? 1)).toFixed(1)}%  all ${(100 * U.all).toFixed(1)}%`);
const S = report.shipments;
log(`shipments: ${fmt(S.created)} created, ${fmt(S.delivered)} delivered (${S.deliveredPct}%), ${S.cancelled} cancelled, ${S.detained} detained, ${S.live} live at the end; imports loaded ${S.imports.created}, unloaded ${S.imports.unloaded}, delivered ${S.imports.delivered}; held freighters now: ${S.holds.length}`);
log(`chains: staples offworld->terminal ${report.chains.staples.offworldToTerminal}, terminal->wholesale ${report.chains.staples.terminalToWholesale}, wholesale->food ${report.chains.staples.wholesaleToFood}, meals ${fmt(report.chains.staples.mealsEaten)} | parts->workshops ${report.chains.parts.toWorkshops}, maintenance ${fmt(report.chains.parts.maintenanceValue)} cr, repair berths ${report.chains.parts.repairBerths.available}/${report.chains.parts.repairBerths.total} | medical->clinics ${report.chains.medical.toClinics}, treatments ${fmt(report.chains.medical.treatments)} | salvage->producers ${report.chains.salvage.salvageToProducers}, production ${fmt(report.chains.salvage.productionValue)} cr | allocations ${fmt(report.chains.publicFunds.allocations)} cr, levies ${fmt(report.chains.publicFunds.levies)} cr, service levels ${report.chains.publicFunds.serviceLevels.map(([n, l]) => l.toFixed(2)).join(' ')}`);
log(`disruptions: ${report.disruptions.map(([d, h, t]) => `day ${d} ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')} ${t}`).join(' ; ') || 'none'}`);
log(`notices: ${report.notices.map(([d, n, t]) => `${d} (${n}): ${t}`).join(' | ')}`);
log(`businesses with unpaid wages: ${report.unpaidWages} of ${report.businesses}; household pool ${fmt(report.pool)} cr; treasury ${fmt(report.treasury)} cr`);
if (report.determinism) log(`determinism: ${report.determinism.ok ? 'OK' : 'DIFFERENT'} (journal hash ${report.determinism.hash} vs ${report.determinism.second})`);

const checks = [
  ['conservation identity holds every step', report.conservation.ok],
  ['no negative stock or funds', report.negativeStock === 0],
  ['price rule bounds respected', P.ok && P.samples > 0],
  ['essential-service uptime >= 90%', U.all >= 0.9],
  ['shipments delivered >= 80%', S.deliveredPct >= 80 || S.created === 0],
  ['imports rode real freighters', S.imports.unloaded > 0],
  ['all five chains moved goods', report.chains.staples.wholesaleToFood > 0 && report.chains.parts.toWorkshops > 0 && report.chains.medical.toClinics > 0 && report.chains.salvage.salvageToProducers > 0 && report.chains.publicFunds.allocations + report.chains.publicFunds.levies > 0],
  ['run under a minute', report.ms < 60000],
  ['deterministic', !report.determinism || report.determinism.ok],
];
let fail = 0;
for (const [name, ok] of checks) { log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
if (out) { writeFileSync(out, JSON.stringify({ ...report, checks: checks.map(([n, ok]) => ({ name: n, ok })) }, null, 1)); log(`report written to ${out}`); }
console.log(`${checks.length - fail} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
