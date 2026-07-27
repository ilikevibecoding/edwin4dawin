#!/usr/bin/env node
/**
 * Headless screenshot harness.
 *
 * Boots the game in headless Chrome (SwiftShader), waits for the engine to
 * report ready, optionally poses the camera at a named vantage point, steps a
 * fixed number of frames so temporal effects converge, and writes a PNG.
 *
 * Usage:
 *   node tools/capture.mjs --shots hero,alley,rooftop --out shots/ --width 1600 --height 900
 *   node tools/capture.mjs --list
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
  width: Number(arg('width', 1600)),
  height: Number(arg('height', 900)),
  shots: String(arg('shots', 'hero')).split(',').map((s) => s.trim()).filter(Boolean),
  warmup: Number(arg('warmup', 24)),
  settle: Number(arg('settle', 12)),
  // SwiftShader renders the full HDR chain in software, so a single 1600x900
  // frame can take tens of seconds. These ceilings are generous by necessity.
  timeout: Number(arg('timeout', 900000)),
  /** Give up on boot sooner than the per-shot timeout so failures surface fast. */
  bootTimeout: Number(arg('boot-timeout', 180000)),
  quality: arg('quality', null),
  list: !!arg('list', false),
  verbose: !!arg('verbose', false),
  keepOpen: !!arg('keep-open', false),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);
if (!CHROME) {
  console.error('No Chrome binary found.');
  process.exit(1);
}

const LAUNCH_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--disable-software-rasterizer-fallback-warning',
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  `--window-size=${OPTS.width},${OPTS.height}`,
  // SwiftShader benefits from every core we can give it.
  '--renderer-process-limit=1',
];

async function main() {
  await mkdir(OPTS.out, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: LAUNCH_ARGS,
    protocolTimeout: OPTS.timeout,
    defaultViewport: { width: OPTS.width, height: OPTS.height, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(OPTS.timeout);

  const logs = [];
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (OPTS.verbose || msg.type() === 'error') console.log('  page', text);
  });
  page.on('pageerror', (err) => {
    const text = `[pageerror] ${err.message}`;
    logs.push(text);
    console.log('  page', text);
  });
  page.on('requestfailed', (req) => {
    const text = `[requestfailed] ${req.url()} ${req.failure()?.errorText}`;
    logs.push(text);
    if (OPTS.verbose) console.log('  page', text);
  });

  const url = new URL(OPTS.url);
  url.searchParams.set('capture', '1');
  if (OPTS.quality) url.searchParams.set('quality', String(OPTS.quality));

  console.log(`Loading ${url.href} ...`);
  const t0 = Date.now();
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: OPTS.timeout });

  // A Vite transform error replaces the document, so detect it immediately
  // rather than waiting out the boot timeout.
  const overlay = await page
    .evaluate(() => {
      const el = document.querySelector('vite-error-overlay');
      if (el) return el.shadowRoot?.querySelector('.message')?.textContent ?? 'vite error';
      const h2 = document.querySelector('h1 + h2');
      return h2 && document.querySelector('h1')?.textContent === 'Internal Server Error'
        ? h2.textContent
        : null;
    })
    .catch(() => null);
  if (overlay) {
    console.error('Build error:\n', overlay);
    await browser.close();
    process.exitCode = 1;
    return;
  }

  // Wait for the debug bridge that main.ts installs once systems are ready.
  try {
    await page.waitForFunction(() => window.__GAME__ && window.__GAME__.ready === true, {
      timeout: OPTS.bootTimeout,
      polling: 250,
    });
  } catch {
    console.error('Engine never reported ready. Recent console output:');
    for (const l of logs.slice(-40)) console.error('   ', l);
    await page.screenshot({ path: path.join(OPTS.out, '_failed-boot.png') }).catch(() => {});
    await browser.close();
    process.exitCode = 1;
    return;
  }
  console.log(`Engine ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (OPTS.list) {
    const names = await page.evaluate(() => window.__GAME__.listShots());
    console.log('Available vantage points:');
    for (const n of names) console.log('  -', n);
    await browser.close();
    return;
  }

  const results = [];
  for (const shot of OPTS.shots) {
    const label = shot || 'hero';
    process.stdout.write(`Capturing "${label}" ... `);
    const st = Date.now();

    const ok = await page.evaluate(async (name) => {
      return window.__GAME__.pose(name);
    }, label);
    if (!ok) {
      console.log('unknown vantage point, skipping');
      continue;
    }

    // Step frames so TAA history, auto-exposure and particle warm-up settle.
    // Chunked so a slow software frame cannot exhaust the protocol timeout.
    const total = OPTS.warmup + OPTS.settle;
    for (let done = 0; done < total; done += 4) {
      await page.evaluate((n) => window.__GAME__.stepFrames(n), Math.min(4, total - done));
    }

    const buf = await page.screenshot({
      type: 'png',
      captureBeyondViewport: false,
      optimizeForSpeed: true,
      fromSurface: true,
    });
    const file = path.join(OPTS.out, `${label}.png`);
    await writeFile(file, buf);
    results.push(file);
    console.log(`${file} (${((Date.now() - st) / 1000).toFixed(1)}s)`);
  }

  const stats = await page.evaluate(() => window.__GAME__.stats());
  console.log('Renderer stats:', JSON.stringify(stats));

  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`);
    for (const e of errors.slice(0, 25)) console.log('   ', e);
  }

  if (!OPTS.keepOpen) await browser.close();
  console.log(`\nWrote ${results.length} screenshot(s) to ${OPTS.out}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
