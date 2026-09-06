// Westport Terminus checks (rubric 12: the spaceport's train terminus as the third stop of the hyperlane):
//   node scripts/test-terminus.mjs [--url http://localhost:5173] [--shots /tmp/terminus-shots] [--no-browser]
// Node part (no browser): the timetable with the stop (dwell order F -> C -> T, leg times, jerk-limited westbound
// legs whose phases train.js draws untouched, doors <-> hop speed, the countdown semantics the boards read, the dock
// against the generated undercroft: parked train volume clear, platform 1 under every door, stair heads open).
// Browser part (CDP, one headless Chrome): a full ride frontier -> Coruscant (express through the terminus at speed
// with sealed doors) -> Westport Terminus with the player aboard (in the car every tick), the arrival at dockX0 with the
// platform 1 edge screen opening at the door columns, stepping off onto the lit platform, walking the stairs up to the
// hall and back down, then the departure for the frontier sealing the screen again.
import { mkdirSync } from 'node:fs';
import { launchPage } from './cdp.mjs';
import { initBlocks, BLOCKS, B } from '../src/blocks.js';
import { WorldGen } from '../src/worldgen.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH, TICK_DT } from '../src/constants.js';
import { register as registerSpaceport, SPACEPORT_TERMINUS, DECK_Y } from '../src/coruscant/spaceport.js';
import { registerTrack } from '../src/structures/hyperlane.js';
import { smoothState } from '../src/vehicles/train.js';
import { trainState, ticksUntilDock, doorWorldXs, ROUTE, CARS, CAR_LENGTH, DOOR_OFFSETS, TRAIN_LENGTH, SCHEDULE, RIDE_TIME, PERIOD, LEG_CT, LEG_TF } from '../src/vehicles/route.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = opt('--url', 'http://localhost:5173');
const shots = opt('--shots', '/tmp/terminus-shots');
const noBrowser = args.includes('--no-browser');
mkdirSync(shots, { recursive: true });

let passed = 0, failed = 0;
const log = (...a) => console.log(...a);
function check(name, cond, detail = '') {
  if (cond) { passed++; log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); }
  else { failed++; log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); }
}
const F = ROUTE.frontier, C = ROUTE.coruscant, T = ROUTE.terminus, U = SPACEPORT_TERMINUS;
const st = (tick) => trainState(tick);
const secs = (ticks) => ticks * TICK_DT;

