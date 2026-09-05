// Node unit tests for the Coruscant spaceport, the ship models and the ship traffic (no browser needed):
//   node scripts/test-spaceport.mjs
import assert from 'node:assert/strict';
import { initBlocks, BLOCKS, B } from '../src/blocks.js';
import { WorldGen } from '../src/worldgen.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, TICK_RATE } from '../src/constants.js';
import { register, SPACEPORT, DECK_Y, STATION_Y } from '../src/coruscant/spaceport.js';
import { shipModels, buildShipGeometry } from '../src/ships/models.js';
import { buildShips, routePose, nextPhaseStart, ShipTraffic, HIDE_DIST } from '../src/ships/traffic.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n   ${e.stack || e.message}`); }
}

initBlocks();
const S = SPACEPORT;

// --- generate every chunk of the structure (twice, for determinism) ---------------------------------------------
const gen = new WorldGen(1337);
register(gen, null);
const chunks = new Map();
const key = (cx, cz) => cx * 100000 + cz;
let mismatches = 0, genMs = 0, n = 0;
{
  const cx0 = Math.floor(S.x0 / CS), cx1 = Math.floor((S.x1 - 1) / CS), cz0 = Math.floor(S.z0 / CS), cz1 = Math.floor((S.z1 - 1) / CS);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const c = { cx, cz, blocks: new Uint8Array(CS * CS * CH) };
    const t0 = performance.now(); gen.generateChunk(c); genMs += performance.now() - t0; n++;
    const c2 = { cx, cz, blocks: new Uint8Array(CS * CS * CH) }; gen.generateChunk(c2);
    for (let i = 0; i < c.blocks.length; i++) if (c.blocks[i] !== c2.blocks[i]) { mismatches++; break; }
    chunks.set(key(cx, cz), c);
  }
}
const get = (x, y, z) => {
  if (y < 0 || y >= CH) return 0;
  const c = chunks.get(key(Math.floor(x / CS), Math.floor(z / CS)));
  return c ? c.blocks[((x & 15) * CS + (z & 15)) * CH + y] : 0;
};
const solid = (id) => id > 0 && BLOCKS[id].solid;
const topOf = (y, id) => y + (BLOCKS[id].shape === 2 ? 0.5 : 1);
// every height a player can stand at in a column (solid top with two free blocks above)
function standHeights(x, z) {
  const out = [];
  for (let y = 60; y < 200; y++) {
    const id = get(x, y, z);
    if (!solid(id)) continue;
    if (get(x, y + 1, z) === 0 && get(x, y + 2, z) === 0) out.push(topOf(y, id));
  }
  return out;
}
// strict walk (auto-step <= 0.6, drops <= 3, no jumping) from a start to a set of targets; returns the unreached ones
function walkFrom(start, targets) {
  const seen = new Set(), q = [start];
  const sk = (x, z, h) => `${x},${z},${h}`;
  seen.add(sk(...start));
  const left = new Map(targets.map((t) => [sk(...t), t]));
  while (q.length && left.size) {
    const [x, z, h] = q.shift();
    left.delete(sk(x, z, h));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < S.x0 - 80 || nx >= S.x1 || nz < S.z0 || nz >= S.z1) continue;
      for (const nh of standHeights(nx, nz)) {
        if (nh - h > 0.6 || h - nh > 3) continue;
        const k = sk(nx, nz, nh);
        if (!seen.has(k)) { seen.add(k); q.push([nx, nz, nh]); }
      }
    }
  }
  return [...left.values()];
}

test('spaceport chunks generate deterministically and cheaply', () => {
  assert.equal(mismatches, 0, 'two generations differ');
  const st = gen.structures.find((s) => s.name === 'spaceport');
  assert.ok(st && st.chunks >= n, 'structure fill ran for every chunk');
  const fillAvg = st.msTotal / st.chunks;
  console.log(`   ${n} chunks, full gen avg ${(genMs / n).toFixed(2)} ms, spaceport fill avg ${fillAvg.toFixed(3)} ms`);
  assert.ok(fillAvg < 2, `spaceport fill too slow: ${fillAvg} ms/chunk`);
});

test('hyperlane corridor (x <= 2560, |z| <= 14, y 84..100) stays free of blocks', () => {
  let bad = 0;
  for (let x = 2488; x <= 2560; x++) for (let z = -14; z <= 14; z++) for (let y = 84; y <= 100; y++) if (get(x, y, z) !== 0) bad++;
  assert.equal(bad, 0);
});

