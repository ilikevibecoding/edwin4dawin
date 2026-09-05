#!/usr/bin/env node
// Close-up renders of one body region under the real scene lighting, so panel
// and lamp detail can be judged without waiting on a full beauty pass.
//
//   node tools/bodyzoom.mjs --url http://127.0.0.1:5181/?quality=fast \
//     --tag b4 --spots nose,lamp,flank,tail
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5181/?quality=fast&capture=1');
const tag = arg('tag', 'a');
const width = Number(arg('width', '520'));
const height = Math.round((width * 9) / 16);
const out = arg('out', `shots/zoom_${tag}`);
const exposure = Number(arg('exp', '0'));
const noShadow = argv.includes('--noshadow');

// eye and target in truck-local space, plus fov
const SPOTS = {
  nose: { eye: [1.05, 1.5, 4.5], target: [0, 1.05, 2.3], fov: 26 },
  lamp: { eye: [0.95, 1.28, 3.35], target: [0.72, 1.12, 2.24], fov: 22 },
  flank: { eye: [3.1, 1.35, 0.4], target: [0.9, 1.15, 0.1], fov: 30 },
  tail: { eye: [-1.5, 1.55, -4.4], target: [0, 1.1, -2.4], fov: 28 },
  roof: { eye: [1.9, 3.1, 2.2], target: [0, 1.9, 0.2], fov: 32 },
  rocker: { eye: [2.4, 0.75, 0.9], target: [0.9, 0.72, 0.2], fov: 30 },
};

const spots = arg('spots', 'nose,lamp,flank,tail').split(',');

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[pageerror]', e.stack || e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[error]', m.text());
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

for (const name of spots) {
  const cfg = SPOTS[name];
  if (!cfg) {
    console.log('unknown spot', name);
    continue;
  }
  const { dataUrl, luma } = await page.evaluate(
    ([c, exp, noSh]) => {
      const { camera, renderer, vehicle } = window.debugAPI.objects;
      window.debugAPI.setView('hero');
      const V3 = camera.position.constructor;
      const root = vehicle.root;
      root.updateMatrixWorld(true);
      const eye = new V3(...c.eye).applyMatrix4(root.matrixWorld);
      const target = new V3(...c.target).applyMatrix4(root.matrixWorld);
      camera.position.copy(eye);
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      if (exp > 0) renderer.toneMappingExposure = exp;
      if (noSh) {
        renderer.shadowMap.enabled = false;
        renderer.info.programs?.forEach(() => {});
        renderer.compile?.(window.debugAPI.objects.scene, camera);
      }
      const dataUrl = window.debugAPI.captureFrame(2);
      return { dataUrl, luma: window.debugAPI.sampleLuma() };
    },
    [cfg, exposure, noShadow],
  );
  await writeFile(`${out}/${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${name}  mean ${luma.mean.toFixed(3)} max ${luma.max.toFixed(3)}`);
}

await browser.close();
