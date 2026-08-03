#!/usr/bin/env node
/** One-off numeric probe: bounding boxes of every child of a preview asset. */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:5173/preview.html?asset=pod&env=interior';
const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const rows = await page.evaluate(async () => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const out = [];
  const root = window.__previewAsset;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    out.push({
      name: o.name || o.geometry?.type || '?',
      mat: o.material?.name ?? '',
      min: [b.min.x, b.min.y, b.min.z].map((v) => +v.toFixed(2)),
      max: [b.max.x, b.max.y, b.max.z].map((v) => +v.toFixed(2)),
    });
  });
  return out;
});
for (const r of rows) console.log(`${r.name.padEnd(22)} ${r.mat.padEnd(20)} min=${JSON.stringify(r.min).padEnd(22)} max=${JSON.stringify(r.max)}`);
await browser.close();
