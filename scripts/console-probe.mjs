#!/usr/bin/env node
/** Boots the game headless and dumps all console warnings/errors + basic stats. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:5173/?pose=street&t=2';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=960,540'],
  defaultViewport: { width: 960, height: 540 },
  protocolTimeout: 300000,
});
const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.type();
  if (t === 'warning' || t === 'error') console.log(`[console.${t}] ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack?.split('\n').slice(0, 6).join('\n')}`));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
try {
  await page.waitForFunction('window.__SHOT_READY__ === true', { timeout: 240000, polling: 250 });
  const stats = await page.evaluate(() => {
    const g = window.__GAME__;
    return {
      calls: g.renderer.info.render.calls,
      triangles: g.renderer.info.render.triangles,
      geometries: g.renderer.info.memory.geometries,
      textures: g.renderer.info.memory.textures,
      programs: g.renderer.info.programs.length,
      enemies: g.ai.enemies.length,
      poses: Object.keys(g.poses).join(','),
    };
  });
  console.log('[stats]', JSON.stringify(stats));
} catch (e) {
  console.log('[timeout]', e.message);
}
await browser.close();