test('bridge floor is at the station level (y 90) and the ramp climbs in half-steps to the deck', () => {
  // (the column also has the plateau ground below and the canopy roof above)
  for (let x = S.bridge.x0; x <= S.bridge.x1; x++) assert.ok(standHeights(x, 0).includes(STATION_Y + 1), `bridge surface at x ${x}`);
  let prev = STATION_Y + 1;
  for (let x = S.ramp.x0; x <= S.ramp.x1 + 1; x++) {
    const hs = standHeights(x, 0).filter((h) => h > STATION_Y && h <= DECK_Y + 1);
    assert.equal(hs.length, 1, `single surface on the ramp at x ${x}`);
    assert.ok(hs[0] - prev <= 0.5 + 1e-9 && hs[0] >= prev, `ramp rises by at most a half step at x ${x}: ${prev} -> ${hs[0]}`);
    prev = hs[0];
  }
  assert.equal(prev, DECK_Y);
});

test('every pad is a flat, clear 24x24 deck-plate square at the deck level with edge lights and a painted number', () => {
  const H = S.padHalf;
  assert.ok(S.pads.length >= 8);
  for (const pad of S.pads) {
    let lamps = 0, lines = 0, red = 0, plate = 0;
    for (let x = pad.x - H; x < pad.x + H; x++) for (let z = pad.z - H; z < pad.z + H; z++) {
      const id = get(x, 96, z);
      if (id === B.CITY_LAMP) lamps++; else if (id === B.DURASTEEL) lines++; else if (id === B.PANEL_RED) red++; else if (id === B.DECK_PLATE) plate++;
      assert.ok(solid(id), `pad floor at ${x},${z}`);
      // the inner 20x20 has clear air above it up to the approach height (corner lamps sit in the 2-block rim)
      if (Math.abs(x + 0.5 - pad.x) < 10 && Math.abs(z + 0.5 - pad.z) < 10) for (let y = 97; y <= 135; y++) assert.equal(get(x, y, z), 0, `airspace over pad at ${x},${y},${z}`);
    }
    assert.ok(lamps >= 12, `edge lights on pad at ${pad.x},${pad.z}: ${lamps}`);
    assert.ok(lines > 60 && red > 20 && plate > 300, `pad markings: lines ${lines} red ${red} plate ${plate}`);
    assert.equal(get(pad.x, 96, pad.z), B.GLOW_PANEL, 'lit centre');
  }
});

test('terminal is enclosed and roofed, lit, with departure boards, consoles, seating and open doors', () => {
  const T = S.terminal;
  let open = 0, glow = 0, holo = 0, con = 0, seats = 0, glassRoof = 0;
  for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    let covered = false;
    for (let y = 97; y < 120; y++) {
      const id = get(x, y, z);
      if (id !== 0 && y >= 104) covered = true;
      if (id === B.GLOW_PANEL) glow++; else if (id === B.HOLO_SIGN) holo++; else if (id === B.CONSOLE) con++; else if (id === B.STONE_BRICK_SLAB) seats++;
      if (id === B.STEEL_GLASS && y >= 111) glassRoof++;
    }
    if (!covered) open++;
  }
  assert.equal(open, 0, `${open} columns without roof cover`);
  assert.ok(glassRoof > 2000 && glow > 60 && holo > 60 && con > 8 && seats > 80, `roof ${glassRoof} glow ${glow} holo ${holo} consoles ${con} seats ${seats}`);
  for (const x of [T.x0, T.x1]) for (let y = 97; y <= 101; y++) assert.equal(get(x, y, 0), 0, `door open at x ${x}`);
  for (const z of [T.z0, T.z1]) for (let y = 97; y <= 101; y++) assert.equal(get(T.cx, y, z), 0, `door open at z ${z}`);
});

test('control tower is ~60 high with a glass cab; hangar has an open front; fuel farm has four chrome tanks', () => {
  const T = S.tower;
  assert.ok(T.cabY - DECK_Y >= 50 && T.cabY - DECK_Y <= 70, 'cab height');
  let glass = 0; for (let x = T.x0 - 4; x <= T.x1 + 4; x++) for (const z of [T.z0 - 4, T.z1 + 4]) for (let y = T.cabY + 2; y <= T.cabY + 4; y++) if (get(x, y, z) === B.STEEL_GLASS) glass++;
  assert.ok(glass > 60, `cab glass ${glass}`);
  const Hg = S.hangar, zc = (Hg.z0 + Hg.z1) >> 1;
  for (let z = zc - 12; z <= zc + 12; z++) for (let y = 97; y <= 108; y++) assert.equal(get(Hg.x0, y, z), 0, `hangar front open at ${z},${y}`);
  assert.ok(solid(get(Hg.x1, 105, zc)) && solid(get(Hg.x0 + 10, 112, zc)), 'hangar back wall and roof');
  for (const [cx, cz] of S.fuel.tanks) { assert.equal(get(cx, 105, cz), B.CHROME); assert.equal(get(cx + 4, 105, cz), B.CHROME); }
});

