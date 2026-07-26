#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// Diagnostic framings for the dirt road itself. The named beauty views are
// all tight on the truck, which makes it impossible to judge whether the
// two-track, the verge blend and the terrain silhouette actually work.
//
//   node tools/roadview.mjs --iter 4 --url http://127.0.0.1:5183/
//
// Framings are placed relative to the truck after the standard pre-roll:
//   ruts     1.3 m up, 7 m behind, looking down the two-track
//   wide     14 m up, 30 m back, the road as a ribbon through the forest
//   contact  ground level at the rear wheel, tyre against dirt
//   plume    off to the side, dust trail against the sun

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const iter = arg('iter', '0');
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const width = Number(arg('width', '560'));
const height = Number(arg('height', '315'));
const outDir = arg('out', path.join('shots', `iter_${iter}`));
const only = arg('views', '');
// optional uniform poke, e.g. --set "u.uDebug.value=1"
const setCode = arg('set', '');

const FRAMINGS = {
  // 1.3 m up and 7 m back only shows about 1.6 m of ground at the bottom of
  // the frame, which is all crown — too tight to tell whether the two-track
  // reads. Higher and wider puts both ruts and both verges in shot.
  ruts: { pos: [0.0, 2.4, -9.5], target: [0.0, 0.2, 3.0], fov: 52 },
  low: { pos: [0.4, 1.3, -7.0], target: [0.0, 0.15, 6.0], fov: 42 },
  wide: { pos: [6.0, 14.0, -30.0], target: [0.0, 0.6, 12.0], fov: 44 },
  contact: { pos: [2.0, 0.24, -1.1], target: [0.6, 0.06, -1.5], fov: 34 },
  plume: { pos: [9.0, 2.2, -9.0], target: [-1.0, 1.2, 1.0], fov: 46 },
  cross: { pos: [9.5, 2.6, 1.0], target: [-2.0, 0.2, 0.5], fov: 40 },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text());
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}
console.log(`[roadview] booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const names = only ? only.split(',') : Object.keys(FRAMINGS);
for (const name of names) {
  const f = FRAMINGS[name];
  if (!f) continue;
  const ts = Date.now();
  const { dataUrl, luma } = await page.evaluate(async ([fr, code]) => {
    const THREE = await import('/node_modules/three/build/three.module.js').catch(() => null);
    const { camera, vehicle, terrain } = window.debugAPI.objects;
    window.debugAPI.setView('forest');
    if (code) new Function('t', 'u', code)(terrain, terrain.material.userData.uniforms);
    const m = vehicle.root.matrixWorld;
    const apply = (v) => {
      const p = { x: v[0], y: v[1], z: v[2] };
      const e = m.elements;
      return {
        x: e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12],
        y: e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13],
        z: e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14],
      };
    };
    const p = apply(fr.pos);
    const t = apply(fr.target);
    camera.position.set(p.x, p.y, p.z);
    camera.fov = fr.fov;
    camera.lookAt(t.x, t.y, t.z);
    camera.updateProjectionMatrix();
    void THREE;
    const dataUrl = window.debugAPI.captureFrame(2);
    return { dataUrl, luma: window.debugAPI.sampleLuma() };
  }, [f, setCode]);
  const file = path.join(outDir, `dv_${name}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(
    `[roadview] ${name} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${luma.mean.toFixed(3)})`,
  );
}
await browser.close();
