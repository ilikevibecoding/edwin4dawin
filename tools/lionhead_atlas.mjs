#!/usr/bin/env node
// Dump the lion coat atlas and the strand (alpha) atlas as PNGs, through the
// studio page so it is the real module at the given quality.
//
//   node tools/lionhead_atlas.mjs --url http://127.0.0.1:5202/ --quality fast --out shots/r2_lionhead/atlas
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5202/');
const quality = arg('quality', 'fast');
const outDir = arg('out', 'shots/lionhead_atlas');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
const pageUrl = base.replace(/\/$/, '') + '/__lionhead_atlas.html';
await page.route(pageUrl, (route) =>
  route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body><script type="module">
      import { studio } from '/tools/lionstudio.page.js';
      studio(${JSON.stringify({ kind: 'male', quality, width: 320, height: 180 })}).then(() => { window.__READY__ = true; }, (e) => { window.__ERROR__ = String(e && e.stack || e); });
    </script></body></html>`,
  }),
);
await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 300000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error(err);
  await browser.close();
  process.exit(1);
}
const dumps = await page.evaluate(() => {
  const S = window.__studio;
  const lion = S.lion;
  const toPng = (tex) => {
    if (!tex || !tex.image) return null;
    const img = tex.image;
    if (img.toDataURL) return img.toDataURL('image/png');
    // DataTexture (cutouts): draw the bytes onto a canvas, rows already flipped for the GPU
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    const id = ctx.createImageData(img.width, img.height);
    const row = img.width * 4;
    for (let y = 0; y < img.height; y++) id.data.set(img.data.subarray((img.height - 1 - y) * row, (img.height - y) * row), y * row);
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  };
  const strands = lion.tiers[0].children.find((c) => /strands/.test(c.name));
  return { coat: toPng(lion.coat.map), alpha: strands ? toPng(strands.material.map) : null, mane: lion.maneMat ? toPng(lion.maneMat.map) : null };
});
for (const [k, v] of Object.entries(dumps)) {
  if (!v) continue;
  const file = path.join(outDir, `${k}.png`);
  await writeFile(file, Buffer.from(v.split(',')[1], 'base64'));
  console.log(`[lionhead] ${k} -> ${file}`);
}
await browser.close();
