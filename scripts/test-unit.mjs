// Node unit tests for the deterministic core (no browser needed):  node scripts/test-unit.mjs
import assert from 'node:assert/strict';
import { RNG, hash2, hash3 } from '../src/rng.js';
import { BlockJournal } from '../src/disasters/journal.js';
import { Disaster } from '../src/disasters/base.js';
import { SaveManager } from '../src/save.js';
import { World } from '../src/world.js';
import { initBlocks, B, BLOCKS, DOOR_SETS, WHEAT_STAGES, doorPanelBoxes } from '../src/blocks.js';
import { Inventory, mergeInto, initItems, I, ITEMS, MAX_STACK, isItem, foodOf, cookedOf } from '../src/items.js';
import { DoorController, setDoorOpen, doorBottomY } from '../src/doors.js';
import { isPassable, standHeight } from '../src/npc/pathfinding.js';
import { EventBus } from '../src/events.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

// Block / item registries work without the texture atlas (tile lookups fall back to 0)
initBlocks(); initItems();
const memStorage = () => { const store = new Map(); return { store, getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }; };
// A one-chunk world (chunk 0,0 generated, unlit) for door / block entity tests
function testWorld() {
  const w = new World(null);
  const c = w.getOrCreateChunk(0, 0); c.generated = true;
  w.fill = (x0, y0, z0, x1, y1, z1, id) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) w.setBlock(x, y, z, id); };
  return w;
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
  // a block entity recorded with the cell (chest contents) rides along to the restore batch; hash ignores it
  const j3 = new BlockJournal();
  const chest = { type: 'chest', slots: [{ id: 9, count: 3 }] };
  assert.equal(j3.record(1, 2, 3, 60, chest), true);
  j3.record(4, 5, 6, 0);
  const b3 = [...j3.restoreBatches(10)][0];
  assert.equal(b3.find((e) => e.x === 1).ent, chest);
  assert.equal(b3.find((e) => e.x === 4).ent, undefined);
  const j4 = new BlockJournal(); j4.record(1, 2, 3, 60); j4.record(4, 5, 6, 0);
  assert.equal(j3.hash(fakeWorld), j4.hash(fakeWorld), 'entities do not change the replay hash');
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
  const chunk = { cx: 0, cz: 0, blocks: new Uint8Array(16 * 16 * 256) };
  assert.equal(s2.applyToChunk(chunk), 3);
  assert.equal(chunk.blocks[((1 & 15) * 16 + (2 & 15)) * 256 + 60], 9);
  s2.clear(); assert.equal(store.size, 0);
});

test('SaveManager v2 persists block entities, player state and inventory; v1 saves migrate', () => {
  const st = memStorage();
  st.setItem('frontier-craft:v1:7', JSON.stringify({ version: 1, edits: [[3, 60, 4, 9], [3, 61, 4, 0]] }));
  const s = new SaveManager(7, st);
  assert.equal(s.count, 2, 'v1 edits are loaded');
  assert.equal(s.migrated, true);
  s.setEntity(10, 60, 10, { type: 'chest', slots: [{ id: I.BREAD, count: 2 }, null] });
  s.setEntity(11, 60, 10, { type: 'crop', age: 120 });
  s.setEntity(11, 60, 10, null); // removed again
  s.setPlayer({ x: 1.5, y: 60, z: 2.5, yaw: 0.3, pitch: -0.1, health: 17, food: 13, saturation: 2.5 });
  s.setInventory({ slots: [[B.OAK_PLANKS, 64], null, [I.APPLE, 3]], selected: 2 });
  s.flush();
  assert.equal(st.getItem('frontier-craft:v1:7') !== null, true, 'the old key is left alone until clear()');
  const raw = JSON.parse(st.getItem('frontier-craft:v2:7'));
  assert.equal(raw.version, 2);
  assert.equal(raw.edits.length, 2);
  assert.deepEqual(raw.entities, [{ type: 'chest', slots: [{ id: I.BREAD, count: 2 }, null], x: 10, y: 60, z: 10 }]);
  assert.equal(raw.player.health, 17);
  const s2 = new SaveManager(7, st);
  assert.equal(s2.migrated, false);
  assert.equal(s2.count, 2);
  assert.deepEqual(s2.getEntity(10, 60, 10).slots, [{ id: I.BREAD, count: 2 }, null]);
  assert.equal(s2.getEntity(11, 60, 10), null);
  assert.deepEqual(s2.player, { x: 1.5, y: 60, z: 2.5, yaw: 0.3, pitch: -0.1, health: 17, food: 13, saturation: 2.5 });
  assert.deepEqual(s2.inventory, { slots: [[B.OAK_PLANKS, 64], null, [I.APPLE, 3]], selected: 2 });
  const w = testWorld();
  assert.equal(s2.restoreEntities(w), 1);
  const ent = w.getBlockEntity(10, 60, 10);
  assert.equal(ent.type, 'chest');
  ent.slots[0].count = 60; // restored entities are copies: editing the world's entity does not touch the save until setEntity
  assert.equal(s2.getEntity(10, 60, 10).slots[0].count, 2);
  s2.clear();
  assert.equal(st.store.size, 0, 'clear removes v1 and v2 keys');
});

