import { startServer, launchBrowser, openApp } from './lib.mjs';

const { url, close } = await startServer();
const browser = await launchBrowser();
const page = await openApp(browser, url, { quality: 'low', width: 960, height: 540 });
await page.evaluate(() => { window.debugAPI.resetScene(); });
// aim at bunk
const yaw = Math.atan2(-(-1.02 - -0.3), -(7.6 - 7.2));
const pitch = Math.atan2(0.44 - 1.7, Math.hypot(-0.72, 0.4));
await page.evaluate(({ yaw, pitch }) => window.debugAPI.teleport(-0.3, 7.2, yaw, pitch), { yaw, pitch });
for (let i = 0; i < 3; i++) await page.evaluate(() => window.debugAPI.pumpFrame());
console.log('hover:', await page.evaluate(() => window.debugAPI.getHoveredId()));
await page.keyboard.press('KeyE');
const t0 = Date.now();
for (let i = 0; i < 46; i++) {
  const tEval = Date.now();
  const s = await page.evaluate(() => {
    window.debugAPI.pumpFrame();
    return {
      f: window.__frameCount,
      fade: window.debugAPI.getFadeOpacity(),
      st: window.debugAPI.getStatusText(),
      state: window.debugAPI.getLightingState(),
      sim: window.debugAPI.getSimTime().toFixed(2),
    };
  });
  console.log(((Date.now() - t0) / 1000).toFixed(2), `eval=${Date.now() - tEval}ms`, JSON.stringify(s));
  await page.waitForTimeout(90);
}
await browser.close();
await close();
