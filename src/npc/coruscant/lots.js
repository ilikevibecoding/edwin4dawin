// Per-lot knowledge for the population: the blueprint metadata (rooms with floor boxes, work/spot/bed records,
// lifts, doors) indexed by activity and job, plus standability tests on the blueprint's own block array so spots
// and lift landings can be resolved before the chunks around them exist. Pure (no THREE, no DOM); the offline
// scripts (test-rooms.mjs, npc-census.mjs) use it too.
import { blueprintFor } from '../../coruscant/buildings.js';
import { purposeFor } from '../../coruscant/purposes.js';
import { BLOCKS, SHAPE, B } from '../../blocks.js';
import { hash2 } from '../../rng.js';
import { roomFunction, VISITOR_JOBS } from './rooms.js';

// blueprint work-record kinds a job may occupy (first match wins); jobs missing here fall back to their room function
export const JOB_WORK_KINDS = {
  clerk: ['desk'], executive: ['executive', 'desk'], teller: ['teller', 'desk'], advocate: ['desk'], aide: ['desk'], senator: ['desk', 'chancellor'], journalist: ['desk', 'comms'],
  receptionist: ['receptionist'], concierge: ['receptionist'], 'protocol droid': ['receptionist', 'ticket clerk', 'cloakroom attendant'], broker: ['broker', 'shopkeeper', 'desk'],
  guard: ['guard', 'vault guard', 'red guard'], 'senate guard': ['red guard', 'guard'], officer: ['guard', 'desk'], bouncer: ['guard'], 'customs officer': ['guard', 'desk'], 'vault guard': ['vault guard', 'guard'],
  quartermaster: ['quartermaster', 'stock'], warden: ['warden', 'guard'], conductor: ['conductor', 'ticket clerk'],
  cook: ['cook'], server: ['server'], barista: ['server', 'bartender', 'cook'], bartender: ['bartender'], 'waitress droid': ['waitress droid', 'server'],
  medic: ['medic', 'surgeon', 'nurse'], nurse: ['nurse', 'medic'], pharmacist: ['medic', 'shopkeeper'], surgeon: ['surgeon'],
  technician: ['technician', 'comms', 'operator'], mechanic: ['mechanic', 'technician', 'droid tech'], 'droid tech': ['droid tech', 'technician'], smelter: ['operator', 'technician'],
  engineer: ['engineer', 'operator'], foreman: ['operator', 'stock'], 'dock worker': ['stock'], 'cargo droid': ['stock'], porter: ['stock', 'laundry'], 'maintenance droid': ['laundry', 'stock'],
  stock: ['stock'], comms: ['comms'], operator: ['operator'], astromech: ['technician', 'mechanic', 'droid tech'],
  vendor: ['vendor', 'shopkeeper'], shopkeeper: ['shopkeeper'], tailor: ['shopkeeper'], gardener: ['gardener'],
  archivist: ['archivist', 'librarian'], librarian: ['librarian'], teacher: ['teacher'], attendant: ['attendant', 'croupier'], curator: ['attendant'], guide: ['attendant'],
  projectionist: ['projectionist'], musician: ['musician', 'performer'], dj: ['dj'], judge: ['judge'], witness: ['witness'], speaker: ['chancellor', 'desk'],
};
// room kinds where a job works when no work record matches (from ROOM_FUNCTIONS) - resolved lazily via roomsForJob

const passableId = (id) => { if (id === 0 || id === 255) return true; const b = BLOCKS[id]; return b ? (!b.solid || !!b.door || b.shape === SHAPE.SLAB || b.shape === SHAPE.BED) : false; };
const standableId = (id) => { if (id === 0 || id === 255) return false; const b = BLOCKS[id]; return b ? (b.solid || b.shape === SHAPE.LIQUID) : true; };

