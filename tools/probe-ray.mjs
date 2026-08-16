// One-off: identify what object is under a given NDC coordinate in a view.
import { startServer, launchBrowser, openApp, applyBaseline } from './lib.mjs';

const view = process.argv[2] || 'crewQuarters';
const nx = parseFloat(process.argv[3] || '0');
const ny = parseFloat(process.argv[4] || '0');

const { url, close } = await startServer();
const browser = await launchBrowser();
try {
  const page = await openApp(browser, url, { seed: 1337 });
  await applyBaseline(page, {});
  await page.evaluate((v) => window.debugAPI.setView(v), view);
  await page.waitForTimeout(500);
  const out = await page.evaluate(({ nx, ny }) => {
    const ctx = window.__ctx;
    window.debugAPI.pumpFrame();
    const ray = new ctx.THREE.Raycaster();
    ray.setFromCamera(new ctx.THREE.Vector2(nx, ny), ctx.camera);
    const hits = ray.intersectObjects(ctx.scene.children, true)
      .filter((h) => !h.object.isPoints).slice(0, 6);
    return hits.map((h) => ({
      d: h.distance.toFixed(2),
      name: h.object.name || '(unnamed)',
      parent: h.object.parent ? h.object.parent.name || '(unnamed parent)' : '',
      mat: h.object.material && h.object.material.name ? h.object.material.name : (h.object.material ? (h.object.material.color ? '#' + h.object.material.color.getHexString() : h.object.material.type) : '?'),
      geo: h.object.geometry ? h.object.geometry.type : '?',
      point: [h.point.x.toFixed(2), h.point.y.toFixed(2), h.point.z.toFixed(2)],
    }));
  }, { nx, ny });
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
  await close();
}