// ================================================================================================ node: timetable
{
  const ticks = Math.round(PERIOD / TICK_DT);
  // dwell sequence and durations over one cycle (started inside the frontier dwell)
  const dwells = []; let cur = null;
  for (let k = 0; k <= ticks + 1; k++) {
    const s = st(k);
    if (s.phase === 'dwell') { if (cur && cur.at === s.at.name) cur.n++; else { cur = { at: s.at.name, n: 1, from: k }; dwells.push(cur); } }
    else cur = null;
  }
  const order = dwells.map((d) => d.at);
  check('one cycle docks at the frontier, Coruscant, the terminus and the frontier again (westbound stopping, eastbound express)', order.join(' > ') === [F.name, C.name, T.name, F.name].join(' > '), order.join(' > '));
  const D = Math.round(SCHEDULE.dwell / TICK_DT);
  check('every dwell lasts SCHEDULE.dwell (doors open the whole time)', dwells.slice(0, 3).every((d) => Math.abs(d.n - D) <= 1), dwells.slice(0, 3).map((d) => d.n).join(','));
  const legs = [];
  for (let i = 1; i < dwells.length; i++) legs.push({ from: dwells[i - 1].at, to: dwells[i].at, secs: secs(dwells[i].from - (dwells[i - 1].from + dwells[i - 1].n)) });
  const legCT = legs.find((l) => l.from === C.name && l.to === T.name), legTF = legs.find((l) => l.from === T.name && l.to === F.name), legFC = legs.find((l) => l.from === F.name && l.to === C.name);
  check('leg times: express F -> C = RIDE_TIME, C -> T = LEG_CT, T -> F = LEG_TF (each within a tick)', legFC && legCT && legTF && Math.abs(legFC.secs - RIDE_TIME) <= TICK_DT && Math.abs(legCT.secs - LEG_CT) <= TICK_DT && Math.abs(legTF.secs - LEG_TF) <= TICK_DT,
    `F>C ${legFC && legFC.secs.toFixed(2)} s (${RIDE_TIME.toFixed(2)}), C>T ${legCT && legCT.secs.toFixed(2)} s (${LEG_CT.toFixed(2)}), T>F ${legTF && legTF.secs.toFixed(2)} s (${LEG_TF.toFixed(2)}), period ${PERIOD.toFixed(1)} s`);
  check('the terminus stop is at the plan\'s dock (west end 2250, platform 1 x 2264..2323 = 60 long), between the frontier and Coruscant on the line', T.dockX0 === U.dockX0 && T.platformX0 === U.x0 && U.x1 - U.x0 + 1 === 60 && F.dockX0 < T.dockX0 && T.dockX0 + TRAIN_LENGTH <= C.dockX0 && ROUTE.stops[1] === T, `dock ${T.dockX0}`);

  // the westbound legs: phase names (launch / brake are the terminus ramps train.js leaves alone; the T -> F brake is
  // the frontier 'decel' it eases), speed under vmax, doors open exactly while slower than hopSpeed, continuous motion
  const phasesOf = (leg) => { const seen = []; for (let k = leg.from; k < leg.to; k++) { const p = st(k).phase; if (seen[seen.length - 1] !== p) seen.push(p); } return seen; };
  const dwellC = dwells.find((d) => d.at === C.name), dwellT = dwells.find((d) => d.at === T.name), dwellF2 = dwells[3];
  const spanCT = { from: dwellC.from + dwellC.n, to: dwellT.from }, spanTF = { from: dwellT.from + dwellT.n, to: dwellF2.from };
  // (209 blocks is exactly two 8 s ramps at the peak speed: C -> T has no cruise tick unless the boundary lands on one)
  check('C -> T runs launch > (cruise) > brake, T -> F launch > cruise > decel', /^launch>(cruise>)?brake$/.test(phasesOf(spanCT).join('>')) && phasesOf(spanTF).join('>') === 'launch>cruise>decel', `${phasesOf(spanCT).join('>')} | ${phasesOf(spanTF).join('>')}`);
  let vpeakCT = 0, vpeakTF = 0, doorBad = 0, jump = 0, prev = null, westbound = true;
  for (let k = spanCT.from; k < dwellF2.from; k++) {
    const s = st(k);
    if (k < spanCT.to) vpeakCT = Math.max(vpeakCT, -s.v); else if (k >= spanTF.from) vpeakTF = Math.max(vpeakTF, -s.v);
    if (s.doorsOpen !== (Math.abs(s.v) <= SCHEDULE.hopSpeed)) doorBad++;
    if (s.phase !== 'dwell' && (s.v > 0 || s.dir !== -1 || s.dest !== (k < spanCT.to ? T : F))) westbound = false;
    if (prev) jump = Math.max(jump, Math.abs(s.x0 - prev.x0));
    prev = s;
  }
  check('the short C -> T leg peaks below vmax (never reaches the cruise speed), T -> F cruises at vmax; both westbound with the right destination', vpeakCT > 20 && vpeakCT < SCHEDULE.vmax - 1 && Math.abs(vpeakTF - SCHEDULE.vmax) < 1e-9 && westbound, `peaks ${vpeakCT.toFixed(1)} / ${vpeakTF.toFixed(1)} blocks/s`);
  check('doors open exactly while slower than hopSpeed, motion continuous (<= vmax per tick)', doorBad === 0 && jump <= SCHEDULE.vmax * TICK_DT + 1e-6, `door mismatches ${doorBad}, max step ${jump.toFixed(3)}`);

  // the countdown the boards read: RIDE_TIME - phaseT = seconds to the next dock, on both westbound legs
  let worst = 0;
  for (const span of [spanCT, spanTF]) for (let k = span.from + 1; k < span.to; k += 7) {
    const s = st(k); const predicted = RIDE_TIME - s.phaseT, actual = secs(span.to - k);
    worst = Math.max(worst, Math.abs(predicted - actual));
  }
  check('"ARRIVING IN" countdown (RIDE_TIME - phaseT) equals the time to the next dock on the westbound legs', worst <= TICK_DT + 1e-9, `worst error ${worst.toFixed(3)} s`);
  // ticksUntilDock for every stop: 0 while docked there, else counts down 1 per tick to the next dwell
  let tudBad = 0;
  for (const S of [F, T, C]) for (let k = 0; k < ticks; k += 13) {
    const n = ticksUntilDock(k, S); const s = st(k + n);
    if (n < 0 || !(s.at === S && s.doorsOpen) || (n > 0 && st(k + n - 1).at === S && st(k + n - 1).phase === 'dwell')) tudBad++;
  }
  check('ticksUntilDock lands on the first open-door tick at each of the three stops', tudBad === 0, `${tudBad} misses`);
  const firstT = ticksUntilDock(0, T);
  check('from the frontier dwell the terminus is reached after the express, the Coruscant dwell and the C -> T leg', Math.abs(secs(firstT) - (2 * SCHEDULE.dwell + RIDE_TIME + LEG_CT)) <= TICK_DT, `${secs(firstT).toFixed(1)} s`);

  // train.js easing: launch / brake untouched, the T -> F decel eased onto the same curve -> what is drawn is the timetable
  let dxMax = 0, dvMax = 0;
  for (let k = spanCT.from; k < dwellF2.from; k++) { const raw = st(k), e = smoothState(raw); dxMax = Math.max(dxMax, Math.abs(e.x0 - raw.x0)); dvMax = Math.max(dvMax, Math.abs(e.v - raw.v)); }
  check('smoothState draws the westbound legs exactly as the timetable (positions within 0.01, speeds within 0.01)', dxMax < 0.01 && dvMax < 0.01, `dx ${dxMax.toExponential(1)}, dv ${dvMax.toExponential(1)}`);
  // jerk-limited: acceleration ~0 at the C -> T ramp ends, peaks mid-ramp
  const acc = (k) => (st(k + 1).v - st(k - 1).v) / (2 * TICK_DT);
  const rampEnd = spanCT.from + Math.round(SCHEDULE.accel / TICK_DT);
  const aStart = Math.abs(acc(spanCT.from + 1)), aMid = Math.abs(acc(Math.round((spanCT.from + rampEnd) / 2))), aEnd = Math.abs(acc(rampEnd - 2));
  check('C -> T launch ramp is an S-curve (acceleration ~0 at both ends, peak mid-ramp)', aStart < 0.5 && aEnd < 0.5 && aMid > 3, `a ${aStart.toFixed(2)} / ${aMid.toFixed(2)} / ${aEnd.toFixed(2)} blocks/s2`);
  // the eastbound express: through the terminus at vmax with the doors sealed
  let express = 0, expressBad = 0;
  for (let k = dwells[0].from + dwells[0].n; k < dwellC.from; k++) { const s = st(k); if (s.x0 + TRAIN_LENGTH >= T.platformX0 - 2 && s.x0 <= T.platformX1 + 2) { express++; if (s.doorsOpen || s.phase !== 'cruise' || Math.abs(s.v - SCHEDULE.vmax) > 1e-9) expressBad++; } }
  check('eastbound the express passes platform 1 at vmax with sealed doors (the screen stays closed)', express > 20 && expressBad === 0, `${express} ticks alongside the platform`);
  // doors on platform 1
  const doors = doorWorldXs(T.dockX0);
  check('all eight doorways of the docked train open onto platform 1 (x 2264..2323)', doors.length === 8 && doors.every((x) => x >= T.platformX0 && x + 1 <= U.x1), doors.join(','));
}

