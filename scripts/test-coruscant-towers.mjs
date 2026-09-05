// Node tests for the Coruscant tower blueprints (no browser):  node scripts/test-coruscant-towers.mjs
// Checks the blueprintFor contract (shape, indexing, y0, doors, lobby, LRU), determinism, generation time,
// walkability of every floor from the street door and the size of the room library.
import assert from 'node:assert/strict';
import { initBlocks, B, BLOCKS, SHAPE } from '../src/blocks.js';
import { blueprintFor, buildBlueprint, blueprintCacheSize, clearBlueprintCache, roomList, FAMILIES } from '../src/coruscant/buildings.js';

initBlocks();
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.message}`); }
}

const lot = (id, family, w, d, height, front = 'S', kind = 'tower', district = 'financial') => {
  const l = { id, x0: 3000 + id * 64, z0: -200, w, d, district, kind, family, height, seed: 1000 + id * 7919, front, midDoor: height >= 45 };
  l.x1 = l.x0 + w; l.z1 = l.z0 + d;
  const mx = l.x0 + (w >> 1), mz = l.z0 + (d >> 1);
  l.door = front === 'W' ? { side: 'W', x: l.x0, z: mz } : front === 'E' ? { side: 'E', x: l.x1 - 1, z: mz } : front === 'N' ? { side: 'N', x: mx, z: l.z0 } : { side: 'S', x: mx, z: l.z1 - 1 };
  return l;
};
const at = (bp, x, y, z) => bp.blocks[(x * bp.d + z) * bp.h + y];
const open = (id) => id === 0 || id === 255;
const passable = (id) => { if (open(id)) return true; const b = BLOCKS[id]; return b ? (!b.solid || b.shape === SHAPE.SLAB || b.shape === SHAPE.BED) : false; };
const solid = (id) => { if (open(id)) return false; const b = BLOCKS[id]; return b ? b.solid : true; };

// floors reachable on foot from the street door (steps of +-1 block for slab stairs)
function reachableFloors(bp, l) {
  const sx = l.door.x - l.x0, sz = l.door.z - l.z0;
  const G = (x, y, z) => (x >= 0 && y >= 0 && z >= 0 && x < bp.w && y < bp.h && z < bp.d) ? at(bp, x, y, z) : 0;
  const can = (x, y, z) => passable(G(x, y, z)) && passable(G(x, y + 1, z)) && (solid(G(x, y - 1, z)) || !open(G(x, y, z)));
  const seen = new Uint8Array(bp.w * bp.h * bp.d), idx = (x, y, z) => (x * bp.d + z) * bp.h + y;
  const q = [sx, 1, sz]; seen[idx(sx, 1, sz)] = 1; const floors = new Set();
  while (q.length) {
    const z = q.pop(), y = q.pop(), x = q.pop();
    if ((y - 1) % 5 === 0) floors.add((y - 1) / 5);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || nz < 0 || ny < 1 || nx >= bp.w || nz >= bp.d || ny >= bp.h - 1 || seen[idx(nx, ny, nz)] || !can(nx, ny, nz)) continue;
      if (dy === 1 && !passable(G(x, y + 2, z))) continue;
      seen[idx(nx, ny, nz)] = 1; q.push(nx, ny, nz);
    }
  }
  return floors.size;
}

test('blueprintFor contract: shape, index convention, y0, meta in world coordinates', () => {
  const l = lot(1, 'slab', 32, 32, 150);
  const bp = blueprintFor(l, { seed: 1, levels: { ground: 60, midWalk: 96 } });
  assert.equal(bp.w, 32); assert.equal(bp.d, 32); assert.equal(bp.y0, 60);
  assert.ok(bp.blocks instanceof Uint8Array && bp.blocks.length === bp.w * bp.h * bp.d);
  assert.ok(bp.h >= 150 && bp.y0 + bp.h <= 256, 'fits under the world height');
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) assert.notEqual(at(bp, x, 0, z), 0, 'ground slab covers the footprint');
  for (const k of ['doors', 'spots', 'lifts', 'beds', 'work', 'rooms', 'floors']) assert.ok(Array.isArray(bp.meta[k]), k);
  assert.ok(bp.meta.lobby && bp.meta.lobby.y === 61 && bp.meta.lobby.x >= l.x0 && bp.meta.lobby.x < l.x1 && bp.meta.lobby.z >= l.z0 && bp.meta.lobby.z < l.z1, 'lobby inside the lot at the walk level');
  assert.deepEqual({ x: bp.meta.doors[0].x, y: bp.meta.doors[0].y, z: bp.meta.doors[0].z }, { x: l.door.x, y: 61, z: l.door.z }, 'street door on the lot edge');
  assert.equal(bp.meta.lifts.length, 2);
  assert.ok(bp.meta.spots.length > 100 && bp.meta.work.length > 50 && bp.meta.rooms.length > 100);
  for (const s of bp.meta.spots) assert.ok(s.x >= l.x0 && s.x < l.x1 && s.z >= l.z0 && s.z < l.z1 && s.y > 60, 'spots in world coordinates inside the lot');
  const gy = blueprintFor({ ...l, id: 2, groundY: 71 }, null);
  assert.equal(gy.y0, 70, 'y0 follows lot.groundY when the layout gives no level');
});

test('every family: street door open, mid-level door open, every floor reachable from the street', () => {
  let id = 10;
  for (const fam of [...FAMILIES, 'cylinder']) for (const front of ['N', 'S', 'E', 'W']) {
    const l = lot(id++, fam, fam === 'twin' ? 40 : 32, 32, 150, front, 'tower', fam === 'stack' ? 'industrial' : 'financial');
    const bp = buildBlueprint(l, null);
    const dx = l.door.x - l.x0, dz = l.door.z - l.z0;
    assert.ok(open(at(bp, dx, 1, dz)) && open(at(bp, dx, 2, dz)), `${fam} ${front}: street door open`);
    assert.ok(bp.meta.midDoor && open(at(bp, dx, 36, dz)), `${fam} ${front}: boulevard-level door open`);
    assert.ok(reachableFloors(bp, l) >= bp.meta.floors.length, `${fam} ${front}: all ${bp.meta.floors.length} floors reachable`); // (a walkable roof counts as one more)
  }
});

test('landmarks and fallbacks build on their nominal lots', () => {
  const s = buildBlueprint(lot(90, 'senate', 120, 120, 76, 'S', 'landmark', 'senate'), null);
  assert.equal(s.meta.family, 'senate'); assert.ok(s.meta.rooms.length > 800);
  const t = buildBlueprint(lot(91, 'temple', 100, 100, 190, 'N', 'landmark', 'senate'), null);
  assert.equal(t.meta.family, 'temple'); assert.ok(t.h > 150);
  const o = buildBlueprint(lot(92, 'opera', 90, 110, 46, 'W', 'landmark', 'entertainment'), null);
  assert.equal(o.meta.family, 'opera'); assert.equal(o.meta.doors.length, 2, 'plaza gate + house door');
  for (const [l, fams] of [[lot(93, 'senate', 32, 32, 60, 'S', 'landmark'), ['civic']], [lot(94, 7, 16, 16, 40, 'S', 'tower', 'market'), ['hall']], [lot(95, 'unknown-name', 24, 24, 60), FAMILIES]]) {
    assert.ok(fams.includes(buildBlueprint(l, null).meta.family), `${l.family} -> ${fams}`);
  }
  assert.equal(buildBlueprint(lot(96, null, 40, 40, 5, 'S', 'plaza'), null).meta.family, 'plaza');
  assert.equal(buildBlueprint(lot(97, null, 40, 30, 50, 'S', 'spaceport', 'spaceport'), null).meta.family, 'spaceport');
});

test('deterministic and memoised (LRU <= 256, landmarks pinned)', () => {
  clearBlueprintCache();
  const l = lot(3, 'habitat', 34, 34, 140, 'E', 'tower', 'residential');
  const a = buildBlueprint(l, null), b = buildBlueprint(l, null);
  assert.equal(Buffer.compare(Buffer.from(a.blocks.buffer), Buffer.from(b.blocks.buffer)), 0, 'identical block arrays');
  assert.deepEqual(a.meta.spots, b.meta.spots);
  const layout = { seed: 5 };
  assert.strictEqual(blueprintFor(l, layout), blueprintFor(l, layout), 'cached object');
  for (let i = 0; i < 300; i++) blueprintFor(lot(1000 + i, 'slab', 16, 16, 20), layout);
  assert.ok(blueprintCacheSize() <= 257, 'LRU bounded');
  clearBlueprintCache();
});

test('a 32x150x32 tower generates in <= 25 ms (median of 5 warm builds)', () => {
  const worst = [];
  for (const fam of FAMILIES) {
    const l = lot(50, fam, fam === 'twin' ? 40 : 32, 32, 150, 'S', 'tower', fam === 'stack' ? 'industrial' : 'financial');
    buildBlueprint(l, null);
    const t = [];
    for (let i = 0; i < 5; i++) { const t0 = performance.now(); buildBlueprint(l, null); t.push(performance.now() - t0); }
    t.sort((x, y) => x - y);
    worst.push(`${fam} ${t[2].toFixed(1)}ms`);
    assert.ok(t[2] <= 25, `${fam}: median ${t[2].toFixed(1)} ms`);
  }
  console.log('     ' + worst.join(', '));
});

test('room library has >= 40 templates and every planned room is lit', () => {
  const lib = roomList();
  assert.ok(lib.length >= 40, `library has ${lib.length} templates`);
  const LIGHTS = new Set([B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.LANTERN, B.CITY_LAMP, B.HOLO_SIGN, B.CONSOLE, B.WINDOW_LIT, B.TORCH]);
  let unlit = 0, rooms = 0;
  for (const fam of FAMILIES) {
    const l = lot(60, fam, 32, 32, 100, 'N', 'tower', 'residential');
    const bp = buildBlueprint(l, null);
    for (const r of bp.meta.rooms) {
      if (r.kind === 'stairwell') continue;
      rooms++;
      let lit = false;
      for (let x = r.x - l.x0; x < r.x - l.x0 + r.w && !lit; x++) for (let z = r.z - l.z0; z < r.z - l.z0 + r.d && !lit; z++) for (let y = r.y - bp.y0 - 1; y <= r.y - bp.y0 + 4; y++) if (LIGHTS.has(at(bp, x, y, z))) { lit = true; break; }
      if (!lit) unlit++;
    }
  }
  assert.equal(unlit, 0, `${unlit} of ${rooms} rooms have no light source`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
