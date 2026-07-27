#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Vehicle-surface probe. Same capture path as tools/shots.mjs, plus the two
// things that shot harness cannot give you:
//
//   1. mean RGB / luma / r:b over named screen rectangles, so "the tyre is
//      beige" becomes "the tyre is at 0.62 luma, r:b 1.52" and a change can be
//      checked against a number instead of an impression,
//   2. nearest-neighbour magnified crops, so 1 cm grain and map tiling are
//      actually visible at the low capture resolutions this box can afford.
//
//   node tools/vsprobe.mjs --views wheel,detail --out shots/vs_1 \
//     --width 512 --height 288 --url "http://127.0.0.1:5182/?quality=fast" \
//     [--eval "<js run in page after boot>"] [--zoom 4]
//
// --zoomfile <png> re-magnifies an already-captured frame and exits.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const baseUrl = arg('url', 'http://127.0.0.1:5182/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', 'shots/vs_probe');
const only = arg('views', 'wheel,detail,hero');
const evalJs = arg('eval', '');
const zoom = Number(arg('zoom', '3'));
const zoomFile = arg('zoomfile', '');
// Same sweep file format as tools/vsmat.mjs, but against the real views: a JSON
// array of { name, patch: { materialName: { prop: value } } }. Booting costs
// 30 s and a 512x288 wheel view 145 s, so at 256x144 three variants of the same
// view land in about two minutes — which is the difference between measuring
// what is lifting a surface and guessing at it.
const sweepFile = arg('sweep', '');

// Regions of interest, in fractions of the frame. Named for the substance that
// should be there, because the whole point is to check that each substance is
// landing on its own value rather than on the frame's average.
const ROI = {
  wheel: {
    tyreTread: [0.36, 0.52, 0.05, 0.22],
    tyreSide: [0.55, 0.35, 0.05, 0.08],
    // Purely on the arch flare's outer land. The old box was at the top of the
    // frame and half of it was tyre, so every flare reading so far has been an
    // average of the flare and the thing it is meant to be distinguished from —
    // which is how a 16x cut in the plastic's albedo showed up as a 25% change.
    flare: [0.225, 0.19, 0.045, 0.1],
    flareLow: [0.62, 0.29, 0.04, 0.08],
    rimAlu: [0.5, 0.5, 0.06, 0.07],
    rocker: [0.74, 0.44, 0.2, 0.1],
    paint: [0.79, 0.04, 0.18, 0.08],
    mirrorSteel: [0.04, 0.22, 0.14, 0.17],
  },
  detail: {
    hoodTop: [0.47, 0.27, 0.2, 0.05],
    fenderSide: [0.78, 0.29, 0.16, 0.12],
    bumperSteel: [0.38, 0.62, 0.24, 0.09],
    grillePlastic: [0.48, 0.42, 0.16, 0.1],
    skidPlate: [0.48, 0.83, 0.2, 0.05],
  },
  hero: {
    doorSide: [0.55, 0.4, 0.11, 0.07],
    hoodTop: [0.31, 0.53, 0.09, 0.04],
    bedSide: [0.66, 0.38, 0.08, 0.06],
    tyre: [0.46, 0.68, 0.1, 0.16],
    flare: [0.43, 0.585, 0.09, 0.05],
    // Straight on the hard band across the bonnet's leading edge — the light
    // leak this assignment opened with, relocated from the tailgate to the
    // wing. A frame-wide `hot` count cannot say which material owns it, so the
    // sweep needs a box with nothing but the streak inside it.
    hoodEdge: [0.28, 0.46, 0.13, 0.05],
    roofRail: [0.67, 0.16, 0.06, 0.04],
  },
};

// Crops worth magnifying: the close views only, since that is where grain and
// tiling are judged.
const CROPS = {
  wheel: {
    tyre: [0.2, 0.35, 0.42, 0.6],
    flare: [0.28, 0.0, 0.4, 0.35],
    // The three substances that share the right half of this frame and kept
    // measuring as one tan value: sill, step and the panel above them.
    rocker: [0.62, 0.3, 0.38, 0.45],
    mirror: [0.0, 0.1, 0.24, 0.4],
  },
  detail: { nose: [0.3, 0.25, 0.45, 0.5], bumper: [0.2, 0.5, 0.5, 0.45] },
  hero: { flank: [0.4, 0.3, 0.35, 0.4], nose: [0.16, 0.42, 0.3, 0.35] },
};

const launchArgs = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--js-flags=--max-old-space-size=4096',
];

const log = (...a) => console.log('[vsprobe]', ...a);

