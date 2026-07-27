#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// What is that thing in the frame?
//
//   node tools/pick.mjs --view hero --at 75,205 --size 512,288
//   node tools/pick.mjs --view rear --size 960,540 --rect 300,80,220,90
//
// Sets a beauty view and raycasts through it, printing the mesh names it hits in
// depth order. `--at` takes one pixel plus a `--spread` box around it; `--rect`
// takes x,y,w,h and walks a grid over the whole region, which is what you want
// for "does anything of mine contribute to this band of the frame" — one pixel
// cannot answer that and a crop of a 640 px render is not evidence either way.
// Chasing an artefact by hiding candidate groups costs a software render per
// guess; this costs one boot.
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
const rect = arg('rect', '') ? arg('rect').split(',').map(Number) : null;
const step = Number(arg('step', '3'));

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
  async ([px, py, sw, sh, spread, rect, step]) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { scene, camera } = window.debugAPI.objects;
    const ray = new THREE.Raycaster();
    const out = [];
    const samples = [];
    if (rect) {
      for (let y = rect[1]; y < rect[1] + rect[3]; y += step) {
        for (let x = rect[0]; x < rect[0] + rect[2]; x += step) samples.push([x, y]);
      }
    } else {
      for (let dy = -spread; dy <= spread; dy++) {
        for (let dx = -spread; dx <= spread; dx++) samples.push([px + dx, py + dy]);
      }
    }
    let empty = 0;
    for (const [x, y] of samples) {
      const ndc = new THREE.Vector2(((x / sw) * 2 - 1), -((y / sh) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const found = ray.intersectObject(scene, true);
      if (!found.length) empty++;
      // Only the nearest hit per pixel in rect mode: what the pixel *is*, rather
      // than everything behind it, which is what makes a tally readable.
      for (const h of found.slice(0, rect ? 1 : 3)) {
        out.push({ name: h.object.name || h.object.type, dist: +h.distance.toFixed(2) });
      }
    }
    const tally = {};
    for (const h of out) {
      tally[h.name] = tally[h.name] || { n: 0, near: 1e9, far: 0 };
      tally[h.name].n++;
      tally[h.name].near = Math.min(tally[h.name].near, h.dist);
      tally[h.name].far = Math.max(tally[h.name].far, h.dist);
    }
    const lines = Object.entries(tally)
      .sort((a, b) => b[1].n - a[1].n)
      .map(
        ([k, v]) =>
          `${k.padEnd(26)} ${String(v.n).padStart(4)} px ${((v.n / samples.length) * 100).toFixed(1).padStart(5)}%  ` +
          `${v.near.toFixed(1)}-${v.far.toFixed(1)} m`,
      );
    lines.unshift(`${samples.length} rays, ${empty} hit nothing (sky) = ${((empty / samples.length) * 100).toFixed(1)}%`);
    return lines;
  },
  [px, py, sw, sh, spread, rect, step],
);
console.log(hits.join('\n'));
await browser.close();
