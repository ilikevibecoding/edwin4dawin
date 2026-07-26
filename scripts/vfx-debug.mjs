#!/usr/bin/env node
// Probe: dump scene children + world object positions, save small screenshot.
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const urls = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl'],
  defaultViewport: { width: 640, height: 360 },
  protocolTimeout: 300000,
});
let idx = 0;
for (const u of urls) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`[pageerror] ${e.message}`));
  await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('window.__SHOT_READY__ === true', { timeout: 240000, polling: 250 });
  const info = await page.evaluate(() => {
    const g = window.__GAME__;
    const kids = g.scene.children.map((c) => {
      const p = c.position;
      return `${c.type}:${c.name || c.uuid.slice(0, 4)}@${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`;
    });
    // nearest world colliders to camera
    const cam = g.camera.position;
    const near = [];
    for (const src of g.world.colliders.sources ?? []) {
      const d = src.position.distanceTo(cam);
      if (d < 12) near.push(`${src.userData?.surface}@d=${d.toFixed(1)} pos=${src.position.x.toFixed(1)},${src.position.z.toFixed(1)}`);
    }
    return { kids, near };
  });
  console.log('===', u.split('?')[1]);
  console.log(info.kids.join('\n'));
  console.log('NEAR:', info.near.join(' | ') || 'none');
  await page.screenshot({ path: `review/dbg-${idx++}.png` });
  await page.close();
}
await browser.close();