/** Draw an image into a canvas and read stats / crops back out. */
const PAGE_HELPERS = `
window.__vs = {
  ctxFor(img, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    return { c, ctx };
  },
  stats(ctx, w, h, rois) {
    const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const out = {};
    const all = ctx.getImageData(0, 0, w, h).data;
    let clipped = 0, crushed = 0, sum = 0, hot = 0;
    // A light leak is a few hundred pixels, so a frame mean will never see it
    // and "clipped" only catches the very tip. The histogram top end is what
    // actually tracks a hard white streak appearing or going away.
    const hist = new Float64Array(256);
    for (let i = 0; i < all.length; i += 4) {
      const l = (all[i] * 0.2126 + all[i + 1] * 0.7152 + all[i + 2] * 0.0722) / 255;
      sum += l;
      hist[Math.min(255, Math.round(l * 255))]++;
      if (all[i] > 250 && all[i + 1] > 250 && all[i + 2] > 250) clipped++;
      if (l > 0.9) hot++;
      if (l < 0.016) crushed++;
    }
    const n = all.length / 4;
    let acc = 0, p999 = 0;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= n * 0.001) { p999 = i / 255; break; }
    }
    out.__frame = {
      mean: +(sum / n).toFixed(4),
      p999: +p999.toFixed(3),
      hotPct: +((hot / n) * 100).toFixed(3),
      clippedPct: +((clipped / n) * 100).toFixed(3),
      crushedPct: +((crushed / n) * 100).toFixed(3),
    };
    for (const [name, r] of Object.entries(rois)) {
      const x = Math.max(0, Math.round(r[0] * w));
      const y = Math.max(0, Math.round(r[1] * h));
      const rw = Math.max(1, Math.min(w - x, Math.round(r[2] * w)));
      const rh = Math.max(1, Math.min(h - y, Math.round(r[3] * h)));
      const d = ctx.getImageData(x, y, rw, rh).data;
      let R = 0, G = 0, B = 0, L = 0, lmin = 1, lmax = 0, sat = 0;
      const m = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        const r8 = d[i] / 255, g8 = d[i + 1] / 255, b8 = d[i + 2] / 255;
        R += r8; G += g8; B += b8;
        const l = r8 * 0.2126 + g8 * 0.7152 + b8 * 0.0722;
        L += l;
        if (l < lmin) lmin = l;
        if (l > lmax) lmax = l;
        const mx = Math.max(r8, g8, b8), mn = Math.min(r8, g8, b8);
        sat += mx > 0.001 ? (mx - mn) / mx : 0;
      }
      const lr = srgbToLin(R / m), lg = srgbToLin(G / m), lb = srgbToLin(B / m);
      out[name] = {
        rgb: [Math.round((R / m) * 255), Math.round((G / m) * 255), Math.round((B / m) * 255)],
        luma: +(L / m).toFixed(3),
        range: +(lmax - lmin).toFixed(3),
        sat: +(sat / m).toFixed(3),
        rb: +(lb > 1e-4 ? lr / lb : 99).toFixed(2),
        rg: +(lg > 1e-4 ? lr / lg : 99).toFixed(2),
      };
    }
    return out;
  },
  // The frame with every sample box drawn on it. Two readings in a row were
  // taken from a box that turned out to be half on the tyre, which made a 16x
  // change in the flare's albedo look like a 25% change — so the overlay is not
  // a nicety, it is the only way to know what a number refers to.
  overlay(img, w, h, rois, scale) {
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w * scale, h * scale);
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    for (const [name, r] of Object.entries(rois)) {
      const x = r[0] * w * scale;
      const y = r[1] * h * scale;
      const rw = r[2] * w * scale;
      const rh = r[3] * h * scale;
      ctx.strokeStyle = '#ff2fd0';
      ctx.strokeRect(x + 0.5, y + 0.5, rw, rh);
      ctx.fillStyle = '#ff2fd0';
      ctx.fillText(name, x + 2, y - 2 < 10 ? y + rh + 10 : y - 2);
    }
    return c.toDataURL('image/png');
  },
  crop(img, w, h, r, scale) {
    const cw = Math.max(1, Math.round(r[2] * w));
    const ch = Math.max(1, Math.round(r[3] * h));
    const c = document.createElement('canvas');
    c.width = cw * scale; c.height = ch * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(r[0] * w), Math.round(r[1] * h), cw, ch, 0, 0, cw * scale, ch * scale);
    return c.toDataURL('image/png');
  },
};
`;

async function loadImage(page, dataUrl) {
  return page.evaluate(
    (u) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          window.__vsImg = img;
          res([img.naturalWidth, img.naturalHeight]);
        };
        img.onerror = rej;
        img.src = u;
      }),
    dataUrl,
  );
}

async function zoomOnly() {
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
  await page.goto('about:blank');
  await page.addScriptTag({ content: PAGE_HELPERS });
  const buf = await readFile(zoomFile);
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const [w, h] = await loadImage(page, dataUrl);
  const view = path.basename(zoomFile, '.png');
  const crops = CROPS[view] || { all: [0, 0, 1, 1] };
  await mkdir(outDir, { recursive: true });
  for (const [name, r] of Object.entries(crops)) {
    const u = await page.evaluate(
      ({ r, s, w, h }) => window.__vs.crop(window.__vsImg, w, h, r, s),
      { r, s: zoom, w, h },
    );
    const f = path.join(outDir, `${view}_${name}_x${zoom}.png`);
    await writeFile(f, Buffer.from(u.split(',')[1], 'base64'));
    log('crop ->', f);
  }
  await browser.close();
}

