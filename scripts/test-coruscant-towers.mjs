// Node tests for the Coruscant tower blueprints (no browser):  node scripts/test-coruscant-towers.mjs
// Checks the blueprintFor contract (shape, indexing, y0, doors, lobby, LRU), determinism, generation time,
// walkability of every floor from the street door and the size of the room library, then the rubric-11 skyscraper
// checks over the real city layout (seed 1337): a crown on every tower >= 60 and >= 6 crown styles, climbable
// crowns, impostor profile agreement, the spire / spine / needle families (rooms reachable + lit, lifts to the top,
// doors), lit strips on >= 40% of the tall facades, lit / glass skybridge stubs, the exterior palette census,
// determinism of the whole layout, ship lanes clearing the crowns, and the fill-time budget.
import assert from 'node:assert/strict';
import { initBlocks, B, BLOCKS, SHAPE } from '../src/blocks.js';
import { blueprintFor, buildBlueprint, blueprintCacheSize, clearBlueprintCache, roomList, FAMILIES } from '../src/coruscant/buildings.js';
import { getLayout, LEVELS } from '../src/coruscant/layout.js';
import { FORCE_AIR } from '../src/coruscant/blueprint.js';
import { lotCrown, resolveFamily, DISTRICT_MIX } from '../src/coruscant/towers/index.js';
import { CROWN_STYLES, CROWN_MIN_HEIGHT, CROWN_OPTIONS } from '../src/coruscant/crowns.js';
import { STRIP_MIN_HEIGHT } from '../src/coruscant/towers/strips.js';
import { SPACEPORT, DECK_Y } from '../src/coruscant/spaceport.js';
import { routePose, buildShips } from '../src/ships/traffic.js';

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

// ------------------------------------------------------------------------------------------ rubric 11: skyscrapers
// The checks below run over the real city layout (seed 1337, the one the game and the other harnesses use).
const CITY = getLayout(1337);
const TOWERS = CITY.lots.filter((l) => l.kind === 'tower');
const TALL = TOWERS.filter((l) => (l.height ?? 0) >= CROWN_MIN_HEIGHT);
const NEW_FAMILIES = ['spire', 'spine', 'needle'];
const isAir = (v) => v === 0 || v === FORCE_AIR;
const emits = (v) => !isAir(v) && BLOCKS[v] && BLOCKS[v].emit > 0;
const hashBlocks = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
const roofY = (bp) => 5 * bp.meta.floors.length;      // roof slab of the top floor (local y)

// Highest floor index (walk level 5f + 1) reachable on foot from the street door (same walker as reachableFloors,
// steps of +-1 block for the slab stairs); crown tiers are floors nF .. nF + K - 1.
function topReachableFloor(bp, l) {
  const sx = l.door.x - l.x0, sz = l.door.z - l.z0;
  const G = (x, y, z) => (x >= 0 && y >= 0 && z >= 0 && x < bp.w && y < bp.h && z < bp.d) ? at(bp, x, y, z) : 0;
  const can = (x, y, z) => passable(G(x, y, z)) && passable(G(x, y + 1, z)) && (solid(G(x, y - 1, z)) || !open(G(x, y, z)));
  const seen = new Uint8Array(bp.w * bp.h * bp.d), idx = (x, y, z) => (x * bp.d + z) * bp.h + y;
  const q = [sx, 1, sz]; seen[idx(sx, 1, sz)] = 1; let top = 0;
  while (q.length) {
    const z = q.pop(), y = q.pop(), x = q.pop();
    if ((y - 1) % 5 === 0) top = Math.max(top, (y - 1) / 5);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || nz < 0 || ny < 1 || nx >= bp.w || nz >= bp.d || ny >= bp.h - 1 || seen[idx(nx, ny, nz)] || !can(nx, ny, nz)) continue;
      if (dy === 1 && !passable(G(x, y + 2, z))) continue;
      seen[idx(nx, ny, nz)] = 1; q.push(nx, ny, nz);
    }
  }
  return top;
}

