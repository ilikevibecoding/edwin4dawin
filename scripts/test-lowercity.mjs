// Node tests for the lower city round the Coruscant plateau (spec section 4, docs/overhaul/w8_lower_city_brief.md):
//   node scripts/test-lowercity.mjs [--verbose]
// Generates the chunks the checks need with the lower city and the hyperlane track registered (the plateau's own
// city structure is not needed: the routes start on the rim promenade, whose floor the lower city paints itself) and
// checks: 1. the region (plateau unchanged at half 512 / ground 60, ring reach 400, frontier ocean beyond the wall);
// 2. monotonic descent from the plateau outward (terrace ground, roof envelope, generated column tops); 3. nothing
// above y 59 in the lower city (the hyperlane / station corridor excepted); 4. the reclamation floor (a solid floor at
// y >= 8 under every column, bedrock kept); 5. the three vertical routes walkable end to end (flood fill over standing
// cells with head room, half-steps and drops <= 3); 6. the fall rule (a fall off the plateau lands on a deck and a
// stair tower / lift is within 120 blocks); 7. chunk fill <= 6 ms per lower-city chunk and determinism (20 sampled
// chunks hash-equal across two generators).
import { initBlocks, BLOCKS, B, SHAPE } from '../src/blocks.js';
import { WorldGen, REGIONS, LOWER, regionAt, lowerGround, lowerLocal, lowerWorld } from '../src/worldgen.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, SEA_LEVEL } from '../src/constants.js';
import { register as registerLower } from '../src/coruscant/lowercity.js';
import { LC, envelope, corridorCentre, PUBLIC_LIFT, FREIGHT_RAMP, VENT_ROUTE } from '../src/coruscant/lowercity/plan.js';
import { registerTrack, LOWER_PYLON_EVERY } from '../src/structures/hyperlane.js';
import { ROUTE } from '../src/vehicles/route.js';

