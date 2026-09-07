#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Dump one cell of the cabin panel atlas, per channel, at a chosen zoom.
//
//   node tools/gaugeface.mjs --cell gauges --zoom 2 --out shots/face
//
// The cluster is 130 px tall on a finished frame and 60 on a working capture,
// so judging the printing off a beauty shot means judging it through three
// mips. This paints the same canvas the texture is built from and writes it
// straight out — and it boots a bare page rather than the app, so it costs two
// seconds instead of ninety.
//
// `--onscreen N` also writes the cell resampled to the width it actually covers
// on an N-line frame, which is the only honest legibility test.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const outDir = arg('out', 'shots/face');
const baseUrl = arg('url', 'http://127.0.0.1:5192/');
const cells = arg('cell', 'gauges,aux').split(',');
const channels = arg('chan', 'col,emi').split(',');
const zoom = Number(arg('zoom', '2'));
// panel height in metres and eye distance, for the on-screen size estimate
const onscreen = Number(arg('onscreen', '0'));

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
page.on('pageerror', (e) => console.error('[gaugeface] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.route('**/src/main.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

const shots = await page.evaluate(
  async ({ cells, channels, zoom, onscreen }) => {
    const veh = await import('/src/textures/vehicle.js');
    const out = [];
    for (const ch of channels) {
      // paint the whole atlas once per channel, then cut cells out of it
      const full = document.createElement('canvas');
      full.width = veh.CABIN_ATLAS;
      full.height = veh.CABIN_ATLAS;
      veh.paintCabinAtlas(full.getContext('2d'), ch, veh.CABIN_ATLAS);
      for (const name of cells) {
        const [x, y, w, h] = veh.CABIN_CELLS[name];
        for (const [tag, cw, chh] of [
          ['', Math.round(w * zoom), Math.round(h * zoom)],
          ...(onscreen > 0 ? [['_screen', Math.round(onscreen), Math.round((onscreen * h) / w)]] : []),
        ]) {
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = chh;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = 'high';
          g.drawImage(full, x, y, w, h, 0, 0, cw, chh);
          out.push({ name: `${name}_${ch}${tag}`, data: c.toDataURL('image/png') });
        }
      }
    }
    return out;
  },
  { cells, channels, zoom, onscreen },
);

for (const s of shots) {
  const file = path.join(outDir, `${s.name}.png`);
  await writeFile(file, Buffer.from(s.data.split(',')[1], 'base64'));
  console.log(`[gaugeface] ${file}`);
}

await browser.close();
