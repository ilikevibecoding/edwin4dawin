#!/usr/bin/env node
/**
 * Headless visual tour.
 *
 * Drives the application through window.__STARFALL, stops at every entry in
 * the checkpoint manifest, asserts what should be on screen, captures a
 * screenshot, and collects console errors, WebGL errors and sanity failures
 * into qa/report.json.
 *
 * Usage:
 *   node scripts/qa-tour.mjs                    # against the dev server
 *   node scripts/qa-tour.mjs --preview          # against `vite preview`
 *   node scripts/qa-tour.mjs --only 15,16,17    # a subset of checkpoints
 *   node scripts/qa-tour.mjs --times 120,240    # ad-hoc timestamps
 *   node scripts/qa-tour.mjs --quality high
 */

import puppeteer from 'puppeteer-core';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'qa', 'screenshots');

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const PORT = has('preview') ? 4173 : Number(flag('port', 5173));
const BASE = `http://127.0.0.1:${PORT}/`;
const QUALITY = flag('quality', 'medium');
const WIDTH = Number(flag('width', 1600));
const HEIGHT = Number(flag('height', 900));
const ONLY = flag('only') ? flag('only').split(',').map((s) => s.trim()) : null;
const TIMES = flag('times') ? flag('times').split(',').map(Number) : null;
const SETTLE = Number(flag('settle', 8));
/** Seconds of timeline rolled forward before each capture so events fire. */
const PREROLL = Number(flag('preroll', 3.6));
const KEEP = has('keep');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findChrome() {
  for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
  throw new Error(`No Chrome binary found. Set CHROME_PATH. Tried:\n${CHROME_CANDIDATES.join('\n')}`);
}

