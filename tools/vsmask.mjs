// Offline crushed/clipped mask.
//
// The frame stats say "5% of this view is below 0.016 luma" but not *what* is,
// and on a truck made of thirty black plastic parts that is the only question
// worth answering. This decodes PNGs that are already on disk in a headless
// canvas — no scene boot, so it runs in a second rather than the eight minutes
// a probe pass costs — and paints the failing pixels back over a desaturated
// copy of the frame: red for crushed, blue for blown, green for the 1% band
// just above the crush floor that is about to become crushed.
//
//   node tools/vsmask.mjs shots/vs_9/*.png
//
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const files = process.argv.slice(2).filter((f) => f.endsWith('.png') && !f.includes('_mask'));
if (!files.length) {
  console.error('usage: node tools/vsmask.mjs <png> [...]');
  process.exit(1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

for (const file of files) {
  const b64 = fs.readFileSync(file).toString('base64');
  const res = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const w = img.width;
    const h = img.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h);
    const p = d.data;
    let crushed = 0;
    let low = 0;
    let hot = 0;
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255;
      // desaturated, dimmed base so the overlay reads on top of it
      const g = Math.round(l * 150 + 30);
      let r = g;
      let gg = g;
      let bb = g;
      if (l < 0.016) {
        r = 255;
        gg = 0;
        bb = 60;
        crushed++;
      } else if (l < 0.045) {
        r = 40;
        gg = 200;
        bb = 40;
        low++;
      } else if (l > 0.9) {
        r = 40;
        gg = 120;
        bb = 255;
        hot++;
      }
      p[i] = r;
      p[i + 1] = gg;
      p[i + 2] = bb;
    }
    ctx.putImageData(d, 0, 0);
    // 2x nearest so small parts are actually identifiable in the overlay
    const c2 = document.createElement('canvas');
    c2.width = w * 2;
    c2.height = h * 2;
    const x2 = c2.getContext('2d');
    x2.imageSmoothingEnabled = false;
    x2.drawImage(c, 0, 0, w * 2, h * 2);
    const n = p.length / 4;
    return {
      url: c2.toDataURL('image/png'),
      crushed: +((crushed / n) * 100).toFixed(2),
      low: +((low / n) * 100).toFixed(2),
      hot: +((hot / n) * 100).toFixed(2),
    };
  }, b64);

  const out = path.join(path.dirname(file), path.basename(file, '.png') + '_mask.png');
  fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(
    `${file} -> ${out}  crushed ${res.crushed}%  near-crush ${res.low}%  blown ${res.hot}%`,
  );
}

await browser.close();
