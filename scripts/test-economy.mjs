// Economy verification (rubric 08 + rubric 07 #2 + rubric 15 economy v2):
//   node scripts/test-economy.mjs                      offline: price book, job boards, payout maths, restock ledger,
//                                                      then economy v2 - goods catalogue, price rule, businesses and
//                                                      chains, atomic transfers, arbitrage, the ledger over two
//                                                      simulated days with a stabiliser, shipment lifecycles bound
//                                                      to the freighter schedule, holds, detain / release, visible
//                                                      state, save / restore continuation, balance
//   node scripts/test-economy.mjs --url http://localhost:5215 [--shots /tmp/economy-shots]
//                                                      + headless CDP run against the dev server: entrance signs and
//                                                        the enter/leave toast, buy an apple, sell wheat (v2 quotes),
//                                                        accept and complete a courier job, job terminal right-click,
//                                                        rent a room and sleep, buy a ship, admin buttons, the v2
//                                                        read API, an import riding a real freighter through its pad
//                                                        phases with hold crates, detain / release, save / reload
import { mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { getLayout, LEVELS } from '../src/coruscant/layout.js';
import { allPurposes, lotsOfKind, purposeFor } from '../src/coruscant/purposes.js';
import { SPACEPORT, DECK_Y } from '../src/coruscant/spaceport.js';
import { GOODS, SHIP_CLASSES, DISTRICT_MULT, SELL_RATIO, PAWN_RATIO, buyPrice, sellPrice, vendorBuys, vendorSellPrice, itemCategory, goodsKey, BULK_GOODS, bulkOf, isBulk, FACTOR_MIN, FACTOR_MAX, DISRUPTION_MIN, DISRUPTION_MAX, scarcityFactor, clampDisruption, askPrice, bidPrice } from '../src/economy/prices.js';
import { generateBoard, REWARD, JOB_KINDS, TERMINAL_KINDS } from '../src/economy/jobs.js';
import { StockLedger } from '../src/economy/stock.js';
import { EconomySim, TUNING, SHIPMENT_STATES, ESSENTIAL_ROLES } from '../src/economy/sim.js';
import { offlineArrivals, noArrivals, DOORS_OPEN, ON_GROUND } from '../src/economy/arrivals.js';
import { SOURCE_CATEGORIES, SINK_CATEGORIES } from '../src/economy/ledger.js';
import { DAY_LENGTH_SECONDS } from '../src/constants.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = opt('--url', null);
const shots = opt('--shots', '/tmp/economy-shots');
const seed = parseInt(opt('--seed', '1337'), 10);

let passed = 0, failed = 0;
const log = (...a) => console.log(...a);
const check = (name, cond, detail = '') => { if (cond) { passed++; log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); } else { failed++; log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const I = { APPLE: 1000, WHEAT: 1002 };
const B = { HOLO_SIGN: 88, CONSOLE: 89 };
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ================================================================================================ offline
log('== Price book ==');
const bad = [];
for (const [key, g] of Object.entries(GOODS)) {
  if (!(g.base > 0) && !(key === 'waste' && g.base === 0) || !g.cat) bad.push(key);
  if (g.service || g.bulk === true ? g.id !== null : !Number.isInteger(g.id)) bad.push(key + ':id');
}
check('every good has a positive base price (waste: 0), a category and an item id (services and bulk goods: null)', bad.length === 0, bad.join(','));
const rubric = { apple: 4, bread: 8, seeds: 1, planks: 2, torch: 3, wool: 6, chest: 40, door: 25, speeder_ride: 15, room_night: 60, ship_speeder: 4000, ship_shuttle: 14000, ship_freighter: 32000, ship_yacht: 60000 };
const off = Object.entries(rubric).filter(([k, v]) => GOODS[k].base !== v);
check('rubric base prices (apple 4, bread 8, seeds 1, planks 2, torch 3, wool 6, chest 40, door 25, ride 15, room 60, ships 4k/14k/32k/60k)', off.length === 0, off.map(([k]) => k).join(','));
const meats = ['cooked_chicken', 'cooked_beef', 'cooked_porkchop'].map((k) => GOODS[k].base);
check('cooked meat 12-18', meats.every((v) => v >= 12 && v <= 18), meats.join('/'));
check('district multipliers: undercity/entertainment 0.8, senate 1.4', DISTRICT_MULT.undercity === 0.8 && DISTRICT_MULT.entertainment === 0.8 && DISTRICT_MULT.senate === 1.4);
check('buy price applies the district multiplier (apple: 4 base -> 3 undercity, 6 senate, 4 elsewhere)', buyPrice('apple', 'undercity') === 3 && buyPrice('apple', 'senate') === 6 && buyPrice('apple', null) === 4 && buyPrice('apple', 'residential') === 4);
check('ship prices are quoted flat in every district', SHIP_CLASSES.every((c) => buyPrice('ship_' + c, 'senate') === GOODS['ship_' + c].base));
check('sell price = 45% of buy (bread 8 -> 4, chest 40 -> 18, senate bread 11 -> 5)', SELL_RATIO === 0.45 && sellPrice('bread') === 4 && sellPrice('chest') === 18 && sellPrice('bread', 'senate') === 5);
check('pawn pays 30% (chest 40 -> 12)', PAWN_RATIO === 0.3 && sellPrice('chest', null, null, true) === 12);
check('offers under 0.75 cr are not made: dug-up cobblestone, stone, dirt and seeds sell for nothing anywhere, wheat/feathers still fetch 1', sellPrice('cobblestone') === null && sellPrice('stone', 'senate') === null && sellPrice('grass_block', null, null, true) === null && sellPrice('seeds', 'senate') === null && sellPrice('wheat') === 1 && sellPrice('feather') === 1 && vendorSellPrice({ district: 'market', buys: ['any'], sells: [] }, 3) === null);
check('a vendor entry price overrides the base (cantina bread 10 -> sells for 10, buys at 5)', buyPrice('bread', null, 10) === 10 && sellPrice('bread', null, 10) === 5);
check('category trading: a food shop buys apples/wheat/meat but not planks; a general store buys planks; pawn buys anything', vendorBuys(['food', 'produce', 'meat'], I.APPLE) && vendorBuys(['food', 'produce', 'meat'], I.WHEAT) && vendorBuys(['food', 'produce', 'meat'], GOODS.raw_beef.id) && !vendorBuys(['food', 'produce', 'meat'], GOODS.planks.id) && vendorBuys(['material'], GOODS.planks.id) && vendorBuys(['any'], GOODS.planks.id) && vendorBuys(['any'], I.APPLE) && !vendorBuys([], I.APPLE));
check('farm goods are categorised so produce/meat/hide vendors buy them (wheat, meat, leather, feathers, ores)', itemCategory(I.WHEAT) === 'produce' && itemCategory(GOODS.raw_beef.id) === 'meat' && itemCategory(GOODS.leather.id) === 'hide' && itemCategory(GOODS.feather.id) === 'hide' && itemCategory(GOODS.iron_ore.id) === 'ore' && goodsKey(I.APPLE) === 'apple');
const grocer = { district: 'market', buys: ['food', 'produce', 'meat'], sells: [{ item: 'apple', price: 4, stock: 40 }, { item: 'wheat', price: 3, stock: 32 }] };
check('vendorSellPrice: listed goods use the vendor price x district (market 0.9: wheat 3 -> 1), unlisted use the book', vendorSellPrice(grocer, I.WHEAT) === Math.max(1, Math.round(3 * 0.9 * 0.45)) && vendorSellPrice(grocer, GOODS.raw_beef.id) === Math.max(1, Math.round(9 * 0.9 * 0.45)) && vendorSellPrice(grocer, GOODS.planks.id) === null);

log('\n== Job boards ==');
const layout = getLayout(seed);
const all = allPurposes(layout);
const centre = (lot) => ({ x: lot.door ? lot.door.out.x + 0.5 : (lot.x0 + lot.x1) / 2, z: lot.door ? lot.door.out.z + 0.5 : (lot.z0 + lot.z1) / 2 });
const ctx = { lots: all.map(({ lot, purpose }) => ({ id: lot.id, ...centre(lot), kind: purpose.kind, name: purpose.name, category: purpose.category, district: purpose.district, sells: purpose.sells })), pads: [{ x: 2600, z: 60 }, { x: 2600, z: 100 }, { x: 2600, z: 140 }, { x: 2640, z: 60 }, { x: 2640, z: 100 }, { x: 2640, z: 140 }], deckY: 97 };
const terminals = lotsOfKind(layout, TERMINAL_KINDS);
check(`job terminals exist in the layout (${TERMINAL_KINDS.join('/')})`, terminals.length >= 6, `${terminals.length} terminals`);
const termLot = ({ lot, purpose }) => ({ ...lot, purposeKind: purpose.kind, purposeName: purpose.name });
let sizes = [], firstCourier = true, kindsSeen = new Set(), badJobs = [];
for (let day = 0; day < 4; day++) {
  for (const t of terminals) {
    const jobs = generateBoard(seed, day, termLot(t), ctx);
    sizes.push(jobs.length);
    if (!jobs.length || jobs[0].kind !== 'courier') firstCourier = false;
    for (const j of jobs) {
      kindsSeen.add(j.kind);
      if (!JOB_KINDS.includes(j.kind) || !j.id || !j.title || !j.desc || !(j.reward > 0) || j.expiresIn !== 1) badJobs.push(j.id + ':shape');
      if (j.kind === 'courier' && !(j.distance >= 100 && j.distance <= 600 && j.reward >= 30 && j.reward <= 120 && j.reward === REWARD.courier(j.distance))) badJobs.push(j.id + ':courier');
      if (j.kind === 'delivery' && !(j.items[0].count >= 2 && j.items[0].count <= 8 && j.cost >= 12 && j.cost <= 260 && j.reward === Math.round(j.cost * 1.4) && j.vendor && j.vendor.lotId !== t.lot.id)) badJobs.push(j.id + ':delivery');
      if (j.kind === 'ship_repair' && !(j.parts >= 3 && j.parts <= 5 && j.reward >= 80 && j.reward <= 200 && j.pad && j.pad.index >= 0)) badJobs.push(j.id + ':repair');
      if (j.kind === 'cleanup' && !(j.count >= 4 && j.count <= 8 && j.reward === 5 * j.count)) badJobs.push(j.id + ':cleanup');
      if (j.kind === 'harvest' && !(j.items[0].count >= 3 && j.to && j.reward === REWARD.harvest(j.items[0].key === 'wheat' ? 'wheat' : 'meat', j.items[0].count))) badJobs.push(j.id + ':harvest');
    }
  }
}
check('every board lists 3-6 jobs', sizes.every((n) => n >= 3 && n <= 6), `sizes ${Math.min(...sizes)}..${Math.max(...sizes)} over ${sizes.length} boards`);
check('the first job of every board is a courier run', firstCourier);
check('all five job kinds appear across terminals and days', JOB_KINDS.every((k) => kindsSeen.has(k)), [...kindsSeen].join(','));
check('job payouts follow the book (courier 30-120 by distance, delivery 2-8 goods worth <= 260 cr paying cost+40%, repair 80-200, cleanup 5 each, harvest)', badJobs.length === 0, badJobs.slice(0, 6).join(' '));
const t0 = termLot(terminals[0]);
const a = JSON.stringify(generateBoard(seed, 3, t0, ctx)), b = JSON.stringify(generateBoard(seed, 3, t0, ctx));
check('board generation is deterministic for (seed, day, lot)', a === b);
check('a different day or seed gives a different board', JSON.stringify(generateBoard(seed, 4, t0, ctx)) !== a && JSON.stringify(generateBoard(seed + 1, 3, t0, ctx)) !== a);
check('different terminals get different boards on the same day', JSON.stringify(generateBoard(seed, 3, termLot(terminals[1]), ctx)) !== a);

log('\n== Payout maths ==');
check('courier: 30 cr at 100 blocks, 120 at 600, concave in distance (350 -> 94), clamped outside', REWARD.courier(100) === 30 && REWARD.courier(600) === 120 && REWARD.courier(350) === 94 && REWARD.courier(225) === 75 && REWARD.courier(50) === 30 && REWARD.courier(900) === 120 && REWARD.courier(300) < REWARD.courier(400));
check('delivery: cost + 40% (100 -> 140, 37 -> 52)', REWARD.delivery(100) === 140 && REWARD.delivery(37) === 52);
check('ship repair: 40 per part, clamped 80-200 (3 parts 120, 5 parts 200, jitter -40 -> 80 floor)', REWARD.shipRepair(3) === 120 && REWARD.shipRepair(5) === 200 && REWARD.shipRepair(3, -40) === 80 && REWARD.shipRepair(5, 40) === 200);
check('cleanup: 5 per block', REWARD.cleanup(6) === 30 && REWARD.cleanup(8) === 40);
check('harvest: 8/wheat or 18/meat + 15 (10 wheat 95, 4 meat 87)', REWARD.harvest('wheat', 10) === 95 && REWARD.harvest('meat', 4) === 87);

log('\n== Restock ledger (pass-1 vendors without a Business record) ==');
const st = new StockLedger();
const apple = { item: 'apple', stock: 40 };
check('fresh ledger shows the full stock', st.stockOf(7, apple, 0) === 40);
check('a sale reduces stock; over-buying is capped at what is left', st.take(7, apple, 9, 0) === 9 && st.stockOf(7, apple) === 31 && st.take(7, apple, 100, 0) === 31 && st.stockOf(7, apple) === 0 && st.take(7, apple, 1, 0) === 0);
check('stock is per (lot, item)', st.stockOf(8, apple) === 40 && st.stockOf(7, { item: 'bread', stock: 24 }) === 24);
const snapSt = JSON.stringify(st.serialize());
const st2 = new StockLedger(); st2.restore(JSON.parse(snapSt));
check('ledger survives a serialize / restore round trip', st2.stockOf(7, apple, 0) === 0 && st2.day === 0);
check('the next day restocks everything', st.roll(1) === true && st.stockOf(7, apple) === 40 && st.roll(1) === false);

// ================================================================================================ offline: economy v2
// A headless EconomySim over the same layout the game uses, driven by the same clocks as scripts/sim-economy.mjs.
function makeSim(o = {}) {
  const arrivals = o.arrivals || offlineArrivals(SPACEPORT.pads, DECK_Y, layout);
  const player = { credits: o.credits ?? 250 };
  const S = { arrivals, player, events: [], hook: null };
  S.sim = new EconomySim({ layout, purposes: all, pads: SPACEPORT.pads, deckY: DECK_Y, arrivals, player, batch: Infinity, onEvent: (name, p) => { S.events.push({ name, ...p }); if (S.hook) S.hook(name, p); } });
  return S;
}
// advance `days` game days in `steps` per day; returns how often the identity broke and negative stock was seen
function runDays(S, days, o = {}) {
  const steps = o.steps || 96;
  let dayTime = S.sim.dayTime ?? 0.25;
  const n = Math.round(days * steps);
  const out = { drift: 0, neg: 0, worst: 0 };
  for (let i = 0; i < n; i++) {
    dayTime += 1 / steps;
    const portTime = (dayTime - 0.25) * DAY_LENGTH_SECONDS;
    if (S.arrivals.set) S.arrivals.set(portTime);
    if (o.each) o.each(dayTime, portTime, i);
    S.sim.advance(dayTime, portTime);
    const d = S.sim.drift();
    if (d !== 0) { out.drift++; out.worst = Math.max(out.worst, Math.abs(d)); }
    out.neg += S.sim.negativeStock();
  }
  return out;
}
const snapOf = (sim, ids) => JSON.stringify({ b: ids.map((id) => { const x = sim.business(id); return [x.funds, [...x.stock].sort(), [...x.reserved].sort()]; }), p: sim.player.credits, n: sim.journal.totals.entries, W: sim.wealth(), sh: [...sim.shipments.values()].map((s) => [s.id, s.state, s.goods]) });
const fnv = (strs) => { let h = 0x811c9dc5; for (const s of strs) for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const streamOf = (S) => fnv(S.events.filter((e) => e.name === 'economy:transfer').map((e) => `${e.from}|${e.to}|${e.good}|${e.qty}|${e.credits}|${e.reason}|${e.dW};`));

log('\n== Goods catalogue (rubric 15 #1) ==');
const keys = Object.keys(GOODS);
const wholesale = ['staples', 'water', 'fuel', 'parts', 'components', 'medical', 'textiles', 'salvage', 'waste'];
check(`catalogue: >= 40 goods and < 80 keys, the wholesale part < 12 (${keys.length} goods, ${BULK_GOODS.length} bulk)`, keys.length >= 40 && keys.length < 80 && BULK_GOODS.length < 12 && BULK_GOODS.length === wholesale.length);
check('the wholesale categories of spec section 10 are bulk goods with a base price, a category, a unit and no item id', wholesale.every((k) => GOODS[k] && GOODS[k].bulk === true && GOODS[k].cat && GOODS[k].unit && GOODS[k].id === null && GOODS[k].base >= 0) && GOODS.parts.base === 25 && GOODS.medical.base === 20, wholesale.map((k) => `${k} ${GOODS[k].base}`).join(', '));
const retailKeys = keys.filter((k) => !GOODS[k].service && !isBulk(k));
const unmapped = retailKeys.filter((k) => !bulkOf(k));
check('every retail item maps to exactly one bulk input: food -> staples, blocks -> textiles, electronics -> components; services and bulk goods map to nothing', unmapped.length === 0 && bulkOf('apple') === 'staples' && bulkOf('cooked_beef') === 'staples' && bulkOf('planks') === 'textiles' && bulkOf('glow_panel') === 'components' && bulkOf('console') === 'components' && bulkOf('iron_ore') === 'parts' && bulkOf('speeder_ride') === null && bulkOf('staples') === null && bulkOf('nonsense') === null, unmapped.join(','));
const soldUnknown = []; for (const { purpose } of all) for (const e of purpose.sells || []) if (!GOODS[e.item]) soldUnknown.push(e.item);
check('everything a purpose kind sells is in the catalogue, and every kind carries its trade profile (role, supplies, consumes, produces)', soldUnknown.length === 0 && all.every(({ purpose }) => purpose.role && Array.isArray(purpose.supplies) && Array.isArray(purpose.consumes) && Array.isArray(purpose.produces)), soldUnknown.slice(0, 5).join(','));
const docPath = new URL('../docs/overhaul/economy.md', import.meta.url);
const doc = existsSync(docPath) ? readFileSync(docPath, 'utf8') : '';
check('docs/overhaul/economy.md documents every wholesale good and the price rule constants', wholesale.every((k) => doc.includes('`' + k + '`')) && doc.includes('0.75') && doc.includes('1.75') && doc.includes('-0.25') && doc.includes('0.35'));

log('\n== Price rule (rubric 15 #8) ==');
check('scarcity factor = clamp(target / available, 0.75, 1.75); an empty shelf quotes the ceiling, no target quotes 1', scarcityFactor(40, 40) === 1 && scarcityFactor(40, 80) === FACTOR_MIN && scarcityFactor(40, 10) === FACTOR_MAX && scarcityFactor(40, 0) === FACTOR_MAX && scarcityFactor(0, 5) === 1 && Math.abs(scarcityFactor(40, 30) - 4 / 3) < 1e-9);
check('the disruption modifier is bounded to [-0.25, +0.35]', clampDisruption(2) === DISRUPTION_MAX && clampDisruption(-2) === DISRUPTION_MIN && clampDisruption(0.1) === 0.1 && clampDisruption(0) === 0 && DISRUPTION_MIN === -0.25 && DISRUPTION_MAX === 0.35);
check('ask = round(base x district x (factor + disruption)), never under 1 cr: apple 4 -> 4 at target, 7 empty, 6 in the senate, 5 with +0.35 disruption', askPrice(4, null, 40, 40) === 4 && askPrice(4, null, 40, 0) === 7 && askPrice(4, 'senate', 40, 40) === 6 && askPrice(4, null, 40, 40, 0.35) === 5 && askPrice(4, null, 40, 40, 5) === 5 && askPrice(1, 'undercity', 40, 80) === 1 && askPrice(null, null, 1, 1) === null);
let mono = true, bidBelow = true, samples = 0;
for (const b0 of [3, 8, 25, 40]) for (const d of [null, 'senate', 'undercity', 'market']) { let prevA = Infinity, prevB = Infinity; for (let av = 0; av <= 100; av += 5) { const A = askPrice(b0, d, 40, av), Bd = bidPrice(b0, d, 40, av); samples++; if (A > prevA) mono = false; if (Bd != null && Bd > prevB) mono = false; if (Bd != null && Bd >= A) bidBelow = false; prevA = A; if (Bd != null) prevB = Bd; } }
check(`asks and bids fall monotonically as the shelf fills and the bid is always under the ask (${samples} points)`, mono && bidBelow);
check('bid = 45% of the ask after the sale (pawn 30%); bids under 0.75 cr are not made', bidPrice(4, null, 40, 39) === 2 && bidPrice(40, null, 40, 40, 0, true) === 12 && bidPrice(1, 'undercity', 40, 100) === null && bidPrice(8, 'senate', 40, 0) === Math.max(1, Math.round(8 * 1.4 * FACTOR_MAX * SELL_RATIO)));

log('\n== Businesses and households (rubric 15 #2, #3) ==');
const S1 = makeSim(), sim = S1.sim;
const traders = all.filter(({ purpose }) => (purpose.sells && purpose.sells.length) || (purpose.buys && purpose.buys.length) || purpose.consumes.length || purpose.produces.length || purpose.supplies.length || purpose.service);
check(`every trading / serving lot is a Business (${sim.businesses.length} businesses over ${all.length} purposed lots, ${traders.length} traders)`, sim.businesses.length >= 250 && traders.every(({ lot }) => sim.business(lot.id)));
const shapeOk = sim.businesses.every((x) => Number.isInteger(x.id) && x.name && x.kind && x.district && x.stock instanceof Map && x.target instanceof Map && x.reserved instanceof Map && Number.isInteger(x.capacity) && x.capacity >= x.units() && Number.isInteger(x.funds) && x.funds >= 0 && (x.hours === null || Array.isArray(x.hours)) && x.serviceCapability && typeof x.serviceCapability.level === 'number' && Array.isArray(x.suppliers) && Array.isArray(x.customers) && Array.isArray(x.reorderRule) && typeof x.isOpen === 'function');
check('Business records have the rubric shape (stock / target / reserved Maps, capacity >= units, funds, hours, serviceCapability, suppliers, customers, reorderRule, isOpen(hour))', shapeOk);
const badSup = [];
for (const x of sim.businesses) { for (const id of x.suppliers) if (!sim.business(id)) badSup.push(`${x.id}->${id}`); for (const r of x.reorderRule) if (r.from !== 'offworld' && !sim.business(r.from)) badSup.push(`${x.id}:${r.good}->${r.from}`); if (!x.reorderRule.every((r) => r.qty > 0 && r.min >= 0 && r.min <= r.qty)) badSup.push(`${x.id}:rule`); }
check('every supplier id resolves to a Business (offworld only for the terminal) and reorder rules are min <= qty', badSup.length === 0, badSup.slice(0, 5).join(' '));
check('the cargo terminal is the customs house nearest the pads and imports everything it stocks from offworld', sim.terminal && sim.terminal.role === 'terminal' && sim.terminal.needs.size >= 5 && [...sim.terminal.supplierOf.values()].every((v) => v === 'offworld') && sim.terminal.reorderRule.every((r) => r.from === 'offworld'), `${sim.terminal.name}: ${[...sim.terminal.needs].join(', ')}`);
const S2 = makeSim();
check('two fresh economies of the same layout are identical (businesses, households, journal, wealth)', JSON.stringify(sim.businesses.map((x) => x.toJSON())) === JSON.stringify(S2.sim.businesses.map((x) => x.toJSON())) && sim.wealth() === S2.sim.wealth() && sim.journal.net() === S2.sim.journal.net() && JSON.stringify(sim.households.map((h) => [h.lotId, h.size, h.food, h.clinic])) === JSON.stringify(S2.sim.households.map((h) => [h.lotId, h.size, h.food, h.clinic])));
check(`one household per residential lot, attached to its nearest food / clinic / utility businesses (${sim.households.length} households, ${sim.residents} residents)`, sim.households.length >= 40 && sim.residents >= 600 && sim.residents <= 1500 && sim.households.every((h) => h.size >= 4 && h.food.length >= 1 && h.clinic != null && h.utility != null && sim.business(h.food[0]).customers.includes(`household:${h.lotId}`)));
check('opening stock and funds are journaled as the endowment source, so the identity holds from an empty city (baseline = the 250 cr wallet)', sim.journal.totals.sources.endowment > 0 && sim.drift() === 0 && sim.baseline === 250 && sim.journal.totals.entries > sim.businesses.length);
const srcText = readdirSync(new URL('../src/economy/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL('../src/economy/' + f, import.meta.url), 'utf8')).join('\n');
check('no Math.random anywhere in src/economy (rubric 15 #19)', !/Math\.random\s*\(/.test(srcText));

log('\n== Linked chains (rubric 15 #4) ==');
const chain = (x, good) => { const path = [x.id]; let cur = x; for (let i = 0; i < 6 && cur; i++) { const s = cur.supplierOf.get(good); if (s === undefined) return { path, end: cur }; path.push(s); if (s === 'offworld') return { path, end: 'offworld' }; cur = sim.business(s); } return { path, end: null }; };
const roleOf = (id) => (typeof id === 'number' && sim.business(id) ? sim.business(id).role : String(id));
const foodShops = sim.businesses.filter((x) => x.role === 'food' && x.needs.has('staples'));
const staplesChains = foodShops.map((x) => chain(x, 'staples'));
check(`(a) staples: every diner / market restocks from a wholesale node, the node from the terminal, the terminal from offworld (${foodShops.length} food businesses)`, foodShops.length >= 40 && staplesChains.every((c) => c.end === 'offworld' && c.path.includes(sim.terminal.id) && c.path.length <= 4) && staplesChains.filter((c) => roleOf(c.path[1]) === 'wholesale').length >= foodShops.length * 0.8, `${staplesChains.filter((c) => roleOf(c.path[1]) === 'wholesale').length} via depots / warehouses, e.g. ${staplesChains[0].path.map((p) => (typeof p === 'number' ? sim.business(p).name : p)).join(' <- ')}`);
const workshops = sim.businesses.filter((x) => x.role === 'workshop');
const partsChains = workshops.map((x) => chain(x, 'parts'));
const makesParts = (x) => x && x.purpose.produces.some((pr) => pr.good === 'parts' && pr.from === 'salvage');
const yardOf = (x) => { const s = sim.business(x.supplierOf.get('salvage')); return s && s.kind === 'recycling_plant'; };
const buyers = workshops.filter((x) => !makesParts(x)), selfMade = workshops.filter(makesParts);
check(`(b) parts: repair shops and hangars (${buyers.length}) buy parts from the nearest depot / warehouse or foundry and the chain ends at a foundry / droid factory or offworld; droid shops (${selfMade.length}) rebuild parts from a recycling yard's salvage on site`, buyers.length >= 3 && selfMade.length >= 1 && buyers.map((x) => chain(x, 'parts')).every((c) => (roleOf(c.path[1]) === 'wholesale' || makesParts(sim.business(c.path[1]))) && (c.end === 'offworld' || makesParts(c.end))) && selfMade.every(yardOf) && sim.repairBerths().total === workshops.length, `${partsChains.filter((c) => roleOf(c.path[1]) === 'wholesale').length} via depots, ${partsChains.filter((c) => makesParts(c.end)).length} end at a foundry; e.g. ${partsChains[0].path.map((p) => (typeof p === 'number' ? sim.business(p).name : p)).join(' <- ')}`);
const clinics = sim.businesses.filter((x) => x.role === 'medical');
const medChains = clinics.map((x) => chain(x, 'medical'));
check(`(c) medical: clinics, pharmacies and bacta wards (${clinics.length}) stock medical kits from the terminal's chain and treatments use one kit each`, clinics.length >= 5 && medChains.every((c) => c.end === 'offworld' && c.path.length <= 4) && clinics.every((x) => (x.target.get('medical') || 0) >= x.staff * 4 * TUNING.daysCover && x.serviceCapability.perDay === x.staff * 12));
const yards = sim.businesses.filter((x) => x.kind === 'recycling_plant'), makers = sim.businesses.filter((x) => x.role === 'producer' && x.purpose.produces.some((pr) => pr.good === 'parts' && pr.from === 'salvage'));
check(`(d) salvage: recycling plants (${yards.length}) turn waste into salvage; foundries / droid factories (${makers.length}) turn salvage from the nearest yard into parts`, yards.length >= 1 && makers.length >= 1 && yards.every((x) => x.purpose.produces.some((pr) => pr.good === 'salvage' && pr.from === 'waste')) && makers.every((x) => yards.some((y) => y.id === x.supplierOf.get('salvage'))));
const utilities = sim.businesses.filter((x) => x.role === 'utility'), transit = sim.businesses.filter((x) => x.role === 'transit');
check(`(e) public funds: utilities (${utilities.map((x) => x.kind).join('/')}) and transit (${transit.length}) are essential services with a service level and a fuel / parts input`, utilities.length >= 1 && transit.length >= 1 && [...utilities, ...transit].every((x) => x.essential() && x.serviceCapability.level === 1 && x.needs.has('fuel')) && ESSENTIAL_ROLES.has('medical') && utilities.some((x) => x.purpose.produces.some((pr) => pr.good === 'water')));

log('\n== Atomic transfers (rubric 15 #5, #6, #7) ==');
const A = makeSim(), s3 = A.sim, T = s3.terminal;
const Wn = s3.businesses.find((x) => x.role === 'wholesale' && x.needs.has('staples') && x.room() >= 10 && x.funds >= 100);
const small = s3.businesses.find((x) => x.role === 'food' && x.room() >= 1 && x.room() + 1 <= T.available('staples'));
const grocerB = s3.businesses.find((x) => x.sells.some((e) => e.item === 'apple') && vendorBuys(x.buys, I.APPLE) && x.available('apple') >= 3);
const ids = [T.id, Wn.id, small.id, grocerB.id];
const tS0 = T.stockOf('staples'), wS0 = Wn.stockOf('staples'), tF0 = T.funds, wF0 = Wn.funds, n0 = s3.journal.totals.entries, W0a = s3.wealth();
const okReq = { from: T.id, to: Wn.id, good: 'staples', qty: 5, credits: 20, reason: 'wholesale', key: 'test:k1' };
const r1 = s3.transfer(okReq);
check('a valid transfer returns true and changes exactly the four fields (two stocks, two funds) with one journal entry; wealth inside the boundary is unchanged', r1 === true && T.stockOf('staples') === tS0 - 5 && Wn.stockOf('staples') === wS0 + 5 && T.funds === tF0 + 20 && Wn.funds === wF0 - 20 && s3.journal.totals.entries === n0 + 1 && s3.wealth() === W0a && s3.drift() === 0 && A.events.filter((e) => e.name === 'economy:transfer').length === n0 + 1);
const same = snapOf(s3, ids);
check('re-applying a journaled key returns true and changes nothing (idempotent)', s3.transfer(okReq) === true && snapOf(s3, ids) === same && s3.journal.has('test:k1'));
T.reserved.set('staples', T.stockOf('staples') - 2);
const fails = [
  ['no-stock', { from: Wn.id, to: T.id, good: 'staples', qty: Wn.stockOf('staples') + 1, reason: 'wholesale' }],
  ['reserved', { from: T.id, to: Wn.id, good: 'staples', qty: 3, reason: 'wholesale' }],
  ['no-funds', { from: T.id, to: small.id, good: 'staples', qty: 1, credits: small.funds + 1, reason: 'wholesale' }],
  ['no-capacity', { from: T.id, to: small.id, good: 'staples', qty: small.room() + 1, reason: 'wholesale', useReserved: true }],
  ['not-permitted', { from: T.id, to: 'player', good: 'staples', qty: 1, credits: 3, reason: 'player buy', useReserved: true }],
  ['not-permitted', { from: 'player', to: grocerB.id, good: 'planks', qty: 1, credits: 1, reason: 'player sale' }],
  ['bad-request', { from: T.id, to: Wn.id, good: 'staples', qty: 1.5, reason: 'wholesale' }],
  ['bad-request', { from: T.id, to: Wn.id, good: 'staples', qty: -1, reason: 'wholesale' }],
  ['bad-request', { from: T.id, to: Wn.id, good: 'nonsense', qty: 1, reason: 'wholesale' }],
  ['bad-request', { from: T.id, to: T.id, good: 'staples', qty: 1, reason: 'wholesale' }],
  ['bad-request', { from: 999999, to: Wn.id, good: 'staples', qty: 1, reason: 'wholesale' }],
  ['bad-request', { from: T.id, to: Wn.id, reason: 'nothing' }],
  ['bad-request', null],
];
const failLog = [];
for (const [want, req] of fails) { const s0 = snapOf(s3, ids); const r = s3.transfer(req); if (r !== want) failLog.push(`${want} -> ${r}`); if (snapOf(s3, ids) !== s0) failLog.push(`${want} changed state`); }
T.reserved.delete('staples');
check('every failure reason (no-stock, reserved, no-funds, no-capacity, not-permitted x2, bad-request x7) is returned and leaves every account byte-identical - never a partial change', failLog.length === 0, failLog.join(' | '));
const last = grocerB.available('apple');
s3.transfer({ from: grocerB.id, to: 'void', good: 'apple', qty: last - 1, reason: 'consumption' });
const c1 = s3.transfer({ from: grocerB.id, to: 'households', good: 'apple', qty: 1, credits: 4, reason: 'meals' }), c2 = s3.transfer({ from: grocerB.id, to: 'households', good: 'apple', qty: 1, credits: 4, reason: 'meals' });
check('two customers for the last unit: one success, one no-stock, stock never negative', c1 === true && c2 === 'no-stock' && grocerB.stockOf('apple') === 0 && s3.negativeStock() === 0);
const p0 = s3.player.credits;
const j1 = s3.pay('offworld', 'player', 90, 'job', 'job:test-courier'), j2 = s3.pay('offworld', 'player', 90, 'job', 'job:test-courier');
check('a job payout keyed by the job id pays once: the replay is a no-op (jobs source in the ledger)', j1 === true && j2 === true && s3.player.credits === p0 + 90 && s3.journal.totals.sources.jobs === 90 && s3.journal.has('job:test-courier'));
check('the player cannot receive bulk goods or sell what a shop does not trade, but can buy a listed item and sell produce to a grocer', s3.transfer({ from: grocerB.id, to: 'player', good: 'apple', qty: 1, credits: 4, reason: 'player buy' }) === 'no-stock' && s3.transfer({ from: 'player', to: grocerB.id, good: 'wheat', qty: 2, credits: 2, reason: 'player sale' }) === true && grocerB.stockOf('wheat') >= 2 && s3.player.credits === p0 + 92 && s3.drift() === 0);

log('\n== Arbitrage (rubric 15 #9) ==');
const AR = makeSim({ credits: 100000 }), sa = AR.sim;
const appleShops = sa.businesses.filter((x) => x.sells.some((e) => e.item === 'apple') && vendorBuys(x.buys, I.APPLE) && x.available('apple') > 4);
const cheapest = appleShops.slice().sort((p, q) => (DISTRICT_MULT[p.district] ?? 1) - (DISTRICT_MULT[q.district] ?? 1))[0];
const dearest = appleShops.filter((x) => x !== cheapest).sort((p, q) => (DISTRICT_MULT[q.district] ?? 1) - (DISTRICT_MULT[p.district] ?? 1))[0];
// empty the dear shop's shelf so its bid starts at the ceiling: the widest margin the rule allows
sa.transfer({ from: dearest.id, to: 'void', good: 'apple', qty: dearest.available('apple'), reason: 'consumption' });
const total0 = sa.player.credits + cheapest.funds + dearest.funds, units0 = cheapest.stockOf('apple') + dearest.stockOf('apple');
const margins = []; let held = 0, rounds = 0, nonIncreasing = true;
for (; rounds < 400; rounds++) {
  const qa = sa.quote(cheapest, 'apple'), qb = sa.quote(dearest, 'apple');
  const m = qb.sell == null ? -Infinity : qb.sell - qa.buy;
  if (margins.length && m > margins[margins.length - 1]) nonIncreasing = false;
  margins.push(m);
  if (!(m > 0) || qa.available <= 0) break;
  if (sa.transfer({ from: cheapest.id, to: 'player', good: 'apple', qty: 1, credits: qa.buy, reason: 'player buy' }) !== true) break;
  held++;
  if (sa.transfer({ from: 'player', to: dearest.id, good: 'apple', qty: 1, credits: qb.sell, reason: 'player sale' }) !== true) break;
  held--;
}
const total1 = sa.player.credits + cheapest.funds + dearest.funds, units1 = cheapest.stockOf('apple') + dearest.stockOf('apple') + held;
const m0 = margins[0], mEnd = margins[margins.length - 1];
check(`buy at ${cheapest.name} (${cheapest.district}) and sell at ${dearest.name} (${dearest.district}, shelf emptied): the margin is non-increasing and reaches <= 0 within the two shops' limits`, nonIncreasing && !(mEnd > 0) && rounds < 400, `margin ${m0} -> ${mEnd} cr over ${rounds} units`);
check('credits over (player + A + B) and apple units over (A + B + hand) are constant through the loop; the ledger identity holds', total1 === total0 && units1 === units0 && sa.drift() === 0);
const qa2 = sa.quote(cheapest, 'apple'), qb2 = sa.quote(dearest, 'apple');
check('a second pass after convergence earns nothing', !(qb2.sell != null && qb2.sell - qa2.buy > 0), `ask ${qa2.buy} vs bid ${qb2.sell}`);

log('\n== Two simulated days: ledger, stabilisers, batches and shipment lifecycles (rubric 15 #3, #4, #10, #11, #14) ==');
const R = makeSim(), sr = R.sim;
const clinic = sr.businesses.filter((x) => x.role === 'medical' && x.staff > 0).sort((p, q) => q.staff - p.staff)[0];
sr.pay(clinic.id, 'offworld', clinic.funds, 'fees');   // the clinic loses its till before the day starts...
sr.transfer({ from: clinic.id, to: 'void', good: 'medical', qty: clinic.available('medical'), reason: 'consumption' });   // ...and its shelf
const importPhases = { loaded: [], arrived: [], unloaded: [] };
R.hook = (name, p) => { if (name !== 'economy:shipment' || p.from !== 'offworld' || !importPhases[p.state]) return; const idx = p.carrier.kind === 'ship' ? p.carrier.id : p.carrier.ship; const C = R.arrivals.ships().find((c) => c.index === idx); importPhases[p.state].push(C ? C.phaseAt(R.arrivals.time()) : null); };
const W0 = sr.wealth(), net0 = sr.journal.net();
const run2 = runDays(R, 2);
const Tt = sr.journal.totals;
check(`conservation: sum(sources) - sum(sinks) == W(end) - W(start) after every one of ${2 * 96} steps (W ${fmt(W0)} -> ${fmt(sr.wealth())})`, run2.drift === 0 && sr.wealth() - W0 === sr.journal.net() - net0, `worst drift ${run2.worst} cr`);
check('no negative stock or funds at any step', run2.neg === 0);
check('every source and sink lands in a documented category; imports, household spending, production and endowment are sources, wages, consumption, maintenance and import payments are sinks', Object.keys(Tt.sources).every((k) => SOURCE_CATEGORIES.includes(k)) && Object.keys(Tt.sinks).every((k) => SINK_CATEGORIES.includes(k)) && ['endowment', 'household', 'import', 'production', 'clients'].every((k) => Tt.sources[k] > 0) && ['wages', 'consumption', 'maintenance', 'import_payment', 'processing'].every((k) => Tt.sinks[k] > 0), `sources ${Object.keys(Tt.sources).join(',')} | sinks ${Object.keys(Tt.sinks).join(',')}`);
check('every journal entry is a source, a sink or internal and its wealth change is the sum of its credit and stock legs', sr.journal.entries.length > 0 && sr.journal.entries.every((e) => ['source', 'sink', 'internal'].includes(e.flow) && e.dW === e.dCredits + e.dStock && (e.flow !== 'internal' || e.dW === 0) && Number.isInteger(e.id)));
const alloc = R.events.filter((e) => e.name === 'economy:transfer' && /^allocation/.test(e.reason) && e.to === clinic.id);
check(`stabiliser: the broke clinic (${clinic.name}) received bounded, logged public allocations and treats patients again`, alloc.length > 0 && Tt.sources.allocation > 0 && alloc.every((e) => e.credits <= TUNING.allocationCap && e.from === 'treasury') && clinic.stats.sold + clinic.uptime.up > 0 && clinic.uptime.up / clinic.uptime.total > 0.5, `${alloc.length} allocations, ${fmt(alloc.reduce((s, e) => s + e.credits, 0))} cr, uptime ${(100 * clinic.uptime.up / clinic.uptime.total).toFixed(0)}%`);
const d1 = sr.stats.days.find((d) => d.day === 1);
const mealEntries = R.events.filter((e) => e.name === 'economy:transfer' && e.reason === 'meals');
check(`household demand in batches: day 1 meals within 25% of the ${sr.residents} residents, bought as batches (fewer entries than meals) and journaled as household spending + consumption`, d1 && Math.abs(d1.meals - sr.residents) / sr.residents <= 0.25 && mealEntries.length < d1.meals * 2 && mealEntries.every((e) => e.qty >= 1 && e.to === 'households') && d1.byCat.household > 0 && d1.byCat.consumption < 0, `${d1 && d1.meals} meals, ${mealEntries.length} batch entries over two days`);
const seqs = new Map(); for (const e of R.events) if (e.name === 'economy:shipment') { if (!seqs.has(e.id)) seqs.set(e.id, []); seqs.get(e.id).push(e.state); }
const lifecycle = ['ordered', 'loaded', 'in_transit', 'arrived', 'unloaded', 'delivered'];
const complete = [...seqs.entries()].filter(([, s]) => s.join() === lifecycle.join());
check(`courier shipments run ordered -> loaded -> in_transit -> arrived -> unloaded -> delivered, with economy:shipment on every change (${complete.length} complete lifecycles of ${seqs.size} shipments)`, complete.length >= 50 && [...seqs.values()].every((s) => s.every((x) => SHIPMENT_STATES.includes(x)) && s[0] === 'ordered'));
const direct = R.events.filter((e) => e.name === 'economy:transfer' && typeof e.from === 'number' && typeof e.to === 'number' && isBulk(e.good));
check('no bulk goods teleport between businesses: every link loads a shipment account and delivers from it', direct.length === 0 && R.events.some((e) => e.name === 'economy:transfer' && e.reason === 'delivery' && String(e.from).startsWith('shipment:')) && R.events.some((e) => e.name === 'economy:transfer' && e.reason === 'wholesale' && String(e.to).startsWith('shipment:')));
const recCour = sr.recentShipments.filter((s) => s.state === 'delivered' && typeof s.from === 'number');
check('shipments spend time in transit: delivered at or after an eta set when loaded, never at the moment of loading', recCour.length > 0 && recCour.every((s) => s.eta > s.loadedAt && s.deliveredAt >= s.eta - 1e-9 && s.deliveredAt > s.orderedAt));
check(`imports are bound to real freighters: loaded while the ship flies, arrived at touchdown, unloaded with the doors open on the pad (${importPhases.loaded.length} loaded, ${importPhases.arrived.length} arrived, ${importPhases.unloaded.length} unloaded)`, importPhases.loaded.length > 0 && importPhases.unloaded.length > 0 && importPhases.loaded.every((p) => p === 'fly') && importPhases.arrived.every((p) => ON_GROUND.has(p)) && importPhases.unloaded.every((p) => DOORS_OPEN.has(p)) && sr.stats.importsDelivered + sr.recentImports.length > 0);
const impDone = sr.recentImports.filter((s) => s.state === 'delivered');
check('a delivered import\'s history reads ordered, loaded, in_transit, arrived, unloaded, delivered and its bill was paid offworld (import_payment sink, port fee source)', impDone.length > 0 && impDone.every((s) => s.history.map((h) => h[0]).join() === lifecycle.join() && s.paid && s.bill > 0 && s.carrier.kind === 'conveyor') && Tt.sinks.import_payment > 0 && Tt.sources.fees > 0);
const N = makeSim({ arrivals: noArrivals() });
runDays(N, 2);
check('with no cargo ships in the traffic nothing is ever imported: import orders stay ordered and no import entry exists', N.sim.stats.unloads === 0 && N.sim.stats.importsDelivered === 0 && [...N.sim.shipments.values()].filter((s) => s.from === 'offworld').length > 0 && [...N.sim.shipments.values()].filter((s) => s.from === 'offworld').every((s) => s.state === 'ordered') && !N.events.some((e) => e.name === 'economy:transfer' && e.reason === 'import'));
const NT = N.sim.journal.totals;
check('...and the identity still holds on the starved city', N.sim.drift() === 0 && (NT.sources.import || 0) === 0);

log('\n== Held freighter, detain / release (rubric 15 #12, #14) ==');
const HS = makeSim(), sh = HS.sim, Tm = sh.terminal;
let drained = false, holdSeen = null, refunded = false, holdCleared = null;
const runH = runDays(HS, 3, { steps: 192, each: (dayTime) => {
  const imp = [...sh.shipments.values()].find((s) => s.from === 'offworld' && s.carrier.kind === 'ship' && s.carrier.id != null && s.state === 'in_transit');
  if (!drained && imp && imp.eta != null && imp.eta - dayTime < 0.03) { drained = true; if (Tm.funds > 0) sh.pay(Tm.id, 'offworld', Tm.funds, 'fees'); sh.outside.treasury.funds = 0; }
  if (drained && !holdSeen && sh.holds.size) { const [idx, h] = [...sh.holds.entries()][0]; const s = sh.shipment(h.shipmentId); holdSeen = { idx, h: { ...h }, hf: sh.holdFor(idx), state: s ? s.state : null, held: s ? s.held : null, notice: sh.noticeFor(Tm.district).items.some((n) => n.kind === 'held'), funds: Tm.funds, pub: sh.list().find((x) => x.id === h.shipmentId) }; }
  if (holdSeen && !refunded) { refunded = true; sh.pay('admin', Tm.id, holdSeen.h.bill + 2000, 'grant'); }
  if (refunded && !holdCleared && sh.holds.size === 0) { const s = sh.shipment(holdSeen.h.shipmentId); holdCleared = { state: s ? s.state : null, hf: sh.holdFor(holdSeen.idx), paid: s ? s.paid : null }; }
} });
check('a terminal that cannot pay an import bill holds the freighter on its pad: holdFor(shipIndex) reports the bill, the shipment stays arrived and held, a held notice is posted, no credits are spawned', !!holdSeen && holdSeen.hf && holdSeen.hf.shipmentId === holdSeen.h.shipmentId && holdSeen.hf.bill > 0 && holdSeen.state === 'arrived' && holdSeen.held === true && holdSeen.pub && holdSeen.pub.held === true && holdSeen.notice && holdSeen.funds < holdSeen.hf.bill && runH.drift === 0, holdSeen ? `ship ${holdSeen.idx} held for ${holdSeen.hf.bill} cr (${holdSeen.hf.reason})` : 'no hold observed');
check('once the bill can be paid the cargo unloads, the bill is paid and the hold clears', !!holdCleared && holdCleared.hf === null && holdCleared.paid === true && ['unloaded', 'delivered'].includes(holdCleared.state), holdCleared ? holdCleared.state : '-');
const D = makeSim(), sd = D.sim;
runDays(D, 0.5);
const live = [...sd.shipments.values()].find((s) => s.state === 'in_transit' && typeof s.from === 'number');
const pos0 = { ...live.position }, eta0 = live.eta, nEv = D.events.length;
const okD = sd.detain(live.id, 'customs inspection');
const pubD = sd.list().find((s) => s.id === live.id);
const noticeD = sd.noticeFor(sd.business(live.to).district).items.some((n) => n.kind === 'detained' && n.text.includes(live.id));
const blocked = sd.transfer({ from: `shipment:${live.id}`, to: live.to, good: live.goods[0].good, qty: 1, reason: 'delivery' });
runDays(D, 0.1);
const stillD = sd.list().find((s) => s.id === live.id);
check('detain(id, reason) freezes a shipment: state detained with the reason, economy:shipment fired, its cargo cannot be moved, it does not travel', okD === true && pubD.state === 'detained' && pubD.detained === 'customs inspection' && blocked === 'not-permitted' && stillD.state === 'detained' && stillD.position.x === pos0.x && stillD.position.z === pos0.z && D.events.slice(nEv).some((e) => e.name === 'economy:shipment' && e.id === live.id && e.state === 'detained'));
check('the receiver quotes a disruption premium while its cargo is detained and the district noticeboard reported it', sd.disruptionOf(sd.business(live.to)) >= 0.15 - 1e-9 && sd.quote(live.to, live.goods[0].good).disruption >= 0.05 && noticeD && sd.business(live.to).flags.detained === 1);
const relD = sd.release(live.id);
const afterD = sd.list().find((s) => s.id === live.id);
runDays(D, 0.6);
check('release(id) resumes the shipment where it stopped (eta pushed back by the time held) and it is delivered later', relD === true && afterD.state === 'in_transit' && afterD.eta > eta0 && D.events.some((e) => e.name === 'economy:shipment' && e.id === live.id && e.state === 'delivered') && sd.business(live.to).flags.detained === 0 && sd.detain('S-nope') === false && sd.release(live.id) === false, `eta ${eta0.toFixed(3)} -> ${afterD.eta.toFixed(3)}`);
check('shipments() records carry the rubric shape { id, goods, qty, from, to, state, carrier: { kind, id }, position: { x, y, z }, eta }', sd.list().length > 0 && sd.list().every((s) => typeof s.id === 'string' && Array.isArray(s.goods) && Number.isInteger(s.qty) && s.from !== undefined && Number.isInteger(s.to) && SHIPMENT_STATES.includes(s.state) && s.carrier && ['ship', 'courier', 'conveyor'].includes(s.carrier.kind) && 'id' in s.carrier && s.position && typeof s.position.x === 'number' && typeof s.position.y === 'number' && typeof s.position.z === 'number' && 'eta' in s));

log('\n== Visible state (rubric 15 #13) ==');
const V = makeSim(), sv = V.sim;
const dinerV = sv.businesses.find((x) => x.role === 'food' && x.sells.filter((e) => GOODS[e.item] && !GOODS[e.item].service && x.available(e.item) > 0).length >= 2);
const menu0 = sv.menuFor(dinerV.id), item = menu0.on[0];
sv.transfer({ from: dinerV.id, to: 'void', good: item, qty: dinerV.available(item), reason: 'consumption' });
const menu1 = sv.menuFor(dinerV.id);
check(`menuFor(${dinerV.name}) takes ${item} off the menu when its stock runs out`, menu0.on.includes(item) && !menu0.off.includes(item) && !menu1.on.includes(item) && menu1.off.includes(item) && /off the menu/.test(menu1.text) && !/off the menu/.test(menu0.text) && menu1.items.find((i) => i.item === item).stock === 0);
const shopW = sv.businesses.find((x) => x.role === 'workshop' && x.needs.has('parts') && x.available('parts') > 0);
sv.transfer({ from: shopW.id, to: 'void', good: 'parts', qty: shopW.available('parts'), reason: 'maintenance' });
const w0 = sv.waitingFor(shopW.id), rb0 = sv.repairBerths();
sv.advance(0.3, 0);
const w1 = sv.waitingFor(shopW.id), rb1 = sv.repairBerths();
check(`waitingFor(${shopW.name}) names the missing machine parts and, once ordered, the shipment bringing them; repairBerths() drops the workshop until they arrive`, w0 && w0.good === 'parts' && w0.state === 'unordered' && w1 && w1.good === 'parts' && w1.shipment && /^S-\d+$/.test(w1.shipment) && /waiting for Machine parts \(shipment S-\d+, ordered\)/.test(w1.text) && rb0.available === rb0.total - 1 && rb1.waiting.some((w) => w.business === shopW.id), w1 && w1.text);
check('noticeFor(district) reports the latest disruptions (spike, shortage, delay, detained, held) or says none', /no disruptions reported/.test(sv.noticeFor('nowhere').text) && sv.noticeFor('nowhere').items.length === 0 && sd.noticeFor(sd.business(live.to).district).items.length >= 1 && sd.noticeFor(sd.business(live.to).district).items.every((n) => ['spike', 'shortage', 'delay', 'detained', 'held', 'outage'].includes(n.kind) && n.text && Number.isInteger(n.day)));
const plant = sv.businesses.find((x) => x.role === 'utility');
check('serviceLevel(lotId) is 0..1 for utilities / transit, null elsewhere; summary() carries day, wealth, ledger totals, uptime and holds', sv.serviceLevel(plant.id) >= 0 && sv.serviceLevel(plant.id) <= 1 && sv.serviceLevel(-1) === null && (() => { const s = sv.summary(); return Number.isInteger(s.day) && s.wealth === sv.wealth() && s.ledger.net === sv.journal.net() && s.uptime && Array.isArray(s.holds) && s.businesses === sv.businesses.length; })());
const qv = sv.quote(dinerV.id, dinerV.sells.find((e) => e.item !== item && GOODS[e.item] && !GOODS[e.item].service).item);
check('quote(lotId, good) -> { buy, sell, stock, available, target, factor, disruption, base } follows the rule for a real shelf; unknown goods quote null', qv && qv.buy === askPrice(qv.base, dinerV.district, qv.target, qv.available, qv.disruption) && qv.factor === +scarcityFactor(qv.target, qv.available).toFixed(4) && qv.stock >= qv.available && sv.quote(dinerV.id, 'nonsense') === null && sv.quote(-1, 'apple') === null, JSON.stringify(qv));

log('\n== Save / restore (rubric 15 #6, #17, #19) ==');
const P = makeSim();
runDays(P, 1.3);
P.sim.pay('offworld', 'player', 50, 'job', 'job:persisted');
const blob = JSON.stringify(P.sim.serialize());
const Q = makeSim();
Q.player.credits = P.player.credits;
const okR = Q.sim.restore(JSON.parse(blob));
const nz = (m) => [...m].filter((e) => e[1] !== 0).sort();   // a live Map keeps zero entries the save drops
const stateOf = (s) => JSON.stringify({ b: s.businesses.map((x) => [x.id, x.funds, nz(x.stock), nz(x.reserved), [...x.openOrders].sort(), x.lastVisit, x.flags]), sh: [...s.shipments.values()].map((x) => [x.id, x.state, x.goods, x.order, x.carrier, x.eta]), pool: s.outside.households.funds, tr: s.outside.treasury.funds, W: s.wealth(), net: s.journal.net(), day: s.dayTime, next: s.nextShipmentId, notices: [...s.notices.entries()] });
check(`serialize -> restore reproduces stock, funds, reservations, open orders, in-flight shipments (${P.sim.shipments.size}), the household pool, the treasury, notices and the ledger totals (${(blob.length / 1024).toFixed(0)} KB)`, okR === true && stateOf(P.sim) === stateOf(Q.sim) && Q.sim.drift() === 0 && Q.sim.journal.has('job:persisted') && Q.sim.pay('offworld', 'player', 50, 'job', 'job:persisted') === true && Q.player.credits === P.player.credits);
P.events.length = 0; Q.events.length = 0;
runDays(P, 0.5); runDays(Q, 0.5);
check('a restored economy continues exactly like the uninterrupted one (identical journal stream over the next half day)', streamOf(P) === streamOf(Q) && P.events.length > 500 && P.sim.wealth() === Q.sim.wealth() && stateOf(P.sim) === stateOf(Q.sim), `${P.events.length} events, hash ${streamOf(P)}`);
const Q2 = makeSim();
check('a pass-1 save (wallet only) or garbage restores to nothing and leaves a fresh, consistent city', Q2.sim.restore(undefined) === false && Q2.sim.restore({ credits: 100 }) === false && Q2.sim.restore({ v: 1 }) === false && Q2.sim.drift() === 0 && Q2.sim.wealth() === S1.sim.wealth());
const S1b = makeSim(), S2b = makeSim();
runDays(S1b, 0.5); runDays(S2b, 0.5);
check('determinism: two runs with the same seed produce the same journal stream', streamOf(S1b) === streamOf(S2b) && S1b.events.length > 100);

log('\n== Balance (rubric 15 #15) ==');
const BS = makeSim(), sb = BS.sim;
const mealPrices = sb.businesses.filter((x) => x.role === 'food').flatMap((x) => sb.menuFor(x.id).items.filter((i) => i.on && (i.item === 'bread' || /^cooked_/.test(i.item))).map((i) => i.price)).sort((p, q) => p - q);
const median = mealPrices[Math.floor(mealPrices.length / 2)];
check(`a basic meal costs 6-16 cr (bread 8 -> 6..8 at factor 0.75..1, cooked meat 12-18 -> 9..18); today's bread / cooked-meat menu prices ${mealPrices[0]}..${mealPrices[mealPrices.length - 1]} cr, median ${median}`, askPrice(8, null, 40, 40) === 8 && askPrice(8, null, 40, 80) === 6 && meats.every((m) => askPrice(m, null, 40, 80) >= 9 && askPrice(m, null, 40, 40) <= 18) && mealPrices.length >= 20 && median >= 6 && median <= 16);
check('a local ride is 5-15 cr (air taxi base 15, household rides 10), a useful small component ~25 (parts 25, door 25, holo sign 24)', GOODS.speeder_ride.base >= 12 && GOODS.speeder_ride.base <= 15 && TUNING.ridePrice >= 5 && TUNING.ridePrice <= 15 && GOODS.parts.base === 25 && GOODS.door.base === 25 && GOODS.holo_sign.base >= 20 && GOODS.holo_sign.base <= 30);
check('a short delivery pays 60-150 cr (cost + 40% on 45-107 cr of goods); courier runs 30-120', REWARD.delivery(45) >= 60 && REWARD.delivery(107) <= 150 && REWARD.courier(100) === 30 && REWARD.courier(600) === 120);
check('the household rules keep the loop closed: wages 18 cr/staff/day, one meal batch per resident, 0.1 treatments, treatment fee 24, three days of cover, reorder at half', TUNING.wage === 18 && TUNING.mealsPerResident === 1 && TUNING.treatmentsPerResident === 0.1 && TUNING.treatmentFee === 24 && TUNING.daysCover === 3 && TUNING.reorderAt === 0.5);

if (!base) { log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); }

// ================================================================================================ CDP
// Positions come from the same deterministic layout the game uses (seed 1337): a job terminal, the closest vendor
// selling apples that also buys produce, the closest residential tower, the ship dealer.
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const doorOut = (lot) => (lot.door ? { x: lot.door.out.x + 0.5, z: lot.door.out.z + 0.5 } : { x: (lot.x0 + lot.x1) / 2, z: lot.z1 + 1.5 });
const doorIn = (lot) => (lot.door ? { x: lot.door.in.x + 0.5, z: lot.door.in.z + 0.5 } : { x: (lot.x0 + lot.x1) / 2, z: (lot.z0 + lot.z1) / 2 });
const grocers = all.filter(({ purpose }) => purpose.sells.some((s) => s.item === 'apple') && purpose.buys.includes('produce') && purpose.kind !== 'cantina');
const apartments = all.filter(({ purpose }) => purpose.kind === 'apartments');
const dealers = all.filter(({ purpose }) => purpose.kind === 'ship_dealer');
// terminal with the closest apple vendor
let best = null;
for (const t of terminals) for (const g of grocers) { const d = dist(doorOut(t.lot), doorOut(g.lot)); if (!best || d < best.d) best = { t, g, d }; }
const T0 = best.t, G = best.g;
const Ap = apartments.sort((p, q) => dist(doorOut(p.lot), doorOut(T0.lot)) - dist(doorOut(q.lot), doorOut(T0.lot)))[0];
const Dl = dealers[0];
const X = all.filter(({ purpose }) => purpose.sells.some((s) => s.item === 'speeder_ride')).sort((p, q) => dist(doorOut(p.lot), doorOut(T0.lot)) - dist(doorOut(q.lot), doorOut(T0.lot)))[0];   // nearest air-taxi stand
const y = LEVELS.underWalk;
log(`\nterminal ${T0.purpose.kind} "${T0.purpose.name}" #${T0.lot.id} at ${JSON.stringify(doorOut(T0.lot))}; vendor "${G.purpose.name}" #${G.lot.id} (${G.purpose.district}) ${Math.round(best.d)} blocks away; apartments "${Ap.purpose.name}" #${Ap.lot.id}; dealer "${Dl.purpose.name}" #${Dl.lot.id}`);

const { launchPage } = await import('./cdp.mjs');
mkdirSync(shots, { recursive: true });
const profile = `/tmp/chrome-economy-${process.pid}`;
const start = doorOut(T0.lot);
const startUrl = `${base}/?x=${start.x}&z=${start.z + 3}&y=${y}&yaw=0&time=0.45&fresh=1&mode=creative&quality=light&rd=4`;
log(`launching ${startUrl}`);
let page = await launchPage(startUrl, { profile });
const ev = (js) => page.evaluate(js);
// evaluate an expression (sync or a promise) and bring the result back as JSON
const evj = async (js) => JSON.parse(await ev(`(async () => { const r = await (${js}); return JSON.stringify(r === undefined ? null : r); })()`));
const shot = async (name) => { const p = `${shots}/${name}.png`; await page.screenshot(p); log(`  screenshot ${p}`); };
const HELPERS = `
window.__t = {
  frame: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  frames: async (n) => { for (let i = 0; i < n; i++) await window.__t.frame(); },
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  ticks(n) { for (let i = 0; i < n; i++) game.tick(false); },
  play() { game.input.locked = true; if (game.hud.screen) game.hud.screen = null; },
  async click(button) { window.__t.play(); await window.__t.frame(); game.input.mouseClicked[button] = true; game.input.mouseDown[button] = true; await window.__t.frame(); game.input.mouseDown[button] = false; await window.__t.frame(); },
  aimAt(x, y, z) { const p = game.player, eye = p.eyePos(1, new (game.camera.position.constructor)()); const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
  async go(x, y, z) { game.player.flying = true; game.player.teleport(x, y, z); for (let i = 0; i < 60; i++) { await window.__t.frame(); if (game.world.isLoaded(Math.floor(x), Math.floor(z)) && game.terrain.stats.meshed > 0) break; } await window.__t.frames(3); },
  find(ids, rect, limit = 50) {
    const w = game.world, out = [];
    for (const c of w.chunks.values()) {
      if (!c.generated) continue;
      const b = c.blocks;
      for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
        const x = c.cx * 16 + lx, z = c.cz * 16 + lz;
        if (rect && (x < rect.x0 || x >= rect.x1 || z < rect.z0 || z >= rect.z1)) continue;
        const base = (lx * 16 + lz) * 256;
        for (let y = 0; y < 256; y++) { const id = b[base + y]; if (ids.includes(id)) out.push({ x, y, z, id }); }
      }
    }
    return out.slice(0, limit);
  },
  // a standing cell (2 air, solid below) within 3 blocks of (x,y,z) with a clear line to it, for right-click tests
  standNear(x, y, z) {
    const w = game.world, solid = (a, b, c) => w.getBlockDef(a, b, c).solid;
    const cands = [];
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = -2; dy <= 1; dy++) {
      if (!dx && !dz) continue;
      const cx = x + dx, cz = z + dz, cy = y + dy;
      if (solid(cx, cy, cz) || solid(cx, cy + 1, cz) || !solid(cx, cy - 1, cz)) continue;
      cands.push({ x: cx + 0.5, y: cy, z: cz + 0.5, d: Math.hypot(dx, dz, dy) });
    }
    cands.sort((a, b) => a.d - b.d);
    return cands[0] || null;
  },
  card(name) { return [...document.querySelectorAll('#sh-goods .sh-card')].find((c) => c.querySelector('.sh-name') && c.querySelector('.sh-name').textContent === name) || null; },
  clickEl(el, shift = false) { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: shift })); },
  eco() { const e = game.economy, s = e.summary(); return { credits: e.credits, mode: game.mode, ships: s.ships, apartment: s.apartment, job: s.job, screen: game.hud.screen, panelHidden: document.getElementById('shop-panel').hidden }; },
  // the v2 sim's clocks: game-day time from the sky, port seconds from the vehicle tick
  port() { return game.vehicles.tickCount / 20; },
  advance() { const e = game.economy; return e.v2.advance(e.dayTime(), window.__t.port()); },
  setPort(t) { game.vehicles.tickCount = Math.round(t * 20); if (game.shipTraffic) game.shipTraffic.tickCount = game.vehicles.tickCount; },
  cargo() { return game.economy.v2.arrivals.ships(); },
  imports() { return [...game.economy.v2.shipments.values()].filter((s) => s.from === 'offworld'); },
};
true`;

try {
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(2500);
  const boot = await evj(`({ eco: !!game.economy, signs: !!game.signs, credits: game.player.credits, layoutSeed: game.coruscant.layout.seed, lots: game.coruscant.layout.lots.length, v2: !!game.economy.v2, crates: !!game.economy.crates, businesses: game.economy.v2 ? game.economy.v2.businesses.length : 0, drift: game.economy.v2 ? game.economy.v2.drift() : null })`);
  check('game.economy and game.signs exist; wallet starts at 250 on a fresh world', boot.eco && boot.signs && boot.credits === 250, JSON.stringify(boot));
  check('the page uses the same layout as this test (seed, lot count)', boot.layoutSeed === seed && boot.lots === layout.lots.length, `${boot.layoutSeed}/${boot.lots}`);
  check(`the v2 city simulation and the crate layer are on by default (${boot.businesses} businesses, same count as offline) and the ledger identity holds`, boot.v2 && boot.crates && boot.businesses === sim.businesses.length && boot.drift === 0);

  // ------------------------------------------------------------------ signs
  log('\n== Entrance signs ==');
  for (let i = 0; i < 40; i++) { const n = await ev('game.signs.count()'); if (n >= 10) break; await page.sleep(500); }
  const sg = await evj(`(() => { game.signs.sync(); game.signs.update(game.player); const near = game.signs.nearest(10); const tx = [...game.signs.textures.values()][0]; return { count: game.signs.count(), lots: game.signs.stats.lots, visible: game.signs.stats.visible, near, texW: tx ? tx.tex.image.width : 0, texH: tx ? tx.tex.image.height : 0, geo: game.signs.geo.parameters, meshes: game.signs.group.children.length }; })()`);
  check('signs exist for >= 10 doors of the streamed buildings', sg.count >= 10, `${sg.count} signs over ${sg.lots} lots`);
  const nearIn = sg.near.filter((s) => s.d <= 48), nearOut = sg.near.filter((s) => s.d > 48);
  check('every sign within 48 blocks has a mesh and is visible; farther ones are culled', sg.near.length === 10 && nearIn.length >= 3 && nearIn.every((s) => s.visible) && nearOut.every((s) => !s.visible), sg.near.map((s) => `${s.d}m${s.mid ? '(mid)' : ''}${s.visible ? '' : ' culled'}`).join(' '));
  check('at most 40 signs are drawn at once, texture 256x64, one shared ~2 x 0.65 plane geometry', sg.visible <= 40 && sg.visible > 0 && sg.texW === 256 && sg.texH === 64 && sg.geo.width >= 2 && sg.geo.width <= 3 && sg.geo.height >= 0.5 && sg.geo.height <= 1, `${sg.visible} visible, ${sg.meshes} meshes, ${sg.geo.width} x ${sg.geo.height}`);
  const tex = await evj(`(() => { const s = game.signs.nearest(1)[0]; const t = game.signs.textFor(s.lotId); return { key: s.key, name: t.name, category: t.category, cached: game.signs.textures.has(s.key) }; })()`);
  check('a sign carries the lot name + category and its texture is cached by text', tex.cached && tex.key === `${tex.name}|${tex.category}` && tex.name.length > 0, `${tex.name} - ${tex.category}`);
  // sign readability screenshot: look at the terminal's door from 10 blocks out
  const tin = doorIn(T0.lot), tout = doorOut(T0.lot);
  const nx = Math.sign(tout.x - tin.x), nz = Math.sign(tout.z - tin.z);
  await ev(`(async () => { await __t.go(${tout.x + nx * 9}, ${y + 0.5}, ${tout.z + nz * 9}); __t.aimAt(${tout.x - nx * 0.5}, ${y + 3.4}, ${tout.z - nz * 0.5}); game.player.flying = true; game.input.locked = true; await __t.frames(30); })()`);
  await shot('sign_from_10_blocks');
  await ev('game.input.locked = false');

  // ------------------------------------------------------------------ toasts
  log('\n== Enter / leave toasts ==');
  const toast = await evj(`(async () => {
    const S = game.signs, n0 = S.log.length;
    game.player.teleport(${tout.x + nx * 3}, ${y}, ${tout.z + nz * 3}); __t.ticks(2);
    const outside = S.inside;
    game.player.teleport(${tin.x}, ${y}, ${tin.z}); __t.ticks(2);
    const enter = S.log.slice(n0).map((l) => l.text);
    const n1 = S.log.length;
    game.player.teleport(${tout.x + nx * 3}, ${y}, ${tout.z + nz * 3}); __t.ticks(2);
    const leave = S.log.slice(n1).map((l) => l.text);
    const n2 = S.log.length;
    game.player.teleport(${tin.x}, ${y}, ${tin.z}); __t.ticks(2);   // straight back in: debounced (5 s per lot)
    const again = S.log.length - n2;
    game.player.teleport(${tout.x + nx * 3}, ${y}, ${tout.z + nz * 3}); __t.ticks(2);
    return { outside, enter, leave, again, toasts: game.hud.toasts.map((t) => t.text) };
  })()`);
  check('walking through the door fires "Entering <name> - <category>"', toast.outside === null && toast.enter.length === 1 && toast.enter[0] === `Entering ${T0.purpose.name.replace(/\u2014|\u2013/g, '-')} - ${{ housing: 'Housing', office: 'Offices', government: 'Government', hospitality: 'Hospitality', retail: 'Retail', food: 'Food & drink', industry: 'Industry', transport: 'Transport', security: 'Security', culture: 'Culture', medical: 'Medical', media: 'Media', religion: 'Religion' }[T0.purpose.category]}`, JSON.stringify(toast.enter));
  check('walking back out fires "Leaving <name>"', toast.leave.length === 1 && toast.leave[0].startsWith('Leaving '), JSON.stringify(toast.leave));
  check('re-entering within 5 s is debounced (no second toast)', toast.again === 0, `${toast.again} extra`);
  check('toasts reach the HUD toast queue', toast.toasts.some((t) => t.startsWith('Entering') || t.startsWith('Leaving')), JSON.stringify(toast.toasts));

  // ------------------------------------------------------------------ shop: buy an apple, sell wheat (v2 quotes)
  log('\n== Shop (v2 quotes) ==');
  const gOut = doorOut(G.lot);
  await ev(`(async () => { await __t.go(${gOut.x}, ${y}, ${gOut.z}); game.setMode('survival', { persist: false, announce: false }); game.player.flying = false; })()`);
  const appleEntry = G.purpose.sells.find((s) => s.item === 'apple');
  const appleBase = appleEntry.price != null ? appleEntry.price : GOODS.apple.base;
  const opened = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${G.lot.id}), p = eco.purposeOfLot(lot); eco.openShop(p, null); const q = eco.quote(${G.lot.id}, 'apple'); const c = __t.card('Apple'); const m = document.getElementById('sh-market'); return { ...__t.eco(), title: document.getElementById('sh-title').textContent, cards: document.querySelectorAll('#sh-goods .sh-card').length, sells: p.sells.length, slots: document.querySelectorAll('#sh-inventory .sh-slot').length, apple: !!c, applePrice: c && c.querySelector('.sh-price').textContent, appleStock: c && c.querySelector('.sh-stock').textContent, appleQuote: c && c.querySelector('.sh-quote') ? c.querySelector('.sh-quote').textContent : null, q, market: !m.hidden, funds: (document.getElementById('sh-funds') || {}).textContent || '', business: eco.business(${G.lot.id}) }; })()`);
  check('openShop(purpose) shows the shop screen with the vendor name and one card per good', opened.screen === 'shop' && !opened.panelHidden && opened.title === G.purpose.name && opened.cards === opened.sells && opened.slots === 36 && opened.apple, `${opened.title}: ${opened.cards} goods`);
  const q0 = opened.q;
  const trend = q0.factor > 1.05 ? ' \u2191' : q0.factor < 0.95 ? ' \u2193' : '';
  check(`the apple card quotes the price rule (${q0.buy} cr = round(${appleBase} x ${DISTRICT_MULT[G.purpose.district] ?? 1} x (${q0.factor} + ${q0.disruption}))), the real stock / target and the buy-back bid`, q0.buy === askPrice(appleBase, G.purpose.district, q0.target, q0.available, q0.disruption) && opened.applePrice === `${q0.buy} cr${trend}` && opened.appleStock === `${q0.available} in stock / ${q0.target}` && q0.sell != null && opened.appleQuote === `buys at ${q0.sell}`, `"${opened.applePrice}" "${opened.appleStock}" "${opened.appleQuote}"`);
  check('the market line shows the business till, units in stock and supplier count; business(lotId) returns the record', opened.market && /^Till: [\d,]+ cr \u00b7 \d+ units in stock \u00b7 \d+ suppliers?$/.test(opened.funds) && opened.business && opened.business.id === G.lot.id && opened.business.stock.apple === q0.stock && opened.business.suppliers.length >= 1 && opened.business.reorderRule.length >= 1, opened.funds);
  await shot('shop_open');
  const bought = await evj(`(() => { const eco = game.economy; const before = game.player.credits, n0 = game.inventory.count(${I.APPLE}), s0 = eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), e0 = game.events.recent('economy:transfer').length, j0 = eco.ledger.count; const q = eco.quote(${G.lot.id}, 'apple'); __t.clickEl(__t.card('Apple')); const one = { credits: game.player.credits, apples: game.inventory.count(${I.APPLE}) }; __t.clickEl(__t.card('Apple'), true); const buys = eco.ledger.entries(40, (e) => e.reason === 'player buy' && e.from === ${G.lot.id} && e.good === 'apple'); return { before, n0, s0, q, one, after: { credits: game.player.credits, apples: game.inventory.count(${I.APPLE}) }, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), flash: document.getElementById('sh-flash').textContent, paid: buys.reduce((s, e) => s + e.credits, 0), n: buys.length, qtys: buys.map((e) => e.qty), events: game.events.recent('economy:transfer').length - e0, entries: eco.ledger.count - j0, retail: eco.ledger.sinks.retail, drift: eco.v2.drift() }; })()`);
  check('left-click buys 1 apple at the quoted ask and charges the wallet (survival)', bought.one.apples === bought.n0 + 1 && bought.one.credits === bought.before - bought.q.buy, `${bought.before} -> ${bought.one.credits} cr`);
  check('shift-click buys 8 more, unit by unit at rising asks: the wallet paid exactly what the nine journal entries say', bought.after.apples === bought.n0 + 9 && bought.n === 9 && bought.qtys.every((n) => n === 1) && bought.after.credits === bought.before - bought.paid && bought.paid >= 9 * bought.q.buy, `${bought.after.apples} apples, ${bought.after.credits} cr, paid ${bought.paid}; "${bought.flash}"`);
  check('the shelf dropped by 9, nine economy:transfer events fired, the retail sink grew and the identity holds', bought.stock === bought.s0 - 9 && bought.events >= 9 && bought.entries >= 9 && bought.retail >= 9 * GOODS.apple.base && bought.drift === 0, `${bought.stock} left`);
  const sold = await evj(`(() => { const eco = game.economy; game.inventory.addStack(${I.WHEAT}, 10); eco.ui.refresh(); const idx = game.inventory.slots.findIndex((s) => s && s.id === ${I.WHEAT}); const slot = document.querySelectorAll('#sh-inventory .sh-slot')[idx]; const p = eco.purposeOfLot(eco.lotById(${G.lot.id})); const offer = eco.offerFor(p, ${I.WHEAT}); const q = eco.quote(${G.lot.id}, 'wheat'); const before = game.player.credits, w0 = eco.v2.business(${G.lot.id}).stockOf('wheat'); __t.clickEl(slot); const one = game.player.credits; __t.clickEl(document.querySelectorAll('#sh-inventory .sh-slot')[idx], true); const sales = eco.ledger.entries(40, (e) => e.reason === 'player sale' && e.to === ${G.lot.id} && e.good === 'wheat'); return { offer, q, sellable: slot.classList.contains('sh-sellable'), before, one, after: game.player.credits, wheat: game.inventory.count(${I.WHEAT}), got: sales.reduce((s, e) => s + e.credits, 0), n: sales.length, w1: eco.v2.business(${G.lot.id}).stockOf('wheat'), w0, planksOffer: eco.offerFor(p, 5), fromPlayer: eco.ledger.sources.from_player }; })()`);
  check(`the grocer bids for wheat at 45% of its post-sale ask (${sold.offer} cr) - click sells 1, shift-click 8 at falling bids; the shelf gains 9`, sold.sellable && sold.offer === sold.q.sell && sold.one === sold.before + sold.offer && sold.n === 9 && sold.after === sold.before + sold.got && sold.wheat === 1 && sold.w1 === sold.w0 + 9 && sold.fromPlayer >= 9 * GOODS.wheat.base, `${sold.before} -> ${sold.after} cr (+${sold.got})`);
  check('the grocer does not buy building blocks (category rule)', sold.planksOffer === null);
  const closed = await evj(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); return __t.eco(); })()`);
  check('Esc closes the shop screen', closed.screen === null && closed.panelHidden);
  const creative = await evj(`(() => { game.setMode('creative', { persist: false, announce: false }); const eco = game.economy, p = eco.purposeOfLot(eco.lotById(${G.lot.id})); const before = game.player.credits, c0 = eco.ledger.sinks.creative || 0; eco.openShop(p, null); const note = document.getElementById('sh-wallet-note').textContent; const n = eco.buy(p, p.sells.find((s) => s.item === 'apple'), 1); game.closeScreen(); return { before, after: game.player.credits, n, note, creative: (eco.ledger.sinks.creative || 0) - c0 }; })()`);
  check('creative mode shows prices but never charges; the free take is still journaled as the creative sink', creative.n === 1 && creative.after === creative.before && /creative/.test(creative.note) && creative.creative === GOODS.apple.base, creative.note);

  // ------------------------------------------------------------------ jobs: accept a courier run, deliver by teleport
  log('\n== Jobs ==');
  await ev(`(async () => { await __t.go(${tout.x}, ${y}, ${tout.z}); })()`);
  const board = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${T0.lot.id}); eco.openJobs(lot); const jobs = eco.jobs.board(lot); return { ...__t.eco(), n: jobs.length, kinds: jobs.map((j) => j.kind), cards: document.querySelectorAll('#sh-jobs .sh-job').length, first: jobs[0], accepts: document.querySelectorAll('#sh-jobs .sh-btn').length }; })()`);
  check('the job terminal screen lists the board (3-6 jobs, courier first)', board.screen === 'jobs' && board.n >= 3 && board.n <= 6 && board.cards === board.n && board.kinds[0] === 'courier', board.kinds.join(','));
  const boardOffline = generateBoard(seed, 0, termLot(T0), { ...ctx, pads: await evj('game.economy.pads()'), deckY: await evj('game.economy.deckY()') });
  check('the in-game board matches the offline generator for (seed, day 0, lot)', boardOffline[0] && boardOffline[0].id === board.first.id && boardOffline[0].reward === board.first.reward && boardOffline[0].to.lotId === board.first.to.lotId, `${board.first.title} (${board.first.reward} cr, ${board.first.distance} blocks)`);
  await shot('jobs_board');
  const accepted = await evj(`(() => { const btn = document.querySelector('#sh-jobs .sh-job .sh-btn'); __t.clickEl(btn); const a = game.economy.jobs.active; const tagged = !!document.querySelector('#sh-jobs .sh-job-active .sh-job-tag'); game.closeScreen(); return { active: !!a, kind: a && a.job.kind, status: game.economy.jobs.status(), target: game.economy.jobs.target(), remaining: game.economy.jobs.remaining(), tagged }; })()`);
  check('Accept makes the courier run the active job (card tagged "accepted") with a HUD status line and a compass target', accepted.active && accepted.kind === 'courier' && accepted.tagged && /^Courier: deliver the package to /.test(accepted.status) && accepted.target && Math.abs(accepted.target.x - board.first.to.x) < 0.01 && accepted.remaining > 0.99, accepted.status);
  const strip = await evj(`(() => { game.hud.render(game); const p = game.player.pos, t = game.economy.jobs.target(); return { dist: Math.round(Math.hypot(t.x - p.x, t.z - p.z)), toasts: game.hud.toasts.map((x) => x.text) }; })()`);
  check('HUD renders with the active-job strip (distance to target shown)', strip.dist > 50, `${strip.dist} m; toasts ${JSON.stringify(strip.toasts)}`);
  await ev('(async () => { game.input.locked = true; await __t.frames(3); })()');
  await shot('job_accepted_hud');
  await ev('game.input.locked = false');
  const busy = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${T0.lot.id}); const ok = eco.jobs.accept(eco.jobs.board(lot)[1], lot); return { ok, kind: eco.jobs.active.job.kind }; })()`);
  check('only one job at a time (a second Accept is refused)', busy.ok === false && busy.kind === 'courier');
  // the courier loop with the air taxi: the stand lists "Your job: <target>" first, the fare is charged (survival),
  // the ride drops the player at the door and the hand-in fires on arrival - fare and payout are journal entries
  const done = await evj(`(async () => { const eco = game.economy, j = eco.jobs.active.job; game.setMode('survival', { persist: false, announce: false }); const taxi = eco.purposeOfLot(eco.lotById(${X.lot.id})); const dests = eco.destinations(); const fare = eco.priceOf(taxi, taxi.sells.find((s) => s.item === 'speeder_ride')); const before = game.player.credits; const ok = eco.ride(taxi, fare, dests[0]); const p = game.player.pos; const landed = Math.hypot(p.x - j.to.x, p.z - j.to.z); __t.ticks(8); const pay = eco.ledger.entries(60, (e) => e.reason === 'job' && e.to === 'player'); const fares = eco.ledger.entries(60, (e) => /^service:/.test(e.reason) && e.from === 'player' && e.to === ${X.lot.id}); return { first: dests[0], n: dests.length, fare, ok, landed: +landed.toFixed(1), before, after: game.player.credits, reward: j.reward, active: !!eco.jobs.active, jobsDone: eco.stats.jobsDone, toasts: game.hud.toasts.map((x) => x.text), key: eco.ledger.has('job:' + j.id), pay: pay.map((e) => e.credits), fares: fares.map((e) => e.credits) }; })()`);
  check('the air taxi lists the active job first ("Your job: <target>") after the landmarks', done.first && done.first.job === true && /^Your job: /.test(done.first.name) && done.n >= 2, `${done.first && done.first.name}; ${done.n} destinations`);
  check('riding to the job charges the fare, lands at the door and the arrival completes the job and pays the reward', done.ok && done.landed < 2 && !done.active && done.after === done.before - done.fare + done.reward && done.jobsDone === 1, `-${done.fare} +${done.reward} cr -> ${done.after}; landed ${done.landed} blocks from the door; ${JSON.stringify(done.toasts)}`);
  check('the fare went to the taxi stand and the payout is a keyed journal entry (job:<id>) that can never pay twice', done.key && done.pay.includes(done.reward) && done.fares.includes(done.fare) && (GOODS.speeder_ride.base * (DISTRICT_MULT[X.purpose.district] ?? 1) >= 5) && done.fare >= 5 && done.fare <= 21, `fare ${done.fare} (${X.purpose.district}), payout ${done.reward}`);
  // right-click on a HOLO_SIGN inside the terminal opens the board from the world
  await ev(`(async () => { await __t.go(${tout.x}, ${y}, ${tout.z}); await __t.wait(1500); })()`);
  const holo = await evj(`(async () => {
    const lot = game.economy.lotById(${T0.lot.id});
    const rect = { x0: lot.x0, x1: lot.x1, z0: lot.z0, z1: lot.z1 };
    const found = __t.find([${B.HOLO_SIGN}], rect, 400).filter((b) => b.y <= ${y} + 6);
    let used = null, stand = null;
    for (const b of found) { const s = __t.standNear(b.x, b.y, b.z); if (s) { used = b; stand = s; break; } }
    if (!used) { const cons = __t.find([${B.CONSOLE}], rect, 200).filter((b) => b.y <= ${y} + 6); for (const b of cons) { const s = __t.standNear(b.x, b.y, b.z); if (s) { used = b; stand = s; break; } } }
    if (!used) return { found: found.length, opened: null };
    game.player.teleport(stand.x, stand.y, stand.z); game.player.flying = false; __t.aimAt(used.x + 0.5, used.y + 0.5, used.z + 0.5);
    await __t.frames(2); await __t.click(2); await __t.frames(2);
    const r = { found: found.length, block: used.id, at: used, screen: game.hud.screen, opened: game.hud.screen === 'jobs' || game.hud.screen === 'shop' };
    if (game.hud.screen) game.closeScreen();
    return r;
  })()`);
  check('right-clicking a holo sign / console inside the terminal opens its board from the world', holo.opened === true, JSON.stringify(holo));

  // ------------------------------------------------------------------ housing: rent, sign, sleep
  log('\n== Housing ==');
  const aOut = doorOut(Ap.lot);
  const roomEntry = Ap.purpose.sells.find((s) => s.item === 'room_night');
  const rentPrice = buyPrice('room_night', Ap.purpose.district, roomEntry.price);
  const rented = await evj(`(async () => { await __t.go(${aOut.x}, ${y}, ${aOut.z}); game.setMode('survival', { persist: false, announce: false }); const eco = game.economy, lot = eco.lotById(${Ap.lot.id}), p = eco.purposeOfLot(lot); const before = game.player.credits, f0 = eco.v2.business(${Ap.lot.id}).funds; const ok = eco.buy(p, p.sells.find((s) => s.item === 'room_night'), 1); return { ok, before, after: game.player.credits, apt: eco.apartment, sign: game.signs.textFor(${Ap.lot.id}), meta: !!eco.metaOf(${Ap.lot.id}), tower: eco.v2.business(${Ap.lot.id}).funds - f0 }; })()`);
  check(`renting a room charges ${rentPrice} cr into the tower's till and records the apartment (bed room in the residential tower)`, rented.ok === 1 && rented.after === rented.before - rentPrice && rented.tower === rentPrice && rented.apt && rented.apt.lotId === Ap.lot.id && rented.apt.paidUntilDay >= 1, JSON.stringify({ floor: rented.apt && rented.apt.floor, bed: rented.apt && rented.apt.bed, meta: rented.meta }));
  check('the door sign of the rented tower now reads "Your apartment"', rented.sign.name === 'Your apartment' && rented.sign.yours === true, rented.sign.key);

  // ------------------------------------------------------------------ ships: grant + buy
  log('\n== Ships ==');
  const granted = await evj(`(() => { const before = game.player.credits, a0 = game.economy.ledger.sources.admin || 0; game.economy.grant(10000); return { before, after: game.player.credits, btnGrant: !!document.getElementById('ap-btn-grant'), btnReset: !!document.getElementById('ap-btn-eco-reset'), grantText: document.getElementById('ap-btn-grant').textContent, resetText: document.getElementById('ap-btn-eco-reset').textContent, admin: (game.economy.ledger.sources.admin || 0) - a0 }; })()`);
  check('admin panel has "Grant 10,000 credits" and "Reset economy" in the Developer footer; grant adds 10,000 as a logged admin source', granted.btnGrant && granted.btnReset && granted.grantText === 'Grant 10,000 credits' && granted.resetText === 'Reset economy' && granted.after === granted.before + 10000 && granted.admin === 10000, `${granted.before} -> ${granted.after}`);
  const ship = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${Dl.lot.id}), p = eco.purposeOfLot(lot); eco.openShop(p, null); const cards = [...document.querySelectorAll('#sh-goods .sh-card .sh-name')].map((n) => n.textContent); const before = game.player.credits, d0 = eco.v2.business(${Dl.lot.id}).funds; __t.clickEl(__t.card('Light speeder')); const spec = eco.ownedShipSpec(); const ownedNote = __t.card('Light speeder').querySelector('.sh-stock').textContent; const disabled = __t.card('Light speeder').disabled; game.closeScreen(); return { cards, before, after: game.player.credits, spec, ownedNote, disabled, summary: eco.summary().ships, dealer: eco.v2.business(${Dl.lot.id}).funds - d0 }; })()`);
  check('the ship dealer lists 4 classes (4,000 / 14,000 / 32,000 / 60,000)', ship.cards.length === 4 && ship.cards.includes('Light speeder') && ship.cards.includes('Star yacht'), ship.cards.join(', '));
  check('buying the light speeder charges 4,000 through the transfer path (the dealer\'s till gains it) and records ownedShipSpec() = { cls, padIndex, boughtAtDay }', ship.after === ship.before - 4000 && ship.dealer === 4000 && ship.spec && ship.spec.cls === 'speeder' && Number.isInteger(ship.spec.padIndex) && Number.isInteger(ship.spec.boughtAtDay) && ship.disabled && /owned/.test(ship.ownedNote), JSON.stringify(ship.spec) + ' ' + ship.summary.join(','));

  // ------------------------------------------------------------------ v2 read API, admin Economy section, notices
  log('\n== Economy v2 read API and the admin panel ==');
  const api = await evj(`(() => { const eco = game.economy, v = eco.v2; const menu = eco.menuFor(${G.lot.id}); const ships = eco.shipments(); const L = eco.ledger; const rb = eco.repairBerths(); const rep = eco.cityReport(); const ap = document.getElementById('ap-eco-city'); game.adminPanel && game.adminPanel._refreshEconomyCity && (game.adminPanel.lastEcoCityAt = 0, game.adminPanel._refreshEconomyCity()); const txt = ap ? ap.textContent : ''; return { menu: menu && { on: menu.on.length, off: menu.off.length, text: menu.text }, ships: ships.length, states: [...new Set(ships.map((s) => s.state))], shape: ships.every((s) => s.id && Array.isArray(s.goods) && s.carrier && s.position && 'eta' in s), ledger: { sources: Object.keys(L.sources), sinks: Object.keys(L.sinks), net: L.net, count: L.count, W: L.wealth(), day: L.day().entries }, rb, notice: eco.noticeFor(${JSON.stringify(G.purpose.district)}), rep: rep && { day: rep.day, businesses: rep.businesses, shipments: rep.shipments, crates: rep.crates, uptime: rep.uptime.all }, panel: !!ap, txt: txt.slice(0, 400), lines: txt.split('\\n').length, drift: v.drift() }; })()`);
  check('menuFor / shipments / ledger / repairBerths / noticeFor / cityReport answer with live data', api.menu && api.menu.on >= 1 && /cr/.test(api.menu.text) && api.ships > 0 && api.shape && api.states.length >= 1 && api.ledger.sources.includes('endowment') && api.ledger.sinks.includes('retail') && api.ledger.count > 500 && api.rb.total >= 3 && api.notice && typeof api.notice.text === 'string' && api.rep && api.rep.businesses === sim.businesses.length && api.rep.crates && api.rep.crates.drawCalls === 1, `${api.ships} shipments (${api.states.join('/')}), ${api.ledger.count} entries, ${api.rb.available}/${api.rb.total} berths`);
  check('the admin panel Economy section lists the day counter, ledger totals with the conservation drift, today\'s activity, businesses, shipments and quotes', api.panel && /^Day \d+ \d\d:\d\d/.test(api.txt) && /Ledger: sources [\d,]+ - sinks [\d,]+ = -?[\d,]+/.test(api.txt) && /conservation drift 0 cr/.test(api.txt) && /Richest:/.test(api.txt) && api.lines >= 8 && api.drift === 0, api.txt.split('\n').slice(0, 2).join(' | '));
  await ev(`(async () => { game.openScreen && game.openScreen('admin'); if (game.adminPanel && game.adminPanel.open) game.adminPanel.open(); await __t.frames(4); const el = document.getElementById('ap-eco-city'); if (el) el.scrollIntoView(); await __t.frames(2); })()`).catch(() => {});
  await shot('p2_admin_economy_section');
  await ev(`(() => { try { game.closeScreen(); } catch (e) {} try { game.adminPanel && game.adminPanel.close && game.adminPanel.close(); } catch (e) {} })()`);

  // ------------------------------------------------------------------ an import riding a real freighter through its pad phases
  // The traffic is a pure function of the vehicle clock, so the test moves that clock to the phases it needs:
  // fly (binding), touchdown (arrived), boarding (unloaded); the conveyor leg runs on the sky clock.
  log('\n== Import cycle bound to a real freighter (rubric 15 #11, #12) ==');
  const imp0 = await evj(`(() => { const v = game.economy.v2, T = v.terminal; const ships = __t.cargo(); if (!ships.length) return { ships: 0 }; v.transfer({ from: T.id, to: 'void', good: 'staples', qty: T.available('staples'), reason: 'consumption' }); T.lastVisit = null; __t.advance(); const orders = __t.imports().filter((s) => s.state === 'ordered'); return { ships: ships.length, names: ships.map((c) => c.name + '@' + c.pad), orders: orders.length, wants: orders.map((s) => s.order), tStaples: T.stockOf('staples'), terminal: T.name }; })()`);
  check(`cargo freighters exist in the traffic (${imp0.names && imp0.names.join(', ')}) and the emptied terminal (${imp0.terminal}) placed an import order for staples`, imp0.ships >= 1 && imp0.orders >= 1 && imp0.wants.some((o) => o.some((g) => g.good === 'staples' && g.qty > 0)), JSON.stringify(imp0.wants));
  const bound = await evj(`(() => { const v = game.economy.v2; const ships = __t.cargo(); let t = __t.port(); const C0 = ships[0]; let target = C0.nextPhase('reservation', t) - 60; if (target < t) target += C0.period; __t.setPort(target); __t.advance(); const sh = __t.imports().find((s) => s.carrier.kind === 'ship' && s.carrier.id != null && s.state === 'in_transit'); if (!sh) return { bound: false, states: __t.imports().map((s) => s.state) }; const C = ships.find((c) => c.index === sh.carrier.id); return { bound: true, id: sh.id, ship: C.name, index: C.index, pad: C.pad, phase: C.phaseAt(__t.port()), goods: sh.goods, qty: sh.qty, hold: C.holdUnits, history: sh.history.map((h) => h[0]), bill: sh.bill, imports: game.economy.ledger.sources.import, eta: sh.eta, padPos: C.padPos, deckY: C.deckY }; })()`);
  check(`the order was loaded aboard ${bound.ship} while it flew (phase ${bound.phase}), scaled to its hold, journaled as the import source, and is in_transit`, bound.bound && bound.phase === 'fly' && bound.qty > 0 && bound.qty <= bound.hold && bound.history.join() === 'ordered,loaded,in_transit' && bound.bill > 0 && bound.imports > 0, `${bound.id}: ${JSON.stringify(bound.goods)} (${bound.qty} of ${bound.hold} units)`);
  // camera on the pad, then the clock to one second after touchdown
  await ev(`(async () => { await __t.go(${bound.padPos.x + 26}, ${bound.deckY + 6}, ${bound.padPos.z + 22}); __t.aimAt(${bound.padPos.x}, ${bound.deckY + 3}, ${bound.padPos.z}); game.player.flying = true; await __t.frames(10); })()`);
  const landed = await evj(`(async () => { const v = game.economy.v2; const C = __t.cargo().find((c) => c.index === ${bound.index}); const t = __t.port(); __t.setPort(C.nextPhase('touchdown', t) + 1); __t.advance(); await __t.frames(6); const sh = v.shipment('${bound.id}'); const cr = game.economy.crates.stats; return { state: sh.state, phase: C.phaseAt(__t.port()), crates: { ...cr }, held: sh.held, hold: game.economy.holdFor(${bound.index}), pos: sh.position, dist: Math.hypot(sh.position.x - ${bound.padPos.x}, sh.position.z - ${bound.padPos.z}) }; })()`);
  check(`at touchdown the shipment is arrived (phase ${landed.phase}) on the pad, with crates drawn in the freighter's hold by the economy's crate layer (one draw call)`, landed.state === 'arrived' && ON_GROUND.has(landed.phase) && landed.crates.holds >= 1 && landed.crates.instances >= 1 && landed.crates.drawCalls === 1 && landed.dist < 6 && !landed.held && landed.hold === null, JSON.stringify(landed.crates));
  await ev('(async () => { game.input.locked = true; await __t.frames(20); })()');
  await shot('p2_freighter_hold_crates');
  await ev('game.input.locked = false');
  const unloaded = await evj(`(async () => { const v = game.economy.v2, T = v.terminal; const C = __t.cargo().find((c) => c.index === ${bound.index}); const t = __t.port(); const f0 = T.funds, fee0 = game.economy.ledger.sources.fees || 0, pay0 = game.economy.ledger.sinks.import_payment || 0; __t.setPort(C.nextPhase('boarding', t) + 1); __t.advance(); await __t.frames(6); const sh = v.shipment('${bound.id}'); const cr = game.economy.crates.stats; return { state: sh.state, phase: C.phaseAt(__t.port()), carrier: sh.carrier, paid: sh.paid, bill: sh.bill, dFunds: T.funds - f0, fee: (game.economy.ledger.sources.fees || 0) - fee0, payment: (game.economy.ledger.sinks.import_payment || 0) - pay0, crates: { ...cr }, history: sh.history.map((h) => h[0]), eta: sh.eta, now: game.economy.dayTime(), hold: game.economy.holdFor(${bound.index}) }; })()`);
  check(`with the doors open (phase ${unloaded.phase}) the cargo is unloaded onto the pad-side stack: bill of ${unloaded.bill} cr paid offworld, port fee earned, hold crates gone, a conveyor stack drawn`, unloaded.state === 'unloaded' && DOORS_OPEN.has(unloaded.phase) && unloaded.carrier.kind === 'conveyor' && unloaded.paid && unloaded.payment === unloaded.bill && unloaded.fee === TUNING.portFee && unloaded.dFunds === TUNING.portFee - unloaded.bill && unloaded.crates.holds === 0 && unloaded.crates.stacks >= 1 && unloaded.hold === null && unloaded.history.join() === 'ordered,loaded,in_transit,arrived,unloaded', JSON.stringify(unloaded.crates));
  await ev('(async () => { game.input.locked = true; await __t.frames(20); })()');
  await shot('p2_unloaded_stack_on_pad');
  await ev('game.input.locked = false');
  const delivered = await evj(`(async () => { const v = game.economy.v2, T = v.terminal; const sh0 = v.shipment('${bound.id}'); const s0 = T.stockOf('staples'), qty = sh0.goods.find((g) => g.good === 'staples').qty; const jump = sh0.eta - game.economy.dayTime() + 0.002; game.sky.time += jump; if (game.sky.time >= 1) { game.sky.time -= 1; game.sky.day++; } __t.advance(); const sh = v.shipment('${bound.id}'); return { state: sh.state, history: sh.history.map((h) => h[0]), gained: T.stockOf('staples') - s0, qty, jump: +jump.toFixed(4), drift: v.drift(), events: game.events.recent('economy:shipment').filter((e) => e.args[0].id === '${bound.id}').map((e) => e.args[0].state) }; })()`);
  check('the conveyor leg ends at the terminal: delivered, the staples on its shelf, the full history ordered -> loaded -> in_transit -> arrived -> unloaded -> delivered, identity intact', delivered.state === 'delivered' && delivered.history.join() === 'ordered,loaded,in_transit,arrived,unloaded,delivered' && delivered.gained >= delivered.qty && delivered.drift === 0, `+${delivered.gained} staples after a ${delivered.jump} day conveyor leg; events ${delivered.events.join(',')}`);
  // detain / release on a live courier shipment
  const det = await evj(`(() => { const eco = game.economy, v = eco.v2; const live = [...v.shipments.values()].find((s) => s.state === 'in_transit' && typeof s.from === 'number'); if (!live) return { live: false }; const ok = eco.detain(live.id, 'customs inspection'); const rec = eco.shipments().find((s) => s.id === live.id); const ev = game.events.recent('economy:shipment').filter((e) => e.args[0].id === live.id).map((e) => e.args[0].state); const rel = eco.release(live.id); const rec2 = eco.shipments().find((s) => s.id === live.id); return { live: true, ok, state: rec.state, reason: rec.detained, ev, rel, state2: rec2.state }; })()`);
  check('detain / release work from game.economy on a live courier shipment and fire economy:shipment', det.live && det.ok === true && det.state === 'detained' && det.reason === 'customs inspection' && det.ev.includes('detained') && det.rel === true && det.state2 === 'in_transit', JSON.stringify(det));

  // ------------------------------------------------------------------ save / reload
  log('\n== Save / reload ==');
  const before = await evj(`(() => { const eco = game.economy; game.persistNow(); const raw = JSON.parse(localStorage.getItem(game.save.key)); const b = eco.v2.business(${G.lot.id}); return { credits: game.player.credits, saved: { credits: raw.economy.credits, day: raw.economy.day, ships: raw.economy.ownedShips.length, apt: raw.economy.apartment && raw.economy.apartment.lotId, job: raw.economy.job, v2: raw.economy.v2 && { v: raw.economy.v2.v, businesses: raw.economy.v2.businesses.length, shipments: raw.economy.v2.shipments.length, applied: raw.economy.v2.journal.applied.length, hasJobKey: raw.economy.v2.journal.applied.some((k) => /^job:/.test(k[0])), entries: raw.economy.v2.journal.totals.entries } }, apples: game.inventory.count(${I.APPLE}), stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), funds: b.funds, wheat: b.stockOf('wheat'), W: eco.v2.wealth(), net: eco.ledger.net, count: eco.ledger.count, day: game.sky.day, kb: Math.round(JSON.stringify(raw.economy.v2).length / 1024) }; })()`);
  check(`the save carries the economy blob: wallet, day, ship, apartment, job and the v2 state (businesses, shipments, ledger totals, applied keys) under the economy key (${before.saved.v2 && before.saved.v2.kb || before.kb} KB)`, before.saved.credits === before.credits && before.saved.day === before.day && before.saved.ships === 1 && before.saved.apt === Ap.lot.id && before.saved.job === null && before.saved.v2 && before.saved.v2.v === 2 && before.saved.v2.businesses === sim.businesses.length && before.saved.v2.shipments > 0 && before.saved.v2.hasJobKey && before.saved.v2.entries === before.count, `credits ${before.saved.credits}, ${before.saved.v2 && before.saved.v2.shipments} shipments, ${before.saved.v2 && before.saved.v2.applied} keys`);
  await ev(`(() => { window.__old = true; location.href = ${JSON.stringify(`${base}/?time=0.45&mode=survival&quality=light&rd=4`)}; })()`);
  for (let i = 0; i < 100; i++) { await page.sleep(200); const gone = await ev('!window.__old').catch(() => false); if (gone) break; }
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1000);
  const after = await evj(`(() => { const eco = game.economy; const b = eco.v2.business(${G.lot.id}); return { credits: game.player.credits, spec: eco.ownedShipSpec(), apt: eco.apartment && eco.apartment.lotId, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), funds: b.funds, wheat: b.stockOf('wheat'), day: game.sky.day, sign: game.signs.textFor(${Ap.lot.id}).name, W: eco.v2.wealth(), net: eco.ledger.net, count: eco.ledger.count, drift: eco.v2.drift(), shipments: eco.shipments().length, jobKey: eco.ledger.has('job:${board.first.id}') }; })()`);
  check('reload restores the wallet, the owned ship, the apartment (sign still "Your apartment") and the day', after.credits === before.credits && after.spec && after.spec.cls === 'speeder' && after.apt === Ap.lot.id && after.sign === 'Your apartment' && after.day === before.day, JSON.stringify({ credits: after.credits, day: after.day }));
  check('reload restores the city: the drained shelf stays drained, the grocer\'s till and the wheat it bought, wealth, ledger totals, in-flight shipments and the applied job key; the identity holds on the restored state', after.stock === before.stock && after.funds === before.funds && after.wheat === before.wheat && after.W === before.W && after.net === before.net && after.count >= before.count && after.drift === 0 && after.shipments > 0 && after.jobKey, `stock ${after.stock}, funds ${after.funds}, W ${after.W}, ${after.shipments} shipments`);

  // ------------------------------------------------------------------ sleep: night -> 06:00 next day, shelves refill
  log('\n== Sleep / daily restock ==');
  const slept = await evj(`(() => { const eco = game.economy; game.sky.time = 0.5; const dayRefused = eco.sleep(); const msgDay = game.hud.messages.slice(-1)[0].text; game.sky.time = 0.9; const d0 = game.sky.day; const c0 = game.player.credits; const s0 = eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}); const ok = eco.sleep(); __t.ticks(20); return { dayRefused, msgDay, ok, time: game.sky.time, day: game.sky.day, d0, credits: game.player.credits, c0, paid: eco.apartment.paidUntilDay, s0, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), menu: eco.menuFor(${G.lot.id}).on.includes('apple'), simDay: eco.v2.day() }; })()`);
  check('sleeping is refused by day; at night it skips to 06:00 of the next day (tonight\'s rent was prepaid)', slept.dayRefused === true && /only sleep at night/.test(slept.msgDay) && slept.ok === true && Math.abs(slept.time - 0.25) < 1e-9 && slept.day === slept.d0 + 1 && slept.credits === slept.c0, `day ${slept.d0} -> ${slept.day} 06:00, paid through day ${slept.paid}`);
  check('the next morning the grocer has unpacked its staples onto the shelf again (daily restock through the sim, not a reset)', slept.simDay === slept.day && slept.stock > slept.s0 && slept.menu, `${slept.s0} -> ${slept.stock}/${appleEntry.stock}`);
  const rentDue = await evj(`(() => { const eco = game.economy; game.sky.time = 0.9; const c0 = game.player.credits; const ok = eco.sleep(); return { ok, c0, credits: game.player.credits, paid: eco.apartment.paidUntilDay, day: game.sky.day }; })()`);
  check(`sleeping a second night charges the ${rentPrice} cr rent automatically`, rentDue.ok === true && rentDue.credits === rentDue.c0 - rentPrice && rentDue.paid === rentDue.day, `${rentDue.c0} -> ${rentDue.credits} cr, paid through day ${rentDue.paid}`);
  const endowed = Math.floor(appleEntry.stock * TUNING.endowment);
  const reset = await evj(`(() => { const eco = game.economy; eco.reset(); return { credits: game.player.credits, ships: eco.ownedShips.length, apt: eco.apartment, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), sign: game.signs.textFor(${Ap.lot.id}).name, entries: eco.ledger.count, endowment: eco.ledger.sources.endowment, drift: eco.v2.drift() }; })()`);
  check(`"Reset economy" puts the wallet back to 250, clears ships and apartment and rebuilds a fresh city (shelf back at its ${endowed}-unit endowment, new journal)`, reset.credits === 250 && reset.ships === 0 && reset.apt === null && reset.stock === endowed && reset.sign === Ap.purpose.name && reset.entries < 3000 && reset.endowment > 0 && reset.drift === 0, JSON.stringify({ credits: reset.credits, stock: reset.stock, entries: reset.entries }));
  const errs = page.exceptions.slice(0, 3);
  check('no uncaught exceptions during the run', errs.length === 0, errs.join(' | '));
} catch (e) {
  failed++;
  log('ERROR', e.stack || e.message);
} finally {
  if (page) { const errs = page.exceptions.slice(0, 5); if (errs.length) log('page exceptions:', errs); page.close(); }
}
log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
