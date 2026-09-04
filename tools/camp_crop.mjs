#!/usr/bin/env node
// Crop-and-zoom a frame so a detail can be inspected at the size it is judged
// at. No image library in the tree, so the browser does the resample.
//   node tools/camp_crop.mjs in.png out.png x y w h [scale=3]
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const [inp, out, x, y, w, h, scale = '3'] = process.argv.slice(2);
const png = await readFile(inp);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const W = Math.round(Number(w) * Number(scale));
const H = Math.round(Number(h) * Number(scale));
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0"><canvas id=c width=${W} height=${H}></canvas></body>`);
await page.evaluate(
  async ([data, x, y, w, h, W, H]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    const ctx = document.getElementById('c').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h, 0, 0, W, H);
  },
  [png.toString('base64'), Number(x), Number(y), Number(w), Number(h), W, H],
);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
