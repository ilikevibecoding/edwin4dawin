// Working animations and job behaviours (rubric 07 row 7): which pose a citizen plays at a spot (typing at consoles,
// serving, sweeping, welding with sparks, guarding, sleeping, eating, browsing) and the small side trips that make a
// workplace look alive - tray runs from the counter to the tables, crate carries at the docks, cooks moving between
// the stove and the counter. Guards stand at attention and turn toward the player within six blocks.
import { MODE } from './crowd.js';
import { roomFunction } from './rooms.js';
import { shipOnPad } from './port.js';

export const IDLE_MODE = {
  typing: MODE.TYPING, serving: MODE.SERVING, sweeping: MODE.SWEEPING, welding: MODE.WELDING, sleeping: MODE.SLEEPING, eating: MODE.EATING,
  browsing: MODE.BROWSING, guarding: MODE.GUARD, sitting: MODE.SITTING, standing: MODE.IDLE, talking: MODE.TALKING, dancing: MODE.DANCING,
  watching: MODE.WATCHING, exercising: MODE.EXERCISING, meditating: MODE.MEDITATING, waiting: MODE.WAITING, tending: MODE.TENDING,
  speaking: MODE.SPEAKING, carry: MODE.CARRY,
};
const SITTING_MODES = new Set([MODE.SITTING, MODE.EATING, MODE.MEDITATING]);

// staff job -> what they do at their spot (the room's own idle wins when the job is not listed)
export const JOB_IDLE = {
  clerk: 'typing', executive: 'typing', teller: 'typing', advocate: 'typing', aide: 'typing', senator: 'speaking', journalist: 'typing', archivist: 'typing',
  librarian: 'browsing', teacher: 'speaking', receptionist: 'serving', concierge: 'serving', broker: 'typing', comms: 'typing', operator: 'typing', technician: 'typing',
  projectionist: 'typing', dj: 'typing', judge: 'sitting', witness: 'sitting', speaker: 'speaking', attendant: 'serving', curator: 'speaking', guide: 'speaking',
  guard: 'guarding', 'senate guard': 'guarding', officer: 'guarding', bouncer: 'guarding', 'customs officer': 'guarding', 'vault guard': 'guarding', warden: 'guarding',
  'security officer': 'guarding', conductor: 'guarding', quartermaster: 'tending',
  cook: 'tending', server: 'serving', barista: 'serving', bartender: 'serving', 'waitress droid': 'serving', vendor: 'serving', shopkeeper: 'serving', tailor: 'tending', pharmacist: 'serving',
  medic: 'tending', nurse: 'tending', surgeon: 'tending', gardener: 'tending', 'maintenance droid': 'sweeping', 'sweeper droid': 'sweeping', porter: 'carry',
  mechanic: 'welding', 'droid tech': 'welding', engineer: 'typing', smelter: 'welding', astromech: 'tending', 'dock worker': 'carry', 'cargo droid': 'carry', stock: 'tending', foreman: 'typing',
  'deck officer': 'typing', pilot: 'watching', musician: 'dancing', 'protocol droid': 'talking', courier: 'waiting', tourist: 'watching', 'bounty hunter': 'waiting',
  jedi: 'meditating', acolyte: 'meditating', trainer: 'exercising', passenger: 'sitting', patron: 'eating', shopper: 'browsing', resident: 'sitting', guest: 'sitting', child: 'dancing', patient: 'sleeping', visitor: 'browsing',
};
export const PLAZA_IDLES = ['waiting', 'talking', 'watching', 'browsing', 'talking', 'speaking'];
const WELDERS = new Set(['mechanic', 'droid tech', 'smelter', 'astromech']);
const SERVERS = new Set(['server', 'waitress droid', 'barista', 'bartender']);
const CARRIERS = new Set(['dock worker', 'cargo droid', 'porter', 'stock', 'quartermaster']);
export const GUARDS = new Set(['guard', 'senate guard', 'officer', 'bouncer', 'customs officer', 'vault guard', 'warden', 'security officer', 'conductor']);

