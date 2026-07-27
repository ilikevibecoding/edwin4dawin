#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// What is that thing in the frame?
//
//   node tools/pick.mjs --view hero --at 75,205 --size 512,288
//
// Sets a beauty view and raycasts through one pixel of it, printing the mesh
// names it hits in depth order. Chasing an artefact by hiding candidate groups
// costs a software render per guess; this costs one boot.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast') + '&capture=1';
const view = arg('view', 'hero');
const [px, py] = arg('at', '75,205').split(',').map(Number);
const [sw, sh] = arg('size', '512,288').split(',').map(Number);
const spread = Number(arg('spread', '2'));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: sw, height: sh } });
page.on('pageerror', (e) => console.error('[pick] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
await page.evaluate((v) => window.debugAPI.setView(v), view);
await page.evaluate(() => window.debugAPI.renderFrames(2));

const hits = await page.evaluate(
  async ([px, py, sw, sh, spread]) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { scene, camera } = window.debugAPI.objects;
    const ray = new THREE.Raycaster();
    const out = [];
    for (let dy = -spread; dy <= spread; dy++) {
      for (let dx = -spread; dx <= spread; dx++) {
        const ndc = new THREE.Vector2((((px + dx) / sw) * 2 - 1), -(((py + dy) / sh) * 2 - 1));
        ray.setFromCamera(ndc, camera);
        for (const h of ray.intersectObject(scene, true).slice(0, 3)) {
          out.push({
            name: h.object.name || h.object.type,
            dist: +h.distance.toFixed(2),
            inst: h.instanceId ?? -1,
          });
        }
      }
    }
    const tally = {};
    for (const h of out) {
      const k = `${h.name}`;
      tally[k] = tally[k] || { n: 0, near: 1e9 };
      tally[k].n++;
      tally[k].near = Math.min(tally[k].near, h.dist);
    }
    return Object.entries(tally)
      .sort((a, b) => a[1].near - b[1].near)
      .map(([k, v]) => `${k.padEnd(26)} hits ${String(v.n).padStart(3)}  nearest ${v.near.toFixed(2)} m`);
  },
  [px, py, sw, sh, spread],
);
console.log(hits.join('\n'));
await browser.close();
