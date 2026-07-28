#!/usr/bin/env node
/**
 * Capture and measure the weapon in one boot.
 *
 * A software-rasterised frame costs tens of seconds and booting the engine
 * costs twenty more, so the slow part of judging a viewmodel is not the looking
 * — it is paying for the boot again every time a number needs checking. This
 * poses every vantage in a single session and, for each, writes the PNG *and*
 * reports what the screenshot cannot show: where the sight actually projected,
 * how far each part of the weapon is from the viewmodel pass's focus plane, and
 * how bright the weapon came out against the world behind it.
 *
 * The focus figures are the ones worth watching. `ViewmodelPass` focuses at
 * 0.62 m hip-fire and 0.34 m aimed and blurs by `(d - focus) * scale / d`
 * pixels, so a pose is either inside that window or it is a smear, and no
 * amount of modelling detail survives being outside it.
 *
 * Usage:
 *   node tools/weapon-shot.mjs --shots wpn_hip,wpn_ads --out shots/weapons --size 640x360
 *   node tools/weapon-shot.mjs --tune '{"gain":0.5}' --shots wpn_ads
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, f) => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return f;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const SIZE = String(arg('size', '640x360')).split('x').map(Number);
const OPTS = {
  url: arg('url', 'http://127.0.0.1:5173/?showcase=weapons'),
  out: arg('out', 'shots/weapons'),
  width: SIZE[0],
  height: SIZE[1],
  shots: String(arg('shots', 'wpn_hip,wpn_ads')).split(',').filter(Boolean),
  quality: arg('quality', 'medium'),
  warmup: Number(arg('warmup', 6)),
  tune: arg('tune', null),
  noPng: !!arg('no-png', false),
  mask: !!arg('mask', false),
  gains: String(arg('gains', '')).split(',').filter(Boolean).map(Number),
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) =>
  existsSync(p),
);

await mkdir(OPTS.out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    '--mute-audio',
    `--window-size=${OPTS.width},${OPTS.height}`,
  ],
  protocolTimeout: 900000,
  defaultViewport: { width: OPTS.width, height: OPTS.height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.setDefaultTimeout(900000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') errors.push(`[${t}] ${m.text()}`);
});

const url = new URL(OPTS.url);
url.searchParams.set('capture', '1');
url.searchParams.set('quality', String(OPTS.quality));
const t0 = Date.now();
await page.goto(url.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { polling: 250 });
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (OPTS.tune) {
  const applied = await page.evaluate((t) => window.__WEAPONS__.tune(JSON.parse(t)), OPTS.tune);
  console.log('tune:', JSON.stringify(applied));
}

const passes = OPTS.gains.length ? OPTS.gains : [null];
for (const shot of OPTS.shots) {
 for (const gain of passes) {
  const st = Date.now();
  const ok = await page.evaluate((n) => window.__GAME__.pose(n), shot);
  if (!ok) {
    console.log(`${shot}: unknown vantage`);
    continue;
  }
  if (gain !== null) await page.evaluate((g) => window.__WEAPONS__.tune({ gain: g }), gain);
  for (let i = 0; i < OPTS.warmup; i += 3) {
    await page.evaluate((n) => window.__GAME__.stepFrames(n), Math.min(3, OPTS.warmup - i));
  }

  /* The weapon's own pixels, found by taking the frame twice — once with the
     weapon hidden — and keeping what changed. A bounding rectangle is not good
     enough to judge exposure by: at hip the weapon fills a quarter of its own
     box and the rest is sunlit street, so the number that comes back is the
     street's. This also exercises `setVisible`, which the harness relies on. */
  let mask = null;
  if (OPTS.mask) {
    mask = await page.evaluate(
      async (w, h) => {
        const grab = () => {
          const cv = document.getElementById('viewport');
          const s = document.createElement('canvas');
          s.width = w;
          s.height = h;
          const c = s.getContext('2d', { willReadFrequently: true });
          c.drawImage(cv, 0, 0, w, h);
          return c.getImageData(0, 0, w, h).data;
        };
        const on = grab();
        window.__WEAPONS__.system.setVisible(false);
        window.__GAME__.stepFrames(2);
        const off = grab();
        window.__WEAPONS__.system.setVisible(true);
        window.__GAME__.stepFrames(2);

        const lum = (p, o) => (p[o] * 0.2126 + p[o + 1] * 0.7152 + p[o + 2] * 0.0722) / 255;
        let n = 0;
        let sum = 0;
        let hot = 0;
        let dark = 0;
        let grad = 0;
        let gradN = 0;
        const hit = new Uint8Array(w * h);
        for (let i = 0, p = 0; i < on.length; i += 4, p++) {
          if (
            Math.abs(on[i] - off[i]) > 6 ||
            Math.abs(on[i + 1] - off[i + 1]) > 6 ||
            Math.abs(on[i + 2] - off[i + 2]) > 6
          ) {
            hit[p] = 1;
            const l = lum(on, i);
            sum += l;
            n++;
            if (l > 0.92) hot++;
            if (l < 0.06) dark++;
          }
        }
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (!hit[p] || !hit[p - 1] || !hit[p - w]) continue;
            const o = p * 4;
            grad += Math.abs(lum(on, o) - lum(on, o - 4)) + Math.abs(lum(on, o) - lum(on, o - w * 4));
            gradN++;
          }
        }
        return {
          px: n,
          cover: +((n / (w * h)) * 100).toFixed(1),
          lum: +(sum / Math.max(1, n)).toFixed(3),
          clipped: +(hot / Math.max(1, n)).toFixed(3),
          crushed: +(dark / Math.max(1, n)).toFixed(3),
          detail: +((grad / Math.max(1, gradN)) * 100).toFixed(2),
        };
      },
      OPTS.width,
      OPTS.height,
    );
  }

  const info = await page.evaluate(
    (w, h) => {
      const W = window.__WEAPONS__;
      const i = W.info();
      const sight = W.sightPixel(w, h);
      const rect = W.screenRect(w, h);
      const b = W.bounds();
      const ads = i.ads;
      // The viewmodel pass's own numbers, so "blurry" is a pixel count.
      const focus = 0.62 + (0.34 - 0.62) * ads;
      const scale = 2.5 + (9 - 2.5) * ads;
      const coc = (d) => +(((d - focus) * scale) / Math.max(d, 0.02)).toFixed(2);
      const probes = {
        origin: [0, 0, 0],
        muzzleTip: [0, b.minY + (b.maxY - b.minY) * 0.5, b.minZ],
        butt: [0, 0, b.maxZ],
      };
      const depth = {};
      for (const [k, p] of Object.entries(probes)) {
        const d = W.depthAt(p[0], p[1], p[2]);
        depth[k] = { d: +d.toFixed(3), coc: coc(d) };
      }

      // Luminance of the pixels the weapon covers, against the frame as a whole.
      const cv = document.getElementById('viewport');
      const s = document.createElement('canvas');
      s.width = w;
      s.height = h;
      const c2 = s.getContext('2d', { willReadFrequently: true });
      c2.drawImage(cv, 0, 0, w, h);
      const px = c2.getImageData(0, 0, w, h).data;
      const lum = (o) => (px[o] * 0.2126 + px[o + 1] * 0.7152 + px[o + 2] * 0.0722) / 255;
      let inSum = 0;
      let inN = 0;
      let inHot = 0;
      let allSum = 0;
      const x0 = Math.max(0, Math.floor(rect.x0));
      const x1 = Math.min(w - 1, Math.ceil(rect.x1));
      const y0 = Math.max(0, Math.floor(rect.y0));
      const y1 = Math.min(h - 1, Math.ceil(rect.y1));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const l = lum((y * w + x) * 4);
          allSum += l;
          if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
            inSum += l;
            inN++;
            if (l > 0.9) inHot++;
          }
        }
      }
      // Local contrast inside the weapon rect: a proxy for how sharp it is.
      let grad = 0;
      let gradN = 0;
      for (let y = y0 + 1; y < y1; y++) {
        for (let x = x0 + 1; x < x1; x++) {
          const o = (y * w + x) * 4;
          grad += Math.abs(lum(o) - lum(o - 4)) + Math.abs(lum(o) - lum(o - w * 4));
          gradN++;
        }
      }
      return {
        id: i.id,
        ads: +ads.toFixed(2),
        optic: i.optic,
        env: +Number(i.envLevel).toFixed(2),
        vmFov: +(window.__GAME__.engine.viewmodelCamera.fov).toFixed(2),
        eyeRelief: +i.adsEyeRelief.toFixed(3),
        sightPx: { x: +sight.x.toFixed(2), y: +sight.y.toFixed(2) },
        sightErr: +Math.max(sight.rearErr, sight.frontErr).toFixed(3),
        frontPx: { x: +sight.frontX.toFixed(2), y: +sight.frontY.toFixed(2) },
        rect: {
          x0: Math.round(rect.x0),
          y0: Math.round(rect.y0),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        },
        coverage: +(((rect.width * rect.height) / (w * h)) * 100).toFixed(1),
        depth,
        weaponLum: +(inSum / Math.max(1, inN)).toFixed(3),
        frameLum: +(allSum / (w * h)).toFixed(3),
        clipped: +(inHot / Math.max(1, inN)).toFixed(3),
        detail: +((grad / Math.max(1, gradN)) * 100).toFixed(2),
      };
    },
    OPTS.width,
    OPTS.height,
  );

  const tag = gain === null ? shot : `${shot}_g${gain}`;
  if (!OPTS.noPng) {
    const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
    await writeFile(path.join(OPTS.out, `${tag}.png`), buf);
  }
  console.log(`\n=== ${tag} (${((Date.now() - st) / 1000).toFixed(1)}s) ===`);
  console.log(JSON.stringify(mask ? { ...info, weapon: mask } : info));
 }
}

if (errors.length) {
  console.log(`\n${errors.length} console error(s):`);
  for (const e of errors.slice(0, 12)) console.log('  ', e);
}
await browser.close();