const verbose = process.argv.includes('--verbose');
let passed = 0, failed = 0;
function test(name, fn) {
  try { const detail = fn(); passed++; console.log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack || e.message}`); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

initBlocks();
const C = REGIONS.coruscant, HALF = C.half, CX = C.cx;
function makeGen() { const gen = new WorldGen(1337); registerLower(gen, null); registerTrack(gen); return gen; }
const gen = makeGen();

// ------------------------------------------------------------------------------------------- lazy chunk cache
const chunks = new Map();
const perChunkMs = [];
const key = (cx, cz) => cx * 100000 + cz;
function chunkAt(x, z) {
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS), k = key(cx, cz);
  let c = chunks.get(k);
  if (!c) {
    c = { cx, cz, blocks: new Uint8Array(CS * CS * CH) };
    const t0 = performance.now(); gen.generateChunk(c); perChunkMs.push([performance.now() - t0, cx, cz]);
    chunks.set(k, c);
  }
  return c;
}
const get = (x, y, z) => (y < 0 || y >= CH ? 0 : chunkAt(x, z).blocks[((x & 15) * CS + (z & 15)) * CH + y]);
const def = (id) => BLOCKS[id];
const solid = (id) => id !== 0 && !!def(id) && def(id).solid;
const passable = (id) => id === 0 || !def(id) || !def(id).solid;
const slab = (id) => id !== 0 && !!def(id) && def(id).shape === SHAPE.SLAB;
// highest non-air block below `below`
const topOf = (x, z, below = CH) => { for (let y = below - 1; y >= 0; y--) if (get(x, y, z) !== 0) return y; return -1; };
// the hyperlane and its west station cross the lower city west of the plateau: their columns carry blocks above 59
const inTrackCorridor = (x, z) => x < CX - HALF && z >= -8 && z <= 26 && x >= ROUTE.x0;

// ------------------------------------------------------------------------------------------- 1. the region
test('region: plateau fixed at half 512 / ground 60, lower ring reaches 400, frontier ocean beyond the sea wall', () => {
  assert(HALF === 512 && C.ground === 60 && C.reach === 400 && LOWER.reach === 400, 'REGIONS.coruscant changed');
  assert(regionAt(CX - HALF, 0).kind === 'coruscant' && regionAt(CX - HALF - 1, 0).kind === 'lower', 'plateau edge');
  assert(regionAt(CX - HALF - 400, 0).kind === 'lower' && regionAt(CX - HALF - 401, 0).kind === 'frontier', 'ring edge');
  assert(regionAt(CX, HALF + 400).kind === 'lower' && regionAt(CX, HALF + 401).kind === 'frontier', 'ring edge (south)');
  assert(gen.heightInfo(CX, 0).h === 60 && gen.heightInfo(CX - HALF, 5).h === 60, 'plateau top is 60');
  const sea = gen.heightInfo(CX - HALF - 420, 100);
  assert(sea.region === 'frontier' && sea.h < SEA_LEVEL && get(CX - HALF - 420, SEA_LEVEL, 100) === B.WATER, 'ocean beyond the wall (water at sea level)');
  assert(get(CX - HALF - 200, SEA_LEVEL, 100) !== B.WATER, 'the basin is dry');
  for (const x of [CX - HALF - 5, CX - HALF - 150, CX - HALF - 395]) assert(get(x, 0, 7) === B.BEDROCK, 'bedrock kept under the ring');
  return `sea floor ${sea.h} at 420 out, water to ${SEA_LEVEL}`;
});

// ------------------------------------------------------------------------------------------- sampled radial lines
// 6 radial lines per side through the whole ring (all bands, the wall, 4 blocks of sea), avoiding the hyperlane on the west
const LINES = [];
for (let side = 0; side < 4; side++) for (const v of [-470, -300, -130, 60, 230, 400]) LINES.push({ side, v: side === 0 && v === 60 ? 110 : v });
const lineColumns = (L) => { const out = []; for (let d = 1; d <= LOWER.reach + 4; d++) { const w = lowerWorld(L.side, d, L.v); out.push({ d, x: w.x, z: w.z }); } return out; };

test('monotonic descent: terrace ground and roof envelope never rise outward; column tops stay under the envelope', () => {
  for (let d = 2; d < LOWER.wallD0; d++) assert(lowerGround(d) <= lowerGround(d - 1), `ground rises at d ${d}`);
  assert(lowerGround(1) < C.ground && lowerGround(LOWER.wallD0 - 1) === LOWER.floor && LOWER.wallTop < C.ground, 'terraces 60 -> floor, wall under the plateau');
  for (let d = 2; d <= LOWER.reach; d++) assert(envelope(d) <= envelope(d - 1), `envelope rises at d ${d}`);
  assert(envelope(1) <= 59 && envelope(LOWER.wallD0) === LC.envBottom, 'envelope 59 -> 20');
  let checked = 0, worst = 0;
  for (const L of LINES) for (const col of lineColumns(L)) {
    if (col.d >= LOWER.wallD0 || inTrackCorridor(col.x, col.z)) continue;   // the sea wall is the perimeter dyke, not a roof
    const top = topOf(col.x, col.z);
    assert(top <= envelope(col.d), `column ${col.x},${col.z} (d ${col.d}) tops at ${top} > envelope ${envelope(col.d)}`);
    worst = Math.max(worst, top - lowerGround(col.d)); checked++;
  }
  return `${checked} columns on ${LINES.length} radial lines, tallest mass ${worst} over its terrace`;
});

test('nothing above y 59 outside the plateau (hyperlane corridor: nothing between 60 and the track)', () => {
  let n = 0;
  for (const L of LINES) for (const col of lineColumns(L)) {
    if (col.d > LOWER.reach) continue;
    const top = inTrackCorridor(col.x, col.z) ? topOf(col.x, col.z, ROUTE.deckY - 4) : topOf(col.x, col.z);
    assert(top <= 59, `column ${col.x},${col.z} (d ${col.d}) reaches y ${top}`); n++;
  }
  // the track corridor itself, along the trench under the hyperlane (the bridge pylons and the station's pillar are
  // the only columns allowed to climb from the trench to the track)
  const support = (x, z) => (z >= -2 && z <= 1 && x % LOWER_PYLON_EVERY <= 1) || (x === 2473 && (z === 6 || z === 7));
  for (let x = CX - HALF - 1; x >= CX - HALF - LOWER.reach; x -= 1) for (const z of [-5, -2, 0, 1, 3, 5, 7]) { if (support(x, z)) continue; const top = topOf(x, z, ROUTE.deckY - 4); assert(top <= 59, `track corridor ${x},${z} reaches ${top}`); n++; }
  return `${n} columns`;
});

test('reclamation floor: every ring column has a solid floor at y >= 8, the sea wall holds the ocean out', () => {
  let lowest = CH;
  for (const L of LINES) for (const col of lineColumns(L)) {
    if (col.d > LOWER.reach) continue;
    let y = 60; while (y > 0 && !solid(get(col.x, y, col.z))) y--;
    assert(y >= 8, `column ${col.x},${col.z} (d ${col.d}) has no floor above y 8 (first solid at ${y})`);
    lowest = Math.min(lowest, y);
    for (let yy = 1; yy <= 60; yy++) assert(get(col.x, yy, col.z) !== B.WATER, `water in the basin at ${col.x},${yy},${col.z}`);
  }
  for (const L of LINES) { const w = lowerWorld(L.side, LOWER.wallD0 + 4, L.v); assert(topOf(w.x, w.z) >= LOWER.wallTop && topOf(w.x, w.z) > SEA_LEVEL, 'sea wall above sea level'); }
  return `lowest floor y ${lowest}`;
});

test('hyperlane: bridge pylons every 24 over the lower city stand on the trench floor; the track itself is unchanged', () => {
  let pylons = 0;
  for (let x = CX - HALF - 1; x >= CX - HALF - LOWER.reach; x--) {
    assert(get(x, ROUTE.deckY, 0) === B.DURASTEEL_DARK && get(x, ROUTE.railY, -2) === B.RAIL, `track missing at x ${x}`);
    if (x % LOWER_PYLON_EVERY === 0) {
      pylons++;
      const floor = lowerLocal(x, 0).d >= LOWER.wallD0 ? LOWER.wallTop : Math.max(lowerGround(lowerLocal(x, 0).d) - 10, LOWER.floor);
      for (let y = floor + 1; y <= ROUTE.deckY - 4; y++) assert(solid(get(x, y, 0)), `pylon at x ${x} broken at y ${y} (floor ${floor})`);
    } else if (x % LOWER_PYLON_EVERY > 1) {
      assert(get(x, 70, 0) === 0, `stray support at x ${x}`);
    }
  }
  return `${pylons} pylons`;
});

// ------------------------------------------------------------------------------------------- 5. the routes
// Standing at (x, y, z): feet cell y, head cell y + 1 passable, support below (a solid block, or a slab in the feet
// cell = standing at y + 0.5). Moves: 4-neighbours with a rise <= 1 (a rise over 0.6 is a jump and needs a free
// block over the head) or a drop <= 3.
function standAt(x, y, z) {
  const feet = get(x, y, z), head = get(x, y + 1, z);
  if (!passable(head)) return null;
  if (slab(feet)) return y + 0.5;
  if (!passable(feet)) return null;
  const below = get(x, y - 1, z);
  return solid(below) ? y : null;
}
function floodFill(starts, box) {
  const W = box.x1 - box.x0 + 1, H = box.y1 - box.y0 + 1, Dp = box.z1 - box.z0 + 1;
  const seen = new Uint8Array(W * H * Dp);
  const idx = (x, y, z) => ((x - box.x0) * Dp + (z - box.z0)) * H + (y - box.y0);
  const inBox = (x, y, z) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && z >= box.z0 && z <= box.z1;
  const q = [];
  const push = (x, y, z) => { if (!inBox(x, y, z) || seen[idx(x, y, z)] || standAt(x, y, z) === null) return; seen[idx(x, y, z)] = 1; q.push(x, y, z); };
  for (const [x, y, z] of starts) push(x, y, z);
  let n = 0;
  while (q.length) {
    const z = q.pop(), y = q.pop(), x = q.pop(); n++;
    const s = standAt(x, y, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let dy = 1; dy >= -3; dy--) {
        const t = standAt(x + dx, y + dy, z + dz);
        if (t === null) continue;
        const rise = t - s;
        if (rise > 1.001) continue;
        if (rise > 0.6 && !passable(get(x, y + 2, z))) continue;
        push(x + dx, y + dy, z + dz);
      }
    }
  }
  return { seen, idx, inBox, count: n, has: (x, y, z) => inBox(x, y, z) && !!seen[idx(x, y, z)] };
}
const anyOf = (fill, cells) => cells.some(([x, y, z]) => fill.has(x, y, z));
const fmt = (cells) => cells.map((c) => c.join(',')).join(' | ');

// route 1: the public lift (south rim near x 3000): promenade door -> deck landing (41) -> trench floor (31) -> the
// trench stairs down to the y 20 level
const LIFT = (() => {
  const T = PUBLIC_LIFT, vOf = (b) => T.c - 2 + (T.mirror ? 3 - b : b);
  const w = (d, v) => lowerWorld(T.side, d, v);
  const rim = w(-5, vOf(1)), rim2 = w(-5, vOf(2));
  const deck = [0, 1, 2, 3].map((b) => { const p = w(2, vOf(b)); return [p.x, T.landing, p.z]; });
  const trench = [[w(1, T.c - 5)], [w(2, T.c - 5)], [w(3, T.c - 6)]].map(([p]) => [p.x, T.bottom, p.z]);
  const deep = [w(120, 0), w(122, 1), w(125, -1)].map((p) => [p.x, 21, p.z]);
  const a = w(-6, T.c - 12), b = w(130, T.c + 12);
  return { starts: [[rim.x, 61, rim.z], [rim2.x, 61, rim2.z]], deck, trench, deep, box: { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), y0: 10, y1: 70 } };
})();
test('route 1 (public lift, south rim x ~3000): rim door -> landing on the y 40 deck -> trench floor y 30 -> y 20 level', () => {
  const fill = floodFill(LIFT.starts, LIFT.box);
  assert(fill.count > 40, `flood fill from the rim door found only ${fill.count} cells`);
  assert(anyOf(fill, LIFT.deck), `deck landing not reached: ${fmt(LIFT.deck)}`);
  assert(anyOf(fill, LIFT.trench), `trench floor not reached: ${fmt(LIFT.trench)}`);
  assert(anyOf(fill, LIFT.deep), `y 20 trench level not reached: ${fmt(LIFT.deep)}`);
  const up = floodFill(LIFT.trench, LIFT.box);
  assert(anyOf(up, LIFT.starts), 'not walkable back up from the trench to the rim');
  return `entrance ${fmt(LIFT.starts.slice(0, 1))}, deck exit ${fmt(LIFT.deck.slice(1, 2))}, trench exit ${fmt(LIFT.trench.slice(0, 1))}; ${fill.count} cells`;
});

// route 2: the freight ramp from the spaceport's west edge (x 2560, z -9, y 61) down the switchback into the west trench
const RAMP = (() => {
  const R = FREIGHT_RAMP, w = (d, v) => lowerWorld(R.side, d, v);
  const start = [[R.laneX1 - 2, 61, R.laneZ0 + 1], [R.laneX1 - 1, 61, R.laneZ0 + 1]];
  const head = [w(2, R.head.v0)].map((p) => [p.x, R.head.s, p.z]);
  const turn = [w(4, R.turn.v0 + 1)].map((p) => [p.x, R.turn.s, p.z]);
  const trench = [w(6, -2), w(6, 0), w(5, -1)].map((p) => [p.x, R.pass.s, p.z]);
  const far = [w(50, 0), w(60, -1), w(70, 1)].map((p) => [p.x, R.pass.s, p.z]);
  return { starts: start, head, turn, trench, far, box: { x0: CX - HALF - 80, x1: R.laneX1 + 2, z0: R.turn.v0 - 12, z1: 12, y0: 20, y1: 70 } };
})();
test('route 2 (freight ramp from the spaceport west edge x 2560, z -9): lane -> cut -> switchback -> trench floor y 30', () => {
  const fill = floodFill(RAMP.starts, RAMP.box);
  assert(anyOf(fill, RAMP.head), `ramp head not reached: ${fmt(RAMP.head)}`);
  assert(anyOf(fill, RAMP.turn), `switchback turn not reached: ${fmt(RAMP.turn)}`);
  assert(anyOf(fill, RAMP.trench), `trench floor not reached: ${fmt(RAMP.trench)}`);
  assert(anyOf(fill, RAMP.far), `trench not walkable outward under the hyperlane: ${fmt(RAMP.far)}`);
  const up = floodFill(RAMP.trench, RAMP.box);
  assert(anyOf(up, RAMP.starts), 'not walkable back up from the trench to the plateau');
  // 1:4 slope with slab steps: 60 blocks of leg for 15 of drop, 48 for 12
  const R = FREIGHT_RAMP;
  assert((R.leg1.v0 - R.leg1.v1 + 1) === 2 * (R.leg1.s0 - R.turn.s) * 2 && (R.leg2.v1 - R.leg2.v0 + 1) === 2 * (R.leg2.s0 - R.pass.s) * 2, 'legs are 1:4');
  return `entrance ${fmt(RAMP.starts.slice(1))}, trench exit ${fmt(RAMP.trench.slice(0, 1))}; ${fill.count} cells`;
});

// route 3: the vent-well route on the east rim: open grate in the promenade -> helix shaft -> maintenance balcony
// (feet 45) -> stair to the deck (41) and the spiral down the ventilation well to the reclamation floor (13)
const VENT = (() => {
  const V = VENT_ROUTE, w = (d, v) => lowerWorld(V.side, d, v);
  const rim = [w(-5, V.shaftV0 + 1), w(-5, V.shaftV0 + 2)].map((p) => [p.x, 61, p.z]);
  const balcony = [w(1, V.balconyV0 + 2), w(2, V.balconyV0 + 3), w(3, V.balconyV0 + 5)].map((p) => [p.x, V.balconyY + 1, p.z]);
  const deck = [w(13, V.stairV0), w(13, V.stairV0 + 1), w(14, V.stairV0)].map((p) => [p.x, 41, p.z]);
  const floor = [w(3, V.wellV0 + 2), w(4, V.wellV0 + 2), w(5, V.wellV0 + 5), w(2, V.wellV0 + 4)].map((p) => [p.x, LOWER.floor + 1, p.z]);
  return { starts: rim, balcony, deck, floor, box: { x0: CX + HALF - 8, x1: CX + HALF + 24, z0: V.balconyV0 - 8, z1: V.wellV0 + 14, y0: 5, y1: 70 } };
})();
test('route 3 (vent well from an east-rim grate): promenade grate -> shaft -> y 45 balcony -> deck -> well spiral -> floor', () => {
  const fill = floodFill(VENT.starts, VENT.box);
  assert(anyOf(fill, VENT.balcony), `maintenance balcony not reached: ${fmt(VENT.balcony)}`);
  assert(anyOf(fill, VENT.deck), `deck at the balcony stair's foot not reached: ${fmt(VENT.deck)}`);
  assert(anyOf(fill, VENT.floor), `well floor not reached: ${fmt(VENT.floor)}`);
  const up = floodFill(VENT.floor, VENT.box);
  assert(anyOf(up, VENT.starts), 'not walkable back up from the well floor to the rim');
  // the well glows warm at the bottom, the grate is in the promenade floor
  const V = VENT_ROUTE, c = lowerWorld(V.side, 1 + 3, V.wellV0 + 4);
  assert(get(c.x, LOWER.floor, c.z) === B.MAGMA, 'magma glow at the well bottom');
  const g = lowerWorld(V.side, -3, V.shaftV0 + 1);
  assert(get(g.x, 60, g.z) === B.VENT, 'vent grate in the promenade floor');
  return `entrance ${fmt(VENT.starts.slice(0, 1))}, balcony ${fmt(VENT.balcony.slice(0, 1))}, floor ${fmt(VENT.floor.slice(0, 1))}; ${fill.count} cells`;
});

