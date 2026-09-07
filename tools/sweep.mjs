#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Render one view under several lighting setups in a single page load.
// Small images, meant to be flipped through quickly to pick a direction.
//
//   node tools/sweep.mjs --view hero --width 420

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5173/?quality=fast');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';
const view = arg('view', 'hero');
const width = Number(arg('width', '420'));
const height = Math.round((width * 9) / 16);
const out = arg('out', 'shots/sweep');

const setups = [
  { name: 'a090_e18_i45_x100', az: 90, el: 18, sun: 4.5, exp: 1.0, hemi: 0.5 },
  { name: 'a145_e16_i50_x105', az: 145, el: 16, sun: 5.0, exp: 1.05, hemi: 0.5 },
  { name: 'a200_e20_i50_x105', az: 200, el: 20, sun: 5.0, exp: 1.05, hemi: 0.5 },
  { name: 'a250_e14_i55_x110', az: 250, el: 14, sun: 5.5, exp: 1.1, hemi: 0.55 },
  { name: 'a305_e22_i50_x105', az: 305, el: 22, sun: 5.0, exp: 1.05, hemi: 0.5 },
  { name: 'a035_e28_i45_x100', az: 35, el: 28, sun: 4.5, exp: 1.0, hemi: 0.45 },
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

for (const s of setups) {
  const { dataUrl, luma } = await page.evaluate(
    ([cfg, v]) => {
      const { skyRig, renderer, scene } = window.debugAPI.objects;
      const THREE = skyRig.sun.position.constructor;
      const phi = ((90 - cfg.el) * Math.PI) / 180;
      const theta = (cfg.az * Math.PI) / 180;
      const dir = new THREE(
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.cos(theta),
      );
      skyRig.sunDir.copy(dir);
      skyRig.skyMaterial.uniforms.uSunDir.value.copy(dir);
      skyRig.sun.intensity = cfg.sun;
      skyRig.hemi.intensity = cfg.hemi;
      skyRig.rim.position.set(-dir.x * 60, 30, -dir.z * 60);
      renderer.toneMappingExposure = cfg.exp;
      window.debugAPI.setView(v);
      const dataUrl = window.debugAPI.captureFrame(1);
      return { dataUrl, luma: window.debugAPI.sampleLuma() };
    },
    [s, view],
  );
  await writeFile(`${out}/${view}_${s.name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${s.name.padEnd(22)} mean ${luma.mean.toFixed(3)} max ${luma.max.toFixed(3)}`);
}

await browser.close();
