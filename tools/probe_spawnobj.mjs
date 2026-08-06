// What object intersects the camera at/near the spawn point?
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
await step(3);

const views = [
  { name: 'down', px: 0, pz: 14, yaw: 0, pitch: -1.5 },
  { name: 'down_sw', px: -1.5, pz: 15.5, yaw: 0.8, pitch: -1.2 },
  { name: 'level_w', px: 0, pz: 14, yaw: Math.PI / 2, pitch: -0.35 },
  { name: 'level_sw', px: 0, pz: 14, yaw: Math.PI * 0.75, pitch: -0.3 },
  { name: 'back_up', px: 2, pz: 12, yaw: Math.PI * 0.75, pitch: -0.5 },
];
for (const v of views) {
  await page.evaluate(([px, pz, yaw, pitch]) => {
    window.__game.teleport(px, 0, pz, yaw, pitch);
  }, [v.px, v.pz, v.yaw, v.pitch]);
  await step(2);
  await page.screenshot({ path: `shots_probe/spawn_${v.name}.png` });
}
console.log('done');
await browser.close();