// ================================================================================================ node: the dock
initBlocks();
{
  const gen = new WorldGen(1337);
  registerSpaceport(gen, null); registerTrack(gen);
  const chunks = new Map(), key = (cx, cz) => cx * 100000 + cz;
  for (let cx = Math.floor((U.box.x0 - 2) / CS); cx <= Math.floor((C.dockX0 + TRAIN_LENGTH + 8) / CS); cx++) for (let cz = -1; cz <= Math.floor(U.box.z1 / CS); cz++) {
    const c = { cx, cz, blocks: new Uint8Array(CS * CS * CH) }; gen.generateChunk(c); chunks.set(key(cx, cz), c);
  }
  const get = (x, y, z) => { const c = chunks.get(key(Math.floor(x / CS), Math.floor(z / CS))); return c ? c.blocks[((x & 15) * CS + (z & 15)) * CH + y] : 0; };
  const solid = (id) => id > 0 && BLOCKS[id].solid;
  const name = (id) => (BLOCKS[id] ? BLOCKS[id].name : 'air');
  // the train's volume (z -3..2, body y 90..95; the undercarriage shares the rail layer 90) is clear from the terminus
  // dock all the way to Coruscant's: the westbound leg threads the undercroft's east wall and the station cut
  const hits = [];
  for (let x = T.dockX0; x < C.dockX0 + TRAIN_LENGTH && hits.length < 5; x++) for (let y = 90; y <= 95; y++) for (let z = -3; z <= 2; z++) {
    const id = get(x, y, z); if (id && !(y === 90 && id === B.RAIL)) hits.push(`${x},${y},${z}=${name(id)}`);
  }
  check('the train slot is clear from the terminus dock to Coruscant (z -3..2, y 90..95; only rails on 90)', hits.length === 0, hits.join(' ') || `${C.dockX0 + TRAIN_LENGTH - T.dockX0} columns`);
  // platform 1: floor under every door column and its boarding strip (z 3..7, the benches / stair rails / lift stand
  // behind it), head room 92..93, the screen line left for stations.js
  const doors = doorWorldXs(T.dockX0), bad = [];
  for (const dx of doors) for (const x of [dx, dx + 1]) {
    for (let z = 3; z <= 7; z++) if (!solid(get(x, 91, z)) || get(x, 92, z) !== 0 || get(x, 93, z) !== 0) bad.push(`${x},${z}=${name(get(x, 92, z))}/${name(get(x, 93, z))}`);
  }
  check('platform 1 floor (91) under every door column, its boarding strip (z 3..7) clear 92..93, screen line free for the station fill', bad.length === 0, bad.slice(0, 4).join(' ') || `${doors.length} doors`);
  // stair heads: the hall floor at x0 - 1 steps straight onto the first tread (no rail across the entry)
  const heads = U.stairs.map((s) => [s.z0, s.z1].every((z) => solid(get(s.x0 - 1, DECK_Y - 1, z)) && get(s.x0 - 1, DECK_Y, z) === 0 && get(s.x0 - 1, DECK_Y + 1, z) === 0 && get(s.x0, DECK_Y - 1, z) === B.STONE_BRICK_SLAB));
  check('the three stair heads open from the hall floor onto the first half step', heads.every(Boolean), heads.join(','));
  const signs = U.signs.every((s) => [0, 1, 2, 3].every((k) => get(s.x, s.y, s.z - k) === B.WALL_SIGN));
  check('timetable sign tiles on the west wall beside platform 1', signs, U.signs.map((s) => `${s.x},${s.y},${s.z}`).join(' '));
}

