// Death Star generator checks (no browser):  node scripts/test-deathstar.mjs
// - deck plans build without layout warnings, deterministically
// - every chunk of the station fills deterministically and fast (ms/chunk incl. the lazy plan builds)
// - plan-level connectivity: hangar deck -> throne room / reactor catwalk / every room door via corridors + stair modules
// - corridor cells have a floor and 4 clear rows; the hull blocks every column (no sky leaks into the interior)
import { B } from '../src/blocks.js';
import { WorldGen } from '../src/worldgen.js';
import { Chunk } from '../src/world.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../src/constants.js';
import { register } from '../src/deathstar/index.js';
import { DeckPlans, T, WALKABLE, RING_ORDER, rotate, cellIndex } from '../src/deathstar/plan.js';
import { CX, CZ, CY, R, N, X0, Z0, N_DECKS, DECK_H, MODULES, HANGAR, TOWER, FIXED, REACTOR_R, CATWALK_EVERY, deckFloorY, TOP_SPHERE_DECK } from '../src/deathstar/layout.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack || e.message}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };

const fnv = (arr, h = 0x811c9dc5) => { for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

// ------------------------------------------------------------------------------------------------ plans
const t0 = performance.now();
const plans = new DeckPlans(1337);
for (let d = 0; d < N_DECKS; d++) plans.get(d);
const planMs = performance.now() - t0;
console.log(`built ${N_DECKS} deck plans in ${planMs.toFixed(0)} ms`);

test('deck plans build without layout warnings', () => {
  const warnings = [];
  for (let d = 0; d < N_DECKS; d++) for (const w of plans.get(d).warnings) warnings.push(`deck ${d}: ${w}`);
  if (warnings.length) console.log('   ' + warnings.slice(0, 20).join('\n   ') + (warnings.length > 20 ? `\n   ... ${warnings.length} total` : ''));
  assert(warnings.length === 0, `${warnings.length} warnings`);
});

test('deck plans are deterministic', () => {
  const again = new DeckPlans(1337);
  for (let d = 0; d < N_DECKS; d++) assert(fnv(plans.get(d).blocks) === fnv(again.get(d).blocks) && fnv(plans.get(d).type) === fnv(again.get(d).type), `deck ${d} differs`);
});

test('every required room type exists at least once', () => {
  const names = new Set();
  for (let d = 0; d < N_DECKS; d++) for (const r of plans.get(d).rooms) names.add(r.name);
  const need = ['bridge', 'detention', 'compactor', 'tractorLedge', 'conference', 'barracks', 'mess', 'medical', 'armoury', 'reactorControl', 'throne', 'turbolaser', 'storage', 'alcove', 'gallery', 'superlaser', 'office', 'machinery'];
  const missing = need.filter((n) => !names.has(n));
  assert(missing.length === 0, `missing rooms: ${missing.join(', ')}`);
  let total = 0; for (let d = 0; d < N_DECKS; d++) total += plans.get(d).rooms.length;
  console.log(`   ${total} rooms over ${N_DECKS} decks: ${[...names].join(', ')}`);
});

// ------------------------------------------------------------------------------------------------ connectivity
// Node = (deck, cell). Walkable: WALKABLE types (RDOOR only on catwalk decks), reactor catwalk cells, module ring +
// door cells. Stairs: a module's ring cells on deck d connect to the same cells on deck d + 1.
function walkGraph() {
  const walk = new Array(N_DECKS);
  for (let d = 0; d < N_DECKS; d++) {
    const P = plans.get(d), w = new Uint8Array(N * N), catwalk = d % CATWALK_EVERY === 0;
    for (let i = 0; i < N * N; i++) {
      const t = P.type[i];
      if (WALKABLE[t] && (t !== T.RDOOR || catwalk)) w[i] = 1;
    }
    if (catwalk && d <= TOP_SPHERE_DECK) for (let x = -REACTOR_R; x <= REACTOR_R; x++) for (let z = -REACTOR_R; z <= REACTOR_R; z++) {
      if (P.t(x, z) === T.REACTOR && Math.hypot(x, z) >= 8.5) w[cellIndex(x, z)] = 1;
    }
    MODULES.forEach((m, mi) => {
      if (d < m.d0 || d > m.d1) return;
      for (const [fx, fz] of RING_ORDER) { const [dx, dz] = rotate(m.side, fx, fz); w[cellIndex(m.mx + dx, m.mz + dz)] = 1; }
      if (P.moduleDoors.get(mi)) { const [dx, dz] = rotate(m.side, 4, 0); w[cellIndex(m.mx + dx, m.mz + dz)] = 1; }
      for (const dd of m.doors2) if (d >= dd.d0 && d <= dd.d1) { const [dx, dz] = rotate(m.side, dd.fx, dd.fz); w[cellIndex(m.mx + dx, m.mz + dz)] = 1; }
    });
    walk[d] = w;
  }
  return walk;
}
function reach(walk, sd, sx, sz) {
  const seen = new Array(N_DECKS).fill(null).map(() => new Uint8Array(N * N));
  const q = [[sd, cellIndex(sx, sz)]];
  seen[sd][cellIndex(sx, sz)] = 1;
  const ringOf = new Map();   // deck -> Set of ring cell indices per module
  MODULES.forEach((m) => {
    for (let d = m.d0; d <= m.d1; d++) {
      if (!ringOf.has(d)) ringOf.set(d, new Map());
      const cells = RING_ORDER.map(([fx, fz]) => { const [dx, dz] = rotate(m.side, fx, fz); return cellIndex(m.mx + dx, m.mz + dz); });
      for (const c of cells) ringOf.get(d).set(c, { cells, d0: m.d0, d1: m.d1 });
    }
  });
  let n = 0;
  while (q.length) {
    const [d, i] = q.pop(); n++;
    const ix = Math.floor(i / N), iz = i - ix * N;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const jx = ix + dx, jz = iz + dz;
      if (jx < 0 || jz < 0 || jx >= N || jz >= N) continue;
      const j = jx * N + jz;
      if (walk[d][j] && !seen[d][j]) { seen[d][j] = 1; q.push([d, j]); }
    }
    const ring = ringOf.get(d)?.get(i);
    if (ring) for (const nd of [d - 1, d + 1]) {
      if (nd < ring.d0 || nd > ring.d1) continue;
      for (const c of ring.cells) if (!seen[nd][c]) { seen[nd][c] = 1; q.push([nd, c]); }
    }
  }
  return { seen, n };
}

