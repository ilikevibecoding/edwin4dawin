#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Ablate the per-fragment foliage extras.
//
//   node tools/folfx.mjs --view forest --url http://127.0.0.1:5292/?quality=high
//
// `sheen` and `bump` only exist above the `fast` tier, so a `fast` capture
// cannot show them and a `high` capture cannot show what they cost. This
// renders the same frame with each of them zeroed from one boot, which is the
// only way to tell "the tier looks washed out" apart from "the tier has more
// trees in it".
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5292/?quality=high');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'forest');
const outDir = arg('out', 'shots/folfx');
const width = Number(arg('width', '384'));
const height = Number(arg('height', '216'));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[folfx]', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);

async function shot(label, zero) {
  const res = await page.evaluate(
    ([keys]) => {
      const mats = Object.values(window.debugAPI.objects.forest.materials).flatMap((m) => (m && m.userData ? [m] : Object.values(m ?? {})));
      const saved = [];
      for (const m of mats) {
        const u = m?.userData?.foliage;
        if (!u) continue;
        for (const k of keys) {
          if (!u[k]) continue;
          saved.push([u[k], u[k].value]);
          u[k].value = 0;
        }
      }
      const dataUrl = window.debugAPI.captureFrame(1);
      const luma = window.debugAPI.sampleLuma();
      for (const [slot, v] of saved) slot.value = v;
      return { dataUrl, luma };
    },
    [zero],
  );
  await writeFile(`${outDir}/${view}_${label}.png`, Buffer.from(res.dataUrl.split(',')[1], 'base64'));
  console.log(`[folfx] ${label.padEnd(12)} luma ${res.luma.mean.toFixed(3)}/${res.luma.max.toFixed(3)} -> ${outDir}/${view}_${label}.png`);
}

await shot('base', []);
await shot('nosheen', ['uSheen']);
await shot('nobump', ['uBump']);
await shot('neither', ['uSheen', 'uBump']);
await browser.close();
