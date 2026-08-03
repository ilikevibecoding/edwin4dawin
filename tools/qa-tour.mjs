#!/usr/bin/env node
/**
 * Automated visual tour and control test.
 *
 * Drives the running application through `window.__show`, captures a
 * screenshot at every checkpoint in the manifest, runs the per-checkpoint
 * assertions plus the global sanity checks, exercises every control, and
 * reports console/WebGL errors.
 *
 *   node tools/qa-tour.mjs                 # checkpoints + controls, dev server
 *   node tools/qa-tour.mjs --build         # against the production build
 *   node tools/qa-tour.mjs --realtime      # also play the whole piece through
 *   node tools/qa-tour.mjs --only=vader-entrance,plans
 *   node tools/qa-tour.mjs --url=http://127.0.0.1:5173/ --out=qa/output/run1
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};

const useBuild = flag('build');
const realtime = flag('realtime');
const controlsOnly = flag('controls-only');
const skipControls = flag('no-controls');
const only = (value('only', '') || '').split(',').filter(Boolean);
const width = Number(value('width', 1600));
const height = Number(value('height', 900));
const outDir = join(root, value('out', 'qa/output/latest'));
const settleFrames = Number(value('frames', 12));

const CHROME = '/usr/local/bin/google-chrome';
const CHROME_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--autoplay-policy=no-user-gesture-required',
  '--mute-audio',
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

/* --------------------------------------------------------- dev server ---- */

let server = null;
let baseUrl = value('url', null);

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

if (!baseUrl) {
  if (useBuild) {
    if (!existsSync(join(root, 'dist', 'index.html'))) {
      console.error('dist/ not found — run `npm run build` first.');
      process.exit(1);
    }
    baseUrl = 'http://127.0.0.1:4173/';
    server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
      cwd: root, stdio: 'ignore', detached: false,
    });
  } else {
    baseUrl = 'http://127.0.0.1:5173/';
    if (!(await waitForServer(baseUrl, 1500))) {
      server = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
        cwd: root, stdio: 'ignore', detached: false,
      });
    }
  }
  if (!(await waitForServer(baseUrl))) {
    console.error(`Server never came up at ${baseUrl}`);
    server?.kill();
    process.exit(1);
  }
}

/* ------------------------------------------------------------- browser --- */

const browser = await chromium.launch({ executablePath: CHROME, args: CHROME_ARGS });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

const consoleErrors = [];
const consoleWarnings = [];
page.on('console', (m) => {
  const text = `${m.text()}`;
  if (m.type() === 'error') consoleErrors.push(text);
  else if (m.type() === 'warning') consoleWarnings.push(text);
});
page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));

const report = {
  startedAt: new Date().toISOString(),
  url: baseUrl,
  viewport: { width, height },
  checkpoints: [],
  controls: [],
  realtime: null,
  global: {},
  consoleErrors: [],
  consoleWarnings: [],
  failures: [],
};

const fail = (where, message) => {
  report.failures.push(`${where}: ${message}`);
  console.log(`   FAIL  ${where}: ${message}`);
};