async function main() {
  if (!KEEP) await rm(shotDir, { recursive: true, force: true });
  await mkdir(shotDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--mute-audio',
      '--hide-scrollbars',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--force-device-scale-factor=1',
    ],
    protocolTimeout: 600000,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') consoleErrors.push(text);
    else if (type === 'warning' || type === 'warn') consoleWarnings.push(text);
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    consoleErrors.push(`requestfailed: ${req.url()} (${failure ? failure.errorText : 'unknown'})`);
  });

  const url = `${BASE}?qa=1&quality=${QUALITY}&autoplay=0`;
  process.stdout.write(`Opening ${url}\n`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
    timeout: 300000,
  });
  process.stdout.write('Application ready.\n');

  const report = {
    generatedAt: new Date().toISOString(),
    url,
    quality: QUALITY,
    viewport: { width: WIDTH, height: HEIGHT },
    checkpoints: [],
    staticIssues: [],
    controlTests: [],
    consoleErrors: [],
    consoleWarnings: [],
    narration: null,
    summary: {},
  };

  report.staticIssues = await page.evaluate('window.__STARFALL.staticSanity()');
  report.narration = await page.evaluate('window.__STARFALL.narrationStats()');

  const manifest = await page.evaluate('window.__STARFALL.checkpoints');
  let list = manifest;
  if (ONLY) list = manifest.filter((c) => ONLY.includes(c.id) || ONLY.some((o) => c.file.startsWith(o)));
  if (TIMES) {
    list = TIMES.map((t, i) => ({
      id: `adhoc-${i}`,
      time: t,
      chapter: '',
      camera: '',
      subjects: [],
      file: `adhoc-${String(t).padStart(3, '0')}.png`,
      note: `ad-hoc capture at ${t}s`,
    }));
  }

  let failures = 0;
  for (const cp of list) {
    const started = Date.now();
    await page.evaluate(
      (time, frames, preroll) => window.__STARFALL.seekAndSettle(time, frames, preroll),
      cp.time,
      SETTLE,
      PREROLL,
    );
    const state = await page.evaluate('window.__STARFALL.state()');
    const sanity = await page.evaluate('window.__STARFALL.sanity()');
    const subjects = {};
    for (const s of cp.subjects) {
      subjects[s] = {
        visible: await page.evaluate((k) => window.__STARFALL.subjectVisible(k), s),
        coverage: await page.evaluate((k) => window.__STARFALL.subjectCoverage(k), s),
      };
    }
    const stats = await page.evaluate('window.__STARFALL.frameStats()');
    const file = path.join(shotDir, cp.file);
    await page.screenshot({ path: file, type: 'png' });

    const problems = [];
    if (cp.chapter && state.chapter !== cp.chapter)
      problems.push(`chapter is "${state.chapter}", expected "${cp.chapter}"`);
    if (cp.camera && state.shot !== cp.camera)
      problems.push(`camera is "${state.shot}", expected "${cp.camera}"`);
    for (const [name, info] of Object.entries(subjects)) {
      if (!info.visible) problems.push(`subject "${name}" is not on screen`);
    }
    if (cp.minCoverage) {
      const cov = subjects[cp.minCoverage.subject]?.coverage ?? 0;
      if (cov < cp.minCoverage.fraction)
        problems.push(
          `"${cp.minCoverage.subject}" covers ${(cov * 100).toFixed(1)}% of frame height, wanted ${(cp.minCoverage.fraction * 100).toFixed(0)}%`,
        );
    }
    if (cp.luminance) {
      const [lo, hi] = cp.luminance;
      if (stats.mean < lo || stats.mean > hi)
        problems.push(`mean luminance ${stats.mean.toFixed(3)} outside [${lo}, ${hi}]`);
    }
    if (stats.mean < 0.006 && !cp.id.includes('prologue'))
      problems.push(`frame is essentially black (mean ${stats.mean.toFixed(4)})`);
    if (stats.buckets < 6) problems.push(`frame is nearly flat (${stats.buckets} tone buckets)`);
    for (const issue of sanity) {
      if (issue.severity === 'error') problems.push(`sanity ${issue.code}: ${issue.detail}`);
    }

    if (problems.length) failures++;
    report.checkpoints.push({
      ...cp,
      state,
      subjects,
      image: stats,
      problems,
      ms: Date.now() - started,
    });
    const mark = problems.length ? 'FAIL' : ' ok ';
    process.stdout.write(
      `[${mark}] ${cp.file.padEnd(28)} t=${String(cp.time).padStart(5)}s  lum=${stats.mean.toFixed(3)}  ${problems.length ? problems[0] : ''}\n`,
    );
    for (const p of problems.slice(1)) process.stdout.write(`        · ${p}\n`);
  }

  if (!TIMES) {
    report.controlTests = await runControlTests(page);
  }

  report.consoleErrors = dedupe(consoleErrors);
  report.consoleWarnings = dedupe(consoleWarnings).slice(0, 25);
  report.summary = {
    checkpoints: report.checkpoints.length,
    failures,
    consoleErrors: report.consoleErrors.length,
    staticIssues: report.staticIssues.filter((i) => i.severity === 'error').length,
    controlFailures: report.controlTests.filter((t) => !t.pass).length,
  };

  await writeFile(path.join(root, 'qa', 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();

  process.stdout.write('\n──────────── summary ────────────\n');
  process.stdout.write(`checkpoints      ${report.summary.checkpoints}\n`);
  process.stdout.write(`failures         ${report.summary.failures}\n`);
  process.stdout.write(`control failures ${report.summary.controlFailures}\n`);
  process.stdout.write(`console errors   ${report.summary.consoleErrors}\n`);
  process.stdout.write(`static issues    ${report.summary.staticIssues}\n`);
  if (report.consoleErrors.length) {
    process.stdout.write('\nconsole errors:\n');
    report.consoleErrors.slice(0, 12).forEach((e) => process.stdout.write(`  · ${e}\n`));
  }
  if (report.staticIssues.length) {
    process.stdout.write('\nstatic issues:\n');
    report.staticIssues.slice(0, 20).forEach((e) => process.stdout.write(`  · [${e.severity}] ${e.code}: ${e.detail}\n`));
  }
  process.exitCode =
    report.summary.failures + report.summary.consoleErrors + report.summary.controlFailures > 0 ? 1 : 0;
}

async function runControlTests(page) {
  const tests = [];
  const record = async (name, fn) => {
    try {
      const detail = await fn();
      tests.push({ name, pass: true, detail: detail ?? '' });
      process.stdout.write(`[ ok ] control: ${name}\n`);
    } catch (err) {
      tests.push({ name, pass: false, detail: String(err.message ?? err) });
      process.stdout.write(`[FAIL] control: ${name} — ${err.message ?? err}\n`);
    }
  };

  await record('play and pause', async () => {
    await page.evaluate('window.__STARFALL.seekAndSettle(100, 2)');
    await page.evaluate('window.__STARFALL.play()');
    const before = await page.evaluate('window.__STARFALL.state().time');
    await new Promise((r) => setTimeout(r, 1200));
    const after = await page.evaluate('window.__STARFALL.state().time');
    if (after <= before) throw new Error(`clock did not advance (${before} -> ${after})`);
    await page.evaluate('window.__STARFALL.pause()');
    const paused = await page.evaluate('window.__STARFALL.state().time');
    await new Promise((r) => setTimeout(r, 400));
    const stillPaused = await page.evaluate('window.__STARFALL.state().time');
    if (Math.abs(stillPaused - paused) > 0.001) throw new Error('clock advanced while paused');
    return `advanced ${(after - before).toFixed(2)}s`;
  });

  await record('scrub does not duplicate events', async () => {
    for (const t of [240, 120, 300, 90, 360, 210]) {
      await page.evaluate((time) => window.__STARFALL.seekAndSettle(time, 3), t);
    }
    const issues = await page.evaluate('window.__STARFALL.staticSanity()');
    const dup = issues.filter((i) => i.code === 'event-refired' || i.code === 'duplicate-event');
    if (dup.length) throw new Error(dup.map((d) => d.detail).join('; '));
    return 'six seeks, no repeat fires';
  });

  await record('chapter jumps land in the right chapter', async () => {
    const expected = [
      [10, 'Prologue'],
      [55, 'The Desert World'],
      [100, 'The Pursuit'],
      [190, 'Capture'],
      [250, 'The Forward Passage'],
      [300, 'The Plans'],
      [345, 'Pod Six'],
      [395, 'Epilogue'],
    ];
    for (const [t, name] of expected) {
      await page.evaluate((time) => window.__STARFALL.seekAndSettle(time, 2), t);
      const state = await page.evaluate('window.__STARFALL.state()');
      if (state.chapter !== name) throw new Error(`t=${t}s reported "${state.chapter}", expected "${name}"`);
    }
    return `${expected.length} chapters verified`;
  });

  await record('explore mode enters and exits', async () => {
    await page.evaluate('window.__STARFALL.seekAndSettle(250, 3)');
    await page.evaluate('window.__STARFALL.setExplore(true)');
    const on = await page.evaluate('window.__STARFALL.state()');
    if (!on.explore) throw new Error('explore did not activate');
    await page.evaluate(() => {
      for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('resize'));
    });
    await page.evaluate('window.__STARFALL.setExplore(false)');
    const off = await page.evaluate('window.__STARFALL.state()');
    if (off.explore) throw new Error('explore did not deactivate');
    return 'ok';
  });

  await record('resize is stable', async () => {
    const sizes = [
      [1280, 720],
      [1920, 1080],
      [2560, 1440],
      [1600, 900],
    ];
    for (const [w, h] of sizes) {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await page.evaluate('window.__STARFALL.seekAndSettle(120, 3)');
      const issues = await page.evaluate('window.__STARFALL.sanity()');
      const errs = issues.filter((i) => i.severity === 'error');
      if (errs.length) throw new Error(`${w}x${h}: ${errs[0].code}`);
    }
    return sizes.map((s) => s.join('x')).join(', ');
  });

  await record('quality switch rebuilds cleanly', async () => {
    for (const q of ['low', 'high', 'medium']) {
      await page.evaluate((quality) => window.__STARFALL.setQuality(quality), q);
      await page.evaluate('window.__STARFALL.seekAndSettle(122, 4)');
      const state = await page.evaluate('window.__STARFALL.state()');
      if (state.quality !== q) throw new Error(`quality reported ${state.quality}, expected ${q}`);
      const issues = await page.evaluate('window.__STARFALL.sanity()');
      const errs = issues.filter((i) => i.severity === 'error');
      if (errs.length) throw new Error(`${q}: ${errs[0].code} ${errs[0].detail}`);
    }
    return 'low, high, medium';
  });

  await record('subtitles track narration', async () => {
    const samples = [12, 105, 215, 305, 392];
    let found = 0;
    for (const t of samples) {
      await page.evaluate((time) => window.__STARFALL.seekAndSettle(time, 2), t);
      const state = await page.evaluate('window.__STARFALL.state()');
      if (state.subtitle) found++;
    }
    if (found < 4) throw new Error(`only ${found}/${samples.length} sampled moments had a caption`);
    return `${found}/${samples.length} sampled moments captioned`;
  });

  return tests;
}

function dedupe(list) {
  return Array.from(new Set(list));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
