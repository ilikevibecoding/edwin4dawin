#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Evidence set. `shots/` is ignored by git on purpose (a round is a hundred
// PNGs); the frames a round's verdict rests on are re-encoded as JPEG into the
// round's own folder so they travel with the reports.
//
//   node tools/evidence.mjs --out gauntlet/round2/frames --quality 82 \
//        shots/round1/truck_day/hero.png=before_hero_day.png \
//        shots/r2_hero/day/hero.png=after_hero_day.png
//
// Each argument is `src[=name]`; the JPEG takes `name` (extension replaced) or
// the source's basename. Nothing is scaled: a 640x360 frame stays 640x360.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const outDir = arg('out', 'gauntlet/frames');
const quality = Number(arg('quality', '82')) / 100;
const items = argv.filter((a, i) => !a.startsWith('--') && (i === 0 || !argv[i - 1].startsWith('--')));

if (!items.length) {
  console.error('nothing to encode');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
let total = 0;
for (const item of items) {
  const [src, named] = item.split('=');
  const name = (named || path.basename(src)).replace(/\.[a-z]+$/i, '') + '.jpg';
  const png = await readFile(src);
  const dataUrl = 'data:image/png;base64,' + png.toString('base64');
  const jpeg = await page.evaluate(
    ([url, q]) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/jpeg', q));
        };
        img.onerror = reject;
        img.src = url;
      }),
    [dataUrl, quality],
  );
  const buf = Buffer.from(jpeg.split(',')[1], 'base64');
  await writeFile(path.join(outDir, name), buf);
  total += buf.length;
  console.log(`[evidence] ${src} -> ${path.join(outDir, name)} (${(buf.length / 1024).toFixed(0)} KB)`);
}
await browser.close();
console.log(`[evidence] ${items.length} frames, ${(total / 1024 / 1024).toFixed(2)} MB`);
