#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Vegetation probe: boot once, then ablate foliage uniform terms one at a time
// on a fixed view and report luma over named rectangles, so the question "which
// term makes the grass glow at night" is answered by measurement rather than by
// reading the shader.
//
//   node tools/veg_probe.mjs --url "http://127.0.0.1:5208/?quality=fast&time=night" \
//        --view forest --out shots/r2_veg/probe_night
//        [--rects "road:150,250,100,80;grassL:20,200,100,60"] [--ablate sky,direct,trans]
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const baseUrl = arg('url', 'http://127.0.0.1:5208/?quality=fast');
const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'forest');
const width = Number(arg('width', '640'));
const height = Number(arg('height', '360'));
const outDir = arg('out', 'shots/r2_veg/probe');
const rects = arg('rects', 'road:150,250,100,80;grassL:20,200,100,60;grassR:450,200,150,100');
const ablate = arg('ablate', 'none,sky,direct,trans,wrap,hemienv').split(',');
const dumpOnly = argv.includes('--dump');

const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=4096'];
const log = (...a) => console.log('[veg_probe]', ...a);

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: launchArgs });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') log('console error:', m.text()); });
  await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "import '/@vite/env';" }));
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) { console.error(err); await browser.close(); process.exit(1); }
  log(`booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await page.evaluate((v) => window.debugAPI.setView(v), view);

  // what the retune actually left in the foliage bags
  const dump = await page.evaluate(() => {
    const mats = window.debugAPI.objects.forest.materials;
    const out = {};
    for (const [name, m] of Object.entries(mats)) {
      if (!m || !m.userData || !m.userData.foliage) continue;
      const u = m.userData.foliage;
      const c = (k) => (u[k] && u[k].value && u[k].value.isColor ? [u[k].value.r, u[k].value.g, u[k].value.b].map((x) => +x.toFixed(3)) : u[k] ? u[k].value : undefined);
      out[name] = { uSky: c('uSky'), uGnd: c('uGnd'), uSunTint: c('uSunTint'), uDirect: c('uDirect'), uTrans: c('uTrans'), uWrap: c('uWrap'), uFog: c('uFog'), uRim: c('uRim'), env: m.envMapIntensity };
    }
    const sky = window.debugAPI.objects.skyRig;
    out.__scene = { time: window.debugAPI.timeOfDay, sun: sky.sun.intensity, sunColor: sky.sun.color.getHex().toString(16), hemi: sky.hemi.intensity, hemiSky: sky.hemi.color.getHex().toString(16), hemiGnd: sky.hemi.groundColor.getHex().toString(16) };
    return out;
  });
  log('uniforms:', JSON.stringify(dump, null, 1));
  await writeFile(path.join(outDir, 'uniforms.json'), JSON.stringify(dump, null, 2));
  if (dumpOnly) { await browser.close(); return; }

  const rectList = rects.split(';').filter(Boolean).map((s) => { const [n, v] = s.split(':'); const [x, y, w, h] = v.split(',').map(Number); return { n, x, y, w, h }; });

  const results = {};
  for (const mode of ablate) {
    const r = await page.evaluate(async ({ mode, rectList }) => {
      const mats = Object.values(window.debugAPI.objects.forest.materials).filter((m) => m && m.userData && m.userData.foliage);
      const saved = mats.map((m) => {
        const u = m.userData.foliage;
        return { m, sky: u.uSky.value.clone(), gnd: u.uGnd.value.clone(), direct: u.uDirect.value, trans: u.uTrans.value, wrap: u.uWrap.value, env: m.envMapIntensity };
      });
      const sky = window.debugAPI.objects.skyRig;
      const hemiI = sky.hemi.intensity;
      for (const s of saved) {
        const u = s.m.userData.foliage;
        if (mode === 'sky') { u.uSky.value.setScalar(0); u.uGnd.value.setScalar(0); }
        if (mode === 'direct') u.uDirect.value = 0;
        if (mode === 'trans') u.uTrans.value = 0;
        if (mode === 'wrap') u.uWrap.value = 0.0;
        if (mode === 'hemienv') { s.m.envMapIntensity = 0; }
      }
      if (mode === 'hemienv') sky.hemi.intensity = 0;
      const dataUrl = window.debugAPI.captureFrame(1);
      // luma over rectangles
      const c = document.createElement('canvas');
      const el = window.debugAPI.objects.renderer.domElement;
      const size = { x: el.width, y: el.height };
      c.width = el.width; c.height = el.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(el, 0, 0);
      const lum = {};
      for (const r of rectList) {
        const d = ctx.getImageData(r.x, r.y, r.w, r.h).data;
        let sum = 0, sr = 0, sg = 0, sb = 0;
        for (let i = 0; i < d.length; i += 4) { sum += (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; }
        const n = d.length / 4;
        lum[r.n] = { luma: +(sum / n).toFixed(4), rgb: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] };
      }
      for (const s of saved) {
        const u = s.m.userData.foliage;
        u.uSky.value.copy(s.sky); u.uGnd.value.copy(s.gnd); u.uDirect.value = s.direct; u.uTrans.value = s.trans; u.uWrap.value = s.wrap; s.m.envMapIntensity = s.env;
      }
      sky.hemi.intensity = hemiI;
      return { dataUrl, lum, size: [size.x, size.y] };
    }, { mode, rectList });
    await writeFile(path.join(outDir, `${view}_${mode}.png`), Buffer.from(r.dataUrl.split(',')[1], 'base64'));
    results[mode] = r.lum;
    log(mode, JSON.stringify(r.lum));
  }
  await writeFile(path.join(outDir, 'probe.json'), JSON.stringify({ view, dump, results }, null, 2));
  await browser.close();
  log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
