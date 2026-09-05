#!/usr/bin/env node
import { chromium } from 'playwright';

// Check the synthesised sound without speakers: boot the app, wake audio with a
// real key press (a synthetic dispatchEvent carries no user activation, so the
// context would stay suspended), then drive `audio.update` with scripted states
// and read the Web Audio node parameters back through `audio.inspect()`.
//
//   node tools/audiocheck.mjs --url "http://127.0.0.1:5198/?quality=fast"
//   node tools/audiocheck.mjs --url ... --standalone
//
// `--standalone` skips the app boot and imports `/src/audio.js` straight off
// the dev server behind a stub debugAPI; the checker also falls back to that
// when the app fails to boot, since somebody else's broken module should not
// hide a sound regression.
//
// Asserts: the graph builds and the context runs; engine pitch and filter rise
// with rpm and fall back on an upshift; tyre and wind levels rise with speed;
// the surface moves the tyre filter; interior cameras close the exterior
// lowpass and lift the engine bus; night brings the crickets up; every cue
// fires; a 30 s scripted drive throws nothing and does not clip the master.

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5198/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const fmt = (v) => (typeof v === 'number' ? +v.toFixed(3) : v);

async function standalone() {
  const origin = new URL(base).origin;
  await page.goto(`${origin}/src/audio.js`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    const { createAudio } = await import('/src/audio.js');
    const audio = createAudio();
    // the same wake-up main.js does
    const wake = () => {
      if (!audio.enabled) audio.setEnabled(true);
    };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    window.debugAPI = { objects: { audio }, pause() {} };
  });
  errs.length = 0;
  console.log(`${el()} standalone: audio module loaded without the app`);
}

if (argv.includes('--standalone')) {
  await standalone();
} else {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
  const bootErr = await page.evaluate(() => window.__ERROR__ || null);
  if (bootErr) {
    console.log(`${el()} APP BOOT FAILED, falling back to standalone:\n  ${bootErr.split('\n')[0]}`);
    await standalone();
  } else {
    console.log(`${el()} booted`);
  }
}

// Before any gesture every call must be a no-op that does not throw.
const pre = await page.evaluate(() => {
  const a = window.debugAPI.objects.audio;
  const cam = { position: { x: 0, y: 2, z: -8 } };
  a.update(1 / 60, { speed: 5, throttle: 0.5, rpm: 0.5, surface: 'trail', timeOfDay: 'day', camera: cam, vehiclePos: { x: 0, y: 0, z: 0 } });
  const cued = a.cue('door');
  return { enabled: a.enabled, cued, insp: a.inspect() };
});
check('update/cue are safe before the gesture', !pre.enabled && pre.cued === false && pre.insp.built === false);