test('Inventory: 64-stacks, addStack leftovers, canAdd, remove, serialize round trip (unknown ids dropped)', () => {
  assert.equal(MAX_STACK, 64);
  const inv = new Inventory(4);
  assert.equal(inv.addStack(I.APPLE, 70), 0, 'everything fits: a full stack of 64 plus a second stack of 6');
  assert.deepEqual(inv.slots.map((s) => s && [s.id, s.count]), [[I.APPLE, 64], [I.APPLE, 6], null, null]);
  assert.equal(inv.addStack(I.APPLE, 200), 200 - 58 - 128, 'tops up the 6-stack to 64, fills the two free slots, returns the rest');
  inv.set(1, I.APPLE, 6); inv.set(2, null); inv.set(3, null);
  inv.set(2, B.STONE, 64); inv.set(3, B.STONE, 64);
  assert.equal(inv.canAdd(I.APPLE, 58), true);
  assert.equal(inv.canAdd(I.APPLE, 59), false);
  assert.equal(inv.canAdd(I.BREAD, 1), false, 'no free slot and no bread stack');
  assert.equal(inv.addStack(I.BREAD, 1), 1, 'nothing fits: everything is returned');
  assert.equal(inv.count(I.APPLE), 70);
  assert.equal(inv.remove(I.APPLE, 71), false);
  assert.equal(inv.remove(I.APPLE, 8), true, 'removes from the last slots first');
  assert.deepEqual(inv.slots.map((s) => s && [s.id, s.count]), [[I.APPLE, 62], null, [B.STONE, 64], [B.STONE, 64]]);
  inv.selected = 2;
  const data = JSON.parse(JSON.stringify(inv.serialize()));
  data.slots[1] = [999, 5]; // an id that is not a block or item: dropped on load
  const inv2 = new Inventory(4);
  assert.equal(inv2.deserialize(data), true);
  assert.deepEqual(inv2.slots.map((s) => s && [s.id, s.count]), [[I.APPLE, 62], null, [B.STONE, 64], [B.STONE, 64]]);
  assert.equal(inv2.selected, 2);
  assert.equal(new Inventory(4).deserialize(null), false);
});

test('Item registry: 14 items >= 1000 with Minecraft food values and cooking pairs; blocks are not items', () => {
  const ids = Object.keys(ITEMS).map(Number);
  assert.equal(ids.length, 14);
  for (const id of ids) { assert.ok(id >= 1000); assert.equal(isItem(id), true); assert.equal(BLOCKS[id].displayName, ITEMS[id].displayName); assert.equal(BLOCKS[id].icon, 'flat'); }
  assert.equal(isItem(B.OAK_PLANKS), false);
  assert.deepEqual(foodOf(I.APPLE), { hunger: 4, saturation: 2.4 });
  assert.deepEqual(foodOf(I.BREAD), { hunger: 5, saturation: 6 });
  assert.deepEqual(foodOf(I.BEEF_COOKED), { hunger: 8, saturation: 12.8 });
  assert.deepEqual(foodOf(I.CHICKEN_RAW), { hunger: 2, saturation: 1.2 });
  assert.equal(foodOf(I.WHEAT), null);
  assert.equal(cookedOf(I.BEEF_RAW), I.BEEF_COOKED);
  assert.equal(cookedOf(I.PORKCHOP_RAW), I.PORKCHOP_COOKED);
  assert.equal(cookedOf(I.CHICKEN_RAW), I.CHICKEN_COOKED);
  assert.equal(cookedOf(I.BEEF_COOKED), null);
});

