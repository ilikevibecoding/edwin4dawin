// Persistent people (spec §11, rubric 14 section A): the thirteen cast anchors of roster.js bound to real lots, rooms
// and ships of the generated layout, plus the persistent staff of every purposed lot - the owner/manager and one key
// role - mapped onto the census records W4 already schedules (census.js), so the same person keeps their home, shift
// and haunts. The registry is pure data over the pool: the runtime (index.js) spawns these people like anyone else,
// the dialog API (dialog/api.js) reads their state, relationships, knowledge and history, and the save keeps the
// history under the `cast` key through serialize()/restore(). Deterministic: everything is seeded from the layout
// seed and the person's id; no Math.random anywhere here.
import { activityAt } from '../coruscant/census.js';
import { PORT, portSpots } from '../coruscant/port.js';
import { archetypeOf, VISITOR_JOBS, DROID_ARCHETYPES } from '../coruscant/rooms.js';
import { personName } from '../coruscant/names.js';
import { hash2, RNG } from '../../rng.js';
import { ANCHORS, ANCHOR_IDS, PERSONALITIES, STATES, statesForJob } from './roster.js';

export const SAVE_KEY = 'cast';
export const LOCAL_KEY = 'frontier-craft:cast';
const HOUSING = new Set(['apartments', 'hotel', 'luxury_residences', 'hostel']);
const PORT_CENTRE = { x: 2646, z: 0 };
const PORT_Y = 97;
// who supplies whom when the economy has no supplier list yet (P2's business().suppliers replaces this at runtime)
const SUPPLY = {
  diner: ['grocery', 'butcher', 'market_stall'], caf: ['bakery', 'grocery'], noodle_bar: ['grocery', 'market_stall'], restaurant: ['butcher', 'grocery'], bakery: ['grocery', 'market_stall'],
  butcher: ['market_stall', 'warehouse'], grocery: ['market_stall', 'warehouse'], cantina: ['grocery', 'warehouse'], market_stall: ['warehouse', 'depot'],
  repair_shop: ['electronics', 'hardware_store'], hangar: ['electronics', 'repair_shop'], droid_shop: ['droid_factory', 'electronics'], droid_factory: ['electronics', 'foundry'],
  electronics: ['droid_factory', 'warehouse'], hardware_store: ['foundry', 'warehouse'], general_store: ['warehouse', 'depot'], furniture_store: ['warehouse', 'hardware_store'],
  clinic: ['pharmacy', 'bacta_ward'], bacta_ward: ['pharmacy'], cybernetics_clinic: ['electronics', 'pharmacy'], pharmacy: ['warehouse', 'depot'],
  power_plant: ['refinery', 'electronics'], refinery: ['depot', 'warehouse'], foundry: ['recycling_plant', 'depot'], recycling_plant: ['depot', 'warehouse'], warehouse: ['depot'], depot: ['warehouse', 'customs'],
  tailor: ['warehouse', 'general_store'], jeweler: ['warehouse'], armorer: ['foundry', 'electronics'], garden_shop: ['grocery', 'warehouse'], bookshop: ['warehouse'],
  hotel: ['grocery', 'laundry'], apartments: ['hardware_store', 'general_store'], luxury_residences: ['restaurant', 'general_store'], hostel: ['bakery', 'general_store'],
  casino: ['cantina', 'bank'], night_club: ['cantina', 'warehouse'], holo_arcade: ['electronics'], bathhouse: ['power_plant'], gym: ['general_store'],
  transit_station: ['power_plant', 'repair_shop'], taxi_stand: ['repair_shop', 'refinery'], parking_garage: ['repair_shop'], speeder_dealer: ['repair_shop', 'electronics'], ship_dealer: ['repair_shop', 'hangar'],
  bank: ['tech_firm'], office: ['tech_firm', 'caf'], insurance: ['law_office'], tech_firm: ['electronics'], law_office: ['archive', 'licensing_office'], advertising_agency: ['tech_firm'],
  school: ['bookshop', 'bakery'], university: ['bookshop', 'archive'], museum: ['art_gallery'], art_gallery: ['tailor'], order_house: ['garden_shop'], shrine: ['garden_shop'],
  security_station: ['armorer'], guard_barracks: ['armorer', 'caf'], private_security: ['armorer'], customs: ['depot'], courthouse: ['archive'], ministry: ['archive', 'caf'], embassy: ['restaurant'],
  licensing_office: ['archive'], tax_office: ['bank'], archive: ['tech_firm'], temple_annex: ['garden_shop'],
};
const JOB_PERSONALITY = {
  guard: ['gruff', 'formal', 'brisk'], 'security officer': ['gruff', 'formal', 'brisk'], 'senate guard': ['formal', 'gruff'], 'customs officer': ['formal', 'brisk', 'gruff'], officer: ['formal', 'gruff'], warden: ['gruff', 'formal'],
  medic: ['formal', 'warm', 'brisk'], nurse: ['warm', 'brisk'], pharmacist: ['formal', 'warm'], surgeon: ['formal', 'brisk'],
  cook: ['warm', 'gruff', 'brisk'], server: ['warm', 'brisk', 'wry'], barista: ['warm', 'wry'], bartender: ['wry', 'warm', 'gruff'], vendor: ['warm', 'brisk', 'wry'], shopkeeper: ['warm', 'wry', 'formal'],
  clerk: ['formal', 'anxious', 'wry'], teller: ['formal', 'brisk'], advocate: ['formal', 'wry'], executive: ['formal', 'brisk'], receptionist: ['warm', 'formal', 'brisk'], concierge: ['formal', 'warm'],
  mechanic: ['gruff', 'wry', 'brisk'], technician: ['wry', 'anxious', 'brisk'], engineer: ['formal', 'wry'], foreman: ['gruff', 'brisk'], 'dock worker': ['gruff', 'wry'], operator: ['brisk', 'anxious'],
  senator: ['formal', 'warm'], aide: ['anxious', 'formal', 'brisk'], jedi: ['wry', 'formal'], acolyte: ['formal', 'anxious'], courier: ['brisk', 'warm', 'wry'], gardener: ['warm', 'wry'],
  teacher: ['warm', 'formal'], archivist: ['formal', 'wry'], librarian: ['formal', 'warm'], musician: ['wry', 'warm'], dj: ['wry', 'brisk'], attendant: ['brisk', 'warm'], conductor: ['brisk', 'gruff'],
  'protocol droid': ['formal'], astromech: ['formal', 'brisk'], 'maintenance droid': ['formal'], 'waitress droid': ['formal', 'warm'], 'cargo droid': ['formal'], 'scrap droid': ['formal'],
};
const TRADE_OF_CATEGORY = { food: 'food', retail: 'retail', office: 'office', government: 'civic', security: 'security', medical: 'medical', industry: 'industry', transport: 'transport', housing: 'hospitality', hospitality: 'hospitality', leisure: 'leisure', culture: 'leisure', education: 'learning', religion: 'learning' };
const TRADE_OF_KIND = { customs: 'civic', ministry: 'civic', courthouse: 'civic', embassy: 'civic', archive: 'office', licensing_office: 'civic', tax_office: 'civic', transit_station: 'transport', taxi_stand: 'transport', parking_garage: 'transport', speeder_dealer: 'retail', ship_dealer: 'retail', cantina: 'food', casino: 'leisure', night_club: 'leisure', holo_arcade: 'leisure', gym: 'leisure', bathhouse: 'leisure', museum: 'leisure', art_gallery: 'leisure', school: 'learning', university: 'learning', order_house: 'learning', shrine: 'learning', temple_annex: 'learning', power_plant: 'industry', recycling_plant: 'industry', hangar: 'industry', repair_shop: 'industry', depot: 'industry', warehouse: 'industry' };
const FAMILY = ['mother', 'father', 'brother', 'sister', 'partner', 'daughter', 'son', 'aunt', 'uncle', 'grandmother'];
export const DISTRICT_NAME = { senate: 'the Senate District', financial: 'the Federal District', residential: 'Skyline Heights', industrial: 'the Works', entertainment: 'the Uscru strip', market: 'CoCo Town', spaceport: 'Westport' };