// Freeze the sim so the frame loop stops feeding the driver's own state in.
await page.evaluate(() => window.debugAPI.pause());
await page.keyboard.press('Slash');
await page.waitForFunction(() => window.debugAPI.objects.audio.inspect().contextState === 'running', null, { timeout: 5000 }).catch(() => {});
const a0 = await page.evaluate(() => window.debugAPI.objects.audio.inspect());
check('graph built after the gesture', a0.built && a0.enabled, `state=${a0.contextState} sr=${a0.sampleRate}`);
check('context is running', a0.contextState === 'running');
if (!a0.built) {
  console.log(`${el()} no graph, nothing more to check`);
  for (const e of errs.slice(0, 12)) console.log(e);
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(300);
const a1 = await page.evaluate(() => window.debugAPI.objects.audio.inspect());
check('context clock advances', a1.currentTime > a0.currentTime, `${fmt(a0.currentTime)} -> ${fmt(a1.currentTime)}`);

// Drive `update` for a stretch of frames with one state, let the smoothing
// settle in real time, then read the parameters.
async function hold(state, { frames = 30, settle = 550 } = {}) {
  await page.evaluate(
    ({ state, frames }) => {
      const a = window.debugAPI.objects.audio;
      const s = { ...state, camera: { position: state.camera }, vehiclePos: { x: 0, y: 0, z: 0 } };
      for (let i = 0; i < frames; i++) a.update(1 / 60, s);
    },
    { state, frames },
  );
  await page.waitForTimeout(settle);
  return page.evaluate(() => window.debugAPI.objects.audio.inspect());
}

const EXT = { x: 0, y: 2, z: -8 };
const INT = { x: 0.3, y: 1.6, z: -0.16 };

const idle = await hold({ speed: 0, throttle: 0, rpm: 0.09, surface: 'trail', timeOfDay: 'day', camera: EXT });
const rev = await hold({ speed: 12, throttle: 1, rpm: 0.85, surface: 'trail', timeOfDay: 'day', camera: EXT });
console.log(`${el()} idle`, JSON.stringify({ engine: idle.engine, tyre: idle.tyre, wind: idle.wind }, (k, v) => fmt(v)));
console.log(`${el()} rev `, JSON.stringify({ engine: rev.engine, tyre: rev.tyre, wind: rev.wind }, (k, v) => fmt(v)));

check('engine pitch rises with rpm', rev.engine.f0 > idle.engine.f0 * 2, `f0 ${fmt(idle.engine.f0)} -> ${fmt(rev.engine.f0)} Hz`);
check('engine harmonics track the fundamental', Math.abs(rev.engine.sub - rev.engine.f0 / 2) < 1.5, `sub ${fmt(rev.engine.sub)}`);
check('engine filter opens under load', rev.engine.filter > idle.engine.filter * 2, `${fmt(idle.engine.filter)} -> ${fmt(rev.engine.filter)} Hz`);
check('engine level rises with throttle', rev.engine.gain > idle.engine.gain, `${fmt(idle.engine.gain)} -> ${fmt(rev.engine.gain)}`);
check('idle is lumpy, not a pure tone', idle.engine.lump > 15 && idle.engine.comb > 0.03, `lump ${fmt(idle.engine.lump)}c comb ${fmt(idle.engine.comb)}`);
check('turbo whistle only under load', idle.engine.turbo < 0.002 && rev.engine.turbo > 0.01, `${fmt(idle.engine.turbo)} -> ${fmt(rev.engine.turbo)}`);
check('tyre level rises with speed', idle.tyre.gain < 0.01 && rev.tyre.gain > 0.2, `${fmt(idle.tyre.gain)} -> ${fmt(rev.tyre.gain)}`);
check('rumble rises with speed', rev.tyre.rumble > idle.tyre.rumble + 0.1, `${fmt(idle.tyre.rumble)} -> ${fmt(rev.tyre.rumble)}`);
check('wind rises with speed', idle.wind.gain < 0.005 && rev.wind.gain > 0.08, `${fmt(idle.wind.gain)} -> ${fmt(rev.wind.gain)}`);

// upshift: the driver drops rpm, the pitch has to follow it down quickly
const shift = await hold({ speed: 12, throttle: 1, rpm: 0.45, surface: 'trail', timeOfDay: 'day', camera: EXT }, { settle: 250 });
check('upshift drops the pitch', shift.engine.f0 < rev.engine.f0 - 25, `${fmt(rev.engine.f0)} -> ${fmt(shift.engine.f0)} Hz within 250 ms`);

const main = await hold({ speed: 12, throttle: 1, rpm: 0.85, surface: 'main', timeOfDay: 'day', camera: EXT }, { settle: 700 });
check('surface changes the tyre filter', main.tyre.filterFreq < rev.tyre.filterFreq * 0.5, `trail ${fmt(rev.tyre.filterFreq)} Hz Q${fmt(rev.tyre.filterQ)} -> main ${fmt(main.tyre.filterFreq)} Hz Q${fmt(main.tyre.filterQ)}`);
check('surface is tracked', rev.surface === 'trail' && main.surface === 'main');

const inside = await hold({ speed: 12, throttle: 1, rpm: 0.85, surface: 'main', timeOfDay: 'day', camera: INT });
check('interior camera detected', inside.interior === true && main.interior === false);
check('interior muffles exterior sources', inside.ext.filter < 1500 && main.ext.filter > 8000, `${fmt(main.ext.filter)} -> ${fmt(inside.ext.filter)} Hz`);
check('interior lifts the engine', inside.engine.bus > main.engine.bus * 1.15, `bus ${fmt(main.engine.bus)} -> ${fmt(inside.engine.bus)}`);
check('interior cuts the wind', inside.wind.gain < main.wind.gain * 0.5, `${fmt(main.wind.gain)} -> ${fmt(inside.wind.gain)}`);

const far = await hold({ speed: 12, throttle: 1, rpm: 0.85, surface: 'main', timeOfDay: 'day', camera: { x: 0, y: 4, z: -20 } });
check('engine falls off with distance outside', far.engine.bus < main.engine.bus * 0.7, `8 m ${fmt(main.engine.bus)} -> 20 m ${fmt(far.engine.bus)}`);

const night = await hold({ speed: 0, throttle: 0, rpm: 0.09, surface: 'trail', timeOfDay: 'night', camera: EXT }, { settle: 3000 });
check('night brings the crickets up', night.bed.cricket > 0.04 && idle.bed.cricket < 0.005, `${fmt(idle.bed.cricket)} -> ${fmt(night.bed.cricket)}`);
check('night floor is quieter', night.bed.floor < idle.bed.floor, `${fmt(idle.bed.floor)} -> ${fmt(night.bed.floor)}`);

// cues
const cueRes = await page.evaluate(async () => {
  const a = window.debugAPI.objects.audio;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  out.door = a.cue('door');
  await wait(12);
  out.doorLevel = a.inspect().cue.perc;
  await wait(400);
  out.indicator = a.cue('indicator') && a.cue('indicator', { tock: true });
  out.horn = a.cue('horn', { duration: 0.3 });
  await wait(80);
  out.hornLevel = a.inspect().cue.horn;
  await wait(500);
  out.lion = a.cue('lion');
  await wait(450);
  out.lionLevel = a.inspect().bed.lion;
  out.unknown = a.cue('nonsense');
  return out;
});
check('door cue fires', cueRes.door === true && cueRes.doorLevel > 0.05, `perc ${fmt(cueRes.doorLevel)}`);
check('indicator cue fires', cueRes.indicator === true);
check('horn cue fires', cueRes.horn === true && cueRes.hornLevel > 0.2, `horn ${fmt(cueRes.hornLevel)}`);
check('lion cue roars', cueRes.lion === true && cueRes.lionLevel > 0.12, `lion ${fmt(cueRes.lionLevel)}`);
check('unknown cue is rejected quietly', cueRes.unknown === false);

// A scripted drive: 30 s of sim at 60 Hz through four gears on both surfaces,
// both cameras, all three times of day, in bursts so the stone and bird
// schedulers fire and the compressor gets something to work on.
const drive = await page.evaluate(async () => {
  const a = window.debugAPI.objects.audio;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cam = { position: { x: 0, y: 2, z: -8 } };
  const s = { speed: 0, throttle: 1, rpm: 0.1, surface: 'trail', timeOfDay: 'day', camera: cam, vehiclePos: { x: 0, y: 0, z: 0 } };
  const ratios = [0, 0.16, 0.34, 0.58, 1.0];
  let peak = 0;
  let reduction = 0;
  let t = 0;
  const dt = 1 / 60;
  for (let burst = 0; burst < 30; burst++) {
    for (let i = 0; i < 60; i++) {
      t += dt;
      // a drive up through the gears and back down
      const cycle = (t % 15) / 15;
      const speed = cycle < 0.6 ? (cycle / 0.6) * 21 : ((1 - cycle) / 0.4) * 21;
      const rev = speed / 21;
      const gear = rev < 0.16 ? 1 : rev < 0.34 ? 2 : rev < 0.58 ? 3 : 4;
      s.speed = speed;
      s.throttle = cycle < 0.6 ? 1 : 0;
      s.rpm = Math.min(0.09 + (rev / ratios[gear]) * 0.78 + s.throttle * 0.08, 1.05);
      s.surface = t > 15 ? 'main' : 'trail';
      s.timeOfDay = t < 10 ? 'day' : t < 20 ? 'dusk' : 'night';
      cam.position.y = burst % 4 === 3 ? 1.6 : 2;
      cam.position.z = burst % 4 === 3 ? -0.1 : -8;
      a.update(dt, s);
    }
    if (burst === 9) a.cue('horn');
    if (burst === 19) a.cue('lion');
    await wait(60);
    const ins = a.inspect();
    if (ins.outputPeak > peak) peak = ins.outputPeak;
    if (ins.compressorReduction < reduction) reduction = ins.compressorReduction;
  }
  return { peak, reduction, final: a.inspect() };
});
check('scripted drive runs without throwing', errs.length === 0, errs.slice(0, 3).join(' | '));
check('master does not clip', drive.peak > 0.02 && drive.peak < 0.99, `peak ${fmt(drive.peak)} comp ${fmt(drive.reduction)} dB`);
check('compressor is a limiter, not the mix', drive.reduction > -8, `${fmt(drive.reduction)} dB worst-case reduction`);
const f = drive.final.fired;
check('stone hits scheduled', f.stone > 20, `${f.stone} stones in 30 s`);
check('birds and a distant lion scheduled', f.bird >= 2 && f.lion >= 1, `birds ${f.bird} hornbill ${f.hornbill} lion ${f.lion}`);
check('drive ended on the mainline at night', drive.final.surface === 'main' && drive.final.time === 'night');

// setEnabled(false) suspends, (true) resumes the same context
const toggled = await page.evaluate(async () => {
  const a = window.debugAPI.objects.audio;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  a.setEnabled(false);
  await wait(120);
  const off = a.inspect();
  a.setEnabled(true);
  await wait(200);
  const on = a.inspect();
  return { off: off.contextState, offEnabled: off.enabled, on: on.contextState, onEnabled: on.enabled };
});
check('setEnabled suspends and resumes', toggled.off === 'suspended' && !toggled.offEnabled && toggled.on === 'running' && toggled.onEnabled, `${toggled.off} -> ${toggled.on}`);

// With the real app, let the frame loop feed the graph from the live driver.
const live = await page.evaluate(async () => {
  const api = window.debugAPI;
  if (!api.resume) return null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const drv = api.objects.driver;
  drv.state.auto = true;
  const speed0 = drv.state.speed;
  api.resume();
  // Software rendering can take many seconds a frame, so wait for the sim to
  // have actually stepped rather than for a wall-clock guess.
  const t0 = performance.now();
  let frames = 0;
  while (performance.now() - t0 < 60000) {
    await wait(100);
    if (drv.state.speed !== speed0) frames++;
    if (frames >= 3) break;
  }
  await wait(400);
  api.pause();
  const ins = api.objects.audio.inspect();
  return { f0: ins.engine.f0, tyre: ins.tyre.gain, surface: ins.surface, speed: drv.state.speed, rpm: drv.state.rpm, stepped: frames > 0 };
});
if (live) {
  const want = 24 + (110 * Math.min(live.rpm, 1.05)) / 1.05;
  check(
    'live driver state reaches the graph',
    live.stepped && Number.isFinite(live.f0) && Math.abs(live.f0 - want) < want * 0.3 && live.surface === 'trail' && errs.length === 0,
    `speed ${fmt(live.speed)} rpm ${fmt(live.rpm)} -> f0 ${fmt(live.f0)} Hz (expect ~${fmt(want)}) tyre ${fmt(live.tyre)}`,
  );
}

console.log(`${el()} ${results.length - failed}/${results.length} passed`);
for (const e of errs.slice(0, 12)) console.log(e);
await browser.close();
process.exit(failed ? 1 : 0);
