#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Dump the generated foliage atlases as PNGs.
//
//   node tools/atlasdump.mjs [--out shots/atlas] [--url http://127.0.0.1:5181/]
//                            [--which needleAtlas,fernAtlas] [--zoom 1]
//
// The painters need a real 2D canvas, so this runs them in the page rather than
// in node. `--alpha` writes the alpha channel as greyscale alongside each one,
// which is the only way to see whether a cell's silhouette is fringed or smooth.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const outDir = arg('out', 'shots/atlas');
const baseUrl = arg('url', 'http://127.0.0.1:5181/');
const which = arg('which', 'needleAtlas,leafAtlas,fernAtlas,grassAtlas,shrubAtlas,stalkAtlas,treeBillboardAtlas');
const crop = arg('crop', '');
// alpha cutoff the material will use; writes a _t.png of exactly what survives it
const thresh = Number(arg('thresh', '0'));

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'],
});
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
page.on('pageerror', (e) => console.error('[atlasdump] page error:', e.message));

// Three other agents are editing this checkout, so vite fires an HMR reload every
// few seconds and it lands in the middle of the long evaluate below. Blocking the
// HMR client and loading a bare page — the atlas painters need nothing but a
// canvas — makes the dump immune to that.
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.route('**/src/main.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

const results = await page.evaluate(
  async ({ which, crop, thresh }) => {
    const nature = await import('/src/textures/nature.js');
    const out = [];
    // texture.image is either a canvas (canvasTexture) or {data,width,height}
    const asRGBA = (img) => {
      if (img.data) return { data: img.data, width: img.width, height: img.height, flipped: true };
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return { ...g.getImageData(0, 0, c.width, c.height), flipped: false };
    };
    const box = crop ? crop.split(',').map(Number) : null;
    for (const name of which.split(',')) {
      const fn = nature[name];
      if (!fn) continue;
      const tex = fn();
      const src = asRGBA(tex.image);
      let { data, width, height, flipped } = src;
      let x0 = 0;
      let y0 = 0;
      if (box) {
        [x0, y0, width, height] = box;
      }
      const rgb = document.createElement('canvas');
      const alp = document.createElement('canvas');
      const thc = document.createElement('canvas');
      rgb.width = alp.width = thc.width = width;
      rgb.height = alp.height = thc.height = height;
      const rc = rgb.getContext('2d');
      const ac = alp.getContext('2d');
      const tc = thc.getContext('2d');
      const ri = rc.createImageData(width, height);
      const ai = ac.createImageData(width, height);
      const ti = tc.createImageData(width, height);
      const cut = Math.round(thresh * 255);
      let kept = 0;
      // mean and spread of the sRGB luma of what survives the cutoff, per cell:
      // the only way to tell a card that will read as foliage from one that will
      // read as a flat shape without waiting on a 40 s software render
      const cells = [0, 1, 2, 3].map(() => ({ n: 0, sum: 0, sum2: 0, lo: 1, hi: 0 }));
      for (let y = 0; y < height; y++) {
        // DataTexture rows are already flipped relative to the canvas, so undo it
        const sy = flipped ? src.height - 1 - (y0 + y) : y0 + y;
        for (let x = 0; x < width; x++) {
          const s = (sy * src.width + x0 + x) * 4;
          const d = (y * width + x) * 4;
          ri.data[d] = data[s];
          ri.data[d + 1] = data[s + 1];
          ri.data[d + 2] = data[s + 2];
          ri.data[d + 3] = 255;
          ai.data[d] = ai.data[d + 1] = ai.data[d + 2] = data[s + 3];
          ai.data[d + 3] = 255;
          const on = data[s + 3] > cut;
          if (on) {
            kept++;
            const l = (data[s] * 0.2126 + data[s + 1] * 0.7152 + data[s + 2] * 0.0722) / 255;
            const c = cells[(y < height / 2 ? 0 : 2) + (x < width / 2 ? 0 : 1)];
            c.n++;
            c.sum += l;
            c.sum2 += l * l;
            if (l < c.lo) c.lo = l;
            if (l > c.hi) c.hi = l;
          }
          ti.data[d] = on ? data[s] : 255;
          ti.data[d + 1] = on ? data[s + 1] : 0;
          ti.data[d + 2] = on ? data[s + 2] : 190;
          ti.data[d + 3] = 255;
        }
      }
      rc.putImageData(ri, 0, 0);
      ac.putImageData(ai, 0, 0);
      tc.putImageData(ti, 0, 0);
      out.push({
        name,
        w: src.width,
        h: src.height,
        coverage: kept / (width * height),
        cells: cells.map((c) => ({
          fill: c.n / ((width * height) / 4),
          mean: c.n ? c.sum / c.n : 0,
          sd: c.n ? Math.sqrt(Math.max(0, c.sum2 / c.n - (c.sum / c.n) ** 2)) : 0,
          lo: c.lo,
          hi: c.hi,
        })),
        rgb: rgb.toDataURL('image/png'),
        alpha: alp.toDataURL('image/png'),
        thresh: thresh > 0 ? thc.toDataURL('image/png') : null,
      });
    }
    return out;
  },
  { which, crop, thresh },
);

for (const r of results) {
  await writeFile(path.join(outDir, `${r.name}.png`), Buffer.from(r.rgb.split(',')[1], 'base64'));
  await writeFile(path.join(outDir, `${r.name}_a.png`), Buffer.from(r.alpha.split(',')[1], 'base64'));
  if (r.thresh) await writeFile(path.join(outDir, `${r.name}_t.png`), Buffer.from(r.thresh.split(',')[1], 'base64'));
  console.log(
    `[atlasdump] ${r.name} ${r.w}x${r.h} coverage@${thresh} ${(r.coverage * 100).toFixed(1)}% -> ${outDir}/${r.name}*`,
  );
  r.cells.forEach((c, i) =>
    console.log(
      `           cell ${i}  fill ${(c.fill * 100).toFixed(0)}%  luma mean ${c.mean.toFixed(3)}` +
        `  sd ${c.sd.toFixed(3)}  range ${c.lo.toFixed(3)}-${c.hi.toFixed(3)}`,
    ),
  );
}

await browser.close();
