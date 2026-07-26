#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Fast low-res diagnostic renders. Not for judging looks — for finding out
// why something is invisible.
//
//   node tools/dbgshot.mjs --view hero --mode normals|plain|nopost|full

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5173/');
const view = arg('view', 'hero');
const mode = arg('mode', 'normals');
const width = Number(arg('width', '480'));
const height = Number(arg('height', '270'));
const out = arg('out', `shots/debug/${mode}_${view}.png`);

await mkdir('shots/debug', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

await page.evaluate(
  async ([v, m]) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { scene, renderer, camera, terrain, forest } = window.debugAPI.objects;
    window.debugAPI.setView(v);
    if (m === 'normals') {
      scene.overrideMaterial = new THREE.MeshNormalMaterial();
      terrain.mesh.visible = false;
      forest.group.visible = false;
    } else if (m === 'plain') {
      scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xff5522, wireframe: false });
      terrain.mesh.visible = false;
      forest.group.visible = false;
    } else if (m === 'nopost') {
      for (const n of ['ao', 'bloom', 'grade', 'smaa']) window.debugAPI.toggle(n, false);
    } else if (m === 'truckonly') {
      terrain.mesh.visible = false;
      forest.group.visible = false;
    }
    window.__dbgRender = () => {
      if (m === 'normals' || m === 'plain' || m === 'truckonly' || m === 'nopost') {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    };
  },
  [view, mode],
);

// draw a few frames then grab
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => { window.__dbgRender?.(); r(); })));
}
await page.waitForTimeout(1200);
await page.evaluate(() => window.__dbgRender?.());
await page.screenshot({ path: out, timeout: 0 });
console.log('wrote', out);
await browser.close();