if (noBrowser) { log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); }

// ================================================================================================ browser
const CAR = CARS[1];                                   // the player rides the first passenger car
const W = ROUTE.trainWidth;
const aisleZ = ROUTE.trainZ0 + 2.5;
const floorY = ROUTE.floorY;
const DOOR = DOOR_OFFSETS[CAR.kind][0];                // car-local x of the first doorway (2 wide)
const profile = `/tmp/chrome-terminus-${process.pid}`;
const startUrl = `${base}/?x=${F.dockX0 + CAR.x0 + 7}&y=${floorY}&z=${aisleZ}&yaw=-90&pitch=0&time=0.5&quality=light&rd=6&fresh=1&mode=survival`;
log(`\nlaunching ${startUrl}`);
const page = await launchPage(startUrl, { profile });
const ev = (js) => page.evaluate(js);
const shot = async (n) => { const p = `${shots}/${n}.png`; await page.screenshot(p); log(`  screenshot ${p}`); };
const box = { x0: CAR.x0, x1: CAR.x0 + CAR_LENGTH, z0: 1, z1: W };
const doorXs = doorWorldXs(T.dockX0);
const stair = U.stairs[0];

const HELPERS = `
window.__t = {
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  train: () => game.vehicles.list.find((v) => v.name === 'space_train'),
  play() { game.input.locked = true; if (game.hud.screen) game.hud.screen = null; },
  local() { const t = this.train(), p = game.player; const l = t.worldToGrid(p.pos.x, p.pos.y, p.pos.z); return { x: +l.x.toFixed(3), y: +l.y.toFixed(3), z: +l.z.toFixed(3) }; },
  ff(ticks, until) { this.play(); for (let i = 0; i < ticks; i++) { game.vehicles.tick(); game.tick(true); if (until && until(i)) return i + 1; } return ticks; },
  // ride until pred() while recording the player's car-local position, the phases and the pass along platform 1
  ride(maxTicks, pred, box, plat) {
    const t = this.train(), p = game.player; const start = this.local();
    let worst = 0, viol = [], ticks = 0, offFloor = 0, notRiding = 0, phases = [], pass = { ticks: 0, minV: 1e9, maxV: 0, doorsOpen: 0 }, vmax = 0;
    for (let i = 0; i < maxTicks; i++) {
      game.vehicles.tick(); game.tick(true); ticks++;
      const s = t.state, l = t.worldToGrid(p.pos.x, p.pos.y, p.pos.z);
      const drift = Math.hypot(l.x - start.x, l.z - start.z); if (drift > worst) worst = drift;
      if (l.x < box.x0 || l.x >= box.x1 || l.z < box.z0 || l.z >= box.z1) { if (viol.length < 3) viol.push({ i, l: [l.x.toFixed(2), l.y.toFixed(2), l.z.toFixed(2)] }); }
      if (Math.abs(l.y - 2) > 0.02) offFloor++;
      if (!t.isPlayerRiding()) notRiding++;
      if (phases[phases.length - 1] !== s.phase) phases.push(s.phase);
      vmax = Math.max(vmax, Math.abs(s.v));
      if (plat && s.x0 + ${TRAIN_LENGTH} >= plat.x0 && s.x0 <= plat.x1) { pass.ticks++; pass.minV = Math.min(pass.minV, Math.abs(s.v)); pass.maxV = Math.max(pass.maxV, Math.abs(s.v)); if (s.doorsOpen) pass.doorsOpen++; }
      if (pred()) break;
    }
    return { ticks, worst: +worst.toFixed(4), viol, offFloor, notRiding, phases, pass, vmax: +vmax.toFixed(2), end: this.local(), info: t.info() };
  },
  // the platform 1 edge screen at the door columns and between them, the boarding pads, light on the platform
  screen(doorXs) {
    const w = game.world, ids = (x) => [w.getBlock(x, ${floorY}, 3), w.getBlock(x, ${floorY + 1}, 3)];
    const between = doorXs.map((x) => x - 2);
    return { doors: doorXs.map((x) => ids(x).concat(ids(x + 1))), between: between.map(ids), pads: doorXs.map((x) => w.getBlock(x, ${floorY - 1}, 4)),
      light: doorXs.map((x) => w.getLight(x, ${floorY}, 5)), sky: doorXs.map((x) => w.getSky(x, ${floorY}, 5)), lit: doorXs.every((x) => { const c = w.chunkAt(x, 5); return !!(c && c.lit); }) };
  },
  // hold a key for n ticks (fixed step), then settle
  walk(key, yaw, n, stop) {
    const p = game.player; p.yaw = yaw; p.pitch = 0; p.flying = false; game.input.keys.add(key);
    let used = n;
    for (let i = 0; i < n; i++) { game.vehicles.tick(); game.tick(true); if (stop && stop(i)) { used = i + 1; break; } }
    game.input.keys.delete(key);
    for (let i = 0; i < 10; i++) { game.vehicles.tick(); game.tick(true); }
    return { used, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), hp: p.health, dead: p.dead, riding: this.train().isPlayerRiding(), below: game.world.getBlockDef(Math.floor(p.pos.x), Math.floor(p.pos.y) - 1, Math.floor(p.pos.z)).name };
  },
};
true`;

