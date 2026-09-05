#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// One boot, several variants of a terrain uniform, so a value can be picked
// from numbers instead of from three ten-minute shot runs. Each variant is a
// snippet evaluated with `t` bound to the terrain and `u` to its shader
// uniforms.
//
//   node tools/gndvar.mjs --view wheel --out shots/var \
//     --set "base:" --set "env2:t.material.envMapIntensity=2.0"

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const sets = argv.reduce((a, v, i) => (v === '--set' ? [...a, argv[i + 1]] : a), []);
const url = arg('url', 'http://127.0.0.1:5183/') + '?quality=fast&capture=1';
const view = arg('view', 'wheel');
const outDir = arg('out', 'shots/var');
const width = Number(arg('width', '400'));
const height = Number(arg('height', '225'));

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed\n' + err);
  await browser.close();
  process.exit(1);
}
console.log('[gndvar] booted');

for (const s of sets) {
  const [name, ...rest] = s.split(':');
  const code = rest.join(':');
  const t0 = Date.now();
  const { dataUrl, luma, band } = await page.evaluate(
    async ([v, c]) => {
      const { terrain } = window.debugAPI.objects;
      const t = terrain;
      const u = terrain.material.userData.uniforms;
      if (c) new Function('t', 'u', c)(t, u);
      terrain.material.needsUpdate = true;
      window.debugAPI.setView(v);
      const dataUrl = window.debugAPI.captureFrame(2);
      // mean sRGB luma of the bottom third of the frame, which is ground in
      // every framing this tool is used for
      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = dataUrl;
      });
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const y0 = Math.floor(img.height * 0.66);
      const d = ctx.getImageData(0, y0, img.width, img.height - y0).data;
      let sum = 0;
      let mx = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
        sum += l;
        if (l > mx) mx = l;
      }
      return { dataUrl, luma: window.debugAPI.sampleLuma(), band: { mean: sum / (d.length / 4), max: mx } };
    },
    [view, code],
  );
  const file = path.join(outDir, `${view}_${name}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(
    `[gndvar] ${name} -> ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s) frame ${luma.mean.toFixed(3)} ground ${band.mean.toFixed(3)}/${band.max.toFixed(3)}`,
  );
}
await browser.close();
