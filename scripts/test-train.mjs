// Space train v2 checks (rubric 10 + the rubric 04 regressions):
//   node scripts/test-train.mjs [--url http://localhost:5201] [--shots /tmp/train-shots] [--no-browser]
// Node part (no browser): the model (hull materials, canopy band, doors vs. DOOR_OFFSETS, clear aisle, seats, nose
// steps) and the eased motion (identical to the timetable at the phase boundaries, zero acceleration at ramp ends).
// Browser part (CDP, one headless Chrome): draw calls, the maglev hum spectrum (dominant frequency < 400 Hz, rising
// with speed), the sliding door animation + chime, doorway clearing, a full ride frontier -> Coruscant with the player
// inside asserting the player stays in the car, reload while riding, shove on the track, hop-on / hop-off through the
// open doors of the slowly rolling train.
import { mkdirSync } from 'node:fs';
import { launchPage } from './cdp.mjs';
import { initBlocks, BLOCKS, B, SHAPE } from '../src/blocks.js';
import { buildTrainGrid, smoothState } from '../src/vehicles/train.js';
import { trainState, ROUTE, CARS, CAR_LENGTH, DOOR_OFFSETS, TRAIN_LENGTH, TRAIN_HEIGHT, SCHEDULE, RIDE_TIME, PERIOD } from '../src/vehicles/route.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = opt('--url', 'http://localhost:5201');
const shots = opt('--shots', '/tmp/train-shots');
const noBrowser = args.includes('--no-browser');
mkdirSync(shots, { recursive: true });

