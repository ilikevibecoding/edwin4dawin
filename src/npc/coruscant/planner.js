// Trip planning for the crowd (rubric 07 row 6): turns "go do `act` at lot L" into a spot and a list of legs the
// citizen walks with the block-level A*. Zones are the lot interiors and the three street levels; every zone change
// goes through a door (the lot's ground door or its boulevard mid-door), an intersection lift or a building lift
// (both modelled as a 2 s ride in the shaft), never by teleporting. Legs:
//   { kind: 'walk', x, y, z, tag }            block-level A* to this cell (tag: lot | door | street | spot)
//   { kind: 'lift', x, y, z, tx, ty, tz }     ride: wait 2 s hidden at (x, y, z), reappear at (tx, ty, tz)
//   { kind: 'arrive' }                        settle into the activity pose at the spot
import { PORT, portSpots, PORT_Y } from './port.js';
import { hash2 } from '../../rng.js';

export const LIFT_WAIT = 2;

const walk = (p, tag) => ({ kind: 'walk', x: p.x, y: p.y, z: p.z, tag });
const lift = (a, b) => ({ kind: 'lift', x: a.x, y: a.y, z: a.z, tx: b.x, ty: b.y, tz: b.z });
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

export class Planner {
  constructor(pop) { this.pop = pop; this.layout = pop.layout; this.nav = pop.nav; this.lots = pop.lots; }

