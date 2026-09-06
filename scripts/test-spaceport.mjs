// Node unit tests for the Coruscant spaceport, the ship models and the ship traffic (no browser needed):
//   node scripts/test-spaceport.mjs
import assert from 'node:assert/strict';
import { initBlocks, BLOCKS, B } from '../src/blocks.js';
import { WorldGen } from '../src/worldgen.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, TICK_RATE } from '../src/constants.js';
import { register, SPACEPORT, DECK_Y, STATION_Y, FRONTIER, FRONTIER_DECK_TOP, FRONTIER_DECK_Y } from '../src/coruscant/spaceport.js';
import { shipModels, buildShipGeometry, MAX_PARTS } from '../src/ships/models.js';
import { EMIT } from '../src/ships/builder.js';
import { buildShips, routePose, shipState, padStateAt, nextPhaseStart, ShipTraffic, HIDE_DIST, lanePathClear, attachShipClasses } from '../src/ships/traffic.js';
import { ShipAudio, AUDIO_DIST } from '../src/ships/audio.js';
import { ShipVehicle } from '../src/vehicles/ship.js';
import { getLayout } from '../src/coruscant/layout.js';

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
  // the frontier mini spaceport too
  for (let cx = Math.floor(FRONTIER.x0 / CS); cx <= Math.floor((FRONTIER.x1 - 1) / CS); cx++) for (let cz = Math.floor(FRONTIER.z0 / CS); cz <= Math.floor((FRONTIER.z1 - 1) / CS); cz++) {
    const c = { cx, cz, blocks: new Uint8Array(CS * CS * CH) }; gen.generateChunk(c);
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
function walkFrom(start, targets, box = { x0: S.x0 - 80, x1: S.x1, z0: S.z0, z1: S.z1 }) {
  const seen = new Set(), q = [start];
  const sk = (x, z, h) => `${x},${z},${h}`;
  seen.add(sk(...start));
  const left = new Map(targets.map((t) => [sk(...t), t]));
  while (q.length && left.size) {
    const [x, z, h] = q.shift();
    left.delete(sk(x, z, h));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < box.x0 || nx >= box.x1 || nz < box.z0 || nz >= box.z1) continue;
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

test('frontier mini spaceport: deck at the station level, marked pad clear above, roofed terminal, walkable from the west stub', () => {
  const F = FRONTIER, W = FRONTIER_DECK_Y;
  assert.ok(F.x0 >= 240 && F.x1 <= 300 && F.z0 >= -40 && F.z1 <= 40, 'inside the reserved area');
  assert.ok(standHeights(F.deck.x0, 0).includes(W) && standHeights(F.pad.x, F.pad.z).includes(W));
  assert.equal(get(F.pad.x, FRONTIER_DECK_TOP, F.pad.z), B.GLOW_PANEL);
  let lamps = 0;
  for (let x = F.pad.x - 12; x < F.pad.x + 12; x++) for (let z = F.pad.z - 12; z < F.pad.z + 12; z++) {
    if (get(x, FRONTIER_DECK_TOP, z) === B.CITY_LAMP) lamps++;
    if (Math.abs(x + 0.5 - F.pad.x) < 10 && Math.abs(z + 0.5 - F.pad.z) < 10) for (let y = W; y <= 135; y++) assert.equal(get(x, y, z), 0, `airspace over the frontier pad at ${x},${y},${z}`);
  }
  assert.ok(lamps >= 12);
  const T = F.terminal;
  let glass = 0, holo = 0; for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) for (let y = W; y <= W + 5; y++) { const id = get(x, y, z); if (id === B.STEEL_GLASS) glass++; if (id === B.HOLO_SIGN) holo++; }
  assert.ok(glass > 100 && holo > 10, `glass ${glass} holo ${holo}`);
  const unreached = walkFrom([F.deck.x0, 0, W], [[F.pad.x, F.pad.z, W], [T.x0 + 6, 0, W]], F);
  assert.deepEqual(unreached, []);
});

// --- ship models --------------------------------------------------------------------------------------------------
test('nine ship designs (six families + fighter, police, bus) 10..40 blocks long, one culled geometry each with emissive engine faces', () => {
  const models = shipModels();
  assert.equal(models.length, 9);
  assert.deepEqual(models.map((m) => m.name), ['light_freighter', 'shuttle', 'taxi', 'gunship', 'bulk_freighter', 'cruiser', 'starfighter', 'police', 'air_bus']);
  const families = new Set(models.map((m) => m.family));
  for (const f of ['bulk freight', 'light freighter', 'passenger shuttle', 'diplomatic transport', 'security / troop transport', 'local taxi / courier']) assert.ok(families.has(f), `family ${f}`);
  for (const m of models) {
    assert.ok(m.length >= 10 && m.length <= 40, `${m.name} length ${m.length}`);
    const { geometry, faces } = buildShipGeometry(m);
    assert.ok(faces > 100 && geometry.getAttribute('position').count === faces * 4);
    assert.ok(faces * 2 <= 6000, `${m.name} ${faces * 2} tris`);
    const surf = geometry.getAttribute('aSurf').array;      // (shade, emit code, own light, sky)
    let engine = 0, lit = 0;
    for (let i = 1; i < surf.length; i += 4) { if (surf[i] === EMIT.ENGINE) engine++; else if (surf[i] > 0) lit++; }
    assert.ok(engine >= 4 && lit >= 8, `${m.name} has glowing engine and lamp faces (${engine}, ${lit})`);
    let blue = 0; for (const v of m.gridFlight.data) if (v === B.GLOW_PANEL_BLUE) blue++;
    assert.ok(blue >= 2, `${m.name} has blue engine panels`);
    assert.ok(geometry.boundingSphere.radius < 40);
    assert.ok(m.parts.length >= 1 && m.parts.length < MAX_PARTS, `${m.name} animated parts ${m.parts.length}`);
    assert.ok(m.door && m.cockpit && m.interiors.length >= 1, `${m.name} door, cockpit, interior`);
  }
});

// --- traffic ------------------------------------------------------------------------------------------------------
const layout = getLayout(1337);
const ships = buildShips(S.pads, DECK_Y, null, layout);
test('at least 30 ships: one port cycle per pad, lane and harbour loops, repair berths; poses are a pure function of time', () => {
  assert.ok(ships.length >= 30, `${ships.length} ships`);
  assert.equal(ships.filter((s) => typeof s.pad === 'number').length, S.pads.length);
  assert.ok(ships.filter((s) => s.repair).length >= 2 && ships.filter((s) => s.repair).length <= 3, 'repair berths');
  const withFrontier = buildShips(S.pads, DECK_Y, { pad: FRONTIER.pad, deckY: FRONTIER_DECK_Y }, layout);
  assert.equal(withFrontier.length, ships.length + 1);
  const fs = withFrontier.find((s) => s.pad === 'frontier'), boarding = fs.route.segs.find((s) => s.phase === 'boarding');
  const fp = routePose(fs.route, boarding.t0 + 1, {});
  assert.deepEqual([fs.type, fp.x, fp.y, fp.z, fp.phase], [1, FRONTIER.pad.x, FRONTIER_DECK_Y, FRONTIER.pad.z, 'boarding']);
  for (let t = 0; t < fs.route.period; t += 0.5) { const q = routePose(fs.route, t, {}); assert.ok(q.y >= FRONTIER_DECK_Y - 1e-9 && q.y <= 165 && Math.hypot(q.x, q.z) < 420, 'frontier shuttle stays over the frontier'); }
  const again = buildShips(S.pads, DECK_Y, null, layout);
  const a = {}, b = {};
  for (let i = 0; i < ships.length; i++) for (let t = 0; t < ships[i].route.period; t += 0.37) {
    routePose(ships[i].route, t, a); routePose(again[i].route, t, b);
    assert.deepEqual([a.x, a.y, a.z, a.yaw, a.pitch, a.roll, a.thrust, a.phase], [b.x, b.y, b.z, b.yaw, b.pitch, b.roll, b.thrust, b.phase]);
  }
});

test('port cycle: fly -> reservation -> approach -> touchdown -> shutdown -> doors -> boarding -> servicing -> closure -> departure -> climb, 25..45 s on the pad, continuous motion', () => {
  const models = shipModels();
  for (const sh of ships.filter((s) => typeof s.pad === 'number')) {
    const segs = sh.route.segs, phases = segs.map((s) => s.phase);
    assert.deepEqual(phases, ['fly', 'approach', 'touchdown', 'shutdown', 'doors', 'boarding', 'servicing', 'closure', 'departure', 'climb']);
    assert.deepEqual(sh.route.phases.slice(0, 3), ['fly', 'reservation', 'approach']);
    const by = (p) => segs.find((s) => s.phase === p);
    const onPad = ['shutdown', 'doors', 'boarding', 'servicing', 'closure'].reduce((s, p) => s + by(p).dur, 0);
    assert.ok(onPad >= 25 && onPad <= 45, `on the pad ${onPad} s`);
    const pad = S.pads[sh.pad], p = {};
    routePose(sh.route, by('boarding').t0 + 1, p);
    assert.deepEqual([p.x, p.y, p.z, p.phase, p.thrust], [pad.x, DECK_Y, pad.z, 'boarding', 0]);
    routePose(sh.route, by('touchdown').t0, p); assert.ok(Math.abs(p.y - (DECK_Y + 4)) < 0.3, 'hover height');
    routePose(sh.route, by('climb').t0 + by('climb').dur - 1e-6, p); assert.ok(Math.abs(p.y - 130) < 0.01, 'climb tops out at the approach height');
    // the pad is reserved before the approach: the last RESERVE seconds of the fly segment report 'reservation'
    routePose(sh.route, by('approach').t0 - 1, p); assert.equal(p.phase, 'reservation');
    assert.equal(padStateAt(sh, by('approach').t0 - 1 - sh.offset).reserved, true);
    assert.equal(padStateAt(sh, by('boarding').t0 + 1 - sh.offset).occupied, true);
    assert.equal(padStateAt(sh, by('fly').t0 + 5 - sh.offset).reserved, false);
    // animation channels: gear / wings down by touchdown, doors open only on the pad, everything stowed in flight
    const st = {};
    shipState(sh.route, by('touchdown').t0 + by('touchdown').dur - 1e-3, st); assert.ok(st.gear >= 0.99 && st.cls >= 0.99 && st.door === 0);
    shipState(sh.route, by('boarding').t0 + 1, st); assert.deepEqual([st.gear, st.cls, st.door], [1, 1, 1]);
    shipState(sh.route, by('fly').t0 + 5, st); assert.deepEqual([st.gear, st.cls, st.door, st.lights], [0, 0, 0, 0]);
    shipState(sh.route, by('approach').t0 + 1, st); assert.ok(st.lights === 1, 'landing lights on during the approach');
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
    const nd = nextPhaseStart(sh, 'approach', 100);
    assert.ok(nd >= 100 && routePose(sh.route, nd + sh.offset + 1e-3, {}).phase === 'approach');
  }
  // lane ships: street lanes at y 104..114 (under every skybridge), harbour circuits 116..182, tall lanes 212..230,
  // the high cross at 262..276; repair berths sit on the deck
  for (const sh of ships.filter((s) => s.pad === null && !s.repair)) for (let t = 0; t < sh.route.period; t += 2) { const q = routePose(sh.route, t, {}); assert.ok(q.y >= 104 && q.y <= 276, `${sh.name} lane altitude ${q.y}`); }
  for (const sh of ships.filter((s) => s.repair)) { const q = routePose(sh.route, 10, {}); assert.equal(q.y, DECK_Y); assert.equal(q.phase, 'repair'); assert.ok(q.x >= S.deck.x0 && q.x <= S.deck.x1); }
});

test('no route (lane or pad approach) passes through a tower or landmark lot below its roof, and boulevard lanes stay in their corridors', () => {
  const lots = layout.lots.filter((l) => l.kind !== 'plaza');
  let samples = 0;
  for (const sh of ships) {
    const path = sh.route.segs[0].path, p = { x: 0, y: 0, z: 0 };
    if (!path) continue;
    for (let d = 0; d < path.length; d += 2) {
      path.at(d, p); samples++;
      for (const l of lots) assert.ok(!(p.x >= l.x0 - 3 && p.x < l.x1 + 3 && p.z >= l.z0 - 3 && p.z < l.z1 + 3 && p.y < 60 + l.height + 3), `${sh.name} hits ${l.family || l.kind} lot ${l.id} at ${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`);
    }
    if (sh.boulevard) assert.ok(lanePathClear(sh.lanePts, layout), `${sh.name} leaves the boulevard corridors`);
  }
  assert.ok(samples > 5000);
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
  assert.ok(maxRoll > 0.3 && rolled > samples * 0.05, `max roll ${maxRoll}, rolled ${rolled}/${samples}`);
});

// A minimal fake game: light sampler, a fake Web Audio context that records its nodes, no scene.
function fakeParam(v) { return { value: v, setTargetAtTime(x) { this.value = x; }, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime(x) { this.value = x; } }; }
function fakeCtx() {
  const node = (extra = {}) => ({ connect() {}, disconnect() {}, start() {}, stop() {}, ...extra });
  return {
    currentTime: 0, sampleRate: 44100, created: { osc: 0, gain: 0, filter: 0, source: 0 },
    createGain() { this.created.gain++; return node({ gain: fakeParam(1) }); },
    createOscillator() { this.created.osc++; return node({ type: 'sine', frequency: fakeParam(440) }); },
    createBiquadFilter() { this.created.filter++; return node({ type: 'lowpass', frequency: fakeParam(350), Q: fakeParam(1) }); },
    createBufferSource() { this.created.source++; return node({ buffer: null, loop: false, playbackRate: fakeParam(1) }); },
    createStereoPanner() { return node({ pan: fakeParam(0) }); },
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; },
  };
}
function fakeGame() {
  const ctx = fakeCtx();
  const audio = { ctx, master: { connect() {} }, enabled: true, spatial: (pos, maxDist) => [1, 0.3] };
  return { atlas: null, world: { sampleLight: () => [1, 0], getBlock: () => 0 }, audio, scene: { add() {}, remove() {} }, hud: { addMessage() {} }, player: null };
}