test('strictly walkable (no jumps) from the train platform to every pad, the tower cab, the hangar and the fuel farm', () => {
  const targets = S.pads.map((p) => [p.x, p.z, DECK_Y]);
  targets.push([2686, 0, S.tower.cabY + 1], [S.hangar.x0 + 8, (S.hangar.z0 + S.hangar.z1) >> 1, DECK_Y], [S.fuel.x0 + 8, -71, DECK_Y], [S.terminal.x0 + 8, 0, DECK_Y], [S.terminal.cx, 20, DECK_Y]);
  const unreached = walkFrom([S.bridge.x0, 0, STATION_Y + 1], targets);
  assert.deepEqual(unreached, [], 'unreached targets');
});

// --- ship models --------------------------------------------------------------------------------------------------
test('four ship designs 8..24 blocks long, one culled geometry each with emissive engine faces', () => {
  const models = shipModels();
  assert.ok(models.length >= 4);
  assert.deepEqual(models.map((m) => m.name), ['freighter', 'shuttle', 'airspeeder', 'gunship']);
  for (const m of models) {
    assert.ok(m.length >= 8 && m.length <= 24, `${m.name} length ${m.length}`);
    const { geometry, faces } = buildShipGeometry(m);
    assert.ok(faces > 100 && geometry.getAttribute('position').count === faces * 4);
    const emit = geometry.getAttribute('aEmit').array;
    let e = 0; for (const v of emit) if (v) e++;
    assert.ok(e >= 12, `${m.name} has glowing faces`);
    let blue = 0; for (const v of m.grid.data) if (v === B.GLOW_PANEL_BLUE) blue++;
    assert.ok(blue >= 2, `${m.name} has blue engine panels`);
    assert.ok(geometry.boundingSphere.radius < 14);
  }
});

// --- traffic ------------------------------------------------------------------------------------------------------
const ships = buildShips(S.pads, DECK_Y);
test('at least 12 ships: one landing cycle per pad plus lane loops; poses are a pure function of time', () => {
  assert.ok(ships.length >= 12, `${ships.length} ships`);
  assert.equal(ships.filter((s) => s.pad !== null).length, S.pads.length);
  const again = buildShips(S.pads, DECK_Y);
  const a = {}, b = {};
  for (let i = 0; i < ships.length; i++) for (let t = 0; t < ships[i].route.period; t += 0.37) {
    routePose(ships[i].route, t, a); routePose(again[i].route, t, b);
    assert.deepEqual([a.x, a.y, a.z, a.yaw, a.pitch, a.roll, a.thrust, a.phase], [b.x, b.y, b.z, b.yaw, b.pitch, b.roll, b.thrust, b.phase]);
  }
});

test('landing cycle: descend -> hover 2 s -> touch down -> dwell 15..40 s on the pad centre -> lift -> climb, continuous motion', () => {
  const models = shipModels();
  for (const sh of ships.filter((s) => s.pad !== null)) {
    const segs = sh.route.segs, phases = segs.map((s) => s.phase);
    assert.deepEqual(phases, ['fly', 'descend', 'hover', 'touchdown', 'dwell', 'lift', 'hover', 'climb']);
    const by = (p) => segs.find((s) => s.phase === p);
    assert.equal(by('hover').dur, 2);
    assert.ok(by('dwell').dur >= 15 && by('dwell').dur <= 40, `dwell ${by('dwell').dur}`);
    const pad = S.pads[sh.pad], p = {};
    routePose(sh.route, by('dwell').t0 + 1, p);
    assert.deepEqual([p.x, p.y, p.z, p.phase], [pad.x, DECK_Y, pad.z, 'dwell']);
    routePose(sh.route, by('touchdown').t0, p); assert.ok(Math.abs(p.y - (DECK_Y + 4)) < 0.3, 'hover height');
    routePose(sh.route, by('climb').t0 + by('climb').dur - 1e-6, p); assert.ok(Math.abs(p.y - 130) < 0.01, 'climb tops out at the approach height');
    // continuity: no jump larger than one tick of top speed anywhere in the period (including the wrap)
    const vmax = models[sh.type].speed * 1.05;
    let prev = null, maxJump = 0;
    for (let t = 0; t <= sh.route.period + 0.05; t += 0.05) {
      const q = routePose(sh.route, t, {});
      if (prev) maxJump = Math.max(maxJump, Math.hypot(q.x - prev.x, q.y - prev.y, q.z - prev.z));
      prev = q;
    }
    assert.ok(maxJump <= vmax * 0.05 + 1e-6, `${sh.name}: jump ${maxJump.toFixed(2)} > ${(vmax * 0.05).toFixed(2)}`);
    // the sky-side of the loop stays within the lane band
    for (let t = 0; t < by('fly').dur; t += 1) { const q = routePose(sh.route, t, {}); assert.ok(q.y >= 125 && q.y <= 225, `lane altitude ${q.y}`); }
    const nd = nextPhaseStart(sh, 'descend', 100);
    assert.ok(nd >= 100 && routePose(sh.route, nd + sh.offset + 1e-3, {}).phase === 'descend');
  }
  for (const sh of ships.filter((s) => s.pad === null)) for (let t = 0; t < sh.route.period; t += 2) { const q = routePose(sh.route, t, {}); assert.ok(q.y >= 110 && q.y <= 225, `lane altitude ${q.y}`); }
});