test('mergeInto follows the quick-move slot order (hotbar first, from the right) and merges before filling', () => {
  const slots = new Array(6).fill(null);
  slots[4] = { id: I.APPLE, count: 60 };
  const order = [5, 4, 3, 2, 1, 0];
  const from = { id: I.APPLE, count: 10 };
  assert.equal(mergeInto(slots, from, order), true);
  assert.deepEqual(slots.map((s) => s && [s.id, s.count]), [null, null, null, null, [I.APPLE, 64], [I.APPLE, 6]], 'tops up the existing stack, remainder goes to the first free slot in order');
  const big = { id: B.STONE, count: 300 };
  assert.equal(mergeInto(slots, big, order), false);
  assert.equal(big.count, 300 - 4 * 64, 'four free slots take 256');
});

test('Doors: closed = bottom + top ids with a thin panel across the doorway, open = one id with no collision', () => {
  const w = testWorld();
  // wall along x at z=5 with a door in it at x=5 (bottom y=60, top y=61)
  w.fill(0, 59, 0, 15, 59, 15, B.STONE);
  w.fill(0, 60, 5, 15, 61, 5, B.OAK_PLANKS);
  w.setBlock(5, 60, 5, B.OAK_DOOR); w.setBlock(5, 61, 5, B.OAK_DOOR_TOP);
  assert.equal(BLOCKS[B.OAK_DOOR].solid, true);
  assert.deepEqual(doorPanelBoxes(w, 5, 60, 5), [[0, 0, 0.4375, 1, 1, 0.5625]], 'panel spans x, thin in z (passage along z)');
  assert.deepEqual(doorPanelBoxes(w, 5, 61, 5), [[0, 0, 0.4375, 1, 1, 0.5625]]);
  assert.equal(doorBottomY(w, 5, 61, 5), 60, 'the top half knows its bottom');
  assert.equal(doorBottomY(w, 5, 60, 5), 60);
  assert.equal(doorBottomY(w, 6, 60, 5), null);
  assert.equal(setDoorOpen(w, 5, 60, 5, true), true);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN); assert.equal(w.getBlock(5, 61, 5), B.OAK_DOOR_OPEN);
  assert.equal(BLOCKS[B.OAK_DOOR_OPEN].solid, false); assert.deepEqual(BLOCKS[B.OAK_DOOR_OPEN].boxes, []);
  assert.equal(doorBottomY(w, 5, 61, 5), 60, 'open halves resolve to the bottom too');
  assert.equal(setDoorOpen(w, 5, 60, 5, true), false, 'already open');
  assert.equal(setDoorOpen(w, 5, 60, 5, false), true);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR); assert.equal(w.getBlock(5, 61, 5), B.OAK_DOOR_TOP);
  // NPC pathfinding treats closed doors as passable and standable cells
  assert.equal(isPassable(B.OAK_DOOR), true); assert.equal(isPassable(B.OAK_DOOR_TOP), true); assert.equal(isPassable(B.OAK_PLANKS), false);
  assert.equal(standHeight(w, 5, 60, 5), 60);
  assert.equal(standHeight(w, 4, 60, 5), null, 'the wall next to it is not');
  // generated doors (two bottom ids stacked) are normalised to bottom + top
  w.setBlock(8, 60, 5, B.SPRUCE_DOOR); w.setBlock(8, 61, 5, B.SPRUCE_DOOR);
  assert.equal(w.normalizeDoors(w.getChunk(0, 0)), 1);
  assert.equal(w.getBlock(8, 61, 5), B.SPRUCE_DOOR_TOP);
  assert.equal(DOOR_SETS.spruce.open, B.SPRUCE_DOOR_OPEN);
});

