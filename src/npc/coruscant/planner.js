// Trip planning for the crowd (rubric 07 row 6): turns "go do `act` at lot L" into a spot and a list of legs the
// citizen walks with the block-level A*. Zones are the lot interiors and the three street levels; every zone change
// goes through a door (the lot's ground door or its boulevard mid-door), an intersection lift or a building lift
// (both modelled as a 2 s ride in the shaft), never by teleporting. Legs:
//   { kind: 'walk', x, y, z, tag }            block-level A* to this cell (tag: lot | door | street | spot)
//   { kind: 'lift', x, y, z, tx, ty, tz }     ride: wait 2 s hidden at (x, y, z), reappear at (tx, ty, tz)
//   { kind: 'hop', x, y, z, tx, ty, tz }      jump the plaza kerb railing from (x, y, z) to (tx, ty, tz) (0.6 s arc)
//   { kind: 'arrive' }                        settle into the activity pose at the spot
import { PORT, portSpots, PORT_Y } from './port.js';
import { hash2 } from '../../rng.js';

export const LIFT_WAIT = 2;
const NEAR_R = 40;   // street spots are sampled this close to the player first (see streetSpot)
// Fresh arrivals and wander targets go where the camera looks (rubric row 4: >= 120 visible): the sampling centre
// is pushed VIEW_AHEAD blocks forward and the first attempts insist on a cell in front of the camera between
// VIEW_MIN (no one pops into view at arm's length) and VIEW_MAX blocks (see inView).
const VIEW_AHEAD = 20, VIEW_MIN = 14, VIEW_MAX = 60;
const PERSONAL_R = 3;   // nobody picks an idle spot this close to the player
const STAIR_MAX = 16;   // floors this close (blocks) are reached on foot when no lift lands there (stairs, ramps)