export class LotInfo {
  constructor(lot, layout) {
    this.lot = lot;
    this.layout = layout;
    this.bp = blueprintFor(lot, layout);
    this.meta = this.bp.meta;
    this.purpose = purposeFor(lot, layout);
    this.id = lot.id;
    this.name = this.meta.name || this.purpose.name;
    this._byWorkKind = null;
    this._byRoomKind = null;
    this._landings = new Map();
    this.occupied = new Map();   // spot key -> npc id (live occupancy)
    this.stats = { assigned: 0, fallbacks: 0 };
  }

  // ---------------------------------------------------------------- blueprint block tests (world coords)
  blockAt(x, y, z) {
    const lx = x - this.lot.x0, ly = y - this.bp.y0, lz = z - this.lot.z0;
    if (lx < 0 || lz < 0 || lx >= this.bp.w || lz >= this.bp.d || ly < 0 || ly >= this.bp.h) return -1;
    return this.bp.blocks[(lx * this.bp.d + lz) * this.bp.h + ly];
  }
  // feet may be at (x, y, z): floor below, two passable cells
  standable(x, y, z) {
    const here = this.blockAt(x, y, z), above = this.blockAt(x, y + 1, z), below = this.blockAt(x, y - 1, z);
    if (here < 0 || above < 0 || below < 0) return false;
    return passableId(here) && passableId(above) && (standableId(below) || (here !== 0 && here !== 255 && BLOCKS[here] && BLOCKS[here].shape === SHAPE.SLAB));
  }
  inside(x, z) { return x >= this.lot.x0 && x < this.lot.x1 && z >= this.lot.z0 && z < this.lot.z1; }

  // ---------------------------------------------------------------- rooms
  roomAt(x, y, z) {
    for (const r of this.meta.rooms) if (r.y === y && x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d) return r;
    return null;
  }
  roomsOfKind(kinds) {
    if (!this._byRoomKind) { this._byRoomKind = new Map(); for (const r of this.meta.rooms) { if (!this._byRoomKind.has(r.kind)) this._byRoomKind.set(r.kind, []); this._byRoomKind.get(r.kind).push(r); } }
    const out = [];
    for (const k of kinds) { const l = this._byRoomKind.get(k); if (l) out.push(...l); }
    return out;
  }
  get roomKinds() { if (!this._byRoomKind) this.roomsOfKind([]); return [...this._byRoomKind.keys()]; }