// ------------------------------------------------------------------------------------------- 6. the fall rule
test('fall rule: a fall off any plateau edge lands on a deck (y >= 30), and a stair tower / lift stands within 120 blocks', () => {
  let n = 0, farthest = 0, lowest = CH;
  const towers = (side) => {
    const out = [];
    for (let k = -7; k <= 7; k++) { const c = LC.corridorOff + LC.corridorEvery * k; if (corridorCentre(side, c) === c) out.push(c); }
    if (side === PUBLIC_LIFT.side) out.push(PUBLIC_LIFT.c);
    if (side === FREIGHT_RAMP.side) out.push(FREIGHT_RAMP.head.v0);
    return out;
  };
  for (let side = 0; side < 4; side++) {
    const ts = towers(side);
    for (let v = -500; v <= 500; v += 25) {
      if (side === 0 && v >= -8 && v <= 26) continue;                     // the hyperlane station hangs over the edge here
      for (const d of [1, 2, 3]) {
        const w = lowerWorld(side, d, v);
        let y = 59; while (y > 0 && !solid(get(w.x, y, w.z))) y--;
        assert(y >= 30, `fall at side ${side} v ${v} d ${d} lands at y ${y}`);
        lowest = Math.min(lowest, y); n++;
      }
      const dist = Math.min(...ts.map((c) => Math.abs(c - v)));
      assert(dist <= 120, `no stair tower within 120 of side ${side} v ${v} (nearest ${dist})`);
      farthest = Math.max(farthest, dist);
    }
  }
  return `${n} landings, lowest y ${lowest}, farthest tower ${farthest} blocks along the edge`;
});

