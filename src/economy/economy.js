// The economy (rubric 08): the wallet in Republic credits, vendor stock that restocks daily, the shop and jobs screens,
// services (rooms, air taxis, bacta), housing (rent a room, sleep in its bed), ship ownership and persistence.
// One instance per game as `game.economy`, created once the world, the city layout and the player exist.
//
// Everything here is per client: in multiplayer every player has their own wallet, stock view, job and apartment;
// nothing is sent over the wire (see docs/economy_balance.md, "Multiplayer").
//
// Interfaces for the other workstreams:
//   game.economy.openShop(purpose, npc)          NPC builder: a vendor NPC was right-clicked (onTrade)
//   game.economy.onTrade(npc, purpose)           same, in the callback shape the NPC planner emits
//   game.economy.ownedShipSpec()                 ships builder: { cls, padIndex, boughtAtDay } | null
//   game.economy.repairTargets()                 ships builder: [{ x, y, z }] damaged parts of the active repair job
//   game.ships.repairSpots(padIndex, n)          (optional, provided by the ships builder) real part positions on the
//                                                docked ship; the economy falls back to points around the pad
//
// Pass 2 (rubric 15, docs/overhaul/economy.md) adds the city simulation behind the vendors - `game.economy.v2` is an
// EconomySim (src/economy/sim.js): businesses with inventories, households, shipments, the price rule and the ledger.
// Read API for other builders (all return plain data; null / [] when the sim is off with ?economy=0):
//   business(lotId) quote(lotId, good) shipments() ledger transfer(t) detain(id, reason) release(id)
//   menuFor(lotId) waitingFor(lotId) holdFor(shipIndex) noticeFor(district) repairBerths() serviceLevel(lotId)
// Events on game.events: economy:transfer, economy:shipment, economy:stock, economy:notice.
import * as THREE from 'three';
import { B, BLOCKS, SHAPE } from '../blocks.js';
import { displayName } from '../items.js';
import { LEVELS } from '../coruscant/layout.js';
import { purposeFor, allPurposes, isOpen } from '../coruscant/purposes.js';
import { SPACEPORT, DECK_Y } from '../coruscant/spaceport.js';
import { blueprintFor } from '../coruscant/buildings.js';
import { GOODS, SHIP_CLASSES, buyPrice, vendorSellPrice, goodsKey } from './prices.js';
import { JobBoard, TERMINAL_KINDS, goodLabel } from './jobs.js';
import { StockLedger } from './stock.js';
import { ShopUI } from '../ui/shop.js';
import { EconomySim, TUNING } from './sim.js';
import { gameArrivals } from './arrivals.js';
import { CrateLayer } from './crates.js';
import { TICK_RATE } from '../constants.js';

export const START_CREDITS = 250;
export const PLAYER_PAD = 4;          // spaceport pad the player's ship is parked on (first pad south of the terminal)
export const TRADE_IN_RATIO = 0.6;    // buying a second ship trades the first in at 60% of its price
const APARTMENT_KINDS = ['apartments', 'hostel', 'luxury_residences', 'hotel'];
const BED_ROOMS = ['hotel_room', 'family_apartment', 'studio', 'penthouse', 'barracks'];
const SLEEP_FROM = 0.77, SLEEP_TO = 0.23;   // 18:30 .. 05:30 (Minecraft lets you sleep from dusk to dawn)
const WAKE_TIME = 0.25;                     // 06:00
export const CATEGORY_LABEL = { housing: 'Housing', office: 'Offices', government: 'Government', hospitality: 'Hospitality', retail: 'Retail', food: 'Food & drink', industry: 'Industry', transport: 'Transport', security: 'Security', culture: 'Culture', medical: 'Medical', media: 'Media', religion: 'Religion' };

// The HUD's pixel font has no typographic punctuation; toasts and chat lines go through this.
export const hudText = (s) => String(s).replace(/\u2014|\u2013/g, '-').replace(/\u2019|\u2018/g, "'").replace(/\u00d7/g, 'x').replace(/\u20a1/g, 'cr').replace(/\u00b7/g, '-');

const isBuilding = (lot) => lot && (lot.kind === 'tower' || lot.kind === 'landmark');