  // Standable cells of a room (its floor box), optionally only those next to a prop block of `props` (names in B).
  roomCells(room, props = null, max = 12) {
    const f = room.floor || room, out = [];
    const ids = props ? props.map((n) => B[n]).filter((v) => v !== undefined) : null;
    for (let x = f.x; x < f.x + f.w && out.length < max; x++) for (let z = f.z; z < f.z + f.d && out.length < max; z++) {
      if (!this.standable(x, room.y, z)) continue;
      if (ids) {
        let ok = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const id = this.blockAt(x + dx, room.y, z + dz); if (ids.includes(id) || (id > 0 && id !== 255 && ids.includes(this.blockAt(x + dx, room.y + 1, z + dz)))) { ok = true; break; } }
        if (!ok) continue;
      }
      out.push({ x, y: room.y, z, kind: 'floor', room });
    }
    return out;
  }

  // ---------------------------------------------------------------- work / spot records
  workByKind(kinds) {
    if (!this._byWorkKind) { this._byWorkKind = new Map(); for (const w of this.meta.work) { if (!this._byWorkKind.has(w.kind)) this._byWorkKind.set(w.kind, []); this._byWorkKind.get(w.kind).push(w); } }
    const out = [];
    for (const k of kinds) { const l = this._byWorkKind.get(k); if (l) out.push(...l); }
    return out;
  }
  spotsIn(rooms, kinds = null) {
    const out = [];
    for (const s of this.meta.spots) {
      if (kinds && !kinds.includes(s.kind)) continue;
      for (const r of rooms) if (s.y === r.y && s.x >= r.x && s.x < r.x + r.w && s.z >= r.z && s.z < r.z + r.d) { out.push({ ...s, room: r }); break; }
    }
    return out;
  }

  // Candidate cells for `act` of a person: work (staff or visitor), meal, sleep, leisure. Each is { x, y, z, kind, room? }.
  candidates(person, act) {
    const job = person.job;
    if (act === 'sleep' || act === 'home') {
      if (this.meta.beds.length) return this.meta.beds.map((b) => ({ ...b, kind: 'bed' }));
      const rooms = this.roomsOfKind(['hotel_room', 'family_apartment', 'studio', 'penthouse', 'barracks', 'clinic_ward', 'medbay', 'ward', 'lounge']);
      const seats = this.spotsIn(rooms, ['seat']);
      return seats.length ? seats : this.anySpots(['seat', 'stand']);
    }
    if (act === 'meal') {
      const rooms = this.meta.rooms.filter((r) => roomFunction(r.kind).meal);
      const seats = this.spotsIn(rooms, ['seat']);
      if (seats.length) return seats;
      const cells = []; for (const r of rooms) cells.push(...this.roomCells(r, ['TABLE', 'PANEL_BLACK', 'STONE_BRICK_SLAB'], 6));
      return cells.length ? cells : this.anySpots(['seat', 'stand']);
    }
    if (act === 'leisure') {
      const rooms = this.meta.rooms.filter((r) => roomFunction(r.kind).leisure);
      const spots = this.spotsIn(rooms, ['seat', 'stand', 'dance', 'wait']);
      return spots.length ? spots : this.anySpots(['seat', 'stand', 'wait']);
    }
    // work
    if (person.visitor || VISITOR_JOBS.has(job)) {
      const kinds = person.workRooms && person.workRooms.length ? person.workRooms : null;
      let rooms = kinds ? this.roomsOfKind(kinds) : [];
      if (!rooms.length) rooms = this.meta.rooms.filter((r) => roomFunction(r.kind).visitors);
      const spots = this.spotsIn(rooms, ['seat', 'stand', 'dance', 'wait']);
      if (spots.length) return spots;
      const cells = []; for (const r of rooms.slice(0, 8)) cells.push(...this.roomCells(r, null, 4));
      return cells.length ? cells : this.anySpots(['seat', 'stand', 'wait']);
    }
    const wk = JOB_WORK_KINDS[job];
    if (wk) { const w = this.workByKind(wk); if (w.length) return w; }
    // rooms whose function hosts this job: stand next to the room's prop blocks
    const rooms = this.meta.rooms.filter((r) => { const f = roomFunction(r.kind); return f.jobs.some((j) => j.job === job); });
    const cells = [];
    for (const r of rooms.slice(0, 10)) { const f = roomFunction(r.kind); cells.push(...this.roomCells(r, f.prop && f.prop.length ? f.prop : null, 4)); }
    if (cells.length) return cells;
    for (const r of rooms.slice(0, 10)) cells.push(...this.roomCells(r, null, 3));
    if (cells.length) return cells;
    const spots = this.spotsIn(rooms, ['stand', 'seat']);
    if (spots.length) return spots;
    this.stats.fallbacks++;
    if (this.meta.work.length) return this.meta.work;
    return this.anySpots(['stand', 'seat', 'wait']);
  }
  anySpots(kinds) {
    const s = this.meta.spots.filter((p) => kinds.includes(p.kind));
    if (s.length) return s;
    if (this.meta.spots.length) return this.meta.spots;
    return this.meta.lobby ? [{ ...this.meta.lobby, kind: 'lobby' }] : [];
  }

  // Deterministic pick for a person (hash of key and act), skipping cells occupied by other live NPCs.
  pick(person, act, npcId = -1) {
    const c = this.candidates(person, act);
    if (!c.length) return null;
    const start = Math.floor(hash2(person.key & 0xffff, act.length * 31 + (person.slot || 0), person.key >>> 16) * c.length) % c.length;
    for (let k = 0; k < c.length; k++) {
      const s = c[(start + k) % c.length];
      const key = s.x + ',' + s.y + ',' + s.z;
      const who = this.occupied.get(key);
      if (who === undefined || who === npcId) { this.stats.assigned++; return { ...s, key, lot: this.id }; }
    }
    const s = c[start];
    return { ...s, key: s.x + ',' + s.y + ',' + s.z, lot: this.id };
  }
  occupy(spot, npcId) { if (spot && spot.key) this.occupied.set(spot.key, npcId); }
  vacate(spot, npcId) { if (spot && spot.key && this.occupied.get(spot.key) === npcId) this.occupied.delete(spot.key); }

  // ---------------------------------------------------------------- vertical / entry geometry
  // Floor y of a world y inside the lot (the walk level of the room at that height)
  floorOf(y) { let best = this.meta.floorY; for (const f of this.meta.floors) if (f <= y + 0.01 && f > best) best = f; return best; }
  // A standable cell beside a lift shaft at floor `y` (cached per floor). null when no shaft reaches the floor.
  landing(y) {
    if (this._landings.has(y)) return this._landings.get(y);
    // the shafts sit inside a walled core with chrome doors: the landing is the first standable cell within four
    // cells of the shaft column, preferably one that touches a chrome (door) block
    let out = null, fallback = null;
    const chrome = B.CHROME;
    for (const lf of this.meta.lifts) {
      if (y < lf.y0 - 0.01 || y > lf.y1 + 0.01) continue;
      for (let r = 1; r <= 4 && !out; r++) {
        for (let dx = -r; dx <= r && !out; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = lf.x + dx, z = lf.z + dz;
          if (!this.standable(x, y, z)) continue;
          const byDoor = this.blockAt(x + 1, y, z) === chrome || this.blockAt(x - 1, y, z) === chrome || this.blockAt(x, y, z + 1) === chrome || this.blockAt(x, y, z - 1) === chrome;
          if (byDoor) { out = { x, y, z, lift: lf }; break; }
          if (!fallback) fallback = { x, y, z, lift: lf };
        }
      }
      if (out) break;
    }
    if (!out) out = fallback;
    this._landings.set(y, out);
    return out;
  }
  hasLiftTo(y) { return !!this.landing(y); }
  // entrances: { level: 'ground'|'deck', out: {x,y,z}, in: {x,y,z} } - `out` on the street, `in` one step inside
  entrances() {
    if (this._entr) return this._entr;
    const m = this.meta, e = [];
    const step = (p, side, k) => side === 'W' ? { x: p.x + k, z: p.z } : side === 'E' ? { x: p.x - k, z: p.z } : side === 'N' ? { x: p.x, z: p.z + k } : { x: p.x, z: p.z - k };
    const side = this.lot.front || (this.lot.door && this.lot.door.side) || 'S';
    if (m.door && m.inside) e.push({ level: 'ground', out: { ...m.door }, in: { ...m.inside }, side });
    if (m.midDoor) {
      const y = m.midDoor.y;
      // one to three steps in from the wall column, whichever is standable at the mid-door floor
      let inn = null;
      for (let k = 2; k <= 4 && !inn; k++) { const c = step(m.midDoor, side, k); if (this.standable(c.x, y, c.z)) inn = { x: c.x, y, z: c.z }; }
      if (!inn) { const c = step(m.midDoor, side, 2); inn = { x: c.x, y, z: c.z }; }
      e.push({ level: 'deck', out: { ...m.midDoor }, in: inn, side });
    }
    this._entr = e;
    return e;
  }
  entrance(level) { return this.entrances().find((e) => e.level === level) || null; }
  get midDoorY() { return this.meta.midDoor ? this.meta.midDoor.y : null; }
}

// Cache of LotInfo by lot id (bounded: far lots are dropped so the blueprint LRU is not thrashed)
export class LotCache {
  constructor(layout, max = 96) { this.layout = layout; this.max = max; this.map = new Map(); }
  get(lotId) {
    let li = this.map.get(lotId);
    if (li) { this.map.delete(lotId); this.map.set(lotId, li); return li; }
    const lot = this.layout.lots[lotId];
    if (!lot || lot.kind === 'plaza') return null;
    li = new LotInfo(lot, this.layout);
    this.map.set(lotId, li);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    return li;
  }
  peek(lotId) { return this.map.get(lotId) || null; }
}
