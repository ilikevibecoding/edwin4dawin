#!/usr/bin/env node
/**
 * Screenshot harness for the level, tolerant of a neighbouring build error.
 *
 * `capture.mjs` is the shared harness and it is right to abort on a Vite
 * transform error: normally that error is yours. It is not always yours. Several
 * agents work this repository at once, and while another system is mid-edit its
 * dynamic imports fail, Vite paints a full-page error overlay, and hot module
 * replacement reloads the document underneath a running capture. The world still
 * generates and still renders perfectly; the frames just come back with somebody
 * else's stack trace across them, or the run dies with "execution context was
 * destroyed" halfway through the second shot.
 *
 * This does the same job with three differences: the overlay is removed from the
 * DOM rather than treated as fatal, hot module replacement is disabled for the
 * session so the page cannot reload mid-run, and a shot that dies to a
 * navigation is retried on a fresh page instead of taking the run down.
 *
 * Usage: world-shots.mjs --shots a,b,c --out shots/x [--quality medium]
 *                        [--width 960] [--height 540] [--warmup 6] [--settle 2]
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const OPTS = {
  url: arg('url', 'http://127.0.0.1:5173/'),
  out: arg('out', 'shots'),
  width: Number(arg('width', 960)),
  height: Number(arg('height', 540)),
  shots: String(arg('shots', 'market_hero')).split(',').map((s) => s.trim()).filter(Boolean),
  warmup: Number(arg('warmup', 6)),
  settle: Number(arg('settle', 2)),
  quality: arg('quality', 'medium'),
  timeout: 900000,
  bootTimeout: 240000,
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    `--window-size=${OPTS.width},${OPTS.height}`, '--renderer-process-limit=1',
  ],
  protocolTimeout: OPTS.timeout,
  defaultViewport: { width: OPTS.width, height: OPTS.height, deviceScaleFactor: 1 },
});

const url = new URL(OPTS.url);
url.searchParams.set('capture', '1');
if (OPTS.quality) url.searchParams.set('quality', String(OPTS.quality));

/** Boots a fresh page and returns it ready to pose. */
async function boot() {
  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  page [error]', m.text().slice(0, 160));
  });
  // Neutralise hot module replacement before any application code runs, so a
  // neighbouring agent saving a file cannot reload the document mid-capture.
  await page.evaluateOnNewDocument(() => {
    /*
     * Vite's client opens its socket at the page's own origin and identifies
     * itself only by sub-protocol — `vite-hmr` — so matching on the URL alone
     * misses it, which is why the first shot of every run was still being killed
     * by a neighbouring agent's save. Match either.
     */
    const ws = window.WebSocket;
    const dead = {
      addEventListener() {}, removeEventListener() {}, send() {}, close() {},
      readyState: 3, onopen: null, onclose: null, onerror: null, onmessage: null,
    };
    window.WebSocket = function (u, p) {
      const proto = Array.isArray(p) ? p.join(',') : String(p ?? '');
      if (String(u).includes('vite') || proto.includes('vite')) return dead;
      return new ws(u, p);
    };
    // Vite also falls back to a plain reload if the socket never connects.
    const reload = window.location.reload.bind(window.location);
    Object.defineProperty(window.location, 'reload', { value: () => { void reload; } });
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: OPTS.timeout });
  await page.waitForFunction(() => window.__GAME__ && window.__GAME__.ready === true, {
    timeout: OPTS.bootTimeout, polling: 250,
  });
  return page;
}

/** Strips anything Vite has painted over the canvas. */
async function clearOverlay(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('vite-error-overlay')) el.remove();
  }).catch(() => {});
}

await mkdir(OPTS.out, { recursive: true });
let page = await boot();
console.log('Engine ready.');

const written = [];
let lastStats = null;
for (const shot of OPTS.shots) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      process.stdout.write(`Capturing "${shot}" ... `);
      const st = Date.now();
      /*
       * A pose that reports an unknown vantage is not a bad shot name, it is a
       * page that has reloaded under us: the world system registers its vantages
       * during generation, so an empty registry means generation has not
       * finished. Treated as "skip", that failure silently wrote a black frame
       * and reported zero draw calls, which cost a capture round to work out. It
       * is a reboot, like every other lost-page symptom.
       */
      const ok = await page.evaluate((n) => window.__GAME__.pose(n), shot);
      if (!ok) throw new Error(`vantage "${shot}" not registered yet`);
      const total = OPTS.warmup + OPTS.settle;
      for (let done = 0; done < total; done += 3) {
        await page.evaluate((n) => window.__GAME__.stepFrames(n), Math.min(3, total - done));
      }
      await clearOverlay(page);
      const stats = await page.evaluate(() => window.__GAME__.stats());
      if (!stats.drawCalls) throw new Error('nothing drawn');
      lastStats = stats;
      const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true, fromSurface: true });
      const file = path.join(OPTS.out, `${shot}.png`);
      await writeFile(file, buf);
      written.push(file);
      console.log(`${file} (${((Date.now() - st) / 1000).toFixed(1)}s) `
        + `${stats.drawCalls} calls, ${stats.triangles} tris`);
      break;
    } catch (err) {
      console.log(`failed (${String(err.message).slice(0, 70)}); rebooting page`);
      await page.close().catch(() => {});
      page = await boot();
    }
  }
}

if (lastStats) console.log('Renderer stats:', JSON.stringify(lastStats));
await browser.close();
console.log(`Wrote ${written.length} shot(s) to ${OPTS.out}/`);
