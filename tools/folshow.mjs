#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Which pass is that?
//
//   node tools/folshow.mjs --view forest --only broad,fern --out shots/fs
//   node tools/folshow.mjs --view forest --drop broad
//
// The verge is nine scatter passes deep and they are indistinguishable in a
// finished frame, so "the pale thing on the left is the salmonberry" is a guess
// unless it is rendered on its own. `--only` keeps just the named passes,
// `--drop` removes them; both take a comma list of the `name:` given to
// scatterPlants. With neither, renders one frame per pass with that pass alone.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5292/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'forest');
const outDir = arg('out', 'shots/folshow');
const width = Number(arg('width', '448'));
const height = Number(arg('height', '252'));
const only = arg('only', '');
const drop = arg('drop', '');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[folshow]', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);

async function shot(label, keep, kill) {
  const dataUrl = await page.evaluate(
    ([keepList, killList]) => {
      const forest = window.debugAPI.objects.forest.group;
      const name = (o) => (o.name || '').replace(/_\d+$/, '');
      forest.traverse((o) => {
        if (!o.isMesh && !o.isInstancedMesh) return;
        const n = name(o);
        o.visible = (!keepList || keepList.includes(n)) && !(killList && killList.includes(n));
      });
      return window.debugAPI.captureFrame(1);
    },
    [keep, kill],
  );
  await writeFile(`${outDir}/${view}_${label}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('[folshow] wrote', `${outDir}/${view}_${label}.png`);
}

const PASSES = ['fern', 'shrub', 'grass', 'broad', 'understory', 'stalk', 'litter', 'moss'];
if (only) await shot(`only_${only.replace(/,/g, '-')}`, only.split(','), null);
else if (drop) await shot(`no_${drop.replace(/,/g, '-')}`, null, drop.split(','));
else for (const p of PASSES) await shot(`only_${p}`, [p], null);

await browser.close();
