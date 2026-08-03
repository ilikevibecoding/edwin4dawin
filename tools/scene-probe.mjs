#!/usr/bin/env node
/**
 * Dump matching nodes from the preview scene graph.
 *
 * Usage: node tools/scene-probe.mjs "<preview query string>" <nameSubstring>
 */
import puppeteer from 'puppeteer-core';

const query = process.argv[2] ?? 'asset=poses&kind=stormtrooper&states=idle';
const needle = process.argv[3] ?? 'contactShadow';

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://127.0.0.1:5173/preview.html?${query}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__PREVIEW_READY === true', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));
const out = await page.evaluate((needle) => {
  const scene = window.__SCENE;
  if (!scene) return 'no __SCENE exposed';
  const hits = [];
  scene.traverse((o) => {
    if (!o.name.includes(needle)) return;
    o.updateWorldMatrix(true, false);
    const wp = new window.__THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    hits.push({
      name: o.name,
      type: o.type,
      visible: o.visible,
      world: wp.toArray().map((v) => +v.toFixed(3)),
      scale: o.scale.toArray().map((v) => +v.toFixed(3)),
      opacity: o.material?.opacity,
      hasMap: !!o.material?.map,
      transparent: o.material?.transparent,
      renderOrder: o.renderOrder,
      inFrustum: !o.frustumCulled || true,
    });
  });
  return hits;
}, needle);
console.log(JSON.stringify(out, null, 1));
await browser.close();
