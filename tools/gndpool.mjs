#!/usr/bin/env node
// Frame the biggest actual puddle, from the water mesh's own vertices.
//
// `roadview --views wetlow` walks the terrain's aWet attribute, which finds the
// dampest *ground* — and the pools are a strict subset of that, so the framing
// lands on wet dirt with no water in it about half the time. This reads the
// water geometry directly, picks the pool with the widest footprint, and shoots
// it from two heights.
//
//   node tools/gndpool.mjs --iter 10 --out shots/gd_10
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', path.join('shots', `pool_${arg('iter', '0')}`));
const suffix = arg('suffix', '');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}

// eye height in metres, distance multiple of the pool radius
for (const [tag, eye, back] of [
  ['stand', 1.55, 3.4],
  ['squat', 0.62, 2.2],
]) {
  const { dataUrl, at, r, n } = await page.evaluate(
    async ([eye, back]) => {
      const { camera, terrain, vehicle, scene } = window.debugAPI.objects;
      window.debugAPI.setView('forest');
      vehicle.root.visible = false;
      const dust = scene.getObjectByName('wheelDust');
      if (dust) dust.visible = false;
      const p = terrain.water.geometry.attributes.position.array;
      const a = terrain.water.geometry.attributes.aAlpha.array;
      // Each pool is a centre vertex (alpha 1) followed by two rings; group by
      // walking the buffer and measuring each group's extent.
      let best = { r: 0, x: 0, y: 0, z: 0 };
      let count = 0;
      for (let i = 0; i < a.length; ) {
        const cx = p[i * 3];
        const cy = p[i * 3 + 1];
        const cz = p[i * 3 + 2];
        let span = 0;
          const ring = 64; // PUDDLE_RING * 2
        for (let k = 1; k <= ring && i + k < a.length; k++) {
          const dx = p[(i + k) * 3] - cx;
          const dz = p[(i + k) * 3 + 2] - cz;
          span = Math.max(span, Math.hypot(dx, dz));
        }
        if (span > best.r) best = { r: span, x: cx, y: cy, z: cz };
        i += ring + 1;
        count++;
      }
      const d = Math.max(1.4, best.r * back);
      camera.position.set(best.x + d * 0.6, best.y + eye, best.z + d);
      camera.fov = 40;
      camera.lookAt(best.x, best.y, best.z);
      camera.updateProjectionMatrix();
      const dataUrl = window.debugAPI.captureFrame(2);
      vehicle.root.visible = true;
      if (dust) dust.visible = true;
      return {
        dataUrl,
        at: [best.x.toFixed(1), best.y.toFixed(1), best.z.toFixed(1)],
        r: best.r.toFixed(2),
        n: count,
      };
    },
    [eye, back],
  );
  const file = path.join(outDir, `dv_pool_${tag}${suffix}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`[gndpool] ${tag} -> ${file} (${n} pools, widest r=${r} m at ${at.join(' ')})`);
}
await browser.close();