test('ShipTraffic: one InstancedMesh per model type, ships beyond 300 blocks are not submitted, one draw call per type', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y, layout });
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
  assert.ok(tr.stats.drawCalls <= shipModels().length && tr.stats.drawCalls >= 1);
  assert.ok(tr.census(300).airborne >= 30, 'census: >= 30 airborne within 300 blocks');
  // far camera: nothing drawn
  tr.update(1 / 60, 0.5, { position: { x: 0, y: 100, z: 0 } });
  assert.equal(tr.stats.visible, 0);
  for (const ty of tr.types) assert.equal(ty.mesh.visible, false);
});

test('ShipAudio: <= 8 low hum voices for the nearest ships (f0 60..140 Hz x doppler, low-pass 400..900 Hz), silent far away, no one-shots', () => {
  const game = fakeGame();
  const tr = attachShipClasses(new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y, layout }), { ShipAudio });
  const cam = { position: { x: 2620, y: 110, z: 0 } };
  tr.tick(500);
  for (let i = 0; i < 40; i++) { game.audio.ctx.currentTime += 0.05; tr.update(0.05, 0, cam); }     // 2 s, several audio refreshes
  const au = tr.audio;
  assert.ok(au && au.voiceCount() >= 1 && au.voiceCount() <= 8, `voices ${au && au.voiceCount()}`);
  assert.equal(tr.stats.voices, au.voiceCount());
  const live = au.voices.filter((v) => v.ship);
  const byDist = tr.ships.filter((s) => s.dist < AUDIO_DIST).sort((a, b) => a.dist - b.dist).slice(0, live.length);
  for (const v of live) {
    assert.ok(byDist.includes(v.ship), `${v.ship.name} is among the nearest`);
    assert.ok(v.saw.type === 'sawtooth' && v.saw.frequency.value >= 50 && v.saw.frequency.value <= 250, `f0 ${v.saw.frequency.value}`);
    assert.ok(Math.abs(v.sine.frequency.value - 2 * v.saw.frequency.value) < 1e-6, 'sine at 2 f0');
    assert.ok(v.lp.type === 'lowpass' && v.lp.frequency.value >= 400 && v.lp.frequency.value <= 900, `low-pass ${v.lp.frequency.value}`);
    assert.ok(v.gain.gain.value >= 0 && v.gain.gain.value <= 0.6, `gain ${v.gain.gain.value}`);
    assert.ok(v.noise.loop && v.noise.buffer, 'brown noise layer');
  }
  assert.equal(game.audio.ctx.created.source, live.length + 0, 'one looping noise source per voice, no one-shot chirps');
  for (let i = 0; i < 40; i++) { game.audio.ctx.currentTime += 0.05; tr.update(0.05, 0, { position: { x: 0, y: 100, z: 0 } }); }
  assert.equal(au.voiceCount(), 0, 'voices released far away');
  assert.ok(au.voices.every((v) => v.gain.gain.value === 0));
  tr.stopAudio();
});

