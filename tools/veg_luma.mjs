#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// Mean luma over named rectangles of one or more PNGs, so "the grass is brighter
// than the road" is a number and not an impression. No image library in the
// tree, so the frame is decoded by a headless page.
//
//   node tools/veg_luma.mjs --rects "road:150,260,100,70;grassL:20,200,100,60" a.png b.png
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const ri = argv.indexOf('--rects');
const rects = (ri >= 0 ? argv[ri + 1] : 'road:150,260,100,70;grassL:20,200,100,60')
  .split(';')
  .filter(Boolean)
  .map((s) => {
    const [n, v] = s.split(':');
    const [x, y, w, h] = v.split(',').map(Number);
    return { n, x, y, w, h };
  });
const files = argv.filter((a, i) => !a.startsWith('--') && (ri < 0 || i !== ri + 1));

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const f of files) {
  const b64 = (await readFile(f)).toString('base64');
  const out = await page.evaluate(
    async ({ b64, rects }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const res = {};
      for (const r of rects) {
        const d = ctx.getImageData(r.x, r.y, r.w, r.h).data;
        let sum = 0;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
          sr += d[i];
          sg += d[i + 1];
          sb += d[i + 2];
        }
        const n = d.length / 4;
        res[r.n] = { luma: +(sum / n).toFixed(3), rgb: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] };
      }
      return res;
    },
    { b64, rects },
  );
  console.log(f, JSON.stringify(out));
}
await browser.close();