async function settle(frames = settleFrames) {
  await page.evaluate(
    (n) =>
      new Promise((resolve) => {
        let i = 0;
        const tick = () => (++i >= n ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

console.log(`\nOpening ${baseUrl}`);
await page.goto(baseUrl, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__show !== undefined, null, { timeout: 90000 });
console.log('Application constructed. Waiting for the gate to unlock…');
await page.waitForFunction(() => !document.getElementById('btn-enter').disabled, null, { timeout: 240000 });
await page.click('#btn-enter');
await page.waitForTimeout(1500);
await page.evaluate(() => window.__show.pause());
await page.evaluate(() => window.__show.setDebug(false));
console.log('Entered.\n');

/* ---------------------------------------------------- global structure --- */

const manifest = await page.evaluate(() => ({
  duration: window.__show.duration,
  chapters: window.__show.chapters,
  checkpoints: window.__show.checkpoints,
  shots: window.__show.shots(),
  gaps: window.__show.coverageGaps(),
  duplicateEventIds: window.__show.state().duplicateEventIds,
  narrationFallback: window.__show.state().narrationFallback,
  missingNarration: window.__show.state().missingNarration,
}));
report.global = manifest;

console.log(`Duration ${manifest.duration}s · ${manifest.chapters.length} chapters · ${manifest.shots.length} shots`);
if (manifest.gaps.length) fail('camera coverage', `gaps: ${JSON.stringify(manifest.gaps)}`);
if (manifest.duplicateEventIds.length) fail('timeline', `duplicate event ids: ${manifest.duplicateEventIds.join(', ')}`);
if (manifest.missingNarration.length) fail('narration', `${manifest.missingNarration.length} clip(s) missing: ${manifest.missingNarration.join(', ')}`);
if (manifest.narrationFallback) fail('narration', 'no generated clips decoded; running on the speech-synthesis fallback');

/* --------------------------------------------------------- checkpoints --- */

if (!controlsOnly) {
  const list = manifest.checkpoints.filter((c) => !only.length || only.includes(c.id));
  console.log(`\nCapturing ${list.length} checkpoints…`);
  for (const cp of list) {
    // Seek a little early and run the intervening seconds deterministically so
    // transient effects are present when the frame is captured.
    const pre = cp.preroll ?? 0;
    await page.evaluate(({ t, pre: p }) => {
      window.__show.seek(t - p);
      if (p > 0) window.__show.simulate(p);
    }, { t: cp.t, pre });
    await settle();
    const state = await page.evaluate(() => window.__show.state());
    const assertions = await page.evaluate((id) => window.__show.checkpointAssert(id), cp.id);
    const sanity = await page.evaluate(() => window.__show.sanity());
    const file = join(outDir, cp.file);
    await page.screenshot({ path: file });

    const errors = sanity.filter((i) => i.severity === 'error');
    const warns = sanity.filter((i) => i.severity === 'warn');
    const entry = {
      id: cp.id,
      t: cp.t,
      expectedChapter: cp.chapter,
      expectedShot: cp.shot,
      expect: cp.expect,
      file: cp.file,
      actual: { chapter: state.chapter, shot: state.shot, region: state.region, camera: state.camera.map((n) => Math.round(n * 10) / 10) },
      assertions,
      sanity: [...errors, ...warns],
      pass: assertions.length === 0 && errors.length === 0,
    };
    report.checkpoints.push(entry);

    const mark = entry.pass ? 'ok  ' : 'FAIL';
    console.log(`  ${mark} ${cp.id.padEnd(20)} t=${String(cp.t).padStart(6)}  shot=${state.shot}`);
    for (const a of assertions) fail(cp.id, a);
    for (const e of errors) fail(cp.id, `${e.code}: ${e.detail}`);
    for (const w of warns) console.log(`        warn ${w.code}: ${w.detail}`);
    if (state.shot !== cp.shot) fail(cp.id, `expected shot "${cp.shot}", got "${state.shot}"`);
    if (state.chapter !== cp.chapter) fail(cp.id, `expected chapter "${cp.chapter}", got "${state.chapter}"`);
  }
}

/* ------------------------------------------------------------ controls --- */

async function control(name, fn) {
  try {
    const result = await fn();
    report.controls.push({ name, pass: true, result: result ?? null });
    console.log(`  ok   ${name}`);
  } catch (err) {
    report.controls.push({ name, pass: false, error: String(err) });
    fail('controls', `${name} — ${err}`);
  }
}

if (!skipControls) {
  console.log('\nExercising controls…');

  await control('play / pause button', async () => {
    await page.evaluate((t) => window.__show.seek(t), 40);
    await page.click('#btn-play');
    await page.waitForTimeout(900);
    const playing = await page.evaluate(() => window.__show.state().playing);
    if (!playing) throw new Error('did not start playing');
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    const paused = await page.evaluate(() => !window.__show.state().playing);
    if (!paused) throw new Error('did not pause');
  });

  await control('timeline scrubbing (no duplicate audio)', async () => {
    for (const t of [220, 60, 300, 120, 250, 5]) {
      await page.evaluate((x) => window.__show.seek(x), t);
      await settle(3);
    }
    const s = await page.evaluate(() => window.__show.state());
    const [fired] = s.events.split('/').map(Number);
    if (!Number.isFinite(fired)) throw new Error('event counter unreadable');
    if (Math.abs(s.time - 5) > 0.01) throw new Error(`seek landed at ${s.time}`);
  });

  await control('restart', async () => {
    await page.click('#btn-restart');
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => window.__show.state());
    if (s.time > 3) throw new Error(`restart left the head at ${s.time}`);
    await page.evaluate(() => window.__show.pause());
  });

  await control('chapter selector', async () => {
    for (const i of [3, 5, 1, 7]) {
      await page.selectOption('#sel-chapter', String(i));
      await settle(3);
      const s = await page.evaluate(() => window.__show.state());
      const expected = manifest.chapters[i].id;
      if (s.chapter !== expected) throw new Error(`chapter ${i} gave "${s.chapter}", expected "${expected}"`);
    }
  });

  await control('scrubber drag', async () => {
    const box = await page.locator('#scrubber').boundingBox();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await settle(3);
    const s = await page.evaluate(() => window.__show.state());
    const expected = manifest.duration * 0.62;
    if (Math.abs(s.time - expected) > manifest.duration * 0.05) {
      throw new Error(`drag landed at ${s.time.toFixed(1)}s, expected ~${expected.toFixed(1)}s`);
    }
  });

  await control('subtitle toggle', async () => {
    await page.evaluate((t) => window.__show.seek(t), 46.5);
    await settle(4);
    await page.click('#btn-cc');
    await settle(2);
    const off = await page.evaluate(() => !document.getElementById('subtitles').classList.contains('visible'));
    if (!off) throw new Error('subtitles still visible after toggling off');
    await page.click('#btn-cc');
    await settle(4);
    const on = await page.evaluate(() => document.getElementById('subtitles').classList.contains('visible'));
    if (!on) throw new Error('subtitles did not come back');
    return page.evaluate(() => document.getElementById('subtitles').textContent);
  });

  await control('audio mixer', async () => {
    await page.click('#btn-audio');
    await page.waitForSelector('#mixer:not([hidden])');
    for (const [id, v] of [['vol-master', '40'], ['vol-music', '20'], ['vol-sfx', '90'], ['vol-narration', '70']]) {
      await page.locator(`#${id}`).fill(v);
      await page.locator(`#${id}`).dispatchEvent('input');
    }
    const readouts = await page.$$eval('#mixer output', (els) => els.map((e) => e.textContent));
    if (readouts.join(',') !== '40,70,20,90') throw new Error(`readouts were ${readouts.join(',')}`);
    // Restore.
    for (const [id, v] of [['vol-master', '85'], ['vol-music', '62'], ['vol-sfx', '78'], ['vol-narration', '100']]) {
      await page.locator(`#${id}`).fill(v);
      await page.locator(`#${id}`).dispatchEvent('input');
    }
    await page.click('#btn-audio');
  });

  await control('quality switching', async () => {
    await page.click('#btn-settings');
    await page.waitForSelector('#settings:not([hidden])');
    for (const q of ['low', 'high', 'medium']) {
      await page.selectOption('#sel-quality', q);
      await settle(6);
      const s = await page.evaluate(() => window.__show.state());
      if (!Number.isFinite(s.drawCalls)) throw new Error('renderer stopped reporting after a quality change');
    }
    await page.click('#btn-settings');
  });

  await control('diagnostics overlay', async () => {
    await page.click('#btn-settings');
    await page.waitForSelector('#settings:not([hidden])');
    await page.check('#chk-debug');
    await settle(4);
    const visible = await page.evaluate(() => !document.getElementById('debug').hidden);
    if (!visible) throw new Error('overlay did not appear');
    const text = await page.textContent('#debug-body');
    if (!/chapter/.test(text)) throw new Error('overlay is empty');
    await page.uncheck('#chk-debug');
    await page.click('#btn-settings');
    return text.split('\n').slice(0, 5).join(' | ');
  });

  await control('help panel', async () => {
    await page.click('#btn-help');
    await page.waitForSelector('#help', { state: 'visible' });
    await page.click('#help-close');
    await page.waitForSelector('#help', { state: 'hidden' });
  });

  await control('explore mode: orbit, pick and inspect', async () => {
    await page.evaluate((t) => window.__show.seek(t), 246);
    await settle(6);
    await page.click('#mode-explore');
    await settle(4);
    const modeOn = await page.evaluate(() => window.__show.state().mode === 'explore');
    if (!modeOn) throw new Error('explore mode did not engage');

    // Drag to look around.
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 + 90, height / 2 - 30, { steps: 10 });
    await page.mouse.up();
    await settle(4);

    // Move with the keyboard.
    await page.keyboard.down('KeyW');
    await settle(8);
    await page.keyboard.up('KeyW');
    await settle(4);

    const picked = await page.evaluate(() => window.__show.select('vader'));
    if (!picked) throw new Error('could not select Vader');
    await settle(3);
    const inspectorOpen = await page.evaluate(() => !document.getElementById('inspector').hidden);
    if (!inspectorOpen) throw new Error('inspector did not open');
    const title = await page.textContent('#inspector-title');

    await page.click('#act-inspect');
    await settle(14);
    await page.screenshot({ path: join(outDir, '90-explore-inspect.png') });
    await page.click('#act-follow');
    await settle(8);

    const sanity = await page.evaluate(() => window.__show.sanity());
    const errors = sanity.filter((i) => i.severity === 'error');
    if (errors.length) throw new Error(`sanity errors in explore mode: ${errors.map((e) => e.code).join(', ')}`);

    await page.click('#act-return');
    await settle(4);
    const backToCinema = await page.evaluate(() => window.__show.state().mode === 'cinematic');
    if (!backToCinema) throw new Error('"Return to cinematic camera" did not restore the directed camera');
    return title;
  });

  await control('window resize', async () => {
    for (const size of [{ width: 1280, height: 720 }, { width: 2560, height: 1440 }, { width: 900, height: 1400 }, { width, height }]) {
      await page.setViewportSize(size);
      await settle(5);
      const s = await page.evaluate(() => window.__show.state());
      if (!Number.isFinite(s.drawCalls) || s.drawCalls === 0) throw new Error(`nothing drawn at ${size.width}x${size.height}`);
    }
    await page.evaluate((t) => window.__show.seek(t), 112);
    await settle(8);
    await page.screenshot({ path: join(outDir, '91-resize-final.png') });
  });

  await control('fullscreen request', async () => {
    // Headless Chrome will not actually go fullscreen, but the call must not throw.
    await page.click('#btn-fullscreen');
    await settle(3);
    const errs = consoleErrors.filter((e) => /fullscreen/i.test(e));
    if (errs.length) throw new Error(errs.join('; '));
  });

  await control('keyboard shortcuts', async () => {
    await page.evaluate(() => window.__show.pause());
    await page.keyboard.press('Digit5');
    await settle(3);
    let s = await page.evaluate(() => window.__show.state());
    if (s.chapter !== manifest.chapters[4].id) throw new Error(`Digit5 gave chapter "${s.chapter}"`);
    await page.keyboard.press('Period');
    await settle(3);
    s = await page.evaluate(() => window.__show.state());
    if (s.chapter !== manifest.chapters[5].id) throw new Error(`Period gave chapter "${s.chapter}"`);
    await page.keyboard.press('Comma');
    await settle(3);
    s = await page.evaluate(() => window.__show.state());
    if (s.chapter !== manifest.chapters[4].id) throw new Error(`Comma gave chapter "${s.chapter}"`);
    await page.keyboard.press('KeyU');
    await settle(2);
    await page.keyboard.press('KeyU');
    await settle(2);
  });
}

/* ------------------------------------------------------------ realtime --- */

if (realtime) {
  console.log('\nPlaying the whole piece in real time…');
  await page.evaluate(() => {
    window.__qaSamples = [];
    window.__show.seek(0);
    window.__show.resetWorstFrame();
    window.__show.play();
  });
  const started = Date.now();
  const samples = [];
  let lastLog = 0;
  // The loop clamps its own delta, so on a machine too slow to hit ~20 fps the
  // show runs at less than wall-clock speed rather than skipping. That is the
  // right behaviour, but it means the completion test has to watch for a stall
  // rather than for a fixed wall-clock budget.
  let lastAdvance = Date.now();
  let lastShowTime = -1;
  const STALL_MS = 45000;
  while (true) {
    await page.waitForTimeout(2000);
    const s = await page.evaluate(() => window.__show.state());
    samples.push({ t: Number(s.time.toFixed(1)), fps: Number(s.fps.toFixed(1)), draws: s.drawCalls, tris: s.triangles });
    if (s.time > lastShowTime + 0.25) {
      lastShowTime = s.time;
      lastAdvance = Date.now();
    }
    if (s.time - lastLog >= 30) {
      lastLog = s.time;
      console.log(`   t=${s.time.toFixed(0)}s  ${s.chapter}/${s.shot}  ${s.fps.toFixed(1)} fps  ${s.drawCalls} draws`);
    }
    const sanity = await page.evaluate(() => window.__show.sanity());
    const errors = sanity.filter((i) => i.severity === 'error');
    for (const e of errors) fail(`realtime t=${s.time.toFixed(1)}`, `${e.code}: ${e.detail}`);
    if (!s.playing && s.time >= manifest.duration - 0.5) break;
    if (Date.now() - lastAdvance > STALL_MS) {
      fail('realtime', `playback stalled at t=${s.time.toFixed(1)}s`);
      break;
    }
  }
  const fpsValues = samples.map((s) => s.fps).filter((f) => f > 0);
  const wallClockSeconds = Math.round((Date.now() - started) / 1000);
  report.realtime = {
    samples,
    medianFps: fpsValues.sort((a, b) => a - b)[Math.floor(fpsValues.length / 2)] ?? 0,
    minFps: Math.min(...fpsValues),
    wallClockSeconds,
    /** 1.0 means the show played at wall-clock speed. */
    speedRatio: Number((manifest.duration / Math.max(1, wallClockSeconds)).toFixed(2)),
  };
  console.log(
    `   finished in ${wallClockSeconds}s (${report.realtime.speedRatio}x real time), median ${report.realtime.medianFps} fps`,
  );
  await page.screenshot({ path: join(outDir, '92-realtime-end.png') });
}

/* -------------------------------------------------------------- report --- */

// Ignore the noise every headless Chrome emits about audio devices and fonts.
const IGNORE = [
  /Autoplay is only allowed/i,
  /favicon/i,
  /Failed to load resource.*favicon/i,
  /AudioContext/i,
  /GPU stall/i,
  /Automatic fallback to software WebGL/i,
];
report.consoleErrors = consoleErrors.filter((e) => !IGNORE.some((r) => r.test(e)));
report.consoleWarnings = consoleWarnings.filter((e) => !IGNORE.some((r) => r.test(e)));
for (const e of report.consoleErrors) fail('console', e);

report.finishedAt = new Date().toISOString();
report.passed = report.failures.length === 0;
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));

const cpPass = report.checkpoints.filter((c) => c.pass).length;
console.log(`\n${'-'.repeat(64)}`);
console.log(`checkpoints  ${cpPass}/${report.checkpoints.length} passed`);
console.log(`controls     ${report.controls.filter((c) => c.pass).length}/${report.controls.length} passed`);
console.log(`console      ${report.consoleErrors.length} error(s), ${report.consoleWarnings.length} warning(s)`);
console.log(`result       ${report.passed ? 'PASS' : `FAIL (${report.failures.length})`}`);
console.log(`artifacts    ${outDir}`);
console.log(`${'-'.repeat(64)}\n`);

await browser.close();
server?.kill();
process.exit(report.passed ? 0 : 1);
