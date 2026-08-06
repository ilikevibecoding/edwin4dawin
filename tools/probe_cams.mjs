// Probe: fresh screenshots — side-offset missile cam, threat cam, night tablet.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
fs.mkdirSync('shots_probe', { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(150_000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60_000 });
await page.evaluate(() => {
  window.__game.testMode(); window.__game.pause(true);
  window.__game.seed(777);
  window.__game.setTimeOfDay('night');
  window.__game.step(90, 33.34); // let the night blend finish
  window.__game.start('nightraid', { timeOfDay: 'night' });
});
const step = (frames) => page.evaluate((f) => window.__game.step(f, 33.34), frames);
let s;
for (let i = 0; i < 80; i++) {
  await step(30);
  s = await page.evaluate(() => window.__game.state());
  if (s.tracks.length >= 1) break;
}
// fire at the first track, ride the bird once it's in the air
await page.evaluate((tid) => { window.__game.assign(tid); window.__game.authorize(tid); }, s.tracks[0].id);
for (let i = 0; i < 40; i++) {
  await step(10);
  s = await page.evaluate(() => window.__game.state());
  if (s.interceptors.length > 0 && s.interceptors[0].alt > 300) break;
}
await page.evaluate(() => window.__game.setView('missile'));
await step(30);
await page.screenshot({ path: 'shots_probe/missile_cam_v2.png', timeout: 150_000 });
await page.evaluate(() => window.__game.cycleView());
await step(20);
await page.screenshot({ path: 'shots_probe/threat_cam_v2.png', timeout: 150_000 });
// night tablet mid-raid
await page.evaluate(() => { window.__game.setView('fp'); window.__game.openTablet(); });
await step(10);
await page.screenshot({ path: 'shots_probe/tablet_night_v2.png', timeout: 150_000 });
s = await page.evaluate(() => window.__game.state());
console.log('final:', s.viewMode, 'tablet:', s.tabletOpen, 'tracks:', s.tracks.length, 'ints:', s.interceptors.length);
console.log('done');
await browser.close();