const centre = (lot) => ({ x: lot.x0 + lot.w / 2, z: lot.z0 + lot.d / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const surnameOf = (name) => { const parts = name.replace(/^(Dr|Nurse|Director|Lt|Inspector|Foreman|Cmdr|Padawan|Master|Magistrate|Senator|Vice Chair)\s+/, '').split(' '); return parts[parts.length - 1]; };
const defaultHistory = () => ({ firstMet: null, talks: 0, jobs: 0, favours: 0, offences: 0, lastTalkAt: null, asked: {} });

export class CastRegistry {
  // layout: the city layout; pool: buildPool(layout) (or the population's pool); lots: a LotCache (rooms of the
  // blueprints); opts.game: the game (economy / events / ships / senate / factions are read when present)
  constructor(layout, pool, lots, opts = {}) {
    this.layout = layout; this.pool = pool; this.lots = lots; this.game = opts.game || null; this.pop = opts.pop || null;
    this.seed = layout.seed | 0;
    this.people = new Map();      // id -> persistent person
    this.anchors = new Map();     // cast id -> persistent person
    this.byPerson = new Map();    // census person id -> persistent person
    this.lotRoles = new Map();    // lot id -> { owner, key }
    this.purposeOf = new Map(pool.purposed.map(({ lot, purpose }) => [lot.id, purpose]));
    this.lotOf = new Map(pool.purposed.map(({ lot }) => [lot.id, lot]));
    this.plazas = layout.lots.filter((l) => l.kind === 'plaza');
    this.now = 0;                 // seconds of game time (advanced by the runtime)
    this.dirty = false; this.persistTimer = null;
    this.stats = { anchors: 0, staff: 0, total: 0, lotsStaffed: 0, relationships: 0, adopted: 0, created: 0 };
    this.bindAnchors();
    this.bindStaff();
    this.linkRelationships();
    this.stats.total = this.people.size;
  }

  // ------------------------------------------------------------------------------------------------ lookups
  get(id) { return this.people.get(id) || this.anchors.get(id) || null; }
  list(filter = null) { const out = [...this.people.values()]; return filter ? out.filter(filter) : out; }
  forPerson(person) { return person ? (person.cast ? this.anchors.get(person.cast) : this.byPerson.get(person.id)) || null : null; }
  isPersistent(person) { return !!this.forPerson(person); }
  hour() { const g = this.game; if (this.pop) return this.pop.hour; if (g && g.sky) return (g.sky.time * 24) % 24; return 12; }
  lotName(lotId) { if (lotId === PORT) return 'Westport'; const pu = this.purposeOf.get(lotId); if (pu) return pu.name; const l = this.layout.lots[lotId]; return l ? (l.name || `lot ${lotId}`) : 'the street'; }
  districtOf(lotId) { if (lotId === PORT) return 'spaceport'; const l = this.layout.lots[lotId]; return l ? l.district : null; }
  // where a person is: the live citizen's position, else the centre of the place their schedule puts them
  positionOf(pp, hour = this.hour()) {
    const npc = this.pop ? this.pop.liveByPerson.get(pp.person.id) : null;
    if (npc && !npc.dead) return { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z, live: true };
    const a = activityAt(pp.person, hour);
    if (a.lot === PORT) return { x: PORT_CENTRE.x, y: PORT_Y, z: PORT_CENTRE.z, live: false, lot: PORT };
    const lot = a.lot != null ? this.layout.lots[a.lot] : null;
    if (!lot) return null;
    const c = centre(lot);
    return { x: c.x, y: pp.room && a.act === 'work' ? pp.room.y : 61, z: c.z, live: false, lot: lot.id };
  }
  nearby(pos, r = 32) {
    const out = [];
    for (const pp of this.people.values()) {
      const p = this.positionOf(pp);
      if (!p) continue;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d <= r) out.push({ id: pp.id, name: pp.name, dist: +d.toFixed(1), live: p.live, x: p.x, y: p.y, z: p.z, state: this.stateOf(pp) });
    }
    return out.sort((a, b) => a.dist - b.dist);
  }

  // ------------------------------------------------------------------------------------------------ anchors
  bindAnchors() {
    const resolved = new Map();   // anchor id -> { work, home, meal, leisure }
    let pending = ANCHORS.slice();
    for (let pass = 0; pass < 6 && pending.length; pass++) {
      const next = [];
      for (const a of pending) {
        const r = { };
        try {
          r.work = this.resolveLot(a.bind.work, a, r, resolved);
          if (r.work === undefined) throw new Error('defer');
          r.home = this.resolveLot(a.bind.home, a, r, resolved);
          r.meal = a.bind.meal !== undefined ? this.resolveLot(a.bind.meal, a, r, resolved) : this.nearestOfCategory('food', r.work);
          r.leisure = a.bind.leisure !== undefined ? this.resolveLot(a.bind.leisure, a, r, resolved) : this.plazaNear(r.work);
          if ([r.home, r.meal, r.leisure].includes(undefined)) throw new Error('defer');
        } catch (e) { if (e.message === 'defer') { next.push(a); continue; } throw e; }
        resolved.set(a.id, r);
      }
      pending = next;
    }
    if (pending.length) throw new Error('cast: unresolved anchors ' + pending.map((a) => a.id).join(','));
    for (const a of ANCHORS) this.registerAnchor(a, resolved.get(a.id));
    this.stats.anchors = this.anchors.size;
  }
  // A lot reference of roster.js -> lot id | PORT | null; `undefined` means "depends on an anchor not resolved yet"
  resolveLot(ref, anchor, own, resolved) {
    if (ref === undefined || ref === null) return null;
    if (ref === 'port') return PORT;
    if (ref === 'work' || ref === 'home' || ref === 'meal') return own[ref] !== undefined ? own[ref] : undefined;
    if (typeof ref === 'string') {
      const [id, field] = ref.split('.');
      if (id === anchor.id) return own[field];
      const r = resolved.get(id);
      return r ? r[field] : undefined;
    }
    if (ref.sameAs !== undefined) {
      const lot = this.resolveLot(ref.sameAs, anchor, own, resolved);
      if (lot === undefined) return undefined;
      if (lot !== null && lot !== PORT && (!ref.requireRoom || this.hasRoom(lot, ref.requireRoom))) return lot;
      return ref.fallback ? this.resolveLot(ref.fallback, anchor, own, resolved) : lot;
    }
    if (ref.landmark) { const l = this.layout.lots.find((x) => x.kind === 'landmark' && x.family === ref.landmark); return l ? l.id : null; }
    if (ref.housingNear) {
      const at = ref.housingNear === 'port' ? PORT_CENTRE : this.centreOf(own.work);
      if (!at) return undefined;
      // plain apartments first: a mechanic does not live in a spire unless nothing else is near
      const penalty = { apartments: 0, hostel: 40, hotel: 70, luxury_residences: 90 };
      let best = null, bd = Infinity;
      for (const p of this.pool.purposed) {
        if (p.lot.id === own.work || !HOUSING.has(p.purpose.kind)) continue;
        const d = dist(centre(p.lot), at) + penalty[p.purpose.kind];
        if (d < bd) { bd = d; best = p.lot.id; }
      }
      return best;
    }
    if (ref.kind) {
      let cands = this.pool.purposed.filter((p) => p.purpose.kind === ref.kind && (!ref.district || p.lot.district === ref.district) && (!ref.hasRoom || this.hasRoom(p.lot.id, ref.hasRoom)));
      if (!cands.length && ref.fallback) return this.resolveLot(ref.fallback, anchor, own, resolved);
      if (!cands.length) return null;
      if (ref.prefer) { const pref = cands.filter((p) => ref.prefer.test(p.purpose.name)); if (pref.length) cands = pref; }
      if (ref.near !== undefined && cands.length > 1) {
        const nearLot = ref.near === 'port' ? PORT : this.resolveLot(ref.near, anchor, own, resolved);
        if (nearLot === undefined) return undefined;
        const at = nearLot === PORT ? PORT_CENTRE : this.centreOf(nearLot);
        if (at) cands.sort((p, q) => dist(centre(p.lot), at) - dist(centre(q.lot), at));
      }
      return cands[0].lot.id;
    }
    throw new Error('cast: bad lot ref ' + JSON.stringify(ref));
  }
  hasRoom(lotId, re) { const li = this.lots.get(lotId); return !!li && li.meta.rooms.some((r) => re.test(r.kind)); }
  centreOf(lotId) { if (lotId === PORT) return PORT_CENTRE; const l = lotId != null ? this.layout.lots[lotId] : null; return l ? centre(l) : null; }
  nearestLot(pred, at, not = null) {
    let best = null, bd = Infinity;
    for (const p of this.pool.purposed) { if (p.lot.id === not || !pred(p)) continue; const d = dist(centre(p.lot), at); if (d < bd) { bd = d; best = p.lot.id; } }
    return best;
  }
  nearestOfCategory(cat, lotId) { const at = this.centreOf(lotId); return at ? this.nearestLot((p) => p.purpose.category === cat, at, lotId) : null; }
  plazaNear(lotId) { const at = this.centreOf(lotId); if (!at || !this.plazas.length) return null; let best = this.plazas[0], bd = Infinity; for (const p of this.plazas) { const d = dist(centre(p), at); if (d < bd) { bd = d; best = p; } } return best.id; }

  registerAnchor(a, r) {
    const district = r.work === PORT ? 'spaceport' : (this.layout.lots[r.work] && this.layout.lots[r.work].district) || 'residential';
    // adopt the census person who already holds this job at the lot (the diner's own cook), else create one
    let person = null;
    if (r.work !== PORT) {
      const cands = (this.pool.byLot.get(r.work) || []).filter((p) => p.work === r.work && p.job === a.job && !p.street && !p.roomStaff && !p.cast && !p.visitor).sort((x, y) => x.slot - y.slot);
      person = cands[0] || null;
    }
    if (person) this.stats.adopted++;
    else { person = this.newPerson(a, r.work, district); this.stats.created++; }
    Object.assign(person, {
      name: a.name, female: !!a.female, droid: !!a.droid, cast: a.id, home: r.home, meal: r.meal, leisure: r.leisure,
      plaza: r.work === PORT ? PORT : this.plazaNear(r.work), shift: a.shift || 'day', offset: a.offset || 0, visitor: false, street: false,
    });
    if (r.work === PORT) { person.port = true; person.work = PORT; }
    if (a.droid) person.archetype = a.appearance.archetype === 'protocol_droid' ? 'protocol droid' : 'astromech';
    // the room in the work lot (the first preferred kind with a place for the job)
    let room = null;
    if (r.work !== PORT && a.bind.roomPrefs) room = this.bindRoom(person, r.work, a.bind.roomPrefs);
    const ship = a.bind.ship ? { model: a.bind.ship.model, pad: a.bind.ship.pad, padNumber: a.bind.ship.pad + 1 } : null;
    const pp = this.makeRecord({
      id: 'cast:' + a.id, castId: a.id, kind: 'cast', person, name: a.name, title: a.title || '', job: a.job, roleTag: 'anchor', trade: a.trade,
      personality: a.personality, states: a.states, needs: a.needs.slice(), knows: { ...a.knows, business: a.knows.business === 'work' ? r.work : (a.knows.business ?? null) },
      room, ship, spot: a.bind.spot || null, delegation: a.bind.delegation ?? null, voice: a.voice, appearance: a.appearance, relSpecs: a.relationships,
    });
    this.anchors.set(a.id, pp);
    this.people.set(pp.id, pp);
    this.byPerson.set(person.id, pp);
  }
  newPerson(a, workLot, district) {
    const key = Math.floor(hash2(this.seed + 707, a.id.length * 131 + a.id.charCodeAt(0) * 7 + a.id.charCodeAt(a.id.length - 1), 0x5eed) * 0x7fffffff) >>> 0;
    const rng = new RNG(key);
    const archetype = a.droid ? 'astromech' : archetypeOf(a.job, district);
    const person = {
      key, name: a.name, female: !!a.female, job: a.job, archetype, droid: !!a.droid, variant: Math.floor(rng.next() * 8), scale: 1,
      district, work: workLot, workRooms: null, home: null, meal: null, leisure: null, plaza: null, shift: a.shift || 'day', offset: a.offset || 0,
      mealShift: +(rng.next() * 1.5).toFixed(2), visitor: false, street: false, slot: 900 + ANCHOR_IDS.indexOf(a.id), port: workLot === PORT,
    };
    person.id = this.pool.people.length;
    this.pool.people.push(person);
    if (!this.pool.byLot.has(workLot)) this.pool.byLot.set(workLot, []);
    this.pool.byLot.get(workLot).push(person);
    return person;
  }
  // Bind `person` to the first room of a preferred kind that has a place for their job; returns the room record
  bindRoom(person, lotId, prefs) {
    const li = this.lots.get(lotId);
    if (!li) return null;
    for (const kind of prefs) {
      for (let i = 0; i < li.meta.rooms.length; i++) {
        const r = li.meta.rooms[i];
        if (r.kind !== kind) continue;
        const c = li.roomCandidates(person, 'work', r);
        if (!c || !c.length) continue;
        const room = { index: i, kind: r.kind, x: r.x, y: r.y, z: r.z, w: r.w, d: r.d, lot: lotId };
        person.room = room; person.roomStaff = true; person.workRooms = [r.kind];
        return room;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------------------------------------ staff
  bindStaff() {
    for (const { lot, purpose } of this.pool.purposed) {
      const roles = [];
      let slot = 0;
      for (const role of purpose.roles) { roles.push({ job: role.job, count: role.count, first: slot }); slot += role.count; }
      const staff = (this.pool.byLot.get(lot.id) || []).filter((p) => p.work === lot.id && !p.street && !p.roomStaff && !p.visitor);
      const at = (role, k) => staff.find((p) => p.slot === role.first + k) || null;
      const isDroid = (job) => DROID_ARCHETYPES.has(archetypeOf(job, lot.district));
      const workers = roles.filter((r) => !VISITOR_JOBS.has(r.job) && r.job !== 'lodger');
      const ownerRole = workers.find((r) => !isDroid(r.job)) || workers[0];
      if (!ownerRole) continue;
      const owner = at(ownerRole, 0);
      let keyRole = workers.find((r) => r !== ownerRole && !isDroid(r.job)) || null;
      let key = keyRole ? at(keyRole, 0) : (ownerRole.count > 1 ? at(ownerRole, 1) : null);
      if (!key) { const d = workers.find((r) => r !== ownerRole); key = d ? at(d, 0) : null; }
      const entry = { owner: null, key: null };
      if (owner) entry.owner = this.registerStaff(owner, lot, purpose, 'owner');
      if (key && key !== owner) entry.key = this.registerStaff(key, lot, purpose, 'key');
      if (entry.owner || entry.key) { this.lotRoles.set(lot.id, entry); this.stats.lotsStaffed++; }
    }
    this.stats.staff = this.people.size - this.anchors.size;
  }
  registerStaff(person, lot, purpose, roleTag) {
    if (person.cast) { const pp = this.anchors.get(person.cast); pp.roleTag = roleTag; return pp; }
    const existing = this.byPerson.get(person.id);
    if (existing) return existing;
    const id = `lot:${lot.id}:${person.job.replace(/\s+/g, '_')}:${person.slot}`;
    const trade = TRADE_OF_KIND[purpose.kind] || TRADE_OF_CATEGORY[purpose.category] || 'office';
    const h = hash2(person.key & 0xffff, person.key >>> 16, 0xd15);
    const prefs = JOB_PERSONALITY[person.job] || PERSONALITIES;
    const pp = this.makeRecord({
      id, castId: null, kind: 'staff', person, name: person.name, title: '', job: person.job, roleTag, trade,
      personality: prefs[Math.floor(h * prefs.length) % prefs.length], states: statesForJob(person.job, purpose.category),
      needs: needsFor(trade, person.job), knows: { district: lot.district, business: lot.id, broadcasts: ['senate:result', 'disaster'] },
      room: person.room || null, ship: null, spot: null, delegation: null, voice: null, appearance: null, relSpecs: [],
    });
    this.people.set(id, pp);
    this.byPerson.set(person.id, pp);
    return pp;
  }
  makeRecord(f) {
    const p = f.person;
    const h = (salt) => hash2(p.key & 0xffff, (p.key >>> 16) ^ salt, 0x9e3);
    const disposition = { warmth: +h(1).toFixed(2), patience: +h(2).toFixed(2), suspicion: +h(3).toFixed(2), humour: +h(4).toFixed(2), personality: f.personality };
    const homeName = this.lotName(p.home);
    const family = p.droid ? null : this.familyOf(p);
    return {
      id: f.id, castId: f.castId, kind: f.kind, person: p, personId: p.id, name: f.name, title: f.title, job: f.job, roleTag: f.roleTag, trade: f.trade,
      seed: p.key, female: p.female, droid: p.droid, species: f.appearance ? f.appearance.species || (p.droid ? 'droid' : 'human') : (p.droid ? 'droid' : null),
      appearance: f.appearance, voice: f.voice,
      lot: { work: p.work, home: p.home, meal: p.meal, leisure: p.leisure }, workName: this.lotName(p.work), homeName, district: p.district, homeDistrict: this.districtOf(p.home),
      room: f.room, ship: f.ship, spot: f.spot, delegation: f.delegation,
      shift: p.shift, personality: f.personality, disposition, states: f.states, needs: f.needs, knows: f.knows, family,
      relationships: [], relSpecs: f.relSpecs, history: defaultHistory(), recent: [], fledAt: -Infinity,
    };
  }
  familyOf(p) {
    const rng = new RNG((p.key ^ 0xfa11) >>> 0);
    const relation = FAMILY[Math.floor(rng.next() * FAMILY.length)];
    const female = /mother|sister|daughter|aunt|grandmother|partner/.test(relation) ? relation !== 'partner' || rng.next() < 0.5 : false;
    const given = personName(rng, female).split(' ')[0];
    return { relation, name: `${given} ${surnameOf(p.name)}`, lot: p.home, lotName: this.lotName(p.home) };
  }

  // ------------------------------------------------------------------------------------------------ relationships
  linkRelationships() {
    const link = (a, b, kind, label, back) => {
      if (!a || !b || a === b) return false;
      if (a.relationships.some((r) => r.id === b.id)) return false;   // one edge per pair; the first author wins
      a.relationships.push({ id: b.id, name: b.name, kind, label });
      b.relationships.push({ id: a.id, name: a.name, kind: REVERSE[kind] || kind, label: back });
      this.stats.relationships++;
      return true;
    };
    // 1. the cast's authored edges
    for (const pp of this.anchors.values()) {
      for (const spec of pp.relSpecs) {
        const other = this.resolveRelTarget(spec.to, pp);
        if (!other) continue;
        if (spec.to && spec.to.rename && other.kind === 'staff') { other.name = spec.to.rename; other.person.name = spec.to.rename; other.female = other.person.female = /^(Hessa)/.test(spec.to.rename); }
        if (!link(pp, other, spec.kind, spec.label, spec.back)) continue;
        if (spec.mealHere && other.person) { other.person.meal = pp.lot.work; other.lot.meal = pp.lot.work; }
        if (spec.kind === 'family') {
          const rel = spec.label.replace(/^my\s+/, ''), backRel = spec.back.replace(/^my\s+/, '');
          pp.family = { relation: rel, name: other.name, lot: other.lot.home, lotName: other.homeName };
          other.family = { relation: backRel, name: pp.name, lot: pp.lot.home, lotName: pp.homeName };
        }
      }
    }
    // 2. staff: coworkers, supplier <-> customer, neighbour, a regular
    const business = this.game && this.game.economy && typeof this.game.economy.business === 'function' ? (id) => { try { return this.game.economy.business(id); } catch (e) { return null; } } : null;
    for (const [lotId, roles] of this.lotRoles) {
      const owner = roles.owner || roles.key;
      if (!owner) continue;
      if (roles.owner && roles.key) link(roles.owner, roles.key, 'coworker', `${roles.key.job} at ${owner.workName}`, `the ${roles.owner.job} who runs ${owner.workName}`);
      const pu = this.purposeOf.get(lotId);
      let supplierLots = null;
      if (business) { const b = business(lotId); if (b && Array.isArray(b.suppliers) && b.suppliers.length) supplierLots = b.suppliers.slice(0, 2); }
      if (!supplierLots) {
        const kinds = SUPPLY[pu.kind] || [];
        const at = centre(this.lotOf.get(lotId));
        supplierLots = [];
        for (const k of kinds) { const s = this.nearestLot((p) => p.purpose.kind === k, at, lotId); if (s != null) { supplierLots.push(s); break; } }
      }
      for (const s of supplierLots) {
        const sup = this.lotRoles.get(s);
        const so = sup ? (sup.owner || sup.key) : null;
        if (so) link(owner, so, 'supplier', `${so.name} at ${so.workName}, who supplies us`, `${owner.name} at ${owner.workName}, a customer`);
      }
    }
    for (const pp of this.people.values()) {
      if (pp.relationships.some((r) => r.kind === 'neighbour')) continue;
      const home = pp.lot.home;
      if (home == null || home === PORT) continue;
      const n = [...this.people.values()].find((q) => q !== pp && q.lot.home === home && !q.relationships.some((r) => r.kind === 'neighbour'));
      if (n) link(pp, n, 'neighbour', `${n.name}, my neighbour at ${pp.homeName}`, `${pp.name}, my neighbour at ${pp.homeName}`);
    }
    for (const [lotId, roles] of this.lotRoles) {
      const owner = roles.owner || roles.key;
      const pu = this.purposeOf.get(lotId);
      if (!owner || (pu.category !== 'food' && pu.category !== 'retail' && pu.category !== 'hospitality')) continue;
      if (owner.relationships.some((r) => r.kind === 'regular')) continue;
      const reg = [...this.people.values()].find((q) => q !== owner && q.lot.work !== lotId && (q.lot.meal === lotId || q.lot.leisure === lotId));
      if (reg) link(owner, reg, 'regular', `${reg.name}, a regular from ${reg.workName}`, `${owner.name} at ${owner.workName}, where I go`);
    }
    // 3. family edges when two persistent people share a home lot and a surname
    for (const pp of this.people.values()) {
      if (pp.droid || pp.relationships.some((r) => r.kind === 'family')) continue;
      const s = surnameOf(pp.name);
      const kin = [...this.people.values()].find((q) => q !== pp && !q.droid && q.lot.home === pp.lot.home && surnameOf(q.name) === s);
      if (kin) link(pp, kin, 'family', `${kin.name}, family, at home in ${pp.homeName}`, `${pp.name}, family, at home in ${pp.homeName}`);
    }
  }
  resolveRelTarget(to, from) {
    if (typeof to === 'string') return this.anchors.get(to) || null;
    if (!to || !to.lot) return null;
    let lotId;
    if (typeof to.lot === 'string') { const [id, field] = to.lot.split('.'); const a = this.anchors.get(id); lotId = a ? a.lot[field] : null; }
    else if (to.lot.landmark) { const l = this.layout.lots.find((x) => x.kind === 'landmark' && x.family === to.lot.landmark); lotId = l ? l.id : null; }
    else if (to.lot.kind) { const at = to.lot.near ? this.centreOf(from.lot[to.lot.near] ?? from.lot.work) : this.centreOf(from.lot.work); lotId = this.nearestLot((p) => p.purpose.kind === to.lot.kind, at || PORT_CENTRE, from.lot.work); }
    if (lotId == null || lotId === PORT) return null;
    const roles = this.lotRoles.get(lotId);
    if (!roles) return null;
    let pick = to.role === 'key' ? (roles.key || roles.owner) : (roles.owner || roles.key);
    if (to.rename && pick && pick.droid) pick = pick === roles.key ? roles.owner : roles.key;   // a droid is nobody's mother
    return pick && pick !== from ? pick : (roles.key !== from ? roles.key : roles.owner) || null;
  }

  // ------------------------------------------------------------------------------------------------ state (§11)
  // The one behaviour state a person is in right now, from the live citizen when spawned, else from the schedule.
  // `ctx` (optional) carries the dialog context's resource facts: waiting-for-resources needs a real shortage.
  stateOf(pp, hour = this.hour(), ctx = null) {
    const allowed = pp.states;
    const pick = (s, fb) => (allowed.includes(s) ? s : fb);
    const npc = this.pop ? this.pop.liveByPerson.get(pp.person.id) : null;
    let act;
    if (npc && !npc.dead) {
      if (npc.panic) return pick('fleeing', 'commuting');
      if (npc.talkingT > 0 || (this.pop.talkBox && this.pop.talkBox.npc === npc)) return pick('conversing', 'resting');
      if (npc.state === 'walk' || npc.state === 'lift' || npc.state === 'hop' || (npc.state === 'wait' && npc.legs)) return 'commuting';
      if (this.now - pp.fledAt < 120) return pick('recovering', 'resting');
      act = npc.act;
    } else act = activityAt(pp.person, hour).act;
    if (act === 'sleep') return pick('sleeping', 'resting');
    if (act === 'meal') return pick('eating', 'resting');
    if (act === 'home' || act === 'leisure' || act === 'shelter') return 'resting';
    // at work
    if (ctx && (ctx.shortage || ctx.waiting) && allowed.includes('waiting-for-resources')) return 'waiting-for-resources';
    if (ctx && ctx.investigating && allowed.includes('investigating')) return 'investigating';
    if (allowed.includes('serving') && npc && this.pop && this.pop.player) { const p = this.pop.player.pos; if ((npc.pos.x - p.x) ** 2 + (npc.pos.z - p.z) ** 2 < 36) return 'serving'; }
    return pick('working', 'resting');
  }
  onFled(pp) { pp.fledAt = this.now; }

  // ------------------------------------------------------------------------------------------------ spots for anchors
  // The dockmaster works the port control desk, the captain her own pad: a spot the planner would not pick by hash.
  resolveSpot(npc, act, lotId, rng, within) {
    const pp = this.forPerson(npc.person);
    if (!pp || pp.kind !== 'cast' || lotId !== PORT || act !== 'work') return null;
    let cands = null;
    if (pp.spot === 'pad' && pp.ship) cands = portSpots(pp.job, 'work').filter((s) => s.pad === pp.ship.pad);
    else if (pp.spot === 'control') cands = portSpots('deck officer', 'work');
    if (!cands || !cands.length) return null;
    for (const s of cands) {
      const key = 'p' + s.x + ',' + s.y + ',' + s.z;
      const who = this.pop ? this.pop.occupied.get(key) : undefined;
      if (who === undefined || who === npc.id) return { ...s, lot: null, level: 'port', port: true, key };
    }
    return null;
  }

  // ------------------------------------------------------------------------------------------------ history / save
  recordTalk(pp, asked = null) {
    const h = pp.history;
    if (!h.firstMet) h.firstMet = { hour: +this.hour().toFixed(2), at: Math.round(this.now) };
    if (asked) h.asked[asked] = (h.asked[asked] || 0) + 1; else h.talks++;
    h.lastTalkAt = Math.round(this.now);
    this.markDirty();
  }
  recordJob(idOrPp) { const pp = typeof idOrPp === 'string' ? this.get(idOrPp) : idOrPp; if (!pp) return false; pp.history.jobs++; this.markDirty(); return true; }
  recordFavour(idOrPp) { const pp = typeof idOrPp === 'string' ? this.get(idOrPp) : idOrPp; if (!pp) return false; pp.history.favours++; this.markDirty(); return true; }
  recordOffence(idOrPp) { const pp = typeof idOrPp === 'string' ? this.get(idOrPp) : idOrPp; if (!pp) return false; pp.history.offences++; this.markDirty(); return true; }
  serialize() {
    const history = {};
    for (const pp of this.people.values()) {
      const h = pp.history;
      if (h.firstMet || h.talks || h.jobs || h.favours || h.offences) history[pp.id] = { firstMet: h.firstMet, talks: h.talks, jobs: h.jobs, favours: h.favours, offences: h.offences, lastTalkAt: h.lastTalkAt, asked: h.asked };
    }
    return { v: 1, seed: this.seed, history };
  }
  restore(data) {
    if (!data || typeof data !== 'object' || !data.history || typeof data.history !== 'object') return false;
    let n = 0;
    for (const [id, h] of Object.entries(data.history)) {
      const pp = this.people.get(id);
      if (!pp || !h || typeof h !== 'object') continue;
      const d = defaultHistory();
      pp.history = {
        firstMet: h.firstMet && typeof h.firstMet === 'object' ? { hour: +h.firstMet.hour || 0, at: h.firstMet.at | 0 } : null,
        talks: Math.max(0, h.talks | 0), jobs: Math.max(0, h.jobs | 0), favours: Math.max(0, h.favours | 0), offences: Math.max(0, h.offences | 0),
        lastTalkAt: typeof h.lastTalkAt === 'number' ? h.lastTalkAt : null, asked: h.asked && typeof h.asked === 'object' ? { ...d.asked, ...h.asked } : {},
      };
      n++;
    }
    return n > 0 || Object.keys(data.history).length === 0;
  }
  // Persist through the save when the integrator's hook exists (save.setCast), else under our own localStorage key
  markDirty() {
    this.dirty = true;
    if (this.persistTimer || typeof setTimeout !== 'function') return;
    this.persistTimer = setTimeout(() => { this.persistTimer = null; this.persist(); }, 1500);
  }
  persist() {
    if (!this.dirty) return;
    this.dirty = false;
    const data = this.serialize();
    const save = this.game && this.game.save;
    if (save && typeof save.setCast === 'function') { save.setCast(data); return; }
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(`${LOCAL_KEY}:${this.seed}`, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }
  loadSaved() {
    const save = this.game && this.game.save;
    if (save && save.cast) return this.restore(save.cast);
    try {
      if (typeof localStorage === 'undefined') return false;
      const key = `${LOCAL_KEY}:${this.seed}`;
      // ?fresh=1 starts from an empty save (game.js clears the main save the same way)
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('fresh')) { localStorage.removeItem(key); return false; }
      const s = localStorage.getItem(key);
      if (s) return this.restore(JSON.parse(s));
    } catch (e) { /* storage unavailable or corrupt: defaults */ }
    return false;
  }

  // ------------------------------------------------------------------------------------------------ descriptions
  describe(pp) {
    const where = pp.lot.work === PORT ? (pp.spot === 'pad' && pp.ship ? `pad ${pp.ship.padNumber}, Westport` : 'Westport control desk') : `${pp.workName}${pp.room ? ', ' + pp.room.kind.replace(/_/g, ' ') : ''}`;
    const role = pp.kind === 'cast' ? roleWord(pp) : `${pp.job}${pp.roleTag === 'owner' ? ' (runs the place)' : ''}`;   // the title is in the name already
    return `${role.charAt(0).toUpperCase() + role.slice(1)} · ${where}`;
  }
  summary() {
    const perKind = {};
    for (const pp of this.people.values()) perKind[pp.kind] = (perKind[pp.kind] || 0) + 1;
    return { ...this.stats, perKind, anchors: ANCHOR_IDS.map((id) => { const a = this.anchors.get(id); return { id, name: a.name, job: a.job, work: a.lot.work, workName: a.workName, home: a.lot.home, homeName: a.homeName, room: a.room ? a.room.kind + '#' + a.room.index : null, ship: a.ship ? a.ship.model + ' pad ' + a.ship.padNumber : null, personId: a.personId }; }) };
  }
}

const REVERSE = { supplier: 'customer', customer: 'supplier', regular: 'host', host: 'regular', client: 'broker', broker: 'client', debt: 'creditor', creditor: 'debt', suspect: 'investigator', investigator: 'suspect', witness: 'investigator', petition: 'petitioner', constituent: 'representative', gang: 'target', family: 'family', neighbour: 'neighbour', coworker: 'coworker', colleague: 'colleague', dispute: 'dispute', rival: 'rival', trust: 'trusted', charter: 'charterer', temptation: 'mark', committee: 'committee', liaison: 'liaison', courier: 'client' };
const ROLE_WORD = { vela_marr: 'dockmaster of Westport', brin_tal: 'freighter captain', tessa_venn: 'mechanic, runs the hangar', d4lt: 'plant repair droid', seli_noor: 'diner owner', nera_vos: 'clinic operator', ilen_rook: 'Senate clerk', asha_merin: 'Senator, delegation 0', seran_vale: 'Jedi liaison', tavi_renn: 'neighbourhood courier', koro_den: 'salvage co-op organiser', mira_sol: 'community caretaker', ral_drenn: 'freight broker' };
function roleWord(pp) { return ROLE_WORD[pp.castId] || pp.job; }

function needsFor(trade, job) {
  const base = {
    food: ['the morning delivery on time', 'a full room at the rush', 'sleep before the early shift'], retail: ['the shelves stocked', 'paying customers', 'the rent covered'],
    office: ['the files in order', 'the day\'s appointments kept', 'a quiet evening'], civic: ['the queue cleared', 'the forms filed correctly', 'a break'],
    security: ['the post covered', 'nothing to report', 'a shift that ends on time'], medical: ['supplies in stock', 'patients seen', 'sleep'],
    industry: ['parts in stock', 'the line running', 'a shift without a fault'], transport: ['the schedule kept', 'no breakdowns', 'a hot meal'],
    hospitality: ['the residents content', 'the lift working', 'the lobby quiet'], leisure: ['a good crowd', 'no trouble at the door', 'sleep by dawn'], learning: ['the students present', 'quiet', 'the archive in order'],
  };
  const out = (base[trade] || base.office).slice();
  if (/droid/.test(job)) out[2] = 'a charge cycle';
  return out;
}

export { ANCHOR_IDS, STATES, PORT, activityAt };