test('DoorController: NPCs open a closed door within a block and it closes 1 s after they left; player toggles stick', () => {
  const w = testWorld();
  w.fill(0, 59, 0, 15, 59, 15, B.STONE);
  w.fill(0, 60, 5, 15, 61, 5, B.OAK_PLANKS);
  w.setBlock(5, 60, 5, B.OAK_DOOR); w.setBlock(5, 61, 5, B.OAK_DOOR_TOP);
  const dc = new DoorController(w, null);
  const changes = []; dc.onChange = (x, y, z, open) => changes.push(open);
  const npc = { state: 'walk', path: [{ x: 5, y: 60, z: 5 }, { x: 5, y: 60, z: 6 }], pathIndex: 0, pos: { x: 5.5, y: 60, z: 2.5 } };
  dc.update([npc], null);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR, 'three blocks away: still closed');
  npc.pos.z = 4.4;                                    // within 1.25 blocks of the door cell centre
  dc.update([npc], null);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN); assert.equal(w.getBlock(5, 61, 5), B.OAK_DOOR_OPEN);
  assert.equal(dc.held.size, 1);
  for (let i = 0; i < 40; i++) { npc.pos.z = 5.5; dc.update([npc], null); } // standing in the doorway keeps it open
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN);
  npc.pos.z = 8.5;                                    // walked through
  for (let i = 0; i < 19; i++) dc.update([npc], null);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN, 'still open 0.95 s after leaving');
  dc.update([npc], null);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR, 'closed after 20 ticks'); assert.equal(w.getBlock(5, 61, 5), B.OAK_DOOR_TOP);
  assert.equal(dc.held.size, 0);
  assert.deepEqual(changes, [true, false]);
  // a door the player opened is never auto-closed, and a door closing never traps the player standing in it
  assert.deepEqual(dc.toggle(5, 61, 5), { x: 5, y: 60, z: 5, open: true });
  for (let i = 0; i < 60; i++) dc.update([], null);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN);
  assert.deepEqual(dc.toggle(5, 60, 5), { x: 5, y: 60, z: 5, open: false });
  npc.pos.z = 4.4; dc.update([npc], null); npc.pos.z = 9;
  const player = { box: { x0: 5.2, x1: 5.8, y0: 60, y1: 61.8, z0: 5.2, z1: 5.8 } };
  for (let i = 0; i < 60; i++) dc.update([npc], player);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR_OPEN, 'player in the doorway: stays open');
  player.box.z0 = 8; player.box.z1 = 8.6;
  for (let i = 0; i < 21; i++) dc.update([npc], player);
  assert.equal(w.getBlock(5, 60, 5), B.OAK_DOOR);
  assert.equal(dc.toggles, 6);
});

test('Block entities: kept per position, handed to onBlockEntityLost when the block is replaced (setBlock and setBlockRaw)', () => {
  const w = testWorld();
  w.fill(0, 59, 0, 15, 59, 15, B.STONE);
  w.setBlock(3, 60, 3, B.CHEST);
  const ent = w.setBlockEntity(3, 60, 3, { type: 'chest', slots: new Array(27).fill(null) });
  assert.equal(ent.x, 3); assert.equal(w.getBlockEntity(3, 60, 3), ent);
  assert.equal(w.getBlockEntity(3, 61, 3), null);
  const lost = [];
  w.onBlockEntityLost = (x, y, z, e, newId) => { lost.push([x, y, z, e.type, newId]); w.removeBlockEntity(x, y, z); };
  w.setBlock(3, 60, 3, B.AIR);
  assert.deepEqual(lost, [[3, 60, 3, 'chest', B.AIR]]);
  assert.equal(w.getBlockEntity(3, 60, 3), null);
  // crops: a growth-stage change keeps the entity (same entity kind), any other block drops it
  w.setBlock(4, 59, 4, B.FARMLAND); w.setBlock(4, 60, 4, WHEAT_STAGES[0]);
  w.setBlockEntity(4, 60, 4, { type: 'crop', age: 0 });
  w.setBlock(4, 60, 4, WHEAT_STAGES[1]);
  assert.equal(w.getBlockEntity(4, 60, 4).type, 'crop', 'growing to the next stage keeps the timer');
  w.setBlockRaw(4, 60, 4, B.AIR); // a disaster (journal restore path) breaking the crop
  assert.equal(lost.length, 2); assert.equal(w.getBlockEntity(4, 60, 4), null);
  assert.equal(BLOCKS[WHEAT_STAGES[0]].growth, 0); assert.equal(BLOCKS[WHEAT_STAGES[2]].growth, 2); assert.equal(WHEAT_STAGES[2], B.WHEAT);
});

