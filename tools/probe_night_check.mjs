// Night sanity check of the fixed areas: spawn look-around + cable ramp close-up.
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); window.__game.setTimeOfDay('night'); });
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
await step(30); // let lighting settle

const views = [
  { name: 'night_spawn_n', px: 0, pz: 14, yaw: 0, pitch: -0.1 },
  { name: 'night_spawn_s', px: 0, pz: 14, yaw: Math.PI, pitch: -0.15 },
  { name: 'night_ramp', px: -10.5, pz: 8.5, yaw: 2.6, pitch: -0.6 },
  { name: 'day_ramp', px: -10.5, pz: 8.5, yaw: 2.6, pitch: -0.6, day: true },
];
for (const v of views) {
  if (v.day) { await page.evaluate(() => window.__game.setTimeOfDay('day')); await step(20); }
  await page.evaluate(([px, pz, yaw, pitch]) => {
    window.__game.teleport(px, 0, pz, yaw, pitch);
  }, [v.px, v.pz, v.yaw, v.pitch]);
  await step(2);
  await page.screenshot({ path: `shots_probe/${v.name}.png` });
}
console.log('done');
await browser.close();
