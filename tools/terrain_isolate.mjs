#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Attribute the roadside stones: hide the terrain's own scatter, then the
// forest's rock instances, and re-render the same view.
//
//   node tools/terrain_isolate.mjs --view road --url http://127.0.0.1:5205/?quality=fast

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5205/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const views = arg('view', 'road').split(',');
const width = Number(arg('width', '640'));
const height = Math.round((width * 9) / 16);
const out = arg('out', 'shots/r2_terrain/isolate');

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const { terrain } = window.debugAPI.objects;
      return terrain.stats;
    }),
  ),
);

async function shot(view, label, code) {
  const { dataUrl } = await page.evaluate(
    ([code, v]) => {
      const objs = window.debugAPI.objects;
      // eslint-disable-next-line no-new-func
      new Function('O', code)(objs);
      window.debugAPI.setView(v);
      return { dataUrl: window.debugAPI.captureFrame(1) };
    },
    [code, view],
  );
  await writeFile(`${out}/${view}_${label}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', `${out}/${view}_${label}.png`);
}

const showAll = `
  O.terrain.stones.visible = true; O.terrain.shadows.visible = true;
  O.forest.group.traverse(o => { if (o.isMesh) o.visible = true; });
`;
for (const view of views) {
  await shot(view, '0_all', showAll);
  await shot(view, '1_noterrainstones', showAll + `O.terrain.stones.visible = false; O.terrain.shadows.visible = false;`);
  await shot(view, '2_noforestrocks', showAll + `O.forest.group.traverse(o => { if (/^rock_|^kopje_/.test(o.name)) o.visible = false; });`);
}
await browser.close();
