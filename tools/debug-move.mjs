import { startServer, launchBrowser, openApp } from './lib.mjs';

const { url, close } = await startServer();
const browser = await launchBrowser();
const page = await openApp(browser, url, {});
await page.evaluate(() => window.debugAPI.resetScene());
await page.waitForTimeout(300);
await page.evaluate(() => window.debugAPI.teleport(0, 3.0, Math.PI, 0));
await page.waitForTimeout(200);
console.log('pose0', await page.evaluate(() => window.debugAPI.getPose()));
await page.keyboard.down('KeyW');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({
    keys: { ...window.__ctx.player.state.keys },
    enabled: window.__ctx.player.state.enabled,
    vel: window.__ctx.player.state.vel.toArray(),
    pose: window.debugAPI.getPose(),
    sim: window.debugAPI.getSimTime(),
  }));
  console.log(i, JSON.stringify(info));
}
await page.keyboard.up('KeyW');
await browser.close();
await close();
