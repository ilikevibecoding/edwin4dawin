#!/usr/bin/env node
/**
 * Deterministic frame renderer.
 *
 * Opens the film in `render=1` mode, where the page hands its clock over to us,
 * then walks the timeline one exact frame at a time. Nothing depends on
 * wall-clock time, so the output is identical on every run regardless of how
 * fast the machine is.
 *
 *   node tools/render-frames.mjs --out render/frames --fps 24 --w 1280 --h 720
 *   node tools/render-frames.mjs --from 0 --to 240 --workers 4
 */
import puppeteer from 'puppeteer';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);

const URLBASE = flag('url', 'http://127.0.0.1:5175/index.html');
const OUT = flag('out', 'render/frames');
const FPS = parseFloat(flag('fps', '24'));
const W = parseInt(flag('w', '1280'), 10);
const H = parseInt(flag('h', '720'), 10);
const QUALITY = parseInt(flag('quality', '94'), 10);
const WORKERS = parseInt(flag('workers', '3'), 10);
const SKIP = has('skip-existing');
// When a range sits inside a single scene, build only that scene: much less
// memory per worker and a far faster page boot.
const ONLY = flag('only', '');

mkdirSync(OUT, { recursive: true });

const LAUNCH = {
  headless: true,
  protocolTimeout: 600000,
  args: [
    '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--disable-frame-rate-limit', '--mute-audio', '--hide-scrollbars',
    '--js-flags=--max-old-space-size=3072',
  ],
};

async function openFilm() {
  const browser = await puppeteer.launch(LAUNCH);
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const url = `${URLBASE}?render=1&fps=${FPS}&w=${W}&h=${H}${ONLY ? '&only=' + ONLY : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 300000 });
  const boot = await page.evaluate(() => window.__bootError || null);
  if (boot) { console.error('BOOT ERROR: ' + boot); process.exit(1); }
  const total = await page.evaluate(() => window.__frames);
  return { browser, page, total, errs };
}

const probe = await openFilm();
const TOTAL = parseInt(flag('to', String(probe.total)), 10);
const FROM = parseInt(flag('from', '0'), 10);
console.log(`film is ${probe.total} frames @ ${FPS}fps (${(probe.total / FPS).toFixed(1)}s); rendering ${FROM}..${TOTAL} at ${W}x${H} with ${WORKERS} worker(s)`);
await probe.browser.close();

const started = Date.now();
let done = 0;
const totalWanted = TOTAL - FROM;

async function worker(wi) {
  const { browser, page, errs } = await openFilm();
  for (let f = FROM + wi; f < TOTAL; f += WORKERS) {
    const path = join(OUT, String(f).padStart(6, '0') + '.jpg');
    if (SKIP && existsSync(path)) { done++; continue; }
    await page.evaluate((n) => window.__seek(n), f);
    await page.screenshot({ path, type: 'jpeg', quality: QUALITY, optimizeForSpeed: true });
    done++;
    if (wi === 0 && done % 20 === 0) {
      const el = (Date.now() - started) / 1000;
      const rate = done / el;
      const eta = (totalWanted - done) / rate;
      process.stdout.write(
        `\r  ${done}/${totalWanted} frames  ${rate.toFixed(1)} fps  elapsed ${(el / 60).toFixed(1)}m  eta ${(eta / 60).toFixed(1)}m   `
      );
    }
  }
  if (errs.length) console.log(`\n  worker ${wi} page errors:\n   ` + [...new Set(errs)].slice(0, 8).join('\n   '));
  await browser.close();
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
console.log(`\ndone: ${done} frames in ${((Date.now() - started) / 60000).toFixed(1)} min -> ${OUT}`);