let passed = 0, failed = 0;
const log = (...a) => console.log(...a);
function check(name, cond, detail = '') {
  if (cond) { passed++; log(`PASS ${name}${detail ? '  (' + detail + ')' : ''}`); }
  else { failed++; log(`FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); }
}

// ================================================================================================ node: the model
initBlocks();
const model = buildTrainGrid();
const g = model.grid;
const W = ROUTE.trainWidth;
check('grid matches the route constants', g.w === TRAIN_LENGTH && g.h === TRAIN_HEIGHT && g.d === W, `${g.w}x${g.h}x${g.d}`);

// exterior: every non-air cell on the outer shell (z = 0, z = 5, y = 0, y = 5) and every extra box on the outside
const name = (id) => (BLOCKS[id] ? BLOCKS[id].name : 'air');
const woodOrWool = (id) => id !== 0 && /wood|plank|wool|log|fence|hay|crate|barrel/i.test(name(id));
{
  const bad = [];
  for (let x = 0; x < g.w; x++) for (let y = 0; y < g.h; y++) for (let z = 0; z < g.d; z++) {
    const id = g.get(x, y, z);
    if (!id) continue;
    if ((z === 0 || z === W - 1 || y === 0 || y === g.h - 1) && woodOrWool(id)) bad.push([x, y, z, name(id)]);
  }
  for (const e of model.extras) {
    const outside = e.z1 <= 1.0 || e.z0 >= 5.0 || e.y1 <= 1.0 || e.y0 >= 5.0;
    if (outside && woodOrWool(e.id || 0)) bad.push(['extra', e.x0, e.y0, e.z0, name(e.id)]);
  }
  check('no wood / wool on the exterior (shell cells + outside extras)', bad.length === 0, bad.length ? JSON.stringify(bad.slice(0, 4)) : 'clean');
}
// canopy band: glass in the wall row y = 3 on both sides of every passenger car body (between the seams)
{
  let glass = 0, wallCells = 0;
  for (const car of CARS) {
    if (car.kind === 'engine') continue;
    for (let l = 1; l < CAR_LENGTH - 1; l++) { wallCells++; if (g.get(car.x0 + l, 3, 0) === B.STEEL_GLASS) glass++; }
  }
  check('continuous glass canopy band on the north wall of the cars', glass / wallCells > 0.6, `${glass}/${wallCells} glass cells at y=3`);
}
// plating + seams
{
  let plate = 0, other = 0;
  for (let x = 0; x < g.w; x++) for (let y = 1; y <= 4; y++) { const id = g.get(x, y, 0); if (!id || id === B.STEEL_GLASS) continue; if (id === B.IRON_BLOCK || id === B.CHROME || id === B.PLASTER || id === B.DURASTEEL) plate++; else other++; }
  check('white / chrome plating dominates the north wall', plate > other * 3, `plating ${plate}, other ${other}`);
  const seams = model.extras.filter((e) => e.id === B.PANEL_BLACK || e.id === B.DURASTEEL_DARK).filter((e) => e.y1 - e.y0 > 2);
  check('dark panel seams every 3-4 blocks (>= 1 per 4 blocks of side wall)', seams.length >= TRAIN_LENGTH / 4, `${seams.length} seams`);
}
// doors line up with DOOR_OFFSETS: those cells are air (open) 2 high on the platform wall, the pockets beside are opaque
{
  const bad = [];
  const set = new Set(model.doors.map(([x, y, z]) => `${x},${y},${z}`));
  for (const car of CARS) for (const dx of DOOR_OFFSETS[car.kind]) for (let k = 0; k < 2; k++) for (let y = 2; y <= 3; y++) {
    const x = car.x0 + dx + k;
    if (g.get(x, y, W - 1) !== 0 || !set.has(`${x},${y},${W - 1}`)) bad.push([x, y]);
  }
  check('doorways at DOOR_OFFSETS on the platform wall (open at build time, registered)', bad.length === 0 && model.doors.length === 2 * 2 * 2 * 4, `${model.doors.length} door cells`);
  check('two sliding leaves per doorway (west + east), each with a lit edge', model.leaves.west.length === model.leaves.east.length && model.leaves.west.length === 3 * model.doors.length / 4, `${model.leaves.west.length} west parts`);
}
// walkable aisle: the two middle rows are air for 2 blocks from the cab bulkhead to the observation bench
{
  const bad = [];
  const x0 = CARS[0].x0 + 6, x1 = CARS[CARS.length - 1].x0 + 11;
  for (let x = x0; x <= x1; x++) for (const z of [2, 3]) for (const y of [2, 3]) if (g.get(x, y, z) !== 0) bad.push([x, y, z, name(g.get(x, y, z))]);
  check('aisle clear 2 high end to end (cab to rear bench)', bad.length === 0, bad.length ? JSON.stringify(bad.slice(0, 3)) : `${x1 - x0 + 1} columns`);
  let floor = 0; for (let x = x0; x <= x1; x++) for (const z of [2, 3]) if (g.get(x, 1, z) !== 0) floor++;
  check('solid floor under the whole aisle', floor === (x1 - x0 + 1) * 2, `${floor}`);
}
// seats: two rows (z = 1 and z = 4) of half slabs in every passenger car with cushions
{
  let north = 0, south = 0;
  for (const car of CARS) { if (car.kind === 'engine') continue; for (let l = 0; l < CAR_LENGTH; l++) { if (g.get(car.x0 + l, 2, 1) === B.STONE_BRICK_SLAB) north++; if (g.get(car.x0 + l, 2, 4) === B.STONE_BRICK_SLAB) south++; } }
  const cushions = model.extras.filter((e) => e.id === B.BLUE_WOOL).length;
  check('two seat rows per car (slabs at z=1 and z=4, wool cushions inside only)', north >= 20 && south >= 20 && cushions >= north + south, `north ${north}, south ${south}, cushions ${cushions}`);
  const poles = model.extras.filter((e) => e.id === B.CHROME && e.y1 - e.y0 >= 2.5);
  check('grab poles (chrome, >= 2.5 high)', poles.length >= 16, `${poles.length}`);
  const holos = []; for (let x = 0; x < g.w; x++) for (let z = 0; z < g.d; z++) if (g.get(x, 4, z) === B.HOLO_SIGN) holos.push(x);
  check('holo panel over every gangway opening (both ends of every car)', new Set(holos).size >= 2 * CARS.length - 1, `${new Set(holos).size} columns`);
  check('holo display quads: one per car end + one over every door (outside)', model.displays.length >= 2 * CARS.length - 1 + model.doors.length / 4, `${model.displays.length}`);
}
// nose: the cab car steps up over >= 5 blocks (roof height rises monotonically from the tip)
{
  const top = (x) => { for (let y = g.h - 1; y >= 0; y--) if (g.get(x, y, 3) !== 0 || g.get(x, y, 2) !== 0) return y + 1; return 0; };
  const heights = []; for (let l = 0; l < 10; l++) heights.push(top(CARS[0].x0 + l));
  let steps = 0; for (let i = 1; i < heights.length; i++) { if (heights[i] < heights[i - 1]) steps = -100; else if (heights[i] > heights[i - 1]) steps++; }
  check('stepped nose: roof rises monotonically over >= 5 blocks with >= 3 steps', steps >= 3 && heights.indexOf(g.h) >= 5, heights.join(','));
  const cab = [];
  for (let z = 1; z <= 4; z++) cab.push(g.get(CARS[0].x0 + 5, 2, z));
  check('driver console behind the windshield', cab.every((id) => id === B.CONSOLE) && g.get(CARS[0].x0 + 5, 3, 2) === B.STEEL_GLASS, cab.map(name).join(','));
}
// emissive dressing
{
  const glow = (id) => model.extras.filter((e) => e.id === id && e.glow);
  const blue = glow(B.GLOW_PANEL_BLUE), white = glow(B.GLOW_PANEL), red = glow(B.PANEL_RED);
  const skirt = blue.filter((e) => e.y1 <= 1.0).length, roof = blue.filter((e) => e.y0 >= 5.0).length;
  check('blue light strips along the skirts and the roofline (pulsing)', skirt >= 2 * CARS.length && roof >= 2 * CARS.length && blue.every((e) => e.glow[0] > 0), `skirt ${skirt}, roof ${roof}`);
  check('white headlights + red tail lights at both ends, direction-grouped', white.filter((e) => e.glow[2] === 1).length >= 2 && white.filter((e) => e.glow[2] === 2).length >= 2 && red.length >= 2 && red.every((e) => e.glow[0] > 1), `white ${white.length}, red ${red.length}`);
  check('lit floor guide strip along the aisle', model.extras.some((e) => e.id === B.GLOW_PANEL_BLUE && e.glow && e.y1 <= 2.05 && e.x1 - e.x0 > 40), '');
}

// ================================================================================================ node: motion
{
  const F = ROUTE.frontier.dockX0;
  const at = (t) => smoothState(trainState(Math.round(t * 20)));
  const raw = (t) => trainState(Math.round(t * 20));
  const boundaries = [0, SCHEDULE.dwell, SCHEDULE.dwell + SCHEDULE.accel, SCHEDULE.dwell + RIDE_TIME - SCHEDULE.accel, SCHEDULE.dwell + RIDE_TIME, PERIOD - 1e-9];
  // (the boundaries are not on tick multiples: within one tick of them the eased speed may differ by up to acc * dt)
  const dx = boundaries.map((t) => Math.abs(at(t).x0 - raw(t).x0)), dv = boundaries.map((t) => Math.abs(at(t).v - raw(t).v));
  check('eased motion equals the timetable at every phase boundary', dx.every((d) => d < 0.01) && dv.every((d) => d < SCHEDULE.vmax / SCHEDULE.accel * 0.05), `dx ${dx.map((d) => d.toExponential(1)).join(',')} dv ${dv.map((d) => d.toFixed(3)).join(',')}`);
  // inside the accel ramp: monotone, bounded by the raw ramp's endpoints, and the ends are jerk-limited (a -> 0)
  const t0 = SCHEDULE.dwell;
  let mono = true, prev = F;
  for (let t = t0; t <= t0 + SCHEDULE.accel; t += 0.05) { const x = at(t).x0; if (x < prev - 1e-9) mono = false; prev = x; }
  check('eased accel ramp is monotone', mono, '');
  const accAt = (t) => (at(t + 0.05).v - at(t - 0.05).v) / 0.1;
  const aStart = Math.abs(accAt(t0 + 0.1)), aMid = Math.abs(accAt(t0 + SCHEDULE.accel / 2)), aEnd = Math.abs(accAt(t0 + SCHEDULE.accel - 0.1));
  const ACC = SCHEDULE.vmax / SCHEDULE.accel;
  check('jerk-limited: acceleration ~0 at the ramp ends, peaks mid-ramp (S-curve)', aStart < 0.3 * ACC && aEnd < 0.3 * ACC && aMid > 1.3 * ACC && aMid < 1.6 * ACC, `a(start)=${aStart.toFixed(2)} a(mid)=${aMid.toFixed(2)} a(end)=${aEnd.toFixed(2)} vs const ${ACC.toFixed(2)}`);
  const rawMid = raw(t0 + 4), eased = at(t0 + 4);
  check('doorsOpen and phases come from the raw timetable', eased.doorsOpen === rawMid.doorsOpen && eased.phase === rawMid.phase && eased.rawX0 === rawMid.x0, `x0 eased ${eased.x0.toFixed(2)} raw ${rawMid.x0.toFixed(2)}`);
}

if (noBrowser) { log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); }

// ================================================================================================ browser
const F = ROUTE.frontier, C = ROUTE.coruscant;
const CAR = CARS[1];                                   // the player rides the first passenger car
const aisleZ = ROUTE.trainZ0 + 2.5;                    // between the seat rows (grid z 2..3 -> world -1..0)
const floorY = ROUTE.floorY;
const profile = `/tmp/chrome-train-${process.pid}`;
const startUrl = `${base}/?x=${F.dockX0 + CAR.x0 + 7}&y=${floorY}&z=${aisleZ}&yaw=-90&pitch=0&time=0.5&quality=light&rd=6&fresh=1&mode=survival`;
log(`\nlaunching ${startUrl}`);
let page = await launchPage(startUrl, { profile });
let ev = (js) => page.evaluate(js);
const shot = async (n) => { const p = `${shots}/${n}.png`; await page.screenshot(p); log(`  screenshot ${p}`); };

const HELPERS = `
window.__t = {
  frame: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  train: () => game.vehicles.list.find((v) => v.name === 'space_train'),
  play() { game.input.locked = true; if (game.hud.screen) game.hud.screen = null; },
  // player position in train grid space
  local() { const t = this.train(), p = game.player.pos; const l = t.worldToGrid(p.x, p.y, p.z); return { x: +l.x.toFixed(3), y: +l.y.toFixed(3), z: +l.z.toFixed(3) }; },
  // fixed-step fast forward (vehicles + game tick, like the loop) for n ticks or until until() is truthy
  ff(ticks, until) { this.play(); for (let i = 0; i < ticks; i++) { game.vehicles.tick(); game.tick(true); if (until && until(i)) return i + 1; } return ticks; },
  // ride until pred() while recording the player's local position; returns bounds violations / drift
  ride(maxTicks, pred, box) {
    const t = this.train(), p = game.player; const start = this.local(); let worst = 0, viol = [], ticks = 0, offFloor = 0, notRiding = 0;
    for (let i = 0; i < maxTicks; i++) {
      game.vehicles.tick(); game.tick(true); ticks++;
      const l = t.worldToGrid(p.pos.x, p.pos.y, p.pos.z);
      const drift = Math.hypot(l.x - start.x, l.z - start.z); if (drift > worst) worst = drift;
      if (l.x < box.x0 || l.x >= box.x1 || l.z < box.z0 || l.z >= box.z1) { if (viol.length < 3) viol.push({ i, l: [l.x.toFixed(2), l.y.toFixed(2), l.z.toFixed(2)] }); }
      if (Math.abs(l.y - 2) > 0.02) offFloor++;
      if (!t.isPlayerRiding()) notRiding++;
      if (pred()) break;
    }
    return { ticks, worst: +worst.toFixed(4), viol, offFloor, notRiding, start, end: this.local(), info: t.info() };
  },
  async spectrum(ms) {
    const a = game.audio, ctx = a.ctx, an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.5;
    const ids = ['trainHum', 'trainHumHi', 'trainWind'], nodes = [];
    for (const id of ids) { const l = a.loops && a.loops[id]; if (l) { const n = l.pan || l.gain; n.connect(an); nodes.push(n); } }
    await this.wait(ms);
    const d = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(d);
    const hz = (i) => i * ctx.sampleRate / an.fftSize;
    let best = 1, low = 0, total = 0;
    for (let i = 1; i < d.length; i++) { if (d[i] > d[best]) best = i; const p = Math.pow(10, d[i] / 10); total += p; if (hz(i) < 400) low += p; }
    for (const n of nodes) n.disconnect(an);
    return { peakHz: +hz(best).toFixed(1), peakDb: +d[best].toFixed(1), below400: +(low / total).toFixed(3), loops: nodes.length, state: ctx.state, t: +ctx.currentTime.toFixed(2), stats: this.train().trainAudio.stats };
  },
};
true`;

try {
  await page.waitForGame(180000);
  await ev(HELPERS);
  await page.sleep(1500);

  // ------------------------------------------------------------------ 1. docked at the frontier: draws, boards, hum
  log('\n== Docked at the frontier ==');
  let info = await ev('__t.train().info()');
  check('train docked with open doors at load', info.phase === 'dwell' && info.at === F.name && info.doorsOpen, `cycleT ${info.cycleT.toFixed(1)} s`);
  check('player rides the train (standing in the aisle)', info.riding, JSON.stringify(await ev('__t.local()')));
  check('train draw calls <= 6 (hull, 2 door leaf meshes, boards, station boards)', info.draws <= 6, `${info.draws} draws, ${info.faces} faces, ${info.cells} cells`);
  const boards = await ev(`(() => { const t = __t.train(); return { train: t.displayMesh ? t.displayMesh.userData.faces : 0, station: t.stationMesh ? t.stationMesh.userData.faces : 0, text: t.display && t.display.lastKey }; })()`);
  check('holo boards drawn (train + station departure displays counting down)', boards.train > 0 && boards.station >= 6 && /DEPARTS \d+:\d\d/.test(boards.text), JSON.stringify(boards).slice(0, 160));
  await ev('game.audio.resume(); true');
  await page.sleep(1500);
  let spec = await ev('__t.spectrum(1200)');
  log('  docked spectrum', JSON.stringify(spec));
  const audioOk = spec.state === 'running' && spec.loops === 3;
  check('audio context running with the three hum loops', audioOk, `state ${spec.state}, loops ${spec.loops}`);
  check('maglev hum docked: dominant frequency < 400 Hz (~80 Hz fundamental)', spec.peakHz < 400 && spec.below400 > 0.8, `peak ${spec.peakHz} Hz, ${(spec.below400 * 100).toFixed(0)}% of the energy < 400 Hz`);
  const dockedPeak = spec.peakHz;
  await shot('01_docked_interior');

  // ------------------------------------------------------------------ 2. departure: standing in the doorway
  log('\n== Departure: sliding doors, chime, doorway clearing ==');
  // stand in the near doorway (inner half), so the seal nudges us back inside
  const doorX = F.dockX0 + CAR.x0 + DOOR_OFFSETS[CAR.kind][0] + 1, doorZ = ROUTE.trainZ0 + W - 1;
  await ev(`game.player.teleport(${doorX}, ${floorY}, ${doorZ + 0.3}); game.player.flying = false; game.player.yaw = 0; true`);
  await ev('__t.ff(2)');
  check('player standing in the doorway cell rides too (interior includes the doorways)', await ev('__t.train().isPlayerRiding()'), JSON.stringify(await ev('__t.local()')));
  const chimes0 = await ev('__t.train().trainAudio.stats.chimes');
  // fast-forward to the end of the dwell, then run in real time through the door seal (door animation is dt based)
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  info = await ev('__t.train().info()');
  check('train departed (accel phase), doors still open below hop speed', info.phase === 'accel' && info.doorsOpen, `v ${info.v.toFixed(2)}`);
  const hudBefore = await ev('game.hud.messages.map((m) => m.text)');
  check('departure announced in chat', hudBefore.some((m) => /departing/i.test(m)), hudBefore.slice(-2).join(' | '));
  const anim = await ev(`(async () => {
    const t = __t.train(), out = [];
    __t.play();
    const t0 = performance.now();
    while (t.state.doorsOpen && performance.now() - t0 < 12000) await __t.wait(50);
    const sealAt = performance.now();
    for (let i = 0; i < 16; i++) { out.push({ ms: Math.round(performance.now() - sealAt), a: +t.doorAnim.toFixed(3) }); await __t.wait(60); }
    return { sealed: !t.state.doorsOpen, v: t.state.v, samples: out, local: __t.local(), riding: t.isPlayerRiding(), msgs: game.hud.messages.map((m) => m.text).slice(-4) };
  })()`);
  log('  door animation samples', JSON.stringify(anim.samples));
  const decreasing = anim.samples.every((s, i) => i === 0 || s.a <= anim.samples[i - 1].a + 1e-6);
  const closedBy = anim.samples.find((s) => s.a === 0);
  check('doors seal at hop speed; leaves slide shut over ~0.6 s (monotone, 0 within 0.45..1.2 s)', anim.sealed && decreasing && closedBy && closedBy.ms >= 450 && closedBy.ms <= 1200 && anim.samples[0].a > 0.5, `sealed at v ${anim.v.toFixed(1)}, closed after ${closedBy ? closedBy.ms : '-'} ms`);
  check('doorway clearing: nudged inside the car and still riding', anim.riding && anim.local.z < W - 1 && anim.local.z >= 1 && anim.msgs.some((m) => /mind the doors/i.test(m)), `${JSON.stringify(anim.local)} ${anim.msgs.slice(-1)}`);
  const chimes1 = await ev('__t.train().trainAudio.stats.chimes');
  check('door chime played on the seal', chimes1 > chimes0, `${chimes0} -> ${chimes1}`);
  await shot('02_doors_sealed_inside');

  // ------------------------------------------------------------------ 3. the ride: first half, then hum at speed
  log('\n== Ride frontier -> Coruscant with the player inside ==');
  // (re)position in the aisle of the car at the train's current x
  await ev(`(() => { const t = __t.train(); const w = t.gridToWorld(${CAR.x0 + 7}, 2, 2.5); game.player.teleport(w.x, w.y, w.z); game.player.yaw = -Math.PI / 2; return true; })()`);
  await ev('__t.ff(2)');
  const box = { x0: CAR.x0, x1: CAR.x0 + CAR_LENGTH, z0: 1, z1: W };
  const mid = (F.dockX0 + C.dockX0) / 2;
  let ride = await ev(`__t.ride(${Math.ceil(RIDE_TIME * 20)}, () => __t.train().state.x0 >= ${mid}, ${JSON.stringify(box)})`);
  log('  first half', JSON.stringify({ ticks: ride.ticks, worst: ride.worst, viol: ride.viol, offFloor: ride.offFloor, notRiding: ride.notRiding, x0: ride.info.x0.toFixed(1), v: ride.info.v.toFixed(1), preload: ride.info.preload }));
  check('first half: player stays inside the car bounds every tick', ride.viol.length === 0 && ride.notRiding === 0, `${ride.ticks} ticks, ${ride.viol.length} violations`);
  check('first half: no drift, feet on the floor (carry is exact)', ride.worst < 0.05 && ride.offFloor === 0, `worst drift ${ride.worst}`);
  check('cruising at vmax mid-route', ride.info.phase === 'cruise' && Math.abs(ride.info.v - SCHEDULE.vmax) < 1e-6, `v ${ride.info.v}`);
  check('chunks preloaded ahead of the ride', ride.info.preload.chunks > 20, `${ride.info.preload.chunks} chunks, ${ride.info.preload.ms.toFixed(0)} ms`);
  // real-time frames so the audio follows the speed, then the spectrum at cruise
  await page.sleep(1500);
  spec = await ev('__t.spectrum(1200)');
  log('  cruise spectrum', JSON.stringify(spec));
  check('maglev hum at speed: dominant frequency still < 400 Hz and above the docked pitch', spec.peakHz < 400 && spec.peakHz > dockedPeak * 1.3 && spec.below400 > 0.7, `docked ${dockedPeak} Hz -> cruise ${spec.peakHz} Hz, hum target ${spec.stats.hum.toFixed(0)} Hz`);
  const pulse = await ev('(() => { const u = __t.train().material.uniforms; return { pulse: u.uPulse.value, time: u.uTime.value, headW: u.uHeadWest.value, headE: u.uHeadEast.value, span: u.uLightSpan.value }; })()');
  check('shader uniforms: strips pulse at full speed (uPulse = +1 eastbound), east head lights on', Math.abs(pulse.pulse - 1) < 1e-6 && pulse.time > 0 && pulse.headE === 1 && pulse.headW === 0, JSON.stringify(pulse));
  await shot('03_cruise_interior');

  // ------------------------------------------------------------------ 4. reload while riding
  log('\n== Reload while riding ==');
  const before = await ev('(() => { game.persistNow(); return { local: __t.local(), tick: game.vehicles.tickCount, x0: __t.train().state.x0 }; })()');
  await ev(`window.__marker = 1; location.href = ${JSON.stringify(base + '/?time=0.5&quality=light&rd=6&mode=survival')}; true`);
  for (let i = 0; i < 100; i++) { const gone = await ev('typeof window.__marker === "undefined"').catch(() => true); if (gone) break; await page.sleep(200); }
  await page.waitForGame(180000);
  await ev(HELPERS);
  await ev('game.audio.resume(); true');
  await page.sleep(1200);
  const after = await ev('(() => { const t = __t.train(); return { local: __t.local(), riding: t.isPlayerRiding(), tick: game.vehicles.tickCount, x0: t.state.x0, phase: t.state.phase, y: game.player.pos.y }; })()');
  log('  before', JSON.stringify(before), 'after', JSON.stringify(after));
  const dl = Math.hypot(after.local.x - before.local.x, after.local.z - before.local.z);
  check('after the reload the player is still aboard, in the same spot of the same car', after.riding && dl < 0.6 && Math.abs(after.local.y - 2) < 0.05, `local delta ${dl.toFixed(2)}, phase ${after.phase}`);
  check('the train resumed from the saved tick (not stranding the rider)', Math.abs(after.tick - before.tick) < 20 * 15, `tick ${before.tick} -> ${after.tick}`);

  // ------------------------------------------------------------------ 5. second half to Coruscant
  // fast-forward through the cruise and most of the braking, then the last seconds in real time (frames: the
  // listener follows the player, so the arrival announcement plays)
  ride = await ev(`__t.ride(${Math.ceil(RIDE_TIME * 20) + 200}, () => { const s = __t.train().state; return s.phase === 'decel' && Math.abs(s.v) < 4; }, ${JSON.stringify(box)})`);
  log('  second half', JSON.stringify({ ticks: ride.ticks, worst: ride.worst, viol: ride.viol, offFloor: ride.offFloor, notRiding: ride.notRiding, x0: ride.info.x0.toFixed(1), phase: ride.info.phase, v: ride.info.v.toFixed(2) }));
  check('second half: player stays inside the car bounds every tick through the cruise and the braking', ride.viol.length === 0 && ride.notRiding === 0 && ride.info.phase === 'decel', `${ride.ticks} ticks`);
  check('second half: no drift through braking', ride.worst < 0.05 && ride.offFloor === 0, `worst drift ${ride.worst}`);
  const arrived = await ev(`(async () => {
    const t = __t.train(), p = game.player; __t.play(); const t0 = performance.now(); let viol = 0;
    while (t.state.phase !== 'dwell' && performance.now() - t0 < 8000) { await __t.wait(100); const l = __t.local(); if (l.x < ${box.x0} || l.x >= ${box.x1} || l.z < 1 || l.z >= ${W}) viol++; }
    await __t.wait(800);
    return { x0: t.state.x0, phase: t.state.phase, at: t.state.at && t.state.at.name, doorsOpen: t.state.doorsOpen, blips: t.trainAudio.stats.blips, msgs: game.hud.messages.map((m) => m.text).slice(-3), anim: t.doorAnim, riding: t.isPlayerRiding(), viol, local: __t.local() };
  })()`);
  log('  arrival', JSON.stringify(arrived));
  check('arrived: docked exactly at Coruscant dockX0, rider still aboard in the car', arrived.phase === 'dwell' && arrived.at === C.name && Math.abs(arrived.x0 - C.dockX0) < 1e-6 && arrived.riding && arrived.viol === 0, `x0 ${arrived.x0}, local ${JSON.stringify(arrived.local)}`);
  check('arrival: doors sliding open, announcement blip + chat message', arrived.doorsOpen && arrived.anim > 0.5 && arrived.blips >= 1 && arrived.msgs.some((m) => /arriving/i.test(m)), `doorAnim ${arrived.anim}, blips ${arrived.blips}`);
  await shot('04_arrived_coruscant');

  // ------------------------------------------------------------------ 6. shove: standing on the track as it departs
  log('\n== Shove ==');
  const shoveX = C.dockX0 - 12;   // west of the nose (the train leaves westward), on the deck between the rails
  await ev(`game.player.teleport(${shoveX}, ${ROUTE.deckY + 1}, ${ROUTE.z - 0.5}); game.player.flying = false; game.player.health = 20; true`);
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  const hp0 = await ev('game.player.health');
  const shoved = await ev(`(() => {
    const t = __t.train(), p = game.player; let overlaps = 0, contact = -1, minHp = p.health;
    for (let i = 0; i < 100; i++) { game.vehicles.tick(); game.tick(true); if (t.overlapsEntity(p.box)) overlaps++; if (contact < 0 && t.shoveTick.has(p)) contact = i; if (p.health < minHp) minHp = p.health; }
    const b = t.bounds; const pushed = p.pos.x < b.x0 || p.pos.y >= b.y1 - 0.01;
    return { overlaps, contact, pushed, minHp, hp: p.health, x: +p.pos.x.toFixed(1), y: +p.pos.y.toFixed(1), bx0: +b.x0.toFixed(1), by1: +b.y1.toFixed(1), v: +t.state.v.toFixed(1), dead: p.dead };
  })()`);
  log('  shove', JSON.stringify(shoved));
  check('shove: pushed ahead of the moving hull (or lifted onto the roof), never left inside it, hurt on contact', shoved.contact >= 0 && shoved.overlaps <= 2 && shoved.pushed && shoved.minHp < hp0 && !shoved.dead, `contact at tick ${shoved.contact}, hp ${hp0} -> ${shoved.minHp} (regenerated to ${shoved.hp}), overlaps ${shoved.overlaps}`);
  await ev(`game.player.teleport(${C.dockX0 + 40}, ${floorY}, ${ROUTE.platformZ0 + 3}); game.player.health = 20; true`);

  // ------------------------------------------------------------------ 7. hop on / off the slowly rolling train (frontier)
  log('\n== Hop on / hop off through the open doors while rolling slowly ==');
  // one block behind the platform screens, just east of a door of the docked train: that door reaches us about a
  // second after the departure, at walking pace. The frontier chunks were unloaded during the trip: teleport there
  // while the (empty) train is still on its way back and let the terrain stream in (real time)
  const hopX = F.dockX0 + CARS[2].x0 + DOOR_OFFSETS.passenger[0] + 3, hopZ = ROUTE.platformZ0 + 1.5;
  await ev(`game.player.teleport(${hopX}, ${floorY + 0.5}, ${hopZ}); game.player.flying = true; true`);
  for (let i = 0; i < 40; i++) { const ok = await ev(`(() => { const c = game.world.getChunk(Math.floor(${hopX} / 16), Math.floor(${hopZ} / 16)); return !!(c && c.generated && c.lit) && game.world.getBlockDef(${Math.floor(hopX)}, ${floorY - 1}, ${Math.floor(hopZ)}).solid; })()`); if (ok) break; await page.sleep(500); }
  await ev(`game.player.teleport(${hopX}, ${floorY}, ${hopZ}); game.player.yaw = 0; game.player.pitch = 0; game.player.flying = false; game.player.health = 20; true`);
  // ride the schedule (empty train) back to the frontier, then to its departure
  await ev(`__t.ff(${Math.ceil((RIDE_TIME + SCHEDULE.dwell) * 20) + 400}, () => { const s = __t.train().state; return s.phase === 'dwell' && s.at.name === ${JSON.stringify(F.name)}; })`);
  const standing = await ev(`(() => { const p = game.player; return { y: +p.pos.y.toFixed(2), x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), below: game.world.getBlockDef(Math.floor(p.pos.x), Math.floor(p.pos.y) - 1, Math.floor(p.pos.z)).name, phase: __t.train().state.phase, cycleT: +__t.train().state.cycleT.toFixed(1) }; })()`);
  check('standing on the frontier platform behind the screens as the train docks', Math.abs(standing.y - floorY) < 0.01 && standing.phase === 'dwell' && standing.cycleT < 2, JSON.stringify(standing));
  await ev(`__t.ff(${SCHEDULE.dwell * 20 + 40}, () => __t.train().state.phase !== 'dwell')`);
  // walk north (into the passing hull) until a doorway rolls by and takes us in, while the doors are still open
  const hop = await ev(`(() => {
    const t = __t.train(), p = game.player; game.input.keys.add('KeyW');
    let boarded = -1, v = 0;
    for (let i = 0; i < 20 * 5; i++) { game.vehicles.tick(); game.tick(true); if (t.isPlayerRiding() && t.worldToGrid(p.pos.x, p.pos.y, p.pos.z).z < ${W}) { boarded = i; v = t.state.v; break; } if (!t.state.doorsOpen) break; }
    game.input.keys.delete('KeyW');
    for (let i = 0; i < 4; i++) { game.vehicles.tick(); game.tick(true); }
    return { boarded, v: +v.toFixed(1), local: __t.local(), riding: t.isPlayerRiding(), doorsOpen: t.state.doorsOpen, x: +p.pos.x.toFixed(1) };
  })()`);
  log('  hop on', JSON.stringify(hop));
  check('hop-on: walked into a passing doorway of the rolling train and is carried', hop.boarded >= 0 && hop.riding && hop.local.z >= 1 && hop.local.z < W, `boarded after ${hop.boarded} ticks at v ${hop.v}`);
  // hop off: walk south out of the doorway before the doors seal
  const off = await ev(`(() => {
    const t = __t.train(), p = game.player; p.yaw = Math.PI; game.input.keys.add('KeyW');
    let left = -1;
    for (let i = 0; i < 20 * 4; i++) { game.vehicles.tick(); game.tick(true); if (!t.isPlayerRiding() && !t.overlapsEntity(p.box)) { left = i; break; } }
    game.input.keys.delete('KeyW');
    for (let i = 0; i < 40; i++) { game.vehicles.tick(); game.tick(true); }
    return { left, riding: t.isPlayerRiding(), z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2), x: +p.pos.x.toFixed(1), dead: p.dead, hp: p.health, doorsOpen: t.state.doorsOpen };
  })()`);
  log('  hop off', JSON.stringify(off));
  check('hop-off: stepped out onto the platform while rolling, alive and off the train', off.left >= 0 && !off.riding && off.z >= ROUTE.platformZ0 - 0.4 && !off.dead, `z ${off.z} y ${off.y} hp ${off.hp}`);
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
