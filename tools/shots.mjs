#!/usr/bin/env node
/**
 * tools/shots.mjs — deterministic screenshot + stats harness.
 *
 *   node tools/shots.mjs --iter 3
 *   node tools/shots.mjs --iter 3 --views cockpit,corridor --interactions
 *   node tools/shots.mjs --iter 3 --url https://raw.githack.com/.../play.html
 *
 * Uses the system Chrome through playwright-core (SwiftShader gives us WebGL2
 * headless; there is no GPU in this environment).
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse } from './png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------- args */

const argv = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(`--${name}`);

const ITER = arg('iter', '0');
const VIEWS = (arg('views', 'cockpit,corridor,quarters,window')).split(',').map((s) => s.trim());
const WIDTH = Number(arg('width', 1600));
const HEIGHT = Number(arg('height', 900));
const URL_BASE = arg('url', 'http://127.0.0.1:5173');
const MIN_FRAMES = Number(arg('frames', 10));
const SETTLE_MS = Number(arg('settle', 1500));
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const OUT = path.join(ROOT, 'shots', `iter_${ITER}`);

fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------ dev server */

async function reachable(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch { return false; }
}

let serverProc = null;
async function ensureServer() {
  if (!URL_BASE.startsWith('http://127.0.0.1') && !URL_BASE.startsWith('http://localhost')) return;
  if (await reachable(URL_BASE)) { console.log('· dev server already up'); return; }
  console.log('· starting vite…');
  serverProc = spawn('npx', ['vite', '--port', '5173', '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: false,
  });
  serverProc.stdout.on('data', () => {});
  serverProc.stderr.on('data', (d) => process.stderr.write(String(d)));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (await reachable(URL_BASE)) { console.log('· vite up'); return; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite did not come up');
}

function stopServer() {
  if (serverProc && !serverProc.killed) serverProc.kill('SIGTERM');
}

/* ------------------------------------------------------------------ shoot */

const consoleLines = [];
const errors = [];

async function settle(page, minFrames = MIN_FRAMES, settleMs = SETTLE_MS) {
  await page.evaluate(() => window.debugAPI.resetFrames());
  const t0 = Date.now();
  await page.waitForFunction(
    (n) => window.debugAPI.frames >= n,
    minFrames,
    { timeout: 300000, polling: 250 },
  );
  const remain = settleMs - (Date.now() - t0);
  if (remain > 0) await page.waitForTimeout(remain);
}

async function main() {
  await ensureServer();

  const sep = URL_BASE.includes('?') ? '&' : '?';
  const url = `${URL_BASE}${sep}shot=1`;
  console.log(`· launching chrome for ${url}`);

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
      '--mute-audio',
    ],
  });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    const line = `[${m.type()}] ${m.text()}`;
    consoleLines.push(line);
    if (m.type() === 'error') errors.push(line);
  });
  page.on('pageerror', (e) => {
    const line = `[pageerror] ${e.stack || e.message}`;
    consoleLines.push(line);
    errors.push(line);
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 300000, polling: 250 });
  console.log(`· app ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const report = { iter: ITER, url, width: WIDTH, height: HEIGHT, views: {}, interactions: null, errors: [] };

  for (const view of VIEWS) {
    const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
    if (!ok) { console.log(`! unknown view ${view}`); continue; }
    const tv = Date.now();
    await settle(page);
    const file = path.join(OUT, `${view}.png`);
    await page.screenshot({ path: file });
    const stats = await page.evaluate(() => window.debugAPI.getStats());
    const hist = analyse(file);
    report.views[view] = { stats, hist, ms: Date.now() - tv };
    console.log(`· ${view}: ${stats.calls} calls, ${(stats.tris / 1000).toFixed(0)}k tris, ` +
      `cpu ${stats.cpuMs}ms, ${stats.activeLights}/${stats.lights} lights, luma ${hist.meanLuma}, ` +
      `blown ${hist.blownPct}% crushed ${hist.crushedPct}% in ${((Date.now() - tv) / 1000).toFixed(1)}s`);
  }

  // second frame of the `window` view 3 s later, to prove the space actually moves
  if (VIEWS.includes('window')) {
    await page.evaluate(() => window.debugAPI.setView('window'));
    await page.evaluate(() => window.debugAPI.setTime(window.debugAPI.getTime() + 3));
    await settle(page, 16, 1200);
    await page.screenshot({ path: path.join(OUT, 'window_t+3.png') });
  }

  if (flag('interactions')) {
    report.interactions = await runInteractions(page);
  }

  report.errors = errors.slice(0, 40);
  fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'console.log'), consoleLines.join('\n'));

  await browser.close();

  console.log(`· wrote ${OUT}`);
  if (errors.length) {
    console.log(`! ${errors.length} console/page errors`);
    errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  }
  return errors.length ? 1 : 0;
}

/** Scripted interaction pass — prompts, fades, status changes, pointer lock. */
async function runInteractions(page) {
  const out = { pointerLock: null, steps: [] };

  await page.evaluate(() => window.debugAPI.releaseView());
  await page.bringToFront();
  await page.mouse.click(WIDTH / 2, HEIGHT / 2);
  await page.waitForTimeout(800);
  out.pointerLock = await page.evaluate(() => window.debugAPI.isPointerLocked());

  // reset the toast memory so each step is judged on its own message
  await page.evaluate(() => { window.debugAPI.clearToast?.(); });

  const cases = [
    { id: 'bed', view: 'bedFront', prompt: 'E: Sleep', fade: true },
    { id: 'galley', view: 'galleyFront', prompt: 'E: Eat', fade: false },
    { id: 'bathroom', view: 'sinkFront', prompt: 'E: Wash', fade: true },
  ];

  for (const c of cases) {
    const step = { id: c.id };
    await page.evaluate((v) => window.debugAPI.setView(v), c.view);
    await settle(page, 16, 900);
    step.prompt = await page.evaluate(() => window.debugAPI.getPrompt());
    step.promptOK = step.prompt === c.prompt;
    await page.screenshot({ path: path.join(OUT, `ix_${c.id}_prompt.png`) });

    await page.evaluate(() => { window.debugAPI.clearToast?.(); });
    const before = await page.evaluate(() => window.debugAPI.getStatusText().replace(/SHIP TIME \\d+:\\d+/, ''));
    await page.keyboard.press('KeyE');

    if (c.fade) {
      // catch the fade at its darkest
      let maxAlpha = 0;
      for (let i = 0; i < 40; i++) {
        const a = await page.evaluate(() => window.debugAPI.getFadeAlpha());
        maxAlpha = Math.max(maxAlpha, a);
        if (a > 0.9) break;
        await page.waitForTimeout(120);
      }
      step.maxFadeAlpha = +maxAlpha.toFixed(2);
      step.caption = await page.evaluate(() => window.debugAPI.getCaption());
      await page.screenshot({ path: path.join(OUT, `ix_${c.id}_fade.png`) });
    }

    // wait for the sequence to finish
    for (let i = 0; i < 80; i++) {
      const done = await page.evaluate(() => window.debugAPI.getFadeAlpha() < 0.02 && !!window.debugAPI.getLastToast());
      if (done) break;
      await page.waitForTimeout(150);
    }
    step.toast = await page.evaluate(() => window.debugAPI.getLastToast());
    const after = await page.evaluate(() => window.debugAPI.getStatusText().replace(/SHIP TIME \\d+:\\d+/, ''));
    step.statusChanged = before !== after;
    step.preset = await page.evaluate(() => window.debugAPI.getLightPreset());
    await settle(page, 12, 700);
    await page.screenshot({ path: path.join(OUT, `ix_${c.id}_after.png`) });
    out.steps.push(step);
    console.log(`· ix ${c.id}: prompt=${step.promptOK} fade=${step.maxFadeAlpha ?? '-'} toast=${JSON.stringify(step.toast)} status=${step.statusChanged}`);

    if (c.id === 'bed') {
      // capture the rest-cycle lighting in the corridor before it eases back
      await page.evaluate(() => window.debugAPI.setView('corridor'));
      await settle(page, 16, 800);
      await page.screenshot({ path: path.join(OUT, 'ix_rest_cycle.png') });
      await page.evaluate(() => window.debugAPI.setLightPreset('day', 0.2));
      await page.waitForTimeout(600);
    }
  }
  return out;
}

let code = 1;
try {
  code = await main();
} catch (e) {
  console.error(e);
  code = 1;
} finally {
  stopServer();
}
process.exit(code);
