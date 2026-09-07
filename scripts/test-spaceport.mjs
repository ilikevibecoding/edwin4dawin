// Node unit tests for the Coruscant spaceport (Westport: the plateau strip + the elevated west apron), the ship models
// and the ship traffic (no browser needed):
//   node scripts/test-spaceport.mjs
import assert from 'node:assert/strict';
import { initBlocks, BLOCKS, B } from '../src/blocks.js';
import { WorldGen } from '../src/worldgen.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, TICK_RATE } from '../src/constants.js';
import { register, SPACEPORT, DECK_Y, DECK_TOP, STATION_Y, FRONTIER, FRONTIER_DECK_TOP, FRONTIER_DECK_Y, spaceportHallMeta } from '../src/coruscant/spaceport.js';
import * as P from '../src/coruscant/spaceport/plan.js';
import { shipModels, buildShipGeometry, MAX_PARTS } from '../src/ships/models.js';
import { EMIT } from '../src/ships/builder.js';
import { buildShips, routePose, shipState, padStateAt, nextPhaseStart, ShipTraffic, HIDE_DIST, lanePathClear, attachShipClasses } from '../src/ships/traffic.js';
import { ShipAudio, AUDIO_DIST } from '../src/ships/audio.js';
import { ShipVehicle } from '../src/vehicles/ship.js';
import { getLayout } from '../src/coruscant/layout.js';
import { purposeFor } from '../src/coruscant/purposes.js';
import { ROUTE, doorWorldXs, trainState, ticksUntilDock, PERIOD, RIDE_TIME, SCHEDULE, LEG_CT, LEG_TF } from '../src/vehicles/route.js';
import { TICK_DT } from '../src/constants.js';

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
let mismatches = 0, genMs = 0, n = 0, maxChunkMs = 0, maxChunkAt = null;
{
  const cx0 = Math.floor(S.x0 / CS), cx1 = Math.floor((S.x1 - 1) / CS), cz0 = Math.floor(S.z0 / CS), cz1 = Math.floor((S.z1 - 1) / CS);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const c = { cx, cz, blocks: new Uint8Array(CS * CS * CH) };
    const t0 = performance.now(); gen.generateChunk(c); genMs += performance.now() - t0; n++;
    const c2 = { cx, cz, blocks: new Uint8Array(CS * CS * CH) };
    const t1 = performance.now(); gen.generateChunk(c2); let ms = performance.now() - t1;       // second pass: JIT warm
    if (ms > 8) { const t2 = performance.now(); gen.generateChunk(c2); ms = Math.min(ms, performance.now() - t2); }   // a GC pause is not the chunk's cost
    if (ms > maxChunkMs) { maxChunkMs = ms; maxChunkAt = [cx, cz]; }
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
const count = (x0, y0, z0, x1, y1, z1, pred) => { let k = 0; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (pred(get(x, y, z))) k++; return k; };
const is = (id) => (v) => v === id;
const clearBox = (x0, y0, z0, x1, y1, z1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (get(x, y, z) !== 0) return `${x},${y},${z} = ${BLOCKS[get(x, y, z)].name}`; return null; };
// the highest solid block in a column (deck level and above; -1 when none)
const topCache = new Map();
function topSolid(x, z) {
  const k = x * 4096 + z + 2048;
  let t = topCache.get(k);
  if (t === undefined) { t = -1; for (let y = CH - 1; y >= 30; y--) if (solid(get(x, y, z))) { t = y; break; } topCache.set(k, t); }
  return t;
}
// every height a player can stand at in a column (solid top with two free blocks above), cached
const standCache = new Map();
function standHeights(x, z) {
  const k = x * 4096 + z + 2048;
  let out = standCache.get(k);
  if (out) return out;
  out = [];
  for (let y = 30; y < 200; y++) {
    const id = get(x, y, z);
    if (!solid(id)) continue;
    if (get(x, y + 1, z) === 0 && get(x, y + 2, z) === 0) out.push(topOf(y, id));
  }
  standCache.set(k, out);
  return out;
}
// strict walk (auto-step <= 0.6, drops <= 3, no jumping) from a start to a set of targets; returns the unreached ones
// and the set of visited "x,z,h" keys
function walkFrom(start, targets, box = { x0: S.x0, x1: S.x1, z0: S.z0, z1: S.z1 }) {
  const seen = new Set(), q = [start];
  const sk = (x, z, h) => `${x},${z},${h}`;
  seen.add(sk(...start));
  const left = new Map(targets.map((t) => [sk(...t), t]));
  let head = 0;
  while (head < q.length) {
    const [x, z, h] = q[head++];
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
  return { unreached: [...left.values()], seen };
}
const OLD_RECT_AREA = 232 * 360;   // the SPACEPORT district rect on the plateau (layout.js): 83,520 cells

test('spaceport chunks generate deterministically and cheaply (<= 8 ms per chunk, second pass)', () => {
  assert.equal(mismatches, 0, 'two generations differ');
  const st = gen.structures.find((s) => s.name === 'spaceport');
  assert.ok(st && st.chunks >= n, 'structure fill ran for every chunk');
  const fillAvg = st.msTotal / st.chunks;
  console.log(`   ${n} chunks, full gen avg ${(genMs / n).toFixed(2)} ms, spaceport fill avg ${fillAvg.toFixed(3)} ms, slowest chunk ${maxChunkMs.toFixed(2)} ms at ${maxChunkAt}`);
  assert.ok(fillAvg < 2, `spaceport fill too slow: ${fillAvg} ms/chunk`);
  assert.ok(maxChunkMs < 8, `slowest chunk ${maxChunkMs} ms`);
});

test('footprint: the deck (apron + plateau strip + old deck) covers >= 4x the old SPACEPORT rect, at the deck level, over the lower city', () => {
  let deck = 0, apron = 0;
  for (let x = S.x0; x < S.x1; x++) for (let z = S.z0; z < S.z1; z++) {
    if (!solid(get(x, DECK_TOP, z))) continue;
    deck++;
    if (x <= P.APRON.x1) apron++;
  }
  console.log(`   deck cells ${deck} (${(deck / OLD_RECT_AREA).toFixed(2)}x the old rect), ${apron} of them on the west apron over the lower city`);
  assert.ok(deck >= 4 * OLD_RECT_AREA, `deck area ${deck} < 4 x ${OLD_RECT_AREA}`);
  assert.ok(apron > 200000, 'the apron over the lower city carries most of the growth');
  assert.ok(P.APRON.x1 < 2488 && P.APRON.x0 >= 2100, 'the apron lies west of the plateau edge, over the lower city ring');
  // pylons: a solid 4x4 column from the girders down to the lower-city terrace under every pylon position (spot check)
  for (const px of P.PYLON_XS) for (const pz0 of [P.PYLON_ZS[3], P.PYLON_ZS[9], P.PYLON_ZS[15]]) {
    const pz = P.pylonZ(px, pz0);
    for (let y = 40; y <= 93; y++) assert.ok(solid(get(px, y, pz)), `pylon ${px},${pz} solid at y ${y}`);
  }
});

test('hyperlane corridor: the train slot (z -3..2, y 89..97) through the apron and the station cut stay free of spaceport blocks', () => {
  // the open slot under the hump from the apron edge to the station (the track itself is the hyperlane structure)
  for (let x = P.APRON.x0; x <= P.HUMP.x1; x++) {
    const bad = clearBox(x, 89, -3, x, 97, 2);
    assert.equal(bad, null, `train slot blocked at ${bad}`);
    // the glass promenade closes the slot at 98 and a deck plate never sits inside it
    assert.ok(get(x, P.HUMP.cover, 0) === B.STEEL_GLASS || get(x, P.HUMP.cover, 0) === B.DURASTEEL, `hump cover at x ${x}`);
  }
  // the Coruscant station's open cut (its canopy is at 98; our railings sit on it at 99)
  const C = P.STATION_CUT;
  const bad = clearBox(C.x0 + 1, 84, C.z0, C.x1, 98, C.z1);
  assert.equal(bad, null, `station cut blocked at ${bad}`);
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

test('freight lane: the ramp head 2559,61,-9 and the lane under the plateau strip stay open and lit; the switchback ramp box is untouched', () => {
  const L = P.FREIGHT_LANE;
  assert.ok(solid(get(2559, 60, -9)), 'plateau ground under the ramp head');
  const bad = clearBox(L.x0, 61, L.z0, L.x1, 65, L.z1);                       // 5 blocks of head room for the haulers (the lit lintel sits at 66)
  assert.equal(bad, null, `freight lane blocked at ${bad}`);
  const side = clearBox(L.x0, 61, L.z0 - 1, L.x1, 64, L.z1 + 1);
  assert.equal(side, null, `freight lane shoulders blocked at hauler height at ${side}`);
  const lamps = count(L.x0, 90, L.z0 - 2, L.x1, 93, L.z1 + 2, is(B.CITY_LAMP)) + count(L.x0, 61, L.z0 - 2, L.x1, 66, L.z1 + 2, is(B.GLOW_PANEL));
  assert.ok(lamps >= 12, `lane lights ${lamps}`);
  assert.equal(get(2496, 66, L.z0 - 1), B.HOLO_SIGN, 'FREIGHT marker over the lane');
  // the switchback ramp's box on the plateau face: nothing of the port below the deck (the terrace terrain is worldgen's)
  const R = P.FREIGHT_RAMP_BOX, port = new Set([B.DURASTEEL, B.DURASTEEL_DARK, B.DECK_PLATE, B.PANEL_STRIPE, B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.STEEL_GLASS, B.CITY_LAMP, B.HOLO_SIGN, B.PANEL_RED, B.IRON_BARS, B.CHROME]);
  for (let x = R.x0; x <= R.x1; x++) for (let z = R.z0; z <= R.z1; z++) for (let y = 20; y <= 90; y++) assert.ok(!port.has(get(x, y, z)), `port block in the freight ramp box at ${x},${y},${z}`);
});

test('30 pads in three sizes: flat, clear above, hazard border with flush edge lights, lit ring + centre, gate numbers, corner lamps, service strip (bowser, console, gate board, containers), gantries on the L pads', () => {
  const sizes = { S: 0, M: 0, L: 0 };
  assert.ok(S.pads.length >= 12 + 8);
  for (const pad of S.pads) {
    const H = pad.half;
    assert.equal(H, P.PAD_SIZES[pad.size]);
    sizes[pad.size]++;
    let lamps = 0, lines = 0, red = 0, plate = 0, glow = 0;
    for (let x = pad.x - H; x < pad.x + H; x++) for (let z = pad.z - H; z < pad.z + H; z++) {
      const id = get(x, DECK_TOP, z);
      if (id === B.CITY_LAMP) lamps++; else if (id === B.DURASTEEL) lines++; else if (id === B.PANEL_RED) red++; else if (id === B.DECK_PLATE) plate++; else if (id === B.GLOW_PANEL) glow++;
      assert.ok(solid(id), `pad floor at ${x},${z}`);
      // the inner (2H - 4)^2 has clear air above it up to the approach height (corner lamps sit in the 2-block rim)
      if (Math.abs(x + 0.5 - pad.x) < H - 2 && Math.abs(z + 0.5 - pad.z) < H - 2) for (let y = DECK_Y; y <= 135; y++) assert.equal(get(x, y, z), 0, `airspace over pad ${pad.gate} at ${x},${y},${z}`);
    }
    const area = 4 * H * H;
    assert.ok(lamps >= Math.floor(8 * H / 6) - 2, `edge lights on pad ${pad.gate} (${pad.size}): ${lamps}`);
    assert.ok(lines > H * 4 && red > H && plate > area * 0.5 && glow >= 8, `pad ${pad.gate} markings: lines ${lines} red ${red} plate ${plate} glow ${glow}`);
    assert.equal(get(pad.x, DECK_TOP, pad.z), B.GLOW_PANEL, 'lit centre');
    for (const [cx, cz] of [[pad.x - H + 1, pad.z - H + 1], [pad.x + H - 2, pad.z + H - 2]]) assert.equal(get(cx, DECK_Y + 2, cz), B.CITY_LAMP, `corner lamp of pad ${pad.gate}`);
    // service strip east of the pad: bowser (chrome), console, gate board (glow digits on a black backing), containers
    const sx = pad.x + H + 1;
    assert.equal(get(sx, DECK_Y + 1, pad.z - H + 2), B.CHROME, `bowser at pad ${pad.gate}`);
    assert.equal(get(sx, DECK_Y + 1, pad.z - H + 6), B.CONSOLE, `pad console at pad ${pad.gate}`);
    assert.ok(count(sx, DECK_Y + 4, pad.z - H + 8, sx, DECK_Y + 9, pad.z - H + 16, is(B.GLOW_PANEL)) >= 5, `gate board digits at pad ${pad.gate}`);
    assert.ok(count(sx, DECK_Y, pad.z - 2 - 2 * 6, sx + 1, DECK_Y + 2, pad.z + H - 1, (v) => v === B.CRATE || v === B.BARREL) >= 1, `containers at pad ${pad.gate}`);
    if (pad.size === 'L') assert.ok(count(sx, DECK_Y + 9, pad.z - H, sx + 1, DECK_Y + 9, pad.z + H, is(B.DURASTEEL)) >= 16, `gantry beam over the strip of pad ${pad.gate}`);
  }
  console.log(`   pads: ${sizes.S} S (24x24), ${sizes.M} M (36x36), ${sizes.L} L (48x48)`);
  assert.ok(sizes.S >= 8 && sizes.M >= 4 && sizes.L >= 6, 'three sizes, twelve or more new pads');
  assert.deepEqual(S.pads.map((p) => p.gate), S.pads.map((_, i) => i + 1), 'gate ids 1..N');
});

test('blast walls stand between the pad fields (5 high, lit caps, crew gaps) and never inside a pad', () => {
  let walls = 0, caps = 0;
  for (let x = P.APRON.x0; x <= P.APRON.x1; x++) for (let z = P.APRON.z0; z <= P.APRON.z1; z++) {
    if (get(x, DECK_Y + 1, z) !== B.PANEL_STRIPE || get(x, DECK_Y + 3, z) !== B.DURASTEEL_DARK) continue;
    walls++;
    const cap = get(x, DECK_Y + 4, z);
    if (cap === B.GLOW_PANEL) caps++;
    for (const pad of S.pads) assert.ok(Math.abs(x + 0.5 - pad.x) > pad.half || Math.abs(z + 0.5 - pad.z) > pad.half, `blast wall inside pad ${pad.gate} at ${x},${z}`);
  }
  console.log(`   blast wall cells ${walls}, lit caps ${caps}`);
  assert.ok(walls > 600 && caps > 100);
});

test('grand terminal: >= 60x40x12 hall, enclosed and roofed, lit, holo departure boards, check-in consoles + baggage belts, waiting rows, kiosk, cafe + shops, toilets, customs scanner arches, viewing gallery, 9 open doors with gate numbers', () => {
  const T = P.TERMINAL;
  assert.ok(T.x1 - T.x0 + 1 >= 60 && T.z1 - T.z0 + 1 >= 40 && T.wallTop - DECK_Y + 1 >= 12, 'hall size');
  let open = 0, glow = 0, holo = 0, con = 0, seats = 0, glassRoof = 0, glassWall = 0;
  for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    let covered = false;
    for (let y = DECK_Y; y < 120; y++) {
      const id = get(x, y, z);
      if (id !== 0 && y >= T.roof) covered = true;
      if (id === B.GLOW_PANEL) glow++; else if (id === B.HOLO_SIGN) holo++; else if (id === B.CONSOLE) con++; else if (id === B.STONE_BRICK_SLAB) seats++;
      if (id === B.STEEL_GLASS && y >= T.roof) glassRoof++;
      if (id === B.STEEL_GLASS && y < T.roof && (x === T.x0 || x === T.x1 || z === T.z0 || z === T.z1)) glassWall++;
    }
    if (!covered) open++;
  }
  console.log(`   terminal: glass roof ${glassRoof} glass walls ${glassWall} glow ${glow} holo ${holo} consoles ${con} seats ${seats}`);
  assert.equal(open, 0, `${open} columns without roof cover`);
  assert.ok(glassRoof > 4000 && glassWall > 1500 && glow > 150 && holo > 200 && con > 30 && seats > 150);
  // the doors: 4 wide, 3 high, open, with a gate-number board beside the pad-side ones
  for (const d of P.TERMINAL_DOORS) {
    const cells = d.side === 'W' || d.side === 'E' ? [[d.x, d.z0], [d.x, d.z1]] : [[d.x0, d.z], [d.x1, d.z]];
    for (const [x, z] of cells) for (let y = DECK_Y; y <= DECK_Y + 2; y++) assert.equal(get(x, y, z), 0, `door ${d.side} open at ${x},${y},${z}`);
  }
  for (const [di] of P.DOOR_GATES) {
    const d = P.TERMINAL_DOORS[di];
    const box = d.side === 'W' || d.side === 'E' ? [d.x, d.z0 - 8, d.x, d.z1 + 8] : [d.x0 - 8, d.z, d.x1 + 8, d.z];
    assert.ok(count(box[0], DECK_Y + 1, box[1], box[2], DECK_Y + 6, box[3], is(B.GLOW_PANEL)) >= 5, `gate numbers beside door ${di}`);
  }
  // the promenade (hump) crosses the hall at 99 and its doors at both ends are open
  for (const hd of P.TERMINAL_HUMP_DOORS) for (let y = 99; y <= 101; y++) assert.equal(get(hd.x, y, 0), 0, `hump door open at ${hd.x},${y}`);
  assert.ok(standHeights(T.cx, -3).includes(99) || standHeights(T.cx, 0).includes(99), 'promenade walkable over the tube inside the hall');
  // programs
  const C = P.TZ.checkIn, Bg = P.TZ.baggage, U = P.TZ.customs, Cf = P.TZ.cafe, G = P.TZ.gallery;
  assert.ok(count(C.x0, DECK_Y, C.z, C.x1, DECK_Y, C.z, is(B.CONSOLE)) >= 8, 'check-in consoles');
  assert.ok(count(C.x0, DECK_Y + 3, C.z, C.x1, DECK_Y + 4, C.z, is(B.HOLO_SIGN)) >= 40, 'holo boards over the counters');
  assert.ok(count(Bg.x0, DECK_Y, Bg.z0, Bg.x1, DECK_Y, Bg.z1, is(B.PANEL_STRIPE)) >= 40 && count(Bg.x0, DECK_Y + 1, Bg.z0, Bg.x1, DECK_Y + 1, Bg.z1, (v) => v === B.CRATE || v === B.BARREL) >= 10, 'baggage belts with bags');
  assert.ok(count(2262, DECK_Y + 4, -12, 2338, DECK_Y + 5, -12, is(B.HOLO_SIGN)) >= 100, 'departure boards over the waiting rows');
  assert.ok(count(P.TZ.waiting.x0, DECK_Y, P.TZ.waiting.z0, P.TZ.waiting.x1, DECK_Y, P.TZ.waiting.z1, is(B.STONE_BRICK_SLAB)) >= 60, 'waiting rows');
  assert.ok(count(P.TZ.kiosk.x0, DECK_Y + 2, P.TZ.kiosk.z0, P.TZ.kiosk.x1, DECK_Y + 3, P.TZ.kiosk.z1, is(B.HOLO_SIGN)) >= 2, 'information kiosk');
  for (const ax of [2312, 2326, 2340]) assert.ok(get(ax, DECK_Y + 2, -24) === B.DURASTEEL_DARK && get(ax + 2, DECK_Y + 2, -24) === B.DURASTEEL_DARK && get(ax + 1, DECK_Y + 4, -24) === B.GLOW_PANEL_BLUE, `scanner arch at ${ax}`);
  assert.ok(count(U.x0, DECK_Y, U.z0, U.x1, DECK_Y + 2, U.z1, is(B.CONSOLE)) >= 8, 'customs consoles');
  assert.ok(count(Cf.x0, DECK_Y, Cf.z0, Cf.x1, DECK_Y, Cf.z1, is(B.TABLE)) >= 4 && count(Cf.x0, DECK_Y, Cf.z0, Cf.x1, DECK_Y, Cf.z1, is(B.CONSOLE)) >= 2, 'cafe tables and bar');
  for (const Sh of [P.TZ.shop1, P.TZ.shop2]) assert.ok(count(Sh.x0, DECK_Y, Sh.z1, Sh.x1, DECK_Y + 1, Sh.z1, is(B.SHELF)) >= 20, 'shop shelves');
  assert.ok(count(P.TZ.toilets.x0, DECK_Y, P.TZ.toilets.z0, P.TZ.toilets.x1, DECK_Y, P.TZ.toilets.z1, is(B.CHROME)) >= 8, 'basins in the toilets');
  let gallery = 0; for (let z = T.z0 + 1; z < T.z1; z++) if (solid(get(G.x0 + 3, G.y, z)) && get(G.x0 + 3, G.y + 1, z) === 0) gallery++;
  assert.ok(gallery > 90, `viewing gallery floor ${gallery}`);
});

test('terminus: four numbered platforms (feet 92) beside the live hyperlane, three yard tracks with rails and buffers, the spare train parked on track A, glass screens with open door columns, stairs + lifts up to the concourse, ceiling lights', () => {
  const U = P.TERMINUS;
  assert.equal(ROUTE.terminus.platformX0, U.x0);
  assert.equal(U.x1 - U.x0 + 1, 60);
  // platform 1 (the live edge): floor at 91, nothing in the screen line yet (stations.js paints it), head room to 95
  for (let x = U.x0; x <= U.x1; x++) {
    assert.ok(solid(get(x, 91, 4)) && solid(get(x, 91, 8)), `platform 1 floor at x ${x}`);
    for (let y = 92; y <= 93; y++) assert.equal(get(x, y, 3), 0, `screen line free for the station fill at ${x},${y}`);
    for (let z = 5; z <= 10; z++) {                                            // benches (slabs) stand on the platform; the slot's lit edge beam runs at 94..95 over z 5
      if (U.stairs.some((st) => x >= st.x0 - 1 && x <= st.x0 + 10 && z >= st.z0 - 1 && z <= st.z1 + 1)) continue;   // the stair down from the hall
      if (U.lifts.some((l) => Math.abs(x - l.x) <= 1 && Math.abs(z - l.z) <= 1)) continue;                             // the lift shaft
      assert.ok(get(x, 92, z) === 0 || get(x, 92, z) === B.STONE_BRICK_SLAB, `platform 1 floor free at ${x},${z}`);
      assert.equal(get(x, 93, z), 0, `platform 1 head room at ${x},93,${z}`);
      if (z > 5) assert.ok(get(x, 94, z) === 0 || get(x, 94, z) === B.HOLO_SIGN, `platform 1 ceiling at ${x},94,${z}`);   // hanging boards allowed
    }
  }
  // the docked train's doors all open onto platform 1
  for (const dx of doorWorldXs(ROUTE.terminus.dockX0)) assert.ok(dx >= U.x0 && dx + 1 <= U.x1, `door at ${dx} on the platform`);
  // island platforms 2 and 3/4 with their screens (glass 92..93 on a durasteel course, holo over the door columns)
  for (const pl of U.platforms.slice(1)) {
    const zf = pl.z0 + 2;                                                      // a row clear of the stairs (z0 + 4 .. 5) and the benches
    for (let x = U.x0; x <= U.x1; x += 5) if (!U.lifts.some((l) => Math.abs(x - l.x) <= 1 && Math.abs(zf - l.z) <= 1)) assert.ok(standHeights(x, zf).includes(92), `platform ${pl.n} walkable at ${x},${zf}`);
    for (const z of pl.screens) {
      const glass = count(U.trackX0 + 2, 92, z, U.trackX1 - 2, 93, z, is(B.STEEL_GLASS)), holo = count(U.trackX0 + 2, 94, z, U.trackX1 - 2, 94, z, is(B.HOLO_SIGN));
      assert.ok(glass > 150 && holo >= 16, `screen of platform ${pl.n} at z ${z}: glass ${glass} holo ${holo}`);
    }
  }
  // yard tracks: rails on the deck, buffer stops at both ends
  for (const t of U.tracks) {
    const rails = count(U.trackX0 + 4, 90, t.z0 + 2, U.trackX1 - 4, 90, t.z0 + 5, is(B.RAIL));
    assert.ok(rails > (t.id === 'A' ? 60 : 200), `rails on track ${t.id}: ${rails}`);                    // the spare train stands on A's
    for (const x of [U.trackX0, U.trackX1]) assert.equal(get(x, 92, t.z0 + 3), B.PANEL_RED, `buffer stop on track ${t.id} at x ${x}`);
  }
  // the spare train: a voxel copy 74 long on track A with its doors facing platform 2 (open at build time)
  const tz0 = U.tracks[0].z0 + 1;
  let train = 0; for (let x = U.spareTrainX0; x < U.spareTrainX0 + 74; x++) for (let y = 90; y <= 95; y++) for (let z = tz0; z < tz0 + 6; z++) if (get(x, y, z) !== 0) train++;
  assert.ok(train > 1200, `spare train blocks ${train}`);
  for (const dx of doorWorldXs(U.spareTrainX0).slice(0, 2)) assert.equal(get(dx, 92, tz0 + 5), 0, `spare train door open at ${dx}`);
  // access: three stairs (10 half steps) from the hall and three glass lift shafts, lights under the plate
  for (const s of U.stairs) for (const z of [s.z0, s.z1]) {
    // a continuous half-step walk: hall floor (97) at the head, ten treads, the platform (92) at the foot
    const flight = [[s.x0 - 1, DECK_Y], ...Array.from({ length: 10 }, (_, i) => [s.x0 + i, DECK_Y - 0.5 * (i + 1)]), [s.x0 + 10, 92]];
    for (const [x, h] of flight) assert.ok(standHeights(x, z).includes(h), `stair tread at ${x},${z} at ${h}: ${standHeights(x, z)}`);
  }
  for (const l of U.lifts) assert.ok(count(l.x - 1, 92, l.z - 1, l.x + 1, 100, l.z + 1, is(B.STEEL_GLASS)) >= 24 && get(l.x - 1, 92, l.z) === 0 && get(l.x - 1, DECK_Y, l.z) === 0, `lift shaft at ${l.x},${l.z}`);
  assert.ok(count(U.box.x0, 95, U.box.z0, U.box.x1, 95, U.box.z1, is(B.GLOW_PANEL)) >= 40, 'ceiling lights');
  // the platform numbers and the timetable sign tiles on the west wall
  assert.ok(count(U.box.x0, 91, 6, U.box.x0, 95, 8, is(B.GLOW_PANEL)) >= 5, 'platform 1 number in the west wall');
  for (const sg of U.signs) for (let k = 0; k < 4; k++) assert.equal(get(sg.x, sg.y, sg.z - k), B.WALL_SIGN, `sign tile at ${sg.x},${sg.y},${sg.z - k}`);
});

test('route: the Westport terminus is a stop of the timetable (F -> C express, C -> T -> F stopping), every stop docks with open doors, the train stands at the terminus with its doors on platform 1', () => {
  assert.deepEqual(ROUTE.stops, [ROUTE.frontier, ROUTE.terminus, ROUTE.coruscant]);
  assert.ok(Math.abs(PERIOD - (3 * SCHEDULE.dwell + RIDE_TIME + LEG_CT + LEG_TF)) < 1e-9);
  const ticks = Math.round(PERIOD / TICK_DT);
  const seen = new Set(); let docked = 0, minX = Infinity, maxX = -Infinity, prev = null, maxJump = 0;
  for (let k = 0; k <= ticks; k++) {
    const st = trainState(k);
    if (st.at) { seen.add(st.at.name); if (st.phase === 'dwell') { docked++; assert.ok(st.doorsOpen); assert.equal(st.x0, st.at.dockX0); } }
    minX = Math.min(minX, st.x0); maxX = Math.max(maxX, st.x0);
    if (prev) maxJump = Math.max(maxJump, Math.abs(st.x0 - prev.x0));
    assert.ok(Math.abs(st.v) <= SCHEDULE.vmax + 1e-9, `speed ${st.v}`);
    prev = st;
  }
  assert.deepEqual([...seen].sort(), [ROUTE.coruscant.name, ROUTE.frontier.name, ROUTE.terminus.name].sort());
  assert.ok(Math.abs(docked - 3 * SCHEDULE.dwell / TICK_DT) <= 4, `three dwells (${docked} docked ticks)`);
  assert.ok(minX === ROUTE.frontier.dockX0 && maxX === ROUTE.coruscant.dockX0, 'the train never overruns the buffers');
  assert.ok(maxJump <= SCHEDULE.vmax * TICK_DT + 1e-6, `continuous motion (max jump ${maxJump})`);
  // the terminus dwell: the train's west end at dockX0 2250, so the passenger doors line up with platform 1
  const tT = Math.round((SCHEDULE.dwell * 2 + RIDE_TIME + LEG_CT + 1) / TICK_DT);
  const st = trainState(tT);
  assert.equal(st.at, ROUTE.terminus); assert.equal(st.dest, ROUTE.frontier); assert.equal(st.dir, -1);
  assert.ok(ticksUntilDock(0, ROUTE.terminus) > 0 && ticksUntilDock(tT, ROUTE.terminus) === 0);
  // the eastbound express passes the terminus at cruise speed with the doors sealed
  let passes = 0;
  for (let k = 0; k < ticks; k++) { const s = trainState(k); if (s.dir > 0 && s.x0 > ROUTE.terminus.dockX0 - 40 && s.x0 < ROUTE.terminus.dockX0 + 40) { passes++; assert.ok(!s.doorsOpen && s.phase === 'cruise', 'express through the terminus'); } }
  assert.ok(passes > 10);
});

test('three repair hangars (open front >= 24 wide x 12 high, roofed, lit, fitted) hold the repair berths; west fuel farm with chrome tanks; control towers >= 40 high with glass cabs and radar masts', () => {
  for (const H of P.HANGARS) {
    const xc = (H.x0 + H.x1) >> 1;
    assert.ok(H.x1 - H.x0 + 1 >= 24 && H.z1 - H.z0 + 1 >= 16 && P.HANGAR_ROOF - DECK_Y >= 12, `hangar ${H.id} size`);
    for (let x = xc - 12; x <= xc + 12; x++) for (let y = DECK_Y; y < DECK_Y + 12; y++) assert.equal(get(x, y, H.z0), 0, `hangar ${H.id} front open at ${x},${y}`);
    assert.ok(solid(get(xc, P.HANGAR_ROOF, (H.z0 + H.z1) >> 1)) && solid(get(xc, DECK_Y + 6, H.z1)), `hangar ${H.id} roof and back wall`);
    assert.ok(count(H.x0, DECK_Y, H.z0, H.x1, P.HANGAR_ROOF, H.z1, is(B.GLOW_PANEL)) >= 12, `hangar ${H.id} lit`);
    assert.ok(count(H.x0, DECK_Y, H.z0, H.x1, DECK_Y + 2, H.z1, (v) => v === B.CONSOLE || v === B.ANVIL || v === B.CRATE || v === B.BARREL || v === B.SHELF) >= 6, `hangar ${H.id} workshop fittings`);
    const berth = P.REPAIR_BERTHS.find(([, x, z]) => x >= H.x0 && x <= H.x1 && z >= H.z0 && z <= H.z1);
    assert.ok(berth, `a repair berth inside hangar ${H.id}`);
    for (let y = DECK_Y; y <= DECK_Y + 10; y++) assert.equal(get(berth[1], y, berth[2]), 0, `hangar ${H.id} berth column clear at y ${y}`);
  }
  for (const [cx, cz] of P.WEST_FUEL.tanks) assert.equal(get(cx, DECK_Y + 6, cz), B.CHROME, `west fuel tank at ${cx},${cz}`);
  for (const T of [P.WEST_TOWER, P.EAST_TOWER]) {
    assert.ok(T.cabY - DECK_Y >= 40, 'cab height');
    let glass = 0; for (let x = T.x0 - 4; x <= T.x1 + 4; x++) for (const z of [T.z0 - 4, T.z1 + 4]) for (let y = T.cabY + 2; y <= T.cabY + 4; y++) if (get(x, y, z) === B.STEEL_GLASS) glass++;
    assert.ok(glass > 60, `cab glass ${glass}`);
    assert.ok(solid(get(T.x0 + 3, T.cabY + 11, T.z0 + 3)) && get(T.x0 + 3, T.cabY + 13, T.z0 + 3) === B.PANEL_RED, 'radar mast with beacon');
    assert.ok(count(T.x0 - 3, T.cabY + 1, T.z0 - 3, T.x1 + 3, T.cabY + 1, T.z1 + 3, is(B.CONSOLE)) >= 20, 'console ring in the cab');
  }
});

test('cargo terminal: container yard with two gantry cranes, hauler dock (two L bays) with the manifest office, conveyor into the hall, bonded cage, two stores, dispatch office; all roofed and lit', () => {
  const C = P.CARGO;
  assert.ok(count(C.yard.x0, DECK_Y, C.yard.z0, C.yard.x1, DECK_Y + 3, C.yard.z1, (v) => v === B.CRATE || v === B.HULL_PLATE || v === B.BARREL) > 300, 'container stacks in the yard');
  for (const cx of C.cranes) assert.ok(count(cx - 4, DECK_Y + 8, C.yard.z0, cx + 4, DECK_Y + 30, C.yard.z1, solid) > 100, `gantry crane at x ${cx}`);
  for (const bay of P.CARGO_BAYS) assert.ok(bay.x >= C.dock.x0 && bay.x <= C.dock.x1 && bay.z >= C.dock.z0 && bay.z <= C.dock.z1 && bay.size === 'L', 'L bays on the dock');
  const O = C.office;
  assert.ok(count(O.x0, DECK_Y, O.z0, O.x1, DECK_Y + 1, O.z1, is(B.CONSOLE)) >= 2 && count(O.x0, DECK_Y + 5, O.z0, O.x1, DECK_Y + 7, O.z1, solid) > 100, 'manifest office desk and roof');
  const V = C.conveyor;
  assert.ok(count(V.x0, V.y, V.z, V.x1, V.y, V.z, (v) => v === B.CHROME || v === B.PANEL_STRIPE) >= 60, 'conveyor belt into the hall');
  const H = C.hall; let open = 0;
  for (let x = H.x0; x <= H.x1; x++) for (let z = H.z0; z <= H.z1; z++) if (!solid(get(x, H.roof, z))) open++;
  assert.equal(open, 0, `cargo hall roof holes ${open}`);
  assert.ok(count(H.x0, DECK_Y, H.z0, H.x1, H.roof, H.z1, is(B.GLOW_PANEL)) >= 60, 'cargo hall lit');
  assert.ok(count(C.bonded.x0, DECK_Y, C.bonded.z0, C.bonded.x1, DECK_Y + 3, C.bonded.z1, is(B.IRON_BARS)) > 200, 'bonded cage');
  for (const St of C.stores) assert.ok(count(St.x0, DECK_Y, St.z0, St.x1, DECK_Y + 1, St.z1, is(B.SHELF)) >= 40 && get(St.x1, DECK_Y, (St.z0 + St.z1) >> 1) === 0, 'store racks and door');
  const D = C.dispatch;
  assert.ok(count(D.x0, DECK_Y, D.z0, D.x1, DECK_Y + 1, D.z1, is(B.CONSOLE)) >= 3 && count(D.x0, DECK_Y + 2, D.z0, D.x1, DECK_Y + 3, D.z1, is(B.HOLO_SIGN)) >= 10, 'dispatch desk and boards');
  for (const d of C.doors) { const cells = d.side === 'S' ? [[d.x0, d.z], [d.x1, d.z]] : [[d.x, d.z0], [d.x, d.z1]]; for (const [x, z] of cells) for (let y = DECK_Y; y <= DECK_Y + 2; y++) assert.equal(get(x, y, z), 0, `cargo door open at ${x},${y},${z}`); }
});

test('dealer showroom (ship_dealer): glass hall with four plinths carrying a speeder, shuttle, freighter and yacht under price holo boards, open doors; security apron: fenced annex with two gates, guard post, two M pads', () => {
  const D = P.DEALER;
  assert.ok(count(D.x0, DECK_Y, D.z0, D.x1, D.roof, D.z1, is(B.STEEL_GLASS)) > 600, 'glass hall');
  let open = 0; for (let x = D.x0; x <= D.x1; x++) for (let z = D.z0; z <= D.z1; z++) if (!solid(get(x, D.roof, z))) open++;
  assert.equal(open, 0, 'showroom roofed');
  assert.equal(P.DEALER_PLINTHS.length, 4);
  assert.deepEqual(P.DEALER_PLINTHS.map((q) => q.cls).sort(), ['freighter', 'shuttle', 'speeder', 'yacht']);
  for (const q of P.DEALER_PLINTHS) {
    assert.ok(solid(get(q.x, DECK_Y, q.z)), `plinth ${q.cls}`);
    assert.ok(count(q.x - 8, DECK_Y + 1, q.z - 20, q.x + 8, DECK_Y + 8, q.z + 20, solid) > 80, `a ${q.cls} hull on its plinth`);
    assert.ok(count(q.x - 14, DECK_Y + 7, q.z - 3, q.x + 14, DECK_Y + 8, q.z + 3, is(B.HOLO_SIGN)) >= 8 && count(q.x - 14, DECK_Y + 2, q.z - 3, q.x + 14, DECK_Y + 6, q.z + 3, is(B.GLOW_PANEL)) >= 5, `price board of the ${q.cls}`);
  }
  for (let y = DECK_Y; y <= DECK_Y + 2; y++) { assert.equal(get(D.door.x, y, D.door.z0 + 1), 0, 'west door open'); assert.equal(get(D.doorN.x0 + 1, y, D.doorN.z), 0, 'north door open'); }
  const Sc = P.SECURITY;
  assert.ok(count(Sc.x0, DECK_Y + 1, Sc.z0, Sc.x1, DECK_Y + 2, Sc.z1, is(B.IRON_BARS)) > 400, 'perimeter fence');
  for (let z = Sc.gateW.z0; z <= Sc.gateW.z1; z++) for (let y = DECK_Y; y <= DECK_Y + 2; y++) assert.equal(get(Sc.x0, y, z), 0, `west gate open at ${z},${y}`);
  for (let x = Sc.gateN.x0; x <= Sc.gateN.x1; x++) for (let y = DECK_Y; y <= DECK_Y + 2; y++) assert.equal(get(x, y, Sc.z0), 0, `north gate open at ${x},${y}`);
  const G = Sc.post; let holes = 0; for (let x = G.x0; x <= G.x1; x++) for (let z = G.z0; z <= G.z1; z++) if (!solid(get(x, G.roof, z))) holes++;
  assert.equal(holes, 0, 'guard post roofed');
  assert.ok(count(G.x0, DECK_Y, G.z0, G.x1, DECK_Y + 2, G.z1, is(B.CONSOLE)) >= 3 && count(G.x0, DECK_Y, G.z0, G.x1, G.roof, G.z1, is(B.GLOW_PANEL)) >= 6, 'guard post fitted and lit');
  assert.equal(P.SECURITY_PADS.length, 2);
  for (const pad of P.SECURITY_PADS) assert.ok(pad.x >= Sc.x0 && pad.x <= Sc.x1 && pad.z >= Sc.z0 && pad.z <= Sc.z1 && pad.size === 'M');
});

test('emergency stairs at the apron edges: four caged switchback towers from the deck down toward the terraces, red-lit exit headers', () => {
  assert.ok(P.EMERGENCY_STAIRS.length >= 4);
  for (const s of P.EMERGENCY_STAIRS) {
    assert.ok(count(s.x0 + 3, DECK_Y + 2, s.z0 + 2, s.x0 + 12, DECK_Y + 2, s.z0 + 2, is(B.HOLO_SIGN)) >= 6 && get(s.x0 + 3, DECK_Y + 2, s.z0 + 2) === B.PANEL_RED, `exit header at ${s.x0},${s.z0}`);
    assert.ok(count(s.x0, 70, s.z0, s.x0 + 15, 93, s.z0 + 5, is(B.IRON_BARS)) > 40, 'cage');
    // treads from the deck level down (the ground exit is on the lower-city terrace, whose terrain is not generated here)
    let treads = 0; for (let x = s.x0 + 3; x <= s.x0 + 12; x++) for (const z of [s.z0 + 1, s.z0 + 3]) if (standHeights(x, z).some((h) => h < DECK_Y && h > 60)) treads++;
    assert.ok(treads >= 16, `stair treads ${treads}`);
  }
});

test('strictly walkable (no jumps) from the train platform to every pad, both tower cabs, the hangars, fuel farms, every hall program, the terminus platforms and the emergency stairs', () => {
  const targets = S.pads.map((p) => [p.x, p.z, DECK_Y]);
  const W = P.WEST_TOWER, ET = P.EAST_TOWER;
  targets.push([ET.x0 - 2, 0, ET.cabY + 1], [W.x0 - 2, W.z0 + 3, W.cabY + 1]);
  targets.push([S.hangar.x0 + 8, (S.hangar.z0 + S.hangar.z1) >> 1, DECK_Y], [S.fuel.x0 + 8, -71, DECK_Y], [S.terminal.x0 + 8, 0, DECK_Y], [S.terminal.cx, 20, DECK_Y]);
  for (const H of P.HANGARS) targets.push([(H.x0 + H.x1) >> 1, H.z0 + 10, DECK_Y]);
  targets.push([P.WEST_FUEL.x0 + 3, P.WEST_FUEL.z0 + 3, DECK_Y]);
  // the halls' staff spots (where the NPCs stand) and the interiors behind the doors
  for (const h of P.HALLS) for (const [x, z] of h.spots) targets.push([x, z, DECK_Y]);
  const TZ = P.TZ;
  targets.push([2272, -18, DECK_Y], [2272, -43, DECK_Y], [2280, -18, DECK_Y], [2330, -30, DECK_Y], [2300, 20, DECK_Y], [2262, 46, DECK_Y], [2300, 48, DECK_Y], [2338, 48, DECK_Y], [2331, 38, DECK_Y], [2347, 38, DECK_Y]);
  targets.push([TZ.gallery.x0 + 2, 0, TZ.gallery.y + 1], [P.TERMINAL.cx, 0, 99]);                            // viewing gallery, promenade
  targets.push([2300, 7, 92], [2300, 24, 92], [2300, 38, 92], [2205, 30, 92], [2335, 30, 92]);               // terminus platforms 1, 2, 3/4, both concourses
  targets.push([2402, -341, DECK_Y], [2402, -315, DECK_Y], [2453, -332, DECK_Y], [2456, -266, DECK_Y], [2200, -300, DECK_Y], [2320, -240, DECK_Y]);   // cargo stores, bonded cage, dispatch, yard, dock
  targets.push([2700, 122, DECK_Y], [2427, 214, DECK_Y], [2420, 120, DECK_Y]);                               // showroom floor, guard post, security apron
  targets.push([2559, -14, DECK_Y]);                                                                         // the deck over the freight ramp head
  const { unreached, seen } = walkFrom([S.bridge.x0, 0, STATION_Y + 1], targets);
  assert.deepEqual(unreached, [], 'unreached targets');
  // emergency stairs: at least one flight down from the deck inside each tower's box is reachable
  for (const s of P.EMERGENCY_STAIRS) {
    let down = false;
    for (const k of seen) { const [x, z, h] = k.split(',').map(Number); if (x >= s.x0 && x < s.x0 + 16 && z >= s.z0 && z < s.z0 + 6 && h <= DECK_Y - 4) { down = true; break; } }
    assert.ok(down, `emergency stair at ${s.x0},${s.z0} descends from the deck`);
  }
  console.log(`   ${seen.size} standing cells reached`);
});

test('halls: every program is a named lot with a fixed purpose (customs, transit_station, depot, repair_shop, hangar, ship_dealer, security_station, caf, shops), doors on the deck, staff spots inside; cityMeta records carry doors + names for the signs', () => {
  const layout = getLayout(1337);
  const metas = spaceportHallMeta(layout);
  assert.equal(metas.length, P.HALLS.length);
  const kinds = new Set(P.HALLS.map((h) => h.purpose));
  for (const k of ['customs', 'transit_station', 'depot', 'repair_shop', 'hangar', 'ship_dealer', 'security_station', 'caf', 'general_store', 'grocery']) assert.ok(kinds.has(k), `purpose ${k}`);
  for (const m of metas) {
    const lot = layout.lots[m.id];
    assert.ok(lot && lot.id === m.id && lot.kind === 'landmark' && lot.spaceport === m.key && lot.height === 0, `lot for ${m.key}`);
    const p = purposeFor(lot, layout);
    assert.equal(p.kind, m.purpose); assert.equal(p.name, m.name);
    assert.ok(m.doors.length >= 1 && m.spots.length >= 2 && m.name && m.door && m.inside);
    const h = P.HALLS.find((x) => x.key === m.key);
    for (const d of m.doors) {
      assert.equal(d.y, DECK_Y);
      for (let y = DECK_Y; y <= DECK_Y + 1; y++) assert.equal(get(d.x, y, d.z), 0, `${m.key} door open at ${d.x},${y},${d.z}`);
      // the door cell is in the hall's wall line
      assert.ok(d.x === h.rect.x0 || d.x === h.rect.x1 || d.z === h.rect.z0 || d.z === h.rect.z1, `${m.key} door on the wall`);
    }
    for (const sp of m.spots) assert.ok(sp.x > h.rect.x0 && sp.x < h.rect.x1 && sp.z > h.rect.z0 && sp.z < h.rect.z1 && standHeights(sp.x, sp.z).includes(DECK_Y), `${m.key} spot ${sp.x},${sp.z} inside and standable`);
  }
  // no plateau lot moved: the halls are appended after every city lot
  const first = layout.lots.findIndex((l) => l.spaceport);
  assert.ok(first > 400 && layout.lots.slice(first).every((l) => l.spaceport), 'halls appended last');
});

test('frontier mini spaceport: deck at the station level, marked pad clear above, roofed terminal, walkable from the west stub, "domestic" strip', () => {
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
  let glass = 0, holo = 0; for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) for (let y = W; y <= W + 6; y++) { const id = get(x, y, z); if (id === B.STEEL_GLASS) glass++; if (id === B.HOLO_SIGN) holo++; }
  assert.ok(glass > 100 && holo > 10, `glass ${glass} holo ${holo}`);
  const { unreached } = walkFrom([F.deck.x0, 0, W], [[F.pad.x, F.pad.z, W], [T.x0 + 6, 0, W]], F);
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
    const { geometry, faces, tris } = buildShipGeometry(m);
    // faces are convex polygons since ships v3 (sloped cells): 3..8 vertices each, indexed as tris
    assert.ok(faces > 100 && geometry.getAttribute('position').count >= faces * 3 && geometry.getAttribute('position').count <= faces * 8 && geometry.index.count === tris * 3);
    assert.ok(tris <= 6000, `${m.name} ${tris} tris`);
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
const ships = buildShips(S.pads, DECK_Y, null, layout, S.repairBerths);
test('every pad takes its fleet type: the hull fits inside the pad square (L pads carry the bulk freighter and the cruiser), and its landed heading turns the boarding door toward the hall', () => {
  const models = shipModels();
  let bulk = 0, cruiser = 0;
  for (const sh of ships.filter((s) => typeof s.pad === 'number')) {
    const pad = S.pads[sh.pad], m = models[sh.type], H = pad.half;
    assert.equal(sh.type, pad.type, `pad ${pad.gate} type`);
    const w = m.gridFlight ? m.gridFlight.w : m.width, d = m.gridFlight ? m.gridFlight.d : m.length;
    assert.ok(Math.max(w, d) <= 2 * H && Math.min(w, d) <= 2 * H - 2, `${m.name} (${w} x ${d}) does not fit pad ${pad.gate} (${pad.size}: ${2 * H} x ${2 * H})`);
    if (m.name === 'bulk_freighter') bulk++; if (m.name === 'cruiser') cruiser++;
    const q = routePose(sh.route, sh.route.segs.find((s) => s.phase === 'boarding').t0 + 1, {});
    assert.ok(Math.abs(((q.yaw - pad.yaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) < 1e-6, `pad ${pad.gate} landed yaw ${q.yaw} vs ${pad.yaw}`);
  }
  assert.ok(bulk >= 3 && cruiser >= 3, `bulk freighters ${bulk}, cruisers ${cruiser} on L pads`);
  assert.ok(P.PADS.filter((p) => p.size === 'L').every((p, i) => [4, 5].includes(P.PAD_TYPES[P.PADS.indexOf(p)])), 'L pads carry the two largest hulls');
});

test('at least 30 ships: one port cycle per pad, lane and harbour loops, repair berths in the hangars; poses are a pure function of time', () => {
  assert.ok(ships.length >= 30, `${ships.length} ships`);
  assert.equal(ships.filter((s) => typeof s.pad === 'number').length, S.pads.length);
  assert.equal(ships.filter((s) => s.repair).length, 3, 'repair berths');
  const withFrontier = buildShips(S.pads, DECK_Y, { pad: FRONTIER.pad, deckY: FRONTIER_DECK_Y }, layout, S.repairBerths);
  assert.equal(withFrontier.length, ships.length + 1);
  const fs = withFrontier.find((s) => s.pad === 'frontier'), boarding = fs.route.segs.find((s) => s.phase === 'boarding');
  const fp = routePose(fs.route, boarding.t0 + 1, {});
  assert.deepEqual([fs.type, fp.x, fp.y, fp.z, fp.phase], [1, FRONTIER.pad.x, FRONTIER_DECK_Y, FRONTIER.pad.z, 'boarding']);
  for (let t = 0; t < fs.route.period; t += 0.5) { const q = routePose(fs.route, t, {}); assert.ok(q.y >= FRONTIER_DECK_Y - 1e-9 && q.y <= 165 && Math.hypot(q.x, q.z) < 420, 'frontier shuttle stays over the frontier'); }
  const again = buildShips(S.pads, DECK_Y, null, layout, S.repairBerths);
  const a = {}, b = {};
  for (let i = 0; i < ships.length; i++) for (let t = 0; t < ships[i].route.period; t += 0.37) {
    routePose(ships[i].route, t, a); routePose(again[i].route, t, b);
    assert.deepEqual([a.x, a.y, a.z, a.yaw, a.pitch, a.roll, a.thrust, a.phase], [b.x, b.y, b.z, b.yaw, b.pitch, b.roll, b.thrust, b.phase]);
  }
  for (const sh of ships.filter((s) => s.repair)) {
    const q = routePose(sh.route, 10, {});
    assert.ok(P.HANGARS.some((H) => q.x >= H.x0 && q.x <= H.x1 && q.z >= H.z0 && q.z <= H.z1) && q.y === DECK_Y && q.phase === 'repair', `${sh.name} inside a hangar`);
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

test('lanes clear: no ship (pad cycles, lanes, harbour loops) passes through a spaceport block - hull footprint sampled against the generated chunks; approach columns free of other pads\' equipment', () => {
  const models = shipModels();
  let samples = 0, lowest = Infinity;
  for (const sh of ships) {
    if (sh.repair) continue;
    const m = models[sh.type], hl = (m.gridFlight ? m.gridFlight.d : m.length) / 2, hw = (m.gridFlight ? m.gridFlight.w : m.width) / 2;
    const pad = typeof sh.pad === 'number' ? S.pads[sh.pad] : null;
    for (let t = 0; t < sh.route.period; t += 0.25) {
      const q = routePose(sh.route, t, {});
      if (q.y > 135 || q.x < S.x0 - 40 || q.x > S.x1 + 40) continue;
      samples++;
      const nx = Math.sin(q.yaw), nz = -Math.cos(q.yaw);                    // nose direction (yaw 0 = nose -z)
      const cols = [[q.x, q.z], [q.x + nx * hl, q.z + nz * hl], [q.x - nx * hl, q.z - nz * hl], [q.x + nz * hw, q.z - nx * hw], [q.x - nz * hw, q.z + nx * hw]];
      for (const [cx, cz] of cols) {
        const top = topSolid(Math.floor(cx), Math.floor(cz));
        if (top < 0) continue;
        const onOwnPad = pad && Math.abs(cx - pad.x) <= pad.half && Math.abs(cz - pad.z) <= pad.half && top <= DECK_TOP;
        if (onOwnPad) continue;
        lowest = Math.min(lowest, q.y - (top + 1));
        assert.ok(q.y >= top + 1 - 1e-6, `${sh.name} (${q.phase}) at ${q.x.toFixed(0)},${q.y.toFixed(1)},${q.z.toFixed(0)} hits ${BLOCKS[get(Math.floor(cx), top, Math.floor(cz))].name} at ${Math.floor(cx)},${top},${Math.floor(cz)}`);
      }
    }
  }
  console.log(`   ${samples} low samples over the port, closest hull-to-structure clearance ${lowest.toFixed(1)} blocks`);
  assert.ok(samples > 3000);
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

test('ShipTraffic: one InstancedMesh per model type, ships beyond 300 blocks are not submitted, one draw call per type, >= 30 airborne at both terminals', () => {
  const game = fakeGame();
  const tr = new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y, layout, repairBerths: S.repairBerths });
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
  assert.ok(tr.census(300).airborne >= 30, 'census: >= 30 airborne within 300 blocks of the east terminal');
  tr.update(1 / 60, 0.5, { position: { x: P.TERMINAL.cx, y: 100, z: 0 } });
  assert.ok(tr.census(300).airborne >= 30, `census: >= 30 airborne within 300 blocks of the grand terminal (${tr.census(300).airborne})`);
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
  const tr = attachShipClasses(new ShipTraffic(game, { pads: S.pads, deckY: DECK_Y, layout, repairBerths: S.repairBerths }), { ShipVehicle });
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
