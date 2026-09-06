// Economy verification (rubric 08 + rubric 07 #2):
//   node scripts/test-economy.mjs                      offline: price book, job boards, payout maths, restock ledger
//   node scripts/test-economy.mjs --url http://localhost:5215 [--shots /tmp/economy-shots]
//                                                      + headless CDP run against the dev server: entrance signs and
//                                                        the enter/leave toast, buy an apple, sell wheat, accept and
//                                                        complete a courier job, job terminal right-click, rent a
//                                                        room and sleep, buy a ship, admin buttons, save / reload
import { mkdirSync } from 'node:fs';
import { getLayout, LEVELS } from '../src/coruscant/layout.js';
import { allPurposes, lotsOfKind, purposeFor } from '../src/coruscant/purposes.js';
import { GOODS, SHIP_CLASSES, DISTRICT_MULT, SELL_RATIO, PAWN_RATIO, buyPrice, sellPrice, vendorBuys, vendorSellPrice, itemCategory, goodsKey } from '../src/economy/prices.js';
import { generateBoard, REWARD, JOB_KINDS, TERMINAL_KINDS } from '../src/economy/jobs.js';
import { StockLedger } from '../src/economy/stock.js';

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

// ================================================================================================ offline
log('== Price book ==');
const bad = [];
for (const [key, g] of Object.entries(GOODS)) {
  if (!(g.base > 0) || !g.cat) bad.push(key);
  if (g.service ? g.id !== null : !Number.isInteger(g.id)) bad.push(key + ':id');
}
check('every good has a positive base price, a category and an id (services: null)', bad.length === 0, bad.join(','));
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

log('\n== Restock ledger ==');
const st = new StockLedger();
const apple = { item: 'apple', stock: 40 };
check('fresh ledger shows the full stock', st.stockOf(7, apple, 0) === 40);
check('a sale reduces stock; over-buying is capped at what is left', st.take(7, apple, 9, 0) === 9 && st.stockOf(7, apple) === 31 && st.take(7, apple, 100, 0) === 31 && st.stockOf(7, apple) === 0 && st.take(7, apple, 1, 0) === 0);
check('stock is per (lot, item)', st.stockOf(8, apple) === 40 && st.stockOf(7, { item: 'bread', stock: 24 }) === 24);
const snap = JSON.stringify(st.serialize());
const st2 = new StockLedger(); st2.restore(JSON.parse(snap));
check('ledger survives a serialize / restore round trip', st2.stockOf(7, apple, 0) === 0 && st2.day === 0);
check('the next day restocks everything', st.roll(1) === true && st.stockOf(7, apple) === 40 && st.roll(1) === false);

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
const T = best.t, G = best.g;
const A = apartments.sort((p, q) => dist(doorOut(p.lot), doorOut(T.lot)) - dist(doorOut(q.lot), doorOut(T.lot)))[0];
const D = dealers[0];
const y = LEVELS.underWalk;
log(`\nterminal ${T.purpose.kind} "${T.purpose.name}" #${T.lot.id} at ${JSON.stringify(doorOut(T.lot))}; vendor "${G.purpose.name}" #${G.lot.id} ${Math.round(best.d)} blocks away; apartments "${A.purpose.name}" #${A.lot.id}; dealer "${D.purpose.name}" #${D.lot.id}`);

