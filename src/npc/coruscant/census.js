// The population pool of Coruscant (rubric 07 row 4): a deterministic roster of named citizens and droids built from
// the layout alone. Every lot's purpose (purposes.js) contributes its role slots; every district adds street life
// (guards on patrol, couriers, tourists, sweeper droids, ...) scaled by DISTRICT_PROFILE.density. A person is seeded
// from (layout seed, lot id, slot) so the same name always has the same home, job, meal spot and haunts.
// Pure: no world, no DOM. The runtime manager (index.js) and the offline scripts share it.
import { RNG, hash2 } from '../../rng.js';
import { purposeFor } from '../../coruscant/purposes.js';
import { DISTRICT_PROFILE } from '../../coruscant/layout.js';
import { archetypeOf, DROID_ARCHETYPES, VISITOR_JOBS, roomStaff, roomFunction } from './rooms.js';
import { personName, droidName } from './names.js';
import { PORT } from './port.js';

const mix = (seed, a, b) => Math.floor(hash2(a, b, seed) * 0x7fffffff);
const HOUSING = new Set(['apartments', 'hotel']);
const FOOD = new Set(['food', 'hospitality']);
const LEISURE_KINDS = new Set(['holo_arcade', 'cantina', 'archive', 'gym', 'general_store', 'pawn', 'tailor', 'droid_shop', 'temple_annex']);

// Street archetypes per district: [job, weight]. Counts scale with DISTRICT_PROFILE.density (STREET_BASE per unit).
const STREET_BASE = 56;
const PLAZA_REGULARS = { senate: 130, default: 60 };   // extra street people anchored on each district's plaza
const STREET_MIX = {
  senate: [['senate guard', 4], ['protocol droid', 3], ['aide', 3], ['journalist', 3], ['tourist', 4], ['courier', 2], ['jedi', 1], ['security officer', 2]],
  financial: [['clerk', 5], ['executive', 2], ['courier', 5], ['security officer', 2], ['protocol droid', 1], ['sweeper droid', 2], ['tourist', 1], ['journalist', 1]],
  residential: [['resident', 6], ['child', 3], ['sweeper droid', 2], ['vendor', 1], ['courier', 2], ['security officer', 1], ['medic', 1], ['tourist', 1]],
  industrial: [['dock worker', 4], ['mechanic', 3], ['astromech', 2], ['foreman', 1], ['courier', 1], ['security officer', 1], ['sweeper droid', 1], ['pilot', 2]],
  entertainment: [['tourist', 5], ['patron', 4], ['musician', 2], ['bouncer', 1], ['bounty hunter', 1], ['courier', 1], ['security officer', 2], ['protocol droid', 1], ['sweeper droid', 1]],
  market: [['vendor', 6], ['shopper', 6], ['astromech', 2], ['courier', 2], ['sweeper droid', 1], ['security officer', 1], ['tourist', 2]],
  spaceport: [['pilot', 6], ['passenger', 5], ['customs officer', 3], ['astromech', 3], ['mechanic', 7], ['dock worker', 4], ['courier', 1], ['tourist', 2], ['bartender', 1], ['vendor', 1], ['sweeper droid', 1]],
};
const PORT_CROWD = 64;    // spaceport crews (the port has no lots: pads, terminal and hangar are one structure)

function pickWeighted(list, rng) {
  let total = 0; for (const [, w] of list) total += w;
  let r = rng.next() * total;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[list.length - 1][0];
}