test('ships bank into turns (roll from curvature, bounded) and pitch with climbs', () => {
  let maxRoll = 0, rolled = 0, samples = 0;
  for (const sh of ships) for (let t = 0; t < sh.route.period; t += 0.5) {
    const q = routePose(sh.route, t, {});
    samples++;
    if (Math.abs(q.roll) > 0.1) rolled++;
    maxRoll = Math.max(maxRoll, Math.abs(q.roll));
    assert.ok(Math.abs(q.roll) <= 0.75 && Math.abs(q.pitch) <= 0.8);
  }
  assert.ok(maxRoll > 0.3 && rolled > samples * 0.1, `max roll ${maxRoll}, rolled ${rolled}/${samples}`);
});

// A minimal fake game: light sampler, recording audio, no scene.
function fakeGame() {
  const calls = [];
  const audio = {
    ctx: {}, loops: new Set(),
    loopStart(id) { this.loops.add(id); calls.push(['start', id]); },
    loopSet(id, o) { calls.push(['set', id, o]); },
    loopStop(id) { this.loops.delete(id); calls.push(['stop', id]); },
    noise() { calls.push(['noise']); }, tone() { calls.push(['tone']); },
    spatialFor() { return { gain: 1, pan: 0 }; },
  };
  return { atlas: null, world: { sampleLight: () => [1, 0] }, audio, calls };
}

test('ShipTraffic: one InstancedMesh per model type, ships beyond 300 blocks are not submitted, <= 4 draw calls', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y });
  assert.equal(tr.types.length, shipModels().length);
  for (const ty of tr.types) assert.ok(ty.mesh.isInstancedMesh && ty.mesh.frustumCulled === false);
  const cam = { position: { x: 2620, y: 100, z: -60 } };
  tr.tick(12345);
  tr.update(1 / 60, 0.5, cam);
  const t = tr.timeAt(0.5);
  let near = 0;
  for (const sh of tr.ships) { const p = routePose(sh.route, t + sh.offset, {}); if (Math.hypot(p.x - cam.position.x, p.y - cam.position.y, p.z - cam.position.z) <= HIDE_DIST) near++; }
  assert.equal(tr.stats.visible, near);
  assert.equal(tr.types.reduce((s, ty) => s + ty.mesh.count, 0), near);
  assert.ok(tr.stats.drawCalls <= 4 && tr.stats.drawCalls >= 1);
  // far camera: nothing drawn
  tr.update(1 / 60, 0.5, { position: { x: 0, y: 100, z: 0 } });
  assert.equal(tr.stats.visible, 0);
  for (const ty of tr.types) assert.equal(ty.mesh.visible, false);
});

test('ShipTraffic audio: at most 3 engine loops, nearest ships only, stopped when the player leaves', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y });
  const cam = { position: { x: 2620, y: 110, z: 0 } };
  tr.tick(500);
  for (let i = 0; i < 40; i++) tr.update(0.05, 0, cam);     // 2 s, several audio refreshes
  assert.ok(game.audio.loops.size <= 3, `loops ${game.audio.loops.size}`);
  assert.ok(game.audio.loops.size >= 1, 'some ship is audible near the spaceport');
  assert.equal(tr.stats.loops, game.audio.loops.size);
  const sets = game.calls.filter((c) => c[0] === 'set');
  assert.ok(sets.length > 0 && sets.every((c) => c[2].gain >= 0 && c[2].gain < 0.3 && c[2].freq > 20));
  for (let i = 0; i < 40; i++) tr.update(0.05, 0, { position: { x: 0, y: 100, z: 0 } });
  assert.equal(game.audio.loops.size, 0, 'loops stop far away');
  tr.stopAudio();
  assert.equal(tr.ships.filter((s) => s.loop).length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