const { launchPage } = await import('./cdp.mjs');
mkdirSync(shots, { recursive: true });
const profile = `/tmp/chrome-economy-${process.pid}`;
const start = doorOut(T.lot);
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
};
true`;

try {
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(2500);
  const boot = await evj(`({ eco: !!game.economy, signs: !!game.signs, credits: game.player.credits, layoutSeed: game.coruscant.layout.seed, lots: game.coruscant.layout.lots.length })`);
  check('game.economy and game.signs exist; wallet starts at 250 on a fresh world', boot.eco && boot.signs && boot.credits === 250, JSON.stringify(boot));
  check('the page uses the same layout as this test (seed, lot count)', boot.layoutSeed === seed && boot.lots === layout.lots.length, `${boot.layoutSeed}/${boot.lots}`);

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
  const tin = doorIn(T.lot), tout = doorOut(T.lot);
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
  check('walking through the door fires "Entering <name> - <category>"', toast.outside === null && toast.enter.length === 1 && toast.enter[0] === `Entering ${T.purpose.name.replace(/\u2014|\u2013/g, '-')} - ${{ housing: 'Housing', office: 'Offices', government: 'Government', hospitality: 'Hospitality', retail: 'Retail', food: 'Food & drink', industry: 'Industry', transport: 'Transport', security: 'Security', culture: 'Culture', medical: 'Medical', media: 'Media', religion: 'Religion' }[T.purpose.category]}`, JSON.stringify(toast.enter));
  check('walking back out fires "Leaving <name>"', toast.leave.length === 1 && toast.leave[0].startsWith('Leaving '), JSON.stringify(toast.leave));
  check('re-entering within 5 s is debounced (no second toast)', toast.again === 0, `${toast.again} extra`);
  check('toasts reach the HUD toast queue', toast.toasts.some((t) => t.startsWith('Entering') || t.startsWith('Leaving')), JSON.stringify(toast.toasts));

  // ------------------------------------------------------------------ shop: buy an apple, sell wheat
  log('\n== Shop ==');
  const gOut = doorOut(G.lot);
  await ev(`(async () => { await __t.go(${gOut.x}, ${y}, ${gOut.z}); game.setMode('survival', { persist: false, announce: false }); game.player.flying = false; })()`);
  const appleEntry = G.purpose.sells.find((s) => s.item === 'apple');
  const applePrice = buyPrice('apple', G.purpose.district, appleEntry.price);
  const opened = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${G.lot.id}), p = eco.purposeOfLot(lot); eco.openShop(p, null); return { ...__t.eco(), title: document.getElementById('sh-title').textContent, cards: document.querySelectorAll('#sh-goods .sh-card').length, sells: p.sells.length, slots: document.querySelectorAll('#sh-inventory .sh-slot').length, apple: !!__t.card('Apple'), applePrice: __t.card('Apple') && __t.card('Apple').querySelector('.sh-price').textContent }; })()`);
  check('openShop(purpose) shows the shop screen with the vendor name and one card per good', opened.screen === 'shop' && !opened.panelHidden && opened.title === G.purpose.name && opened.cards === opened.sells && opened.slots === 36 && opened.apple, `${opened.title}: ${opened.cards} goods`);
  check(`the apple card quotes the district price (${applePrice} cr)`, opened.applePrice === `${applePrice} cr`, opened.applePrice);
  await shot('shop_open');
  const bought = await evj(`(() => { const before = game.player.credits, n0 = game.inventory.count(${I.APPLE}); __t.clickEl(__t.card('Apple')); const one = { credits: game.player.credits, apples: game.inventory.count(${I.APPLE}) }; __t.clickEl(__t.card('Apple'), true); return { before, n0, one, after: { credits: game.player.credits, apples: game.inventory.count(${I.APPLE}) }, stock: game.economy.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), flash: document.getElementById('sh-flash').textContent }; })()`);
  check('left-click buys 1 apple and charges the wallet (survival)', bought.one.apples === bought.n0 + 1 && bought.one.credits === bought.before - applePrice, `${bought.before} -> ${bought.one.credits} cr`);
  check('shift-click buys 8 more', bought.after.apples === bought.n0 + 9 && bought.after.credits === bought.before - 9 * applePrice, `${bought.after.apples} apples, ${bought.after.credits} cr; "${bought.flash}"`);
  check('vendor stock dropped by 9 for the rest of the day', bought.stock === appleEntry.stock - 9, `${bought.stock} left today`);
  const wheatOffer = vendorSellPrice(G.purpose, I.WHEAT);
  const sold = await evj(`(() => { game.inventory.addStack(${I.WHEAT}, 10); game.economy.ui.refresh(); const idx = game.inventory.slots.findIndex((s) => s && s.id === ${I.WHEAT}); const slot = document.querySelectorAll('#sh-inventory .sh-slot')[idx]; const offer = game.economy.offerFor(game.economy.purposeOfLot(game.economy.lotById(${G.lot.id})), ${I.WHEAT}); const before = game.player.credits; __t.clickEl(slot); const one = game.player.credits; __t.clickEl(document.querySelectorAll('#sh-inventory .sh-slot')[idx], true); return { offer, sellable: slot.classList.contains('sh-sellable'), before, one, after: game.player.credits, wheat: game.inventory.count(${I.WHEAT}), planksOffer: game.economy.offerFor(game.economy.purposeOfLot(game.economy.lotById(${G.lot.id})), 5) }; })()`);
  check(`the grocer buys wheat at 45% (${wheatOffer} cr) - click sells 1, shift-click 8`, sold.sellable && sold.offer === wheatOffer && sold.one === sold.before + wheatOffer && sold.after === sold.before + 9 * wheatOffer && sold.wheat === 1, `${sold.before} -> ${sold.after} cr`);
  check('the grocer does not buy building blocks (category rule)', sold.planksOffer === null);
  const closed = await evj(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); return __t.eco(); })()`);
  check('Esc closes the shop screen', closed.screen === null && closed.panelHidden);
  const creative = await evj(`(() => { game.setMode('creative', { persist: false, announce: false }); const eco = game.economy, p = eco.purposeOfLot(eco.lotById(${G.lot.id})); const before = game.player.credits; eco.openShop(p, null); const note = document.getElementById('sh-wallet-note').textContent; const n = eco.buy(p, p.sells.find((s) => s.item === 'apple'), 1); game.closeScreen(); return { before, after: game.player.credits, n, note }; })()`);
  check('creative mode shows prices but never charges', creative.n === 1 && creative.after === creative.before && /creative/.test(creative.note), creative.note);

  // ------------------------------------------------------------------ jobs: accept a courier run, deliver by teleport
  log('\n== Jobs ==');
  await ev(`(async () => { await __t.go(${tout.x}, ${y}, ${tout.z}); })()`);
  const board = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${T.lot.id}); eco.openJobs(lot); const jobs = eco.jobs.board(lot); return { ...__t.eco(), n: jobs.length, kinds: jobs.map((j) => j.kind), cards: document.querySelectorAll('#sh-jobs .sh-job').length, first: jobs[0], accepts: document.querySelectorAll('#sh-jobs .sh-btn').length }; })()`);
  check('the job terminal screen lists the board (3-6 jobs, courier first)', board.screen === 'jobs' && board.n >= 3 && board.n <= 6 && board.cards === board.n && board.kinds[0] === 'courier', board.kinds.join(','));
  const boardOffline = generateBoard(seed, 0, termLot(T), { ...ctx, pads: await evj('game.economy.pads()'), deckY: await evj('game.economy.deckY()') });
  check('the in-game board matches the offline generator for (seed, day 0, lot)', boardOffline[0] && boardOffline[0].id === board.first.id && boardOffline[0].reward === board.first.reward && boardOffline[0].to.lotId === board.first.to.lotId, `${board.first.title} (${board.first.reward} cr, ${board.first.distance} blocks)`);
  await shot('jobs_board');
  const accepted = await evj(`(() => { const btn = document.querySelector('#sh-jobs .sh-job .sh-btn'); __t.clickEl(btn); const a = game.economy.jobs.active; const tagged = !!document.querySelector('#sh-jobs .sh-job-active .sh-job-tag'); game.closeScreen(); return { active: !!a, kind: a && a.job.kind, status: game.economy.jobs.status(), target: game.economy.jobs.target(), remaining: game.economy.jobs.remaining(), tagged }; })()`);
  check('Accept makes the courier run the active job (card tagged "accepted") with a HUD status line and a compass target', accepted.active && accepted.kind === 'courier' && accepted.tagged && /^Courier: deliver the package to /.test(accepted.status) && accepted.target && Math.abs(accepted.target.x - board.first.to.x) < 0.01 && accepted.remaining > 0.99, accepted.status);
  const strip = await evj(`(() => { game.hud.render(game); const p = game.player.pos, t = game.economy.jobs.target(); return { dist: Math.round(Math.hypot(t.x - p.x, t.z - p.z)), toasts: game.hud.toasts.map((x) => x.text) }; })()`);
  check('HUD renders with the active-job strip (distance to target shown)', strip.dist > 50, `${strip.dist} m; toasts ${JSON.stringify(strip.toasts)}`);
  await ev('(async () => { game.input.locked = true; await __t.frames(3); })()');
  await shot('job_accepted_hud');
  await ev('game.input.locked = false');
  const busy = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${T.lot.id}); const ok = eco.jobs.accept(eco.jobs.board(lot)[1], lot); return { ok, kind: eco.jobs.active.job.kind }; })()`);
  check('only one job at a time (a second Accept is refused)', busy.ok === false && busy.kind === 'courier');
  const done = await evj(`(async () => { const eco = game.economy, j = eco.jobs.active.job, before = game.player.credits; await __t.go(j.to.x, ${y}, j.to.z); __t.ticks(8); return { before, after: game.player.credits, reward: j.reward, active: !!eco.jobs.active, jobsDone: eco.stats.jobsDone, toasts: game.hud.toasts.map((x) => x.text) }; })()`);
  check('arriving at the destination completes the job and pays the reward', !done.active && done.after === done.before + done.reward && done.jobsDone === 1, `+${done.reward} cr -> ${done.after}; ${JSON.stringify(done.toasts)}`);
  // right-click on a HOLO_SIGN inside the terminal opens the board from the world
  await ev(`(async () => { await __t.go(${tout.x}, ${y}, ${tout.z}); await __t.wait(1500); })()`);
  const holo = await evj(`(async () => {
    const lot = game.economy.lotById(${T.lot.id});
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
  const aOut = doorOut(A.lot);
  const roomEntry = A.purpose.sells.find((s) => s.item === 'room_night');
  const rentPrice = buyPrice('room_night', A.purpose.district, roomEntry.price);
  const rented = await evj(`(async () => { await __t.go(${aOut.x}, ${y}, ${aOut.z}); game.setMode('survival', { persist: false, announce: false }); const eco = game.economy, lot = eco.lotById(${A.lot.id}), p = eco.purposeOfLot(lot); const before = game.player.credits; const ok = eco.buy(p, p.sells.find((s) => s.item === 'room_night'), 1); return { ok, before, after: game.player.credits, apt: eco.apartment, sign: game.signs.textFor(${A.lot.id}), meta: !!eco.metaOf(${A.lot.id}) }; })()`);
  check(`renting a room charges ${rentPrice} cr and records the apartment (bed room in the residential tower)`, rented.ok === 1 && rented.after === rented.before - rentPrice && rented.apt && rented.apt.lotId === A.lot.id && rented.apt.paidUntilDay >= 1, JSON.stringify({ floor: rented.apt && rented.apt.floor, bed: rented.apt && rented.apt.bed, meta: rented.meta }));
  check('the door sign of the rented tower now reads "Your apartment"', rented.sign.name === 'Your apartment' && rented.sign.yours === true, rented.sign.key);

  // ------------------------------------------------------------------ ships: grant + buy
  log('\n== Ships ==');
  const granted = await evj(`(() => { const before = game.player.credits; game.economy.grant(10000); return { before, after: game.player.credits, btnGrant: !!document.getElementById('ap-btn-grant'), btnReset: !!document.getElementById('ap-btn-eco-reset'), grantText: document.getElementById('ap-btn-grant').textContent, resetText: document.getElementById('ap-btn-eco-reset').textContent }; })()`);
  check('admin panel has "Grant 10,000 credits" and "Reset economy" in the Developer footer; grant adds 10,000', granted.btnGrant && granted.btnReset && granted.grantText === 'Grant 10,000 credits' && granted.resetText === 'Reset economy' && granted.after === granted.before + 10000, `${granted.before} -> ${granted.after}`);
  const ship = await evj(`(() => { const eco = game.economy, lot = eco.lotById(${D.lot.id}), p = eco.purposeOfLot(lot); eco.openShop(p, null); const cards = [...document.querySelectorAll('#sh-goods .sh-card .sh-name')].map((n) => n.textContent); const before = game.player.credits; __t.clickEl(__t.card('Light speeder')); const spec = eco.ownedShipSpec(); const ownedNote = __t.card('Light speeder').querySelector('.sh-stock').textContent; const disabled = __t.card('Light speeder').disabled; game.closeScreen(); return { cards, before, after: game.player.credits, spec, ownedNote, disabled, summary: eco.summary().ships }; })()`);
  check('the ship dealer lists 4 classes (4,000 / 14,000 / 32,000 / 60,000)', ship.cards.length === 4 && ship.cards.includes('Light speeder') && ship.cards.includes('Star yacht'), ship.cards.join(', '));
  check('buying the light speeder charges 4,000 and records ownedShipSpec() = { cls, padIndex, boughtAtDay }', ship.after === ship.before - 4000 && ship.spec && ship.spec.cls === 'speeder' && Number.isInteger(ship.spec.padIndex) && Number.isInteger(ship.spec.boughtAtDay) && ship.disabled && /owned/.test(ship.ownedNote), JSON.stringify(ship.spec) + ' ' + ship.summary.join(','));

  // ------------------------------------------------------------------ save / reload
  log('\n== Save / reload ==');
  const before = await evj(`(() => { game.persistNow(); const raw = JSON.parse(localStorage.getItem(game.save.key)); return { credits: game.player.credits, saved: raw.economy, apples: game.inventory.count(${I.APPLE}) }; })()`);
  check('the save carries the economy blob (wallet, day, stock deltas, ships, apartment, job)', before.saved && before.saved.credits === before.credits && before.saved.day === 0 && before.saved.ownedShips.length === 1 && before.saved.apartment && before.saved.apartment.lotId === A.lot.id && before.saved.stock && before.saved.stock.sold.length >= 1 && before.saved.job === null, `credits ${before.saved && before.saved.credits}, sold ${before.saved && before.saved.stock.sold.length} entries`);
  await ev(`(() => { window.__old = true; location.href = ${JSON.stringify(`${base}/?time=0.45&mode=survival&quality=light&rd=4`)}; })()`);
  for (let i = 0; i < 100; i++) { await page.sleep(200); const gone = await ev('!window.__old').catch(() => false); if (gone) break; }
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1000);
  const after = await evj(`(() => { const eco = game.economy; return { credits: game.player.credits, spec: eco.ownedShipSpec(), apt: eco.apartment && eco.apartment.lotId, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), day: game.sky.day, sign: game.signs.textFor(${A.lot.id}).name }; })()`);
  // 9 apples bought in survival + 1 in creative (creative is free but still takes stock)
  check('reload restores the wallet, the owned ship, the apartment (sign still "Your apartment") and today\'s stock deltas', after.credits === before.credits && after.spec && after.spec.cls === 'speeder' && after.apt === A.lot.id && after.sign === 'Your apartment' && after.stock === appleEntry.stock - 10, JSON.stringify(after));

  // ------------------------------------------------------------------ sleep: night -> 06:00 next day, shelves refill
  log('\n== Sleep / daily restock ==');
  const slept = await evj(`(() => { const eco = game.economy; game.sky.time = 0.5; const dayRefused = eco.sleep(); const msgDay = game.hud.messages.slice(-1)[0].text; game.sky.time = 0.9; const d0 = game.sky.day; const c0 = game.player.credits; const ok = eco.sleep(); return { dayRefused, msgDay, ok, time: game.sky.time, day: game.sky.day, d0, credits: game.player.credits, c0, paid: eco.apartment.paidUntilDay, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}) }; })()`);
  check('sleeping is refused by day; at night it skips to 06:00 of the next day (tonight\'s rent was prepaid)', slept.dayRefused === true && /only sleep at night/.test(slept.msgDay) && slept.ok === true && Math.abs(slept.time - 0.25) < 1e-9 && slept.day === slept.d0 + 1 && slept.credits === slept.c0, `day ${slept.d0} -> ${slept.day} 06:00, paid through day ${slept.paid}`);
  check('the next morning the grocer\'s shelves are full again (daily restock)', slept.stock === appleEntry.stock, `${slept.stock}/${appleEntry.stock}`);
  const rentDue = await evj(`(() => { const eco = game.economy; game.sky.time = 0.9; const c0 = game.player.credits; const ok = eco.sleep(); return { ok, c0, credits: game.player.credits, paid: eco.apartment.paidUntilDay, day: game.sky.day }; })()`);
  check(`sleeping a second night charges the ${rentPrice} cr rent automatically`, rentDue.ok === true && rentDue.credits === rentDue.c0 - rentPrice && rentDue.paid === rentDue.day, `${rentDue.c0} -> ${rentDue.credits} cr, paid through day ${rentDue.paid}`);
  const reset = await evj(`(() => { const eco = game.economy; eco.reset(); return { credits: game.player.credits, ships: eco.ownedShips.length, apt: eco.apartment, stock: eco.stockOf(${G.lot.id}, ${JSON.stringify(appleEntry)}), sign: game.signs.textFor(${A.lot.id}).name }; })()`);
  check('"Reset economy" puts the wallet back to 250 and clears ships, apartment and stock deltas', reset.credits === 250 && reset.ships === 0 && reset.apt === null && reset.stock === appleEntry.stock && reset.sign === A.purpose.name, JSON.stringify(reset));
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