async function main() {
  if (zoomFile) return zoomOnly();
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  // Four agents share this checkout, a view takes 30-100 s to rasterise in
  // software, and any one of their saves fires a vite full reload that destroys
  // the execution context halfway through a capture. Stubbing out the HMR client
  // is the only way to get a run that finishes: the app's own module graph is
  // untouched, there is just nothing listening for an update.
  await page.route(/@vite\/client/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `export const createHotContext = () => ({ on(){}, off(){}, send(){}, accept(){}, acceptExports(){}, dispose(){}, prune(){}, invalidate(){}, decline(){}, data: {} });
export const injectQuery = (u) => u;
export const updateStyle = () => {};
export const removeStyle = () => {};`,
    }),
  );

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      errors.push(`${m.type()}: ${m.text()}`);
      log(`page ${m.type()}:`, m.text());
    }
  });
  page.on('pageerror', (e) => {
    errors.push(`pageerror: ${e.message}`);
    log('page error:', e.message);
  });

  const t0 = Date.now();
  log(`loading ${url} at ${width}x${height}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    console.error('[vsprobe] app failed to boot:\n' + err);
    await browser.close();
    process.exit(1);
  }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.addScriptTag({ content: PAGE_HELPERS });

  if (evalJs) {
    const r = await page.evaluate(evalJs);
    log('eval ->', JSON.stringify(r));
  }

  const views = only.split(',').filter(Boolean);
  const variants = sweepFile ? JSON.parse(await readFile(sweepFile, 'utf8')) : [{ name: '', patch: {} }];
  const report = {};
  for (const view of views) {
   for (const variant of variants) {
    const ts = Date.now();
    const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
    if (!ok) {
      log(`unknown view "${view}"`);
      continue;
    }
    if (variant.patch && Object.keys(variant.patch).length) {
      const applied = await page.evaluate(
        `(({ patch }) => {
          const { scene } = window.debugAPI.objects;
          const f = {};
          scene.traverse((o) => {
            if (!o.material) return;
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.name && !f[m.name]) f[m.name] = m;
          });
          const done = [];
          for (const [name, props] of Object.entries(patch)) {
            const m = f[name];
            if (!m) continue;
            for (const [k, val] of Object.entries(props)) {
              if (k.startsWith('u')) {
                for (const bag of ['bw', 'dirt', 'cb']) {
                  const u = m.userData[bag];
                  if (u && u[k]) { u[k].value = val; done.push(name + '.' + k); }
                }
              } else if (k === 'color' || k === 'emissive') { m[k].setHex(val); done.push(name + '.' + k); }
              else { m[k] = val; done.push(name + '.' + k); }
            }
            m.needsUpdate = true;
          }
          return done;
        })(${JSON.stringify({ patch: variant.patch })})`,
      );
      log(`patch ${variant.name}:`, applied.join(' '));
    }
    const tag = variant.name ? `${view}_${variant.name}` : view;
    const dataUrl = await page.evaluate(() => window.debugAPI.captureFrame(2));
    const file = path.join(outDir, `${tag}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

    const [w, h] = await loadImage(page, dataUrl);
    const s = await page.evaluate(
      ({ rois, w, h }) => {
        const { ctx } = window.__vs.ctxFor(window.__vsImg, w, h);
        return window.__vs.stats(ctx, w, h, rois);
      },
      { rois: ROI[view] || {}, w, h },
    );
    report[tag] = s;

    for (const [name, r] of Object.entries(CROPS[view] || {})) {
      const u = await page.evaluate(
        ({ r, s, w, h }) => window.__vs.crop(window.__vsImg, w, h, r, s),
        { r, s: zoom, w, h },
      );
      await writeFile(path.join(outDir, `${tag}_${name}.png`), Buffer.from(u.split(',')[1], 'base64'));
    }
    {
      const u = await page.evaluate(
        ({ rois, w, h }) => window.__vs.overlay(window.__vsImg, w, h, rois, 2),
        { rois: ROI[view] || {}, w, h },
      );
      await writeFile(path.join(outDir, `${tag}_roi.png`), Buffer.from(u.split(',')[1], 'base64'));
    }

    log(`${tag} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s)`);
    const f = s.__frame;
    log(
      `  frame mean ${f.mean} p99.9 ${f.p999} hot ${f.hotPct}% clipped ${f.clippedPct}% crushed ${f.crushedPct}%`,
    );
    for (const [name, v] of Object.entries(s)) {
      if (name === '__frame') continue;
      log(
        `  ${name.padEnd(15)} rgb ${String(v.rgb).padEnd(15)} luma ${String(v.luma).padEnd(6)}` +
          ` range ${String(v.range).padEnd(6)} sat ${String(v.sat).padEnd(6)} r:b ${v.rb}`,
      );
    }
   }
  }

  report.__stats = await page.evaluate(() => window.debugAPI.stats());
  report.__errors = errors;
  await writeFile(path.join(outDir, 'probe.json'), JSON.stringify(report, null, 2));
  log('runtime', JSON.stringify(report.__stats));
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