test('hangar deck reaches the throne room, the bridge, the reactor catwalks and every room door', () => {
  const walk = walkGraph();
  const start = [HANGAR.deck0, 0, 60];
  assert(walk[start[0]][cellIndex(start[1], start[2])], 'hangar floor cell is walkable');
  const { seen, n } = reach(walk, ...start);
  let walkable = 0; for (let d = 0; d < N_DECKS; d++) for (let i = 0; i < N * N; i++) walkable += walk[d][i];
  console.log(`   reached ${n} of ${walkable} walkable cells (${(100 * n / walkable).toFixed(1)}%)`);
  const want = [['throne', TOWER.throneDeck, 0, 55], ['throne balcony', TOWER.throneDeck, 0, TOWER.balconyZ1 - 1], ['bridge', TOWER.bridgeDeck, 0, 55], ['reactor catwalk deck 12', 12, 10, 0], ['reactor catwalk deck 3', 3, -10, 0], ['reactor catwalk deck 21', 21, 0, 10]];
  const bad = want.filter(([, d, x, z]) => !seen[d][cellIndex(x, z)]).map((w) => w[0]);
  assert(bad.length === 0, `unreachable: ${bad.join(', ')}`);
  const unreachedRooms = [];
  for (let d = 0; d < N_DECKS; d++) for (const r of plans.get(d).rooms) {
    let ok = false;
    const cells = [];
    if (r.fixed && r.x0 !== undefined) { for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) cells.push(cellIndex(x, z)); }
    else for (let u = 0; u < r.w; u++) for (let v = 0; v < r.dp; v++) cells.push(cellIndex(r.ox + r.ax * u + r.dx * v, r.oz + r.az * u + r.dz * v));
    for (const c of cells) if (seen[d][c]) { ok = true; break; }
    if (!ok && r.name !== 'throneUpper' && r.name !== 'tractorChasm') unreachedRooms.push(`${r.name}@deck${d}`);   // air volumes above the throne room / the chasm have no floor of their own
  }
  if (unreachedRooms.length) console.log('   unreachable rooms: ' + unreachedRooms.slice(0, 15).join(', ') + (unreachedRooms.length > 15 ? ` ... (${unreachedRooms.length})` : ''));
  assert(unreachedRooms.length === 0, `${unreachedRooms.length} rooms unreachable`);
});

test('corridor / door / passage cells have a floor and 4 clear rows; room cells have a floor', () => {
  let bad = 0, sample = '';
  for (let d = 0; d <= TOP_SPHERE_DECK; d++) {
    const P = plans.get(d);
    for (let i = 0; i < N * N; i++) {
      const t = P.type[i];
      if (t !== T.CORR && t !== T.DOOR && t !== T.PASS && t !== T.ROOM && t !== T.HANGAR) continue;
      const b = i * DECK_H, floor = P.blocks[b];
      if (t === T.HANGAR && d !== HANGAR.deck0) continue;
      const room = P.roomOf[i] >= 0 ? P.rooms[P.roomOf[i]] : null;
      if (room && room.name.startsWith('tractor')) continue;                        // chasm: floorless by design
      const x = Math.floor(i / N) + X0, z = i % N + Z0;
      if (x >= FIXED.chute.x0 && x <= FIXED.chute.x1 && z >= FIXED.chute.z0 && z <= FIXED.chute.z1) continue;   // garbage chute
      let ok = floor !== 0;
      if (t !== T.ROOM && t !== T.HANGAR) for (let k = 1; k <= 3; k++) if (P.blocks[b + k] !== 0) ok = false;
      if (!ok) { bad++; if (!sample) sample = `deck ${d} cell ${Math.floor(i / N) + X0},${i % N + Z0} type ${t} col ${Array.from(P.blocks.slice(b, b + 7))}`; }
    }
  }
  assert(bad === 0, `${bad} bad cells, e.g. ${sample}`);
});

