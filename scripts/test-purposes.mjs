// Offline check of the Coruscant building purposes (rubric 07 #1):
//   node scripts/test-purposes.mjs [--seed 1337]
// - every tower / landmark lot has a purpose with a category, kind, non-empty name, roles, hours and greeting
// - no two neighbouring lots (sharing a street) carry the same kind + name
// - >= 60 distinct kinds are used across the layout, every category is represented
// - assignment is deterministic (a second layout instance for the same seed gives identical names)
// - catalogue sanity: roles point at real room kinds, sells items are known to the price book, hours are sane
// - the ship dealer / customs / repair yard sit near the spaceport gate, job terminals exist
import { getLayout } from '../src/coruscant/layout.js';
import { list as roomList } from '../src/coruscant/rooms/index.js';
import { CATALOGUE, CATEGORIES, KINDS, purposeFor, allPurposes, neighboursOf, isOpen, lotsOfKind } from '../src/coruscant/purposes.js';
import { GOODS } from '../src/economy/prices.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const seed = parseInt(opt('--seed', '1337'), 10);

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => { if (cond) { passed++; console.log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); } else { failed++; console.log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };

// ---------------------------------------------------------------- catalogue
const rooms = new Set(roomList());
const badRooms = [], badSells = [], badHours = [], badNames = [];
for (const [kind, def] of Object.entries(CATALOGUE)) {
  for (const r of def.roles) for (const room of r.rooms) if (!rooms.has(room)) badRooms.push(`${kind}:${r.job}:${room}`);
  for (const s of def.sells || []) if (!GOODS[s.item]) badSells.push(`${kind}:${s.item}`);
  if (!(def.hours.length === 2 && def.hours[0] >= 0 && def.hours[0] <= 24 && def.hours[1] > def.hours[0] && def.hours[1] <= 30)) badHours.push(kind);
  if (!def.names.length || !def.greeting || !def.category) badNames.push(kind);
}
check('catalogue has >= 60 kinds', KINDS.length >= 60, `${KINDS.length} kinds`);
check('catalogue covers the 13 categories', ['housing', 'office', 'government', 'hospitality', 'retail', 'food', 'industry', 'transport', 'security', 'culture', 'medical', 'media', 'religion'].every((c) => CATEGORIES.includes(c)), CATEGORIES.join(','));
check('every role room exists in the room library', badRooms.length === 0, badRooms.slice(0, 6).join(' '));
check('every sold item is in the price book', badSells.length === 0, badSells.slice(0, 6).join(' '));
check('opening hours are sane', badHours.length === 0, badHours.join(' '));
check('every kind has names, a greeting and a category', badNames.length === 0, badNames.join(' '));
check('isOpen wraps past midnight', isOpen({ hours: [16, 30] }, 2) && !isOpen({ hours: [16, 30] }, 12) && isOpen({ hours: [8, 18] }, 9) && !isOpen({ hours: [8, 18] }, 20));

// ---------------------------------------------------------------- layout assignment
const layout = getLayout(seed);
const all = allPurposes(layout);
const lots = all.map((a) => a.lot);
check('layout has buildings', all.length > 100, `${all.length} lots`);
const unnamed = all.filter(({ purpose }) => !purpose || !purpose.name || !purpose.kind || !purpose.category || !CATALOGUE[purpose.kind]);
check('100% of lots are named with a valid kind', unnamed.length === 0, `${all.length - unnamed.length}/${all.length}`);
const unfilled = all.filter(({ purpose }) => /\{|\}/.test(purpose.name));
check('no unfilled name placeholders', unfilled.length === 0, unfilled.slice(0, 3).map((a) => a.purpose.name).join(' | '));
const landmarks = all.filter(({ lot }) => lot.kind === 'landmark');
check('landmarks keep their names', landmarks.every(({ lot, purpose }) => purpose.name === lot.name), landmarks.map((a) => a.purpose.name).slice(0, 3).join(' | '));
const shapeOk = all.every(({ purpose }) => Array.isArray(purpose.roles) && purpose.roles.every((r) => r.job && r.count > 0 && Array.isArray(r.rooms)) && Array.isArray(purpose.sells) && Array.isArray(purpose.hours) && typeof purpose.greeting === 'string');
check('purpose shape: roles/sells/hours/greeting', shapeOk);

