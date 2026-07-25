#!/usr/bin/env node
/**
 * tools/jpeg.mjs — re-encode a shot directory's PNGs as JPEG for committing.
 *
 *   node tools/jpeg.mjs shots/iter_9
 *
 * 1600x900 PNGs run ~1.3 MB each and a full pass writes 16 of them, so committing
 * the PNGs adds ~20 MB per iteration to the repo. The analyser reads PNG (see
 * tools/png.mjs) so the pass still writes PNG; this makes the committed record.
 * There is no image encoder in node here and no ImageMagick on the box, so the
 * encode goes through Chrome's canvas.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const qArg = process.argv.indexOf('--quality');
const QUALITY = qArg >= 0 ? Number(process.argv[qArg + 1]) : 0.92;
if (!dirs.length) {
  console.error('usage: node tools/jpeg.mjs <dir> [<dir>...] [--quality 0.92]');
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.goto('about:blank');

let n = 0, before = 0, after = 0;
for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    const src = path.join(dir, file);
    const png = fs.readFileSync(src);
    before += png.length;
    const data = await page.evaluate(async ([b64, q]) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/jpeg', q).split(',')[1];
    }, [png.toString('base64'), QUALITY]);
    const out = Buffer.from(data, 'base64');
    fs.writeFileSync(src.replace(/\.png$/, '.jpg'), out);
    after += out.length;
    n++;
  }
}
await browser.close();
console.log(`· ${n} files: ${(before / 1e6).toFixed(1)} MB png -> ${(after / 1e6).toFixed(1)} MB jpeg q${QUALITY}`);
