#!/usr/bin/env node
/**
 * tools/cdncheck.mjs — prove the published single-file build actually runs from its
 * public URL. Loads the URL in headless Chrome (SwiftShader), waits for `debugAPI.ready`,
 * frames the corridor, screenshots it and prints stats + any page errors.
 *
 *   node tools/cdncheck.mjs "<url>" [out.png]
 *
 * Exits 1 if the page errors, never becomes ready, or renders a black frame.
 */
import { chromium } from 'playwright-core';
import { analyse } from './png.mjs';

const url = process.argv[2];
const out = process.argv[3] ?? 'shots/cdn_final.png';
if (!url) {
  console.error('usage: node tools/cdncheck.mjs "<url>" [out.png]');
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e).slice(0, 300)}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text().slice(0, 200);
  // htmlpreview.github.io fetches its own favicon, which 404s — not our problem
  if (/favicon/i.test(t)) return;
  errors.push(`[console] ${t}`);
});

const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log(`· http ${res?.status()} ${res?.headers()['content-type'] ?? ''}`);

let ready = false;
try {
  await page.waitForFunction(() => window.debugAPI?.ready, null, { timeout: 240000, polling: 300 });
  ready = true;
} catch {
  /* handled below */
}
console.log(`· debugAPI.ready: ${ready}`);
console.log(`· canvases: ${await page.evaluate(() => document.querySelectorAll('canvas').length)}`);

await page.evaluate(() => {
  window.debugAPI?.hideSplash?.();
  window.debugAPI?.setView?.('corridor');
});
await page.waitForTimeout(15000);
await page.screenshot({ path: out });

let stats = null;
try {
  stats = await page.evaluate(() => window.debugAPI.getStats());
  console.log(`· stats ${JSON.stringify(stats)}`);
} catch {
  /* not ready */
}

const img = analyse(out);
console.log(`· image meanLuma ${img.meanLuma} blown ${img.blownPct}% crushed ${img.crushedPct}%`);
console.log(`· errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close();

const ok = ready && errors.length === 0 && img.meanLuma > 8;
console.log(ok ? `✔ ${url} runs (${out})` : `✘ ${url} did NOT verify`);
process.exit(ok ? 0 : 1);
