// Probe: reproduce the "big blob of black" — spawn, look around 360° and
// also from a few other likely player positions, screenshot each direction.
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);

// spawn area: (0, ~1.7, 14). Sweep yaw in 8 directions (pitch level, then down).
const spots = [
  { name: 'spawn', x: 0, z: 14 },
  { name: 'apron_south', x: 10, z: 40 },
];
for (const s of spots) {
  for (let i = 0; i < 8; i++) {
    const yaw = (i / 8) * Math.PI * 2;
    await page.evaluate(([x, z, y]) => window.__game.teleport(x, 0, z, y, 0.05), [s.x, s.z, yaw]);
    await step(4);
    await page.screenshot({ path: `shots_probe/look_${s.name}_${i}.png` });
  }
}
console.log('done');
await browser.close();