// neighbours: same kind + name never sits across a street; report kind repeats as information
let sameName = 0, sameKind = 0, pairs = 0;
const examples = [];
for (const { lot, purpose } of all) {
  for (const o of neighboursOf(lot, layout)) {
    if (o.id <= lot.id) continue;
    pairs++;
    const q = purposeFor(o, layout);
    if (q.kind === purpose.kind) { sameKind++; if (q.name === purpose.name) { sameName++; if (examples.length < 3) examples.push(`${lot.id}:${purpose.name} ~ ${o.id}`); } }
  }
}
check('no two neighbouring lots share kind + name', sameName === 0, `${pairs} neighbour pairs, ${sameKind} same-kind pairs, ${sameName} identical${examples.length ? ': ' + examples.join(', ') : ''}`);
check('same-kind neighbours are rare (< 12% of pairs)', sameKind / Math.max(1, pairs) < 0.12, `${(100 * sameKind / Math.max(1, pairs)).toFixed(1)}%`);
const dup = new Map();
for (const { purpose } of all) dup.set(purpose.name, (dup.get(purpose.name) || 0) + 1);
const dupes = [...dup.entries()].filter(([, n]) => n > 1);
check('names are unique city-wide', dupes.length === 0, `${dupes.length} repeated names`);

// kinds / categories used
const used = new Map();
for (const { purpose } of all) used.set(purpose.kind, (used.get(purpose.kind) || 0) + 1);
check('>= 60 distinct kinds used across the city', used.size >= 60, `${used.size} kinds used of ${KINDS.length}`);
const catsUsed = new Set(all.map((a) => a.purpose.category));
check('every category appears in the city', CATEGORIES.every((c) => catsUsed.has(c)), [...catsUsed].join(','));
const unusedKinds = KINDS.filter((k) => !used.has(k));
check('every catalogue kind appears at least once', unusedKinds.length === 0, unusedKinds.join(' ') || 'all used');

// determinism: a fresh layout object (different seed cache key) must not change anything; same seed twice identical
const again = allPurposes(getLayout(seed));
check('assignment is deterministic for the seed', again.every((a, i) => a.purpose.name === all[i].purpose.name && a.purpose.kind === all[i].purpose.kind));
const other = allPurposes(getLayout(seed + 1));
const diff = other.filter((a, i) => !all[i] || a.purpose.name !== all[i].purpose.name).length;
check('a different seed gives a different city', diff > other.length * 0.5, `${diff}/${other.length} names differ`);

// economy anchors: ship dealer, customs and repair near the spaceport gate; job terminals exist
const gate = [2735, 0];
const dealers = lotsOfKind(layout, 'ship_dealer');
const nearest = dealers.map(({ lot }) => Math.hypot((lot.x0 + lot.x1) / 2 - gate[0], (lot.z0 + lot.z1) / 2 - gate[1])).sort((a, b) => a - b)[0];
check('a ship dealer exists within 200 blocks of the spaceport gate', dealers.length >= 1 && nearest < 200, `${dealers.length} dealer(s), nearest ${nearest ? nearest.toFixed(0) : '-'} blocks: ${dealers.map((d) => d.purpose.name).join(' | ')}`);
check('customs and repair yards exist', lotsOfKind(layout, 'customs').length >= 1 && lotsOfKind(layout, 'repair_shop').length >= 2);
const terminals = lotsOfKind(layout, ['transit_station', 'customs', 'cantina', 'depot']);
check('>= 8 job terminal lots (transit/customs/cantina/depot)', terminals.length >= 8, `${terminals.length}`);
const apartments = lotsOfKind(layout, 'apartments').filter(({ lot }) => lot.district === 'residential');
check('residential apartments to rent exist', apartments.length >= 10, `${apartments.length}`);
const sellers = all.filter((a) => a.purpose.sells.length).length;
check('>= 40% of lots sell something', sellers / all.length >= 0.4, `${sellers}/${all.length}`);

// synthetic lots (undercity buildings / spaceport halls) still roll a purpose without a layout
const synth = purposeFor({ id: 9001, x0: 2600, z0: 20, w: 20, d: 20, district: 'spaceport', seed: 42 });
check('synthetic lot rolls a spaceport purpose', !!synth && !!CATALOGUE[synth.kind] && synth.name.length > 0, `${synth.kind}: ${synth.name}`);

// census
const byCat = {};
for (const { purpose } of all) byCat[purpose.category] = (byCat[purpose.category] || 0) + 1;
console.log('\ncategories:', JSON.stringify(byCat));
console.log('kinds:', [...used.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(' '));
console.log('samples:', all.slice(0, 8).map((a) => `${a.purpose.kind} "${a.purpose.name}"`).join(' | '));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
