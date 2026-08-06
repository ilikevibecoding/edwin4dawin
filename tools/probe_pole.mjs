// Locate the leaning black pole seen right-of-frame from (35,47) looking at the sentinel pad.
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
  { name: 'pan_right', px: 35, pz: 47, lx: 55, ly: 4, lz: 42 },
  { name: 'pan_right2', px: 35, pz: 47, lx: 48, ly: 2, lz: 47 },
  { name: 'south_of_pad', px: 49, pz: 44, lx: 49, ly: 6, lz: 31 },
  { name: 'east_look_west', px: 62, pz: 40, lx: 42, ly: 5, lz: 38 },
];
for (const v of views) {
  await page.evaluate(([px, pz, lx, ly, lz]) => {
    const g = window.__game;
    g.teleport(px, 0, pz, 0, 0);
    g.lookAt(lx, ly, lz);
  }, [v.px, v.pz, v.lx, v.ly, v.lz]);
  await step(2);
  await page.screenshot({ path: `shots_probe/pole_${v.name}.png` });
}
console.log('done');
await browser.close();