test('ShipVehicle promotion: landed ships near the player become vehicles (bounds, collision boxes) and are demoted far away', () => {
  const game = fakeGame();
  const added = [];
  game.vehicles = { tickCount: 0, list: [], add(v) { this.list.push(v); added.push(v); v.onAdd(game); return v; }, remove(v) { this.list.splice(this.list.indexOf(v), 1); v.onRemove(game); } };
  const tr = attachShipClasses(new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y, layout }), { ShipVehicle });
  const sh = tr.ships.find((s) => s.pad === 0), seg = sh.route.segs.find((s) => s.phase === 'boarding');
  const tick = Math.ceil((seg.t0 + 2 - sh.offset) * TICK_RATE / 10) * 10;   // autoPromote runs every 10 ticks
  game.vehicles.tickCount = tick;
  game.player = { pos: { x: S.pads[0].x + 20, y: DECK_Y, z: S.pads[0].z, set() {} }, vel: { x: 0, y: 0, z: 0 }, width: 0.6, height: 1.8 };
  tr.tick(tick);
  assert.ok(sh.vehicle && sh.vehicle.state.phase === 'boarding' && sh.vehicle.doorOpen, 'pad ship promoted while the player stands nearby');
  const b = sh.vehicle.bounds;
  assert.ok(Math.abs((b.x0 + b.x1) / 2 - S.pads[0].x) < 0.01 && Math.abs(b.y0 - DECK_Y) < 0.01, 'bounds centred on the pad, gear on the deck');
  const boxes = sh.vehicle.collectBoxes(b, []);
  assert.ok(boxes.length > 500, `collision boxes ${boxes.length}`);
  // the repair berths are promoted too (they are always landed) when in range; far away everything is demoted
  game.player.pos.x = 0; game.player.pos.z = 0;
  tr.tick(tick + 10);
  assert.equal(tr.ships.filter((s) => s.vehicle).length, 0, 'demoted far away');
  const spots = tr.repairSpots();
  assert.ok(spots.length >= 4 && spots.every((s) => s.y === DECK_Y));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
