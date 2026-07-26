// Scene composition stats: mesh/triangle counts by top-level group.
import { chromium } from 'playwright';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5184';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 240000 });
await page.evaluate(() => window.__qa.quickStart());
await page.waitForTimeout(500);
const stats = await page.evaluate(() => {
  const scene = window.__game.mission.scene;
  const rows = [];
  for (const child of scene.children) {
    let meshes = 0, tris = 0;
    child.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        const g = o.geometry;
        const n = g.index ? g.index.count : g.attributes.position?.count || 0;
        tris += Math.round(n / 3);
      }
    });
    if (meshes) rows.push({ name: child.name || child.type, meshes, tris });
  }
  rows.sort((a, b) => b.tris - a.tris);
  return rows;
});
console.table(stats);
console.log('total meshes:', stats.reduce((s, r) => s + r.meshes, 0), 'tris:', stats.reduce((s, r) => s + r.tris, 0));
await browser.close();
