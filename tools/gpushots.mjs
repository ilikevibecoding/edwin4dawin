#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Capture harness for the GPU-quality pass.
//
//   node tools/gpushots.mjs --out shots/gpu_3 --url http://127.0.0.1:5193/?quality=ultra \
//        --views hero,road --times day,dusk,night [--warm 0] [--ssr 0]
//
// Two things it does that tools/shots.mjs does not, both of which matter when a
// frame takes a minute:
//
// - **All three hours in one page load.** Booting this scene is 40-60 seconds
//   under software rasterisation, and `setTimeOfDay` is a runtime call, so
//   shooting day, dusk and night from one boot is most of an iteration saved.
// - **Progress as it goes**, rather than a block of output at the end.
//
// `--warm N` renders N extra frames before the capture, for anything that
// accumulates. `--ssr` sets the SSR debug output (1 mask, 2 roughness,
// 3 reflection only).
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const baseUrl = arg('url', 'http://127.0.0.1:5193/');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', 'shots/gpu');
const views = arg('views', 'hero,road').split(',').filter(Boolean);
const times = arg('times', 'day').split(',').filter(Boolean);
const warm = Number(arg('warm', '0'));
const ssrModes = arg('ssr', '0')
  .split(',')
  .filter(Boolean)
  .map(Number);
// `--ab ssr` shoots every view twice, once with the pass on and once with it
// off, from the same page load — which is the only way to A/B a pass when a
// boot is most of a minute and two boots do not land on the same frame.
const abPass = arg('ab', null);

const log = (...a) => console.log('[gpushots]', ...a);

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

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') {
    problems.push(`${m.type()}: ${m.text()}`);
    log(`page ${m.type()}:`, m.text());
  }
});
page.on('pageerror', (e) => {
  problems.push(`pageerror: ${e.message}`);
  log('page error:', e.message);
});

await mkdir(outDir, { recursive: true });
const t0 = Date.now();
log(`loading ${url} at ${width}x${height}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const bootErr = await page.evaluate(() => window.__ERROR__ || null);
if (bootErr) {
  console.error('[gpushots] boot failed:\n' + bootErr);
  await browser.close();
  process.exit(1);
}
log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const stats = {};
for (const time of times) {
  const ts = Date.now();
  await page.evaluate((t) => window.debugAPI.setTimeOfDay(t), time);
  log(`time -> ${time} (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
  for (const view of views) {
    const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
    if (!ok) {
      log(`unknown view "${view}"`);
      continue;
    }
    for (const ssr of ssrModes) {
      for (const on of abPass ? [true, false] : [true]) {
        const tv = Date.now();
        await page.evaluate((n) => window.debugAPI.objects.post.debugSsr(n), ssr);
        if (abPass) {
          await page.evaluate(
            ([p, v]) => {
              if (p.startsWith('obj:')) {
                const o = window.debugAPI.objects.scene.getObjectByName(p.slice(4));
                if (o) o.visible = v;
              } else {
                window.debugAPI.toggle(p, v);
              }
            },
            [abPass, on],
          );
        }
        if (warm > 0) await page.evaluate((n) => window.debugAPI.renderFrames(n), warm);
        const { dataUrl, luma } = await page.evaluate(() => ({
          dataUrl: window.debugAPI.captureFrame(2),
          luma: window.debugAPI.sampleLuma(),
        }));
        const name =
          (times.length > 1 ? `${view}_${time}` : view) +
          (ssrModes.length > 1 || ssr ? `_ssr${ssr}` : '') +
          (abPass && !on ? `_no_${abPass}` : '');
        const file = path.join(outDir, `${name}.png`);
        await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
        if (luma.mean < 0.012 && luma.max < 0.08) log(`WARNING: ${name} is essentially black (mean ${luma.mean.toFixed(4)})`);
        stats[name] = { ...(await page.evaluate(() => window.debugAPI.stats())), luma };
        log(`${name} -> ${file} (${((Date.now() - tv) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)}/${luma.max.toFixed(3)})`);
      }
      if (abPass) {
        await page.evaluate((p) => {
          if (p.startsWith('obj:')) {
            const o = window.debugAPI.objects.scene.getObjectByName(p.slice(4));
            if (o) o.visible = true;
          } else {
            window.debugAPI.toggle(p, true);
          }
        }, abPass);
      }
    }
  }
}

await writeFile(
  path.join(outDir, 'stats.json'),
  JSON.stringify({ url, width, height, views: stats, problems }, null, 2),
);
await browser.close();
log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
