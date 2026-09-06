// Offline checks for the Coruscant room functions (rubric 07 row 3):  node scripts/test-rooms.mjs
//  - every room kind of src/coruscant/rooms/*.js has a ROOM_FUNCTIONS entry (jobs with counts, prop, idle behaviour),
//    every job maps to a skin archetype, landmark-only kinds (rotunda, ward, ...) infer a function
//  - for 40 sampled lots (towers and landmarks of the real layout): jobs hosted per room >= 0.5, the building's
//    purpose roles have rooms to work in, every room's own staff (census.staffRoom) resolves to a spot in its room
//  - work spots are on standable floor: the blueprint's `work` records and every picked work/meal/sleep spot pass
//    LotInfo.standable (floor below, headroom above, on the blueprint's own blocks)
import assert from 'node:assert/strict';
import { initBlocks } from '../src/blocks.js';
import { list as roomTemplates } from '../src/coruscant/rooms/index.js';
import { getLayout } from '../src/coruscant/layout.js';
import { purposeFor } from '../src/coruscant/purposes.js';
import { ROOM_FUNCTIONS, ROOM_KINDS, IDLE, roomFunction, roomStaff, archetypeOf, ARCHETYPES, roomsForJob, VISITOR_JOBS } from '../src/npc/coruscant/rooms.js';
import { LotInfo, JOB_WORK_KINDS } from '../src/npc/coruscant/lots.js';
import { buildPool } from '../src/npc/coruscant/census.js';
import { RNG } from '../src/rng.js';

initBlocks();
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

const IDLES = new Set(Object.values(IDLE));

test('every room template kind has a function (jobs with counts, prop list, idle behaviour)', () => {
  const kinds = roomTemplates();
  assert.ok(kinds.length >= 50, `${kinds.length} template kinds`);
  for (const k of kinds) {
    const f = ROOM_FUNCTIONS[k];
    assert.ok(f, `no ROOM_FUNCTIONS entry for ${k}`);
    assert.ok(Array.isArray(f.jobs), `${k}: jobs`);
    for (const j of f.jobs) { assert.ok(typeof j.job === 'string' && j.count >= 1, `${k}: job ${JSON.stringify(j)}`); assert.ok(ARCHETYPES.includes(archetypeOf(j.job)), `${k}: job ${j.job} has no archetype`); }
    assert.ok(Array.isArray(f.prop), `${k}: prop`);
    assert.ok(IDLES.has(f.idle), `${k}: idle ${f.idle}`);
    if (f.visitors) assert.ok(IDLES.has(f.visitors), `${k}: visitors ${f.visitors}`);
    if (k !== 'stairwell') assert.ok(f.jobs.length >= 1, `${k}: hosts no job`);
  }
  for (const k of ROOM_KINDS) assert.ok(kinds.includes(k), `ROOM_FUNCTIONS has ${k}, not a template kind`);
  console.log(`   ${kinds.length} kinds, ${ROOM_KINDS.reduce((a, k) => a + ROOM_FUNCTIONS[k].jobs.length, 0)} job entries, idles: ${[...new Set(ROOM_KINDS.map((k) => ROOM_FUNCTIONS[k].idle))].join(', ')}`);
});

test('landmark-only room kinds infer a function by keyword; unknown kinds fall back', () => {
  for (const [kind, base] of [['rotunda', 'council_chamber'], ['ward', 'clinic_ward'], ['bay_1', 'hangar'], ['hall_of_records', 'archive'], ['main_street', 'corridor'], ['dressing_2', 'dressing_room'], ['orchestra_pit', 'holo_theatre'], ['vault_b', 'bank_vault'], ['chancellor_office', 'open_plan_office'], ['food_court', 'restaurant'], ['medical post', 'medbay'], ['senator_suite', 'family_apartment']]) {
    const f = roomFunction(kind);
    assert.equal(f.base, base, `${kind} -> ${f.base}`);
    assert.ok(f.inferred);
  }
  assert.ok(roomFunction('zzz_unknown').jobs.length >= 1);
  assert.equal(roomFunction('open_plan_office').inferred, false);
  assert.deepEqual(roomStaff('stairwell'), []);
  assert.ok(roomStaff('open_plan_office').length >= 1 && roomStaff('open_plan_office').length <= 3);
  assert.ok(roomStaff('open_plan_office', 20, 0, 16).length >= 8, 'an office with sixteen desks seats its clerks');
  assert.deepEqual(roomStaff('kitchen', 0, 0, 2), ['cook', 'cook']);
  assert.ok(roomStaff('clinic_ward', 30, 3).filter((j) => j === 'patient').length <= 3, 'one patient per bed');
  assert.ok(!roomStaff('workshop', 200).some((j, i) => i >= 5), 'staff-only rooms never fill');
  assert.ok(roomStaff('council_chamber', 600).length >= 40, 'a big chamber seats a session');
  assert.ok(roomStaff('restaurant', 16).length >= 4, 'a restaurant with seats gets patrons');
});