const centre = (lot) => ({ x: lot.x0 + lot.w / 2, z: lot.z0 + lot.d / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// k nearest entries of `cands` (each {lot, ...}) to point p, excluding lot id `not`
function nearest(cands, p, k, not = -1) {
  const scored = [];
  for (const c of cands) { if (c.lot.id === not) continue; scored.push([dist(centre(c.lot), p), c]); }
  scored.sort((a, b) => a[0] - b[0]);
  return scored.slice(0, k).map((s) => s[1]);
}

// Shift from the opening hours: businesses open around the clock split their staff into day/night shifts.
function shiftFor(purpose, slot) {
  const [a, b] = purpose.hours;
  if (a === 0 && b >= 24) return slot % 3 === 2 ? 'night' : 'day';
  if (a >= 14) return 'evening';           // cantinas, arcades, pawn shops
  return 'day';
}

export function buildPool(layout, opts = {}) {
  const seed = layout.seed | 0;
  const usable = layout.lots.filter((l) => l.kind === 'tower' || l.kind === 'landmark');
  const purposed = usable.map((lot) => ({ lot, purpose: purposeFor(lot, layout) }));
  const housing = purposed.filter((p) => HOUSING.has(p.purpose.kind) || p.lot.family === 'republica');
  const food = purposed.filter((p) => FOOD.has(p.purpose.category));
  const leisure = purposed.filter((p) => LEISURE_KINDS.has(p.purpose.kind) || p.lot.family === 'opera' || p.lot.family === 'market' || p.lot.family === 'plaza_monument');
  const plazas = layout.lots.filter((l) => l.kind === 'plaza');
  const plazaOf = (district, near = null) => {
    const own = plazas.filter((p) => p.district === district);
    const list = own.length ? own : plazas;
    if (!list.length) return null;
    if (!near) return list[0];
    let best = list[0], bd = Infinity;
    for (const p of list) { const d = dist(centre(p), near); if (d < bd) { bd = d; best = p; } }
    return best;
  };
  const barracks = purposed.filter((p) => p.purpose.kind === 'security_station' || p.lot.family === 'detention');
  const temples = purposed.filter((p) => p.purpose.kind === 'temple_annex' || p.lot.family === 'temple');

  const people = [];
  const byLot = new Map();     // lot id -> people whose work OR home is the lot
  const byDistrict = new Map();
  const add = (p) => {
    p.id = people.length;
    people.push(p);
    for (const lid of new Set([p.work, p.home, p.meal, p.leisure].filter((v) => v !== null && v !== undefined))) {
      if (!byLot.has(lid)) byLot.set(lid, []);
      byLot.get(lid).push(p);
    }
    if (!byDistrict.has(p.district)) byDistrict.set(p.district, []);
    byDistrict.get(p.district).push(p);
    return p;
  };

  const makePerson = (rng, job, district, workLot, purpose, slot) => {
    const archetype = archetypeOf(job, district);
    const droid = DROID_ARCHETYPES.has(archetype);
    const female = !droid && rng.next() < 0.5;
    const name = droid ? droidName(rng, archetype) : personName(rng, female, job);
    const c = workLot ? centre(workLot) : { x: layout.plateau.cx, z: layout.plateau.cz };
    // home: one of the nearest housing lots (guards sleep in barracks, acolytes in the temple, droids power down at work)
    let home = null;
    if (droid) home = workLot ? workLot.id : null;
    else if ((job === 'guard' || job === 'senate guard' || job === 'warden') && barracks.length) home = nearest(barracks, c, 2)[Math.floor(rng.next() * Math.min(2, barracks.length))].lot.id;
    else if ((job === 'acolyte' || job === 'jedi') && temples.length) home = nearest(temples, c, 1)[0].lot.id;
    else if (purpose && (purpose.kind === 'apartments' || purpose.kind === 'hotel') && (job === 'resident' || job === 'guest')) home = workLot.id;
    else if (housing.length) { const near = nearest(housing, c, 6, workLot ? workLot.id : -1); home = near[Math.floor(rng.next() * near.length)].lot.id; }
    const plaza = plazaOf(district, c);
    let meal = null;
    if (!droid && food.length) { const near = nearest(food, c, 4, workLot ? workLot.id : -1); meal = near[Math.floor(rng.next() * near.length)].lot.id; }
    // a third of the workers eat outdoors on the district plaza when it is close (the lunch crowd of rubric row 10)
    if (!droid && plaza && rng.next() < 0.34 && dist(centre(plaza), c) < 140) meal = plaza.id;
    let leisureLot = plaza ? plaza.id : null;
    if (rng.next() < 0.45 && leisure.length) { const near = nearest(leisure, c, 5, workLot ? workLot.id : -1); leisureLot = near[Math.floor(rng.next() * near.length)].lot.id; }
    return {
      key: rng.s >>> 0, name, female, job, archetype, droid, variant: Math.floor(rng.next() * 8), scale: job === 'child' ? 0.72 : 1,
      district, work: workLot ? workLot.id : null, workRooms: null, home, meal, leisure: leisureLot, plaza: plaza ? plaza.id : null,
      shift: purpose ? shiftFor(purpose, slot) : 'day', offset: Math.round((rng.next() - 0.5) * 90), // minutes
      mealShift: +(rng.next() * 1.5).toFixed(2),  // lunch spreads over 12:00..14:30 so the cafs never fill all at once
      visitor: VISITOR_JOBS.has(job), street: false, slot,
    };
  };

  // 1. role slots of every purposed lot
  for (const { lot, purpose } of purposed) {
    let slot = 0;
    for (const role of purpose.roles) {
      for (let i = 0; i < role.count; i++, slot++) {
        const rng = new RNG(mix(seed + 101, lot.id, slot));
        const p = makePerson(rng, role.job, lot.district || 'residential', lot, purpose, slot);
        p.workRooms = role.rooms;
        add(p);
      }
    }
  }
  // 2. street life per district
  for (const d of layout.districts) {
    const prof = DISTRICT_PROFILE[d.kind];
    const mixList = STREET_MIX[d.kind];
    if (!prof || !mixList) continue;
    if (d.kind === 'spaceport') {
      // the spaceport has no lots of its own (pads, terminal and hangar are one structure): its crews live, eat and
      // work inside the port (port.js supplies the spots), so they never need the city's streets
      for (let i = 0; i < PORT_CROWD; i++) {
        const rng = new RNG(mix(seed + 202, d.id, i));
        const job = pickWeighted(mixList, rng);
        const p = makePerson(rng, job, d.kind, null, null, i);
        p.work = PORT; p.home = PORT; p.meal = PORT; p.leisure = PORT; p.plaza = PORT; p.port = true; p.street = false;
        p.shift = i % 3 === 2 ? 'night' : 'day';
        add(p);
      }
      continue;
    }
    // every plaza draws its own regulars on top of the district's density; the Senate plaza is the busiest
    const anchor = plazaOf(d.kind) || usable.find((l) => l.district === d.kind) || null;
    const n = Math.max(8, Math.round(STREET_BASE * prof.density)) + (anchor && anchor.kind === 'plaza' ? (PLAZA_REGULARS[d.kind] || PLAZA_REGULARS.default) : 0);
    const anchorLot = anchor;
    const cands = purposed.filter((p) => p.lot.district === d.kind);
    // the undercity strip (Uscru) is the nightlife hub: most of its district's street people hang around its streets
    const strip = usable.find((l) => l.family === 'underworld' && l.district === d.kind) || null;
    for (let i = 0; i < n; i++) {
      const rng = new RNG(mix(seed + 202, d.id, i));
      const job = pickWeighted(mixList, rng);
      // street people "work" outdoors; guards post at the district's most civic lot, vendors at the market stalls
      let post = anchorLot;
      if ((job === 'senate guard' || job === 'security officer' || job === 'bouncer') && cands.length) {
        const civic = cands.filter((c) => c.purpose.category === 'government' || c.purpose.category === 'security' || c.lot.kind === 'landmark');
        post = (civic.length ? civic : cands)[Math.floor(rng.next() * (civic.length ? civic.length : cands.length))].lot;
      } else if (strip && rng.next() < 0.6) post = strip;
      else if (cands.length && rng.next() < 0.4) post = cands[Math.floor(rng.next() * cands.length)].lot;
      const p = makePerson(rng, job, d.kind, post, null, i);
      p.street = true;
      // the entertainment and market districts run on nightlife: half their street people work the night shift
      const nightlife = d.kind === 'entertainment' || d.kind === 'market';
      p.shift = job === 'bounty hunter' || job === 'patron' || job === 'musician' || job === 'bouncer' ? 'evening' : ((nightlife ? i % 2 === 1 : i % 4 === 3) ? 'night' : 'day');
      // street people mostly eat outdoors too (vendor stalls, plaza benches): the lunch crowd stays on the plaza
      if (!p.droid && p.plaza != null && rng.next() < 0.7) p.meal = p.plaza;
      add(p);
    }
  }

  const stats = { people: people.length, lots: purposed.length, housing: housing.length, food: food.length, leisure: leisure.length, plazas: plazas.length, street: people.filter((p) => p.street).length, droids: people.filter((p) => p.droid).length, byArchetype: {}, byDistrict: {}, roomStaff: 0 };
  for (const p of people) { stats.byArchetype[p.archetype] = (stats.byArchetype[p.archetype] || 0) + 1; stats.byDistrict[p.district] = (stats.byDistrict[p.district] || 0) + 1; }

  // 3. room occupants (rubric row 3): every room of a building has its own deterministic people - the clerks of
  // this office, the senators of these pods, the family of that apartment - created the first time the player is on
  // the room's floor (the runtime asks per room; the offline scripts call it directly). Seeded from (layout seed,
  // lot id, room index, k), so the same room always has the same occupants. Returns the new people ([] when done).
  const staffed = new Set();
  const staffRoom = (lot, room, roomIndex, seats = 0, beds = 0, works = 0) => {
    const key = lot.id + ':' + roomIndex;
    if (staffed.has(key)) return [];
    staffed.add(key);
    const jobs = roomStaff(room.kind, seats, beds, works);
    const purpose = purposeFor(lot, layout);
    const out = [];
    for (let k = 0; k < jobs.length; k++) {
      const rng = new RNG(mix(seed + 303, lot.id * 4096 + roomIndex, k));
      const p = makePerson(rng, jobs[k], lot.district || 'residential', lot, purpose, 1000 + roomIndex * 64 + k);
      p.workRooms = [room.kind];
      p.room = { index: roomIndex, kind: room.kind, x: room.x, y: room.y, z: room.z, w: room.w, d: room.d };
      p.roomStaff = true;
      // residents, guests and patients of a bedroom live in it: home is this lot, the bed is picked inside the room
      if (VISITOR_JOBS.has(p.job) && roomFunction(room.kind).beds) p.home = lot.id;
      add(p);
      out.push(p);
    }
    stats.roomStaff += out.length;
    stats.people = people.length;
    return out;
  };
  return { people, byLot, byDistrict, purposed, housing, food, leisure, plazas, stats, staffRoom, staffed };
}

// ---------------------------------------------------------------------------------------------- schedules (row 6)
// Activity of a person at `hour` (0..24): { act: 'sleep'|'home'|'work'|'meal'|'leisure', lot } where lot is the lot
// id the activity happens in (null = the district streets / plaza when no lot applies). Day: home -> work -> meal ->
// work -> leisure -> home, shifted by the person's offset and their shift (day / evening / night).
export function activityAt(p, hour) {
  const h = ((hour + p.offset / 60) % 24 + 24) % 24;
  let seg;
  if (p.shift === 'night') {
    seg = h < 4.5 ? 'work' : h < 5.5 ? 'meal' : h < 6.5 ? 'leisure' : h < 8 ? 'home' : h < 15.5 ? 'sleep' : h < 17 ? 'home' : h < 19.5 ? 'leisure' : h < 23.5 ? 'work' : 'meal';
  } else if (p.shift === 'evening') {
    seg = h < 3 ? 'work' : h < 4 ? 'home' : h < 11 ? 'sleep' : h < 12.5 ? 'home' : h < 14 ? 'meal' : h < 16 ? 'leisure' : 'work';
  } else if (p.visitor) {
    // customers: a morning at home, out and about, at the venue in the afternoon / evening, home late
    seg = h < 6.5 ? 'sleep' : h < 9.5 ? 'home' : h < 11.5 ? 'leisure' : h < 12.5 ? 'meal' : h < 17.5 ? 'work' : h < 19.5 ? 'meal' : h < 22 ? 'work' : h < 23.5 ? 'home' : 'sleep';
  } else {
    const m = 12 + (p.mealShift || 0);
    seg = h < 6 ? 'sleep' : h < 7.5 ? 'home' : h < m ? 'work' : h < m + 1 ? 'meal' : h < 17.5 ? 'work' : h < 21 ? 'leisure' : h < 23 ? 'home' : 'sleep';
  }
  if (seg === 'sleep' || seg === 'home') return { act: seg, lot: p.home };
  if (seg === 'work') return { act: 'work', lot: p.work };
  if (seg === 'meal') return { act: 'meal', lot: p.meal ?? p.home };
  return { act: 'leisure', lot: p.leisure ?? p.plaza };
}
