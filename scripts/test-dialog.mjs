// Offline checks for the Coruscant dialog banks (rubric 07 row 8):  node scripts/test-dialog.mjs
//  - >= 20 lines per archetype, >= 400 job lines in total, every line <= 90 chars, no duplicate lines, no film quotes
//  - deterministic selection: same voice key -> same sequence; no repeat within the last 5 lines
//  - contextual lines fire for fake contexts (disaster, player reactions, vendor call-outs, time of day, gossip)
//  - directions name the nearest landmark of the real layout; vendors quote prices from purposeFor().sells
import assert from 'node:assert/strict';
import { JOB_LINES, TIME_LINES, GOSSIP, DISASTER_LINES, PLAYER_LINES, CALLOUTS } from '../src/npc/dialog/lines.js';
import { Voice, ambientLine, directionsLine, priceLine, workLine, allLines, periodOf, HISTORY, MAX_LINE, itemName } from '../src/npc/dialog/dialog.js';
import { ARCHETYPES } from '../src/npc/coruscant/rooms.js';
import { getLayout } from '../src/coruscant/layout.js';
import { purposeFor } from '../src/coruscant/purposes.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

// A handful of famous film lines that must not appear (the flavour rule: Star Wars, not quotes)
const FILM_QUOTES = ['i have a bad feeling', 'may the force be with you', 'these are not the droids', 'do or do not', 'i am your father', 'it\'s a trap', 'hello there', 'i have the high ground', 'no, i am your father', 'the force will be with you', 'help me obi-wan', 'never tell me the odds'];

const counts = {};
test('every archetype has >= 20 job lines and there are >= 400 in total', () => {
  let total = 0;
  for (const a of ARCHETYPES) {
    const n = (JOB_LINES[a] || []).length;
    counts[a] = n; total += n;
    assert.ok(n >= 20, `${a} has ${n} lines`);
  }
  for (const k of Object.keys(JOB_LINES)) assert.ok(ARCHETYPES.includes(k), `bank ${k} is not an archetype`);
  assert.ok(total >= 400, `total ${total}`);
  console.log(`   ${total} job lines across ${ARCHETYPES.length} archetypes: ` + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', '));
});

test('all lines <= 90 chars, non-empty, no duplicates, no film quotes', () => {
  const all = allLines();
  const seen = new Map();
  for (const { bank, line } of all) {
    assert.ok(typeof line === 'string' && line.trim().length > 0, `${bank}: empty line`);
    assert.ok(line.length <= MAX_LINE, `${bank}: ${line.length} chars: ${line}`);
    assert.ok(!seen.has(line), `${bank}: duplicate of ${seen.get(line)}: ${line}`);
    seen.set(line, bank);
    const low = line.toLowerCase();
    for (const q of FILM_QUOTES) assert.ok(!low.includes(q), `${bank}: film quote "${q}" in: ${line}`);
  }
  console.log(`   ${all.length} lines in all banks`);
});