// ------------------------------------------------------------------------------------------- 7. timing + determinism
test('chunk fill: the lower-city structure fills a chunk in <= 6 ms (warm average), full generation stays cheap', () => {
  const st = gen.structures.find((s) => s.name === 'lowercity');
  assert(st && st.chunks > 100, 'lower-city structure fills recorded');
  const avg = st.msTotal / st.chunks;
  // a fresh generator on the densest chunks (band 0 masses, trench, towers) for the warm per-chunk cost
  const g2 = makeGen();
  const mk = (cx, cz) => ({ cx, cz, blocks: new Uint8Array(CS * CS * CH) });
  for (let i = 0; i < 6; i++) g2.generateChunk(mk(155 - i, 3));
  const s2 = g2.structures.find((s) => s.name === 'lowercity'); s2.msTotal = 0; s2.chunks = 0;
  let worstAll = 0;
  for (let cx = 150; cx <= 155; cx++) for (let cz = -6; cz <= 6; cz++) { const t0 = performance.now(); g2.generateChunk(mk(cx, cz)); worstAll = Math.max(worstAll, performance.now() - t0); }
  for (let cz = 32; cz <= 34; cz++) for (let cx = 186; cx <= 189; cx++) { const t0 = performance.now(); g2.generateChunk(mk(cx, cz)); worstAll = Math.max(worstAll, performance.now() - t0); }
  const warm = s2.msTotal / s2.chunks;
  assert(warm <= 6, `lower-city fill averages ${warm.toFixed(2)} ms per chunk (> 6)`);
  assert(avg <= 6, `lower-city fill averaged ${avg.toFixed(2)} ms per chunk over the test (> 6)`);
  const ringChunks = perChunkMs.filter(([, cx, cz]) => lowerLocal(cx * CS + 8, cz * CS + 8));
  const worstRing = Math.max(...ringChunks.map(([ms]) => ms));
  return `structure fill ${warm.toFixed(2)} ms/chunk warm (${s2.chunks} dense chunks), ${avg.toFixed(2)} ms/chunk over ${st.chunks} test chunks; whole chunk worst ${worstAll.toFixed(1)} ms dense / ${worstRing.toFixed(1)} ms over ${ringChunks.length} ring chunks`;
});

