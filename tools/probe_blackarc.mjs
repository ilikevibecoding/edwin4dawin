// Identify the big black leaning arc near the Sentinel pad (east side).
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

// candidates: work-light mast at (60,1.5); scan east of sentinel pad
const views = [
  { name: 'east_of_pad', px: 52, pz: 40, lx: 62, ly: 6, lz: 20 },
  { name: 'mast_60_1', px: 55, pz: 8, lx: 60, ly: 4, lz: 1.5 },
  { name: 'mast_close', px: 58.5, pz: 3.5, lx: 60, ly: 3, lz: 1.5 },
  { name: 'pad_pan_ne', px: 49, pz: 31, lx: 64, ly: 8, lz: 10 },
  { name: 'gen_area', px: 44, pz: 34, lx: 40, ly: 1, lz: 36 },
];
for (const v of views) {
  await page.evaluate(([px, pz, lx, ly, lz]) => {
    const g = window.__game;
    g.teleport(px, 0, pz, 0, 0);
    g.lookAt(lx, ly, lz);
  }, [v.px, v.pz, v.lx, v.ly, v.lz]);
  await step(2);
  await page.screenshot({ path: `shots_probe/arc_${v.name}.png` });
}
console.log('done');
await browser.close();