// The landmark harness walker (scripts/landmark-stats.mjs): standing cells from every door, steps up 1 / drops 3,
// lift shafts join every level they span. Returns the visited mask and its indexer.
function walk(bp, l) {
  const { w, h, d } = bp;
  const A = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) ? 0 : at(bp, x, y, z);
  const blk = (v) => BLOCKS[v];
  const pass = (v) => isAir(v) || !blk(v) || !blk(v).solid || blk(v).shape === SHAPE.DOOR || blk(v).shape === SHAPE.SALOON_DOOR;
  const low = (v) => !isAir(v) && blk(v) && (blk(v).shape === SHAPE.SLAB || blk(v).shape === SHAPE.RAIL);
  const stand = (v) => !isAir(v) && blk(v) && blk(v).solid;
  const key = (x, y, z) => (x * d + z) * h + y;
  const standing = (x, y, z) => {
    if (x < 0 || z < 0 || x >= w || z >= d || y < 1 || y + 1 >= h) return false;
    const feet = A(x, y, z);
    if (!pass(A(x, y + 1, z))) return false;
    if (low(feet)) return true;
    return pass(feet) && (stand(A(x, y - 1, z)) || low(A(x, y - 1, z)));
  };
  const visited = new Uint8Array(w * h * d), queue = [];
  const push = (x, y, z) => { if (standing(x, y, z) && !visited[key(x, y, z)]) { visited[key(x, y, z)] = 1; queue.push(x, y, z); } };
  for (const dr of bp.meta.doors) for (let dy = -1; dy <= 2; dy++) push(dr.x - l.x0, dr.y - bp.y0 + dy, dr.z - l.z0);
  const lifts = bp.meta.lifts.map((s) => ({ x: s.x - l.x0, z: s.z - l.z0, y0: s.y0 - bp.y0, y1: s.y1 - bp.y0 }));
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let dy = 1; dy >= -3; dy--) {
      if (dy === 1 && !pass(A(x, y + 2, z))) continue;
      if (standing(x + dx, y + dy, z + dz)) { push(x + dx, y + dy, z + dz); break; }
    }
    for (const s of lifts) {
      if (Math.abs(s.x - x) > 1 || Math.abs(s.z - z) > 1 || y < s.y0 - 1 || y > s.y1 + 1) continue;
      for (let yy = s.y0; yy <= s.y1 + 1; yy++) for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 2; dz++) push(s.x + dx, yy, s.z + dz);
    }
  }
  return { visited, key };
}
// rooms of a blueprint that the walker never enters / that have no emissive block in or over them
function roomAudit(bp, l) {
  const { visited, key } = walk(bp, l);
  const bad = { unreachable: [], unlit: [] };
  for (const r of bp.meta.rooms) {
    if (r.kind === 'stairwell') continue;
    const x0 = r.x - l.x0, z0 = r.z - l.z0, y = r.y - bp.y0;
    let reach = false, lit = false;
    for (let x = x0; x < x0 + r.w; x++) for (let z = z0; z < z0 + r.d; z++) {
      if (!reach && (visited[key(x, y, z)] || visited[key(x, y + 1, z)] || visited[key(x, y - 1, z)])) reach = true;
      if (!lit) for (let yy = y - 1; yy <= y + 4; yy++) if (emits(at(bp, x, yy, z))) { lit = true; break; }
    }
    if (!reach) bad.unreachable.push(`${r.kind}@${r.x},${r.y},${r.z}`);
    if (!lit) bad.unlit.push(`${r.kind}@${r.x},${r.y},${r.z}`);
  }
  return bad;
}
// Exterior shell above local level yMin: the first block seen from each of the four sides on every row and the
// topmost block of every column (what a viewer sees of the facade and the crown). A ray that meets carved air
// (FORCE_AIR: a doorway, bridge opening or terrace cut) before a block is looking into the interior and is dropped.
// -> [{x, y, z, v}]
function shell(bp, yMin) {
  const out = [];
  const ray = (x0, y, z0, dx, dz) => {
    for (let x = x0, z = z0; x >= 0 && z >= 0 && x < bp.w && z < bp.d; x += dx, z += dz) {
      const v = at(bp, x, y, z);
      if (v === FORCE_AIR) return;
      if (v !== 0) { out.push({ x, y, z, v }); return; }
    }
  };
  for (let y = yMin; y < bp.h; y++) {
    for (let x = 0; x < bp.w; x++) { ray(x, y, 0, 0, 1); ray(x, y, bp.d - 1, 0, -1); }
    for (let z = 0; z < bp.d; z++) { ray(0, y, z, 1, 0); ray(bp.w - 1, y, z, -1, 0); }
  }
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) for (let y = bp.h - 1; y >= yMin; y--) { const v = at(bp, x, y, z); if (v === FORCE_AIR) break; if (v !== 0) { out.push({ x, y, z, v }); break; } }
  return out;
}