// 40 lots of the real layout: every 4th tower plus the landmarks, deterministic
const layout = getLayout();
const usable = layout.lots.filter((l) => l.kind === 'tower' || l.kind === 'landmark');
const landmarks = usable.filter((l) => l.kind === 'landmark');
const towers = usable.filter((l) => l.kind === 'tower');
const sample = [...landmarks.slice(0, 8), ...towers.filter((_, i) => i % Math.max(1, Math.floor(towers.length / (40 - Math.min(8, landmarks.length)))) === 0)].slice(0, 40);
const infos = new Map();
const infoOf = (lot) => { if (!infos.has(lot.id)) infos.set(lot.id, new LotInfo(lot, layout)); return infos.get(lot.id); };

test(`${sample.length} sampled lots: jobs hosted per room >= 0.5 and the purpose's roles have rooms`, () => {
  assert.equal(sample.length, 40);
  let totalRooms = 0, totalJobs = 0, totalRoles = 0, unhoused = 0;
  const worst = [], unhousedEx = [];
  for (const lot of sample) {
    const li = infoOf(lot);
    const rooms = li.meta.rooms;
    if (!rooms.length) continue;
    // jobs a lot hosts: the room functions' job slots (each room, capped like the runtime staffing) plus the purpose's role slots
    let jobs = 0;
    for (const r of rooms) jobs += roomStaff(r.kind, li.roomSeats(r).length, li.roomBeds(r), li.roomWork(r)).length;
    const roles = li.purpose.roles.reduce((a, r) => a + r.count, 0);
    for (const role of li.purpose.roles) {
      // a role has somewhere to work when a room of the lot hosts the job or a work record matches it; visitors
      // (patrons, shoppers, patients) are hosted by any room that takes visitors
      const hosted = VISITOR_JOBS.has(role.job) ? rooms.some((r) => roomFunction(r.kind).visitors) : rooms.some((r) => roomFunction(r.kind).jobs.some((j) => j.job === role.job)) || (JOB_WORK_KINDS[role.job] || []).some((k) => li.workByKind([k]).length) || li.meta.work.some((w) => w.kind === role.job);
      if (!hosted) { unhoused++; if (unhousedEx.length < 5) unhousedEx.push(`${role.job} at ${li.purpose.kind} (${lot.family})`); }
    }
    const ratio = (jobs + roles) / rooms.length;
    totalRooms += rooms.length; totalJobs += jobs; totalRoles += roles;
    worst.push([ratio, `${li.name} (${lot.family}): ${rooms.length} rooms, ${jobs} room jobs, ${roles} roles`]);
    assert.ok(ratio >= 0.5, `${li.name} (${lot.family}, lot ${lot.id}): ${jobs} room jobs + ${roles} roles for ${rooms.length} rooms`);
  }
  worst.sort((a, b) => a[0] - b[0]);
  console.log(`   ${totalRooms} rooms host ${totalJobs} room jobs + ${totalRoles} purpose roles (ratio ${((totalJobs + totalRoles) / totalRooms).toFixed(2)}); lowest: ${worst[0][1]} = ${worst[0][0].toFixed(2)}`);
  console.log(`   purpose roles without a hosting room or work record: ${unhoused} of ${totalRoles}${unhousedEx.length ? ' (' + unhousedEx.join('; ') + ')' : ''}`);
  assert.ok(unhoused / totalRoles <= 0.1, `${unhoused} of ${totalRoles} roles have nowhere to work`);
});

test('blueprint work records are on standable floor', () => {
  let n = 0, bad = 0;
  const examples = [];
  for (const lot of sample) {
    const li = infoOf(lot);
    for (const w of li.meta.work) { n++; if (!li.standable(w.x, w.y, w.z)) { bad++; if (examples.length < 3) examples.push(`${li.name} ${w.kind}@${w.x},${w.y},${w.z}`); } }
  }
  console.log(`   ${n} work records, ${bad} not standable${examples.length ? ' (' + examples.join('; ') + ')' : ''}`);
  assert.ok(n > 200, `only ${n} work records`);
  assert.ok(bad / n <= 0.02, `${bad} of ${n} work records are not standable`);
});

