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
import * as THREE from 'three';
import { B, BLOCKS, SHAPE } from '../blocks.js';
import { displayName } from '../items.js';
import { LEVELS } from '../coruscant/layout.js';
import { purposeFor, allPurposes, isOpen } from '../coruscant/purposes.js';
import { SPACEPORT, DECK_Y } from '../coruscant/spaceport.js';
import { blueprintFor } from '../coruscant/buildings.js';
import { GOODS, SHIP_CLASSES, buyPrice, vendorSellPrice } from './prices.js';
import { JobBoard, TERMINAL_KINDS, goodLabel } from './jobs.js';
import { StockLedger } from './stock.js';
import { ShopUI } from '../ui/shop.js';

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
    this.restore(game.save ? game.save.economy : null);
  }

  // ------------------------------------------------------------------------------------------------ wallet
  get credits() { return this.game.player.credits | 0; }
  set credits(v) { this.game.player.credits = Math.max(0, Math.round(v)) | 0; this.markDirty(); }
  // creative mode shows prices but never charges (rubric 08 #8)
  get free() { return this.game.mode === 'creative'; }
  canAfford(n) { return this.free || this.credits >= n; }
  charge(n, why = '') {
    if (n <= 0) return true;
    if (!this.canAfford(n)) { this.flash(`Not enough credits: ${n} needed, you have ${this.credits}.`); return false; }
    if (!this.free) { this.credits -= n; this.stats.spent += n; }
    if (why) this.flash(`${this.free ? 'Creative: no charge for' : `Paid ${n} cr for`} ${why}.`);
    return true;
  }
  earn(n, why = '') {
    if (n <= 0) return;
    this.credits += n;
    this.stats.earned += n;
    this.toast(`+${n} cr${why ? ' - ' + why : ''}`, '#ffd866');
    if (this.game.audio) this.game.audio.pop();
  }
  grant(n) { this.credits += n; this.say(`${n} credits added to your wallet.`); this.toast(`+${n} cr - administrator grant`, '#ffd866'); }
  // Admin "Reset economy": wallet, stock, ownership, housing, jobs and stats back to a fresh world.
  reset() {
    this.credits = START_CREDITS;
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
  stockOf(lotId, entry) { this.rollDay(); return this.stock.stockOf(lotId, entry); }
  takeStock(lotId, entry, n) { this.rollDay(); const k = this.stock.take(lotId, entry, n); if (k) this.markDirty(); return k; }
  priceOf(purpose, entry) { return buyPrice(entry.item, purpose.district, entry.price); }

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
  // What the vendor pays for one unit of item `id`, or null when it does not trade the category.
  offerFor(purpose, id) { return vendorSellPrice(purpose, id); }
  // Sells up to n of the player's items to the vendor. Returns the credits received.
  sell(purpose, id, n = 1) {
    const unit = this.offerFor(purpose, id);
    if (unit == null) { this.flash(`${purpose.name} does not buy ${displayName(id)}.`); return 0; }
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

  // ------------------------------------------------------------------------------------------------ services
  buyService(purpose, entry, g, unit) {
    switch (g.service) {
      case 'rent': return this.rent(purpose, unit);
      case 'heal': {
        const p = this.game.player;
        if (p.health >= 20 && p.food >= 20) { this.flash('You are in perfect health already.'); return false; }
        if (!this.charge(unit, 'a bacta shot')) return false;
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
    if (!this.charge(unit, `the ride to ${dest.name}`)) return false;
    this.game.closeScreen();
    this.game.player.teleport(x, y, z);
    this.toast(`Air taxi: ${dest.name}`, '#9ad8ff');
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
    if (!this.charge(unit, same ? 'another night' : `a room at ${purpose.name}`)) return false;
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
      if (!this.charge(unit, 'tonight\u2019s rent')) { this.say('Tonight\u2019s rent is due and you cannot pay. Earn some credits first.'); return true; }
      a.paidUntilDay = day + 1; this.stats.nights += 1;
    }
    const sky = this.game.sky;
    if (sky.time > 0.5) sky.day++;
    sky.time = WAKE_TIME;
    const p = this.game.player;
    p.fallDistance = 0;
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
    if (!this.charge(due, `the ${g.label.toLowerCase()}${tradeIn ? ` (trade-in ${tradeIn} cr)` : ''}`)) return false;
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
      job: this.jobs.serialize(), stats: this.stats,
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
  }

  // Summary for the wallet line of the shop screen and for tests.
  summary() {
    const a = this.apartment;
    return { credits: this.credits, mode: this.game.mode, ships: this.ownedShips.map((s) => `${GOODS['ship_' + s.cls].label} (pad ${s.padIndex + 1})`), apartment: a ? `${a.name}, paid through day ${a.paidUntilDay}` : null, job: this.jobs.status(), stats: this.stats, day: this.day() };
  }
}

export { goodLabel };
