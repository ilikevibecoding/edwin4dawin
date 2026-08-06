// Probe: verify searchlight beam softness (night raid) and near-camera
// smoke fade (launch column drifting over the player).
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });

const step = (frames, dt = 33.34) => page.evaluate(([f, d]) => window.__game.step(f, d), [frames, dt]);

// ---- 1. searchlight beams, side view (mirrors shot 12 camera)
await page.evaluate(() => {
  window.__game.seed(66);
  window.__game.start('nightraid');
  window.__game.autoplay(true);
  window.__game.teleport(-8, 0, 66, 3.05, 0.3);
});
await step(60); // 2 s — beams on
await page.screenshot({ path: 'shots_probe/beam_side.png' });
// close view looking along a beam from near its source
await page.evaluate(() => {
  window.__game.teleport(-52, 0, -48, 0, 0);
  window.__game.lookAt(-62, 220, -58);
});
await step(6);
await page.screenshot({ path: 'shots_probe/beam_near.png' });
await page.evaluate(() => window.__game.stopScenario());

// ---- 2. near-camera smoke fade: sentinel launch, stand in the drift path
await page.evaluate(() => {
  window.__game.setTimeOfDay('day');
  window.__game.seed(2024);
  window.__game.start('single');
});
for (let i = 0; i < 40; i++) {
  await step(30);
  const s = await page.evaluate(() => window.__game.state());
  if (s.tracks.length >= 1) break;
}
await page.evaluate(() => {
  const st = window.__game.state();
  window.__game.assign(st.tracks[0].id, 'sentinel');
  window.__game.authorize();
  window.__game.teleport(34, 0, 46, 0, 0);
});
// wait for launch then let smoke drift over the camera; look up like shot 08
for (let i = 0; i < 30; i++) {
  await step(15);
  const s = await page.evaluate(() => window.__game.state());
  if (s.interceptors.length >= 1) break;
}
await step(75); // 2.5 s of climb + drift
await page.evaluate(() => {
  const s = window.__game.state();
  if (s.interceptors.length) {
    const i = s.interceptors[0];
    window.__game.lookAt(48, Math.max(300, i.alt), -100);
  }
});
await step(6);
await page.screenshot({ path: 'shots_probe/smoke_near_camera.png' });

console.log('done');
await browser.close();