export class Economy {
  constructor(game) {
    this.game = game;
    this.layout = game.coruscant ? game.coruscant.layout : null;
    this.stats = { earned: 0, spent: 0, sold: 0, bought: 0, jobsDone: 0, jobEarnings: 0, nights: 0 };
    this.stock = new StockLedger();   // units sold per (lot, item) today; restocks when the day changes
    this.ownedShips = [];         // [{ cls, padIndex, boughtAtDay, price }]
    this.apartment = null;        // { lotId, name, bed: {x,y,z}|null, room: {x,y,z,w,d}|null, floor, paidUntilDay }
    this.jobs = new JobBoard(this);
    this.ui = new ShopUI(game, this);
    this.markerGroup = new THREE.Group();
    this.markerGroup.name = 'economy-markers';
    game.scene.add(this.markerGroup);
    this.markerGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    this.markerMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, depthWrite: false });
    this.dirty = false;
    this._all = null;
    this.onTrade = (npc, purpose) => this.openShop(purpose, npc);
    if (game.player.credits == null) game.player.credits = START_CREDITS;
    // the v2 simulation (off with ?economy=0: pass-1 wallet and daily stock only)
    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    this.v2Enabled = !!this.layout && !(params && params.get('economy') === '0');
    this.v2 = null; this.crates = null; this._v2DirtyAt = 0; this._lastToastAt = -1e9;
    if (this.v2Enabled) this.buildSim();
    this.restore(game.save ? game.save.economy : null);
    if (this.v2 && game.vehicles && game.scene && game.atlas) this.crates = game.vehicles.add(new CrateLayer(game, this));
    if (this.v2 && game.events) game.events.on('economy:notice', (n) => this.onNotice(n));
  }
  // Builds a fresh EconomySim over the city layout. The player's wallet is lent to the sim as an account so every
  // credit the player earns or spends is a journal entry; game.events receives the sim's events.
  buildSim() {
    const eco = this, game = this.game;
    const player = { get credits() { return game.player.credits | 0; }, set credits(v) { game.player.credits = Math.max(0, Math.round(v)) | 0; eco.markDirty(); } };
    this.v2 = new EconomySim({ layout: this.layout, purposes: this.allLots(), pads: SPACEPORT.pads, deckY: DECK_Y, arrivals: gameArrivals(game), player, batch: TUNING.batch, onEvent: (name, payload) => { if (game.events) game.events.emit(name, payload); } });
    return this.v2;
  }
  // district notices the player should hear about (held freighters, detained cargo, outages), at most one per 30 s
  onNotice(n) {
    if (!n || !(n.kind === 'held' || n.kind === 'detained' || n.kind === 'outage')) return;
    const now = this.game.time || 0;
    if (now - this._lastToastAt < 30) return;
    this._lastToastAt = now;
    this.toast(n.text, n.kind === 'outage' ? '#ff9a6a' : '#ffd866');
  }

  // ------------------------------------------------------------------------------------------------ wallet
  get credits() { return this.game.player.credits | 0; }
  set credits(v) { this.game.player.credits = Math.max(0, Math.round(v)) | 0; this.markDirty(); }
  // creative mode shows prices but never charges (rubric 08 #8)
  get free() { return this.game.mode === 'creative'; }
  canAfford(n) { return this.free || this.credits >= n; }
  // Charges the player `n` credits for a service bought at lot `to` (the business receives them: an internal transfer
  // of the ledger; without a lot the fee goes offworld as `fees`). Creative mode charges nothing.
  charge(n, why = '', to = null) {
    if (n <= 0) return true;
    if (!this.canAfford(n)) { this.flash(`Not enough credits: ${n} needed, you have ${this.credits}.`); return false; }
    if (!this.free) {
      if (this.v2) { const r = this.v2.pay('player', to != null && this.v2.business(to) ? to : 'offworld', n, why ? `service:${why}` : 'service'); if (r !== true) { this.flash(`Payment failed (${r}).`); return false; } }
      else this.credits -= n;
      this.stats.spent += n;
    }
    if (why) this.flash(`${this.free ? 'Creative: no charge for' : `Paid ${n} cr for`} ${why}.`);
    return true;
  }
  // Pays the player `n` credits: from business `from` when it can afford it, else from the shipping guild offworld
  // (`jobs` source). `key` makes the payout idempotent (a job can never pay twice).
  earn(n, why = '', from = null, key = null) {
    if (n <= 0) return;
    if (this.v2) {
      if (key != null && this.v2.journal.has(key)) return;
      let r = from != null && this.v2.business(from) ? this.v2.pay(from, 'player', n, 'job', key) : 'no-funds';
      if (r !== true) r = this.v2.pay('offworld', 'player', n, 'job', key);
      if (r !== true) return;
    } else this.credits += n;
    this.stats.earned += n;
    this.toast(`+${n} cr${why ? ' - ' + why : ''}`, '#ffd866');
    if (this.game.audio) this.game.audio.pop();
  }
  grant(n) { if (this.v2) this.v2.pay('admin', 'player', n, 'grant'); else this.credits += n; this.say(`${n} credits added to your wallet.`); this.toast(`+${n} cr - administrator grant`, '#ffd866'); }
  // Admin "Reset economy": wallet, stock, ownership, housing, jobs and stats back to a fresh world.
  reset() {
    this.game.player.credits = START_CREDITS;
    if (this.v2Enabled) this.buildSim();   // a fresh city: the journal restarts from the new endowment
    this.stock.clear(this.day());
    const hadApt = this.apartment;
    this.ownedShips = []; this.apartment = null;
    this.jobs.abandon(true);
    this.stats = { earned: 0, spent: 0, sold: 0, bought: 0, jobsDone: 0, jobEarnings: 0, nights: 0 };
    if (hadApt && this.game.signs) this.game.signs.refreshLot(hadApt.lotId);
    this.markDirty(); this.persist(true);
    this.say('Economy reset: 250 credits, no ships, no apartment, fresh stock.');
    if (this.ui.isOpen) this.ui.refresh();
  }

  // ------------------------------------------------------------------------------------------------ clock / world
  day() { return this.game.sky ? this.game.sky.day | 0 : 0; }
  dayTime() { const s = this.game.sky; return s ? s.day + s.time : 0; }
  hour() { return this.game.sky ? this.game.sky.time * 24 : 12; }
  seed() { return this.layout ? this.layout.seed : (this.game.save ? this.game.save.seed : 1337); }
  allLots() { if (!this.layout) return []; return this._all || (this._all = allPurposes(this.layout)); }
  lotById(id) { if (!this.layout) return null; const l = this.layout.lots[id]; return l && l.id === id ? l : this.layout.lots.find((x) => x.id === id) || null; }
  purposeOfLot(lot) { return purposeFor(lot, this.layout); }
  // The building lot containing world cell (x, z) at height y (null = ignore height), or null on the street.
  lotAt(x, z, y = null) {
    if (!this.layout) return null;
    const bx = Math.floor(x), bz = Math.floor(z);
    for (const l of this.layout.lotsIn(bx, bz, bx + 1, bz + 1)) {
      if (!isBuilding(l)) continue;
      if (y != null && (y < LEVELS.ground - 1 || y > LEVELS.ground + (l.height || 60) + 4)) continue;
      return l;
    }
    return null;
  }
  // Blueprint metadata of a lot (rooms, beds, doors): the city's record once its chunk has generated, otherwise the
  // cached blueprint is built on demand (renting through a lobby NPC always happens with the chunk loaded anyway).
  metaOf(lotId) {
    const cm = this.game.coruscant && this.game.coruscant.cityMeta ? this.game.coruscant.cityMeta() : [];
    const m = cm.find((x) => x.id === lotId);
    if (m) return m;
    const lot = this.lotById(lotId);
    if (!lot || !isBuilding(lot)) return null;
    try { const bp = blueprintFor(lot, this.layout); return bp && bp.meta ? bp.meta : null; } catch (e) { return null; }
  }
  pads() { return SPACEPORT.pads.map((p) => ({ x: p.x, z: p.z })); }
  deckY() { return DECK_Y; }
  padOf(index) { const p = SPACEPORT.pads[index] || SPACEPORT.pads[0]; return { index, x: p.x, y: DECK_Y, z: p.z }; }
  isOpenNow(purpose) { return isOpen(purpose, this.hour()); }
  categoryLabel(cat) { return CATEGORY_LABEL[cat] || cat; }

  // ------------------------------------------------------------------------------------------------ stock
  rollDay() { if (this.stock.roll(this.day())) this.markDirty(); }
  // a vendor with a Business record (a layout lot) reads the sim's shelf; synthetic vendors keep the pass-1 daily stock
  bizOf(lotId) { return this.v2 ? this.v2.business(lotId) : null; }
  stockOf(lotId, entry) { const b = this.bizOf(lotId); if (b) return b.available(entry.item); this.rollDay(); return this.stock.stockOf(lotId, entry); }
  takeStock(lotId, entry, n) { this.rollDay(); const k = this.stock.take(lotId, entry, n); if (k) this.markDirty(); return k; }
  // the price rule (rubric 15 #8) where a Business exists, the pass-1 book price elsewhere
  priceOf(purpose, entry) { const b = this.bizOf(purpose.id); if (b) { const q = this.v2.quote(b, entry.item); if (q && q.buy != null) return q.buy; } return buyPrice(entry.item, purpose.district, entry.price); }
  quote(lotId, good) { return this.v2 ? this.v2.quote(lotId, good) : null; }

  // ------------------------------------------------------------------------------------------------ screens
  // Opens the vendor screen of `purpose` (NPC builder: pass the vendor NPC; world consoles pass null).
  openShop(purpose, npc = null) {
    if (!purpose || !this.game.hud) return false;
    const lot = this.lotById(purpose.id);
    this.game.openScreen('shop');
    this.game.hudCanvas.style.pointerEvents = 'none';
    this.ui.open({ mode: 'shop', purpose, lot, npc });
    if (this.game.audio) this.game.audio.click();
    return true;
  }
  openJobs(lot, purpose = null) {
    purpose = purpose || this.purposeOfLot(lot);
    this.game.openScreen('jobs');
    this.game.hudCanvas.style.pointerEvents = 'none';
    this.ui.open({ mode: 'jobs', purpose, lot, jobs: this.jobs.board(lot) });
    if (this.game.audio) this.game.audio.click();
    return true;
  }
  // called from game.closeScreen() when the shop / jobs screen closes
  closeUI() { this.ui.close(); this.game.hudCanvas.style.pointerEvents = ''; }
  // one-line feedback inside the open screen (falls back to the chat when no screen is open)
  flash(text) { if (this.ui.isOpen) this.ui.flash(hudText(text)); else this.say(text); }
  say(text) { if (this.game.hud) this.game.hud.addMessage(hudText(text)); }
  toast(text, color) { if (this.game.hud && this.game.hud.toast) this.game.hud.toast(hudText(text), color); else this.say(text); }

  // ------------------------------------------------------------------------------------------------ trade
  // Buys up to n units of a vendor entry (fewer when stock, room or credits run short). Services dispatch to their
  // own handlers. Returns the number bought (0 = nothing happened).
  buy(purpose, entry, n = 1) {
    const g = GOODS[entry.item];
    if (!g) return 0;
    const unit = this.priceOf(purpose, entry);
    if (g.service) return this.buyService(purpose, entry, g, unit) ? 1 : 0;
    if (this.bizOf(purpose.id)) return this.buyV2(purpose, entry, g, n);
    const stock = this.stockOf(purpose.id, entry);
    if (stock <= 0) { this.flash('Sold out - the shelves refill tomorrow.'); return 0; }
    n = Math.min(n, stock);
    const inv = this.game.inventory;
    let fit = n;
    while (fit > 0 && !inv.canAdd(g.id, fit)) fit--;
    if (fit <= 0) { this.flash('Your inventory is full.'); return 0; }
    if (!this.free && unit * fit > this.credits) fit = Math.floor(this.credits / unit);
    if (fit <= 0) { this.flash(`Not enough credits: ${unit} needed, you have ${this.credits}.`); return 0; }
    const total = unit * fit;
    if (!this.charge(total)) return 0;
    inv.addStack(g.id, fit);
    this.takeStock(purpose.id, entry, fit);
    this.stats.bought += fit;
    this.markDirty();
    if (this.game.audio) this.game.audio.pop();
    this.flash(`Bought ${fit} x ${displayName(g.id)} for ${this.free ? 'free (creative)' : total + ' cr'}.`);
    if (this.ui.isOpen) this.ui.refresh();
    return fit;
  }
  // v2 purchase: unit by unit through atomic transfers (the ask rises as the shelf empties), items added to the
  // inventory only for the units the journal recorded. Creative takes are free but journaled as the `creative` sink.
  buyV2(purpose, entry, g, n) {
    const lotId = purpose.id, b = this.v2.business(lotId);
    const avail = b.available(entry.item);
    if (avail <= 0) { const w = this.v2.waitingFor(lotId); this.flash(w && w.good ? `Sold out - ${w.text}.` : 'Sold out - waiting on the next shipment.'); return 0; }
    n = Math.min(n, avail);
    const inv = this.game.inventory;
    let fit = n;
    while (fit > 0 && !inv.canAdd(g.id, fit)) fit--;
    if (fit <= 0) { this.flash('Your inventory is full.'); return 0; }
    let bought = 0, total = 0, last = null;
    for (let i = 0; i < fit; i++) {
      const q = this.v2.quote(b, entry.item), unit = q ? q.buy : null;
      if (unit == null) break;
      if (!this.free && unit > this.credits) { last = 'no-funds'; break; }
      const r = this.v2.transfer({ from: lotId, to: 'player', good: entry.item, qty: 1, credits: this.free ? 0 : unit, reason: this.free ? 'creative' : 'player buy' });
      if (r !== true) { last = r; break; }
      bought++; total += this.free ? 0 : unit;
    }
    if (bought <= 0) { this.flash(last === 'no-funds' ? `Not enough credits: ${this.priceOf(purpose, entry)} needed, you have ${this.credits}.` : `Could not buy (${last || 'no-stock'}).`); return 0; }
    inv.addStack(g.id, bought);
    this.stats.bought += bought; this.stats.spent += total;
    this.markDirty();
    if (this.game.audio) this.game.audio.pop();
    this.flash(`Bought ${bought} x ${displayName(g.id)} for ${this.free ? 'free (creative)' : total + ' cr'}.`);
    if (this.ui.isOpen) this.ui.refresh();
    return bought;
  }
  // What the vendor pays for one unit of item `id`, or null when it does not trade the category (or, in v2, cannot
  // afford or store it right now).
  offerFor(purpose, id) { const b = this.bizOf(purpose.id); if (b) { const key = goodsKey(id); if (!key) return null; const q = this.v2.quote(b, key); return q ? q.sell : null; } return vendorSellPrice(purpose, id); }
  // Sells up to n of the player's items to the vendor. Returns the credits received.
  sell(purpose, id, n = 1) {
    const unit = this.offerFor(purpose, id);
    if (unit == null) { this.flash(`${purpose.name} does not buy ${displayName(id)}.`); return 0; }
    if (this.bizOf(purpose.id)) return this.sellV2(purpose, id, n);
    const inv = this.game.inventory;
    const have = inv.count(id);
    n = Math.min(n, have);
    if (n <= 0) return 0;
    inv.remove(id, n);
    const total = unit * n;
    this.credits += total;
    this.stats.earned += total; this.stats.sold += n;
    if (this.game.audio) this.game.audio.pop();
    this.flash(`Sold ${n} x ${displayName(id)} for ${total} cr.`);
    if (this.ui.isOpen) this.ui.refresh();
    return total;
  }
  // v2 sale: unit by unit (the bid falls as the vendor's shelf fills); an item leaves the inventory only when its
  // transfer went through.
  sellV2(purpose, id, n) {
    const lotId = purpose.id, key = goodsKey(id), inv = this.game.inventory;
    n = Math.min(n, inv.count(id));
    let sold = 0, total = 0;
    for (let i = 0; i < n; i++) {
      const q = this.v2.quote(lotId, key);
      if (!q || q.sell == null) break;
      inv.remove(id, 1);
      const r = this.v2.transfer({ from: 'player', to: lotId, good: key, qty: 1, credits: q.sell, reason: 'player sale' });
      if (r !== true) { inv.addStack(id, 1); break; }
      sold++; total += q.sell;
    }
    if (sold <= 0) { this.flash(`${purpose.name} cannot take ${displayName(id)} right now.`); return 0; }
    this.stats.earned += total; this.stats.sold += sold;
    this.markDirty();
    if (this.game.audio) this.game.audio.pop();
    this.flash(`Sold ${sold} x ${displayName(id)} for ${total} cr.`);
    if (this.ui.isOpen) this.ui.refresh();
    return total;
  }

  // ------------------------------------------------------------------------------------------------ services
  buyService(purpose, entry, g, unit) {
    switch (g.service) {
      case 'rent': return this.rent(purpose, unit);
      case 'heal': {
        const p = this.game.player;
        if (p.health >= 20 && p.food >= 20) { this.flash('You are in perfect health already.'); return false; }
        // a bacta shot needs a medical kit on the shelf (rubric 15 #4c): no stock, no treatment
        const b = this.bizOf(purpose.id);
        if (b && b.available('medical') <= 0) { const w = this.v2.waitingFor(purpose.id); this.flash(`No bacta in stock${w && w.shipment ? ` - ${w.text}` : ' - the clinic is waiting on a shipment'}.`); return false; }
        if (!this.charge(unit, 'a bacta shot', purpose.id)) return false;
        if (b) this.v2.transfer({ from: purpose.id, to: 'void', good: 'medical', qty: 1, reason: 'treatment' });
        p.health = 20; p.food = Math.min(20, p.food + 6); p.saturation = Math.min(p.food, p.saturation + 6);
        if (this.game.audio) this.game.audio.burp();
        return true;
      }
      case 'ride': { this.ui.pickDestination(purpose, entry, unit); return false; }
      case 'ship': return this.buyShip(g.cls, purpose, entry);
      default: return false;
    }
  }
  // Air-taxi destinations: the landmarks, plus the active job's next stop (a courier with a taxi fare beats one on
  // foot - that loop is what makes the 4,000 cr speeder reachable in about an hour, see docs/economy_balance.md).
  destinations() {
    const list = ((this.layout && this.layout.landmarks) || []).map((l) => ({ name: l.name, lot: l.lot, x: l.x, z: l.z }));
    const t = this.jobs.active ? this.jobs.target() : null;
    if (t) list.unshift({ name: `Your job: ${t.label}`, x: t.x, y: t.y, z: t.z, job: true });
    return list;
  }
  // Air taxi: a paid teleport to a destination's front door (ground level) or to the active job's marker.
  ride(purpose, unit, dest) {
    let x, y = LEVELS.underWalk, z;
    if (dest.job) { x = dest.x; z = dest.z; if (dest.y != null) y = dest.y; }
    else {
      const lot = this.lotById(dest.lot);
      if (!lot) return false;
      const d = lot.door ? lot.door.out : { x: lot.x0 + (lot.w >> 1), z: lot.z1 };
      x = d.x + 0.5; z = d.z + 0.5;
    }
    if (!this.charge(unit, `the ride to ${dest.name}`, purpose.id)) return false;
    this.game.closeScreen();
    this.game.player.teleport(x, y, z);
    this.toast(`Air taxi: ${dest.job ? dest.name.replace(/^Your job: /, '') : dest.name}`, '#9ad8ff');
    return true;
  }

  // ------------------------------------------------------------------------------------------------ housing
  // Rents a room in a residential lot for one night (60 cr at an apartment tower). The first bed room in the
  // building becomes "Your apartment": its sign changes, its bed can be slept in, its chest keeps its contents (chest
  // contents already persist through the save's block entities).
  rent(purpose, unit) {
    const lot = this.lotById(purpose.id);
    if (!lot) return false;
    const room = this.findBedRoom(lot);
    if (!room) { this.flash('No rooms are free here tonight. Try another tower.'); return false; }
    const day = this.day();
    const same = this.apartment && this.apartment.lotId === lot.id;
    if (!this.charge(unit, same ? 'another night' : `a room at ${purpose.name}`, purpose.id)) return false;
    const paidUntilDay = Math.max(same ? this.apartment.paidUntilDay : day, day) + 1;
    const old = this.apartment && !same ? this.apartment.lotId : null;
    this.apartment = { lotId: lot.id, name: purpose.name, bed: room.bed, room: room.rect, floor: room.floor, paidUntilDay, rentedAtDay: day };
    this.stats.nights += 1;
    this.markDirty();
    if (this.game.signs) { this.game.signs.refreshLot(lot.id); if (old != null) this.game.signs.refreshLot(old); }
    const where = room.bed ? `floor ${room.floor} (y ${room.bed.y})` : 'the upper floors';
    this.toast(same ? `Rent paid through day ${paidUntilDay}` : `Your apartment: ${purpose.name}, ${where}`, '#9ad8ff');
    this.say(same ? `The room is yours for another night (paid through day ${paidUntilDay}).` : `You rent a room at ${purpose.name}: ${where}. Sleep in its bed at night to skip to morning.`);
    if (this.ui.isOpen) this.ui.refresh();
    return true;
  }
  // First bed room of the building (metadata from the blueprint): { rect, bed, floor }.
  findBedRoom(lot) {
    const m = this.metaOf(lot.id);
    if (!m) return null;
    const rooms = (m.rooms || []).filter((r) => BED_ROOMS.includes(r.kind)).sort((a, b) => a.y - b.y || BED_ROOMS.indexOf(a.kind) - BED_ROOMS.indexOf(b.kind));
    const inRoom = (r, p) => p.x >= r.x && p.x < r.x + r.w && p.z >= r.z && p.z < r.z + r.d && Math.abs(p.y - r.y) <= 1;
    for (const r of rooms) {
      const bed = (m.beds || []).find((b) => inRoom(r, b)) || null;
      const floor = Math.max(1, Math.round((r.y - LEVELS.ground) / LEVELS.floorPitch) + 1);
      if (bed || !(m.beds || []).length) return { rect: { x: r.x, y: r.y, z: r.z, w: r.w, d: r.d, kind: r.kind }, bed, floor };
    }
    if ((m.beds || []).length) { const b = m.beds[0]; return { rect: null, bed: { x: b.x, y: b.y, z: b.z }, floor: Math.max(1, Math.round((b.y - LEVELS.ground) / LEVELS.floorPitch) + 1) }; }
    return null;
  }
  ownsBedAt(x, y, z) {
    const a = this.apartment;
    if (!a) return false;
    const lot = this.lotById(a.lotId);
    if (!lot || x < lot.x0 || x >= lot.x1 || z < lot.z0 || z >= lot.z1) return false;
    if (a.room) return y >= a.room.y - 1 && y <= a.room.y + 3 && x >= a.room.x - 1 && x < a.room.x + a.room.w + 1 && z >= a.room.z - 1 && z < a.room.z + a.room.d + 1;
    return !a.bed || Math.abs(y - a.bed.y) <= 2;
  }
  isNight() { const t = this.game.sky ? this.game.sky.time : 0.5; return t >= SLEEP_FROM || t < SLEEP_TO; }
  // Sleeping in your rented bed: rent for the night is due (auto-paid), then the clock jumps to 06:00.
  sleep() {
    const a = this.apartment;
    if (!a) return false;
    if (!this.isNight()) { this.say('You can only sleep at night.'); return true; }
    const day = this.day();
    if (a.paidUntilDay <= day) {
      const def = GOODS.room_night;
      const lot = this.lotById(a.lotId), purpose = lot ? this.purposeOfLot(lot) : null;
      const entry = purpose ? (purpose.sells || []).find((s) => s.item === 'room_night') : null;
      const unit = purpose ? buyPrice('room_night', purpose.district, entry ? entry.price : def.base) : def.base;
      if (!this.charge(unit, 'tonight\u2019s rent', a.lotId)) { this.say('Tonight\u2019s rent is due and you cannot pay. Earn some credits first.'); return true; }
      a.paidUntilDay = day + 1; this.stats.nights += 1;
    }
    const sky = this.game.sky;
    if (sky.time > 0.5) sky.day++;
    sky.time = WAKE_TIME;
    const p = this.game.player;
    p.fallDistance = 0;
    // the city wakes with the player: wages, restocks and reorders of the new day are settled now, not over the
    // next batches
    if (this.v2) this.v2.catchUp(this.dayTime(), this.game.vehicles ? this.game.vehicles.tickCount / TICK_RATE : 0);
    this.markDirty();
    this.game.persistState();
    this.toast(`Good morning - day ${sky.day}, 06:00`, '#9ad8ff');
    this.say(`You sleep through the night in your room at ${a.name}. Rent is paid through day ${a.paidUntilDay}.`);
    if (this.game.audio) this.game.audio.chestClose({ x: p.pos.x, y: p.pos.y, z: p.pos.z });
    return true;
  }

  // ------------------------------------------------------------------------------------------------ ships
  // Buys a ship class at the dealer; a second purchase trades the first ship in. Records the ownership the ships
  // builder reads through ownedShipSpec(): { cls, padIndex, boughtAtDay }.
  buyShip(cls, purpose = null, entry = null) {
    if (!SHIP_CLASSES.includes(cls)) return false;
    const key = 'ship_' + cls, g = GOODS[key];
    const price = purpose ? buyPrice(key, purpose.district, entry ? entry.price : null) : g.base;
    const owned = this.ownedShips[0] || null;
    if (owned && owned.cls === cls) { this.flash(`You already own a ${g.label.toLowerCase()} - it is parked on pad ${owned.padIndex + 1}.`); return false; }
    const tradeIn = owned ? Math.round(owned.price * TRADE_IN_RATIO) : 0;
    const due = Math.max(0, price - tradeIn);
    if (!this.charge(due, `the ${g.label.toLowerCase()}${tradeIn ? ` (trade-in ${tradeIn} cr)` : ''}`, purpose ? purpose.id : null)) return false;
    this.ownedShips = [{ cls, padIndex: PLAYER_PAD, boughtAtDay: this.day(), price }];
    this.stats.bought += 1;
    this.markDirty(); this.persist(true);
    this.toast(`${g.label} purchased - parked on pad ${PLAYER_PAD + 1}`, '#ffd866');
    this.say(`${g.label} purchased for ${this.free ? 'free (creative)' : price + ' cr'}. It is parked on spaceport pad ${PLAYER_PAD + 1}.`);
    if (this.ui.isOpen) this.ui.refresh();
    return true;
  }
  ownedShipSpec() { const s = this.ownedShips[0]; return s ? { cls: s.cls, padIndex: s.padIndex, boughtAtDay: s.boughtAtDay } : null; }
  ownsShip(cls) { return this.ownedShips.some((s) => s.cls === cls); }

  // ------------------------------------------------------------------------------------------------ jobs plumbing
  repairTargets() { return this.jobs.repairTargets(); }
  // Damaged-part positions for a repair job: the ships builder's real spots when available, else points around the pad.
  repairSpots(pad, parts) {
    const ships = this.game.ships;
    if (ships && typeof ships.repairSpots === 'function') {
      try { const r = ships.repairSpots(pad.index, parts); if (Array.isArray(r) && r.length) return r.map((p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) })); } catch (e) { /* fall through */ }
    }
    const out = [];
    for (let i = 0; i < parts; i++) {
      const a = (i / parts) * Math.PI * 2 + 0.4, r = 3 + (i % 2) * 2;
      out.push({ x: Math.floor(pad.x + Math.cos(a) * r), y: (pad.y || DECK_Y) + 1 + (i % 3), z: Math.floor(pad.z + Math.sin(a) * r) });
    }
    return out;
  }
  syncMarkerMeshes(markers) {
    const g = this.markerGroup;
    while (g.children.length) { g.remove(g.children[0]); }
    for (const m of markers) {
      const mesh = new THREE.Mesh(this.markerGeo, this.markerMat);
      mesh.position.set(m.x + 0.5, m.y + 0.5, m.z + 0.5);
      g.add(mesh);
    }
  }
  removeItems(id, n) { return this.game.inventory.remove(id, n); }

  // ------------------------------------------------------------------------------------------------ interaction
  // Right-click hook (game.updateInteraction): repair markers first, then consoles / counters / holo boards / beds
  // inside a purposed lot. Returns true when the click was consumed.
  onUseClick(eye, dir, hit) {
    const maxDist = hit ? hit.dist : 6;
    const mh = this.jobs.raycastMarker(eye, dir, maxDist);
    if (mh) { this.jobs.repair(mh.marker); return true; }
    if (!hit) return false;
    const lot = this.lotAt(hit.x, hit.z, hit.y);
    if (!lot) return false;
    const purpose = this.purposeOfLot(lot);
    const id = hit.id, w = this.game.world;
    const counter = (id === B.STONE_BRICK_SLAB && w.getBlock(hit.x, hit.y - 1, hit.z) === B.PANEL_BLACK) || (id === B.PANEL_BLACK && w.getBlock(hit.x, hit.y + 1, hit.z) === B.STONE_BRICK_SLAB);
    if (id === B.HOLO_SIGN && TERMINAL_KINDS.includes(purpose.kind)) return this.openJobs(lot, purpose);
    if ((id === B.CONSOLE || id === B.HOLO_SIGN || counter) && purpose.sells && purpose.sells.length) return this.openShop(purpose, null);
    if ((id === B.CONSOLE || counter) && TERMINAL_KINDS.includes(purpose.kind)) return this.openJobs(lot, purpose);
    if (BLOCKS[id] && BLOCKS[id].shape === SHAPE.BED) {
      if (this.ownsBedAt(hit.x, hit.y, hit.z)) return this.sleep();
      if (APARTMENT_KINDS.includes(purpose.kind)) { this.say(this.apartment ? `This is not your bed - your room is at ${this.apartment.name}.` : `Rent a room at the lobby counter first (${this.priceOf(purpose, (purpose.sells || []).find((s) => s.item === 'room_night') || { item: 'room_night', price: 60 })} cr a night).`); return true; }
      return false;
    }
    return false;
  }
  onBlockBroken(x, y, z) { this.jobs.onBlockBroken(x, y, z); }

  // ------------------------------------------------------------------------------------------------ tick / save
  tick() {
    this.rollDay();
    this.jobs.tick();
    if (this.v2) {
      const tc = this.game.tickCount | 0;
      // the city advances once a second in batches (rubric 15 #18): never per frame, never every tick
      if (tc % TICK_RATE === 0) {
        this.v2.advance(this.dayTime(), this.game.vehicles ? this.game.vehicles.tickCount / TICK_RATE : 0);
        if ((this.game.time || 0) - this._v2DirtyAt > 10) { this._v2DirtyAt = this.game.time || 0; this.markDirty(); }
      }
      if (!this.crates && this.game.vehicles && this.game.scene && this.game.atlas) this.crates = this.game.vehicles.add(new CrateLayer(this.game, this));
    }
    if (this.markerGroup.children.length) {
      const s = 1 + 0.18 * Math.sin(this.game.time * 6);
      for (const m of this.markerGroup.children) { m.scale.setScalar(s); m.rotation.y = this.game.time * 1.5; }
    }
  }
  markDirty() { this.dirty = true; }
  // Called from game.persistState() (1 Hz autosave + page hide): writes the blob only when something changed.
  persist(now = false) {
    if (!this.game.save) return;
    if (this.dirty || now) { this.game.save.setEconomy(this.serialize()); this.dirty = false; }
    if (now) this.game.save.flush();
  }
  serialize() {
    return {
      credits: this.credits, day: this.day(), stock: this.stock.serialize(), ownedShips: this.ownedShips, apartment: this.apartment,
      job: this.jobs.serialize(), stats: this.stats, v2: this.v2 ? this.v2.serialize() : undefined,
    };
  }
  restore(data) {
    if (!data || typeof data !== 'object') return;
    if (typeof data.credits === 'number') this.game.player.credits = Math.max(0, data.credits | 0);
    // the world's day counter lives in the sky and is not saved elsewhere: restore it so rent, job expiry and the
    // daily restock continue from the day the player left (the clock's time of day still comes from the URL / dawn)
    if (typeof data.day === 'number' && this.game.sky && this.game.sky.day < data.day) this.game.sky.day = data.day | 0;
    this.stock.restore(data.stock);
    this.ownedShips = Array.isArray(data.ownedShips) ? data.ownedShips.filter((s) => s && SHIP_CLASSES.includes(s.cls)).map((s) => ({ cls: s.cls, padIndex: s.padIndex | 0, boughtAtDay: s.boughtAtDay | 0, price: s.price || GOODS['ship_' + s.cls].base })) : [];
    this.apartment = data.apartment && typeof data.apartment.lotId === 'number' ? data.apartment : null;
    if (data.stats && typeof data.stats === 'object') this.stats = { ...this.stats, ...data.stats };
    this.jobs.restore(data.job);
    if (this.v2 && data.v2) this.v2.restore(data.v2);
  }

  // ------------------------------------------------------------------------------------------------ v2 read API
  business(lotId) { const b = this.v2 ? this.v2.business(lotId) : null; return b ? b.toJSON() : null; }
  shipments(includeRecent = false) { return this.v2 ? this.v2.list(includeRecent) : []; }
  get ledger() {
    const v = this.v2; if (!v) return null;
    const T = v.journal.totals;
    return { sources: { ...T.sources }, sinks: { ...T.sinks }, sourceSum: T.sourceSum, sinkSum: T.sinkSum, net: v.journal.net(), count: T.entries, internal: T.internal, entries: (n = 50, filter = null) => v.journal.recent(n, filter), day: (d = v.day()) => v.journal.daySummary(d), wealth: () => v.wealth(), has: (key) => v.journal.has(key) };
  }
  transfer(t) { return this.v2 ? this.v2.transfer(t) : 'disabled'; }
  detain(id, reason) { return this.v2 ? this.v2.detain(id, reason) : false; }
  release(id) { return this.v2 ? this.v2.release(id) : false; }
  menuFor(lotId) { return this.v2 ? this.v2.menuFor(lotId) : null; }
  waitingFor(lotId) { return this.v2 ? this.v2.waitingFor(lotId) : null; }
  holdFor(shipIndex) { return this.v2 ? this.v2.holdFor(shipIndex) : null; }
  noticeFor(district) { return this.v2 ? this.v2.noticeFor(district) : { district, items: [], text: '' }; }
  repairBerths() { return this.v2 ? this.v2.repairBerths() : { total: 0, available: 0, waiting: [] }; }
  serviceLevel(lotId) { return this.v2 ? this.v2.serviceLevel(lotId) : null; }
  // a finished ship-repair job uses one machine part at the nearest workshop that has one (maintenance sink)
  onRepairDone(pad) {
    const v = this.v2; if (!v) return null;
    const shops = v.businesses.filter((b) => b.role === 'workshop' && b.available('parts') > 0).sort((a, c) => Math.hypot(a.pos.x - pad.x, a.pos.z - pad.z) - Math.hypot(c.pos.x - pad.x, c.pos.z - pad.z));
    if (!shops.length) return null;
    v.transfer({ from: shops[0].id, to: 'void', good: 'parts', qty: 1, reason: 'repair' });
    return shops[0].id;
  }
  // one object for the admin panel's Economy section
  cityReport() { const v = this.v2; if (!v) return null; const s = v.summary(); return { ...s, crates: this.crates ? { ...this.crates.stats } : null, notices: [...v.notices.keys()].map((d) => v.noticeFor(d)), uptime: v.uptime(), days: v.stats.days.slice(-7), today: { meals: v.stats.meals, unmetMeals: v.stats.unmetMeals, treatments: v.stats.treatments, delivered: v.stats.delivered, created: v.stats.created, imports: v.stats.imports, unloads: v.stats.unloads } }; }

  // Summary for the wallet line of the shop screen and for tests.
  summary() {
    const a = this.apartment;
    return { credits: this.credits, mode: this.game.mode, ships: this.ownedShips.map((s) => `${GOODS['ship_' + s.cls].label} (pad ${s.padIndex + 1})`), apartment: a ? `${a.name}, paid through day ${a.paidUntilDay}` : null, job: this.jobs.status(), stats: this.stats, day: this.day() };
  }
}

export { goodLabel };