  // ------------------------------------------------------------------------------------------ spots
  // Where `act` happens for this person at lot `lotId`: a spot { x, y, z, lot, level, kind, yaw?, room?, mode? } or null.
  // `within` ({ x, z, r }, optional) keeps street/plaza picks inside the player's spawn ring.
  resolveSpot(npc, act, lotId, rng, within = null) {
    const p = npc.person;
    if (lotId === PORT) {
      const cands = portSpots(p.job, act, p.visitor);
      return this.pickFree(cands, npc, act, (s) => ({ ...s, lot: null, level: 'port', port: true }));
    }
    const lot = lotId != null ? this.layout.lots[lotId] : null;
    if (lot && lot.kind === 'plaza') return this.plazaSpot(npc, lot, act, rng, within);
    if (!lot) return this.streetSpot(npc, act, rng, null, within);
    const li = this.lots.get(lotId);
    if (!li) return this.streetSpot(npc, act, rng, null, within);
    // street people do not enter their post: they haunt the street outside it
    if (p.street && act === 'work') return this.streetSpot(npc, act, rng, li, within);
    const s = li.pick(p, act, npc.id, within ? { x: within.x, y: within.y ?? npc.pos.y, z: within.z, fx: within.fx, fz: within.fz } : null);
    if (!s) return this.streetSpot(npc, act, rng, li, within);
    const yaw = li.faceOf(s.x, s.y, s.z);
    return { ...s, lot: lotId, level: 'lot', yaw };
  }
  pickFree(cands, npc, act, decorate) {
    if (!cands.length) return null;
    const start = Math.floor(hash2(npc.person.key & 0xffff, act.length * 7 + (npc.person.slot || 0), npc.person.key >>> 16) * cands.length) % cands.length;
    for (let k = 0; k < cands.length; k++) {
      const s = cands[(start + k) % cands.length];
      const key = 'p' + s.x + ',' + s.y + ',' + s.z;
      const who = this.pop.occupied.get(key);
      if (who === undefined || who === npc.id) return { ...decorate(s), key };
    }
    const s = cands[start];
    return { ...decorate(s), key: 'p' + s.x + ',' + s.y + ',' + s.z };
  }
  // A cell on a plaza deck, spread out (rubric row 10: no idle cluster > 8 within 4 blocks)
  plazaSpot(npc, plaza, act, rng, within = null) {
    const cx = plaza.x0 + plaza.w / 2, cz = plaza.z0 + plaza.d / 2;
    // at night the plaza empties into the undercity streets below it, and the nightlife districts' crowd drifts to
    // the Uscru strip (rubric row 10)
    if (this.isNight() && !npc.person.droid && rng() < 0.7) {
      const strip = this.strip();
      const toStrip = strip && (npc.person.district === 'entertainment' || npc.person.district === 'market') && rng() < 0.6;
      const ax = toStrip ? strip.x0 + strip.w / 2 : cx, az = toStrip ? strip.z0 + strip.d / 2 : cz;
      for (let t = 0; t < 6; t++) {
        const c = this.nav.randomPoint('ground', ax, az, (toStrip ? 60 : 34) + t * 6, { next: rng });
        if (c && (!within || t === 5 || Math.hypot(c.x - within.x, c.z - within.z) <= within.r)) return { ...c, lot: null, kind: 'street', yaw: rng() * Math.PI * 2 };
      }
    }
    for (let t = 0; t < 10; t++) {
      const x = plaza.x0 + 5 + Math.floor(rng() * (plaza.w - 10)), z = plaza.z0 + 5 + Math.floor(rng() * (plaza.d - 10));
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 5) continue;           // the fountain
      if (within && t < 8 && Math.hypot(x - within.x, z - within.z) > within.r) continue;
      if (this.pop.idleCount(x, z, 4) > 6) continue;
      return { x, y: this.nav.yOf('deck'), z, lot: null, level: 'deck', kind: 'plaza', plaza: plaza.id, yaw: rng() * Math.PI * 2 };
    }
    return { x: plaza.x0 + 6, y: this.nav.yOf('deck'), z: plaza.z0 + 6, lot: null, level: 'deck', kind: 'plaza', plaza: plaza.id };
  }
  // A street point for wandering: around the post lot's door (guards stay close, couriers and tourists roam)
  streetSpot(npc, act, rng, li = null, within = null) {
    const p = npc.person, job = p.job;
    let level = 'deck', anchor, radius = job === 'sweeper droid' ? 60 : job === 'courier' || job === 'tourist' || job === 'journalist' ? 70 : job === 'child' ? 30 : 22;
    if (li && li.lot.family === 'underworld') {
      // the undercity strip has streets of its own (nav samples them from the blueprint): roam them at ground level
      anchor = { x: li.lot.x0 + li.lot.w / 2, z: li.lot.z0 + li.lot.d / 2 }; level = 'ground'; radius = Math.max(radius, 60);
    } else if (li) {
      const e = li.entrance('deck') || li.entrance('ground');
      if (e) { anchor = e.out; level = e.level; } else anchor = { x: li.lot.x0 + li.lot.w / 2, z: li.lot.z0 + li.lot.d / 2 };
    } else anchor = { x: npc.pos.x, z: npc.pos.z };
    // night draws the street crowd down into the undercity (row 10), most of all in the entertainment and market districts
    const night = this.isNight();
    const nightlife = p.district === 'entertainment' || p.district === 'market';
    if (night && rng() < (nightlife ? 0.8 : 0.55) && level === 'deck' && !p.droid) level = 'ground';
    if (npc.level === 'ground' && npc.lot == null && rng() < 0.6) level = 'ground';
    if (npc.level === 'port' || (li && li.lot.district === 'spaceport')) level = 'port';
    let pt = null;
    for (let t = 0; t < 6 && !pt; t++) {
      const c = this.nav.randomPoint(level, anchor.x, anchor.z, radius, { next: rng });
      if (c && (!within || t === 5 || Math.hypot(c.x - within.x, c.z - within.z) <= within.r)) pt = c;
    }
    if (!pt) return null;
    return { ...pt, lot: null, kind: 'street', yaw: rng() * Math.PI * 2 };
  }

  // ------------------------------------------------------------------------------------------ trips
  // Legs from the citizen's current position/zone to `spot`, or null when there is no route.
  planTrip(npc, spot) {
    const legs = [];
    let cur = { x: npc.pos.x, y: npc.pos.y, z: npc.pos.z }, curLot = npc.lot, curLevel = npc.level;
    const tLot = spot.lot ?? null;
    // 1. leave the current building
    if (curLot != null && curLot !== tLot) {
      const li = this.lots.get(curLot);
      if (!li) return null;
      const target = tLot != null ? this.lots.get(tLot) : null;
      const E = this.exitEntrance(li, target, spot);
      if (!E) return null;
      const floorHere = li.floorOf(cur.y);
      if (floorHere !== E.in.y) {
        const a = li.landing(floorHere), b = li.landing(E.in.y);
        if (!a || !b) return null;
        if (dist2(cur, a) > 1) legs.push(walk(a, 'lot'));
        legs.push(lift(a, b));
        cur = b;
      }
      legs.push(walk(E.in, 'lot'), walk(E.out, 'door'));
      cur = { ...E.out }; curLevel = E.level; curLot = null;
    }
    if (tLot != null) {
      const lt = this.lots.get(tLot);
      if (!lt) return null;
      if (curLot !== tLot) {
        // 2. street travel to the target's door, 3. door -> lobby
        const Ein = this.enterEntrance(lt, curLevel);
        if (!Ein) return null;
        if (dist2(cur, Ein.out) > 4) {
          const route = this.nav.route(cur, curLevel, Ein.out, Ein.level);
          if (!route) return null;
          for (const l of route) legs.push(l.kind === 'walk' ? walk(l, 'street') : { kind: 'lift', x: l.x, y: l.y, z: l.z, tx: l.x, ty: l.toY, tz: l.z });
        }
        legs.push(walk(Ein.out, 'door'), walk(Ein.in, 'door'));
        cur = { ...Ein.in };
      }
      // 4. inside: lift to the spot's floor, walk to the spot
      const floorHere = lt.floorOf(cur.y);
      if (spot.y !== floorHere && Math.abs(spot.y - floorHere) > 1) {
        const a = lt.landing(floorHere), b = lt.landing(spot.y);
        if (!a || !b) return null;
        if (dist2(cur, a) > 1) legs.push(walk(a, 'lot'));
        legs.push(lift(a, b));
        cur = b;
      }
      legs.push(walk(spot, 'spot'));
    } else {
      // street / plaza / port target
      const tLevel = spot.level || this.nav.levelAt(spot.x, spot.y, spot.z);
      if (dist2(cur, spot) > 9 || curLevel !== tLevel) {
        const route = this.nav.route(cur, curLevel, spot, tLevel);
        if (!route) return null;
        for (const l of route) legs.push(l.kind === 'walk' ? walk(l, 'street') : { kind: 'lift', x: l.x, y: l.y, z: l.z, tx: l.x, ty: l.toY, tz: l.z });
      }
      legs.push(walk(spot, 'spot'));
    }
    legs.push({ kind: 'arrive' });
    return legs;
  }

  // Door to leave `li` by, heading for lot `target` (or a street spot): share a street level when both lots offer it
  exitEntrance(li, target, spot) {
    const es = li.entrances();
    if (!es.length) return null;
    const pref = this.daytimeDeck() ? ['deck', 'ground'] : ['ground', 'deck'];
    if (target) {
      const tes = target.entrances();
      for (const lv of pref) { const e = es.find((x) => x.level === lv); if (e && tes.some((t) => t.level === lv)) return e; }
      return es.find((e) => e.level === pref[0]) || es[0];
    }
    const want = spot.level || pref[0];
    return es.find((e) => e.level === want) || es.find((e) => e.level === pref[0]) || es[0];
  }
  enterEntrance(lt, curLevel) {
    const es = lt.entrances();
    if (!es.length) return null;
    return es.find((e) => e.level === curLevel) || es.find((e) => e.level === 'deck') || es[0];
  }
  daytimeDeck() { return this.pop.hour >= 6 && this.pop.hour <= 21; }
  isNight() { return this.pop.hour < 5.5 || this.pop.hour > 21.5; }
  strip() { if (this._strip === undefined) this._strip = this.layout.lots.find((l) => l.family === 'underworld') || null; return this._strip; }
}

export { PORT, PORT_Y };