test('time-of-day / gossip / disaster / player banks are complete', () => {
  for (const p of ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night']) assert.ok(TIME_LINES[p].length >= 5, p);
  for (const d of ['senate', 'financial', 'residential', 'industrial', 'entertainment', 'market', 'spaceport']) assert.ok(GOSSIP[d].length >= 5, d);
  for (const d of ['flood', 'tornado', 'beam', 'sky', 'panic']) assert.ok(DISASTER_LINES[d].length >= 4, d);
  for (const d of ['vandal', 'flying', 'bump', 'poke', 'greet']) assert.ok(PLAYER_LINES[d].length >= 5, d);
  assert.ok(CALLOUTS.length >= 8);
  assert.equal(periodOf(3), 'night'); assert.equal(periodOf(7), 'dawn'); assert.equal(periodOf(10), 'morning');
  assert.equal(periodOf(12.5), 'noon'); assert.equal(periodOf(16), 'afternoon'); assert.equal(periodOf(20), 'evening'); assert.equal(periodOf(23), 'night');
});

test('selection is deterministic per voice key and never repeats within the last 5 lines', () => {
  for (const a of ARCHETYPES) {
    const v1 = new Voice(1234 + a.length, a), v2 = new Voice(1234 + a.length, a);
    const s1 = [], s2 = [];
    for (let i = 0; i < 40; i++) { s1.push(ambientLine(v1, { hour: 12, district: 'financial' })); s2.push(ambientLine(v2, { hour: 12, district: 'financial' })); }
    assert.deepEqual(s1, s2, `${a}: non-deterministic`);
    for (let i = 0; i < s1.length; i++) {
      assert.ok(s1[i], `${a}: null line`);
      for (let j = Math.max(0, i - HISTORY); j < i; j++) assert.notEqual(s1[i], s1[j], `${a}: repeat within ${HISTORY}: ${s1[i]}`);
    }
  }
  const v3 = new Voice(99, 'vendor');
  const s3 = Array.from({ length: 10 }, () => ambientLine(v3, { hour: 12, district: 'market' }));
  const v4 = new Voice(98, 'vendor');
  const s4 = Array.from({ length: 10 }, () => ambientLine(v4, { hour: 12, district: 'market' }));
  assert.notDeepEqual(s3, s4, 'different keys should produce different sequences');
});

test('contextual lines fire for fake contexts', () => {
  const v = new Voice(7, 'office worker');
  assert.ok(DISASTER_LINES.flood.includes(ambientLine(v, { hour: 12, district: 'financial', disaster: 'flood' })));
  assert.ok(DISASTER_LINES.tornado.includes(ambientLine(v, { hour: 12, district: 'financial', disaster: 'tornado' })));
  assert.ok(DISASTER_LINES.beam.includes(ambientLine(v, { hour: 12, district: 'financial', disaster: 'beam' })));
  assert.ok(PLAYER_LINES.vandal.includes(ambientLine(v, { hour: 12, district: 'senate', player: 'vandal' })));
  assert.ok(PLAYER_LINES.flying.includes(ambientLine(v, { hour: 12, district: 'senate', player: 'flying' })));
  assert.ok(PLAYER_LINES.bump.includes(ambientLine(v, { hour: 12, district: 'senate', player: 'bump' })));
  assert.ok(PLAYER_LINES.poke.includes(ambientLine(v, { hour: 12, district: 'senate', player: 'poke' })));
  // over many steps a working vendor calls out, gossips about its district and mentions the time of day
  const vend = new Voice(3, 'vendor');
  const said = new Set(Array.from({ length: 200 }, () => ambientLine(vend, { hour: 22.5, district: 'market', vendor: true, working: true })));
  assert.ok(CALLOUTS.some((l) => said.has(l)), 'no vendor call-out in 200 lines');
  assert.ok(GOSSIP.market.some((l) => said.has(l)), 'no market gossip in 200 lines');
  assert.ok(TIME_LINES.night.some((l) => said.has(l)), 'no night line at 22:30 in 200 lines');
  assert.ok(JOB_LINES.vendor.some((l) => said.has(l)), 'no vendor job line');
  assert.ok(!TIME_LINES.noon.some((l) => said.has(l)), 'noon line at night');
});

test('directions name the nearest landmark of the real layout with a compass bearing', () => {
  const layout = getLayout();
  const v = new Voice(11, 'tourist');
  const line = directionsLine(v, layout, { x: 2975, z: 120 });
  assert.ok(line.includes('Galactic Senate'), line);
  assert.ok(/north|south|east|west/.test(line), line);
  assert.ok(!line.includes('{'), line);
  const line2 = directionsLine(v, layout, { x: 2975, z: 120 }, 0); // excluding the Senate itself
  assert.ok(!line2.includes('Galactic Senate') && !line2.includes('{'), line2);
  const line3 = directionsLine(v, layout, { x: 2600, z: -400 });
  assert.ok(line3.includes('Works'), line3);
});

test('vendors quote prices from purposeFor().sells; non-vendors decline', () => {
  const layout = getLayout();
  const lots = layout.lots.filter((l) => l.kind === 'tower');
  const shop = lots.map((l) => purposeFor(l, layout)).find((p) => p.sells && p.sells.length);
  assert.ok(shop, 'no lot sells anything');
  const v = new Voice(5, 'vendor');
  const line = priceLine(v, shop);
  assert.ok(!line.includes('{'), line);
  assert.ok(shop.sells.some((s) => line.includes(itemName(s.item)) && line.includes(String(s.price))), line);
  const none = priceLine(v, { sells: [] });
  assert.ok(none && !none.includes('credits'), none);
  const intro = workLine(new Voice(6, 'cook'), { job: 'cook', street: false, visitor: false }, shop);
  assert.ok(intro.includes(shop.name) && intro.includes('cook'), intro);
  const street = workLine(new Voice(6, 'courier'), { job: 'courier', street: true, visitor: false, district: 'financial' }, null);
  assert.ok(street.includes('Federal District') && street.includes('Courier'), street);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