test('SaveManager pass-2 blobs: cast/senate/factions/events round-trip, dedupe rewrites, unknown keys ignored, old saves load without them', () => {
  const st = memStorage();
  const s = new SaveManager(9, st);
  assert.equal(s.cast, null, 'missing blob reads as null');
  s.setCast({ history: { 'cast:vela_marr': { talks: 2 } } });
  assert.equal(s.dirty, true);
  s.flush();
  const writes = [];
  const origSet = st.setItem; st.setItem = (k, v) => { writes.push(k); origSet(k, v); };
  s.setCast({ history: { 'cast:vela_marr': { talks: 2 } } });   // identical content
  assert.equal(s.dirty, false, 'identical blob does not schedule a write');
  s.setBlob('bogus', { a: 1 });
  assert.equal(s.getBlob('bogus'), null, 'keys outside the contract are ignored');
  s.setSenate({ results: [{ scenario: 'infrastructure', outcome: 'passed' }] });
  s.setFactions({ standing: { csf: 3 } });
  s.flush();
  const again = new SaveManager(9, st);
  assert.deepEqual(again.cast, { history: { 'cast:vela_marr': { talks: 2 } } });
  assert.deepEqual(again.senate.results[0], { scenario: 'infrastructure', outcome: 'passed' });
  assert.equal(again.factions.standing.csf, 3);
  assert.equal(again.events, null);
  again.setCast(null); again.flush();
  assert.equal(new SaveManager(9, st).cast, null, 'null removes the blob');
  const legacy = memStorage(); legacy.setItem('frontier-craft:v2:11', JSON.stringify({ version: 2, edits: [], entities: [], player: null, inventory: null, economy: null }));
  const old = new SaveManager(11, legacy);
  assert.equal(old.cast, null); assert.equal(old.senate, null);
  assert.equal(Object.keys(old.serialize()).includes('cast'), false, 'absent blobs are not written');
});

test('EventBus: on/once/off, unsubscribe handles, throwing listeners are isolated, history is ordered and prefix-filtered', () => {
  const bus = new EventBus(4);
  const got = [];
  const off = bus.on('economy:transfer', (a, b) => got.push(['t', a, b]));
  bus.once('senate:result', (r) => got.push(['r', r]));
  bus.on('economy:transfer', () => { throw new Error('boom'); });
  const origError = console.error; console.error = () => {};
  try {
    assert.equal(bus.emit('economy:transfer', 1, 2), 1, 'emit returns listeners that completed; the throwing one is logged, not fatal');
    assert.equal(bus.emit('senate:result', 'passed'), 1);
    assert.equal(bus.emit('senate:result', 'again'), 0, 'once listener is gone');
    off();
    assert.equal(bus.emit('economy:transfer', 3, 4), 0, 'unsubscribed listener no longer runs; only the throwing one is left');
    assert.equal(bus.emit('nobody:listens'), 0);
  } finally { console.error = origError; }
  assert.deepEqual(got, [['t', 1, 2], ['r', 'passed']]);
  assert.equal(bus.history.length, 4, 'history is capped at the configured size');
  assert.deepEqual(bus.recent('economy:').map((h) => h.args), [[3, 4]]);
  assert.deepEqual(bus.recent().map((h) => h.name), ['senate:result', 'senate:result', 'economy:transfer', 'nobody:listens']);
  assert.ok(bus.recent().every((h, i, a) => i === 0 || a[i - 1].seq < h.seq), 'sequence numbers increase');
  assert.throws(() => bus.on('x', null));
  assert.equal(bus.count('economy:transfer'), 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