// Pose for a citizen who has arrived at `spot` for `act`: { mode, sitting, lying }.
export function poseAt(npc, act, spot, li, hour) {
  const p = npc.person, job = p.job;
  const room = spot && spot.room ? roomFunction(spot.room.kind) : null;
  const seat = spot && (spot.kind === 'seat' || spot.seat);
  let idle;
  if (act === 'sleep') idle = p.droid ? 'waiting' : (spot && (spot.kind === 'bed' || spot.mode === 'sleeping') ? 'sleeping' : 'sitting');
  else if (act === 'home') idle = p.droid ? 'waiting' : seat ? 'sitting' : (spot && spot.kind === 'bed') ? 'sleeping' : 'browsing';
  else if (act === 'meal') idle = seat ? 'eating' : (spot && spot.mode) || 'talking';
  else if (act === 'leisure') idle = spot && spot.mode ? spot.mode : room && room.visitors ? room.visitors : PLAZA_IDLES[(p.key + Math.floor(hour * 2)) % PLAZA_IDLES.length];
  else { // work
    const outdoors = spot && (spot.kind === 'street' || spot.kind === 'plaza');
    if (spot && spot.mode) idle = spot.mode;
    else if (outdoors) idle = job === 'sweeper droid' ? 'sweeping' : GUARDS.has(job) ? 'guarding' : job === 'vendor' ? 'serving' : job === 'tourist' ? 'watching' : job === 'courier' ? 'waiting' : job === 'child' ? 'dancing' : job === 'jedi' || job === 'acolyte' ? 'waiting' : PLAZA_IDLES[(p.key >> 3) % PLAZA_IDLES.length];
    else if (p.visitor) idle = room && room.visitors ? room.visitors : 'browsing';
    else idle = JOB_IDLE[job] || (room ? room.idle : 'standing');
    // welding on an empty pad makes no sense: check the console instead
    if (idle === 'welding' && spot && spot.pad !== undefined && npc.pop && !shipOnPad(npc.pop.game.shipTraffic, spot.pad)) idle = 'tending';
  }
  if (p.droid && p.archetype !== 'protocol droid' && (idle === 'sitting' || idle === 'eating' || idle === 'sleeping' || idle === 'dancing' || idle === 'exercising' || idle === 'meditating')) idle = 'waiting';
  const mode = IDLE_MODE[idle] ?? MODE.IDLE;
  return { mode, sitting: SITTING_MODES.has(mode) && !!(seat || act === 'meal' || act === 'home'), lying: mode === MODE.SLEEPING && !p.droid && !!(spot && (spot.kind === 'bed' || spot.mode === 'sleeping')) };
}

// Per-second job behaviour while parked at a work spot. Returns an errand request { target, mode, waitS } when the
// worker should take a short side trip, else null. `cells(kind)` yields candidate cells in the same lot/floor.
export function jobErrand(npc, cells, rng) {
  const job = npc.person.job;
  if (SERVERS.has(job) && rng() < 0.05) { const t = cells('meal'); if (t) return { target: t, mode: MODE.CARRY, waitS: 2.5 + rng() * 2, tag: 'tray' }; }
  if (CARRIERS.has(job) && rng() < 0.06) { const t = cells('near'); if (t) return { target: t, mode: MODE.CARRY, waitS: 1.5 + rng() * 2, tag: 'crate' }; }
  if (job === 'cook' && rng() < 0.035) { const t = cells('near'); if (t) return { target: t, mode: null, waitS: 4 + rng() * 4, tag: 'stove' }; }
  if ((job === 'medic' || job === 'nurse') && rng() < 0.03) { const t = cells('near'); if (t) return { target: t, mode: null, waitS: 4 + rng() * 4, tag: 'rounds' }; }
  if ((job === 'mechanic' || job === 'droid tech') && rng() < 0.02) { const t = cells('near'); if (t) return { target: t, mode: null, waitS: 8 + rng() * 6, tag: 'tools' }; }
  return null;
}

// Welding sparks: a short burst of bright chips from the torch (0.6 blocks ahead of the hands). Uses the game's
// particle system (kind 0 = gravity chips) forced to full light so they glow in dark hangars.
export function sparks(particles, npc, rng) {
  if (!particles) return;
  const dx = Math.sin(npc.yaw), dz = Math.cos(npc.yaw);
  const x = npc.pos.x + dx * 0.55, y = npc.pos.y + 0.75, z = npc.pos.z + dz * 0.55;
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const before = particles.count;
    const hot = rng() < 0.4;
    particles.spawn(x, y, z, (rng() - 0.5) * 2.4 + dx * 0.8, 1.2 + rng() * 2.4, (rng() - 0.5) * 2.4 + dz * 0.8, 0.045 + rng() * 0.03, 0.25 + rng() * 0.35, 0, [0, 0, 0, 1], hot ? [1, 0.95, 0.75] : [1, 0.55, 0.15], 1);
    if (particles.count > before) { const k = particles.count - 1; particles.light[k * 2] = 1; particles.light[k * 2 + 1] = 1; }
  }
}

export function isWelder(job) { return WELDERS.has(job); }
export function isGuard(job) { return GUARDS.has(job); }
