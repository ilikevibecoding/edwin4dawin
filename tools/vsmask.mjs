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

// --chroma additionally writes a saturation map and reports where the frame's
// highest-chroma pixels actually are. "The band is more saturated than anything
// else in the frame including the orange recovery gear" is a claim about a
// distribution, and an ROI cannot test it because an ROI has to be aimed first.
// This finds the offender instead of assuming where it is.
const wantChroma = process.argv.includes('--chroma');
// --roi name=x,y,w,h (repeatable) measures a rect on an already-captured frame.
// The point is before/after on the same rect without a boot: a probe pass costs
// eight minutes and the "before" frames were rendered by someone else's run, so
// the only way to compare against them at all is offline.
const rois = {};
for (let i = 0; i < process.argv.length - 1; i++) {
  if (process.argv[i] !== '--roi') continue;
  const [name, rect] = process.argv[i + 1].split('=');
  const r = rect.split(',').map(Number);
  if (r.length === 4) rois[name] = r;
}
const files = process.argv
  .slice(2)
  .filter((f) => f.endsWith('.png') && !f.includes('_mask') && !f.includes('_chroma'));
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

  if (Object.keys(rois).length) {
    const stats = await page.evaluate(
      async ({ b64, rois }) => {
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
        const out = {};
        for (const [name, r] of Object.entries(rois)) {
          const d = ctx.getImageData(
            Math.round(r[0] * w),
            Math.round(r[1] * h),
            Math.max(1, Math.round(r[2] * w)),
            Math.max(1, Math.round(r[3] * h)),
          ).data;
          let R = 0, G = 0, B = 0, satSum = 0, n = 0, lmax = 0;
          // A thin band inside a box that also contains tyre and background
          // barely moves the box mean — the first reading of the arch strip came
          // back at 0.30 luma with a 0.805 peak. So the brightest tenth is
          // tracked separately: that is the band itself, and "is the dirtiest
          // part also the brightest part" is a question about exactly that
          // tenth, not about the average of everything around it.
          const px = [];
          for (let i = 0; i < d.length; i += 4) {
            R += d[i];
            G += d[i + 1];
            B += d[i + 2];
            const mx = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
            const mn = Math.min(d[i], d[i + 1], d[i + 2]) / 255;
            const s = mx < 1e-4 ? 0 : (mx - mn) / mx;
            satSum += s;
            const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
            if (l > lmax) lmax = l;
            px.push([l, s, d[i], d[i + 2]]);
            n++;
          }
          R /= n; G /= n; B /= n;
          px.sort((a, b) => b[0] - a[0]);
          const k = Math.max(1, Math.round(px.length * 0.1));
          let tl = 0, tsat = 0, tr = 0, tb = 0;
          for (let i = 0; i < k; i++) {
            tl += px[i][0];
            tsat += px[i][1];
            tr += px[i][2];
            tb += px[i][3];
          }
          out[name] = {
            rgb: [Math.round(R), Math.round(G), Math.round(B)],
            luma: +((R * 0.2126 + G * 0.7152 + B * 0.0722) / 255).toFixed(3),
            lumaMax: +lmax.toFixed(3),
            sat: +(satSum / n).toFixed(3),
            rb: +(R / Math.max(B, 1)).toFixed(2),
            topLuma: +(tl / k).toFixed(3),
            topSat: +(tsat / k).toFixed(3),
            topRb: +(tr / Math.max(tb, 1)).toFixed(2),
          };
        }
        return out;
      },
      { b64, rois },
    );
    for (const [name, s] of Object.entries(stats)) {
      console.log(
        `  ${name.padEnd(12)} luma ${String(s.luma).padEnd(6)} sat ${String(s.sat).padEnd(6)} r:b ${String(s.rb).padEnd(5)} | top10% luma ${String(s.topLuma).padEnd(6)} sat ${String(s.topSat).padEnd(6)} r:b ${s.topRb}`,
      );
    }
  }

  if (!wantChroma) continue;
  const ch = await page.evaluate(async (b64) => {
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
    // HSV saturation weighted by value: a saturated *dark* pixel is not what the
    // eye calls loud, but a saturated pixel that is also bright is. Ranking on
    // the product is what actually finds "the loudest wrong thing".
    const score = new Float32Array(w * h);
    const sats = [];
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      const r = p[i] / 255;
      const g = p[i + 1] / 255;
      const b = p[i + 2] / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const s = mx < 1e-4 ? 0 : (mx - mn) / mx;
      score[j] = s * mx;
      sats.push(score[j]);
    }
    sats.sort((a, b) => b - a);
    const p999 = sats[Math.floor(sats.length * 0.001)];
    const p99 = sats[Math.floor(sats.length * 0.01)];
    // 16x16 blocks, so a contiguous band outranks scattered single pixels
    const bw = Math.ceil(w / 16);
    const bh = Math.ceil(h / 16);
    const blocks = new Float64Array(bw * bh);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        blocks[((y >> 4) * bw) + (x >> 4)] += score[y * w + x];
      }
    }
    let top = [];
    for (let i = 0; i < blocks.length; i++) {
      top.push([blocks[i] / 256, (i % bw) * 16, Math.floor(i / bw) * 16]);
    }
    top.sort((a, b) => b[0] - a[0]);
    top = top.slice(0, 5).map(([v, x, y]) => ({
      mean: +v.toFixed(3),
      at: [+(x / w).toFixed(3), +(y / h).toFixed(3)],
      px: [x, y],
    }));
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      const v = Math.min(1, score[j] / Math.max(p999, 1e-4));
      const l = (p[i] * 0.2126 + p[i + 1] * 0.7152 + p[i + 2] * 0.0722) / 255;
      const g = Math.round(l * 110 + 20);
      p[i] = Math.round(g * (1 - v) + 255 * v);
      p[i + 1] = Math.round(g * (1 - v) + 40 * v);
      p[i + 2] = Math.round(g * (1 - v) + 220 * v);
    }
    ctx.putImageData(d, 0, 0);
    const c2 = document.createElement('canvas');
    c2.width = w * 2;
    c2.height = h * 2;
    const x2 = c2.getContext('2d');
    x2.imageSmoothingEnabled = false;
    x2.drawImage(c, 0, 0, w * 2, h * 2);
    return { url: c2.toDataURL('image/png'), p999: +p999.toFixed(3), p99: +p99.toFixed(3), top };
  }, b64);

  const cout = path.join(path.dirname(file), path.basename(file, '.png') + '_chroma.png');
  fs.writeFileSync(cout, Buffer.from(ch.url.split(',')[1], 'base64'));
  console.log(`  chroma*value p99 ${ch.p99} p99.9 ${ch.p999} -> ${cout}`);
  for (const t of ch.top) console.log(`    hot block mean ${t.mean} at ${JSON.stringify(t.at)} px ${JSON.stringify(t.px)}`);
}

await browser.close();