test('determinism: 20 sampled ring chunks are hash-equal across two generators', () => {
  const gA = makeGen(), gB = makeGen();
  const hash = (a) => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  const samples = [];
  for (let i = 0; i < 20; i++) { const side = i % 4, d = 1 + ((i * 97) % LOWER.reach), v = -500 + ((i * 331) % 1000); const w = lowerWorld(side, d, v); samples.push([Math.floor(w.x / CS), Math.floor(w.z / CS)]); }
  samples[0] = [Math.floor((CX + PUBLIC_LIFT.c) / CS), Math.floor((HALF + 1) / CS)];                 // the lift
  samples[1] = [Math.floor((CX - HALF - 6) / CS), -3];                                                // the ramp
  samples[2] = [Math.floor((CX + HALF + 2) / CS), Math.floor(VENT_ROUTE.wellV0 / CS)];                // the vent well
  for (const [cx, cz] of samples) {
    const a = { cx, cz, blocks: new Uint8Array(CS * CS * CH) }, b = { cx, cz, blocks: new Uint8Array(CS * CS * CH) };
    gA.generateChunk(a); gB.generateChunk(b);
    assert(hash(a.blocks) === hash(b.blocks), `chunk ${cx},${cz} differs between generators`);
    const again = { cx, cz, blocks: new Uint8Array(CS * CS * CH) }; gA.generateChunk(again);
    assert(hash(again.blocks) === hash(a.blocks), `chunk ${cx},${cz} differs on regeneration`);
  }
  return `${samples.length} chunks`;
});

if (verbose) {
  const slow = perChunkMs.slice().sort((a, b) => b[0] - a[0]).slice(0, 5).map(([ms, cx, cz]) => `${cx},${cz}: ${ms.toFixed(1)} ms`);
  console.log(`generated ${chunks.size} chunks; slowest ${slow.join('; ')}`);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
