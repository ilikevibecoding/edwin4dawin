#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// A/B two captures.
//
//   node tools/imdiff.mjs a.png b.png [--out diff.png] [--gain 8] [--thresh 0.02]
//
// Reports the fraction of pixels that moved, where they moved, and by how
// much, then writes an amplified difference image. Under a renderer this slow
// the alternative is squinting at two frames a minute apart, which is how a
// pass that does nothing survives three iterations.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const [fileA, fileB] = files;
if (!fileA || !fileB) {
  console.error('usage: imdiff.mjs a.png b.png [--out diff.png] [--gain 8] [--thresh 0.02]');
  process.exit(1);
}
const out = arg('out', null);
const gain = Number(arg('gain', '8'));
const thresh = Number(arg('thresh', '0.02'));

const toUrl = async (f) => 'data:image/png;base64,' + (await readFile(f)).toString('base64');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const result = await page.evaluate(
  async ({ a, b, gain, thresh }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.min(ia.width, ib.width);
    const h = Math.min(ia.height, ib.height);
    const grab = (img) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, w, h).data;
    };
    const da = grab(ia);
    const db = grab(ib);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const outImg = ctx.createImageData(w, h);
    let moved = 0;
    let sum = 0;
    let peak = 0;
    let peakAt = [0, 0];
    let lumaA = 0;
    let lumaB = 0;
    // where the difference lives, as a 4x4 grid of the frame
    const cells = new Array(16).fill(0);
    for (let i = 0; i < w * h; i++) {
      const p = i * 4;
      const dr = (da[p] - db[p]) / 255;
      const dg = (da[p + 1] - db[p + 1]) / 255;
      const dbl = (da[p + 2] - db[p + 2]) / 255;
      const d = Math.max(Math.abs(dr), Math.abs(dg), Math.abs(dbl));
      lumaA += (0.2126 * da[p] + 0.7152 * da[p + 1] + 0.0722 * da[p + 2]) / 255;
      lumaB += (0.2126 * db[p] + 0.7152 * db[p + 1] + 0.0722 * db[p + 2]) / 255;
      sum += d;
      if (d > thresh) {
        moved++;
        const x = i % w;
        const y = (i / w) | 0;
        cells[((y * 4 / h) | 0) * 4 + ((x * 4 / w) | 0)]++;
      }
      if (d > peak) {
        peak = d;
        peakAt = [i % w, (i / w) | 0];
      }
      outImg.data[p] = Math.min(255, Math.abs(dr) * 255 * gain);
      outImg.data[p + 1] = Math.min(255, Math.abs(dg) * 255 * gain);
      outImg.data[p + 2] = Math.min(255, Math.abs(dbl) * 255 * gain);
      outImg.data[p + 3] = 255;
    }
    ctx.putImageData(outImg, 0, 0);
    const n = w * h;
    return {
      w,
      h,
      movedFrac: moved / n,
      meanDelta: sum / n,
      peak,
      peakAt,
      meanLumaA: lumaA / n,
      meanLumaB: lumaB / n,
      cells: cells.map((v) => +(v / n).toFixed(4)),
      png: c.toDataURL('image/png'),
    };
  },
  { a: await toUrl(fileA), b: await toUrl(fileB), gain, thresh },
);
await browser.close();

const pct = (v) => (v * 100).toFixed(2) + '%';
console.log(`${fileA}  vs  ${fileB}   (${result.w}x${result.h})`);
console.log(`  pixels moved > ${thresh}: ${pct(result.movedFrac)}`);
console.log(`  mean |delta|: ${result.meanDelta.toFixed(4)}   peak ${result.peak.toFixed(3)} at ${result.peakAt}`);
console.log(`  mean luma: ${result.meanLumaA.toFixed(4)} -> ${result.meanLumaB.toFixed(4)}`);
console.log('  where (4x4 grid, fraction of frame):');
for (let r = 0; r < 4; r++) {
  console.log('   ', result.cells.slice(r * 4, r * 4 + 4).map((v) => pct(v).padStart(7)).join(' '));
}
if (out) {
  await writeFile(out, Buffer.from(result.png.split(',')[1], 'base64'));
  console.log(`  diff -> ${out} (gain ${gain}x)`);
}