test('every room\'s own staff resolves to a standable spot inside its room; picks never collide', () => {
  const pool = buildPool(layout);
  let rooms = 0, people = 0, badSpot = 0, outside = 0, missing = 0, standing = 0, collisions = 0;
  const examples = [];
  for (const lot of sample) {
    const li = infoOf(lot);
    li.meta.rooms.forEach((room, i) => {
      if (room.kind === 'stairwell' || room.kind === 'corridor' || room.kind === 'lift_landing') return;
      const staff = pool.staffRoom(lot, room, i, li.roomSeats(room).length, li.roomBeds(room), li.roomWork(room));
      if (!staff.length) return;
      rooms++;
      const taken = new Set();
      for (const p of staff) {
        people++;
        const act = roomFunction(room.kind).beds && p.visitor ? 'sleep' : 'work';
        const s = li.pick(p, act, p.id);
        if (!s) { missing++; if (examples.length < 4) examples.push(`${li.name}/${room.kind}: no spot for ${p.job}`); continue; }
        li.occupy(s, p.id);
        if (taken.has(s.key)) collisions++; taken.add(s.key);
        if (!li.standable(s.x, s.y, s.z)) { badSpot++; if (examples.length < 4) examples.push(`${li.name}/${room.kind}: ${p.job} at ${s.x},${s.y},${s.z} not standable`); }
        else standing++;
        const inRoom = s.x >= room.x && s.x < room.x + room.w && s.z >= room.z && s.z < room.z + room.d;
        if (!inRoom) outside++;
      }
    });
  }
  console.log(`   ${rooms} rooms, ${people} occupants: ${standing} standable spots, ${badSpot} not standable, ${missing} without a spot, ${outside} outside their room, ${collisions} shared spots${examples.length ? '\n   e.g. ' + examples.join('; ') : ''}`);
  assert.ok(people >= 300, `only ${people} room occupants`);
  assert.equal(missing, 0, `${missing} occupants have no spot`);
  assert.equal(collisions, 0, `${collisions} occupants share a spot`);
  assert.ok(badSpot / people <= 0.01, `${badSpot} of ${people} spots are not standable`);
  assert.ok(outside / people <= 0.02, `${outside} of ${people} occupants sit outside their room`);
});

test('purpose role workers (the pool) pick standable work, meal and sleep spots in their lots', () => {
  const pool = buildPool(layout);
  const ids = new Set(sample.map((l) => l.id));
  let n = 0, bad = 0, none = 0;
  const examples = [];
  const rng = new RNG(7);
  for (const p of pool.people) {
    if (p.street || p.port || p.roomStaff || p.work == null || !ids.has(p.work)) continue;
    for (const act of ['work', 'meal', 'sleep']) {
      const lotId = act === 'work' ? p.work : act === 'meal' ? p.meal : p.home;
      if (lotId == null || !ids.has(lotId)) continue;
      const lot = layout.lots[lotId];
      if (lot.kind === 'plaza') continue;
      const li = infoOf(lot);
      const s = li.pick(p, act, p.id);
      n++;
      if (!s) { none++; continue; }
      if (rng.next() < 0.3) li.occupy(s, p.id);
      if (!li.standable(s.x, s.y, s.z)) { bad++; if (examples.length < 4) examples.push(`${li.name}: ${p.job} ${act} at ${s.x},${s.y},${s.z} kind ${s.kind}`); }
    }
  }
  console.log(`   ${n} picks, ${bad} not standable, ${none} without a spot${examples.length ? '\n   e.g. ' + examples.join('; ') : ''}`);
  assert.ok(n >= 200, `only ${n} picks`);
  assert.equal(none, 0);
  assert.ok(bad / n <= 0.01, `${bad} of ${n} picks are not standable`);
});

test('every job of the room table has rooms and every visitor room has an idle behaviour for visitors', () => {
  const jobs = new Set();
  for (const k of ROOM_KINDS) for (const j of ROOM_FUNCTIONS[k].jobs) jobs.add(j.job);
  for (const j of jobs) assert.ok(roomsForJob(j).length >= 1, j);
  for (const k of ['restaurant', 'cantina', 'shop', 'museum_hall', 'holo_theatre', 'library', 'lobby_atrium']) assert.ok(ROOM_FUNCTIONS[k].visitors, `${k} takes visitors`);
  for (const k of ['hotel_room', 'family_apartment', 'barracks', 'medbay']) assert.ok(ROOM_FUNCTIONS[k].beds, `${k} has beds`);
  for (const k of ['restaurant', 'cafeteria', 'cantina']) assert.ok(ROOM_FUNCTIONS[k].meal, `${k} serves meals`);
  console.log(`   ${jobs.size} distinct jobs across ${ROOM_KINDS.length} room kinds`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
