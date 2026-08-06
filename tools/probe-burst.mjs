import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => console.log('C:', m.type(), m.text()));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME && window.__GAME.ready, null, { timeout: 120000 });

await page.evaluate(() => {
  window.__GAME.setAudio(false);
  window.__GAME.enter();
  window.__GAME.setPaused(true);
  window.__GAME.setCondition('day');
  window.__GAME.setScenario('single');
  window.__GAME.selectBattery('vanguard');
  window.__GAME.start(4242);
});
await page.evaluate(() => window.__GAME.teleport(-50, -24, 0, 0.15));
await page.evaluate(() => window.__GAME.advance(22, 1000 / 60, false));
await page.evaluate(() => window.__GAME.autoEngage('vanguard'));
await page.evaluate(() => window.__GAME.advance(3, 1000 / 60, false));
await page.evaluate(() => window.__GAME.authorize());
const res = await page.evaluate(() => window.__GAME.flyToResolution(40));
console.log('kill', JSON.stringify(res.killPoint));

for (const t of [0.1, 1, 3, 6]) {
  await page.evaluate((s) => window.__GAME.advance(s, 1000 / 60, true), t);
  const info = await page.evaluate(() => window.__GAME.effectsDebug());
  console.log(`t+${t}`, JSON.stringify(info));
  await page.screenshot({ path: `captures/burst-t${t}.png` });
}
await browser.close();