// ------------------------------------------------------------------------------------------------ chunk fill
const gen = new WorldGen(1337);
const st = register(gen, null);
const cx0 = Math.floor(st.x0 / CS), cx1 = Math.floor((st.x1 - 1) / CS), cz0 = Math.floor(st.z0 / CS), cz1 = Math.floor((st.z1 - 1) / CS);
const allChunks = [];
for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) allChunks.push([cx, cz]);

test(`all ${allChunks.length} station chunks fill in <= 8 ms average (including lazy plan builds)`, () => {
  const gen2 = new WorldGen(1337);
  const st2 = register(gen2, null);      // fresh plans: the timing includes building all decks lazily
  const t1 = performance.now();
  let nonEmpty = 0;
  for (const [cx, cz] of allChunks) {
    const c = new Chunk(cx, cz);
    gen2.applyStructures(c);
    if (c.blocks.some((v) => v)) nonEmpty++;
  }
  const ms = performance.now() - t1;
  console.log(`   ${allChunks.length} chunks (${nonEmpty} non-empty) in ${ms.toFixed(0)} ms: ${(ms / allChunks.length).toFixed(2)} ms/chunk incl. ${st2.plans.buildMs.toFixed(0)} ms of plan builds; structure msTotal/chunks = ${(st2.msTotal / st2.chunks).toFixed(2)}`);
  const t2 = performance.now();
  for (const [cx, cz] of allChunks) gen2.applyStructures(new Chunk(cx, cz));
  console.log(`   warm (plans cached): ${((performance.now() - t2) / allChunks.length).toFixed(2)} ms/chunk`);
  assert(ms / allChunks.length <= 8, `${(ms / allChunks.length).toFixed(2)} ms/chunk`);
});

test('20 sampled chunks hash identically across two independent generators', () => {
  const genA = new WorldGen(1337), genB = new WorldGen(1337);
  register(genA, null); register(genB, null);
  const picks = [];
  for (let i = 0; i < 20; i++) picks.push(allChunks[Math.floor((i + 0.5) * allChunks.length / 20)]);
  const hashes = [];
  for (const [cx, cz] of picks) {
    const a = new Chunk(cx, cz), b = new Chunk(cx, cz);
    genA.applyStructures(a); genB.applyStructures(b);
    const ha = fnv(a.blocks), hb = fnv(b.blocks);
    assert(ha === hb, `chunk ${cx},${cz} differs`);
    hashes.push(ha.toString(16));
  }
  console.log(`   hashes: ${hashes.join(' ')}`);
});

test('the hull seals the interior: no column is open to the sky above a deck cell, block palette is legal', () => {
  const chunks = new Map();
  for (const [cx, cz] of allChunks) { const c = new Chunk(cx, cz); gen.applyStructures(c); chunks.set(`${cx},${cz}`, c); }
  const getBlock = (x, y, z) => { const c = chunks.get(`${Math.floor(x / CS)},${Math.floor(z / CS)}`); return c ? c.blocks[((x & 15) * CS + (z & 15)) * CH + y] : 0; };
  let leaks = 0, illegal = 0, count = 0;
  const legal = new Set(Object.values(B));
  for (const c of chunks.values()) for (let i = 0; i < c.blocks.length; i++) { const v = c.blocks[i]; if (v) { count++; if (!legal.has(v)) illegal++; } }
  // for every plan cell that is walkable on some deck, the column above the station's top must hit an opaque block
  for (let d = 0; d <= TOP_SPHERE_DECK; d++) {
    const P = plans.get(d);
    for (let ix = 0; ix < N; ix += 3) for (let iz = 0; iz < N; iz += 3) {
      const t = P.type[ix * N + iz];
      if (!WALKABLE[t]) continue;
      const wx = ix + X0 + CX, wz = iz + Z0 + CZ, yTop = deckFloorY(d) + 1;
      let sealed = false;
      for (let y = yTop; y < CY + R + 6; y++) { const id = getBlock(wx, y, wz); if (id && id !== B.STEEL_GLASS && id !== B.IRON_BARS) { sealed = true; break; } }
      if (!sealed) leaks++;
    }
  }
  console.log(`   ${count} blocks placed, ${illegal} illegal ids, ${leaks} open columns`);
  assert(illegal === 0 && leaks === 0, `${illegal} illegal ids, ${leaks} sky leaks`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
