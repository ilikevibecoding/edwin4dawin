#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Beauty views without the extras.
//
//   node tools/fshots.mjs --views forest,hero,road --out shots/fr_1 \
//     --width 512 --height 288 --url http://127.0.0.1:5181/?quality=fast
//
// Same framing as tools/shots.mjs, minus the live HUD screenshot and the
// four-second running-fps measurement. Both of those resume the simulation, and
// on a four-core box with four agents rasterising in software a resumed frame
// takes tens of seconds and the compositor screenshot waits on it — which is
// half an hour of wall clock for two pictures nobody looks at. Progress is
// printed per view so a stall is visible rather than silent.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const baseUrl = arg('url', 'http://127.0.0.1:5181/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', 'shots/fshots');
const views = arg('views', 'forest,hero,road').split(',');

await mkdir(outDir, { recursive: true });
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

// vite reloads the page whenever another agent saves, which lands mid-capture
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const boot = await page.evaluate(() => window.__ERROR__ || null);
if (boot) {
  console.error('[fshots] app failed to boot:\n' + boot);
  await browser.close();
  process.exit(1);
}
console.log(`[fshots] booted in ${el()}`);

const stats = {};
for (const view of views) {
  const ts = Date.now();
  const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
  if (!ok) {
    console.log(`[fshots] unknown view "${view}"`);
    continue;
  }
  const { dataUrl, luma } = await page.evaluate(() => ({
    dataUrl: window.debugAPI.captureFrame(2),
    luma: window.debugAPI.sampleLuma(),
  }));
  await writeFile(path.join(outDir, `${view}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  stats[view] = { ...(await page.evaluate(() => window.debugAPI.stats())), luma };
  if (luma.mean < 0.012 && luma.max < 0.08) console.log(`[fshots] WARNING: ${view} rendered essentially black`);
  console.log(
    `[fshots] ${view} (${((Date.now() - ts) / 1000).toFixed(0)}s) luma ${luma.mean.toFixed(3)}/${luma.max.toFixed(3)}` +
      ` calls ${stats[view].calls} tris ${stats[view].triangles}`,
  );
}

await writeFile(path.join(outDir, 'stats.json'), JSON.stringify({ width, height, views: stats, errs }, null, 2));
if (errs.length) console.log('[fshots] console errors:', errs.slice(0, 8).join(' | '));
console.log(`[fshots] done in ${el()} -> ${outDir}`);
await browser.close();
