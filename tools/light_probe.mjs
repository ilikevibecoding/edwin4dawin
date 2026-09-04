#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Read numbers off a capture.
//
//   node tools/light_probe.mjs frame.png --box x,y,w,h [--box ...]
//   node tools/light_probe.mjs frame.png --crop x,y,w,h --scale 4 --out crop.png
//   node tools/light_probe.mjs frame.png --rows            # luma per 10 % band
//   node tools/light_probe.mjs frame.png --col x,w,y0,y1   # luma per row down a column
//
// Each --box reports mean luma, peak luma, HSV saturation and hue of a region,
// which is how "the far hills clip to white" or "the ground keeps its day red
// at night" become a number that can be compared before and after. --crop
// writes a nearest-neighbour blow-up so a star field or a shadow edge can be
// looked at without squinting at a 640 px frame.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--') && a.endsWith('.png'));
const all = (n) => argv.flatMap((a, i) => (a === `--${n}` ? [argv[i + 1]] : []));
const arg = (n, d) => all(n)[0] ?? d;
if (!file) {
  console.error('usage: light_probe.mjs frame.png --box x,y,w,h | --crop x,y,w,h --scale k --out f.png | --rows');
  process.exit(1);
}
const boxes = all('box').map((s) => s.split(',').map(Number));
const crop = arg('crop', null)?.split(',').map(Number);
const scale = Number(arg('scale', '4'));
const out = arg('out', null);
const rows = argv.includes('--rows');
const col = all('col').map((v) => v.split(',').map(Number))[0] || null;

const png = await readFile(file);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const res = await page.evaluate(
  async ({ data, boxes, crop, scale, rows, col }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const stat = (x, y, w, h) => {
      let sum = 0;
      let peak = 0;
      let sat = 0;
      let n = 0;
      let hx = 0;
      let hy = 0;
      let dark = 0;
      let hot = 0;
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) {
          const k = (j * c.width + i) * 4;
          const r = px[k] / 255;
          const g = px[k + 1] / 255;
          const b = px[k + 2] / 255;
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sum += l;
          if (l > peak) peak = l;
          if (l < 0.02) dark++;
          if (l > 0.95) hot++;
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const s = mx > 0 ? (mx - mn) / mx : 0;
          sat += s;
          if (mx - mn > 1e-4) {
            let hue;
            if (mx === r) hue = ((g - b) / (mx - mn)) % 6;
            else if (mx === g) hue = (b - r) / (mx - mn) + 2;
            else hue = (r - g) / (mx - mn) + 4;
            hue *= 60;
            if (hue < 0) hue += 360;
            hx += Math.cos((hue * Math.PI) / 180) * s;
            hy += Math.sin((hue * Math.PI) / 180) * s;
          }
          n++;
        }
      }
      let hue = (Math.atan2(hy, hx) * 180) / Math.PI;
      if (hue < 0) hue += 360;
      return {
        mean: +(sum / n).toFixed(3),
        peak: +peak.toFixed(3),
        sat: +(sat / n).toFixed(3),
        hue: Math.round(hue),
        under02: +(dark / n).toFixed(3),
        over95: +(hot / n).toFixed(3),
      };
    };
    const result = { width: c.width, height: c.height, boxes: boxes.map((b) => ({ box: b, ...stat(...b) })) };
    if (rows) {
      result.rows = [];
      const h = Math.floor(c.height / 10);
      for (let r = 0; r < 10; r++) result.rows.push({ y: r * h, ...stat(0, r * h, c.width, h) });
    }
    if (col) {
      // one line per row: a vertical profile through a horizon, so a band
      // and the sky over it are read off the same column
      const [x, w, y0, y1] = col;
      result.col = [];
      for (let y = y0; y < y1; y++) result.col.push({ y, ...stat(x, y, w, 1) });
    }
    if (crop) {
      const [x, y, w, h] = crop;
      const o = document.createElement('canvas');
      o.width = w * scale;
      o.height = h * scale;
      const octx = o.getContext('2d');
      octx.imageSmoothingEnabled = false;
      octx.drawImage(c, x, y, w, h, 0, 0, w * scale, h * scale);
      result.crop = o.toDataURL('image/png');
    }
    return result;
  },
  { data: png.toString('base64'), boxes, crop, scale, rows, col },
);
await browser.close();
if (res.crop && out) {
  await writeFile(out, Buffer.from(res.crop.split(',')[1], 'base64'));
  console.log(`crop -> ${out}`);
}
console.log(`${file} ${res.width}x${res.height}`);
const line = (b) =>
  `mean ${b.mean.toFixed(3)} peak ${b.peak.toFixed(3)} sat ${b.sat.toFixed(3)} hue ${String(b.hue).padStart(3)} <0.02 ${b.under02.toFixed(3)} >0.95 ${b.over95.toFixed(3)}`;
for (const b of res.boxes) console.log(`  box ${b.box.join(',').padEnd(18)} ${line(b)}`);
for (const r of res.rows || []) console.log(`  row y=${String(r.y).padStart(4)} ${line(r)}`);
for (const r of res.col || []) console.log(`  col y=${String(r.y).padStart(4)} ${line(r)}`);