test('rubric 11: every tower >= 60 in layout 1337 ends in a crown (no flat roofs), >= 6 crown styles across the city, impostor profile agrees', () => {
  const styles = new Map(); let flat = 0, mism = 0, dh = 0, agreed = 0;
  for (const l of TALL) {
    const bp = buildBlueprint(l, CITY), c = bp.meta.crown;
    assert.ok(c && c.height >= 5 && c.climbable, `tower ${l.id} (${bp.meta.family}, h ${l.height}) has no crown`);
    // lot.crownHeight = blocks above lot.height (the crown of a tower at the world-height cap took over c.base
    // blocks of body, so it stands on a lower roof: meta.floors is that reduced body)
    assert.equal(l.crownHeight, c.height - c.base, 'lot.crownHeight exposed for lane checks');
    assert.equal(bp.meta.crownHeight, c.height - c.base);
    assert.equal(c.base, Math.max(0, 5 * (Math.round(l.height / 5) - bp.meta.floors.length)), 'base = body floors handed to the crown');
    assert.ok(LEVELS.ground + l.height + l.crownHeight <= 255, `${bp.meta.family} ${l.id}: crown top ${LEVELS.ground + l.height + l.crownHeight} over the world`);
    // solid mass well above the roof slab (a parapet alone would be ~2 blocks)
    const R = roofY(bp); let above = 0;
    for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) for (let y = R + 3; y < bp.h; y++) if (!isAir(at(bp, x, y, z))) above++;
    if (above < 24) flat++;
    styles.set(c.style, (styles.get(c.style) || 0) + 1);
    const p = lotCrown(l, LEVELS.ground);
    if (p.style !== c.style) mism++; else { dh += Math.abs(p.height - c.height); agreed++; }
  }
  const generic = [...styles.keys()].filter((s) => CROWN_STYLES.includes(s));
  console.log(`     ${TALL.length} towers >= 60: crown styles ${[...styles].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`     impostor profile: style agrees on ${agreed}/${TALL.length}, mean |height error| ${(dh / Math.max(1, agreed)).toFixed(2)} blocks`);
  assert.equal(flat, 0, `${flat} towers still read as flat roofs`);
  assert.ok(generic.length >= 6, `only ${generic.length} of the generic crown styles are used: ${generic}`);
  assert.ok(mism / TALL.length <= 0.03, `${mism} impostor/crown style mismatches`);
  assert.ok(dh / Math.max(1, agreed) <= 3, 'impostor crown heights track the built crowns');
});

test('rubric 11: crowns are climbable from the top floor (stairs / lifts reach the top crown tier; lifts span every floor)', () => {
  let checked = 0;
  for (const l of TALL) {
    const bp = buildBlueprint(l, CITY), c = bp.meta.crown;
    const fam = bp.meta.family;
    if (!NEW_FAMILIES.includes(fam) && checked % 2 === 1) { checked++; continue; }   // every new-family tower, every other one otherwise
    checked++;
    const nF = bp.meta.floors.length, want = fam === 'spine' ? nF - 2 : nF - 1 + c.tiers;   // spine: the shorter slab's roof head may sit two floors lower
    const top = topReachableFloor(bp, l);
    assert.ok(top >= want, `${fam} ${l.id} (${c.style}): walked to floor ${top}, crown tier is floor ${want}`);
    const liftTop = Math.max(...bp.meta.lifts.map((s) => s.y1 - bp.y0));
    assert.ok(liftTop >= 5 * (nF - 1) + 1, `${fam} ${l.id}: lifts stop at ${liftTop}, top floor is ${5 * (nF - 1) + 1}`);
  }
});

test('rubric 11: spire / spine / needle - registered, reachable via the district mix, doors per contract, every room reachable and lit', () => {
  assert.ok(NEW_FAMILIES.every((f) => FAMILIES.includes(f)), 'registered in the tower registry');
  assert.ok(DISTRICT_MIX.enabled, 'the registry hands tall lots to the new families');
  const built = { spire: 0, spine: 0, needle: 0 };
  const audit = (l, bp) => {
    const fam = bp.meta.family;
    const dx = l.door.x - l.x0, dz = l.door.z - l.z0;
    assert.ok(open(at(bp, dx, 1, dz)) && open(at(bp, dx, 2, dz)), `${fam} ${l.id}: street door open`);
    if (bp.meta.midDoor) assert.ok(open(at(bp, dx, bp.meta.midDoor.y - bp.y0, dz)), `${fam} ${l.id}: boulevard-level door open`);
    assert.ok(bp.meta.lifts.length >= 2, `${fam} ${l.id}: lifts`);
    if (fam === 'spine') assert.ok(bp.meta.doors.length >= 3 && bp.meta.lifts.length >= 4, 'spine: arcade doors into both shafts, two cores');
    const bad = roomAudit(bp, l);
    assert.equal(bad.unreachable.length, 0, `${fam} ${l.id}: ${bad.unreachable.length}/${bp.meta.rooms.length} rooms unreachable: ${bad.unreachable.slice(0, 4).join(' ')}`);
    assert.equal(bad.unlit.length, 0, `${fam} ${l.id}: unlit rooms ${bad.unlit.slice(0, 4).join(' ')}`);
    const furnished = bp.meta.rooms.filter((r) => r.kind !== 'stairwell').length;
    assert.ok(furnished >= 2 * bp.meta.floors.length, `${fam} ${l.id} (${bp.w}x${bp.d}): interiors from the room library (${furnished} rooms on ${bp.meta.floors.length} floors)`);
    built[fam]++;
  };
  // synthetic lots on every front, then every real lot of the three families in the layout
  let id = 700;
  for (const fam of NEW_FAMILIES) for (const front of ['N', 'S', 'E', 'W']) {
    // a spine lot needs 44 cells across the front for two shafts and the arcade
    const across = fam === 'spine' ? 44 : 28, depth = fam === 'spine' ? 30 : 28, alongX = front === 'N' || front === 'S';
    const l = lot(id++, fam, alongX ? across : depth, alongX ? depth : across, 130, front, 'tower', 'financial');
    const bp = buildBlueprint(l, null);
    assert.equal(bp.meta.family, fam);
    audit(l, bp);
  }
  for (const l of TALL) { const bp = buildBlueprint(l, CITY); if (NEW_FAMILIES.includes(bp.meta.family)) audit(l, bp); }
  console.log(`     audited ${built.spire} spires, ${built.spine} spine towers, ${built.needle} needles (12 synthetic + the layout's)`);
  assert.ok(built.spire > 12 && built.needle > 12 && built.spine > 12, 'the district mix places all three families in the city');
});

test('rubric 11: lit vertical strips every 4-6 blocks on >= 40% of facades above 60, deterministic per lot', () => {
  let withStrips = 0, columns = 0, checked = 0;
  for (const l of TALL) {
    const bp = buildBlueprint(l, CITY), s = bp.meta.strips;
    if (!s) continue;
    withStrips++;
    assert.ok(s.pitch >= 4 && s.pitch <= 6, `pitch ${s.pitch}`);
    // full-face emissive panels (a WINDOW_LIT column is a dotted line lost among the facade's lit windows)
    assert.ok([B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.LIGHT_STRIP, B.LIGHT_STRIP_WARM].includes(s.block), `strip block ${BLOCKS[s.block]?.name}`);
    if (checked++ % 4) continue;
    // facade columns that are emissive over >= 80% of their visible height read as strips; a column has to run at
    // least two floors (setback / stack towers stack several facades, each with its own strips)
    const y0 = 5 * s.fromFloor + 1, y1 = roofY(bp) - 1;
    const cols = new Map();
    for (const c of shell(bp, y0)) { if (c.y > y1) continue; const k = c.x * 4096 + c.z; const e = cols.get(k) || { vis: 0, lit: 0 }; e.vis++; if (emits(c.v)) e.lit++; cols.set(k, e); }
    let strips = 0; for (const e of cols.values()) if (e.vis >= 10 && e.lit >= 0.8 * e.vis) strips++;
    assert.ok(strips >= 4, `${bp.meta.family} ${l.id}: only ${strips} lit columns run their facade`);
    columns += strips;
  }
  const share = withStrips / TALL.length;
  console.log(`     strips on ${withStrips}/${TALL.length} tall towers (${(100 * share).toFixed(0)}%), ${columns} full-height lit columns on the ${Math.ceil(checked / 4)} sampled`);
  assert.ok(share >= 0.4, `strip coverage ${share}`);
  assert.equal(STRIP_MIN_HEIGHT, CROWN_MIN_HEIGHT);
});

test('rubric 11: skybridge stubs at the facade have lit undersides, >= 30% are glass tubes', () => {
  let stubs = 0, tubes = 0, lit = 0, landings = 0;
  for (const l of TOWERS) {
    if (!l.bridges || !l.bridges.length) continue;
    const bp = buildBlueprint(l, CITY);
    for (const s of bp.meta.bridgeStubs || []) { landings++; if (!s.stub) continue; stubs++; if (s.tube) tubes++; if (s.lit) lit++; }
  }
  console.log(`     ${landings} bridge landings, ${stubs} facade stubs, ${tubes} glass tubes (${stubs ? (100 * tubes / stubs).toFixed(0) : 0}%)`);
  assert.ok(landings > 50, 'the layout carves bridges into the towers');
  assert.ok(stubs > 0 && lit === stubs, 'every stub has a lit underside');
  assert.ok(tubes / stubs >= 0.3, `glass tube share ${tubes / stubs}`);
});

test('rubric 11: exterior palette above the podium - no wood / wool, only chrome / durasteel / panels / glass / glow / plaster', () => {
  // wood and wool in any form; foliage is not cladding (terrace planters on the setback roofs keep their leaves)
  const banned = /OAK|SPRUCE|BIRCH|PLANK|WOOL|LOG|CARPET/, foliage = /LEAVES/;
  const hist = new Map(); let offenders = 0, sample = null;
  for (const l of TALL) {
    const bp = buildBlueprint(l, CITY);
    for (const c of shell(bp, 10)) {           // floors 0-1 (the lobby + gallery podium) are below y = 10
      const name = BLOCKS[c.v] ? BLOCKS[c.v].name : 'id' + c.v;
      hist.set(name, (hist.get(name) || 0) + 1);
      const N = name.toUpperCase();
      if (banned.test(N) && !foliage.test(N)) { offenders++; sample = sample || `${bp.meta.family} ${l.id} ${name} at ${c.x},${c.y},${c.z}`; }
    }
  }
  const top = [...hist].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`);
  console.log(`     exterior census (${TALL.length} towers): ${top.join(', ')}`);
  assert.equal(offenders, 0, `wood / wool on the exterior above the podium: ${sample}`);
});

test('rubric 11: ship lanes and pad approaches clear the crowns (lot.height + lotCrown height), crown tops stay under the high cross lane', () => {
  // scripts/test-spaceport.mjs checks the routes against lot.height; crowns add lotCrown(lot).height above it
  const tops = TOWERS.map((l) => { const c = lotCrown(l, LEVELS.ground); return { l, top: LEVELS.ground + l.height + c.height - (c.base || 0) }; });
  let samples = 0, maxTop = 0;
  for (const t of tops) maxTop = Math.max(maxTop, t.top);
  // routes are phase sequences (fly / reservation / approach / ... / repair berths with no flight at all): sample the
  // pose over the whole period instead of assuming a leading flight segment
  for (const sh of buildShips(SPACEPORT.pads, DECK_Y, null, CITY)) {
    const p = { x: 0, y: 0, z: 0 };
    const period = sh.route.period || 0;
    for (let t = 0; t < period; t += 0.5) {
      routePose(sh.route, t, p); samples++;
      if (p.phase && p.phase !== 'fly' && p.phase !== 'reservation' && p.phase !== 'approach' && p.phase !== 'departure' && p.phase !== 'climb') continue;   // on a pad
      for (const { l, top } of tops) assert.ok(!(p.x >= l.x0 - 3 && p.x < l.x1 + 3 && p.z >= l.z0 - 3 && p.z < l.z1 + 3 && p.y < top + 3), `${sh.name || sh.type} hits the crown of ${l.family} lot ${l.id} at ${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)} (crown top ${top})`);
    }
  }
  console.log(`     ${samples} route samples, tallest crown top y ${maxTop}`);
  assert.ok(samples > 5000);
  assert.ok(maxTop <= 262, `crown tops reach y ${maxTop}; the high cross lane flies at 266+`);
});

test('rubric 11: the whole tall skyline is deterministic (two builds hash-equal, metadata equal)', () => {
  clearBlueprintCache();
  const first = TALL.map((l) => { const bp = buildBlueprint(l, CITY); return [hashBlocks(bp.blocks), bp.meta.rooms.length, bp.meta.spots.length, bp.meta.crown.style, bp.meta.crown.height]; });
  clearBlueprintCache();
  TALL.slice().reverse().forEach((l) => buildBlueprint(l, CITY));   // different build order, same result
  const second = TALL.map((l) => { const bp = buildBlueprint(l, CITY); return [hashBlocks(bp.blocks), bp.meta.rooms.length, bp.meta.spots.length, bp.meta.crown.style, bp.meta.crown.height]; });
  assert.deepEqual(second, first);
  clearBlueprintCache();
});

test('rubric 11: fill time per tower blueprint with crowns + strips <= 1.15x the flat-roof build of the same layout', () => {
  // Recorded on the dev VM (layout 1337, 421 towers, best of 7 warm passes, one process): before this work
  // 0.584 ms / tower; after it 0.554 ms (crowns + strips on) - the direct one-high plate writes paid for the crowns.
  // Re-measured at the end against the pre-work tree on the same (busier) VM: 0.654-0.662 before vs 0.590-0.606 after.
  const run = () => { const t0 = performance.now(); for (const l of TOWERS) buildBlueprint(l, CITY); return (performance.now() - t0) / TOWERS.length; };
  const pass = () => { clearBlueprintCache(); return run(); };
  const trial = (on) => { CROWN_OPTIONS.enabled = on; pass(); let best = Infinity; for (let i = 0; i < 4; i++) best = Math.min(best, pass()); return best; };
  trial(true); trial(false);    // warm both code paths
  let on = Infinity, off = Infinity;
  for (let i = 0; i < 3; i++) { on = Math.min(on, trial(true)); off = Math.min(off, trial(false)); }
  CROWN_OPTIONS.enabled = true; clearBlueprintCache();
  console.log(`     ${TOWERS.length} towers: ${on.toFixed(3)} ms / tower dressed vs ${off.toFixed(3)} ms flat-roofed (x${(on / off).toFixed(3)}); budget x1.15`);
  assert.ok(on / off <= 1.15, `crowns + strips cost x${(on / off).toFixed(3)}`);
  assert.ok(on <= 5, `${on.toFixed(2)} ms per tower is too slow for streaming`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