const walk = (p, tag) => ({ kind: 'walk', x: p.x, y: p.y, z: p.z, tag });
// a nav.route leg as a trip leg: street walks, kerb hops (plaza railing) and intersection lift rides
const fromRoute = (l) => l.kind === 'walk' ? walk(l, 'street') : l.kind === 'hop' ? { kind: 'hop', x: l.x, y: l.y, z: l.z, tx: l.tx, ty: l.ty, tz: l.tz, tag: 'hop' } : { kind: 'lift', x: l.x, y: l.y, z: l.z, tx: l.x, ty: l.toY, tz: l.z };
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
      let cands = portSpots(p.job, act, p.visitor);
      // the port is 350 blocks long: a crew's spot is one of its kind near the player (the far pads' spots would only
      // be skipped as out of the spawn ring), the hash still decides which
      if (within) { const near = cands.filter((s) => Math.hypot(s.x - within.x, s.z - within.z) <= within.r); if (near.length) cands = near; }
      // off duty, a share of the crews stroll the apron rather than sit (the evening crowd is bigger than the benches)
      const stroll = act === 'leisure' && rng() < 0.45;
      const s = stroll ? null : this.pickFree(cands, npc, act, (d) => ({ ...d, lot: null, level: 'port', port: true }));
      return s || this.portStroll(npc, rng, within, cands);
    }
    const lot = lotId != null ? this.layout.lots[lotId] : null;
    if (lot && lot.kind === 'plaza') return this.plazaSpot(npc, lot, act, rng, within);
    if (!lot) return this.streetSpot(npc, act, rng, null, within);
    const li = this.lots.get(lotId);
    if (!li) return this.streetSpot(npc, act, rng, null, within);
    // street people do not enter their post: they haunt the street outside it
    if (p.street && act === 'work') return this.streetSpot(npc, act, rng, li, within);
    const s = li.pick(p, act, npc.id, within ? { x: within.x, y: within.y ?? npc.pos.y, z: within.z, fx: within.fx, fy: within.fy, fz: within.fz } : null);
    if (!s) return this.streetSpot(npc, act, rng, li, within);
    const yaw = li.faceOf(s.x, s.y, s.z);
    return { ...s, lot: lotId, level: 'lot', yaw };
  }
  // The first free spot of the list from the person's hash onwards; null when every one is taken (nobody stands in
  // somebody else's spot: the caller finds them a place to stroll)
  pickFree(cands, npc, act, decorate) {
    if (!cands.length) return null;
    const start = Math.floor(hash2(npc.person.key & 0xffff, act.length * 7 + (npc.person.slot || 0), npc.person.key >>> 16) * cands.length) % cands.length;
    for (let k = 0; k < cands.length; k++) {
      const s = cands[(start + k) % cands.length];
      const key = 'p' + s.x + ',' + s.y + ',' + s.z;
      const who = this.pop.occupied.get(key);
      if (who === undefined || who === npc.id) return { ...decorate(s), key };
    }
    return null;
  }
  // A cell of the spaceport deck to stand or stroll on: near where the camera looks when the player is at the port,
  // else around the spots of the person's own kind (the pads of a crew, the terminal of a passenger)
  portStroll(npc, rng, within = null, cands = []) {
    const tries = [];
    if (within) { const vc = this.viewCentre(within); tries.push([vc.x, vc.z, Math.min(NEAR_R, within.r)], [within.x, within.z, within.r]); }
    if (cands.length) { const c = cands[Math.floor(rng() * cands.length)]; tries.push([c.x, c.z, 16]); }
    tries.push([2621, 0, 60]);
    for (const [x, z, r] of tries) for (let t = 0; t < 6; t++) {
      const c = this.nav.randomPoint('port', x, z, r, { next: rng });
      if (!c) continue;
      if (within && (Math.hypot(c.x - within.x, c.z - within.z) > within.r || Math.hypot(c.x - within.x, c.z - within.z) < PERSONAL_R)) continue;
      if (within && t < 3 && !this.inView(within, c.x, c.z)) continue;
      if (this.pop.idleCount(c.x, c.z, 4) > 6) continue;
      return { ...c, lot: null, level: 'port', kind: 'street', port: true, yaw: rng() * Math.PI * 2 };
    }
    return null;
  }
  // Is block (x, z) where the player sees it: in front of the camera, VIEW_MIN..VIEW_MAX blocks away? Without a
  // camera direction (offline, tests) every cell qualifies.
  inView(within, x, z) {
    if (!within || within.fx == null) return true;
    const dx = x + 0.5 - within.x, dz = z + 0.5 - within.z, d = Math.hypot(dx, dz);
    return d >= VIEW_MIN && d <= VIEW_MAX && (dx * within.fx + dz * within.fz) / d > 0.25;
  }
  // The point to sample street cells around: the player, pushed forward along the view direction
  viewCentre(within) {
    if (within.fx == null) return { x: within.x, z: within.z };
    return { x: within.x + within.fx * VIEW_AHEAD, z: within.z + within.fz * VIEW_AHEAD };
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
    for (let t = 0; t < 14; t++) {
      const x = plaza.x0 + 5 + Math.floor(rng() * (plaza.w - 10)), z = plaza.z0 + 5 + Math.floor(rng() * (plaza.d - 10));
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < 5) continue;           // the fountain
      if (within && t < 12 && Math.hypot(x - within.x, z - within.z) > within.r) continue;
      if (within && t < 8 && !this.inView(within, x, z)) continue;
      if (within && t < 13 && Math.hypot(x + 0.5 - within.x, z + 0.5 - within.z) < PERSONAL_R) continue;
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
    // someone already down on the undercity streets mostly stays there (npc.slot: placed in the world; a fresh
    // Citizen's level is only the constructor default)
    if (npc.slot && npc.level === 'ground' && npc.lot == null && rng() < 0.6) level = 'ground';
    if (npc.level === 'port' || (li && li.lot.district === 'spaceport')) level = 'port';
    // a fresh arrival takes the player's street level first (the deck crowd is invisible from the undercity and the
    // other way round), the post's own level when that has no cell in reach
    const levels = [level];
    if (within && within.y != null && !npc.slot && level !== 'port') { const pl = this.nav.levelAt(within.x, within.y, within.z); if (pl !== level && pl !== 'port') levels.unshift(pl); }
    let pt = null;
    for (const lv of levels) {
      // the bustle should be where the player can see it: first try cells around the player that are still within
      // the post's radius (guards stay by their post; the strip's crowd gathers around whoever walks its street)
      if (within) {
        const vc = this.viewCentre(within);
        for (let t = 0; t < 8 && !pt; t++) {
          const c = this.nav.randomPoint(lv, vc.x, vc.z, Math.min(radius, NEAR_R), { next: rng });
          if (c && Math.hypot(c.x - anchor.x, c.z - anchor.z) <= radius + 8 && Math.hypot(c.x - within.x, c.z - within.z) >= PERSONAL_R && (t >= 5 || this.inView(within, c.x, c.z))) pt = c;
        }
      }
      for (let t = 0; t < 6 && !pt; t++) {
        const c = this.nav.randomPoint(lv, anchor.x, anchor.z, radius, { next: rng });
        if (c && (!within || t === 5 || (Math.hypot(c.x - within.x, c.z - within.z) <= within.r && Math.hypot(c.x - within.x, c.z - within.z) >= PERSONAL_R))) pt = c;
      }
      if (pt) break;
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
      const floorHere = li.floorOf(cur.y);
      const E = this.exitEntrance(li, target, spot, cur, floorHere);
      // no door of this building can be reached from this floor (a tenement upstairs without lift or stairs in the
      // blueprint): the occupant stays where they are rather than teleporting (see CoruscantPopulation.beginTrip)
      if (!E) return 'stay';
      if (floorHere !== E.in.y) {
        const a = li.landing(floorHere), b = li.landing(E.in.y);
        if (a && b) {
          if (dist2(cur, a) > 1) legs.push(walk(a, 'lot'));
          legs.push(lift(a, b));
          cur = b;
        } else {
          // no lift lands on this floor (the strip's cantina upstairs, a mezzanine): take the stairs - a block-level
          // walk to the first cell of the lower floor the blueprint connects on foot, with a bigger node budget
          const s = this.stairsTo(li, cur, floorHere, E.in.y);
          if (!s) return 'stay';
          if (dist2(cur, s.top) > 1) legs.push(walk(s.top, 'lot'));
          legs.push(walk(s.bottom, 'stairs'));
          cur = s.bottom;
        }
      }
      legs.push(walk(E.in, 'lot'), walk(E.out, 'door'));
      cur = { ...E.out }; curLevel = E.level; curLot = null;
    }
    if (tLot != null) {
      const lt = this.lots.get(tLot);
      if (!lt) return null;
      if (curLot !== tLot) {
        // 2. street travel to the target's door, 3. door -> lobby
        const Ein = this.enterEntrance(lt, curLevel, spot.y);
        if (!Ein) return null;
        if (dist2(cur, Ein.out) > 4) {
          const route = this.nav.route(cur, curLevel, Ein.out, Ein.level);
          if (!route) return null;
          for (const l of route) legs.push(fromRoute(l));
        }
        legs.push(walk(Ein.out, 'door'), walk(Ein.in, 'door'));
        cur = { ...Ein.in };
      }
      // 4. inside: lift to the spot's floor, walk to the spot
      const floorHere = lt.floorOf(cur.y);
      if (spot.y !== floorHere && Math.abs(spot.y - floorHere) > 1) {
        const a = lt.landing(floorHere), b = lt.landing(spot.y);
        if (a && b) {
          if (dist2(cur, a) > 1) legs.push(walk(a, 'lot'));
          legs.push(lift(a, b));
          cur = b;
        } else {
          const s = this.stairsTo(lt, cur, floorHere, spot.y);
          if (!s) return null;
          if (dist2(cur, s.top) > 1) legs.push(walk(s.top, 'lot'));
          legs.push(walk(s.bottom, 'stairs'));
          cur = s.bottom;
        }
      }
      legs.push(walk(spot, 'spot'));
    } else {
      // street / plaza / port target
      const tLevel = spot.level || this.nav.levelAt(spot.x, spot.y, spot.z);
      // a plaza edge between here and the spot means a kerb to hop (nav.route inserts the hop leg)
      const kerb = tLevel === 'deck' && curLevel === 'deck' && this.nav.plazaAt(Math.floor(cur.x), Math.floor(cur.z)) !== this.nav.plazaAt(Math.floor(spot.x), Math.floor(spot.z));
      if (dist2(cur, spot) > 9 || curLevel !== tLevel || kerb) {
        const route = this.nav.route(cur, curLevel, spot, tLevel);
        if (!route) return null;
        for (const l of route) legs.push(fromRoute(l));
      }
      legs.push(walk(spot, 'spot'));
    }
    legs.push({ kind: 'arrive' });
    return legs;
  }

  // The first cell of floor `toY` that the blueprint connects on foot to `cur` on `floorHere` (stairs, slabs, ramps),
  // when the floors are close enough to climb; null when there is no such way
  stairsTo(li, cur, floorHere, toY) {
    if (Math.abs(floorHere - toY) > STAIR_MAX) return null;
    return li.reach(cur, toY);
  }
  // Door to leave `li` by, heading for lot `target` (or a street spot): share a street level when both lots offer it.
  // Only doors whose floor can be reached from `floorHere` count (by lift, or on foot when the floors are close).
  exitEntrance(li, target, spot, cur = null, floorHere = null) {
    let es = li.entrances();
    if (cur && floorHere != null) es = es.filter((e) => e.in.y === floorHere || (li.landing(floorHere) && li.landing(e.in.y)) || this.stairsTo(li, cur, floorHere, e.in.y));
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
  // Door to enter `lt` by: on the current street level when possible, but only a door from whose floor the spot's
  // floor can be reached (by lift, or on foot when close) - the street route changes level for the other doors
  enterEntrance(lt, curLevel, spotY = null) {
    const es = lt.entrances();
    if (!es.length) return null;
    let list = es;
    if (spotY != null) {
      const f = lt.floorOf(spotY);
      const ok = es.filter((e) => e.in.y === f || (lt.landing(e.in.y) && lt.landing(f)) || Math.abs(e.in.y - f) <= STAIR_MAX);
      if (ok.length) list = ok;
    }
    return list.find((e) => e.level === curLevel) || list.find((e) => e.level === 'deck') || list[0];
  }
  daytimeDeck() { return this.pop.hour >= 6 && this.pop.hour <= 21; }
  isNight() { return this.pop.hour < 5.5 || this.pop.hour > 21.5; }
  strip() { if (this._strip === undefined) this._strip = this.layout.lots.find((l) => l.family === 'underworld') || null; return this._strip; }
}

export { PORT, PORT_Y };