try {
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1500);

  // ------------------------------------------------------------------ 1. docked at the frontier
  log('\n== Docked at the frontier ==');
  let info = await ev('__t.train().info()');
  check('train docked at the frontier with open doors at load, player aboard in the aisle', info.phase === 'dwell' && info.at === F.name && info.doorsOpen && info.riding, `cycleT ${info.cycleT.toFixed(1)} s, local ${JSON.stringify(await ev('__t.local()'))}`);
  check('the frontier board announces Coruscant (the express does not call at the terminus)', info.dest === C.name, `dest ${info.dest}`);

  // ------------------------------------------------------------------ 2. the express F -> C through the terminus
  log('\n== Express frontier -> Coruscant, through the terminus ==');
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  const plat = { x0: T.platformX0 - 2, x1: T.platformX1 + 2 };
  let ride = await ev(`__t.ride(${Math.ceil(RIDE_TIME * 20) + 100}, () => { const s = __t.train().state; return s.phase === 'dwell' && s.at && s.at.name === ${JSON.stringify(C.name)}; }, ${JSON.stringify(box)}, ${JSON.stringify(plat)})`);
  log('  express', JSON.stringify({ ticks: ride.ticks, worst: ride.worst, viol: ride.viol, offFloor: ride.offFloor, notRiding: ride.notRiding, phases: ride.phases, pass: ride.pass, vmax: ride.vmax, preload: ride.info.preload }));
  check('express: the player stays in the car every tick, feet on the floor, no drift', ride.viol.length === 0 && ride.notRiding === 0 && ride.worst < 0.05 && ride.offFloor === 0, `${ride.ticks} ticks, worst drift ${ride.worst}`);
  check('express: accel > cruise > decel > dwell at Coruscant', ride.phases.join('>') === 'accel>cruise>decel>dwell' && ride.info.at === C.name && Math.abs(ride.info.x0 - C.dockX0) < 1e-6, ride.phases.join('>'));
  check('express: passes platform 1 of the terminus at vmax with the doors sealed', ride.pass.ticks > 20 && ride.pass.minV > SCHEDULE.vmax - 1e-6 && ride.pass.doorsOpen === 0, `${ride.pass.ticks} ticks alongside, v ${ride.pass.minV.toFixed(1)}..${ride.pass.maxV.toFixed(1)}`);
  check('chunks preloaded ahead of the ride', ride.info.preload.chunks > 20, `${ride.info.preload.chunks} chunks`);

  // ------------------------------------------------------------------ 3. Coruscant: the board turns to the terminus
  log('\n== Docked at Coruscant ==');
  await page.sleep(1200);
  info = await ev('__t.train().info()');
  const boardC = await ev('(() => { const t = __t.train(); return t.display && t.display.lastKey; })()');
  check('docked at Coruscant, next stop Westport Terminus on the train boards', info.phase === 'dwell' && info.at === C.name && info.dest === T.name && typeof boardC === 'string' && boardC.startsWith(T.name + '|'), `${info.dest} | ${String(boardC).slice(0, 60)}`);
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  const depart = await ev('(() => { const s = __t.train().state; return { phase: s.phase, dest: s.dest.name, dir: s.dir, doorsOpen: s.doorsOpen, msgs: game.hud.messages.map((m) => m.text).slice(-3) }; })()');
  log('  departure', JSON.stringify(depart));
  check('departs westward for the terminus in the launch phase with the doors still open below hop speed, announced in chat', depart.phase === 'launch' && depart.dest === T.name && depart.dir === -1 && depart.doorsOpen && depart.msgs.some((m) => new RegExp(`departing for ${T.name}`, 'i').test(m)), depart.msgs.slice(-1)[0]);

  // ------------------------------------------------------------------ 4. the stopping leg C -> T
  log('\n== Coruscant -> Westport Terminus ==');
  await ev(`(() => { const t = __t.train(); const w = t.gridToWorld(${CAR.x0 + 7}, 2, 2.5); game.player.teleport(w.x, w.y, w.z); game.player.yaw = Math.PI / 2; return true; })()`);
  // the launch ramp up to the peak (the 209-block leg is two ramps back to back), then read the countdown the boards
  // show against the timetable
  ride = await ev(`__t.ride(${Math.ceil(LEG_CT * 20)}, () => __t.train().state.phase !== 'launch', ${JSON.stringify(box)}, null)`);
  const launch = { phases: ride.phases, vmax: ride.vmax, viol: ride.viol.length, notRiding: ride.notRiding };
  await page.sleep(1200);
  const mid = await ev('(() => { const t = __t.train(), s = t.state; return { phase: s.phase, v: s.v, phaseT: s.phaseT, key: t.display && t.display.lastKey, x0: s.x0 }; })()');
  const m = /ARRIVING IN (\d+):(\d\d)/.exec(mid.key || '');
  const shown = m ? +m[1] * 60 + +m[2] : -1, expected = RIDE_TIME - mid.phaseT;
  check('at the peak of the leg the boards count down to the terminus (ARRIVING IN = time to the dock)', /^(brake|cruise)$/.test(mid.phase) && m && Math.abs(shown - expected) <= 2.5, `shown ${shown} s vs ${expected.toFixed(1)} s at v ${Math.abs(mid.v).toFixed(1)}, ${mid.phase}`);
  await shot('01_leg_to_terminus_interior');
  ride = await ev(`__t.ride(${Math.ceil(LEG_CT * 20) + 100}, () => { const s = __t.train().state; return s.phase === 'dwell' && s.at && s.at.name === ${JSON.stringify(T.name)}; }, ${JSON.stringify(box)}, ${JSON.stringify(plat)})`);
  log('  stopping leg', JSON.stringify({ launch, ticks: ride.ticks, worst: ride.worst, viol: ride.viol, offFloor: ride.offFloor, notRiding: ride.notRiding, phases: ride.phases, vmax: ride.vmax, pass: ride.pass }));
  const phases = [...launch.phases, ...ride.phases].filter((p, i, a) => a[i - 1] !== p).join('>');
  check('C -> T: the player stays in the car through launch and brake, no drift', launch.viol === 0 && launch.notRiding === 0 && ride.viol.length === 0 && ride.notRiding === 0 && ride.worst < 0.05 && ride.offFloor === 0 && /^launch>(cruise>)?brake>dwell$/.test(phases), `${phases}, ${ride.ticks} ticks`);
  check('C -> T never reaches vmax (short leg) and brakes to a stop alongside platform 1 with the doors reopening', Math.max(launch.vmax, ride.vmax) < SCHEDULE.vmax - 1 && ride.pass.doorsOpen > 0 && ride.pass.minV === 0, `peak ${Math.max(launch.vmax, ride.vmax)} blocks/s`);
  await page.sleep(1500);
  const arrived = await ev(`(() => { const t = __t.train(), s = t.state; return { x0: s.x0, phase: s.phase, at: s.at && s.at.name, dest: s.dest.name, doorsOpen: s.doorsOpen, anim: t.doorAnim, riding: t.isPlayerRiding(), msgs: game.hud.messages.map((m) => m.text).slice(-3), key: t.display && t.display.lastKey }; })()`);
  log('  arrival', JSON.stringify(arrived));
  check('arrived: docked exactly at the terminus dockX0 (2250) with the doors open, rider aboard, "Arriving at Westport Terminus" in chat', arrived.phase === 'dwell' && arrived.at === T.name && Math.abs(arrived.x0 - T.dockX0) < 1e-6 && arrived.doorsOpen && arrived.riding && arrived.msgs.some((m) => new RegExp(`arriving at ${T.name}`, 'i').test(m)), `x0 ${arrived.x0}, ${arrived.msgs.slice(-1)[0]}`);
  check('boards at the terminus: next stop the frontier, boarding countdown', arrived.dest === F.name && /BOARDING/.test(arrived.key || ''), String(arrived.key).slice(0, 70));

  // ------------------------------------------------------------------ 5. platform 1's edge screen and the platform
  log('\n== Platform 1 ==');
  let scr = null;
  for (let i = 0; i < 12; i++) { scr = await ev(`__t.screen(${JSON.stringify(doorXs)})`); if (scr.lit) break; await page.sleep(500); }
  log('  screen', JSON.stringify(scr));
  check('edge screen: the door columns are open (air 92..93 at z 3) while the train stands there', scr.doors.every((ids) => ids.every((id) => id === 0)), `${scr.doors.length} door columns`);
  check('edge screen: glass between the doors, lit boarding pads in front of every door', scr.between.every((ids) => ids.every((id) => id === B.STEEL_GLASS)) && scr.pads.every((id) => id === B.GLOW_PANEL), `pads ${scr.pads.map((id) => BLOCKS[id] ? BLOCKS[id].name : id).join(',').slice(0, 40)}`);
  check('the undercroft platform is lit (block light >= 6 at every door)', scr.lit && scr.light.every((l) => l >= 6), `light ${scr.light.join(',')} sky ${scr.sky.join(',')}`);
  // step off: stand in the first doorway of the car, walk south through the open door column onto the platform
  await ev(`(() => { const t = __t.train(); const w = t.gridToWorld(${CAR.x0 + DOOR + 1}, 2, 2.5); game.player.teleport(w.x, w.y, w.z); return true; })()`);
  await ev('__t.ff(2)');
  const off = await ev(`__t.walk('KeyW', Math.PI, 60, () => { const p = game.player; return !__t.train().isPlayerRiding() && p.pos.z > 4.5; })`);
  log('  step off', JSON.stringify(off));
  check('stepped off through the open door onto platform 1 (feet 92 on the platform floor, alive, not riding)', !off.riding && off.z > 3.5 && Math.abs(off.y - floorY) < 0.01 && !off.dead && /deck|durasteel|plate|glow|slab|stripe/i.test(off.below), `at ${off.x},${off.y},${off.z} on ${off.below}`);
  await ev(`game.player.teleport(${doorXs[2] + 1}, ${floorY}, 6.5); game.player.yaw = 0; game.player.pitch = 0.05; true`);
  await page.sleep(1200);
  await shot('02_terminus_platform1_docked_train');

  // ------------------------------------------------------------------ 6. departure for the frontier seals the screen
  log('\n== Departure for the frontier ==');
  const stillDocked = await ev('(() => { const s = __t.train().state; return s.phase === "dwell" && s.phaseT < 19; })()');
  check('still inside the terminus dwell after the platform checks', stillDocked, '');
  await ev(`game.player.teleport(${doorXs[3] + 1}, ${floorY}, 7.5); game.player.yaw = 0; true`);
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  const dep = await ev('(() => { const s = __t.train().state; return { phase: s.phase, dest: s.dest.name, dir: s.dir, x0: s.x0, msgs: game.hud.messages.map((m) => m.text).slice(-2) }; })()');
  check('the train leaves the terminus westward for the frontier, announced', dep.phase === 'launch' && dep.dest === F.name && dep.dir === -1 && dep.msgs.some((m) => new RegExp(`departing for ${F.name}`, 'i').test(m)), dep.msgs.slice(-1)[0]);
  await ev(`__t.ff(400, () => !__t.train().state.doorsOpen)`);
  await ev('__t.ff(2)');
  const sealed = await ev(`(() => { const s = __t.train().state; return Object.assign(__t.screen(${JSON.stringify(doorXs)}), { x0: s.x0, v: s.v, doorsOpen: s.doorsOpen, riding: __t.train().isPlayerRiding() }); })()`);
  check('once the doors seal the platform screen closes again (glass at the door columns), the rider left behind on the platform', !sealed.doorsOpen && sealed.doors.every((ids) => ids.every((id) => id === B.STEEL_GLASS)) && !sealed.riding && sealed.x0 < T.dockX0, `x0 ${sealed.x0.toFixed(1)} v ${sealed.v.toFixed(1)}`);

  // ------------------------------------------------------------------ 7. the stairs: platform -> hall -> platform
  log('\n== Stairs to the hall ==');
  await ev(`game.player.teleport(${stair.x0 + 11.5}, ${floorY}, ${stair.z0 + 1}); true`);
  await ev('__t.ff(2)');
  const up = await ev(`__t.walk('KeyW', Math.PI / 2, 140, () => game.player.pos.x < ${stair.x0 - 1.5})`);
  log('  up', JSON.stringify(up));
  check('walked west up the ten half steps from platform 1 (92) into the hall (97), no jump, no damage', Math.abs(up.y - DECK_Y) < 0.01 && up.x < stair.x0 - 1 && up.hp === 20 && !up.dead, `at ${up.x},${up.y},${up.z} after ${up.used} ticks`);
  await ev(`game.player.pitch = -0.35; true`);
  await page.sleep(1000);
  await shot('03_stair_head_in_the_hall');
  const down = await ev(`__t.walk('KeyW', -Math.PI / 2, 140, () => game.player.pos.x > ${stair.x0 + 11.5})`);
  log('  down', JSON.stringify(down));
  check('walked east back down onto the platform (92), alive', Math.abs(down.y - floorY) < 0.01 && down.x > stair.x0 + 10 && !down.dead, `at ${down.x},${down.y},${down.z}`);
  const errs = page.exceptions;
  check('no page exceptions during the run', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) {
  failed++;
  log('FAIL (script error)', e.stack || e.message);
} finally {
  page.close();
}
log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
