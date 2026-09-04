// Node unit tests for the deterministic core (no browser needed):  node scripts/test-unit.mjs
import assert from 'node:assert/strict';
import { RNG, hash2, hash3 } from '../src/rng.js';
import { BlockJournal } from '../src/disasters/journal.js';
import { Disaster } from '../src/disasters/base.js';
import { SaveManager } from '../src/save.js';
import { World } from '../src/world.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

test('RNG is deterministic per seed and differs across seeds', () => {
  const a = new RNG(42), b = new RNG(42), c = new RNG(43);
  const sa = Array.from({ length: 50 }, () => a.next()), sb = Array.from({ length: 50 }, () => b.next()), sc = Array.from({ length: 50 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
  assert.equal(hash2(5, -7, 3), hash2(5, -7, 3));
  assert.equal(hash3(1, 2, 3), hash3(1, 2, 3));
});

test('BlockJournal records first-touch originals, restores newest-first in batches, hashes deterministically', () => {
  const j = new BlockJournal();
  assert.equal(j.record(1, 2, 3, 9), true);
  assert.equal(j.record(1, 2, 3, 5), false, 'second record of same cell is ignored');
  assert.equal(j.original(1, 2, 3), 9);
  j.record(4, 5, 6, 0);
  j.record(7, 8, 9, 3);
  assert.equal(j.size, 3);
  const batches = [...j.restoreBatches(2)];
  assert.equal(batches.length, 2);
  assert.deepEqual(batches[0].map((e) => e.x), [7, 4], 'newest first');
  assert.deepEqual(batches[1].map((e) => e.x), [1]);
  // hash uses the world's current block ids
  const fakeWorld = { getBlock: (x, y, z) => (x === 1 ? 0 : 12) };
  const h1 = j.hash(fakeWorld);
  const j2 = new BlockJournal(); j2.record(7, 8, 9, 3); j2.record(1, 2, 3, 9); j2.record(4, 5, 6, 0); // different order, same set
  assert.equal(j2.hash(fakeWorld), h1, 'hash is order independent');
  const fakeWorld2 = { getBlock: () => 1 };
  assert.notEqual(j.hash(fakeWorld2), h1);
  assert.equal(World.posKey(1, 2, 3), World.posKey(1, 2, 3));
  assert.notEqual(World.posKey(1, 2, 3), World.posKey(1, 3, 2));
  j.clear(); assert.equal(j.size, 0);
});

test('Disaster.clampParams clamps to the schema and ignores junk', () => {
  class D extends Disaster {
    static schema = [
      { key: 'n', type: 'number', min: 0, max: 10, default: 5 },
      { key: 'sel', type: 'select', options: ['a', 'b'], default: 'a' },
      { key: 'flag', type: 'boolean', default: false },
      { key: 'pos', type: 'position', default: [0, 0] },
      { key: 'ang', type: 'angle', min: 0, max: 360, default: 90 },
    ];
  }
  assert.deepEqual(D.defaults(), { n: 5, sel: 'a', flag: false, pos: [0, 0], ang: 90 });
  const p = D.clampParams({ n: 99, sel: 'zzz', flag: 1, pos: [99999, 'x'], ang: -20, unknown: 3 });
  assert.equal(p.n, 10); assert.equal(p.sel, 'a'); assert.equal(p.flag, true); assert.deepEqual(p.pos, [4000, 0]); assert.equal(p.ang, 0);
  assert.equal(p.unknown, undefined);
  assert.equal(D.clampParams({ n: 'NaN' }).n, 5, 'non-numeric keeps default');
});

test('SaveManager keeps disaster-journaled cells out of the save until committed', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const s = new SaveManager(1, storage);
  s.recordEdit(1, 60, 2, 9); s.flush();
  assert.equal(s.count, 1);
  s.onDisasterEdit(5, 60, 5);
  s.recordEdit(5, 60, 5, 3); // player edit on a disaster-owned cell is not persisted
  assert.equal(s.count, 1);
  s.commitDisaster([[5, 60, 5, 78], [6, 60, 5, 79]]); s.flush();
  assert.equal(s.count, 3);
  const s2 = new SaveManager(1, storage);
  assert.equal(s2.count, 3, 'reloads from storage');
  const chunk = { cx: 0, cz: 0, blocks: new Uint8Array(16 * 16 * 128) };
  assert.equal(s2.applyToChunk(chunk), 3);
  assert.equal(chunk.blocks[((1 & 15) * 16 + (2 & 15)) * 128 + 60], 9);
  s2.clear(); assert.equal(store.size, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
